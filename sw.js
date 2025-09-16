/* ========== sw.js - Service Worker pour Learni CORRIGÉ ========== */

const CACHE_NAME = 'learni-sti2d-v2.1.0';

// 🔧 CORRECTION: Liste des URLs filtrée pour éviter chrome-extension://
const urlsToCache = [
    './',
    './index.html',
    './app-ameliore.js', 
    './firebase-ameliore.js',
    './styles-ameliore.css',
    './sti2d.json',
    './manifest.json',
    './README.md'
].filter(url => {
    // 🔧 CORRECTION: Filtrer les URLs problématiques
    return !url.startsWith('chrome-extension://') && 
           !url.startsWith('moz-extension://') && 
           !url.startsWith('safari-web-extension://');
});

// Installation du service worker
self.addEventListener('install', event => {
    console.log('🔧 SW: Installation en cours...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('✅ SW: Cache ouvert');
                // 🔧 CORRECTION: Filtrer et valider chaque URL avant mise en cache
                const validUrls = urlsToCache.filter(url => {
                    try {
                        new URL(url, self.location);
                        return true;
                    } catch (error) {
                        console.warn('⚠️ SW: URL invalide ignorée:', url);
                        return false;
                    }
                });
                return cache.addAll(validUrls);
            })
            .catch(error => {
                console.error('❌ SW: Erreur installation:', error);
            })
    );
});

// Activation du service worker
self.addEventListener('activate', event => {
    console.log('🔧 SW: Activation en cours...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🧹 SW: Suppression ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 🔧 CORRECTION: Stratégie de cache robuste avec filtrage des requêtes
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = request.url;
    
    // 🔧 CORRECTION: Ignorer les requêtes problématiques
    if (
        // Extensions du navigateur
        url.startsWith('chrome-extension://') ||
        url.startsWith('moz-extension://') ||
        url.startsWith('safari-web-extension://') ||
        // Services externes
        url.includes('firebase') ||
        url.includes('googleapis') ||
        url.includes('groq.com') ||
        url.includes('generativelanguage') ||
        // Méthodes non-GET
        request.method !== 'GET' ||
        // Requêtes avec headers spéciaux
        request.headers.get('cache-control') === 'no-cache'
    ) {
        console.log('⏭️ SW: Requête ignorée:', url);
        return; // Laisser la requête passer normalement
    }
    
    console.log('📡 SW: Traitement requête:', url);
    
    event.respondWith(
        // Essayer le réseau d'abord
        fetch(request)
            .then(response => {
                // Si le réseau fonctionne, mettre en cache et retourner
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            // 🔧 CORRECTION: Vérifier que la requête est cacheable
                            if (request.url.startsWith(self.location.origin)) {
                                try {
                                    cache.put(request, responseClone);
                                    console.log('💾 SW: Mis en cache:', url);
                                } catch (error) {
                                    console.warn('⚠️ SW: Erreur mise en cache:', error);
                                }
                            }
                        });
                }
                return response;
            })
            .catch(() => {
                // Si le réseau échoue, utiliser le cache
                console.log('🔄 SW: Réseau indisponible, utilisation du cache pour:', url);
                return caches.match(request)
                    .then(response => {
                        if (response) {
                            console.log('✅ SW: Trouvé en cache:', url);
                            return response;
                        }
                        
                        // Si pas en cache, retourner une page d'erreur basique
                        if (request.headers.get('accept').includes('text/html')) {
                            console.log('📄 SW: Page hors ligne pour:', url);
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
        .emoji {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            color: #3b82f6;
        }
        p {
            line-height: 1.6;
        }
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
        <div class="emoji">📱</div>
        <h1>Vous êtes hors ligne</h1>
        <p>Vérifiez votre connexion internet pour accéder à toutes les fonctionnalités de Learni STI2D.</p>
        <button onclick="window.location.reload()">Ressayer</button>
    </div>
</body>
</html>
                            `, {
                                headers: {
                                    'Content-Type': 'text/html'
                                }
                            });
                        }
                        
                        // Pour les autres types de fichiers, retourner une erreur
                        console.log('❌ SW: Ressource non disponible:', url);
                        return new Response('Ressource non disponible hors ligne', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Messages du service worker
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Gestion des erreurs globales du SW
self.addEventListener('error', event => {
    console.error('❌ SW: Erreur globale:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('❌ SW: Promise rejetée:', event.reason);
    event.preventDefault();
});

console.log('✅ Service Worker Learni STI2D chargé (version corrigée)');
