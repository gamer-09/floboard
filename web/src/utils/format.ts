export function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtChg(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return (n >= 0 ? '+' : '') + fmt(n) + '%'
}

function compactUsd(a: number): string {
  if (a >= 1e12) return '$' + fmt(a / 1e12, 2) + 'T'
  if (a >= 1e9) return '$' + fmt(a / 1e9, 1) + 'B'
  if (a >= 1e6) return '$' + fmt(a / 1e6, 1) + 'M'
  if (a >= 1e3) return '$' + fmt(a / 1e3, 1) + 'K'
  return '$' + fmt(a, 2)
}

/** Market cap. Compact on → $1.2T. Compact off → full digits. */
export function fmtMcap(v: number | null | undefined, compact = true): string {
  if (v == null || !Number.isFinite(v) || v === 0) return '—'
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (!compact) return sign + '$' + Math.round(a).toLocaleString('en-US')
  return sign + compactUsd(a)
}

/** Dollar amounts (P&L, portfolio). Compact off keeps cents. */
export function fmtMoney(v: number | null | undefined, compact = true, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (compact && a >= 1e6) return sign + compactUsd(a)
  return sign + '$' + a.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Share/coin volume. Compact off is the full integer. */
export function fmtVol(v: number | null | undefined, compact = true): string {
  if (v == null || !Number.isFinite(v) || v <= 0) return '—'
  if (v === 1_000_000) return '—'
  if (!compact) return Math.round(v).toLocaleString('en-US')
  if (v >= 1e12) return fmt(v / 1e12, 2) + 'T'
  if (v >= 1e9) return fmt(v / 1e9, 1) + 'B'
  if (v >= 1e6) return fmt(v / 1e6, 1) + 'M'
  if (v >= 1e3) return fmt(v / 1e3, 1) + 'K'
  return fmt(v, 0)
}

/**
 * Asset price.
 * Compact on may drop cents for prices ≥ 1000.
 * Compact off always keeps the requested decimals — never rounds to a fake whole number.
 */
export function fmtPrice(n: number | null | undefined, decimals = 2, compact = true): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (!compact) {
    if (Math.abs(n) > 0 && Math.abs(n) < 0.01) return fmt(n, Math.max(decimals, 6))
    return fmt(n, decimals)
  }
  if (Math.abs(n) >= 1000) return fmt(n, 0)
  if (Math.abs(n) > 0 && Math.abs(n) < 0.01) return n.toFixed(6)
  return fmt(n, decimals)
}

/** Index / large level: compact → 5,621 ; exact → 5,621.34 */
export function fmtIndex(n: number | null | undefined, compact = true): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return fmt(n, compact ? 0 : 2)
}

export function chgDir(n: number | null | undefined): 'up' | 'dn' | 'flat' {
  if (n == null || !Number.isFinite(n) || n === 0) return 'flat'
  return n > 0 ? 'up' : 'dn'
}
