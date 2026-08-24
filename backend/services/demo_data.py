import uuid
import json
from datetime import datetime, timedelta
from backend.database import get_db

def seed_demo_data():
    """
    Populate realistic demo dataset for instant zero-friction experience.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Clear existing tables
        cursor.execute("DELETE FROM transactions;")
        cursor.execute("DELETE FROM investments;")
        cursor.execute("DELETE FROM debts;")
        cursor.execute("DELETE FROM budgets;")
        cursor.execute("DELETE FROM goals;")
        cursor.execute("DELETE FROM recurring_rules;")
        cursor.execute("DELETE FROM asset_snapshots;")
        cursor.execute("DELETE FROM categories;")
        cursor.execute("DELETE FROM accounts;")
        
        # 1. Categories
        categories = [
            ("cat-exp-1", "餐饮美食", "expense", "Utensils", "#EF4444"),
            ("cat-exp-2", "交通出行", "expense", "Car", "#3B82F6"),
            ("cat-exp-3", "日用百货", "expense", "ShoppingBag", "#10B981"),
            ("cat-exp-4", "购物消费", "expense", "Shirt", "#EC4899"),
            ("cat-exp-5", "住房物业", "expense", "Home", "#8B5CF6"),
            ("cat-exp-6", "休闲娱乐", "expense", "Gamepad2", "#F59E0B"),
            ("cat-exp-7", "医疗健康", "expense", "HeartPulse", "#14B8A6"),
            ("cat-exp-8", "数码科技", "expense", "Laptop", "#6366F1"),
            ("cat-exp-9", "社交人情", "expense", "Gift", "#F43F5E"),
            ("cat-exp-10", "金融还款", "expense", "CreditCard", "#64748B"),
            ("cat-inc-1", "工资薪金", "income", "Banknote", "#10B981"),
            ("cat-inc-2", "投资理财", "income", "TrendingUp", "#3B82F6"),
            ("cat-inc-3", "兼职副业", "income", "Briefcase", "#F59E0B"),
            ("cat-inc-4", "人情礼金", "income", "Gift", "#EC4899"),
        ]
        for c in categories:
            cursor.execute("INSERT INTO categories (id, name, type, icon, color, is_system) VALUES (?, ?, ?, ?, ?, 1)", c)
            
        # 2. Accounts
        accounts = [
            ("acc-1", "招商银行储蓄卡", "bank", "CNY", 38500.0, 38500.0, "9527", "招商银行", 0, 1, 20, 0, "Landmark", "#EF4444", "主要日常流动卡"),
            ("acc-2", "工商银行工资卡", "bank", "CNY", 15200.0, 15200.0, "8888", "工商银行", 0, 1, 20, 0, "Landmark", "#DC2626", "每月工资发放卡"),
            ("acc-3", "微信零钱通", "wallet", "CNY", 3650.0, 3650.0, None, "微信支付", 0, 1, 20, 0, "Smartphone", "#10B981", "微信扫码与发红包"),
            ("acc-4", "支付宝余额宝", "wallet", "CNY", 45000.0, 45000.0, None, "支付宝", 0, 1, 20, 0, "CreditCard", "#3B82F6", "日常备用金与消费"),
            ("acc-5", "华泰证券A股", "investment", "CNY", 185000.0, 150000.0, None, "华泰证券", 0, 1, 20, 0, "TrendingUp", "#F59E0B", "股票与ETF基金"),
            ("acc-6", "富途证券(美股)", "investment", "USD", 12000.0, 10000.0, None, "富途证券", 0, 1, 20, 0, "Globe", "#6366F1", "美股标普与科技股"),
            ("acc-7", "加密货币冷钱包", "crypto", "USDT", 4500.0, 4000.0, None, "OKX/Binance", 0, 1, 20, 0, "Coins", "#EAB308", "BTC/ETH/USDT持仓"),
            ("acc-8", "自住房产估值", "fixed", "CNY", 2600000.0, 2600000.0, None, "不动产", 0, 1, 20, 0, "Building", "#8B5CF6", "自住房产现值"),
            ("acc-9", "借给朋友李明", "receivable", "CNY", 10000.0, 10000.0, None, "个人借出", 0, 1, 20, 0, "HandCoins", "#06B6D4", "预计年底归还"),
            ("acc-10", "招商银行信用卡", "credit", "CNY", 4820.0, 4820.0, "3344", "招商银行", 60000.0, 10, 28, 0.05, "CreditCard", "#BE123C", "主刷信用卡，享积分"),
            ("acc-11", "招行房贷抵押贷款", "loan", "CNY", 850000.0, 900000.0, None, "招商银行", 0, 1, 15, 0.0325, "Home", "#475569", "等额本息房贷月供5220")
        ]
        for a in accounts:
            cursor.execute("""
            INSERT INTO accounts (id, name, type, currency, balance, initial_balance, card_last4, bank_name, credit_limit, bill_day, repay_day, interest_rate, icon, color, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, a)

        # 3. Investments
        investments = [
            ("inv-1", "acc-5", "600519", "贵州茅台", "stock_a", 100, 1550.0, 1680.0, "CNY"),
            ("inv-2", "acc-5", "513100", "纳斯达克100ETF", "fund", 15000, 1.35, 1.58, "CNY"),
            ("inv-3", "acc-5", "300750", "宁德时代", "stock_a", 200, 210.0, 245.0, "CNY"),
            ("inv-4", "acc-6", "AAPL", "苹果公司 Apple", "stock_hk_us", 40, 185.0, 225.0, "USD"),
            ("inv-5", "acc-6", "NVDA", "英伟达 NVIDIA", "stock_hk_us", 30, 110.0, 130.0, "USD"),
            ("inv-6", "acc-7", "BTC", "Bitcoin 比特币", "crypto", 0.08, 58000.0, 64500.0, "USD"),
        ]
        for inv in investments:
            cursor.execute("""
            INSERT INTO investments (id, account_id, code, name, type, shares, cost_price, current_price, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, inv)

        # 4. Debts
        debts = [
            ("debt-1", "acc-11", "住房按揭商业贷款", "mortgage", 1200000.0, 850000.0, 0.0325, 5220.0, "2021-06-15", "2041-06-15", 1, 15, "每月15日自动扣款"),
            ("debt-2", "acc-10", "招商银行信用卡账单", "credit_card", 60000.0, 4820.0, 0.18, 4820.0, "2026-08-01", "2026-08-28", 10, 28, "本月账单4820元，免息期至28日")
        ]
        for d in debts:
            cursor.execute("""
            INSERT INTO debts (id, account_id, name, type, total_principal, remaining_principal, interest_rate_annual, monthly_payment, start_date, end_date, bill_day, repay_day, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, d)

        # 5. Budgets
        now = datetime.now()
        cur_m = now.strftime("%Y-%m")
        budgets = [
            ("b-0", cur_m, None, 13000.0, 0.8),
            ("b-1", cur_m, "cat-exp-1", 3200.0, 0.8),
            ("b-2", cur_m, "cat-exp-2", 1200.0, 0.8),
            ("b-3", cur_m, "cat-exp-3", 1500.0, 0.8),
            ("b-4", cur_m, "cat-exp-4", 2500.0, 0.8),
            ("b-5", cur_m, "cat-exp-5", 5500.0, 0.9),
            ("b-6", cur_m, "cat-exp-6", 1000.0, 0.8),
        ]
        for b in budgets:
            cursor.execute("INSERT INTO budgets (id, period, category_id, amount, alert_threshold) VALUES (?, ?, ?, ?, ?)", b)

        # 6. Goals
        goals = [
            ("g-1", "欧洲深度双人游", 35000.0, 22000.0, (now + timedelta(days=120)).strftime("%Y-%m-%d"), "Plane", "#3B82F6", "法意瑞14天自由行度假基金", 0),
            ("g-2", "新能源汽车置换基金", 180000.0, 95000.0, (now + timedelta(days=365)).strftime("%Y-%m-%d"), "Car", "#10B981", "置换升级SUV", 0),
            ("g-3", "6个月家庭应急储备金", 60000.0, 52000.0, (now + timedelta(days=60)).strftime("%Y-%m-%d"), "ShieldCheck", "#8B5CF6", "高流动性防风险备用金", 0)
        ]
        for g in goals:
            cursor.execute("INSERT INTO goals (id, name, target_amount, current_amount, target_date, icon, color, notes, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", g)

        # 7. Recurring Rules
        rules = [
            ("rec-1", "每月固定薪资发放", "income", 18500.0, "acc-2", None, "cat-inc-1", "monthly", 10, None, 1, "税后工资"),
            ("rec-2", "招行房贷月供扣款", "expense", 5220.0, "acc-1", None, "cat-exp-5", "monthly", 15, None, 1, "房贷自动扣除"),
            ("rec-3", "宽带与物业管理费", "expense", 380.0, "acc-4", None, "cat-exp-5", "monthly", 20, None, 1, "千兆光纤与物业"),
            ("rec-4", "iCloud & 影视音乐订阅", "expense", 48.0, "acc-3", None, "cat-exp-8", "monthly", 25, None, 1, "Apple One + Spotify")
        ]
        for r in rules:
            cursor.execute("""
            INSERT INTO recurring_rules (id, name, type, amount, account_id, to_account_id, category_id, frequency, day_of_period, last_executed, is_active, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, r)

        # 8. Transactions (Rich historical flow for past 45 days)
        trans_list = [
            # Incomes
            ("t-1", "income", 18500.0, "acc-2", None, "cat-inc-1", "工资薪金", "主营薪水", (now - timedelta(days=15)).strftime("%Y-%m-%d 10:00"), "某知名科技公司", "8月份薪资收入", '["工资", "本职"]', "sms_parser", "【工商银行】您尾号8888卡于8月10日10:00转入18500.00元来自某科技公司"),
            ("t-2", "income", 3200.0, "acc-4", None, "cat-inc-3", "兼职副业", "设计稿酬", (now - timedelta(days=8)).strftime("%Y-%m-%d 16:20"), "自由职业项目报酬", "UI设计兼职结款", '["副业"]', "manual", None),
            ("t-3", "income", 850.0, "acc-5", None, "cat-inc-2", "投资理财", "股票分红", (now - timedelta(days=22)).strftime("%Y-%m-%d 09:30"), "上市公司现金分红", "A股半年报分红派息", '["分红", "被动收入"]', "manual", None),
            
            # Expenses
            ("t-4", "expense", 5220.0, "acc-1", None, "cat-exp-5", "住房物业", "房贷月供", (now - timedelta(days=10)).strftime("%Y-%m-%d 06:00"), "招商银行房贷中心", "8月份房贷扣款", '["房贷", "固定支出"]', "recurring", None),
            ("t-5", "expense", 368.0, "acc-1", None, "cat-exp-1", "餐饮美食", "周末聚餐", (now - timedelta(days=2)).strftime("%Y-%m-%d 19:30"), "海底捞火锅(万达店)", "家庭聚餐", '["餐饮", "周末"]', "sms_parser", "【招商银行】您账户9527于08月23日19:30在海底捞消费支出人民币368.00元"),
            ("t-6", "expense", 58.0, "acc-3", None, "cat-exp-1", "餐饮美食", "咖啡下午茶", (now - timedelta(days=1)).strftime("%Y-%m-%d 14:15"), "瑞幸咖啡", "生椰拿铁两杯", '["咖啡"]', "wechat_import", "微信支付凭证 商户消费 ¥58.00 瑞幸咖啡"),
            ("t-7", "expense", 45.0, "acc-4", None, "cat-exp-2", "交通出行", "网约车", (now - timedelta(days=1)).strftime("%Y-%m-%d 21:00"), "滴滴出行", "加班打车回家", '["交通", "打车"]', "alipay_import", "支付宝：您在【滴滴出行】成功付款45.00元"),
            ("t-8", "expense", 480.0, "acc-10", None, "cat-exp-3", "日用百货", "山姆会员店", (now - timedelta(days=3)).strftime("%Y-%m-%d 15:20"), "山姆会员商店", "采购牛肉、牛奶、纸巾等", '["超市", "日用"]', "sms_parser", "【招商银行】您账户3344于08月22日15:20在山姆会员商店刷卡消费支出人民币480.00元"),
            ("t-9", "expense", 298.0, "acc-4", None, "cat-exp-6", "休闲娱乐", "Steam游戏", (now - timedelta(days=5)).strftime("%Y-%m-%d 22:45"), "Steam Games", "黑神话悟空", '["游戏", "娱乐"]', "alipay_import", "支付宝：Steam付款298.00元"),
            ("t-10", "expense", 128.0, "acc-3", None, "cat-exp-7", "医疗健康", "常备药品", (now - timedelta(days=7)).strftime("%Y-%m-%d 11:30"), "海王星辰健康药房", "家庭急救箱常备感冒退烧药", '["医疗", "药品"]', "wechat_import", "微信支付凭证 药店消费 ¥128.00"),
            ("t-11", "expense", 680.0, "acc-10", None, "cat-exp-4", "购物消费", "换季服饰", (now - timedelta(days=11)).strftime("%Y-%m-%d 16:00"), "优衣库官方旗舰店", "夏秋换季衬衫与长裤", '["服饰", "网购"]', "alipay_import", "支付宝在天猫优衣库付款680.00元"),
            ("t-12", "expense", 380.0, "acc-4", None, "cat-exp-5", "住房物业", "燃气与水费", (now - timedelta(days=14)).strftime("%Y-%m-%d 09:00"), "国家电网与燃气集团", "夏季空调电费与燃气", '["水电燃气"]', "recurring", None),
            ("t-13", "expense", 88.0, "acc-1", None, "cat-exp-1", "餐饮美食", "工作日午餐", (now - timedelta(days=16)).strftime("%Y-%m-%d 12:30"), "老乡鸡快餐", "午市商务套餐", '["外卖", "工作餐"]', "sms_parser", "【招商银行】您账户9527于08月09日12:30消费支出人民币88.00元"),
            ("t-14", "expense", 1200.0, "acc-1", None, "cat-exp-9", "社交人情", "朋友结婚礼金", (now - timedelta(days=18)).strftime("%Y-%m-%d 18:00"), "好友张伟婚礼", "随份子红包", '["人情", "红包"]', "manual", None),
            ("t-15", "expense", 68.0, "acc-3", None, "cat-exp-8", "数码科技", "ChatGPT订阅", (now - timedelta(days=20)).strftime("%Y-%m-%d 08:00"), "OpenAI", "Plus会员月费", '["AI", "工具"]', "manual", None),
            ("t-16", "expense", 320.0, "acc-1", None, "cat-exp-2", "交通出行", "自驾汽车加油", (now - timedelta(days=23)).strftime("%Y-%m-%d 17:50"), "中国石化加油站", "95号汽油加满", '["汽车", "加油"]', "sms_parser", "【招商银行】您账户9527于08月02日17:50在加油站消费支出320.00元"),
            
            # Transfers
            ("t-17", "transfer", 5000.0, "acc-2", "acc-4", None, "账户转账", "备用金划转", (now - timedelta(days=14)).strftime("%Y-%m-%d 10:30"), "工行转支付宝", "工资卡提现到余额宝理财", '["转账", "理财"]', "manual", None),
            ("t-18", "transfer", 3000.0, "acc-1", "acc-10", "cat-exp-10", "金融还款", "信用卡还款", (now - timedelta(days=6)).strftime("%Y-%m-%d 15:00"), "招行储蓄卡还信用卡", "归还上月信用卡账单", '["还款", "信用卡"]', "manual", None)
        ]
        
        for t in trans_list:
            cursor.execute("""
            INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, category_name, subcategory_name, date, merchant, note, tags, source, raw_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, t)

        # 9. Asset Snapshots
        prev_snap_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        cur_snap_date = now.strftime("%Y-%m-%d")
        
        cursor.execute("""
        INSERT INTO asset_snapshots (id, snapshot_date, total_assets, total_liabilities, net_worth, accounts_data, notes)
        VALUES 
        ('snap-1', ?, 2850000.0, 865000.0, 1985000.0, '[]', '上月资产盘点快照'),
        ('snap-2', ?, 2953850.0, 854820.0, 2099030.0, '[]', '本月资产盘点快照')
        """, (prev_snap_date, cur_snap_date))
        
    return {"success": True, "message": "全量高拟真演示数据已成功载入！"}
