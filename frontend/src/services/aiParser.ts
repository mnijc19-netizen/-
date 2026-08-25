import { ParsedTransactionResult, DashboardAnalytics, Transaction } from '../types';
import { localStore, AiConfig, getModelMaxTokens } from './localStore';
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
  // ── 智谱 BigModel 系列 ──
  {
    id: 'zhipu-4.6v',
    name: 'GLM-4.6V',
    brand: '智谱 AI',
    desc: '最新旗舰视觉多模态 · 支持截图识别',
    badge: '600万资源包',
    badgeColor: 'purple',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4.6v',
    hint: '新用户赠送 600万 GLM-4.6V 资源包',
    vision: true,
    group: 'zhipu'
  },
  {
    id: 'zhipu-4v-flash',
    name: 'GLM-4V-Flash',
    brand: '智谱 AI',
    desc: '免费视觉模型 · 支持图片识别',
    badge: '永久免费',
    badgeColor: 'emerald',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4v-flash',
    hint: '永久免费视觉大模型，不消耗任何付费额度',
    vision: true,
    group: 'zhipu'
  },
  {
    id: 'zhipu-4.5air',
    name: 'GLM-4.5-Air',
    brand: '智谱 AI',
    desc: '极速旗舰 · 纯文字最快响应',
    badge: '1200万资源包',
    badgeColor: 'blue',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4.5-air',
    hint: '新用户赠送 1200万 GLM-4.5-Air 资源包',
    vision: false,
    group: 'zhipu'
  },
  {
    id: 'zhipu-flash',
    name: 'GLM-4-Flash',
    brand: '智谱 AI',
    desc: '免费极速 · 纯文本记账聊天',
    badge: '永久免费',
    badgeColor: 'emerald',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    hint: '永久免费纯文本模型',
    vision: false,
    group: 'zhipu'
  },
  {
    id: 'zhipu-plus',
    name: 'GLM-4-Plus',
    brand: '智谱 AI',
    desc: '顶配推理旗舰 · 最强理解力',
    badge: '200万资源包',
    badgeColor: 'amber',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-plus',
    hint: '新用户赠送 200万通用推理资源包',
    vision: false,
    group: 'zhipu'
  },
  // ── 第三方模型 ──
  {
    id: 'deepseek',
    name: 'DeepSeek-Chat',
    brand: 'DeepSeek',
    desc: '超强语义理解 · 性价比之王',
    badge: '推荐',
    badgeColor: 'cyan',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    hint: '前往 platform.deepseek.com 获取 sk- 密钥',
    vision: false,
    group: 'third'
  },
  {
    id: 'openai',
    name: 'GPT-4o / 4o-mini',
    brand: 'OpenAI',
    desc: '多模态看图 + 语义理解',
    badge: '',
    badgeColor: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: '前往 platform.openai.com 获取 API Key',
    vision: true,
    group: 'third'
  },
  {
    id: 'qwen',
    name: '通义千问 Qwen',
    brand: '阿里云百炼',
    desc: '国产顶级 · 全场景覆盖',
    badge: '',
    badgeColor: '',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    hint: '前往阿里云百炼获取 API Key',
    vision: false,
    group: 'third'
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    brand: '月之暗面',
    desc: '超长上下文 · 128K 窗口',
    badge: '',
    badgeColor: '',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    hint: '前往 platform.moonshot.cn 获取密钥',
    vision: false,
    group: 'third'
  },
  {
    id: 'custom',
    name: '自定义接口',
    brand: 'OneAPI / 中转站',
    desc: '任意 OpenAI 兼容 API',
    badge: '高级',
    badgeColor: 'slate',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    hint: '支持任何标准 /chat/completions 兼容接口',
    vision: true,
    group: 'custom'
  }
];

/**
 * Validate API key format for known providers
 */
