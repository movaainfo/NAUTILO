// NÁUTILO · base comum das contas (não é uma rota: o "_" no nome diz ao Vercel para não a publicar).
// Guarda tudo num Vercel Blob PRIVADO (só o servidor lê, com a chave do projeto) e, além disso, cifrado:
//   a/<hash do e-mail>          a conta (e-mail, senha em scrypt, perfis, código de recuperação em hash)
//   d/<conta>/<perfil>/<doc>     os dados de cada perfil, um documento por fragmento do motor de dados (AES-256-GCM)
//   m/<conta>/<perfil>           marca de "houve novidades" (os aparelhos perguntam só por esta, que é barata)
//   sys/chave                    a chave mestra, criada uma vez (ou NAUTILO_SECRET nas variáveis do projeto)
// Sem BLOB_READ_WRITE_TOKEN e com NAUTILO_STORE_DIR (testes no computador) usa uma pasta local com o mesmo comportamento.
'use strict';
const crypto = require('crypto'), zlib = require('zlib'), fs = require('fs'), path = require('path');

/* ---------- loja: Vercel Blob privado ou pasta local ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const err = (code, msg, status) => Object.assign(new Error(msg || code), { code, status });
const blobStore = token => {
  const storeId = token.split('_')[3] || '', API = process.env.VERCEL_BLOB_API_URL || 'https://vercel.com/api/blob';
  const full = p => /^https:/.test(p) ? p : `https://${storeId}.private.blob.vercel-storage.com/${p}`;
  const H = extra => Object.assign({ authorization: 'Bearer ' + token, 'x-api-version': '13', 'x-vercel-blob-store-id': storeId }, extra || {});
  const api = async (p, init = {}) => { let last = null;
    for (let i = 0; i < 4; i++) {
      let r; try { r = await fetch(API + p, Object.assign({}, init, { headers: H(init.headers) })); } catch (e) { last = err('unavailable', e.message); await sleep(150 * 2 ** i); continue; }
      if (r.ok) return r.json();
      let j = {}; try { j = await r.json(); } catch (e) { }
      const code = (j.error && j.error.code) || 'unknown_error', msg = (j.error && j.error.message) || '';
      if (r.status >= 500 || code === 'rate_limited' || code === 'service_unavailable' || code === 'internal_server_error') { last = err(code, msg, r.status); await sleep(200 * 2 ** i); continue; }
      throw err(code, msg, r.status); }
    throw last || err('unavailable'); };
  return {
    kind: 'blob',
    // escreve; overwrite=false falha se já existir (conta nova), ifMatch só escreve se ninguém mudou entretanto
    async put(p, buf, o = {}) {
      const h = { 'x-vercel-blob-access': 'private', 'x-add-random-suffix': '0', 'x-allow-overwrite': o.overwrite === false ? '0' : '1', 'x-content-type': 'application/octet-stream', 'x-cache-control-max-age': '60' };
      if (o.ifMatch) h['x-if-match'] = o.ifMatch;
      try { const r = await api('/?' + new URLSearchParams({ pathname: p }), { method: 'PUT', body: buf, headers: h }); return { etag: r.etag, url: r.url }; }
      catch (e) { if (e.code === 'precondition_failed') throw err('conflict'); if (o.overwrite === false && (e.status === 400 || e.status === 409 || /exist/i.test(e.message))) throw err('exists'); throw e; } },
    async get(p) { let last = null;
      for (let i = 0; i < 3; i++) { try { const r = await fetch(full(p) + '?cache=0', { headers: { authorization: 'Bearer ' + token } });
          if (r.status === 404) return null; if (r.ok) return { buf: Buffer.from(await r.arrayBuffer()), etag: r.headers.get('etag') || '' };
          last = err('read_failed', 'leitura ' + r.status, r.status); if (r.status < 500 && r.status !== 429) break; } catch (e) { last = err('unavailable', e.message); }
        await sleep(150 * 2 ** i); }
      throw last; },
    async head(p) { try { const r = await api('?' + new URLSearchParams({ url: full(p) })); return { etag: r.etag, size: r.size, at: r.uploadedAt }; } catch (e) { if (e.code === 'not_found' || e.status === 404) return null; throw e; } },
    async list(prefix) { const out = []; let cursor = '';
      for (let i = 0; i < 50; i++) { const q = new URLSearchParams({ prefix, limit: '1000' }); if (cursor) q.set('cursor', cursor);
        const r = await api('?' + q); (r.blobs || []).forEach(b => out.push({ pathname: b.pathname, etag: b.etag, size: b.size, url: b.url, at: b.uploadedAt }));
        if (!r.hasMore || !r.cursor) break; cursor = r.cursor; }
      return out; },
    async del(items) { const urls = items.map(b => b.url || full(b.pathname || b)).filter(Boolean); for (let i = 0; i < urls.length; i += 100) await api('/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ urls: urls.slice(i, i + 100) }) }); }
  };
};
// a mesma coisa numa pasta (testes): etag = hash do conteúdo, com as mesmas regras de overwrite e ifMatch
const dirStore = dir => {
  const f = p => path.join(dir, p.split('/').map(encodeURIComponent).join(path.sep)), tag = b => '"' + crypto.createHash('sha1').update(b).digest('hex') + '"';
  const read = p => { try { return fs.readFileSync(f(p)); } catch (e) { return null; } };
  const walk = (d, rel, out) => { let L = []; try { L = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return out; } L.forEach(x => { const r = rel + (rel ? '/' : '') + decodeURIComponent(x.name); x.isDirectory() ? walk(path.join(d, x.name), r, out) : out.push(r); }); return out; };
  return {
    kind: 'dir',
    async put(p, buf, o = {}) { const cur = read(p);
      if (o.overwrite === false && cur) throw err('exists'); if (o.ifMatch && (!cur || tag(cur) !== o.ifMatch)) throw err('conflict');
      fs.mkdirSync(path.dirname(f(p)), { recursive: true }); fs.writeFileSync(f(p), buf); return { etag: tag(buf), url: p }; },
    async get(p) { const b = read(p); return b ? { buf: b, etag: tag(b) } : null; },
    async head(p) { const b = read(p); return b ? { etag: tag(b), size: b.length } : null; },
    // só percorre a subpasta do prefixo (a pasta inteira ficava lenta com muitas contas)
    async list(prefix) { const base = prefix.includes('/') ? prefix.slice(0, prefix.lastIndexOf('/')) : '', d = base ? f(base) : dir;
      return walk(d, base, []).filter(p => p.startsWith(prefix)).sort().map(p => { const b = read(p); return { pathname: p, etag: tag(b), size: b.length, url: p }; }); },
    async del(items) { items.forEach(b => { try { fs.unlinkSync(f(b.pathname || b.url || b)); } catch (e) { } }); }
  };
};
let STORE = null;
const store = () => STORE || (STORE = process.env.BLOB_READ_WRITE_TOKEN ? blobStore(process.env.BLOB_READ_WRITE_TOKEN) : process.env.NAUTILO_STORE_DIR ? dirStore(process.env.NAUTILO_STORE_DIR) : null);

/* ---------- chaves e cifra ---------- */
let MASTER = null;
const master = async () => { if (MASTER) return MASTER;
  const env = process.env.NAUTILO_SECRET; if (env && env.length >= 32) return (MASTER = crypto.createHash('sha256').update('nautilo|' + env).digest());
  const s = store(); let got = await s.get('sys/chave');
  if (!got) { try { await s.put('sys/chave', crypto.randomBytes(32), { overwrite: false }); } catch (e) { if (e.code !== 'exists') throw e; } got = await s.get('sys/chave'); }
  if (!got || got.buf.length !== 32) throw err('sem_chave');
  return (MASTER = got.buf); };
