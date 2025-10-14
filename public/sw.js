const CACHE_NAME = 'soullatino-v1';
const RUNTIME_CACHE = 'soullatino-runtime';
const STATIC_CACHE = 'soullatino-static-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json',
  '/robots.txt'
];

const staticAssets = [
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      }),
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(staticAssets))
    ])
  );
  self.skipWaiting();
});

// Fetch event - comprehensive offline-first caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cachea GET y mismo origen. Nunca POST/PUT/DELETE.
  const isGET = request.method === 'GET';
  const sameOrigin = url.origin === location.origin;

  // Skip cross-origin requests except Supabase
  if (!sameOrigin && !url.hostname.includes('supabase')) {
    return;
  }

  // NO cachear métodos que no sean GET
  if (!isGET) {
    return;
  }

  // Network-first for API calls with offline fallback
  if (url.pathname.includes('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Solo cachea respuestas OK
          if (response && response.ok && (response.type === 'basic' || response.type === 'opaque')) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              try {
                cache.put(request, responseClone);
              } catch (_) {
                // Ignora errores de cache
              }
            });
          }
          return response;
        })
        .catch(() => 
          caches.match(request).then((cached) => 
            cached || new Response(JSON.stringify({ error: 'Offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            })
          )
        )
    );
    return;
  }

  // Cache-first for images, fonts, and static files
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200 && (response.type === 'basic' || response.type === 'opaque')) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              try {
                cache.put(request, responseClone);
              } catch (_) {
                // Ignora errores de cache
              }
            });
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Stale-while-revalidate for navigation
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try {
                cache.put(request, responseClone);
              } catch (_) {
                // Ignora errores de cache
              }
            });
          }
          return response;
        }).catch(() => caches.match('/index.html'));
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: cache-first with network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            try {
              cache.put(request, responseToCache);
            } catch (_) {
              // Ignora errores de cache
            }
          });

          return response;
        });
      })
      .catch(() => {
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE, STATIC_CACHE];
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Background Sync - retry failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-feedback') {
    event.waitUntil(syncFeedback());
  }
});

async function syncFeedback() {
  console.log('Background sync triggered');
}

// Periodic Background Sync - update data periodically
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-analytics') {
    event.waitUntil(updateAnalytics());
  }
});

async function updateAnalytics() {
  console.log('Periodic sync: Updating analytics data');
  // Fetch latest analytics data
  try {
    const response = await fetch('/api/analytics/latest');
    if (response.ok) {
      const data = await response.json();
      // Update cache or notify clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'ANALYTICS_UPDATE',
          data: data
        });
      });
    }
  } catch (error) {
    console.error('Failed to update analytics:', error);
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Tienes nuevas notificaciones',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    tag: 'soullatino-notification',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'Ver'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Soullatino Analytics', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard/pending')
    );
  }
});

// Handle shutdown
addEventListener('beforeunload', (ev) => {
  console.log('Service Worker shutdown:', ev.detail?.reason);
});
