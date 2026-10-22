/* NÁUTILO — DOMINUS: a tua vida como um RPG.
   O herói és tu, com a tua foto real (recortada do fundo no próprio telemóvel) numa carta de jogo que muda sozinha com o que fazes:
   brilho à volta do corpo com o Corpo, aura com a Mente, símbolos com o Intelecto, ouro com a Fortuna, companheiros com as Relações,
   halo com o Espírito, insígnias com a Carreira e estandartes com a Disciplina.
   Os 8 atributos sobem sozinhos com TUDO o que registas no Náutilo (nunca escolhes onde pôr pontos): o XP é calculado a partir
   dos teus registos, por isso está sempre certo e atualizado, em todos os aparelhos.
   Missões diárias e semanais (escolhidas pelos teus pontos fracos), um chefe por semana, conquistas, baús com recompensas reais
   a cada nível, moedas de ouro para o visual (molduras, cenários, efeitos) e os teus 100 marcos do Codex. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, V = OS.views;
const D = OS.Dom = {};
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const today = () => U.today();
OS.ONE_DEF.dominus = { v: 3, born: '', name: '', look: {}, seen: null, q: {}, wq: {}, boss: {}, opened: 0, got: [], owned: [], eq: { frame: '', scene: '', fx: '' }, legacy: {}, legx: { add: {}, off: {} }, fly: true };
const S = () => { const s = OS.one('dominus'); if (s.v !== 3) { Object.keys(s).forEach(k => delete s[k]); Object.assign(s, U.clone(OS.ONE_DEF.dominus)); } ['q', 'wq', 'boss', 'eq', 'legacy', 'look'].forEach(k => { if (!s[k] || typeof s[k] !== 'object') s[k] = U.clone(OS.ONE_DEF.dominus[k]); }); if (!Array.isArray(s.got)) s.got = []; if (!Array.isArray(s.owned)) s.owned = []; return s; };
const save = () => OS.touch('dominus');
// gravações que não mudam o XP (escolher o chefe, o colosso): não obrigam a recalcular tudo outra vez
let QUIET = 0; const qsave = () => { QUIET++; try { save(); } finally { QUIET--; } };

/* ================= ATRIBUTOS ================= */
const AT = [
  { k: 'corpo', n: 'Corpo', ic: 'dumbbell', c: '#E5735A', d: 'Treinos, corridas, desporto, ginásio e a dieta em dia.', go: [['treino', 'Registar um treino'], ['corrida', 'Registar uma corrida'], ['dieta', 'Registar refeições']] },
  { k: 'mente', n: 'Mente', ic: 'brain', c: '#6FA8E8', d: 'Foco e calma: árvores da Floresta, blocos de foco, notas e os hábitos da mente (acordar à hora, telemóvel fora…).', go: [['floresta', 'Plantar uma árvore'], ['foco', 'Fazer um bloco de foco']] },
  { k: 'intelecto', n: 'Intelecto', ic: 'book', c: '#A08CF0', d: 'Estudo, revisões, avaliações, simulados, livros e cursos.', go: [['universidade', 'Sessão de estudo'], ['leituras', 'Leituras']] },
  { k: 'fortuna', n: 'Fortuna', ic: 'coin', c: '#E8C26A', d: 'Gastos registados, dias sem supérfluos, investir, meses com saldo positivo, orçamentos cumpridos.', go: [['gasto', 'Registar um gasto'], ['investimentos', 'Investimentos']] },
  { k: 'relacoes', n: 'Relações', ic: 'users', c: '#F08DB8', d: 'Momentos com a família e os amigos, contactos da tua rede, encontros e aniversários lembrados.', go: [['@social', 'Registar um momento com alguém'], ['eu.pessoas', 'Família e amigos']] },
  { k: 'espirito', n: 'Espírito', ic: 'sun', c: '#F5E7B8', d: 'Devocionais, oração, gratidão e os hábitos de fé.', go: [['fe', 'Fazer o devocional']] },
  { k: 'carreira', n: 'Carreira', ic: 'briefcase', c: '#5CC8A8', d: 'Horas de trabalho, candidaturas, certificações, vendas e entregas profissionais.', go: [['trabalho', 'Trabalho'], ['carreira', 'Carreira']] },
  { k: 'disciplina', n: 'Disciplina', ic: 'shield', c: '#38BDF8', d: 'Tarefas concluídas, hábitos cumpridos, dias perfeitos e ir às aulas.', go: [['tarefas', 'Tarefas'], ['habitos', 'Hábitos']] }];
const AK = AT.map(a => a.k), AO = Object.fromEntries(AT.map(a => [a.k, a]));
D.AT = AT;

// curvas: cada atributo e o herói (nível total)
const cumA = l => Math.round(1000 * Math.pow(l, 1.9)), cumH = l => Math.round(900 * Math.pow(l, 2.1)), LVMAX = 300;
const lvl = (xp, cum) => { let l = 0; while (cum(l + 1) <= xp && l < LVMAX) l++; const a = cum(l), b = cum(l + 1); return { l, into: xp - a, need: b - a, p: (xp - a) / Math.max(1, b - a) }; };
D.lvA = xp => lvl(xp, cumA); D.lvH = xp => lvl(xp, cumH);
const tierOf = l => l >= 20 ? 4 : l >= 12 ? 3 : l >= 7 ? 2 : l >= 3 ? 1 : 0;
const TITLES = [[0, 'Desperto'], [2, 'Recruta'], [4, 'Aprendiz'], [6, 'Escudeiro'], [8, 'Soldado'], [10, 'Guerreiro'], [13, 'Veterano'], [16, 'Cavaleiro'], [19, 'Capitão'], [22, 'Campeão'], [26, 'Comandante'], [30, 'Mestre'], [35, 'Grão-Mestre'], [40, 'Herói'],
  [45, 'Herói Épico'], [50, 'Lenda'], [60, 'Lenda Viva'], [70, 'Mito'], [80, 'Semideus'], [90, 'Titã'], [100, 'Soberano'], [120, 'Imortal'], [140, 'Ascendido'], [160, 'Eterno'], [180, 'Arconte'], [200, 'Dominus'], [250, 'Dominus Supremo'], [300, 'Dominus Absoluto']];
D.titleOf = l => TITLES.filter(t => l >= t[0]).pop()[1];
D.RANKS = TITLES.map(t => t[1]);
const CLASSES = { 'corpo+disciplina': 'Espartano', 'corpo+mente': 'Monge Guerreiro', 'corpo+espirito': 'Paladino', 'corpo+intelecto': 'Cavaleiro Erudito', 'corpo+fortuna': 'Mercenário', 'corpo+relacoes': 'Capitão', 'carreira+corpo': 'Gladiador',
  'intelecto+mente': 'Sábio', 'fortuna+intelecto': 'Estrategista', 'carreira+intelecto': 'Arquiteto', 'espirito+intelecto': 'Teólogo', 'intelecto+relacoes': 'Mentor', 'disciplina+intelecto': 'Erudito',
  'carreira+fortuna': 'Magnata', 'disciplina+fortuna': 'Tesoureiro', 'fortuna+relacoes': 'Mercador', 'fortuna+mente': 'Investidor de Sangue-Frio', 'espirito+fortuna': 'Mecenas',
  'espirito+relacoes': 'Pastor', 'carreira+relacoes': 'Líder', 'mente+relacoes': 'Diplomata', 'disciplina+relacoes': 'Guardião',
  'espirito+mente': 'Místico', 'disciplina+espirito': 'Asceta', 'carreira+espirito': 'Missionário', 'disciplina+mente': 'Monge', 'carreira+mente': 'Visionário', 'carreira+disciplina': 'Executor' };
// classe pura (um atributo muito à frente dos outros) e as duas raras (equilíbrio total)
const PURE = { corpo: 'Bárbaro', mente: 'Oráculo', intelecto: 'Arcanista', fortuna: 'Alquimista', relacoes: 'Bardo', espirito: 'Profeta', carreira: 'Conquistador', disciplina: 'Templário' };
// atributo que dá a armadura de cada classe (o outro dá a capa e as cores)
const PRIM = { 'Espartano': 'corpo', 'Monge Guerreiro': 'corpo', 'Paladino': 'espirito', 'Cavaleiro Erudito': 'corpo', 'Mercenário': 'corpo', 'Capitão': 'corpo', 'Gladiador': 'corpo', 'Sábio': 'intelecto', 'Estrategista': 'intelecto', 'Arquiteto': 'carreira',
  'Teólogo': 'espirito', 'Mentor': 'relacoes', 'Erudito': 'intelecto', 'Magnata': 'fortuna', 'Tesoureiro': 'fortuna', 'Mercador': 'fortuna', 'Investidor de Sangue-Frio': 'fortuna', 'Mecenas': 'fortuna', 'Pastor': 'espirito', 'Líder': 'carreira', 'Diplomata': 'relacoes',
  'Guardião': 'disciplina', 'Místico': 'mente', 'Asceta': 'espirito', 'Missionário': 'espirito', 'Monge': 'mente', 'Visionário': 'carreira', 'Executor': 'disciplina' };
const CLS = {}; Object.entries(CLASSES).forEach(([k, n]) => { const [a, b] = k.split('+'), p = PRIM[n] || a; CLS[n] = { p, q: p === a ? b : a, d: `${AO[a].n} e ${AO[b].n}` }; });
Object.entries(PURE).forEach(([k, n]) => { CLS[n] = { p: k, q: k, pure: 1, d: `${AO[k].n} muito à frente de tudo o resto` }; });
CLS['Polímata'] = { p: 'intelecto', q: 'disciplina', rare: 1, d: 'Os 8 atributos a menos de 3 níveis uns dos outros, todos no nível 8 ou mais' };
CLS['Avatar'] = { p: 'espirito', q: 'corpo', rare: 1, d: 'Os 8 atributos no nível 25 ou mais' };
// graus de cada classe, pelo nível do herói
const CRANK = [[0, 'Iniciado'], [15, 'Provado'], [35, 'Veterano'], [60, 'Mestre'], [100, 'Lendário']], ROM = ['I', 'II', 'III', 'IV', 'V'];
const rankOf = l => CRANK.filter(r => l >= r[0]).length;
const classOf = (lv, top) => { const L = AK.map(k => lv[k].l), mn = Math.min(...L), mx = Math.max(...L), a = lv[top[0]].l, b = lv[top[1]].l;
  if (mn >= 25) return 'Avatar'; if (mn >= 8 && mx - mn <= 3) return 'Polímata'; if (a < 2 || b < 1) return 'Sem classe';
  if (a >= 4 && a >= b + 4) return PURE[top[0]]; return CLASSES[top.slice().sort().join('+')] || 'Aventureiro'; };
D.CLS = CLS; D.CRANK = CRANK;

/* ================= DE ONDE VEM O XP (tudo o que registas) ================= */
const habA = name => { const n = N(name);
  if (/orac|silenc|devoc|biblia|igreja|culto|gratid|louvor|jejum/.test(n)) return 'espirito';
  if (/medit|respir|diario|journal|telemovel|ecra|redes sociais|dorm|acord|snooze|calma|desligar/.test(n)) return 'mente';
  if (/trein|corr|gin|passos|agua|alonga|caminh|proteina|dieta|comer|flexo|abdomin/.test(n)) return 'corpo';
  if (/estud|ler|leitura|pagina|ingles|livro|aula|curso/.test(n)) return 'intelecto';
  if (/gasto|poup|financ|invest|dinheiro|orcament/.test(n)) return 'fortuna';
  if (/ligar|famil|amig|mensagem|pessoa|mae|pai|namor|irma|avo/.test(n)) return 'relacoes';
  if (/trabalh|carreira|linkedin|candidat|cliente|vend/.test(n)) return 'carreira';
  return 'disciplina'; };
const SOCIAL = /jantar|almoc|cafe|anivers|familia|amig|encontro|festa|igreja|culto|namor|visita|churrasco|casamento|batizado|convivio|reuniao de familia/;
const KXP = { 'Encontro': 25, 'Refeição juntos': 25, 'Celebração': 30, 'Ajudei': 30, 'Chamada': 18, 'Conversa': 15, 'Mensagem': 8 };
OS.S.social = { label: 'Momento com alguém', title: r => (r.kind || 'Momento') + ' · ' + (((OS.get('people', r.person) || {}).name) || r.who || ''), fields: [
  { k: 'person', l: 'Com quem (da tua família e amigos)', t: 'rel', c: 'people' }, { k: 'who', l: 'Ou escreve o nome', t: 'text' },
  { k: 'kind', l: 'O quê', t: 'sel', o: Object.keys(KXP) }, { k: 'date', l: 'Dia', t: 'date', req: 1 }, { k: 'notes', l: 'Como foi (opcional)', t: 'area', rows: 2 }],
  defaults: () => ({ date: today(), kind: 'Conversa' }) };
const pname = r => ((OS.get('people', r.person) || {}).name) || r.who || 'alguém';
const bdayNear = (r, d) => { const p = OS.get('people', r.person); if (!p || !p.birthday) return false; const md = p.birthday.slice(5), x = d.slice(0, 4) + '-' + md; return Math.abs(U.diff(d, x)) <= 1; };

let CK = 0, CACHE = null; const bump = () => { CK++; CACHE = null; };
OS.on('change', bump); OS.on('remote', bump); OS.on('one:dominus', () => { if (!QUIET) bump(); }); OS.on('one:diet', bump);
// a pontuação: tudo vale 10 vezes mais do que no Dominus 3 (números maiores, a mesma justiça entre áreas)
const XS = 10;
const evs = () => { const T = today(), E = [], add = (d, a, x, t) => { d = String(d || '').slice(0, 10); if (!/^\d{4}-\d\d-\d\d$/.test(d) || d > T || !(x > 0)) return; E.push({ d, a, x: Math.round(x * XS), t }); };
  const sf = (f, c) => { try { f(); } catch (e) { if (OS.debug) console.warn('Dominus ' + c, e); } };
  // Corpo
  sf(() => OS.all('workouts').forEach(w => add(w.date, 'corpo', 30 + Math.min(20, (OS.Fit && OS.Fit.volume ? OS.Fit.volume(w) : 0) / 1500), 'Treino' + (w.title ? ': ' + w.title : ''))), 'treinos');
  sf(() => OS.all('runs').forEach(r => add(r.date, 'corpo', 10 + Math.min(50, U.num(r.km) * 4), `Corrida de ${U.nf(U.num(r.km), 1)} km`)), 'corridas');
  sf(() => OS.all('sportlog').forEach(s => add(s.date, 'corpo', 15 + Math.min(40, U.num(s.mins) / 3), 'Desporto' + (s.kind ? ': ' + s.kind : ''))), 'desporto');
  sf(() => OS.all('checkins').forEach(c => add(c.date, 'corpo', 8, 'Presença no ginásio')), 'ginásio');
  sf(() => OS.all('adventures').forEach(a => { if (a.status === 'Feita') add(a.date, 'corpo', OS.Adv ? OS.Adv.xp(a.diff) : 100, 'Aventura: ' + a.title); }), 'aventuras');
  sf(() => { if (OS.Mundo) { const m = OS.Mundo.mine(); Object.values(m).forEach(r => { if (OS.Mundo.been(r)) add(OS.Mundo.dateOf(r), 'mente', 150, 'País: ' + OS.Mundo.name(r.code)); }); } }, 'mundo');
  sf(() => { if (OS.Mundo && OS.Mundo.imine) Object.values(OS.Mundo.imine()).forEach(r => { if (OS.Mundo.been(r)) add(OS.Mundo.dateOf(r), 'mente', 50, 'Ilha: ' + OS.Mundo.iname(r.code)); }); }, 'ilhas');
  sf(() => OS.all('body').forEach(b => add(b.date, 'corpo', 5, 'Medição do corpo')), 'medidas');
  sf(() => { const by = U.groupBy(OS.all('meals'), m => m.date), lim = U.addDays(T, -60); Object.entries(by).forEach(([d, L]) => { if (L.length >= 3) add(d, 'disciplina', 5, 'Refeições do dia registadas'); if (d >= lim && OS.Diet && OS.Diet.protOk && OS.Diet.protOk(d)) add(d, 'corpo', 12, 'Meta de proteína'); }); }, 'dieta');
  // Intelecto
  sf(() => OS.all('sessions').forEach(s => add(s.date, 'intelecto', Math.min(60, U.num(s.minutes) / 2), `Estudo ${U.num(s.minutes)} min` + ((OS.get('subjects', s.subject) || {}).name ? ' · ' + OS.get('subjects', s.subject).name : ''))), 'estudo');
  sf(() => OS.all('reviews').forEach(r => ['r1At', 'r2At', 'r3At'].forEach(k => add(r[k], 'intelecto', 10, 'Revisão: ' + (r.topic || '')))), 'revisões');
  sf(() => OS.all('assessments').forEach(a => { if (a.grade === '' || a.grade == null) return; const g = U.num(a.grade); add(a.date, 'intelecto', 25 + (g >= 10 ? g * 2 : 0), `${a.type || 'Avaliação'}: ${a.title} (${g})`); }), 'avaliações');
  sf(() => OS.all('quizzes').forEach(q => add(q.date, 'intelecto', 15 + Math.min(20, U.num(q.score)), 'Simulado' + (q.title ? ': ' + q.title : ''))), 'simulados');
  sf(() => OS.all('books').forEach(b => { if (b.status === 'Lido') { add(b.end || b.start, 'intelecto', 60 + Math.min(60, U.num(b.pages) / 5), 'Livro lido: ' + b.title); add(b.end || b.start, 'mente', 15, 'Livro lido: ' + b.title); } }), 'livros');
  sf(() => OS.all('learn').forEach(l => { if (/Conclu/.test(l.status || '')) add(l.end || l.start, 'intelecto', 60, (l.kind || 'Curso') + ' concluído: ' + l.title); }), 'cursos');
  sf(() => OS.all('certs').forEach(c => add(c.date || c.obtained || c.end, 'carreira', 100, 'Certificação: ' + (c.name || c.title || ''))), 'certificações');
  // Mente
  sf(() => OS.all('trees').forEach(t => { if (t.alive !== false) add(t.date, 'mente', Math.min(60, U.num(t.mins) / 1.5), `Árvore plantada (${U.num(t.mins)} min de foco)`); }), 'floresta');
  sf(() => OS.all('focusblocks').forEach(f => add(f.date, 'mente', Math.min(60, U.num(f.minutes) / 2) + U.num(f.done) * 3, 'Bloco de foco' + (f.theme ? ': ' + f.theme : ''))), 'foco');
  sf(() => { const by = U.groupBy(OS.all('notes').filter(n => n._c), n => U.iso(new Date(n._c))); Object.entries(by).forEach(([d, L]) => add(d, 'mente', Math.min(15, L.length * 5), L.length === 1 ? 'Nota escrita' : L.length + ' notas escritas')); }, 'notas');
  // Espírito
  sf(() => OS.all('devos').forEach(d => add(d.date, 'espirito', 25, 'Devocional' + (d.ref ? ': ' + d.ref : ''))), 'devocionais');
  sf(() => OS.all('prayers').forEach(p => { add(p.date, 'espirito', 10, 'Oração: ' + p.title); if (p.status === 'Respondida') add(p.answered || p.date, 'espirito', 20, 'Oração respondida: ' + p.title); }), 'orações');
  // Relações
  sf(() => OS.all('social').forEach(r => { add(r.date, 'relacoes', KXP[r.kind] || 15, `${r.kind || 'Momento'} com ${pname(r)}`); if (bdayNear(r, r.date)) add(r.date, 'relacoes', 20, 'Lembraste-te do aniversário de ' + pname(r)); }), 'momentos');
  sf(() => OS.all('contacts').forEach(c => add(c.last, 'relacoes', 12, 'Contacto: ' + c.name)), 'contactos');
  sf(() => OS.all('events').forEach(e => { if (SOCIAL.test(N(e.title))) add(e.date, 'relacoes', 15, e.title); }), 'compromissos');
  sf(() => OS.all('people').forEach(p => { if (p._c) add(U.iso(new Date(p._c)), 'relacoes', 5, 'Na tua vida: ' + p.name); }), 'pessoas');
  // Fortuna
  sf(() => { const by = U.groupBy(OS.all('transactions'), t => t.date); Object.entries(by).forEach(([d, L]) => { add(d, 'fortuna', 8, 'Gastos registados'); if (L.some(t => t.type === 'Despesa') && !L.some(t => t.type === 'Despesa' && t.ess === 'Supérfluo')) add(d, 'fortuna', 4, 'Dia sem supérfluos'); });
    OS.all('transactions').forEach(t => { if (t.type === 'Transferência' && OS.Fin.isInvestAcc(t.toAccount) && !OS.Fin.isInvestAcc(t.account)) add(t.date, 'fortuna', Math.min(80, U.num(t.amount) / 10), 'Poupaste ' + U.eur(U.num(t.amount), { dec: 0 })); }); }, 'caixa');
  sf(() => OS.all('invtx').forEach(t => { if (t.type === 'Compra') add(t.date, 'fortuna', Math.min(80, U.num(t.qty) * U.num(t.price) / 10), 'Investiste ' + U.eur(U.num(t.qty) * U.num(t.price), { dec: 0 })); }), 'investimentos');
  sf(() => { const ms = [...new Set(OS.all('transactions').map(t => String(t.date || '').slice(0, 7)))].filter(m => m && m < T.slice(0, 7)).sort().slice(-36);
    ms.forEach(ym => { const mo = OS.Fin.month(ym), end = ym + '-' + U.pad(U.dim(ym)); if (mo.n && mo.net > 0) add(end, 'fortuna', 100, 'Mês com saldo positivo: ' + U.fmtYML(ym));
      OS.all('budgets').forEach(b => { const lim = U.num(b.limit); if (!lim || (b._c && U.iso(new Date(b._c)) > end)) return; if (OS.Fin.spentCat(b.cat, ym) <= lim) add(end, 'fortuna', 25, `Orçamento cumprido: ${b.cat} (${U.fmtYML(ym)})`); }); }); }, 'meses');
  sf(() => OS.all('wishlist').forEach(w => { if (w.status === 'Desisti') add(w.decided || (w._u ? U.iso(new Date(w._u)) : ''), 'fortuna', 30, 'Resististe a comprar: ' + w.product); }), 'desejos');
  // Carreira
  sf(() => OS.all('shifts').forEach(s => { const h = OS.Car && OS.Car.workedHours ? OS.Car.workedHours(s) : 0; if (h > 0) add(s.date, 'carreira', h * 3, `Turno de ${U.nf(h, 1)} h`); }), 'turnos');
  sf(() => OS.all('applications').forEach(a => { if (a.status !== 'Por enviar') add(a.date, 'carreira', 25, 'Candidatura: ' + (a.company || '') + (a.role ? ' · ' + a.role : '')); }), 'candidaturas');
  sf(() => OS.all('mvsales').forEach(s => { if (s.status !== 'Cancelado') add(s.date, 'carreira', 15 + Math.min(50, (OS.Mv && OS.Mv.rev ? OS.Mv.rev(s) : 0) / 10), 'Venda da Mova'); }), 'vendas');
  // Disciplina (e carreira nas tarefas de trabalho)
  sf(() => OS.all('tasks').forEach(t => { if (t.status !== 'Feita' || !t.doneAt) return; const pj = OS.get('projects', t.project), pro = (pj && ['Profissional', 'Empresarial'].includes(pj.type)) || ['Carreira', 'Trabalho', 'Mova'].includes(t.area);
    add(t.doneAt, pro ? 'carreira' : 'disciplina', 8 + (+t.prio === 1 ? 7 : +t.prio === 2 ? 4 : 0), 'Tarefa: ' + t.title); }), 'tarefas');
  sf(() => OS.all('projects').forEach(p => { if (p.status !== 'Concluído') return; const pro = ['Profissional', 'Empresarial'].includes(p.type); add(p.doneAt || (p._u ? U.iso(new Date(p._u)) : ''), pro ? 'carreira' : 'disciplina', 120, 'Projeto concluído: ' + p.name); }), 'projetos');
  sf(() => OS.all('goals').forEach(g => { if (g.status !== 'Concluída') return; const c = N(g.cat), a = /financ|dinheiro/.test(c) ? 'fortuna' : /estud|desenvolv/.test(c) ? 'intelecto' : /corr|corpo|saude|treino|desport/.test(c) ? 'corpo' : /carreira|trabalho|profiss/.test(c) ? 'carreira' : /fe|espirit/.test(c) ? 'espirito' : /relac|famil|amig/.test(c) ? 'relacoes' : 'disciplina'; add(g.doneAt || (g._u ? U.iso(new Date(g._u)) : ''), a, 150, 'Meta cumprida: ' + g.title); }), 'metas');
  sf(() => OS.all('habits').forEach(h => { const a = habA(h.name); Object.keys(h.log || {}).forEach(d => { if (h.log[d]) add(d, a, 8, 'Hábito: ' + h.name); }); }), 'hábitos');
  sf(() => { if (!OS.Hab || !OS.all('habits').some(h => h.core)) return; U.range(U.addDays(T, -400), T).forEach(d => { if (d < T && OS.Hab.dayScore(d) === 1) add(d, 'disciplina', 15, 'Dia perfeito (todos os inegociáveis)'); }); }, 'dias perfeitos');
  sf(() => { if (!OS.Att) return; OS.Att.all().forEach(o => { if (o.st === 'Presente') add(o.date, 'disciplina', 6, 'Aula: ' + ((OS.get('subjects', o.subject) || {}).name || '')); }); }, 'aulas');
  // Codex: os teus marcos
  sf(() => Object.entries(S().legacy || {}).forEach(([p, L]) => (L || []).forEach(m => m && m.t && add(m.d, LEGA[p] || 'disciplina', LEGXP / XS, 'Marco: ' + m.t))), 'codex');
  return E; };

