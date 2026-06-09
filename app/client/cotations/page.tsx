'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, X, BarChart2 } from 'lucide-react'

const API_URL = '/api/cotations'

interface Market {
  isin: string
  last: number
  change: number
  high: number
  low: number
  open: number
  volume: number
  caps: number
  seance: string
  referentiel: {
    stockName: string
    ticker: string
    valGroup: string
  }
}

function formatNum(n: number | null) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

function formatVol(n: number) {
  if (!n) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toLocaleString()
}

// ─── TradingView Chart Modal ──────────────────────────────────────────────────
function ChartModal({ market, onClose }: { market: Market; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isUp = market.change > 0
  const isDn = market.change < 0
  const color = isUp ? '#00C853' : isDn ? '#FF1744' : '#707070'

  // On utilise le ticker pour chercher sur TradingView
  // La BVMT n'étant pas listée nativement, on ouvre le search TradingView
  // avec le nom complet pour trouver le meilleur match disponible
  const tvSymbol = `BVMT:${market.referentiel?.ticker || market.isin}`

  useEffect(() => {
    if (!containerRef.current) return

    const containerId = `tv-chart-${market.isin}`
    containerRef.current.id = containerId

    const load = () => {
      if (!containerRef.current) return
      try {
        // @ts-ignore
        new (window as any).TradingView.widget({
          container_id:     containerId,
          symbol:           tvSymbol,
          interval:         'D',
          theme:            'dark',
          style:            '1',
          locale:           'fr',
          toolbar_bg:       '#111111',
          hide_top_toolbar: false,
          hide_legend:      false,
          save_image:       false,
          allow_symbol_change: true, // permet de chercher manuellement si BVMT non dispo
          width:            '100%',
          height:           320,
          backgroundColor:  '#111111',
          gridColor:        'rgba(255,255,255,0.04)',
        })
      } catch (e) {
        console.error('TradingView widget error', e)
      }
    }

    const scriptId = 'tradingview-widget-script'
    if (document.getElementById(scriptId)) {
      // @ts-ignore
      if ((window as any).TradingView) load()
      else document.getElementById(scriptId)!.addEventListener('load', load)
    } else {
      const script    = document.createElement('script')
      script.id       = scriptId
      script.src      = 'https://s3.tradingview.com/tv.js'
      script.async    = true
      script.onload   = load
      document.head.appendChild(script)
    }
  }, [market.isin])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}>
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        style={{
          width: '100%', maxWidth: '680px',
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', overflow: 'hidden',
        }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: `linear-gradient(135deg, ${color}08, transparent)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: '8px', padding: '4px 10px',
              fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: '#D4AF37',
            }}>
              {market.referentiel?.ticker}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>
                {market.referentiel?.stockName}
              </div>
              <div style={{ fontSize: '11px', color: '#5C5C5C', marginTop: '2px' }}>
                ISIN : {market.isin}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#F5F5F5', fontFamily: 'monospace' }}>
                {formatNum(market.last)}
              </div>
              <div style={{ fontSize: '11px', color, marginTop: '2px', fontWeight: 600 }}>
                {isUp ? '▲ +' : isDn ? '▼ ' : ''}{market.change?.toFixed(2)}%
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.05)', border: 'none',
              borderRadius: '8px', padding: '6px', cursor: 'pointer',
              color: '#5C5C5C', display: 'flex',
            }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Widget TradingView */}
        <div style={{ padding: '12px 12px 0' }}>
          <div ref={containerRef} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '10px', color: '#3A3A3A' }}>
            Symbole recherché : <span style={{ fontFamily: 'monospace', color: '#5C5C5C' }}>{tvSymbol}</span>
            <span style={{ color: '#2A2A2A' }}> · Si non trouvé, utilisez la barre de recherche du graphique</span>
          </span>
          <span style={{ fontSize: '10px', color: '#2A2A2A' }}>Powered by TradingView</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CotationsPage() {
  const [data, setData]             = useState<Market[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<'all' | 'up' | 'down'>('all')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sortKey, setSortKey]       = useState<string>('ticker')
  const [sortDir, setSortDir]       = useState<1 | -1>(1)
  const [chartMarket, setChartMarket] = useState<Market | null>(null)

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await fetch(API_URL, { cache: 'no-store' })
      const json = await res.json()
      setData(json.markets || [])
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
    const interval = setInterval(() => fetchData(), 60000)
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
        (m.referentiel?.ticker || '').toLowerCase().includes(q)
      const matchFilter =
        filter === 'all' ||
        (filter === 'up' && m.change > 0) ||
        (filter === 'down' && m.change < 0)
      return matchSearch && matchFilter
    })
    .sort((a, b) => {
      let va: any, vb: any
      if (sortKey === 'ticker')      { va = a.referentiel?.ticker || '';      vb = b.referentiel?.ticker || '' }
      else if (sortKey === 'last')   { va = a.last || 0;   vb = b.last || 0 }
      else if (sortKey === 'change') { va = a.change || 0; vb = b.change || 0 }
      else if (sortKey === 'volume') { va = a.volume || 0; vb = b.volume || 0 }
      else if (sortKey === 'high')   { va = a.high || 0;   vb = b.high || 0 }
      else if (sortKey === 'low')    { va = a.low || 0;    vb = b.low || 0 }
      else { va = a.referentiel?.stockName || ''; vb = b.referentiel?.stockName || '' }
      if (va < vb) return -1 * sortDir
      if (va > vb) return 1 * sortDir
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
        padding: '10px 14px',
        textAlign: right ? 'right' : 'left',
        color: sortKey === col ? '#D4AF37' : '#4A4A4A',
        borderBottom: '1px solid var(--noir-border)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(212,175,55,0.08)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
            Retardé 15 min
          </div>
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
          { label: 'Hausses', val: hausse, color: '#00C853', bg: 'rgba(0,200,83,0.08)',   border: 'rgba(0,200,83,0.15)',   icon: TrendingUp },
          { label: 'Baisses', val: baisse, color: '#FF1744', bg: 'rgba(255,23,68,0.08)',  border: 'rgba(255,23,68,0.15)',  icon: TrendingDown },
          { label: 'Stables', val: stable, color: '#707070', bg: 'var(--noir-elevated)',  border: 'var(--noir-border)',    icon: Minus },
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
                <div className="skeleton w-8 h-8 rounded" />
                <div className="skeleton w-12 h-8 rounded" />
                <div className="skeleton flex-1 h-8 rounded" />
                <div className="skeleton w-20 h-8 rounded" />
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
                  {/* Colonne icône graphique — non triable */}
                  <th style={{ width: 40, padding: '10px 8px 10px 14px', borderBottom: '1px solid var(--noir-border)' }} />
                  <ThBtn col="ticker" label="TICKER" />
                  <ThBtn col="name"   label="SOCIÉTÉ" />
                  <ThBtn col="last"   label="COURS"    right />
                  <ThBtn col="change" label="VARIATION" right />
                  <ThBtn col="high"   label="HAUT"      right />
                  <ThBtn col="low"    label="BAS"       right />
                  <ThBtn col="volume" label="VOLUME"    right />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const isUp  = m.change > 0
                  const isDn  = m.change < 0
                  const color = isUp ? '#00C853' : isDn ? '#FF1744' : '#707070'
                  const chgBg = isUp ? 'rgba(0,200,83,0.08)' : isDn ? 'rgba(255,23,68,0.08)' : 'rgba(112,112,112,0.08)'
                  const chgBorder = isUp ? 'rgba(0,200,83,0.2)' : isDn ? 'rgba(255,23,68,0.2)' : 'rgba(112,112,112,0.2)'

                  return (
                    <motion.tr key={m.isin}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      style={{ borderBottom: '1px solid var(--noir-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      {/* Icône graphique */}
                      <td style={{ padding: '12px 4px 12px 14px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setChartMarket(m) }}
                          title="Voir le graphique"
                          style={{
                            background: 'rgba(212,175,55,0.06)',
                            border: '1px solid rgba(212,175,55,0.12)',
                            borderRadius: '6px',
                            width: 28, height: 28,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#5C5C5C',
                            transition: 'all 0.15s',
                            flexShrink: 0,
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(212,175,55,0.15)'
                            e.currentTarget.style.color = '#D4AF37'
                            e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(212,175,55,0.06)'
                            e.currentTarget.style.color = '#5C5C5C'
                            e.currentTarget.style.borderColor = 'rgba(212,175,55,0.12)'
                          }}>
                          <BarChart2 size={12} />
                        </button>
                      </td>

                      {/* Ticker */}
                      <td style={{ padding: '12px 14px 12px 6px' }}>
                        <div className="w-14 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono"
                          style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.15)' }}>
                          {(m.referentiel?.ticker || '').slice(0, 6)}
                        </div>
                      </td>

                      {/* Nom */}
                      <td style={{ padding: '12px 14px', color: '#A0A0A0', maxWidth: 200 }}>
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

                      {/* Haut */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#00C853', fontFamily: 'monospace', fontSize: 12 }}>
                        {formatNum(m.high)}
                      </td>

                      {/* Bas */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#FF1744', fontFamily: 'monospace', fontSize: 12 }}>
                        {formatNum(m.low)}
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
        Source : Bourse de Tunis (BVMT) — Flux retardé de 15 minutes
      </p>

      {/* Modal graphique TradingView */}
      <AnimatePresence>
        {chartMarket && (
          <ChartModal market={chartMarket} onClose={() => setChartMarket(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
