'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, TrendingUp, BarChart2,
  FileText, MessageSquare, Bell, Settings, ChevronRight
} from 'lucide-react'
import type { Profile } from '@/types'

const navItems = [
  { href: '/admin',                      icon: LayoutDashboard, label: 'Dashboard',              badge: null },
  { href: '/admin/clients',              icon: Users,           label: 'Clients',                 badge: null },
  { href: '/admin/analyses-techniques',  icon: TrendingUp,      label: 'Analyses Techniques',     badge: null },
  { href: '/admin/analyses-fondamentales', icon: BarChart2,     label: 'Analyses Fondamentales',  badge: null },
  { href: '/admin/cmf',                  icon: FileText,        label: 'Communiqués CMF',         badge: null },
  { href: '/admin/forum',                icon: MessageSquare,   label: 'Forum',                   badge: null },
  { href: '/admin/annonces',             icon: Bell,            label: 'Annonces',                badge: null },
  { href: '/admin/parametres',           icon: Settings,        label: 'Paramètres',              badge: null },
]

export default function AdminSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex flex-col flex-shrink-0 h-full"
      style={{
        background: 'var(--noir-surface)',
        borderRight: '1px solid var(--noir-border)',
      }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--noir-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)' }}>
            <span className="text-black font-bold text-xs">EP</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-[0.15em] truncate" style={{ color: '#D4AF37' }}>
              ELINOJA
            </div>
            <div className="text-[10px] tracking-[0.1em]" style={{ color: '#5C5C5C' }}>
              PATRIMOINE
            </div>
          </div>
        </div>
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
                className={`sidebar-link ${isActive ? 'active' : ''}`}>
                <item.icon size={16} style={{ flexShrink: 0 }} />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <ChevronRight size={12} className="ml-auto flex-shrink-0"
                    style={{ color: '#D4AF37' }} />
                )}
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
            <div className="text-sm font-medium truncate" style={{ color: '#F5F5F5' }}>
              {profile.full_name}
            </div>
            <div className="text-xs truncate" style={{ color: '#5C5C5C' }}>
              {profile.email}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
