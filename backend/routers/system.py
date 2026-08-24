from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict, Any, List
import json
import uuid
from backend.database import get_db
from backend.services.demo_data import seed_demo_data
from backend.services.snapshot_service import create_asset_snapshot, get_snapshots_history
from backend.services.recurring_service import execute_pending_recurring_rules
from backend.schemas import SnapshotCreate, RecurringRuleCreate, RecurringRuleResponse

router = APIRouter(prefix="/api/system", tags=["System"])

@router.post("/seed-demo")
def seed_demo_endpoint():
    return seed_demo_data()

@router.post("/clear-data")
def clear_data_endpoint():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions;")
        cursor.execute("DELETE FROM investments;")
        cursor.execute("DELETE FROM debts;")
        cursor.execute("DELETE FROM budgets;")
        cursor.execute("DELETE FROM goals;")
        cursor.execute("DELETE FROM recurring_rules;")
        cursor.execute("DELETE FROM asset_snapshots;")
        cursor.execute("DELETE FROM accounts;")
    return {"success": True, "message": "已清空所有财务数据"}

@router.get("/export-backup")
def export_backup():
    tables = ["accounts", "categories", "transactions", "budgets", "investments", "debts", "goals", "recurring_rules", "asset_snapshots"]
    backup_data = {}
    with get_db() as conn:
        cursor = conn.cursor()
        for t in tables:
            cursor.execute(f"SELECT * FROM {t}")
            rows = cursor.fetchall()
            backup_data[t] = [dict(r) for r in rows]
    return backup_data

@router.post("/restore-backup")
async def restore_backup(file: UploadFile = File(...)):
    content_bytes = await file.read()
    try:
        data = json.loads(content_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="备份文件解析失败，请确保为有效的JSON文件")
        
    tables = ["accounts", "categories", "transactions", "budgets", "investments", "debts", "goals", "recurring_rules", "asset_snapshots"]
    with get_db() as conn:
        cursor = conn.cursor()
        # Clear tables
        for t in tables:
            cursor.execute(f"DELETE FROM {t}")
            
        # Insert rows
        for t in tables:
            if t in data and isinstance(data[t], list):
                for row in data[t]:
                    cols = list(row.keys())
                    placeholders = ", ".join(["?"] * len(cols))
                    col_str = ", ".join(cols)
                    cursor.execute(f"INSERT INTO {t} ({col_str}) VALUES ({placeholders})", list(row.values()))
                    
    return {"success": True, "message": "全量数据已成功恢复！"}

# Snapshot Mode (Balance-first tracking)
@router.get("/snapshots")
def get_snapshots():
    return get_snapshots_history()

@router.post("/snapshots")
def create_snapshot(payload: SnapshotCreate):
    return create_asset_snapshot(payload.snapshot_date, payload.accounts_balances, payload.notes or "")

# Recurring rules
@router.get("/recurring", response_model=List[RecurringRuleResponse])
def get_recurring():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recurring_rules ORDER BY is_active DESC, day_of_period")
        return [dict(r) for r in cursor.fetchall()]

@router.post("/recurring", response_model=RecurringRuleResponse)
def add_recurring(rule: RecurringRuleCreate):
    r_id = f"rec-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO recurring_rules (id, name, type, amount, account_id, to_account_id, category_id, frequency, day_of_period, is_active, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            r_id, rule.name, rule.type, rule.amount, rule.account_id, rule.to_account_id,
            rule.category_id, rule.frequency, rule.day_of_period, rule.is_active, rule.note
        ))
        cursor.execute("SELECT * FROM recurring_rules WHERE id = ?", (r_id,))
        return dict(cursor.fetchone())

@router.post("/recurring/execute")
def execute_recurring():
    res = execute_pending_recurring_rules()
    return {"success": True, "executed_count": len(res), "items": res}
