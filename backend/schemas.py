from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# 1. Account Schemas
class AccountBase(BaseModel):
    name: str
    type: str # 'cash', 'bank', 'wallet', 'investment', 'crypto', 'fixed', 'credit', 'loan', 'receivable'
    currency: str = "CNY"
    balance: float = 0.0
    initial_balance: float = 0.0
    card_last4: Optional[str] = None
    bank_name: Optional[str] = None
    credit_limit: Optional[float] = 0.0
    bill_day: Optional[int] = 1
    repay_day: Optional[int] = 20
    interest_rate: Optional[float] = 0.0
    icon: Optional[str] = None
    color: Optional[str] = None
    note: Optional[str] = None
    is_active: Optional[int] = 1

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    currency: Optional[str] = None
    balance: Optional[float] = None
    card_last4: Optional[str] = None
    bank_name: Optional[str] = None
    credit_limit: Optional[float] = None
    bill_day: Optional[int] = None
    repay_day: Optional[int] = None
    interest_rate: Optional[float] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    note: Optional[str] = None
    is_active: Optional[int] = None

class AccountResponse(AccountBase):
    id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# 2. Transaction Schemas
class TransactionBase(BaseModel):
    type: str # 'expense', 'income', 'transfer', 'repayment', 'investment', 'adjustment'
    amount: float
    account_id: str
    to_account_id: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    subcategory_name: Optional[str] = None
    date: str # 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS'
    merchant: Optional[str] = None
    note: Optional[str] = None
    tags: Optional[List[str]] = []
    source: Optional[str] = "manual"
    raw_text: Optional[str] = None
    status: Optional[str] = "confirmed"

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    account_id: Optional[str] = None
    to_account_id: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    subcategory_name: Optional[str] = None
    date: Optional[str] = None
    merchant: Optional[str] = None
    note: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: str
    account_name: Optional[str] = None
    to_account_name: Optional[str] = None
    created_at: Optional[str] = None

# 3. Category Schemas
class CategoryBase(BaseModel):
    name: str
    type: str # 'expense', 'income'
    parent_id: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_system: Optional[int] = 0
    sort_order: Optional[int] = 0

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str

# 4. Budget Schemas
class BudgetBase(BaseModel):
    period: str # 'YYYY-MM'
    category_id: Optional[str] = None
    amount: float
    alert_threshold: Optional[float] = 0.8

class BudgetCreate(BudgetBase):
    pass

class BudgetResponse(BudgetBase):
    id: str
    category_name: Optional[str] = None
    spent_amount: Optional[float] = 0.0
    remaining_amount: Optional[float] = 0.0
    spent_percentage: Optional[float] = 0.0
    status: Optional[str] = "normal" # 'normal', 'warning', 'danger'

# 5. Investment Schemas
class InvestmentBase(BaseModel):
    account_id: str
    code: str
    name: str
    type: str # 'stock_a', 'stock_hk_us', 'fund', 'crypto', 'gold', 'other'
    shares: float
    cost_price: float
    current_price: float
    currency: Optional[str] = "CNY"

class InvestmentCreate(InvestmentBase):
    pass

class InvestmentResponse(InvestmentBase):
    id: str
    total_cost: float
    market_value: float
    floating_pnl: float
    pnl_rate: float
    account_name: Optional[str] = None

# 6. Debt Schemas
class DebtBase(BaseModel):
    name: str
    type: str # 'credit_card', 'mortgage', 'car_loan', 'consumer_loan', 'personal_borrow'
    total_principal: float
    remaining_principal: float
    interest_rate_annual: Optional[float] = 0.0
    monthly_payment: Optional[float] = 0.0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    bill_day: Optional[int] = 1
    repay_day: Optional[int] = 20
    notes: Optional[str] = None
    account_id: Optional[str] = None

class DebtCreate(DebtBase):
    pass

class DebtResponse(DebtBase):
    id: str
    progress_percentage: float = 0.0
    remaining_months: Optional[int] = None

# 7. Goals Schemas
class GoalBase(BaseModel):
    name: str
    target_amount: float
    current_amount: Optional[float] = 0.0
    target_date: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    notes: Optional[str] = None
    is_completed: Optional[int] = 0

class GoalCreate(GoalBase):
    pass

class GoalResponse(GoalBase):
    id: str
    progress_percentage: float = 0.0
    days_left: Optional[int] = None
    monthly_suggested_save: Optional[float] = 0.0

# 8. Smart SMS & Text Parser Schemas
class ParseTextRequest(BaseModel):
    text: str

class ParsedTransactionResult(BaseModel):
    success: bool
    confidence: float # 0.0 ~ 1.0
    type: str # 'expense', 'income', 'transfer', 'repayment'
    amount: Optional[float] = None
    card_last4: Optional[str] = None
    bank_or_channel: Optional[str] = None
    merchant: Optional[str] = None
    suggested_category: Optional[str] = None
    date: Optional[str] = None
    balance_after: Optional[float] = None
    raw_text: str
    matched_rule: Optional[str] = None
    matched_account_id: Optional[str] = None
    matched_account_name: Optional[str] = None
    note: Optional[str] = None

# 9. Snapshot Mode (Lazy Bookkeeping)
class SnapshotCreate(BaseModel):
    snapshot_date: str
    accounts_balances: Dict[str, float] # { "account_id": balance }
    notes: Optional[str] = None

# 10. Recurring Rule Schemas
class RecurringRuleBase(BaseModel):
    name: str
    type: str
    amount: float
    account_id: str
    to_account_id: Optional[str] = None
    category_id: Optional[str] = None
    frequency: str = "monthly" # 'daily', 'weekly', 'monthly', 'yearly'
    day_of_period: int = 1
    is_active: int = 1
    note: Optional[str] = None

class RecurringRuleCreate(RecurringRuleBase):
    pass

class RecurringRuleResponse(RecurringRuleBase):
    id: str
    last_executed: Optional[str] = None
