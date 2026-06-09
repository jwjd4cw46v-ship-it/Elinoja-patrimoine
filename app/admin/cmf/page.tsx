'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, FileText, Upload, X, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Import dynamique pour éviter le SSR
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n'
    }
    return fullText.slice(0, 15000)
  } catch {
    return ''
  }
}
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
            {[...Array(4)].map((_, i) => <div key={i} className="flex gap-3"><div className="skeleton w-10 h-10 rounded-lg" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-48" /><div className="skeleton h-3 w-32" /></div></div>)}
          </div>
        ) : (
          <table className="table-premium">
            <thead><tr><th>Communiqué</th><th>Société</th><th>Catégorie</th><th>Date officielle</th><th style={{ width: 80 }}>Actions</th></tr></thead>
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
                  <td><span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--noir-elevated)', color: '#A0A0A0' }}>{categoryLabels[item.category] || item.category}</span></td>
                  <td><span className="text-xs" style={{ color: '#707070' }}>{format(new Date(item.official_date), 'dd MMM yyyy', { locale: fr })}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(item); setShowForm(true) }} className="p-1.5 rounded-lg" style={{ color: '#A0A0A0' }}><Edit size={13} /></button>
                      <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg" style={{ color: '#5C5C5C' }}
                        onMouseOver={e => (e.currentTarget.style.color = '#FF1744')}
                        onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}><Trash2 size={13} /></button>
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

function CmfForm({ item, onClose, onSaved }: { item: CmfAnnouncement | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: item?.title || '', company: item?.company || '', ticker: item?.ticker || '',
    category: item?.category || 'resultat', content: item?.content || '',
    official_date: item?.official_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    is_important: item?.is_important || false,
  })
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    let pdf_url = item?.pdf_url || null
    let pdf_filename = item?.pdf_filename || null

    if (pdfFile) {
      const filename = `cmf/${Date.now()}_${pdfFile.name}`
      const { data, error } = await supabase.storage.from('documents').upload(filename, pdfFile)
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filename)
        pdf_url = publicUrl
        pdf_filename = pdfFile.name
        if (!form.content) {
          toast.loading('Extraction du texte PDF...', { id: 'pdf-extract' })
          const extractedText = await extractTextFromPDF(pdfFile)
          if (extractedText) {
            setForm(prev => ({ ...prev, content: extractedText }))
            toast.success('Texte extrait automatiquement', { id: 'pdf-extract' })
          } else {
            toast.dismiss('pdf-extract')
          }
        }
      }
    }

    const payload = { ...form, pdf_url, pdf_filename, author_id: session.user.id }
    let error
    if (item) {
      ({ error } = await supabase.from('cmf_announcements').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', item.id))
    } else {
      ({ error } = await supabase.from('cmf_announcements').insert(payload))
    }

    if (error) toast.error(error.message)
    else { toast.success(item ? 'Communiqué modifié' : 'Communiqué publié'); onSaved(); onClose() }
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
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--noir-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>{item ? 'Modifier' : 'Nouveau communiqué CMF'}</h2>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input value={form.title} onChange={e => f('title', e.target.value)} placeholder="Titre *" required className="input-premium" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.company} onChange={e => f('company', e.target.value)} placeholder="Société *" required className="input-premium" />
            <input value={form.ticker} onChange={e => f('ticker', e.target.value.toUpperCase())} placeholder="Ticker (optionnel)" className="input-premium" />
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
            <input type="date" value={form.official_date} onChange={e => f('official_date', e.target.value)} required className="input-premium" />
          </div>
          <textarea value={form.content} onChange={e => f('content', e.target.value)} placeholder="Contenu du communiqué..." rows={4} className="input-premium resize-none" />

          <div className="p-4 rounded-lg border-dashed border-2 text-center cursor-pointer transition-colors"
            style={{ borderColor: 'var(--noir-border)' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setPdfFile(e.dataTransfer.files[0] || null) }}>
            <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="hidden" id="pdf-upload" />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <Upload size={18} className="mx-auto mb-2" style={{ color: '#5C5C5C' }} />
              <div className="text-sm" style={{ color: pdfFile ? '#D4AF37' : '#5C5C5C' }}>
                {pdfFile ? pdfFile.name : 'Déposer un PDF ou cliquer pour sélectionner'}
              </div>
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
            <input type="checkbox" id="is_important" checked={form.is_important} onChange={e => f('is_important', e.target.checked)} />
            <label htmlFor="is_important" className="text-sm cursor-pointer" style={{ color: '#A0A0A0' }}>
              Marquer comme important
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }} className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : (item ? 'Sauvegarder' : 'Publier')}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
