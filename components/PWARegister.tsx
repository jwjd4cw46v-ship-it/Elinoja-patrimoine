'use client'

import { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PWARegister() {
  const { supported, permission, subscribe } = usePushNotifications()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    }
  }, [])

  if (!supported || permission === 'granted') return null

  return (
    <button 
      onClick={subscribe}
      className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10"
      style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}
      title="Activer les notifications"
    >
      <Bell size={16} style={{ color: '#D4AF37' }} />
    </button>
  )
}
