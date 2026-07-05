'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'
import NotificationBell from '@/components/notifications/NotificationBell'

interface Market {
  isin:       string
  last:       number
  change:     number
  seance:     string
  referentiel: {
    stockName: string
    ticker:    string
  }
}

const PRIORITY = ['TUNINDEX', 'TUNINDEX20', 'AB', 'SFBT', 'BNA', 'ATB', 'BIAT', 'BT', 'PGH', 'STB']

export default function ClientHeader({ profile }: { profile: Profile }) {
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [markets,    setMarkets]    = useState<Market[]>([])
  const [loading,    setLoading]    = useState(true)

  const router   = useRouter()
  const supabase = createClient()

  // ── Fetch cotations + détection franchissements ──────────────────────────
  async function fetchMarkets() {
    try {
      const res  = await fetch('/api/cotations', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (!data.markets?.length) return

      setMarkets(data.markets)
      setLoading(false)

      // Détection franchissements gérée par le système de notifications
    } catch {
      // silencieux
    }
  }

  useEffect(() => {
    fetchMarkets()
    const interval = setInterval(fetchMarkets, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('À bientôt')
    router.push('/auth/login')
  }

  const sorted = [
    ...PRIORITY
      .map(p => markets.find(m => m.referentiel?.ticker?.toUpperCase() === p))
      .filter(Boolean),
    ...markets.filter(m => !PRIORITY.includes(m.referentiel?.ticker?.toUpperCase())),
  ] as Market[]

  const tickerItems  = sorted.length > 0 ? [...sorted, ...sorted, ...sorted, ...sorted] : []
  const animDuration = Math.max(40, sorted.length * 3)
  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          white-space: nowrap;
          animation: ticker-scroll linear infinite;
          will-change: transform;
        }
        .ticker-track:hover { animation-play-state: paused; }

        @keyframes badge-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.5); }
          70%  { transform: scale(0.88); }
          100% { transform: scale(1); }
        }
        .badge-pop { animation: badge-pop 0.4s cubic-bezier(.36,.07,.19,.97); }

        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          15%       { transform: rotate(12deg); }
          30%       { transform: rotate(-10deg); }
          45%       { transform: rotate(8deg); }
          60%       { transform: rotate(-6deg); }
          75%       { transform: rotate(4deg); }
        }
        .bell-ring { animation: bell-ring 0.6s ease; }

        /* Mobile : padding-left pour le bouton hamburger fixe du sidebar */
        @media (max-width: 767px) {
          .client-header { padding-left: 62px !important; padding-right: 16px; }
        }
        @media (min-width: 768px) {
          .client-header { padding-left: 24px; padding-right: 24px; }
        }
      `}</style>

      <header
        className="flex items-center justify-between h-14 flex-shrink-0 border-b client-header"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>


        {/* ── Ticker Band ─────────────────────────────── */}
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden mr-2">
          <span
            className="text-[10px] font-bold tracking-wider flex-shrink-0 hidden sm:block"
            style={{ color: '#5C5C5C' }}>
            MARCHÉ
          </span>

          {loading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton h-3 w-20 rounded" />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden flex-1">
              <div
                className="ticker-track"
                style={{ animationDuration: `${animDuration}s`, gap: '20px' }}>
                {tickerItems.map((m, i) => {
                  const color = m.change > 0 ? '#00C853' : m.change < 0 ? '#FF1744' : '#707070'
                  return (
                    <span
                      key={`${m.isin}-${i}`}
                      className="inline-flex items-center flex-shrink-0"
                      style={{ gap: '6px' }}>
                      <span className="text-xs font-semibold" style={{ color: '#C0C0C0' }}>
                        {m.referentiel?.ticker}
                      </span>
                      <span className="text-xs font-mono font-bold" style={{ color: '#F5F5F5' }}>
                        {m.last.toLocaleString('fr-TN', {
                          minimumFractionDigits: m.last > 100 ? 2 : 3,
                          maximumFractionDigits: m.last > 100 ? 2 : 3,
                        })}
                      </span>
                      <span className="text-xs flex items-center font-medium" style={{ color, gap: '2px' }}>
                        {m.change > 0 ? <TrendingUp size={10} /> : m.change < 0 ? <TrendingDown size={10} /> : null}
                        {m.change > 0 ? '+' : ''}{m.change.toFixed(2)}%
                      </span>
                      <span style={{ color: '#2A2A2A', marginLeft: '4px' }}>·</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right actions ────────────────────────────── */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* ── Centre de notifications ── */}
          <NotificationBell userId={profile.id} />

          {/* ── Menu utilisateur ── */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ border: '1px solid var(--noir-border)', background: 'var(--noir-elevated)' }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
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
                  style={{
                    background:  'var(--noir-elevated)',
                    borderColor: 'var(--noir-border)',
                    boxShadow:   '0 8px 32px rgba(0,0,0,0.5)',
                  }}>
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--noir-border)' }}>
                    <div className="text-xs font-medium truncate" style={{ color: '#F5F5F5' }}>
                      {profile.full_name}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: '#5C5C5C' }}>
                      {profile.email}
                    </div>
                  </div>
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
    </>
  )
}
