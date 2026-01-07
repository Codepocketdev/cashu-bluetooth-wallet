// Service Worker for Satoshi Pay PWA
const CACHE_VERSION = '2026.01.07.1'
const CACHE_NAME = `satoshi-pay-v${CACHE_VERSION}`
const urlsToCache = [
  '/satoshi-pay-wallet/',
  '/satoshi-pay-wallet/index.html',
  '/satoshi-pay-wallet/icon-192.png',
  '/satoshi-pay-wallet/icon-512.png'
]

// Install event - skip waiting to force update
self.addEventListener('install', (event) => {
  console.log('SW: Installing new version', CACHE_VERSION)
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Force immediate activation
  )
})

// Fetch event - network first for HTML, cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Network-first for HTML to always get latest
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse)
          })
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Cache-first for assets
  event.respondWith(
    caches.match(request)
      .then((response) => response || fetch(request))
  )
})

// Activate event - clean old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('SW: Activating new version', CACHE_VERSION)
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim()) // Take control of all pages immediately
  )
})
