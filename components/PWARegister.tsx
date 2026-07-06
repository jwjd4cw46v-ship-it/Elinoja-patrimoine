'use client'

import { useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PWARegister() {
  const { supported, permission, subscribe } = usePushNotifications()

  // 1. Enregistrement automatique du Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(err => console.warn('SW registration failed:', err))
    }
  }, [])

  // 2. Si le navigateur ne supporte pas les notifications ou si elles sont déjà activées, on n'affiche rien
  if (!supported || permission === 'granted') return null

  // 3. Bouton affiché uniquement si la permission n'est pas encore accordée
  return (
    <button 
      onClick={subscribe}
      style={{
        background: 'transparent',
        border: '1px solid #D4AF37',
        color: '#D4AF37',
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 11,
        cursor: 'pointer',
        marginTop: 12,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      🔔 Activer les alertes
    </button>
  )
}
