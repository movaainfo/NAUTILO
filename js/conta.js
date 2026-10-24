/* NÁUTILO — contas e perfis (a versão para o público).
   Modo pessoal: os aparelhos que já tinham o Náutilo (o do Ryan) continuam exatamente iguais: o mesmo código, o mesmo Google Drive.
   Modo conta: entras com e-mail e senha, escolhes o perfil (como na Netflix) e os dados desse perfil ficam na nuvem do Náutilo
   (Vercel Blob privado, cifrado) e iguais no telemóvel e no computador. O ecrã de bloqueio é o mesmo, com o código de cada perfil.
   O motor de dados (core.js) fala com uma "base de dados" com collection().onSnapshot() e doc().set(); aqui essa base é api/dados. */
(() => {
'use strict';
const U = OS.U, esc = U.esc;
const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } },
  keys: () => { try { return Object.keys(localStorage); } catch (e) { return []; } } };
const K = { s: 'nau:s', p: 'nau:p', data: 'nau:pd', owner: 'nau:owner', pers: 'nau:pessoal', reset: 'nau:lkreset' };
const SALT = 'oceanum-v1|';
const sha = async s => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };

/* ---------- que modo é este aparelho ---------- */
if (/^#pessoal\b/.test(location.hash)) { LS.set(K.pers, 1); try { history.replaceState(null, '', location.pathname + '#visao'); } catch (e) { } }
let S = LS.get(K.s, null);
const hasLocal = LS.keys().some(k => k.startsWith('os2:'));
const accDevice = !!(S || LS.get(K.owner, ''));
const personal = !accDevice && !!(LS.get(K.pers, 0) || hasLocal || /ligar=/.test(location.hash) || LS.get('os2sync', 0));
/* ---------- pedidos ao servidor ---------- */
const api = async (path, opt = {}, tries = 3) => { let last = null;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch('api/' + path, Object.assign({ cache: 'no-store', credentials: 'omit' }, opt)); let j = null; try { j = await r.json(); } catch (e) { }
      if (j && j.ok) return j;
      const e = new Error((j && j.msg) || (r.status === 404 ? 'O servidor das contas não respondeu.' : 'Erro ' + r.status)); e.status = r.status; e.code = j && j.code;
      if (r.status < 500 && r.status !== 429) throw e; last = e; }
    catch (e) { if (e.status && e.status < 500 && e.status !== 429) throw e; last = e.status ? e : Object.assign(new Error('Sem ligação à internet.'), { net: true }); }
    await new Promise(res => setTimeout(res, 600 * (i + 1))); }
  throw last; };
const conta = (op, body = {}) => api('conta', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, S ? { authorization: 'Bearer ' + S.t } : {}), body: JSON.stringify(Object.assign({ op }, body)) });
const saveS = () => { if (S) LS.set(K.s, S); else LS.del(K.s); };
const takeConta = (j, email) => { S = Object.assign(S || {}, { t: j.token || (S && S.t), e: (j.conta && j.conta.email) || email || (S && S.e), n: (j.conta && j.conta.nome) || '', perfis: (j.conta && j.conta.perfis) || [], adm: j.conta ? !!j.conta.adm : !!(S && S.adm), termos: j.conta ? j.conta.termos || '' : S && S.termos, termosAt: j.conta ? j.conta.termosAt || '' : S && S.termosAt }); saveS(); if (OS.Acc && OS.Acc.navAdm) OS.Acc.navAdm(); };

const Acc = OS.Acc = { on: !personal };
const A = OS.act = OS.act || {}; OS.forms = OS.forms || {};
if (personal) {
  /* ---------- modo pessoal: guardar este Náutilo numa conta (o que é do Ryan vai para a conta dele) ---------- */
  const moved = () => OS.one('meta').acc || '';
  // cria (ou entra n)a conta, cria o perfil pessoal com o mesmo código de bloqueio e envia todos os dados deste aparelho
  Acc.migrate = async (email, senha, criar, termos) => { email = String(email || '').trim().toLowerCase();
    const j = await conta(criar ? 'registar' : 'entrar', criar ? Object.assign({ email, senha, nome: OS.one('profile').name || '' }, termos || {}) : { email, senha }); takeConta(j, email);
    if (j.recuperacao) LS.set('nau:rec', j.recuperacao); // mostrado uma vez, depois de abrir com a conta
    let p = (S.perfis || []).find(x => x.ps);
    if (!p) { const r = await conta('perfil', { acao: 'criar', perfil: { nome: String(OS.one('profile').short || 'Ryan').slice(0, 24), cor: '#7FA9DA', av: '', lk: OS.Lock.curHash(), ps: true } }); takeConta(r); p = r.perfil; }
    OS.setOne('meta', { acc: email });
    const now = Date.now(), docs = [], known = {};
    Object.keys(OS.D).forEach(c => { const by = {}; OS.all(c).forEach(r => { (by[r._s || 0] = by[r._s || 0] || []).push(r); }); Object.entries(by).forEach(([k, items]) => docs.push([c + '~' + k, { t: now, items }])); });
    Object.keys(OS.ONE).forEach(k => docs.push(['one~' + k, { t: now, data: OS.ONE[k] }]));
    let part = {}, n = 0, cnt = 0;
    const send = async () => { if (!cnt) return; const r = await api('dados', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.t }, body: JSON.stringify({ op: 'gravar', p: p.id, docs: part }) }); Object.assign(known, r.etags); part = {}; n = 0; cnt = 0; };
    for (const [id, d] of docs) { const sz = JSON.stringify(d).length; if (cnt && (n + sz > 1.5e6 || cnt >= 300)) await send(); part[id] = d; n += sz; cnt++; }
    await send();
    // os outros aparelhos ficam a saber pelo Google Drive (espera um pouco que o aviso lá chegue)
    for (let i = 0; i < 20 && OS.sync.status === 'busy'; i++) await new Promise(r => setTimeout(r, 200));
    LS.set(K.p, p.id); LS.set(K.data, p.id); LS.set(K.owner, email); LS.set('nau:k:' + p.id, known); LS.del(K.pers); LS.del('os2sync');
    return { perfil: p, docs: docs.length }; };
  const go = async criar => { const em = document.getElementById('accMigE'), pw = document.getElementById('accMigP'); if (!em || !pw) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) return OS.UI.toast('Escreve o teu e-mail.', 'warn');
    if (pw.value.length < 8) return OS.UI.toast('A senha precisa de pelo menos 8 caracteres.', 'warn');
    const tm = OS.Legal ? OS.Legal.read(document.getElementById('accMig')) : null; if (criar && !tm) return OS.UI.toast('Para criar a conta, marca as três caixas (termos, dados de saúde e de fé, idade).', 'warn');
    OS.UI.toast('A guardar o teu Náutilo na conta…');
    try { const r = await Acc.migrate(em.value, pw.value, criar, tm); OS.UI.toast(`Guardado: ${r.docs} partes dos teus dados na conta. A abrir com a conta…`, 'pos'); setTimeout(() => location.reload(), 900); }
    catch (e) { OS.UI.toast(e.net ? 'Sem internet. Tenta outra vez.' : e.message, 'neg'); } };
  A.accMigNew = () => go(true); A.accMigIn = () => go(false);
  // noutro aparelho do Ryan: o Náutilo já está na conta → entrar nela aqui (os dados vêm da conta)
  A.accJoin = () => { const em = moved(); if (!em) return; OS.UI.closeModal();
    if (!confirm(`Este aparelho passa a usar a conta ${em}. Os dados vêm da conta (o que mudaste só aqui e ainda não sincronizou pelo Google Drive perde-se). Continuar?`)) return;
    OS.noSave = true; LS.keys().forEach(k => { if (!/^(nau:|os2lite$|__)/.test(k)) LS.del(k); }); LS.set(K.owner, em); LS.del(K.pers); location.reload(); };
  A.accJoinLater = () => { LS.set('nau:joinAsk', Date.now()); OS.UI.closeModal(); };
  const panel = () => { const em = moved(), e = U.esc;
    return `<div class="pn" id="accMig"><div class="pn-h"><h3>${OS.UI.ic('user')}Conta Náutilo</h3>${em ? `<span class="mut">${e(em)}</span>` : ''}</div>
    ${em ? `<p class="mut" style="margin:0 0 10px">O teu Náutilo está guardado na conta <b>${e(em)}</b>. Este aparelho ainda usa o modo antigo (só neste aparelho e no Google Drive).</p><button class="btn pri" data-act="accJoin">Entrar na conta neste aparelho</button>`
    : `<p class="mut" style="margin:0 0 12px">Guarda o teu Náutilo numa conta: tudo o que tens aqui (dados, metas, jogo, definições, ligações) vai para a tua conta, cifrado, com o mesmo código de bloqueio. Depois entras com e-mail e senha em qualquer aparelho e podes criar outros perfis.</p>
      <div class="col gap8"><label>E-mail<input class="field" id="accMigE" type="email" autocomplete="email"></label><label>Senha da conta (pelo menos 8 caracteres)<input class="field" id="accMigP" type="password" autocomplete="new-password"></label>${OS.Legal ? OS.Legal.checks() : ''}
      <div class="row gap8" style="flex-wrap:wrap"><button class="btn pri" data-act="accMigNew">Criar conta e guardar</button><button class="btn" data-act="accMigIn">Já tenho conta: entrar e guardar</button></div></div>`}</div>`; };
  OS.on('ready', () => { const orig = OS.views.definicoes; if (orig) OS.views.definicoes = sub => orig(sub) + (String(sub || '') === '' ? panel() : '');
    const ask = LS.get('nau:joinAsk', 0); if (moved() && !navigator.webdriver && (!ask || Date.now() - ask > 3 * 864e5)) setTimeout(() => OS.UI.modal(`<div style="padding:20px"><h3 style="margin:0 0 8px">O teu Náutilo está na conta</h3><p class="mut" style="margin:0 0 14px">Guardaste o teu Náutilo na conta <b>${U.esc(moved())}</b>. Entra nela também neste aparelho para ficar tudo igual em todo o lado.</p><div class="row gap8"><button class="btn pri" data-act="accJoin">Entrar na conta</button><button class="btn ghost" data-act="accJoinLater">Agora não</button></div></div>`), 1800); });
  return;
}

