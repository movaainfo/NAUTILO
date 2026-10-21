/* NÁUTILO — núcleo: utilitários, armazenamento, sincronização, rotas, eventos.
   Camadas: core (dados) → data (domínio) → intel (inteligência) → views (interface) → dominus (jogo) → app (arranque). */
(() => {
'use strict';
const OS = window.OS = { version: '2.0' };

/* ================= UTILITÁRIOS ================= */
const U = OS.U = {};
U.$ = (s, r = document) => r.querySelector(s);
U.$$ = (s, r = document) => [...r.querySelectorAll(s)];
U.uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);
U.pad = n => String(n).padStart(2, '0');
U.iso = d => d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
U.today = () => U.iso(new Date());
U.parse = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
U.addDays = (s, n) => { const d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); };
U.diff = (a, b) => Math.round((U.parse(a) - U.parse(b)) / 864e5); // a − b em dias
U.ym = s => String(s).slice(0, 7);
U.dim = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
U.addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + U.pad(d.getMonth() + 1); };
U.monday = s => { const d = U.parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return U.iso(d); };
U.MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
U.MESL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
U.WD = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
U.WDS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
U.fmtD = s => s ? String(s).slice(8, 10) + '/' + String(s).slice(5, 7) + '/' + String(s).slice(0, 4) : '—';
U.fmtDS = s => s ? +String(s).slice(8, 10) + ' ' + U.MES[+String(s).slice(5, 7) - 1] : '—';
U.fmtYM = ym => ym ? U.MES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(2, 4) : '—';
U.fmtYML = ym => ym ? U.MESL[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4) : '—';
U.longDate = s => { const d = U.parse(s); return U.WD[d.getDay()] + ', ' + d.getDate() + ' de ' + U.MESL[d.getMonth()]; };
U.rel = s => { if (!s) return '—'; const d = U.diff(s, U.today()); if (d === 0) return 'hoje'; if (d === 1) return 'amanhã'; if (d === -1) return 'ontem'; return d > 0 ? 'em ' + d + ' dias' : 'há ' + (-d) + ' dias'; };
U.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
U.num = v => { const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v); return isFinite(n) ? n : 0; };
const AR = a => Array.isArray(a) ? a : []; // dados estragados (ex.: vindos de outra versão) não partem a página
U.sum = (a, f = x => x) => AR(a).reduce((s, x) => s + U.num(f(x)), 0);
U.avg = (a, f = x => x) => AR(a).length ? U.sum(a, f) / a.length : 0;
U.r1 = v => Math.round(v * 10) / 10;
U.r2 = v => Math.round(v * 100) / 100;
U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
U.nf = (v, d = 0) => (Number(v) || 0).toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d });
U.eur = (v, o = {}) => { const n = Number(v) || 0; const s = (o.sign && n > 0 ? '+' : '') + (n < 0 ? '−' : '') + '€ ' + Math.abs(n).toLocaleString('pt-PT', { minimumFractionDigits: o.dec ?? 2, maximumFractionDigits: o.dec ?? 2 }); return s; };
// valor numa moeda qualquer (contas em reais, dólares…): símbolo + número como no resto da app
U.SYM = { EUR: '€', BRL: 'R$', USD: 'US$', GBP: '£', CHF: 'CHF', JPY: '¥', CAD: 'C$', AUD: 'A$' };
U.money = (v, cur = 'EUR', o = {}) => { if (!cur || cur === 'EUR') return U.eur(v, o); const n = Number(v) || 0; return (o.sign && n > 0 ? '+' : '') + (n < 0 ? '−' : '') + (U.SYM[cur] || cur) + ' ' + Math.abs(n).toLocaleString(cur === 'BRL' ? 'pt-BR' : 'pt-PT', { minimumFractionDigits: o.dec ?? 2, maximumFractionDigits: o.dec ?? 2 }); };
U.eurK = v => { const a = Math.abs(v); if (a >= 1e6) return (v < 0 ? '−' : '') + '€' + U.r1(a / 1e6) + 'M'; if (a >= 1e4) return (v < 0 ? '−' : '') + '€' + Math.round(a / 1e3) + 'k'; return (v < 0 ? '−' : '') + '€' + Math.round(a); };
U.pct = (v, d = 0) => (isFinite(v) ? (v * 100).toLocaleString('pt-PT', { maximumFractionDigits: d, minimumFractionDigits: d }) : '0') + '%';
U.mmss = sec => { sec = Math.round(sec || 0); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + U.pad(m) : m) + ':' + U.pad(s); };
U.parseDur = str => { if (str == null || str === '') return 0; if (typeof str === 'number') return str; const p = String(str).trim().split(':').map(Number); if (p.some(isNaN)) return 0; return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 60; };
U.hm = (d = new Date()) => U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
U.t2m = t => { if (!t) return null; const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
U.m2t = m => U.pad(Math.floor(m / 60) % 24) + ':' + U.pad(Math.round(m % 60));
U.hours = min => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? h + 'h' + (m ? U.pad(m) : '') : m + 'min'; };
U.groupBy = (a, f) => AR(a).reduce((o, x) => { const k = f(x); (o[k] = o[k] || []).push(x); return o; }, {});
U.sortBy = (a, f, dir = 1) => AR(a).slice().sort((x, y) => { const a1 = f(x), b1 = f(y); return (a1 > b1 ? 1 : a1 < b1 ? -1 : 0) * dir; });
U.hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
U.rng = seed => { let a = typeof seed === 'number' ? seed : U.hash(String(seed)); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
U.range = (a, b) => { const r = []; let d = a; while (d <= b) { r.push(d); d = U.addDays(d, 1); } return r; };
U.lastN = n => U.range(U.addDays(U.today(), -(n - 1)), U.today());
U.inRange = (d, a, b) => d && d >= a && d <= b;
U.deb = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
U.trend = (cur, prev) => prev ? (cur - prev) / Math.abs(prev) : (cur ? 1 : 0);
U.clone = o => JSON.parse(JSON.stringify(o));
U.ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } }, keys() { try { return Object.keys(localStorage); } catch (e) { return []; } } };

