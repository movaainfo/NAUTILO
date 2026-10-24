/* PRUMO — Próximos passos: o plano da tua vida inteira, do passo mais pequeno ao maior, por área.
   Junta tudo o que a app sabe: estrela-guia, metas (e as etapas de cada uma), marcos, projetos, tarefas, hábitos,
   estudos e avaliações, treino e corrida, dinheiro (contas, poupança, dívidas), carreira e oportunidades.
   A "Próxima ação agora" (o que fazer neste minuto, com filtros de sítio, tempo e energia) continua numa aba. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc, I = OS.Intel, Fin = OS.Fin, Goal = OS.Goal, St = OS.St, Run = OS.Run, Hab = OS.Hab;
OS.ONE_DEF.lifeplan = { at: 0, foco: '', steps: [] };
const agora = V.next; // a lista de sempre: o que fazer agora
// áreas da vida: [chave, nome, ícone, categorias de metas, áreas de tarefas]
const CATS = [
  ['estudos', 'Estudos', 'school', ['Estudos'], ['Universidade', 'Aprendizagem']],
  ['dinheiro', 'Dinheiro', 'wallet', ['Finanças'], ['Finanças', 'Investimentos']],
  ['corpo', 'Corpo e saúde', 'heart', ['Academia', 'Corrida'], ['Treino', 'Corrida', 'Saúde']],
  ['carreira', 'Carreira e trabalho', 'briefcase', ['Trabalho', 'Empresa'], ['Trabalho', 'Carreira', 'Mova']],
  ['pessoal', 'Pessoal e fé', 'user', ['Desenvolvimento pessoal', 'Outros'], ['Pessoal', 'Fé', 'Casa', 'Projetos']]];
const LV = { 1: ['Hoje', 'passo pequeno'], 2: ['Esta semana', 'passo médio'], 3: ['Este mês', 'passo grande'], 4: ['Este ano', 'grande objetivo'], 5: ['Longo prazo', 'a visão'] };
const byGoal = g => (CATS.find(c => c[3].includes(g.cat)) || CATS[4])[0];
const byArea = a => (CATS.find(c => c[4].includes(a)) || [])[0] || '';
const KIND = { Estudo: 'estudos', Treino: 'corpo', Corrida: 'corpo', Pagamento: 'dinheiro', 'Decisão': 'dinheiro', Oportunidade: 'carreira', Contactos: 'carreira', 'Hábito': 'pessoal', 'Revisão': 'pessoal' };
const safe = (f, d) => { try { return f(); } catch (e) { return d; } };

/* ---------- os passos (calculados a partir dos dados) ---------- */
const build = () => { const t = U.today(), p = OS.one('profile'), wk = U.monday(t), we = U.addDays(wk, 6), ym = U.ym(t), out = { estudos: [], dinheiro: [], corpo: [], carreira: [], pessoal: [] }, urg = { estudos: 0, dinheiro: 0, corpo: 0, carreira: 0, pessoal: 0 };
  const seenT = new Set(), key = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const add = (c, lv, t2, o = {}) => { if (!out[c]) c = 'pessoal'; const k = key(t2); if (lv < 4 && seenT.has(k)) return; seenT.add(k); out[c].push(Object.assign({ lv, t: t2 }, o)); if (o.tone === 'neg') urg[c]++; };
  const goals = OS.all('goals').filter(g => g.status === 'Ativa');
  const catOfTask = x => { const g = OS.get('goals', x.goal); return g ? byGoal(g) : byArea(x.area) || 'pessoal'; };
  // 1 · hoje: a próxima ação de cada área (a mesma pontuação da "Próxima ação")
  const seen = {}; safe(() => I.next(), []).forEach(n => { const c = byArea(n.area) || KIND[n.kind] || 'pessoal'; seen[c] = (seen[c] || 0) + 1; if (seen[c] > 3) return;
    add(c, 1, n.title, { why: n.why.slice(0, 2).join(' · '), edit: n.edit, act: n.act, actL: n.actL, href: n.href }); });
  // 2 · esta semana
  OS.Tasks.open().filter(x => { const d = x.due || x.sched; return d && d > t && d <= we; }).slice(0, 30).forEach(x => add(catOfTask(x), 2, x.title, { why: 'prazo ' + U.rel(x.due || x.sched), edit: 'tasks:' + x.id }));
  safe(() => { const done = St.weekMins(wk) / 60, tgt = St.targetWeek(); if (tgt && done < tgt) add('estudos', 2, `Estudar mais ${U.nf(tgt - done, 1)} h até domingo`, { why: `levas ${U.nf(done, 1)} de ${tgt} h esta semana`, href: '#universidade' }); });
  OS.all('assessments').filter(a => a.date >= t && a.date <= U.addDays(t, 7) && a.prep !== 'Feito').forEach(a => add('estudos', 2, 'Preparar ' + a.title, { why: (a.type || 'avaliação') + ' ' + U.rel(a.date), tone: U.diff(a.date, t) <= 2 ? 'neg' : '', edit: 'assessments:' + a.id }));
  safe(() => { const n = OS.all('workouts').filter(w => w.date >= wk && w.date <= t).length, tg = U.num(p.trainTarget) || 4; if (n < tg) add('corpo', 2, `Fazer mais ${tg - n} treino${tg - n > 1 ? 's' : ''} esta semana`, { why: `${n} de ${tg} feitos`, href: '#treino' }); });
  safe(() => { const km = Run.kmIn(wk, t), tg = U.num(p.runKmTarget); if (tg && km < tg) add('corpo', 2, `Correr mais ${U.nf(tg - km, 1)} km esta semana`, { why: `${U.nf(km, 1)} de ${tg} km`, href: '#corrida' }); });
  safe(() => Fin.upcoming(7).filter(x => x.amount < 0).slice(0, 4).forEach(x => add('dinheiro', 2, 'Pagar ' + x.title + ' · ' + U.eur(-x.amount), { why: x.late ? 'em atraso' : 'vence ' + U.rel(x.date), tone: x.late ? 'neg' : '', href: '#financas.recorrentes' })));
  OS.all('opps').filter(o => o.deadline && o.deadline >= t && o.deadline <= U.addDays(t, 7) && !['Aceite', 'Recusada', 'Perdida', 'Descartada', 'Submetida'].includes(o.status)).forEach(o => add('carreira', 2, (o.next || 'Avançar') + ': ' + o.name, { why: 'prazo ' + U.rel(o.deadline), edit: 'opps:' + o.id }));
  OS.all('habits').filter(h => h.active && h.core).slice(0, 3).forEach(h => add(byArea(h.area) || 'pessoal', 2, 'Cumprir "' + h.name + '" todos os dias', { why: 'sequência de ' + safe(() => Hab.streak(h), 0) + ' dias', href: '#habitos' }));
  // as outras áreas da vida (só aparecem se as usas): dieta, desporto, Fé e leitura
  safe(() => { const o = OS.one('diet'), tg = U.num(o.p); if (tg && OS.Diet && OS.Diet.day) { const d = OS.Diet.day(t); if (d.n && d.p < tg * .9) add('corpo', 1, `Comer mais ${Math.round(tg - d.p)} g de proteína hoje`, { why: `levas ${Math.round(d.p)} de ${tg} g`, href: '#dieta' }); } });
  safe(() => OS.all('sports').forEach(sp => { const last = U.sortBy(OS.all('sportlog').filter(x => x.sport === sp.id), x => x.date).pop(); if (last && U.diff(t, last.date) >= 10) add('corpo', 2, `Voltar a praticar ${sp.name || 'desporto'}`, { why: `a última vez foi há ${U.diff(t, last.date)} dias`, href: '#desporto' }); }));
  safe(() => { const dv = OS.all('devos'); if (dv.some(x => x.date >= U.addDays(t, -30)) && !dv.some(x => x.date === t)) add('pessoal', 1, 'Fazer o devocional de hoje', { why: `${dv.filter(x => x.date >= U.addDays(t, -29)).length} nos últimos 30 dias`, href: '#fe' }); });
  safe(() => OS.all('books').filter(b => b.status === 'A ler').slice(0, 2).forEach(b => add('pessoal', 2, `Ler 20 páginas de "${b.title}"`, { why: b.pages && b.curPage ? `vais na página ${b.curPage} de ${b.pages}` : 'livro que estás a ler', href: '#leituras' })));
  // 3 · este mês: a próxima etapa de cada meta, o ritmo necessário, projetos e avaliações
  goals.forEach(g => { const i = safe(() => Goal.info(g), null); if (!i) return; const c = byGoal(g), step = (g.steps || []).find(s => !s.done);
    if (step) add(c, 3, step.t, { why: 'etapa da meta "' + g.title + '"', goal: g.title, edit: 'goals:' + g.id });
    if (g.due && g.metric !== 'steps' && i.tgt != null && i.cur != null && i.p < 1) { const months = Math.max(1, U.diff(g.due, t) / 30.4), rest = Goal.lower(g) ? i.cur - i.tgt : i.tgt - i.cur;
      if (rest > 0) add(c, 3, `${g.title}: avançar ${Goal.fmt(g, rest / months)} este mês`, { why: `para chegar a ${Goal.fmt(g, i.tgt)} até ${U.fmtDS(g.due)}${i.behind ? ' · estás atrás do ritmo' : ''}`, tone: i.late || i.behind ? 'neg' : '', goal: g.title, edit: 'goals:' + g.id }); } });
  OS.all('projects').filter(x => x.status === 'Em andamento').slice(0, 8).forEach(x => { const nx = OS.Tasks.open().filter(k => k.project === x.id).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1)[0], g = OS.get('goals', x.goal);
    add(g ? byGoal(g) : ['Profissional', 'Empresarial'].includes(x.type) || x.area === 'Trabalho' ? 'carreira' : x.type === 'Académico' ? 'estudos' : 'pessoal', 3, nx ? `${x.name}: ${nx.title}` : `${x.name}: definir a próxima tarefa`, { why: 'projeto em andamento', edit: nx ? 'tasks:' + nx.id : 'projects:' + x.id }); });
  OS.all('assessments').filter(a => a.date > U.addDays(t, 7) && a.date <= U.addDays(t, 31) && a.prep !== 'Feito').forEach(a => add('estudos', 3, 'Começar a preparar ' + a.title, { why: (a.type || 'avaliação') + ' a ' + U.fmtDS(a.date), edit: 'assessments:' + a.id }));
  safe(() => { const m = Fin.month(ym), tg = (U.num(p.savingsTarget) || 20) / 100; if (m.inc > 0) { const want = m.inc * tg, have = m.inc - m.exp; if (have < want) add('dinheiro', 3, `Poupar mais ${U.eur(want - have, { dec: 0 })} este mês`, { why: `alvo de ${Math.round(tg * 100)}% das receitas`, tone: have < 0 ? 'neg' : '', href: '#financas' }); } });
  safe(() => OS.all('debts').filter(d => Fin.debtBal(d) > 0).slice(0, 2).forEach(d => add('dinheiro', 3, 'Abater a dívida ' + (d.name || d.title || ''), { why: 'falta ' + U.eur(Fin.debtBal(d), { dec: 0 }), edit: 'debts:' + d.id })));
  OS.all('milestones').filter(m => !m.done && m.date >= t && m.date <= U.addDays(t, 31)).forEach(m => add(byArea(m.area) || 'pessoal', 3, '◆ ' + m.title, { why: 'marco a ' + U.fmtDS(m.date), edit: 'milestones:' + m.id }));
  // 4 · este ano e 5 · longo prazo: as metas grandes e os marcos
  goals.forEach(g => { const i = safe(() => Goal.info(g), null); if (!i) return; const lv = ['3 anos', '5 anos', 'Longo prazo'].includes(g.horizon) ? 5 : 4;
    add(byGoal(g), lv, g.title, { why: `${Math.round(i.p * 100)}% feito${g.due ? ' · prazo ' + U.fmtDS(g.due) : ''} · ${i.st[0]}`, tone: i.late ? 'neg' : '', edit: 'goals:' + g.id, goal: g.title }); });
  OS.all('milestones').filter(m => !m.done && m.date > U.addDays(t, 31) && m.date <= U.addDays(t, 366)).forEach(m => add(byArea(m.area) || 'pessoal', 4, '◆ ' + m.title, { why: 'marco a ' + U.fmtDS(m.date), edit: 'milestones:' + m.id }));
  safe(() => { const tot = U.num(p.ectsTotal) || 180, done = OS.St.ectsDone(); if (done < tot) add('estudos', 5, `Terminar o curso: faltam ${tot - done} ECTS`, { why: `cerca de ${Math.ceil((tot - done) / 60)} ano(s) letivo(s)`, href: '#universidade' }); });
  // sugestões do Spyke (IA), guardadas
  (OS.one('lifeplan').steps || []).forEach(s => { if (out[s.cat] && s.t) add(s.cat, Math.min(5, Math.max(1, +s.lvl || 3)), s.t, { why: s.why || '', ai: 1 }); });
  Object.keys(out).forEach(c => out[c].sort((a, b) => a.lv - b.lv));
  return { out, urg }; };
