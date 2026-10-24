/* PRUMO — vistas centrais: Hoje, Painel, Control Room, Next Action, Calendário, Tarefas, Hábitos & Rotina, Projetos, Metas, Modo Foco. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, C = OS.C, V = OS.views, L = OS.L, esc = U.esc;
const Fin = OS.Fin, St = OS.St, Goal = OS.Goal, Proj = OS.Proj, Hab = OS.Hab, Run = OS.Run, I = OS.Intel, Cal = OS.Cal;
const A = OS.act = OS.act || {};
const prioL = p => (L.PRIO.find(x => x[0] === String(p)) || [, ''])[1];
const prioT = p => ({ 1: 'neg', 2: 'warn' }[p] || '');
const subjN = id => (OS.get('subjects', id) || {}).name || '';
const greet = () => { const h = new Date().getHours(); return h < 6 ? 'Boa madrugada' : h < 13 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite'; };
const dayQuote = () => OS.my(L.QUOTES[U.hash(U.today()) % L.QUOTES.length]);
OS.srcColor = s => (Cal.src[s] || [, 'var(--mut)'])[1];

/* ---------- componentes partilhados ---------- */
const taskRow = (t, o = {}) => `<div class="li ${t.status === 'Feita' ? 'done' : ''}"><input type="checkbox" class="cbx round" data-act="taskToggle" data-id="${t.id}" aria-label="Concluir ${esc(t.title)}"${t.status === 'Feita' ? ' checked' : ''}>
  <div class="li-t click" data-edit="tasks:${t.id}"><b>${esc(t.title)}</b><small>${[t.due ? (OS.Tasks.late(t) ? `<span class="neg">atrasada · ${U.fmtDS(t.due)}</span>` : 'prazo ' + U.rel(t.due)) : '', esc((OS.get('projects', t.project) || {}).name || ''), esc((Array.isArray(t.ctx) ? t.ctx : []).join(' ')), esc(t.area || '')].filter(Boolean).join(' · ')}</small></div>
  <div class="li-r">${+t.prio <= 2 ? UI.badge(prioL(t.prio), prioT(t.prio)) : ''}${o.focus !== false && t.status !== 'Feita' ? `<button class="icon-btn" data-act="focusStart" data-task="${t.id}" title="Modo foco" aria-label="Modo foco">${UI.ic('focus')}</button>` : ''}</div></div>`;
OS.taskRow = taskRow;
const attRow = a => `<div class="att-it"><i class="${a.lvl}"></i><div class="${a.href ? 'click' : ''}" ${a.href ? `data-go="${a.href.slice(1)}"` : ''} style="${a.href ? 'cursor:pointer' : ''}"><b><span class="area">${esc(a.area)}</span>${esc(a.title)}</b><small>${esc(a.detail || '')}</small></div>${a.act ? `<button class="btn sm" ${a.act.a}>${a.act.l}</button>` : a.href ? `<a class="icon-btn" href="${a.href}" aria-label="Abrir">${UI.ic('right')}</a>` : '<span></span>'}</div>`;
const agendaList = (from, to, max = 14) => {
  const items = Cal.items(from, to).filter(x => x.src !== 'routine' && !(x.done && x.date < U.today()));
  if (!items.length) return UI.empty('Agenda livre neste período.', UI.addBtn('events', 'Novo compromisso', null, ''));
  let cur = '', h = '';
  items.slice(0, max).forEach(x => { if (x.date !== cur) { cur = x.date; h += `<div class="agenda-day">${x.date === U.today() ? 'Hoje' : x.date === U.addDays(U.today(), 1) ? 'Amanhã' : U.longDate(x.date)}</div>`; }
    h += `<div class="agenda-it ${x.done ? 'done' : ''}" ${x.edit ? `data-edit="${x.edit}" style="cursor:pointer"` : ''}><span class="when">${x.start || '—'}</span><i style="background:${(x.color || OS.srcColor(x.src))}"></i><div><b>${esc(x.title)}${x.imp ? ' ' + UI.badge('importante', 'warn') : ''}</b><small>${esc([Cal.src[x.src][0], x.sub].filter(Boolean).join(' · '))}</small></div></div>`; });
  return h + (items.length > max ? `<a class="btn ghost sm more" href="#calendario.semana">+${items.length - max} na agenda</a>` : '');
};
OS.agendaList = agendaList;

/* ================= HOJE ================= */
V.hoje = () => {
  const t = U.today(), p = OS.one('profile');
  const alerts = I.alerts(), urgent = alerts.filter(a => a.lvl === 'urgent');
  const todayItems = Cal.items(t, t).filter(x => x.src !== 'task');
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const timed = todayItems.filter(x => x.start).sort((a, b) => U.t2m(a.start) - U.t2m(b.start));
  const nextIt = timed.find(x => U.t2m(x.end || x.start) >= nowM);
  const naAll = I.next(), rank = id => { const i = naAll.findIndex(n => n.edit === 'tasks:' + id); return i < 0 ? 999 : i; };
  const tasks = U.sortBy(OS.Tasks.open().filter(x => x.status !== 'Aguardando' && ((x.sched && x.sched <= t) || (x.due && x.due <= U.addDays(t, 1)) || x.status === 'Em curso')), x => rank(x.id));
  const doneToday = OS.all('tasks').filter(x => x.doneAt === t);
  const habits = OS.all('habits').filter(h => h.active && Hab.due(h, t) && h.freq !== 'X por semana');
  const split = OS.one('fit').split[String(new Date().getDay())];
  const wDone = OS.all('workouts').filter(w => w.date === t), rDone = OS.all('runs').filter(r => r.date === t);
  const rPlan = OS.all('runplan').filter(r => r.active && String(r.wday) === String(new Date().getDay()));
  const study = St.today().slice(0, 3), minsToday = U.sum(OS.all('sessions').filter(s => s.date === t), s => s.minutes);
  const shifts = OS.all('shifts').filter(s => s.date === t);
  const tl = timed.map(x => { const s = U.t2m(x.start), e = U.t2m(x.end || x.start) || s + 30; const cls = e < nowM ? 'past' : s <= nowM && nowM <= e ? 'now' : ''; return `<div class="tl-it ${cls}" ${x.edit ? `data-edit="${x.edit}" style="cursor:pointer"` : ''}><span class="h">${x.start}</span><span class="ax"><i style="${cls !== 'now' ? `border-color:${(x.color || OS.srcColor(x.src))}` : ''}"></i></span><div class="c"><b>${esc(x.title)}</b><small>${esc([x.end ? x.start + '–' + x.end : '', Cal.src[x.src][0], x.sub].filter(Boolean).join(' · '))}</small></div></div>`; }).join('');
  const allDay = todayItems.filter(x => !x.start && !x.planned);
  return `<div class="today">
  <div><div class="eyebrow">${U.longDate(t)} · ${esc(p.city || '')}</div>
    <div class="row between gap16" style="align-items:flex-end;margin-top:6px"><div><h1 style="margin:0;font-size:24px;font-weight:600;letter-spacing:-.02em">${greet()}, ${esc(p.short || OS.who())}.</h1>
    <p class="tx2" style="margin:4px 0 0">${nextIt ? `A seguir: <b style="color:var(--tx)">${esc(nextIt.title)}</b> às ${nextIt.start}` : 'Sem mais compromissos com hora hoje.'}</p></div><div class="today-clock" data-clock>${U.hm()}</div></div>
    <p class="today-q" style="margin-top:14px">${esc(dayQuote())}</p></div>
  ${urgent.length ? `<div class="pn" style="border-color:rgba(242,109,109,.3)"><div class="pn-h"><h3>${UI.ic('radar')}Urgente</h3><a class="more" href="#visao">Painel ${UI.ic('right')}</a></div><div class="att">${urgent.slice(0, 4).map(attRow).join('')}</div></div>` : ''}
  <section><div class="sech"><div><h2>Prioridades</h2><p>${doneToday.length} concluída(s) hoje · ordenadas por prazo, importância e impacto</p></div><a class="btn ghost sm" href="#next">${UI.ic('zap')}Next Action</a></div>
    <form class="row gap8" data-form="quickTask" data-today="1" style="margin-bottom:8px"><input class="field grow" name="t" placeholder="Nova tarefa para hoje… (@Casa, !1)" aria-label="Nova tarefa para hoje"><button class="btn">${UI.ic('plus')}</button></form>
    <div class="list">${tasks.slice(0, 7).map(x => taskRow(x)).join('') || UI.empty('Nada planeado para hoje. Puxa algo em Próximos passos.')}${doneToday.slice(0, 3).map(x => taskRow(x, { focus: false })).join('')}</div></section>
  <section><div class="sech"><div><h2>Agenda</h2><p>${timed.length} com hora${allDay.length ? ' · ' + allDay.length + ' sem hora' : ''}</p></div>${UI.addBtn('events', 'Compromisso', { date: t }, 'ghost sm')}</div>
    ${allDay.length ? `<div class="row gap8" style="margin-bottom:10px">${allDay.map(x => `<span class="bdg out" ${x.edit ? `data-edit="${x.edit}" style="cursor:pointer"` : ''}><i class="dot" style="background:${(x.color || OS.srcColor(x.src))}"></i>${esc(x.title)}</span>`).join('')}</div>` : ''}
    ${tl ? `<div class="tl">${tl}</div>` : UI.empty('Sem compromissos com hora. Aulas, turnos e rotina aparecem aqui sozinhos.')}</section>
  <section><div class="sech"><div><h2>Hábitos</h2><p>${habits.filter(h => Hab.done(h, t)).length}/${habits.length} · sequência de dias perfeitos: ${Hab.perfectStreak()}</p></div><a class="btn ghost sm" href="#habitos">Ver tudo</a></div>
    <div class="hab-grid">${habits.map(h => { const d = Hab.done(h, t), auto = h.auto && Hab.autoDone(h, t); return `<div class="hab ${d ? 'on' : ''} ${auto ? 'auto' : ''}" ${auto ? '' : `data-act="habit" data-id="${h.id}" data-d="${t}" role="checkbox" aria-checked="${d}" tabindex="0"`}><input type="checkbox" class="cbx" tabindex="-1" aria-hidden="true"${d ? ' checked' : ''} ${auto ? 'disabled' : ''}><span>${esc(h.name)}</span><span class="streak">${auto ? 'auto' : Hab.streak(h) + 'd'}</span></div>`; }).join('') || UI.empty('Sem hábitos ativos.', UI.addBtn('habits', 'Criar hábito', null, ''))}</div></section>
  <div class="g g2">
    <div class="pn"><div class="pn-h"><h3>${UI.ic('dumbbell')}Corpo</h3><a class="more" href="#treino">Treino ${UI.ic('right')}</a></div>
      <div class="list">
        <div class="li"><div class="li-t"><b>${wDone.length ? esc(wDone[0].title || 'Treino') + ' feito' : split ? 'Treino: ' + esc(split) : 'Sem treino planeado'}</b><small>${wDone.length ? OS.Fit.sets(wDone[0]) + ' séries · ' + U.nf(OS.Fit.volume(wDone[0])) + ' kg de volume' : 'Divisão semanal'}</small></div>${wDone.length ? UI.badge('feito', 'pos') : split && split !== 'Descanso' ? UI.addBtn('workouts', 'Registar', { title: split }, 'sm') : ''}</div>
        ${rPlan.map(r => `<div class="li"><div class="li-t"><b>Corrida: ${esc(r.type)}${U.num(r.km) ? ' ' + r.km + ' km' : U.num(r.mins) ? ' ' + r.mins + ' min' : ''}</b><small>${esc(r.desc || 'Plano de corrida')}</small></div>${rDone.length ? UI.badge('feita', 'pos') : UI.addBtn('runs', 'Registar', { type: r.type, km: r.km || '' }, 'sm')}</div>`).join('')}
        ${!rPlan.length && rDone.length ? `<div class="li"><div class="li-t"><b>Corrida ${U.r1(U.num(rDone[0].km))} km</b><small>${Run.paceStr(Run.pace(rDone[0]))}</small></div>${UI.badge('feita', 'pos')}</div>` : ''}
      </div></div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('school')}Estudar hoje</h3><span class="mono mut" style="font-size:12px">${minsToday} min</span></div>
      <div class="list">${study.map(x => `<div class="li"><div class="li-t"><b>${esc(x.title)}</b><small>${esc(x.why)}</small></div><div class="li-r">${x.act ? `<button class="btn xs" ${x.act}>${x.actL}</button>` : ''}<button class="icon-btn" data-act="focusStart" data-subject="${x.subject || ''}" data-label="${esc(x.title)}" aria-label="Começar foco">${UI.ic('play')}</button></div></div>`).join('') || UI.empty('Nada pendente: sem revisões, provas próximas ou atrasos.')}</div></div>
  </div>
  ${shifts.length || OS.Tasks.open().some(x => (x.ctx || []).includes('@Trabalho')) ? `<div class="pn"><div class="pn-h"><h3>${UI.ic('briefcase')}Trabalho</h3><a class="more" href="#trabalho">Turnos ${UI.ic('right')}</a></div><div class="list">${shifts.map(s => `<div class="li"><div class="li-t"><b>Turno ${s.start}–${s.end}</b><small>${esc(s.place || '')} · ${U.nf(OS.Car.shiftHours(s), 1)} h</small></div></div>`).join('')}${OS.Tasks.open().filter(x => (x.ctx || []).includes('@Trabalho')).slice(0, 3).map(x => taskRow(x)).join('')}</div></div>` : ''}
  ${(() => { const tx = Fin.tx(t, t).filter(x => x.type === 'Despesa' || x.type === 'Receita'); const out = U.sum(tx.filter(x => x.type === 'Despesa'), x => x.amount), inc = U.sum(tx.filter(x => x.type === 'Receita'), x => x.amount);
    // o dinheiro do dia: o que gastaste hoje (de qualquer sítio: gasto rápido, atalho, finanças) e o que entrou
    return `<div class="pn"><div class="pn-h"><h3>${UI.ic('wallet')}Dinheiro hoje</h3><a class="more" href="#financas.transacoes">Finanças ${UI.ic('right')}</a></div>
      <div class="row gap16" style="flex-wrap:wrap;margin-bottom:6px"><span>Gastos <b class="mono ${out ? 'neg' : ''}">${U.eur(out)}</b></span>${inc ? `<span>Entradas <b class="mono pos">${U.eur(inc)}</b></span>` : ''}</div>
      ${tx.length ? `<div class="list">${tx.slice(-5).reverse().map(x => `<div class="li" data-edit="transactions:${x.id}" style="cursor:pointer"><div class="li-t"><b>${esc(x.desc || x.cat || x.type)}</b><small>${esc([x.cat, (OS.get('accounts', x.account) ? OS.L.accLabel(OS.get('accounts', x.account)) : '')].filter(Boolean).join(' · '))}</small></div><span class="mono ${x.type === 'Despesa' ? '' : 'pos'}">${x.type === 'Despesa' ? '−' : '+'}${U.eur(x.amount)}</span></div>`).join('')}</div>` : `<p class="mut" style="margin:0">Ainda não registaste gastos hoje. <a class="acc" href="#gasto">Gasto rápido</a></p>`}</div>`; })()}
  </div>`;
};

