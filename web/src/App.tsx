import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './components/AppShell'
import ThemeSync from './components/ThemeSync'
import Advisor from './pages/Advisor'
import Copper from './pages/Copper'
import Credit from './pages/Credit'
import Crypto from './pages/Crypto'
import CurrencyPairs from './pages/CurrencyPairs'
import Energy from './pages/Energy'
import Help from './pages/Help'
import Markets from './pages/Markets'
import News from './pages/News'
import Portfolio from './pages/Portfolio'
import Rates from './pages/Rates'
import Settings from './pages/Settings'
import Watchlist from './pages/Watchlist'
import { canonicalPath, normalizePath } from './utils/routes'
import { useMarketNotifications } from './hooks/useMarketNotifications'
import Toasts from './components/Toasts'

function AppRoutes() {
  const loc = useLocation()
  const raw = normalizePath(loc.pathname)
  const path = canonicalPath(loc.pathname)
  const search = loc.search || ''

  if (raw !== path) {
    return <Navigate to={`${path}${search}`} replace />
  }

  const onAdvisor = path === '/advisor'

  return (
    <>
      <div
        style={{
          display: onAdvisor ? 'none' : 'block',
          height: onAdvisor ? 0 : '100%',
          overflow: onAdvisor ? 'hidden' : undefined,
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to={`/markets${search}`} replace />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/crypto" element={<Crypto />} />
          <Route path="/fx" element={<CurrencyPairs />} />
          <Route path="/rates" element={<Rates />} />
          <Route path="/energy" element={<Energy />} />
          <Route path="/credit" element={<Credit />} />
          <Route path="/copper" element={<Copper />} />
          <Route path="/news" element={<News />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/help" element={<Help />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/advisor" element={null} />
          <Route path="*" element={<Navigate to={`/markets${search}`} replace />} />
        </Routes>
      </div>
      <div
        className="chat-keep"
        style={{
          display: onAdvisor ? 'flex' : 'none',
          flex: onAdvisor ? 1 : undefined,
          height: onAdvisor ? '100%' : 0,
          minHeight: 0,
          width: '100%',
          flexDirection: 'column',
        }}
      >
        <Advisor />
      </div>
    </>
  )
}

function NotificationWatcher() {
  useMarketNotifications()
  return null
}

export default function App() {
  return (
    <>
      <ThemeSync />
      <NotificationWatcher />
      <AppShell>
        <AppRoutes />
      </AppShell>
      <Toasts />
    </>
  )
}
