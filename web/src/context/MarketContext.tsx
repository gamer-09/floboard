import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ALL_SYMBOLS, BONDS, COMMODITIES, CRYPTOS, FOREX, INDICES, MACRO, SECTORS, STOCKS } from '../constants/marketData'
import { useSettings } from './SettingsContext'
import { getApiBase, resolveApiBase } from '../utils/apiBase'
import { resolveSymbolAlias, getFallbackQuote, isFallbackMcap } from '../utils/symbolFallbacks'

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

const KNOWN_SET = new Set(ALL_SYMBOLS)

const PRIORITY_SYMBOLS = [
  ...INDICES.map((i) => i.sym),
  ...STOCKS.map((s) => s.sym),
  ...SECTORS.map((s) => s.sym),
  ...BONDS.map((b) => b.sym),
  ...MACRO.map((m) => m.sym),
  ...COMMODITIES.map((c) => c.sym),
  ...CRYPTOS.slice(0, 40).map((c) => c.sym),
  ...FOREX.slice(0, 24).map((f) => f.sym),
]

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 15000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id))
}

/** Server fallback stamps volume=1e6 and dayHigh = price * 1.01. */
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

async function fetchMcapMap(symbols: string[]): Promise<Record<string, number>> {
  const need = [...new Set(symbols.filter(wantsMcap))]
  if (!need.length) return {}
  try {
    const res = await fetchWithTimeout(
      `${apiBase()}/api/market/mcap?symbols=${encodeURIComponent(need.join(','))}`,
      {},
      20000,
    )
    if (!res.ok) return {}
    const json = await res.json() as { results?: Record<string, number> }
    return json.results ?? {}
  } catch {
    return {}
  }
}

async function fetchViaProxy(symbols: string[]): Promise<QuoteData[] | null> {
  try {
    const res = await fetchWithTimeout(
      `${apiBase()}/api/market?symbols=${encodeURIComponent(symbols.join(','))}`,
      {},
      15000,
    )
    if (!res.ok) return []
    const json = await res.json() as { results: QuoteData[] }
    return json.results ?? []
  } catch (err: unknown) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
    const isConnectionError =
      msg.includes('failed to fetch') || msg.includes('networkerror') ||
      msg.includes('econnrefused') || msg.includes('err_connection_refused') ||
      msg.includes('aborted') || msg.includes('abort')
    if (isConnectionError) return null
    return []
  }
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

async function fetchChartBatch(symbols: string[], concurrency = 8): Promise<{ results: QuoteData[]; hadNetworkSuccess: boolean }> {
  const results: QuoteData[] = []
  let hadNetworkSuccess = false
  for (let i = 0; i < symbols.length; i += concurrency) {
    const slice = symbols.slice(i, i + concurrency)
    const settled = await Promise.allSettled(slice.map(fetchOneChart))
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value.quote)
        if (r.value.live) hadNetworkSuccess = true
      }
    }
  }
  return { results, hadNetworkSuccess }
}

async function quoteFromHistory(sym: string): Promise<QuoteData | null> {
  try {
    const res = await fetchWithTimeout(
      `${apiBase()}/api/market/history?symbol=${encodeURIComponent(sym)}&range=7d`,
      {},
      12000,
    )
    if (!res.ok) return null
    const json = await res.json() as { prices?: Array<{ t: number; c: number }>; marketCap?: number; shortName?: string; volume?: number }
    const prices = (json.prices ?? []).filter((p) => p && Number.isFinite(p.c) && p.c > 0)
    if (prices.length < 2) return null
    const last = prices[prices.length - 1]
    const fallback = getFallbackQuote(sym)
    const syntheticLen = prices.length === 24 || prices.length === 28 || prices.length === 30
    if (syntheticLen && Math.abs(last.c - fallback.regularMarketPrice) < 1e-6) return null

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
  } catch {
    return null
  }
}

async function hydrateQuotes(quotes: QuoteData[], concurrency = 6): Promise<{ results: QuoteData[]; live: number }> {
  const out = quotes.slice()
  const needIdx: number[] = []
  out.forEach((q, i) => { if (isSyntheticQuote(q)) needIdx.push(i) })
  let live = out.length - needIdx.length
  for (let i = 0; i < needIdx.length; i += concurrency) {
    const slice = needIdx.slice(i, i + concurrency)
    const settled = await Promise.all(slice.map((idx) => quoteFromHistory(out[idx].symbol)))
    settled.forEach((q, j) => {
      if (q && !isSyntheticQuote(q)) {
        out[slice[j]] = withExactMcap(q, out[slice[j]])
        live++
      }
    })
  }
  return { results: out, live }
}

