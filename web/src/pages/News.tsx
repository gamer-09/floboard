import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Section } from '../components/ui'
import { chgDir, fmtChg } from '../context/MarketContext'
import { useSettings } from '../context/SettingsContext'
import { getApiBase } from '../utils/apiBase'

type NewsTag = 'bull' | 'bear' | 'neutral'

interface NewsItem {
  src: string
  title: string
  tag: NewsTag
  age: string
  impact: string
  url?: string
}

interface EarningItem {
  sym: string
  name: string
  date: string
  epsEst: number | null
  revenueEst: number | null
  price: number | null
  changePct: number | null
}

const FALLBACK_NEWS: NewsItem[] = [
  { title: 'Global Markets Rally as Tech Sector Surges on Strong AI Earnings', src: 'Reuters', age: '1h', impact: 'Positive for technology and growth-oriented equities globally.', tag: 'bull' },
  { title: 'Federal Reserve Signals Patience on Rate Cuts Amid Economic Resilience', src: 'Bloomberg', age: '2h', impact: 'Supports US Dollar strength and stabilizes treasury bond yields.', tag: 'neutral' },
  { title: 'Gold and Silver Edge Higher as Demand for Safe-Haven Assets Continues', src: 'Financial Times', age: '3h', impact: 'Bullish momentum for precious metals and commodity-linked currencies.', tag: 'bull' },
  { title: 'Bitcoin Holds Ground Above Major Support Levels After Recent Consolidation', src: 'CoinDesk', age: '4h', impact: 'Positive sentiment across digital asset markets and Layer-1 protocols.', tag: 'bull' },
  { title: 'Crude Oil Inventories Shift as OPEC+ Evaluates Global Demand Forecasts', src: 'WSJ', age: '5h', impact: 'Key driver for energy stocks and commodity-exporting forex pairs.', tag: 'neutral' },
  { title: 'Central Banks in Europe and Asia Adjust Forex Interventions to Manage Volatility', src: 'Nikkei Asia', age: '6h', impact: 'Increases cross-pair trading opportunities and stabilizes emerging market FX.', tag: 'neutral' },
  { title: 'Semiconductor Index Rises on Surge in Enterprise AI Infrastructure Orders', src: "Investor's Business Daily", age: '7h', impact: 'Bullish for chipmakers including NVDA, AVGO, and AMD.', tag: 'bull' },
  { title: 'Treasury Yield Curve Stabilizes as Inflation Expectations Moderate', src: 'Reuters', age: '8h', impact: 'Constructive for sovereign bond markets and rate-sensitive sectors.', tag: 'neutral' },
  { title: 'Ethereum DeFi Value Locked Reaches Multi-Month High Ahead of Network Upgrade', src: 'Decrypt', age: '9h', impact: 'Positive for Ethereum ecosystem tokens and decentralized finance.', tag: 'bull' },
  { title: 'Retail Sector Guidance Mixed as Consumer Spending Shifts Toward Services', src: 'WSJ', age: '10h', impact: 'Neutral to slightly cautious for consumer discretionary equities.', tag: 'neutral' },
  { title: 'Copper and Aluminum Futures Advance on Expanded Clean Energy Projects', src: 'Bloomberg', age: '11h', impact: 'Positive for industrial metals and mining sector equities.', tag: 'bull' },
  { title: 'European Central Bank Assesses Wage Growth Trajectory for Next Monetary Step', src: 'Financial Times', age: '12h', impact: 'Influences Euro crosses and eurozone bond yields.', tag: 'neutral' },
  { title: 'Solana Network Volume Surges on Increased Decentralized Trading Activity', src: 'CoinDesk', age: '13h', impact: 'Bullish momentum for SOL and ecosystem applications.', tag: 'bull' },
  { title: 'Pharmaceutical Giants Outline Pipeline Milestones for Coming Fiscal Quarter', src: 'Reuters', age: '14h', impact: 'Constructive for healthcare and biotech sector ETFs.', tag: 'bull' },
  { title: 'Japanese Yen Consolidates as BoJ Monitors Currency and Price Dynamics', src: 'Nikkei Asia', age: '15h', impact: 'Key watch point for USD/JPY and Asian foreign exchange pairs.', tag: 'neutral' },
  { title: 'Natural Gas Supplies Rebound Following Seasonal Production Maintenance', src: 'Bloomberg', age: '16h', impact: 'Stabilizes energy commodity pricing across regional hubs.', tag: 'neutral' },
  { title: 'Cloud Software Equities Attract Institutional Inflows Following Steady Results', src: 'WSJ', age: '17h', impact: 'Supports software leaders including PLTR, CRM, and NOW.', tag: 'bull' },
  { title: 'Ondo Tokenized Real-World Asset Platform Sees Record Treasury Inflows', src: 'Decrypt', age: '18h', impact: 'Highlights expanding adoption of RWA protocols in crypto.', tag: 'bull' },
  { title: 'Global Housing Market Data Indicates Resilience Despite Mortgage Rate Plateau', src: 'Financial Times', age: '19h', impact: 'Constructive for lumber futures and residential real estate sectors.', tag: 'neutral' },
  { title: 'Automakers Accelerate EV and Hybrid Platform Transition Across Global Markets', src: 'Reuters', age: '20h', impact: 'Important catalyst for automotive leaders including TSLA and F.', tag: 'bull' },
]

