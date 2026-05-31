'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, BarChart2, Eye, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { FundamentalAnalysis } from '@/types'

const recoCfg = {
  strong_buy:  { label: 'FORT ACHAT', cls: 'badge-buy'  },
  buy:         { label: 'ACHAT',      cls: 'badge-buy'  },
  hold:        { label: 'NEUTRE',     cls: 'badge-hold' },
  sell:        { label: 'VENTE',      cls: 'badge-sell' },
  strong_sell: { label: 'FORT VENTE', cls: 'badge-sell' },
}

export default function AdminFondamentalesPage() {
  const [analyses, setAnalyses] = useState<FundamentalAnalysis[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<FundamentalAnalysis | null>(null)
  const supabase = createClient()

  async function fetchAnalyses() {
    const { data } = await supabase
      .from('fundamental_analyses')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setAnalyses(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchAnalyses()
    const ch = supabase.channel('fa-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fundamental_analyses' }, fetchAnalyses)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function deleteAnalysis(id: string) {
    if (!confirm('Supprimer cette analyse ?')) return
    await supabase.from('fundamental_analyses').delete().eq('id', id)
    toast.success('Analyse supprimée')
    fetchAnalyses()
  }

  async function toggleStatus(a: FundamentalAnalysis) {
    const s = a.status === 'published' ? 'draft' : 'published'
    await supabase.from('fundamental_analyses').update({
      status: s,
      published_at: s === 'published' ? new Date().toISOString() : null,
    }).eq('id', a.id)
    toast.success(s === 'published' ? 'Publiée ✓' : 'Mise en brouillon')
    fetchAnalyses()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Analyses Fondamentales</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {analyses.filter(a => a.status === 'published').length} publiées · {analyses.length} total
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-gold flex items-center gap-2">
          <Plus size={15} /> Nouvelle analyse
        </motion.button>
      </div>

      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-3 w-28" />
                </div>
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart2 size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
            <p className="text-sm" style={{ color: '#5C5C5C' }}>Aucune analyse fondamentale</p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>Société</th>
                <th>Recommandation</th>
                <th>PER</th>
                <th>ROE</th>
                <th>Objectif</th>
                <th>Statut</th>
                <th>Date</th>
                <th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a, i) => {
                const reco = recoCfg[a.recommendation as keyof typeof recoCfg]
                return (
                  <motion.tr key={a.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(33,150,243,0.12)', color: '#2196F3' }}>
                          {a.ticker.slice(0, 4)}
                        </div>
                        <div>
                          <div className="font-medium text-sm" style={{ color: '#F5F5F5' }}>{a.company_name}</div>
                          <div className="text-xs" style={{ color: '#5C5C5C' }}>{a.sector} · {a.market}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {reco && <span className={`${reco.cls} text-[10px] font-bold px-2 py-0.5 rounded`}>{reco.label}</span>}
                    </td>
                    <td><span className="text-sm font-mono" style={{ color: '#A0A0A0' }}>{a.pe_ratio?.toFixed(1) || '—'}</span></td>
                    <td><span className="text-sm font-mono" style={{ color: a.roe && a.roe > 15 ? '#00C853' : '#A0A0A0' }}>{a.roe ? `${a.roe.toFixed(1)}%` : '—'}</span></td>
                    <td><span className="text-sm font-mono font-bold" style={{ color: '#D4AF37' }}>{a.target_price?.toLocaleString()}</span></td>
                    <td><span className="text-xs" style={{ color: a.status === 'published' ? '#00C853' : '#707070' }}>● {a.status === 'published' ? 'Publié' : 'Brouillon'}</span></td>
                    <td><span className="text-xs" style={{ color: '#707070' }}>{format(new Date(a.created_at), 'dd MMM', { locale: fr })}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleStatus(a)} title={a.status === 'published' ? 'Dépublier' : 'Publier'}
                          className="p-1.5 rounded-lg"
                          style={{ color: a.status === 'published' ? '#00C853' : '#5C5C5C' }}>
                          <Eye size={13} />
                        </button>
                        <button onClick={() => { setEditing(a); setShowForm(true) }} className="p-1.5 rounded-lg" style={{ color: '#A0A0A0' }}><Edit size={13} /></button>
                        <button onClick={() => deleteAnalysis(a.id)} className="p-1.5 rounded-lg" style={{ color: '#5C5C5C' }}
                          onMouseOver={e => (e.currentTarget.style.color = '#FF1744')}
                          onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <FundamentalAnalysisForm
            analysis={editing}
            onClose={() => setShowForm(false)}
            onSaved={fetchAnalyses}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function FundamentalAnalysisForm({ analysis, onClose, onSaved }: {
  analysis: FundamentalAnalysis | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    ticker:         analysis?.ticker || '',
    company_name:   analysis?.company_name || '',
    sector:         analysis?.sector || '',
    market:         analysis?.market || 'TUNINDEX',
    recommendation: analysis?.recommendation || 'buy',
    target_price:   analysis?.target_price?.toString() || '',
    current_price:  analysis?.current_price?.toString() || '',
    pe_ratio:       analysis?.pe_ratio?.toString() || '',
    forward_pe:     analysis?.forward_pe?.toString() || '',
    roe:            analysis?.roe?.toString() || '',
    roa:            analysis?.roa?.toString() || '',
    debt_to_equity: analysis?.debt_to_equity?.toString() || '',
    revenue_growth: analysis?.revenue_growth?.toString() || '',
    earnings_growth:analysis?.earnings_growth?.toString() || '',
    dividend_yield: analysis?.dividend_yield?.toString() || '',
    market_cap:     analysis?.market_cap?.toString() || '',
    description:    analysis?.description || '',
    risks:          analysis?.risks || '',
    catalysts:      analysis?.catalysts || '',
    status:         analysis?.status || 'draft',
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function n(v: string) { return v ? parseFloat(v) : null }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const payload = {
      ticker: form.ticker.toUpperCase(),
      company_name: form.company_name,
      sector: form.sector,
      market: form.market,
      recommendation: form.recommendation,
      target_price: parseFloat(form.target_price),
      current_price: n(form.current_price),
      pe_ratio: n(form.pe_ratio),
      forward_pe: n(form.forward_pe),
      roe: n(form.roe),
      roa: n(form.roa),
      debt_to_equity: n(form.debt_to_equity),
      revenue_growth: n(form.revenue_growth),
      earnings_growth: n(form.earnings_growth),
      dividend_yield: n(form.dividend_yield),
      market_cap: n(form.market_cap),
      description: form.description,
      risks: form.risks,
      catalysts: form.catalysts,
      status: form.status,
      published_at: form.status === 'published' ? new Date().toISOString() : null,
      author_id: session.user.id,
    }

    let error
    if (analysis) {
      ({ error } = await supabase.from('fundamental_analyses').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', analysis.id))
    } else {
      ({ error } = await supabase.from('fundamental_analyses').insert(payload))
    }

    if (error) toast.error(error.message)
    else { toast.success(analysis ? 'Analyse modifiée' : 'Analyse créée'); onSaved(); onClose() }
    setLoading(false)
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const upside = form.target_price && form.current_price
    ? (((parseFloat(form.target_price) - parseFloat(form.current_price)) / parseFloat(form.current_price)) * 100).toFixed(1)
    : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl rounded-2xl border my-8"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--noir-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>
            {analysis ? 'Modifier' : 'Nouvelle analyse fondamentale'}
          </h2>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Identification */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>TICKER *</label>
              <input value={form.ticker} onChange={e => f('ticker', e.target.value.toUpperCase())} placeholder="SFBT" required className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>MARCHÉ</label>
              <select value={form.market} onChange={e => f('market', e.target.value)} className="input-premium">
                {['TUNINDEX','TUNINDEX20','NASDAQ','CAC40','DAX','CRYPTO'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>NOM SOCIÉTÉ *</label>
              <input value={form.company_name} onChange={e => f('company_name', e.target.value)} placeholder="Société Frigorifique..." required className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>SECTEUR *</label>
              <input value={form.sector} onChange={e => f('sector', e.target.value)} placeholder="Agroalimentaire" required className="input-premium" />
            </div>
          </div>

          {/* Recommendation + Prices */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>RECOMMANDATION</label>
              <select value={form.recommendation} onChange={e => f('recommendation', e.target.value)} className="input-premium">
                <option value="strong_buy">🟢 Fort Achat</option>
                <option value="buy">📈 Achat</option>
                <option value="hold">⏸ Neutre</option>
                <option value="sell">📉 Vente</option>
                <option value="strong_sell">🔴 Fort Vente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>COURS ACTUEL</label>
              <input type="number" step="0.001" value={form.current_price} onChange={e => f('current_price', e.target.value)} placeholder="15.250" className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>OBJECTIF *</label>
              <input type="number" step="0.001" value={form.target_price} onChange={e => f('target_price', e.target.value)} placeholder="20.000" required className="input-premium" />
              {upside && <div className="text-xs mt-1" style={{ color: parseFloat(upside) > 0 ? '#00C853' : '#FF1744' }}>{parseFloat(upside) > 0 ? '+' : ''}{upside}%</div>}
            </div>
          </div>

          {/* Ratios */}
          <div>
            <div className="text-xs font-semibold mb-3 tracking-wider" style={{ color: '#5C5C5C' }}>RATIOS FINANCIERS</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: 'pe_ratio', l: 'PER', p: '12.5' },
                { k: 'forward_pe', l: 'PER Fwd', p: '10.2' },
                { k: 'roe', l: 'ROE (%)', p: '18.3' },
                { k: 'roa', l: 'ROA (%)', p: '8.5' },
                { k: 'debt_to_equity', l: 'D/E', p: '0.45' },
                { k: 'revenue_growth', l: 'Croiss. CA (%)', p: '7.2' },
                { k: 'earnings_growth', l: 'Croiss. BNA (%)', p: '12.1' },
                { k: 'dividend_yield', l: 'Rendement div. (%)', p: '3.5' },
                { k: 'market_cap', l: 'Cap. (MDT)', p: '450' },
              ].map(({ k, l, p }) => (
                <div key={k}>
                  <label className="block text-[10px] font-medium mb-1 tracking-wide" style={{ color: '#707070' }}>{l}</label>
                  <input type="number" step="0.001" value={(form as any)[k]}
                    onChange={e => f(k, e.target.value)}
                    placeholder={p} className="input-premium" />
                </div>
              ))}
            </div>
          </div>

          {/* Description, Risques, Catalyseurs */}
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>ANALYSE & DESCRIPTION *</label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)} required rows={4} placeholder="Analyse détaillée..." className="input-premium resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#FF1744' }}>RISQUES</label>
              <textarea value={form.risks} onChange={e => f('risks', e.target.value)} rows={3} placeholder="Facteurs de risque..." className="input-premium resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#00C853' }}>CATALYSEURS</label>
              <textarea value={form.catalysts} onChange={e => f('catalysts', e.target.value)} rows={3} placeholder="Déclencheurs de hausse..." className="input-premium resize-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button type="submit" onClick={() => f('status', 'draft')} disabled={loading}
              className="btn-ghost flex-1" style={{ color: '#A0A0A0' }}>Brouillon</button>
            <motion.button type="submit" onClick={() => f('status', 'published')} disabled={loading}
              whileTap={{ scale: 0.97 }} className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Publier'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
