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
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Account, Transaction, Category, Goal, Budget, RecurringRule } from '../types';
import { api } from '../api/client';
import { localStore } from '../services/localStore';
import { sendAgentMessage, AgentChatMessage } from '../services/aiAgent';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';

interface AiChatAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  budgets?: Budget[];
  onRefresh: () => void;
  onOpenSettings?: () => void;
  onNavigate?: (page: string) => void;
}

const DEFAULT_WELCOME_MESSAGE: AgentChatMessage = {
  id: 'welcome-1',
  role: 'assistant',
  content: `您好！我是您的 **斌斌 AI 财务智能全能管家**。我已接入您的实时账本系统，具备全权限的看图记账、智能开账、预算管控与数据分析能力！

您可以随时对我下达指令或发送图片：
• 📷 **发消费小票/账单凭证**：发图自动提取明细并入库；
• 📸 **发钱包/银行余额截图**：发图自动对账与开账；
• 💬 **一句话自然语言记账**：“中午在麦当劳微信付了35元，买咖啡15”；
• 📊 **预算与省钱计划**：“把餐饮预算设为1500”、“制定6个月存2万的计划”；
• ⏰ **周期自动记账**：“每月10号自动记房租2800”；
• 🧭 **系统导航与查账**：“带我去看图表统计”、“这个月餐饮花了多少”。`,
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
  onRefresh,
  onOpenSettings,
  onNavigate
}) => {
  const [messages, setMessages] = useState<AgentChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUndoTransaction = async (txId: string) => {
    if (!txId) return;
    try {
      await api.deleteTransaction(txId);
      onRefresh();
      confetti({ particleCount: 40, spread: 40, origin: { y: 0.7 } });
      setMessages(prev => [
        ...prev,
        {
          id: `undo-${Date.now()}`,
          role: 'assistant',
          content: '🗑️ 已成功撤销并删除了该笔记账记录，账本已同步还原！',
          timestamp: getBeijingDateTimeString()
        }
      ]);
    } catch (e: any) {
      alert(`撤销失败: ${e.message}`);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if ((!text && !selectedImage) || loading) return;

    const currentImg = selectedImage;
    setSelectedImage(null);

    const userMsg: AgentChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || (currentImg ? '📸 上传了一张图片，请帮我分析处理' : ''),
      imageUrl: currentImg || undefined,
      timestamp: getBeijingDateTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
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
        currentImg || undefined,
        budgets,
        recurringRules
      );

      let actionResult: any = undefined;
      const isQuestionOnly = /这是哪个|什么平台|这是什么|多少钱|帮我看看|分析一下|？|\?|什么模型|你是谁|是哪个/.test(text);

      if (response.action && response.action.type !== 'none' && !isQuestionOnly) {
        const act = response.action;

        // 1. Single Transaction
        if (act.type === 'create_transaction' && act.payload) {
          const catObj = categories.find(c => c.name === act.payload.category) || categories[0];
          let accId = accounts[0]?.id || 'acc-1';
          if (/微信/.test(act.payload.channel || '')) {
            const acc = accounts.find(a => a.name.includes('微信')) || accounts[0];
            accId = acc?.id || accId;
          } else if (/支付宝/.test(act.payload.channel || '')) {
            const acc = accounts.find(a => a.name.includes('支付宝')) || accounts[1];
            accId = acc?.id || accId;
          }

          const amt = Math.abs(parseFloat(act.payload.amount) || 0);
          if (amt > 0) {
            const created = await api.createTransaction({
              type: act.payload.type || 'expense',
              amount: amt,
              account_id: accId,
              category_id: catObj?.id,
              category_name: act.payload.category || catObj?.name || '日常消费',
              date: getBeijingDateTimeString(),
              merchant: act.payload.merchant || 'AI 自动记账',
              note: act.payload.note || '由 AI 智能对话助手记账',
              source: 'ai_copilot'
            });

            actionResult = {
              type: 'transaction_created',
              data: {
                ...act.payload,
                createdTxId: (created as any)?.id
              }
            };
            confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
            onRefresh();
          }
        }
        // 2. Batch Transactions
        else if (act.type === 'batch_create_transactions' && act.payload?.items && Array.isArray(act.payload.items)) {
          const createdItems = [];
          for (const item of act.payload.items) {
            const amt = Math.abs(parseFloat(item.amount) || 0);
            if (amt > 0) {
              const catObj = categories.find(c => c.name === item.category) || categories[0];
              let accId = accounts[0]?.id || 'acc-1';
              if (/微信/.test(item.channel || '')) {
                const acc = accounts.find(a => a.name.includes('微信')) || accounts[0];
                accId = acc?.id || accId;
              } else if (/支付宝/.test(item.channel || '')) {
                const acc = accounts.find(a => a.name.includes('支付宝')) || accounts[1];
                accId = acc?.id || accId;
              }

              await api.createTransaction({
                type: item.type || 'expense',
                amount: amt,
                account_id: accId,
                category_id: catObj?.id,
                category_name: item.category || catObj?.name || '日常消费',
                date: getBeijingDateTimeString(),
                merchant: item.merchant || 'AI 批量记账',
                note: item.note || '由 AI 智能管家批量创建',
                source: 'ai_copilot'
              });
              createdItems.push(item);
            }
          }

          if (createdItems.length > 0) {
            actionResult = {
              type: 'batch_transactions_created',
              data: { items: createdItems, count: createdItems.length }
            };
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
            onRefresh();
          }
        }
        // 3. Delete Transaction
        else if (act.type === 'delete_transaction' && act.payload) {
          let txToDelete = transactions.find(t => t.id === act.payload.transaction_id);
          if (!txToDelete && act.payload.keyword) {
            const kw = act.payload.keyword.toLowerCase();
            txToDelete = transactions.find(t => 
              (t.merchant && t.merchant.toLowerCase().includes(kw)) || 
              (t.category_name && t.category_name.toLowerCase().includes(kw))
            );
          }

          if (txToDelete) {
            await api.deleteTransaction(txToDelete.id);
            actionResult = {
              type: 'transaction_deleted',
              data: txToDelete
            };
            confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
            onRefresh();
          }
        }
        // 4. Update Account Balance
        else if (act.type === 'update_balance' && act.payload) {
          const targetBal = parseFloat(act.payload.balance) || 0;
          const platformName = (act.payload.platform || '').toLowerCase();
          let matchedAcc: Account | undefined = undefined;
          
          if (platformName.includes('微信') || platformName.includes('零钱')) {
            matchedAcc = accounts.find(a => a.name.includes('微信') || a.name.includes('零钱'));
          } else if (platformName.includes('支付宝') || platformName.includes('余额宝') || platformName.includes('蚂蚁')) {
            matchedAcc = accounts.find(a => a.name.includes('支付宝') || a.name.includes('余额宝'));
          } else if (act.payload.account_id) {
            matchedAcc = accounts.find(a => a.id === act.payload.account_id);
          } else if (act.payload.platform) {
            matchedAcc = accounts.find(a => a.name.toLowerCase().includes(platformName) || platformName.includes(a.name.toLowerCase()));
          }

          if (matchedAcc) {
            const diff = targetBal - matchedAcc.balance;
            await api.updateAccount(matchedAcc.id, {
              ...matchedAcc,
              balance: targetBal
            });

            if (Math.abs(diff) > 0.01) {
              await api.createTransaction({
                type: diff > 0 ? 'income' : 'expense',
                amount: Math.abs(diff),
                account_id: matchedAcc.id,
                category_name: '余额校准',
                date: getBeijingDateTimeString(),
                merchant: `${matchedAcc.name}余额校准`,
                note: `AI 根据截图自动校准余额 (原: ¥${matchedAcc.balance.toFixed(2)} -> 现: ¥${targetBal.toFixed(2)})`,
                source: 'ai_copilot'
              });
            }

            actionResult = {
              type: 'balance_updated',
              data: {
                platform: matchedAcc.name,
                balance: targetBal,
                diff
              }
            };
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
            onRefresh();
          } else {
            await api.createAccount({
              name: act.payload.platform || '新增资产账户',
              type: act.payload.account_type || 'wallet',
              balance: targetBal,
              currency: 'CNY'
            });

            actionResult = {
              type: 'account_created',
              data: {
                name: act.payload.platform || '新增资产账户',
                balance: targetBal
              }
            };
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
            onRefresh();
          }
        }
        // 5. Set Budget
        else if (act.type === 'set_budget' && act.payload) {
          const catObj = categories.find(c => c.name === act.payload.category_name);
          const amt = parseFloat(act.payload.amount) || 1000;

          await api.setBudget({
            period: 'monthly',
            category_id: catObj?.id || null,
            amount: amt,
            alert_threshold: 0.8
          });

          actionResult = {
            type: 'budget_set',
            data: { category_name: act.payload.category_name, amount: amt }
          };
          confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
          onRefresh();
        }
        // 6. Create Goal
        else if (act.type === 'create_goal' && act.payload && /存钱|目标|计划|愿望|立项|攒钱|买|省钱/.test(text)) {
          await api.addGoal({
            name: act.payload.name || 'AI 存钱计划',
            target_amount: parseFloat(act.payload.target_amount) || 10000,
            current_amount: parseFloat(act.payload.current_amount) || 0,
            target_date: act.payload.deadline || act.payload.target_date || '2026-12-31',
            notes: act.payload.note || act.payload.notes || '由 AI 财务顾问规划制定'
          });

          actionResult = {
            type: 'goal_created',
            data: act.payload
          };
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          onRefresh();
        }
        // 7. Create Recurring Rule
        else if (act.type === 'create_recurring_rule' && act.payload) {
          const amt = parseFloat(act.payload.amount) || 0;
          if (amt > 0) {
            await api.addRecurringRule({
              name: act.payload.name || '固定周期收支',
              type: act.payload.type || 'expense',
              amount: amt,
              account_id: accounts[0]?.id || 'acc-1',
              frequency: act.payload.frequency || 'monthly',
              day_of_period: parseInt(act.payload.day_of_period) || 10,
              note: act.payload.note || '由 AI 智能管家设置',
              is_active: 1
            });

            actionResult = {
              type: 'recurring_rule_created',
              data: act.payload
            };
            confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
            onRefresh();
          }
        }
        // 8. Navigation
        else if (act.type === 'navigate_to' && act.payload?.page) {
          const pageMap: Record<string, string> = {
            dashboard: '首页',
            accounts: '资产账户',
            transactions: '记账明细',
            budgets: '月度预算',
            goals: '存钱目标',
            analytics: '财务图表',
            settings: '系统设置'
          };
          actionResult = {
            type: 'navigated',
            data: { page: act.payload.page, pageName: pageMap[act.payload.page] || act.payload.page }
          };
          onNavigate?.(act.payload.page);
        }
        // 9. Export Data
        else if (act.type === 'export_data') {
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
        }
      }

      const assistantMsg: AgentChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: getBeijingDateTimeString(),
        actionResult
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errMsg: AgentChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `❌ 请求遇到问题：${err.message || '请检查 AI API Key 与网络连接'}`,
        timestamp: getBeijingDateTimeString()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([DEFAULT_WELCOME_MESSAGE]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[750px]">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/25">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  斌斌 AI 财务智能管家
                </h3>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                  BETA
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                当前大模型: <span className="font-bold text-indigo-600 dark:text-indigo-400">{config.model || '未配置'}</span>
                {!config.apiKey && ' (⚠️ 请先在设置填入 Key)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="清空对话"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/30 dark:bg-slate-950/20">
          {messages.map(m => (
            <div 
              key={m.id} 
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/15 rounded-br-none'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-sm rounded-bl-none'
              }`}>
                {/* Render Attached Image */}
                {m.imageUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-white/20 shadow-sm max-w-xs">
                    <img 
                      src={m.imageUrl} 
                      alt="上传截图" 
                      className="max-h-48 w-auto object-contain rounded-xl" 
                    />
                  </div>
                )}

                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* 1. Transaction Created Card (with Undo Support) */}
                {m.actionResult && m.actionResult.type === 'transaction_created' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>🎉 已自动记账入库</span>
                      </div>
                      {m.actionResult.data.createdTxId && (
                        <button
                          type="button"
                          onClick={() => handleUndoTransaction(m.actionResult?.data?.createdTxId)}
                          className="px-2 py-0.5 rounded-lg bg-emerald-200/60 dark:bg-emerald-900/60 hover:bg-rose-100 hover:text-rose-600 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-0.5 transition active:scale-95"
                          title="撤销这笔记账"
                        >
                          <Undo2 className="w-3 h-3" /> 撤销本笔
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <span className="font-bold">{m.actionResult.data.merchant}</span>
                      <span className="font-mono font-bold text-emerald-950 dark:text-emerald-100">
                        {m.actionResult.data.type === 'expense' ? '-' : '+'}¥{parseFloat(m.actionResult.data.amount).toFixed(2)}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-200/50 dark:bg-emerald-800/50 text-[9px]">
                        {m.actionResult.data.category || '日常'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. Batch Transactions Created Card */}
                {m.actionResult && m.actionResult.type === 'batch_transactions_created' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 space-y-1">
                    <div className="font-bold text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>🎉 批量记账完成 (共 {m.actionResult.data.count} 笔)</span>
                    </div>
                    <div className="space-y-0.5 text-[10px]">
                      {m.actionResult.data.items.map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                          <span>{it.merchant} ({it.category})</span>
                          <span className="font-mono font-bold">¥{parseFloat(it.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Transaction Deleted Card */}
                {m.actionResult && m.actionResult.type === 'transaction_deleted' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">🗑️ 已删除指定记账记录</div>
                      <div className="text-[10px] text-rose-700 dark:text-rose-300">
                        {m.actionResult.data.merchant} ¥{m.actionResult.data.amount}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Balance Updated Card */}
                {m.actionResult && m.actionResult.type === 'balance_updated' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <WalletCards className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">✨ 账户余额已成功校准</div>
                      <div className="text-[10px] text-amber-800 dark:text-amber-300">
                        【{m.actionResult.data.platform}】最新余额：<span className="font-mono font-bold">¥{m.actionResult.data.balance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Account Created Card */}
                {m.actionResult && m.actionResult.type === 'account_created' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">✨ 已为您新建资产账户</div>
                      <div className="text-[10px] text-purple-800 dark:text-purple-300">
                        【{m.actionResult.data.name}】开账余额：<span className="font-mono font-bold">¥{m.actionResult.data.balance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Budget Set Card */}
                {m.actionResult && m.actionResult.type === 'budget_set' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">📊 已为您设定月度预算</div>
                      <div className="text-[10px] text-blue-800 dark:text-blue-300">
                        【{m.actionResult.data.category_name}】限额：<span className="font-mono font-bold">¥{m.actionResult.data.amount}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Recurring Rule Created Card */}
                {m.actionResult && m.actionResult.type === 'recurring_rule_created' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">⏰ 已为您创建周期自动记账规则</div>
                      <div className="text-[10px] text-amber-800 dark:text-amber-300">
                        【{m.actionResult.data.name}】每月 {m.actionResult.data.day_of_period} 号自动记 ¥{m.actionResult.data.amount}
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. Goal Created Card */}
                {m.actionResult && m.actionResult.type === 'goal_created' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">🎯 已为您立项存钱目标</div>
                      <div className="text-[10px] text-indigo-700 dark:text-indigo-300">
                        【{m.actionResult.data.name}】目标 ¥{m.actionResult.data.target_amount} ({m.actionResult.data.note})
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. Navigated Card */}
                {m.actionResult && m.actionResult.type === 'navigated' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div className="text-[11px] font-bold">已切换至【{m.actionResult.data.pageName}】页面</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (m.actionResult?.data?.page) {
                          onNavigate?.(m.actionResult.data.page);
                          onClose();
                        }
                      }}
                      className="px-2 py-0.5 rounded-lg bg-purple-600 text-white text-[9px] font-bold shadow-sm"
                    >
                      前往查看
                    </button>
                  </div>
                )}

                {/* 10. Data Exported Card */}
                {m.actionResult && m.actionResult.type === 'data_exported' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 flex items-center gap-2">
                    <Download className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">📥 账本备份文件已下载完成</div>
                      <div className="text-[10px] text-teal-700 dark:text-teal-300">
                        文件：{m.actionResult.data.fileName}
                      </div>
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
              <span>AI 多模态图像识别与账本分析中...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            '📸 发送支付宝/微信余额截图帮我开账',
            '🍱 中午吃麦当劳35微信付，买咖啡15',
            '📊 把餐饮预算设为1500',
            '⏰ 每月10号自动记房租2800',
            '💡 帮我制定月存2000省钱计划',
            '📂 导出我的财务账本'
          ].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSend(chip)}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-[11px] text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 whitespace-nowrap transition active:scale-95 flex-shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Image Attachment Preview Bar */}
        {selectedImage && (
          <div className="px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 border-t border-purple-200 dark:border-purple-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <img 
                src={selectedImage} 
                alt="预览" 
                className="w-8 h-8 rounded-lg object-cover border border-purple-300 dark:border-purple-700" 
              />
              <div className="text-[11px] text-purple-900 dark:text-purple-200 font-medium">
                📷 已附加截图（可输入说明或直接点击发送）
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="p-1 rounded-lg text-purple-400 hover:text-purple-700 dark:hover:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageFileChange} 
            />

            {/* Photo / Image Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-400 transition active:scale-95 shadow-sm flex items-center justify-center flex-shrink-0"
              title="上传账单小票或资产余额截图"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                selectedImage 
                  ? "可输入补充说明，或直接点击发送..." 
                  : config.apiKey 
                    ? "输入指令或点击左侧相机发图..." 
                    : "请先在设置中填入 API Key"
              }
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || (!inputText.trim() && !selectedImage)}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 hover:from-purple-500 hover:to-indigo-500 active:scale-95 transition disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
