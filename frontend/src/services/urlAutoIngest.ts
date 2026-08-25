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
    .replace(/^商户全称[:：\s]*/, '')
    .replace(/^商户名称[:：\s]*/, '')
    .replace(/^收款方全称[:：\s]*/, '')
    .replace(/^收款方[:：\s]*/, '')
    .replace(/^交易对方[:：\s]*/, '')
    .replace(/^商品说明[:：\s]*/, '')
    .replace(/^对方全称[:：\s]*/, '')
    .replace(/[:：]/g, ' ')
    .replace(/(?:昨天|今天|上午|下午|晚上)/g, '')
    .replace(/[。，,]/g, '')
    .replace(/^[\s"“'‘`]+|[\s"”'’`]+$/g, '')
    .trim();

  // If merchant contains known brand, normalize it cleanly
  const brands = [
    "铁路12306", "中国铁路", "12306", "中国石化", "中国电信", "中国移动", "中国联通", "万亩良田生鲜超市", "万亩良田", "抖音生活服务", "抖音",
    "清口清汤面", "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", "海底捞火锅", "海底捞", "喜茶", "霸王茶姬", 
    "茶百道", "蜜雪冰城", "美团外卖", "美团", "饿了么", "滴滴出行", "滴滴", "曹操出行", "T3出行", "哈啰单车", "哈啰", "淘宝闪购", "淘宝", "天猫", 
    "京东商城", "京东", "拼多多", "盒马鲜生", "盒马", "山姆会员商店", "山姆", "永辉超市", "屈臣氏", "7-Eleven", "全家", "FamilyMart",
    "罗森", "便利蜂", "优衣库", "Apple", "生鲜超市", "老乡鸡", "医院", "门诊"
  ];
  for (const b of brands) {
    if (raw.includes(b) || s.includes(b)) {
      if (b === 'FamilyMart') return '全家便利店';
      if (b === '12306' || b === '中国铁路') return '铁路12306';
      return b;
    }
  }

  // Alias mapper
  if (raw.includes('寻梦')) return '拼多多';
  if (raw.includes('协和')) return '北京协和医院';
  if (raw.includes('哈啰')) return '哈啰单车';

  // Filter pure symbol/garbage OCR outputs
  if (s.startsWith('@') || /^[a-zA-Z\s@#*]+$/.test(s) && s.length < 10) {
    if (raw.includes('电信') || raw.includes('话费')) return '中国电信';
    if (raw.includes('移动')) return '中国移动';
    if (raw.includes('联通')) return '中国联通';
    if (raw.includes('万亩') || raw.includes('良田')) return '万亩良田生鲜超市';
    if (raw.includes('铁路')) return '铁路12306';
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
  if (/支付宝|花呗|借呗|余额宝|蚂蚁/.test(clean)) aliScore += 10;
  if (/全部账单|账单详情|支付奖励|解锁了|账单分类|为你推荐|计入收支|淘宝|闪购/.test(clean)) aliScore += 5;

  if (aliScore > wxScore && aliScore >= 5) {
    return 'alipay';
  }
  return 'wechat';
}

export function suggestCategory(merchant: string, fullText: string = ''): string {
  // 1. Check extracted merchant first
  const m = (merchant || '').toLowerCase();
  if (/滴滴|打车|出租车|地铁|公交|高铁|火车|机票|加油|中石化|中石油|停车|高速|出行|交通/.test(m)) return '交通出行';
  if (/电信|移动|联通|话费|充值|宽带|水费|电费|燃气|物业|房租|生活缴费/.test(m)) return '生活服务';
  if (/餐饮|美食|清汤面|面|饭|餐|吃|外卖|美团|饿了么|麦当劳|肯德基|汉堡|火锅|烧烤|牛肉|海鲜|咖啡|奶茶|茶|霸王茶姬|星巴克|瑞幸|喜茶|早餐|午餐|晚餐|夜宵|甜品|小吃|炸鸡/.test(m)) return '餐饮美食';
  if (/生鲜|超市|便利店|百货|水果|良田|菜市|日用|屈臣氏|全家|罗森|7-eleven|便利蜂|永辉|盒马|山姆/.test(m)) return '日用百货';
  if (/淘宝|天猫|京东|拼多多|唯品会|服装|衣服|鞋|包|数码|手机|电脑|电器|饰品|闪购|购物/.test(m)) return '购物消费';
  if (/电影|影城|ktv|酒吧|网吧|游戏|充值|门票|旅游|休闲|娱乐/.test(m)) return '休闲娱乐';
  if (/医|药|诊所|医院|体检|健康|牙科/.test(m)) return '医疗健康';

  // 2. Check full combined text
  const combined = (merchant + ' ' + fullText).toLowerCase();
  if (/电信|移动|联通|话费|充值|宽带|水费|电费|燃气|物业|房租|生活缴费/.test(combined)) return '生活服务';
  if (/餐饮|美食|清汤面|面|饭|餐|吃|外卖|美团|饿了么|麦当劳|肯德基|汉堡|火锅|烧烤|牛肉|海鲜|咖啡|奶茶|茶|霸王茶姬|星巴克|瑞幸|喜茶|早餐|午餐|晚餐|夜宵|甜品|小吃|炸鸡/.test(combined)) return '餐饮美食';
  if (/生鲜|超市|便利店|百货|水果|良田|菜市|日用|屈臣氏|全家|罗森|7-eleven|便利蜂|永辉|盒马|山姆/.test(combined)) return '日用百货';
  if (/滴滴|打车|出租车|地铁|公交|高铁|火车|机票|加油|中石化|中石油|停车|高速|出行|交通/.test(combined)) return '交通出行';
  if (/淘宝|天猫|京东|拼多多|唯品会|服装|衣服|鞋|包|数码|手机|电脑|电器|饰品|闪购|购物/.test(combined)) return '购物消费';
  if (/电影|影城|ktv|酒吧|网吧|游戏|充值|门票|旅游|休闲|娱乐/.test(combined)) return '休闲娱乐';
  if (/医|药|诊所|医院|体检|健康|牙科/.test(combined)) return '医疗健康';
  return '日常消费';
}

export function extractFromRawText(text: string, accounts: any[] = []): { amount: number; merchant: string; category: string; date?: string; accountId?: string } {
  if (!text) return { amount: 0, merchant: '日常消费', category: '日常消费' };
  
  const rawClean = text.replace(/[\r\n]+/g, '\n').trim();
  const allLines = rawClean.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = 0;
  let merchant = '';
  let category = '';
  let date = '';
  let targetAccId: string | undefined;

  // 1. Explicit merchant prefix extraction
  const explicitMerchantMatch = rawClean.match(/(?:商户名称|交易对方|收款方|收款人|商家|交易商户|店铺名称)[:：]\s*([^\n\r]+)/);
  if (explicitMerchantMatch) {
    merchant = cleanMerchantName(explicitMerchantMatch[1]);
  }

  // 2. Channel Detection via robust scoring
  const isAlipay = /支付宝|花呗|借呗|余额宝|蚂蚁|全部账单|账单详情|支付奖励|淘|闪购|蜂鸟|饿了么/.test(rawClean);
  const isWechat = /微信支付|微信记账本|使用零钱支付|零钱通|微信/.test(rawClean);
  const isBank = /招商银行|工商银行|建设银行|农业银行|中国银行|交通银行|信用卡|储蓄卡/.test(rawClean);

  if (isAlipay) {
    const alipayAcc = accounts.find(a => a.name && (a.name.includes('支付宝') || a.name.includes('花呗'))) || accounts.find(a => a.id === 'acc-2');
    targetAccId = alipayAcc?.id || 'acc-2';
  } else if (isWechat) {
    const wxAcc = accounts.find(a => a.name && (a.name.includes('微信') || a.name.includes('零钱'))) || accounts.find(a => a.id === 'acc-1');
    targetAccId = wxAcc?.id || 'acc-1';
  } else if (isBank) {
    const bankAcc = accounts.find(a => a.type === 'bank' || a.id === 'acc-3');
    targetAccId = bankAcc?.id || 'acc-3';
  }

  // 3. WeChat Daily Report (Bottom Up)
  if (!amount && rawClean.includes('微信记账本') && (rawClean.includes('记账日报') || rawClean.includes('昨日总支出'))) {
    for (let i = allLines.length - 1; i >= 0; i--) {
      const l = allLines[i];
      if (l.includes('总支出') || l.includes('日报')) continue;
      const m = l.match(/(.+?)\s*[-－¥￥$]\s*(\d+\.\d{1,2})/);
      if (m) {
        merchant = cleanMerchantName(m[1]);
        amount = parseFloat(m[2]);
        break;
      }
    }
  }

  // 4. Specialized Check: Bank SMS text (【招商银行】等)
  if (!amount) {
    const smsMatch = rawClean.match(/(?:支出|消费|扣款|转出|付款|人民币|RMB|支出\(消费\))\s*(?:人民币|RMB|[¥￥$])?\s*(\d+(?:\.\d{1,2})?)\s*元?/i);
    if (smsMatch && !rawClean.includes('服务消息') && !rawClean.includes('支付消息') && !rawClean.includes('账单详情')) {
      amount = parseFloat(smsMatch[1]);
      const atMatch = rawClean.match(/在\s*[【\[]?([^】\]\n\r]+?)[】\]]?\s*(?:消费|支出|扣款|快捷)/);
      if (atMatch) {
        merchant = cleanMerchantName(atMatch[1]);
      } else {
        const bankNameMatch = rawClean.match(/【([^】]+)】/);
        if (bankNameMatch) merchant = cleanMerchantName(bankNameMatch[1]);
      }
    }
  }

  // 5. Specialized Check: Food delivery / E-commerce Order Detail (e.g. 淘宝闪购 / 饿了么 / 美团实付)
  if (!amount) {
    const paidMatch = rawClean.match(/(?:实付|合计|应付|总计|实收款|实付款)\s*[:：]?\s*[¥￥$]?\s*(\d+(?:\.\d{1,2})?)/);
    if (paidMatch) {
      amount = parseFloat(paidMatch[1]);
      if (!merchant) {
        for (const line of allLines) {
          if (line.includes('闪购') || line.includes('生鲜') || line.includes('生活服务') || (line.includes('店') && !line.includes('设置') && !line.includes('订单') && !line.includes('备注'))) {
            merchant = cleanMerchantName(line);
            break;
          }
        }
      }
    }
  }

  // 6. Specialized Check: Alipay Payment Messages List (支付消息列表 - 识别第一条最新付款)
  if (!amount && (rawClean.includes('支付消息') || rawClean.includes('服务消息') || rawClean.includes('付款成功') || rawClean.includes('支付成功'))) {
    const validLines: string[] = [];
    for (let idx = 0; idx < allLines.length; idx++) {
      const l = allLines[idx];
      // Skip top monthly stat bars
      if (l.includes('统计支出') || l.includes('本月支出') || l.includes('大额消费') || l.includes('自动扣款') || l.includes('分期付款')) {
        continue;
      }
      if (l.includes('服务消息') || l.includes('支付消息')) {
        continue;
      }
      validLines.push(l);
    }

    // Find the FIRST "付款成功" / "支付成功" / "扣款成功" from top to bottom
    for (let i = 0; i < validLines.length; i++) {
      const line = validLines[i];
      if (line === '付款成功' || line.includes('付款成功') || line === '支付成功' || line.includes('支付成功') || line.includes('付款金额') || line.includes('扣款金额')) {
        // Amount is immediately below
        for (let j = i; j <= Math.min(validLines.length - 1, i + 2); j++) {
          const amtM = validLines[j].match(/[¥￥$]?\s*(\d+\.\d{1,2})/);
          if (amtM) {
            amount = parseFloat(amtM[1]);
            break;
          }
        }
        // Merchant is immediately above
        if (!merchant) {
          for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
            const prev = validLines[k];
            if (!prev.includes('PM') && !prev.includes('AM') && !prev.includes(':') && !prev.includes('昨天') && !prev.includes('今天') && !prev.includes('支付成功') && !prev.includes('付款成功') && !prev.includes('扣款成功') && !prev.includes('行程结束') && !prev.includes('微信记账本') && !prev.includes('微信支付') && !prev.includes('时长') && !prev.includes('分钟') && prev.length > 1) {
              merchant = cleanMerchantName(prev);
              break;
            }
          }
        }
        if (amount > 0) break;
      }
    }
  }

  // 7. Specialized Check: Alipay / WeChat Bill Detail Page (单笔账单详情)
  if (!amount && (rawClean.includes('账单详情') || rawClean.includes('商品说明') || rawClean.includes('账单分类'))) {
    const productDescMatch = rawClean.match(/商品说明\s*([^\n\r]+)/);
    if (productDescMatch) {
      merchant = cleanMerchantName(productDescMatch[1]);
    }

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const match = line.match(/^[-－]?\s*[¥￥$]?\s*(\d+\.\d{1,2})$/);
      if (match) {
        amount = parseFloat(match[1]);
        if (!merchant && i > 0) {
          merchant = cleanMerchantName(allLines[i - 1]);
        }
        break;
      }
    }

    const catMatch = rawClean.match(/账单分类\s*([^\n\r>]+)/);
    if (catMatch) {
      const rawCat = catMatch[1].trim();
      if (/餐饮/.test(rawCat)) category = '餐饮美食';
      else if (/百货|超市/.test(rawCat)) category = '日用百货';
      else if (/交通|出行/.test(rawCat)) category = '交通出行';
      else if (/购物/.test(rawCat)) category = '购物消费';
    }

    const timeMatch = rawClean.match(/支付时间\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)/);
    if (timeMatch) {
      date = timeMatch[1].substring(0, 16);
    }
  }

  // 8. Fallback: Search for any valid amount
  if (!amount) {
    for (let i = 0; i < allLines.length; i++) {
      const l = allLines[i];
      if (l.includes('积分') || l.includes('订单号') || l.includes('预计') || l.includes(':') || l.length > 15) continue;
      const m = l.match(/(?:[¥￥$]\s*|[-－]\s*)?(\d+\.\d{1,2})/);
      if (m) {
        const val = parseFloat(m[1]);
        if (val > 0 && val < 1000000) {
          amount = val;
          if (!merchant && i > 0) {
            merchant = cleanMerchantName(allLines[i - 1]);
          }
          break;
        }
      }
    }
  }

  if (!merchant || merchant === '日常消费' || merchant === '消费' || merchant === '支付成功' || merchant === '付款成功' || merchant === '商户消费' || merchant === '快车' || merchant === '美团平台商户' || merchant === '淘宝平台商户' || merchant === '支付宝消费' || merchant === '微信商户消费' || merchant.includes('分钟') || merchant === '行程结束') {
    const brands = [
      "铁路12306", "中国铁路", "12306", "中国石化", "中国电信", "中国移动", "中国联通", "万亩良田生鲜超市", "万亩良田", "抖音生活服务", 
      "清口清汤面", "老乡鸡", "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", 
      "海底捞火锅", "海底捞", "喜茶", "霸王茶姬", "茶百道", "蜜雪冰城", "美团外卖", "美团", "饿了么", 
      "滴滴出行", "滴滴", "曹操出行", "T3出行", "哈啰单车", "哈啰", "淘宝闪购", "淘宝", "天猫", "京东商城", "京东", "拼多多", "盒马鲜生", "盒马", "山姆会员商店", "山姆", "全家便利店", "全家", "FamilyMart", "永辉超市", "生鲜超市"
    ];
    for (const b of brands) {
      if (rawClean.includes(b)) {
        merchant = cleanMerchantName(b);
        break;
      }
    }
  }

  if (!category) {
    category = suggestCategory(merchant, rawClean);
  }

  return {
    amount,
    merchant: merchant || (isAlipay ? '支付宝消费' : '微信商户消费'),
    category,
    date,
    accountId: targetAccId
  };
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
