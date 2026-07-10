'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart2, FileText, Bell, ArrowRight, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import NotificationActivateButton from '@/components/NotificationActivateButton'
import type { TechnicalAnalysis, Announcement } from '@/types'

export default function ClientDashboard() {
  const [analyses, setAnalyses]           = useState<TechnicalAnalysis[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [fundamentals, setFundamentals]   = useState<any[]>([])
  const [articles, setArticles]           = useState<any[]>([])
  const [cmfPubs, setCmfPubs]             = useState<any[]>([])
  const [forumPosts, setForumPosts]       = useState<any[]>([])
  const [newItem, setNewItem]             = useState<string | null>(null)
  const [loading, setLoading]             = useState(true)
  const supabase = createClient()

  async function fetchData() {
    const [{ data: ta }, { data: ann }, { data: fa }, { data: art }, { data: cmf }, { data: forum }] = await Promise.all([
      supabase
        .from('technical_analyses')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(6),
      supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('fundamental_analyses')
        .select('id, ticker, company_name, recommendation, target_price, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('announcements')
        .select('id, title, type, created_at')
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('cmf_announcements')
        .select('id, title, company, ticker, category')
        .order('id', { ascending: false })
        .limit(4),
      supabase
        .from('forum_posts')
        .select('id, titre, replies_count, likes_count, created_at, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(4),
    ])

    if (ta)    setAnalyses(ta as any)
    if (ann)   setAnnouncements(ann as any)
    if (fa)    setFundamentals(fa)
    if (art)   setArticles(art)
    if (cmf)   setCmfPubs(cmf)
    if (forum) setForumPosts(forum)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('client-dashboard')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'technical_analyses', filter: 'status=eq.published' },
        (payload) => {
          setAnalyses(prev => [payload.new as any, ...prev.slice(0, 5)])
          setNewItem(payload.new.id)
          setTimeout(() => setNewItem(null), 4000)
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'technical_analyses' },
        () => fetchData())
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          setAnnouncements(prev => [payload.new as any, ...prev.slice(0, 2)])
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const signalConfig = {
    buy:   { label: 'ACHAT',  cls: 'badge-buy'  },
    sell:  { label: 'VENTE',  cls: 'badge-sell' },
    hold:  { label: 'NEUTRE', cls: 'badge-hold' },
    watch: { label: 'VEILLE', cls: 'badge-watch' },
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner avec le bouton d'activation des notifications */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl border relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%)',
          borderColor: 'rgba(212,175,55,0.2)',
        }}>
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold mb-1" style={{ color: '#F5F5F5' }}>
              Bonjour, bienvenus sur votre espace
            </h1>
            <p className="text-sm mb-3" style={{ color: '#707070' }}>
              {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })} · Données en temps réel
            </p>
            {/* Seul et unique bouton d'activation des notifications de l'app */}
            <NotificationActivateButton />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium hidden sm:flex"
            style={{ background: 'rgba(0,200,83,0.1)', color: '#00C853', border: '1px solid rgba(0,200,83,0.2)' }}>
            <Zap size={12} /> LIVE
          </div>
        </div>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Analyses dispo.', value: analyses.length, icon: TrendingUp, color: '#D4AF37' },
          { label: 'Publiées ce mois', value: analyses.filter(a => {
            const d = new Date(a.created_at)
            const now = new Date()
            return d.getMonth() === now.getMonth()
          }).length, icon: BarChart2, color: '#00C853' },
          { label: 'Signaux achat', value: analyses.filter(a => a.signal === 'buy').length, icon: TrendingUp, color: '#2196F3' },
          { label: 'Annonces actives', value: announcements.length, icon: Bell, color: '#FF9800' },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card-premium p-4">
            <div className="flex items-center justify-between mb-2">
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: '#F5F5F5' }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#5C5C5C' }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map(ann => (
            <motion.div key={ann.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
              <Bell size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#D4AF37' }} />
              <div>
                <div className="text-sm font-medium" style={{ color: '#F5F5F5' }}>{ann.title}</div>
                <div className="text-xs mt-0.5" style={{ color: '#707070' }}>{ann.content}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Latest analyses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#F5F5F5' }}>
            Dernières analyses techniques
          </h2>
          <Link href="/client/analyses"
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: '#5C5C5C' }}
            onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
            onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
            Voir toutes <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card-premium p-5 space-y-3">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
                <div className="flex gap-2">
                  <div className="skeleton h-8 flex-1" />
                  <div className="skeleton h-8 flex-1" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyses.map((a, i) => {
              const sig = signalConfig[a.signal as keyof typeof signalConfig]
              const gain = a.target_price && a.entry_price
                ? (((a.target_price - a.entry_price) / a.entry_price) * 100).toFixed(1)
                : null
              const isNew = newItem === a.id

              return (
                <motion.div key={a.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`card-premium p-5 cursor-pointer transition-all ${isNew ? 'border-gold' : ''}`}
                  style={isNew ? { boxShadow: '0 0 20px rgba(212,175,55,0.15)' } : {}}>

                  {isNew && (
                    <div className="flex items-center gap-1 text-[10px] font-bold mb-2"
                      style={{ color: '#D4AF37' }}>
                      <Zap size={10} /> NOUVELLE ANALYSE
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                        {a.ticker.slice(0, 4)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: '#F5F5F5' }}>{a.ticker}</div>
                        <div className="text-xs" style={{ color: '#5C5C5C' }}>{a.market}</div>
                      </div>
                    </div>
                    {sig && <span className={`${sig.cls} text-[10px] font-bold px-2 py-0.5 rounded`}>{sig.label}</span>}
                  </div>

                  <h3 className="text-sm font-medium mb-3 line-clamp-2" style={{ color: '#C8C8C8' }}>
                    {a.title}
                  </h3>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: 'Entrée',  value: a.entry_price?.toLocaleString(),  color: '#A0A0A0' },
                      { label: 'Objectif', value: a.target_price?.toLocaleString(), color: '#00C853' },
                      { label: 'Stop',    value: a.stop_loss?.toLocaleString(),    color: '#FF1744'  },
                    ].map(p => (
                      <div key={p.label} className="text-center p-2 rounded"
                        style={{ background: 'var(--noir-elevated)' }}>
                        <div className="text-xs font-bold font-mono" style={{ color: p.color }}>
                          {p.value}
                        </div>
                        <div className="text-[10px]" style={{ color: '#5C5C5C' }}>{p.label}</div>
                      </div>
                    ))}
                  </div>

                  {gain && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t"
                      style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
                      <span style={{ color: '#5C5C5C' }}>Potentiel</span>
                      <span className="font-bold" style={{ color: '#00C853' }}>+{gain}%</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Analyses fondamentales */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#F5F5F5' }}>
            Dernières analyses fondamentales
          </h2>
          <Link href="/client/fondamentales"
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: '#5C5C5C' }}
            onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
            onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
            Voir toutes <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fundamentals.map((f, i) => {
            const recoCfg: Record<string, { label: string; cls: string }> = {
              buy:   { label: 'ACHAT',  cls: 'badge-buy'  },
              sell:  { label: 'VENTE',  cls: 'badge-sell' },
              hold:  { label: 'NEUTRE', cls: 'badge-hold' },
              watch: { label: 'VEILLE', cls: 'badge-watch' },
            }
            const reco = recoCfg[f.recommendation] ?? { label: (f.recommendation ?? '—').toUpperCase(), cls: 'badge-watch' }
            return (
              <motion.div key={f.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-premium p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(33,150,243,0.1)', color: '#2196F3' }}>
                  {f.ticker?.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#F5F5F5' }}>{f.company_name}</div>
                  <div className="text-xs" style={{ color: '#5C5C5C' }}>
                    {f.target_price ? `Objectif : ${f.target_price} DT` : format(new Date(f.created_at), 'dd MMM yyyy', { locale: fr })}
                  </div>
                </div>
                <span className={`${reco.cls} text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0`}>{reco.label}</span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Articles + CMF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Derniers articles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: '#F5F5F5' }}>Derniers articles</h2>
            <Link href="/client/annonces"
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: '#5C5C5C' }}
              onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
              Voir tous <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card-premium divide-y" style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
            {articles.length === 0
              ? <p className="text-sm text-center py-6" style={{ color: '#5C5C5C' }}>Aucun article</p>
              : articles.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                    <FileText size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#F5F5F5' }}>{a.title}</div>
                    <div className="text-xs" style={{ color: '#5C5C5C' }}>
                      {format(new Date(a.created_at), 'dd MMM yyyy', { locale: fr })} · {a.type ?? 'Article'}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded badge-watch flex-shrink-0">
                    {(a.type ?? 'ARTICLE').toUpperCase()}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Publications CMF */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: '#F5F5F5' }}>Publications CMF</h2>
            <Link href="/client/cmf"
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: '#5C5C5C' }}
              onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
              Voir toutes <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card-premium divide-y" style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
            {cmfPubs.length === 0
              ? <p className="text-sm text-center py-6" style={{ color: '#5C5C5C' }}>Aucune publication</p>
              : cmfPubs.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(255,152,0,0.1)', color: '#FF9800' }}>
                    {c.ticker?.slice(0, 3) ?? <FileText size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#F5F5F5' }}>{c.title}</div>
                    <div className="text-xs" style={{ color: '#5C5C5C' }}>{c.company} · {c.category ?? 'CMF'}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'rgba(255,152,0,0.1)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.2)' }}>
                    CMF
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Forum */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#F5F5F5' }}>Derniers sujets de discussion</h2>
          <Link href="/client/forum"
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: '#5C5C5C' }}
            onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
            onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
            Voir tous <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {forumPosts.map((p, i) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-premium p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'rgba(156,39,176,0.1)', color: '#CE93D8' }}>
                {(p.profiles as any)?.full_name?.charAt(0) ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: '#F5F5F5' }}>{p.titre}</div>
                <div className="text-xs" style={{ color: '#5C5C5C' }}>
                  {(p.profiles as any)?.full_name ?? 'Anonyme'} · {p.replies_count ?? 0} réponse{(p.replies_count ?? 0) > 1 ? 's' : ''}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0"
                style={{ background: 'rgba(156,39,176,0.1)', color: '#CE93D8', border: '1px solid rgba(156,39,176,0.2)' }}>
                FORUM
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