/* ================= ESTADO CALCULADO ================= */
const wkOf = d => U.monday(d);
D.state = () => { if (CACHE && CACHE.key === CK + '|' + today()) return CACHE.v; try { if (S().born) { D.dailyIds(); D.weeklyIds(); D.monthlyIds(); } } catch (e) { }
  const key = CK + '|' + today(); if (CACHE && CACHE.key === key) return CACHE.v;
  const T = today(), base = evs(), byDay = {}, ax = Object.fromEntries(AK.map(k => [k, 0]));
  base.forEach(e => { (byDay[e.d] = byDay[e.d] || []).push(e); });
  // missões (bónus) — só depois do XP base, para não haver voltas
  const agg = dayAgg(byDay), mis = misHist(agg), all = base.concat(mis.ev);
  all.forEach(e => { ax[e.a] += e.x; });
  const total = AK.reduce((a, k) => a + ax[k], 0), H = D.lvH(total), lv = Object.fromEntries(AK.map(k => [k, D.lvA(ax[k])]));
  const days = Object.keys(byDay).sort(), last = days[days.length - 1] || '', set = new Set(days);
  let streak = 0; { let d = set.has(T) ? T : U.addDays(T, -1); while (set.has(d)) { streak++; d = U.addDays(d, -1); } }
  let best = 0, run = 0, prev = ''; days.forEach(d => { run = prev && U.diff(d, prev) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  const idle = last ? U.diff(T, last) : 99, mood = idle === 0 ? 'chamas' : idle <= 2 ? 'forma' : idle <= 5 ? 'cansado' : 'abatido';
  const wk = wkOf(T), wkX = Object.fromEntries(AK.map(k => [k, 0])), todayX = Object.fromEntries(AK.map(k => [k, 0]));
  all.forEach(e => { if (e.d >= wk) wkX[e.a] += e.x; if (e.d === T) todayX[e.a] += e.x; });
  const sorted = AK.slice().sort((a, b) => lv[b].l - lv[a].l || ax[b] - ax[a]), top = sorted.slice(0, 2);
  const cls = classOf(lv, top), clsR = rankOf(H.l), clsN = CRANK[clsR - 1][1];
  const v = { base, all, byDay, agg, ax, lv, total, H, title: D.titleOf(H.l), cls, clsR, clsN, clsFull: cls === 'Sem classe' ? cls : cls + ' ' + ROM[clsR - 1], top, streak, best, idle, mood, wkX, todayX, mis, tiers: Object.fromEntries(AK.map(k => [k, tierOf(lv[k].l)])) };
  CACHE = { key, v }; let g = null; Object.defineProperty(v, 'gold', { get: () => g == null ? (g = goldOf(v)) : g, enumerable: true }); return v; };
D.level = () => D.state().H.l;
D.sumLv = () => D.state().H.l;
D.title = () => D.state().title;

/* ================= MISSÕES ================= */
const dayAgg = byDay => { const A0 = () => ({ wk: 0, km: 0, kmMax: 0, sport: 0, meals: 0, prot: 0, studyMin: 0, revs: 0, trees: 0, focusMin: 0, notes: 0, tx: 0, sup: 0, inv: 0, inc: 0, social: 0, meet: 0, contacts: 0, devos: 0, prayers: 0, habEsp: 0, tasks: 0, p1: 0, proTasks: 0, perfect: 0, apps: 0, books: 0, g14: 0 }), M = {}, g = d => (M[d] = M[d] || A0());
  OS.all('workouts').forEach(w => w.date && g(w.date).wk++); OS.all('runs').forEach(r => { if (!r.date) return; const a = g(r.date), k = U.num(r.km); a.km += k; a.kmMax = Math.max(a.kmMax, k); }); OS.all('sportlog').forEach(s => s.date && g(s.date).sport++);
  OS.all('meals').forEach(m => m.date && g(m.date).meals++); OS.all('sessions').forEach(s => s.date && (g(s.date).studyMin += U.num(s.minutes))); OS.all('reviews').forEach(r => ['r1At', 'r2At', 'r3At'].forEach(k => r[k] && g(r[k]).revs++));
  try { const lim = U.addDays(today(), -120); if (OS.Diet && OS.Diet.protOk) [...new Set(OS.all('meals').map(m => m.date))].forEach(d => { if (d && d >= lim && OS.Diet.protOk(d)) g(d).prot = 1; }); } catch (e) { }
  OS.all('trees').forEach(t => t.date && t.alive !== false && g(t.date).trees++); OS.all('focusblocks').forEach(f => f.date && (g(f.date).focusMin += U.num(f.minutes))); OS.all('trees').forEach(t => t.date && t.alive !== false && (g(t.date).focusMin += U.num(t.mins)));
  OS.all('notes').forEach(n => n._c && g(U.iso(new Date(n._c))).notes++);
  OS.all('transactions').forEach(t => { if (!t.date) return; const a = g(t.date); a.tx++; if (t.type === 'Despesa' && t.ess === 'Supérfluo') a.sup++; if (t.type === 'Receita') a.inc += U.num(t.amount);
    try { if (t.type === 'Transferência' && OS.Fin.isInvestAcc(t.toAccount) && !OS.Fin.isInvestAcc(t.account)) a.inv += U.num(t.amount); } catch (e) { } });
  OS.all('invtx').forEach(t => { if (t.date && t.type === 'Compra') g(t.date).inv += U.num(t.qty) * U.num(t.price); });
  OS.all('social').forEach(r => { if (!r.date) return; const a = g(r.date); a.social++; if (['Encontro', 'Refeição juntos', 'Celebração', 'Ajudei'].includes(r.kind)) a.meet++; }); OS.all('contacts').forEach(c => c.last && g(c.last).contacts++);
  OS.all('events').forEach(e => { if (e.date && SOCIAL.test(N(e.title))) g(e.date).meet++; });
  OS.all('devos').forEach(d => d.date && g(d.date).devos++); OS.all('prayers').forEach(p => p.date && g(p.date).prayers++);
  OS.all('habits').forEach(h => { if (habA(h.name) !== 'espirito') return; Object.keys(h.log || {}).forEach(d => h.log[d] && g(d).habEsp++); });
  OS.all('tasks').forEach(t => { if (t.status !== 'Feita' || !t.doneAt) return; const a = g(t.doneAt), pj = OS.get('projects', t.project); a.tasks++; if (+t.prio === 1) a.p1++; if ((pj && ['Profissional', 'Empresarial'].includes(pj.type)) || ['Carreira', 'Trabalho', 'Mova'].includes(t.area)) a.proTasks++; });
  OS.all('applications').forEach(a => a.date && a.status !== 'Por enviar' && g(a.date).apps++);
  OS.all('books').forEach(b => { if (b.status === 'Lido' && (b.end || b.start)) g(b.end || b.start).books++; });
  OS.all('assessments').forEach(a => { if (a.date && a.grade !== '' && a.grade != null && U.num(a.grade) >= 14) g(a.date).g14++; });
  Object.entries(byDay).forEach(([d, L]) => { if (L.some(e => /Dia perfeito/.test(e.t))) g(d).perfect = 1; });
  return M; };
const sumAgg = (M, from, to) => { const o = {}; U.range(from, to).forEach(d => { const a = M[d]; if (!a) return; Object.entries(a).forEach(([k, v]) => { o[k] = (o[k] || 0) + v; }); o.txDays = (o.txDays || 0) + (a.tx ? 1 : 0); o.wkDays = (o.wkDays || 0) + (a.wk ? 1 : 0); o.cleanDays = (o.cleanDays || 0) + (a.tx && !a.sup ? 1 : 0); o.invDays = (o.invDays || 0) + (a.inv > 0 ? 1 : 0); }); return o; };
const used = c => OS.all(c).length > 0;
const core = () => OS.all('habits').some(h => h.core && h.active), proUsed = () => OS.all('tasks').some(t => ['Carreira', 'Trabalho', 'Mova'].includes(t.area) || ['Profissional', 'Empresarial'].includes((OS.get('projects', t.project) || {}).type));
// missões do dia: difíceis de propósito. Nada de "regista uma nota": são coisas que custam.
const DQ = [
  ['c1', 'corpo', 'Treina a sério e bate a meta de proteína', a => [(a.wk ? 1 : 0) + (a.prot ? 1 : 0), 2], () => used('meals')],
  ['c2', 'corpo', 'Corre 5 km de uma vez', a => [Math.floor(a.kmMax || 0), 5], () => used('runs')],
  ['c3', 'corpo', 'Dois treinos no mesmo dia (ginásio + corrida ou desporto)', a => [(a.wk ? 1 : 0) + ((a.km || 0) >= 3 || a.sport ? 1 : 0), 2], () => true],
  ['m1', 'mente', '90 minutos de foco profundo', a => [a.focusMin || 0, 90], () => true],
  ['m2', 'mente', 'Planta 3 árvores sem deixar nenhuma morrer', a => [a.trees || 0, 3], () => true],
  ['i1', 'intelecto', 'Estuda 2 horas', a => [a.studyMin || 0, 120], () => true],
  ['i2', 'intelecto', '3 revisões espaçadas e 1 hora de estudo', a => [Math.min(3, a.revs || 0) + ((a.studyMin || 0) >= 60 ? 1 : 0), 4], () => used('reviews')],
  ['f1', 'fortuna', 'Todos os gastos registados e zero supérfluos', a => [a.tx && !a.sup ? 1 : 0, 1], () => true],
  ['f2', 'fortuna', 'Investe ou põe dinheiro de lado hoje', a => [a.inv > 0 ? 1 : 0, 1], () => used('invtx') || OS.all('transactions').some(t => t.type === 'Transferência')],
  ['r1', 'relacoes', 'Estar com alguém de quem gostas (mensagem não conta)', a => [a.meet || 0, 1], () => true],
  ['r2', 'relacoes', 'Fala com 2 pessoas da tua rede profissional', a => [a.contacts || 0, 2], () => used('contacts')],
  ['e1', 'espirito', 'Devocional e oração, os dois', a => [(a.devos ? 1 : 0) + ((a.prayers || 0) + (a.habEsp || 0) ? 1 : 0), 2], () => true],
  ['k1', 'carreira', '3 tarefas de trabalho ou carreira concluídas', a => [a.proTasks || 0, 3], proUsed],
  ['k2', 'carreira', 'Envia uma candidatura a sério', a => [a.apps || 0, 1], () => used('applications')],
  ['d1', 'disciplina', '8 tarefas concluídas, uma delas de prioridade 1', a => [Math.min(7, a.tasks || 0) + (a.p1 ? 1 : 0), 8], () => true],
  ['d2', 'disciplina', 'Dia perfeito: todos os inegociáveis', a => [a.perfect || 0, 1], core]];
const WQ = [
  ['wc', 'corpo', 'Treina 5 dias esta semana', w => [w.wkDays || 0, 5], () => true],
  ['wr', 'corpo', 'Corre 25 km esta semana', w => [Math.floor(w.km || 0), 25], () => used('runs')],
  ['wm', 'mente', '10 horas de foco', w => [w.focusMin || 0, 600], () => true],
  ['wi', 'intelecto', 'Estuda 12 horas', w => [w.studyMin || 0, 720], () => true],
  ['wl', 'intelecto', 'Acaba um livro', w => [w.books || 0, 1], () => used('books')],
  ['wo', 'fortuna', '7 dias com gastos registados e no máximo 1 supérfluo', w => [Math.max(0, Math.min(7, w.txDays || 0) - Math.max(0, (w.sup || 0) - 1)), 7], () => true],
  ['ws', 'relacoes', '4 encontros com pessoas (ao vivo)', w => [w.meet || 0, 4], () => true],
  ['we', 'espirito', '7 devocionais: todos os dias', w => [w.devos || 0, 7], () => true],
  ['wk', 'carreira', '12 tarefas de trabalho ou carreira', w => [w.proTasks || 0, 12], proUsed],
  ['wa', 'carreira', '3 candidaturas enviadas', w => [w.apps || 0, 3], () => used('applications')],
  ['wt', 'disciplina', '40 tarefas concluídas', w => [w.tasks || 0, 40], () => true],
  ['wp', 'disciplina', '5 dias perfeitos', w => [w.perfect || 0, 5], core]];
// campanhas do mês: objetivos reais, do tamanho de um mês inteiro de trabalho
const MQ = [
  ['mc', 'corpo', 'Campanha de Ferro: 20 treinos no mês', m => [m.wkDays || 0, 20], () => true],
  ['mr', 'corpo', 'Estrada: 100 km a correr', m => [Math.floor(m.km || 0), 100], () => used('runs')],
  ['mm', 'mente', 'Mente de Aço: 40 horas de foco', m => [Math.floor((m.focusMin || 0) / 60), 40], () => true],
  ['mi', 'intelecto', 'Erudito: 50 horas de estudo', m => [Math.floor((m.studyMin || 0) / 60), 50], () => true],
  ['ml', 'intelecto', 'Biblioteca: lê 2 livros até ao fim', m => [m.books || 0, 2], () => used('books')],
  ['mg', 'intelecto', 'Nota de mestre: uma avaliação com 14 ou mais', m => [m.g14 || 0, 1], () => used('assessments')],
  ['mf', 'fortuna', 'Cofre: investe pelo menos 10% do que ganhaste', m => [m.inc > 0 && m.inv >= m.inc * .1 ? 1 : 0, 1], () => used('transactions')],
  ['mz', 'fortuna', 'Mês limpo: 25 dias sem supérfluos', m => [m.cleanDays || 0, 25], () => true],
  ['mo', 'relacoes', 'Rede viva: 12 encontros', m => [m.meet || 0, 12], () => true],
  ['me', 'espirito', 'Fiel: 25 devocionais', m => [m.devos || 0, 25], () => true],
  ['mk', 'carreira', 'Caçador de oportunidades: 10 candidaturas', m => [m.apps || 0, 10], () => used('applications')],
  ['mt', 'disciplina', 'Executor: 150 tarefas concluídas', m => [m.tasks || 0, 150], () => true],
  ['mp', 'disciplina', 'Inquebrável: 20 dias perfeitos', m => [m.perfect || 0, 20], core]];
const QX = { d: 900, w: 3500, m: 15000 }, QG = { d: 10, all: 25, w: 40, m: 150 }, LEGXP = 25000;
// as missões de cada dia/semana ficam guardadas (o que se completa depois é verificado pelos teus registos)
const weakest = () => { let lvx = {}; try { const s = CACHE && CACHE.v; lvx = s ? Object.fromEntries(AK.map(k => [k, s.ax[k]])) : {}; } catch (e) { } return AK.slice().sort((a, b) => (lvx[a] || 0) - (lvx[b] || 0)); };
const pick = (pool, n, seed, wk) => { const r = U.rng(seed), out = [], W = wk || weakest(), byA = k => pool.filter(q => q[1] === k && q[4]() && !out.includes(q));
  for (const k of W) { if (out.length >= n - 1) break; const L = byA(k); if (L.length) out.push(L[Math.floor(r() * L.length)]); }
  const rest = pool.filter(q => q[4]() && !out.includes(q) && !out.some(o => o[1] === q[1])); while (out.length < n && rest.length) out.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
  return out.map(q => q[0]); };
D.dailyIds = (d = today()) => { const s = S(); if (!s.q[d]) { s.q[d] = pick(DQ, 3, 'dq' + d); Object.keys(s.q).sort().slice(0, -45).forEach(k => delete s.q[k]); save(); } return s.q[d]; };
D.monthlyIds = (ym = today().slice(0, 7)) => { const s = S(); s.mq = s.mq || {}; if (!s.mq[ym]) { s.mq[ym] = pick(MQ, 3, 'mq' + ym); Object.keys(s.mq).sort().slice(0, -24).forEach(k => delete s.mq[k]); save(); } return s.mq[ym]; };
D.weeklyIds = (w = wkOf(today())) => { const s = S(); if (!s.wq[w]) { s.wq[w] = pick(WQ, 3, 'wq' + w); Object.keys(s.wq).sort().slice(0, -26).forEach(k => delete s.wq[k]); save(); } return s.wq[w]; };
const misHist = agg => { const s = S(), ev = [], done = []; let gold = 0;
  Object.entries(s.q || {}).forEach(([d, ids]) => { let n = 0; (ids || []).forEach(id => { const q = DQ.find(x => x[0] === id); if (!q) return; const [c, t] = q[3](agg[d] || {}); if (c >= t) { n++; ev.push({ d, a: q[1], x: QX.d, t: 'Missão: ' + q[2], m: 1 }); gold += QG.d; done.push({ d, id }); } }); if (n >= 3) gold += QG.all; });
  Object.entries(s.wq || {}).forEach(([w, ids]) => { const end = U.addDays(w, 6) > today() ? today() : U.addDays(w, 6), a = sumAgg(agg, w, end); (ids || []).forEach(id => { const q = WQ.find(x => x[0] === id); if (!q) return; const [c, t] = q[3](a); if (c >= t) { ev.push({ d: end, a: q[1], x: QX.w, t: 'Missão da semana: ' + q[2], m: 1 }); gold += QG.w; done.push({ d: end, id, w: 1 }); } }); });
  Object.entries(s.mq || {}).forEach(([ym, ids]) => { const a0 = ym + '-01', e0 = ym + '-' + U.pad(U.dim(ym)), end = e0 > today() ? today() : e0, a = sumAgg(agg, a0, end); (ids || []).forEach(id => { const q = MQ.find(x => x[0] === id); if (!q) return; const [c, t] = q[3](a); if (c >= t) { ev.push({ d: end, a: q[1], x: QX.m, t: 'Campanha do mês: ' + q[2], m: 1 }); gold += QG.m; done.push({ d: end, id, mo: 1 }); } }); });
  return { ev, gold, n: done.length, done }; };
D.missions = () => { const st = D.state(), T = today(), w = wkOf(T), a = st.agg[T] || {}, wa = sumAgg(st.agg, w, T);
  const dl = D.dailyIds().map(id => { const q = DQ.find(x => x[0] === id); if (!q) return null; const [c, t] = q[3](a); return { id, a: q[1], t: q[2], c: Math.min(c, t), n: t, ok: c >= t, x: QX.d, g: QG.d }; }).filter(Boolean);
  const wl = D.weeklyIds().map(id => { const q = WQ.find(x => x[0] === id); if (!q) return null; const [c, t] = q[3](wa); return { id, a: q[1], t: q[2], c: Math.min(c, t), n: t, ok: c >= t, x: QX.w, g: QG.w }; }).filter(Boolean);
  const ym = T.slice(0, 7), ma = sumAgg(st.agg, ym + '-01', T), ml = D.monthlyIds().map(id => { const q = MQ.find(x => x[0] === id); if (!q) return null; const [c, t] = q[3](ma); return { id, a: q[1], t: q[2], c: Math.min(c, t), n: t, ok: c >= t, x: QX.m, g: QG.m }; }).filter(Boolean);
  return { dl, wl, ml, left: U.diff(U.addDays(w, 7), T), mleft: U.dim(ym) - +T.slice(8, 10) + 1 }; };
// o monstro do dia: as 3 missões de hoje são os 3 golpes que o matam
D.monsterOf = (d = today()) => { const ids = (S().q || {})[d] || D.dailyIds(d), q = DQ.find(x => x[0] === ids[0]), a = q ? q[1] : 'disciplina', L = OS.Monstros ? OS.Monstros.ofA(a) : []; return L.length ? L[U.hash('mo' + d) % L.length] : ''; };
D.kills = () => { const s = S(), st = D.state(), k = {}; st.mis.done.filter(x => !x.w && !x.mo).forEach(x => { k[x.d] = (k[x.d] || 0) + 1; }); const out = {}; Object.entries(k).forEach(([d, n]) => { if (n >= ((s.q || {})[d] || []).length && n >= 3) { const m = D.monsterOf(d); if (m) out[m] = (out[m] || 0) + 1; } }); return out; };

/* ================= CHEFE DA SEMANA ================= */
const BOSS = { corpo: ['Golem da Preguiça', 'Pesa toneladas e alimenta-se de sofá.'], mente: ['Hidra da Distração', 'Cada notificação faz-lhe nascer uma cabeça nova.'], intelecto: ['Sombra da Ignorância', 'Cresce em cada página que não abres.'],
  fortuna: ['Dragão do Desperdício', 'Dorme em cima do teu dinheiro mal gasto.'], relacoes: ['Espectro do Isolamento', 'Afasta-te de quem gostas, um dia de cada vez.'], espirito: ['O Vazio', 'Enche-se quando deixas de alimentar a alma.'],
  carreira: ['Titã da Estagnação', 'Quer que fiques sempre no mesmo sítio.'], disciplina: ['Lorde da Procrastinação', '"Amanhã." Sempre amanhã.'] };
D.bossOf = (w = wkOf(today())) => { const s = S(); if (s.boss[w]) return s.boss[w]; const st = D.state(), prevW = U.addDays(w, -7);
  const xpIn = (k, a, b) => st.all.filter(e => e.a === k && e.d >= a && e.d <= b).reduce((x, e) => x + e.x, 0);
  const usedK = AK.filter(k => st.all.some(e => e.a === k && e.d >= U.addDays(w, -42))), pool = usedK.length >= 3 ? usedK : AK;
  const k = pool.slice().sort((a, b) => xpIn(a, prevW, U.addDays(w, -1)) - xpIn(b, prevW, U.addDays(w, -1)))[0];
  const t = Math.min(3, Object.keys(s.boss).filter(x => x < w && s.boss[x].a === k && s.boss[x].won).length), avg = xpIn(k, U.addDays(w, -28), U.addDays(w, -1)) / 4, hp = Math.max(3000, Math.round((avg * 1.5 + 2500) * (1 + t * .2) / 100) * 100);
  s.boss[w] = { a: k, hp, t }; Object.keys(s.boss).sort().slice(0, -30).forEach(x => delete s.boss[x]); qsave(); return s.boss[w]; };
D.bossFight = (w = wkOf(today())) => { const b = D.bossOf(w), st = D.state(), end = U.addDays(w, 6), L = st.all.filter(e => e.d >= w && e.d <= end && !e.m);
  let dmg = 0; const hits = {}; L.forEach(e => { const v = e.a === b.a ? e.x : e.x * .25; dmg += v; hits[e.a] = (hits[e.a] || 0) + v; });
  dmg = Math.round(dmg); const dead = dmg >= b.hp; if (dead && !b.won) { b.won = 1; }
  const mo = OS.Monstros, mid = mo ? mo.bossOf(b.a) : '', t = b.t | 0; return { w, a: b.a, hp: b.hp, dmg, left: Math.max(0, b.hp - dmg), dead, over: end < today(), hits, t, mid, name: mid ? mo.name(mid, t) : BOSS[b.a][0], lore: mid ? mo.ALL[mid].lore : BOSS[b.a][1] }; };
// o colosso do mês: só cai com o XP de um mês inteiro (todas as áreas contam)
D.colossus = (ym = today().slice(0, 7)) => { const s = S(); s.col = s.col || {}; const st = D.state(), a0 = ym + '-01', e0 = ym + '-' + U.pad(U.dim(ym)), mo = OS.Monstros;
  if (!s.col[ym]) { const prev = [1, 2, 3].map(k => { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 - k, 1), y = U.iso(d).slice(0, 7); return st.all.filter(e => !e.m && e.d.slice(0, 7) === y).reduce((x, e) => x + e.x, 0); }), avg = prev.reduce((x, v) => x + v, 0) / 3;
    s.col[ym] = { hp: Math.max(60000, Math.round(avg * 1.15 / 1000) * 1000), i: (+ym.slice(0, 4) * 12 + +ym.slice(5, 7)) % 12 }; Object.keys(s.col).sort().slice(0, -24).forEach(k => delete s.col[k]); qsave(); }
  const c = s.col[ym], dmg = Math.round(st.all.filter(e => !e.m && e.d >= a0 && e.d <= e0).reduce((x, e) => x + e.x, 0)), mid = mo ? mo.COLOSSI[c.i % mo.COLOSSI.length] : '';
  return { ym, hp: c.hp, dmg, left: Math.max(0, c.hp - dmg), dead: dmg >= c.hp, over: e0 < today(), mid, name: mid ? mo.ALL[mid].n : 'Colosso', lore: mid ? mo.ALL[mid].lore : '' }; };
const colossiWon = () => Object.keys(S().col || {}).filter(ym => { try { return D.colossus(ym).dead; } catch (e) { return false; } });
const bossesWon = () => Object.keys(S().boss || {}).filter(w => { try { return D.bossFight(w).dead; } catch (e) { return false; } });

/* ================= CONQUISTAS ================= */
const counts = st => { const c = {}; const n = (coll, f) => OS.all(coll).filter(f || (() => true)).length;
  c.workouts = n('workouts'); c.km = Math.round(U.sum(OS.all('runs'), r => U.num(r.km))); c.studyH = Math.round(U.sum(OS.all('sessions'), s => U.num(s.minutes)) / 60); c.books = n('books', b => b.status === 'Lido');
  c.trees = n('trees', t => t.alive !== false); c.devos = n('devos'); c.social = n('social') + n('contacts'); c.tasks = n('tasks', t => t.status === 'Feita');
  c.workH = Math.round(U.sum(OS.all('shifts'), s => OS.Car && OS.Car.workedHours ? OS.Car.workedHours(s) : 0)); c.invest = Math.round(U.sum(OS.all('invtx').filter(t => t.type === 'Compra'), t => U.num(t.qty) * U.num(t.price)));
  c.surplus = st.base.filter(e => /^Mês com saldo positivo/.test(e.t)).length; c.txDays = new Set(OS.all('transactions').map(t => t.date)).size; c.classes = st.base.filter(e => /^Aula:/.test(e.t)).length;
  c.best = st.best; c.missions = st.mis.n; c.bosses = bossesWon().length; c.marcos = D.legacyCount(); c.level = st.H.l;
  c.balanced = Math.min(...AK.map(k => st.lv[k].l)); c.adv = OS.all('adventures').filter(a => a.status === 'Feita').length; c.paises = OS.Mundo ? OS.Mundo.stats().n : 0; c.perfect = st.base.filter(e => /^Dia perfeito/.test(e.t)).length;
  c.longRun = Math.max(0, ...OS.all('runs').map(r => U.num(r.km))); c.focusH = Math.round((U.sum(OS.all('focusblocks'), f => U.num(f.minutes)) + U.sum(OS.all('trees').filter(t => t.alive !== false), t => U.num(t.mins))) / 60);
  c.apps = OS.all('applications').filter(a => a.status !== 'Por enviar').length; c.answered = OS.all('prayers').filter(p => p.status === 'Respondida').length; c.colossi = colossiWon().length;
  c.kills = Object.values(D.kills()).reduce((a, v) => a + v, 0); c.campaigns = st.mis.done.filter(x => x.mo).length; c.classes = Object.keys(S().clsSeen || {}).length; return c; };
const ACH = [['treinos', 'Forjado no Ferro', 'treinos', 'workouts', [25, 100, 250, 500, 1000], 'dumbbell'], ['km', 'Pernas de Aço', 'km corridos', 'km', [50, 250, 750, 1500, 3000], 'run'], ['longa', 'Ultra', 'km na corrida mais longa', 'longRun', [10, 21.1, 42.2, 50, 100], 'run'],
  ['estudo', 'Mente Afiada', 'horas de estudo', 'studyH', [25, 150, 500, 1000, 2500], 'book'], ['livros', 'Devorador de Livros', 'livros lidos', 'books', [3, 12, 30, 60, 120], 'book'], ['foco', 'Monge do Foco', 'horas de foco', 'focusH', [25, 150, 500, 1000, 2500], 'brain'],
  ['arvores', 'Guardião da Floresta', 'árvores plantadas', 'trees', [25, 150, 500, 1000, 2500], 'tree'], ['devos', 'Raízes Profundas', 'devocionais', 'devos', [30, 100, 365, 730, 1500], 'sun'], ['oracoes', 'Fé Respondida', 'orações respondidas', 'answered', [1, 5, 15, 40, 100], 'sun'],
  ['social', 'Coração Presente', 'momentos e contactos', 'social', [10, 60, 200, 500, 1000], 'users'], ['tarefas', 'Executor', 'tarefas concluídas', 'tasks', [100, 500, 1500, 4000, 10000], 'check'], ['horas', 'Mãos à Obra', 'horas trabalhadas', 'workH', [100, 500, 1500, 4000, 10000], 'briefcase'],
  ['cand', 'Caçador de Portas', 'candidaturas enviadas', 'apps', [5, 25, 75, 150, 300], 'briefcase'], ['invest', 'Semeador de Fortuna', '€ investidos', 'invest', [1000, 10000, 50000, 150000, 500000], 'trend'], ['meses', 'Cofre Cheio', 'meses com saldo positivo', 'surplus', [3, 12, 24, 48, 96], 'coin'],
  ['caixa', 'Olho no Dinheiro', 'dias com gastos registados', 'txDays', [30, 180, 365, 730, 1500], 'wallet'], ['aulas', 'Presente!', 'aulas assistidas', 'classes', [30, 120, 300, 600, 1000], 'school'], ['sequencia', 'Chama Eterna', 'dias seguidos (melhor sequência)', 'best', [14, 60, 150, 365, 730], 'flame'],
  ['missoes', 'Caçador de Missões', 'missões cumpridas', 'missions', [30, 200, 600, 1500, 4000], 'target'], ['campanhas', 'Senhor da Guerra', 'campanhas do mês', 'campaigns', [1, 6, 15, 30, 60], 'flag'], ['monstros', 'Exterminador', 'monstros do dia mortos', 'kills', [10, 60, 200, 500, 1000], 'sword'],
  ['chefes', 'Matador de Chefes', 'chefes derrotados', 'bosses', [3, 15, 50, 100, 200], 'sword'], ['colossos', 'Mata-Colossos', 'colossos do mês derrubados', 'colossi', [1, 4, 12, 24, 48], 'sword'], ['marcos', 'Lenda do Codex', 'marcos do Codex', 'marcos', [3, 15, 40, 100, 250], 'crown'],
  ['nivel', 'Ascensão', 'nível do herói', 'level', [10, 30, 60, 100, 200], 'star'], ['equilibrio', 'Vida Equilibrada', 'nível do atributo mais fraco', 'balanced', [5, 10, 20, 35, 50], 'scale'], ['classes', 'Mil Caras', 'classes diferentes', 'classes', [2, 5, 10, 20, 30], 'user'],
  ['perfeitos', 'Dia Perfeito', 'dias perfeitos', 'perfect', [10, 50, 150, 365, 730], 'shield'], ['aventuras', 'Aventureiro', 'aventuras feitas', 'adv', [2, 8, 20, 40, 75], 'mountain'], ['mundo', 'Volta ao Mundo', 'países conhecidos', 'paises', [5, 15, 35, 70, 120], 'globe']];
const TIERN = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'], TIERG = [20, 60, 150, 300, 600], TIERC = ['#CD7F32', '#C0C7D0', '#E8C26A', '#9FE8E0', '#B9D7FF'];
D.achievements = () => { const st = D.state(), c = counts(st); return ACH.map(([id, n, u, key, th, ic]) => { const v = c[key] || 0, t = th.filter(x => v >= x).length; return { id, n, u, v, th, t, ic, next: th[t] || null }; }); };
const goldOf = st => { const c = counts(st); let g = st.mis.gold + st.H.l * 25; ACH.forEach(([, , , key, th]) => { const v = c[key] || 0; th.forEach((x, i) => { if (v >= x) g += TIERG[i]; }); }); g += bossesWon().length * 100 + colossiWon().length * 500; const spent = (S().owned || []).reduce((a, id) => a + ((SHOP.find(i => i.id === id) || {}).p || 0), 0); return Math.max(0, g - spent); };

/* ================= CODEX (os teus marcos por pilar: o Notion original atualizado com o Dominus 2.0) =================
   A lista é tua: podes tirar marcos que já não fazem sentido e acrescentar novos. Cada marco feito guarda o texto e o dia. */
const LEG0 = {"int":["Passar a Introdução à Contabilidade com nota ≥ 14","Passar a Informática Organizacional com nota ≥ 14","Excel intermédio (tabelas dinâmicas, PROCV/XLOOKUP)","Rotina de estudo de 90 dias sem falhar 2 dias seguidos","Inglês B2 certificado","Ler 12 livros num ano","Fechar o 1.º ano sem nenhuma cadeira em atraso","Iniciar Python para análise de dados","Publicar 15 textos/análises online","Média do ano ≥ 15","Estruturar rotina inegociável (sono, treino, foco profundo)","Consolidar o controlo da ansiedade (sistema anti-burnout)","Criar portfólio intelectual online","Contabilidade Financeira 1 e 2 com nota ≥ 15","Dominar Estatística e Métodos Quantitativos","Fundamentos de Macroeconomia acima da média","Excel avançado (modelos financeiros, Power Query)","Power BI aplicado (Business Intelligence)","Ler 25 livros num ano","Publicar 40 textos analíticos","Concluir um curso de finanças online com certificado","Dominar renda fixa e macro aplicada","Projeto completo em Python com dados reais","Inglês C1","Construir networking académico estratégico (professores e investigadores)","Estágio em contabilidade, auditoria ou finanças","Dominar Fiscalidade e Direito Fiscal portugueses","Dominar Análise Financeira e Finanças Empresariais","Ler Macroeconomics integralmente","Estudar profundamente política monetária","Publicar artigo técnico estruturado","Concluir a licenciatura no ISCA-UA com média ≥ 15","Inscrever-se na Ordem dos Contabilistas Certificados (estágio OCC)","Passar no exame da OCC (Contabilista Certificado)","Dominar econometria básica","Publicar 80 textos autorais","Iniciar mestrado competitivo (Finanças ou Economia)","Publicar artigo académico nacional","Iniciar o estudo de espanhol","Trabalhar em área macro, financeira ou institucional","Publicar 120 textos analíticos","Espanhol intermédio","Concluir o mestrado com destaque","Publicar o primeiro livro técnico","Iniciar doutoramento estratégico","Publicar artigo internacional","Inglês C2","Atuar num órgão estratégico (Banco de Portugal, BCE ou Banco Central)","Espanhol fluente","Publicar investigação original relevante","Iniciar o estudo de francês","Concluir o doutoramento com tese relevante","Tornar-se professor universitário","Publicar segundo livro (macro estratégica)","Tornar-se referência nacional emergente","Francês intermédio","Influenciar decisões técnicas institucionais","Iniciar estudo estruturado de mandarim","Criar núcleo de investigação próprio","Professor de destaque numa grande universidade","Publicar obra de impacto nacional","Mandarim intermédio funcional","Participar na formulação de políticas públicas","Criar think tank formal","Tornar-se conselheiro económico estratégico","Publicar obra traduzida internacionalmente","Orientar doutorandos de excelência","Expandir o think tank internacionalmente","Iniciar estudo formal de Libras (ou Língua Gestual Portuguesa)","Tornar-se referência continental","Libras para comunicação funcional","Assumir cargo institucional de alto impacto","Influenciar reformas estruturais","Estruturar fundo patrimonial educacional","Consolidar escola própria de pensamento económico","Publicar a obra-síntese do teu pensamento","Estruturar o projeto de universidade própria","Reunir corpo docente de elite","Criar modelo académico inovador","Formalizar a fundação da universidade","Universidade reconhecida nacionalmente","Centro avançado de investigação macroeconómica","Programa de formação de líderes públicos","Universidade financeiramente autossustentável","Reconhecimento internacional da universidade","Formar sucessores intelectuais","Obras adotadas como referência académica","Escola intelectual consolidada","Influência estrutural permanente no país","Legado académico consolidado","Instituições a funcionar sem depender de ti","Produzir a obra final definitiva","Mentorar jovens líderes estratégicos","Influência contínua em políticas públicas","Universidade expandida internacionalmente","Apresentar trabalho académico numa conferência","Ser convidado para júri ou banca académica","Biblioteca pessoal de 1.000 livros","Nome consolidado como arquiteto de sistemas económicos","Legado intelectual e institucional além da tua geração"],"for":["Orçamento mensal feito e seguido por 3 meses","Cortar 20–30% dos gastos supérfluos","Fundo de emergência de € 1.000","Poupar automaticamente 20% de tudo o que entra","Conseguir fonte de renda (trabalho ou serviço próprio)","Primeiro cliente pago do serviço","Abrir atividade nas Finanças e emitir o 1.º recibo","Abrir conta numa corretora","Investir os primeiros € 500 (ex.: ETF/Certificados de Aforro)","Fundo de emergência de 3 meses de despesas","Património investido de € 5.000","Iniciar estudos para certificação financeira","Obter a primeira certificação financeira","Investir os primeiros € 1.000","Iniciar aportes mensais regulares","Iniciar estudos para certificação avançada","Estágio em banco/corretora","Investir em ações e fundos imobiliários","Atingir património investido de € 10.000","Criar portfólio diversificado inicial","Reinvestir todos os dividendos","Construir reserva de emergência de 6 meses","Aumentar aportes mensais","Atingir património líquido de € 25.000","Obter certificação avançada","Estudar valuation e análise de balanços","Investir 10.000 adicionais em ações","Atingir património líquido de € 50.000","Expandir investimentos para ETFs internacionais","Criar fundo de oportunidades","Aumentar aportes para 2.000/mês","Atingir património de € 75.000","Iniciar preparação para CFA Level I","Construir portfólio internacional de 20.000","Criar fundo seed money para empresa","Atingir património de € 100.000","Criar plano estratégico formal da Crumbel Royal","Realizar estudo de viabilidade","Validar modelo de negócio","Definir proposta de valor","Estruturar plano financeiro da empresa","Definir modelo societário","Registar a empresa","Obter número fiscal da empresa","Abrir conta bancária empresarial","Separar finanças pessoais e empresariais","Criar contrato social estruturado","Definir capital social inicial","Estruturar contabilidade e regime tributário","Criar marca, identidade visual e posicionamento","Lançar oficialmente a Crumbel Royal","Alcançar faturamento mensal de 10.000","Gerar lucro mensal de 3.000","Reinvestir 50–70% do lucro","Criar KPIs e indicadores de desempenho","Contratar primeiro colaborador estratégico","Criar processo operacional padronizado","Criar fundo de expansão","Atingir património pessoal de € 250.000","Expandir portfólio para 200.000 investidos","Construir fluxo de caixa passivo de 2.000/mês","Concluir CFA Level I","Atingir património de € 500.000","Expandir empresa para outro mercado","Faturamento anual > 500.000","Lucro anual > 150.000","Criar holding patrimonial","Separar ativos pessoais na holding","Investir 200.000 em ETFs e fundos imobiliários","Criar fundo de aquisições","Atingir património líquido de € 1.000.000","Fluxo de caixa passivo de 10.000/mês","Faturamento anual da empresa > 1.000.000","Lucro anual > 300.000","Investir em startups","Expandir equipa executiva","Criar conselho consultivo","Expandir para novos produtos/serviços","Património líquido de € 2.500.000","Investimentos internacionais > 500.000","Fluxo de caixa passivo total de 25.000/mês","Expandir Crumbel Royal internacionalmente","Faturamento anual > 5.000.000","Lucro anual > 1.500.000","Património líquido > € 5.000.000","Comprar fazenda estratégica","Estruturar equipa agrícola","Implementar produção rentável","Gerar renda da fazenda de 10.000/mês","Integrar fazenda à holding","Fluxo de caixa passivo total > 50.000/mês","Património líquido > € 20.000.000","Faturamento empresa > 10.000.000/ano","Lucro > 3.000.000/ano","Criar fundo próprio de investimentos","Investir em private equity global","Estruturar fundo fiduciário familiar","Fluxo de caixa passivo > 500.000/mês","Património líquido > € 100.000.000","Tornar-se bilionário, com empresa global, fazenda lucrativa e fundo patrimonial intergeracional"],"cor":["Dormir 7h30–8h por 90 dias seguidos","Acordar à mesma hora por 60 dias","Check-up completo no Centro de Saúde","Treinar 4x/semana durante 3 meses","80% de alimentação limpa por 90 dias","Correr 5 km < 25 min","Correr 5 km < 22 min","Postura corrigida (core + lombar fortes)","Ganhar 3 kg de massa magra","1 prova oficial de 10 km","Vitamina D entre 40–60 ng/mL","Testosterona total > 600 ng/dL","Glicemia de jejum < 90 mg/dL","PCR < 1.0 mg/L","Pressão arterial < 12×8","FC de repouso < 60 bpm","Atualizar grau da visão e manter acuidade 100%","Reduzir tempo de ecrã noturno < 1h/dia por 60 dias","Exercícios visuais 5×/semana","Avaliar escoliose/hipercifose","Consultar alergologista; melhorar nariz e visão","Reduzir crises alérgicas em 80%","Beber 35 ml/kg de água por dia","Manter exames ideais por 6 meses","Reduzir gordura corporal para 15%","Reduzir gordura corporal para 12%","Manter 12–14% por 12 meses","Ganhar 4–5 kg de massa magra","Ombros +15 cm da cintura","Abdómen visível contraído","Abdómen parcialmente visível relaxado","Manter peso estável por 6 meses","Fotos comparativas anuais","Pele saudável, rotina de skincare","Ajuste da estética dental","Presença corporal confiante","Energia estável diariamente","Correr 5 km < 20 min","Correr 10 km < 45 min","VO2max > 55 ml/kg/min","Correr 15 km contínuos","Meia maratona (21 km)","Meia maratona < 1h40","Recuperar FC < 120 bpm em 2 min pós-esforço","1 ano de corrida sem lesão","FC de repouso < 55 bpm","Correr 25 km contínuos","Correr 30 km contínuos","Volume semanal de 50 km sustentado","Completar maratona (42,2 km)","Escolher um desporto olímpico (voleibol)","Iniciar treino técnico formal","Aprender fundamentos: passe, saque, ataque","Treinar 3×/semana com equipa local","Melhorar salto vertical > 50 cm","Treinar resistência específica 2×/semana","Jogar 10 partidas amistosas","Participar em campeonatos regionais","Ser selecionado para equipa regional","Tempo de reação e agilidade < 0,3 s","Treinar estratégia tática semanalmente","Ser convocado para competição nacional","Participar em seleção de pré-olímpico","Ser medalhista nacional","Participar nos Jogos Olímpicos","Aprender 3 estilos de natação e surfar","Nadar 1 km contínuo","Nadar 2 km contínuos","Nadar 3 km contínuos","Travessia de 2 km em águas abertas","Pedalar 40 km contínuos","Pedalar 80 km contínuos","Pedalar 120 km contínuos","Pedalar 150 km contínuos","Integrar pedal + corrida no mesmo treino","Triathlon sprint","Triathlon olímpico","Meio Ironman (70.3)","70.3 abaixo de 6 h","Treino simulado > 6 h","Ajuste de composição corporal","Controlo de hidratação e nutrição","Recuperar totalmente em 21 dias","Completar Ironman oficial","Ironman < 12 h","Idade biológica 5 anos abaixo da cronológica","Manter gordura corporal 10–12% sustentável","Manter massa muscular após os 40","Manter VO2max acima da média após os 40","Manter densidade óssea alta","Chegar aos 40 a correr 10 km < 45 min","Chegar aos 50 a correr 5 km < 25 min","Chegar aos 60 independente fisicamente","Chegar aos 70 a caminhar 5 km sem limitação","Mobilidade completa após os 60","Memória e cognição elevadas","Exames clínicos ideais por 10 anos seguidos","Sem doenças metabólicas","Prática desportiva ativa até idade avançada","Viver o máximo possível com autonomia, força, energia e lucidez"],"inf":["5 contactos estratégicos em Aveiro","LinkedIn completo (foto, resumo, conquistas)","Entrar numa associação/núcleo de estudantes do ISCA-UA","1 evento de networking por mês durante 3 meses","Falar com 3 professores fora da aula","30 dias a ouvir sem interromper","Apresentação pessoal de 5 min treinada e gravada","10 recomendações/endossos no LinkedIn","Criar grupo de estudo","Apresentar um projeto para 20+ pessoas","Conectar-se com 10 pessoas novas num mês","Publicar 1 post de valor no LinkedIn","Obter feedback positivo de 2 colegas sobre comunicação","Rotina de follow-up semanal com 5 contactos","Mapear 20 pessoas influentes na tua cidade","Participar em 1 grupo online de interesse profissional","Falar em público para grupos de 10 pessoas com confiança","Um reconhecimento genuíno por dia durante 30 dias","Dominar técnicas básicas de persuasão (rapport, espelhamento)","Analisar 5 líderes e documentar padrões","Criar identidade pessoal clara (propósito + valores)","Conectar-se com 2 pessoas de empresas ou instituições desejadas","Ter 50 contactos estratégicos ativos","Fazer 5 colaborações pequenas","Participar em 3 eventos universitários ou de negócios","Realizar 5 apresentações formais de 10 minutos","Obter 5 recomendações de mentores ou professores","Criar mailing list com 50 contactos estratégicos","Conectar-se com 5 alumni de universidades de interesse","Publicar conteúdo de valor 2× por semana","Manter contacto com 20 pessoas-chave semanalmente","Participar em 2 debates académicos","Participar em 2 projetos colaborativos com impacto visível","Mentorar 2 colegas informalmente","Ser recomendado publicamente por 3 pessoas-chave","Obter feedback estruturado sobre comunicação e presença","Participar em 3 reuniões estratégicas com líderes locais","Mini-projeto com +30 pessoas impactadas","Melhorar persuasão e negociação com 10 exercícios práticos","Conectar-se com 10 contactos estratégicos de empresas ou bancos","Ter 100 contactos estratégicos ativos","Ser convidado a palestrar num evento universitário ou de startups","Criar workshop próprio com 20–50 participantes","Publicar 1 artigo educativo por mês","Participar em 2 competições académicas ou empresariais","+5 recomendações públicas no LinkedIn","Ser referência numa comunidade local","Mailing list com 100 contactos","Mentorar formalmente 3–5 pessoas","Dar 1 palestra formal para 50+ pessoas","Participar em 3 projetos colaborativos de impacto nacional","Criar parceria estratégica entre 2 organizações","Ser citado ou recomendado por um líder nacional","Liderar projeto com +50 pessoas impactadas","Participar em 5 conferências nacionais","Rotina de conexão semanal com 20–30 líderes","Ser reconhecido como solucionador de problemas na rede","Publicar artigo com >1.000 visualizações","+10 recomendações públicas de líderes","Convite para evento internacional de networking","Ter 250 contactos estratégicos ativos em 2 países","Participar em conferência internacional","Ser palestrante em painel internacional com 100+ pessoas","5 mentorias formais de especialistas internacionais","Mentorar 5–10 pessoas de outros países","Conteúdo com alcance internacional (5.000+ visualizações)","Projeto colaborativo internacional (10–50 pessoas)","Reconhecimento público de uma autoridade global","Convite para podcast internacional","Rede de mastermind global de 20–50 líderes","Participar em reuniões estratégicas de alto impacto","+20 recomendações públicas de líderes internacionais","Influenciar decisões em projetos internacionais","Programa de mentorias internacional estruturado","Ter +500 contactos estratégicos ativos","Ser referência num fórum global da tua área","Colaboração internacional com +100 pessoas impactadas","Conteúdo com engajamento global (>10.000 visualizações)","Menção numa publicação internacional","Convite para aconselhar organizações globais","Liderar projeto de grande impacto com 50–100 pessoas","Ter +1.000 contactos estratégicos ativos","Mentorar 10–20 líderes emergentes","Ser citado em media especializada global","Programa de networking/mentoria para jovens talentos","3–5 colaborações estratégicas internacionais","Conselheiro de uma organização de relevância global","+50 recomendações públicas","Influenciar decisões estratégicas de empresas, governos ou ONG","Metodologia própria reconhecida internacionalmente","Referência consolidada em fóruns internacionais","Rede de mentores em 3 continentes","Impacto mensurável em +500 pessoas","Palestrante num evento global de +1.000 pessoas","Publicar livro de referência na tua área","Rede global envolvida em projetos estratégicos","Ser citado por autoridades globais como referência","Legado institucional ligado à tua autoridade","Influenciar políticas de alto impacto","Deixar um legado global de influência que dure décadas"],"esp":["Oração da manhã 7 dias seguidos","Ler 1 capítulo da Bíblia por dia durante 7 dias","3 gratidões escritas por dia durante 7 dias","1 hora sem telemóvel (silêncio) 7 dias seguidos","Oração da manhã 30 dias seguidos","30 dias de gratidão seguidos","Ler um livro bíblico inteiro","Ler os 4 Evangelhos","Encontrar uma igreja em Aveiro e ir com regularidade","Oração de manhã e à noite durante 30 dias","Memorizar 10 versículos","Ler Provérbios inteiro (um capítulo por dia)","Ler os Salmos inteiros","Primeiro jejum de um dia com propósito","Concluir um plano de leitura de 90 dias","Devocional diário durante 60 dias","Ler o Novo Testamento completo","Diário espiritual com 100 reflexões escritas","Participar num grupo de estudo bíblico","Servir num ministério ou voluntariado da igreja","Ajudar alguém em necessidade sem que ninguém saiba","Ofertar ou dizimar com regularidade durante 6 meses","Ler 3 clássicos cristãos (C. S. Lewis, Tozer, Bonhoeffer…)","Retiro espiritual de um fim de semana","Memorizar 30 versículos","Oração e leitura diárias durante 100 dias seguidos","Perdoar alguém de quem guardavas mágoa","Pedir perdão a alguém que magoaste","Ler a Bíblia inteira","Jejum de 3 dias","Partilhar a tua fé com um amigo","Levar alguém à igreja","Domingo de descanso sem ecrãs durante 3 meses","Ler os livros de sabedoria (Jó, Salmos, Provérbios, Eclesiastes)","365 dias de gratidão escrita","Estudar Romanos em profundidade","Fazer um curso de teologia básica","Liderar um grupo de estudo bíblico","Ser mentor de alguém mais novo na fé","Ler a Bíblia inteira pela segunda vez","Uma semana de missão ou voluntariado","Doar 10% do rendimento durante um ano inteiro","Memorizar 100 versículos","Escrever o teu testemunho de fé","Partilhar o testemunho em público","Oração diária durante 365 dias","Ler 12 livros cristãos num ano","Estudar a história da Igreja","Visitar a Terra Santa","Ler a Bíblia inteira noutra língua","Fazer uma mensagem ou pregação num culto ou grupo","Discipular 3 pessoas","Servir com regularidade durante 3 anos","Criar um projeto social ligado à fé","Apoiar um missionário com regularidade","Curso de teologia avançado","Escrever um devocional de 30 dias","Publicar o devocional","Ler a Bíblia inteira 3 vezes","Construir uma família com a fé no centro","Culto ou oração em família todas as semanas","Ensinar a fé à geração seguinte","Doar 15% do rendimento","Financiar uma igreja ou escola num lugar carente","Liderar uma missão internacional","Criar bolsas de estudo para jovens carentes","Ética inegociável em todos os negócios","Ser conhecido como homem de palavra","Mentorar 10 jovens líderes cristãos","Escrever um livro sobre fé e disciplina","Criar uma fundação filantrópica com propósito cristão","Programa de apoio a imigrantes recém-chegados","Ler as Confissões de Santo Agostinho","Caminho de Santiago (ou peregrinação) em oração","Oração e leitura diárias durante 5 anos","Doar 20% do rendimento","Apoiar 10 missionários","Construir uma escola ou centro comunitário","Família com tradição de fé consolidada","Ler a Bíblia inteira 5 vezes","Ensinar ética e fé num curso","Fundação a financiar 100 bolsas","Impacto social mensurável em +1.000 pessoas","Discipulado em 3 países","Valores cristãos no centro da universidade própria","Livro de fé publicado e traduzido","Fé que atravessa crises sem ruir","Paz interior estável em qualquer circunstância","Ler a Bíblia inteira 10 vezes","Legado de generosidade na família","Obras de caridade a funcionar sem ti","Mentor espiritual de líderes","Fundo perpétuo de missões","Ser lembrado pela bondade, não pela riqueza","Viver de acordo com o que acreditas, todos os dias","Os teus filhos e netos a caminhar na fé","Uma vida de oração até ao fim","Combater o bom combate e guardar a fé (2 Tm 4:7)","Deixar um legado espiritual que dure gerações","Ouvir \"Muito bem, servo bom e fiel\""]};
// numa conta (versão pública) ficam os marcos gerais: saem os que são só do Ryan (faculdade, OCC, empresa, Aveiro, voleibol, fazenda, think tank…)
const PUBX = /ISCA|OCC|Contabilist|Aveiro|Crumbel|Banco de Portugal|BCE|Testosterona|escoliose|hipercifose|voleibol|alergolog|alérgic|Introdução à Contabilidade|Informática Organizacional|Contabilidade Financeira|Macroecon|macroecon|económic|macro aplicada|área macro|macro estratégica|Fiscalidade|política monetária|políticas públicas|reformas estruturais|think tank|universidade própria|corpo docente|da universidade|Universidade (reconhecida|financeiramente|expandida)|escola própria de pensamento|Escola intelectual|arquiteto de sistemas|doutorandos|Centro avançado|líderes públicos|Libras|Centro de Saúde|estética dental|PCR <|Vitamina D|Glicemia|campeonatos regionais|equipa regional|desporto olímpico|olímpic|Olímpic|medalhista|convocado|tática|Tempo de reação|fundamentos: passe|salto vertical|partidas amistosas|treino técnico formal|equipa local|Ombros \+15|grau da visão|Exercícios visuais|nariz|CFA|seed money|empresa|societário|contrato social|capital social|Lançar oficialmente|colaborador estratégico|regime tributário|número fiscal|viabilidade|modelo de negócio|proposta de valor|marca, identidade|processo operacional|fundo de expansão|fazenda|agrícola|Abrir atividade nas Finanças|Terra Santa|Evangelhos|Bíblia|bíblic|igreja|Igreja|versículo|testemunho|teolog|ministério|dizim|Culto|culto|pregação|missionári|missões|Discipul|discipul|C\. S\. Lewis|Romanos|Provérbios|Salmos|cristão|Jó|jejum|Jejum|missão|devocional|Devocional|Santo Agostinho|servo bom|Novo Testamento|imigrantes/;
const PUBR = [[/ \(ex\.: ETF\/Certificados de Aforro\)/, ' (ex.: ETF)'], [/homem de palavra/, 'pessoa de palavra'], [/ \(Finanças ou Economia\)/, ''], [/ em contabilidade, auditoria ou finanças/, ' na tua área']];
const LEG = OS.Acc && OS.Acc.pub ? Object.fromEntries(Object.entries(LEG0).map(([k, v]) => [k, v.filter(t => !PUBX.test(t)).map(t => PUBR.reduce((x, [a, b]) => x.replace(a, b), t))])) : LEG0;
const LEGA = { int: 'intelecto', for: 'fortuna', cor: 'corpo', inf: 'relacoes', esp: 'espirito' }, LEGN = { int: 'Intelecto', for: 'Fortuna', cor: 'Corpo', inf: 'Influência', esp: 'Espírito' };
D.LEG = LEG; D.PK = Object.keys(LEG); D.LEGN = LEGN;
const legx = () => { const s = S(); if (!s.legx || typeof s.legx !== 'object') s.legx = {}; s.legx.add = s.legx.add || {}; s.legx.off = s.legx.off || {}; return s.legx; };
const legList = p => { const x = legx(), off = new Set(x.off[p] || []), out = (LEG[p] || []).filter(t => !off.has(t));
  (x.add[p] || []).forEach(a => { const j = a.at === '^' ? 0 : a.at && out.includes(a.at) ? out.indexOf(a.at) + 1 : out.length; out.splice(j, 0, a.t); }); return out; };
D.legList = legList;
const legDone = p => (S().legacy[p] || []).filter(m => m && m.t);
const isDone = (p, t) => legDone(p).some(m => m.t === t);
D.legacyCount = () => D.PK.reduce((a, p) => a + legDone(p).length, 0);
D.nextLegacy = () => D.PK.map(p => { const L = legList(p), i = L.findIndex(t => !isDone(p, t)); return i >= 0 ? { pillar: LEGN[p], n: i + 1, t: L[i] } : null; }).filter(Boolean);
// marcos que se provam sozinhos pelos teus registos (o resto pede a prova por escrito)
const yearMax = (L, f) => { const by = {}; L.forEach(x => { const y = String(f(x) || '').slice(0, 4); if (y) by[y] = (by[y] || 0) + 1; }); return Math.max(0, ...Object.values(by)); };
const AUTO = [
  [/ler (\d+) livros num ano/i, m => [yearMax(OS.all('books').filter(b => b.status === 'Lido'), b => b.end || b.start), +m[1], 'livros num ano']],
  [/ler (\d+) livros/i, m => [OS.all('books').filter(b => b.status === 'Lido').length, +m[1], 'livros lidos']],
  [/meia[- ]maratona/i, () => [Math.max(0, ...OS.all('runs').map(r => U.num(r.km))), 21.1, 'km de uma vez']],
  [/maratona/i, () => [Math.max(0, ...OS.all('runs').map(r => U.num(r.km))), 42.2, 'km de uma vez']],
  [/correr (\d+) ?km/i, m => [Math.max(0, ...OS.all('runs').map(r => U.num(r.km))), +m[1], 'km de uma vez']],
  [/m[ée]dia (?:do ano |geral )?(?:≥|>=|de|acima de) ?(\d+)/i, m => { const G = OS.all('assessments').filter(a => a.grade !== '' && a.grade != null).map(a => U.num(a.grade)); return [G.length >= 3 ? Math.round(U.sum(G, x => x) / G.length * 10) / 10 : 0, +m[1], 'de média (3 notas ou mais)']; }],
  [/(\d+) pa[íi]ses/i, m => [OS.Mundo ? OS.Mundo.stats().n : 0, +m[1], 'países']],
  [/^(?!.*sem falhar)(?:.*\D)?(\d+) dias seguidos/i, m => [D.state().best, +m[1], 'dias seguidos']]];
const autoLeg = t => { for (const [re, f] of AUTO) { const m = String(t).match(re); if (m) { try { const [c, n, u] = f(m); return { c, n, u, ok: c >= n }; } catch (e) { return null; } } } return null; };
D.autoLeg = autoLeg;
const legMark = (p, t, proof, d) => { const s = S(); s.legacy[p] = (s.legacy[p] || []).filter(m => m && m.t); if (s.legacy[p].some(m => m.t === t)) return; s.legacy[p].push({ t, d: d || today(), proof }); save(); UI.toast(`Marco conquistado: +${U.nf(LEGXP)} XP em ${AO[LEGA[p]].n}`, 'pos'); };
A.d3Leg = b => { const s = S(), p = b.dataset.p, t = b.dataset.t; if (!LEG[p] || !t) return; s.legacy[p] = (s.legacy[p] || []).filter(m => m && m.t); const i = s.legacy[p].findIndex(m => m.t === t);
  if (i >= 0) { UI.ask('Desmarcar este marco?', `"${esc(t)}" volta a estar por fazer e perdes os ${U.nf(LEGXP)} XP.`, 'Desmarcar', () => { s.legacy[p].splice(i, 1); save(); OS.request(); }); return; }
  const au = autoLeg(t); if (au) { if (au.ok) legMark(p, t, `Verificado pelos teus registos: ${U.nf(au.c)} ${au.u}`); else UI.toast(`Ainda não: ${U.nf(au.c)}/${U.nf(au.n)} ${au.u}. Este marco prova-se sozinho pelos teus registos.`, 'warn'); return; }
  UI.modal(`<form class="d3-proof" data-form="d3LegProof" data-p="${esc(p)}" data-t="${esc(t)}"><div class="cz d3-k">Provar um marco · ${esc(LEGN[p])}</div><h3>${esc(t)}</h3>
    <p class="dm">Um marco é uma conquista real e difícil. Escreve a prova: o certificado, a nota na pauta, o valor, o sítio, quem estava lá. Sem prova não conta.</p>
    <label class="d3-pl"><span>A prova</span><textarea class="field" name="proof" rows="3" required minlength="15" placeholder="Ex.: Certificado Cambridge B2 First, 176 pontos, recebido a 12 de junho"></textarea></label>
    <label class="d3-pl"><span>Quando foi</span><input class="field" type="date" name="d" value="${today()}" max="${today()}" required></label>
    <div class="d3-pa"><button type="button" class="dbtn sm" data-mclose>Ainda não</button><button class="dbtn gold">Conquistei (+${U.nf(LEGXP)} XP)</button></div></form>`); };
OS.forms.d3LegProof = (f, v) => { const p = f.dataset.p, t = f.dataset.t, proof = v('proof').replace(/\s+/g, ' ').trim(); if (!LEG[p] || !t) return;
  if (proof.length < 15) { UI.toast('Escreve uma prova a sério (15 letras ou mais).', 'warn'); return false; } legMark(p, t, proof.slice(0, 400), v('d') || today()); UI.closeModal(); };
A.d3LegTab = b => OS.setUI('d3Leg', b.dataset.p);
A.d3LegOff = b => { const p = b.dataset.p, t = b.dataset.t, x = legx(); if (!LEG[p] || !t) return;
  UI.ask('Tirar este marco?', `"${esc(t)}" sai da tua lista de ${LEGN[p]}. Podes repô-lo depois.`, 'Tirar', () => { const own = (x.add[p] || []).findIndex(a => a.t === t);
    if (own >= 0) x.add[p].splice(own, 1); else x.off[p] = (x.off[p] || []).concat(t); const s = S(); s.legacy[p] = (s.legacy[p] || []).filter(m => m.t !== t); save(); OS.request(); }); };
A.d3LegReset = b => { const p = b.dataset.p, x = legx(); x.off[p] = []; save(); UI.toast('Marcos repostos', 'pos'); };
OS.forms.d3LegAdd = (f, v) => { const p = f.dataset.p, t = v('t').replace(/\s+/g, ' ').slice(0, 160), where = v('where'), x = legx(); if (!LEG[p] || t.length < 3) return;
  if (legList(p).some(y => y.toLowerCase() === t.toLowerCase())) { UI.toast('Esse marco já está na lista', 'warn'); return; }
  const L = legList(p), first = L.findIndex(y => !isDone(p, y)), at = where === 'next' ? (first > 0 ? L[first - 1] : '^') : '';
  x.add[p] = (x.add[p] || []).concat({ t, at }); save(); UI.toast('Marco acrescentado', 'pos'); };

/* ================= RECOMPENSAS REAIS (baús a cada nível) ================= */
OS.S.rewards = { label: 'Recompensa', title: r => r.title, fields: [{ k: 'title', l: 'Recompensa', t: 'text', req: 1, ph: 'Ex.: comprar aquele livro, jantar fora, tarde livre' }, { k: 'desc', l: 'Descrição', t: 'area', rows: 2 }, { k: 'tier', l: 'Raridade', t: 'sel', o: ['Comum', 'Rara', 'Épica', 'Lendária'] }], defaults: () => ({ tier: 'Comum' }) };
const DEFR = [['Um café especial no teu sítio favorito', 'Comum'], ['Uma tarde livre, sem culpa', 'Comum'], ['Um filme ou série à tua escolha', 'Comum'], ['Uma sobremesa de que gostes muito', 'Comum'], ['Comprar um livro que queres', 'Rara'], ['Jantar fora', 'Rara'],
  ['Uma saída com os amigos por tua conta', 'Rara'], ['Algo novo para o treino', 'Rara'], ['Um dia inteiro de descanso total', 'Épica'], ['Uma peça de roupa que queres há tempo', 'Épica'], ['Uma experiência nova (escape room, kart, concerto)', 'Épica'], ['Uma pequena viagem de fim de semana', 'Lendária']];
const chestTier = l => l % 10 === 0 ? 'Lendária' : l % 5 === 0 ? 'Épica' : l % 2 === 0 ? 'Rara' : 'Comum';
const TR = { Comum: 0, Rara: 1, 'Épica': 2, 'Lendária': 3 };
D.chests = () => { const st = D.state(), s = S(); return Math.max(0, st.H.l - (s.opened || 0)); };
const chestOpts = lv => { const tier = chestTier(lv), mine = OS.all('rewards').map(r => [r.title, r.tier || 'Comum', r.id]), pool = (mine.length >= 2 ? mine : mine.concat(DEFR)).filter(r => TR[r[1]] <= TR[tier]);
  const r = U.rng('chest' + lv + (S().born || '')), out = []; const P = pool.slice().sort((a, b) => TR[b[1]] - TR[a[1]]); while (out.length < 2 && P.length) { const top = P.filter(x => TR[x[1]] === TR[P[0][1]]); const c = top.length && r() < .6 ? top : P; const x = c[Math.floor(r() * c.length)]; out.push(x); P.splice(P.indexOf(x), 1); } return { tier, out }; };
A.d3Open = b => { const s = S(), lv = (s.opened || 0) + 1, o = chestOpts(lv), i = +b.dataset.i, x = o.out[i]; if (!x) return; s.got.unshift({ t: x[0], tier: x[1], lv, d: today(), used: false }); s.opened = lv; save(); UI.toast('Recompensa guardada: ' + x[0], 'pos'); };
A.d3Used = b => { const s = S(), g = s.got[+b.dataset.i]; if (!g) return; g.used = !g.used; save(); };

/* ================= MOMENTOS COM PESSOAS ================= */
A.d3Social = b => UI.openForm('social', null, Object.assign({ date: today() }, b && b.dataset && b.dataset.p ? { person: b.dataset.p } : {}));

/* ================= O TEU HERÓI EM PIXEL ART (estilo Terraria) =================
   Corpo inteiro em 48 × 72 pixels, desenhado por camadas: capa, cabelo de trás, pele, calças, calçado, tronco, braços, escudo,
   cabeça, rosto, barba, cabelo, óculos, chapéu ou elmo, objeto na mão e acessórios. Cada forma é pintada com volume (luz da esquerda,
   sombras que puxam para o azul e luzes para o amarelo), contorno escuro colorido e brilho nos metais, como no Terraria.
   Começa à tua imagem (pele morena, cabelo cacheado curto, óculos retangulares finos, cavanhaque, t-shirt canelada, jeans e ténis).
   As armaduras, fatos, capas e armas desbloqueiam-se com os atributos e o nível; a coroa também se compra com ouro.
   O desenho é feito uma vez por aparência e guardado como imagem PNG nítida (image-rendering: pixelated). */
/* ---------- motor de pixel art (estilo Terraria): grelha 48 × 72, rampas com mudança de matiz, volume e contorno colorido ---------- */
const PW = 48, PH = 72;
const hx2 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const shade = (h, k) => toHex(hx2(h).map(v => v * k)), mix = (a, b, t) => { const A = hx2(a), B = hx2(b); return toHex(A.map((v, i) => v * (1 - t) + B[i] * t)); };
const toHsl = h => { let [r, g, b] = hx2(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let H = 0, Sa = 0;
  if (mx !== mn) { const d = mx - mn; Sa = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H *= 60; } return [H, Sa, l]; };
const fromHsl = (H, Sa, l) => { H = ((H % 360) + 360) % 360; Sa = Math.max(0, Math.min(1, Sa)); l = Math.max(0, Math.min(1, l)); const q = l < .5 ? l * (1 + Sa) : l + Sa - l * Sa, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return toHex([f(H / 360 + 1 / 3), f(H / 360), f(H / 360 - 1 / 3)].map(v => v * 255)); };
// roda a matiz em direção a um alvo (sombras para o azul-violeta, luzes para o amarelo)
const toward = (H, T, a) => { let d = ((T - H + 540) % 360) - 180; return H + Math.sign(d) * Math.min(Math.abs(d), a); };
// rampa de 5 tons: [contorno, sombra, base, luz, brilho]
const RAMP = c => { const [H, Sa, l] = toHsl(c), g = Sa < .08;
  return [fromHsl(g ? H : toward(H, 250, 22), g ? Sa : Math.min(1, Sa + .12), l * .34), fromHsl(g ? H : toward(H, 250, 11), g ? Sa : Math.min(1, Sa + .06), l * .7), c,
    fromHsl(g ? H : toward(H, 55, 8), g ? Sa : Sa * .95, l + (1 - l) * .26), fromHsl(g ? H : toward(H, 55, 14), g ? Sa : Sa * .8, l + (1 - l) * .55)]; };
const METAL = { prata: ['#23293A', '#58627A', '#9AA6B8', '#D2DAE6', '#F6FAFF'], ouro: ['#4A2A10', '#9A5A1A', '#D99A2E', '#F4CF5A', '#FFF4C0'], bronze: ['#3A1E10', '#7A4220', '#B8763A', '#E0A866', '#FFE0B0'],
  negro: ['#07080D', '#141824', '#252C3E', '#3C4760', '#6A7A9C'], aco: ['#1A2030', '#3E4A62', '#6E7C96', '#A8B6CC', '#E6EEFA'] };
// pele: sombras para o vermelho-acastanhado, luz pouco saturada (nada de laranja)
const SKR = c => { const [H, Sa, l] = toHsl(c); return [fromHsl(toward(H, 0, 14), Math.min(1, Sa + .1), l * .42), fromHsl(toward(H, 8, 6), Math.min(1, Sa + .04), l * .8), c, fromHsl(toward(H, 40, 4), Sa * .85, l + (1 - l) * .13), fromHsl(toward(H, 45, 6), Sa * .7, l + (1 - l) * .3)]; };
/* ---------- tela, formas e pintura com volume ---------- */
const mkC = () => { const px = new Array(PW * PH).fill(null), C = { px };
  C.put = (x, y, c) => { x |= 0; y |= 0; if (c && x >= 0 && x < PW && y >= 0 && y < PH) px[y * PW + x] = c; };
  C.at = (x, y) => (x >= 0 && x < PW && y >= 0 && y < PH) ? px[y * PW + x] : null;
  C.dots = (pts, c) => pts.forEach(([x, y]) => C.put(x, y, c));
  C.line = (x0, y0, x1, y1, c) => { const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { C.put(x0, y0, typeof c === 'function' ? c(x0, y0) : c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } };
  C.hline = (y, a, b, c) => { for (let x = a; x <= b; x++) C.put(x, y, c); };
  C.vline = (x, a, b, c) => { for (let y = a; y <= b; y++) C.put(x, y, c); };
  // pinta a forma com volume: luz da esquerda/cima, contorno escuro colorido (como no Terraria)
  C.vol = (m, r, o = {}) => { const R = Array.isArray(r) ? r : RAMP(r), h = i => m.has(i), lx = o.lx != null ? o.lx : .62;
    m.forEach(i => { const x = i % PW, y = (i / PW) | 0, L = x > 0 && h(i - 1), Rr = x < PW - 1 && h(i + 1), Up = h(i - PW), Dn = h(i + PW);
      let c; if (!(L && Rr && Up && Dn) && !o.noline) c = o.line || ((!Up || !L) && Rr && Dn && o.selout ? R[1] : R[0]);
      else if (o.flat) c = R[2];
      else { let dl = 0, dr = 0, du = 0, dd = 0; while (x - dl - 1 >= 0 && h(i - dl - 1)) dl++; while (x + dr + 1 < PW && h(i + dr + 1)) dr++; while (h(i - (du + 1) * PW)) du++; while (h(i + (dd + 1) * PW)) dd++;
        const v = lx * (dl / ((dl + dr) || 1)) + (1 - lx) * (du / ((du + dd) || 1)); c = o.shine && v < (o.hi || .13) ? R[4] : v < (o.t1 || .3) ? R[3] : v < (o.t2 || .68) ? R[2] : R[1]; }
      C.put(x, y, c); }); return R; };
  // textura só no interior da forma
  C.tex = (m, f) => m.forEach(i => { const x = i % PW, y = (i / PW) | 0; if (m.has(i - 1) && m.has(i + 1) && m.has(i - PW) && m.has(i + PW)) { const c = f(x, y, C.at(x, y)); if (c) C.put(x, y, c); } });
  return C; };
const M = {
  rect: (x0, y0, x1, y1) => { const s = new Set(); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && x < PW && y >= 0 && y < PH) s.add(y * PW + x); return s; },
  ell: (cx, cy, rx, ry) => { const s = new Set(); for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const a = (x + .5 - cx) / rx, b = (y + .5 - cy) / ry; if (a * a + b * b <= 1 && x >= 0 && x < PW && y >= 0 && y < PH) s.add(y * PW + x); } return s; },
  rows: (y0, spans) => { const s = new Set(); spans.forEach((sp, k) => { if (!sp) return; for (let x = sp[0]; x <= sp[1]; x++) if (x >= 0 && x < PW) s.add((y0 + k) * PW + x); }); return s; },
  sym: (y0, lefts, w) => M.rows(y0, lefts.map(a => a == null ? null : [a, PW - 1 - a])), // linhas simétricas pelo meio
  U: (...a) => { const s = new Set(); a.forEach(t => t && t.forEach(i => s.add(i))); return s; },
  X: (a, ...b) => { const s = new Set(a); b.forEach(t => t.forEach(i => s.delete(i))); return s; },
  I: (a, b) => new Set([...a].filter(i => b.has(i))),
  mir: a => new Set([...a].map(i => { const x = i % PW, y = (i / PW) | 0; return y * PW + (PW - 1 - x); })),
  both: a => M.U(a, M.mir(a)),
  where: (a, f) => new Set([...a].filter(i => f(i % PW, (i / PW) | 0))) };
const SKINS = ['#FBE1CC', '#F0C9A6', '#E2AD84', '#CC946A', '#B57A50', '#9C643C', '#87522F', '#6F4227', '#58331E', '#402414'];
const HAIRCOL = { preto: '#231A17', 'castanho escuro': '#3E2618', castanho: '#6E4628', loiro: '#E0B85E', ruivo: '#B24A1E', grisalho: '#A7ACB6', branco: '#EEEAE2', azul: '#2F74DA', verde: '#2FA35E', roxo: '#8048C8' };
const EYECOL = { 'castanho escuro': '#4A2A18', castanho: '#76492A', mel: '#B07A2E', verde: '#3E9A52', azul: '#3D86E0', cinza: '#7F8C9A' };
const COLORS = ['#4A362C', '#23262E', '#EEEEEA', '#24467A', '#2F7BEA', '#66717F', '#8E2434', '#356B42', '#D6A640', '#C2503E', '#5A3290', '#E8842E'];
// o corpo: medidas que mudam com o Corpo (ombros e braços mais largos)
const bodyOf = tc => { const b = tc >= 4 ? 2 : tc >= 2 ? 1 : 0, t = tc >= 3 ? 1 : 0, P = {};
  P.b = b; P.t = t;
  P.head = M.U(M.ell(24, 16, 9.7, 10.4), M.ell(24, 20, 8.3, 8.9));
  P.earL = M.ell(14.2, 19.5, 2, 3.1); P.earR = M.mir(P.earL);
  P.neck = M.rect(20, 27, 27, 32);
  P.torso = M.U(M.rows(31, [[18, 29], [16 - b, 31 + b]]), M.rect(15 - b, 33, 32 + b, 44), M.rect(16 - (b > 1 ? 1 : 0), 45, 31 + (b > 1 ? 1 : 0), 49));
  P.armL = M.U(M.rect(10 - b - t, 34, 14 - b, 48), M.rect(11 - b - t, 33, 14 - b, 33), M.rect(12 - b - t, 32, 14 - b, 32));
  P.armR = M.mir(P.armL);
  P.handL = M.U(M.rect(10 - b - t, 49, 14 - b, 51), M.rect(11 - b - t, 52, 13 - b, 52), M.rect(15 - b, 49, 15 - b, 50)); P.handR = M.mir(P.handL);
  P.legL = M.U(M.rect(16, 49, 23, 54), M.rect(16, 55, 22, 65)); P.legR = M.mir(P.legL);
  P.footL = M.U(M.rect(15, 66, 22, 66), M.rect(14, 67, 22, 69)); P.footR = M.mir(P.footL);
  P.hx = 33 + b, P.lx = 14 - b; // limites interiores das mãos
  P.hR = [33 + b, 37 + b + t]; P.hL = [10 - b - t, 14 - b]; // colunas das mãos
  return P; };
const DEF_LOOK = { skin: 6, hair: 'cacheado curto', hairColor: 'preto', eyes: 'castanho escuro', brows: 'grossas', beard: 'cavanhaque', glasses: 'retangulares', head: '', headColor: 3,
  top: 'tshirt', topColor: 0, legs: 'jeans', legsColor: 3, feet: 'tenis', feetColor: 2, cape: '', hand: '', shield: '', acc: '' };
// numa conta o herói começa neutro (o visual do Ryan só no modo pessoal)
if (OS.Acc && OS.Acc.pub) Object.assign(DEF_LOOK, { skin: 3, hair: 'liso curto', hairColor: 'castanho', eyes: 'castanho', brows: 'finas', beard: 'nenhuma', glasses: '' });
D.DEF_LOOK = DEF_LOOK;
D.pixel = (look = {}, o = {}) => { const L = Object.assign({}, DEF_LOOK, look), tc = o.corpo || 0, mood = o.mood || 'forma', C = mkC(), B = bodyOf(tc);
  const sk = SKINS[L.skin] != null ? SKINS[L.skin] : SKINS[6], SK = SKR(sk), hc = HAIRCOL[L.hairColor] || HAIRCOL.preto, HC = RAMP(hc);
  const col = (k, d) => COLORS[L[k] != null ? L[k] : d] || COLORS[0];
  const X = { L, C, B, SK, sk, HC, hc, tc, mood, col };
  const TP = TOPS[L.top] || TOPS.tshirt, LG = LEGS[L.legs] || LEGS.jeans, FT = FEET[L.feet] || FEET.tenis;
  if (CAPES[L.cape]) CAPES[L.cape](X, 'back');
  if (ACCS[L.acc] && ACCS[L.acc].back) ACCS[L.acc].back(X);
  if (HAIRS[L.hair] && HAIRS[L.hair].back && !HIDEHAIR.includes(L.head)) HAIRS[L.hair].back(X);
  // pernas e pés
  C.vol(B.legL, SK); C.vol(B.legR, SK); if (FT.skin !== false) { C.vol(B.footL, SK); C.vol(B.footR, SK); }
  LG(X); FT.f(X);
  // tronco
  C.vol(B.torso, SK); C.vol(B.neck, SK, { lx: .5 }); C.hline(27, 20, 27, SK[1]); C.hline(28, 21, 26, SK[1]);
  TP.t(X);
  // braços (pele + mangas) e mãos
  [['L', B.armL, B.handL], ['R', B.armR, B.handR]].forEach(([s, arm, hand]) => { C.vol(arm, SK); if (TP.sl) { const sl = M.where(arm, (x, y) => y <= TP.sl); C.vol(sl, TP.slc ? TP.slc(X) : TP.c(X)); if (TP.cuff) TP.cuff(X, sl, s); } C.vol(hand, SK); if (TP.hand) TP.hand(X, hand, s); });
  if (TP.over) TP.over(X);
  if (SHIELDS[L.shield]) SHIELDS[L.shield](X);
  // cabeça
  C.vol(B.earL, SK); C.vol(B.earR, SK); C.dots([[14, 19], [14, 20], [33, 19], [33, 20]], SK[1]);
  C.vol(B.head, SK, { lx: .72, t1: .16, t2: .82 });
  face(X);
  if (BEARDS[L.beard]) BEARDS[L.beard](X);
  if (HAIRS[L.hair] && !HIDEHAIR.includes(L.head)) HAIRS[L.hair].f(X, CAPHAIR.includes(L.head));
  if (GLASSES[L.glasses]) GLASSES[L.glasses](X);
  if (HEADS[L.head]) HEADS[L.head](X);
  if (HANDS[L.hand]) HANDS[L.hand](X);
  if (ACCS[L.acc]) ACCS[L.acc](X);
  if (CAPES[L.cape]) CAPES[L.cape](X, 'front');
  return C.px; };
// ---------- rosto (olhos com íris e brilho, nariz largo com sombra, lábios) ----------
const face = X => { const { C, SK, HC, L, mood, sk } = X, ec = EYECOL[L.eyes] || EYECOL['castanho escuro'], E = RAMP(ec), lid = mood === 'abatido' || mood === 'cansado';
  const eye = x0 => { const W = '#F2EEE8'; C.hline(16, x0, x0 + 3, SK[0]);
    C.put(x0, 17, W); C.put(x0 + 1, 17, '#FFFFFF'); C.put(x0 + 2, 17, E[2]); C.put(x0 + 3, 17, mix(W, SK[1], .3));
    C.put(x0, 18, mix(W, SK[1], .45)); C.put(x0 + 1, 18, E[2]); C.put(x0 + 2, 18, E[0]); C.put(x0 + 3, 18, mix(W, SK[1], .55));
    C.put(x0 + 1, 17, E[3]); C.put(x0 + 1, 17, mix(E[3], '#FFFFFF', .6));
    if (lid) { C.hline(17, x0, x0 + 3, SK[1]); C.put(x0 + 1, 18, E[1]); } };
  eye(17); eye(27);
  const bc = HC[0], thick = L.brows !== 'finas';
  C.hline(14, 17, 21, bc); C.hline(14, 26, 30, bc); if (thick) { C.hline(13, 17, 20, mix(bc, HC[1], .5)); C.hline(13, 27, 30, mix(bc, HC[1], .5)); }
  if (mood === 'chamas') { C.put(21, 15, bc); C.put(26, 15, bc); } if (lid) { C.put(17, 15, bc); C.put(30, 15, bc); }
  // nariz largo, luz da esquerda
  C.vline(22, 18, 20, SK[3]); C.vline(25, 18, 21, SK[1]); C.put(21, 21, SK[1]); C.put(26, 21, SK[1]);
  C.put(22, 22, SK[1]); C.put(23, 22, mix(SK[1], SK[0], .4)); C.put(24, 22, mix(SK[1], SK[0], .4)); C.put(25, 22, SK[1]); C.put(23, 21, SK[3]);
  // boca
  const lip = mix(sk, '#7A2E30', .32), LP = RAMP(lip);
  C.hline(25, 22, 25, mix(LP[0], SK[0], .3)); C.put(21, 25, SK[1]); C.put(26, 25, SK[1]); C.hline(26, 22, 25, LP[2]); C.put(23, 26, LP[3]);
  if (mood === 'chamas') { C.hline(25, 22, 25, '#F2EEE8'); C.put(21, 24, SK[1]); C.put(26, 24, SK[1]); }
  if (mood === 'abatido') { C.put(21, 26, SK[0]); C.put(26, 26, SK[0]); } };
// ---------- cabelo ----------
// caracóis: pequenos tufos com luz em cima à esquerda e sombra em baixo à direita
// caracóis: tufos de 3 × 3 com luz em cima à esquerda, sombra em baixo à direita, numa grelha desencontrada
const curlTex = (C, m, H, dx = 4, dy = 3) => { for (let y = 0; y < PH; y += dy) for (let x = ((y / dy) % 2 ? 2 : 0) - 1; x < PW; x += dx) {
    [[0, 0, H[3]], [1, 0, H[2]], [0, 1, H[2]], [1, 1, H[2]], [2, 1, H[1]], [1, 2, H[1]], [2, 2, H[0]]].forEach(([a, b, c]) => { const i = (y + b) * PW + x + a; if (m.has(i) && m.has(i - 1) && m.has(i + 1) && m.has(i + PW) && m.has(i - PW)) C.put(x + a, y + b, c); }); } };
const bumps = (cx, cy, rx, ry, n, r, a0 = 190, a1 = 350) => M.U(...Array.from({ length: n }, (_, k) => { const a = (a0 + (a1 - a0) * k / (n - 1)) * Math.PI / 180; return M.ell(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, r, r); }));
const HAIRS = {
  'cacheado curto': { f: (X, cap) => { const { C, HC } = X; let m = M.U(M.where(M.ell(24, 13, 11, 9.2), (x, y) => y <= 13), bumps(24, 13.4, 10.2, 8.8, 11, 2.1), M.rect(13, 11, 15, 16), M.rect(32, 11, 34, 16));
      m = M.X(m, M.rows(11, [[19, 28], [17, 30], [16, 31]]), M.rect(14, 15, 15, 16), M.rect(32, 15, 33, 16)); if (cap) m = M.where(m, (x, y) => y >= 9);
      C.vol(m, [HC[0], HC[1], HC[1], HC[2], HC[3]], { lx: .5, t1: .2, t2: .75 }); curlTex(C, m, HC); C.dots([[16, 13], [31, 13], [18, 12], [29, 12]], HC[1]); } } };
const HIDEHAIR = [], CAPHAIR = [];
// ---------- barba ----------
const BEARDS = {
  cavanhaque: X => { const { C, HC, SK, hc } = X, mu = mix(SK[1], hc, .7);
    C.hline(24, 21, 26, mu); C.put(23, 24, hc); C.put(24, 24, hc); C.put(20, 24, mix(SK[2], hc, .4)); C.put(27, 24, mix(SK[2], hc, .4)); C.dots([[21, 25], [26, 25], [21, 26], [26, 26]], mix(SK[1], hc, .45));
    C.hline(27, 23, 24, HC[1]); C.hline(28, 21, 26, HC[2]); C.hline(29, 22, 25, HC[1]); C.hline(30, 23, 24, HC[0]); C.dots([[22, 27], [25, 27]], mix(SK[1], hc, .5)); C.put(22, 28, HC[3]); C.put(21, 28, HC[1]); C.put(26, 28, HC[0]); C.put(25, 29, HC[0]); } };
// ---------- óculos ----------
const GLASSES = {
  retangulares: X => { const { C } = X, F = ['#2A303C', '#4A5262', '#6C7686', '#A6B0BE', '#E6ECF4'], lens = x0 => { for (let y = 16; y <= 19; y++) for (let x = x0 + 1; x <= x0 + 4; x++) C.put(x, y, mix(C.at(x, y) || '#000000', '#CFE6FF', .1));
      C.put(x0 + 1, 16, mix(C.at(x0 + 1, 16), '#FFFFFF', .5)); C.put(x0 + 4, 19, mix(C.at(x0 + 4, 19), '#FFFFFF', .25));
      C.hline(15, x0, x0 + 5, F[2]); C.hline(20, x0 + 1, x0 + 4, F[1]); C.vline(x0, 16, 19, F[1]); C.vline(x0 + 5, 16, 19, F[0]); C.put(x0, 20, F[0]); C.put(x0 + 5, 20, F[0]); C.put(x0 + 1, 15, F[3]); };
    lens(16); lens(26); C.hline(16, 22, 25, F[2]); C.hline(16, 14, 15, F[1]); C.hline(16, 32, 33, F[1]); } };
// ---------- tronco ----------
const neckHole = M.U(M.rows(31, [[20, 27], [21, 26]]));
const TOPS = {
  tshirt: { c: X => X.col('topColor', 0), sl: 40, t: X => { const { C, B } = X, c = X.col('topColor', 0), m = M.X(B.torso, neckHole), R = C.vol(m, c, { lx: .85, t1: .12, t2: .8 });
      C.tex(m, (x, y) => (x % 2 === 0 && y > 33 && y < 48 && C.at(x, y) === R[2]) ? mix(R[2], R[1], .25) : null); // canelado
      C.dots([[20, 31], [21, 32], [22, 33], [23, 33], [24, 33], [25, 33], [26, 32], [27, 31]], R[3]); C.dots([[19, 31], [28, 31]], R[1]); C.hline(49, 17, 30, R[1]);
      C.dots([[21, 38], [22, 39], [26, 42], [27, 43], [19, 45]], R[1]); },
    cuff: (X, sl, s) => { const R = RAMP(X.col('topColor', 0)); sl.forEach(i => { const x = i % PW, y = (i / PW) | 0; if (y === 40 && X.C.at(x, y) !== R[0]) X.C.put(x, y, R[1]); }); } } };
// ---------- pernas ----------
const LEGS = {
  jeans: X => { const { C, B } = X, c = X.col('legsColor', 3), R = RAMP(c); C.vol(B.legL, R); C.vol(B.legR, R);
    C.hline(49, 16, 31, R[1]); C.hline(50, 17, 30, R[3]); C.dots([[18, 50], [29, 50], [23, 50]], R[0]); // cós e passadores
    C.dots([[17, 51], [18, 52], [19, 52], [30, 51], [29, 52], [28, 52]], R[1]); // bolsos
    C.vline(22, 51, 54, R[1]); C.put(22, 53, R[0]);
    C.dots([[17, 58], [18, 59], [17, 60], [29, 58], [30, 59], [29, 60]], R[3]); // desgaste nos joelhos
    C.hline(64, 17, 21, R[1]); C.hline(64, 26, 30, R[1]); } };
// ---------- pés ----------
const FEET = {
  tenis: { f: X => { const { C, B } = X, W = RAMP('#ECEEF2'), ac = X.col('feetColor', 2), A = ac === '#EEEEEA' ? '#2F7BEA' : ac; C.vol(B.footL, W, { flat: 0 }); C.vol(B.footR, W);
    C.hline(69, 14, 22, '#7E8796'); C.hline(69, 25, 33, '#7E8796'); C.hline(68, 15, 21, '#C9CED8'); C.hline(68, 26, 32, '#C9CED8');
    C.dots([[17, 67], [18, 67], [19, 66], [30, 67], [29, 67], [28, 66]], A); C.dots([[20, 66], [27, 66]], W[1]); } } };
const CAPES = {}, SHIELDS = {}, HEADS = {}, HANDS = {}, ACCS = {};
// ======== mais cabelos ========
const capM = (top = 4) => M.U(M.where(M.ell(24, 13, 10.6, 9.4 - (4 - top) * .3), (x, y) => y <= 12), M.rect(14, 11, 15, 15), M.rect(32, 11, 33, 15));
const hairline = m => M.X(m, M.rows(11, [[19, 28], [17, 30], [16, 31]]));
const strands = (C, m, H, step = 3) => C.tex(m, (x, y) => (x % step === 0 && C.at(x, y) !== H[4] && C.at(x, y) !== H[3]) ? H[1] : null);
const shineBand = (C, m, H, y0) => m.forEach(i => { const x = i % PW, y = (i / PW) | 0; if ((y === y0 || y === y0 + 1) && x > 16 && x < 26 && (x + y) % 3 && C.at(x, y) !== H[0]) C.put(x, y, H[y === y0 ? 4 : 3]); });
Object.assign(HAIRS, {
  afro: { f: (X, cap) => { const { C, HC, B } = X; let m = M.U(M.ell(24, 12, 13.6, 11.5), bumps(24, 12, 12.8, 10.6, 16, 2.4, 150, 390));
      m = M.X(m, M.where(B.head, (x, y) => y >= 11 && x >= 16 && x <= 31), M.where(B.head, (x, y) => y >= 17)); if (cap) m = M.where(m, (x, y) => y >= 8);
      C.vol(m, [HC[0], HC[1], HC[1], HC[2], HC[3]], { lx: .5, t1: .2, t2: .78 }); curlTex(C, m, HC, 4, 3); } },
  rapado: { f: X => { const { C, HC, SK, hc } = X, m = hairline(M.where(capM(), (x, y) => y >= 5)); m.forEach(i => { const x = i % PW, y = (i / PW) | 0; C.put(x, y, (x + y) % 2 ? mix(SK[1], hc, .72) : mix(SK[1], hc, .55)); }); } },
  'liso curto': { f: (X, cap) => { const { C, HC } = X; let m = M.X(M.U(capM(3), M.rows(11, [[15, 25], [15, 22], [15, 19]])), M.rows(11, [[26, 30], [23, 31], [20, 31]])); if (cap) m = M.where(m, (x, y) => y >= 9);
      C.vol(m, HC, { lx: .5, t1: .18, t2: .74 }); strands(C, m, HC); shineBand(C, m, HC, 6); C.line(17, 13, 24, 9, HC[0]); } },
  moicano: { f: X => { const { C, HC, SK, hc } = X, side = hairline(M.where(capM(), (x, y) => y >= 6)); side.forEach(i => { const x = i % PW, y = (i / PW) | 0; C.put(x, y, (x + y) % 2 ? mix(SK[1], hc, .6) : mix(SK[2], hc, .45)); });
      const m = M.U(M.rows(0, [[23, 24], [22, 25], [21, 26], [21, 26], [20, 27]]), M.rect(20, 5, 27, 12)); C.vol(m, HC, { lx: .5 }); strands(C, m, HC, 2); } },
  topete: { f: (X, cap) => { const { C, HC } = X; let m = M.U(capM(), M.ell(21, 6, 8.5, 5), M.ell(18, 4.5, 4, 3)); m = hairline(m); if (cap) m = M.where(m, (x, y) => y >= 9);
      C.vol(m, HC, { lx: .55, t1: .2, t2: .74, shine: 1 }); strands(C, m, HC); C.line(14, 6, 26, 2, HC[3]); } },
  'tranças': { f: (X, cap) => { const { C, HC, SK, hc } = X; let m = hairline(capM()); if (cap) m = M.where(m, (x, y) => y >= 9); C.vol(m, [HC[0], mix(SK[1], hc, .5), mix(SK[1], hc, .5), mix(SK[1], hc, .5), HC[3]], { flat: 1 });
      [16, 19, 22, 25, 28, 31].forEach((x0, k) => m.forEach(i => { const x = i % PW, y = (i / PW) | 0; if (x === x0 || x === x0 + 1) C.put(x, y, (y + (x === x0 ? 0 : 1)) % 2 ? HC[3] : HC[1]); })); } },
  dreads: { back: X => { const { C, HC } = X; [12, 15, 18, 29, 32, 35].forEach((x, k) => { const m = M.rect(x, 12, x + 1, 30 + (k % 3) * 2); C.vol(m, HC, { flat: 1 }); for (let y = 14; y < 34; y += 3) C.put(x, y, HC[3]); }); },
    f: (X, cap) => { const { C, HC } = X; let m = hairline(M.U(capM(), bumps(24, 13, 10, 8.6, 9, 1.8))); if (cap) m = M.where(m, (x, y) => y >= 9); C.vol(m, HC, { lx: .5 }); for (let x = 15; x <= 32; x += 2) C.tex(m, (a, y) => a === x ? (y % 3 ? HC[1] : HC[3]) : null);
      [13, 33].forEach(x => { const s = M.rect(x, 12, x + 1, 26); C.vol(s, HC, { flat: 1 }); for (let y = 14; y < 26; y += 3) C.put(x, y, HC[3]); }); } },
  coque: { f: (X, cap) => { const { C, HC } = X; let m = hairline(capM()); if (cap) m = M.where(m, (x, y) => y >= 9); C.vol(m, HC, { lx: .55, t1: .2, t2: .76, shine: 1 }); shineBand(C, m, HC, 6); if (!cap) { const bn = M.ell(24, 2.6, 4.6, 3); C.vol(bn, HC, { shine: 1 }); C.hline(5, 21, 26, HC[0]); } } },
  comprido: { back: X => { const { C, HC } = X, m = M.U(M.rect(13, 12, 34, 40), M.ell(24, 40, 10.5, 2.5)); C.vol(m, HC, { lx: .5 }); strands(C, m, HC); },
    f: (X, cap) => { const { C, HC } = X; let m = M.U(hairline(capM()), M.rect(13, 11, 16, 33), M.rect(31, 11, 34, 33)); m = M.X(m, M.rect(23, 9, 24, 11)); if (cap) m = M.where(m, (x, y) => y >= 9);
      C.vol(m, HC, { lx: .5, t1: .2, t2: .74 }); strands(C, m, HC); shineBand(C, m, HC, 6); C.vline(23, 5, 10, HC[0]); } },
  'cacheado comprido': { back: X => { const { C, HC } = X, m = M.U(M.rect(11, 12, 36, 36), bumps(24, 30, 13, 8, 12, 2.6, 0, 180)); C.vol(m, [HC[0], HC[1], HC[1], HC[2], HC[3]], { lx: .5 }); curlTex(C, m, HC); },
    f: (X, cap) => { const { C, HC } = X; let m = M.U(hairline(M.U(capM(), bumps(24, 13, 10.6, 9, 11, 2.3))), M.rect(11, 11, 15, 30), M.rect(32, 11, 36, 30), bumps(24, 20, 12, 10, 8, 2, -30, 210)); m = M.X(m, M.where(X.B.head, (x, y) => y >= 12 && x >= 16 && x <= 31)); if (cap) m = M.where(m, (x, y) => y >= 9);
      C.vol(m, [HC[0], HC[1], HC[1], HC[2], HC[3]], { lx: .5, t1: .2, t2: .75 }); curlTex(C, m, HC); } },
  careca: { f: X => { const { C, SK } = X; C.dots([[19, 8], [20, 8], [18, 9], [19, 9]], SK[4]); C.dots([[21, 8], [18, 10]], SK[3]); } } });
HIDEHAIR.push('ferro', 'cavaleiro', 'espartano', 'futurista', 'dragao', 'capuz', 'kabuto');
CAPHAIR.push('bone', 'bonetras', 'fedora', 'cowboy', 'gorro', 'mago', 'bandana');
// ======== barbas ========
Object.assign(BEARDS, {
  bigode: X => { const { C, HC } = X; C.hline(23, 20, 27, HC[1]); C.hline(24, 19, 28, HC[2]); C.dots([[19, 25], [28, 25]], HC[1]); C.dots([[21, 23], [22, 23]], HC[3]); C.hline(25, 22, 25, HC[0]); },
  'por fazer': X => { const { C, SK, hc, B } = X, m = M.X(M.where(B.head, (x, y) => y >= 20), M.rect(20, 20, 27, 22), M.rect(22, 25, 25, 26)); m.forEach(i => { const x = i % PW, y = (i / PW) | 0; if ((x + y) % 2 && C.at(x, y) !== SK[0]) C.put(x, y, mix(C.at(x, y), hc, .45)); }); },
  'barba curta': X => { const { C, HC, B } = X, m = M.X(M.U(M.where(B.head, (x, y) => y >= 21), M.rect(15, 17, 16, 21), M.rect(31, 17, 32, 21), M.rows(29, [[20, 27]])), M.rect(19, 21, 28, 23), M.rect(21, 24, 26, 26), M.rows(20, [[18, 29]]));
    C.vol(m, [HC[0], HC[1], HC[1], HC[2], HC[3]], { lx: .55 }); curlTex(C, m, HC, 3, 2); C.hline(24, 20, 27, HC[2]); C.hline(25, 22, 25, X.SK[0]); C.hline(26, 22, 25, mix(X.sk, '#7A2E30', .3)); },
  'barba cheia': X => { const { C, HC, B } = X, m = M.X(M.U(M.where(B.head, (x, y) => y >= 19), M.rect(14, 15, 16, 21), M.rect(31, 15, 33, 21), M.ell(24, 29, 7.5, 4)), M.rect(19, 19, 28, 23), M.rect(21, 24, 26, 26));
    C.vol(m, [HC[0], HC[1], HC[1], HC[2], HC[3]], { lx: .55 }); curlTex(C, m, HC, 3, 2); C.hline(24, 20, 27, HC[2]); C.hline(25, 22, 25, X.SK[0]); C.hline(26, 22, 25, mix(X.sk, '#7A2E30', .3)); },
  lenhador: X => { const { C, B, SK, sk } = X, H = RAMP('#8A3E1C'), m = M.X(M.U(M.where(B.head, (x, y) => y >= 19), M.rect(14, 15, 16, 21), M.rect(31, 15, 33, 21), M.ell(24, 31, 8.5, 6.5)), M.rect(19, 19, 28, 23), M.rect(21, 24, 26, 26));
    C.vol(m, H, { lx: .55 }); for (let x = 17; x <= 30; x += 2) C.tex(m, (a, y) => a === x && y > 26 ? (y % 3 ? H[1] : H[3]) : null); C.hline(24, 20, 27, H[2]); C.hline(25, 22, 25, SK[0]); C.hline(26, 22, 25, mix(sk, '#7A2E30', .3)); },
  nenhuma: () => {} });
// ======== óculos ========
const lensTint = (C, x0, y0, w, h, c, k) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) C.put(x, y, mix(C.at(x, y) || '#000000', c, k)); };
Object.assign(GLASSES, {
  redondos: X => { const { C } = X, F = RAMP('#8A5A2A'); [[19, 17.5], [29, 17.5]].forEach(([cx, cy]) => { const o = M.ell(cx, cy, 3.4, 3), i = M.ell(cx, cy, 2.4, 2); lensTint(C, cx - 2, 16, 4, 3, '#DDEEFF', .1); M.X(o, i).forEach(j => C.put(j % PW, (j / PW) | 0, (j / PW | 0) < cy ? F[2] : F[1])); C.put(cx - 2, 16, mix(C.at(cx - 2, 16), '#FFFFFF', .5)); }); C.hline(16, 22, 25, F[2]); C.hline(16, 14, 15, F[1]); C.hline(16, 32, 33, F[1]); },
  grossos: X => { const { C } = X, F = ['#05060A', '#0E1016', '#1C2030', '#3A4258', '#7A88A8']; [16, 26].forEach(x0 => { lensTint(C, x0 + 1, 17, 4, 2, '#DDEEFF', .1); C.hline(15, x0, x0 + 5, F[2]); C.hline(16, x0, x0 + 5, F[1]); C.hline(19, x0, x0 + 5, F[1]); C.vline(x0, 15, 19, F[1]); C.vline(x0 + 5, 15, 19, F[0]); C.put(x0 + 1, 15, F[3]); C.put(x0 + 1, 17, mix(C.at(x0 + 1, 17), '#FFFFFF', .5)); }); C.hline(16, 22, 25, F[2]); C.hline(16, 14, 15, F[1]); C.hline(16, 32, 33, F[1]); },
  sol: X => { const { C } = X; [16, 26].forEach(x0 => { const L = M.U(M.rect(x0, 15, x0 + 5, 18), M.rect(x0 + 1, 19, x0 + 4, 19)); C.vol(L, ['#05060A', '#141826', '#1E2436', '#3A4560', '#8090B0'], { lx: .4, t1: .2 }); C.put(x0 + 1, 16, '#9AA8C8'); C.put(x0 + 2, 16, '#5A6888'); C.put(x0 + 1, 17, '#5A6888'); }); C.hline(15, 22, 25, '#141826'); C.hline(16, 14, 15, '#141826'); C.hline(16, 32, 33, '#141826'); },
  aviador: X => { const { C } = X, F = METAL.ouro; [16, 26].forEach(x0 => { const L = M.U(M.rect(x0, 15, x0 + 5, 18), M.rect(x0 + 1, 19, x0 + 4, 19), M.rect(x0 + 2, 20, x0 + 3, 20)); C.vol(L, [F[1], '#5A3A1A', '#7A5228', '#A07A40', '#E0C080'], { lx: .3, t1: .25 }); C.put(x0 + 1, 16, '#E8D2A0'); }); C.hline(15, 22, 25, F[2]); C.hline(14, 22, 25, F[3]); C.hline(16, 14, 15, F[2]); C.hline(16, 32, 33, F[2]); },
  monoculo: X => { const { C } = X, F = METAL.ouro, o = M.ell(29, 17.5, 3.4, 3.2), i = M.ell(29, 17.5, 2.4, 2.2); lensTint(C, 27, 16, 4, 3, '#DDEEFF', .12); M.X(o, i).forEach(j => C.put(j % PW, (j / PW) | 0, (j / PW | 0) < 17 ? F[3] : F[1])); C.put(27, 16, '#FFFFFF'); C.line(32, 20, 33, 27, F[2]); C.line(33, 28, 31, 34, F[1]); },
  visor: X => { const { C } = X, m = M.rows(15, [[14, 33], [14, 33], [14, 33], [15, 32], [16, 31]]); C.vol(m, ['#062A40', '#0A5A86', '#1890D0', '#5AD0FF', '#D0F6FF'], { lx: .3, t1: .2, t2: .7, shine: 1 }); C.hline(16, 16, 22, '#BFF0FF'); C.dots([[30, 17], [31, 17]], '#7FE0FF'); } });
