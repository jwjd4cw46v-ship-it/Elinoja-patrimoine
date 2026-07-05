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
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const res = await window.fetch('/api/notifications')
    const { notifications: data, unread: u } = await res.json()
    setNotifications(data)
    setUnread(u)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!userId) return
    fetch()

    // Realtime — nouvelles notifications
    const channel = supabase
      .channel(`notif-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifications(prev => [payload.new as AppNotification, ...prev])
        setUnread(u => u + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => fetch())
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => fetch())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function markRead(id: string) {
    await window.fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(u => Math.max(0, u - 1))
  }

  async function markAllRead() {
    await window.fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  async function remove(id: string) {
    await window.fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnread(u => {
      const wasUnread = notifications.find(n => n.id === id)?.is_read === false
      return wasUnread ? Math.max(0, u - 1) : u
    })
  }

  return { notifications, unread, loading, refresh: fetch, markRead, markAllRead, remove }
}
