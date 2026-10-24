// NÁUTILO · Gmail e agenda Google para todas as contas, sem script (função do Vercel).
// A pessoa toca em "Ligar a minha conta Google", autoriza uma vez no Google e a autorização (refresh token) fica guardada
// cifrada no perfil dela (g/<conta>/<perfil>), por isso funciona em todos os aparelhos. Só leitura: gmail.readonly e calendar.readonly.
// Os e-mails e eventos passam por aqui a caminho da app e não ficam guardados no servidor.
//   inicio → o endereço do Google para autorizar (com um "state" assinado: a que perfil pertence, válido 15 min)
//   GET ?code=&state= → o Google volta aqui: troca o code, guarda e mostra "pronto, volta ao Náutilo"
//   estado → ligado? com que e-mail? · gm → e-mails (pesquisa do Gmail) · gx → um e-mail inteiro · cl → eventos · sair → desliga
// O ID de cliente é público; a chave secreta só existe nas variáveis do projeto (GOOGLE_CLIENT_SECRET).
'use strict';
const N = require('./_nuvem');
const CID = () => process.env.GOOGLE_CLIENT_ID || '298711842985-i89rgem2i0gq35lse2fvsc0pmmai5cr8.apps.googleusercontent.com';
const SECRET = () => String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
const REDIR = () => process.env.GOOGLE_REDIRECT || 'https://nautilo-app.vercel.app/api/google';
const APP = () => REDIR().replace(/api\/google$/, '');
const AUTH = () => process.env.GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth';
const TOK = () => process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const REVOKE = () => process.env.GOOGLE_REVOKE_URL || 'https://oauth2.googleapis.com/revoke';
const GAPI = () => process.env.GOOGLE_API || 'https://www.googleapis.com/';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly';
const PID = /^[a-f0-9]{12}$/, STATE_MIN = 15;
const OKS = new Map(), TK = new Map();
const pool = async (items, n, fn) => { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; };
const linkPath = (uid, pid) => 'g/' + uid + '/' + pid;

/* ---------- quem pede: sessão válida e perfil desta conta (como em api/dados) ---------- */
const checkProfile = async (t, pid) => { const k = t.u + '|' + t.v + '|' + pid, c = OKS.get(k); if (c && Date.now() - c < 30e3) return true;
  const g = await N.store().get('a/' + t.a); let r = null; try { r = g && N.open(await N.accKey(), g.buf); } catch (e) { }
  if (!r || r.uid !== t.u || (r.tv || 1) !== t.v) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
  if (!(r.perfis || []).some(x => x.id === pid)) throw N.err('perfil', 'Este perfil já não existe.', 404);
  OKS.set(k, Date.now()); if (OKS.size > 3000) OKS.delete(OKS.keys().next().value); return true; };

/* ---------- state assinado: diz ao regresso do Google a que perfil pertence a autorização ---------- */
const stateTag = async body => N.crypto.createHmac('sha256', await N.master()).update('google:' + body).digest().subarray(0, 18);
const makeState = async (t, pid) => { const body = N.b64u(JSON.stringify({ u: t.u, a: t.a, v: t.v, p: pid, x: Math.floor(Date.now() / 1000) + STATE_MIN * 60, n: N.b64u(N.crypto.randomBytes(6)) })); return body + '.' + N.b64u(await stateTag(body)); };
const readState = async s => { const m = String(s || '').match(/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/); if (!m) return null;
  const want = await stateTag(m[1]), got = N.unb64u(m[2]); if (got.length !== want.length || !N.crypto.timingSafeEqual(got, want)) return null;
  let o; try { o = JSON.parse(N.unb64u(m[1]).toString()); } catch (e) { return null; }
  return o && PID.test(o.p || '') && o.x > Date.now() / 1000 ? o : null; };

