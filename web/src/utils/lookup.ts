import { ALL_SYMBOLS } from '../constants/marketData'
import { getApiBase } from './apiBase'

const KNOWN = new Set(ALL_SYMBOLS)

function isSyntheticQuote(q: {
  regularMarketVolume?: number
  regularMarketDayHigh?: number
  regularMarketPrice?: number
}): boolean {
  if (q.regularMarketVolume !== 1_000_000) return false
  if (q.regularMarketDayHigh == null || q.regularMarketPrice == null) return false
  const expected = +(q.regularMarketPrice * 1.01).toFixed(4)
  return Math.abs(q.regularMarketDayHigh - expected) < 0.001
}

export type LookupResult =
  | { ok: true; sym: string; name: string }
  | { ok: false; error: string }

function uniq(xs: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const x of xs) {
    if (!x || seen.has(x)) continue
    seen.add(x)
    out.push(x)
  }
  return out
}

async function quoteIsLive(sym: string): Promise<{ name: string } | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/market?symbols=${encodeURIComponent(sym)}`)
    if (res.ok) {
      const json = await res.json() as { results?: Array<{
        symbol?: string
        shortName?: string
        regularMarketPrice?: number
        regularMarketVolume?: number
        regularMarketDayHigh?: number
      }> }
      const q = json.results?.[0]
      if (q && q.regularMarketPrice != null && Number.isFinite(q.regularMarketPrice) && !isSyntheticQuote(q)) {
        return { name: q.shortName || sym }
      }
    }
  } catch { /* ignore */ }
  try {
    const res = await fetch(`${getApiBase()}/api/market/history?symbol=${encodeURIComponent(sym)}&range=7d`)
    if (res.ok) {
      const json = await res.json() as { prices?: Array<{ c: number }> }
      const prices = json.prices ?? []
      const syntheticLen = prices.length === 24 || prices.length === 28 || prices.length === 30
      if (prices.length >= 2 && !syntheticLen) return { name: sym }
    }
  } catch { /* ignore */ }
  return null
}

/** Confirm a ticker exists on Yahoo before adding it. Never accept a fake fallback quote. */
export async function verifySymbol(raw: string): Promise<LookupResult> {
  const typed = raw.trim()
  if (!typed) return { ok: false, error: 'Enter a ticker.' }
  if (KNOWN.has(typed) || KNOWN.has(typed.toUpperCase())) {
    const sym = KNOWN.has(typed) ? typed : typed.toUpperCase()
    return { ok: true, sym, name: sym }
  }

  try {
    const res = await fetch(`${getApiBase()}/api/search?q=${encodeURIComponent(typed)}`)
    if (res.ok) {
      const json = await res.json() as { results?: { sym: string; name: string }[] }
      const hits = json.results ?? []
      const want = typed.toUpperCase()
      const exact = hits.find((h) => h.sym.toUpperCase() === want)
      if (exact?.sym) return { ok: true, sym: exact.sym, name: exact.name || exact.sym }
    }
  } catch { /* ignore */ }

  const upper = typed.toUpperCase()
  const candidates = uniq([typed, upper, `${upper}.LG`, `${upper}.NG`, `${upper}.LA`])
  for (const sym of candidates) {
    const live = await quoteIsLive(sym)
    if (live) return { ok: true, sym, name: live.name }
  }

  return {
    ok: false,
    error: `${upper} is not on Yahoo Finance, so it was not added. Nigerian NGX names (like Dangote / DANGCEM) usually are not listed there.`,
  }
}
