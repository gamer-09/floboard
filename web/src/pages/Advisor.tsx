import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useMarket } from '../context/MarketContext'
import { useSettings } from '../context/SettingsContext'
import { getApiBase, resolveApiBase } from '../utils/apiBase'
import { canonicalPath } from '../utils/routes'

interface Message { role: 'user' | 'assistant'; content: string }

function generateFallbackAiResponse(query: string, risk: string): string {
  const r = (risk || 'moderate').toLowerCase()
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const q = query.trim().toLowerCase()

  if (/^(hi|hello|hey|yo|help|thanks|thank you|what is floboard|who are you)[.!?]*$/i.test(q)) {
    return `Hello — I'm **FloAI**, the advisor built into FloBoard.\n\nWe can talk normally, or I can analyze a stock, coin, or FX pair. Market answers follow your **${r.toUpperCase()}** risk mode.`
  }

  if (/gold|gc=f|silver|si=f|xau|xag|metal/i.test(q)) {
    return `### FloAI [${r.toUpperCase()} MODE] · ${dateStr}\n\n**Gold / Precious Metals**\n\nAs a ${r} investor, gold is ${r === 'aggressive' ? 'a momentum sleeve — watch breakouts against DXY' : r === 'conservative' ? 'a 5–10% capital-preservation hedge' : 'a 5–8% portfolio hedge'}. Watch Treasury yields and the dollar for direction.`
  }

  if (/btc|bitcoin|eth|ethereum|sol|solana|crypto/i.test(q)) {
    return `### FloAI [${r.toUpperCase()} MODE] · ${dateStr}\n\n**Bitcoin / Crypto**\n\n${r === 'aggressive' ? 'A 15–20% core L1 sleeve (BTC, ETH, SOL) with breakout entries can fit an aggressive book.' : r === 'conservative' ? 'Keep crypto under 3% and prefer BTC only. Treasuries stay the core.' : 'A 5–10% DCA sleeve with quarterly rebalancing is the moderate path.'}`
  }

  if (/aapl|nvda|msft|tsla|stock|share|equity/i.test(q)) {
    return `### FloAI [${r.toUpperCase()} MODE] · ${dateStr}\n\n**Equities**\n\n${r === 'aggressive' ? 'Overweight AI / semiconductor leaders and enter on volume breakouts.' : r === 'conservative' ? 'Favor dividend aristocrats and keep a large fixed-income cushion.' : 'Core index exposure via SPY/QQQ, topped up with quality mega-caps.'}`
  }

  if (/eurusd|usdjpy|forex|fx|currency|dollar|dxy/i.test(q)) {
    return `### FloAI [${r.toUpperCase()} MODE] · ${dateStr}\n\n**Forex**\n\n${r === 'aggressive' ? 'Trade momentum around central-bank events and carry trends.' : r === 'conservative' ? 'Avoid speculative FX. Use currency only as a hedge for international holdings.' : 'Track G10 majors with DXY. Pair domestic equities with international ETFs.'}`
  }

  return `### FloAI [${r.toUpperCase()} MODE] · ${dateStr}\n\n**Market outlook**\n\nBased on your ${r} profile:\n${r === 'aggressive' ? '- High-beta growth and AI infrastructure\n- Accept volatility for upside\n- Watch breakouts and volume' : r === 'conservative' ? '- Capital preservation and dividends\n- Large sovereign-debt sleeve\n- Defensive sectors (staples, utilities)' : '- Balanced 60/40-style mix\n- Core index funds + quality mega-caps\n- Quarterly rebalance'}`
}

function renderText(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const heading = line.startsWith('### ') ? line.slice(4) : null
    const parts = (heading ?? line).split('**').map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))
    if (heading) return <div key={i} style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{parts}</div>
    return <span key={i}>{parts}{i < lines.length - 1 ? '\n' : ''}</span>
  })
}

const SUGGESTS = [
  'Review my portfolio risk & diversification',
  'Analyze my watchlist outlook & correlations',
  'What is the outlook for gold?',
  'Should I buy Bitcoin?',
  'How is the S&P 500 looking?',
  'Explain EUR/USD this week',
]

const RIBBON = [
  { sym: '^GSPC', label: 'S&P 500', kind: 'idx' as const },
  { sym: 'BTC-USD', label: 'BTC', kind: 'btc' as const },
  { sym: 'GC=F', label: 'Gold', kind: 'usd' as const },
  { sym: '^TNX', label: '10Y', kind: 'yield' as const },
  { sym: '^VIX', label: 'VIX', kind: 'num' as const },
]

