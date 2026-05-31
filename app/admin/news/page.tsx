'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Eye, EyeOff, Trash2, Edit3, Heart, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Article = {
  id: string
  title: string
  content: string
  cover_image: string | null
  published: boolean
  likes_count: number
  views_count: number
  created_at: string
  news_comments: { count: number }[]
}

export default function AdminNewsPage() {
  const supabase = createClient()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Article | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchArticles() }, [])

  async function fetchArticles() {
    const { data } = await supabase
      .from('news_articles')
      .select('*, news_comments(count)')
      .order('created_at', { ascending: false })
    setArticles(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setTitle('')
    setContent('')
    setCoverImage('')
    setShowForm(true)
  }

  function openEdit(a: Article) {
    setEditing(a)
    setTitle(a.title)
    setContent(a.content)
    setCoverImage(a.cover_image || '')
    setShowForm(true)
  }

  async function handleSave(published: boolean) {
    if (!title.trim() || !content.trim()) {
      toast.error('Titre et contenu requis')
      return
    }
    setSaving(true)
    const payload = { title, content, cover_image: coverImage || null, published }

    if (editing) {
      await supabase.from('news_articles').update(payload).eq('id', editing.id)
      toast.success('Article mis à jour')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('news_articles').insert({ ...payload, author_id: user!.id })
      toast.success(published ? 'Article publié !' : 'Brouillon sauvegardé')
    }

    setSaving(false)
    setShowForm(false)
    fetchArticles()
  }

  async function togglePublish(a: Article) {
    await supabase.from('news_articles').update({ published: !a.published }).eq('id', a.id)
    toast.success(a.published ? 'Article masqué' : 'Article publié')
    fetchArticles()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet article ?')) return
    await supabase.from('news_articles').delete().eq('id', id)
    toast.success('Article supprimé')
    fetchArticles()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F5F5F5' }}>News</h1>
          <p className="text-sm mt-1" style={{ color: '#5C5C5C' }}>{articles.length} article(s)</p>
        </div>
        <button onClick={openNew} className="btn-gold flex items-center gap-2 px-4 py-2 text-sm">
          <Plus size={16} /> Nouvel article
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-6 border space-y-4"
          style={{ background: 'var(--noir-elevated)', borderColor: 'var(--noir-border)' }}>
          <h2 className="font-semibold" style={{ color: '#F5F5F5' }}>
            {editing ? 'Modifier l\'article' : 'Nouvel article'}
          </h2>

          <div>
            <label className="text-xs tracking-wide mb-1 block" style={{ color: '#A0A0A0' }}>TITRE</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titre de l'article..."
              className="input-premium w-full"
            />
          </div>

          <div>
            <label className="text-xs tracking-wide mb-1 block" style={{ color: '#A0A0A0' }}>IMAGE DE COUVERTURE (URL)</label>
            <input
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="https://..."
              className="input-premium w-full"
            />
          </div>

          <div>
            <label className="text-xs tracking-wide mb-1 block" style={{ color: '#A0A0A0' }}>CONTENU</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Contenu de l'article..."
              rows={8}
              className="input-premium w-full"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="btn-gold px-4 py-2 text-sm">
              {saving ? 'Enregistrement...' : 'Publier'}
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--noir-border)', color: '#A0A0A0' }}>
              Brouillon
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm"
              style={{ color: '#5C5C5C' }}>
              Annuler
            </button>
          </div>
        </motion.div>
      )}

      {/* Articles list */}
      {loading ? (
        <div className="text-center py-12" style={{ color: '#5C5C5C' }}>Chargement...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#5C5C5C' }}>Aucun article</div>
      ) : (
        <div className="space-y-3">
          {articles.map(a => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl p-5 border flex gap-4"
              style={{ background: 'var(--noir-elevated)', borderColor: 'var(--noir-border)' }}>
              {a.cover_image && (
                <img src={a.cover_image} alt="" className="w-20 h-16 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium truncate" style={{ color: '#F5F5F5' }}>{a.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${a.published ? 'badge-buy' : 'badge-sell'}`}>
                    {a.published ? 'Publié' : 'Brouillon'}
                  </span>
                </div>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: '#5C5C5C' }}>{a.content}</p>
                <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#5C5C5C' }}>
                  <span className="flex items-center gap-1"><Heart size={11} /> {a.likes_count}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={11} /> {a.news_comments?.[0]?.count || 0}</span>
                  <span>{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button onClick={() => openEdit(a)} className="p-1.5 rounded" style={{ color: '#D4AF37' }}>
                  <Edit3 size={14} />
                </button>
                <button onClick={() => togglePublish(a)} className="p-1.5 rounded" style={{ color: '#A0A0A0' }}>
                  {a.published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded" style={{ color: '#FF1744' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
