import sqlite3
import os
import json
from pathlib import Path
from contextlib import contextmanager

DB_DIR = Path(__file__).resolve().parent
DB_FILE = DB_DIR / "finance.db"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Accounts Table (账户与资产)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,          -- 'cash', 'bank', 'wallet', 'investment', 'crypto', 'fixed', 'credit', 'loan', 'receivable'
            currency TEXT DEFAULT 'CNY', -- 'CNY', 'USD', 'HKD', 'EUR', 'JPY', 'USDT', etc.
            balance REAL DEFAULT 0.0,
            initial_balance REAL DEFAULT 0.0,
            card_last4 TEXT,
            bank_name TEXT,
            credit_limit REAL DEFAULT 0.0,
            bill_day INTEGER DEFAULT 1,
            repay_day INTEGER DEFAULT 20,
            interest_rate REAL DEFAULT 0.0,
            icon TEXT,
            color TEXT,
            note TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 2. Categories Table (分类)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,          -- 'expense', 'income'
            parent_id TEXT,
            icon TEXT,
            color TEXT,
            is_system INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0
        );
        """)

        # 3. Transactions Table (交易流水)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,          -- 'expense', 'income', 'transfer', 'repayment', 'investment', 'adjustment'
            amount REAL NOT NULL,
            account_id TEXT NOT NULL,
            to_account_id TEXT,          -- for transfers/repayments
            category_id TEXT,
            category_name TEXT,
            subcategory_name TEXT,
            date TEXT NOT NULL,          -- 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS'
            merchant TEXT,
            note TEXT,
            tags TEXT,                   -- JSON list e.g. '["旅游", "餐饮"]'
            source TEXT DEFAULT 'manual',-- 'manual', 'sms_parser', 'wechat_import', 'alipay_import', 'recurring', 'snapshot'
            raw_text TEXT,               -- original SMS or text
            status TEXT DEFAULT 'confirmed', -- 'confirmed', 'pending', 'cancelled'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
        """)

        # 4. Budgets Table (预算)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY,
            period TEXT NOT NULL,        -- 'YYYY-MM'
            category_id TEXT,            -- NULL for overall monthly budget
            amount REAL NOT NULL,
            alert_threshold REAL DEFAULT 0.8,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 5. Investments Table (投资持仓)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS investments (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            code TEXT NOT NULL,          -- e.g. '000001', 'AAPL', 'BTC'
            name TEXT NOT NULL,
            type TEXT NOT NULL,          -- 'stock_a', 'stock_hk_us', 'fund', 'crypto', 'gold', 'other'
            shares REAL NOT NULL,        -- 持有份额/数量
            cost_price REAL NOT NULL,    -- 成本单价
            current_price REAL NOT NULL, -- 最新单价
            currency TEXT DEFAULT 'CNY',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
        """)

        # 6. Debts Table (负债与信贷计划)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS debts (
            id TEXT PRIMARY KEY,
            account_id TEXT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,          -- 'credit_card', 'mortgage', 'car_loan', 'consumer_loan', 'personal_borrow'
            total_principal REAL NOT NULL,
            remaining_principal REAL NOT NULL,
            interest_rate_annual REAL DEFAULT 0.0,
            monthly_payment REAL DEFAULT 0.0,
            start_date TEXT,
            end_date TEXT,
            bill_day INTEGER DEFAULT 1,
            repay_day INTEGER DEFAULT 20,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 7. Goals Table (财务目标与心愿)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL DEFAULT 0.0,
            target_date TEXT,
            icon TEXT,
            color TEXT,
            notes TEXT,
            is_completed INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 8. Recurring Items Table (周期性/固定收支规则 - 自动记账)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS recurring_rules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,          -- 'expense', 'income', 'transfer'
            amount REAL NOT NULL,
            account_id TEXT NOT NULL,
            to_account_id TEXT,
            category_id TEXT,
            frequency TEXT NOT NULL,     -- 'daily', 'weekly', 'monthly', 'yearly'
            day_of_period INTEGER NOT NULL, -- e.g. 10 (10th of every month)
            last_executed TEXT,
            is_active INTEGER DEFAULT 1,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 9. Asset Snapshots Table (余额快照模式 - 懒人免明细记账)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS asset_snapshots (
            id TEXT PRIMARY KEY,
            snapshot_date TEXT NOT NULL, -- 'YYYY-MM-DD'
            total_assets REAL NOT NULL,
            total_liabilities REAL NOT NULL,
            net_worth REAL NOT NULL,
            accounts_data TEXT NOT NULL, -- JSON snapshot of each account balance
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 10. SMS & Parser Rules (短信/通知自定义规则)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS parser_rules (
            id TEXT PRIMARY KEY,
            bank_name TEXT NOT NULL,
            rule_name TEXT NOT NULL,
            pattern TEXT NOT NULL,       -- Regex pattern with named groups (?P<amount>...), (?P<card>...)
            type TEXT NOT NULL,          -- 'expense', 'income', 'transfer'
            default_category TEXT,
            is_builtin INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1
        );
        """)

        # Indexes for fast lookup
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_date ON transactions(date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_account ON transactions(account_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_category ON transactions(category_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_type ON transactions(type);")
