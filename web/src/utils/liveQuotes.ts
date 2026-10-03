type Prices = Array<{ t: number; c: number }>

export interface LiveQuote {
  symbol: string
  shortName?: string
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
}

function extractChartJson(text: string): unknown | null {
  const i = text.indexOf('{"chart"')
  if (i < 0) return null
  try {
    return JSON.parse(text.slice(i, text.lastIndexOf('}') + 1))
  } catch {
    return null
  }
}

function parseChart(json: unknown, sym: string): { prices: Prices; quote: LiveQuote | null } {
  const row = (json as {
    chart?: {
      result?: Array<{
        meta?: Record<string, unknown>
        timestamp?: number[]
        indicators?: { quote?: Array<{ close?: Array<number | null> }> }
      }>
    }
  })?.chart?.result?.[0]
  if (!row) return { prices: [], quote: null }
  const meta = row.meta ?? {}
  const ts = row.timestamp ?? []
  const close = row.indicators?.quote?.[0]?.close ?? []
  const prices: Prices = []
  for (let i = 0; i < ts.length; i++) {
    const c = close[i]
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) prices.push({ t: ts[i], c })
  }
  const price = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : prices[prices.length - 1]?.c
  if (!(typeof price === 'number' && price > 0)) return { prices, quote: null }
  const prev = (typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose
    : typeof meta.previousClose === 'number' ? meta.previousClose
      : prices.length >= 2 ? prices[prices.length - 2].c : price) as number
  const change = price - prev
  const changePct = prev ? (change / prev) * 100 : 0
  const quote: LiveQuote = {
    symbol: sym,
    shortName: typeof meta.shortName === 'string' ? meta.shortName : undefined,
    currency: typeof meta.currency === 'string' ? meta.currency : undefined,
    regularMarketPrice: price,
    regularMarketChangePercent: typeof meta.regularMarketChangePercent === 'number' ? meta.regularMarketChangePercent : changePct,
    regularMarketChange: typeof meta.regularMarketChange === 'number' ? meta.regularMarketChange : change,
    regularMarketPreviousClose: prev,
    regularMarketOpen: typeof meta.regularMarketOpen === 'number' ? meta.regularMarketOpen : undefined,
    regularMarketDayHigh: typeof meta.regularMarketDayHigh === 'number' ? meta.regularMarketDayHigh : undefined,
    regularMarketDayLow: typeof meta.regularMarketDayLow === 'number' ? meta.regularMarketDayLow : undefined,
    regularMarketVolume: typeof meta.regularMarketVolume === 'number' ? meta.regularMarketVolume : 0,
    fiftyTwoWeekHigh: typeof meta.fiftyTwoWeekHigh === 'number' ? meta.fiftyTwoWeekHigh : undefined,
    fiftyTwoWeekLow: typeof meta.fiftyTwoWeekLow === 'number' ? meta.fiftyTwoWeekLow : undefined,
    marketCap: typeof meta.marketCap === 'number' ? meta.marketCap : 0,
  }
  return { prices, quote }
}

let relayActive = 0
const relayWait: Array<() => void> = []
async function relaySlot() {
  if (relayActive < 4) {
    relayActive++
    return
  }
  await new Promise<void>((resolve) => relayWait.push(resolve))
  relayActive++
}
function relayDone() {
  relayActive = Math.max(0, relayActive - 1)
  const next = relayWait.shift()
  if (next) next()
}

/** Last-resort Yahoo chart via a CORS-open relay when the API host is blocked. */
export async function fetchYahooChartRelay(
  sym: string,
  range = '5d',
  interval = '1d',
): Promise<{ prices: Prices; quote: LiveQuote | null }> {
  await relaySlot()
  try {
    const inner = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`
    const res = await fetch(`https://r.jina.ai/${inner}`, { headers: { Accept: 'text/plain' } })
    if (!res.ok) return { prices: [], quote: null }
    const json = extractChartJson(await res.text())
    if (!json) return { prices: [], quote: null }
    return parseChart(json, sym)
  } catch {
    return { prices: [], quote: null }
  } finally {
    relayDone()
  }
}

const GECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', DOGE: 'dogecoin', ADA: 'cardano', AVAX: 'avalanche-2',
  DOT: 'polkadot', LINK: 'chainlink', LTC: 'litecoin', SHIB: 'shiba-inu',
  TRX: 'tron', UNI: 'uniswap', ATOM: 'cosmos', NEAR: 'near',
}

export async function fetchGeckoUsdQuote(sym: string): Promise<LiveQuote | null> {
  const upper = sym.toUpperCase()
  if (!upper.endsWith('-USD')) return null
  const tick = upper.replace(/-USD$/, '').replace(/\d+$/, '')
  const id = GECKO_IDS[tick]
  if (!id) return null
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
    )
    if (!res.ok) return null
    const json = await res.json() as Record<string, { usd?: number; usd_24h_change?: number; usd_24h_vol?: number; usd_market_cap?: number }>
    const row = json[id]
    if (!row || !(row.usd! > 0)) return null
    const price = row.usd!
    const chg = row.usd_24h_change ?? 0
    const prev = chg ? price / (1 + chg / 100) : price
    return {
      symbol: sym,
      currency: 'USD',
      regularMarketPrice: price,
      regularMarketChangePercent: chg,
      regularMarketChange: price - prev,
      regularMarketPreviousClose: prev,
      regularMarketVolume: row.usd_24h_vol ?? 0,
      marketCap: row.usd_market_cap ?? 0,
    }
  } catch {
    return null
  }
}
