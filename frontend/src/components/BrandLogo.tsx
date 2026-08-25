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
  | 'bank'
  | 'credit'
  | 'investment'
  | 'crypto'
  | 'cash'
  | 'other';

interface BrandLogoProps {
  type?: string;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function detectBrandType(type?: string, name?: string): BrandType {
  const text = `${type || ''} ${name || ''}`.toLowerCase();

  if (text.includes('花呗') || type === 'huabei') return 'huabei';
  if (text.includes('借呗') || type === 'jiebei') return 'jiebei';
  if (text.includes('白条') || text.includes('京东') || type === 'baitiao') return 'baitiao';
  if (text.includes('美团') || type === 'meituan_pay') return 'meituan_pay';
  if (text.includes('抖音') || type === 'douyin_pay') return 'douyin_pay';
  if (text.includes('分付') || text.includes('微粒贷') || type === 'fenfu') return 'fenfu';
  if (text.includes('微信') || text.includes('零钱') || text.includes('财付通')) return 'wechat';
  if (text.includes('支付宝') || text.includes('余额宝') || text.includes('蚂蚁')) return 'alipay';
  if (text.includes('证券') || text.includes('基金') || text.includes('股票') || text.includes('华泰') || type === 'investment') return 'investment';
  if (text.includes('加密') || text.includes('usdt') || text.includes('btc') || type === 'crypto') return 'crypto';
  if (text.includes('信用卡') || type === 'credit') return 'credit';
  if (text.includes('银行') || text.includes('储蓄') || type === 'bank') return 'bank';
  if (text.includes('现金') || type === 'cash') return 'cash';

  return 'other';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ type, name, className = '', size = 'md' }) => {
  const brand = detectBrandType(type, name);

  const sizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-9 h-9 text-sm'
  }[size];

  switch (brand) {
    // 🌸 蚂蚁花呗 (Alipay Huabei - Cyan Blue Brand)
    case 'huabei':
      return (
        <div className={`${sizeClasses} rounded-xl bg-[#1677FF] text-white flex items-center justify-center font-black shadow-sm flex-shrink-0 ${className}`} title="蚂蚁花呗">
          <svg viewBox="0 0 1024 1024" className="w-4/5 h-4/5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm172.5 567.8c-23.7 34.6-61.9 61.2-113.8 77.2-22.1 6.8-46.7 10.3-73.4 10.3-33.8 0-64.8-5.9-92.4-17.6-26.6-11.3-48.4-27.4-65-47.8-16.1-19.8-27.2-43.2-33-69.5-5.9-26.8-6.1-55.6-0.6-85.7 6.4-34.9 20.3-64.6 41.3-88.4 20.4-23.2 46.8-40.1 78.5-50.4 30.5-9.9 64.9-14.7 102.3-14.1 40.5 0.6 77.1 7.2 108.9 19.5v-78.6c-27.3-8.8-59.5-13.3-95.7-13.3-46.7 0-88.6 8.3-124.6 24.6-35.3 16-64.2 39.2-86 69-21.3 29.2-34.8 64.2-40.1 104.1-5.3 39.3-1.6 78.9 11 117.8 13.1 40.4 35.8 74.3 67.4 100.8 30.9 25.9 70 43.1 116.3 51.1 45.4 7.8 94.7 4.1 146.7-11.2 50.8-15 91.8-40.6 122-76.1l-69.8-66.7z" />
          </svg>
        </div>
      );

    // 💰 蚂蚁借呗 (Alipay Jiebei - Gold/Blue Brand)
    case 'jiebei':
      return (
        <div className={`${sizeClasses} rounded-xl bg-gradient-to-tr from-[#0E4496] to-[#1E78FF] text-amber-300 flex items-center justify-center font-black shadow-sm flex-shrink-0 ${className}`} title="蚂蚁借呗">
          <span className="font-sans font-black tracking-tighter">借</span>
        </div>
      );

    // 🐕 京东白条 (JD Baitiao - Crimson Red Brand)
    case 'baitiao':
      return (
        <div className={`${sizeClasses} rounded-xl bg-[#E1251B] text-white flex items-center justify-center font-black shadow-sm flex-shrink-0 ${className}`} title="京东白条">
          <span className="font-sans font-black tracking-tighter scale-90">白条</span>
        </div>
      );

    // 🦘 美团月付 (Meituan Pay - Golden Yellow Brand)
    case 'meituan_pay':
      return (
        <div className={`${sizeClasses} rounded-xl bg-[#FFC300] text-slate-900 flex items-center justify-center font-black shadow-sm flex-shrink-0 ${className}`} title="美团月付">
          <span className="font-sans font-black tracking-tighter scale-90">美团</span>
        </div>
      );

    // 🎵 抖音月付 (Douyin Pay - Black / Neon Brand)
    case 'douyin_pay':
      return (
        <div className={`${sizeClasses} rounded-xl bg-[#161823] text-[#25F4EE] border border-[#FE2C55]/40 flex items-center justify-center font-black shadow-sm flex-shrink-0 ${className}`} title="抖音月付">
          <span className="font-sans font-black tracking-tighter text-[#FE2C55] scale-90">抖</span>
        </div>
      );

    // 💬 微信分付 / 微粒贷 (WeChat Fenfu)
    case 'fenfu':
      return (
        <div className={`${sizeClasses} rounded-xl bg-[#07C160] text-white flex items-center justify-center font-black shadow-sm flex-shrink-0 ${className}`} title="微信分付">
          <span className="font-sans font-black tracking-tighter scale-90">分付</span>
        </div>
      );

    // 🟢 微信支付 / 微信零钱 (WeChat Pay)
    case 'wechat':
      return (
        <div className={`${sizeClasses} rounded-xl bg-[#07C160] text-white flex items-center justify-center font-bold shadow-sm flex-shrink-0 ${className}`} title="微信支付">
          <svg viewBox="0 0 24 24" className="w-4/5 h-4/5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.5 2C4.36 2 1 4.91 1 8.5c0 1.94.97 3.69 2.5 4.88V16l2.5-1.37c.75.24 1.57.37 2.5.37.28 0 .55-.02.82-.05C9.11 14.33 9 13.68 9 13c0-3.31 3.13-6 7-6 .17 0 .34 0 .5.02C15.68 4.2 12.38 2 8.5 2zm-2.25 4c.69 0 1.25.56 1.25 1.25S6.94 8.5 6.25 8.5 5 7.94 5 7.25 5.56 6 6.25 6zm4.5 0c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25-1.25-.56-1.25-1.25.56-1.25 1.25-1.25zM16 8c-3.31 0-6 2.24-6 5s2.69 5 6 5c.71 0 1.38-.11 2-.31L22 19v-2.07C23.23 15.93 24 14.54 24 13c0-2.76-2.69-5-6-5zm-2 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
          </svg>
        </div>
      );

    // 🔵 支付宝 / 余额宝 (Alipay)
    case 'alipay':
      return (
        <div className={`${sizeClasses} rounded-xl bg-[#1677FF] text-white flex items-center justify-center font-bold shadow-sm flex-shrink-0 ${className}`} title="支付宝">
          <span className="font-sans font-black tracking-tighter">支</span>
        </div>
      );

    // 📈 证券与基金持仓 (Securities & Funds)
    case 'investment':
      return (
        <div className={`${sizeClasses} rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm flex-shrink-0 ${className}`} title="证券与基金持仓">
          <span className="font-sans font-black tracking-tighter scale-90">证券</span>
        </div>
      );

    // 💳 银行信用卡 (Credit Card)
    case 'credit':
      return (
        <div className={`${sizeClasses} rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center font-bold shadow-sm flex-shrink-0 ${className}`} title="银行信用卡">
          <span className="font-sans font-black tracking-tighter scale-90">卡</span>
        </div>
      );

    // 🏦 银行储蓄卡 (Bank Account)
    case 'bank':
      return (
        <div className={`${sizeClasses} rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white flex items-center justify-center font-bold shadow-sm flex-shrink-0 ${className}`} title="银行储蓄卡">
          <span className="font-sans font-black tracking-tighter scale-90">银</span>
        </div>
      );

    default:
      return (
        <div className={`${sizeClasses} rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold flex-shrink-0 ${className}`}>
          💰
        </div>
      );
  }
};
