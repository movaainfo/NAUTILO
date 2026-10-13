/* OCEANUM — Painel (antes Visão Geral + Painel, agora uma só página): o painel inicial. Período (hoje, semana, mês) e cartões da vida inteira:
   dinheiro, agenda, tarefas, corpo, dieta, estudos e jogo. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, C = OS.C, V = OS.views, A = OS.act, L = OS.L, esc = U.esc;
const Fin = OS.Fin, Cal = OS.Cal;
const safe = (f, d) => { try { return f(); } catch (e) { return d; } };
const greet = () => { const h = new Date().getHours(); return h < 6 ? 'Boa madrugada' : h < 13 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite'; };
const range = () => { const per = OS.ui.dashPer || 'mes', t = U.today(), ym = OS.ui.dashYM || U.ym(t);
  if (per === 'hoje') return { per, a: t, b: t, label: 'Hoje', ym };
  if (per === 'semana') { const w = U.monday(t); return { per, a: w, b: U.addDays(w, 6), label: `${U.fmtDS(w)} – ${U.fmtDS(U.addDays(w, 6))}`, ym }; }
  const a = ym + '-01', b = U.addDays(U.addMonths(ym, 1) + '-01', -1); return { per, a, b, label: U.MES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4), ym }; };
const card = (title, body, o = {}) => `<div class="dc ${o.cls || ''}" ${o.style ? `style="${o.style}"` : ''}><div class="dc-h"><h3>${title}</h3>${o.act || ''}</div>${body}</div>`;
const more = (href, l = 'Ver tudo') => `<a class="dc-more" href="#${href}">${l} ${UI.ic('right')}</a>`;

V.visao = () => {
  const R = range(), t = U.today(), p = OS.one('profile'), days = U.range(R.a, R.b > t ? (R.a > t ? R.a : t) : R.b);
  const tx = Fin.tx(R.a, R.b), inc = U.sum(tx.filter(x => x.type === 'Receita'), x => x.amount), exp = U.sum(tx.filter(x => x.type === 'Despesa'), x => x.amount), net = inc - exp;
  const cum = []; let acc = 0; days.forEach(d => { const dx = tx.filter(x => x.date === d); acc += U.sum(dx.filter(x => x.type === 'Receita'), x => x.amount) - U.sum(dx.filter(x => x.type === 'Despesa'), x => x.amount); cum.push(U.r2(acc)); });
  const cats = Fin.byCat(R.a, R.b), bank = safe(() => Fin.cashTotal(), 0), liq = safe(() => Fin.liquid(), 0), nw = safe(() => Fin.netWorth(), 0);
  const dIn = days.map(d => U.sum(tx.filter(x => x.date === d && x.type === 'Receita'), x => x.amount)), dOut = days.map(d => U.sum(tx.filter(x => x.date === d && x.type === 'Despesa'), x => x.amount));
  const cards = Fin.accounts().filter(a => a.type === 'Cartão de crédito').map(a => ({ l: a.name, v: U.sum(tx.filter(x => x.type === 'Despesa' && x.account === a.id), x => x.amount) })).filter(x => x.v > 0);
    const tasks = OS.Tasks.open().filter(x => (x.sched && x.sched <= t) || (x.due && x.due <= U.addDays(t, 1)) || x.status === 'Em curso').slice(0, 5), doneP = OS.all('tasks').filter(x => x.doneAt && x.doneAt >= R.a && x.doneAt <= R.b).length;
  const wk = OS.all('workouts').filter(w => w.date >= R.a && w.date <= R.b).length, km = OS.Run.kmIn(R.a, R.b), diet = safe(() => OS.Diet.day(t), { kcal: 0, p: 0 }), dg = OS.one('diet');
  const studyH = U.sum(OS.all('sessions').filter(s => s.date >= R.a && s.date <= R.b), s => s.minutes) / 60, habit = safe(() => OS.Hab.dayScore(t), 0);
  const dom = OS.one('dominus'), lvl = safe(() => OS.Dom.sumLv(), 0), rank = (OS.Dom.RANKS || [])[dom.rank || 0] || '';
  const per = [['hoje', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês']];
  // trabalho: turnos, horas, ganhos, folgas e projetos (do período escolhido)
  const W = safe(() => { const Car = OS.Car, S = OS.all('shifts'), inP = S.filter(s => s.date >= R.a && s.date <= R.b), wk0 = U.monday(t), offs = OS.all('dayoffs'), isW = x => ['Profissional', 'Empresarial'].includes(x.type) || x.area === 'Trabalho';
    const nx = U.sortBy(S.filter(s => s.date > t || (s.date === t && (s.end || '99') > U.hm())), s => s.date + s.start)[0], off = U.sortBy(offs.filter(o => o.date >= t), o => o.date)[0];
    const now = new Date(); return { h: U.sum(inP, s => Car.workedHours(s, now)), pay: U.sum(inP, s => Car.workedPay(s, now)), n: inP.length, nx, off, offP: offs.filter(o => o.date >= R.a && o.date <= R.b).length, rate: Fin.hourly ? Fin.hourly() : 0,
      tasks: OS.Tasks.open().filter(x => (x.ctx || []).includes('@Trabalho') || x.area === 'Trabalho').length, proj: OS.all('projects').filter(x => isW(x) && !['Concluído', 'Cancelado'].includes(x.status)).length,
      week: U.range(wk0, U.addDays(wk0, 6)).map(d => ({ d, sh: S.some(s => s.date === d), off: offs.some(o => o.date === d) })) }; }, null);
  const work = W ? card('Trabalho', `<div class="dc-tiles"><a href="#trabalho"><b class="mono">${U.nf(W.h, 1)}</b><span>horas trabalhadas ${R.per === 'hoje' ? 'hoje' : R.per === 'semana' ? 'na semana' : 'no mês'}</span></a><a href="#trabalho"><b class="mono">${U.eur(W.pay, { dec: 0 })}</b><span>ganhos até agora</span></a><a href="#trabalho.horario"><b class="mono">${W.n}</b><span>turnos</span></a><a href="#trabalho.horario"><b class="mono">${W.offP}</b><span>folgas</span></a></div>
      <div class="dc-wk">${W.week.map(x => `<span class="${x.sh ? 'sh' : x.off ? 'off' : ''} ${x.d === t ? 'today' : ''}" title="${U.fmtDS(x.d)}">${U.WDS[U.parse(x.d).getDay()].slice(0, 1)}</span>`).join('')}</div>
      <div class="dc-rows"><div><span>Próximo turno</span><b>${W.nx ? (W.nx.date === t ? 'hoje' : U.rel(W.nx.date)) + ' ' + esc(W.nx.start || '') + (W.nx.place ? ' · ' + esc(W.nx.place) : '') : '—'}</b></div><div><span>Próxima folga</span><b>${W.off ? (W.off.date === t ? 'hoje' : U.fmtDS(W.off.date)) : '—'}</b></div><div><span>Tarefas · projetos de trabalho</span><b class="mono">${W.tasks} · ${W.proj}</b></div>${W.rate ? `<div><span>Valor por hora</span><b class="mono">${U.eur(W.rate)}</b></div>` : ''}</div>`, { cls: 'span4', act: more('trabalho', 'Trabalho') }) : '';
  const P = safe(() => OS.PainelParts(), null), part = k => (P && P[k]) || '';
  return `<div class="dash">
  <div class="dash-top"><div><div class="eyebrow">${U.longDate(t)}</div><h1>${greet()}, ${esc(p.short || 'Ryan')}</h1>${part('summary').replace('<p>', '<p class="dash-sum">')}</div>
    <div class="dash-ctl">${R.per === 'mes' ? `<div class="dash-month"><button class="icon-btn" data-act="dashYM" data-d="-1" aria-label="Mês anterior">${UI.ic('left')}</button><b>${R.label}</b><button class="icon-btn" data-act="dashYM" data-d="1" aria-label="Mês seguinte" ${R.ym >= U.ym(t) ? 'disabled' : ''}>${UI.ic('right')}</button></div>` : `<div class="dash-month"><b>${R.label}</b></div>`}
      <div class="dash-seg" role="group">${per.map(([k, l]) => `<button class="${R.per === k ? 'on' : ''}" data-act="dashPer" data-p="${k}">${l}</button>`).join('')}</div></div></div>
  ${part('life')}
  ${part('control')}
  ${part('next')}
  <div class="dash-grid">
    ${card('Saldo do período', `<div class="dc-big ${net < 0 ? 'neg' : ''}">${U.eur(net)}</div><div class="dc-sub">receitas ${U.eur(inc, { dec: 0 })} · despesas ${U.eur(exp, { dec: 0 })}</div>${UI.spark(cum.length > 1 ? cum : [0, 0], '#7FE3F5', 300, 54)}`, { cls: 'hero h-abyss span4' })}
    ${card('Categorias', C.mount({ type: 'donut', data: cats.slice(0, 6), label: 'Gastos por categoria', centerSub: 'gastos', max: 5, empty: 'Sem despesas neste período.' }, 170), { cls: 'span4', act: more('financas', 'Finanças') })}
    ${card('Fluxo de caixa', `<div class="dc-mid ${acc < 0 ? 'neg' : ''}">${U.eur(acc)}</div>${C.mount({ type: 'line', labels: days.map(d => U.fmtDS(d)), series: [{ name: 'Saldo acumulado', data: cum, color: '#38BDF8' }], fmt: U.eurK, min0: false, empty: 'Sem movimentos.' }, 150)}`, { cls: 'span4' })}
    ${card('Saldo bancário total', `<div class="dc-big">${U.eur(bank)}</div><div class="dc-rows"><div><span>Disponível</span><b class="mono">${U.eur(liq, { dec: 0 })}</b></div><div><span>Patrimônio</span><b class="mono">${U.eur(nw, { dec: 0 })}</b></div></div><div class="dc-acts"><button class="btn sm" data-new="transactions" data-defs='{"type":"Receita"}'>${UI.ic('plus')}Receita</button><button class="btn sm" data-new="transactions" data-defs='{"type":"Despesa"}'>${UI.ic('plus')}Despesa</button></div>`, { cls: 'hero h-tide span4', act: more('financas.contas', 'Contas') })}
    ${card('Movimentação diária', C.mount({ type: 'bar', labels: days.map(d => U.fmtDS(d)), series: [{ name: 'Entradas', data: dIn, color: '#2DD4BF' }, { name: 'Saídas', data: dOut, color: '#3B82F6' }], fmt: U.eurK, empty: 'Sem movimentos neste período.' }, 190), { cls: 'span8' })}
    ${card('Tarefas', `<div class="dc-kp"><b class="mono">${OS.Tasks.open().length}</b><span>abertas</span><b class="mono">${doneP}</b><span>feitas no período</span></div>${tasks.map(x => `<div class="dc-li" data-edit="tasks:${x.id}"><input type="checkbox" class="cbx round" data-act="taskToggle" data-id="${x.id}" aria-label="Concluir ${esc(x.title)}"><b>${esc(x.title)}</b></div>`).join('') || '<p class="dc-empty">Nada para hoje.</p>'}`, { cls: 'span4', act: more('tarefas') })}
    ${card('Corpo', `<div class="dc-tiles"><a href="#treino"><b class="mono">${wk}</b><span>treinos</span></a><a href="#corrida"><b class="mono">${U.nf(km, 1)}</b><span>km</span></a><a href="#dieta"><b class="mono">${U.nf(diet.kcal, 0)}</b><span>kcal hoje</span></a><a href="#dieta"><b class="mono">${U.nf(diet.p, 0)}<small>/${U.num(dg.p) || '—'}</small></b><span>proteína</span></a></div>`, { cls: 'hero h-reef span4', act: more('treino', 'Treino') })}
    ${work}
    ${card('Hábitos de hoje', `<div class="dc-big">${Math.round(habit * 100)}%</div><div class="dc-bar"><i style="width:${Math.round(habit * 100)}%"></i></div><div class="dc-sub">inegociáveis cumpridos</div>`, { cls: 'span4', act: more('habitos') })}
    ${card('Dominus', `<div class="dc-big">Nível ${lvl}</div><div class="dc-sub">${esc(rank)}${dom.started ? '' : ' · ainda não começaste'}</div>`, { cls: 'hero h-deep span4', act: more('dominus', 'Jogar') })}
    ${cards.length ? card('Gastos por cartão', cards.map(c => `<div class="dc-li"><b>${esc(c.l)}</b><span class="mono">${U.eur(c.v)}</span></div>`).join(''), { cls: 'span4' }) : ''}
  </div>
  ${part('money')}
  ${part('study')}
  ${part('goals')}
  ${part('trends')}</div>`;
};

/* ================= GASTO RÁPIDO: o "widget" do telemóvel ================= */
const topCats = () => { const c = {}; OS.all('transactions').filter(t => t.type === 'Despesa').slice(-200).forEach(t => { if (t.cat) c[t.cat] = (c[t.cat] || 0) + 1; }); const all = Object.keys(OS.one('fin').cats.Despesa || {}); return [...new Set(Object.entries(c).sort((a, b) => b[1] - a[1]).map(x => x[0]).concat(all))].slice(0, 10); };
const qs = () => OS.ui.qg || {};
V.gasto = sub => { const pre = U.num(String(sub || '').replace(',', '.')) || '', q = qs(), cats = topCats(), accs = Fin.accounts(), acc = q.acc || (OS.all('transactions').filter(t => t.type === 'Despesa').slice(-1)[0] || {}).account || (accs[0] || {}).id;
  const today = U.today(), spent = U.sum(Fin.tx(today, today, { type: 'Despesa' }), t => t.amount), last = OS.all('transactions').filter(t => t.type === 'Despesa').slice(-3).reverse(), start = U.ls.get('os2startGasto', false);
  return `<div class="qg"><div class="qg-h"><span class="eyebrow">Gasto rápido</span><span class="mut">hoje: ${U.eur(spent)}</span></div>
  <form class="qg-f" data-form="qgSave" autocomplete="off">
    <label class="qg-amt"><span>€</span><input name="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0,00" aria-label="Valor" value="${pre}" required autofocus></label>
    <input class="field qg-desc" name="desc" placeholder="O que compraste? (opcional)" list="qg_dl" aria-label="Descrição"><datalist id="qg_dl">${[...new Set(OS.all('transactions').map(t => t.desc).filter(Boolean))].slice(-40).map(d => `<option value="${esc(d)}">`).join('')}</datalist>
    <div class="qg-l">Categoria</div><div class="qg-chips">${cats.map((c, i) => `<label><input type="radio" name="cat" value="${esc(c)}" ${(q.cat ? q.cat === c : i === 0) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div>
    <div class="qg-l">Pago com</div><div class="qg-chips">${accs.map(a => `<label><input type="radio" name="acc" value="${a.id}" ${a.id === acc ? 'checked' : ''}><span>${(() => { const b = L.bank(a.inst); return b ? `<i class="bk-dot" style="background:${b[1]}" aria-hidden="true"></i>` : ''; })()}${esc(L.accLabel(a))}</span></label>`).join('') || `<small class="mut" style="display:block;margin-bottom:6px">Ainda não tens contas: toca no teu banco para a criar.</small><div class="bk-chips">${L.BANKS.slice(0, 16).map(([n, c, cur]) => `<button type="button" class="chip" data-new="accounts" data-defs='${esc(JSON.stringify({ inst: n, name: 'Conta à ordem', type: 'Conta à ordem', currency: cur }))}'><i class="bk-dot" style="background:${c}" aria-hidden="true"></i>${esc(n)}</button>`).join('')}</div>`}</div>
    <div class="qg-row"><label class="qg-tg"><input type="checkbox" name="sup"> Supérfluo</label><input class="field" type="date" name="date" value="${today}" aria-label="Data"></div>
    <button class="btn pri qg-go" ${accs.length ? '' : 'disabled'}>${UI.ic('plus')}Registar gasto</button></form>
  ${last.length ? `<div class="qg-last"><div class="qg-l">Últimos</div>${last.map(t => `<div class="li" data-edit="transactions:${t.id}" style="cursor:pointer"><div class="li-t"><b>${esc(t.desc || t.cat || 'Despesa')}</b><small>${U.fmtDS(t.date)} · ${esc(t.cat || '')}</small></div><span class="mono">${U.eur(t.amount)}</span></div>`).join('')}</div>` : ''}
</div>`; };
// Definições → Atalhos do iPhone: abrir sempre no Gasto rápido e registar sem abrir a app (o Gasto rápido só regista)
OS.quickSettings = () => { const start = !!U.ls.get('os2startGasto', false);
  return `<div class="pn" id="qgSet"><div class="pn-h"><h3>Gasto rápido</h3></div>
    <label class="switch"><input type="checkbox" data-act="qgStart" ${start ? 'checked' : ''}><span></span>Abrir o Oceanum sempre no Gasto rápido neste aparelho</label>
    <div class="list" style="margin-top:10px"><div class="li"><div class="li-t"><b>iPhone: registar sem abrir a app</b><small>Um atalho no Centro de Controlo pede o valor e a descrição e grava direto. Os gastos entram sozinhos.</small></div><div class="li-r"><a class="btn sm pri" href="#definicoes" data-act="ibGo">${UI.ic('bolt')}Configurar o atalho</a></div></div>
    <div class="li"><div class="li-t"><b>Android</b><small>No Chrome: menu ⋮ → <i>Adicionar ao ecrã principal</i>. Com a opção acima ligada, o ícone abre logo no Gasto rápido.</small></div></div></div></div>`; };
OS.forms = OS.forms || {};
OS.forms.qgSave = (f, v) => { const amount = U.num(v('amount')); if (!(amount > 0)) { UI.toast('Escreve o valor', 'warn'); return; }
  const cat = (f.querySelector('input[name=cat]:checked') || {}).value || '', account = (f.querySelector('input[name=acc]:checked') || {}).value || '';
  if (!account) { UI.toast('Escolhe a conta', 'warn'); return; }
  const r = OS.add('transactions', { type: 'Despesa', amount, date: v('date') || U.today(), desc: v('desc'), cat, account, method: (OS.get('accounts', account) || {}).type === 'Cartão de crédito' ? 'Crédito' : 'Débito', ess: f.elements.sup.checked ? 'Supérfluo' : 'Essencial', tags: [] });
  try { OS.S.transactions.after && OS.S.transactions.after(r, true); } catch (e) { console.error(e); }
  OS.ui.qg = { cat, acc: account }; U.ls.set('os2ui', OS.ui);
  UI.toast(`Registado: ${U.eur(amount)}${cat ? ' · ' + cat : ''}`, 'pos'); try { navigator.vibrate && navigator.vibrate(30); } catch (e) { } };
A.qgCopy = () => { const url = (() => { try { return window.top.location.href.split('#')[0]; } catch (e) { return ''; } })() || document.referrer || 'https://claude.ai/artifact/AUtUtqFR4x46BWPVcR3kLZ'; const ok = () => UI.toast('Link copiado', 'pos'); try { navigator.clipboard.writeText(url).then(ok, () => UI.toast(url)); } catch (e) { UI.toast(url); } };
A.ibGo = (b, e) => { e && e.preventDefault(); OS.go('definicoes'); setTimeout(() => { const el = document.getElementById('inboxPn'); el && el.scrollIntoView({ behavior: 'smooth' }); }, 250); };
A.qgStart = b => { U.ls.set('os2startGasto', !!b.checked); UI.toast(b.checked ? 'O Oceanum vai abrir no Gasto rápido' : 'Abre normalmente no Painel'); };
A.dashPer = b => OS.setUI('dashPer', b.dataset.p);
A.dashYM = b => { const cur = OS.ui.dashYM || U.ym(U.today()), n = U.addMonths(cur, +b.dataset.d); OS.setUI('dashYM', n > U.ym(U.today()) ? U.ym(U.today()) : n); };
})();
