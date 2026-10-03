import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ALL_SYMBOLS, BONDS, COMMODITIES, CRYPTOS, FOREX, INDICES, MACRO, SECTORS, STOCKS } from '../constants/marketData'
import { useSettings } from './SettingsContext'
import { getApiBase, resolveApiBase } from '../utils/apiBase'
import { resolveSymbolAlias, getFallbackQuote, isFallbackMcap, isStubHistory } from '../utils/symbolFallbacks'

export { fmt, fmtChg, fmtMcap, chgDir, fmtPrice, fmtMoney, fmtVol, fmtIndex } from '../utils/format'

export interface QuoteData {
  symbol: string
  shortName?: string
  quoteType?: string
  currency?: string
  regularMarketPrice: number
  regularMarketChangePercent: number
  regularMarketChange: number
  regularMarketPreviousClose: number
  regularMarketOpen?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketVolume: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  marketCap: number
  preMarketPrice?: number
  preMarketChangePercent?: number
  postMarketPrice?: number
  postMarketChangePercent?: number
  bid?: number
  ask?: number
}

interface MarketContextType {
  data: Record<string, QuoteData>
  loading: boolean
  lastUpdated: Date | null
  isOnline: boolean
  serverError: string | null
  refresh: () => void
  refreshKey: number
  ensureSymbols: (syms: string[]) => void
}

const MarketContext = createContext<MarketContextType>({
  data: {},
  loading: true,
  lastUpdated: null,
  isOnline: true,
  serverError: null,
  refresh: () => {},
  refreshKey: 0,
  ensureSymbols: () => {},
})

function apiBase() {
  return getApiBase()
}

const YF_CHART = 'https://query2.finance.yahoo.com/v8/finance/chart'
const NATIVE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

const FIRST_PAINT = [
  '^GSPC', '^IXIC', '^DJI', '^NDX', '^RUT', '^VIX',
  '^BSESN', '^NSEI',
  'BTC-USD', 'ETH-USD', 'GC=F', 'SI=F', 'CL=F', 'DX-Y.NYB', '^TNX', '^IRX', '2YY=F',
  'LBR=F', 'ZNC=F', 'NICK.L', 'HG=F', 'ALI=F',
]

const SECOND_WAVE = [
  ...INDICES.map((i) => i.sym),
  ...STOCKS.map((s) => s.sym),
  ...BONDS.map((b) => b.sym),
  ...MACRO.map((m) => m.sym),
  ...COMMODITIES.map((c) => c.sym),
  ...SECTORS.map((s) => s.sym),
  ...CRYPTOS.slice(0, 20).map((c) => c.sym),
  ...FOREX.slice(0, 16).map((f) => f.sym),
]

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 15000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id))
}

/** Server fallback stamps volume=1e6 and dayHigh = price * 1.01. */
/** When extended hours is on, prefer pre/post prints if Yahoo sent them. */
export function sessionQuote(q: QuoteData, extended: boolean): { price: number; chg: number; tag: 'PRE' | 'AH' | null } {
  if (extended && q.preMarketPrice != null && q.preMarketPrice > 0) {
    const prev = q.regularMarketPreviousClose || q.regularMarketPrice
    const chg = q.preMarketChangePercent ?? (prev ? ((q.preMarketPrice - prev) / prev) * 100 : 0)
    return { price: q.preMarketPrice, chg, tag: 'PRE' }
  }
  if (extended && q.postMarketPrice != null && q.postMarketPrice > 0) {
    const chg = q.postMarketChangePercent ?? 0
    return { price: q.postMarketPrice, chg, tag: 'AH' }
  }
  return { price: q.regularMarketPrice, chg: q.regularMarketChangePercent, tag: null }
}

export function isSyntheticQuote(q: QuoteData | undefined): boolean {
  if (!q) return true
  if (q.regularMarketVolume !== 1_000_000) return false
  if (q.regularMarketDayHigh == null) return false
  const expected = +(q.regularMarketPrice * 1.01).toFixed(4)
  return Math.abs(q.regularMarketDayHigh - expected) < 0.001
}

