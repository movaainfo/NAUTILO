/* OCEANUM — aplicação: navegação, barra superior, paleta de comandos, registo rápido, eventos globais, arranque. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, C = OS.C, V = OS.views, A = OS.act, esc = U.esc;
const NAV = [
  ['Visão geral', [['visao', 'Painel', 'grid', () => { const n = OS.Intel.alerts().filter(a => a.lvl === 'urgent').length; return n ? [n, 'neg'] : null; }], ['hoje', 'Hoje', 'sun'], ['jornal', 'Jornal', 'news', () => { const n = OS.News && OS.News.unread(); return n ? [n, ''] : null; }], ['email', 'E-mail e LinkedIn', 'mail', () => { const c = OS.Mail && OS.Mail.counts(); return c && c.urg ? [c.urg, 'neg'] : null; }], ['calendario', 'Calendário', 'cal']]],
  ['Execução', [['tarefas', 'Tarefas', 'checksq', () => { const n = OS.Tasks.open().filter(OS.Tasks.late).length; return n ? [n, 'neg'] : [OS.Tasks.open().length, '']; }], ['habitos', 'Hábitos e rotina', 'repeat'], ['foco', 'Bloco de foco', 'focus', () => { const b = OS.FocusBlock && OS.FocusBlock.state(); return b && b.phase !== 'end' ? ['●', 'pos'] : null; }], ['projetos', 'Projetos', 'folder'], ['metas', 'Metas', 'target']]],
  ['Eu', [['eu', 'Quem sou eu', 'user']]],
  ['Fé', [['fe', 'Fé & Devoção', 'cross']]],
  ['Dinheiro', [['gasto', 'Gasto rápido', 'bolt'], ['financas', 'Finanças', 'wallet'], ['investimentos', 'Investimentos', 'trend'], ['relatorios', 'Relatórios', 'note', () => { const n = OS.Reports && OS.Reports.unseen(); return n ? [n, ''] : null; }], ['compras', 'Compras', 'cart', () => { const n = OS.all('wishlist').filter(w => w.status === 'Em espera').length; return n ? [n, ''] : null; }], ['simuladores', 'Simuladores', 'calc']]],
  ['Estudos', [['universidade', 'Universidade', 'school'], ['floresta', 'Floresta (foco)', 'tree', () => { const r = OS.Forest && OS.Forest.run(); return r ? ['●', 'pos'] : null; }], ['cursos', 'Cursos', 'play'], ['certificacoes', 'Certificações', 'shield'], ['leituras', 'Leituras', 'book', () => { const n = OS.all('books').filter(b => b.status === 'A ler').length; return n ? [n, ''] : null; }], ['aprendizagem', 'Trilhas e competências', 'brain'], ['conhecimento', 'Base de conhecimento', 'note']]],
  ['Corpo', [['corpo', 'Visão do corpo', 'heart'], ['treino', 'Treino', 'dumbbell'], ['dieta', 'Dieta', 'apple'], ['corrida', 'Corrida', 'run'], ['desporto', 'Desporto', 'target']]],
  ['Carreira', [['trabalho', 'Trabalho', 'briefcase'], ['carreira', 'Carreira e contactos', 'users'], ['capital', 'Capital Profissional', 'star'], ['oportunidades', 'Oportunidades', 'door']]],
  ['Direção', [['next', 'Próximos passos', 'zap'], ['northstar', 'Estrela-guia', 'compass'], ['roadmap', 'Roteiro da vida', 'map'], ['evolucao', 'Minha Evolução', 'mountain'], ['decisoes', 'Centro de decisões', 'scale'], ['revisao', 'Revisões', 'rewind']]]];
const TITLES = { dominus: ['Dominus', 'Jogo'], definicoes: ['Definições', 'Sistema'] };
NAV.forEach(([g, items]) => items.forEach(([k, l]) => TITLES[k] = [l, g]));
TITLES.control = ['Painel', 'Visão geral']; TITLES.painel = ['Painel', 'Visão geral'];
TITLES.mova = [OS.one ? 'Mova' : 'Mova', 'Empresa'];

const CORE = ['visao', 'eu', 'fe', 'jornal', 'gasto', 'hoje', 'tarefas', 'habitos', 'financas', 'treino', 'dieta', 'universidade', 'metas'];
const DESC = { relatorios: 'Relatórios mensais, trimestrais e anuais, prontos para a declaração de IRS.', spyke: 'O teu assistente de voz: resumo do dia, perguntas e comandos.', email: 'E-mails e LinkedIn resumidos: urgente, responder, spam.', foco: 'Resolver pendências por prioridade, sem fugir, com saída por Face ID.', desporto: 'Os teus desportos, práticas, estatísticas e treinos para melhorar.', floresta: 'Foca-te e faz crescer a tua floresta.', cursos: 'Os cursos que estás a fazer, com progresso.', certificacoes: 'Todas as tuas certificações.', leituras: 'Estante virtual: livros, resenhas e desafios.', eu: 'A tua história, família, amigos e quem és.', jornal: 'As notícias do mundo e de cada país, em tempo real.', fe: 'Versículo do dia, Bíblia, devocional e oração.', visao: 'Tudo num só lugar: dinheiro, agenda, alertas, próxima ação, trabalho, corpo e estudos.', gasto: 'Registar uma compra em segundos.', hoje: 'O teu dia numa página.',  next: 'O plano da tua vida: do passo pequeno ao grande, por área.', calendario: 'Aulas, turnos, compromissos e Google Calendar.', tarefas: 'Tudo o que tens para fazer.', habitos: 'Inegociáveis, rotina e sequências.', projetos: 'Projetos com fases e progresso.', metas: 'Metas grandes e o caminho até elas.', financas: 'Contas, gastos, orçamento e dívidas.', investimentos: 'Carteira, movimentos e cotações.', compras: 'Pensar antes de comprar.', simuladores: 'Empréstimos, compras, metas e juros.', universidade: 'Disciplinas, avaliações, revisões.', aprendizagem: 'Competências a dominar, etapa a etapa.', conhecimento: 'Notas e conhecimento guardado.', corpo: 'Treino, dieta e corrida ligados.', treino: 'Rotinas, treino em curso, exercícios com imagens.', dieta: 'Refeições, calorias, proteína e água.', dieta: 'Refeições, calorias, proteína e água.', corrida: 'Corridas, plano e ritmo.', trabalho: 'Turnos e horas de trabalho.', carreira: 'Rede de contactos e experiências.', capital: 'O teu valor profissional a crescer.', oportunidades: 'Vagas, candidaturas e oportunidades.', mova: 'A tua empresa: vendas, clientes, custos.', northstar: 'A direção que guia tudo.', roadmap: 'O plano no tempo.', longterm: 'Visão a 1, 5 e 10 anos.', decisoes: 'Decidir bem, com critérios.', revisao: 'Revisões semanais e mensais.', evolucao: 'Tudo o que te aproxima dos objetivos: evolução por área e longo prazo.' };
const unlocked = () => new Set(CORE.concat(Object.keys((OS.ui.nav) || {})));
const unlock = k => { if (!k || CORE.includes(k) || !DESC[k]) return; const n = Object.assign({}, OS.ui.nav || {}); if (!n[k]) { n[k] = 1; OS.ui.nav = n; try { OS.setUI('nav', n); } catch (e) { } } };
const setH = (el, h) => { if (el && el._h !== h) { el.innerHTML = h; el._h = h; } };
function renderSide(cur) {
  setH(U.$('#side'), `<a class="brand" href="#visao"><span class="brand-mark oc">${OS.Lock.logo(20, '#EDE6DA', 4)}</span><span><b>OCEANUM</b></span></a>
  <a class="side-set ${cur === 'definicoes' ? 'on' : ''}" href="#definicoes">${UI.ic('settings')}<span>Definições</span></a>
  ${NAV.map(([g, items]) => `<div class="nav-g"><h6>${g}</h6>${items.map(([k, l, ic, cnt]) => { let c = null; if (cnt) { try { c = cnt(); } catch (e) { } } return `<a href="#${k}" class="${cur === k ? 'on' : ''}">${UI.ic(ic)}<span>${k === 'mova' ? esc(OS.one('mova').name || 'Mova') : l}</span>${c && c[1] === 'neg' ? `<span class="cnt neg">${c[0]}</span>` : ''}</a>`; }).join('')}</div>`).join('')}
  <div class="side-foot"><i class="sync-dot ${OS.sync.status}" id="syncDot"></i><span id="syncMsg">${esc(OS.sync.msg)}</span><button class="icon-btn" style="margin-left:auto" data-act="lockNow" aria-label="Bloquear" title="Bloquear">${UI.ic('lock')}</button><a class="icon-btn" href="#definicoes" aria-label="Definições">${UI.ic('settings')}</a></div>`);
}
V.explorar = () => { const un = unlocked(); return `<div class="exp"><div class="exp-h"><h1>Explorar</h1><p>Tudo o que o Oceanum faz. Abre um lugar e ele passa a aparecer no teu menu.</p></div>
  ${NAV.map(([g, items]) => `<section class="exp-g"><h6>${g}</h6><div class="exp-grid">${items.map(([k, l, ic]) => `<a class="exp-t ${un.has(k) ? 'in' : ''}" href="#${k}">${UI.ic(ic)}<b>${k === 'mova' ? esc(OS.one('mova').name || 'Mova') : l}</b><small>${DESC[k] || ''}</small>${un.has(k) ? '<em>no menu</em>' : '<em class="new">novo</em>'}</a>`).join('')}</div></section>`).join('')}
  <section class="exp-g"><h6>Jogo</h6><div class="exp-grid"><a class="exp-t in" href="#dominus">${UI.ic('crown')}<b>Dominus</b><small>O teu personagem: nível, classe e título, só com conquistas reais.</small><em>no menu</em></a></div></section></div>`; };
TITLES.explorar = ['Explorar', 'OCEANUM'];
TITLES.visao = ['Painel', 'Visão geral'];
function renderTop(cur) {
  const grp = (NAV.find(([, items]) => items.some(([k]) => k === cur)) || [''])[0];
  setH(U.$('#top'), `<button class="icon-btn tn-menu" data-act="navOpen" aria-label="Menu">${UI.ic('menu')}</button>
  <a class="tn-brand" href="#visao" aria-label="Oceanum, Painel">${OS.Lock.logo(22, '#BFEFFF', 4)}<b>OCEANUM</b></a>
  <nav class="tn" aria-label="Secções">${NAV.map(([g, items]) => `<div class="tn-g ${grp === g ? 'cur' : ''}"><button class="tn-b" data-act="tnToggle" aria-haspopup="true">${g === 'Visão geral' ? 'Visão Geral' : g}<svg viewBox="0 0 24 24" class="ic tn-car"><path d="M6 9l6 6 6-6"/></svg></button>
    <div class="tn-dd">${items.map(([k, l, ic]) => `<a href="#${k}" class="${cur === k ? 'on' : ''}">${UI.ic(ic)}<span><b>${k === 'mova' ? esc(OS.one('mova').name || 'Mova') : l}</b><small>${esc(DESC[k] || '')}</small></span></a>`).join('')}</div></div>`).join('')}</nav>
  <div class="tn-r"><i class="sync-dot ${OS.sync.status}" id="syncDot2" title="${esc(OS.sync.msg)}"></i>
  <button class="icon-btn spy-tb" data-act="spyOpen" aria-label="Spyke" title="Spyke (assistente de voz)">${UI.ic('mic')}</button>
  <button class="icon-btn" data-act="cmdOpen" aria-label="Procurar (Ctrl K)" title="Procurar (Ctrl K)">${UI.ic('search')}</button>
  <button class="icon-btn tn-hide-s" data-act="focusStart" aria-label="Modo foco" title="Modo foco">${UI.ic('focus')}</button>
  <a class="icon-btn" href="#definicoes" aria-label="Definições" title="Definições">${UI.ic('settings')}</a>
  <button class="btn pri sm tn-add" data-act="quickAdd" aria-label="Registar">${UI.ic('plus')}<span>Registar</span></button></div>`);
}
function renderTab(cur) {
  setH(U.$('#tabbar'), '');
  let fab = document.getElementById('gameFab');
  if (!fab) { fab = document.createElement('a'); fab.id = 'gameFab'; fab.href = '#dominus'; document.body.appendChild(fab); }
  const dom = OS.one('dominus'), lv = OS.Dom ? OS.Dom.sumLv() : 0, pend = ((dom.rwv2 || {}).pend || []).length;
  fab.className = cur === 'dominus' ? 'on' : ''; fab.href = cur === 'dominus' ? '#visao' : '#dominus';
  fab.setAttribute('aria-label', cur === 'dominus' ? 'Sair do jogo' : `Dominus, nível ${lv}`); fab.title = cur === 'dominus' ? 'Voltar' : 'Dominus · nível ' + lv;
  fab.innerHTML = `${UI.ic(cur === 'dominus' ? 'x' : 'crown')}${dom.started && cur !== 'dominus' ? `<span class="fab-lv">${pend ? '!' : lv}</span>` : ''}`;
}
A.tnToggle = b => { const g = b.closest('.tn-g'), open = g.classList.contains('open'); document.querySelectorAll('.tn-g.open').forEach(x => x.classList.remove('open')); if (!open) g.classList.add('open'); };
document.addEventListener('click', e => { if (!e.target.closest('.tn-g')) document.querySelectorAll('.tn-g.open').forEach(x => x.classList.remove('open')); });
/* ---------- revelação progressiva: poucas secções de cada vez ----------
   Os botões "Mostrar mais"/"Ver mais" mostram logo o que estava escondido: o render não redesenha uma página igual,
   por isso não basta guardar a escolha. */
