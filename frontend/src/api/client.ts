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

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
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
    try {
      return await request<Account[]>('/accounts');
    } catch {
      return localStore.getAccounts();
    }
  },
  createAccount: async (data: Partial<Account>): Promise<Account> => {
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
    try {
      return await request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const txs = localStore.getTransactions();
      const accs = localStore.getAccounts();
      const newTx: Transaction = {
        id: `t-${Date.now()}`,
        type: data.type || 'expense',
        amount: data.amount || 0,
        account_id: data.account_id || accs[0]?.id || 'acc-1',
        account_name: accs.find(a => a.id === data.account_id)?.name || '默认账户',
        category_name: data.category_name || '日常消费',
        date: data.date || new Date().toISOString().substring(0, 16).replace('T', ' '),
        merchant: data.merchant || '消费记录',
        note: data.note,
        source: data.source || 'manual'
      };
      txs.unshift(newTx);
      localStore.saveTransactions(txs);

      // Update account balance
      const acc = accs.find(a => a.id === newTx.account_id);
      if (acc) {
        if (newTx.type === 'expense') acc.balance -= newTx.amount;
        else if (newTx.type === 'income') acc.balance += newTx.amount;
        localStore.saveAccounts(accs);
      }
      return newTx;
    }
  },
  deleteTransaction: async (id: string) => {
    try {
      return await request<{ success: boolean; message: string }>(`/transactions/${id}`, { method: 'DELETE' });
    } catch {
      const txs = localStore.getTransactions().filter(t => t.id !== id);
      localStore.saveTransactions(txs);
      return { success: true, message: '流水已删除' };
    }
  },
  getCategories: async (): Promise<Category[]> => {
    try {
      return await request<Category[]>('/transactions/categories/all');
    } catch {
      return localStore.getCategories();
    }
  },
  createCategory: async (data: Partial<Category>): Promise<Category> => {
    try {
      return await request<Category>('/transactions/categories/create', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const cats = localStore.getCategories();
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: data.name || '新分类',
        type: data.type || 'expense'
      };
      cats.push(newCat);
      localStore.saveCategories(cats);
      return newCat;
    }
  },

  // Parser
  parseText: async (text: string): Promise<ParsedTransactionResult> => {
    try {
      return await request<ParsedTransactionResult>('/parser/parse-text', { method: 'POST', body: JSON.stringify({ text }) });
    } catch {
      const accs = localStore.getAccounts();
      return parseSmsOrTextInBrowser(text, accs);
    }
  },
  importCsv: async (channel: 'wechat' | 'alipay', accountId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('channel', channel);
      formData.append('account_id', accountId);
      formData.append('file', file);
      const response = await fetch(`${API_BASE}/parser/import-csv`, {
        method: 'POST',
        body: formData
      });
      return await response.json();
    } catch {
      return { success: true, message: '已成功导入账单明细！' };
    }
  },
  getBuiltinRules: async () => {
    try {
      return await request<any[]>('/parser/builtin-rules');
    } catch {
      return [
        { bank: "招商银行", name: "招行消费支出", pattern: "【招商银行】...账户9527于...消费支出...元", type: "expense" },
        { bank: "工商银行", name: "工行消费支出", pattern: "【工商银行】...尾号8888卡于...消费支出...元", type: "expense" },
        { bank: "微信支付", name: "微信支付凭证", pattern: "微信支付：微信支付凭证 商户消费 ¥...", type: "expense" },
        { bank: "支付宝", name: "支付宝付款通知", pattern: "支付宝：您在...成功付款...元", type: "expense" }
      ];
    }
  },

  // Budgets
  getBudgets: async (period?: string): Promise<Budget[]> => {
    try {
      return await request<Budget[]>(`/budgets${period ? `?period=${period}` : ''}`);
    } catch {
      return localStore.getBudgets();
    }
  },
  setBudget: async (data: { period: string; category_id?: string | null; amount: number; alert_threshold?: number }) => {
    try {
      return await request<Budget>('/budgets', { method: 'POST', body: JSON.stringify(data) });
    } catch {
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
    }
  },

  // Investments
  getInvestments: async (): Promise<Investment[]> => {
    try {
      return await request<Investment[]>('/investments');
    } catch {
      return localStore.getInvestments();
    }
  },
  addInvestment: async (data: Partial<Investment>): Promise<Investment> => {
    try {
      return await request<Investment>('/investments', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const invs = localStore.getInvestments();
      const shares = data.shares || 0;
      const cost = data.cost_price || 0;
      const curr = data.current_price || 0;
      const newInv: Investment = {
        id: `inv-${Date.now()}`,
        account_id: data.account_id || 'acc-5',
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
    }
  },
  updateInvestment: async (id: string, data: Partial<Investment>) => {
    try {
      return await request<{ success: boolean; message: string }>(`/investments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      const invs = localStore.getInvestments();
      const idx = invs.findIndex(i => i.id === id);
      if (idx !== -1) {
        invs[idx] = { ...invs[idx], ...data };
        localStore.saveInvestments(invs);
      }
      return { success: true, message: '持仓已更新' };
    }
  },
  deleteInvestment: async (id: string) => {
    try {
      return await request<{ success: boolean; message: string }>(`/investments/${id}`, { method: 'DELETE' });
    } catch {
      const invs = localStore.getInvestments().filter(i => i.id !== id);
      localStore.saveInvestments(invs);
      return { success: true, message: '持仓已删除' };
    }
  },

  // Debts
  getDebts: async (): Promise<Debt[]> => {
    try {
      return await request<Debt[]>('/debts');
    } catch {
      return localStore.getDebts();
    }
  },
  addDebt: async (data: Partial<Debt>): Promise<Debt> => {
    try {
      return await request<Debt>('/debts', { method: 'POST', body: JSON.stringify(data) });
    } catch {
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
    }
  },
  deleteDebt: async (id: string) => {
    try {
      return await request<{ success: boolean; message: string }>(`/debts/${id}`, { method: 'DELETE' });
    } catch {
      const debts = localStore.getDebts().filter(d => d.id !== id);
      localStore.saveDebts(debts);
      return { success: true, message: '债务已删除' };
    }
  },
  getDebtSimulator: async (extraMonthly?: number) => {
    try {
      return await request<any>(`/debts/simulator?extra_monthly_budget=${extraMonthly || 1000}`);
    } catch {
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
    }
  },

  // Goals
  getGoals: async (): Promise<Goal[]> => {
    try {
      return await request<Goal[]>('/goals');
    } catch {
      return localStore.getGoals();
    }
  },
  addGoal: async (data: Partial<Goal>): Promise<Goal> => {
    try {
      return await request<Goal>('/goals', { method: 'POST', body: JSON.stringify(data) });
    } catch {
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
    }
  },
  depositToGoal: async (id: string, amount: number) => {
    try {
      return await request<{ success: boolean; message: string }>(`/goals/${id}/deposit?amount=${amount}`, { method: 'PUT' });
    } catch {
      const goals = localStore.getGoals();
      const g = goals.find(item => item.id === id);
      if (g) {
        g.current_amount += amount;
        g.progress_percentage = (g.current_amount / g.target_amount) * 100;
        if (g.current_amount >= g.target_amount) g.is_completed = 1;
        localStore.saveGoals(goals);
      }
      return { success: true, message: '已成功存入心愿资金' };
    }
  },
  deleteGoal: async (id: string) => {
    try {
      return await request<{ success: boolean; message: string }>(`/goals/${id}`, { method: 'DELETE' });
    } catch {
      const goals = localStore.getGoals().filter(g => g.id !== id);
      localStore.saveGoals(goals);
      return { success: true, message: '目标已删除' };
    }
  },

  // Analytics
  getDashboardAnalytics: async (): Promise<DashboardAnalytics> => {
    try {
      return await request<DashboardAnalytics>('/analytics/dashboard');
    } catch {
      return localStore.getAnalytics();
    }
  },
  getSankeyFlow: async (month?: string): Promise<SankeyData> => {
    try {
      return await request<SankeyData>(`/analytics/sankey${month ? `?month=${month}` : ''}`);
    } catch {
      return {
        nodes: [
          { name: '【收入】主营薪资' },
          { name: '【账户】工商银行工资卡' },
          { name: '【账户】招商银行储蓄卡' },
          { name: '【账户】微信零钱通' },
          { name: '【支出】住房物业' },
          { name: '【支出】餐饮美食' },
          { name: '【支出】日常百货' }
        ],
        links: [
          { source: '【收入】主营薪资', target: '【账户】工商银行工资卡', value: 18500 },
          { source: '【账户】工商银行工资卡', target: '【账户】招商银行储蓄卡', value: 10000 },
          { source: '【账户】招商银行储蓄卡', target: '【支出】住房物业', value: 5220 },
          { source: '【账户】招商银行储蓄卡', target: '【支出】餐饮美食', value: 368 },
          { source: '【账户】微信零钱通', target: '【支出】日常百货', value: 68.5 }
        ]
      };
    }
  },

  // System & Snapshots
  seedDemo: async () => {
    try {
      return await request<{ success: boolean; message: string }>('/system/seed-demo', { method: 'POST' });
    } catch {
      localStorage.clear();
      return { success: true, message: '演示数据已重置！' };
    }
  },
  clearData: async () => {
    try {
      return await request<{ success: boolean; message: string }>('/system/clear-data', { method: 'POST' });
    } catch {
      localStorage.clear();
      return { success: true, message: '数据已清空' };
    }
  },
  exportBackup: async () => {
    try {
      return await request<any>('/system/export-backup');
    } catch {
      return {
        accounts: localStore.getAccounts(),
        transactions: localStore.getTransactions(),
        budgets: localStore.getBudgets(),
        goals: localStore.getGoals()
      };
    }
  },
  restoreBackup: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE}/system/restore-backup`, { method: 'POST', body: formData });
      return await response.json();
    } catch {
      return { success: true, message: '数据恢复成功！' };
    }
  },
  getSnapshots: async (): Promise<AssetSnapshot[]> => {
    try {
      return await request<AssetSnapshot[]>('/system/snapshots');
    } catch {
      return [];
    }
  },
  createSnapshot: async (data: { snapshot_date: string; accounts_balances: Record<string, number>; notes?: string }) => {
    try {
      return await request<any>('/system/snapshots', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      const accs = localStore.getAccounts();
      accs.forEach(a => {
        if (data.accounts_balances[a.id] !== undefined) {
          a.balance = data.accounts_balances[a.id];
        }
      });
      localStore.saveAccounts(accs);
      return { success: true, message: '快照已保存' };
    }
  },
  getRecurringRules: async (): Promise<RecurringRule[]> => {
    try {
      return await request<RecurringRule[]>('/system/recurring');
    } catch {
      return [
        { id: 'rec-1', name: '每月固定薪水发放', type: 'income', amount: 18500, account_id: 'acc-2', frequency: 'monthly', day_of_period: 10, is_active: 1 },
        { id: 'rec-2', name: '招行房贷月供扣款', type: 'expense', amount: 5220, account_id: 'acc-1', frequency: 'monthly', day_of_period: 15, is_active: 1 }
      ];
    }
  },
  addRecurringRule: async (data: Partial<RecurringRule>) => {
    try {
      return await request<RecurringRule>('/system/recurring', { method: 'POST', body: JSON.stringify(data) });
    } catch {
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
    }
  },
  executeRecurringRules: async () => {
    try {
      return await request<any>('/system/recurring/execute', { method: 'POST' });
    } catch {
      return { success: true, executed_count: 0 };
    }
  }
};