OS.LifePlan = { build, CATS };

/* ---------- ecrã ---------- */
const ns = () => { const n = OS.one('northstar'); return [['Quem quero ser', n.identity], ['Daqui a 1 ano', n.h1y], ['Daqui a 3 anos', n.h3y], ['Daqui a 5 anos', n.h5y], ['A visão', n.hlong]].filter(x => String(x[1] || '').trim()); };
let busy = false;
const plano = () => { const { out, urg } = build(), lp = OS.one('lifeplan'), f = OS.ui.lpCat || '', star = ns(), order = CATS.slice().sort((a, b) => (urg[b[0]] - urg[a[0]]) || (out[b[0]].length - out[a[0]].length));
  const total = Object.values(out).reduce((s, l) => s + l.length, 0);
  const row = (s, c) => `<div class="lp-st lv${s.lv} ${s.tone || ''} ${s.ai ? 'ai' : ''}"><i class="lp-dot" aria-hidden="true"></i><div class="lp-tx ${s.edit || s.href ? 'click' : ''}" ${s.edit ? `data-edit="${s.edit}"` : s.href ? `data-go="${esc(s.href.slice(1))}"` : ''}><b>${s.ai ? '✦ ' : ''}${esc(s.t)}</b>${s.why ? `<small>${esc(s.why)}</small>` : ''}</div>
    <div class="lp-a">${s.act ? `<button class="btn xs" ${s.act}>${esc(s.actL || 'Feito')}</button>` : ''}${!s.edit && !s.act ? `<button class="btn xs ghost" data-act="lpTask" data-c="${c}" data-t="${esc(s.t)}" title="Transformar em tarefa">${UI.ic('plus')}Tarefa</button>` : ''}</div></div>`;
  const card = ([k, name, ic]) => { const L = out[k]; if (f && f !== k) return '';
    return `<section class="pn lp-c" data-cat="${k}"><div class="pn-h"><h3>${UI.ic(ic)}${name}</h3><span class="mut" style="font-size:12px">${L.length} passo${L.length === 1 ? '' : 's'}${urg[k] ? ` · <span class="neg">${urg[k]} urgente${urg[k] > 1 ? 's' : ''}</span>` : ''}</span></div>
      ${L.length ? [1, 2, 3, 4, 5].map(lv => { const S = L.filter(s => s.lv === lv); return S.length ? `<div class="lp-lv"><div class="lp-lh"><span>${lv}</span><b>${LV[lv][0]}</b><small>${LV[lv][1]}</small></div>${S.slice(0, lv === 1 ? 3 : 6).map(s => row(s, k)).join('')}</div>` : ''; }).join('')
        : `<p class="mut" style="margin:6px 0">Ainda não há nada para ${name.toLowerCase()}. Cria uma meta e a app desenha os passos.</p>`}
      <div class="row gap8" style="margin-top:8px">${UI.addBtn('goals', 'Meta em ' + name.toLowerCase(), { cat: (CATS.find(c => c[0] === k) || [])[3][0], horizon: '1 ano' }, 'ghost sm')}</div></section>`; };
  return `${star.length ? `<div class="pn lp-star"><div class="eyebrow">A tua estrela-guia</div>${star.map(([l, v]) => `<div class="lp-sv"><small>${l}</small><b>${esc(v)}</b></div>`).join('')}<a class="more" href="#next.estrela">Editar ${UI.ic('right')}</a></div>`
      : `<div class="pn lp-star"><b>Define a tua estrela-guia</b><p class="mut" style="margin:4px 0 8px">Quem queres ser e onde queres estar daqui a 1, 3 e 5 anos. Os passos ficam alinhados com isso.</p><a class="btn sm pri" href="#next.estrela">Definir agora</a></div>`}
    <div class="pn lp-ai"><div class="row between gap8" style="flex-wrap:wrap"><div><b>Plano do Spyke</b><small class="mut" style="display:block">${lp.at ? 'Feito ' + U.rel(U.iso(new Date(lp.at))) + '. ' : ''}O Spyke lê toda a tua vida na app (metas, estudos, dinheiro, corpo, carreira) e sugere os passos que faltam, do pequeno ao grande.</small></div><button class="btn sm pri" data-act="lpAI" ${busy ? 'disabled' : ''}>${busy ? 'A pensar…' : lp.at ? 'Atualizar plano' : 'Pedir plano ao Spyke'}</button></div>${lp.foco ? `<p class="lp-foco">${esc(lp.foco)}</p>` : ''}</div>
    <div class="row gap8" style="flex-wrap:wrap;margin:4px 0 12px">${UI.chip('Todas · ' + total, 'lpCat', !f, 'data-v=""')}${order.map(([k, n]) => UI.chip(n + ' · ' + out[k].length, 'lpCat', f === k, `data-v="${k}"`)).join('')}</div>
    <div class="lp-g">${order.map(card).join('')}</div>`; };
