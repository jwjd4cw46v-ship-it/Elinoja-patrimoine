'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, Database, Wifi, WifiOff } from 'lucide-react'

const API_URL = '/api/cotations'

interface Market {
  isin:      string
  last:      number
  change:    number
  high:      number
  low:       number
  plus_haut: number   // Plus haut cumulé de la séance
  plus_bas:  number   // Plus bas cumulé de la séance
  open:      number
  volume:    number
  caps:      number
  updated_at?: string
  referentiel: {
    stockName: string
    ticker:    string
    valGroup:  string
  }
}

interface ApiResponse {
  source:       'api' | 'cache' | 'base' | 'fallback_base'
  bvmt_ouverte?: boolean
  cached_il_y_a?: string
  count:        number
  markets:      Market[]
}

function formatNum(n: number | null | undefined) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

function formatVol(n: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return n.toLocaleString()
}

function SourceBadge({ source, bvmtOuverte }: { source: string; bvmtOuverte?: boolean }) {
  const configs: Record<string, { label: string; color: string; bg: string; border: string; Icon: any }> = {
    api:           { label: 'Temps réel',    color: '#00C853', bg: 'rgba(0,200,83,0.08)',    border: 'rgba(0,200,83,0.2)',    Icon: Wifi },
    cache:         { label: 'Cache < 1 min', color: '#D4AF37', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.2)', Icon: Wifi },
    base:          { label: 'Marché fermé',  color: '#707070', bg: 'rgba(112,112,112,0.08)', border: 'rgba(112,112,112,0.2)', Icon: Database },
    fallback_base: { label: 'Hors ligne',    color: '#FF6B35', bg: 'rgba(255,107,53,0.08)', border: 'rgba(255,107,53,0.2)', Icon: WifiOff },
  }
  const c = configs[source] || configs.base
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      <c.Icon size={12} />
      {c.label}
    </div>
  )
}

