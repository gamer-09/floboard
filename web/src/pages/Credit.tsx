import React, { useEffect } from 'react'
import QuoteRow from '../components/QuoteRow'
import { Section } from '../components/ui'
import { fmtChg, useMarket } from '../context/MarketContext'
import { useFormat } from '../hooks/useFormat'

const ROWS = [
  { sym: 'HYG', name: 'High-yield corporate', unit: 'HYG', decimals: 2 },
  { sym: 'LQD', name: 'Investment-grade corporate', unit: 'LQD', decimals: 2 },
  { sym: 'TLT', name: 'Long Treasury', unit: 'TLT', decimals: 2 },
  { sym: 'TIP', name: 'TIPS (inflation-linked)', unit: 'TIP', decimals: 2 },
]

export default function CreditScreen() {
  const { data, ensureSymbols } = useMarket()
  const { price } = useFormat()
  useEffect(() => { ensureSymbols(ROWS.map((r) => r.sym)) }, [ensureSymbols])
  const hyg = data['HYG']
  const lqd = data['LQD']
  const tlt = data['TLT']
  const tip = data['TIP']
  const hygWeak = (hyg?.regularMarketChangePercent ?? 0) < 0 && (lqd?.regularMarketChangePercent ?? 0) > -0.2

  return (
    <div className="page">
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label">HYG</div>
          <div className="kpi-val">{hyg && !Number.isNaN(hyg.regularMarketPrice) ? `$${price(hyg.regularMarketPrice, 2)}` : '—'}</div>
          {hyg && <div className="kpi-chg">{fmtChg(hyg.regularMarketChangePercent)}</div>}
        </div>
        <div className="kpi">
          <div className="kpi-label">LQD</div>
          <div className="kpi-val">{lqd ? `$${price(lqd.regularMarketPrice, 2)}` : '—'}</div>
          {lqd && <div className="kpi-chg">{fmtChg(lqd.regularMarketChangePercent)}</div>}
        </div>
        <div className="kpi">
          <div className="kpi-label">TLT</div>
          <div className="kpi-val">{tlt ? `$${price(tlt.regularMarketPrice, 2)}` : '—'}</div>
          {tlt && <div className="kpi-chg">{fmtChg(tlt.regularMarketChangePercent)}</div>}
        </div>
        <div className="kpi">
          <div className="kpi-label">TIP</div>
          <div className="kpi-val">{tip ? `$${price(tip.regularMarketPrice, 2)}` : '—'}</div>
          {tip && <div className="kpi-chg">{fmtChg(tip.regularMarketChangePercent)}</div>}
        </div>
      </div>

      <p className="muted" style={{ marginBottom: 16, whiteSpace: 'normal', maxWidth: 640 }}>
        HYG is junk-bond credit. A drop while Treasuries hold up is stress, not a rates move.
        {hygWeak ? ' HYG is weaker than LQD today.' : ''}
      </p>

      <Section label="Credit ETFs">
        <div className="asset-list">
          {ROWS.map((r) => <QuoteRow key={r.sym} {...r} />)}
        </div>
      </Section>
    </div>
  )
}
