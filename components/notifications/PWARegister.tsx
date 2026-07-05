'use client'

import { useEffect } from 'react'

/**
 * Enregistre le service worker au montage.
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
