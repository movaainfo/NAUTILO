/* OCEANUM — E-mail da faculdade (Outlook / Microsoft 365) separado por matéria.
   Ligação: pela Parte 4 do teu script Google (login oficial da Microsoft; o acesso fica guardado no teu script, por isso
   ligas uma vez e funciona em todos os aparelhos). Nada passa por servidores do Oceanum.
   Matéria de cada e-mail: 1) a que escolheste à mão; 2) a que aprendeu com esse remetente; 3) nome da cadeira, palavras
   dos e-mails e professor(a) (definidos em cada disciplina); 4) a IA; senão, "Geral".
   Se a universidade não deixar ligar apps, reencaminha o Outlook para o Gmail e escolhe o domínio (ex.: ua.pt): esses e-mails
   aparecem aqui na mesma. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
OS.ONE_DEF.unimail = { dom: '', map: {}, snd: {} };
const C = () => { const c = OS.one('unimail'); c.map = c.map || {}; c.snd = c.snd || {}; return c; };
const LK = 'os2ol'; let L = U.ls.get(LK, null) || { at: 0, items: [], user: '', ai: {} }; L.ai = L.ai || {};
const saveL = () => { const keep = new Set(L.items.map(x => x.id)); Object.keys(L.ai).forEach(k => { if (!keep.has(k)) delete L.ai[k]; }); U.ls.set(LK, L); };
let INFO = null, busy = '', err = '', aiBusy = false, RD = {};
const ib = () => OS.one('inbox'), ready = () => !!(ib().url && ib().key);
const url = extra => ib().url.trim() + (ib().url.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(ib().key) + extra;
const getJ = async extra => { const j = await OS.Inbox.getJSON(url(extra + '&_=' + Date.now()), 2); if (!j) throw new Error('o script não respondeu'); return j; };
const postJ = async params => { const r = await fetch(ib().url.trim(), { method: 'POST', body: new URLSearchParams(Object.assign({ k: ib().key }, params)), credentials: 'omit', cache: 'no-store' }); return JSON.parse(await r.text()); };
const nm = f => OS.Mail && OS.Mail._name ? OS.Mail._name(f) : f, addr = f => OS.Mail && OS.Mail._addr ? OS.Mail._addr(f) : String(f || '').toLowerCase();
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

/* ---------- matérias ---------- */
const subs = () => U.sortBy(OS.all('subjects'), s => (s.status === 'Em curso' ? '0' : '1') + (s.name || ''));
const PAL = ['#38BDF8', '#A78BFA', '#34D399', '#F59E0B', '#F472B6', '#FB7185', '#2DD4BF', '#FACC15', '#818CF8', '#F97316'];
const col = id => PAL[U.hash(id || 'geral') % PAL.length];
const keysOf = s => [s.name].concat(String(s.mail || '').split(/[,;]+/), [s.prof]).map(x => norm(x).trim()).filter(x => x.length >= 3);
const byRule = it => { const txt = norm(it.s + ' ' + it.f + ' ' + it.sn); let best = '', bs = 0;
  subs().forEach(s => { let sc = 0; keysOf(s).forEach((k, i) => { if (txt.includes(k)) sc += i === 0 ? 3 : 2; }); norm(s.name).split(' ').filter(w => w.length > 5).forEach(w => { if (txt.includes(w)) sc += .6; }); if (sc > bs) { bs = sc; best = s.id; } });
  return bs >= 1.8 ? best : ''; };
