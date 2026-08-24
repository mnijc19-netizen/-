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
  getAccounts: () => request<Account[]>('/accounts'),
  createAccount: (data: Partial<Account>) => request<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: Partial<Account>) => request<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: string) => request<{ success: boolean; message: string }>(`/accounts/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    return request<Transaction[]>(`/transactions?${query.toString()}`);
  },
  createTransaction: (data: Partial<Transaction>) => request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) => request<{ success: boolean; message: string }>(`/transactions/${id}`, { method: 'DELETE' }),
  getCategories: () => request<Category[]>('/transactions/categories/all'),
  createCategory: (data: Partial<Category>) => request<Category>('/transactions/categories/create', { method: 'POST', body: JSON.stringify(data) }),

  // Parser & OCR / SMS
  parseText: (text: string) => request<ParsedTransactionResult>('/parser/parse-text', { method: 'POST', body: JSON.stringify({ text }) }),
  importCsv: async (channel: 'wechat' | 'alipay', accountId: string, file: File) => {
    const formData = new FormData();
    formData.append('channel', channel);
    formData.append('account_id', accountId);
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/parser/import-csv`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || '导入失败');
    }
    return response.json();
  },
  getBuiltinRules: () => request<any[]>('/parser/builtin-rules'),

  // Budgets
  getBudgets: (period?: string) => request<Budget[]>(`/budgets${period ? `?period=${period}` : ''}`),
  setBudget: (data: { period: string; category_id?: string | null; amount: number; alert_threshold?: number }) => 
    request<Budget>('/budgets', { method: 'POST', body: JSON.stringify(data) }),

  // Investments
  getInvestments: () => request<Investment[]>('/investments'),
  addInvestment: (data: Partial<Investment>) => request<Investment>('/investments', { method: 'POST', body: JSON.stringify(data) }),
  updateInvestment: (id: string, data: Partial<Investment>) => request<{ success: boolean; message: string }>(`/investments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvestment: (id: string) => request<{ success: boolean; message: string }>(`/investments/${id}`, { method: 'DELETE' }),

  // Debts
  getDebts: () => request<Debt[]>('/debts'),
  addDebt: (data: Partial<Debt>) => request<Debt>('/debts', { method: 'POST', body: JSON.stringify(data) }),
  deleteDebt: (id: string) => request<{ success: boolean; message: string }>(`/debts/${id}`, { method: 'DELETE' }),
  getDebtSimulator: (extraMonthly?: number) => request<any>(`/debts/simulator?extra_monthly_budget=${extraMonthly || 1000}`),

  // Goals
  getGoals: () => request<Goal[]>('/goals'),
  addGoal: (data: Partial<Goal>) => request<Goal>('/goals', { method: 'POST', body: JSON.stringify(data) }),
  depositToGoal: (id: string, amount: number) => request<{ success: boolean; message: string }>(`/goals/${id}/deposit?amount=${amount}`, { method: 'PUT' }),
  deleteGoal: (id: string) => request<{ success: boolean; message: string }>(`/goals/${id}`, { method: 'DELETE' }),

  // Analytics
  getDashboardAnalytics: () => request<DashboardAnalytics>('/analytics/dashboard'),
  getSankeyFlow: (month?: string) => request<SankeyData>(`/analytics/sankey${month ? `?month=${month}` : ''}`),

  // System & Snapshot Mode & Recurring
  seedDemo: () => request<{ success: boolean; message: string }>('/system/seed-demo', { method: 'POST' }),
  clearData: () => request<{ success: boolean; message: string }>('/system/clear-data', { method: 'POST' }),
  exportBackup: () => request<any>('/system/export-backup'),
  restoreBackup: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/system/restore-backup`, { method: 'POST', body: formData });
    return response.json();
  },
  getSnapshots: () => request<AssetSnapshot[]>('/system/snapshots'),
  createSnapshot: (data: { snapshot_date: string; accounts_balances: Record<string, number>; notes?: string }) =>
    request<any>('/system/snapshots', { method: 'POST', body: JSON.stringify(data) }),
  getRecurringRules: () => request<RecurringRule[]>('/system/recurring'),
  addRecurringRule: (data: Partial<RecurringRule>) => request<RecurringRule>('/system/recurring', { method: 'POST', body: JSON.stringify(data) }),
  executeRecurringRules: () => request<any>('/system/recurring/execute', { method: 'POST' })
};
