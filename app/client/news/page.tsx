'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageSquare, Send, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Comment = {
  id: string
  content: string
  created_at: string
  profiles: { full_name: string }
}

type Article = {
  id: string
  title: string
  content: string
  cover_image: string | null
  likes_count: number
  created_at: string
  liked?: boolean
  comments?: Comment[]
}

export default function ClientNewsPage() {
  const supabase = createClient()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })
    fetchArticles()
  }, [])

  async function fetchArticles() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('news_articles')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    const { data: likes } = await supabase
      .from('news_likes')
      .select('article_id')
      .eq('user_id', user!.id)

    const likedIds = new Set(likes?.map(l => l.article_id))

    setArticles(data.map(a => ({ ...a, liked: likedIds.has(a.id), comments: [] })))
    setLoading(false)
  }

  async function toggleLike(article: Article) {
    if (!userId) return
    const { data } = await supabase.rpc('toggle_news_like', {
      p_article_id: article.id,
      p_user_id: userId,
    })
    setArticles(prev => prev.map(a =>
      a.id === article.id
        ? { ...a, liked: data.liked, likes_count: data.likes_count }
        : a
    ))
  }

  async function openArticle(article: Article) {
    setSelectedId(article.id)
    setCommentInput('')
    if (!article.comments || article.comments.length === 0) {
      setLoadingComments(true)
      const { data } = await supabase
        .from('news_comments')
        .select('*, profiles(full_name)')
        .eq('article_id', article.id)
        .order('created_at', { ascending: true })
      setArticles(prev => prev.map(a =>
        a.id === article.id ? { ...a, comments: data || [] } : a
      ))
      setLoadingComments(false)
    }
  }

  function closeArticle() {
    setSelectedId(null)
    setCommentInput('')
  }

  async function sendComment(articleId: string) {
    const content = commentInput.trim()
    if (!content || !userId) return
    setSending(true)

    const { data, error } = await supabase
      .from('news_comments')
      .insert({ article_id: articleId, user_id: userId, content })
      .select('*, profiles(full_name)')
      .single()

    if (error) {
      toast.error('Erreur lors de l\'envoi')
    } else {
      setArticles(prev => prev.map(a =>
        a.id === articleId
          ? { ...a, comments: [...(a.comments || []), data] }
          : a
      ))
      setCommentInput('')
    }
    setSending(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20" style={{ color: '#5C5C5C' }}>
      Chargement...
    </div>
  )

  const selectedArticle = articles.find(a => a.id === selectedId) || null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <AnimatePresence mode="wait">
        {!selectedArticle ? (
          // ---------- LISTE (image + titre uniquement) ----------
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#F5F5F5' }}>Actualités</h1>
              <p className="text-sm mt-1" style={{ color: '#5C5C5C' }}>Les dernières nouvelles du marché</p>
            </div>

            {articles.length === 0 ? (
              <div className="text-center py-20" style={{ color: '#5C5C5C' }}>
                Aucune actualité pour le moment
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {articles.map(article => (
                  <motion.button
                    key={article.id}
                    onClick={() => openArticle(article)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    className="rounded-xl border overflow-hidden text-left"
                    style={{ background: 'var(--noir-elevated)', borderColor: 'var(--noir-border)' }}>

                    <div className="w-full aspect-video overflow-hidden">
                      {article.cover_image ? (
                        <img src={article.cover_image} alt={article.title}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: 'var(--noir-surface)', color: '#5C5C5C' }}>
                          <MessageSquare size={24} />
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h2 className="text-sm font-semibold line-clamp-2" style={{ color: '#F5F5F5' }}>
                        {article.title}
                      </h2>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          // ---------- ARTICLE COMPLET ----------
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--noir-elevated)', borderColor: 'var(--noir-border)' }}>

            <button
              onClick={closeArticle}
              className="flex items-center gap-1.5 text-sm px-5 pt-4"
              style={{ color: '#5C5C5C' }}>
              <ArrowLeft size={16} />
              Retour
            </button>

            {selectedArticle.cover_image && (
              <img src={selectedArticle.cover_image} alt={selectedArticle.title}
                className="w-full h-48 object-cover mt-3" />
            )}

            <div className="p-5">
              <div className="text-xs mb-2" style={{ color: '#5C5C5C' }}>
                {new Date(selectedArticle.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: '#F5F5F5' }}>
                {selectedArticle.title}
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#A0A0A0' }}>
                {selectedArticle.content}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--noir-border)' }}>
                <button
                  onClick={() => toggleLike(selectedArticle)}
                  className="flex items-center gap-1.5 text-sm transition-colors"
                  style={{ color: selectedArticle.liked ? '#FF1744' : '#5C5C5C' }}>
                  <Heart size={16} fill={selectedArticle.liked ? '#FF1744' : 'none'} />
                  {selectedArticle.likes_count}
                </button>

                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#5C5C5C' }}>
                  <MessageSquare size={16} />
                  {selectedArticle.comments?.length || 0} commentaire(s)
                </div>
              </div>

              {/* Comments */}
              <div className="mt-4 space-y-3">
                {loadingComments ? (
                  <div className="text-sm" style={{ color: '#5C5C5C' }}>Chargement des commentaires...</div>
                ) : (
                  selectedArticle.comments?.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                        {c.profiles.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 rounded-lg px-3 py-2"
                        style={{ background: 'var(--noir-surface)' }}>
                        <div className="text-xs font-medium mb-0.5" style={{ color: '#D4AF37' }}>
                          {c.profiles.full_name}
                        </div>
                        <div className="text-sm" style={{ color: '#A0A0A0' }}>{c.content}</div>
                      </div>
                    </div>
                  ))
                )}

                {/* Comment input */}
                <div className="flex gap-2 mt-3">
                  <input
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendComment(selectedArticle.id)}
                    placeholder="Votre commentaire..."
                    className="input-premium flex-1 text-sm"
                  />
                  <button
                    onClick={() => sendComment(selectedArticle.id)}
                    disabled={sending}
                    className="btn-gold px-3 py-2">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
