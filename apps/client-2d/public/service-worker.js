const CACHE_NAME = "areloria-client-v1";

const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip API and WebSocket routes
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/ws")) {
    return;
  }

  // /2d/ assets must always be fresh - never cache
  // This prevents stale bundles after deployment
  if (
    url.pathname.startsWith("/2d/") ||
    url.pathname === "/2d" ||
    url.pathname === "/2d/"
  ) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // For other assets, use network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone).catch(() => {});
        });

        return response;
      })
      .catch(() => caches.match(request))
  );
});