/* ================= EVENTOS ================= */
const handlers = {};
OS.on = (evt, fn) => { (handlers[evt] = handlers[evt] || []).push(fn); };
OS.emit = (evt, ...a) => { (handlers[evt] || []).forEach(f => { try { f(...a); } catch (e) { console.error(evt, e); } }); };

/* ================= ARMAZENAMENTO =================
   Cada coleção é um array de registos {id, _c, _u, _s, ...}. Persistência em documentos "coleção~shard"
   na base de dados do artifact (coleção "os"), com cópia local. Singletons em "one~chave". */
OS.D = {};
OS.ONE = {};
OS.ONE_DEF = {};
OS.SHARD = {};              // tamanho máximo de shard por coleção
const DEF_SHARD = 250, MAX_BYTES = 220000;
const dirty = new Set();
const pending = {};         // docId -> timer
const lastWrite = {}, applied = {};
let db = null, flushTimer = null;
OS.sync = { status: 'local', msg: 'A iniciar…' };

OS.all = c => OS.D[c] || (OS.D[c] = []);
// procura por id com índice (antes percorria a lista inteira a cada procura: lento com milhares de registos)
const IDX = {};
OS.get = (c, id) => { if (!id) return undefined; const a = OS.all(c); if (a.length < 40) return a.find(r => r.id === id);
  let x = IDX[c]; if (!x || x.a !== a || x.n !== a.length) { x = IDX[c] = { a, n: a.length, m: new Map() }; a.forEach((r, i) => x.m.set(r.id, i)); }
  const i = x.m.get(id); if (i != null && a[i] && a[i].id === id) return a[i];
  const f = a.findIndex(r => r.id === id); if (f >= 0) { delete IDX[c]; return a[f]; } return undefined; };
