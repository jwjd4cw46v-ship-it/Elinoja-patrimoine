'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart2, Search, X, TrendingUp, TrendingDown, Minus,
  Building2, RefreshCw, ChevronRight, Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
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

// cotations = map MNEMO → cours (number), identique à la page admin
// (pas besoin de l'objet complet Cotation pour la page client)

/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */
const recoCfg: Record<string, { label: string; cls: string; icon: any; color: string }> = {
  strong_buy:  { label: 'FORT ACHAT', cls: 'badge-buy',  icon: TrendingUp,   color: '#00C853' },
  buy:         { label: 'ACHAT',      cls: 'badge-buy',  icon: TrendingUp,   color: '#00C853' },
  hold:        { label: 'NEUTRE',     cls: 'badge-hold', icon: Minus,        color: '#2196F3' },
  sell:        { label: 'VENTE',      cls: 'badge-sell', icon: TrendingDown, color: '#FF1744' },
  strong_sell: { label: 'FORT VENTE', cls: 'badge-sell', icon: TrendingDown, color: '#FF1744' },
}

// En 2026 : 2024=n-2 réel, 2025=n-1 réel, 2026=année courante, 2027→2030=prévisions
const CHART_YEARS  = [2024, 2025, 2026, 2027, 2028, 2029, 2030]
const CURRENT_YEAR = 2026

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtM(n: number | null | undefined): string {
  if (n == null) return '—'
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)} Md`
  return `${n.toFixed(1)} M`
}

/** Build chart data from entreprise fields */
function buildChartData(e: Entreprise) {
  return CHART_YEARS.map(y => ({
    year: String(y),
    rn:   (e as any)[`resultat_net_${y}`] as number | null,
    div:  (e as any)[`dividende_${y}`]    as number | null,
    // 2024 & 2025 = réel connu · 2026+ = prévisions
    isForecast: y >= CURRENT_YEAR,
  })).filter(d => d.rn != null || d.div != null)
}

/** Compute ratios from entreprise + live cours */
function computeRatios(e: Entreprise, cours: number | null) {
  const titres = e.titres_admis
  const capitalisation = cours && titres ? cours * titres : null

  // BPA : utilise RN n-1 (2025) en priorité, sinon n-2 (2024)
  // RN est en millions → on ramène en unités pour diviser par titres
  const currentRN = e.resultat_net_2025 ?? e.resultat_net_2024 ?? null
  const bpaCalc = (currentRN != null && titres && titres > 0)
    ? (currentRN * 1_000_000) / titres
    : null
  const bpa = e.benefice_par_action ?? bpaCalc

  // PER = cours / BPA
  const per = (cours && bpa && bpa !== 0) ? cours / bpa : null

  // Dividende courant : n-1 (2025) en priorité
  const currentDiv = e.dividende_2025 ?? e.dividende_2024 ?? null

  // Rendement dividende = div / cours × 100
  const rendCalc = (currentDiv != null && cours && cours > 0)
    ? (currentDiv / cours) * 100
    : null
  const rendement = e.rendement_dividende ?? rendCalc

  // Pay-out = div / BPA × 100
  const payOut = (currentDiv != null && bpa && bpa !== 0)
    ? (currentDiv / bpa) * 100
    : null

  // Croissance RN : (RN_2025 - RN_2024) / |RN_2024| × 100
  const rn_nm1 = e.resultat_net_2025  // n-1
  const rn_nm2 = e.resultat_net_2024  // n-2
  const rnGrowth = (rn_nm1 != null && rn_nm2 != null && rn_nm2 !== 0)
    ? ((rn_nm1 - rn_nm2) / Math.abs(rn_nm2)) * 100
    : null

  return { capitalisation, bpa, per, rendement, payOut, rnGrowth }
}

/* ─────────────────────────────────────────────
   Custom Tooltip for the bar chart
───────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const isForecast = payload[0]?.payload?.isForecast
  return (
    <div className="rounded-xl border px-4 py-3 text-xs"
      style={{
        background: '#0E0E0E',
        borderColor: 'rgba(212,175,55,0.25)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
      <div className="font-bold mb-2 flex items-center gap-2" style={{ color: '#F5F5F5' }}>
        {label}
        {isForecast && (
          <span className="text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
            PRÉVISION
          </span>
        )}
      </div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span style={{ color: '#707070' }}>{p.name === 'rn' ? 'Résultat net' : 'Dividende / action'} :</span>
          <span className="font-mono font-bold" style={{ color: p.fill }}>
            {p.name === 'rn' ? fmtM(p.value) : fmt(p.value, 3)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Ratio Badge
───────────────────────────────────────────── */
function RatioBadge({
  label, value, suffix = '', color, sub,
}: { label: string; value: string | null; suffix?: string; color?: string; sub?: string }) {
  return (
    <div className="p-3 rounded-xl"
      style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
      <div className="text-[10px] font-medium mb-1.5 tracking-wide" style={{ color: '#5C5C5C' }}>{label}</div>
      <div className="text-base font-bold font-mono" style={{ color: color || '#F5F5F5' }}>
        {value != null ? `${value}${suffix}` : '—'}
      </div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: '#4A4A4A' }}>{sub}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function ClientFondamentalesPage() {
  const [analyses,    setAnalyses]    = useState<FundamentalAnalysis[]>([])
  const [entreprises, setEntreprises] = useState<Entreprise[]>([])
  const [cotations,   setCotations]   = useState<Record<string, number>>({})
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('all')
  const [selected,    setSelected]    = useState<{
    analysis: FundamentalAnalysis
    entreprise: Entreprise | null
    cours: number | null
  } | null>(null)
  const supabase = createClient()

  /* ── Fetch data ── */
  async function fetchAll() {
    const [{ data: fa }, { data: ent }] = await Promise.all([
      supabase.from('fundamental_analyses').select('*').eq('status', 'published').order('published_at', { ascending: false }),
      supabase.from('entreprises').select('*'),
    ])
    if (fa) setAnalyses(fa as any)
    if (ent) setEntreprises(ent as Entreprise[])
    setLoading(false)
  }

  async function fetchCotations() {
    try {
      const res = await fetch('/api/cotations')
      if (!res.ok) return
      const json = await res.json()
      // L'API retourne { markets: [...] } ou un tableau direct
      const markets: any[] = Array.isArray(json) ? json : (json.markets ?? [])
      const map: Record<string, number> = {}
      markets.forEach((m: any) => {
        // Clé = ticker BVMT (identique au mnemo dans la table entreprises)
        const nom = (m.referentiel?.ticker || m.referentiel?.stockName || m.nom || '').toUpperCase()
        const last = m.last ?? m.dernier ?? null
        if (nom && last != null) map[nom] = last
      })
      setCotations(map)
      console.log('[Cotations] chargées:', Object.keys(map).length, 'valeurs. Extrait:', Object.entries(map).slice(0, 5))
    } catch (err) {
      console.error('[Cotations] erreur fetch:', err)
    }
  }

  useEffect(() => {
    fetchAll()
    fetchCotations()

    // Realtime subscriptions
    const ch1 = supabase.channel('fa-client')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fundamental_analyses' }, fetchAll)
      .subscribe()
    const ch2 = supabase.channel('ent-client')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entreprises' }, fetchAll)
      .subscribe()

    // Refresh cotations every 60 s
    const timer = setInterval(fetchCotations, 60_000)
    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
      clearInterval(timer)
    }
  }, [])

  /* ── Helpers ── */
  function getCours(a: FundamentalAnalysis): number | null {
    // 1. Cherche d'abord via mnemo dans la table entreprises
    const ent = entreprises.find(e =>
      e.mnemo?.toUpperCase() === a.ticker.toUpperCase() ||
      e.valeur?.toUpperCase().includes(a.ticker.toUpperCase())
    )
    // 2. La clé dans cotations = mnemo BVMT en majuscules
    const key = (ent?.mnemo ?? a.ticker).toUpperCase()
    // 3. Cours live en priorité, sinon current_price de la table
    const live = cotations[key] ?? null
    return live ?? (a.current_price ?? null)
  }

  function getEntreprise(a: FundamentalAnalysis): Entreprise | null {
    return entreprises.find(e =>
      e.mnemo?.toUpperCase() === a.ticker.toUpperCase() ||
      e.valeur?.toUpperCase().includes(a.ticker.toUpperCase())
    ) ?? null
  }

  /* ── Filter ── */
  const filtered = useMemo(() => analyses.filter(a => {
    const matchSearch = a.ticker.toLowerCase().includes(search.toLowerCase()) ||
      a.company_name.toLowerCase().includes(search.toLowerCase()) ||
      a.sector.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.recommendation === filter
    return matchSearch && matchFilter
  }), [analyses, search, filter])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Analyses Fondamentales</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {filtered.length} analyse{filtered.length !== 1 ? 's' : ''} · cotations en direct
          </p>
        </div>
        <button onClick={fetchCotations}
          className="p-2 rounded-lg transition-colors"
          style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}
          title="Rafraîchir les cours">
          <RefreshCw size={13} style={{ color: '#5C5C5C' }} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5C5C5C' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ticker, société, secteur..." className="input-premium pl-9 w-56" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'strong_buy', 'buy', 'hold', 'sell', 'strong_sell'] as const).map(f => {
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

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card-premium p-5 space-y-3">
              <div className="flex gap-3">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-28" /><div className="skeleton h-3 w-20" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0,1,2].map(j => <div key={j} className="skeleton h-14 rounded-lg" />)}
              </div>
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
            const reco    = recoCfg[a.recommendation as keyof typeof recoCfg]
            const RecoIcon = reco?.icon || Minus
            const cours   = getCours(a)
            const ent     = getEntreprise(a)
            const ratios  = ent ? computeRatios(ent, cours) : null
            const upside  = a.target_price && cours
              ? (((a.target_price - cours) / cours) * 100).toFixed(1)
              : null

            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected({ analysis: a, entreprise: ent, cours })}
                className="card-premium p-5 cursor-pointer group">

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                      {a.ticker.slice(0, 4)}
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: '#F5F5F5' }}>{a.ticker}</div>
                      <div className="text-[11px]" style={{ color: '#5C5C5C' }}>{a.sector}</div>
                    </div>
                  </div>
                  {reco && (
                    <span className={`${reco.cls} text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0`}>
                      {reco.label}
                    </span>
                  )}
                </div>

                <div className="text-sm font-medium mb-3 line-clamp-1" style={{ color: '#C0C0C0' }}>
                  {a.company_name}
                </div>

                {/* Cours / Objectif / Potentiel */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { l: 'Cours',     v: cours ? fmt(cours, 3) : '—',                          c: '#A0A0A0' },
                    { l: 'Objectif',  v: a.target_price ? fmt(a.target_price, 3) : '—',        c: reco?.color || '#D4AF37' },
                    { l: 'Potentiel', v: upside ? `${parseFloat(upside) > 0 ? '+' : ''}${upside}%` : '—',
                      c: upside ? (parseFloat(upside) > 0 ? '#00C853' : '#FF1744') : '#707070' },
                  ].map(p => (
                    <div key={p.l} className="text-center p-2 rounded-lg"
                      style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
                      <div className="text-xs font-bold font-mono" style={{ color: p.c }}>{p.v}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: '#4A4A4A' }}>{p.l}</div>
                    </div>
                  ))}
                </div>

                {/* Valorisation + ratios rapides */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Capitalisation */}
                  <div className="text-center p-2 rounded"
                    style={{ background: 'rgba(212,175,55,0.05)' }}>
                    <div className="text-xs font-mono font-bold" style={{ color: ratios?.capitalisation ? '#D4AF37' : '#3A3A3A' }}>
                      {ratios?.capitalisation ? fmtM(ratios.capitalisation / 1_000_000) : '—'}
                    </div>
                    <div className="text-[10px]" style={{ color: '#4A4A4A' }}>Capitalisation</div>
                  </div>
                  {/* PER */}
                  <div className="text-center p-2 rounded"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="text-xs font-mono" style={{ color: ratios?.per ? '#A0A0A0' : '#3A3A3A' }}>
                      {ratios?.per ? ratios.per.toFixed(1) : (a.pe_ratio?.toFixed(1) || '—')}
                    </div>
                    <div className="text-[10px]" style={{ color: '#4A4A4A' }}>PER</div>
                  </div>
                  {/* Rendement div */}
                  <div className="text-center p-2 rounded"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="text-xs font-mono"
                      style={{ color: ratios?.rendement && ratios.rendement > 3 ? '#00C853' : '#A0A0A0' }}>
                      {ratios?.rendement ? `${ratios.rendement.toFixed(2)}%` : '—'}
                    </div>
                    <div className="text-[10px]" style={{ color: '#4A4A4A' }}>Rend. div.</div>
                  </div>
                </div>

                {/* Voir détail */}
                <div className="mt-3 flex items-center gap-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#D4AF37' }}>
                  Voir l'analyse complète <ChevronRight size={11} />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <FundamentalDetailModal
            analysis={selected.analysis}
            entreprise={selected.entreprise}
            cours={selected.cours}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Detail Modal
───────────────────────────────────────────── */
function FundamentalDetailModal({
  analysis: a,
  entreprise: ent,
  cours,
  onClose,
}: {
  analysis: FundamentalAnalysis
  entreprise: Entreprise | null
  cours: number | null
  onClose: () => void
}) {
  const reco    = recoCfg[a.recommendation as keyof typeof recoCfg]
  const ratios  = ent ? computeRatios(ent, cours) : null
  const upside  = a.target_price && cours
    ? (((a.target_price - cours) / cours) * 100).toFixed(2) : null
  const chartData = ent ? buildChartData(ent) : []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-3xl rounded-2xl border my-8 overflow-hidden"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        {/* ── Modal header ── */}
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)', background: 'rgba(212,175,55,0.03)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
              {a.ticker.slice(0, 4)}
            </div>
            <div>
              <div className="font-bold text-base" style={{ color: '#F5F5F5' }}>{a.company_name}</div>
              <div className="text-xs" style={{ color: '#5C5C5C' }}>
                {a.sector} · {a.market}
                {ent?.code_isin && <span className="ml-2 font-mono">{ent.code_isin}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reco && <span className={`${reco.cls} text-[10px] font-bold px-2.5 py-1 rounded`}>{reco.label}</span>}
            <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">

          {/* ── 1. Cours / Objectif / Potentiel ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Cours actuel', v: cours ? fmt(cours, 3) : '—',                          c: '#A0A0A0' },
              { l: 'Objectif',     v: a.target_price ? fmt(a.target_price, 3) : '—',        c: reco?.color || '#D4AF37' },
              { l: 'Potentiel',    v: upside ? `${parseFloat(upside) > 0 ? '+' : ''}${upside}%` : '—',
                c: upside ? (parseFloat(upside) > 0 ? '#00C853' : '#FF1744') : '#707070' },
            ].map(p => (
              <div key={p.l} className="p-4 rounded-xl text-center"
                style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
                <div className="text-xl font-bold font-mono" style={{ color: p.c }}>{p.v}</div>
                <div className="text-[11px] mt-1" style={{ color: '#5C5C5C' }}>{p.l}</div>
              </div>
            ))}
          </div>

          {/* ── 2. Valorisation ── */}
          {ent?.titres_admis && (
            <div className="p-4 rounded-xl flex items-center gap-4"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <Building2 size={22} style={{ color: '#D4AF37', flexShrink: 0 }} />
              <div className="flex-1">
                <div className="text-xs font-semibold tracking-wider mb-0.5" style={{ color: '#D4AF37' }}>
                  VALORISATION BOURSIÈRE
                </div>
                <div className="text-2xl font-bold font-mono" style={{ color: '#F5F5F5' }}>
                  {ratios?.capitalisation
                    ? ratios.capitalisation >= 1e9
                      ? `${(ratios.capitalisation / 1e9).toFixed(3)} Md`
                      : `${(ratios.capitalisation / 1e6).toFixed(2)} M`
                    : cours ? '—' : 'Cours indisponible'}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#5C5C5C' }}>
                  {ent.titres_admis.toLocaleString('fr-FR')} titres admis
                  {cours && <span> × {fmt(cours, 3)} cours actuel</span>}
                </div>
              </div>
              {ratios?.rnGrowth != null && (
                <div className="text-right">
                  <div className="text-xs" style={{ color: '#5C5C5C' }}>Croiss. RN</div>
                  <div className="text-lg font-bold font-mono"
                    style={{ color: ratios.rnGrowth >= 0 ? '#00C853' : '#FF1744' }}>
                    {ratios.rnGrowth >= 0 ? '+' : ''}{ratios.rnGrowth.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 3. Ratios calculés ── */}
          <div>
            <div className="text-xs font-semibold mb-3 tracking-wider flex items-center gap-2"
              style={{ color: '#5C5C5C' }}>
              RATIOS FINANCIERS
              <span className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(33,150,243,0.1)', color: '#2196F3' }}>
                Calculés en temps réel
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <RatioBadge
                label="PER"
                value={ratios?.per ? ratios.per.toFixed(1) : (a.pe_ratio?.toFixed(1) || null)}
                color={ratios?.per && ratios.per < 15 ? '#00C853' : ratios?.per && ratios.per > 25 ? '#FF1744' : '#F5F5F5'}
                sub={ratios?.per ? 'cours / BPA' : undefined}
              />
              <RatioBadge
                label="BPA (Bén. / action)"
                value={ratios?.bpa ? fmt(ratios.bpa, 3) : null}
                color="#A0A0A0"
                sub="RN / titres admis"
              />
              <RatioBadge
                label="Rend. dividende"
                value={ratios?.rendement ? ratios.rendement.toFixed(2) : (a.dividend_yield?.toFixed(2) || null)}
                suffix="%"
                color={ratios?.rendement && ratios.rendement > 4 ? '#00C853' : '#A0A0A0'}
                sub="div. / cours × 100"
              />
              <RatioBadge
                label="Pay-out ratio"
                value={ratios?.payOut ? ratios.payOut.toFixed(1) : null}
                suffix="%"
                color={ratios?.payOut && ratios.payOut > 100 ? '#FF1744' : '#A0A0A0'}
                sub="div. / BPA × 100"
              />
              <RatioBadge label="ROE" value={a.roe?.toFixed(1) || null} suffix="%" color={a.roe && a.roe > 15 ? '#00C853' : '#A0A0A0'} />
              <RatioBadge label="ROA" value={a.roa?.toFixed(1) || null} suffix="%" color={a.roa && a.roa > 8 ? '#00C853' : '#A0A0A0'} />
              <RatioBadge label="D/E ratio" value={a.debt_to_equity?.toFixed(2) || null} color={a.debt_to_equity && a.debt_to_equity > 1 ? '#FF1744' : '#A0A0A0'} />
              <RatioBadge label="PER Forward" value={a.forward_pe?.toFixed(1) || null} color="#A0A0A0" />
            </div>
          </div>

          {/* ── 4. Graphique Résultat Net + Dividendes ── */}
          {chartData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold tracking-wider" style={{ color: '#5C5C5C' }}>
                  RÉSULTAT NET & DIVIDENDES
                </div>
                <div className="text-[10px]" style={{ color: '#4A4A4A' }}>
                  Données en millions · dividende en unités
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: '#2D7A5A' }} />
                  <span className="text-[11px]" style={{ color: '#707070' }}>Résultat net (M)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: '#D4AF37', opacity: 0.7 }} />
                  <span className="text-[11px]" style={{ color: '#707070' }}>Dividende / action</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border"
                    style={{ background: 'transparent', borderColor: '#5C5C5C', borderStyle: 'dashed' }} />
                  <span className="text-[11px]" style={{ color: '#707070' }}>Prévision</span>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} barCategoryGap="30%" barGap={4}
                    margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: '#5C5C5C', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(y: string) => {
                        const yr = parseInt(y)
                        // 2024 & 2025 réels, 2026+ prévisions
                        return yr >= CURRENT_YEAR ? `${y}e` : String(y)
                      }}
                    />
                    <YAxis
                      yAxisId="rn"
                      tick={{ fill: '#5C5C5C', fontSize: 10, fontFamily: 'monospace' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => fmtM(v)}
                      width={52}
                    />
                    {/* Hidden right axis for dividende scale */}
                    <YAxis yAxisId="div" orientation="right" hide />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

                    {/* Résultat net bars */}
                    <Bar yAxisId="rn" dataKey="rn" name="rn" radius={[4, 4, 0, 0]} maxBarSize={40}
                      label={{
                        position: 'top',
                        fill: '#5C5C5C',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        formatter: (v: number) => v != null ? fmtM(v) : '',
                      }}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`rn-${index}`}
                          fill={entry.isForecast ? 'rgba(45,122,90,0.45)' : '#2D7A5A'}
                          stroke={entry.isForecast ? '#2D7A5A' : 'transparent'}
                          strokeWidth={entry.isForecast ? 1.5 : 0}
                          strokeDasharray={entry.isForecast ? '4 2' : undefined}
                        />
                      ))}
                    </Bar>

                    {/* Dividende bars — use right axis for scale independence */}
                    <Bar yAxisId="div" dataKey="div" name="div" radius={[4, 4, 0, 0]} maxBarSize={20}
                      label={{
                        position: 'top',
                        fill: '#A07A20',
                        fontSize: 8,
                        fontFamily: 'monospace',
                        formatter: (v: number) => v != null ? fmt(v, 3) : '',
                      }}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`div-${index}`}
                          fill={entry.isForecast ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.65)'}
                          stroke={entry.isForecast ? '#D4AF37' : 'transparent'}
                          strokeWidth={entry.isForecast ? 1 : 0}
                          strokeDasharray={entry.isForecast ? '3 2' : undefined}
                        />
                      ))}
                    </Bar>

                    {/* Séparateur réel / prévisions entre 2025 et 2026 */}
                    <ReferenceLine
                      yAxisId="rn"
                      x="2026"
                      stroke="rgba(212,175,55,0.25)"
                      strokeDasharray="4 3"
                      label={{
                        value: 'Prévisions →',
                        position: 'insideTopRight',
                        fill: 'rgba(212,175,55,0.45)',
                        fontSize: 9,
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── 5. Analyse ── */}
          <div>
            <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#5C5C5C' }}>ANALYSE</div>
            <p className="text-sm leading-relaxed p-4 rounded-xl whitespace-pre-wrap"
              style={{ color: '#C0C0C0', background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
              {a.description}
            </p>
          </div>

          {/* ── 6. Risques + Catalyseurs ── */}
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

          {/* ── Footer ── */}
          <div className="flex items-center justify-between text-xs border-t pt-3" style={{ borderColor: 'var(--noir-border)', color: '#3A3A3A' }}>
            <span>
              Publié le {a.published_at
                ? format(new Date(a.published_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })
                : '—'}
            </span>
            {cours && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Cours en direct · {fmt(cours, 3)}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
