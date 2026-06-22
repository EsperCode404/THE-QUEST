// NEKO-CHRONOS BACKGROUND PUSH SERVICE
const CACHE_NAME = 'neko-chronos-v3-cache';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Listens for explicit alarm trigger messages from app.js
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TRIGGER_ALARM') {
        const { title, body, tag } = event.data;

        self.registration.showNotification(title, {
            body: body,
            tag: tag, // Prevents duplicate notifications from piling up
            icon: 'icon.png', // Fallback placeholder if icon exists
            vibrate: [300, 100, 300, 100, 400], // High-urgency vibration pattern
            requireInteraction: true // Keeps notification on screen until dismissed
        });
    }
});

// Opens your pinned app instantly when you tap the mobile notification banner
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('/');
        })
    );
});