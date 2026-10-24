/* PRUMO — Ligações entre áreas: o que mudas num sítio muda nos outros.
   A maior parte da app já lê das mesmas coleções (calendário, contas a pagar, progresso de projetos e metas, hábitos automáticos…).
   Aqui ficam as ligações que dependiam de cópias ou que deixavam registos órfãos ao apagar/editar. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc;
const open = t => t.status !== 'Feita';
const upd = (c, id, p) => OS.upd(c, id, p, { silent: true });
let quiet = 0; const batch = fn => { quiet++; try { fn(); } finally { quiet--; } };
const note = (m, k = '') => { if (!quiet) UI.toast(m, k); };

/* ---------- Projetos, metas e tarefas ---------- */
OS.on('del:projects', p => { const T = OS.all('tasks').filter(t => t.project === p.id); T.forEach(t => upd('tasks', t.id, { project: '' })); if (T.length) note(`${T.length} tarefa(s) ficaram sem projeto (não foram apagadas)`); });
OS.on('del:goals', g => { let n = 0; OS.all('tasks').filter(t => t.goal === g.id).forEach(t => { upd('tasks', t.id, { goal: '' }); n++; }); OS.all('projects').filter(p => p.goal === g.id).forEach(p => { upd('projects', p.id, { goal: '' }); n++; }); if (n) note(`${n} tarefa(s)/projeto(s) desligados da meta apagada`); });
// subtarefas não ficam escondidas quando a tarefa-mãe é apagada
OS.on('del:tasks', t => OS.all('tasks').filter(s => s.parent === t.id).forEach(s => upd('tasks', s.id, { parent: '' })));

/* ---------- Universidade: avaliação ↔ plano de estudo nas tarefas, tópico ↔ revisões ---------- */
OS.on('upd:assessments', (a, b) => { if (!b) return; const T = OS.all('tasks').filter(t => t.examPlan === a.id && open(t));
  if (a.date && b.date && a.date !== b.date && T.length) { const d = U.diff(a.date, b.date), t0 = U.today(); T.forEach(t => { const nd = U.addDays(t.sched || t0, d); upd('tasks', t.id, { sched: nd < t0 ? t0 : nd > a.date ? a.date : nd, prio: U.diff(a.date, nd) <= 3 ? '1' : t.prio }); }); note(`Plano de estudo mudou ${d > 0 ? '+' : ''}${d} dia(s) com a nova data`, 'pos'); }
  if (a.subject !== b.subject) T.forEach(t => upd('tasks', t.id, { subject: a.subject })); });
OS.on('del:assessments', a => { const T = OS.all('tasks').filter(t => t.examPlan === a.id && open(t)); T.forEach(t => OS.del('tasks', t.id)); if (T.length) note(`${T.length} tarefa(s) do plano de estudo apagadas`); });
OS.on('upd:topics', (t, b) => { if (!b || (t.title === b.title && t.subject === b.subject)) return; OS.all('reviews').filter(r => r.topicId === t.id).forEach(r => upd('reviews', r.id, { topic: t.title, subject: t.subject })); });
OS.on('del:topics', t => OS.all('reviews').filter(r => r.topicId === t.id).forEach(r => OS.del('reviews', r.id)));
OS.on('del:subjects', s => { OS.all('classes').filter(c => c.subject === s.id).forEach(c => OS.del('classes', c.id)); OS.all('tasks').filter(t => t.subject === s.id && t.examPlan && open(t)).forEach(t => OS.del('tasks', t.id)); });