export function validateApiKeyFormat(key: string, provider: string): { valid: boolean; hint: string } {
  const trimmed = key.trim();
  if (!trimmed) return { valid: false, hint: '请填入 API Key' };

  if (provider.startsWith('zhipu')) {
    // Zhipu keys must be in format: {32hex}.{16alphanum}
    if (!trimmed.includes('.')) {
      return { 
        valid: false, 
        hint: '⚠️ 智谱 API Key 格式不完整！正确格式为 xxxxxxxx.yyyyyyyy（中间有英文句号）。请前往 open.bigmodel.cn 重新复制完整的 Key。'
      };
    }
    const parts = trimmed.split('.');
    if (parts.length !== 2 || parts[0].length < 8 || parts[1].length < 8) {
      return { valid: false, hint: '⚠️ 智谱 API Key 格式异常，请确认是否复制完整' };
    }
    return { valid: true, hint: '✓ Key 格式正确' };
  }

  if (provider === 'deepseek') {
    if (!trimmed.startsWith('sk-')) {
      return { valid: false, hint: '⚠️ DeepSeek Key 通常以 sk- 开头' };
    }
    return { valid: true, hint: '✓ Key 格式正确' };
  }

  if (provider === 'openai') {
    if (!trimmed.startsWith('sk-')) {
      return { valid: false, hint: '⚠️ OpenAI Key 通常以 sk- 开头' };
    }
    return { valid: true, hint: '✓ Key 格式正确' };
  }

  return { valid: true, hint: '' };
}

