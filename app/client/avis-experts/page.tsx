'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, ChevronDown, Plus, Edit2, X, Users, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExpertOpinion {
  id:           string
  user_id:      string
  ticker:       string
  company_name: string | null
  market:       string | null
  signal:       'buy' | 'accumulate' | 'hold' | 'reduce' | 'sell'
  target_price: number | null
  comment:      string | null
  created_at:   string
  updated_at:   string
  expires_at:   string
  profiles:     { full_name: string; avatar_url?: string } | null
}

interface Market {
  referentiel: { ticker: string; stockName: string }
  last: number
}

// ─── Config signals ───────────────────────────────────────────────────────────
const SIGNALS = {
  buy:      { label: 'Acheter',   color: '#00C853', bg: 'rgba(0,200,83,0.12)',   icon: TrendingUp  },
  accumulate:{ label: 'Accumuler', color: '#69F0AE', bg: 'rgba(105,240,174,0.1)', icon: TrendingUp  },
  hold:     { label: 'Conserver', color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', icon: Minus       },
  reduce:   { label: 'Alléger',   color: '#FF9800', bg: 'rgba(255,152,0,0.12)',  icon: TrendingDown },
  sell:     { label: 'Vendre',    color: '#FF1744', bg: 'rgba(255,23,68,0.12)',  icon: TrendingDown },
}

// Score consensus : buy=5, accumulate=4, hold=3, reduce=2, sell=1
const SIGNAL_SCORE: Record<string, number> = { buy: 5, accumulate: 4, hold: 3, reduce: 2, sell: 1 }

export default function AvisExpertsPage() {
  const [markets,      setMarkets]      = useState<Market[]>([])
  const [selectedTicker, setSelectedTicker] = useState<string>('')
  const [opinions,     setOpinions]     = useState<ExpertOpinion[]>([])
  const [loadingOp,    setLoadingOp]    = useState(false)
  const [isExpert,     setIsExpert]     = useState(false)
  const [myOpinion,    setMyOpinion]    = useState<ExpertOpinion | null>(null)
  const [showForm,     setShowForm]     = useState(false)
  const [userId,       setUserId]       = useState<string | null>(null)
  const supabase = createClient()

  // ── Init user + marchés ──────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Vérifier si expert
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_expert')
        .eq('id', user.id)
        .single()
      setIsExpert(profile?.is_expert ?? false)

      // Charger les marchés BVMT
      try {
        const res = await fetch('/api/cotations', { cache: 'no-store' })
        const data = res.ok ? await res.json() : {}
        setMarkets(data.markets ?? [])
      } catch {}
    }
    init()
  }, [])

  // ── Charger les avis pour le ticker sélectionné ───────────────────────
  const fetchOpinions = useCallback(async (ticker: string) => {
    if (!ticker) return
    setLoadingOp(true)
    const { data } = await supabase
      .from('expert_opinions')
      .select('*, profiles(full_name, avatar_url)')
      .eq('ticker', ticker)
      .gt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false })
    setOpinions((data as any[]) ?? [])
    setMyOpinion((data as any[])?.find(o => o.user_id === userId) ?? null)
    setLoadingOp(false)
  }, [userId])

  useEffect(() => {
    if (selectedTicker) fetchOpinions(selectedTicker)
    else { setOpinions([]); setMyOpinion(null) }
  }, [selectedTicker, fetchOpinions])

  // ── Consensus ─────────────────────────────────────────────────────────
  const consensus = (() => {
    if (!opinions.length) return null
    const counts = { buy: 0, accumulate: 0, hold: 0, reduce: 0, sell: 0 }
    let scoreSum = 0
    opinions.forEach(o => {
      counts[o.signal]++
      scoreSum += SIGNAL_SCORE[o.signal]
    })
    const avg = scoreSum / opinions.length
    const dominant =
      avg >= 4.5 ? 'buy' :
      avg >= 3.5 ? 'accumulate' :
      avg >= 2.5 ? 'hold' :
      avg >= 1.5 ? 'reduce' : 'sell'
    return { counts, avg: avg.toFixed(2), dominant, total: opinions.length }
  })()

  const selectedMarket = markets.find(m => m.referentiel?.ticker === selectedTicker)
  const fmt = (v: number) => v.toLocaleString('fr-TN', { minimumFractionDigits: v > 100 ? 2 : 3, maximumFractionDigits: v > 100 ? 2 : 3 })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Avis d'Experts</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            Recommandations et objectifs de cours par nos experts certifiés
          </p>
        </div>
        {isExpert && selectedTicker && (
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="btn-gold flex items-center gap-2">
            {myOpinion ? <Edit2 size={14} /> : <Plus size={14} />}
            {myOpinion ? 'Modifier mon avis' : 'Donner mon avis'}
          </motion.button>
        )}
      </div>

      {/* Sélecteur de titre */}
      <div className="relative">
        <select
          value={selectedTicker}
          onChange={e => setSelectedTicker(e.target.value)}
          className="input-premium appearance-none pr-10"
          style={{ fontSize: '14px' }}>
          <option value="">— Sélectionner une société —</option>
          {markets
            .sort((a, b) => a.referentiel?.ticker?.localeCompare(b.referentiel?.ticker))
            .map(m => (
              <option key={m.referentiel?.ticker} value={m.referentiel?.ticker}>
                {m.referentiel?.ticker} — {m.referentiel?.stockName}
              </option>
            ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#5C5C5C' }} />
      </div>

      {/* Cours actuel */}
      {selectedMarket && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
          <div>
            <span className="text-xs font-semibold tracking-wider" style={{ color: '#5C5C5C' }}>COURS ACTUEL</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-bold font-mono" style={{ color: '#F5F5F5' }}>
                {fmt(selectedMarket.last)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contenu */}
      {!selectedTicker ? (
        <div className="text-center py-20 card-premium">
          <Users size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#D4AF37' }} />
          <p style={{ color: '#5C5C5C' }}>Sélectionnez une société pour consulter les avis</p>
        </div>
      ) : loadingOp ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : opinions.length === 0 ? (
        <div className="text-center py-16 card-premium">
          <p style={{ color: '#5C5C5C' }}>Aucun avis d'expert pour {selectedTicker}</p>
          {isExpert && (
            <button onClick={() => setShowForm(true)} className="btn-gold mt-4">
              Être le premier à donner un avis
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Consensus ── */}
          {consensus && (
            <div className="card-premium p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wider" style={{ color: '#5C5C5C' }}>
                  CONSENSUS — {consensus.total} EXPERT{consensus.total > 1 ? 'S' : ''}
                </h2>
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg"
                  style={{ background: SIGNALS[consensus.dominant as keyof typeof SIGNALS].bg }}>
                  <span className="text-xs font-bold"
                    style={{ color: SIGNALS[consensus.dominant as keyof typeof SIGNALS].color }}>
                    {SIGNALS[consensus.dominant as keyof typeof SIGNALS].label}
                  </span>
                </div>
              </div>

              {/* Barre consensus */}
              <div className="space-y-2">
                {(Object.entries(consensus.counts) as [string, number][])
                  .filter(([, count]) => count > 0)
                  .map(([signal, count]) => {
                    const cfg = SIGNALS[signal as keyof typeof SIGNALS]
                    const pct = (count / consensus.total) * 100
                    return (
                      <div key={signal} className="flex items-center gap-3">
                        <span className="text-xs w-20 flex-shrink-0" style={{ color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--noir-border)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: cfg.color }} />
                        </div>
                        <span className="text-xs font-bold w-4 text-right" style={{ color: cfg.color }}>
                          {count}
                        </span>
                      </div>
                    )
                  })}
              </div>

              {/* Objectif moyen */}
              {(() => {
                const withTarget = opinions.filter(o => o.target_price)
                if (!withTarget.length) return null
                const avg = withTarget.reduce((s, o) => s + (o.target_price ?? 0), 0) / withTarget.length
                const cours = selectedMarket?.last
                const upside = cours ? (((avg - cours) / cours) * 100).toFixed(1) : null
                return (
                  <div className="flex items-center justify-between pt-3 border-t"
                    style={{ borderColor: 'var(--noir-border)' }}>
                    <span className="text-xs" style={{ color: '#5C5C5C' }}>Objectif moyen ({withTarget.length} avis)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono" style={{ color: '#D4AF37' }}>
                        {fmt(avg)}
                      </span>
                      {upside && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded"
                          style={{
                            color:      parseFloat(upside) >= 0 ? '#00C853' : '#FF1744',
                            background: parseFloat(upside) >= 0 ? 'rgba(0,200,83,0.1)' : 'rgba(255,23,68,0.1)',
                          }}>
                          {parseFloat(upside) >= 0 ? '+' : ''}{upside}%
                        </span>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── Avis individuels ── */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold tracking-wider" style={{ color: '#5C5C5C' }}>
              AVIS INDIVIDUELS
            </h2>
            {opinions.map((op, i) => {
              const cfg   = SIGNALS[op.signal as keyof typeof SIGNALS]
              const Icon  = cfg.icon
              const cours = selectedMarket?.last
              const upside = op.target_price && cours
                ? (((op.target_price - cours) / cours) * 100).toFixed(1)
                : null
              const isMe = op.user_id === userId
              const daysLeft = Math.ceil((new Date(op.expires_at).getTime() - Date.now()) / 86400000)

              return (
                <motion.div key={op.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-premium p-4 space-y-3"
                  style={{ border: `1px solid ${isMe ? 'rgba(212,175,55,0.3)' : 'var(--noir-border)'}` }}>

                  {/* Header avis */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                        {op.profiles?.full_name?.charAt(0) ?? 'E'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#E0E0E0' }}>
                          {op.profiles?.full_name ?? 'Expert'}
                          {isMe && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>Vous</span>}
                        </div>
                        <div className="text-[10px]" style={{ color: '#3A3A3A' }}>
                          Mis à jour le {format(new Date(op.updated_at), 'd MMM yyyy', { locale: fr })}
                          {' · '}expire dans {daysLeft}j
                        </div>
                      </div>
                    </div>

                    {/* Signal badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
                      style={{ background: cfg.bg }}>
                      <Icon size={11} style={{ color: cfg.color }} />
                      <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </div>

                  {/* Objectif + upside */}
                  {op.target_price && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{ background: 'var(--noir-elevated)' }}>
                      <Target size={12} style={{ color: '#D4AF37' }} />
                      <span className="text-xs" style={{ color: '#5C5C5C' }}>Objectif</span>
                      <span className="font-bold font-mono text-sm ml-auto" style={{ color: '#D4AF37' }}>
                        {fmt(op.target_price)}
                      </span>
                      {upside && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            color:      parseFloat(upside) >= 0 ? '#00C853' : '#FF1744',
                            background: parseFloat(upside) >= 0 ? 'rgba(0,200,83,0.1)' : 'rgba(255,23,68,0.1)',
                          }}>
                          {parseFloat(upside) >= 0 ? '+' : ''}{upside}%
                        </span>
                      )}
                    </div>
                  )}

                  {/* Commentaire */}
                  {op.comment && (
                    <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
                      {op.comment}
                    </p>
                  )}
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Modal formulaire expert ── */}
      <AnimatePresence>
        {showForm && selectedTicker && userId && (
          <ExpertForm
            ticker={selectedTicker}
            companyName={selectedMarket?.referentiel?.stockName ?? selectedTicker}
            market="TUNINDEX"
            userId={userId}
            existing={myOpinion}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); fetchOpinions(selectedTicker) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Formulaire expert ────────────────────────────────────────────────────────
function ExpertForm({ ticker, companyName, market, userId, existing, onClose, onSaved }: {
  ticker: string
  companyName: string
  market: string
  userId: string
  existing: ExpertOpinion | null
  onClose: () => void
  onSaved: () => void
}) {
  const [signal,      setSignal]      = useState<string>(existing?.signal ?? 'buy')
  const [targetPrice, setTargetPrice] = useState(existing?.target_price?.toString() ?? '')
  const [comment,     setComment]     = useState(existing?.comment ?? '')
  const [loading,     setLoading]     = useState(false)
  const supabase = createClient()

  async function handleSubmit() {
    if (!signal) return
    setLoading(true)
    const payload = {
      user_id:      userId,
      ticker,
      company_name: companyName,
      market,
      signal,
      target_price: targetPrice ? parseFloat(targetPrice) : null,
      comment:      comment.trim() || null,
    }

    let error
    if (existing) {
      ;({ error } = await supabase.from('expert_opinions').update(payload).eq('id', existing.id))
    } else {
      ;({ error } = await supabase.from('expert_opinions').insert(payload))
    }

    if (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } else {
      toast.success(existing ? 'Avis mis à jour' : 'Avis publié')
      onSaved()
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!existing) return
    setLoading(true)
    await supabase.from('expert_opinions').delete().eq('id', existing.id)
    toast.success('Avis supprimé')
    onSaved()
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border mb-8"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--noir-border)' }}>
          <div>
            <div className="font-bold" style={{ color: '#F5F5F5' }}>
              {existing ? 'Modifier mon avis' : 'Donner mon avis'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#5C5C5C' }}>{ticker} · Valable 6 mois</div>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Signal */}
          <div>
            <label className="block text-xs font-semibold mb-2 tracking-wider" style={{ color: '#A0A0A0' }}>
              RECOMMANDATION *
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.entries(SIGNALS) as [string, typeof SIGNALS[keyof typeof SIGNALS]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setSignal(key)}
                  className="py-2 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    background: signal === key ? cfg.bg : 'var(--noir-elevated)',
                    color:      signal === key ? cfg.color : '#5C5C5C',
                    border:     `1px solid ${signal === key ? cfg.color + '60' : 'var(--noir-border)'}`,
                  }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Objectif */}
          <div>
            <label className="block text-xs font-semibold mb-2 tracking-wider" style={{ color: '#A0A0A0' }}>
              COURS CIBLE (optionnel)
            </label>
            <input
              type="number" step="0.001" min="0"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder="Ex: 1.250"
              className="input-premium"
            />
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-xs font-semibold mb-2 tracking-wider" style={{ color: '#A0A0A0' }}>
              COMMENTAIRE (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Fondamentaux solides, catalyseurs attendus..."
              rows={3}
              className="input-premium resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {existing && (
              <button onClick={handleDelete} disabled={loading}
                className="px-3 py-2.5 rounded-lg text-xs font-semibold"
                style={{ color: '#FF1744', background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.2)' }}>
                Supprimer
              </button>
            )}
            <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading}
              className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : existing ? 'Mettre à jour' : 'Publier'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
