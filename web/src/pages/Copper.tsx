import React, { useEffect } from 'react'
import QuoteRow from '../components/QuoteRow'
import { AsOf, Section } from '../components/ui'
import { fmtChg, useMarket } from '../context/MarketContext'
import { useFormat } from '../hooks/useFormat'

const ROWS = [
  { sym: 'HG=F', name: 'Copper', unit: 'USD/lb', decimals: 3 },
  { sym: 'ALI=F', name: 'Aluminum', unit: 'USD/MT', decimals: 2 },
  { sym: 'NICK.L', name: 'Nickel', unit: 'USD', decimals: 2 },
  { sym: 'ZNC=F', name: 'Zinc', unit: 'USD/MT', decimals: 2 },
  { sym: 'GC=F', name: 'Gold (safe haven)', unit: 'USD/oz', decimals: 2 },
]

export default function CopperScreen() {
  const { data, ensureSymbols } = useMarket()
  const { price } = useFormat()
  useEffect(() => { ensureSymbols(ROWS.map((r) => r.sym)) }, [ensureSymbols])
  const cu = data['HG=F']
  const al = data['ALI=F']
  const ni = data['NICK.L']
  const au = data['GC=F']

  return (
    <div className="page">
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label">Copper</div>
          <div className="kpi-val">{cu ? `$${price(cu.regularMarketPrice, 3)}` : '—'}</div>
          {cu && <div className="kpi-chg">{fmtChg(cu.regularMarketChangePercent)}</div>}
          <AsOf at={cu?.updatedAt} />
        </div>
        <div className="kpi">
          <div className="kpi-label">Aluminum</div>
          <div className="kpi-val">{al ? `$${price(al.regularMarketPrice, 2)}` : '—'}</div>
          {al && <div className="kpi-chg">{fmtChg(al.regularMarketChangePercent)}</div>}
          <AsOf at={al?.updatedAt} />
        </div>
        <div className="kpi">
          <div className="kpi-label">Nickel</div>
          <div className="kpi-val">{ni ? `$${price(ni.regularMarketPrice, 2)}` : '—'}</div>
          {ni && <div className="kpi-chg">{fmtChg(ni.regularMarketChangePercent)}</div>}
          <AsOf at={ni?.updatedAt} />
        </div>
        <div className="kpi">
          <div className="kpi-label">Gold</div>
          <div className="kpi-val">{au ? `$${price(au.regularMarketPrice, 2)}` : '—'}</div>
          {au && <div className="kpi-chg">{fmtChg(au.regularMarketChangePercent)}</div>}
          <AsOf at={au?.updatedAt} />
        </div>
      </div>

      <Section label="Industrial metals">
        <div className="asset-list">
          {ROWS.map((r) => <QuoteRow key={r.sym} {...r} />)}
        </div>
      </Section>
    </div>
  )
}
