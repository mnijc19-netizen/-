import { parseSmsOrTextInBrowser, getLocalDateTimeString } from './smsParser';
import { localStore } from './localStore';
import { api } from '../api/client';
import { Transaction } from '../types';
import { parseWithAi } from './aiParser';

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

  // Filter out status / payment channel sentences from being treated as merchants
  const noisePhrases = [
    "通过零钱扣款", "通过微信支付扣款", "通过银行卡扣款", "使用零钱支付", "零钱扣款", "零钱支付", "通过零钱",
    "先用后付订单已完成", "已自动支付", "自动扣款", "免密支付", "快捷支付", "按时支付",
    "记入微信支付分记录", "交易详情", "查看商家订单", "物流及商品详情", "管理扣费服务",
    "订单已完成", "扣款成功", "付款成功", "支付成功", "微信记账本", "微信支付"
  ];
  for (const phrase of noisePhrases) {
    if (s === phrase || (s.includes(phrase) && !s.includes('拼多多') && !s.includes('淘宝') && !s.includes('美团') && !s.includes('京东'))) {
      s = '';
      break;
    }
  }

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
  if (raw.includes('寻梦') || raw.includes('拼多多')) return '拼多多';
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
  const m = (merchant || '').toLowerCase();
  const combined = (merchant + ' ' + fullText).toLowerCase();

  // 1. Medical & Healthcare (Highest priority - catches pharmacy, medicine, hospital)
  if (/医|药|诊所|医院|体检|健康|牙科|口腔|同仁堂|老百姓|大参林|益丰|国大|海王星辰|叮当|博爱|卫生院|门诊|药房|药业|药堂/.test(combined)) return '医疗健康';

  // 2. Transport & Travel
  if (/滴滴|打车|出租车|地铁|公交|高铁|火车|机票|加油|中石化|中石油|停车|高速|出行|交通|12306|etc/.test(combined)) return '交通出行';

  // 3. Living Utilities & Telecommunications
  if (/电信|移动|联通|话费|充值|宽带|水费|电费|燃气|物业|房租|生活缴费|国家电网/.test(combined)) return '住房物业';

  // 4. Food & Dining
  if (/餐饮|美食|清汤面|面|饭|餐|吃|外卖|美团|饿了么|麦当劳|肯德基|汉堡|火锅|烧烤|牛肉|海鲜|咖啡|奶茶|茶|霸王茶姬|星巴克|瑞幸|喜茶|早餐|午餐|晚餐|夜宵|甜品|小吃|炸鸡|酒楼|快餐|蜜雪冰城|古茗/.test(combined)) return '餐饮美食';

  // 5. Groceries & Daily Needs
  if (/生鲜|超市|便利店|百货|水果|良田|菜市|日用|屈臣氏|全家|罗森|7-eleven|便利蜂|永辉|盒马|山姆|大润发|名创优品/.test(combined)) return '日用百货';

  // 6. Shopping & Ecommerce
  if (/淘宝|天猫|京东|拼多多|唯品会|服装|衣服|鞋|包|数码|手机|电脑|电器|饰品|闪购|购物|商场|专柜|优衣库|apple|小米|得物|闲鱼/.test(combined)) return '购物消费';

  // 7. Entertainment & Leisure
  if (/电影|影城|ktv|酒吧|网吧|游戏|steam|充值|门票|旅游|休闲|娱乐|剧本杀|密室|演唱会/.test(combined)) return '休闲娱乐';

  // 8. Safe default to known category in database
  return '日用百货';
}