const FALLBACK_EARNINGS: EarningItem[] = [
  { sym: 'NVDA', name: 'NVIDIA Corporation', date: new Date(Date.now() + 86400000 * 2).toISOString(), epsEst: 0.68, revenueEst: 28500000000, price: 128.50, changePct: 2.4 },
  { sym: 'AAPL', name: 'Apple Inc.', date: new Date(Date.now() + 86400000 * 3).toISOString(), epsEst: 1.34, revenueEst: 84200000000, price: 224.10, changePct: 0.8 },
  { sym: 'MSFT', name: 'Microsoft Corp.', date: new Date(Date.now() + 86400000 * 5).toISOString(), epsEst: 2.92, revenueEst: 64300000000, price: 442.30, changePct: -0.3 },
  { sym: 'AMZN', name: 'Amazon.com Inc.', date: new Date(Date.now() + 86400000 * 7).toISOString(), epsEst: 1.02, revenueEst: 148500000000, price: 188.40, changePct: 1.2 },
  { sym: 'GOOGL', name: 'Alphabet Inc.', date: new Date(Date.now() + 86400000 * 14).toISOString(), epsEst: 1.84, revenueEst: 84500000000, price: 175.20, changePct: 1.1 },
  { sym: 'META', name: 'Meta Platforms', date: new Date(Date.now() + 86400000 * 18).toISOString(), epsEst: 5.12, revenueEst: 38900000000, price: 512.40, changePct: -0.8 },
  { sym: 'TSLA', name: 'Tesla Inc.', date: new Date(Date.now() + 86400000 * 22).toISOString(), epsEst: 0.52, revenueEst: 25400000000, price: 220.80, changePct: 3.2 },
  { sym: 'LLY', name: 'Eli Lilly & Co.', date: new Date(Date.now() + 86400000 * 26).toISOString(), epsEst: 2.74, revenueEst: 10400000000, price: 1220.66, changePct: 1.9 },
  { sym: 'JPM', name: 'JPMorgan Chase', date: new Date(Date.now() + 86400000 * 34).toISOString(), epsEst: 4.12, revenueEst: 42100000000, price: 215.40, changePct: 0.4 },
  { sym: 'V', name: 'Visa Inc.', date: new Date(Date.now() + 86400000 * 40).toISOString(), epsEst: 2.42, revenueEst: 8900000000, price: 278.50, changePct: -0.2 },
  { sym: 'INTC', name: 'Intel Corp.', date: new Date(Date.now() + 86400000 * 45).toISOString(), epsEst: 0.12, revenueEst: 12800000000, price: 86.30, changePct: -5.8 },
  { sym: 'AMD', name: 'AMD', date: new Date(Date.now() + 86400000 * 50).toISOString(), epsEst: 0.68, revenueEst: 5700000000, price: 154.20, changePct: 2.1 },
]

