// SANI Service Worker v8.1
const CACHE = 'sani-v8.1';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Пропускаем Supabase — всегда онлайн
  if (url.hostname.includes('supabase')) return;
  // Для навигации — network-first, fallback to cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return r;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./')))
    );
    return;
  }
  // Остальное — cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok && e.request.method === 'GET') {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      }
      return resp;
    }).catch(() => caches.match('./')))
  );
});

// Push-уведомления (на будущее)
self.addEventListener('push', e => {
  let data = {title: 'SANI', body: 'Уведомление'};
  try { if (e.data) data = e.data.json(); } catch(_) {}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icon.png', badge: '/icon.png', tag: 'sani'
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});