const SKIP = ['dominus', 'definicoes', 'explorar'];
function progressive(cur, raw) {
  if (SKIP.includes(cur)) return; const view = U.$('#view'); let root = view; while (root.children.length === 1 && root.firstElementChild.children.length > 1) root = root.firstElementChild;
  const kids = [...root.children].filter(el => !el.matches('script,style')), key = 'more_page_' + raw, open = OS.ui[key];
  // só recolhe o que fica abaixo do primeiro ecrã: cabeçalho, separadores e o conteúdo principal ficam sempre visíveis
  if (!open && kids.length > 3) { const top0 = root.getBoundingClientRect().top, lim = Math.max(900, innerHeight * 1.25);
    const cut = kids.findIndex((el, i) => i >= 3 && !el.matches('.phead,.tabs') && el.getBoundingClientRect().top - top0 > lim);
    if (cut > 0 && kids.length - cut >= 2) { kids.slice(cut).forEach(el => el.classList.add('pg-hide')); const b = document.createElement('button'); b.className = 'pg-more'; b.innerHTML = `Mostrar mais <small>${kids.length - cut}</small>`; b.onclick = () => { kids.forEach(el => el.classList.remove('pg-hide')); b.remove(); OS.setUI(key, true); }; root.appendChild(b); } }
  view.querySelectorAll('.list:not([data-all])').forEach((l, i) => { const items = [...l.children]; if (items.length <= 6 || OS.ui['more_list_' + raw + i]) return; items.slice(5).forEach(el => el.classList.add('pg-hide')); const b = document.createElement('button'); b.className = 'pg-more sm'; b.textContent = `Ver mais ${items.length - 5}`; b.onclick = () => { items.forEach(el => el.classList.remove('pg-hide')); b.remove(); OS.setUI('more_list_' + raw + i, true); }; l.appendChild(b); });
}
/* ---------- render principal com preservação de foco ---------- */
let lastRoute = '';
const FOCUS_ATTRS = ['data-fk', 'data-uif', 'data-bind', 'data-sim', 'data-uiv', 'id'];
function render() {
  if (!OS.Lock.unlocked()) return;
  let r = OS.route();
  // o Spyke vive dentro de Definições: os links antigos (#spyke, #spyke.bomdia, atalhos da Siri) continuam a funcionar
  if (r.raw === 'foco.apps') { try { history.replaceState(null, '', '#definicoes.atalhos'); } catch (e) { } r = { base: 'definicoes', sub: 'atalhos', raw: 'definicoes.atalhos' }; }
  if (r.base === 'longterm') { try { history.replaceState(null, '', '#evolucao'); } catch (e) { } r = { base: 'evolucao', sub: '', raw: 'evolucao' }; }
  if (r.raw === 'email.contas') { try { history.replaceState(null, '', '#definicoes.email'); } catch (e) { } r = { base: 'definicoes', sub: 'email', raw: 'definicoes.email' }; }
  if (r.base === 'spyke') { try { history.replaceState(null, '', '#definicoes.spyke' + (r.sub ? '.' + r.sub : '')); } catch (e) { } r = { base: 'definicoes', sub: 'spyke' + (r.sub ? '.' + r.sub : ''), raw: 'definicoes.spyke' + (r.sub ? '.' + r.sub : '') }; }
  const cur = V[r.base] ? r.base : 'visao';
  unlock(cur);
  document.body.classList.toggle('dom-mode', cur === 'dominus');
  const a = document.activeElement; let fsel = null, caret = null;
  if (a && a !== document.body && U.$('#view').contains(a)) { for (const at of FOCUS_ATTRS) { const v = a.getAttribute(at); if (v) { fsel = `[${at}="${CSS.escape(v)}"]`; break; } } try { caret = a.selectionStart; } catch (e) { } }
  try { renderSide(cur); renderTop(cur); renderTab(cur); } catch (e) { console.error(e); }
  C.reset(); let html;
  try { html = cur === 'definicoes' && OS.settingsView ? OS.settingsView(r.sub) : V[cur](r.sub); } catch (e) { console.error(e); html = `<div class="pn"><b>Não foi possível mostrar esta página.</b><p class="mut">${esc(e.message)}</p></div>`; }
  if (!html || !String(html).trim()) html = `<div class="pn"><b>Esta página ainda está vazia.</b><p class="mut"><a href="#hoje">Voltar ao Hoje</a></p></div>`;
  // se nada mudou na página, não a substitui (evita piscar, perder o toque e redesenhar gráficos à toa)
  const sig = r.raw + '|' + String(html).replace(/ id="ch\d+"/g, ''), view = U.$('#view');
  if (sig !== view._sig || !view.firstChild) { view.innerHTML = html; view._sig = sig;
    try { C.drawAll(); } catch (e) { console.error(e); }
    try { progressive(cur, r.raw); } catch (e) { console.error(e); } }
  if (fsel) { const el = U.$('#view').querySelector(fsel); if (el) { el.focus({ preventScroll: true }); try { if (caret != null && el.setSelectionRange) el.setSelectionRange(caret, caret); } catch (e) { } } }
  if (r.raw !== lastRoute) { window.scrollTo(0, 0); lastRoute = r.raw; }
  document.title = OS.focusState && OS.focusState() ? document.title : 'OCEANUM';
}
OS.on('render', render);
OS.on('sync', s => { const d = U.$('#syncDot'), d2 = U.$('#syncDot2'), m = U.$('#syncMsg'); if (d) d.className = 'sync-dot ' + s.status; if (d2) { d2.className = 'sync-dot ' + s.status; d2.title = s.msg; } if (m) m.textContent = s.msg; });
addEventListener('hashchange', () => { document.body.classList.remove('nav-open'); render(); });

