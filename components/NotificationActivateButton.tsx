'use client'

import { Bell, BellRing, BellOff } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

/**
 * LE bouton visible "Activer les notifications" — à monter une seule fois,
 * à l'endroit précis où on veut qu'il apparaisse (ex: carte de bienvenue du
 * dashboard). Ne PAS le monter aussi dans le layout global — l'enregistrement
 * du service worker (sans UI) reste séparé dans PWARegister.tsx.
 */
export default function NotificationActivateButton() {
  const { supported, permission, subscribed, error, subscribe } = usePushNotifications()

  if (!supported) return null

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
