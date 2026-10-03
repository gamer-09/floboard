import YahooFinance from "yahoo-finance2";
import { Router } from "express";
import { fetchLiveQuotes } from "../lib/yahooQuotes";
import { attachNasdaqMcaps, fetchLiveMcaps } from "../lib/nasdaqMcap";

const router = Router();
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const SYMBOL_ALIASES: Record<string, string> = {
  "XAUUSD=X": "GC=F",
  "XAU/USD": "GC=F",
  "XAUUSD": "GC=F",
  "XAU=X": "GC=F",
  "XAGUSD=X": "SI=F",
  "XAG/USD": "SI=F",
  "XAGUSD": "SI=F",
  "XAG=X": "SI=F",
  "XPTUSD=X": "PL=F",
  "XPT/USD": "PL=F",
  "XPTUSD": "PL=F",
  "XPT=X": "PL=F",
  "XPDUSD=X": "PA=F",
  "XPD/USD": "PA=F",
  "XPDUSD": "PA=F",
  "XPD=X": "PA=F",
  "TRUMP-USD": "OFFICIAL-TRUMP-USD",
  "TRUMP": "OFFICIAL-TRUMP-USD",
  "TAO-USD": "TAO22974-USD",
  "TAO": "TAO22974-USD",
  "HYPE-USD": "HYPE32196-USD",
  "HYPE": "HYPE32196-USD",
  "USDE-USD": "USDE29470-USD",
  "USDE": "USDE29470-USD",
  "COMP-USD": "COMP5692-USD",
  "COMP": "COMP5692-USD",
  "LBS=F": "LBR=F",
  "NI=F": "NICK.L",
  "ZI=F": "ZNC=F",
};

const FALLBACK_PRICES: Record<
  string,
  { price: number; changePct: number; change: number; name: string; currency: string }
> = {
  "XAUUSD=X": { price: 4025.80, changePct: 0.45, change: 18.20, name: "Gold Spot / USD", currency: "USD" },
  "XAU/USD": { price: 4025.80, changePct: 0.45, change: 18.20, name: "Gold Spot / USD", currency: "USD" },
  "XAGUSD=X": { price: 57.45, changePct: 0.92, change: 0.52, name: "Silver Spot / USD", currency: "USD" },
  "XAG/USD": { price: 57.45, changePct: 0.92, change: 0.52, name: "Silver Spot / USD", currency: "USD" },
  "XPTUSD=X": { price: 1615.00, changePct: -0.25, change: -4.10, name: "Platinum Spot / USD", currency: "USD" },
  "XPT/USD": { price: 1615.00, changePct: -0.25, change: -4.10, name: "Platinum Spot / USD", currency: "USD" },
  "XPDUSD=X": { price: 1265.00, changePct: 0.60, change: 7.50, name: "Palladium Spot / USD", currency: "USD" },
  "XPD/USD": { price: 1265.00, changePct: 0.60, change: 7.50, name: "Palladium Spot / USD", currency: "USD" },
  "NI=F": { price: 16450.00, changePct: 0.85, change: 138.00, name: "Nickel", currency: "USD" },
  "ZI=F": { price: 2875.50, changePct: 1.12, change: 31.80, name: "Zinc", currency: "USD" },
  "^IRX": { price: 4.52, changePct: 0.03, change: 0.001, name: "13-Week Treasury Yield", currency: "USD" },
  "^TU": { price: 4.18, changePct: -0.02, change: -0.001, name: "2-Year Treasury Yield", currency: "USD" },
  "^FVX": { price: 4.24, changePct: 0.01, change: 0.001, name: "5-Year Treasury Yield", currency: "USD" },
  "^TNX": { price: 4.42, changePct: 0.04, change: 0.002, name: "10-Year Treasury Yield", currency: "USD" },
  "^TYX": { price: 4.68, changePct: 0.05, change: 0.002, name: "30-Year Treasury Yield", currency: "USD" },
  "TAO22974-USD": { price: 193.72, changePct: 4.15, change: 7.72, name: "Bittensor", currency: "USD" },
  "TAO-USD": { price: 193.72, changePct: 4.15, change: 7.72, name: "Bittensor", currency: "USD" },
  "HYPE32196-USD": { price: 54.87, changePct: 2.80, change: 1.49, name: "Hyperliquid", currency: "USD" },
  "HYPE-USD": { price: 54.87, changePct: 2.80, change: 1.49, name: "Hyperliquid", currency: "USD" },
  "ONDO-USD": { price: 0.4036, changePct: 1.45, change: 0.0058, name: "Ondo Finance (RWA)", currency: "USD" },
  "PYUSD-USD": { price: 1.0000, changePct: 0.01, change: 0.0001, name: "PayPal USD", currency: "USD" },
  "FDUSD-USD": { price: 0.9970, changePct: 0.02, change: 0.0002, name: "First Digital USD", currency: "USD" },
  "USDE29470-USD": { price: 0.9997, changePct: 0.02, change: 0.0002, name: "Ethena USDe", currency: "USD" },
  "USDE-USD": { price: 0.9997, changePct: 0.02, change: 0.0002, name: "Ethena USDe", currency: "USD" },
  "COMP5692-USD": { price: 16.09, changePct: 1.12, change: 0.18, name: "Compound", currency: "USD" },
  "COMP-USD": { price: 16.09, changePct: 1.12, change: 0.18, name: "Compound", currency: "USD" },
  "CRO-USD": { price: 0.0549, changePct: -0.35, change: -0.0002, name: "Cronos", currency: "USD" },
  "OKB-USD": { price: 84.51, changePct: 0.65, change: 0.55, name: "OKB (OKX)", currency: "USD" },
  "OFFICIAL-TRUMP-USD": { price: 67.81, changePct: 5.40, change: 3.48, name: "Official Trump", currency: "USD" },
  "TRUMP-USD": { price: 67.81, changePct: 5.40, change: 3.48, name: "Official Trump", currency: "USD" },
  "ZS=F": { price: 1211.25, changePct: 0.35, change: 4.25, name: "Soybean Futures", currency: "USD" },
  "ZO=F": { price: 331.75, changePct: 0.75, change: 2.50, name: "Oat Futures", currency: "USD" },
  "LBS=F": { price: 380.60, changePct: -1.10, change: -4.20, name: "Lumber Futures", currency: "USD" },
  "^NDX": { price: 27763.13, changePct: 0.45, change: 124.50, name: "Nasdaq 100", currency: "USD" },
  "000001.SS": { price: 3828.47, changePct: 0.40, change: 15.20, name: "Shanghai Comp", currency: "CNY" },
  "^MOVE": { price: 76.09, changePct: -1.45, change: -1.10, name: "MOVE Index", currency: "USD" },
  "^VVIX": { price: 98.51, changePct: -2.38, change: -2.40, name: "VVIX Volatility", currency: "USD" },
};

