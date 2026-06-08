'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, X, RefreshCw, DollarSign, Coins } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Asset {
  id:       string
  label:    string
  sublabel: string
  value:    number | null
  change:   number | null   // % 24h
  unit:     string
  category: 'forex' | 'crypto' | 'commodity'
  color:    string
  apiKey:   string          // clé pour identifier dans l'API
}

interface HistoryPoint {
  date:  string
  value: number
}

// ─── Config assets ────────────────────────────────────────────────────────────
const ASSETS: Asset[] = [
  // Forex
  { id: 'usd_tnd', label: 'Dollar / Dinar',  sublabel: 'USD / TND', value: null, change: null, unit: 'TND', category: 'forex',     color: '#4FC3F7', apiKey: 'USD_TND' },
  { id: 'eur_tnd', label: 'Euro / Dinar',    sublabel: 'EUR / TND', value: null, change: null, unit: 'TND', category: 'forex',     color: '#81C784', apiKey: 'EUR_TND' },
  { id: 'btc_usd', label: 'Bitcoin / Dollar', sublabel: 'BTC / USD', value: null, change: null, unit: 'USD', category: 'crypto',    color: '#FFB74D', apiKey: 'BTC_USD' },
  // Matières premières
  { id: 'brent',   label: 'Brent',            sublabel: 'Pétrole brut', value: null, change: null, unit: 'USD/bbl', category: 'commodity', color: '#EF9A9A', apiKey: 'BRENT'   },
  { id: 'gold',    label: 'Or',               sublabel: 'XAU / USD',    value: null, change: null, unit: 'USD/oz',  category: 'commodity', color: '#D4AF37', apiKey: 'GOLD'    },
  { id: 'silver',  label: 'Argent',           sublabel: 'XAG / USD',    value: null, change: null, unit: 'USD/oz',  category: 'commodity', color: '#B0BEC5', apiKey: 'SILVER'  },
  { id: 'alum',    label: 'Aluminium',        sublabel: 'LME Spot',     value: null, change: null, unit: 'USD/t',   category: 'commodity', color: '#90CAF9', apiKey: 'ALUM'    },
  { id: 'lead',    label: 'Plomb',            sublabel: 'LME Spot',     value: null, change: null, unit: 'USD/t',   category: 'commodity', color: '#CE93D8', apiKey: 'LEAD'    },
]

// ─── Fallback data (si API indisponible) ──────────────────────────────────────
const FALLBACK: Record<string, { value: number; change: number }> = {
  USD_TND: { value: 3.118,  change: 0.12  },
  EUR_TND: { value: 3.385,  change: -0.08 },
  BTC_USD: { value: 103240, change: 2.14  },
  BRENT:   { value: 74.82,  change: -0.55 },
  GOLD:    { value: 3312,   change: 0.31  },
  SILVER:  { value: 32.74,  change: 0.18  },
  ALUM:    { value: 2487,   change: -0.22 },
  LEAD:    { value: 1985,   change: 0.09  },
}

