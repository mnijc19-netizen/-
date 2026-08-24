import { createWorker } from 'tesseract.js';
import { ParsedTransactionResult } from '../types';
import { suggestCategory, getLocalDateTimeString } from './smsParser';

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

  const clean = rawText.replace(/[\r\n]+/g, '\n').trim();
  const rawLines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let detectedAmount = 0;
  let detectedMerchant = '';
  let detectedChannel = '微信支付';
  let matchedAcc = accountsLookup[0];

  const isAlipay = /支付宝|花呗|借呗|余额宝|全部账单|账单详情|支付奖励|收单机构|清算机构/.test(clean);
  const isWechat = /微信支付|微信记账本|使用零钱支付|零钱通/.test(clean);

  if (isAlipay) {
    detectedChannel = '支付宝';
    const alipayAcc = accountsLookup.find(a => a.name.includes('支付宝') || a.id === 'acc-2');
    if (alipayAcc) matchedAcc = alipayAcc;
  } else if (isWechat) {
    detectedChannel = '微信支付';
    const wxAcc = accountsLookup.find(a => a.name.includes('微信') || a.id === 'acc-1');
    if (wxAcc) matchedAcc = wxAcc;
  }

  // 1. Specialized Alipay Bill Details (Top Down)
  if (isAlipay) {
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const alipayAmtMatch = line.match(/^[-－]?\s*([¥￥$]?\s*)(\d+\.\d{2})$/);
      if (alipayAmtMatch) {
        detectedAmount = parseFloat(alipayAmtMatch[2]);
        if (i > 0) {
          const prev = rawLines[i - 1];
          if (!prev.includes('账单') && !prev.includes('<') && prev.length > 1) {
            detectedMerchant = cleanMerchantName(prev);
          }
        }
        break;
      }
    }
  }

  // 2. Specialized WeChat Pay Bubble (Bottom Up)
  if (!detectedAmount) {
    for (let i = rawLines.length - 1; i >= 0; i--) {
      const line = rawLines[i];
      if (line.includes('昨日') || line.includes('统计') || line.includes('已支出') || line.includes('已入账') || line.includes('积分') || line.includes('时间') || line.includes('202')) {
        continue;
      }
      const amtMatch = line.match(/(?:[¥￥$]\s*|[-－]\s*)?(\d+\.\d{2})/);
      if (amtMatch) {
        const val = parseFloat(amtMatch[1]);
        if (val > 0 && val < 1000000 && !line.includes(':')) {
          detectedAmount = val;
          // Search surrounding lines for merchant
          for (let j = Math.max(0, i - 3); j <= Math.min(rawLines.length - 1, i + 1); j++) {
            const l = rawLines[j];
            if (j !== i && !l.includes('支付') && !l.includes('零钱') && !l.includes('微信') && !l.includes('支付宝') && !l.includes('详情') && !l.includes('昨天') && !l.includes('今天') && !l.includes('日报') && !l.includes('设置') && !l.includes('明细') && !l.includes('积分') && !l.includes('时间')) {
              detectedMerchant = cleanMerchantName(l);
              break;
            }
          }
          break;
        }
      }
    }
  }

  // Fallback 3: Search whole text for known brands
  if (!detectedMerchant || detectedMerchant.length < 2) {
    detectedMerchant = cleanMerchantName(clean);
  }

  // Fallback 4: Any amount in text
  if (!detectedAmount) {
    const anyAmt = clean.match(/(\d+\.\d{2})/);
    if (anyAmt) detectedAmount = parseFloat(anyAmt[1]);
  }

  const category = suggestCategory(detectedMerchant, clean);

  return {
    success: detectedAmount > 0,
    confidence: detectedAmount > 0 ? 0.98 : 0.2,
    type: 'expense',
    amount: detectedAmount,
    bank_or_channel: detectedChannel,
    merchant: detectedMerchant || (isAlipay ? '支付宝消费' : '微信商户消费'),
    suggested_category: category,
    date: getLocalDateTimeString(),
    raw_text: clean.substring(0, 100),
    matched_rule: '账单卡片智能逆向提取',
    matched_account_id: matchedAcc?.id,
    matched_account_name: matchedAcc?.name,
    note: `${detectedMerchant} 消费`
  };
}
