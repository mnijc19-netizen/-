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
 * Extracts a JSON object safely from an LLM markdown response
 */
function extractJsonFromResponse(raw: string): any | null {
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
  recurringRules: RecurringRule[] = [],
  investments: Investment[] = [],
  debts: Debt[] = []
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

  const liabilityTypes = ['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'];
  const totalAssets = accounts.filter(a => !liabilityTypes.includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter(a => liabilityTypes.includes(a.type)).reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  const accountsSummary = accounts.map(a => `${a.name}(id:${a.id}, 类别:${a.type}): ¥${a.balance.toFixed(2)}`).join('，');
  const catSummary = Object.entries(catExpenses).map(([c, amt]) => `${c}: ¥${amt.toFixed(2)}`).join('，') || '暂无';
  const recentRecentTxs = transactions.slice(0, 10).map(t => `[id:${t.id}] ${t.date} ${t.merchant} ${t.type === 'expense' ? '-' : '+'}¥${t.amount.toFixed(2)}(${t.category_name || '日常'})`).join('；');
  const budgetsSummary = budgets.map(b => `${b.category_name || '总预算'}: 限额¥${b.amount}, 已用¥${b.spent_amount || 0}(${b.spent_percentage || 0}%)`).join('，') || '暂无';
  const goalsSummary = goals.map(g => `${g.name}(目标¥${g.target_amount}, 已存¥${g.current_amount})`).join('，') || '暂无';
  const recurringSummary = recurringRules.map(r => `${r.name}(每月${r.day_of_period}号, ${r.type === 'expense' ? '扣' : '收'}¥${r.amount})`).join('，') || '暂无';
  const investmentsSummary = investments.map(i => `${i.name}(代码:${i.code}, 持仓:${i.shares}份, 市值:¥${i.market_value.toFixed(2)}, 盈亏:${i.pnl_rate.toFixed(1)}%)`).join('，') || '暂无';
  const debtsSummary = debts.map(d => `${d.name}(本金:¥${d.total_principal}, 待还:¥${d.remaining_principal}, 月供:¥${d.monthly_payment})`).join('，') || '暂无';

  const currentModelName = config.model || 'GLM-4.6V';
  const currentProviderName = config.provider === 'deepseek' ? 'DeepSeek' : config.provider?.includes('zhipu') ? '智谱 BigModel' : 'AI 大模型';

  const systemPrompt = `你是一个顶级专业、具备超高精度视觉识别与真实账本全权限操控能力的 AI 财务全能管家（斌斌财务 AI）。
【你的真实模型身份】: 你当前调用的底层模型是【${currentModelName}】（由 ${currentProviderName} 提供服务）。
当用户询问你是谁、你是什么模型等身份问题时，直接回答当前模型是【${currentModelName}】，且 action.type 必须为 "none"！

【平台与账户精准识别与类型映射规则（100% 精确铁律）】：
1. 🐕 京东白条 (JD Baitiao - 极为重要！): 包含“全部待还账单”、“全部待还 (元)”、“全部待还”、“提前结清”、“已出账”、“京东”、“白条”、“京东金融”等 ➔ 平台名必须判定为「京东白条」，类别为【baitiao】（消费信贷负债，金额提取全部待还总金额，如 2691.41），绝不能误判为花呗或余额！
2. 🌸 蚂蚁花呗 (Alipay Huabei)：包含“花呗”、“花呗分期”、“花呗账单”、“本月应还”、“下月待还”等 ➔ 平台名判定为「蚂蚁花呗」，类别为【huabei】（消费信贷负债，金额提取待还款金额）！
3. 💰 蚂蚁借呗 (Alipay Jiebei)：包含“借呗”、“网商贷”、“我的借款”、“待还本金”等 ➔ 平台名判定为「蚂蚁借呗」，类别为【jiebei】（借贷负债）！
4. 🦘 美团月付 (Meituan Pay)：包含“美团月付”、“月付额度”、“本月待还”、“下月待还”等 ➔ 平台名判定为「美团月付」，类别为【meituan_pay】（消费信贷负债）！
5. 🎵 抖音月付 (Douyin Pay)：包含“抖音月付”、“抖音支付”、“本月应还”、“待还本金”等 ➔ 平台名判定为「抖音月付」，类别为【douyin_pay】（消费信贷负债）！
6. 💬 微信分付 / 微粒贷 (WeChat Fenfu / Weilidai)：包含“微信分付”、“分付”、“已用额度”、“微粒贷” ➔ 平台名判定为「微信分付/微粒贷」，类别为【fenfu】！
7. 💳 银行信用卡：包含各银行“信用卡”、“本期应还”、“最低还款” ➔ 类别为【credit】！
8. 支付宝 (Alipay)：包含“总资产”、“我的资产”、“余额宝”、“理财资产” ➔ 平台名判定为「支付宝-总资产」或「支付宝/余额宝」，类别为【wallet】！
9. 微信支付 (WeChat)：包含“钱包”、“零钱”、“零钱通” ➔ 平台名判定为「微信零钱」或「微信支付」，类别为【wallet】！
10. 证券/基金/股票：包含“持仓”、“证券资产”、“ETF”、“纳指”、“标普”、“招商证券/华泰证券/东方财富/天天基金” ➔ 平台名判定为「华泰证券/基金持仓」，类别必须为【investment】！
11. 银行储蓄账户：按实际银行名识别，类别为【bank】！

当前用户的全景真实财务态势：
【资产总额】: ¥${totalAssets.toFixed(2)}，【负债】: ¥${totalLiabilities.toFixed(2)}，【真实净资产】: ¥${netWorth.toFixed(2)}
【账户清单】: ${accountsSummary || '暂无账户'}
【投资持仓】: ${investmentsSummary}
【负债信贷】: ${debtsSummary}
【本月收支(${currentMonthStr})】: 总收入 ¥${monthIncome.toFixed(2)}，总支出 ¥${monthExpense.toFixed(2)}，本月结余 ¥${(monthIncome - monthExpense).toFixed(2)}
【本月支出分类】: ${catSummary}
【月度预算状态】: ${budgetsSummary}
【现有心愿目标】: ${goalsSummary}
【现有周期自动记账】: ${recurringSummary}
【最近流水记录】: ${recentRecentTxs || '暂无'}

【用户意图与全功能工具动作库（Tool Actions）- 必须精准落地执行】：
1. 📸 账户开账 / 余额校准 / 月付欠款与负债入账：
   - 当用户上传微信、支付宝、银行卡、美团月付、抖音月付、花呗、白条、借呗、证券持仓等多张截图时：
     - 若同时初始化多个平台（多图上传/多平台开账）：
       - 输出 action="batch_update_balances" 或 action="batch_create_accounts"；
       - payload={ updates: [ 
           { platform: "微信零钱", balance: 1020.92, account_type: "wallet" },
           { platform: "支付宝-总资产", balance: 5000.00, account_type: "wallet" },
           { platform: "蚂蚁花呗", balance: 1240.50, account_type: "huabei" },
           { platform: "美团月付", balance: 289.40, account_type: "meituan_pay" },
           { platform: "京东白条", balance: 350.00, account_type: "baitiao" },
           { platform: "抖音月付", balance: 199.00, account_type: "douyin_pay" },
           { platform: "华泰证券/基金持仓", balance: 1966.65, account_type: "investment", holdings: [...] }
         ] }；
     - 若针对单一平台（如美团月付欠款289.40，或华泰证券持仓）：
       - 如果系统已有对应账户：输出 action="update_balance"，payload={ account_id: "匹配id", platform: "美团月付", balance: 289.40, account_type: "meituan_pay", note: "月付待还款" }；
       - 如果系统尚无对应账户：输出 action="create_account"，payload={ name: "美团月付", type: "meituan_pay", balance: 289.40, currency: "CNY", note: "由 AI 识别美团月付截图创建" }；
2. 📈 独立证券与基金持仓操作：
   - 增加持仓：action="create_investment"，payload={ name: "广发纳指100ETF", code: "159941", type: "fund|stock_a|stock_hk_us", shares: 800, cost_price: 1.586, account_name: "华泰证券" }；
   - 批量录入持仓：action="batch_create_investments"，payload={ items: [ { name, code, shares, cost_price, type, account_name }, ... ] }；
   - 刷新持仓市值/收益查询：action="refresh_investments"，payload={}；
   - 删除持仓：action="delete_investment"，payload={ keyword: "标的名称或代码" }；
3. 💳 负债与贷款规划：
   - 记录负债：action="create_debt"，payload={ name: "房贷/信用卡还款/借呗", total_principal: 100000, monthly_payment: 2000, interest_rate_annual: 3.5, type: "mortgage|credit_card|consumer_loan|huabei|baitiao|meituan_pay|douyin_pay|jiebei|fenfu", notes: "说明" }；
   - 删除负债：action="delete_debt"，payload={ keyword: "负债名" }；
4. 📸 记账与流水（消费/收入小票与自然语言）：
   - 单笔记账：action="create_transaction"，payload={ amount: 数字, merchant: "商户", category: "分类", type: "expense|income", channel: "微信支付|支付宝|花呗|京东白条|美团月付|银行卡|现金", note: "备注" }；
   - 多笔记账：action="batch_create_transactions"，payload={ items: [ { amount, merchant, category, type, channel, note }, ... ] }；
   - 撤销/删除记账：action="delete_transaction"，payload={ transaction_id: "若知道id则填", keyword: "商户名或金额" }；
5. 🔄 账户间转账调拨：
   - action="transfer_funds"，payload={ from_account: "银行卡", to_account: "微信零钱", amount: 2000, note: "资金调拨/还款" }；
6. 📊 月度预算设置与删除：
   - 设置预算：action="set_budget"，payload={ category_name: "餐饮美食", amount: 1500 }；
   - 删除预算：action="delete_budget"，payload={ category_name: "餐饮美食" }；
7. 🎯 存钱心愿目标：
   - 设立目标：action="create_goal"，payload={ name: "目标名", target_amount: 数字, current_amount: 0, deadline: "YYYY-MM-DD", note: "规划建议" }；
   - 存入心愿资金：action="deposit_goal"，payload={ goal_name: "目标名", amount: 1000 }；
   - 删除目标：action="delete_goal"，payload={ keyword: "目标名" }；
8. ⏰ 周期性固定收支规则：
   - action="create_recurring_rule"，payload={ name: "房租", amount: 2800, type: "expense", day_of_period: 10, frequency: "monthly", note: "每月固定支出" }；
   - 触发执行：action="execute_recurring"，payload={}；
9. 📸 资产快照归档：
   - action="create_snapshot"，payload={ note: "月末资产快照" }；
10. 🧭 页面导航：
    - action="navigate_to"，payload={ page: "accounts|transactions|budgets|goals|analytics|settings|investments|debts|dashboard" }；
11. 📂 导出账本：
    - action="export_data"，payload={ format: "json" }；
12. 🤝 追问与多轮确认指令（极为重要！）：
    - 当上一轮对话中助手提到了某个金额或建议创建账户，而用户本轮回复“好的”、“是的”、“确认”、“帮我弄好”、“执行”、“行”、“对”时：
      - 你必须立即从上下文提取具体的账户名称与金额，输出对应的真实 action，绝不能只说空话却输出 action.type: 'none'！
13. ❓ 纯问答与咨询：
    - 仅当用户是纯咨询、聊天或询问财务建议，且没有要求修改账本时，action.type 为 "none"。

【输出格式铁律】：
直接输出标准的 JSON 对象（禁止用任何 markdown 代码块包裹）：
{
  "reply": "你对用户的专业、亲切、准确的中文回复",
  "action": {
    "type": "create_account | batch_create_accounts | update_balance | batch_update_balances | create_investment | batch_create_investments | refresh_investments | delete_investment | create_debt | delete_debt | create_transaction | batch_create_transactions | delete_transaction | transfer_funds | set_budget | delete_budget | create_goal | deposit_goal | delete_goal | create_recurring_rule | execute_recurring | create_snapshot | navigate_to | export_data | none",
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
            ? `${userMessage}\n(共上传了 ${imagesBase64.length} 张图片，请逐一识别分析每张图片中的平台、总资产/余额、月付欠款或消费明细，并按指令输出账本动作)` 
            : `请识别分析我上传的 ${imagesBase64.length} 张图片。若是多平台余额/欠款截图（如微信、支付宝、花呗、借呗、美团月付、抖音月付、京东白条等），请分别提取平台名与金额并批量开账/对账；若是消费账单请提取商户与支出金额。` 
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
            ocrSection += `[系统预识别提示: 疑似平台 ${balRes.platform}，金额约 ¥${balRes.balance} (${balRes.accountType})]\n`;
          }
          imgIdx++;
        }
        userContent = `${userMessage || '分析处理以下截图账单信息'}\n${ocrSection}`;
      } catch (ocrErr) {
        userContent = `${userMessage || '分析处理截图账单'}\n[图片 OCR 解析受限]`;
      }
    }
  }

  // 2. Format history
  const apiMessages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  for (const h of history.slice(-12)) {
    apiMessages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content
    });
  }

  apiMessages.push({
    role: 'user',
    content: userContent
  });

  // 3. Dispatch REST API call
  let baseUrl = (config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const reqBody: any = {
    model: config.model || 'glm-4.6v',
    messages: apiMessages,
    temperature: 0.1 // Ultra-low temperature for 100% deterministic, razor-sharp JSON extraction
  };

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

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';

  // 4. Parse JSON action from response
  const parsed = extractJsonFromResponse(rawContent);

  if (parsed && typeof parsed.reply === 'string') {
    return {
      reply: parsed.reply,
      action: parsed.action || { type: 'none' }
    };
  }

  // Fallback if model returned plain prose
  return {
    reply: rawContent.trim(),
    action: { type: 'none' }
  };
}
