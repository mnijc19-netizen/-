from fastapi import APIRouter, HTTPException
import uuid
from typing import List
from backend.database import get_db
from backend.schemas import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])

@router.get("", response_model=List[AccountResponse])
def get_accounts():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM accounts WHERE is_active = 1 ORDER BY type, name")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@router.post("", response_model=AccountResponse)
def create_account(account: AccountCreate):
    account_id = f"acc-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO accounts (id, name, type, currency, balance, initial_balance, card_last4, bank_name, credit_limit, bill_day, repay_day, interest_rate, icon, color, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            account_id,
            account.name,
            account.type,
            account.currency,
            account.balance,
            account.balance,
            account.card_last4,
            account.bank_name,
            account.credit_limit,
            account.bill_day,
            account.repay_day,
            account.interest_rate,
            account.icon,
            account.color,
            account.note
        ))
        cursor.execute("SELECT * FROM accounts WHERE id = ?", (account_id,))
        row = cursor.fetchone()
        return dict(row)

@router.put("/{account_id}", response_model=AccountResponse)
def update_account(account_id: str, payload: AccountUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM accounts WHERE id = ?", (account_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="账户不存在")
            
        update_data = payload.dict(exclude_unset=True)
        if not update_data:
            return dict(existing)
            
        fields = [f"{k} = ?" for k in update_data.keys()]
        values = list(update_data.values()) + [account_id]
        
        cursor.execute(f"UPDATE accounts SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        cursor.execute("SELECT * FROM accounts WHERE id = ?", (account_id,))
        return dict(cursor.fetchone())

@router.delete("/{account_id}")
def delete_account(account_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE accounts SET is_active = 0 WHERE id = ?", (account_id,))
        return {"success": True, "message": "账户已停用"}
