import re
from datetime import datetime
from typing import Dict, Any, List, Optional
import json

# Category keyword lookup dictionary
CATEGORY_KEYWORDS = {
    "餐饮美食": ["美团", "饿了么", "外卖", "饭", "咖啡", "麦当劳", "肯德基", "星巴克", "瑞幸", "火锅", "奶茶", "海底捞", "喜茶", "烤肉", "面馆", "早点", "午餐", "晚餐", "餐厅", "小吃", "烘焙", "面包", "茶百道", "霸王茶姬"],
    "交通出行": ["滴滴", "打车", "地铁", "公交", "高铁", "加油", "停车", "12306", "交通", "机票", "航空", "车费", "高速", "ETC", "顺风车", "神州", "T3出行", "曹操", "充电桩", "汽油"],
    "日用百货": ["超市", "便利店", "日用", "百货", "纸巾", "洗护", "永辉", "大润发", "屈臣氏", "盒马", "山姆", "全家", "7-Eleven", "罗森", "名创优品", "农贸市场", "菜市场"],
    "购物消费": ["淘宝", "京东", "天猫", "拼多多", "唯品会", "网购", "商城", "服装", "鞋", "数码", "手机", "电脑", "专柜", "优衣库", "Apple", "小米", "得物"],
    "住房物业": ["房租", "水电", "燃气", "物业", "宽带", "电费", "水费", "自来水", "国家电网", "租金", "暖气", "家政", "保洁"],
    "休闲娱乐": ["电影", "游戏", "Steam", "腾讯视频", "爱奇艺", "Bilibili", "网易云", "Spotify", "旅游", "门票", "剧本杀", "密室", "KTV", "酒吧", "影城", "Switch", "PlayStation", "演唱会"],
    "医疗健康": ["医院", "药店", "门诊", "挂号", "体检", "药房", "诊所", "同仁堂", "医保", "牙科", "眼科", "药品"],
    "数码科技": ["App Store", "Google", "云服务", "阿里云", "腾讯云", "软件", "订阅", "OpenAI", "ChatGPT", "iCloud"],
    "金融还款": ["信用卡还款", "还款", "房贷", "车贷", "微粒贷", "借呗", "花呗还款", "白条还款", "分期"],
    "工资收入": ["工资", "薪水", "薪资", "奖金", "代发工资", "劳务报酬", "年终奖", "分红", "津贴"],
    "理财投资": ["基金", "理财", "股票", "分红", "利息", "证券", "余额宝收益", "理财通", "结息"]
}

