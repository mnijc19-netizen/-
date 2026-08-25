import { AccountType } from '../types';
import { ExtractedBalanceResult } from './aiParser';

/**
 * High-precision local offline parser for Chinese Payment, Credit & Banking Balance Screenshots
 * (WeChat Wallet, Alipay Assets, Huabei, Jiebei, JD Baitiao, Meituan Pay, Douyin Pay, Major Banks, Securities & Funds)
 */
export function parseOfflineBalanceScreenshot(rawText: string): ExtractedBalanceResult | null {
  if (!rawText || !rawText.trim()) return null;

  const text = rawText.replace(/\r\n/g, '\n');
  const clean = text.replace(/,/g, ''); // remove comma in 2,691.41

  // 1. 🐕 京东白条 (JD Baitiao - "全部待还 (元)" / "全部待还账单" / "提前结清" / "白条")
  if (
    /全部待还账单|全部待还|京东白条|白条|京东金融|京东收银台/.test(clean) &&
    /待还|已出账|提前结清|还款日|预授权冻结/.test(clean)
  ) {
    const totalMatch = clean.match(/(?:全部待还\s*\(?元?\)?|待还总额|本月应还|本期应还|下月待还|待还金额)[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/i) ||
                      clean.match(/(?:全部待还\s*\(?元?\)?[\s\S]{1,30}?)([\d,]+\.\d{2})/i) ||
                      clean.match(/([\d,]+\.\d{2})/);
    const amt = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;
    if (amt > 0) {
      return {
        platform: '京东白条',
        accountType: 'baitiao',
        balance: amt,
        currency: 'CNY',
        note: `京东白条全部待还款 ¥${amt.toFixed(2)} (消费信贷负债)`,
        confidence: 0.99
      };
    }
  }

  // 2. 🌸 蚂蚁花呗 (Alipay Huabei - "花呗" / "花呗分期" / "花呗账单")
  if (
    /花呗|花呗分期|花呗账单|蚂蚁花呗/.test(clean) && 
    /待还|本月应还|下月应还|下月待还|总额度|账单/.test(clean)
  ) {
    const dueMatch = clean.match(/(?:本月应还|待还总额|本期待还|下月待还|下月应还|应还本金|待还)[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/i) ||
                     clean.match(/([\d,]+\.\d{2})/);
    const amt = dueMatch ? parseFloat(dueMatch[1].replace(/,/g, '')) : 0;
    if (amt > 0) {
      return {
        platform: '蚂蚁花呗',
        accountType: 'huabei',
        balance: amt,
        currency: 'CNY',
        note: `花呗待还款 ¥${amt.toFixed(2)} (信用消费负债)`,
        confidence: 0.99
      };
    }
  }

  // 3. 💰 蚂蚁借呗 (Alipay Jiebei - Loan Liability)
  if (/借呗|网商贷|蚂蚁借呗/.test(clean) && /待还|借款|还款|本金/.test(clean)) {
    const loanMatch = clean.match(/(?:待还总额|总待还|借款本金|本期应还|剩余待还)[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/i) ||
                      clean.match(/([\d,]+\.\d{2})/);
    const amt = loanMatch ? parseFloat(loanMatch[1].replace(/,/g, '')) : 0;
    if (amt > 0) {
      return {
        platform: '蚂蚁借呗',
        accountType: 'jiebei',
        balance: amt,
        currency: 'CNY',
        note: `借呗待还本金 ¥${amt.toFixed(2)} (借贷负债)`,
        confidence: 0.99
      };
    }
  }

  // 4. 🦘 美团月付 (Meituan Pay - Credit Liability)
  if (
    /美团月付|月付|美团外卖月付|美团|\d+月账单/.test(clean) && 
    /待还|本月待还|下月待还|本期应还|分期还款|提前还款|还款日|额度/.test(clean)
  ) {
    const mtMatch = clean.match(/(?:本月待还|下月待还|待还总额|本期待还|剩余应还|待还\s*\(?元?\)?|账单总计)[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/i) ||
                    clean.match(/([\d,]+\.\d{2})/);
    const amt = mtMatch ? parseFloat(mtMatch[1].replace(/,/g, '')) : 0;
    if (amt > 0) {
      return {
        platform: '美团月付',
        accountType: 'meituan_pay',
        balance: amt,
        currency: 'CNY',
        note: `美团月付待还款 ¥${amt.toFixed(2)} (信用消费负债)`,
        confidence: 0.99
      };
    }
  }

  // 5. 🎵 抖音月付 (Douyin Pay - Credit Liability)
  if (/抖音月付|抖音支付|巨量月付/.test(clean) && /待还|本月应还|下月待还|还款|额度/.test(clean)) {
    const dyMatch = clean.match(/(?:本月应还|待还总额|下月应还|待还本金|剩余应还)[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/i) ||
                    clean.match(/([\d,]+\.\d{2})/);
    const amt = dyMatch ? parseFloat(dyMatch[1].replace(/,/g, '')) : 0;
    if (amt > 0) {
      return {
        platform: '抖音月付',
        accountType: 'douyin_pay',
        balance: amt,
        currency: 'CNY',
        note: `抖音月付待还款 ¥${amt.toFixed(2)} (信用消费负债)`,
        confidence: 0.99
      };
    }
  }

  // 6. 💬 微信分付 / 微粒贷 (WeChat Fenfu / Weilidai)
  if (/微信分付|分付|微粒贷/.test(clean) && /已用额度|待还|还款|额度/.test(clean)) {
    const ffMatch = clean.match(/(?:已用额度|待还总额|借款本金|本期应还)[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/i) ||
                    clean.match(/([\d,]+\.\d{2})/);
    const amt = ffMatch ? parseFloat(ffMatch[1].replace(/,/g, '')) : 0;
    if (amt > 0) {
      return {
        platform: '微信分付/微粒贷',
        accountType: 'fenfu',
        balance: amt,
        currency: 'CNY',
        note: `微信分付已用额度 ¥${amt.toFixed(2)} (信用借贷负债)`,
        confidence: 0.99
      };
    }
  }

  // 7. WeChat Wallet (微信零钱 / 零钱通)
  if (
    /零钱|零钱通|支付分|亲属卡|微信记账本/.test(clean) ||
    (/钱包/.test(clean) && !/支付宝|数字人民币|美团|京东/.test(clean))
  ) {
    let platform = '微信零钱';
    let balance = 0;
    let note = '微信钱包余额';

    const changeMatch = clean.match(/零钱[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/);
    const changeAmount = changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0;

    const tongMatch = clean.match(/零钱通[\s\S]{0,35}?[¥￥]\s*([\d,]+\.\d{2})/) ||
                      clean.match(/零钱通[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/);
    const tongAmount = tongMatch ? parseFloat(tongMatch[1].replace(/[¥￥\s,]/g, '')) : 0;

    if (changeAmount > 0 && tongAmount > 0) {
      platform = '微信钱包 (零钱+零钱通)';
      balance = changeAmount + tongAmount;
      note = `含零钱 ¥${changeAmount.toFixed(2)} + 零钱通 ¥${tongAmount.toFixed(2)}`;
    } else if (changeAmount > 0) {
      platform = '微信零钱';
      balance = changeAmount;
      if (tongAmount > 0) note = `零钱 ¥${changeAmount.toFixed(2)} (零钱通 ¥${tongAmount.toFixed(2)})`;
    } else if (tongAmount > 0) {
      platform = '微信支付-零钱通';
      balance = tongAmount;
    } else {
      const numMatch = clean.match(/[¥￥]\s*([\d,]+\.\d{2})/);
      if (numMatch) {
        balance = parseFloat(numMatch[1].replace(/,/g, ''));
      }
    }

    if (balance > 0) {
      return {
        platform,
        accountType: 'wallet',
        balance,
        currency: 'CNY',
        note,
        confidence: 0.98
      };
    }
  }

  // 8. Alipay Assets (支付宝总资产 / 余额宝)
  if (
    /我的资产|资产概览|总资产|余额宝|理财资产|活期资产|稳健理财|进阶理财|蚂蚁财富/.test(clean) &&
    !/微信|全部待还/.test(clean)
  ) {
    let platform = '支付宝-总资产';
    let balance = 0;
    let note = '支付宝资产概览';

    const totalMatch = clean.match(/(?:我的资产|资产概览|总资产)[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/i) ||
                       clean.match(/(?:我的资产|资产概览|总资产)[\s\S]{1,40}?([\d,]+\.\d{2})/i);
    
    const yuebaoMatch = clean.match(/余额宝[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/);
    const fundMatch = clean.match(/基金[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/);

    if (totalMatch && parseFloat(totalMatch[1].replace(/,/g, '')) > 0) {
      balance = parseFloat(totalMatch[1].replace(/,/g, ''));
      platform = '支付宝-总资产';
      const yb = yuebaoMatch ? parseFloat(yuebaoMatch[1].replace(/,/g, '')) : 0;
      const fd = fundMatch ? parseFloat(fundMatch[1].replace(/,/g, '')) : 0;
      if (yb > 0 || fd > 0) {
        note = `总资产 ¥${balance.toFixed(2)} (含余额宝 ¥${yb.toFixed(2)}${fd > 0 ? ` + 基金 ¥${fd.toFixed(2)}` : ''})`;
      }
    } else if (yuebaoMatch) {
      balance = parseFloat(yuebaoMatch[1].replace(/,/g, ''));
      platform = '支付宝-余额宝';
      note = '支付宝余额宝';
    } else {
      const numMatch = clean.match(/([\d,]+\.\d{2})/);
      if (numMatch) {
        balance = parseFloat(numMatch[1].replace(/,/g, ''));
      }
    }

    if (balance > 0) {
      return {
        platform,
        accountType: 'wallet',
        balance,
        currency: 'CNY',
        note,
        confidence: 0.98
      };
    }
  }

  // 9. Major Banks (招行、工行、建行、农行、中行、交行、平安、浦发)
  const bankPatterns: Array<{ name: string; test: RegExp }> = [
    { name: '招商银行', test: /招商银行|CMB|一网通/ },
    { name: '中国工商银行', test: /工商银行|ICBC|工行/ },
    { name: '中国建设银行', test: /建设银行|CCB|建行/ },
    { name: '中国农业银行', test: /农业银行|ABC|农行/ },
    { name: '中国银行', test: /中国银行|BOC/ },
    { name: '交通银行', test: /交通银行|BOCOM/ },
    { name: '平安银行', test: /平安银行|PAB/ },
    { name: '浦发银行', test: /浦发银行|SPDB/ },
    { name: '兴业银行', test: /兴业银行|CIB/ },
    { name: '中信银行', test: /中信银行|CITIC/ },
    { name: '民生银行', test: /民生银行|CMBC/ },
    { name: '光大银行', test: /光大银行|CEB/ },
    { name: '广发银行', test: /广发银行|CGB/ },
    { name: '华夏银行', test: /华夏银行|HXB/ },
    { name: '邮政储蓄', test: /邮政储蓄|PSBC|邮储/ }
  ];

  for (const b of bankPatterns) {
    if (b.test.test(clean)) {
      const balMatch = clean.match(/(?:活期余额|账户余额|可用余额|总资产|余额)[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/i) ||
                       clean.match(/[¥￥]\s*([\d,]+\.\d{2})/);
      if (balMatch) {
        const bal = parseFloat(balMatch[1].replace(/,/g, ''));
        if (bal > 0) {
          const cardMatch = clean.match(/(?:尾号|\*{3,4})[\s:]*(\d{4})/);
          const cardLast4 = cardMatch ? cardMatch[1] : undefined;
          return {
            platform: b.name,
            accountType: 'bank',
            balance: bal,
            currency: 'CNY',
            cardLast4,
            note: cardLast4 ? `${b.name} (尾号*${cardLast4})` : `${b.name}储蓄账户`,
            confidence: 0.96
          };
        }
      }
    }
  }

  // 10. Multi-Bank Card List (e.g. UnionPay / Bank Card Aggregator screenshots)
  if (/储蓄卡\s*\(\d+\)|卡管理|余额总计/.test(clean)) {
    const cardLineRegex = /(工商银行|中国银行|建设银行|农业银行|招商银行|交通银行|民生银行|福建省?农村信用社?|农村商业银行|农商行|农信|浦发银行|光大银行|平安银行|中信银行|广发银行|华夏银行|邮政储蓄)[^\d\[\n]*\[?(\d{4})\]?[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/g;
    let match;
    let totalBal = 0;
    let primaryCard: ExtractedBalanceResult | null = null;

    while ((match = cardLineRegex.exec(clean)) !== null) {
      const bankName = match[1];
      const last4 = match[2];
      const bal = parseFloat(match[3].replace(/,/g, ''));
      if (bal >= 0) {
        totalBal += bal;
        if (!primaryCard && bal > 0) {
          primaryCard = {
            platform: `${bankName}(${last4})`,
            accountType: 'bank',
            balance: bal,
            currency: 'CNY',
            cardLast4: last4,
            note: `${bankName} [${last4}] 储蓄卡`,
            confidence: 0.98
          };
        }
      }
    }

    if (primaryCard) {
      return primaryCard;
    }
  }

  // 11. Securities & Stock Portfolio (华泰证券/招商证券/天天基金/同花顺)
  if (/证券|持仓|股票|ETF|纳指|标普|东方财富|天天基金|同花顺|涨乐财富通|两融|华泰/.test(clean)) {
    const secMatch = clean.match(/(?:总资产|总市值|持仓市值|证券资产)[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/i) ||
                     clean.match(/([\d,]+\.\d{2})/);
    if (secMatch) {
      const bal = parseFloat(secMatch[1].replace(/,/g, ''));
      if (bal > 0) {
        return {
          platform: '华泰证券/基金持仓',
          accountType: 'investment',
          balance: bal,
          currency: 'CNY',
          note: '证券与基金持仓总市值',
          confidence: 0.95
        };
      }
    }
  }

  return null;
}

/**
 * Extracts multiple bank card accounts from a single multi-card screenshot
 */
export function parseOfflineMultiBankCardList(rawText: string): ExtractedBalanceResult[] {
  if (!rawText || !rawText.trim()) return [];
  const clean = rawText.replace(/,/g, '');
  const results: ExtractedBalanceResult[] = [];
  const cardLineRegex = /(工商银行|中国银行|建设银行|农业银行|招商银行|交通银行|民生银行|福建省?农村信用社?|农村商业银行|农商行|农信|浦发银行|光大银行|平安银行|中信银行|广发银行|华夏银行|邮政储蓄)[^\d\[\n]*\[?(\d{4})\]?[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/g;
  let match;

  while ((match = cardLineRegex.exec(clean)) !== null) {
    const bankName = match[1];
    const last4 = match[2];
    const bal = parseFloat(match[3].replace(/,/g, ''));
    results.push({
      platform: `${bankName}(${last4})`,
      accountType: 'bank',
      balance: bal,
      currency: 'CNY',
      cardLast4: last4,
      note: `${bankName} [${last4}] 储蓄卡`,
      confidence: 0.98
    });
  }

  return results;
}
