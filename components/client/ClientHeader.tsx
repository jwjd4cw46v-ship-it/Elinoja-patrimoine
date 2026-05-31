'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'

export default function ClientHeader({ profile }: { profile: Profile }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('À bientôt')
    router.push('/auth/login')
  }

  return (
    <header className="flex items-center justify-between px-6 h-14 flex-shrink-0 border-b"
      style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

      {/* Market ticker */}
      <div className="flex items-center gap-4 text-xs font-mono overflow-hidden">
        <span style={{ color: '#5C5C5C' }}>MARCHÉ</span>
        <div className="ticker-wrap flex gap-6" style={{ maxWidth: 400 }}>
          {[
            { t: 'TUNINDEX', v: '+0.42%', up: true },
            { t: 'SFBT',     v: '+1.23%', up: true },
            { t: 'BNA',      v: '-0.35%', up: false },
            { t: 'ATB',      v: '+0.87%', up: true },
          ].map(item => (
            <span key={item.t} className="flex-shrink-0">
              <span style={{ color: '#707070' }}>{item.t} </span>
              <span style={{ color: item.up ? '#00C853' : '#FF1744' }}>{item.v}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg" style={{ color: '#707070' }}>
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#D4AF37' }} />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ border: '1px solid var(--noir-border)', background: 'var(--noir-elevated)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
              {profile.full_name?.charAt(0)}
            </div>
            <span className="text-sm hidden sm:inline" style={{ color: '#A0A0A0' }}>
              {profile.full_name?.split(' ')[0]}
            </span>
            <ChevronDown size={12} style={{ color: '#5C5C5C' }} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute right-0 top-full mt-2 w-44 rounded-xl border z-50 py-1"
                style={{ background: 'var(--noir-elevated)', borderColor: 'var(--noir-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left"
                  style={{ color: '#FF1744' }}>
                  <LogOut size={13} /> Déconnexion
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
