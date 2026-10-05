import React, { useEffect, useMemo, useState } from 'react'
import Flag from '../components/Flag'
import SparklineChart from '../components/SparklineChart'
import { AsOf, ChangeBadge, Section, Segmented } from '../components/ui'
import { EXCHANGES, getExchangeStatus } from '../constants/exchanges'
import { BONDS, COMMODITIES, CRYPTOS, FOREX, INDICES, SECTORS, STOCKS } from '../constants/marketData'
import { chgDir, fmt, fmtChg, sessionQuote, useMarket } from '../context/MarketContext'
import { useSettings } from '../context/SettingsContext'
import { useColors } from '../hooks/useColors'
import { useFormat } from '../hooks/useFormat'

const RIBBON = [
  { sym: '^GSPC', label: 'S&P 500', kind: 'idx' as const },
  { sym: '^IXIC', label: 'Nasdaq', kind: 'idx' as const },
  { sym: 'BTC-USD', label: 'Bitcoin', kind: 'btc' as const },
  { sym: 'GC=F', label: 'Gold', kind: 'idx' as const },
  { sym: 'DX-Y.NYB', label: 'DXY', kind: 'dxy' as const },
  { sym: '^TNX', label: '10Y', kind: 'yield' as const },
]

function formatRibbon(kind: 'idx' | 'btc' | 'dxy' | 'yield', price: number | undefined, compact: boolean) {
  if (price == null) return '—'
  if (kind === 'yield') return `${fmt(price, 2)}%`
  if (kind === 'dxy') return fmt(price, 2)
  if (kind === 'btc') return `$${fmt(price, compact ? 0 : 2)}`
  return fmt(price, compact ? 0 : 2)
}

function IndexCard({ sym, name, region }: { sym: string; name: string; region: string }) {
  const { data } = useMarket()
  const { index } = useFormat()
  const d = data[sym]
  const chg = d?.regularMarketChangePercent ?? 0
  const dir = chgDir(chg)
  const accent = dir === 'up' ? 'var(--gain)' : dir === 'dn' ? 'var(--loss)' : 'var(--rim)'
  return (
    <article className="index-card">
      <div className="index-bar" style={{ background: accent }} />
      <div className="index-body">
        <div className="index-region">{region}</div>
        <div className="index-name">{name}</div>
        <div className="index-price">{d ? index(d.regularMarketPrice) : '—'}</div>
        <div className="index-meta">
          <ChangeBadge value={d ? chg : null} />
          <AsOf at={d?.updatedAt} />
        </div>
        <div style={{ marginTop: 8 }}>
          <SparklineChart symbol={sym} range="7d" width={160} height={42} color={d ? accent : undefined} />
        </div>
      </div>
    </article>
  )
}

