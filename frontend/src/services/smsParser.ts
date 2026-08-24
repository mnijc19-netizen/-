import { ParsedTransactionResult } from '../types';

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "餐饮美食": ["美团", "饿了么", "外卖", "饭", "咖啡", "麦当劳", "肯德基", "星巴克", "瑞幸", "火锅", "奶茶", "海底捞", "喜茶", "烤肉", "面馆", "早点", "午餐", "晚餐", "餐厅", "小吃", "烘焙", "面包", "茶百道", "霸王茶姬", "吃", "喝", "酒", "聚餐"],
  "交通出行": ["滴滴", "打车", "地铁", "公交", "高铁", "加油", "停车", "12306", "交通", "机票", "航空", "车费", "高速", "ETC", "顺风车", "神州", "T3出行", "曹操", "充电桩", "汽油"],
  "日用百货": ["超市", "便利店", "日用", "百货", "纸巾", "洗护", "永辉", "大润发", "屈臣氏", "盒马", "山姆", "全家", "7-Eleven", "罗森", "名创优品", "农贸市场", "菜市场", "生鲜"],
  "购物消费": ["淘宝", "京东", "天猫", "拼多多", "唯品会", "网购", "商城", "服装", "鞋", "数码", "手机", "电脑", "专柜", "优衣库", "Apple", "小米", "得物"],
  "住房物业": ["房租", "水电", "燃气", "物业", "宽带", "电费", "水费", "自来水", "国家电网", "租金", "暖气", "家政", "保洁"],
  "休闲娱乐": ["电影", "游戏", "Steam", "腾讯视频", "爱奇艺", "Bilibili", "网易云", "Spotify", "旅游", "门票", "剧本杀", "密室", "KTV", "酒吧", "影城", "Switch", "PlayStation", "演唱会"],
  "医疗健康": ["医院", "药店", "门诊", "挂号", "体检", "药房", "诊所", "同仁堂", "医保", "牙科", "眼科", "药品"],
  "数码科技": ["App Store", "Google", "云服务", "阿里云", "腾讯云", "软件", "订阅", "OpenAI", "ChatGPT", "iCloud"],
  "金融还款": ["信用卡还款", "还款", "房贷", "车贷", "微粒贷", "借呗", "花呗还款", "白条还款", "分期"],
  "工资收入": ["工资", "薪水", "薪资", "奖金", "代发工资", "劳务报酬", "年终奖", "分红", "津贴"],
  "理财投资": ["基金", "理财", "股票", "分红", "利息", "证券", "余额宝收益", "理财通", "结息"]
};

export function getLocalDateTimeString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function parseRelativeDate(text: string): string {
  const now = new Date();
  if (text.includes('昨晚') || text.includes('昨天晚上')) {
    const d = new Date(now.getTime() - 86400000);
    d.setHours(20, 0, 0, 0);
    return getLocalDateTimeString(d);
  }
  if (text.includes('昨天') || text.includes('昨日')) {
    const d = new Date(now.getTime() - 86400000);
    return getLocalDateTimeString(d);
  }
  if (text.includes('前天')) {
    const d = new Date(now.getTime() - 2 * 86400000);
    return getLocalDateTimeString(d);
  }
  return getLocalDateTimeString(now);
}

