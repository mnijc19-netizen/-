from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional, Dict, Any
import uuid
import json
from backend.database import get_db
from backend.schemas import ParseTextRequest, ParsedTransactionResult
from backend.services.sms_parser import parse_sms_or_text, BUILTIN_RULES
from backend.services.csv_importer import parse_wechat_csv, parse_alipay_csv

router = APIRouter(prefix="/api/parser", tags=["Parser"])

@router.post("/parse-text", response_model=ParsedTransactionResult)
def parse_text_endpoint(req: ParseTextRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Load user accounts for card matching
        cursor.execute("SELECT id, name, type, bank_name, card_last4 FROM accounts WHERE is_active = 1")
        accounts_lookup = [dict(r) for r in cursor.fetchall()]
        
        # Load custom rules
        cursor.execute("SELECT * FROM parser_rules WHERE is_active = 1")
        custom_rules = [dict(r) for r in cursor.fetchall()]
        
        result = parse_sms_or_text(req.text, custom_rules=custom_rules, accounts_lookup=accounts_lookup)
        return result

@router.post("/import-csv")
async def import_csv_endpoint(
    channel: str = Form(...), # 'wechat' or 'alipay'
    account_id: str = Form(...),
    file: UploadFile = File(...)
):
    content_bytes = await file.read()
    # Try decoding utf-8, gbk, gb18030
    content = ""
    for enc in ["utf-8", "gb18030", "gbk", "utf-8-sig"]:
        try:
            content = content_bytes.decode(enc)
            break
        except Exception:
            continue
            
    if not content:
        raise HTTPException(status_code=400, detail="无法解析上传的文件编码，请确保为CSV或文本格式")
        
    if channel == "wechat":
        transactions, msg = parse_wechat_csv(content, account_id)
    elif channel == "alipay":
        transactions, msg = parse_alipay_csv(content, account_id)
    else:
        raise HTTPException(status_code=400, detail="不支持的账单类型")
        
    if not transactions:
        return {"success": False, "message": msg, "imported_count": 0}
        
    # Save transactions to DB
    inserted_count = 0
    with get_db() as conn:
        cursor = conn.cursor()
        
        for t in transactions:
            # Check duplicate by date + amount + merchant
            cursor.execute("""
            SELECT id FROM transactions 
            WHERE date = ? AND amount = ? AND (merchant = ? OR raw_text = ?)
            """, (t["date"], t["amount"], t["merchant"], t.get("raw_text")))
            if cursor.fetchone():
                continue
                
            t_id = f"t-{uuid.uuid4().hex[:8]}"
            cursor.execute("""
            INSERT INTO transactions (id, type, amount, account_id, category_name, date, merchant, note, source, raw_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                t_id, t["type"], t["amount"], t["account_id"], t.get("category_name", "日常消费"),
                t["date"], t["merchant"], t["note"], t["source"], t.get("raw_text")
            ))
            
            # Update balance
            if t["type"] == "expense":
                cursor.execute("UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (t["amount"], account_id))
            elif t["type"] == "income":
                cursor.execute("UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (t["amount"], account_id))
                
            inserted_count += 1
            
    return {
        "success": True,
        "message": f"{msg}，实际新导入 {inserted_count} 笔（已自动过滤重复记录）",
        "imported_count": inserted_count
    }

@router.get("/builtin-rules")
def get_builtin_rules():
    return BUILTIN_RULES
