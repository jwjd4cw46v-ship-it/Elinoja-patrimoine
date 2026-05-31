'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, Calendar, RefreshCw, Download, X, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
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

export default function AdminCalendrierPage() {
  const [events, setEvents]         = useState<CalEvent[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<CalEvent | null>(null)
  const [pdfAccessible, setPdfAccessible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  async function fetchEvents() {
    const res = await fetch('/api/calendar?year=2026')
    if (res.ok) {
      const data = await res.json()
      setEvents(data.events || [])
      setPdfAccessible(data.pdf_accessible)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
    const ch = supabase.channel('cal-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, fetchEvents)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchEvents()
    toast.success('Données actualisées')
    setRefreshing(false)
  }

  async function deleteEvent(id: string) {
    if (!confirm('Supprimer cet événement ?')) return
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', event: { id } }),
    })
    if (res.ok) { toast.success('Supprimé'); fetchEvents() }
    else toast.error('Erreur')
  }

  function formatDate(d?: string) {
    if (!d) return '—'
    return format(new Date(d), 'd MMM yyyy', { locale: fr })
  }

  const withDiv = events.filter(e => e.dividende != null).length
  const maxDiv  = events.filter(e => e.dividende != null).length
    ? Math.max(...events.filter(e => e.dividende != null).map(e => e.dividende!))
    : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>
            Calendrier des Assemblées
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {events.length} sociétés · {withDiv} avec dividende
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="btn-ghost flex items-center gap-1.5 text-xs">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="btn-gold flex items-center gap-2">
            <Plus size={15} /> Ajouter
          </motion.button>
        </div>
      </div>

      {/* Status PDF */}
      <div className="flex items-center gap-2 p-3 rounded-lg text-xs"
        style={{
          background: pdfAccessible ? 'rgba(0,200,83,0.06)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${pdfAccessible ? 'rgba(0,200,83,0.2)' : 'var(--noir-border)'}`,
        }}>
        <div className="w-2 h-2 rounded-full"
          style={{ background: pdfAccessible ? '#00C853' : '#5C5C5C' }} />
        <span style={{ color: pdfAccessible ? '#00C853' : '#707070' }}>
          PDF BVMT officiel : {pdfAccessible ? 'accessible' : 'hors ligne (données locales)'}
        </span>
        {pdfAccessible && (
          <a href="https://www.bvmt.com.tn/sites/default/files/calendrier-assemblees.pdf"
            target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1" style={{ color: '#D4AF37' }}>
            <Download size={12} /> Télécharger
          </a>
        )}
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Société</th>
                  <th>Date AGO</th>
                  <th>Heure</th>
                  <th className="hidden xl:table-cell">Lieu</th>
                  <th>Dividende</th>
                  <th>Détachement</th>
                  <th>Source</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <motion.tr key={e.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium text-sm" style={{ color: '#F5F5F5' }}>
                            {e.company_name}
                          </div>
                          {e.ticker && (
                            <span className="text-[10px] badge-watch px-1.5 py-0.5 rounded">
                              {e.ticker}
                            </span>
                          )}
                        </div>
                        {e.is_confirmed && (
                          <CheckCircle size={12} style={{ color: '#00C853', flexShrink: 0 }} />
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-semibold"
                        style={{ color: e.event_date ? '#60a5fa' : '#374151' }}>
                        {formatDate(e.event_date)}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {e.event_time || '—'}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell" style={{ maxWidth: 200 }}>
                      <span className="text-xs truncate block" style={{ color: '#64748b' }}>
                        {e.location || '—'}
                      </span>
                    </td>
                    <td>
                      {e.dividende != null ? (
                        <div className="flex items-center gap-2">
                          <div style={{
                            width: `${Math.max(4, Math.min(60, (e.dividende / (maxDiv || 1)) * 60))}px`,
                            height: '4px',
                            background: 'linear-gradient(90deg, #D4AF37, #F5D76E)',
                            borderRadius: '2px',
                          }} />
                          <span className="font-bold font-mono text-sm" style={{ color: '#D4AF37' }}>
                            {e.dividende.toFixed(3)}
                          </span>
                        </div>
                      ) : <span style={{ color: '#374151' }}>—</span>}
                    </td>
                    <td>
                      {e.detachement ? (
                        <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>
                          ✓ {formatDate(e.detachement)}
                        </span>
                      ) : <span style={{ color: '#374151' }}>—</span>}
                    </td>
                    <td>
                      <span className="text-[10px] px-2 py-0.5 rounded"
                        style={{
                          background: e.source === 'bvmt' || e.source === 'bvmt_import'
                            ? 'rgba(33,150,243,0.1)' : 'rgba(212,175,55,0.1)',
                          color: e.source === 'bvmt' || e.source === 'bvmt_import'
                            ? '#2196F3' : '#D4AF37',
                        }}>
                        {e.source === 'bvmt' || e.source === 'bvmt_import' ? 'BVMT' : 'Manuel'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(e); setShowForm(true) }}
                          className="p-1.5 rounded-lg" style={{ color: '#A0A0A0' }}>
                          <Edit size={13} />
                        </button>
                        <button onClick={() => deleteEvent(e.id)}
                          className="p-1.5 rounded-lg" style={{ color: '#5C5C5C' }}
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
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <CalendarEventForm
            event={editing}
            onClose={() => setShowForm(false)}
            onSaved={fetchEvents}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Formulaire ─────────────────────────────────────────────
function CalendarEventForm({ event, onClose, onSaved }: {
  event: CalEvent | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    company_name: event?.company_name || '',
    ticker:       event?.ticker || '',
    event_type:   event?.event_type || 'ago',
    event_date:   event?.event_date?.slice(0, 10) || '',
    event_time:   event?.event_time || '',
    location:     event?.location || '',
    dividende:    event?.dividende?.toString() || '',
    detachement:  event?.detachement?.slice(0, 10) || '',
    year:         event?.year?.toString() || '2026',
    is_confirmed: event?.is_confirmed ?? true,
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...(event?.id ? { id: event.id } : {}),
      company_name: form.company_name,
      ticker:       form.ticker || null,
      event_type:   form.event_type,
      event_date:   form.event_date || null,
      event_time:   form.event_time || null,
      location:     form.location || null,
      dividende:    form.dividende ? parseFloat(form.dividende) : null,
      detachement:  form.detachement || null,
      year:         parseInt(form.year),
      is_confirmed: form.is_confirmed,
      source:       'manuel',
    }

    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', event: payload }),
    })

    if (res.ok) {
      toast.success(event ? 'Événement modifié' : 'Événement ajouté')
      onSaved()
      onClose()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Erreur')
    }
    setLoading(false)
  }

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border my-8"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>
            {event ? 'Modifier' : 'Nouvel événement'}
          </h2>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                SOCIÉTÉ *
              </label>
              <input value={form.company_name} onChange={e => f('company_name', e.target.value)}
                placeholder="BH BANK" required className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                TICKER
              </label>
              <input value={form.ticker} onChange={e => f('ticker', e.target.value.toUpperCase())}
                placeholder="BHB" className="input-premium" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                TYPE
              </label>
              <select value={form.event_type} onChange={e => f('event_type', e.target.value)}
                className="input-premium">
                <option value="ago">AGO</option>
                <option value="age">AGE</option>
                <option value="dividende">Dividende</option>
                <option value="ipo">IPO</option>
                <option value="resultat">Résultats</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                ANNÉE
              </label>
              <input type="number" value={form.year} onChange={e => f('year', e.target.value)}
                className="input-premium" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                DATE AGO
              </label>
              <input type="date" value={form.event_date} onChange={e => f('event_date', e.target.value)}
                className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                HEURE
              </label>
              <input value={form.event_time} onChange={e => f('event_time', e.target.value)}
                placeholder="10H00" className="input-premium" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
              LIEU
            </label>
            <input value={form.location} onChange={e => f('location', e.target.value)}
              placeholder="Siège social..." className="input-premium" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#00C853' }}>
                DIVIDENDE (DT/action)
              </label>
              <input type="number" step="0.001" value={form.dividende}
                onChange={e => f('dividende', e.target.value)}
                placeholder="1.500" className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#4ade80' }}>
                DATE DÉTACHEMENT
              </label>
              <input type="date" value={form.detachement}
                onChange={e => f('detachement', e.target.value)}
                className="input-premium" />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg"
            style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
            <input type="checkbox" id="is_confirmed" checked={form.is_confirmed}
              onChange={e => f('is_confirmed', e.target.checked)} />
            <label htmlFor="is_confirmed" className="text-sm cursor-pointer" style={{ color: '#A0A0A0' }}>
              Informations confirmées
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : (event ? 'Sauvegarder' : 'Ajouter')}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
