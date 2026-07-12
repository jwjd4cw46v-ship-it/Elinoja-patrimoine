'use client'

import { useEffect, useState } from 'react'

export function usePushNotifications() {
  const [supported,   setSupported]   = useState(false)
  const [permission,  setPermission]  = useState<NotificationPermission>('default')
  const [subscribed,  setSubscribed]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(ok)
    if (!ok) return
    setPermission(Notification.permission)

    // Sans ce check, `subscribed` repartait à `false` à chaque montage du
    // composant (reconnexion, rechargement de page), même si l'abonnement
    // était toujours actif côté navigateur ET en base — le bouton
    // réapparaissait alors qu'il n'y avait rien à refaire.
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!reg) return
        const sub = await reg.pushManager.getSubscription()
        if (sub) setSubscribed(true)
      } catch {
        // silencieux — au pire l'utilisateur reverra le bouton et pourra recliquer
      }
    })()
  }, [])

  async function subscribe() {
    if (!supported) return false
    setError(null)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setError('Permission refusée par le navigateur.')
        return false
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
      if (!vapidKey) {
        setError('Clé VAPID publique manquante (NEXT_PUBLIC_VAPID_PUBLIC_KEY).')
        return false
      }
      if (!/^[A-Za-z0-9\-_]+=*$/.test(vapidKey)) {
        setError('Clé VAPID publique mal formée (caractères invalides) — vérifiez qu\'elle a été copiée sans espace ni retour à la ligne.')
        return false
      }

      // IMPORTANT : on enregistre nous-mêmes le service worker ici, sans
      // supposer qu'un autre fichier l'a déjà fait ailleurs dans l'app.
      // Sans registration active, `navigator.serviceWorker.ready` reste
      // bloqué indéfiniment (la Promise ne se résout jamais) — c'était le
      // bug : la permission était acceptée, mais subscribe() restait
      // suspendu silencieusement juste après, sans jamais atteindre le
      // fetch vers /api/push/subscribe.
      await navigator.serviceWorker.register('/sw.js')
      const reg = await navigator.serviceWorker.ready

      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      const keys = sub.toJSON().keys
      if (!keys?.p256dh || !keys?.auth) {
        setError("Abonnement push incomplet (clés manquantes).")
        return false
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          userAgent: navigator.userAgent,
        }),
      })

      if (!res.ok) {
        setError(`Échec de l'enregistrement côté serveur (${res.status}).`)
        return false
      }

      setSubscribed(true)
      return true
    } catch (err) {
      console.error('usePushNotifications.subscribe error:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue lors de l\'abonnement.')
      return false
    }
  }

  async function unsubscribe() {
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) { setSubscribed(false); return }

      const res = await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      if (!res.ok) {
        setError(`Échec de la désinscription côté serveur (${res.status}).`)
        return
      }

      await sub.unsubscribe()
      setSubscribed(false)
    } catch (err) {
      console.error('usePushNotifications.unsubscribe error:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue lors de la désinscription.')
    }
  }

  return { supported, permission, subscribed, error, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const trimmed = base64String.trim()
  const padding = '='.repeat((4 - trimmed.length % 4) % 4)
  const base64 = (trimmed + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
