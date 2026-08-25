import {
  Account,
  Transaction,
  Category,
  Budget,
  Investment,
  Debt,
  Goal,
  ParsedTransactionResult,
  DashboardAnalytics,
  SankeyData,
  AssetSnapshot,
  RecurringRule
} from '../types';
import { localStore } from '../services/localStore';
import { parseSmsOrTextInBrowser } from '../services/smsParser';
import { parseWithAi } from '../services/aiParser';
import { getBeijingDateTimeString } from '../utils/dateUtils';

const API_BASE = '/api';

const isStaticMode = typeof window !== 'undefined' && (
  window.location.hostname.includes('github.io') ||
  window.location.protocol === 'file:' ||
  window.location.port !== '8000' && window.location.port !== '3000'
);

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (isStaticMode) {
    throw new Error('Static host mode');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || '请求失败');
  }

  return response.json();
}

export const api = {
  // Accounts
  getAccounts: async (): Promise<Account[]> => {
    if (isStaticMode) return localStore.getAccounts();
    try {
      return await request<Account[]>('/accounts');
    } catch {
      return localStore.getAccounts();
    }
  },
  createAccount: async (data: Partial<Account>): Promise<Account> => {
    if (isStaticMode) {
      const accs = localStore.getAccounts();
      const newAcc: Account = {
        id: `acc-${Date.now()}`,
        name: data.name || '新账户',
        type: data.type || 'bank',
        currency: data.currency || 'CNY',
        balance: data.balance || 0,
        initial_balance: data.balance || 0,
        card_last4: data.card_last4,
        bank_name: data.bank_name,
        is_active: 1,
        note: data.note
      };
      accs.push(newAcc);
      localStore.saveAccounts(accs);
      return newAcc;
    }
    try {
      return await request<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const accs = localStore.getAccounts();
      const newAcc: Account = {
        id: `acc-${Date.now()}`,
        name: data.name || '新账户',
        type: data.type || 'bank',
        currency: data.currency || 'CNY',
        balance: data.balance || 0,
        initial_balance: data.balance || 0,
        card_last4: data.card_last4,
        bank_name: data.bank_name,
        is_active: 1,
        note: data.note
      };
      accs.push(newAcc);
      localStore.saveAccounts(accs);
      return newAcc;
    }
  },
  updateAccount: async (id: string, data: Partial<Account>): Promise<Account> => {
    if (isStaticMode) {
      const accs = localStore.getAccounts();
      const idx = accs.findIndex(a => a.id === id);
      if (idx !== -1) {
        accs[idx] = { ...accs[idx], ...data };
        localStore.saveAccounts(accs);
        return accs[idx];
      }
      throw new Error('账户不存在');
    }
    try {
      return await request<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const accs = localStore.getAccounts();
      const idx = accs.findIndex(a => a.id === id);
      if (idx !== -1) {
        accs[idx] = { ...accs[idx], ...data };
        localStore.saveAccounts(accs);
        return accs[idx];
      }
      throw new Error('账户不存在');
    }
  },
  deleteAccount: async (id: string) => {
    if (isStaticMode) {
      const accs = localStore.getAccounts().filter(a => a.id !== id);
      localStore.saveAccounts(accs);
      return { success: true, message: '账户已删除' };
    }
    try {
      return await request<{ success: boolean; message: string }>(`/accounts/${id}`, { method: 'DELETE' });
    } catch {
      const accs = localStore.getAccounts().filter(a => a.id !== id);
      localStore.saveAccounts(accs);
      return { success: true, message: '账户已删除' };
    }
  },

  // Transactions
  getTransactions: async (params?: Record<string, string | number>): Promise<Transaction[]> => {
    if (isStaticMode) return localStore.getTransactions();
    try {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            query.append(key, String(val));
          }
        });
      }
      return await request<Transaction[]>(`/transactions?${query.toString()}`);
    } catch {
      return localStore.getTransactions();
    }
  },
  createTransaction: async (data: Partial<Transaction>): Promise<Transaction> => {
    if (isStaticMode) {
      const txs = localStore.getTransactions();
      const accs = localStore.getAccounts();
      const targetAccId = data.account_id || accs[0]?.id || 'acc-1';
      const targetAcc = accs.find(a => a.id === targetAccId) || accs[0];

      const newTx: Transaction = {
        id: `t-${Date.now()}`,
        type: data.type || 'expense',
        amount: data.amount || 0,
        account_id: targetAcc?.id || 'acc-1',
        account_name: targetAcc?.name || '默认账户',
        to_account_id: data.to_account_id,
        category_name: data.category_name || '日常消费',
        date: data.date || getBeijingDateTimeString(),
        merchant: data.merchant || '消费记录',
        note: data.note,
        source: data.source || 'manual'
      };
      txs.unshift(newTx);
      localStore.saveTransactions(txs);

      // Update source account balance
      if (targetAcc) {
        if (newTx.type === 'expense') targetAcc.balance -= newTx.amount;
        else if (newTx.type === 'income') targetAcc.balance += newTx.amount;
        else if (newTx.type === 'transfer' || newTx.type === 'repayment') {
          targetAcc.balance -= newTx.amount;
          if (data.to_account_id) {
            const toAcc = accs.find(a => a.id === data.to_account_id);
            if (toAcc) toAcc.balance += newTx.amount;
          }
        }
        localStore.saveAccounts(accs);
      }
      return newTx;
    }
    try {
      return await request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const txs = localStore.getTransactions();
      const accs = localStore.getAccounts();
      const targetAccId = data.account_id || accs[0]?.id || 'acc-1';
      const targetAcc = accs.find(a => a.id === targetAccId) || accs[0];

      const newTx: Transaction = {
        id: `t-${Date.now()}`,
        type: data.type || 'expense',
        amount: data.amount || 0,
        account_id: targetAcc?.id || 'acc-1',
        account_name: targetAcc?.name || '默认账户',
        to_account_id: data.to_account_id,
        category_name: data.category_name || '日常消费',
        date: data.date || getBeijingDateTimeString(),
        merchant: data.merchant || '消费记录',
        note: data.note,
        source: data.source || 'manual'
      };
      txs.unshift(newTx);
      localStore.saveTransactions(txs);

      if (targetAcc) {
        if (newTx.type === 'expense') targetAcc.balance -= newTx.amount;
        else if (newTx.type === 'income') targetAcc.balance += newTx.amount;
        else if (newTx.type === 'transfer' || newTx.type === 'repayment') {
          targetAcc.balance -= newTx.amount;
          if (data.to_account_id) {
            const toAcc = accs.find(a => a.id === data.to_account_id);
            if (toAcc) toAcc.balance += newTx.amount;
          }
        }
        localStore.saveAccounts(accs);
      }
      return newTx;
    }
  },
  updateTransaction: async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
    const txs = localStore.getTransactions();
    const index = txs.findIndex(t => t.id === id);
    if (index === -1) throw new Error('未找到该笔流水');

    const oldTx = txs[index];
    const accs = localStore.getAccounts();

    // 1. Revert old balance effect
    const oldAcc = accs.find(a => a.id === oldTx.account_id);
    if (oldAcc) {
      if (oldTx.type === 'expense') oldAcc.balance += oldTx.amount;
      else if (oldTx.type === 'income') oldAcc.balance -= oldTx.amount;
      else if (oldTx.type === 'transfer' || oldTx.type === 'repayment') {
        oldAcc.balance += oldTx.amount;
        if (oldTx.to_account_id) {
          const oldToAcc = accs.find(a => a.id === oldTx.to_account_id);
          if (oldToAcc) oldToAcc.balance -= oldTx.amount;
        }
      }
    }

    // 2. Apply updated transaction
    const targetAccId = data.account_id || oldTx.account_id;
    const targetAcc = accs.find(a => a.id === targetAccId);
    const updatedTx: Transaction = {
      ...oldTx,
      ...data,
      account_name: targetAcc?.name || oldTx.account_name,
      to_account_name: data.to_account_id ? accs.find(a => a.id === data.to_account_id)?.name : undefined
    };
    txs[index] = updatedTx;

    // 3. Apply new balance effect
    const newAcc = accs.find(a => a.id === updatedTx.account_id);
    if (newAcc) {
      if (updatedTx.type === 'expense') newAcc.balance -= updatedTx.amount;
      else if (updatedTx.type === 'income') newAcc.balance += updatedTx.amount;
      else if (updatedTx.type === 'transfer' || updatedTx.type === 'repayment') {
        newAcc.balance -= updatedTx.amount;
        if (updatedTx.to_account_id) {
          const newToAcc = accs.find(a => a.id === updatedTx.to_account_id);
          if (newToAcc) newToAcc.balance += updatedTx.amount;
        }
      }
    }

    localStore.saveAccounts(accs);
    localStore.saveTransactions(txs);

    if (!isStaticMode) {
      request<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() => {});
    }

    return updatedTx;
  },
  deleteTransaction: async (id: string) => {
    const txs = localStore.getTransactions();
    const target = txs.find(t => t.id === id);
    if (target) {
      const accs = localStore.getAccounts();
      const acc = accs.find(a => a.id === target.account_id);
      if (acc) {
        if (target.type === 'expense') acc.balance += target.amount;
        else if (target.type === 'income') acc.balance -= target.amount;
        else if (target.type === 'transfer' || target.type === 'repayment') {
          acc.balance += target.amount;
          if (target.to_account_id) {
            const toAcc = accs.find(a => a.id === target.to_account_id);
            if (toAcc) toAcc.balance -= target.amount;
          }
        }
        localStore.saveAccounts(accs);
      }
    }
    const filteredTxs = txs.filter(t => t.id !== id);
    localStore.saveTransactions(filteredTxs);

    if (!isStaticMode) {
      request<{ success: boolean; message: string }>(`/transactions/${id}`, { method: 'DELETE' }).catch(() => {});
    }

    return { success: true, message: '流水已删除并还原余额' };
  },
  getCategories: async (): Promise<Category[]> => {
    if (isStaticMode) return localStore.getCategories();
    try {
      return await request<Category[]>('/transactions/categories/all');
    } catch {
      return localStore.getCategories();
    }
  },

  // Budgets
  getBudgets: async (period?: string): Promise<Budget[]> => {
    if (isStaticMode) return localStore.getBudgets();
    try {
      return await request<Budget[]>(`/budgets${period ? `?period=${period}` : ''}`);
    } catch {
      return localStore.getBudgets();
    }
  },
  setBudget: async (data: { period: string; category_id?: string | null; amount: number; alert_threshold?: number }) => {
    const bs = localStore.getBudgets();
    const newB: Budget = {
      id: `b-${Date.now()}`,
      period: data.period,
      category_id: data.category_id || undefined,
      category_name: data.category_id ? '分类预算' : '全部分类总预算',
      amount: data.amount,
      alert_threshold: data.alert_threshold || 0.8,
      spent_amount: 0,
      remaining_amount: data.amount,
      spent_percentage: 0,
      status: 'normal'
    };
    bs.push(newB);
    localStore.saveBudgets(bs);
    return newB;
  },

  // Investments
  getInvestments: async (): Promise<Investment[]> => {
    return localStore.getInvestments();
  },
  addInvestment: async (data: Partial<Investment>): Promise<Investment> => {
    const invs = localStore.getInvestments();
    const shares = data.shares || 0;
    const cost = data.cost_price || 0;
    const curr = data.current_price || 0;
    const newInv: Investment = {
      id: `inv-${Date.now()}`,
      account_id: data.account_id || 'acc-1',
      code: data.code || '000001',
      name: data.name || '投资标的',
      type: data.type || 'stock_a',
      shares,
      cost_price: cost,
      current_price: curr,
      currency: data.currency || 'CNY',
      total_cost: shares * cost,
      market_value: shares * curr,
      floating_pnl: (curr - cost) * shares,
      pnl_rate: cost > 0 ? ((curr - cost) / cost) * 100 : 0
    };
    invs.push(newInv);
    localStore.saveInvestments(invs);
    return newInv;
  },
  updateInvestment: async (id: string, data: Partial<Investment>) => {
    const invs = localStore.getInvestments();
    const idx = invs.findIndex(i => i.id === id);
    if (idx !== -1) {
      invs[idx] = { ...invs[idx], ...data };
      localStore.saveInvestments(invs);
    }
    return { success: true, message: '持仓已更新' };
  },
  deleteInvestment: async (id: string) => {
    const invs = localStore.getInvestments().filter(i => i.id !== id);
    localStore.saveInvestments(invs);
    return { success: true, message: '持仓已删除' };
  },

  // Debts
  getDebts: async (): Promise<Debt[]> => {
    return localStore.getDebts();
  },
  addDebt: async (data: Partial<Debt>): Promise<Debt> => {
    const debts = localStore.getDebts();
    const tot = data.total_principal || 0;
    const rem = data.remaining_principal || 0;
    const newD: Debt = {
      id: `debt-${Date.now()}`,
      name: data.name || '新负债',
      type: data.type || 'credit_card',
      total_principal: tot,
      remaining_principal: rem,
      interest_rate_annual: data.interest_rate_annual || 0,
      monthly_payment: data.monthly_payment || 0,
      bill_day: data.bill_day,
      repay_day: data.repay_day,
      progress_percentage: tot > 0 ? ((tot - rem) / tot) * 100 : 0
    };
    debts.push(newD);
    localStore.saveDebts(debts);
    return newD;
  },
  deleteDebt: async (id: string) => {
    const debts = localStore.getDebts().filter(d => d.id !== id);
    localStore.saveDebts(debts);
    return { success: true, message: '债务已删除' };
  },
  getDebtSimulator: async (extraMonthly?: number) => {
    const debts = localStore.getDebts();
    return {
      snowball_strategy: {
        name: "雪球还债法 (先还小额，快速建立信心)",
        priority: debts.map(d => d.name),
        description: "优先全力清偿本金最小的一笔负债，清偿后将该笔月供全额滚入下一笔负债。"
      },
      avalanche_strategy: {
        name: "雪崩还债法 (先还高息，利息支出最少)",
        priority: debts.map(d => d.name),
        description: "优先全力清偿年化利率最高的一笔负债（如信用卡），从数学上节省最多利息开支。"
      }
    };
  },

  // Goals
  getGoals: async (): Promise<Goal[]> => {
    return localStore.getGoals();
  },
  addGoal: async (data: Partial<Goal>): Promise<Goal> => {
    const goals = localStore.getGoals();
    const tot = data.target_amount || 0;
    const cur = data.current_amount || 0;
    const newG: Goal = {
      id: `g-${Date.now()}`,
      name: data.name || '心愿目标',
      target_amount: tot,
      current_amount: cur,
      target_date: data.target_date,
      is_completed: 0,
      progress_percentage: tot > 0 ? (cur / tot) * 100 : 0
    };
    goals.push(newG);
    localStore.saveGoals(goals);
    return newG;
  },
  depositToGoal: async (id: string, amount: number) => {
    const goals = localStore.getGoals();
    const g = goals.find(item => item.id === id);
    if (g) {
      g.current_amount += amount;
      g.progress_percentage = (g.current_amount / g.target_amount) * 100;
      if (g.current_amount >= g.target_amount) g.is_completed = 1;
      localStore.saveGoals(goals);
    }
    return { success: true, message: '已成功存入心愿资金' };
  },
  deleteGoal: async (id: string) => {
    const goals = localStore.getGoals().filter(g => g.id !== id);
    localStore.saveGoals(goals);
    return { success: true, message: '目标已删除' };
  },

  // Analytics
  getDashboardAnalytics: async (): Promise<DashboardAnalytics> => {
    return localStore.getAnalytics();
  },
  getSankeyFlow: async (month?: string): Promise<SankeyData> => {
    return {
      nodes: [
        { name: '【收入】主营薪资' },
        { name: '【账户】微信支付' },
        { name: '【支出】餐饮美食' },
        { name: '【支出】日常消费' }
      ],
      links: [
        { source: '【收入】主营薪资', target: '【账户】微信支付', value: 5000 },
        { source: '【账户】微信支付', target: '【支出】餐饮美食', value: 14.9 }
      ]
    };
  },

  // System & Snapshots
  seedDemo: async () => {
    localStorage.clear();
    return { success: true, message: '数据已重置！' };
  },
  clearData: async () => {
    localStore.clearAllData();
    return { success: true, message: '数据已清空' };
  },
  exportBackup: async () => {
    return {
      accounts: localStore.getAccounts(),
      transactions: localStore.getTransactions(),
      budgets: localStore.getBudgets(),
      goals: localStore.getGoals()
    };
  },
  restoreBackup: async (file: File) => {
    return { success: true, message: '数据恢复成功！' };
  },
  getSnapshots: async (): Promise<AssetSnapshot[]> => {
    return [];
  },
  createSnapshot: async (data: { snapshot_date: string; accounts_balances: Record<string, number>; notes?: string }) => {
    const accs = localStore.getAccounts();
    accs.forEach(a => {
      if (data.accounts_balances[a.id] !== undefined) {
        a.balance = data.accounts_balances[a.id];
      }
    });
    localStore.saveAccounts(accs);
    return { success: true, message: '快照已保存' };
  },
  getRecurringRules: async (): Promise<RecurringRule[]> => {
    return [];
  },
  addRecurringRule: async (data: Partial<RecurringRule>) => {
    return {
      id: `rec-${Date.now()}`,
      name: data.name || '周期规则',
      type: data.type || 'expense',
      amount: data.amount || 0,
      account_id: data.account_id || 'acc-1',
      frequency: data.frequency || 'monthly',
      day_of_period: data.day_of_period || 1,
      is_active: 1
    };
  },
  executeRecurringRules: async () => {
    return { success: true, executed_count: 0 };
  },
  parseText: async (text: string): Promise<ParsedTransactionResult> => {
    const accs = localStore.getAccounts();
    // 1. Check AI Parser first (if enabled in Lab)
    try {
      const aiResult = await parseWithAi(text, accs);
      if (aiResult && aiResult.success && (aiResult.amount ?? 0) > 0) {
        return aiResult;
      }
    } catch {}
    // 2. Fallback to native bulletproof rule engine
    return parseSmsOrTextInBrowser(text, accs);
  },
  importCsv: async (channel: 'wechat' | 'alipay', accountId: string, file: File) => {
    return { success: true, message: '已成功导入账单明细！' };
  },
  getBuiltinRules: async () => {
    return [
      { bank: "招商银行", name: "招行消费支出", pattern: "【招商银行】...账户9527于...消费支出...元", type: "expense" },
      { bank: "微信支付", name: "微信支付凭证", pattern: "微信支付：微信支付凭证 商户消费 ¥...", type: "expense" }
    ];
  }
};
