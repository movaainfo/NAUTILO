/* NÁUTILO — Senhas: um cofre para senhas, e-mails, contas, bancos, Wi-Fi e notas seguras.
   Tudo é cifrado no teu aparelho (AES-GCM de 256 bits, chave tirada da tua senha mestra com PBKDF2-SHA256, 310 000 voltas)
   antes de ser guardado ou sincronizado: no armazenamento e na sincronização só existe texto cifrado.
   A senha mestra nunca é guardada nem enviada a lado nenhum, e o cofre nunca vai para a IA nem para o Spyke.
   Se esqueceres a senha mestra, ninguém consegue abrir o cofre. Fecha-se sozinho ao fim de 5 minutos sem uso e quando sais da app. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc;
OS.ONE_DEF.vault = {};
const ITER = 310000, KINDS = ['Conta', 'E-mail', 'Banco', 'Cartão', 'Wi-Fi', 'Trabalho', 'Faculdade', 'Nota segura', 'Outro'];
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = a => btoa(String.fromCharCode(...new Uint8Array(a))), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const rand = n => crypto.getRandomValues(new Uint8Array(n));
const derive = async (pw, salt, iter) => { const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); };
const seal = async (key, obj) => { const iv = rand(12), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))); return { iv: b64(iv), ct: b64(ct) }; };
const open = async (key, box) => JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct))));

// estado em memória (só enquanto o cofre está aberto)
let KEY = null, ITEMS = [], idle = 0, show = new Set(), busy = false;
const has = () => { const v = OS.one('vault'); return !!(v && v.salt && v.box); };
const lock = () => { KEY = null; ITEMS = []; show = new Set(); clearTimeout(idle); };
const touch = () => { clearTimeout(idle); idle = setTimeout(() => { lock(); if (/^#senhas/.test(location.hash)) OS.request(); }, 5 * 60e3); };
const persist = async () => { const v = OS.one('vault'); OS.setOne('vault', { box: await seal(KEY, { items: ITEMS }), n: ITEMS.length, at: Date.now() }); return v; };
document.addEventListener('visibilitychange', () => { if (document.hidden && KEY) { lock(); } });
addEventListener('hashchange', () => { if (KEY && !/^#senhas/.test(location.hash)) lock(); });
OS.on && OS.on('remote', () => { if (KEY) { const v = OS.one('vault'); open(KEY, v.box).then(o => { ITEMS = o.items || []; OS.request(); }).catch(() => lock()); } });

/* ---------- força e geração de senhas ---------- */
const strength = p => { p = String(p || ''); if (!p) return 0; let pool = 0; if (/[a-z]/.test(p)) pool += 26; if (/[A-Z]/.test(p)) pool += 26; if (/\d/.test(p)) pool += 10; if (/[^A-Za-z0-9]/.test(p)) pool += 32;
  let bits = p.length * Math.log2(Math.max(pool, 2)); if (/^(.)\1+$/.test(p) || /1234|abcd|qwer|password|senha|123123|000/i.test(p)) bits *= .4; return bits < 40 ? 1 : bits < 60 ? 2 : bits < 85 ? 3 : 4; };
