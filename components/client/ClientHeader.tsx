'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, LogOut, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'
import type { AlertLog } from '@/types/watchlist'
import { NotifPanel } from '@/components/watchlist/NotifPanel'

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
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [markets,    setMarkets]    = useState<Market[]>([])
  const [loading,    setLoading]    = useState(true)
  const [countLow,   setCountLow]   = useState(0)
  const [countHigh,  setCountHigh]  = useState(0)
  const [logs,       setLogs]       = useState<AlertLog[]>([])
  const [popLow,     setPopLow]     = useState(false)
  const [popHigh,    setPopHigh]    = useState(false)

  const triggered = useRef<Record<string, { low: boolean; high: boolean }>>({})
  const router   = useRouter()
  const supabase = createClient()

  async function fetchMarkets() {
    try {
      const res  = await fetch('/api/cotations', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (!data.markets?.length) return

      setMarkets(data.markets)
      setLoading(false)

      const { data: alertes } = await supabase
        .from('watchlist_alertes')
        .select('ticker, prix_bas, prix_haut')
        .eq('user_id', profile.id)

      if (!alertes?.length) return

      const now = new Date()
      const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

      data.markets.forEach((m: Market) => {
        const ticker = m.referentiel?.ticker?.toUpperCase()
        const alerte = alertes.find(a => a.ticker?.toUpperCase() === ticker)
        if (!alerte) return
        const current = m.last
        const low     = alerte.prix_bas
        const high    = alerte.prix_haut
        const mem     = triggered.current[ticker] ?? { low: false, high: false }

        if (low > 0 && current < low && !mem.low) {
          triggered.current[ticker] = { ...mem, low: true }
          setCountLow(c => c + 1)
          setPopLow(true)
          setTimeout(() => setPopLow(false), 420)
          setLogs(l => [...l, { id: ticker, type: 'low', current, low, high, time: timeStr }])
        } else if (current >= low) {
          triggered.current[ticker] = { ...mem, low: false }
        }

        if (high > 0 && current > high && !mem.high) {
          triggered.current[ticker] = { ...triggered.current[ticker], high: true }
          setCountHigh(c => c + 1)
          setPopHigh(true)
          setTimeout(() => setPopHigh(false), 420)
          setLogs(l => [...l, { id: ticker, type: 'high', current, low, high, time: timeStr }])
        } else if (current <= high) {
          triggered.current[ticker] = { ...triggered.current[ticker], high: false }
        }
      })
    } catch { }
  }

  useEffect(() => {
    fetchMarkets()
    const interval = setInterval(fetchMarkets, 15 * 1000)
    return () => clearInterval(interval)
  }, [])

  function handleBellOpen() {
    setNotifOpen(o => !o)
    if (!notifOpen) { setCountLow(0); setCountHigh(0) }
  }

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
  const animDuration = Math.max(30, sorted.length * 5)
  const totalAlerts  = countLow + countHigh

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-wrap {
          overflow: hidden;
          flex: 1;
        }
        .ticker-track {
          display: inline-flex;
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
      `}</style>

      <header
        className="flex items-center justify-between h-14 flex-shrink-0 border-b"
        style={{
          background: 'var(--noir-surface)',
          borderColor: 'var(--noir-border)',
          /* Sur mobile : laisser 54px à gauche pour le bouton hamburger */
          paddingLeft: 'max(54px, env(safe-area-inset-left))',
          paddingRight: '16px',
        }}>

        {/* ── Ticker Band ── */}
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden mr-4">
          <span className="text-[10px] font-bold tracking-wider flex-shrink-0 hidden sm:block"
            style={{ color: '#5C5C5C' }}>
            MARCHÉ
          </span>

          {loading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-3 w-20 rounded" />)}
            </div>
          ) : (
            <div className="ticker-wrap">
              <div className="ticker-track" style={{ animationDuration: `${animDuration}s` }}>
                {[...sorted, ...sorted].map((m, i) => {
                  const color = m.change > 0 ? '#00C853' : m.change < 0 ? '#FF1744' : '#707070'
                  return (
                    <span key={`${m.isin}-${i}`} className="inline-flex items-center flex-shrink-0" style={{ paddingRight: '28px' }}>
                      <span className="text-xs font-semibold" style={{ color: '#C0C0C0', marginRight: '5px' }}>{m.referentiel?.ticker}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: '#F5F5F5', marginRight: '4px' }}>
                        {m.last.toLocaleString('fr-TN', { minimumFractionDigits: m.last > 100 ? 2 : 3, maximumFractionDigits: m.last > 100 ? 2 : 3 })}
                      </span>
                      <span className="text-xs flex items-center font-medium" style={{ color }}>
                        {m.change > 0 ? <TrendingUp size={10} /> : m.change < 0 ? <TrendingDown size={10} /> : null}
                        <span style={{ marginLeft: '2px' }}>{m.change > 0 ? '+' : ''}{m.change.toFixed(2)}%</span>
                      </span>
                      <span style={{ color: '#333', marginLeft: '8px' }}>·</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right actions ── */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Cloche */}
          <div className="relative">
            <button onClick={handleBellOpen}
              className={`relative p-2 rounded-lg transition-colors ${totalAlerts > 0 ? 'bell-ring' : ''}`}
              style={{ color: totalAlerts > 0 ? '#D4AF37' : '#707070' }}>
              <Bell size={16} />
              {totalAlerts === 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: '#D4AF37' }} />
              )}
              {countLow > 0 && (
                <span className={popLow ? 'badge-pop' : ''}
                  style={{ position: 'absolute', bottom: '0px', left: '0px', background: '#FF3B3B', color: '#fff', fontSize: '9px', fontWeight: 700, minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid var(--noir-surface)', boxShadow: '0 0 8px rgba(255,59,59,0.7)', lineHeight: 1, fontFamily: 'monospace' }}>
                  {countLow}
                </span>
              )}
              {countHigh > 0 && (
                <span className={popHigh ? 'badge-pop' : ''}
                  style={{ position: 'absolute', bottom: '0px', right: '0px', background: '#00C853', color: '#fff', fontSize: '9px', fontWeight: 700, minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid var(--noir-surface)', boxShadow: '0 0 8px rgba(0,200,83,0.7)', lineHeight: 1, fontFamily: 'monospace' }}>
                  {countHigh}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && <NotifPanel logs={logs} onClose={() => setNotifOpen(false)} />}
            </AnimatePresence>
          </div>

          {/* Menu utilisateur */}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
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
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-44 rounded-xl border z-50 py-1"
                  style={{ background: 'var(--noir-elevated)', borderColor: 'var(--noir-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--noir-border)' }}>
                    <div className="text-xs font-medium truncate" style={{ color: '#F5F5F5' }}>{profile.full_name}</div>
                    <div className="text-[11px] truncate" style={{ color: '#5C5C5C' }}>{profile.email}</div>
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
    </>
  )
}
