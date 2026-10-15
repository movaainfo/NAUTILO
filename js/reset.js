/* OCEANUM — Começar do zero (Definições → Dados).
   Apaga os dados de teste das áreas que escolheres e mantém as configurações (código, Face ID, script Google, chaves da IA,
   Spyke, e-mail, perfil, categorias). Antes de apagar guarda uma cópia neste aparelho para poderes desfazer durante 30 dias.
   O apagar vai pela sincronização normal, por isso os outros aparelhos ligados também ficam limpos; no Google Calendar
   saem os eventos que vinham dos registos apagados. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
const R = OS.Reset = {};
// [chave, nome, coleções, partes guardadas fora das coleções, marcado à partida]
const G = [
  ['agenda', 'Tarefas, agenda e notas', ['tasks', 'events', 'routine', 'routines', 'notes', 'focusblocks'], [], 1],
  ['metas', 'Projetos, metas, decisões e revisões', ['projects', 'milestones', 'goals', 'decisions', 'reviews_w', 'reviews_m'], [], 1],
  ['habdias', 'Hábitos: os dias que marcaste (a lista de hábitos fica)', ['habits#log'], [], 1],
  ['habitos', 'Hábitos: a própria lista de hábitos', ['habits'], [], 0],
  ['fin', 'Finanças: contas, movimentos, orçamentos, dívidas, relatórios', ['transactions', 'accounts', 'recurring', 'budgets', 'debts', 'wishlist', 'snapshots', 'reports'], [], 1],
  ['inv', 'Investimentos e imóveis', ['assets', 'invtx', 'palerts', 'props'], [], 1],
  ['estudos', 'Estudos: aulas, avaliações, sessões, revisões, cartões, ficheiros', ['classes', 'topics', 'assessments', 'sessions', 'reviews', 'errors', 'cards', 'quizzes', 'qbank', 'qlog', 'materials', 'files', 'learn'], [], 1],
  ['disc', 'Disciplinas (a lista de cadeiras do curso)', ['subjects'], [], 0],
  ['leitura', 'Leitura e Fé', ['books', 'rchal', 'devos', 'prayers', 'bmarks', 'bread'], [], 1],
  ['corpo', 'Corpo e treino: treinos, corridas, medidas, desafios', ['workouts', 'runs', 'runplan', 'body', 'checkins', 'bchal', 'bgoals', 'stretches'], [], 1],
  ['dieta', 'Alimentação: refeições e alimentos que criaste', ['meals', 'mealtpl', 'foods'], [], 1],
  ['desporto', 'Desporto', ['sports', 'sportlog'], [], 1],
  ['trabalho', 'Trabalho e carreira: turnos, folgas, candidaturas, contactos', ['shifts', 'dayoffs', 'applications', 'contacts', 'experiences', 'opps', 'skills', 'certs'], [], 1],
  ['mova', 'Mova (vendas, despesas, clientes, produtos, marketing)', ['mvsales', 'mvexp', 'mvclients', 'mvproducts', 'mvmkt'], [], 1],
  ['pessoas', 'Pessoas', ['people'], [], 1],
  ['jogo', 'Floresta, recompensas e o jogo (árvores, moedas, pontos, níveis)', ['trees', 'forewards', 'rewards'], ['dominus', 'forest'], 1],
  ['spyke', 'Memória e rotinas do Spyke', ['spymem', 'spyroutines'], [], 1],
  ['direcao', 'Textos da Direção: visão, valores, plano da semana e do mês', [], ['northstar', 'plan', 'lifeplan'], 0],
  ['bio', 'Biografia: entrevista, livro e momentos da vida', ['lifeev'], ['me', 'mever'], 0],
  ['mail', 'Compromissos tirados dos e-mails', ['mailevents'], [], 0],
  ['exlib', 'Biblioteca de exercícios (a lista que vem com a app)', ['exercises'], [], 0]];
const KNOWN = new Set(G.flatMap(g => g[2]));
// o que nunca se apaga: são configurações, não dados
const KEEP = 'o teu código e o Face ID, o script Google, as chaves da IA, o Spyke, o e-mail, o perfil e as categorias';
const groups = () => { const extra = Object.keys(OS.D).filter(c => !KNOWN.has(c) && OS.all(c).length && OS.S[c]);
  return extra.length ? G.concat([['outros', 'Outros registos (' + extra.map(c => OS.S[c].label).join(', ') + ')', extra, [], 1]]) : G; };
// "habits#log" = só as marcações dos hábitos (h.log), não os hábitos
const logN = () => OS.all('habits').reduce((n, h) => n + Object.keys(h.log || {}).length, 0);
const size = c => c === 'habits#log' ? logN() : OS.all(c).length;
const count = g => g[2].reduce((n, c) => n + size(c), 0);
// partes fora das coleções: voltam ao início, mas as preferências da Floresta (tempo, som, modo) ficam
const blank = k => { const d = U.clone(OS.ONE_DEF[k] || {}); if (k !== 'forest') return d; const cur = OS.one('forest'); return Object.assign({}, cur, { coins: d.coins || 0, owned: d.owned || [], sp: d.sp }); };
const oneUsed = k => JSON.stringify(OS.one(k)) !== JSON.stringify(blank(k));

/* ---------- cópia para desfazer (IndexedDB: cabe muito mais do que o localStorage) ---------- */
const DB = () => new Promise((ok, ko) => { const r = indexedDB.open('oceanum-reset', 1); r.onupgradeneeded = () => r.result.createObjectStore('s'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const tx = async (mode, f) => { const d = await DB(); try { return await new Promise((ok, ko) => { const t = d.transaction('s', mode), q = f(t.objectStore('s')); t.oncomplete = () => ok(q && q.result); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); }); } finally { d.close(); } };
const putSnap = v => tx('readwrite', s => s.put(v, 'last'));
const getSnap = () => tx('readonly', s => s.get('last'));
const dropSnap = () => tx('readwrite', s => s.delete('last')).catch(() => { });
const INFO = 'os2resetInfo', DAYS = 30;
const info = () => { const i = U.ls.get(INFO, null); if (i && Date.now() - i.at > DAYS * 864e5) { U.ls.set(INFO, null); dropSnap(); return null; } return i; };

/* ---------- painel em Definições → Dados ---------- */
R.panel = () => { const i = info(), total = Object.keys(OS.D).map(c => OS.all(c).length).reduce((a, b) => a + b, 0);
  return `<div class="pn" id="dataPn"><div class="pn-h"><h3>Dados</h3></div>
    <div class="li"><div class="li-t"><b>Começar do zero</b><small>Apaga os dados de teste: escolhes as áreas. Ficam ${KEEP}.</small></div><button class="btn sm danger" data-act="rsOpen">${UI.ic('trash')}Começar do zero</button></div>
    ${i ? `<div class="li rs-undo"><div class="li-t"><b>Desfazer o último "Começar do zero"</b><small>Feito a ${esc(new Date(i.at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))} · ${i.n} registos apagados · podes desfazer até ${esc(U.fmtD(U.iso(new Date(i.at + DAYS * 864e5))))} neste aparelho</small></div><button class="btn sm" data-act="rsUndo">${UI.ic('sync')}Desfazer</button></div>` : ''}
    <div class="row gap8" style="margin-top:12px;flex-wrap:wrap"><button class="btn" data-act="exportData">${UI.ic('arrowDown')}Exportar cópia (.json)</button><label class="btn" for="impData">${UI.ic('arrowUp')}Importar cópia</label><input type="file" id="impData" accept=".json,application/json" hidden></div>
    <div class="note" style="margin-top:10px">Registos: ${total} em ${Object.keys(OS.D).filter(c => OS.all(c).length).length} coleções.</div></div>`; };

A.rsOpen = () => { const L = groups().map(g => ({ g, n: count(g), one: g[3].filter(oneUsed).length })).filter(x => x.n || x.one);
  if (!L.length) return UI.toast('Não há dados para apagar: a app já está vazia.');
  UI.modal(`<div class="rsz"><div class="pn-h"><h3>Começar do zero</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <p class="mut" style="margin:0 0 10px">Escolhe o que apagar. Ficam ${KEEP}.</p>
    <div class="rs-list">${L.map(({ g, n, one }) => `<label class="rs-g"><input type="checkbox" name="rsg" value="${g[0]}"${g[4] ? ' checked' : ''}><span><b>${esc(g[1])}</b><small>${n ? n + (g[0] === 'habdias' ? (n === 1 ? ' dia marcado' : ' dias marcados') : n === 1 ? ' registo' : ' registos') : ''}${n && one ? ' · ' : ''}${one ? 'textos e progresso' : ''}</small></span></label>`).join('')}</div>
    <div class="row gap8" style="margin:8px 0 12px"><button type="button" class="btn xs ghost" data-act="rsAll">Marcar tudo</button><button type="button" class="btn xs ghost" data-act="rsNone">Desmarcar tudo</button></div>
    <div class="note">Antes de apagar guardo uma cópia neste aparelho: podes <b>desfazer durante ${DAYS} dias</b> em Definições → Dados. Os outros aparelhos ligados também ficam limpos, e no Google Calendar saem os eventos que vinham destes registos.</div>
    <label class="rs-cf"><span>Para confirmar, escreve <b>APAGAR</b></span><input id="rsConf" class="field" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Escreve APAGAR para confirmar"></label>
    <div class="row gap8 end" style="margin-top:12px"><button type="button" class="btn ghost" data-mclose>Cancelar</button><button type="button" class="btn danger" data-act="rsGo">${UI.ic('trash')}Apagar o que escolhi</button></div></div>`, 'tall'); };
const boxes = () => [...document.querySelectorAll('#modal input[name=rsg]')];
A.rsAll = () => boxes().forEach(b => { b.checked = true; });
A.rsNone = () => boxes().forEach(b => { b.checked = false; });

let busy = false;
A.rsGo = async () => { if (busy) return; const cf = document.getElementById('rsConf');
  if (!cf || cf.value.trim().toUpperCase() !== 'APAGAR') { UI.toast('Escreve APAGAR para confirmar', 'warn'); cf && cf.focus(); return; }
  const keys = boxes().filter(b => b.checked).map(b => b.value); if (!keys.length) return UI.toast('Escolhe pelo menos uma área', 'warn');
  const sel = groups().filter(g => keys.includes(g[0])), all = [...new Set(sel.flatMap(g => g[2]))], ones = [...new Set(sel.flatMap(g => g[3]))].filter(oneUsed);
  const colls = all.filter(c => !c.includes('#') && OS.all(c).length), logs = all.includes('habits#log') && !colls.includes('habits') && logN() > 0;
  busy = true; const n = colls.reduce((a, c) => a + OS.all(c).length, 0) + (logs ? logN() : 0);
  // 1 · a cópia primeiro: sem cópia não se apaga nada
  const snap = { at: Date.now(), keys, D: {}, ONE: {} }; colls.concat(logs ? ['habits'] : []).forEach(c => { snap.D[c] = U.clone(OS.all(c)); }); ones.forEach(k => { snap.ONE[k] = U.clone(OS.one(k)); });
  try { await putSnap(snap); } catch (e) { busy = false; UI.toast('Não consegui guardar a cópia para desfazer, por isso não apaguei nada. Exporta uma cópia (.json) e tenta outra vez.', 'neg'); return; }
  // 2 · apagar (vai pela sincronização para os outros aparelhos)
  colls.forEach(c => OS.clearColl(c)); if (logs) OS.setColl('habits', OS.all('habits').map(h => Object.assign({}, h, { log: {}, _u: Date.now() })));
  ones.forEach(k => { OS.ONE[k] = blank(k); OS.touch(k); });
  U.ls.set(INFO, { at: snap.at, n, keys });
  if (OS.CalPush) { OS.CalPush.purge = true; OS.CalPush.soon(1500); }
  busy = false; UI.closeModal(); OS.request(); UI.toast(`Pronto: ${n} registos apagados. Se te enganaste, Definições → Dados → Desfazer.`, 'pos'); };

A.rsUndo = () => UI.ask('Desfazer o "Começar do zero"?', 'Os registos apagados voltam (o que registaste depois fica). Os outros aparelhos também os recebem.', 'Desfazer', async () => {
  let s = null; try { s = await getSnap(); } catch (e) { } if (!s) { U.ls.set(INFO, null); OS.request(); return UI.toast('A cópia já não existe neste aparelho.', 'warn'); }
  let n = 0; Object.entries(s.D || {}).forEach(([c, items]) => { const ids = new Set(items.map(r => r.id)); n += items.length; OS.setColl(c, items.concat(OS.all(c).filter(r => !ids.has(r.id)))); });
  Object.entries(s.ONE || {}).forEach(([k, v]) => { OS.ONE[k] = v; OS.touch(k); });
  await dropSnap(); U.ls.set(INFO, null); if (OS.CalPush) OS.CalPush.soon(1500); OS.request(); UI.toast(`Desfeito: ${n} registos voltaram.`, 'pos'); }, 'pri');
R._groups = groups; R._snap = getSnap;
})();