/* ================= PAINEL ================= */
/* ================= PAINEL (partes): a Visão Geral e o antigo Painel são agora uma só página, "Painel" ================= */
OS.PainelParts = () => {
  const t = U.today(), ym = U.ym(t), p = OS.one('profile');
  const alerts = I.alerts(), urg = alerts.filter(a => a.lvl === 'urgent'), att = alerts.filter(a => a.lvl === 'attention');
  const areaTone = area => alerts.some(a => a.area === area && a.lvl === 'urgent') ? 'neg' : alerts.some(a => a.area === area) ? 'warn' : 'pos';
  const m = Fin.month(ym), nw = Fin.netWorth(), liq = Fin.liquid(), inv = OS.Inv.value();
  const wk = U.monday(t), studyWk = St.weekMins(wk) / 60, studyTgt = St.targetWeek();
  const wkW = OS.all('workouts').filter(w => w.date >= wk).length, kmW = Run.kmIn(wk, t);
  const cap = OS.Car.capital(), capPrev = OS.Car.capital(U.addDays(t, -30));
  const mv = OS.Mv.month(ym), mvPrev = OS.Mv.month(U.addMonths(ym, -1));
  const goals = OS.all('goals').filter(g => g.status === 'Ativa').map(g => Object.assign({ g }, Goal.info(g)));
  const onPace = goals.filter(x => !x.late && !x.behind).length;
  const na = I.next().slice(0, 3);
  const SH = OS.all('shifts'), wH = U.sum(SH.filter(s => s.date >= wk && s.date <= U.addDays(wk, 6)), s => OS.Car.workedHours(s)), wNext = U.sortBy(SH.filter(s => s.date > t || (s.date === t && (s.end || '99') > U.hm())), s => s.date + s.start)[0];
  const months = Fin.months(6);
  const life = [
    ['financas', 'Dinheiro', 'Finanças', U.eur(liq, { dec: 0 }), `disponível · patrimônio ${U.eurK(nw)}`],
    ['universidade', 'Estudos', 'Universidade', U.nf(studyWk, 1) + (studyTgt ? '/' + studyTgt : '') + ' h', 'esta semana' + (St.gpa() ? ' · média ' + St.gpa() : '')],
    ['treino', 'Corpo', 'Treino', wkW + '/' + (p.trainTarget || 4) + ' treinos', U.nf(kmW, 1) + ' km corridos esta semana'],
    ['capital', 'Carreira', 'Carreira', U.nf(cap.score) + ' pts', 'capital profissional ' + (cap.score >= capPrev.score ? '+' : '') + (cap.score - capPrev.score) + ' em 30d'],
    ['trabalho', 'Trabalho', 'Trabalho', U.nf(wH, 1) + ' h', 'trabalhadas esta semana' + (wNext ? ' · próximo turno ' + (wNext.date === t ? 'hoje' : U.fmtDS(wNext.date)) + ' ' + (wNext.start || '') : '')],
    ['metas', 'Metas', 'Metas', onPace + '/' + goals.length, 'metas no ritmo']
  ];
  const lifeTone = k => k === 'Finanças' ? areaTone('Finanças') : k === 'Universidade' ? areaTone('Universidade') : k === 'Treino' ? (areaTone('Treino') === 'pos' && areaTone('Corrida') === 'pos' ? 'pos' : 'warn') : k === 'Carreira' ? (areaTone('Oportunidades') === 'neg' || areaTone('Carreira') === 'neg' ? 'neg' : areaTone('Oportunidades') === 'warn' ? 'warn' : 'pos') : k === 'Mova' ? areaTone('Mova') : areaTone('Metas');
  const upc = Fin.upcoming(30).filter(x => x.amount < 0).slice(0, 5);
  const fgoals = goals.filter(x => x.g.cat === 'Finanças').slice(0, 3);
  const subs = St.current().map(s => Object.assign({ s }, St.stats(s)));
  const nextExam = U.sortBy(OS.all('assessments').filter(a => a.date >= t && a.prep !== 'Feito'), a => a.date)[0];
  const wdays = U.range(wk, U.addDays(wk, 6));
  const runWeeks = Run.weeks(8);
  const opps = U.sortBy(OS.all('opps').filter(o => o.deadline && o.deadline >= t && !['Aceite', 'Recusada', 'Perdida', 'Descartada'].includes(o.status)), o => o.deadline).slice(0, 3);
  const projs = OS.all('projects').filter(x => x.status === 'Em andamento').map(x => Object.assign({ p: x }, Proj.info(x))).slice(0, 4);
  const ins = I.insights().slice(0, 4);
  return {
    summary: `<p>${urg.length ? `<b class="neg">${urg.length} urgente${urg.length > 1 ? 's' : ''}</b> · ` : ''}${att.length} para atenção${na[0] ? ` · Próxima ação: <b style="color:var(--tx)">${esc(na[0].title)}</b>` : ''}</p>`,
    life: `<div class="life">${life.map(([h, l, k, v, s]) => `<a href="#${h}"><span class="lh">${UI.dot(lifeTone(k))}${l}</span><span class="lv">${v}</span><span class="ls">${esc(s)}</span></a>`).join('')}</div>`,
    control: controlRoom(alerts),
    next: `<div class="g g-main">
    <div class="col gap16">
      <div class="pn"><div class="pn-h"><h3>${UI.ic('zap')}Próxima ação</h3><a class="more" href="#next.agora">Mais ${UI.ic('right')}</a></div>
        ${na.map((n, i) => `<div class="na ${i ? '' : 'top'}"><span class="na-score">${Math.round(n.score)}</span><div><b>${esc(n.title)}</b><div class="na-why">${n.why.slice(0, 3).map(w => UI.badge(w, 'out')).join('')}${UI.badge(U.hours(n.eff), '')}</div></div><div class="row gap4">${n.focus ? `<button class="icon-btn" ${n.focus} aria-label="Modo foco">${UI.ic('focus')}</button>` : ''}${n.act ? `<button class="btn sm" ${n.act}>${n.actL}</button>` : ''}</div></div>`).join('') || UI.empty('Sem ações pendentes. Adiciona tarefas ao Inbox.')}</div>
    </div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('cal')}Próximos 7 dias</h3><a class="more" href="#calendario.semana">Calendário ${UI.ic('right')}</a></div>${agendaList(t, U.addDays(t, 6), 12)}</div>
  </div>`,
    money: `<section><div class="sech"><div><h2>Dinheiro</h2><p>${U.fmtYML(ym)}</p></div><a class="btn ghost sm" href="#financas">Finanças ${UI.ic('right')}</a></div>
    <div class="kpis">${UI.kpi('Taxa de poupança', m.inc ? U.pct(m.rate) : '—', 'este mês · alvo ' + (p.savingsTarget || 20) + '%', { tone: m.inc ? (m.rate * 100 >= (p.savingsTarget || 20) ? 'pos' : m.rate < 0 ? 'neg' : 'warn') : '' })}${UI.kpi('Investido', U.eur(inv, { dec: 0 }), 'carteira de investimentos', { href: 'investimentos' })}</div>
    <div class="g g-main" style="margin-top:16px">
      <div class="pn"><div class="pn-h"><h3>Receitas × despesas</h3><span class="mut" style="font-size:12px">6 meses</span></div>${C.mount({ type: 'bar', labels: months.map(U.fmtYM), series: [{ name: 'Receitas', data: months.map(x => Fin.month(x).inc), color: 'var(--pos)' }, { name: 'Despesas', data: months.map(x => Fin.month(x).exp), color: 'var(--c2)' }], fmt: U.eurK, empty: 'Regista movimentos em Finanças para ver este gráfico.' }, 200)}</div>
      <div class="pn"><div class="pn-h"><h3>Compromissos (30 dias)</h3><a class="more" href="#financas.recorrentes">${UI.ic('right')}</a></div>
        ${upc.length ? `<div class="list">${upc.map(x => `<div class="li"><span class="when">${U.fmtDS(x.date)}</span><div class="li-t"><b>${esc(x.title)}</b><small>${x.kind}</small></div><span class="mono ${x.late ? 'neg' : ''}">${U.eur(x.amount)}</span></div>`).join('')}</div>` : UI.empty('Sem contas previstas. Regista assinaturas e contas fixas em Recorrentes.')}
        ${fgoals.length ? `<div class="divider"></div>${fgoals.map(x => `<div style="margin-bottom:10px"><div class="row between" style="font-size:13px;margin-bottom:5px"><span>${esc(x.g.title)}</span><span class="mono mut">${Goal.fmt(x.g, x.cur)} / ${Goal.fmt(x.g, x.tgt)}</span></div>${UI.bar(x.p, x.p >= 1 ? 'pos' : '', x.exp)}</div>`).join('')}` : ''}</div>
    </div></section>`,
    study: `<div class="g g2">
    <div class="pn"><div class="pn-h"><h3>${UI.ic('school')}Universidade</h3><a class="more" href="#universidade">${UI.ic('right')}</a></div>
      <div class="row gap16" style="margin-bottom:12px"><div><div class="big-num">${U.nf(studyWk, 1)}<span class="mut" style="font-size:16px"> / ${studyTgt || '—'} h</span></div><div class="mut" style="font-size:12px">estudo esta semana</div></div>${nextExam ? `<div class="grow" style="text-align:right"><div style="font-size:13px"><b>${esc(nextExam.title)}</b></div><div class="mut" style="font-size:12px">${esc(subjN(nextExam.subject))} · ${U.rel(nextExam.date)}</div>${UI.badge(nextExam.prep, nextExam.prep === 'Não comecei' ? 'neg' : nextExam.prep === 'Pronto' ? 'pos' : 'warn')}</div>` : ''}</div>
      ${subs.map(x => `<div class="bar-row"><span class="l">${esc(x.s.name)}</span>${UI.bar(x.targetWk ? x.hWk / x.targetWk : 0, x.targetWk && x.hWk >= x.targetWk ? 'pos' : '', ((new Date().getDay() + 6) % 7 + 1) / 7)}<span class="v">${x.hWk}/${x.targetWk || '—'} h${x.avg ? ' · ' + x.avg : ''}</span></div>`).join('') || UI.empty('Sem disciplinas em curso.')}</div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('dumbbell')}Corpo</h3><a class="more" href="#treino">${UI.ic('right')}</a></div>
      <div class="row gap8" style="margin-bottom:14px">${wdays.map(d => { const w = OS.all('workouts').some(x => x.date === d), r = OS.all('runs').some(x => x.date === d); return `<div style="flex:1;text-align:center"><div class="mut" style="font-size:11px">${U.WDS[U.parse(d).getDay()]}</div><div style="height:30px;margin-top:4px;border-radius:7px;background:${w && r ? 'linear-gradient(135deg,var(--c5) 50%,var(--c6) 50%)' : w ? 'var(--c5)' : r ? 'var(--c6)' : d === t ? 'var(--pn3)' : 'rgba(255,255,255,.04)'};${d === t ? 'box-shadow:inset 0 0 0 1px var(--accent)' : ''}"></div></div>`; }).join('')}</div>
      <div class="legend" style="margin:-4px 0 10px"><span><i style="background:var(--c5)"></i>Musculação</span><span><i style="background:var(--c6)"></i>Corrida</span></div>
      ${C.mount({ type: 'bar', labels: runWeeks.map(w => U.fmtDS(w)), series: [{ name: 'km', data: runWeeks.map(w => Run.kmIn(w, U.addDays(w, 6))), color: 'var(--c6)' }], fmt: v => U.nf(v, 0), target: U.num(p.runKmTarget) || null, targetLabel: 'alvo', empty: 'Regista corridas para ver os km semanais.' }, 130)}</div>
  </div>`,
    goals: `<div class="g g2">
    <div class="pn"><div class="pn-h"><h3>${UI.ic('target')}Metas e projetos</h3><a class="more" href="#metas">${UI.ic('right')}</a></div>
      ${goals.slice(0, 5).map(x => `<div style="margin-bottom:12px" data-edit="goals:${x.g.id}" class="click"><div class="row between gap8" style="font-size:13px;margin-bottom:5px"><span>${esc(x.g.title)}</span>${UI.badge(x.st[0], x.st[1])}</div>${UI.bar(x.p, x.p >= 1 ? 'pos' : x.late ? 'neg' : x.behind ? 'warn' : '', x.exp)}</div>`).join('') || UI.empty('Sem metas ativas.', UI.addBtn('goals', 'Nova meta', null, ''))}
      ${projs.length ? `<div class="divider"></div>${projs.map(x => `<div class="li"><div class="li-t click" data-edit="projects:${x.p.id}"><b>${esc(x.p.name)}</b><small>${x.done.length}/${x.tasks.length} tarefas${x.stalled ? ' · <span class="warn">parado há ' + x.idle + ' dias</span>' : ''}</small></div><span class="mono" style="font-size:12px">${Math.round(x.prog * 100)}%</span></div>`).join('')}` : ''}</div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('briefcase')}Carreira e Mova</h3><a class="more" href="#capital">${UI.ic('right')}</a></div>
      <div class="kpis" style="margin-bottom:14px">${UI.kpi('Capital profissional', U.nf(cap.score), UI.trend(cap.score, capPrev.score) + ' em 30 dias', { href: 'capital' })}</div>
      ${opps.length ? opps.map(o => `<div class="li"><span class="when">${U.fmtDS(o.deadline)}</span><div class="li-t click" data-edit="opps:${o.id}"><b>${esc(o.name)}</b><small>${esc([o.kind, o.next].filter(Boolean).join(' · '))}</small></div>${UI.badge(U.rel(o.deadline), U.diff(o.deadline, t) <= 7 ? 'neg' : '')}</div>`).join('') : UI.empty('Sem oportunidades com prazo. Regista-as no Opportunity Center.')}</div>
  </div>`,
    trends: `${ins.length ? `<div class="pn"><div class="pn-h"><h3>${UI.ic('chart')}Tendências</h3><a class="more" href="#evolucao">Minha evolução ${UI.ic('right')}</a></div>${ins.map(x => `<div class="ins">${UI.ic(x.tone === 'pos' ? 'arrowUp' : 'arrowDown', x.tone)}<div><span class="eyebrow">${esc(x.area)}</span><div>${esc(x.text)}</div></div></div>`).join('')}</div>` : ''}` };
};
// os endereços antigos (#painel e #control) abrem a página única
V.painel = sub => { setTimeout(() => { try { history.replaceState(null, '', '#visao'); } catch (e) { } }, 0); return V.visao(sub); };
/* ================= CENTRO DE CONTROLO (era o Control Room; agora vive dentro do Painel) ================= */
const controlRoom = al => { const f = OS.ui.crArea || '', fl = f ? al.filter(a => a.area === f) : al;
  const urg = fl.filter(a => a.lvl === 'urgent'), att = fl.filter(a => a.lvl === 'attention'), ok = I.controlled(al).filter(x => !f || x.area === f);
  const areas = [...new Set(al.map(a => a.area))], more = !!OS.ui.crMore;
  const card = a => `<div class="cr-card ${a.lvl}"><div class="row between gap8"><span class="eyebrow">${esc(a.area)}</span>${a.href ? `<a class="icon-btn" href="${a.href}" aria-label="Abrir">${UI.ic('right')}</a>` : ''}</div><div class="t">${esc(a.title)}</div>${a.detail ? `<small>${esc(a.detail)}</small>` : ''}${a.act ? `<div><button class="btn sm" ${a.act.a}>${a.act.l}</button></div>` : ''}</div>`;
  const cut = (L, n) => more ? L : L.slice(0, n);
  return `<section id="control"><div class="sech"><div><h2>${UI.ic('radar')} Centro de controlo</h2><p>O que precisa da tua atenção agora, calculado a partir de todas as áreas: prazos, orçamentos, metas, projetos parados, provas, oportunidades e hábitos.</p></div></div>
  <div class="kpis">${UI.kpi('Urgente', urg.length, 'resolve hoje', { tone: urg.length ? 'neg' : '' })}${UI.kpi('Atenção', att.length, 'resolve esta semana', { tone: att.length ? 'warn' : '' })}${UI.kpi('Sob controlo', ok.length, 'áreas sem problemas', { tone: 'pos' })}${UI.kpi('Próxima ação', '', (I.next()[0] || {}).title ? esc(I.next()[0].title) : '—', { href: 'next.agora' })}</div>
  ${areas.length > 1 ? `<div class="row gap8" style="flex-wrap:wrap;margin-top:10px">${UI.chip('Todas', 'crArea', !f, 'data-v=""')}${areas.map(a => UI.chip(esc(a) + ' · ' + al.filter(x => x.area === a).length, 'crArea', f === a, `data-v="${esc(a)}"`)).join('')}</div>` : ''}
  <div class="g g3" style="margin-top:12px">
    <div class="cr-col"><h3>${UI.dot('neg')}Urgente</h3>${cut(urg, 6).map(card).join('') || UI.empty('Nada urgente.')}</div>
    <div class="cr-col"><h3>${UI.dot('warn')}Atenção</h3>${cut(att, 6).map(card).join('') || UI.empty('Nada a vigiar.')}</div>
    <div class="cr-col"><h3>${UI.dot('pos')}Sob controlo</h3>${cut(ok, 5).map(o => `<div class="cr-card"><span class="eyebrow">${esc(o.area)}</span><small>${esc(o.text)}</small></div>`).join('') || UI.empty('Regista dados nas áreas para o sistema as poder avaliar.')}</div>
  </div>${urg.length > 6 || att.length > 6 || ok.length > 5 ? `<button class="btn sm ghost" data-act="crMore" style="margin-top:8px">${more ? 'Mostrar menos' : 'Ver tudo'}</button>` : ''}</section>`; };
