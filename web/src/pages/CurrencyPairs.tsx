import React, { useMemo, useState } from 'react'
import SparklineChart from '../components/SparklineChart'
import { AsOf, DayRangeBar, SearchBox, Segmented, StatsStrip } from '../components/ui'
import { FOREX } from '../constants/marketData'
import { chgDir, fmtChg, useMarket } from '../context/MarketContext'
import { useFormat } from '../hooks/useFormat'

type Group = 'All' | 'Majors' | 'Minors' | 'Exotics' | 'Commodity' | 'Metals' | 'Index'

interface PairInfo { sym: string; pair: string; base: string; quote: string; group: Exclude<Group, 'All'>; desc: string }

const NAMES: Record<string, string> = {
  XAU: 'Gold Spot', XAG: 'Silver Spot', XPT: 'Platinum Spot', XPD: 'Palladium Spot',
  EUR: 'Euro', GBP: 'British Pound', USD: 'US Dollar', JPY: 'Japanese Yen',
  CHF: 'Swiss Franc', AUD: 'Australian Dollar', NZD: 'New Zealand Dollar', CAD: 'Canadian Dollar',
  SGD: 'Singapore Dollar', HKD: 'Hong Kong Dollar', NOK: 'Norwegian Krone', SEK: 'Swedish Krona', DKK: 'Danish Krone',
  CNY: 'Chinese Yuan', CNH: 'Chinese Yuan (Offshore)', INR: 'Indian Rupee', KRW: 'South Korean Won',
  TWD: 'New Taiwan Dollar', THB: 'Thai Baht', MYR: 'Malaysian Ringgit', IDR: 'Indonesian Rupiah',
  PHP: 'Philippine Peso', VND: 'Vietnamese Dong', TRY: 'Turkish Lira', PLN: 'Polish Zloty',
  HUF: 'Hungarian Forint', CZK: 'Czech Koruna', RUB: 'Russian Ruble', ILS: 'Israeli Shekel',
  BRL: 'Brazilian Real', MXN: 'Mexican Peso', CLP: 'Chilean Peso', COP: 'Colombian Peso',
  PEN: 'Peruvian Sol', ARS: 'Argentine Peso', ZAR: 'South African Rand', NGN: 'Nigerian Naira',
  KES: 'Kenyan Shilling', EGP: 'Egyptian Pound', GHS: 'Ghanaian Cedi', AED: 'UAE Dirham',
  SAR: 'Saudi Riyal', QAR: 'Qatari Riyal', BASKET: 'Trade-weighted basket',
}

