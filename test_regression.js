// Verify regression on WeChat Pay and Bank SMS
const wechatSample = `微信支付
微信记账本
麦当劳
支付成功
¥ 35.50
付款方式 零钱通
交易单号 100000000020260825`;

const smsSample = `【中国工商银行】您尾号9527卡于08月25日15:30支出(消费)人民币88.00元，余额5320.10元。【工商银行】`;

console.log("\n--- TEST 4: WeChat Pay Notification ---");
console.log(extractFromRawText(wechatSample, accounts));

console.log("\n--- TEST 5: Bank SMS ---");
console.log(extractFromRawText(smsSample, accounts));
