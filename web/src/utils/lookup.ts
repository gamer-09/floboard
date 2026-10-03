import { ALL_SYMBOLS } from '../constants/marketData'
import { getApiBase } from './apiBase'
import { getFallbackQuote, isStubHistory, resolveSymbolAlias } from './symbolFallbacks'

const KNOWN = new Set(ALL_SYMBOLS)

export function isKnownSymbol(raw: string): boolean {
  return KNOWN.has(raw) || KNOWN.has(raw.trim().toUpperCase())
}

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

export function yahooMissingMessage(sym: string): string {
  const upper = sym.trim().toUpperCase() || 'That ticker'
  return `${upper} is not on Yahoo Finance, so it cannot be added or shown. FloBoard only lists symbols Yahoo covers.`
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
      const json = await res.json() as { prices?: Array<{ t: number; c: number }>; shortName?: string }
      const prices = (json.prices ?? []).filter((p) => p && Number.isFinite(p.c) && p.c > 0)
      if (prices.length >= 2 && !isStubHistory(prices, getFallbackQuote(sym).regularMarketPrice)) {
        return { name: json.shortName || sym }
      }
    }
  } catch { /* ignore */ }
  return null
}

/** Confirm a ticker exists on Yahoo before adding it. Never accept a fake fallback quote. */
export async function verifySymbol(raw: string): Promise<LookupResult> {
  const typed = raw.trim()
  if (!typed) return { ok: false, error: 'Enter a ticker.' }
  const resolved = resolveSymbolAlias(typed)
  if (KNOWN.has(typed) || KNOWN.has(typed.toUpperCase()) || KNOWN.has(resolved)) {
    const sym = KNOWN.has(typed) ? typed : KNOWN.has(typed.toUpperCase()) ? typed.toUpperCase() : resolved
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

  return { ok: false, error: yahooMissingMessage(upper) }
}

/** True only when Yahoo search ran and the ticker is not listed. Network failures return false (keep it). */
export async function isDefinitelyNotOnYahoo(raw: string): Promise<boolean> {
  const typed = raw.trim()
  if (!typed || isKnownSymbol(typed)) return false
  let searchOk = false
  try {
    const res = await fetch(`${getApiBase()}/api/search?q=${encodeURIComponent(typed)}`)
    if (res.ok) {
      searchOk = true
      const json = await res.json() as { results?: { sym: string; name: string }[] }
      const want = typed.toUpperCase()
      if ((json.results ?? []).some((h) => h.sym.toUpperCase() === want)) return false
    }
  } catch { /* ignore */ }
  if (!searchOk) return false
  const upper = typed.toUpperCase()
  const live = await quoteIsLive(typed) || await quoteIsLive(upper)
  return !live
}

/** Keep in-app symbols and anything not proven missing from Yahoo. */
export async function keepYahooSymbols(syms: string[]): Promise<string[]> {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of syms) {
    const typed = String(raw || '').trim()
    if (!typed || seen.has(typed)) continue
    if (await isDefinitelyNotOnYahoo(typed)) continue
    const sym = isKnownSymbol(typed) && !KNOWN.has(typed) ? typed.toUpperCase() : typed
    if (seen.has(sym)) continue
    seen.add(sym)
    out.push(sym)
  }
  return out
}