/* ---------- registo rápido ---------- */
const QA = [['tasks', 'Tarefa', 'checksq', {}], ['transactions', 'Despesa', 'wallet', { type: 'Despesa' }], ['transactions', 'Receita', 'coin', { type: 'Receita' }], ['events', 'Compromisso', 'cal', {}], ['sessions', 'Sessão de estudo', 'school', {}], ['workouts', 'Treino', 'dumbbell', {}], ['runs', 'Corrida', 'run', {}], ['notes', 'Nota', 'note', {}], ['contacts', 'Contacto', 'users', {}], ['mvsales', 'Venda Mova', 'rocket', {}], ['wishlist', 'Quero comprar…', 'cart', {}], ['goals', 'Meta', 'target', {}], ['assessments', 'Avaliação', 'flag', {}], ['opps', 'Oportunidade', 'door', {}], ['shifts', 'Turno', 'briefcase', {}], ['body', 'Peso', 'heart', {}], ['meals', 'Refeição', 'apple', {}]];
A.quickAdd = () => UI.modal(`<h3>Registar</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">${QA.map(([c, l, ic, d], i) => `<button class="btn" style="justify-content:flex-start;padding:10px 12px" data-qa="${i}">${UI.ic(ic)}<span>${l}</span></button>`).join('')}</div>`);
document.addEventListener('click', e => { const b = e.target.closest('[data-qa]'); if (!b) return; const [c, , , d] = QA[+b.dataset.qa]; UI.closeModal(); UI.openForm(c, null, d); });

