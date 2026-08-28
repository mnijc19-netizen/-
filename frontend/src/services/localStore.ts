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
import { dbStore } from './dbStore';

export interface AiConfig {
  enabled: boolean;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  providerKeys?: Record<string, string>;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: true,
  provider: 'zhipu',
  apiKey: '3e3a1c2d2b8c42cf8dd3da9ce64a8f4a.1lGvbmammJGT8KYL',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'glm-4.5-air',
  providerKeys: {
    'zhipu': '3e3a1c2d2b8c42cf8dd3da9ce64a8f4a.1lGvbmammJGT8KYL'
  }
};

/**
 * Automatically calculates the maximum safe token limit based on model constraints.
 * GLM-4V-Flash (Free vision): max 1024
 * GLM-4.6V (Vision flagship 600W pack): max 8192
 * GLM-4.5-Air (Speed flagship 1200W pack): max 8192
 * GLM-4-Flash / DeepSeek / OpenAI: max 8192
 */
export function getModelMaxTokens(modelName: string): number {
  const m = (modelName || '').toLowerCase().trim();
  if (m.includes('4v-flash') || m === 'glm-4v-flash') {
    return 1024; // Zhipu 4V-Flash API hard ceiling
  }
  if (m.includes('5.6') || m.includes('5.5') || m.includes('5.4') || m.includes('deepseek') || m.includes('4.6v') || m.includes('4.5-air') || m.includes('4-plus') || m.includes('gpt') || m.includes('o3') || m.includes('o1') || m.includes('qwen') || m.includes('kimi')) {
    return 8192; // Flagship models max ceiling
  }
  return 4096;
}

export const STORAGE_KEYS = {
  ACCOUNTS: 'smartwealth_accounts_v2',
  TRANSACTIONS: 'smartwealth_transactions_v2',
  CATEGORIES: 'smartwealth_categories_v2',
  BUDGETS: 'smartwealth_budgets_v2',
  INVESTMENTS: 'smartwealth_investments_v2',
  DEBTS: 'smartwealth_debts_v2',
  GOALS: 'smartwealth_goals_v2',
  SNAPSHOTS: 'smartwealth_snapshots_v2',
  RECURRING: 'smartwealth_recurring_v2',
  AI_CONFIG: 'smartwealth_ai_config_v1',
  LIQUID_GLASS: 'smartwealth_liquid_glass_v1',
  ONBOARDING_COMPLETED: 'smartwealth_onboarding_completed_v1',
  WEBDAV_CONFIG: 'smartwealth_webdav_config_v1'
};

// Initialize preload of all keys into memory cache
if (typeof window !== 'undefined') {
  dbStore.preload(Object.values(STORAGE_KEYS));
}

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

// Clean initial starting accounts (Only everyday ubiquitous digital wallets by default)
const CLEAN_INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: '微信零钱/零钱通', type: 'wallet', currency: 'CNY', balance: 0.0, initial_balance: 0.0, bank_name: '微信支付', is_active: 1 },
  { id: 'acc-2', name: '支付宝/余额宝', type: 'wallet', currency: 'CNY', balance: 0.0, initial_balance: 0.0, bank_name: '支付宝', is_active: 1 }
];

