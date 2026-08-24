const sampleText = `5:19 1
< 47
微信支付
微信记账本
记账日报
8月23日 (周日) 日报
昨日支出 ¥67.92，共3笔
昨日入账 ¥30.00，共1笔
本月统计 8月已支出 ¥2268.63，已入账 ¥5161.30
点击查看昨日收支明细，还能补充其他收支
查看明细
日报设置
昨天 下午 10:51
麦当劳
使用零钱支付
¥ 14.90
交易详情 >`;

function testParse(rawText) {
  const rawLines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
  console.log("Lines count:", rawLines.length);

  let detectedAmount = 0;
  let detectedMerchant = '';
  let detectedAccountName = '';

  for (let i = rawLines.length - 1; i >= 0; i--) {
    const line = rawLines[i];
    const amtMatch = line.match(/(?:[¥￥]\s*|[-－]\s*|^[¥￥]?\s*)(\d+\.\d{2})/);
    if (amtMatch && !line.includes('昨日') && !line.includes('统计') && !line.includes('已支出') && !line.includes('已入账')) {
      detectedAmount = parseFloat(amtMatch[1]);
      for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
        const prevLine = rawLines[j];
        if (prevLine.includes('支付') || prevLine.includes('零钱') || prevLine.includes('卡') || prevLine.includes('余额宝') || prevLine.includes('花呗')) {
          detectedAccountName = prevLine;
          if (j > 0) {
            const possibleMerchant = rawLines[j - 1];
            if (!possibleMerchant.includes('微信') && !possibleMerchant.includes('昨天') && !possibleMerchant.includes('今天') && !possibleMerchant.includes('日报')) {
              detectedMerchant = possibleMerchant;
            }
          }
        } else if (!detectedMerchant && !prevLine.includes('微信') && !prevLine.includes('昨天') && !prevLine.includes('今天') && !prevLine.includes('日报') && !prevLine.includes('设置') && !prevLine.includes('明细')) {
          detectedMerchant = prevLine;
        }
      }
      break;
    }
  }

  console.log("Detected Amount:", detectedAmount);
  console.log("Detected Merchant:", detectedMerchant);
  console.log("Detected Account:", detectedAccountName);
}

testParse(sampleText);
