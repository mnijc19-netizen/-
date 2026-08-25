import { api } from '../api/client';
import { localStore } from './localStore';
import { Account, Transaction, Category, Goal, Budget, RecurringRule } from '../types';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  imageUrl?: string;
  imageUrls?: string[];
  actionResult?: {
    type: 
      | 'transaction_created' 
      | 'batch_transactions_created' 
      | 'transaction_deleted' 
      | 'goal_created' 
      | 'budget_set' 
      | 'recurring_rule_created' 
      | 'data_exported' 
      | 'balance_updated' 
      | 'batch_balances_updated'
      | 'account_created' 
      | 'batch_accounts_created'
      | 'investment_created'
      | 'navigated' 
      | 'analysis';
    data?: any;
  };
}

export interface AgentResponse {
  reply: string;
  action?: {
    type: 
      | 'create_transaction' 
      | 'batch_create_transactions' 
      | 'delete_transaction' 
      | 'update_balance' 
      | 'batch_update_balances'
      | 'create_account' 
      | 'batch_create_accounts'
      | 'create_investment'
      | 'set_budget' 
      | 'create_goal' 
      | 'create_recurring_rule' 
      | 'export_data' 
      | 'navigate_to' 
      | 'none';
    payload?: any;
  };
}

/**
 * Extracts and cleans JSON object from model reply
 */