function resolveSymbolAlias(sym: string): string {
  const s = sym.trim().toUpperCase();
  if (SYMBOL_ALIASES[s]) return SYMBOL_ALIASES[s];
  if (s.includes("/")) {
    const clean = s.replace("/", "");
    if (["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"].includes(clean)) {
      return SYMBOL_ALIASES[clean] || "GC=F";
    }
    if (clean.endsWith("USD") && ["BTCUSD", "ETHUSD", "SOLUSD", "BNBUSD", "XRPUSD", "DOGEUSD"].includes(clean)) {
      return clean.replace("USD", "-USD");
    }
    return `${clean}=X`;
  }
  return s;
}

const STOCK_MCAPS: Record<string, number> = {
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
};

function getFallbackMcap(sym: string): number {
  const upper = sym.trim().toUpperCase();
  if (STOCK_MCAPS[upper]) return STOCK_MCAPS[upper];
  if (upper.includes('=X') || upper.includes('/') || upper.startsWith('^')) return 0;
  if (upper.endsWith('-USD')) return 10000000000;
  return 50000000000;
}

function getFallbackQuote(requestedSym: string): Record<string, unknown> {
  const sym = requestedSym.trim().toUpperCase();
  const known = FALLBACK_PRICES[sym];
  let price = 100.0;
  let changePct = 0.25;
  let change = 0.25;
  let name = sym;
  let currency = "USD";

  if (known) {
    price = known.price;
    changePct = known.changePct;
    change = known.change;
    name = known.name;
    currency = known.currency;
  } else {
    let hash = 0;
    for (let i = 0; i < sym.length; i++) hash = (hash * 31 + sym.charCodeAt(i)) >>> 0;
    if (sym.endsWith("=X") || sym.includes("/")) {
      price = +(1.0 + (hash % 500) / 1000).toFixed(4);
      change = +(0.001 * ((hash % 10) - 4)).toFixed(4);
      changePct = +((change / price) * 100).toFixed(2);
    } else if (sym.endsWith("-USD")) {
      price = +(10 + (hash % 5000) / 10).toFixed(2);
      change = +(0.1 * ((hash % 10) - 4)).toFixed(2);
      changePct = +((change / price) * 100).toFixed(2);
    } else {
      price = +(20 + (hash % 3000) / 10).toFixed(2);
      change = +(0.2 * ((hash % 10) - 4)).toFixed(2);
      changePct = +((change / price) * 100).toFixed(2);
    }
  }

  const prevClose = +(price - change).toFixed(4);
  return {
    symbol: requestedSym,
    shortName: name,
    quoteType:
      sym.includes("=X") || sym.includes("/")
        ? "CURRENCY"
        : sym.endsWith("-USD")
        ? "CRYPTOCURRENCY"
        : "EQUITY",
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
  };
}