// ======== tronco: ajudas ========
const TOR = X => M.X(X.B.torso, neckHole);
const cloth = (X, m, c, o = {}) => X.C.vol(m, c, Object.assign({ lx: .85, t1: .12, t2: .8 }, o));
const skirt = (y1, grow = 3) => M.U(...Array.from({ length: y1 - 48 }, (_, k) => { const y = 49 + k, g = Math.floor(k * grow / (y1 - 49 || 1)); return M.rect(16 - g, y, 31 + g, y); }));
const vOpen = (X, c, y1 = 40, w = 4) => { for (let y = 31; y <= y1; y++) { const h = Math.max(0, Math.round(w - (y - 31) * w / (y1 - 31))); for (let x = 24 - h; x <= 23 + h; x++) X.C.put(x, y, c); } };
const lapels = (X, R, y1 = 41) => { X.C.line(19, 31, 23, y1, R[3]); X.C.line(28, 31, 24, y1, R[1]); X.C.line(18, 32, 21, 38, R[1]); X.C.line(29, 32, 26, 38, R[0]); };
const tie = (X, c) => { const T = RAMP(c); X.C.dots([[23, 32], [24, 32], [23, 33], [24, 33]], T[1]); for (let y = 34; y <= 42; y++) { X.C.put(23, y, T[2]); X.C.put(24, y, T[1]); } X.C.dots([[22, 41], [25, 41], [23, 43], [24, 43]], T[1]); X.C.put(23, 35, T[3]); };
const buttons = (X, x, ys, c) => ys.forEach(y => X.C.put(x, y, c));
const gorget = (X, R) => X.C.vol(M.rows(30, [[20, 27], [19, 28], [18, 29], [19, 28]]), R, { shine: 1, lx: .6 });
const plate = (X, R, o = {}) => { const m = TOR(X); X.C.vol(m, R, { shine: 1, lx: .78, t1: .16, t2: .78 }); const b = X.B.b;
  [38, 43].forEach(y => { X.C.hline(y, 16 - b, 31 + b, R[1]); X.C.hline(y + 1, 17 - b, 30 + b, R[3]); }); X.C.vline(23, 33, 37, R[3]); X.C.vline(24, 33, 37, R[2]);
  X.C.dots([[17 - b, 34], [30 + b, 34], [17 - b, 40], [30 + b, 40], [17 - b, 46], [30 + b, 46]], R[4]); gorget(X, R); if (o.belt) { X.C.hline(47, 16, 31, o.belt); X.C.hline(48, 16, 31, shade(o.belt, .6)); X.C.dots([[23, 47], [24, 47], [23, 48], [24, 48]], o.buckle || '#D9A640'); } };
