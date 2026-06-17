'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, ThumbsUp, Reply, Plus, Pin, Lock, Search, X, Image, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ForumPost, ForumReply } from '@/types'

export default function ForumPage() {
  const [posts, setPosts]             = useState<ForumPost[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [showNewPost, setShowNewPost] = useState(false)
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null)
  const [userId, setUserId]           = useState<string | null>(null)
  const [likedPosts, setLikedPosts]   = useState<Set<string>>(new Set())
  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('forum_posts')
      .select('*, author:profiles(full_name, role)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setPosts(data as any)
    setLoading(false)
  }, [])

  async function fetchUserLikes(uid: string) {
    const { data } = await supabase
      .from('forum_likes')
      .select('post_id')
      .eq('user_id', uid)
      .not('post_id', 'is', null)
    if (data) setLikedPosts(new Set(data.map(l => l.post_id).filter(Boolean)))
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) fetchUserLikes(uid)
    })
    fetchPosts()

    const channel = supabase
      .channel('forum-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_replies' }, () => {
        if (selectedPost) fetchReplies(selectedPost.id)
        fetchPosts()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const [replies, setReplies]         = useState<ForumReply[]>([])
  const [replyText, setReplyText]     = useState('')
  const [replyImage, setReplyImage]   = useState<File | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [likingPost, setLikingPost]   = useState<string | null>(null)

  async function fetchReplies(postId: string) {
    const { data } = await supabase
      .from('forum_replies')
      .select('*, author:profiles(full_name, role)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setReplies(data as any)
  }

  async function openPost(post: ForumPost) {
    setSelectedPost(post)
    await fetchReplies(post.id)
    await supabase
      .from('forum_posts')
      .update({ views_count: (post.views_count || 0) + 1 })
      .eq('id', post.id)
  }

  async function submitReply() {
    if ((!replyText.trim() && !replyImage) || !selectedPost || !userId) return
    setSubmitting(true)

    let imageUrl: string | null = null

    // Upload image si présente
    if (replyImage) {
      const ext  = replyImage.name.split('.').pop()
      const path = `forum/${selectedPost.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('forum-images')
        .upload(path, replyImage, { upsert: true })
      if (upErr) {
        toast.error("Erreur upload image")
        setSubmitting(false)
        return
      }
      const { data: urlData } = supabase.storage.from('forum-images').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    const { error } = await supabase.from('forum_replies').insert({
      post_id:   selectedPost.id,
      content:   replyText.trim() || null,
      image_url: imageUrl,
      author_id: userId,
    })

    if (error) toast.error('Erreur lors de la publication')
    else {
      setReplyText('')
      setReplyImage(null)
      fetchReplies(selectedPost.id)
    }
    setSubmitting(false)
  }

  async function toggleLike(post: ForumPost) {
    if (!userId) { toast.error('Connectez-vous pour liker'); return }
    if (likingPost === post.id) return
    setLikingPost(post.id)

    const { data, error } = await supabase.rpc('toggle_post_like', {
      p_post_id: post.id,
      p_user_id: userId,
    })

    if (error) {
      toast.error('Erreur')
    } else {
      const isNowLiked = data.liked as boolean
      const newCount   = data.likes_count as number
      setLikedPosts(prev => {
        const next = new Set(prev)
        if (isNowLiked) next.add(post.id)
        else next.delete(post.id)
        return next
      })
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: newCount } : p))
      if (selectedPost?.id === post.id)
        setSelectedPost(prev => prev ? { ...prev, likes_count: newCount } : null)
    }
    setLikingPost(null)
  }

  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Forum Investisseurs</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {posts.length} discussion{posts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => setShowNewPost(true)}
          className="btn-gold flex items-center gap-2">
          <Plus size={15} /> Nouveau sujet
        </motion.button>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5C5C5C' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une discussion..." className="input-premium pl-9 max-w-sm" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card-premium p-5 space-y-2">
              <div className="skeleton h-5 w-64" />
              <div className="skeleton h-4 w-full" />
              <div className="flex gap-4"><div className="skeleton h-3 w-20" /><div className="skeleton h-3 w-20" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
          <p style={{ color: '#5C5C5C' }}>Aucune discussion</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post, i) => {
            const isLiked = likedPosts.has(post.id)
            const authorName = (post.author as any)?.full_name || 'Anonyme'
            const authorInitial = authorName.charAt(0).toUpperCase()
            return (
              <motion.div key={post.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => openPost(post)}
                className="card-premium p-5 cursor-pointer group"
                style={post.is_pinned ? { borderColor: 'rgba(212,175,55,0.25)' } : {}}>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {post.is_pinned && <Pin size={12} style={{ color: '#D4AF37', flexShrink: 0 }} />}
                      {post.is_locked && <Lock size={12} style={{ color: '#707070', flexShrink: 0 }} />}
                      {post.ticker && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded badge-watch">{post.ticker}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{ background: 'var(--noir-elevated)', color: '#707070' }}>
                        {post.category}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm group-hover:text-white transition-colors line-clamp-1"
                      style={{ color: '#E0E0E0' }}>{post.title}</h3>
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: '#5C5C5C' }}>{post.content}</p>
                  </div>
                  <div className="text-xs flex-shrink-0" style={{ color: '#5C5C5C' }}>
                    {formatDistanceToNow(new Date(post.created_at), { locale: fr, addSuffix: true })}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t"
                  style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                      {authorInitial}
                    </div>
                    <span className="text-xs" style={{ color: '#707070' }}>
                      {authorName}
                      {(post.author as any)?.role === 'admin' && (
                        <span className="ml-1 text-[10px] font-bold" style={{ color: '#D4AF37' }}> ADMIN</span>
                      )}
                    </span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleLike(post) }}
                    disabled={likingPost === post.id}
                    className="flex items-center gap-1 text-xs transition-all px-2 py-1 rounded-lg"
                    style={{
                      color:      isLiked ? '#D4AF37' : '#5C5C5C',
                      background: isLiked ? 'rgba(212,175,55,0.1)' : 'transparent',
                      border:     isLiked ? '1px solid rgba(212,175,55,0.25)' : '1px solid transparent',
                    }}>
                    <ThumbsUp size={12} fill={isLiked ? '#D4AF37' : 'none'} />
                    <span>{post.likes_count || 0}</span>
                  </button>
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#5C5C5C' }}>
                    <Reply size={12} /> {post.replies_count || 0}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {showNewPost && userId && (
          <NewPostModal userId={userId} onClose={() => setShowNewPost(false)} onCreated={fetchPosts} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            replies={replies}
            replyText={replyText}
            replyImage={replyImage}
            submitting={submitting}
            isLiked={likedPosts.has(selectedPost.id)}
            onReplyChange={setReplyText}
            onImageChange={setReplyImage}
            onSubmitReply={submitReply}
            onLike={() => toggleLike(selectedPost)}
            onClose={() => { setSelectedPost(null); setReplies([]); setReplyText(''); setReplyImage(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Nouveau Post ───────────────────────────────────────────
function NewPostModal({ userId, onClose, onCreated }: {
  userId: string; onClose: () => void; onCreated: () => void
}) {
  const [form, setForm] = useState({ title: '', content: '', category: 'Général', ticker: '' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('forum_posts').insert({
      ...form, author_id: userId, ticker: form.ticker || null,
    })
    if (error) toast.error('Erreur lors de la publication')
    else { toast.success('Discussion créée'); onCreated(); onClose() }
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border p-6"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>Nouvelle discussion</h2>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Titre de la discussion" required className="input-premium" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="input-premium">
              {['Général','Analyse','Question','Actualité','IPO'].map(c => <option key={c}>{c}</option>)}
            </select>
            <input value={form.ticker} onChange={e => setForm(p => ({ ...p, ticker: e.target.value.toUpperCase() }))}
              placeholder="Ticker (optionnel)" className="input-premium" />
          </div>
          <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="Décrivez votre sujet..." required rows={4} className="input-premium resize-none" />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : 'Publier'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Detail Post ────────────────────────────────────────────
function PostDetailModal({ post, replies, replyText, replyImage, submitting, isLiked, onReplyChange, onImageChange, onSubmitReply, onLike, onClose }: {
  post: ForumPost
  replies: ForumReply[]
  replyText: string
  replyImage: File | null
  submitting: boolean
  isLiked: boolean
  onReplyChange: (t: string) => void
  onImageChange: (f: File | null) => void
  onSubmitReply: () => void
  onLike: () => void
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    onImageChange(file)
    if (file) setPreview(URL.createObjectURL(file))
    else setPreview(null)
  }

  function removeImage() {
    onImageChange(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function authorName(a: any) { return a?.full_name || 'Anonyme' }
  function authorInit(a: any) { return authorName(a).charAt(0).toUpperCase() }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border flex flex-col"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="px-5 py-4 border-b flex items-start justify-between flex-shrink-0"
          style={{ borderColor: 'var(--noir-border)' }}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              {post.ticker && <span className="badge-watch text-[10px] font-bold px-2 py-0.5 rounded">{post.ticker}</span>}
              <span className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'var(--noir-elevated)', color: '#707070' }}>{post.category}</span>
            </div>
            <h2 className="font-semibold" style={{ color: '#F5F5F5' }}>{post.title}</h2>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Post original */}
          <div className="p-4 rounded-xl" style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                {authorInit(post.author)}
              </div>
              <span className="text-sm font-medium" style={{ color: '#A0A0A0' }}>
                {authorName(post.author)}
                {(post.author as any)?.role === 'admin' && (
                  <span className="ml-1 text-[10px] badge-watch px-1.5 py-0.5 rounded"> ADMIN</span>
                )}
              </span>
              <span className="text-xs ml-auto" style={{ color: '#3A3A3A' }}>
                {formatDistanceToNow(new Date(post.created_at), { locale: fr, addSuffix: true })}
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#C0C0C0' }}>
              {post.content}
            </p>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
              <button onClick={onLike}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all"
                style={{
                  color:      isLiked ? '#D4AF37' : '#707070',
                  background: isLiked ? 'rgba(212,175,55,0.1)' : 'transparent',
                  border:     isLiked ? '1px solid rgba(212,175,55,0.25)' : '1px solid transparent',
                }}>
                <ThumbsUp size={12} fill={isLiked ? '#D4AF37' : 'none'} />
                {post.likes_count || 0} j'aime
              </button>
            </div>
          </div>

          {/* Réponses */}
          {replies.map((r, i) => (
            <motion.div key={r.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="ml-4 p-4 rounded-xl"
              style={{
                background: (r.author as any)?.role === 'admin' ? 'rgba(212,175,55,0.05)' : 'var(--noir-elevated)',
                border: `1px solid ${(r.author as any)?.role === 'admin' ? 'rgba(212,175,55,0.2)' : 'var(--noir-border)'}`,
              }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: (r.author as any)?.role === 'admin' ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)',
                    color: (r.author as any)?.role === 'admin' ? '#D4AF37' : '#A0A0A0',
                  }}>
                  {authorInit(r.author)}
                </div>
                <span className="text-xs font-medium" style={{ color: '#A0A0A0' }}>
                  {authorName(r.author)}
                  {(r.author as any)?.role === 'admin' && (
                    <span className="ml-1 text-[10px] badge-watch px-1.5 py-0.5 rounded"> ADMIN</span>
                  )}
                </span>
                <span className="text-xs ml-auto" style={{ color: '#3A3A3A' }}>
                  {formatDistanceToNow(new Date(r.created_at), { locale: fr, addSuffix: true })}
                </span>
              </div>
              {r.content && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#C0C0C0' }}>
                  {r.content}
                </p>
              )}
              {(r as any).image_url && (
                <img src={(r as any).image_url} alt="image"
                  className="mt-2 rounded-lg max-w-full max-h-64 object-contain cursor-pointer"
                  onClick={() => window.open((r as any).image_url, '_blank')}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Zone de réponse — fixée en bas, padding pour éviter le bouton IA flottant */}
        {!post.is_locked && (
          <div className="px-4 pt-3 pb-20 border-t flex-shrink-0" style={{ borderColor: 'var(--noir-border)' }}>

            {/* Prévisualisation image */}
            {preview && (
              <div className="relative mb-2 inline-block">
                <img src={preview} alt="preview" className="h-20 rounded-lg object-cover" />
                <button onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: '#FF1744' }}>
                  <X size={10} color="white" />
                </button>
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={replyText}
              onChange={e => onReplyChange(e.target.value)}
              placeholder="Votre réponse..."
              rows={2}
              className="input-premium w-full resize-none text-sm"
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmitReply() }}
            />

            {/* Boutons sous le textarea */}
            <div className="flex items-center justify-between mt-2">
              {/* Bouton image */}
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  color:      replyImage ? '#D4AF37' : '#707070',
                  background: replyImage ? 'rgba(212,175,55,0.1)' : 'var(--noir-elevated)',
                  border:     '1px solid var(--noir-border)',
                }}>
                <Image size={13} />
                {replyImage ? 'Image ajoutée' : 'Ajouter une image'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {/* Bouton envoyer */}
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={onSubmitReply}
                disabled={(!replyText.trim() && !replyImage) || submitting}
                className="btn-gold flex items-center gap-2 px-4 py-2"
                style={{ opacity: (!replyText.trim() && !replyImage) ? 0.5 : 1 }}>
                {submitting
                  ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  : <><Send size={13} /> Envoyer</>}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
