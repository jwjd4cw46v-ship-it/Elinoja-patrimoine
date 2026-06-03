'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Edit, BarChart2, Eye, X, Building2,
  ChevronDown, ChevronUp, RefreshCw, AlertCircle,
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
  // 2024 = n-2 (historique), 2025 = n-1 (historique), 2026+ = prévisions
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
const CURRENT_YEAR  = 2026
const HIST_YEARS    = [2024, 2025]               // réel connu
const FORECAST_YEARS = [2026, 2027, 2028, 2029, 2030]
const ALL_RN_YEARS  = [...HIST_YEARS, ...FORECAST_YEARS]
const ALL_DIV_YEARS = [...HIST_YEARS, ...FORECAST_YEARS]

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
  const [analyses,     setAnalyses]     = useState<FundamentalAnalysis[]>([])
  const [entreprises,  setEntreprises]  = useState<Entreprise[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [showEntForm,  setShowEntForm]  = useState(false)
  const [editing,      setEditing]      = useState<FundamentalAnalysis | null>(null)
  const [editingEnt,   setEditingEnt]   = useState<Entreprise | null>(null)
  const [activeTab,    setActiveTab]    = useState<'analyses' | 'entreprises'>('analyses')
  const supabase = createClient()

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
      .order('id', { ascending: true })
    if (data) setEntreprises(data as Entreprise[])
  }

  useEffect(() => {
    fetchAnalyses()
    fetchEntreprises()
    const ch1 = supabase.channel('fa-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fundamental_analyses' }, fetchAnalyses)
      .subscribe()
    const ch2 = supabase.channel('ent-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entreprises' }, fetchEntreprises)
      .subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [])

  async function deleteAnalysis(id: string) {
    if (!confirm('Supprimer cette analyse ?')) return
    await supabase.from('fundamental_analyses').delete().eq('id', id)
    toast.success('Analyse supprimée')
    fetchAnalyses()
  }

  async function deleteEntreprise(id: number) {
    if (!confirm('Supprimer cette entreprise ?')) return
    await supabase.from('entreprises').delete().eq('id', id)
    toast.success('Entreprise supprimée')
    fetchEntreprises()
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Analyses Fondamentales</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {analyses.filter(a => a.status === 'published').length} publiées · {entreprises.length} entreprises
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'entreprises' ? (
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => { setEditingEnt(null); setShowEntForm(true) }}
              className="btn-gold flex items-center gap-2">
              <Building2 size={14} /> Nouvelle entreprise
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
            {tab === 'analyses' ? 'ANALYSES' : 'ENTREPRISES'}
          </button>
        ))}
      </div>

      {/* ── ANALYSES TAB ── */}
      {activeTab === 'analyses' && (
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
      )}

      {/* ── ENTREPRISES TAB ── */}
      {activeTab === 'entreprises' && (
        <div className="card-premium overflow-x-auto">
          {entreprises.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
              <p className="text-sm" style={{ color: '#5C5C5C' }}>Aucune entreprise enregistrée</p>
            </div>
          ) : (
            <table className="table-premium min-w-[900px]">
              <thead>
                <tr>
                  <th>Valeur</th>
                  <th>ISIN</th>
                  <th>Mnemo</th>
                  <th>Secteur</th>
                  <th className="text-right">Titres admis</th>
                  <th className="text-right">RN 2024</th>
                  <th className="text-right">RN 2025</th>
                  <th className="text-right">Div. 2024</th>
                  <th className="text-right">Div. 2025</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entreprises.map((e, i) => (
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
                    <td className="text-right"><span className="font-mono text-xs" style={{ color: '#A0A0A0' }}>{e.titres_admis?.toLocaleString('fr-FR') || '—'}</span></td>
                    <td className="text-right"><span className="font-mono text-xs" style={{ color: '#D4AF37' }}>{e.resultat_net_2024 != null ? Number(e.resultat_net_2024).toLocaleString('fr-FR') : '—'}</span></td>
                    <td className="text-right"><span className="font-mono text-xs" style={{ color: '#D4AF37' }}>{e.resultat_net_2025 != null ? Number(e.resultat_net_2025).toLocaleString('fr-FR') : '—'}</span></td>
                    <td className="text-right"><span className="font-mono text-xs" style={{ color: '#00C853' }}>{e.dividende_2024 != null ? Number(e.dividende_2024).toLocaleString('fr-FR') : '—'}</span></td>
                    <td className="text-right"><span className="font-mono text-xs" style={{ color: '#00C853' }}>{e.dividende_2025 != null ? Number(e.dividende_2025).toLocaleString('fr-FR') : '—'}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingEnt(e); setShowEntForm(true) }} className="p-1.5 rounded-lg" style={{ color: '#A0A0A0' }}><Edit size={13} /></button>
                        <button onClick={() => deleteEntreprise(e.id)} className="p-1.5 rounded-lg" style={{ color: '#5C5C5C' }}
                          onMouseOver={ev => (ev.currentTarget.style.color = '#FF1744')}
                          onMouseOut={ev => (ev.currentTarget.style.color = '#5C5C5C')}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <FundamentalAnalysisForm
            analysis={editing}
            onClose={() => setShowForm(false)}
            onSaved={fetchAnalyses}
          />
        )}
        {showEntForm && (
          <EntrepriseForm
            entreprise={editingEnt}
            onClose={() => setShowEntForm(false)}
            onSaved={fetchEntreprises}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────────
   EntrepriseForm — modal for the entreprises table
───────────────────────────────────────────── */
type EntrepriseFormData = {
  secteur: string
  valeur: string
  code_isin: string
  mnemo: string
  compar_grp: string
  mode_cc: string
  titres_admis: string
  // result_net per year (2024=n-2, 2025=n-1, 2026-2030=prévisions)
  resultat_net_2024: string
  resultat_net_2025: string
  resultat_net_2026: string
  resultat_net_2027: string
  resultat_net_2028: string
  resultat_net_2029: string
  resultat_net_2030: string
  // dividende per year
  dividende_2024: string
  dividende_2025: string
  dividende_2026: string
  dividende_2027: string
  dividende_2028: string
  dividende_2029: string
  dividende_2030: string
  benefice_par_action: string
  rendement_dividende: string
}

function blankEntForm(): EntrepriseFormData {
  const f: any = {
    secteur: '', valeur: '', code_isin: '', mnemo: '',
    compar_grp: '', mode_cc: 'Continu',
    titres_admis: '', benefice_par_action: '', rendement_dividende: '',
  }
  ALL_RN_YEARS.forEach(y => f[`resultat_net_${y}`] = '')
  ALL_DIV_YEARS.forEach(y => f[`dividende_${y}`] = '')
  return f
}

function entToForm(e: Entreprise): EntrepriseFormData {
  const f: any = {
    secteur: e.secteur || '',
    valeur: e.valeur || '',
    code_isin: e.code_isin || '',
    mnemo: e.mnemo || '',
    compar_grp: e.compar_grp || '',
    mode_cc: e.mode_cc || 'Continu',
    titres_admis: e.titres_admis?.toString() || '',
    benefice_par_action: e.benefice_par_action?.toString() || '',
    rendement_dividende: e.rendement_dividende?.toString() || '',
  }
  ALL_RN_YEARS.forEach(y => f[`resultat_net_${y}`] = (e as any)[`resultat_net_${y}`]?.toString() || '')
  ALL_DIV_YEARS.forEach(y => f[`dividende_${y}`] = (e as any)[`dividende_${y}`]?.toString() || '')
  return f
}

function EntrepriseForm({ entreprise, onClose, onSaved }: {
  entreprise: Entreprise | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm]       = useState<EntrepriseFormData>(entreprise ? entToForm(entreprise) : blankEntForm())
  const [loading, setLoading] = useState(false)
  const [section, setSection] = useState<'info' | 'rn' | 'div' | 'ratios'>('info')
  const supabase = createClient()

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const n = (v: string) => v !== '' ? parseFloat(v) : null
  const ni = (v: string) => v !== '' ? parseInt(v) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload: any = {
      secteur: form.secteur || null,
      valeur: form.valeur || null,
      code_isin: form.code_isin || null,
      mnemo: form.mnemo || null,
      compar_grp: form.compar_grp || null,
      mode_cc: form.mode_cc || null,
      titres_admis: ni(form.titres_admis),
      benefice_par_action: n(form.benefice_par_action),
      rendement_dividende: n(form.rendement_dividende),
    }
    ALL_RN_YEARS.forEach(y => { payload[`resultat_net_${y}`] = n((form as any)[`resultat_net_${y}`]) })
    ALL_DIV_YEARS.forEach(y => { payload[`dividende_${y}`] = n((form as any)[`dividende_${y}`]) })

    let error
    if (entreprise) {
      ({ error } = await supabase.from('entreprises').update(payload).eq('id', entreprise.id))
    } else {
      ({ error } = await supabase.from('entreprises').insert(payload))
    }

    if (error) toast.error(error.message)
    else { toast.success(entreprise ? 'Entreprise modifiée' : 'Entreprise créée'); onSaved(); onClose() }
    setLoading(false)
  }

  const tabs = [
    { id: 'info',   label: 'Infos' },
    { id: 'rn',     label: 'Résultat Net' },
    { id: 'div',    label: 'Dividendes' },
    { id: 'ratios', label: 'Ratios' },
  ] as const

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-3xl rounded-2xl border my-8"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        {/* Modal header */}
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>
              {entreprise ? 'Modifier entreprise' : 'Nouvelle entreprise'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#5C5C5C' }}>
              Données financières · historique + prévisions
            </p>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setSection(t.id)}
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

          {/* ── INFO ── */}
          {section === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">NOM / VALEUR *</label>
                  <input value={form.valeur} onChange={e => f('valeur', e.target.value)}
                    placeholder="SFBT - Sté Frigorifique..." required className="input-premium" />
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
                  <label className="field-label">MNÉMO</label>
                  <input value={form.mnemo} onChange={e => f('mnemo', e.target.value.toUpperCase())}
                    placeholder="SFBT" className="input-premium font-mono" />
                </div>
                <div>
                  <label className="field-label">MODE DE COTATION</label>
                  <select value={form.mode_cc} onChange={e => f('mode_cc', e.target.value)} className="input-premium">
                    {['Continu', 'Fixing', 'Continu+Fixing'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">GROUPE DE COMPARAISON</label>
                  <input value={form.compar_grp} onChange={e => f('compar_grp', e.target.value)}
                    placeholder="Agro" className="input-premium" />
                </div>
                <div>
                  <label className="field-label">TITRES ADMIS</label>
                  <input type="number" value={form.titres_admis} onChange={e => f('titres_admis', e.target.value)}
                    placeholder="28 500 000" className="input-premium font-mono" />
                  <p className="text-[10px] mt-1" style={{ color: '#4A4A4A' }}>
                    Utilisé pour calculer la capitalisation boursière
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── RÉSULTAT NET ── */}
          {section === 'rn' && (
            <motion.div key="rn" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
                <AlertCircle size={13} style={{ color: '#D4AF37', flexShrink: 0 }} />
                <p className="text-xs" style={{ color: '#A0A0A0' }}>
                  Les données sont saisies <strong style={{ color: '#D4AF37' }}>en millions</strong> de la devise locale.
                  Les années 2022–2023 sont historiques (n-2, n-1). 2024 et au-delà sont des prévisions.
                </p>
              </div>

              {/* historical */}
              <div>
                <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#5C5C5C' }}>
                  HISTORIQUE (n-2 · n-1)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[2024, 2025].map(y => (
                    <div key={y}>
                      <label className="field-label">
                        RÉSULTAT NET {y} {y === 2024 ? '(n-2)' : '(n-1)'} — en M
                      </label>
                      <input type="number" step="0.01"
                        value={(form as any)[`resultat_net_${y}`]}
                        onChange={e => f(`resultat_net_${y}`, e.target.value)}
                        placeholder="0.00" className="input-premium font-mono" />
                    </div>
                  ))}
                </div>
              </div>

              {/* forecasts */}
              <div>
                <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#5C5C5C' }}>
                  PRÉVISIONS 2026 → 2030
                </div>
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

          {/* ── DIVIDENDES ── */}
          {section === 'div' && (
            <motion.div key="div" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'rgba(0,200,83,0.05)', border: '1px solid rgba(0,200,83,0.12)' }}>
                <AlertCircle size={13} style={{ color: '#00C853', flexShrink: 0 }} />
                <p className="text-xs" style={{ color: '#A0A0A0' }}>
                  Dividende par action en unités monétaires. Les années 2022–2023 sont historiques.
                </p>
              </div>

              <div>
                <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#5C5C5C' }}>HISTORIQUE (n-2 · n-1)</div>
                <div className="grid grid-cols-2 gap-3">
                  {[2024, 2025].map(y => (
                    <div key={y}>
                      <label className="field-label">DIVIDENDE {y} {y === 2024 ? '(n-2)' : '(n-1)'}</label>
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

          {/* ── RATIOS ── */}
          {section === 'ratios' && (
            <motion.div key="ratios" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'rgba(33,150,243,0.06)', border: '1px solid rgba(33,150,243,0.12)' }}>
                <AlertCircle size={13} style={{ color: '#2196F3', flexShrink: 0 }} />
                <p className="text-xs" style={{ color: '#A0A0A0' }}>
                  Ces valeurs seront complétées automatiquement si elles peuvent être calculées depuis le cours et les données financières. Vous pouvez les saisir manuellement pour les remplacer.
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

          {/* Actions */}
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

/* ─────────────────────────────────────────────
   FundamentalAnalysisForm (unchanged from original,
   kept here for completeness)
───────────────────────────────────────────── */
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">TICKER *</label>
              <input value={form.ticker} onChange={e => f('ticker', e.target.value.toUpperCase())} placeholder="SFBT" required className="input-premium" />
            </div>
            <div>
              <label className="field-label">MARCHÉ</label>
              <select value={form.market} onChange={e => f('market', e.target.value)} className="input-premium">
                {['TUNINDEX','TUNINDEX20','NASDAQ','CAC40','DAX','CRYPTO'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">NOM SOCIÉTÉ *</label>
              <input value={form.company_name} onChange={e => f('company_name', e.target.value)} placeholder="Société Frigorifique..." required className="input-premium" />
            </div>
            <div>
              <label className="field-label">SECTEUR *</label>
              <input value={form.sector} onChange={e => f('sector', e.target.value)} placeholder="Agroalimentaire" required className="input-premium" />
            </div>
          </div>
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
              <label className="field-label">COURS ACTUEL</label>
              <input type="number" step="0.001" value={form.current_price} onChange={e => f('current_price', e.target.value)} placeholder="15.250" className="input-premium" />
            </div>
            <div>
              <label className="field-label">OBJECTIF *</label>
              <input type="number" step="0.001" value={form.target_price} onChange={e => f('target_price', e.target.value)} placeholder="20.000" required className="input-premium" />
              {upside && <div className="text-xs mt-1" style={{ color: parseFloat(upside) > 0 ? '#00C853' : '#FF1744' }}>{parseFloat(upside) > 0 ? '+' : ''}{upside}%</div>}
            </div>
          </div>
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
          <div>
            <label className="field-label">ANALYSE & DESCRIPTION *</label>
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