const pauld = (X, R, o = {}) => { const b = X.B.b, t = X.B.t, l = M.U(M.ell(12.5 - b - t * .5, 33.5, 4.6 + t * .5, 3.4), M.rect(10 - b - t, 33, 15 - b, 35)); X.C.vol(l, R, { shine: 1, lx: .55 }); X.C.vol(M.mir(l), R, { shine: 1, lx: .55 });
  [[11 - b, 33], [36 + b, 33]].forEach(([x, y]) => X.C.put(x, y, R[4])); if (o.trim) { X.C.hline(36, 9 - b - t, 15 - b, o.trim); X.C.hline(36, 32 + b, 38 + b + t, o.trim); }
  if (o.spike) [[9 - b - t, 30], [10 - b - t, 31], [8 - b - t, 29], [38 + b + t, 30], [37 + b + t, 31], [39 + b + t, 29]].forEach(([x, y]) => X.C.put(x, y, o.spike)); };
const gaunt = R => (X, hand) => X.C.vol(hand, R, { shine: 1 });
const ARMSL = (R, o = {}) => (X, sl, s) => { const C = X.C; [41, 45].forEach(y => sl.forEach(i => { if (((i / PW) | 0) === y && C.at(i % PW, y) !== R[0]) C.put(i % PW, y, R[1]); })); };
const camo = (X, m, cols) => X.C.tex(m, (x, y) => { const v = Math.sin(x * 1.7 + y * .9) + Math.sin(x * .6 - y * 1.3) + Math.cos(x * .4 + y * .5); return v > 1.1 ? cols[0] : v < -1.2 ? cols[1] : v > .5 && v < .7 ? cols[2] : null; });
Object.assign(TOPS, {
  regata: { c: X => X.col('topColor', 1), sl: 0, t: X => { const b = X.B.b, m = M.X(TOR(X), M.rect(15 - b, 31, 18 - b, 37), M.rect(29 + b, 31, 32 + b, 37), M.rect(19, 31, 28, 33)); const R = cloth(X, m, X.col('topColor', 1)); X.C.hline(49, 17, 30, R[1]);
      [[13 - b, 36], [12 - b, 37], [34 + b, 36], [35 + b, 37]].forEach(([x, y]) => X.C.put(x, y, X.SK[3])); X.C.dots([[20, 36], [21, 37], [27, 37], [26, 36]], X.SK[1]); } },
  camisa: { c: X => X.col('topColor', 2), sl: 48, t: X => { const c = X.col('topColor', 2), R = cloth(X, TOR(X), c); vOpen(X, X.SK[2], 34, 2); X.C.dots([[19, 31], [20, 32], [21, 33], [28, 31], [27, 32], [26, 33]], R[3]); X.C.dots([[19, 32], [28, 32]], R[1]);
      X.C.vline(23, 35, 48, R[1]); buttons(X, 24, [36, 40, 44], R[4]); X.C.hline(49, 16, 31, R[1]); }, cuff: (X, sl) => { const R = RAMP(X.col('topColor', 2)); sl.forEach(i => { const y = (i / PW) | 0; if (y >= 47 && X.C.at(i % PW, y) !== R[0]) X.C.put(i % PW, y, R[3]); }); } },
  polo: { c: X => X.col('topColor', 3), sl: 40, t: X => { const c = X.col('topColor', 3), R = cloth(X, TOR(X), c); X.C.vol(M.rows(30, [[19, 22], [19, 23], [20, 22]]), R, { flat: 1 }); X.C.vol(M.rows(30, [[25, 28], [24, 28], [25, 27]]), R, { flat: 1 });
      X.C.vline(23, 32, 37, R[1]); buttons(X, 24, [33, 36], R[4]); X.C.dots([[28, 36], [29, 36], [28, 37]], R[4]); X.C.hline(49, 16, 31, R[1]); }, cuff: (X, sl) => { const R = RAMP(X.col('topColor', 3)); sl.forEach(i => { if (((i / PW) | 0) === 40) X.C.put(i % PW, 40, R[3]); }); } },
  hoodie: { c: X => X.col('topColor', 5), sl: 48, t: X => { const c = X.col('topColor', 5), R = cloth(X, TOR(X), c); X.C.vol(M.rows(29, [[17, 30], [16, 31], [16, 19], [16, 18]]).add(32 * PW + 29).add(32 * PW + 30).add(31 * PW + 28), R, { lx: .5 });
      X.C.vol(M.rows(41, [[18, 29], [17, 30], [17, 30], [16, 31], [16, 31], [16, 31], [17, 30]]), R, { lx: .9, t1: .1, t2: .85 }); X.C.vline(21, 33, 39, '#EDEDEA'); X.C.vline(26, 33, 38, '#EDEDEA'); X.C.dots([[21, 40], [26, 39]], '#B8B8B4'); X.C.hline(49, 16, 31, R[1]); },
    cuff: (X, sl) => { const R = RAMP(X.col('topColor', 5)); sl.forEach(i => { const y = (i / PW) | 0; if (y >= 47 && X.C.at(i % PW, y) !== R[0]) X.C.put(i % PW, y, R[1]); }); } },
  couro: { c: () => '#2A221E', sl: 48, t: X => { const R = cloth(X, TOR(X), '#2A221E', { shine: 1 }); vOpen(X, X.col('topColor', 2), 44, 4); X.C.line(19, 31, 22, 44, R[3]); X.C.line(28, 31, 26, 44, R[0]); X.C.vol(M.rows(31, [[16, 19], [16, 20], [17, 20]]), R, { shine: 1 }); X.C.vol(M.rows(31, [[28, 31], [27, 31], [27, 30]]), R, { shine: 1 });
      X.C.vline(26, 36, 48, '#B8C0CC'); X.C.dots([[18, 42], [19, 42], [29, 42], [30, 42]], '#B8C0CC'); X.C.hline(48, 16, 31, R[0]); X.C.hline(49, 16, 31, R[1]); } },
  blazer: { c: X => X.col('topColor', 3), sl: 48, t: X => { const c = X.col('topColor', 3), R = cloth(X, TOR(X), c); vOpen(X, '#ECECE8', 46, 4); X.C.hline(31, 21, 26, '#D8D8D4'); lapels(X, R, 44); X.C.dots([[18, 44], [19, 44], [29, 44], [30, 44]], R[1]); buttons(X, 21, [45], R[4]); X.C.hline(49, 16, 31, R[1]); } },
  fato: { c: X => X.col('topColor', 3), sl: 48, t: X => { const c = X.col('topColor', 3), R = cloth(X, TOR(X), c); vOpen(X, '#F4F4F0', 42, 4); lapels(X, R); tie(X, c === '#8E2434' ? '#24467A' : '#A2283A'); X.C.dots([[28, 36], [29, 36], [30, 36]], '#F4F4F0'); X.C.put(29, 35, '#FFFFFF');
      buttons(X, 23, [44, 47], R[0]); X.C.dots([[18, 45], [19, 45], [28, 45], [29, 45]], R[1]); X.C.hline(49, 16, 31, R[1]); }, cuff: (X, sl, s) => { const B = X.B, xs = s === 'L' ? B.hL : B.hR; X.C.hline(48, xs[0] + 1, xs[1] - 1, '#F4F4F0'); } },
  smoking: { c: () => '#16171D', sl: 48, t: X => { const R = cloth(X, TOR(X), '#16171D'); vOpen(X, '#F6F6F2', 44, 4); X.C.line(19, 31, 23, 44, '#4A4E60'); X.C.line(28, 31, 24, 44, '#2A2D3A'); X.C.line(18, 32, 22, 42, '#3A3E50'); X.C.line(29, 32, 25, 42, '#22252F');
      X.C.dots([[21, 32], [22, 32], [25, 32], [26, 32], [21, 33], [26, 33], [23, 32], [24, 32]], '#0C0C10'); X.C.dots([[23, 36], [23, 39], [23, 42]], '#0C0C10'); X.C.hline(49, 16, 31, R[0]); }, cuff: (X, sl, s) => { const xs = s === 'L' ? X.B.hL : X.B.hR; X.C.hline(48, xs[0] + 1, xs[1] - 1, '#F6F6F2'); } },
  farda: { c: () => '#56653A', sl: 48, t: X => { const m = TOR(X), R = cloth(X, m, '#56653A'); camo(X, m, ['#3A4626', '#7A8450', '#2E2A1E']); X.C.vol(M.rect(17, 36, 21, 40), R, { flat: 1 }); X.C.vol(M.rect(26, 36, 30, 40), R, { flat: 1 }); X.C.hline(46, 16, 31, '#2A2418'); X.C.hline(47, 16, 31, '#3A3222'); X.C.dots([[23, 46], [24, 46], [23, 47], [24, 47]], '#C9A040');
      X.C.dots([[28, 33], [29, 33], [30, 33]], '#D9B040'); X.C.hline(31, 20, 27, R[0]); }, cuff: (X, sl) => camo(X, sl, ['#3A4626', '#7A8450', '#2E2A1E']) },
  gi: { c: () => '#F2F0EA', sl: 44, t: X => { const R = cloth(X, TOR(X), '#F2F0EA'); for (let k = 0; k <= 12; k++) { X.C.put(19 + k, 31 + k, R[1]); X.C.put(20 + k, 31 + k, '#E0DCD2'); } X.C.line(28, 31, 25, 36, R[1]); vOpen(X, X.SK[2], 36, 3);
      X.C.hline(44, 16, 31, '#16161A'); X.C.hline(45, 16, 31, '#24242A'); X.C.vol(M.rect(21, 44, 26, 46), RAMP('#24242A'), { flat: 1 }); X.C.vline(21, 47, 52, '#16161A'); X.C.vline(26, 47, 51, '#16161A'); X.C.dots([[22, 45]], '#B02A2A'); } },
  brasil: { c: () => '#F7D21E', sl: 40, t: X => { const R = cloth(X, TOR(X), '#F7D21E'); X.C.dots([[20, 31], [21, 32], [22, 33], [23, 33], [24, 33], [25, 33], [26, 32], [27, 31]], '#1E9A48'); X.C.dots([[19, 31], [28, 31]], '#167A38');
      const cr = M.rows(34, [[17, 20], [17, 20], [17, 20], [18, 19]]); X.C.vol(cr, RAMP('#1E5AC8'), { flat: 1 }); X.C.put(18, 35, '#F7D21E'); X.C.dots([[17, 33], [18, 33], [19, 33], [20, 33]], '#1E9A48'); X.C.dots([[28, 35], [29, 35]], '#1E9A48'); X.C.hline(49, 16, 31, '#1E9A48'); },
    cuff: (X, sl) => sl.forEach(i => { if (((i / PW) | 0) >= 39) X.C.put(i % PW, (i / PW) | 0, '#1E9A48'); }) },
  basquete: { c: X => X.col('topColor', 6), sl: 0, t: X => { const b = X.B.b, c = X.col('topColor', 6), m = M.X(TOR(X), M.rect(15 - b, 31, 18 - b, 38), M.rect(29 + b, 31, 32 + b, 38), M.rows(31, [[19, 28], [20, 27], [21, 26]])), R = cloth(X, m, c);
      const n = '#F4F4F0'; [[20, 37], [21, 37], [22, 37], [22, 38], [22, 39], [21, 40], [20, 41], [20, 42], [21, 42], [22, 42], [25, 37], [26, 37], [27, 37], [27, 38], [26, 39], [27, 40], [27, 41], [25, 42], [26, 42]].forEach(([x, y]) => X.C.put(x, y, n));
      X.C.line(19, 32, 18 - b, 39, n); X.C.line(28, 32, 29 + b, 39, n); X.C.hline(49, 16, 31, R[1]); } },
  sobretudo: { c: X => X.col('topColor', 0), sl: 48, t: X => { const c = X.col('topColor', 0), m = M.U(TOR(X), skirt(60, 3)), R = cloth(X, m, c); vOpen(X, '#E8E4DA', 38, 3); lapels(X, R, 39);
      X.C.vline(23, 40, 60, R[0]); buttons(X, 20, [41, 45], R[4]); buttons(X, 27, [41, 45], R[4]); X.C.hline(47, 15, 32, R[1]); X.C.hline(48, 15, 32, R[0]); X.C.dots([[23, 47], [24, 47], [23, 48], [24, 48]], '#C9A040'); } },
  monge: { c: () => '#D4761E', sl: 48, t: X => { const m = M.U(TOR(X), skirt(66, 3)), R = cloth(X, m, '#D4761E'); for (let k = 0; k < 18; k++) { X.C.put(17 + k, 31 + k, '#9A4A10'); X.C.put(17 + k, 32 + k, '#B85E16'); } X.C.hline(46, 16, 31, '#6A4A26'); X.C.dots([[21, 47], [21, 48], [22, 49], [21, 50]], '#6A4A26'); } },
  mago: { c: () => '#4A2A92', sl: 48, slc: () => '#4A2A92', t: X => { const m = M.U(TOR(X), skirt(67, 4)), R = cloth(X, m, '#4A2A92'); vOpen(X, X.SK[2], 35, 3); X.C.line(19, 31, 23, 36, '#E2B84A'); X.C.line(28, 31, 24, 36, '#B8902A');
      X.C.vline(23, 37, 67, '#E2B84A'); X.C.vline(24, 37, 67, '#B8902A'); X.C.hline(46, 16, 31, '#E2B84A'); [[18, 40], [29, 44], [19, 54], [28, 58], [17, 63], [27, 51], [30, 64]].forEach(([x, y]) => { X.C.put(x, y, '#FFE680'); X.C.put(x + 1, y, '#C8A030'); X.C.put(x, y + 1, '#C8A030'); }); X.C.hline(67, 12, 35, '#E2B84A'); },
    cuff: (X, sl, s) => { const b = X.B.b, t = X.B.t, m = s === 'L' ? M.rect(8 - b - t, 44, 15 - b, 49) : M.rect(32 + b, 44, 39 + b + t, 49); X.C.vol(m, RAMP('#4A2A92')); X.C.hline(49, s === 'L' ? 8 - b - t : 32 + b, s === 'L' ? 15 - b : 39 + b + t, '#E2B84A'); } },
  manto: { c: () => '#9A1E30', sl: 48, t: X => { const R = cloth(X, TOR(X), '#9A1E30'); const er = M.rows(30, [[17, 30], [15, 32], [15, 32], [15, 22], [15, 21], [16, 20]]).add(33 * PW + 26).add(33 * PW + 27); M.rows(33, [[25, 32], [26, 32], [27, 31]]).forEach(i => er.add(i));
      X.C.vol(er, RAMP('#F2EEE4'), { lx: .5 }); [[17, 31], [21, 32], [26, 31], [30, 32], [18, 34], [29, 34], [24, 31]].forEach(([x, y]) => X.C.put(x, y, '#141414')); X.C.vline(23, 36, 48, '#E8B84A'); X.C.vline(24, 36, 48, '#B8862A');
      X.C.vol(M.ell(24, 37, 2.2, 2.2), METAL.ouro, { shine: 1 }); X.C.put(24, 37, '#C82838'); X.C.hline(46, 16, 31, '#E8B84A'); } },
  'a-couro': { c: () => '#7A4A2A', sl: 40, slc: () => '#5A3A22', hand: (X, hand) => X.C.vol(M.where(hand, (x, y) => y <= 50), RAMP('#5A3A22')), t: X => { const R = cloth(X, TOR(X), '#7A4A2A', { shine: 0 });
      X.C.tex(TOR(X), (x, y) => (x + y * 3) % 7 === 0 ? R[1] : null); for (let k = 0; k <= 15; k++) { X.C.put(17 + k, 32 + k, '#3E2414'); X.C.put(18 + k, 32 + k, '#5A3A22'); } X.C.put(25, 40, '#C0C8D0'); X.C.hline(46, 16, 31, '#3E2414'); X.C.hline(47, 16, 31, '#5A3A22'); X.C.dots([[23, 46], [24, 46], [23, 47], [24, 47]], '#C0C8D0');
      [[17, 34], [17, 38], [30, 34], [30, 38]].forEach(([x, y]) => X.C.put(x, y, '#E0B070')); },
    cuff: (X, sl, s) => { const b = X.B.b, t = X.B.t, m = s === 'L' ? M.rect(10 - b - t, 43, 14 - b, 48) : M.rect(33 + b, 43, 37 + b + t, 48); X.C.vol(m, RAMP('#5A3A22')); X.C.hline(45, s === 'L' ? 11 - b - t : 34 + b, s === 'L' ? 13 - b : 36 + b + t, '#E0B070'); },
    over: X => pauld(X, RAMP('#8A5A34')) },
  'a-malha': { c: () => '#8E98A6', sl: 48, t: X => { const m = TOR(X), R = cloth(X, m, '#8E98A6'); X.C.tex(m, (x, y) => (x + (y % 2)) % 2 ? R[1] : (y % 2 ? R[3] : null)); gorget(X, RAMP('#8E98A6')); X.C.hline(46, 16, 31, '#4A3424'); X.C.hline(47, 16, 31, '#6A4A30'); X.C.dots([[23, 46], [24, 46]], '#C0C8D0'); },
    cuff: (X, sl) => { const R = RAMP('#8E98A6'); X.C.tex(sl, (x, y) => (x + (y % 2)) % 2 ? R[1] : null); } },
  'a-ferro': { c: () => METAL.prata[2], sl: 48, slc: () => METAL.prata, cuff: ARMSL(METAL.prata), hand: gaunt(METAL.prata), t: X => plate(X, METAL.prata, { belt: '#4A3424' }), over: X => pauld(X, METAL.prata) },
  'a-cavaleiro': { c: () => METAL.aco[2], sl: 48, slc: () => METAL.aco, cuff: ARMSL(METAL.aco), hand: gaunt(METAL.aco), t: X => { plate(X, METAL.aco); const tb = M.U(M.rect(18, 34, 29, 49), skirt(56, 0)), T = RAMP('#2659B8'); X.C.vol(M.where(tb, (x, y) => x >= 18 && x <= 29), T, { lx: .8 });
      X.C.vline(23, 36, 52, '#F2F2EE'); X.C.vline(24, 36, 52, '#D6D6D2'); X.C.hline(41, 19, 28, '#F2F2EE'); X.C.hline(42, 19, 28, '#D6D6D2'); X.C.hline(47, 16, 31, '#5A3A22'); X.C.dots([[23, 47], [24, 47]], '#E2B84A'); }, over: X => pauld(X, METAL.aco, { trim: '#E2B84A' }) },
  'a-espartano': { c: () => METAL.bronze[2], sl: 0, hand: (X, hand, s) => {}, t: X => { const R = METAL.bronze, m = TOR(X); X.C.vol(m, R, { shine: 1, lx: .7 });
      [[19, 35, 22, 38], [25, 35, 28, 38]].forEach(([a, b, c, d]) => { X.C.line(a, d, c, d, R[1]); X.C.line(a, b, a, d, R[3]); }); [40, 43].forEach(y => { X.C.hline(y, 20, 22, R[1]); X.C.hline(y, 25, 27, R[1]); X.C.hline(y + 1, 20, 22, R[3]); X.C.hline(y + 1, 25, 27, R[3]); }); X.C.vline(23, 34, 46, R[1]); X.C.vline(24, 34, 46, R[3]);
      X.C.hline(47, 16, 31, '#6A3A1A'); X.C.hline(48, 16, 31, '#8A4A22'); },
    cuff: () => {}, over: X => { const b = X.B.b, t = X.B.t; [[10 - b - t, 14 - b], [33 + b, 37 + b + t]].forEach(([a, c]) => { X.C.vol(M.rect(a, 42, c, 48), METAL.bronze, { shine: 1 }); X.C.hline(45, a + 1, c - 1, METAL.bronze[1]); }); } },
  'a-samurai': { c: () => '#A0282A', sl: 48, slc: () => '#26262E', t: X => { const m = TOR(X), R = cloth(X, m, '#A0282A', { shine: 1 }); [35, 38, 41, 44, 47].forEach(y => { X.C.hline(y, 16, 31, R[0]); for (let x = 17; x <= 30; x += 3) X.C.put(x, y - 1, '#E2B84A'); });
      X.C.vol(M.rows(30, [[19, 28], [18, 29], [18, 29]]), RAMP('#26262E')); },
    over: X => { const b = X.B.b, t = X.B.t; [[7 - b - t, 15 - b], [32 + b, 40 + b + t]].forEach(([a, c]) => { const s = M.rect(a, 32, c, 41), R = RAMP('#A0282A'); X.C.vol(s, R, { shine: 1 }); [34, 37, 40].forEach(y => { X.C.hline(y, a + 1, c - 1, R[0]); for (let x = a + 1; x < c; x += 2) X.C.put(x, y - 1, '#E2B84A'); }); }); } },
  'a-ouro': { c: () => METAL.ouro[2], sl: 48, slc: () => METAL.ouro, cuff: ARMSL(METAL.ouro), hand: gaunt(METAL.ouro), t: X => { plate(X, METAL.ouro, { belt: '#5A2A10', buckle: '#E8F4FF' }); X.C.vol(M.ell(24, 36, 2.6, 2.6), RAMP('#2E8AF0'), { shine: 1 }); X.C.dots([[19, 41], [20, 42], [28, 41], [27, 42]], METAL.ouro[4]); },
    over: X => pauld(X, METAL.ouro, { trim: '#FFF4C0' }) },
  'a-futurista': { c: () => '#252B36', sl: 48, slc: () => '#252B36', hand: gaunt(RAMP('#3A4250')), t: X => { const m = TOR(X), R = cloth(X, m, '#252B36', { shine: 1 }); X.C.vline(18, 33, 48, '#3AE4FF'); X.C.vline(29, 33, 48, '#3AE4FF'); X.C.hline(44, 18, 29, '#1AA8D0');
      X.C.vol(M.ell(24, 37.5, 3.2, 3.2), ['#0A3A4A', '#1890B8', '#3AE4FF', '#9AF4FF', '#FFFFFF'], { shine: 1, lx: .5 }); gorget(X, RAMP('#3A4250')); },
    cuff: (X, sl) => sl.forEach(i => { const x = i % PW, y = (i / PW) | 0; if (y === 44) X.C.put(x, y, '#3AE4FF'); }), over: X => pauld(X, RAMP('#3A4250'), { trim: '#3AE4FF' }) },
  'a-dragao': { c: () => '#7A1A1A', sl: 48, slc: () => '#5A1212', hand: gaunt(RAMP('#3A0E0E')), t: X => { const m = TOR(X), R = cloth(X, m, '#7A1A1A', { shine: 1 }); X.C.tex(m, (x, y) => (y % 3 === 0 && (x + y) % 4 === 0) ? R[0] : (y % 3 === 1 && (x + y) % 4 === 1) ? R[3] : null);
      X.C.vol(M.ell(24, 38, 2.6, 3), ['#5A1A00', '#C04A00', '#FF7A1A', '#FFC060', '#FFF2C0'], { shine: 1 }); X.C.hline(47, 16, 31, '#2A0A0A'); X.C.dots([[23, 47], [24, 47]], '#E2B84A'); gorget(X, RAMP('#3A0E0E')); },
    cuff: (X, sl) => { const R = RAMP('#5A1212'); X.C.tex(sl, (x, y) => (y % 3 === 0) ? R[0] : null); }, over: X => pauld(X, RAMP('#3A0E0E'), { spike: '#E2B84A', trim: '#E2B84A' }) },
  'a-dominus': { c: () => METAL.negro[2], sl: 48, slc: () => METAL.negro, cuff: (X, sl) => sl.forEach(i => { const x = i % PW, y = (i / PW) | 0; if (y === 44) X.C.put(x, y, '#E2B84A'); if (y === 41 && x % 2) X.C.put(x, y, '#3FA9FF'); }), hand: gaunt(METAL.negro),
    t: X => { plate(X, METAL.negro, { belt: '#E2B84A', buckle: '#3FA9FF' }); const b = X.B.b; X.C.vline(16 - b, 33, 46, '#E2B84A'); X.C.vline(31 + b, 33, 46, '#E2B84A'); X.C.vol(M.ell(24, 36.5, 3, 3), ['#04224A', '#0E5AB0', '#2A8CFF', '#8ACFFF', '#FFFFFF'], { shine: 1 });
      [[20, 40], [27, 40], [21, 42], [26, 42]].forEach(([x, y]) => X.C.put(x, y, '#3FA9FF')); },
    over: X => pauld(X, METAL.negro, { trim: '#E2B84A', spike: '#E2B84A' }) } });