const hkdf = (k, info) => Buffer.from(crypto.hkdfSync('sha256', k, Buffer.from('nautilo-v1'), Buffer.from(info), 32));
const KEYS = new Map();
const userKey = async uid => { const c = KEYS.get(uid); if (c) return c; const k = hkdf(await master(), 'dados:' + uid); KEYS.set(uid, k); if (KEYS.size > 500) KEYS.delete(KEYS.keys().next().value); return k; };
// [1][iv 12][tag 16][dados] — o conteúdo vai comprimido antes de cifrar
const seal = (key, obj) => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv), body = Buffer.concat([c.update(zlib.gzipSync(Buffer.from(JSON.stringify(obj)))), c.final()]); return Buffer.concat([Buffer.from([1]), iv, c.getAuthTag(), body]); };
const open = (key, buf) => { if (!buf || buf[0] !== 1) throw err('formato'); const d = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(1, 13)); d.setAuthTag(buf.subarray(13, 29)); return JSON.parse(zlib.gunzipSync(Buffer.concat([d.update(buf.subarray(29)), d.final()])).toString()); };
const normEmail = e => String(e || '').trim().toLowerCase();
const emailId = async e => crypto.createHmac('sha256', await master()).update('email:' + normEmail(e)).digest('hex').slice(0, 40);
const accKey = async () => hkdf(await master(), 'contas');