const SL = ['', 'Fraca', 'Razoável', 'Forte', 'Muito forte'], SC = ['', 'neg', 'warn', 'pos', 'pos'];
const gen = (n = 20) => { const C = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?-_+='; const r = crypto.getRandomValues(new Uint32Array(n)); let s = ''; for (let i = 0; i < n; i++) s += C[r[i] % C.length]; return /[!@#$%&*?\-_+=]/.test(s) && /\d/.test(s) ? s : gen(n); };
const reused = () => { const m = {}; ITEMS.forEach(i => { if (i.pass) (m[i.pass] = m[i.pass] || []).push(i.id); }); return new Set(Object.values(m).filter(a => a.length > 1).flat()); };
const copy = async (t, what) => { try { await navigator.clipboard.writeText(t); UI.toast(what + ' copiado. Limpo daqui a 30 s.', 'pos'); setTimeout(() => { try { navigator.clipboard.writeText(''); } catch (e) { } }, 30000); } catch (e) { UI.toast('Não consegui copiar neste navegador', 'warn'); } };

/* ---------- página ---------- */
const hostOf = u => { try { return new URL(/^https?:/.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
const setup = () => `<section class="pn vlt-gate"><div class="vlt-ic">${UI.ic('key')}</div><h2>Criar o teu cofre</h2>
  <p class="mut">Escolhe uma senha mestra: é a única que vais ter de decorar. Tudo o que guardares aqui é cifrado no teu aparelho com ela, antes de ir para a sincronização. Ninguém a vê: nem o Náutilo, nem o Google, nem eu.</p>
  <form data-form="vltNew" class="vlt-f" autocomplete="off"><label>Senha mestra (12 caracteres ou mais)<input class="field" type="password" name="p1" minlength="12" required autocomplete="new-password"></label><label>Repete a senha mestra<input class="field" type="password" name="p2" minlength="12" required autocomplete="new-password"></label>
  <label class="vlt-ck"><input type="checkbox" name="ok" required> Percebi: se eu esquecer a senha mestra, o cofre não pode ser aberto por ninguém.</label><button class="btn pri">${UI.ic('lock')}Criar cofre</button></form></section>`;
const gate = () => { const v = OS.one('vault'); return `<section class="pn vlt-gate"><div class="vlt-ic">${UI.ic('lock')}</div><h2>Cofre fechado</h2><p class="mut">${v.n ? `${v.n} ${v.n === 1 ? 'item guardado' : 'itens guardados'}, cifrados.` : 'Cofre vazio.'} Escreve a senha mestra para abrir. Fecha-se sozinho ao fim de 5 minutos sem uso.</p>
  <form data-form="vltOpen" class="vlt-f" autocomplete="off"><input class="field" type="password" name="p" required autocomplete="current-password" placeholder="Senha mestra" aria-label="Senha mestra" id="vltPw"><button class="btn pri" ${busy ? 'disabled' : ''}>${busy ? 'A abrir…' : 'Abrir'}</button></form></section>`; };
const row = (it, rs) => { const st = strength(it.pass), sh = show.has(it.id), h = hostOf(it.url);
  return `<div class="vlt-it"><div class="vlt-av">${esc((it.name || '?').trim().slice(0, 1).toUpperCase())}</div><div class="vlt-t"><b>${esc(it.name || 'Sem nome')}</b>${it.login ? `<small class="mut">${esc(it.login)}</small>` : ''}
    ${it.pass ? `<code class="vlt-pw ${sh ? '' : 'hid'}">${sh ? esc(it.pass) : '••••••••••'}</code>` : ''}${it.notes && it.kind === 'Nota segura' && sh ? `<p class="vlt-note">${esc(it.notes)}</p>` : ''}
    <div class="vlt-tags">${it.pass ? UI.badge(SL[st], SC[st]) : ''}${rs.has(it.id) ? UI.badge('repetida noutra conta', 'warn') : ''}${h ? `<a class="acc" href="${esc(/^https?:/.test(it.url) ? it.url : 'https://' + it.url)}" target="_blank" rel="noopener noreferrer">${esc(h)}</a>` : ''}</div></div>
    <div class="vlt-a">${it.login ? `<button class="icon-btn" data-act="vltCopy" data-id="${it.id}" data-f="login" title="Copiar utilizador" aria-label="Copiar utilizador de ${esc(it.name)}">${UI.ic('user')}</button>` : ''}${it.pass || it.notes ? `<button class="icon-btn" data-act="vltShow" data-id="${it.id}" title="${sh ? 'Esconder' : 'Mostrar'}" aria-label="${sh ? 'Esconder' : 'Mostrar'}">${UI.ic('eye')}</button>` : ''}${it.pass ? `<button class="icon-btn" data-act="vltCopy" data-id="${it.id}" data-f="pass" title="Copiar senha" aria-label="Copiar senha de ${esc(it.name)}">${UI.ic('key')}</button>` : ''}<button class="icon-btn" data-act="vltEdit" data-id="${it.id}" title="Editar" aria-label="Editar ${esc(it.name)}">${UI.ic('edit')}</button></div></div>`; };
const list = () => { const q = String((OS.ui.vlt || {}).q || '').toLowerCase(), k = OS.ui.vltK || '', rs = reused(), L = U.sortBy(ITEMS.filter(i => (!k || i.kind === k) && (!q || [i.name, i.login, i.url, i.kind].join(' ').toLowerCase().includes(q))), i => (i.name || '').toLowerCase());
  const weak = ITEMS.filter(i => i.pass && strength(i.pass) <= 1).length, kinds = KINDS.filter(x => ITEMS.some(i => i.kind === x));
  return `<div class="kpis">${UI.kpi('Itens no cofre', ITEMS.length)}${UI.kpi('Senhas fracas', weak, '', { tone: weak ? 'warn' : '' })}${UI.kpi('Senhas repetidas', rs.size, '', { tone: rs.size ? 'warn' : '' })}</div>
  <div class="row gap8 vlt-bar"><input class="field" type="search" placeholder="Procurar no cofre" aria-label="Procurar no cofre" data-uif="vlt.q" value="${esc((OS.ui.vlt || {}).q || '')}"><button class="btn pri" data-act="vltNew">${UI.ic('plus')}Novo</button><button class="btn ghost" data-act="vltLock">${UI.ic('lock')}Fechar</button></div>
  ${kinds.length > 1 ? `<div class="row gap8">${UI.chip('Tudo', 'vltK', !k, 'data-v=""')}${kinds.map(x => UI.chip(x, 'vltK', k === x, `data-v="${x}"`)).join('')}</div>` : ''}
  <section class="pn">${L.length ? L.map(it => row(it, rs)).join('') : ITEMS.length ? '<p class="mut">Nada com esse nome.</p>' : UI.empty('O cofre está vazio. Começa pelas contas que usas todos os dias: o e-mail, o banco, a faculdade.', `<button class="btn pri" data-act="vltNew">${UI.ic('plus')}Guardar a primeira</button>`)}</section>
  <details class="pn vlt-more"><summary>Senha mestra e segurança</summary><p class="mut">Cifra AES-GCM de 256 bits feita no teu aparelho; a chave sai da senha mestra (PBKDF2, ${U.nf(ITER)} voltas). A sincronização só leva texto cifrado. O cofre nunca vai para a IA nem para o Spyke.</p>
    <form data-form="vltMaster" class="vlt-f" autocomplete="off"><label>Senha mestra atual<input class="field" type="password" name="o" required autocomplete="current-password"></label><label>Nova senha mestra (12 ou mais)<input class="field" type="password" name="n" minlength="12" required autocomplete="new-password"></label><button class="btn">Mudar a senha mestra</button></form></details>`; };
V.senhas = () => { if (KEY) touch(); return UI.head('Senhas', 'As tuas senhas, e-mails e contas num cofre cifrado com a tua senha mestra. Só tu o abres.', '', 'Eu') + (!has() ? setup() : !KEY ? gate() : list()); };

/* ---------- formulário de um item ---------- */
const form = it => { it = it || { kind: 'Conta' }; const g = OS.ui.vltGen;
  UI.modal(`<form class="vlt-ed" data-form="vltSave" data-id="${esc(it.id || '')}" autocomplete="off"><h3>${it.id ? 'Editar' : 'Guardar no cofre'}</h3>
    <label>Tipo<select class="field" name="kind">${KINDS.map(k => `<option ${k === it.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
    <label>Nome (serviço ou conta)<input class="field" name="name" required maxlength="80" value="${esc(it.name || '')}" placeholder="Ex.: Gmail, Caixa Geral, Wi-Fi de casa"></label>
    <label>Utilizador ou e-mail<input class="field" name="login" maxlength="160" value="${esc(it.login || '')}" autocomplete="off"></label>
    <label>Senha<span class="vlt-pwrow"><input class="field" name="pass" id="vltP" type="text" maxlength="200" value="${esc(g || it.pass || '')}" autocomplete="off" spellcheck="false" data-1p-ignore data-lpignore="true"><button type="button" class="btn sm" data-act="vltGen">Gerar</button></span></label>
    <label>Endereço (opcional)<input class="field" name="url" maxlength="300" value="${esc(it.url || '')}" placeholder="banco.pt"></label>
    <label>Notas (PIN, perguntas de segurança, códigos de recuperação…)<textarea class="field" name="notes" rows="3" maxlength="2000">${esc(it.notes || '')}</textarea></label>
    <div class="row gap8 between">${it.id ? `<button type="button" class="btn ghost danger" data-act="vltDel" data-id="${esc(it.id)}">Apagar</button>` : '<span></span>'}<div class="row gap8"><button type="button" class="btn ghost" data-mclose>Cancelar</button><button class="btn pri">Guardar</button></div></div></form>`);
  OS.ui.vltGen = ''; };

/* ---------- ações ---------- */
OS.forms.vltNew = async (f) => { const a = f.elements.p1.value, b = f.elements.p2.value; if (a.length < 12) return UI.toast('A senha mestra precisa de 12 caracteres ou mais', 'warn'); if (a !== b) return UI.toast('As duas senhas não são iguais', 'warn');
  const salt = rand(16); KEY = await derive(a, salt, ITER); ITEMS = []; OS.setOne('vault', { v: 1, salt: b64(salt), iter: ITER, box: await seal(KEY, { items: [] }), n: 0, at: Date.now() }); touch(); UI.toast('Cofre criado', 'pos'); OS.request(); };
OS.forms.vltOpen = async (f) => { const p = f.elements.p.value, v = OS.one('vault'); if (!p || busy) return; busy = true; OS.request();
  try { const k = await derive(p, unb64(v.salt), v.iter || ITER), o = await open(k, v.box); KEY = k; ITEMS = Array.isArray(o.items) ? o.items : []; touch(); }
  catch (e) { UI.toast('Senha mestra errada', 'neg'); } busy = false; OS.request(); };
OS.forms.vltSave = async (f, v) => { if (!KEY) return UI.toast('O cofre fechou. Abre outra vez.', 'warn'); const id = f.dataset.id, raw = n => (f.elements[n] && f.elements[n].value || '');
  const it = { kind: raw('kind') || 'Conta', name: v('name').slice(0, 80), login: v('login').slice(0, 160), pass: raw('pass').slice(0, 200), url: v('url').slice(0, 300), notes: raw('notes').slice(0, 2000), up: Date.now() };
  if (!it.name) return; if (id) { const i = ITEMS.findIndex(x => x.id === id); if (i >= 0) ITEMS[i] = Object.assign({}, ITEMS[i], it); } else ITEMS.push(Object.assign({ id: U.uid(), at: Date.now() }, it));
  await persist(); touch(); UI.closeModal(); UI.toast('Guardado no cofre', 'pos'); OS.request(); };
OS.forms.vltMaster = async (f) => { const o = f.elements.o.value, n = f.elements.n.value, v = OS.one('vault'); if (n.length < 12) return UI.toast('A nova senha mestra precisa de 12 caracteres ou mais', 'warn');
  try { const k0 = await derive(o, unb64(v.salt), v.iter || ITER); await open(k0, v.box); } catch (e) { return UI.toast('A senha mestra atual não está certa', 'neg'); }
  const salt = rand(16); KEY = await derive(n, salt, ITER); OS.setOne('vault', { salt: b64(salt), iter: ITER, box: await seal(KEY, { items: ITEMS }), n: ITEMS.length, at: Date.now() }); touch(); UI.toast('Senha mestra mudada', 'pos'); };
A.vltNew = () => { if (!KEY) return; touch(); form(null); };
A.vltEdit = b => { if (!KEY) return; touch(); form(ITEMS.find(x => x.id === b.dataset.id)); };
A.vltGen = () => { const i = document.getElementById('vltP'); if (i) { i.value = gen(20); i.focus(); } };
A.vltShow = b => { touch(); const id = b.dataset.id; show.has(id) ? show.delete(id) : show.add(id); OS.request(); };
A.vltCopy = b => { touch(); const it = ITEMS.find(x => x.id === b.dataset.id); if (!it) return; copy(b.dataset.f === 'login' ? it.login : it.pass, b.dataset.f === 'login' ? 'Utilizador' : 'Senha'); };
A.vltDel = b => { const id = b.dataset.id, it = ITEMS.find(x => x.id === id); if (!it) return; UI.closeModal(); UI.ask('Apagar do cofre?', `"${esc(it.name)}" sai do cofre para sempre.`, 'Apagar', async () => { ITEMS = ITEMS.filter(x => x.id !== id); await persist(); UI.toast('Apagado'); OS.request(); }, 'danger'); };
A.vltLock = () => { lock(); OS.request(); };
A.vltK = b => OS.setUI('vltK', b.dataset.v);
OS.Vault = { open: () => !!KEY, lock, strength, has };
})();
