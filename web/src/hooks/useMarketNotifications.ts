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

function utcDay() {
  return new Date().toISOString().slice(0, 10)
}

function readHoldings(): { symbol: string }[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HOLDINGS_KEY) || '[]') as unknown
    if (!Array.isArray(raw)) return []
    return raw
      .map((row) => {
        if (!row || typeof row !== 'object') return ''
        const rec = row as { symbol?: string; sym?: string }
        return String(rec.symbol || rec.sym || '').trim()
      })
      .filter(Boolean)
      .map((symbol) => ({ symbol }))
  } catch {
    return []
  }
}

export function useMarketNotifications() {
  const { data, lastUpdated } = useMarket()
  const { settings } = useSettings()
  const firstLoad = useRef(true)
  const dayRef = useRef(utcDay())
  const notifiedPortfolio = useRef(new Set<string>())
  const notifiedMarket = useRef(new Set<string>())
  const dataRef = useRef<Record<string, QuoteData>>({})

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    if (!lastUpdated) return
    if (!settings.notificationsEnabled) return

    const today = utcDay()
    if (dayRef.current !== today) {
      dayRef.current = today
      notifiedPortfolio.current = new Set()
      notifiedMarket.current = new Set()
    }

    if (firstLoad.current) {
      firstLoad.current = false
      return
    }

    const quotes = dataRef.current

    if (settings.notifyPortfolio && settings.alertThreshold > 0) {
      for (const h of readHoldings()) {
        const q = quotes[h.symbol]
        if (!q) continue
        const pct = q.regularMarketChangePercent ?? 0
        if (Math.abs(pct) < settings.alertThreshold) continue
        if (notifiedPortfolio.current.has(h.symbol)) continue
        notifiedPortfolio.current.add(h.symbol)
        const dir = pct >= 0 ? '▲' : '▼'
        const sign = pct >= 0 ? '+' : ''
        sendLocalNotification(
          `${dir} ${h.symbol} ${sign}${pct.toFixed(2)}% today`,
          `${h.symbol} is $${q.regularMarketPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} — crossed your ${settings.alertThreshold}% day-move alert.`,
          { tag: `pf-${h.symbol}-${today}`, href: '#/portfolio' },
        )
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
  }, [lastUpdated, settings.notificationsEnabled, settings.notifyPortfolio, settings.notifyMarketMoves, settings.notifyNews, settings.alertThreshold])
}
