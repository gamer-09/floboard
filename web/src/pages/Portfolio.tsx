import React, { useEffect, useState } from 'react'
import { EmptyState } from '../components/ui'
import { CRYPTOS, STOCKS } from '../constants/marketData'
import { fmt, fmtChg, fmtMcap, useMarket } from '../context/MarketContext'
import { useSettings } from '../context/SettingsContext'
import { verifySymbol } from '../utils/lookup'

interface Holding { id: string; symbol: string; shares: number; avgPrice: number }

const STORAGE_KEY = 'floboard:holdings'
const STOCK_SET = new Set(STOCKS.map((s) => s.sym))
const CRYPTO_SET = new Set(CRYPTOS.map((c) => c.sym))

function loadHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveHoldings(h: Holding[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)) } catch { /* ignore */ }
}

function nameOf(sym: string) {
  return STOCKS.find((s) => s.sym === sym)?.name
    ?? CRYPTOS.find((c) => c.sym === sym)?.name
    ?? sym
}

export default function PortfolioScreen() {
  const { data, ensureSymbols } = useMarket()
  const { settings } = useSettings()
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings)
  const [showAdd, setShowAdd] = useState(false)
  const [sym, setSym] = useState('')
  const [shares, setShares] = useState('')
  const [avgPrice, setAvgPrice] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  useEffect(() => {
    if (settings.clearPortfolioKey > 0) {
      setHoldings([])
      saveHoldings([])
    }
  }, [settings.clearPortfolioKey])

  useEffect(() => {
    const syms = holdings.map((h) => h.symbol)
    if (syms.length) ensureSymbols(syms)
  }, [holdings, ensureSymbols])

  const addHolding = async () => {
    if (!sym.trim() || !shares || !avgPrice) return
    const qty = parseFloat(shares)
    const px = parseFloat(avgPrice)
    if (!Number.isFinite(qty) || !Number.isFinite(px) || qty <= 0 || px < 0) return
    setLookingUp(true)
    setLookupError('')
    const result = await verifySymbol(sym)
    setLookingUp(false)
    if (!result.ok) {
      setLookupError(result.error)
      return
    }
    const symbol = result.sym
    const existing = holdings.findIndex((h) => h.symbol === symbol)
    let next: Holding[]
    if (existing >= 0) {
      next = holdings.map((h, i) => i === existing ? { ...h, shares: qty, avgPrice: px } : h)
    } else {
      next = [...holdings, { id: Date.now().toString(), symbol, shares: qty, avgPrice: px }]
    }
    setHoldings(next)
    saveHoldings(next)
    ensureSymbols([symbol])
    setSym(''); setShares(''); setAvgPrice('')
    setLookupError('')
    setShowAdd(false)
  }

  const removeHolding = (id: string) => {
    const next = holdings.filter((h) => h.id !== id)
    setHoldings(next)
    saveHoldings(next)
  }

  const totalValue = holdings.reduce((sum, h) => sum + (data[h.symbol]?.regularMarketPrice ?? h.avgPrice) * h.shares, 0)
  const totalCost = holdings.reduce((sum, h) => sum + h.avgPrice * h.shares, 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
  const stockVal = holdings.filter((h) => STOCK_SET.has(h.symbol)).reduce((s, h) => s + (data[h.symbol]?.regularMarketPrice ?? h.avgPrice) * h.shares, 0)
  const cryptoVal = holdings.filter((h) => CRYPTO_SET.has(h.symbol)).reduce((s, h) => s + (data[h.symbol]?.regularMarketPrice ?? h.avgPrice) * h.shares, 0)
  const otherVal = Math.max(0, totalValue - stockVal - cryptoVal)
  const stockPct = totalValue > 0 ? (stockVal / totalValue) * 100 : 0
  const cryptoPct = totalValue > 0 ? (cryptoVal / totalValue) * 100 : 0
  const otherPct = totalValue > 0 ? (otherVal / totalValue) * 100 : 0

  return (
    <div className="page">
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <p className="muted" style={{ maxWidth: 560 }}>
          Simulated tracker only. Add positions you want to follow — FloBoard never connects to a bank and never asks you to deposit money.
        </p>
        <button className="btn btn-ghost" onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : '+ Add holding'}</button>
      </div>

      {holdings.length > 0 && (
        <>
          <div className="kpi-summary">
            <div className="kpi">
              <div className="kpi-label">Total value</div>
              <div className="kpi-val">${fmt(totalValue)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Cost basis</div>
              <div className="kpi-val">${fmt(totalCost)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Unrealised P&amp;L</div>
              <div className="kpi-val" style={{ color: totalPnl >= 0 ? 'var(--gain)' : 'var(--loss)' }}>{totalPnl >= 0 ? '+' : ''}{fmtMcap(totalPnl)} ({fmtChg(totalPnlPct)})</div>
            </div>
          </div>

          <div className="alloc-box">
            <div className="alloc-head">
              <span className="section-label" style={{ margin: 0 }}>Asset allocation (simulated)</span>
              <span className="muted" style={{ margin: 0 }}>{holdings.length} position{holdings.length === 1 ? '' : 's'}</span>
            </div>
            <div className="alloc-track">
              {stockPct > 0 && <div style={{ width: `${stockPct}%`, background: 'var(--blue)' }} />}
              {cryptoPct > 0 && <div style={{ width: `${cryptoPct}%`, background: '#FF9900' }} />}
              {otherPct > 0 && <div style={{ width: `${otherPct}%`, background: 'var(--gain)' }} />}
            </div>
            <div className="alloc-legend">
              <span><i style={{ background: 'var(--blue)' }} /> Stocks {stockPct.toFixed(0)}%</span>
              <span><i style={{ background: '#FF9900' }} /> Crypto {cryptoPct.toFixed(0)}%</span>
              <span><i style={{ background: 'var(--gain)' }} /> Other {otherPct.toFixed(0)}%</span>
            </div>
          </div>
        </>
      )}

      {showAdd && (
        <div className="panel form-card">
          <input className="field" value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} placeholder="Symbol (e.g. AAPL, BTC-USD)" />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="Shares / units" type="number" />
            <input className="field" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} placeholder="Average price" type="number" />
          </div>
          {lookupError && <div className="lookup-err">{lookupError}</div>}
          <button className="btn btn-primary" onClick={addHolding} disabled={lookingUp}>{lookingUp ? 'Checking ticker…' : 'Save holding'}</button>
        </div>
      )}

      {holdings.length === 0 && !showAdd && (
        <EmptyState
          icon="◎"
          title="No holdings yet"
          hint="Add a symbol, quantity, and average price to start tracking. Nothing here is a real brokerage account."
          action={<button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>+ Add holding</button>}
        />
      )}

      <div className="asset-list">
        {holdings.map((h) => {
          const d = data[h.symbol]
          const price = d?.regularMarketPrice ?? h.avgPrice
          const value = price * h.shares
          const cost = h.avgPrice * h.shares
          const pnl = value - cost
          const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0
          const alloc = totalValue > 0 ? (value / totalValue) * 100 : 0
          const day = d?.regularMarketChangePercent ?? 0
          const dayCol = day > 0 ? 'var(--gain)' : day < 0 ? 'var(--loss)' : 'var(--amber)'
          const alerted = settings.alertThreshold > 0 && Math.abs(day) >= settings.alertThreshold
          return (
            <div key={h.id} className="hold-card" style={{ borderColor: alerted ? dayCol : undefined }}>
              <div className="hold-accent" style={{ background: dayCol }} />
              <div className="hold-body">
                <div className="hold-hd">
                  <div>
                    <div className="hold-sym-row">
                      <span className="sym">{h.symbol}</span>
                      {alloc > 0 && <span className="tag" style={{ background: 'var(--surface)', color: 'var(--t3)' }}>{alloc.toFixed(1)}%</span>}
                      {alerted && <span className="tag" style={{ background: 'var(--loss-dim)', color: dayCol }}>ALERT</span>}
                    </div>
                    <div className="muted">{nameOf(h.symbol)}</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => removeHolding(h.id)}>Remove</button>
                </div>
                <div className="hold-stats">
                  <div><div className="stat-lab">Qty</div><div className="stat-val">{h.shares}</div></div>
                  <div><div className="stat-lab">Price</div><div className="stat-val">${fmt(price, settings.priceDecimals)}</div></div>
                  <div><div className="stat-lab">Value</div><div className="stat-val" style={{ color: 'var(--amber)' }}>${fmt(value)}</div></div>
                  <div><div className="stat-lab">Today</div><div className="stat-val" style={{ color: dayCol }}>{d ? fmtChg(day) : '—'}</div></div>
                </div>
                <div className="hold-pnl">
                  <span style={{ color: pnl >= 0 ? 'var(--gain)' : 'var(--loss)' }}>Unrealised P&L</span>
                  <span className="mono" style={{ color: pnl >= 0 ? 'var(--gain)' : 'var(--loss)', fontWeight: 700 }}>
                    {pnl >= 0 ? '+' : ''}{fmtMcap(pnl)} ({fmtChg(pnlPct)})
                  </span>
                </div>
                <div className="pnl-track"><div className="pnl-fill" style={{ width: `${Math.min(100, Math.abs(pnlPct) / 2)}%`, background: pnl >= 0 ? 'var(--gain)' : 'var(--loss)' }} /></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
