// Elinoja Patrimoine — Service Worker v1
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

  const { title, body, ticker, type, notifId } = payload

  const icon  = '/icons/icon-192.png'
  const badge = '/icons/badge-72.png'
  const tag   = `elinoja-${ticker || type}-${notifId}`

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url: '/client/positions', notifId },
      requireInteraction: false,
      silent: false,
    })
  )
})

// ── Notification click ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/client'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const found = list.find(c => c.url.includes(self.location.origin))
      if (found) return found.focus().then(c => c.navigate(url))
      return clients.openWindow(url)
    })
  )
})
