'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, BarChart2,
  FileText, MessageSquare, Bell, Star, ChevronRight,
  Newspaper, Calendar, LineChart, RefreshCw, ChevronDown,
  Menu, X, Globe, Target, BookOpen,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWatchlist } from '@/hooks/useWatchlist'
import type { Profile } from '@/types'

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:          '#0A0A0A',   // noir logo
  surface:     '#0F0F0F',   // sidebar
  border:      '#1C1C1C',   // séparateurs très discrets
  gold:        '#D4AF37',
  goldLight:   '#F0D060',
  goldDim:     'rgba(212,175,55,0.12)',
  goldBorder:  'rgba(212,175,55,0.22)',
  text:        '#FFFFFF',
  muted:       '#555555',
  label:       '#3A3A3A',
  red:         '#FF3B3B',
}

const navSections = [
  {
    label: 'TABLEAU DE BORD',
    items: [
      { href: '/client', icon: LayoutDashboard, label: 'Tableau de bord' },
    ],
  },
  {
    label: 'MARCHÉS',
    items: [
      { href: '/client/cotations',     icon: LineChart,  label: 'Cotations BVMT' },
      { href: '/client/analyses',      icon: TrendingUp, label: 'Analyses Techniques' },
      { href: '/client/fondamentales', icon: BarChart2,  label: 'Analyses Fondamentales' },
      { href: '/client/marches',       icon: Globe,      label: 'Devises & Matières' },
      { href: '/client/calendrier',    icon: Calendar,   label: 'Calendrier AGO' },
      { href: '/client/figures-chartistes', icon: BookOpen, label: 'Figures Chartistes' },
    ],
  },
  {
    label: 'INFORMATIONS',
    items: [
      { href: '/client/cmf',      icon: FileText,      label: 'Publications CMF' },
      { href: '/client/news',     icon: Newspaper,     label: 'Actualités' },
      { href: '/client/forum',    icon: MessageSquare, label: 'Communauté Elinoja' },
      { href: '/client/annonces', icon: Bell,          label: 'Annonces' },
    ],
  },
  {
    label: 'MES OUTILS',
    items: [
      { href: '/client/watchlist', icon: Star,   label: 'Mes Opportunités' },
      { href: '/client/positions', icon: Target, label: 'Opportunités Elinoja', premium: true },
    ],
  },
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
  '/client/marches':       'Devises & Matières premières',
  '/client/calendrier':    'Calendrier AGO',
  '/client/figures-chartistes': 'Figures Chartistes',
  '/client/positions':     'Elinoja Stratégie',
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
        background: C.bg,
        border: `1px solid ${isBelowLow ? 'rgba(255,59,59,0.3)' : isAboveHigh ? 'rgba(0,200,83,0.25)' : C.border}`,
        borderRadius: '8px', padding: '10px 12px', transition: 'border-color 0.4s',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.04em' }}>{item.ticker}</div>
          <div style={{ fontSize: '9px', color: C.muted, marginTop: '1px', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: item.current === 0 ? C.label : isBelowLow ? C.red : isAboveHigh ? '#00C853' : '#FFFFFF', transition: 'color 0.3s' }}>
            {item.current > 0 ? fmt(item.current) : '—'}
          </div>
          {item.current > 0 && (
            <div style={{ fontSize: '9px', fontWeight: 500, color: item.change > 0 ? '#00C853' : item.change < 0 ? '#FF1744' : C.muted }}>
              {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
            </div>
          )}
        </div>
      </div>
      {item.low > 0 && item.high > 0 && (
        <div style={{ background: C.border, borderRadius: '2px', height: '2px', marginBottom: '8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctClamped}%`, background: isBelowLow ? 'linear-gradient(90deg,#FF3B3B,#FF6B6B)' : isAboveHigh ? 'linear-gradient(90deg,#00C853,#00E676)' : `linear-gradient(90deg,${C.gold},${C.goldLight})`, borderRadius: '2px', transition: 'width 0.6s ease' }} />
        </div>
      )}
      {(isBelowLow || isAboveHigh) && (
        <div style={{ marginTop: '6px', fontSize: '8px', fontWeight: 600, color: isBelowLow ? C.red : '#00C853', textAlign: 'center', letterSpacing: '0.08em' }}>
          {isBelowLow ? '▼ Seuil bas franchi' : '▲ Seuil haut franchi'}
        </div>
      )}
    </div>
  )
}

export default function ClientSidebar({ profile }: { profile: Profile }) {
  const pathname  = usePathname()
  const supabase  = createClient()
  const [userId,    setUserId]    = useState<string>('')
  const [watchOpen, setWatchOpen] = useState(true)
  const [spinning,  setSpinning]  = useState(false)
  const [isMobile,  setIsMobile]  = useState<boolean | null>(null)
  const [menuOpen,  setMenuOpen]  = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const { items, loading: watchLoading, refresh } = useWatchlist(userId || profile.id || '')

  const activeAlerts = items.filter(
    i => i.current > 0 && ((i.low > 0 && i.current < i.low) || (i.high > 0 && i.current > i.high))
  ).length

  function handleRefresh() {
    setSpinning(true)
    refresh().then(() => setTimeout(() => setSpinning(false), 600))
  }

  const isActive = (href: string) =>
    href === '/client' ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const sidebar = (
    <aside
      className="w-64 flex flex-col flex-shrink-0 h-full"
      style={{
        background: C.surface,
        borderRight: `1px solid ${C.border}`,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>

      {/* ── Logo ── */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        background: C.bg,
      }}>
        <Image src="/logo.jpeg" alt="Elinoja Patrimoine" width={130} height={56}
          style={{ objectFit: 'contain' }} />
        <p style={{ fontSize: '10px', color: C.muted, letterSpacing: '0.06em', textAlign: 'center', margin: 0 }}>
          L'expertise au service de votre patrimoine
        </p>

        {/* Badge abonnement */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '20px',
          background: C.goldDim,
          border: `1px solid ${C.goldBorder}`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, display: 'inline-block' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: C.gold, letterSpacing: '0.08em' }}>
            {profile.subscription_status === 'active' ? 'ABONNEMENT PREMIUM' :
             profile.subscription_status === 'trial'  ? "PÉRIODE D'ESSAI" : 'ABONNEMENT EXPIRÉ'}
          </span>
        </div>
      </div>

      {/* ── Navigation par sections ── */}
      <nav style={{ padding: '8px 0', flex: 1 }}>
        {navSections.map((section) => (
          <div key={section.label} style={{ marginBottom: '4px' }}>
            {/* Section label */}
            <div style={{
              padding: '10px 16px 4px',
              fontSize: '9px', fontWeight: 700,
              color: C.label,
              letterSpacing: '0.12em',
            }}>
              {section.label}
            </div>

            {/* Items */}
            {section.items.map((item) => {
              const active = isActive(item.href)
              const isWatch = item.href === '/client/watchlist'
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ x: 3 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 16px',
                      margin: '1px 8px',
                      borderRadius: '7px',
                      fontSize: '13px',
                      fontWeight: active ? 600 : 400,
                      color: active ? C.gold : '#FFFFFF',
                      background: active ? C.goldDim : 'transparent',
                      borderLeft: active ? `2px solid ${C.gold}` : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>
                    <item.icon size={15} style={{ flexShrink: 0, color: C.gold, opacity: active ? 1 : 0.75 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {(item as any).premium && (
                      <span style={{
                        fontSize: '8px', fontWeight: 700, color: C.bg,
                        background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                        padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em',
                      }}>PREMIUM</span>
                    )}
                    {isWatch && activeAlerts > 0 && (
                      <span style={{ background: C.red, color: '#fff', fontSize: '8px', fontWeight: 700, minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', boxShadow: `0 0 6px rgba(255,59,59,0.6)` }}>
                        {activeAlerts}
                      </span>
                    )}
                    {active && !(isWatch && activeAlerts > 0) && !(item as any).premium && (
                      <ChevronRight size={11} style={{ color: C.gold, opacity: 0.7 }} />
                    )}
                  </motion.div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Séparateur ── */}
      <div style={{ height: '1px', background: C.border, margin: '0 16px' }} />

      {/* ── Watchlist ── */}
      <div style={{ flexShrink: 0 }}>
        <div onClick={() => setWatchOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', cursor: 'pointer', userSelect: 'none' }}>
          <Star size={12} style={{ color: C.gold, flexShrink: 0 }} />
          <span style={{ fontSize: '9px', fontWeight: 700, color: C.label, letterSpacing: '0.12em', textTransform: 'uppercase', flex: 1 }}>Watchlist</span>
          {activeAlerts > 0 && (
            <span style={{ fontSize: '8px', fontWeight: 700, color: C.red, background: 'rgba(255,59,59,0.1)', padding: '1px 5px', borderRadius: '4px', border: `1px solid rgba(255,59,59,0.2)` }}>
              {activeAlerts} alerte{activeAlerts > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={e => { e.stopPropagation(); handleRefresh() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: C.label, display: 'flex' }}>
            <RefreshCw size={11} style={{ transition: 'transform 0.6s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
          </button>
          <ChevronDown size={12} style={{ color: C.label, transition: 'transform 0.2s', transform: watchOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
        </div>
        <AnimatePresence initial={false}>
          {watchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {watchLoading
                  ? [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '8px' }} />)
                  : items.length === 0
                  ? <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '11px', color: C.label }}>Aucun titre en watchlist</div>
                  : items.map(item => <WatchMiniCard key={item.id} item={item} />)
                }
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer profil ── */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
            color: C.bg,
            boxShadow: `0 0 10px rgba(212,175,55,0.3)`,
          }}>
            {profile.full_name?.charAt(0) || 'C'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.full_name}</div>
            <div style={{ fontSize: '10px', color: C.muted }}>Profil investisseur</div>
          </div>
          <ChevronRight size={14} style={{ color: C.label, flexShrink: 0 }} />
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

      {/* ── DESKTOP ── */}
      {(isMobile === false || isMobile === null) && sidebar}

      {/* ── MOBILE ── */}
      {isMobile && (
        <>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              position: 'fixed', top: 10, left: 14, zIndex: 202,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 8,
              background: menuOpen ? C.goldDim : 'rgba(212,175,55,0.06)',
              border: `1px solid ${C.goldBorder}`,
              color: C.gold, cursor: 'pointer',
            }}>
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <motion.div
                  key="bd"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)' }}
                />
                <motion.div
                  key="drawer"
                  initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                  transition={{ type: 'tween', duration: 0.22 }}
                  onClick={e => { const a = (e.target as HTMLElement).closest('a'); if (a) setMenuOpen(false) }}
                  style={{
                    position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 201,
                    width: '85vw', maxWidth: 320,
                    background: C.surface,
                    boxShadow: '4px 0 32px rgba(0,0,0,0.8)',
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
