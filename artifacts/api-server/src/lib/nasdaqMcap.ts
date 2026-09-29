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

export async function attachNasdaqMcaps<T extends { symbol?: string; marketCap?: number }>(
  quotes: T[],
): Promise<T[]> {
  // Fill when mcap is missing, zero, or a round-billion placeholder.
  const need = quotes
    .filter((q) => {
      if (!q.symbol || !isEquityMcapSymbol(q.symbol)) return false;
      const m = q.marketCap;
      if (m == null || !Number.isFinite(m) || m <= 0) return true;
      return m >= 1e9 && m % 1e9 === 0;
    })
    .map((q) => q.symbol as string);
  if (!need.length) return quotes;
  const mcaps = await fetchNasdaqMcaps(need);
  if (!mcaps.size) return quotes;
  return quotes.map((q) => {
    const m = q.symbol ? mcaps.get(q.symbol) : undefined;
    return m ? { ...q, marketCap: m } : q;
  });
}