const subjOf = it => { const c = C(), m = c.map[it.id] || c.snd[addr(it.f)] || byRule(it) || L.ai[it.id] || 'geral'; return m === 'geral' || OS.get('subjects', m) ? m : 'geral'; };
const subjName = id => id === 'geral' ? 'Geral' : (OS.get('subjects', id) || {}).name || 'Geral';
// a IA arruma os que as regras não souberam (Google; se não der, a IA grátis de reserva)
const aiSort = async () => { if (aiBusy || !OS.AI || !(OS.AI.key() || (OS.AI.freeOn && OS.AI.freeOn()))) return; const S = subs(); if (!S.length) return;
  const todo = L.items.filter(it => !(it.id in L.ai) && !C().map[it.id] && !C().snd[addr(it.f)] && !byRule(it)).slice(0, 25); if (!todo.length) return; aiBusy = true;
  try { const o = await OS.AI.json([{ text: `Separa estes e-mails da faculdade do Ryan pela disciplina (matéria) a que dizem respeito. Disciplinas: ${JSON.stringify(S.map(s => ({ id: s.id, nome: s.name, professor: s.prof || '', palavras: s.mail || '' })))}.
Se o e-mail não for de nenhuma disciplina (avisos gerais, secretaria, eventos, propinas…), usa "geral". Responde APENAS JSON: {"m":[{"id":"…","disc":"id da disciplina ou geral"}]}
E-mails: ${JSON.stringify(todo.map(it => ({ id: it.id, de: it.f, assunto: it.s, inicio: String(it.sn || '').slice(0, 220) })))}` }], .1);
    (o.m || []).forEach(r => { if (r && r.id && todo.some(t => t.id === r.id)) L.ai[r.id] = r.disc === 'geral' || S.some(s => s.id === r.disc) ? r.disc : 'geral'; });
    todo.forEach(t => { if (!(t.id in L.ai)) L.ai[t.id] = 'geral'; }); saveL(); } catch (e) { } aiBusy = false; OS.request(); };

/* ---------- buscar ---------- */
const info = async () => { try { const j = await getJ('&op=olinfo'); if (j && j.ok && j.v >= 12) INFO = Object.assign({ has4: true }, j); else INFO = { has4: false }; } catch (e) { INFO = { has4: false, off: true }; } OS.request(); return INFO; };
const gmailUni = () => { const d = String(C().dom || '').trim().toLowerCase().replace(/^@/, ''); if (!d || !OS.Mail) return []; return OS.Mail.items().filter(m => (addr(m.f) + ' ' + String(m.to || '')).toLowerCase().includes('@' + d) || addr(m.f).endsWith('.' + d)).map(m => Object.assign({}, m, { gm: 1 })); };
const refresh = async manual => { if (busy || !ready()) return; busy = 'ol'; err = ''; OS.request();
  try { if (!INFO || !INFO.linked) await info(); if (INFO && INFO.linked) { const j = await getJ('&op=ol&n=40'); if (!j.ok) throw new Error(j.msg || 'o Outlook não respondeu'); L = Object.assign(L, { at: Date.now(), items: j.items || [], user: j.user || L.user }); saveL(); aiSort(); }
    else if (manual && !gmailUni().length) UI.toast('Liga primeiro o Outlook (passos abaixo)', 'warn'); }
  catch (e) { err = 'Não consegui ler o Outlook: ' + (e.message || 'erro') + '.'; } busy = ''; OS.request(); };
const all = () => U.sortBy(L.items.concat(gmailUni()), x => x.d || '').reverse();

/* ---------- ecrã ---------- */
const STEPS_AZ = red => `<ol class="ai-steps">
  <li>No computador (ou no telemóvel em modo computador), abre <a class="acc" href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener">portal.azure.com → Registos de aplicações</a> e entra com a <b>conta da faculdade</b>.</li>
  <li><b>Novo registo</b> → Nome: <b>Oceanum</b> → Tipos de conta: <b>Apenas as contas deste diretório organizacional</b> → URI de redirecionamento: escolhe <b>Web</b> e cola este endereço:<div class="ol-copy"><code>${esc(red || '…')}</code><button class="btn xs" data-act="olCopy" data-v="${esc(red || '')}">Copiar</button></div> → <b>Registar</b>.</li>
  <li>Na página da aplicação, copia o <b>ID da Aplicação (cliente)</b> e o <b>ID do Diretório (inquilino)</b>.</li>
  <li><b>Certificados e segredos</b> → <b>Novo segredo de cliente</b> → validade 24 meses → <b>Adicionar</b> → copia o <b>Valor</b> (só aparece uma vez).</li>
  <li><b>Permissões de API</b> → <b>Adicionar uma permissão</b> → <b>Microsoft Graph</b> → <b>Permissões delegadas</b> → marca <b>Mail.Read</b>, <b>Mail.Send</b>, <b>User.Read</b> e <b>offline_access</b> → <b>Adicionar</b>.</li>
  <li>Cola os três valores aqui em baixo e toca em <b>Guardar</b>. Depois <b>Entrar com a conta da faculdade</b>.</li></ol>`;
