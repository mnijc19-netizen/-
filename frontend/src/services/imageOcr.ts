import { createWorker } from 'tesseract.js';
import { ParsedTransactionResult } from '../types';
import { suggestCategory } from './smsParser';

// Pre-processes an image on canvas (high contrast, grayscale)
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

      // Resize while maintaining high resolution for text clarity
      const maxDim = 1800;
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
      const contrast = 1.4; // 40% contrast boost
      const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));

      for (let i = 0; i < data.length; i += 4) {
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
    onProgress?.(0.1, '正在进行图像去噪与锐化处理...');
    const preprocessedDataUrl = await preprocessImage(imageSource);

    onProgress?.(0.2, '正在识别文字信息...');
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
    onProgress?.(0.95, '正在精准提取商户与交易金额...');

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
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      confidence: 0,
      type: 'expense',
      amount: 0,
      raw_text: '',
      note: '未能识别出文字'
    };
  }

  // Split lines and trim
  const rawLines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);

  // Filter out status bars, dates without amounts, system UI like "微信记账本", "记账日报", "昨日支出", etc.
  // 1. Check WeChat Pay bubble pattern (Latest card is at the bottom of the screenshot)
  // Structure: [Merchant Name] -> [使用零钱支付 / 招商银行卡] -> [¥ 14.90] -> [交易详情]
  let detectedAmount = 0;
  let detectedMerchant = '';
  let detectedAccountName = '';
  let detectedChannel = '微信支付';

  // Search from bottom up for the real transaction card
  for (let i = rawLines.length - 1; i >= 0; i--) {
    const line = rawLines[i];

    // Check if line contains large amount like "¥ 14.90" or "¥14.90" or "-14.90"
    const amtMatch = line.match(/(?:[¥￥]\s*|[-－]\s*|^[¥￥]?\s*)(\d+\.\d{2})/);
    if (amtMatch && !line.includes('昨日') && !line.includes('统计') && !line.includes('已支出') && !line.includes('已入账')) {
      detectedAmount = parseFloat(amtMatch[1]);

      // Look at 1~3 lines above for payment method and merchant
      for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
        const prevLine = rawLines[j];
        if (prevLine.includes('支付') || prevLine.includes('零钱') || prevLine.includes('卡') || prevLine.includes('余额宝') || prevLine.includes('花呗')) {
          detectedAccountName = prevLine;
          // The line above payment method is usually the merchant name
          if (j > 0) {
            const possibleMerchant = rawLines[j - 1];
            if (!possibleMerchant.includes('微信') && !possibleMerchant.includes('昨天') && !possibleMerchant.includes('今天') && !possibleMerchant.includes('日报')) {
              detectedMerchant = possibleMerchant;
            }
          }
        } else if (!detectedMerchant && !prevLine.includes('微信') && !prevLine.includes('昨天') && !prevLine.includes('今天') && !prevLine.includes('日报') && !prevLine.includes('设置') && !prevLine.includes('明细')) {
          detectedMerchant = prevLine;
        }
      }
      break;
    }
  }

  // Fallback 2: If bottom-up search didn't find clear merchant, search text for known brands
  const textAll = rawLines.join(' ');
  if (!detectedMerchant || detectedMerchant.length < 2) {
    const commonBrands = [
      "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", "海底捞", "喜茶", "霸王茶姬", 
      "茶百道", "蜜雪冰城", "美团", "饿了么", "美团外卖", "滴滴出行", "淘宝", "天猫", 
      "京东", "拼多多", "盒马", "山姆", "永辉超市", "屈臣氏", "7-Eleven", "全家", 
      "罗森", "便利蜂", "优衣库", "Apple", "Steam", "中国石化", "中国石油", "国家电网"
    ];
    for (const b of commonBrands) {
      if (textAll.includes(b)) {
        detectedMerchant = b;
        break;
      }
    }
  }

  // Fallback 3: Clean up merchant name (remove time stamps, icons)
  if (detectedMerchant) {
    detectedMerchant = detectedMerchant.replace(/[\d:：\-_/]/g, '').replace(/(?:昨天|今天|上午|下午|晚上)/g, '').trim();
  }
  if (!detectedMerchant || detectedMerchant.length < 2) {
    detectedMerchant = '微信商户消费';
  }

  // Fallback 4: If amount is still 0, search anywhere for standard decimal
  if (!detectedAmount) {
    const anyAmt = textAll.match(/(\d+\.\d{2})/);
    if (anyAmt) {
      detectedAmount = parseFloat(anyAmt[1]);
    }
  }

  // Determine matching account
  let matchedAcc = accountsLookup.find(a => a.name.includes('微信') || a.type === 'wallet');
  if (detectedAccountName.includes('支付宝') || detectedAccountName.includes('余额宝')) {
    matchedAcc = accountsLookup.find(a => a.name.includes('支付宝') || a.type === 'wallet');
    detectedChannel = '支付宝';
  } else if (detectedAccountName.includes('卡') || detectedAccountName.includes('银行')) {
    const cardAcc = accountsLookup.find(a => a.type === 'bank' || a.type === 'credit');
    if (cardAcc) matchedAcc = cardAcc;
  }

  const category = suggestCategory(detectedMerchant, textAll);

  return {
    success: detectedAmount > 0,
    confidence: detectedAmount > 0 ? 0.98 : 0.2,
    type: 'expense',
    amount: detectedAmount,
    bank_or_channel: detectedChannel,
    merchant: detectedMerchant,
    suggested_category: category,
    date: new Date().toISOString().substring(0, 16).replace('T', ' '),
    raw_text: textAll.substring(0, 100),
    matched_rule: '账单卡片智能逆向提取',
    matched_account_id: matchedAcc?.id,
    matched_account_name: matchedAcc?.name,
    note: `${detectedMerchant} 消费`
  };
}
