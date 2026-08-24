import { createWorker } from 'tesseract.js';
import { ParsedTransactionResult } from '../types';
import { suggestCategory } from './smsParser';

export async function parseBillImage(
  imageSource: File | string,
  accountsLookup: any[] = [],
  onProgress?: (progress: number, status: string) => void
): Promise<ParsedTransactionResult> {
  try {
    onProgress?.(0.1, '正在初始化图片识别引擎...');
    
    // Create Tesseract worker
    const worker = await createWorker('chi_sim+eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          onProgress?.(0.2 + (m.progress || 0) * 0.7, `正在识别图片中... ${Math.round((m.progress || 0) * 100)}%`);
        }
      }
    });

    onProgress?.(0.3, '正在提取文字信息...');
    const ret = await worker.recognize(imageSource);
    await worker.terminate();

    const rawText = ret.data.text || '';
    onProgress?.(0.9, '正在进行智能语义解析...');

    return parseRecognizedBillText(rawText, accountsLookup);
  } catch (error: any) {
    console.error('OCR Error:', error);
    // Fallback parser if worker fails or network offline
    return {
      success: false,
      confidence: 0,
      type: 'expense',
      amount: 0,
      raw_text: '',
      note: `图片识别遇到问题: ${error.message || '请尝试清晰的正向截图'}`
    };
  }
}

export function parseRecognizedBillText(rawText: string, accountsLookup: any[] = []): ParsedTransactionResult {
  const text = rawText.replace(/\s+/g, ' ');

  // 1. Extract Amount
  // Look for patterns like "- 58.00", "¥58.00", "58.00元", "支付 128.50"
  let amount = 0;
  const amtMatch = text.match(/(?:[-－¥￥]\s*)(\d+\.\d{2})/i) ||
                   text.match(/(\d+\.\d{2})\s*元/i) ||
                   text.match(/(?:金额|合计|实付|付款|支出|消费)\s*[:：]?\s*[¥￥]?\s*(\d+(?:\.\d+)?)/i) ||
                   text.match(/(\d+\.\d{2})/);

  if (amtMatch) {
    amount = parseFloat(amtMatch[1]);
  }

  // 2. Extract Type
  let type: any = 'expense';
  if (/收款|转入|收到|收入|退款到账/.test(text)) {
    type = 'income';
  } else if (/还款|还信用卡/.test(text)) {
    type = 'repayment';
  } else if (/转账/.test(text)) {
    type = 'transfer';
  }

  // 3. Extract Merchant
  let merchant = '手机截图消费';
  const merchantMatch = text.match(/(?:商户名称|交易对方|收款方|商户|商品说明|向)\s*[:：]?\s*([^\n\r,，。]+)/i);
  if (merchantMatch) {
    merchant = merchantMatch[1].trim().substring(0, 20);
  } else {
    // Search common merchant keywords
    const keywords = ["美团", "饿了么", "瑞幸咖啡", "星巴克", "麦当劳", "肯德基", "海底捞", "喜茶", "滴滴出行", "淘宝", "京东", "天猫", "拼多多", "山姆", "盒马", "永辉", "屈臣氏", "国家电网", "Apple", "Steam", "优衣库", "中国石化", "全家"];
    for (const kw of keywords) {
      if (text.includes(kw)) {
        merchant = kw;
        break;
      }
    }
  }

  // 4. Extract Card / Account
  let cardLast4: string | undefined;
  const cardMatch = text.match(/(?:卡号|尾号|\()(\d{4})(?:\)|\s|$)/);
  if (cardMatch) {
    cardLast4 = cardMatch[1];
  }

  // 5. Match Account
  let matchedAccountId: string | undefined;
  let matchedAccountName: string | undefined;
  if (cardLast4) {
    const found = accountsLookup.find(a => a.card_last4 === cardLast4);
    if (found) {
      matchedAccountId = found.id;
      matchedAccountName = found.name;
    }
  }
  if (!matchedAccountId) {
    if (/微信/.test(text)) {
      const found = accountsLookup.find(a => a.name.includes('微信') || a.type === 'wallet');
      matchedAccountId = found?.id;
      matchedAccountName = found?.name;
    } else if (/支付宝|余额宝|花呗/.test(text)) {
      const found = accountsLookup.find(a => a.name.includes('支付宝') || a.type === 'wallet');
      matchedAccountId = found?.id;
      matchedAccountName = found?.name;
    }
  }

  // 6. Extract Date
  let transDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
  const dateMatch = text.match(/(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2}(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)?)/);
  if (dateMatch) {
    transDate = dateMatch[1].replace(/\//g, '-').replace(/\./g, '-');
  }

  const category = suggestCategory(merchant, text);

  return {
    success: amount > 0,
    confidence: amount > 0 ? 0.9 : 0.4,
    type,
    amount,
    card_last4: cardLast4,
    bank_or_channel: /微信/.test(text) ? '微信支付' : /支付宝/.test(text) ? '支付宝' : '图片识别',
    merchant,
    suggested_category: category,
    date: transDate,
    raw_text: text.substring(0, 150),
    matched_rule: '图片/截图 OCR 智能提取',
    matched_account_id: matchedAccountId,
    matched_account_name: matchedAccountName,
    note: `由账单图片/截图识别：${merchant} ¥${amount}`
  };
}