// o antigo endereço #control abre o Painel, já na secção do centro de controlo
V.control = sub => { setTimeout(() => { try { history.replaceState(null, '', '#visao'); } catch (e) { } const el = document.getElementById('control'); el && el.scrollIntoView({ block: 'start' }); }, 60); return V.visao(sub); };
A.crMore = () => OS.setUI('crMore', !OS.ui.crMore);
A.crArea = b => OS.setUI('crArea', b.dataset.v);

/* ================= NEXT ACTION ================= */
V.next = () => {
  const o = { ctx: OS.ui.naCtx || '', mins: OS.ui.naMins || '', energy: OS.ui.naEnergy || '' };
  const list = I.next(o);
  return UI.head('Próxima ação', 'O que merece ser feito primeiro. Pontuação = urgência do prazo + prioridade + impacto + ligação a metas + vitórias rápidas − esforço acima do tempo disponível. Não é só ordenar por data.', '', 'Visão geral') +
  `<div class="pn"><div class="col gap12">
    <div class="row gap8"><span class="mut" style="font-size:12.5px;width:110px">Onde estou</span>${UI.chip('Qualquer', 'naCtx', !o.ctx, 'data-v=""')}${L.CTX.map(c => UI.chip(c, 'naCtx', o.ctx === c, `data-v="${c}"`)).join('')}</div>
    <div class="row gap8"><span class="mut" style="font-size:12.5px;width:110px">Tempo disponível</span>${UI.seg('naMins', [['', 'Qualquer'], ['15', '15 min'], ['30', '30 min'], ['60', '1 h'], ['120', '2 h']], o.mins)}</div>
    <div class="row gap8"><span class="mut" style="font-size:12.5px;width:110px">Energia</span>${UI.seg('naEnergy', [['', '—'], ['Alta', 'Alta'], ['Baixa', 'Baixa']], o.energy)}</div>
  </div></div>
  <div class="pn">${list.slice(0, 15).map((n, i) => `<div class="na ${i ? '' : 'top'}"><span class="na-score" title="Pontuação">${Math.round(n.score)}</span><div class="${n.edit ? 'click' : ''}" ${n.edit ? `data-edit="${n.edit}"` : n.href ? `data-go="${n.href.slice(1)}"` : ''} style="cursor:${n.edit || n.href ? 'pointer' : 'default'}"><span class="eyebrow">${esc(n.kind)}${n.area ? ' · ' + esc(n.area) : ''}</span><div style="font-weight:540;margin-top:2px">${esc(n.title)}</div><div class="na-why">${n.why.map(w => UI.badge(w, 'out')).join('')}${UI.badge(U.hours(n.eff))}${(n.ctx || []).map(c => UI.badge(c, 'acc')).join('')}</div></div>
    <div class="row gap4">${n.focus ? `<button class="btn sm" ${n.focus}>${UI.ic('play')}Começar</button>` : ''}${n.act ? `<button class="btn sm ${n.focus ? 'ghost' : ''}" ${n.act}>${n.actL}</button>` : ''}</div></div>`).join('') || UI.empty('Nada encaixa nestes filtros. Muda o contexto ou o tempo disponível.')}</div>`;
};
['naCtx'].forEach(k => A[k] = b => OS.setUI(k, b.dataset.v));
A.tgAll = b => OS.setUI('tgAll_' + b.dataset.g, true);