/* ---------- Floresta / Bloco de foco ↔ sessões de estudo ---------- */
OS.on('del:trees', t => { const s = t.sess ? OS.get('sessions', t.sess) : OS.all('sessions').find(x => x.tree === t.id); if (s) { OS.del('sessions', s.id); note('A sessão de estudo desta árvore também foi apagada'); } });
OS.on('upd:trees', (t, b) => { if (!b) return; const s = OS.all('sessions').find(x => x.tree === t.id); if (!s) return; const p = {}; if (t.subject !== b.subject) p.subject = t.subject; if (t.skill !== b.skill) p.skill = t.skill; if (t.mins !== b.mins) p.minutes = t.mins; if (t.date !== b.date) p.date = t.date; if (Object.keys(p).length) upd('sessions', s.id, p); });
OS.on('del:focusblocks', f => OS.all('sessions').filter(s => s.fblock === f.id).forEach(s => OS.del('sessions', s.id)));
// árvores antigas: liga às sessões criadas no mesmo dia pela Floresta (uma vez)
OS.on('ready', () => { try { if (U.ls.get('os2lnkTree', 0)) return; const S = OS.all('sessions').filter(s => !s.tree && /^(\S+ )?Floresta: /.test(s.learned || ''));
  OS.all('trees').filter(t => t.alive && !OS.all('sessions').some(s => s.tree === t.id)).forEach(t => { const s = S.find(x => !x.tree && x.date === t.date && +x.minutes === +t.mins && (x.subject || '') === (t.subject || '')); if (s) upd('sessions', s.id, { tree: t.id }); }); U.ls.set('os2lnkTree', 1); } catch (e) { } });

/* ---------- Trabalho: turno ↔ folga no mesmo dia ---------- */
const offK = ['Folga', 'Férias', 'Feriado', 'Baixa'];
OS.on('add:shifts', s => { const o = OS.all('dayoffs').filter(x => x.date === s.date); if (o.length) { o.forEach(x => OS.del('dayoffs', x.id)); note('Tinhas folga nesse dia: passou a dia de trabalho'); } });
const offDay = o => { if (!offK.includes(o.kind || 'Folga')) return; const sh = OS.all('shifts').filter(s => s.date === o.date); if (sh.length) { sh.forEach(s => OS.del('shifts', s.id)); note(`Turno de ${U.fmtD(o.date)} removido (${(o.kind || 'folga').toLowerCase()})`); } };
OS.on('add:dayoffs', offDay); OS.on('upd:dayoffs', (o, b) => { if (b && (b.date !== o.date || b.kind !== o.kind)) offDay(o); });
OS.on('upd:shifts', (s, b) => { if (b && b.date !== s.date) { const o = OS.all('dayoffs').filter(x => x.date === s.date); o.forEach(x => OS.del('dayoffs', x.id)); } });

/* ---------- Finanças: compra em prestações ---------- */
// mudar descrição/categoria/conta numa parcela muda as outras parcelas da mesma compra
OS.on('upd:transactions', (t, b) => { if (!b || !t.instG || quiet) return; const K = ['desc', 'cat', 'sub', 'account', 'method', 'ess'], p = {}; K.forEach(k => { if (t[k] !== b[k]) p[k] = t[k]; }); if (!Object.keys(p).length) return;
  batch(() => OS.all('transactions').filter(x => x.instG === t.instG && x.id !== t.id).forEach(x => upd('transactions', x.id, p))); });
OS.on('del:transactions', t => { if (!t.instG || quiet) return; const R = OS.all('transactions').filter(x => x.instG === t.instG); if (!R.length) return;
  setTimeout(() => UI.ask(`Apagar também as outras ${R.length} parcela(s)?`, esc(t.desc || '') + ' — apagaste uma parcela desta compra.', 'Apagar todas', () => batch(() => R.forEach(x => OS.del('transactions', x.id)))), 300); });
OS.on('del:accounts', a => { const n = OS.all('transactions').filter(t => t.account === a.id || t.toAccount === a.id).length; if (n) note(`${n} movimento(s) ficaram sem conta: escolhe outra conta neles`, 'warn'); });

/* ---------- Carreira: oportunidade ↔ candidatura, entrevistas no calendário ---------- */
const JOB = ['Emprego', 'Estágio', 'Programa universitário', 'Bolsa'];
OS.on('upd:opps', (o, b) => { if (!b || o.status === b.status) return;
  if (o.status === 'Submetida' && JOB.includes(o.kind) && !OS.all('applications').some(a => a.opp === o.id)) { OS.add('applications', { company: o.inst || o.name, role: o.inst ? o.name : '', status: 'Enviada', date: U.today(), link: o.link || '', opp: o.id }, { silent: true }); note('Candidatura criada em Carreira', 'pos'); }
  OS.all('applications').filter(a => a.opp === o.id).forEach(a => { const st = { Aceite: 'Aceite', Recusada: 'Recusada', 'Em avaliação': 'Enviada' }[o.status]; if (st && a.status !== st) upd('applications', a.id, { status: st }); }); });
