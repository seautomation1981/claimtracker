/* ClaimDataTracker — service worker
 *
 * Deliberately conservative: it caches only the app SHELL (the page, icons,
 * manifest) so the app opens instantly and survives a flaky connection.
 *
 * It NEVER caches claim data. Every request to the Apps Script backend goes
 * straight to the network, so what you see on the phone is always live — a
 * cached claim list would be worse than useless in a shop.
 */

const CACHE = "claimtracker-shell-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // don't block install on one bad URL
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Never touch anything that isn't a plain GET.
  if (req.method !== "GET") return;

  // Live data + auth: always network, never cached.
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("accounts.google.com") ||
    url.hostname.includes("googleapis.com")
  ) {
    return;
  }

  // App shell: serve from cache fast, refresh in the background.
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
