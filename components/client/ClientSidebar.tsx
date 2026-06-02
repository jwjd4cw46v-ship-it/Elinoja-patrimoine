'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, BarChart2,
  FileText, MessageSquare, Bell, Star, ChevronRight, Newspaper, Calendar, LineChart
} from 'lucide-react'
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

export default function ClientSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex flex-col flex-shrink-0 h-full"
      style={{ background: 'var(--noir-surface)', borderRight: '1px solid var(--noir-border)' }}>

      {/* Logo */}
      <div className="px-4 py-4 border-b flex items-center justify-center" style={{ borderColor: 'var(--noir-border)' }}>
        <Image
          src="/logo.jpeg"
          alt="Elinoja Patrimoine"
          width={150}
          height={65}
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Subscription badge */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--noir-border)' }}>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
          profile.subscription_status === 'active' ? 'badge-buy' :
          profile.subscription_status === 'trial'  ? 'badge-watch' : 'badge-sell'
        }`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
          {profile.subscription_status === 'active' ? 'ABONNEMENT ACTIF' :
           profile.subscription_status === 'trial'  ? 'PÉRIODE D\'ESSAI' : 'ABONNEMENT EXPIRÉ'}
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/client' && pathname.startsWith(item.href))

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? '#D4AF37' : '#707070',
                  background: isActive ? 'rgba(212,175,55,0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                <item.icon size={16} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
                {isActive && <ChevronRight size={12} style={{ marginLeft: 'auto', color: '#D4AF37' }} />}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'var(--noir-border)' }}>
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
}
