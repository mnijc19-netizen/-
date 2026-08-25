import React from 'react';

export type BrandType = 
  | 'alipay'
  | 'huabei'
  | 'jiebei'
  | 'wechat'
  | 'fenfu'
  | 'baitiao'
  | 'meituan_pay'
  | 'douyin_pay'
  | 'bank_cmb'
  | 'bank_icbc'
  | 'bank_ccb'
  | 'bank_abc'
  | 'bank_boc'
  | 'bank'
  | 'credit'
  | 'htsc'
  | 'investment'
  | 'crypto'
  | 'cash'
  | 'other';

interface BrandLogoProps {
  type?: string;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function detectBrandType(type?: string, name?: string): BrandType {
  const text = `${type || ''} ${name || ''}`.toLowerCase();

  // 1. Credit & BNPL
  if (text.includes('花呗') || type === 'huabei') return 'huabei';
  if (text.includes('借呗') || type === 'jiebei') return 'jiebei';
  if (text.includes('白条') || text.includes('京东') || type === 'baitiao') return 'baitiao';
  if (text.includes('美团') || type === 'meituan_pay') return 'meituan_pay';
  if (text.includes('抖音') || text.includes('巨量') || type === 'douyin_pay') return 'douyin_pay';
  if (text.includes('分付') || text.includes('微粒贷') || type === 'fenfu') return 'fenfu';

  // 2. Wallets
  if (text.includes('微信') || text.includes('零钱') || text.includes('财付通')) return 'wechat';
  if (text.includes('支付宝') || text.includes('余额宝') || text.includes('蚂蚁')) return 'alipay';

  // 3. Specific Major Chinese Banks
  if (text.includes('招商') || text.includes('cmb') || text.includes('一网通')) return 'bank_cmb';
  if (text.includes('工商') || text.includes('icbc') || text.includes('工行')) return 'bank_icbc';
  if (text.includes('建设') || text.includes('ccb') || text.includes('建行')) return 'bank_ccb';
  if (text.includes('农业') || text.includes('abc') || text.includes('农行')) return 'bank_abc';
  if (text.includes('中国银行') || text.includes('boc') || text.includes('中行')) return 'bank_boc';

  // 4. Securities & Investments
  if (text.includes('华泰') || text.includes('涨乐') || text.includes('htsc')) return 'htsc';
  if (text.includes('证券') || text.includes('基金') || text.includes('股票') || text.includes('天天基金') || text.includes('同花顺') || text.includes('东方财富') || type === 'investment') return 'investment';

  // 5. General Categories
  if (text.includes('加密') || text.includes('usdt') || text.includes('btc') || text.includes('okx') || type === 'crypto') return 'crypto';
  if (text.includes('信用卡') || type === 'credit') return 'credit';
  if (text.includes('银行') || text.includes('储蓄') || type === 'bank') return 'bank';
  if (text.includes('现金') || type === 'cash') return 'cash';

  return 'other';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ type, name, className = '', size = 'md' }) => {
  const brand = detectBrandType(type, name);

  const sizeClasses = {
    sm: 'w-6 h-6 rounded-lg',
    md: 'w-8 h-8 rounded-xl',
    lg: 'w-10 h-10 rounded-2xl',
    xl: 'w-12 h-12 rounded-2xl'
  }[size];

  switch (brand) {
    // 🟢 微信支付 (Official WeChat App Icon - Smiling Speech Bubbles)
    case 'wechat':
      return (
        <div className={`${sizeClasses} bg-[#07C160] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="微信支付">
          <svg viewBox="0 0 100 100" className="w-[82%] h-[82%] fill-white drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            {/* Big Left Bubble */}
            <path d="M42 22C24.3 22 10 34.1 10 49c0 8.4 4.5 15.9 11.6 20.8L18 80l12.4-6.2c3.7 1.3 7.7 2.2 11.6 2.2 1.3 0 2.6-.1 3.9-.3-1.3-3.1-2-6.5-2-10.1 0-14.7 13.9-26.6 31.1-26.6 1.8 0 3.5.1 5.2.4C80 34.6 62.4 22 42 22z" />
            {/* Big Bubble Eyes */}
            <circle cx="28" cy="40" r="3.2" fill="#07C160" />
            <circle cx="48" cy="40" r="3.2" fill="#07C160" />
            {/* Small Right Bubble */}
            <path d="M68.5 42C53.9 42 42 51.9 42 64.1c0 12.2 11.9 22.1 26.5 22.1 3.2 0 6.3-.5 9.2-1.6l9.8 4.9-2.8-8.2c5.9-3.8 9.8-9.9 9.8-17.2 0-12.2-11.9-22.1-26.5-22.1z" />
            {/* Small Bubble Eyes */}
            <circle cx="58.5" cy="58" r="2.8" fill="#07C160" />
            <circle cx="75.5" cy="58" r="2.8" fill="#07C160" />
          </svg>
        </div>
      );

    // 💬 微信分付 / 微粒贷 (WeChat Fenfu)
    case 'fenfu':
      return (
        <div className={`${sizeClasses} bg-gradient-to-br from-[#07C160] to-[#049B4B] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="微信分付">
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 14C30.1 14 14 28.3 14 46c0 10 5.1 18.9 13.1 24.8L23 86l14.8-7.4c3.9 1.4 8 2.2 12.2 2.2 19.9 0 36-14.3 36-32S69.9 14 50 14z" opacity="0.9" />
            <path d="M36 42h28v6H53v20h-6V48h-11z" fill="#07C160" />
          </svg>
          <span className="absolute bottom-0.5 right-1 text-[8px] font-black text-white bg-black/30 px-1 rounded scale-75">分付</span>
        </div>
      );

    // 🔵 支付宝 (Official Alipay App Icon - '支' Calligraphy Glyph)
    case 'alipay':
      return (
        <div className={`${sizeClasses} bg-gradient-to-tr from-[#1677FF] to-[#1E88E5] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="支付宝">
          <svg viewBox="0 0 1024 1024" className="w-[78%] h-[78%] fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M839.2 460.6c-48.6-18.7-104.6-28.7-166.4-29.6V356.6h172v-65.7H581.6v-99.3h-79.6v99.3H179.2v65.7h322.8v74.4c-92.4 12.8-176.4 46.8-242.4 97.4l49.8 54.3c58.2-44.5 131.7-74.4 213.7-85.7 13.9 83.2 44.5 163.6 88.5 233.1-66.2 31.9-142.3 49.8-223.7 49.8-49.8 0-96.2-7.1-139.1-20.4l-20.4 69.2c50.2 15.7 104.4 24.3 161.4 24.3 98.7 0 191.1-23.7 271.8-65.7 69.8 85.3 158.4 148.9 261 180.8l52.1-59.5c-91.8-28.7-170.8-85.3-232.5-160.8 77.2-57.6 137.9-136.2 173.8-228.6 44.5 1.5 84.7 8.8 119.5 22.1l22.6-70.9z" />
          </svg>
        </div>
      );

    // 🌸 蚂蚁花呗 (Official Alipay Huabei App Icon - Ribbon Petal Ring Logo)
    case 'huabei':
      return (
        <div className={`${sizeClasses} bg-gradient-to-tr from-[#1677FF] to-[#0D62D9] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="蚂蚁花呗">
          <svg viewBox="0 0 1024 1024" className="w-[78%] h-[78%] fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M512 128C300 128 128 300 128 512s172 384 384 384 384-172 384-384S724 128 512 128zm0 696c-172.3 0-312-139.7-312-312s139.7-312 312-312 312 139.7 312 312-139.7 312-312 312z" opacity="0.25" />
            <path d="M685 640c-25 36-64 64-118 80-23 7-48 11-75 11-35 0-66-6-94-18-27-12-50-28-67-49-16-20-28-44-34-71-6-27-6-57-1-87 7-36 21-66 42-90 21-24 48-41 80-52 31-10 66-15 104-14 41 1 78 7 110 20v-80c-28-9-61-14-98-14-48 0-90 9-127 25-36 16-66 40-88 71-22 30-36 66-41 106-5 40-2 81 11 120 13 41 37 76 69 103 32 27 72 44 119 52 46 8 96 4 149-11 52-15 94-42 125-78l-67-67z" />
          </svg>
          <span className="absolute bottom-0.5 right-1 text-[8px] font-black text-white bg-black/30 px-1 rounded scale-75">花呗</span>
        </div>
      );

    // 💰 蚂蚁借呗 (Official Alipay Jiebei - Gold/Blue)
    case 'jiebei':
      return (
        <div className={`${sizeClasses} bg-gradient-to-tr from-[#0E4496] to-[#1E78FF] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="蚂蚁借呗">
          <svg viewBox="0 0 100 100" className="w-[80%] h-[80%]" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="#FFB800" />
            <circle cx="50" cy="50" r="32" fill="#0E4496" />
            <text x="50" y="62" fill="#FFD000" fontSize="34" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">借</text>
          </svg>
        </div>
      );

    // 🐕 京东 / 京东白条 (Official JD.com Red App Icon with Joy Puppy Silhouette)
    case 'baitiao':
      return (
        <div className={`${sizeClasses} bg-[#E1251B] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="京东白条">
          <svg viewBox="0 0 100 100" className="w-[84%] h-[84%] fill-white" xmlns="http://www.w3.org/2000/svg">
            {/* Cute JD Joy Puppy Head */}
            <path d="M50 18c-18 0-32 13-32 30 0 11 6 21 15 26l-2 10 12-5c2.3.6 4.7 1 7 1 18 0 32-13 32-30S68 18 50 18z" />
            {/* Floppy Left Ear */}
            <ellipse cx="25" cy="42" rx="7" ry="12" fill="#C91B12" transform="rotate(-20 25 42)" />
            {/* Floppy Right Ear */}
            <ellipse cx="75" cy="42" rx="7" ry="12" fill="#C91B12" transform="rotate(20 75 42)" />
            {/* Puppy Face Details */}
            <ellipse cx="40" cy="46" rx="3.5" ry="4.5" fill="#222" />
            <ellipse cx="60" cy="46" rx="3.5" ry="4.5" fill="#222" />
            <ellipse cx="50" cy="58" rx="6" ry="4" fill="#E1251B" />
            <path d="M46 64q4 4 8 0" stroke="#222" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          <span className="absolute bottom-0 right-0.5 text-[7px] font-black text-white bg-black/40 px-1 rounded-sm scale-90">白条</span>
        </div>
      );

    // 🦘 美团 / 美团月付 (Official Meituan App Icon - Kangaroo Head Silhouette on Yellow)
    case 'meituan_pay':
      return (
        <div className={`${sizeClasses} bg-[#FFD000] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="美团月付">
          <svg viewBox="0 0 100 100" className="w-[82%] h-[82%]" xmlns="http://www.w3.org/2000/svg">
            {/* Kangaroo Left Ear */}
            <path d="M36 12C32 12 28 26 35 44c4-1 9-4 9-10 0-16-4-22-8-22z" fill="#22242A" />
            {/* Kangaroo Right Ear */}
            <path d="M64 12C68 12 72 26 65 44c-4-1-9-4-9-10 0-16 4-22 8-22z" fill="#22242A" />
            {/* Head Silhouette */}
            <path d="M50 36c-18 0-28 14-28 28 0 14 12 24 28 24s28-10 28-24c0-14-10-28-28-28z" fill="#22242A" />
            {/* Cute Kangaroo Snout & Nose */}
            <ellipse cx="50" cy="68" rx="14" ry="11" fill="#FFE040" />
            <ellipse cx="50" cy="63" rx="5" ry="3.5" fill="#22242A" />
            {/* Eyes */}
            <ellipse cx="38" cy="50" rx="3.5" ry="4.5" fill="#FFD000" />
            <ellipse cx="62" cy="50" rx="3.5" ry="4.5" fill="#FFD000" />
          </svg>
          <span className="absolute bottom-0 right-0.5 text-[7px] font-black text-black bg-white/70 px-1 rounded-sm scale-90">月付</span>
        </div>
      );

    // 🎵 抖音 / 抖音月付 (Official Douyin 3D Neon Musical Note Logo)
    case 'douyin_pay':
      return (
        <div className={`${sizeClasses} bg-[#161823] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden border border-[#FE2C55]/30 ${className}`} title="抖音月付">
          <svg viewBox="0 0 100 100" className="w-[80%] h-[80%]" xmlns="http://www.w3.org/2000/svg">
            {/* Cyan Shadow Layer */}
            <path d="M64 20c3 6 8 11 15 13v12c-7-1-13-4-18-9v26c0 13-10 24-23 24s-24-11-24-24 11-23 24-23c2 0 4 .3 6 .8v12.5c-2-.6-4-.9-6-.9-7 0-12 5-12 12s5 12 12 12 12-5 12-12V20h14z" fill="#25F4EE" transform="translate(-2, -1)" />
            {/* Magenta Highlight Layer */}
            <path d="M64 20c3 6 8 11 15 13v12c-7-1-13-4-18-9v26c0 13-10 24-23 24s-24-11-24-24 11-23 24-23c2 0 4 .3 6 .8v12.5c-2-.6-4-.9-6-.9-7 0-12 5-12 12s5 12 12 12 12-5 12-12V20h14z" fill="#FE2C55" transform="translate(2, 1)" />
            {/* Crisp Center Note */}
            <path d="M64 20c3 6 8 11 15 13v12c-7-1-13-4-18-9v26c0 13-10 24-23 24s-24-11-24-24 11-23 24-23c2 0 4 .3 6 .8v12.5c-2-.6-4-.9-6-.9-7 0-12 5-12 12s5 12 12 12 12-5 12-12V20h14z" fill="#FFFFFF" />
          </svg>
          <span className="absolute bottom-0 right-0.5 text-[7px] font-black text-white bg-[#FE2C55]/80 px-1 rounded-sm scale-90">月付</span>
        </div>
      );

    // 🌸 招商银行 (CMB - Red Sunflower Icon)
    case 'bank_cmb':
      return (
        <div className={`${sizeClasses} bg-[#DE001A] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="招商银行">
          <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] fill-white" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="4" />
            <path d="M50 20c-16 0-30 14-30 30s14 30 30 30c6 0 12-2 17-6l-8-8c-3 1-6 2-9 2-10 0-18-8-18-18s8-18 18-18c6 0 11 3 14 7l8-8c-6-7-14-11-22-11z" />
            <circle cx="50" cy="50" r="8" fill="white" />
          </svg>
        </div>
      );

    // 🔴 中国工商银行 (ICBC - Red Round Coin Icon)
    case 'bank_icbc':
      return (
        <div className={`${sizeClasses} bg-[#C7000B] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="中国工商银行">
          <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] fill-white" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="6" />
            <path d="M32 30h36v8H54v24h14v8H32v-8h14V38H32z" />
          </svg>
        </div>
      );

    // 🔵 中国建设银行 (CCB - Blue CCB Icon)
    case 'bank_ccb':
      return (
        <div className={`${sizeClasses} bg-[#003B90] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="中国建设银行">
          <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 14L82 50 50 86 18 50z" fill="none" stroke="white" strokeWidth="6" />
            <circle cx="50" cy="50" r="16" fill="white" />
          </svg>
        </div>
      );

    // 🟢 中国农业银行 (ABC - Green Wheat Ear Icon)
    case 'bank_abc':
      return (
        <div className={`${sizeClasses} bg-[#008566] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="中国农业银行">
          <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] fill-white" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="6" />
            <path d="M50 20v60M36 34l28 32M64 34L36 66" stroke="white" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
      );

    // 🔴 中国银行 (BOC - Red Coin Icon)
    case 'bank_boc':
      return (
        <div className={`${sizeClasses} bg-[#B60005] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="中国银行">
          <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] fill-white" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="7" />
            <rect x="36" y="36" width="28" height="28" fill="none" stroke="white" strokeWidth="6" />
            <line x1="50" y1="10" x2="50" y2="90" stroke="white" strokeWidth="6" />
          </svg>
        </div>
      );

    // 📈 华泰证券 (Huatai Securities - Official Red & Blue HTSC Emblem)
    case 'htsc':
      return (
        <div className={`${sizeClasses} bg-gradient-to-tr from-[#0F3292] to-[#D32F2F] flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="华泰证券">
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%]" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,15 85,50 50,85 15,50" fill="#FFFFFF" opacity="0.9" />
            <polygon points="50,26 74,50 50,74 26,50" fill="#0F3292" />
            <polyline points="32,60 46,42 56,52 68,34" fill="none" stroke="#D32F2F" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute bottom-0 right-0.5 text-[7px] font-black text-white bg-black/40 px-1 rounded-sm scale-90">华泰</span>
        </div>
      );

    // 📈 证券与基金持仓 (Securities & Funds)
    case 'investment':
      return (
        <div className={`${sizeClasses} bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="证券与基金持仓">
          <svg viewBox="0 0 100 100" className="w-[78%] h-[78%] fill-none stroke-white stroke-[7]" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 80h70M22 68l22-26 18 14 24-30" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="72,26 86,26 86,40" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );

    // 💳 银行信用卡 (Credit Card)
    case 'credit':
      return (
        <div className={`${sizeClasses} bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="银行信用卡">
          <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] fill-white" xmlns="http://www.w3.org/2000/svg">
            <rect x="12" y="24" width="76" height="52" rx="8" fill="none" stroke="white" strokeWidth="6" />
            <rect x="12" y="38" width="76" height="12" fill="white" />
            <rect x="22" y="60" width="18" height="8" rx="2" fill="white" opacity="0.8" />
          </svg>
        </div>
      );

    // 🏦 通用银行储蓄卡 (Bank Account)
    case 'bank':
      return (
        <div className={`${sizeClasses} bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center shadow-sm flex-shrink-0 relative overflow-hidden ${className}`} title="银行储蓄卡">
          <svg viewBox="0 0 100 100" className="w-[78%] h-[78%] fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 16L14 36v8h72v-8L50 16zM22 50h10v24H22zm18 0h10v24H40zm18 0h10v24H58zm18 0h10v24H76zM10 80h80v8H10z" />
          </svg>
        </div>
      );

    default:
      return (
        <div className={`${sizeClasses} bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold flex-shrink-0 ${className}`}>
          💰
        </div>
      );
  }
};
