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
  CheckCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Account, Transaction, Category, Goal, Budget, RecurringRule, Investment, Debt, AgentChatMessage, AccountType } from '../types';
import { api } from '../api/client';
import { localStore } from '../services/localStore';
import { sendAgentMessage } from '../services/aiAgent';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';
import { refreshInvestmentQuotes } from '../services/marketData';
import { optimizeImagesBatch } from '../services/imageOptimizer';
import { BrandLogo, detectBrandType } from './BrandLogo';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = localStore.getAiConfig();

  useEffect(() => {
    if (isOpen) {
      api.getRecurringRules().then(setRecurringRules).catch(() => {});
    }
  }, [isOpen]);

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
      // 5. Investments
      else if (act.type === 'create_investment' || act.type === 'batch_create_investments') {
        const items = act.type === 'batch_create_investments' ? (act.payload.items || []) : [act.payload];
        const created = [];
        for (const it of items) {
          const acc = accounts.find(a => a.id === it.account_id || (it.account_name && a.name.includes(it.account_name)) || a.type === 'investment') || accounts[0];
          const shares = parseFloat(it.shares) || 100;
          const cost = parseFloat(it.cost_price) || 1.0;
          const newInv = await api.addInvestment({
            account_id: acc?.id || 'acc-1',
            name: it.name || '投资标的',
            code: it.code || '000000',
            type: it.type || 'fund',
            shares,
            cost_price: cost,
            current_price: parseFloat(it.current_price) || cost,
            currency: 'CNY'
          });
          created.push(newInv);
        }
        await refreshInvestmentQuotes(created);
        actionResult = {
          type: 'investments_created',
          data: { count: created.length, items: created }
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
        (streamedText) => {
          // Live typewriter text update in real-time
          if (streamedText && streamedText.trim()) {
            setMessages(prev => prev.map(m => {
              if (m.id === assistantMsgId) {
                return { ...m, content: streamedText };
              }
              return m;
            }));
          }
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
            content: response.reply,
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
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  斌斌 AI 对话全能管家
                </h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold font-mono">
                  {config.model || 'GLM-4.6V'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                支持发图预识别 • 人工确认修改 • 京东白条/美团/抖音月付/花呗
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
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
