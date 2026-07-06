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
  
  const load = useCallback(async () => {
    if (!userId) return
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
      }, () => load())
      .subscribe()

    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [userId, load])

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

  async function markAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnread(0)
    } catch {}
  }

  async function remove(id: string) {
    const wasUnread = notifications.find(n => n.id === id)?.is_read === false
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (wasUnread) setUnread(u => Math.max(0, u - 1))
    } catch {}
  }

  return { notifications, unread, loading, refresh: load, markRead, markAllRead, remove }
}
