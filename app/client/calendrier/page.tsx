'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Search, Download, RefreshCw, Filter, ChevronUp, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface CalEvent {
  id:           string
  company_name: string
  ticker?:      string
  event_type:   string
  event_date?:  string
  event_time?:  string
  location?:    string
  dividende?:   number
  detachement?: string
  year:         number
  is_confirmed: boolean
  source:       string
}

const MONTHS = ['Tous', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const MONTH_SHORT = ['', 'janv', 'févr', 'mars', 'avr', 'mai', 'juin',
                     'juil', 'août', 'sept', 'oct', 'nov', 'déc']

type SortKey = 'event_date' | 'dividende' | 'company_name'

export default function CalendarPage() {
  const [events, setEvents]         = useState<CalEvent[]>([])
  const [loading, setLoading]       = useState(true)
  const [pdfUrl, setPdfUrl]         = useState<string | null>(null)
  const [pdfAccessible, setPdfAccessible] = useState(false)
  const [search, setSearch]         = useState('')
  const [filterMonth, setFilterMonth] = useState(0)
  const [filterDiv, setFilterDiv]   = useState(false)
  const [sortBy, setSortBy]         = useState<SortKey>('event_date')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected]     = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  async function fetchEvents() {
    const res = await fetch('/api/calendar?year=2026')
    if (res.ok) {
      const data = await res.json()
      setEvents(data.events || [])
      setPdfUrl(data.pdf_url)
      setPdfAccessible(data.pdf_accessible)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()

    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' },
        fetchEvents)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchEvents()
    setRefreshing(false)
  }

  // Stats
  const withDiv   = events.filter(e => e.dividende != null)
  const maxDiv    = withDiv.length ? Math.max(...withDiv.map(e => e.dividende!)) : 0
  const avgDiv    = withDiv.length ? withDiv.reduce((s, e) => s + e.dividende!, 0) / withDiv.length : 0
  const upcoming  = events.filter(e => e.event_date && new Date(e.event_date) >= new Date()).length

  // Filtres
  const filtered = events
    .filter(e => {
      const matchSearch = e.company_name.toLowerCase().includes(search.toLowerCase()) ||
        (e.ticker || '').toLowerCase().includes(search.toLowerCase())
      const matchMonth = filterMonth === 0 || (e.event_date
        ? new Date(e.event_date).getMonth() + 1 === filterMonth : false)
      const matchDiv = !filterDiv || e.dividende != null
      return matchSearch && matchMonth && matchDiv
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'event_date') {
        const da = a.event_date ? new Date(a.event_date).getTime() : Infinity
        const db = b.event_date ? new Date(b.event_date).getTime() : Infinity
        cmp = da - db
      } else if (sortBy === 'dividende') {
        cmp = (b.dividende || 0) - (a.dividende || 0)
      } else {
        cmp = a.company_name.localeCompare(b.company_name)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortBy !== k) return <ChevronUp size={10} style={{ opacity: 0.2 }} />
    return sortDir === 'asc'
      ? <ChevronUp size={10} style={{ color: '#D4AF37' }} />
      : <ChevronDown size={10} style={{ color: '#D4AF37' }} />
  }

  function formatDate(d?: string) {
    if (!d) return null
    return format(new Date(d), 'd MMM', { locale: fr })
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>
            Calendrier des Assemblées
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            BVMT 2026 — Assemblées Générales & Dividendes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleRefresh} disabled={refreshing}
            className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-2">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-2">
              <Download size={13} />
              PDF BVMT
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Sociétés',         value: events.length,           color: '#D4AF37' },
          { label: 'À venir',          value: upcoming,                color: '#2196F3' },
          { label: 'Avec dividende',   value: withDiv.length,          color: '#00C853' },
          { label: 'Dividende moyen',  value: `${avgDiv.toFixed(3)} DT`, color: '#FF9800' },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card-premium p-4">
            <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#5C5C5C' }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5C5C5C' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Société, ticker..." className="input-premium pl-9 w-48" />
        </div>

        <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}
          className="input-premium w-36">
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>

        <button onClick={() => setFilterDiv(!filterDiv)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{
            background: filterDiv ? 'rgba(0,200,83,0.1)' : 'var(--noir-elevated)',
            color:      filterDiv ? '#00C853' : '#707070',
            border:     `1px solid ${filterDiv ? 'rgba(0,200,83,0.3)' : 'var(--noir-border)'}`,
          }}>
          <Filter size={12} />
          Avec dividende
        </button>

        <div className="flex items-center gap-1 text-xs" style={{ color: '#5C5C5C' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: pdfAccessible ? '#00C853' : '#5C5C5C' }} />
          PDF BVMT {pdfAccessible ? 'accessible' : 'hors ligne'}
        </div>
      </div>

      {/* Tri */}
      <div className="flex gap-2">
        {([['event_date','Date AGO'], ['dividende','Dividende'], ['company_name','Société']] as [SortKey,string][]).map(([k,l]) => (
          <button key={k} onClick={() => toggleSort(k)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: sortBy === k ? 'rgba(212,175,55,0.12)' : 'var(--noir-elevated)',
              color:      sortBy === k ? '#D4AF37' : '#707070',
              border:     `1px solid ${sortBy === k ? 'rgba(212,175,55,0.3)' : 'var(--noir-border)'}`,
            }}>
            {l} <SortIcon k={k} />
          </button>
        ))}
        <span className="text-xs self-center" style={{ color: '#5C5C5C' }}>
          {filtered.length} société{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-16" />
                <div className="skeleton h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
            <p className="text-sm" style={{ color: '#5C5C5C' }}>Aucun résultat</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Société</th>
                  <th>Date AGO</th>
                  <th>Heure</th>
                  <th className="hidden lg:table-cell">Lieu</th>
                  <th>Dividende (DT)</th>
                  <th>Détachement</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const isSelected  = selected === e.id
                  const isPast      = e.event_date && new Date(e.event_date) < new Date()
                  const isSoon      = e.event_date && !isPast &&
                    (new Date(e.event_date).getTime() - Date.now()) < 7 * 24 * 3600 * 1000

                  return (
                    <motion.tr key={e.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => setSelected(isSelected ? null : e.id)}
                      className="cursor-pointer"
                      style={{
                        background: isSelected ? 'rgba(212,175,55,0.07)' : 'transparent',
                        borderLeft: isSelected ? '2px solid #D4AF37' : '2px solid transparent',
                        opacity: isPast ? 0.55 : 1,
                      }}>

                      {/* Société */}
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-sm" style={{ color: '#F0E6C8' }}>
                            {e.company_name}
                          </div>
                          {e.ticker && (
                            <span className="text-[10px] badge-watch px-1.5 py-0.5 rounded">
                              {e.ticker}
                            </span>
                          )}
                          {isSoon && (
                            <span className="text-[10px] badge-buy px-1.5 py-0.5 rounded animate-pulse">
                              Bientôt
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td>
                        {e.event_date ? (
                          <span className="text-xs font-semibold px-2 py-1 rounded"
                            style={{ background: '#1e3a5f', color: '#60a5fa' }}>
                            {formatDate(e.event_date)}
                          </span>
                        ) : <span style={{ color: '#374151' }}>—</span>}
                      </td>

                      {/* Heure */}
                      <td>
                        <span className="text-xs" style={{ color: '#94a3b8' }}>
                          {e.event_time || <span style={{ color: '#374151' }}>—</span>}
                        </span>
                      </td>

                      {/* Lieu */}
                      <td className="hidden lg:table-cell" style={{ maxWidth: 220 }}>
                        <span className="text-xs truncate block" style={{ color: '#64748b' }}>
                          {e.location || <span style={{ color: '#374151' }}>—</span>}
                        </span>
                      </td>

                      {/* Dividende */}
                      <td>
                        {e.dividende != null ? (
                          <div className="flex items-center gap-2">
                            <div style={{
                              width: `${Math.max(6, Math.min(80, (e.dividende / maxDiv) * 80))}px`,
                              height: '5px',
                              background: 'linear-gradient(90deg, #D4AF37, #F5D76E)',
                              borderRadius: '3px',
                            }} />
                            <span className="font-bold font-mono text-sm" style={{ color: '#D4AF37' }}>
                              {e.dividende.toFixed(3)}
                            </span>
                          </div>
                        ) : <span style={{ color: '#374151' }}>—</span>}
                      </td>

                      {/* Détachement */}
                      <td>
                        {e.detachement ? (
                          <span className="text-xs font-semibold px-2 py-1 rounded"
                            style={{ background: '#14532d40', color: '#4ade80', border: '1px solid #166534' }}>
                            ✓ {formatDate(e.detachement)}
                          </span>
                        ) : <span style={{ color: '#374151' }}>—</span>}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer source */}
      <div className="p-4 rounded-xl text-xs leading-relaxed"
        style={{ background: 'var(--noir-surface)', border: '1px solid var(--noir-border)', color: '#5C5C5C' }}>
        <span style={{ color: '#D4AF37', fontWeight: 600 }}>Source :</span>{' '}
        BVMT — calendrier-assemblees.pdf
        {pdfAccessible
          ? <span style={{ color: '#00C853' }}> · PDF accessible en ligne</span>
          : <span style={{ color: '#707070' }}> · Données issues de la base locale</span>
        }
        <br />
        Les données incomplètes correspondent à des sociétés dont les informations n'étaient pas encore disponibles.
      </div>
    </div>
  )
}