// ======== pernas ========
const pants = (X, c, o) => { const R = RAMP(c); X.C.vol(X.B.legL, R, o); X.C.vol(X.B.legR, R, o); return R; };
const greave = (X, R, y0 = 55) => { [[16, 22], [25, 31]].forEach(([a, b]) => { X.C.vol(M.rect(a, y0, b, 65), R, { shine: 1 }); X.C.vol(M.ell((a + b + 1) / 2, y0 + 1, 3.6, 2.2), R, { shine: 1 }); X.C.put((a + b + 1) / 2 - 1, y0 + 1, R[4]); }); };
Object.assign(LEGS, {
  preta: X => { const R = pants(X, '#24272E'); X.C.hline(49, 16, 31, R[1]); X.C.vline(19, 52, 64, R[3]); X.C.vline(28, 52, 64, R[3]); },
  social: X => { const R = pants(X, X.col('legsColor', 3)); X.C.hline(49, 16, 31, R[1]); X.C.vline(19, 51, 64, R[3]); X.C.vline(28, 51, 64, R[3]); X.C.hline(49, 16, 31, '#1A1A1E'); X.C.dots([[23, 49], [24, 49]], '#B8C0CC'); },
  calcao: X => { const c = X.col('legsColor', 4), R = RAMP(c); X.C.vol(M.rect(16, 49, 23, 57), R); X.C.vol(M.rect(24, 49, 31, 57), R); X.C.vline(16, 51, 56, '#F4F4F0'); X.C.vline(31, 51, 56, '#F4F4F0'); X.C.hline(49, 17, 30, R[1]); [[18, 59], [29, 59]].forEach(([x, y]) => X.C.put(x, y, X.SK[3])); },
  treino: X => { const R = pants(X, X.col('legsColor', 1)); X.C.vline(17, 51, 63, '#F4F4F0'); X.C.vline(30, 51, 63, '#F4F4F0'); X.C.hline(49, 16, 31, R[1]); X.C.hline(64, 17, 21, R[3]); X.C.hline(64, 26, 30, R[3]); },
  cargo: X => { const R = pants(X, X.col('legsColor', 7)); X.C.hline(49, 16, 31, R[1]); X.C.vol(M.rect(16, 55, 19, 59), R, { flat: 1 }); X.C.vol(M.rect(28, 55, 31, 59), R, { flat: 1 }); X.C.hline(56, 16, 19, R[1]); X.C.hline(56, 28, 31, R[1]); },
  'l-couro': X => { const R = pants(X, '#5A3A22'); [[16, 22], [25, 31]].forEach(([a, b]) => { X.C.vol(M.rect(a, 56, b, 60), RAMP('#8A5A34')); X.C.hline(58, a + 1, b - 1, '#E0B070'); }); X.C.hline(49, 16, 31, R[0]); X.C.tex(X.B.legL, (x, y) => (y % 4 === 0 && y < 55) ? R[1] : null); X.C.tex(X.B.legR, (x, y) => (y % 4 === 0 && y < 55) ? R[1] : null); },
  'l-ferro': X => { pants(X, '#3A3E48'); X.C.vol(M.rows(49, [[16, 31], [16, 31], [16, 31], [16, 23], [16, 22]]).add(52 * PW + 24).add(52 * PW + 25), METAL.prata, { shine: 1 }); greave(X, METAL.prata); },
  'l-ouro': X => { pants(X, '#5A3A12'); X.C.vol(M.rect(16, 49, 31, 52), METAL.ouro, { shine: 1 }); greave(X, METAL.ouro); },
  'l-espartano': X => { const B = METAL.bronze; X.C.vol(M.rect(15, 49, 32, 55), RAMP('#8A2A22')); for (let x = 16; x <= 31; x += 2) X.C.vline(x, 50, 55, '#5A1612'); X.C.hline(55, 15, 32, '#E2B84A'); greave(X, B, 57); },
  'l-samurai': X => { pants(X, '#26262E'); const R = RAMP('#A0282A'); X.C.vol(M.rect(15, 49, 32, 58), R, { shine: 1 }); [51, 54, 57].forEach(y => { X.C.hline(y, 16, 31, R[0]); for (let x = 17; x <= 30; x += 3) X.C.put(x, y - 1, '#E2B84A'); }); X.C.vline(23, 49, 58, R[0]); X.C.vline(24, 49, 58, R[0]); },
  'l-futurista': X => { const R = pants(X, '#252B36', { shine: 1 }); X.C.vline(17, 50, 64, '#3AE4FF'); X.C.vline(30, 50, 64, '#3AE4FF'); X.C.vol(M.rect(17, 56, 21, 59), RAMP('#3A4250'), { shine: 1 }); X.C.vol(M.rect(26, 56, 30, 59), RAMP('#3A4250'), { shine: 1 }); X.C.dots([[19, 57], [28, 57]], '#3AE4FF'); },
  'l-dragao': X => { const R = pants(X, '#6A1616', { shine: 1 }); [X.B.legL, X.B.legR].forEach(m => X.C.tex(m, (x, y) => (y % 3 === 0 && (x + y) % 4 === 0) ? R[0] : (y % 3 === 1 && (x + y) % 4 === 1) ? R[3] : null)); greave(X, RAMP('#3A0E0E'), 57); X.C.dots([[19, 58], [28, 58]], '#E2B84A'); },
  'l-dominus': X => { pants(X, '#141824'); X.C.vol(M.rect(16, 49, 31, 52), METAL.negro, { shine: 1 }); X.C.hline(52, 16, 31, '#E2B84A'); greave(X, METAL.negro); X.C.vline(19, 58, 64, '#3FA9FF'); X.C.vline(28, 58, 64, '#3FA9FF'); } });
// ======== pés ========
const boot = (X, R, top = 60, o = {}) => { [[X.B.footL, M.rect(16, top, 22, 65)], [X.B.footR, M.rect(25, top, 31, 65)]].forEach(([f, s]) => { X.C.vol(M.U(f, s), R, o); }); X.C.hline(69, 14, 22, R[0]); X.C.hline(69, 25, 33, R[0]); };
Object.assign(FEET, {
  sociais: { f: X => { const R = ['#050508', '#121218', '#1E1E26', '#4A4A58', '#9A9AB0']; X.C.vol(X.B.footL, R, { shine: 1 }); X.C.vol(X.B.footR, R, { shine: 1 }); X.C.hline(69, 14, 22, '#050508'); X.C.hline(69, 25, 33, '#050508'); } },
  botas: { skin: false, f: X => { const R = RAMP('#6A4224'); boot(X, R, 60); X.C.hline(61, 16, 22, R[3]); X.C.hline(61, 25, 31, R[3]); X.C.dots([[19, 63], [19, 65], [28, 63], [28, 65]], R[1]); X.C.hline(68, 14, 22, R[1]); X.C.hline(68, 25, 33, R[1]); } },
  chuteiras: { f: X => { const c = X.col('feetColor', 1), R = RAMP(c === '#EEEEEA' ? '#23262E' : c); X.C.vol(X.B.footL, R, { shine: 1 }); X.C.vol(X.B.footR, R, { shine: 1 }); X.C.dots([[17, 67], [18, 67], [19, 66], [30, 67], [29, 67], [28, 66]], '#F4F4F0'); for (let x = 15; x <= 21; x += 2) { X.C.put(x, 69, '#E8E8E4'); X.C.put(x + 11, 69, '#E8E8E4'); } } },
  sandalias: { f: X => { const T = '#7A4A26'; X.C.hline(67, 15, 21, T); X.C.hline(67, 26, 32, T); X.C.vline(18, 64, 67, T); X.C.vline(29, 64, 67, T); X.C.hline(69, 14, 22, '#4A2A16'); X.C.hline(69, 25, 33, '#4A2A16'); X.C.dots([[15, 68], [17, 68], [19, 68], [21, 68], [26, 68], [28, 68], [30, 68], [32, 68]], X.SK[1]); } },
  descalco: { f: X => { X.C.dots([[15, 68], [17, 68], [19, 68], [21, 68], [26, 68], [28, 68], [30, 68], [32, 68]], X.SK[1]); X.C.hline(69, 14, 22, X.SK[0]); X.C.hline(69, 25, 33, X.SK[0]); } },
  'f-ferro': { skin: false, f: X => { boot(X, METAL.prata, 62, { shine: 1 }); [64, 67].forEach(y => { X.C.hline(y, 15, 21, METAL.prata[1]); X.C.hline(y, 26, 32, METAL.prata[1]); }); } },
  'f-ouro': { skin: false, f: X => { boot(X, METAL.ouro, 62, { shine: 1 }); [64, 67].forEach(y => { X.C.hline(y, 15, 21, METAL.ouro[1]); X.C.hline(y, 26, 32, METAL.ouro[1]); }); } },
  'f-dominus': { skin: false, f: X => { boot(X, METAL.negro, 62, { shine: 1 }); X.C.hline(64, 15, 21, '#E2B84A'); X.C.hline(64, 26, 32, '#E2B84A'); X.C.dots([[18, 67], [29, 67]], '#3FA9FF'); } } });
// ======== capas ========
const capeOf = (c, o = {}) => (X, ph) => { const b = X.B.b, t = X.B.t, R = Array.isArray(c) ? c : RAMP(c);
  if (ph === 'back') { const m = M.U(...Array.from({ length: 36 }, (_, k) => { const y = 31 + k, w = Math.min(7, Math.floor(k / 3)); return M.rect(13 - b - t - w, y, 34 + b + t + w, y); }), M.where(M.rect(4 - b, 67, 43 + b, 68), (x, y) => (x >> 1) % 2 === (y - 67))); X.C.vol(m, R, { lx: .5, t1: .25, t2: .7 });
    for (let k = 0; k < 6; k++) { const x = 8 - b + k * 6; X.C.line(x, 46, x - 1, 66, R[1]); } if (o.trim) X.C.tex(m, (x, y) => y >= 64 ? o.trim : null); if (o.dots) [[7, 50], [40, 50], [6, 60], [41, 60], [9, 42], [38, 42]].forEach(([x, y]) => X.C.put(x, y, o.dots)); }
  else { X.C.vol(M.rows(30, [[15 - b, 19], [14 - b, 19], [14 - b, 18]]), R, { lx: .5 }); X.C.vol(M.rows(30, [[28, 32 + b], [28, 33 + b], [29, 33 + b]]), R, { lx: .5 }); if (o.collar) { X.C.vol(M.rows(29, [[15, 20], [14, 20]]), RAMP(o.collar)); X.C.vol(M.rows(29, [[27, 32], [27, 33]]), RAMP(o.collar)); if (o.collar === '#F2EEE4') X.C.dots([[16, 29], [19, 30], [29, 29], [31, 30]], '#141414'); }
    X.C.vol(M.ell(19, 32.5, 1.6, 1.6), METAL.ouro, { shine: 1 }); X.C.vol(M.ell(28, 32.5, 1.6, 1.6), METAL.ouro, { shine: 1 }); } };
Object.assign(CAPES, { vermelha: capeOf('#B82230'), azul: capeOf('#2456C0'), preta: capeOf('#1E2030'), real: capeOf('#5E1E86', { trim: '#F2EEE4', collar: '#F2EEE4' }), dourada: capeOf(METAL.ouro, { trim: '#FFF4C0', dots: '#FFF4C0' }), dominus: capeOf('#0E1A3A', { trim: '#E2B84A', dots: '#3FA9FF', collar: '#E2B84A' }) });
// ======== escudos (braço esquerdo) ========
const heater = (x0, y0, w, h) => M.U(M.rect(x0, y0, x0 + w - 1, y0 + h - 1), ...Array.from({ length: Math.ceil(w / 2) }, (_, k) => M.rect(x0 + k, y0 + h + k, x0 + w - 1 - k, y0 + h + k)));
const SHD = (fn) => X => { const b = X.B.b, t = X.B.t, x0 = 4 - b - t; fn(X, x0); };
Object.assign(SHIELDS, {
  madeira: SHD((X, x0) => { const m = M.ell(x0 + 6, 45, 6.5, 7.5); X.C.vol(m, RAMP('#9A6232')); for (let x = x0 + 2; x <= x0 + 10; x += 3) X.C.tex(m, (a, y) => a === x ? '#6A3E1E' : null); X.C.tex(m, (x, y) => { const dx = x + .5 - (x0 + 6), dy = y + .5 - 45; return (dx * dx / 30 + dy * dy / 42 > .78) ? '#9AA6B8' : null; }); X.C.vol(M.ell(x0 + 6, 45, 2, 2), METAL.prata, { shine: 1 }); }),
  ferro: SHD((X, x0) => { const m = heater(x0, 36, 12, 13); X.C.vol(m, METAL.prata, { shine: 1, lx: .6 }); X.C.vline(x0 + 5, 38, 52, METAL.prata[1]); X.C.vline(x0 + 6, 38, 52, METAL.prata[3]); X.C.dots([[x0 + 2, 38], [x0 + 9, 38], [x0 + 2, 46], [x0 + 9, 46]], METAL.prata[4]); }),
  cavaleiro: SHD((X, x0) => { const m = heater(x0, 36, 12, 13); X.C.vol(m, METAL.aco, { shine: 1 }); X.C.vol(heater(x0 + 1, 37, 10, 12), RAMP('#2659B8'), { lx: .6 }); X.C.vline(x0 + 5, 38, 53, '#F2F2EE'); X.C.vline(x0 + 6, 38, 53, '#D6D6D2'); X.C.hline(42, x0 + 2, x0 + 9, '#F2F2EE'); X.C.hline(43, x0 + 2, x0 + 9, '#D6D6D2'); }),
  espartano: SHD((X, x0) => { const m = M.ell(x0 + 6, 45, 7, 8); X.C.vol(m, METAL.bronze, { shine: 1, lx: .55 }); X.C.vol(M.ell(x0 + 6, 45, 5, 6), RAMP('#9A2A20'), { lx: .55 }); const L = '#E2B84A'; X.C.line(x0 + 6, 41, x0 + 3, 49, L); X.C.line(x0 + 6, 41, x0 + 9, 49, L); }),
  dominus: SHD((X, x0) => { const m = M.U(heater(x0, 34, 12, 16), M.rows(33, [[x0 + 2, x0 + 9]])); X.C.vol(m, METAL.negro, { shine: 1 }); X.C.tex(m, (x, y) => (x === x0 + 1 || x === x0 + 10) && y < 50 ? '#E2B84A' : null); X.C.vol(M.ell(x0 + 6, 41, 2.5, 3), ['#04224A', '#0E5AB0', '#2A8CFF', '#8ACFFF', '#FFFFFF'], { shine: 1 }); X.C.vline(x0 + 5, 45, 54, '#3FA9FF'); X.C.vline(x0 + 6, 45, 54, '#2A6AC0'); }) });
// ======== cabeça: chapéus e elmos ========
const dome = (cy = 10.5, ry = 7.6, y1 = 11) => M.where(M.ell(24, cy, 10.9, ry), (x, y) => y <= y1);
Object.assign(HEADS, {
  bone: X => { const c = X.col('headColor', 3), R = RAMP(c); X.C.vol(M.U(dome(), M.rect(14, 10, 33, 11)), R, { lx: .6 }); X.C.line(24, 3, 18, 10, R[1]); X.C.line(24, 3, 30, 10, R[1]); X.C.vol(M.ell(24, 3.2, 1.3, 1), R);
    X.C.vol(M.rows(12, [[13, 34], [12, 35], [13, 34]]), RAMP(shade(c, .75)), { lx: .6 }); X.C.hline(14, 14, 33, shade(c, .35)); X.C.vol(M.rect(21, 6, 26, 9), RAMP('#EEEEEA'), { flat: 1 }); X.C.dots([[23, 7], [24, 8]], c); },
  bonetras: X => { const c = X.col('headColor', 3), R = RAMP(c); X.C.vol(M.rows(1, [[18, 29], [17, 30], [18, 29]]), RAMP(shade(c, .7))); X.C.vol(M.U(dome(), M.rect(14, 10, 33, 12)), R, { lx: .6 }); X.C.line(24, 3, 18, 10, R[1]); X.C.line(24, 3, 30, 10, R[1]);
    X.C.vol(M.rect(21, 9, 26, 12), RAMP(X.hc), { flat: 1 }); X.C.hline(12, 20, 27, R[0]); X.C.dots([[22, 11], [24, 11], [26, 11]], R[4]); },
  gorro: X => { const c = X.col('headColor', 6), R = RAMP(c); X.C.vol(dome(10, 8.6, 11), R, { lx: .6 }); X.C.tex(dome(10, 8.6, 11), (x, y) => (x % 3 === 0) ? R[1] : null); const cf = M.rows(10, [[14, 33], [13, 34], [13, 34], [14, 33]]); X.C.vol(cf, R); for (let x = 14; x <= 33; x += 2) X.C.vline(x, 11, 12, R[1]);
    const p = M.ell(24, 1.8, 3, 2.2); X.C.vol(p, RAMP('#F2F0EA')); X.C.dots([[23, 1], [25, 2]], '#D8D4CA'); },
  bandana: X => { const c = X.col('headColor', 6), R = RAMP(c), m = M.rows(9, [[16, 31], [14, 33], [14, 33], [15, 32]]); X.C.vol(m, R); [[17, 10], [21, 11], [25, 10], [29, 11], [19, 12], [27, 12]].forEach(([x, y]) => X.C.put(x, y, '#F4F4F0'));
    X.C.vol(M.rows(10, [[34, 36], [34, 38], [35, 39], [36, 38], [37, 39], [38, 39]]), R); X.C.vol(M.ell(34, 11.5, 1.6, 1.6), R); },
  fedora: X => { const c = X.col('headColor', 1), R = RAMP(c); X.C.vol(M.rows(1, [[18, 22], [17, 30], [16, 31], [16, 31], [16, 31], [16, 31], [16, 31], [15, 32], [15, 32]]).add(1 * PW + 25).add(1 * PW + 26).add(1 * PW + 27).add(1 * PW + 28).add(1 * PW + 29), R, { lx: .7 });
    X.C.vline(23, 2, 4, R[1]); X.C.hline(7, 16, 31, '#121216'); X.C.hline(8, 15, 32, '#1E1E24'); X.C.vol(M.rows(9, [[8, 39], [7, 40], [9, 38]]), R, { lx: .7 }); X.C.hline(11, 10, 37, shade(c, .4)); },
  cowboy: X => { const R = RAMP('#8E5A2E'); X.C.vol(M.rows(0, [[17, 21], [16, 31], [16, 31], [16, 31], [16, 31], [16, 31], [15, 32], [15, 32]]).add(26).add(27).add(28).add(29).add(30), R, { lx: .7 }); X.C.vline(23, 1, 3, R[1]); X.C.vline(24, 1, 3, R[1]);
    X.C.hline(6, 15, 32, '#3E2414'); X.C.dots([[18, 6], [24, 6], [30, 6]], '#C0C8D0'); X.C.vol(M.rows(6, [[3, 6], [4, 9], [5, 42], [8, 39], [12, 35]]).add(6 * PW + 41).add(6 * PW + 42).add(6 * PW + 43).add(6 * PW + 44).add(7 * PW + 38).add(7 * PW + 39).add(7 * PW + 40).add(7 * PW + 41).add(7 * PW + 42).add(7 * PW + 43), R, { lx: .7 }); },
  capuz: X => { const c = X.col('headColor', 1), R = RAMP(c), m = M.X(M.U(M.ell(24, 16, 12.6, 14.5), M.rows(28, [[11, 36], [10, 37], [10, 37], [11, 36], [12, 35]])), M.ell(24, 19, 8.2, 9.8)); X.C.vol(m, R, { lx: .6, t1: .2, t2: .72 });
    M.X(M.ell(24, 19, 9.2, 10.8), M.ell(24, 19, 8.2, 9.8)).forEach(i => X.C.put(i % PW, (i / PW) | 0, R[0])); X.C.tex(M.ell(24, 13.5, 7.5, 4), (x, y) => y < 12 ? mix(X.C.at(x, y), '#000000', .45) : null); },
  mago: X => { const R = RAMP('#4A2A92'); X.C.vol(M.rows(0, [[33, 35], [31, 34], [29, 33], [27, 32], [25, 31], [23, 31], [20, 31], [18, 31], [17, 31]]), R, { lx: .6 }); X.C.vol(M.ell(24, 10, 18, 2.6), R, { lx: .6 }); X.C.hline(8, 17, 31, '#E2B84A'); X.C.hline(9, 17, 31, '#B8902A');
    [[27, 4], [22, 6], [30, 2]].forEach(([x, y]) => { X.C.put(x, y, '#FFE680'); X.C.put(x - 1, y, '#C8A030'); X.C.put(x + 1, y, '#C8A030'); X.C.put(x, y - 1, '#C8A030'); X.C.put(x, y + 1, '#C8A030'); }); },
  espartano: X => { const B = METAL.bronze, m = M.X(M.U(M.ell(24, 15.5, 11.2, 12.5), M.rect(14, 18, 33, 29)), M.rect(16, 15, 21, 18), M.rect(26, 15, 31, 18), M.rect(21, 19, 26, 30), M.rect(19, 23, 28, 30)); X.C.vol(m, B, { shine: 1, lx: .65 });
    X.C.vline(23, 12, 21, B[3]); X.C.vline(24, 12, 21, B[1]); X.C.hline(14, 15, 32, B[1]); [[16, 15], [17, 15], [26, 15], [27, 15]].forEach(([x, y]) => X.C.put(x, y, B[0]));
    const cr = M.X(M.ell(24, 8, 16, 8.5), M.ell(24, 9, 12.5, 6.4)); const crest = M.where(cr, (x, y) => y <= 8); X.C.vol(crest, RAMP('#C0282E'), { lx: .5 }); X.C.tex(crest, (x, y) => x % 2 ? '#8A1418' : null); X.C.vol(M.rows(0, [[21, 26], [20, 27], [21, 26]]), RAMP('#C0282E')); },
  cavaleiro: X => { const R = METAL.aco, m = M.U(M.ell(24, 11, 10.6, 7.5), M.rect(14, 11, 33, 28), M.rect(15, 29, 32, 29)); X.C.vol(m, R, { shine: 1, lx: .7 }); X.C.hline(16, 15, 32, '#0A0C12'); X.C.hline(17, 15, 32, '#161A24'); X.C.vline(23, 6, 28, R[3]); X.C.vline(24, 6, 28, R[1]);
    for (let y = 21; y <= 26; y += 2) for (let x = 27; x <= 31; x += 2) X.C.put(x, y, '#0A0C12'); X.C.hline(28, 15, 32, '#E2B84A'); X.C.hline(10, 15, 32, R[1]);
    const pl = M.rows(0, [[25, 28], [23, 30], [22, 31], [22, 32], [23, 32], [24, 31]]); X.C.vol(pl, RAMP('#2E6AD8'), { lx: .5 }); X.C.dots([[26, 1], [28, 2], [30, 3]], '#9AC4FF'); },
  ferro: X => { const R = METAL.prata, m = M.U(M.where(M.ell(24, 13.5, 11.2, 10.4), (x, y) => y <= 14), M.rect(13, 14, 16, 26), M.rect(31, 14, 34, 26), M.rect(23, 12, 24, 21)); X.C.vol(m, R, { shine: 1, lx: .7 }); X.C.hline(13, 14, 33, R[1]); X.C.hline(14, 14, 33, R[3]);
    [[15, 16], [15, 20], [15, 24], [32, 16], [32, 20], [32, 24], [18, 6], [24, 4], [30, 6]].forEach(([x, y]) => X.C.put(x, y, R[4])); X.C.vline(24, 4, 12, R[3]); },
  kabuto: X => { const R = RAMP('#2A2A34'), bowl = M.where(M.ell(24, 11, 11, 8.2), (x, y) => y <= 12); X.C.vol(bowl, R, { shine: 1, lx: .6 }); for (let x = 16; x <= 32; x += 3) X.C.tex(bowl, (a, y) => a === x ? R[3] : null);
    const sh = M.U(M.rect(10, 12, 15, 23), M.rect(32, 12, 37, 23)), S = RAMP('#A0282A'); X.C.vol(sh, S); [15, 18, 21].forEach(y => { X.C.hline(y, 10, 15, S[0]); X.C.hline(y, 32, 37, S[0]); for (let x = 11; x <= 14; x += 2) { X.C.put(x, y - 1, '#E2B84A'); X.C.put(x + 22, y - 1, '#E2B84A'); } });
    X.C.vol(M.rect(13, 11, 34, 12), S); const G = METAL.ouro; [[24, 9], [22, 8], [20, 6], [18, 4], [16, 2], [15, 1], [14, 0]].forEach(([x, y]) => { X.C.put(x, y, G[3]); X.C.put(x + 1, y, G[2]); X.C.put(48 - x - 1, y, G[2]); X.C.put(48 - x - 2, y, G[1]); }); X.C.vol(M.ell(24, 9, 2, 2), G, { shine: 1 }); },
  futurista: X => { const R = RAMP('#2E3644'), m = M.U(M.ell(24, 15.5, 11.4, 13), M.rect(14, 18, 33, 29)); X.C.vol(m, R, { shine: 1, lx: .65 }); const v = M.U(M.rect(15, 13, 32, 20), M.rect(16, 21, 31, 22)); X.C.vol(v, ['#062A40', '#0A5A86', '#1890D0', '#5AD0FF', '#D0F6FF'], { shine: 1, lx: .35 });
    X.C.line(17, 14, 21, 14, '#E6FAFF'); X.C.line(16, 15, 18, 15, '#9AE6FF'); X.C.vline(13, 14, 22, '#3AE4FF'); X.C.vline(34, 14, 22, '#3AE4FF'); X.C.vline(24, 3, 11, '#3AE4FF'); X.C.vline(23, 3, 11, R[1]); X.C.vline(36, 2, 10, R[1]); X.C.put(36, 1, '#FF4A4A'); },
  dragao: X => { const R = RAMP('#7A1A1A'), m = M.U(M.where(M.ell(24, 13.5, 11.4, 10.6), (x, y) => y <= 15), M.rect(13, 14, 16, 24), M.rect(31, 14, 34, 24)); X.C.vol(m, R, { shine: 1, lx: .65 }); X.C.tex(m, (x, y) => (y % 3 === 0 && (x + y) % 4 === 0) ? R[0] : null);
    const G = METAL.ouro, horn = M.U(M.rows(0, [[4, 5], [4, 6], [5, 7], [6, 9], [7, 11], [9, 13], [11, 14], [12, 15]])); X.C.vol(horn, ['#2A1A10', '#6A5040', '#B8A088', '#E8DCC8', '#FFFFFF'], { lx: .4 }); X.C.vol(M.mir(horn), ['#2A1A10', '#6A5040', '#B8A088', '#E8DCC8', '#FFFFFF'], { lx: .4 });
    for (let x = 16; x <= 31; x += 2) { X.C.put(x, 15, '#F2EEE4'); X.C.put(x + 1, 16, '#D8D2C4'); } X.C.hline(14, 15, 32, '#2A0A0A'); X.C.dots([[18, 13], [29, 13]], '#FF9A2A'); X.C.vline(24, 4, 12, G[2]); X.C.vline(23, 4, 12, G[3]); },
  coroa: X => { const G = METAL.ouro, m = M.U(M.rect(15, 6, 32, 9), M.rows(2, [[15, 16], [15, 17], [15, 17], [15, 17]]), M.rows(1, [[23, 24], [22, 25], [22, 25], [21, 26], [21, 26]]), M.rows(3, [[19, 20], [19, 20], [18, 21]]), M.rows(3, [[27, 28], [27, 28], [26, 29]]), M.rows(2, [[31, 32], [30, 32], [30, 32], [30, 32]]));
    X.C.vol(m, G, { shine: 1, lx: .6 }); X.C.vol(M.ell(24, 7.5, 1.6, 1.4), RAMP('#D0283A'), { shine: 1 }); X.C.vol(M.ell(18.5, 7.5, 1.2, 1.2), RAMP('#2A7AF0'), { shine: 1 }); X.C.vol(M.ell(29.5, 7.5, 1.2, 1.2), RAMP('#2A7AF0'), { shine: 1 });
    X.C.dots([[15, 1], [16, 1], [23, 0], [24, 0], [31, 1], [32, 1]], G[4]); X.C.hline(9, 15, 32, G[1]); } });
// ======== mão direita ========
const HX = X => { const [a, b] = X.B.hR; return { a, b, g: Math.floor((a + b) / 2) }; };
Object.assign(HANDS, {
  espada: X => { const { g } = HX(X), S = METAL.prata, bl = M.U(M.rect(g - 1, 19, g + 1, 46), M.rows(16, [[g, g], [g - 1, g + 1], [g - 1, g + 1]])); X.C.vol(bl, S, { shine: 1, lx: .5 }); X.C.vline(g, 20, 45, S[4]); X.C.vol(M.rect(g - 4, 47, g + 4, 48), METAL.ouro, { shine: 1 }); X.C.vol(M.ell(g + .5, 54, 1.6, 1.4), METAL.ouro, { shine: 1 }); },
  katana: X => { const { g } = HX(X), bl = M.U(M.rect(g, 22, g + 1, 46), M.rect(g + 1, 16, g + 2, 21), M.rect(g + 2, 13, g + 2, 15)); X.C.vol(bl, METAL.aco, { shine: 1, lx: .4 }); X.C.vline(g, 23, 45, '#FFFFFF'); X.C.vol(M.ell(g + 1, 47.5, 2.6, 1.2), METAL.ouro, { shine: 1 }); X.C.vol(M.rect(g, 53, g + 1, 58), RAMP('#1A1A22')); X.C.dots([[g, 54], [g + 1, 56]], '#E8E2D2'); },
  machado: X => { const { g } = HX(X); X.C.vol(M.rect(g, 25, g + 1, 58), RAMP('#7A4A26')); const hd = M.U(M.rows(24, [[g + 2, g + 4], [g + 2, g + 6], [g + 2, g + 7], [g + 2, g + 8], [g + 2, g + 8], [g + 2, g + 8], [g + 2, g + 8], [g + 2, g + 7], [g + 2, g + 6], [g + 2, g + 4]]), M.rect(g - 2, 26, g - 1, 31)); X.C.vol(hd, METAL.prata, { shine: 1, lx: .4 }); X.C.vline(g + 8, 27, 30, METAL.prata[4]); },
  lanca: X => { const { g } = HX(X); X.C.vol(M.rect(g, 6, g + 1, 69), RAMP('#7A4A26'), { flat: 1 }); X.C.vol(M.rows(0, [[g, g + 1], [g - 1, g + 2], [g - 1, g + 2], [g - 1, g + 2], [g, g + 1], [g, g + 1], [g - 1, g + 2]]), METAL.prata, { shine: 1, lx: .4 }); X.C.vline(g, 1, 4, METAL.prata[4]); },
  cajado: X => { const { g } = HX(X); X.C.vol(M.rect(g, 9, g + 1, 69), RAMP('#6A4224')); for (let y = 12; y < 68; y += 4) X.C.put(g + 1, y, '#3E2414'); X.C.line(g - 3, 3, g, 9, '#6A4224'); X.C.line(g + 4, 3, g + 1, 9, '#6A4224');
    X.C.vol(M.ell(g + .5, 5, 3.4, 3.4), ['#04224A', '#0E5AB0', '#2A8CFF', '#8ACFFF', '#FFFFFF'], { shine: 1, lx: .4 }); X.C.dots([[g - 3, 1], [g + 5, 2], [g + 4, 8]], '#9AD8FF'); },
  tridente: X => { const { g } = HX(X), G = METAL.ouro; X.C.vol(M.rect(g, 10, g + 1, 69), G, { shine: 1 }); X.C.vol(M.rect(g - 4, 9, g + 5, 10), G, { shine: 1 }); [g - 4, g, g + 4].forEach((x, k) => { X.C.vol(M.rect(x, k === 1 ? 0 : 2, x + 1, 8), ['#0A4A5A', '#1890B8', '#3AE4FF', '#9AF4FF', '#FFFFFF'], { shine: 1 }); X.C.put(x + (k === 0 ? -1 : 2), k === 1 ? 2 : 4, '#3AE4FF'); }); },
  livro: X => { const { a, b } = HX(X), m = M.rect(a - 1, 43, b + 2, 51); X.C.vol(m, RAMP('#8E2434'), { lx: .6 }); X.C.vline(b + 2, 44, 50, '#F2EEE4'); X.C.vline(b + 1, 44, 50, '#D8D2C4'); X.C.dots([[a + 1, 45], [a + 2, 45], [a + 1, 46], [a + 2, 47]], '#E2B84A'); },
  telemovel: X => { const { a } = HX(X); X.C.vol(M.rect(a, 44, a + 3, 50), ['#05060A', '#0E1016', '#1A1E28', '#3A4258', '#8090B0']); X.C.vol(M.rect(a + 1, 45, a + 2, 49), RAMP('#3AA8FF'), { flat: 1 }); X.C.put(a + 1, 45, '#BFE6FF'); },
  pasta: X => { const { a, b } = HX(X), m = M.rect(a - 3, 53, b + 3, 61); X.C.vol(m, RAMP('#6A4224'), { lx: .7 }); X.C.hline(52, a, b, '#2A1A10'); X.C.vline(a, 51, 52, '#2A1A10'); X.C.vline(b, 51, 52, '#2A1A10'); X.C.hline(56, a - 2, b + 2, '#4A2A16'); X.C.dots([[a, 56], [b, 56]], '#E2B84A'); },
  bola: X => { const b = X.B.b, cx = 39.5 + b, m = M.ell(cx, 64.5, 4.5, 4.5); X.C.vol(m, RAMP('#F4F4F0'), { lx: .5 }); X.C.dots([[cx - .5, 64], [cx + .5, 64], [cx - .5, 65], [cx + .5, 65], [cx - 3.5, 62], [cx + 2.5, 61], [cx - 2.5, 67], [cx + 2.5, 67]], '#1A1A22'); },
  haltere: X => { const { a, b } = HX(X); X.C.vol(M.rect(a - 3, 50, b + 3, 51), METAL.prata, { shine: 1 }); X.C.vol(M.rect(a - 6, 46, a - 3, 55), RAMP('#2A2E38')); X.C.vol(M.rect(b + 3, 46, b + 6, 55), RAMP('#2A2E38')); },
  microfone: X => { const { g } = HX(X); X.C.vol(M.rect(g, 44, g + 1, 49), RAMP('#1A1E28')); X.C.vol(M.ell(g + 1, 42, 2.4, 2.4), METAL.prata, { shine: 1 }); X.C.tex(M.ell(g + 1, 42, 2.4, 2.4), (x, y) => (x + y) % 2 ? METAL.prata[1] : null); },
  trofeu: X => { const { a, b } = HX(X), G = METAL.ouro, cup = M.U(M.rows(36, [[a - 2, b + 2], [a - 2, b + 2], [a - 1, b + 1], [a - 1, b + 1], [a, b], [a + 1, b - 1]]), M.rect(a + 2, 42, b - 2, 45), M.rect(a, 46, b, 48)); X.C.vol(cup, G, { shine: 1, lx: .55 });
    X.C.dots([[a - 3, 37], [a - 4, 38], [a - 3, 39], [b + 3, 37], [b + 4, 38], [b + 3, 39]], G[2]); X.C.put(a, 37, G[4]); } });
