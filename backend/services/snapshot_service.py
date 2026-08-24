import uuid
import json
from datetime import datetime
from typing import Dict, Any, List
from backend.database import get_db

def create_asset_snapshot(snapshot_date: str, accounts_balances: Dict[str, float], notes: str = "") -> Dict[str, Any]:
    """
    Take an asset snapshot and update accounts balances directly, computing net worth delta.
    """
    snapshot_id = str(uuid.uuid4())
    total_assets = 0.0
    total_liabilities = 0.0
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Fetch current account metadata
        cursor.execute("SELECT id, name, type, currency, balance FROM accounts WHERE is_active = 1")
        existing_accounts = {row["id"]: dict(row) for row in cursor.fetchall()}
        
        snapshot_records = []
        
        for acc_id, new_bal in accounts_balances.items():
            if acc_id in existing_accounts:
                acc = existing_accounts[acc_id]
                old_bal = acc["balance"]
                acc_type = acc["type"]
                
                # Update account balance in DB
                cursor.execute("UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_bal, acc_id))
                
                # Calculate asset/liability
                if acc_type in ['credit', 'loan']:
                    # For credit/loan, balance is liability (positive or negative convention)
                    liability_amt = abs(new_bal) if new_bal < 0 else new_bal
                    total_liabilities += liability_amt
                else:
                    total_assets += new_bal
                    
                snapshot_records.append({
                    "account_id": acc_id,
                    "account_name": acc["name"],
                    "account_type": acc_type,
                    "old_balance": old_bal,
                    "new_balance": new_bal,
                    "diff": new_bal - old_bal
                })
        
        net_worth = total_assets - total_liabilities
        
        # Save snapshot
        cursor.execute("""
        INSERT INTO asset_snapshots (id, snapshot_date, total_assets, total_liabilities, net_worth, accounts_data, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            snapshot_id,
            snapshot_date or datetime.now().strftime("%Y-%m-%d"),
            total_assets,
            total_liabilities,
            net_worth,
            json.dumps(snapshot_records, ensure_ascii=False),
            notes
        ))
        
    return {
        "id": snapshot_id,
        "snapshot_date": snapshot_date,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": net_worth,
        "records": snapshot_records
    }

def get_snapshots_history() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM asset_snapshots ORDER BY snapshot_date DESC LIMIT 30")
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            d = dict(r)
            try:
                d["accounts_data"] = json.loads(d["accounts_data"])
            except Exception:
                d["accounts_data"] = []
            results.append(d)
        return results