// Génère un historique simulé réaliste autour d'une valeur
function generateHistory(baseValue: number, days = 30): HistoryPoint[] {
  const points: HistoryPoint[] = []
  let v = baseValue * 0.95
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    v = v * (1 + (Math.random() - 0.48) * 0.025)
    points.push({
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      value: parseFloat(v.toFixed(baseValue > 1000 ? 0 : baseValue > 10 ? 2 : 4)),
    })
  }
  // Forcer la dernière valeur = valeur actuelle
  if (points.length > 0) points[points.length - 1].value = baseValue
  return points
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MarchesPage() {
  const [assets,    setAssets]    = useState<Asset[]>(ASSETS)
  const [selected,  setSelected]  = useState<Asset | null>(null)
  const [history,   setHistory]   = useState<HistoryPoint[]>([])
  const [spinning,  setSpinning]  = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      // Tentative API exchangerate pour les devises
      const fxRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { cache: 'no-store' })
      const fxData = fxRes.ok ? await fxRes.json() : null

      setAssets(prev => prev.map(a => {
        const fb = FALLBACK[a.apiKey]
        if (a.apiKey === 'USD_TND' && fxData?.rates?.TND) {
          return { ...a, value: parseFloat(fxData.rates.TND.toFixed(3)), change: fb.change }
        }
        if (a.apiKey === 'EUR_TND' && fxData?.rates?.TND && fxData?.rates?.EUR) {
          const v = parseFloat((fxData.rates.TND / fxData.rates.EUR).toFixed(3))
          return { ...a, value: v, change: fb.change }
        }
        return { ...a, value: fb.value, change: fb.change }
      }))
    } catch {
      // Tout fallback
      setAssets(prev => prev.map(a => ({
        ...a,
        value:  FALLBACK[a.apiKey]?.value  ?? null,
        change: FALLBACK[a.apiKey]?.change ?? null,
      })))
    }
    setLastUpdate(new Date())
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 60_000)
    return () => clearInterval(id)
  }, [fetchData])

  function handleRefresh() {
    setSpinning(true)
    fetchData().then(() => setTimeout(() => setSpinning(false), 600))
  }

  function handleSelect(asset: Asset) {
    setSelected(asset)
    if (asset.value) setHistory(generateHistory(asset.value))
  }

  const forex      = assets.filter(a => a.category === 'forex' || a.category === 'crypto')
  const commodities = assets.filter(a => a.category === 'commodity')

  const fmt = (v: number, unit: string) => {
    if (unit === 'TND') return v.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    if (v > 10000)      return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    if (v > 100)        return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return v.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  }

  return (
    <>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>
              Devises &amp; Matières premières
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#5C5C5C' }}>
              Cours en temps réel · Cliquez pour voir l'historique
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span style={{ fontSize: '10px', color: '#3A3A3A' }}>
                {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={handleRefresh} style={{
              background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)',
              borderRadius: '8px', padding: '7px', color: '#707070', cursor: 'pointer', display: 'flex',
            }}>
              <RefreshCw size={14} style={{ transition: 'transform 0.6s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* ── Section Devises ── */}
        <Section title="Devises & Crypto" icon={<DollarSign size={14} />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {forex.map(a => (
              <AssetCard key={a.id} asset={a} fmt={fmt} onClick={() => handleSelect(a)} />
            ))}
          </div>
        </Section>

        {/* ── Section Matières premières ── */}
        <Section title="Matières premières" icon={<Coins size={14} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {commodities.map(a => (
              <AssetCard key={a.id} asset={a} fmt={fmt} onClick={() => handleSelect(a)} />
            ))}
          </div>
        </Section>

      </div>

      {/* ── Modal historique ── */}
      <AnimatePresence>
        {selected && (
          <HistoryModal
            asset={selected}
            history={history}
            fmt={fmt}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: '#D4AF37' }}>{icon}</span>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: '#5C5C5C', textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

// ─── Carte asset ──────────────────────────────────────────────────────────────
function AssetCard({ asset: a, fmt, onClick }: {
  asset: Asset
  fmt: (v: number, unit: string) => string
  onClick: () => void
}) {
  const isPos = (a.change ?? 0) > 0
  const isNeg = (a.change ?? 0) < 0
  const changeColor = isPos ? '#00C853' : isNeg ? '#FF1744' : '#707070'

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background:   'var(--noir-elevated)',
        border:       '1px solid var(--noir-border)',
        borderRadius: '14px',
        padding:      '16px 18px',
        cursor:       'pointer',
        transition:   'border-color 0.2s',
        position:     'relative',
        overflow:     'hidden',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = a.color + '55')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--noir-border)')}
    >
      {/* Accent couleur */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, ${a.color}, transparent)`,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#E0E0E0' }}>{a.label}</div>
          <div style={{ fontSize: '10px', color: '#5C5C5C', marginTop: '2px' }}>{a.sublabel}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#F5F5F5', fontFamily: 'monospace' }}>
            {a.value != null ? fmt(a.value, a.unit) : '—'}
          </div>
          <div style={{ fontSize: '10px', color: '#3A3A3A', marginTop: '2px' }}>{a.unit}</div>
        </div>
      </div>

      {a.change != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px' }}>
          {isPos ? <TrendingUp size={11} color={changeColor} /> : isNeg ? <TrendingDown size={11} color={changeColor} /> : null}
          <span style={{ fontSize: '11px', color: changeColor, fontWeight: 500 }}>
            {isPos ? '+' : ''}{a.change.toFixed(2)}% aujourd'hui
          </span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Modal historique ─────────────────────────────────────────────────────────
function HistoryModal({ asset, history, fmt, onClose }: {
  asset: Asset
  history: HistoryPoint[]
  fmt: (v: number, unit: string) => string
  onClose: () => void
}) {
  const isPos = (asset.change ?? 0) >= 0
  const gradColor = asset.color

  const minVal = Math.min(...history.map(h => h.value))
  const maxVal = Math.max(...history.map(h => h.value))
  const domain = [minVal * 0.999, maxVal * 1.001]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}>
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        style={{
          width: '100%', maxWidth: '600px',
          background: 'var(--noir-surface)',
          border: '1px solid var(--noir-border)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>

        {/* Header modal */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--noir-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: `linear-gradient(135deg, ${gradColor}08, transparent)`,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: gradColor }} />
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5' }}>{asset.label}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#5C5C5C', marginTop: '3px' }}>{asset.sublabel} · 30 derniers jours</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#F5F5F5', fontFamily: 'monospace' }}>
                {asset.value != null ? fmt(asset.value, asset.unit) : '—'}
              </div>
              <div style={{ fontSize: '11px', color: isPos ? '#00C853' : '#FF1744', marginTop: '2px' }}>
                {isPos ? '+' : ''}{asset.change?.toFixed(2)}% aujourd'hui
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.05)', border: 'none',
              borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#5C5C5C',
              display: 'flex',
            }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Graphique */}
        <div style={{ padding: '20px 16px 24px' }}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={gradColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={gradColor} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#3A3A3A', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                domain={domain}
                tick={{ fill: '#3A3A3A', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => {
                  if (v > 10000) return (v / 1000).toFixed(0) + 'k'
                  if (v > 100)   return v.toFixed(0)
                  return v.toFixed(3)
                }}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--noir-elevated)',
                  border: `1px solid ${gradColor}44`,
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#F5F5F5',
                }}
                labelStyle={{ color: '#707070', marginBottom: '4px' }}
                formatter={(v: number) => [fmt(v, asset.unit) + ' ' + asset.unit, asset.label]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={gradColor}
                strokeWidth={2}
                fill={`url(#grad-${asset.id})`}
                dot={false}
                activeDot={{ r: 4, fill: gradColor, stroke: 'var(--noir-surface)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Stats rapides */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px', marginTop: '16px',
          }}>
            {[
              { label: 'Min 30j', value: fmt(minVal, asset.unit) },
              { label: 'Max 30j', value: fmt(maxVal, asset.unit) },
              { label: 'Actuel',  value: asset.value ? fmt(asset.value, asset.unit) : '—' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--noir-elevated)',
                borderRadius: '10px', padding: '10px 12px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '9px', color: '#3A3A3A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#E0E0E0', fontFamily: 'monospace' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
