import csv
import io
import re
from datetime import datetime
from typing import List, Dict, Any, Tuple
from backend.services.sms_parser import suggest_category

def parse_wechat_csv(content: str, default_account_id: str) -> Tuple[List[Dict[str, Any]], str]:
    """
    Parse WeChat Pay exported CSV bill.
    """
    lines = content.splitlines()
    header_idx = -1
    for i, line in enumerate(lines[:30]):
        if "交易时间" in line and "收/支" in line and "金额" in line:
            header_idx = i
            break
            
    if header_idx == -1:
        return [], "未找到微信账单表头，请确认是否为微信官方导出的账单明细CSV文件"

    csv_reader = csv.reader(lines[header_idx:])
    headers = [h.strip() for h in next(csv_reader)]
    
    # Map header column positions
    col_map = {}
    for idx, h in enumerate(headers):
        if "交易时间" in h: col_map["time"] = idx
        elif "交易类型" in h: col_map["type"] = idx
        elif "交易对方" in h: col_map["counterparty"] = idx
        elif "商品" in h: col_map["product"] = idx
        elif "收/支" in h: col_map["direction"] = idx
        elif "金额" in h: col_map["amount"] = idx
        elif "支付方式" in h: col_map["channel"] = idx
        elif "当前状态" in h: col_map["status"] = idx
        elif "交易单号" in h: col_map["order_id"] = idx
        elif "备注" in h: col_map["note"] = idx

    transactions = []
    for row in csv_reader:
        if not row or len(row) < 5:
            continue
        try:
            time_val = row[col_map.get("time", 0)].strip()
            direction = row[col_map.get("direction", 4)].strip() if "direction" in col_map else "支出"
            amt_raw = row[col_map.get("amount", 5)].strip().replace("¥", "").replace("￥", "").replace(",", "")
            amount = float(amt_raw)
            counterparty = row[col_map.get("counterparty", 2)].strip() if "counterparty" in col_map else ""
            product = row[col_map.get("product", 3)].strip() if "product" in col_map else ""
            channel = row[col_map.get("channel", 6)].strip() if "channel" in col_map else "微信支付"
            status = row[col_map.get("status", 7)].strip() if "status" in col_map else "已完成"
            order_id = row[col_map.get("order_id", 8)].strip() if "order_id" in col_map else ""
            
            # If status indicates failed or refund
            if "退款" in status or "失败" in status or "已全额退款" in status:
                continue

            trans_type = "expense"
            if "收入" in direction or direction == "收入":
                trans_type = "income"
            elif "/" in direction or "其他" in direction:
                if "理财" in product or "零钱通" in product:
                    trans_type = "investment"
                else:
                    trans_type = "expense"

            merchant_display = counterparty or product or "微信支付消费"
            suggested_cat = suggest_category(merchant_display, f"{product} {counterparty}")

            transactions.append({
                "type": trans_type,
                "amount": amount,
                "account_id": default_account_id,
                "category_name": suggested_cat,
                "date": time_val,
                "merchant": merchant_display,
                "note": f"微信支付 | {product} | {channel} | 单号:{order_id[-8:] if order_id else ''}",
                "source": "wechat_import",
                "raw_text": f"{time_val} {direction} {amount} {merchant_display}"
            })
        except Exception:
            continue

    return transactions, f"成功解析微信账单 {len(transactions)} 笔交易记录"

def parse_alipay_csv(content: str, default_account_id: str) -> Tuple[List[Dict[str, Any]], str]:
    """
    Parse Alipay exported CSV bill.
    """
    lines = content.splitlines()
    header_idx = -1
    for i, line in enumerate(lines[:40]):
        if "交易时间" in line and ("收/支" in line or "收支" in line) and "金额" in line:
            header_idx = i
            break
            
    if header_idx == -1:
        return [], "未找到支付宝账单表头，请确认是否为支付宝官方导出的明细CSV文件"

    csv_reader = csv.reader(lines[header_idx:])
    headers = [h.strip() for h in next(csv_reader)]
    
    col_map = {}
    for idx, h in enumerate(headers):
        if "交易时间" in h: col_map["time"] = idx
        elif "交易分类" in h: col_map["cat"] = idx
        elif "交易对方" in h: col_map["counterparty"] = idx
        elif "商品说明" in h: col_map["product"] = idx
        elif "收/支" in h or "收支" in h: col_map["direction"] = idx
        elif "金额" in h: col_map["amount"] = idx
        elif "收/付款方式" in h or "支付方式" in h: col_map["channel"] = idx
        elif "交易状态" in h: col_map["status"] = idx
        elif "交易订单号" in h: col_map["order_id"] = idx

    transactions = []
    for row in csv_reader:
        if not row or len(row) < 5:
            continue
        try:
            time_val = row[col_map.get("time", 0)].strip()
            direction = row[col_map.get("direction", 4)].strip() if "direction" in col_map else "支出"
            amt_raw = row[col_map.get("amount", 5)].strip().replace("¥", "").replace("￥", "").replace(",", "")
            amount = float(amt_raw)
            counterparty = row[col_map.get("counterparty", 2)].strip() if "counterparty" in col_map else ""
            product = row[col_map.get("product", 3)].strip() if "product" in col_map else ""
            channel = row[col_map.get("channel", 6)].strip() if "channel" in col_map else "支付宝"
            status = row[col_map.get("status", 7)].strip() if "status" in col_map else "交易成功"
            order_id = row[col_map.get("order_id", 8)].strip() if "order_id" in col_map else ""
            
            if "关闭" in status or "退款" in status or "失败" in status:
                continue

            trans_type = "expense"
            if "收入" in direction or direction == "收入":
                trans_type = "income"
            elif "不计收支" in direction or "资金转移" in direction:
                trans_type = "transfer"

            merchant_display = counterparty or product or "支付宝消费"
            suggested_cat = suggest_category(merchant_display, f"{product} {counterparty}")

            transactions.append({
                "type": trans_type,
                "amount": amount,
                "account_id": default_account_id,
                "category_name": suggested_cat,
                "date": time_val,
                "merchant": merchant_display,
                "note": f"支付宝 | {product} | {channel} | 单号:{order_id[-8:] if order_id else ''}",
                "source": "alipay_import",
                "raw_text": f"{time_val} {direction} {amount} {merchant_display}"
            })
        except Exception:
            continue

    return transactions, f"成功解析支付宝账单 {len(transactions)} 笔交易记录"
