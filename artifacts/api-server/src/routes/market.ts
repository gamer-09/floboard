import YahooFinance from "yahoo-finance2";
import { Router } from "express";
import { fetchLiveQuotes, fetchYahooChart, fetchYahooChartPrices } from "../lib/yahooQuotes";
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
  "TRUMP-USD": "TRUMP35336-USD",
  "TRUMP": "TRUMP35336-USD",
  "OFFICIAL-TRUMP-USD": "TRUMP35336-USD",
  "TAO-USD": "TAO22974-USD",
  "TAO": "TAO22974-USD",
  "HYPE-USD": "HYPE32196-USD",
  "HYPE": "HYPE32196-USD",
  "USDE-USD": "USDE29470-USD",
  "USDE": "USDE29470-USD",
  "COMP-USD": "COMP5692-USD",
  "COMP": "COMP5692-USD",
  "POL-USD": "POL28321-USD",
  "POL": "POL28321-USD",
  "MATIC": "POL28321-USD",
  "MATIC-USD": "POL28321-USD",
  "IMX-USD": "IMX10603-USD",
  "IMX": "IMX10603-USD",
  "STX-USD": "STX4847-USD",
  "GRT-USD": "GRT6719-USD",
  "FTM-USD": "S32684-USD",
  "FTM": "S32684-USD",
  "RNDR-USD": "RENDER-USD",
  "RNDR": "RENDER-USD",
  "^TU": "2YY=F",
  SQ: "XYZ",
  "^PSI": "PSI20.LS",
  "^VN30": "^VNINDEX.VN",
  "^IPSA": "MXIPSAGC.SN",
  "LBS=F": "LBR=F",
  "NI=F": "NICK.L",
  "ZI=F": "ZNC=F",
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
    const stillNeed = symbols.filter((s) => !live.has(s) && !yfByRequested.has(s));
    if (stillNeed.length && process.env.VITEST !== "true") {
      for (let i = 0; i < stillNeed.length; i += 8) {
        const slice = stillNeed.slice(i, i + 8);
        const charts = await Promise.all(
          slice.map(async (s) => {
            const { quote } = await fetchYahooChart(resolveSymbolAlias(s), "1d");
            return { s, quote };
          }),
        );
        for (const { s, quote } of charts) {
          if (quote) live.set(s, { ...quote, symbol: s });
        }
      }
    }

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
      }
    }

    const withCaps = await attachNasdaqMcaps(results as Array<{ symbol: string; marketCap?: number }>);
    res.json({ results: withCaps });
  } catch (err) {
    req.log?.debug({ err }, "Quote lookup failed");
    res.json({ results: [] });
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

/** Evenly spaced 24/28/30 bars = old stub generator. Gapped 28-bar cash sessions are live. */
function isEvenStub(prices: Array<{ t: number; c: number }>): boolean {
  const n = prices.length;
  if (!(n === 24 || n === 28 || n === 30) || n < 3) return false;
  const step = prices[1].t - prices[0].t;
  if (step <= 0) return true;
  let even = 0;
  for (let i = 1; i < n; i++) {
    if (Math.abs(prices[i].t - prices[i - 1].t - step) <= 2) even++;
  }
  return even >= n - 2;
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

    if (prices.length < 2 || isEvenStub(prices)) {
      const chart = await fetchYahooChart(targetSym, range);
      if (chart.prices.length >= 2 && !isEvenStub(chart.prices)) prices = chart.prices;
      else if (prices.length < 2 && chart.prices.length >= 2) prices = chart.prices;
    }
    if (prices.length < 2) {
      res.json({ symbol: sym, range, prices: [] });
      return;
    }

    let marketCap = 0;
    let shortName: string | undefined;
    let preMarketPrice: number | undefined;
    let preMarketChangePercent: number | undefined;
    let postMarketPrice: number | undefined;
    let postMarketChangePercent: number | undefined;
    let updatedAt: number | undefined = prices[prices.length - 1]?.t;
    try {
      const live = await fetchLiveQuotes([sym], resolveSymbolAlias);
      const q = live.get(sym);
      if (q) {
        marketCap = q.marketCap || 0;
        shortName = q.shortName;
        preMarketPrice = q.preMarketPrice;
        preMarketChangePercent = q.preMarketChangePercent;
        postMarketPrice = q.postMarketPrice;
        postMarketChangePercent = q.postMarketChangePercent;
        if (q.updatedAt) updatedAt = q.updatedAt;
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

    const payload = {
      symbol: sym,
      range,
      prices,
      marketCap,
      shortName,
      volume,
      preMarketPrice,
      preMarketChangePercent,
      postMarketPrice,
      postMarketChangePercent,
      updatedAt,
    };
    setCache(cacheKey, payload, ttlMs);
    res.json(payload);
  } catch {
    req.log?.debug({ symbol: sym }, "History lookup failed");
    try {
      const targetSym = resolveSymbolAlias(sym);
      const prices = await fetchYahooChartPrices(targetSym, range);
      res.json({ symbol: sym, range, prices });
    } catch {
      res.json({ symbol: sym, range, prices: [] });
    }
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