function readLocalList(): { holdings: string; watchlist: string } {
  let holdings = ''
  let watchlist = ''
  try {
    const h = JSON.parse(localStorage.getItem('floboard:holdings') || '[]') as { symbol?: string; shares?: number; avgPrice?: number }[]
    if (Array.isArray(h) && h.length) holdings = h.map((x) => `${x.symbol}: ${x.shares} @ $${x.avgPrice}`).join(', ')
  } catch { /* ignore */ }
  try {
    const keys = ['floboard:watchlist', 'floboard:watchlist:Tech', 'floboard:watchlist:Crypto', 'floboard:watchlist:Macro']
    const syms: string[] = []
    for (const k of keys) {
      const w = JSON.parse(localStorage.getItem(k) || '[]') as unknown
      if (Array.isArray(w)) syms.push(...w.map((s) => String(s)))
    }
    watchlist = [...new Set(syms)].join(', ')
  } catch { /* ignore */ }
  return { holdings, watchlist }
}

function fmtNum(n: number, d: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d })
}

type GeminiContent = { role: string; parts: { text: string }[] }

const CHAT_KEY = 'floboard:chat'

function loadChat(): Message[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Message[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-80)
  } catch {
    return []
  }
}

function saveChat(msgs: Message[]) {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-80))) } catch { /* ignore */ }
}