/* ================= CALENDÁRIO ================= */
V.calendario = sub => {
  const view = sub || OS.ui.calView || 'semana', cur = OS.ui.calDate || U.today(), off = OS.ui.calOff || {};
  const vis = x => !off[x.src];
  let body = '', title = '';
  if (view === 'mes') {
    const ym = U.ym(cur), first = ym + '-01', start = U.addDays(first, -((U.parse(first).getDay() + 6) % 7)), end = U.addDays(start, 41);
    const items = Cal.items(start, end).filter(vis); const by = U.groupBy(items, x => x.date);
    title = U.fmtYML(ym);
    body = `<div class="pn flush" style="overflow:hidden"><div class="cal-m">${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => `<div class="wd">${d}</div>`).join('')}${U.range(start, end).map(d => { const it = by[d] || []; return `<div class="cal-d ${U.ym(d) !== ym ? 'out' : ''} ${d === U.today() ? 'today' : ''}" data-act="calDay" data-d="${d}"><span class="n">${+d.slice(8)}</span>${it.slice(0, 4).map(x => `<span class="cev ${x.done ? 'done' : ''} ${x.planned ? 'plan' : ''} ${x.late ? 'late' : ''}" title="${esc(x.title)}"><i style="background:${(x.color || OS.srcColor(x.src))}"></i><span>${x.start ? x.start + ' ' : ''}${esc(x.title)}</span></span>`).join('')}${it.length > 4 ? `<span class="cev"><span class="more">+${it.length - 4}</span></span>` : ''}</div>`; }).join('')}</div></div>`;
  } else if (view === 'semana' || view === 'dia') {
    const from = view === 'dia' ? cur : U.monday(cur), days = view === 'dia' ? [cur] : U.range(from, U.addDays(from, 6));
    const items = Cal.items(days[0], days[days.length - 1]).filter(vis);
    title = view === 'dia' ? U.longDate(cur) : U.fmtDS(days[0]) + ' – ' + U.fmtDS(days[6]);
    const H0 = 6, H1 = 24, HH = 44;
    const cols = days.map(d => { const it = items.filter(x => x.date === d); const timed = it.filter(x => x.start); const all = it.filter(x => !x.start);
      const blocks = timed.map(x => { const s = Math.max(H0 * 60, U.t2m(x.start)), e = Math.min(H1 * 60, U.t2m(x.end) || s + 45); return `<div class="cal-blk" ${x.edit ? `data-edit="${x.edit}"` : ''} style="top:${(s - H0 * 60) / 60 * HH}px;height:${Math.max(22, (e - s) / 60 * HH - 2)}px;border-left-color:${(x.color || OS.srcColor(x.src))};${x.planned ? 'opacity:.6' : ''}" title="${esc(x.title)}">${esc(x.title)}<small>${x.start}${x.end ? '–' + x.end : ''}${x.sub ? ' · ' + esc(x.sub) : ''}</small></div>`; }).join('');
      const nowL = d === U.today() ? (() => { const n = new Date(); const m = n.getHours() * 60 + n.getMinutes(); return m >= H0 * 60 ? `<div class="cal-now" style="top:${(m - H0 * 60) / 60 * HH}px"></div>` : ''; })() : '';
      return { d, all, html: `<div class="cal-grid" data-act="calSlot" data-d="${d}">${Array.from({ length: H1 - H0 }, () => '<div class="cal-hr"></div>').join('')}${blocks}${nowL}</div>` }; });
    body = `<div class="pn flush" style="overflow:auto;max-height:72vh"><div class="cal-w" style="${view === 'dia' ? 'grid-template-columns:48px 1fr;min-width:0' : ''}"><div class="hd"></div>${cols.map(c => `<div class="hd ${c.d === U.today() ? 'today' : ''}">${U.WDS[U.parse(c.d).getDay()]} <b class="mono">${+c.d.slice(8)}</b></div>`).join('')}
      <div class="allday" style="border-left:0;font:10.5px var(--mono);color:var(--mut)">dia</div>${cols.map(c => `<div class="allday">${c.all.map(x => `<span class="cev ${x.done ? 'done' : ''} ${x.planned ? 'plan' : ''} ${x.late ? 'late' : ''}" ${x.edit ? `data-edit="${x.edit}" style="cursor:pointer"` : ''}><i style="background:${(x.color || OS.srcColor(x.src))}"></i><span>${esc(x.title)}</span></span>`).join('')}</div>`).join('')}
      <div>${Array.from({ length: H1 - H0 }, (_, i) => `<div class="cal-hr">${U.pad(H0 + i)}:00</div>`).join('')}</div>${cols.map(c => c.html).join('')}</div></div>`;
  }
  const integ = OS.one('integ');
  return UI.head('Calendário', 'Universidade, estudos, treinos, corridas, trabalho, Mova, tarefas, metas, contas e compromissos numa só agenda.', `${UI.addBtn('events', 'Compromisso', { date: cur })}${UI.addBtn('tasks', 'Tarefa', { sched: cur, status: 'Próxima' }, '')}`, 'Visão geral') +
  `<div class="row between gap12"><div class="row gap8"><button class="icon-btn" data-act="calMove" data-v="-1" aria-label="Anterior">${UI.ic('left')}</button><button class="btn sm" data-act="calToday">Hoje</button><button class="icon-btn" data-act="calMove" data-v="1" aria-label="Seguinte">${UI.ic('right')}</button><b style="font-size:15px;margin-left:6px">${title}</b></div>
   <div class="seg">${[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([k, l]) => `<button class="${view === k ? 'on' : ''}" data-act="calView" data-v="${k}">${l}</button>`).join('')}</div></div>
  <div class="src-chips">${Object.entries(Cal.src).filter(([k]) => k !== 'gcal' || integ.gcal).map(([k, [l, c]]) => `<button class="chip ${off[k] ? '' : 'on'}" data-act="calSrc" data-v="${k}"><i style="background:${c}"></i>${l}</button>`).join('')}</div>
  ${body}`;
};
A.calView = b => { OS.setUI('calView', b.dataset.v); OS.go('calendario.' + b.dataset.v); };
A.calToday = () => OS.setUI('calDate', U.today());
A.calMove = b => { const v = OS.ui.calView || OS.route().sub || 'semana', cur = OS.ui.calDate || U.today(), n = +b.dataset.v; OS.setUI('calDate', v === 'mes' ? U.addMonths(U.ym(cur), n) + '-01' : U.addDays(cur, n * (v === 'dia' ? 1 : 7))); };
A.calSrc = b => { const o = Object.assign({}, OS.ui.calOff || {}); o[b.dataset.v] = !o[b.dataset.v]; OS.setUI('calOff', o); };
A.calDay = (b, e) => { if (e.target.closest('[data-edit]')) return; OS.ui.calDate = b.dataset.d; OS.ui.calView = 'dia'; OS.go('calendario.dia'); };
A.calSlot = (b, e) => { if (e.target.closest('[data-edit]')) return; const r = b.getBoundingClientRect(); const h = Math.floor((e.clientY - r.top) / 44) + 6; UI.openForm('events', null, { date: b.dataset.d, start: U.pad(h) + ':00', end: U.pad(h + 1) + ':00' }); };

