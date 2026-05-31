'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, Bell, X, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Announcement } from '@/types'

export default function AdminAnnoncesPage() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const supabase = createClient()

  async function fetchItems() {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    if (data) setItems(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
    const ch = supabase.channel('ann-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchItems).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function toggleActive(item: Announcement) {
    await supabase.from('announcements').update({ is_active: !item.is_active }).eq('id', item.id)
    fetchItems()
  }

  async function deleteItem(id: string) {
    if (!confirm('Supprimer cette annonce ?')) return
    await supabase.from('announcements').delete().eq('id', id)
    toast.success('Annonce supprimée')
    fetchItems()
  }

  const priorityColors: Record<string, string> = { low: '#707070', medium: '#D4AF37', high: '#FF9800', urgent: '#FF1744' }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Annonces</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>{items.filter(i => i.is_active).length} actives · {items.length} total</p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditing(null); setShowForm(true) }} className="btn-gold flex items-center gap-2">
          <Plus size={15} /> Nouvelle annonce
        </motion.button>
      </div>

      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}</div>
        ) : (
          <table className="table-premium">
            <thead><tr><th>Annonce</th><th>Type</th><th>Priorité</th><th>Statut</th><th>Date</th><th style={{ width: 80 }}>Actions</th></tr></thead>
            <tbody>
              {items.map((item, i) => (
                <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <td>
                    <div className="font-medium text-sm line-clamp-1" style={{ color: '#F5F5F5', maxWidth: 300 }}>{item.title}</div>
                    <div className="text-xs line-clamp-1" style={{ color: '#5C5C5C' }}>{item.content}</div>
                  </td>
                  <td><span className="text-xs capitalize px-2 py-0.5 rounded" style={{ background: 'var(--noir-elevated)', color: '#A0A0A0' }}>{item.type}</span></td>
                  <td><span className="text-xs font-bold" style={{ color: priorityColors[item.priority] || '#707070' }}>● {item.priority.toUpperCase()}</span></td>
                  <td>
                    <button onClick={() => toggleActive(item)} className="flex items-center gap-1.5 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-green-400' : 'bg-gray-600'}`} />
                      <span style={{ color: item.is_active ? '#00C853' : '#5C5C5C' }}>{item.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td><span className="text-xs" style={{ color: '#707070' }}>{format(new Date(item.created_at), 'dd MMM', { locale: fr })}</span></td>
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
        {showForm && <AnnouncementForm item={editing} onClose={() => setShowForm(false)} onSaved={fetchItems} />}
      </AnimatePresence>
    </div>
  )
}

function AnnouncementForm({ item, onClose, onSaved }: { item: Announcement | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: item?.title || '', content: item?.content || '',
    type: item?.type || 'info', priority: item?.priority || 'medium',
    is_active: item?.is_active ?? true, show_popup: item?.show_popup ?? false,
    expires_at: item?.expires_at?.slice(0, 10) || '',
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const payload = { ...form, expires_at: form.expires_at || null, author_id: session.user.id }
    let error
    if (item) ({ error } = await supabase.from('announcements').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', item.id))
    else ({ error } = await supabase.from('announcements').insert(payload))

    if (error) toast.error(error.message)
    else { toast.success(item ? 'Annonce modifiée' : 'Annonce créée'); onSaved(); onClose() }
    setLoading(false)
  }

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="w-full max-w-lg rounded-2xl border p-6"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>{item ? 'Modifier' : 'Nouvelle annonce'}</h2>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input value={form.title} onChange={e => f('title', e.target.value)} placeholder="Titre *" required className="input-premium" />
          <textarea value={form.content} onChange={e => f('content', e.target.value)} placeholder="Contenu de l'annonce..." required rows={4} className="input-premium resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={e => f('type', e.target.value)} className="input-premium">
              <option value="info">ℹ️ Information</option>
              <option value="alert">⚠️ Alerte</option>
              <option value="webinar">📅 Webinaire</option>
              <option value="maintenance">🔧 Maintenance</option>
              <option value="performance">📈 Performance</option>
            </select>
            <select value={form.priority} onChange={e => f('priority', e.target.value)} className="input-premium">
              <option value="low">🟦 Faible</option>
              <option value="medium">🟨 Moyen</option>
              <option value="high">🟧 Élevé</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>DATE D'EXPIRATION (optionnel)</label>
            <input type="date" value={form.expires_at} onChange={e => f('expires_at', e.target.value)} className="input-premium" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} />
              <span className="text-sm" style={{ color: '#A0A0A0' }}>Annonce active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.show_popup} onChange={e => f('show_popup', e.target.checked)} />
              <span className="text-sm" style={{ color: '#A0A0A0' }}>Afficher en popup</span>
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
