'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, ThumbsUp, Reply, Plus, Pin, Lock, Search, X, Eye, Award, Clock, Image as ImageIcon, Mic, Square, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ForumPost, ForumReply } from '@/types'

// ── Catégories du forum ─────────────────────────────
const CATEGORIES: { key: string; emoji: string }[] = [
  { key: 'Analyse technique',     emoji: '📈' },
  { key: 'Analyse fondamentale',  emoji: '📊' },
  { key: 'Actualités',            emoji: '📰' },
  { key: 'Portefeuille',          emoji: '💼' },
  { key: 'Stratégies',            emoji: '🎯' },
  { key: 'BVMT',                  emoji: '🇹🇳' },
  { key: 'Débutants',             emoji: '❓' },
]
function categoryEmoji(cat?: string) {
  return CATEGORIES.find(c => c.key === cat)?.emoji ?? ''
}

// ── Badges auteur ────────────────────────────────────
const BADGES: Record<string, { label: string; emoji: string; color: string }> = {
  expert:      { label: 'Expert',     emoji: '⭐', color: '#D4AF37' },
  moderateur:  { label: 'Modérateur', emoji: '🛡️', color: '#3B82F6' },
  verifie:     { label: 'Vérifié',    emoji: '✓',  color: '#22C55E' },
}
function AuthorBadge({ role, badge }: { role?: string; badge?: string | null }) {
  if (role === 'admin') {
    return <span className="ml-1 text-[10px] font-bold badge-watch px-1.5 py-0.5 rounded">ADMIN</span>
  }
  const cfg = badge ? BADGES[badge] : null
  if (!cfg) return null
  return (
    <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
      {cfg.emoji} {cfg.label}
    </span>
  )
}

// ── Niveaux de réputation (automatiques, distincts des badges manuels) ──
// 🥉 Investisseur 0–99 · 🥈 Analyste 100–499 · 🥇 Expert 500–1999 · 💎 Mentor 2000+
const LEVELS = [
  { min: 2000, emoji: '💎', label: 'Mentor' },
  { min: 500,  emoji: '🥇', label: 'Expert' },
  { min: 100,  emoji: '🥈', label: 'Analyste' },
  { min: 0,    emoji: '🥉', label: 'Investisseur' },
]
function getLevel(reputation: number) {
  return LEVELS.find(l => reputation >= l.min)!
}

// ── Pièces jointes (image + message vocal) ──────────────────────────
async function uploadForumMedia(supabase: ReturnType<typeof createClient>, userId: string, file: File | Blob, ext: string): Promise<string> {
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('forum-media').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('forum-media').getPublicUrl(path)
  return data.publicUrl
}

/** Bouton d'enregistrement vocal — composant contrôlé (value/onChange). */
function VoiceRecorderButton({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const [recording, setRecording] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!value) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        onChange(new Blob(chunksRef.current, { type: 'audio/webm' }))
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      recorderRef.current = mr
      setRecording(true)
    } catch {
      toast.error("Micro inaccessible — vérifie l'autorisation du navigateur")
    }
  }
  function stop() {
    recorderRef.current?.stop()
    setRecording(false)
  }

  if (value && previewUrl) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
        <audio controls src={previewUrl} style={{ height: 28, maxWidth: 180 }} />
        <button type="button" onClick={() => onChange(null)}><Trash2 size={13} style={{ color: '#FF1744' }} /></button>
      </div>
    )
  }

  return (
    <button type="button" onClick={recording ? stop : start}
      className="p-2 rounded-lg flex items-center gap-1.5 text-xs"
      style={{
        background: recording ? 'rgba(255,23,68,0.12)' : 'var(--noir-elevated)',
        border: `1px solid ${recording ? 'rgba(255,23,68,0.35)' : 'var(--noir-border)'}`,
        color: recording ? '#FF1744' : '#A0A0A0',
      }}>
      {recording ? <><Square size={13} fill="#FF1744" /> Arrêter</> : <Mic size={13} />}
    </button>
  )
}

