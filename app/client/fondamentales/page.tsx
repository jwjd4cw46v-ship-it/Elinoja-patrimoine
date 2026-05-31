'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart2, Search, X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { FundamentalAnalysis } from '@/types'

const recoCfg: Record<string, { label: string; cls: string; icon: any; color: string }> = {
  strong_buy:  { label: 'FORT ACHAT', cls: 'badge-buy',  icon: TrendingUp,   color: '#00C853' },
  buy:         { label: 'ACHAT',      cls: 'badge-buy',  icon: TrendingUp,   color: '#00C853' },
  hold:        { label: 'NEUTRE',     cls: 'badge-hold', icon: Minus,        color: '#2196F3' },
  sell:        { label: 'VENTE',      cls: 'badge-sell', icon: TrendingDown, color: '#FF1744' },
  strong_sell: { label: 'FORT VENTE', cls: 'badge-sell', icon: TrendingDown, color: '#FF1744' },
}

function Ratio({ label, value, suffix = '', highlight }: { label: string; value?: number | null; suffix?: string; highlight?: 'high' | 'low' | 'neutral' }) {
  if (!value && value !== 0) return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
      <div className="text-xs mb-1" style={{ color: '#5C5C5C' }}>{label}</div>
      <div className="text-sm font-mono" style={{ color: '#3A3A3A' }}>—</div>
    </div>
  )
  const color = highlight === 'high' ? '#00C853' : highlight === 'low' ? '#FF1744' : '#F5F5F5'
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
      <div className="text-xs mb-1" style={{ color: '#5C5C5C' }}>{label}</div>
      <div className="text-sm font-mono font-bold" style={{ color }}>{value.toFixed(1)}{suffix}</div>
    </div>
  )
}

