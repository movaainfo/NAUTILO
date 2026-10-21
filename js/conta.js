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
const takeConta = (j, email) => { S = Object.assign(S || {}, { t: j.token || (S && S.t), e: (j.conta && j.conta.email) || email || (S && S.e), n: (j.conta && j.conta.nome) || '', perfis: (j.conta && j.conta.perfis) || [] }); saveS(); };

const Acc = OS.Acc = { on: !personal };
const A = OS.act = OS.act || {}; OS.forms = OS.forms || {};
if (personal) {
  /* ---------- modo pessoal: guardar este Náutilo numa conta (o que é do Ryan vai para a conta dele) ---------- */
  const moved = () => OS.one('meta').acc || '';
  // cria (ou entra n)a conta, cria o perfil pessoal com o mesmo código de bloqueio e envia todos os dados deste aparelho
  Acc.migrate = async (email, senha, criar) => { email = String(email || '').trim().toLowerCase();
    const j = await conta(criar ? 'registar' : 'entrar', criar ? { email, senha, nome: OS.one('profile').name || '' } : { email, senha }); takeConta(j, email);
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
    OS.UI.toast('A guardar o teu Náutilo na conta…');
    try { const r = await Acc.migrate(em.value, pw.value, criar); OS.UI.toast(`Guardado: ${r.docs} partes dos teus dados na conta. A abrir com a conta…`, 'pos'); setTimeout(() => location.reload(), 900); }
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
      <div class="col gap8"><label>E-mail<input class="field" id="accMigE" type="email" autocomplete="email"></label><label>Senha da conta (pelo menos 8 caracteres)<input class="field" id="accMigP" type="password" autocomplete="new-password"></label>
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
const avatar = (p, big) => `<span class="ac-av${big ? ' big' : ''}" style="--c:${esc(p.cor || PCOL[0])}">${esc(p.av || first(p.nome).slice(0, 1).toUpperCase() || '?')}</span>`;
const field = (n, label, type = 'text', extra = '') => `<label class="ac-f"><span>${label}</span><input name="${n}" type="${type}" ${extra}></label>`;
const lockFields = () => `${field('c1', 'Código de bloqueio do perfil', 'password', 'minlength="6" autocomplete="new-password" required placeholder="pelo menos 6 caracteres"')}${field('c2', 'Repete o código', 'password', 'minlength="6" autocomplete="new-password" required')}`;
const swatches = sel => `<div class="ac-sw" role="radiogroup" aria-label="Cor">${PCOL.map(c => `<label><input type="radio" name="cor" value="${c}" ${c === sel ? 'checked' : ''}><i style="--c:${c}"></i></label>`).join('')}</div>`;
const avPick = sel => `<div class="ac-avs" role="radiogroup" aria-label="Avatar">${AVS.map(a => `<label><input type="radio" name="av" value="${a}" ${a === (sel || '') ? 'checked' : ''}><i>${a || 'Aa'}</i></label>`).join('')}</div>`;
const view = () => {
  const m = gMode, msg = gMsg ? `<p class="ac-msg" role="status">${esc(gMsg)}</p>` : '';
  if (m === 'perfis') { const L = profiles();
    return `<div class="ac-who"><h1 class="ac-h">${L.length ? 'Quem está a usar o Náutilo?' : 'Cria o teu primeiro perfil'}</h1>${msg}
      <div class="ac-grid">${L.map(p => `<button class="ac-p${gManage ? ' edit' : ''}" data-ac="${gManage ? 'editar' : 'escolher'}" data-id="${p.id}">${avatar(p, 1)}<b>${esc(p.nome)}</b>${gManage ? `<em>Editar</em>` : ''}</button>`).join('')}
      ${L.length < 5 ? `<button class="ac-p add" data-ac="novo"><span class="ac-av big plus">+</span><b>Adicionar perfil</b></button>` : ''}</div>
      <div class="ac-row">${L.length ? `<button class="ac-btn ghost" data-ac="gerir">${gManage ? 'Feito' : 'Gerir perfis'}</button>` : ''}<button class="ac-link" data-ac="sair">Sair da conta${S && S.e ? ' (' + esc(S.e) + ')' : ''}</button></div></div>`; }
  if (m === 'novo' || m === 'editar') { const p = m === 'editar' ? profiles().find(x => x.id === gEdit) || {} : { cor: PCOL[profiles().length % PCOL.length] };
    return `<form class="ac-card" data-acf="${m}"><h2>${m === 'novo' ? 'Novo perfil' : 'Editar perfil'}</h2>
      <p class="ac-sub">${m === 'novo' ? 'Cada perfil tem os seus próprios dados, metas, finanças e jogo. O código de bloqueio é pedido ao abrir o Náutilo com este perfil.' : 'Muda o nome, a cor ou o avatar. O código e os dados ficam como estão.'}</p>
      ${field('nome', 'Nome', 'text', `maxlength="24" required autocomplete="off" value="${esc(p.nome || '')}"`)}
      <div class="ac-f"><span>Avatar</span>${avPick(p.av)}</div><div class="ac-f"><span>Cor</span>${swatches(p.cor)}</div>
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
      <p class="ac-sub">Os teus dados ficam na tua conta, cifrados, e aparecem iguais no telemóvel e no computador. Podes ter até 5 perfis.</p>${msg}
      <button class="ac-btn wide" type="submit" ${gBusy ? 'disabled' : ''}>${gBusy ? 'A criar…' : 'Criar conta'}</button></form>`;
  if (m === 'recuperar') return `<form class="ac-card" data-acf="recuperar"><h2>Recuperar a senha</h2><p class="ac-sub">Usa o código de recuperação que guardaste quando criaste a conta.</p>
      ${field('email', 'E-mail', 'email', 'autocomplete="email" required')}${field('codigo', 'Código de recuperação', 'text', 'autocomplete="off" required placeholder="XXXX-XXXX-XXXX-XXXX"')}${field('nova', 'Senha nova', 'password', 'minlength="8" autocomplete="new-password" required')}${msg}
      <div class="ac-row"><button class="ac-btn" type="submit" ${gBusy ? 'disabled' : ''}>Mudar a senha</button><button class="ac-btn ghost" type="button" data-ac="m" data-v="entrar">Voltar</button></div></form>`;
  return `<form class="ac-card" data-acf="entrar">${tabs}
      ${field('email', 'E-mail', 'email', `autocomplete="email" required value="${esc(LS.get(K.owner, '') || '')}"`)}${field('senha', 'Senha', 'password', 'autocomplete="current-password" required')}${msg}
      <button class="ac-btn wide" type="submit" ${gBusy ? 'disabled' : ''}>${gBusy ? 'A entrar…' : 'Entrar'}</button>
      <button class="ac-link" type="button" data-ac="m" data-v="recuperar">Esqueci a senha</button></form>`; };
const paint = () => { if (!G) return; const box = G.querySelector('.ac-in');
  // ao mostrar um erro, o que já escreveste fica (menos as senhas e códigos)
  const was = box.querySelector('form[data-acf]'), keep = {}; if (was) [...was.querySelectorAll('input[type=text],input[type=email],input[type=radio]:checked')].forEach(i => { keep[i.name] = i.value; });
  const kind = was && was.dataset.acf;
  box.innerHTML = `<div class="ac-brand">${OS.Lock ? OS.Lock.logo(28) : ''}<span>Náutilo</span></div>${gMode === 'perfis' || gMode === 'codigo-rec' ? '' : '<p class="ac-hi">O sistema operativo da tua vida: dinheiro, estudos, treino, metas e o teu jogo, num só sítio.</p>'}${view()}`;
  const now = box.querySelector('form[data-acf]'); if (now && kind === now.dataset.acf) Object.entries(keep).forEach(([n, v]) => { const L = [...now.querySelectorAll(`input[name="${n}"]`)]; if (L[0] && L[0].type === 'radio') L.forEach(r => { r.checked = r.value === v; }); else if (L[0] && v) L[0].value = v; });
  const f = box.querySelector('input:not([type=radio])'); if (f && !f.value && matchMedia('(pointer:fine)').matches) setTimeout(() => f.focus(), 60); };
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
    if (kind === 'entrar') { const email = v('email').trim().toLowerCase(), j = await conta('entrar', { email, senha: v('senha') }); afterLogin(j, email); set('perfis'); return; }
    if (kind === 'criar') { const email = v('email').trim().toLowerCase(), j = await conta('registar', { email, senha: v('senha'), nome: v('nome') }); afterLogin(j, email); gRec = j.recuperacao; S.novo = v('nome'); saveS(); set('codigo-rec'); return; }
    if (kind === 'recuperar') { const email = v('email').trim().toLowerCase(), j = await conta('recuperar', { email, codigo: v('codigo'), nova: v('nova') }); afterLogin(j, email); gRec = j.recuperacao; set('codigo-rec'); return; }
    if (kind === 'novo') { const lk = await code(), j = await conta('perfil', { acao: 'criar', perfil: { nome: v('nome'), cor: val('cor'), av: val('av'), lk } }); takeConta(j); set('perfis'); return; }
    if (kind === 'editar') { const j = await conta('perfil', { acao: 'editar', id: gEdit, perfil: { nome: v('nome'), cor: val('cor'), av: val('av') } }); takeConta(j); set('perfis'); return; }
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
  if (a === 'guardei') { gRec = ''; if (!profiles().length) { gEdit = null; set('novo'); const n = G && G.querySelector('input[name=nome]'); if (n && S && S.novo) n.value = first(S.novo); return; } return set('perfis'); }
  if (a === 'sair') return logout(); }

/* ---------- sair, trocar de perfil ---------- */
const logout = async () => {
  if (pend.size && OS.dbRef && !(await Acc.flush().catch(() => false)) && !confirm('Há alterações que ainda não chegaram à nuvem (sem internet?). Se saíres agora, perdem-se neste aparelho. Sair na mesma?')) return;
  S = null; saveS(); LS.del(K.p); wipeLocal(); location.replace(location.pathname + '#visao'); location.reload(); };
Acc.logout = logout;
Acc.switchProfile = () => { gManage = false; showGate('perfis'); };

/* ---------- arranque ---------- */
const boot = () => {
  if (!S) return showGate(LS.get(K.owner, '') ? 'entrar' : 'criar');
  if (!cur()) return showGate('perfis');
  // sessão e perfil prontos: abre já; a lista de perfis atualiza-se por trás
  (async () => { try { prefetched = await prefetch(); }
    catch (e) { if (e.status === 401 || e.status === 404) return; if (!hasLocal) return showGate('perfis', 'Sem internet. Para abrir este perfil neste aparelho precisas de rede: toca nele outra vez quando tiveres ligação.'); }
    release(); })();
  conta('eu').then(j => { takeConta(j); if (!cur() && !endedOnce) gone(); }).catch(() => { });
};
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 0);

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
  <div class="list"><button class="li" data-act="accSwitch"><div class="li-t"><b>Trocar de perfil</b><small>${profiles().length} ${profiles().length === 1 ? 'perfil' : 'perfis'} nesta conta</small></div><span class="mut">›</span></button>
  <a class="li" href="#definicoes.conta" data-mclose><div class="li-t"><b>Conta e perfis</b><small>Senha, código de recuperação, sincronização</small></div><span class="mut">›</span></a>
  <button class="li" data-act="accOut"><div class="li-t"><b>Sair da conta</b><small>Os dados ficam guardados na conta</small></div><span class="mut">›</span></button></div></div>`, 'ac-modal'); };
A.accSwitch = () => { OS.UI.closeModal(); Acc.switchProfile(); };
A.accOut = () => { OS.UI.closeModal(); logout(); };
A.accSync = async () => { OS.UI.toast('A sincronizar…'); await Acc.flush().catch(() => { }); if (Acc.poll) await Acc.poll(); OS.UI.toast(SY.err ? 'Sem ligação: fica guardado neste aparelho' : 'Tudo sincronizado', SY.err ? 'warn' : 'pos'); OS.request(); };
A.accAll = async () => { try { const j = await conta('sairtodos'); S.t = j.token; saveS(); OS.UI.toast('Saíste de todos os outros aparelhos', 'pos'); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
OS.forms = OS.forms || {};
/* ---------- atalho de gastos do iPhone sem script: cada perfil tem o seu link (a caixa fica na conta) ---------- */
const AKK = () => 'nau:ak:' + pid();
Acc.atalho = () => { const k = LS.get(AKK(), ''); return k ? { url: new URL('api/atalho', document.baseURI).href, key: k } : null; };
const ensureAk = async nova => { if (!cur() || (!nova && LS.get(AKK(), ''))) return; const j = await conta('atalho', { id: pid(), nova: !!nova }); LS.set(AKK(), j.chave); };
OS.on('ready', () => setTimeout(() => ensureAk().then(() => { const c = OS.one('inbox'); if (!(c.url && c.key) && OS.Inbox && OS.Inbox.pull) OS.Inbox.pull(false); }).catch(() => { }), 1500));
const akLink = () => { const a = Acc.atalho(); return a ? a.url + '?k=' + encodeURIComponent(a.key) : ''; };
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
    <div class="row gap8" style="margin-top:12px"><button class="btn pri" data-act="accSwitch">Trocar ou gerir perfis</button></div></div>
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
