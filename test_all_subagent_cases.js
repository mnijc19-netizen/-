const accounts = [
  { id: 'acc-1', name: '微信零钱/零钱通', type: 'wallet' },
  { id: 'acc-2', name: '支付宝/余额宝', type: 'wallet' },
  { id: 'acc-3', name: '主要银行储蓄卡', type: 'bank' },
  { id: 'acc-4', name: '信用卡账户', type: 'credit' }
];

function cleanMerchantName(raw) {
  if (!raw) return '微信/支付宝消费';
  let s = raw
    .replace(/^[\s"“'‘`]+|[\s"”'’`]+$/g, '')
    .replace(/^[Mm]\s+/, '')
    .replace(/^[©®★▲▼■●◆◇✓✔√]+\s*/, '')
    .replace(/^[<>\-_/:：]+\s*/, '')
    .replace(/\s*付款方式.*$/i, '')
    .replace(/\s*交易详情.*$/i, '')
    .replace(/\s*查看明细.*$/i, '')
    .replace(/\s*更多.*$/i, '')
    .replace(/^[>vV]\s*/, '')
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

  const brands = [
    "中国石化", "中国电信", "中国移动", "中国联通", "万亩良田生鲜超市", "万亩良田", "抖音生活服务", "抖音",
    "清口清汤面", "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", "海底捞火锅", "海底捞", "喜茶", "霸王茶姬", 
    "茶百道", "蜜雪冰城", "美团外卖", "美团", "饿了么", "滴滴出行", "滴滴", "曹操出行", "T3出行", "淘宝闪购", "淘宝", "天猫", 
    "京东", "拼多多", "盒马鲜生", "盒马", "山姆会员商店", "山姆", "永辉超市", "屈臣氏", "7-Eleven", "全家", 
    "罗森", "便利蜂", "优衣库", "Apple", "生鲜超市", "老乡鸡"
  ];
  for (const b of brands) {
    if (raw.includes(b) || s.includes(b)) {
      return b;
    }
  }

  if (s.startsWith('@') || /^[a-zA-Z\s@#*]+$/.test(s) && s.length < 10) {
    if (raw.includes('电信') || raw.includes('话费')) return '中国电信';
    if (raw.includes('移动')) return '中国移动';
    if (raw.includes('联通')) return '中国联通';
    if (raw.includes('万亩') || raw.includes('良田')) return '万亩良田生鲜超市';
  }

  return s || '日常消费';
}

function suggestCategory(merchant, fullText = '') {
  const m = (merchant || '').toLowerCase();
  if (/滴滴|打车|出租车|地铁|公交|高铁|火车|机票|加油|中石化|中石油|停车|高速|出行|交通|t3|曹操/.test(m)) return '交通出行';
  if (/电信|移动|联通|话费|充值|宽带|水费|电费|燃气|物业|房租|生活缴费/.test(m)) return '生活服务';
  if (/餐饮|美食|清汤面|面|饭|餐|吃|外卖|美团|饿了么|麦当劳|肯德基|汉堡|火锅|烧烤|牛肉|海鲜|咖啡|奶茶|茶|霸王茶姬|星巴克|瑞幸|喜茶|早餐|午餐|晚餐|夜宵|甜品|小吃|炸鸡|老乡鸡/.test(m)) return '餐饮美食';
  if (/生鲜|超市|便利店|百货|水果|良田|菜市|日用|屈臣氏|全家|罗森|7-eleven|便利蜂|永辉|盒马|山姆/.test(m)) return '日用百货';
  if (/淘宝|天猫|京东|拼多多|唯品会|服装|衣服|鞋|包|数码|手机|电脑|电器|饰品|闪购|购物/.test(m)) return '购物消费';
  if (/电影|影城|ktv|酒吧|网吧|游戏|充值|门票|旅游|休闲|娱乐/.test(m)) return '休闲娱乐';
  if (/医|药|诊所|医院|体检|健康|牙科/.test(m)) return '医疗健康';

  const combined = (merchant + ' ' + fullText).toLowerCase();
  if (/加油|车用汽油|中石化|中石油|滴滴|打车|交通|出行|t3|曹操/.test(combined)) return '交通出行';
  if (/电信|移动|联通|话费|充值|宽带|水费|电费|燃气|物业|房租|生活缴费/.test(combined)) return '生活服务';
  if (/餐饮|美食|清汤面|面|饭|餐|吃|外卖|美团|饿了么|麦当劳|肯德基|汉堡|火锅|烧烤|牛肉|海鲜|咖啡|奶茶|茶|霸王茶姬|星巴克|瑞幸|喜茶|早餐|午餐|晚餐|夜宵|甜品|小吃|炸鸡|老乡鸡|生椰拿铁/.test(combined)) return '餐饮美食';
  if (/生鲜|超市|便利店|百货|水果|良田|菜市|日用|屈臣氏|全家|罗森|7-eleven|便利蜂|永辉|盒马|山姆/.test(combined)) return '日用百货';
  if (/淘宝|天猫|京东|拼多多|唯品会|服装|衣服|鞋|包|数码|手机|电脑|电器|饰品|闪购|购物/.test(combined)) return '购物消费';
  if (/电影|影城|ktv|酒吧|网吧|游戏|充值|门票|旅游|休闲|娱乐/.test(combined)) return '休闲娱乐';
  if (/医|药|诊所|医院|体检|健康|牙科/.test(combined)) return '医疗健康';
  return '日常消费';
}

function extractFromRawText(text, accounts = []) {
  if (!text) return { amount: 0, merchant: '日常消费', category: '日常消费' };
  
  const rawClean = text.replace(/[\r\n]+/g, '\n').trim();
  const allLines = rawClean.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = 0;
  let merchant = '';
  let category = '';
  let date = '';
  let targetAccId = undefined;

  // 1. Explicit merchant prefix extraction
  const explicitMerchantMatch = rawClean.match(/(?:商户全称|商户名称|收款方全称|收款方|交易对方|对方全称|收款人|商家|交易商户|店铺名称|服务商|开票主体|收款方：|收款方:)[:：\s]*([^\n\r]+)/);
  if (explicitMerchantMatch) {
    merchant = cleanMerchantName(explicitMerchantMatch[1]);
  }

  // 2. Priority check: Actual Net Paid Amount (实收/实付/实际扣款/实际付款)
  const actualPaidMatch = rawClean.match(/(?:实际扣款|实际付款|实收金额|实付金额|实付款|实收|实付|合计应付|合计金额|总计)(?:[^\d\n\r]*?)[:：]?\s*[¥￥$]?\s*(\d+(?:\.\d{1,2})?)/);
  if (actualPaidMatch) {
    amount = parseFloat(actualPaidMatch[1]);
  }

  // 3. Channel Detection via robust scoring
  const isAlipay = /支付宝|花呗|借呗|余额宝|蚂蚁|全部账单|账单详情|支付奖励|淘|闪购|蜂鸟|饿了么/.test(rawClean);
  const isWechat = /微信支付|微信记账本|使用零钱支付|零钱通|微信|财付通/.test(rawClean);
  const isBank = /招商银行|工商银行|建设银行|农业银行|中国银行|交通银行|平安银行|浦发银行|中信银行|信用卡|储蓄卡/.test(rawClean);

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

  // 4. WeChat Daily Report (Bottom Up)
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

  // 5. Bank SMS text (【招商银行】等)
  if (!amount) {
    const smsMatch = rawClean.match(/(?:支出|消费|扣款|转出|付款|人民币|RMB|支出\(消费\)|快捷支付|转账支出)\s*(?:人民币|RMB|[¥￥$])?\s*(\d+(?:\.\d{1,2})?)\s*元?/i);
    if (smsMatch && !rawClean.includes('服务消息') && !rawClean.includes('支付消息') && !rawClean.includes('账单详情')) {
      amount = parseFloat(smsMatch[1]);
      const atMatch = rawClean.match(/在\s*[【\[]?([^】\]\n\r]+?)[】\]]?\s*(?:消费|支出|扣款|快捷)/);
      if (atMatch) {
        merchant = cleanMerchantName(atMatch[1]);
      } else {
        const bankNameMatch = rawClean.match(/【([^】]+)】/);
        if (bankNameMatch && (!merchant || merchant.includes('银行'))) merchant = cleanMerchantName(bankNameMatch[1]);
      }
    }
  }

  // 6. Food delivery / E-commerce Order Detail (e.g. 淘宝闪购 / 饿了么 / 美团实付)
  if (!amount) {
    const paidMatch = rawClean.match(/(?:实付金额|实付款|实收金额|实际付款|实付|实收|合计金额|合计应付|总计)\s*[:：]?\s*[¥￥$]?\s*(\d+(?:\.\d{1,2})?)/);
    if (paidMatch) {
      amount = parseFloat(paidMatch[1]);
      if (!merchant) {
        for (const line of allLines) {
          if (line.includes('闪购') || line.includes('生鲜') || line.includes('生活服务') || line.includes('老乡鸡') || (line.includes('店') && !line.includes('设置') && !line.includes('订单') && !line.includes('备注'))) {
            merchant = cleanMerchantName(line);
            break;
          }
        }
      }
    }
  }

  // 7. Alipay Payment Messages List (支付消息列表 - 识别第一条最新付款)
  if (!amount && (rawClean.includes('支付消息') || rawClean.includes('服务消息') || rawClean.includes('付款成功') || rawClean.includes('支付成功') || rawClean.includes('微信支付凭证'))) {
    const validLines = [];
    for (let idx = 0; idx < allLines.length; idx++) {
      const l = allLines[idx];
      if (l.includes('统计支出') || l.includes('本月支出') || l.includes('大额消费') || l.includes('自动扣款') || l.includes('分期付款')) continue;
      if (l.includes('服务消息') || l.includes('支付消息')) continue;
      validLines.push(l);
    }

    for (let i = 0; i < validLines.length; i++) {
      const line = validLines[i];
      if (line === '付款成功' || line.includes('付款成功') || line === '支付成功' || line.includes('支付成功') || line.includes('付款金额')) {
        for (let j = i; j <= Math.min(validLines.length - 1, i + 2); j++) {
          const amtM = validLines[j].match(/[¥￥$]?\s*(\d+\.\d{1,2})/);
          if (amtM) {
            amount = parseFloat(amtM[1]);
            break;
          }
        }
        if (!merchant) {
          for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
            const prev = validLines[k];
            if (!prev.includes('PM') && !prev.includes('AM') && !prev.includes(':') && !prev.includes('昨天') && !prev.includes('今天') && !prev.includes('支付成功') && !prev.includes('付款成功') && !prev.includes('微信记账本') && !prev.includes('微信支付') && prev.length > 1) {
              merchant = cleanMerchantName(prev);
              break;
            }
          }
        }
        if (amount > 0) break;
      }
    }
  }

  // 8. Specialized Check: Bill Detail Page
  if (!amount && (rawClean.includes('账单详情') || rawClean.includes('商品说明') || rawClean.includes('账单分类'))) {
    const productDescMatch = rawClean.match(/商品说明\s*([^\n\r]+)/);
    if (productDescMatch && !merchant) {
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
  }

  // 9. Fallback
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

  if (!merchant || merchant === '日常消费' || merchant === '消费' || merchant === '支付成功' || merchant === '付款成功' || merchant === '商户消费' || merchant === '快车' || merchant === '美团平台商户' || merchant === '淘宝平台商户') {
    const brands = [
      "中国石化", "中国电信", "中国移动", "中国联通", "万亩良田生鲜超市", "万亩良田", "抖音生活服务", 
      "清口清汤面", "老乡鸡", "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", 
      "海底捞火锅", "海底捞", "喜茶", "霸王茶姬", "茶百道", "蜜雪冰城", "美团外卖", "美团", "饿了么", 
      "滴滴出行", "滴滴", "曹操出行", "T3出行", "淘宝闪购", "淘宝", "天猫", "京东", "拼多多", "盒马鲜生", "盒马", "山姆会员商店", "山姆", "永辉超市", "生鲜超市"
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

// Full 16-Scenario Real-world Benchmark
const fullBenchmarkCases = [
  {
    name: '1. 微信支付服务通知 (瑞幸咖啡)',
    text: `微信支付
微信支付凭证
付款金额 ￥68.50
商户全称 瑞幸咖啡（北京国贸店）
商品 生椰拿铁等2件商品
支付方式 招商银行储蓄卡(9527)
当前状态 支付成功
交易时间 2024-08-25 12:34:56`,
    expected: { amount: 68.50, merchant: '瑞幸咖啡', category: '餐饮美食' }
  },
  {
    name: '2. 微信账单详情页 (外卖订单)',
    text: `账单详情
-68.50
支付成功
付款方式 零钱通
商户全称 美团外卖商户
商品说明 美团订单-外卖订单号30002918239
创建时间 2024-08-25 12:15:30`,
    expected: { amount: 68.50, merchant: '美团外卖', category: '餐饮美食' }
  },
  {
    name: '3. 微信扫码付款成功 (永辉超市)',
    text: `支付成功
￥35.00
收款方：永辉超市(金台路店)
付款方式：微信零钱
优惠抵扣：微信支付立减金 -￥2.00
实际扣款：￥33.00
完成`,
    expected: { amount: 33.00, merchant: '永辉超市', category: '日用百货' }
  },
  {
    name: '4. 支付宝账单详情 (花呗淘宝订单)',
    text: `账单详情
-128.00
交易成功
付款方式 花呗 (分期/按月还款)
商品说明 淘宝订单-202408259918237192
对方全称 淘宝平台商户`,
    expected: { amount: 128.00, merchant: '淘宝', accountId: 'acc-2', category: '购物消费' }
  },
  {
    name: '5. 支付宝支付助手消息 (乘车码花呗)',
    text: `【支付宝支付助手】
支付成功通知
付款金额：15.00元
收款方：杭州市公共交通集团有限公司
付款方式：支付宝乘车码（花呗扣款）`,
    expected: { amount: 15.00, merchant: '杭州市公共交通集团有限公司', accountId: 'acc-2', category: '交通出行' }
  },
  {
    name: '6. 美团外卖订单详情 (老乡鸡)',
    text: `美团外卖
订单已完成
老乡鸡（中关村软件园店）
肥西老母鸡汤 x1 ￥28.00
打包费 ￥3.50
实付金额 ￥46.50
付款方式 微信支付`,
    expected: { amount: 46.50, merchant: '老乡鸡', category: '餐饮美食' }
  },
  {
    name: '7. 滴滴出行电子行程单',
    text: `滴滴出行行程报销单
特惠快车 2024-08-25 09:15:20
出发地: 朝阳区三里屯SOHO
目的地: 海淀区中关村软件园
合计金额：￥143.70`,
    expected: { amount: 143.70, merchant: '滴滴出行', category: '交通出行' }
  },
  {
    name: '8. T3出行电子行程单',
    text: `T3出行 行程单
乘车类型：专享快车
起点：上海市浦东新区张江微电子港
终点：上海市徐汇区漕河泾开发区
实付金额：￥56.90
支付方式：微信支付`,
    expected: { amount: 56.90, merchant: 'T3出行', category: '交通出行' }
  },
  {
    name: '9. 招商银行消费短信',
    text: `【招商银行】您账户9527于08月25日12:34在【微信支付-瑞幸咖啡】快捷支付68.50元，余额12580.42元。`,
    expected: { amount: 68.50, merchant: '瑞幸咖啡', category: '餐饮美食' }
  },
  {
    name: '10. 工商银行储蓄卡转账短信',
    text: `【工商银行】您尾号8899的储蓄卡8月25日15:30支出人民币1000.00元，活期余额50230.15元。收款方：李四。`,
    expected: { amount: 1000.00, merchant: '李四', category: '日常消费' }
  },
  {
    name: '11. 建设银行支付宝快捷支付短信',
    text: `您尾号3344的储蓄卡8月25日14时20分支付宝快捷支付支出人民币88.00元，活期余额21450.30元。【建设银行】`,
    expected: { amount: 88.00, merchant: '建设银行', category: '日常消费' }
  },
  {
    name: '12. 平安银行转账短信',
    text: `【平安银行】您尾号6789账户于08月25日10:12转账支出RMB2000.00元成功，现余额18570.50元。收款人：王五。`,
    expected: { amount: 2000.00, merchant: '王五', category: '日常消费' }
  },
  {
    name: '13. 麦当劳收银结账小票',
    text: `麦当劳 (McDonald's)
门店：北京市朝阳区大望路餐厅
巨无霸超值大套餐 1 38.00
小计：61.00
实收 (Paid - 微信支付)：51.00`,
    expected: { amount: 51.00, merchant: '麦当劳', category: '餐饮美食' }
  },
  {
    name: '14. 盒马鲜生超市小票',
    text: `盒马鲜生 (鲜生生活)
盒马鲜生十里堡店
盒马日日鲜鲜牛奶 2 27.80
件数合计：6
实收金额：￥123.50
付款方式：支付宝条码支付 (花呗)`,
    expected: { amount: 123.50, merchant: '盒马鲜生', accountId: 'acc-2', category: '日用百货' }
  },
  {
    name: '15. 山姆会员商店小票',
    text: `Sam's CLUB 山姆会员商店
门店：山姆亦庄店
MM小青柠汁1L*2 1 32.80
实际付款：￥230.60
支付方式：中信银行山姆联名信用卡`,
    expected: { amount: 230.60, merchant: '山姆会员商店', category: '日用百货' }
  },
  {
    name: '16. 中国石化加油站发票/凭条',
    text: `中国石化销售股份有限公司北京石油分公司
加油凭条
95号车用汽油 45.20升
实收金额：366.94 元
支付方式：加油卡/微信无感支付`,
    expected: { amount: 366.94, merchant: '中国石化', category: '交通出行' }
  }
];

console.log('🚀 Running 16 Full-Scenario Chinese Payment Benchmark Tests:\n');
let passCount = 0;
fullBenchmarkCases.forEach((tc, idx) => {
  const result = extractFromRawText(tc.text, accounts);
  const amtMatch = Math.abs(result.amount - tc.expected.amount) < 0.01;
  const merMatch = result.merchant.includes(tc.expected.merchant) || tc.expected.merchant.includes(result.merchant);
  const catMatch = !tc.expected.category || result.category === tc.expected.category;
  const accMatch = !tc.expected.accountId || result.accountId === tc.expected.accountId;

  const passed = amtMatch && merMatch && catMatch && accMatch;
  if (passed) passCount++;

  console.log(`[Test ${idx + 1}] ${passed ? '✅ PASS' : '❌ FAIL'}: ${tc.name}`);
  console.log(`   - Amount:   Got ¥${result.amount} (Expected ¥${tc.expected.amount}) ${amtMatch ? '✔' : '✘'}`);
  console.log(`   - Merchant: Got [${result.merchant}] (Expected [${tc.expected.merchant}]) ${merMatch ? '✔' : '✘'}`);
  console.log(`   - Category: Got [${result.category}] (Expected [${tc.expected.category || '-'}]) ${catMatch ? '✔' : '✘'}`);
  console.log(`   - Account:  Got [${result.accountId}] (Expected [${tc.expected.accountId || '-'}]) ${accMatch ? '✔' : '✘'}\n`);
});

console.log(`🎯 Overall Score: ${passCount}/${fullBenchmarkCases.length} Tests Passed (${Math.round((passCount/fullBenchmarkCases.length)*100)}%)`);