/* ---------- paleta de comandos ---------- */
let cmdSel = 0;
A.cmdOpen = () => { UI.modal(`<input id="cmdIn" placeholder="Ir para uma página, criar algo, procurar registos…" aria-label="Comando" autocomplete="off"><div class="cmd-list" id="cmdList"></div>`, 'cmd'); const inp = U.$('#cmdIn'); inp.addEventListener('input', () => { cmdSel = 0; cmdRender(); }); inp.addEventListener('keydown', cmdKey); cmdSel = 0; cmdRender(); setTimeout(() => inp.focus(), 20); };
function cmdItems(q) {
  q = q.toLowerCase().trim(); const out = [];
  NAV.forEach(([g, items]) => items.forEach(([k, l, ic]) => out.push({ l, s: g, ic, run: () => OS.go(k) })));
  out.push({ l: 'Dominus', s: 'Jogo', ic: 'crown', run: () => OS.go('dominus') }, { l: 'Definições', s: 'Sistema', ic: 'settings', run: () => OS.go('definicoes') }, { l: 'Spyke (assistente)', s: 'Definições', ic: 'mic', run: () => OS.go('definicoes.spyke') }, { l: 'Script Google (Parte 4)', s: 'Definições', ic: 'link', run: () => OS.go('definicoes.script') }, { l: 'Configurar e-mail', s: 'Definições', ic: 'mail', run: () => OS.go('definicoes.email') }, { l: 'Ligações (agenda, cotações)', s: 'Definições', ic: 'link', run: () => OS.go('definicoes.ligacoes') }, { l: 'Atalhos do iPhone', s: 'Definições', ic: 'bolt', run: () => OS.go('definicoes.atalhos') }, { l: 'Modo foco', s: 'Ação', ic: 'focus', run: () => A.focusStart({ dataset: {} }) });
  QA.forEach(([c, l, ic, d]) => out.push({ l: 'Novo: ' + l, s: 'Criar', ic: 'plus', run: () => UI.openForm(c, null, d) }));
  if (q.length >= 2) [['tasks', 'title', 'Tarefa'], ['goals', 'title', 'Meta'], ['projects', 'name', 'Projeto'], ['notes', 'title', 'Nota'], ['contacts', 'name', 'Contacto'], ['transactions', 'desc', 'Movimento'], ['opps', 'name', 'Oportunidade'], ['subjects', 'name', 'Disciplina'], ['assessments', 'title', 'Avaliação']].forEach(([c, f, lab]) => OS.all(c).filter(r => String(r[f] || '').toLowerCase().includes(q)).slice(0, 5).forEach(r => out.push({ l: r[f], s: lab + (r.date ? ' · ' + U.fmtD(r.date) : ''), ic: 'search', run: () => UI.openForm(c, r.id) })));
  return q ? out.filter(x => (x.l + ' ' + x.s).toLowerCase().includes(q) || x.s !== 'Criar' && x.ic === 'search').slice(0, 30) : out.slice(0, 30);
}
function cmdRender() { const it = cmdItems(U.$('#cmdIn').value); U.$('#cmdList').innerHTML = it.map((x, i) => `<div class="cmd-it ${i === cmdSel ? 'on' : ''}" data-cmd="${i}">${UI.ic(x.ic)}<span>${esc(x.l)}</span><small>${esc(x.s)}</small></div>`).join('') || '<div class="empty"><p>Nada encontrado.</p></div>'; U.$('#cmdList')._items = it; }
function cmdKey(e) { const list = U.$('#cmdList'), it = list._items || []; if (e.key === 'ArrowDown') { cmdSel = Math.min(it.length - 1, cmdSel + 1); cmdRender(); e.preventDefault(); } else if (e.key === 'ArrowUp') { cmdSel = Math.max(0, cmdSel - 1); cmdRender(); e.preventDefault(); } else if (e.key === 'Enter' && it[cmdSel]) { UI.closeModal(); it[cmdSel].run(); } }
document.addEventListener('click', e => { const c = e.target.closest('[data-cmd]'); if (!c) return; const it = (U.$('#cmdList') || {})._items || []; const x = it[+c.dataset.cmd]; UI.closeModal(); x && x.run(); });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); A.cmdOpen(); } });

