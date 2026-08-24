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
  ACCOUNTS: 'smartwealth_accounts',
  TRANSACTIONS: 'smartwealth_transactions',
  CATEGORIES: 'smartwealth_categories',
  BUDGETS: 'smartwealth_budgets',
  INVESTMENTS: 'smartwealth_investments',
  DEBTS: 'smartwealth_debts',
  GOALS: 'smartwealth_goals',
  SNAPSHOTS: 'smartwealth_snapshots',
  RECURRING: 'smartwealth_recurring'
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

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: '招商银行储蓄卡', type: 'bank', currency: 'CNY', balance: 38500.0, initial_balance: 38500.0, card_last4: '9527', bank_name: '招商银行', is_active: 1, note: '主要发薪日常卡' },
  { id: 'acc-2', name: '工商银行工资卡', type: 'bank', currency: 'CNY', balance: 15200.0, initial_balance: 15200.0, card_last4: '8888', bank_name: '工商银行', is_active: 1 },
  { id: 'acc-3', name: '微信零钱通', type: 'wallet', currency: 'CNY', balance: 3650.0, initial_balance: 3650.0, bank_name: '微信支付', is_active: 1 },
  { id: 'acc-4', name: '支付宝余额宝', type: 'wallet', currency: 'CNY', balance: 45000.0, initial_balance: 45000.0, bank_name: '支付宝', is_active: 1 },
  { id: 'acc-5', name: '华泰证券A股', type: 'investment', currency: 'CNY', balance: 185000.0, initial_balance: 150000.0, bank_name: '华泰证券', is_active: 1 },
  { id: 'acc-6', name: '富途证券(美股)', type: 'investment', currency: 'USD', balance: 12000.0, initial_balance: 10000.0, bank_name: '富途证券', is_active: 1 },
  { id: 'acc-7', name: '自住房产估值', type: 'fixed', currency: 'CNY', balance: 2600000.0, initial_balance: 2600000.0, is_active: 1 },
  { id: 'acc-8', name: '招商银行信用卡', type: 'credit', currency: 'CNY', balance: 4820.0, initial_balance: 4820.0, card_last4: '3344', bank_name: '招商银行', credit_limit: 60000, bill_day: 10, repay_day: 28, is_active: 1 },
  { id: 'acc-9', name: '招行住房按揭贷款', type: 'loan', currency: 'CNY', balance: 850000.0, initial_balance: 900000.0, is_active: 1 }
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: 't-1', type: 'income', amount: 18500.0, account_id: 'acc-2', account_name: '工商银行工资卡', category_name: '工资薪金', date: '2026-08-10 10:00', merchant: '某知名科技公司', note: '8月份薪资发放', source: 'sms_parser' },
  { id: 't-2', type: 'expense', amount: 5220.0, account_id: 'acc-1', account_name: '招商银行储蓄卡', category_name: '住房物业', date: '2026-08-15 06:00', merchant: '招行房贷中心', note: '8月份房贷月供扣除', source: 'recurring' },
  { id: 't-3', type: 'expense', amount: 368.0, account_id: 'acc-1', account_name: '招商银行储蓄卡', category_name: '餐饮美食', date: '2026-08-23 19:30', merchant: '海底捞火锅', note: '家庭周末聚餐', source: 'sms_parser' },
  { id: 't-4', type: 'expense', amount: 68.5, account_id: 'acc-3', account_name: '微信零钱通', category_name: '餐饮美食', date: '2026-08-24 14:15', merchant: '瑞幸咖啡', note: '生椰拿铁', source: 'sms_parser' },
  { id: 't-5', type: 'expense', amount: 88.0, account_id: 'acc-4', account_name: '支付宝余额宝', category_name: '购物消费', date: '2026-08-24 20:00', merchant: '淘宝天猫', note: '日常用品', source: 'sms_parser' }
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
  getAccounts: (): Account[] => getJson(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS),
  saveAccounts: (accs: Account[]) => setJson(STORAGE_KEYS.ACCOUNTS, accs),

  getTransactions: (): Transaction[] => getJson(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS),
  saveTransactions: (txs: Transaction[]) => setJson(STORAGE_KEYS.TRANSACTIONS, txs),

  getCategories: (): Category[] => getJson(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES),
  saveCategories: (cats: Category[]) => setJson(STORAGE_KEYS.CATEGORIES, cats),

  getBudgets: (): Budget[] => getJson(STORAGE_KEYS.BUDGETS, [
    { id: 'b-0', period: '2026-08', amount: 13000, alert_threshold: 0.8, spent_amount: 5744.5, remaining_amount: 7255.5, spent_percentage: 44.2, status: 'normal', category_name: '全部分类总预算' },
    { id: 'b-1', period: '2026-08', category_id: 'cat-exp-1', category_name: '餐饮美食', amount: 3200, alert_threshold: 0.8, spent_amount: 436.5, remaining_amount: 2763.5, spent_percentage: 13.6, status: 'normal' },
    { id: 'b-5', period: '2026-08', category_id: 'cat-exp-5', category_name: '住房物业', amount: 5500, alert_threshold: 0.9, spent_amount: 5220.0, remaining_amount: 280.0, spent_percentage: 94.9, status: 'warning' }
  ]),
  saveBudgets: (b: Budget[]) => setJson(STORAGE_KEYS.BUDGETS, b),

  getInvestments: (): Investment[] => getJson(STORAGE_KEYS.INVESTMENTS, [
    { id: 'inv-1', account_id: 'acc-5', account_name: '华泰证券A股', code: '600519', name: '贵州茅台', type: 'stock_a', shares: 100, cost_price: 1550, current_price: 1680, currency: 'CNY', total_cost: 155000, market_value: 168000, floating_pnl: 13000, pnl_rate: 8.39 },
    { id: 'inv-4', account_id: 'acc-6', account_name: '富途证券(美股)', code: 'AAPL', name: '苹果公司 Apple', type: 'stock_hk_us', shares: 40, cost_price: 185, current_price: 225, currency: 'USD', total_cost: 7400, market_value: 9000, floating_pnl: 1600, pnl_rate: 21.62 }
  ]),
  saveInvestments: (invs: Investment[]) => setJson(STORAGE_KEYS.INVESTMENTS, invs),

  getDebts: (): Debt[] => getJson(STORAGE_KEYS.DEBTS, [
    { id: 'debt-1', account_id: 'acc-9', name: '住房按揭商业贷款', type: 'mortgage', total_principal: 1200000, remaining_principal: 850000, interest_rate_annual: 0.0325, monthly_payment: 5220, bill_day: 1, repay_day: 15, progress_percentage: 29.2, remaining_months: 163 },
    { id: 'debt-2', account_id: 'acc-8', name: '招商银行信用卡账单', type: 'credit_card', total_principal: 60000, remaining_principal: 4820, interest_rate_annual: 0.18, monthly_payment: 4820, bill_day: 10, repay_day: 28, progress_percentage: 92.0, remaining_months: 1 }
  ]),
  saveDebts: (d: Debt[]) => setJson(STORAGE_KEYS.DEBTS, d),

  getGoals: (): Goal[] => getJson(STORAGE_KEYS.GOALS, [
    { id: 'g-1', name: '欧洲深度双人游', target_amount: 35000, current_amount: 22000, target_date: '2026-12-31', icon: 'Plane', color: '#3B82F6', is_completed: 0, progress_percentage: 62.9, days_left: 128, monthly_suggested_save: 3250 },
    { id: 'g-2', name: '新能源汽车置换基金', target_amount: 180000, current_amount: 95000, target_date: '2027-08-31', icon: 'Car', color: '#10B981', is_completed: 0, progress_percentage: 52.8, days_left: 371, monthly_suggested_save: 6538 }
  ]),
  saveGoals: (g: Goal[]) => setJson(STORAGE_KEYS.GOALS, g),

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
        { month: '2026-04', income: 18500, expense: 7800, savings: 10700 },
        { month: '2026-05', income: 19200, expense: 8400, savings: 10800 },
        { month: '2026-06', income: 18500, expense: 9100, savings: 9400 },
        { month: '2026-07', income: 21500, expense: 8900, savings: 12600 },
        { month: '2026-08', income: monthInc || 22550, expense: monthExp || 9333, savings: savings || 13217 }
      ],
      category_breakdown: catBreakdown.length > 0 ? catBreakdown : [
        { name: '住房物业', value: 5220, percentage: 65.0 },
        { name: '餐饮美食', value: 436.5, percentage: 5.4 },
        { name: '购物消费', value: 88.0, percentage: 1.1 }
      ],
      health_evaluation: {
        score: 95,
        emergency_months: Math.round((totalLiquid / (monthExp || 4000)) * 10) / 10,
        savings_rate: Math.round(savingsRate * 10) / 10,
        debt_ratio: Math.round(debtRatio * 10) / 10,
        advice: [
          `流动备用金充足（可覆盖约 ${(totalLiquid / (monthExp || 4000)).toFixed(1)} 个月日常开支），抗风险能力强。`,
          `当前资产配置多元，储蓄率良好！`
        ]
      }
    };
  }
};
