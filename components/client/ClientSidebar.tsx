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

const C = {
  bg: '#0A0A0A', surface: '#0F0F0F', border: '#1C1C1C', gold: '#D4AF37',
  goldLight: '#F0D060', goldDim: 'rgba(212,175,55,0.12)', goldBorder: 'rgba(212,175,55,0.22)',
  text: '#FFFFFF', muted: '#555555', label: '#3A3A3A', red: '#FF3B3B',
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
  
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>{item.ticker}</div>
          <div style={{ fontSize: '9px', color: C.muted }}>{item.name}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{item.current?.toFixed(3)}</div>
      </div>
    </div>
  )
}

export default function ClientSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>('MARCHÉS')
  const { items, loading: watchLoading, refresh } = useWatchlist(profile.id)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const SidebarContent = () => (
    <div className="w-64 h-full flex flex-col bg-[#0F0F0F] border-r border-[#1C1C1C]">
      {/* 1. Zone fixe en haut */}
      <div className="flex-shrink-0 p-6 border-b border-[#1C1C1C] flex flex-col items-center gap-4">
        <Image src="/logo.jpeg" alt="Elinoja Patrimoine" width={130} height={56} />
        <div style={{ padding: '5px 12px', borderRadius: '20px', background: C.goldDim, border: `1px solid ${C.goldBorder}` }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: C.gold }}>ABONNEMENT PREMIUM</span>
        </div>
      </div>

      {/* 2. Zone défilante au milieu */}
      <div className="flex-1 overflow-y-auto py-4">
        {navSections.map((sec) => (
          <div key={sec.label}>
            <button onClick={() => setOpenSection(openSection === sec.label ? null : sec.label)} className="w-full flex items-center justify-between p-4 text-[13px] text-white">
              {sec.label} <ChevronDown size={14} className={openSection === sec.label ? 'rotate-180' : ''} />
            </button>
            {openSection === sec.label && sec.items.map((it) => (
              <Link key={it.href} href={it.href} className="flex justify-between items-center py-2 px-10 text-[12px] text-gray-400">
                {it.label} {(it as any).premium && <span className="bg-[#D4AF37] text-black text-[8px] font-bold px-1 rounded">PREMIUM</span>}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* 3. Zone fixe en bas */}
      <div className="flex-shrink-0 p-4 border-t border-[#1C1C1C]">
        <div className="text-[10px] text-gray-500 mb-2 uppercase">Watchlist</div>
        {items.map((i: any) => <WatchMiniCard key={i.id} item={i} />)}
        <div className="mt-4 p-3 bg-[#1C1C1C] rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold">{profile.full_name?.charAt(0)}</div>
          <div>
            <div className="text-[12px] text-white font-bold">{profile.full_name}</div>
            <div className="text-[9px] text-gray-400">Profil investisseur</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {(isMobile === false || isMobile === null) && <aside className="h-full"><SidebarContent /></aside>}
      {isMobile && (
        <>
          <button onClick={() => setMenuOpen(true)} className="fixed top-4 left-4 z-40 p-2"><Menu color="white" /></button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="fixed inset-0 z-50">
                <button onClick={() => setMenuOpen(false)} className="absolute top-4 right-4 z-50"><X color="white" /></button>
                <SidebarContent />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  )
}
