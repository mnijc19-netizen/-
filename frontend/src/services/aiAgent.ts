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
import { localStore, getModelMaxTokens } from './localStore';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';
import { optimizeImagesBatch } from './imageOptimizer';

/**
 * Official Function Calling Tools Schema for Financial System Integration
 */
export const FINANCIAL_AGENT_TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description: '记录单笔真实收支流水、转账或还款',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: '扣款/收入实际金额（纯数字）' },
          merchant: { type: 'string', description: '具体商户名或消费对象（如 麦当劳、喜茶、中国电信）' },
          category: { type: 'string', description: '消费分类，如 餐饮美食、日用百货、交通出行、生活服务等' },
          type: { type: 'string', enum: ['expense', 'income', 'transfer', 'repayment'], description: '交易类型' },
          channel: { type: 'string', description: '支付渠道，如 微信支付、支付宝、招商银行、花呗' },
          date: { type: 'string', description: '日期时间 YYYY-MM-DD HH:mm，如未提及则留空' },
          note: { type: 'string', description: '简要备注' }
        },
        required: ['amount', 'merchant', 'category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'batch_create_transactions',
      description: '一句话或多图解析出多笔收支流水时，批量记录多笔交易',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: '多笔交易明细列表',
            items: {
              type: 'object',
              properties: {
                amount: { type: 'number', description: '交易金额' },
                merchant: { type: 'string', description: '商户名称' },
                category: { type: 'string', description: '分类' },
                type: { type: 'string', enum: ['expense', 'income', 'transfer', 'repayment'] },
                channel: { type: 'string', description: '支付渠道' },
                note: { type: 'string', description: '备注' }
              },
              required: ['amount', 'merchant', 'category']
            }
          }
        },
        required: ['items']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_account',
      description: '开立单项资产账户或负债账户（如 微信零钱、支付宝总资产、招商银行储蓄卡、京东白条、美团月付、蚂蚁花呗等）',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: '平台或银行名称，如 京东白条、美团月付、微信零钱、支付宝-总资产' },
          balance: { type: 'number', description: '核心金额、可用余额或待还金额' },
          account_type: { 
            type: 'string', 
            enum: ['wallet', 'bank', 'investment', 'baitiao', 'meituan_pay', 'huabei', 'jiebei', 'douyin_pay', 'fenfu', 'credit', 'loan', 'cash'],
            description: '账户类型代码'
          },
          currency: { type: 'string', description: '币种，默认 CNY' },
          bank_name: { type: 'string', description: '银行名称（如有）' },
          card_last4: { type: 'string', description: '银行卡号后4位（如有）' },
          note: { type: 'string', description: '开账备注' }
        },
        required: ['platform', 'balance', 'account_type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'batch_create_accounts',
      description: '从上传的 1 张或多张截图识别出的多个平台资产或信贷待还中，批量开立多个账户',
      parameters: {
        type: 'object',
        properties: {
          accounts: {
            type: 'array',
            description: '多个待开立的账户列表',
            items: {
              type: 'object',
              properties: {
                platform: { type: 'string', description: '平台名称，如 京东白条、美团月付、微信零钱、支付宝-总资产、华泰证券' },
                balance: { type: 'number', description: '核心金额或待还金额' },
                account_type: { 
                  type: 'string', 
                  enum: ['wallet', 'bank', 'investment', 'baitiao', 'meituan_pay', 'huabei', 'jiebei', 'douyin_pay', 'fenfu', 'credit', 'loan', 'cash'],
                  description: '类别代码'
                },
                bank_name: { type: 'string', description: '银行机构' },
                card_last4: { type: 'string', description: '卡号尾号' },
                note: { type: 'string', description: '识别说明' }
              },
              required: ['platform', 'balance', 'account_type']
            }
          }
        },
        required: ['accounts']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_balance',
      description: '对已有账户进行快速对账调额或校准余额',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: '账户名称或平台名称' },
          balance: { type: 'number', description: '最新校准后的总余额' },
          account_type: { type: 'string', description: '账户类型' }
        },
        required: ['platform', 'balance']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_investment',
      description: '录入证券持仓或基金投资（如 纳指ETF、沪深300、招商银行股票）',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '证券或基金名称' },
          code: { type: 'string', description: '代码，如 159941 或 510300' },
          shares: { type: 'number', description: '持仓份额/股数' },
          cost_price: { type: 'number', description: '成本价/买入均价' },
          account_name: { type: 'string', description: '所属券商或平台，如 华泰证券、天天基金' }
        },
        required: ['name', 'shares', 'cost_price']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_debt',
      description: '录入借贷或分期负债',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '负债名称，如 房贷、车贷、个人借款' },
          total_principal: { type: 'number', description: '借款总本金' },
          monthly_payment: { type: 'number', description: '每月月供金额' },
          type: { type: 'string', enum: ['mortgage', 'car_loan', 'personal_loan', 'credit_card_stage', 'other'], description: '负债类别' }
        },
        required: ['name', 'total_principal']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_budget',
      description: '设置或修改某个消费类别的月度预算',
      parameters: {
        type: 'object',
        properties: {
          category_name: { type: 'string', description: '类别名称，如 餐饮美食、日用百货、住房物业' },
          amount: { type: 'number', description: '预算额度金额（元）' }
        },
        required: ['category_name', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: '创建存钱心愿目标或储蓄计划',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '心愿目标名称，如 买新手机、年度旅游、应急储备金' },
          target_amount: { type: 'number', description: '目标总金额' },
          current_amount: { type: 'number', description: '初始已存金额，默认 0' }
        },
        required: ['name', 'target_amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_recurring_rule',
      description: '创建周期性固定收支规则（如 每月10号自动记房租2800、每月15号发工资）',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '规则名称，如 房租、宽带费、健身房月卡' },
          amount: { type: 'number', description: '每期固定金额' },
          type: { type: 'string', enum: ['expense', 'income'], description: '类型: expense(扣款支出) / income(收入)' },
          day_of_period: { type: 'number', description: '每月固定执行的日期 (1-31)' }
        },
        required: ['name', 'amount', 'type', 'day_of_period']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: '页面导航跳转',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'string', enum: ['dashboard', 'accounts', 'transactions', 'budgets', 'goals', 'analytics', 'investments', 'debts', 'settings'], description: '目标页面路由' }
        },
        required: ['page']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'export_data',
      description: '导出全量财务账本数据备份文件',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'refresh_investments',
      description: '刷新股票与基金实时行情行情市值',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

