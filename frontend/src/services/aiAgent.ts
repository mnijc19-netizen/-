import { 
  Account, 
  Category, 
  Transaction, 
  Goal, 
  Budget, 
  RecurringRule, 
  Investment, 
  Debt, 
  AgentChatMessage, 
  AgentResponse 
} from '../types';
import { localStore } from './localStore';
import { api } from '../api/client';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';
import { optimizeImagesBatch } from './imageOptimizer';

/**
 * Sanitizes raw string by escaping unescaped literal newlines inside JSON strings
 */
function sanitizeJsonString(str: string): string {
  // Replace literal unescaped control characters within quotes
  return str.replace(/"((?:\\.|[^"\\])*)"/gs, (_, inner) => {
    const fixed = inner
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return `"${fixed}"`;
  });
}

/**
 * Extracts a JSON object safely from an LLM response, resilient to unescaped newlines
 */
function extractJsonFromResponse(raw: string): any | null {
  if (!raw || !raw.trim()) return null;

  let text = raw.trim();

  // Strip markdown code block wrappers ```json ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  } else {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }
  }

  // 1. Direct standard parse
  try {
    return JSON.parse(text);
  } catch {}

  // 2. Parse with unescaped newline sanitation
  try {
    const sanitized = sanitizeJsonString(text);
    return JSON.parse(sanitized);
  } catch {}

  // 3. Fallback: Structural regex extraction for reply & action
  try {
    let reply = '';
    let action: any = { type: 'none' };

    // Extract "reply": "..."
    const replyMatch = text.match(/"reply"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"action"|"\s*\})/i);
    if (replyMatch && replyMatch[1]) {
      reply = replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    // Extract "action": { ... }
    const actionIndex = text.indexOf('"action"');
    if (actionIndex !== -1) {
      const actionSub = text.substring(actionIndex);
      const firstActionBrace = actionSub.indexOf('{');
      if (firstActionBrace !== -1) {
        let depth = 0;
        let lastActionBrace = -1;
        for (let i = firstActionBrace; i < actionSub.length; i++) {
          if (actionSub[i] === '{') depth++;
          else if (actionSub[i] === '}') {
            depth--;
            if (depth === 0) {
              lastActionBrace = i;
              break;
            }
          }
        }
        if (lastActionBrace !== -1) {
          const actionJsonStr = actionSub.substring(firstActionBrace, lastActionBrace + 1);
          try {
            action = JSON.parse(actionJsonStr);
          } catch {
            action = JSON.parse(sanitizeJsonString(actionJsonStr));
          }
        }
      }
    }

    if (reply || (action && action.type && action.type !== 'none')) {
      return { reply: reply || '已为您分析完成', action };
    }
  } catch {}

  return null;
}

/**
 * Executes a conversation turn with the financial AI Copilot Agent (Full-Spectrum System Controller)
 */
/**
 * Executes a conversation turn with the financial AI Copilot Agent with ultra-fast SSE Streaming support
 */
export async function sendAgentMessage(
  userMessage: string,
  history: AgentChatMessage[],
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  goals: Goal[],
  imagesInput?: string | string[],
  budgets: Budget[] = [],
  recurringRules: RecurringRule[] = [],
  investments: Investment[] = [],
  debts: Debt[] = [],
  onStreamChunk?: (streamedReply: string) => void
): Promise<AgentResponse> {
  const config = localStore.getAiConfig();
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('请先在【设置 -> AI 智能模型与大脑】中配置并启用 API Key');
  }

  // Normalize images to string[] and compress them in parallel for 10x-20x speedup
  let rawImages: string[] = [];
  if (typeof imagesInput === 'string' && imagesInput.trim()) {
    rawImages.push(imagesInput);
  } else if (Array.isArray(imagesInput)) {
    rawImages.push(...imagesInput.filter(Boolean));
  }

  // Pre-optimize image payloads: 1280px crisp JPEG (shrinks 10MB to 150KB)
  const imagesBase64 = rawImages.length > 0 ? await optimizeImagesBatch(rawImages) : [];

  // 1. Build live financial summary context (compact & high-density for faster LLM inference)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const monthTxs = transactions.filter(t => t.date && t.date.startsWith(currentMonthStr));
  const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const monthIncome = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

  const catExpenses: Record<string, number> = {};
  for (const t of monthTxs.filter(t => t.type === 'expense')) {
    const cName = t.category_name || '日常消费';
    catExpenses[cName] = (catExpenses[cName] || 0) + t.amount;
  }

  const liabilityTypes = ['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'];
  const totalAssets = accounts.filter(a => !liabilityTypes.includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter(a => liabilityTypes.includes(a.type)).reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  const accountsSummary = accounts.map(a => `${a.name}(id:${a.id},${a.type}):¥${a.balance.toFixed(2)}`).join('，');
  const catSummary = Object.entries(catExpenses).map(([c, amt]) => `${c}:¥${amt.toFixed(2)}`).join('，') || '暂无';
  const recentRecentTxs = transactions.slice(0, 6).map(t => `[id:${t.id}] ${t.date.split('T')[0] || t.date} ${t.merchant} ${t.type === 'expense' ? '-' : '+'}¥${t.amount.toFixed(2)}`).join('；');
  const budgetsSummary = budgets.map(b => `${b.category_name || '总'}:限¥${b.amount},用¥${b.spent_amount || 0}`).join('，') || '暂无';
  const goalsSummary = goals.map(g => `${g.name}(目标¥${g.target_amount},已存¥${g.current_amount})`).join('，') || '暂无';
  const recurringSummary = recurringRules.map(r => `${r.name}(每月${r.day_of_period}号,${r.type === 'expense' ? '扣' : '收'}¥${r.amount})`).join('，') || '暂无';
  const investmentsSummary = investments.map(i => `${i.name}(代码:${i.code},持仓:${i.shares}份,市值:¥${i.market_value.toFixed(2)})`).join('，') || '暂无';
  const debtsSummary = debts.map(d => `${d.name}(待还:¥${d.remaining_principal},月供:¥${d.monthly_payment})`).join('，') || '暂无';

  const currentModelName = config.model || 'GLM-4.6V';
  const currentProviderName = config.provider === 'deepseek' ? 'DeepSeek' : config.provider?.includes('zhipu') ? '智谱 BigModel' : 'AI 大模型';

  const systemPrompt = `你是一个顶级专业、超快响应、具备超高精度视觉识别与真实账本操控能力的 AI 财务全能管家（斌斌财务 AI）。
【当前底层模型】:【${currentModelName}】（由 ${currentProviderName} 提供服务）。

【平台与账户识别铁律】：
1. 京东白条 (baitiao): 包含“全部待还账单”、“全部待还 (元)”、“提前结清”、“已出账”、“京东金融” ➔ 平台名「京东白条」，类别【baitiao】(消费信贷负债，金额提取待还总金额)；
2. 蚂蚁花呗 (huabei): 包含“花呗”、“花呗分期”、“花呗账单” ➔ 平台名「蚂蚁花呗」，类别【huabei】；
3. 蚂蚁借呗 (jiebei): 包含“借呗”、“网商贷”、“待还本金” ➔ 平台名「蚂蚁借呗」，类别【jiebei】；
4. 美团月付 (meituan_pay): 包含“美团月付”、“月付额度”、“本月待还” ➔ 平台名「美团月付」，类别【meituan_pay】；
5. 抖音月付 (douyin_pay): 包含“抖音月付”、“抖音支付”、“本月应还” ➔ 平台名「抖音月付」，类别【douyin_pay】；
6. 微信分付/微粒贷 (fenfu): 包含“分付”、“微信分付”、“微粒贷” ➔ 类别【fenfu】；
7. 银行信用卡 (credit): 包含各银行“信用卡”、“本期应还” ➔ 类别【credit】；
8. 支付宝 (wallet): 平台「支付宝/余额宝」或「支付宝-总资产」；
9. 微信支付 (wallet): 平台「微信零钱」或「微信支付」；
10. 证券/基金 (investment): 包含“华泰证券/涨乐财富通/天天基金/股票ETF持仓” ➔ 类别【investment】；
11. 银行储蓄账户 (bank): 类别【bank】。

当前用户真实财务态势：
【资产】:¥${totalAssets.toFixed(2)}，【负债】:¥${totalLiabilities.toFixed(2)}，【净资产】:¥${netWorth.toFixed(2)}
【账户】: ${accountsSummary || '暂无'}
【投资】: ${investmentsSummary}
【负债】: ${debtsSummary}
【本月收支(${currentMonthStr})】: 收¥${monthIncome.toFixed(2)}，支¥${monthExpense.toFixed(2)}，结余¥${(monthIncome - monthExpense).toFixed(2)}
【本月分类支出】: ${catSummary}
【预算】: ${budgetsSummary}，【目标】: ${goalsSummary}，【周期规则】: ${recurringSummary}
【最近流水】: ${recentRecentTxs || '暂无'}

【用户指令落地 Action 规范】：
1. 📸 识图/批量开账/负债入账：
   - 多平台开账: action="batch_create_accounts", payload={ updates: [ { platform: "美团月付", balance: 289.40, account_type: "meituan_pay" }, ... ] }
   - 单平台开账: action="create_account", payload={ name: "美团月付", type: "meituan_pay", balance: 289.40, currency: "CNY" }
   - 调额对账: action="update_balance", payload={ platform: "微信零钱", balance: 1000.00, account_type: "wallet" }
2. 📈 证券与基金持仓：
   - action="create_investment", payload={ name: "纳指ETF", code: "159941", shares: 800, cost_price: 1.58, account_name: "华泰证券" }
3. 💳 负债借贷: action="create_debt", payload={ name: "房贷", total_principal: 100000, monthly_payment: 2000, type: "mortgage" }
4. 记账: action="create_transaction", payload={ amount: 20, merchant: "瑞幸咖啡", category: "餐饮美食", type: "expense", channel: "微信支付" }
5. 转账: action="transfer_funds", payload={ from_account: "银行卡", to_account: "微信零钱", amount: 1000 }
6. 预算: action="set_budget", payload={ category_name: "餐饮美食", amount: 1500 }
7. 目标: action="create_goal", payload={ name: "买手机", target_amount: 6000 }
8. 周期: action="create_recurring_rule", payload={ name: "房租", amount: 2800, type: "expense", day_of_period: 10 }
9. 导航: action="navigate_to", payload={ page: "accounts|transactions|analytics|investments|debts" }
10. 纯聊天/问答/无修改指令: action={ type: "none" }

【输出格式铁律】：
直接输出标准的 JSON 对象（禁止用任何 markdown 代码块包裹）：
{
  "reply": "你对用户的专业、亲切、准确的中文回复",
  "action": {
    "type": "create_account | batch_create_accounts | update_balance | batch_update_balances | create_investment | batch_create_investments | refresh_investments | create_debt | create_transaction | batch_create_transactions | transfer_funds | set_budget | create_goal | create_recurring_rule | navigate_to | export_data | none",
    "payload": { ... }
  }
}`;

  const isVisionModel = /4v|4\.6v|vl|vision|4o|gemini/i.test(config.model || '') || 
                        config.provider?.includes('vision') || 
                        config.provider === 'zhipu-4.6v';

  // Build user message content
  let userContent: any = userMessage || '请帮我分析处理上传的图片';
  
  if (imagesBase64.length > 0) {
    if (isVisionModel) {
      const parts: any[] = [
        { 
          type: 'text', 
          text: userMessage 
            ? `${userMessage}\n(共上传了 ${imagesBase64.length} 张图片，请逐一识别分析每张图片中的平台、总资产/余额、月付欠款或消费明细，并按指令输出账本动作)` 
            : `请识别分析我上传的 ${imagesBase64.length} 张图片。提取平台名与金额并批量开账/对账；若是消费账单请提取商户与支出金额。` 
        }
      ];

      for (const img of imagesBase64) {
        parts.push({
          type: 'image_url',
          image_url: { url: img }
        });
      }
      userContent = parts;
    } else {
      try {
        const { extractOcrRawText } = await import('./imageOcr');
        const { parseOfflineBalanceScreenshot } = await import('./balanceScreenshotParser');
        let ocrSection = `\n【共上传了 ${imagesBase64.length} 张截图，系统 OCR 离线分析结果如下】:\n`;
        let imgIdx = 1;
        for (const img of imagesBase64) {
          const rawOcr = await extractOcrRawText(img);
          const balRes = parseOfflineBalanceScreenshot(rawOcr);
          ocrSection += `--- 截图 ${imgIdx} ---\n${rawOcr}\n`;
          if (balRes && balRes.balance > 0) {
            ocrSection += `[提示: 疑似平台 ${balRes.platform}，金额约 ¥${balRes.balance}]\n`;
          }
          imgIdx++;
        }
        userContent = `${userMessage || '分析处理以下截图账单信息'}\n${ocrSection}`;
      } catch {
        userContent = `${userMessage || '分析处理截图账单'}\n[图片 OCR 受限]`;
      }
    }
  }

  // 2. Format history (keep last 8 turns to minimize token latency)
  const apiMessages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  for (const h of history.slice(-8)) {
    apiMessages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content
    });
  }

  apiMessages.push({
    role: 'user',
    content: userContent
  });

  // 3. Dispatch REST API call with Streaming Support
  let baseUrl = (config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  // For pure text chat with Zhipu, if selected model is 4.6v, we can use 4.6v or fast model
  const activeModel = config.model || 'glm-4.6v';

  const reqBody: any = {
    model: activeModel,
    messages: apiMessages,
    temperature: 0.1,
    max_tokens: 4096, // High token ceiling to accommodate deep thinking/reasoning + JSON output
    stream: true // Enable SSE streaming for instant TTFT response
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify(reqBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `AI 服务响应错误 (HTTP ${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        msg = errJson.error?.message || errJson.message || msg;
      } catch {}
      throw new Error(msg);
    }

    // Process SSE Stream
    let rawAccumulated = '';
    let rawReasoning = '';
    let lastReportedReply = '';

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;

          try {
            const dataJson = JSON.parse(dataStr);
            const deltaObj = dataJson.choices?.[0]?.delta || {};
            const delta = deltaObj.content || '';
            const reasoningDelta = deltaObj.reasoning_content || '';

            // Handle live reasoning preview for deep thinking models (e.g. GLM-4.6V)
            if (reasoningDelta) {
              rawReasoning += reasoningDelta;
              if (onStreamChunk && !rawAccumulated) {
                onStreamChunk('🧠 正在深度思考分析账本...\n' + rawReasoning.slice(-150));
              }
            }

            // Handle actual content tokens
            if (delta) {
              rawAccumulated += delta;

              // Dynamically extract live reply preview for typewriter effect
              if (onStreamChunk) {
                const replyMatch = rawAccumulated.match(/"reply"\s*:\s*"([^"]*)/);
                if (replyMatch && replyMatch[1]) {
                  const currentClean = replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                  if (currentClean !== lastReportedReply) {
                    lastReportedReply = currentClean;
                    onStreamChunk(currentClean);
                  }
                } else if (!rawAccumulated.startsWith('{')) {
                  onStreamChunk(rawAccumulated);
                }
              }
            }
          } catch {}
        }
      }
    } else {
      // Fallback if ReadableStream is unavailable
      const data = await response.json();
      rawAccumulated = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
    }

    // 4. Parse final JSON and action from accumulated text
    const parsed = extractJsonFromResponse(rawAccumulated);

    if (parsed && typeof parsed.reply === 'string') {
      return {
        reply: parsed.reply,
        action: parsed.action || { type: 'none' }
      };
    }

    return {
      reply: rawAccumulated.trim() || '已为您处理完成',
      action: { type: 'none' }
    };
  } catch (err: any) {
    // If streaming fetch fails (e.g. proxy blocks SSE), fallback to standard non-streaming call
    const fallbackBody = { ...reqBody, stream: false, max_tokens: 4096 };
    const fbResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify(fallbackBody)
    });

    if (!fbResponse.ok) {
      throw err;
    }

    const data = await fbResponse.json();
    const rawContent = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '').trim();
    const parsed = extractJsonFromResponse(rawContent);

    if (parsed && typeof parsed.reply === 'string') {
      return {
        reply: parsed.reply,
        action: parsed.action || { type: 'none' }
      };
    }

    return {
      reply: rawContent.trim(),
      action: { type: 'none' }
    };
  }
}
