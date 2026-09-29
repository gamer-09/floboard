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

export function fmtMcap(v: number | null | undefined, compact = true): string {
  if (v == null || !Number.isFinite(v) || v === 0) return '—'
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (!compact) {
    return sign + '$' + Math.round(a).toLocaleString('en-US')
  }
  if (a >= 1e12) return sign + '$' + fmt(a / 1e12, 2) + 'T'
  if (a >= 1e9) return sign + '$' + fmt(a / 1e9, 1) + 'B'
  if (a >= 1e6) return sign + '$' + fmt(a / 1e6, 1) + 'M'
  if (a >= 1e3) return sign + '$' + fmt(a / 1e3, 1) + 'K'
  return sign + '$' + fmt(a, 2)
}

export function fmtPrice(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1000) return fmt(n, 0)
  if (Math.abs(n) < 0.01) return n.toFixed(6)
  return fmt(n, decimals)
}

export function chgDir(n: number | null | undefined): 'up' | 'dn' | 'flat' {
  if (n == null || !Number.isFinite(n) || n === 0) return 'flat'
  return n > 0 ? 'up' : 'dn'
}
