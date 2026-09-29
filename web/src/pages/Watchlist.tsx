import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SparklineChart from '../components/SparklineChart'
import { EmptyState, SearchBox, Segmented } from '../components/ui'
import { COMMODITIES, CRYPTOS, FOREX, INDICES, STOCKS } from '../constants/marketData'
import { chgDir, fmt, fmtChg, fmtMcap, isSyntheticQuote, useMarket, type QuoteData } from '../context/MarketContext'
import { useSettings } from '../context/SettingsContext'
import { getApiBase } from '../utils/apiBase'
import { isKnownSymbol, keepYahooSymbols, verifySymbol } from '../utils/lookup'

function hasLiveQuote(sym: string, d: QuoteData | undefined) {
  if (!d) return false
  if (isKnownSymbol(sym)) return true
  return !isSyntheticQuote(d)
}

const FAV_KEY = 'floboard:watchlist'

type TabId = 'Favorites' | 'Tech' | 'Crypto' | 'Macro'

interface TabDef {
  id: TabId
  label: string
  defaults: string[]
}

const TABS: TabDef[] = [
  { id: 'Favorites', label: '★ Favorites', defaults: [] },
  { id: 'Tech', label: 'Tech & AI', defaults: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'PLTR'] },
  { id: 'Crypto', label: 'Crypto', defaults: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'DOGE-USD'] },
  { id: 'Macro', label: 'FX & Metals', defaults: ['EURUSD=X', 'USDJPY=X', 'XAUUSD=X', 'XAGUSD=X', 'GC=F', 'SI=F', '^TNX'] },
]

const NAMES: Record<string, string> = {
  ...Object.fromEntries(STOCKS.map((s) => [s.sym, s.name])),
  ...Object.fromEntries(CRYPTOS.map((c) => [c.sym, c.name])),
  ...Object.fromEntries(FOREX.map((f) => [f.sym, f.label])),
  ...Object.fromEntries(INDICES.map((i) => [i.sym, i.name])),
  ...Object.fromEntries(COMMODITIES.map((c) => [c.sym, c.label])),
  PLTR: 'Palantir',
  'XAUUSD=X': 'Gold Spot',
  'XAGUSD=X': 'Silver Spot',
  '^TNX': '10-Year Yield',
}

const CATALOG = [
  ...STOCKS.map((s) => ({ sym: s.sym, name: s.name })),
  ...CRYPTOS.map((c) => ({ sym: c.sym, name: c.name })),
  ...FOREX.slice(0, 40).map((f) => ({ sym: f.sym, name: f.label })),
  ...INDICES.map((i) => ({ sym: i.sym, name: i.name })),
  ...COMMODITIES.map((c) => ({ sym: c.sym, name: c.label })),
  { sym: 'PLTR', name: 'Palantir' },
  { sym: 'SPY', name: 'S&P 500 ETF' },
  { sym: 'QQQ', name: 'Nasdaq 100 ETF' },
  { sym: '^TNX', name: '10-Year Yield' },
]

function storageKey(tab: TabId) {
  return tab === 'Favorites' ? FAV_KEY : `${FAV_KEY}:${tab}`
}

function loadTab(tab: TabDef): string[] {
  try {
    const raw = localStorage.getItem(storageKey(tab.id))
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parsed.map((s) => String(s)).filter(Boolean)
    }
  } catch { /* ignore */ }
  return [...tab.defaults]
}

function saveTab(tab: TabId, syms: string[]) {
  try { localStorage.setItem(storageKey(tab), JSON.stringify(syms)) } catch { /* ignore */ }
}

function nameOf(sym: string, dataName?: string) {
  return NAMES[sym] ?? dataName ?? sym
}

function isFx(sym: string) {
  return sym.includes('=X') || sym.includes('/')
}

function decimals(sym: string) {
  if (sym.startsWith('^T') || sym.startsWith('^IR') || sym.startsWith('^FV') || sym.startsWith('^TY')) return 2
  if (isFx(sym)) return 4
  return 2
}

