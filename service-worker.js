const SHELL_CACHE = 'quiet-reader-shell-v56';
const RUNTIME_CACHE = 'quiet-reader-runtime-v3';
const SHELL = [
  './',
  './index.html',
  './css/main.css',
  './js/app.js',
  './js/shared/policies.js',
  './js/reader.js',
  './js/translation.js',
  './js/image-translation.js',
  './js/links.js',
  './js/kokoro.js',
  './js/kokoro-worker.js',
  './js/state.js',
  './js/state/library.js',
  './js/state/reader.js',
  './js/state/editor.js',
  './js/state/navigation.js',
  './js/domain/book.js',
  './js/presentation/navigation.js',
  './js/features/library/index.js',
  './js/features/reader/index.js',
  './js/features/chapters/index.js',
  './js/features/marks/index.js',
  './js/features/links/index.js',
  './js/features/galleries/index.js',
  './js/features/translation/index.js',
  './js/features/history/index.js',
  './js/features/backup/index.js',
  './js/features/epub/index.js',
  './js/features/pdf/index.js',
  './js/features/image-translation/index.js',
  './js/features/offline-updates/index.js',
  './js/db.js',
  './js/infrastructure/persistence/item-repository.js',
  './js/utils.js',
  './js/themes.js',
  './js/library.js',
  './js/library-counts.js',
  './js/chapter-tools.js',
  './js/history.js',
  './js/galleries.js',
  './js/editor.js',
  './js/highlights.js',
  './js/backup.js',
  './js/collections.js',
  './js/features/collections/index.js',
  './js/epub.js',
  './js/pdf.js',
  './assets/favicon.svg'
];
const RUNTIME_HOSTS = new Set([
  'esm.sh',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'huggingface.co',
  'cdn-lfs.huggingface.co',
  'cas-bridge.xethub.hf.co'
]);
const OPTIONAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const firstUpgradeFromV55 = keys.includes('quiet-reader-shell-v55');
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL);
    const runtime = await caches.open(RUNTIME_CACHE);
    await Promise.all(OPTIONAL_ASSETS.map(async asset => {
      try {
        const response = await fetch(asset, { mode: 'cors', cache: 'no-cache' });
        if (response.ok && response.type !== 'opaque') await runtime.put(asset, response);
      } catch {
        // Optional CDN assets are cached on first successful use if unavailable here.
      }
    }));
    // One-time transition from the previous auto-updating worker so existing users
    // receive the new App Updates screen. Future versions wait for user confirmation.
    if (firstUpgradeFromV55) await self.skipWaiting();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('quiet-reader-shell-') && key !== SHELL_CACHE)
      .map(key => caches.delete(key)));
    // Keep the runtime cache across app updates. It can contain the user's
    // previously downloaded Kokoro model/runtime assets.
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith((async () => {
        const shell = await caches.open(SHELL_CACHE);
        const cached = await shell.match(new URL('./index.html', self.registration.scope));
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) await shell.put(new URL('./index.html', self.registration.scope), response.clone());
          return response;
        } catch {
          return new Response('Quiet Reader is not cached on this device yet. Connect once and reload.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      })());
      return;
    }
    event.respondWith((async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const shell = await caches.open(SHELL_CACHE);
        await shell.put(request, response.clone());
      }
      return response;
    })());
    return;
  }

  if (RUNTIME_HOSTS.has(url.hostname)) {
    event.respondWith((async () => {
      const runtime = await caches.open(RUNTIME_CACHE);
      const cached = await runtime.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type !== 'opaque') await runtime.put(request, response.clone());
        return response;
      } catch (error) {
        const fallback = await runtime.match(request);
        if (fallback) return fallback;
        throw error;
      }
    })());
  }
});
