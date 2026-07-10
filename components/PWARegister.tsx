'use client'

import { useEffect } from 'react'
import { Bell, BellRing, BellOff } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

/**
 * Enregistre le service worker au montage ET affiche un bouton pour
 * activer les notifications push.
 *
 * AVANT : ce composant ne faisait qu'enregistrer le service worker
 * silencieusement (navigator.serviceWorker.register) et ne rendait rien
 * (return null) — aucun bouton, aucun appel à Notification.requestPermission()
 * ni à pushManager.subscribe(). Résultat : push_subscriptions restait vide
 * indéfiniment, quel que soit l'état du hook usePushNotifications, puisque
 * rien dans l'app n'appelait jamais subscribe().
 *
 * À placer dans app/client/layout.tsx ou dans le dashboard :
 *   import PWARegister from '@/components/PWARegister'
 *   <PWARegister />
 */
export default function PWARegister() {
  const { supported, permission, subscribed, error, subscribe } = usePushNotifications()

  // Enregistrement du service worker au montage (toujours utile, même
  // avant que l'utilisateur choisisse d'activer les notifications —
  // ça prépare le terrain pour le cache offline etc.)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(err => console.warn('SW registration failed:', err))
    }
  }, [])

  if (!supported) return null

  // Déjà abonné ou permission déjà accordée dans CE hook (donc dans cette
  // session) : rien à afficher. Note : si l'utilisateur avait accepté la
  // permission AVANT ce fix, `permission` sera 'granted' mais aucun
  // abonnement n'existera en base — on affiche donc quand même le bouton
  // tant que `subscribed` (état local, pas fiable après un refresh) n'est
  // pas vrai, pour permettre de relancer subscribe() au moins une fois.
  if (subscribed) {
    return (
      <div className="flex items-center gap-1.5 text-xs" style={{ color: '#00C853' }}>
        <BellRing size={13} /> Notifications activées
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-1.5 text-xs" style={{ color: '#5C5C5C' }}>
        <BellOff size={13} />
        Notifications bloquées — activez-les dans les réglages de votre navigateur/appareil.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={subscribe}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg w-fit"
        style={{
          background: 'rgba(212,175,55,0.12)',
          color: '#D4AF37',
          border: '1px solid rgba(212,175,55,0.3)',
        }}>
        <Bell size={13} /> Activer les notifications
      </button>
      {error && (
        <span className="text-[11px]" style={{ color: '#FF1744' }}>{error}</span>
      )}
    </div>
  )
}