/* ---------- daqui para baixo: modo conta ---------- */
const PCOL = ['#F2C48D', '#7FA9DA', '#3FCF8E', '#E0896A', '#9A8CF5', '#F28CB1', '#5CC8E6', '#F2B544'];
const AVS = ['', '🌊', '⚓', '🧭', '🐋', '🦈', '🐢', '🌙', '☀️', '🔥', '🌿', '🎯', '📚', '💼', '🏃', '🎧', '🦊', '🐺', '🦁', '🐼'];
const pid = () => LS.get(K.p, '');
const profiles = () => (S && S.perfis) || [];
const cur = () => profiles().find(p => p.id === pid()) || null;
const first = n => String(n || '').trim().split(/\s+/)[0] || '';
// pub: perfil de uma pessoa qualquer (textos e valores neutros); o perfil pessoal (ps) é o Náutilo do Ryan passado para a conta: fica como era
Object.assign(Acc, { sess: () => S, profiles, profile: cur, email: () => (S && S.e) || '', lk: () => (cur() || {}).lk || '', pub: !(cur() && cur().ps) });

// numa conta nova nada do Ryan: o perfil começa com o nome de quem o criou (o resto preenche em Definições)
if (Acc.pub) { Object.assign(OS.ONE_DEF.profile, { name: '', short: '', city: '', uni: '', course: '', year: '', semester: '', semStart: '', semEnd: '' }); if (OS.ONE_DEF.mova) OS.ONE_DEF.mova.name = 'O meu negócio'; }

/* ---------- dados locais de cada perfil ---------- */
// guarda: a sessão e as escolhas do aparelho; o resto (dados do perfil, preferências do perfil) sai ao trocar de perfil ou de conta
const KEEP = /^(nau:|os2lite$|__)/;
const wipeLocal = () => { OS.noSave = true; LS.keys().forEach(k => { if (!KEEP.test(k)) LS.del(k); }); LS.keys().filter(k => /^nau:(k|pend):/.test(k)).forEach(LS.del);
  try { sessionStorage.removeItem('os2unlock'); } catch (e) { } try { indexedDB.deleteDatabase('oceanum-reset'); } catch (e) { } LS.del(K.data); };

/* ---------- a base de dados do motor (como no sync.js, mas com a conta) ---------- */
const P = () => pid();
const kKnown = () => 'nau:k:' + P(), kPend = () => 'nau:pend:' + P();
let known = LS.get(kKnown(), {}), pend = new Set(LS.get(kPend(), [])), lastM = null, queue = {}, waiters = [], timer = 0, polling = false, prefetched = null;
const SY = Acc.sync = { state: 'a ligar…', last: 0, err: '' };
const saveKnown = () => LS.set(kKnown(), known), savePend = () => LS.set(kPend(), [...pend]);
const dados = (op, body, get) => api('dados' + (get ? '?' + new URLSearchParams({ op, p: P(), _: Date.now() }) : ''), get ? { headers: { authorization: 'Bearer ' + S.t } } : { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.t }, body: JSON.stringify(Object.assign({ op, p: P() }, body)) })
  .catch(e => { if (e.status === 401) ended(); else if (e.status === 404 && e.code === 'perfil') gone(); throw e; });
const fetchIds = async ids => { const docs = {}, etags = {}; let todo = ids.slice();
  while (todo.length) { const part = todo.splice(0, 150), j = await dados('ler', { ids: part }); Object.assign(docs, j.docs); Object.assign(etags, j.etags); if (j.mais && j.mais.length) todo = j.mais.concat(todo); }
  return { docs, etags }; };
const snap = (entries, empty) => ({ empty, docs: entries.map(([id, d]) => ({ id, data: () => d })) });
const size = o => JSON.stringify(o).length;
const flushPut = async () => { timer = 0; const batch = queue, ws = waiters; queue = {}; waiters = []; const ids = Object.keys(batch); if (!ids.length) return;
  try { let part = {}, n = 0;
    const send = async () => { if (!Object.keys(part).length) return; const j = await dados('gravar', { docs: part }); Object.assign(known, j.etags); lastM = j.m; Object.keys(part).forEach(id => pend.delete(id)); part = {}; n = 0; };
    for (const id of ids) { const sz = size(batch[id]); if (n && n + sz > 1.5e6) await send(); part[id] = batch[id]; n += sz; }
    await send(); saveKnown(); savePend(); SY.last = Date.now(); SY.err = ''; SY.state = 'sincronizada'; ws.forEach(w => w.ok()); }
  catch (e) { SY.err = e.message; SY.state = 'sem ligação (guardado neste aparelho)'; savePend(); ws.forEach(w => w.ko({ code: 'unavailable' })); setTimeout(repush, 15000); }
  try { OS.request(); } catch (e) { } };
const put = (id, data) => new Promise((ok, ko) => { queue[id] = data; pend.add(id); savePend(); waiters.push({ ok, ko }); clearTimeout(timer); timer = setTimeout(flushPut, 900); });
const payload = id => { const [c, s] = id.split('~'); return c === 'one' ? { data: OS.one(s) } : { items: OS.all(c).filter(r => String(r._s || 0) === s) }; };
const repush = () => { if (!navigator.onLine) return; [...pend].filter(id => !queue[id]).forEach(id => put(id, Object.assign({ t: Date.now() }, payload(id))).catch(() => { })); };
// espera também pelo que já ia a caminho (até ~3 s), para "sincronizado" ser verdade
Acc.flush = async () => { clearTimeout(timer); for (let i = 0; i < 20 && (Object.keys(queue).length || pend.size); i++) { if (Object.keys(queue).length) await flushPut(); else await new Promise(r => setTimeout(r, 150)); } return !pend.size; };

// primeira leitura: antes de o motor arrancar (assim um telemóvel lento nunca cria dados de exemplo por cima dos teus)
const prefetch = async () => { const L = await dados('lista', {}, true); lastM = L.m; const remote = L.docs || {}, ids = Object.keys(remote);
  const mine = LS.get(K.data, '') === P() && hasLocal;
  if (!mine) { known = {}; pend = new Set(); }
  const need = ids.filter(id => !pend.has(id) && (!mine || known[id] !== remote[id]));
  const got = need.length ? await fetchIds(need) : { docs: {}, etags: {} };
  Object.assign(known, got.etags); saveKnown(); LS.set(K.data, P()); SY.state = 'sincronizada'; SY.last = Date.now();
  return { empty: !ids.length, entries: Object.entries(got.docs) }; };
let started = false;
const start = (cb, errCb) => { if (started) return; started = true;
  const pre = prefetched; prefetched = null;
  if (pre) cb(snap(pre.entries, pre.empty));
  else { // sem rede ao abrir: abre com o que está no aparelho e liga quando houver internet
    const retry = async () => { try { const f = await prefetch(); cb(snap(f.entries, f.empty)); } catch (e) { SY.state = 'sem ligação (guardado neste aparelho)'; errCb && errCb({ code: 'unavailable' }); setTimeout(retry, 20000); } }; retry(); }
  if (pend.size) setTimeout(repush, 1500);
  const poll = async () => { if (document.hidden || !navigator.onLine || polling || !S) return; polling = true;
    try { const j = await dados('marca', {}, true);
      if (j.m && j.m !== lastM) { const L = await dados('lista', {}, true); lastM = L.m;
        const ch = Object.keys(L.docs || {}).filter(id => L.docs[id] !== known[id] && !pend.has(id) && !queue[id]);
        if (ch.length) { const got = await fetchIds(ch); Object.assign(known, got.etags); saveKnown(); cb(snap(Object.entries(got.docs), false)); } }
      SY.last = Date.now(); SY.err = ''; SY.state = 'sincronizada'; }
    catch (e) { SY.err = e.message; SY.state = 'sem ligação (guardado neste aparelho)'; }
    finally { polling = false; } };
  Acc.poll = poll;
  setInterval(poll, window.__accPoll || 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { poll(); if (pend.size) repush(); } });
  addEventListener('online', () => { poll(); if (pend.size) repush(); }); };
const DB = { collection: () => ({ onSnapshot: (cb, err) => { start(cb, err); return () => { }; } }), doc: path => ({ set: data => put(path.split('/').slice(1).join('/'), data) }) };

// o motor pede a base de dados ao arrancar: só a entregamos depois de entrares e escolheres o perfil
let release; const ready = new Promise(r => { release = r; });
window.claude = { use: async cap => { if (cap !== 'db') return null; await ready; return DB; } };

/* ---------- sessão terminada, perfil apagado noutro aparelho ---------- */
let endedOnce = false;
const ended = () => { if (endedOnce) return; endedOnce = true; S = null; saveS(); showGate('entrar', 'A sessão terminou (a senha mudou ou saíste noutro aparelho). Entra outra vez.'); };
const gone = () => { if (endedOnce) return; endedOnce = true; LS.del(K.p); wipeLocal(); showGate('perfis', 'Este perfil foi apagado noutro aparelho.'); };