OS.find = (c, f) => OS.all(c).filter(f);
function pickShard(c) {
  const cap = OS.SHARD[c] || DEF_SHARD, cnt = {};
  OS.all(c).forEach(r => { cnt[r._s || 0] = (cnt[r._s || 0] || 0) + 1; });
  const keys = Object.keys(cnt).map(Number).sort((a, b) => a - b);
  for (const k of keys) if (cnt[k] < cap) return k;
  return keys.length ? Math.max(...keys) + 1 : 0;
}
OS.add = (c, o, opt = {}) => {
  const now = Date.now();
  const r = Object.assign({}, o, { id: o.id || U.uid(), _c: o._c || now, _u: now });
  r._s = pickShard(c);
  OS.all(c).push(r);
  mark(c + '~' + r._s);
  if (!opt.silent) OS.emit('add:' + c, r), OS.emit('change', c, r);
  OS.request();
  return r;
};
OS.upd = (c, id, patch, opt = {}) => {
  const r = OS.get(c, id); if (!r) return null;
  const before = Object.assign({}, r);
  Object.assign(r, patch, { _u: Date.now() });
  mark(c + '~' + (r._s || 0));
  if (!opt.silent) OS.emit('upd:' + c, r, before), OS.emit('change', c, r);
  OS.request();
  return r;
};
OS.del = (c, id) => {
  const a = OS.all(c), i = a.findIndex(r => r.id === id); if (i < 0) return;
  const [r] = a.splice(i, 1);
  mark(c + '~' + (r._s || 0));
  OS.emit('del:' + c, r); OS.emit('change', c, r);
  OS.request();
};
// troca o conteúdo inteiro de uma coleção (reset e desfazer): grava todos os fragmentos, os antigos ficam vazios, e a sincronização leva isso aos outros aparelhos
OS.setColl = (c, items, opt = {}) => { const sh = new Set(OS.all(c).map(r => r._s || 0)); OS.D[c] = items; items.forEach(r => sh.add(r._s || 0)); delete IDX[c]; sh.forEach(s => mark(c + '~' + s)); if (!opt.silent) OS.emit('change', c); OS.request(); return items.length; };
OS.clearColl = (c, opt) => { const n = OS.all(c).length; if (n) OS.setColl(c, [], opt); return n; };
OS.one = k => OS.ONE[k] || (OS.ONE[k] = U.clone(OS.ONE_DEF[k] || {}));
OS.setOne = (k, patch) => { Object.assign(OS.one(k), patch); OS.touch(k); };
OS.touch = k => { mark('one~' + k); OS.emit('one:' + k); OS.request(); };

function mark(docId) { dirty.add(docId); clearTimeout(flushTimer); flushTimer = setTimeout(flush, 700); setStatus(db ? 'busy' : 'local'); }
const flushNow = () => { if (dirty.size) { clearTimeout(flushTimer); try { flush(); } catch (e) { } } };
addEventListener('pagehide', flushNow); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushNow(); });
function payloadFor(docId) {
  const [c, s] = docId.split('~');
  if (c === 'one') return { data: OS.one(s) };
  return { items: OS.all(c).filter(r => String(r._s || 0) === s) };
}
function flush() {
  // a limpar o aparelho (sair da conta, trocar de perfil): nada volta a ser gravado até recarregar
  if (OS.noSave) { dirty.clear(); return; }
  // divide shards grandes demais
  [...dirty].forEach(id => {
    const [c, s] = id.split('~'); if (c === 'one') return;
    let items = OS.all(c).filter(r => String(r._s || 0) === s);
    let bytes = JSON.stringify(items).length;
    if (bytes > MAX_BYTES && items.length > 1) {
      const keys = new Set(OS.all(c).map(r => r._s || 0)); let n = Math.max(...keys) + 1;
      const half = items.slice(Math.floor(items.length / 2));
      half.forEach(r => { r._s = n; }); dirty.add(c + '~' + n);
    }
  });
  const ids = [...dirty]; dirty.clear();
  ids.forEach(id => {
    const p = payloadFor(id);
    U.ls.set('os2:' + id, p);
    if (db) write(id, p, 0);
  });
  if (!db) setStatus('local');
}
function write(id, p, tries) {
  const t = Date.now(); lastWrite[id] = t; pending[id] = (pending[id] || 0) + 1;
  db.doc('os/' + id).set(Object.assign({ t }, p)).then(() => {
    applied[id] = t; pending[id]--; if (!Object.values(pending).some(Boolean) && !dirty.size) setStatus('ok');
  }).catch(e => {
    pending[id]--;
    if (e && e.code === 'unavailable' && tries < 2) setTimeout(() => write(id, payloadFor(id), tries + 1), 900 + Math.random() * 900);
    else setStatus('err', e && e.code);
  });
}
function applyDoc(id, x) {
  const [c, s] = id.split('~');
  if (c === 'one') { OS.ONE[s] = x.data || {}; U.ls.set('os2:' + id, { data: OS.ONE[s] }); return; }
  const items = (x.items || []).map(r => Object.assign(r, { _s: +s }));
  OS.D[c] = OS.all(c).filter(r => String(r._s || 0) !== s).concat(items);
  U.ls.set('os2:' + id, { items });
}
function loadLocal() {
  let n = 0;
  U.ls.keys().filter(k => k.startsWith('os2:')).forEach(k => {
    const id = k.slice(4), v = U.ls.get(k); if (!v) return;
    const [c, s] = id.split('~');
    if (c === 'one') OS.ONE[s] = v.data || {};
    else { OS.D[c] = OS.all(c).filter(r => String(r._s || 0) !== s).concat((v.items || []).map(r => Object.assign(r, { _s: +s }))); }
    n++;
  });
  return n;
}
function setStatus(s, code) {
  OS.sync.status = s;
  OS.sync.msg = s === 'ok' ? 'Sincronizado' : s === 'busy' ? 'A guardar…' : s === 'err' ? 'Erro ao guardar' + (code ? ' (' + code + ')' : '') : 'Só neste dispositivo';
  OS.emit('sync', OS.sync);
}
OS.pushAll = () => {
  Object.keys(OS.D).forEach(c => { new Set(OS.all(c).map(r => r._s || 0)).forEach(s => dirty.add(c + '~' + s)); });
  Object.keys(OS.ONE).forEach(k => dirty.add('one~' + k));
  flush();
};
OS.exportAll = () => ({ version: OS.version, exported: new Date().toISOString(), D: OS.D, ONE: OS.ONE });
OS.importAll = obj => {
  if (!obj || !obj.D) throw new Error('formato');
  Object.keys(OS.D).forEach(c => new Set(OS.all(c).map(r => r._s || 0)).forEach(s => dirty.add(c + '~' + s)));
  OS.D = obj.D; OS.ONE = obj.ONE || {};
  OS.pushAll(); OS.request();
};

