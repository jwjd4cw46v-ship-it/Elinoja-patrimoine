'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, BarChart2,
  FileText, MessageSquare, Bell, Star, ChevronRight,
  Newspaper, Calendar, LineChart, RefreshCw, ChevronDown,
  Menu, X, Globe, BookOpen, Users, HelpCircle,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWatchlist } from '@/hooks/useWatchlist'
import type { Profile } from '@/types'

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:          '#0A0A0A',   
  surface:     '#0F0F0F',   
  border:      '#1C1C1C',   
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
  { label: 'TABLEAU DE BORD', icon: LayoutDashboard, items: [{ href: '/client', icon: LayoutDashboard, label: 'Tableau de bord' }] },
  { label: 'MARCHÉS', icon: LineChart, items: [
      { href: '/client/cotations',  icon: LineChart,  label: 'Cotations BVMT' },
      { href: '/client/watchlist',  icon: Star,       label: 'Mes Opportunités' },
      { href: '/client/positions',  icon: TrendingUp, label: 'Opportunités Elinoja', premium: true },
    ] },
  { label: 'ANALYSES', icon: BarChart2, items: [
      { href: '/client/analyses',           icon: TrendingUp, label: 'Analyses Techniques' },
      { href: '/client/fondamentales',      icon: BarChart2,  label: 'Analyses Fondamentales' },
      { href: '/client/avis-experts',       icon: Users,      label: "Avis d'Experts" },
      { href: '/client/figures-chartistes', icon: BookOpen,   label: 'Figures Chartistes' },
    ] },
  { label: 'INFORMATIONS', icon: Newspaper, items: [
      { href: '/client/news',       icon: Newspaper,     label: 'Actualités' },
      { href: '/client/cmf',        icon: FileText,      label: 'Publications CMF' },
      { href: '/client/calendrier', icon: Calendar,      label: 'Calendrier AGO' },
      { href: '/client/annonces',   icon: Bell,          label: 'Annonces' },
    ] },
  { label: 'OUTILS', icon: Globe, items: [
      { href: '/client/marches', icon: Globe,         label: 'Devises & Matières' },
      { href: '/client/forum',   icon: MessageSquare, label: 'Communauté Elinoja' },
    ] },
  { label: 'SUPPORT', icon: HelpCircle, items: [
      { href: '/client/aide', icon: HelpCircle, label: 'Aide & Installation' },
    ] },
]

function WatchMiniCard({ item }: { item: any }) {
  const isBelowLow  = item.low  > 0 && item.current > 0 && item.current < item.low
  const isAboveHigh = item.high > 0 && item.current > 0 && item.current > item.high
  const pct = item.high > item.low ? ((item.current - item.low) / (item.high - item.low)) * 100 : 50
  const pctClamped = Math.max(0, Math.min(100, pct))
  const fmt = (v: number) => v > 0 ? v.toLocaleString('fr-TN', { minimumFractionDigits: v > 100 ? 2 : 3, maximumFractionDigits: v > 100 ? 2 : 3 }) : '—'

  return (
    <div className={isBelowLow ? 'wmc-glow-low' : isAboveHigh ? 'wmc-glow-high' : ''}
      style={{ background: C.bg, border: `1px solid ${isBelowLow ? 'rgba(255,59,59,0.3)' : isAboveHigh ? 'rgba(0,200,83,0.25)' : C.border}`, borderRadius: '8px', padding: '10px 12px', transition: 'border-color 0.4s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.04em' }}>{item.ticker}</div>
          <div style={{ fontSize: '9px', color: C.muted, marginTop: '1px', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: item.current === 0 ? C.label : isBelowLow ? C.red : isAboveHigh ? '#00C853' : '#FFFFFF', transition: 'color 0.3s' }}>
            {item.current > 0 ? fmt(item.current) : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClientSidebar({ profile }: { profile: Profile }) {
  const pathname  = usePathname()
  const supabase  = createClient()
  const [userId,    setUserId]    = useState<string>('')
  const [watchOpen, setWatchOpen] = useState(true)
  const [isMobile,  setIsMobile]  = useState<boolean | null>(null)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id) })
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const { items, loading: watchLoading, refresh } = useWatchlist(userId || profile.id || '')
  const activeAlerts = items.filter(i => i.current > 0 && ((i.low > 0 && i.current < i.low) || (i.high > 0 && i.current > i.high))).length

  // Structure complète de la Sidebar
  const sidebar = (
    <aside className="w-64 flex flex-col h-full flex-shrink-0" style={{ background: C.surface, borderRight: `1px solid ${C.border}` }}>
      {/* HEADER FIXE */}
      <div className="flex-shrink-0" style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: C.bg }}>
        <Image src="/logo.jpeg" alt="Elinoja Patrimoine" width={130} height={56} style={{ objectFit: 'contain' }} />
        <p style={{ fontSize: '10px', color: C.muted, letterSpacing: '0.06em', textAlign: 'center', margin: 0 }}>L'expertise au service de votre patrimoine</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, display: 'inline-block' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: C.gold, letterSpacing: '0.08em' }}>ABONNEMENT PREMIUM</span>
        </div>
      </div>

      {/* ZONE DÉFILANTE (Nav + Watchlist) */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '8px 0' }}>
        {navSections.map((section) => (
          <div key={section.label} style={{ marginBottom: '2px' }}>
             {/* ... Reste de votre logique de navigation intacte ... */}
             <button onClick={() => setOpenSection(openSection === section.label ? null : section.label)} style={{ all: 'unset', width: '100%', padding: '8px 16px', boxSizing: 'border-box', color: '#fff', fontSize: '13px' }}>
                {section.label}
             </button>
             {openSection === section.label && section.items.map(it => (
                <Link key={it.href} href={it.href} style={{ display: 'block', padding: '8px 32px', color: '#B8B8B8', fontSize: '12px' }}>
                    {it.label}
                </Link>
             ))}
          </div>
        ))}
        {/* Watchlist section */}
        <div style={{ padding: '10px 16px' }}>
            <span style={{ fontSize: '9px', color: C.label }}>WATCHLIST</span>
            {items.map(i => <WatchMiniCard key={i.id} item={i} />)}
        </div>
      </div>

      {/* FOOTER PROFIL FIXE */}
      <div className="flex-shrink-0" style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.gold, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profile.full_name?.charAt(0) || 'C'}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>{profile.full_name}</div>
            <div style={{ fontSize: '10px', color: C.muted }}>Profil investisseur</div>
          </div>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {(isMobile === false || isMobile === null) && sidebar}
      {isMobile && (
        <>
          <button type="button" onClick={() => setMenuOpen(true)} className="fixed top-4 left-4 z-40"><Menu color="white" /></button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.22 }} style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 201, width: '85vw', background: C.surface }}>
                {sidebar}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  )
}
