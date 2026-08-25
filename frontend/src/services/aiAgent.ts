import { api } from '../api/client';
import { localStore } from './localStore';
import { Account, Transaction, Category, Goal } from '../types';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  imageUrl?: string;
  actionResult?: {
    type: 'transaction_created' | 'goal_created' | 'data_exported' | 'balance_updated' | 'account_created' | 'analysis';
    data?: any;
  };
}

export interface AgentResponse {
  reply: string;
  action?: {
    type: 'create_transaction' | 'create_goal' | 'export_data' | 'update_balance' | 'create_account' | 'none';
    payload?: any;
  };
}

/**
 * Executes a conversation turn with the financial AI Copilot Agent (Supports multimodal image & text)
 */
export async function sendAgentMessage(
  userMessage: string,
  history: AgentChatMessage[],
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  goals: Goal[],
  imageBase64?: string
): Promise<AgentResponse> {
  const config = localStore.getAiConfig();
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('请先在【设置 -> AI 智能模型与大脑】中配置并启用 API Key');
  }

  // 1. Build live financial summary context
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Current month income & expenses
  const monthTxs = transactions.filter(t => t.date && t.date.startsWith(currentMonthStr));
  const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const monthIncome = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown for current month
  const catExpenses: Record<string, number> = {};
  for (const t of monthTxs.filter(t => t.type === 'expense')) {
    const cName = t.category_name || '日常消费';
    catExpenses[cName] = (catExpenses[cName] || 0) + t.amount;
  }

  // Total net worth
  const totalAssets = accounts.filter(a => a.type !== 'credit' && a.type !== 'loan').reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter(a => a.type === 'credit' || a.type === 'loan').reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  const accountsSummary = accounts.map(a => `${a.name}(id:${a.id}, ${a.type}): ¥${a.balance.toFixed(2)}`).join('，');
  const catSummary = Object.entries(catExpenses).map(([c, amt]) => `${c}: ¥${amt.toFixed(2)}`).join('，') || '暂无';
  const recentRecentTxs = transactions.slice(0, 5).map(t => `${t.date} ${t.merchant} ${t.type === 'expense' ? '-' : '+'}¥${t.amount.toFixed(2)}(${t.category_name})`).join('；');

  const currentModelName = config.model || 'GLM-4V';
  const currentProviderName = config.provider === 'deepseek' ? 'DeepSeek' : config.provider?.includes('zhipu') ? '智谱 BigModel' : 'AI 大模型';

  const systemPrompt = `你是一个顶级专业、具备视觉识别与真实账本全权限操控能力的 AI 财务全能管家（斌斌财务 AI）。
【你的真实模型身份】: 你当前正在调用的真实底层模型是【${currentModelName}】（由 ${currentProviderName} 提供服务）。
当用户询问你是谁、你是什么模型、你叫什么、使用的是什么大模型等身份问题时，你必须直接、诚实、明确地回答当前调用的具体模型是【${currentModelName}】！且此时 action.type 必须为 "none"！

当前用户的实时账本状态如下：
【时间】: ${getBeijingDateTimeString()}
【资产总额】: ¥${totalAssets.toFixed(2)}，【负债总额】: ¥${totalLiabilities.toFixed(2)}，【净资产】: ¥${netWorth.toFixed(2)}
【现有资产账户清单】: ${accountsSummary || '无'}
【本月收支(${currentMonthStr})】: 总收入 ¥${monthIncome.toFixed(2)}，总支出 ¥${monthExpense.toFixed(2)}，本月结余 ¥${(monthIncome - monthExpense).toFixed(2)}
【本月支出分类分布】: ${catSummary}
【最近5笔流水】: ${recentRecentTxs || '暂无'}
【现有心愿目标】: ${goals.map(g => `${g.name}(目标¥${g.target_amount}, 已存¥${g.current_amount})`).join('，') || '暂无'}

【工具动作执行规则（Tool Actions）- 必须严格按需触发，严禁误触】：
1. 📸 资产余额截图 / 开账调额指令：
   【仅当】用户上传了资产截图或明确要求修改余额时触发：
   - 若账户存在，action="update_balance"，payload={ account_id: "id", platform: "平台名", balance: 金额, note: "说明" }；
   - 若账户不存在，action="create_account"，payload={ name: "账户名", type: "wallet|bank|...", balance: 金额, currency: "CNY" }；
2. 📸 消费小票 / 账单凭证 / 文字记账指令：
   【仅当】用户上传了小票截图或明确说“记一笔/花了/买了...”时触发：
   - action="create_transaction"，payload={ amount: 金额, merchant: "商户", category: "分类", type: "expense|income", channel: "支付渠道", note: "备注" }；
3. 存钱/省钱计划立项指令：
   【仅当】用户明确要求“帮我立项/制定XX存钱计划/设立目标”时触发：
   - action="create_goal"，payload={ name: "目标名", target_amount: 金额, current_amount: 0, deadline: "YYYY-MM-DD", note: "规划" }；
4. 导出账本指令：
   【仅当】用户要求导出时触发：action="export_data"，payload={ format: "json" }；
5. 【重要】普通问答、打招呼、闲聊、询问模型身份、分析财务状态：
   action.type 必须为 "none"，payload 为空对象！绝对严禁凭空捏造任何 action！

【输出格式铁律】：
直接输出标准的 JSON 对象（禁止用任何 markdown 代码块包裹）：
{
  "reply": "你对用户的真实、准确、亲切的回复",
  "action": {
    "type": "create_transaction | update_balance | create_account | create_goal | export_data | none",
    "payload": { ... }
  }
}`;

  const isVisionModel = /4v|4\.6v|vl|vision|4o|gemini/i.test(config.model || '') || 
                        config.provider?.includes('vision') || 
                        config.provider === 'zhipu-4.6v';

  // Build user message content (Multimodal or OCR-enriched text)
  let userContent: any = userMessage || '请帮我分析处理这张截图';
  
  if (imageBase64) {
    if (isVisionModel) {
      userContent = [
        { type: 'text', text: userMessage ? `${userMessage}\n(请分析附带的图片)` : '请仔细识别分析这张图片。如果是钱包或银行余额截图，请提取资产总额并校准账户；如果是消费小票或账单凭证，请提取商户和金额并自动记账。' },
        {
          type: 'image_url',
          image_url: {
            url: imageBase64
          }
        }
      ];
    } else {
      // Text-only LLM fallback: Pre-process with OCR & Balance/Bill Parsers
      try {
        const { extractOcrRawText } = await import('./imageOcr');
        const { parseOfflineBalanceScreenshot } = await import('./balanceScreenshotParser');
        const rawOcr = await extractOcrRawText(imageBase64);
        const balRes = parseOfflineBalanceScreenshot(rawOcr);
        
        let ocrContext = `\n【附带截图 OCR 识别内容】:\n${rawOcr}\n`;
        if (balRes && balRes.balance > 0) {
          ocrContext += `【特征初判】: 资产余额截图，检测到平台: ${balRes.platform}, 识别余额: ¥${balRes.balance}\n`;
        }
        userContent = `${userMessage || '请帮我处理这张图片'}\n${ocrContext}`;
      } catch (e) {
        userContent = `${userMessage || '请帮我处理这张图片'}\n(图片上传已接收，请结合上下文解析)`;
      }
    }
  }

  // 2. Build Chat Messages History
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(m => ({
      role: m.role,
      content: m.content
    })),
    { role: 'user', content: userContent }
  ];

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: config.model || 'glm-4.6v',
      messages,
      temperature: 0.1,
      max_tokens: 700
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI 请求失败 (${res.status}): ${errText.substring(0, 100)}`);
  }

  const data = await res.json();
  const replyRaw = data?.choices?.[0]?.message?.content || '';
  const jsonMatch = replyRaw.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        reply: parsed.reply || replyRaw,
        action: parsed.action || { type: 'none' }
      };
    } catch (e) {
      // fallback
    }
  }

  return {
    reply: replyRaw || '抱歉，暂时未能解析出回复。',
    action: { type: 'none' }
  };
}