function extractJsonFromText(raw: string): any | null {
  if (!raw) return null;
  // 1. Try markdown code block
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 2. Try outermost braces { ... }
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = raw.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

/**
 * Executes a conversation turn with the financial AI Copilot Agent (Full-Spectrum System Controller)
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
  recurringRules: RecurringRule[] = []
): Promise<AgentResponse> {
  const config = localStore.getAiConfig();
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('请先在【设置 -> AI 智能模型与大脑】中配置并启用 API Key');
  }

  // Normalize images to string[]
  const imagesBase64: string[] = [];
  if (typeof imagesInput === 'string' && imagesInput.trim()) {
    imagesBase64.push(imagesInput);
  } else if (Array.isArray(imagesInput)) {
    imagesBase64.push(...imagesInput.filter(Boolean));
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

  const accountsSummary = accounts.map(a => `${a.name}(id:${a.id}, 类别:${a.type}): ¥${a.balance.toFixed(2)}`).join('，');
  const catSummary = Object.entries(catExpenses).map(([c, amt]) => `${c}: ¥${amt.toFixed(2)}`).join('，') || '暂无';
  const recentRecentTxs = transactions.slice(0, 8).map(t => `[id:${t.id}] ${t.date} ${t.merchant} ${t.type === 'expense' ? '-' : '+'}¥${t.amount.toFixed(2)}(${t.category_name || '日常'})`).join('；');
  const budgetsSummary = budgets.map(b => `${b.category_name || '总预算'}: 限额¥${b.amount}, 已用¥${b.spent_amount || 0}(${b.spent_percentage || 0}%)`).join('，') || '暂无';
  const goalsSummary = goals.map(g => `${g.name}(目标¥${g.target_amount}, 已存¥${g.current_amount})`).join('，') || '暂无';
  const recurringSummary = recurringRules.map(r => `${r.name}(每月${r.day_of_period}号, ${r.type === 'expense' ? '扣' : '收'}¥${r.amount})`).join('，') || '暂无';

  const currentModelName = config.model || 'GLM-4.6V';
  const currentProviderName = config.provider === 'deepseek' ? 'DeepSeek' : config.provider?.includes('zhipu') ? '智谱 BigModel' : 'AI 大模型';

  const systemPrompt = `你是一个顶级专业、具备视觉识别与真实账本全权限操控能力的 AI 财务全能管家（斌斌财务 AI）。
【你的真实模型身份】: 你当前调用的底层模型是【${currentModelName}】（由 ${currentProviderName} 提供服务）。
当用户询问你是谁、你是什么模型等身份问题时，直接回答当前模型是【${currentModelName}】，且 action.type 必须为 "none"！

【平台与账户精准识别规则（铁律）】：
1. 支付宝 (Alipay)：包含“总资产”、“资产概览”、“我的资产”、“余额宝”、“理财资产”等，平台名称必须判定为「支付宝-总资产」或「支付宝/余额宝」，类别为 wallet！
2. 微信支付 (WeChat)：包含“钱包”、“零钱”、“零钱通”，平台名称必须判定为「微信零钱」或「微信支付」，类别为 wallet！
3. 证券/基金/股票 (Securities & Funds)：包含“持仓”、“委托”、“两融”、“总资产”、“可用/可取”、“ETF”、“纳指”、“标普”、“招商证券/华泰证券/东方财富/天天基金”等，平台名称判定为「华泰证券/基金持仓」(或按实际券商名)，类别必须为【investment】！
4. 银行账户：按实际银行名（如招商银行、中国工商银行、建设银行等）识别，类别为 bank！

当前用户的全景真实财务态势：
【资产总额】: ¥${totalAssets.toFixed(2)}，【负债】: ¥${totalLiabilities.toFixed(2)}，【净资产】: ¥${netWorth.toFixed(2)}
【账户清单】: ${accountsSummary || '暂无账户'}
【本月收支(${currentMonthStr})】: 总收入 ¥${monthIncome.toFixed(2)}，总支出 ¥${monthExpense.toFixed(2)}，本月结余 ¥${(monthIncome - monthExpense).toFixed(2)}
【本月支出分类】: ${catSummary}
【月度预算状态】: ${budgetsSummary}
【现有心愿目标】: ${goalsSummary}
【现有周期自动记账】: ${recurringSummary}
【最近流水记录】: ${recentRecentTxs || '暂无'}

【用户意图与工具动作库（Tool Actions）- 必须精准落地执行】：
1. 📸 账户开账 / 基金投资资产入账 / 余额校准：
   - 【当用户上传证券/基金/微信/支付宝/银行余额截图，或者明确说“帮我把这个金额存到资产里”、“分类为基金”、“帮我开账”、“更新余额”等指令时】：
     - 若针对单一平台（如华泰证券/基金、微信、支付宝等）：
       - 如果系统已有对应账户：输出 action="update_balance"，payload={ account_id: "匹配id", platform: "华泰证券/基金持仓", balance: 数字, account_type: "investment", note: "说明" }；
       - 如果系统尚无对应账户：输出 action="create_account"，payload={ name: "华泰证券/基金持仓" (或用户指定的账户名), type: "investment" (或wallet/bank), balance: 数字, currency: "CNY", note: "由 AI 识别并创建" }；
     - 若针对多张截图或同时初始化多个平台（多图上传/多平台开账）：
       - 输出 action="batch_update_balances" 或 action="batch_create_accounts"；
       - payload={ updates: [ { platform: "微信零钱", balance: 1020.92, account_type: "wallet" }, { platform: "华泰证券/基金持仓", balance: 1966.65, account_type: "investment" }, ... ] }；
2. 🤝 追问与多轮确认指令（极为重要！）：
   - 当上一轮对话中助手提到了某个金额或建议创建账户，而用户本轮回复“好的”、“是的”、“确认”、“帮我弄好”、“执行”、“行”、“对”时：
     - **你必须立即从上下文提取具体的账户名称与金额，输出对应的 create_account / update_balance / create_transaction 动作，绝不能只说空话却输出 action.type: 'none'！**
3. ❓ 仅问答与咨询（严禁误改账本）：
   - 仅当用户是纯疑问句（如：“这是哪个平台”、“这是什么”、“这是多少钱”、“帮我看看”、“余额是多少”等），且没有要求入账/开账/修改时，action.type 必须为 "none"！
4. 📸 记账指令（消费/收入小票与自然语言）：
   - 单笔记账：action="create_transaction"，payload={ amount: 数字, merchant: "商户", category: "分类", type: "expense|income", channel: "微信支付|支付宝|银行卡|现金", note: "备注" }；
   - 多笔记账：action="batch_create_transactions"，payload={ items: [ { amount, merchant, category, type, channel, note }, ... ] }；
5. 🗑️ 撤销与删除记账：
   - action="delete_transaction"，payload={ transaction_id: "若知道id则填", keyword: "商户名或金额" }；
6. 📊 月度预算设置：
   - action="set_budget"，payload={ category_name: "餐饮美食", amount: 1500 }；
7. 🎯 存钱目标与立项：
   - action="create_goal"，payload={ name: "目标名", target_amount: 数字, current_amount: 0, deadline: "YYYY-MM-DD", note: "规划建议" }；
8. ⏰ 周期性固定收支规则：
   - action="create_recurring_rule"，payload={ name: "房租", amount: 2800, type: "expense", day_of_period: 10, frequency: "monthly", note: "每月固定支出" }；
9. 🧭 页面导航：
   - action="navigate_to"，payload={ page: "accounts|transactions|budgets|goals|analytics|settings|dashboard" }；
10. 📂 导出账本：
   - action="export_data"，payload={ format: "json" }；

【输出格式铁律】：
直接输出标准的 JSON 对象（禁止用任何 markdown 代码块包裹）：
{
  "reply": "你对用户的专业、亲切、准确的中文回复",
  "action": {
    "type": "create_account | batch_create_accounts | update_balance | batch_update_balances | create_transaction | batch_create_transactions | delete_transaction | set_budget | create_goal | create_recurring_rule | navigate_to | export_data | none",
    "payload": { ... }
  }
}`;

  const isVisionModel = /4v|4\.6v|vl|vision|4o|gemini/i.test(config.model || '') || 
                        config.provider?.includes('vision') || 
                        config.provider === 'zhipu-4.6v';

  // Build user message content (Multimodal or OCR-enriched text)
  let userContent: any = userMessage || '请帮我分析处理上传的图片';
  
  if (imagesBase64.length > 0) {
    if (isVisionModel) {
      const parts: any[] = [
        { 
          type: 'text', 
          text: userMessage 
            ? `${userMessage}\n(共上传了 ${imagesBase64.length} 张图片，请逐一识别分析每张图片中的平台、总资产/余额或消费明细，并按指令输出账本动作)` 
            : `请识别分析我上传的 ${imagesBase64.length} 张图片。若是多平台余额截图请分别提取平台名与金额并批量开账/对账；若是消费账单请提取商户与支出金额。` 
        }
      ];

      for (const img of imagesBase64) {
        parts.push({
          type: 'image_url',
          image_url: {
            url: img
          }
        });
      }
      userContent = parts;
    } else {
      // Text-only LLM fallback: Pre-process all images with OCR in parallel
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
            ocrSection += `【系统指纹判定】: 平台=【${balRes.platform}】，检测到总资产/余额: ¥${balRes.balance} (${balRes.note || ''})\n`;
          }
          imgIdx++;
        }

        userContent = `${userMessage || '请帮我分析这些截图'}\n${ocrSection}`;
      } catch (e) {
        userContent = `${userMessage || '请帮我处理上传的图片'}\n(已接收 ${imagesBase64.length} 张图片，请结合上下文解析)`;
      }
    }
  }

  // 2. Build Chat Messages History
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8).map(m => ({
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
      max_tokens: 1200
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI 请求失败 (${res.status}): ${errText.substring(0, 100)}`);
  }

  const data = await res.json();
  const replyRaw = data?.choices?.[0]?.message?.content || '';
  const parsed = extractJsonFromText(replyRaw);

  if (parsed && typeof parsed === 'object') {
    return {
      reply: parsed.reply || replyRaw,
      action: parsed.action || { type: 'none' }
    };
  }

  // Smart Heuristic Fallback for follow-ups (e.g. user said "帮我把这个金额存到资产里，分类为基金" or "好的")
  const trimmedUserMsg = (userMessage || '').trim();
  const isAffirmative = /^(好的|是的|确认|行|对|帮我弄好|可以|同意|好|ok|OK|好的呀)$/.test(trimmedUserMsg);
  const wantsFundDeposit = /存到资产|分类为基金|记录为基金|存入基金|创建基金|加到资产/.test(trimmedUserMsg);

  if (wantsFundDeposit || isAffirmative) {
    // Look back in history or raw reply for detected balance numbers
    const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant');
    const combinedText = `${replyRaw} ${lastAssistantMsg?.content || ''}`;
    const amountMatch = combinedText.match(/(?:¥|￥|金额为|总资产|余额为|金额[：:])\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
    
    if (amountMatch) {
      const parsedAmt = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (parsedAmt > 0) {
        const isFund = /基金|证券|华泰|股票|ETF/.test(combinedText) || wantsFundDeposit;
        return {
          reply: replyRaw || (isFund 
            ? `已成功为您创建【华泰证券/基金持仓】资产账户，初始金额 ¥${parsedAmt.toFixed(2)} 已录入！`
            : `已成功为您记录该笔资产余额 ¥${parsedAmt.toFixed(2)}！`),
          action: {
            type: 'create_account',
            payload: {
              name: isFund ? '华泰证券/基金持仓' : '新增资产账户',
              type: isFund ? 'investment' : 'wallet',
              balance: parsedAmt,
              currency: 'CNY',
              note: '由 AI 智能管家根据截图与指令自动创建'
            }
          }
        };
      }
    }
  }

  return {
    reply: replyRaw || '抱歉，暂时未能解析出回复。',
    action: { type: 'none' }
  };
}
