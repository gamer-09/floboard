export interface Session { oh: number; om: number; ch: number; cm: number }
export interface Exchange {
  name: string
  full: string
  flag: string
  tz: string
  sessions: Session[]
  region: string
  weekends?: number[]
}

export const EXCHANGES: Exchange[] = [
  { name: 'NYSE', full: 'New York Stock Exchange', flag: '🇺🇸', tz: 'America/New_York', sessions: [{ oh: 9, om: 30, ch: 16, cm: 0 }], region: 'Americas' },
  { name: 'NASDAQ', full: 'NASDAQ', flag: '🇺🇸', tz: 'America/New_York', sessions: [{ oh: 9, om: 30, ch: 16, cm: 0 }], region: 'Americas' },
  { name: 'TSX', full: 'Toronto Stock Exchange', flag: '🇨🇦', tz: 'America/Toronto', sessions: [{ oh: 9, om: 30, ch: 16, cm: 0 }], region: 'Americas' },
  { name: 'BMV', full: 'Bolsa Mexicana de Valores', flag: '🇲🇽', tz: 'America/Mexico_City', sessions: [{ oh: 8, om: 30, ch: 15, cm: 0 }], region: 'Americas' },
  { name: 'B3', full: 'B3 Brazil', flag: '🇧🇷', tz: 'America/Sao_Paulo', sessions: [{ oh: 10, om: 0, ch: 17, cm: 55 }], region: 'Americas' },
  { name: 'BYMA', full: 'Buenos Aires Stock Exchange', flag: '🇦🇷', tz: 'America/Argentina/Buenos_Aires', sessions: [{ oh: 11, om: 0, ch: 17, cm: 0 }], region: 'Americas' },
  { name: 'LSE', full: 'London Stock Exchange', flag: '🇬🇧', tz: 'Europe/London', sessions: [{ oh: 8, om: 0, ch: 16, cm: 30 }], region: 'Europe' },
  { name: 'XETRA', full: 'Deutsche Börse', flag: '🇩🇪', tz: 'Europe/Berlin', sessions: [{ oh: 9, om: 0, ch: 17, cm: 30 }], region: 'Europe' },
  { name: 'Euronext', full: 'Euronext Paris / Amsterdam', flag: '🇫🇷', tz: 'Europe/Paris', sessions: [{ oh: 9, om: 0, ch: 17, cm: 30 }], region: 'Europe' },
  { name: 'SIX', full: 'SIX Swiss Exchange', flag: '🇨🇭', tz: 'Europe/Zurich', sessions: [{ oh: 9, om: 0, ch: 17, cm: 30 }], region: 'Europe' },
  { name: 'OMX', full: 'OMX Stockholm', flag: '🇸🇪', tz: 'Europe/Stockholm', sessions: [{ oh: 9, om: 0, ch: 17, cm: 30 }], region: 'Europe' },
  { name: 'Oslo', full: 'Oslo Børs', flag: '🇳🇴', tz: 'Europe/Oslo', sessions: [{ oh: 9, om: 0, ch: 16, cm: 30 }], region: 'Europe' },
  { name: 'MOEX', full: 'Moscow Exchange', flag: '🇷🇺', tz: 'Europe/Moscow', sessions: [{ oh: 9, om: 50, ch: 18, cm: 50 }], region: 'Europe' },
  { name: 'WSE', full: 'Warsaw Stock Exchange', flag: '🇵🇱', tz: 'Europe/Warsaw', sessions: [{ oh: 9, om: 0, ch: 17, cm: 5 }], region: 'Europe' },
  { name: 'BVB', full: 'Bucharest Stock Exchange', flag: '🇷🇴', tz: 'Europe/Bucharest', sessions: [{ oh: 10, om: 0, ch: 18, cm: 0 }], region: 'Europe' },
  { name: 'IBEX', full: 'BME (Madrid)', flag: '🇪🇸', tz: 'Europe/Madrid', sessions: [{ oh: 9, om: 0, ch: 17, cm: 30 }], region: 'Europe' },
  { name: 'TSE', full: 'Tokyo Stock Exchange', flag: '🇯🇵', tz: 'Asia/Tokyo', sessions: [{ oh: 9, om: 0, ch: 11, cm: 30 }, { oh: 12, om: 30, ch: 15, cm: 30 }], region: 'Asia-Pacific' },
  { name: 'SSE', full: 'Shanghai Stock Exchange', flag: '🇨🇳', tz: 'Asia/Shanghai', sessions: [{ oh: 9, om: 30, ch: 11, cm: 30 }, { oh: 13, om: 0, ch: 15, cm: 0 }], region: 'Asia-Pacific' },
  { name: 'HKEX', full: 'Hong Kong Exchange', flag: '🇭🇰', tz: 'Asia/Hong_Kong', sessions: [{ oh: 9, om: 30, ch: 12, cm: 0 }, { oh: 13, om: 0, ch: 16, cm: 0 }], region: 'Asia-Pacific' },
  { name: 'SGX', full: 'Singapore Exchange', flag: '🇸🇬', tz: 'Asia/Singapore', sessions: [{ oh: 9, om: 0, ch: 17, cm: 0 }], region: 'Asia-Pacific' },
  { name: 'BSE', full: 'BSE / NSE India', flag: '🇮🇳', tz: 'Asia/Kolkata', sessions: [{ oh: 9, om: 15, ch: 15, cm: 30 }], region: 'Asia-Pacific' },
  { name: 'ASX', full: 'Australian Securities Exchange', flag: '🇦🇺', tz: 'Australia/Sydney', sessions: [{ oh: 10, om: 0, ch: 16, cm: 0 }], region: 'Asia-Pacific' },
  { name: 'KRX', full: 'Korea Exchange', flag: '🇰🇷', tz: 'Asia/Seoul', sessions: [{ oh: 9, om: 0, ch: 15, cm: 30 }], region: 'Asia-Pacific' },
  { name: 'TWSE', full: 'Taiwan Stock Exchange', flag: '🇹🇼', tz: 'Asia/Taipei', sessions: [{ oh: 9, om: 0, ch: 13, cm: 30 }], region: 'Asia-Pacific' },
  { name: 'NZX', full: 'NZX New Zealand', flag: '🇳🇿', tz: 'Pacific/Auckland', sessions: [{ oh: 10, om: 0, ch: 17, cm: 0 }], region: 'Asia-Pacific' },
  { name: 'SET', full: 'Stock Exchange of Thailand', flag: '🇹🇭', tz: 'Asia/Bangkok', sessions: [{ oh: 10, om: 0, ch: 12, cm: 30 }, { oh: 14, om: 30, ch: 16, cm: 30 }], region: 'Asia-Pacific' },
  { name: 'IDX', full: 'Indonesia Stock Exchange', flag: '🇮🇩', tz: 'Asia/Jakarta', sessions: [{ oh: 9, om: 0, ch: 11, cm: 30 }, { oh: 13, om: 30, ch: 16, cm: 0 }], region: 'Asia-Pacific' },
  { name: 'Tadawul', full: 'Saudi Exchange', flag: '🇸🇦', tz: 'Asia/Riyadh', sessions: [{ oh: 10, om: 0, ch: 15, cm: 0 }], weekends: [5, 6], region: 'Mid East & Africa' },
  { name: 'DFM', full: 'Dubai Financial Market', flag: '🇦🇪', tz: 'Asia/Dubai', sessions: [{ oh: 10, om: 0, ch: 14, cm: 0 }], weekends: [5, 6], region: 'Mid East & Africa' },
  { name: 'TASE', full: 'Tel Aviv Stock Exchange', flag: '🇮🇱', tz: 'Asia/Jerusalem', sessions: [{ oh: 9, om: 59, ch: 17, cm: 25 }], weekends: [5, 6], region: 'Mid East & Africa' },
  { name: 'JSE', full: 'Johannesburg Stock Exchange', flag: '🇿🇦', tz: 'Africa/Johannesburg', sessions: [{ oh: 9, om: 0, ch: 17, cm: 0 }], region: 'Mid East & Africa' },
  { name: 'EGX', full: 'Egyptian Exchange', flag: '🇪🇬', tz: 'Africa/Cairo', sessions: [{ oh: 10, om: 0, ch: 14, cm: 30 }], weekends: [5, 6], region: 'Mid East & Africa' },
  { name: 'NGX', full: 'Nigerian Exchange Group', flag: '🇳🇬', tz: 'Africa/Lagos', sessions: [{ oh: 9, om: 30, ch: 14, cm: 30 }], region: 'Mid East & Africa' },
]

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }

function pad(n: number) { return String(n).padStart(2, '0') }

function fmtHm(h: number, m: number, hour12 = true): string {
  const hh = ((h % 24) + 24) % 24
  if (!hour12) return `${pad(hh)}:${pad(m)}`
  const am = hh < 12
  const hr = hh % 12 || 12
  return `${hr}:${pad(m)} ${am ? 'AM' : 'PM'}`
}

function weekdayIndex(raw: string): number {
  const k = raw.replace(/\./g, '').trim()
  if (k in WEEKDAY) return WEEKDAY[k]
  return WEEKDAY[k.slice(0, 3)] ?? 0
}

/**
 * Wall-clock in an IANA zone.
 * hour12:false + hourCycle h23, then still fold 24→0 and AM/PM in case the
 * engine ignores hourCycle (en-US on some browsers) and emits a 12-hour clock.
 * Without that, 2:30 PM is read as 02:30 and cash sessions look closed.
 */
export function zonedClock(tz: string, now = new Date()): { h: number; m: number; wd: number; mins: number; tzName: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).formatToParts(now)
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? ''
  let h = parseInt(get('hour'), 10)
  const m = parseInt(get('minute'), 10) || 0
  const period = get('dayPeriod').toUpperCase()
  if (period.includes('PM') && Number.isFinite(h) && h < 12) h += 12
  if (period.includes('AM') && h === 12) h = 0
  if (!Number.isFinite(h) || h === 24) h = 0
  if (h > 23) h %= 24
  const wd = weekdayIndex(get('weekday'))
  return { h, m, wd, mins: h * 60 + m, tzName: get('timeZoneName') }
}