export function parseTransactionDateTime(text: string): string | null {
  if (!text) return null;
  const now = new Date();
  const currentYear = now.getFullYear();

  // Pattern 1: Standard YYYY-MM-DD HH:mm:ss or YYYY/MM/DD HH:mm
  const fullMatch = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (fullMatch) {
    const y = fullMatch[1];
    const m = fullMatch[2].padStart(2, '0');
    const d = fullMatch[3].padStart(2, '0');
    const hh = fullMatch[4].padStart(2, '0');
    const mm = fullMatch[5].padStart(2, '0');
    const ss = (fullMatch[6] || '00').padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }

  let extractedMonth = '';
  let extractedDay = '';
  let extractedHour = '';
  let extractedMinute = '';

  // Extract Month & Day (e.g. 8月23日, 8月18日)
  const mdMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (mdMatch) {
    extractedMonth = mdMatch[1].padStart(2, '0');
    extractedDay = mdMatch[2].padStart(2, '0');
  } else if (text.includes('昨天')) {
    const target = new Date();
    target.setDate(target.getDate() - 1);
    extractedMonth = String(target.getMonth() + 1).padStart(2, '0');
    extractedDay = String(target.getDate()).padStart(2, '0');
  } else if (text.includes('前天')) {
    const target = new Date();
    target.setDate(target.getDate() - 2);
    extractedMonth = String(target.getMonth() + 1).padStart(2, '0');
    extractedDay = String(target.getDate()).padStart(2, '0');
  }

  // Extract Time (e.g. 下午10:51, 上午9:08, 18:54)
  const timeMatch = text.match(/(上午|下午|晚上|中午|凌晨)?\s*(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const ampm = timeMatch[1] || '';
    let hour = parseInt(timeMatch[2], 10);
    const minute = timeMatch[3].padStart(2, '0');
    if ((ampm === '下午' || ampm === '晚上') && hour < 12) {
      hour += 12;
    } else if ((ampm === '凌晨' || ampm === '上午') && hour === 12) {
      hour = 0;
    }
    extractedHour = String(hour).padStart(2, '0');
    extractedMinute = minute;
  }

  if (extractedMonth && extractedDay && extractedHour && extractedMinute) {
    return `${currentYear}-${extractedMonth}-${extractedDay} ${extractedHour}:${extractedMinute}:00`;
  } else if (extractedMonth && extractedDay) {
    return `${currentYear}-${extractedMonth}-${extractedDay} 12:00:00`;
  } else if (extractedHour && extractedMinute) {
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${currentYear}-${m}-${d} ${extractedHour}:${extractedMinute}:00`;
  }

  return null;
}

export function extractFromRawText(text: string, accounts: any[] = []): { amount: number; merchant: string; category: string; date?: string; accountId?: string } {
  if (!text) return { amount: 0, merchant: '日常消费', category: '日常消费' };
  
  const rawClean = text.replace(/[\r\n]+/g, '\n').trim();
  const allLines = rawClean.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = 0;
  let merchant = '';
  let category = '';
  let date = parseTransactionDateTime(rawClean) || '';
  let targetAccId: string | undefined;

  // 1. Explicit merchant prefix extraction
  const explicitMerchantMatch = rawClean.match(/(?:商户名称|交易对方|收款方|收款人|商家|交易商户|店铺名称|商户|收款方全称)[:：]\s*([^\n\r]+)/);
  if (explicitMerchantMatch) {
    merchant = cleanMerchantName(explicitMerchantMatch[1]);
  }

  // 2. Channel Detection via robust scoring
  const isAlipay = /支付宝|花呗|借呗|余额宝|蚂蚁|全部账单|账单详情|支付奖励|淘|闪购|蜂鸟|饿了么/.test(rawClean);
  const isWechat = /微信支付|微信记账本|使用零钱支付|零钱通|微信/.test(rawClean);
  const isBank = /招商银行|工商银行|建设银行|农业银行|中国银行|交通银行|信用卡|储蓄卡|云闪付|银联/.test(rawClean);

  if (isAlipay) {
    const alipayAcc = accounts.find(a => a.name && (a.name.includes('支付宝') || a.name.includes('花呗'))) || accounts.find(a => a.id === 'acc-2');
    targetAccId = alipayAcc?.id || 'acc-2';
  } else if (isWechat) {
    const wxAcc = accounts.find(a => a.name && (a.name.includes('微信') || a.name.includes('零钱'))) || accounts.find(a => a.id === 'acc-1');
    targetAccId = wxAcc?.id || 'acc-1';
  } else if (isBank) {
    const bankAcc = accounts.find(a => a.type === 'bank' || a.name.includes('银行') || a.name.includes('卡'));
    targetAccId = bankAcc?.id || accounts[0]?.id || 'acc-1';
  }

  // 2.5 Priority 1: 实付金额 / 实付款 / 净实付款 / 优惠后实付 (e.g. 云闪付、美团、抖音、淘宝)
  const paidMatch = rawClean.match(/(?:实付金额|实付款|实付|净支付|净额|已扣款|实收款)[:：]?\s*[¥￥$]?\s*(\d+(?:\.\d{1,2})?)/);
  if (paidMatch) {
    amount = parseFloat(paidMatch[1]);
  }

  // 2.6 Priority 2: Bank SMS format (在[商户]消费/支出人民币[金额]元)
  if (!amount) {
    const smsMatch = rawClean.match(/(?:消费|支出|支出人民币|扣款|人民币|支付)[:：]?\s*[¥￥$]?\s*(\d+(?:\.\d{1,2})?)\s*元/);
    if (smsMatch && !rawClean.includes('服务消息') && !rawClean.includes('支付消息')) {
      amount = parseFloat(smsMatch[1]);
      if (!merchant) {
        const atMatch = rawClean.match(/在\s*[【\[]?([^】\]\n\r，,。\s]{2,25})[】\]]?\s*(?:刷卡|快捷|网银|扫码|消费|支出|扣款)/);
        if (atMatch) merchant = cleanMerchantName(atMatch[1]);
      }
    }
  }

  // 2.7 Priority 3: Negative / Positive bill header (e.g. -14.05, -168.50, ¥458.20, ￥15.00)
  if (!amount) {
    for (const l of allLines) {
      const m = l.match(/^[-－]?\s*[¥￥$]\s*(\d+\.\d{1,2})$/) || l.match(/^[-－]\s*(\d+\.\d{1,2})$/);
      if (m) {
        amount = parseFloat(m[1]);
        break;
      }
    }
  }

  // 2.8 Priority 4: Payment Card / Auto-Debit / Single Transaction (Bottom-Up, e.g. ·14.90, ·7.90)
  if (!amount) {
    for (let i = allLines.length - 1; i >= 0; i--) {
      const line = allLines[i];
      if (line.includes('使用零钱支付') || line.includes('零钱支付') || line.includes('零钱扣款') || line.includes('扣款') || line.includes('付款成功') || line.includes('支付成功') || line.includes('自动支付') || line.includes('订单已完成') || line.includes('交易成功') || line.includes('充值成功') || line.includes('刷卡消费')) {
        for (let j = i; j < Math.min(allLines.length, i + 4); j++) {
          const m = allLines[j].match(/(?:[·•・¥￥$]\s*|[-－]\s*)?(\d+\.\d{1,2})/);
          if (m && !allLines[j].includes('共') && !allLines[j].includes('已支出') && !allLines[j].includes('已入账') && !allLines[j].includes(':') && !allLines[j].includes('月')) {
            amount = parseFloat(m[1]);
            break;
          }
        }
        if (!merchant) {
          for (let k = i - 1; k >= Math.max(0, i - 5); k--) {
            const p = allLines[k];
            if (!p.includes('星期') && !p.includes(':') && !p.includes('>') && !p.includes('日报') && !p.includes('微信') && !p.includes('支出') && !p.includes('入账') && !p.includes('统计') && !p.includes('管理') && !p.includes('扣费') && p.length > 1) {
              merchant = cleanMerchantName(p);
              break;
            }
          }
        }
        if (amount > 0) break;
      }
    }
  }

  // 3. Known Brands Fallback
  if (!merchant || merchant === '日常消费' || merchant === '消费' || merchant === '支付成功' || merchant === '付款成功' || merchant === '商户消费' || merchant === '快车' || merchant === '美团平台商户' || merchant === '淘宝平台商户' || merchant === '支付宝消费' || merchant === '微信商户消费' || merchant.includes('分钟') || merchant === '行程结束' || merchant.startsWith('￥') || merchant.startsWith('¥')) {
    const brands = [
      "铁路12306", "中国铁路", "12306", "中国石化", "中国电信", "中国移动", "中国联通", "万亩良田生鲜超市", "万亩良田", "抖音生活服务", "抖音商城", "三只松鼠旗舰店", "三只松鼠",
      "清口清汤面", "老乡鸡", "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "luckincoffee", "星巴克", 
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

      // 1. Try AI Large Model Parser first if configured
      const aiConfig = localStore.getAiConfig();
      if (aiConfig.enabled && aiConfig.apiKey && aiConfig.apiKey.trim()) {
        try {
          const aiResult = await parseWithAi(decoded, accounts);
          if (aiResult && typeof aiResult.amount === 'number' && aiResult.amount > 0) {
            return await saveAndReturn(
              aiResult.amount,
              aiResult.merchant || '智能记账商户',
              `✨ 经由 ${aiConfig.model || 'AI'} 智能高精识别`,
              aiResult.type || 'expense',
              aiResult.suggested_category,
              aiResult.matched_account_id
            );
          }
        } catch (err) {
          console.warn('AI Parsing failed, falling back to local rule engine:', err);
        }
      }

      // 2. Fallback to local high-precision rule parser
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
