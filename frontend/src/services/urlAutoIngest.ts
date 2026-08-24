import { parseSmsOrTextInBrowser } from './smsParser';
import { localStore } from './localStore';
import { api } from '../api/client';
import { Transaction } from '../types';

export interface AutoIngestResult {
  triggered: boolean;
  success: boolean;
  message: string;
  transaction?: Transaction;
  debugInfo?: string;
}

export function extractFromRawText(text: string, accounts: any[] = []): { amount: number; merchant: string; category: string; accountId?: string } {
  if (!text) return { amount: 0, merchant: '消费', category: '餐饮美食' };
  
  const clean = text.replace(/[\r\n]+/g, '\n').trim();
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = 0;
  let merchant = '';

  // 1. Try to find amount from bottom up
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    // Exclude summary / report lines
    if (line.includes('昨日') || line.includes('已支出') || line.includes('已入账') || line.includes('统计') || line.includes('共')) {
      continue;
    }
    const match = line.match(/(?:[¥￥$]\s*|[-－]\s*)?(\d+(?:\.\d{1,2})?)/);
    if (match) {
      const val = parseFloat(match[1]);
      if (val > 0 && val < 1000000 && !line.includes(':') && !line.includes('月') && !line.includes('日') && !line.includes('年')) {
        amount = val;
        // Search surrounding lines for merchant
        for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 1); j++) {
          const l = lines[j];
          if (j !== i && !l.includes('支付') && !l.includes('零钱') && !l.includes('微信') && !l.includes('支付宝') && !l.includes('详情') && !l.includes('昨天') && !l.includes('今天') && !l.includes('日报') && !l.includes('设置') && !l.includes('明细')) {
            merchant = l.replace(/[<>:：\-_/]/g, '').trim();
            break;
          }
        }
        break;
      }
    }
  }

  // Fallback if not found from lines
  if (!amount) {
    const matchAny = clean.match(/(\d+(?:\.\d{1,2})?)\s*(?:元|块)?/);
    if (matchAny) amount = parseFloat(matchAny[1]);
  }

  // Search brand in whole text if merchant not found
  if (!merchant || merchant.length < 2) {
    const brands = [
      "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", "海底捞", "喜茶", "霸王茶姬", 
      "茶百道", "蜜雪冰城", "美团", "饿了么", "滴滴出行", "淘宝", "天猫", "京东", 
      "拼多多", "盒马", "山姆", "永辉超市", "屈臣氏", "7-Eleven", "全家", "优衣库", "Apple"
    ];
    for (const b of brands) {
      if (clean.includes(b)) {
        merchant = b;
        break;
      }
    }
  }

  if (!merchant) merchant = "快捷提取消费";

  // Match category
  let category = '餐饮美食';
  if (/美团|饿了么|麦当劳|肯德基|饭|咖啡|茶|吃|火锅|餐厅|小吃/.test(merchant + clean)) category = '餐饮美食';
  else if (/滴滴|打车|地铁|公交|高铁|加油|车|出行/.test(merchant + clean)) category = '交通出行';
  else if (/超市|便利店|纸巾|盒马|山姆|全家/.test(merchant + clean)) category = '日用百货';
  else if (/淘宝|京东|天猫|拼多多|衣服|鞋|数码/.test(merchant + clean)) category = '购物消费';

  // Match account
  let targetAccId: string | undefined;
  if (/支付宝|余额宝|花呗/.test(clean)) {
    const found = accounts.find(a => a.name.includes('支付宝') || a.type === 'wallet');
    targetAccId = found?.id;
  } else {
    const found = accounts.find(a => a.name.includes('微信') || a.type === 'wallet');
    targetAccId = found?.id;
  }

  return { amount, merchant, category, accountId: targetAccId };
}