/* ---------- ecrã da conta (por cima de tudo, com o mesmo mar do ecrã de entrada) ---------- */
let G = null, gMode = 'entrar', gMsg = '', gEdit = null, gManage = false, gBusy = false, gRec = '';
const scene = () => OS.Scene ? `<div class="lk-scene">${OS.Scene.svg(Math.max(320, innerWidth), Math.max(480, innerHeight), { id: 'acs' })}</div>` : '';
const okImg = s => typeof s === 'string' && s.length <= 60000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
const avatar = (p, big) => `<span class="ac-av${big ? ' big' : ''}${okImg(p.img) ? ' im' : ''}" style="--c:${esc(p.cor || PCOL[0])}">${okImg(p.img) ? `<img src="${p.img}" alt="">` : esc(p.av || first(p.nome).slice(0, 1).toUpperCase() || '?')}</span>`;
const field = (n, label, type = 'text', extra = '') => `<label class="ac-f"><span>${label}</span><input name="${n}" type="${type}" ${extra}></label>`;
const lockFields = () => `${field('c1', 'Código de bloqueio do perfil', 'password', 'minlength="6" autocomplete="new-password" required placeholder="pelo menos 6 caracteres"')}${field('c2', 'Repete o código', 'password', 'minlength="6" autocomplete="new-password" required')}`;
const swatches = sel => `<div class="ac-sw" role="radiogroup" aria-label="Cor">${PCOL.map(c => `<label><input type="radio" name="cor" value="${c}" ${c === sel ? 'checked' : ''}><i style="--c:${c}"></i></label>`).join('')}</div>`;
const avPick = sel => `<div class="ac-avs" role="radiogroup" aria-label="Avatar">${AVS.map(a => `<label><input type="radio" name="av" value="${a}" ${a === (sel || '') ? 'checked' : ''}><i>${a || 'Aa'}</i></label>`).join('')}</div>`;
/* avatar do perfil: emoji, uma foto (cortada em quadrado, ~10 KB) ou um personagem do Dominus em pixel art */
const avEditor = p => { const im = okImg(p.img) ? p.img : '';
  return `<div class="ac-f ac-ave"><span>Avatar</span><div class="ac-avtop"><span class="ac-avprev">${avatar(Object.assign({}, p, { img: im }), 1)}</span>
    <div class="ac-avbtns"><label class="ac-btn ghost sm"><input type="file" accept="image/*" data-acx="foto" class="ac-file">Escolher foto</label><button type="button" class="ac-btn ghost sm" data-acx="dom" aria-expanded="false">Personagem do Dominus</button><button type="button" class="ac-link" data-acx="tirar" ${im ? '' : 'hidden'}>Tirar a imagem</button></div></div>
    <input type="hidden" name="img" value="${esc(im)}"><div class="ac-domg" hidden></div>${avPick(p.av)}</div>`; };
// busto 128×128 a partir de uma grelha de píxeis (herói 48×72 ou monstro 64×64)
const bust = (px, w, h, bx, by, bs, bg) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const sc = 128 / bs;
  for (let yy = 0; yy < bs; yy++) for (let xx = 0; xx < bs; xx++) { const sx = bx + xx, sy = by + yy; if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue; const v = px[sy * w + sx]; if (!v) continue; x.fillStyle = v; x.fillRect(Math.floor(xx * sc), Math.floor(yy * sc), Math.ceil(sc), Math.ceil(sc)); }
  return c.toDataURL('image/png'); };
const heroBust = look => { const D = OS.Dom, W = D.PW || 48, H = D.PH || 72, px = D.pixel(look || {}); let top = 0; while (top < 30 && !px.slice(top * W + 10, top * W + 38).some(Boolean)) top++; return bust(px, W, H, 8, Math.max(0, top - 3), 32, ['#24476E', '#0B1A2E']); };
const HEROES = [{ skin: 2, hair: 'liso curto', hairColor: 'loiro', beard: 'nenhuma', glasses: '', top: 'hoodie', topColor: 1 }, { skin: 6, hair: 'cacheado curto', hairColor: 'preto', beard: 'cavanhaque', glasses: 'retangulares', top: 'tshirt', topColor: 0 },
  { skin: 8, hair: 'tranças', hairColor: 'preto', beard: 'nenhuma', glasses: '', top: 'camisa', topColor: 2 }, { skin: 4, hair: 'comprido', hairColor: 'ruivo', beard: 'nenhuma', glasses: 'redondos', top: 'polo', topColor: 4 },
  { skin: 3, hair: 'coque', hairColor: 'castanho escuro', beard: 'nenhuma', glasses: '', top: 'blazer', topColor: 3 }, { skin: 9, hair: 'afro', hairColor: 'preto', beard: 'barba curta', glasses: '', top: 'couro', topColor: 0 },
  { skin: 5, hair: 'moicano', hairColor: 'azul', beard: 'por fazer', glasses: 'sol', top: 'regata', topColor: 5 }, { skin: 1, hair: 'cacheado comprido', hairColor: 'castanho', beard: 'nenhuma', glasses: '', top: 'mago', head: 'mago', headColor: 4 },
  { skin: 7, hair: 'rapado', hairColor: 'preto', beard: 'barba cheia', glasses: '', top: 'a-ferro', head: 'espartano' }, { skin: 2, hair: 'comprido', hairColor: 'grisalho', beard: 'lenhador', glasses: '', top: 'monge' },
  { skin: 6, hair: 'liso curto', hairColor: 'preto', beard: 'nenhuma', glasses: '', top: 'a-cavaleiro', head: 'cavaleiro' }, { skin: 4, hair: 'dreads', hairColor: 'castanho escuro', beard: 'bigode', glasses: 'aviador', top: 'fato', topColor: 0 }];
let GAL = null;
const gallery = () => { if (GAL) return GAL; GAL = []; const D = OS.Dom, M = OS.Monstros;
  try { const d = OS.one && OS.one('dominus'); if (D && d && d.born && d.look && LS.get(K.data, '') === (gEdit || pid())) GAL.push({ n: 'O teu herói', src: heroBust(d.look) }); } catch (e) { }
  if (D && D.pixel) HEROES.forEach((l, i) => { try { GAL.push({ n: 'Herói ' + (i + 1), src: heroBust(Object.assign({ eyes: 'castanho', brows: 'finas', legs: 'jeans', feet: 'tenis' }, l)) }); } catch (e) { } });
  if (M && M.pixels) M.BOSSES.slice(0, 8).concat(M.MINIONS.slice(0, 4)).forEach(id => { try { GAL.push({ n: M.name ? M.name(id) : id, src: bust(M.pixels(id), 64, 64, 0, 0, 64, ['#2A1F3A', '#0E0A16']) }); } catch (e) { } });
  return GAL; };
// foto: corta ao centro, 160×160, JPEG leve (cabe no perfil e aparece em todos os aparelhos)
const photo = file => new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image();
  im.onload = () => { const c = document.createElement('canvas'), Z = 160, w = im.naturalWidth, h = im.naturalHeight, q0 = Math.min(w, h); c.width = c.height = Z; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(im, (w - q0) / 2, (h - q0) / 2, q0, q0, 0, 0, Z, Z); URL.revokeObjectURL(u); let q = .86, d = c.toDataURL('image/jpeg', q); while (d.length > 56000 && q > .4) { q -= .12; d = c.toDataURL('image/jpeg', q); } res(d); };
  im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Não consegui ler esta imagem. Experimenta outra (JPG ou PNG).')); }; im.src = u; });
const formVal = (f, n) => { const r = [...f.querySelectorAll(`input[name=${n}]`)].find(x => x.checked); return r ? r.value : ''; };
const avPrev = f => { const box = f.querySelector('.ac-avprev'), img = f.elements.img ? f.elements.img.value : ''; if (!box) return;
  box.innerHTML = avatar({ nome: (f.elements.nome || {}).value || '', cor: formVal(f, 'cor') || PCOL[0], av: formVal(f, 'av'), img }, 1); const t = f.querySelector('[data-acx=tirar]'); if (t) t.hidden = !img; };
const setImg = (f, src) => { if (f.elements.img) f.elements.img.value = src || ''; avPrev(f); };
document.addEventListener('change', async e => { const t = e.target, f = t.closest && t.closest('form'); if (!f || !f.querySelector('.ac-ave')) return;
  if (t.matches('[data-acx=foto]')) { const file = t.files && t.files[0]; t.value = ''; if (!file) return;
    try { setImg(f, await photo(file)); } catch (err) { if (G && G.contains(f)) { gMsg = err.message; const m = f.querySelector('.ac-msg'); if (m) m.textContent = err.message; else OS.UI && OS.UI.toast(err.message, 'neg'); } else OS.UI.toast(err.message, 'neg'); } return; }
  if (t.name === 'av') return setImg(f, '');
  if (t.name === 'cor') avPrev(f); });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-acx]'); if (!b || b.dataset.acx === 'foto') return; const f = b.closest('form'); if (!f) return; const a = b.dataset.acx;
  if (a === 'dom') { e.preventDefault(); const g = f.querySelector('.ac-domg'), open = g.hidden; g.hidden = !open; b.setAttribute('aria-expanded', String(open));
    if (open && !g.firstChild) g.innerHTML = gallery().map((x, i) => `<button type="button" data-acx="pick" data-i="${i}" title="${esc(x.n)}" aria-label="${esc(x.n)}"><img src="${x.src}" alt=""></button>`).join('') || '<p class="ac-sub">O Dominus ainda não carregou. Tenta daqui a um segundo.</p>'; return; }
  if (a === 'pick') { e.preventDefault(); const x = gallery()[+b.dataset.i]; if (x) setImg(f, x.src); f.querySelectorAll('.ac-domg button').forEach(y => y.classList.toggle('on', y === b)); return; }
  if (a === 'tirar') { e.preventDefault(); setImg(f, ''); } });
