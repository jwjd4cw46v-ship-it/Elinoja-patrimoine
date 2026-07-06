'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationCenter from './NotificationCenter'

interface Props { 
  userId: string 
}

export default function NotificationBell({ userId }: Props) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // On crée une variable sécurisée pour TypeScript
  // Si mounted est faux, on passe une chaîne vide "" au hook
  const safeUserId = mounted ? userId : ""
  
  // Le hook est maintenant satisfait car il reçoit toujours une string
  const { unread } = useNotifications(safeUserId)

  // Rendu de sécurité : on affiche le bouton neutre tant que ce n'est pas monté
  if (!mounted) {
    return (
      <button style={{ background: 'none', border: 'none', padding: 8, color: '#707070', display: 'flex' }}>
        <Bell size={16} />
      </button>
    )
  }

  const safeUnread = typeof unread === 'number' ? unread : 0

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: 8, color: safeUnread > 0 ? '#D4AF37' : '#707070',
          display: 'flex',
        }}>
        <Bell size={16} />
        {safeUnread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#FF3B3B', color: '#fff',
            fontSize: 8, fontWeight: 700,
            minWidth: 16, height: 16, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            boxShadow: '0 0 6px rgba(255,59,59,0.7)',
            border: '1.5px solid #111',
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            {safeUnread > 9 ? '9+' : safeUnread}
          </span>
        )}
      </button>

      <NotificationCenter userId={userId} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
