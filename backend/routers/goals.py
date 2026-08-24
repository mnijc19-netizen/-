from fastapi import APIRouter, HTTPException
from typing import List
import uuid
import math
from datetime import datetime
from backend.database import get_db
from backend.schemas import GoalCreate, GoalResponse

router = APIRouter(prefix="/api/goals", tags=["Goals"])

@router.get("", response_model=List[GoalResponse])
def get_goals():
    now = datetime.now()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM goals ORDER BY is_completed, target_date")
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            d = dict(r)
            target = d["target_amount"]
            cur = d["current_amount"] or 0.0
            pct = (cur / target * 100) if target > 0 else 0.0
            
            days_left = None
            monthly_save = None
            if d.get("target_date"):
                try:
                    t_dt = datetime.strptime(d["target_date"], "%Y-%m-%d")
                    diff_days = (t_dt - now).days
                    days_left = max(0, diff_days)
                    
                    months_left = max(1, math.ceil(diff_days / 30))
                    remain_to_save = max(0.0, target - cur)
                    monthly_save = round(remain_to_save / months_left, 2)
                except Exception:
                    pass
                    
            d["progress_percentage"] = round(min(100.0, pct), 1)
            d["days_left"] = days_left
            d["monthly_suggested_save"] = monthly_save
            results.append(d)
        return results

@router.post("", response_model=GoalResponse)
def add_goal(goal: GoalCreate):
    goal_id = f"g-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO goals (id, name, target_amount, current_amount, target_date, icon, color, notes, is_completed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            goal_id, goal.name, goal.target_amount, goal.current_amount or 0.0,
            goal.target_date, goal.icon or "Target", goal.color or "#3B82F6",
            goal.notes, goal.is_completed or 0
        ))
    return [g for g in get_goals() if g["id"] == goal_id][0]

@router.put("/{goal_id}/deposit")
def deposit_to_goal(goal_id: str, amount: float):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE goals SET current_amount = current_amount + ? WHERE id = ?", (amount, goal_id))
        # Check if completed
        cursor.execute("SELECT target_amount, current_amount FROM goals WHERE id = ?", (goal_id,))
        row = cursor.fetchone()
        if row and row["current_amount"] >= row["target_amount"]:
            cursor.execute("UPDATE goals SET is_completed = 1 WHERE id = ?", (goal_id,))
        return {"success": True, "message": "已成功存入目标愿望金"}

@router.delete("/{goal_id}")
def delete_goal(goal_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
        return {"success": True, "message": "目标已删除"}