function withExactMcap(q: QuoteData, prev?: QuoteData): QuoteData {
  if (!isFallbackMcap(q.symbol, q.marketCap)) return q
  const keep = prev && !isFallbackMcap(prev.symbol, prev.marketCap) ? prev.marketCap : 0
  if (keep === q.marketCap) return q
  return { ...q, marketCap: keep }
}

function readUserSymbols(): string[] {
  const out: string[] = []
  const keys = ['floboard:watchlist', 'floboard:watchlist:Tech', 'floboard:watchlist:Crypto', 'floboard:watchlist:Macro']
  for (const key of keys) {
    try {
      const w = JSON.parse(localStorage.getItem(key) || '[]') as unknown
      if (Array.isArray(w)) out.push(...w.map((s) => String(s)))
    } catch { /* ignore */ }
  }
  try {
    const h = JSON.parse(localStorage.getItem('floboard:holdings') || '[]') as unknown
    if (Array.isArray(h)) {
      for (const row of h) {
        if (row && typeof row === 'object' && 'symbol' in row) {
          out.push(String((row as { symbol: string }).symbol))
        }
      }
    }
  } catch { /* ignore */ }
  return [...new Set(out.map((s) => s.trim().toUpperCase()).filter(Boolean))]
}

function wantsMcap(sym: string) {
  const s = sym.toUpperCase()
  if (s.includes('=X') || s.includes('/') || s.startsWith('^') || s.includes('=F')) return false
  return true
}

function geckoTick(yahoo: string) {
  return yahoo.trim().toUpperCase().replace(/-USD$/, '').replace(/\d+$/, '')
}

async function fetchGeckoMcaps(symbols: string[]): Promise<Record<string, number>> {
  const crypto = [...new Set(symbols.filter((s) => s.toUpperCase().endsWith('-USD')))]
  if (!crypto.length) return {}
  try {
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1',
      {},
      12000,
    )
    if (!res.ok) return {}
    const rows = await res.json() as Array<{ symbol?: string; market_cap?: number }>
    const byTick = new Map<string, number>()
    for (const row of rows) {
      const t = String(row.symbol || '').toUpperCase()
      if (t && typeof row.market_cap === 'number' && row.market_cap > 0 && !byTick.has(t)) {
        byTick.set(t, row.market_cap)
      }
    }
    const out: Record<string, number> = {}
    for (const s of crypto) {
      const cap = byTick.get(geckoTick(s))
      if (cap) out[s] = cap
    }
    return out
  } catch {
    return {}
  }
}

async function fetchMcapMap(symbols: string[]): Promise<Record<string, number>> {
  const need = [...new Set(symbols.filter(wantsMcap))]
  if (!need.length) return {}
  const out: Record<string, number> = {}
  try {
    const res = await fetchWithTimeout(
      `${apiBase()}/api/market/mcap?symbols=${encodeURIComponent(need.join(','))}`,
      {},
      20000,
    )
    if (res.ok) {
      const json = await res.json() as { results?: Record<string, number> }
      Object.assign(out, json.results ?? {})
    }
  } catch { /* optional */ }
  const still = need.filter((s) => !(typeof out[s] === 'number' && out[s] > 0))
  if (still.length) Object.assign(out, await fetchGeckoMcaps(still))
  return out
}

