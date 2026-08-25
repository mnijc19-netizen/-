import { ParsedTransactionResult } from '../types';
import { localStore, AiConfig } from './localStore';
import { getBeijingDateTimeString } from '../utils/dateUtils';

export interface AiTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export const AI_PROVIDERS = [
  {
    id: 'deepseek',
    name: '🇨🇳 DeepSeek (推荐·极速超省)',
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

export async function parseWithAi(
  rawText: string,
  accountsLookup: any[] = []
): Promise<ParsedTransactionResult | null> {
  const config = localStore.getAiConfig();
  if (!config.enabled || !config.apiKey || !config.apiKey.trim()) {
    return null; // AI disabled or unconfigured, fall back immediately
  }

  const clean = rawText.trim();
  if (!clean) return null;

  try {
    const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const prompt = `你是一个智能财务记账助手。请从用户输入的账单、小票、短信或截屏文本中，精准提取交易信息并严格返回纯 JSON 对象（不要包含任何 markdown 代码块或多余解释）：
{
  "amount": 11.80,
  "merchant": "商户或门店名称（如 清口清汤面(金山店)、麦当劳、淘宝闪购）",
  "category": "餐饮美食|日用百货|交通出行|购物消费|休闲娱乐|医疗健康|生活服务|日常消费",
  "type": "expense|income|transfer|repayment",
  "channel": "支付宝|微信支付|银行卡|花呗|信用卡",
  "date": "YYYY-MM-DD HH:mm（如未包含则留空）",
  "note": "订单简要说明"
}

待提取的文本内容如下：
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
          { role: 'system', content: '严格只输出符合格式的 JSON 对象，不加任何前后缀。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 250
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn('AI Parsing failed HTTP:', res.status);
      return null; // Graceful fallback to regex
    }

    const data = await res.json();
    const replyText = data?.choices?.[0]?.message?.content || '';
    
    // Extract JSON block safely
    const jsonMatch = replyText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.amount || isNaN(parseFloat(parsed.amount))) return null;

    const numAmount = Math.abs(parseFloat(parsed.amount));
    const merchant = parsed.merchant || '智能记账商户';
    const category = parsed.category || '日常消费';
    const transType = parsed.type || 'expense';
    const channel = parsed.channel || '微信/支付宝';

    // Account matching
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
      matched_rule: `🤖 ${config.model} 深度理解`,
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name,
      note: parsed.note || `由 ${config.model} 智能解析`
    };
  } catch (err: any) {
    console.warn('AI Parsing exception, falling back:', err.message);
    return null; // Graceful fallback
  }
}
