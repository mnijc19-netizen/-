// Comprehensive Full Multi-Format Parser
const sample1_alipay_messages = `3:56
服务消息 支付消息
8月统计支出 本月支出¥2052.57，较上月降低>
1 大额消费 1 自动扣款 33 花呗付款 0 分期付款
淘宝闪购
3:52 PM
付款成功
¥ 11.80
查看详情 >
付款方式 花呗
支付奖励 +2积分 | 积分兑信用卡还款免费额度
蚂蚁财富-蚂蚁 (杭州) 基...
10:21 AM
付款成功
¥ 5.00
查看详情 >
付款方式 中国银行储蓄卡(4691)
支付奖励 9积分+19.9元兑异环联名帆布袋
万亩良田生鲜超市
昨天 8:52 PM
付款成功
¥ 0.20
查看详情 >`;

const sample2_alipay_bill_detail = `3:56
账单详情 全部账单
淘宝闪购
-11.80
支付成功
支付时间 2026-08-25 15:52:36
付款方式 花呗 >
商品说明 清口清汤面(金山店)外卖订单
支付奖励 立即领取2积分
更多
账单管理
账单分类 餐饮美食 >
标签 请选择 >
为推荐 三餐 +
计入收支
备注 添加 >
联系商家 查看往来记录
AA收款 往来流水证明
对此订单有疑问`;

const sample3_order_detail = `3:57
正在召唤骑士
商家已出餐
预计 16:42-16:57
送至 浦上大道410金辉天鹅湾17#1401 郑数良
18506070210
联系商家 催单 取消订单 开发票
闪购 清口清汤面(金山店) > 蜂鸟准时达
价格明细 实付¥11.8
备注 依据餐量提供餐具
联系不上时 可设置暂存点放置外卖 | 设置
订单号 8065726202007643493 复制
订单信息`;

const wechatSample = `微信支付
微信记账本
麦当劳
支付成功
¥ 35.50
付款方式 零钱通
交易单号 100000000020260825`;

const smsSample = `【中国工商银行】您尾号9527卡于08月25日15:30支出(消费)人民币88.00元，余额5320.10元。【工商银行】`;

