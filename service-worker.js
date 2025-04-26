const CACHE_NAME = 'attendance-cache-v5';
const urlsToCache = [
  '/diemdanh/',
  '/diemdanh/index.html',
  '/diemdanh/styles.css',
  '/diemdanh/main.js',
  '/diemdanh/manifest.json'
];

self.addEventListener('install', event => {
  console.log('Service Worker đang được cài đặt...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Mở cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
});

// Xử lý riêng cho các request:
// - Request method khác GET (ví dụ POST) sẽ được chuyển thẳng ra mạng
// - Request điều hướng (navigate) được ưu tiên mạng rồi fallback về cache nếu không có mạng
// - Các GET request thông thường dùng chiến lược cache-first
self.addEventListener('fetch', event => {
  const request = event.request;

  // Với các request không phải GET (ví dụ như POST dùng để đăng nhập hay gửi dữ liệu),
  // chúng ta chuyển thẳng ra mạng để không can thiệp bởi cache.
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Nếu là request điều hướng (trang HTML) thì dùng chiến lược network-first,
  // nếu không có mạng thì fallback về cached index.html.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/diemdanh/index.html'))
    );
    return;
  }

  // Các GET request thông thường: trả về cache nếu có, nếu không thì network.
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (!cacheWhitelist.includes(key)) {
            console.log('Xoá cache cũ:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Hàm thực hiện việc lấy và gửi dữ liệu offline từ IndexedDB
function syncOfflineData() {
  // Lưu ý: Vì Service Worker có context riêng, bạn cần đảm bảo rằng
  // các hàm truy cập IndexedDB được viết sao cho có thể sử dụng ở đây.
  return new Promise((resolve, reject) => {
    openAttendanceDB().then(db => {
      const transaction = db.transaction("offlineAttendance", "readonly");
      const store = transaction.objectStore("offlineAttendance");
      const req = store.getAll();

      req.onsuccess = () => {
        const records = req.result;
        if (records.length === 0) {
          console.log("Không có bản ghi offline cần đồng bộ");
          return resolve();
        }

        // Gộp các bản ghi single và batch thành mảng dữ liệu chung
        let combinedRecords = [];
        records.forEach(record => {
          if (record.recordType === "single") {
            combinedRecords.push({
              id: record.id,
              type: record.type,
              holy: record.holy,
              name: record.name
            });
          } else if (record.recordType === "batch") {
            combinedRecords = combinedRecords.concat(record.records);
          }
        });

        if (combinedRecords.length === 0) {
          console.log("Không có bản ghi nào để gửi.");
          return resolve();
        }

        // Gửi payload chung dạng JSON đến server
        fetch("YOUR_SERVER_URL", {  // Thay YOUR_SERVER_URL bằng URL của bạn (có thể dùng biến webAppUrl nếu đăng ký trong SW)
          method: "POST",
          mode: "no-cors",  // Nếu server không cần phản hồi chi tiết
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: combinedRecords })
        })
          .then(() => {
            console.log("Gửi thành công tất cả bản ghi offline");
            // Sau khi gửi thành công, xóa các bản ghi offline khỏi IndexedDB
            clearOfflineAttendanceStore().then(resolve).catch(reject);
          })
          .catch(err => {
            console.error("Lỗi khi đồng bộ các bản ghi offline:", err);
            reject(err);
          });
      };

      req.onerror = () => {
        console.error("Lỗi truy xuất bản ghi offline từ IndexedDB");
        reject();
      };
    }).catch(reject);
  });
}
