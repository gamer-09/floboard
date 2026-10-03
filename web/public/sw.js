/* FloBoard notification worker — no offline cache, so deploys stay fresh. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const href = (event.notification.data && event.notification.data.href) || '#/markets'
  const url = new URL('./', self.registration.scope)
  url.hash = href.replace(/^#/, '')
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => 'focus' in c)
      if (existing) {
        existing.postMessage({ type: 'floboard:nav', href })
        return existing.focus()
      }
      return self.clients.openWindow(url.href)
    }),
  )
})
