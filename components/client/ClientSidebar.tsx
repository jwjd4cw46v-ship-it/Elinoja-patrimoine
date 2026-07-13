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
  const isBelowLow = item.low > 0 && item.current < item.low;
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px' }}>
      <div className="flex justify-between text-[11px] text-white"><span>{item.ticker}</span><span>{item.current.toFixed(3)}</span></div>
    </div>
  )
}

function SidebarContent({ profile, userId, onClose }: { profile: Profile; userId: string; onClose?: () => void }) {
  const pathname = usePathname();
  const { items, loading, refresh } = useWatchlist(userId || profile.id || '');
  const [openSection, setOpenSection] = useState<string | null>('MARCHÉS');
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: C.surface }}>
      <div className="p-5 border-b border-[#1C1C1C] text-center">
        <Image src="/logo.jpeg" alt="Logo" width={130} height={56} />
      </div>

      <nav className="flex-1 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            {section.items.length === 1 ? (
              <Link href={section.items[0].href} onClick={onClose} className="flex items-center gap-3 p-3 px-6 text-[13px]" style={{ color: isActive(section.items[0].href) ? C.gold : '#FFF' }}>
                <section.icon size={16} /> {section.items[0].label}
              </Link>
            ) : (
              <div>
                <button onClick={() => setOpenSection(openSection === section.label ? null : section.label)} className="flex items-center justify-between w-full p-3 px-6 text-[13px] text-white">
                  {section.label} <ChevronDown size={14} />
                </button>
                <div style={{ display: 'grid', gridTemplateRows: openSection === section.label ? '1fr' : '0fr', transition: '0.2s' }}>
                  <div className="overflow-hidden">
                    {section.items.map(item => (
                      <Link key={item.href} href={item.href} onClick={onClose} className="flex items-center justify-between py-2 pl-10 pr-6 text-[12px]" style={{ color: isActive(item.href) ? C.gold : '#B8B8B8' }}>
                        {item.label}
                        {(item as any).premium && <span className="text-[7px] font-bold bg-[#D4AF37] text-black px-1 rounded">PREMIUM</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-[#1C1C1C]">
        <div className="text-xs text-gray-500 mb-2 uppercase">Watchlist</div>
        <div className="flex flex-col gap-2">
          {items.map(item => <WatchMiniCard key={item.id} item={item} />)}
        </div>
      </div>
    </div>
  );
}

export default function ClientSidebar({ profile }: { profile: Profile }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <>
      {(isMobile === false || isMobile === null) && <aside className="w-64 h-full border-r border-[#1C1C1C]"><SidebarContent profile={profile} userId="" /></aside>}
      {isMobile && (
        <>
          <button onClick={() => setMenuOpen(!menuOpen)} className="fixed top-4 left-4 z-[300]"><Menu color="#FFF" /></button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed inset-0 z-[201] w-[85vw] max-w-[320px]">
                <SidebarContent profile={profile} userId="" onClose={() => setMenuOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}
