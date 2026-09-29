import React, { useEffect } from 'react'
import QuoteRow from '../components/QuoteRow'
import { Section } from '../components/ui'
import { BONDS } from '../constants/marketData'
import { chgDir, fmt, useMarket } from '../context/MarketContext'
import { useFormat } from '../hooks/useFormat'

export default function RatesScreen() {
  const { data, ensureSymbols } = useMarket()
  const { price } = useFormat()
  useEffect(() => { ensureSymbols(['^IRX', '^TU', '^FVX', '^TNX', '^TYX', 'TLT', '^MOVE']) }, [ensureSymbols])

  const tnx = data['^TNX']
  const irx = data['^IRX']
  const tlt = data['TLT']
  const spread = tnx && irx ? tnx.regularMarketPrice - irx.regularMarketPrice : null
  const inverted = spread != null && spread < 0
  const maxYield = Math.max(...BONDS.map((b) => data[b.sym]?.regularMarketPrice ?? 0), 6)

  return (
    <div className="page">
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label">10Y − 3M</div>
          <div className="kpi-val" style={{ color: inverted ? 'var(--loss)' : 'var(--gain)' }}>
            {spread == null ? '—' : `${spread >= 0 ? '+' : ''}${fmt(spread, 2)} pp`}
          </div>
          <div className={`kpi-chg ${inverted ? 'num-dn' : 'num-up'}`}>{inverted ? 'Inverted' : 'Upward'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">10-year</div>
          <div className="kpi-val">{tnx ? `${fmt(tnx.regularMarketPrice, 2)}%` : '—'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">3-month</div>
          <div className="kpi-val">{irx ? `${fmt(irx.regularMarketPrice, 2)}%` : '—'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">TLT</div>
          <div className="kpi-val">{tlt ? `$${price(tlt.regularMarketPrice, 2)}` : '—'}</div>
        </div>
      </div>

      <Section label="Treasury curve">
        <div className="panel panel-pad">
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
              </div>
            )
          })}
          <p className="muted" style={{ marginTop: 12, whiteSpace: 'normal' }}>
            10Y minus 3M is the Fed’s recession spread. Inverted (negative) means short rates sit above long rates.
          </p>
        </div>
      </Section>

      <Section label="Rates complex">
        <div className="asset-list">
          <QuoteRow sym="^IRX" name="3-month T-bill" unit="yield" decimals={2} prefix="" />
          <QuoteRow sym="^FVX" name="5-year yield" unit="yield" decimals={2} prefix="" />
          <QuoteRow sym="^TNX" name="10-year yield" unit="yield" decimals={2} prefix="" />
          <QuoteRow sym="^TYX" name="30-year yield" unit="yield" decimals={2} prefix="" />
          <QuoteRow sym="TLT" name="20+ year Treasury ETF" unit="TLT" decimals={2} />
          <QuoteRow sym="^MOVE" name="MOVE (bond vol)" unit="index" decimals={1} prefix="" />
        </div>
      </Section>
    </div>
  )
}