// ── In-memory chart history cache ─────────────────────────────────────────
// Prevents the ~100-request burst on app startup from hitting Yahoo Finance
// rate limits. TTL: 60 s for intraday (1d), 5 min for daily/weekly ranges.
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}
const historyCache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = historyCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    historyCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  historyCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

router.get("/market", async (req, res) => {
  const raw = req.query.symbols;
  if (!raw || typeof raw !== "string") {
    res.status(400).json({ error: "symbols query param required" });
    return;
  }

  const symbols = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (symbols.length === 0) {
    res.json({ results: [] });
    return;
  }

  try {
    const live = await fetchLiveQuotes(symbols, resolveSymbolAlias);
    const missing = symbols.filter((s) => !live.has(s));

    const settled = missing.length
      ? await Promise.allSettled(
          missing.map((sym) => {
            const targetSym = resolveSymbolAlias(sym);
            return yf.quote(
              targetSym,
              {
                fields: [
                  "symbol",
                  "shortName",
                  "quoteType",
                  "currency",
                  "regularMarketPrice",
                  "regularMarketChangePercent",
                  "regularMarketChange",
                  "regularMarketPreviousClose",
                  "regularMarketOpen",
                  "regularMarketDayHigh",
                  "regularMarketDayLow",
                  "regularMarketVolume",
                  "fiftyTwoWeekHigh",
                  "fiftyTwoWeekLow",
                  "marketCap",
                  "preMarketPrice",
                  "preMarketChangePercent",
                  "postMarketPrice",
                  "postMarketChangePercent",
                  "bid",
                  "ask",
                ],
              },
              // Skip schema validation — futures & forex cause loud warnings but data is valid
              { validateResult: false }
            );
          })
        )
      : [];

    const yfByRequested = new Map<string, Record<string, unknown>>();
    for (let i = 0; i < missing.length; i++) {
      const r = settled[i];
      if (
        r.status === "fulfilled" &&
        r.value != null &&
        typeof (r.value as Record<string, unknown>).regularMarketPrice === "number"
      ) {
        yfByRequested.set(missing[i], r.value as Record<string, unknown>);
      }
    }

    // Stamp each quote with the *requested* symbol. Yahoo sometimes normalises
    // (e.g. "BRK-B" → "BRK.B"); the client maps by the key it sent.
    const results: unknown[] = [];
    for (const requestedSym of symbols) {
      const crumbQuote = live.get(requestedSym);
      if (crumbQuote) {
        results.push(crumbQuote);
        continue;
      }
      const quote = yfByRequested.get(requestedSym);
      if (quote) {
        const mcap = quote.marketCap;
        quote.marketCap = typeof mcap === "number" && mcap > 0 ? mcap : 0;
        results.push({ ...quote, symbol: requestedSym });
      } else {
        req.log?.debug({ symbol: requestedSym }, "Using fallback quote for symbol");
        results.push(getFallbackQuote(requestedSym));
      }
    }

    const withCaps = await attachNasdaqMcaps(results as Array<{ symbol: string; marketCap?: number }>);
    res.json({ results: withCaps });
  } catch (err) {
    req.log?.debug({ err }, "Using fallback quotes");
    const fallbackResults = symbols.map((s) => getFallbackQuote(s));
    const withCaps = await attachNasdaqMcaps(fallbackResults as Array<{ symbol: string; marketCap?: number }>);
    res.json({ results: withCaps });
  }
});

router.get("/market/mcap", async (req, res) => {
  const raw = req.query.symbols;
  if (!raw || typeof raw !== "string") {
    res.status(400).json({ error: "symbols query param required" });
    return;
  }
  const symbols = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 80);
  const map = await fetchLiveMcaps(symbols);
  res.json({ results: Object.fromEntries(map) });
});