export function suggestCategory(merchant: string, text: string): string {
  const combined = `${merchant || ''} ${text}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) {
        return cat;
      }
    }
  }
  return "餐饮美食";
}

export function parseSmsOrTextInBrowser(text: string, accountsLookup: any[] = []): ParsedTransactionResult {
  if (!text || !text.trim()) {
    return {
      success: false,
      confidence: 0,
      type: "expense",
      amount: 0,
      raw_text: text,
      note: "内容为空"
    };
  }

  const raw = text.trim();

  // 1. Check Bank Rules (CMB)
  const cmbMatch = raw.match(/【招商银行】.*?账户(\d{4}).*?于([\d月日: \-]+)在([^消费支出]+?)消费支出(?:人民币)?([\d,]+\.?\d*)元/);
  if (cmbMatch) {
    const cardLast4 = cmbMatch[1];
    const merchant = cmbMatch[3];
    const amount = parseFloat(cmbMatch[4].replace(/,/g, ''));
    const balMatch = raw.match(/余额\s*[:：]?\s*(?:[¥￥]|人民币)?\s*([\d,]+\.?\d*)/);
    const balanceAfter = balMatch ? parseFloat(balMatch[1].replace(/,/g, '')) : undefined;

    const matchedAcc = accountsLookup.find(a => a.card_last4 === cardLast4 || a.name.includes('招商') || a.type === 'bank');

    return {
      success: true,
      confidence: 0.95,
      type: "expense",
      amount,
      card_last4: cardLast4,
      bank_or_channel: "招商银行",
      merchant: merchant.trim(),
      suggested_category: suggestCategory(merchant, raw),
      date: getLocalDateTimeString(),
      balance_after: balanceAfter,
      raw_text: raw,
      matched_rule: "招行消费支出",
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name,
      note: `来源: 招商银行短信`
    };
  }

  // 2. ICBC
  const icbcMatch = raw.match(/【工商银行】.*?尾号(\d{4})卡于([\d月日: \-]+).*?(?:消费)?支出([\d,]+\.?\d*)元/);
  if (icbcMatch) {
    const cardLast4 = icbcMatch[1];
    const amount = parseFloat(icbcMatch[3].replace(/,/g, ''));
    const matchedAcc = accountsLookup.find(a => a.card_last4 === cardLast4 || a.name.includes('工商') || a.type === 'bank');

    return {
      success: true,
      confidence: 0.95,
      type: "expense",
      amount,
      card_last4: cardLast4,
      bank_or_channel: "工商银行",
      merchant: "工行快捷消费",
      suggested_category: suggestCategory("", raw),
      date: getLocalDateTimeString(),
      raw_text: raw,
      matched_rule: "工行消费支出",
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name
    };
  }

  // 3. WeChat Pay Notification / Voucher
  if (/微信支付|微信支付凭证/.test(raw)) {
    const wxMatch = raw.match(/[¥￥]\s*([\d,]+\.?\d*)/);
    const amount = wxMatch ? parseFloat(wxMatch[1].replace(/,/g, '')) : 0;
    
    // Clean merchant name by stopping before "付款方式"
    let merchant = "微信商户消费";
    const mMatch = raw.match(/商户名称[:：]\s*([^付款方式\n\r]+?)(?=\s*付款方式|$)/);
    if (mMatch) {
      merchant = mMatch[1].replace(/^[Mm]\s+/, '').trim();
    }

    // Match payment account (WeChat Wallet vs Linked Debit/Credit card)
    let matchedAcc = accountsLookup.find(a => a.name.includes('微信') || a.type === 'wallet');
    const payMatch = raw.match(/付款方式[:：]\s*([^\n\r]+)/);
    if (payMatch) {
      const payStr = payMatch[1];
      const foundCard = accountsLookup.find(a => 
        (a.card_last4 && payStr.includes(a.card_last4)) || 
        (a.bank_name && payStr.includes(a.bank_name)) ||
        (payStr.includes('储蓄卡') && a.type === 'bank') ||
        (payStr.includes('信用卡') && a.type === 'credit')
      );
      if (foundCard) matchedAcc = foundCard;
    }

    return {
      success: true,
      confidence: 0.95,
      type: "expense",
      amount,
      bank_or_channel: "微信支付",
      merchant,
      suggested_category: suggestCategory(merchant, raw),
      date: getLocalDateTimeString(),
      raw_text: raw,
      matched_rule: "微信支付凭证",
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name
    };
  }

  // 4. Alipay Notification
  if (/支付宝/.test(raw)) {
    const aliMatch = raw.match(/(?:在[【\[]([^】\]]+)[】\]])?.*?(?:成功付款|支付|消费)\s*(?:[¥￥])?([\d,]+\.?\d*)/);
    const merchant = (aliMatch && aliMatch[1]) ? aliMatch[1] : "支付宝商户消费";
    const amtMatch = raw.match(/[¥￥]?\s*([\d,]+\.?\d*)\s*(?:元|块)?/);
    const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;
    const matchedAcc = accountsLookup.find(a => a.name.includes('支付宝') || a.id === 'acc-2');

    return {
      success: true,
      confidence: 0.95,
      type: "expense",
      amount,
      bank_or_channel: "支付宝",
      merchant,
      suggested_category: suggestCategory(merchant, raw),
      date: getLocalDateTimeString(),
      raw_text: raw,
      matched_rule: "支付宝付款通知",
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name
    };
  }

  // 5. Fallback: Natural language NLP (如: 昨晚在朱富贵吃了¥210用信用卡)
  const amtMatch = raw.match(/[¥￥\$]\s*(\d+(?:\.\d+)?)/) || 
                   raw.match(/(\d+(?:\.\d+)?)\s*(?:元|块|RMB|rmb)/) || 
                   raw.match(/(\d+(?:\.\d{1,2}))/);

  if (amtMatch) {
    const amount = parseFloat(amtMatch[1]);
    let transType: any = "expense";
    if (/收入|入账|收到|工资|收款|分红|奖金/.test(raw)) transType = "income";
    else if (/还款|还信用卡|还房贷/.test(raw)) transType = "repayment";
    else if (/转账|互转/.test(raw)) transType = "transfer";

    // Extract Merchant from location pattern (e.g. 在[商户]吃了/买了/消费了)
    let merchant = "日常消费";
    const locMatch = raw.match(/在\s*([^在吃了去买到的消费花费\s,，。]+?)\s*(?:吃了|喝了|买|消费|花费|聚餐|点|付)/);
    if (locMatch) {
      merchant = locMatch[1].trim();
    } else {
      // Try finding known keyword
      for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
        for (const kw of keywords) {
          if (raw.includes(kw)) {
            merchant = kw;
            break;
          }
        }
        if (merchant !== "日常消费") break;
      }
    }

    // Category
    let category = "餐饮美食";
    if (/生鲜|超市|便利店|百货|水果|良田|菜市|日用/.test(raw + merchant)) category = "日用百货";
    else if (/吃了|喝了|饭|火锅|烧烤|咖啡|奶茶|餐厅|美食|小吃/.test(raw + merchant)) category = "餐饮美食";
    else if (/打车|出行|滴滴|加油|车|地铁|公交/.test(raw + merchant)) category = "交通出行";
    else if (/淘宝|京东|天猫|衣服|鞋|数码|手机/.test(raw + merchant)) category = "购物消费";

    // Match payment account (Credit Card vs Alipay vs WeChat vs Bank)
    let matchedAcc = accountsLookup[0];
    if (/信用卡|刷卡/.test(raw)) {
      const found = accountsLookup.find(a => a.type === 'credit' || a.name.includes('信用卡'));
      if (found) matchedAcc = found;
    } else if (/支付宝|花呗|余额宝/.test(raw)) {
      const found = accountsLookup.find(a => a.name.includes('支付宝') || a.id === 'acc-2');
      if (found) matchedAcc = found;
    } else if (/微信|零钱/.test(raw)) {
      const found = accountsLookup.find(a => a.name.includes('微信') || a.id === 'acc-1');
      if (found) matchedAcc = found;
    }

    return {
      success: true,
      confidence: 0.85,
      type: transType,
      amount,
      bank_or_channel: "NLP自然语言",
      merchant,
      suggested_category: category,
      date: parseRelativeDate(raw),
      raw_text: raw,
      matched_rule: "NLP自然语言提取",
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name,
      note: `由智能自然语言分析生成`
    };
  }

  return {
    success: false,
    confidence: 0.1,
    type: "expense",
    amount: 0,
    raw_text: raw,
    note: "未能识别出有效金额"
  };
}
