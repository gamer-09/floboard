import type { QuoteData } from '../context/MarketContext'

/**
 * Symbol aliases mapping spot gold, silver, platinum, palladium and common
 * forex notation to their live Yahoo Finance futures tickers.
 */
export const SYMBOL_ALIASES: Record<string, string> = {
  'XAUUSD=X': 'GC=F',
  'XAU/USD': 'GC=F',
  'XAUUSD': 'GC=F',
  'XAU=X': 'GC=F',
  'XAGUSD=X': 'SI=F',
  'XAG/USD': 'SI=F',
  'XAGUSD': 'SI=F',
  'XAG=X': 'SI=F',
  'XPTUSD=X': 'PL=F',
  'XPT/USD': 'PL=F',
  'XPTUSD': 'PL=F',
  'XPT=X': 'PL=F',
  'XPDUSD=X': 'PA=F',
  'XPD/USD': 'PA=F',
  'XPDUSD': 'PA=F',
  'XPD=X': 'PA=F',
  'TRUMP-USD': 'TRUMP35336-USD',
  'TRUMP': 'TRUMP35336-USD',
  'OFFICIAL-TRUMP-USD': 'TRUMP35336-USD',
  'TAO-USD': 'TAO22974-USD',
  'TAO': 'TAO22974-USD',
  'HYPE-USD': 'HYPE32196-USD',
  'HYPE': 'HYPE32196-USD',
  'USDE-USD': 'USDE29470-USD',
  'USDE': 'USDE29470-USD',
  'COMP-USD': 'COMP5692-USD',
  'COMP': 'COMP5692-USD',
  'POL-USD': 'POL28321-USD',
  'POL': 'POL28321-USD',
  'MATIC': 'POL28321-USD',
  'MATIC-USD': 'POL28321-USD',
  'IMX-USD': 'IMX10603-USD',
  'IMX': 'IMX10603-USD',
  'STX-USD': 'STX4847-USD',
  'GRT-USD': 'GRT6719-USD',
  'FTM-USD': 'S32684-USD',
  'FTM': 'S32684-USD',
  'RNDR-USD': 'RENDER-USD',
  'RNDR': 'RENDER-USD',
  '^TU': '2YY=F',
  'SQ': 'XYZ',
  '^PSI': 'PSI20.LS',
  '^VN30': '^VNINDEX.VN',
  '^IPSA': 'MXIPSAGC.SN',
  'LBS=F': 'LBR=F',
  'NI=F': 'NICK.L',
  'ZI=F': 'ZNC=F',
}

export function resolveSymbolAlias(sym: string): string {
  const s = sym.trim().toUpperCase()
  if (SYMBOL_ALIASES[s]) return SYMBOL_ALIASES[s]
  if (s.includes('/')) {
    const clean = s.replace('/', '')
    if (['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'].includes(clean)) {
      return SYMBOL_ALIASES[clean] || 'GC=F'
    }
    if (clean.endsWith('USD') && ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'DOGEUSD'].includes(clean)) {
      return clean.replace('USD', '-USD')
    }
    return `${clean}=X`
  }
  return s
}

export const STOCK_MCAPS: Record<string, number> = {
  AAPL: 3400000000000,
  MSFT: 3250000000000,
  NVDA: 3100000000000,
  GOOGL: 2200000000000,
  AMZN: 1950000000000,
  META: 1450000000000,
  TSLA: 800000000000,
  NFLX: 310000000000,
  JPM: 620000000000,
  GS: 175000000000,
  BAC: 320000000000,
  MA: 450000000000,
  V: 580000000000,
  UNH: 520000000000,
  JNJ: 380000000000,
  PG: 400000000000,
  KO: 280000000000,
  DIS: 210000000000,
  COST: 410000000000,
  HD: 390000000000,
  'BRK-B': 950000000000,
  TSM: 880000000000,
  ORCL: 480000000000,
  AMD: 240000000000,
  AVGO: 820000000000,
  WMT: 550000000000,
  XOM: 510000000000,
  PLTR: 180000000000,
  COIN: 65000000000,
  MSTR: 95000000000,
  UBER: 160000000000,
  INTC: 435300000000,
  LLY: 1088500000000,
  PFE: 143900000000,
  MRK: 325500000000,
  CVX: 373500000000,
  BA: 175000000000,
  F: 59600000000,
  NKE: 63800000000,
  MCD: 194000000000,
  VZ: 201200000000,
  T: 169000000000,
}

