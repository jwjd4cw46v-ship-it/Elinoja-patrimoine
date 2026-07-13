'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, BarChart2, FileText, MessageSquare, 
  Bell, Star, Newspaper, Calendar, LineChart, ChevronDown,
  Menu, X, Globe, BookOpen, Users, HelpCircle,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWatchlist } from '@/hooks/useWatchlist'
import type { Profile } from '@/types'

const navSections = [
  { label: 'TABLEAU DE BORD', icon: LayoutDashboard, items: [{ href: '/client', label: 'Tableau de bord' }] },
  { label: 'MARCHÉS', icon: LineChart, items: [
      { href: '/client/cotations', label: 'Cotations BVMT' },
      { href: '/client/watchlist', label: 'Mes Opportunités' },
      { href: '/client/positions', label: 'Opportunités Elinoja', premium: true },
    ] },
  { label: 'ANALYSES', icon: BarChart2, items: [
      { href: '/client/analyses', label: 'Analyses Techniques' },
      { href: '/client/fondamentales', label: 'Analyses Fondamentales' },
      { href: '/client/avis-experts', label: "Avis d'Experts" },
      { href: '/client/figures-chartistes', label: 'Figures Chartistes' },
    ] },
  { label: 'INFORMATIONS', icon: Newspaper, items: [
      { href: '/client/news', label: 'Actualités' },
      { href: '/client/cmf', label: 'Publications CMF' },
      { href: '/client/calendrier', label: 'Calendrier AGO' },
      { href: '/client/annonces', label: 'Annonces' },
    ] },
  { label: 'OUTILS', icon: Globe, items: [{ href: '/client/marches', label: 'Devises & Matières' }, { href: '/client/forum', label: 'Communauté Elinoja' }] },
  { label: 'SUPPORT', icon: HelpCircle, items: [{ href: '/client/aide', label: 'Aide & Installation' }] },
]

export default function ClientSidebar({ profile }: { profile: Profile }) {
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { items } = useWatchlist(profile.id)
  const [openSection, setOpenSection] = useState<string | null>('MARCHÉS')

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0F0F0F] border-r border-[#1C1C1C]">
      {/* Header : Logo + Premium */}
      <div className="p-6 border-b border-[#1C1C1C] flex flex-col items-center gap-4">
        <Image src="/logo.jpeg" alt="Logo" width={150} height={60} />
        <button className="w-full py-2 bg-[#D4AF37]/10 border border-[#D4AF37] text-[#D4AF37] text-[10px] font-bold rounded uppercase tracking-widest hover:bg-[#D4AF37] hover:text-black transition-all">
          Abonnement Premium
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        {navSections.map((sec) => (
          <div key={sec.label} className="mb-2">
            <button onClick={() => setOpenSection(openSection === sec.label ? null : sec.label)} className="flex items-center justify-between w-full p-4 text-[13px] text-white">
              {sec.label} <ChevronDown size={14} className={openSection === sec.label ? 'rotate-180' : ''} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${openSection === sec.label ? 'max-h-96' : 'max-h-0'}`}>
              {sec.items.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex justify-between items-center py-2 px-10 text-[12px] text-gray-400 hover:text-white">
                  {item.label} {(item as any).premium && <span className="bg-[#D4AF37] text-black text-[8px] font-bold px-1 rounded">PREMIUM</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-[#1C1C1C] bg-[#0F0F0F]">
        <div className="text-[10px] text-gray-500 mb-2 uppercase">Watchlist</div>
        {items.map((i: any) => (
          <div key={i.id} className="p-2 mb-2 bg-[#0A0A0A] border border-[#1C1C1C] rounded flex justify-between text-[11px] text-white">
            <span>{i.ticker}</span> <span>{i.current?.toFixed(3)}</span>
          </div>
        ))}
        
        <div className="mt-4 p-3 bg-[#1C1C1C] rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-[12px]">
            {profile.full_name?.charAt(0) || 'U'}
          </div>
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
      {!isMobile ? <aside className="w-64 h-full"><SidebarContent /></aside> : (
        <>
          <button onClick={() => setMenuOpen(true)} className="fixed top-4 left-4 z-40 p-2"><Menu color="white" /></button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="fixed inset-0 z-50 w-72">
                <button onClick={() => setMenuOpen(false)} className="absolute top-4 right-4 z-10"><X color="white" /></button>
                <SidebarContent />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  )
}
