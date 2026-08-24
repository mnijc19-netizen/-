from fastapi import APIRouter, HTTPException
from typing import List, Optional
import uuid
from datetime import datetime
from backend.database import get_db
from backend.schemas import BudgetCreate, BudgetResponse

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])

@router.get("", response_model=List[BudgetResponse])
def get_budgets(period: Optional[str] = None):
    cur_period = period or datetime.now().strftime("%Y-%m")
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT b.*, c.name as category_name
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.period = ?
        """, (cur_period,))
        budget_rows = [dict(r) for r in cursor.fetchall()]
        
        results = []
        for b in budget_rows:
            cat_id = b["category_id"]
            if cat_id:
                # Sum expenses for this category in this month
                cursor.execute("""
                SELECT SUM(amount) as spent
                FROM transactions
                WHERE type = 'expense' AND date LIKE ? AND category_id = ? AND status = 'confirmed'
                """, (f"{cur_period}%", cat_id))
            else:
                # Total overall expense
                cursor.execute("""
                SELECT SUM(amount) as spent
                FROM transactions
                WHERE type = 'expense' AND date LIKE ? AND status = 'confirmed'
                """, (f"{cur_period}%",))
                
            spent_row = cursor.fetchone()
            spent = spent_row["spent"] or 0.0
            budget_amount = b["amount"]
            remaining = budget_amount - spent
            pct = (spent / budget_amount * 100) if budget_amount > 0 else 0.0
            
            status = "normal"
            if pct >= 100:
                status = "danger"
            elif pct >= (b.get("alert_threshold", 0.8) * 100):
                status = "warning"
                
            results.append({
                "id": b["id"],
                "period": b["period"],
                "category_id": b["category_id"],
                "category_name": b.get("category_name") or "全部分类总预算",
                "amount": budget_amount,
                "alert_threshold": b.get("alert_threshold", 0.8),
                "spent_amount": round(spent, 2),
                "remaining_amount": round(remaining, 2),
                "spent_percentage": round(pct, 1),
                "status": status
            })
            
        return results

@router.post("", response_model=BudgetResponse)
def set_budget(b: BudgetCreate):
    b_id = f"b-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if already exists for period and category
        if b.category_id:
            cursor.execute("SELECT id FROM budgets WHERE period = ? AND category_id = ?", (b.period, b.category_id))
        else:
            cursor.execute("SELECT id FROM budgets WHERE period = ? AND category_id IS NULL", (b.period,))
            
        existing = cursor.fetchone()
        if existing:
            cursor.execute("UPDATE budgets SET amount = ?, alert_threshold = ? WHERE id = ?", (b.amount, b.alert_threshold, existing["id"]))
            b_id = existing["id"]
        else:
            cursor.execute("""
            INSERT INTO budgets (id, period, category_id, amount, alert_threshold)
            VALUES (?, ?, ?, ?, ?)
            """, (b_id, b.period, b.category_id, b.amount, b.alert_threshold))
            
        # Re-fetch
        return get_budgets(b.period)[0]