/* ---------- a ligação guardada e o token de acesso (1 hora, guardado só na memória deste servidor) ---------- */
const readLink = async (uid, pid) => { const g = await N.store().get(linkPath(uid, pid)); if (!g) return null; try { return N.open(await N.userKey(uid), g.buf); } catch (e) { return null; } };
const dropLink = async (uid, pid) => { TK.delete(uid + '|' + pid); const s = N.store(), p = linkPath(uid, pid); if (await s.head(p)) await s.del([p]); };
const form = o => new URLSearchParams(o).toString();
const accessToken = async (uid, pid, fresh) => { const k = uid + '|' + pid, c = TK.get(k); if (c && !fresh && c.x > Date.now() + 60e3) return c.tk;
  const L = await readLink(uid, pid); if (!L || !L.rt) throw N.err('desligado', 'A conta Google não está ligada.', 409);
  const r = await fetch(TOK(), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form({ client_id: CID(), client_secret: SECRET(), refresh_token: L.rt, grant_type: 'refresh_token' }) });
  const j = await r.json().catch(() => ({}));
  if (j.error === 'invalid_grant') { await dropLink(uid, pid); throw N.err('desligado', 'O Google retirou o acesso (autorização cancelada ou expirada). Liga a conta Google outra vez.', 409); }
  if (!r.ok || !j.access_token) throw N.err('google', 'O Google não respondeu agora. Tenta daqui a um minuto.', 502);
  TK.set(k, { tk: j.access_token, x: Date.now() + (+j.expires_in || 3600) * 1000 }); if (TK.size > 3000) TK.delete(TK.keys().next().value); return j.access_token; };
// pedido à API do Google: se o token caducar a meio pede outro (uma vez); se o Google pedir calma, espera e tenta de novo
const gget = async (uid, pid, p) => { let fresh = false;
  for (let i = 0; i < 4; i++) { const tk = await accessToken(uid, pid, fresh); fresh = false;
    const r = await fetch(GAPI() + p, { headers: { authorization: 'Bearer ' + tk } }); const j = await r.json().catch(() => ({}));
    if (r.ok) return j; const msg = (j.error && j.error.message) || '';
    if (r.status === 401) { if (i === 0) { fresh = true; continue; } throw N.err('desligado', 'A autorização do Google deixou de valer. Liga a conta Google outra vez.', 409); }
    if ((r.status === 429 || (r.status === 403 && /rate ?limit|quota/i.test(msg))) && i < 3) { await N.sleep(700 * (i + 1)); continue; }
    if (r.status === 403 && /has not been used|is disabled|not enabled|accessNotConfigured/i.test(msg + JSON.stringify(j.error || {}))) throw N.err('api', 'A API ' + (/calendar/.test(p) ? 'do Google Calendar' : 'do Gmail') + ' não está ativada no projeto Google do Náutilo (Google Cloud → APIs e serviços → Biblioteca → Ativar).', 503);
    if (r.status === 403 && /insufficient|scope|permission/i.test(msg)) throw N.err('escopo', 'Na autorização do Google ficou por marcar a caixa do Gmail ou da agenda. Desliga e liga outra vez, com as caixas marcadas.', 403);
    if (r.status === 404) throw N.err('nao_encontrado', 'Não encontrei isto no Google (pode ter sido apagado).', 404);
    if (r.status === 429 || r.status === 403) throw N.err('limite', 'O Google pediu para esperar um pouco. Tenta daqui a um minuto.', 429);
    throw N.err('google', 'O Google não respondeu agora (' + r.status + '). Tenta outra vez.', 502); }
  throw N.err('limite', 'O Google pediu para esperar um pouco. Tenta daqui a um minuto.', 429); };

/* ---------- Gmail ---------- */
const ent = s => String(s || '').replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const hdr = (m, k) => { const h = ((m && m.payload && m.payload.headers) || []).find(x => String(x.name).toLowerCase() === k); return h ? String(h.value || '') : ''; };
const when = m => { const n = +(m && m.internalDate); return new Date(n > 0 ? n : Date.now()).toISOString(); };
const listMail = async (uid, pid, q, n) => { n = Math.max(1, Math.min(50, +n || 30));
  const L = await gget(uid, pid, 'gmail/v1/users/me/threads?' + form({ q: String(q || 'in:inbox newer_than:3d').slice(0, 300), maxResults: n }));
  const ids = (L.threads || []).map(t => t.id).filter(id => /^[A-Za-z0-9_-]{6,40}$/.test(id)).slice(0, n);
  const meta = 'format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date';
  const T = await pool(ids, 4, async id => { try { return await gget(uid, pid, 'gmail/v1/users/me/threads/' + id + '?' + meta); } catch (e) { if (e.code === 'desligado' || e.code === 'escopo' || e.code === 'api') throw e; return null; } });
  return T.filter(Boolean).map(th => { const ms = th.messages || [], first = ms[0] || {}, last = ms[ms.length - 1] || {}, has = l => ms.some(m => (m.labelIds || []).includes(l));
    return { id: th.id, s: hdr(first, 'subject'), f: hdr(last, 'from'), to: hdr(last, 'to'), d: when(last), u: has('UNREAD'), n: ms.length, imp: has('IMPORTANT'), st: has('STARRED'), l: [], sn: ent(last.snippet || '').replace(/\s+/g, ' ').slice(0, 500) }; }); };
