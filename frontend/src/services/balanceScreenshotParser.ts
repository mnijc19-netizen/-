import { AccountType } from '../types';
import { ExtractedBalanceResult } from './aiParser';

/**
 * High-precision local offline parser for Chinese Payment & Banking Balance Screenshots
 * (WeChat Wallet, Alipay Assets, Major Banks, Securities & Funds)
 */
export function parseOfflineBalanceScreenshot(rawText: string): ExtractedBalanceResult | null {
  if (!rawText || !rawText.trim()) return null;

  const text = rawText.replace(/\r\n/g, '\n');
  const clean = text.replace(/,/g, ''); // remove comma in 1,144.45

  // 1. WeChat Wallet (微信钱包 / 微信零钱 / 零钱通)
  // Characteristic: "钱包", "零钱 ¥990.79", "零钱通", "支付分", "亲属卡"
  if (
    /零钱|零钱通|支付分|亲属卡|微信记账本/.test(clean) ||
    (/钱包/.test(clean) && !/支付宝|数字人民币|美团/.test(clean))
  ) {
    let platform = '微信零钱';
    let balance = 0;
    let note = '微信钱包余额';

    // Check for 零钱 amount
    const changeMatch = clean.match(/零钱[^\d\n]*[¥￥\s]*([\d,]+\.?\d*)/);
    const changeAmount = changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0;

    // Check for 零钱通 amount
    const tongMatch = clean.match(/零钱通[^\d\n]*[¥￥\s]*(?:收益率[\d\.]+%?[^\d\n]*)?([¥￥\s]*[\d,]+\.?\d*)/);
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
      // Generic first amount in page
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

  // 2. Alipay Assets (支付宝总资产 / 余额宝 / 蚂蚁财富)
  // Characteristic: "总资产", "我的资产", "资产概览", "余额宝", "理财资产", "活期资产", "进阶理财"
  if (
    /我的资产|资产概览|总资产|余额宝|理财资产|活期资产|稳健理财|进阶理财|蚂蚁财富|花呗|借呗|芝麻信用/.test(clean) &&
    !/微信/.test(clean)
  ) {
    let platform = '支付宝-总资产';
    let balance = 0;
    let note = '支付宝资产概览';

    // Primary Total: "我的资产 (元)" or "资产概览" -> amount
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
      // Fallback first prominent decimal
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

  // 3. Bank Accounts (招商银行, 工商银行, 建设银行, 农业银行, 中国银行, 交通银行, 邮储银行, 平安银行等)
  const bankPatterns: { name: string; regex: RegExp; type: AccountType }[] = [
    { name: '招商银行一卡通', regex: /招商银行|一卡通|朝朝宝|朝朝盈/, type: 'bank' },
    { name: '中国工商银行', regex: /中国工商银行|工行|工银/, type: 'bank' },
    { name: '中国建设银行', regex: /中国建设银行|建行|龙卡/, type: 'bank' },
    { name: '中国农业银行', regex: /中国农业银行|农行|金穗卡/, type: 'bank' },
    { name: '中国银行', regex: /中国银行|中行|中银/, type: 'bank' },
    { name: '交通银行', regex: /交通银行|交行|太平洋卡/, type: 'bank' },
    { name: '中国邮政储蓄银行', regex: /邮政储蓄|邮储银行|邮储/, type: 'bank' },
    { name: '平安银行', regex: /平安银行|平安口袋银行/, type: 'bank' },
    { name: '中信银行', regex: /中信银行|动卡空间/, type: 'bank' },
    { name: '浦发银行', regex: /浦发银行|浦发/, type: 'bank' },
    { name: '兴业银行', regex: /兴业银行|好兴动/, type: 'bank' },
    { name: '广发银行', regex: /广发银行|发现精彩/, type: 'bank' },
    { name: '民生银行', regex: /民生银行|全民生活/, type: 'bank' },
    { name: '光大银行', regex: /光大银行|阳光惠生活/, type: 'bank' },
    { name: '华泰证券', regex: /华泰证券|涨乐财富通/, type: 'investment' },
    { name: '东方财富证券', regex: /东方财富|东财/, type: 'investment' },
    { name: '天天基金', regex: /天天基金/, type: 'investment' },
    { name: '雪球证券', regex: /雪球|雪球基金/, type: 'investment' }
  ];

  for (const b of bankPatterns) {
    if (b.regex.test(clean)) {
      // Find card number last 4
      const last4Match = clean.match(/(?:尾号|卡号|尾号为|末四位)[\s\*]*(\d{4})/);
      const cardLast4 = last4Match ? last4Match[1] : undefined;

      // Find balance amount (e.g. "可用余额 15,200.00" or "人民币余额 15,200.00" or first decimal)
      const balMatch = clean.match(/(?:可用余额|账户余额|余额|可用资金|活期余额|总资产)[^\d\n]*[¥￥\s]*([\d,]+\.\d{2})/i) ||
                       clean.match(/[¥￥]\s*([\d,]+\.\d{2})/);
      
      const balance = balMatch ? parseFloat(balMatch[1].replace(/,/g, '')) : 0;
      if (balance > 0) {
        return {
          platform: cardLast4 ? `${b.name}(尾号${cardLast4})` : b.name,
          accountType: b.type,
          balance,
          currency: 'CNY',
          bankName: b.name.replace(/一卡通|信用卡|储蓄卡|\(.*\)/g, ''),
          cardLast4,
          note: `识别于 ${b.name}`,
          confidence: 0.95
        };
      }
    }
  }

  // 4. General Fallback: find any currency symbol with decimal number
  const genericAmountMatch = clean.match(/[¥￥]\s*([\d,]+\.\d{2})/) || clean.match(/([\d,]+\.\d{2})/);
  if (genericAmountMatch) {
    const bal = parseFloat(genericAmountMatch[1].replace(/,/g, ''));
    if (bal > 0) {
      return {
        platform: '资产账户',
        accountType: 'wallet',
        balance: bal,
        currency: 'CNY',
        note: '自动提取余额',
        confidence: 0.7
      };
    }
  }

  return null;
}
