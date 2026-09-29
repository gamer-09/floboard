import React, { useState } from 'react'

interface HelpSection {
  id: string
  title: string
  icon: string
  accent: string
  items: { q: string; a: string }[]
}

const SECTIONS: HelpSection[] = [
  {
    id: 'gemini', title: 'Getting your Gemini API key', icon: '🔑', accent: 'var(--amber)',
    items: [
      { q: 'What is the Gemini API key?', a: 'FloAI is powered by Google Gemini. A personal API key is like a password that lets FloAI talk to Gemini from your browser.' },
      { q: 'How do I get a free key?', a: '1. Open https://aistudio.google.com/apikey\n2. Sign in with a Google account\n3. Create an API key\n4. Copy it (it starts with AIza…)\n5. Paste it in Settings → Gemini API Key' },
      { q: 'Is my key safe?', a: 'The key is stored only in this browser’s local storage. FloBoard does not upload it to our servers.' },
      { q: 'What happens without a key?', a: 'Every market tab still works. FloAI can use the server key if one is configured, otherwise you get the offline advisor.' },
    ],
  },
  {
    id: 'markets', title: 'Markets', icon: '▣', accent: 'var(--gain)',
    items: [
      { q: 'What does Overview show?', a: 'Live prices for global indices, commodities, Treasury yields, sector ETFs, large-cap stocks, and FX — plus open/closed hours for 33 exchanges.' },
      { q: 'What are Rates, Energy, Credit, and Copper?', a: 'Separate Macro tabs. Rates is the Treasury curve and 10Y–3M spread. Energy is WTI, Brent, and gas. Credit is HYG/LQD junk vs investment-grade. Copper is industrial metals.' },
      { q: 'How current is the data?', a: 'Quotes refresh automatically. Change the interval in Settings (30s, 60s, 90s, or 5 min).' },
      { q: 'What do the colors mean?', a: 'Green is up on the day. Red is down. Amber is flat or nearly unchanged.' },
    ],
  },
  {
    id: 'crypto', title: 'Crypto & FX', icon: '₿', accent: 'var(--blue)',
    items: [
      { q: 'Which coins are tracked?', a: 'Bitcoin, Ethereum, Solana, and 80+ others with live USD prices, filters, and expandable detail cards.' },
      { q: 'Are crypto prices 24/7?', a: 'Yes. Crypto never closes. FX is typically Sun 5pm to Fri 5pm ET.' },
      { q: 'What are the Crypto filters?', a: 'All, Top, L1, L2, DeFi, Meme, Web3, AI, and Stable. Tap a coin for the 24h range, 7-day chart, and Ask FloAI.' },
      { q: 'What is the FX tab?', a: 'Majors, Minors (crosses), Exotics, Commodity pairs, Metals (spot gold/silver), and the DXY dollar index. Tap a pair for the 7-day chart.' },
    ],
  },
  {
    id: 'advisor', title: 'FloAI Advisor', icon: '✦', accent: 'var(--gain)',
    items: [
      { q: 'What can FloAI do?', a: 'Chat normally, or analyze stocks, crypto, FX, and macro. Market answers follow the Conservative / Moderate / Aggressive mode you pick.' },
      { q: 'Is this financial advice?', a: 'No. FloAI is educational only. Do your own research.' },
    ],
  },
  {
    id: 'portfolio', title: 'Portfolio & Watchlist', icon: '◎', accent: 'var(--amber)',
    items: [
      { q: 'Does Portfolio connect to a bank?', a: 'No. It is 100% simulated tracking. You type symbols, units, and cost basis yourself. There is no deposit flow and no brokerage login.' },
      { q: 'Is my data private?', a: 'Yes. Watchlist and holdings live in this browser only.' },
      { q: 'What does Clear Favorites do?', a: 'Settings → Clear Favorites empties only your custom watchlist. Preset market lists are never deleted.' },
      { q: 'What are the Watchlist tabs?', a: '★ Favorites is yours. Tech & AI, Crypto, and FX & Metals are built-in lists. You can add or remove symbols on any tab. A ticker is only added if Yahoo Finance lists it — unknown names are not stored with a fake price.' },
      { q: 'How do I add a holding?', a: 'Portfolio → + Add holding. Enter a ticker, quantity, and average price. It is simulated tracking only.' },
      { q: 'What is asset allocation?', a: 'When you have holdings, Portfolio shows a stocks / crypto / other split. Percentages are of simulated value, not a real account.' },
    ],
  },
  {
    id: 'settings', title: 'Settings', icon: '⚙', accent: 'var(--blue)',
    items: [
      { q: 'Theme', a: 'Dark, Light, or OLED. You can also cycle themes from the sun icon in the top bar.' },
      { q: 'Reset settings', a: 'Restores preferences. Watchlist and portfolio are not wiped unless you use those specific buttons.' },
    ],
  },
]

function QAItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`qa ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
      <div style={{ display: 'flex', gap: 10 }}>
        <span style={{ flex: 1, fontWeight: 600, color: 'var(--t2)', fontSize: 13.5, lineHeight: 1.45 }}>{q}</span>
        <span className="muted">{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.65, color: 'var(--t3)', whiteSpace: 'pre-wrap' }}>{a}</div>}
    </div>
  )
}

export default function HelpScreen() {
  const [expanded, setExpanded] = useState<string | null>('gemini')
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="help-hero">
        <div style={{ fontWeight: 800, color: 'var(--gain)', marginBottom: 8 }}>Quick start</div>
        <div style={{ color: 'var(--t2)', lineHeight: 1.65, fontSize: 14.5 }}>
          FloBoard is a live market desk for stocks, crypto, FX, and news. No account. No deposits.
          <br /><br />
          Unlock live FloAI chat with a free Gemini key from{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--gain)', fontWeight: 700 }}>aistudio.google.com/apikey</a>
          {' '}then paste it in <strong style={{ color: 'var(--t1)' }}>Settings → Gemini API Key</strong>. Server-side chat also works without a personal key.
        </div>
      </div>

      {SECTIONS.map((s) => {
        const open = expanded === s.id
        return (
          <div key={s.id} className="help-item">
            <button className="help-item-h" type="button" onClick={() => setExpanded(open ? null : s.id)}>
              <div className="help-ico" style={{ background: `${s.accent}22`, color: s.accent, border: `1px solid ${s.accent}33` }}>{s.icon}</div>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>{s.title}</span>
              <span className="muted">{open ? '▲' : '▼'}</span>
            </button>
            {open && (
              <div style={{ padding: '0 14px 14px' }}>
                {s.items.map((item, i) => <QAItem key={i} q={item.q} a={item.a} />)}
              </div>
            )}
          </div>
        )
      })}

      <div className="updated">
        FloBoard v1.2 · Market data from Yahoo Finance · AI by Google Gemini
        <br />
        For information only — not financial advice.
      </div>
    </div>
  )
}
