'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, LogOut, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'

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

// Tickers prioritaires dans le ticker band
const PRIORITY = ['TUNINDEX', 'TUNINDEX20', 'AB', 'SFBT', 'BNA', 'ATB', 'BIAT', 'BT', 'PGH', 'STB']

export default function ClientHeader({ profile }: { profile: Profile }) {
  const [menuOpen, setMenuOpen]   = useState(false)
  const [markets, setMarkets]     = useState<Market[]>([])
  const [loading, setLoading]     = useState(true)
  const router  = useRouter()
  const supabase = createClient()

  // ── Charger depuis l'API BVMT via notre route proxy ──────
  async function fetchMarkets() {
    try {
      const res  = await fetch('/api/cotations', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data.markets && data.markets.length > 0) {
        setMarkets(data.markets)
        setLoading(false)
      }
    } catch {
      // silencieux
    }
  }

  useEffect(() => {
    fetchMarkets()
    // Rafraîchir toutes les 60 secondes
    const interval = setInterval(fetchMarkets, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('À bientôt')
    router.push('/auth/login')
  }

  // Trier : prioritaires d'abord, puis le reste
  const sorted = [
    ...PRIORITY
      .map(p => markets.find(m => m.referentiel?.ticker?.toUpperCase() === p))
      .filter(Boolean),
    ...markets.filter(m => !PRIORITY.includes(m.referentiel?.ticker?.toUpperCase())),
  ] as Market[]

  // Doubler pour scroll infini
  const tickerItems = sorted.length > 0 ? [...sorted, ...sorted] : []
  const animDuration = Math.max(30, sorted.length * 2)

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 h-14 flex-shrink-0 border-b"
      style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

      {/* ── Ticker Band ─────────────────────────────── */}
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden mr-4">
        <span className="text-[10px] font-bold tracking-wider flex-shrink-0 hidden sm:block"
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
            <motion.div
              className="flex gap-5 whitespace-nowrap"
              animate={{ x: ['0%', '-50%'] }}
              transition={{
                duration: animDuration,
                ease:     'linear',
                repeat:   Infinity,
              }}>
              {tickerItems.map((m, i) => {
                const up    = m.change >= 0
                const color = m.change > 0 ? '#00C853' : m.change < 0 ? '#FF1744' : '#707070'
                return (
                  <span key={`${m.isin}-${i}`}
                    className="inline-flex items-center gap-1.5 text-xs flex-shrink-0">

                    {/* Ticker */}
                    <span className="font-semibold" style={{ color: '#C0C0C0' }}>
                      {m.referentiel?.ticker}
                    </span>

                    {/* Cours */}
                    <span className="font-mono font-bold" style={{ color: '#F5F5F5' }}>
                      {m.last.toLocaleString('fr-TN', {
                        minimumFractionDigits: m.last > 100 ? 2 : 3,
                        maximumFractionDigits: m.last > 100 ? 2 : 3,
                      })}
                    </span>

                    {/* Variation */}
                    <span className="flex items-center gap-0.5 font-medium" style={{ color }}>
                      {m.change > 0
                        ? <TrendingUp  size={10} />
                        : m.change < 0
                        ? <TrendingDown size={10} />
                        : null}
                      {m.change > 0 ? '+' : ''}{m.change.toFixed(2)}%
                    </span>

                    <span style={{ color: '#2A2A2A' }}>·</span>
                  </span>
                )
              })}
            </motion.div>
          </div>
        )}
      </div>

      {/* ── Right actions ────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">
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
                <button onClick={handleLogout}
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
