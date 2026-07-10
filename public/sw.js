// Elinoja Patrimoine — Service Worker v2
const CACHE_NAME = 'elinoja-v1'
const STATIC = ['/client', '/manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Push notification handler ──────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return
  let payload
  try { payload = e.data.json() } catch { return }

  const { title, body, ticker, type, notifId, badgeCount } = payload

  const icon  = '/icons/icon-192.png'
  const badge = '/icons/badge-72.png'
  const tag   = `elinoja-${ticker || type}-${notifId}`

  // Badge sur l'icône de l'app (Badging API — iOS 16.4+, Chrome/Edge
  // desktop, etc.). Silencieusement ignoré si non supporté par le
  // navigateur/OS. Le compte vient du serveur (nombre réel de
  // notifications non lues), pas d'un simple incrément local.
  const badgePromise = 'setAppBadge' in self.navigator
    ? self.navigator.setAppBadge(badgeCount || 1).catch(() => {})
    : Promise.resolve()

  // IMPORTANT : showNotification doit TOUJOURS être appelé dans
  // event.waitUntil, sinon iOS considère l'abonnement comme "silencieux"
  // et peut le révoquer après quelques envois.
  e.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag,
        data: { url: '/client/positions', notifId },
        requireInteraction: false,
        silent: false,
      }),
      badgePromise,
    ])
  )
})

// ── Notification click ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/client'

  // On vide le badge à l'ouverture — l'utilisateur va voir ses
  // notifications dans l'app, qui remettra le compte exact à jour si
  // besoin au prochain push (voir ClientHeader.tsx: markAllRead).
  const clearBadgePromise = 'clearAppBadge' in self.navigator
    ? self.navigator.clearAppBadge().catch(() => {})
    : Promise.resolve()

  e.waitUntil(
    Promise.all([
      clearBadgePromise,
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        const found = list.find(c => c.url.includes(self.location.origin))
        if (found) return found.focus().then(c => c.navigate(url))
        return clients.openWindow(url)
      }),
    ])
  )
})
