from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from backend.database import get_db
from backend.schemas import InvestmentCreate, InvestmentResponse

router = APIRouter(prefix="/api/investments", tags=["Investments"])

@router.get("", response_model=List[InvestmentResponse])
def get_investments():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT i.*, a.name as account_name
        FROM investments i
        LEFT JOIN accounts a ON i.account_id = a.id
        ORDER BY i.type, i.name
        """)
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            d = dict(r)
            shares = d["shares"]
            cost = d["cost_price"]
            curr = d["current_price"]
            
            total_cost = shares * cost
            market_val = shares * curr
            pnl = market_val - total_cost
            pnl_rate = ((pnl / total_cost) * 100) if total_cost > 0 else 0.0
            
            d["total_cost"] = round(total_cost, 2)
            d["market_value"] = round(market_val, 2)
            d["floating_pnl"] = round(pnl, 2)
            d["pnl_rate"] = round(pnl_rate, 2)
            results.append(d)
        return results

@router.post("", response_model=InvestmentResponse)
def add_investment(inv: InvestmentCreate):
    inv_id = f"inv-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO investments (id, account_id, code, name, type, shares, cost_price, current_price, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            inv_id, inv.account_id, inv.code, inv.name, inv.type,
            inv.shares, inv.cost_price, inv.current_price, inv.currency
        ))
        
    return [i for i in get_investments() if i["id"] == inv_id][0]

@router.put("/{inv_id}")
def update_investment(inv_id: str, inv: InvestmentCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE investments
        SET code = ?, name = ?, type = ?, shares = ?, cost_price = ?, current_price = ?, currency = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """, (inv.code, inv.name, inv.type, inv.shares, inv.cost_price, inv.current_price, inv.currency, inv_id))
        return {"success": True, "message": "持仓信息已更新"}

@router.delete("/{inv_id}")
def delete_investment(inv_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM investments WHERE id = ?", (inv_id,))
        return {"success": True, "message": "持仓已删除"}
