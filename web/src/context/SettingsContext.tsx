import React, { createContext, useCallback, useContext, useState } from 'react'

export type RefreshInterval = 30 | 60 | 90 | 300
export type NewsCount = 10 | 15 | 20
export type AlertThreshold = 0 | 3 | 5 | 10
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'
export type WatchlistSort = 'change' | 'alpha' | 'added'
export type EarningsWindow = 2 | 4 | 8
export type PriceDecimals = 2 | 4
export type AppTheme = 'dark' | 'light' | 'oled'

export interface AppSettings {
  theme: AppTheme
  refreshInterval: RefreshInterval
  newsCount: NewsCount
  alertThreshold: AlertThreshold
  clearChatKey: number
  notificationsEnabled: boolean
  notifyPortfolio: boolean
  notifyMarketMoves: boolean
  notifyNews: boolean
  riskProfile: RiskProfile
  watchlistSort: WatchlistSort
  earningsWindow: EarningsWindow
  priceDecimals: PriceDecimals
  showExtendedHours: boolean
  compactNumbers: boolean
  geminiApiKey: string
  clearWatchlistKey: number
  clearPortfolioKey: number
}

const DEFAULT: AppSettings = {
  theme: 'dark',
  refreshInterval: 90,
  newsCount: 15,
  alertThreshold: 5,
  clearChatKey: 0,
  clearWatchlistKey: 0,
  clearPortfolioKey: 0,
  notificationsEnabled: false,
  notifyPortfolio: true,
  notifyMarketMoves: true,
  notifyNews: true,
  riskProfile: 'moderate',
  watchlistSort: 'change',
  earningsWindow: 4,
  priceDecimals: 2,
  showExtendedHours: false,
  compactNumbers: true,
  geminiApiKey: '',
}

const STORAGE_KEY = 'floboard:settings'

interface SettingsContextType {
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  triggerClearChat: () => void
  triggerClearWatchlist: () => void
  triggerClearPortfolio: () => void
  resetAllSettings: () => void
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT,
  updateSetting: () => {},
  triggerClearChat: () => {},
  triggerClearWatchlist: () => {},
  triggerClearPortfolio: () => {},
  resetAllSettings: () => {},
})

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return { ...DEFAULT, ...parsed, clearChatKey: 0, clearWatchlistKey: 0, clearPortfolioKey: 0 }
    }
  } catch { /* ignore */ }
  return DEFAULT
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      const toSave = { ...next, clearChatKey: 0, clearWatchlistKey: 0, clearPortfolioKey: 0 }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const triggerClearChat = useCallback(() => {
    try { localStorage.setItem('floboard:chat', '[]') } catch { /* ignore */ }
    setSettings((prev) => ({ ...prev, clearChatKey: prev.clearChatKey + 1 }))
  }, [])

  const triggerClearWatchlist = useCallback(() => {
    try { localStorage.setItem('floboard:watchlist', '[]') } catch { /* ignore */ }
    setSettings((prev) => ({ ...prev, clearWatchlistKey: (prev.clearWatchlistKey || 0) + 1 }))
  }, [])

  const triggerClearPortfolio = useCallback(() => {
    try { localStorage.setItem('floboard:holdings', '[]') } catch { /* ignore */ }
    setSettings((prev) => ({ ...prev, clearPortfolioKey: (prev.clearPortfolioKey || 0) + 1 }))
  }, [])

  const resetAllSettings = useCallback(() => {
    const reset = { ...DEFAULT }
    setSettings(reset)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...reset, clearChatKey: 0, clearWatchlistKey: 0, clearPortfolioKey: 0 })) } catch { /* ignore */ }
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, triggerClearChat, triggerClearWatchlist, triggerClearPortfolio, resetAllSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
