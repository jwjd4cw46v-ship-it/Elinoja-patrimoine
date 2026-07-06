'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AppNotification {
  id:         string
  type:       string
  ticker:     string | null
  title:      string
  body:       string
  is_read:    boolean
  created_at: string
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread,        setUnread]        = useState(0)
  const [loading,       setLoading]       = useState(true)
  
  // Remplacement de window.fetch par fetch (native)
  const load = useCallback(async () => {
    if (!userId) return; // Sécurité ajoutée
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error('Failed to fetch')
      
      const json = await res.json()
      setNotifications(Array.isArray(json?.notifications) ? json.notifications : [])
      setUnread(typeof json?.unread === 'number' ? json.unread : 0)
    } catch (e) {
      console.error("Notification load error:", e)
      setNotifications([])
      setUnread(0)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    load()

    const supabase = createClient()
    const channel = supabase
      .channel(`notif-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => load()) // Simplification : on recharge tout pour éviter les décalages d'état
      .subscribe()

    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [userId, load])

  // Fonctions markRead, markAllRead, remove : utilisez 'fetch' au lieu de 'window.fetch'
  async function markRead(id: string) {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnread(u => Math.max(0, u - 1))
    } catch {}
  }

  // ... (Appliquez le même changement 'fetch' pour markAllRead et remove)

  return { notifications, unread, loading, refresh: load, markRead }
}
