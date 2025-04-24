const CACHE_NAME = 'attendance-cache-v5';
const urlsToCache = [
    '/diemdanh/',
    '/diemdanh/index.html',
    '/diemdanh/styles.css',
    '/diemdanh/main.js',
    '/diemdanh/manifest.json',
    '/diemdanh/images/icon-192.png',
    '/diemdanh/images/icon-512.png'

];

self.addEventListener('install', event => {
    console.log('Service Worker đang được cài đặt...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Mở cache: ', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Nếu tài nguyên đã được cache, trả về nó, nếu không fetch từ mạng
                return response || fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(keyList =>
            Promise.all(keyList.map(key => {
                if (!cacheWhitelist.includes(key)) {
                    console.log('Xoá cache cũ:', key);
                    return caches.delete(key);
                }
            }))
        )
    );
});
