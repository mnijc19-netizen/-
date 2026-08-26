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
  ticker?: string;
  marketLabel?: string;
}

/**
 * Automatically maps standard Chinese security names or partial codes to standard 6-digit ticker codes
 */
export function resolveSecurityCode(name: string, explicitCode?: string): string {
  if (explicitCode && /^\d{5,6}$/.test(explicitCode.trim())) return explicitCode.trim();
  const cleanName = (name || '').trim();
  if (/德明利/i.test(cleanName)) return '001309';
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
    if (clean.toLowerCase().startsWith('us')) {
      return `us${clean.slice(2).toUpperCase()}`;
    }
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
      // Explicit A-share stock
      if (type === 'stock_a') {
        if (clean.startsWith('6') || clean.startsWith('5') || clean.startsWith('9')) {
          return `sh${clean}`;
        }
        return `sz${clean}`;
      }

      // Explicit fund
      if (type === 'fund') {
        if (clean.startsWith('15') || clean.startsWith('16')) return `sz${clean}`;
        if (clean.startsWith('51') || clean.startsWith('56') || clean.startsWith('58')) return `sh${clean}`;
        return `jj${clean}`;
      }

      // Default routing when type is unspecified:
      // Shanghai stock or ETF
      if (clean.startsWith('6') || clean.startsWith('51') || clean.startsWith('56') || clean.startsWith('58')) {
        return `sh${clean}`;
      }

      // Shenzhen stock or ETF (00xxxx, 30xxxx, 15xxxx, 16xxxx)
      if (clean.startsWith('00') || clean.startsWith('30') || clean.startsWith('15') || clean.startsWith('16')) {
        return `sz${clean}`;
      }

      // Fallback to mutual fund OTC
      return `jj${clean}`;
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

    const uniqueTickers = Array.from(new Set(tickers.map(t => {
      const tr = t.trim();
      if (tr.toLowerCase().startsWith('us')) {
        return `us${tr.slice(2).toUpperCase()}`;
      }
      return tr.toLowerCase();
    })));
    const queryParam = uniqueTickers.join(',');
    const cbName = `__tencent_quote_cb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const script = document.createElement('script');
    script.src = `https://qt.gtimg.cn/q=${queryParam}`;
    script.charset = 'gbk';

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete (window as any)[cbName];
    };

    const timeoutTimer = setTimeout(() => {
      cleanup();
      resolve({});
    }, 5000);

    script.onload = () => {
      clearTimeout(timeoutTimer);
      const results: Record<string, MarketQuoteResult> = {};
      const win = window as any;

      for (const ticker of uniqueTickers) {
        const rawData = win[`v_${ticker}`] || 
                        win[`v_${ticker.toLowerCase()}`] || 
                        win[`v_${ticker.toUpperCase()}`] || 
                        (ticker.toLowerCase().startsWith('us') ? win[`v_us${ticker.slice(2).toUpperCase()}`] : undefined);

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

              const item: MarketQuoteResult = {
                code,
                name,
                currentPrice: nav,
                changeRate,
                lastUpdate: date,
                suggestedType: 'fund',
                rawType: 'fund',
                ticker,
                marketLabel: '场外公募基金'
              };
              results[ticker] = item;
              results[ticker.toLowerCase()] = item;
              results[ticker.toUpperCase()] = item;
            } else {
              // Stock / ETF format (sh / sz / us / r_hk)
              const name = parts[1] || '';
              const code = ticker.toLowerCase().startsWith('us') ? ticker.slice(2).toUpperCase() : (parts[2] || ticker);
              const currentPrice = parseFloat(parts[3]) || parseFloat(parts[4]) || 0;
              const changeRate = parseFloat(parts[32]) || 0;
              const date = parts[30] || '';

              let suggestedType: any = 'stock_a';
              let marketLabel = 'A股股票';
              if (ticker.toLowerCase().startsWith('us')) {
                suggestedType = 'stock_hk_us';
                marketLabel = '美股';
              } else if (ticker.toLowerCase().startsWith('r_hk')) {
                suggestedType = 'stock_hk_us';
                marketLabel = '港股';
              } else if (ticker.startsWith('sh51') || ticker.startsWith('sz15') || ticker.startsWith('sh56') || ticker.startsWith('sh58')) {
                suggestedType = 'fund';
                marketLabel = '场内ETF基金';
              } else if (ticker.startsWith('sz00')) {
                marketLabel = '深A股票';
              } else if (ticker.startsWith('sh60') || ticker.startsWith('sh688')) {
                marketLabel = '沪A股票';
              } else if (ticker.startsWith('sz30')) {
                marketLabel = '创业板股票';
              }

              if (currentPrice > 0) {
                const item: MarketQuoteResult = {
                  code,
                  name,
                  currentPrice,
                  changeRate,
                  lastUpdate: date,
                  suggestedType,
                  rawType: 'stock_or_etf',
                  ticker,
                  marketLabel
                };
                results[ticker] = item;
                results[ticker.toLowerCase()] = item;
                results[ticker.toUpperCase()] = item;
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
 * Real-time Candidate Query: Returns ALL matching instruments for a given code
 * (Handles duplicate codes like 001309 which is both 德明利 and 东方红睿逸, and US stocks like AAPL)
 */
export async function queryAllQuotesForCode(code: string, preferredType?: string): Promise<MarketQuoteResult[]> {
  const clean = code.trim();
  if (!clean || clean.length < 2) return [];

  const candidates: string[] = [];

  if (/^\d{6}$/.test(clean)) {
    // 00xxxx: Crucial Chinese financial collision zone (e.g. 001309 is both 德明利 & 东方红睿逸)
    if (clean.startsWith('00')) {
      if (preferredType === 'stock_a') {
        candidates.push(`sz${clean}`, `jj${clean}`);
      } else if (preferredType === 'fund') {
        candidates.push(`jj${clean}`, `sz${clean}`);
      } else {
        candidates.push(`sz${clean}`, `jj${clean}`);
      }
    } else if (clean.startsWith('6')) {
      candidates.push(`sh${clean}`);
    } else if (clean.startsWith('30')) {
      candidates.push(`sz${clean}`);
    } else if (clean.startsWith('15') || clean.startsWith('16')) {
      candidates.push(`sz${clean}`, `jj${clean}`);
    } else if (clean.startsWith('51') || clean.startsWith('56') || clean.startsWith('58')) {
      candidates.push(`sh${clean}`);
    } else {
      candidates.push(`jj${clean}`, `sz${clean}`, `sh${clean}`);
    }
  } else if (/^\d{5}$/.test(clean)) {
    candidates.push(`r_hk${clean}`);
  } else if (/^[A-Za-z]+$/.test(clean)) {
    // Pure English letters: US Stock (e.g. AAPL, TSLA, NVDA)
    candidates.push(`us${clean.toUpperCase()}`);
  } else if (/^(us|hk|sh|sz|jj)/i.test(clean)) {
    candidates.push(formatTencentTicker(clean, preferredType));
  }

  const quotes = await fetchTencentBatchQuotes(candidates);
  const matched: MarketQuoteResult[] = [];
  for (const c of candidates) {
    const q = quotes[c] || quotes[c.toLowerCase()] || quotes[c.toUpperCase()];
    if (q && q.currentPrice > 0) {
      if (!matched.some(m => m.name === q.name && m.suggestedType === q.suggestedType)) {
        matched.push(q);
      }
    }
  }

  if (preferredType) {
    matched.sort((a, b) => {
      const aScore = a.suggestedType === preferredType ? -1 : 1;
      const bScore = b.suggestedType === preferredType ? -1 : 1;
      return aScore - bScore;
    });
  }

  return matched;
}

/**
 * Real-time Single Quote Search / Identification when typing code
 */
export async function querySingleQuote(code: string, type?: string): Promise<MarketQuoteResult | null> {
  const all = await queryAllQuotesForCode(code, type);
  if (all.length === 0) return null;
  if (type) {
    const exact = all.find(q => q.suggestedType === type);
    if (exact) return exact;
  }
  return all[0];
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
