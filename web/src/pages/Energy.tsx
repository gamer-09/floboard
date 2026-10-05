import React, { useEffect } from 'react'
import QuoteRow from '../components/QuoteRow'
import { AsOf, Section } from '../components/ui'
import { fmtChg, useMarket } from '../context/MarketContext'
import { useFormat } from '../hooks/useFormat'

const ROWS = [
  { sym: 'CL=F', name: 'WTI crude', unit: 'USD/bbl', decimals: 2 },
  { sym: 'BZ=F', name: 'Brent crude', unit: 'USD/bbl', decimals: 2 },
  { sym: 'NG=F', name: 'Natural gas', unit: 'USD/MMBtu', decimals: 3 },
  { sym: 'XLE', name: 'Energy sector ETF', unit: 'XLE', decimals: 2 },
  { sym: 'XOM', name: 'Exxon Mobil', unit: 'XOM', decimals: 2 },
  { sym: 'CVX', name: 'Chevron', unit: 'CVX', decimals: 2 },
]

export default function EnergyScreen() {
  const { data, ensureSymbols } = useMarket()
  const { price } = useFormat()
  useEffect(() => { ensureSymbols(ROWS.map((r) => r.sym)) }, [ensureSymbols])
  const wti = data['CL=F']
  const brent = data['BZ=F']
  const gas = data['NG=F']
  const xle = data['XLE']

  return (
    <div className="page">
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label">WTI</div>
          <div className="kpi-val">{wti ? `$${price(wti.regularMarketPrice, 2)}` : '—'}</div>
          {wti && <div className="kpi-chg">{fmtChg(wti.regularMarketChangePercent)}</div>}
          <AsOf at={wti?.updatedAt} />
        </div>
        <div className="kpi">
          <div className="kpi-label">Brent</div>
          <div className="kpi-val">{brent ? `$${price(brent.regularMarketPrice, 2)}` : '—'}</div>
          {brent && <div className="kpi-chg">{fmtChg(brent.regularMarketChangePercent)}</div>}
          <AsOf at={brent?.updatedAt} />
        </div>
        <div className="kpi">
          <div className="kpi-label">Nat gas</div>
          <div className="kpi-val">{gas ? `$${price(gas.regularMarketPrice, 3)}` : '—'}</div>
          {gas && <div className="kpi-chg">{fmtChg(gas.regularMarketChangePercent)}</div>}
          <AsOf at={gas?.updatedAt} />
        </div>
        <div className="kpi">
          <div className="kpi-label">XLE</div>
          <div className="kpi-val">{xle ? `$${price(xle.regularMarketPrice, 2)}` : '—'}</div>
          {xle && <div className="kpi-chg">{fmtChg(xle.regularMarketChangePercent)}</div>}
          <AsOf at={xle?.updatedAt} />
        </div>
      </div>

      <Section label="Energy complex">
        <div className="asset-list">
          {ROWS.map((r) => <QuoteRow key={r.sym} {...r} />)}
        </div>
      </Section>
    </div>
  )
}
