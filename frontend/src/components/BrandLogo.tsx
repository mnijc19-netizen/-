import React, { useState } from 'react';

export type BrandKey =
  // 1. Wallets & BNPL (互联网钱包与消费信贷)
  | 'wechat'
  | 'wechat_pay'
  | 'wechat_fenfu'
  | 'alipay'
  | 'huabei'
  | 'jiebei'
  | 'jd'
  | 'jd_baitiao'
  | 'meituan'
  | 'meituan_pay'
  | 'douyin'
  | 'douyin_pay'
  | 'weilidai'
  | 'mybank'
  | 'unionpay'
  | 'ysf'
  // 2. Fujian Local Financial Institutions (福建本地银行与金融机构)
  | 'bank_fjnx'
  | 'bank_cib'
  | 'bank_xm'
  | 'bank_xib'
  | 'bank_haixia'
  | 'bank_qz'
  | 'bank_xmrcb'
  | 'bank_fznx'
  // 3. National Big 6 State-Owned Banks (六大国有行)
  | 'bank_icbc'
  | 'bank_ccb'
  | 'bank_abc'
  | 'bank_boc'
  | 'bank_bocom'
  | 'bank_psbc'
  // 4. National Joint-Stock Commercial Banks (12家全国股份制商业银行)
  | 'bank_cmb'
  | 'bank_spdb'
  | 'bank_citic'
  | 'bank_cmbc'
  | 'bank_ceb'
  | 'bank_pab'
  | 'bank_hxb'
  | 'bank_cgb'
  | 'bank_czb'
  | 'bank_cbhb'
  | 'bank_hfb'
  // 5. Major City Banks (头部城商行与区域银行)
  | 'bank_bob'
  | 'bank_bos'
  | 'bank_jsb'
  | 'bank_nbcb'
  | 'bank_njcb'
  | 'bank_hzb'
  | 'bank_cdb'
  | 'bank_hsb'
  | 'bank_csb'
  | 'bank_cqb'
  | 'bank_gyb'
  | 'bank_tjb'
  | 'bank_hrb'
  | 'bank_zycb'
  | 'bank_sjb'
  | 'bank_szb'
  | 'bank_qdb'
  | 'bank_gzb'
  | 'bank_dgb'
  | 'bank_hkb'
  | 'bank_zzb'
  // 6. Securities & Funds (证券与基金券商)
  | 'htsc'
  | 'citics'
  | 'cms'
  | 'tiantian_fund'
  | 'tonghuashun'
  | 'eastmoney'
  | 'futu'
  | 'tiger_brokers'
  // 7. Crypto Assets (加密数字资产)
  | 'btc'
  | 'eth'
  | 'usdt'
  | 'binance'
  | 'okx'
  // 8. Card Networks (卡组织与清算)
  | 'visa'
  | 'mastercard'
  // 9. Generic Fallbacks
  | 'bank'
  | 'credit'
  | 'investment'
  | 'cash'
  | 'other';

export type BrandType = BrandKey;
export const detectBrandType = detectBrandKey;

