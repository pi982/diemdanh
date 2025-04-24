const CACHE_NAME = 'attendance-app-v1';
const urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/service-worker.js',
  // Liệt kê các tài nguyên khác bạn muốn cache (CSS, JS, hình ảnh,…)
  '/icons/app-icon-192.png',
  '/icons/app-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache đã được mở');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Nếu có tài nguyên trong cache thì trả về, còn không thì fetch từ network
        return response || fetch(event.request);
      })
  );
});

// Xử lý cleanup cache cũ (nếu có)
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(keyList.map((key) => {
        if (!cacheWhitelist.includes(key)) {
          return caches.delete(key);
        }
      }))
    )
  );
});
