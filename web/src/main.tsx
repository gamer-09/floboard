import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { SettingsProvider } from './context/SettingsContext'
import { MarketProvider } from './context/MarketContext'
import { registerNotificationWorker } from './utils/notifications'
import './index.css'

registerNotificationWorker()
if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
    const href = e.data?.href as string | undefined
    if (e.data?.type === 'floboard:nav' && href) location.hash = href.startsWith('#') ? href : `#${href}`
  })
}

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <MarketProvider>
            <App />
          </MarketProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </HashRouter>
  </React.StrictMode>,
)
