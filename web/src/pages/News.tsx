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
  } catch { /* live only — never invent headlines */ }
  return []
}

async function fetchEarnings(weeks: number): Promise<EarningItem[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/earnings?weeks=${weeks}`)
    if (res.ok) {
      const json = await res.json() as { earnings?: EarningItem[] }
      if (json.earnings?.length) return json.earnings
    }
  } catch { /* live only — never invent earnings */ }
  return []
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
        {!newsQ.isLoading && items.length === 0 && (
          <div className="muted" style={{ padding: 12 }}>No live headlines right now. Try Refresh.</div>
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
