'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const TYPE_ICONS: Record<string, string> = {
  STOP_LOSS:      '🛑',
  TAKE_PROFIT_R1: '🎯',
  TAKE_PROFIT_R2: '🎯',
  TAKE_PROFIT_R3: '🏆',
  BREAK_EVEN:     '⚖️',
  RUNNER_STOP:    '🏃',
  EXPOSURE:       '⚠️',
  SYSTEM:         'ℹ️',
}

interface Props {
  userId:  string
  open:    boolean
  onClose: () => void
}

export default function NotificationCenter({ userId, open, onClose }: Props) {
  const [shouldRender, setShouldRender] = useState(false)
  const { notifications, unread, loading, markRead, markAllRead, remove } = useNotifications(userId)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setShouldRender(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    if (open && shouldRender) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, shouldRender, onClose])

  if (!shouldRender || !open) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        style={{
          position:    'fixed',
          top:         60,
          right:       12,
          width:       340,
          maxWidth:    'calc(100vw - 24px)',
          maxHeight:   '80dvh',
          background:  '#111',
          border:      '1px solid #222',
          borderRadius: 16,
          boxShadow:   '0 16px 48px rgba(0,0,0,0.7)',
          zIndex:      200,
          display:     'flex',
          flexDirection: 'column',
          overflow:    'hidden',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #1E1E1E', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={15} style={{ color: '#D4AF37' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F5F5F5' }}>Notifications</span>
            {unread > 0 && <span style={{ background: '#D4AF37', color: '#000', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{unread}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5C5C5C', display: 'flex', padding: 4 }}>
                <CheckCheck size={15} />
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5C5C5C', display: 'flex', padding: 4 }}>
              <X size={15} />
            </button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#3A3A3A', fontSize: 13 }}>Chargement…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Bell size={32} style={{ color: '#222', margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 13, color: '#3A3A3A' }}>Aucune notification</div>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} onClick={() => { if (!n.is_read) markRead(n.id) }} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid #161616', background: n.is_read ? 'transparent' : 'rgba(212,175,55,0.04)', cursor: n.is_read ? 'default' : 'pointer' }}>
                <div style={{ fontSize: 20, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A1A1A', borderRadius: 10 }}>{TYPE_ICONS[n.type] ?? 'ℹ️'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: n.is_read ? '#A0A0A0' : '#F5F5F5' }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: '#5C5C5C' }}>{n.body}</div>
                  <div style={{ fontSize: 10, color: '#3A3A3A' }}>{formatDistanceToNow(new Date(n.created_at), { locale: fr, addSuffix: true })}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); remove(n.id) }} style={{ background: 'none', border: 'none', color: '#2A2A2A' }}><Trash2 size={12} /></button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
