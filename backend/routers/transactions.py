from fastapi import APIRouter, HTTPException, Query
import uuid
import json
from typing import List, Optional
from datetime import datetime
from backend.database import get_db
from backend.schemas import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    CategoryCreate, CategoryResponse
)

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    account_id: Optional[str] = None,
    category_id: Optional[str] = None,
    type: Optional[str] = None,
    keyword: Optional[str] = None,
    limit: int = 200,
    offset: int = 0
):
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = """
        SELECT t.*, a.name as account_name, ta.name as to_account_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN accounts ta ON t.to_account_id = ta.id
        WHERE 1=1
        """
        params = []
        
        if start_date:
            query += " AND t.date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND t.date <= ?"
            params.append(f"{end_date} 23:59:59")
        if account_id:
            query += " AND (t.account_id = ? OR t.to_account_id = ?)"
            params.extend([account_id, account_id])
        if category_id:
            query += " AND t.category_id = ?"
            params.append(category_id)
        if type:
            query += " AND t.type = ?"
            params.append(type)
        if keyword:
            query += " AND (t.merchant LIKE ? OR t.note LIKE ? OR t.raw_text LIKE ? OR t.category_name LIKE ?)"
            like_kw = f"%{keyword}%"
            params.extend([like_kw, like_kw, like_kw, like_kw])
            
        query += " ORDER BY t.date DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            d = dict(r)
            try:
                d["tags"] = json.loads(d["tags"]) if d.get("tags") else []
            except Exception:
                d["tags"] = []
            results.append(d)
        return results

@router.post("", response_model=TransactionResponse)
def create_transaction(trans: TransactionCreate):
    trans_id = f"t-{uuid.uuid4().hex[:8]}"
    tags_json = json.dumps(trans.tags or [], ensure_ascii=False)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify account exists
        cursor.execute("SELECT * FROM accounts WHERE id = ?", (trans.account_id,))
        acc = cursor.fetchone()
        if not acc:
            raise HTTPException(status_code=400, detail="账户不存在")
            
        # Determine category name if missing
        cat_name = trans.category_name
        if trans.category_id and not cat_name:
            cursor.execute("SELECT name FROM categories WHERE id = ?", (trans.category_id,))
            crow = cursor.fetchone()
            if crow:
                cat_name = crow["name"]

        # Insert transaction
        cursor.execute("""
        INSERT INTO transactions (
            id, type, amount, account_id, to_account_id, category_id, category_name, 
            subcategory_name, date, merchant, note, tags, source, raw_text, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            trans_id, trans.type, trans.amount, trans.account_id, trans.to_account_id,
            trans.category_id, cat_name, trans.subcategory_name, trans.date,
            trans.merchant, trans.note, tags_json, trans.source, trans.raw_text, trans.status
        ))
        
        # Update Account Balances
        if trans.type == "expense":
            cursor.execute("UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (trans.amount, trans.account_id))
        elif trans.type == "income":
            cursor.execute("UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (trans.amount, trans.account_id))
        elif trans.type in ["transfer", "repayment"] and trans.to_account_id:
            cursor.execute("UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (trans.amount, trans.account_id))
            cursor.execute("UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (trans.amount, trans.to_account_id))
            
        # Return new transaction
        cursor.execute("""
        SELECT t.*, a.name as account_name, ta.name as to_account_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN accounts ta ON t.to_account_id = ta.id
        WHERE t.id = ?
        """, (trans_id,))
        row = cursor.fetchone()
        d = dict(row)
        try:
            d["tags"] = json.loads(d["tags"]) if d.get("tags") else []
        except Exception:
            d["tags"] = []
        return d

@router.delete("/{trans_id}")
def delete_transaction(trans_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM transactions WHERE id = ?", (trans_id,))
        t = cursor.fetchone()
        if not t:
            raise HTTPException(status_code=404, detail="流水记录不存在")
            
        # Revert balances
        amount = t["amount"]
        t_type = t["type"]
        acc_id = t["account_id"]
        to_acc_id = t["to_account_id"]
        
        if t_type == "expense":
            cursor.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", (amount, acc_id))
        elif t_type == "income":
            cursor.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", (amount, acc_id))
        elif t_type in ["transfer", "repayment"] and to_acc_id:
            cursor.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", (amount, acc_id))
            cursor.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", (amount, to_acc_id))
            
        cursor.execute("DELETE FROM transactions WHERE id = ?", (trans_id,))
        return {"success": True, "message": "流水已删除并自动还原账户余额"}

# Categories Endpoints
@router.get("/categories/all", response_model=List[CategoryResponse])
def get_categories():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories ORDER BY type, sort_order, name")
        return [dict(r) for r in cursor.fetchall()]

@router.post("/categories/create", response_model=CategoryResponse)
def create_category(cat: CategoryCreate):
    cat_id = f"cat-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO categories (id, name, type, parent_id, icon, color, is_system, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (cat_id, cat.name, cat.type, cat.parent_id, cat.icon or "Folder", cat.color or "#3B82F6", 0, cat.sort_order or 0))
        cursor.execute("SELECT * FROM categories WHERE id = ?", (cat_id,))
        return dict(cursor.fetchone())
