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
  ArrowUpRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Account, Transaction, Category, Goal, Budget, RecurringRule, Investment, Debt, AgentChatMessage } from '../types';
import { api } from '../api/client';
import { localStore } from '../services/localStore';
import { sendAgentMessage } from '../services/aiAgent';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';
import { refreshInvestmentQuotes } from '../services/marketData';

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
  content: `您好！我是您的 **斌斌 AI 财务智能全能管家**。我已接入您的实时账本系统，具备全权限的看图记账、多图批量开账、基金证券投资建账、预算管控与数据分析能力！

您可以随时对我下达指令或发送图片：
• 📸 **批量发多平台余额截图**：支持同时上传微信、支付宝、银行卡、基金持仓多张图片，一键批量开账；
• 📷 **发消费小票/账单凭证**：发图自动提取明细并入库；
• 💬 **一句话自然语言记账**：“中午在麦当劳微信付了35元，买咖啡15”；
• 📈 **基金与证券持仓建账**：“把华泰证券截图存到资产里，分类为基金”；
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

  const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        if (res) {
          setSelectedImages(prev => [...prev, res]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== index));
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

  const handleUndoAccount = async (accId: string, accName: string) => {
    if (!accId) return;
    try {
      await api.deleteAccount(accId);
      onRefresh();
      confetti({ particleCount: 40, spread: 40, origin: { y: 0.7 } });
      setMessages(prev => [
        ...prev,
        {
          id: `undo-acc-${Date.now()}`,
          role: 'assistant',
          content: `🗑️ 已成功撤销并删除了【${accName}】资产账户！`,
          timestamp: getBeijingDateTimeString()
        }
      ]);
    } catch (e: any) {
      alert(`删除失败: ${e.message}`);
    }
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
        ? `📸 上传了 ${currentImgs.length} 张图片，请帮我综合分析并批量处理` 
        : '📸 上传了一张图片，请帮我分析处理'),
      imageUrl: currentImgs[0] || undefined,
      imageUrls: currentImgs.length > 0 ? currentImgs : undefined,
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
        currentImgs,
        budgets,
        recurringRules,
        investments,
        debts
      );

      let actionResult: any = undefined;
      const isQuestionOnly = /这是哪个|什么平台|这是什么|多少钱|帮我看看|分析一下|？|\?|什么模型|你是谁|是哪个/.test(text) && 
                            !/存|加|记|分类|设|改|好|确认|开账|买|转|刷|删/.test(text);

      if (response.action && response.action.type !== 'none' && !isQuestionOnly) {
        const act = response.action;

        // 1. Single Transaction Created
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
        // 2. Batch Transactions Created
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
        // 3. Create Account (e.g. 华泰证券/基金持仓, 微信, 支付宝, 银行卡)
        else if (act.type === 'create_account' && act.payload) {
          const accName = act.payload.name || '新增资产账户';
          const accType = act.payload.type || (/基金|证券|股票|ETF|理财/.test(accName) ? 'investment' : 'wallet');
          const bal = parseFloat(act.payload.balance) || 0;

          const createdAcc = await api.createAccount({
            name: accName,
            type: accType as any,
            balance: bal,
            currency: act.payload.currency || 'CNY',
            note: act.payload.note || '由 AI 智能管家自动创建'
          });

          if (bal > 0) {
            await api.createTransaction({
              type: 'income',
              amount: bal,
              account_id: createdAcc.id,
              category_name: '余额校准',
              date: getBeijingDateTimeString(),
              merchant: `${accName}初始开账`,
              note: `AI 智能开账自动记录初始资产余额 ¥${bal.toFixed(2)}`,
              source: 'ai_copilot'
            });
          }

          // If holdings are present, create investment records
          if (accType === 'investment' && act.payload.holdings && Array.isArray(act.payload.holdings)) {
            for (const h of act.payload.holdings) {
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
              holdingsCount: act.payload.holdings?.length || 0
            }
          };
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          onRefresh();
        }
        // 4. Batch Create Accounts / Batch Update Balances (Multi-Platform Onboarding)
        else if ((act.type === 'batch_create_accounts' || act.type === 'batch_update_balances') && act.payload) {
          const list = act.payload.accounts || act.payload.updates || [];
          const processedList: any[] = [];

          for (const item of list) {
            const platName = item.platform || item.name || '新增资产账户';
            const bal = parseFloat(item.balance) || 0;
            const itemType = item.account_type || item.type || (/基金|证券|股票|ETF|理财/.test(platName) ? 'investment' : 'wallet');

            // Find existing account
            const matched = accounts.find(a => 
              a.name.toLowerCase().includes(platName.toLowerCase()) || 
              platName.toLowerCase().includes(a.name.toLowerCase())
            );

            if (matched) {
              const diff = bal - matched.balance;
              await api.updateAccount(matched.id, { ...matched, balance: bal });
              if (Math.abs(diff) > 0.01) {
                await api.createTransaction({
                  type: diff > 0 ? 'income' : 'expense',
                  amount: Math.abs(diff),
                  account_id: matched.id,
                  category_name: '余额校准',
                  date: getBeijingDateTimeString(),
                  merchant: `${matched.name}余额校准`,
                  note: `AI 批量开账自动对账 (原: ¥${matched.balance.toFixed(2)} -> 现: ¥${bal.toFixed(2)})`,
                  source: 'ai_copilot'
                });
              }
              processedList.push({ name: matched.name, balance: bal, type: matched.type, isUpdated: true });
            } else {
              const newAcc = await api.createAccount({
                name: platName,
                type: itemType as any,
                balance: bal,
                currency: 'CNY',
                note: '由 AI 多图批量开账自动创建'
              });
              if (bal > 0) {
                await api.createTransaction({
                  type: 'income',
                  amount: bal,
                  account_id: newAcc.id,
                  category_name: '余额校准',
                  date: getBeijingDateTimeString(),
                  merchant: `${platName}初始建账`,
                  note: `AI 多图批量开账记录初始余额 ¥${bal.toFixed(2)}`,
                  source: 'ai_copilot'
                });
              }
              processedList.push({ id: newAcc.id, name: platName, balance: bal, type: itemType, isCreated: true });
            }
          }

          if (processedList.length > 0) {
            actionResult = {
              type: 'batch_balances_updated',
              data: {
                count: processedList.length,
                items: processedList
              }
            };
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
            onRefresh();
          }
        }
        // 5. Update Account Balance
        else if (act.type === 'update_balance' && act.payload) {
          const targetBal = parseFloat(act.payload.balance) || 0;
          const platformName = (act.payload.platform || '').toLowerCase();
          let matchedAcc: Account | undefined = undefined;
          
          if (platformName.includes('微信') || platformName.includes('零钱')) {
            matchedAcc = accounts.find(a => a.name.includes('微信') || a.name.includes('零钱'));
          } else if (platformName.includes('支付宝') || platformName.includes('余额宝') || platformName.includes('蚂蚁')) {
            matchedAcc = accounts.find(a => a.name.includes('支付宝') || a.name.includes('余额宝'));
          } else if (platformName.includes('华泰') || platformName.includes('证券') || platformName.includes('基金') || platformName.includes('股票')) {
            matchedAcc = accounts.find(a => a.name.includes('华泰') || a.name.includes('证券') || a.name.includes('基金') || a.type === 'investment');
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
                id: matchedAcc.id,
                platform: matchedAcc.name,
                balance: targetBal,
                diff
              }
            };
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
            onRefresh();
          } else {
            const isInv = /基金|证券|华泰|股票|etf|理财/i.test(act.payload.platform || '');
            const createdAcc = await api.createAccount({
              name: act.payload.platform || (isInv ? '华泰证券/基金持仓' : '新增资产账户'),
              type: isInv ? 'investment' : (act.payload.account_type || 'wallet'),
              balance: targetBal,
              currency: 'CNY',
              note: '由 AI 智能管家根据截图创建'
            });

            if (targetBal > 0) {
              await api.createTransaction({
                type: 'income',
                amount: targetBal,
                account_id: createdAcc.id,
                category_name: '余额校准',
                date: getBeijingDateTimeString(),
                merchant: `${createdAcc.name}初始开账`,
                note: `AI 智能开账记录初始余额 ¥${targetBal.toFixed(2)}`,
                source: 'ai_copilot'
              });
            }

            actionResult = {
              type: 'account_created',
              data: {
                id: createdAcc.id,
                name: createdAcc.name,
                type: createdAcc.type,
                balance: targetBal
              }
            };
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
            onRefresh();
          }
        }
        // 6. Delete Transaction
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
        // 7. Set Budget
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
        // 8. Create Goal
        else if (act.type === 'create_goal' && act.payload) {
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
        // 9. Create Recurring Rule
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
        // 10. Investment Holding Created (Single or Batch)
        else if ((act.type === 'create_investment' || act.type === 'batch_create_investments') && act.payload) {
          const rawItems = act.type === 'batch_create_investments' 
            ? (act.payload.items || []) 
            : [act.payload];
          const createdHoldings = [];

          for (const item of rawItems) {
            let matchedAcc = accounts.find(a => 
              a.id === item.account_id || 
              (item.account_name && a.name.includes(item.account_name)) || 
              a.type === 'investment'
            ) || accounts[0];

            const shares = parseFloat(item.shares) || 100;
            const cost = parseFloat(item.cost_price) || 1.0;
            const current = parseFloat(item.current_price) || cost;

            const newInv = await api.addInvestment({
              account_id: matchedAcc?.id || 'acc-1',
              name: item.name || '新增投资标的',
              code: item.code || '000000',
              type: item.type || 'fund',
              shares,
              cost_price: cost,
              current_price: current,
              currency: item.currency || 'CNY'
            });
            createdHoldings.push(newInv);
          }

          // Trigger live refresh
          await refreshInvestmentQuotes(createdHoldings);

          actionResult = {
            type: 'investments_created',
            data: {
              count: createdHoldings.length,
              items: createdHoldings
            }
          };
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          onRefresh();
        }
        // 11. Refresh Investments Real-Time Quotes
        else if (act.type === 'refresh_investments') {
          const res = await refreshInvestmentQuotes(investments);
          actionResult = {
            type: 'investments_refreshed',
            data: {
              updatedCount: res.updatedCount,
              totalMarketVal: res.totalMarketVal,
              totalGain: res.totalGain
            }
          };
          confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
          onRefresh();
        }
        // 12. Delete Investment Holding
        else if (act.type === 'delete_investment' && act.payload) {
          const kw = (act.payload.keyword || act.payload.code || act.payload.name || '').toLowerCase();
          const targetInv = investments.find(i => 
            i.code.toLowerCase().includes(kw) || 
            i.name.toLowerCase().includes(kw)
          );
          if (targetInv) {
            await api.deleteInvestment(targetInv.id);
            await refreshInvestmentQuotes(investments.filter(i => i.id !== targetInv.id));
            actionResult = {
              type: 'investment_deleted',
              data: targetInv
            };
            onRefresh();
          }
        }
        // 13. Create Debt / Loan
        else if (act.type === 'create_debt' && act.payload) {
          const createdDebt = await api.addDebt({
            name: act.payload.name || '新增负债',
            type: act.payload.type || 'mortgage',
            total_principal: parseFloat(act.payload.total_principal) || 100000,
            remaining_principal: parseFloat(act.payload.remaining_principal) || parseFloat(act.payload.total_principal) || 100000,
            interest_rate_annual: parseFloat(act.payload.interest_rate_annual) || 3.5,
            monthly_payment: parseFloat(act.payload.monthly_payment) || 2000,
            start_date: act.payload.start_date || getBeijingDateString(),
            end_date: act.payload.end_date || '2046-12-31',
            account_id: accounts[0]?.id || 'acc-1',
            notes: act.payload.notes || '由 AI 规划录入'
          });

          actionResult = {
            type: 'debt_created',
            data: createdDebt
          };
          confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
          onRefresh();
        }
        // 14. Delete Debt
        else if (act.type === 'delete_debt' && act.payload) {
          const kw = (act.payload.keyword || act.payload.name || '').toLowerCase();
          const targetDebt = debts.find(d => d.name.toLowerCase().includes(kw));
          if (targetDebt) {
            await api.deleteDebt(targetDebt.id);
            actionResult = {
              type: 'debt_deleted',
              data: targetDebt
            };
            onRefresh();
          }
        }
        // 15. Deposit into Goal
        else if (act.type === 'deposit_goal' && act.payload) {
          const kw = (act.payload.goal_name || act.payload.name || '').toLowerCase();
          const amt = parseFloat(act.payload.amount) || 0;
          const targetGoal = goals.find(g => g.name.toLowerCase().includes(kw)) || goals[0];

          if (targetGoal && amt > 0) {
            const updatedCurr = targetGoal.current_amount + amt;
            await api.updateGoal(targetGoal.id, {
              ...targetGoal,
              current_amount: updatedCurr
            });

            actionResult = {
              type: 'goal_deposited',
              data: {
                goalName: targetGoal.name,
                depositAmount: amt,
                newTotal: updatedCurr,
                targetAmount: targetGoal.target_amount
              }
            };
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
            onRefresh();
          }
        }
        // 16. Delete Goal
        else if (act.type === 'delete_goal' && act.payload) {
          const kw = (act.payload.keyword || act.payload.name || '').toLowerCase();
          const targetGoal = goals.find(g => g.name.toLowerCase().includes(kw));
          if (targetGoal) {
            await api.deleteGoal(targetGoal.id);
            actionResult = {
              type: 'goal_deleted',
              data: targetGoal
            };
            onRefresh();
          }
        }
        // 17. Inter-account Funds Transfer
        else if (act.type === 'transfer_funds' && act.payload) {
          const fromName = (act.payload.from_account || '').toLowerCase();
          const toName = (act.payload.to_account || '').toLowerCase();
          const amt = Math.abs(parseFloat(act.payload.amount) || 0);

          const fromAcc = accounts.find(a => a.name.toLowerCase().includes(fromName)) || accounts[0];
          const toAcc = accounts.find(a => a.name.toLowerCase().includes(toName)) || accounts[1];

          if (fromAcc && toAcc && amt > 0) {
            await api.updateAccount(fromAcc.id, { ...fromAcc, balance: fromAcc.balance - amt });
            await api.updateAccount(toAcc.id, { ...toAcc, balance: toAcc.balance + amt });

            await api.createTransaction({
              type: 'transfer',
              amount: amt,
              account_id: fromAcc.id,
              date: getBeijingDateTimeString(),
              merchant: `转账到 ${toAcc.name}`,
              note: act.payload.note || `由 AI 执行账户资金调拨 (${fromAcc.name} -> ${toAcc.name})`,
              source: 'ai_copilot'
            });

            actionResult = {
              type: 'funds_transferred',
              data: {
                fromAccount: fromAcc.name,
                toAccount: toAcc.name,
                amount: amt
              }
            };
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
            onRefresh();
          }
        }
        // 18. Delete Budget
        else if (act.type === 'delete_budget' && act.payload) {
          const catName = act.payload.category_name;
          const targetBudget = budgets.find(b => b.category_name === catName);
          if (targetBudget) {
            await api.deleteBudget(targetBudget.id);
            actionResult = {
              type: 'budget_deleted',
              data: { category_name: catName }
            };
            onRefresh();
          }
        }
        // 19. Create Asset Snapshot
        else if (act.type === 'create_snapshot') {
          const snapshot = await api.createSnapshot(act.payload?.note || 'AI 智能记录资产快照');
          actionResult = {
            type: 'snapshot_created',
            data: snapshot
          };
          confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
          onRefresh();
        }
        // 20. Execute Pending Recurring Rules
        else if (act.type === 'execute_recurring') {
          const res = await api.executeRecurringRules();
          actionResult = {
            type: 'recurring_executed',
            data: res
          };
          confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
          onRefresh();
        }
        // 21. Navigation
        else if (act.type === 'navigate_to' && act.payload?.page) {
          const pageMap: Record<string, string> = {
            dashboard: '首页',
            accounts: '资产账户',
            transactions: '记账明细',
            budgets: '月度预算',
            goals: '存钱目标',
            analytics: '财务图表',
            investments: '投资持仓',
            debts: '负债信贷',
            settings: '系统设置'
          };
          actionResult = {
            type: 'navigated',
            data: { page: act.payload.page, pageName: pageMap[act.payload.page] || act.payload.page }
          };
          onNavigate?.(act.payload.page);
        }
        // 22. Export Data
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[780px]">
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
                {/* Multi-Image Gallery Rendering */}
                {m.imageUrls && m.imageUrls.length > 0 && (
                  <div className={`mb-2 grid gap-1.5 ${
                    m.imageUrls.length === 1 
                      ? 'grid-cols-1 max-w-xs' 
                      : m.imageUrls.length === 2 
                        ? 'grid-cols-2 max-w-xs' 
                        : 'grid-cols-3 max-w-sm'
                  }`}>
                    {m.imageUrls.map((imgUrl: string, i: number) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-white/20 shadow-sm relative group bg-black/20">
                        <img 
                          src={imgUrl} 
                          alt={`截图 ${i + 1}`} 
                          className="w-full h-24 sm:h-28 object-cover rounded-xl" 
                        />
                        <span className="absolute bottom-1 right-1 text-[8px] px-1.5 py-0.5 rounded bg-black/60 text-white font-mono">
                          #{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Legacy single image fallback */}
                {!m.imageUrls && m.imageUrl && (
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

                {/* 3. Account Created Card (Single Account / Investment / Fund) */}
                {m.actionResult && m.actionResult.type === 'account_created' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span>✨ 已成功开立新资产账户</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-300 font-bold">
                        {m.actionResult.data.type === 'investment' ? '📈 投资/基金持仓' : m.actionResult.data.type === 'bank' ? '🏦 银行储蓄' : '💳 电子钱包'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-purple-100 dark:border-purple-800">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {m.actionResult.data.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          已同步录入初始资产并记入总资产
                        </div>
                      </div>
                      <div className="text-sm font-black font-mono text-purple-600 dark:text-purple-300">
                        ¥{m.actionResult.data.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      {m.actionResult.data.type === 'investment' ? (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigate?.('investments');
                            onClose();
                          }}
                          className="flex-1 py-1 px-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-bold shadow-sm flex items-center justify-center gap-1 transition active:scale-95"
                        >
                          <TrendingUp className="w-3 h-3" /> 前往持仓 & 刷新实时行情
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigate?.('accounts');
                            onClose();
                          }}
                          className="flex-1 py-1 px-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shadow-sm flex items-center justify-center gap-1 transition active:scale-95"
                        >
                          <ExternalLink className="w-3 h-3" /> 前往资产账户查看
                        </button>
                      )}
                      {m.actionResult.data.id && (
                        <button
                          type="button"
                          onClick={() => handleUndoAccount(m.actionResult?.data?.id, m.actionResult?.data?.name)}
                          className="py-1 px-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/60 hover:bg-rose-100 hover:text-rose-600 text-purple-700 dark:text-purple-300 text-[10px] font-bold transition active:scale-95"
                          title="撤销并删除该账户"
                        >
                          <Undo2 className="w-3 h-3" /> 撤销
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Batch Balances Updated / Multi-Platform Onboarding Card */}
                {m.actionResult && m.actionResult.type === 'batch_balances_updated' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Layers className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>🎉 多平台资产批量开账完成 (共 {m.actionResult.data.count} 个账户)</span>
                      </div>
                    </div>

                    <div className="space-y-1 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-emerald-100 dark:border-emerald-800 divide-y divide-emerald-100/50 dark:divide-slate-800">
                      {m.actionResult.data.items.map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">{it.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                              {it.type === 'investment' ? '基金/证券' : '钱包'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ¥{it.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate?.('accounts');
                        onClose();
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-sm flex items-center justify-center gap-1 transition active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> 查看全部资产全景
                    </button>
                  </div>
                )}

                {/* 5. Balance Updated Card */}
                {m.actionResult && m.actionResult.type === 'balance_updated' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <WalletCards className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-[11px]">✨ 账户余额已成功校准</div>
                        <div className="text-[10px] text-amber-800 dark:text-amber-300">
                          【{m.actionResult.data.platform}】最新余额：<span className="font-mono font-bold">¥{m.actionResult.data.balance.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate?.('accounts');
                        onClose();
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-600 text-white text-[9px] font-bold flex items-center gap-0.5"
                    >
                      查看 <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                {/* 6. Budget Set Card */}
                {m.actionResult && m.actionResult.type === 'budget_set' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-[11px]">📊 已为您设定月度预算</div>
                        <div className="text-[10px] text-blue-800 dark:text-blue-300">
                          【{m.actionResult.data.category_name}】限额：<span className="font-mono font-bold">¥{m.actionResult.data.amount}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate?.('budgets');
                        onClose();
                      }}
                      className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[9px] font-bold flex items-center gap-0.5"
                    >
                      查看 <ArrowRight className="w-2.5 h-2.5" />
                    </button>
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
                  <div className="mt-2.5 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-[11px]">🎯 已为您立项存钱目标</div>
                        <div className="text-[10px] text-indigo-700 dark:text-indigo-300">
                          【{m.actionResult.data.name}】目标 ¥{m.actionResult.data.target_amount} ({m.actionResult.data.note})
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate?.('goals');
                        onClose();
                      }}
                      className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-[9px] font-bold flex items-center gap-0.5"
                    >
                      查看 <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                {/* 9. Investments Created Card */}
                {m.actionResult && m.actionResult.type === 'investments_created' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <TrendingUp className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span>📈 已成功录入投资标的并拉取实时行情</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-300 font-bold">
                        共 {m.actionResult.data.count} 支
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px] bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-purple-100 dark:border-purple-800">
                      {m.actionResult.data.items.map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{it.name} ({it.code})</span>
                          <span className="font-mono text-purple-600 dark:text-purple-300 font-bold">¥{it.market_value?.toFixed(2) || (it.shares * it.current_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate?.('investments');
                        onClose();
                      }}
                      className="w-full py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition"
                    >
                      <TrendingUp className="w-3 h-3" /> 前往投资持仓查看
                    </button>
                  </div>
                )}

                {/* 10. Investments Refreshed Card */}
                {m.actionResult && m.actionResult.type === 'investments_refreshed' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 space-y-1">
                    <div className="font-bold text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>⚡ 实时行情刷新完成</span>
                    </div>
                    <div className="text-[10px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span>总持仓市值: <strong className="font-mono">¥{m.actionResult.data.totalMarketVal?.toFixed(2)}</strong></span>
                      <span>累计浮盈: <strong className="font-mono">{m.actionResult.data.totalGain >= 0 ? '+' : ''}¥{m.actionResult.data.totalGain?.toFixed(2)}</strong></span>
                    </div>
                  </div>
                )}

                {/* 11. Debt Created Card */}
                {m.actionResult && m.actionResult.type === 'debt_created' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <WalletCards className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>💳 已为您录入负债还款规划</span>
                      </div>
                    </div>
                    <div className="text-[11px] bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-rose-100 dark:border-rose-800 flex items-center justify-between">
                      <span>【{m.actionResult.data.name}】</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-300">月供 ¥{m.actionResult.data.monthly_payment}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate?.('debts');
                        onClose();
                      }}
                      className="w-full py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition"
                    >
                      <span>前往负债与还款规划查看</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* 12. Goal Deposited Card */}
                {m.actionResult && m.actionResult.type === 'goal_deposited' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 space-y-1">
                    <div className="font-bold text-[11px] flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                      <span>🎯 已存入心愿资金 +¥{m.actionResult.data.depositAmount}</span>
                    </div>
                    <div className="text-[10px] text-emerald-800 dark:text-emerald-300">
                      【{m.actionResult.data.goalName}】当前已存：¥{m.actionResult.data.newTotal} / ¥{m.actionResult.data.targetAmount}
                    </div>
                  </div>
                )}

                {/* 13. Funds Transferred Card */}
                {m.actionResult && m.actionResult.type === 'funds_transferred' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-300 dark:border-cyan-700 text-cyan-900 dark:text-cyan-200 space-y-0.5">
                    <div className="font-bold text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                      <span>🔄 账户间资金调拨成功</span>
                    </div>
                    <div className="text-[10px] text-cyan-800 dark:text-cyan-300">
                      从【{m.actionResult.data.fromAccount}】转账 ¥{m.actionResult.data.amount} 至【{m.actionResult.data.toAccount}】
                    </div>
                  </div>
                )}

                {/* 14. Navigated Card */}
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
              <span>AI 多模态多图识别与账本分析中...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            '📸 发送支付宝/微信/证券余额截图帮我开账',
            '🍱 中午吃麦当劳35微信付，买咖啡15',
            '📈 把券商持仓1966.65存到资产里分类为基金',
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

        {/* Multi-Image Attachment Preview Strip */}
        {selectedImages.length > 0 && (
          <div className="px-3.5 py-2.5 bg-purple-50/80 dark:bg-purple-950/50 border-t border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative group flex-shrink-0">
                  <img 
                    src={img} 
                    alt={`预览 ${idx + 1}`} 
                    className="w-12 h-12 rounded-xl object-cover border-2 border-purple-400 dark:border-purple-600 shadow-sm" 
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shadow hover:bg-rose-600 transition"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/60 text-white px-1 rounded font-mono">
                    #{idx + 1}
                  </span>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 text-purple-600 dark:text-purple-400 flex flex-col items-center justify-center text-[9px] font-bold flex-shrink-0 bg-white/50 dark:bg-slate-900/50 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>加图</span>
              </button>
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[10px] font-bold text-purple-900 dark:text-purple-200">
                已选 {selectedImages.length} 张图片
              </span>
              <button
                type="button"
                onClick={() => setSelectedImages([])}
                className="text-[9px] text-rose-500 hover:underline"
              >
                清空全部
              </button>
            </div>
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
            {/* Hidden File Input supporting MULTIPLE images */}
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageFilesChange} 
            />

            {/* Photo / Multi-Image Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2.5 rounded-2xl border transition active:scale-95 shadow-sm flex items-center justify-center flex-shrink-0 ${
                selectedImages.length > 0
                  ? 'border-purple-500 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-400'
              }`}
              title="批量上传多平台资产余额截图或账单小票"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                selectedImages.length > 0 
                  ? `已附加 ${selectedImages.length} 张截图，可输入说明或直接点击发送...` 
                  : config.apiKey 
                    ? "输入指令或点击左侧相机批量发图..." 
                    : "请先在设置中填入 API Key"
              }
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || (!inputText.trim() && selectedImages.length === 0)}
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
