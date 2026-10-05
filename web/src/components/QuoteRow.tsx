import React, { useState } from 'react'
import SparklineChart from './SparklineChart'
import { chgDir, fmtChg, sessionQuote, useMarket } from '../context/MarketContext'
import { useSettings } from '../context/SettingsContext'
import { useFormat } from '../hooks/useFormat'
import { AsOf } from './ui'

export default function QuoteRow({
  sym,
  name,
  unit,
  decimals = 2,
  prefix = '$',
}: {
  sym: string
  name: string
  unit?: string
  decimals?: number
  prefix?: string
}) {
  const { data } = useMarket()
  const { settings } = useSettings()
  const { price, compact } = useFormat()
  const [open, setOpen] = useState(false)
  const d = data[sym]
  const dps = !compact && decimals === 0 ? 2 : decimals
  const sess = d ? sessionQuote(d, settings.showExtendedHours) : null
  const chg = sess?.chg ?? 0
  const dir = chgDir(chg)
  const col = dir === 'up' ? 'var(--gain)' : dir === 'dn' ? 'var(--loss)' : 'var(--t2)'
  return (
    <div>
      <div className="asset fav" onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        <div className="avatar" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>
          {sym.replace(/[^A-Z0-9]/gi, '').slice(0, 2) || '•'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="sym">{name}</div>
          <div className="muted">{sym}{unit ? ` · ${unit}` : ''}</div>
        </div>
        <div className="spark">
          <SparklineChart symbol={sym} range="7d" width={80} height={32} color={col} />
        </div>
        <div className="right">
          <div className="mono" style={{ fontWeight: 700 }}>{sess ? `${prefix}${price(sess.price, dps)}` : '—'}</div>
          <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: col, marginTop: 2 }}>
            {sess ? fmtChg(chg) : '—'}{sess?.tag ? <span className="muted"> {sess.tag}</span> : null}
          </div>
          <AsOf at={d?.updatedAt} />
        </div>
        <span style={{ color: 'var(--t4)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && d && (
        <div className="expand">
          <SparklineChart symbol={sym} range="7d" width={420} height={72} showLabels color={col} />
          <div className="stat-grid">
            {d.regularMarketDayHigh != null && <div><div className="stat-lab">Day high</div><div className="stat-val" style={{ color: 'var(--gain)' }}>{prefix}{price(d.regularMarketDayHigh, dps)}</div></div>}
            {d.regularMarketDayLow != null && <div><div className="stat-lab">Day low</div><div className="stat-val" style={{ color: 'var(--loss)' }}>{prefix}{price(d.regularMarketDayLow, dps)}</div></div>}
            {d.regularMarketPreviousClose != null && <div><div className="stat-lab">Prev close</div><div className="stat-val">{prefix}{price(d.regularMarketPreviousClose, dps)}</div></div>}
          </div>
        </div>
      )}
    </div>
  )
}
