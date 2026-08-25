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

  const systemPrompt = `你是一个顶级专业、具备视觉识别与真实账本操控能力的 AI 财务全能管家（斌斌财务 AI）。
【你的真实模型身份】: 你当前调用的底层模型是【${currentModelName}】（由 ${currentProviderName} 提供服务）。
当用户询问你是谁、你是什么模型等身份问题时，直接回答当前模型是【${currentModelName}】，且 action.type 必须为 "none"！

【平台与账户精准识别规则（铁律）】：
1. 支付宝 (Alipay)：只要包含“总资产”、“资产概览”、“我的资产”、“余额宝”、“理财资产”、“进阶理财”等，**平台名称 100% 必须判定为「支付宝-总资产」或「支付宝/余额宝」**，绝不能判定为“理财平台”或乱匹配成银行卡！
2. 微信支付 (WeChat)：只要包含“钱包”、“零钱”、“零钱通”、“支付分”，**平台名称 100% 必须判定为「微信零钱」或「微信支付」**！
3. 银行与券商：按实际银行名（如招商银行、工商银行、华泰证券等）识别。

当前用户的真实账本账户清单：
${accountsSummary || '暂无账户'}
【本月收支(${currentMonthStr})】: 总收入 ¥${monthIncome.toFixed(2)}，总支出 ¥${monthExpense.toFixed(2)}，净资产 ¥${netWorth.toFixed(2)}
【最近流水】: ${recentRecentTxs || '暂无'}

【用户意图与动作执行规则（Tool Actions）- 严禁误执行】：
1. ❓【问答与咨询优先（核心规则）】：
   - 如果用户只是在发问（如：“这是哪个平台”、“这是什么”、“这是多少钱”、“帮我看看”、“余额是多少”等疑问句），**绝对严禁直接修改账本数据！严禁执行 update_balance！此时 action.type 必须恒为 "none"！** 请在 reply 中清晰、准确、专业地解答用户的疑问（说明是支付宝总资产还是微信零钱，以及各项金额明细）。
2. 📸 余额校准 / 开账指令：
   - 【仅当】用户明确下达指令（如“帮我更新余额”、“把支付宝改成这个钱”、“开账”）或发送余额截图且希望同步时：
     - 若账本中已有对应账户（如支付宝/余额宝），输出 action="update_balance"，payload={ account_id: "匹配到的id", platform: "支付宝-总资产", balance: 数字, note: "说明" }；
     - 若无对应账户，输出 action="create_account"，payload={ name: "支付宝-总资产", type: "wallet", balance: 数字, currency: "CNY" }；
3. 📸 消费小票 / 记账指令：
   - 【仅当】用户要求记账或上传了消费付款小票时：
     - 输出 action="create_transaction"，payload={ amount: 数字, merchant: "商户", category: "分类", type: "expense", channel: "支付方式", note: "备注" }；
4. 存钱目标与立项：
   - 【仅当】用户明确要求“帮我立项/制定XX存钱计划”时：
     - 输出 action="create_goal"，payload={ name: "目标名", target_amount: 数字, current_amount: 0, deadline: "YYYY-MM-DD", note: "规划" }；
5. 导出账本：
   - 【仅当】用户要求导出时：action="export_data"，payload={ format: "json" }；

【输出格式铁律】：
直接输出标准的 JSON 对象（禁止用任何 markdown 代码块包裹）：
{
  "reply": "你对用户的专业、亲切、准确的中文回复",
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
        { 
          type: 'text', 
          text: userMessage 
            ? `${userMessage}\n(请仔细观察这张图片，并根据用户的问题准确回答。若用户只是询问这是哪个平台或多少钱，请详细回答，不要擅自修改账本)` 
            : '请识别分析这张图片。若是余额截图请提取平台与金额；若是消费账单请提取商户与支出金额。' 
        },
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
          ocrContext += `【系统特征指纹分析结果】: 该截图 100% 为【${balRes.platform}】，检测到总资产/余额: ¥${balRes.balance} (${balRes.note || ''})\n`;
        }
        userContent = `${userMessage || '请帮我分析这张图片'}\n${ocrContext}`;
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
