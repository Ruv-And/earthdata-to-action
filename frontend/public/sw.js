const CACHE_NAME = 'air-quality-v1';
const urlsToCache = [
  '/',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      }
    )
  );
});

self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Air Quality Alert',
        body: event.data.text() || 'You have a new air quality notification'
      };
    }
  }
  
  const options = {
    body: data.body || 'Air quality alert for your location',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: 'air-quality-alert',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/favicon.ico'
      }
    ],
    data: {
      url: data.data?.url || '/',
      subscriptionId: data.data?.subscriptionId,
      airQuality: data.data?.airQuality,
      timestamp: data.data?.timestamp
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Air Quality Alert',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(event.notification.data?.url || '/');
          }
        })
    );
  } else if (event.action === 'dismiss') {
    console.log('Notification dismissed');
  }
});

self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      console.log('Performing background sync...')
    );
  }
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'BH59VKs_7b9cPLbNQ8kpIM7DNklbxH8t1810dz4qk5XUEDALam9bGUYzAtQ0Kfz_qSMAHdalKhAzBbt7W4nSLaY'
      )
    }).then((subscription) => {
      console.log('New subscription:', subscription);
      return fetch('/api/update-push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription
        })
      });
    })
  );
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