// ======== acessórios ========
Object.assign(ACCS, {
  colar: X => { const G = METAL.ouro; [[19, 31], [19, 32], [20, 33], [21, 34], [22, 35], [23, 35], [24, 35], [25, 35], [26, 34], [27, 33], [28, 32], [28, 31]].forEach(([x, y], k) => X.C.put(x, y, k % 2 ? G[3] : G[1])); X.C.vol(M.rect(23, 36, 24, 38), G, { shine: 1 }); },
  relogio: X => { const [a, b] = X.B.hL; X.C.hline(47, a, b, '#1A1A22'); X.C.hline(48, a, b, '#2A2A32'); X.C.dots([[a + 1, 47], [a + 2, 47], [a + 1, 48], [a + 2, 48]], '#D8DEE8'); X.C.put(a + 1, 47, '#FFFFFF'); },
  brinco: X => { X.C.put(13, 22, '#E8F4FF'); X.C.put(13, 23, '#9AB8D8'); },
  fones: X => { const c = '#1A1E28'; X.C.vol(M.X(M.where(M.ell(24, 12, 12.6, 10.6), (x, y) => y <= 12), M.ell(24, 12.5, 11, 9.4)), RAMP(c)); X.C.vol(M.ell(13, 18.5, 2.6, 4), RAMP('#2F7BEA'), { shine: 1 }); X.C.vol(M.ell(35, 18.5, 2.6, 4), RAMP('#2F7BEA'), { shine: 1 }); },
  mochila: Object.assign(X => { const S = RAMP('#2A2E38'); X.C.vol(M.rect(17, 31, 18, 45), S); X.C.vol(M.rect(29, 31, 30, 45), S); X.C.dots([[17, 40], [30, 40]], '#C0C8D0'); },
    { back: X => { const R = RAMP('#2F7BEA'), b = X.B.b; X.C.vol(M.rect(12 - b, 30, 35 + b, 50), R, { lx: .5 }); X.C.vol(M.rect(17, 27, 30, 31), R); } }),
  cinto: X => { const G = METAL.ouro; X.C.vol(M.rect(15, 46, 32, 49), RAMP('#3A2414')); X.C.vol(M.ell(24, 47.5, 5.6, 3.6), G, { shine: 1 }); X.C.vol(M.ell(24, 47.5, 2, 1.6), RAMP('#2A8CFF'), { shine: 1 }); X.C.dots([[16, 47], [31, 47], [17, 48], [30, 48]], G[2]); } });
// ---------- catálogo (id, nome, requisito) — req(st) devolve '' se está livre ou o texto do que falta ----------
const R0 = () => '', lvA = (k, n) => st => st.lv[k].l >= n ? '' : `${({ corpo: 'Corpo', mente: 'Mente', intelecto: 'Intelecto', fortuna: 'Fortuna', relacoes: 'Relações', espirito: 'Espírito', carreira: 'Carreira', disciplina: 'Disciplina' })[k]} nível ${n}`;
const lvH = n => st => st.H.l >= n ? '' : `Herói nível ${n}`, any = (...F) => st => F.some(f => !f(st)) ? '' : F[0](st);
const PX = {
  hair: [['cacheado curto', 'Cacheado curto'], ['afro', 'Afro'], ['rapado', 'Rapado'], ['liso curto', 'Liso curto'], ['moicano', 'Moicano'], ['topete', 'Topete'], ['tranças', 'Tranças nagô'], ['dreads', 'Dreads'], ['coque', 'Coque'], ['comprido', 'Comprido'], ['cacheado comprido', 'Cacheado comprido'], ['careca', 'Careca']],
  beard: [['cavanhaque', 'Cavanhaque'], ['bigode', 'Bigode'], ['por fazer', 'Por fazer'], ['barba curta', 'Barba curta'], ['barba cheia', 'Barba cheia'], ['lenhador', 'Lenhador'], ['nenhuma', 'Sem barba']],
  glasses: [['retangulares', 'Retangulares finos'], ['redondos', 'Redondos'], ['grossos', 'Quadrados pretos'], ['sol', 'De sol'], ['aviador', 'Aviador'], ['monoculo', 'Monóculo', lvA('intelecto', 7)], ['visor', 'Visor tático', lvA('carreira', 7)], ['', 'Sem óculos']],
  head: [['', 'Nada'], ['bone', 'Boné'], ['bonetras', 'Boné para trás'], ['gorro', 'Gorro'], ['bandana', 'Bandana'], ['fedora', 'Fedora', lvA('fortuna', 3)], ['cowboy', 'Chapéu de cowboy', lvA('corpo', 3)], ['capuz', 'Capuz', lvA('mente', 3)],
    ['mago', 'Chapéu de mago', lvA('intelecto', 7)], ['espartano', 'Elmo espartano', lvA('corpo', 10)], ['cavaleiro', 'Elmo de cavaleiro', lvH(10)], ['ferro', 'Elmo de ferro', any(lvA('corpo', 7), lvA('disciplina', 7))], ['kabuto', 'Kabuto samurai', lvA('disciplina', 10)],
    ['futurista', 'Capacete futurista', lvA('intelecto', 12)], ['dragao', 'Elmo do dragão', lvH(25)], ['coroa', 'Coroa', st => st.owned.includes('acc-coroa') || st.H.l >= 30 ? '' : 'Herói nível 30 (ou loja)']],
  top: [['tshirt', 'T-shirt', R0, 1], ['regata', 'Regata', R0, 1], ['camisa', 'Camisa', R0, 1], ['polo', 'Polo', R0, 1], ['hoodie', 'Hoodie', R0, 1], ['couro', 'Casaco de couro', R0, 1], ['blazer', 'Blazer', lvA('fortuna', 2), 1],
    ['fato', 'Fato e gravata', any(lvA('fortuna', 3), lvH(5)), 1], ['smoking', 'Smoking', lvA('fortuna', 7)], ['farda', 'Farda militar', lvA('disciplina', 5)], ['gi', 'Kimono (jiu-jitsu)', any(lvA('disciplina', 3), lvA('corpo', 5))], ['brasil', 'Camisola do Brasil', lvA('corpo', 3)],
    ['basquete', 'Camisola de basquete', lvA('corpo', 3)], ['sobretudo', 'Sobretudo', lvA('carreira', 5), 1], ['monge', 'Robe de monge', lvA('espirito', 5)], ['mago', 'Robe de mago', lvA('intelecto', 5)],
    ['a-couro', 'Armadura de couro', any(lvA('corpo', 3), lvA('disciplina', 3))], ['a-malha', 'Cota de malha', lvA('corpo', 5)], ['a-ferro', 'Armadura de ferro', any(lvA('corpo', 7), lvA('disciplina', 7))], ['a-cavaleiro', 'Armadura de cavaleiro', lvH(10)],
    ['a-espartano', 'Armadura espartana', lvA('corpo', 10)], ['a-samurai', 'Armadura samurai', lvA('disciplina', 10)], ['a-ouro', 'Armadura de ouro', lvA('fortuna', 10)], ['a-futurista', 'Armadura futurista', lvA('intelecto', 12)],
    ['a-dragao', 'Armadura do dragão', lvH(25)], ['manto', 'Manto real', lvH(30)], ['a-dominus', 'Armadura Dominus', lvH(40)]],
  legs: [['jeans', 'Jeans', R0, 1], ['preta', 'Calça preta', R0], ['social', 'Calça social', R0, 1], ['calcao', 'Calção', R0, 1], ['treino', 'Calça de treino', R0, 1], ['cargo', 'Calça cargo', R0],
    ['l-couro', 'Pernas de couro', any(lvA('corpo', 3), lvA('disciplina', 3))], ['l-ferro', 'Pernas de ferro', any(lvA('corpo', 7), lvA('disciplina', 7))], ['l-ouro', 'Pernas de ouro', lvA('fortuna', 10)], ['l-espartano', 'Saiote e grevas espartanas', lvA('corpo', 10)],
    ['l-samurai', 'Pernas samurai', lvA('disciplina', 10)], ['l-futurista', 'Pernas futuristas', lvA('intelecto', 12)], ['l-dragao', 'Pernas do dragão', lvH(25)], ['l-dominus', 'Pernas Dominus', lvH(40)]],
  feet: [['tenis', 'Ténis', R0, 1], ['sociais', 'Sapatos sociais', R0], ['botas', 'Botas', R0], ['chuteiras', 'Chuteiras', lvA('corpo', 3), 1], ['sandalias', 'Sandálias', R0], ['descalco', 'Descalço', R0], ['f-ferro', 'Botas de ferro', any(lvA('corpo', 7), lvA('disciplina', 7))], ['f-ouro', 'Botas de ouro', lvA('fortuna', 10)], ['f-dominus', 'Botas Dominus', lvH(40)]],
  cape: [['', 'Sem capa'], ['vermelha', 'Capa vermelha', lvA('disciplina', 3)], ['azul', 'Capa azul', lvA('disciplina', 5)], ['preta', 'Capa preta', lvA('disciplina', 7)], ['real', 'Capa real', lvH(20)], ['dourada', 'Capa dourada', lvH(30)], ['dominus', 'Capa Dominus', lvH(40)]],
  hand: [['', 'Nada'], ['livro', 'Livro', lvA('intelecto', 3)], ['telemovel', 'Telemóvel', R0], ['pasta', 'Pasta executiva', lvA('carreira', 3)], ['bola', 'Bola de futebol', lvA('corpo', 2)], ['haltere', 'Haltere', lvA('corpo', 3)], ['microfone', 'Microfone', lvA('relacoes', 5)], ['trofeu', 'Troféu', lvH(15)],
    ['espada', 'Espada', lvA('corpo', 5)], ['katana', 'Katana', lvA('disciplina', 10)], ['machado', 'Machado', lvA('corpo', 7)], ['lanca', 'Lança', lvA('corpo', 10)], ['cajado', 'Cajado mágico', lvA('intelecto', 10)], ['tridente', 'Tridente do oceano', lvH(35)]],
  shield: [['', 'Sem escudo'], ['madeira', 'Escudo de madeira', lvA('corpo', 5)], ['ferro', 'Escudo de ferro', any(lvA('corpo', 7), lvA('disciplina', 7))], ['cavaleiro', 'Escudo de cavaleiro', lvH(10)], ['espartano', 'Escudo espartano', lvA('corpo', 10)], ['dominus', 'Escudo Dominus', lvH(40)]],
  acc: [['', 'Nenhum'], ['colar', 'Fio de ouro', lvA('fortuna', 5)], ['relogio', 'Relógio', lvA('carreira', 2)], ['brinco', 'Brinco', R0], ['fones', 'Auscultadores', R0], ['mochila', 'Mochila', lvA('intelecto', 2)], ['cinto', 'Cinto de campeão', lvH(20)]] };
// conjuntos prontos (um toque veste tudo)
const SETS = [['dia', 'Do dia a dia', { head: '', top: 'tshirt', topColor: 0, legs: 'jeans', legsColor: 3, feet: 'tenis', feetColor: 2, cape: '', hand: '', shield: '', acc: '' }],
  ['executivo', 'Executivo', { head: '', top: 'fato', topColor: 3, legs: 'social', legsColor: 3, feet: 'sociais', hand: 'pasta', shield: '', cape: '', acc: 'relogio' }],
  ['gala', 'Gala', { head: '', top: 'smoking', legs: 'social', legsColor: 1, feet: 'sociais', hand: '', shield: '', cape: '', acc: '' }],
  ['atleta', 'Seleção', { head: '', top: 'brasil', legs: 'calcao', legsColor: 4, feet: 'chuteiras', feetColor: 1, hand: 'bola', shield: '', cape: '', acc: '' }],
  ['ginasio', 'Ginásio', { head: '', top: 'regata', topColor: 1, legs: 'treino', legsColor: 1, feet: 'tenis', feetColor: 2, hand: 'haltere', shield: '', cape: '', acc: 'fones' }],
  ['lutador', 'Lutador', { head: '', top: 'gi', legs: 'calcao', legsColor: 2, feet: 'descalco', hand: '', shield: '', cape: '', acc: '' }],
  ['militar', 'Militar', { head: 'bonetras', headColor: 7, top: 'farda', legs: 'cargo', legsColor: 7, feet: 'botas', hand: '', shield: '', cape: '', acc: '' }],
  ['couro', 'Guerreiro de couro', { head: 'bandana', headColor: 9, top: 'a-couro', legs: 'l-couro', feet: 'botas', hand: 'machado', shield: 'madeira', cape: '', acc: '' }],
  ['ferro', 'Cavaleiro de ferro', { head: 'ferro', top: 'a-ferro', legs: 'l-ferro', feet: 'f-ferro', hand: 'espada', shield: 'ferro', cape: 'vermelha', acc: '' }],
  ['real', 'Cavaleiro real', { head: 'cavaleiro', top: 'a-cavaleiro', legs: 'l-ferro', feet: 'f-ferro', hand: 'espada', shield: 'cavaleiro', cape: 'azul', acc: '' }],
  ['espartano', 'Espartano', { head: 'espartano', top: 'a-espartano', legs: 'l-espartano', feet: 'sandalias', hand: 'lanca', shield: 'espartano', cape: 'vermelha', acc: '' }],
  ['samurai', 'Samurai', { head: 'kabuto', top: 'a-samurai', legs: 'l-samurai', feet: 'sandalias', hand: 'katana', shield: '', cape: '', acc: '' }],
  ['ouro', 'Paladino de ouro', { head: 'cavaleiro', top: 'a-ouro', legs: 'l-ouro', feet: 'f-ouro', hand: 'espada', shield: 'cavaleiro', cape: 'dourada', acc: '' }],
  ['mago', 'Mago', { head: 'mago', top: 'mago', legs: 'preta', legsColor: 1, feet: 'botas', hand: 'cajado', shield: '', cape: '', acc: '' }],
  ['monge', 'Monge', { head: '', top: 'monge', legs: 'preta', legsColor: 0, feet: 'sandalias', hand: 'livro', shield: '', cape: '', acc: '' }],
  ['futuro', 'Futurista', { head: 'futurista', top: 'a-futurista', legs: 'l-futurista', feet: 'botas', hand: '', shield: '', cape: '', acc: '' }],
  ['dragao', 'Senhor dos dragões', { head: 'dragao', top: 'a-dragao', legs: 'l-dragao', feet: 'f-ferro', hand: 'machado', shield: '', cape: 'preta', acc: '' }],
  ['rei', 'Rei', { head: 'coroa', top: 'manto', legs: 'social', legsColor: 6, feet: 'sociais', hand: 'trofeu', shield: '', cape: 'real', acc: 'colar' }],
  ['dominus', 'Dominus', { head: 'coroa', top: 'a-dominus', legs: 'l-dominus', feet: 'f-dominus', hand: 'tridente', shield: 'dominus', cape: 'dominus', acc: '' }]];
D.PX = PX; D.SETS = SETS; D.PW = PW; D.PH = PH;
const PXC = {};
// dataURL → blob: (o HTML leva um endereço curto em vez da imagem inteira)
const blobUrl = du => { try { const b = atob(du.split(',')[1]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type: 'image/png' })); } catch (e) { return du; } };
const pxGet = (look, o = {}) => { const k = JSON.stringify([Object.assign({}, DEF_LOOK, look), o.corpo || 0, o.mood || 'forma']); if (PXC[k]) return PXC[k];
  const p = D.pixel(look, o), c = document.createElement('canvas'), sc = 6; c.width = PW * sc; c.height = PH * sc; const x = c.getContext('2d');
  p.forEach((v, i) => { if (!v) return; x.fillStyle = v; x.fillRect((i % PW) * sc, ((i / PW) | 0) * sc, sc, sc); });
  let top = 0; while (top < 30 && !p.slice(top * PW + 10, top * PW + 38).some(Boolean)) top++;
  return (PXC[k] = { url: blobUrl(c.toDataURL('image/png')), top }); };
D.pixelUrl = (look, o) => pxGet(look, o).url;
// miniaturas do editor: as que ainda não existem desenham-se aos poucos depois de a página abrir (não prende o ecrã)
const pxKey = (look, o = {}) => JSON.stringify([Object.assign({}, DEF_LOOK, look), o.corpo || 0, o.mood || 'forma']);
const PXQ = new Map(); let pxqT = 0, pxqN = 0;
const pxFill = () => { pxqT = 0; const t0 = performance.now(); for (const [id, [look, o]] of PXQ) { if (performance.now() - t0 > 14) break; PXQ.delete(id); const u = D.pixelUrl(look, o); document.querySelectorAll(`img[data-pxq="${id}"]`).forEach(im => { im.src = u; im.removeAttribute('data-pxq'); }); }
  if (PXQ.size) pxqT = setTimeout(pxFill, 16); };
D.pixelLazy = (look, o = {}) => { if (PXC[pxKey(look, o)]) return `src="${D.pixelUrl(look, o)}"`; const id = 'q' + (++pxqN); PXQ.set(id, [look, o]); if (!pxqT) pxqT = setTimeout(pxFill, 30); return `data-pxq="${id}" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="`; };
D.pixelTop = (look, o) => pxGet(look, o).top;
D.bustImg = (o = {}) => `<img class="d3-px" src="${D.pixelUrl(o.look || {}, o)}" alt="O teu herói" draggable="false">`;
D.myBust = () => { const s = S(), st = D.state(); return D.bustImg({ look: s.look, corpo: st.tiers.corpo, mood: st.mood }); };
D.lookOk = (cat, id, st) => { const it = (PX[cat] || []).find(x => x[0] === id); if (!it || !it[2]) return ''; if (clsPieces().has(cat + ':' + id)) return ''; return it[2](Object.assign({ owned: S().owned || [] }, st)); };
// tira o que deixou de estar desbloqueado (ex.: apagaste registos e o nível desceu)
D.lookFix = (look, st) => { Object.keys(PX).forEach(c => { if (look[c] != null && D.lookOk(c, look[c], st)) look[c] = D.lookOk(c, DEF_LOOK[c], st) ? '' : DEF_LOOK[c]; }); return look; };
/* ---------- cenários em pixel art (como os biomas do Terraria): 72 × 105 (a carta toda), o herói pisa o chão na linha 66 ---------- */
const SW = 72, SH = 105, GY = 66;
const srng = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const scn = (name, draw) => { const px = new Array(SW * SH).fill('#000000'), r = srng(name), P = { px, r };
  P.put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && x < SW && y >= 0 && y < SH) px[y * SW + x] = c; };
  P.at = (x, y) => px[Math.max(0, Math.min(SH - 1, y | 0)) * SW + Math.max(0, Math.min(SW - 1, x | 0))];
  P.glow = (cx, cy, rad, c, k) => { for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) { const d = Math.hypot(x - cx, y - cy) / rad; if (d < 1 && x >= 0 && y >= 0 && x < SW && y < SH) { const t = (1 - d) * k, th = BAYER[y & 3][x & 3] / 16; if (t > th * .9) P.put(x, y, mix(P.at(x, y), c, Math.min(.85, t + .15))); } } };
  // céu em faixas com pontilhado (dithering)
  P.sky = (stops, y0 = 0, y1 = SH - 1) => { for (let y = y0; y <= y1; y++) for (let x = 0; x < SW; x++) { const t = (y - y0) / ((y1 - y0) || 1) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(t)), f = t - i; P.put(x, y, f > (BAYER[y & 3][x & 3] + .5) / 16 ? stops[i + 1] : stops[i]); } };
  P.disc = (cx, cy, rr, c, c2) => { for (let y = cy - rr; y <= cy + rr; y++) for (let x = cx - rr; x <= cx + rr; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= rr) P.put(x, y, c2 && (x - cx) + (y - cy) > rr * .5 ? c2 : c); } };
  // colinas: altura por coluna (soma de senos) e preenchimento com luz em cima
  P.hills = (base, amp, fq, cols, seed = 1, top) => { for (let x = 0; x < SW; x++) { const h = Math.round(base - amp * (Math.sin(x * fq + seed) * .6 + Math.sin(x * fq * 2.3 + seed * 3) * .4)); for (let y = h; y < SH; y++) P.put(x, y, y === h && top ? top : (y - h < 2 ? cols[1] : cols[0])); } };
  P.cloud = (x, y, w) => { const c = ['#FFFFFF', '#E6F0FA', '#BFD2E6']; for (let k = 0; k < w; k += 3) P.disc(x + k, y - (k % 6 ? 1 : 0), 2.6, c[1]); for (let k = 0; k < w; k += 3) P.disc(x + k - .5, y - 1.2, 1.8, c[0]); for (let i = 0; i < w + 2; i++) P.put(x - 1 + i, y + 2, c[2]); };
  P.tree = (x, yb, h, G = ['#0E3A22', '#1E6A34', '#3A9A44', '#7ACC5A']) => { for (let y = yb - h; y <= yb; y++) { P.put(x, y, '#3A2416'); P.put(x + 1, y, '#5A3A22'); P.put(x + 2, y, '#7A5232'); if (y % 3 === 0) P.put(x + 1, y, '#3A2416'); }
    P.put(x - 1, yb, '#3A2416'); P.put(x + 3, yb, '#5A3A22'); const cy = yb - h - 3; [[0, 0, 6], [-4, 2, 4.5], [5, 2, 4.5], [0, -4, 4.6]].forEach(([dx, dy, rr]) => P.disc(x + 1 + dx, cy + dy, rr, G[1], G[0])); [[0, -1, 3.6], [-4, 1, 2.6], [4, 1, 2.6], [-1, -5, 2.6]].forEach(([dx, dy, rr]) => P.disc(x + dx, cy + dy, rr, G[2]));
    [[-2, -6], [-5, 0], [1, -3], [3, 0], [-1, 2]].forEach(([dx, dy]) => P.put(x + dx, cy + dy, G[3])); };
  P.pine = (x, yb, h, G = ['#0A2A22', '#164A3A', '#2A6A50'], snow) => { for (let y = yb - 2; y <= yb; y++) { P.put(x, y, '#3A2416'); P.put(x + 1, y, '#5A3A22'); } for (let k = 0; k < h; k++) { const y = yb - 2 - k, w = Math.floor((h - k) / 2.2) + (k % 4 === 0 ? 1 : 0); for (let i = -w; i <= w + 1; i++) P.put(x + i, y, i <= 0 ? G[2] : i > w - 1 ? G[0] : G[1]); if (snow && k % 4 === 1) for (let i = -w + 1; i <= w; i++) if ((i + k) % 2) P.put(x + i, y, '#E6F2FF'); } };
  // chão de blocos (relva em cima, terra/pedra com blocos por baixo)
  P.ground = (top, mid, dark, y0 = GY, o = {}) => { for (let x = 0; x < SW; x++) { const tuft = o.tufts !== false && (x * 7 + 3) % 5 === 0; if (tuft) P.put(x, y0 - 1, top[1]);
      for (let y = y0; y < SH; y++) { const d = y - y0; let c = d === 0 ? top[1] : d === 1 ? top[0] : d === 2 ? (x % 3 ? top[2] : mid[1]) : mid[(x * 3 + y * 5) % 7 === 0 ? 2 : ((x + y) % 11 === 0 ? 0 : 1)]; if (d > 2 && (x % 8 === 0 || (y - y0 - 3) % 6 === 0)) c = dark; P.put(x, y, c); } } };
  P.stars = (n, ymax, c = ['#FFFFFF', '#BFD8FF', '#7F9ACC']) => { for (let i = 0; i < n; i++) { const x = r() * SW | 0, y = r() * ymax | 0, k = r(); P.put(x, y, k > .85 ? c[0] : k > .5 ? c[1] : c[2]); if (k > .94) { P.put(x - 1, y, c[2]); P.put(x + 1, y, c[2]); P.put(x, y - 1, c[2]); P.put(x, y + 1, c[2]); } } };
  P.torch = (x, y) => { P.put(x, y, '#5A3A22'); P.put(x, y + 1, '#5A3A22'); P.put(x, y + 2, '#3A2416'); P.glow(x, y - 2, 9, '#FF9A3A', .45); P.put(x, y - 1, '#FF7A1A'); P.put(x, y - 2, '#FFC040'); P.put(x - 1, y - 1, '#FF5A1A'); P.put(x + 1, y - 1, '#FF9A2A'); P.put(x, y - 3, '#FFE6A0'); };
  draw(P); return px; };
const SCENES_PX = {
  floresta: P => { P.sky(['#2E6CC8', '#3E86DA', '#5AA0E6', '#7CBAEE', '#A6D2F2'], 0, GY); P.disc(56, 10, 5, '#FFF6C8'); P.glow(56, 10, 12, '#FFF2B0', .35); P.cloud(8, 12, 12); P.cloud(40, 20, 9);
    P.hills(44, 4, .11, ['#3A6A86', '#4A7E98'], 2); P.hills(52, 5, .09, ['#2A5A4A', '#3A7056'], 5); for (let x = -2; x < SW; x += 9) P.pine(x + (x * 7) % 4, 56, 9, ['#1A4A36', '#24603E', '#3A7A4A']);
    P.tree(4, GY - 1, 14); P.tree(60, GY - 1, 16); P.ground(['#2A7A2E', '#5ABE3E', '#3E9A34'], ['#5A3A22', '#7A5232', '#9A6A42'], '#4A2E1A'); },
  caverna: P => { P.sky(['#140E0C', '#1E1612', '#2A1E18'], 0, SH - 1); for (let y = 0; y < GY; y++) for (let x = 0; x < SW; x++) { if ((x + (y >> 3) * 4) % 8 === 0 || y % 8 === 0) P.put(x, y, '#100A08'); else if (P.r() > .97) P.put(x, y, '#3A2C24'); }
    for (let x = 0; x < SW; x += 5) { const h = 3 + ((x * 13) % 9); for (let k = 0; k < h; k++) { const w = Math.max(0, Math.floor((h - k) / 3)); for (let i = -w; i <= w; i++) P.put(x + i, k, i < 0 ? '#4A3A30' : '#2A1E18'); } }
    [[10, 50, '#7A5AFF'], [62, 54, '#3AE4FF'], [66, 58, '#7A5AFF']].forEach(([x, y, c]) => { P.glow(x, y, 7, c, .35); P.put(x, y, c); P.put(x, y - 1, mix(c, '#FFFFFF', .5)); P.put(x + 1, y + 1, c); P.put(x - 1, y + 1, shade(c, .6)); });
    P.torch(18, 34); P.torch(54, 30); P.ground(['#3A3430', '#6A625A', '#4A4440'], ['#2A2420', '#3A322C', '#4A4038'], '#18120E', GY, { tufts: false }); },
  montanha: P => { P.sky(['#4A86D2', '#6AA2E0', '#8ABEEA', '#B6D8F2', '#DCEEFA'], 0, GY); P.cloud(50, 8, 12);
    const mt = (cx, w, top, c) => { for (let x = cx - w; x <= cx + w; x++) { const h = top + Math.abs(x - cx) * 1.25 + (x % 3 === 0 ? 1 : 0); for (let y = Math.round(h); y < GY; y++) P.put(x, y, y < top + 7 + ((x * 5) % 3) ? (x < cx ? '#F4F8FF' : '#C8D8EC') : (x < cx ? c[1] : c[0])); } };
    mt(18, 26, 14, ['#3A4A66', '#5A6A88']); mt(54, 24, 20, ['#2E3C56', '#4A5A78']); for (let x = 0; x < SW; x += 7) P.pine(x + 2, GY - 1, 12 + (x % 3) * 2, undefined, 1);
    P.ground(['#C8D8EC', '#F4F8FF', '#DCE8F6'], ['#5A6478', '#6E788C', '#848EA2'], '#3E4658'); },
  cidade: P => { P.sky(['#0A0E26', '#141A3E', '#222A5A', '#3A3A72', '#5A4A86'], 0, GY); P.stars(40, 30); P.disc(58, 9, 4, '#F2F0E0', '#C8C6B4');
    let x = 0; while (x < SW) { const w = 6 + (P.r() * 7 | 0), h = 18 + (P.r() * 30 | 0), c = ['#121634', '#1A1E40', '#22264A'][P.r() * 3 | 0]; for (let i = x; i < x + w; i++) for (let y = GY - h; y < GY; y++) P.put(i, y, i === x + w - 1 ? '#0A0C20' : c);
      for (let i = x + 1; i < x + w - 1; i += 2) for (let y = GY - h + 2; y < GY - 2; y += 3) if (P.r() > .45) P.put(i, y, P.r() > .3 ? '#FFD86A' : '#9AD8FF'); x += w + (P.r() * 2 | 0); }
    P.ground(['#3A3E4A', '#6A6E7A', '#4A4E5A'], ['#22242C', '#2A2C34', '#32343E'], '#18191F', GY, { tufts: false }); for (let i = 2; i < SW; i += 10) { P.put(i, GY + 7, '#E6C84A'); P.put(i + 1, GY + 7, '#E6C84A'); P.put(i + 2, GY + 7, '#E6C84A'); } },
  castelo: P => { P.sky(['#2A1A3A', '#4A2A4A', '#7A3A4A', '#B85A4A', '#E8925A'], 0, GY); P.stars(14, 18); const S = ['#1A1424', '#2A2236', '#3A3046'];
    for (let x = 14; x <= 58; x++) for (let y = 30; y < GY; y++) P.put(x, y, (x + (y >> 2)) % 6 === 0 || y % 4 === 0 ? S[0] : S[1]); for (let x = 14; x <= 58; x += 4) for (let y = 27; y < 30; y++) { P.put(x, y, S[1]); P.put(x + 1, y, S[1]); }
    [[8, 18], [56, 16], [30, 10]].forEach(([tx, ty]) => { for (let x = tx; x < tx + 9; x++) for (let y = ty; y < GY; y++) P.put(x, y, x === tx ? S[2] : (x + (y >> 2)) % 5 === 0 || y % 4 === 0 ? S[0] : S[1]); for (let k = 0; k < 6; k++) for (let x = tx - 1 + k; x < tx + 10 - k; x++) P.put(x, ty - 1 - k, '#4A2030'); P.put(tx + 4, ty - 8, '#2A1424'); P.put(tx + 5, ty - 8, '#C8343A'); P.put(tx + 6, ty - 8, '#C8343A'); P.put(tx + 5, ty - 7, '#C8343A');
      for (let y = ty + 4; y < ty + 8; y++) { P.put(tx + 4, y, '#FFC85A'); } });
    for (let x = 32; x <= 39; x++) for (let y = 46; y < GY; y++) P.put(x, y, Math.hypot(x - 35.5, y - 50) < 4 || y > 50 ? '#0A0610' : P.at(x, y)); P.torch(26, 50); P.torch(46, 50);
    P.ground(['#3A3046', '#6A5A78', '#4A3E58'], ['#2A2236', '#34293E', '#3E3448'], '#1A1424', GY, { tufts: false }); },
  aurora: P => { P.sky(['#04081A', '#081430', '#0E2244', '#163256'], 0, GY); P.stars(55, 44); for (let b = 0; b < 3; b++) for (let x = 0; x < SW; x++) { const y0 = 12 + b * 6 + Math.round(Math.sin(x * .12 + b * 1.7) * 5 + Math.sin(x * .05 + b) * 3);
      for (let k = 0; k < 9; k++) { const t = 1 - k / 9; if (t * .8 > (BAYER[(y0 + k) & 3][x & 3] + .5) / 16) P.put(x, y0 + k, mix(P.at(x, y0 + k), ['#3AF0A0', '#3AD8E0', '#9A6AFF'][b], .25 + t * .45)); } }
    P.hills(54, 4, .1, ['#1A2A44', '#24385A'], 3, '#D8E6F6'); for (let x = 1; x < SW; x += 8) P.pine(x, GY - 1, 10 + (x % 4), ['#061A1A', '#0E2A2A', '#163A3A'], 1);
    P.ground(['#B8CCE6', '#E6F0FA', '#CCDCF0'], ['#3A4A66', '#4A5A78', '#5A6A88'], '#2A3650'); },
  praia: P => { P.sky(['#3A2A6A', '#8A3A7A', '#D85A6A', '#F28A5A', '#FBC66A'], 0, 48); P.disc(36, 47, 9, '#FFE6A0'); P.glow(36, 46, 18, '#FFD08A', .3);
    for (let y = 48; y < GY; y++) for (let x = 0; x < SW; x++) P.put(x, y, (y + x * 3) % 7 === 0 ? '#5A7AC8' : (Math.abs(x - 36) < 10 - (y - 48) * .3 && (x + y) % 3 === 0) ? '#FFD08A' : y < 54 ? '#2A4A9A' : '#1E3A86');
    const palm = (x, yb, h, fl) => { for (let k = 0; k < h; k++) { const xx = x + Math.round(Math.sin(k / h * 1.6) * 3 * fl); P.put(xx, yb - k, k % 2 ? '#7A5232' : '#5A3A22'); P.put(xx + 1, yb - k, '#3A2416'); } const tx = x + Math.round(Math.sin(1.6) * 3 * fl), ty = yb - h;
      [[-1, 0], [1, 0], [-1, .6], [1, .6], [0, -1]].forEach(([dx, dy]) => { for (let k = 0; k < 9; k++) { const px = tx + dx * k, py = ty + Math.round(dy * k + k * k * .07) - (dy < 0 ? k : 0); P.put(px, py, '#1E6A34'); P.put(px, py + 1, '#0E3A22'); if (k % 2) P.put(px, py - 1, '#3A9A44'); } }); };
    palm(6, GY - 1, 26, 1); palm(64, GY - 1, 22, -1); P.ground(['#C8A060', '#F2D492', '#DCB878'], ['#C89A5A', '#D8AA6A', '#B88A4A'], '#A87A3E', GY, { tufts: false }); },
  cosmos: P => { P.sky(['#04020E', '#0A0620', '#140A30', '#1E0E3A'], 0, SH - 1); for (let i = 0; i < 260; i++) { const x = P.r() * SW | 0, y = P.r() * SH | 0, d = Math.hypot(x - 20, y - 26); if (d < 22 && P.r() > d / 26) P.put(x, y, mix(P.at(x, y), d < 10 ? '#C04AA0' : '#5A3AC0', .45)); }
    P.stars(70, GY); P.disc(54, 18, 8, '#E8924A', '#9A4A2A'); for (let x = 42; x <= 66; x++) { const y = Math.round(18 + (x - 54) * .25); if (Math.abs(x - 54) > 6 || y > 18) { P.put(x, y, '#F2D8A0'); P.put(x, y + 1, '#B89A6A'); } }
    for (let x = 4; x < SW - 4; x++) { const d = Math.abs(x - 36) / 32, h = Math.round(10 * (1 - d * d)); for (let y = GY; y < GY + h; y++) P.put(x, y, y === GY ? '#8A7AB0' : y === GY + 1 ? '#5A4A86' : (x + y) % 5 ? '#3A2E5A' : '#2A2046'); }
    P.glow(36, GY + 4, 14, '#7A5AFF', .25); } };
