'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

interface Props {
  userId:  string
  open:    boolean
  onClose: () => void
}

export default function NotificationCenter({ userId, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const { notifications, loading } = useNotifications(userId)

  // Si on n'est pas monté ou pas ouvert, on n'affiche absolument rien
  if (!mounted || !open) return null

  return (
    <div style={{
      position: 'fixed', top: 60, right: 12, width: 300,
      background: '#111', border: '1px solid #333', borderRadius: 8,
      zIndex: 9999, padding: 16, color: '#fff'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span>Notifications</span>
        <button onClick={onClose}><X size={16} /></button>
      </div>
      
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div>Aucune notification</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid #222' }}>
                <div style={{ fontWeight: 'bold' }}>{n.title}</div>
                <div style={{ fontSize: 12 }}>{n.body}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