function MarketHoursSection() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const now = new Date()
  const statuses = EXCHANGES.map((ex) => ({ ex, st: getExchangeStatus(ex, now) }))
  const openCount = statuses.filter((s) => s.st.open).length
  const regions = Array.from(new Set(EXCHANGES.map((e) => e.region)))

  return (
    <Section
      label="Market Hours"
      right={
        <span className={`status-pill ${openCount ? 'live' : 'off'}`}>
          <span className="pulse-dot" />
          {openCount} open / {EXCHANGES.length}
        </span>
      }
    >
      {regions.map((region) => (
        <div key={region} style={{ marginBottom: 14 }}>
          <div className="hours-region">{region}</div>
          <div className="grid grid-hours">
            {statuses.filter(({ ex }) => ex.region === region).map(({ ex, st }) => {
              const open = st.open
              const lunch = st.state === 'lunch'
              const color = open ? 'var(--gain)' : lunch ? 'var(--amber)' : 'var(--t4)'
              return (
                <div key={ex.name} className={`hours-chip ${open ? 'open' : ''}`} title={`${ex.full} · ${st.hoursLabel}`}>
                  <div className="hours-top">
                    <Flag emoji={ex.flag} title={ex.full} />
                    <span className="hours-dot" style={{ background: open ? 'var(--gain)' : lunch ? 'var(--amber)' : 'var(--t4)' }} />
                  </div>
                  <div className="hours-name" style={{ color: open ? 'var(--gain)' : 'var(--t2)' }}>{ex.name}</div>
                  <div className="hours-time" style={{ color }}>{st.localTime}</div>
                  <div className="hours-status" style={{ color }}>{open ? 'OPEN' : lunch ? 'LUNCH' : 'CLOSED'}</div>
                  <div className="hours-session">{st.hoursLabel}</div>
                  <div className="hours-countdown">{st.detail}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div className="muted" style={{ marginTop: 4 }}>Regular cash sessions only · Crypto 24/7 · Forex Sun 5pm – Fri 5pm ET</div>
    </Section>
  )
}

export default function MarketsScreen() {
  const c = useColors()
  const { data, lastUpdated } = useMarket()
  const { settings } = useSettings()
  const { mcap, compact, price } = useFormat()
  const [moverTab, setMoverTab] = useState('All')

  const universe = useMemo(() => {
    if (moverTab === 'Stocks') return STOCKS.map((s) => ({ sym: s.sym, name: s.name }))
    if (moverTab === 'Crypto') return CRYPTOS.map((ct) => ({ sym: ct.sym, name: ct.name }))
    if (moverTab === 'Forex') return FOREX.map((f) => ({ sym: f.sym, name: f.label }))
    return [
      ...STOCKS.map((s) => ({ sym: s.sym, name: s.name })),
      ...CRYPTOS.map((ct) => ({ sym: ct.sym, name: ct.name })),
      ...FOREX.map((f) => ({ sym: f.sym, name: f.label })),
      ...COMMODITIES.map((co) => ({ sym: co.sym, name: co.label })),
    ]
  }, [moverTab])

  const loaded = universe.filter((s) => data[s.sym] != null)
  const sorted = [...loaded].sort((a, b) => (data[b.sym]?.regularMarketChangePercent ?? 0) - (data[a.sym]?.regularMarketChangePercent ?? 0))
  const gainers = sorted.slice(0, 5)
  const losers = sorted.slice(-5).reverse()

  const vix = data['^VIX']
  const dxy = data['DX-Y.NYB']
  const vixVal = vix?.regularMarketPrice
  const dxyChg = dxy?.regularMarketChangePercent
  const maxYield = Math.max(...BONDS.map((b) => data[b.sym]?.regularMarketPrice ?? 0), 6)
  const vixLevel = !vixVal ? 'neutral' : vixVal < 15 ? 'greed' : vixVal > 25 ? 'fear' : 'neutral'
  const vixColor = vixLevel === 'greed' ? 'var(--gain)' : vixLevel === 'fear' ? 'var(--loss)' : 'var(--amber)'
  const vixLabel = vixLevel === 'greed' ? 'LOW FEAR' : vixLevel === 'fear' ? 'HIGH FEAR' : 'NEUTRAL'

  return (
    <div className="page page-wide">
      <div className="kpi-row">
        {RIBBON.map(({ sym, label, kind }) => {
          const d = data[sym]
          const chg = d?.regularMarketChangePercent ?? 0
          const dir = chgDir(chg)
          return (
            <div key={sym} className="kpi">
              <div className="kpi-label">{label}</div>
              <div className="kpi-val">{formatRibbon(kind, d?.regularMarketPrice, compact)}</div>
              {d && <div className={`kpi-chg num-${dir}`}>{dir === 'up' ? '▲' : dir === 'dn' ? '▼' : '—'} {Math.abs(chg).toFixed(1)}%</div>}
              <AsOf at={d?.updatedAt} />
            </div>
          )
        })}
      </div>

      <MarketHoursSection />

      <Section label="Global Indices" count={INDICES.length}>
        <div className="grid grid-indices">
          {INDICES.map((idx) => <IndexCard key={idx.sym} {...idx} />)}
        </div>
      </Section>

      <Section label="S&P 500 Sectors" count={SECTORS.length}>
        <div className="grid grid-sectors">
          {SECTORS.map((s) => {
            const d = data[s.sym]
            const chg = d?.regularMarketChangePercent ?? 0
            const dir = chgDir(chg)
            const abs = Math.abs(chg)
            let bg = 'var(--card)'
            let border = 'var(--rim)'
            let text = 'var(--t3)'
            if (d && dir === 'up') {
              bg = abs > 2 ? 'rgba(0,229,160,0.22)' : abs > 1 ? 'rgba(0,229,160,0.12)' : 'rgba(0,229,160,0.06)'
              border = 'rgba(0,229,160,0.25)'
              text = 'var(--gain)'
            } else if (d && dir === 'dn') {
              bg = abs > 2 ? 'rgba(255,77,106,0.22)' : abs > 1 ? 'rgba(255,77,106,0.12)' : 'rgba(255,77,106,0.06)'
              border = 'rgba(255,77,106,0.25)'
              text = 'var(--loss)'
            } else if (d) {
              bg = 'var(--amber-dim)'
              text = 'var(--amber)'
            }
            return (
              <div key={s.sym} className="sector" style={{ background: bg, borderColor: border }}>
                <div className="sector-sym">{s.sym}</div>
                <div className="sector-name">{s.label}</div>
                <div className="sector-chg" style={{ color: text }}>{d ? fmtChg(chg) : '—'}</div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section
        label="Today's Top Movers"
        right={
          <Segmented
            value={moverTab}
            onChange={setMoverTab}
            options={['All', 'Stocks', 'Crypto', 'Forex'].map((t) => ({ label: t, value: t }))}
          />
        }
      >
        {loaded.length >= 4 && (
          <div className="grid grid-2">
            {[{ title: 'GAINERS', items: gainers, col: 'var(--gain)', border: 'rgba(0,229,160,0.25)' }, { title: 'LOSERS', items: losers, col: 'var(--loss)', border: 'rgba(255,77,106,0.25)' }].map((col) => (
              <div key={col.title} className="panel mover-col" style={{ borderColor: col.border }}>
                <div className="mover-head" style={{ color: col.col }}>
                  <span className="dot" style={{ background: col.col }} />
                  {col.title}
                </div>
                {col.items.map((s) => {
                  const d = data[s.sym]
                  const chg = d?.regularMarketChangePercent ?? 0
                  return (
                    <div key={s.sym} className="mover-row">
                      <div style={{ minWidth: 0 }}>
                        <div className="sym">{s.sym}</div>
                        <div className="muted">{s.name}</div>
                      </div>
                      <div className="right">
                        <div className="mono" style={{ fontWeight: 700, color: col.col }}>{fmtChg(chg)}</div>
                        <div className="muted">${fmt(d?.regularMarketPrice, s.sym.includes('=X') || s.sym.includes('/') ? 4 : 2)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section label="Bond Yields & Volatility">
        <div className="panel panel-pad">
          <div className="section-label" style={{ marginBottom: 6 }}>US Treasury yield curve</div>
          {BONDS.map((b) => {
            const d = data[b.sym]
            const y = d?.regularMarketPrice
            const pct = maxYield > 0 ? ((y ?? 0) / maxYield) * 100 : 0
            const chg = d?.regularMarketChangePercent ?? 0
            const dir = chgDir(chg)
            const barCol = dir === 'up' ? 'var(--loss)' : dir === 'dn' ? 'var(--gain)' : 'var(--amber)'
            return (
              <div key={b.sym} className="bond-row">
                <span className="bond-lab">{b.label}</span>
                <div className="bond-track"><div className="bond-fill" style={{ width: `${pct}%`, background: barCol }} /></div>
                <span className="bond-val">{y != null ? `${fmt(y, 2)}%` : '—'}</span>
                <span className="mono" style={{ width: 40, textAlign: 'right', fontSize: 11, color: barCol }}>
                  {d ? `${chg >= 0 ? '+' : '-'}${fmt(Math.abs(chg), 1)}` : ''}
                </span>
              </div>
            )
          })}
          <div className="macro-split">
            <div className="macro-cell">
              <div className="kpi-label">VIX</div>
              <div className="macro-big" style={{ color: vixColor }}>{vixVal != null ? fmt(vixVal, 1) : '—'}</div>
              <span className="chg flat" style={{ color: vixColor, background: vixLevel === 'fear' ? 'var(--loss-dim)' : vixLevel === 'greed' ? 'var(--gain-dim)' : 'var(--amber-dim)' }}>{vixVal ? vixLabel : 'N/A'}</span>
            </div>
            <div style={{ width: 1, background: 'var(--rim)' }} />
            <div className="macro-cell">
              <div className="kpi-label">US Dollar Index</div>
              <div className="macro-big" style={{ color: chgDir(dxyChg) === 'up' ? 'var(--gain)' : chgDir(dxyChg) === 'dn' ? 'var(--loss)' : 'var(--t1)' }}>
                {dxy?.regularMarketPrice != null ? fmt(dxy.regularMarketPrice, 2) : '—'}
              </div>
              <div className="muted">{dxyChg != null ? fmtChg(dxyChg) : ''}</div>
            </div>
          </div>
        </div>
      </Section>

      <Section label="Foreign Exchange">
        <div className="fx-row">
          {FOREX.slice(0, 24).map((fx) => {
            const d = data[fx.sym]
            const chg = d?.regularMarketChangePercent ?? 0
            return (
              <div key={fx.sym} className="fx-chip">
                <span className="fx-name">{fx.label}</span>
                <span className="fx-price">{d ? fmt(d.regularMarketPrice, 4) : '—'}</span>
                {d && <ChangeBadge value={chg} />}
                <AsOf at={d?.updatedAt} />
              </div>
            )
          })}
        </div>
      </Section>

      <Section label="Commodities" count={COMMODITIES.length}>
        <div className="grid grid-comms">
          {COMMODITIES.map((co) => {
            const d = data[co.sym]
            return (
              <div key={co.sym} className="comm-card">
                <div className="comm-label">{co.label}</div>
                <div className="comm-price">{d ? `$${price(d.regularMarketPrice, 2)}` : '—'}</div>
                <div className="comm-unit">{co.unit}</div>
                {d && <ChangeBadge value={d.regularMarketChangePercent} />}
                <AsOf at={d?.updatedAt} />
              </div>
            )
          })}
        </div>
      </Section>

      <Section label="Major Stocks" count={STOCKS.length}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Company</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right' }}>Chg%</th>
                <th style={{ textAlign: 'right' }}>Mkt Cap</th>
              </tr>
            </thead>
            <tbody>
              {STOCKS.map((s) => {
                const d = data[s.sym]
                const sess = d ? sessionQuote(d, settings.showExtendedHours) : null
                const chg = sess?.chg ?? 0
                const dir = chgDir(chg)
                return (
                  <tr key={s.sym}>
                    <td>
                      <div className="sym">{s.sym}</div>
                      <div className="muted">{s.name}{sess?.tag ? ` · ${sess.tag}` : ''}</div>
                    </td>
                    <td className="num">
                      <div>{sess ? `$${price(sess.price)}` : '—'}</div>
                      <AsOf at={d?.updatedAt} />
                    </td>
                    <td className="num" style={{ color: dir === 'up' ? c.gain : dir === 'dn' ? c.loss : c.t2 }}>{sess ? fmtChg(chg) : '—'}</td>
                    <td className="num" style={{ color: 'var(--t3)' }}>{d ? mcap(d.marketCap, s.sym) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {lastUpdated && <div className="updated">Quotes refreshed {lastUpdated.toLocaleTimeString()} · each print shows Yahoo’s last update</div>}
    </div>
  )
}
