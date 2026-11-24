/* 为官一任 Service Worker：缓存优先 + 版本更新 */
const CACHE = 'wyrm-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon/icon-192.png',
  './assets/icon/icon-512.png'
];
/* 安装：预缓存全部静态资源 */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});
/* 激活：清掉旧版本缓存 */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
/* 请求：导航/HTML 走网络优先（保证游戏更新及时），其余缓存优先 */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const isNav = e.request.mode === 'navigate' || /\.(html|webmanifest)$/i.test(url.pathname);
  if (isNav) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then(h => h || caches.match('./index.html'))
      )
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit ||
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, clone(res)));
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
function clone(r) { return r.clone(); }
