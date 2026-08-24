// Test channel scoring matrix on various real receipts
function detectPaymentChannel(text) {
  let wxScore = 0;
  let aliScore = 0;

  // WeChat signals
  if (/微信支付|微信记账本|使用零钱支付|零钱通|微信/.test(text)) wxScore += 10;
  if (/使用零钱|零钱支付|零钱/.test(text)) wxScore += 5;
  if (/记账日报|查看明细|日报设置|昨日支出|昨日入账/.test(text)) wxScore += 5;
  if (/商户名称|交易详情/.test(text)) wxScore += 2;

  // Alipay signals
  if (/支付宝|花呗|借呗|余额宝/.test(text)) aliScore += 10;
  if (/全部账单|账单详情|支付奖励|解锁了|账单分类|为你推荐|计入收支/.test(text)) aliScore += 5;
  if (/收单机构|清算机构/.test(text)) {
    // Shared financial term: only weak signal if Alipay is already mentioned
    if (/支付宝/.test(text)) aliScore += 1;
  }

  if (aliScore > wxScore && aliScore >= 5) {
    return 'alipay';
  }
  return 'wechat';
}

const tests = [
  {
    name: "WeChat Beef Restaurant Receipt",
    text: "7:11 1\n< 微信支付\n陈记牛来牛往潮汕牛肉海鲜...\n-30.00\n交易时间: 2026-08-25 07:11\n清算机构: 中国银联股份有限公司\n收单机构: 上海汇付"
  },
  {
    name: "Alipay Supermarket Receipt",
    text: "6:40 1\n< 账单详情 全部账单\n万亩良田生鲜超市\n-14.05\n交易成功\n付款方式 花呗 >\n支付奖励 立即领取2积分\n收单机构 上海汇付支付有限公司"
  },
  {
    name: "WeChat McDonald's with Daily Report",
    text: "5:19 1\n< 47 微信支付\n记账日报\n昨日支出 ¥67.92\n麦当劳\n使用零钱支付\n¥ 14.90"
  },
  {
    name: "General QR Code Receipt (no app name, but in WeChat context)",
    text: "陈记牛来牛往潮汕牛肉海鲜\n-30.00\n商户消费"
  }
];

tests.forEach(t => {
  console.log(`[${t.name}]: Detected ->`, detectPaymentChannel(t.text));
});
