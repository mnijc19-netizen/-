from datetime import datetime, timedelta
from typing import Dict, Any, List
from backend.database import get_db

# Exchange rates to CNY baseline
EXCHANGE_RATES = {
    "CNY": 1.0,
    "USD": 7.25,
    "HKD": 0.93,
    "EUR": 7.85,
    "JPY": 0.048,
    "GBP": 9.20,
    "USDT": 7.25
}

def get_dashboard_analytics() -> Dict[str, Any]:
    now = datetime.now()
    current_month_prefix = now.strftime("%Y-%m")
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Accounts & Total Assets Calculation
        cursor.execute("SELECT * FROM accounts WHERE is_active = 1")
        accounts = [dict(r) for r in cursor.fetchall()]
        
        total_liquid_assets = 0.0
        total_investment_assets = 0.0
        total_fixed_assets = 0.0
        total_receivables = 0.0
        total_liabilities = 0.0
        
        for acc in accounts:
            rate = EXCHANGE_RATES.get(acc.get("currency", "CNY"), 1.0)
            cny_balance = (acc.get("balance") or 0.0) * rate
            acc_type = acc.get("type")
            
            if acc_type in ["cash", "bank", "wallet"]:
                total_liquid_assets += cny_balance
            elif acc_type in ["investment", "crypto"]:
                total_investment_assets += cny_balance
            elif acc_type in ["fixed"]:
                total_fixed_assets += cny_balance
            elif acc_type in ["receivable"]:
                total_receivables += cny_balance
            elif acc_type in ["credit", "loan"]:
                # Liabilities are positive or negative representation
                total_liabilities += abs(cny_balance)
                
        # Also include investments market value
        cursor.execute("SELECT * FROM investments")
        inv_rows = [dict(r) for r in cursor.fetchall()]
        for inv in inv_rows:
            inv_rate = EXCHANGE_RATES.get(inv.get("currency", "CNY"), 1.0)
            inv_market_val = (inv["shares"] * inv["current_price"]) * inv_rate
            # Investment account balance might already reflect this, or add here if separate
            
        total_assets = total_liquid_assets + total_investment_assets + total_fixed_assets + total_receivables
        net_worth = total_assets - total_liabilities
        debt_ratio = (total_liabilities / total_assets * 100) if total_assets > 0 else 0.0
        
        # 2. Current Month Income and Expense
        cursor.execute("""
        SELECT 
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as month_expense,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as month_income
        FROM transactions 
        WHERE date LIKE ? AND status = 'confirmed'
        """, (f"{current_month_prefix}%",))
        month_row = cursor.fetchone()
        month_expense = month_row["month_expense"] or 0.0
        month_income = month_row["month_income"] or 0.0
        month_savings = month_income - month_expense
        savings_rate = ((month_savings / month_income) * 100) if month_income > 0 else 0.0
        
        # 3. Last 6 Months Historical Trend
        monthly_trends = []
        for i in range(5, -1, -1):
            # Calculate target year-month
            target_dt = now - timedelta(days=i * 30)
            m_prefix = target_dt.strftime("%Y-%m")
            
            cursor.execute("""
            SELECT 
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as exp,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as inc
            FROM transactions 
            WHERE date LIKE ? AND status = 'confirmed'
            """, (f"{m_prefix}%",))
            t_row = cursor.fetchone()
            t_exp = t_row["exp"] or 0.0
            t_inc = t_row["inc"] or 0.0
            
            monthly_trends.append({
                "month": m_prefix,
                "income": round(t_inc, 2),
                "expense": round(t_exp, 2),
                "savings": round(t_inc - t_exp, 2)
            })
            
        # 4. Current Month Category Expense Breakdown
        cursor.execute("""
        SELECT 
            COALESCE(category_name, '其他支出') as category,
            SUM(amount) as total_amount
        FROM transactions
        WHERE type = 'expense' AND date LIKE ? AND status = 'confirmed'
        GROUP BY category
        ORDER BY total_amount DESC
        """, (f"{current_month_prefix}%",))
        category_rows = [dict(r) for r in cursor.fetchall()]
        
        category_breakdown = []
        for r in category_rows:
            pct = (r["total_amount"] / month_expense * 100) if month_expense > 0 else 0.0
            category_breakdown.append({
                "name": r["category"],
                "value": round(r["total_amount"], 2),
                "percentage": round(pct, 1)
            })

        # 5. Financial Health Index (0-100 Score)
        # Factors: Emergency fund adequacy (30 pts), Savings rate (30 pts), Debt ratio (25 pts), Asset Diversification (15 pts)
        avg_monthly_exp = max(month_expense, 3000.0)
        emergency_months = total_liquid_assets / avg_monthly_exp
        
        # Emergency score (30)
        emergency_score = min(30.0, (emergency_months / 6.0) * 30.0)
        
        # Savings score (30)
        savings_score = min(30.0, max(0.0, (savings_rate / 35.0) * 30.0))
        
        # Debt ratio score (25) - lower debt ratio gets higher score
        if debt_ratio < 20:
            debt_score = 25.0
        elif debt_ratio < 40:
            debt_score = 20.0
        elif debt_ratio < 60:
            debt_score = 12.0
        else:
            debt_score = 5.0
            
        # Diversification score (15)
        diversified_types = sum(1 for v in [total_liquid_assets, total_investment_assets, total_fixed_assets] if v > 0)
        div_score = min(15.0, diversified_types * 5.0)
        
        total_health_score = int(round(emergency_score + savings_score + debt_score + div_score))
        
        health_advice = []
        if emergency_months < 3:
            health_advice.append("流动备用金不足3个月日常开支，建议增加活期或货币基金储备以抗风险。")
        else:
            health_advice.append(f"流动备用金充足（可覆盖约 {round(emergency_months, 1)} 个月日常开支），抗风险能力良好。")
            
        if savings_rate < 20:
            health_advice.append("本月储蓄率偏低，建议检查非必要消费或设定餐饮/娱乐预算限额。")
        else:
            health_advice.append(f"储蓄率达到 {round(savings_rate, 1)}%，保持了健康的财富积累节奏！")
            
        if debt_ratio > 40:
            health_advice.append(f"当前资产负债率为 {round(debt_ratio, 1)}%，偏高，建议利用雪球法逐步降低高息负债。")
            
        return {
            "total_assets": round(total_assets, 2),
            "total_liabilities": round(total_liabilities, 2),
            "net_worth": round(net_worth, 2),
            "debt_ratio": round(debt_ratio, 1),
            "asset_breakdown": {
                "liquid": round(total_liquid_assets, 2),
                "investment": round(total_investment_assets, 2),
                "fixed": round(total_fixed_assets, 2),
                "receivable": round(total_receivables, 2),
                "liabilities": round(total_liabilities, 2)
            },
            "month_summary": {
                "income": round(month_income, 2),
                "expense": round(month_expense, 2),
                "savings": round(month_savings, 2),
                "savings_rate": round(savings_rate, 1)
            },
            "monthly_trends": monthly_trends,
            "category_breakdown": category_breakdown,
            "health_evaluation": {
                "score": total_health_score,
                "emergency_months": round(emergency_months, 1),
                "savings_rate": round(savings_rate, 1),
                "debt_ratio": round(debt_ratio, 1),
                "advice": health_advice
            }
        }