# Regex Bank & Notification Templates
BUILTIN_RULES = [
    # 1. 招商银行: 【招商银行】您账户9527于08月25日14:30在美团消费支出人民币58.00元，余额12345.67元
    {
        "bank": "招商银行",
        "name": "招行消费支出",
        "pattern": r"【招商银行】.*?账户(?P<card>\d{4}).*?于(?P<time>[\d月日: \-]+)在(?P<merchant>[^消费支出]+?)消费支出(?:人民币)?(?P<amount>[\d,]+\.?\d*)元.*?(?:余额(?P<balance>[\d,]+\.?\d*))?",
        "type": "expense"
    },
    {
        "bank": "招商银行",
        "name": "招行入账/收入",
        "pattern": r"【招商银行】.*?账户(?P<card>\d{4}).*?于(?P<time>[\d月日: \-]+)收款(?:人民币)?(?P<amount>[\d,]+\.?\d*)元.*?(?:来自(?P<merchant>[^，,]+))?.*?(?:余额(?P<balance>[\d,]+\.?\d*))?",
        "type": "income"
    },
    {
        "bank": "招商银行",
        "name": "招行快捷支付",
        "pattern": r"【招商银行】.*?账户(?P<card>\d{4}).*?于(?P<time>[\d月日: \-]+).*?(?:在(?P<merchant>[^支付]+?))?.*?支付(?:人民币)?(?P<amount>[\d,]+\.?\d*)元.*?(?:余额(?P<balance>[\d,]+\.?\d*))?",
        "type": "expense"
    },
    
    # 2. 工商银行: 【工商银行】您尾号8888卡于8月25日12:00消费支出500.00元[工银信使]
    {
        "bank": "工商银行",
        "name": "工行消费支出",
        "pattern": r"【工商银行】.*?尾号(?P<card>\d{4})卡于(?P<time>[\d月日: \-]+)(?:在(?P<merchant>[^，,支出消费]+))?(?:消费)?支出(?P<amount>[\d,]+\.?\d*)元.*?(?:当前余额|余额)(?P<balance>[\d,]+\.?\d*)?",
        "type": "expense"
    },
    {
        "bank": "工商银行",
        "name": "工行收入",
        "pattern": r"【工商银行】.*?尾号(?P<card>\d{4})卡于(?P<time>[\d月日: \-]+)(?:收入|转入)(?P<amount>[\d,]+\.?\d*)元.*?(?:来自(?P<merchant>[^，,]+))?.*?(?:当前余额|余额)(?P<balance>[\d,]+\.?\d*)?",
        "type": "income"
    },

    # 3. 建设银行: 【建设银行】您尾号1234的储蓄卡账户8月25日10:30向张三转账支出1000.00元，活期余额5432.10元
    {
        "bank": "建设银行",
        "name": "建行支出/转账",
        "pattern": r"【建设银行】.*?尾号(?P<card>\d{4}).*?(?P<time>[\d月日: \-]+)(?:向(?P<merchant>[^，,支出转账]+))?(?:消费|支出|扣款|转账支出)(?P<amount>[\d,]+\.?\d*)元.*?(?:活期余额|余额)(?P<balance>[\d,]+\.?\d*)?",
        "type": "expense"
    },
    {
        "bank": "建设银行",
        "name": "建行收入",
        "pattern": r"【建设银行】.*?尾号(?P<card>\d{4}).*?(?P<time>[\d月日: \-]+)(?:存入|收入|转账存入)(?P<amount>[\d,]+\.?\d*)元.*?(?:来自(?P<merchant>[^，,]+))?.*?(?:活期余额|余额)(?P<balance>[\d,]+\.?\d*)?",
        "type": "income"
    },

    # 4. 农业银行: 【农业银行】您尾号5678账户于08月25日09:15完成一笔财付通快捷支付，金额28.50元，余额8888.00元
    {
        "bank": "农业银行",
        "name": "农行支付消费",
        "pattern": r"【农业银行】.*?尾号(?P<card>\d{4})账户于(?P<time>[\d月日: \-]+)完成一笔(?P<merchant>[^，,]+)?.*?，金额(?P<amount>[\d,]+\.?\d*)元.*?(?:余额(?P<balance>[\d,]+\.?\d*))?",
        "type": "expense"
    },

    # 5. 中国银行: 【中国银行】您的借记卡账户5566于8月25日消费支出人民币128.00元
    {
        "bank": "中国银行",
        "name": "中行借记卡支出",
        "pattern": r"【中国银行】.*?账户(?P<card>\d{4})于(?P<time>[\d月日: \-]+)(?:在(?P<merchant>[^消费支出]+))?(?:消费|支出|支取)人民币(?P<amount>[\d,]+\.?\d*)元.*?(?:余额(?P<balance>[\d,]+\.?\d*))?",
        "type": "expense"
    },

    # 6. 交通银行: 【交通银行】您尾号7788的卡于08月25日18:20刷卡消费人民币128.00元
    {
        "bank": "交通银行",
        "name": "交行消费",
        "pattern": r"【交通银行】.*?尾号(?P<card>\d{4}).*于(?P<time>[\d月日: \-]+)(?:在(?P<merchant>[^消费]+))?(?:刷卡|快捷)?消费人民币(?P<amount>[\d,]+\.?\d*)元.*?(?:余额(?P<balance>[\d,]+\.?\d*))?",
        "type": "expense"
    },

    # 7. 微信支付凭证/通知:
    # 微信支付：微信支付凭证 商户消费 ¥58.00 商户名称: 瑞幸咖啡 付款方式: 招商银行储蓄卡(9527)
    {
        "bank": "微信支付",
        "name": "微信支付凭证",
        "pattern": r"(?:微信支付|微信支付凭证).*?(?:商户消费|已付款|扫码支付)?\s*[¥￥](?P<amount>[\d,]+\.?\d*).*?(?:商户名称[:：]\s*(?P<merchant>[^\n\r]+))?.*?(?:付款方式[:：]\s*(?P<channel>[^\n\r]+))?",
        "type": "expense"
    },
    {
        "bank": "微信支付",
        "name": "微信收款通知",
        "pattern": r"(?:微信支付|微信收款).*?(?:二维码收款|收到付款|转账到账)\s*[¥￥](?P<amount>[\d,]+\.?\d*).*?(?:来自[:：]\s*(?P<merchant>[^\n\r]+))?",
        "type": "income"
    },

    # 8. 支付宝通知:
    # 支付宝：您在【淘宝天猫】通过余额宝成功付款88.00元
    {
        "bank": "支付宝",
        "name": "支付宝付款通知",
        "pattern": r"支付宝.*?(?:在[【\[](?P<merchant>[^】\]]+)[】\]])?.*?(?:成功付款|支付|消费)\s*(?:[¥￥])?(?P<amount>[\d,]+\.?\d*)\s*元.*?(?:通过(?P<channel>[^成功]+))?",
        "type": "expense"
    },
    {
        "bank": "支付宝",
        "name": "支付宝转账到账",
        "pattern": r"支付宝.*?(?:收到来自|收到)(?P<merchant>[^转账]+)?转账\s*(?:[¥￥])?(?P<amount>[\d,]+\.?\d*)\s*元",
        "type": "income"
    },

    # 9. 云闪付 / 银联:
    {
        "bank": "云闪付",
        "name": "云闪付扣款",
        "pattern": r"(?:云闪付|中国银联).*?尾号(?P<card>\d{4}).*?于(?P<time>[\d月日: \-]+)(?:在(?P<merchant>[^完成消费]+))?完成(?:消费|支付)(?P<amount>[\d,]+\.?\d*)元",
        "type": "expense"
    }
]