const view = () => {
  const m = gMode, msg = gMsg ? `<p class="ac-msg" role="status">${esc(gMsg)}</p>` : '';
  if (m === 'perfis') { const L = profiles();
    return `<div class="ac-who"><h1 class="ac-h">${L.length ? 'Quem está a usar o Náutilo?' : 'Cria o teu primeiro perfil'}</h1>${msg}
      <div class="ac-grid">${L.map(p => `<button class="ac-p${gManage ? ' edit' : ''}" data-ac="${gManage ? 'editar' : 'escolher'}" data-id="${p.id}">${avatar(p, 1)}<b>${esc(p.nome)}</b>${gManage ? `<em>Editar</em>` : ''}</button>`).join('')}
      ${L.length < 5 ? `<button class="ac-p add" data-ac="novo"><span class="ac-av big plus">+</span><b>Adicionar perfil</b></button>` : ''}</div>
      <div class="ac-row">${L.length ? `<button class="ac-btn ghost" data-ac="gerir">${gManage ? 'Feito' : 'Gerir perfis'}</button>` : ''}<button class="ac-link" data-ac="sair">Sair da conta${S && S.e ? ' (' + esc(S.e) + ')' : ''}</button></div></div>`; }
  if (m === 'novo' || m === 'editar') { const p = m === 'editar' ? profiles().find(x => x.id === gEdit) || {} : { cor: PCOL[profiles().length % PCOL.length] };
    return `<form class="ac-card" data-acf="${m}"><h2>${m === 'novo' ? 'Novo perfil' : 'Editar perfil'}</h2>
      <p class="ac-sub">${m === 'novo' ? 'Cada perfil tem os seus próprios dados, metas, finanças e jogo. O código de bloqueio é pedido ao abrir o Náutilo com este perfil.' : 'Muda o nome, a cor ou o avatar (emoji, uma foto tua ou um personagem do Dominus). O código e os dados ficam como estão.'}</p>
      ${field('nome', 'Nome', 'text', `maxlength="24" required autocomplete="off" value="${esc(p.nome || '')}"`)}
      ${avEditor(p)}<div class="ac-f"><span>Cor</span>${swatches(p.cor)}</div>
      ${m === 'novo' ? lockFields() : ''}${msg}
      <div class="ac-row"><button class="ac-btn" type="submit" ${gBusy ? 'disabled' : ''}>${m === 'novo' ? 'Criar perfil' : 'Guardar'}</button><button class="ac-btn ghost" type="button" data-ac="voltar">Cancelar</button></div>
      ${m === 'editar' ? `<div class="ac-more"><button class="ac-link" type="button" data-ac="codigo">Esqueci o código deste perfil</button><button class="ac-link neg" type="button" data-ac="apagarp">Apagar este perfil</button></div>` : ''}</form>`; }
  if (m === 'codigo' || m === 'apagarp') { const p = profiles().find(x => x.id === gEdit) || {};
    return `<form class="ac-card" data-acf="${m}"><h2>${m === 'codigo' ? 'Novo código para ' + esc(p.nome || '') : 'Apagar ' + esc(p.nome || '')}</h2>
      <p class="ac-sub">${m === 'codigo' ? 'Confirma com a senha da conta e escolhe o código novo. Vale em todos os aparelhos.' : 'Apaga o perfil e todos os dados dele, em todos os aparelhos. Não dá para desfazer.'}</p>
      ${field('senha', 'Senha da conta', 'password', 'required autocomplete="current-password"')}${m === 'codigo' ? lockFields() : ''}${msg}
      <div class="ac-row"><button class="ac-btn${m === 'apagarp' ? ' neg' : ''}" type="submit" ${gBusy ? 'disabled' : ''}>${m === 'codigo' ? 'Mudar o código' : 'Apagar para sempre'}</button><button class="ac-btn ghost" type="button" data-ac="voltar">Cancelar</button></div></form>`; }
  if (m === 'codigo-rec') return `<div class="ac-card"><h2>Guarda o teu código de recuperação</h2>
      <p class="ac-sub">Se te esqueceres da senha, é com este código que a recuperas. Aparece só agora: tira uma fotografia, guarda-o nas notas ou no gestor de senhas.</p>
      <div class="ac-code" id="acRec">${esc(gRec)}</div><div class="ac-row"><button class="ac-btn ghost" type="button" data-ac="copiar">Copiar</button><button class="ac-btn" type="button" data-ac="guardei">Já guardei</button></div></div>`;
  const tabs = `<div class="ac-tabs" role="tablist"><button role="tab" aria-selected="${m === 'entrar'}" class="${m === 'entrar' ? 'on' : ''}" data-ac="m" data-v="entrar">Entrar</button><button role="tab" aria-selected="${m === 'criar'}" class="${m === 'criar' ? 'on' : ''}" data-ac="m" data-v="criar">Criar conta</button></div>`;
  if (m === 'criar') return `<form class="ac-card" data-acf="criar">${tabs}
      ${field('nome', 'O teu nome', 'text', 'maxlength="40" autocomplete="name" required')}${field('email', 'E-mail', 'email', 'autocomplete="email" required')}${field('senha', 'Senha', 'password', 'minlength="8" autocomplete="new-password" required placeholder="pelo menos 8 caracteres"')}
      <p class="ac-sub">Os teus dados ficam na tua conta, cifrados, e aparecem iguais no telemóvel e no computador. Podes ter até 5 perfis.</p>${OS.Legal ? OS.Legal.checks() : ''}${msg}
      <button class="ac-btn wide" type="submit" ${gBusy ? 'disabled' : ''}>${gBusy ? 'A criar…' : 'Criar conta'}</button></form>`;
  if (m === 'termos') return `<form class="ac-card" data-acf="termos"><h2>Antes de continuar</h2>
      <p class="ac-sub">O Náutilo tem agora Termos de Serviço e uma Política de Privacidade (LGPD e RGPD). Lê-os e aceita uma vez: fica guardado na tua conta, em todos os aparelhos.</p>
      ${OS.Legal ? OS.Legal.checks() : ''}${msg}
      <button class="ac-btn wide" type="submit" ${gBusy ? 'disabled' : ''}>${gBusy ? 'A guardar…' : 'Aceitar e continuar'}</button>
      <button class="ac-link" type="button" data-ac="sair">Não aceito: sair da conta</button></form>`;
  if (m === 'recuperar') return `<form class="ac-card" data-acf="recuperar"><h2>Recuperar a senha</h2><p class="ac-sub">Usa o código de recuperação que guardaste quando criaste a conta.</p>
      ${field('email', 'E-mail', 'email', 'autocomplete="email" required')}${field('codigo', 'Código de recuperação', 'text', 'autocomplete="off" required placeholder="XXXX-XXXX-XXXX-XXXX"')}${field('nova', 'Senha nova', 'password', 'minlength="8" autocomplete="new-password" required')}${msg}
      <div class="ac-row"><button class="ac-btn" type="submit" ${gBusy ? 'disabled' : ''}>Mudar a senha</button><button class="ac-btn ghost" type="button" data-ac="m" data-v="entrar">Voltar</button></div></form>`;
  return `<form class="ac-card" data-acf="entrar">${tabs}
      ${field('email', 'E-mail', 'email', `autocomplete="email" required value="${esc(LS.get(K.owner, '') || '')}"`)}${field('senha', 'Senha', 'password', 'autocomplete="current-password" required')}${msg}
      <button class="ac-btn wide" type="submit" ${gBusy ? 'disabled' : ''}>${gBusy ? 'A entrar…' : 'Entrar'}</button>
      <button class="ac-link" type="button" data-ac="m" data-v="recuperar">Esqueci a senha</button></form>`; };
