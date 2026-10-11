/* Oceanum — service worker: abre instantaneamente e funciona sem internet. */
const V = 'oceanum-affbe77f8a';
const SHELL = ["./","index.html","manifest.webmanifest","apple-touch-icon.png","icon-192.png","icon-512.png","icon-maskable-512.png","vendor/fonts/11adc6349b.woff2","vendor/fonts/2fed1d1b2e.woff2","vendor/fonts/4667f67516.woff2","vendor/fonts/53a6c32636.woff2","vendor/fonts/63551c15ca.woff2","vendor/fonts/9076820487.woff2","vendor/fonts/9ca58f5002.woff2","vendor/fonts/b291d87cd7.woff2","vendor/fonts/d0980034bf.woff2","vendor/fonts/e09adcd0ca.woff2","vendor/fonts/e2aaf8d658.woff2","vendor/fonts/f377472eee.woff2"];
const IMG = 'oceanum-img'; // fotos dos exercícios e dos alimentos: guardadas para funcionarem sem internet
const IMGHOST = /(^|\.)(jsdelivr\.net|themealdb\.com|openfoodfacts\.org|wikimedia\.org|pinimg\.com)$/;
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET') return;
  if (u.searchParams.has('vchk')) return; // verificação de versão: vai sempre à rede
  if (IMGHOST.test(u.hostname) && /\.(jpe?g|png|webp)$/i.test(u.pathname)) { e.respondWith(caches.open(IMG).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; })))); return; }
  if (u.hostname === 'cdnjs.cloudflare.com' && /three\.js/.test(u.pathname)) { e.respondWith(caches.open(IMG).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })))); return; }
  if (u.origin !== location.origin) return;
  // a app (index) e os ficheiros de vendor/ só mudam com uma versão nova do service worker: servidos logo da cache, sem voltar a descarregar
  if (e.request.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname) || /\/vendor\//.test(u.pathname)) { e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => { if (r.ok && /\/vendor\//.test(u.pathname)) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }))); return; }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => { const net = fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }).catch(() => hit); return hit || net; }));
});