const setup = () => { if (!ready()) return `<div class="pn"><b>Primeiro liga o script Google</b><p class="mut">O Outlook liga-se através do teu script (o mesmo do Gmail e da sincronização).</p><a class="btn sm pri" href="#email.contas">Ver os passos</a></div>`;
  if (!INFO) { if (!busy) setTimeout(info, 30); return `<div class="pn"><div class="sai-busy"><div class="fd-spin"></div><span>A verificar a ligação ao Outlook…</span></div></div>`; }
  if (!INFO.has4) return `<div class="pn ol-setup"><div class="pn-h"><h3>1 · Junta a Parte 4 ao teu script Google</h3></div><p class="mut" style="margin:0 0 8px">A Parte 4 liga o Outlook da faculdade (e põe a IA sem limites nas perguntas pela Siri). É um ficheiro novo: não apagas nada.</p>
    <ol class="ai-steps"><li>Toca para copiar: <span class="row gap8" style="display:inline-flex;flex-wrap:wrap">${OS.Inbox.partsBtns('btn sm pri', 3, 3)}</span></li><li>Em <a class="acc" href="https://script.google.com/home" target="_blank" rel="noopener">script.google.com</a>, no teu projeto: <b>Arquivos → + → Script</b> → nome <b>Parte4</b> → apaga o que vier → cola → <b>Guardar</b>.</li><li><b>Implantar → Gerenciar implantações → lápis → Nova versão → Implantar</b>.</li><li>Volta aqui e toca em <b>Verificar</b>.</li></ol>
    <button class="btn sm" data-act="olInfo">${UI.ic('sync')}Verificar</button></div>`;
  const admin = /AADSTS65001|AADSTS90094|admin|administrador|consent/i.test(INFO.err || '');
  return `<div class="pn ol-setup"><div class="pn-h"><h3>Ligar o Outlook da faculdade</h3><span class="bdg ${INFO.cfg ? 'pos' : ''}">${INFO.cfg ? 'aplicação guardada' : 'por configurar'}</span></div>
    ${INFO.err ? `<div class="ib-st bad">Na última tentativa: ${esc(INFO.err)}</div>${admin ? `<p class="mut" style="font-size:13px">A tua universidade exige autorização do administrador para apps que leem o e-mail. Duas saídas: (1) pedir ao apoio informático (ex.: <b>sti@ua.pt</b>) para aprovar a app "Oceanum"; ou (2) no Outlook, <b>Definições → Correio → Reencaminhamento</b> para o teu Gmail e escrever o domínio da faculdade em baixo: os e-mails aparecem aqui na mesma, separados por matéria.</p>` : ''}` : ''}
    ${STEPS_AZ(INFO.redirect)}
    <form class="ol-f" data-form="olCfg" autocomplete="off"><input class="field" name="id" placeholder="ID da Aplicação (cliente)" aria-label="ID da Aplicação (cliente)" spellcheck="false" autocapitalize="none"><input class="field" name="ten" placeholder="ID do Diretório (inquilino)" aria-label="ID do Diretório (inquilino)" spellcheck="false" autocapitalize="none"><input class="field" name="sec" type="password" placeholder="Valor do segredo do cliente" aria-label="Segredo do cliente" autocomplete="new-password"><button class="btn sm pri">Guardar no meu script</button></form>
    <div class="row gap8" style="margin-top:10px;flex-wrap:wrap"><button class="btn pri" data-act="olAuth" ${INFO.cfg ? '' : 'disabled'}>${UI.ic('user')}Entrar com a conta da faculdade</button><button class="btn sm ghost" data-act="olInfo">${UI.ic('sync')}Verificar</button></div>
    <small class="mut">O segredo fica guardado só no teu script Google. Podes desligar a qualquer momento.</small></div>`; };
