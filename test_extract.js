// Test what happens with various iOS Live Text variations:
const testCases = [
  `5:19 1\n< 47\n微信支付\n微信记账本\n记账日报\n8月23日 (周日) 日报\n昨日支出 ¥67.92，共3笔\n昨日入账 ¥30.00，共1笔\n本月统计 8月已支出 ¥2268.63，已入账 ¥5161.30\n点击查看昨日收支明细，还能补充其他收支\n查看明细\n日报设置\n昨天 下午 10:51\n麦当劳\n使用零钱支付\n¥ 14.90\n交易详情 >`,
  `微信支付 麦当劳 使用零钱支付 ¥14.90`,
  `麦当劳\n使用零钱支付\n14.90`,
  `麦当劳\n¥\n14.90`,
  `14.90\n麦当劳`,
  `美团外卖 -32.50`,
  `瑞幸咖啡 支付金额 18.00`,
  `吃了15块`
];

function robustExtract(text) {
  if (!text) return null;
  // Normalize
  const clean = text.replace(/[\r\n]+/g, '\n').trim();
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = 0;
  let merchant = '';

  // 1. Try to find amount from bottom up
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    // Exclude daily summary lines
    if (line.includes('昨日') || line.includes('已支出') || line.includes('已入账') || line.includes('统计')) {
      continue;
    }
    const match = line.match(/(?:[¥￥$]\s*|[-－]\s*)?(\d+(?:\.\d{1,2})?)/);
    if (match) {
      const val = parseFloat(match[1]);
      if (val > 0 && val < 1000000 && !line.includes(':') && !line.includes('月') && !line.includes('日') && !line.includes('年')) {
        amount = val;
        // Search surrounding lines for merchant
        for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 1); j++) {
          const l = lines[j];
          if (j !== i && !l.includes('支付') && !l.includes('零钱') && !l.includes('微信') && !l.includes('支付宝') && !l.includes('详情') && !l.includes('昨天') && !l.includes('今天') && !l.includes('日报')) {
            merchant = l;
            break;
          }
        }
        break;
      }
    }
  }

  // Fallback if not found from lines
  if (!amount) {
    const matchAny = clean.match(/(\d+(?:\.\d{1,2})?)\s*(?:元|块)?/);
    if (matchAny) amount = parseFloat(matchAny[1]);
  }

  // Search brand in whole text if merchant not found
  if (!merchant || merchant.length < 2) {
    const brands = ["麦当劳", "肯德基", "瑞幸咖啡", "星巴克", "海底捞", "美团", "饿了么", "喜茶", "滴滴", "淘宝", "京东"];
    for (const b of brands) {
      if (clean.includes(b)) {
        merchant = b;
        break;
      }
    }
  }

  if (!merchant) merchant = "日常消费";

  return { amount, merchant };
}

testCases.forEach((t, idx) => {
  console.log(`Test ${idx + 1}:`, robustExtract(t));
});
