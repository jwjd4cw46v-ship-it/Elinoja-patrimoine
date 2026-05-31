'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, TrendingUp, BarChart2,
  FileText, MessageSquare, Bell, Settings, ChevronRight, Newspaper, Calendar
} from 'lucide-react'
import type { Profile } from '@/types'

const navItems = [
  { href: '/admin',                        icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/clients',                icon: Users,           label: 'Clients' },
  { href: '/admin/analyses-techniques',    icon: TrendingUp,      label: 'Analyses Techniques' },
  { href: '/admin/analyses-fondamentales', icon: BarChart2,       label: 'Analyses Fondamentales' },
  { href: '/admin/cmf',                    icon: FileText,        label: 'Communiqués CMF' },
  { href: '/admin/news',                   icon: Newspaper,       label: 'News' },
  { href: '/admin/forum',                  icon: MessageSquare,   label: 'Forum' },
  { href: '/admin/annonces',               icon: Bell,            label: 'Annonces' },
  { href: '/admin/calendrier',             icon: Calendar,        label: 'Calendrier AGO' },
  { href: '/admin/parametres',             icon: Settings,        label: 'Paramètres' },
]

export default function AdminSidebar({ profile }: { profile: Profile }) {
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

      {/* Admin badge */}
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--noir-border)' }}>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
          style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          ADMINISTRATEUR
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))

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

      {/* Profile footer */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--noir-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
            {profile.full_name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: '#F5F5F5' }}>{profile.full_name}</div>
            <div className="text-xs truncate" style={{ color: '#5C5C5C' }}>{profile.email}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