/* ---------- senhas, códigos e sessões ---------- */
const scrypt = (pw, salt) => new Promise((ok, ko) => crypto.scrypt(String(pw), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => e ? ko(e) : ok(k)));
const hashPw = async pw => { const s = crypto.randomBytes(16); return { s: s.toString('base64'), h: (await scrypt(pw, s)).toString('base64') }; };
const checkPw = async (pw, rec) => { if (!rec || !rec.s || !rec.h) return false; const a = await scrypt(pw, Buffer.from(rec.s, 'base64')), b = Buffer.from(rec.h, 'base64'); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { const b = crypto.randomBytes(16); let s = ''; for (let i = 0; i < 16; i++) s += ALPHA[b[i] % 32]; return s.match(/.{4}/g).join('-'); };
const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const TOKEN_DAYS = 60;
const signToken = async (rec, eid) => { const body = b64u(JSON.stringify({ u: rec.uid, a: eid, v: rec.tv || 1, x: Math.floor(Date.now() / 1000) + TOKEN_DAYS * 86400 }));
  return body + '.' + b64u(crypto.createHmac('sha256', await master()).update('sessao:' + body).digest()); };
const readToken = async req => { const m = String(req.headers.authorization || '').match(/^Bearer ([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/); if (!m) return null;
  const sig = crypto.createHmac('sha256', await master()).update('sessao:' + m[1]).digest(), got = unb64u(m[2]);
  if (got.length !== sig.length || !crypto.timingSafeEqual(got, sig)) return null;
  let t; try { t = JSON.parse(unb64u(m[1]).toString()); } catch (e) { return null; }
  if (!t || !/^[a-f0-9]{24}$/.test(t.u || '') || !/^[a-f0-9]{40}$/.test(t.a || '') || !(t.x > Date.now() / 1000)) return null;
  return t; };

/* ---------- pedidos HTTP ---------- */
const OK_ORIGIN = /^https:\/\/(oceanum|nautilo)(-[a-z0-9-]+)?\.vercel\.app$/;
const extraOrigins = () => String(process.env.NAUTILO_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const allowed = req => { const o = req.headers.origin || '', site = req.headers['sec-fetch-site'] || '', ref = ((req.headers.referer || '').match(/^https?:\/\/[^/]+/) || [''])[0];
  const good = x => OK_ORIGIN.test(x) || extraOrigins().includes(x) || (process.env.NAUTILO_STORE_DIR && /^http:\/\/localhost(:\d+)?$/.test(x));
  return o ? good(o) : (site === 'same-origin' || good(ref)); };
const HITS = new Map();
// travão simples por endereço (em cada instância do servidor): n pedidos por janela
const limit = (req, key, n, ms) => { const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim(), k = key + '|' + ip, now = Date.now();
  const h = (HITS.get(k) || []).filter(t => now - t < ms); h.push(now); HITS.set(k, h); if (HITS.size > 5000) HITS.delete(HITS.keys().next().value); return h.length > n; };
const body = async req => { if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const ct = req.headers['content-type'] || '', form = /x-www-form-urlencoded/i.test(ct), mb = (ct.match(/multipart\/form-data;\s*boundary="?([^";]+)"?/i) || [])[1];
  // o Formulário dos Atalhos do iPhone pode chegar como multipart: só os campos de texto
  const multi = t => { const o = {}; t.split('--' + mb).forEach(part => { const m = part.match(/name="([^"]+)"(?:;[^\r\n]*)?\r?\n(?:[^\r\n]+\r?\n)*\r?\n([\s\S]*?)\r?\n?$/); if (m && !/filename=/.test(part.split(/\r?\n\r?\n/)[0])) o[m[1]] = m[2]; }); return o; };
  const parse = t => { if (mb) return multi(t); if (form) return Object.fromEntries(new URLSearchParams(t)); try { return JSON.parse(t || '{}'); } catch (e) { return {}; } };
  if (typeof req.body === 'string') return parse(req.body);
  const chunks = []; let n = 0; for await (const c of req) { n += c.length; if (n > 4.4e6) throw err('grande', 'pedido grande demais', 413); chunks.push(c); }
  return parse(Buffer.concat(chunks).toString()); };
const send = (res, status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(JSON.stringify(obj)); };
// anyOrigin: aceita pedidos de fora da app (o atalho do iPhone, que se autentica pela chave); open: não precisa da base de dados
const handler = (fn, o = {}) => async (req, res) => {
  if (!o.anyOrigin && !allowed(req)) return send(res, 403, { ok: false, msg: 'Pedido recusado.' });
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (!o.open && !store()) return send(res, 503, { ok: false, msg: 'A base de dados das contas ainda não está ligada.' });
  try { await fn(req, res); }
  catch (e) { const st = e.status && e.status >= 400 && e.status < 600 ? e.status : 500; send(res, st, { ok: false, msg: st === 500 ? 'O servidor não conseguiu fazer isto agora. Tenta outra vez.' : e.message, code: e.code }); if (st === 500) console.error('nautilo', e.code || '', e.message); } };

// chave do atalho do iPhone de um perfil: (conta, perfil, versão) assinados; trocar a versão invalida a chave antiga
const atalhoTag = async body => crypto.createHmac('sha256', await master()).update('atalho:' + body).digest().subarray(0, 18);
const atalhoKey = async (eid, pid, n) => { const body = b64u(JSON.stringify({ a: eid, p: pid, n })); return body + '.' + b64u(await atalhoTag(body)); };

module.exports = { atalhoTag, atalhoKey, unb64u, b64u, store, master, userKey, accKey, seal, open, emailId, normEmail, hashPw, checkPw, newCode, normCode, signToken, readToken, limit, body, send, handler, err, sleep, crypto };
