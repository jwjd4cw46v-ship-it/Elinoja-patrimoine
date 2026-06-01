'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, Calendar, RefreshCw, Download, X, Upload, FileText } from 'lucide-react'
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

const EMPTY_FORM = {
  company_name: '',
  ticker:       '',
  event_type:   'ago',
  event_date:   '',
  event_time:   '',
  location:     '',
  dividende:    '',
  detachement:  '',
  year:         2026,
  is_confirmed: true,
}

export default function AdminCalendrierPage() {
  const [events, setEvents]           = useState<CalEvent[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<CalEvent | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [pdfAccessible, setPdfAccessible] = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [importing, setImporting]     = useState(false)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
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

  // ── Upload & parse PDF ──────────────────────────────────
  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Veuillez sélectionner un fichier PDF')
      return
    }

    setImporting(true)
    toast.loading('Analyse du PDF en cours...', { id: 'pdf-import' })

    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const res = await fetch('/api/calendar/import-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Erreur lors de l\'import')

      const data = await res.json()
      if (data.events && data.events.length > 0) {
        setImportPreview(data.events)
        setShowPreview(true)
        toast.success(`${data.events.length} entrées détectées`, { id: 'pdf-import' })
      } else {
        toast.error('Aucune donnée détectée dans le PDF', { id: 'pdf-import' })
      }
    } catch (err) {
      toast.error('Erreur lors de l\'analyse du PDF', { id: 'pdf-import' })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function confirmImport() {
    if (importPreview.length === 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_bulk',
        events: importPreview.map(e => ({ ...e, author_id: user?.id })),
      }),
    })

    if (res.ok) {
      const data = await res.json()
      toast.success(`${data.imported} entrées importées !`)
      setShowPreview(false)
      setImportPreview([])
      fetchEvents()
    } else {
      toast.error('Erreur lors de l\'import')
    }
    setSaving(false)
  }

  // ── Formulaire manuel ───────────────────────────────────
  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(e: CalEvent) {
    setEditing(e)
    setForm({
      company_name: e.company_name,
      ticker:       e.ticker || '',
      event_type:   e.event_type,
      event_date:   e.event_date || '',
      event_time:   e.event_time || '',
      location:     e.location || '',
      dividende:    e.dividende != null ? String(e.dividende) : '',
      detachement:  e.detachement || '',
      year:         e.year,
      is_confirmed: e.is_confirmed,
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.company_name.trim()) {
      toast.error('Nom de la société requis')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const payload: any = {
      company_name: form.company_name.trim(),
      ticker:       form.ticker.trim() || null,
      event_type:   form.event_type,
      event_date:   form.event_date || null,
      event_time:   form.event_time || null,
      location:     form.location.trim() || null,
      dividende:    form.dividende ? parseFloat(form.dividende) : null,
      detachement:  form.detachement || null,
      year:         form.year,
      is_confirmed: form.is_confirmed,
      source:       'manuel',
      author_id:    user?.id,
    }

    if (editing) payload.id = editing.id

    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', event: payload }),
    })

    if (res.ok) {
      toast.success(editing ? 'Mis à jour' : 'Ajouté')
      setShowForm(false)
      fetchEvents()
    } else {
      toast.error('Erreur lors de la sauvegarde')
    }
    setSaving(false)
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

  const withDiv = events.filter(e => e.dividende != null)
  const maxDiv  = withDiv.length ? Math.max(...withDiv.map(e => e.dividende!)) : 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>
            Calendrier des Assemblées
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {events.length} société(s) · {withDiv.length} avec dividende
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all"
            style={{ borderColor: 'var(--noir-border)', color: '#A0A0A0' }}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>

          {/* Upload PDF */}
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border cursor-pointer transition-all"
            style={{ borderColor: 'rgba(212,175,55,0.4)', color: '#D4AF37', background: 'rgba(212,175,55,0.06)' }}>
            <Upload size={13} />
            {importing ? 'Analyse...' : 'Importer PDF'}
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handlePdfUpload}
              disabled={importing}
            />
          </label>

          <button onClick={openNew}
            className="btn-gold flex items-center gap-1.5 px-4 py-2 text-xs">
            <Plus size={13} /> Ajouter manuellement
          </button>
        </div>
      </div>

      {/* Status PDF */}
      <div className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg"
        style={{ background: 'var(--noir-surface)', border: '1px solid var(--noir-border)', color: '#5C5C5C' }}>
        <span className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: pdfAccessible ? '#00C853' : '#5C5C5C' }} />
        PDF BVMT officiel : {pdfAccessible ? 'accessible en ligne' : 'hors ligne (données locales)'}
        {!pdfAccessible && (
          <span style={{ color: '#707070' }}>
            — Téléchargez le PDF depuis{' '}
            <a href="https://www.bvmt.com.tn/sites/default/files/calendrier/calendrier-assemblees.pdf"
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#D4AF37' }}>bvmt.com.tn</a>
            {' '}puis importez-le
          </span>
        )}
      </div>

      {/* Preview import PDF */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border p-5 space-y-4"
            style={{ background: 'var(--noir-elevated)', borderColor: 'rgba(212,175,55,0.3)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: '#D4AF37' }}>
                <FileText size={16} className="inline mr-2" />
                {importPreview.length} entrées détectées dans le PDF
              </h3>
              <button onClick={() => setShowPreview(false)} style={{ color: '#5C5C5C' }}>
                <X size={16} />
              </button>
            </div>

            <div className="overflow-x-auto max-h-60 overflow-y-auto rounded-lg border"
              style={{ borderColor: 'var(--noir-border)' }}>
              <table className="w-full text-xs">
                <thead style={{ background: 'var(--noir-surface)' }}>
                  <tr>
                    {['Société', 'Date AGO', 'Dividende', 'Détachement'].map(h => (
                      <th key={h} className="px-3 py-2 text-left" style={{ color: '#5C5C5C' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((e, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--noir-border)' }}>
                      <td className="px-3 py-2" style={{ color: '#F5F5F5' }}>{e.company_name}</td>
                      <td className="px-3 py-2" style={{ color: '#A0A0A0' }}>{e.event_date || '—'}</td>
                      <td className="px-3 py-2" style={{ color: '#D4AF37' }}>
                        {e.dividende ? `${e.dividende} DT` : '—'}
                      </td>
                      <td className="px-3 py-2" style={{ color: '#A0A0A0' }}>{e.detachement || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button onClick={confirmImport} disabled={saving}
                className="btn-gold px-4 py-2 text-sm flex items-center gap-2">
                {saving ? 'Import...' : `Confirmer l'import (${importPreview.length} entrées)`}
              </button>
              <button onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--noir-border)', color: '#5C5C5C' }}>
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulaire manuel */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border p-5 space-y-4"
            style={{ background: 'var(--noir-elevated)', borderColor: 'var(--noir-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: '#F5F5F5' }}>
                {editing ? 'Modifier l\'entrée' : 'Ajouter une entrée'}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ color: '#5C5C5C' }}>
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#A0A0A0' }}>SOCIÉTÉ *</label>
                <input value={form.company_name}
                  onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="Ex: SFBT" className="input-premium w-full" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#A0A0A0' }}>TICKER</label>
                <input value={form.ticker}
                  onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))}
                  placeholder="Ex: SFBT" className="input-premium w-full" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#A0A0A0' }}>DATE AGO</label>
                <input type="date" value={form.event_date}
                  onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                  className="input-premium w-full" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#A0A0A0' }}>HEURE</label>
                <input type="time" value={form.event_time}
                  onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))}
                  className="input-premium w-full" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#A0A0A0' }}>DIVIDENDE (DT)</label>
                <input type="number" step="0.001" value={form.dividende}
                  onChange={e => setForm(f => ({ ...f, dividende: e.target.value }))}
                  placeholder="Ex: 1.500" className="input-premium w-full" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#A0A0A0' }}>DATE DÉTACHEMENT</label>
                <input type="date" value={form.detachement}
                  onChange={e => setForm(f => ({ ...f, detachement: e.target.value }))}
                  className="input-premium w-full" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs mb-1 block" style={{ color: '#A0A0A0' }}>LIEU</label>
                <input value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Ex: Siège social, Tunis" className="input-premium w-full" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn-gold px-4 py-2 text-sm">
                {saving ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Ajouter'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--noir-border)', color: '#5C5C5C' }}>
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des événements */}
      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--noir-elevated)', borderColor: 'var(--noir-border)' }}>
        {loading ? (
          <div className="p-8 text-center" style={{ color: '#5C5C5C' }}>Chargement...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
            <p className="text-sm mb-3" style={{ color: '#5C5C5C' }}>Aucune entrée</p>
            <p className="text-xs" style={{ color: '#3A3A3A' }}>
              Importez le PDF BVMT ou ajoutez manuellement des entrées
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--noir-surface)' }}>
                <tr>
                  {['Société', 'Date AGO', 'Heure', 'Dividende', 'Détachement', 'Source', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium tracking-wider"
                      style={{ color: '#5C5C5C' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={e.id}
                    style={{ borderTop: '1px solid var(--noir-border)' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: '#F5F5F5' }}>{e.company_name}</div>
                      {e.ticker && <div className="text-xs mt-0.5" style={{ color: '#D4AF37' }}>{e.ticker}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#A0A0A0' }}>
                      {formatDate(e.event_date)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#A0A0A0' }}>
                      {e.event_time || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-bold" style={{ color: '#D4AF37' }}>
                      {e.dividende != null ? `${e.dividende.toFixed(3)} DT` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#A0A0A0' }}>
                      {formatDate(e.detachement)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{
                          background: e.source === 'manuel' ? 'rgba(33,150,243,0.1)' : 'rgba(212,175,55,0.1)',
                          color: e.source === 'manuel' ? '#2196F3' : '#D4AF37',
                        }}>
                        {e.source === 'manuel' ? 'Manuel' : 'PDF'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(e)} style={{ color: '#D4AF37' }}>
                          <Edit size={14} />
                        </button>
                        <button onClick={() => deleteEvent(e.id)} style={{ color: '#FF1744' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
