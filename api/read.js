// NÁUTILO · leitor de notícias (função do Vercel). Recebe o link de uma notícia (Google Notícias ou do jornal),
// descobre o artigo original e devolve só o texto limpo (título, parágrafos, imagem), para ler dentro da app.
// Segurança: só endereços públicos http(s) (nada de IPs internos), no máximo 5 redirecionamentos, 8 s e 3 MB;
// nunca devolve o HTML do site, só texto; só responde à própria app.
const dns = require('dns').promises, net = require('net');
const OK = /^https:\/\/(oceanum|nautilo)(-[a-z0-9-]+)?\.vercel\.app$/;
const CACHE = new Map(), HITS = new Map();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const privado = ip => { if (net.isIPv4(ip)) { const [a, b] = ip.split('.').map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224; }
  // IPv6: só endereços públicos (2000::/3), sem os que escondem um IPv4 (::ffff:7f00:1, 64:ff9b::, 2002::) nem os de documentação
  const x = ip.toLowerCase().replace(/^\[|\]$/g, ''), m = /^::ffff:(?:([0-9.]+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/.exec(x);
  if (m) return m[1] ? privado(m[1]) : privado([parseInt(m[2], 16) >> 8, parseInt(m[2], 16) & 255, parseInt(m[3], 16) >> 8, parseInt(m[3], 16) & 255].join('.')) || true;
  return !/^[23][0-9a-f]{0,3}:/.test(x) || /^2001:0?db8:/.test(x) || /^2002:/.test(x) || /^64:ff9b:/.test(x); };
const seguro = async u => { let url; try { url = new URL(u); } catch (e) { return null; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) return null;
  const h = url.hostname.replace(/^\[|\]$/g, ''); if (/^(localhost|.*\.local|.*\.internal)$/i.test(h)) return null;
  if (net.isIP(h)) return privado(h) ? null : url;
  try { const r = await dns.lookup(h, { all: true }); if (!r.length || r.some(a => privado(a.address))) return null; } catch (e) { return null; }
  return url; };
const pedir = async (u, opt = {}) => { let url = await seguro(u); if (!url) throw new Error('endereço não permitido');
  for (let i = 0; i < 6; i++) { const ac = new AbortController(), to = setTimeout(() => ac.abort(), 8000);
    let r; try { r = await fetch(url, { redirect: 'manual', signal: ac.signal, method: opt.method || 'GET', body: opt.body, headers: Object.assign({ 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.6', Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' }, opt.headers || {}) }); }
    finally { clearTimeout(to); }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { url = await seguro(new URL(r.headers.get('location'), url).href); if (!url) throw new Error('redirecionamento não permitido'); continue; }
    const rd = r.body.getReader(), parts = []; let n = 0; for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; if (n > 3e6) { try { rd.cancel(); } catch (e) { } break; } parts.push(value); }
    return { url: url.href, status: r.status, ct: r.headers.get('content-type') || '', text: Buffer.concat(parts.map(p => Buffer.from(p))).toString('utf8') }; }
  throw new Error('demasiados redirecionamentos'); };
// links do Google Notícias: o id é base64; os antigos trazem o endereço lá dentro, os novos pedem-no ao Google
const googleNews = async u => { const m = /news\.google\.com\/(?:rss\/)?articles\/([A-Za-z0-9_-]+)/.exec(u); if (!m) return u; const id = m[1];
  try { const raw = Buffer.from(id.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('latin1'), d = /https?:\/\/[^\s\x00-\x1f"]+/.exec(raw); if (d && !/^AU_yqL/.test(raw.slice(4))) return d[0]; } catch (e) { }
  const pg = await pedir('https://news.google.com/rss/articles/' + id), sg = /data-n-a-sg="([^"]+)"/.exec(pg.text), ts = /data-n-a-ts="([^"]+)"/.exec(pg.text); if (!sg || !ts) throw new Error('o Google Notícias não deu o endereço');
  const req = [[['Fbv4je', JSON.stringify(['garturlreq', [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, +ts[1], sg[1]]), null, 'generic']]];
  const r = await pedir('https://news.google.com/_/DotsSplashUi/data/batchexecute', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: 'f.req=' + encodeURIComponent(JSON.stringify(req)) });
  const j = JSON.parse(r.text.split('\n\n')[1]), url = JSON.parse(j[0][2])[1]; if (!/^https?:\/\//.test(url)) throw new Error('endereço inválido'); return url; };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ccedil: 'ç', atilde: 'ã', otilde: 'õ', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', agrave: 'à', ecirc: 'ê', ocirc: 'ô', acirc: 'â', Ccedil: 'Ç', Atilde: 'Ã', Aacute: 'Á', Eacute: 'É', Oacute: 'Ó', ordm: 'º', ordf: 'ª', euro: '€' };
const dec = s => String(s || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? (() => { try { return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)); } catch (x) { return ''; } })() : ENT[e] != null ? ENT[e] : m);
const limpo = s => dec(String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const meta = (h, k) => { const m = new RegExp('<meta[^>]+(?:property|name)=["\']' + k + '["\'][^>]*>', 'i').exec(h); if (!m) return ''; const c = /content=["']([^"']*)["']/i.exec(m[0]); return c ? dec(c[1]).trim() : ''; };
const extrair = (html, url) => { const out = { t: meta(html, 'og:title') || limpo((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || ''), s: meta(html, 'og:site_name') || new URL(url).hostname.replace(/^www\./, ''), img: meta(html, 'og:image'), d: meta(html, 'article:published_time'), desc: meta(html, 'og:description') || meta(html, 'description'), p: [] };
  // 1) o texto do artigo nos dados estruturados (muitos jornais trazem o "articleBody" completo)
  let body = ''; (html.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) || []).forEach(s => { try { const walk = o => { if (!o || typeof o !== 'object') return; if (typeof o.articleBody === 'string' && o.articleBody.length > body.length) body = o.articleBody; Object.values(o).forEach(walk); }; walk(JSON.parse(s.replace(/^<script[^>]*>|<\/script>$/gi, ''))); } catch (e) { } });
  // 2) os parágrafos dentro do <article> (ou da página toda), sem menus, rodapés, anúncios e scripts
  let h = html.replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|button|iframe|figure)[\s\S]*?<\/\1>/gi, ' ');
  const arts = h.match(/<article[\s\S]*?<\/article>/gi); if (arts) h = arts.sort((a, b) => b.length - a.length)[0];
  const seen = new Set(), ps = []; (h.match(/<(p|h2|h3|li|blockquote)[^>]*>[\s\S]*?<\/\1>/gi) || []).forEach(x => { const tag = /^<(\w+)/.exec(x)[1].toLowerCase(), t = limpo(x); if (!t || seen.has(t)) return; if (tag === 'li' && t.length < 60) return; if ((tag === 'p' || tag === 'blockquote') && t.length < 40) return; if (/^(publicidade|leia também|leia mais|veja também|subscreva|assine|partilhe|compartilhe|siga-nos|newsletter|cookies?)\b/i.test(t)) return; seen.add(t); ps.push((tag === 'h2' || tag === 'h3') ? '## ' + t : t); });
  const fromP = ps.filter(x => !x.startsWith('## ')).join(' ').length, fromLd = body.length;
  out.p = (fromLd > fromP * 0.8 && fromLd > 300 ? limpo(body).split(/\n+/) : ps).map(x => x.trim()).filter(Boolean).slice(0, 120);
  let n = 0; out.p = out.p.filter(x => (n += x.length) < 40000); return out; };
module.exports = async (req, res) => {
  const origin = req.headers.origin || '', ref = req.headers.referer || '', site = req.headers['sec-fetch-site'] || '';
  // só a própria app: pedido do mesmo site (o navegador marca-o) ou com origem/referência da app; o resto é recusado
  const mine = OK.test(origin) || (!origin && (site === 'same-origin' || OK.test((ref.match(/^https:\/\/[^/]+/) || [''])[0])));
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!mine) { res.statusCode = 403; return res.end('{"ok":false}'); }
  // travão contra abusos: no máximo 40 pedidos por minuto por endereço
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim(), now = Date.now(), h = HITS.get(ip) || [];
  const recent = h.filter(t => now - t < 60000); recent.push(now); HITS.set(ip, recent); if (HITS.size > 2000) HITS.delete(HITS.keys().next().value);
  if (recent.length > 40) { res.statusCode = 429; return res.end('{"ok":false,"msg":"demasiados pedidos"}'); }
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  const u = String((req.query && req.query.u) || '').slice(0, 2000); if (!/^https?:\/\//.test(u)) { res.statusCode = 400; return res.end('{"ok":false,"msg":"falta o endereço"}'); }
  const c = CACHE.get(u); if (c && Date.now() - c.t < 15 * 60000) { res.setHeader('Cache-Control', 'public, s-maxage=900, max-age=300'); return res.end(c.v); }
  try { const real = await googleNews(u), pg = await pedir(real);
    if (!/html|xml/i.test(pg.ct)) throw new Error('não é uma página de notícia');
    const a = extrair(pg.text, pg.url), v = JSON.stringify(Object.assign({ ok: true, u: pg.url }, a));
    CACHE.set(u, { t: Date.now(), v }); if (CACHE.size > 300) CACHE.delete(CACHE.keys().next().value);
    res.setHeader('Cache-Control', 'public, s-maxage=900, max-age=300'); res.end(v);
  } catch (e) { res.statusCode = 200; res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify({ ok: false, msg: String(e && e.message || e).slice(0, 160) })); }
};
