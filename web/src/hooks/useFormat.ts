import { useMarket } from '../context/MarketContext'
import { useSettings } from '../context/SettingsContext'
import { isFallbackMcap } from '../utils/symbolFallbacks'
import { fmt, fmtChg, fmtIndex, fmtMcap, fmtMoney, fmtPrice, fmtVol } from '../utils/format'

/**
 * All on-screen numbers go through here so Compact numbers off
 * always means the full live figure — never a rounded placeholder.
 */
export function useFormat() {
  const { settings } = useSettings()
  const compact = settings.compactNumbers
  const decimals = settings.priceDecimals

  return {
    compact,
    decimals,
    fmt,
    fmtChg,
    price: (n: number | null | undefined, d?: number) => fmtPrice(n, d ?? decimals, compact),
    index: (n: number | null | undefined) => fmtIndex(n, compact),
    mcap: (v: number | null | undefined, sym?: string) => {
      if (sym && isFallbackMcap(sym, v ?? 0)) return '—'
      return fmtMcap(v, compact)
    },
    money: (v: number | null | undefined) => fmtMoney(v, compact, decimals),
    vol: (v: number | null | undefined) => fmtVol(v, compact),
  }
}

/** Hide placeholder market cap even outside the hook (rows that already have quote data). */
export function useQuoteFormat() {
  const f = useFormat()
  const { data } = useMarket()
  return {
    ...f,
    mcapOf: (sym: string) => f.mcap(data[sym]?.marketCap, sym),
  }
}