export default function CotationsPage() {
  const [data, setData]             = useState<Market[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<'all' | 'up' | 'down'>('all')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sortKey, setSortKey]       = useState<string>('ticker')
  const [sortDir, setSortDir]       = useState<1 | -1>(1)
  const [apiMeta, setApiMeta]       = useState<{ source: string; bvmt_ouverte?: boolean } | null>(null)

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res  = await fetch(API_URL, { cache: 'no-store' })
      const json: ApiResponse = await res.json()
      setData(json.markets || [])
      setApiMeta({ source: json.source, bvmt_ouverte: json.bvmt_ouverte })
      setLastUpdate(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(), 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => (d === 1 ? -1 : 1))
    else { setSortKey(key); setSortDir(1) }
  }

  const hausse = data.filter(m => m.change > 0).length
  const baisse = data.filter(m => m.change < 0).length
  const stable = data.filter(m => m.change === 0).length

  const filtered = data
    .filter(m => {
      const q = search.toLowerCase()
      const matchSearch =
        (m.referentiel?.stockName || '').toLowerCase().includes(q) ||
        (m.referentiel?.ticker    || '').toLowerCase().includes(q)
      const matchFilter =
        filter === 'all' ||
        (filter === 'up'   && m.change > 0) ||
        (filter === 'down' && m.change < 0)
      return matchSearch && matchFilter
    })
    .sort((a, b) => {
      let va: any, vb: any
      if      (sortKey === 'ticker')    { va = a.referentiel?.ticker    || ''; vb = b.referentiel?.ticker    || '' }
      else if (sortKey === 'last')      { va = a.last      || 0;  vb = b.last      || 0 }
      else if (sortKey === 'change')    { va = a.change    || 0;  vb = b.change    || 0 }
      else if (sortKey === 'volume')    { va = a.volume    || 0;  vb = b.volume    || 0 }
      else if (sortKey === 'high')      { va = a.high      || 0;  vb = b.high      || 0 }
      else if (sortKey === 'low')       { va = a.low       || 0;  vb = b.low       || 0 }
      else if (sortKey === 'plus_haut') { va = a.plus_haut || 0;  vb = b.plus_haut || 0 }
      else if (sortKey === 'plus_bas')  { va = a.plus_bas  || 0;  vb = b.plus_bas  || 0 }
      else { va = a.referentiel?.stockName || ''; vb = b.referentiel?.stockName || '' }
      if (va < vb) return -1 * sortDir
      if (va > vb) return  1 * sortDir
      return 0
    })

  const SortIcon = ({ k }: { k: string }) => (
    <span style={{ opacity: sortKey === k ? 1 : 0.3, marginLeft: 4, fontSize: 10 }}>
      {sortKey === k ? (sortDir === 1 ? '↑' : '↓') : '↕'}
    </span>
  )

  const ThBtn = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      onClick={() => handleSort(col)}
      className="text-xs font-semibold tracking-wider cursor-pointer select-none"
      style={{
        padding:     '10px 14px',
        textAlign:   right ? 'right' : 'left',
        color:       sortKey === col ? '#D4AF37' : '#4A4A4A',
        borderBottom: '1px solid var(--noir-border)',
        whiteSpace:  'nowrap',
        userSelect:  'none',
      }}>
      {label}<SortIcon k={col} />
    </th>
  )

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Cotations</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            Bourse de Tunis — {lastUpdate
              ? `Mis à jour à ${lastUpdate.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}`
              : 'Chargement...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apiMeta && <SourceBadge source={apiMeta.source} bvmtOuverte={apiMeta.bvmt_ouverte} />}
          <button
            onClick={() => fetchData(true)}
            className="p-2 rounded-lg transition-all"
            style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)', color: '#707070' }}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Hausses', val: hausse, color: '#00C853', bg: 'rgba(0,200,83,0.08)',    border: 'rgba(0,200,83,0.15)',    icon: TrendingUp },
          { label: 'Baisses', val: baisse, color: '#FF1744', bg: 'rgba(255,23,68,0.08)',   border: 'rgba(255,23,68,0.15)',   icon: TrendingDown },
          { label: 'Stables', val: stable, color: '#707070', bg: 'var(--noir-elevated)',   border: 'var(--noir-border)',     icon: Minus },
        ].map(s => (
          <div key={s.label} className="card-premium p-4 flex items-center gap-3"
            style={{ background: s.bg, borderColor: s.border }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${s.color}18` }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{loading ? '—' : s.val}</div>
              <div className="text-xs" style={{ color: '#4A4A4A' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5C5C5C' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ticker, société..."
            className="input-premium pl-9 w-52"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all',  label: 'Tous' },
            { key: 'up',   label: '▲ Hausse' },
            { key: 'down', label: '▼ Baisse' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filter === f.key
                  ? f.key === 'up' ? 'rgba(0,200,83,0.1)' : f.key === 'down' ? 'rgba(255,23,68,0.08)' : 'rgba(212,175,55,0.1)'
                  : 'var(--noir-elevated)',
                color: filter === f.key
                  ? f.key === 'up' ? '#00C853' : f.key === 'down' ? '#FF1744' : '#D4AF37'
                  : '#707070',
                border: `1px solid ${filter === f.key
                  ? f.key === 'up' ? 'rgba(0,200,83,0.3)' : f.key === 'down' ? 'rgba(255,23,68,0.3)' : 'rgba(212,175,55,0.3)'
                  : 'var(--noir-border)'}`,
              }}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs ml-auto" style={{ color: '#4A4A4A' }}>
          {filtered.length} valeur{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden" style={{ padding: 0 }}>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="skeleton w-12 h-8 rounded" />
                <div className="skeleton flex-1 h-8 rounded" />
                <div className="skeleton w-20 h-8 rounded" />
                <div className="skeleton w-16 h-8 rounded" />
                <div className="skeleton w-16 h-8 rounded" />
                <div className="skeleton w-16 h-8 rounded" />
                <div className="skeleton w-16 h-8 rounded" />
                <div className="skeleton w-16 h-8 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
            <p style={{ color: '#5C5C5C' }}>Aucune valeur trouvée</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: 'var(--noir-elevated)' }}>
                <tr>
                  <ThBtn col="ticker"    label="TICKER" />
                  <ThBtn col="name"      label="SOCIÉTÉ" />
                  <ThBtn col="last"      label="COURS"     right />
                  <ThBtn col="change"    label="VARIATION" right />
                  <ThBtn col="high"      label="HAUT"      right />
                  <ThBtn col="low"       label="BAS"       right />
                  <ThBtn col="plus_haut" label="+ HAUT"    right />
                  <ThBtn col="plus_bas"  label="+ BAS"     right />
                  <ThBtn col="volume"    label="VOLUME"    right />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const isUp  = m.change > 0
                  const isDn  = m.change < 0
                  const color = isUp ? '#00C853' : isDn ? '#FF1744' : '#707070'
                  const chgBg     = isUp ? 'rgba(0,200,83,0.08)'    : isDn ? 'rgba(255,23,68,0.08)'   : 'rgba(112,112,112,0.08)'
                  const chgBorder = isUp ? 'rgba(0,200,83,0.2)'     : isDn ? 'rgba(255,23,68,0.2)'    : 'rgba(112,112,112,0.2)'

                  return (
                    <motion.tr key={m.isin}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.015 }}
                      style={{ borderBottom: '1px solid var(--noir-border)' }}
                      className="group transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      {/* Ticker */}
                      <td style={{ padding: '12px 14px' }}>
                        <div className="w-14 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono"
                          style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.15)' }}>
                          {(m.referentiel?.ticker || '').slice(0, 6)}
                        </div>
                      </td>

                      {/* Nom */}
                      <td style={{ padding: '12px 14px', color: '#A0A0A0', maxWidth: 180 }}>
                        <span style={{ fontSize: 12 }}>{m.referentiel?.stockName || '—'}</span>
                      </td>

                      {/* Cours */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span className="font-mono font-semibold" style={{ color: '#F5F5F5' }}>
                          {formatNum(m.last)}
                        </span>
                      </td>

                      {/* Variation */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono"
                          style={{ background: chgBg, color, border: `1px solid ${chgBorder}` }}>
                          {isUp ? '▲' : isDn ? '▼' : '—'}
                          {isUp ? '+' : ''}{m.change?.toFixed(2)}%
                        </span>
                      </td>

                      {/* Haut du tick */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#00C853', fontFamily: 'monospace', fontSize: 12 }}>
                        {formatNum(m.high)}
                      </td>

                      {/* Bas du tick */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#FF1744', fontFamily: 'monospace', fontSize: 12 }}>
                        {formatNum(m.low)}
                      </td>

                      {/* Plus haut de la séance */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span className="font-mono text-xs px-2 py-0.5 rounded"
                          style={{ background: 'rgba(0,200,83,0.06)', color: '#00C853', border: '1px solid rgba(0,200,83,0.15)' }}>
                          {formatNum(m.plus_haut)}
                        </span>
                      </td>

                      {/* Plus bas de la séance */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span className="font-mono text-xs px-2 py-0.5 rounded"
                          style={{ background: 'rgba(255,23,68,0.06)', color: '#FF1744', border: '1px solid rgba(255,23,68,0.15)' }}>
                          {formatNum(m.plus_bas)}
                        </span>
                      </td>

                      {/* Volume */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#4A4A4A', fontFamily: 'monospace', fontSize: 12 }}>
                        {formatVol(m.volume)}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-center" style={{ color: '#3A3A3A' }}>
        Source : Bourse de Tunis (BVMT) · Séance 9h–14h15 · Cache 1 min
      </p>
    </div>
  )
}
