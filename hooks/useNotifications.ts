'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ... (votre interface AppNotification reste inchangée)

export function useNotifications(userId?: string) { // userId rendu optionnel
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread,        setUnread]        = useState(0)
  const [loading,       setLoading]       = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    if (!userId) return // Protection contre les appels API sans ID
    try {
      const res = await window.fetch('/api/notifications')
      if (!res.ok) throw new Error('Failed to fetch')
      const { notifications: data, unread: u } = await res.json()
      setNotifications(data || [])
      setUnread(u || 0)
    } catch (e) {
      console.error("Erreur chargement notifs:", e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    // Sécurité : Ne rien faire si l'ID utilisateur n'est pas encore défini
    if (!userId) {
      setLoading(false)
      return 
    }
    
    fetch()

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
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => fetch()) // Simplifié pour les UPDATE/DELETE pour éviter les redondances
      .subscribe()

    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [userId, fetch, supabase]) // Ajout des dépendances manquantes

  // ... (fonctions markRead, markAllRead, remove restent inchangées)
  return { notifications, unread, loading, refresh: fetch, markRead, markAllRead, remove }
}