/**
 * Executes a conversation turn with the financial AI Copilot Agent with Native Function Calling & SSE Streaming
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
  onStreamChunk?: (streamedReply: string, streamedReasoning?: string) => void
): Promise<AgentResponse> {
  const config = localStore.getAiConfig();
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('请先在设置中配置并保存 API Key');
  }

  // Normalize images to string[] and compress them in parallel
  let rawImages: string[] = [];
  if (typeof imagesInput === 'string' && imagesInput.trim()) {
    rawImages.push(imagesInput);
  } else if (Array.isArray(imagesInput)) {
    rawImages.push(...imagesInput.filter(Boolean));
  }

  // Pre-optimize image payloads: 1800px crystal clear JPEG
  const imagesBase64 = rawImages.length > 0 ? await optimizeImagesBatch(rawImages) : [];

  // 1. Build live financial summary context (high-density factual state)
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

  const systemPrompt = `你是一个顶级专业、超高精度的 AI 财务全能视觉识别与账本操控管家（斌斌财务 AI）。
你拥有强大的工具函数库（Function Calling Tools）。当用户的意图涉及记账、开户、调额、预算、目标、负债、股票基金或页面跳转时，**请直接调用对应的工具函数**，并用亲切、专业、自然的中文向用户汇报结果。

【顶级真实场景视觉识别铁律】：
1. 🦘【美团月付 (meituan_pay)】：
   - 视觉特征：薄荷绿渐变顶部背景，标题为“X月账单”，“X月X日前待还(元)”，“分期还款/提前还款”，“0元下单 待收货/使用的订单未计入账单”，下方有生活服务/外卖订单消费记录。
   - 提取规则：平台名称填「美团月付」，金额提取待还总额（如 278.22），类别代码填【meituan_pay】（信贷负债）。
2. 🐕【京东白条 (baitiao)】：
   - 视觉特征：顶部标题“全部待还账单”，有“待还账单/历史账单”选项卡，“全部待还 (元)”，“含未来账单待还金额”，下方列出各月待还（如8月、9月、10月待还），底部有“提前结清”。
   - 提取规则：平台名称填「京东白条」，金额提取“全部待还 (元)”大字金额（如 2691.41），类别代码填【baitiao】（信贷负债）。
3. 🔵【支付宝 (wallet)】：
   - 视觉特征：顶部“总资产”，有“理财就问蚂小财”，蓝色大卡片“资产概览/我的资产 (元)”，下方包含“余额、余额宝、基金、进阶理财”。
   - 提取规则：平台名称填「支付宝-总资产」（或分别提取「余额宝」与「支付宝基金」），类别填【wallet】或【investment】。
4. 🟢【微信钱包 (wallet)】：
   - 视觉特征：黑色深色界面或经典界面，顶部标题“钱包”，列出“零钱 ¥XXX.XX”、“零钱通 ¥X.XX”、“银行卡”。
   - 提取规则：提取「微信零钱」（类别 wallet）和「微信零钱通」（类别 wallet）。
5. 🏦【银行卡列表 / 云闪付 / 手机银行多卡聚合 (bank)】：
   - 视觉特征：顶部标题“储蓄卡 (N)”，显示多张实体银行卡卡面，每行包含银行名称（如工商银行、中国银行、福建农信、建设银行、民生银行）、[尾号4位]以及对应余额。
   - 提取规则：【必须将每张储蓄卡独立拆分为一个账户】！例如：
     - 平台名「中国银行(4691)」: 金额 1477.68, 类别 bank
     - 平台名「工商银行(5569)」: 金额 31.42, 类别 bank
     - 平台名「建设银行(9539)」: 金额 6.65, 类别 bank
     - 平台名「福建农信(5824)」: 金额 3.41, 类别 bank
     - 平台名「民生银行(4091)」: 金额 0.00, 类别 bank
6. 🧾【消费小票/支付成功页/流水记录】：
   - 提取商户名、扣款金额、支付渠道（微信/支付宝/银行卡），调用 create_transaction 或 batch_create_transactions。

当前用户真实财务态势：
【资产】:¥${totalAssets.toFixed(2)}，【负债】:¥${totalLiabilities.toFixed(2)}，【净资产】:¥${netWorth.toFixed(2)}
【账户】: ${accountsSummary || '暂无'}
【投资】: ${investmentsSummary}
【负债】: ${debtsSummary}
【本月收支(${currentMonthStr})】: 收¥${monthIncome.toFixed(2)}，支¥${monthExpense.toFixed(2)}，结余¥${(monthIncome - monthExpense).toFixed(2)}
【本月分类支出】: ${catSummary}
【预算】: ${budgetsSummary}，【目标】: ${goalsSummary}，【周期规则】: ${recurringSummary}
【最近流水】: ${recentRecentTxs || '暂无'}`;

  const isVisionModel = /4v|4\.6v|vl|vision|4o|gemini/i.test(config.model || '') || 
                        config.model === 'glm-4.6v' || 
                        config.model === 'glm-4v-flash';

  // Build user message content
  let userContent: any = userMessage || '请帮我分析处理上传的图片';
  
  if (imagesBase64.length > 0) {
    if (isVisionModel) {
      const parts: any[] = [
        { 
          type: 'text', 
          text: userMessage 
            ? `${userMessage}\n(共上传了 ${imagesBase64.length} 张图片，请逐一识别分析每张图片中的平台、总资产/余额、月付欠款或消费明细，并调用对应开账或记账工具)` 
            : `请识别分析我上传的 ${imagesBase64.length} 张图片。提取平台名与金额并调用批量开账/对账工具；若是消费账单请调用记账工具。` 
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

  // 2. Format history (keep last 8 turns)
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

  // 3. Dispatch REST API call with Function Calling & Streaming Support
  let baseUrl = (config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const activeModel = config.model || 'glm-4.6v';
  const modelMaxTokens = getModelMaxTokens(activeModel);

  // Prepare Tools Array (including web_search for Zhipu models)
  const toolsList: any[] = [...FINANCIAL_AGENT_TOOLS];
  if (config.provider === 'zhipu' || config.provider.startsWith('zhipu')) {
    toolsList.push({
      type: 'web_search',
      web_search: {
        enable: true,
        search_result: true
      }
    });
  }

  const reqBody: any = {
    model: activeModel,
    messages: apiMessages,
    tools: toolsList,
    temperature: 0.1,
    max_tokens: modelMaxTokens,
    stream: true
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
    let rawAccumulatedContent = '';
    let rawAccumulatedReasoning = '';
    const accumulatedToolCalls: Record<number, { id: string; name: string; arguments: string }> = {};

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
            const deltaContent = deltaObj.content || '';
            const deltaReasoning = deltaObj.reasoning_content || '';
            const deltaToolCalls = deltaObj.tool_calls || [];

            // Handle live reasoning preview
            if (deltaReasoning) {
              rawAccumulatedReasoning += deltaReasoning;
              onStreamChunk?.(rawAccumulatedContent, rawAccumulatedReasoning);
            }

            // Handle live conversational content
            if (deltaContent) {
              rawAccumulatedContent += deltaContent;
              onStreamChunk?.(rawAccumulatedContent, rawAccumulatedReasoning);
            }

            // Aggregate streamed tool call parameters
            if (deltaToolCalls.length > 0) {
              for (const tc of deltaToolCalls) {
                const idx = tc.index ?? 0;
                if (!accumulatedToolCalls[idx]) {
                  accumulatedToolCalls[idx] = { id: tc.id || '', name: '', arguments: '' };
                }
                if (tc.id) accumulatedToolCalls[idx].id = tc.id;
                if (tc.function?.name) accumulatedToolCalls[idx].name += tc.function.name;
                if (tc.function?.arguments) accumulatedToolCalls[idx].arguments += tc.function.arguments;
              }
            }
          } catch {}
        }
      }
    } else {
      // Non-streaming fallback
      const data = await response.json();
      const msg = data.choices?.[0]?.message || {};
      rawAccumulatedContent = msg.content || '';
      rawAccumulatedReasoning = msg.reasoning_content || '';
      if (msg.tool_calls) {
        msg.tool_calls.forEach((tc: any, idx: number) => {
          accumulatedToolCalls[idx] = {
            id: tc.id || '',
            name: tc.function?.name || '',
            arguments: tc.function?.arguments || ''
          };
        });
      }
    }

    // Parse Tool Calls into structured Actions
    let action: any = { type: 'none' };
    const toolCallEntries = Object.values(accumulatedToolCalls);

    if (toolCallEntries.length > 0) {
      const primaryCall = toolCallEntries[0];
      try {
        const parsedArgs = JSON.parse(primaryCall.arguments);
        action = {
          type: primaryCall.name,
          payload: parsedArgs
        };
      } catch (parseErr) {
        console.warn('Failed to parse tool call arguments:', primaryCall.arguments);
      }
    }

    return {
      reply: rawAccumulatedContent.trim() || (action.type !== 'none' ? '已为您准备好操作卡片，请在下方确认入账：' : '已为您处理完成。'),
      reasoning: rawAccumulatedReasoning.trim() || undefined,
      action
    };
  } catch (err: any) {
    // If tools-based stream fetch fails, try fallback without stream
    const fallbackBody = { ...reqBody, stream: false, max_tokens: modelMaxTokens };
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
    const msg = data.choices?.[0]?.message || {};
    const content = (msg.content || '').trim();
    const reasoning = (msg.reasoning_content || '').trim();

    let action: any = { type: 'none' };
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const tc = msg.tool_calls[0];
      try {
        action = {
          type: tc.function?.name,
          payload: JSON.parse(tc.function?.arguments || '{}')
        };
      } catch {}
    }

    return {
      reply: content || (action.type !== 'none' ? '已为您识别并准备好操作卡片：' : '已处理完成。'),
      reasoning: reasoning || undefined,
      action
    };
  }
}
