/**
 * marketData.ts - Real-Time Stock & Fund Market Quotation Engine (100% Genuine Public Financial APIs)
 * Powered by Tencent Finance Real-Time API (支持 A股、公募基金、ETF、港股、美股实时行情与最新净值)
 */

import { Investment, Account } from '../types';
import { api } from '../api/client';
import { localStore } from './localStore';

export interface MarketQuoteResult {
  code: string;
  name: string;
  currentPrice: number;
  changeRate: number;
  lastUpdate: string;
  suggestedType?: 'fund' | 'stock_a' | 'stock_hk_us' | 'crypto' | 'gold' | 'other';
  rawType?: string;
}

/**
 * Automatically maps standard Chinese security names or partial codes to standard 6-digit ticker codes
 */
export function resolveSecurityCode(name: string, explicitCode?: string): string {
  if (explicitCode && /^\d{5,6}$/.test(explicitCode.trim())) return explicitCode.trim();
  const cleanName = (name || '').trim();
  if (/纳指.*广发|广发.*纳指/i.test(cleanName)) return '159941';
  if (/标普.*500.*博时|博时.*标普|标普500/i.test(cleanName)) return '513500';
  if (/纳指科技/i.test(cleanName)) return '159509';
  if (/沪深300/i.test(cleanName)) return '510300';
  if (/中证500/i.test(cleanName)) return '510500';
  if (/中证1000/i.test(cleanName)) return '512100';
  if (/红利低波/i.test(cleanName)) return '512890';
  if (/恒生科技/i.test(cleanName)) return '513130';
  if (/中概互联/i.test(cleanName)) return '513050';
  if (/医疗ETF/i.test(cleanName)) return '512170';
  if (/半导体ETF/i.test(cleanName)) return '512480';
  if (/贵州茅台/i.test(cleanName)) return '600519';
  if (/腾讯控股/i.test(cleanName)) return '00700';
  if (/宁德时代/i.test(cleanName)) return '300750';
  if (/比亚迪/i.test(cleanName)) return '002594';
  return explicitCode || '159941';
}

/**
 * Maps a raw stock or fund code into Tencent Finance ticker format
 */
export function formatTencentTicker(code: string, type?: string): string {
  const clean = code.trim();
  if (!clean) return '';

  // If already formatted (e.g. sh510300, sz159941, jj005827, usAAPL)
  if (/^(sh|sz|jj|us|r_hk|hk)/i.test(clean)) {
    return clean.toLowerCase();
  }

  // US Stock (pure english letters, e.g. AAPL, TSLA, NVDA)
  if (/^[A-Za-z]+$/.test(clean)) {
    return `us${clean.toUpperCase()}`;
  }

  // Pure digits
  if (/^\d+$/.test(clean)) {
    // 5-digit HK Stock (e.g. 00700, 09988)
    if (clean.length === 5) {
      return `r_hk${clean}`;
    }

    if (clean.length === 6) {
      // Mutual Fund OTC (00xxxx, 01xxxx, 11xxxx, 16xxxx, 27xxxx, 05xxxx)
      if (type === 'fund' || clean.startsWith('00') || clean.startsWith('01') || clean.startsWith('11') || clean.startsWith('27') || clean.startsWith('05')) {
        // If 15xxxx or 51xxxx it is an ETF, otherwise try jj
        if (!clean.startsWith('15') && !clean.startsWith('51') && !clean.startsWith('56') && !clean.startsWith('58')) {
          return `jj${clean}`;
        }
      }

      // Shanghai ETF or Stock (5xxxxx, 6xxxxx, 688xxx)
      if (clean.startsWith('5') || clean.startsWith('6') || clean.startsWith('9')) {
        return `sh${clean}`;
      }

      // Shenzhen ETF or Stock (15xxxx, 16xxxx, 00xxxx, 30xxxx)
      if (clean.startsWith('15') || clean.startsWith('00') || clean.startsWith('30') || clean.startsWith('18')) {
        return `sz${clean}`;
      }

      return `sh${clean}`;
    }
  }

  return clean;
}

/**
 * Loads real financial quotes via JSONP script tag injection (Works in all browsers with 0 CORS blocking)
 */
export function fetchTencentBatchQuotes(tickers: string[]): Promise<Record<string, MarketQuoteResult>> {
  return new Promise((resolve) => {
    if (tickers.length === 0) {
      return resolve({});
    }

    const uniqueTickers = Array.from(new Set(tickers.filter(Boolean)));
    const queryParam = uniqueTickers.join(',');
    const scriptId = `tencent_quote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const script = document.createElement('script');
    script.id = scriptId;
    script.charset = 'gbk';
    script.src = `https://qt.gtimg.cn/q=${queryParam}&_t=${Date.now()}`;

    const cleanup = () => {
      const el = document.getElementById(scriptId);
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };

    script.onload = () => {
      const results: Record<string, MarketQuoteResult> = {};
      const win = window as any;

      for (const ticker of uniqueTickers) {
        const varName = `v_${ticker}`;
        const rawData: string = win[varName];

        if (rawData && typeof rawData === 'string') {
          const parts = rawData.split('~');
          if (parts.length > 3) {
            // Check if Fund format (jj)
            if (ticker.startsWith('jj')) {
              const code = parts[0] || ticker.replace('jj', '');
              const name = parts[1] || '';
              const nav = parseFloat(parts[5]) || parseFloat(parts[4]) || 1.0;
              const changeRate = parseFloat(parts[7]) || 0;
              const date = parts[8] || '';

              results[ticker] = {
                code,
                name,
                currentPrice: nav,
                changeRate,
                lastUpdate: date,
                suggestedType: 'fund',
                rawType: 'fund'
              };
            } else {
              // Stock / ETF format (sh / sz / us / r_hk)
              const name = parts[1] || '';
              const code = parts[2] || ticker;
              const currentPrice = parseFloat(parts[3]) || parseFloat(parts[4]) || 0;
              const changeRate = parseFloat(parts[32]) || 0;
              const date = parts[30] || '';

              let suggestedType: any = 'stock_a';
              if (ticker.startsWith('us')) suggestedType = 'stock_hk_us';
              else if (ticker.startsWith('r_hk')) suggestedType = 'stock_hk_us';
              else if (ticker.startsWith('sh51') || ticker.startsWith('sz15') || ticker.startsWith('sh56') || ticker.startsWith('sh58')) {
                suggestedType = 'fund';
              }

              if (currentPrice > 0) {
                results[ticker] = {
                  code,
                  name,
                  currentPrice,
                  changeRate,
                  lastUpdate: date,
                  suggestedType,
                  rawType: 'stock_or_etf'
                };
              }
            }
          }
        }
      }

      cleanup();
      resolve(results);
    };

    script.onerror = () => {
      cleanup();
      resolve({});
    };

    document.head.appendChild(script);
  });
}

