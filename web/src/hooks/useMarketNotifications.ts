import { useEffect, useRef } from 'react'
import { useMarket, type QuoteData } from '../context/MarketContext'
import { useSettings } from '../context/SettingsContext'
import { getApiBase } from '../utils/apiBase'
import { sendLocalNotification } from '../utils/notifications'

const MAJOR = [
  { sym: '^GSPC', name: 'S&P 500' },
  { sym: '^IXIC', name: 'Nasdaq' },
  { sym: '^DJI', name: 'Dow Jones' },
  { sym: 'BTC-USD', name: 'Bitcoin' },
]

const MARKET_MOVE_PCT = 1.5
const NEWS_KEY = 'floboard:lastNewsHeadline'
const HOLDINGS_KEY = 'floboard:holdings'
const FAV_KEY = 'floboard:watchlist'

function utcDay() {
  return new Date().toISOString().slice(0, 10)
}

function readHoldings(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HOLDINGS_KEY) || '[]') as unknown
    if (!Array.isArray(raw)) return []
    return [...new Set(raw.map((row) => {
      if (!row || typeof row !== 'object') return ''
      const rec = row as { symbol?: string; sym?: string }
      return String(rec.symbol || rec.sym || '').trim()
    }).filter(Boolean))]
  } catch {
    return []
  }
}

function readFavorites(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]') as unknown
    if (!Array.isArray(raw)) return []
    return [...new Set(raw.map((s) => String(s || '').trim()).filter(Boolean))]
  } catch {
    return []
  }
}

function fmtPx(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function useMarketNotifications() {
  const { data, lastUpdated, ensureSymbols } = useMarket()
  const { settings } = useSettings()
  const firstLoad = useRef(true)
  const dayRef = useRef(utcDay())
  const notifiedPortfolio = useRef(new Set<string>())
  const notifiedWatch = useRef(new Set<string>())
  const notifiedMarket = useRef(new Set<string>())
  const dataRef = useRef<Record<string, QuoteData>>({})

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    if (!settings.notificationsEnabled || !settings.notifyWatchlist) return
    const favs = readFavorites()
    if (favs.length) ensureSymbols(favs)
  }, [settings.notificationsEnabled, settings.notifyWatchlist, lastUpdated, ensureSymbols])

  useEffect(() => {
    if (!lastUpdated) return
    if (!settings.notificationsEnabled) return

    const today = utcDay()
    if (dayRef.current !== today) {
      dayRef.current = today
      notifiedPortfolio.current = new Set()
      notifiedWatch.current = new Set()
      notifiedMarket.current = new Set()
    }

    if (firstLoad.current) {
      firstLoad.current = false
      return
    }

    const quotes = dataRef.current
    const watchThreshold = settings.alertThreshold > 0 ? settings.alertThreshold : 1.5

    const ping = (sym: string, q: QuoteData, kind: 'pf' | 'fav') => {
      const pct = q.regularMarketChangePercent ?? 0
      const dir = pct >= 0 ? '▲' : '▼'
      const sign = pct >= 0 ? '+' : ''
      const prefix = kind === 'fav' ? '★ ' : ''
      const href = kind === 'fav' ? '#/watchlist' : '#/portfolio'
      void sendLocalNotification(
        `${prefix}${dir} ${sym} ${sign}${pct.toFixed(2)}% today`,
        `${sym} is ${fmtPx(q.regularMarketPrice)} — ${kind === 'fav' ? 'favorite' : 'holding'} crossed your ${watchThreshold}% day-move alert.`,
        { tag: `${kind}-${sym}-${today}`, href },
      )
    }

    if (settings.notifyPortfolio && settings.alertThreshold > 0) {
      for (const sym of readHoldings()) {
        const q = quotes[sym]
        if (!q) continue
        const pct = q.regularMarketChangePercent ?? 0
        if (Math.abs(pct) < settings.alertThreshold) continue
        if (notifiedPortfolio.current.has(sym)) continue
        notifiedPortfolio.current.add(sym)
        ping(sym, q, 'pf')
      }
    }

    if (settings.notifyWatchlist) {
      for (const raw of readFavorites()) {
        const sym = raw
        const q = quotes[sym] || quotes[sym.toUpperCase()]
        if (!q) continue
        const pct = q.regularMarketChangePercent ?? 0
        if (Math.abs(pct) < watchThreshold) continue
        if (notifiedWatch.current.has(sym) || notifiedPortfolio.current.has(sym)) continue
        notifiedWatch.current.add(sym)
        ping(sym, q, 'fav')
      }
    }

    if (settings.notifyMarketMoves) {
      for (const idx of MAJOR) {
        const q = quotes[idx.sym]
        if (!q) continue
        const pct = q.regularMarketChangePercent ?? 0
        if (Math.abs(pct) < MARKET_MOVE_PCT) continue
        const key = `${idx.sym}:${pct >= 0 ? 'up' : 'dn'}:${today}`
        if (notifiedMarket.current.has(key)) continue
        notifiedMarket.current.add(key)
        const dir = pct >= 0 ? '▲' : '▼'
        const sign = pct >= 0 ? '+' : ''
        sendLocalNotification(
          `${dir} ${idx.name} ${sign}${pct.toFixed(2)}% today`,
          `${idx.name} is at ${q.regularMarketPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}.`,
          { tag: `mkt-${idx.sym}-${today}`, href: '#/markets' },
        )
      }
    }

    if (settings.notifyNews) {
      fetch(`${getApiBase()}/api/news?count=1`)
        .then((r) => r.json())
        .then((d: { news?: Array<{ title?: string }> }) => {
          const headline = d.news?.[0]?.title?.trim()
          if (!headline) return
          let last: string | null = null
          try { last = localStorage.getItem(NEWS_KEY) } catch { /* ignore */ }
          if (last === headline) return
          try { localStorage.setItem(NEWS_KEY, headline) } catch { /* ignore */ }
          if (last == null) return
          sendLocalNotification('New market headline', headline, { tag: `news-${today}`, href: '#/news' })
        })
        .catch(() => {})
    }
  }, [lastUpdated, settings.notificationsEnabled, settings.notifyPortfolio, settings.notifyWatchlist, settings.notifyMarketMoves, settings.notifyNews, settings.alertThreshold])
}
