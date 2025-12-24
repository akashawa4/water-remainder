// Service Worker for Water Reminder Push Notifications
// Handles push notifications that work even when browser is minimized

const CACHE_NAME = 'water-reminder-v3';

// Install event
self.addEventListener('install', function (event) {
    console.log('[SW] Service Worker installing...');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function (event) {
    console.log('[SW] Service Worker activated');
    event.waitUntil(self.clients.claim());
});

// Handle push notifications from server
self.addEventListener('push', function (event) {
    console.log('[SW] Push notification received');

    let data = {
        title: '💧 Time to Drink Water!',
        body: 'Stay hydrated! Take a moment to drink some water.',
        icon: '/water-drop.png',
        badge: '/water-drop.png',
        tag: 'water-reminder'
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/water-drop.png',
        badge: data.badge || '/water-drop.png',
        tag: data.tag || 'water-reminder-' + Date.now(),
        requireInteraction: false,
        vibrate: [200, 100, 200, 100, 200], // Vibration pattern for mobile
        data: data.data || {},
        actions: [
            { action: 'drink', title: '💧 Log Water' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
            .then(() => {
                console.log('[SW] Notification shown successfully');
                // Try to play sound via clients
                return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            })
            .then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND' });
                });
            })
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', function (event) {
    console.log('[SW] Notification clicked, action:', event.action);
    event.notification.close();

    const navigateTo = event.action === 'drink' || !event.action
        ? '/#logwater'
        : '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                // Focus existing window if available
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if ('focus' in client) {
                        client.focus();
                        client.postMessage({
                            type: 'NAVIGATE_TO',
                            path: navigateTo,
                            playSound: true
                        });
                        return;
                    }
                }
                // Open new window if no existing window
                if (self.clients.openWindow) {
                    return self.clients.openWindow(navigateTo);
                }
            })
    );
});

// Handle notification close
self.addEventListener('notificationclose', function (event) {
    console.log('[SW] Notification closed');
});

// Handle messages from the main app
self.addEventListener('message', function (event) {
    console.log('[SW] Received message:', event.data.type);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Background sync for reliability (if supported)
self.addEventListener('sync', function (event) {
    if (event.tag === 'water-reminder-sync') {
        console.log('[SW] Background sync triggered');
    }
});
