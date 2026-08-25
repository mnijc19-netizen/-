import { createWorker } from 'tesseract.js';
import { ParsedTransactionResult } from '../types';
import { suggestCategory, getLocalDateTimeString } from './smsParser';
import { extractFromRawText } from './urlAutoIngest';

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

export function cleanMerchantName(raw: string): string {
  if (!raw) return '微信/支付宝消费';
  let s = raw
    .replace(/^[\s"“'‘`]+|[\s"”'’`]+$/g, '') // strip surrounding quotes
    .replace(/^[Mm]\s+/, '') // strip McDonald's "M " or "m " logo artifact
    .replace(/^[©®★▲▼■●◆◇✓✔√]+\s*/, '') // strip icon symbols
    .replace(/^[<>\-_/:：]+\s*/, '') // strip leading brackets/colons
    .replace(/\s*付款方式.*$/i, '') // strip trailing payment method
    .replace(/\s*交易详情.*$/i, '') // strip trailing details button
    .replace(/\s*查看明细.*$/i, '') // strip trailing report button
    .replace(/\s*更多.*$/i, '') // strip Alipay more button
    .replace(/^[>vV]\s*/, '') // strip Alipay arrow
    .replace(/^商户名称[:：]\s*/, '') // strip prefix
    .replace(/^收款方全称[:：]\s*/, '') // strip prefix
    .replace(/^交易对方[:：]\s*/, '') // strip prefix
    .replace(/^商品说明[:：]\s*/, '') // strip prefix
    .replace(/[\d:：\-_/]/g, ' ') // replace digits/colons
    .replace(/(?:昨天|今天|上午|下午|晚上)/g, '')
    .replace(/^[\s"“'‘`]+|[\s"”'’`]+$/g, '') // strip quotes again
    .trim();

  // If merchant contains known brand, normalize it cleanly
  const brands = [
    "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", "海底捞", "喜茶", "霸王茶姬", 
    "茶百道", "蜜雪冰城", "美团", "美团外卖", "饿了么", "滴滴出行", "淘宝", "天猫", 
    "京东", "拼多多", "盒马", "山姆", "永辉超市", "屈臣氏", "7-Eleven", "全家", 
    "罗森", "便利蜂", "优衣库", "Apple", "生鲜超市"
  ];
  for (const b of brands) {
    if (s.includes(b)) {
      if (b === "麦当劳" || b === "肯德基" || b === "星巴克" || b === "海底捞" || b === "喜茶" || b === "霸王茶姬") {
        return b;
      }
    }
  }

  return s || '微信/支付宝消费';
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

  const extracted = extractFromRawText(rawText, accountsLookup);
  const matchedAcc = accountsLookup.find(a => a.id === extracted.accountId) || accountsLookup[0];

  return {
    success: extracted.amount > 0,
    confidence: extracted.amount > 0 ? 0.98 : 0.2,
    type: 'expense',
    amount: extracted.amount,
    bank_or_channel: matchedAcc?.name?.includes('支付宝') ? '支付宝' : '微信支付',
    merchant: extracted.merchant,
    suggested_category: extracted.category,
    date: extracted.date || getLocalDateTimeString(),
    raw_text: rawText.substring(0, 100),
    matched_rule: '多模态账单智能逆向提取',
    matched_account_id: extracted.accountId || matchedAcc?.id,
    matched_account_name: matchedAcc?.name,
    note: `${extracted.merchant} 消费`
  };
}