interface BrandLogoProps {
  type?: string;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function detectBrandKey(type?: string, name?: string): BrandKey {
  const text = `${type || ''} ${name || ''}`.toLowerCase();

  // 1. Credit & BNPL (Specific first)
  if (text.includes('白条') || text.includes('jd_baitiao') || (text.includes('京东') && text.includes('条'))) return 'jd_baitiao';
  if (text.includes('京东金融') || text.includes('jd finance')) return 'jd_baitiao';
  if (text.includes('京东') || type === 'jd') return 'jd';
  if (text.includes('美团月付') || type === 'meituan_pay' || (text.includes('美团') && text.includes('月付'))) return 'meituan_pay';
  if (text.includes('美团') || type === 'meituan') return 'meituan';
  if (text.includes('抖音月付') || type === 'douyin_pay' || (text.includes('抖音') && text.includes('月付'))) return 'douyin_pay';
  if (text.includes('抖音') || type === 'douyin') return 'douyin';
  if (text.includes('花呗') || type === 'huabei') return 'huabei';
  if (text.includes('借呗') || type === 'jiebei') return 'jiebei';
  if (text.includes('分付') || type === 'fenfu' || text.includes('微信分付')) return 'wechat_fenfu';
  if (text.includes('微粒贷') || text.includes('微众') || type === 'weilidai') return 'weilidai';
  if (text.includes('网商银行') || text.includes('mybank')) return 'mybank';

  // 2. Wallets & Pay Apps
  if (text.includes('云闪付') || text.includes('ysf')) return 'unionpay';
  if (text.includes('微信支付') || text.includes('wechat_pay')) return 'wechat_pay';
  if (text.includes('微信') || text.includes('零钱') || text.includes('财付通') || type === 'wechat') return 'wechat';
  if (text.includes('支付宝') || text.includes('余额宝') || text.includes('蚂蚁') || type === 'alipay') return 'alipay';

  // 3. Fujian Local Financial Institutions (福建本地机构)
  if (text.includes('福建农信') || text.includes('省农信') || text.includes('农信社') || text.includes('fjnx')) return 'bank_fjnx';
  if (text.includes('福州农商') || text.includes('fznx')) return 'bank_fznx';
  if (text.includes('厦门银行') || text.includes('bank of xiamen')) return 'bank_xm';
  if (text.includes('厦门国际') || text.includes('xib')) return 'bank_xib';
  if (text.includes('海峡银行') || text.includes('haixia')) return 'bank_haixia';
  if (text.includes('泉州银行') || text.includes('qzbank') || text.includes('泉州')) return 'bank_qz';
  if (text.includes('厦门农商') || text.includes('xmrcb')) return 'bank_xmrcb';
  if (text.includes('兴业') || text.includes('cib') || text.includes('兴业银行')) return 'bank_cib';

  // 4. National Big 6 State-Owned Banks (六大国有行)
  if (text.includes('工商') || text.includes('icbc') || text.includes('工行')) return 'bank_icbc';
  if (text.includes('建设') || text.includes('ccb') || text.includes('建行')) return 'bank_ccb';
  if (text.includes('农业银行') || text.includes('abc') || text.includes('农行')) return 'bank_abc';
  if (text.includes('中国银行') || text.includes('boc') || text.includes('中行')) return 'bank_boc';
  if (text.includes('交通银行') || text.includes('bocom') || text.includes('交行')) return 'bank_bocom';
  if (text.includes('邮政') || text.includes('邮储') || text.includes('psbc')) return 'bank_psbc';

  // 5. National Joint-Stock Banks (12家全国股份制行)
  if (text.includes('招商证券') || text.includes('cms')) return 'cms';
  if (text.includes('招商') || text.includes('cmb') || text.includes('招行') || text.includes('一卡通') || text.includes('掌上生活')) return 'bank_cmb';
  if (text.includes('浦发') || text.includes('spdb') || text.includes('浦东发展')) return 'bank_spdb';
  if (text.includes('中信证券') || text.includes('信e投')) return 'citics';
  if (text.includes('中信') || text.includes('citic')) return 'bank_citic';
  if (text.includes('民生') || text.includes('cmbc')) return 'bank_cmbc';
  if (text.includes('光大') || text.includes('ceb')) return 'bank_ceb';
  if (text.includes('平安') || text.includes('pab')) return 'bank_pab';
  if (text.includes('华夏') || text.includes('hxb')) return 'bank_hxb';
  if (text.includes('广发') || text.includes('cgb')) return 'bank_cgb';
  if (text.includes('浙商') || text.includes('czb')) return 'bank_czb';
  if (text.includes('渤海') || text.includes('cbhb')) return 'bank_cbhb';
  if (text.includes('恒丰') || text.includes('hfb')) return 'bank_hfb';

  // 6. Major City Commercial Banks (重点城商行)
  if (text.includes('北京银行') || text.includes('bob')) return 'bank_bob';
  if (text.includes('上海银行') || text.includes('bos')) return 'bank_bos';
  if (text.includes('江苏银行') || text.includes('jsb')) return 'bank_jsb';
  if (text.includes('宁波银行') || text.includes('nbcb')) return 'bank_nbcb';
  if (text.includes('南京银行') || text.includes('njcb')) return 'bank_njcb';
  if (text.includes('杭州银行') || text.includes('hzb')) return 'bank_hzb';
  if (text.includes('成都银行') || text.includes('cdb')) return 'bank_cdb';
  if (text.includes('徽商银行') || text.includes('hsb')) return 'bank_hsb';
  if (text.includes('长沙银行') || text.includes('csb')) return 'bank_csb';
  if (text.includes('重庆银行') || text.includes('cqb')) return 'bank_cqb';
  if (text.includes('贵阳银行') || text.includes('gyb')) return 'bank_gyb';
  if (text.includes('天津银行') || text.includes('tjb')) return 'bank_tjb';
  if (text.includes('哈尔滨银行') || text.includes('hrb')) return 'bank_hrb';
  if (text.includes('中原银行') || text.includes('zycb')) return 'bank_zycb';
  if (text.includes('盛京银行') || text.includes('sjb')) return 'bank_sjb';
  if (text.includes('苏州银行') || text.includes('szb')) return 'bank_szb';
  if (text.includes('青岛银行') || text.includes('qdb')) return 'bank_qdb';
  if (text.includes('广州银行') || text.includes('gzb')) return 'bank_gzb';
  if (text.includes('东莞银行') || text.includes('dgb')) return 'bank_dgb';
  if (text.includes('汉口银行') || text.includes('hkb')) return 'bank_hkb';
  if (text.includes('郑州银行') || text.includes('zzb')) return 'bank_zzb';

  // 7. Securities & Funds (证券与基金)
  if (text.includes('华泰') || text.includes('涨乐') || text.includes('htsc')) return 'htsc';
  if (text.includes('天天基金') || text.includes('tiantian')) return 'tiantian_fund';
  if (text.includes('同花顺') || text.includes('ths') || text.includes('flush')) return 'tonghuashun';
  if (text.includes('东方财富') || text.includes('东财') || text.includes('eastmoney')) return 'eastmoney';
  if (text.includes('富途') || text.includes('futu')) return 'futu';
  if (text.includes('老虎') || text.includes('tiger')) return 'tiger_brokers';

  // 8. Crypto Assets (加密资产)
  if (text.includes('比特币') || text.includes('btc') || text.includes('bitcoin')) return 'btc';
  if (text.includes('以太坊') || text.includes('eth') || text.includes('ethereum')) return 'eth';
  if (text.includes('泰达') || text.includes('usdt') || text.includes('tether')) return 'usdt';
  if (text.includes('币安') || text.includes('binance')) return 'binance';
  if (text.includes('欧易') || text.includes('okx') || text.includes('okex')) return 'okx';

  // 9. Card Networks (卡组织)
  if (text.includes('银联') || text.includes('unionpay')) return 'unionpay';
  if (text.includes('visa')) return 'visa';
  if (text.includes('万事达') || text.includes('mastercard')) return 'mastercard';

  // 10. General Categories
  if (text.includes('证券') || text.includes('基金') || text.includes('股票') || type === 'investment') return 'investment';
  if (text.includes('加密') || type === 'crypto') return 'btc';
  if (text.includes('信用卡') || type === 'credit') return 'credit';
  if (text.includes('银行') || text.includes('储蓄') || type === 'bank') return 'bank';
  if (text.includes('现金') || type === 'cash') return 'cash';

  return 'other';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ type, name, className = '', size = 'md' }) => {
  const brandKey = detectBrandKey(type, name);
  const [useSvg, setUseSvg] = useState(false);
  const [allFailed, setAllFailed] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  }[size];

  // Base URL resolution for GitHub Pages vs Localhost
  const baseUrl = import.meta.env.BASE_URL || './';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const pngSrc = `${cleanBase}logos/${brandKey}.png`;
  const svgSrc = `${cleanBase}logos/${brandKey}.svg`;

  if (!allFailed && brandKey !== 'other' && brandKey !== 'bank' && brandKey !== 'credit' && brandKey !== 'investment' && brandKey !== 'cash') {
    return (
      <img
        src={useSvg ? svgSrc : pngSrc}
        alt={name || brandKey}
        onError={() => {
          if (!useSvg) {
            setUseSvg(true);
          } else {
            setAllFailed(true);
          }
        }}
        className={`${sizeClasses} flex-shrink-0 object-contain rounded-2xl shadow-sm transition-transform hover:scale-105 ${className}`}
        loading="lazy"
      />
    );
  }

  // Fallback vector SVGs if images fail to load
  switch (brandKey) {
    case 'credit':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="card_g_fb" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="220" fill="url(#card_g_fb)" />
          <rect x="180" y="270" width="664" height="484" rx="45" fill="none" stroke="#FFFFFF" strokeWidth="35" />
          <rect x="180" y="390" width="664" height="110" fill="#FFFFFF" />
          <rect x="260" y="580" width="130" height="85" rx="15" fill="#FFE082" />
          <circle cx="700" cy="620" r="45" fill="#FF5252" opacity="0.85" />
          <circle cx="750" cy="620" r="45" fill="#FFD700" opacity="0.85" />
        </svg>
      );

    case 'investment':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="inv_g_fb" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7E22CE" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="220" fill="url(#inv_g_fb)" />
          <path d="M180 800h664M240 680l220-260 180 140 240-300" stroke="#FFFFFF" strokeWidth="70" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <polyline points="740,260 880,260 880,400" stroke="#FFFFFF" strokeWidth="70" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );

    case 'bank':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bank_g_fb" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="220" fill="url(#bank_g_fb)" />
          <path d="M512 210L200 370v70h624v-70L512 210zM260 500h90v220h-90zm140 0h90v220h-90zm140 0h90v220h-90zm140 0h90v220h-90zM170 770h684v70H170z" fill="#FFFFFF" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="220" fill="#64748B" />
          <circle cx="512" cy="512" r="300" fill="#F8FAFC" />
          <text x="512" y="630" fill="#64748B" fontSize="380" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">¥</text>
        </svg>
      );
  }
};