// uma só página: os próximos passos, o "agora", a estrela-guia e o roteiro da vida
const estrela = V.northstar, roteiro = V.roadmap, strip = h => String(h || '').replace(/^\s*<header class="phead">[\s\S]*?<\/header>/, '');
const TB = [['', 'Próximos passos'], ['agora', 'Agora'], ['estrela', 'Estrela-guia'], ['roteiro', 'Roteiro']];
V.next = sub => { const k = TB.some(t => t[0] === sub) ? sub : '';
  const acts = k === 'roteiro' ? `${UI.addBtn('milestones', 'Marco')}${UI.addBtn('goals', 'Objetivo', null, '')}` : k === 'estrela' ? UI.addBtn('goals', 'Meta') : '';
  const head = UI.head('Plano de vida', 'Para onde vais (estrela-guia), quando (roteiro) e o que fazer a seguir (os passos, do mais pequeno ao maior), ligado às tuas metas e a tudo o que registas na app.', acts, 'Direção') + UI.tabs('next', TB, k);
  if (k === 'agora') return head + strip(agora ? agora(sub) : '');
  if (k === 'estrela') return head + strip(estrela ? estrela() : '');
  if (k === 'roteiro') return head + strip(roteiro ? roteiro() : '');
  return head + plano(); };
A.lpCat = b => OS.setUI('lpCat', b.dataset.v);
A.lpTask = b => { const c = CATS.find(x => x[0] === b.dataset.c) || CATS[4]; OS.add('tasks', { title: b.dataset.t, status: 'Próxima', area: c[4][0] }); UI.toast('Tarefa criada', 'pos'); };
// plano pela IA (Google; se não der, a IA grátis de reserva)
const ctx = () => { const { out } = build(), n = OS.one('northstar'), p = OS.one('profile');
  return JSON.stringify({ hoje: U.today(), estrela: { identidade: n.identity, ano1: n.h1y, anos3: n.h3y, anos5: n.h5y, visao: n.hlong, valores: n.values },
    metas: OS.all('goals').filter(g => g.status === 'Ativa').slice(0, 25).map(g => { const i = safe(() => Goal.info(g), {}); return { titulo: g.title, area: byGoal(g), horizonte: g.horizon, prazo: g.due, progresso: Math.round((i.p || 0) * 100) + '%', etapas_por_fazer: (g.steps || []).filter(s => !s.done).map(s => s.t).slice(0, 6), porque: g.why }; }),
    passos_atuais: Object.fromEntries(Object.entries(out).map(([k, L]) => [k, L.filter(s => !s.ai).slice(0, 10).map(s => ({ nivel: s.lv, passo: s.t }))])),
    perfil: { curso: p.course || p.uni, trabalho: p.employer, cidade: 'Aveiro' } }).slice(0, 12000); };
