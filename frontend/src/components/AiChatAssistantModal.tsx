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
  Clock,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Account, Transaction, Category, Goal, Budget, RecurringRule, Investment, Debt, AgentChatMessage, AccountType } from '../types';
import { api } from '../api/client';
import { localStore, AiConfig } from '../services/localStore';
import { sendAgentMessage, cleanRepetitiveText } from '../services/aiAgent';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';
import { refreshInvestmentQuotes, resolveSecurityCode } from '../services/marketData';
import { calculateMonthlyCashflowPlan, saveMonthlyPlanConfig } from '../services/repaymentScheduler';
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

/**
 * Intelligent Account Matching & Deduplication Rule
 * - Automatically resolves WeChat aliases ("微信零钱", "微信支付", "微信钱包", "微信零钱通") to existing WeChat account
 * - Automatically resolves Alipay aliases ("支付宝余额", "支付宝总资产", "余额宝") to existing Alipay account
 * - Matches JD Baitiao, Meituan Pay, Douyin Pay, Huabei, Brokers (Huatai, TongHuaShun, etc.)
 */
export function findBestMatchingAccount(name: string, type: string = '', accounts: Account[]): Account | null {
  if (!name || accounts.length === 0) return null;
  const clean = name.trim().toLowerCase();

  // 1. Exact Name match
  const exact = accounts.find(a => a.name.trim().toLowerCase() === clean);
  if (exact) return exact;

  // 2. WeChat matching (e.g. 微信零钱, 微信钱包, 微信零钱通, 微信支付)
  if (clean.includes('微信')) {
    const wxAccs = accounts.filter(a => a.name.includes('微信'));
    if (wxAccs.length === 1) return wxAccs[0];
    if (wxAccs.length > 1) {
      if (clean.includes('零钱通')) {
        const lqt = wxAccs.find(a => a.name.includes('零钱通'));
        if (lqt) return lqt;
      }
      if (clean.includes('分付')) {
        const ff = wxAccs.find(a => a.name.includes('分付'));
        if (ff) return ff;
      }
      return wxAccs[0];
    }
  }

  // 3. Alipay matching
  if (clean.includes('支付宝') || clean.includes('余额宝') || clean.includes('花呗') || clean.includes('借呗')) {
    if (clean.includes('花呗')) {
      const hb = accounts.find(a => a.name.includes('花呗'));
      if (hb) return hb;
    }
    if (clean.includes('借呗')) {
      const jb = accounts.find(a => a.name.includes('借呗'));
      if (jb) return jb;
    }
    const alipayAccs = accounts.filter(a => a.name.includes('支付宝') || a.name.includes('余额宝'));
    if (alipayAccs.length === 1) return alipayAccs[0];
    if (alipayAccs.length > 1) {
      if (clean.includes('余额宝')) {
        const yeb = alipayAccs.find(a => a.name.includes('余额宝'));
        if (yeb) return yeb;
      }
      return alipayAccs[0];
    }
  }

  // 4. Consumer loans
  if (clean.includes('白条')) {
    const bt = accounts.find(a => a.name.includes('白条'));
    if (bt) return bt;
  }
  if (clean.includes('美团')) {
    const mt = accounts.find(a => a.name.includes('美团'));
    if (mt) return mt;
  }
  if (clean.includes('抖音')) {
    const dy = accounts.find(a => a.name.includes('抖音'));
    if (dy) return dy;
  }

  // 5. Securities & Brokers
  if (clean.includes('华泰') || clean.includes('涨乐')) {
    const ht = accounts.find(a => a.name.includes('华泰'));
    if (ht) return ht;
  }
  if (clean.includes('同花顺')) {
    const ths = accounts.find(a => a.name.includes('同花顺'));
    if (ths) return ths;
  }
  if (clean.includes('东方财富') || clean.includes('东财')) {
    const dfcf = accounts.find(a => a.name.includes('东方财富') || a.name.includes('东财'));
    if (dfcf) return dfcf;
  }

  // 6. Substring match
  const sub = accounts.find(a => a.name.toLowerCase().includes(clean) || clean.includes(a.name.toLowerCase()));
  if (sub) return sub;

  return null;
}

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
  const [capabilityFilter, setCapabilityFilter] = useState<'all' | 'vision' | 'text'>('all');
  const [modelSwitchToast, setModelSwitchToast] = useState<string>('');
  const [collapsedReasonings, setCollapsedReasonings] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleReasoningCollapse = (msgId: string) => {
    setCollapsedReasonings(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleScrollContainer = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    userScrolledUpRef.current = !isNearBottom;
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

  const scrollToBottom = (force = false) => {
    if (!force && userScrolledUpRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom(false), 100);
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

        let targetAcc: Account | undefined = undefined;
        if (payload.target_account_id && payload.target_account_id !== '__new__') {
          targetAcc = accounts.find(a => a.id === payload.target_account_id);
        } else if (!payload.target_account_id) {
          targetAcc = findBestMatchingAccount(accName, accType, accounts) || undefined;
        }

        if (targetAcc && payload.target_account_id !== '__new__') {
          const diff = bal - targetAcc.balance;
          await api.updateAccount(targetAcc.id, {
            ...targetAcc,
            name: targetAcc.name,
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
              merchant: `${targetAcc.name}余额覆盖校准`,
              note: `根据截图覆盖更新 (原: ¥${targetAcc.balance.toFixed(2)} -> 最新覆盖为: ¥${bal.toFixed(2)})`,
              source: 'ai_copilot'
            });
          }
          actionResult = {
            type: 'balance_updated',
            data: { id: targetAcc.id, platform: targetAcc.name, type: accType, balance: bal }
          };
        } else {
          const createdAcc = await api.createAccount({
            name: accName,
            type: accType as any,
            balance: bal,
            currency: payload.currency || 'CNY',
            note: payload.note || `由 AI 识别开立 (${isLiability ? '消费信贷负债' : '独立资产账户'})`
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

          const matched = (item.target_account_id && item.target_account_id !== '__new__')
            ? accounts.find(a => a.id === item.target_account_id)
            : (item.target_account_id === '__new__' ? null : findBestMatchingAccount(platName, itemType, accounts));

          if (matched) {
            const diff = bal - matched.balance;
            await api.updateAccount(matched.id, { ...matched, balance: bal });
            if (Math.abs(diff) > 0.01) {
              await api.createTransaction({
                type: isLiability ? 'repayment' : (diff > 0 ? 'income' : 'expense'),
                amount: Math.abs(diff),
                account_id: matched.id,
                category_name: '余额校准',
                date: getBeijingDateTimeString(),
                merchant: `${matched.name}余额覆盖校准`,
                note: `批量识别覆盖更新 (原: ¥${matched.balance.toFixed(2)} -> 覆盖为: ¥${bal.toFixed(2)})`,
                source: 'ai_copilot'
              });
            }
            processedList.push({ name: matched.name, balance: bal, type: itemType, isUpdated: true });
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
        const brokerCash = availableCash > 0 ? availableCash : Math.max(0, totalAssets - totalMarketValue);
        const finalBrokerBalance = totalMarketValue + brokerCash;

        if (!brokerAcc) {
          brokerAcc = await api.createAccount({
            name: brokerName,
            type: 'investment',
            balance: finalBrokerBalance,
            cash_balance: brokerCash,
            currency: 'CNY',
            note: `券商账户 (含持仓市值 + 可用现金 ¥${brokerCash.toFixed(2)})`
          });
        } else {
          await api.updateAccount(brokerAcc.id, {
            ...brokerAcc,
            name: brokerName,
            balance: finalBrokerBalance,
            cash_balance: brokerCash,
            note: `券商账户 (含持仓市值 + 可用现金 ¥${brokerCash.toFixed(2)})`
          });
        }

        // 2. Add or update each investment holding linked to this broker account
        const createdInvestments: Investment[] = [];
        const existingInvs = localStore.getInvestments();

        for (const it of items) {
          const shares = parseFloat(it.shares) || 100;
          const cost = parseFloat(it.cost_price) || 1.0;
          const currentPrice = parseFloat(it.current_price) || cost;
          const resolvedCode = resolveSecurityCode(it.name || '', it.code);
          const resolvedName = it.name || (resolvedCode === '159941' ? '纳指ETF广发' : resolvedCode === '513500' ? '标普500ETF博时' : '投资标的');

          const existingMatch = existingInvs.find(i => i.account_id === brokerAcc.id && i.code === resolvedCode);
          let invRecord: Investment;

          if (existingMatch) {
            existingMatch.name = resolvedName;
            existingMatch.shares = shares;
            existingMatch.cost_price = cost;
            existingMatch.current_price = currentPrice;
            existingMatch.total_cost = shares * cost;
            existingMatch.market_value = shares * currentPrice;
            existingMatch.floating_pnl = (currentPrice - cost) * shares;
            existingMatch.pnl_rate = cost > 0 ? ((currentPrice - cost) / cost) * 100 : 0;
            await api.updateInvestment(existingMatch.id, existingMatch);
            invRecord = existingMatch;
          } else {
            invRecord = await api.addInvestment({
              account_id: brokerAcc.id,
              name: resolvedName,
              code: resolvedCode,
              type: it.type || (resolvedName.includes('ETF') || resolvedName.includes('基金') ? 'fund' : 'stock_a'),
              shares,
              cost_price: cost,
              current_price: currentPrice,
              currency: 'CNY'
            });
          }
          createdInvestments.push(invRecord);
        }

        // 3. Clean up any invalid duplicates with identical codes in the same account
        const deduplicatedInvs: Investment[] = [];
        const seenCodes = new Set<string>();
        for (const inv of localStore.getInvestments()) {
          const key = `${inv.account_id}:::${inv.code}`;
          if (seenCodes.has(key)) {
            continue;
          }
          seenCodes.add(key);
          deduplicatedInvs.push(inv);
        }
        localStore.saveInvestments(deduplicatedInvs);

        // 4. Immediately refresh live market quotes
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
      // 6. Debt & Installments
      else if (act.type === 'create_debt') {
        const p = act.payload;
        const tot = parseFloat(p.total_principal) || 1000;
        const periods = parseInt(p.total_installments) || 1;
        const monthly = parseFloat(p.monthly_payment) || (periods > 1 ? Number((tot / periods).toFixed(2)) : tot);
        const createdDebt = await api.addDebt({
          name: p.name || '消费分期账单',
          type: p.type || 'huabei',
          total_principal: tot,
          remaining_principal: parseFloat(p.remaining_principal) || tot,
          total_installments: periods,
          current_installment: parseInt(p.current_installment) || 1,
          monthly_payment: monthly,
          repay_day: parseInt(p.repay_day) || 10,
          interest_rate_annual: parseFloat(p.interest_rate_annual) || 0,
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
      // 6.1 Set Monthly Income Plan
      else if (act.type === 'set_monthly_income_plan') {
        const p = act.payload;
        const salary = parseFloat(p.expected_salary) || 8000;
        const addInc = parseFloat(p.additional_income) || 0;
        const cfg = saveMonthlyPlanConfig({ expected_salary: salary, additional_income: addInc });
        actionResult = {
          type: 'monthly_plan_set',
          data: cfg
        };
      }
      // 6.2 Mark Debt Repaid & Deduct Principal & Record Repayment
      else if (act.type === 'mark_debt_repaid') {
        const p = act.payload;
        const dName = (p.debt_name || '').toLowerCase();
        const currentDebts = localStore.getDebts();
        const target = currentDebts.find(d => d.name.toLowerCase().includes(dName) || dName.includes(d.name.toLowerCase()))
          || currentDebts[0];

        if (target) {
          const repayAmt = parseFloat(p.repay_amount) || target.monthly_payment || 0;
          const oldRemaining = target.remaining_principal || 0;
          const newRemaining = Math.max(0, oldRemaining - repayAmt);
          const newRemainingMonths = Math.max(0, (target.remaining_months || 1) - 1);
          const newCurrentInstallment = (target.current_installment || 1) + 1;

          const updated = await api.updateDebt(target.id, {
            remaining_principal: newRemaining,
            remaining_months: newRemainingMonths,
            current_installment: newCurrentInstallment,
            is_repaid_this_month: p.is_repaid !== false
          });

          // Also optionally record repayment transaction and deduct payment account balance
          let deductedAccountName = '';
          if (p.record_transaction !== false && repayAmt > 0) {
            const payAccName = (p.payment_account_name || '').toLowerCase();
            const accounts = localStore.getAccounts();
            const payAcc = (payAccName ? accounts.find(a => a.name.toLowerCase().includes(payAccName) || payAccName.includes(a.name.toLowerCase())) : null)
              || accounts.find(a => ['wallet', 'bank'].includes(a.type))
              || accounts[0];

            if (payAcc) {
              deductedAccountName = payAcc.name;
              await api.createTransaction({
                type: 'expense',
                amount: repayAmt,
                account_id: payAcc.id,
                category_name: '金融还款',
                date: getBeijingDateTimeString(),
                merchant: `${target.name}还款`,
                note: `AI智能还款销账 | 冲减本金¥${repayAmt.toFixed(2)} | 剩余待还本金¥${newRemaining.toFixed(2)}`,
                source: 'ai_copilot'
              });
              // Update payment account balance
              await api.updateAccount(payAcc.id, {
                ...payAcc,
                balance: payAcc.balance - repayAmt
              });
            }
          }

          actionResult = {
            type: 'debt_repaid_marked',
            data: {
              ...updated,
              repaid_amount: repayAmt,
              old_remaining: oldRemaining,
              new_remaining: newRemaining,
              deducted_account: deductedAccountName
            }
          };
        } else {
          actionResult = {
            type: 'debt_repaid_marked',
            data: { name: p.debt_name || '花呗分期', is_repaid_this_month: true, repaid_amount: 0, old_remaining: 0, new_remaining: 0 }
          };
        }
      }
      // 6.3 Generate / Multi-turn Financial Budget Plan
      else if (act.type === 'generate_monthly_budget_plan') {
        const p = act.payload;
        const salary = parseFloat(p.expected_salary) || 8000;
        const addInc = parseFloat(p.additional_income) || 0;
        const savings = parseFloat(p.savings_target) || 0;
        
        // 1. Save monthly plan config
        saveMonthlyPlanConfig({ 
          expected_salary: salary, 
          additional_income: addInc,
          include_installments_in_budget: true
        });

        // 2. Batch create / update category budgets
        const rawBudgets = p.budgets || [];
        const appliedBudgets: any[] = [];
        for (const b of rawBudgets) {
          const cName = b.category_name || '';
          const targetCat = categories.find(c => c.name.includes(cName) || cName.includes(c.name));
          if (targetCat) {
            const saved = await api.setBudget({
              category_id: targetCat.id,
              amount: parseFloat(b.amount) || 0,
              period: 'monthly'
            });
            appliedBudgets.push({ ...saved, category_name: targetCat.name });
          }
        }

        // 3. Create or update savings goal if savings_target > 0
        if (savings > 0) {
          const currentGoals = localStore.getGoals();
          const targetGoal = currentGoals.find(g => g.name.includes('月存') || g.name.includes('储蓄') || g.name.includes('攒钱'));
          if (targetGoal) {
            await api.updateGoal(targetGoal.id, { target_amount: targetGoal.target_amount + savings });
          } else {
            await api.addGoal({
              name: '每月稳健储蓄计划',
              target_amount: savings * 12,
              current_amount: 0,
              target_date: '2026-12-31',
              color: 'emerald'
            });
          }
        }

        actionResult = {
          type: 'monthly_budget_plan_applied',
          data: {
            plan_title: p.plan_title || '月度全套财务预算方案',
            expected_salary: salary,
            additional_income: addInc,
            savings_target: savings,
            applied_budgets: appliedBudgets,
            summary_advice: p.summary_advice
          }
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
          if (field === 'name' && (!currentItems[itemIdx].code || currentItems[itemIdx].code === '159941')) {
            currentItems[itemIdx].code = resolveSecurityCode(value);
          }
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
            budgets: '月度预算', planner: '月度资金规划与分期大厅', goals: '存钱目标', 
            analytics: '财务图表', investments: '投资持仓', debts: '负债信贷', settings: '系统设置'
          };
          actionResult = {
            type: 'navigated',
            data: { page: act.payload.page, pageName: pageMap[act.payload.page] || act.payload.page }
          };
          onNavigate?.(act.payload.page);
        } else if (act.type === 'get_monthly_cashflow_plan') {
          const plan = calculateMonthlyCashflowPlan(debts, budgets, transactions);
          actionResult = {
            type: 'cashflow_plan_retrieved',
            data: plan
          };
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
        } else if (act.type === 'update_transaction') {
          const p = act.payload || {};
          let targetTx: Transaction | undefined = undefined;
          if (p.transaction_id) {
            targetTx = transactions.find(t => t.id === p.transaction_id);
          }
          if (!targetTx && p.merchant) {
            targetTx = transactions.find(t => t.merchant && t.merchant.includes(p.merchant));
          }
          if (!targetTx && p.amount) {
            targetTx = transactions.find(t => Math.abs(t.amount - Math.abs(p.amount)) < 0.01);
          }
          if (!targetTx && transactions.length > 0) {
            targetTx = transactions[0];
          }

          if (targetTx) {
            const catObj = categories.find(c => c.name === p.category);
            const oldCat = targetTx.category_name;
            const newCat = p.category || (catObj ? catObj.name : '医疗健康');
            const updated = await api.updateTransaction(targetTx.id, {
              ...targetTx,
              category_name: newCat,
              category_id: catObj?.id || targetTx.category_id,
              merchant: p.merchant || targetTx.merchant,
              amount: p.amount ? Math.abs(p.amount) : targetTx.amount,
              note: p.note || targetTx.note
            });
            actionResult = {
              type: 'transaction_updated',
              data: {
                id: targetTx.id,
                merchant: updated.merchant,
                oldCategory: oldCat,
                newCategory: newCat,
                amount: updated.amount
              }
            };
            confetti({ particleCount: 60, spread: 45, origin: { y: 0.6 } });
            onRefresh();
          }
        } else if (act.type === 'delete_transaction') {
          let targetTx: Transaction | undefined = undefined;
          if (act.payload?.transaction_id) {
            targetTx = transactions.find(t => t.id === act.payload.transaction_id);
          }
          if (!targetTx && act.payload?.merchant) {
            targetTx = transactions.find(t => t.merchant && t.merchant.includes(act.payload.merchant));
          }
          if (!targetTx && transactions.length > 0) {
            targetTx = transactions[0];
          }
          if (targetTx) {
            await api.deleteTransaction(targetTx.id);
            actionResult = {
              type: 'transaction_deleted',
              data: { id: targetTx.id, merchant: targetTx.merchant, amount: targetTx.amount }
            };
            onRefresh();
          }
        } else {
          // All data creation / modifications are STAGED for user editable confirmation!
          const stagedPayload = { ...(act.payload || {}) };
          if (act.type === 'create_account' || act.type === 'update_balance') {
            const accName = stagedPayload.name || stagedPayload.platform || '';
            const matched = findBestMatchingAccount(accName, stagedPayload.type || stagedPayload.account_type, accounts);
            if (matched) {
              stagedPayload.target_account_id = matched.id;
              stagedPayload.matched_account_name = matched.name;
              stagedPayload.existing_balance = matched.balance;
            } else {
              stagedPayload.target_account_id = '__new__';
            }
          } else if (act.type === 'batch_create_accounts' || act.type === 'batch_update_balances') {
            const rawList = stagedPayload.accounts || stagedPayload.updates || [];
            stagedPayload.accounts = rawList.map((it: any) => {
              const pName = it.platform || it.name || '';
              const matched = findBestMatchingAccount(pName, it.account_type || it.type, accounts);
              return {
                ...it,
                target_account_id: matched ? matched.id : '__new__',
                matched_account_name: matched ? matched.name : undefined,
                existing_balance: matched ? matched.balance : undefined
              };
            });
          } else if (act.type === 'batch_create_investments' || act.type === 'create_investment') {
            const rawItems = act.type === 'batch_create_investments' ? (stagedPayload.items || []) : [stagedPayload];
            stagedPayload.items = rawItems.map((it: any) => ({
              ...it,
              code: resolveSecurityCode(it.name || '', it.code)
            }));
          }
          pendingAction = {
            ...act,
            payload: stagedPayload,
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
                        {currentModel?.vision ? (
                          <span className="text-[7px] px-1 py-0.2 rounded bg-emerald-200 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">👁️看图</span>
                        ) : (
                          <span className="text-[7px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">📝文本</span>
                        )}
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
            <div className="mt-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-purple-800/80 shadow-xl space-y-2.5 animate-in slide-in-from-top-2 duration-150">
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

              {/* Capability Filter Tabs: 全部 | 👁️ 支持看图 | 📝 纯文本 */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setCapabilityFilter('all')}
                  className={`flex-1 py-1 rounded-lg transition text-center ${
                    capabilityFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => setCapabilityFilter('vision')}
                  className={`flex-1 py-1 rounded-lg transition text-center flex items-center justify-center gap-1 ${
                    capabilityFilter === 'vision'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>👁️ 可看图</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCapabilityFilter('text')}
                  className={`flex-1 py-1 rounded-lg transition text-center flex items-center justify-center gap-1 ${
                    capabilityFilter === 'text'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>📝 纯文本</span>
                </button>
              </div>

              {/* Models List under Selected Provider */}
              <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                {(() => {
                  const prov = AI_PROVIDERS.find(p => p.id === selectedProviderId) || AI_PROVIDERS[0];
                  const hasKey = !!(aiConfig.providerKeys?.[prov.id] || (prov.id === aiConfig.provider ? aiConfig.apiKey : ''));

                  const filteredModels = prov.models.filter(m => {
                    if (capabilityFilter === 'vision') return m.vision;
                    if (capabilityFilter === 'text') return !m.vision;
                    return true;
                  });

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

                      {filteredModels.length === 0 && (
                        <div className="p-3 text-center text-[10px] text-slate-400">
                          当前厂商暂无该类型的模型，请切换筛选或选择其他厂商
                        </div>
                      )}

                      {filteredModels.map(m => {
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[11px] font-bold ${isCurrent ? 'text-purple-900 dark:text-purple-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {m.name}
                                </span>

                                {/* Distinct, Clean Capability Tag */}
                                {m.vision ? (
                                  <span className="text-[8px] px-1.5 py-0.2 rounded-md font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 flex items-center gap-0.5">
                                    👁️ 可看图
                                  </span>
                                ) : (
                                  <span className="text-[8px] px-1.5 py-0.2 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-0.5">
                                    📝 纯文本
                                  </span>
                                )}

                                {m.tag && (
                                  <span className={`text-[8px] px-1.5 py-0.2 rounded-md font-bold ${
                                    m.tagColor === 'purple' ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300' :
                                    m.tagColor === 'blue' ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300' :
                                    m.tagColor === 'amber' ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300' :
                                    m.tagColor === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' :
                                    m.tagColor === 'cyan' ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300' :
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
        <div 
          ref={scrollContainerRef}
          onScroll={handleScrollContainer}
          className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 text-xs"
        >
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

                        {/* Target Account Selector: Overwrite vs New Account */}
                        <div className="p-2 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <label className="text-purple-900 dark:text-purple-200 font-bold flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 text-purple-600" />
                              <span>录入规则与目标账户</span>
                            </label>
                            {m.pendingAction.payload.target_account_id && m.pendingAction.payload.target_account_id !== '__new__' ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                🔄 覆盖更新 (不重复累加)
                              </span>
                            ) : (
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                ➕ 开立新独立账户
                              </span>
                            )}
                          </div>
                          <select
                            value={m.pendingAction.payload.target_account_id || '__new__'}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdatePendingField(m.id, 'target_account_id', val);
                              if (val !== '__new__') {
                                const acc = accounts.find(a => a.id === val);
                                if (acc) {
                                  handleUpdatePendingField(m.id, 'matched_account_name', acc.name);
                                  handleUpdatePendingField(m.id, 'existing_balance', acc.balance);
                                }
                              }
                            }}
                            className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                          >
                            {accounts.map(a => (
                              <option key={a.id} value={a.id}>
                                🔄 覆盖已有账户：{a.name} (当前余额 ¥{a.balance.toFixed(2)})
                              </option>
                            ))}
                            <option value="__new__">
                              ➕ 新建独立账户 (如第2个微信/支付宝号)
                            </option>
                          </select>
                          {m.pendingAction.payload.target_account_id && m.pendingAction.payload.target_account_id !== '__new__' && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono pt-0.5">
                              <span>原余额: ¥{(m.pendingAction.payload.existing_balance ?? 0).toFixed(2)}</span>
                              <span className="text-purple-600 dark:text-purple-400 font-bold">➔ 覆盖为: ¥{parseFloat(m.pendingAction.payload.balance || 0).toFixed(2)}</span>
                            </div>
                          )}
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

                              {/* Row 3: Target Account Rule for Batch Item */}
                              <div className="flex items-center gap-2 pt-0.5">
                                <select
                                  value={it.target_account_id || '__new__'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateBatchItemField(m.id, idx, 'target_account_id', val);
                                    if (val !== '__new__') {
                                      const acc = accounts.find(a => a.id === val);
                                      if (acc) {
                                        handleUpdateBatchItemField(m.id, idx, 'matched_account_name', acc.name);
                                        handleUpdateBatchItemField(m.id, idx, 'existing_balance', acc.balance);
                                      }
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                                >
                                  {accounts.map(a => (
                                    <option key={a.id} value={a.id}>
                                      🔄 覆盖已有：{a.name} (原¥{a.balance.toFixed(2)})
                                    </option>
                                  ))}
                                  <option value="__new__">➕ 开立独立新账户</option>
                                </select>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  it.target_account_id && it.target_account_id !== '__new__'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                }`}>
                                  {it.target_account_id && it.target_account_id !== '__new__' ? '覆盖更新' : '新建独立'}
                                </span>
                              </div>

                              {/* Row 4: Holdings (if any) */}
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

                    {/* Debt & Installment Staging Card */}
                    {m.pendingAction.type === 'create_debt' && (
                      <div className="space-y-2 bg-white/90 dark:bg-slate-900/90 p-3 rounded-2xl border border-rose-300 dark:border-rose-700 text-xs">
                        <div className="flex items-center gap-1.5 font-black text-rose-900 dark:text-rose-200">
                          <CreditCard className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          <span>💳 负债与分期还款待录入：</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">账单/平台名称</label>
                            <input
                              type="text"
                              value={m.pendingAction.payload.name || ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'name', e.target.value)}
                              placeholder="花呗分期 / 京东白条"
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">总金额 (¥)</label>
                            <input
                              type="number"
                              step="any"
                              value={m.pendingAction.payload.total_principal ?? ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'total_principal', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-xs text-rose-600 dark:text-rose-400 text-right"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">分期期数</label>
                            <input
                              type="number"
                              min="1"
                              value={m.pendingAction.payload.total_installments ?? 1}
                              onChange={(e) => handleUpdatePendingField(m.id, 'total_installments', parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">每期月供 (¥)</label>
                            <input
                              type="number"
                              step="any"
                              value={m.pendingAction.payload.monthly_payment ?? ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'monthly_payment', parseFloat(e.target.value) || 0)}
                              placeholder="自动计算"
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-right font-bold text-rose-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">还款日(号)</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={m.pendingAction.payload.repay_day ?? 10}
                              onChange={(e) => handleUpdatePendingField(m.id, 'repay_day', parseInt(e.target.value) || 10)}
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-center font-bold text-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Set Monthly Salary Staging Card */}
                    {m.pendingAction.type === 'set_monthly_income_plan' && (
                      <div className="space-y-2 bg-white/90 dark:bg-slate-900/90 p-3 rounded-2xl border border-emerald-300 dark:border-emerald-700 text-xs">
                        <div className="flex items-center gap-1.5 font-black text-emerald-900 dark:text-emerald-200">
                          <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>💼 每月基准工资与入账规划待设定：</span>
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block mb-0.5">预计每月到手工资 (¥)</label>
                          <input
                            type="number"
                            step="any"
                            value={m.pendingAction.payload.expected_salary ?? ''}
                            onChange={(e) => handleUpdatePendingField(m.id, 'expected_salary', parseFloat(e.target.value) || 0)}
                            placeholder="例如 8500"
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 text-right"
                          />
                        </div>
                      </div>
                    )}

                    {/* Mark Debt Repaid Staging Card */}
                    {m.pendingAction.type === 'mark_debt_repaid' && (
                      <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-teal-300 dark:border-teal-700 text-xs space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-200">
                            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                            <span>💳 还款销账待确认：【{m.pendingAction.payload.debt_name}】</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold">
                            冲减待还本金
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">还款金额 (¥)</label>
                            <input
                              type="number"
                              step="any"
                              value={m.pendingAction.payload.repay_amount ?? ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'repay_amount', parseFloat(e.target.value) || 0)}
                              placeholder="默认当期月供"
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs text-teal-600 text-right"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">付款资金账户</label>
                            <select
                              value={m.pendingAction.payload.payment_account_name || ''}
                              onChange={(e) => handleUpdatePendingField(m.id, 'payment_account_name', e.target.value)}
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                            >
                              <option value="">自动首选账户 (微信/支付宝)</option>
                              {accounts.map(a => (
                                <option key={a.id} value={a.name}>{a.name} (余¥{a.balance.toFixed(0)})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                          <span>确认后将真实扣减负债总金额、递减剩余期数，并在资金大厅释放当月现金流！</span>
                        </div>
                      </div>
                    )}

                    {/* Generate Monthly Budget Plan Staging Card */}
                    {m.pendingAction.type === 'generate_monthly_budget_plan' && (
                      <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-indigo-300 dark:border-indigo-700 text-xs space-y-3 shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <span>📊 {m.pendingAction.payload.plan_title || '月度全套财务预算方案建议'}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold">
                            可直接语音/打字微调
                          </span>
                        </div>

                        {/* Top Highlights */}
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                            <div className="text-[9px] text-slate-400">预期到手月薪</div>
                            <div className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                              ¥{(m.pendingAction.payload.expected_salary || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                            <div className="text-[9px] text-slate-400">建议存钱目标</div>
                            <div className="text-xs font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                              ¥{(m.pendingAction.payload.savings_target || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                            <div className="text-[9px] text-slate-400">日常总预算</div>
                            <div className="text-xs font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                              ¥{((m.pendingAction.payload.budgets || []).reduce((s: number, b: any) => s + (parseFloat(b.amount) || 0), 0)).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Budget list */}
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[10px] font-bold text-slate-400">各项分类预算规划明细：</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(m.pendingAction.payload.budgets || []).map((b: any, idx: number) => (
                              <div key={idx} className="p-1.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
                                  {b.category_name}
                                </span>
                                <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                                  ¥{parseFloat(b.amount || 0).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Speech hint */}
                        <div className="p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                          💡 <b>多轮对话微调提示</b>：您可以直接在下方回复或语音说：<i>“把餐饮调到1500，匀给存钱”</i> 或 <i>“加一个500块的数码预算”</i>，AI 会立刻实时调整！
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

                {/* Transaction Updated Result Card */}
                {m.actionResult && m.actionResult.type === 'transaction_updated' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <ReceiptText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>✅ 交易流水分类已精准更新！</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                        {m.actionResult.data.merchant}
                      </span>
                    </div>
                    <div className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-emerald-100 dark:border-emerald-800/50 text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="text-slate-400 line-through text-[11px]">{m.actionResult.data.oldCategory || '未分类'}</span>
                          <span className="text-emerald-500 font-bold">➔</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                            {m.actionResult.data.newCategory}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          金额: ¥{Number(m.actionResult.data.amount || 0).toFixed(2)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate?.('transactions');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                      >
                        前往明细查看
                      </button>
                    </div>
                  </div>
                )}

                {/* Transaction Deleted Result Card */}
                {m.actionResult && m.actionResult.type === 'transaction_deleted' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-200 flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>🗑️ 已删除交易：{m.actionResult.data.merchant} (¥{Number(m.actionResult.data.amount || 0).toFixed(2)})</span>
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

                {/* 1. Debt & Installment Created Result */}
                {m.actionResult && m.actionResult.type === 'debt_created' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-rose-50 to-purple-50 dark:from-rose-950/50 dark:to-purple-950/50 border border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <CreditCard className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>💳 分期账单已成功录入负债日程！</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                        {m.actionResult.data.name}
                      </span>
                    </div>
                    <div className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-rose-100 dark:border-rose-800/50 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          总金额: ¥{m.actionResult.data.total_principal.toFixed(2)}
                          {m.actionResult.data.total_installments > 1 && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                              共{m.actionResult.data.total_installments}期
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          每月{m.actionResult.data.repay_day || 10}号还款 • 每期月供 ¥{m.actionResult.data.monthly_payment.toFixed(2)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate?.('planner');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition"
                      >
                        去资金大厅查看
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Monthly Salary Set Result */}
                {m.actionResult && m.actionResult.type === 'monthly_plan_set' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>💼 每月基准到手工资与收入规划已更新！</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ¥{m.actionResult.data.expected_salary.toFixed(2)}/月
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>系统已将该收入自动联动至月度自由现金流测算</span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate?.('planner');
                        }}
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                      >
                        前往规划大厅 ➔
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Debt Repaid Marked Result */}
                {m.actionResult && m.actionResult.type === 'debt_repaid_marked' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/50 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        <span>✅ 【{m.actionResult.data.name}】已成功销账还款！</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-200/60 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold">
                        负债已真实冲减
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-teal-100 dark:border-teal-800/40 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold">
                          本次还款：<span className="font-mono font-bold text-teal-600 dark:text-teal-400">¥{(m.actionResult.data.repaid_amount || 0).toFixed(2)}</span>
                          {m.actionResult.data.deducted_account && (
                            <span className="ml-1.5 text-[10px] text-slate-400">({m.actionResult.data.deducted_account}扣款)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          待还总本金：¥{(m.actionResult.data.old_remaining || 0).toFixed(2)} ➔ <span className="text-emerald-600 font-bold">¥{(m.actionResult.data.new_remaining || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate?.('planner');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] transition"
                      >
                        看资金大厅 ➔
                      </button>
                    </div>
                  </div>
                )}

                {/* 3.1 Monthly Budget Plan Applied Result */}
                {m.actionResult && m.actionResult.type === 'monthly_budget_plan_applied' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 border border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>🎉 {m.actionResult.data.plan_title} 已全量生效！</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold">
                        官方预算已生效
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-purple-100 dark:border-purple-800/40 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span>月薪基准: <b className="font-mono text-emerald-600">¥{m.actionResult.data.expected_salary?.toLocaleString()}</b></span>
                        {m.actionResult.data.savings_target > 0 && (
                          <span>月存目标: <b className="font-mono text-amber-600">¥{m.actionResult.data.savings_target?.toLocaleString()}</b></span>
                        )}
                        <span>已设定 <b className="font-mono text-purple-600">{m.actionResult.data.applied_budgets?.length || 0}</b> 项分类预算</span>
                      </div>
                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigate?.('planner');
                          }}
                          className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                        >
                          前往月度规划大厅查看 ➔
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Cashflow Plan Diagnosis Result */}
                {m.actionResult && m.actionResult.type === 'cashflow_plan_retrieved' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-500/30 shadow-md space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{m.actionResult.data.period} 月度资金与现金流诊断</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-bold">
                        {m.actionResult.data.healthMessage}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/10 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-indigo-200">本月预计剩余安全自由资金</div>
                        <div className="text-lg font-mono font-black text-emerald-400">
                          ¥{m.actionResult.data.safeFreeCashflow.toFixed(2)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate?.('planner');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition shadow"
                      >
                        查看详细规划 ➔
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center pt-1 border-t border-white/10">
                      <div>
                        <div className="text-slate-400">预计入账</div>
                        <div className="font-mono font-bold text-emerald-300">¥{m.actionResult.data.totalIncome.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">本月信贷待还</div>
                        <div className="font-mono font-bold text-rose-300">¥{m.actionResult.data.thisMonthDueAmount.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">日常已花</div>
                        <div className="font-mono font-bold text-amber-300">¥{m.actionResult.data.livingExpensesSpent.toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Navigated Result Card */}
                {m.actionResult && m.actionResult.type === 'navigated' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                      <span>已带你前往【{m.actionResult.data.pageName}】页面</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onClose()}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      关闭弹窗查看
                    </button>
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
          <div className="border-t border-purple-100 dark:border-purple-900/50 bg-purple-50/70 dark:bg-purple-950/30">
            {(() => {
              const currentProv = AI_PROVIDERS.find(p => p.id === aiConfig.provider) || AI_PROVIDERS[0];
              const currentModel = currentProv.models.find(m => m.id === aiConfig.model) || currentProv.models[0];
              if (!currentModel?.vision) {
                return (
                  <div className="px-4 py-1.5 bg-amber-100/90 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800 text-[10px] text-amber-800 dark:text-amber-200 flex items-center justify-between">
                    <span className="truncate">⚠️ 当前模型【{currentModel?.name || aiConfig.model}】为纯文本，识别图片需切换为支持看图的模型</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCapabilityFilter('vision');
                        setModelSelectorOpen(true);
                      }}
                      className="ml-2 font-bold underline text-purple-700 dark:text-purple-300 flex-shrink-0"
                    >
                      切换为看图模型 →
                    </button>
                  </div>
                );
              }
              return null;
            })()}
            <div className="p-2.5 px-4 flex items-center gap-2 overflow-x-auto">
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
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          {/* Quick Action Suggestion Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {[
              '📅 测算我这个月还剩多少钱能花？',
              '💳 记花呗分期1200元分3期每月9号还400',
              '💼 把我每月预计工资设为8500元',
              '带我去月度资金规划大厅'
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                className="flex-shrink-0 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/40 dark:hover:text-purple-300 text-slate-600 dark:text-slate-300 transition active:scale-95 border border-slate-200/60 dark:border-slate-700/60 font-medium"
              >
                {chip}
              </button>
            ))}
          </div>

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
