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

// --- VOTRE PALETTE ---
const C = {
  bg: '#0A0A0A',
  surface: '#0F0F0F',
  border: '#1C1C1C',
  gold: '#D4AF37',
  goldLight: '#F0D060',
  goldDim: 'rgba(212,175,55,0.12)',
  goldBorder: 'rgba(212,175,55,0.22)',
  text: '#FFFFFF',
  muted: '#555555',
  label: '#3A3A3A',
  red: '#FF3B3B',
}

// --- VOS CONSTANTES (navSections, PAGE_LABELS, etc.) ---
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

// --- VOTRE LOGIQUE DE COMPOSANT ---
function SidebarContent({ profile, userId, onClose }: { profile: Profile; userId: string; onClose?: () => void }) {
  const pathname = usePathname();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [watchOpen, setWatchOpen] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const { items, loading: watchLoading, refresh } = useWatchlist(userId || profile.id || '');
  
  const isActive = (href: string) => href === '/client' ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  const activeAlerts = items.filter(i => i.current > 0 && ((i.low > 0 && i.current < i.low) || (i.high > 0 && i.current > i.high))).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: C.surface }}>
      {/* Intégrez ici tout le contenu original de votre sidebar (Le logo, les navSections, le footer, etc.) */}
      {/* Assurez-vous que chaque lien <Link> comporte onClick={onClose} pour bien fermer le menu sur mobile */}
      
      <div className="p-5 border-b border-[#1C1C1C] text-center">
        <Image src="/logo.jpeg" alt="Elinoja" width={130} height={56} />
      </div>

      <nav className="flex-1 py-4">
        {navSections.map((section) => (
           <div key={section.label}>
             {/* Répétez ici votre logique d'affichage des liens et accordéons */}
           </div>
        ))}
      </nav>
      
      {/* ... Ajoutez tout le reste de votre Watchlist, Footer et logique ici ... */}
    </div>
  );
}

export default function ClientSidebar({ profile }: { profile: Profile }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id) });
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <>
      {(isMobile === false || isMobile === null) && (
        <aside className="w-64 h-full border-r border-[#1C1C1C]">
          <SidebarContent profile={profile} userId={userId} />
        </aside>
      )}
      {isMobile && (
        <>
          <button onClick={() => setMenuOpen(!menuOpen)} className="fixed top-4 left-4 z-[300]">
            <Menu color="#FFF" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} 
                className="fixed inset-0 z-[201] w-[85vw] max-w-[320px]">
                <SidebarContent profile={profile} userId={userId} onClose={() => setMenuOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}