A.lpAI = async () => { if (busy) return; busy = true; OS.request();
  try { const o = await OS.AI.json([{ text: `És o Spyke, o mentor pessoal ${OS.whoCtx('do Ryan (brasileiro, vive em Aveiro, estuda, trabalha e investe)', 'de')}. Com base nos dados reais abaixo, cria o plano de próximos passos da vida dele para alcançar as metas e a estrela-guia.
Regras: para cada área (estudos, dinheiro, corpo, carreira, pessoal) dá 3 a 6 passos NOVOS (não repitas os "passos_atuais"), do mais pequeno ao maior, concretos e acionáveis, em português de Portugal. Nível: 1 = hoje (pequeno), 2 = esta semana, 3 = este mês, 4 = este ano, 5 = longo prazo. Se uma área não tiver metas, sugere passos para começar.
Responde APENAS JSON: {"foco":"1 frase: o que mais importa agora","passos":[{"area":"estudos|dinheiro|corpo|carreira|pessoal","nivel":1,"passo":"…","porque":"ligação à meta ou à visão (curto)"}]}
DADOS: ${ctx()}` }], .4);
    const steps = (o.passos || []).filter(s => s && s.passo && CATS.some(c => c[0] === s.area)).slice(0, 40).map(s => ({ cat: s.area, lvl: Math.min(5, Math.max(1, +s.nivel || 3)), t: String(s.passo).slice(0, 160), why: String(s.porque || '').slice(0, 160) }));
    if (!steps.length) throw new Error('a IA não devolveu passos');
    OS.setOne('lifeplan', { at: Date.now(), foco: String(o.foco || '').slice(0, 220), steps }); UI.toast('Plano atualizado pelo Spyke', 'pos'); }
  catch (e) { UI.toast('Não consegui fazer o plano agora: ' + (e.message || 'erro'), 'warn'); }
  busy = false; OS.request(); };
})();
