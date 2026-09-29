import React from 'react'
import { OptionGroup, Toggle } from '../components/ui'
import { useSettings, type AlertThreshold, type AppTheme, type EarningsWindow, type NewsCount, type PriceDecimals, type RefreshInterval, type RiskProfile, type WatchlistSort } from '../context/SettingsContext'

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-lab">{label}</div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 22 }}>
      <div className="section-label">{title}</div>
      <div className="settings-card">{children}</div>
    </section>
  )
}

export default function SettingsScreen() {
  const { settings, updateSetting, triggerClearChat, triggerClearWatchlist, triggerClearPortfolio, resetAllSettings } = useSettings()

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <Block title="Display">
        <SettingRow label="Theme" desc="Dark desk, light desk, or true black OLED">
          <OptionGroup
            options={[{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }, { label: 'OLED', value: 'oled' }]}
            value={settings.theme}
            onChange={(v) => updateSetting('theme', v as AppTheme)}
          />
        </SettingRow>
        <SettingRow label="Price decimals" desc="How many places after the point">
          <OptionGroup options={[{ label: '2', value: 2 }, { label: '4', value: 4 }]} value={settings.priceDecimals} onChange={(v) => updateSetting('priceDecimals', v as PriceDecimals)} />
        </SettingRow>
        <SettingRow label="Compact numbers" desc="On: $1.2T. Off: the full Yahoo figure (not a rounded placeholder).">
          <Toggle checked={settings.compactNumbers} onChange={(v) => updateSetting('compactNumbers', v)} />
        </SettingRow>
        <SettingRow label="Show extended hours" desc="Use pre-market and after-hours prices where available">
          <Toggle checked={settings.showExtendedHours} onChange={(v) => updateSetting('showExtendedHours', v)} />
        </SettingRow>
      </Block>

      <Block title="Data">
        <SettingRow label="Refresh interval" desc="How often quotes reload">
          <OptionGroup
            options={[{ label: '30s', value: 30 }, { label: '60s', value: 60 }, { label: '90s', value: 90 }, { label: '5m', value: 300 }]}
            value={settings.refreshInterval}
            onChange={(v) => updateSetting('refreshInterval', v as RefreshInterval)}
          />
        </SettingRow>
        <SettingRow label="News headlines" desc="How many stories to load">
          <OptionGroup options={[{ label: '10', value: 10 }, { label: '15', value: 15 }, { label: '20', value: 20 }]} value={settings.newsCount} onChange={(v) => updateSetting('newsCount', v as NewsCount)} />
        </SettingRow>
        <SettingRow label="Earnings window" desc="How far ahead the News calendar looks">
          <OptionGroup
            options={[{ label: '2w', value: 2 }, { label: '4w', value: 4 }, { label: '8w', value: 8 }]}
            value={settings.earningsWindow}
            onChange={(v) => updateSetting('earningsWindow', v as EarningsWindow)}
          />
        </SettingRow>
      </Block>

      <Block title="FloAI Advisor">
        <SettingRow label="Risk profile" desc="How FloAI frames market answers">
          <OptionGroup
            options={[
              { label: 'Conservative', value: 'conservative' },
              { label: 'Moderate', value: 'moderate' },
              { label: 'Aggressive', value: 'aggressive' },
            ]}
            value={settings.riskProfile}
            onChange={(v) => updateSetting('riskProfile', v as RiskProfile)}
          />
        </SettingRow>
        <SettingRow
          label="Gemini API key"
          desc={settings.geminiApiKey ? `Saved · ends ${settings.geminiApiKey.slice(-4)}` : 'Optional. Get a free key at aistudio.google.com/apikey — or FloAI uses the server key / offline advisor.'}
        >
          <input
            className="field"
            style={{ width: 240 }}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={settings.geminiApiKey}
            onChange={(e) => updateSetting('geminiApiKey', e.target.value)}
            placeholder="AIza…"
          />
        </SettingRow>
      </Block>

      <Block title="Watchlist">
        <SettingRow label="Sort order" desc="How favorites are ordered">
          <OptionGroup
            options={[{ label: '% Chg', value: 'change' }, { label: 'A–Z', value: 'alpha' }, { label: 'Recent', value: 'added' }]}
            value={settings.watchlistSort}
            onChange={(v) => updateSetting('watchlistSort', v as WatchlistSort)}
          />
        </SettingRow>
      </Block>

      <Block title="Portfolio alerts">
        <SettingRow label="Day-move threshold" desc="Highlight a holding when its daily move exceeds this. Off = no highlight.">
          <OptionGroup
            options={[{ label: 'Off', value: 0 }, { label: '3%', value: 3 }, { label: '5%', value: 5 }, { label: '10%', value: 10 }]}
            value={settings.alertThreshold}
            onChange={(v) => updateSetting('alertThreshold', v as AlertThreshold)}
          />
        </SettingRow>
      </Block>

      <Block title="Data & privacy">
        <SettingRow label="Clear FloAI chat" desc="Remove messages in this browser">
          <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Clear FloAI chat history?')) triggerClearChat() }}>Clear</button>
        </SettingRow>
        <SettingRow label="Clear favorites" desc="Empties only your custom watchlist. Preset market lists stay.">
          <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Clear your Favorites watchlist? Preset lists are not affected.')) triggerClearWatchlist() }}>Clear</button>
        </SettingRow>
        <SettingRow label="Delete simulated holdings" desc="Remove tracked positions. There is no real brokerage account.">
          <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete all simulated holdings?')) triggerClearPortfolio() }}>Delete</button>
        </SettingRow>
      </Block>

      <Block title="Advanced">
        <SettingRow label="Reset all settings" desc="Restore defaults. Watchlist and holdings stay unless you clear them above.">
          <button className="btn btn-danger btn-sm solid" onClick={() => { if (confirm('Reset all settings to defaults?')) resetAllSettings() }}>Reset</button>
        </SettingRow>
      </Block>

      <div className="disclaimer">
        <strong>Not financial advice.</strong> FloBoard is for information only. Nothing here — including FloAI — is personal investment advice. Do your own research.
      </div>
      <div className="updated">FloBoard v1.2 · Yahoo Finance data · Google Gemini · Preferences stay in this browser only</div>
    </div>
  )
}
