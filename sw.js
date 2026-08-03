/* ClaimDataTracker — service worker  (v3)
 *
 * IMPORTANT FIX vs v1:
 * v1 served the HTML cache-first. That meant once a phone had loaded the app,
 * it kept showing that same old copy forever — so edits (like adding
 * SCRIPT_URL, or the mobile layout) never arrived. That was the cause of both
 * "no data after login" and "mobile shows the desktop layout".
 *
 * v3 rules:
 *   - HTML  -> NETWORK FIRST. Cache is only a fallback for genuine offline.
 *   - icons -> cache first (they never change).
 *   - data  -> never touched. Always live.
 */

const VERSION = "v10";
const SHELL_CACHE = "claimtracker-shell-" + VERSION;

const STATIC = [
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(STATIC))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Let the page trigger an immediate update.
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

function isHtml(req) {
  if (req.mode === "navigate") return true;
  const u = new URL(req.url);
  return u.pathname.endsWith("/") || u.pathname.endsWith(".html");
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Live data + auth: completely untouched, always straight to the network.
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("script.googleusercontent.com") ||
    url.hostname.includes("accounts.google.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com")
  ) {
    return;
  }

  // HTML: network first so updates land immediately.
  if (isHtml(req)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Everything else (icons, fonts, CDN libs): cache first, refresh quietly.
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
