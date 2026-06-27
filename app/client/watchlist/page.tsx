'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Plus, Trash2, Bell, X, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface WatchItem {
  id:               string
  ticker:           string
  company_name:     string
  market:           string
  alert_price_low:  number | null
  alert_price_high: number | null
  notes:            string | null
  current:  number
  change:   number
}

export default function WatchlistPage() {
  const [items,     setItems]     = useState<WatchItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [userId,    setUserId]    = useState<string | null>(null)
  const [spinning,  setSpinning]  = useState(false)
  const [lastUpdate,setLastUpdate]= useState<Date | null>(null)
  const triggered = useRef<Record<string, { low: boolean; high: boolean }>>({})
  const supabase = createClient()

  const fetchWatchlist = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: rows } = await supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!rows?.length) { setItems([]); setLoading(false); return }

    try {
      const res = await fetch('/api/cotations', { cache: 'no-store' })
      const data = res.ok ? await res.json() : {}
      const markets: any[] = data.markets ?? []

      const enriched: WatchItem[] = rows.map((row: any) => {
        const ticker = row.ticker?.toUpperCase()
        const market = markets.find(m => m.referentiel?.ticker?.toUpperCase() === ticker)
        return { ...row, current: market?.last ?? 0, change: market?.change ?? 0 }
      })

      setItems(enriched)
      setLastUpdate(new Date())
    } catch {
      setItems(rows.map((r: any) => ({ ...r, current: 0, change: 0 })))
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchWatchlist()
    const id = setInterval(fetchWatchlist, 60_000)
    return () => clearInterval(id)
  }, [fetchWatchlist])

  function handleRefresh() {
    setSpinning(true)
    fetchWatchlist().then(() => setTimeout(() => setSpinning(false), 600))
  }

  async function removeItem(id: string) {
    await supabase.from('watchlists').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Retiré de la watchlist')
  }

  // FIX : <= et >= pour compter les alertes actives
  const alertsCount = items.filter(i =>
    i.current > 0 && (
      (i.alert_price_low  && i.current <= i.alert_price_low) ||
      (i.alert_price_high && i.current >= i.alert_price_high)
    )
  ).length

  return (
    <>
      <style>{`
        @keyframes pulse-low {
          0%,100% { color:#FF3B3B; text-shadow:0 0 8px rgba(255,59,59,.6); opacity:1; }
          50%      { color:#FF6B6B; text-shadow:0 0 14px rgba(255,59,59,.9); opacity:.72; }
        }
        @keyframes pulse-high {
          0%,100% { color:#00E676; text-shadow:0 0 8px rgba(0,230,118,.6); opacity:1; }
          50%      { color:#69F0AE; text-shadow:0 0 14px rgba(0,230,118,.9); opacity:.72; }
        }
        @keyframes glow-low  { 0%,100%{box-shadow:0 0 0 0 rgba(255,59,59,0);} 50%{box-shadow:0 0 0 4px rgba(255,59,59,.1);} }
        @keyframes glow-high { 0%,100%{box-shadow:0 0 0 0 rgba(0,200,83,0);} 50%{box-shadow:0 0 0 4px rgba(0,200,83,.1);} }
        .alert-low  { animation: pulse-low  1.8s ease-in-out infinite; }
        .alert-high { animation: pulse-high 1.8s ease-in-out infinite; }
        .glow-low   { animation: glow-low   2s   ease-in-out infinite; }
        .glow-high  { animation: glow-high  2s   ease-in-out infinite; }
      `}</style>

      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Ma Watchlist</h1>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <p className="text-sm" style={{ color: '#707070' }}>
                {items.length} titre{items.length !== 1 ? 's' : ''} suivi{items.length !== 1 ? 's' : ''}
              </p>
              {alertsCount > 0 && (
                <span style={{
                  fontSize: '10px', fontWeight: 700,
                  color: '#FF3B3B', background: 'rgba(255,59,59,0.1)',
                  padding: '2px 7px', borderRadius: '5px',
                  border: '1px solid rgba(255,59,59,0.25)',
                }}>
                  {alertsCount} alerte{alertsCount > 1 ? 's' : ''} active{alertsCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          {/* FIX : flex-shrink-0 + gap réduit pour éviter chevauchement avec le ticker du header */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => setShowAdd(true)}
              className="btn-gold flex items-center gap-2">
              <Plus size={15} /> Ajouter un titre
            </motion.button>
          </div>
        </div>

        {/* ── Contenu ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-premium p-5 space-y-3">
                <div className="flex gap-3">
                  <div className="skeleton w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-2"><div className="skeleton h-4 w-20" /><div className="skeleton h-3 w-28" /></div>
                </div>
                <div className="skeleton h-16 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 card-premium">
            <Star size={48} className="mx-auto mb-4 opacity-20" style={{ color: '#D4AF37' }} />
            <h3 className="text-base font-medium mb-2" style={{ color: '#F5F5F5' }}>Watchlist vide</h3>
            <p className="text-sm mb-6" style={{ color: '#5C5C5C' }}>Ajoutez des titres pour suivre leur évolution</p>
            <button onClick={() => setShowAdd(true)} className="btn-gold">Ajouter mon premier titre</button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, i) => {
              // FIX : <= et >= au lieu de < et >
              const isBelowLow  = item.current > 0 && !!item.alert_price_low  && item.current <= item.alert_price_low
              const isAboveHigh = item.current > 0 && !!item.alert_price_high && item.current >= item.alert_price_high
              const hasAlerts   = !!(item.alert_price_low || item.alert_price_high)

              const low  = item.alert_price_low  ?? 0
              const high = item.alert_price_high ?? 0
              const pct  = high > low ? ((item.current - low) / (high - low)) * 100 : 50
              const pctC = Math.max(0, Math.min(100, pct))

              const fmt = (v: number) => v.toLocaleString('fr-TN', {
                minimumFractionDigits: v > 100 ? 2 : 3,
                maximumFractionDigits: v > 100 ? 2 : 3,
              })

              return (
                <motion.div key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`card-premium p-5 group ${isBelowLow ? 'glow-low' : isAboveHigh ? 'glow-high' : ''}`}
                  style={{
                    border: `1px solid ${
                      isBelowLow  ? 'rgba(255,59,59,0.3)' :
                      isAboveHigh ? 'rgba(0,200,83,0.25)' :
                      'var(--noir-border)'
                    }`,
                    transition: 'border-color 0.4s',
                  }}>

                  {/* Header carte */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                        {item.ticker.slice(0, 4)}
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: '#F5F5F5' }}>{item.ticker}</div>
                        <div className="text-xs" style={{ color: '#5C5C5C' }}>{item.market}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      {item.current > 0 ? (
                        <>
                          <div style={{
                            fontSize: '16px', fontWeight: 700, fontFamily: 'monospace',
                            color: isBelowLow ? '#FF3B3B' : isAboveHigh ? '#00C853' : '#F5F5F5',
                            transition: 'color 0.3s',
                          }}>
                            {fmt(item.current)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '2px' }}>
                            {item.change > 0 ? <TrendingUp size={10} color="#00C853" /> : item.change < 0 ? <TrendingDown size={10} color="#FF1744" /> : null}
                            <span style={{
                              fontSize: '10px', fontWeight: 500,
                              color: item.change > 0 ? '#00C853' : item.change < 0 ? '#FF1744' : '#5C5C5C',
                            }}>
                              {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#3A3A3A' }}>Hors séance</div>
                      )}
                    </div>
                  </div>

                  {/* Nom société */}
                  <div className="text-sm mb-3" style={{ color: '#C0C0C0' }}>{item.company_name}</div>

                  {/* Zone Bas | Actuel | Haut */}
                  {hasAlerts && (
                    <>
                      {low > 0 && high > 0 && item.current > 0 && (
                        <div style={{
                          background: 'var(--noir-border)', borderRadius: '3px',
                          height: '3px', marginBottom: '10px', overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', width: `${pctC}%`,
                            background: isBelowLow
                              ? 'linear-gradient(90deg,#FF3B3B,#FF6B6B)'
                              : isAboveHigh
                              ? 'linear-gradient(90deg,#00C853,#00E676)'
                              : 'linear-gradient(90deg,#2A5F8A,#3A8FD1)',
                            borderRadius: '3px',
                            transition: 'width 0.6s ease, background 0.4s',
                          }} />
                        </div>
                      )}

                      <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--noir-border)',
                        borderRadius: '10px', padding: '10px 12px',
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                        marginBottom: '10px',
                      }}>
                        {/* Bas */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '8px', color: '#3A3A3A', letterSpacing: '0.1em', marginBottom: '5px', textTransform: 'uppercase' }}>Bas</div>
                          <div className={isBelowLow ? 'alert-low' : ''} style={{
                            fontSize: '13px', fontWeight: 500, fontFamily: 'monospace',
                            color: isBelowLow ? undefined : item.alert_price_low ? '#5C5C5C' : '#2A2A2A',
                          }}>
                            {item.alert_price_low ? fmt(item.alert_price_low) : '—'}
                          </div>
                        </div>

                        {/* Actuel */}
                        <div style={{
                          textAlign: 'center',
                          borderLeft: '1px solid var(--noir-border)',
                          borderRight: '1px solid var(--noir-border)',
                        }}>
                          <div style={{ fontSize: '8px', color: '#3A3A3A', letterSpacing: '0.1em', marginBottom: '5px', textTransform: 'uppercase' }}>Actuel</div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'monospace' }}>
                            {item.current > 0 ? fmt(item.current) : '—'}
                          </div>
                        </div>

                        {/* Haut */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '8px', color: '#3A3A3A', letterSpacing: '0.1em', marginBottom: '5px', textTransform: 'uppercase' }}>Haut</div>
                          <div className={isAboveHigh ? 'alert-high' : ''} style={{
                            fontSize: '13px', fontWeight: 500, fontFamily: 'monospace',
                            color: isAboveHigh ? undefined : item.alert_price_high ? '#5C5C5C' : '#2A2A2A',
                          }}>
                            {item.alert_price_high ? fmt(item.alert_price_high) : '—'}
                          </div>
                        </div>
                      </div>

                      {(isBelowLow || isAboveHigh) && (
                        <div style={{
                          fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
                          color: isBelowLow ? '#FF3B3B' : '#00C853',
                          textAlign: 'center', marginBottom: '8px',
                          textTransform: 'uppercase',
                        }}>
                          {isBelowLow ? '▼ Seuil bas franchi' : '▲ Seuil haut franchi'}
                        </div>
                      )}
                    </>
                  )}

                  {item.notes && (
                    <p className="text-xs leading-relaxed" style={{ color: '#5C5C5C' }}>{item.notes}</p>
                  )}

                  <div className="flex justify-end mt-3">
                    <button onClick={() => removeItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                      style={{ color: '#FF1744', background: 'rgba(255,23,68,0.08)' }}>
                      <Trash2 size={11} /> Retirer
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && userId && (
          <AddWatchlistModal
            userId={userId}
            onClose={() => setShowAdd(false)}
            onAdded={fetchWatchlist}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function AddWatchlistModal({ userId, onClose, onAdded }: {
  userId: string; onClose: () => void; onAdded: () => void
}) {
  const [form, setForm] = useState({
    ticker: '', company_name: '', market: 'TUNINDEX',
    alert_price_low: '', alert_price_high: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.ticker || !form.company_name) return
    setLoading(true)
    const { error } = await supabase.from('watchlists').insert({
      user_id:          userId,
      ticker:           form.ticker.toUpperCase().trim(),
      company_name:     form.company_name.trim(),
      market:           form.market,
      alert_price_low:  form.alert_price_low  ? parseFloat(form.alert_price_low)  : null,
      alert_price_high: form.alert_price_high ? parseFloat(form.alert_price_high) : null,
      notes:            form.notes.trim() || null,
    })
    if (error) {
      toast.error(error.code === '23505' ? 'Ce titre est déjà dans votre watchlist' : 'Erreur lors de l\'ajout')
    } else {
      toast.success(`${form.ticker.toUpperCase()} ajouté à votre watchlist`)
      onAdded()
      onClose()
    }
    setLoading(false)
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>Ajouter un titre</h2>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>TICKER *</label>
              <input value={form.ticker} onChange={e => f('ticker', e.target.value.toUpperCase())}
                placeholder="SFBT" required className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>MARCHÉ</label>
              <select value={form.market} onChange={e => f('market', e.target.value)} className="input-premium">
                {['TUNINDEX','TUNINDEX20','NASDAQ','CAC40','CRYPTO','FOREX'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>SOCIÉTÉ *</label>
            <input value={form.company_name} onChange={e => f('company_name', e.target.value)}
              placeholder="Société Frigorifique et Brasserie de Tunis" required className="input-premium" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#FF1744' }}>ALERTE BAS</label>
              <input type="number" step="0.001" min="0" value={form.alert_price_low}
                onChange={e => f('alert_price_low', e.target.value)}
                placeholder="Optionnel" className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#00C853' }}>ALERTE HAUT</label>
              <input type="number" step="0.001" min="0" value={form.alert_price_high}
                onChange={e => f('alert_price_high', e.target.value)}
                placeholder="Optionnel" className="input-premium" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>NOTES</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
              placeholder="Vos notes personnelles..." rows={2} className="input-premium resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : <><Plus size={14} /> Ajouter</>}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