export default function AdvisorScreen() {
  const { settings, updateSetting } = useSettings()
  const { data } = useMarket()
  const loc = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [messages, setMessages] = useState<Message[]>(loadChat)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<Message[]>(messages)
  const sendRef = useRef<(preset?: string) => Promise<void>>(async () => {})
  const handledQ = useRef<string | null>(null)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { saveChat(messages) }, [messages])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    if (settings.clearChatKey > 0) {
      setMessages([])
      saveChat([])
    }
  }, [settings.clearChatKey])

  const sendMessage = async (preset?: string) => {
    const text = (preset ?? input).trim()
    if (!text || loading) return
    setInput('')
    if (fieldRef.current) fieldRef.current.style.height = ''
    const history: Message[] = [...messagesRef.current, { role: 'user', content: text }]
    setMessages(history)
    messagesRef.current = history
    setLoading(true)

    const isMarket = /gold|silver|metal|btc|bitcoin|eth|crypto|stock|share|equity|forex|fx|dollar|dxy|yield|bond|oil|nasdaq|s&p|invest|buy|sell|portfolio|watchlist|nvda|aapl|tsla/i.test(text)
    const modePrefix = isMarket ? `[${settings.riskProfile.toUpperCase()} MODE] ` : ''
    const marketContext = Object.entries(data).slice(0, 20).map(([sym, q]) => `${sym}: $${q.regularMarketPrice} (${q.regularMarketChangePercent >= 0 ? '+' : ''}${q.regularMarketChangePercent.toFixed(2)}%)`).join('\n')
    const extra = readLocalList()
    const extraBlock = [extra.holdings && `User simulated portfolio (tracking only): ${extra.holdings}`, extra.watchlist && `User watchlist symbols: ${extra.watchlist}`].filter(Boolean).join('\n')
    const system = `You are FloAI, FloBoard's market assistant. Speak naturally for ordinary conversation. When the user asks about markets, assets, or investing, rewrite and analyze through a ${settings.riskProfile.toUpperCase()} risk lens. Reference the user's simulated portfolio and watchlist when they ask. Never ask for bank logins, deposits, or personal financial account details. Educational only — not financial advice. Always finish complete answers; never stop mid-sentence.\n\nLive snapshot:\n${marketContext}${extraBlock ? `\n\n${extraBlock}` : ''}`

    const finish = (reply: string) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      setLoading(false)
    }

    const apiMessages = history.map((m) => ({
      role: m.role,
      content: m.role === 'user' && m.content === text ? `${modePrefix}${text}` : m.content,
    }))

    const contents: GeminiContent[] = history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.role === 'user' && m.content === text ? `${modePrefix}${text}` : m.content }],
    }))

    const callGemini = async (bodyContents: GeminiContent[]) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(settings.geminiApiKey.trim())}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: bodyContents,
          generationConfig: {
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      })
      const json = await res.json() as {
        error?: { message?: string }
        candidates?: Array<{
          finishReason?: string
          content?: { parts?: Array<{ text?: string }> }
        }>
      }
      const cand = json.candidates?.[0]
      const reply = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('')
      return { json, reply, finishReason: cand?.finishReason }
    }

    if (settings.geminiApiKey.trim()) {
      try {
        let { json, reply, finishReason } = await callGemini(contents)
        if (json.error?.message && !reply) {
          finish(`Error from Google Gemini API: ${json.error.message}`)
          return
        }
        if (finishReason === 'MAX_TOKENS' && reply) {
          const cont = await callGemini([
            ...contents,
            { role: 'model', parts: [{ text: reply }] },
            { role: 'user', parts: [{ text: 'Continue exactly where you left off. Do not repeat.' }] },
          ])
          if (cont.reply) reply += cont.reply
        }
        if (reply.trim()) {
          finish(reply)
          return
        }
      } catch { /* Render proxy next */ }
    }

    try {
      const base = await resolveApiBase().catch(() => getApiBase())
      const proxyRes = await fetch(`${base}/api/chat?stream=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt: system,
          geminiApiKey: settings.geminiApiKey,
        }),
      })
      const json = await proxyRes.json() as { content?: string; error?: string }
      if (json.content?.trim()) {
        finish(json.content)
        return
      }
      if (json.error) {
        finish(json.error)
        return
      }
    } catch { /* fallback */ }

    finish(generateFallbackAiResponse(text, settings.riskProfile))
  }

  sendRef.current = sendMessage

  useEffect(() => {
    if (canonicalPath(loc.pathname) !== '/advisor') return
    const q = searchParams.get('q')?.trim()
    if (!q) return
    let seen = handledQ.current
    try { seen = seen || sessionStorage.getItem('floboard:lastQ') } catch { /* ignore */ }
    if (seen === q) {
      setSearchParams({}, { replace: true })
      return
    }
    const last = messagesRef.current[messagesRef.current.length - 1]
    if (last?.role === 'user' && last.content === q) {
      handledQ.current = q
      try { sessionStorage.setItem('floboard:lastQ', q) } catch { /* ignore */ }
      setSearchParams({}, { replace: true })
      return
    }
    handledQ.current = q
    try { sessionStorage.setItem('floboard:lastQ', q) } catch { /* ignore */ }
    setSearchParams({}, { replace: true })
    void sendRef.current(q)
  }, [searchParams, loc.pathname, setSearchParams])

  return (
    <div className="chat">
      <div className="chat-ribbon">
        {RIBBON.map(({ sym, label, kind }) => {
          const d = data[sym]
          const chg = d?.regularMarketChangePercent ?? 0
          const col = chg > 0 ? 'var(--gain)' : chg < 0 ? 'var(--loss)' : 'var(--amber)'
          const exact = !settings.compactNumbers
          const price = d == null ? '—'
            : kind === 'idx' ? fmtNum(d.regularMarketPrice, exact ? 2 : 0)
            : kind === 'btc' ? `$${fmtNum(d.regularMarketPrice, exact ? 2 : 0)}`
            : kind === 'yield' ? `${fmtNum(d.regularMarketPrice, 2)}%`
            : kind === 'num' ? fmtNum(d.regularMarketPrice, exact ? 2 : 1)
            : `$${fmtNum(d.regularMarketPrice, exact ? 2 : 0)}`
          return (
            <div key={sym} className="chat-ribbon-chip">
              <span className="chat-ribbon-lab">{label}</span>
              <span className="chat-ribbon-val">{price}</span>
              {d && <span style={{ color: col }}>{chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(1)}%</span>}
            </div>
          )
        })}
      </div>
      <div className="chat-risk">
        {(['conservative', 'moderate', 'aggressive'] as const).map((r) => (
          <button
            key={r}
            type="button"
            className={`seg-btn gain ${settings.riskProfile === r ? 'active' : ''}`}
            onClick={() => updateSetting('riskProfile', r)}
          >
            {r[0].toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
      <div className="chat-thread">
        <div className="chat-inner">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="empty-icon">✦</div>
              <h3>Ask FloAI anything</h3>
              <p className="muted">Normal chat stays natural. Market questions follow your {settings.riskProfile} mode.</p>
              <div className="suggest">
                {SUGGESTS.map((s) => (
                  <button key={s} type="button" onClick={() => sendMessage(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
              {renderText(msg.content)}
            </div>
          ))}
          {loading && (
            <div className="bubble ai"><div className="spinner" style={{ width: 16, height: 16 }} /></div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div className="chat-input">
        <div className="chat-box">
          <textarea
            className="field chat-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask about markets, or just say hi…"
            rows={1}
          />
          <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