function cleanMerchantName(raw) {
  if (!raw) return '日常消费';
  let s = raw
    .replace(/^[\s"“'‘`]+|[\s"”'’`]+$/g, '')
    .replace(/^[Mm]\s+/, '')
    .replace(/^[©®★▲▼■●◆◇✓✔√]+\s*/, '')
    .replace(/^[<>\-_/:：]+\s*/, '')
    .replace(/\s*付款方式.*$/i, '')
    .replace(/\s*支付成功.*$/i, '')
    .replace(/\s*付款成功.*$/i, '')
    .replace(/\s*交易详情.*$/i, '')
    .replace(/\s*查看明细.*$/i, '')
    .replace(/\s*查看详情.*$/i, '')
    .replace(/\s*更多.*$/i, '')
    .replace(/^[>vV]\s*/, '')
    .replace(/^闪购\s*/, '')
    .replace(/^商户名称[:：]\s*/, '')
    .replace(/^收款方全称[:：]\s*/, '')
    .replace(/^交易对方[:：]\s*/, '')
    .replace(/^商品说明[:：]\s*/, '')
    .replace(/外卖订单$/i, '')
    .replace(/订单$/i, '')
    .replace(/\s*>\s*.*$/, '')
    .replace(/(?:昨天|今天|上午|下午|晚上)/g, '')
    .replace(/^[\s"“'‘`]+|[\s"”'’`]+$/g, '')
    .trim();

  return s || '日常消费';
}

function suggestCategory(merchant, fullText = '') {
  const combined = (merchant + ' ' + fullText).toLowerCase();
  
  if (/餐饮|美食|清汤面|面|饭|餐|吃|外卖|美团|饿了么|麦当劳|肯德基|汉堡|火锅|烧烤|牛肉|海鲜|咖啡|奶茶|茶|霸王茶姬|星巴克|瑞幸|喜茶|早餐|午餐|晚餐|夜宵|甜品|小吃/.test(combined)) {
    return '餐饮美食';
  }
  if (/生鲜|超市|便利店|百货|水果|良田|菜市|日用|屈臣氏|全家|罗森|7-eleven|便利蜂|永辉|盒马|山姆/.test(combined)) {
    return '日用百货';
  }
  if (/滴滴|打车|出租车|地铁|公交|高铁|火车|机票|加油|中石化|中石油|停车|高速|出行|交通/.test(combined)) {
    return '交通出行';
  }
  if (/淘宝|天猫|京东|拼多多|唯品会|服装|衣服|鞋|包|数码|手机|电脑|电器|饰品|闪购|购物/.test(combined)) {
    return '购物消费';
  }
  if (/电影|影城|ktv|酒吧|网吧|游戏|充值|门票|旅游|门票|休闲|娱乐/.test(combined)) {
    return '休闲娱乐';
  }
  if (/医院|门诊|药房|药店|医疗|体检|就医|挂号|药品/.test(combined)) {
    return '医疗健康';
  }
  if (/房租|水费|电费|燃气|物业|宽带|话费|充值/.test(combined)) {
    return '生活服务';
  }
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

  // 1. Channel detection
  const isAlipay = /支付宝|花呗|借呗|余额宝|蚂蚁|全部账单|账单详情|支付奖励|淘|闪购|蜂鸟|饿了么/.test(rawClean);
  const isWechat = /微信支付|微信记账本|使用零钱支付|零钱通|微信/.test(rawClean);

  if (isAlipay) {
    const alipayAcc = accounts.find(a => a.name && (a.name.includes('支付宝') || a.name.includes('花呗'))) || accounts.find(a => a.id === 'acc-2');
    targetAccId = alipayAcc?.id || 'acc-2';
  } else {
    const wxAcc = accounts.find(a => a.name && (a.name.includes('微信') || a.name.includes('零钱'))) || accounts.find(a => a.id === 'acc-1');
    targetAccId = wxAcc?.id || 'acc-1';
  }

  // 2. Specialized Check: Bank SMS text (【中国工商银行】等)
  const smsMatch = rawClean.match(/(?:支出|消费|扣款|转出|付款|人民币|RMB|支出\(消费\))\s*(?:人民币|RMB|[¥￥$])?\s*(\d+(?:\.\d{1,2})?)\s*元?/i);
  if (smsMatch && !rawClean.includes('服务消息') && !rawClean.includes('支付消息') && !rawClean.includes('账单详情')) {
    amount = parseFloat(smsMatch[1]);
    const bankNameMatch = rawClean.match(/【([^】]+)】/);
    if (bankNameMatch) {
      merchant = cleanMerchantName(bankNameMatch[1]);
    }
  }

  // 3. Specialized Check: Food delivery / E-commerce Order Detail (e.g. 淘宝闪购 / 饿了么 / 美团实付)
  if (!amount) {
    const paidMatch = rawClean.match(/(?:实付|合计|应付|总计)\s*[¥￥$]?\s*(\d+(?:\.\d{1,2})?)/);
    if (paidMatch) {
      amount = parseFloat(paidMatch[1]);
      for (const line of allLines) {
        if (line.includes('闪购') || (line.includes('店') && !line.includes('设置') && !line.includes('订单'))) {
          merchant = cleanMerchantName(line);
          break;
        }
      }
    }
  }

  // 4. Specialized Check: Alipay Payment Messages List (支付消息列表 - 识别第一条最新付款)
  if (!amount && (rawClean.includes('支付消息') || rawClean.includes('服务消息') || rawClean.includes('付款成功') || rawClean.includes('支付成功'))) {
    const validLines = [];
    for (let idx = 0; idx < allLines.length; idx++) {
      const l = allLines[idx];
      // Skip top statistics
      if (l.includes('统计支出') || l.includes('本月支出') || l.includes('大额消费') || l.includes('自动扣款') || l.includes('分期付款')) {
        continue;
      }
      if (l.includes('服务消息') || l.includes('支付消息')) {
        continue;
      }
      validLines.push(l);
    }

    // Find the FIRST "付款成功" / "支付成功" from top to bottom
    for (let i = 0; i < validLines.length; i++) {
      const line = validLines[i];
      if (line === '付款成功' || line.includes('付款成功') || line === '支付成功' || line.includes('支付成功')) {
        // Amount is immediately below
        for (let j = i; j <= Math.min(validLines.length - 1, i + 2); j++) {
          const amtM = validLines[j].match(/^[¥￥$]?\s*(\d+\.\d{1,2})$/);
          if (amtM) {
            amount = parseFloat(amtM[1]);
            break;
          }
        }
        // Merchant is immediately above (skipping time and status)
        for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
          const prev = validLines[k];
          if (!prev.includes('PM') && !prev.includes('AM') && !prev.includes(':') && !prev.includes('昨天') && !prev.includes('今天') && !prev.includes('支付成功') && !prev.includes('付款成功') && !prev.includes('微信记账本') && !prev.includes('微信支付') && prev.length > 1) {
            merchant = cleanMerchantName(prev);
            break;
          }
        }
        if (amount > 0) break;
      }
    }
  }

  // 5. Specialized Check: Alipay / WeChat Bill Detail Page (单笔账单详情)
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

  // 6. Fallback: Search for any valid amount
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

  if (!merchant || merchant === '日常消费' || merchant === '消费' || merchant === '支付成功' || merchant === '付款成功') {
    const brands = [
      "清口清汤面", "淘宝闪购", "淘宝", "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", 
      "海底捞", "喜茶", "霸王茶姬", "茶百道", "蜜雪冰城", "美团", "美团外卖", "饿了么", 
      "滴滴出行", "天猫", "京东", "拼多多", "盒马", "山姆", "永辉超市", "生鲜超市", "万亩良田"
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

const accounts = [
  { id: 'acc-1', name: '微信零钱/零钱通' },
  { id: 'acc-2', name: '支付宝/余额宝' }
];

console.log("--- 1. Alipay Payment Messages List ---");
console.log(extractFromRawText(sample1_alipay_messages, accounts));

console.log("\n--- 2. Alipay Bill Detail ---");
console.log(extractFromRawText(sample2_alipay_bill_detail, accounts));

console.log("\n--- 3. Food Delivery Order Detail ---");
console.log(extractFromRawText(sample3_order_detail, accounts));

console.log("\n--- 4. WeChat Pay Notification ---");
console.log(extractFromRawText(wechatSample, accounts));

console.log("\n--- 5. Bank SMS ---");
console.log(extractFromRawText(smsSample, accounts));