export async function checkAndHandleUrlAutoIngest(): Promise<AutoIngestResult | null> {
  try {
    const fullHref = window.location.href;
    const searchStr = window.location.search;
    const hashStr = window.location.hash;

    // 1. Try to find raw text parameter
    let rawText = '';
    const textMatch = fullHref.match(/[?&#](?:text|t|sms)=([^&#]*)/i);
    if (textMatch && textMatch[1]) {
      rawText = textMatch[1];
    }

    const searchParams = new URLSearchParams(searchStr);
    const hashParams = new URLSearchParams(hashStr.replace(/^#\/?/, ''));

    if (!rawText) {
      rawText = searchParams.get('text') || searchParams.get('t') || searchParams.get('sms') ||
                hashParams.get('text') || hashParams.get('t') || hashParams.get('sms') || '';
    }

    const directAmt = searchParams.get('amt') || searchParams.get('amount') ||
                      hashParams.get('amt') || hashParams.get('amount');
    const directMer = searchParams.get('mer') || searchParams.get('merchant') ||
                      hashParams.get('mer') || hashParams.get('merchant');
    const autoClipboard = searchParams.get('clipboard') === '1' || searchParams.get('cb') === '1' ||
                          hashParams.get('clipboard') === '1' || hashParams.get('cb') === '1';

    // If no automation params, return null
    if (!rawText && !directAmt && !autoClipboard) {
      return null;
    }

    // Clean URL state safely
    try {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    } catch {}

    const accounts = localStore.getAccounts();
    const categories = localStore.getCategories();

    // Helper to save transaction directly
    const saveAndReturn = async (amount: number, merchant: string, note: string, type: any = 'expense', category?: string, accountId?: string) => {
      const matchedCategory = category || '餐饮美食';
      const catObj = categories.find(c => c.name === matchedCategory);
      const targetAccountId = accountId || accounts[0]?.id || 'acc-1';

      const created = await api.createTransaction({
        type,
        amount,
        account_id: targetAccountId,
        category_id: catObj?.id,
        category_name: matchedCategory,
        date: new Date().toISOString().substring(0, 16).replace('T', ' '),
        merchant,
        note,
        source: 'ios_shortcut'
      });

      return {
        triggered: true,
        success: true,
        message: `🎉 已自动记账：${merchant} ¥${amount.toFixed(2)}`,
        transaction: created
      };
    };

    // Case 1: Direct amount & merchant provided via Shortcut
    if (directAmt) {
      const amount = parseFloat(directAmt);
      if (!isNaN(amount) && amount > 0) {
        const merchant = directMer || '快捷自动记账';
        return await saveAndReturn(amount, merchant, '通过 iPhone 快捷指令直接记录');
      }
    }

    // Case 2: Raw text passed from Screenshot / SMS / Dictation
    if (rawText) {
      let decoded = rawText;
      try {
        decoded = decodeURIComponent(rawText.replace(/\+/g, ' '));
      } catch {
        decoded = rawText;
      }

      // Use our high-precision multi-line extraction
      const extracted = extractFromRawText(decoded, accounts);
      if (extracted.amount > 0) {
        return await saveAndReturn(
          extracted.amount,
          extracted.merchant,
          '通过 iPhone 快捷指令自动识别',
          'expense',
          extracted.category,
          extracted.accountId
        );
      } else {
        return {
          triggered: true,
          success: false,
          message: `未识别到金额。收到文本: ${decoded.substring(0, 30)}...`,
          debugInfo: decoded
        };
      }
    }

    // Case 3: Automatic clipboard read on launch
    if (autoClipboard) {
      try {
        const clip = await navigator.clipboard.readText();
        if (clip) {
          const extracted = extractFromRawText(clip, accounts);
          if (extracted.amount > 0) {
            return await saveAndReturn(
              extracted.amount,
              extracted.merchant,
              '由剪贴板一键自动入账',
              'expense',
              extracted.category,
              extracted.accountId
            );
          }
        }
      } catch (e) {
        console.warn('Clipboard read error:', e);
      }
    }

    return {
      triggered: true,
      success: false,
      message: '未能识别到付款金额'
    };
  } catch (err: any) {
    console.error('URL auto ingest error:', err);
    return {
      triggered: true,
      success: false,
      message: `处理出错: ${err.message || '请重试'}`
    };
  }
}