export async function testAiConnection(config: AiConfig): Promise<AiTestResult> {
  if (!config.apiKey || !config.apiKey.trim()) {
    return { success: false, message: '请先填入 API Key' };
  }

  // Pre-validate key format
  const keyCheck = validateApiKeyFormat(config.apiKey, config.provider);
  if (!keyCheck.valid) {
    return { success: false, message: keyCheck.hint };
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
        model: config.model || 'glm-4.6v',
        messages: [
          { role: 'user', content: '你好，请用一句话确认连接正常。' }
        ],
        temperature: 0.1,
        max_tokens: Math.min(1024, getModelMaxTokens(config.model || 'glm-4.6v')) // Dynamically safe for 4V-Flash (1024 cap) and 4.6V (8192)
      })
    });

    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      let errBody = '';
      try {
        const errData = await res.json();
        errBody = errData?.error?.message || JSON.stringify(errData).substring(0, 150);
      } catch {
        errBody = await res.text();
      }
      
      // Parse common Zhipu errors
      if (res.status === 401) {
        if (errBody.includes('过期') || errBody.includes('expired')) {
          return { success: false, message: '❌ API Key 已过期或格式不正确\n\n请前往 open.bigmodel.cn 重新获取完整的 Key（注意包含句号）', latencyMs };
        }
        return { success: false, message: `❌ 认证失败 (401)：API Key 无效\n\n${errBody.substring(0, 100)}`, latencyMs };
      }
      return { 
        success: false, 
        message: `❌ 连接失败 (${res.status}): ${errBody.substring(0, 120)}`,
        latencyMs 
      };
    }

    const data = await res.json();
    const choice = data?.choices?.[0];
    const msg = choice?.message;
    const replyText = (msg?.content || msg?.reasoning_content || '').trim();
    
    if (replyText || (data?.choices && data.choices.length > 0)) {
      const displayReply = replyText 
        ? replyText.substring(0, 80).replace(/\n+/g, ' ')
        : 'API 握手成功，推理引擎已就绪';
      return { 
        success: true, 
        message: `✅ 连接成功！模型【${config.model}】响应正常\n⏱️ 延迟 ${latencyMs}ms\n💬 ${displayReply}`,
        latencyMs 
      };
    }
    return { success: false, message: `⚠️ API 返回内容为空，请确认模型名称 "${config.model}" 是否正确` };
  } catch (err: any) {
    return { success: false, message: `❌ 网络异常: ${err.message || '请检查接口地址或网络连接'}` };
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
    const timeoutId = setTimeout(() => controller.abort(), 12000);

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
        model: config.model || 'glm-4.6v',
        messages: [
          { role: 'system', content: '严格只输出符合格式的单个 JSON 对象，不要用 markdown 格式包裹。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: getModelMaxTokens(config.model || 'glm-4.6v')
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const data = await res.json();
    const replyText = (data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning_content || '').trim();
    
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
      model: config.model || 'glm-4.6v',
      messages: [
        { role: 'system', content: '严格只输出符合格式的 JSON 数组。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: getModelMaxTokens(config.model || 'glm-4.6v')
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI 请求失败 (${res.status}): ${errText.substring(0, 80)}`);
  }

  const data = await res.json();
  const replyText = (data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning_content || '').trim();
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
      model: config.model || 'glm-4.6v',
      messages: [
        { role: 'system', content: 'You are an expert personal financial advisor. Be concise, practical and supportive.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 2048
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI 请求失败 (${res.status}): ${errText.substring(0, 80)}`);
  }

  const data = await res.json();
  return (data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning_content || '暂无财务分析建议。').trim();
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
  let visionModel = config.model || 'glm-4.6v';
  if ((config.provider === 'zhipu' || config.provider === 'zhipu-vision') && !visionModel.includes('4v') && !visionModel.includes('4.6v')) {
    visionModel = 'glm-4.6v';
  } else if (config.provider === 'qwen' && !visionModel.includes('vl')) {
    visionModel = 'qwen-vl-plus';
  } else if (config.provider === 'kimi' && !visionModel.includes('vision')) {
    visionModel = 'moonshot-v1-8k-vision-preview';
  } else if (config.provider === 'openai' && !visionModel.includes('4o')) {
    visionModel = 'gpt-4o-mini';
  }

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

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
        max_tokens: getModelMaxTokens(visionModel)
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const replyText = (data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning_content || '').trim();
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

import { AccountType } from '../types';

export interface ExtractedBalanceResult {
  platform: string;
  accountType: AccountType;
  balance: number;
  currency: string;
  bankName?: string;
  cardLast4?: string;
  note?: string;
  confidence: number;
}

/**
 * AI Vision: Parse platform balance screenshots (WeChat, Alipay, Banks, Brokerages, Huabei, JD Baitiao, Meituan Pay, Douyin Pay, etc.)
 */
export async function parseBalanceScreenshotWithAi(
  base64DataUrl: string
): Promise<ExtractedBalanceResult | null> {
  const config = localStore.getAiConfig();
  if (!config.apiKey || !config.apiKey.trim()) {
    return null;
  }

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const isVisionModel = /4v|4\.6v|vl|vision|4o|gemini/i.test(config.model || '') || 
                        config.provider?.includes('vision') || 
                        config.provider === 'zhipu-4.6v';
  const visionModel = isVisionModel ? (config.model || 'glm-4.6v') : (config.model || 'glm-4.6v');

  const prompt = `你是一个顶级专业的财务与资产/负债识别专家。请仔细分析这张包含平台资产、钱包余额、银行卡、证券账户或消费信贷待还账单的截图：

【严格识别分类规则（100% 精确映射）】：
1. 🐕 京东白条 (JD Baitiao):
   - 包含“全部待还账单”、“全部待还 (元)”、“提前结清”、“已出账”、“京东”、“白条”
   - platform: "京东白条"
   - account_type: "baitiao"
   - balance: 提取全部待还核心数字（如 2691.41）
2. 🦘 美团月付 (Meituan Pay):
   - 包含“美团月付”、“美团外卖”、“月付账单”、“本月待还”、“下月待还”
   - platform: "美团月付"
   - account_type: "meituan_pay"
   - balance: 提取当前待还账单数字（如 278.22）
3. 🌸 蚂蚁花呗 (Alipay Huabei):
   - 包含“花呗”、“花呗分期”、“花呗账单”、“本月应还”、“下月待还”
   - platform: "蚂蚁花呗"
   - account_type: "huabei"
   - balance: 提取花呗待还款数字
4. 💰 蚂蚁借呗 (Alipay Jiebei):
   - 包含“借呗”、“网商贷”、“我的借款”、“借款本金”
   - platform: "蚂蚁借呗"
   - account_type: "jiebei"
   - balance: 提取借呗待还本金
5. 🎵 抖音月付 (Douyin Pay):
   - 包含“抖音月付”、“抖音支付”、“本月应还”、“待还本金”
   - platform: "抖音月付"
   - account_type: "douyin_pay"
   - balance: 提取抖音月付待还数字
6. 💬 微信分付 / 微粒贷 (WeChat Fenfu / Weilidai):
   - 包含“微信分付”、“分付”、“已用额度”、“微粒贷”
   - platform: "微信分付"
   - account_type: "fenfu"
   - balance: 提取已用额度或待还金额
7. 🟢 微信钱包（微信零钱 / 零钱通）:
   - 包含“钱包”、“零钱”、“零钱通”、“支付分”
   - platform: 判定为 "微信零钱" 或 "微信支付-零钱通" 或 "微信钱包"
   - account_type: "wallet"
   - balance: 提取零钱或零钱通实际数字
8. 🔵 支付宝资产（支付宝总资产 / 余额宝）:
   - 包含“总资产”、“资产概览”、“我的资产”、“余额宝”、“理财资产”
   - platform: 判定为 "支付宝-总资产" 或 "支付宝-余额宝"
   - account_type: "wallet"
   - balance: 提取“我的资产”或总资产核心数字（忽略广告推广）
9. 📈 证券/基金/股票持仓:
   - 包含“持仓”、“证券资产”、“ETF”、“华泰证券”、“招商证券”、“天天基金”
   - platform: 判定为 "华泰证券/基金持仓" 或对应券商名
   - account_type: "investment"
   - balance: 提取总资产或持仓总市值
10. 🏦 银行储蓄卡:
    - 包含“招商银行”、“工商银行”、“建设银行”、“农业银行”、“中国银行”等
    - platform: 银行具体名称
    - account_type: "bank"
    - balance: 提取活期/可用余额

请直接输出符合格式的纯 JSON 字符串（绝对不要用任何 markdown 代码块包裹）：
{
  "platform": "京东白条|美团月付|蚂蚁花呗|微信零钱|支付宝-总资产|华泰证券/基金持仓|...",
  "account_type": "baitiao|meituan_pay|huabei|jiebei|douyin_pay|fenfu|wallet|bank|investment|credit|cash",
  "balance": 提取当前核心数字（纯数字，例如 278.22 或 2691.41，不要逗号）,
  "currency": "CNY",
  "bank_name": "银行机构名称（无则留空）",
  "card_last4": "卡号后4位（无则留空）",
  "note": "识别说明"
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

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
        max_tokens: getModelMaxTokens(visionModel)
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const replyText = (data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning_content || '').trim();
      const jsonMatch = replyText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.balance !== undefined && !isNaN(parseFloat(parsed.balance))) {
          const numBalance = Math.abs(parseFloat(parsed.balance));
          const allowedTypes = [
            'baitiao', 'meituan_pay', 'huabei', 'jiebei', 'douyin_pay', 'fenfu',
            'wallet', 'bank', 'investment', 'crypto', 'credit', 'loan', 'cash'
          ];
          let validAccountType: AccountType = 'wallet';
          if (allowedTypes.includes(parsed.account_type)) {
            validAccountType = parsed.account_type as AccountType;
          } else if (/白条|京东/.test(parsed.platform || '')) {
            validAccountType = 'baitiao';
          } else if (/美团/.test(parsed.platform || '')) {
            validAccountType = 'meituan_pay';
          } else if (/花呗/.test(parsed.platform || '')) {
            validAccountType = 'huabei';
          } else if (/借呗/.test(parsed.platform || '')) {
            validAccountType = 'jiebei';
          } else if (/抖音/.test(parsed.platform || '')) {
            validAccountType = 'douyin_pay';
          } else if (/分付/.test(parsed.platform || '')) {
            validAccountType = 'fenfu';
          } else if (/银行|卡|储蓄/.test(parsed.platform || '')) {
            validAccountType = 'bank';
          } else if (/基金|理财|证券|股票|收益|华泰/.test(parsed.platform || '')) {
            validAccountType = 'investment';
          }

          return {
            platform: parsed.platform || '资产账户',
            accountType: validAccountType,
            balance: numBalance,
            currency: parsed.currency || 'CNY',
            bankName: parsed.bank_name || undefined,
            cardLast4: parsed.card_last4 || undefined,
            note: parsed.note || `由 ${visionModel} 识别于 ${getBeijingDateTimeString()}`,
            confidence: 0.99
          };
        }
      }
    }
  } catch (e) {
    // vision call failed or not supported, continue to text-based LLM fallback
  }

  // 2. Fallback: If Vision model is not supported (e.g. DeepSeek-Chat is text-only), run local OCR then ask LLM to extract JSON
  try {
    const { extractOcrRawText } = await import('./imageOcr');
    const { parseOfflineBalanceScreenshot } = await import('./balanceScreenshotParser');
    const ocrText = await extractOcrRawText(base64DataUrl);
    
    // Check local offline rules first
    if (ocrText) {
      const offlineRes = parseOfflineBalanceScreenshot(ocrText);
      if (offlineRes && offlineRes.balance > 0) {
        return offlineRes;
      }
    }

    if (ocrText && ocrText.trim()) {
      const textPrompt = `你是一个财务资产与负债识别专家。请从以下账户余额或账单截图 OCR 文字中，识别并提取出平台与金额信息，严格按照 JSON 格式返回（不要用 markdown 代码块包裹）：
{
  "platform": "平台或银行具体名称，例如：京东白条、美团月付、蚂蚁花呗、微信零钱、支付宝-总资产、华泰证券/基金持仓、招商银行等",
  "account_type": "baitiao|meituan_pay|huabei|jiebei|douyin_pay|fenfu|wallet|bank|investment|credit|cash",
  "balance": 提取当前核心金额数字（纯数字，例如 278.22 或 2691.41）,
  "currency": "CNY",
  "bank_name": "银行名称（无则留空）",
  "card_last4": "卡号后4位（无则留空）"
}
OCR 识别文字如下：
${ocrText}`;

      const textRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey.trim()}`
        },
        body: JSON.stringify({
          model: config.model || 'glm-4.5-air',
          messages: [
            { role: 'system', content: '严格只输出符合格式的单个 JSON 对象，不要用 markdown 包裹。' },
            { role: 'user', content: textPrompt }
          ],
          temperature: 0.1,
          max_tokens: 2048
        })
      });

      if (textRes.ok) {
        const tData = await textRes.json();
        const tReply = (tData?.choices?.[0]?.message?.content || tData?.choices?.[0]?.message?.reasoning_content || '').trim();
        const tJsonMatch = tReply.match(/\{[\s\S]*\}/);
        if (tJsonMatch) {
          const tParsed = JSON.parse(tJsonMatch[0]);
          if (tParsed.balance !== undefined && !isNaN(parseFloat(tParsed.balance))) {
            const numBal = Math.abs(parseFloat(tParsed.balance));
            const allowed = ['baitiao', 'meituan_pay', 'huabei', 'jiebei', 'douyin_pay', 'fenfu', 'wallet', 'bank', 'investment', 'crypto', 'credit', 'cash'];
            return {
              platform: tParsed.platform || '资产账户',
              accountType: (allowed.includes(tParsed.account_type) ? tParsed.account_type : 'wallet') as AccountType,
              balance: numBal,
              currency: tParsed.currency || 'CNY',
              bankName: tParsed.bank_name || undefined,
              cardLast4: tParsed.card_last4 || undefined,
              note: `由 ${config.model} (OCR 文本大模型理解) 识别`,
              confidence: 0.95
            };
          }
        }
      }
    }
  } catch (ocrErr) {
    console.warn('OCR Text fallback error:', ocrErr);
  }

  return null;
}
