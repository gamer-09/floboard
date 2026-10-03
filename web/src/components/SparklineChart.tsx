import React, { useEffect, useState } from 'react'
import { useColors } from '../hooks/useColors'
import { useMarket } from '../context/MarketContext'
import { getApiBase } from '../utils/apiBase'
import { getFallbackQuote, resolveSymbolAlias, type PricePoint } from '../utils/symbolFallbacks'

async function fetchHistory(symbol: string, range: string): Promise<PricePoint[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/market/history?symbol=${encodeURIComponent(resolveSymbolAlias(symbol))}&range=${range}`)
    if (!res.ok) return []
    const json = await res.json() as { prices?: PricePoint[] }
    const prices = (json.prices ?? []).filter((p) => p && Number.isFinite(p.c) && p.c > 0)
    if (prices.length < 2) return []
    const fallback = getFallbackQuote(symbol)
    const syntheticLen = prices.length === 24 || prices.length === 28 || prices.length === 30
    if (syntheticLen && Math.abs(prices[prices.length - 1].c - fallback.regularMarketPrice) < 1e-6) return []
    return prices
  } catch {
    return []
  }
}

function buildPath(points: PricePoint[], width: number, height: number, pad = 3) {
  if (points.length < 2) return { linePath: '', areaPath: '' }
  const minP = Math.min(...points.map((p) => p.c))
  const maxP = Math.max(...points.map((p) => p.c))
  const range = maxP - minP || 1
  const w = width - pad * 2
  const h = height - pad * 2
  const toX = (i: number) => pad + (i / (points.length - 1)) * w
  const toY = (v: number) => pad + h - ((v - minP) / range) * h

  const coords = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.c).toFixed(1)}`)
  const linePath = 'M' + coords.join('L')
  const areaPath =
    `M${pad.toFixed(1)},${(pad + h).toFixed(1)}` +
    `L${coords.join('L')}` +
    `L${(pad + w).toFixed(1)},${(pad + h).toFixed(1)}Z`

  return { linePath, areaPath }
}

interface SparklineChartProps {
  symbol: string
  range?: '1d' | '7d' | '1mo' | '3mo'
  width?: number
  height?: number
  color?: string
  showLabels?: boolean
}

export default function SparklineChart({
  symbol,
  range = '7d',
  width = 200,
  height = 56,
  color,
  showLabels = false,
}: SparklineChartProps) {
  const colors = useColors()
  const { refreshKey } = useMarket()
  const [points, setPoints] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchHistory(symbol, range).then((data) => {
      if (!cancelled) { setPoints(data); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [symbol, range, refreshKey])

  if (loading) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
      </div>
    )
  }

  if (points.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.t4, fontSize: 9 }}>
        No chart data
      </div>
    )
  }

  const first = points[0].c
  const last = points[points.length - 1].c
  const pct = ((last - first) / first) * 100
  const isUp = pct >= 0
  const lineColor = color ?? (isUp ? colors.gain : colors.loss)
  const gradId = `grad_${symbol.replace(/[^a-z0-9]/gi, '_')}_${range}`
  const { linePath, areaPath } = buildPath(points, width, height)

  return (
    <div>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} stroke={lineColor} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
      </svg>
      {showLabels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px', marginTop: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 500, color: colors.t4 }}>
            {range === '1d' ? 'Today' : range === '7d' ? '7D' : range === '1mo' ? '1M' : '3M'}
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, color: lineColor }}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  )
}