const MAJOR_SYMS = new Set(['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X', 'NZDUSD=X', 'USDCAD=X'])
const COMMODITY_SYMS = new Set(['AUDUSD=X', 'USDCAD=X', 'NZDUSD=X', 'AUDNZD=X', 'AUDCAD=X', 'NZDCAD=X'])
const EXOTIC = new Set(['TRY', 'MXN', 'ZAR', 'HKD', 'SGD', 'SEK', 'NOK', 'DKK', 'PLN', 'HUF', 'CZK', 'CNY', 'CNH', 'INR', 'KRW', 'TWD', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'PKR', 'BDT', 'RUB', 'ILS', 'RON', 'BGN', 'BRL', 'CLP', 'COP', 'PEN', 'ARS', 'NGN', 'KES', 'EGP', 'GHS', 'TZS', 'MAD', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD'])
const METALS = new Set(['XAU', 'XAG', 'XPT', 'XPD'])

const GROUP_INFO: Record<Exclude<Group, 'All'>, { title: string; desc: string }> = {
  Majors: { title: 'Major pairs', desc: 'The 7 most liquid pairs in the world, all featuring USD.' },
  Minors: { title: 'Minor / cross pairs', desc: 'Major currencies traded against each other without USD.' },
  Exotics: { title: 'Exotic pairs', desc: 'One major currency paired with an emerging-market currency. Lower liquidity, wider spreads.' },
  Commodity: { title: 'Commodity pairs', desc: 'Pairs heavily influenced by oil, gold, minerals, and agriculture.' },
  Metals: { title: 'Precious metals (spot)', desc: 'Spot gold, silver, platinum, and palladium quoted in US dollars.' },
  Index: { title: 'US Dollar Index', desc: 'DXY — value of the dollar versus a trade-weighted basket.' },
}

function classify(sym: string, base: string, quote: string): Exclude<Group, 'All'> {
  if (sym === 'DX-Y.NYB') return 'Index'
  if (METALS.has(base) || METALS.has(quote)) return 'Metals'
  if (MAJOR_SYMS.has(sym)) return 'Majors'
  if (EXOTIC.has(base) || EXOTIC.has(quote)) return 'Exotics'
  return 'Minors'
}

function matches(p: PairInfo, group: Group): boolean {
  if (group === 'All') return true
  if (group === 'Commodity') {
    return COMMODITY_SYMS.has(p.sym) || ((p.base === 'AUD' || p.base === 'NZD' || p.base === 'CAD' || p.quote === 'AUD' || p.quote === 'NZD' || p.quote === 'CAD') && p.group !== 'Metals' && p.group !== 'Index')
  }
  return p.group === group
}

const PAIRS: PairInfo[] = [
  ...FOREX.map((fx) => {
    const [base, quote] = fx.label.split('/')
    const b = base ?? ''
    const q = quote ?? ''
    return { sym: fx.sym, pair: fx.label, base: b, quote: q, group: classify(fx.sym, b, q), desc: `${NAMES[b] ?? b} / ${NAMES[q] ?? q}` }
  }),
  { sym: 'DX-Y.NYB', pair: 'DXY', base: 'USD', quote: 'BASKET', group: 'Index', desc: 'US Dollar Index — trade-weighted basket' },
]

function decimals(sym: string): number {
  if (sym.startsWith('XAU') || sym.startsWith('XAG') || sym.startsWith('XPT') || sym.startsWith('XPD')) return 2
  if (sym.includes('JPY') || sym.includes('KRW') || sym.includes('NGN') || sym.includes('TRY') || sym.includes('INR') || sym.includes('MXN') || sym.includes('HUF') || sym.includes('CLP') || sym.includes('IDR') || sym.includes('VND') || sym === 'DX-Y.NYB') return 2
  return 4
}

export default function CurrencyPairsScreen() {
  const { data } = useMarket()
  const { price } = useFormat()
  const [group, setGroup] = useState<Group>('All')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'pair' | 'chgPct'>('pair')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let items = PAIRS.filter((p) => matches(p, group))
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((p) => p.pair.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.sym.toLowerCase().includes(q) || p.base.toLowerCase().includes(q) || p.quote.toLowerCase().includes(q))
    }
    items = [...items]
    if (sort === 'chgPct') items.sort((a, b) => Math.abs(data[b.sym]?.regularMarketChangePercent ?? 0) - Math.abs(data[a.sym]?.regularMarketChangePercent ?? 0))
    else items.sort((a, b) => a.pair.localeCompare(b.pair))
    return items
  }, [group, search, sort, data])

  const loaded = PAIRS.filter((p) => data[p.sym])
  const up = loaded.filter((p) => (data[p.sym]?.regularMarketChangePercent ?? 0) > 0).length
  const dn = loaded.filter((p) => (data[p.sym]?.regularMarketChangePercent ?? 0) < 0).length
  const ranked = [...loaded].sort((a, b) => (data[b.sym]?.regularMarketChangePercent ?? 0) - (data[a.sym]?.regularMarketChangePercent ?? 0))
  const top = ranked[0]
  const bot = ranked[ranked.length - 1]

  return (
    <div className="page">
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search pairs — EUR, JPY, gold…" />
        <Segmented
          value={group}
          onChange={(v) => setGroup(v as Group)}
          options={(['All', 'Majors', 'Minors', 'Exotics', 'Commodity', 'Metals', 'Index'] as const).map((g) => ({ label: g, value: g }))}
        />
        <Segmented
          tone="gain"
          value={sort}
          onChange={(v) => setSort(v as 'pair' | 'chgPct')}
          options={[{ label: 'Pair', value: 'pair' }, { label: '% Chg', value: 'chgPct' }]}
        />
      </div>

      {loaded.length > 0 && (
        <StatsStrip
          items={[
            { val: String(up), label: 'Stronger', color: 'var(--gain)' },
            { val: String(dn), label: 'Weaker', color: 'var(--loss)' },
            { val: String(loaded.length - up - dn), label: 'Flat', color: 'var(--amber)' },
            ...(top ? [{ val: top.pair, label: 'Top gainer', color: 'var(--gain)' }] : []),
            ...(bot && bot.sym !== top?.sym ? [{ val: bot.pair, label: 'Top loser', color: 'var(--loss)' }] : []),
          ]}
        />
      )}

      {group !== 'All' && GROUP_INFO[group] && (
        <div className="cat-banner">
          <div className="cat-banner-title">{GROUP_INFO[group].title} · {filtered.length} pair{filtered.length === 1 ? '' : 's'}</div>
          <div className="cat-banner-desc">{GROUP_INFO[group].desc}</div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="muted" style={{ padding: 20 }}>
          {search.trim()
            ? 'No match. This tab only lists pairs Yahoo Finance covers.'
            : 'No pairs match that filter.'}
        </div>
      )}

      <div className="asset-list">
        {filtered.map((p) => {
          const d = data[p.sym]
          const chg = d?.regularMarketChangePercent ?? 0
          const dir = chgDir(chg)
          const col = dir === 'up' ? 'var(--gain)' : dir === 'dn' ? 'var(--loss)' : 'var(--t2)'
          const dec = decimals(p.sym)
          const open = expanded === p.sym
          return (
            <div key={p.sym}>
              <div className="asset fx" style={{ borderLeft: `3px solid ${col}`, cursor: 'pointer' }} onClick={() => setExpanded(open ? null : p.sym)}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="sym">{p.pair}</span>
                    <span className="tag" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>{p.group}</span>
                  </div>
                  <div className="muted">{p.desc}</div>
                  {d && <DayRangeBar low={d.regularMarketDayLow} high={d.regularMarketDayHigh} current={d.regularMarketPrice} color={col} />}
                </div>
                <div className="spark">
                  <SparklineChart symbol={p.sym} range="7d" width={80} height={28} color={col} />
                </div>
                <div className="right">
                  <div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{d ? price(d.regularMarketPrice, dec) : '—'}</div>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: col, marginTop: 2 }}>{d ? fmtChg(chg) : '—'}</div>
                  <AsOf at={d?.updatedAt} />
                </div>
              </div>
              {open && d && (
                <div className="expand" style={{ borderLeftColor: col }}>
                  <SparklineChart symbol={p.sym} range="7d" width={420} height={72} showLabels color={col} />
                  <div className="stat-grid">
                    {d.regularMarketDayHigh != null && <div><div className="stat-lab">Day high</div><div className="stat-val" style={{ color: 'var(--gain)' }}>{price(d.regularMarketDayHigh, dec)}</div></div>}
                    {d.regularMarketDayLow != null && <div><div className="stat-lab">Day low</div><div className="stat-val" style={{ color: 'var(--loss)' }}>{price(d.regularMarketDayLow, dec)}</div></div>}
                    {d.regularMarketOpen != null && <div><div className="stat-lab">Open</div><div className="stat-val">{price(d.regularMarketOpen, dec)}</div></div>}
                    {d.regularMarketPreviousClose != null && <div><div className="stat-lab">Prev close</div><div className="stat-val">{price(d.regularMarketPreviousClose, dec)}</div></div>}
                    {d.fiftyTwoWeekHigh != null && <div><div className="stat-lab">52w high</div><div className="stat-val">{price(d.fiftyTwoWeekHigh, dec)}</div></div>}
                    {d.fiftyTwoWeekLow != null && <div><div className="stat-lab">52w low</div><div className="stat-val">{price(d.fiftyTwoWeekLow, dec)}</div></div>}
                    {d.updatedAt != null && <div><div className="stat-lab">Last print</div><div className="stat-val"><AsOf at={d.updatedAt} variant="plain" /></div></div>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
