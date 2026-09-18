const CACHE_NAME = 'verdis-m1-v1'

self.addEventListener('install', (event) => {
  const scope = self.registration.scope
  const staticAssets = [
    scope,
    `${scope}index.html`,
    `${scope}manifest.webmanifest`,
    `${scope}icon.svg`,
    `${scope}icon-192.png`,
    `${scope}icon-512.png`,
  ]
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(staticAssets))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // SPA navigation fallback: try network, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        const scope = self.registration.scope
        return caches.match(`${scope}index.html`).then((cached) => cached || caches.match(scope))
      }),
    )
    return
  }

  // Static assets: cache first, fallback to network and update cache
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse
        }
        const responseToCache = networkResponse.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache)
        })
        return networkResponse
      })
    }),
  )
})