const paint = () => { if (!G) return; const box = G.querySelector('.ac-in');
  // ao mostrar um erro, o que já escreveste fica (menos as senhas e códigos)
  const was = box.querySelector('form[data-acf]'), keep = {}; if (was) [...was.querySelectorAll('input[type=text],input[type=email],input[type=radio]:checked,input[type=hidden][name=img]')].forEach(i => { keep[i.name] = i.value; });
  const kind = was && was.dataset.acf;
  box.innerHTML = `<div class="ac-brand">${OS.Lock ? OS.Lock.logo(28) : ''}<span>Náutilo</span></div>${gMode === 'perfis' || gMode === 'codigo-rec' ? '' : '<p class="ac-hi">O sistema operativo da tua vida: dinheiro, estudos, treino, metas e o teu jogo, num só sítio.</p>'}${view()}<nav class="ac-foot" aria-label="Documentos legais"><a href="#" data-lgl="termos">Termos</a><a href="#" data-lgl="privacidade">Privacidade</a><a href="#" data-lgl="cookies">Cookies</a><a href="#" data-lgl="acessibilidade">Acessibilidade</a></nav>`;
  const now = box.querySelector('form[data-acf]'); if (now && kind === now.dataset.acf) { Object.entries(keep).forEach(([n, v]) => { const L = [...now.querySelectorAll(`input[name="${n}"]`)]; if (L[0] && L[0].type === 'radio') L.forEach(r => { r.checked = r.value === v; }); else if (L[0] && v) L[0].value = v; }); if (now.querySelector('.ac-ave')) avPrev(now); }
  // cursor no primeiro campo, mas nunca a meio do que já estás a escrever noutro
  const f = box.querySelector('input:not([type=radio])'); if (f && !f.value && matchMedia('(pointer:fine)').matches) setTimeout(() => { const a = document.activeElement; if (!G || (a && a !== document.body && G.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return; f.focus(); }, 60); };
const set = (mode, msg) => { gMode = mode; gMsg = msg || ''; gBusy = false; paint(); };
const showGate = (mode, msg) => { if (!G) { G = document.createElement('div'); G.id = 'acc'; G.className = 'acx'; G.setAttribute('role', 'dialog'); G.setAttribute('aria-modal', 'true'); G.setAttribute('aria-label', 'Conta Náutilo');
    G.innerHTML = `${scene()}<div class="ac-in"></div>`; document.body.appendChild(G); G.addEventListener('click', onClick); G.addEventListener('submit', onSubmit); }
  G.hidden = false; document.documentElement.classList.add('ac-open'); gManage = false; set(mode, msg); };
const hideGate = () => { if (G) { G.hidden = true; G.innerHTML = ''; G.remove(); G = null; } document.documentElement.classList.remove('ac-open'); };

// escolher o perfil: se este aparelho tinha os dados de outro, limpa-os e recomeça; senão o motor arranca já
const choose = async id => { const was = LS.get(K.data, ''), booted = !!OS.dbRef, p = profiles().find(x => x.id === id) || {};
  if (booted || (was && was !== id) || !!p.ps === Acc.pub) {
    if (booted && pend.size && !(await Acc.flush().catch(() => false)) && !confirm('Há alterações deste perfil que ainda não chegaram à nuvem (sem internet?). Se trocares agora, perdem-se. Trocar na mesma?')) return;
    LS.set(K.p, id); if (was !== id) wipeLocal(); try { sessionStorage.removeItem('os2unlock'); } catch (e) { } location.reload(); return; }
  LS.set(K.p, id); known = LS.get(kKnown(), {}); pend = new Set(LS.get(kPend(), []));
  gMsg = ''; const box = G && G.querySelector('.ac-in'); if (box) box.innerHTML = `<div class="ac-brand">${OS.Lock ? OS.Lock.logo(28) : ''}<span>Náutilo</span></div><p class="ac-hi">A abrir o perfil de ${esc(first((cur() || {}).nome))}…</p>`;
  try { prefetched = await prefetch(); } catch (e) { if (!hasLocal) { set('perfis', e.net ? 'Sem internet. Para abrir este perfil pela primeira vez neste aparelho precisas de rede.' : e.message); return; } }
  hideGate(); release(); };
const afterLogin = (j, email) => { if (LS.get(K.owner, '') && LS.get(K.owner, '') !== email) { LS.del(K.p); wipeLocal(); } LS.set(K.owner, email); takeConta(j, email); endedOnce = false; };

async function onSubmit(e) { const f = e.target.closest('form[data-acf]'); if (!f) return; e.preventDefault(); if (gBusy) return;
  const v = n => (f.elements[n] ? f.elements[n].value : ''), kind = f.dataset.acf, val = n => { const r = [...f.querySelectorAll(`input[name=${n}]`)].find(x => x.checked); return r ? r.value : ''; };
  const fail = err => { gBusy = false; gMsg = err.net ? 'Sem ligação à internet. Tenta outra vez.' : err.message; paint(); };
  const code = async () => { if (v('c1').length < 6) throw new Error('O código precisa de pelo menos 6 caracteres.'); if (v('c1') !== v('c2')) throw new Error('Os dois códigos não são iguais.'); return sha(SALT + v('c1')); };
  gBusy = true; paint();
  try {
    if (kind === 'entrar') { const email = v('email').trim().toLowerCase(), j = await conta('entrar', { email, senha: v('senha') }); afterLogin(j, email); set(needTerms() ? 'termos' : 'perfis'); return; }
    if (kind === 'termos') { const t = OS.Legal ? OS.Legal.read(f) : null; if (!t) throw new Error('Para continuar, marca as três caixas.'); const j = await conta('termos', t); takeConta(j);
      if (!booting || !cur()) { set('perfis'); return; } hideGate(); OS.request && OS.request(); return; }
    if (kind === 'criar') { const t = OS.Legal ? OS.Legal.read(f) : {}; if (!t) throw new Error('Para criar a conta, marca as três caixas: termos e privacidade, dados de saúde e de fé, e idade.');
      const email = v('email').trim().toLowerCase(), j = await conta('registar', Object.assign({ email, senha: v('senha'), nome: v('nome') }, t)); afterLogin(j, email); gRec = j.recuperacao; S.novo = v('nome'); saveS(); set('codigo-rec'); return; }
    if (kind === 'recuperar') { const email = v('email').trim().toLowerCase(), j = await conta('recuperar', { email, codigo: v('codigo'), nova: v('nova') }); afterLogin(j, email); gRec = j.recuperacao; set('codigo-rec'); return; }
    if (kind === 'novo') { const lk = await code(), j = await conta('perfil', { acao: 'criar', perfil: { nome: v('nome'), cor: val('cor'), av: val('av'), img: v('img'), lk } }); takeConta(j); set('perfis'); return; }
    if (kind === 'editar') { const j = await conta('perfil', { acao: 'editar', id: gEdit, perfil: { nome: v('nome'), cor: val('cor'), av: val('av'), img: v('img') } }); takeConta(j); set('perfis'); return; }
    if (kind === 'codigo') { const lk = await code(), j = await conta('codigo', { id: gEdit, senha: v('senha'), lk }); takeConta(j); const r = LS.get(K.reset, {}); r[gEdit] = lk; LS.set(K.reset, r); set('perfis', 'Código mudado. Usa o novo ao abrir este perfil.'); return; }
    if (kind === 'apagarp') { const j = await conta('perfil', { acao: 'apagar', id: gEdit, senha: v('senha') }); takeConta(j); LS.del('nau:k:' + gEdit); LS.del('nau:pend:' + gEdit); const here = LS.get(K.data, '') === gEdit; if (here) wipeLocal(); if (pid() === gEdit) LS.del(K.p); if (here && OS.dbRef) { location.reload(); return; } set('perfis', 'Perfil apagado.'); return; }
  } catch (err) { fail(err); } }
async function onClick(e) { const b = e.target.closest('[data-ac]'); if (!b || gBusy) return; const a = b.dataset.ac;
  if (a === 'm') return set(b.dataset.v);
  if (a === 'escolher') return choose(b.dataset.id);
  if (a === 'novo') { gEdit = null; return set('novo'); }
  if (a === 'editar') { gEdit = b.dataset.id; return set('editar'); }
  if (a === 'gerir') { gManage = !gManage; return paint(); }
  if (a === 'voltar') { gManage = false; return set('perfis'); }
  if (a === 'codigo' || a === 'apagarp') return set(a);
  if (a === 'copiar') { try { await navigator.clipboard.writeText(gRec); b.textContent = 'Copiado'; } catch (err) { const r = document.createRange(); r.selectNodeContents(document.getElementById('acRec')); getSelection().removeAllRanges(); getSelection().addRange(r); } return; }
  if (a === 'guardei') { gRec = ''; if (needTerms()) return set('termos'); if (!profiles().length) { gEdit = null; set('novo'); const n = G && G.querySelector('input[name=nome]'); if (n && S && S.novo) n.value = first(S.novo); return; } return set('perfis'); }
  if (a === 'sair') return logout(); }

/* ---------- sair, trocar de perfil ---------- */
const logout = async () => {
  if (pend.size && OS.dbRef && !(await Acc.flush().catch(() => false)) && !confirm('Há alterações que ainda não chegaram à nuvem (sem internet?). Se saíres agora, perdem-se neste aparelho. Sair na mesma?')) return;
  S = null; saveS(); LS.del(K.p); wipeLocal(); location.replace(location.pathname + '#visao'); location.reload(); };
Acc.logout = logout;
Acc.switchProfile = () => { gManage = false; showGate('perfis'); };

/* ---------- arranque ---------- */
let booting = false;
const needTerms = () => !!S && !!OS.Legal && S.termos !== OS.Legal.V;
Acc.termos = () => S ? { v: S.termos || '', at: S.termosAt || '' } : null;
Acc.pedido = (tipo, msg) => conta('pedido', { tipo, msg });
const boot = () => {
  if (!S) return showGate(LS.get(K.owner, '') ? 'entrar' : 'criar');
  if (typeof S.termos === 'string' && needTerms()) { showGate('termos'); if (!cur()) return; }
  else if (!cur()) return showGate('perfis');
  // sessão e perfil prontos: abre já; a lista de perfis atualiza-se por trás
  booting = true; (async () => { try { prefetched = await prefetch(); }
    catch (e) { if (e.status === 401 || e.status === 404) return; if (!hasLocal) return showGate('perfis', 'Sem internet. Para abrir este perfil neste aparelho precisas de rede: toca nele outra vez quando tiveres ligação.'); }
    release(); })();
  conta('eu').then(j => { takeConta(j); if (!cur() && !endedOnce) return gone(); if (needTerms() && !(G && gMode === 'termos')) showGate('termos'); }).catch(() => { });
};
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 0);

/* ---------- tempo de uso (para o separador de administração): minutos com a app aberta e à vista, por dia ---------- */
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let useMin = 0, useDay = today();
const sendUse = keep => { if (!S || (!useMin && keep !== 0)) return; const min = useMin, dia = useDay; useMin = 0; useDay = today();
  try { fetch(new URL('api/conta', document.baseURI).href, { method: 'POST', keepalive: !!keep, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.t }, body: JSON.stringify({ op: 'uso', min, dia }) }).catch(() => { useMin += min; }); } catch (e) { } };
const locked = () => { const l = document.getElementById('lkCode'); return !!(l && l.offsetParent) || !!document.getElementById('acc'); };
setInterval(() => { if (!S || !cur() || document.hidden || locked()) return; if (useDay !== today()) sendUse(); useMin++; if (useMin >= 5) sendUse(); }, window.__useTick || 60e3);
addEventListener('pagehide', () => sendUse(1)); document.addEventListener('visibilitychange', () => { if (document.hidden) sendUse(1); });
OS.on('ready', () => setTimeout(() => sendUse(0), 4000));

/* ---------- separador de administração (só na conta de quem está em NAUTILO_ADMIN no servidor) ---------- */
Acc.adm = () => !!(S && S.adm);
Acc.token = () => (S && S.t) || '';
Acc.pid = () => pid();
Acc.navAdm = () => { const N = OS.NAV; if (!N) return; const i = N.findIndex(g => g[0] === 'Admin');
  if (Acc.adm() && i < 0) { N.push(['Admin', [['admin', 'Administração', 'shield']]]); OS.request && OS.request(); } else if (!Acc.adm() && i >= 0) { N.splice(i, 1); OS.request && OS.request(); } };
