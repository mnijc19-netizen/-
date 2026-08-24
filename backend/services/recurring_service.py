import uuid
from datetime import datetime, date
from typing import List, Dict, Any
from backend.database import get_db

def execute_pending_recurring_rules() -> List[Dict[str, Any]]:
    """
    Check and execute recurring transactions (e.g. monthly rent, salary, subscriptions).
    """
    today_str = date.today().strftime("%Y-%m-%d")
    today_day = date.today().day
    current_month_str = date.today().strftime("%Y-%m")
    
    executed_list = []
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recurring_rules WHERE is_active = 1")
        rules = [dict(r) for r in cursor.fetchall()]
        
        for rule in rules:
            frequency = rule.get("frequency", "monthly")
            day_of_period = rule.get("day_of_period", 1)
            last_executed = rule.get("last_executed") or ""
            
            should_run = False
            if frequency == "monthly":
                # If today is >= day_of_period and hasn't run this month
                if today_day >= day_of_period and not last_executed.startswith(current_month_str):
                    should_run = True
            elif frequency == "daily":
                if last_executed != today_str:
                    should_run = True
                    
            if should_run:
                # Create automatic transaction
                trans_id = str(uuid.uuid4())
                rule_type = rule["type"]
                amount = rule["amount"]
                acc_id = rule["account_id"]
                to_acc_id = rule.get("to_account_id")
                cat_id = rule.get("category_id")
                
                # Fetch category name
                cat_name = "日常其他"
                if cat_id:
                    cursor.execute("SELECT name FROM categories WHERE id = ?", (cat_id,))
                    crow = cursor.fetchone()
                    if crow:
                        cat_name = crow["name"]
                
                # Insert transaction
                cursor.execute("""
                INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, category_name, date, merchant, note, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    trans_id,
                    rule_type,
                    amount,
                    acc_id,
                    to_acc_id,
                    cat_id,
                    cat_name,
                    today_str,
                    rule["name"],
                    f"周期性自动记账: {rule['name']}",
                    "recurring"
                ))
                
                # Update account balance
                if rule_type == "expense":
                    cursor.execute("UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (amount, acc_id))
                elif rule_type == "income":
                    cursor.execute("UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (amount, acc_id))
                elif rule_type in ["transfer", "repayment"] and to_acc_id:
                    cursor.execute("UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (amount, acc_id))
                    cursor.execute("UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (amount, to_acc_id))

                # Update rule last_executed
                cursor.execute("UPDATE recurring_rules SET last_executed = ? WHERE id = ?", (today_str, rule["id"]))
                
                executed_list.append({
                    "rule_id": rule["id"],
                    "rule_name": rule["name"],
                    "amount": amount,
                    "type": rule_type
                })
                
    return executed_list
