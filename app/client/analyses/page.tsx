'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, TrendingUp, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { TechnicalAnalysis } from '@/types'

const signalConfig = {
  buy:   { label: 'ACHAT',  cls: 'badge-buy',  bg: 'rgba(0,200,83,0.08)'    },
  sell:  { label: 'VENTE',  cls: 'badge-sell', bg: 'rgba(255,23,68,0.08)'   },
  hold:  { label: 'NEUTRE', cls: 'badge-hold', bg: 'rgba(33,150,243,0.08)'  },
  watch: { label: 'VEILLE', cls: 'badge-watch',bg: 'rgba(212,175,55,0.08)'  },
}

const riskConfig = {
  low:    { label: 'Faible',  color: '#00C853' },
  medium: { label: 'Modéré', color: '#FF9800' },
  high:   { label: 'Élevé',  color: '#FF1744' },
}

export default function ClientAnalysesPage() {
  const [analyses, setAnalyses]   = useState<TechnicalAnalysis[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [signal, setSignal]       = useState('all')
  const [market, setMarket]       = useState('all')
  const [selected, setSelected]   = useState<TechnicalAnalysis | null>(null)
  const [newIds, setNewIds]        = useState<Set<string>>(new Set())
  const supabase = createClient()

  async function fetchAnalyses() {
    const { data } = await supabase
      .from('technical_analyses')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
    if (data) setAnalyses(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchAnalyses()

    const channel = supabase
      .channel('client-analyses')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'technical_analyses', filter: 'status=eq.published' },
        (payload) => {
          setAnalyses(prev => [payload.new as any, ...prev])
          setNewIds(prev => new Set([...prev, payload.new.id]))
          setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(payload.new.id); return n }), 5000)
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'technical_analyses' },
        () => fetchAnalyses())
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'technical_analyses' },
        (payload) => setAnalyses(prev => prev.filter(a => a.id !== payload.old.id)))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const markets = ['all', ...Array.from(new Set(analyses.map(a => a.market)))]

  const filtered = analyses.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.ticker.toLowerCase().includes(search.toLowerCase())
    const matchSignal = signal === 'all' || a.signal === signal
    const matchMarket = market === 'all' || a.market === market
    return matchSearch && matchSignal && matchMarket
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Analyses Techniques</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {filtered.length} analyse{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(0,200,83,0.1)', color: '#00C853', border: '1px solid rgba(0,200,83,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          Temps réel
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5C5C5C' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ticker, société..." className="input-premium pl-9 w-52" />
        </div>

        <div className="flex gap-2 flex-wrap">
          {['all','buy','sell','hold','watch'].map(s => {
            const cfg = s === 'all' ? null : signalConfig[s as keyof typeof signalConfig]
            return (
              <button key={s} onClick={() => setSignal(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: signal === s ? (cfg?.bg || 'rgba(212,175,55,0.1)') : 'var(--noir-elevated)',
                  color: signal === s ? (s === 'all' ? '#D4AF37' : s === 'buy' ? '#00C853' : s === 'sell' ? '#FF1744' : s === 'hold' ? '#2196F3' : '#D4AF37') : '#707070',
                  border: `1px solid ${signal === s ? 'currentColor' : 'var(--noir-border)'}`,
                  opacity: signal === s ? 1 : 0.7,
                }}>
                {s === 'all' ? 'Tous' : cfg?.label}
              </button>
            )
          })}
        </div>

        <select value={market} onChange={e => setMarket(e.target.value)}
          className="input-premium w-40">
          {markets.map(m => <option key={m} value={m}>{m === 'all' ? 'Tous marchés' : m}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card-premium p-5 space-y-3">
              <div className="flex gap-3"><div className="skeleton w-10 h-10 rounded-lg" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-24" /><div className="skeleton h-3 w-16" /></div></div>
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
              <div className="grid grid-cols-3 gap-2">{[0,1,2].map(j => <div key={j} className="skeleton h-10 rounded" />)}</div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
          <p style={{ color: '#5C5C5C' }}>Aucune analyse disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a, i) => {
            const sig  = signalConfig[a.signal as keyof typeof signalConfig]
            const risk = riskConfig[a.risk_level as keyof typeof riskConfig]
            const isNew = newIds.has(a.id)
            const gain  = a.target_price && a.entry_price
              ? (((a.target_price - a.entry_price) / a.entry_price) * 100).toFixed(1) : null
            const loss  = a.entry_price && a.stop_loss
              ? (((a.entry_price - a.stop_loss) / a.entry_price) * 100).toFixed(1) : null
            const rr = (a.target_price && a.entry_price && a.stop_loss && a.stop_loss < a.entry_price)
              ? ((a.target_price - a.entry_price) / (a.entry_price - a.stop_loss)).toFixed(2) : null

            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(a)}
                className="card-premium cursor-pointer group overflow-hidden"
                style={isNew ? { borderColor: 'rgba(212,175,55,0.4)', boxShadow: '0 0 20px rgba(212,175,55,0.1)' } : {}}>

                {/* Chart image thumbnail if available */}
                {a.chart_image_url && (
                  <div className="w-full h-32 overflow-hidden"
                    style={{ borderBottom: '1px solid var(--noir-border)' }}>
                    <img
                      src={a.chart_image_url}
                      alt="Graphique"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="p-5">
                  {isNew && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#D4AF37' }} />
                      <span className="text-[10px] font-bold tracking-wider" style={{ color: '#D4AF37' }}>NOUVEAU</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                        {a.ticker.slice(0, 4)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>{a.ticker}</div>
                        <div className="text-[10px]" style={{ color: '#4A4A4A' }}>{a.market} · {a.timeframe}</div>
                      </div>
                    </div>
                    {sig && <span className={`${sig.cls} text-[10px] font-bold px-2 py-0.5 rounded`}>{sig.label}</span>}
                  </div>

                  <h3 className="text-sm font-medium mb-4 line-clamp-2 leading-snug"
                    style={{ color: '#C0C0C0', minHeight: '2.5em' }}>
                    {a.title}
                  </h3>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { l: 'Entrée',   v: a.entry_price?.toLocaleString(),  c: '#A0A0A0', sub: null },
                      { l: 'Objectif', v: a.target_price?.toLocaleString(), c: '#00C853', sub: gain ? `+${gain}%` : null },
                      { l: 'Stop',     v: a.stop_loss?.toLocaleString(),    c: '#FF1744', sub: loss ? `-${loss}%` : null },
                    ].map(p => (
                      <div key={p.l} className="text-center p-2 rounded-lg"
                        style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
                        <div className="text-xs font-bold font-mono" style={{ color: p.c }}>{p.v}</div>
                        {p.sub && <div className="text-[10px] font-medium" style={{ color: p.c }}>{p.sub}</div>}
                        <div className="text-[10px] mt-0.5" style={{ color: '#4A4A4A' }}>{p.l}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t"
                    style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
                    <div className="flex items-center gap-2">
                      {risk && <span className="text-[10px]" style={{ color: risk.color }}>● {risk.label}</span>}
                      {rr && <span className="text-[10px]" style={{ color: '#5C5C5C' }}>R/R: 1:{rr}</span>}
                    </div>
                    <span className="text-[10px]" style={{ color: '#4A4A4A' }}>
                      {a.published_at ? format(new Date(a.published_at), 'dd MMM yyyy', { locale: fr }) : ''}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <AnalysisDetailModal analysis={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function AnalysisDetailModal({ analysis: a, onClose }: { analysis: TechnicalAnalysis; onClose: () => void }) {
  const sig  = signalConfig[a.signal as keyof typeof signalConfig]
  const risk = riskConfig[a.risk_level as keyof typeof riskConfig]
  const gain = a.target_price && a.entry_price ? (((a.target_price - a.entry_price) / a.entry_price) * 100).toFixed(2) : null
  const loss = a.entry_price && a.stop_loss ? (((a.entry_price - a.stop_loss) / a.entry_price) * 100).toFixed(2) : null
  const rr   = (a.target_price && a.entry_price && a.stop_loss && a.stop_loss < a.entry_price)
    ? ((a.target_price - a.entry_price) / (a.entry_price - a.stop_loss)).toFixed(2) : null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-2xl rounded-2xl border my-8 overflow-hidden"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)', background: 'rgba(212,175,55,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
              {a.ticker.slice(0, 4)}
            </div>
            <div>
              <div className="font-bold" style={{ color: '#F5F5F5' }}>{a.ticker} — {a.market}</div>
              <div className="text-xs" style={{ color: '#5C5C5C' }}>{a.timeframe}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sig && <span className={`${sig.cls} text-[10px] font-bold px-2.5 py-1 rounded`}>{sig.label}</span>}
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#5C5C5C' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>{a.title}</h2>

          {/* Price grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Prix d\'entrée', v: a.entry_price?.toLocaleString(),  c: '#A0A0A0', sub: null },
              { l: 'Objectif',       v: a.target_price?.toLocaleString(), c: '#00C853', sub: gain ? `+${gain}%` : null },
              { l: 'Stop Loss',      v: a.stop_loss?.toLocaleString(),    c: '#FF1744', sub: loss ? `-${loss}%` : null },
            ].map(p => (
              <div key={p.l} className="p-3 rounded-xl text-center"
                style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
                <div className="text-lg font-bold font-mono" style={{ color: p.c }}>{p.v}</div>
                {p.sub && <div className="text-xs font-semibold" style={{ color: p.c }}>{p.sub}</div>}
                <div className="text-[11px] mt-1" style={{ color: '#5C5C5C' }}>{p.l}</div>
              </div>
            ))}
          </div>

          {/* Risk/Reward */}
          <div className="grid grid-cols-2 gap-3">
            {risk && (
              <div className="p-3 rounded-xl flex items-center gap-3"
                style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `${risk.color}18` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: risk.color }} />
                </div>
                <div>
                  <div className="text-xs" style={{ color: '#5C5C5C' }}>Niveau de risque</div>
                  <div className="font-semibold text-sm" style={{ color: risk.color }}>{risk.label}</div>
                </div>
              </div>
            )}
            {rr && (
              <div className="p-3 rounded-xl flex items-center gap-3"
                style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(212,175,55,0.1)' }}>
                  <span className="text-xs font-bold" style={{ color: '#D4AF37' }}>R/R</span>
                </div>
                <div>
                  <div className="text-xs" style={{ color: '#5C5C5C' }}>Ratio Risque/Rendement</div>
                  <div className="font-bold text-sm"
                    style={{ color: parseFloat(rr) >= 2 ? '#00C853' : parseFloat(rr) >= 1 ? '#D4AF37' : '#FF1744' }}>
                    1 : {rr}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#5C5C5C' }}>
              ANALYSE ET COMMENTAIRES
            </div>
            <div className="text-sm leading-relaxed p-4 rounded-xl whitespace-pre-wrap"
              style={{ color: '#C0C0C0', background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
              {a.description}
            </div>
          </div>

          {/* Chart Image */}
          {a.chart_image_url && (
            <div>
              <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#5C5C5C' }}>
                GRAPHIQUE TECHNIQUE
              </div>
              <div className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--noir-border)' }}>
                <img
                  src={a.chart_image_url}
                  alt="Analyse graphique"
                  className="w-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="text-xs text-right" style={{ color: '#3A3A3A' }}>
            Publié le {a.published_at ? format(new Date(a.published_at), "d MMMM yyyy 'à' HH:mm", { locale: fr }) : '—'}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
