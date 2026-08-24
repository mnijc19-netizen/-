import { parseSmsOrTextInBrowser, getLocalDateTimeString } from './smsParser';
import { localStore } from './localStore';
import { api } from '../api/client';
import { Transaction } from '../types';

export interface AutoIngestResult {
  triggered: boolean;
  success: boolean;
  message: string;
  transaction?: Transaction;
  debugInfo?: string;
  showClipboardButton?: boolean;
}

export function cleanMerchantName(raw: string): string {
  if (!raw) return '日常消费';
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
    "罗森", "便利蜂", "优衣库", "Apple"
  ];
  for (const b of brands) {
    if (s.includes(b)) {
      if (b === "麦当劳" || b === "肯德基" || b === "星巴克" || b === "海底捞" || b === "喜茶" || b === "霸王茶姬") {
        return b;
      }
    }
  }

  return s || '日常消费';
}

export function detectPaymentChannel(clean: string): 'wechat' | 'alipay' {
  let wxScore = 0;
  let aliScore = 0;

  // WeChat strong signals
  if (/微信支付|微信记账本|使用零钱支付|零钱通|微信/.test(clean)) wxScore += 10;
  if (/使用零钱|零钱支付|零钱/.test(clean)) wxScore += 5;
  if (/记账日报|查看明细|日报设置|昨日支出|昨日入账/.test(clean)) wxScore += 5;
  if (/商户名称|交易详情/.test(clean)) wxScore += 2;

  // Alipay strong signals
  if (/支付宝|花呗|借呗|余额宝/.test(clean)) aliScore += 10;
  if (/全部账单|账单详情|支付奖励|解锁了|账单分类|为你推荐|计入收支/.test(clean)) aliScore += 5;

  if (aliScore > wxScore && aliScore >= 5) {
    return 'alipay';
  }
  return 'wechat';
}

export function extractFromRawText(text: string, accounts: any[] = []): { amount: number; merchant: string; category: string; accountId?: string } {
  if (!text) return { amount: 0, merchant: '消费', category: '日常消费' };
  
  const clean = text.replace(/[\r\n]+/g, '\n').trim();
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = 0;
  let merchant = '';
  let category = '';
  let targetAccId: string | undefined;

  // 1. Channel Detection via robust scoring
  const channel = detectPaymentChannel(clean);
  const isAlipay = channel === 'alipay';

  if (isAlipay) {
    const alipayAcc = accounts.find(a => a.name.includes('支付宝') || a.id === 'acc-2');
    targetAccId = alipayAcc?.id || 'acc-2';
  } else {
    const wxAcc = accounts.find(a => a.name.includes('微信') || a.id === 'acc-1');
    targetAccId = wxAcc?.id || 'acc-1';
  }

  // 2. Specialized Alipay Bill Details Parser (Top Down)
  if (isAlipay) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const alipayAmtMatch = line.match(/^[-－]?\s*([¥￥$]?\s*)(\d+\.\d{2})$/);
      if (alipayAmtMatch) {
        amount = parseFloat(alipayAmtMatch[2]);
        if (i > 0) {
          let prevLine = lines[i - 1];
          if (!prevLine.includes('账单') && !prevLine.includes('<') && prevLine.length > 1) {
            merchant = cleanMerchantName(prevLine);
          }
        }
        break;
      }
    }
  }

  // 3. Specialized WeChat Bill Parser / Fallback (Bottom Up)
  if (!amount) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.includes('昨日') || line.includes('已支出') || line.includes('已入账') || line.includes('统计') || line.includes('共') || line.includes('积分') || line.includes('时间') || line.includes('202')) {
        continue;
      }
      const match = line.match(/(?:[¥￥$]\s*|[-－]\s*)?(\d+\.\d{2})/);
      if (match) {
        const val = parseFloat(match[1]);
        if (val > 0 && val < 1000000 && !line.includes(':')) {
          amount = val;
          // Search surrounding lines for merchant
          for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 1); j++) {
            const l = lines[j];
            if (j !== i && !l.includes('支付') && !l.includes('零钱') && !l.includes('微信') && !l.includes('支付宝') && !l.includes('详情') && !l.includes('昨天') && !l.includes('今天') && !l.includes('日报') && !l.includes('设置') && !l.includes('明细') && !l.includes('积分') && !l.includes('时间')) {
              merchant = cleanMerchantName(l);
              break;
            }
          }
          break;
        }
      }
    }
  }

  // 4. Fallback if amount not found
  if (!amount) {
    const matchAny = clean.match(/(\d+(?:\.\d{1,2})?)\s*(?:元|块)?/);
    if (matchAny) amount = parseFloat(matchAny[1]);
  }

  if (merchant) {
    merchant = cleanMerchantName(merchant);
  }

  // Search brand in whole text if merchant not found
  if (!merchant || merchant.length < 2) {
    const brands = [
      "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", "海底捞", "喜茶", "霸王茶姬", 
      "茶百道", "蜜雪冰城", "美团", "饿了么", "滴滴出行", "淘宝", "天猫", "京东", 
      "拼多多", "盒马", "山姆", "永辉超市", "屈臣氏", "7-Eleven", "全家", "优衣库", "Apple",
      "生鲜超市", "便利店", "良田"
    ];
    for (const b of brands) {
      if (clean.includes(b)) {
        merchant = cleanMerchantName(b);
        break;
      }
    }
  }

  if (!merchant) merchant = isAlipay ? "支付宝消费" : "微信消费";

  // 5. Match Category
  if (/生鲜|超市|便利店|百货|水果|良田|菜市|日用/.test(merchant + clean)) category = '日用百货';
  else if (/牛肉|海鲜|火锅|烧烤|饭|面|餐|吃|麦当劳|肯德基|咖啡|茶|外卖|美团/.test(merchant + clean)) category = '餐饮美食';
  else if (/滴滴|打车|地铁|公交|高铁|加油|车|出行/.test(merchant + clean)) category = '交通出行';
  else if (/淘宝|京东|天猫|拼多多|衣服|鞋|数码/.test(merchant + clean)) category = '购物消费';
  else category = '日常消费';

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

    // Helper to save transaction directly with local China time
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
        date: getLocalDateTimeString(),
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
      const amount = parseFloat(directAmt.replace(/[¥￥$\s]/g, ''));
      if (!isNaN(amount) && amount > 0) {
        const merchant = directMer ? cleanMerchantName(directMer) : '快捷记账';
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

      if (!decoded.trim()) {
        try {
          const clip = await navigator.clipboard.readText();
          if (clip && clip.trim()) {
            const extracted = extractFromRawText(clip, accounts);
            if (extracted.amount > 0) {
              return await saveAndReturn(
                extracted.amount,
                extracted.merchant,
                '通过剪贴板自动识别',
                'expense',
                extracted.category,
                extracted.accountId
              );
            }
          }
        } catch {}
        return {
          triggered: true,
          success: false,
          message: '',
          showClipboardButton: true
        };
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
        if (clip && clip.trim()) {
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
        return {
          triggered: true,
          success: false,
          message: '',
          showClipboardButton: true
        };
      }
      return {
        triggered: true,
        success: false,
        message: '',
        showClipboardButton: true
      };
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