let ADM = null, admBusy = false, admErr = '';
const admLoad = async () => { if (admBusy) return; admBusy = true; admErr = '';
  fetch(new URL('api/ia?p=estado', document.baseURI).href).then(r => r.json()).then(j => { U.ls.set('os2iaSrv', { g: !!j.google, at: Date.now() }); }).catch(() => { }); fetch(new URL('api/google?p=estado', document.baseURI).href).then(r => r.json()).then(j => { if (j && j.ok) U.ls.set('os2gSrv', { pronto: !!j.pronto, chave: j.chave || '', erro: j.erro || '', at: Date.now() }); OS.request(); }).catch(() => { }); try { ADM = Object.assign(await conta('admin'), { at: Date.now() }); } catch (e) { admErr = e.net ? 'Sem ligação à internet.' : e.message; } admBusy = false; OS.request(); };
const ago = t => { if (!t) return '—'; const s = Math.max(0, (Date.now() - t) / 1000); if (s < 90) return 'agora'; if (s < 3600) return 'há ' + Math.round(s / 60) + ' min'; if (s < 86400) return 'há ' + Math.round(s / 3600) + ' h'; const d = Math.round(s / 86400); return d === 1 ? 'ontem' : d < 30 ? 'há ' + d + ' dias' : new Date(t).toLocaleDateString('pt-PT'); };
const hmin = m => { m = Math.round(m || 0); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
const lastDays = n => { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')); } return out; };
const bars = (dias, n, h) => { const D = lastDays(n), mx = Math.max(30, ...D.map(d => dias[d] || 0)); return `<span class="adm-bars" style="--h:${h}px" role="img" aria-label="Minutos por dia, últimos ${n} dias">${D.map(d => `<i style="height:${Math.round((dias[d] || 0) / mx * 100)}%" title="${d}: ${hmin(dias[d] || 0)}"></i>`).join('')}</span>`; };
// pedidos dos titulares (LGPD/RGPD) e riscos jurídicos: só na administração
const TIPO = { confirmar: 'Confirmar se tratamos dados', acesso: 'Acesso aos dados', corrigir: 'Correção', eliminar: 'Anonimizar, bloquear ou eliminar', portabilidade: 'Portabilidade', partilha: 'Com quem partilhamos', revogar: 'Retirar consentimento', oposicao: 'Oposição', outro: 'Outro' };
const prazo = at => { const d = Math.ceil(15 - (Date.now() - Date.parse(at)) / 864e5); return d > 0 ? `faltam ${d} ${d === 1 ? 'dia' : 'dias'} (LGPD: 15)` : 'prazo de 15 dias ultrapassado'; };
const pedidosPn = () => { const P = (ADM && ADM.pedidos) || [], novos = P.filter(p => p.estado !== 'respondido').length;
  return `<div class="pn" id="admPed"><div class="pn-h"><h3>Pedidos de privacidade (LGPD / RGPD)</h3><span class="mut" style="font-size:12px">${novos ? novos + ' por responder' : 'nenhum por responder'}</span></div>
    ${P.length ? `<div class="adm-ped">${P.map(p => `<div class="adm-pd ${p.estado === 'respondido' ? 'ok' : ''}"><div class="row between" style="gap:8px;flex-wrap:wrap"><b>${esc(TIPO[p.tipo] || p.tipo)}</b><small class="mut">${esc(new Date(p.at).toLocaleString('pt-PT'))} · protocolo ${esc(p.id)}</small></div>
      <small>${esc(p.nome || '')} · ${esc(p.email)}</small><p>${esc(p.msg || '(sem texto)')}</p>
      <div class="row gap8" style="align-items:center;flex-wrap:wrap"><span class="bdg ${p.estado === 'respondido' ? 'pos' : 'warn'}">${p.estado === 'respondido' ? 'respondido' : prazo(p.at)}</span><button class="btn sm ${p.estado === 'respondido' ? 'ghost' : ''}" data-act="admPedido" data-id="${esc(p.id)}" data-e="${p.estado === 'respondido' ? 'novo' : 'respondido'}">${p.estado === 'respondido' ? 'Reabrir' : 'Marcar como respondido'}</button></div></div>`).join('')}</div>`
    : '<p class="mut" style="margin:0">Ainda não há pedidos. Chegam aqui quando alguém usa “Fazer um pedido” em Definições › Privacidade e termos. Responde para o e-mail da pessoa e marca como respondido.</p>'}</div>`; };
A.admPedido = async b => { try { await conta('pedidoFeito', { id: b.dataset.id, estado: b.dataset.e }); OS.UI.toast(b.dataset.e === 'respondido' ? 'Marcado como respondido' : 'Reaberto', 'pos'); ADM = null; admLoad(); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
// o que falta ao administrador configurar (some sozinho quando estiver feito)
const pendPn = () => { const g = !!(OS.AI && OS.AI.srvGoogle && OS.AI.srvGoogle()), gs = U.ls.get('os2gSrv', null);
  const L = [[!g, 'Chave Google da IA para todos (GEMINI_API_KEY)', 'Para a IA das contas ler fotos (comida, exames, escala) e PDFs. 1) aistudio.google.com/apikey → Create API key. 2) Vercel → projeto nautilo → Settings → Environment Variables → nome <b>GEMINI_API_KEY</b>, valor a chave, Production. 3) Deployments → Redeploy. Este aviso some sozinho quando a chave estiver ativa.'],
    [!(gs && gs.pronto && gs.chave === 'ok'), 'Gmail e agenda para todos (Google)', !gs ? 'A verificar a ligação ao Google…' : gs.chave === 'errada' ? 'O Google não aceita a chave secreta que está no Vercel. Google Cloud → Google Auth Platform → Clientes → Náutilo web → Adicionar chave secreta; depois Vercel → nautilo → Settings → Environment Variables → <b>GOOGLE_CLIENT_SECRET</b> → Edit, cola a nova → Save → Redeploy.' : gs.chave === 'redirecionamento' ? 'Falta o URI de redirecionamento no cliente do Google: Clientes → Náutilo web → URIs de redirecionamento autorizados → <b>https://nautilo-app.vercel.app/api/google</b> → Salvar.' : !gs.pronto || gs.chave === 'falta' ? 'Falta a chave secreta do cliente OAuth no servidor: Google Cloud → Google Auth Platform → Clientes → Náutilo web → Adicionar chave secreta. Depois Vercel → projeto nautilo → Settings → Environment Variables → nome <b>GOOGLE_CLIENT_SECRET</b>, Production → Save → Redeploy.' : 'O Google não respondeu à verificação (' + esc(gs.erro || '?') + '). Toca em Atualizar daqui a pouco.']];
  const P = L.filter(x => x[0]);
  return `<div class="pn" id="admPend"><div class="pn-h"><h3>Por fazer</h3><span class="mut" style="font-size:12px">${P.length ? P.length + ' pendente' + (P.length > 1 ? 's' : '') : 'tudo feito'}</span></div>
  <div class="adm-risk">${P.map(([, t, d]) => `<details open><summary><span class="bdg warn">pendente</span><b>${esc(t)}</b></summary><p>${d}</p></details>`).join('') || '<p class="mut" style="margin:0">Nada pendente.</p>'}</div></div>`; };
OS.views.admin = () => { const UI = OS.UI, head = UI.head('Administração', 'Quem tem conta no Náutilo, quem entrou e quanto tempo usa. As senhas e os dados das pessoas nunca aparecem aqui.', `<button class="btn" data-act="admRefresh">${UI.ic('sync')}Atualizar</button>`, 'Admin');
  if (!Acc.adm()) return head + '<div class="pn"><p class="mut" style="margin:0">Esta área é só para a conta de administração.</p></div>';
  if (!ADM || Date.now() - ADM.at > 120e3) { if (!admBusy && !admErr) setTimeout(admLoad, 0); if (!ADM) return head + `<div class="pn"><p class="mut" style="margin:0">${admErr ? esc(admErr) + ' <button class="btn sm" data-act="admRefresh">Tentar outra vez</button>' : 'A carregar as contas…'}</p></div>`; }
  const L = ADM.contas || [], t = today(), D7 = lastDays(7), act = days => L.filter(c => Math.max(c.ultUso || 0, c.ultEntrada || 0) > Date.now() - days * 864e5).length;
  const minToday = L.reduce((n, c) => n + ((c.dias || {})[t] || 0), 0), min7 = L.reduce((n, c) => n + D7.reduce((m, d) => m + ((c.dias || {})[d] || 0), 0), 0);
  return head + `<div class="adm">
  <div class="adm-kpi"><div><b class="mono">${ADM.total}</b><span>contas</span></div><div><b class="mono">${ADM.perfis}</b><span>perfis</span></div><div><b class="mono">${act(1)}</b><span>ativas hoje</span></div><div><b class="mono">${act(7)}</b><span>ativas em 7 dias</span></div><div><b class="mono">${act(30)}</b><span>ativas em 30 dias</span></div><div><b class="mono">${hmin(minToday)}</b><span>de uso hoje (todos)</span></div><div><b class="mono">${act(7) ? hmin(min7 / 7 / act(7)) : '—'}</b><span>por dia, por conta ativa</span></div></div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('users')}Contas</h3><div class="row gap8 adm-tools"><input type="search" id="admQ" class="field" placeholder="Procurar por nome ou e-mail" aria-label="Procurar contas"><button class="btn sm ghost" data-act="admCsv">Exportar CSV</button></div></div>
    <div class="adm-t" role="table" aria-label="Contas"><div class="adm-r adm-hd" role="row"><span role="columnheader">Pessoa</span><span role="columnheader">Último acesso</span><span role="columnheader">Última entrada</span><span role="columnheader">Hoje</span><span role="columnheader">7 dias</span><span role="columnheader">Criada</span></div>
    ${L.map((c, i) => { const d7 = D7.reduce((m, d) => m + ((c.dias || {})[d] || 0), 0), P = c.perfis || [];
      return `<button class="adm-r" role="row" data-act="admOne" data-i="${i}" data-q="${esc((c.nome + ' ' + c.email + ' ' + P.join(' ')).toLowerCase())}"><span role="cell" class="adm-who"><b>${esc(c.nome || P[0] || '—')}${c.admin ? ' <small class="mu-tag">admin</small>' : ''}</b><small>${esc(c.email)}</small><small class="mut">${P.length} ${P.length === 1 ? 'perfil' : 'perfis'}${P.length ? ': ' + esc(P.join(', ')) : ''}</small></span>
        <span role="cell"><em>Último acesso</em>${ago(c.ultUso || c.ultEntrada)}</span><span role="cell"><em>Última entrada</em>${ago(c.ultEntrada)}${c.entradas ? ` <small class="mut">(${c.entradas}×)</small>` : ''}</span><span role="cell" class="mono"><em>Hoje</em>${hmin((c.dias || {})[t] || 0)}</span><span role="cell"><em>7 dias</em>${bars(c.dias || {}, 7, 22)} <small class="mono">${hmin(d7)}</small></span><span role="cell"><em>Criada</em>${c.criado ? new Date(c.criado).toLocaleDateString('pt-PT') : '—'}</span></button>`; }).join('') || '<p class="mut" style="padding:12px">Ainda não há contas.</p>'}</div></div>
  ${pendPn()}${pedidosPn()}
  <p class="mut adm-note">Atualizado ${ago(ADM.at)}. O tempo de uso conta os minutos com o Náutilo aberto e à vista (desbloqueado). Estes dados estão descritos na Política de Privacidade.</p></div>`; };
A.admRefresh = () => { ADM = null; admErr = ''; admLoad(); OS.request(); };
A.admOne = b => { const c = ADM && ADM.contas[+b.dataset.i]; if (!c) return; const D = lastDays(30), tot = D.reduce((m, d) => m + ((c.dias || {})[d] || 0), 0), on = D.filter(d => (c.dias || {})[d]).length;
  OS.UI.modal(`<div style="padding:20px"><div class="row between" style="align-items:center"><h3 style="margin:0">${esc(c.nome || c.email)}</h3><button class="icon-btn" data-mclose aria-label="Fechar">${OS.UI.ic('x')}</button></div><p class="mut" style="margin:4px 0 14px">${esc(c.email)}</p>
    <div class="dc-rows"><div><span>Perfis</span><b>${esc((c.perfis || []).join(', ') || '—')}</b></div><div><span>Conta criada</span><b>${c.criado ? new Date(c.criado).toLocaleString('pt-PT') : '—'}</b></div><div><span>Última entrada (login)</span><b>${c.ultEntrada ? new Date(c.ultEntrada).toLocaleString('pt-PT') : '—'}</b></div><div><span>Último acesso</span><b>${c.ultUso ? new Date(c.ultUso).toLocaleString('pt-PT') : '—'}</b></div><div><span>Entradas</span><b class="mono">${c.entradas || 0}</b></div><div><span>Termos aceites</span><b>${c.termos ? 'versão de ' + esc(c.termos) + (c.termosAt ? ' · ' + new Date(c.termosAt).toLocaleString('pt-PT') : '') : 'ainda não'}</b></div><div><span>Uso nos últimos 30 dias</span><b class="mono">${hmin(tot)} · ${on} ${on === 1 ? 'dia' : 'dias'}</b></div></div>
    <h4 style="margin:16px 0 6px">Minutos por dia (30 dias)</h4>${bars(c.dias || {}, 30, 90)}<div class="adm-ax"><span>${D[0].slice(8)}/${D[0].slice(5, 7)}</span><span>hoje</span></div></div>`); };
A.admCsv = () => { if (!ADM) return; const D = lastDays(30), q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = [['Nome', 'E-mail', 'Perfis', 'Criada', 'Última entrada', 'Último acesso', 'Entradas'].concat(D)].concat(ADM.contas.map(c => [c.nome, c.email, (c.perfis || []).join(' / '), c.criado ? new Date(c.criado).toISOString() : '', c.ultEntrada ? new Date(c.ultEntrada).toISOString() : '', c.ultUso ? new Date(c.ultUso).toISOString() : '', c.entradas || 0].concat(D.map(d => (c.dias || {})[d] || 0))));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(q).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'nautilo-contas-' + today() + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
document.addEventListener('input', e => { if (e.target.id !== 'admQ') return; const q = e.target.value.trim().toLowerCase(); document.querySelectorAll('.adm-r[data-q]').forEach(r => { r.hidden = !!q && !r.dataset.q.includes(q); }); });
OS.on('ready', () => Acc.navAdm());

/* ---------- dentro da app ---------- */
OS.on('ready', () => { const p = cur(); if (!p) return;
  // conta criada ao guardar o Náutilo pessoal: o código de recuperação aparece uma vez
  const rc = LS.get('nau:rec', ''); if (rc) { LS.del('nau:rec'); setTimeout(() => OS.UI.modal(`<div style="padding:20px"><h3 style="margin:0 0 8px">Guarda o teu código de recuperação</h3><p class="mut" style="margin:0 0 12px">Se te esqueceres da senha da conta, é com este código que a recuperas. Aparece só agora: tira uma fotografia ou guarda-o no gestor de senhas.</p><div class="ac-code">${esc(rc)}</div><div class="row gap8" style="margin-top:14px"><button class="btn pri" data-mclose>Já guardei</button></div></div>`), 900); }
  const pr = OS.one('profile'); if (!pr.short && !pr.name) OS.setOne('profile', { name: p.nome, short: first(p.nome) });
  const sec = OS.one('security'), r = LS.get(K.reset, {});
  if (r[p.id]) { OS.setOne('security', { hash: r[p.id], changed: U.today() }); delete r[p.id]; LS.set(K.reset, r); }
  else if (!sec.hash && p.lk) OS.setOne('security', { hash: p.lk, changed: U.today() });
  // o código mudado em Definições passa também para a conta (para o "Esqueci o código" e os outros aparelhos)
  OS.on('one:security', () => { const h = OS.one('security').hash, q = cur(); if (h && q && h !== q.lk) conta('perfil', { acao: 'editar', id: q.id, perfil: { lk: h } }).then(takeConta).catch(() => { }); });
  // Definições › Conta e perfis
  if (OS.SETT && !OS.SETT.some(t => t[0] === 'conta')) OS.SETT.splice(1, 0, ['conta', 'Conta e perfis']);
  const sv = OS.settingsView; if (sv && !sv.__acc) { OS.settingsView = s => String(s || '') === 'conta' ? settings() : sv(s); OS.settingsView.__acc = 1; }
});
// a bolinha do perfil na barra de cima (como na Netflix): toca para trocar de perfil ou ver a conta
Acc.bubble = () => { const p = cur(); return p ? `<button class="ac-bub" data-act="accMenu" aria-label="Perfil ${esc(p.nome)}" title="${esc(p.nome)}">${avatar(p)}</button>` : ''; };
A.accMenu = () => { const p = cur(); if (!p) return; OS.UI.modal(`<div class="ac-menu"><div class="ac-mh">${avatar(p, 1)}<div><b>${esc(p.nome)}</b><small class="mut">${esc(Acc.email())}</small></div></div>
  <div class="list"><button class="li" data-act="accEdit"><div class="li-t"><b>Editar perfil</b><small>Nome, cor e avatar: emoji, foto ou personagem do Dominus</small></div><span class="mut">›</span></button><button class="li" data-act="accSwitch"><div class="li-t"><b>Trocar de perfil</b><small>${profiles().length} ${profiles().length === 1 ? 'perfil' : 'perfis'} nesta conta</small></div><span class="mut">›</span></button>
  <a class="li" href="#definicoes.conta" data-mclose><div class="li-t"><b>Conta e perfis</b><small>Senha, código de recuperação, sincronização</small></div><span class="mut">›</span></a>
  <button class="li" data-act="accOut"><div class="li-t"><b>Sair da conta</b><small>Os dados ficam guardados na conta</small></div><span class="mut">›</span></button></div></div>`, 'ac-modal'); };
A.accSwitch = () => { OS.UI.closeModal(); Acc.switchProfile(); };
A.accEdit = () => { const p = cur(); if (!p) return; GAL = null; OS.UI.modal(`<form class="ac-menu ac-edit" data-form="accProf"><div class="row between" style="align-items:center"><h3 style="margin:0">Editar perfil</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${OS.UI.ic('x')}</button></div>
  <label class="ac-f"><span>Nome</span><input name="nome" type="text" maxlength="24" required autocomplete="off" value="${esc(p.nome || '')}"></label>${avEditor(p)}<div class="ac-f"><span>Cor</span>${swatches(p.cor)}</div>
  <div class="row gap8"><button class="btn pri">Guardar</button><button type="button" class="btn ghost" data-mclose>Cancelar</button></div></form>`, 'ac-modal'); };
OS.forms.accProf = async f => { const nome = f.elements.nome.value.trim(); if (!nome) { OS.UI.toast('Escreve o nome do perfil', 'warn'); return; }
  try { const j = await conta('perfil', { acao: 'editar', id: pid(), perfil: { nome, cor: formVal(f, 'cor'), av: formVal(f, 'av'), img: f.elements.img.value } }); takeConta(j); OS.UI.closeModal(); OS.UI.toast('Perfil guardado', 'pos'); OS.request(); }
  catch (e) { OS.UI.toast(e.net ? 'Sem ligação à internet. Tenta outra vez.' : e.message, 'neg'); } };
A.accOut = () => { OS.UI.closeModal(); logout(); };
A.accSync = async () => { OS.UI.toast('A sincronizar…'); await Acc.flush().catch(() => { }); if (Acc.poll) await Acc.poll(); OS.UI.toast(SY.err ? 'Sem ligação: fica guardado neste aparelho' : 'Tudo sincronizado', SY.err ? 'warn' : 'pos'); OS.request(); };
A.accAll = async () => { try { const j = await conta('sairtodos'); S.t = j.token; saveS(); OS.UI.toast('Saíste de todos os outros aparelhos', 'pos'); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
OS.forms = OS.forms || {};
/* ---------- atalho de gastos do iPhone sem script: cada perfil tem o seu link (a caixa fica na conta) ---------- */
const AKK = () => 'nau:ak:' + pid();
Acc.atalho = () => { const k = LS.get(AKK(), ''); return k ? { url: new URL('api/atalho', document.baseURI).href, key: k } : null; };
const ensureAk = async nova => { if (!cur() || (!nova && LS.get(AKK(), ''))) return; const j = await conta('atalho', { id: pid(), nova: !!nova }); LS.set(AKK(), j.chave); };
OS.on('ready', () => setTimeout(() => ensureAk().then(() => { const c = OS.one('inbox'); if (!(c.url && c.key) && OS.Inbox && OS.Inbox.pull) OS.Inbox.pull(false); }).catch(() => { }), 1500));
const akLink = () => { const a = Acc.atalho(); return a ? a.url + '?k=' + encodeURIComponent(a.key) : ''; }; Acc.akLink = akLink;
A.accAkCopy = async () => { const l = akLink(); if (!l) { await ensureAk().catch(() => { }); OS.request(); return; } try { await navigator.clipboard.writeText(l); OS.UI.toast('Link copiado: cola-o no atalho', 'pos'); } catch (e) { OS.UI.toast('Toca no link, seleciona e copia', 'warn'); } };
A.accAkNew = async () => { if (!confirm('Criar um link novo? O atalho antigo deixa de funcionar até colares o novo.')) return; try { await ensureAk(true); OS.UI.toast('Link novo criado', 'pos'); OS.request(); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
A.accAkTest = async () => { const a = Acc.atalho(); if (!a) return; try { const r = await fetch(a.url, { method: 'POST', body: new URLSearchParams({ k: a.key, v: '1', d: '__teste__' }) }); if (!r.ok) throw new Error(await r.text());
    OS.Inbox.testOk = false; await OS.Inbox.pull(false); OS.UI.toast(OS.Inbox.testOk ? 'O atalho está a funcionar: o Náutilo recebeu o teste (não conta nas finanças).' : 'O teste ainda não chegou. Tenta outra vez.', OS.Inbox.testOk ? 'pos' : 'warn'); }
  catch (e) { OS.UI.toast('O teste falhou: ' + e.message, 'neg'); } };
Acc.atalhoPanel = () => { const l = akLink(), UI = OS.UI;
  return `<div class="pn" id="inboxPn"><div class="pn-h"><h3>Atalho de gastos no iPhone</h3></div>
  <p class="mut" style="margin:0 0 14px">Um toque no Centro de Controlo → valor → descrição → fica registado neste perfil, sem abrir o Náutilo. Não precisas de configurar nada fora do Náutilo.</p>
  <div class="ib-w"><div class="ib-s"><i>1</i><div><b>O teu link</b><p>É só deste perfil. Não o partilhes: quem o tiver pode registar gastos aqui.</p>
    ${l ? `<div class="ib-link"><code>${esc(l)}</code><button class="btn sm pri" data-act="accAkCopy">Copiar link</button></div><div class="row gap8" style="margin-top:8px"><button class="btn sm" data-act="accAkTest">Testar agora</button><button class="btn sm ghost" data-act="accAkNew">Criar link novo</button></div>` : `<button class="btn sm pri" data-act="accAkCopy">Criar o link</button>`}</div></div>
    <div class="ib-s"><i>2</i><div><b>Criar o atalho (3 ações)</b><p>App <b>Atalhos</b> → <b>+</b> → nome "Gasto". Adiciona:</p>
      <div class="ib-sc"><div><b>1 · Pedir entrada</b> → toca em "Texto" e muda para <b>Número</b> → pergunta: <i>Quanto gastaste?</i></div><div><b>2 · Pedir entrada</b> → Texto → pergunta: <i>Em quê?</i></div><div><b>3 · Obter conteúdo do URL</b> → cola o <b>link</b> → ▸ (mostrar mais) → Método: <b>POST</b> → Corpo do pedido: <b>Formulário</b> → <b>Adicionar campo → Texto</b>: chave <code>v</code> com a 1.ª <b>Entrada fornecida</b>; chave <code>d</code> com a 2.ª.</div></div>
      <p>Toca em ▶️ para experimentar: deve aparecer "✓ … registado no Náutilo".</p></div></div>
    <div class="ib-s"><i>3</i><div><b>Pôr no Centro de Controlo</b><p>Centro de Controlo → <b>+</b> → <b>Adicionar controlo</b> → <b>Atalhos</b> → <b>Atalho</b> → <b>Escolher</b> → "Gasto". Também podes pô-lo no <b>botão de Ação</b> ou no ecrã principal.</p></div></div></div>
  <p class="mut" style="margin:12px 0 0;font-size:12.5px">Os gastos entram em Finanças quando abres o Náutilo, com a categoria adivinhada pela descrição e a etiqueta <i>atalho</i>.</p></div>`; };
OS.forms.accPw = async f => { try { const j = await conta('senha', { atual: f.elements.atual.value, nova: f.elements.nova.value }); takeConta(j); OS.UI.toast('Senha mudada. Os outros aparelhos vão pedir a senha nova.', 'pos'); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
OS.forms.accRec = async f => { try { const j = await conta('novocodigo', { senha: f.elements.senha.value }); OS.UI.modal(`<div style="padding:20px"><h3 style="margin:0 0 8px">Código de recuperação novo</h3><p class="mut">O antigo deixou de valer. Guarda este:</p><div class="ac-code">${esc(j.recuperacao)}</div><div class="row gap8" style="margin-top:14px"><button class="btn pri" data-mclose>Já guardei</button></div></div>`); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
OS.forms.accName = async f => { try { const j = await conta('nome', { nome: f.elements.nome.value }); takeConta(j); OS.UI.toast('Nome guardado', 'pos'); OS.request(); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
OS.forms.accDel = async f => { if (!confirm('Apagar a conta, todos os perfis e todos os dados, em todos os aparelhos? Não dá para desfazer.')) return;
  try { await conta('apagar', { senha: f.elements.senha.value }); S = null; saveS(); LS.del(K.owner); LS.del(K.p); wipeLocal(); location.replace(location.pathname); location.reload(); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
const settings = () => { const UI = OS.UI, p = cur() || {}, L = profiles(), ago = SY.last ? Math.max(0, Math.round((Date.now() - SY.last) / 1000)) : null;
  const head = UI.head('Definições', 'A tua conta Náutilo: perfis, senha e sincronização entre aparelhos.', '', 'Sistema') + UI.tabs('definicoes', OS.SETT, 'conta');
  return head + `<div class="set-page ac-set">
  <div class="pn"><div class="pn-h"><h3>${UI.ic('user')}Conta</h3><span class="mut">${esc(Acc.email())}</span></div>
    <form data-form="accName" class="row gap8" style="align-items:flex-end"><label class="grow">Nome da conta<input class="field" name="nome" maxlength="40" value="${esc((S && S.n) || '')}"></label><button class="btn">Guardar</button></form></div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('users')}Perfis</h3><span class="mut">${L.length} de 5</span></div>
    <div class="ac-plist">${L.map(x => `<div class="ac-pl">${avatar(x)}<b>${esc(x.nome)}</b>${x.id === p.id ? '<small class="mu-tag">a usar</small>' : ''}</div>`).join('')}</div>
    <div class="row gap8" style="margin-top:12px"><button class="btn pri" data-act="accEdit">Editar este perfil</button><button class="btn" data-act="accSwitch">Trocar ou gerir perfis</button></div></div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('sync')}Sincronização</h3><span class="mut">${esc(SY.state)}</span></div>
    <p class="mut" style="margin:0 0 10px">Tudo o que registas neste perfil vai sozinho para a tua conta, cifrado, e aparece nos teus outros aparelhos em segundos.${ago != null ? ` Última vez: há ${ago < 60 ? ago + ' s' : Math.round(ago / 60) + ' min'}.` : ''}${pend.size ? ` ${pend.size} ${pend.size === 1 ? 'alteração por enviar' : 'alterações por enviar'}.` : ''}</p>
    <div class="row gap8"><button class="btn" data-act="accSync">Sincronizar agora</button></div></div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('key')}Senha</h3></div>
    <form data-form="accPw" class="col gap8"><label>Senha atual<input class="field" name="atual" type="password" autocomplete="current-password" required></label><label>Senha nova<input class="field" name="nova" type="password" minlength="8" autocomplete="new-password" required></label><div><button class="btn">Mudar a senha</button></div></form>
    <form data-form="accRec" class="row gap8" style="align-items:flex-end;margin-top:14px"><label class="grow">Novo código de recuperação (pede a senha)<input class="field" name="senha" type="password" autocomplete="current-password" required></label><button class="btn ghost">Gerar</button></form></div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('lock')}Aparelhos</h3></div><p class="mut" style="margin:0 0 10px">Perdeste um telemóvel? Termina a sessão em todos os outros aparelhos (este fica).</p>
    <div class="row gap8"><button class="btn" data-act="accAll">Sair dos outros aparelhos</button><button class="btn ghost" data-act="accOut">Sair da conta neste aparelho</button></div></div>
  <div class="pn ac-danger"><div class="pn-h"><h3>Apagar a conta</h3></div><p class="mut" style="margin:0 0 10px">Apaga a conta, os ${L.length} ${L.length === 1 ? 'perfil' : 'perfis'} e todos os dados, em todos os aparelhos.</p>
    <form data-form="accDel" class="row gap8" style="align-items:flex-end"><label class="grow">Senha da conta<input class="field" name="senha" type="password" autocomplete="current-password" required></label><button class="btn neg">Apagar a conta</button></form></div></div>`; };
})();
