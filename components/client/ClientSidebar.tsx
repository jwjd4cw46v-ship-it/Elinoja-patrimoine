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
      { href: '/client/cotations', icon: LineChart, label: 'Cotations BVMT' },
      { href: '/client/watchlist', icon: Star, label: 'Mes Opportunités' },
      { href: '/client/positions', icon: TrendingUp, label: 'Opportunités Elinoja', premium: true },
    ] },
  { label: 'ANALYSES', icon: BarChart2, items: [
      { href: '/client/analyses', icon: TrendingUp, label: 'Analyses Techniques' },
      { href: '/client/fondamentales', icon: BarChart2, label: 'Analyses Fondamentales' },
      { href: '/client/avis-experts', icon: Users, label: "Avis d'Experts" },
      { href: '/client/figures-chartistes', icon: BookOpen, label: 'Figures Chartistes' },
    ] },
  { label: 'INFORMATIONS', icon: Newspaper, items: [
      { href: '/client/news', icon: Newspaper, label: 'Actualités' },
      { href: '/client/cmf', icon: FileText, label: 'Publications CMF' },
      { href: '/client/calendrier', icon: Calendar, label: 'Calendrier AGO' },
      { href: '/client/annonces', icon: Bell, label: 'Annonces' },
    ] },
  { label: 'OUTILS', icon: Globe, items: [
      { href: '/client/marches', icon: Globe, label: 'Devises & Matières' },
      { href: '/client/forum', icon: MessageSquare, label: 'Communauté Elinoja' },
    ] },
  { label: 'SUPPORT', icon: HelpCircle, items: [{ href: '/client/aide', icon: HelpCircle, label: 'Aide & Installation' }] },
]

function WatchMiniCard({ item }: { item: any }) {
  const isBelowLow = item.low > 0 && item.current > 0 && item.current < item.low
  const isAboveHigh = item.high > 0 && item.current > 0 && item.current > item.high
  const pct = item.high > item.low ? ((item.current - item.low) / (item.high - item.low)) * 100 : 50
  const pctClamped = Math.max(0, Math.min(100, pct))
  const fmt = (v: number) => v.toLocaleString('fr-TN', { minimumFractionDigits: v > 100 ? 2 : 3, maximumFractionDigits: v > 100 ? 2 : 3 })

  return (
    <div style={{ background: C.bg, border: `1px solid ${isBelowLow ? 'rgba(255,59,59,0.3)' : isAboveHigh ? 'rgba(0,200,83,0.25)' : C.border}`, borderRadius: '8px', padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>{item.ticker}</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: isBelowLow ? C.red : isAboveHigh ? '#00C853' : '#FFFFFF' }}>{fmt(item.current)}</div>
      </div>
    </div>
  )
}

// ── COMPOSANT CONTENU (Structure aplatie) ──
function SidebarContent({ profile, userId, onClose }: { profile: Profile; userId: string; onClose?: () => void }) {
  const pathname = usePathname()
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [watchOpen, setWatchOpen] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const { items, loading: watchLoading, refresh } = useWatchlist(userId || profile.id || '')
  
  const isActive = (href: string) => href === '/client' ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  const activeAlerts = items.filter(i => i.current > 0 && ((i.low > 0 && i.current < i.low) || (i.high > 0 && i.current > i.high))).length

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: C.surface }}>
      <div style={{ padding: '20px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'center', background: C.bg }}>
        <Image src="/logo.jpeg" alt="Elinoja" width={130} height={56} />
      </div>

      <nav style={{ padding: '8px 0', flex: 1 }}>
        {navSections.map(section => (
          <div key={section.label} style={{ marginBottom: '2px' }}>
            {section.items.length === 1 ? (
              <Link href={section.items[0].href} onClick={onClose} className="flex items-center gap-3 p-3 mx-2 rounded-lg text-[13px]" style={{ color: isActive(section.items[0].href) ? C.gold : '#FFFFFF' }}>
                <section.icon size={15} /> {section.items[0].label}
              </Link>
            ) : (
              <div>
                <button onClick={() => setOpenSection(openSection === section.label ? null : section.label)} className="flex items-center justify-between w-full p-3 px-4 text-[13px]" style={{ color: '#FFFFFF' }}>
                  {section.label} <ChevronDown size={12} style={{ transform: openSection === section.label ? 'rotate(180deg)' : 'none' }} />
                </button>
                <div style={{ display: 'grid', gridTemplateRows: openSection === section.label ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s' }}>
                  <div style={{ overflow: 'hidden' }}>
                    {section.items.map(item => (
                      <Link key={item.href} href={item.href} onClick={onClose} className="block p-2 pl-10 text-[12px]" style={{ color: isActive(item.href) ? C.gold : '#B8B8B8' }}>{item.label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  )
}

export default function ClientSidebar({ profile }: { profile: Profile }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id) })
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <>
      {(isMobile === false || isMobile === null) && (
        <aside className="w-64 h-full border-r border-[#1C1C1C]"><SidebarContent profile={profile} userId={userId} /></aside>
      )}
      {isMobile && (
        <>
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className={`hamburger-btn${menuOpen ? ' open' : ''}`}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed inset-0 z-[201] w-[85vw] max-w-[320px]">
                <SidebarContent profile={profile} userId={userId} onClose={() => setMenuOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  )
}
