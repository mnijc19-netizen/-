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
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  }[size];

  switch (brand) {
    // 🟢 微信支付 (Official WeChat App Icon - Smiling Speech Bubbles)
    case 'wechat':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wechat_g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#28C445" />
              <stop offset="100%" stopColor="#07C160" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="230" fill="url(#wechat_g)" />
          {/* Big Left Bubble */}
          <path d="M438 214c-196 0-355 133-355 298 0 93 50 176 128 230L171 857l137-68c41 14 85 24 128 24 14 0 29-1 43-3-14-34-22-72-22-111 0-162 153-293 343-293 20 0 39 1 57 4C824 336 650 214 438 214z" fill="#FFFFFF" />
          <circle cx="284" cy="412" r="35" fill="#07C160" />
          <circle cx="504" cy="412" r="35" fill="#07C160" />
          {/* Small Right Bubble */}
          <path d="M729 434c-161 0-292 109-292 244 0 134 131 243 292 243 35 0 69-5 101-18l108 54-31-90c65-42 108-109 108-189 0-135-131-244-292-244z" fill="#FFFFFF" />
          <circle cx="619" cy="610" r="31" fill="#07C160" />
          <circle cx="806" cy="610" r="31" fill="#07C160" />
        </svg>
      );

    // 💬 微信分付 / 微粒贷 (WeChat Fenfu)
    case 'fenfu':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="fenfu_g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#07C160" />
              <stop offset="100%" stopColor="#04823F" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="230" fill="url(#fenfu_g)" />
          <path d="M512 180C300 180 140 320 140 500c0 100 55 190 140 250L240 880l160-75c36 12 74 18 112 18 212 0 372-140 372-323S724 180 512 180z" fill="#FFFFFF" opacity="0.95" />
          <path d="M370 420h284v60H542v210h-64V480H370z" fill="#07C160" />
        </svg>
      );

    // 🔵 支付宝 (Official Alipay App Icon - '支' Calligraphy Glyph)
    case 'alipay':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="alipay_g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1677FF" />
              <stop offset="100%" stopColor="#0052CC" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="230" fill="url(#alipay_g)" />
          <path d="M848 480c-52-20-112-30-178-31V368h184v-70H572v-106h-85v106H142v70h345v80c-99 14-189 50-260 104l53 58c62-48 141-80 229-92 15 89 48 175 95 249-71 34-152 53-240 53-53 0-103-8-149-22l-22 74c54 17 112 26 173 26 106 0 205-25 291-70 75 91 170 159 280 193l56-64c-98-31-183-91-249-172 83-62 148-146 186-245 48 2 91 9 128 24l25-76z" fill="#FFFFFF" />
        </svg>
      );

    // 🌸 蚂蚁花呗 (Official Alipay Huabei App Icon - Ribbon Petal Ring Logo)
    case 'huabei':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="huabei_g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1677FF" />
              <stop offset="100%" stopColor="#0E58C7" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="230" fill="url(#huabei_g)" />
          <path d="M512 140c-205 0-372 167-372 372s167 372 372 372 372-167 372-372-167-372-372-372zm167 495c-23 34-60 60-111 75-22 7-45 10-71 10-33 0-63-6-90-17-26-11-47-27-63-46-16-19-26-42-32-68-6-26-6-54-1-83 6-34 20-63 40-86 20-23 46-39 76-49 30-10 63-14 100-14 39 1 75 7 106 19v-76c-27-9-58-13-93-13-45 0-86 8-121 24-34 16-62 38-84 67-21 28-34 62-39 101-5 38-2 77 11 114 13 39 35 72 65 98 30 25 68 42 113 50 44 7 92 4 143-11 49-15 89-39 119-74l-68-65z" fill="#FFFFFF" />
        </svg>
      );

    // 💰 蚂蚁借呗 (Official Alipay Jiebei - Gold/Blue Coin Emblem)
    case 'jiebei':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="jiebei_g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E78FF" />
              <stop offset="100%" stopColor="#0B3C85" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="230" fill="url(#jiebei_g)" />
          <circle cx="512" cy="512" r="360" fill="#FFD700" />
          <circle cx="512" cy="512" r="290" fill="#0B3C85" />
          <text x="512" y="630" fill="#FFD700" fontSize="360" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">借</text>
        </svg>
      );

    // 🐕 京东 / 京东白条 (Official JD.com Red App Icon with Joy Puppy Silhouette)
    case 'baitiao':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="jd_g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F2270C" />
              <stop offset="100%" stopColor="#C91B12" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="230" fill="url(#jd_g)" />
          {/* Joy Puppy Head */}
          <path d="M512 180c-190 0-340 140-340 320 0 120 65 230 165 285L310 900l135-55c22 6 45 10 67 10 190 0 340-140 340-320S702 180 512 180z" fill="#FFFFFF" />
          {/* Floppy Left Ear */}
          <ellipse cx="240" cy="440" rx="75" ry="130" fill="#C91B12" transform="rotate(-20 240 440)" />
          {/* Floppy Right Ear */}
          <ellipse cx="784" cy="440" rx="75" ry="130" fill="#C91B12" transform="rotate(20 784 440)" />
          {/* Eyes */}
          <ellipse cx="400" cy="480" rx="38" ry="50" fill="#222222" />
          <ellipse cx="624" cy="480" rx="38" ry="50" fill="#222222" />
          {/* Red Nose */}
          <ellipse cx="512" cy="610" rx="65" ry="44" fill="#F2270C" />
          <path d="M470 675q42 42 84 0" stroke="#222222" strokeWidth="26" fill="none" strokeLinecap="round" />
        </svg>
      );

    // 🦘 美团 / 美团月付 (Official Meituan App Icon - Kangaroo Head Silhouette on Yellow)
    case 'meituan_pay':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="meituan_g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD000" />
              <stop offset="100%" stopColor="#FFC300" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="230" fill="url(#meituan_g)" />
          {/* Kangaroo Left Ear */}
          <path d="M370 120c-45 0-90 150-10 330 40-10 90-40 90-100 0-160-40-230-80-230z" fill="#22242A" />
          {/* Kangaroo Right Ear */}
          <path d="M654 120c45 0 90 150 10 330-40-10-90-40-90-100 0-160 40-230 80-230z" fill="#22242A" />
          {/* Kangaroo Head */}
          <path d="M512 360c-190 0-300 150-300 300 0 150 130 260 300 260s300-110 300-260c0-150-110-300-300-300z" fill="#22242A" />
          {/* Snout & Nose */}
          <ellipse cx="512" cy="710" rx="150" ry="120" fill="#FFE040" />
          <ellipse cx="512" cy="650" rx="55" ry="38" fill="#22242A" />
          {/* Eyes */}
          <ellipse cx="380" cy="510" rx="38" ry="48" fill="#FFD000" />
          <ellipse cx="644" cy="510" rx="38" ry="48" fill="#FFD000" />
        </svg>
      );

    // 🎵 抖音 / 抖音月付 (Official Douyin 3D Neon Musical Note Logo)
    case 'douyin_pay':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="230" fill="#161823" />
          <g transform="translate(60, 40)">
            {/* Cyan Layer */}
            <path d="M640 200c30 60 80 110 150 130v120c-70-10-130-40-180-90v260c0 130-100 240-230 240S150 750 150 620s110-230 240-230c20 0 40 3 60 8v125c-20-6-40-9-60-9-70 0-120 50-120 120s50 120 120 120 120-50 120-120V200h140z" fill="#25F4EE" transform="translate(-20, -10)" />
            {/* Magenta Layer */}
            <path d="M640 200c30 60 80 110 150 130v120c-70-10-130-40-180-90v260c0 130-100 240-230 240S150 750 150 620s110-230 240-230c20 0 40 3 60 8v125c-20-6-40-9-60-9-70 0-120 50-120 120s50 120 120 120 120-50 120-120V200h140z" fill="#FE2C55" transform="translate(20, 10)" />
            {/* White Core */}
            <path d="M640 200c30 60 80 110 150 130v120c-70-10-130-40-180-90v260c0 130-100 240-230 240S150 750 150 620s110-230 240-230c20 0 40 3 60 8v125c-20-6-40-9-60-9-70 0-120 50-120 120s50 120 120 120 120-50 120-120V200h140z" fill="#FFFFFF" />
          </g>
        </svg>
      );

    // 🌸 招商银行 (China Merchants Bank - Red Sunflower Rosette)
    case 'bank_cmb':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="230" fill="#DE001A" />
          <circle cx="512" cy="512" r="380" fill="none" stroke="#FFFFFF" strokeWidth="45" />
          <path d="M512 250c-145 0-262 117-262 262s117 262 262 262c55 0 106-17 148-46l-65-65c-25 10-53 16-83 16-95 0-172-77-172-172s77-172 172-172c55 0 102 26 132 66l68-68c-55-60-128-93-200-93z" fill="#FFFFFF" />
          <circle cx="512" cy="512" r="75" fill="#FFFFFF" />
        </svg>
      );

    // 🔴 中国工商银行 (ICBC - Red Coin '工' Emblem)
    case 'bank_icbc':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="230" fill="#C7000B" />
          <circle cx="512" cy="512" r="360" fill="none" stroke="#FFFFFF" strokeWidth="60" />
          <path d="M340 330h344v80H552v204h132v80H340v-80h132V410H340z" fill="#FFFFFF" />
        </svg>
      );

    // 🔵 中国建设银行 (CCB - Double CCB Emblem)
    case 'bank_ccb':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="230" fill="#003B90" />
          <path d="M512 180L784 512 512 844 240 512z" fill="none" stroke="#FFFFFF" strokeWidth="65" />
          <circle cx="512" cy="512" r="145" fill="#FFFFFF" />
        </svg>
      );

    // 🟢 中国农业银行 (ABC - Green Wheat Coin)
    case 'bank_abc':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="230" fill="#008566" />
          <circle cx="512" cy="512" r="360" fill="none" stroke="#FFFFFF" strokeWidth="60" />
          <path d="M512 240v544M380 370l264 284M644 370L380 654" stroke="#FFFFFF" strokeWidth="50" strokeLinecap="round" />
        </svg>
      );

    // 🔴 中国银行 (BOC - Red Square-in-Circle Coin)
    case 'bank_boc':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="230" fill="#B60005" />
          <circle cx="512" cy="512" r="360" fill="none" stroke="#FFFFFF" strokeWidth="70" />
          <rect x="372" y="372" width="280" height="280" fill="none" stroke="#FFFFFF" strokeWidth="60" />
          <line x1="512" y1="150" x2="512" y2="874" stroke="#FFFFFF" strokeWidth="60" />
        </svg>
      );

    // 📈 华泰证券 (Huatai Securities - Official Red & Blue HTSC Diamond)
    case 'htsc':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="230" fill="#0F3292" />
          <polygon points="512,180 844,512 512,844 180,512" fill="#FFFFFF" opacity="0.95" />
          <polygon points="512,280 744,512 512,744 280,512" fill="#0F3292" />
          <polyline points="340,620 470,430 570,530 690,340" fill="none" stroke="#DE001A" strokeWidth="55" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // 📈 证券与基金持仓 (Securities & Funds)
    case 'investment':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="inv_g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7E22CE" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="230" fill="url(#inv_g)" />
          <path d="M180 800h664M240 680l220-260 180 140 240-300" stroke="#FFFFFF" strokeWidth="70" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <polyline points="740,260 880,260 880,400" stroke="#FFFFFF" strokeWidth="70" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );

    // 💳 银行信用卡 (Credit Card)
    case 'credit':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="card_g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="230" fill="url(#card_g)" />
          <rect x="180" y="270" width="664" height="484" rx="45" fill="none" stroke="#FFFFFF" strokeWidth="35" />
          <rect x="180" y="390" width="664" height="110" fill="#FFFFFF" />
          <rect x="260" y="580" width="130" height="85" rx="15" fill="#FFE082" />
          <circle cx="700" cy="620" r="45" fill="#FF5252" opacity="0.85" />
          <circle cx="750" cy="620" r="45" fill="#FFD700" opacity="0.85" />
        </svg>
      );

    // 🏦 通用银行储蓄卡 (Bank Account)
    case 'bank':
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bank_g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="230" fill="url(#bank_g)" />
          <path d="M512 210L200 370v70h624v-70L512 210zM260 500h90v220h-90zm140 0h90v220h-90zm140 0h90v220h-90zm140 0h90v220h-90zM170 770h684v70H170z" fill="#FFFFFF" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 1024 1024" className={`${sizeClasses} flex-shrink-0 shadow-sm rounded-2xl ${className}`} xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="230" fill="#64748B" />
          <circle cx="512" cy="512" r="300" fill="#F8FAFC" />
          <text x="512" y="630" fill="#64748B" fontSize="380" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">¥</text>
        </svg>
      );
  }
};
