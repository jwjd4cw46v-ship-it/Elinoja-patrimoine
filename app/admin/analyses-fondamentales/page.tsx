'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Edit, BarChart2, Eye, X, Building2,
  AlertCircle, Search, ChevronDown, Loader2, TrendingUp,
  Check, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { FundamentalAnalysis } from '@/types'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Entreprise {
  id: number
  secteur: string | null
  valeur: string | null
  code_isin: string | null
  mnemo: string | null
  compar_grp: string | null
  mode_cc: string | null
  titres_admis: number | null
  // 2024 = n-2 (réel), 2025 = n-1 (réel), 2026→2030 = prévisions
  resultat_net_2024: number | null
  resultat_net_2025: number | null
  resultat_net_2026: number | null
  resultat_net_2027: number | null
  resultat_net_2028: number | null
  resultat_net_2029: number | null
  resultat_net_2030: number | null
  dividende_2024: number | null
  dividende_2025: number | null
  dividende_2026: number | null
  dividende_2027: number | null
  dividende_2028: number | null
  dividende_2029: number | null
  dividende_2030: number | null
  benefice_par_action: number | null
  rendement_dividende: number | null
}

// En 2026 : n-2 = 2024, n-1 = 2025, prévisions = 2026 → 2030
const CURRENT_YEAR   = 2026
const HIST_YEARS     = [2024, 2025]
const FORECAST_YEARS = [2026, 2027, 2028, 2029, 2030]
const ALL_RN_YEARS   = [...HIST_YEARS, ...FORECAST_YEARS]
const ALL_DIV_YEARS  = [...HIST_YEARS, ...FORECAST_YEARS]