D.sceneUrl = (() => { const C = {}; return name => { if (C[name]) return C[name]; const f = SCENES_PX[name] || SCENES_PX.caverna, px = scn(name, f), c = document.createElement('canvas'); c.width = SW; c.height = SH; const x = c.getContext('2d');
  px.forEach((v, i) => { x.fillStyle = v; x.fillRect(i % SW, (i / SW) | 0, 1, 1); }); return (C[name] = blobUrl(c.toDataURL('image/png'))); }; })();

/* ================= A CARTA DO HERÓI =================
   O teu personagem numa carta de jogo: o material muda com o nível (bronze, prata, ouro, herói, lenda, Dominus),
   o cenário vem do nível (ou da loja) e os atributos põem efeitos à tua volta:
   Corpo = brilho à volta do corpo · Mente = aura · Intelecto = símbolos a orbitar · Fortuna = faíscas de ouro
   Relações = companheiros atrás de ti · Espírito = halo · Carreira = insígnias · Disciplina = estandartes. O ânimo muda as cores. */
// cenários em pixel art (a imagem vem de D.sceneUrl) e as partículas de cada um
const SCN = { caverna: ['A Caverna', 0, 'ember'], floresta: ['A Floresta', 5, 'fly'], montanha: ['A Montanha', 10, 'snow'], cidade: ['A Cidade', 15, 'bokeh'], castelo: ['O Castelo', 25, 'ember'], aurora: ['Aurora boreal', 0, 'star'], praia: ['Praia ao pôr do sol', 0, 'dust'], cosmos: ['Cosmos', 0, 'star'] };
const parts = (kind, n, cls) => Array.from({ length: n }, (_, i) => { const r = U.rng(kind + i), x = (r() * 100).toFixed(1), dl = (r() * 6).toFixed(2), du = (4 + r() * 5).toFixed(2), s = (kind === 'bokeh' ? 8 + r() * 18 : 2 + r() * 3).toFixed(1), y = (r() * 100).toFixed(1);
  return `<i class="${cls} p-${kind}" style="left:${x}%;top:${y}%;--s:${s}px;animation-delay:-${dl}s;animation-duration:${du}s"></i>`; }).join('');
const glyphs = n => { const G = ['∑', 'π', 'λ', 'φ', '∞', 'Ω', '√', '∂', 'α'], L = G.slice(0, n); return L.map((g, i) => `<b style="--a:${(360 / L.length * i).toFixed(0)}deg">${g}</b>`).join(''); };
// companheiros (Relações): amigos em pixel art atrás de ti
const COMP = [{ skin: 2, hair: 'liso curto', hairColor: 'castanho', beard: 'nenhuma', glasses: '', top: 'hoodie', topColor: 3 }, { skin: 8, hair: 'tranças', beard: 'barba curta', glasses: '', top: 'polo', topColor: 7, legs: 'cargo' },
  { skin: 4, hair: 'cacheado comprido', hairColor: 'castanho escuro', beard: 'nenhuma', glasses: 'redondos', top: 'camisa', topColor: 10 }, { skin: 1, hair: 'topete', hairColor: 'loiro', beard: 'por fazer', glasses: '', top: 'couro' }];
const TIERS = [[0, 'bronze', 'Bronze'], [5, 'prata', 'Prata'], [10, 'ouro', 'Ouro'], [20, 'heroi', 'Herói'], [30, 'lenda', 'Lenda'], [40, 'dominus', 'Dominus']];
const cardTier = l => TIERS.filter(t => l >= t[0]).pop();
const ABBR = { corpo: 'CRP', mente: 'MEN', intelecto: 'INT', fortuna: 'FOR', relacoes: 'REL', espirito: 'ESP', carreira: 'CAR', disciplina: 'DIS' };
// a carta: o: { mini, scene, fx, frame, preview (foto sem herói ainda) }
D.card = (o = {}) => { const s = S(), st = D.state(), T = st.tiers, look = D.lookFix(Object.assign({}, DEF_LOOK, s.look, o.look || {}), st); const eq = Object.assign(eqOf(st), o.eq || {}), sc = SCN[eq.scene] ? eq.scene : 'caverna', ct = cardTier(st.H.l);
  const tc = T.corpo, mood = st.mood, hy = 1 + D.pixelTop(look, { corpo: tc, mood }) / 72 * 82, hc = 1 + 17.5 / 72 * 82, hxp = 50, rim = ['', '#7FD0FF', '#5AB8FF', '#3FA0FF', '#2A8CFF'][tc] || '';
  const glow = rim ? `--glow:drop-shadow(0 0 ${2 + tc * 2.5}px ${rim})${tc >= 3 ? ` drop-shadow(0 0 ${tc * 5}px ${rim}88)` : ''}` : '';
  const art = `<div class="c-bg sc-${sc}"><img class="c-scn" src="${D.sceneUrl(sc)}" alt="" draggable="false">${o.mini ? '' : parts(SCN[sc][2], SCN[sc][2] === 'bokeh' ? 14 : 18, 'c-p')}</div><div class="c-win">
    ${T.disciplina ? `<div class="c-ban t${T.disciplina}"><i></i><i></i></div>` : ''}
    ${T.espirito >= 4 ? '<div class="c-rays"></div>' : ''}
    ${T.mente ? `<div class="c-aura t${T.mente}" style="left:${hxp}%;top:${hc}%"></div>` : ''}
    ${T.relacoes ? `<div class="c-comp">${COMP.slice(0, T.relacoes).map((lk, i) => `<img class="cp${i}" src="${D.pixelUrl(lk)}" alt="" draggable="false">`).join('')}</div>` : ''}
    ${T.intelecto ? `<div class="c-runes" style="left:${hxp}%;top:${hc}%"><div>${glyphs([0, 3, 5, 7, 9][T.intelecto])}</div></div>` : ''}
    <div class="c-av" style="${glow}"><i class="c-gnd"></i>${D.bustImg({ look, corpo: tc, mood })}</div>
    ${T.espirito ? `<div class="c-halo t${T.espirito}" style="left:${hxp}%;top:${Math.max(2, hy - 2).toFixed(1)}%"></div>` : ''}
    ${T.fortuna ? `<div class="c-gold">${parts('gold' + T.fortuna, [0, 6, 12, 18, 26][T.fortuna], 'c-g')}</div>` : ''}
    ${eq.fx ? `<div class="c-fx fx-${eq.fx}">${eq.fx === 'coroa' ? `<span class="c-crown" style="left:${hxp}%;top:${Math.max(4, hy - 3).toFixed(1)}%">${UI.ic('crown')}</span>` : parts(eq.fx, 22, 'c-x')}</div>` : ''}</div>`;
  if (o.mini) return `<div class="d3c mini t-${ct[1]} fr-${eq.frame || 'base'} m-${mood}"><div class="c-art">${art}</div></div>`;
  return `<div class="d3c t-${ct[1]} fr-${eq.frame || 'base'} m-${mood}" data-tilt><div class="c-art">${art}</div><div class="c-shine"></div>
    <div class="c-ovr"><b class="mono">${st.H.l}</b><small>${esc(ct[2])}</small>${T.carreira ? `<span class="c-ins">${'★'.repeat(Math.min(4, T.carreira))}</span>` : ''}</div>
    <div class="c-name"><b>${esc(pname0())}</b><small>${esc(st.cls)} · ${esc(st.title)}</small></div>
    <div class="c-stats">${AT.map(x => `<span style="--c:${x.c}"><b class="mono">${st.lv[x.k].l}</b>${ABBR[x.k]}</span>`).join('')}</div></div>`; };
// inclinar a carta com o dedo/rato
document.addEventListener('pointermove', e => { const c = e.target.closest && e.target.closest('[data-tilt]'); if (!c) return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  c.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg'); c.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg'); c.style.setProperty('--gx', ((x + .5) * 100).toFixed(1) + '%'); c.style.setProperty('--gy', ((y + .5) * 100).toFixed(1) + '%'); }, { passive: true });
document.addEventListener('pointerleave', e => { const c = e.target.closest && e.target.closest('[data-tilt]'); if (c) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); } }, true);

// editor da aparência: cada peça aparece já vestida no teu boneco; as melhores desbloqueiam-se com os atributos e o nível
const ED = [['classe', 'Classes'], ['conj', 'Conjuntos'], ['corpo', 'Corpo'], ['cabelo', 'Cabelo'], ['rosto', 'Barba e óculos'], ['head', 'Cabeça'], ['top', 'Tronco'], ['legs', 'Pernas'], ['feet', 'Pés'], ['cape', 'Capa'], ['hand', 'Mão'], ['shield', 'Escudo'], ['acc', 'Extras']];
const CATN = { hair: 'Estilo', beard: 'Barba', glasses: 'Óculos', head: 'Chapéus e elmos', top: 'Tronco', legs: 'Pernas', feet: 'Pés', cape: 'Capa', hand: 'Na mão', shield: 'Escudo', acc: 'Extras' };
const HEADC = ['bone', 'bonetras', 'gorro', 'bandana', 'fedora', 'capuz'], FEETC = ['tenis', 'chuteiras'], NUMK = ['skin', 'topColor', 'legsColor', 'feetColor', 'headColor'];
// skins das classes: cada classe tem 5 graus (I a V); a armadura vem do atributo principal, a capa e as cores do segundo
const KIT = {
  corpo: [{ head: 'bandana', top: 'regata', legs: 'treino', feet: 'tenis', hand: 'haltere' }, { top: 'a-couro', legs: 'l-couro', feet: 'botas', hand: 'machado', shield: 'madeira' }, { head: 'ferro', top: 'a-malha', legs: 'l-ferro', feet: 'f-ferro', hand: 'espada', shield: 'ferro' },
    { head: 'espartano', top: 'a-espartano', legs: 'l-espartano', feet: 'sandalias', hand: 'lanca', shield: 'espartano' }, { head: 'dragao', top: 'a-dragao', legs: 'l-dragao', feet: 'f-ferro', hand: 'machado' }],
  mente: [{ head: 'gorro', top: 'hoodie', legs: 'treino', feet: 'tenis', acc: 'fones' }, { head: 'capuz', top: 'hoodie', legs: 'preta', feet: 'botas', hand: 'livro' }, { head: 'capuz', top: 'monge', legs: 'preta', feet: 'sandalias', hand: 'cajado' },
    { head: 'mago', top: 'mago', legs: 'preta', feet: 'botas', hand: 'cajado' }, { head: 'futurista', top: 'a-futurista', legs: 'l-futurista', feet: 'botas', hand: 'cajado' }],
  intelecto: [{ top: 'camisa', legs: 'social', feet: 'sociais', hand: 'livro', acc: 'mochila' }, { head: 'fedora', top: 'sobretudo', legs: 'social', feet: 'sociais', hand: 'livro' }, { head: 'mago', top: 'mago', legs: 'preta', feet: 'botas', hand: 'livro' },
    { head: 'futurista', top: 'a-futurista', legs: 'l-futurista', feet: 'botas', hand: 'cajado' }, { head: 'mago', top: 'manto', legs: 'social', feet: 'sociais', hand: 'cajado' }],
  fortuna: [{ top: 'polo', legs: 'social', feet: 'sociais', hand: 'telemovel', acc: 'relogio' }, { top: 'blazer', legs: 'social', feet: 'sociais', hand: 'pasta', acc: 'relogio' }, { head: 'fedora', top: 'fato', legs: 'social', feet: 'sociais', hand: 'pasta', acc: 'colar' },
    { top: 'smoking', legs: 'social', feet: 'sociais', hand: 'trofeu', acc: 'colar' }, { head: 'cavaleiro', top: 'a-ouro', legs: 'l-ouro', feet: 'f-ouro', hand: 'espada', shield: 'cavaleiro' }],
  relacoes: [{ top: 'tshirt', legs: 'jeans', feet: 'tenis', acc: 'fones' }, { head: 'bone', top: 'basquete', legs: 'calcao', feet: 'tenis', hand: 'bola' }, { top: 'couro', legs: 'jeans', feet: 'botas', hand: 'microfone' },
    { top: 'blazer', legs: 'social', feet: 'sociais', hand: 'microfone', acc: 'relogio' }, { head: 'cavaleiro', top: 'a-cavaleiro', legs: 'l-ferro', feet: 'f-ferro', hand: 'espada', shield: 'cavaleiro' }],
  espirito: [{ top: 'camisa', legs: 'jeans', feet: 'sandalias', hand: 'livro' }, { top: 'monge', legs: 'preta', feet: 'sandalias', hand: 'livro' }, { head: 'capuz', top: 'monge', legs: 'preta', feet: 'sandalias', hand: 'cajado' },
    { head: 'cavaleiro', top: 'a-cavaleiro', legs: 'l-ferro', feet: 'f-ferro', hand: 'espada', shield: 'cavaleiro' }, { head: 'cavaleiro', top: 'a-ouro', legs: 'l-ouro', feet: 'f-ouro', hand: 'tridente', shield: 'dominus' }],
  carreira: [{ top: 'polo', legs: 'cargo', feet: 'botas', hand: 'telemovel' }, { top: 'camisa', legs: 'social', feet: 'sociais', hand: 'pasta', acc: 'relogio' }, { top: 'sobretudo', legs: 'social', feet: 'sociais', hand: 'pasta', acc: 'relogio' },
    { top: 'fato', legs: 'social', feet: 'sociais', hand: 'trofeu', acc: 'relogio' }, { head: 'futurista', top: 'a-futurista', legs: 'l-futurista', feet: 'botas', hand: 'trofeu' }],
  disciplina: [{ head: 'bonetras', top: 'farda', legs: 'cargo', feet: 'botas' }, { top: 'gi', legs: 'calcao', feet: 'descalco' }, { head: 'kabuto', top: 'a-samurai', legs: 'l-samurai', feet: 'sandalias', hand: 'katana' },
    { head: 'ferro', top: 'a-ferro', legs: 'l-ferro', feet: 'f-ferro', hand: 'katana', shield: 'ferro' }, { head: 'kabuto', top: 'a-samurai', legs: 'l-samurai', feet: 'f-ferro', hand: 'katana' }] };
const KCAPE = { corpo: 'vermelha', mente: 'preta', intelecto: 'azul', fortuna: 'dourada', relacoes: 'azul', espirito: 'real', carreira: 'preta', disciplina: 'vermelha' };
const KCOL = { corpo: 6, mente: 1, intelecto: 3, fortuna: 8, relacoes: 9, espirito: 2, carreira: 5, disciplina: 7 };
const clsSkin = (name, r) => { const c = CLS[name]; if (!c) return null; const k = Object.assign({ head: '', cape: '', hand: '', shield: '', acc: '' }, KIT[c.p][r - 1]);
  k.topColor = KCOL[c.q]; k.legsColor = KCOL[c.p]; k.headColor = KCOL[c.q]; k.feetColor = 1;
  k.cape = r < 3 ? '' : r < 5 ? KCAPE[c.q] : c.p === 'fortuna' || c.q === 'fortuna' ? 'dourada' : 'real'; if (c.rare && r >= 4) Object.assign(k, { head: 'coroa', top: 'a-dominus', legs: 'l-dominus', feet: 'f-dominus', hand: 'tridente', shield: 'dominus', cape: 'dominus' }); return k; };
D.clsSkin = clsSkin;
const seeClass = st => { if (!st.cls || st.cls === 'Sem classe' || !CLS[st.cls]) return; const s = S(); s.clsSeen = s.clsSeen || {}; if ((s.clsSeen[st.cls] || 0) < st.clsR) { s.clsSeen[st.cls] = st.clsR; save(); } };
let CPK = '', CPS = new Set();
const clsPieces = () => { const seen = S().clsSeen || {}, k = JSON.stringify(seen); if (k === CPK) return CPS; CPK = k; CPS = new Set(); Object.entries(seen).forEach(([n, r]) => { for (let i = 1; i <= r; i++) { const sk = clsSkin(n, i); sk && Object.entries(sk).forEach(([c, v]) => CPS.add(c + ':' + v)); } }); return CPS; };
const setLock = (set, st) => { for (const k of Object.keys(PX)) { if (set[k] == null) continue; const r = D.lookOk(k, set[k], st); if (r) return r; } return ''; };
const lookEd = () => { const s = S(), st = D.state(), L = Object.assign({}, DEF_LOOK, s.look), sec = ED.some(e => e[0] === OS.ui.d3ed) ? OS.ui.d3ed : 'conj', tc = st.tiers.corpo;
  const th = (lk, crop) => `<span class="d3-pt ${crop ? 'hd' : ''}"><img ${D.pixelLazy(lk, { corpo: tc })} alt="" draggable="false"></span>`;
  const it = (k, v, lab, lock, crop) => `<button type="button" class="d3-pi ${String(L[k]) === String(v) ? 'on' : ''} ${lock ? 'lock' : ''}" ${lock ? 'disabled' : `data-act="d3Look" data-k="${k}" data-v="${esc(String(v))}"`} aria-label="${esc(lab)}${lock ? ' (' + esc(lock) + ')' : ''}">${th(Object.assign({}, L, { [k]: NUMK.includes(k) ? +v : v }), crop)}<b>${esc(lab)}</b>${lock ? `<small>${UI.ic('lock')}${esc(lock)}</small>` : ''}</button>`;
  const sw = (k, v, lab, col) => `<button type="button" class="d3-sw ${String(L[k]) === String(v) ? 'on' : ''}" data-act="d3Look" data-k="${k}" data-v="${esc(String(v))}" aria-label="${esc(lab)}" title="${esc(lab)}" style="--sw:${col}"></button>`;
  const row = (t, h, cls = 'd3-sws') => `<div><span class="cz">${t}</span><div class="${cls}">${h}</div></div>`;
  const cat = (k, crop) => row(CATN[k], PX[k].map(([v, n]) => it(k, v, n, D.lookOk(k, v, st), crop)).join(''), 'd3-pis');
  const colors = (k, t) => row(t, COLORS.map((c, i) => sw(k, i, 'Cor ' + (i + 1), c)).join(''));
  const P = { classe: () => { const seen = S().clsSeen || {}, cur = CLS[st.cls] ? st.cls : '', show = CLS[OS.ui.d3cls] ? OS.ui.d3cls : cur || Object.keys(seen)[0] || 'Espartano', got = seen[show] || 0;
      const sk = r => { const k = clsSkin(show, r), lock = r > got ? (show === cur ? `Herói nível ${CRANK[r - 1][0]}` : `Sê ${show} ${ROM[r - 1]}`) : '', on = Object.keys(k).every(x => String(L[x] == null ? '' : L[x]) === String(k[x]));
        return `<button type="button" class="d3-pi ${on ? 'on' : ''} ${lock ? 'lock' : ''}" ${lock ? 'disabled' : `data-act="d3Cls" data-c="${esc(show)}" data-r="${r}"`} aria-label="${esc(show)} ${ROM[r - 1]}${lock ? ' (' + esc(lock) + ')' : ''}">${th(Object.assign({}, L, k))}<b>${ROM[r - 1]} · ${CRANK[r - 1][1]}</b>${lock ? `<small>${UI.ic('lock')}${esc(lock)}</small>` : ''}</button>`; };
      const names = Object.keys(CLS);
      return `<div class="d3-clsh"><b>${esc(show)}</b><small class="dm">${esc(CLS[show].d)}${show === cur ? ' · é a tua classe agora' : got ? ` · já foste ${esc(show)} ${ROM[got - 1]}` : ' · ainda não foste esta classe'}</small></div>${row('Skins desta classe', [1, 2, 3, 4, 5].map(sk).join(''), 'd3-pis')}
        ${row(`Todas as classes (${Object.keys(seen).length}/${names.length} desbloqueadas)`, names.map(n => `<button type="button" class="d3-clc ${n === show ? 'on' : ''} ${seen[n] ? 'got' : ''}" data-act="d3ClsShow" data-c="${esc(n)}">${esc(n)}${seen[n] ? ` <small>${ROM[seen[n] - 1]}</small>` : ''}</button>`).join(''), 'd3-cls')}`; },
    conj: () => row('Um toque veste tudo', SETS.map(([id, n, set]) => { const lock = setLock(set, st), on = Object.keys(set).every(k => String(L[k] == null ? '' : L[k]) === String(set[k]));
      return `<button type="button" class="d3-pi ${on ? 'on' : ''} ${lock ? 'lock' : ''}" ${lock ? 'disabled' : `data-act="d3Set" data-v="${id}"`} aria-label="${esc(n)}${lock ? ' (' + esc(lock) + ')' : ''}">${th(Object.assign({}, L, set))}<b>${esc(n)}</b>${lock ? `<small>${UI.ic('lock')}${esc(lock)}</small>` : ''}</button>`; }).join(''), 'd3-pis'),
    corpo: () => row('Tom de pele', SKINS.map((c, i) => sw('skin', i, 'Tom ' + (i + 1), c)).join('')) + row('Cor dos olhos', Object.entries(EYECOL).map(([n, c]) => sw('eyes', n, n, c)).join('')) + row('Sobrancelhas', ['grossas', 'finas'].map(v => it('brows', v, v, '', 1)).join(''), 'd3-pis'),
    cabelo: () => row('Cor', Object.entries(HAIRCOL).map(([n, c]) => sw('hairColor', n, n, c)).join('')) + cat('hair', 1),
    rosto: () => cat('beard', 1) + cat('glasses', 1),
    head: () => (HEADC.includes(L.head) ? colors('headColor', 'Cor') : '') + cat('head', 1),
    top: () => ((PX.top.find(x => x[0] === L.top) || [])[3] ? colors('topColor', 'Cor') : '') + cat('top'),
    legs: () => ((PX.legs.find(x => x[0] === L.legs) || [])[3] ? colors('legsColor', 'Cor') : '') + cat('legs'),
    feet: () => (FEETC.includes(L.feet) ? colors('feetColor', 'Cor') : '') + cat('feet'),
    cape: () => cat('cape'), hand: () => cat('hand'), shield: () => cat('shield'), acc: () => cat('acc') };
  return `<div class="d3-edt" role="tablist">${ED.map(([k, l]) => `<button type="button" class="${k === sec ? 'on' : ''}" data-act="d3EdTab" data-v="${k}">${l}</button>`).join('')}</div><div class="d3-ed">${P[sec]()}</div>
    <p class="dm d3-tip">As peças com cadeado desbloqueiam-se sozinhas quando o atributo chega ao nível pedido.</p>
    <button type="button" class="d3-link d3-reset" data-act="d3LookReset">Voltar ao visual da minha foto</button>`; };
A.d3EdTab = b => OS.setUI('d3ed', b.dataset.v);
A.d3ClsShow = b => OS.setUI('d3cls', b.dataset.c);
A.d3Cls = b => { const s = S(), n = b.dataset.c, r = +b.dataset.r, k = clsSkin(n, r); if (!k || ((s.clsSeen || {})[n] || 0) < r) return; if (!s.look || typeof s.look !== 'object') s.look = {}; Object.assign(s.look, k); save(); UI.toast(`${n} ${ROM[r - 1]} vestido`, 'pos'); };
A.d3Look = b => { const s = S(), k = b.dataset.k, v = b.dataset.v; if (!s.look || typeof s.look !== 'object') s.look = {}; s.look[k] = NUMK.includes(k) ? +v : v; save(); };
A.d3Set = b => { const s = S(), it = SETS.find(x => x[0] === b.dataset.v); if (!it || setLock(it[2], D.state())) return; if (!s.look || typeof s.look !== 'object') s.look = {}; Object.assign(s.look, it[2]); save(); UI.toast(it[1] + ' vestido', 'pos'); };
A.d3LookReset = () => { const s = S(); s.look = {}; save(); UI.toast('Visual reposto', 'pos'); };

/* ================= LOJA: cenários, molduras e efeitos ================= */
const SHOP = [
  { id: 'fr-carmesim', s: 'frame', n: 'Moldura carmesim', p: 60, v: 'carmesim' }, { id: 'fr-esmeralda', s: 'frame', n: 'Moldura esmeralda', p: 80, v: 'esmeralda' }, { id: 'fr-noite', s: 'frame', n: 'Moldura meia-noite', p: 100, v: 'noite' },
  { id: 'fr-real', s: 'frame', n: 'Moldura real', p: 140, v: 'real' }, { id: 'fr-obsidiana', s: 'frame', n: 'Obsidiana dourada', p: 260, v: 'obsidiana' },
  { id: 'sc-aurora', s: 'scene', n: 'Aurora boreal', p: 180, v: 'aurora' }, { id: 'sc-praia', s: 'scene', n: 'Praia ao pôr do sol', p: 150, v: 'praia' }, { id: 'sc-cosmos', s: 'scene', n: 'Cosmos', p: 300, v: 'cosmos' },
  { id: 'fx-brasas', s: 'fx', n: 'Brasas', p: 50, v: 'brasas' }, { id: 'fx-neve', s: 'fx', n: 'Neve', p: 60, v: 'neve' }, { id: 'fx-petalas', s: 'fx', n: 'Pétalas', p: 80, v: 'petalas' },
  { id: 'fx-raios', s: 'fx', n: 'Relâmpagos', p: 160, v: 'raios' }, { id: 'fx-chamas', s: 'fx', n: 'Chamas', p: 220, v: 'chamas' }, { id: 'acc-coroa', s: 'head', n: 'Coroa', p: 600, v: 'coroa' }];
// cenários que se ganham com o nível do herói
const SCENES = Object.entries(SCN).filter(([k]) => !SHOP.some(i => i.v === k)).map(([k, v]) => [k, v[0], v[1]]);
const sceneAuto = l => SCENES.filter(s => l >= s[2]).pop()[0];
const eqOf = st => { const s = S(), e = s.eq || {}, has = id => (s.owned || []).includes(id), get = (slot, v) => v && (SHOP.some(i => i.s === slot && i.v === v && has(i.id)) || (slot === 'scene' && SCENES.some(x => x[0] === v && st.H.l >= x[2]))) ? v : '';
  return { frame: get('frame', e.frame), scene: get('scene', e.scene) || sceneAuto(st.H.l), fx: get('fx', e.fx) }; };
const wear = (s, it, on) => { if (it.s === 'head') { s.look = s.look || {}; s.look.head = on ? it.v : ''; } else s.eq[it.s] = on ? it.v : ''; };
const wearing = (s, it) => it.s === 'head' ? (s.look || {}).head === it.v : s.eq[it.s] === it.v;
A.d3Buy = b => { const it = SHOP.find(i => i.id === b.dataset.id), s = S(), st = D.state(); if (!it) return; if ((s.owned || []).includes(it.id)) { wear(s, it, !wearing(s, it)); save(); return; }
  if (st.gold < it.p) return UI.toast(`Faltam ${it.p - st.gold} moedas de ouro`, 'warn'); s.owned.push(it.id); wear(s, it, true); save(); UI.toast(`${it.n} é teu!`, 'pos'); };
A.d3Scene = b => { const s = S(); s.eq.scene = s.eq.scene === b.dataset.v ? '' : b.dataset.v; save(); };

/* ================= O QUE O PERSONAGEM GANHA EM CADA ATRIBUTO ================= */
const TIER_AT = [3, 7, 12, 20];
const LOOKS = { corpo: ['Sem brilho', 'Brilho à volta do corpo', 'Brilho quente', 'Contorno de fogo', 'Corpo em chamas'], mente: ['Sem aura', 'Aura ténue', 'Aura calma', 'Aura viva', 'Aura brilhante'],
  intelecto: ['Sem símbolos', '3 símbolos a orbitar', '5 símbolos a orbitar', '7 símbolos a orbitar', '9 símbolos a orbitar'], fortuna: ['Sem ouro', 'Faíscas de ouro', 'Chuva de ouro', 'Tempestade de ouro', 'Tesouro vivo'],
  relacoes: ['Sozinho', '1 companheiro atrás de ti', '2 companheiros', '3 companheiros', '4 companheiros'], espirito: ['Sem halo', 'Halo ténue', 'Halo', 'Halo de luz', 'Halo e raios do céu'],
  carreira: ['Sem insígnias', '1 insígnia', '2 insígnias', '3 insígnias', '4 insígnias'], disciplina: ['Sem estandartes', 'Estandartes cinzentos', 'Estandartes carmesim', 'Estandartes reais', 'Estandartes negros e ouro'] };
D.LOOKS = LOOKS;
const LVQ = ['O esforço de hoje ficou gravado.', 'Mais forte do que ontem.', 'Isto foi conquistado, não oferecido.', 'Consistência supera intensidade.', 'Um passo mais perto de Dominus.', 'A disciplina está a pagar.', 'Ninguém te deu isto. Foste tu.'];

/* ================= CERIMÓNIAS ================= */
const snap = st => ({ H: st.H.l, a: Object.fromEntries(AK.map(k => [k, st.lv[k].l])), ach: Object.fromEntries(D.achievements().map(a => [a.id, a.t])), boss: bossesWon().length, cls: st.clsFull });
D.news = () => { try { const s = S(); if (!s.born || !s.seen || !s.seen.a) return 0; const st = D.state(); return (st.H.l > s.seen.H ? 1 : 0) + AK.filter(k => st.lv[k].l > (s.seen.a[k] || 0)).length; } catch (e) { return 0; } };
const QQ = []; let showing = false;
D.check = () => { const s = S(); if (!s.born) return; const st = D.state(); seeClass(st); const now = snap(st), was = s.seen;
  if (!was || typeof was !== 'object' || !was.a) { s.seen = now; save(); return; }
  if (JSON.stringify(now) === JSON.stringify(was)) return;
  const out = [];
  if (now.H > was.H) { const n = now.H - was.H; out.push({ k: 'Subiste de nível', t: 'Nível ' + now.H, s: LVQ[now.H % LVQ.length], av: 1, rw: [`+${n} ${n > 1 ? 'baús' : 'baú'} de recompensa`, `+${n * 25} de ouro`] });
    if (D.titleOf(now.H) !== D.titleOf(was.H)) out.push({ k: 'Novo título', t: D.titleOf(now.H), s: 'O teu nome agora tem outro peso.', av: 1 }); }
  AK.forEach(k => { const a = now.a[k], b = (was.a || {})[k] || 0; if (a <= b) return; const t1 = tierOf(a), t0 = tierOf(b);
    out.push({ k: AO[k].n + ' subiu', t: `${AO[k].n} · nível ${a}`, s: t1 > t0 ? `O teu personagem mudou: ${LOOKS[k][t1]}.` : AO[k].d, col: AO[k].c, ic: AO[k].ic, av: t1 > t0 ? 1 : 0 }); });
  Object.entries(now.ach).forEach(([id, t]) => { const b = (was.ach || {})[id] || 0; if (t <= b) return; const a = ACH.find(x => x[0] === id); if (!a) return;
    out.push({ k: 'Conquista · ' + TIERN[t - 1], t: a[1], s: `${U.nf(a[4][t - 1])} ${a[2]}`, rw: [`+${TIERG[t - 1]} de ouro`], col: TIERC[t - 1], ic: a[5] }); });
  if (now.boss > (was.boss || 0)) { const w = bossesWon().sort().pop(), f = w ? D.bossFight(w) : null; out.push({ k: 'Chefe derrotado', t: f ? f.name : 'Chefe', s: 'Venceste a semana.', rw: ['+100 de ouro'], ic: 'sword', col: '#E5735A' }); }
  if (now.cls !== was.cls && now.cls !== 'Sem classe') out.push({ k: 'Nova classe', t: now.cls, s: (CLS[now.cls.replace(/ [IV]+$/, '')] || {}).d || 'A tua classe nasce dos teus atributos mais fortes.', rw: ['Skin da classe desbloqueada no Visual'], av: 1 });
  s.seen = now; save();
  if (out.length > 5) { const rest = out.splice(4); out.push({ k: 'E ainda', t: `Mais ${rest.length} novidades`, s: rest.map(x => x.t).join(' · ') }); }
  QQ.push(...out); flush(); };
const confetti = (cv, col) => { const x = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, cs = ['#BAE6FD', '#38BDF8', col || '#fff', '#fff', '#6FA8E8', '#E5735A', '#A08CF0'];
  const ps = Array.from({ length: 150 }, () => ({ x: W / 2, y: H * .4, vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 4, r: Math.random() * 6 + 3, a: Math.random() * 6, va: (Math.random() - .5) * .3, c: cs[Math.floor(Math.random() * cs.length)] }));
  let t = 0; const step = () => { if (!cv.isConnected || t++ > 240) return; x.clearRect(0, 0, W, H); ps.forEach(p => { p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.globalAlpha = Math.max(0, 1 - t / 240); x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); }); requestAnimationFrame(step); }; step(); };
const flush = () => { if (showing || !QQ.length || document.querySelector('.d3-cel')) return; showing = true; const c = QQ.shift(), el = document.createElement('div');
  el.className = 'ceremony d3-cel'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.style.setProperty('--kc', c.col || '#38BDF8');
  el.innerHTML = `<canvas></canvas><div class="in"><div class="cz d3-cel-k">${esc(c.k)}</div>${c.av ? `<div class="d3-cel-av">${D.card()}</div>` : `<div class="d3-cel-ic">${UI.ic(c.ic || 'star')}</div>`}<h1>${esc(c.t)}</h1>${c.s ? `<p>${esc(c.s)}</p>` : ''}${(c.rw || []).length ? `<div class="d3-cel-rw">${c.rw.map(r => `<span>${esc(r)}</span>`).join('')}</div>` : ''}<button class="dbtn gold" data-close>${QQ.length ? 'Continuar' : 'Boa!'}</button></div>`;
  document.body.appendChild(el);
  try { if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('lite')) confetti(el.querySelector('canvas'), c.col); } catch (e) { } try { navigator.vibrate && navigator.vibrate([40, 60, 80]); } catch (e) { }
  const close = () => { el.remove(); document.removeEventListener('keydown', key); showing = false; setTimeout(flush, 160); }, key = e => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); } };
  document.addEventListener('keydown', key);
  el.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === el) { e.preventDefault(); e.stopPropagation(); close(); } }, true);
  setTimeout(() => { const b = el.querySelector('[data-close]'); b && b.focus(); }, 60); };
D.celebrate = c => { QQ.push(c); flush(); };

/* ================= +XP A VOAR (quando registas algo, em qualquer página) ================= */
let FLY = null, flyT = 0;
const flyBox = () => { let b = document.getElementById('d3fly'); if (!b) { b = document.createElement('div'); b.id = 'd3fly'; b.setAttribute('aria-live', 'polite'); document.body.appendChild(b); } return b; };
const fly = (gains, lvUp, attrUp) => { const big = !!(lvUp || attrUp.length), el = document.createElement('a'); el.className = 'd3-fly' + (big ? ' up' : ''); el.href = '#dominus';
  el.innerHTML = `${UI.ic('crown')}<span><b>${gains.slice(0, 3).map(([k, x]) => `<em style="color:${AO[k].c}">+${x} ${esc(AO[k].n)}</em>`).join(' ')}</b>${lvUp ? `<small>Subiste para o nível ${lvUp}! Tens um baú para abrir.</small>` : attrUp.length ? `<small>${attrUp.map(k => esc(AO[k].n)).join(' e ')} subiu de nível!</small>` : ''}</span>`;
  flyBox().appendChild(el); setTimeout(() => el.classList.add('out'), big ? 5200 : 2600); setTimeout(() => el.remove(), big ? 5700 : 3100); };
const flyNow = quiet => { try { const s = S(); if (!s.born) { FLY = null; return; } const st = D.state(), cur = { ax: Object.assign({}, st.ax), H: st.H.l, lv: Object.fromEntries(AK.map(k => [k, st.lv[k].l])) };
  if (FLY && !quiet && s.fly !== false && !document.body.classList.contains('dom-mode')) { const g = AK.map(k => [k, Math.round(cur.ax[k] - FLY.ax[k])]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]); if (g.length) fly(g, cur.H > FLY.H ? cur.H : 0, AK.filter(k => cur.lv[k] > FLY.lv[k])); }
  FLY = cur; D.dailyIds(); D.weeklyIds(); } catch (e) { if (OS.debug) console.warn('Dominus fly', e); } };
OS.on('change', () => { clearTimeout(flyT); flyT = setTimeout(() => flyNow(false), 900); });
OS.on('remote', () => { clearTimeout(flyT); flyT = setTimeout(() => flyNow(true), 1500); });
// mudanças no próprio jogo (marcos, compras, missões) não aparecem como +XP lá fora
let flyQ = 0; OS.on('one:dominus', () => { clearTimeout(flyQ); flyQ = setTimeout(() => { if (FLY) { try { const st = D.state(); FLY = { ax: Object.assign({}, st.ax), H: st.H.l, lv: Object.fromEntries(AK.map(k => [k, st.lv[k].l])) }; } catch (e) { } } }, 300); });
OS.on('ready', () => setTimeout(() => { if (!FLY) flyNow(true); }, 3000));
OS.on('unlock', () => setTimeout(() => { if (!FLY) flyNow(true); }, 3000));

/* ================= VISTAS ================= */
const ic = (n, c = '') => UI.ic(n, c);
const bar = (p, c) => `<div class="d3-bar"><i style="width:${(Math.max(0, Math.min(1, p || 0)) * 100).toFixed(1)}%${c ? ';background:' + c : ''}"></i></div>`;
const TABS = [['', 'Herói', 'user'], ['missoes', 'Missões', 'target'], ['chefe', 'Chefe', 'sword'], ['bestiario', 'Bestiário', 'skull'], ['conquistas', 'Conquistas', 'star'], ['baus', 'Baús', 'gift'], ['visual', 'Visual', 'eye'], ['marcos', 'Marcos', 'flag'], ['diario', 'Diário', 'note']];
const MOODT = { chamas: ['Em chamas', 'Fizeste algo hoje. O teu herói sorri.'], forma: ['Em forma', 'Registaste algo há pouco tempo.'], cansado: ['Cansado', 'Há uns dias que não registas nada. O teu herói sente.'], abatido: ['Abatido', 'Volta hoje: um registo chega para ele se levantar.'] };
const goLink = ([to, l]) => to === '@social' ? `<button type="button" class="d3-go" data-act="d3Social">${ic('plus')}${esc(l)}</button>` : `<a class="d3-go" href="#${to}">${esc(l)}</a>`;
const xpTxt = n => U.nf(Math.round(n));
const pname0 = () => S().name || OS.one('profile').short || 'Herói';
const nextLook = (k, l) => { const t = tierOf(l); return t >= 4 ? null : { lv: TIER_AT[t], n: LOOKS[k][t + 1] }; };

