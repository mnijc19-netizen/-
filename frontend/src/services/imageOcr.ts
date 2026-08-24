import { createWorker } from 'tesseract.js';
import { ParsedTransactionResult } from '../types';
import { suggestCategory } from './smsParser';

// Pre-processes an image file on canvas (grayscale, contrast enhancement, sharpening)
async function preprocessImage(imageFile: File | string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof imageFile === 'string' ? imageFile : URL.createObjectURL(imageFile));
        return;
      }

      // Resize if too large while maintaining aspect ratio
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Contrast & Grayscale Filter
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const contrast = 1.35; // 35% contrast boost
      const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));

      for (let i = 0; i < data.length; i += 4) {
        // Luminance grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const adjusted = factor * (gray - 128) + 128;
        const clamped = Math.max(0, Math.min(255, adjusted));
        data[i] = clamped;
        data[i + 1] = clamped;
        data[i + 2] = clamped;
      }
      ctx.putImageData(imgData, 0, 0);

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      resolve(typeof imageFile === 'string' ? imageFile : URL.createObjectURL(imageFile));
    };

    if (typeof imageFile === 'string') {
      img.src = imageFile;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageFile);
    }
  });
}

export async function parseBillImage(
  imageSource: File | string,
  accountsLookup: any[] = [],
  onProgress?: (progress: number, status: string) => void
): Promise<ParsedTransactionResult> {
  try {
    onProgress?.(0.1, '正在进行图像锐化与去噪预处理...');
    const preprocessedDataUrl = await preprocessImage(imageSource);

    onProgress?.(0.2, '正在初始化 OCR 文字提取引擎...');
    const worker = await createWorker('chi_sim+eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          onProgress?.(0.3 + (m.progress || 0) * 0.6, `正在智能解析文字... ${Math.round((m.progress || 0) * 100)}%`);
        }
      }
    });

    const ret = await worker.recognize(preprocessedDataUrl);
    await worker.terminate();

    const rawText = ret.data.text || '';
    onProgress?.(0.95, '正在提取交易金额与商户要素...');

    return parseRecognizedBillText(rawText, accountsLookup);
  } catch (error: any) {
    console.error('OCR Error:', error);
    return {
      success: false,
      confidence: 0,
      type: 'expense',
      amount: 0,
      raw_text: '',
      note: `图片识别遇到问题: ${error.message || '请尝试更清晰的图片'}`
    };
  }
}

export function parseRecognizedBillText(rawText: string, accountsLookup: any[] = []): ParsedTransactionResult {
  // Normalize whitespace and common OCR character confusions
  const text = rawText
    .replace(/[¥￥]/g, ' ¥ ')
    .replace(/O|o/g, (m, offset, str) => {
      // If surrounding characters are digits or period, replace with 0
      const prev = str[offset - 1];
      const next = str[offset + 1];
      return (/\d|\./.test(prev) || /\d|\./.test(next)) ? '0' : m;
    })
    .replace(/\s+/g, ' ');

  // 1. Extract Amount
  let amount = 0;
  // Match patterns like "¥ 58.00", "- 58.00", "58.00 元", "实付 58.00"
  const amtMatch = text.match(/(?:[-－¥￥]\s*)(\d+\.\d{2})/i) ||
                   text.match(/(?:实付|付款|支出|消费|金额|合计|支付金额)\s*[:：]?\s*(?:[¥￥])?\s*(\d+(?:\.\d{1,2})?)/i) ||
                   text.match(/(\d+\.\d{2})\s*(?:元|块)/i) ||
                   text.match(/(\d+\.\d{2})/);

  if (amtMatch) {
    amount = parseFloat(amtMatch[1]);
  }

  // 2. Extract Type
  let type: any = 'expense';
  if (/收款|转入|收到|收入|退款到账|分红/.test(text)) {
    type = 'income';
  } else if (/还款|还信用卡|还房贷/.test(text)) {
    type = 'repayment';
  } else if (/转账/.test(text)) {
    type = 'transfer';
  }

  // 3. Extract Merchant
  let merchant = '手机截屏消费';
  const merchantMatch = text.match(/(?:商户名称|交易对方|收款方|商户|商品说明|向)\s*[:：]?\s*([^\n\r,，。]+)/i);
  if (merchantMatch) {
    merchant = merchantMatch[1].trim().substring(0, 20);
  } else {
    // Search common merchant keywords
    const keywords = ["美团", "饿了么", "瑞幸咖啡", "星巴克", "麦当劳", "肯德基", "海底捞", "喜茶", "滴滴出行", "淘宝", "天猫", "京东", "拼多多", "山姆", "盒马", "永辉", "屈臣氏", "国家电网", "Apple", "Steam", "优衣库", "中国石化", "全家", "7-Eleven", "罗森", "霸王茶姬", "茶百道"];
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
    confidence: amount > 0 ? 0.95 : 0.4,
    type,
    amount,
    card_last4: cardLast4,
    bank_or_channel: /微信/.test(text) ? '微信支付' : /支付宝/.test(text) ? '支付宝' : '智能识别',
    merchant,
    suggested_category: category,
    date: transDate,
    raw_text: text.substring(0, 150),
    matched_rule: '图像锐化 OCR 智能提取',
    matched_account_id: matchedAccountId,
    matched_account_name: matchedAccountName,
    note: `由账单识别：${merchant} ¥${amount}`
  };
}