export default function ClientFondamentalesPage() {
  const [analyses, setAnalyses] = useState<FundamentalAnalysis[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [selected, setSelected] = useState<FundamentalAnalysis | null>(null)
  const supabase = createClient()

  async function fetchAnalyses() {
    const { data } = await supabase
      .from('fundamental_analyses')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
    if (data) setAnalyses(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchAnalyses()
    const ch = supabase.channel('fa-client')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fundamental_analyses' }, fetchAnalyses)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filtered = analyses.filter(a => {
    const matchSearch = a.ticker.toLowerCase().includes(search.toLowerCase()) ||
      a.company_name.toLowerCase().includes(search.toLowerCase()) ||
      a.sector.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.recommendation === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Analyses Fondamentales</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {filtered.length} analyse{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5C5C5C' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ticker, société, secteur..." className="input-premium pl-9 w-56" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all','strong_buy','buy','hold','sell','strong_sell'].map(f => {
            const cfg = f === 'all' ? null : recoCfg[f]
            return (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: filter === f ? (cfg ? `${cfg.color}18` : 'rgba(212,175,55,0.12)') : 'var(--noir-elevated)',
                  color: filter === f ? (cfg?.color || '#D4AF37') : '#707070',
                  border: `1px solid ${filter === f ? (cfg ? `${cfg.color}40` : 'rgba(212,175,55,0.3)') : 'var(--noir-border)'}`,
                }}>
                {f === 'all' ? 'Tous' : cfg?.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card-premium p-5 space-y-3">
              <div className="flex gap-3"><div className="skeleton w-10 h-10 rounded-lg" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-28" /><div className="skeleton h-3 w-20" /></div></div>
              <div className="grid grid-cols-3 gap-2">{[0,1,2].map(j => <div key={j} className="skeleton h-12 rounded-lg" />)}</div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
          <p style={{ color: '#5C5C5C' }}>Aucune analyse disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a, i) => {
            const reco = recoCfg[a.recommendation as keyof typeof recoCfg]
            const RecoIcon = reco?.icon || Minus
            const upside = a.target_price && a.current_price
              ? (((a.target_price - a.current_price) / a.current_price) * 100).toFixed(1)
              : null
            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(a)}
                className="card-premium p-5 cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(33,150,243,0.12)', color: '#2196F3' }}>
                      {a.ticker.slice(0, 4)}
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: '#F5F5F5' }}>{a.ticker}</div>
                      <div className="text-[11px]" style={{ color: '#5C5C5C' }}>{a.sector}</div>
                    </div>
                  </div>
                  {reco && <span className={`${reco.cls} text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0`}>{reco.label}</span>}
                </div>

                <div className="text-sm font-medium mb-4 line-clamp-1" style={{ color: '#C0C0C0' }}>{a.company_name}</div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { l: 'Cours',    v: a.current_price?.toLocaleString() || '—', c: '#A0A0A0' },
                    { l: 'Objectif', v: a.target_price?.toLocaleString(),          c: reco?.color || '#D4AF37' },
                    { l: 'Potentiel',v: upside ? `${parseFloat(upside) > 0 ? '+' : ''}${upside}%` : '—',
                      c: upside ? (parseFloat(upside) > 0 ? '#00C853' : '#FF1744') : '#707070' },
                  ].map(p => (
                    <div key={p.l} className="text-center p-2 rounded-lg"
                      style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
                      <div className="text-xs font-bold font-mono" style={{ color: p.c }}>{p.v}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: '#4A4A4A' }}>{p.l}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: 'PER',      v: a.pe_ratio },
                    { l: 'ROE',      v: a.roe, suffix: '%', hi: a.roe && a.roe > 15 ? 'high' as const : undefined },
                    { l: 'Div. yield',v: a.dividend_yield, suffix: '%', hi: a.dividend_yield && a.dividend_yield > 3 ? 'high' as const : undefined },
                  ].map(p => (
                    <div key={p.l} className="text-center p-2 rounded"
                      style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="text-xs font-mono" style={{ color: p.v ? (p.hi === 'high' ? '#00C853' : '#A0A0A0') : '#3A3A3A' }}>
                        {p.v != null ? `${p.v.toFixed(1)}${p.suffix || ''}` : '—'}
                      </div>
                      <div className="text-[10px]" style={{ color: '#4A4A4A' }}>{p.l}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {selected && <FundamentalDetailModal analysis={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}

function FundamentalDetailModal({ analysis: a, onClose }: { analysis: FundamentalAnalysis; onClose: () => void }) {
  const reco = recoCfg[a.recommendation as keyof typeof recoCfg]
  const upside = a.target_price && a.current_price
    ? (((a.target_price - a.current_price) / a.current_price) * 100).toFixed(2) : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-2xl rounded-2xl border my-8 overflow-hidden"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)', background: 'rgba(33,150,243,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ background: 'rgba(33,150,243,0.15)', color: '#2196F3' }}>
              {a.ticker.slice(0, 4)}
            </div>
            <div>
              <div className="font-bold" style={{ color: '#F5F5F5' }}>{a.company_name}</div>
              <div className="text-xs" style={{ color: '#5C5C5C' }}>{a.sector} · {a.market}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reco && <span className={`${reco.cls} text-[10px] font-bold px-2.5 py-1 rounded`}>{reco.label}</span>}
            <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Price summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Cours actuel', v: a.current_price?.toLocaleString() || '—', c: '#A0A0A0' },
              { l: 'Objectif',     v: a.target_price?.toLocaleString(),          c: reco?.color || '#D4AF37' },
              { l: 'Potentiel',    v: upside ? `${parseFloat(upside) > 0 ? '+' : ''}${upside}%` : '—',
                c: upside ? (parseFloat(upside) > 0 ? '#00C853' : '#FF1744') : '#707070' },
            ].map(p => (
              <div key={p.l} className="p-3 rounded-xl text-center"
                style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
                <div className="text-lg font-bold font-mono" style={{ color: p.c }}>{p.v}</div>
                <div className="text-[11px] mt-1" style={{ color: '#5C5C5C' }}>{p.l}</div>
              </div>
            ))}
          </div>

          {/* Ratios */}
          <div>
            <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#5C5C5C' }}>RATIOS FINANCIERS</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <Ratio label="PER" value={a.pe_ratio} />
              <Ratio label="PER Fwd" value={a.forward_pe} />
              <Ratio label="ROE" value={a.roe} suffix="%" highlight={a.roe && a.roe > 15 ? 'high' : 'neutral'} />
              <Ratio label="ROA" value={a.roa} suffix="%" highlight={a.roa && a.roa > 8 ? 'high' : 'neutral'} />
              <Ratio label="D/E" value={a.debt_to_equity} highlight={a.debt_to_equity && a.debt_to_equity > 1 ? 'low' : 'neutral'} />
              <Ratio label="Croiss. CA" value={a.revenue_growth} suffix="%" highlight={a.revenue_growth && a.revenue_growth > 5 ? 'high' : 'neutral'} />
              <Ratio label="Croiss. BNA" value={a.earnings_growth} suffix="%" highlight={a.earnings_growth && a.earnings_growth > 5 ? 'high' : 'neutral'} />
              <Ratio label="Rendement div." value={a.dividend_yield} suffix="%" highlight={a.dividend_yield && a.dividend_yield > 3 ? 'high' : 'neutral'} />
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#5C5C5C' }}>ANALYSE</div>
            <p className="text-sm leading-relaxed p-4 rounded-xl whitespace-pre-wrap"
              style={{ color: '#C0C0C0', background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
              {a.description}
            </p>
          </div>

          {/* Risks + Catalysts */}
          {(a.risks || a.catalysts) && (
            <div className="grid grid-cols-2 gap-4">
              {a.risks && (
                <div>
                  <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#FF1744' }}>RISQUES</div>
                  <p className="text-xs leading-relaxed p-3 rounded-lg whitespace-pre-wrap"
                    style={{ color: '#C0C0C0', background: 'rgba(255,23,68,0.04)', border: '1px solid rgba(255,23,68,0.15)' }}>
                    {a.risks}
                  </p>
                </div>
              )}
              {a.catalysts && (
                <div>
                  <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#00C853' }}>CATALYSEURS</div>
                  <p className="text-xs leading-relaxed p-3 rounded-lg whitespace-pre-wrap"
                    style={{ color: '#C0C0C0', background: 'rgba(0,200,83,0.04)', border: '1px solid rgba(0,200,83,0.15)' }}>
                    {a.catalysts}
                  </p>
                </div>
              )}
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