const row = it => { const sid = subjOf(it), S = subs();
  return `<div class="ml-it ol-it ${it.u ? 'unread' : ''}"><div class="ol-bar" style="background:${col(sid)}"></div><div class="ml-t click" data-act="${it.gm ? 'mlRead' : 'olRead'}" data-id="${esc(it.id)}" role="button" tabindex="0"><div class="ml-h"><b>${esc(nm(it.f))}</b><small>${it.d ? U.fmtDS(String(it.d).slice(0, 10)) + ' ' + new Date(it.d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}</small></div><div class="ml-s">${esc(it.s || '(sem assunto)')}</div><div class="ml-sn">${esc(String(it.sn || '').slice(0, 160))}</div></div>
    <div class="ml-a"><span class="bdg" style="border-color:${col(sid)};color:${col(sid)}">${esc(subjName(sid))}</span><select class="ol-sel" data-id="${esc(it.id)}" data-f="${esc(addr(it.f))}" aria-label="Mudar a matéria"><option value="">Mudar matéria…</option>${S.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}<option value="geral">Geral</option></select>${it.gm ? '<small class="mut">via Gmail</small>' : ''}</div></div>`; };
const view = () => { const items = all(), linked = INFO && INFO.linked, f = OS.ui.olF || '', S = subs(), cnt = id => items.filter(x => subjOf(x) === id).length, list = f ? items.filter(x => subjOf(x) === f) : items;
  if (ready() && !INFO && !busy) setTimeout(info, 30);
  if (linked && !L.at && !busy) setTimeout(() => refresh(false), 30);
  const head = `<div class="row between gap8" style="flex-wrap:wrap;margin-bottom:10px"><div><b>${linked ? 'Outlook ligado' : 'Faculdade'}</b>${linked ? `<small class="mut" style="display:block">${esc(INFO.user || L.user || '')}${L.at ? ' · atualizado ' + new Date(L.at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}</small>` : ''}</div>
    <div class="row gap8">${linked ? `<button class="btn sm" data-act="olRefresh" ${busy ? 'disabled' : ''}>${UI.ic('sync')}${busy ? 'A atualizar…' : 'Atualizar'}</button><button class="btn sm ghost" data-act="olOff">Desligar</button>` : ''}</div></div>`;
  return `${err ? `<div class="ib-st bad" style="margin-bottom:10px">${esc(err)}</div>` : ''}${linked ? '' : setup()}
    ${linked || items.length ? `<div class="pn">${head}
      ${S.length ? '' : `<p class="mut">Para separar por matéria, cria as tuas disciplinas em <a class="acc" href="#universidade">Universidade</a> (e, em cada uma, as palavras dos e-mails: sigla, código ou e-mail do professor).</p>`}
      <div class="ml-f">${UI.chip('Todas · ' + items.length, 'olF', !f, 'data-v=""')}${S.filter(s => cnt(s.id)).map(s => UI.chip(esc(s.name) + ' · ' + cnt(s.id), 'olF', f === s.id, `data-v="${s.id}"`)).join('')}${cnt('geral') ? UI.chip('Geral · ' + cnt('geral'), 'olF', f === 'geral', 'data-v="geral"') : ''}${aiBusy ? '<small class="mut">a separar com a IA…</small>' : ''}</div>
      <div class="ml-list">${list.map(row).join('') || UI.empty(L.at ? 'Nada aqui.' : 'Toca em Atualizar.')}</div></div>` : ''}
    <details class="pn ol-dom"><summary>Reencaminhas o Outlook para o Gmail?</summary><p class="mut" style="font-size:13px">Escreve o domínio do teu e-mail da faculdade e os e-mails dele que chegam ao Gmail aparecem aqui, separados por matéria.</p><form class="row gap8" data-form="olDom"><input class="field grow" name="dom" placeholder="ex.: ua.pt" value="${esc(C().dom || '')}" aria-label="Domínio da faculdade" autocapitalize="none"><button class="btn sm">Guardar</button></form></details>`; };

/* ---------- ler e responder ---------- */
const readerHTML = (it, r) => `<div class="ml-rd"><div class="pn-h"><h3>${esc((r && r.s) || it.s || '(sem assunto)')}</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
  <div><span class="bdg" style="border-color:${col(subjOf(it))};color:${col(subjOf(it))}">${esc(subjName(subjOf(it)))}</span></div>
  ${!r || r.busy ? `<div class="sai-busy"><div class="fd-spin"></div><span>A abrir o e-mail…</span></div>` : r.err ? `<div class="note">${esc(r.err)}</div><p class="ml-rb">${esc(it.sn || '')}</p>` : r.t.map(m => `<div class="ml-msg last"><div class="ml-mh"><b>${esc(nm(m.f))}</b><small>${esc(addr(m.f))} · ${m.d ? new Date(m.d).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</small>${m.to ? `<small>para ${esc(m.to)}</small>` : ''}</div>
    ${r.fmt && m.h ? OS.Mail._frame(m.h) : `<div class="ml-rb">${OS.Mail._linkify(m.b || '(mensagem sem texto)')}</div>`}
    <div class="row gap6" style="margin-top:6px;flex-wrap:wrap">${m.h ? `<button class="btn xs ghost" data-act="olFmt" data-id="${esc(it.id)}">${r.fmt ? 'Ver só o texto' : 'Ver formatado'}</button>` : ''}${(m.at || []).map(a => `<span class="bdg">${UI.ic('note')} ${esc(a)}</span>`).join('')}</div></div>`).join('')}
  <div class="ol-rp"><textarea class="field" id="olRpT" rows="3" placeholder="Responder… (vai pelo teu Outlook)"></textarea><div class="row gap8" style="margin-top:6px"><button class="btn sm pri" data-act="olSend" data-id="${esc(it.id)}">Enviar resposta</button><button class="btn sm ghost" data-act="olTask" data-id="${esc(it.id)}">${UI.ic('plus')}Tarefa</button><span class="grow"></span><a class="btn sm ghost" href="https://outlook.office.com/mail/" target="_blank" rel="noopener">Outlook</a></div></div></div>`;
const draw = it => { const m = document.querySelector('#modal .ml-rd'); if (m) m.outerHTML = readerHTML(it, RD[it.id]); else UI.modal(readerHTML(it, RD[it.id]), 'tall'); document.querySelectorAll('#modal [data-mclose]').forEach(b => b.onclick = UI.closeModal); };
const get = id => L.items.find(x => x.id === id);
A.olRead = async b => { const it = get(b.dataset.id); if (!it) return; if (!RD[it.id] || RD[it.id].err) { RD[it.id] = { busy: true }; draw(it);
    try { const j = await getJ('&op=olx&id=' + encodeURIComponent(it.id)); if (!j.ok) throw new Error(j.msg || 'erro'); RD[it.id] = { s: j.s, t: j.t || [], fmt: false }; if (it.u) { it.u = false; saveL(); } } catch (e) { RD[it.id] = { err: 'Não consegui abrir o e-mail: ' + (e.message || 'erro') + '.', t: [] }; } }
  draw(it); };
A.olFmt = b => { const r = RD[b.dataset.id], it = get(b.dataset.id); if (r && it) { r.fmt = !r.fmt; draw(it); } };
A.olSend = async b => { const it = get(b.dataset.id), t = (document.getElementById('olRpT') || {}).value || ''; if (!it || !t.trim()) return UI.toast('Escreve a resposta', 'warn'); b.disabled = true;
  try { const j = await postJ({ op: 'ols', id: it.id, b: t.trim() }); if (!j.ok) throw new Error(j.msg || 'erro'); UI.toast('Resposta enviada pelo teu Outlook', 'pos'); UI.closeModal(); } catch (e) { UI.toast('Não enviei: ' + (e.message || 'erro'), 'warn'); b.disabled = false; } };
A.olTask = b => { const it = get(b.dataset.id); if (!it) return; const sid = subjOf(it), s = OS.get('subjects', sid); OS.add('tasks', { title: (it.s || 'E-mail da faculdade').slice(0, 120), status: 'Próxima', area: 'Universidade', notes: (s ? s.name + ' · ' : '') + nm(it.f) }); UI.toast('Tarefa criada', 'pos'); };
A.olSubj = b => { const v = b.value; if (!v) return; const c = C(); c.map[b.dataset.id] = v; if (b.dataset.f) c.snd[b.dataset.f] = v; OS.touch('unimail'); UI.toast(`Agora os e-mails deste remetente vão para ${subjName(v)}`, 'pos'); };
A.olF = b => OS.setUI('olF', b.dataset.v);
A.olRefresh = () => refresh(true);
A.olInfo = async () => { INFO = null; OS.request(); const i = await info(); UI.toast(!i.has4 ? 'O script ainda não tem a Parte 4 (ou falta a Nova versão na implantação).' : i.linked ? 'Outlook ligado' : 'Parte 4 instalada: falta ligar a conta.', i.has4 ? 'pos' : 'warn'); if (i.linked) refresh(false); };
A.olCopy = b => { try { navigator.clipboard.writeText(b.dataset.v).then(() => UI.toast('Copiado', 'pos')); } catch (e) { UI.toast(b.dataset.v); } };
A.olAuth = async () => { const w = window.open('', '_blank'); try { const j = await getJ('&op=olauth'); if (!j.ok || !j.url) throw new Error(j.msg || 'erro'); if (w) w.location = j.url; else location.href = j.url; UI.toast('Entra com a conta da faculdade. Depois volta aqui e toca em Verificar.'); }
  catch (e) { if (w) w.close(); UI.toast('Não consegui começar o login: ' + (e.message || 'erro'), 'warn'); } };
A.olOff = () => UI.ask('Desligar o Outlook?', 'O acesso guardado no teu script é apagado. Podes voltar a ligar quando quiseres.', 'Desligar', async () => { try { await getJ('&op=oloff'); } catch (e) { } INFO = null; L = { at: 0, items: [], user: '', ai: {} }; saveL(); OS.request(); });
document.addEventListener('change', e => { const sel = e.target && e.target.closest && e.target.closest('select.ol-sel'); if (sel) A.olSubj(sel); });
OS.forms = OS.forms || {};
OS.forms.olCfg = async (f, v) => { const id = String(v('id') || '').trim(), ten = String(v('ten') || '').trim(), sec = String(v('sec') || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-z.-]{3,80}$/i.test(ten) || sec.length < 8) return UI.toast('Confirma os três valores (os IDs têm 36 caracteres)', 'warn');
  try { const j = await postJ({ op: 'olcfg', id, ten, sec }); if (!j.ok) throw new Error(j.msg || 'erro'); UI.toast('Guardado no teu script. Agora entra com a conta da faculdade.', 'pos'); INFO = Object.assign(INFO || {}, { cfg: true, err: '' }); OS.request(); }
  catch (e) { UI.toast('Não guardei: ' + (e.message || 'erro'), 'warn'); } };
OS.forms.olDom = (f, v) => { OS.setOne('unimail', { dom: String(v('dom') || '').trim().toLowerCase().replace(/^@/, '') }); UI.toast('Guardado', 'pos'); };
// atualiza sozinho de 10 em 10 minutos com a app aberta (se estiver ligado)
OS.on('ready', () => setInterval(() => { if (!document.hidden && INFO && INFO.linked) refresh(false); }, 10 * 60e3));
OS.UniMail = { view, items: () => all(), get, subjOf, subjName, refresh, info: () => INFO, _set: (o, i) => { if (o) { L = Object.assign({ ai: {} }, o); saveL(); } if (i) INFO = i; },
  summary: () => all().slice(0, 20).map(it => ({ materia: subjName(subjOf(it)), de: it.f, assunto: it.s, nao_lido: !!it.u, trecho: String(it.sn || '').slice(0, 140) })) };
})();
