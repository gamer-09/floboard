const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type Jar = Map<string, string>;

export interface YahooLiveQuote {
  symbol: string;
  shortName?: string;
  quoteType?: string;
  currency?: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketChange: number;
  regularMarketPreviousClose: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap: number;
  preMarketPrice?: number;
  preMarketChangePercent?: number;
  postMarketPrice?: number;
  postMarketChangePercent?: number;
  bid?: number;
  ask?: number;
}

export async function fetchYahooChartPrices(
  sym: string,
  range: string,
): Promise<Array<{ t: number; c: number }>> {
  const { prices } = await fetchYahooChart(sym, range);
  return prices;
}

function crumbEnabled() {
  return process.env.VITEST !== "true" && process.env.NODE_ENV !== "test";
}

function cookieString(jar: Jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorbCookies(res: Response, jar: Jar) {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of list) {
    const pair = c.split(";")[0];
    const i = pair.indexOf("=");
    if (i > 0) {
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      if (k && v && v !== "deleted") jar.set(k, v);
    }
  }
}

async function request(url: string, jar: Jar, extra: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...extra,
    headers: {
      "User-Agent": UA,
      Accept: "application/json,text/plain,*/*",
      Cookie: cookieString(jar),
      ...(extra.headers || {}),
    },
    redirect: "manual",
  });
  absorbCookies(res, jar);
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    if (loc) return request(new URL(loc, url).toString(), jar, extra);
  }
  return res;
}

let jar: Jar = new Map();
let crumb = "";
let crumbAt = 0;
let inflight: Promise<void> | null = null;

async function refreshSession() {
  jar = new Map();
  crumb = "";
  await request("https://fc.yahoo.com/", jar);
  const res = await request("https://query1.finance.yahoo.com/v1/test/getcrumb", jar);
  const text = (await res.text()).trim();
  if (!res.ok || !text || text.length > 80 || text.startsWith("{") || text.includes(" ")) {
    throw new Error("yahoo crumb failed");
  }
  crumb = text;
  crumbAt = Date.now();
}

async function ensureSession() {
  if (crumb && Date.now() - crumbAt < 45 * 60 * 1000) return;
  if (inflight) return inflight;
  inflight = refreshSession().finally(() => {
    inflight = null;
  });
  return inflight;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function toQuote(raw: Record<string, unknown>, requested: string): YahooLiveQuote | null {
  const price = num(raw.regularMarketPrice);
  if (price == null) return null;
  const prev = num(raw.regularMarketPreviousClose) ?? price;
  const change = num(raw.regularMarketChange) ?? price - prev;
  const changePct = num(raw.regularMarketChangePercent) ?? (prev ? ((price - prev) / prev) * 100 : 0);
  return {
    symbol: requested,
    shortName: typeof raw.shortName === "string" ? raw.shortName : undefined,
    quoteType: typeof raw.quoteType === "string" ? raw.quoteType : undefined,
    currency: typeof raw.currency === "string" ? raw.currency : undefined,
    regularMarketPrice: price,
    regularMarketChangePercent: changePct,
    regularMarketChange: change,
    regularMarketPreviousClose: prev,
    regularMarketOpen: num(raw.regularMarketOpen),
    regularMarketDayHigh: num(raw.regularMarketDayHigh),
    regularMarketDayLow: num(raw.regularMarketDayLow),
    regularMarketVolume: num(raw.regularMarketVolume) ?? 0,
    fiftyTwoWeekHigh: num(raw.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(raw.fiftyTwoWeekLow),
    marketCap: num(raw.marketCap) ?? 0,
    preMarketPrice: num(raw.preMarketPrice),
    preMarketChangePercent: num(raw.preMarketChangePercent),
    postMarketPrice: num(raw.postMarketPrice),
    postMarketChangePercent: num(raw.postMarketChangePercent),
    bid: num(raw.bid),
    ask: num(raw.ask),
  };
}

const cache = new Map<string, { at: number; quote: YahooLiveQuote }>();
const CACHE_MS = 30_000;

export async function fetchLiveQuotes(
  requestedSymbols: string[],
  resolveAlias: (s: string) => string,
): Promise<Map<string, YahooLiveQuote>> {
  const out = new Map<string, YahooLiveQuote>();
  if (!crumbEnabled() || requestedSymbols.length === 0) return out;

  const need: { requested: string; yahoo: string }[] = [];
  const now = Date.now();
  for (const req of requestedSymbols) {
    const hit = cache.get(req);
    if (hit && now - hit.at < CACHE_MS) {
      out.set(req, { ...hit.quote, symbol: req });
    } else {
      need.push({ requested: req, yahoo: resolveAlias(req) });
    }
  }
  if (!need.length) return out;

  try {
    await ensureSession();
  } catch {
    return out;
  }

  for (let i = 0; i < need.length; i += 25) {
    const batch = need.slice(i, i + 25);
    const yahooSyms = [...new Set(batch.map((b) => b.yahoo))];
    const makeUrl = () =>
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSyms.join(","))}&crumb=${encodeURIComponent(crumb)}`;
    let res: Response;
    try {
      res = await request(makeUrl(), jar);
    } catch {
      continue;
    }
    if (res.status === 401) {
      try {
        await refreshSession();
        res = await request(makeUrl(), jar);
      } catch {
        continue;
      }
    }
    if (!res.ok) continue;
    let json: { quoteResponse?: { result?: Record<string, unknown>[] } };
    try {
      json = (await res.json()) as typeof json;
    } catch {
      continue;
    }
    const rows = json.quoteResponse?.result ?? [];
    const byYahoo = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const ysym = String(row.symbol || "").toUpperCase();
      if (ysym) byYahoo.set(ysym, row);
    }
    for (const b of batch) {
      const row =
        byYahoo.get(b.yahoo.toUpperCase()) ||
        byYahoo.get(b.requested.toUpperCase()) ||
        byYahoo.get(b.yahoo.replace("-", ".").toUpperCase());
      if (!row) continue;
      const q = toQuote(row, b.requested);
      if (!q) continue;
      cache.set(b.requested, { at: Date.now(), quote: q });
      out.set(b.requested, q);
    }
  }
  return out;
}

function quoteFromChartMeta(meta: Record<string, unknown>, requested: string): YahooLiveQuote | null {
  const price = num(meta.regularMarketPrice);
  if (price == null) return null;
  const prev = num(meta.chartPreviousClose) ?? num(meta.previousClose) ?? price;
  const change = price - prev;
  const changePct = prev ? (change / prev) * 100 : 0;
  return {
    symbol: requested,
    shortName: typeof meta.shortName === "string" ? meta.shortName : undefined,
    quoteType: typeof meta.instrumentType === "string" ? meta.instrumentType : undefined,
    currency: typeof meta.currency === "string" ? meta.currency : undefined,
    regularMarketPrice: price,
    regularMarketChangePercent: num(meta.regularMarketChangePercent) ?? changePct,
    regularMarketChange: num(meta.regularMarketChange) ?? change,
    regularMarketPreviousClose: prev,
    regularMarketOpen: num(meta.regularMarketOpen),
    regularMarketDayHigh: num(meta.regularMarketDayHigh),
    regularMarketDayLow: num(meta.regularMarketDayLow),
    regularMarketVolume: num(meta.regularMarketVolume) ?? 0,
    fiftyTwoWeekHigh: num(meta.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(meta.fiftyTwoWeekLow),
    marketCap: num(meta.marketCap) ?? 0,
  };
}

function parseYahooChartJson(
  json: unknown,
  requested: string,
): { prices: Array<{ t: number; c: number }>; quote: YahooLiveQuote | null } {
  const row = (json as { chart?: { result?: Array<{
    meta?: Record<string, unknown>
    timestamp?: number[]
    indicators?: { quote?: Array<{ close?: Array<number | null> }> }
  }> } })?.chart?.result?.[0];
  if (!row) return { prices: [], quote: null };
  const quote = row.meta ? quoteFromChartMeta(row.meta, requested) : null;
  const ts = row.timestamp ?? [];
  const close = row.indicators?.quote?.[0]?.close ?? [];
  const prices: Array<{ t: number; c: number }> = [];
  for (let i = 0; i < ts.length; i++) {
    const c = close[i];
    if (typeof c === "number" && Number.isFinite(c) && c > 0) prices.push({ t: ts[i], c });
  }
  return { prices, quote };
}

function extractChartJson(text: string): unknown | null {
  const i = text.indexOf('{"chart"');
  if (i < 0) return null;
  const slice = text.slice(i, text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

async function fetchYahooChartViaRelay(
  sym: string,
  range: string,
  interval: string,
): Promise<{ prices: Array<{ t: number; c: number }>; quote: YahooLiveQuote | null }> {
  const inner = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(`https://r.jina.ai/${inner}`, {
      headers: { "User-Agent": UA, Accept: "text/plain" },
    });
    if (!res.ok) return { prices: [], quote: null };
    const json = extractChartJson(await res.text());
    if (!json) return { prices: [], quote: null };
    return parseYahooChartJson(json, sym);
  } catch {
    return { prices: [], quote: null };
  }
}

