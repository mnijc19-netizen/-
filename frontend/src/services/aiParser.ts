import { ParsedTransactionResult, DashboardAnalytics, Transaction } from '../types';
import { localStore, AiConfig } from './localStore';
import { getBeijingDateTimeString } from '../utils/dateUtils';

export interface AiTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export interface AiExtractedItem {
  amount: number;
  merchant: string;
  category: string;
  type: 'expense' | 'income' | 'transfer' | 'repayment';
  channel: string;
  date?: string;
  note?: string;
}

export const AI_PROVIDERS = [
  {
    id: 'deepseek',
    name: '🇨🇳 DeepSeek (推荐·超高性价比)',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    hint: '前往 platform.deepseek.com 获取 sk- 密钥'
  },
  {
    id: 'zhipu',
    name: '🇨🇳 智谱清言 GLM-4-Flash (免费)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    hint: '前往 bigmodel.cn 申请免费 GLM-4-Flash 密钥'
  },
  {
    id: 'kimi',
    name: '🇨🇳 月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    hint: '前往 platform.moonshot.cn 获取密钥'
  },
  {
    id: 'qwen',
    name: '🇨🇳 通义千问 Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    hint: '前往阿里云百炼获取 API Key'
  },
  {
    id: 'openai',
    name: '🌐 OpenAI (GPT-4o-mini)',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: '前往 platform.openai.com 获取密钥'
  },
  {
    id: 'custom',
    name: '⚙️ 自定义兼容接口 (OneAPI / 中转站)',
    baseUrl: '',
    model: '',
    hint: '支持任何标准 OpenAI 兼容的 /v1/chat/completions 接口'
  }
];

export async function testAiConnection(config: AiConfig): Promise<AiTestResult> {
  if (!config.apiKey || !config.apiKey.trim()) {
    return { success: false, message: '请先填入 API Key' };
  }
  const startTime = Date.now();
  try {
    const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an AI assistant.' },
          { role: 'user', content: 'Say pong' }
        ],
        temperature: 0.1,
        max_tokens: 20
      })
    });

    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      const errText = await res.text();
      return { 
        success: false, 
        message: `连接失败 (${res.status}): ${errText.substring(0, 80)}`,
        latencyMs 
      };
    }

    const data = await res.json();
    if (data && data.choices && data.choices.length > 0) {
      return { 
        success: true, 
        message: `✅ AI 连接成功！响应耗时: ${latencyMs}ms (${config.model})`,
        latencyMs 
      };
    }
    return { success: false, message: 'API 返回格式不符合标准' };
  } catch (err: any) {
    return { success: false, message: `网络连接异常: ${err.message || '请检查接口地址或网络'}` };
  }
}