/* ---------- ações comuns ---------- */
A.navOpen = () => document.body.classList.add('nav-open');
document.addEventListener('click', e => { if (document.body.classList.contains('nav-open') && !e.target.closest('#side') && !e.target.closest('[data-act="navOpen"]')) document.body.classList.remove('nav-open'); });
A.taskToggle = b => { const t = OS.get('tasks', b.dataset.id); if (!t) return; if (t.status === 'Feita') { OS.upd('tasks', t.id, { status: 'Próxima', doneAt: '' }); } else { OS.Tasks.complete(t.id); UI.toast('Feito. Próxima.', 'pos'); } };
A.taskDone = b => { OS.Tasks.complete(b.dataset.id); UI.toast('Feito. Próxima.', 'pos'); };

/* ---------- delegação global de eventos ---------- */
const setPath = (o, path, v) => { const ks = path.split('.'); let c = o; for (let i = 0; i < ks.length - 1; i++) { if (c[ks[i]] == null || typeof c[ks[i]] !== 'object') c[ks[i]] = {}; c = c[ks[i]]; } c[ks[ks.length - 1]] = v; };
document.addEventListener('click', e => {
  const t = e.target;
  const hit = t.closest('[data-act],[data-new],[data-edit]');
  if (hit && !(hit.hasAttribute('data-act') && hit.tagName === 'INPUT' && hit.type !== 'checkbox') && !(hit.hasAttribute('data-edit') && !hit.hasAttribute('data-act') && t.closest('input,select,textarea') && hit.contains(t.closest('input,select,textarea')))) {
    if (hit.hasAttribute('data-act')) { const f = A[hit.dataset.act]; if (f) { if (hit.tagName !== 'INPUT') e.preventDefault(); f(hit, e); return; } }
    else if (hit.hasAttribute('data-new')) { e.preventDefault(); let d = {}; try { d = hit.dataset.defs ? JSON.parse(hit.dataset.defs) : {}; } catch (er) { } UI.openForm(hit.dataset.new, null, d); return; }
    else { e.preventDefault(); const [c, id] = hit.dataset.edit.split(':'); UI.openForm(c, id); return; }
  }
  const go = t.closest('[data-go]'); if (go && !t.closest('button,a,input')) { OS.go(go.dataset.go); return; }
  const ui = t.closest('[data-ui]'); if (ui) { const k = ui.dataset.ui, v = ui.dataset.v; if (k.includes('.')) { const [a, b] = k.split('.'); OS.setUI(a, Object.assign({}, OS.ui[a] || {}, { [b]: v })); } else OS.setUI(k, v); return; }
  const so = t.closest('[data-sort]'); if (so) { const k = 'sort_' + so.dataset.sort, i = +so.dataset.i, cur = OS.ui[k]; OS.setUI(k, cur && cur.i === i ? { i, d: -cur.d } : { i, d: 1 }); return; }
  const mo = t.closest('[data-more]'); if (mo) { OS.setUI('more_' + mo.dataset.more, true); return; }
});
document.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const el = e.target; if (el.matches('[data-edit],[data-go],[data-act][role],[data-act][tabindex]') && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(el.tagName)) { e.preventDefault(); el.click(); } });
document.addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('details[data-tog]')) { OS.ui['tog_' + d.dataset.tog] = d.open; U.ls.set('os2ui', OS.ui); } }, true);
const onField = el => {
  if (el.dataset.uif) { const [a, b] = el.dataset.uif.split('.'); OS.setUI(a, Object.assign({}, OS.ui[a] || {}, { [b]: el.value })); return true; }
  if (el.dataset.uiv) { OS.setUI(el.dataset.uiv, el.value); return true; }
  if (el.dataset.sim) { const [k, f] = el.dataset.sim.split('.'); OS.setUI('sim_' + k, Object.assign({}, OS.ui['sim_' + k] || {}, { [f]: el.value === '' ? 0 : U.num(el.value) })); return true; }
  if (el.dataset.bind) { const [one, ...rest] = el.dataset.bind.split('.'); const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : U.num(el.value)) : el.value; setPath(OS.one(one), rest.join('.'), v); OS.touch(one); return true; }
  return false;
};
document.addEventListener('change', e => { const el = e.target; if (el.closest('#drawer') && !el.dataset.bind) return; if (el.type === 'search') return; onField(el); });
const debSearch = U.deb(el => onField(el), 280);
document.addEventListener('input', e => { const el = e.target; if (el.type === 'search' && el.dataset.uif) debSearch(el); });
document.addEventListener('submit', e => {
  const f = e.target; if (f.id === 'osform') return; const name = f.dataset.form; if (!name) return; e.preventDefault();
  const v = n => (f.elements[n] && f.elements[n].value || '').trim();
  if (name === 'quickTask') { const s = v('t'); if (!s) return; const o = OS.Tasks.quickParse(s); if (f.dataset.today) { o.sched = o.sched || U.today(); o.status = 'Próxima'; } if (f.dataset.project && !o.project) { o.project = f.dataset.project; if (o.status === 'Inbox') o.status = 'Próxima'; } OS.add('tasks', o); UI.toast(f.dataset.today ? 'Tarefa para hoje' : o.project ? 'Tarefa no projeto ' + ((OS.get('projects', o.project) || {}).name || '') : 'No Inbox', 'pos'); }
  else if (OS.forms && OS.forms[name]) OS.forms[name](f, v);
  f.reset && f.reset();
  OS.request(); setTimeout(() => { const n = U.$(`form[data-form="${name}"] input:not([type=hidden])`); n && n.focus(); }, 30);
});



