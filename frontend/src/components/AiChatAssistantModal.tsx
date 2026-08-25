import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Download, 
  Target, 
  Receipt, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Coins, 
  Lightbulb,
  MessageSquare,
  Key,
  Camera,
  Image as ImageIcon,
  Check,
  WalletCards,
  Calendar,
  PieChart,
  Undo2,
  ArrowRight,
  ExternalLink,
  Plus,
  Layers,
  ArrowUpRight,
  Edit3,
  CheckCheck,
  ChevronDown,
  CreditCard,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Account, Transaction, Category, Goal, Budget, RecurringRule, Investment, Debt, AgentChatMessage, AccountType } from '../types';
import { api } from '../api/client';
import { localStore, AiConfig } from '../services/localStore';
import { sendAgentMessage, cleanRepetitiveText } from '../services/aiAgent';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';
import { refreshInvestmentQuotes } from '../services/marketData';
import { optimizeImagesBatch } from '../services/imageOptimizer';
import { BrandLogo, detectBrandType } from './BrandLogo';
import { AI_PROVIDERS } from '../services/aiParser';

interface AiChatAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  budgets?: Budget[];
  investments?: Investment[];
  debts?: Debt[];
  onRefresh: () => void;
  onOpenSettings?: () => void;
  onNavigate?: (page: string) => void;
}

const DEFAULT_WELCOME_MESSAGE: AgentChatMessage = {
  id: 'welcome-1',
  role: 'assistant',
  content: `您好！我是您的 **斌斌 AI 财务智能全能管家**。我已接入您的实时账本系统，具备高精度的看图开账、美团/抖音月付/白条/花呗负债识别、证券持仓联动与预算管控能力！

💡 **新特性已上线：AI 识别后支持人工确认与修改**：
• 📸 **发多平台余额或月付截图**：发图后先为您呈现**可编辑的确认卡片**，核对金额与平台无误后，点击【确认录入】再入库；
• 🐕 **精准支持现代消费信贷**：京东白条、美团月付、抖音月付、花呗、借呗、微信分付自动归入负债并在净资产中精确扣减；
• ⚡ **端侧毫秒级压缩**：图片传输提速 10~20 倍，极速秒级响应！`,
  timestamp: getBeijingDateTimeString()
};

