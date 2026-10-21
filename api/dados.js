// NÁUTILO · dados de cada perfil (função do Vercel). O motor de dados da app guarda "documentos" (um por fragmento de coleção
// e um por definição) e aqui cada um vai para o Vercel Blob privado, cifrado com a chave da conta.
//   marca  → a etiqueta da última alteração (os aparelhos perguntam isto a cada 20 s; é a operação mais barata)
//   todas confirmam que a sessão ainda vale e que o perfil é da conta
//   lista  → etiqueta de cada documento (para saber quais mudaram)
//   ler    → o conteúdo dos documentos pedidos (em partes, se for muito)
//   gravar → guarda documentos e mexe na marca
'use strict';
const N = require('./_nuvem');
const OKS = new Map(), TTL = process.env.NAUTILO_CACHE_MS != null ? +process.env.NAUTILO_CACHE_MS : 30000;
const DOC = /^[A-Za-z0-9_]{1,48}~[A-Za-z0-9_]{1,48}$/, PID = /^[a-f0-9]{12}$/, MAX_OUT = 3.2e6;
const pool = async (items, n, fn) => { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; };

module.exports = N.handler(async (req, res) => {
  const t = await N.readToken(req); if (!t) return N.send(res, 401, { ok: false, msg: 'A sessão terminou. Entra outra vez.', code: 'sessao' });
  const b = req.method === 'POST' ? await N.body(req) : (req.query || {}), op = b.op, pid = String(b.p || '');
  if (!PID.test(pid)) return N.send(res, 400, { ok: false, msg: 'Perfil inválido.' });
  if (N.limit(req, 'dados', 900, 600e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos. Espera um pouco.' });
  const s = N.store(), base = 'd/' + t.u + '/' + pid + '/', mark = 'm/' + t.u + '/' + pid;

  // confirma que a sessão ainda vale (senha mudada / "sair de todos") e que o perfil é desta conta (guardado 30 s em cada servidor)
  { const k = t.u + '|' + t.v + '|' + pid, c = OKS.get(k);
    if (!c || Date.now() - c > TTL) { const g = await s.get('a/' + t.a); let r = null; try { r = g && N.open(await N.accKey(), g.buf); } catch (e) { }
      if (!r || r.uid !== t.u || (r.tv || 1) !== t.v) return N.send(res, 401, { ok: false, msg: 'A sessão terminou. Entra outra vez.', code: 'sessao' });
      if (!(r.perfis || []).some(x => x.id === pid)) return N.send(res, 404, { ok: false, msg: 'Este perfil já não existe.', code: 'perfil' });
      OKS.set(k, Date.now()); if (OKS.size > 3000) OKS.delete(OKS.keys().next().value); } }

  if (op === 'marca') { const h = await s.head(mark); return N.send(res, 200, { ok: true, m: h ? h.etag : '' }); }

  if (op === 'lista') { const docs = {}; (await s.list(base)).forEach(x => { docs[x.pathname.slice(base.length)] = x.etag; }); const h = await s.head(mark); return N.send(res, 200, { ok: true, docs, m: h ? h.etag : '' }); }

  if (op === 'ler' && req.method === 'POST') {
    const ids = (Array.isArray(b.ids) ? b.ids : []).filter(id => DOC.test(id)).slice(0, 3000), key = await N.userKey(t.u), docs = {}, etags = {}; let size = 0, mais = [];
    // lê em paralelo, mas pára de juntar quando a resposta já vai grande (o resto vem no pedido seguinte)
    const got = await pool(ids, 12, async id => { const g = await s.get(base + id); return g ? { id, g } : { id, g: null }; });
    for (const x of got) { if (!x.g) continue; if (size > MAX_OUT) { mais.push(x.id); continue; }
      try { docs[x.id] = N.open(key, x.g.buf); etags[x.id] = x.g.etag; size += JSON.stringify(docs[x.id]).length; } catch (e) { } }
    return N.send(res, 200, { ok: true, docs, etags, mais }); }

  if (op === 'gravar' && req.method === 'POST') {
    const D = b.docs && typeof b.docs === 'object' ? b.docs : {}, ids = Object.keys(D).filter(id => DOC.test(id) && D[id] && typeof D[id] === 'object');
    if (!ids.length) return N.send(res, 400, { ok: false, msg: 'Nada para gravar.' });
    if (ids.length > 400) return N.send(res, 413, { ok: false, msg: 'Envia em partes mais pequenas.' });
    const key = await N.userKey(t.u), etags = {};
    await pool(ids, 10, async id => { const r = await s.put(base + id, N.seal(key, D[id])); etags[id] = r.etag; });
    const m = await s.put(mark, Buffer.from(String(Date.now())));
    return N.send(res, 200, { ok: true, etags, m: m.etag }); }

  N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' });
});
