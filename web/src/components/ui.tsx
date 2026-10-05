import React from 'react'
import { chgDir, fmtChg } from '../context/MarketContext'
import { fmtAsOf, unixSec } from '../utils/format'

function ClockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.6V8.1l2.3 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Last-print stamp from Yahoo. Chip sits under a price; plain is for labelled stats. */
export function AsOf({ at, variant = 'chip' }: { at?: number | null; variant?: 'chip' | 'plain' }) {
  const label = fmtAsOf(at)
  if (!label) return null
  const sec = unixSec(at)
  const title = sec ? `Last print ${new Date(sec * 1000).toLocaleString()}` : undefined
  return (
    <span
      className={`asof${variant === 'plain' ? ' asof-plain' : ''}`}
      title={title}
      aria-label={`Last print ${label}`}
    >
      {variant === 'chip' ? <ClockIcon /> : null}
      {label}
    </span>
  )
}

export function Section({
  label,
  count,
  right,
  children,
}: {
  label: string
  count?: number
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-label">{label}</h2>
        {count != null && <span className="count-pill">{count}</span>}
        <div className="section-line" />
        {right}
      </div>
      {children}
    </section>
  )
}

export function ChangeBadge({ value }: { value: number | null | undefined }) {
  const dir = chgDir(value)
  return <span className={`chg ${dir}`}>{fmtChg(value)}</span>
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  action?: React.ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-hint">{hint}</div>
      {action}
    </div>
  )
}

export function Segmented({
  options,
  value,
  onChange,
  tone = 'blue',
}: {
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
  tone?: 'blue' | 'gain'
}) {
  return (
    <div className="seg">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`seg-btn ${tone} ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3-3" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      className={`toggle ${checked ? 'on' : ''}`}
      style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
      onClick={() => { if (!disabled) onChange(!checked) }}
    >
      <span className="toggle-knob" />
    </button>
  )
}

export function DayRangeBar({
  low,
  high,
  current,
  color,
}: {
  low?: number | null
  high?: number | null
  current?: number | null
  color: string
}) {
  if (low == null || high == null || current == null || high <= low) return null
  const pct = Math.min(1, Math.max(0, (current - low) / (high - low)))
  return (
    <div className="range-bar">
      <div className="range-track">
        <div className="range-fill" style={{ width: `${pct * 100}%`, background: color }} />
        <div className="range-thumb" style={{ left: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  )
}

export function StatsStrip({ items }: { items: { val: string; label: string; color?: string }[] }) {
  return (
    <div className="stats-strip">
      {items.map((it, i) => (
        <React.Fragment key={it.label}>
          {i > 0 && <div className="stats-div" />}
          <div className="stats-item">
            <div className="stats-val" style={{ color: it.color }}>{it.val}</div>
            <div className="stats-lab">{it.label}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

export function OptionGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string | number }[]
  value: string | number
  onChange: (v: string | number) => void
}) {
  return (
    <div className="seg">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className={`seg-btn gain ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
