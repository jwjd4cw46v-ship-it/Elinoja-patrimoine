'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, BarChart2,
  FileText, MessageSquare, Bell, Star, ChevronRight,
  Newspaper, Calendar, LineChart, RefreshCw, ChevronDown,
  Menu, X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWatchlist } from '@/hooks/useWatchlist'
import type { Profile } from '@/types'

const navItems = [
  { href: '/client',               icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/client/cotations',     icon: LineChart,       label: 'Cotations BVMT' },
  { href: '/client/analyses',      icon: TrendingUp,      label: 'Analyses Techniques' },
  { href: '/client/fondamentales', icon: BarChart2,       label: 'Analyses Fondamentales' },
  { href: '/client/cmf',           icon: FileText,        label: 'Publications CMF' },
  { href: '/client/news',          icon: Newspaper,       label: 'Actualités' },
  { href: '/client/forum',         icon: MessageSquare,   label: 'Forum' },
  { href: '/client/annonces',      icon: Bell,            label: 'Annonces' },
  { href: '/client/watchlist',     icon: Star,            label: 'Ma Watchlist' },
  { href: '/client/calendrier',    icon: Calendar,        label: 'Calendrier AGO' },
]

const PAGE_LABELS: Record<string, string> = {
  '/client':               'Tableau de bord',
  '/client/cotations':     'Cotations BVMT',
  '/client/analyses':      'Analyses Techniques',
  '/client/fondamentales': 'Analyses Fondamentales',
  '/client/cmf':           'Publications CMF',
  '/client/news':          'Actualités',
  '/client/forum':         'Forum',
  '/client/annonces':      'Annonces',
  '/client/watchlist':     'Ma Watchlist',
  '/client/calendrier':    'Calendrier AGO',
}

function getLabel(pathname: string) {
  return Object.entries(PAGE_LABELS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([p]) => pathname === p || pathname.startsWith(p + '/'))
    ?.[1] ?? 'ELINOJA PATRIMOINE'
}

function WatchMiniCard({ item }: { item: any }) {
  const isBelowLow  = item.low  > 0 && item.current > 0 && item.current < item.low
  const isAboveHigh = item.high > 0 && item.current > 0 && item.current > item.high
  const pct = item.high > item.low
    ? ((item.current - item.low) / (item.high - item.low)) * 100 : 50
  const pctClamped = Math.max(0, Math.min(100, pct))
  const fmt = (v: number) => v > 0
    ? v.toLocaleString('fr-TN', {
        minimumFractionDigits: v > 100 ? 2 : 3,
        maximumFractionDigits: v > 100 ? 2 : 3,
      })
    : '—'

  return (
    <div className={isBelowLow ? 'wmc-glow-low' : isAboveHigh ? 'wmc-glow-high' : ''}
      style={{
        background: 'var(--noir-bg, #0D0D0D)',
        border: `1px solid ${isBelowLow ? 'rgba(255,59,59,0.3)' : isAboveHigh ? 'rgba(0,200,83,0.25)' : 'var(--noir-border)'}`,
        borderRadius: '10px', padding: '10px 12px', transition: 'border-color 0.4s',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#C0C0C0', letterSpacing: '0.04em' }}>{item.ticker}</div>
          <div style={{ fontSize: '9px', color: '#3A3A3A', marginTop: '1px', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: item.current === 0 ? '#3A3A3A' : isBelowLow ? '#FF3B3B' : isAboveHigh ? '#00C853' : '#F5F5F5', transition: 'color 0.3s' }}>
            {item.current > 0 ? fmt(item.current) : '—'}
          </div>
          {item.current > 0 && (
            <div style={{ fontSize: '9px', fontWeight: 500, color: item.change > 0 ? '#00C853' : item.change < 0 ? '#FF1744' : '#5C5C5C' }}>
              {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
            </div>
          )}
        </div>
      </div>
      {item.low > 0 && item.high > 0 && (
        <div style={{ background: 'var(--noir-border)', borderRadius: '2px', height: '2px', marginBottom: '8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctClamped}%`, background: isBelowLow ? 'linear-gradient(90deg,#FF3B3B,#FF6B6B)' : isAboveHigh ? 'linear-gradient(90deg,#00C853,#00E676)' : 'linear-gradient(90deg,#2A5F8A,#3A8FD1)', borderRadius: '2px', transition: 'width 0.6s ease' }} />
        </div>
      )}
      {(isBelowLow || isAboveHigh) && (
        <div style={{ marginTop: '6px', fontSize: '8px', fontWeight: 600, color: isBelowLow ? '#FF3B3B' : '#00C853', textAlign: 'center', letterSpacing: '0.08em' }}>
          {isBelowLow ? '▼ Seuil bas franchi' : '▲ Seuil haut franchi'}
        </div>
      )}
    </div>
  )
}

export default function ClientSidebar({ profile }: { profile: Profile }) {
  const pathname  = usePathname()
  const supabase  = createClient()
  const [userId,     setUserId]     = useState<string>('')
  const [watchOpen,  setWatchOpen]  = useState(true)
  const [spinning,   setSpinning]   = useState(false)
  // ── Mobile state ──
  // Initialisé à false (SSR-safe) — mis à jour après montage côté client
  const [isMobile,   setIsMobile]   = useState<boolean | null>(null)
  const [menuOpen,   setMenuOpen]   = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  // Détection mobile — uniquement côté client après hydratation
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Fermer le menu à chaque navigation
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const { items, loading: watchLoading, refresh } = useWatchlist(userId || profile.id || '')

  const activeAlerts = items.filter(
    i => i.current > 0 && ((i.low > 0 && i.current < i.low) || (i.high > 0 && i.current > i.high))
  ).length

  function handleRefresh() {
    setSpinning(true)
    refresh().then(() => setTimeout(() => setSpinning(false), 600))
  }

  // ── Sidebar content (partagé desktop + mobile) ──
  const sidebar = (
    <aside
      className="w-64 flex flex-col flex-shrink-0 h-full"
      style={{
        background: 'var(--noir-surface)',
        borderRight: '1px solid var(--noir-border)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>

      {/* Logo */}
      <div className="px-4 py-4 border-b flex items-center justify-center flex-shrink-0"
        style={{ borderColor: 'var(--noir-border)' }}>
        <Image src="/logo.jpeg" alt="Elinoja Patrimoine" width={150} height={65}
          style={{ objectFit: 'contain' }} />
      </div>

      {/* Badge abonnement */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--noir-border)' }}>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
          profile.subscription_status === 'active' ? 'badge-buy' :
          profile.subscription_status === 'trial'  ? 'badge-watch' : 'badge-sell'
        }`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
          {profile.subscription_status === 'active' ? 'ABONNEMENT ACTIF' :
           profile.subscription_status === 'trial'  ? "PÉRIODE D'ESSAI" : 'ABONNEMENT EXPIRÉ'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-3 space-y-0.5 flex-shrink-0">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/client' && pathname.startsWith(item.href))
          const isWatch = item.href === '/client/watchlist'
          return (
            <Link key={item.href} href={item.href}>
              <motion.div whileHover={{ x: 2 }} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px', fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#D4AF37' : '#707070',
                background: isActive ? 'rgba(212,175,55,0.08)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <item.icon size={16} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
                {isWatch && activeAlerts > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#FF3B3B', color: '#fff', fontSize: '8px', fontWeight: 700, minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', boxShadow: '0 0 6px rgba(255,59,59,0.6)' }}>
                    {activeAlerts}
                  </span>
                )}
                {isActive && !(isWatch && activeAlerts > 0) && (
                  <ChevronRight size={12} style={{ marginLeft: 'auto', color: '#D4AF37' }} />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div style={{ height: '1px', background: 'var(--noir-border)', margin: '0 16px', flexShrink: 0 }} />

      {/* Watchlist */}
      <div style={{ flexShrink: 0 }}>
        <div onClick={() => setWatchOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', cursor: 'pointer', userSelect: 'none' }}>
          <Star size={13} style={{ color: '#D4AF37', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#707070', letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 }}>Watchlist</span>
          {activeAlerts > 0 && (
            <span style={{ fontSize: '8px', fontWeight: 700, color: '#FF3B3B', background: 'rgba(255,59,59,0.1)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(255,59,59,0.2)' }}>
              {activeAlerts} alerte{activeAlerts > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={e => { e.stopPropagation(); handleRefresh() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#3A3A3A', display: 'flex' }}>
            <RefreshCw size={11} style={{ transition: 'transform 0.6s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
          </button>
          <ChevronDown size={12} style={{ color: '#3A3A3A', transition: 'transform 0.2s', transform: watchOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
        </div>
        <AnimatePresence initial={false}>
          {watchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {watchLoading
                  ? [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />)
                  : items.length === 0
                  ? <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '11px', color: '#3A3A3A' }}>Aucun titre en watchlist</div>
                  : items.map(item => <WatchMiniCard key={item.id} item={item} />)
                }
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--noir-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
            {profile.full_name?.charAt(0) || 'C'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: '#F5F5F5' }}>{profile.full_name}</div>
            <div className="text-xs truncate" style={{ color: '#5C5C5C' }}>Investisseur</div>
          </div>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      <style>{`
        @keyframes wmc-pulse-low  { 0%,100%{color:#FF3B3B;opacity:1}50%{color:#FF6B6B;opacity:.72} }
        @keyframes wmc-pulse-high { 0%,100%{color:#00E676;opacity:1}50%{color:#69F0AE;opacity:.72} }
        @keyframes wmc-glow-low   { 0%,100%{box-shadow:0 0 0 0 rgba(255,59,59,0)}50%{box-shadow:0 0 0 3px rgba(255,59,59,.12)} }
        @keyframes wmc-glow-high  { 0%,100%{box-shadow:0 0 0 0 rgba(0,200,83,0)}50%{box-shadow:0 0 0 3px rgba(0,200,83,.12)} }
        .wmc-alert-low  { animation: wmc-pulse-low  1.8s ease-in-out infinite; }
        .wmc-alert-high { animation: wmc-pulse-high 1.8s ease-in-out infinite; }
        .wmc-glow-low   { animation: wmc-glow-low  2s ease-in-out infinite; }
        .wmc-glow-high  { animation: wmc-glow-high 2s ease-in-out infinite; }
      `}</style>

      {/* ── DESKTOP : rendu normal (null = SSR, on attend hydratation) ── */}
      {(isMobile === false || isMobile === null) && sidebar}

      {/* ── MOBILE : bouton + drawer ── */}
      {isMobile && (
        <>
          {/* Bouton hamburger flottant — positionné dans le header existant */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              position: 'fixed', top: 10, left: 14, zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 8,
              background: menuOpen ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.25)',
              color: '#D4AF37', cursor: 'pointer',
            }}>
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          {/* Backdrop + drawer */}
          <AnimatePresence>
            {menuOpen && (
              <>
                <motion.div
                  key="bd"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, top: 56, zIndex: 98, background: 'rgba(0,0,0,0.65)' }}
                />
                <motion.div
                  key="drawer"
                  initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                  transition={{ type: 'tween', duration: 0.22 }}
                  onClick={e => { const a = (e.target as HTMLElement).closest('a'); if (a) setMenuOpen(false) }}
                  style={{
                    position: 'fixed', left: 0, top: 56, bottom: 0, zIndex: 99,
                    width: '85vw', maxWidth: 320,
                    overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                  } as React.CSSProperties}>
                  {sidebar}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  )
}
