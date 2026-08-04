// Tantan Life Board - Service Worker
// 采用智能缓存策略：自动检测更新并提示用户刷新

const CACHE_NAME = 'tantan-workbench-v34';
const ASSETS = [
  './tantan-workbench.html',
  './tantan-manifest.webmanifest',
  './tantan-icon.svg'
];

// 安装时缓存核心资源，并立即跳过等待激活
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活时清理旧缓存并接管所有客户端
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 拦截 fetch 请求
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 对 HTML 主文件使用 network-first（始终获取最新，带缓存破坏参数时强制网络获取）
  if (url.pathname.endsWith('tantan-workbench.html') || url.pathname.endsWith('index.html')) {
    // 如果 URL 带有版本时间戳参数，说明用户点了"立即刷新"，直接走网络
    const hasCacheBuster = url.searchParams.has('v') || url.searchParams.has('t');
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 其他资源：stale-while-revalidate（先返回缓存，同时后台更新）
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(response => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// 监听客户端消息（用于版本检测）
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_SW_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_NAME });
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