def suggest_category(merchant: str, text: str) -> str:
    combined_text = f"{merchant or ''} {text}".lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in combined_text:
                return cat
    return "日用百货"

def parse_date_string(date_str: Optional[str]) -> str:
    now = datetime.now()
    if not date_str:
        return now.strftime("%Y-%m-%d %H:%M")
    
    date_str = date_str.strip()
    
    # Try formats like "08月25日14:30" or "8月25日 14:30"
    m = re.search(r"(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日\s*(\d{1,2})[:：](\d{1,2})?", date_str)
    if m:
        year = int(m.group(1)) if m.group(1) else now.year
        month = int(m.group(2))
        day = int(m.group(3))
        hour = int(m.group(4))
        minute = int(m.group(5)) if m.group(5) else 0
        try:
            return datetime(year, month, day, hour, minute).strftime("%Y-%m-%d %H:%M")
        except Exception:
            pass
            
    # Try formats like "08-25 14:30"
    m2 = re.search(r"(?:(\d{4})[\-/])?(\d{1,2})[\-/](\d{1,2})\s*(\d{1,2})[:：](\d{1,2})?", date_str)
    if m2:
        year = int(m2.group(1)) if m2.group(1) else now.year
        month = int(m2.group(2))
        day = int(m2.group(3))
        hour = int(m2.group(4))
        minute = int(m2.group(5)) if m2.group(5) else 0
        try:
            return datetime(year, month, day, hour, minute).strftime("%Y-%m-%d %H:%M")
        except Exception:
            pass

    return now.strftime("%Y-%m-%d %H:%M")

def parse_natural_language(text: str) -> Optional[Dict[str, Any]]:
    """
    Fallback natural language heuristic parser for one-liners like:
    - "昨晚海底捞吃了320招行信用卡"
    - "打车花了35块微信零钱"
    - "发工资到招行8500"
    """
    cleaned = text.strip()
    
    # Extract amount
    amount = None
    amt_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:元|块|RMB|rmb|￥|¥)", cleaned)
    if not amt_match:
        amt_match = re.search(r"(?:[¥￥\$])\s*(\d+(?:\.\d+)?)", cleaned)
    if not amt_match:
        amt_match = re.search(r"(\d+(?:\.\d+)?)", cleaned)
    
    if amt_match:
        try:
            amount = float(amt_match.group(1).replace(",", ""))
        except Exception:
            pass
            
    if not amount or amount <= 0:
        return None

    # Determine type
    trans_type = "expense"
    if any(w in cleaned for w in ["收入", "入账", "收到", "工资", "转账给我", "收款", "分红", "奖金", "收益"]):
        trans_type = "income"
    elif any(w in cleaned for w in ["还款", "还信用卡", "还房贷", "还花呗", "还白条"]):
        trans_type = "repayment"
    elif any(w in cleaned for w in ["转账", "互转", "转给"]):
        trans_type = "transfer"

    # Extract card last4 if present
    card_last4 = None
    card_match = re.search(r"(?:尾号|卡号|账户|卡)?\s*(\d{4})", cleaned)
    if card_match:
        card_last4 = card_match.group(1)

    # Guess merchant / item
    merchant = ""
    for kw_list in CATEGORY_KEYWORDS.values():
        for kw in kw_list:
            if kw in cleaned:
                merchant = kw
                break
        if merchant:
            break
            
    if not merchant:
        # Take first 10 characters before numbers
        words = re.split(r"\d+", cleaned)
        if words and len(words[0].strip()) > 1:
            merchant = words[0].strip()[:15]

    suggested_cat = suggest_category(merchant, cleaned)
    
    return {
        "success": True,
        "confidence": 0.75,
        "type": trans_type,
        "amount": amount,
        "card_last4": card_last4,
        "bank_or_channel": "智能提取",
        "merchant": merchant or "日常消费",
        "suggested_category": suggested_cat,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "balance_after": None,
        "raw_text": text,
        "matched_rule": "NLP一句话智能识别",
        "note": f"由智能文本解析识别：{text[:30]}"
    }