export function getFallbackMcap(sym: string): number {
  const upper = sym.trim().toUpperCase()
  if (STOCK_MCAPS[upper]) return STOCK_MCAPS[upper]
  if (upper.includes('=X') || upper.includes('/') || upper.startsWith('^')) return 0
  if (upper.endsWith('-USD')) return 10000000000
  return 50000000000
}

/** True when marketCap is the rounded placeholder, not a live Yahoo figure. */
export function isFallbackMcap(sym: string, mcap: number | null | undefined): boolean {
  if (mcap == null || !Number.isFinite(mcap) || mcap <= 0) return true
  return mcap === getFallbackMcap(sym)
}

const FALLBACK_PRICES: Record<string, { price: number; changePct: number; change: number; name: string; currency: string }> = {
  'XAUUSD=X': { price: 4025.80, changePct: 0.45, change: 18.20, name: 'Gold Spot / USD', currency: 'USD' },
  'XAU/USD': { price: 4025.80, changePct: 0.45, change: 18.20, name: 'Gold Spot / USD', currency: 'USD' },
  'XAGUSD=X': { price: 57.45, changePct: 0.92, change: 0.52, name: 'Silver Spot / USD', currency: 'USD' },
  'XAG/USD': { price: 57.45, changePct: 0.92, change: 0.52, name: 'Silver Spot / USD', currency: 'USD' },
  'XPTUSD=X': { price: 1615.00, changePct: -0.25, change: -4.10, name: 'Platinum Spot / USD', currency: 'USD' },
  'XPT/USD': { price: 1615.00, changePct: -0.25, change: -4.10, name: 'Platinum Spot / USD', currency: 'USD' },
  'XPDUSD=X': { price: 1265.00, changePct: 0.60, change: 7.50, name: 'Palladium Spot / USD', currency: 'USD' },
  'XPD/USD': { price: 1265.00, changePct: 0.60, change: 7.50, name: 'Palladium Spot / USD', currency: 'USD' },
  '^IRX': { price: 4.52, changePct: 0.03, change: 0.001, name: '13-Week Treasury Yield', currency: 'USD' },
  '^TU': { price: 4.18, changePct: -0.02, change: -0.001, name: '2-Year Treasury Yield', currency: 'USD' },
  '^FVX': { price: 4.24, changePct: 0.01, change: 0.001, name: '5-Year Treasury Yield', currency: 'USD' },
  '^TNX': { price: 4.42, changePct: 0.04, change: 0.002, name: '10-Year Treasury Yield', currency: 'USD' },
  '^TYX': { price: 4.68, changePct: 0.05, change: 0.002, name: '30-Year Treasury Yield', currency: 'USD' },
  'TAO22974-USD': { price: 193.72, changePct: 4.15, change: 7.72, name: 'Bittensor', currency: 'USD' },
  'HYPE32196-USD': { price: 54.87, changePct: 2.80, change: 1.49, name: 'Hyperliquid', currency: 'USD' },
  'ONDO-USD': { price: 0.4036, changePct: 1.45, change: 0.0058, name: 'Ondo Finance (RWA)', currency: 'USD' },
  'PYUSD-USD': { price: 1.0000, changePct: 0.01, change: 0.0001, name: 'PayPal USD', currency: 'USD' },
  'FDUSD-USD': { price: 0.9970, changePct: 0.02, change: 0.0002, name: 'First Digital USD', currency: 'USD' },
  'USDE29470-USD': { price: 0.9997, changePct: 0.02, change: 0.0002, name: 'Ethena USDe', currency: 'USD' },
  'COMP5692-USD': { price: 16.09, changePct: 1.12, change: 0.18, name: 'Compound', currency: 'USD' },
  'CRO-USD': { price: 0.0549, changePct: -0.35, change: -0.0002, name: 'Cronos', currency: 'USD' },
  'OKB-USD': { price: 84.51, changePct: 0.65, change: 0.55, name: 'OKB (OKX)', currency: 'USD' },
  'OFFICIAL-TRUMP-USD': { price: 67.81, changePct: 5.40, change: 3.48, name: 'Official Trump', currency: 'USD' },
  'ZS=F': { price: 1211.25, changePct: 0.35, change: 4.25, name: 'Soybean Futures', currency: 'USD' },
  'ZO=F': { price: 331.75, changePct: 0.75, change: 2.50, name: 'Oat Futures', currency: 'USD' },
  '^NDX': { price: 27763.13, changePct: 0.45, change: 124.50, name: 'Nasdaq 100', currency: 'USD' },
  '000001.SS': { price: 3828.47, changePct: 0.40, change: 15.20, name: 'Shanghai Comp', currency: 'CNY' },
  '^MOVE': { price: 76.09, changePct: -1.45, change: -1.10, name: 'MOVE Index', currency: 'USD' },
  '^VVIX': { price: 98.51, changePct: -2.38, change: -2.40, name: 'VVIX Volatility', currency: 'USD' },
}

