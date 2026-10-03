// Service worker (Stage 14). Stage 1 registered a pass-through worker "until
// there's real content worth caching"; this adds the minimum that's safe:
//
//  - /_next/static/* and /icons/*: cache-first. Build assets are
//    content-hashed (a new deploy means new URLs), so a cached copy is never
//    stale; the cache is trimmed so old builds' files don't pile up.
//  - Page navigations: always the network — pages are per-user and
//    auth-dependent, so they are never cached. Only when the network is
//    unreachable does the visitor get the offline page instead of the
//    browser's error screen.
//  - Everything else (API calls, RSC payloads, other origins): untouched.

const CACHE = "amw-static-v1";
const OFFLINE_URL = "/offline.html";
const MAX_ENTRIES = 150;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

async function trim(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_ENTRIES;
  for (let i = 0; i < excess; i++) {
    // Oldest first (insertion order); never evict the offline page.
    if (!keys[i].url.endsWith(OFFLINE_URL)) await cache.delete(keys[i]);
  }
}
