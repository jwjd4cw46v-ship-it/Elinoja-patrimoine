import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client' // Ajustez le chemin selon votre structure

export interface AppNotification {
  id: string
  title: string
  body: string
  type: string
  is_read: boolean
  created_at: string
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (data) setNotifications(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return

    // Délai de 500ms pour éviter le conflit avec la Watchlist au démarrage
    const timer = setTimeout(() => {
      load()
      
      const supabase = createClient()
      const channel = supabase
        .channel(`notif-${userId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, () => load())
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [userId, load])

  const markRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const remove = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return {
    notifications,
    unread: notifications.filter(n => !n.is_read).length,
    loading,
    markRead,
    markAllRead,
    remove
  }
}
