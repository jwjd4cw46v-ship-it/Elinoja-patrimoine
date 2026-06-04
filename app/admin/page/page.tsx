'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, TrendingUp, Edit, Trash2, Eye, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { TechnicalAnalysis } from '@/types'
import TechnicalAnalysisForm from '@/components/admin/TechnicalAnalysisForm'

export default function AnalysesTechniquesPage() {
  const [analyses, setAnalyses] = useState<TechnicalAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TechnicalAnalysis | null>(null)
  const supabase = createClient()

  async function fetchAnalyses() {
    const { data, error } = await supabase
      .from('technical_analyses')
      .select('*, author:profiles(full_name, email)')
      .order('created_at', { ascending: false })

    if (!error && data) setAnalyses(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchAnalyses()

    const channel = supabase
      .channel('analyses-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technical_analyses' },
        () => fetchAnalyses())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = analyses.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.ticker.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.status === filter || a.signal === filter
    return matchSearch && matchFilter
  })

  async function deleteAnalysis(id: string) {
    if (!confirm('Supprimer cette analyse ?')) return
    const { error } = await supabase.from('technical_analyses').delete().eq('id', id)
    if (error) toast.error('Erreur lors de la suppression')
    else { toast.success('Analyse supprimée'); fetchAnalyses() }
  }

  async function toggleStatus(a: TechnicalAnalysis) {
    const newStatus = a.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase
      .from('technical_analyses')
      .update({ status: newStatus, published_at: newStatus === 'published' ? new Date().toISOString() : null })
      .eq('id', a.id)

    if (error) toast.error('Erreur')
    else {
      toast.success(newStatus === 'published' ? 'Analyse publiée ✓' : 'Mise en brouillon')
      fetchAnalyses()
    }
  }

  const signalConfig = {
    buy:   { label: 'ACHAT',  cls: 'badge-buy'  },
    sell:  { label: 'VENTE',  cls: 'badge-sell' },
    hold:  { label: 'NEUTRE', cls: 'badge-hold' },
    watch: { label: 'VEILLE', cls: 'badge-watch' },
  }

  const statusConfig = {
    published: { label: 'Publié',    color: '#00C853' },
    draft:     { label: 'Brouillon', color: '#707070' },
    archived:  { label: 'Archivé',  color: '#5C5C5C' },
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Analyses Techniques</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {analyses.filter(a => a.status === 'published').length} publiées · {analyses.length} total
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-gold flex items-center gap-2">
          <Plus size={15} /> Nouvelle analyse
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5C5C5C' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ticker ou titre..."
            className="input-premium pl-9 w-56"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'published', 'draft', 'buy', 'sell', 'hold'].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filter === f ? 'rgba(212,175,55,0.15)' : 'var(--noir-elevated)',
                color: filter === f ? '#D4AF37' : '#707070',
                border: `1px solid ${filter === f ? 'rgba(212,175,55,0.3)' : 'var(--noir-border)'}`,
              }}>
              {{all:'Tout', published:'Publiés', draft:'Brouillons', buy:'Achat', sell:'Vente', hold:'Neutre'}[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48" />
                  <div className="skeleton h-3 w-32" />
                </div>
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-5 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
            <p className="text-sm" style={{ color: '#5C5C5C' }}>Aucune analyse trouvée</p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>Analyse</th>
                <th>Signal</th>
                <th>Entrée</th>
                <th>Objectif</th>
                <th>Stop</th>
                <th>Statut</th>
                <th>Date</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const sig = signalConfig[a.signal as keyof typeof signalConfig]
                const sta = statusConfig[a.status as keyof typeof statusConfig]
                const gain = a.target_price && a.entry_price
                  ? (((a.target_price - a.entry_price) / a.entry_price) * 100).toFixed(1)
                  : null
                return (
                  <motion.tr key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                          {a.ticker.slice(0, 4)}
                        </div>
                        <div>
                          <div className="font-medium text-sm line-clamp-1" style={{ color: '#F5F5F5', maxWidth: 200 }}>
                            {a.title}
                          </div>
                          <div className="text-xs" style={{ color: '#5C5C5C' }}>
                            {a.market} · {a.timeframe}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {sig && <span className={`${sig.cls} text-[10px] font-bold px-2 py-0.5 rounded`}>{sig.label}</span>}
                    </td>
                    <td><span className="text-sm font-mono" style={{ color: '#F5F5F5' }}>{a.entry_price?.toLocaleString()}</span></td>
                    <td>
                      <div>
                        <span className="text-sm font-mono" style={{ color: '#00C853' }}>{a.target_price?.toLocaleString()}</span>
                        {gain && <div className="text-[10px]" style={{ color: '#00C853' }}>+{gain}%</div>}
                      </div>
                    </td>
                    <td><span className="text-sm font-mono" style={{ color: '#FF1744' }}>{a.stop_loss?.toLocaleString()}</span></td>
                    <td>
                      <span className="text-xs" style={{ color: sta?.color || '#707070' }}>● {sta?.label}</span>
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: '#707070' }}>
                        {format(new Date(a.created_at), 'dd MMM', { locale: fr })}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleStatus(a)} title={a.status === 'published' ? 'Dépublier' : 'Publier'}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: a.status === 'published' ? '#00C853' : '#5C5C5C' }}
                          onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                          <Eye size={13} />
                        </button>
                        <button onClick={() => { setEditing(a); setShowForm(true) }}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#A0A0A0' }}
                          onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                          <Edit size={13} />
                        </button>
                        <button onClick={() => deleteAnalysis(a.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#5C5C5C' }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,23,68,0.08)'; e.currentTarget.style.color = '#FF1744' }}
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5C5C5C' }}>
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
          <TechnicalAnalysisForm
            analysis={editing}
            onClose={() => setShowForm(false)}
            onSaved={fetchAnalyses}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
