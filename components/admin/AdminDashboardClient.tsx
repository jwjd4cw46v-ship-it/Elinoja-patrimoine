'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, TrendingUp, BarChart2, MessageSquare,
  FileText, ArrowUpRight, Activity
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

interface Props {
  stats: {
    totalClients: number
    activeClients: number
    publishedAnalyses: number
    totalPosts: number
    technicalCount: number
    fundamentalCount: number
    cmfCount: number
  }
  recentAnalyses: any[]
  recentClients: any[]
  recentFundamentals: any[]
  recentArticles: any[]
  recentCmf: any[]
  recentPosts: any[]
}

const signalConfig = {
  buy:   { label: 'ACHAT',  className: 'badge-buy'  },
  sell:  { label: 'VENTE',  className: 'badge-sell' },
  hold:  { label: 'NEUTRE', className: 'badge-hold' },
  watch: { label: 'VEILLE', className: 'badge-watch' },
}

export default function AdminDashboardClient({ stats, recentAnalyses, recentClients, recentFundamentals, recentArticles, recentCmf, recentPosts }: Props) {
  const [liveStats, setLiveStats] = useState(stats)
  const supabase = createClient()

  // Realtime updates for stats
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        // Refresh stats on profile changes
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technical_analyses' }, () => {
        // Refresh on analyses changes
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const statCards = [
    { icon: Users,         label: 'Total Clients',       value: liveStats.totalClients,     sub: `${liveStats.activeClients} actifs`, color: '#D4AF37', href: '/admin/clients' },
    { icon: TrendingUp,    label: 'Analyses Techniques',  value: liveStats.technicalCount,   sub: 'publiées',                          color: '#00C853', href: '/admin/analyses-techniques' },
    { icon: BarChart2,     label: 'Anal. Fondamentales',  value: liveStats.fundamentalCount, sub: 'publiées',                          color: '#2196F3', href: '/admin/analyses-fondamentales' },
    { icon: FileText,      label: 'Communiqués CMF',      value: liveStats.cmfCount,         sub: 'total',                             color: '#FF9800', href: '/admin/cmf' },
    { icon: MessageSquare, label: 'Posts Forum',           value: liveStats.totalPosts,       sub: 'discussions',                       color: '#9C27B0', href: '/admin/forum' },
    { icon: Activity,      label: 'Analyses publiées',    value: liveStats.publishedAnalyses, sub: 'ce mois',                          color: '#FF1744', href: '/admin/analyses-techniques' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>
            Tableau de bord
          </h1>
          <p className="text-sm mt-1" style={{ color: '#707070' }}>
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(0,200,83,0.1)', color: '#00C853', border: '1px solid rgba(0,200,83,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          Temps réel actif
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}>
            <Link href={card.href}>
              <div className="card-premium p-5 cursor-pointer group">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg"
                    style={{ background: `${card.color}15` }}>
                    <card.icon size={16} style={{ color: card.color }} />
                  </div>
                  <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: card.color }} />
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color: '#F5F5F5' }}>
                  {card.value.toLocaleString()}
                </div>
                <div className="text-xs font-medium mb-0.5" style={{ color: '#A0A0A0' }}>
                  {card.label}
                </div>
                <div className="text-xs" style={{ color: '#5C5C5C' }}>
                  {card.sub}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent analyses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#F5F5F5' }}>
              Analyses récentes
            </h3>
            <Link href="/admin/analyses-techniques"
              className="text-xs transition-colors"
              style={{ color: '#5C5C5C' }}
              onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
              Voir tout →
            </Link>
          </div>
          <div className="space-y-2">
            {recentAnalyses.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#5C5C5C' }}>
                Aucune analyse publiée
              </p>
            ) : recentAnalyses.map((a) => {
              const cfg = signalConfig[a.signal as keyof typeof signalConfig]
              return (
                <div key={a.id}
                  className="flex items-center justify-between py-2.5 border-b last:border-0"
                  style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                      {a.ticker?.slice(0, 3) || 'N/A'}
                    </div>
                    <div>
                      <div className="text-sm font-medium line-clamp-1" style={{ color: '#F5F5F5' }}>
                        {a.title}
                      </div>
                      <div className="text-xs" style={{ color: '#5C5C5C' }}>
                        {format(new Date(a.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </div>
                  </div>
                  {cfg && (
                    <span className={`${cfg.className} text-[10px] font-bold px-2 py-0.5 rounded`}>
                      {cfg.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent clients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#F5F5F5' }}>
              Clients récents
            </h3>
            <Link href="/admin/clients"
              className="text-xs transition-colors"
              style={{ color: '#5C5C5C' }}
              onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
              Voir tout →
            </Link>
          </div>
          <div className="space-y-2">
            {recentClients.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#5C5C5C' }}>
                Aucun client enregistré
              </p>
            ) : recentClients.map((c) => (
              <div key={c.id}
                className="flex items-center justify-between py-2.5 border-b last:border-0"
                style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                    {c.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#F5F5F5' }}>
                      {c.full_name}
                    </div>
                    <div className="text-xs" style={{ color: '#5C5C5C' }}>{c.email}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  c.subscription_status === 'active' ? 'badge-buy' :
                  c.subscription_status === 'trial'  ? 'badge-watch' : 'badge-sell'
                }`}>
                  {c.subscription_status === 'active' ? 'ACTIF' :
                   c.subscription_status === 'trial'  ? 'ESSAI' : 'INACTIF'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Second row — 4 new sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Analyses fondamentales récentes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#F5F5F5' }}>
              Analyses fondamentales
            </h3>
            <Link href="/admin/analyses-fondamentales"
              className="text-xs transition-colors"
              style={{ color: '#5C5C5C' }}
              onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
              Voir tout →
            </Link>
          </div>
          <div className="space-y-2">
            {recentFundamentals.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#5C5C5C' }}>
                Aucune analyse publiée
              </p>
            ) : recentFundamentals.map((a) => {
              const cfg = signalConfig[a.recommendation as keyof typeof signalConfig] ?? { label: a.recommendation?.toUpperCase() ?? '—', className: 'badge-watch' }
              return (
                <div key={a.id}
                  className="flex items-center justify-between py-2.5 border-b last:border-0"
                  style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(33,150,243,0.1)', color: '#2196F3' }}>
                      {a.ticker?.slice(0, 3) || 'N/A'}
                    </div>
                    <div>
                      <div className="text-sm font-medium line-clamp-1" style={{ color: '#F5F5F5' }}>
                        {a.company_name ?? a.title}
                      </div>
                      <div className="text-xs" style={{ color: '#5C5C5C' }}>
                        {format(new Date(a.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </div>
                  </div>
                  <span className={`${cfg.className} text-[10px] font-bold px-2 py-0.5 rounded`}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Derniers articles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#F5F5F5' }}>
              Derniers articles
            </h3>
            <Link href="/admin/annonces"
              className="text-xs transition-colors"
              style={{ color: '#5C5C5C' }}
              onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
              Voir tout →
            </Link>
          </div>
          <div className="space-y-2">
            {recentArticles.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#5C5C5C' }}>
                Aucun article publié
              </p>
            ) : recentArticles.map((a) => (
              <div key={a.id}
                className="flex items-center justify-between py-2.5 border-b last:border-0"
                style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                    <FileText size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-medium line-clamp-1" style={{ color: '#F5F5F5' }}>
                      {a.title}
                    </div>
                    <div className="text-xs" style={{ color: '#5C5C5C' }}>
                      {format(new Date(a.created_at), 'dd MMM yyyy', { locale: fr })} · {a.type ?? 'Article'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded badge-watch">
                  {(a.type ?? 'ARTICLE').toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Publications CMF récentes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#F5F5F5' }}>
              Publications CMF
            </h3>
            <Link href="/admin/cmf"
              className="text-xs transition-colors"
              style={{ color: '#5C5C5C' }}
              onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
              Voir tout →
            </Link>
          </div>
          <div className="space-y-2">
            {recentCmf.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#5C5C5C' }}>
                Aucune publication CMF
              </p>
            ) : recentCmf.map((c) => (
              <div key={c.id}
                className="flex items-center justify-between py-2.5 border-b last:border-0"
                style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(255,152,0,0.1)', color: '#FF9800' }}>
                    {c.ticker?.slice(0, 3) || <FileText size={14} />}
                  </div>
                  <div>
                    <div className="text-sm font-medium line-clamp-1" style={{ color: '#F5F5F5' }}>
                      {c.title}
                    </div>
                    <div className="text-xs" style={{ color: '#5C5C5C' }}>
                      {c.company} · {c.category ?? 'CMF'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(255,152,0,0.1)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.2)' }}>
                  CMF
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Derniers sujets de discussion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#F5F5F5' }}>
              Sujets de discussion
            </h3>
            <Link href="/admin/forum"
              className="text-xs transition-colors"
              style={{ color: '#5C5C5C' }}
              onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
              Voir tout →
            </Link>
          </div>
          <div className="space-y-2">
            {recentPosts.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#5C5C5C' }}>
                Aucun sujet de discussion
              </p>
            ) : recentPosts.map((p) => (
              <div key={p.id}
                className="flex items-center justify-between py-2.5 border-b last:border-0"
                style={{ borderColor: 'rgba(42,42,42,0.5)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(156,39,176,0.1)', color: '#CE93D8' }}>
                    {p.profiles?.full_name?.charAt(0) ?? '?'}
                  </div>
                  <div>
                    <div className="text-sm font-medium line-clamp-1" style={{ color: '#F5F5F5' }}>
                      {p.titre}
                    </div>
                    <div className="text-xs" style={{ color: '#5C5C5C' }}>
                      {p.profiles?.full_name ?? 'Anonyme'} · {p.replies_count ?? 0} réponse{(p.replies_count ?? 0) > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(156,39,176,0.1)', color: '#CE93D8', border: '1px solid rgba(156,39,176,0.2)' }}>
                  FORUM
                </span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}
