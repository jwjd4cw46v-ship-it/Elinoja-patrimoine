'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Pin, Lock, Unlock, Trash2, Reply, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ForumPost, ForumReply } from '@/types'

export default function AdminForumPage() {
  const [posts, setPosts]     = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ForumPost | null>(null)
  const [replies, setReplies] = useState<ForumReply[]>([])
  const [replyText, setReplyText] = useState('')
  const [userId, setUserId]   = useState<string | null>(null)
  const supabase = createClient()

  async function fetchPosts() {
    const { data } = await supabase.from('forum_posts')
      .select('*, author:profiles(full_name, role, badge)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setPosts(data as any)
    setLoading(false)
  }

  async function fetchReplies(postId: string) {
    const { data } = await supabase.from('forum_replies')
      .select('*, author:profiles(full_name, role, badge)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setReplies(data as any)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
    fetchPosts()
    const ch = supabase.channel('forum-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_replies' }, () => {
        if (selected) fetchReplies(selected.id)
        fetchPosts()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function togglePin(post: ForumPost) {
    await supabase.from('forum_posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id)
    fetchPosts()
    toast.success(post.is_pinned ? 'Désépinglé' : 'Épinglé')
  }

  async function toggleLock(post: ForumPost) {
    await supabase.from('forum_posts').update({ is_locked: !post.is_locked }).eq('id', post.id)
    fetchPosts()
    toast.success(post.is_locked ? 'Discussion ouverte' : 'Discussion verrouillée')
  }

  // Supprime un sujet ET ses réponses. On supprime d'abord les réponses
  // explicitement (avant le post) : même si la contrainte de clé étrangère
  // côté base est corrigée en ON DELETE CASCADE (voir migration SQL), ce
  // filet de sécurité applicatif évite toute dépendance silencieuse à la
  // config exacte de la base. On vérifie aussi vraiment l'erreur retournée
  // par Supabase au lieu d'afficher un succès inconditionnel.
  async function deletePost(id: string) {
    if (!confirm('Supprimer cette discussion et toutes ses réponses ?')) return
    const { error: repliesError } = await supabase.from('forum_replies').delete().eq('post_id', id)
    if (repliesError) {
      toast.error(`Échec de la suppression des réponses : ${repliesError.message}`)
      return
    }
    const { error } = await supabase.from('forum_posts').delete().eq('id', id)
    if (error) {
      toast.error(`Échec de la suppression : ${error.message}`)
      return
    }
    toast.success('Discussion supprimée')
    fetchPosts()
    if (selected?.id === id) setSelected(null)
  }

  async function submitAdminReply() {
    if (!replyText.trim() || !selected || !userId) return
    const { error } = await supabase.from('forum_replies').insert({
      post_id: selected.id, content: replyText.trim(),
      author_id: userId, is_admin_reply: true,
    })
    if (!error) { setReplyText(''); fetchReplies(selected.id); toast.success('Réponse publiée') }
    else toast.error(`Échec de l'envoi : ${error.message}`)
  }

  async function deleteReply(id: string) {
    if (!confirm('Supprimer cette réponse ?')) return
    const { error } = await supabase.from('forum_replies').delete().eq('id', id)
    if (error) { toast.error(`Échec de la suppression : ${error.message}`); return }
    toast.success('Réponse supprimée')
    if (selected) fetchReplies(selected.id)
    fetchPosts()
  }

  // ── Badges auteur (même logique que le forum client) ──────────
  const BADGES: Record<string, { label: string; emoji: string; color: string }> = {
    expert:      { label: 'Expert',     emoji: '⭐', color: '#D4AF37' },
    moderateur:  { label: 'Modérateur', emoji: '🛡️', color: '#3B82F6' },
    verifie:     { label: 'Vérifié',    emoji: '✓',  color: '#22C55E' },
  }
  function AuthorBadge({ role, badge }: { role?: string; badge?: string | null }) {
    if (role === 'admin') {
      return <span className="ml-1 text-[10px] badge-watch px-1.5 py-0.5 rounded">ADMIN</span>
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Forum</h1>
        <p className="text-sm mt-0.5" style={{ color: '#707070' }}>{posts.length} discussions</p>
      </div>

      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}</div>
        ) : (
          <table className="table-premium">
            <thead><tr><th>Discussion</th><th>Auteur</th><th>Vues</th><th>Réponses</th><th>Statut</th><th>Date</th><th style={{ width: 100 }}>Actions</th></tr></thead>
            <tbody>
              {posts.map((post, i) => (
                <motion.tr key={post.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="cursor-pointer" onClick={() => { setSelected(post); fetchReplies(post.id) }}>
                  <td>
                    <div className="flex items-center gap-2">
                      {post.is_pinned && <Pin size={12} style={{ color: '#D4AF37', flexShrink: 0 }} />}
                      {post.is_locked && <Lock size={12} style={{ color: '#707070', flexShrink: 0 }} />}
                      <span className="text-sm font-medium line-clamp-1" style={{ color: '#F5F5F5', maxWidth: 280 }}>{post.title}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs" style={{ color: '#A0A0A0' }}>
                      {(post.author as any)?.full_name}
                      <AuthorBadge role={(post.author as any)?.role} badge={(post.author as any)?.badge} />
                    </span>
                  </td>
                  <td><span className="text-xs" style={{ color: '#707070' }}>{post.views_count || 0}</span></td>
                  <td><span className="text-xs" style={{ color: '#707070' }}>{post.replies_count || 0}</span></td>
                  <td>
                    <div className="flex gap-1">
                      {post.is_pinned && <span className="text-[10px] badge-watch px-1.5 py-0.5 rounded">Épinglé</span>}
                      {post.is_locked && <span className="text-[10px] badge-sell px-1.5 py-0.5 rounded">Verrouillé</span>}
                    </div>
                  </td>
                  <td><span className="text-xs" style={{ color: '#5C5C5C' }}>{formatDistanceToNow(new Date(post.created_at), { locale: fr, addSuffix: true })}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => togglePin(post)} title={post.is_pinned ? 'Désépingler' : 'Épingler'} className="p-1.5 rounded-lg" style={{ color: post.is_pinned ? '#D4AF37' : '#5C5C5C' }}><Pin size={12} /></button>
                      <button onClick={() => toggleLock(post)} title={post.is_locked ? 'Déverrouiller' : 'Verrouiller'} className="p-1.5 rounded-lg" style={{ color: post.is_locked ? '#FF9800' : '#5C5C5C' }}>
                        {post.is_locked ? <Unlock size={12} /> : <Lock size={12} />}
                      </button>
                      <button onClick={() => deletePost(post.id)} className="p-1.5 rounded-lg" style={{ color: '#5C5C5C' }}
                        onMouseOver={e => (e.currentTarget.style.color = '#FF1744')}
                        onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Post detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}
            onClick={e => e.target === e.currentTarget && setSelected(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="w-full max-w-2xl rounded-2xl border flex flex-col"
              style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)', maxHeight: '85vh' }}>

              <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--noir-border)' }}>
                <h2 className="font-semibold text-sm line-clamp-1 pr-4" style={{ color: '#F5F5F5' }}>{selected.title}</h2>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button onClick={() => deletePost(selected.id)} title="Supprimer cette discussion"
                    className="p-1.5 rounded-lg" style={{ color: '#5C5C5C' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#FF1744')}
                    onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setSelected(null)}><X size={16} style={{ color: '#5C5C5C' }} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="p-4 rounded-xl" style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#C0C0C0' }}>{selected.content}</p>
                </div>

                {replies.map(r => (
                  <div key={r.id} className="ml-6 p-3 rounded-xl group relative"
                    style={{
                      background: (r.author as any)?.role === 'admin' ? 'rgba(212,175,55,0.06)' : 'var(--noir-elevated)',
                      border: `1px solid ${(r.author as any)?.role === 'admin' ? 'rgba(212,175,55,0.2)' : 'var(--noir-border)'}`,
                    }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium" style={{ color: '#A0A0A0' }}>
                        {(r.author as any)?.full_name}
                        <AuthorBadge role={(r.author as any)?.role} badge={(r.author as any)?.badge} />
                      </span>
                      <span className="text-xs ml-auto" style={{ color: '#3A3A3A' }}>
                        {formatDistanceToNow(new Date(r.created_at), { locale: fr, addSuffix: true })}
                      </span>
                      <button onClick={() => deleteReply(r.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                        style={{ color: '#FF1744' }}><Trash2 size={11} /></button>
                    </div>
                    <p className="text-sm" style={{ color: '#C0C0C0' }}>{r.content}</p>
                  </div>
                ))}
              </div>

              {!selected.is_locked && (
                <div className="px-5 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--noir-border)' }}>
                  <div className="mb-2 text-xs font-semibold" style={{ color: '#D4AF37' }}>Réponse admin</div>
                  <div className="flex gap-3">
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                      placeholder="Répondre en tant qu'administrateur..." rows={2}
                      className="input-premium flex-1 resize-none text-sm" />
                    <motion.button whileTap={{ scale: 0.95 }} onClick={submitAdminReply}
                      disabled={!replyText.trim()}
                      className="btn-gold px-4 self-end flex items-center gap-2"
                      style={{ opacity: !replyText.trim() ? 0.5 : 1 }}>
                      <Reply size={14} /> Envoyer
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
