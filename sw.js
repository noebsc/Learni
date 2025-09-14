// sw.js - Service Worker pour Learni
const CACHE_NAME = 'learni-sti2d-v2.0.0';
const urlsToCache = [
  './',
  './index.html',
  './app-ameliore.js',
  './firebase-ameliore.js',
  './styles-ameliore.css',
  './sti2d.json',
  './manifest.json',
  './README.md'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🔄 Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Stratégie de cache : Network First pour les données dynamiques
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers Firebase et APIs externes
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('generativelanguage')) {
    return;
  }

  event.respondWith(
    // Essayer le réseau d'abord
    fetch(event.request)
      .then((response) => {
        // Si le réseau fonctionne, mettre en cache et retourner
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Si le réseau échoue, utiliser le cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // Si pas en cache, retourner une page d'erreur basique
            if (event.request.headers.get('accept').includes('text/html')) {
              return new Response(`
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                  <meta charset="UTF-8">
                  <title>Hors ligne - Learni STI2D</title>
                  <style>
                    body { 
                      font-family: system-ui; 
                      text-align: center; 
                      padding: 50px; 
                      background: #0f172a; 
                      color: #f8fafc; 
                    }
                    .offline-message { 
                      max-width: 400px; 
                      margin: 0 auto; 
                    }
                    .emoji { font-size: 4rem; margin-bottom: 1rem; }
                    h1 { color: #3b82f6; }
                    p { line-height: 1.6; }
                    button { 
                      background: #3b82f6; 
                      color: white; 
                      border: none; 
                      padding: 12px 24px; 
                      border-radius: 8px; 
                      cursor: pointer; 
                      margin-top: 1rem;
                    }
                  </style>
                </head>
                <body>
                  <div class="offline-message">
                    <div class="emoji">📡</div>
                    <h1>Vous êtes hors ligne</h1>
                    <p>Vérifiez votre connexion internet pour accéder à toutes les fonctionnalités de Learni STI2D.</p>
                    <button onclick="window.location.reload()">Réessayer</button>
                  </div>
                </body>
                </html>
              `, {
                headers: { 'Content-Type': 'text/html' }
              });
            }
          });
      })
  );
});

// Messages du service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker Learni STI2D chargé');