/* ---------- modo leve (Definições) ---------- */
(() => { const orig = V.definicoes; if (!orig) return;
  V.definicoes = sub => { const f = U.ls.get('os2lite', null), on = document.documentElement.classList.contains('lite');
    return orig(sub) + `<div class="pn"><div class="pn-h"><h3>Desempenho</h3><span class="mut" style="font-size:12px">${on ? 'modo leve ligado' : 'efeitos completos'}</span></div><p class="mut" style="margin:0 0 10px">O modo leve tira sombras, desfoques e animações. Liga-o se a app estiver lenta ou travar (fica ligado sozinho em Android e aparelhos com pouca memória).</p><div class="seg" role="group">${[['auto', 'Automático'], ['1', 'Leve'], ['0', 'Completo']].map(([v, l]) => `<button class="${(f == null ? 'auto' : String(f)) === v ? 'on' : ''}" data-act="liteSet" data-v="${v}">${l}</button>`).join('')}</div></div>`; };
  const origV = V.definicoes; V.definicoes = sub => { const vv = window.OceanumVersion || {};
    return origV(sub) + `<div class="pn" id="verPn"><div class="pn-h"><h3>Versão do OCEANUM</h3><span class="mut" style="font-size:12px">v${esc(vv.v || '')}${vv.date ? ' · ' + esc(vv.date) : ''}</span></div><p class="mut" style="margin:0 0 10px">As atualizações chegam sozinhas quando abres a app. Se um aparelho ficar para trás, toca aqui: ele compara com a versão publicada e atualiza já (os teus dados ficam).</p><button class="btn sm" data-act="updCheck">${UI.ic('sync')}Procurar atualização</button></div>`; };
  const orig2 = V.definicoes; V.definicoes = sub => { const t = OS.Lock.trusted();
    return orig2(sub) + `<div class="pn"><div class="pn-h"><h3>Código neste aparelho</h3><span class="mut" style="font-size:12px">${t ? 'não pede código' : 'pede código ao abrir'}</span></div><p class="mut" style="margin:0 0 10px">Num aparelho só teu (como o teu tablet), podes entrar direto sem escrever o código. Os outros aparelhos continuam a pedir. O botão do cadeado volta a ligar o código.${OS.Lock.android ? ' Neste aparelho Android a biometria está desligada para não abrir o ecrã de senha do sistema.' : ''}</p><div class="seg" role="group"><button class="${t ? '' : 'on'}" data-act="trustSet" data-v="0">Pedir código</button><button class="${t ? 'on' : ''}" data-act="trustSet" data-v="1">Entrar direto</button></div></div>`; };
  A.trustSet = b => { OS.Lock.setTrusted(b.dataset.v === '1'); UI.toast(b.dataset.v === '1' ? 'Este aparelho entra direto' : 'O código volta a ser pedido', 'pos'); OS.request(); };
  A.updCheck = () => { if (window.OceanumCheckUpdate) window.OceanumCheckUpdate(true); else location.reload(); };
  A.liteSet = b => { const v = b.dataset.v; try { if (v === 'auto') localStorage.removeItem('os2lite'); else localStorage.setItem('os2lite', v); } catch (e) { } location.reload(); };
})();
/* ---------- Definições com separadores: Geral · Spyke (assistente) · Script Google ---------- */
OS.SETT = [['', 'Geral'], ['email', 'E-mail'], ['ligacoes', 'Ligações'], ['atalhos', 'Atalhos do iPhone'], ['spyke', 'Spyke (assistente)'], ['impostos', 'Impostos'], ['script', 'Script Google']];
OS.settingsView = sub => { const s = String(sub || ''), k = ['script', 'email', 'ligacoes', 'atalhos', 'impostos'].includes(s) ? s : /^spyke(\.|$)/.test(s) ? 'spyke' : '';
  const sp = k === 'spyke' ? `<button class="btn pri" data-act="spyBrief">${UI.ic('play')}Resumo do dia</button>` : '';
  const head = UI.head('Definições', k === 'spyke' ? 'O Spyke, o teu assistente de voz: estado, cérebro, voz, escuta, memória e Siri.' : k === 'script' ? 'O teu script Google, parte a parte: o que cada uma faz e o botão para a copiar.' : k === 'email' ? 'As contas de e-mail ligadas ao Oceanum: Gmail, faculdade e outras.' : k === 'ligacoes' ? 'Serviços ligados ao Oceanum: a tua agenda no Google Calendar e no iPhone, cotações da bolsa e alertas.' : k === 'atalhos' ? 'Atalhos do iPhone: gasto rápido, relógio da corrida e bloquear apps no bloco de foco.' : k === 'impostos' ? 'A tua situação fiscal, para os Relatórios saírem no formato certo da declaração de IRS (e do IRPF no Brasil).' : 'O teu perfil alimenta cálculos em todo o sistema.', sp, 'Sistema') + UI.tabs('definicoes', OS.SETT, k);
  if (k === 'spyke') return head + String(V.spyke ? V.spyke(s.slice(6)) : '').replace(/^\s*<header class="phead">[\s\S]*?<\/header>/, '');
  if (k === 'script') return head + (OS.Inbox && OS.Inbox.scriptTab ? OS.Inbox.scriptTab() : '');
  const sec = (t, h) => h ? `<h4 class="set-h">${t}</h4>${h}` : '';
  if (k === 'ligacoes') return head + `<div class="set-page">${sec('Agenda', (OS.CalPush ? OS.CalPush.panel() : '') + (OS.gcalPanel ? OS.gcalPanel() : ''))}${sec('Investimentos', (OS.InvX && OS.InvX.quotesSettings ? OS.InvX.quotesSettings() : '') + (OS.InvX && OS.InvX.alertSettings ? OS.InvX.alertSettings() : ''))}${sec('Notícias, e-mail e IA', `<div class="pn"><div class="list"><a class="li" href="#definicoes.script"><div class="li-t"><b>Notícias (Jornal)</b><small>Chegam pelo teu script Google: vê o estado em Script Google.</small></div><span class="mut">›</span></a><a class="li" href="#definicoes.email"><div class="li-t"><b>E-mail e faculdade</b><small>Gmail, Outlook da faculdade e outras contas.</small></div><span class="mut">›</span></a><a class="li" href="#definicoes.spyke"><div class="li-t"><b>IA (Spyke)</b><small>Uma só ligação para tudo o que usa IA.</small></div><span class="mut">›</span></a></div></div>`)}</div>`;
  if (k === 'atalhos') return head + `<div class="set-page">${OS.quickSettings ? OS.quickSettings() : ''}${OS.RunLink && OS.RunLink.panel ? `<div class="pn" id="runSet"><div class="pn-h"><h3>Relógio → Corrida</h3></div>${OS.RunLink.panel()}</div>` : ''}${OS.FocusBlock && OS.FocusBlock.settings ? OS.FocusBlock.settings() : ''}</div>`;
  if (k === 'impostos') return head + `<div class="set-page">${OS.Reports && OS.Reports.settings ? OS.Reports.settings() : ''}</div>`;
  if (k === 'email') return head + `<div class="ml-page set-mail">${OS.Mail && OS.Mail.settings ? OS.Mail.settings() : ''}</div>`;
  return String(V.definicoes(s)).replace(/^\s*<header class="phead">[\s\S]*?<\/header>/, head); };