const radar = st => { const R = 84, cx = 110, cy = 104, mx = Math.max(5, ...AK.map(k => st.lv[k].l)) + 1, pt = (i, r) => { const a = -Math.PI / 2 + i * Math.PI * 2 / AK.length; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const ring = f => AK.map((_, i) => pt(i, R * f).map(v => v.toFixed(1)).join(',')).join(' '), poly = AK.map((k, i) => pt(i, R * Math.max(.06, (st.lv[k].l + st.lv[k].p) / mx)).map(v => v.toFixed(1)).join(',')).join(' ');
  return `<svg viewBox="-22 0 264 214" class="d3-radar" role="img" aria-label="Equilíbrio dos 8 atributos">${[.25, .5, .75, 1].map(f => `<polygon points="${ring(f)}" class="rg"/>`).join('')}${AK.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="rg"/>`; }).join('')}
    <polygon points="${poly}" class="rv"/>${AK.map((k, i) => { const [x, y] = pt(i, R + 14); return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" style="fill:${AO[k].c}">${esc(AO[k].n.slice(0, 4))} ${st.lv[k].l}</text>`; }).join('')}</svg>`; };

const T = {};
T.heroi = st => { const s = S(), H = st.H, md = MOODT[st.mood] || MOODT.forma, M = D.missions(), ch = D.chests(), tx = AK.reduce((a, k) => a + st.todayX[k], 0), wx = AK.reduce((a, k) => a + st.wkX[k], 0);
  const feed = st.all.slice().sort((a, b) => b.d.localeCompare(a.d) || b.x - a.x).slice(0, 10);
  return `<section class="d3-hero"><div class="d3-cardw">${D.card()}${ch ? `<a class="d3-chestb" href="#dominus.baus" aria-label="${ch} baús por abrir">${ic('gift')}<b>${ch}</b></a>` : ''}</div>
    <div class="d3-id"><div class="d3-lvrow"><div class="d3-lv"><b class="mono">${H.l}</b><span class="cz">nível</span></div><div class="d3-lvb">${bar(H.p, 'linear-gradient(90deg,#0E7AB0,#38BDF8 60%,#BAE6FD)')}<small class="dm mono">${xpTxt(H.into)} / ${xpTxt(H.need)} XP para o nível ${H.l + 1}</small></div></div>
      <div class="d3-chips"><span title="Dias seguidos com algum registo">${ic('flame')}<b class="mono">${st.streak}</b> ${st.streak === 1 ? 'dia' : 'dias'} seguidos</span><span>${ic('coin')}<b class="mono">${U.nf(st.gold)}</b> ouro</span><span class="d3-mood ${st.mood}" title="${esc(md[1])}">${esc(md[0])}</span></div>
      <p class="dm d3-moodp">${esc(md[1])}</p></div></section>
  <section class="d3-today"><div class="d3-h"><span class="cz">Hoje</span><span class="dm mono">${tx ? '+' + xpTxt(tx) + ' XP' : ''}${wx ? ' · +' + xpTxt(wx) + ' esta semana' : ''}</span></div>
    ${tx ? `<div class="d3-gain">${AK.filter(k => st.todayX[k] > 0).map(k => `<span style="--c:${AO[k].c}">${ic(AO[k].ic)}+${xpTxt(st.todayX[k])} ${esc(AO[k].n)}</span>`).join('')}</div>` : '<p class="dm">Ainda nada hoje. Regista qualquer coisa no Náutilo (um treino, estudo, um gasto, um devocional…) e o teu herói ganha XP na hora.</p>'}
    <div class="d3-mini">${M.dl.map(m => `<a href="#dominus.missoes" class="${m.ok ? 'ok' : ''}" style="--c:${AO[m.a].c}"><i>${m.ok ? '✓' : ''}</i><span>${esc(m.t)}</span><small class="mono">${U.nf(m.c)}/${U.nf(m.n)}</small></a>`).join('')}</div></section>
  <section><div class="d3-h"><span class="cz">Atributos</span><span class="dm">sobem sozinhos com o que fazes</span></div><div class="d3-attrs">${AT.map(a => { const l = st.lv[a.k], nx = nextLook(a.k, l.l);
    return `<details class="d3-at" data-tog="d3at_${a.k}" ${OS.ui['tog_d3at_' + a.k] ? 'open' : ''} style="--c:${a.c}"><summary><span class="d3-ati">${ic(a.ic)}</span><span class="d3-atn"><b>${esc(a.n)}</b><small class="dm">${esc(LOOKS[a.k][tierOf(l.l)])}</small></span><b class="mono d3-atl">${l.l}</b>${bar(l.p, a.c)}<small class="dm mono d3-atx">${xpTxt(l.into)}/${xpTxt(l.need)} XP${st.wkX[a.k] ? ` · +${xpTxt(st.wkX[a.k])} esta semana` : ''}</small></summary>
      <div class="d3-atd"><p>${esc(a.d)}</p>${nx ? `<p class="dm">No nível ${nx.lv}: <b>${esc(nx.n)}</b> no teu personagem.</p>` : '<p class="gold">Visual máximo deste atributo.</p>'}<div class="d3-gos">${a.go.map(goLink).join('')}</div></div></details>`; }).join('')}</div></section>
  <section class="d3-two"><div class="d3-card"><div class="d3-h"><span class="cz">Equilíbrio</span><span class="dm">${esc(st.clsFull)}${st.cls !== 'Sem classe' ? ' · ' + esc(st.clsN) : ''}</span></div>${radar(st)}${CLS[st.cls] ? `<p class="dm d3-note">${esc(CLS[st.cls].d)}. ${st.clsR < 5 ? `Grau ${ROM[st.clsR]} no herói nível ${CRANK[st.clsR][0]}.` : 'Grau máximo.'}</p>` : ''}</div>
    <div class="d3-card"><div class="d3-h"><span class="cz">Últimos ganhos</span><a class="dm" href="#dominus.diario">diário →</a></div>${feed.length ? `<div class="d3-feed">${feed.map(e => `<div><i style="background:${AO[e.a].c}"></i><span>${esc(e.t)}</span><small class="mono">${U.fmtDS(e.d)} · +${xpTxt(e.x)}</small></div>`).join('')}</div>` : '<p class="dm">Quando registares algo aparece aqui.</p>'}</div></section>`; };

const mRow = m => `<div class="d3-m ${m.ok ? 'ok' : ''}" style="--c:${AO[m.a].c}"><i>${m.ok ? '✓' : ic(AO[m.a].ic)}</i><div><b>${esc(m.t)}</b>${bar(m.c / m.n, AO[m.a].c)}<small class="dm"><span class="mono">${U.nf(m.c)}/${U.nf(m.n)}</span> · ${esc(AO[m.a].n)} · +${U.nf(m.x)} XP · +${m.g} ouro</small></div>${m.ok ? '<span class="d3-ok cz">Feita</span>' : `<span class="d3-gos">${goLink(AO[m.a].go[0])}</span>`}</div>`;
T.missoes = st => { const M = D.missions(), all = M.dl.length && M.dl.every(m => m.ok), done = st.mis.done, days = U.lastN(8).slice().reverse().slice(1), mo = OS.Monstros, mid = D.monsterOf(), hits = M.dl.filter(m => m.ok).length, mm = mo && mid ? mo.ALL[mid] : null;
  return `${mm ? `<section class="d3-mon ${all ? 'dead' : ''}" style="--c:${AO[mm.a].c}"><div class="d3-mona">${mo.img(mid, { hurt: hits / 3, dead: all })}</div><div><div class="cz d3-k">Monstro do dia · ${esc(AO[mm.a].n)}</div><h2>${esc(mm.n)}</h2><p class="dm"><i>${esc(mm.lore)}</i></p>
    <div class="d3-hp"><span class="cz">Vida</span>${bar(1 - hits / 3, '#B5483B')}<small class="mono">${3 - hits} / 3</small></div><p>${all ? '<b class="gold">Morto.</b> Fica no teu bestiário.' : `Cada missão de hoje é um golpe. Faltam <b class="mono">${3 - hits}</b>. À meia-noite foge.`}</p></div></section>` : ''}
  <section><div class="d3-h"><span class="cz">Missões de hoje</span><span class="dm">${M.dl.filter(m => m.ok).length}/${M.dl.length}${all ? ' · bónus +' + QG.all + ' ouro ✓' : ' · as 3 = +' + QG.all + ' ouro'}</span></div><div class="d3-ms">${M.dl.map(mRow).join('')}</div></section>
  <section><div class="d3-h"><span class="cz">Missões da semana</span><span class="dm">${M.left > 1 ? M.left + ' dias para acabar' : 'último dia'}</span></div><div class="d3-ms">${M.wl.map(mRow).join('')}</div></section>
  <section><div class="d3-h"><span class="cz">Campanhas do mês</span><span class="dm">${M.mleft > 1 ? M.mleft + ' dias para acabar' : 'último dia'} · +${U.nf(QX.m)} XP cada</span></div><div class="d3-ms d3-camp">${M.ml.map(mRow).join('')}</div></section>
  <section class="d3-card"><div class="d3-h"><span class="cz">Últimos dias</span><span class="dm mono">${st.mis.n} missões cumpridas</span></div><div class="d3-hist">${days.map(d => { const n = done.filter(x => x.d === d && !x.w).length, tot = (S().q[d] || []).length; return `<div><span class="mono dm">${U.fmtDS(d)}</span><span>${tot ? '●'.repeat(n) + '○'.repeat(Math.max(0, tot - n)) : '<small class="dm">sem missões</small>'}</span></div>`; }).join('')}</div>
    <p class="dm d3-note">As missões são escolhidas pelos teus atributos mais fracos e completam-se sozinhas com o que registas no Náutilo. São difíceis de propósito: um dia com as 3 feitas é um dia a sério.</p></section>`; };

const bossArt = f => OS.Monstros && f.mid ? OS.Monstros.img(f.mid, { t: f.t, hurt: f.dead ? 0 : f.dmg / f.hp, dead: f.dead && f.over }, 'd3-boss' + (f.dead ? ' dead' : '')) : '';
T.chefe = st => { const f = D.bossFight(), a = AO[f.a], left = U.diff(U.addDays(f.w, 7), today()), past = Object.keys(S().boss || {}).filter(w => w < f.w).sort().reverse().slice(0, 10), cf = D.colossus(), cl = U.dim(cf.ym) - +today().slice(8, 10) + 1;
  const tot = Object.values(f.hits).reduce((x, v) => x + v, 0) || 1;
  return `<section class="d3-bossw" style="--c:${a.c}"><div class="d3-bossart">${bossArt(f)}</div><div class="d3-bossi"><div class="cz d3-k">Chefe da semana · ${esc(a.n)}${f.t ? ` · ameaça ${f.t + 1}` : ''}</div><h2>${esc(f.name)}</h2><p class="dm"><i>${esc(f.lore)}</i></p>
      <div class="d3-hp"><span class="cz">Vida</span>${bar(f.left / f.hp, '#B5483B')}<small class="mono">${U.nf(f.left)} / ${U.nf(f.hp)}</small></div>
      <p>${f.dead ? `<b class="gold">Derrotado!</b> +100 de ouro.` : `Faltam <b class="mono">${U.nf(f.left)}</b> de dano · ${left > 1 ? left + ' dias' : 'último dia'}.`}</p>
      <p class="dm">Fraco contra <b style="color:${a.c}">${esc(a.n)}</b>: o XP desse atributo dá dano inteiro; os outros dão 25%. As missões não contam: só o que fazes. Cada vez que o vences, volta mais forte.</p><div class="d3-gos">${a.go.map(goLink).join('')}</div></div></section>
  <section class="d3-bossw d3-col"><div class="d3-bossart">${OS.Monstros && cf.mid ? OS.Monstros.img(cf.mid, { t: 3, hurt: cf.dead ? 0 : cf.dmg / cf.hp }, 'd3-boss') : ''}</div><div class="d3-bossi"><div class="cz d3-k">Colosso do mês · ${esc(U.fmtYML(cf.ym))}</div><h2>${esc(cf.name)}</h2><p class="dm"><i>${esc(cf.lore)}</i></p>
      <div class="d3-hp"><span class="cz">Vida</span>${bar(cf.left / cf.hp, '#7A2FB0')}<small class="mono">${U.nf(cf.left)} / ${U.nf(cf.hp)}</small></div>
      <p>${cf.dead ? '<b class="gold">Derrubado!</b> +500 de ouro.' : `Faltam <b class="mono">${U.nf(cf.left)}</b> de dano · ${cl > 1 ? cl + ' dias' : 'último dia'}.`}</p><p class="dm">Todo o XP do mês conta (menos as missões). A vida dele vem da tua média dos últimos 3 meses, mais 15%: para o derrubar tens de fazer mais do que costumas.</p></div></section>
  <section class="d3-card"><div class="d3-h"><span class="cz">Golpes desta semana</span><span class="dm mono">${U.nf(f.dmg)} de dano</span></div>${Object.keys(f.hits).length ? AK.filter(k => f.hits[k]).sort((x, y) => f.hits[y] - f.hits[x]).map(k => `<div class="d3-hit"><span style="color:${AO[k].c}">${esc(AO[k].n)}</span>${bar(f.hits[k] / tot, AO[k].c)}<b class="mono">${U.nf(Math.round(f.hits[k]))}</b></div>`).join('') : '<p class="dm">Ainda nenhum golpe. Cada registo desta semana é um golpe.</p>'}</section>
  ${past.length ? `<section class="d3-card"><div class="d3-h"><span class="cz">Chefes anteriores</span><span class="dm mono">${bossesWon().length} derrotados</span></div>${past.map(w => { const p = D.bossFight(w); return `<div class="d3-past">${OS.Monstros && p.mid ? OS.Monstros.img(p.mid, { t: p.t, dead: !p.dead, aura: false }, 'sm') : ''}<span class="mono dm">${U.fmtDS(w)}</span><span style="color:${AO[p.a].c}">${esc(p.name)}</span><b class="${p.dead ? 'gold' : 'dm'}">${p.dead ? 'derrotado' : 'fugiu'}</b></div>`; }).join('')}</section>` : ''}`; };

T.bestiario = st => { const mo = OS.Monstros; if (!mo) return '<p class="dm">Bestiário indisponível.</p>'; const K = D.kills(), s = S(), bw = {}, cw = {};
  Object.keys(s.boss || {}).forEach(w => { try { const f = D.bossFight(w); if (f.dead) bw[f.mid] = (bw[f.mid] || 0) + 1; } catch (e) { } }); Object.keys(s.col || {}).forEach(ym => { try { const c = D.colossus(ym); if (c.dead) cw[c.mid] = (cw[c.mid] || 0) + 1; } catch (e) { } });
  const seenB = new Set(Object.keys(s.boss || {}).map(w => mo.bossOf(s.boss[w].a))), seenC = new Set(Object.values(s.col || {}).map(c => mo.COLOSSI[c.i % mo.COLOSSI.length])), seenM = new Set(Object.keys(s.q || {}).map(d => D.monsterOf(d)));
  const cell = (id, n, seen) => { const m = mo.ALL[id]; return `<div class="d3-bst ${n ? 'won' : seen ? 'seen' : 'unk'}" style="--c:${m.a ? AO[m.a].c : '#B388FF'}">${mo.img(id, { aura: false, dead: !seen })}<b>${seen ? esc(m.n) : '???'}</b><small class="dm">${n ? `${n}× derrotado` : seen ? 'escapou' : m.a ? esc(AO[m.a].n) : 'colosso'}</small>${seen ? `<p class="dm">${esc(m.lore)}</p>` : ''}</div>`; };
  const tot = mo.MINIONS.length + mo.BOSSES.length + mo.COLOSSI.length, got = Object.keys(K).length + Object.keys(bw).length + Object.keys(cw).length;
  return `<section><div class="d3-h"><span class="cz">Bestiário</span><span class="dm mono">${got}/${tot} derrotados</span></div><p class="dm d3-note">${tot} criaturas: os monstros do dia (cada um morre com as 3 missões), os chefes da semana e os colossos do mês. Os que ainda não viste aparecem às escuras.</p></section>
  <section class="d3-card"><div class="d3-h"><span class="cz">Colossos do mês</span><span class="dm mono">${Object.keys(cw).length}/${mo.COLOSSI.length}</span></div><div class="d3-bsts">${mo.COLOSSI.map(id => cell(id, cw[id] || 0, seenC.has(id))).join('')}</div></section>
  <section class="d3-card"><div class="d3-h"><span class="cz">Chefes da semana</span><span class="dm mono">${Object.keys(bw).length}/${mo.BOSSES.length}</span></div><div class="d3-bsts">${mo.BOSSES.map(id => cell(id, bw[id] || 0, seenB.has(id))).join('')}</div></section>
  ${AT.map(a => { const L = mo.ofA(a.k); return `<section class="d3-card"><div class="d3-h"><span class="cz" style="color:${a.c}">${esc(a.n)}</span><span class="dm mono">${L.filter(id => K[id]).length}/${L.length}</span></div><div class="d3-bsts">${L.map(id => cell(id, K[id] || 0, seenM.has(id))).join('')}</div></section>`; }).join('')}`; };
T.conquistas = () => { const L = D.achievements(), n = L.reduce((a, x) => a + x.t, 0);
  return `<section><div class="d3-h"><span class="cz">Conquistas</span><span class="dm mono">${n}/${L.length * 5} medalhas</span></div><div class="d3-achs">${L.map(a => `<div class="d3-ach t${a.t}"><span class="d3-achi">${ic(a.ic)}</span><div><b>${esc(a.n)}</b><small class="dm">${a.next ? `<span class="mono">${U.nf(a.v)}/${U.nf(a.next)}</span> ${esc(a.u)}` : `<span class="mono">${U.nf(a.v)}</span> ${esc(a.u)} · completa`}</small>${bar(a.next ? a.v / a.next : 1)}<span class="d3-med">${[0, 1, 2, 3, 4].map(i => `<i class="${i < a.t ? 'on m' + i : ''}" title="${TIERN[i]}: ${U.nf(a.th[i])}"></i>`).join('')}</span></div></div>`).join('')}</div>
  <p class="dm d3-note">Bronze, prata, ouro, platina e diamante. O diamante é para poucos: anos de trabalho. Cada medalha dá ouro para o guarda-roupa (${TIERG.join(' / ')}).</p></section>`; };

T.baus = st => { const s = S(), ch = D.chests(), lv = (s.opened || 0) + 1, o = ch ? chestOpts(lv) : null, mine = OS.all('rewards'), pend = s.got.map((g, i) => [g, i]).filter(([g]) => !g.used);
  return `<section class="d3-chestw">${ch ? `<div class="d3-chest">${ic('gift')}</div><div><div class="cz d3-k">Baú do nível ${lv} · ${esc(o.tier)}</div><h2>${ch > 1 ? `Tens ${ch} baús por abrir` : 'Tens um baú por abrir'}</h2><p class="dm">Escolhe uma das duas recompensas. É real: dá-ta a ti mesmo.</p>
      <div class="d3-opts">${o.out.map((x, i) => `<button class="d3-opt" data-act="d3Open" data-i="${i}"><small class="cz">${esc(x[1])}</small><b>${esc(x[0])}</b><span class="dm">Escolher</span></button>`).join('')}</div></div>`
    : `<div class="d3-chest off">${ic('gift')}</div><div><h2>Sem baús por abrir</h2><p class="dm">Cada nível novo do herói traz um baú: comum, rara a cada 2 níveis, épica a cada 5 e lendária a cada 10. Faltam <b class="mono">${xpTxt(st.H.need - st.H.into)}</b> XP para o próximo.</p></div>`}</section>
  <section class="d3-card"><div class="d3-h"><span class="cz">Por gozar</span><span class="dm mono">${pend.length}</span></div>${pend.length ? pend.map(([g, i]) => `<div class="d3-rw"><div><b>${esc(g.t)}</b><small class="dm">${esc(g.tier)} · nível ${g.lv} · ${U.fmtDS(g.d)}</small></div><button class="dbtn sm gold" data-act="d3Used" data-i="${i}">Já gozei</button></div>`).join('') : '<p class="dm">Nada por gozar.</p>'}
    ${s.got.some(g => g.used) ? `<details><summary class="dm">Já gozadas (${s.got.filter(g => g.used).length})</summary>${s.got.map((g, i) => [g, i]).filter(([g]) => g.used).slice(0, 30).map(([g, i]) => `<div class="d3-rw used"><div><b>${esc(g.t)}</b><small class="dm">nível ${g.lv}</small></div><button class="dbtn sm" data-act="d3Used" data-i="${i}">Desfazer</button></div>`).join('')}</details>` : ''}</section>
  <section class="d3-card"><div class="d3-h"><span class="cz">As tuas recompensas</span><button class="dbtn sm gold" data-new="rewards">${ic('plus')}Nova</button></div>
    <p class="dm">Os baús sorteiam a partir desta lista (e da raridade de cada uma). ${mine.length < 2 ? 'Enquanto tiveres menos de 2, uso uma lista base.' : ''}</p>${mine.length ? `<div class="d3-rws">${mine.map(r => `<button class="d3-rwi" data-edit="rewards:${r.id}"><small class="cz">${esc(r.tier || 'Comum')}</small>${esc(r.title)}</button>`).join('')}</div>` : ''}</section>`; };

T.visual = st => { const s = S(), eq = eqOf(st), has = id => (s.owned || []).includes(id), grp = { frame: ['Molduras', 'a cor da carta'], scene: ['Cenários especiais', 'loja · ouro'], fx: ['Efeitos', 'à tua volta'], head: ['Coroa', 'loja · ouro (ou herói nível 30)'] }, ct = cardTier(st.H.l), nt = TIERS.find(t => t[0] > st.H.l);
  return `<section class="d3-vis"><div class="d3-cardw">${D.card()}</div><div><div class="d3-h"><span class="cz">O teu personagem</span><span class="dm">${ic('coin')}<b class="mono">${U.nf(st.gold)}</b> ouro</span></div>${lookEd()}
    <form class="d3-name" data-form="d3Name"><input class="field" name="n" value="${esc(s.name || '')}" placeholder="${esc(OS.one('profile').short || 'O teu nome')}" aria-label="Nome do herói" maxlength="24"><button class="dbtn sm">Mudar nome</button></form>
    <p class="dm d3-tip">Carta <b class="gold">${esc(ct[2])}</b>${nt ? ` · no nível ${nt[0]} passa a <b>${esc(nt[2])}</b>` : ' · o material máximo'}. O ânimo muda a expressão e as cores: se passares dias sem registar nada, o herói fica abatido.</p></div></section>
  <section class="d3-card"><div class="d3-h"><span class="cz">O que muda sozinho</span><span class="dm">pelos teus atributos</span></div><div class="d3-looks">${AT.map(a => { const l = st.lv[a.k].l, nx = nextLook(a.k, l); return `<div style="--c:${a.c}"><span class="d3-ati">${ic(a.ic)}</span><div><b>${esc(LOOKS[a.k][tierOf(l)])}</b><small class="dm">${esc(a.n)} ${l}${nx ? ` · nível ${nx.lv}: ${esc(nx.n)}` : ' · máximo'}</small></div></div>`; }).join('')}</div></section>
  <section class="d3-card"><div class="d3-h"><span class="cz">Cenários</span><span class="dm">ganhas com o nível do herói</span></div><div class="d3-shop">${SCENES.map(([v, n, l]) => { const ok = st.H.l >= l, on = eq.scene === v; return `<button class="d3-item ${on ? 'on' : ''} ${ok ? '' : 'lock'}" ${ok ? `data-act="d3Scene" data-v="${v}"` : 'disabled'}><span class="d3-thumb">${D.card({ mini: 1, eq: { scene: v } })}</span><b>${esc(n)}</b><small class="dm">${ok ? (on ? 'a usar' : 'usar') : 'nível ' + l}</small></button>`; }).join('')}</div></section>
  ${['frame', 'scene', 'fx', 'head'].map(slot => `<section class="d3-card"><div class="d3-h"><span class="cz">${grp[slot][0]}</span><span class="dm">${grp[slot][1]}</span></div><div class="d3-shop">${SHOP.filter(i => i.s === slot).map(i => { const own = has(i.id), on = own && (slot === 'head' ? (s.look || {}).head === i.v : eq[slot] === i.v), can = st.gold >= i.p;
    return `<button class="d3-item ${on ? 'on' : ''} ${own || can ? '' : 'poor'}" data-act="d3Buy" data-id="${i.id}"><span class="d3-thumb">${D.card(slot === 'head' ? { mini: 1, look: { head: i.v } } : { mini: 1, eq: { [slot]: i.v } })}</span><b>${esc(i.n)}</b><small class="${own ? 'gold' : 'dm'}">${own ? (on ? 'a usar · tirar' : 'teu · usar') : `${ic('coin')}${U.nf(i.p)}`}</small></button>`; }).join('')}</div></section>`).join('')}
  <section class="d3-card"><label class="d3-tog"><input type="checkbox" data-act="d3Fly" ${s.fly !== false ? 'checked' : ''}> Mostrar o +XP no canto quando registo algo noutras páginas</label></section>`; };

T.marcos = () => { const s = S(), p = D.PK.includes(OS.ui.d3Leg) ? OS.ui.d3Leg : 'int', L = legList(p), done = L.filter(t => isDone(p, t)), nxt = L.filter(t => !isDone(p, t)).slice(0, 5), off = (legx().off[p] || []).length, dd = t => (legDone(p).find(m => m.t === t) || {}).d;
  const pf = t => (legDone(p).find(m => m.t === t) || {}).proof;
  const row = (t, i) => { const au = isDone(p, t) ? null : autoLeg(t); return `<div class="d3-leg ${isDone(p, t) ? 'ok' : ''} ${au ? 'auto' : ''}"><button class="d3-legc" data-act="d3Leg" data-p="${p}" data-t="${esc(t)}" aria-label="${isDone(p, t) ? 'Desmarcar' : au ? 'Verificar' : 'Provar'}: ${esc(t)}">${isDone(p, t) ? '✓' : au && au.ok ? '!' : ''}</button><span class="mono dm">${i + 1}</span><span class="d3-legt">${esc(t)}${isDone(p, t) && dd(t) ? `<small class="gold"> · ${U.fmtD(dd(t))}</small>` : ''}${isDone(p, t) && pf(t) ? `<small class="dm d3-legp">${esc(pf(t))}</small>` : ''}${au ? `<small class="dm d3-legp">${au.ok ? 'Já conseguiste: toca para confirmar' : `Prova automática: <span class="mono">${U.nf(au.c)}/${U.nf(au.n)}</span> ${esc(au.u)}`}</small>${bar(au.c / au.n)}` : ''}</span><button class="d3-legx" data-act="d3LegOff" data-p="${p}" data-t="${esc(t)}" aria-label="Tirar da lista" title="Tirar da lista">${ic('x')}</button></div>`; };
  return `<nav class="d3-ptabs">${D.PK.map(k => `<button class="${k === p ? 'on' : ''}" data-act="d3LegTab" data-p="${k}" style="--c:${AO[LEGA[k]].c}">${esc(LEGN[k])} <small class="mono">${legDone(k).length}/${legList(k).length}</small></button>`).join('')}</nav>
  <section class="d3-card"><div class="d3-h"><span class="cz">Próximos marcos · ${esc(LEGN[p])}</span><span class="dm">+${U.nf(LEGXP)} XP em ${esc(AO[LEGA[p]].n)} cada · só com prova</span></div>${nxt.length ? nxt.map(t => row(t, L.indexOf(t))).join('') : '<p class="gold">Todos feitos. Lenda.</p>'}</section>
  <section class="d3-card"><div class="d3-h"><span class="cz">Acrescentar um marco</span></div><form class="d3-legadd" data-form="d3LegAdd" data-p="${p}"><input class="field" name="t" placeholder="Ex.: Fazer o Caminho de Santiago" aria-label="Novo marco" required maxlength="160"><select class="field" name="where" aria-label="Onde"><option value="next">A seguir (próximo)</option><option value="end">No fim da lista</option></select><button class="dbtn sm gold">Acrescentar</button></form>
    ${off ? `<p class="dm">Tiraste ${off} ${off === 1 ? 'marco' : 'marcos'} desta lista. <button class="d3-link" data-act="d3LegReset" data-p="${p}">Repor</button></p>` : ''}</section>
  ${done.length ? `<section class="d3-card"><div class="d3-h"><span class="cz">Feitos</span><span class="dm mono">${done.length}</span></div>${done.map(t => row(t, L.indexOf(t))).join('')}</section>` : ''}
  <section class="d3-card"><details><summary class="cz">Ver os ${L.length} marcos de ${esc(LEGN[p])}</summary><div class="d3-legall">${L.map(row).join('')}</div></details></section>
  <p class="dm d3-note">${OS.Acc && OS.Acc.pub ? 'Marcos reais e difíceis nos 5 pilares, do primeiro passo ao legado. Tira os que não são para ti e acrescenta os teus.' : 'Os teus marcos vêm do teu Notion (Dominus original + Dominus 2.0) e estão atualizados com o que mudou: a vida em Aveiro, o ISCA-UA e o pilar Espiritual. Tira os que já não fazem sentido e acrescenta os novos.'}</p>`; };

// diário: quando cada nível foi alcançado, a partir do histórico
const timeline = st => { const ev = st.all.slice().sort((a, b) => a.d.localeCompare(b.d)), acc = Object.fromEntries(AK.map(k => [k, 0])), lv = Object.fromEntries(AK.map(k => [k, 0])), out = []; let tot = 0, hl = 0;
  ev.forEach(e => { acc[e.a] += e.x; tot += e.x; const l = D.lvA(acc[e.a]).l; if (l > lv[e.a]) { lv[e.a] = l; out.push({ d: e.d, t: `${AO[e.a].n} chegou ao nível ${l}`, c: AO[e.a].c, why: e.t }); } const h = D.lvH(tot).l; if (h > hl) { hl = h; out.push({ d: e.d, t: `O herói chegou ao nível ${h}`, c: '#38BDF8', big: 1, why: e.t }); } });
  bossesWon().forEach(w => { const f = D.bossFight(w); out.push({ d: U.addDays(w, 6) > today() ? today() : U.addDays(w, 6), t: 'Chefe derrotado: ' + f.name, c: '#E5735A', big: 1 }); });
  D.PK.forEach(p => legDone(p).forEach(m => out.push({ d: m.d, t: 'Marco: ' + m.t, c: AO[LEGA[p]].c, big: 1 })));
  return out.sort((a, b) => b.d.localeCompare(a.d)); };
T.diario = st => { const days = U.lastN(14), per = days.map(d => { const o = Object.fromEntries(AK.map(k => [k, 0])); (st.byDay[d] || []).concat(st.mis.ev.filter(e => e.d === d)).forEach(e => { o[e.a] += e.x; }); return o; }), mx = Math.max(10, ...per.map(o => AK.reduce((a, k) => a + o[k], 0))), W = 300, Hh = 120, bw = W / days.length;
  const chart = `<svg viewBox="0 0 ${W} ${Hh + 16}" class="d3-chart" role="img" aria-label="XP dos últimos 14 dias">${per.map((o, i) => { let y = Hh; return AK.map(k => { if (!o[k]) return ''; const h = o[k] / mx * (Hh - 6); y -= h; return `<rect x="${(i * bw + 2).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${h.toFixed(1)}" fill="${AO[k].c}" rx="1.5"/>`; }).join(''); }).join('')}${days.map((d, i) => i % 2 ? '' : `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${Hh + 12}" text-anchor="middle">${d.slice(8)}</text>`).join('')}</svg>`;
  const tl = timeline(st).slice(0, 80);
  return `<section class="d3-card"><div class="d3-h"><span class="cz">XP dos últimos 14 dias</span><span class="dm mono">melhor sequência: ${st.best} dias</span></div>${chart}<div class="d3-leg2">${AT.map(a => `<span><i style="background:${a.c}"></i>${esc(a.n)}</span>`).join('')}</div></section>
  <section class="d3-card"><div class="d3-h"><span class="cz">A tua história</span><span class="dm">${tl.length} momentos</span></div>${tl.length ? `<div class="d3-tl">${tl.map(x => `<div class="${x.big ? 'big' : ''}" style="--c:${x.c}"><span class="mono dm">${U.fmtDS(x.d)}</span><div><b>${esc(x.t)}</b>${x.why ? `<small class="dm">${esc(x.why)}</small>` : ''}</div></div>`).join('')}</div>` : '<p class="dm">A tua história começa no primeiro registo.</p>'}</section>`; };

// criação do personagem
const born = () => { const s = S(), st = D.state();
  return `<div class="dom d3"><section class="d3-new"><div class="cz d3-k">NÁUTILO · O JOGO</div><h1>DOMINUS</h1><p class="d3-lead">O herói és tu. Já o fiz à tua imagem (pele, cabelo cacheado, óculos, cavanhaque): muda o que quiseres. Ele cresce sozinho com tudo o que fazes na vida real e registas no Náutilo.</p>
    <div class="d3-newg"><div class="d3-cardw">${D.card()}</div>
      <div><div class="d3-step"><span class="cz">1 · O teu visual</span></div>${lookEd()}
        <div class="d3-step"><span class="cz">2 · O teu nome</span></div><form class="d3-name" data-form="d3Born"><div><input class="field" id="d3n" name="n" value="${esc(s.name || OS.one('profile').short || '')}" maxlength="24" placeholder="O teu nome" aria-label="Nome do herói"><button class="dbtn gold">${ic('crown')}Criar o meu herói</button></div></form>
        ${st.total ? `<p class="d3-start">Pelo que já registaste, começas no <b>nível ${st.H.l}</b> (${esc(st.title)}) com <b class="mono">${xpTxt(st.total)}</b> XP.</p>` : '<p class="d3-start dm">Começas no nível 0. O primeiro registo já te dá XP.</p>'}</div></div>
    <div class="d3-rules"><div>${ic('zap')}<b class="cz">8 atributos</b><span>Corpo, Mente, Intelecto, Fortuna, Relações, Espírito, Carreira e Disciplina. Sobem sozinhos: nunca escolhes onde pôr pontos.</span></div>
      <div>${ic('user')}<b class="cz">A carta muda</b><span>Brilho com o Corpo, aura com a Mente, halo com o Espírito, ouro com a Fortuna, companheiros com as Relações, estandartes com a Disciplina. Bronze, prata, ouro… com o nível.</span></div>
      <div>${ic('target')}<b class="cz">Missões e monstros</b><span>3 missões difíceis por dia (o monstro do dia), 3 por semana, 3 campanhas por mês, um chefe semanal do teu ponto mais fraco e um colosso por mês.</span></div>
      <div>${ic('gift')}<b class="cz">Baús reais</b><span>Cada nível abre um baú com duas recompensas à escolha, da tua lista.</span></div></div></section></div>`; };

const mig4 = () => { const s = S(); if (s.v4) return; s.v4 = 1; Object.values(s.boss || {}).forEach(b => { if (b && b.hp && b.hp < 3000) b.hp *= 10; }); try { const st = D.state(); s.opened = Math.min(s.opened || 0, st.H.l); seeClass(st); s.seen = snap(st); } catch (e) { } qsave(); };
V.dominus = sub => { const s = S(); if (!s.born) return born(); mig4();
  const st = D.state(), key = sub === 'codex' ? 'marcos' : TABS.some(t => t[0] === sub) ? sub : '', ch = D.chests(), M = D.missions(), mleft = M.dl.filter(m => !m.ok).length, bf = D.bossFight();
  setTimeout(D.check, 250);
  const badge = k => k === 'baus' && ch ? `<span class="n">${ch}</span>` : k === 'missoes' && mleft ? `<span class="n dim">${mleft}</span>` : k === 'chefe' && bf.dead ? '<span class="n ok">✓</span>' : '';
  return `<div class="dom d3"><nav class="dtabs d3-tabs">${TABS.map(([k, l, i]) => `<a href="#dominus${k ? '.' + k : ''}" class="${key === k ? 'on' : ''}">${ic(i)}<span>${l}</span>${badge(k)}</a>`).join('')}</nav>${T[key || 'heroi'](st)}</div>`; };

/* ================= AÇÕES ================= */
OS.forms.d3Born = (f, v) => { const s = S(); s.name = v('n').slice(0, 24); s.born = today(); const st = D.state(); s.seen = snap(st); save(); OS.request();
  D.celebrate({ k: 'O herói nasceu', t: s.name || pname0(), s: st.total ? `Começas no nível ${st.H.l} (${st.title}) com tudo o que já fizeste.` : 'Faz as missões de hoje: o XP entra sozinho.', av: 1 }); };
OS.forms.d3Name = (f, v) => { const s = S(); s.name = v('n').slice(0, 24); save(); UI.toast('Nome guardado', 'pos'); };
A.d3Fly = b => { const s = S(); s.fly = !!b.checked; save(); };
D.summary = () => { try { const s = S(); if (!s.born) return ''; const st = D.state(); return `nível ${st.H.l} (${st.title}), classe ${st.clsFull}; ` + AT.map(a => `${a.n} ${st.lv[a.k].l}`).join(', ') + `; ${st.streak} dias seguidos; ${D.chests()} baús por abrir`; } catch (e) { return ''; } };

})();
