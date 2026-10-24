/* PRUMO — Limpar os dados de teste (Definições → Dados).
   Separa sozinho, registo a registo, o que é teu do que foi teste:
   - fica o que veio de ti: o horário do trabalho importado da foto, as disciplinas do curso, a biografia e a entrevista,
     o que veio dos e-mails, os movimentos importados da B3/corretora, o plano inicial (metas, hábitos, competências,
     contactos e projeto que me deste no início) e a "estrutura" da app (contas, desportos, pessoas, biblioteca de exercícios…);
   - sai o resto (movimentos, tarefas, treinos, sessões, refeições… dos testes), e tudo o que tem "teste" no nome.
   Mostra tudo antes de apagar: podes mudar qualquer registo. As configurações nunca saem (código, Face ID, script Google,
   chaves da IA, Spyke, e-mail, perfil, categorias). Guarda uma cópia neste aparelho: dá para desfazer durante 30 dias.
   O apagar vai pela sincronização normal (os outros aparelhos ficam limpos) e sai do Google Calendar o que vinha daqui. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
const R = OS.Reset = {};
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// áreas (só para arrumar a lista): [nome, coleções]
const AREAS = [
  ['Trabalho: turnos e folgas', ['shifts', 'dayoffs']],
  ['Finanças', ['transactions', 'accounts', 'recurring', 'budgets', 'debts', 'wishlist', 'snapshots', 'reports']],
  ['Investimentos e imóveis', ['assets', 'invtx', 'palerts', 'props']],
  ['Tarefas, agenda e notas', ['tasks', 'events', 'mailevents', 'routine', 'routines', 'notes', 'focusblocks']],
  ['Projetos, metas, decisões e revisões', ['projects', 'milestones', 'goals', 'decisions', 'reviews_w', 'reviews_m']],
  ['Hábitos', ['habits', 'habits#log']],
  ['Estudos', ['subjects', 'attend', 'classes', 'topics', 'assessments', 'sessions', 'reviews', 'errors', 'cards', 'quizzes', 'qbank', 'qlog', 'materials', 'files', 'learn']],
  ['Leitura e Fé', ['books', 'rchal', 'devos', 'prayers', 'bmarks', 'bread']],
  ['Corpo e treino', ['workouts', 'runs', 'runplan', 'body', 'checkins', 'bchal', 'bgoals', 'stretches', 'exercises']],
  ['Alimentação', ['meals', 'mealtpl', 'foods']],
  ['Desporto e aventuras', ['sports', 'sportlog', 'adventures']],
  ['Carreira', ['applications', 'contacts', 'experiences', 'opps', 'skills', 'certs']],
  ['Mova', ['mvsales', 'mvexp', 'mvclients', 'mvproducts', 'mvmkt']],
  ['Pessoas', ['people', 'social']],
  ['Mundo (países e ilhas)', ['countries', 'islands']],
  ['Biografia', ['lifeev']],
  ['Spyke', ['spymem', 'spyroutines']],
  ['Floresta, recompensas e o jogo', ['trees', 'forewards', 'rewards', 'one:dominus', 'one:forest']]];
const AREA_OF = {}; AREAS.forEach(([a, cs]) => cs.forEach(c => { AREA_OF[c] = a; }));

// a "estrutura" da tua vida na app: fica (a não ser que tenha "teste" no nome)
const MINE = { accounts: 'As tuas contas e bancos', subjects: 'Disciplina do teu curso', exercises: 'Biblioteca de exercícios da app', habits: 'A tua lista de hábitos (só os dias marcados saem)',
  sports: 'Desporto que praticas', people: 'Pessoa da tua vida', skills: 'Competência que queres dominar', contacts: 'Contacto profissional', experiences: 'O teu percurso', certs: 'Certificação tua', adventures: 'Aventura que queres viver', countries: 'País do teu mapa', islands: 'Ilha do teu mapa',
  mailevents: 'Veio dos teus e-mails', lifeev: 'A tua biografia', spymem: 'O que o Spyke sabe sobre ti', files: 'Ficheiro guardado no teu Google Drive' };
// o plano inicial que me deste (a especificação do início): fica
const SEED = { goals: ['Fundo de emergência de € 1.000', 'Média ≥ 15 no 1.º semestre', 'Correr 5 km em menos de 25 min', 'Inglês B2', '12 livros num ano'],
  projects: ['Ideia de serviço em Aveiro'], tasks: ['Validar a ideia com 5 clientes', 'Definir o preço', 'Abrir atividade nas Finanças (recibos verdes)', 'Conseguir o 1.º cliente'],
  applications: ["McDonald's"], runplan: ['20 min depois do treino de peito', '20 min depois do treino de pernas', '30 min: 6 × 400 m forte / 90 s leve', 'Corrida contínua de 5 km'] };
const SEEDN = {}; Object.entries(SEED).forEach(([c, L]) => { SEEDN[c] = new Set(L.map(N)); });
const TESTW = /\b(teste?s?|testando|testing|dummy|fake|asdf\w*|qwerty|lorem|ipsum|x{3,}|a{3,}|bla(bla)+)\b/i;
const label = (c, r) => { let t = ''; try { t = OS.S[c] && OS.S[c].title ? OS.S[c].title(r) : ''; } catch (e) { } t = String(t || r.title || r.name || r.desc || r.text || r.company || r.notes || r.ticker || '').trim();
  const d = r.date || r.start && /^\d{4}-/.test(r.start) && r.start || '', base = (t || (OS.S[c] ? OS.S[c].label : c)).slice(0, 90), fd = d && /^\d{4}-\d\d-\d\d/.test(d) ? U.fmtD(d) : '';
  return base + (fd && !base.includes(fd) && !base.includes(d.slice(0, 10)) ? ' · ' + fd : ''); };
const words = r => [r.title, r.name, r.desc, r.text, r.company, r.notes, r.note, r.ticker].filter(Boolean).join(' ');

// o veredicto de cada registo: fica (é teu) ou sai (teste), e porquê
R.verdict = (c, r, ctx = {}) => {
  if (TESTW.test(words(r))) return { keep: false, why: 'Tem "teste" no nome' };
  if ((c === 'shifts' || c === 'dayoffs') && r.src === 'foto') return { keep: true, why: 'Horário do trabalho importado da foto' };
  if (c === 'invtx' && /^Importad/i.test(String(r.note || ''))) return { keep: true, why: 'Importado da B3 / corretora' };
  if (c === 'assets' && ctx.impAssets && ctx.impAssets.has(r.id)) return { keep: true, why: 'Ativo dos movimentos importados' };
  if (SEEDN[c] && SEEDN[c].has(N(c === 'runplan' ? r.notes : c === 'applications' ? r.company : r.title || r.name))) return { keep: true, why: 'Veio do teu plano inicial' };
  if (c === 'subjects' && /notion/i.test(String(r.notes || ''))) return { keep: true, why: 'Disciplina do teu curso (do teu Notion)' };
  if (MINE[c]) return { keep: true, why: MINE[c] };
  return { keep: false, why: 'Dos testes' }; };

// partes fora das coleções: voltam ao início (as preferências da Floresta — tempo, som, modo — ficam)
const blank = k => { const d = U.clone(OS.ONE_DEF[k] || {});
  // o jogo: o herói (nome, aparência, marcos) fica; saem as missões, os chefes, os baús e as compras
  if (k === 'dominus') { const c = OS.one('dominus'); return Object.assign(d, { born: c.born || '', name: c.name || '', look: c.look || d.look, legacy: c.legacy || {}, legx: c.legx || d.legx, fly: c.fly !== false }); }
  if (k !== 'forest') return d; const cur = OS.one('forest'); return Object.assign({}, cur, { coins: d.coins || 0, owned: d.owned || [], sp: d.sp }); };
const oneUsed = k => JSON.stringify(OS.one(k)) !== JSON.stringify(blank(k));
const logN = () => OS.all('habits').reduce((n, h) => n + Object.keys(h.log || {}).length, 0);

// o plano: todos os registos com o veredicto
R.plan = () => { const impAssets = new Set(OS.all('invtx').filter(t => /^Importad/i.test(String(t.note || ''))).map(t => t.asset)), rows = [];
  Object.keys(OS.D).forEach(c => { if (!OS.S[c] && !AREA_OF[c]) return; OS.all(c).forEach(r => { const v = R.verdict(c, r, { impAssets }); rows.push({ k: c + '|' + r.id, c, id: r.id, t: label(c, r), keep: v.keep, why: v.why }); }); });
  const ln = logN(); if (ln) rows.push({ k: 'habits#log', c: 'habits#log', t: ln + (ln === 1 ? ' dia marcado nos hábitos' : ' dias marcados nos hábitos'), keep: false, why: 'Marcações dos testes', n: ln });
  if (oneUsed('dominus')) rows.push({ k: 'one:dominus', c: 'one:dominus', t: 'Progresso do jogo (missões, chefes, baús e compras)', keep: false, why: 'Ganho com os dados de teste' });
  const f = OS.one('forest'); if (f.coins || JSON.stringify(f.owned || []) !== JSON.stringify((OS.ONE_DEF.forest || {}).owned || [])) rows.push({ k: 'one:forest', c: 'one:forest', t: 'Moedas e árvores compradas na Floresta (' + (f.coins || 0) + ' moedas)', keep: false, why: 'Ganho com os dados de teste' });
  return rows; };
const ALWAYS = 'o código e o Face ID, o script Google, as chaves da IA, o Spyke, o e-mail, o perfil, a biografia e a entrevista, os textos da Direção e as categorias';

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
    <div class="li"><div class="li-t"><b>Limpar os dados de teste</b><small>Separa sozinho o que é teu (horário importado, disciplinas, biografia, contas, o teu plano inicial…) do que foi teste e mostra-te tudo antes de apagar. Ficam sempre ${ALWAYS}.</small></div><button class="btn sm danger" data-act="rsOpen">${UI.ic('trash')}Limpar testes</button></div>
    ${i ? `<div class="li rs-undo"><div class="li-t"><b>Desfazer a última limpeza</b><small>Feita a ${esc(new Date(i.at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))} · ${i.n} registos apagados · podes desfazer até ${esc(U.fmtD(U.iso(new Date(i.at + DAYS * 864e5))))} neste aparelho</small></div><button class="btn sm" data-act="rsUndo">${UI.ic('sync')}Desfazer</button></div>` : ''}
    <div class="row gap8" style="margin-top:12px;flex-wrap:wrap"><button class="btn" data-act="exportData">${UI.ic('arrowDown')}Exportar cópia (.json)</button><label class="btn" for="impData">${UI.ic('arrowUp')}Importar cópia</label><input type="file" id="impData" accept=".json,application/json" hidden></div>
    <div class="note" style="margin-top:10px">Registos: ${total} em ${Object.keys(OS.D).filter(c => OS.all(c).length).length} coleções.</div></div>`; };

/* ---------- o ecrã de revisão ---------- */
const MAXROWS = 120;
let PLAN = [];
const sum = () => { const B = boxes(), out = B.filter(b => b.checked).length, rest = [...document.querySelectorAll('#modal input[name=rsrest]')].reduce((n, b) => n + (b.checked ? +b.dataset.n : 0), 0);
  const del = out + rest, keep = PLAN.length - del, a = document.getElementById('rsOut'), k = document.getElementById('rsKeep'); if (a) a.textContent = del; if (k) k.textContent = Math.max(0, keep);
  document.querySelectorAll('#modal .rs-a').forEach(d => { const bs = [...d.querySelectorAll('input[name=rsr]')], x = d.querySelector('input[name=rsrest]'), o = bs.filter(b => b.checked).length + (x && x.checked ? +x.dataset.n : 0), all = bs.length + (x ? +x.dataset.n : 0), s = d.querySelector('.rs-c'); if (s) s.textContent = `sai ${o} · fica ${all - o}`; }); };
