/* Oceanum — service worker: abre instantaneamente e funciona sem internet. */
const V = 'oceanum-2d7177bf9d';
const SHELL = ["manifest.webmanifest","apple-touch-icon.png","icon-192.png","icon-512.png","icon-maskable-512.png","vendor/fonts/11adc6349b.woff2","vendor/fonts/2fed1d1b2e.woff2","vendor/fonts/4667f67516.woff2","vendor/fonts/53a6c32636.woff2","vendor/fonts/63551c15ca.woff2","vendor/fonts/9076820487.woff2","vendor/fonts/9ca58f5002.woff2","vendor/fonts/b291d87cd7.woff2","vendor/fonts/d0980034bf.woff2","vendor/fonts/e09adcd0ca.woff2","vendor/fonts/e2aaf8d658.woff2","vendor/fonts/f377472eee.woff2"];
const SHELLKEY = new URL('./', self.registration.scope).href;
const IMG = 'oceanum-img'; // fotos dos exercícios e dos alimentos: guardadas para funcionarem sem internet
const IMGHOST = /(^|\.)(jsdelivr\.net|themealdb\.com|openfoodfacts\.org|wikimedia\.org|pinimg\.com)$/;
// instalar nunca falha: cada ficheiro é guardado à parte (antes, um ficheiro que falhasse no iPhone impedia a versão nova de entrar)
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(x => fetch(x, { cache: 'no-cache' }).then(r => r.ok ? c.put(x, r) : 0).catch(() => 0))))); });
// a cópia da app para usar sem internet é guardada logo a seguir (sem atrasar a entrada da versão nova)
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim())
  .then(() => { fetch(SHELLKEY, { cache: 'no-cache', credentials: 'same-origin' }).then(r => r.ok ? caches.open(V).then(c => c.match(SHELLKEY).then(h => h || c.put(SHELLKEY, r))) : 0).catch(() => { }); })); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET') return;
  if (u.searchParams.has('vchk')) return; // verificação de versão: vai sempre à rede
  if (/\/api\//.test(u.pathname)) return; // funções do servidor (cotações, leitor de notícias): sempre à rede, nunca da cache
  if (IMGHOST.test(u.hostname) && /\.(jpe?g|png|webp)$/i.test(u.pathname)) { e.respondWith(caches.open(IMG).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; })))); return; }
  if (u.hostname === 'cdnjs.cloudflare.com' && /three\.js/.test(u.pathname)) { e.respondWith(caches.open(IMG).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })))); return; }
  if (u.origin !== location.origin) return;
  // a app: primeiro a internet (abre sempre a versão mais recente; o servidor só manda tudo outra vez quando há versão nova),
  // a cópia guardada só quando não há rede ou a rede demora mais de 4 s
  if (e.request.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname)) { e.respondWith(fresh(e)); return; }
  if (/\/vendor\//.test(u.pathname)) { e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }))); return; }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => { const net = fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }).catch(() => hit); return hit || net; }));
});
function fresh(e) { const cached = () => caches.match(SHELLKEY).then(h => h || caches.match(e.request, { ignoreSearch: true }));
  const net = fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r; });
  e.waitUntil(net.then(r => { const keep = r.clone(); return caches.open(V).then(c => c.put(SHELLKEY, keep)); }).catch(() => { }));
  const plain = r => r.redirected ? new Response(r.body, { status: r.status, statusText: r.statusText, headers: r.headers }) : r;
  const slow = new Promise(res => setTimeout(res, 4000)).then(cached);
  return Promise.race([net.then(plain, cached), slow.then(h => h || net.then(plain))]).then(r => r || net.then(plain))
    .catch(() => cached().then(h => h || new Response('<meta name="viewport" content="width=device-width"><h2 style="font-family:system-ui;padding:24px">Sem internet. Abre outra vez quando tiveres rede.</h2>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))); }
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