export const localStore = {
  getAccounts: (): Account[] => dbStore.getSync(STORAGE_KEYS.ACCOUNTS, CLEAN_INITIAL_ACCOUNTS),
  saveAccounts: (accs: Account[]) => dbStore.set(STORAGE_KEYS.ACCOUNTS, accs),

  getTransactions: (): Transaction[] => dbStore.getSync(STORAGE_KEYS.TRANSACTIONS, []),
  saveTransactions: (txs: Transaction[]) => dbStore.set(STORAGE_KEYS.TRANSACTIONS, txs),

  deduplicateAndCleanTransactions: (): number => {
    const txs = dbStore.getSync<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    if (!txs || txs.length === 0) return 0;

    const seenRaw = new Set<string>();
    const seenFuzzy = new Set<string>();
    const cleaned: Transaction[] = [];
    let removed = 0;

    for (const tx of txs) {
      const rawKey = tx.raw_text ? tx.raw_text.trim() : '';
      const dateKey = (tx.date || '').substring(0, 10);
      const fuzzyKey = `${(tx.merchant || '').trim()}_${Number(tx.amount || 0).toFixed(2)}_${tx.type}_${dateKey}`;
      
      const isDup = (rawKey && seenRaw.has(rawKey)) || seenFuzzy.has(fuzzyKey);
      if (isDup) {
        removed++;
        // Revert balance impact
        const accs = dbStore.getSync<Account[]>(STORAGE_KEYS.ACCOUNTS, CLEAN_INITIAL_ACCOUNTS);
        const acc = accs.find(a => a.id === tx.account_id) || accs[0];
        if (acc) {
          if (tx.type === 'expense') acc.balance += tx.amount;
          else if (tx.type === 'income') acc.balance -= tx.amount;
          dbStore.set(STORAGE_KEYS.ACCOUNTS, accs);
        }
        continue;
      }
      if (rawKey) seenRaw.add(rawKey);
      seenFuzzy.add(fuzzyKey);
      cleaned.push(tx);
    }

    if (removed > 0) {
      dbStore.set(STORAGE_KEYS.TRANSACTIONS, cleaned);
    }
    return removed;
  },

  convertMistakenDebtTransactions: (): boolean => {
    const txs = dbStore.getSync<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    if (!txs || txs.length === 0) return false;

    let modified = false;
    const remainingTxs: Transaction[] = [];

    for (const tx of txs) {
      const merchantStr = tx.merchant || '';
      const isMistakenDebt = Math.abs(tx.amount - 2691.41) < 0.01 && 
        (merchantStr === '快捷指令入账' || merchantStr.includes('白条') || tx.category_name === '餐饮美食' || tx.category_name === '日常消费');
      
      if (isMistakenDebt) {
        modified = true;
        // 1. Revert balance on WeChat account
        const accs = dbStore.getSync<Account[]>(STORAGE_KEYS.ACCOUNTS, CLEAN_INITIAL_ACCOUNTS);
        const wxAcc = accs.find(a => a.id === tx.account_id || a.name.includes('微信') || a.name.includes('零钱')) || accs[0];
        if (wxAcc) {
          wxAcc.balance += tx.amount;
        }
        // 2. Add as correct debt in debts list if not already present
        const debts = dbStore.getSync<Debt[]>(STORAGE_KEYS.DEBTS, []);
        if (!debts.some(d => d.name === '京东白条' || d.type === 'baitiao')) {
          debts.push({
            id: 'debt-jd-baitiao',
            name: '京东白条',
            type: 'baitiao' as any,
            total_principal: 2691.41,
            remaining_principal: 2691.41,
            interest_rate_annual: 0,
            monthly_payment: 804.05,
            repay_day: 4,
            total_installments: 3,
            current_installment: 1,
            is_repaid_this_month: false,
            progress_percentage: 0
          });
          dbStore.set(STORAGE_KEYS.DEBTS, debts);
        }
        // 3. Ensure liability account exists
        let baitiaoAcc = accs.find(a => a.name.includes('白条') || a.type === 'baitiao');
        if (!baitiaoAcc) {
          accs.push({
            id: 'acc-baitiao',
            name: '京东白条',
            type: 'baitiao' as any,
            currency: 'CNY',
            balance: 2691.41,
            initial_balance: 2691.41,
            is_active: 1,
            note: '京东白条待还分期'
          });
        } else {
          baitiaoAcc.balance = 2691.41;
        }
        dbStore.set(STORAGE_KEYS.ACCOUNTS, accs);
        continue;
      }
      remainingTxs.push(tx);
    }

    // Prune generic placeholder accounts ("主要银行储蓄卡", "信用卡账户") if they have 0 balance and no transactions
    const currentAccs = dbStore.getSync<Account[]>(STORAGE_KEYS.ACCOUNTS, CLEAN_INITIAL_ACCOUNTS);
    const activeTxAccIds = new Set(remainingTxs.map(t => t.account_id));
    const prunedAccs = currentAccs.filter(a => {
      if ((a.id === 'acc-3' || a.name === '主要银行储蓄卡' || a.id === 'acc-4' || a.name === '信用卡账户') && a.balance === 0 && !activeTxAccIds.has(a.id)) {
        modified = true;
        return false;
      }
      return true;
    });
    if (prunedAccs.length !== currentAccs.length) {
      dbStore.set(STORAGE_KEYS.ACCOUNTS, prunedAccs);
    }

    if (modified) {
      dbStore.set(STORAGE_KEYS.TRANSACTIONS, remainingTxs);
      return true;
    }
    return false;
  },

  getCategories: (): Category[] => dbStore.getSync(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES),
  saveCategories: (cats: Category[]) => dbStore.set(STORAGE_KEYS.CATEGORIES, cats),

  getBudgets: (): Budget[] => dbStore.getSync(STORAGE_KEYS.BUDGETS, []),
  saveBudgets: (b: Budget[]) => dbStore.set(STORAGE_KEYS.BUDGETS, b),

  getInvestments: (): Investment[] => dbStore.getSync(STORAGE_KEYS.INVESTMENTS, []),
  saveInvestments: (invs: Investment[]) => dbStore.set(STORAGE_KEYS.INVESTMENTS, invs),

  getDebts: (): Debt[] => dbStore.getSync(STORAGE_KEYS.DEBTS, []),
  saveDebts: (d: Debt[]) => dbStore.set(STORAGE_KEYS.DEBTS, d),

  getGoals: (): Goal[] => dbStore.getSync(STORAGE_KEYS.GOALS, []),
  saveGoals: (g: Goal[]) => dbStore.set(STORAGE_KEYS.GOALS, g),

  getSnapshots: (): AssetSnapshot[] => dbStore.getSync(STORAGE_KEYS.SNAPSHOTS, []),
  saveSnapshots: (s: AssetSnapshot[]) => dbStore.set(STORAGE_KEYS.SNAPSHOTS, s),

  getRecurringRules: (): RecurringRule[] => dbStore.getSync(STORAGE_KEYS.RECURRING, []),
  saveRecurringRules: (r: RecurringRule[]) => dbStore.set(STORAGE_KEYS.RECURRING, r),

  getAiConfig: (): AiConfig => {
    const raw = dbStore.getSync(STORAGE_KEYS.AI_CONFIG, DEFAULT_AI_CONFIG);
    const cfg: AiConfig = { ...DEFAULT_AI_CONFIG, ...raw };
    if (!cfg.apiKey || !cfg.apiKey.trim()) {
      cfg.apiKey = DEFAULT_AI_CONFIG.apiKey;
    }
    cfg.enabled = true;
    if (cfg.provider && cfg.provider.startsWith('zhipu')) {
      cfg.provider = 'zhipu';
    }
    if (!cfg.providerKeys) cfg.providerKeys = {};
    if (cfg.apiKey && cfg.provider && !cfg.providerKeys[cfg.provider]) {
      cfg.providerKeys[cfg.provider] = cfg.apiKey;
    }
    return cfg;
  },
  saveAiConfig: (cfg: AiConfig) => {
    const providerKeys = { ...(cfg.providerKeys || {}) };
    if (cfg.provider && cfg.apiKey) {
      providerKeys[cfg.provider] = cfg.apiKey;
    }
    const updated = { ...cfg, providerKeys };
    dbStore.set(STORAGE_KEYS.AI_CONFIG, updated);
  },

  getOnboardingCompleted: (): boolean => {
    return dbStore.getSync(STORAGE_KEYS.ONBOARDING_COMPLETED, false);
  },
  saveOnboardingCompleted: (val: boolean) => {
    dbStore.set(STORAGE_KEYS.ONBOARDING_COMPLETED, val);
  },

  getLiquidGlass(): boolean {
    return dbStore.getSync(STORAGE_KEYS.LIQUID_GLASS, false);
  },
  saveLiquidGlass(enabled: boolean): void {
    dbStore.set(STORAGE_KEYS.LIQUID_GLASS, enabled);
  },

  getLiquidGlassUnlocked(): boolean {
    return dbStore.getSync('smartwealth_liquid_glass_unlocked_v1', false);
  },
  saveLiquidGlassUnlocked(unlocked: boolean): void {
    dbStore.set('smartwealth_liquid_glass_unlocked_v1', unlocked);
  },

  getWebDavConfig(): { url: string; user: string; pass: string; autoSync: boolean } {
    return dbStore.getSync(STORAGE_KEYS.WEBDAV_CONFIG, {
      url: '',
      user: '',
      pass: '',
      autoSync: false
    });
  },
  saveWebDavConfig(cfg: { url: string; user: string; pass: string; autoSync: boolean }) {
    dbStore.set(STORAGE_KEYS.WEBDAV_CONFIG, cfg);
  },

  clearAllData: () => {
    dbStore.remove(STORAGE_KEYS.ACCOUNTS);
    dbStore.remove(STORAGE_KEYS.TRANSACTIONS);
    dbStore.remove(STORAGE_KEYS.BUDGETS);
    dbStore.remove(STORAGE_KEYS.INVESTMENTS);
    dbStore.remove(STORAGE_KEYS.DEBTS);
    dbStore.remove(STORAGE_KEYS.GOALS);
    dbStore.remove(STORAGE_KEYS.SNAPSHOTS);
    dbStore.remove(STORAGE_KEYS.RECURRING);
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
      else if (['credit', 'loan', 'huabei', 'baitiao', 'meituan_pay', 'douyin_pay', 'jiebei', 'fenfu'].includes(a.type)) totalLiab += Math.abs(b);
    });

    const totalAssets = totalLiquid + totalInv + totalFixed + totalRec;
    const netWorth = totalAssets - totalLiab;
    const debtRatio = totalAssets > 0 ? (totalLiab / totalAssets) * 100 : 0;

    let monthInc = 0;
    let monthExp = 0;
    const catMap: Record<string, number> = {};
    const monthTrendMap: Record<string, { income: number; expense: number; savings: number }> = {};

    // Get current month prefix (YYYY-MM)
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    txs.forEach(t => {
      // Exclude balance adjustments / calibration records from living consumption
      const isAdjustment = t.category_name === '余额校准' || 
                           (t.merchant && t.merchant.includes('余额校准')) || 
                           (t.note && t.note.includes('余额校准'));
      if (isAdjustment) return;

      const txMonth = (t.date || '').substring(0, 7) || currentMonthPrefix;
      if (!monthTrendMap[txMonth]) {
        monthTrendMap[txMonth] = { income: 0, expense: 0, savings: 0 };
      }

      if (t.type === 'income') {
        monthTrendMap[txMonth].income += t.amount;
        if (txMonth === currentMonthPrefix) monthInc += t.amount;
      } else if (t.type === 'expense') {
        monthTrendMap[txMonth].expense += t.amount;
        if (txMonth === currentMonthPrefix) {
          monthExp += t.amount;
          const c = t.category_name || '其他支出';
          catMap[c] = (catMap[c] || 0) + t.amount;
        }
      }
      monthTrendMap[txMonth].savings = monthTrendMap[txMonth].income - monthTrendMap[txMonth].expense;
    });

    const savings = monthInc - monthExp;
    const savingsRate = monthInc > 0 ? (savings / monthInc) * 100 : 0;

    const catBreakdown = Object.entries(catMap).map(([name, value]) => ({
      name,
      value,
      percentage: monthExp > 0 ? Math.round((value / monthExp) * 1000) / 10 : 0
    })).sort((a, b) => b.value - a.value);

    // Build 6-month historical trends list
    const monthlyTrends: Array<{ month: string; income: number; expense: number; savings: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = `${d.getMonth() + 1}月`;
      const data = monthTrendMap[mKey] || { income: 0, expense: 0, savings: 0 };
      monthlyTrends.push({
        month: mLabel,
        income: data.income,
        expense: data.expense,
        savings: data.savings
      });
    }

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
      monthly_trends: monthlyTrends,
      category_breakdown: catBreakdown,
      health_evaluation: {
        score: totalAssets > 0 ? (debtRatio > 50 ? 75 : 92) : 80,
        emergency_months: Math.round((totalLiquid / (monthExp || 2000)) * 10) / 10,
        savings_rate: Math.round(savingsRate * 10) / 10,
        debt_ratio: Math.round(debtRatio * 10) / 10,
        advice: totalAssets === 0 ? [
          '欢迎使用个人财务手机管家！',
          '点击下方「+」或右上角「AI 管家」发送余额截图即可开启极速开账。'
        ] : [
          `当前流动性储备可支撑日常开支约 ${(totalLiquid / (monthExp || 2000)).toFixed(1)} 个月`,
          debtRatio > 30 ? '负债率偏高，建议优先归还高息账单' : '资产负债结构健康，可按计划稳步储蓄与定投'
        ]
      }
    };
  }
};
