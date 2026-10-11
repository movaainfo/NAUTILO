/* OCEANUM — camada de inteligência: alertas (Control Room), próximas ações, análises, tendências, finanças inteligentes.
   Regra: só se afirma algo quando há dados suficientes; estimativas vêm sempre com as premissas. */
(() => {
'use strict';
const U = OS.U, Fin = OS.Fin, St = OS.St, Goal = OS.Goal, Proj = OS.Proj, Run = OS.Run, Hab = OS.Hab, Mv = OS.Mv;
const I = OS.Intel = {};

/* ================= CONTROL ROOM ================= */
I.alerts = () => {
  const t = U.today(), out = [], wd = new Date().getDay(), hour = new Date().getHours();
  const A = (lvl, area, title, detail, href, act) => out.push({ lvl, area, title, detail, href, act });
  // Finanças: contas a pagar
  Fin.upcoming(10).forEach(x => {
    if (x.amount >= 0) return; const d = U.diff(x.date, t);
    const act = x.rec ? { l: 'Registar pagamento', a: `data-act="payRec" data-id="${x.rec.id}"` } : x.debt ? { l: 'Registar prestação', a: `data-act="payDebt" data-id="${x.debt.id}"` } : null;
    if (x.late) A('urgent', 'Finanças', `${x.title} em atraso`, `${U.eur(-x.amount)} · venceu a ${U.fmtDS(x.date)}`, '#financas.recorrentes', act);
    else if (d <= 3 && x.kind !== 'Parcela' && x.kind !== 'Agendado') A('urgent', 'Finanças', `${x.title} vence ${U.rel(x.date)}`, U.eur(-x.amount) + ' · ' + x.kind, '#financas.recorrentes', act);
    else if (d <= 7 && x.kind !== 'Parcela' && x.kind !== 'Agendado') A('attention', 'Finanças', `${x.title} vence ${U.rel(x.date)}`, U.eur(-x.amount), '#financas.recorrentes', act);
  });
  Fin.accounts().forEach(a => { const b = Fin.accBal(a); if (a.type === 'Cartão de crédito') { if (U.num(a.limit) && -b > U.num(a.limit) * .8) A('attention', 'Finanças', `Cartão ${a.name} perto do limite`, `${U.eur(-b)} de ${U.eur(a.limit)}`, '#financas.contas'); } else if (b < 0) A('urgent', 'Finanças', `Saldo negativo em ${a.name}`, U.eur(b), '#financas.contas'); });
  const need14 = -U.sum(Fin.upcoming(14).filter(x => x.amount < 0 && !x.tx), x => x.amount), liq = Fin.liquid();
  if (OS.all('accounts').length && need14 > 0 && liq < need14) A('urgent', 'Finanças', 'Saldo disponível não cobre os compromissos', `Disponível ${U.eur(liq)} · a pagar em 14 dias ${U.eur(need14)}`, '#financas');
  const ym = U.ym(t);
  OS.all('budgets').forEach(b => { const sp = Fin.spentCat(b.cat, ym), lim = U.num(b.limit); if (!lim) return; const day = +t.slice(8), dim = U.dim(ym);
    if (sp > lim) A('urgent', 'Finanças', `Orçamento de ${b.cat} ultrapassado`, `${U.eur(sp)} de ${U.eur(lim)} (+${U.eur(sp - lim)})`, '#financas.orcamento');
    else if (sp > lim * .85) A('attention', 'Finanças', `Orçamento de ${b.cat} quase esgotado`, `${U.eur(sp)} de ${U.eur(lim)} · faltam ${dim - day} dias`, '#financas.orcamento');
    else if (day >= 7 && sp / day * dim > lim * 1.1) A('attention', 'Finanças', `${b.cat}: ritmo acima do orçamento`, `Ao ritmo atual (estimativa) fechas o mês em ${U.eur(sp / day * dim)}`, '#financas.orcamento'); });
  I.finAnoms().slice(0, 3).forEach(x => A('attention', 'Finanças', x.title, x.detail, '#financas.inteligencia'));
  OS.all('wishlist').filter(w => w.status === 'Em espera' && Date.now() >= I.wishUntil(w)).forEach(w => A('attention', 'Finanças', `Decidir compra: ${w.product}`, `Espera cumprida · ${U.eur(w.price)}`, '#compras'));
  const mo = Fin.month(ym); if (+t.slice(8) >= 20 && mo.n && mo.net < 0) A('attention', 'Finanças', 'Mês em défice', `Receitas ${U.eur(mo.inc)} · despesas ${U.eur(mo.exp)}`, '#financas');
  // Tarefas
  const late = OS.Tasks.open().filter(OS.Tasks.late);
  const lateHigh = late.filter(x => +x.prio <= 2), lateLow = late.filter(x => +x.prio > 2);
  lateHigh.slice(0, 4).forEach(x => A('urgent', 'Tarefas', x.title, `Atrasada ${U.diff(t, x.due)} dia(s) · prioridade ${OS.L.PRIO.find(p => p[0] === x.prio)[1].toLowerCase()}`, '', { l: 'Concluir', a: `data-act="taskDone" data-id="${x.id}"` }));
  if (lateLow.length) A('attention', 'Tarefas', `${lateLow.length} tarefa(s) atrasada(s) de prioridade média/baixa`, lateLow.slice(0, 3).map(x => x.title).join(' · '), '#tarefas');
  OS.Tasks.open().filter(x => x.due === t).forEach(x => A('attention', 'Tarefas', x.title, 'Prazo hoje', '', { l: 'Concluir', a: `data-act="taskDone" data-id="${x.id}"` }));
  // Universidade
  OS.all('assessments').filter(a => a.date >= t && !['Feito', 'Pronto'].includes(a.prep)).forEach(a => { const d = U.diff(a.date, t), s = OS.get('subjects', a.subject);
    if (d <= 7) A('urgent', 'Universidade', `${a.type}: ${a.title}`, `${s ? s.name + ' · ' : ''}${U.rel(a.date)} · preparação: ${a.prep || 'por começar'}`, '#universidade.avaliacoes');
    else if (d <= 14) A('attention', 'Universidade', `${a.type}: ${a.title}`, `${U.rel(a.date)} · entra em modo exame (só exercícios e exames antigos)`, '#universidade.avaliacoes'); });
  const rev = St.revDue(), revLate = rev.filter(r => St.revNext(r) < t);
  if (revLate.length) A(revLate.length > 3 ? 'urgent' : 'attention', 'Universidade', `${revLate.length} revisão(ões) espaçada(s) atrasada(s)`, 'Revisões atrasadas antes de matéria nova', '#universidade.revisoes');
  if (wd >= 4 || wd === 0) St.current().forEach(s => { const x = St.stats(s); if (x.targetWk && x.hWk < x.targetWk * .5) A('attention', 'Universidade', `${s.name}: ${x.hWk} h de ${x.targetWk} h esta semana`, 'Abaixo de metade do alvo semanal', '#universidade'); });
  St.current().forEach(s => { const x = St.stats(s); if (x.avg && x.avg < 10) A('urgent', 'Universidade', `Risco de reprovar a ${s.name}`, `Média atual ${x.avg} com ${x.w}% avaliado`, '#universidade.disciplinas'); });
  // Metas e projetos
  OS.all('goals').filter(g => g.status === 'Ativa').forEach(g => { const i = Goal.info(g); if (i.late) A('urgent', 'Metas', g.title, `Prazo passou a ${U.fmtDS(g.due)} · ${Math.round(i.p * 100)}% feito`, '#metas'); else if (i.behind) A('attention', 'Metas', g.title, `${Math.round(i.p * 100)}% feito, esperado ${Math.round(i.exp * 100)}% por esta altura`, '#metas'); });
  OS.all('projects').forEach(p => { const i = Proj.info(p); if (i.late) A('urgent', 'Projetos', p.name, `Prazo passou a ${U.fmtDS(p.due)} · ${Math.round(i.prog * 100)}%`, '#projetos'); else if (i.stalled) A('attention', 'Projetos', `${p.name} está parado`, `Sem atividade há ${i.idle} dias`, '#projetos'); });
  // Corpo
  const lastW = [...OS.all('workouts'), ...OS.all('runs'), ...OS.all('sportlog')].map(x => x.date).sort().pop();
  if (lastW && U.diff(t, lastW) >= 4) A('attention', 'Treino', `${U.diff(t, lastW)} dias sem treinar`, 'Último registo a ' + U.fmtDS(lastW), '#treino');
  const wk = U.monday(t), km = Run.kmIn(wk, t), planKm = U.sum(OS.all('runplan').filter(r => r.active), r => r.km) || U.num(OS.one('profile').runKmTarget);
  if (wd >= 5 && planKm && OS.all('runs').length && km < planKm * .5) A('attention', 'Corrida', `${U.r1(km)} km esta semana`, `Plano: ${planKm} km`, '#corrida');
  // Carreira
  OS.all('opps').filter(o => o.deadline && !['Aceite', 'Recusada', 'Perdida', 'Submetida', 'Em avaliação'].includes(o.status)).forEach(o => { const d = U.diff(o.deadline, t); if (d < 0) return; if (d <= 7) A('urgent', 'Oportunidades', o.name, `Prazo ${U.rel(o.deadline)}${o.next ? ' · próxima ação: ' + o.next : ''}`, '#oportunidades'); else if (d <= 21) A('attention', 'Oportunidades', o.name, `Prazo ${U.rel(o.deadline)}`, '#oportunidades'); });
  OS.all('applications').filter(a => a.interview && a.interview >= t && U.diff(a.interview, t) <= 3).forEach(a => A('urgent', 'Carreira', `Entrevista: ${a.company}`, U.rel(a.interview), '#carreira'));
  const fu = OS.all('contacts').filter(c => c.next && c.next <= t); if (fu.length) A('attention', 'Carreira', `${fu.length} follow-up(s) de networking`, fu.slice(0, 3).map(c => c.name).join(' · '), '#carreira.rede');
  // Mova
  // (Mova removida da app)
  // (Mova removida da app)
  // (Mova removida da app)
  // Agenda
  OS.Cal.items(t, U.addDays(t, 1)).filter(x => x.imp && !x.done && x.src !== 'exam').forEach(x => A('attention', 'Agenda', x.title, (x.date === t ? 'Hoje' : 'Amanhã') + (x.start ? ' às ' + x.start : ''), '#calendario'));
  // Revisões
  if ((wd === 0 && hour >= 16) || wd === 1) { const key = wd === 0 ? U.monday(t) : U.monday(U.addDays(t, -1)); if (!OS.all('reviews_w').some(r => r.key === key)) A('attention', 'Revisão', 'Revisão semanal por fazer', '20 minutos: o que funcionou, onde menti a mim mesmo, prioridades', '#revisao'); }
  if (+t.slice(8) <= 5) { const pm = U.addMonths(ym, -1); if (!OS.all('reviews_m').some(r => r.key === pm) && OS.all('transactions').some(x => U.ym(x.date) === pm)) A('attention', 'Revisão', `Revisão de ${U.fmtYML(pm)} por fazer`, 'Auditoria mensal', '#revisao.mensal'); }
  // Hábitos: nunca falhar dois dias seguidos
  const core = OS.all('habits').filter(h => h.active && h.core), y = U.addDays(t, -1);
  const missedY = core.filter(h => Hab.due(h, y) && !Hab.done(h, y) && (!h._c || U.iso(new Date(h._c)) <= y));
  if (missedY.length) A(hour >= 18 ? 'urgent' : 'attention', 'Hábitos', 'Falhaste inegociáveis ontem: hoje não podes falhar', missedY.map(h => h.name).join(' · '), '#habitos');
  return out;
};
I.controlled = (alerts) => {
  const areas = new Set(alerts.map(a => a.area)), out = [], t = U.today();
  const C = (area, text) => { if (!areas.has(area)) out.push({ area, text }); };
  if (OS.all('accounts').length) C('Finanças', `Sem contas em atraso · saldo disponível ${U.eur(Fin.liquid())}`);
  C('Tarefas', `${OS.Tasks.open().length} tarefas abertas, nenhuma atrasada`);
  if (St.current().length) C('Universidade', `Nenhuma avaliação nos próximos 14 dias sem preparação · ${St.revDue().length} revisões para hoje`);
  const ga = OS.all('goals').filter(g => g.status === 'Ativa'); if (ga.length) C('Metas', `${ga.length} metas ativas no ritmo`);
  const pa = OS.all('projects').filter(p => p.status === 'Em andamento'); if (pa.length) C('Projetos', `${pa.length} projetos em andamento, nenhum parado`);
  if (OS.all('workouts').length || OS.all('runs').length) C('Treino', 'Treino em dia');
  if (OS.all('opps').length || OS.all('applications').length) C('Oportunidades', 'Nenhum prazo nos próximos 21 dias');
  if (OS.all('mvsales').length) C('Mova', 'Sem pagamentos em atraso');
  if (OS.all('habits').some(h => h.core)) C('Hábitos', `Sequência de dias perfeitos: ${Hab.perfectStreak()}`);
  return out;
};

/* ================= NEXT ACTION ================= */
I.next = (o = {}) => {
  const t = U.today(), ctx = o.ctx || '', mins = U.num(o.mins) || 0, energy = o.energy || '', out = [];
  const effOk = e => !mins || e <= mins;
  const ctxOk = cs => !ctx || !cs || !cs.length || cs.includes(ctx);
  OS.Tasks.open().forEach(x => {
    if (x.status === 'Aguardando') return;
    if (!ctxOk(x.ctx)) return;
    const eff = U.num(x.effort) || 30; if (!effOk(eff)) return;
    let s = 0; const why = [];
    if (x.due) { const d = U.diff(x.due, t); if (d < 0) { s += 40 + Math.min(20, -d * 3); why.push(`atrasada ${-d}d`); } else if (d === 0) { s += 35; why.push('prazo hoje'); } else if (d === 1) { s += 28; why.push('prazo amanhã'); } else if (d <= 3) { s += 22; why.push(`prazo em ${d}d`); } else if (d <= 7) { s += 14; why.push(`prazo em ${d}d`); } else s += 5; }
    if (x.sched && x.sched <= t) { s += 15; why.push('planeada para hoje'); }
    const pr = { 1: 30, 2: 20, 3: 10, 4: 0 }[x.prio] ?? 10; s += pr; if (+x.prio <= 2) why.push('prioridade ' + (x.prio === '1' ? 'crítica' : 'alta'));
    const imp = U.num(x.impact) || 3; s += (imp - 1) * 6; if (imp >= 4) why.push('alto impacto');
    const g = OS.get('goals', x.goal); if (g && g.status === 'Ativa') { s += 8 + (U.num(g.importance) || 3) * 2; why.push('meta: ' + g.title); }
    const p = OS.get('projects', x.project); if (p && p.status === 'Em andamento') { s += 5; if (!g) why.push('projeto: ' + p.name); }
    if (eff <= 15) { s += 6; why.push('vitória rápida'); }
    if (x.status === 'Em curso') { s += 10; why.push('já começada'); }
    if (energy === 'Baixa' && x.energy === 'Alta') s -= 15; if (energy === 'Alta' && x.energy === 'Alta') s += 5;
    out.push({ kind: 'Tarefa', title: x.title, score: s, why, eff, area: x.area || '', ctx: x.ctx, act: `data-act="taskDone" data-id="${x.id}"`, actL: 'Concluir', focus: `data-act="focusStart" data-task="${x.id}"`, edit: 'tasks:' + x.id });
  });
  Fin.upcoming(3).filter(x => x.amount < 0 && (x.rec || x.debt)).forEach(x => { if (!ctxOk(['@Financeiro', '@Computador'])) return; if (!effOk(5)) return; out.push({ kind: 'Pagamento', title: `Pagar ${x.title}`, score: x.late ? 80 : 60, why: [x.late ? 'em atraso' : 'vence ' + U.rel(x.date), U.eur(-x.amount)], eff: 5, area: 'Finanças', act: x.rec ? `data-act="payRec" data-id="${x.rec.id}"` : `data-act="payDebt" data-id="${x.debt.id}"`, actL: 'Registar' }); });
  if (ctxOk(['@Estudos', '@Universidade'])) St.today().slice(0, 4).forEach(x => { if (!effOk(Math.min(x.mins || 50, 50))) return; const s = OS.get('subjects', x.subject); out.push({ kind: 'Estudo', title: x.title + (s && x.kind !== 'Ritmo' ? ' · ' + s.name : ''), score: Math.min(75, x.score * .55 + 12), why: [x.why], eff: Math.min(x.mins || 50, 50), area: 'Universidade', act: x.act || '', actL: x.actL || '', focus: `data-act="focusStart" data-subject="${x.subject || ''}" data-label="${U.esc(x.title)}"` }); });
  const wd = String(new Date().getDay()), split = OS.one('fit').split[wd];
  if (ctxOk(['@Rua']) && effOk(45)) {
    if (split && !['Corrida', 'Descanso'].includes(split) && !OS.all('workouts').some(w => w.date === t)) out.push({ kind: 'Treino', title: 'Treino de hoje: ' + split, score: 42, why: ['planeado para hoje', 'meta ' + (OS.one('profile').trainTarget || 4) + '×/semana'], eff: 60, area: 'Treino', act: `data-new="workouts"`, actL: 'Registar' });
    OS.all('runplan').filter(r => r.active && String(r.wday) === wd).forEach(r => { if (!OS.all('runs').some(x => x.date === t)) out.push({ kind: 'Corrida', title: `${r.type}${U.num(r.km) ? ' ' + r.km + ' km' : U.num(r.mins) ? ' ' + r.mins + ' min' : ''}`, score: 38, why: ['plano de corrida', r.desc].filter(Boolean), eff: U.num(r.mins) || Math.round(U.num(r.km) * 6) || 30, area: 'Corrida', act: `data-new="runs"`, actL: 'Registar' }); });
  }
  OS.all('habits').filter(h => h.active && h.core && Hab.due(h, t) && !Hab.done(h, t) && !h.auto).forEach(h => { if (effOk(10)) out.push({ kind: 'Hábito', title: h.name, score: 30 + (new Date().getHours() >= 18 ? 15 : 0), why: ['inegociável', 'sequência ' + Hab.streak(h) + 'd'], eff: 10, area: 'Hábitos', act: `data-act="habit" data-id="${h.id}" data-d="${t}"`, actL: 'Feito' }); });
  if (ctxOk(['@Computador'])) OS.all('opps').filter(o2 => o2.deadline && o2.next && U.diff(o2.deadline, t) >= 0 && U.diff(o2.deadline, t) <= 14 && !['Aceite', 'Recusada', 'Perdida', 'Submetida', 'Em avaliação'].includes(o2.status)).forEach(o2 => { if (effOk(30)) out.push({ kind: 'Oportunidade', title: o2.next + ' · ' + o2.name, score: 55 - U.diff(o2.deadline, t) * 2, why: ['prazo ' + U.rel(o2.deadline)], eff: 30, area: 'Carreira', edit: 'opps:' + o2.id }); });
  OS.all('contacts').filter(c => c.next && c.next <= t).forEach(c => { if (effOk(10)) out.push({ kind: 'Networking', title: 'Follow-up com ' + c.name, score: 28, why: [c.org || c.role || 'rede'].filter(Boolean), eff: 10, area: 'Carreira', act: `data-act="contactDone" data-id="${c.id}"`, actL: 'Contactado' }); });
  OS.all('wishlist').filter(w => w.status === 'Em espera' && Date.now() >= I.wishUntil(w)).forEach(w => { if (effOk(5)) out.push({ kind: 'Decisão', title: 'Decidir compra: ' + w.product, score: 22, why: ['espera cumprida', U.eur(w.price)], eff: 5, area: 'Finanças', href: '#compras' }); });
  if (new Date().getDay() === 0 && !OS.all('reviews_w').some(r => r.key === U.monday(t)) && effOk(20)) out.push({ kind: 'Revisão', title: 'Revisão semanal', score: 50, why: ['domingo', '20 minutos'], eff: 20, area: 'Direção', href: '#revisao' });
  return out.sort((a, b) => b.score - a.score);
};

/* ================= COMPRAS ================= */
I.wishWait = price => { const p = U.num(price); return p <= 50 ? { label: '24 horas', h: 24 } : p <= 200 ? { label: '3 dias úteis', bd: 3 } : p <= 1000 ? { label: '7 dias', h: 168 } : { label: '14 dias', h: 336 }; };
I.wishUntil = w => { const r = I.wishWait(w.price), c = w.created || Date.now(); if (r.h) return c + r.h * 36e5; const d = new Date(c); let n = 0; while (n < r.bd) { d.setDate(d.getDate() + 1); const g = d.getDay(); if (g && g !== 6) n++; } return d.getTime(); };
I.wishImpact = w => {
  const price = U.num(w.price), inc = Fin.avgMonthly(3, 'inc'), exp = Fin.avgMonthly(3, 'exp'), hourly = Fin.hourly();
  const free = inc != null && exp != null ? inc - exp : null;
  const fv = (r, y) => price * Math.pow(1 + r, y);
  const g = OS.all('goals').filter(x => x.status === 'Ativa' && ['account', 'networth', 'invested'].includes(x.metric)).sort((a, b) => (U.num(b.importance) || 0) - (U.num(a.importance) || 0))[0];
  const budget = OS.all('budgets').find(b => b.cat === w.cat), bLeft = budget ? U.num(budget.limit) - Fin.spentCat(w.cat, U.ym(U.today())) : null;
  return { hours: hourly ? price / hourly : null, freeShare: free && free > 0 ? price / free : null, free, fv5: fv(.06, 5), fv10: fv(.06, 10), goal: g, goalDelayDays: g && free && free > 0 ? Math.round(price / free * 30) : null, budget, bLeft, liquidShare: Fin.liquid() > 0 ? price / Fin.liquid() : null };
};
I.wishStats = () => {
  const all = OS.all('wishlist'), decided = all.filter(w => ['Comprada', 'Aprovada', 'Desisti'].includes(w.status)), gave = all.filter(w => w.status === 'Desisti');
  return { total: all.length, waiting: all.filter(w => w.status === 'Em espera').length, gaveUp: gave.length, saved: U.sum(gave, w => w.price), bought: U.sum(all.filter(w => ['Comprada', 'Aprovada'].includes(w.status)), w => w.price), resist: decided.length ? gave.length / decided.length : null, byCat: Object.entries(U.groupBy(all, w => w.cat || 'Sem categoria')).map(([l, a]) => ({ l, v: U.sum(a, w => w.price) })).sort((a, b) => b.v - a.v) };
};

/* ================= INTELIGÊNCIA FINANCEIRA ================= */
I.finAnoms = () => {
  const out = [], t = U.today(), ym = U.ym(t), prev = [1, 2, 3].map(i => U.addMonths(ym, -i)), hist = prev.filter(m => Fin.month(m).n > 0);
  if (hist.length >= 2) {
    const day = +t.slice(8), frac = day / U.dim(ym);
    Fin.byCat(ym + '-01', t).forEach(c => { const avg = U.avg(hist, m => Fin.spentCat(c.l, m)); if (avg > 0 && c.v > avg * 1.3 && c.v - avg > 25) out.push({ kind: 'categoria', title: `${c.l}: gasto acima do habitual`, detail: `${U.eur(c.v)} este mês contra média de ${U.eur(avg)} nos últimos ${hist.length} meses (+${Math.round((c.v / avg - 1) * 100)}%)`, v: c.v - avg }); else if (avg > 0 && frac < .8 && c.v / frac > avg * 1.4 && c.v > 40) out.push({ kind: 'ritmo', title: `${c.l}: ritmo acima do habitual`, detail: `Ao ritmo atual (estimativa) fechas o mês em ${U.eur(c.v / frac)}; média ${U.eur(avg)}`, v: c.v / frac - avg }); });
  }
  const by = U.groupBy(OS.all('transactions').filter(x => x.type === 'Despesa'), x => x.cat);
  Object.entries(by).forEach(([cat, arr]) => { if (arr.length < 6) return; const s = arr.map(x => U.num(x.amount)).sort((a, b) => a - b), med = s[Math.floor(s.length / 2)];
    arr.filter(x => x.date >= U.addDays(t, -30) && U.num(x.amount) > med * 3 && U.num(x.amount) > 40).forEach(x => out.push({ kind: 'transação', title: `Despesa fora do padrão em ${cat}`, detail: `${x.desc || cat}: ${U.eur(x.amount)} a ${U.fmtDS(x.date)} (mediana da categoria ${U.eur(med)})`, v: U.num(x.amount) - med })); });
  return out.sort((a, b) => b.v - a.v);
};
I.finRecurringCandidates = () => {
  const norm = s => String(s || '').toLowerCase().replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
  const g = U.groupBy(OS.all('transactions').filter(x => x.type === 'Despesa' && !x.recurring && !x.instG && x.desc), x => norm(x.desc));
  return Object.entries(g).map(([k, arr]) => { const months = new Set(arr.map(x => U.ym(x.date))); const amts = arr.map(x => U.num(x.amount)), avg = U.avg(amts); const stable = amts.every(a => Math.abs(a - avg) <= avg * .15);
    return months.size >= 2 && stable ? { desc: arr[arr.length - 1].desc, avg, months: months.size, cat: arr[0].cat, yearly: avg * 12, tx: arr[arr.length - 1] } : null; }).filter(Boolean).sort((a, b) => b.avg - a.avg);
};
I.finBehavior = () => {
  const t = U.today(), a = Fin.tx(U.addDays(t, -29), t, { type: 'Despesa' }), b = Fin.tx(U.addDays(t, -59), U.addDays(t, -30), { type: 'Despesa' });
  if (!a.length) return null;
  const wk = arr => { const tot = U.sum(arr, x => x.amount); const we = U.sum(arr.filter(x => [0, 6].includes(U.parse(x.date).getDay())), x => x.amount); return tot ? we / tot : 0; };
  const sup = arr => { const tot = U.sum(arr, x => x.amount); return tot ? U.sum(arr.filter(x => x.ess === 'Supérfluo'), x => x.amount) / tot : 0; };
  return { daily: U.sum(a, x => x.amount) / 30, dailyPrev: b.length ? U.sum(b, x => x.amount) / 30 : null, n: a.length, nPrev: b.length, ticket: U.avg(a, x => x.amount), ticketPrev: b.length ? U.avg(b, x => x.amount) : null, weekend: wk(a), weekendPrev: b.length ? wk(b) : null, sup: sup(a), supPrev: b.length ? sup(b) : null };
};
I.finSavings = () => {
  const out = [];
  const subs = OS.all('recurring').filter(r => r.active && r.type === 'Despesa' && ['Rever', 'Cancelar'].includes(r.review));
  if (subs.length) out.push({ title: `Cancelar ou rever ${subs.length} recorrente(s)`, v: U.sum(subs, r => r.freq === 'Anual' ? U.num(r.amount) : U.num(r.amount) * 12), detail: subs.map(r => r.name).join(', '), basis: 'valor anual das recorrentes marcadas "Rever" ou "Cancelar"' });
  const sup3 = Fin.months(4).slice(0, 3).map(m => Fin.month(m).sup); const sAvg = U.avg(sup3.filter(v => v > 0));
  if (sAvg > 0) out.push({ title: 'Zerar despesas supérfluas', v: sAvg * 12, detail: `Média de ${U.eur(sAvg)} por mês em supérfluos`, basis: 'média mensal dos supérfluos dos meses com registo × 12' });
  const disc = ['Lazer', 'Alimentação', 'Pessoal', 'Subscrições'];
  const ym = U.ym(U.today()), prev3 = [1, 2, 3].map(i => U.addMonths(ym, -i)).filter(m => Fin.month(m).n);
  if (prev3.length) disc.forEach(c => { const avg = U.avg(prev3, m => Fin.spentCat(c, m)); if (avg > 30) out.push({ title: `Cortar 20% em ${c}`, v: avg * .2 * 12, detail: `Média ${U.eur(avg)}/mês`, basis: `20% da média de ${prev3.length} mês(es) × 12` }); });
  return out.sort((a, b) => b.v - a.v);
};
I.finProjection = () => {
  const t = U.today(), ym = U.ym(t), day = +t.slice(8), dim = U.dim(ym), m = Fin.month(ym);
  const recurIds = new Set(OS.all('recurring').map(r => r.id));
  const varSpend30 = U.sum(Fin.tx(U.addDays(t, -29), t, { type: 'Despesa' }).filter(x => !recurIds.has(x.recurring) && !x.instG), x => x.amount) / 30;
  const unpaid = U.sum(OS.all('recurring').filter(r => r.type === 'Despesa' && Fin.recurDue(r, ym) && Fin.recurDue(r, ym) >= t && !Fin.recurPaid(r, ym)), r => r.amount);
  const unpaidInc = U.sum(OS.all('recurring').filter(r => r.type === 'Receita' && Fin.recurDue(r, ym) && !Fin.recurPaid(r, ym)), r => r.amount);
  const expEnd = m.exp + varSpend30 * (dim - day) + unpaid, incEnd = m.inc + unpaidInc;
  const liq = Fin.liquid(), fixed = Fin.fixedMonthly(), rInc = Fin.recurIncome(), avgInc = Fin.avgMonthly(3, 'inc'), avgExp = Fin.avgMonthly(3, 'exp');
  const monthlyNet = (avgInc != null && avgExp != null) ? avgInc - avgExp : (rInc - fixed - varSpend30 * 30);
  return { expEnd, incEnd, netEnd: incEnd - expEnd, varDaily: varSpend30, unpaid, cash90: [1, 2, 3].map(i => liq + monthlyNet * i), monthlyNet, basis: [`gasto variável médio dos últimos 30 dias: ${U.eur(varSpend30)}/dia`, `recorrentes por pagar este mês: ${U.eur(unpaid)}`, avgInc != null ? `saldo mensal médio dos últimos 3 meses: ${U.eur(monthlyNet)}` : `sem 3 meses de histórico: usa recorrentes (${U.eur(rInc)} entradas, ${U.eur(fixed)} fixas) e gasto variável`], hasHist: avgInc != null };
};
I.goalETA = g => { if (!['account', 'networth', 'invested'].includes(g.metric)) return null; const p = I.finProjection(); const cur = Goal.value(g), left = U.num(g.target) - U.num(cur); if (left <= 0) return { months: 0 }; if (p.monthlyNet <= 0) return { months: null, basis: p.basis }; return { months: Math.ceil(left / p.monthlyNet), basis: p.basis }; };

/* ================= ANÁLISE PESSOAL / TENDÊNCIAS ================= */
const snapAt = (d, k) => { const s = U.sortBy(OS.all('snapshots').filter(x => x.date <= d || x.ym <= U.ym(d)), x => x.ym).pop(); return s ? s[k] : null; };
const win = (end, days) => [U.addDays(end, -(days - 1)), end];
I.metrics = [
  { k: 'nw', l: 'Patrimônio líquido', stock: true, up: true, f: d => d === U.today() ? Fin.netWorth() : snapAt(d, 'nw'), fmt: v => U.eur(v, { dec: 0 }) },
  { k: 'inv', l: 'Carteira de investimentos', stock: true, up: true, f: d => d === U.today() ? OS.Inv.value() : snapAt(d, 'inv'), fmt: v => U.eur(v, { dec: 0 }) },
  { k: 'inc', l: 'Receitas (30 dias)', up: true, f: d => { const [a, b] = win(d, 30); return U.sum(Fin.tx(a, b, { type: 'Receita' }), x => x.amount); }, has: () => OS.all('transactions').length, fmt: v => U.eur(v, { dec: 0 }) },
  { k: 'exp', l: 'Despesas (30 dias)', up: false, f: d => { const [a, b] = win(d, 30); return U.sum(Fin.tx(a, b, { type: 'Despesa' }), x => x.amount); }, has: () => OS.all('transactions').length, fmt: v => U.eur(v, { dec: 0 }) },
  { k: 'sav', l: 'Taxa de poupança (30 dias)', up: true, ratio: true, f: d => { const [a, b] = win(d, 30); const i = U.sum(Fin.tx(a, b, { type: 'Receita' }), x => x.amount), e = U.sum(Fin.tx(a, b, { type: 'Despesa' }), x => x.amount); return i ? (i - e) / i : null; }, has: () => OS.all('transactions').length, fmt: v => U.pct(v) },
  { k: 'study', l: 'Horas de estudo (30 dias)', up: true, f: d => { const [a, b] = win(d, 30); return U.sum(OS.all('sessions').filter(s => U.inRange(s.date, a, b)), s => s.minutes) / 60; }, has: () => OS.all('sessions').length, fmt: v => U.nf(v, 1) + ' h' },
  { k: 'wk', l: 'Treinos (30 dias)', up: true, f: d => { const [a, b] = win(d, 30); return OS.all('workouts').filter(w => U.inRange(w.date, a, b)).length; }, has: () => OS.all('workouts').length, fmt: v => U.nf(v) },
  { k: 'vol', l: 'Volume de treino (30 dias)', up: true, f: d => { const [a, b] = win(d, 30); return U.sum(OS.all('workouts').filter(w => U.inRange(w.date, a, b)), OS.Fit.volume); }, has: () => OS.all('workouts').some(w => (Array.isArray(w.items) ? w.items : []).length), fmt: v => U.nf(v / 1000, 1) + ' t' },
  { k: 'km', l: 'Km corridos (30 dias)', up: true, f: d => { const [a, b] = win(d, 30); return Run.kmIn(a, b); }, has: () => OS.all('runs').length, fmt: v => U.nf(v, 1) + ' km' },
  { k: 'pace', l: 'Ritmo médio de corrida (30 dias)', up: false, f: d => { const [a, b] = win(d, 30); const r = OS.all('runs').filter(x => U.inRange(x.date, a, b) && U.num(x.km)); const km = U.sum(r, x => x.km); return km ? U.sum(r, x => U.parseDur(x.time)) / km : null; }, has: () => OS.all('runs').length, fmt: v => U.mmss(v) + '/km' },
  { k: 'hab', l: 'Consistência de hábitos (30 dias)', up: true, ratio: true, f: d => { const ds = U.range(U.addDays(d, -29), d).map(Hab.dayScore).filter(v => v != null); return ds.length ? U.avg(ds) : null; }, has: () => OS.all('habits').some(h => Object.keys(h.log || {}).length), fmt: v => U.pct(v) },
  { k: 'tasks', l: 'Tarefas concluídas (30 dias)', up: true, f: d => { const [a, b] = win(d, 30); return OS.all('tasks').filter(x => U.inRange(x.doneAt, a, b)).length; }, has: () => OS.all('tasks').some(x => x.doneAt), fmt: v => U.nf(v) },
  { k: 'cap', l: 'Capital profissional', stock: true, up: true, f: d => OS.Car.capital(d).score, has: () => true, fmt: v => U.nf(v) + ' pts' },
  { k: 'mova', off: 1, l: 'Receita Mova (30 dias)', up: true, f: d => 0, has: () => 0, fmt: v => U.eur(v, { dec: 0 }) }
];
I.firstDate = () => { const ds = []; ['transactions', 'sessions', 'workouts', 'runs', 'tasks', 'mvsales'].forEach(c => OS.all(c).forEach(r => { const d = r.date || r.doneAt; if (d) ds.push(d); })); return ds.sort()[0] || U.today(); };
I.compare = m => { const t = U.today(); return [0, 30, 90, 365].map(n => { const d = U.addDays(t, -n); if (d < I.firstDate() && n) return null; const v = m.f(d); return v == null ? null : v; }); };
I.insights = () => {
  const out = [], t = U.today(), first = I.firstDate(), span = U.diff(t, first);
  const say = (tone, text, area) => out.push({ tone, text, area });
  const pair = (fn, days) => [fn(U.addDays(t, -(days - 1)), t), fn(U.addDays(t, -(2 * days - 1)), U.addDays(t, -days))];
  if (span >= 27) {
    const [a, b] = pair((x, y) => U.sum(OS.all('sessions').filter(s => U.inRange(s.date, x, y)), s => s.minutes) / 60, 14);
    if (a + b >= 3 && b > 0) { const c = (a - b) / b; if (c <= -.15) say('neg', `Estás a estudar menos: ${U.nf(a, 1)} h nos últimos 14 dias contra ${U.nf(b, 1)} h nos 14 anteriores (${Math.round(c * 100)}%).`, 'Universidade'); else if (c >= .15) say('pos', `Estás a estudar mais: ${U.nf(a, 1)} h nos últimos 14 dias contra ${U.nf(b, 1)} h (+${Math.round(c * 100)}%).`, 'Universidade'); }
    const [wa, wb] = pair((x, y) => OS.all('workouts').filter(w => U.inRange(w.date, x, y)).length + OS.all('runs').filter(w => U.inRange(w.date, x, y)).length, 14);
    if (wa + wb >= 3) { if (wa > wb) say('pos', `A tua consistência de treino aumentou: ${wa} sessões nos últimos 14 dias contra ${wb} antes.`, 'Treino'); else if (wa < wb) say('neg', `Treinaste menos: ${wa} sessões nos últimos 14 dias contra ${wb} antes.`, 'Treino'); }
    const [ta, tb] = pair((x, y) => OS.all('tasks').filter(k => U.inRange(k.doneAt, x, y)).length, 14);
    if (ta + tb >= 6 && tb) { const c = (ta - tb) / tb; if (c <= -.25) say('neg', `A tua produtividade caiu: ${ta} tarefas concluídas nos últimos 14 dias contra ${tb} (${Math.round(c * 100)}%).`, 'Tarefas'); else if (c >= .25) say('pos', `Produtividade em alta: ${ta} tarefas concluídas contra ${tb} (+${Math.round(c * 100)}%).`, 'Tarefas'); }
    const [ra, rb] = pair((x, y) => Run.kmIn(x, y), 14); if (ra + rb >= 8 && rb) { const c = (ra - rb) / rb; if (Math.abs(c) >= .2) say(c > 0 ? 'pos' : 'neg', `Volume de corrida ${c > 0 ? 'subiu' : 'desceu'}: ${U.nf(ra, 1)} km contra ${U.nf(rb, 1)} km nos 14 dias anteriores.`, 'Corrida'); }
    const ha = U.range(U.addDays(t, -13), t).map(Hab.dayScore).filter(v => v != null), hb = U.range(U.addDays(t, -27), U.addDays(t, -14)).map(Hab.dayScore).filter(v => v != null);
    if (ha.length >= 7 && hb.length >= 7) { const d = U.avg(ha) - U.avg(hb); if (Math.abs(d) >= .1) say(d > 0 ? 'pos' : 'neg', `Hábitos: consistência ${d > 0 ? 'subiu' : 'desceu'} de ${U.pct(U.avg(hb))} para ${U.pct(U.avg(ha))}.`, 'Hábitos'); }
  }
  if (span >= 55) {
    const [ea, eb] = pair((x, y) => U.sum(Fin.tx(x, y, { type: 'Despesa' }), k => k.amount), 30);
    if (eb > 50) { const c = (ea - eb) / eb; if (c >= .15) say('neg', `Os teus gastos aumentaram: ${U.eur(ea, { dec: 0 })} nos últimos 30 dias contra ${U.eur(eb, { dec: 0 })} (+${Math.round(c * 100)}%).`, 'Finanças'); else if (c <= -.15) say('pos', `Gastaste menos: ${U.eur(ea, { dec: 0 })} contra ${U.eur(eb, { dec: 0 })} (${Math.round(c * 100)}%).`, 'Finanças'); }
  }
  const s = Fin.nwSeries(); if (s.length >= 3) { const a = s[s.length - 1].nw, b = s[s.length - 3].nw; if (b && Math.abs(a - b) > 50) say(a > b ? 'pos' : 'neg', `Patrimônio ${a > b ? 'cresceu' : 'caiu'} ${U.eur(Math.abs(a - b), { dec: 0 })} em 2 meses.`, 'Finanças'); }
  OS.all('goals').filter(g => g.status === 'Ativa').forEach(g => { const i = Goal.info(g); if (i.exp != null && i.p >= i.exp + .1 && i.p < 1) say('pos', `Estás à frente do ritmo em "${g.title}": ${Math.round(i.p * 100)}% feito, esperado ${Math.round(i.exp * 100)}%.`, 'Metas'); });
  St.current().forEach(sub => { const x = St.stats(sub); if (x.avg && x.w >= 20) { if (x.avg >= x.tgt) say('pos', `${sub.name}: média ${x.avg} acima do alvo ${x.tgt} com ${x.w}% avaliado.`, 'Universidade'); } });
  return out;
};
})();