const recoCfg = {
  strong_buy:  { label: 'FORT ACHAT', cls: 'badge-buy'  },
  buy:         { label: 'ACHAT',      cls: 'badge-buy'  },
  hold:        { label: 'NEUTRE',     cls: 'badge-hold' },
  sell:        { label: 'VENTE',      cls: 'badge-sell' },
  strong_sell: { label: 'FORT VENTE', cls: 'badge-sell' },
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function AdminFondamentalesPage() {
  const [analyses,    setAnalyses]    = useState<FundamentalAnalysis[]>([])
  const [entreprises, setEntreprises] = useState<Entreprise[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [showEntForm, setShowEntForm] = useState(false)
  const [editing,     setEditing]     = useState<FundamentalAnalysis | null>(null)
  const [editingEnt,  setEditingEnt]  = useState<Entreprise | null>(null)
  const [activeTab,   setActiveTab]   = useState<'analyses' | 'entreprises'>('analyses')
  // Live cotations map: MNEMO → dernier cours
  const [cotations,   setCotations]   = useState<Record<string, number>>({})
  const supabase = createClient()

  /* ── Fetchers ── */
  async function fetchAnalyses() {
    const { data } = await supabase
      .from('fundamental_analyses')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setAnalyses(data as any)
    setLoading(false)
  }

  async function fetchEntreprises() {
    const { data } = await supabase
      .from('entreprises')
      .select('*')
      .order('valeur', { ascending: true })
    if (data) setEntreprises(data as Entreprise[])
  }

  async function fetchCotations() {
    try {
      const res = await fetch('/api/cotations')
      if (!res.ok) return
      const json = await res.json()
      const markets: any[] = Array.isArray(json) ? json : (json.markets ?? [])
      const map: Record<string, number> = {}
      markets.forEach((m: any) => {
        const nom = (m.referentiel?.ticker || m.referentiel?.stockName || m.nom || '').toUpperCase()
        const last = m.last ?? m.dernier ?? null
        if (nom && last != null) map[nom] = last
      })
      setCotations(map)
    } catch (_) {}
  }

  useEffect(() => {
    fetchAnalyses()
    fetchEntreprises()
    fetchCotations()
    const ch1 = supabase.channel('fa-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fundamental_analyses' }, fetchAnalyses)
      .subscribe()
    const ch2 = supabase.channel('ent-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entreprises' }, fetchEntreprises)
      .subscribe()
    const timer = setInterval(fetchCotations, 60_000)
    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
      clearInterval(timer)
    }
  }, [])

  /* ── Actions ── */
  async function deleteAnalysis(id: string) {
    if (!confirm('Supprimer cette analyse ? Cette action est irréversible.')) return
    const { error } = await supabase.from('fundamental_analyses').delete().eq('id', id)
    if (error) toast.error(error.message)
    else toast.success('Analyse supprimée')
  }

  async function deleteEntreprise(id: number) {
    if (!confirm('Supprimer cette entreprise ?')) return
    const { error } = await supabase.from('entreprises').delete().eq('id', id)
    if (error) toast.error(error.message)
    else toast.success('Entreprise supprimée')
  }

  async function toggleStatus(a: FundamentalAnalysis) {
    const s = a.status === 'published' ? 'draft' : 'published'
    await supabase.from('fundamental_analyses').update({
      status: s,
      published_at: s === 'published' ? new Date().toISOString() : null,
    }).eq('id', a.id)
    toast.success(s === 'published' ? 'Publiée ✓' : 'Mise en brouillon')
  }

  /* ── Render ── */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Analyses Fondamentales</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {analyses.filter(a => a.status === 'published').length} publiées · {entreprises.length} sociétés
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCotations} title="Rafraîchir les cours"
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
            <RefreshCw size={13} style={{ color: '#5C5C5C' }} />
          </button>
          {activeTab === 'entreprises' ? (
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => { setEditingEnt(null); setShowEntForm(true) }}
              className="btn-gold flex items-center gap-2">
              <Building2 size={14} /> Nouvelle société
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => { setEditing(null); setShowForm(true) }}
              className="btn-gold flex items-center gap-2">
              <Plus size={15} /> Nouvelle analyse
            </motion.button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
        {(['analyses', 'entreprises'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all"
            style={{
              background: activeTab === tab ? 'rgba(212,175,55,0.15)' : 'transparent',
              color: activeTab === tab ? '#D4AF37' : '#5C5C5C',
              border: activeTab === tab ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
            }}>
            {tab === 'analyses' ? 'ANALYSES' : 'SOCIÉTÉS'}
          </button>
        ))}
      </div>

      {/* ── ANALYSES TAB ── */}
      {activeTab === 'analyses' && (
        <div className="card-premium overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="skeleton w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-40" /><div className="skeleton h-3 w-28" />
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
                  <th className="text-right hidden lg:table-cell">Cours</th>
                  <th className="text-right hidden md:table-cell">Objectif</th>
                  <th className="text-right hidden lg:table-cell">Potentiel</th>
                  <th className="hidden md:table-cell">Statut</th>
                  <th className="hidden xl:table-cell">Date</th>
                  <th className="sticky right-0" style={{ width: 110, background: 'var(--noir-surface)', boxShadow: '-4px 0 12px rgba(0,0,0,0.4)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((a, i) => {
                  const reco  = recoCfg[a.recommendation as keyof typeof recoCfg]
                  const cours = cotations[a.ticker.toUpperCase()] ?? a.current_price ?? null
                  const upside = a.target_price && cours
                    ? (((a.target_price - cours) / cours) * 100)
                    : null
                  return (
                    <motion.tr key={a.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
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
                      <td className="text-right hidden lg:table-cell">
                        <span className="font-mono text-xs" style={{ color: cours ? '#A0A0A0' : '#3A3A3A' }}>
                          {cours ? cours.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '—'}
                        </span>
                      </td>
                      <td className="text-right hidden md:table-cell">
                        <span className="font-mono text-xs font-bold" style={{ color: '#D4AF37' }}>
                          {a.target_price?.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                        </span>
                      </td>
                      <td className="text-right hidden lg:table-cell">
                        {upside != null ? (
                          <span className="font-mono text-xs font-bold"
                            style={{ color: upside >= 0 ? '#00C853' : '#FF1744' }}>
                            {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
                          </span>
                        ) : <span style={{ color: '#3A3A3A' }}>—</span>}
                      </td>
                      <td className="hidden md:table-cell">
                        <span className="text-xs" style={{ color: a.status === 'published' ? '#00C853' : '#707070' }}>
                          ● {a.status === 'published' ? 'Publié' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell">
                        <span className="text-xs" style={{ color: '#707070' }}>
                          {format(new Date(a.created_at), 'dd MMM yy', { locale: fr })}
                        </span>
                      </td>
                      <td className="sticky right-0" style={{ background: 'var(--noir-surface)', boxShadow: '-4px 0 12px rgba(0,0,0,0.3)' }}>
                        <div className="flex items-center gap-0.5">
                          {/* Publier / Dépublier */}
                          <button onClick={() => toggleStatus(a)}
                            title={a.status === 'published' ? 'Dépublier' : 'Publier'}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: a.status === 'published' ? '#00C853' : '#5C5C5C' }}
                            onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
                            onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                            <Eye size={13} />
                          </button>
                          {/* Modifier */}
                          <button
                            onClick={() => { setEditing(a); setShowForm(true) }}
                            title="Modifier"
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#A0A0A0' }}
                            onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
                            onMouseOut={e => (e.currentTarget.style.color = '#A0A0A0')}>
                            <Edit size={13} />
                          </button>
                          {/* Supprimer */}
                          <button
                            onClick={() => deleteAnalysis(a.id)}
                            title="Supprimer"
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#5C5C5C' }}
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
      )}

      {/* ── SOCIÉTÉS TAB ── */}
      {activeTab === 'entreprises' && (
        <div className="card-premium overflow-x-auto">
          {entreprises.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
              <p className="text-sm" style={{ color: '#5C5C5C' }}>Aucune société enregistrée</p>
            </div>
          ) : (
            <table className="table-premium min-w-[900px]">
              <thead>
                <tr>
                  <th>Valeur</th>
                  <th>ISIN</th>
                  <th>Mnemo</th>
                  <th>Secteur</th>
                  <th className="text-right">Cours live</th>
                  <th className="text-right">Titres admis</th>
                  <th className="text-right">RN 2024</th>
                  <th className="text-right">RN 2025</th>
                  <th className="text-right">Div. 2025</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entreprises.map((e, i) => {
                  const cours = e.mnemo ? cotations[e.mnemo.toUpperCase()] ?? null : null
                  return (
                    <motion.tr key={e.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                            {(e.mnemo || e.valeur || '?').slice(0, 4).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm" style={{ color: '#F5F5F5' }}>{e.valeur || '—'}</div>
                            <div className="text-[10px]" style={{ color: '#5C5C5C' }}>{e.mode_cc || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="font-mono text-xs" style={{ color: '#707070' }}>{e.code_isin || '—'}</span></td>
                      <td><span className="font-mono text-xs font-bold" style={{ color: '#A0A0A0' }}>{e.mnemo || '—'}</span></td>
                      <td><span className="text-xs" style={{ color: '#707070' }}>{e.secteur || '—'}</span></td>
                      <td className="text-right">
                        <span className="font-mono text-xs font-bold"
                          style={{ color: cours ? '#D4AF37' : '#3A3A3A' }}>
                          {cours ? cours.toLocaleString('fr-FR', { minimumFractionDigits: 3 }) : '—'}
                        </span>
                      </td>
                      <td className="text-right"><span className="font-mono text-xs" style={{ color: '#A0A0A0' }}>{e.titres_admis?.toLocaleString('fr-FR') || '—'}</span></td>
                      <td className="text-right"><span className="font-mono text-xs" style={{ color: '#D4AF37' }}>{e.resultat_net_2024 != null ? Number(e.resultat_net_2024).toLocaleString('fr-FR') : '—'}</span></td>
                      <td className="text-right"><span className="font-mono text-xs" style={{ color: '#D4AF37' }}>{e.resultat_net_2025 != null ? Number(e.resultat_net_2025).toLocaleString('fr-FR') : '—'}</span></td>
                      <td className="text-right"><span className="font-mono text-xs" style={{ color: '#00C853' }}>{e.dividende_2025 != null ? Number(e.dividende_2025).toLocaleString('fr-FR') : '—'}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingEnt(e); setShowEntForm(true) }}
                            className="p-1.5 rounded-lg" style={{ color: '#A0A0A0' }}
                            onMouseOver={ev => (ev.currentTarget.style.color = '#D4AF37')}
                            onMouseOut={ev => (ev.currentTarget.style.color = '#A0A0A0')}>
                            <Edit size={13} />
                          </button>
                          <button onClick={() => deleteEntreprise(e.id)}
                            className="p-1.5 rounded-lg" style={{ color: '#5C5C5C' }}
                            onMouseOver={ev => (ev.currentTarget.style.color = '#FF1744')}
                            onMouseOut={ev => (ev.currentTarget.style.color = '#5C5C5C')}>
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
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <FundamentalAnalysisForm
            key={editing?.id ?? 'new-analysis'}
            analysis={editing}
            entreprises={entreprises}
            cotations={cotations}
            onClose={() => { setShowForm(false); setEditing(null) }}
            onSaved={fetchAnalyses}
          />
        )}
        {showEntForm && (
          <EntrepriseForm
            key={editingEnt?.id ?? 'new-ent'}
            entreprise={editingEnt}
            cotations={cotations}
            onClose={() => { setShowEntForm(false); setEditingEnt(null) }}
            onSaved={fetchEntreprises}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   MnemoCombobox
   Dropdown avec recherche sur la liste des mnemos de la table entreprises.
   À la sélection, appelle onSelect(entreprise, cours).
═══════════════════════════════════════════════════════════════════ */
function MnemoCombobox({
  entreprises,
  cotations,
  selectedMnemo,
  onSelect,
  loadingCours,
}: {
  entreprises: Entreprise[]
  cotations: Record<string, number>
  selectedMnemo: string
  onSelect: (ent: Entreprise, cours: number | null) => void
  loadingCours: boolean
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Ferme le dropdown si clic hors
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() =>
    entreprises.filter(e => {
      if (!e.mnemo) return false
      const q = query.toLowerCase()
      return (
        e.mnemo.toLowerCase().includes(q) ||
        (e.valeur || '').toLowerCase().includes(q) ||
        (e.secteur || '').toLowerCase().includes(q)
      )
    }).slice(0, 30),
    [entreprises, query]
  )

  function handleSelect(ent: Entreprise) {
    const cours = ent.mnemo ? (cotations[ent.mnemo.toUpperCase()] ?? null) : null
    onSelect(ent, cours)
    setQuery('')
    setOpen(false)
  }

  const selectedEnt = entreprises.find(e => e.mnemo === selectedMnemo)

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="input-premium w-full flex items-center justify-between gap-2 text-left"
        style={{ minHeight: 40 }}>
        {selectedEnt ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold text-sm flex-shrink-0" style={{ color: '#D4AF37' }}>
              {selectedEnt.mnemo}
            </span>
            <span className="text-xs truncate" style={{ color: '#707070' }}>
              {selectedEnt.valeur}
            </span>
            {selectedMnemo && cotations[selectedMnemo.toUpperCase()] && (
              <span className="ml-auto font-mono text-xs flex-shrink-0"
                style={{ color: '#00C853' }}>
                {cotations[selectedMnemo.toUpperCase()].toLocaleString('fr-FR', {
                  minimumFractionDigits: 3, maximumFractionDigits: 3,
                })}
              </span>
            )}
          </div>
        ) : (
          <span style={{ color: '#5C5C5C' }}>Sélectionner un mnemo…</span>
        )}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {loadingCours && <Loader2 size={11} className="animate-spin" style={{ color: '#D4AF37' }} />}
          <ChevronDown size={13} style={{
            color: '#5C5C5C',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }} />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.97 }}
            className="absolute z-50 mt-1.5 w-full rounded-xl border shadow-2xl overflow-hidden"
            style={{
              transformOrigin: 'top',
              background: '#111111',
              borderColor: 'rgba(212,175,55,0.25)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            }}>

            {/* Search */}
            <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#5C5C5C' }} />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Rechercher mnemo, valeur, secteur…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#F5F5F5',
                  }}
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs" style={{ color: '#5C5C5C' }}>
                  Aucun résultat
                </div>
              ) : filtered.map(ent => {
                const cours = ent.mnemo ? cotations[ent.mnemo.toUpperCase()] : undefined
                const isSelected = ent.mnemo === selectedMnemo
                return (
                  <button key={ent.id} type="button"
                    onClick={() => handleSelect(ent)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
                    style={{
                      background: isSelected ? 'rgba(212,175,55,0.08)' : 'transparent',
                    }}
                    onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>

                    {/* Mnemo badge */}
                    <div className="w-12 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: isSelected ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#D4AF37' : '#707070',
                      }}>
                      {(ent.mnemo || '').slice(0, 6)}
                    </div>

                    {/* Name + secteur */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: '#C0C0C0' }}>
                        {ent.valeur || ent.mnemo}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: '#4A4A4A' }}>
                        {ent.secteur || '—'}
                      </div>
                    </div>

                    {/* Cours live */}
                    <div className="text-right flex-shrink-0">
                      {cours != null ? (
                        <>
                          <div className="text-xs font-mono font-bold" style={{ color: '#D4AF37' }}>
                            {cours.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                          </div>
                          <div className="text-[9px]" style={{ color: '#3A3A3A' }}>live</div>
                        </>
                      ) : (
                        <span className="text-[10px]" style={{ color: '#3A3A3A' }}>—</span>
                      )}
                    </div>

                    {isSelected && <Check size={11} style={{ color: '#D4AF37', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   FundamentalAnalysisForm
   - Combobox mnemo → chargement automatique cours + données société
   - Edit / Create
═══════════════════════════════════════════════════════════════════ */
function FundamentalAnalysisForm({
  analysis,
  entreprises,
  cotations,
  onClose,
  onSaved,
}: {
  analysis: FundamentalAnalysis | null
  entreprises: Entreprise[]
  cotations: Record<string, number>
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
  const [selectedMnemo,  setSelectedMnemo]  = useState(analysis?.ticker || '')
  const [loadingCours,   setLoadingCours]   = useState(false)
  const [linkedEnt,      setLinkedEnt]      = useState<Entreprise | null>(null)
  const [submitStatus,   setSubmitStatus]   = useState<'draft' | 'published'>('draft')
  const [loading,        setLoading]        = useState(false)
  const supabase = createClient()

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const n = (v: string) => v !== '' ? parseFloat(v) : null

  /* ── Combobox selection handler ── */
  function handleMnemoSelect(ent: Entreprise, cours: number | null) {
    setLoadingCours(true)
    setLinkedEnt(ent)
    setSelectedMnemo(ent.mnemo || '')

    // Computed BPA from table data
    const rn = ent.resultat_net_2025 ?? ent.resultat_net_2024 ?? null
    const titres = ent.titres_admis
    const bpa = (rn != null && titres && titres > 0)
      ? (rn * 1_000_000) / titres : null
    const per = (cours && bpa && bpa !== 0) ? cours / bpa : null
    const divN1 = ent.dividende_2025 ?? ent.dividende_2024 ?? null
    const rendement = (divN1 && cours && cours > 0) ? (divN1 / cours) * 100 : null
    const cap = (cours && titres) ? (cours * titres) / 1_000_000 : null

    setForm(p => ({
      ...p,
      ticker:        ent.mnemo || p.ticker,
      company_name:  ent.valeur || p.company_name,
      sector:        ent.secteur || p.sector,
      current_price: cours != null ? cours.toString() : p.current_price,
      pe_ratio:      per != null ? per.toFixed(2) : p.pe_ratio,
      dividend_yield:rendement != null ? rendement.toFixed(2) : p.dividend_yield,
      market_cap:    cap != null ? cap.toFixed(2) : p.market_cap,
    }))

    setTimeout(() => setLoadingCours(false), 400)
  }

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const payload = {
      ticker:          form.ticker.toUpperCase(),
      company_name:    form.company_name,
      sector:          form.sector,
      market:          form.market,
      recommendation:  form.recommendation,
      target_price:    parseFloat(form.target_price),
      current_price:   n(form.current_price),
      pe_ratio:        n(form.pe_ratio),
      forward_pe:      n(form.forward_pe),
      roe:             n(form.roe),
      roa:             n(form.roa),
      debt_to_equity:  n(form.debt_to_equity),
      revenue_growth:  n(form.revenue_growth),
      earnings_growth: n(form.earnings_growth),
      dividend_yield:  n(form.dividend_yield),
      market_cap:      n(form.market_cap),
      description:     form.description,
      risks:           form.risks,
      catalysts:       form.catalysts,
      status:          submitStatus,
      published_at:    submitStatus === 'published' ? new Date().toISOString() : null,
      author_id:       session.user.id,
    }

    let error
    if (analysis) {
      ;({ error } = await supabase
        .from('fundamental_analyses')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', analysis.id))
    } else {
      ;({ error } = await supabase.from('fundamental_analyses').insert(payload))
    }

    if (error) toast.error(error.message)
    else {
      toast.success(analysis ? 'Analyse modifiée ✓' : submitStatus === 'published' ? 'Analyse publiée ✓' : 'Brouillon enregistré')
      onSaved()
      onClose()
    }
    setLoading(false)
  }

  const upside = form.target_price && form.current_price
    ? (((parseFloat(form.target_price) - parseFloat(form.current_price)) / parseFloat(form.current_price)) * 100)
    : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl rounded-2xl border my-8"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)', background: 'rgba(212,175,55,0.02)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>
              {analysis ? `Modifier · ${analysis.ticker}` : 'Nouvelle analyse fondamentale'}
            </h2>
            {analysis && (
              <p className="text-xs mt-0.5" style={{ color: '#5C5C5C' }}>
                Créée le {format(new Date(analysis.created_at), "d MMM yyyy", { locale: fr })}
              </p>
            )}
          </div>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* ── Combobox mnemo ── */}
          <div>
            <label className="field-label flex items-center gap-2">
              SOCIÉTÉ (MNEMO)
              {loadingCours && (
                <span className="flex items-center gap-1 text-[10px]" style={{ color: '#D4AF37' }}>
                  <Loader2 size={9} className="animate-spin" /> Chargement…
                </span>
              )}
              {linkedEnt && !loadingCours && (
                <span className="flex items-center gap-1 text-[10px]" style={{ color: '#00C853' }}>
                  <Check size={9} /> Données chargées
                </span>
              )}
            </label>
            <MnemoCombobox
              entreprises={entreprises}
              cotations={cotations}
              selectedMnemo={selectedMnemo}
              onSelect={handleMnemoSelect}
              loadingCours={loadingCours}
            />
            <p className="text-[10px] mt-1" style={{ color: '#4A4A4A' }}>
              La sélection pré-remplit automatiquement le cours live, la société, le secteur et les ratios calculables.
            </p>
          </div>

          {/* Bandeau données chargées */}
          <AnimatePresence>
            {linkedEnt && !loadingCours && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="rounded-xl p-3 flex flex-wrap gap-x-5 gap-y-1"
                  style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.18)' }}>
                  {[
                    { l: 'Valeur',        v: linkedEnt.valeur },
                    { l: 'ISIN',          v: linkedEnt.code_isin },
                    { l: 'Secteur',       v: linkedEnt.secteur },
                    { l: 'Titres admis',  v: linkedEnt.titres_admis?.toLocaleString('fr-FR') },
                    { l: 'Cours live',    v: linkedEnt.mnemo && cotations[linkedEnt.mnemo.toUpperCase()]
                        ? cotations[linkedEnt.mnemo.toUpperCase()].toLocaleString('fr-FR', { minimumFractionDigits: 3 })
                        : null, gold: true },
                    { l: 'RN 2025',       v: linkedEnt.resultat_net_2025 != null ? `${linkedEnt.resultat_net_2025} M` : null },
                    { l: 'Div. 2025',     v: linkedEnt.dividende_2025 != null ? `${linkedEnt.dividende_2025}` : null },
                  ].map(({ l, v, gold }) => v ? (
                    <div key={l} className="text-xs">
                      <span style={{ color: '#5C5C5C' }}>{l} : </span>
                      <span className="font-mono font-medium" style={{ color: gold ? '#D4AF37' : '#A0A0A0' }}>{v}</span>
                    </div>
                  ) : null)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ticker (manuel si pas de mnemo) + Marché */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">TICKER *</label>
              <input value={form.ticker}
                onChange={e => { f('ticker', e.target.value.toUpperCase()); setSelectedMnemo(e.target.value.toUpperCase()) }}
                placeholder="SFBT" required className="input-premium font-mono" />
            </div>
            <div>
              <label className="field-label">MARCHÉ</label>
              <select value={form.market} onChange={e => f('market', e.target.value)} className="input-premium">
                {['TUNINDEX', 'TUNINDEX20', 'NASDAQ', 'CAC40', 'DAX', 'CRYPTO'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Société + Secteur */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">NOM SOCIÉTÉ *</label>
              <input value={form.company_name} onChange={e => f('company_name', e.target.value)}
                placeholder="Société Frigorifique…" required className="input-premium" />
            </div>
            <div>
              <label className="field-label">SECTEUR *</label>
              <input value={form.sector} onChange={e => f('sector', e.target.value)}
                placeholder="Agroalimentaire" required className="input-premium" />
            </div>
          </div>

          {/* Recommandation + Cours + Objectif */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label">RECOMMANDATION</label>
              <select value={form.recommendation} onChange={e => f('recommendation', e.target.value)} className="input-premium">
                <option value="strong_buy">🟢 Fort Achat</option>
                <option value="buy">📈 Achat</option>
                <option value="hold">⏸ Neutre</option>
                <option value="sell">📉 Vente</option>
                <option value="strong_sell">🔴 Fort Vente</option>
              </select>
            </div>
            <div>
              <label className="field-label">
                COURS ACTUEL
                {form.current_price && (
                  <span className="ml-1 text-[9px]" style={{ color: '#00C853' }}>● live</span>
                )}
              </label>
              <input type="number" step="0.001" value={form.current_price}
                onChange={e => f('current_price', e.target.value)}
                placeholder="15.250" className="input-premium font-mono" />
            </div>
            <div>
              <label className="field-label">OBJECTIF DE COURS *</label>
              <input type="number" step="0.001" value={form.target_price}
                onChange={e => f('target_price', e.target.value)}
                placeholder="20.000" required className="input-premium font-mono" />
              {upside != null && (
                <div className="text-xs mt-1 font-mono" style={{ color: upside >= 0 ? '#00C853' : '#FF1744' }}>
                  {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% de potentiel
                </div>
              )}
            </div>
          </div>

          {/* Ratios */}
          <div>
            <div className="text-xs font-semibold mb-3 tracking-wider flex items-center gap-2"
              style={{ color: '#5C5C5C' }}>
              RATIOS FINANCIERS
              {linkedEnt && (
                <span className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(0,200,83,0.1)', color: '#00C853' }}>
                  pré-remplis depuis la table
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: 'pe_ratio',       l: 'PER',              p: '12.5'  },
                { k: 'forward_pe',     l: 'PER Forward',      p: '10.2'  },
                { k: 'roe',            l: 'ROE (%)',           p: '18.3'  },
                { k: 'roa',            l: 'ROA (%)',           p: '8.5'   },
                { k: 'debt_to_equity', l: 'D/E ratio',        p: '0.45'  },
                { k: 'revenue_growth', l: 'Croiss. CA (%)',   p: '7.2'   },
                { k: 'earnings_growth',l: 'Croiss. BNA (%)',  p: '12.1'  },
                { k: 'dividend_yield', l: 'Rend. div. (%)',   p: '3.5'   },
                { k: 'market_cap',     l: 'Cap. boursière (M)', p: '450' },
              ].map(({ k, l, p }) => (
                <div key={k}>
                  <label className="block text-[10px] font-medium mb-1 tracking-wide" style={{ color: '#707070' }}>{l}</label>
                  <input type="number" step="0.001"
                    value={(form as any)[k]}
                    onChange={e => f(k, e.target.value)}
                    placeholder={p}
                    className="input-premium font-mono" />
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="field-label">ANALYSE & DESCRIPTION *</label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)}
              required rows={5} placeholder="Analyse détaillée de la valeur…"
              className="input-premium resize-none" />
          </div>

          {/* Risques + Catalyseurs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#FF1744' }}>RISQUES</label>
              <textarea value={form.risks} onChange={e => f('risks', e.target.value)}
                rows={3} placeholder="Facteurs de risque…" className="input-premium resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#00C853' }}>CATALYSEURS</label>
              <textarea value={form.catalysts} onChange={e => f('catalysts', e.target.value)}
                rows={3} placeholder="Déclencheurs de hausse…" className="input-premium resize-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--noir-border)' }}>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button type="submit" disabled={loading}
              onClick={() => setSubmitStatus('draft')}
              className="btn-ghost flex-1" style={{ color: '#A0A0A0' }}>
              {loading && submitStatus === 'draft'
                ? <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                : 'Brouillon'}
            </button>
            <motion.button type="submit" disabled={loading}
              onClick={() => setSubmitStatus('published')}
              whileTap={{ scale: 0.97 }}
              className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading && submitStatus === 'published'
                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : analysis ? 'Mettre à jour' : 'Publier'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   EntrepriseForm
═══════════════════════════════════════════════════════════════════ */
type EntrepriseFormData = {
  secteur: string; valeur: string; code_isin: string; mnemo: string
  compar_grp: string; mode_cc: string; titres_admis: string
  resultat_net_2024: string; resultat_net_2025: string
  resultat_net_2026: string; resultat_net_2027: string; resultat_net_2028: string
  resultat_net_2029: string; resultat_net_2030: string
  dividende_2024: string; dividende_2025: string
  dividende_2026: string; dividende_2027: string; dividende_2028: string
  dividende_2029: string; dividende_2030: string
  benefice_par_action: string; rendement_dividende: string
}

function blank(): EntrepriseFormData {
  const d: any = {
    secteur: '', valeur: '', code_isin: '', mnemo: '',
    compar_grp: '', mode_cc: 'Continu', titres_admis: '',
    benefice_par_action: '', rendement_dividende: '',
  }
  ALL_RN_YEARS.forEach(y => d[`resultat_net_${y}`] = '')
  ALL_DIV_YEARS.forEach(y => d[`dividende_${y}`] = '')
  return d
}

function entToForm(e: Entreprise): EntrepriseFormData {
  const d: any = {
    secteur: e.secteur || '', valeur: e.valeur || '',
    code_isin: e.code_isin || '', mnemo: e.mnemo || '',
    compar_grp: e.compar_grp || '', mode_cc: e.mode_cc || 'Continu',
    titres_admis: e.titres_admis?.toString() || '',
    benefice_par_action: e.benefice_par_action?.toString() || '',
    rendement_dividende: e.rendement_dividende?.toString() || '',
  }
  ALL_RN_YEARS.forEach(y => d[`resultat_net_${y}`] = (e as any)[`resultat_net_${y}`]?.toString() || '')
  ALL_DIV_YEARS.forEach(y => d[`dividende_${y}`] = (e as any)[`dividende_${y}`]?.toString() || '')
  return d
}

function EntrepriseForm({
  entreprise, cotations, onClose, onSaved,
}: {
  entreprise: Entreprise | null
  cotations: Record<string, number>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm]       = useState<EntrepriseFormData>(entreprise ? entToForm(entreprise) : blank())
  const [section, setSection] = useState<'info' | 'rn' | 'div' | 'ratios'>('info')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const f  = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const n  = (v: string) => v !== '' ? parseFloat(v) : null
  const ni = (v: string) => v !== '' ? parseInt(v) : null

  // Cours live si mnemo renseigné
  const coursLive = form.mnemo ? cotations[form.mnemo.toUpperCase()] ?? null : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload: any = {
      secteur: form.secteur || null, valeur: form.valeur || null,
      code_isin: form.code_isin || null, mnemo: form.mnemo || null,
      compar_grp: form.compar_grp || null, mode_cc: form.mode_cc || null,
      titres_admis: ni(form.titres_admis),
      benefice_par_action: n(form.benefice_par_action),
      rendement_dividende: n(form.rendement_dividende),
    }
    ALL_RN_YEARS.forEach(y => { payload[`resultat_net_${y}`] = n((form as any)[`resultat_net_${y}`]) })
    ALL_DIV_YEARS.forEach(y => { payload[`dividende_${y}`]   = n((form as any)[`dividende_${y}`]) })

    let error
    if (entreprise) {
      ;({ error } = await supabase.from('entreprises').update(payload).eq('id', entreprise.id))
    } else {
      ;({ error } = await supabase.from('entreprises').insert(payload))
    }
    if (error) toast.error(error.message)
    else { toast.success(entreprise ? 'Société modifiée ✓' : 'Société créée ✓'); onSaved(); onClose() }
    setLoading(false)
  }

  const tabs = [
    { id: 'info', label: 'Infos' }, { id: 'rn', label: 'Résultat Net' },
    { id: 'div',  label: 'Dividendes' }, { id: 'ratios', label: 'Ratios' },
  ] as const

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-3xl rounded-2xl border my-8"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>
              {entreprise ? `Modifier · ${entreprise.mnemo || entreprise.valeur}` : 'Nouvelle société'}
            </h2>
            {coursLive && (
              <p className="text-xs mt-0.5 font-mono" style={{ color: '#D4AF37' }}>
                ● Cours live : {coursLive.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
              </p>
            )}
          </div>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setSection(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all"
              style={{
                background: section === t.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                color: section === t.id ? '#D4AF37' : '#5C5C5C',
                border: `1px solid ${section === t.id ? 'rgba(212,175,55,0.28)' : 'transparent'}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* INFO */}
          {section === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">NOM / VALEUR *</label>
                  <input value={form.valeur} onChange={e => f('valeur', e.target.value)}
                    placeholder="SFBT - Sté Frigorifique…" required className="input-premium" />
                </div>
                <div>
                  <label className="field-label">SECTEUR</label>
                  <input value={form.secteur} onChange={e => f('secteur', e.target.value)}
                    placeholder="Agroalimentaire" className="input-premium" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="field-label">CODE ISIN</label>
                  <input value={form.code_isin} onChange={e => f('code_isin', e.target.value.toUpperCase())}
                    placeholder="TN0007110012" className="input-premium font-mono" />
                </div>
                <div>
                  <label className="field-label">MNÉMO *</label>
                  <input value={form.mnemo} onChange={e => f('mnemo', e.target.value.toUpperCase())}
                    placeholder="SFBT" required className="input-premium font-mono" />
                  {coursLive && (
                    <p className="text-[10px] mt-1 font-mono" style={{ color: '#D4AF37' }}>
                      ● {coursLive.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} (live)
                    </p>
                  )}
                </div>
                <div>
                  <label className="field-label">MODE COTATION</label>
                  <select value={form.mode_cc} onChange={e => f('mode_cc', e.target.value)} className="input-premium">
                    {['Continu', 'Fixing', 'Continu+Fixing'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">GROUPE COMPARAISON</label>
                  <input value={form.compar_grp} onChange={e => f('compar_grp', e.target.value)}
                    placeholder="Agro" className="input-premium" />
                </div>
                <div>
                  <label className="field-label">TITRES ADMIS</label>
                  <input type="number" value={form.titres_admis}
                    onChange={e => f('titres_admis', e.target.value)}
                    placeholder="28 500 000" className="input-premium font-mono" />
                  {form.titres_admis && coursLive && (
                    <p className="text-[10px] mt-1" style={{ color: '#D4AF37' }}>
                      Capitalisation : {(parseInt(form.titres_admis) * coursLive / 1_000_000).toFixed(2)} M
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* RÉSULTAT NET */}
          {section === 'rn' && (
            <motion.div key="rn" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
                <AlertCircle size={13} style={{ color: '#D4AF37', flexShrink: 0 }} />
                <p className="text-xs" style={{ color: '#A0A0A0' }}>
                  Données <strong style={{ color: '#D4AF37' }}>en millions</strong> de la devise locale.
                  2024 (n-2) et 2025 (n-1) sont réels · 2026 et au-delà sont des prévisions.
                </p>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#5C5C5C' }}>HISTORIQUE (n-2 · n-1)</div>
                <div className="grid grid-cols-2 gap-3">
                  {[2024, 2025].map(y => (
                    <div key={y}>
                      <label className="field-label">RN {y} {y === 2024 ? '(n-2)' : '(n-1)'} — M</label>
                      <input type="number" step="0.01"
                        value={(form as any)[`resultat_net_${y}`]}
                        onChange={e => f(`resultat_net_${y}`, e.target.value)}
                        placeholder="0.00" className="input-premium font-mono" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#5C5C5C' }}>PRÉVISIONS 2026 → 2030</div>
                <div className="grid grid-cols-5 gap-3">
                  {FORECAST_YEARS.map(y => (
                    <div key={y}>
                      <label className="field-label">RN {y}</label>
                      <input type="number" step="0.01"
                        value={(form as any)[`resultat_net_${y}`]}
                        onChange={e => f(`resultat_net_${y}`, e.target.value)}
                        placeholder="0.00" className="input-premium font-mono text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* DIVIDENDES */}
          {section === 'div' && (
            <motion.div key="div" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'rgba(0,200,83,0.05)', border: '1px solid rgba(0,200,83,0.12)' }}>
                <AlertCircle size={13} style={{ color: '#00C853', flexShrink: 0 }} />
                <p className="text-xs" style={{ color: '#A0A0A0' }}>
                  Dividende par action en unités monétaires. 2024 (n-2) et 2025 (n-1) sont réels.
                </p>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#5C5C5C' }}>HISTORIQUE (n-2 · n-1)</div>
                <div className="grid grid-cols-2 gap-3">
                  {[2024, 2025].map(y => (
                    <div key={y}>
                      <label className="field-label">DIV {y} {y === 2024 ? '(n-2)' : '(n-1)'}</label>
                      <input type="number" step="0.001"
                        value={(form as any)[`dividende_${y}`]}
                        onChange={e => f(`dividende_${y}`, e.target.value)}
                        placeholder="0.000" className="input-premium font-mono" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#5C5C5C' }}>PRÉVISIONS 2026 → 2030</div>
                <div className="grid grid-cols-5 gap-3">
                  {FORECAST_YEARS.map(y => (
                    <div key={y}>
                      <label className="field-label">DIV {y}</label>
                      <input type="number" step="0.001"
                        value={(form as any)[`dividende_${y}`]}
                        onChange={e => f(`dividende_${y}`, e.target.value)}
                        placeholder="0.000" className="input-premium font-mono text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* RATIOS */}
          {section === 'ratios' && (
            <motion.div key="ratios" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'rgba(33,150,243,0.06)', border: '1px solid rgba(33,150,243,0.12)' }}>
                <AlertCircle size={13} style={{ color: '#2196F3', flexShrink: 0 }} />
                <p className="text-xs" style={{ color: '#A0A0A0' }}>
                  Valeurs calculées automatiquement depuis le cours live et les données financières.
                  Saisissez manuellement pour remplacer.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">BÉNÉFICE PAR ACTION (BPA)</label>
                  <input type="number" step="0.001" value={form.benefice_par_action}
                    onChange={e => f('benefice_par_action', e.target.value)}
                    placeholder="Calculé auto si vide" className="input-premium font-mono" />
                </div>
                <div>
                  <label className="field-label">RENDEMENT DIVIDENDE (%)</label>
                  <input type="number" step="0.01" value={form.rendement_dividende}
                    onChange={e => f('rendement_dividende', e.target.value)}
                    placeholder="Calculé auto si vide" className="input-premium font-mono" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--noir-border)' }}>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <motion.button type="submit" disabled={loading}
              whileTap={{ scale: 0.97 }} className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : entreprise ? 'Mettre à jour' : 'Créer'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
