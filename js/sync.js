/* NÁUTILO — sincronização entre aparelhos (uma só conta) através do script Google do utilizador.
   O motor de dados (core.js) fala com uma "base de dados" com collection().onSnapshot() e doc().set().
   Aqui essa base é o ficheiro "Náutilo · dados.json" no Google Drive do utilizador, servido pelo seu Apps Script.
   - Primeiro aparelho a ligar: envia tudo o que tem.
   - Aparelhos seguintes: fica a versão com mais dados (a outra é guardada como cópia neste aparelho).
   - Depois: cada alteração é enviada; os outros aparelhos recebem-na em segundos (ao abrir, ao voltar à app e a cada 20 s). */
(() => {
'use strict';
if (window.claude) return; // dentro do claude.ai usa a base de dados do artifact
const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, raw: k => { try { return localStorage.getItem(k); } catch (e) { return null; } } };

// ---- link de ligação: …/#ligar=<código> configura este aparelho e liga a sincronização ----
// aceita o link inteiro, só o código, ou o código codificado (%3D…) tal como chega por WhatsApp/email
const decodeCode = code => { let c = String(code || '').trim(); const m = c.match(/ligar=([^\s#&]+)/); if (m) c = m[1]; c = c.replace(/\s+/g, '');
  for (let i = 0; i < 3 && /%[0-9A-Fa-f]{2}/.test(c); i++) { try { c = decodeURIComponent(c); } catch (e) { break; } }
  c = c.replace(/-/g, '+').replace(/_/g, '/'); while (c.length % 4) c += '=';
  return JSON.parse(decodeURIComponent(escape(atob(c)))); };
const applyLink = code => { try { const o = decodeCode(code); if (!o.u || !o.k) return false;
  const cur = LS.get('os2:one~inbox', { data: {} }); cur.data = Object.assign({}, cur.data, { url: o.u, key: o.k }); LS.set('os2:one~inbox', cur);
  LS.set('os2sync', 1); LS.set('os2syncJoined', 0); LS.set('os2syncPull', 1); return true; } catch (e) { return false; } };
const hm = location.hash.match(/ligar=([^&#\s]+)/);
if (hm) { const ok = applyLink(hm[1]); history.replaceState(null, '', location.pathname + '#visao'); if (ok) LS.set('os2syncMsg', 'Aparelho ligado. A sincronizar…'); }

const cfg = () => (LS.get('os2:one~inbox', { data: {} }).data || {});
const SY = window.OceanumSync = { on: false, state: 'desligada', last: 0, err: '', applyLink };
SY.linkCode = () => { const c = cfg(); return btoa(unescape(encodeURIComponent(JSON.stringify({ u: c.url, k: c.key })))); };
if (!LS.get('os2sync', 0)) return;
const c0 = cfg(); if (!c0.url || !c0.key) { SY.state = 'falta o endereço do script'; return; }
SY.on = true; SY.state = 'a ligar…';

const url = () => cfg().url, key = () => cfg().key;
const qs = o => Object.entries(o).map(([a, b]) => encodeURIComponent(a) + '=' + encodeURIComponent(b)).join('&');
const call = async (op, fields = {}, post = false, tries = 3) => { let last = null;
  for (let i = 0; i < tries; i++) {
    try { const r = post ? await fetch(url(), { method: 'POST', body: new URLSearchParams(Object.assign({ k: key(), op }, fields)), credentials: 'omit', cache: 'no-store' })
        : await fetch(url() + (url().includes('?') ? '&' : '?') + qs(Object.assign({ k: key(), op, _: Date.now() }, fields)), { credentials: 'omit', cache: 'no-store' });
      const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { if (/DriveApp|permission/i.test(t)) throw Object.assign(new Error('Falta autorizar o Google Drive no Apps Script (Definições → Sincronizar → passo B)'), { fatal: true }); last = new Error('o Google respondeu com uma página de erro'); }
      if (j) { if (!j.ok) throw Object.assign(new Error(j.msg || 'erro do script'), { fatal: true }); return j; }
    } catch (e) { if (e.fatal) throw e; last = e; }
    await new Promise(res => setTimeout(res, 700 * (i + 1))); }
  throw last || new Error('sem resposta'); };

// pendentes: alterações gravadas aqui que ainda não chegaram ao Google (sobrevivem a fechar a app sem rede)
const pend = new Set(LS.get('os2syncPend', [])); const savePend = () => LS.set('os2syncPend', [...pend]);
const known = {}; // id → t no servidor
let queue = {}, waiters = [], timer = 0;
const flushPut = async () => { timer = 0; const batch = queue, ws = waiters; queue = {}; waiters = []; if (!Object.keys(batch).length) return;
  try { await call('put', { j: JSON.stringify(batch) }, true); Object.entries(batch).forEach(([id, d]) => { known[id] = d.t; pend.delete(id); }); savePend(); SY.last = Date.now(); SY.err = ''; SY.state = 'sincronizada'; ws.forEach(w => w.ok()); }
  catch (e) { SY.err = e.message; SY.state = 'sem ligação (guardado neste aparelho)'; ws.forEach(w => w.ko({ code: 'unavailable' })); setTimeout(() => repushPending(), 15000); }
  try { OS.request(); } catch (e) { } };
const put = (id, data) => new Promise((ok, ko) => { queue[id] = data; pend.add(id); savePend(); waiters.push({ ok, ko }); clearTimeout(timer); timer = setTimeout(flushPut, 1200); });
const payload = id => { const [c, s] = id.split('~'); return c === 'one' ? { data: OS.one(s) } : { items: OS.all(c).filter(r => String(r._s || 0) === s) }; };
const repushPending = () => { [...pend].forEach(id => put(id, Object.assign({ t: Date.now() }, payload(id))).catch(() => { })); };
const count = all => Object.entries(all).reduce((n, [id, d]) => n + (id.startsWith('one~') ? 0 : ((d && d.items) || []).length), 0);
const localDocs = () => { const o = {}; Object.keys(OS.D || {}).forEach(c => OS.all(c).forEach(r => { o[c + '~' + (r._s || 0)] = 1; })); Object.keys(OS.ONE || {}).forEach(k => { o['one~' + k] = 1; }); return o; };
const snap = docs => ({ empty: !docs.length, docs: docs.map(([id, d]) => ({ id, data: () => d })) });

let started = false;
const start = async (cb, errCb) => {
  if (started) return; started = true;
  let all;
  try { all = (await call('get')).docs || {}; }
  catch (e) { SY.err = e.message; SY.state = e.fatal ? e.message : 'sem ligação ao Google'; errCb && errCb({ code: 'unavailable' }); setTimeout(() => { started = false; start(cb, errCb); }, 20000); return; }
  Object.entries(all).forEach(([id, d]) => known[id] = d.t || 0);
  const joined = LS.get('os2syncJoined', 0), localN = Object.keys(OS.D || {}).reduce((n, c) => n + OS.all(c).length, 0), remoteN = count(all);
  if (!Object.keys(all).length) { // primeiro aparelho: envia tudo
    LS.set('os2syncJoined', 1); cb(snap([])); setTimeout(() => { if (localN) OS.pushAll(); }, 300); SY.state = 'a enviar os dados deste aparelho…';
  } else if (!joined) { // aparelho novo na conta: fica a versão com mais dados
    LS.set('os2syncJoined', 1);
    // ligado por código/recuperação: este aparelho é o novo → recebe sempre os dados da conta (nunca os substitui)
    const pull = LS.get('os2syncPull', 0); LS.set('os2syncPull', 0);
    if (localN > remoteN && !pull) { LS.set('os2preSyncRemoteCount', remoteN); cb(snap([])); setTimeout(() => OS.pushAll(), 300); SY.state = 'este aparelho tinha mais dados: enviados'; }
    else { try { localStorage.setItem('os2preSyncBackup', JSON.stringify(OS.exportAll())); } catch (e) { } cb(snap(Object.entries(all))); SY.state = 'dados da conta recebidos'; }
  } else { // normal: recebe tudo, menos o que ainda não tinha chegado ao Google (esse volta a ser enviado)
    cb(snap(Object.entries(all).filter(([id]) => !pend.has(id)))); if (pend.size) repushPending(); SY.state = 'sincronizada';
  }
  SY.last = Date.now(); SY.err = '';
  // novidades dos outros aparelhos
  const poll = async () => { if (document.hidden || !navigator.onLine) return;
    try { const list = (await call('list', {}, false, 2)).docs || {}; const ch = Object.keys(list).filter(id => list[id] !== known[id] && !pend.has(id) && !queue[id]);
      if (ch.length) { const got = (await call('get', { ids: ch.join(',') }, false, 2)).docs || {}; Object.entries(got).forEach(([id, d]) => known[id] = d.t || 0); cb(snap(Object.entries(got))); }
      SY.last = Date.now(); SY.err = ''; SY.state = 'sincronizada'; }
    catch (e) { SY.err = e.message; SY.state = 'sem ligação ao Google'; } };
  setInterval(poll, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { poll(); if (pend.size) repushPending(); } });
  addEventListener('online', () => { poll(); if (pend.size) repushPending(); });
};

window.claude = { use: async cap => cap === 'db' ? {
  collection: () => ({ onSnapshot: (cb, err) => { start(cb, err); return () => { }; } }),
  doc: path => ({ set: data => put(path.split('/').slice(1).join('/'), data) })
} : null };
})();
