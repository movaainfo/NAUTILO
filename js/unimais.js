/* NÁUTILO — Universidade: cor de cada disciplina e Trabalhos & TPC.
   Cada disciplina tem uma cor (escolhes tu ou fica uma automática) que aparece em toda a Universidade, no horário e no calendário.
   Trabalhos & TPC: o sítio para anotar as lições, os exercícios, as leituras e os trabalhos que tens para fazer, com prazo.
   Ficam como tarefas da área Universidade (aparecem também em Tarefas, no calendário e nos Próximos passos), e os trabalhos
   com nota (registados em Avaliações) aparecem aqui ao lado. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc, today = () => U.today();
const UNI = OS.UNI, UT = OS.UT; if (!UNI || !UT) return;

/* ---------- cores ---------- */
const PAL = ['#E5735A', '#6FA8E8', '#A08CF0', '#E8C26A', '#5CC8A8', '#F08DB8', '#8ACB6A', '#F2A65A', '#5FB3D9', '#C98BDB', '#D9D36A', '#E8807A'];
const order = () => U.sortBy(OS.all('subjects'), s => (s._c || 0) + '|' + (s.name || ''));
const color = id => { const s = OS.get('subjects', id); if (!s) return 'var(--mut)'; if (s.color && /^#[0-9a-f]{6}$/i.test(s.color)) return s.color; const i = order().findIndex(x => x.id === id); return PAL[(i < 0 ? 0 : i) % PAL.length]; };
const name = id => (OS.get('subjects', id) || {}).name || '';
const SJ = OS.SJ = { PAL, color, name,
  dot: id => id && OS.get('subjects', id) ? `<i class="sj-dot" style="--sj:${color(id)}"></i>` : '',
  tag: id => { const n = name(id); return n ? `<span class="sj" style="--sj:${color(id)}"><i></i>${esc(n)}</span>` : '—'; } };
// campo "Cor" na disciplina: 12 cores à escolha (ou automática)
if (OS.S.subjects && !OS.S.subjects.fields.some(f => f.k === 'color')) OS.S.subjects.fields.splice(1, 0, { k: 'color', l: 'Cor', t: 'custom', wide: 1,
  render: r => { const cur = r.color || ''; return `<div class="sj-pick" role="radiogroup" aria-label="Cor da disciplina"><label class="sj-auto"><input type="radio" name="color" value=""${cur ? '' : ' checked'}><span>Automática</span></label>${PAL.map(c => `<label><input type="radio" name="color" value="${c}"${cur === c ? ' checked' : ''}><span style="background:${c}" aria-label="${c}"></span></label>`).join('')}</div>`; },
  read: f => { const c = f.querySelector('input[name="color"]:checked'); return c ? c.value : ''; } });
// calendário: aulas e avaliações com a cor da disciplina
const Cal = OS.Cal; if (Cal && Cal.items && !Cal._sj) { const o = Cal.items; Cal.items = (a, b) => o(a, b).map(x => { if (x.color) return x; const m = /^(assessments|classes|tasks):(.+)$/.exec(x.edit || ''); let sid = '';
    if (m) { const r = OS.get(m[1], m[2]); sid = r && r.subject; } else if (x.src === 'class') { const s = OS.all('subjects').find(s => s.name === x.title); sid = s && s.id; }
    return sid && OS.get('subjects', sid) ? Object.assign(x, { color: color(sid) }) : x; }); Cal._sj = 1; }

/* ---------- Trabalhos & TPC ---------- */
const KINDS = ['TPC / lição', 'Exercícios', 'Leitura', 'Trabalho individual', 'Trabalho de grupo', 'Relatório', 'Apresentação', 'Projeto', 'Outro'];
if (OS.S.tasks && !OS.S.tasks.fields.some(f => f.k === 'hw')) { const i = OS.S.tasks.fields.findIndex(f => f.k === 'subject'); OS.S.tasks.fields.splice(i + 1, 0, { k: 'hw', l: 'Tipo de trabalho', t: 'sel', o: KINDS, show: r => r.area === 'Universidade' }); }
const isHw = t => t.area === 'Universidade' && (t.hw || t.subject);
const open = () => OS.all('tasks').filter(t => isHw(t) && t.status !== 'Feita');
const GRADED = ['Trabalho', 'Projeto', 'Apresentação'];
const graded = () => OS.all('assessments').filter(a => GRADED.includes(a.type) && a.prep !== 'Feito');
const items = (sid) => { const t = today(), L = open().map(x => ({ k: 't', id: x.id, title: x.title, subject: x.subject, kind: x.hw || 'TPC / lição', due: x.due || x.sched || '', prio: x.prio, notes: x.notes }))
    .concat(graded().map(a => ({ k: 'a', id: a.id, title: a.title, subject: a.subject, kind: a.type + (a.weight ? ' · ' + a.weight + '% da nota' : ''), due: a.date || '', prep: a.prep || 'Não comecei' })));
  return U.sortBy(L.filter(x => !sid || x.subject === sid), x => (x.due || '9999') + x.title); };
const bucket = d => { const t = today(); if (!d) return 'sem'; if (d < t) return 'late'; if (d <= U.addDays(t, 1)) return 'now'; if (d <= U.addDays(t, 7)) return 'week'; return 'later'; };
const BK = [['late', 'Atrasados'], ['now', 'Hoje e amanhã'], ['week', 'Próximos 7 dias'], ['later', 'Mais tarde'], ['sem', 'Sem prazo']];
const when = d => { if (!d) return ''; const n = U.diff(d, today()); return n < 0 ? `há ${-n} ${n === -1 ? 'dia' : 'dias'}` : n === 0 ? 'hoje' : n === 1 ? 'amanhã' : U.fmtDS(d); };
const row = x => `<div class="hw-it ${bucket(x.due)}" style="--sj:${x.subject ? color(x.subject) : 'var(--line3)'}">
  ${x.k === 't' ? `<input type="checkbox" class="cbx round" data-act="hwDone" data-id="${x.id}" aria-label="Feito: ${esc(x.title)}">` : `<button class="hw-ab" data-act="hwGraded" data-id="${x.id}" title="Marcar como entregue" aria-label="Entregue: ${esc(x.title)}">${UI.ic('check')}</button>`}
  <div class="hw-t" data-edit="${x.k === 't' ? 'tasks' : 'assessments'}:${x.id}"><b>${esc(x.title)}</b><small>${x.subject ? SJ.tag(x.subject) : ''}<span class="hw-k">${esc(x.kind)}</span>${x.k === 'a' ? `<span class="hw-k">${esc(x.prep)}</span>` : ''}</small></div>
  <span class="hw-d">${esc(when(x.due))}</span></div>`;
const addForm = sid => `<form class="hw-add" data-form="hwAdd" autocomplete="off"><input class="field" name="t" required maxlength="160" placeholder="O que tens para fazer? Ex.: exercícios 4 a 9 do capítulo 3" aria-label="O que tens para fazer">
  <select class="field" name="s" aria-label="Disciplina" required><option value="">Disciplina</option>${OS.St.current().map(s => `<option value="${s.id}"${sid === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
  <select class="field" name="k" aria-label="Tipo">${KINDS.map(k => `<option>${k}</option>`).join('')}</select>
  <input class="field" type="date" name="d" aria-label="Prazo" min="${U.addDays(today(), -30)}"><button class="btn pri">${UI.ic('plus')}Anotar</button></form>`;
UNI.trabalhos = () => { const sid = OS.ui.hwS || '', L = items(sid), cur = OS.St.current(), late = L.filter(x => bucket(x.due) === 'late').length, wk = L.filter(x => ['now', 'week'].includes(bucket(x.due))).length;
  const done = U.sortBy(OS.all('tasks').filter(t => isHw(t) && t.status === 'Feita' && (!sid || t.subject === sid)), t => t.doneAt || '').reverse().slice(0, 15);
  return `<div class="kpis">${UI.kpi('Por fazer', L.length)}${UI.kpi('Atrasados', late, '', { tone: late ? 'neg' : '' })}${UI.kpi('Para esta semana', wk, '', { tone: wk ? 'warn' : '' })}${UI.kpi('Feitos nos últimos 7 dias', OS.all('tasks').filter(t => isHw(t) && t.status === 'Feita' && (t.doneAt || '') >= U.addDays(today(), -7)).length, '', { tone: 'pos' })}</div>
  <div class="pn">${addForm(sid)}</div>
  ${cur.length > 1 ? `<div class="row gap6 hw-f">${UI.chip('Todas', 'hwS', !sid, 'data-v=""')}${cur.map(s => `<button class="chip sj-chip ${sid === s.id ? 'on' : ''}" data-act="hwS" data-v="${s.id}" style="--sj:${color(s.id)}"><i></i>${esc(s.name)}</button>`).join('')}</div>` : ''}
  ${L.length ? BK.map(([k, l]) => { const B = L.filter(x => bucket(x.due) === k); return B.length ? `<section class="pn hw-b ${k}"><div class="pn-h"><h3>${l}</h3><span class="mono mut">${B.length}</span></div>${B.map(row).join('')}</section>` : ''; }).join('')
    : UI.empty(sid ? 'Nada por fazer nesta disciplina.' : 'Sem trabalhos nem TPC por fazer. Anota em cima o que o professor mandou fazer, com o prazo.')}
  ${done.length ? `<details class="pn hw-done"><summary>Feitos recentemente (${done.length})</summary>${done.map(t => `<div class="hw-it done" style="--sj:${t.subject ? color(t.subject) : 'var(--line3)'}"><input type="checkbox" class="cbx round" checked data-act="hwUndo" data-id="${t.id}" aria-label="Voltar a pôr por fazer: ${esc(t.title)}"><div class="hw-t" data-edit="tasks:${t.id}"><b>${esc(t.title)}</b><small>${t.subject ? SJ.tag(t.subject) : ''}<span class="hw-k">${esc(t.hw || '')}</span></small></div><span class="hw-d">${t.doneAt ? U.fmtDS(t.doneAt) : ''}</span></div>`).join('')}</details>` : ''}
  <p class="mut hw-note">Ficam também em Tarefas (área Universidade), no calendário e nos Próximos passos. Os trabalhos com nota registam-se em Avaliações e aparecem aqui até os entregares.</p>`; };
if (!UT.some(t => t[0] === 'trabalhos')) { const i = UT.findIndex(t => t[0] === 'avaliacoes'); UT.splice(i + 1, 0, ['trabalhos', 'Trabalhos e TPC']); }
OS.forms.hwAdd = (f, v) => { const t = v('t'), s = v('s'), d = v('d'); if (!t) return; if (!s) { UI.toast('Escolhe a disciplina', 'warn'); return false; }
  const n = d ? U.diff(d, today()) : 99; OS.add('tasks', { title: t.slice(0, 160), area: 'Universidade', subject: s, hw: v('k') || 'TPC / lição', due: d || '', status: 'Próxima', prio: n <= 1 ? '1' : n <= 4 ? '2' : '3', effort: 30, ctx: ['@Computador'] });
  UI.toast('Anotado' + (d ? ' para ' + when(d) : ''), 'pos'); };
A.hwS = b => OS.setUI('hwS', b.dataset.v);
A.hwDone = b => { const t = OS.get('tasks', b.dataset.id); if (!t) return; OS.upd('tasks', t.id, { status: 'Feita', doneAt: today() }); UI.toast('Feito', 'pos'); };
A.hwUndo = b => { const t = OS.get('tasks', b.dataset.id); if (!t) return; OS.upd('tasks', t.id, { status: 'Próxima', doneAt: '' }); };
A.hwGraded = b => { const a = OS.get('assessments', b.dataset.id); if (!a) return; OS.upd('assessments', a.id, { prep: 'Feito' }); UI.toast('Entregue. A nota regista-se em Avaliações.', 'pos'); };

/* ---------- Visão da Universidade: o que tens para entregar ---------- */
const _visao = UNI.visao;
UNI.visao = () => { const L = items('').filter(x => ['late', 'now', 'week'].includes(bucket(x.due))).slice(0, 6), h = _visao();
  const box = `<div class="pn hw-vis"><div class="pn-h"><h3>${UI.ic('checksq')}Trabalhos e TPC para entregar</h3><a class="more" href="#universidade.trabalhos">${UI.ic('right')}</a></div>${L.length ? L.map(row).join('') : '<p class="mut" style="margin:0">Nada para os próximos 7 dias.</p>'}${addForm('')}</div>`;
  return box + h; };
OS.Hw = { items, open, KINDS };
})();