const boxes = () => [...document.querySelectorAll('#modal input[name=rsr]')];
A.rsOpen = () => { PLAN = R.plan(); if (!PLAN.length) return UI.toast('Não há dados para limpar: a app já está vazia.');
  const by = {}; PLAN.forEach(p => { const a = AREA_OF[p.c] || 'Outros'; (by[a] = by[a] || []).push(p); });
  const order = AREAS.map(a => a[0]).concat(['Outros']).filter(a => by[a]);
  const out = PLAN.filter(p => !p.keep).length;
  UI.modal(`<div class="rsz"><div class="pn-h"><h3>Limpar os dados de teste</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <p class="mut" style="margin:0 0 10px">Separei sozinho o que é teu do que foi teste. Revê: em cada área podes mudar qualquer registo (marcado = sai).</p>
    <div class="rs-sum"><div class="rs-k out"><b id="rsOut">${out}</b><small>vão sair</small></div><div class="rs-k keep"><b id="rsKeep">${PLAN.length - out}</b><small>ficam (são teus)</small></div></div>
    <div class="rs-list">${order.map(a => { const L = by[a], shown = L.slice(0, MAXROWS), rest = L.slice(MAXROWS), restOut = rest.filter(p => !p.keep).length, o = L.filter(p => !p.keep).length;
      return `<details class="rs-a" data-a="${esc(a)}"><summary><b>${esc(a)}</b><small class="rs-c">sai ${o} · fica ${L.length - o}</small></summary>
        <div class="row gap6" style="margin:6px 0"><button type="button" class="btn xs ghost" data-act="rsArea" data-v="1">Tirar todos</button><button type="button" class="btn xs ghost" data-act="rsArea" data-v="0">Manter todos</button></div>
        ${shown.map(p => `<label class="rs-r${p.keep ? ' k' : ''}"><input type="checkbox" name="rsr" value="${esc(p.k)}"${p.keep ? '' : ' checked'}><span>${esc(p.t)}<small>${p.keep ? 'Fica · ' : ''}${esc(p.why)}</small></span></label>`).join('')}
        ${rest.length ? `<label class="rs-r"><input type="checkbox" name="rsrest" data-n="${rest.length}" data-a="${esc(a)}"${restOut > rest.length / 2 ? ' checked' : ''}><span>Mais ${rest.length} registos desta área<small>${restOut} de teste · ${rest.length - restOut} teus</small></span></label>` : ''}</details>`; }).join('')}</div>
    <div class="note" style="margin-top:10px">Ficam sempre ${ALWAYS}. Antes de apagar guardo uma cópia neste aparelho: podes <b>desfazer durante ${DAYS} dias</b> em Definições → Dados. Os outros aparelhos ligados também ficam limpos, e do Google Calendar saem os eventos que vinham dos registos apagados.</div>
    <label class="rs-cf"><span>Para confirmar, escreve <b>APAGAR</b></span><input id="rsConf" class="field" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Escreve APAGAR para confirmar"></label>
    <div class="row gap8 end" style="margin-top:12px"><button type="button" class="btn ghost" data-mclose>Cancelar</button><button type="button" class="btn danger" data-act="rsGo">${UI.ic('trash')}Apagar os testes</button></div></div>`, 'tall');
  const m = document.getElementById('modal'); if (m && !m.__rs) { m.__rs = 1; m.addEventListener('change', e => { if (e.target.name === 'rsr' || e.target.name === 'rsrest') sum(); }); } };
