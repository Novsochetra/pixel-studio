import { FONT_CACHE, cachesToDrop, wayToFetch } from './offline.js';

// The build sets these: the cache's name changes with the page, so a new build installs itself.
const { OFFLINE_CACHE, OFFLINE_FILES } = globalThis;

// the newest page when there is a network, so an update never waits for a second visit
async function networkFirst(request) {
  const cache = await caches.open(OFFLINE_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const kept = await cache.match(request, { ignoreSearch: true });
    const page = request.mode === 'navigate' ? await cache.match('./') : null;

    if (kept || page) {
      return kept ?? page;
    }

    throw error;
  }
}

async function fontFirstFromCache(request) {
  const cache = await caches.open(FONT_CACHE);
  const kept = await cache.match(request);

  if (kept) {
    return kept;
  }

  const response = await fetch(request);

  // the stylesheet is fetched without CORS, so its response reads as opaque, never as ok
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone());
  }

  return response;
}

const HANDLERS = { fonts: fontFirstFromCache, page: networkFirst };

// the page is one file with nothing left to load, so an open tab is safe under a newer worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(OFFLINE_FILES)));
});

async function dropOldCaches() {
  const stale = cachesToDrop(await caches.keys(), OFFLINE_CACHE);

  await Promise.all(stale.map((name) => caches.delete(name)));
  await self.clients.claim();
}

self.addEventListener('activate', (event) => event.waitUntil(dropOldCaches()));

self.addEventListener('fetch', (event) => {
  const handler = HANDLERS[wayToFetch(event.request, self.location.origin)];

  if (handler) {
    event.respondWith(handler(event.request));
  }
});
