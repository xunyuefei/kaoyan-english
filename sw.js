// ==============================================================================
// 📕 考研英语红宝书 · 全景深度特训讲义站 · PWA Service Worker (sw.js)
// 核心原则：Network-First (网络优先) + App Shell 预缓存 + 动态上限防膨胀
// ==============================================================================

const CACHE_VERSION = 'kaoyan-english-pwa-v1.1';
const OFFLINE_URL = './offline.html';

// 基础外壳资产（轻量级、核心必需）
const PRECACHE_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
  './icon-192.png',
  './icon-512.png',
  OFFLINE_URL
];

// 1. 安装阶段：弹性容错预缓存 App Shell（保障安卓 Edge/Chrome 100% 安装成功）
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async cache => {
      // 使用 Promise.allSettled 逐项缓存，绝不因单项偶发波动而导致整套 SW 安装夭折
      await Promise.allSettled(
        PRECACHE_SHELL.map(async url => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res && res.ok) {
              await cache.put(url, res);
            } else {
              console.warn('[SW-English] Precache status non-200 for:', url, res ? res.status : 'null');
            }
          } catch (err) {
            console.warn('[SW-English] Precache fetch error for:', url, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. 激活阶段：立即接管并清洗历史过期缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_VERSION) {
            console.log('[SW-English] 正在清理过期缓存:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 请求拦截：双轨缓存调度
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. 导航、主 HTML、各 List 讲义 HTML (content/list-XX.html) 与清单 JSON
  // 强制采用【Network-First (网络优先)】，确保每次更新词汇或修复勘误时，手机端秒级获取最新版！
  const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html');
  const isData = url.pathname.endsWith('.json');

  if (isHtml || isData) {
    event.respondWith(
      fetch(req)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // 断网降级：读取已缓存的讲义页面
          return caches.match(req).then(cached => {
            if (cached) return cached;
            if (req.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
        })
    );
    return;
  }

  // B. 静态字体、图标与前端通用资源 ——【Stale-While-Revalidate】
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      const fetchPromise = fetch(req)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