async function fetchBatch(symbols: string[]): Promise<{ results: QuoteData[]; hadNetworkSuccess: boolean }> {
  let results: QuoteData[] | null = await fetchViaProxy(symbols)
  let hadNetworkSuccess = false

  if (results === null) {
    const direct = await fetchChartBatch(symbols)
    results = direct.results
    hadNetworkSuccess = direct.hadNetworkSuccess
  }

  const foundMap = new Map<string, QuoteData>()
  for (const q of results ?? []) foundMap.set(q.symbol, q)

  const completeResults: QuoteData[] = []
  for (const sym of symbols) {
    const existing = foundMap.get(sym)
    if (existing && existing.regularMarketPrice != null && isFinite(existing.regularMarketPrice)) {
      completeResults.push(existing)
    } else {
      completeResults.push(getFallbackQuote(sym))
    }
  }

  hadNetworkSuccess = hadNetworkSuccess || completeResults.some((q) => !isSyntheticQuote(q))
  return { results: completeResults, hadNetworkSuccess }
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
        // Never store a fake fallback for a ticker that is not in the in-app catalog.
        if (isSyntheticQuote(q) && !KNOWN_SET.has(q.symbol)) return
        map[q.symbol] = withExactMcap(q, prev[q.symbol])
      })
      return map
    })
  }, [])

  const loadData = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    try {
      const extra = readUserSymbols()
      const symbols = [...new Set([...ALL_SYMBOLS, ...extra])]
      const BATCH = 20
      const allResults: QuoteData[] = []
      let onlineCount = 0

      for (let i = 0; i < symbols.length; i += BATCH) {
        const batch = symbols.slice(i, i + BATCH)
        const { results, hadNetworkSuccess } = await fetchBatch(batch)
        allResults.push(...results)
        if (hadNetworkSuccess) onlineCount++
      }

      const prev = dataRef.current
      const map: Record<string, QuoteData> = { ...prev }
      allResults.forEach((q) => {
        if (!q?.symbol || q.regularMarketPrice == null || !isFinite(q.regularMarketPrice)) return
        const old = prev[q.symbol]
        if (isSyntheticQuote(q) && old && !isSyntheticQuote(old)) return
        if (isSyntheticQuote(q) && !KNOWN_SET.has(q.symbol)) return
        map[q.symbol] = withExactMcap(q, old)
      })
      symbols.forEach((s) => {
        if (!map[s] && KNOWN_SET.has(s)) map[s] = getFallbackQuote(s)
      })

      setData(map)
      setLastUpdated(new Date())
      const liveNow = Object.values(map).some((q) => !isSyntheticQuote(q))
      setIsOnline(onlineCount > 0 || liveNow)
      setServerError(null)
      setRefreshKey((k) => k + 1)
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null }

      const missingMcap = Object.values(map).filter((q) => wantsMcap(q.symbol) && isFallbackMcap(q.symbol, q.marketCap)).map((q) => q.symbol)
      if (missingMcap.length) {
        void fetchMcapMap(missingMcap).then((caps) => {
          const patch: QuoteData[] = []
          for (const [sym, mcap] of Object.entries(caps)) {
            const prev = dataRef.current[sym]
            if (prev && typeof mcap === 'number' && mcap > 0) patch.push({ ...prev, marketCap: mcap })
          }
          if (patch.length) applyQuotes(patch)
        })
      }

      const priority = new Set([...PRIORITY_SYMBOLS, ...extra])
      const needHydrate: QuoteData[] = []
      const seen = new Set<string>()
      for (const q of Object.values(map)) {
        if (isSyntheticQuote(q) && priority.has(q.symbol)) {
          needHydrate.push(q)
          seen.add(q.symbol)
        }
      }
      for (const s of extra) {
        if (seen.has(s)) continue
        if (!map[s] || isSyntheticQuote(map[s])) {
          needHydrate.push(map[s] || getFallbackQuote(s))
          seen.add(s)
        }
      }
      if (needHydrate.length) {
        void hydrateQuotes(needHydrate, 6).then((hydrated) => {
          if (!hydrated.live) return
          applyQuotes(hydrated.results)
          setIsOnline(true)
          setLastUpdated(new Date())
        })
      }
    } catch {
      setData((prev) => {
        if (Object.keys(prev).length === 0) {
          const fallbackMap: Record<string, QuoteData> = {}
          ALL_SYMBOLS.forEach((s) => { fallbackMap[s] = getFallbackQuote(s) })
          return fallbackMap
        }
        return prev
      })
      setIsOnline(false)
      setLastUpdated(new Date())
      scheduleRetry(() => { loadData() })
    } finally {
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
    void (async () => {
      const { results } = await fetchBatch(missing)
      applyQuotes(results)
      const liveSyms = new Set(results.filter((q) => !isSyntheticQuote(q)).map((q) => q.symbol))
      const stubs = missing
        .filter((s) => !liveSyms.has(s))
        .map((s) => results.find((q) => q.symbol === s) || getFallbackQuote(s))
      if (stubs.length) {
        const hydrated = await hydrateQuotes(stubs, 4)
        applyQuotes(hydrated.results)
        if (hydrated.live) setIsOnline(true)
      }
    })()
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