/* Arranque de dados: local → base de dados (vence) → migração/semente se vazio */
OS.boot = async (onReady) => {
  const hadLocal = loadLocal() > 0;
  let ready = false;
  const finish = async (empty) => {
    if (ready) return; ready = true;
    if (empty && !Object.keys(OS.D).some(c => OS.all(c).length)) {
      await OS.emitAsync('migrate');
      OS.emit('seed');
    }
    OS.emit('ready'); onReady();
  };
  try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch (e) { db = null; }
  if (!db) { setStatus('local'); finish(!hadLocal); return; }
  OS.dbRef = db;
  let first = true;
  const timeout = setTimeout(() => { if (first) { first = false; setStatus('err', 'sem resposta'); finish(!hadLocal); } }, 6000);
  db.collection('os').onSnapshot(snap => {
    let changed = false;
    snap.docs.forEach(d => {
      const id = d.id, x = d.data(); if (!x) return;
      if (pending[id] || dirty.has(id)) return;
      if (x.t === lastWrite[id] || x.t <= (applied[id] || 0)) return;
      applied[id] = x.t; applyDoc(id, x); changed = true;
    });
    if (first) {
      first = false; clearTimeout(timeout);
      if (snap.empty) { if (hadLocal) OS.pushAll(); finish(!hadLocal); }
      else { setStatus('ok'); finish(false); }
      if (changed && ready) { OS.emit('remote'); OS.request(); }
      return;
    }
    if (changed) { OS.emit('remote'); OS.request(); }
  }, e => setStatus('err', e && e.code));
  // abre logo com os dados deste aparelho; a sincronização chega por trás e atualiza o ecrã
  if (hadLocal) { setStatus('busy'); finish(false); }
};
OS.emitAsync = async (evt) => { for (const f of (handlers[evt] || [])) { try { await f(); } catch (e) { console.error(evt, e); } } };

/* ================= ROTAS E RENDER ================= */
OS.views = {};                 // base -> fn(sub) => html
OS.route = () => { const h = decodeURIComponent((location.hash || '#visao').slice(1)) || 'visao'; const i = h.indexOf('.'); return { base: i < 0 ? h : h.slice(0, i), sub: i < 0 ? '' : h.slice(i + 1), raw: h }; };
OS.go = h => { if (location.hash.slice(1) === h) OS.request(); else location.hash = h; };
let raf = 0, pend = false, touching = 0;
// não redesenha a página com o dedo no ecrã (o botão mudava debaixo do dedo e o toque perdia-se) nem com a app escondida
OS.request = () => { if (raf) return; if ((touching && Date.now() - touching < 4000) || document.hidden) { pend = true; return; } raf = requestAnimationFrame(() => { raf = 0; OS.emit('render'); }); };
const flushR = ms => { if (!pend) return; setTimeout(() => { if (touching || document.hidden || !pend) return; pend = false; OS.request(); }, ms); };
addEventListener('pointerdown', () => { touching = Date.now(); }, true);
['pointerup', 'pointercancel'].forEach(ev => addEventListener(ev, () => { touching = 0; flushR(350); }, true));
document.addEventListener("visibilitychange", () => { if (!document.hidden) flushR(30); });

/* Estado de interface por visitante (filtros, abas) — conveniência local */
OS.ui = U.ls.get('os2ui', {});
OS.setUI = (k, v) => { OS.ui[k] = v; U.ls.set('os2ui', OS.ui); OS.request(); };

})();
