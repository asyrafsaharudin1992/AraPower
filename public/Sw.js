// AraPower Service Worker — Web Push Notifications
// Place this file at: /public/sw.js

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ── Handle incoming push ──────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'AraPower', body: event.data.text(), icon: '/icon-192.png' };
  }

  const options = {
    body:    payload.body || '',
    icon:    payload.icon || '/icon-192.png',
    badge:   '/badge-72.png',
    tag:     payload.tag  || 'arapower-notif',
    renotify: true,
    data:    payload.data || {},
    actions: payload.actions || [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'AraPower', options)
  );
});

// ── Handle notification click ─────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Focus existing tab if open
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      // Otherwise open new tab
      return self.clients.openWindow(url);
    })
  );
});