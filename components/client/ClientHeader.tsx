'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, LogOut, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'
import { NotifPanel, type NotifItem } from '@/components/watchlist/NotifPanel'

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

// NotifItem est maintenant défini dans NotifPanel.tsx et importé ci-dessus.

const PRIORITY = ['TUNINDEX', 'TUNINDEX20', 'AB', 'SFBT', 'BNA', 'ATB', 'BIAT', 'BT', 'PGH', 'STB']

export default function ClientHeader({ profile }: { profile: Profile }) {
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [markets,    setMarkets]    = useState<Market[]>([])
  const [loading,    setLoading]    = useState(true)
  const [countLow,   setCountLow]   = useState(0)
  const [countHigh,  setCountHigh]  = useState(0)
  const [logs,       setLogs]       = useState<NotifItem[]>([])
  const [popLow,     setPopLow]     = useState(false)
  const [popHigh,    setPopHigh]    = useState(false)

  const router   = useRouter()
  const supabase = createClient()

  // ── Fetch cotations pour le bandeau ticker uniquement ────────────────────
  // NOTE : la détection des franchissements de seuils watchlist est
  // désormais faite côté serveur par `/api/cron/check-alerts` (appelé par
  // cron-job.org), qui écrit dans `notifications` et envoie les push.
  // Ce composant ne fait plus que lire `notifications` pour la cloche.
  async function fetchMarkets() {
    try {
      const res  = await fetch('/api/cotations', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (!data.markets?.length) return
      setMarkets(data.markets)
      setLoading(false)
    } catch {
      // silencieux
    }
  }

  // ── Fetch + realtime sur la table notifications (source de vérité) ──────
  async function fetchNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('id, type, ticker, title, body, is_read, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!data) return
    setLogs(
      data.map(n => ({
        id:      n.id,
        type:    n.type?.includes('LOW') || n.type === 'STOP_LOSS' ? 'low' : 'high',
        current: 0,
        low:     0,
        high:    0,
        time:    new Date(n.created_at).toLocaleTimeString('fr-FR', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
        // champs additionnels pour NotifPanel
        title:   n.title,
        body:    n.body,
        ticker:  n.ticker,
        isRead:  n.is_read,
      })) as any
    )
    const unread = data.filter(n => !n.is_read)
    setCountLow(unread.filter(n => n.type?.includes('LOW') || n.type === 'STOP_LOSS').length)
    setCountHigh(unread.filter(n => !(n.type?.includes('LOW') || n.type === 'STOP_LOSS')).length)
  }

  useEffect(() => {
    fetchMarkets()
    fetchNotifications()
    const interval = setInterval(fetchMarkets, 60 * 1000)

    const channel = supabase
      .channel('notifs-header')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => {
          fetchNotifications()
          setPopLow(true); setTimeout(() => setPopLow(false), 420)
        }
      )
      .subscribe()

    return () => { clearInterval(interval); supabase.removeChannel(channel) }
  }, [])

  // Marque les notifications comme lues à l'ouverture du panneau
  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
  }

  function handleBellOpen() {
    setNotifOpen(o => !o)
    if (!notifOpen) {
      markAllRead()
      setCountLow(0)
      setCountHigh(0)
    }
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
  const animDuration = Math.max(30, sorted.length * 2.4)  // ~48s pour 20 items
  const totalAlerts  = countLow + countHigh

  return (
    <>
<header
        className="flex items-center justify-between h-14 flex-shrink-0 border-b client-header"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>


        {/* ── Ticker Band ─────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-hidden ticker-outer">
          <span
            className="text-[10px] font-bold tracking-wider flex-shrink-0 hidden"
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
            <div
              className="ticker-track"
              style={{ animationDuration: `${animDuration}s`, gap: '20px', width: 'max-content' }}>
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
          )}
        </div>

        {/* ── Right actions ────────────────────────────── */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-1">

          {/* ── Cloche avec badges ── */}
          <div className="relative">
            <button
              onClick={handleBellOpen}
              className={`relative p-2 rounded-lg transition-colors ${totalAlerts > 0 ? 'bell-ring' : ''}`}
              style={{ color: totalAlerts > 0 ? '#D4AF37' : '#707070' }}>
              <Bell size={16} />

              {totalAlerts === 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: '#D4AF37' }} />
              )}

              {countLow > 0 && (
                <span
                  className={popLow ? 'badge-pop' : ''}
                  style={{
                    position:   'absolute',
                    bottom:     '0px',
                    left:       '0px',
                    background: '#FF3B3B',
                    color:      '#fff',
                    fontSize:   '9px',
                    fontWeight: 700,
                    minWidth:   '16px',
                    height:     '16px',
                    borderRadius: '8px',
                    display:    'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding:    '0 3px',
                    border:     '1.5px solid var(--noir-surface)',
                    boxShadow:  '0 0 8px rgba(255,59,59,0.7)',
                    lineHeight: 1,
                    fontFamily: 'monospace',
                  }}>
                  {countLow}
                </span>
              )}

              {countHigh > 0 && (
                <span
                  className={popHigh ? 'badge-pop' : ''}
                  style={{
                    position:   'absolute',
                    bottom:     '0px',
                    right:      '0px',
                    background: '#00C853',
                    color:      '#fff',
                    fontSize:   '9px',
                    fontWeight: 700,
                    minWidth:   '16px',
                    height:     '16px',
                    borderRadius: '8px',
                    display:    'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding:    '0 3px',
                    border:     '1.5px solid var(--noir-surface)',
                    boxShadow:  '0 0 8px rgba(0,200,83,0.7)',
                    lineHeight: 1,
                    fontFamily: 'monospace',
                  }}>
                  {countHigh}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <NotifPanel
                  logs={logs}
                  onClose={() => setNotifOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>

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
