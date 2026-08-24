// Let's test WeChat & Alipay real OCR variations
const testCases = [
  {
    name: "WeChat McDonald's",
    text: `5:19 1\n< 47 微信支付\n微信记账本\n记账日报\n8月23日 (周日) 日报\n昨日支出 ¥67.92，共3笔\n昨日入账 ¥30.00，共1笔\n本月统计 8月已支出 ¥2268.63，已入账 ¥5161.30\n点击查看昨日收支明细，还能补充其他收支\n查看明细\n日报设置\n昨天 下午 10:51\nM 麦当劳\n使用零钱支付\n¥ 14.90\n交易详情 >`
  },
  {
    name: "Alipay Supermarket",
    text: `6:40 1\n< 账单详情 全部账单\n万亩良田生鲜超市\n-14.05\n交易成功\n支付时间 2026-08-24 20:51:50\n付款方式 花呗 >\n商品说明 万亩良田(金建店)\n支付奖励 立即领取2积分\n收单机构 上海汇付支付有限公司\n清算机构 中国银联股份有限公司\n收款方全称 福州市仓山区万亩良田贸易商行 (个体工商户)\n更多 v\n账单管理 你因这笔消费解锁了“日用百货”贴纸\n账单分类 日用百货 >\n标签 请选择 >\n为你推荐 超市采买 +\n计入收支\n备注 添加 >`
  }
];

const mockAccounts = [
  { id: 'acc-1', name: '微信零钱/零钱通', type: 'wallet' },
  { id: 'acc-2', name: '支付宝/余额宝', type: 'wallet' },
  { id: 'acc-3', name: '主要银行储蓄卡', type: 'bank' },
  { id: 'acc-4', name: '信用卡账户', type: 'credit' }
];

function smartExtract(text, accounts = mockAccounts) {
  if (!text) return { amount: 0, merchant: '消费', category: '日常消费' };

  const clean = text.replace(/[\r\n]+/g, '\n').trim();
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = 0;
  let merchant = '';
  let category = '';
  let accountId = accounts[0]?.id;

  // 1. Detect Account (Alipay vs WeChat vs Bank)
  const isAlipay = /支付宝|花呗|借呗|余额宝|全部账单|账单详情|支付奖励|收单机构/.test(clean);
  const isWechat = /微信支付|微信记账本|使用零钱支付|零钱通/.test(clean);

  if (isAlipay) {
    const alipayAcc = accounts.find(a => a.name.includes('支付宝') || a.id === 'acc-2');
    if (alipayAcc) accountId = alipayAcc.id;
  } else if (isWechat) {
    const wxAcc = accounts.find(a => a.name.includes('微信') || a.id === 'acc-1');
    if (wxAcc) accountId = wxAcc.id;
  }

  // 2. Specialized Alipay Bill Details Parser (Top Down)
  // In Alipay: Line 1 = "账单详情", Line 2 = "万亩良田生鲜超市", Line 3 = "-14.05"
  if (isAlipay) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Amount in Alipay is typically -xx.xx or xx.xx right below merchant
      const alipayAmtMatch = line.match(/^[-－]?\s*([¥￥$]?\s*)(\d+\.\d{2})$/);
      if (alipayAmtMatch) {
        amount = parseFloat(alipayAmtMatch[2]);
        // Merchant is right above the amount!
        if (i > 0) {
          let prevLine = lines[i - 1];
          if (!prevLine.includes('账单') && !prevLine.includes('<') && prevLine.length > 1) {
            merchant = prevLine;
          }
        }
        break;
      }
    }
  }

  // 3. Specialized WeChat Bill Parser (Bottom Up)
  if (!amount) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      // Skip irrelevant summary / score lines
      if (line.includes('昨日') || line.includes('已支出') || line.includes('已入账') || line.includes('统计') || line.includes('积分') || line.includes('时间') || line.includes('202')) {
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
              merchant = l.replace(/[<>:：\-_/]/g, '').trim();
              break;
            }
          }
          break;
        }
      }
    }
  }

  // 4. Clean Merchant Name Artifacts (e.g. "M 麦当劳" -> "麦当劳")
  if (merchant) {
    merchant = merchant.replace(/^[Mm]\s+/, '') // Remove leading "M " icon artifact
                       .replace(/^[©®★▲▼■●]\s*/, '')
                       .replace(/\(.*?\)|（.*?）/g, '') // remove branch info if needed or keep clean
                       .trim();
  }

  if (!merchant || merchant.length < 2) {
    const brands = ["麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", "海底捞", "喜茶", "霸王茶姬", "美团", "饿了么", "滴滴出行", "淘宝", "天猫", "京东", "盒马", "山姆", "生鲜超市"];
    for (const b of brands) {
      if (clean.includes(b)) {
        merchant = b;
        break;
      }
    }
  }

  if (!merchant) merchant = "日常消费";

  // 5. Category Detection
  if (/生鲜|超市|便利店|百货|水果|良田|菜市/.test(merchant + clean)) category = '日用百货';
  else if (/麦当劳|肯德基|饭|咖啡|茶|吃|火锅|餐厅|美团外卖/.test(merchant + clean)) category = '餐饮美食';
  else if (/滴滴|打车|地铁|公交|高铁|加油|车|出行/.test(merchant + clean)) category = '交通出行';
  else if (/淘宝|京东|天猫|拼多多|衣服|鞋|数码/.test(merchant + clean)) category = '购物消费';
  else category = '餐饮美食';

  return { amount, merchant, category, accountId };
}

testCases.forEach(tc => {
  console.log(`[${tc.name} Result]:`, smartExtract(tc.text));
});
