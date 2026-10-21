// NÁUTILO · atalho de gastos do iPhone para todas as contas (função do Vercel). Faz o mesmo que a folha Google pessoal:
//   o atalho envia v (valor), d (descrição) e c (conta) com a chave do perfil → fica numa caixa de entrada cifrada;
//   a app vai lá buscar (op=pull) e confirma o que guardou (op=ack). Cada perfil tem a sua chave (Definições › Atalhos do iPhone).
'use strict';
const N = require('./_nuvem');
const tag = N.atalhoTag, unb64u = N.unb64u;
const readKey = async k => { const m = String(k || '').match(/^([A-Za-z0-9_-]{10,200})\.([A-Za-z0-9_-]{20,40})$/); if (!m) return null;
  const want = await tag(m[1]), got = unb64u(m[2]); if (got.length !== want.length || !N.crypto.timingSafeEqual(got, want)) return null;
  let o; try { o = JSON.parse(unb64u(m[1]).toString()); } catch (e) { return null; }
  if (!/^[a-f0-9]{40}$/.test(o.a || '') || !/^[a-f0-9]{12}$/.test(o.p || '')) return null;
  const g = await N.store().get('a/' + o.a); if (!g) return null; let r; try { r = N.open(await N.accKey(), g.buf); } catch (e) { return null; }
  const p = (r.perfis || []).find(x => x.id === o.p); if (!p || !p.ak || p.ak !== o.n) return null;
  return { uid: r.uid, pid: o.p }; };
const text = (res, status, s) => { res.statusCode = status; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(s); };

module.exports = N.handler(async (req, res) => {
  const b = Object.assign({}, req.query || {}, req.method === 'POST' ? await N.body(req) : {});
  if (N.limit(req, 'atalho', 120, 60e3)) return text(res, 429, 'Demasiados pedidos. Espera um minuto.');
  const who = await readKey(b.k); if (!who) return N.send(res, 403, { ok: false, msg: 'Chave do atalho inválida. Copia o link outra vez em Definições › Atalhos do iPhone.' });
  const s = N.store(), base = 'i/' + who.uid + '/' + who.pid + '/', key = await N.userKey(who.uid);
  if (b.op === 'ping') return N.send(res, 200, { ok: true, v: 3 });
  if (b.op === 'pull') { const L = (await s.list(base)).slice(0, 100), items = [];
    await Promise.all(L.map(async x => { const g = await s.get(x.pathname); if (!g) return; try { items.push(N.open(key, g.buf)); } catch (e) { } }));
    return N.send(res, 200, { ok: true, items: items.sort((a, c) => String(a.t).localeCompare(String(c.t))) }); }
  if (b.op === 'ack') { const ids = new Set(String(b.ids || '').split(',').filter(x => /^[a-z0-9-]{6,40}$/.test(x)));
    const L = (await s.list(base)).filter(x => ids.has(x.pathname.slice(base.length))); if (L.length) await s.del(L); return N.send(res, 200, { ok: true, n: L.length }); }
  // gasto novo (do atalho)
  const v = Number(String(b.v || '').replace(/[^0-9,.-]/g, '').replace(',', '.')); if (!(v > 0) || v > 1e7) return text(res, 400, 'Valor inválido');
  if ((await s.list(base)).length >= 500) return text(res, 429, 'A caixa do atalho está cheia: abre o Náutilo para os gastos entrarem.');
  const id = Date.now().toString(36) + '-' + N.crypto.randomBytes(5).toString('hex');
  await s.put(base + id, N.seal(key, { id, t: new Date().toISOString(), v, d: String(b.d || '').slice(0, 200), c: String(b.c || '').slice(0, 80) }), { overwrite: false });
  text(res, 200, '✓ ' + String(v).replace('.', ',') + ' € registado no Náutilo');
}, { anyOrigin: true });