/**
 * Real-time Single Quote Search / Identification when typing code
 */
export async function querySingleQuote(code: string, type?: string): Promise<MarketQuoteResult | null> {
  const clean = code.trim();
  if (!clean || clean.length < 2) return null;

  const candidates: string[] = [];
  const primary = formatTencentTicker(clean, type);
  if (primary) candidates.push(primary);

  if (/^\d{6}$/.test(clean)) {
    if (!primary.startsWith('jj')) candidates.push(`jj${clean}`);
    if (!primary.startsWith('sh')) candidates.push(`sh${clean}`);
    if (!primary.startsWith('sz')) candidates.push(`sz${clean}`);
  } else if (/^[A-Za-z]+$/.test(clean)) {
    candidates.push(`us${clean.toUpperCase()}`);
  }

  const quotes = await fetchTencentBatchQuotes(candidates);
  for (const c of candidates) {
    if (quotes[c] && quotes[c].currentPrice > 0) {
      return quotes[c];
    }
  }

  return null;
}

/**
 * Refreshes real-time quotes for all user holdings and synchronizes linked investment accounts!
 * ZERO conflict, ZERO double-counting!
 */
export async function refreshInvestmentQuotes(
  investments: Investment[]
): Promise<{ updatedCount: number; totalMarketVal: number; totalGain: number }> {
  if (investments.length === 0) {
    return { updatedCount: 0, totalMarketVal: 0, totalGain: 0 };
  }

  // 1. Build tickers mapping
  const tickerMap = new Map<string, string>();
  const allTickers: string[] = [];

  for (const inv of investments) {
    const ticker = formatTencentTicker(inv.code, inv.type);
    if (ticker) {
      tickerMap.set(inv.id, ticker);
      allTickers.push(ticker);
      if (inv.type === 'fund' && !ticker.startsWith('jj')) {
        allTickers.push(`jj${inv.code}`);
      }
    }
  }

  // 2. Query Tencent Finance API
  const quotes = await fetchTencentBatchQuotes(allTickers);

  let updatedCount = 0;
  let totalMarketVal = 0;
  let totalGain = 0;
  const accountMarketValMap = new Map<string, number>();

  // 3. Update each investment record
  for (const inv of investments) {
    const primaryTicker = tickerMap.get(inv.id) || '';
    const fallbackTicker = `jj${inv.code}`;
    const quote = quotes[primaryTicker] || quotes[fallbackTicker] || quotes[inv.code];

    if (quote && quote.currentPrice > 0) {
      inv.current_price = quote.currentPrice;
      if (quote.name && (!inv.name || inv.name === '投资标的' || inv.name === '新增标的' || inv.name === '300')) {
        inv.name = quote.name;
      }
      updatedCount++;
    }

    // Recompute financials
    inv.total_cost = inv.shares * inv.cost_price;
    inv.market_value = inv.shares * inv.current_price;
    inv.floating_pnl = (inv.current_price - inv.cost_price) * inv.shares;
    inv.pnl_rate = inv.cost_price > 0 ? ((inv.current_price - inv.cost_price) / inv.cost_price) * 100 : 0;

    totalMarketVal += inv.market_value;
    totalGain += inv.floating_pnl;

    if (inv.account_id) {
      accountMarketValMap.set(
        inv.account_id,
        (accountMarketValMap.get(inv.account_id) || 0) + inv.market_value
      );
    }

    await api.updateInvestment(inv.id, inv);
  }

  // 4. Synchronize linked Investment Accounts in `accounts` table so there is ZERO double-counting!
  const allAccounts = localStore.getAccounts();
  let accountsUpdated = false;

  for (const [accId, mVal] of accountMarketValMap.entries()) {
    const matchedAcc = allAccounts.find(a => a.id === accId && a.type === 'investment');
    if (matchedAcc) {
      const uninvestedCash = typeof matchedAcc.cash_balance === 'number' ? matchedAcc.cash_balance : 0;
      matchedAcc.balance = Math.round((mVal + uninvestedCash) * 100) / 100;
      accountsUpdated = true;
    }
  }

  if (accountsUpdated) {
    localStore.saveAccounts(allAccounts);
  }

  return { updatedCount, totalMarketVal, totalGain };
}