def get_sankey_flow_data(month_str: str) -> Dict[str, Any]:
    """
    Generate Cash Flow Topology Sankey nodes & links:
    Income -> Accounts -> Expenses / Savings
    """
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Incomes by Category/Merchant -> Accounts
        cursor.execute("""
        SELECT 
            COALESCE(category_name, '主营收入') as source_name,
            a.name as account_name,
            SUM(t.amount) as amount
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE t.type = 'income' AND t.date LIKE ? AND t.status = 'confirmed'
        GROUP BY source_name, account_name
        """, (f"{month_str}%",))
        income_flows = [dict(r) for r in cursor.fetchall()]
        
        # 2. Accounts -> Expenses by Category
        cursor.execute("""
        SELECT 
            a.name as account_name,
            COALESCE(t.category_name, '日常支出') as target_category,
            SUM(t.amount) as amount
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE t.type = 'expense' AND t.date LIKE ? AND t.status = 'confirmed'
        GROUP BY account_name, target_category
        """, (f"{month_str}%",))
        expense_flows = [dict(r) for r in cursor.fetchall()]
        
        nodes_set = set()
        links = []
        
        for flow in income_flows:
            src = f"【收入】{flow['source_name']}"
            acc = f"【账户】{flow['account_name']}"
            nodes_set.add(src)
            nodes_set.add(acc)
            links.append({
                "source": src,
                "target": acc,
                "value": round(flow["amount"], 2)
            })
            
        for flow in expense_flows:
            acc = f"【账户】{flow['account_name']}"
            tgt = f"【支出】{flow['target_category']}"
            nodes_set.add(acc)
            nodes_set.add(tgt)
            links.append({
                "source": acc,
                "target": tgt,
                "value": round(flow["amount"], 2)
            })
            
        nodes = [{"name": name} for name in nodes_set]
        return {
            "nodes": nodes,
            "links": links
        }
