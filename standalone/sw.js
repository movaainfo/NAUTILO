/* Oceanum — service worker: abre instantaneamente e funciona sem internet. */
const V = 'oceanum-__VERSION__';
const SHELL = __FILES__;
const IMG = 'oceanum-img'; // fotos dos exercícios e dos alimentos: guardadas para funcionarem sem internet
const IMGHOST = /(^|\.)(jsdelivr\.net|themealdb\.com|openfoodfacts\.org|wikimedia\.org|pinimg\.com)$/;
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET') return;
  if (u.searchParams.has('vchk')) return; // verificação de versão: vai sempre à rede
  if (/\/api\//.test(u.pathname)) return; // funções do servidor (cotações, leitor de notícias): sempre à rede, nunca da cache
  if (IMGHOST.test(u.hostname) && /\.(jpe?g|png|webp)$/i.test(u.pathname)) { e.respondWith(caches.open(IMG).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; })))); return; }
  if (u.hostname === 'cdnjs.cloudflare.com' && /three\.js/.test(u.pathname)) { e.respondWith(caches.open(IMG).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })))); return; }
  if (u.origin !== location.origin) return;
  // a app (index) e os ficheiros de vendor/ só mudam com uma versão nova do service worker: servidos logo da cache, sem voltar a descarregar
  if (e.request.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname) || /\/vendor\//.test(u.pathname)) { e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => { if (r.ok && /\/vendor\//.test(u.pathname)) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }))); return; }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => { const net = fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }).catch(() => hit); return hit || net; }));
});