export default function ForumPage() {
  const [posts, setPosts]           = useState<ForumPost[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('Tous')
  const [showNewPost, setShowNewPost] = useState(false)
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null)
  const [userId, setUserId]         = useState<string | null>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set())
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const supabase = createClient()

  // ── Charger les posts ──────────────────────────────
  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('forum_posts')
      .select('*, author:profiles(full_name, role, badge)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setPosts(data as any)
    setLoading(false)
  }, [])

  // ── Charger les likes de l'utilisateur (posts + réponses) ────────────
  async function fetchUserLikes(uid: string) {
    const { data } = await supabase
      .from('forum_likes')
      .select('post_id, reply_id')
      .eq('user_id', uid)
    if (data) {
      setLikedPosts(new Set(data.map(l => l.post_id).filter(Boolean)))
      setLikedReplies(new Set(data.map(l => l.reply_id).filter(Boolean)))
    }
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

  const [replies, setReplies]       = useState<ForumReply[]>([])
  const [replyText, setReplyText]   = useState('')
  const [replyImage, setReplyImage] = useState<File | null>(null)
  const [replyAudio, setReplyAudio] = useState<Blob | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [likingPost, setLikingPost] = useState<string | null>(null)
  const [likingReply, setLikingReply] = useState<string | null>(null)

  async function fetchReplies(postId: string) {
    const { data } = await supabase
      .from('forum_replies')
      .select('*, author:profiles(full_name, role, badge)')
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
    if (!replyText.trim() || !selectedPost || !userId) return
    setSubmitting(true)
    try {
      let image_url: string | null = null
      let audio_url: string | null = null
      if (replyImage) image_url = await uploadForumMedia(supabase, userId, replyImage, replyImage.name.split('.').pop() || 'jpg')
      if (replyAudio) audio_url = await uploadForumMedia(supabase, userId, replyAudio, 'webm')

      const { error } = await supabase.from('forum_replies').insert({
        post_id:   selectedPost.id,
        content:   replyText.trim(),
        author_id: userId,
        image_url, audio_url,
      })
      if (error) throw error
      setReplyText('')
      setReplyImage(null)
      setReplyAudio(null)
      fetchReplies(selectedPost.id)
    } catch {
      toast.error('Erreur lors de la publication')
    }
    setSubmitting(false)
  }

  // ── Toggle like avec fonction SQL ─────────────────
  async function toggleLike(post: ForumPost) {
    if (!userId) { toast.error('Connectez-vous pour liker'); return }
    if (likingPost === post.id) return // éviter double-clic
    setLikingPost(post.id)

    const { data, error } = await supabase.rpc('toggle_post_like', {
      p_post_id:  post.id,
      p_user_id:  userId,
    })

    if (error) {
      toast.error('Erreur')
    } else {
      // Mettre à jour l'état local immédiatement (sans attendre le realtime)
      const isNowLiked = data.liked as boolean
      const newCount   = data.likes_count as number

      setLikedPosts(prev => {
        const next = new Set(prev)
        if (isNowLiked) next.add(post.id)
        else next.delete(post.id)
        return next
      })

      setPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, likes_count: newCount } : p
      ))

      if (selectedPost?.id === post.id) {
        setSelectedPost(prev => prev ? { ...prev, likes_count: newCount } : null)
      }
    }
    setLikingPost(null)
  }

  // ── Toggle like sur une réponse (nouveau — nécessaire pour la
  // réputation "réponses utiles") ────────────────────────────────────
  async function toggleReplyLike(reply: ForumReply) {
    if (!userId) { toast.error('Connectez-vous pour liker'); return }
    if (likingReply === reply.id) return
    setLikingReply(reply.id)

    const { data, error } = await supabase.rpc('toggle_reply_like', {
      p_reply_id: reply.id,
      p_user_id:  userId,
    })

    if (error) {
      toast.error('Erreur')
    } else {
      const isNowLiked = data.liked as boolean
      const newCount   = data.likes_count as number

      setLikedReplies(prev => {
        const next = new Set(prev)
        if (isNowLiked) next.add(reply.id)
        else next.delete(reply.id)
        return next
      })

      setReplies(prev => prev.map(r =>
        r.id === reply.id ? { ...r, likes_count: newCount } : r
      ))
    }
    setLikingReply(null)
  }

  const filtered = posts.filter(p =>
    (categoryFilter === 'Tous' || p.category === categoryFilter) &&
    (p.title.toLowerCase().includes(search.toLowerCase()) ||
     p.content?.toLowerCase().includes(search.toLowerCase()))
  )

  // ── Page d'accueil réorganisée : épinglé en avant, actives, récentes ──
  const pinnedPost   = filtered.find(p => p.is_pinned) ?? null
  const rest         = filtered.filter(p => p.id !== pinnedPost?.id)
  const activePosts  = [...rest]
    .sort((a, b) => ((b.replies_count || 0) + (b.likes_count || 0)) - ((a.replies_count || 0) + (a.likes_count || 0)))
    .slice(0, 3)
  const recentPosts  = [...rest].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  function renderCard(post: ForumPost, i: number) {
    const isLiked = likedPosts.has(post.id)
    return (
      <motion.div key={post.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
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
                {categoryEmoji(post.category)} {post.category}
              </span>
            </div>
            <h3 className="font-semibold text-sm group-hover:text-white transition-colors line-clamp-1"
              style={{ color: '#E0E0E0' }}>
              {post.title}
            </h3>
            <p className="text-xs mt-1 line-clamp-1" style={{ color: '#5C5C5C' }}>{post.content}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-xs" style={{ color: '#5C5C5C' }}>
              {formatDistanceToNow(new Date(post.created_at), { locale: fr, addSuffix: true })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t"
          style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
          <div className="flex items-center gap-1.5 cursor-pointer"
            onClick={e => { e.stopPropagation(); setProfileUserId(post.author_id) }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
              {(post.author as any)?.full_name?.charAt(0) || '?'}
            </div>
            <span className="text-xs" style={{ color: '#707070' }}>
              {(post.author as any)?.full_name}
              <AuthorBadge role={(post.author as any)?.role} badge={(post.author as any)?.badge} />
            </span>
          </div>

          {/* Bouton Like */}
          <button
            onClick={e => { e.stopPropagation(); toggleLike(post) }}
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

          <div className="flex items-center gap-1 text-xs" style={{ color: '#5C5C5C' }}>
            <Eye size={12} /> {post.views_count || 0}
          </div>
        </div>
      </motion.div>
    )
  }

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

      {/* Filtres par catégorie */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {['Tous', ...CATEGORIES.map(c => c.key)].map(cat => {
          const active = categoryFilter === cat
          const emoji = cat === 'Tous' ? '' : categoryEmoji(cat)
          return (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
              style={{
                background: active ? 'rgba(212,175,55,0.15)' : 'var(--noir-elevated)',
                border: `1px solid ${active ? 'rgba(212,175,55,0.4)' : 'var(--noir-border)'}`,
                color: active ? '#D4AF37' : '#A0A0A0',
                whiteSpace: 'nowrap',
              }}>
              {emoji ? `${emoji} ` : ''}{cat}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card-premium p-5 space-y-2">
              <div className="skeleton h-5 w-64" />
              <div className="skeleton h-4 w-full" />
              <div className="flex gap-4">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
          <p style={{ color: '#5C5C5C' }}>Aucune discussion</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sujet épinglé */}
          {pinnedPost && (
            <div>
              <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#D4AF37' }}>
                <Pin size={12} /> Sujet épinglé
              </div>
              {renderCard(pinnedPost, 0)}
            </div>
          )}

          {/* Discussions les plus actives */}
          {activePosts.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: '#707070' }}>
                🔥 Discussions les plus actives
              </div>
              <div className="space-y-2">
                {activePosts.map((post, i) => renderCard(post, i))}
              </div>
            </div>
          )}

          {/* Discussions récentes */}
          {recentPosts.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: '#707070' }}>
                Discussions récentes
              </div>
              <div className="space-y-2">
                {recentPosts.map((post, i) => renderCard(post, i))}
              </div>
            </div>
          )}
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
            submitting={submitting}
            isLiked={likedPosts.has(selectedPost.id)}
            likedReplies={likedReplies}
            replyImage={replyImage}
            replyAudio={replyAudio}
            onReplyImageChange={setReplyImage}
            onReplyAudioChange={setReplyAudio}
            onReplyChange={setReplyText}
            onSubmitReply={submitReply}
            onLike={() => toggleLike(selectedPost)}
            onLikeReply={toggleReplyLike}
            onClose={() => { setSelectedPost(null); setReplies([]) }}
            onOpenProfile={setProfileUserId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileUserId && (
          <ProfileCardModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Nouveau Post ───────────────────────────────────────────
function NewPostModal({ userId, onClose, onCreated }: {
  userId: string; onClose: () => void; onCreated: () => void
}) {
  const [form, setForm] = useState({ title: '', content: '', category: CATEGORIES[0].key, ticker: '' })
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const supabase = createClient()

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { toast.error('Image trop lourde (max 8 Mo)'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      let image_url: string | null = null
      let audio_url: string | null = null
      if (imageFile) image_url = await uploadForumMedia(supabase, userId, imageFile, imageFile.name.split('.').pop() || 'jpg')
      if (audioBlob) audio_url = await uploadForumMedia(supabase, userId, audioBlob, 'webm')

      const { error } = await supabase.from('forum_posts').insert({
        ...form, author_id: userId, ticker: form.ticker || null, image_url, audio_url,
      })
      if (error) throw error
      toast.success('Discussion créée')
      onCreated()
      onClose()
    } catch {
      toast.error('Erreur lors de la publication')
    }
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
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.key}</option>)}
            </select>
            <input value={form.ticker} onChange={e => setForm(p => ({ ...p, ticker: e.target.value.toUpperCase() }))}
              placeholder="Ticker (optionnel)" className="input-premium" />
          </div>
          <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="Décrivez votre sujet..." required rows={4} className="input-premium resize-none" />

          {imagePreview && (
            <div className="relative inline-block">
              <img src={imagePreview} alt="" className="rounded-lg" style={{ maxHeight: 140, maxWidth: '100%' }} />
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                className="absolute -top-2 -right-2 rounded-full p-1"
                style={{ background: '#1A1A1A', border: '1px solid var(--noir-border)' }}>
                <X size={12} style={{ color: '#FF1744' }} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="p-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer"
              style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)', color: '#A0A0A0' }}>
              <ImageIcon size={13} /> Image
              <input type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
            </label>
            <VoiceRecorderButton value={audioBlob} onChange={setAudioBlob} />
          </div>

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
function PostDetailModal({ post, replies, replyText, submitting, isLiked, likedReplies, replyImage, replyAudio, onReplyImageChange, onReplyAudioChange, onReplyChange, onSubmitReply, onLike, onLikeReply, onClose, onOpenProfile }: {
  post: ForumPost
  replies: ForumReply[]
  replyText: string
  submitting: boolean
  isLiked: boolean
  likedReplies: Set<string>
  replyImage: File | null
  replyAudio: Blob | null
  onReplyImageChange: (f: File | null) => void
  onReplyAudioChange: (b: Blob | null) => void
  onReplyChange: (t: string) => void
  onSubmitReply: () => void
  onLike: () => void
  onLikeReply: (reply: ForumReply) => void
  onClose: () => void
  onOpenProfile: (userId: string) => void
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border flex flex-col"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)', maxHeight: '85vh' }}>

        <div className="px-5 py-4 border-b flex items-start justify-between flex-shrink-0"
          style={{ borderColor: 'var(--noir-border)' }}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              {post.ticker && (
                <span className="badge-watch text-[10px] font-bold px-2 py-0.5 rounded">{post.ticker}</span>
              )}
              <span className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'var(--noir-elevated)', color: '#707070' }}>
                {categoryEmoji(post.category)} {post.category}
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: '#5C5C5C' }}>
                <Eye size={12} /> {post.views_count || 0}
              </span>
            </div>
            <h2 className="font-semibold" style={{ color: '#F5F5F5' }}>{post.title}</h2>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Post original */}
          <div className="p-4 rounded-xl"
            style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
            <div className="flex items-center gap-2 mb-3 cursor-pointer"
              onClick={() => onOpenProfile(post.author_id)}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                {(post.author as any)?.full_name?.charAt(0)}
              </div>
              <span className="text-sm font-medium" style={{ color: '#A0A0A0' }}>
                {(post.author as any)?.full_name}
                <AuthorBadge role={(post.author as any)?.role} badge={(post.author as any)?.badge} />
              </span>
              <span className="text-xs ml-auto" style={{ color: '#3A3A3A' }}>
                {formatDistanceToNow(new Date(post.created_at), { locale: fr, addSuffix: true })}
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#C0C0C0' }}>
              {post.content}
            </p>
            {post.image_url && (
              <img src={post.image_url} alt="" className="rounded-lg mt-3" style={{ maxWidth: '100%', maxHeight: 320 }} />
            )}
            {post.audio_url && (
              <audio controls src={post.audio_url} className="mt-3" style={{ width: '100%', height: 32 }} />
            )}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t"
              style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
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
              transition={{ delay: i * 0.05 }}
              className="ml-6 p-4 rounded-xl"
              style={{
                background: (r.author as any)?.role === 'admin'
                  ? 'rgba(212,175,55,0.05)' : 'var(--noir-elevated)',
                border: `1px solid ${(r.author as any)?.role === 'admin'
                  ? 'rgba(212,175,55,0.2)' : 'var(--noir-border)'}`,
              }}>
              <div className="flex items-center gap-2 mb-2 cursor-pointer"
                onClick={() => onOpenProfile(r.author_id)}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: (r.author as any)?.role === 'admin'
                      ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)',
                    color: (r.author as any)?.role === 'admin' ? '#D4AF37' : '#A0A0A0',
                  }}>
                  {(r.author as any)?.full_name?.charAt(0)}
                </div>
                <span className="text-xs font-medium" style={{ color: '#A0A0A0' }}>
                  {(r.author as any)?.full_name}
                  <AuthorBadge role={(r.author as any)?.role} badge={(r.author as any)?.badge} />
                </span>
                <span className="text-xs ml-auto" style={{ color: '#3A3A3A' }}>
                  {formatDistanceToNow(new Date(r.created_at), { locale: fr, addSuffix: true })}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#C0C0C0' }}>
                {r.content}
              </p>
              {r.image_url && (
                <img src={r.image_url} alt="" className="rounded-lg mt-2" style={{ maxWidth: '100%', maxHeight: 220 }} />
              )}
              {r.audio_url && (
                <audio controls src={r.audio_url} className="mt-2" style={{ width: '100%', height: 30 }} />
              )}
              <button
                onClick={() => onLikeReply(r)}
                className="flex items-center gap-1 text-xs mt-2 px-2 py-1 rounded-lg transition-all"
                style={{
                  color:      likedReplies.has(r.id) ? '#D4AF37' : '#5C5C5C',
                  background: likedReplies.has(r.id) ? 'rgba(212,175,55,0.1)' : 'transparent',
                  border:     likedReplies.has(r.id) ? '1px solid rgba(212,175,55,0.25)' : '1px solid transparent',
                }}>
                <ThumbsUp size={11} fill={likedReplies.has(r.id) ? '#D4AF37' : 'none'} />
                <span>{(r as any).likes_count || 0}</span>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Zone de réponse */}
        {!post.is_locked && (
          <div className="px-5 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--noir-border)' }}>
            {replyImage && (
              <div className="relative inline-block mb-2">
                <img src={URL.createObjectURL(replyImage)} alt="" className="rounded-lg" style={{ maxHeight: 100 }} />
                <button type="button" onClick={() => onReplyImageChange(null)}
                  className="absolute -top-2 -right-2 rounded-full p-1"
                  style={{ background: '#1A1A1A', border: '1px solid var(--noir-border)' }}>
                  <X size={11} style={{ color: '#FF1744' }} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <label className="p-1.5 rounded-lg flex items-center cursor-pointer"
                style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)', color: '#A0A0A0' }}>
                <ImageIcon size={13} />
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onReplyImageChange(f) }} />
              </label>
              <VoiceRecorderButton value={replyAudio} onChange={onReplyAudioChange} />
            </div>
            <div className="flex gap-3">
              <textarea value={replyText} onChange={e => onReplyChange(e.target.value)}
                placeholder="Votre réponse..." rows={2}
                className="input-premium flex-1 resize-none text-sm"
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmitReply() }} />
              <motion.button whileTap={{ scale: 0.95 }} onClick={onSubmitReply}
                disabled={!replyText.trim() || submitting}
                className="btn-gold px-4 self-end flex items-center gap-2"
                style={{ opacity: !replyText.trim() ? 0.5 : 1 }}>
                {submitting
                  ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  : <Reply size={14} />}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Fiche profil membre (avatar, badge, ancienneté, publications, réputation, dernière connexion) ──
function ProfileCardModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<{
    full_name: string; role: string; badge: string | null
    created_at: string; last_sign_in_at: string | null; avatar_url: string | null
  } | null>(null)
  const [stats, setStats] = useState<{ publications_count: number; reputation: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from('profiles')
          .select('full_name, role, badge, created_at, last_sign_in_at, avatar_url')
          .eq('id', userId).single(),
        supabase.rpc('get_profile_stats', { p_user_id: userId }),
      ])
      if (!cancelled) {
        setProfile(p as any)
        setStats(s as any)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-xs rounded-2xl border overflow-hidden"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        <div className="px-5 py-3 border-b flex items-center justify-end" style={{ borderColor: 'var(--noir-border)' }}>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>

        {loading || !profile ? (
          <div className="p-8 space-y-3">
            <div className="skeleton h-16 w-16 rounded-full mx-auto" />
            <div className="skeleton h-4 w-32 mx-auto rounded" />
          </div>
        ) : (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-xl font-bold overflow-hidden"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : profile.full_name?.charAt(0)}
            </div>

            <div>
              <div className="font-semibold" style={{ color: '#F5F5F5' }}>
                {profile.full_name}
                <AuthorBadge role={profile.role} badge={profile.badge} />
              </div>
              {(() => {
                const level = getLevel(stats?.reputation ?? 0)
                return (
                  <div className="text-xs mt-1 font-medium" style={{ color: '#D4AF37' }}>
                    {level.emoji} {level.label}
                  </div>
                )
              })()}
              <div className="text-xs mt-1" style={{ color: '#5C5C5C' }}>
                Membre depuis {formatDistanceToNow(new Date(profile.created_at), { locale: fr })}
              </div>
              {profile.last_sign_in_at && (
                <div className="text-xs mt-0.5 flex items-center justify-center gap-1" style={{ color: '#5C5C5C' }}>
                  <Clock size={11} />
                  Vu {formatDistanceToNow(new Date(profile.last_sign_in_at), { locale: fr, addSuffix: true })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 pt-3 border-t" style={{ borderColor: 'var(--noir-border)' }}>
              <div>
                <div className="text-lg font-bold" style={{ color: '#F5F5F5' }}>{stats?.publications_count ?? 0}</div>
                <div className="text-[10px]" style={{ color: '#707070' }}>Publications</div>
              </div>
              <div>
                <div className="text-lg font-bold flex items-center gap-1 justify-center" style={{ color: '#D4AF37' }}>
                  <Award size={14} /> {stats?.reputation ?? 0}
                </div>
                <div className="text-[10px]" style={{ color: '#707070' }}>Réputation</div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