async function fetchOneChart(sym: string): Promise<{ quote: QuoteData; live: boolean }> {
  const targetSym = resolveSymbolAlias(sym)
  try {
    const res = await fetchWithTimeout(
      `${YF_CHART}/${encodeURIComponent(targetSym)}?interval=1d&range=1d&includePrePost=true`,
      { headers: { 'User-Agent': NATIVE_UA, Accept: 'application/json' } },
      10000,
    )
    if (!res.ok) return { quote: getFallbackQuote(sym), live: false }
    const json = await res.json() as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } }
    const meta = json?.chart?.result?.[0]?.meta as Record<string, number & string> | undefined
    if (!meta?.regularMarketPrice) return { quote: getFallbackQuote(sym), live: false }

    const price = meta.regularMarketPrice as number
    const prev = (meta.chartPreviousClose ?? meta.previousClose ?? price) as number
    const changePct = (meta.regularMarketChangePercent as number) ?? (prev > 0 ? ((price - prev) / prev) * 100 : 0)
    const change = (meta.regularMarketChange as number) ?? (price - prev)

    const quote: QuoteData = {
      symbol: sym,
      shortName: (meta.shortName as unknown as string) ?? undefined,
      quoteType: (meta.instrumentType as unknown as string) ?? undefined,
      currency: (meta.currency as unknown as string) ?? undefined,
      regularMarketPrice: price,
      regularMarketChangePercent: changePct,
      regularMarketChange: change,
      regularMarketPreviousClose: prev,
      regularMarketOpen: (meta.regularMarketOpen as number) ?? undefined,
      regularMarketDayHigh: (meta.regularMarketDayHigh as number) ?? undefined,
      regularMarketDayLow: (meta.regularMarketDayLow as number) ?? undefined,
      regularMarketVolume: (meta.regularMarketVolume as number) ?? 0,
      fiftyTwoWeekHigh: (meta.fiftyTwoWeekHigh as number) ?? undefined,
      fiftyTwoWeekLow: (meta.fiftyTwoWeekLow as number) ?? undefined,
      marketCap: (typeof meta.marketCap === 'number' && meta.marketCap > 0) ? meta.marketCap as number : 0,
    }
    return { quote, live: true }
  } catch {
    return { quote: getFallbackQuote(sym), live: false }
  }
}

async function quoteFromHistory(sym: string): Promise<QuoteData | null> {
  const target = resolveSymbolAlias(sym)
  try {
    const res = await fetchWithTimeout(
      `${apiBase()}/api/market/history?symbol=${encodeURIComponent(target)}&range=7d`,
      {},
      8000,
    )
    if (res.ok) {
      const json = await res.json() as { prices?: Array<{ t: number; c: number }>; marketCap?: number; shortName?: string; volume?: number }
      const prices = (json.prices ?? []).filter((p) => p && Number.isFinite(p.c) && p.c > 0)
      const last = prices[prices.length - 1]
      const stub = isStubHistory(prices, getFallbackQuote(sym).regularMarketPrice)
      if (prices.length >= 2 && last && !stub) {
        const fallback = getFallbackQuote(sym)
        const targetT = last.t - 24 * 3600
        let prev = prices[0].c
        for (let i = prices.length - 1; i >= 0; i--) {
          if (prices[i].t <= targetT) {
            prev = prices[i].c
            break
          }
        }
        if (!prev) prev = prices[Math.max(0, prices.length - 2)].c
        const change = last.c - prev
        const changePct = prev ? (change / prev) * 100 : 0
        const window = prices.slice(-24).map((p) => p.c)
        const mcap = typeof json.marketCap === 'number' && json.marketCap > 0 && !isFallbackMcap(sym, json.marketCap)
          ? json.marketCap
          : 0
        return {
          symbol: sym,
          shortName: json.shortName || fallback.shortName,
          quoteType: fallback.quoteType,
          currency: fallback.currency,
          regularMarketPrice: last.c,
          regularMarketChangePercent: changePct,
          regularMarketChange: change,
          regularMarketPreviousClose: prev,
          regularMarketDayHigh: Math.max(...window),
          regularMarketDayLow: Math.min(...window),
          regularMarketVolume: typeof json.volume === 'number' && json.volume > 0 && json.volume !== 1_000_000 ? json.volume : 0,
          marketCap: mcap,
        }
      }
    }
  } catch { /* try Yahoo chart next */ }
  try {
    const { quote, live } = await fetchOneChart(sym)
    if (live && quote.regularMarketPrice > 0 && !isSyntheticQuote(quote)) return quote
  } catch { /* ignore */ }
  return null
}

