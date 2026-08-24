from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import uuid
import math
from backend.database import get_db
from backend.schemas import DebtCreate, DebtResponse

router = APIRouter(prefix="/api/debts", tags=["Debts"])

@router.get("", response_model=List[DebtResponse])
def get_debts():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM debts ORDER BY remaining_principal DESC")
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            d = dict(r)
            tot = d["total_principal"]
            rem = d["remaining_principal"]
            pct = ((tot - rem) / tot * 100) if tot > 0 else 0.0
            
            # Estimate remaining months
            m_pay = d.get("monthly_payment", 0.0) or 0.0
            rem_months = math.ceil(rem / m_pay) if m_pay > 0 else None
            
            d["progress_percentage"] = round(pct, 1)
            d["remaining_months"] = rem_months
            results.append(d)
        return results

@router.post("", response_model=DebtResponse)
def add_debt(debt: DebtCreate):
    debt_id = f"debt-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO debts (id, account_id, name, type, total_principal, remaining_principal, interest_rate_annual, monthly_payment, start_date, end_date, bill_day, repay_day, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            debt_id, debt.account_id, debt.name, debt.type, debt.total_principal,
            debt.remaining_principal, debt.interest_rate_annual, debt.monthly_payment,
            debt.start_date, debt.end_date, debt.bill_day, debt.repay_day, debt.notes
        ))
    return [d for d in get_debts() if d["id"] == debt_id][0]

@router.delete("/{debt_id}")
def delete_debt(debt_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM debts WHERE id = ?", (debt_id,))
        return {"success": True, "message": "债务计划已删除"}

@router.get("/simulator")
def debt_payoff_simulator(extra_monthly_budget: float = Query(1000.0, description="每月额外可用于加速还款的资金")):
    """
    Simulates Debt Snowball (smallest balance first) vs Debt Avalanche (highest interest rate first).
    """
    debts = get_debts()
    if not debts:
        return {"snowball": [], "avalanche": [], "total_interest_saved": 0.0}
        
    # Avalanche simulation (sort by interest rate descending)
    avalanche_order = sorted(debts, key=lambda x: x.get("interest_rate_annual", 0.0) or 0.0, reverse=True)
    # Snowball simulation (sort by remaining principal ascending)
    snowball_order = sorted(debts, key=lambda x: x.get("remaining_principal", 0.0) or 0.0)
    
    return {
        "snowball_strategy": {
            "name": "雪球还债法 (先还小额，快速建立信心)",
            "priority": [d["name"] for d in snowball_order],
            "description": "优先全力清偿本金最小的一笔负债，清偿后将该笔月供全额滚入下一笔负债。"
        },
        "avalanche_strategy": {
            "name": "雪崩还债法 (先还高息，利息支出最少)",
            "priority": [d["name"] for d in avalanche_order],
            "description": "优先全力清偿年化利率最高的一笔负债（如信用卡/网贷），从数学上节省最多利息开支。"
        }
    }