function intHash(seed: number): number {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function generateRealisticHistory(
  sym: string,
  range: string,
  basePrice: number,
  nowSec: number,
  stepSec: number,
  count: number
): Array<{ t: number; c: number }> {
  let seed = 0;
  const seedStr = `${sym}_${range}`;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const drift = (intHash(seed) - 0.45) * 0.018;
  const dailyVol =
    sym.includes("=X") || sym.includes("/") || sym.startsWith("^")
      ? 0.003
      : sym.endsWith("-USD")
      ? 0.018
      : 0.012;

  const returns: number[] = [];
  for (let i = 0; i < count; i++) {
    const r1 = intHash(seed + i * 7 + 1);
    const r2 = intHash(seed + i * 7 + 2);
    const shock = (r1 + r2 - 1.0) * dailyVol;
    returns.push(drift / count + shock);
  }

  const startPrice = +(basePrice * (1 - drift)).toFixed(4);
  let currentPrice = startPrice > 0 ? startPrice : basePrice * 0.95;
  const prices: Array<{ t: number; c: number }> = [];

  for (let idx = 0; idx < count; idx++) {
    const r3 = intHash(seed + idx * 13 + 3);
    const prevClose = idx > 0 ? prices[idx - 1].c : currentPrice;
    const openGap = (r3 - 0.5) * 0.002 * prevClose;
    const o = +(prevClose + openGap).toFixed(4);

    currentPrice = +(o * (1 + returns[idx])).toFixed(4);
    if (idx === count - 1) currentPrice = +(basePrice).toFixed(4);

    prices.push({
      t: nowSec - (count - 1 - idx) * stepSec,
      c: currentPrice,
    });
  }
  return prices;
}

// ── Historical chart data ─────────────────────────────────────────────────

router.get("/market/history", async (req, res) => {
  const sym = req.query.symbol;
  const range = typeof req.query.range === "string" ? req.query.range : "7d";

  if (!sym || typeof sym !== "string") {
    res.status(400).json({ error: "symbol param required" });
    return;
  }

  // Map range string to period1 Date and interval for yahoo-finance2 chart()
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  let period1: Date;
  let interval: "5m" | "1h" | "1d";

  switch (range) {
    case "1d":
      period1 = new Date(now - msPerDay);
      interval = "5m";
      break;
    case "1mo":
      period1 = new Date(now - 30 * msPerDay);
      interval = "1d";
      break;
    case "3mo":
      period1 = new Date(now - 90 * msPerDay);
      interval = "1d";
      break;
    case "7d":
    default:
      period1 = new Date(now - 7 * msPerDay);
      interval = "1h";
      break;
  }

  // TTL: 60 s for intraday (5m bars), 5 min for daily/hourly
  const ttlMs = interval === "5m" ? 60_000 : 5 * 60_000;
  const cacheKey = `${sym}:${range}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const targetSym = resolveSymbolAlias(sym);
    let result: {
      quotes?: Array<{ close?: number | null; volume?: number | null; date: Date }>;
      meta?: { regularMarketVolume?: number; regularMarketPrice?: number };
    } = {};
    try {
      result = (await yf.chart(targetSym, { period1, interval }, { validateResult: false })) as typeof result;
    } catch {
      req.log?.debug({ symbol: sym, targetSym }, "Using fallback chart history");
    }

    let prices = (result.quotes ?? [])
      .filter((q): q is typeof q & { close: number } =>
        q.close != null && isFinite(q.close)
      )
      .map((q) => ({ t: Math.floor(q.date.getTime() / 1000), c: q.close }));

    if (prices.length === 0) {
      const fallbackQuote = getFallbackQuote(sym);
      const basePrice = (fallbackQuote.regularMarketPrice as number) || 100;
      const count = range === "1d" ? 24 : range === "7d" ? 28 : 30;
      const nowSec = Math.floor(Date.now() / 1000);
      const stepSec = Math.max(60, Math.floor(((Date.now() - period1.getTime()) / 1000) / count));
      prices = generateRealisticHistory(sym, range, basePrice, nowSec, stepSec, count);
    }

    let marketCap = 0;
    let shortName: string | undefined;
    try {
      const live = await fetchLiveQuotes([sym], resolveSymbolAlias);
      const q = live.get(sym);
      if (q) {
        marketCap = q.marketCap || 0;
        shortName = q.shortName;
      }
    } catch {
      /* quote crumb is optional for history */
    }
    if (!marketCap) {
      try {
        const caps = await fetchLiveMcaps([sym]);
        marketCap = caps.get(sym) || 0;
      } catch {
        /* live mcap is optional */
      }
    }

    const lastQuoteVol = result.quotes?.length
      ? result.quotes[result.quotes.length - 1]?.volume
      : undefined;
    const volume =
      (typeof result.meta?.regularMarketVolume === "number" && result.meta.regularMarketVolume > 0
        ? result.meta.regularMarketVolume
        : 0) ||
      (typeof lastQuoteVol === "number" && lastQuoteVol > 0 ? lastQuoteVol : 0);

    const payload = { symbol: sym, range, prices, marketCap, shortName, volume };
    setCache(cacheKey, payload, ttlMs);
    res.json(payload);
  } catch {
    req.log?.debug({ symbol: sym }, "Using fallback chart history");
    const fallbackQuote = getFallbackQuote(sym);
    const basePrice = (fallbackQuote.regularMarketPrice as number) || 100;
    const count = range === "1d" ? 24 : range === "7d" ? 28 : 30;
    const nowSec = Math.floor(Date.now() / 1000);
    const stepSec = Math.max(60, Math.floor(((Date.now() - period1.getTime()) / 1000) / count));
    const prices = generateRealisticHistory(sym, range, basePrice, nowSec, stepSec, count);
    res.json({ symbol: sym, range, prices });
  }
});

// ── Symbol Search (Global Ticker Lookup) ──────────────────────────────────

interface SearchResult {
  sym: string;
  name: string;
  type: string;
  exch: string;
}

const FALLBACK_SEARCH_CATALOG: SearchResult[] = [
  { sym: "AAPL", name: "Apple Inc.", type: "Stock", exch: "NASDAQ" },
  { sym: "MSFT", name: "Microsoft Corporation", type: "Stock", exch: "NASDAQ" },
  { sym: "NVDA", name: "NVIDIA Corporation", type: "Stock", exch: "NASDAQ" },
  { sym: "AMZN", name: "Amazon.com Inc.", type: "Stock", exch: "NASDAQ" },
  { sym: "GOOGL", name: "Alphabet Inc.", type: "Stock", exch: "NASDAQ" },
  { sym: "META", name: "Meta Platforms Inc.", type: "Stock", exch: "NASDAQ" },
  { sym: "TSLA", name: "Tesla Inc.", type: "Stock", exch: "NASDAQ" },
  { sym: "BTC-USD", name: "Bitcoin USD", type: "Crypto", exch: "CCC" },
  { sym: "ETH-USD", name: "Ethereum USD", type: "Crypto", exch: "CCC" },
  { sym: "EURUSD=X", name: "EUR/USD", type: "Forex", exch: "CCY" },
  { sym: "GBPUSD=X", name: "GBP/USD", type: "Forex", exch: "CCY" },
  { sym: "USDJPY=X", name: "USD/JPY", type: "Forex", exch: "CCY" },
  { sym: "GC=F", name: "Gold Futures", type: "Commodity", exch: "COMEX" },
  { sym: "SI=F", name: "Silver Futures", type: "Commodity", exch: "COMEX" },
  { sym: "PL=F", name: "Platinum Futures", type: "Commodity", exch: "NYMEX" },
  { sym: "PA=F", name: "Palladium Futures", type: "Commodity", exch: "NYMEX" },
  { sym: "^TNX", name: "10-Year Treasury Yield", type: "Bond", exch: "CBOE" },
  { sym: "^IRX", name: "13-Week Treasury Yield", type: "Bond", exch: "CBOE" },
];

router.get("/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!query) {
    res.json({ results: [] });
    return;
  }

  try {
    const yfRes = await yf.search(query, { quotesCount: 15 });
    const results: SearchResult[] = (yfRes.quotes ?? [])
      .filter((q) => Boolean(q.symbol))
      .map((q) => ({
        sym: String(q.symbol || ""),
        name: String(q.shortname || q.longname || q.symbol || ""),
        type: String(q.quoteType || "EQUITY"),
        exch: String(q.exchange || "GLOBAL"),
      }));
    if (results.length > 0) {
      res.json({ results });
      return;
    }
  } catch (err) {
    req.log?.debug({ err, query }, "Yahoo Finance search failed, using fallback catalog");
  }

  const qLower = query.toLowerCase();
  const fallbackResults = FALLBACK_SEARCH_CATALOG.filter(
    (item) =>
      item.sym.toLowerCase().includes(qLower) ||
      item.name.toLowerCase().includes(qLower) ||
      item.type.toLowerCase().includes(qLower)
  );
  res.json({ results: fallbackResults });
});

export default router;