export function getLocalTimeStr(tz: string, now = new Date()): string {
  try {
    const { h, m, tzName } = zonedClock(tz, now)
    const clock = fmtHm(h, m)
    const abb = tzName && !/^GMT/i.test(tzName) ? ` ${tzName}` : ''
    return clock + abb
  } catch { return '' }
}

export type SessionState = 'open' | 'closed' | 'lunch'

export interface ExchangeStatus {
  open: boolean
  state: SessionState
  localTime: string
  detail: string
  hoursLabel: string
}

function hoursLabel(ex: Exchange): string {
  return ex.sessions.map((s) => `${fmtHm(s.oh, s.om, false)}–${fmtHm(s.ch, s.cm, false)}`).join(' · ')
}

export function getExchangeStatus(ex: Exchange, now = new Date()): ExchangeStatus {
  const localTime = getLocalTimeStr(ex.tz, now)
  const hours = hoursLabel(ex)
  try {
    const { mins, wd } = zonedClock(ex.tz, now)
    const weekends = ex.weekends ?? [0, 6]
    const isWeekend = weekends.includes(wd)

    if (!isWeekend) {
      for (const s of ex.sessions) {
        const start = s.oh * 60 + s.om
        const end = s.ch * 60 + s.cm
        if (mins >= start && mins < end) {
          return { open: true, state: 'open', localTime, detail: `closes ${fmtHm(s.ch, s.cm)}`, hoursLabel: hours }
        }
      }
      if (ex.sessions.length > 1) {
        for (let i = 0; i < ex.sessions.length - 1; i++) {
          const end = ex.sessions[i].ch * 60 + ex.sessions[i].cm
          const next = ex.sessions[i + 1]
          const start = next.oh * 60 + next.om
          if (mins >= end && mins < start) {
            return { open: false, state: 'lunch', localTime, detail: `lunch · opens ${fmtHm(next.oh, next.om)}`, hoursLabel: hours }
          }
        }
      }
      const later = ex.sessions.find((s) => mins < s.oh * 60 + s.om)
      if (later) {
        return { open: false, state: 'closed', localTime, detail: `opens ${fmtHm(later.oh, later.om)}`, hoursLabel: hours }
      }
    }

    const first = ex.sessions[0]
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let add = 1; add <= 7; add++) {
      const d = (wd + add) % 7
      if (!weekends.includes(d)) {
        const when = add === 1 ? 'tomorrow' : DAYS[d]
        return { open: false, state: 'closed', localTime, detail: `opens ${when} ${fmtHm(first.oh, first.om)}`, hoursLabel: hours }
      }
    }
    return { open: false, state: 'closed', localTime, detail: `opens ${fmtHm(first.oh, first.om)}`, hoursLabel: hours }
  } catch {
    return { open: false, state: 'closed', localTime, detail: '', hoursLabel: hours }
  }
}
