'use client'

import { useEffect } from 'react'

/**
 * Enregistre le service worker au montage. Ne rend RIEN visuellement —
 * c'est fait exprès : ce composant est monté une fois pour toute l'app
 * (dans app/client/layout.tsx) et ne doit jamais afficher de bouton, sinon
 * on se retrouve avec un bouton "Activer les notifications" dupliqué sur
 * chaque page en plus de celui du dashboard (NotificationActivateButton).
 *
 * Pour LE bouton visible d'activation, voir NotificationActivateButton.tsx.
 *
 * À placer dans app/client/layout.tsx :
 *   import PWARegister from '@/components/PWARegister'
 *   <PWARegister />
 */
export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(err => console.warn('SW registration failed:', err))
    }
  }, [])
  return null
}