A.rsArea = b => { const d = b.closest('.rs-a'); if (!d) return; d.querySelectorAll('input[name=rsr], input[name=rsrest]').forEach(x => { x.checked = b.dataset.v === '1'; }); sum(); };

let busy = false;
A.rsGo = async () => { if (busy) return; const cf = document.getElementById('rsConf');
  if (!cf || cf.value.trim().toUpperCase() !== 'APAGAR') { UI.toast('Escreve APAGAR para confirmar', 'warn'); cf && cf.focus(); return; }
  // o que sai: os registos marcados + (se marcado) o resto de cada área grande
  const pick = new Set(boxes().filter(b => b.checked).map(b => b.value));
  document.querySelectorAll('#modal input[name=rsrest]').forEach(x => { if (!x.checked) return; const a = x.dataset.a, L = PLAN.filter(p => (AREA_OF[p.c] || 'Outros') === a).slice(MAXROWS); L.forEach(p => pick.add(p.k)); });
  if (!pick.size) return UI.toast('Não escolheste nada para apagar', 'warn');
  const del = {}; let n = 0; pick.forEach(k => { const i = k.indexOf('|'); if (i < 0) return; const c = k.slice(0, i); (del[c] = del[c] || new Set()).add(k.slice(i + 1)); n++; });
  const logs = pick.has('habits#log') && logN() > 0, ones = ['dominus', 'forest'].filter(k => pick.has('one:' + k));
  if (logs) n += logN();
  busy = true;
  // 1 · a cópia primeiro: sem cópia não se apaga nada
  const colls = Object.keys(del).concat(logs && !del.habits ? ['habits'] : []), snap = { at: Date.now(), D: {}, ONE: {} };
  colls.forEach(c => { snap.D[c] = U.clone(OS.all(c)); }); ones.forEach(k => { snap.ONE[k] = U.clone(OS.one(k)); });
  try { await putSnap(snap); } catch (e) { busy = false; UI.toast('Não consegui guardar a cópia para desfazer, por isso não apaguei nada. Exporta uma cópia (.json) e tenta outra vez.', 'neg'); return; }
  // 2 · apagar (vai pela sincronização para os outros aparelhos)
  Object.entries(del).forEach(([c, ids]) => OS.setColl(c, OS.all(c).filter(r => !ids.has(r.id))));
  if (logs) OS.setColl('habits', OS.all('habits').map(h => h.log && Object.keys(h.log).length ? Object.assign({}, h, { log: {}, _u: Date.now() }) : h));
  ones.forEach(k => { OS.ONE[k] = blank(k); OS.touch(k); });
  U.ls.set(INFO, { at: snap.at, n });
  if (OS.CalPush) { OS.CalPush.purge = true; OS.CalPush.soon(1500); }
  busy = false; UI.closeModal(); OS.request(); UI.toast(`Pronto: ${n} registos de teste apagados. Se te enganaste, Definições → Dados → Desfazer.`, 'pos'); };

A.rsUndo = () => UI.ask('Desfazer a última limpeza?', 'Os registos apagados voltam (o que registaste depois fica). Os outros aparelhos também os recebem.', 'Desfazer', async () => {
  let s = null; try { s = await getSnap(); } catch (e) { } if (!s) { U.ls.set(INFO, null); OS.request(); return UI.toast('A cópia já não existe neste aparelho.', 'warn'); }
  let n = 0; Object.entries(s.D || {}).forEach(([c, items]) => { const ids = new Set(items.map(r => r.id)), now = new Set(OS.all(c).map(r => r.id)); n += items.filter(r => !now.has(r.id)).length; OS.setColl(c, items.concat(OS.all(c).filter(r => !ids.has(r.id)))); });
  Object.entries(s.ONE || {}).forEach(([k, v]) => { OS.ONE[k] = v; OS.touch(k); });
  await dropSnap(); U.ls.set(INFO, null); if (OS.CalPush) OS.CalPush.soon(1500); OS.request(); UI.toast(`Desfeito: ${n} registos voltaram.`, 'pos'); }, 'pri');
R._snap = getSnap;
})();