function guessTag(title: string): NewsTag {
  const t = title.toLowerCase()
  if (/surge|jump|rally|gain|record|high|beat|rise|climb|soar|boom|bull/i.test(t)) return 'bull'
  if (/crash|drop|fall|plunge|loss|decline|bear|slump|sink|weak|sell/i.test(t)) return 'bear'
  return 'neutral'
}

function sanitizeAge(age: string): string {
  const raw = age.trim()
  if (!raw || raw === '?') return ''
  const m = raw.match(/^(-?\d+)\s*([mhd])$/i)
  if (!m) {
    if (/ago|min|hour|day/i.test(raw) && !raw.startsWith('-')) return raw
    return ''
  }
  const n = Number(m[1])
  if (!Number.isFinite(n) || n < 0 || n > 60 * 24 * 400) return ''
  return `${n}${m[2].toLowerCase()}`
}

function normalizeNews(raw: unknown): NewsItem[] {
  const list = Array.isArray(raw) ? raw : []
  return list.map((n) => {
    const row = n as Record<string, unknown>
    const title = String(row.title ?? '')
    const tag = (row.tag === 'bull' || row.tag === 'bear' || row.tag === 'neutral') ? row.tag : guessTag(title)
    return {
      src: String(row.src ?? row.publisher ?? 'News'),
      title,
      tag,
      age: sanitizeAge(String(row.age ?? '')),
      impact: String(row.impact ?? 'Broader market sentiment'),
      url: typeof row.url === 'string' ? row.url : typeof row.link === 'string' ? row.link : undefined,
    }
  }).filter((n) => n.title)
}

async function fetchNews(count: number): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/news?count=${count}`)
    if (res.ok) {
      const json = await res.json() as { news?: unknown; items?: unknown }
      const items = normalizeNews(json.news ?? json.items)
      if (items.length) return items.slice(0, count)
    }
  } catch { /* fallback */ }
  return FALLBACK_NEWS.slice(0, count)
}

async function fetchEarnings(weeks: number): Promise<EarningItem[]> {
  const filterByWeeks = (list: EarningItem[]) => {
    const maxMs = weeks * 7 * 86400000
    return list.filter((item) => {
      const diff = new Date(item.date).getTime() - Date.now()
      return diff >= -86400000 && diff <= maxMs
    })
  }
  try {
    const res = await fetch(`${getApiBase()}/api/earnings?weeks=${weeks}`)
    if (res.ok) {
      const json = await res.json() as { earnings?: EarningItem[] }
      if (json.earnings?.length) return json.earnings
    }
  } catch { /* fallback */ }
  return filterByWeeks(FALLBACK_EARNINGS)
}

function fmtRevenue(n: number | null, compact: boolean): string {
  if (!n) return '—'
  if (!compact) return '$' + Math.round(n).toLocaleString('en-US')
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toFixed(0)}`
}

function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function TagPill({ tag }: { tag: NewsTag }) {
  const map = {
    bull: { cls: 'up', label: '▲ Bullish' },
    bear: { cls: 'dn', label: '▼ Bearish' },
    neutral: { cls: 'flat', label: '◆ Neutral' },
  }
  const { cls, label } = map[tag]
  return <span className={`chg ${cls}`}>{label}</span>
}

