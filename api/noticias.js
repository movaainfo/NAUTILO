// NÁUTILO · Jornal para todas as contas (função do Vercel): Google Notícias por edição, tema ou pesquisa,
// no mesmo formato que o script Google pessoal devolve ({ nw: { id: [notícias] } }). Guardado 4 min; só responde à própria app.
'use strict';
const N = require('./_nuvem');
const CACHE = new Map(), TTL = 240e3;
const BASE = () => process.env.NAUTILO_RSS_BASE || 'https://news.google.com';
const ED = /^hl=[A-Za-z-]{2,8}&gl=[A-Z]{2}&ceid=[A-Z]{2}:[A-Za-z0-9-]{2,8}$/;
const urlOf = f => { const ed = ED.test(f.ed || '') ? f.ed : 'hl=pt-PT&gl=PT&ceid=PT:pt-150';
  if (f.q) return BASE() + '/rss/search?q=' + encodeURIComponent(String(f.q).slice(0, 120) + ' when:2d') + '&' + ed;
  if (f.t && f.t !== 'TOP' && /^[A-Za-z0-9_-]{2,80}$/.test(f.t)) return BASE() + '/rss/headlines/section/topic/' + f.t + '?' + ed;
  return BASE() + '/rss?' + ed; };
const txt = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
const rss = xml => { const out = [], re = /<item>([\s\S]*?)<\/item>/g; let m;
  while ((m = re.exec(xml)) && out.length < 40) { const it = m[1], g = tag => { const x = it.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>')); return x ? txt(x[1]) : ''; };
    const src = it.match(/<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/), title = g('title'), sn = src ? txt(src[2]) : '', desc = g('description'), rel = [];
    const rr = /<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>(?:&nbsp;|\s)*<font[^>]*>([\s\S]*?)<\/font>/g; let r2; while ((r2 = rr.exec(desc)) && rel.length < 5) rel.push({ l: r2[1], t: txt(r2[2].replace(/<[^>]+>/g, '')), s: txt(r2[3]) });
    out.push({ t: sn && title.slice(-(sn.length + 3)) === ' - ' + sn ? title.slice(0, -(sn.length + 3)) : title, s: sn, su: src ? src[1] : '', l: g('link'), d: Date.parse(g('pubDate')) || 0, rel: rel.slice(1) }); }
  return out; };
const get = async u => { const c = CACHE.get(u); if (c && Date.now() - c.at < TTL) return c.v;
  let v = []; try { const ac = new AbortController(), to = setTimeout(() => ac.abort(), 8000);
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (NAUTILO)', Accept: 'application/rss+xml, text/xml' }, signal: ac.signal }); clearTimeout(to);
    if (r.ok) v = rss(await r.text()); } catch (e) { }
  if (v.length) { CACHE.set(u, { at: Date.now(), v }); if (CACHE.size > 400) CACHE.delete(CACHE.keys().next().value); }
  return v; };

module.exports = N.handler(async (req, res) => {
  if (N.limit(req, 'noticias', 120, 60e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos.' });
  const q = req.method === 'POST' ? await N.body(req) : (req.query || {}); let fs = [];
  try { fs = typeof q.f === 'string' ? JSON.parse(q.f) : Array.isArray(q.f) ? q.f : []; } catch (e) { }
  fs = fs.filter(f => f && typeof f.id === 'string' && f.id.length < 120).slice(0, 10);
  const nw = {}; await Promise.all(fs.map(async f => { nw[f.id] = await get(urlOf(f)); }));
  N.send(res, 200, { ok: true, nw });
}, { open: true });
