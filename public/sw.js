// Minimal service worker foundation — install/activate only, no caching
// strategy yet (deliberately, per Stage 1 scope: "no full offline logic").
// A real cache strategy (network-first for /api, stale-while-revalidate for
// static assets) is added once there's real content worth caching.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass-through for now — intentionally not intercepting requests yet.
});
