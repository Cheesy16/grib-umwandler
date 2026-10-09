// Service Worker: macht die App offline nutzbar und nimmt Dateien aus dem Teilen-Menü an
const VERSION = 'grib-umwandler-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'shared').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Geteilte Datei aus dem Android-Teilen-Menü
  if (e.request.method === 'POST' && url.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      const form = await e.request.formData();
      const files = form.getAll('grib').filter(f => f && f.size);
      const cache = await caches.open('shared');
      for (const k of await cache.keys()) await cache.delete(k);
      for (let i = 0; i < files.length; i++) {
        await cache.put('./shared/' + i, new Response(files[i], { headers: { 'X-Name': encodeURIComponent(files[i].name || ('datei' + i + '.grb2')) } }));
      }
      return Response.redirect('./?shared=' + files.length, 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  // Zuerst aus dem Speicher, sonst aus dem Netz (und für später merken)
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && url.origin === location.origin) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