export default function WatchlistScreen() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { data, ensureSymbols } = useMarket()
  const [tab, setTab] = useState<TabId>(() => {
    try {
      const fav = JSON.parse(localStorage.getItem(FAV_KEY) || '[]') as unknown
      if (Array.isArray(fav) && fav.length) return 'Favorites'
    } catch { /* ignore */ }
    return 'Tech'
  })
  const tabDef = TABS.find((t) => t.id === tab) ?? TABS[1]
  const [symbols, setSymbols] = useState<string[]>(() => loadTab(tabDef))
  const [search, setSearch] = useState('')
  const [remote, setRemote] = useState<{ sym: string; name: string }[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  useEffect(() => {
    const def = TABS.find((t) => t.id === tab) ?? TABS[0]
    if (tab === 'Favorites' && settings.clearWatchlistKey > 0) {
      setSymbols([])
      saveTab('Favorites', [])
      return
    }
    const loaded = loadTab(def)
    setSymbols(loaded)
    setSearch('')
    setExpanded(null)
    setLookupError('')
    const unknown = loaded.filter((s) => !isKnownSymbol(s))
    if (!unknown.length) return
    let cancelled = false
    void keepYahooSymbols(loaded).then((ok) => {
      if (cancelled) return
      if (ok.length === loaded.length && ok.every((s, i) => s === loaded[i])) return
      setSymbols(ok)
      saveTab(tab, ok)
    })
    return () => { cancelled = true }
  }, [tab, settings.clearWatchlistKey])

  useEffect(() => {
    if (symbols.length) ensureSymbols(symbols)
  }, [symbols, ensureSymbols])

  useEffect(() => {
    const q = search.trim()
    if (q.length < 1) {
      setRemote([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const json = await res.json() as { results?: { sym: string; name: string }[] }
        const have = new Set(symbols.map((s) => s.toUpperCase()))
        setRemote(
          (json.results ?? [])
            .filter((r) => r.sym && !have.has(r.sym.toUpperCase()))
            .slice(0, 8)
            .map((r) => ({ sym: r.sym, name: r.name })),
        )
      } catch { /* ignore */ }
    }, 280)
    return () => clearTimeout(t)
  }, [search, symbols])

  const persist = (next: string[]) => {
    setSymbols(next)
    saveTab(tab, next)
  }

  const addVerified = (sym: string, name?: string) => {
    if (!sym || symbols.includes(sym) || symbols.includes(sym.toUpperCase())) {
      setSearch('')
      setLookupError('')
      return
    }
    if (name) NAMES[sym] = name
    persist([sym, ...symbols])
    ensureSymbols([sym])
    setSearch('')
    setRemote([])
    setLookupError('')
  }

  const addSymbol = async (sym: string, alreadyVerified = false) => {
    const typed = sym.trim()
    if (!typed) return
    if (alreadyVerified) {
      addVerified(typed)
      return
    }
    setLookingUp(true)
    setLookupError('')
    const result = await verifySymbol(typed)
    setLookingUp(false)
    if (!result.ok) {
      setLookupError(result.error)
      return
    }
    addVerified(result.sym, result.name)
  }

  const removeSymbol = (sym: string) => {
    persist(symbols.filter((s) => s !== sym))
    if (expanded === sym) setExpanded(null)
  }

  const searching = search.trim().length > 0

  const searchResults = useMemo(() => {
    if (!searching) return []
    const q = search.toLowerCase()
    const have = new Set(symbols.map((s) => s.toUpperCase()))
    const local = CATALOG.filter((c) =>
      !have.has(c.sym.toUpperCase()) && (c.sym.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)),
    )
    const seen = new Set(local.map((c) => c.sym.toUpperCase()))
    const extra = remote.filter((r) => !have.has(r.sym.toUpperCase()) && !seen.has(r.sym.toUpperCase()))
    return [...local, ...extra].slice(0, 12)
  }, [search, searching, symbols, remote])

  const sorted = useMemo(() => {
    const items = symbols.map((sym) => ({
      sym,
      name: nameOf(sym, data[sym]?.shortName),
    }))
    if (settings.watchlistSort === 'change') {
      items.sort((a, b) => (data[b.sym]?.regularMarketChangePercent ?? 0) - (data[a.sym]?.regularMarketChangePercent ?? 0))
    } else if (settings.watchlistSort === 'alpha') {
      items.sort((a, b) => a.sym.localeCompare(b.sym))
    }
    return items
  }, [symbols, settings.watchlistSort, data])

  const openAi = (sym: string, name: string) => {
    navigate(`/advisor?q=${encodeURIComponent(`Give me a full analysis of ${sym} (${name}) — price, recent performance, outlook, and key risks.`)}`)
  }

  return (
    <div className="page">
      <div className="toolbar">
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as TabId)}
          options={TABS.map((t) => ({ label: t.label, value: t.id }))}
        />
        <SearchBox value={search} onChange={setSearch} placeholder="Search Yahoo Finance…" />
        <span className="muted">{sorted.length} tracked</span>
      </div>

      {searching && (
        <div className="panel form-card" style={{ marginBottom: 16 }}>
          {lookingUp && <div className="muted">Checking Yahoo Finance…</div>}
          {lookupError && <div className="lookup-err">{lookupError}</div>}
          {!lookingUp && searchResults.length === 0 && !lookupError && (
            <div className="muted">No match in the app or on Yahoo Finance. If it isn’t listed there, it cannot be added or shown.</div>
          )}
          {searchResults.map((cat) => (
            <button
              key={cat.sym}
              type="button"
              onClick={() => addSymbol(cat.sym, true)}
              style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--t1)', textAlign: 'left', borderBottom: '1px solid var(--rim)' }}
            >
              <strong>{cat.sym}</strong> <span className="muted">· {cat.name}</span>
            </button>
          ))}
          {search.trim() && !symbols.includes(search.trim().toUpperCase()) && (
            <button className="btn btn-primary" onClick={() => addSymbol(search)} type="button" disabled={lookingUp}>
              {lookingUp ? 'Checking…' : `Look up “${search.trim().toUpperCase()}”`}
            </button>
          )}
        </div>
      )}
      {!searching && lookupError && <div className="lookup-err" style={{ marginBottom: 12 }}>{lookupError}</div>}

      {!searching && sorted.length === 0 && (
        <EmptyState
          icon="★"
          title={tab === 'Favorites' ? 'No favorites yet' : 'This list is empty'}
          hint={tab === 'Favorites' ? 'Search above to pin symbols. Settings → Clear Favorites only empties this tab — Tech, Crypto, and FX stay.' : 'Search above to add symbols to this list.'}
        />
      )}

      {!searching && (
        <div className="asset-list">
          {sorted.map(({ sym, name }) => {
            const d = data[sym]
            const live = hasLiveQuote(sym, d)
            const chg = live ? (d?.regularMarketChangePercent ?? 0) : 0
            const dir = live ? chgDir(chg) : 'flat'
            const col = dir === 'up' ? 'var(--gain)' : dir === 'dn' ? 'var(--loss)' : 'var(--t2)'
            const dec = decimals(sym)
            const prefix = isFx(sym) || sym.startsWith('^') ? '' : '$'
            const open = expanded === sym
            return (
              <div key={sym}>
                <div
                  className="asset fav"
                  onClick={() => setExpanded(open ? null : sym)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="avatar" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>{sym.replace(/[^A-Z0-9]/gi, '').slice(0, 2) || '•'}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="sym">{sym}</div>
                    <div className="muted">{name}</div>
                  </div>
                  <div className="spark">
                    {live ? <SparklineChart symbol={sym} range="7d" width={80} height={32} color={col} /> : null}
                  </div>
                  <div className="right">
                    {live ? (
                      <>
                        <div className="mono" style={{ fontWeight: 700 }}>{`${prefix}${fmt(d!.regularMarketPrice, dec)}`}</div>
                        <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: col, marginTop: 2 }}>{fmtChg(chg)}</div>
                      </>
                    ) : (
                      <>
                        <div className="mono" style={{ fontWeight: 700, color: 'var(--t3)' }}>N/A</div>
                        <div className="muted">Not on Yahoo</div>
                      </>
                    )}
                  </div>
                  <span style={{ color: 'var(--t4)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
                </div>
                {open && (
                  <div className="expand" style={{ borderLeftColor: col }}>
                    {live ? (
                      <>
                        <SparklineChart symbol={sym} range="7d" width={420} height={72} showLabels color={col} />
                        <div className="stat-grid">
                          {d?.regularMarketDayHigh != null && <div><div className="stat-lab">Day high</div><div className="stat-val" style={{ color: 'var(--gain)' }}>{prefix}{fmt(d.regularMarketDayHigh, dec)}</div></div>}
                          {d?.regularMarketDayLow != null && <div><div className="stat-lab">Day low</div><div className="stat-val" style={{ color: 'var(--loss)' }}>{prefix}{fmt(d.regularMarketDayLow, dec)}</div></div>}
                          {d?.regularMarketPreviousClose != null && <div><div className="stat-lab">Prev close</div><div className="stat-val">{prefix}{fmt(d.regularMarketPreviousClose, dec)}</div></div>}
                          {d?.marketCap ? <div><div className="stat-lab">Mkt cap</div><div className="stat-val">{fmtMcap(d.marketCap, settings.compactNumbers)}</div></div> : null}
                        </div>
                      </>
                    ) : (
                      <p className="muted" style={{ whiteSpace: 'normal' }}>This ticker is not on Yahoo Finance, so FloBoard cannot show it. Remove it from the list.</p>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      {live && <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openAi(sym, name) }}>Ask FloAI</button>}
                      <button type="button" className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); removeSymbol(sym) }}>Remove</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
