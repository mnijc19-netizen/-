// Test Pinduoduo WeChat Screenshot
const sampleText = `微信支付
拼多多平台商户
先用后付订单已完成，已自动支付
通过零钱扣款
¥ 16.83
按时支付，记入微信支付分记录
交易详情 >
下单时间 8月8日 00:13`;

function cleanMerchantName(raw) {
  if (!raw) return '';
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

  const noisePhrases = [
    "通过零钱扣款", "通过微信支付扣款", "通过银行卡扣款", "使用零钱支付", "零钱扣款",
    "先用后付订单已完成", "已自动支付", "自动扣款", "免密支付", "快捷支付", "按时支付",
    "记入微信支付分记录", "交易详情", "查看商家订单", "物流及商品详情", "管理扣费服务",
    "订单已完成", "扣款成功", "付款成功", "支付成功", "微信记账本", "微信支付", "通过零钱"
  ];
  for (const phrase of noisePhrases) {
    if (s === phrase || (s.includes(phrase) && !s.includes('拼多多') && !s.includes('淘宝') && !s.includes('美团') && !s.includes('京东'))) {
      return '';
    }
  }

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

  if (raw.includes('寻梦')) return '拼多多';
  if (raw.includes('协和')) return '北京协和医院';
  if (raw.includes('哈啰')) return '哈啰单车';

  return s;
}

function extractFromRawText(text) {
  const rawClean = text.replace(/[\r\n]+/g, '\n').trim();
  const allLines = rawClean.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = 0;
  let merchant = '';

  // Check known brands first!
  const brands = [
    "铁路12306", "中国石化", "中国电信", "中国移动", "中国联通", "万亩良田生鲜超市", "万亩良田", "抖音生活服务", 
    "清口清汤面", "老乡鸡", "麦当劳", "肯德基", "汉堡王", "瑞幸咖啡", "星巴克", 
    "海底捞火锅", "海底捞", "喜茶", "霸王茶姬", "茶百道", "蜜雪冰城", "美团外卖", "美团", "饿了么", 
    "滴滴出行", "滴滴", "曹操出行", "T3出行", "哈啰单车", "哈啰", "淘宝闪购", "淘宝", "天猫", "京东商城", "京东", "拼多多", "盒马鲜生", "盒马", "山姆会员商店", "山姆", "全家便利店", "全家", "永辉超市"
  ];
  for (const b of brands) {
    if (rawClean.includes(b)) {
      merchant = cleanMerchantName(b);
      break;
    }
  }

  for (let i = 0; i < allLines.length; i++) {
    const l = allLines[i];
    const m = l.match(/[¥￥$]?\s*(\d+\.\d{1,2})/);
    if (m && !l.includes('月') && !l.includes('日') && !l.includes(':')) {
      amount = parseFloat(m[1]);
      if (!merchant) {
        for (let k = i - 1; k >= 0; k--) {
          const cleaned = cleanMerchantName(allLines[k]);
          if (cleaned && cleaned.length > 1) {
            merchant = cleaned;
            break;
          }
        }
      }
      break;
    }
  }

  return { amount, merchant };
}

const res = extractFromRawText(sampleText);
console.log('Result:', res);
