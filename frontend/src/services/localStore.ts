import { 
  Account, 
  Transaction, 
  Category, 
  Budget, 
  Investment, 
  Debt, 
  Goal, 
  DashboardAnalytics, 
  SankeyData, 
  AssetSnapshot, 
  RecurringRule 
} from '../types';

const STORAGE_KEYS = {
  ACCOUNTS: 'smartwealth_accounts_v2',
  TRANSACTIONS: 'smartwealth_transactions_v2',
  CATEGORIES: 'smartwealth_categories_v2',
  BUDGETS: 'smartwealth_budgets_v2',
  INVESTMENTS: 'smartwealth_investments_v2',
  DEBTS: 'smartwealth_debts_v2',
  GOALS: 'smartwealth_goals_v2',
  SNAPSHOTS: 'smartwealth_snapshots_v2',
  RECURRING: 'smartwealth_recurring_v2'
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-exp-1', name: '餐饮美食', type: 'expense', icon: 'Utensils', color: '#EF4444' },
  { id: 'cat-exp-2', name: '交通出行', type: 'expense', icon: 'Car', color: '#3B82F6' },
  { id: 'cat-exp-3', name: '日用百货', type: 'expense', icon: 'ShoppingBag', color: '#10B981' },
  { id: 'cat-exp-4', name: '购物消费', type: 'expense', icon: 'Shirt', color: '#EC4899' },
  { id: 'cat-exp-5', name: '住房物业', type: 'expense', icon: 'Home', color: '#8B5CF6' },
  { id: 'cat-exp-6', name: '休闲娱乐', type: 'expense', icon: 'Gamepad2', color: '#F59E0B' },
  { id: 'cat-exp-7', name: '医疗健康', type: 'expense', icon: 'HeartPulse', color: '#14B8A6' },
  { id: 'cat-exp-8', name: '数码科技', type: 'expense', icon: 'Laptop', color: '#6366F1' },
  { id: 'cat-exp-9', name: '社交人情', type: 'expense', icon: 'Gift', color: '#F43F5E' },
  { id: 'cat-exp-10', name: '金融还款', type: 'expense', icon: 'CreditCard', color: '#64748B' },
  { id: 'cat-inc-1', name: '工资薪金', type: 'income', icon: 'Banknote', color: '#10B981' },
  { id: 'cat-inc-2', name: '投资理财', type: 'income', icon: 'TrendingUp', color: '#3B82F6' },
  { id: 'cat-inc-3', name: '兼职副业', type: 'income', icon: 'Briefcase', color: '#F59E0B' }
];

// Clean initial starting accounts with ¥0.00 balance
const CLEAN_INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: '微信零钱/零钱通', type: 'wallet', currency: 'CNY', balance: 0.0, initial_balance: 0.0, bank_name: '微信支付', is_active: 1 },
  { id: 'acc-2', name: '支付宝/余额宝', type: 'wallet', currency: 'CNY', balance: 0.0, initial_balance: 0.0, bank_name: '支付宝', is_active: 1 },
  { id: 'acc-3', name: '主要银行储蓄卡', type: 'bank', currency: 'CNY', balance: 0.0, initial_balance: 0.0, card_last4: '', bank_name: '招商/工行/建行', is_active: 1 },
  { id: 'acc-4', name: '信用卡账户', type: 'credit', currency: 'CNY', balance: 0.0, initial_balance: 0.0, card_last4: '', bank_name: '信用卡', credit_limit: 20000, bill_day: 10, repay_day: 28, is_active: 1 }
];

function getJson<T>(key: string, fallback: T): T {
  const item = localStorage.getItem(key);
  if (!item) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try {
    return JSON.parse(item);
  } catch {
    return fallback;
  }
}

function setJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const localStore = {
  getAccounts: (): Account[] => getJson(STORAGE_KEYS.ACCOUNTS, CLEAN_INITIAL_ACCOUNTS),
  saveAccounts: (accs: Account[]) => setJson(STORAGE_KEYS.ACCOUNTS, accs),

  getTransactions: (): Transaction[] => getJson(STORAGE_KEYS.TRANSACTIONS, []),
  saveTransactions: (txs: Transaction[]) => setJson(STORAGE_KEYS.TRANSACTIONS, txs),

  getCategories: (): Category[] => getJson(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES),
  saveCategories: (cats: Category[]) => setJson(STORAGE_KEYS.CATEGORIES, cats),

  getBudgets: (): Budget[] => getJson(STORAGE_KEYS.BUDGETS, []),
  saveBudgets: (b: Budget[]) => setJson(STORAGE_KEYS.BUDGETS, b),

  getInvestments: (): Investment[] => getJson(STORAGE_KEYS.INVESTMENTS, []),
  saveInvestments: (invs: Investment[]) => setJson(STORAGE_KEYS.INVESTMENTS, invs),

  getDebts: (): Debt[] => getJson(STORAGE_KEYS.DEBTS, []),
  saveDebts: (d: Debt[]) => setJson(STORAGE_KEYS.DEBTS, d),

  getGoals: (): Goal[] => getJson(STORAGE_KEYS.GOALS, []),
  saveGoals: (g: Goal[]) => setJson(STORAGE_KEYS.GOALS, g),

  clearAllData: () => {
    localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.BUDGETS);
    localStorage.removeItem(STORAGE_KEYS.INVESTMENTS);
    localStorage.removeItem(STORAGE_KEYS.DEBTS);
    localStorage.removeItem(STORAGE_KEYS.GOALS);
    localStorage.removeItem(STORAGE_KEYS.SNAPSHOTS);
    localStorage.removeItem(STORAGE_KEYS.RECURRING);
    // Legacy keys cleanup
    localStorage.removeItem('smartwealth_accounts');
    localStorage.removeItem('smartwealth_transactions');
    localStorage.removeItem('smartwealth_budgets');
    localStorage.removeItem('smartwealth_investments');
    localStorage.removeItem('smartwealth_debts');
    localStorage.removeItem('smartwealth_goals');
  },

  getAnalytics: (): DashboardAnalytics => {
    const accs = localStore.getAccounts();
    const txs = localStore.getTransactions();

    let totalLiquid = 0;
    let totalInv = 0;
    let totalFixed = 0;
    let totalRec = 0;
    let totalLiab = 0;

    accs.forEach(a => {
      const b = a.balance;
      if (['cash', 'bank', 'wallet'].includes(a.type)) totalLiquid += b;
      else if (['investment', 'crypto'].includes(a.type)) totalInv += b * (a.currency === 'USD' ? 7.25 : 1);
      else if (a.type === 'fixed') totalFixed += b;
      else if (a.type === 'receivable') totalRec += b;
      else if (['credit', 'loan'].includes(a.type)) totalLiab += Math.abs(b);
    });

    const totalAssets = totalLiquid + totalInv + totalFixed + totalRec;
    const netWorth = totalAssets - totalLiab;
    const debtRatio = totalAssets > 0 ? (totalLiab / totalAssets) * 100 : 0;

    let monthInc = 0;
    let monthExp = 0;
    const catMap: Record<string, number> = {};

    txs.forEach(t => {
      if (t.type === 'income') monthInc += t.amount;
      if (t.type === 'expense') {
        monthExp += t.amount;
        const c = t.category_name || '其他支出';
        catMap[c] = (catMap[c] || 0) + t.amount;
      }
    });

    const savings = monthInc - monthExp;
    const savingsRate = monthInc > 0 ? (savings / monthInc) * 100 : 0;

    const catBreakdown = Object.entries(catMap).map(([name, value]) => ({
      name,
      value,
      percentage: monthExp > 0 ? Math.round((value / monthExp) * 1000) / 10 : 0
    })).sort((a, b) => b.value - a.value);

    return {
      total_assets: totalAssets,
      total_liabilities: totalLiab,
      net_worth: netWorth,
      debt_ratio: Math.round(debtRatio * 10) / 10,
      asset_breakdown: {
        liquid: totalLiquid,
        investment: totalInv,
        fixed: totalFixed,
        receivable: totalRec,
        liabilities: totalLiab
      },
      month_summary: {
        income: monthInc,
        expense: monthExp,
        savings: savings,
        savings_rate: Math.round(savingsRate * 10) / 10
      },
      monthly_trends: [
        { month: '本月', income: monthInc, expense: monthExp, savings: savings }
      ],
      category_breakdown: catBreakdown,
      health_evaluation: {
        score: totalAssets > 0 ? 90 : 80,
        emergency_months: Math.round((totalLiquid / (monthExp || 2000)) * 10) / 10,
        savings_rate: Math.round(savingsRate * 10) / 10,
        debt_ratio: Math.round(debtRatio * 10) / 10,
        advice: [
          `欢迎使用个人财务手机管家！`,
          `已为您清空历史演示假数据，当前为全新个人账本。`
        ]
      }
    };
  }
};