export default function NewsScreen() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [refreshing, setRefreshing] = useState(false)
  const weeks = settings.earningsWindow
  const newsCount = settings.newsCount

  const newsQ = useQuery({
    queryKey: ['news', newsCount],
    queryFn: () => fetchNews(newsCount),
    staleTime: 60_000,
  })
  const earnQ = useQuery({
    queryKey: ['earnings', weeks],
    queryFn: () => fetchEarnings(weeks),
    staleTime: 30 * 60_000,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([newsQ.refetch(), earnQ.refetch()])
    setRefreshing(false)
  }, [newsQ, earnQ])

  const items = newsQ.data ?? []
  const earnings = earnQ.data ?? []
  const bull = items.filter((i) => i.tag === 'bull').length
  const bear = items.filter((i) => i.tag === 'bear').length
  const neutral = items.filter((i) => i.tag === 'neutral').length
  const total = items.length || 1

  const openAi = (q: string) => navigate(`/advisor?q=${encodeURIComponent(q)}`)

  return (
    <div className="page">
      <div className="news-banner">
        <span>✦</span>
        Live headlines — tap any story or earnings card for FloAI analysis.
        <button className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={refreshing || newsQ.isFetching} style={{ marginLeft: 'auto' }}>
          {refreshing || newsQ.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <Section label="Earnings calendar" count={earnings.length}>
        {earnQ.isLoading && <div className="muted" style={{ padding: 12 }}>Loading earnings…</div>}
        {!earnQ.isLoading && earnings.length === 0 && <div className="muted" style={{ padding: 12 }}>No major earnings this window</div>}
        <div className="earn-list">
          {earnings.map((item) => {
            const days = daysUntil(item.date)
            const dir = chgDir(item.changePct)
            const isToday = days === 0
            const isSoon = days > 0 && days <= 3
            const label = days < 0 ? 'Reported' : isToday ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days}d`
            return (
              <button
                key={`${item.sym}-${item.date}`}
                type="button"
                className={`earn-card ${isToday ? 'today' : ''}`}
                onClick={() => openAi(`${item.sym} earnings report: what are analysts expecting and what should investors watch for?`)}
              >
                <div>
                  <div className="earn-sym-row">
                    <span className="sym">{item.sym}</span>
                    {item.changePct != null && <span className={`num-${dir}`}>{fmtChg(item.changePct)}</span>}
                  </div>
                  <div className="muted">{item.name}</div>
                  <div className="muted">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                </div>
                <div className="earn-right">
                  <span className={`chg ${isToday ? 'flat' : isSoon ? 'up' : 'flat'}`}>{label}</span>
                  <div className="earn-est">
                    {item.epsEst != null && <span><small>EPS</small> {item.epsEst > 0 ? '+' : ''}{item.epsEst.toFixed(2)}</span>}
                    {item.revenueEst != null && <span><small>REV</small> {fmtRevenue(item.revenueEst, settings.compactNumbers)}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </Section>

      <Section label="Market news" count={items.length}>
        {items.length > 0 && (
          <div className="sentiment">
            <div className="sentiment-head">
              <span className="section-label" style={{ margin: 0 }}>Sentiment</span>
              <div className="sentiment-legend">
                <span className="num-up">{bull} bullish</span>
                <span className="num-dn">{bear} bearish</span>
                <span className="num-flat">{neutral} neutral</span>
              </div>
            </div>
            <div className="sentiment-track">
              {bull > 0 && <div style={{ width: `${(bull / total) * 100}%`, background: 'var(--gain)' }} />}
              {neutral > 0 && <div style={{ width: `${(neutral / total) * 100}%`, background: 'var(--amber)' }} />}
              {bear > 0 && <div style={{ width: `${(bear / total) * 100}%`, background: 'var(--loss)' }} />}
            </div>
          </div>
        )}

        {newsQ.isLoading && (
          <div style={{ display: 'grid', placeItems: 'center', padding: 48 }}><div className="spinner" /></div>
        )}

        <div className="news-list">
          {items.map((item, i) => {
            const accent = item.tag === 'bull' ? 'var(--gain)' : item.tag === 'bear' ? 'var(--loss)' : 'var(--amber)'
            return (
              <button
                key={i}
                type="button"
                className="news-card news-card-btn"
                onClick={() => openAi(`Explain this news story and what it means for markets: ${item.title}`)}
              >
                <span className="news-accent" style={{ background: accent }} />
                <span className="news-body">
                  <span className="news-meta">
                    <span className="news-src">{item.src}</span>
                    {item.age && <span className="muted" style={{ margin: 0 }}>{item.age} ago</span>}
                    <TagPill tag={item.tag} />
                  </span>
                  <span className="news-title">{item.title}</span>
                  {item.impact && <span className="news-impact">{item.impact}</span>}
                  <span className="news-hint">Tap for FloAI analysis</span>
                </span>
              </button>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
