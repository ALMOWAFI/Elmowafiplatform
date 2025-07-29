// Service Worker for Elmowafy Family Platform
const CACHE_NAME = 'elmowafy-v1.0.0';
const STATIC_CACHE = 'elmowafy-static-v1.0.0';
const DYNAMIC_CACHE = 'elmowafy-dynamic-v1.0.0';
const API_CACHE = 'elmowafy-api-v1.0.0';

// Files to cache on install
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html', // Fallback page
  // Add critical CSS and JS files here
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/v1/family',
  '/api/v1/memories/timeline',
  '/api/v1/ai/health'
];

// Files that should always be fetched from network
const NETWORK_ONLY = [
  '/api/v1/auth',
  '/api/v1/memories/search',
  '/socket.io'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📦 Caching static files');
        return cache.addAll(STATIC_FILES);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle different types of requests
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleAPIRequest(request));
    } else if (url.pathname.includes('/uploads/') || url.pathname.includes('/static/')) {
      event.respondWith(handleImageRequest(request));
    } else {
      event.respondWith(handlePageRequest(request));
    }
  } else {
    // Handle POST, PUT, DELETE requests
    event.respondWith(handleNetworkFirst(request));
  }
});

// API requests - Network first, cache fallback
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Network-only endpoints
  if (NETWORK_ONLY.some(endpoint => url.pathname.includes(endpoint))) {
    return fetch(request);
  }

  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('🌐 Network failed, trying cache for:', request.url);
    
    // Try cache fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Offline - cached data not available',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Image and asset requests - Cache first, network fallback
async function handleImageRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('🖼️ Failed to load image:', request.url);
    
    // Return placeholder image
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" fill="#999">Offline</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Page requests - Cache first, network fallback
async function handlePageRequest(request) {
  try {
    // Try cache first for static files
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Update cache in background for dynamic content
      if (!request.url.includes('.')) {
        fetch(request).then(response => {
          if (response.ok) {
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, response);
            });
          }
        }).catch(() => {});
      }
      return cachedResponse;
    }

    // Try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('📄 Failed to load page:', request.url);
    
    // Return offline page
    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Network-first strategy for mutations
async function handleNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network request failed:', request.url);
    
    // For POST/PUT/DELETE requests, we can't provide meaningful fallbacks
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'You are offline. Changes will be synced when connection is restored.',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'memory-upload') {
    event.waitUntil(syncPendingUploads());
  } else if (event.tag === 'memory-like') {
    event.waitUntil(syncPendingLikes());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  const options = {
    body: 'New family memory added!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'family-update',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Memory',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.data = data;
  }

  event.waitUntil(
    self.registration.showNotification('Elmowafy Family', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/memories')
    );
  }
});

// Sync pending uploads when back online
async function syncPendingUploads() {
  try {
    // Get pending uploads from IndexedDB (implement as needed)
    console.log('🔄 Syncing pending uploads...');
    
    // This would typically:
    // 1. Get pending uploads from IndexedDB
    // 2. Upload them to the server
    // 3. Remove from pending list
    // 4. Show success notification
    
  } catch (error) {
    console.error('❌ Failed to sync uploads:', error);
  }
}

// Sync pending likes when back online
async function syncPendingLikes() {
  try {
    console.log('🔄 Syncing pending likes...');
    
    // Similar to uploads - sync any offline actions
    
  } catch (error) {
    console.error('❌ Failed to sync likes:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync tasks
      Promise.all([
        syncPendingUploads(),
        syncPendingLikes()
      ])
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('💌 Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});