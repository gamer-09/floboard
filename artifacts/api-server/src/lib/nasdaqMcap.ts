const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const cache = new Map<string, { at: number; mcap: number }>();
const CACHE_MS = 5 * 60 * 1000;

function enabled() {
  return process.env.VITEST !== "true" && process.env.NODE_ENV !== "test";
}

export function isEquityMcapSymbol(sym: string): boolean {
  const s = sym.trim().toUpperCase();
  if (!s) return false;
  if (s.includes("=X") || s.includes("/") || s.startsWith("^") || s.includes("=F")) return false;
  if (s.endsWith("-USD")) return false;
  return true;
}

function parseMcap(value: string | undefined): number | null {
  if (!value) return null;
  const v = value.trim();
  const plain = Number(v.replace(/[$,]/g, ""));
  if (Number.isFinite(plain) && plain > 0) return plain;
  const m = v.match(/^\$?([\d.]+)\s*([KMBT])$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const mul: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
  const f = mul[m[2].toUpperCase()];
  return Number.isFinite(n) && f ? n * f : null;
}

async function nasdaqMcap(sym: string): Promise<number | null> {
  const candidates = [sym, sym.replace("-", ".")];
  for (const ns of [...new Set(candidates)]) {
    try {
      const res = await fetch(
        `https://api.nasdaq.com/api/quote/${encodeURIComponent(ns)}/summary?assetclass=stocks`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
      );
      if (!res.ok) continue;
      const json = (await res.json()) as {
        data?: { summaryData?: { MarketCap?: { value?: string } } };
      };
      const n = parseMcap(json.data?.summaryData?.MarketCap?.value);
      if (n) return n;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

export async function fetchNasdaqMcaps(symbols: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!enabled()) return out;
  const need = [...new Set(symbols.map((s) => s.trim()).filter(isEquityMcapSymbol))];
  const now = Date.now();
  const fetchList: string[] = [];
  for (const s of need) {
    const hit = cache.get(s);
    if (hit && now - hit.at < CACHE_MS) out.set(s, hit.mcap);
    else fetchList.push(s);
  }
  const concurrency = 6;
  for (let i = 0; i < fetchList.length; i += concurrency) {
    const slice = fetchList.slice(i, i + concurrency);
    const settled = await Promise.all(slice.map((s) => nasdaqMcap(s)));
    settled.forEach((n, j) => {
      if (!n) return;
      const s = slice[j];
      cache.set(s, { at: Date.now(), mcap: n });
      out.set(s, n);
    });
  }
  return out;
}

function isCryptoSym(sym: string) {
  return sym.trim().toUpperCase().endsWith("-USD");
}

function geckoTick(yahoo: string): string {
  return yahoo
    .trim()
    .toUpperCase()
    .replace(/-USD$/, "")
    .replace(/\d+$/, "");
}

let geckoCache: { at: number; byTick: Map<string, number> } | null = null;

async function loadGeckoMcaps(): Promise<Map<string, number>> {
  if (geckoCache && Date.now() - geckoCache.at < CACHE_MS) return geckoCache.byTick;
  const byTick = new Map<string, number>();
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1",
      { headers: { "User-Agent": UA, Accept: "application/json" } },
    );
    if (res.ok) {
      const rows = (await res.json()) as Array<{ symbol?: string; market_cap?: number }>;
      for (const row of rows) {
        const tick = String(row.symbol || "").toUpperCase();
        const cap = row.market_cap;
        if (tick && typeof cap === "number" && cap > 0 && !byTick.has(tick)) byTick.set(tick, cap);
      }
    }
  } catch {
    /* optional */
  }
  geckoCache = { at: Date.now(), byTick };
  return byTick;
}

export async function fetchCryptoMcaps(symbols: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!enabled()) return out;
  const need = [...new Set(symbols.map((s) => s.trim()).filter(isCryptoSym))];
  if (!need.length) return out;
  const gecko = await loadGeckoMcaps();
  for (const s of need) {
    const cap = gecko.get(geckoTick(s));
    if (cap) out.set(s, cap);
  }
  return out;
}

export async function fetchLiveMcaps(symbols: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const [eq, cr] = await Promise.all([fetchNasdaqMcaps(symbols), fetchCryptoMcaps(symbols)]);
  eq.forEach((v, k) => out.set(k, v));
  cr.forEach((v, k) => out.set(k, v));
  return out;
}

function needsLiveMcap(sym: string | undefined, mcap: number | undefined): boolean {
  if (!sym) return false;
  if (!isEquityMcapSymbol(sym) && !isCryptoSym(sym)) return false;
  if (mcap == null || !Number.isFinite(mcap) || mcap <= 0) return true;
  return mcap >= 1e9 && mcap % 1e9 === 0;
}

export async function attachNasdaqMcaps<T extends { symbol?: string; marketCap?: number }>(
  quotes: T[],
): Promise<T[]> {
  const need = quotes.filter((q) => needsLiveMcap(q.symbol, q.marketCap)).map((q) => q.symbol as string);
  if (!need.length) return quotes;
  const mcaps = await fetchLiveMcaps(need);
  if (!mcaps.size) return quotes;
  return quotes.map((q) => {
    const m = q.symbol ? mcaps.get(q.symbol) : undefined;
    return m ? { ...q, marketCap: m } : q;
  });
}