// corpo do e-mail: o texto e o HTML de cada mensagem (as partes MIME vêm em base64url) e os nomes dos anexos
const dec = (data, ct) => { const buf = Buffer.from(String(data || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64'), cs = (String(ct || '').match(/charset="?([^";]+)/i) || [])[1] || 'utf-8';
  try { return new TextDecoder(cs.toLowerCase()).decode(buf); } catch (e) { return buf.toString('utf8'); } };
const walk = (p, o) => { if (!p) return o; const mt = String(p.mimeType || '').toLowerCase(), ct = ((p.headers || []).find(h => /^content-type$/i.test(h.name)) || {}).value || '';
  if (p.filename && p.body && (p.body.attachmentId || p.body.size)) { if (o.at.length < 10) o.at.push(String(p.filename).slice(0, 120)); }
  else if (mt === 'text/plain' && p.body && p.body.data && !o.b) o.b = dec(p.body.data, ct);
  else if (mt === 'text/html' && p.body && p.body.data && !o.h) o.h = dec(p.body.data, ct);
  (p.parts || []).forEach(x => walk(x, o)); return o; };
const strip = h => ent(String(h || '').replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*/g, '\n\n').trim();
const readMail = async (uid, pid, id) => { if (!/^[A-Za-z0-9_-]{6,40}$/.test(String(id || ''))) throw N.err('id', 'E-mail inválido.', 400);
  const th = await gget(uid, pid, 'gmail/v1/users/me/threads/' + id + '?format=full'), ms = (th.messages || []).slice(-8);
  const t = ms.map(m => { const o = walk(m.payload, { b: '', h: '', at: [] }); return { id: m.id, f: hdr(m, 'from'), to: hdr(m, 'to'), cc: hdr(m, 'cc'), d: when(m), s: hdr(m, 'subject'), b: (o.b || strip(o.h)).slice(0, 60000), h: o.h.slice(0, 150000), at: o.at }; });
  return { s: hdr((th.messages || [])[0], 'subject'), t }; };

/* ---------- agenda: todas as agendas visíveis, como o script ---------- */
const DAY = /^\d{4}-\d\d-\d\d$/;
const listEvents = async (uid, pid, a, b) => { const from = DAY.test(a || '') ? a : new Date().toISOString().slice(0, 10), to = DAY.test(b || '') ? b : new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  const tMin = new Date(Date.parse(from + 'T00:00:00Z') - 864e5).toISOString(), tMax = new Date(Date.parse(to + 'T23:59:59Z') + 864e5).toISOString();
  const cals = ((await gget(uid, pid, 'calendar/v3/users/me/calendarList?' + form({ minAccessRole: 'reader', maxResults: 50 }))).items || []).filter(c => !c.hidden && c.selected !== false && c.id).slice(0, 20);
  const out = [];
  await pool(cals, 5, async c => { let j; try { j = await gget(uid, pid, 'calendar/v3/calendars/' + encodeURIComponent(c.id) + '/events?' + form({ timeMin: tMin, timeMax: tMax, singleEvents: 'true', orderBy: 'startTime', maxResults: 250 })); } catch (e) { if (e.code === 'desligado' || e.code === 'escopo' || e.code === 'api') throw e; return; }
    (j.items || []).forEach(e => { if (e.status === 'cancelled' || !e.start) return; const all = !!e.start.date && !e.start.dateTime;
      out.push({ id: String(e.id || ''), t: e.summary || '', s: all ? e.start.date + 'T00:00:00' : e.start.dateTime, e: all ? String((e.end && e.end.date) || e.start.date) + 'T00:00:00' : (e.end && e.end.dateTime) || e.start.dateTime, all, loc: e.location || '', cal: c.summaryOverride || c.summary || '' }); }); });
  return out.sort((x, y) => String(x.s).localeCompare(String(y.s))).slice(0, 600); };

/* ---------- a chave secreta vale? (troca um code de mentira: "invalid_grant" = cliente e chave certos) ---------- */
let SEG = { at: 0, v: '', e: '' };
const checkSecret = async () => { if (!SECRET()) return { v: 'falta', e: '' }; if (SEG.v && Date.now() - SEG.at < 10 * 60e3) return SEG;
  try { const r = await fetch(TOK(), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form({ code: 'nautilo-verificacao', client_id: CID(), client_secret: SECRET(), redirect_uri: REDIR(), grant_type: 'authorization_code' }) });
    const j = await r.json().catch(() => ({})), e = String(j.error || '').slice(0, 40);
    SEG = { at: Date.now(), e, v: e === 'invalid_grant' ? 'ok' : e === 'invalid_client' || e === 'unauthorized_client' ? 'errada' : e === 'redirect_uri_mismatch' ? 'redirecionamento' : 'desconhecido' }; }
  catch (e) { return { v: 'desconhecido', e: 'rede' }; }
  return SEG; };

/* ---------- o regresso do Google (GET no navegador da pessoa) ---------- */
const page = (res, ok, title, text) => { res.statusCode = ok ? 200 : 400; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
  const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  res.end(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} · Náutilo</title>
<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070D16;color:#C9D2DD;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box}
main{max-width:430px}h1{font:500 30px/1.15 Georgia,"Times New Roman",serif;color:#F1F4F8;margin:0 0 10px}p{margin:0 0 18px}a{display:inline-block;background:#F2C48D;color:#0B1522;text-decoration:none;font-weight:600;border-radius:999px;padding:11px 20px}
a:focus-visible{outline:2px solid #F1F4F8;outline-offset:3px}small{display:block;margin-top:16px;color:#7A8BA0;font-size:13px}</style></head>
<body><main id="g-${ok ? 'ok' : 'erro'}"><h1>${e(title)}</h1><p>${e(text)}</p><p>Já podes fechar esta janela (no iPhone: <b>OK</b> ou <b>Concluído</b>, em cima) e voltar ao Náutilo.</p><a href="${e(APP())}#definicoes.email">Abrir o Náutilo</a></main></body></html>`); };
const callback = async (req, res, q) => {
  const st = await readState(q.state);
  if (!st) return page(res, false, 'O pedido expirou', 'Passaram mais de ' + STATE_MIN + ' minutos ou o endereço não é válido. Volta ao Náutilo e toca outra vez em "Ligar a minha conta Google".');
  if (q.error) return page(res, false, 'Não ficou ligado', q.error === 'access_denied' ? 'Cancelaste a autorização no Google. Nada foi ligado.' : 'O Google não autorizou (' + String(q.error).slice(0, 40) + ').');
  if (!SECRET()) return page(res, false, 'Ainda não está pronto', 'A ligação ao Google ainda não está configurada no servidor do Náutilo.');
  try { await checkProfile({ u: st.u, a: st.a, v: st.v }, st.p); } catch (e) { return page(res, false, 'Não ficou ligado', 'A sessão do Náutilo terminou entretanto. Entra outra vez e liga de novo.'); }
  const r = await fetch(TOK(), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form({ code: String(q.code || ''), client_id: CID(), client_secret: SECRET(), redirect_uri: REDIR(), grant_type: 'authorization_code' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) return page(res, false, 'Não ficou ligado', 'O Google não aceitou o pedido (' + String(j.error || r.status).slice(0, 40) + '). Tenta outra vez daqui a uns minutos.');
  const old = await readLink(st.u, st.p), rt = j.refresh_token || (old && old.rt);
  if (!rt) return page(res, false, 'Falta um passo', 'O Google não deu a autorização permanente. Em myaccount.google.com → Segurança → Apps com acesso, remove o Náutilo e liga outra vez.');
  const sc = String(j.scope || SCOPES); let email = '';
  if (/gmail\.readonly/.test(sc)) { try { const pr = await fetch(GAPI() + 'gmail/v1/users/me/profile', { headers: { authorization: 'Bearer ' + j.access_token } }); if (pr.ok) email = String((await pr.json()).emailAddress || '').slice(0, 200); } catch (e) { } }
  await N.store().put(linkPath(st.u, st.p), N.seal(await N.userKey(st.u), { rt, sc, email, at: new Date().toISOString() }));
  TK.set(st.u + '|' + st.p, { tk: j.access_token, x: Date.now() + (+j.expires_in || 3600) * 1000 });
  const gm = /gmail\.readonly/.test(sc), cal = /calendar\.readonly/.test(sc);
  return page(res, true, 'Conta Google ligada', (email ? email + ': ' : '') + (gm && cal ? 'o Náutilo já pode ler o teu Gmail e a tua agenda.' : gm ? 'o Náutilo já pode ler o teu Gmail (a agenda ficou por marcar).' : cal ? 'o Náutilo já pode ler a tua agenda (o Gmail ficou por marcar).' : 'ligada, mas sem o Gmail nem a agenda marcados.') + ''); };

module.exports = N.handler(async (req, res) => {
  const q = req.query || {};
  if (req.method === 'GET' && q.state && (q.code || q.error)) return callback(req, res, q);
  if (req.method === 'GET' && q.p === 'estado') { if (!N.allowed(req)) return N.send(res, 403, { ok: false, msg: 'Pedido recusado.' }); if (N.limit(req, 'gestado', 20, 60e3)) return N.send(res, 429, { ok: false, msg: 'Espera um pouco.' });
    const c = await checkSecret(); return N.send(res, 200, { ok: true, pronto: !!SECRET(), chave: c.v, erro: c.e }); }
  // o resto só vem da app (o regresso do Google é a única entrada de fora)
  if (!N.allowed(req)) return N.send(res, 403, { ok: false, msg: 'Pedido recusado.' });
  if (req.method !== 'POST') return N.send(res, 405, { ok: false, msg: 'Só POST.' });
  const t = await N.readToken(req); if (!t) return N.send(res, 401, { ok: false, msg: 'A sessão terminou. Entra outra vez.', code: 'sessao' });
  const b = await N.body(req), op = String(b.op || ''), pid = String(b.p || '');
  if (!PID.test(pid)) return N.send(res, 400, { ok: false, msg: 'Perfil inválido.' });
  if (N.limit(req, 'google|' + t.u, 90, 60e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos ao Google. Espera um pouco.' });
  await checkProfile(t, pid);
  const pronto = !!SECRET();
  if (op === 'estado') { const L = pronto ? await readLink(t.u, pid) : null; const sc = (L && L.sc) || '';
    return N.send(res, 200, { ok: true, pronto, ligado: !!(L && L.rt), email: (L && L.email) || '', gmail: /gmail\.readonly/.test(sc), agenda: /calendar\.readonly/.test(sc) }); }
  if (!pronto) return N.send(res, 503, { ok: false, code: 'config', msg: 'A ligação ao Google ainda não está ativa no servidor do Náutilo.' });
  if (op === 'inicio') { const hint = String(b.email || '').trim().toLowerCase();
    const url = AUTH() + '?' + form(Object.assign({ client_id: CID(), redirect_uri: REDIR(), response_type: 'code', scope: SCOPES, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: await makeState(t, pid) }, /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(hint) ? { login_hint: hint } : {}));
    return N.send(res, 200, { ok: true, url, validade: STATE_MIN * 60 }); }
  if (op === 'gm') return N.send(res, 200, { ok: true, gm: await listMail(t.u, pid, b.q, b.n) });
  if (op === 'gx') return N.send(res, 200, Object.assign({ ok: true }, await readMail(t.u, pid, b.id)));
  if (op === 'cl') return N.send(res, 200, { ok: true, ev: await listEvents(t.u, pid, b.a, b.b) });
  if (op === 'sair') { const L = await readLink(t.u, pid);
    if (L && L.rt) { try { await fetch(REVOKE(), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form({ token: L.rt }) }); } catch (e) { } }
    await dropLink(t.u, pid); return N.send(res, 200, { ok: true }); }
  return N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' });
}, { anyOrigin: true });