/* Integração Google Calendar: pelo teu script Google (Parte 3, versão 11), de qualquer aparelho; nas contas sem script pela conta Google ligada (google.js, só leitura); dentro do claude.ai também pelo conector */
let gcalUnsub = null, gcalTimer = 0, gcalBusy = false;
const gscr = () => { const c = OS.one('inbox'); return c && c.url && c.key && +(c.ver || 0) >= 11 ? c : null; };
// os calendários "Náutilo" e "Náutilo · …" (o nome que o script lhes deu) são a cópia que a app põe no Google: não se leem de volta (senão aparecia tudo duas vezes)
const gmap = L => L.filter(x => !/^(Oceanum|Náutilo)( · .+)?$/.test(String(x.cal || ''))).map(x => { const sd = new Date(x.s), ed = new Date(x.e); return { date: U.iso(sd), start: x.all ? '' : U.hm(sd), end: x.all ? '' : U.hm(ed), title: x.t || '(sem título)', sub: [x.loc, x.cal].filter(Boolean).join(' · ').slice(0, 120), gid: x.id }; }).filter(x => x.date);
try { const sv = U.ls.get('os2gcal', null); if (sv && OS.one('integ').gcal) Cal.gcal = sv.ev || []; } catch (e) { }
const gapi = () => !gscr() && !!(OS.Goog && OS.Goog.cal());
const gcalScript = async quiet => { const c = gscr(), viaG = !c && gapi(); if ((!c && !viaG) || gcalBusy) return; gcalBusy = true;
  const from = U.addDays(U.today(), -14), to = U.addDays(U.today(), 90);
  try { const j = viaG ? await OS.Goog.call('cl', { a: from, b: to }) : await OS.Inbox.getJSON(c.url.trim() + (c.url.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(c.key) + '&op=cl&a=' + from + '&b=' + to + '&_=' + Date.now(), 2);
    if (!j || !j.ok) throw new Error((j && j.msg) || 'o script não respondeu');
    Cal.gcal = gmap(j.ev || []); U.ls.set('os2gcal', { at: Date.now(), ev: Cal.gcal });
    OS.gcalState = `${Cal.gcal.length} eventos entre ${U.fmtDS(from)} e ${U.fmtDS(to)} · atualizado às ${U.hm(new Date())}`; }
  catch (e) { OS.gcalState = viaG ? 'Não consegui ler a agenda Google agora (' + (e.message || 'erro') + '). Os dados anteriores mantêm-se.' : /Calendar|autoriz|permiss/i.test(e.message || '') ? 'Falta autorizar a Agenda no script: no Apps Script escolhe a função "autorizar" → ▶ Executar → Permitir, e faz Nova versão na implementação.' : 'Não consegui ler a agenda agora (' + (e.message || 'erro') + '). Os dados anteriores mantêm-se.'; if (!quiet) UI.toast(OS.gcalState, 'warn'); }
  gcalBusy = false; OS.request(); };
OS.gcalStart = async () => {
  if (gscr() || gapi()) { gcalScript(true); if (!gcalTimer) gcalTimer = setInterval(() => { if (!document.hidden && OS.one('integ').gcal) gcalScript(true); }, 15 * 60 * 1000); return; }
  if (gcalUnsub) return; let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use('mcp') : null; } catch (e) { }
  if (!mcp) { OS.gcalState = OS.one('inbox').url ? 'Para ver a tua agenda Google aqui, atualiza o script Google (Definições → Script Google → Parte 3).' : 'Para ver a tua agenda Google aqui, liga o script Google (Definições → Sincronizar aparelhos).'; OS.request(); return; }
  const from = new Date(); from.setDate(from.getDate() - 14); const to = new Date(); to.setDate(to.getDate() + 60);
  gcalUnsub = mcp.watchTool('Google Calendar', 'list_events', { startTime: from.toISOString(), endTime: to.toISOString(), pageSize: 250, orderBy: 'startTime', timeZone: 'Europe/Lisbon' }, ev => {
    if (ev.type === 'error') { const c = ev.error && ev.error.code;
      OS.gcalState = c === 'server_not_connected' ? 'O Google Calendar não está ligado. Adiciona-o em claude.ai → Settings → Connectors.' : c === 'needs_reauth' ? 'Autorização expirada. Religa o Google Calendar em claude.ai → Settings → Connectors.' : c === 'not_in_manifest' ? 'Não autorizaste o Google Calendar para esta página.' : c === 'not_granted' || c === 'capability_disabled' ? 'Integração indisponível nesta vista.' : 'Não foi possível ler a agenda agora (' + (c || 'erro') + '). Os dados anteriores mantêm-se.';
      if (['server_not_connected', 'needs_reauth', 'not_in_manifest', 'blocked_by_policy'].includes(c)) Cal.gcal = [];
      OS.request(); return; }
    const evs = (ev.result && ev.result.payload && ev.result.payload.events) || [];
    Cal.gcal = evs.filter(x => x.status !== 'cancelled').map(x => { const s = x.start || {}, e = x.end || {}; const sd = s.dateTime ? new Date(s.dateTime) : null, ed = e.dateTime ? new Date(e.dateTime) : null;
      return { date: sd ? U.iso(sd) : String(s.date || '').slice(0, 10), start: sd ? U.hm(sd) : '', end: ed ? U.hm(ed) : '', title: x.summary || '(sem título)', sub: x.location || '', link: x.htmlLink }; }).filter(x => x.date);
    const st = ev.result && ev.result.cache && ev.result.cache.storedAt;
    OS.gcalState = `${Cal.gcal.length} eventos entre ${U.fmtDS(U.iso(from))} e ${U.fmtDS(U.iso(to))}` + (st ? ' · atualizado às ' + U.hm(new Date(st)) : '');
    OS.request();
  }, { refetchInterval: 15 * 60 * 1000 });
};
// criar um evento na agenda Google (o Spyke usa isto quando pedes "põe na minha agenda Google")
OS.gcalAdd = async ev => { const c = gscr(); if (!c) return { ok: false, msg: gapi() ? 'a ligação à agenda Google é só de leitura' : 'o script Google ainda não tem a Parte 3' };
  const u = c.url.trim() + (c.url.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(c.key) + '&op=ce&t=' + encodeURIComponent(ev.title || '') + '&d=' + encodeURIComponent(ev.date || '') + (ev.start ? '&h=' + ev.start : '') + (ev.end ? '&f=' + ev.end : '') + (ev.loc ? '&l=' + encodeURIComponent(ev.loc) : '');
  try { const j = await OS.Inbox.getJSON(u, 2); if (j && j.ok) setTimeout(() => gcalScript(true), 1500); return j || { ok: false }; } catch (e) { return { ok: false, msg: e.message }; } };
// Definições → Ligações: a agenda Google (pelo script) liga-se e desliga-se aqui; o Calendário só mostra os eventos
OS.gcalPanel = () => { const integ = OS.one('integ');
  // conta sem script e sem a agenda Google autorizada: o cartão de ligar a conta Google (o mesmo do E-mail)
  if (!gscr() && OS.Goog && OS.Goog.on() && !OS.Goog.cal()) return OS.Goog.card();
  return `<div class="pn" id="gcalSet"><div class="pn-h"><h3>${UI.ic('link')}Agenda Google (Calendário)</h3><span class="mut" style="font-size:12px">${integ.gcal ? 'ligada' : 'desligada'}</span></div><p class="mut" style="margin:0 0 10px;font-size:13px">${integ.gcal ? esc(OS.gcalState || 'A carregar os teus eventos…') : 'Mostra no Calendário, em Hoje e no Painel os eventos da tua agenda Google (todas as agendas), ' + (gapi() ? 'pela tua conta Google ligada.' : 'pelo teu script Google.')}</p>${integ.gcal ? `<div class="row gap8"><button class="btn sm" data-act="gcalRefresh">${UI.ic('sync')}Atualizar</button><button class="btn ghost sm" data-act="gcalOff">Desligar</button></div>` : `<button class="btn sm pri" data-act="gcalOn">Ligar</button>`}</div>`; };
A.gcalOn = () => { OS.setOne('integ', { gcal: true }); OS.gcalStart(); };
A.gcalOff = () => { OS.setOne('integ', { gcal: false }); if (gcalUnsub) { gcalUnsub(); gcalUnsub = null; } clearInterval(gcalTimer); gcalTimer = 0; Cal.gcal = []; OS.gcalState = ''; U.ls.del ? U.ls.del('os2gcal') : U.ls.set('os2gcal', null); };
A.gcalRefresh = async () => { if (gscr() || gapi()) return gcalScript(false); try { const mcp = await window.claude.use('mcp'); await mcp.invalidate('Google Calendar', 'list_events'); } catch (e) { } UI.toast('A atualizar a agenda…'); };
OS.on('ready', () => { if (OS.one('integ').gcal) OS.gcalStart(); });

/* ================= TAREFAS ================= */
V.tarefas = sub => {
  const view = sub || 'lista', f = OS.ui.tf || {}, t = U.today();
  const PJ = tpActive(), sp = f.project && f.project !== '_none' ? OS.get('projects', f.project) : null;
  if (f.project && f.project !== '_none' && !sp) f.project = '';
  let all = OS.all('tasks').filter(x => (!f.ctx || (x.ctx || []).includes(f.ctx)) && (!f.area || x.area === f.area) && (!f.project || (f.project === '_none' ? !OS.get('projects', x.project) : x.project === f.project)) && (!f.q || x.title.toLowerCase().includes(f.q.toLowerCase())));
  const open = all.filter(x => x.status !== 'Feita'), late = open.filter(OS.Tasks.late);
  const weeks = Array.from({ length: 8 }, (_, i) => U.addDays(U.monday(t), -7 * (7 - i)));
  const doneW = weeks.map(w => OS.all('tasks').filter(x => x.doneAt && x.doneAt >= w && x.doneAt <= U.addDays(w, 6)).length);
  const groups = [['Em curso', open.filter(x => x.status === 'Em curso')], ['Atrasadas', late.filter(x => x.status !== 'Em curso')], ['Hoje', open.filter(x => !OS.Tasks.late(x) && x.status !== 'Em curso' && (x.sched === t || x.due === t))], ['Próximas', open.filter(x => !OS.Tasks.late(x) && !['Em curso', 'Inbox', 'Aguardando'].includes(x.status) && x.sched !== t && x.due !== t)], ['Inbox', open.filter(x => x.status === 'Inbox' && !OS.Tasks.late(x) && x.sched !== t && x.due !== t)], ['Aguardando', open.filter(x => x.status === 'Aguardando' && !OS.Tasks.late(x))], ['Concluídas recentemente', U.sortBy(all.filter(x => x.status === 'Feita'), x => x.doneAt || '', -1).slice(0, 8)]];
  const body = view === 'projetos' ? tpGroups(all) : view === 'quadro' ? `<div class="kan">${L.TSTAT.map(s => { const it = s === 'Feita' ? U.sortBy(all.filter(x => x.status === s), x => x.doneAt || '', -1).slice(0, 12) : all.filter(x => x.status === s); return `<div class="kcol"><h4>${s}<span class="mono">${it.length}</span></h4>${it.map(x => `<div class="kcard" data-edit="tasks:${x.id}"><b>${esc(x.title)}</b><div class="meta">${+x.prio <= 2 ? UI.badge(prioL(x.prio), prioT(x.prio)) : ''}${x.due ? UI.badge(U.fmtDS(x.due), OS.Tasks.late(x) ? 'neg' : '') : ''}${(x.ctx || []).map(c => `<span>${c}</span>`).join('')}</div><div class="row gap4">${L.TSTAT.filter(z => z !== s).slice(0, 3).map(z => `<button class="btn xs ghost" data-act="taskStatus" data-id="${x.id}" data-v="${z}">→ ${z}</button>`).join('')}</div></div>`).join('')}</div>`; }).join('')}</div>`
    : groups.filter(g => g[1].length).map(([n, arr]) => { const lim = OS.ui['tgAll_' + n] ? arr.length : 25; return `<section><div class="sech"><h2>${n} <span class="mut mono" style="font-weight:400">${arr.length}</span></h2></div><div class="pn" style="padding:4px 16px">${arr.slice(0, lim).map(x => taskRow(x)).join('')}${arr.length > lim ? `<button class="pg-more sm" data-act="tgAll" data-g="${esc(n)}">Ver mais ${arr.length - lim}</button>` : ''}</div></section>`; }).join('') || UI.empty('Sem tarefas com estes filtros.');
  return UI.head('Tarefas', 'Tudo entra no Inbox. Escreve @contexto, !prioridade (1–4) e #projeto na criação rápida; "hoje" ou "amanhã" agenda. Separa as tarefas por projeto na barra abaixo.', UI.addBtn('tasks', 'Nova tarefa'), 'Execução') +
  UI.tabs('tarefas', [['', 'Lista'], ['projetos', 'Por projeto'], ['quadro', 'Quadro']], sub) +
  tpStrip(PJ, f) + (sp ? tpHead(sp) : '') +
  `<form class="row gap8" data-form="quickTask"${sp ? ` data-project="${sp.id}"` : ''}><input class="field grow" name="t" placeholder="${sp ? 'Nova tarefa em ' + esc(sp.name) + '… (@contexto !1 amanhã)' : 'Captura rápida: Rever capítulo 3 @Estudos !2 amanhã #projeto'}" aria-label="Captura rápida de tarefa"><button class="btn pri">${UI.ic('plus')}${sp ? 'Adicionar' : 'Inbox'}</button></form>
  <div class="kpis">${UI.kpi('Abertas', open.length)}${UI.kpi('Atrasadas', late.length, '', { tone: late.length ? 'neg' : '' })}${UI.kpi('Concluídas esta semana', doneW[7], UI.trend(doneW[7], doneW[6]) + ' vs semana anterior')}${UI.kpi('Taxa de conclusão (30 dias)', (() => { const c = OS.all('tasks').filter(x => x._c && U.iso(new Date(x._c)) >= U.addDays(t, -30)); return c.length ? U.pct(c.filter(x => x.status === 'Feita').length / c.length) : '—'; })(), 'das criadas nos últimos 30 dias')}</div>
  <div class="filters"><input type="search" placeholder="Procurar…" value="${esc(f.q || '')}" data-uif="tf.q" aria-label="Procurar tarefas">
    <select data-uif="tf.ctx" aria-label="Contexto"><option value="">Todos os contextos</option>${L.CTX.map(c => `<option${f.ctx === c ? ' selected' : ''}>${c}</option>`).join('')}</select>
    <select data-uif="tf.area" aria-label="Área"><option value="">Todas as áreas</option>${L.AREAS.map(c => `<option${f.area === c ? ' selected' : ''}>${c}</option>`).join('')}</select>
    <select data-uif="tf.project" aria-label="Projeto"><option value="">Todos os projetos</option><option value="_none"${f.project === '_none' ? ' selected' : ''}>Sem projeto</option>${OS.all('projects').map(p => `<option value="${p.id}"${f.project === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
  ${body}
  <div class="pn"><div class="pn-h"><h3>Tarefas concluídas por semana</h3></div>${C.mount({ type: 'bar', labels: weeks.map(w => U.fmtDS(w)), series: [{ name: 'Concluídas', data: doneW, color: 'var(--accent)' }], empty: 'Conclui tarefas para ver a produtividade.' }, 150)}</div>`;
};
const PCOL = ['#38BDF8', '#A78BFA', '#34D399', '#F59E0B', '#F472B6', '#FB7185', '#2DD4BF', '#FACC15', '#818CF8', '#F97316'];
const pcol = p => p.color || PCOL[U.hash(p.id || p.name || '') % PCOL.length];
const tpActive = () => U.sortBy(OS.all('projects').filter(p => !['Concluído', 'Cancelado'].includes(p.status)), p => (p.status === 'Em andamento' ? '0' : '1') + (p.prio || '3') + (p.name || ''));
const tpStrip = (PJ, f) => { const T = OS.all('tasks'), op = T.filter(x => x.status !== 'Feita'), none = op.filter(x => !OS.get('projects', x.project)).length;
  return `<div class="tp-strip" role="tablist" aria-label="Projetos"><button class="tp-c ${!f.project ? 'on' : ''}" data-act="tpPick" data-p=""><b>Todas</b><small>${op.length} abertas</small></button>${PJ.map(p => { const i = Proj.info(p); return `<button class="tp-c ${f.project === p.id ? 'on' : ''}" data-act="tpPick" data-p="${p.id}" style="--pc:${pcol(p)}" title="${esc(p.name)}"><b><i></i>${esc(p.name)}</b><small>${i.open.length} abertas${i.tasks.length ? ' · ' + U.pct(i.prog) : ''}</small><span class="tp-bar"><span style="width:${Math.round(i.prog * 100)}%"></span></span></button>`; }).join('')}<button class="tp-c ${f.project === '_none' ? 'on' : ''}" data-act="tpPick" data-p="_none"><b>Sem projeto</b><small>${none} abertas</small></button><button class="tp-c tp-add" data-new="projects" data-defs='${esc(JSON.stringify({ status: 'Em andamento' }))}'>${UI.ic('plus')}<b>Projeto</b></button></div>`; };
const tpHead = p => { const i = Proj.info(p);
  return `<div class="pn tp-head" style="--pc:${pcol(p)}"><div class="row between gap8" style="flex-wrap:wrap"><div><div class="eyebrow">${esc(p.type || 'Projeto')} · ${esc(p.status || '')}${p.due ? ` · prazo ${U.fmtDS(p.due)}` : ''}</div><h3 style="margin:2px 0 0">${esc(p.name)}</h3>${p.objective ? `<small class="mut">${esc(p.objective)}</small>` : ''}</div>
    <div class="row gap6">${UI.addBtn('tasks', 'Tarefa neste projeto', { project: p.id, status: 'Próxima' }, 'sm pri')}<button class="btn sm ghost" data-edit="projects:${p.id}">Editar projeto</button>${p.status !== 'Concluído' && i.tasks.length && !i.open.length ? `<button class="btn sm" data-act="tpDone" data-p="${p.id}">Concluir projeto</button>` : ''}</div></div>
    ${UI.bar(i.prog, 'pos')}<small class="mut">${i.done.length} de ${i.tasks.length} tarefas feitas${i.late ? ' · <span class="neg">projeto atrasado</span>' : ''}${i.stalled ? ` · <span class="warn">parado há ${i.idle} dias</span>` : ''}</small></div>`; };
const tpGroups = all => { const sec = (p, arr) => { const op = arr.filter(x => x.status !== 'Feita'), dn = arr.filter(x => x.status === 'Feita'), i = p ? Proj.info(p) : null;
    return `<section class="tp-sec" style="--pc:${p ? pcol(p) : 'var(--line3)'}"><div class="sech"><h2 class="click" ${p ? `data-act="tpPick" data-p="${p.id}"` : 'data-act="tpPick" data-p="_none"'} style="cursor:pointer"><i class="tp-dot"></i>${p ? esc(p.name) : 'Sem projeto'} <span class="mut mono" style="font-weight:400">${op.length}</span></h2>${i ? `<span class="mut" style="font-size:12.5px">${U.pct(i.prog)} feito</span>` : ''}</div>
      <div class="pn" style="padding:4px 16px">${op.map(x => taskRow(x)).join('') || '<p class="mut" style="margin:10px 0">Sem tarefas abertas.</p>'}${dn.length ? `<small class="mut" style="display:block;margin:6px 0 8px">✓ ${dn.length} concluída(s)</small>` : ''}
      <form class="row gap8 tp-q" data-form="quickTask"${p ? ` data-project="${p.id}"` : ''}><input class="field grow" name="t" placeholder="+ Tarefa${p ? ' em ' + esc(p.name) : ''}" aria-label="Nova tarefa${p ? ' em ' + esc(p.name) : ''}"><button class="btn sm">${UI.ic('plus')}</button></form></div></section>`; };
  const PJ = tpActive(), f = OS.ui.tf || {}, out = [];
  PJ.filter(p => !f.project || f.project === p.id).forEach(p => out.push(sec(p, all.filter(x => x.project === p.id))));
  if (!f.project || f.project === '_none') { const nn = all.filter(x => !OS.get('projects', x.project) || ['Concluído', 'Cancelado'].includes((OS.get('projects', x.project) || {}).status)); if (nn.length) out.push(sec(null, nn)); }
  return out.join('') || UI.empty('Ainda não tens projetos. Cria um para separar as tarefas.', UI.addBtn('projects', 'Criar projeto', { status: 'Em andamento' }, '')); };
A.tpPick = b => { const f = Object.assign({}, OS.ui.tf || {}); f.project = b.dataset.p || ''; OS.setUI('tf', f); setTimeout(() => { const c = document.querySelector('#view .tp-c.on'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }, 80); };
A.tpOpen = b => { OS.ui.tf = Object.assign({}, OS.ui.tf || {}, { project: b.dataset.p }); OS.setUI('tf', OS.ui.tf); location.hash = 'tarefas'; };
A.tpDone = b => { OS.upd('projects', b.dataset.p, { status: 'Concluído' }); UI.toast('Projeto concluído', 'pos'); };
A.taskStatus = b => { OS.upd('tasks', b.dataset.id, { status: b.dataset.v }); OS.Tasks.afterSave(OS.get('tasks', b.dataset.id)); };

/* ================= HÁBITOS & ROTINA ================= */
V.habitos = sub => {
  const t = U.today();
  if (sub === 'rotina') {
    const R = OS.all('routine'), days = L.WEEK;
    return UI.head('Hábitos e rotina', 'Blocos recorrentes da tua semana. Aparecem em Hoje e no Calendário.', UI.addBtn('routine', 'Novo bloco'), 'Execução') + UI.tabs('habitos', [['', 'Hábitos'], ['rotina', 'Rotina'], ['plano', 'Planeamento']], sub) +
    (R.length ? `<div class="pn flush" style="overflow-x:auto"><div style="display:grid;grid-template-columns:repeat(7,minmax(120px,1fr));min-width:840px">${days.map(([d, l]) => `<div style="border-right:1px solid var(--line);padding:10px"><div class="eyebrow" style="margin-bottom:8px">${l}</div>${U.sortBy(R.filter(r => (r.days || []).includes(d)), r => r.start).map(r => `<div class="kcard" data-edit="routine:${r.id}" style="margin-bottom:6px"><span class="mono mut" style="font-size:11.5px">${r.start}–${r.end}</span><b>${esc(r.title)}</b></div>`).join('')}</div>`).join('')}</div></div>` : UI.empty('Define os blocos fixos da semana: aulas de estudo, ginásio, igreja, trabalho, revisão de domingo.', UI.addBtn('routine', 'Criar primeiro bloco', null, '')));
  }
  if (sub === 'plano') {
    const pl = OS.one('plan'), wk = U.monday(t), ym = U.ym(t), wp = (pl.week || {})[wk] || {}, mp = (pl.month || {})[ym] || '';
    const days = U.range(wk, U.addDays(wk, 6));
    const goalsM = OS.all('goals').filter(g => g.status === 'Ativa' && g.due && U.ym(g.due) === ym);
    return UI.head('Hábitos e rotina', 'Planeamento diário, semanal e mensal.', '', 'Execução') + UI.tabs('habitos', [['', 'Hábitos'], ['rotina', 'Rotina'], ['plano', 'Planeamento']], sub) +
    `<div class="g g2"><div class="pn"><div class="pn-h"><h3>Mês · ${U.fmtYML(ym)}</h3></div><div class="qa"><label for="pm">Foco do mês</label><textarea id="pm" data-bind="plan.month.${ym}" data-fk="pm" placeholder="O que tem de acontecer este mês?">${esc(mp)}</textarea></div>
      <div class="divider"></div><div class="eyebrow" style="margin-bottom:6px">Metas com prazo este mês</div>${goalsM.map(g => { const i = Goal.info(g); return `<div class="bar-row"><span class="l">${esc(g.title)}</span>${UI.bar(i.p, '', i.exp)}<span class="v">${U.fmtDS(g.due)}</span></div>`; }).join('') || '<div class="mut" style="font-size:13px">Nenhuma.</div>'}</div>
     <div class="pn"><div class="pn-h"><h3>Semana de ${U.fmtDS(wk)}</h3></div>${[1, 2, 3].map(i => `<div class="row gap8" style="margin-bottom:8px"><span class="mono mut">${i}</span><input class="field grow" data-bind="plan.week.${wk}.p${i}" data-fk="pw${i}" value="${esc(wp['p' + i] || '')}" placeholder="Prioridade ${i} da semana" aria-label="Prioridade ${i}"></div>`).join('')}<div class="mut" style="font-size:12px">A revisão semanal pode preencher estas prioridades.</div></div></div>
    <section><div class="sech"><h2>Semana dia a dia</h2><span class="mut" style="font-size:12.5px">Arrasta mentalmente; muda o "Fazer em" na tarefa</span></div><div class="kan" style="grid-auto-columns:minmax(170px,1fr)">${days.map(d => { const it = OS.all('tasks').filter(x => x.sched === d || (!x.sched && x.due === d)); return `<div class="kcol"><h4>${U.WDS[U.parse(d).getDay()]} ${+d.slice(8)}<span>${it.filter(x => x.status === 'Feita').length}/${it.length}</span></h4>${it.map(x => `<div class="kcard" data-edit="tasks:${x.id}" style="${x.status === 'Feita' ? 'opacity:.5' : ''}"><b>${esc(x.title)}</b></div>`).join('')}<button class="btn xs ghost" data-new="tasks" data-defs='${JSON.stringify({ sched: d, status: 'Próxima' })}'>${UI.ic('plus')}</button></div>`; }).join('')}</div></section>`;
  }
  const H = OS.all('habits'), days = U.lastN(14), score90 = U.lastN(91);
  return UI.head('Hábitos e rotina', 'Hábitos marcados como inegociáveis formam a sequência de dias perfeitos. Alguns marcam-se sozinhos a partir dos teus registos reais.', UI.addBtn('habits', 'Novo hábito'), 'Execução') + UI.tabs('habitos', [['', 'Hábitos'], ['rotina', 'Rotina'], ['plano', 'Planeamento']], sub) +
  `<div class="kpis">${UI.kpi('Dias perfeitos seguidos', Hab.perfectStreak(), 'todos os inegociáveis cumpridos')}${UI.kpi('Consistência (30 dias)', (() => { const v = U.lastN(30).map(Hab.dayScore).filter(x => x != null); return v.length ? U.pct(U.avg(v)) : '—'; })())}${UI.kpi('Consistência (7 dias)', (() => { const v = U.lastN(7).map(Hab.dayScore).filter(x => x != null); return v.length ? U.pct(U.avg(v)) : '—'; })())}${UI.kpi('Hoje', (() => { const v = Hab.dayScore(t); return v == null ? '—' : U.pct(v); })())}</div>
  <div class="tblw hab-wrap"><table class="tbl hab-tbl"><colgroup><col class="n">${days.map(() => '<col class="c">').join('')}<col class="s"><col class="s"></colgroup><thead><tr><th class="hab-n">Hábito</th>${days.map(d => `<th class="hab-c ${d === t ? 'is-today' : ''}">${U.WDS[U.parse(d).getDay()].slice(0, 1)}<span class="mono">${+d.slice(8)}</span></th>`).join('')}<th class="hab-s">Seq.</th><th class="hab-s">30 d</th></tr></thead><tbody>
  ${H.map(h => `<tr class="${h.active ? '' : 'muted'}"><td class="hab-n"><a href="javascript:void 0" data-edit="habits:${h.id}"><b>${esc(h.name)}</b></a><div class="hab-tags">${h.core ? UI.badge('inegociável', 'acc') : ''}${h.auto ? UI.badge('auto', 'out') : ''}<small class="hab-mst" title="Sequência atual · cumprimento nos últimos 30 dias">seq. ${Hab.streak(h)}d · ${U.pct(Hab.rate(h, 30))} (30 d)</small></div></td>${days.map(d => { const due = Hab.due(h, d), dn = Hab.done(h, d), au = h.auto && Hab.autoDone(h, d), isT = d === t;
    const born = h._c ? U.iso(new Date(h._c)) : '', st = dn ? 'done' : !due || (born && d < born) ? 'off' : d < t ? 'miss' : 'todo'; return `<td class="hab-c ${isT ? 'is-today' : ''}">${isT && due && !au ? `<button type="button" class="hab-b ${st}" data-act="habit" data-id="${h.id}" data-d="${d}" aria-pressed="${dn}" aria-label="${esc(h.name)} hoje">${dn ? UI.ic('check') : ''}</button>` : `<span class="hab-b ${st} ro" title="${U.fmtD(d)}${st === 'miss' ? ' · falhou' : st === 'off' ? ' · não era dia' : ''}" aria-label="${esc(h.name)} ${U.fmtD(d)} ${st === 'done' ? 'feito' : st === 'miss' ? 'falhou' : ''}">${dn ? UI.ic('check') : ''}</span>`}</td>`; }).join('')}<td class="hab-s mono">${Hab.streak(h)}d</td><td class="hab-s mono">${U.pct(Hab.rate(h, 30))}</td></tr>`).join('')}</tbody></table></div>
  <p class="mut" style="font-size:12px;margin:6px 2px 14px">Só podes marcar o dia de hoje. Os dias anteriores ficam como estão (✓ feito · ✕ falhou · traço = não era dia).</p>
  <div class="pn"><div class="pn-h"><h3>Consistência diária · 13 semanas</h3></div>${UI.heat(score90, d => { const v = Hab.dayScore(d); return v == null ? 0 : Math.round(v * 100); }, 100)}</div>`;
};
OS.on('render', () => queueMicrotask(() => document.querySelectorAll('#view .hab-wrap').forEach(w => { w.scrollLeft = w.scrollWidth; })));
A.habit = b => { if (b.dataset.d && b.dataset.d !== U.today()) return UI.toast('Só podes marcar os hábitos de hoje', 'neg'); Hab.toggle(b.dataset.id, b.dataset.d || U.today()); };

/* ================= PROJETOS ================= */
V.projetos = () => {
  const f = OS.ui.pf || {}, P = OS.all('projects').filter(p => (!f.type || p.type === f.type) && (f.status ? p.status === f.status : !['Concluído', 'Cancelado'].includes(p.status)));
  const all = OS.all('projects');
  return UI.head('Projetos', 'Gestor central: acadêmicos, financeiros, profissionais, empresariais, pessoais e de aprendizagem. O progresso vem das tarefas; um projeto sem atividade há 14 dias é marcado como parado.', UI.addBtn('projects', 'Novo projeto'), 'Execução') +
  `<div class="kpis">${UI.kpi('Em andamento', all.filter(p => p.status === 'Em andamento').length)}${UI.kpi('Parados', all.filter(p => Proj.info(p).stalled).length, '14+ dias sem atividade', { tone: all.some(p => Proj.info(p).stalled) ? 'warn' : '' })}${UI.kpi('Atrasados', all.filter(p => Proj.info(p).late).length, '', { tone: all.some(p => Proj.info(p).late) ? 'neg' : '' })}${UI.kpi('Concluídos', all.filter(p => p.status === 'Concluído').length)}</div>
  <div class="row gap8">${UI.chip('Ativos', 'pfStatus', !f.status, 'data-v=""')}${L.PSTAT.map(s => UI.chip(s, 'pfStatus', f.status === s, `data-v="${s}"`)).join('')}<span style="width:10px"></span><select class="field" style="width:auto" data-uif="pf.type" aria-label="Tipo"><option value="">Todos os tipos</option>${L.PTYPE.map(x => `<option${f.type === x ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
  <div class="pn">${P.map(p => { const i = Proj.info(p); return `<div class="gcard"><div class="click" data-edit="projects:${p.id}" style="cursor:pointer"><b>${esc(p.name)}</b><div class="gmeta">${UI.badge(p.type, 'out')}${UI.badge(p.status, p.status === 'Em andamento' ? 'acc' : p.status === 'Concluído' ? 'pos' : '')}${+p.prio <= 2 ? UI.badge(prioL(p.prio), prioT(p.prio)) : ''}${p.due ? `<span class="${i.late ? 'neg' : ''}">prazo ${U.fmtDS(p.due)}</span>` : ''}${i.stalled ? UI.badge('parado ' + i.idle + 'd', 'warn') : ''}<span>${i.done.length}/${i.tasks.length} tarefas</span>${OS.get('goals', p.goal) ? `<span>→ ${esc(OS.get('goals', p.goal).title)}</span>` : ''}</div>${p.objective ? `<div class="tx2" style="font-size:13px;margin-top:6px">${esc(p.objective)}</div>` : ''}${i.kpis.length ? `<div class="row gap12" style="margin-top:8px">${i.kpis.map(k => `<span class="mono" style="font-size:12px">${esc(k.l)}: ${k.cur}/${k.tgt}</span>`).join('')}</div>` : ''}</div>
    <div class="gp"><span class="num">${Math.round(i.prog * 100)}%</span>${UI.bar(i.prog, i.prog >= 1 ? 'pos' : i.late ? 'neg' : '')}${i.open[0] ? `<small class="mut" style="font-size:12px;text-align:right">Próxima: ${esc(i.open[0].title)}</small>` : ''}<button class="btn xs ghost" data-act="tpOpen" data-p="${p.id}" style="align-self:flex-end">Ver tarefas →</button></div></div>`; }).join('') || UI.empty('Sem projetos neste filtro.', UI.addBtn('projects', 'Criar projeto', null, ''))}</div>`;
};
A.pfStatus = b => { const f = Object.assign({}, OS.ui.pf || {}); f.status = b.dataset.v; OS.setUI('pf', f); };
OS.S.projects.detail = p => { const i = Proj.info(p); return `<div class="pn tint"><div class="pn-h"><h3>Tarefas do projeto · ${i.done.length}/${i.tasks.length}</h3><button type="button" class="btn sm" data-new="tasks" data-defs='${JSON.stringify({ project: p.id, area: 'Projetos', status: 'Próxima' })}'>${UI.ic('plus')}Tarefa</button></div>${UI.bar(i.prog, 'pos')}<div class="list" style="margin-top:8px">${i.tasks.filter(x => !x.parent).map(x => taskRow(x, { focus: false }) + i.tasks.filter(s => s.parent === x.id).map(s => `<div style="padding-left:28px">${taskRow(s, { focus: false })}</div>`).join('')).join('') || '<div class="mut">Sem tarefas.</div>'}</div></div>`; };

/* ================= METAS ================= */
V.metas = () => {
  const f = OS.ui.gf || '', G = OS.all('goals').filter(g => f ? g.cat === f : g.status !== 'Abandonada');
  const by = U.groupBy(G, g => g.cat || 'Outros'), CATS = L.GCAT.concat(Object.keys(by).filter(c => !L.GCAT.includes(c)));
  const act = OS.all('goals').filter(g => g.status === 'Ativa').map(Goal.info);
  return UI.head('Metas', 'Cada meta mede-se sozinha quando está ligada a dados reais (saldo, horas de estudo, km, média…). A marca na barra é onde devias estar hoje para chegar ao prazo.', UI.addBtn('goals', 'Nova meta'), 'Execução') +
  `<div class="kpis">${UI.kpi('Ativas', act.length)}${UI.kpi('No ritmo', act.filter(i => !i.late && !i.behind).length, '', { tone: 'pos' })}${UI.kpi('Atrás do ritmo', act.filter(i => i.behind).length, '', { tone: act.some(i => i.behind) ? 'warn' : '' })}${UI.kpi('Atrasadas', act.filter(i => i.late).length, '', { tone: act.some(i => i.late) ? 'neg' : '' })}${UI.kpi('Concluídas', OS.all('goals').filter(g => g.status === 'Concluída').length)}</div>
  <div class="row gap8">${UI.chip('Todas', 'gfCat', !f, 'data-v=""')}${L.GCAT.concat([...new Set(OS.all('goals').map(g => g.cat).filter(c => c && !L.GCAT.includes(c)))]).map(c => UI.chip(c, 'gfCat', f === c, `data-v="${c}"`)).join('')}</div>
  ${Object.keys(by).length ? CATS.filter(c => by[c]).map(c => `<section><div class="sech"><h2>${c}</h2></div><div class="pn" style="padding-block:4px">${by[c].map(g => { const i = Goal.info(g), eta = OS.Intel.goalETA(g); return `<div class="gcard"><div class="click" data-edit="goals:${g.id}" style="cursor:pointer"><b>${esc(g.title)}</b><div class="gmeta">${UI.badge(i.st[0], i.st[1])}${UI.badge(g.horizon, 'out')}${g.due ? `<span>prazo ${U.fmtD(g.due)}</span>` : ''}${(g.steps || []).length ? `<span>${g.steps.filter(s => s.done).length}/${g.steps.length} etapas</span>` : ''}${i.projects.length ? `<span>${i.projects.length === 1 ? 'projeto: ' + esc(i.projects[0].name) : i.projects.length + ' projetos'}</span>` : ''}${i.tasks.length ? `<span>${i.tasks.filter(t2 => t2.status !== 'Feita').length} tarefas abertas</span>` : ''}${eta && eta.months != null && i.p < 1 ? `<span class="est">estimativa</span><span>alvo em ~${eta.months} ${eta.months === 1 ? 'mês' : 'meses'} ao ritmo atual</span>` : ''}</div></div>
    <div class="gp"><span class="num">${Goal.fmt(g, i.cur)} <span class="mut">/ ${Goal.fmt(g, i.tgt)}</span></span>${UI.bar(i.p, i.p >= 1 ? 'pos' : i.late ? 'neg' : i.behind ? 'warn' : '', i.exp)}</div></div>`; }).join('')}</div></section>`).join('') : UI.empty('Sem metas. Cria a primeira e liga-a a um indicador real.', UI.addBtn('goals', 'Criar meta', null, ''))}`;
};
A.gfCat = b => OS.setUI('gf', b.dataset.v);
OS.S.goals.detail = g => { const i = Goal.info(g); return `<div class="pn tint"><dl class="kv"><dt>Valor atual</dt><dd>${Goal.fmt(g, i.cur)}</dd><dt>Alvo</dt><dd>${Goal.fmt(g, i.tgt)}</dd><dt>Progresso</dt><dd>${Math.round(i.p * 100)}%</dd>${i.exp != null ? `<dt>Esperado hoje</dt><dd>${Math.round(i.exp * 100)}%</dd>` : ''}</dl>${i.projects.length || i.tasks.length ? `<div class="divider"></div><div class="eyebrow">Ligado a esta meta</div>${i.projects.map(p => `<div class="li"><div class="li-t"><b>${esc(p.name)}</b><small>Projeto · ${p.status}</small></div></div>`).join('')}${i.tasks.map(x => taskRow(x, { focus: false })).join('')}` : ''}<div style="margin-top:10px"><button type="button" class="btn sm" data-new="tasks" data-defs='${JSON.stringify({ goal: g.id, status: 'Próxima' })}'>${UI.ic('plus')}Tarefa para esta meta</button></div></div>`; };

/* ================= MODO FOCO ================= */
const FK = 'os2focus';
let FS = U.ls.get(FK, null);
OS.focusState = () => FS;
A.focusStart = b => {
  const task = b.dataset.task ? OS.get('tasks', b.dataset.task) : null, subject = b.dataset.subject || (task && task.subject) || '';
  const label = task ? task.title : b.dataset.label || (subject ? 'Estudo: ' + subjN(subject) : 'Bloco de foco');
  const html = `<div class="drw-h"><div><div class="eyebrow">Modo foco</div><h3>${esc(label)}</h3></div><button type="button" class="icon-btn" data-close aria-label="Fechar">${UI.ic('x')}</button></div><div class="drw-b">
    <div class="fld"><label>Duração</label>${UI.seg('fdur', [['25', '25'], ['50', '50'], ['90', '90'], ['10', 'Só 10']], OS.ui.fdur || '50')}<small>Protocolo: 50 de foco, 10 de pausa. "Só 10 minutos" para vencer a preguiça.</small></div>
    <div class="fld"><label for="fsubj">Registar como estudo de</label><select id="fsubj"><option value="">Não registar como estudo</option>${St.current().map(s => `<option value="${s.id}"${s.id === subject ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}${OS.all('skills').map(s => `<option value="sk:${s.id}">Competência · ${esc(s.name)}</option>`).join('')}</select></div>
    <label class="switch"><input type="checkbox" id="fphone" checked><span></span>Telemóvel noutra divisão</label>
    <div class="note">Antes: abre só o material da sessão e escreve "No fim desta sessão eu vou conseguir…". Distrações vão para um papel.</div>
    <a class="btn ghost sm" href="#foco" data-close style="margin-top:10px">${UI.ic('lock')}Bloco de foco: várias pendências seguidas, saída com Face ID</a></div>
    <div class="drw-f"><span></span><button class="btn pri" data-act="focusGo" data-task="${task ? task.id : ''}" data-label="${esc(label)}">${UI.ic('play')}Começar</button></div>`;
  UI.drawer(html);
};
A.focusGo = b => { const sel = U.$('#fsubj').value; const dur = +(OS.ui.fdur || 50); FS = { label: b.dataset.label, task: b.dataset.task || '', subject: sel.startsWith('sk:') ? '' : sel, skill: sel.startsWith('sk:') ? sel.slice(3) : '', phone: U.$('#fphone').checked, dur, start: Date.now(), end: Date.now() + dur * 6e4, phase: 'focus', min: false }; U.ls.set(FK, FS); UI.closeDrawer(); try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => { }); } catch (e) { } renderFocus(); };
function focusLog(mins) {
  if (mins < 5 || !(FS.subject || FS.skill)) return false;
  OS.add('sessions', { date: U.today(), subject: FS.subject, skill: FS.skill, minutes: mins, type: 'Estudo profundo', phone: FS.phone, focus: 4, learned: FS.task ? 'Foco: ' + FS.label : '' });
  return true;
}
function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, .3, .6].forEach(t => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 740; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.15, a.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + t + .25); o.start(a.currentTime + t); o.stop(a.currentTime + t + .26); }); } catch (e) { } }
A.focusEnd = b => { if (!FS) return; const early = b && b.dataset.early; if (FS.phase === 'focus') { const mins = Math.round(Math.min(FS.dur * 6e4, Date.now() - FS.start) / 6e4); const logged = focusLog(mins); UI.toast(logged ? `${mins} min registados como sessão de estudo` : mins + ' min de foco', 'pos'); if (FS.task) { const tk = FS.task; setTimeout(() => UI.ask('Concluíste a tarefa?', esc(FS && FS.label || (OS.get('tasks', tk) || {}).title || ''), 'Sim, concluir', () => OS.Tasks.complete(tk), 'pri'), 200); } if (!early) { beep(); FS = Object.assign({}, FS, { phase: 'break', start: Date.now(), end: Date.now() + 10 * 6e4, task: '' }); U.ls.set(FK, FS); renderFocus(); return; } } FS = null; U.ls.del(FK); renderFocus(); };
A.focusCancel = () => { FS = null; U.ls.del(FK); renderFocus(); UI.toast('Sessão descartada'); };
A.focusMin = () => { if (!FS) return; FS.min = true; U.ls.set(FK, FS); renderFocus(); };
A.focusMax = () => { if (!FS) return; FS.min = false; U.ls.set(FK, FS); renderFocus(); };
function renderFocus() {
  const el = U.$('#focus'), dock = U.$('#dock');
  if (!FS) { el.hidden = true; dock.hidden = true; el.innerHTML = ''; return; }
  if (FS.min) { el.hidden = true; dock.hidden = false; tickFocus(); return; }
  dock.hidden = true; el.hidden = false;
  const na = I.next().filter(n => n.edit !== 'tasks:' + FS.task)[0];
  const task = OS.get('tasks', FS.task), goal = task && OS.get('goals', task.goal), proj = task && OS.get('projects', task.project);
  const today = U.sum(OS.all('sessions').filter(s => s.date === U.today()), s => s.minutes);
  el.innerHTML = `<div class="f-top"><span>${FS.phase === 'focus' ? 'FOCO' : 'PAUSA'} · ${FS.dur} min${FS.phone ? ' · telemóvel longe' : ''}</span><button class="btn ghost sm" data-act="focusMin">Minimizar</button></div>
    <div class="eyebrow">${FS.phase === 'focus' ? 'Atividade atual' : 'Pausa — levanta-te, água, respira'}</div>
    <div class="f-act">${esc(FS.phase === 'focus' ? FS.label : 'Pausa de 10 minutos')}</div>
    <div class="f-time" data-ftime>--:--</div><div class="f-ring"><i data-fbar style="width:0"></i></div>
    <div class="f-meta"><div>Objetivo relacionado<b>${esc(goal ? goal.title : proj ? proj.name : FS.subject ? subjN(FS.subject) : '—')}</b></div><div>Foco hoje<b data-ftoday>${today} min</b></div><div>A seguir<b>${esc(na ? na.title : '—')}</b></div></div>
    <div class="f-btns">${FS.phase === 'focus' ? `<button class="btn pri" data-act="focusEnd" data-early="1">${UI.ic('stop')}Terminar e registar</button>` : `<button class="btn pri" data-act="focusEnd" data-early="1">Voltar ao trabalho</button>`}<button class="btn ghost" data-act="focusCancel">Descartar</button></div>`;
  tickFocus();
}
function tickFocus() {
  if (!FS) return; const ms = FS.end - Date.now(), tot = FS.end - FS.start, tx = ms > 0 ? U.pad(Math.floor(ms / 6e4)) + ':' + U.pad(Math.floor(ms % 6e4 / 1e3)) : '00:00';
  const t = U.$('[data-ftime]'); if (t) t.textContent = tx; const b = U.$('[data-fbar]'); if (b) b.style.width = Math.min(100, (1 - ms / tot) * 100) + '%';
  const dock = U.$('#dock'); if (FS.min) dock.innerHTML = `<div><b>${tx}</b><small>${FS.phase === 'focus' ? esc(FS.label) : 'Pausa'}</small></div><button class="icon-btn" data-act="focusMax" aria-label="Abrir foco">${UI.ic('focus')}</button>`;
  document.title = tx + ' · ' + (FS.phase === 'focus' ? 'Foco' : 'Pausa');
  if (ms <= 0) { if (FS.phase === 'focus') { A.focusEnd(null); } else { beep(); FS = null; U.ls.del(FK); renderFocus(); UI.toast('Pausa acabou. Volta ao trabalho.'); document.title = 'Prumo'; } }
}
setInterval(() => { if (FS) tickFocus(); else if (document.title !== 'Prumo' && !/Prumo/i.test(document.title)) document.title = 'Prumo'; document.querySelectorAll('[data-clock]').forEach(e => e.textContent = U.hm()); }, 1000);
document.addEventListener('click', e => { if (e.target.closest('#dock') && !e.target.closest('[data-act]')) A.focusMax(); });
OS.on('ready', renderFocus);
})();
