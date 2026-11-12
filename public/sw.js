/* Glorious Destiny : service worker de l'application (PWA).
 * - Pages : réseau d'abord, la dernière page connue hors connexion.
 * - Fichiers du site (assets/, icônes, polices) : cache d'abord (noms versionnés par Vite).
 * - Données (Supabase, autre domaine) : jamais mises en cache ici, toujours fraîches. */
const VERSION = 'gd-v1'
const PAGES = `${VERSION}-pages`
const FICHIERS = `${VERSION}-fichiers`
const RACINE = new URL('./', self.location).href

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.add(RACINE))
      .catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) =>
        Promise.all(cles.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone()
          caches.open(PAGES).then((c) => c.put(RACINE, copie))
          return rep
        })
        .catch(() => caches.match(RACINE).then((r) => r || Response.error())),
    )
    return
  }

  if (/\/(assets|icones)\//.test(url.pathname) || url.pathname.endsWith('.webmanifest')) {
    e.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((rep) => {
            if (rep.ok) {
              const copie = rep.clone()
              caches.open(FICHIERS).then((c) => c.put(req, copie))
            }
            return rep
          }),
      ),
    )
  }
})