export function getFallbackQuote(requestedSym: string): QuoteData {
  const sym = requestedSym.trim().toUpperCase()
  const known = FALLBACK_PRICES[sym]
  let price = 100.0
  let changePct = 0.25
  let change = 0.25
  let name = sym
  let currency = 'USD'

  if (known) {
    price = known.price
    changePct = known.changePct
    change = known.change
    name = known.name
    currency = known.currency
  } else {
    let hash = 0
    for (let i = 0; i < sym.length; i++) hash = (hash * 31 + sym.charCodeAt(i)) >>> 0
    if (sym.endsWith('=X') || sym.includes('/')) {
      price = +(1.0 + (hash % 500) / 1000).toFixed(4)
      change = +(0.001 * ((hash % 10) - 4)).toFixed(4)
      changePct = +((change / price) * 100).toFixed(2)
    } else if (sym.endsWith('-USD')) {
      price = +(10 + (hash % 5000) / 10).toFixed(2)
      change = +(0.1 * ((hash % 10) - 4)).toFixed(2)
      changePct = +((change / price) * 100).toFixed(2)
    } else {
      price = +(20 + (hash % 3000) / 10).toFixed(2)
      change = +(0.2 * ((hash % 10) - 4)).toFixed(2)
      changePct = +((change / price) * 100).toFixed(2)
    }
  }

  const prevClose = +(price - change).toFixed(4)
  return {
    symbol: requestedSym,
    shortName: name,
    quoteType:
      sym.includes('=X') || sym.includes('/') ? 'CURRENCY'
        : sym.endsWith('-USD') ? 'CRYPTOCURRENCY'
        : 'EQUITY',
    currency,
    regularMarketPrice: price,
    regularMarketChangePercent: changePct,
    regularMarketChange: change,
    regularMarketPreviousClose: prevClose,
    regularMarketOpen: prevClose,
    regularMarketDayHigh: +(price * 1.01).toFixed(4),
    regularMarketDayLow: +(price * 0.99).toFixed(4),
    regularMarketVolume: 1000000,
    fiftyTwoWeekHigh: +(price * 1.2).toFixed(4),
    fiftyTwoWeekLow: +(price * 0.8).toFixed(4),
    marketCap: getFallbackMcap(sym),
  }
}

export interface PricePoint {
  t: number
  c: number
  o?: number
  h?: number
  l?: number
}

/**
 * Old API stubs were 24/28/30 perfectly even bars (often ending on the
 * hash fallback price). Real 7d hourly series for short cash sessions
 * (Sensex, Nifty, Taiwan, …) can also be 28 points, but they have
 * overnight gaps — those must be kept.
 */
export function isStubHistory(
  prices: Array<{ t: number; c: number }>,
  fallbackPrice?: number,
): boolean {
  if (prices.length < 2) return true
  const n = prices.length
  const last = prices[n - 1]?.c
  const classic = n === 24 || n === 28 || n === 30
  if (
    classic &&
    fallbackPrice != null &&
    Number.isFinite(fallbackPrice) &&
    Number.isFinite(last) &&
    Math.abs(last - fallbackPrice) < 1e-3
  ) {
    return true
  }
  if (!classic) return false
  const step = prices[1].t - prices[0].t
  if (step <= 0) return true
  let even = 0
  for (let i = 1; i < n; i++) {
    if (Math.abs(prices[i].t - prices[i - 1].t - step) <= 2) even++
  }
  return even >= n - 2
}
