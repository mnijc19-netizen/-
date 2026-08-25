/**
 * marketData.ts - Real-Time Stock & Fund Market Quotation Engine (100% Genuine Public Financial APIs)
 * Powered by Tencent Finance Real-Time API (支持 A股、公募基金、ETF、港股、美股实时行情与最新净值)
 */

import { Investment } from '../types';
import { api } from '../api/client';

export interface MarketQuoteResult {
  code: string;
  name: string;
  currentPrice: number;
  changeRate: number;
  lastUpdate: string;
  rawType?: string;
}

/**
 * Maps a raw stock or fund code into Tencent Finance ticker format
 * Examples:
 * - '510300' / '513500' -> 'sh510300' (Shanghai ETF)
 * - '159941' / '159915' -> 'sz159941' (Shenzhen ETF)
 * - '600519' -> 'sh600519' (Shanghai A-Share)
 * - '000001' / '300750' -> 'sz000001' / 'sz300750' (Shenzhen A-Share)
 * - '005827' / '110011' (Type: 'fund' or OTC) -> 'jj005827' (Mutual Fund)
 * - 'AAPL' / 'TSLA' -> 'usAAPL' (US Stock)
 * - '00700' / '09988' -> 'r_hk00700' (HK Stock)
 */
export function formatTencentTicker(code: string, type?: string): string {
  const clean = code.trim();
  if (!clean) return '';

  // If already formatted
  if (/^(sh|sz|jj|us|r_hk|hk)/i.test(clean)) {
    return clean.toLowerCase();
  }

  // US Stock (pure english letters)
  if (/^[A-Za-z]+$/.test(clean)) {
    return `us${clean.toUpperCase()}`;
  }

  // Pure digits
  if (/^\d+$/.test(clean)) {
    // 5-digit HK Stock
    if (clean.length === 5) {
      return `r_hk${clean}`;
    }

    if (clean.length === 6) {
      // Mutual Fund OTC
      if (type === 'fund' && (clean.startsWith('00') || clean.startsWith('01') || clean.startsWith('11') || clean.startsWith('16') || clean.startsWith('27') || clean.startsWith('05'))) {
        return `jj${clean}`;
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
                rawType: 'fund'
              };
            } else {
              // Stock / ETF format (sh / sz / us / r_hk)
              const name = parts[1] || '';
              const code = parts[2] || ticker;
              const currentPrice = parseFloat(parts[3]) || parseFloat(parts[4]) || 0;
              const changeRate = parseFloat(parts[32]) || 0;
              const date = parts[30] || '';

              if (currentPrice > 0) {
                results[ticker] = {
                  code,
                  name,
                  currentPrice,
                  changeRate,
                  lastUpdate: date,
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
 * Refreshes real-time quotes for all user holdings from Tencent Finance
 */
export async function refreshInvestmentQuotes(
  investments: Investment[]
): Promise<{ updatedCount: number; totalMarketVal: number; totalGain: number }> {
  if (investments.length === 0) {
    return { updatedCount: 0, totalMarketVal: 0, totalGain: 0 };
  }

  // 1. Build tickers mapping
  const tickerMap = new Map<string, string>(); // inv.id -> formattedTicker
  const allTickers: string[] = [];

  for (const inv of investments) {
    const ticker = formatTencentTicker(inv.code, inv.type);
    if (ticker) {
      tickerMap.set(inv.id, ticker);
      allTickers.push(ticker);
      // For funds, also try ETF prefix as fallback
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

  // 3. Update each investment record
  for (const inv of investments) {
    const primaryTicker = tickerMap.get(inv.id) || '';
    const fallbackTicker = `jj${inv.code}`;
    const quote = quotes[primaryTicker] || quotes[fallbackTicker] || quotes[inv.code];

    if (quote && quote.currentPrice > 0) {
      inv.current_price = quote.currentPrice;
      if (quote.name && (!inv.name || inv.name === '投资标的' || inv.name === '新增标的')) {
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

    await api.updateInvestment(inv.id, inv);
  }

  return { updatedCount, totalMarketVal, totalGain };
}
