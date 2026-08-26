/**
 * AI 分类增强服务
 * 策略：本地知识库优先（无需 API）→ 置信度低时走 AI API 增强
 */
import { localMatchMerchant, MerchantMatch } from './merchantKnowledge';
import { localStore } from './localStore';

export interface AiCategoryResult {
  category: string;
  confidence: number;
  reason: string;
  isPersonTransfer: boolean;
  source: 'local_brand' | 'local_keyword' | 'local_namematch' | 'ai_api' | 'fallback';
}

/** 防抖定时器 ID */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 核心函数：对单个商户名给出分类建议
 * - 先走本地知识库 (< 1ms)
 * - 置信度 < 0.5 且有 apiKey 时，走 AI API 增强
 */
export async function suggestCategoryForMerchant(
  merchantName: string,
  transType?: string,
  amount?: number
): Promise<AiCategoryResult> {
  if (!merchantName?.trim()) {
    return { category: '其他消费', confidence: 0.1, reason: '商户名为空', isPersonTransfer: false, source: 'fallback' };
  }

  // Step 1: 本地知识库
  const local: MerchantMatch = localMatchMerchant(merchantName, transType);
  
  // 置信度高，直接返回
  if (local.confidence >= 0.5) {
    const src = local.confidence >= 0.9 ? 'local_brand'
              : local.isPersonTransfer ? 'local_namematch'
              : 'local_keyword';
    return {
      category: local.category,
      confidence: local.confidence,
      reason: local.reason,
      isPersonTransfer: !!local.isPersonTransfer,
      source: src
    };
  }

  // Step 2: 尝试 AI 增强（需要配置 apiKey）
  const config = localStore.getAiConfig();
  if (config.enabled && config.apiKey && config.apiKey.length > 10) {
    try {
      const aiResult = await callAiForCategory(merchantName, transType, amount, config);
      if (aiResult) return { ...aiResult, source: 'ai_api' };
    } catch {
      // AI 调用失败，降级为本地结果
    }
  }

  // Step 3: 返回本地低置信度结果
  return {
    category: local.category,
    confidence: local.confidence,
    reason: local.reason + '（建议手动确认）',
    isPersonTransfer: !!local.isPersonTransfer,
    source: 'fallback'
  };
}

/**
 * 调用 AI API 识别商户分类（极短 Prompt，< 500ms）
 */
async function callAiForCategory(
  merchantName: string,
  transType: string | undefined,
  amount: number | undefined,
  config: any
): Promise<Omit<AiCategoryResult, 'source'> | null> {
  const VALID_CATEGORIES = [
    '餐饮美食', '交通出行', '日用百货', '购物消费', '住房物业',
    '休闲娱乐', '医疗健康', '数码科技', '金融还款', '工资收入',
    '理财投资', '个人转账', '其他消费'
  ];

  const prompt = `你是记账助手。请判断以下商户的记账分类。
商户名：${merchantName}
${transType ? `交易类型：${transType}` : ''}
${amount ? `金额：¥${amount}` : ''}

请从以下分类中选择一个最合适的，只返回 JSON，不要任何解释：
可选分类：${VALID_CATEGORIES.join('、')}

返回格式：{"category":"选择的分类","reason":"一句话理由（15字以内）","isPersonTransfer":false}`;

  const baseUrl = (config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '');
  // Use the lightest/fastest model for classification
  const model = config.model?.includes('deepseek') ? 'deepseek-chat'
              : config.model?.includes('gpt') ? 'gpt-4o-mini'
              : config.model?.includes('qwen') ? 'qwen-turbo'
              : 'glm-4-flash';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey.trim()}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 80,
      stream: false
    }),
    signal: AbortSignal.timeout(5000) // 5秒超时
  });

  if (!response.ok) return null;

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  
  // Parse JSON from response
  const jsonMatch = text.match(/\{[^}]+\}/);
  if (!jsonMatch) return null;
  
  const parsed = JSON.parse(jsonMatch[0]);
  const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : '其他消费';
  
  return {
    category,
    confidence: 0.88,
    reason: parsed.reason || `AI 建议：${category}`,
    isPersonTransfer: parsed.isPersonTransfer === true || category === '个人转账'
  };
}

/**
 * 防抖版本：用于输入框 onChange 实时调用，避免每次按键都请求
 * @param delay 防抖延迟 ms，默认 500ms
 */
export function debouncedSuggestCategory(
  merchantName: string,
  transType?: string,
  amount?: number,
  onResult?: (result: AiCategoryResult | null) => void,
  delay = 500
): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (!merchantName || merchantName.length < 2) {
    onResult?.(null);
    return;
  }
  debounceTimer = setTimeout(async () => {
    try {
      const result = await suggestCategoryForMerchant(merchantName, transType, amount);
      onResult?.(result);
    } catch {
      onResult?.(null);
    }
  }, delay);
}

/**
 * 批量修正 Excel 导入条目分类
 * 对置信度低的条目分批调用 AI API
 */
export async function batchCorrectCategories(
  items: Array<{ id: string; merchant: string; category: string; orderId?: string; type?: string }>,
  onProgress?: (processed: number, total: number) => void
): Promise<Map<string, AiCategoryResult>> {
  const results = new Map<string, AiCategoryResult>();
  const BATCH_SIZE = 10;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (item) => {
      const result = await suggestCategoryForMerchant(item.merchant, item.type);
      results.set(item.id, result);
    }));
    
    onProgress?.(Math.min(i + BATCH_SIZE, items.length), items.length);
    
    // Small delay to avoid rate limiting
    if (i + BATCH_SIZE < items.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}