def parse_sms_or_text(text: str, custom_rules: Optional[List[Dict[str, Any]]] = None, accounts_lookup: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Main entry point for parsing SMS, WeChat/Alipay push, or freeform text.
    """
    if not text or not text.strip():
        return {
            "success": False,
            "confidence": 0.0,
            "type": "expense",
            "amount": 0.0,
            "raw_text": text,
            "note": "内容为空"
        }

    raw = text.strip()
    
    # 1. First test against custom user rules and builtin bank templates
    all_rules = (custom_rules or []) + BUILTIN_RULES
    
    for rule in all_rules:
        pattern = rule.get("pattern", "")
        try:
            match = re.search(pattern, raw, re.IGNORECASE | re.DOTALL)
            if match:
                groups = match.groupdict()
                amount_str = groups.get("amount", "0").replace(",", "").strip()
                amount = float(amount_str) if amount_str else 0.0
                
                card_last4 = groups.get("card", None)
                if not card_last4 and groups.get("channel"):
                    # e.g. "招商银行储蓄卡(9527)"
                    c_match = re.search(r"(\d{4})", groups["channel"])
                    if c_match:
                        card_last4 = c_match.group(1)

                merchant = (groups.get("merchant") or "").strip()
                if not merchant and groups.get("channel"):
                    merchant = groups["channel"].strip()
                if not merchant:
                    merchant = rule.get("bank", "商户消费")

                balance_str = groups.get("balance", None)
                if not balance_str:
                    # Fallback global balance search
                    bal_match = re.search(r"(?:活期余额|当前余额|可用余额|卡内余额|账户余额|余额)\s*[:：]?\s*(?:[¥￥]|人民币)?\s*([\d,]+\.?\d*)", raw)
                    if bal_match:
                        balance_str = bal_match.group(1)

                balance_after = float(balance_str.replace(",", "")) if balance_str else None
                
                trans_type = rule.get("type", "expense")
                parsed_time = parse_date_string(groups.get("time"))
                suggested_cat = rule.get("default_category") or suggest_category(merchant, raw)

                res = {
                    "success": True,
                    "confidence": 0.95,
                    "type": trans_type,
                    "amount": amount,
                    "card_last4": card_last4,
                    "bank_or_channel": rule.get("bank", "手机短信通知"),
                    "merchant": merchant,
                    "suggested_category": suggested_cat,
                    "date": parsed_time,
                    "balance_after": balance_after,
                    "raw_text": raw,
                    "matched_rule": rule.get("name", "模板匹配"),
                    "note": f"来源: {rule.get('bank')} | 规则: {rule.get('name')}"
                }
                
                # Match account if accounts_lookup provided
                if accounts_lookup and card_last4:
                    for acc in accounts_lookup:
                        if acc.get("card_last4") == card_last4 or (acc.get("bank_name") and acc.get("bank_name") in rule.get("bank", "")):
                            res["matched_account_id"] = acc.get("id")
                            res["matched_account_name"] = acc.get("name")
                            break
                            
                return res
        except Exception:
            continue

    # 2. Fallback to Natural Language / Generic Heuristic parser
    nlp_res = parse_natural_language(raw)
    if nlp_res:
        if accounts_lookup and nlp_res.get("card_last4"):
            for acc in accounts_lookup:
                if acc.get("card_last4") == nlp_res["card_last4"]:
                    nlp_res["matched_account_id"] = acc.get("id")
                    nlp_res["matched_account_name"] = acc.get("name")
                    break
        return nlp_res

    # 3. If failed, return safe defaults
    return {
        "success": False,
        "confidence": 0.2,
        "type": "expense",
        "amount": 0.0,
        "card_last4": None,
        "bank_or_channel": "未知",
        "merchant": "未知消费",
        "suggested_category": "日用百货",
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "balance_after": None,
        "raw_text": raw,
        "matched_rule": None,
        "note": "未能完全匹配模板，请手动确认金额与分类"
    }
