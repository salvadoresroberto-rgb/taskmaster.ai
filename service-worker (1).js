// Service Worker para TaskMaster AI - VERSIÓN MEJORADA
const CACHE_NAME = 'taskmaster-ai-v2.1'; // Incrementar esto fuerza actualización
const ASSETS_TO_CACHE = [
    '/task-manager-ai.html',
    '/manifest.json',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando v2.1...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Cacheando archivos de la app');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.error('[Service Worker] Error al cachear:', error);
            })
    );
    
    // Activar inmediatamente sin esperar
    self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activando v2.1...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Eliminando cache antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Tomar control de todas las páginas inmediatamente
    return self.clients.claim();
});

// ESTRATEGIA MEJORADA: Network First con Timeout
self.addEventListener('fetch', (event) => {
    // Ignorar peticiones que no son GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Ignorar peticiones a otros dominios (como APIs)
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.includes('unpkg.com') &&
        !event.request.url.includes('cdn.tailwindcss.com') &&
        !event.request.url.includes('fonts.googleapis.com')) {
        return;
    }

    event.respondWith(
        // Intentar red primero con timeout
        Promise.race([
            fetch(event.request)
                .then((response) => {
                    // Si la respuesta es válida, clonarla y guardarla
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Si falla la red, buscar en cache
                    return caches.match(event.request);
                }),
            // Timeout de 3 segundos
            new Promise((resolve, reject) => {
                setTimeout(() => reject(new Error('timeout')), 3000);
            })
        ])
        .catch(() => {
            // Si todo falla, buscar en cache
            return caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Si tampoco está en cache, retornar página offline
                return caches.match('/task-manager-ai.html');
            });
        })
    );
});

// Manejo de notificaciones push (para futuras integraciones)
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push recibido:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'Nueva actualización disponible',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Ctext x="48" y="70" font-size="60" text-anchor="middle"%3E🤖%3C/text%3E%3C/svg%3E',
        badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Ctext x="48" y="70" font-size="60" text-anchor="middle"%3E✓%3C/text%3E%3C/svg%3E',
        vibrate: [200, 100, 200],
        tag: 'taskmaster-notification',
        requireInteraction: false,
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'Abrir App',
                icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Ctext x="48" y="70" font-size="60" text-anchor="middle"%3E👁️%3C/text%3E%3C/svg%3E'
            },
            {
                action: 'close',
                title: 'Cerrar',
                icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Ctext x="48" y="70" font-size="60" text-anchor="middle"%3E❌%3C/text%3E%3C/svg%3E'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('TaskMaster AI', options)
    );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Click en notificación:', event);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/task-manager-ai.html')
        );
    }
});

// Sincronización en background (para futuras integraciones)
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Sync en background:', event);
    
    if (event.tag === 'sync-tasks') {
        event.waitUntil(
            // Aquí iría la lógica de sincronización con backend
            console.log('Sincronizando tareas...')
        );
    }
});

// Mensaje desde la app principal
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Mensaje recibido:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME
        });
    }
    
    // Forzar actualización
    if (event.data && event.data.type === 'FORCE_UPDATE') {
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('[Service Worker] Eliminando cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('[Service Worker] Cache limpiado, recargando...');
            self.clients.matchAll().then(clients => {
                clients.forEach(client => client.navigate(client.url));
            });
        });
    }
});

// Log de inicio
console.log('[Service Worker] TaskMaster AI Service Worker v2.1 cargado correctamente');
console.log('[Service Worker] Estrategia: Network First con Cache Fallback');
