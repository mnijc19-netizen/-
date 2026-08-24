import { ParsedTransactionResult } from '../types';

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "餐饮美食": ["美团", "饿了么", "外卖", "饭", "咖啡", "麦当劳", "肯德基", "星巴克", "瑞幸", "火锅", "奶茶", "海底捞", "喜茶", "烤肉", "面馆", "早点", "午餐", "晚餐", "餐厅", "小吃", "烘焙", "面包", "茶百道", "霸王茶姬"],
  "交通出行": ["滴滴", "打车", "地铁", "公交", "高铁", "加油", "停车", "12306", "交通", "机票", "航空", "车费", "高速", "ETC", "顺风车", "神州", "T3出行", "曹操", "充电桩", "汽油"],
  "日用百货": ["超市", "便利店", "日用", "百货", "纸巾", "洗护", "永辉", "大润发", "屈臣氏", "盒马", "山姆", "全家", "7-Eleven", "罗森", "名创优品", "农贸市场", "菜市场"],
  "购物消费": ["淘宝", "京东", "天猫", "拼多多", "唯品会", "网购", "商城", "服装", "鞋", "数码", "手机", "电脑", "专柜", "优衣库", "Apple", "小米", "得物"],
  "住房物业": ["房租", "水电", "燃气", "物业", "宽带", "电费", "水费", "自来水", "国家电网", "租金", "暖气", "家政", "保洁"],
  "休闲娱乐": ["电影", "游戏", "Steam", "腾讯视频", "爱奇艺", "Bilibili", "网易云", "Spotify", "旅游", "门票", "剧本杀", "密室", "KTV", "酒吧", "影城", "Switch", "PlayStation", "演唱会"],
  "医疗健康": ["医院", "药店", "门诊", "挂号", "体检", "药房", "诊所", "同仁堂", "医保", "牙科", "眼科", "药品"],
  "数码科技": ["App Store", "Google", "云服务", "阿里云", "腾讯云", "软件", "订阅", "OpenAI", "ChatGPT", "iCloud"],
  "金融还款": ["信用卡还款", "还款", "房贷", "车贷", "微粒贷", "借呗", "花呗还款", "白条还款", "分期"],
  "工资收入": ["工资", "薪水", "薪资", "奖金", "代发工资", "劳务报酬", "年终奖", "分红", "津贴"],
  "理财投资": ["基金", "理财", "股票", "分红", "利息", "证券", "余额宝收益", "理财通", "结息"]
};