export const AiChatAssistantModal: React.FC<AiChatAssistantModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  transactions,
  goals,
  budgets = [],
  investments = [],
  debts = [],
  onRefresh,
  onOpenSettings,
  onNavigate
}) => {
  const [messages, setMessages] = useState<AgentChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => localStore.getAiConfig());
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(() => localStore.getAiConfig().provider || 'zhipu');
  const [modelSwitchToast, setModelSwitchToast] = useState<string>('');
  const [collapsedReasonings, setCollapsedReasonings] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleReasoningCollapse = (msgId: string) => {
    setCollapsedReasonings(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  useEffect(() => {
    if (isOpen) {
      const cfg = localStore.getAiConfig();
      setAiConfig(cfg);
      setSelectedProviderId(cfg.provider || 'zhipu');
      api.getRecurringRules().then(setRecurringRules).catch(() => {});
    }
  }, [isOpen]);

  const handleSelectModel = (providerId: string, modelId: string) => {
    const prov = AI_PROVIDERS.find(p => p.id === providerId);
    if (!prov) return;
    const currentKey = aiConfig.providerKeys?.[providerId] || (providerId === aiConfig.provider ? aiConfig.apiKey : '');
    const updated: AiConfig = {
      ...aiConfig,
      provider: providerId,
      model: modelId,
      baseUrl: prov.baseUrl || aiConfig.baseUrl,
      apiKey: currentKey
    };
    setAiConfig(updated);
    localStore.saveAiConfig(updated);
    setModelSelectorOpen(false);
    
    const modelObj = prov.models.find(m => m.id === modelId);
    const toast = `已切换为 ${prov.name} · ${modelObj?.name || modelId}`;
    setModelSwitchToast(toast);
    setTimeout(() => setModelSwitchToast(''), 2500);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleImageFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const compressed = await optimizeImagesBatch(files);
    setSelectedImages(prev => [...prev, ...compressed.filter(Boolean)]);
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Execute a staged pending action when user confirms
  const handleCommitPendingAction = async (msgId: string) => {
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const msg = messages[msgIndex];
    if (!msg.pendingAction || msg.pendingAction.status !== 'staged') return;

    const act = msg.pendingAction;
    let actionResult: any = undefined;

    try {
      // 1. Single Account / Liability / Fund Creation or Update
      if (act.type === 'create_account' || act.type === 'update_balance') {
        const payload = act.payload;
        const accName = payload.name || payload.platform || '新增账户';
        const accType = payload.type || payload.account_type || 'wallet';
        const bal = parseFloat(payload.balance) || 0;
        const isLiability = ['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'].includes(accType);

        let targetAcc = accounts.find(a => 
          (payload.account_id && a.id === payload.account_id) ||
          a.name.toLowerCase() === accName.toLowerCase()
        );

        if (targetAcc) {
          const diff = bal - targetAcc.balance;
          await api.updateAccount(targetAcc.id, {
            ...targetAcc,
            name: accName,
            type: accType,
            balance: bal
          });
          if (Math.abs(diff) > 0.01) {
            await api.createTransaction({
              type: isLiability ? 'repayment' : (diff > 0 ? 'income' : 'expense'),
              amount: Math.abs(diff),
              account_id: targetAcc.id,
              category_name: '余额校准',
              date: getBeijingDateTimeString(),
              merchant: `${accName}账单/余额校准`,
              note: `根据确认信息校准 (原: ¥${targetAcc.balance.toFixed(2)} -> 现: ¥${bal.toFixed(2)})`,
              source: 'ai_copilot'
            });
          }
          actionResult = {
            type: 'balance_updated',
            data: { id: targetAcc.id, platform: accName, type: accType, balance: bal }
          };
        } else {
          const createdAcc = await api.createAccount({
            name: accName,
            type: accType as any,
            balance: bal,
            currency: payload.currency || 'CNY',
            note: payload.note || `由 AI 识别并确认录入 (${isLiability ? '消费信贷负债' : '资产'})`
          });

          if (bal > 0) {
            await api.createTransaction({
              type: isLiability ? 'expense' : 'income',
              amount: bal,
              account_id: createdAcc.id,
              category_name: '余额校准',
              date: getBeijingDateTimeString(),
              merchant: `${accName}初始开账`,
              note: `初始录入 ¥${bal.toFixed(2)}`,
              source: 'ai_copilot'
            });
          }

          // If holdings are present, create investment records
          if (accType === 'investment' && payload.holdings && Array.isArray(payload.holdings)) {
            for (const h of payload.holdings) {
              const mVal = parseFloat(h.market_value) || 0;
              const shares = parseFloat(h.shares) || (mVal > 0 ? Math.round(mVal) : 1000);
              const price = parseFloat(h.current_price) || (mVal > 0 && shares > 0 ? mVal / shares : 1.0);
              await api.addInvestment({
                account_id: createdAcc.id,
                name: h.name || '基金持仓',
                code: h.code || '000000',
                type: h.type || 'fund',
                shares,
                cost_price: price,
                current_price: price,
                currency: 'CNY'
              });
            }
          }

          actionResult = {
            type: 'account_created',
            data: {
              id: createdAcc.id,
              name: accName,
              type: accType,
              balance: bal,
              isLiability
            }
          };
        }
      }
      // 2. Batch Accounts / Balances
      else if (act.type === 'batch_create_accounts' || act.type === 'batch_update_balances') {
        const list = act.payload.accounts || act.payload.updates || [];
        const processedList: any[] = [];

        for (const item of list) {
          const platName = item.platform || item.name || '新增账户';
          const bal = parseFloat(item.balance) || 0;
          const itemType = item.account_type || item.type || 'wallet';
          const isLiability = ['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'].includes(itemType);

          const matched = accounts.find(a => 
            a.name.toLowerCase() === platName.toLowerCase() || 
            (platName.includes('白条') && a.name.includes('白条')) ||
            (platName.includes('花呗') && a.name.includes('花呗')) ||
            (platName.includes('美团') && a.name.includes('美团')) ||
            (platName.includes('抖音') && a.name.includes('抖音'))
          );

          if (matched) {
            await api.updateAccount(matched.id, { ...matched, name: platName, type: itemType, balance: bal });
            processedList.push({ name: platName, balance: bal, type: itemType, isUpdated: true });
          } else {
            const newAcc = await api.createAccount({
              name: platName,
              type: itemType as any,
              balance: bal,
              currency: 'CNY',
              note: '由 AI 批量开账确认创建'
            });
            if (bal > 0) {
              await api.createTransaction({
                type: isLiability ? 'expense' : 'income',
                amount: bal,
                account_id: newAcc.id,
                category_name: '余额校准',
                date: getBeijingDateTimeString(),
                merchant: `${platName}初始建账`,
                note: `录入初始金额 ¥${bal.toFixed(2)}`,
                source: 'ai_copilot'
              });
            }
            processedList.push({ id: newAcc.id, name: platName, balance: bal, type: itemType, isCreated: true });
          }
        }

        actionResult = {
          type: 'batch_balances_updated',
          data: { count: processedList.length, items: processedList }
        };
      }
      // 3. Single Transaction
      else if (act.type === 'create_transaction') {
        const p = act.payload;
        const catObj = categories.find(c => c.name === p.category) || categories[0];
        const acc = accounts.find(a => a.id === p.account_id || (p.channel && a.name.includes(p.channel))) || accounts[0];
        const amt = Math.abs(parseFloat(p.amount) || 0);

        const created = await api.createTransaction({
          type: p.type || 'expense',
          amount: amt,
          account_id: acc?.id || 'acc-1',
          category_id: catObj?.id,
          category_name: p.category || catObj?.name || '日常消费',
          date: getBeijingDateTimeString(),
          merchant: p.merchant || 'AI 记账',
          note: p.note || '由 AI 确认记账',
          source: 'ai_copilot'
        });

        actionResult = {
          type: 'transaction_created',
          data: { ...p, createdTxId: created.id }
        };
      }
      // 4. Batch Transactions
      else if (act.type === 'batch_create_transactions') {
        const items = act.payload.items || [];
        const createdItems = [];
        for (const item of items) {
          const amt = Math.abs(parseFloat(item.amount) || 0);
          if (amt > 0) {
            const catObj = categories.find(c => c.name === item.category) || categories[0];
            const acc = accounts.find(a => (item.channel && a.name.includes(item.channel))) || accounts[0];
            await api.createTransaction({
              type: item.type || 'expense',
              amount: amt,
              account_id: acc?.id || 'acc-1',
              category_id: catObj?.id,
              category_name: item.category || '日常消费',
              date: getBeijingDateTimeString(),
              merchant: item.merchant || 'AI 记账',
              note: item.note || '由 AI 批量记账',
              source: 'ai_copilot'
            });
            createdItems.push(item);
          }
        }
        actionResult = {
          type: 'batch_transactions_created',
          data: { items: createdItems, count: createdItems.length }
        };
      }
      // 5. Investments & Broker Portfolio
      else if (act.type === 'create_investment' || act.type === 'batch_create_investments') {
        const brokerName = act.payload.broker_name || act.payload.account_name || '华泰证券';
        const totalAssets = parseFloat(act.payload.total_assets) || 0;
        const availableCash = parseFloat(act.payload.available_cash) || 0;
        const items = act.type === 'batch_create_investments' ? (act.payload.items || []) : [act.payload];

        // 1. Find or create the broker account
        let brokerAcc = accounts.find(a => 
          a.name.toLowerCase() === brokerName.toLowerCase() || 
          (brokerName.includes('华泰') && a.name.includes('华泰')) ||
          (brokerName.includes('证券') && a.name.includes('证券')) ||
          a.type === 'investment'
        );

        const totalMarketValue = items.reduce((sum: number, it: any) => sum + (parseFloat(it.market_value) || ((parseFloat(it.shares) || 0) * (parseFloat(it.current_price || it.cost_price) || 0))), 0);
        const finalBrokerBalance = totalAssets > 0 ? totalAssets : (totalMarketValue + availableCash);

        if (!brokerAcc) {
          brokerAcc = await api.createAccount({
            name: brokerName,
            type: 'investment',
            balance: finalBrokerBalance,
            currency: 'CNY',
            note: '由 AI 识别证券持仓自动建账'
          });
        } else {
          await api.updateAccount(brokerAcc.id, {
            ...brokerAcc,
            name: brokerName,
            balance: finalBrokerBalance
          });
        }

        // 2. Add each investment holding linked to this broker account
        const createdInvestments = [];
        for (const it of items) {
          const shares = parseFloat(it.shares) || 100;
          const cost = parseFloat(it.cost_price) || 1.0;
          const currentPrice = parseFloat(it.current_price) || cost;
          
          const newInv = await api.addInvestment({
            account_id: brokerAcc.id,
            name: it.name || '证券投资标的',
            code: it.code || '159941',
            type: it.type || (it.name?.includes('ETF') || it.name?.includes('基金') ? 'fund' : 'stock'),
            shares,
            cost_price: cost,
            current_price: currentPrice,
            currency: 'CNY'
          });
          createdInvestments.push(newInv);
        }

        // 3. Immediately refresh live market quotes
        try {
          await refreshInvestmentQuotes(createdInvestments);
        } catch {}

        actionResult = {
          type: 'investments_created',
          data: {
            brokerName,
            totalAssets: finalBrokerBalance,
            count: createdInvestments.length,
            items: createdInvestments
          }
        };
      }
      // 6. Debt
      else if (act.type === 'create_debt') {
        const p = act.payload;
        const createdDebt = await api.addDebt({
          name: p.name || '消费信贷负债',
          type: p.type || 'baitiao',
          total_principal: parseFloat(p.total_principal) || 1000,
          remaining_principal: parseFloat(p.remaining_principal) || parseFloat(p.total_principal) || 1000,
          interest_rate_annual: parseFloat(p.interest_rate_annual) || 0,
          monthly_payment: parseFloat(p.monthly_payment) || 0,
          start_date: getBeijingDateString(),
          end_date: '2026-12-31',
          account_id: accounts[0]?.id || 'acc-1',
          notes: p.notes || '由 AI 规划录入'
        });
        actionResult = {
          type: 'debt_created',
          data: createdDebt
        };
      }
      // 7. Budget
      else if (act.type === 'set_budget') {
        const p = act.payload;
        const targetCategory = categories.find(c => c.name.includes(p.category_name) || p.category_name.includes(c.name)) || categories[0];
        const createdBudget = await api.setBudget({
          category_id: targetCategory?.id || undefined,
          amount: parseFloat(p.amount) || 2000,
          period: 'monthly'
        });
        actionResult = {
          type: 'budget_set',
          data: createdBudget
        };
      }
      // 8. Goal
      else if (act.type === 'create_goal') {
        const p = act.payload;
        const createdGoal = await api.addGoal({
          name: p.name || '储蓄心愿目标',
          target_amount: parseFloat(p.target_amount) || 10000,
          current_amount: parseFloat(p.current_amount) || 0,
          target_date: p.target_date || '2026-12-31',
          color: 'indigo'
        });
        actionResult = {
          type: 'goal_created',
          data: createdGoal
        };
      }
      // 9. Recurring Rule
      else if (act.type === 'create_recurring_rule') {
        const p = act.payload;
        const createdRule = await api.addRecurringRule({
          name: p.name || '周期性账目',
          amount: parseFloat(p.amount) || 100,
          type: p.type || 'expense',
          category_id: categories[0]?.id || 'cat-1',
          account_id: accounts[0]?.id || 'acc-1',
          frequency: 'monthly',
          day_of_period: parseInt(p.day_of_period) || 10,
          is_active: 1
        });
        actionResult = {
          type: 'recurring_rule_created',
          data: createdRule
        };
      }

      // Update message state to committed
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            pendingAction: { ...m.pendingAction!, status: 'committed' },
            actionResult
          };
        }
        return m;
      }));

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      onRefresh();
    } catch (e: any) {
      alert(`录入失败: ${e.message}`);
    }
  };

  // Cancel staged action
  const handleCancelPendingAction = (msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          pendingAction: { ...m.pendingAction!, status: 'cancelled' }
        };
      }
      return m;
    }));
  };

  // Update pending action payload field live
  const handleUpdatePendingField = (msgId: string, field: string, value: any) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.pendingAction) {
        return {
          ...m,
          pendingAction: {
            ...m.pendingAction,
            payload: {
              ...m.pendingAction.payload,
              [field]: value
            }
          }
        };
      }
      return m;
    }));
  };

  // Update a specific item inside batch accounts/updates
  const handleUpdateBatchItemField = (msgId: string, itemIdx: number, field: string, value: any) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.pendingAction) {
        const listKey = m.pendingAction.payload.updates ? 'updates' : 'accounts';
        const currentList = [...(m.pendingAction.payload[listKey] || [])];
        if (currentList[itemIdx]) {
          currentList[itemIdx] = {
            ...currentList[itemIdx],
            [field]: value,
            ...(field === 'platform' ? { name: value } : {}),
            ...(field === 'name' ? { platform: value } : {}),
            ...(field === 'account_type' ? { type: value } : {}),
            ...(field === 'type' ? { account_type: value } : {})
          };
        }
        return {
          ...m,
          pendingAction: {
            ...m.pendingAction,
            payload: {
              ...m.pendingAction.payload,
              [listKey]: currentList
            }
          }
        };
      }
      return m;
    }));
  };

  // Remove an item from the batch staging list
  const handleRemoveBatchItem = (msgId: string, itemIdx: number) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.pendingAction) {
        const listKey = m.pendingAction.payload.updates ? 'updates' : 'accounts';
        const currentList = [...(m.pendingAction.payload[listKey] || [])].filter((_, idx) => idx !== itemIdx);
        return {
          ...m,
          pendingAction: {
            ...m.pendingAction,
            payload: {
              ...m.pendingAction.payload,
              [listKey]: currentList
            }
          }
        };
      }
      return m;
    }));
  };

  // Add an item to the batch staging list
  const handleAddBatchItem = (msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.pendingAction) {
        const listKey = m.pendingAction.payload.updates ? 'updates' : 'accounts';
        const currentList = [
          ...(m.pendingAction.payload[listKey] || []),
          { platform: '新增资产/负债账户', account_type: 'wallet', balance: 0 }
        ];
        return {
          ...m,
          pendingAction: {
            ...m.pendingAction,
            payload: {
              ...m.pendingAction.payload,
              [listKey]: currentList
            }
          }
        };
      }
      return m;
    }));
  };

  // Update a specific investment holding in batch staging
  const handleUpdateInvestmentItemField = (msgId: string, itemIdx: number, field: string, value: any) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.pendingAction) {
        const currentItems = [...(m.pendingAction.payload.items || [])];
        if (currentItems[itemIdx]) {
          currentItems[itemIdx] = {
            ...currentItems[itemIdx],
            [field]: value
          };
          // Recalculate market value live
          if (field === 'shares' || field === 'current_price' || field === 'cost_price') {
            const sh = parseFloat(field === 'shares' ? value : currentItems[itemIdx].shares) || 0;
            const pr = parseFloat(field === 'current_price' ? value : (currentItems[itemIdx].current_price || currentItems[itemIdx].cost_price)) || 0;
            currentItems[itemIdx].market_value = Math.round(sh * pr * 100) / 100;
          }
        }
        return {
          ...m,
          pendingAction: {
            ...m.pendingAction,
            payload: {
              ...m.pendingAction.payload,
              items: currentItems
            }
          }
        };
      }
      return m;
    }));
  };

  // Remove an investment holding from batch staging
  const handleRemoveInvestmentItem = (msgId: string, itemIdx: number) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.pendingAction) {
        const currentItems = [...(m.pendingAction.payload.items || [])].filter((_, idx) => idx !== itemIdx);
        return {
          ...m,
          pendingAction: {
            ...m.pendingAction,
            payload: {
              ...m.pendingAction.payload,
              items: currentItems
            }
          }
        };
      }
      return m;
    }));
  };

  // Add a new investment holding to batch staging
  const handleAddInvestmentItem = (msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.pendingAction) {
        const currentItems = [
          ...(m.pendingAction.payload.items || []),
          { name: '纳指ETF广发', code: '159941', shares: 100, cost_price: 1.0, current_price: 1.0, market_value: 100 }
        ];
        return {
          ...m,
          pendingAction: {
            ...m.pendingAction,
            payload: {
              ...m.pendingAction.payload,
              items: currentItems
            }
          }
        };
      }
      return m;
    }));
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if ((!text && selectedImages.length === 0) || loading) return;

    const currentImgs = [...selectedImages];
    setSelectedImages([]);

    const userMsg: AgentChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || (currentImgs.length > 1 
        ? `📸 上传了 ${currentImgs.length} 张图片，请帮我分析并准备录入` 
        : '📸 上传了一张图片，请帮我分析并准备录入'),
      imageUrl: currentImgs[0] || undefined,
      imageUrls: currentImgs.length > 0 ? currentImgs : undefined,
      timestamp: getBeijingDateTimeString()
    };

    const assistantMsgId = `asst-${Date.now()}`;
    const initialAssistantMsg: AgentChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '✨ 正在思考并分析账本...',
      timestamp: getBeijingDateTimeString()
    };

    setMessages(prev => [...prev, userMsg, initialAssistantMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const response = await sendAgentMessage(
        text,
        messages,
        accounts,
        categories,
        transactions,
        goals,
        currentImgs,
        budgets,
        recurringRules,
        investments,
        debts,
        (streamedText, streamedReasoning) => {
          // Live typewriter text update and reasoning capture in real-time
          setMessages(prev => prev.map(m => {
            if (m.id === assistantMsgId) {
              return { 
                ...m, 
                content: streamedText || (streamedReasoning ? '🧠 正在深度思考分析账本...' : '✨ 正在处理...'),
                reasoning: streamedReasoning || m.reasoning
              };
            }
            return m;
          }));
        }
      );

      let pendingAction: any = undefined;
      let actionResult: any = undefined;

      if (response.action && response.action.type !== 'none') {
        const act = response.action;

        // Navigation and export execute right away
        if (act.type === 'navigate_to' && act.payload?.page) {
          const pageMap: Record<string, string> = {
            dashboard: '首页', accounts: '资产账户', transactions: '记账明细',
            budgets: '月度预算', goals: '存钱目标', analytics: '财务图表',
            investments: '投资持仓', debts: '负债信贷', settings: '系统设置'
          };
          actionResult = {
            type: 'navigated',
            data: { page: act.payload.page, pageName: pageMap[act.payload.page] || act.payload.page }
          };
          onNavigate?.(act.payload.page);
        } else if (act.type === 'export_data') {
          const data = await api.exportBackup();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `SmartWealth_Export_${getBeijingDateString()}.json`;
          link.click();
          actionResult = {
            type: 'data_exported',
            data: { fileName: `SmartWealth_Export_${getBeijingDateString()}.json` }
          };
        } else if (act.type === 'refresh_investments') {
          const res = await refreshInvestmentQuotes(investments);
          actionResult = {
            type: 'investments_refreshed',
            data: res
          };
          confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
          onRefresh();
        } else {
          // All data creation / modifications are STAGED for user editable confirmation!
          pendingAction = {
            ...act,
            status: 'staged'
          };
        }
      }

      setMessages(prev => prev.map(m => {
        if (m.id === assistantMsgId) {
          return {
            ...m,
            content: cleanRepetitiveText(response.reply) || '✨ 分析完成',
            reasoning: response.reasoning || m.reasoning,
            pendingAction,
            actionResult
          };
        }
        return m;
      }));
    } catch (err: any) {
      setMessages(prev => prev.map(m => {
        if (m.id === assistantMsgId) {
          return {
            ...m,
            content: `❌ 请求遇到问题：${err.message || '请检查 AI API Key 与网络连接'}`
          };
        }
        return m;
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([DEFAULT_WELCOME_MESSAGE]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[780px]">
        {/* Header */}
        <div className="relative p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    斌斌 AI 全能管家
                  </h3>
                  {/* Interactive Fast Model Switcher Pill */}
                  {(() => {
                    const currentProv = AI_PROVIDERS.find(p => p.id === aiConfig.provider) || AI_PROVIDERS[0];
                    const currentModel = currentProv.models.find(m => m.id === aiConfig.model) || currentProv.models[0];
                    return (
                      <button
                        type="button"
                        onClick={() => setModelSelectorOpen(prev => !prev)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/80 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 font-bold font-mono text-[9px] border border-purple-300/40 dark:border-purple-700/40 transition active:scale-95 flex-shrink-0"
                        title="点击快速切换模型与厂商"
                      >
                        <span>{currentProv.icon}</span>
                        <span className="truncate max-w-[85px]">{currentModel?.name || aiConfig.model || 'GLM-4.6V'}</span>
                        {currentModel?.vision && <span className="text-[7px] px-1 py-0.2 rounded bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">看图</span>}
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${modelSelectorOpen ? 'rotate-180' : ''}`} />
                      </button>
                    );
                  })()}
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  支持发图预识别 • 人工确认修改 • 自动录入账本
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onOpenSettings?.()}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="AI 凭证与接口设置"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-medium flex items-center gap-1"
                title="清空对话历史"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Model Switcher Dropdown Panel */}
          {modelSelectorOpen && (
            <div className="mt-2.5 p-3 rounded-2xl bg-white dark:bg-slate-850 border border-purple-200/80 dark:border-purple-900/60 shadow-xl space-y-2.5 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  快速切换模型与厂商
                </span>
                <button 
                  onClick={() => setModelSelectorOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px]"
                >
                  收起 ✕
                </button>
              </div>

              {/* Provider Horizontal Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                {AI_PROVIDERS.map(p => {
                  const isActive = selectedProviderId === p.id;
                  const hasKey = !!(aiConfig.providerKeys?.[p.id] || (p.id === aiConfig.provider ? aiConfig.apiKey : ''));
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProviderId(p.id)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 whitespace-nowrap transition ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                      {hasKey && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                  );
                })}
              </div>

              {/* Models List under Selected Provider */}
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {(() => {
                  const prov = AI_PROVIDERS.find(p => p.id === selectedProviderId) || AI_PROVIDERS[0];
                  const hasKey = !!(aiConfig.providerKeys?.[prov.id] || (prov.id === aiConfig.provider ? aiConfig.apiKey : ''));

                  return (
                    <>
                      {!hasKey && (
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-300">
                          <span>⚠️ {prov.name} 尚未填写 API Key</span>
                          <button
                            type="button"
                            onClick={() => {
                              setModelSelectorOpen(false);
                              onOpenSettings?.();
                            }}
                            className="font-bold underline text-amber-600 dark:text-amber-400"
                          >
                            去配置 →
                          </button>
                        </div>
                      )}
                      {prov.models.map(m => {
                        const isCurrent = aiConfig.provider === prov.id && aiConfig.model === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectModel(prov.id, m.id)}
                            className={`p-2 rounded-xl border text-left transition flex items-center justify-between group ${
                              isCurrent
                                ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-500 ring-1 ring-purple-500/30'
                                : 'border-slate-200/70 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 bg-slate-50/50 dark:bg-slate-800/30'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-bold ${isCurrent ? 'text-purple-900 dark:text-purple-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {m.name}
                                </span>
                                {m.tag && (
                                  <span className={`text-[8px] px-1.5 py-0.2 rounded-md font-bold ${
                                    m.tagColor === 'purple' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                                    m.tagColor === 'blue' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                                    m.tagColor === 'amber' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' :
                                    m.tagColor === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' :
                                    m.tagColor === 'cyan' ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300' :
                                    'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                  }`}>
                                    {m.tag}
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-400 truncate mt-0.5">{m.desc}</p>
                            </div>
                            {isCurrent && <Check className="w-4 h-4 text-purple-600 flex-shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Toast Notification on Model Switched */}
          {modelSwitchToast && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-bold shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 z-30 pointer-events-none">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{modelSwitchToast}</span>
            </div>
          )}
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-3xl p-3 sm:p-3.5 shadow-sm ${
                  m.role === 'user'
                    ? 'bg-purple-600 text-white rounded-tr-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                {/* Multi-Image Gallery Rendering */}
                {m.imageUrls && m.imageUrls.length > 0 && (
                  <div className={`mb-2 grid gap-1.5 ${
                    m.imageUrls.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 max-w-xs'
                  }`}>
                    {m.imageUrls.map((imgUrl: string, i: number) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-white/20 shadow-sm relative group bg-black/20">
                        <img src={imgUrl} alt={`截图 ${i + 1}`} className="w-full h-24 object-cover rounded-xl" />
                        <span className="absolute bottom-1 right-1 text-[8px] px-1.5 py-0.5 rounded bg-black/60 text-white font-mono">
                          #{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Collapsible Deep Reasoning Process */}
                {m.reasoning && (
                  <div className="mb-2.5 rounded-2xl bg-black/5 dark:bg-black/30 border border-slate-300/40 dark:border-slate-700/50 overflow-hidden text-[10px]">
                    <button
                      type="button"
                      onClick={() => toggleReasoningCollapse(m.id)}
                      className="w-full px-3 py-1.5 flex items-center justify-between text-slate-500 dark:text-slate-400 font-mono font-bold hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-purple-500 flex-shrink-0" />
                        <span>💭 深度思考推理过程</span>
                      </span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${collapsedReasonings[m.id] ? '' : 'rotate-180'}`} />
                    </button>
                    {!collapsedReasonings[m.id] && (
                      <div className="px-3 pb-2.5 pt-1 font-mono text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap border-t border-black/5 dark:border-white/5">
                        {m.reasoning}
                      </div>
                    )}
                  </div>
                )}

                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                {/* ======================================================== */}
                {/* 🌟 INTERACTIVE EDITABLE STAGING CONFIRMATION CARD */}
                {/* ======================================================== */}
                {m.pendingAction && m.pendingAction.status === 'staged' && (
                  <div className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-slate-900 dark:text-slate-100 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-black text-xs text-amber-800 dark:text-amber-300">
                        <Edit3 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>📋 智能识别待确认 (您可直接修改无误后录入)</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
                        待确认
                      </span>
                    </div>

                    {/* Single Account / Liability Staging Form */}
                    {(m.pendingAction.type === 'create_account' || m.pendingAction.type === 'update_balance') && (
                      <div className="space-y-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-xs">
                        <div className="flex items-center gap-2">
                          <BrandLogo 
                            type={m.pendingAction.payload.type || m.pendingAction.payload.account_type} 
                            name={m.pendingAction.payload.name || m.pendingAction.payload.platform}
                            size="md"
                          />
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-400 block mb-0.5">平台 / 账户名称</label>
                            <input
                              type="text"
                              value={m.pendingAction.payload.name || m.pendingAction.payload.platform || ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'name', e.target.value)}
                              placeholder="如：京东白条、美团月付、华泰证券"
                              className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">账户 / 信贷分类</label>
                            <select
                              value={m.pendingAction.payload.type || m.pendingAction.payload.account_type || 'baitiao'}
                              onChange={(e) => {
                                handleUpdatePendingField(m.id, 'type', e.target.value);
                                handleUpdatePendingField(m.id, 'account_type', e.target.value);
                              }}
                              className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold"
                            >
                              <option value="baitiao">🐕 京东白条 (消费信贷)</option>
                              <option value="meituan_pay">🦘 美团月付 (消费信贷)</option>
                              <option value="douyin_pay">🎵 抖音月付 (消费信贷)</option>
                              <option value="huabei">🌸 蚂蚁花呗 (月付信贷)</option>
                              <option value="jiebei">💰 蚂蚁借呗 (短期借贷)</option>
                              <option value="fenfu">💬 微信分付/微粒贷</option>
                              <option value="credit">💳 银行信用卡</option>
                              <option value="wallet">🟢 微信/支付宝钱包</option>
                              <option value="bank">🏦 银行储蓄卡</option>
                              <option value="investment">📈 证券与基金持仓</option>
                              <option value="loan">🏠 房贷/车贷/大额按揭</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">
                              {['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'].includes(m.pendingAction.payload.type || m.pendingAction.payload.account_type)
                                ? '待还负债金额 (¥)'
                                : '账户资产余额 (¥)'}
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={m.pendingAction.payload.balance ?? ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'balance', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-black text-rose-600 dark:text-rose-400 text-xs"
                            />
                          </div>
                        </div>

                        {['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'].includes(m.pendingAction.payload.type || m.pendingAction.payload.account_type) && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                            <span>💳 本项将被计为负债，并在总净资产中自动扣减 ¥{parseFloat(m.pendingAction.payload.balance || 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Batch Accounts Staging List (100% Inline Editable) */}
                    {(m.pendingAction.type === 'batch_create_accounts' || m.pendingAction.type === 'batch_update_balances') && (
                      <div className="space-y-2 bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-2xl border border-amber-300 dark:border-amber-700 text-xs">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] text-amber-800 dark:text-amber-300 font-black">
                            📝 待录入列表 (可直接点击修改名称、分类与金额)：
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {(m.pendingAction.payload.accounts || m.pendingAction.payload.updates || []).length} 个项目
                          </span>
                        </div>

                        {(m.pendingAction.payload.accounts || m.pendingAction.payload.updates || []).map((it: any, idx: number) => {
                          const currentType = it.account_type || it.type || 'wallet';
                          const isLiab = ['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'].includes(currentType);
                          
                          return (
                            <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                              {/* Row 1: Logo + Editable Name + Delete Button */}
                              <div className="flex items-center gap-2">
                                <BrandLogo type={currentType} name={it.platform || it.name} size="md" />
                                <div className="flex-1 min-w-0">
                                  <input
                                    type="text"
                                    value={it.platform || it.name || ''}
                                    onChange={(e) => handleUpdateBatchItemField(m.id, idx, 'platform', e.target.value)}
                                    placeholder="账户/平台名称"
                                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-white"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBatchItem(m.id, idx)}
                                  title="移除此项"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Row 2: Account Type Selector + Amount Input */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <select
                                    value={currentType}
                                    onChange={(e) => {
                                      handleUpdateBatchItemField(m.id, idx, 'account_type', e.target.value);
                                      handleUpdateBatchItemField(m.id, idx, 'type', e.target.value);
                                    }}
                                    className={`w-full px-2 py-1 rounded-lg border text-[11px] font-bold ${
                                      isLiab 
                                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                                    }`}
                                  >
                                    <option value="wallet">🟢 微信/支付宝 (资产)</option>
                                    <option value="bank">🏦 银行储蓄卡 (资产)</option>
                                    <option value="investment">📈 基金与证券 (资产)</option>
                                    <option value="huabei">🌸 蚂蚁花呗 (负债)</option>
                                    <option value="baitiao">🐕 京东白条 (负债)</option>
                                    <option value="meituan_pay">🦘 美团月付 (负债)</option>
                                    <option value="douyin_pay">🎵 抖音月付 (负债)</option>
                                    <option value="jiebei">💰 蚂蚁借呗 (负债)</option>
                                    <option value="fenfu">💬 微信分付 (负债)</option>
                                    <option value="credit">💳 银行信用卡 (负债)</option>
                                    <option value="loan">🏠 房贷/车贷 (负债)</option>
                                  </select>
                                </div>

                                <div className="relative">
                                  <span className="absolute left-2 top-1.5 text-xs font-bold text-slate-400">¥</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={it.balance ?? ''}
                                    onChange={(e) => handleUpdateBatchItemField(m.id, idx, 'balance', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    className={`w-full pl-6 pr-2 py-1 rounded-lg bg-white dark:bg-slate-900 border font-mono font-black text-xs text-right ${
                                      isLiab ? 'border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400' : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Row 3: Holdings (if any) */}
                              {it.holdings && Array.isArray(it.holdings) && it.holdings.length > 0 && (
                                <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <span className="font-bold text-purple-600 dark:text-purple-400">持仓:</span>
                                  {it.holdings.map((h: any, hIdx: number) => (
                                    <span key={hIdx} className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-mono">
                                      {h.name} ({h.shares || 100}份)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add more item button */}
                        <button
                          type="button"
                          onClick={() => handleAddBatchItem(m.id)}
                          className="w-full py-2 text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-dashed border-amber-300 dark:border-amber-700 rounded-xl hover:bg-amber-100/50 dark:hover:bg-amber-950/40 flex items-center justify-center gap-1 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>添加更多账户 / 负债</span>
                        </button>
                      </div>
                    )}

                    {/* Batch Investments / Securities Portfolio Staging List (100% Inline Editable) */}
                    {(m.pendingAction.type === 'batch_create_investments' || m.pendingAction.type === 'create_investment') && (
                      <div className="space-y-2.5 bg-white/90 dark:bg-slate-900/90 p-3 rounded-2xl border border-indigo-300 dark:border-indigo-700 text-xs">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-1.5 font-black text-indigo-900 dark:text-indigo-200">
                            <TrendingUp className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <span>📈 证券持仓与券商账户待录入：</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {(m.pendingAction.payload.items || [m.pendingAction.payload]).length} 个持仓标的
                          </span>
                        </div>

                        {/* Broker info summary */}
                        <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">所属券商平台</label>
                            <input
                              type="text"
                              value={m.pendingAction.payload.broker_name || m.pendingAction.payload.account_name || '华泰证券'}
                              onChange={(e) => handleUpdatePendingField(m.id, 'broker_name', e.target.value)}
                              placeholder="华泰证券"
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">券商总资产 (¥)</label>
                            <input
                              type="number"
                              step="any"
                              value={m.pendingAction.payload.total_assets ?? ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'total_assets', parseFloat(e.target.value) || 0)}
                              placeholder="1966.65"
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300"
                            />
                          </div>
                        </div>

                        {/* Holdings items */}
                        <div className="space-y-2">
                          {(m.pendingAction.payload.items || [m.pendingAction.payload]).map((it: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                              {/* Row 1: Name + Code + Delete */}
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                                  #{idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <input
                                    type="text"
                                    value={it.name || ''}
                                    onChange={(e) => handleUpdateInvestmentItemField(m.id, idx, 'name', e.target.value)}
                                    placeholder="标的名称（如 纳指ETF广发）"
                                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                                  />
                                </div>
                                <div className="w-24">
                                  <input
                                    type="text"
                                    value={it.code || ''}
                                    onChange={(e) => handleUpdateInvestmentItemField(m.id, idx, 'code', e.target.value)}
                                    placeholder="代码 159941"
                                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[11px] text-center"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInvestmentItem(m.id, idx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition"
                                  title="删除此标的"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Row 2: Shares, Cost Price, Current Price, Market Value */}
                              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                                <div>
                                  <label className="text-slate-400 block mb-0.5">持仓股数/份</label>
                                  <input
                                    type="number"
                                    value={it.shares ?? ''}
                                    onChange={(e) => handleUpdateInvestmentItemField(m.id, idx, 'shares', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-slate-400 block mb-0.5">成本均价 (¥)</label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={it.cost_price ?? ''}
                                    onChange={(e) => handleUpdateInvestmentItemField(m.id, idx, 'cost_price', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-slate-400 block mb-0.5">持仓市值 (¥)</label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={it.market_value ?? ((it.shares || 0) * (it.current_price || it.cost_price || 0))}
                                    onChange={(e) => handleUpdateInvestmentItemField(m.id, idx, 'market_value', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-xs text-indigo-600 dark:text-indigo-300"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add investment holding item */}
                        <button
                          type="button"
                          onClick={() => handleAddInvestmentItem(m.id)}
                          className="w-full py-2 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40 flex items-center justify-center gap-1 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>添加更多持仓标的</span>
                        </button>
                      </div>
                    )}

                    {/* Single & Batch Transaction Staging Card */}
                    {(m.pendingAction.type === 'create_transaction' || m.pendingAction.type === 'batch_create_transactions') && (
                      <div className="space-y-2.5 bg-white/90 dark:bg-slate-900/90 p-3 rounded-2xl border border-emerald-300 dark:border-emerald-700 text-xs">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-1.5 font-black text-emerald-900 dark:text-emerald-200">
                            <Receipt className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>🧾 消费/收支流水待入账：</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {(m.pendingAction.payload.items || [m.pendingAction.payload]).length} 笔交易
                          </span>
                        </div>

                        <div className="space-y-2">
                          {(m.pendingAction.payload.items || [m.pendingAction.payload]).map((it: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <label className="text-[9px] text-slate-400 block mb-0.5">商户/明细</label>
                                <input
                                  type="text"
                                  value={it.merchant || ''}
                                  onChange={(e) => {
                                    if (m.pendingAction?.type === 'batch_create_transactions') {
                                      const cur = [...(m.pendingAction?.payload?.items || [])];
                                      if (cur[idx]) cur[idx].merchant = e.target.value;
                                      handleUpdatePendingField(m.id, 'items', cur);
                                    } else {
                                      handleUpdatePendingField(m.id, 'merchant', e.target.value);
                                    }
                                  }}
                                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-400 block mb-0.5">金额 (¥)</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={it.amount ?? ''}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value) || 0;
                                    if (m.pendingAction?.type === 'batch_create_transactions') {
                                      const cur = [...(m.pendingAction?.payload?.items || [])];
                                      if (cur[idx]) cur[idx].amount = v;
                                      handleUpdatePendingField(m.id, 'items', cur);
                                    } else {
                                      handleUpdatePendingField(m.id, 'amount', v);
                                    }
                                  }}
                                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-xs text-rose-600 dark:text-rose-400 text-right"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Debt Staging Card */}
                    {m.pendingAction.type === 'create_debt' && (
                      <div className="space-y-2 bg-white/90 dark:bg-slate-900/90 p-3 rounded-2xl border border-rose-300 dark:border-rose-700 text-xs">
                        <div className="flex items-center gap-1.5 font-black text-rose-900 dark:text-rose-200">
                          <CreditCard className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          <span>💳 负债与分期还款待录入：</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">负债名称</label>
                            <input
                              type="text"
                              value={m.pendingAction.payload.name || ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'name', e.target.value)}
                              placeholder="京东白条分期"
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">待还本金 (¥)</label>
                            <input
                              type="number"
                              step="any"
                              value={m.pendingAction.payload.total_principal ?? ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'total_principal', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-xs text-rose-600 dark:text-rose-400 text-right"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Budget Staging Card */}
                    {m.pendingAction.type === 'set_budget' && (
                      <div className="space-y-2 bg-white/90 dark:bg-slate-900/90 p-3 rounded-2xl border border-purple-300 dark:border-purple-700 text-xs">
                        <div className="flex items-center gap-1.5 font-black text-purple-900 dark:text-purple-200">
                          <PieChart className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <span>🎯 月度预算待设置：</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">预算分类</label>
                            <input
                              type="text"
                              value={m.pendingAction.payload.category_name || ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'category_name', e.target.value)}
                              placeholder="餐饮美食"
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">月度限额 (¥)</label>
                            <input
                              type="number"
                              step="any"
                              value={m.pendingAction.payload.amount ?? ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs text-purple-600 dark:text-purple-400 text-right"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Goal Staging Card */}
                    {m.pendingAction.type === 'create_goal' && (
                      <div className="space-y-2 bg-white/90 dark:bg-slate-900/90 p-3 rounded-2xl border border-amber-300 dark:border-amber-700 text-xs">
                        <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-200">
                          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>✨ 储蓄心愿目标待创建：</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">心愿目标</label>
                            <input
                              type="text"
                              value={m.pendingAction.payload.name || ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'name', e.target.value)}
                              placeholder="买新手机"
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">目标金额 (¥)</label>
                            <input
                              type="number"
                              step="any"
                              value={m.pendingAction.payload.target_amount ?? ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'target_amount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs text-amber-600 dark:text-amber-400 text-right"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recurring Rule Staging Card */}
                    {m.pendingAction.type === 'create_recurring_rule' && (
                      <div className="space-y-2 bg-white/90 dark:bg-slate-900/90 p-3 rounded-2xl border border-blue-300 dark:border-blue-700 text-xs">
                        <div className="flex items-center gap-1.5 font-black text-blue-900 dark:text-blue-200">
                          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span>⏱️ 固定周期收支规则待创建：</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="col-span-2">
                            <label className="text-[9px] text-slate-400 block mb-0.5">规则名称</label>
                            <input
                              type="text"
                              value={m.pendingAction.payload.name || ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'name', e.target.value)}
                              placeholder="房租 / 工资"
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">每期金额 (¥)</label>
                            <input
                              type="number"
                              step="any"
                              value={m.pendingAction.payload.amount ?? ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs text-right"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Staging Confirmation Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCommitPendingAction(m.id)}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>确认无误，立即录入账本</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelPendingAction(m.id)}
                        className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {/* Post-Action Result Cards (After Confirmed) */}
                {m.actionResult && m.actionResult.type === 'account_created' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span>✨ 已成功开立并录入账本</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-purple-100 dark:border-purple-800">
                      <div className="flex items-center gap-2">
                        <BrandLogo type={m.actionResult.data.type} name={m.actionResult.data.name} size="md" />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {m.actionResult.data.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {m.actionResult.data.isLiability ? '负债已计入并在净资产中扣除' : '已计入总资产'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-black font-mono text-purple-600 dark:text-purple-300">
                        ¥{m.actionResult.data.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                )}

                {m.actionResult && m.actionResult.type === 'balance_updated' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrandLogo type={m.actionResult.data.type} name={m.actionResult.data.platform} size="sm" />
                      <div>
                        <div className="font-bold text-[11px]">🎉 余额/账单已成功校准</div>
                        <div className="text-[10px] text-teal-700 dark:text-teal-300">
                          {m.actionResult.data.platform}: ¥{m.actionResult.data.balance.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {m.actionResult && m.actionResult.type === 'batch_balances_updated' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 space-y-1.5">
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>🎉 多平台批量开账完成 (共 {m.actionResult.data.count} 个)</span>
                    </div>
                  </div>
                )}

                {m.actionResult && m.actionResult.type === 'investments_created' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <TrendingUp className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span>📈 证券持仓已成功录入，并已自动接入实时行情！</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-bold">
                        {m.actionResult.data.brokerName || '华泰证券'}
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {(m.actionResult.data.items || []).map((it: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50 text-xs">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{it.name}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                                {it.code}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {it.shares} 份 • 成本 ¥{parseFloat(it.cost_price).toFixed(3)}
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                              ¥{(it.shares * (it.current_price || it.cost_price)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-400 px-1">
                {m.timestamp}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-500" />
              <span>AI 正在高速多模态识别分析中...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Thumbnail Preview Strip */}
        {selectedImages.length > 0 && (
          <div className="p-2.5 px-4 bg-purple-50/70 dark:bg-purple-950/30 border-t border-purple-100 dark:border-purple-900/50 flex items-center gap-2 overflow-x-auto">
            {selectedImages.map((img, index) => (
              <div key={index} className="relative group rounded-xl overflow-hidden border border-purple-300/80 dark:border-purple-700 flex-shrink-0 shadow-sm">
                <img src={img} alt="预览" className="w-14 h-14 object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-700 flex flex-col items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-100/50 transition flex-shrink-0 text-[10px]"
            >
              <Plus className="w-4 h-4" />
              <span>加图</span>
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleImageFilesChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition active:scale-95 relative"
              title="发白条/月付/余额截图"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="发京东白条/美团月付截图，或说一句话记账..."
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && selectedImages.length === 0) || loading}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-40 hover:from-purple-500 hover:to-indigo-500 transition active:scale-95 shadow-md shadow-purple-500/20 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
