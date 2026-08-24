// Test enhanced smsParser logic
function getLocalDateTimeString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function parseRelativeDate(text) {
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

const mockAccounts = [
  { id: 'acc-1', name: '微信零钱/零钱通', type: 'wallet' },
  { id: 'acc-2', name: '支付宝/余额宝', type: 'wallet' },
  { id: 'acc-3', name: '主要银行储蓄卡', type: 'bank', card_last4: '9527', bank_name: '招商银行' },
  { id: 'acc-4', name: '信用卡账户', type: 'credit' }
];

function testParse(raw, accounts = mockAccounts) {
  // 1. WeChat Pay rule
  if (/微信支付|微信支付凭证/.test(raw)) {
    const amtMatch = raw.match(/[¥￥]\s*([\d,]+\.?\d*)/);
    const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;
    
    // Extract merchant cleanly stopping before 付款方式
    let merchant = "微信商户消费";
    const mMatch = raw.match(/商户名称[:：]\s*([^付款方式\n\r]+?)(?=\s*付款方式|$)/);
    if (mMatch) merchant = mMatch[1].trim();

    // Extract payment channel
    let matchedAcc = accounts.find(a => a.name.includes('微信'));
    const payMatch = raw.match(/付款方式[:：]\s*([^\n\r]+)/);
    if (payMatch) {
      const payStr = payMatch[1];
      const foundCard = accounts.find(a => payStr.includes(a.card_last4 || '___') || payStr.includes(a.bank_name || '___') || (payStr.includes('信用卡') && a.type === 'credit'));
      if (foundCard) matchedAcc = foundCard;
    }

    return {
      amount,
      merchant,
      category: "餐饮美食",
      date: getLocalDateTimeString(),
      account: matchedAcc?.name
    };
  }

  // 2. Natural language one-liner
  const amtMatch = raw.match(/[¥￥\$]\s*(\d+(?:\.\d+)?)/) || raw.match(/(\d+(?:\.\d+)?)\s*(?:元|块)/);
  if (amtMatch) {
    const amount = parseFloat(amtMatch[1]);
    
    // Extract merchant: e.g. "在朱富贵吃了" -> "朱富贵"
    let merchant = "日常消费";
    const locMatch = raw.match(/在\s*([^在吃了去买到的\s,，。]+?)\s*(?:吃了|喝了|买|消费|花费|点|付)/);
    if (locMatch) {
      merchant = locMatch[1].trim();
    }

    // Category
    let category = "餐饮美食";
    if (/吃了|喝了|饭|火锅|烧烤|咖啡|奶茶|餐厅|美食/.test(raw + merchant)) category = "餐饮美食";
    else if (/超市|生鲜|便利店|日用|百货|良田/.test(raw + merchant)) category = "日用百货";
    else if (/打车|出行|滴滴|加油|车/.test(raw + merchant)) category = "交通出行";

    // Account
    let matchedAcc = accounts[0];
    if (/信用卡|刷卡/.test(raw)) {
      const found = accounts.find(a => a.type === 'credit' || a.name.includes('信用卡'));
      if (found) matchedAcc = found;
    } else if (/支付宝|花呗|余额宝/.test(raw)) {
      const found = accounts.find(a => a.name.includes('支付宝') || a.id === 'acc-2');
      if (found) matchedAcc = found;
    } else if (/微信|零钱/.test(raw)) {
      const found = accounts.find(a => a.name.includes('微信') || a.id === 'acc-1');
      if (found) matchedAcc = found;
    }

    return {
      amount,
      merchant,
      category,
      date: parseRelativeDate(raw),
      account: matchedAcc?.name
    };
  }
}

console.log("Test Case 1 (WeChat Pay Luckin):");
console.log(testParse("微信支付：微信支付凭证 商户消费 ¥68.50 商户名称: 瑞幸咖啡 付款方式: 招商银行储蓄卡(9527)"));

console.log("\nTest Case 2 (Zhu Fugui Restaurant):");
console.log(testParse("昨晚在朱富贵吃了¥210用信用卡"));