/* ---------- com um painel aberto, só o painel rola (no iPhone o overflow:hidden não chega) ---------- */
(() => { let locked = false, y = 0, h0 = '';
  const want = () => document.body.classList.contains('nav-open') || document.body.classList.contains('noscroll') || !U.$('#modal').hidden || !!document.querySelector('.ceremony');
  const sync = () => { const w = want(); if (w === locked) return; locked = w; const b = document.body;
    if (w) { y = scrollY; h0 = location.hash; document.documentElement.classList.add('scroll-lock'); Object.assign(b.style, { position: 'fixed', top: -y + 'px', left: '0', right: '0', width: '100%' }); }
    else { document.documentElement.classList.remove('scroll-lock'); Object.assign(b.style, { position: '', top: '', left: '', right: '', width: '' }); scrollTo(0, location.hash === h0 ? y : 0); } };
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true });
  new MutationObserver(sync).observe(U.$('#modal'), { attributes: true, attributeFilter: ['hidden'] });
})();
/* ---------- arranque ---------- */
OS.on('ready', () => { try { OS.Fin.snapshot(); } catch (e) { console.error(e); } });
setInterval(() => { if (OS._day !== U.today()) { OS._day = U.today(); try { OS.Fin.snapshot(); } catch (e) { } OS.request(); } }, 60000);
OS._day = U.today();
OS.boot(() => { OS.Lock.gate(() => { if (U.ls.get('os2startGasto', false) && !location.hash) location.hash = 'gasto'; render(); }); });
})();