async function hydrateSymbols(
  symbols: string[],
  concurrency: number,
  onBatch: (live: QuoteData[]) => void,
): Promise<number> {
  const uniq = [...new Set(symbols.filter(Boolean))]
  let live = 0
  for (let i = 0; i < uniq.length; i += concurrency) {
    const slice = uniq.slice(i, i + concurrency)
    const settled = await Promise.all(slice.map((s) => quoteFromHistory(s)))
    const batch = settled.filter((q): q is QuoteData => !!q && !isSyntheticQuote(q))
    if (batch.length) {
      live += batch.length
      onBatch(batch)
    }
  }
  return live
}

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Record<string, QuoteData>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const loadingRef = useRef(false)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef = useRef<Record<string, QuoteData>>({})
  const { settings } = useSettings()
  const refreshMs = settings.refreshInterval * 1000

  useEffect(() => { dataRef.current = data }, [data])

  useEffect(() => {
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('offline', handleOffline)
    if (typeof navigator !== 'undefined' && !navigator.onLine) setIsOnline(false)
    return () => window.removeEventListener('offline', handleOffline)
  }, [])

  const scheduleRetry = useCallback((fn: () => void) => {
    if (retryRef.current) return
    retryRef.current = setTimeout(() => { retryRef.current = null; fn() }, 15000)
  }, [])

  const applyQuotes = useCallback((quotes: QuoteData[]) => {
    setData((prev) => {
      const map = { ...prev }
      quotes.forEach((q) => {
        if (!q?.symbol || q.regularMarketPrice == null || !isFinite(q.regularMarketPrice)) return
        const cur = prev[q.symbol]
        if (isSyntheticQuote(q)) {
          const mcap = !isFallbackMcap(q.symbol, q.marketCap) ? q.marketCap : 0
          if (mcap && cur && !isSyntheticQuote(cur)) {
            map[q.symbol] = { ...cur, marketCap: mcap }
          }
          return
        }
        map[q.symbol] = withExactMcap(q, cur)
      })
      return map
    })
  }, [])

  const loadData = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    const onLive = (batch: QuoteData[]) => {
      applyQuotes(batch)
      setIsOnline(true)
      setLastUpdated(new Date())
      setServerError(null)
    }

    try {
      const extra = readUserSymbols()
      const first = [...new Set([...FIRST_PAINT, ...extra.slice(0, 12)])]
      const liveFirst = await hydrateSymbols(first, 12, onLive)
      setRefreshKey((k) => k + 1)
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null }
      setLoading(false)
      loadingRef.current = false
      if (!liveFirst) setIsOnline(false)

      const have = new Set(Object.keys(dataRef.current))
      const second = [...new Set([...SECOND_WAVE, ...extra])].filter((s) => !have.has(s))
      void hydrateSymbols(second, 10, onLive).then(() => {
        setRefreshKey((k) => k + 1)
        const stillNeed = Object.values(dataRef.current)
          .filter((q) => wantsMcap(q.symbol) && isFallbackMcap(q.symbol, q.marketCap))
          .map((q) => q.symbol)
        if (stillNeed.length) {
          void fetchMcapMap(stillNeed).then((caps) => {
            const patch: QuoteData[] = []
            for (const [sym, mcap] of Object.entries(caps)) {
              const prev = dataRef.current[sym]
              if (prev && typeof mcap === 'number' && mcap > 0) patch.push({ ...prev, marketCap: mcap })
            }
            if (patch.length) applyQuotes(patch)
          })
        }
        const loaded = new Set(Object.keys(dataRef.current))
        const rest = ALL_SYMBOLS.filter((s) => !loaded.has(s))
        if (rest.length) void hydrateSymbols(rest, 8, onLive)
      })
    } catch {
      setIsOnline(false)
      setLastUpdated(new Date())
      scheduleRetry(() => { loadData() })
      setLoading(false)
      loadingRef.current = false
    }
  }, [scheduleRetry, applyQuotes])

  const ensureSymbols = useCallback((syms: string[]) => {
    const want = [...new Set(syms.map((s) => s.trim().toUpperCase()).filter(Boolean))]
    if (!want.length) return
    const missing = want.filter((s) => {
      const q = dataRef.current[s]
      return !q || isSyntheticQuote(q)
    })
    if (!missing.length) return
    void hydrateSymbols(missing, 10, (batch) => {
      applyQuotes(batch)
      setIsOnline(true)
      setLastUpdated(new Date())
    })
  }, [applyQuotes])

  useEffect(() => {
    void resolveApiBase().then(() => loadData())
    const interval = setInterval(loadData, refreshMs)
    return () => {
      clearInterval(interval)
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [loadData, refreshMs])

  return (
    <MarketContext.Provider value={{ data, loading, lastUpdated, isOnline, serverError, refresh: loadData, refreshKey, ensureSymbols }}>
      {children}
    </MarketContext.Provider>
  )
}

export function useMarket() {
  return useContext(MarketContext)
}