export function suggestCategory(merchant: string, text: string): string {
  const combined = `${merchant || ''} ${text}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) {
        return cat;
      }
    }
  }
  return "日用百货";
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

  // 1. Check Bank Rules
  // CMB: 【招商银行】您账户9527于08月25日14:30在美团消费支出人民币58.00元，余额12345.67元
  const cmbMatch = raw.match(/【招商银行】.*?账户(\d{4}).*?于([\d月日: \-]+)在([^消费支出]+?)消费支出(?:人民币)?([\d,]+\.?\d*)元/);
  if (cmbMatch) {
    const cardLast4 = cmbMatch[1];
    const dateStr = cmbMatch[2];
    const merchant = cmbMatch[3];
    const amount = parseFloat(cmbMatch[4].replace(/,/g, ''));
    const balMatch = raw.match(/余额\s*[:：]?\s*(?:[¥￥]|人民币)?\s*([\d,]+\.?\d*)/);
    const balanceAfter = balMatch ? parseFloat(balMatch[1].replace(/,/g, '')) : undefined;

    const matchedAcc = accountsLookup.find(a => a.card_last4 === cardLast4 || a.name.includes('招商'));

    return {
      success: true,
      confidence: 0.95,
      type: "expense",
      amount,
      card_last4: cardLast4,
      bank_or_channel: "招商银行",
      merchant: merchant.trim(),
      suggested_category: suggestCategory(merchant, raw),
      date: new Date().toISOString().substring(0, 10) + ' ' + (dateStr.includes(':') ? dateStr.split('日')[1] || '12:00' : '12:00'),
      balance_after: balanceAfter,
      raw_text: raw,
      matched_rule: "招行消费支出",
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name,
      note: `来源: 招商银行短信`
    };
  }

  // ICBC: 【工商银行】您尾号8888卡于8月25日12:00消费支出500.00元
  const icbcMatch = raw.match(/【工商银行】.*?尾号(\d{4})卡于([\d月日: \-]+).*?(?:消费)?支出([\d,]+\.?\d*)元/);
  if (icbcMatch) {
    const cardLast4 = icbcMatch[1];
    const amount = parseFloat(icbcMatch[3].replace(/,/g, ''));
    const matchedAcc = accountsLookup.find(a => a.card_last4 === cardLast4 || a.name.includes('工商'));

    return {
      success: true,
      confidence: 0.95,
      type: "expense",
      amount,
      card_last4: cardLast4,
      bank_or_channel: "工商银行",
      merchant: "工行快捷消费",
      suggested_category: suggestCategory("", raw),
      date: new Date().toISOString().substring(0, 16).replace('T', ' '),
      raw_text: raw,
      matched_rule: "工行消费支出",
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name
    };
  }

  // WeChat Pay: 微信支付：微信支付凭证 商户消费 ¥68.50 商户名称: 瑞幸咖啡
  const wxMatch = raw.match(/(?:微信支付|微信支付凭证).*?[¥￥]([\d,]+\.?\d*)/);
  if (wxMatch) {
    const amount = parseFloat(wxMatch[1].replace(/,/g, ''));
    const mMatch = raw.match(/商户名称[:：]\s*([^\n\r]+)/);
    const merchant = mMatch ? mMatch[1].trim() : "微信商户消费";
    const matchedAcc = accountsLookup.find(a => a.name.includes('微信') || a.type === 'wallet');

    return {
      success: true,
      confidence: 0.95,
      type: "expense",
      amount,
      bank_or_channel: "微信支付",
      merchant,
      suggested_category: suggestCategory(merchant, raw),
      date: new Date().toISOString().substring(0, 16).replace('T', ' '),
      raw_text: raw,
      matched_rule: "微信支付凭证",
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name
    };
  }

  // Alipay: 支付宝：您在【淘宝天猫】通过余额宝成功付款88.00元
  const aliMatch = raw.match(/支付宝.*?(?:在[【\[]([^】\]]+)[】\]])?.*?(?:成功付款|支付|消费)\s*(?:[¥￥])?([\d,]+\.?\d*)/);
  if (aliMatch) {
    const merchant = aliMatch[1] || "淘宝天猫消费";
    const amount = parseFloat(aliMatch[2].replace(/,/g, ''));
    const matchedAcc = accountsLookup.find(a => a.name.includes('支付宝') || a.type === 'wallet');

    return {
      success: true,
      confidence: 0.95,
      type: "expense",
      amount,
      bank_or_channel: "支付宝",
      merchant,
      suggested_category: suggestCategory(merchant, raw),
      date: new Date().toISOString().substring(0, 16).replace('T', ' '),
      raw_text: raw,
      matched_rule: "支付宝付款通知",
      matched_account_id: matchedAcc?.id,
      matched_account_name: matchedAcc?.name
    };
  }

  // Fallback: Natural language one-liner (如: 昨晚在海底捞吃了320招行卡)
  const amtMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:元|块|RMB|rmb|￥|¥)/) || raw.match(/[¥￥\$]\s*(\d+(?:\.\d+)?)/) || raw.match(/(\d+(?:\.\d+)?)/);
  if (amtMatch) {
    const amount = parseFloat(amtMatch[1]);
    let transType: any = "expense";
    if (/收入|入账|收到|工资|收款|分红|奖金/.test(raw)) transType = "income";
    else if (/还款|还信用卡|还房贷/.test(raw)) transType = "repayment";
    else if (/转账|互转/.test(raw)) transType = "transfer";

    let merchant = "日常消费";
    for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
      for (const kw of keywords) {
        if (raw.includes(kw)) {
          merchant = kw;
          break;
        }
      }
      if (merchant !== "日常消费") break;
    }

    return {
      success: true,
      confidence: 0.8,
      type: transType,
      amount,
      bank_or_channel: "智能提取",
      merchant,
      suggested_category: suggestCategory(merchant, raw),
      date: new Date().toISOString().substring(0, 16).replace('T', ' '),
      raw_text: raw,
      matched_rule: "NLP自然语言提取",
      note: `由智能文本识别生成`
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