// 1. Single Transaction Deep Parsing
export async function parseWithAi(
  rawText: string,
  accountsLookup: any[] = []
): Promise<ParsedTransactionResult | null> {
  const config = localStore.getAiConfig();
  if (!config.enabled || !config.apiKey || !config.apiKey.trim()) {
    return null;
  }

  const clean = rawText.trim();
  if (!clean) return null;

  try {
    const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const prompt = `你是一个顶级专业财务记账 AI。请从用户输入的账单、小票、银行短信或截屏 OCR 文本中，精准提取单笔真实交易信息并严格返回纯 JSON 对象（禁止输出任何 markdown 代码块、解释或无关文字）：
{
  "amount": 49.89,
  "merchant": "准确的商户或消费对象名称（如 中国电信、清口清汤面(金山店)、麦当劳、淘宝闪购，绝不能是'付款成功'或'服务消息'等状态词）",
  "category": "餐饮美食|日用百货|交通出行|购物消费|休闲娱乐|医疗健康|生活服务|日常消费",
  "type": "expense|income|transfer|repayment",
  "channel": "支付宝|微信支付|招商银行|工商银行|建设银行|信用卡|花呗|零钱通",
  "date": "YYYY-MM-DD HH:mm（若未提及可省略或留空）",
  "note": "简要备注（如 中国电信 消费）"
}

【提取铁律】：
1. 金额必须是【实际扣款/净实付款/单笔最新支出】，严禁提取月度累计支出、优惠立减金额或原价！
2. 扣款渠道：凡出现“花呗/余额宝/支付宝”判定为“支付宝”；凡出现“零钱通/微信支付/微信”判定为“微信支付”；凡出现银行名称判定为对应银行。
3. 话费充值/宽带/水电物业分类必须为“生活服务”；外卖/咖啡/奶茶必须为“餐饮美食”；打车/加油/地铁必须为“交通出行”。

待提取文本如下：
${clean}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: '严格只输出符合格式的单个 JSON 对象，不要用 markdown 格式包裹。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 250
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const data = await res.json();
    const replyText = data?.choices?.[0]?.message?.content || '';
    
    const jsonMatch = replyText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.amount || isNaN(parseFloat(parsed.amount))) return null;

    const numAmount = Math.abs(parseFloat(parsed.amount));
    const merchant = parsed.merchant || '智能记账商户';
    const category = parsed.category || '日常消费';
    const transType = parsed.type || 'expense';
    const channel = parsed.channel || '微信/支付宝';

    let matchedAcc = accountsLookup[0];
    if (/支付宝|花呗/.test(channel)) {
      const acc = accountsLookup.find(a => a.name.includes('支付宝') || a.id === 'acc-2');
      if (acc) matchedAcc = acc;
    } else if (/微信|零钱/.test(channel)) {
      const acc = accountsLookup.find(a => a.name.includes('微信') || a.id === 'acc-1');
      if (acc) matchedAcc = acc;
    } else if (/银行|卡/.test(channel)) {
      const acc = accountsLookup.find(a => a.type === 'bank' || a.id === 'acc-3');
      if (acc) matchedAcc = acc;
    }

    return {
      success: true,
      confidence: 0.99,
      type: transType,
      amount: numAmount,
      bank_or_channel: channel,
      merchant,
      suggested_category: category,
      date: parsed.date || getBeijingDateTimeString(),
      raw_text: clean.substring(0, 100),
      matched_rule: `🤖 ${config.model} 智能解析`,
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name,
      note: parsed.note || `由 AI 智能解析`
    };
  } catch (err) {
    return null;
  }
}

// 2. Multi-Transaction Extraction (One Sentence -> Multiple Transactions)
export async function parseMultiTransactionsWithAi(
  text: string,
  accountsLookup: any[] = []
): Promise<AiExtractedItem[]> {
  const config = localStore.getAiConfig();
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('请先在设置中启用并配置 AI API Key');
  }

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const prompt = `你是一个高级财务记账助手。用户可能输入了一段口语、一句话或多笔混合账单（例如：“中午在沙县吃了25微信付的，下午喝了喜茶19花呗付的，小李微信还了我50”）。
请将其中包含的每一笔收支拆解，并严格输出 JSON 数组格式（不要包含任何额外文字或 markdown 包裹）：
[
  {
    "amount": 25.0,
    "merchant": "沙县小吃",
    "category": "餐饮美食",
    "type": "expense",
    "channel": "微信支付",
    "note": "午餐"
  }
]

用户输入如下：
${text.trim()}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: '严格只输出符合格式的 JSON 数组。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 600
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI 请求失败 (${res.status}): ${errText.substring(0, 80)}`);
  }

  const data = await res.json();
  const replyText = data?.choices?.[0]?.message?.content || '';
  const jsonMatch = replyText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('AI 未能返回有效的记账明细列表');
  }

  const parsedArray: AiExtractedItem[] = JSON.parse(jsonMatch[0]);
  return parsedArray.filter(item => item.amount && item.amount > 0);
}

// 3. AI Financial Health Diagnosis & Savings Advice
export async function diagnoseFinancesWithAi(
  analytics: DashboardAnalytics,
  recentTransactions: Transaction[]
): Promise<string> {
  const config = localStore.getAiConfig();
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('请先在设置中配置 AI API Key');
  }

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const prompt = `你是一个资深个人财务规划师。请根据用户的财务概况与近期流水，给出 300 字以内的精炼财务诊断与 3 条针对性的省钱/资产优化建议：

【用户财务概况】：
- 净资产总额：¥${analytics.net_worth.toFixed(2)}
- 总资产：¥${analytics.total_assets.toFixed(2)}，总负债：¥${analytics.total_liabilities.toFixed(2)} (负债率: ${analytics.debt_ratio.toFixed(1)}%)
- 本月总收入：¥${analytics.month_summary.income.toFixed(2)}
- 本月总支出：¥${analytics.month_summary.expense.toFixed(2)} (储蓄率: ${analytics.month_summary.savings_rate.toFixed(1)}%)
- 支出分类构成：${JSON.stringify(analytics.asset_breakdown)}

【近期典型账单 (最近 6 笔)】：
${recentTransactions.slice(0, 6).map(t => `- ${t.date.substring(5, 10)} ${t.merchant} ¥${t.amount} (${t.category_name || '日常'})`).join('\n')}

请用温馨、专业、极具洞察力的语气，格式清晰地输出诊断结论与 3 条具体优化建议。`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are an expert personal financial advisor. Be concise, practical and supportive.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 800
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI 请求失败 (${res.status}): ${errText.substring(0, 80)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '暂无财务分析建议。';
}

// 4. True Multimodal AI Vision Parser (Direct Image Recognition)
export async function parseImageWithAiVision(
  base64DataUrl: string,
  accountsLookup: any[] = []
): Promise<ParsedTransactionResult | null> {
  const config = localStore.getAiConfig();
  if (!config.enabled || !config.apiKey || !config.apiKey.trim()) {
    return null;
  }

  // Determine vision model
  let visionModel = config.model;
  if (config.provider === 'zhipu' && !visionModel.includes('4v')) {
    visionModel = 'glm-4v-flash'; // Free Vision model
  } else if (config.provider === 'qwen' && !visionModel.includes('vl')) {
    visionModel = 'qwen-vl-plus';
  } else if (config.provider === 'kimi' && !visionModel.includes('vision')) {
    visionModel = 'moonshot-v1-8k-vision-preview';
  } else if (config.provider === 'openai' && !visionModel.includes('4o')) {
    visionModel = 'gpt-4o-mini';
  }

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const prompt = `你是一个智能视觉财务记账专家。请仔细查看这张截屏/小票图片：
1. 提取最新一笔交易（如果是支付消息列表，提取顶层最新一笔付款卡片，忽略顶部统计月支出）。
2. 提取真实商户名称（如 中国电信、万亩良田生鲜超市、清口清汤面、麦当劳等，忽略图标和乱码）。
3. 提取实际扣款金额（如 49.89）。
4. 提取付款渠道与账户（如 花呗、支付宝、微信支付、信用卡、银行卡）。
5. 智能归类消费类别（如 日用百货、生活服务、餐饮美食、交通出行、购物消费）。
6. 严格返回纯 JSON 对象格式（不要有任何额外说明或 markdown 包裹）：
{
  "amount": 49.89,
  "merchant": "中国电信",
  "category": "生活服务",
  "type": "expense",
  "channel": "花呗",
  "date": "2026-08-14 23:37",
  "note": "话费充值/生活缴费"
}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: base64DataUrl
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const replyText = data?.choices?.[0]?.message?.content || '';
    const jsonMatch = replyText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.amount || isNaN(parseFloat(parsed.amount))) return null;

    const numAmount = Math.abs(parseFloat(parsed.amount));
    const merchant = parsed.merchant || '智能记账商户';
    const category = parsed.category || '日常消费';
    const transType = parsed.type || 'expense';
    const channel = parsed.channel || '支付宝/微信';

    let matchedAcc = accountsLookup[0];
    if (/支付宝|花呗|余额宝/.test(channel)) {
      const acc = accountsLookup.find(a => a.name && (a.name.includes('支付宝') || a.name.includes('花呗'))) || accountsLookup.find(a => a.id === 'acc-2');
      if (acc) matchedAcc = acc;
    } else if (/微信|零钱/.test(channel)) {
      const acc = accountsLookup.find(a => a.name && (a.name.includes('微信') || a.name.includes('零钱'))) || accountsLookup.find(a => a.id === 'acc-1');
      if (acc) matchedAcc = acc;
    } else if (/银行|卡|招商|工行|建行/.test(channel)) {
      const acc = accountsLookup.find(a => a.type === 'bank' || a.id === 'acc-3');
      if (acc) matchedAcc = acc;
    }

    return {
      success: true,
      confidence: 0.999,
      type: transType,
      amount: numAmount,
      bank_or_channel: channel,
      merchant,
      suggested_category: category,
      date: parsed.date || getBeijingDateTimeString(),
      raw_text: `[AI 视觉识别] ${merchant} ¥${numAmount}`,
      matched_rule: `🤖 ${visionModel} 视觉多模态深度理解`,
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name,
      note: parsed.note || `由 ${visionModel} 视觉大模型识别`
    };
  } catch (e) {
    return null;
  }
}