OS.on('upd:applications', (a, b) => { if (!b || !a.opp || a.status === b.status) return; const o = OS.get('opps', a.opp); if (!o) return; const st = { Aceite: 'Aceite', Recusada: 'Recusada', Entrevista: 'Em avaliação', Proposta: 'Em avaliação' }[a.status]; if (st && o.status !== st) upd('opps', o.id, { status: st }); });
if (OS.Cal && OS.Cal.items) { const _it = OS.Cal.items; OS.Cal.items = (from, to) => { const out = _it(from, to); OS.all('applications').forEach(a => { if (a.interview && a.interview >= from && a.interview <= to && ['Entrevista', 'Proposta'].includes(a.status)) out.push({ date: a.interview, title: 'Entrevista: ' + a.company, src: 'opp', imp: true, edit: 'applications:' + a.id }); }); return out.sort((x, y) => (x.date + (x.start || '99')).localeCompare(y.date + (y.start || '99'))); }; }

/* ---------- Desporto ↔ plano nas tarefas; treino conta para hábitos e alertas ---------- */
OS.on('del:sports', s => { const T = OS.all('tasks').filter(t => t.sportPlan === s.id && open(t)); T.forEach(t => OS.del('tasks', t.id)); if (T.length) note(`${T.length} treino(s) planeado(s) apagados das tarefas`); });
OS.on('upd:sports', (s, b) => { if (!b || !b.name || s.name === b.name) return; OS.all('tasks').filter(t => t.sportPlan === s.id).forEach(t => upd('tasks', t.id, { title: t.title.replace(b.name + ':', s.name + ':') })); });
const Hab = OS.Hab; if (Hab && Hab.autoDone) { const _a = Hab.autoDone; Hab.autoDone = (h, d) => _a(h, d) || (h.auto === 'workout' && OS.all('sportlog').some(x => x.date === d)); }

/* ---------- avisos antes de apagar (o que acontece nas outras áreas) ---------- */
const W = {
  projects: r => { const n = OS.all('tasks').filter(t => t.project === r.id).length; return n ? `As ${n} tarefas deste projeto ficam sem projeto (não são apagadas).` : ''; },
  goals: r => { const n = OS.all('tasks').filter(t => t.goal === r.id).length + OS.all('projects').filter(p => p.goal === r.id).length; return n ? `${n} tarefa(s)/projeto(s) deixam de estar ligados a esta meta.` : ''; },
  assessments: r => { const n = OS.all('tasks').filter(t => t.examPlan === r.id && open(t)).length; return n ? `As ${n} tarefas do plano de estudo desta avaliação também são apagadas.` : ''; },
  subjects: r => { const c = OS.all('classes').filter(x => x.subject === r.id).length, s = OS.all('sessions').filter(x => x.subject === r.id).length; return `${c ? c + ' aula(s) do horário são apagadas. ' : ''}${s ? s + ' sessão(ões) de estudo ficam no histórico sem disciplina.' : ''}`; },
  accounts: r => { const n = OS.all('transactions').filter(t => t.account === r.id || t.toAccount === r.id).length; return n ? `Atenção: ${n} movimento(s) usam esta conta e os saldos vão mudar.` : ''; },
  trees: r => r.alive ? 'A sessão de estudo registada por esta árvore também é apagada.' : '',
  sports: r => { const n = OS.all('tasks').filter(t => t.sportPlan === r.id && open(t)).length; return n ? `${n} treino(s) planeado(s) nas tarefas também são apagados.` : ''; },
  topics: r => { const n = OS.all('reviews').filter(x => x.topicId === r.id).length; return n ? `${n} revisão(ões) espaçada(s) deste tópico também são apagadas.` : ''; }
};
Object.keys(W).forEach(c => { if (OS.S[c]) OS.S[c].delWarn = W[c]; });
OS.Links = { W };
})();
