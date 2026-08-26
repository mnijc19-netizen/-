export type AccountType = 
  | 'cash' 
  | 'bank' 
  | 'wallet' 
  | 'investment' 
  | 'crypto' 
  | 'fixed' 
  | 'credit' 
  | 'loan' 
  | 'receivable'
  | 'huabei'
  | 'baitiao'
  | 'meituan_pay'
  | 'douyin_pay'
  | 'jiebei'
  | 'fenfu';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  initial_balance: number;
  cash_balance?: number; // 券商/理财账户内未投资的可用活期现金
  card_last4?: string;
  bank_name?: string;
  credit_limit?: number;
  bill_day?: number;
  repay_day?: number;
  interest_rate?: number;
  icon?: string;
  color?: string;
  note?: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export type TransactionType = 'expense' | 'income' | 'transfer' | 'repayment' | 'investment' | 'adjustment';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  account_id: string;
  account_name?: string;
  to_account_id?: string;
  to_account_name?: string;
  category_id?: string;
  category_name?: string;
  subcategory_name?: string;
  date: string;
  merchant?: string;
  note?: string;
  tags?: string[];
  source?: string;
  raw_text?: string;
  status?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  parent_id?: string;
  icon?: string;
  color?: string;
  is_system?: number;
  is_custom?: number;
  sort_order?: number;
}

export interface Budget {
  id: string;
  category_id?: string;
  category_name?: string;
  amount: number;
  period: string;
  spent_amount: number;
  remaining_amount: number;
  spent_percentage: number;
  alert_threshold: number;
  status: 'normal' | 'warning' | 'danger' | 'exceeded';
}

export interface Investment {
  id: string;
  account_id: string;
  account_name?: string;
  code: string;
  name: string;
  type: 'stock_a' | 'stock_hk_us' | 'fund' | 'crypto' | 'gold' | 'other';
  shares: number;
  cost_price: number;
  current_price: number;
  currency: string;
  total_cost: number;
  market_value: number;
  floating_pnl: number;
  pnl_rate: number;
}

export interface Debt {
  id: string;
  account_id?: string;
  name: string;
  type: 'credit_card' | 'mortgage' | 'car_loan' | 'consumer_loan' | 'personal_borrow' | 'huabei' | 'baitiao' | 'meituan_pay' | 'douyin_pay' | 'jiebei' | 'fenfu';
  total_principal: number;
  remaining_principal: number;
  interest_rate_annual: number;
  monthly_payment: number;
  start_date?: string;
  end_date?: string;
  bill_day?: number;
  repay_day?: number;
  notes?: string;
  progress_percentage: number;
  remaining_months?: number;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  icon?: string;
  color?: string;
  notes?: string;
  is_completed: number;
  progress_percentage: number;
  days_left?: number;
  monthly_suggested_save?: number;
}

export interface ParsedTransactionResult {
  success: boolean;
  confidence: number;
  type: TransactionType;
  amount?: number;
  card_last4?: string;
  bank_or_channel?: string;
  merchant?: string;
  suggested_category?: string;
  date?: string;
  balance_after?: number;
  raw_text: string;
  matched_rule?: string;
  matched_account_id?: string;
  matched_account_name?: string;
  note?: string;
}

export interface DashboardAnalytics {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  debt_ratio: number;
  asset_breakdown: {
    liquid: number;
    investment: number;
    fixed: number;
    receivable: number;
    liabilities: number;
  };
  month_summary: {
    income: number;
    expense: number;
    savings: number;
    savings_rate: number;
  };
  monthly_trends: Array<{
    month: string;
    income: number;
    expense: number;
    savings: number;
  }>;
  category_breakdown: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  health_evaluation: {
    score: number;
    emergency_months: number;
    savings_rate: number;
    debt_ratio: number;
    advice: string[];
  };
}

export interface SankeyData {
  nodes: Array<{ name: string }>;
  links: Array<{ source: string; target: string; value: number }>;
}

export interface AssetSnapshot {
  id: string;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  accounts_data: Array<{
    account_id: string;
    account_name: string;
    account_type: string;
    old_balance: number;
    new_balance: number;
    diff: number;
  }>;
  notes?: string;
}

export interface RecurringRule {
  id: string;
  name: string;
  type: string;
  amount: number;
  account_id: string;
  to_account_id?: string;
  category_id?: string;
  frequency: string;
  day_of_period: number;
  last_executed?: string;
  is_active: number;
  note?: string;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  imageUrl?: string;
  imageUrls?: string[];
  timestamp: string;
  pendingAction?: {
    type: string;
    status: 'staged' | 'committed' | 'cancelled';
    payload: any;
  };
  actionResult?: {
    type: string;
    data?: any;
  };
}

export interface AgentResponse {
  reply: string;
  reasoning?: string;
  action: {
    type: string;
    payload?: any;
  };
}

