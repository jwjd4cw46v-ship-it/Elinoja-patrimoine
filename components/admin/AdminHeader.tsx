'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, LogOut, User, ChevronDown, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'

export default function AdminHeader({ profile }: { profile: Profile }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Déconnexion réussie')
    router.push('/auth/login')
  }

  return (
    <header className="flex items-center justify-between px-6 h-14 flex-shrink-0 border-b"
      style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

      {/* Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--noir-elevated)', color: '#5C5C5C', border: '1px solid var(--noir-border)' }}>
          <Search size={14} />
          <span className="hidden sm:inline">Recherche rapide...</span>
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'var(--noir-border)', color: '#5C5C5C' }}>⌘K</kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">

        {/* Notifications */}
        <button className="relative p-2 rounded-lg transition-colors"
          style={{ color: '#707070' }}
          onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
          onMouseOut={e => (e.currentTarget.style.color = '#707070')}>
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: '#D4AF37' }} />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
            style={{ border: '1px solid var(--noir-border)', background: 'var(--noir-elevated)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
              {profile.full_name?.charAt(0) || 'A'}
            </div>
            <span className="text-sm hidden sm:inline" style={{ color: '#A0A0A0' }}>
              {profile.full_name?.split(' ')[0]}
            </span>
            <ChevronDown size={12} style={{ color: '#5C5C5C' }} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 rounded-xl border z-50 py-1"
                style={{
                  background: 'var(--noir-elevated)',
                  borderColor: 'var(--noir-border)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--noir-border)' }}>
                  <div className="text-xs font-medium" style={{ color: '#F5F5F5' }}>{profile.full_name}</div>
                  <div className="text-[11px]" style={{ color: '#5C5C5C' }}>{profile.email}</div>
                </div>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left"
                  style={{ color: '#A0A0A0' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#F5F5F5')}
                  onMouseOut={e => (e.currentTarget.style.color = '#A0A0A0')}>
                  <User size={13} /> Profil
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left"
                  style={{ color: '#FF1744' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,23,68,0.05)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
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
