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

  // Renommé (était "fetch") : évite de masquer la fonction globale
  // window.fetch dans toute cette fonction, source de confusion inutile.
  const load = useCallback(async () => {
    try {
      const res = await window.fetch('/api/notifications')
      if (!res.ok) {
        // Ex : 401 (session pas encore prête) ou 500 (table absente si le
        // SQL n'a pas encore été exécuté) — on n'essaie pas de parser un
        // corps qui n'a pas la forme attendue.
        setNotifications([])
        setUnread(0)
        setLoading(false)
        return
      }
      const json = await res.json()
      setNotifications(Array.isArray(json?.notifications) ? json.notifications : [])
      setUnread(typeof json?.unread === 'number' ? json.unread : 0)
    } catch {
      // Erreur réseau / JSON invalide — ne jamais laisser l'état à undefined.
      setNotifications([])
      setUnread(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    load()

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
      }, () => load())
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function markRead(id: string) {
    try {
      await window.fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch { /* silencieux — l'état local est déjà mis à jour ci-dessous */ }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(u => Math.max(0, u - 1))
  }

  async function markAllRead() {
    try {
      await window.fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    } catch { /* silencieux */ }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  async function remove(id: string) {
    const wasUnread = notifications.find(n => n.id === id)?.is_read === false
    try {
      await window.fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch { /* silencieux */ }
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (wasUnread) setUnread(u => Math.max(0, u - 1))
  }

  return { notifications, unread, loading, refresh: load, markRead, markAllRead, remove }
}
