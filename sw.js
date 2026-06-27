// ─────────────────────────────────────────────
// Service Worker — Australia Trip Pro
// 策略：Cache-First（靜態資源）+ Network-First（圖片）
// ─────────────────────────────────────────────
const CACHE_VERSION = "trip-pro-v2";
const CDN_CACHE     = "trip-pro-cdn-v1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

const CDN_ASSETS = [
  "https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"
];

// ── Install：預快取核心資源 ──
self.addEventListener("install", event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(CDN_CACHE).then(cache =>
        Promise.allSettled(CDN_ASSETS.map(url => cache.add(url)))
      )
    ]).then(() => self.skipWaiting())  // 立即啟用新 SW，不等舊頁面關閉
  );
});

// ── Activate：清理舊版 cache ──
self.addEventListener("activate", event => {
  const validCaches = new Set([CACHE_VERSION, CDN_CACHE]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !validCaches.has(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // 立即控制所有頁面
  );
});

// ── Fetch：依資源類型選擇策略 ──
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // 只處理 GET
  if (request.method !== "GET") return;

  // CDN 資源：Cache-First
  if (url.origin !== self.location.origin) {
    event.respondWith(cacheFirst(request, CDN_CACHE));
    return;
  }

  // 圖片：Cache-First（離線友善）
  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, CACHE_VERSION));
    return;
  }

  // HTML / JS / CSS：Network-First（優先取得最新版）
  event.respondWith(networkFirst(request, CACHE_VERSION));
});

// ── 策略函式 ──

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 離線且無快取：回傳空 Response
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("", { status: 503, statusText: "Offline" });
  }
}
