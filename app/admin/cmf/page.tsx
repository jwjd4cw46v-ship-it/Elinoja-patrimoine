'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, FileText, Upload, X, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { CmfAnnouncement } from '@/types'

export default function AdminCmfPage() {
  const [items, setItems]     = useState<CmfAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState<CmfAnnouncement | null>(null)
  const supabase = createClient()

  async function fetchItems() {
    const { data } = await supabase
      .from('cmf_announcements')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setItems(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
    const ch = supabase.channel('cmf-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cmf_announcements' }, fetchItems)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function deleteItem(id: string) {
    if (!confirm('Supprimer ce communiqué ?')) return
    await supabase.from('cmf_announcements').delete().eq('id', id)
    toast.success('Communiqué supprimé')
    fetchItems()
  }

  const categoryLabels: Record<string, string> = {
    resultat: 'Résultats', dividend: 'Dividende', agm: 'AGO/AGE',
    opa: 'OPA', introduction: 'Introduction', autre: 'Autre',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Communiqués CMF</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>{items.length} communiqués</p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-gold flex items-center gap-2">
          <Plus size={15} /> Nouveau communiqué
        </motion.button>
      </div>

      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48" />
                  <div className="skeleton h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>Communiqué</th>
                <th>Société</th>
                <th>Catégorie</th>
                <th>PDF / IA</th>
                <th>Date officielle</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td>
                    <div className="flex items-center gap-3">
                      <FileText size={16} style={{ color: '#5C5C5C', flexShrink: 0 }} />
                      <div>
                        <div className="font-medium text-sm line-clamp-1" style={{ color: '#F5F5F5', maxWidth: 280 }}>{item.title}</div>
                        {item.is_important && (
                          <div className="flex items-center gap-1 text-[10px]" style={{ color: '#FF9800' }}>
                            <AlertCircle size={10} /> Important
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm" style={{ color: '#A0A0A0' }}>{item.company}</div>
                    {item.ticker && <div className="text-[10px] badge-watch px-1.5 py-0.5 rounded inline-block mt-1">{item.ticker}</div>}
                  </td>
                  <td>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--noir-elevated)', color: '#A0A0A0' }}>
                      {categoryLabels[item.category] || item.category}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {item.pdf_url && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                          PDF
                        </span>
                      )}
                      {(item as any).pdf_extracted && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(0,200,83,0.1)', color: '#00C853' }}>
                          <CheckCircle size={9} /> IA
                        </span>
                      )}
                      {item.pdf_url && !(item as any).pdf_extracted && (
                        <span className="text-[10px]" style={{ color: '#5C5C5C' }}>Non indexé</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="text-xs" style={{ color: '#707070' }}>
                      {format(new Date(item.official_date), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(item); setShowForm(true) }} className="p-1.5 rounded-lg" style={{ color: '#A0A0A0' }}>
                        <Edit size={13} />
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg" style={{ color: '#5C5C5C' }}
                        onMouseOver={e => (e.currentTarget.style.color = '#FF1744')}
                        onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
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

      <AnimatePresence>
        {showForm && <CmfForm item={editing} onClose={() => setShowForm(false)} onSaved={fetchItems} />}
      </AnimatePresence>
    </div>
  )
}

function CmfForm({ item, onClose, onSaved }: {
  item: CmfAnnouncement | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    title:         item?.title || '',
    company:       item?.company || '',
    ticker:        item?.ticker || '',
    category:      item?.category || 'resultat',
    content:       item?.content || '',
    official_date: item?.official_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    is_important:  item?.is_important || false,
  })
  const [pdfFile, setPdfFile]             = useState<File | null>(null)
  const [loading, setLoading]             = useState(false)
  const [extracting, setExtracting]       = useState(false)
  const [extractStatus, setExtractStatus] = useState<'idle' | 'ok' | 'error' | 'scanned'>('idle')
  const [extractInfo, setExtractInfo]     = useState<string>('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    // Upload PDF si présent
    let pdf_url      = item?.pdf_url      || null
    let pdf_filename = item?.pdf_filename || null

    if (pdfFile) {
      const filename = `cmf/${Date.now()}_${pdfFile.name}`
      const { data, error } = await supabase.storage.from('documents').upload(filename, pdfFile)
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filename)
        pdf_url      = publicUrl
        pdf_filename = pdfFile.name
      }
    }

    const payload = { ...form, pdf_url, pdf_filename, author_id: session.user.id }
    let savedId   = item?.id || null
    let error: any

    if (item) {
      ;({ error } = await supabase
        .from('cmf_announcements')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', item.id))
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('cmf_announcements')
        .insert(payload)
        .select('id')
        .single()
      error   = insErr
      savedId = inserted?.id || null
    }

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success(item ? 'Communiqué modifié' : 'Communiqué publié')
    setLoading(false)

    // Extraction automatique si un PDF est présent
    if (pdf_url && savedId) {
      setExtracting(true)
      setExtractStatus('idle')
      try {
        const res    = await fetch('/api/extract-pdf', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ pdf_url, announcement_id: savedId }),
        })
        const result = await res.json()

        if (result.success) {
          setExtractStatus('ok')
          setExtractInfo(`${result.pages} page(s) · ${result.chars.toLocaleString()} caractères`)
          toast.success(`Texte extrait et indexé pour l'IA`)
        } else if (result.error?.includes('scanné') || result.error?.includes('image')) {
          setExtractStatus('scanned')
          setExtractInfo('PDF scanné — extraction impossible')
          toast.error('PDF scanné : le texte ne peut pas être extrait automatiquement')
        } else {
          setExtractStatus('error')
          setExtractInfo(result.error || 'Erreur inconnue')
          toast.error('Extraction échouée : ' + (result.error || 'erreur inconnue'))
        }
      } catch (err: any) {
        setExtractStatus('error')
        setExtractInfo(err.message)
        toast.error('Erreur lors de l\'extraction')
      }
      setExtracting(false)
    }

    onSaved()
    onClose()
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

        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--noir-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>
            {item ? 'Modifier' : 'Nouveau communiqué CMF'}
          </h2>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input value={form.title} onChange={e => f('title', e.target.value)}
            placeholder="Titre *" required className="input-premium" />

          <div className="grid grid-cols-2 gap-3">
            <input value={form.company} onChange={e => f('company', e.target.value)}
              placeholder="Société *" required className="input-premium" />
            <input value={form.ticker} onChange={e => f('ticker', e.target.value.toUpperCase())}
              placeholder="Ticker (optionnel)" className="input-premium" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select value={form.category} onChange={e => f('category', e.target.value)} className="input-premium">
              <option value="resultat">Résultats</option>
              <option value="dividend">Dividende</option>
              <option value="agm">AGO/AGE</option>
              <option value="opa">OPA</option>
              <option value="introduction">Introduction</option>
              <option value="autre">Autre</option>
            </select>
            <input type="date" value={form.official_date} onChange={e => f('official_date', e.target.value)}
              required className="input-premium" />
          </div>

          <textarea value={form.content} onChange={e => f('content', e.target.value)}
            placeholder="Résumé ou contenu du communiqué..." rows={4} className="input-premium resize-none" />

          {/* Upload PDF */}
          <div className="p-4 rounded-lg border-dashed border-2 text-center cursor-pointer"
            style={{ borderColor: pdfFile ? 'rgba(212,175,55,0.4)' : 'var(--noir-border)' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setPdfFile(e.dataTransfer.files[0] || null) }}>
            <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)}
              className="hidden" id="pdf-upload" />
            <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
              <Upload size={18} style={{ color: pdfFile ? '#D4AF37' : '#5C5C5C' }} />
              <div className="text-sm" style={{ color: pdfFile ? '#D4AF37' : '#5C5C5C' }}>
                {pdfFile ? pdfFile.name : 'Déposer un PDF ou cliquer pour sélectionner'}
              </div>
              {pdfFile && (
                <div className="text-xs flex items-center gap-1" style={{ color: '#5C5C5C' }}>
                  Le texte sera extrait automatiquement pour l'IA
                </div>
              )}
            </label>
          </div>

          {/* Statut extraction */}
          {(extracting || extractStatus !== 'idle') && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg text-sm"
              style={{
                background: extracting
                  ? 'rgba(212,175,55,0.08)'
                  : extractStatus === 'ok'
                  ? 'rgba(0,200,83,0.08)'
                  : 'rgba(255,23,68,0.08)',
                border: `1px solid ${extracting
                  ? 'rgba(212,175,55,0.2)'
                  : extractStatus === 'ok'
                  ? 'rgba(0,200,83,0.2)'
                  : 'rgba(255,23,68,0.2)'}`,
                color: extracting ? '#D4AF37' : extractStatus === 'ok' ? '#00C853' : '#FF4444',
              }}>
              {extracting && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              {!extracting && extractStatus === 'ok' && <CheckCircle size={15} className="flex-shrink-0" />}
              {!extracting && extractStatus !== 'ok' && <AlertCircle size={15} className="flex-shrink-0" />}
              <div>
                <div className="font-medium text-xs">
                  {extracting
                    ? 'Extraction du texte PDF en cours...'
                    : extractStatus === 'ok'
                    ? 'Texte extrait et indexé pour l\'IA'
                    : extractStatus === 'scanned'
                    ? 'PDF scanné — extraction impossible'
                    : 'Extraction échouée'}
                </div>
                {extractInfo && !extracting && (
                  <div className="text-[11px] mt-0.5 opacity-70">{extractInfo}</div>
                )}
              </div>
            </div>
          )}

          {/* Marquer important */}
          <div className="flex items-center gap-3 p-3 rounded-lg"
            style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
            <input type="checkbox" id="is_important" checked={form.is_important}
              onChange={e => f('is_important', e.target.checked)} />
            <label htmlFor="is_important" className="text-sm cursor-pointer" style={{ color: '#A0A0A0' }}>
              Marquer comme important
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <motion.button type="submit" disabled={loading || extracting} whileTap={{ scale: 0.97 }}
              className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading || extracting
                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : (item ? 'Sauvegarder' : 'Publier')}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
