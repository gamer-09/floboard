import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useMarket } from '../context/MarketContext'
import { useSettings, type AppTheme } from '../context/SettingsContext'
import { canonicalPath } from '../utils/routes'

const NAV = [
  {
    group: 'Markets',
    items: [
      { to: '/markets', label: 'Overview', icon: 'markets' },
      { to: '/crypto', label: 'Crypto', icon: 'crypto' },
      { to: '/fx', label: 'FX & Metals', icon: 'fx' },
      { to: '/news', label: 'News', icon: 'news' },
    ],
  },
  {
    group: 'Macro',
    items: [
      { to: '/rates', label: 'Rates', icon: 'rates' },
      { to: '/energy', label: 'Energy', icon: 'energy' },
      { to: '/credit', label: 'Credit', icon: 'credit' },
      { to: '/copper', label: 'Copper', icon: 'copper' },
    ],
  },
  {
    group: 'Workspace',
    items: [
      { to: '/watchlist', label: 'Watchlist', icon: 'watchlist' },
      { to: '/portfolio', label: 'Portfolio', icon: 'portfolio' },
      { to: '/advisor', label: 'FloAI', icon: 'advisor' },
    ],
  },
  {
    group: 'System',
    items: [
      { to: '/help', label: 'Help', icon: 'help' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
]

const META: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Markets', sub: 'Live global snapshot' },
  '/markets': { title: 'Markets', sub: 'Live global snapshot' },
  '/crypto': { title: 'Crypto', sub: 'Digital assets in USD' },
  '/fx': { title: 'FX & Metals', sub: 'Majors, crosses, exotics & bullion' },
  '/rates': { title: 'Rates', sub: 'Treasury curve and 10Y–3M spread' },
  '/energy': { title: 'Energy', sub: 'WTI, Brent, gas, and energy stocks' },
  '/credit': { title: 'Credit', sub: 'High-yield and investment-grade ETFs' },
  '/copper': { title: 'Copper', sub: 'Industrial metals vs gold' },
  '/news': { title: 'News', sub: 'Market headlines with sentiment' },
  '/advisor': { title: 'FloAI Advisor', sub: 'Conversational market analysis' },
  '/portfolio': { title: 'Portfolio', sub: 'Simulated tracking — no deposits, no bank login' },
  '/watchlist': { title: 'Watchlist', sub: 'Favorites plus Tech, Crypto, and FX lists' },
  '/help': { title: 'Help', sub: 'How FloBoard works' },
  '/settings': { title: 'Settings', sub: 'Theme, data, FloAI, and privacy' },
}

function Icon({ name }: { name: string }) {
  const s = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'markets':
      return (
        <svg {...s}>
          <rect x="3" y="10" width="4" height="11" rx="1" fill="currentColor" stroke="none" />
          <rect x="10" y="4" width="4" height="17" rx="1" fill="currentColor" stroke="none" />
          <rect x="17" y="7" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'crypto':
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9 8h5a2 2 0 0 1 0 4H9M9 12h5.5a2 2 0 0 1 0 4H9" />
        </svg>
      )
    case 'fx':
      return (
        <svg {...s}>
          <circle cx="8" cy="12" r="5" />
          <circle cx="16" cy="12" r="5" />
        </svg>
      )
    case 'rates':
      return (
        <svg {...s}>
          <path d="M4 18V6M10 18V10M16 18V8M22 18H3" />
        </svg>
      )
    case 'energy':
      return (
        <svg {...s}>
          <path d="M12 3l-2 7h4L10 21l6-9h-4l2-9z" />
        </svg>
      )
    case 'credit':
      return (
        <svg {...s}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
        </svg>
      )
    case 'copper':
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'news':
      return (
        <svg {...s}>
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      )
    case 'advisor':
      return (
        <svg {...s}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'portfolio':
      return (
        <svg {...s}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      )
    case 'watchlist':
      return (
        <svg {...s}>
          <path d="M12 3l2.7 5.5 6 .9-4.4 4.3 1 6L12 16.8 6.7 19.7l1-6L3.3 9.4l6-.9z" />
        </svg>
      )
    case 'help':
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    default:
      return null
  }
}

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
      <rect x="5" y="18" width="4" height="9" rx="1.5" fill="#FF4D6A" />
      <rect x="11" y="13" width="4" height="14" rx="1.5" fill="#FFB627" />
      <rect x="17" y="9" width="4" height="18" rx="1.5" fill="#00E5A0" />
      <rect x="23" y="5" width="4" height="22" rx="1.5" fill="#00E5A0" />
    </svg>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation()
  const { loading, refresh, isOnline, lastUpdated } = useMarket()
  const { settings, updateSetting } = useSettings()
  const [open, setOpen] = useState(false)
  const [clock, setClock] = useState('')

  useEffect(() => { setOpen(false) }, [loc.pathname])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(
        `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')} UTC`,
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const pagePath = canonicalPath(loc.pathname)
  const meta = META[pagePath] ?? META['/markets']
  useEffect(() => {
    document.title = `${meta.title} · FloBoard`
  }, [meta.title])

  const isChat = pagePath === '/advisor'

  const cycleTheme = () => {
    const order: AppTheme[] = ['dark', 'light', 'oled']
    const i = order.indexOf(settings.theme)
    updateSetting('theme', order[(i + 1) % order.length])
  }

  const themeLabel = useMemo(() => {
    if (settings.theme === 'light') return 'Light'
    if (settings.theme === 'oled') return 'OLED'
    return 'Dark'
  }, [settings.theme])

  return (
    <div className="shell">
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <NavLink to="/markets" className="brand">
          <div className="brand-mark"><LogoMark /></div>
          <div>
            <div className="brand-name">FloBoard</div>
            <div className="brand-tag">Live markets</div>
          </div>
        </NavLink>
          <button type="button" className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
            ×
          </button>
        </div>
        <nav className="nav">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="nav-group">{g.group}</div>
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          FloBoard v1.2 · Yahoo Finance data
          <br />
          Tracking only. Not financial advice.
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div className="topbar-titles">
              <div className="topbar-title">{meta.title}</div>
              <div className="topbar-sub">{meta.sub}</div>
            </div>
          </div>
          <div className="topbar-right">
            <span className={`status-pill ${isOnline ? 'live' : 'off'}`}>
              <span className="pulse-dot" />
              {isOnline ? 'LIVE' : 'OFFLINE'}
            </span>
            <span className="clock">{clock}</span>
            <button className="icon-btn" onClick={cycleTheme} title={`Theme: ${themeLabel}`} aria-label="Cycle theme">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            </button>
            <button className="icon-btn" onClick={refresh} disabled={loading} aria-label="Refresh data" title={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh'}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                  <path d="M21 4v6h-6" />
                </svg>
              )}
            </button>
          </div>
        </header>
        <main className={`content ${isChat ? 'no-pad' : ''}`}>{children}</main>
        <nav className="tabbar" aria-label="Primary">
          {[
            { to: '/markets', label: 'Markets', icon: 'markets' },
            { to: '/crypto', label: 'Crypto', icon: 'crypto' },
            { to: '/watchlist', label: 'Watch', icon: 'watchlist' },
            { to: '/advisor', label: 'FloAI', icon: 'advisor' },
          ].map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/markets'}
              className={({ isActive }) => `tabbar-item ${isActive ? 'active' : ''}`}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </NavLink>
          ))}
          <button type="button" className="tabbar-item" onClick={() => setOpen(true)}>
            <Icon name="settings" />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
