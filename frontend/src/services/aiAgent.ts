import { api } from '../api/client';
import { localStore } from './localStore';
import { Account, Transaction, Category, Goal } from '../types';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionResult?: {
    type: 'transaction_created' | 'goal_created' | 'data_exported' | 'balance_updated' | 'analysis';
    data?: any;
  };
}

export interface AgentResponse {
  reply: string;
  action?: {
    type: 'create_transaction' | 'create_goal' | 'export_data' | 'update_balance' | 'none';
    payload?: any;
  };
}

/**
 * Executes a conversation turn with the financial AI Copilot Agent
 */
export async function sendAgentMessage(
  userMessage: string,
  history: AgentChatMessage[],
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  goals: Goal[]
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

  const accountsSummary = accounts.map(a => `${a.name}(${a.type}): ¥${a.balance.toFixed(2)}`).join('，');
  const catSummary = Object.entries(catExpenses).map(([c, amt]) => `${c}: ¥${amt.toFixed(2)}`).join('，') || '暂无';
  const recentRecentTxs = transactions.slice(0, 5).map(t => `${t.date} ${t.merchant} ${t.type === 'expense' ? '-' : '+'}¥${t.amount.toFixed(2)}(${t.category_name})`).join('；');

  const systemPrompt = `你是一个顶级专业、贴心且具备真实账本操作能力的 AI 财务管家与理财规划专家（斌斌财务 AI）。
当前用户的实时财务状态如下：
【时间】: ${getBeijingDateTimeString()}
【资产总额】: ¥${totalAssets.toFixed(2)}，【负债总额】: ¥${totalLiabilities.toFixed(2)}，【净资产】: ¥${netWorth.toFixed(2)}
【当前账户】: ${accountsSummary || '无'}
【本月收支(${currentMonthStr})】: 总收入 ¥${monthIncome.toFixed(2)}，总支出 ¥${monthExpense.toFixed(2)}，本月结余 ¥${(monthIncome - monthExpense).toFixed(2)}
【本月支出分类分布】: ${catSummary}
【最近5笔流水】: ${recentRecentTxs || '暂无'}
【现有心愿目标】: ${goals.map(g => `${g.name}(目标¥${g.target_amount}, 已存¥${g.current_amount})`).join('，') || '暂无'}

【你的操作能力（Tool Actions）】：
1. 记账指令：如果用户要求记账（如“今天中午在麦当劳吃了35微信付的”），输出 action="create_transaction"，payload 包含 { amount: 35.0, merchant: "麦当劳", category: "餐饮美食", type: "expense", channel: "微信支付", note: "午餐" }；
2. 存钱/省钱计划或立项指令：如果用户要求制定存钱计划或立项（如“想在6个月存2万块”），请给出详细专业的月度储蓄规划与开源节流建议，并输出 action="create_goal"，payload 包含 { name: "6个月存2万元", target_amount: 20000.0, current_amount: 0.0, deadline: "YYYY-MM-DD", note: "月均需存 ¥3,333.33" }；
3. 导出账本指令：如果用户要求导出账本（如“导出本周账本”或“导出数据”），输出 action="export_data"，payload 包含 { format: "json" }；
4. 咨询与问答：如果用户问“这个月吃饭花了多少”、“我最大的开销是什么”等，请根据上面提供的真实财务数据给出精准计算与深度分析点评，action="none"。

【输出格式铁律】：
你必须且仅能输出一个标准的 JSON 对象，格式如下（禁止用 markdown 代码块包裹，直接输出纯 JSON）：
{
  "reply": "你对用户的友好、专业、有温度的回复文本（包含数据统计、分析、省钱技巧或操作确认说明）",
  "action": {
    "type": "create_transaction | create_goal | export_data | none",
    "payload": { ... }
  }
}`;

  // 2. Build Chat Messages History
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8).map(m => ({
      role: m.role,
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ];

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages,
      temperature: 0.2,
      max_tokens: 600
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