export async function fetchYahooChart(
  sym: string,
  range: string,
): Promise<{ prices: Array<{ t: number; c: number }>; quote: YahooLiveQuote | null }> {
  const attempts: Array<{ range: string; interval: string }> =
    range === "1d"
      ? [
          { range: "1d", interval: "5m" },
          { range: "5d", interval: "1h" },
          { range: "1mo", interval: "1d" },
        ]
      : range === "7d"
        ? [
            { range: "5d", interval: "1h" },
            { range: "1mo", interval: "1d" },
            { range: "5d", interval: "1d" },
          ]
        : range === "1mo"
          ? [
              { range: "1mo", interval: "1d" },
              { range: "3mo", interval: "1d" },
            ]
          : [
              { range: "3mo", interval: "1d" },
              { range: "1mo", interval: "1d" },
            ];

  if (crumbEnabled()) {
    try {
      await ensureSession();
    } catch {
      /* chart still worth trying without crumb */
    }
  }

  let quote: YahooLiveQuote | null = null;
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

  for (const host of hosts) {
    for (const a of attempts) {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(sym)}?interval=${a.interval}&range=${a.range}&includePrePost=true`;
      try {
        const res = crumbEnabled() && jar.size
          ? await request(url, jar)
          : await fetch(url, {
              headers: {
                "User-Agent": UA,
                Accept: "application/json",
                "Accept-Language": "en-US,en;q=0.9",
              },
            });
        if (!res.ok) continue;
        const parsed = parseYahooChartJson(await res.json(), sym);
        if (parsed.quote && !quote) quote = parsed.quote;
        if (parsed.prices.length >= 2) return parsed;
      } catch {
        /* try next host/range */
      }
    }
  }

  const relay = await fetchYahooChartViaRelay(sym, attempts[0]?.range ?? "5d", attempts[0]?.interval ?? "1d");
  if (relay.prices.length >= 2) return relay;
  if (relay.quote && !quote) quote = relay.quote;

  if (quote) {
    const now = Math.floor(Date.now() / 1000);
    const prev = quote.regularMarketPreviousClose || quote.regularMarketPrice;
    return {
      prices: [
        { t: now - 86400, c: prev },
        { t: now, c: quote.regularMarketPrice },
      ],
      quote,
    };
  }
  return { prices: [], quote: null };
}
