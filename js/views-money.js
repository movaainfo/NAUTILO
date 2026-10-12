/* OCEANUM — Dinheiro: Finanças, Inteligência financeira, Investimentos, Compras por impulso, Simuladores. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, C = OS.C, V = OS.views, L = OS.L, esc = U.esc;
const Fin = OS.Fin, Inv = OS.Inv, I = OS.Intel, A = OS.act;
const accN = id => { const a = OS.get('accounts', id); return a ? L.accLabel(a) : '—'; };
// ponto com a cor do banco (Revolut azul, Santander vermelho, Nubank roxo…)
const bankDot = a => { const b = a && L.bank(a.inst); return b ? `<i class="bk-dot" style="background:${b[1]}" aria-hidden="true"></i>` : ''; };
const money = (v, tone = true) => `<span class="mono ${tone ? (v > 0 ? 'pos' : v < 0 ? '' : 'mut') : ''}">${U.eur(v, { sign: tone })}</span>`;
const txSign = t => t.type === 'Receita' ? U.num(t.amount) : t.type === 'Despesa' ? -U.num(t.amount) : 0;
const TABS = [['', 'Visão'], ['transacoes', 'Transações'], ['contas', 'Contas'], ['orcamento', 'Orçamento'], ['recorrentes', 'Recorrentes'], ['dividas', 'Dívidas'], ['inteligencia', 'Inteligência'], ['categorias', 'Categorias']];
const periodRange = p => { const t = U.today(), ym = U.ym(t); switch (p) { case 'mesant': { const m = U.addMonths(ym, -1); return [m + '-01', m + '-' + U.dim(m)]; } case '3m': return [U.addMonths(ym, -2) + '-01', t]; case '12m': return [U.addMonths(ym, -11) + '-01', t]; case 'ano': return [t.slice(0, 4) + '-01-01', t]; case 'tudo': return ['0000-01-01', '9999-12-31']; case 'custom': return [OS.ui.txFrom || ym + '-01', OS.ui.txTo || t]; default: return [ym + '-01', ym + '-' + U.dim(ym)]; } };
const PERIODS = [['mes', 'Este mês'], ['mesant', 'Mês anterior'], ['3m', '3 meses'], ['12m', '12 meses'], ['ano', 'Este ano'], ['tudo', 'Tudo'], ['custom', 'Personalizado']];

/* ================= FINANÇAS ================= */
V.financas = sub => {
  const head = UI.head('Finanças', 'Receitas, despesas, contas, cartões, parcelamentos, dívidas, orçamentos e reservas. Tudo o que registas alimenta metas, alertas e o patrimônio.', `${UI.addBtn('transactions', 'Movimento')}`, 'Dinheiro') + UI.tabs('financas', TABS, sub);
  if (!OS.all('accounts').length && sub !== 'contas') return head + UI.empty('Começa por criar as tuas contas (conta à ordem, reserva, cartão, corretora).', UI.addBtn('accounts', 'Criar conta'));
  return head + (FIN[sub || 'visao'] || FIN.visao)();
};
const FIN = {};
FIN.visao = () => {
  const t = U.today(), ym = U.ym(t), p = OS.one('profile'), m = Fin.month(ym), pm = Fin.month(U.addMonths(ym, -1));
  const months = Fin.months(12), md = months.map(Fin.month);
  const per = OS.ui.fvPer || 'mes', [a, b] = periodRange(per);
  const cats = Fin.byCat(a, b);
  const nws = Fin.nwSeries(); const liq = Fin.liquid(), res = Fin.reserve(), inv = Inv.value(), card = Fin.cardDebt(), debt = Fin.debtsTotal(), nw = Fin.netWorth();
  const dist = [...Fin.accounts().filter(x => x.type !== 'Cartão de crédito').map(x => ({ l: x.name, v: Math.max(0, Fin.accBal(x)) })), ...Inv.byKey('cls').map(x => ({ l: 'Invest. · ' + x.l, v: x.v }))].filter(x => x.v > 0);
  const upc = Fin.upcoming(30), upOut = upc.filter(x => x.amount < 0);
  const prev3 = [1, 2, 3].map(i => U.addMonths(ym, -i));
  const catRows = [...new Set([...Fin.byCat(prev3[2] + '-01', t).map(x => x.l)])].map(c => ({ c, cur: Fin.spentCat(c, ym), m: prev3.map(x => Fin.spentCat(c, x)) })).map(r => Object.assign(r, { avg: U.avg(r.m.filter((v, i) => Fin.month(prev3[i]).n)) || 0 })).sort((x, y) => y.cur - x.cur);
  return `<div class="kpis">${UI.kpi('Saldo disponível', U.eur(liq), 'contas à ordem, poupança, dinheiro', { href: 'financas.contas' })}${UI.kpi('Reserva', U.eur(res), p.emergencyTarget ? U.pct(res / p.emergencyTarget) + ' de ' + U.eur(p.emergencyTarget, { dec: 0 }) : '')}${UI.kpi('Receitas', U.eur(m.inc), UI.trend(m.inc, pm.inc) + ' vs ' + U.fmtYM(pm.ym))}${UI.kpi('Despesas', U.eur(m.exp), UI.trend(m.exp, pm.exp, false) + ' vs ' + U.fmtYM(pm.ym))}${UI.kpi('Taxa de poupança', m.inc ? U.pct(m.rate) : '—', 'alvo ' + (p.savingsTarget || 20) + '% · investimento ' + (m.inc ? U.pct(m.investRate) : '—'), { tone: m.inc ? (m.rate * 100 >= (p.savingsTarget || 20) ? 'pos' : m.rate < 0 ? 'neg' : 'warn') : '' })}${UI.kpi('Patrimônio líquido', U.eur(nw, { dec: 0 }), `investido ${U.eurK(inv)} · dívidas ${U.eurK(debt + card)}`, { tone: nw < 0 ? 'neg' : '' })}</div>
  <div class="g g-main">
    <div class="pn"><div class="pn-h"><h3>Receitas × despesas</h3><span class="mut" style="font-size:12px">12 meses</span></div>${C.mount({ type: 'bar', labels: months.map(U.fmtYM), series: [{ name: 'Receitas', data: md.map(x => x.inc), color: 'var(--pos)' }, { name: 'Despesas', data: md.map(x => x.exp), color: 'var(--c2)' }], fmt: U.eurK }, 220)}</div>
    <div class="pn"><div class="pn-h"><h3>Fluxo de caixa mensal</h3></div>${C.mount({ type: 'bar', labels: months.map(U.fmtYM), series: [{ name: 'Saldo do mês', data: md.map(x => x.n ? x.net : null), color: v => v >= 0 ? 'var(--pos)' : 'var(--neg)' }], fmt: U.eurK }, 220)}</div>
  </div>
  <div class="g g2">
    <div class="pn"><div class="pn-h"><h3>Gastos por categoria</h3>${UI.seg('fvPer', [['mes', 'Mês'], ['3m', '3M'], ['12m', '12M']], per)}</div>${C.mount({ type: 'donut', data: cats, label: 'Gastos por categoria', centerSub: 'despesas' }, 200)}</div>
    <div class="pn"><div class="pn-h"><h3>Distribuição do patrimônio</h3><span class="mut" style="font-size:12px">${debt + card ? 'dívidas: ' + U.eur(debt + card, { dec: 0 }) : ''}</span></div>${C.mount({ type: 'donut', data: dist, label: 'Patrimônio', centerSub: 'ativos' }, 200)}</div>
  </div>
  <div class="g g-main">
    <div class="pn"><div class="pn-h"><h3>Patrimônio líquido</h3><span class="mut" style="font-size:12px">um retrato por mês, guardado automaticamente</span></div>${C.mount({ type: 'line', labels: nws.map(s => U.fmtYM(s.ym)), series: [{ name: 'Patrimônio líquido', data: nws.map(s => s.nw) }, { name: 'Investido', data: nws.map(s => s.inv), color: 'var(--c2)', dash: 1 }], fmt: U.eurK, min0: false, empty: 'O primeiro retrato mensal fica guardado hoje. A curva cresce mês a mês.' }, 220)}</div>
    <div class="pn"><div class="pn-h"><h3>Compromissos futuros · 30 dias</h3><span class="mono neg">${U.eur(U.sum(upOut, x => x.amount))}</span></div>${upc.length ? `<div class="list">${upc.slice(0, 8).map(x => `<div class="li"><span class="when">${U.fmtDS(x.date)}</span><div class="li-t"><b>${esc(x.title)}</b><small>${x.kind}${x.late ? ' · <span class="neg">em atraso</span>' : ''}</small></div>${money(x.amount)}</div>`).join('')}</div>` : UI.empty('Sem contas, parcelas ou prestações previstas.')}</div>
  </div>
  <div class="pn"><div class="pn-h"><h3>Comparação mensal por categoria</h3><span class="mut" style="font-size:12px">este mês vs 3 meses anteriores</span></div>${catRows.length ? `<div style="overflow-x:auto"><table class="cmp"><thead><tr><th>Categoria</th>${prev3.slice().reverse().map(x => `<th>${U.fmtYM(x)}</th>`).join('')}<th>Média</th><th>${U.fmtYM(ym)}</th><th>vs média</th></tr></thead><tbody>${catRows.map(r => `<tr><td>${esc(r.c)}</td>${r.m.slice().reverse().map(v => `<td class="mono">${v ? U.eur(v, { dec: 0 }) : '—'}</td>`).join('')}<td class="mono mut">${r.avg ? U.eur(r.avg, { dec: 0 }) : '—'}</td><td class="mono">${U.eur(r.cur, { dec: 0 })}</td><td>${r.avg ? UI.trend(r.cur, r.avg, false) : '—'}</td></tr>`).join('')}</tbody></table></div>` : UI.empty('Regista despesas para comparar meses.')}</div>`;
};
FIN.transacoes = () => {
  const f = OS.ui.txf || {}, per = f.per || 'mes', [a, b] = periodRange(per);
  const txs = U.sortBy(Fin.tx(a, b, { type: f.type, cat: f.cat, account: f.account, method: f.method, tag: f.tag, q: f.q }), x => x.date + x._c, -1);
  const inc = U.sum(txs.filter(x => x.type === 'Receita'), x => x.amount), exp = U.sum(txs.filter(x => x.type === 'Despesa'), x => x.amount);
  const tags = [...new Set(OS.all('transactions').flatMap(x => x.tags || []))];
  const days = U.range(a < '2000' ? U.addDays(U.today(), -90) : a, b > U.today() ? U.today() : b); const byDay = U.groupBy(txs.filter(x => x.type === 'Despesa'), x => x.date);
  const allCats = [...new Set([...Object.keys(Fin.cats('Despesa')), ...Object.keys(Fin.cats('Receita'))])];
  return `<div class="filters">
    <select data-uif="txf.per" aria-label="Período">${PERIODS.map(([k, l]) => `<option value="${k}"${per === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
    ${per === 'custom' ? `<input type="date" value="${a}" data-uiv="txFrom" aria-label="De"><input type="date" value="${b}" data-uiv="txTo" aria-label="Até">` : ''}
    <select data-uif="txf.type" aria-label="Tipo"><option value="">Todos os tipos</option>${['Despesa', 'Receita', 'Transferência'].map(x => `<option${f.type === x ? ' selected' : ''}>${x}</option>`).join('')}</select>
    <select data-uif="txf.cat" aria-label="Categoria"><option value="">Todas as categorias</option>${allCats.map(x => `<option${f.cat === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>
    <select data-uif="txf.account" aria-label="Conta"><option value="">Todas as contas</option>${OS.all('accounts').map(x => `<option value="${x.id}"${f.account === x.id ? ' selected' : ''}>${esc(L.accLabel(x))}</option>`).join('')}</select>
    <select data-uif="txf.method" aria-label="Forma de pagamento"><option value="">Todas as formas</option>${L.METHOD.map(x => `<option${f.method === x ? ' selected' : ''}>${x}</option>`).join('')}</select>
    ${tags.length ? `<select data-uif="txf.tag" aria-label="Tag"><option value="">Todas as tags</option>${tags.map(x => `<option${f.tag === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>` : ''}
    <input type="search" placeholder="Procurar…" value="${esc(f.q || '')}" data-uif="txf.q" aria-label="Procurar"></div>
  <div class="kpis">${UI.kpi('Movimentos', txs.length)}${UI.kpi('Receitas', U.eur(inc), '', { tone: 'pos' })}${UI.kpi('Despesas', U.eur(exp))}${UI.kpi('Saldo do período', U.eur(inc - exp, { sign: 1 }), '', { tone: inc - exp >= 0 ? 'pos' : 'neg' })}${UI.kpi('Média diária de gasto', U.eur(exp / Math.max(1, days.length)))}</div>
  ${days.length > 1 && days.length <= 120 ? `<div class="pn"><div class="pn-h"><h3>Gastos por dia</h3></div>${C.mount({ type: 'bar', labels: days.map(d => U.fmtDS(d)), series: [{ name: 'Despesas', data: days.map(d => U.sum(byDay[d] || [], x => x.amount)), color: 'var(--c2)' }], fmt: U.eurK }, 150)}</div>` : ''}
  ${UI.table({ key: 'tx', coll: 'transactions', rows: txs, limit: 60, empty: 'Sem movimentos neste filtro.', emptyAct: UI.addBtn('transactions', 'Registar movimento', null, ''), rowCls: x => x.date > U.today() ? 'muted' : '', cols: [
    { l: 'Data', v: x => `<span class="mono">${U.fmtD(x.date)}</span>`, s: x => x.date },
    { l: 'Descrição', v: x => `<b style="font-weight:520">${esc(x.desc || x.sub || x.cat || x.type)}</b>${x.instN ? ` <span class="bdg out">${x.instI}/${x.instN}</span>` : ''}${x.recurring ? ' <span class="bdg out">recorrente</span>' : ''}${x.ess === 'Supérfluo' ? ' ' + UI.badge('supérfluo', 'warn') : ''}`, cls: 'wrap' },
    { l: 'Categoria', v: x => x.type === 'Transferência' ? `<span class="mut">${esc(accN(x.account))} → ${esc(accN(x.toAccount))}</span>` : esc([x.cat, x.sub].filter(Boolean).join(' · ')), s: x => x.cat || '' },
    { l: 'Conta', v: x => esc(accN(x.account)), s: x => accN(x.account) },
    { l: 'Forma', v: x => esc(x.method || '') },
    { l: 'Tags', v: x => (x.tags || []).map(g => UI.badge(g, 'out')).join(' ') },
    { l: 'Valor', cls: 'r', v: x => x.type === 'Transferência' ? `<span class="mono mut">${U.eur(x.amount)}</span>` : money(txSign(x)), s: x => txSign(x) }] })}`;
};
// juntar uma conta de um banco com um toque (abre o formulário já com o banco e a moeda)
FIN.banks = (acc, title = 'Juntar conta de um banco') => { const have = new Set((acc || []).map(a => (L.bank(a.inst) || [])[0]).filter(Boolean));
  return `<div class="pn bk-add"><div class="pn-h"><h3>${title}</h3><span class="mut" style="font-size:12px">ou escreve outro em "Nova conta"</span></div><div class="bk-chips">${L.BANKS.map(([n, c, cur]) => `<button type="button" class="chip ${have.has(n) ? 'on' : ''}" data-new="accounts" data-defs='${esc(JSON.stringify({ inst: n, name: 'Conta à ordem', type: 'Conta à ordem', currency: cur }))}'><i class="bk-dot" style="background:${c}" aria-hidden="true"></i>${esc(n)}</button>`).join('')}</div></div>`; };
OS.FinBanks = FIN.banks;
FIN.contas = () => {
  const acc = OS.all('accounts');
  return `<div class="row between"><div class="kpis grow">${UI.kpi('Disponível', U.eur(Fin.liquid()))}${UI.kpi('Reservas', U.eur(Fin.reserve()))}${UI.kpi('Cartões (em dívida)', U.eur(Fin.cardDebt()), '', { tone: Fin.cardDebt() ? 'warn' : '' })}${UI.kpi('Total em contas', U.eur(Fin.cashTotal()))}</div></div>
  <div class="row gap8">${UI.addBtn('accounts', 'Nova conta')}${UI.addBtn('transactions', 'Transferência', { type: 'Transferência' }, '')}</div>
  ${FIN.banks(acc)}
  ${UI.table({ key: 'acc', coll: 'accounts', rows: acc, cols: [
    { l: 'Conta', v: a => `${bankDot(a)}<b style="font-weight:530">${esc(L.accLabel(a))}</b>${a.archived ? ' ' + UI.badge('arquivada') : ''}`, s: a => L.accLabel(a) },
    { l: 'Tipo', v: a => esc(a.type) }, { l: 'Banco', v: a => esc(a.inst || '') }, { l: 'Moeda', v: a => a.currency || 'EUR' },
    { l: 'Movimentos', cls: 'r', v: a => `<span class="mono">${OS.all('transactions').filter(t => t.account === a.id || t.toAccount === a.id).length}</span>` },
    { l: 'Saldo', cls: 'r', v: a => { const b = Fin.accBal(a); return a.type === 'Cartão de crédito' ? `<span class="mono ${b < 0 ? 'warn' : ''}">${U.eur(b)}</span>${U.num(a.limit) ? `<div style="width:120px;margin-left:auto;margin-top:4px">${UI.bar(-b / U.num(a.limit), -b / U.num(a.limit) > .8 ? 'neg' : 'warn')}</div>` : ''}` : `<span class="mono ${b < 0 ? 'neg' : ''}">${U.eur(b)}</span>`; }, s: a => Fin.accBal(a) }] })}
  <div class="note">Cartão de crédito: as compras no cartão ficam como despesas na conta do cartão (saldo negativo). Pagar a fatura = transferência da conta à ordem para o cartão. Corretora: compras de ativos em Investimentos debitam a conta escolhida.</div>`;
};
FIN.orcamento = () => {
  const ym = OS.ui.budYM || U.ym(U.today()), t = U.today(), cur = ym === U.ym(t), day = cur ? +t.slice(8) : U.dim(ym), dim = U.dim(ym);
  const B = OS.all('budgets'), rows = B.map(b => { const sp = Fin.spentCat(b.cat, ym), lim = U.num(b.limit); return { b, sp, lim, left: lim - sp, p: lim ? sp / lim : 0, proj: cur && day ? sp / day * dim : sp }; });
  const noBud = Fin.byCat(ym + '-01', ym + '-' + dim).filter(c => !B.some(b => b.cat === c.l));
  const tl = U.sum(rows, r => r.lim), ts = U.sum(rows, r => r.sp);
  return `<div class="row between gap8"><div class="row gap8"><button class="icon-btn" data-act="budMove" data-v="-1" aria-label="Mês anterior">${UI.ic('left')}</button><b>${U.fmtYML(ym)}</b><button class="icon-btn" data-act="budMove" data-v="1" aria-label="Mês seguinte">${UI.ic('right')}</button></div>${UI.addBtn('budgets', 'Novo orçamento')}</div>
  <div class="kpis">${UI.kpi('Orçamentado', U.eur(tl))}${UI.kpi('Gasto (categorias orçamentadas)', U.eur(ts), tl ? U.pct(ts / tl) + ' do total' : '', { tone: ts > tl && tl ? 'neg' : '' })}${UI.kpi('Disponível', U.eur(tl - ts), cur ? `${dim - day} dias restantes` : '', { tone: tl - ts < 0 ? 'neg' : 'pos' })}${UI.kpi('Sem orçamento', U.eur(U.sum(noBud, x => x.v)), noBud.length + ' categorias')}</div>
  <div class="pn">${rows.length ? rows.map(r => `<div class="bar-row" style="grid-template-columns:minmax(110px,180px) 1fr 200px;cursor:pointer" data-edit="budgets:${r.b.id}"><span class="l">${esc(r.b.cat)}</span>${UI.bar(r.p, r.p > 1 ? 'neg' : r.p > .85 ? 'warn' : 'pos', cur ? day / dim : null)}<span class="v">${U.eur(r.sp, { dec: 0 })} / ${U.eur(r.lim, { dec: 0 })}${cur && r.proj > r.lim && r.p <= 1 ? ` <span class="warn" title="Estimativa ao ritmo atual">→ ${U.eur(r.proj, { dec: 0 })}</span>` : ''}</span></div>`).join('') : UI.empty('Define limites mensais por categoria. O sistema avisa quando passas de 85% e quando o ritmo aponta para estourar.', UI.addBtn('budgets', 'Criar orçamento', null, ''))}
  ${noBud.length ? `<div class="divider"></div><div class="eyebrow" style="margin-bottom:6px">Gastos sem orçamento</div>${noBud.map(c => `<div class="bar-row"><span class="l">${esc(c.l)}</span><span></span><span class="v">${U.eur(c.v, { dec: 0 })} <button class="btn xs ghost" data-new="budgets" data-defs='${esc(JSON.stringify({ cat: c.l, limit: Math.ceil(c.v / 10) * 10 }))}'>Orçamentar</button></span></div>`).join('')}` : ''}</div>
  <div class="note">A marca vertical em cada barra é a fração do mês já passada. Barra à frente da marca = a gastar mais depressa do que o orçamento permite.</div>`;
};
A.budMove = b => OS.setUI('budYM', U.addMonths(OS.ui.budYM || U.ym(U.today()), +b.dataset.v));
FIN.recorrentes = () => {
  const ym = U.ym(U.today()), R = OS.all('recurring'), cand = I.finRecurringCandidates();
  const monthly = r => r.freq === 'Anual' ? U.num(r.amount) / 12 : r.freq === 'Semanal' ? U.num(r.amount) * 52 / 12 : U.num(r.amount);
  return `<div class="kpis">${UI.kpi('Despesas fixas / mês', U.eur(Fin.fixedMonthly()))}${UI.kpi('Assinaturas / ano', U.eur(U.sum(R.filter(r => r.active && r.kind === 'Assinatura'), r => monthly(r) * 12)))}${UI.kpi('Receitas recorrentes / mês', U.eur(Fin.recurIncome()), '', { tone: 'pos' })}${UI.kpi('Para rever', R.filter(r => r.active && r.review !== 'Manter' && r.type === 'Despesa').length, 'marcadas "Rever" ou "Cancelar"', { tone: R.some(r => r.review === 'Cancelar') ? 'warn' : '' })}</div>
  <div class="row gap8">${UI.addBtn('recurring', 'Nova recorrente')}</div>
  ${UI.table({ key: 'rec', coll: 'recurring', rows: U.sortBy(R, r => (r.active ? 0 : 1) + String(U.num(r.day)).padStart(2, '0')), empty: 'Regista salário, renda, telemóvel, streaming, ginásio… O sistema avisa antes de cada vencimento e mostra quanto te custam por ano.', cols: [
    { l: 'Nome', v: r => `<b style="font-weight:530">${esc(r.name)}</b>${r.active ? '' : ' ' + UI.badge('inativa')}` , s: r => r.name },
    { l: 'Tipo', v: r => esc(r.kind) }, { l: 'Vence', v: r => { const d = Fin.recurDue(r, ym); return d ? `<span class="mono">${U.fmtDS(d)}</span>` : r.freq === 'Anual' ? 'mês ' + (r.month || '—') : r.freq; } },
    { l: 'Este mês', v: r => { const d = Fin.recurDue(r, ym); if (!d) return '—'; return Fin.recurPaid(r, ym) ? UI.badge(r.type === 'Receita' ? 'recebido' : 'pago', 'pos') : `<button class="btn xs" data-act="payRec" data-id="${r.id}">${r.type === 'Receita' ? 'Registar entrada' : 'Registar pagamento'}</button>`; } },
    { l: 'Ainda preciso?', v: r => r.type === 'Despesa' ? UI.badge(r.review || 'Manter', r.review === 'Cancelar' ? 'neg' : r.review === 'Rever' ? 'warn' : '') : '' },
    { l: 'Valor', cls: 'r', v: r => money(r.type === 'Receita' ? U.num(r.amount) : -U.num(r.amount)) },
    { l: 'Por ano', cls: 'r', v: r => `<span class="mono mut">${U.eur(monthly(r) * 12, { dec: 0 })}</span>`, s: r => monthly(r) }] })}
  ${cand.length ? `<div class="pn"><div class="pn-h"><h3>${UI.ic('repeat')}Gastos recorrentes detetados</h3><span class="mut" style="font-size:12px">mesma descrição e valor em 2+ meses</span></div>${cand.slice(0, 8).map(c => `<div class="li"><div class="li-t"><b>${esc(c.desc)}</b><small>${c.months} meses · ~${U.eur(c.avg)} · ${U.eur(c.yearly, { dec: 0 })}/ano</small></div><button class="btn sm" data-new="recurring" data-defs='${esc(JSON.stringify({ name: c.desc, amount: U.r2(c.avg), cat: c.cat, type: 'Despesa', day: +c.tx.date.slice(8), account: c.tx.account }))}'>Criar recorrente</button></div>`).join('')}</div>` : ''}`;
};
A.payRec = b => { const r = OS.get('recurring', b.dataset.id); if (!r) return; const tx = Fin.payRecurring(r, U.ym(U.today())); UI.toast(`${r.name}: ${U.eur(tx.amount)} registado`, 'pos'); };
FIN.dividas = () => {
  const D = OS.all('debts'), cards = Fin.accounts().filter(a => a.type === 'Cartão de crédito' && Fin.accBal(a) < 0);
  const payoff = d => { const B = Fin.debtBal(d), P = U.num(d.installment), r = U.num(d.rate) / 100 / 12; if (!B) return 0; if (!P) return null; if (!r) return Math.ceil(B / P); if (P <= B * r) return Infinity; return Math.ceil(-Math.log(1 - r * B / P) / Math.log(1 + r)); };
  const inst = OS.all('transactions').filter(t => t.instG && t.date > U.today());
  const instG = Object.values(U.groupBy(inst, t => t.instG));
  return `<div class="kpis">${UI.kpi('Dívidas', U.eur(Fin.debtsTotal()), D.length + ' registada(s)', { tone: Fin.debtsTotal() ? 'warn' : '' })}${UI.kpi('Cartões', U.eur(Fin.cardDebt()))}${UI.kpi('Parcelas futuras', U.eur(U.sum(inst, t => t.amount)), instG.length + ' compra(s) parcelada(s)')}${UI.kpi('Prestações / mês', U.eur(U.sum(D.filter(d => Fin.debtBal(d) > 0), d => d.installment)))}</div>
  <div class="row gap8">${UI.addBtn('debts', 'Nova dívida / empréstimo')}</div>
  ${D.length ? `<div class="pn">${D.map(d => { const bal = Fin.debtBal(d), paid = U.num(d.principal) - bal, n = payoff(d); return `<div class="gcard"><div class="click" data-edit="debts:${d.id}" style="cursor:pointer"><b>${esc(d.name)}</b><div class="gmeta">${UI.badge(d.kind, 'out')}${d.creditor ? `<span>${esc(d.creditor)}</span>` : ''}${U.num(d.rate) ? `<span>${d.rate}% ao ano</span>` : ''}${U.num(d.installment) ? `<span>prestação ${U.eur(d.installment)}${d.dueDay ? ' · dia ' + d.dueDay : ''}</span>` : ''}${n != null && bal > 0 ? `<span class="est">estimativa</span><span>${n === Infinity ? 'a prestação não cobre os juros' : `liquidada em ~${n} meses`}</span>` : ''}</div></div>
    <div class="gp"><span class="num">${U.eur(bal)} <span class="mut">em dívida</span></span>${UI.bar(U.num(d.principal) ? paid / U.num(d.principal) : 0, 'pos')}${bal > 0 ? `<button class="btn xs" data-act="payDebt" data-id="${d.id}">Registar pagamento</button>` : UI.badge('liquidada', 'pos')}</div></div>`; }).join('')}</div>` : UI.empty('Sem dívidas registadas.')}
  ${instG.length ? `<div class="pn"><div class="pn-h"><h3>Compras parceladas em curso</h3></div>${instG.map(g => { const f = g[0]; return `<div class="li"><div class="li-t"><b>${esc(f.desc || f.cat)}</b><small>${g.length} parcela(s) por pagar · próxima ${U.fmtDS(U.sortBy(g, x => x.date)[0].date)}</small></div><span class="mono">${U.eur(U.sum(g, x => x.amount))}</span></div>`; }).join('')}</div>` : ''}
  ${cards.length ? `<div class="pn"><div class="pn-h"><h3>Cartões com saldo em dívida</h3></div>${cards.map(a => `<div class="li"><div class="li-t"><b>${bankDot(a)}${esc(L.accLabel(a))}</b><small>${a.dueDay ? 'pagamento dia ' + a.dueDay : ''}</small></div><span class="mono warn">${U.eur(-Fin.accBal(a))}</span><button class="btn xs" data-new="transactions" data-defs='${esc(JSON.stringify({ type: 'Transferência', toAccount: a.id, amount: U.r2(-Fin.accBal(a)), desc: 'Pagamento ' + a.name }))}'>Pagar fatura</button></div>`).join('')}</div>` : ''}`;
};
A.payDebt = b => { const d = OS.get('debts', b.dataset.id); if (!d) return; UI.openForm('transactions', null, { type: 'Despesa', debt: d.id, amount: U.num(d.installment) || '', desc: 'Prestação · ' + d.name, cat: 'Dívidas', sub: 'Prestação' }); };
FIN.inteligencia = () => {
  const an = I.finAnoms(), beh = I.finBehavior(), sav = I.finSavings(), pr = I.finProjection();
  const sc = OS.ui.scen || { cat: 'Lazer', pct: 20 };
  const ym = U.ym(U.today()), prev3 = [1, 2, 3].map(i => U.addMonths(ym, -i)).filter(m => Fin.month(m).n);
  const scAvg = prev3.length ? U.avg(prev3, m => Fin.spentCat(sc.cat, m)) : Fin.spentCat(sc.cat, ym);
  const scSave = scAvg * U.num(sc.pct) / 100;
  const fg = OS.all('goals').filter(g => g.status === 'Ativa' && ['account', 'networth', 'invested'].includes(g.metric));
  const row = (l, a, b, fmt, goodUp) => `<tr><td>${l}</td><td class="mono">${a == null ? '—' : fmt(a)}</td><td class="mono mut">${b == null ? '—' : fmt(b)}</td><td>${a != null && b != null ? UI.trend(a, b, goodUp) : '—'}</td></tr>`;
  return `<div class="note">Análises calculadas a partir dos teus movimentos. Onde há previsão aparece <span class="est">estimativa</span> e as premissas usadas. Sem histórico suficiente, o sistema não inventa.</div>
  <div class="g g2">
    <div class="pn"><div class="pn-h"><h3>${UI.ic('radar')}Onde estás a gastar demais</h3></div>${an.length ? an.map(x => `<div class="ins">${UI.ic('arrowUp', 'warn')}<div><b style="font-weight:540">${esc(x.title)}</b><div class="tx2" style="font-size:13px">${esc(x.detail)}</div></div></div>`).join('') : UI.empty(Fin.months(4).slice(0, 3).filter(m => Fin.month(m).n).length < 2 ? 'Preciso de pelo menos 2 meses de histórico para comparar com o teu padrão.' : 'Nenhuma categoria ou despesa fora do padrão.')}</div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('chart')}Mudanças de comportamento</h3><span class="mut" style="font-size:12px">últimos 30 dias vs 30 anteriores</span></div>${beh ? `<table class="cmp"><thead><tr><th></th><th>Agora</th><th>Antes</th><th>Variação</th></tr></thead><tbody>${row('Gasto médio por dia', beh.daily, beh.dailyPrev, v => U.eur(v), false)}${row('Nº de despesas', beh.n, beh.nPrev || null, v => U.nf(v), false)}${row('Valor médio por despesa', beh.ticket, beh.ticketPrev, v => U.eur(v), false)}${row('Peso do fim de semana', beh.weekend, beh.weekendPrev, v => U.pct(v), false)}${row('Peso dos supérfluos', beh.sup, beh.supPrev, v => U.pct(v), false)}</tbody></table>` : UI.empty('Sem despesas nos últimos 30 dias.')}</div>
  </div>
  <div class="g g2">
    <div class="pn"><div class="pn-h"><h3>${UI.ic('coin')}Possíveis economias</h3><span class="mut" style="font-size:12px">por ano</span></div>${sav.length ? sav.map(s => `<div class="li"><div class="li-t"><b>${esc(s.title)}</b><small>${esc(s.detail)} · base: ${esc(s.basis)}</small></div><span class="mono pos">${U.eur(s.v, { dec: 0 })}</span></div>`).join('') : UI.empty('Sem economias evidentes com os dados atuais.')}</div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('trend')}Projeções <span class="est">estimativa</span></h3></div>
      <dl class="kv"><dt>Despesas previstas até ao fim do mês</dt><dd>${U.eur(pr.expEnd)}</dd><dt>Receitas previstas</dt><dd>${U.eur(pr.incEnd)}</dd><dt>Saldo do mês previsto</dt><dd class="${pr.netEnd < 0 ? 'neg' : 'pos'}">${U.eur(pr.netEnd, { sign: 1 })}</dd><dt>Disponível daqui a 1 / 2 / 3 meses</dt><dd>${pr.cash90.map(v => U.eurK(v)).join(' · ')}</dd></dl>
      <div class="note" style="margin-top:12px"><b>Premissas:</b> ${pr.basis.map(esc).join('; ')}.</div></div>
  </div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('calc')}Cenário: e se eu cortar…</h3></div>
    <div class="row gap12"><select class="field" style="width:auto" data-uif="scen.cat" aria-label="Categoria">${Object.keys(Fin.cats('Despesa')).map(c => `<option${sc.cat === c ? ' selected' : ''}>${c}</option>`).join('')}</select><div class="inp-wrap" style="width:120px"><input type="number" value="${sc.pct}" data-uif="scen.pct" aria-label="Percentagem de corte"><span>%</span></div>
    <span class="tx2">Média ${prev3.length ? 'de ' + prev3.length + ' mês(es)' : 'deste mês'}: <b class="mono">${U.eur(scAvg)}</b>/mês → poupas <b class="mono pos">${U.eur(scSave)}</b>/mês, <b class="mono pos">${U.eur(scSave * 12, { dec: 0 })}</b>/ano.</span></div>
    ${fg.map(g => { const i = OS.Goal.info(g), left = U.num(g.target) - U.num(i.cur), base = pr.monthlyNet; if (left <= 0) return ''; const m1 = base > 0 ? Math.ceil(left / base) : null, m2 = base + scSave > 0 ? Math.ceil(left / (base + scSave)) : null; return `<div class="li"><div class="li-t"><b>${esc(g.title)}</b><small>faltam ${U.eur(left, { dec: 0 })}</small></div><span class="tx2" style="font-size:13px"><span class="est">estimativa</span> ${m1 ? m1 + ' meses' : 'sem poupança mensal'} → <b class="pos">${m2 ? m2 + ' meses' : '—'}</b> com o corte</span></div>`; }).join('')}
    <div class="note" style="margin-top:10px">Premissa: o saldo mensal médio (${U.eur(pr.monthlyNet)}) mantém-se e o corte é aplicado todos os meses.</div></div>`;
};
FIN.categorias = () => {
  const cats = OS.one('fin').cats;
  return `<div class="note">Categorias e subcategorias usadas nos movimentos, orçamentos e recorrentes. Remover uma categoria não apaga movimentos antigos.</div>
  <div class="g g2">${['Despesa', 'Receita'].map(type => `<div class="pn"><div class="pn-h"><h3>${type === 'Despesa' ? 'Despesas' : 'Receitas'}</h3></div>${Object.entries(cats[type] || {}).map(([c, subs]) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="row between"><b style="font-weight:540">${esc(c)}</b><button class="icon-btn" data-act="catDel" data-type="${type}" data-cat="${esc(c)}" aria-label="Remover ${esc(c)}">${UI.ic('trash')}</button></div><div class="row gap4" style="margin-top:6px">${subs.map(s => `<span class="bdg out">${esc(s)}<button class="icon-btn" style="width:18px;height:18px" data-act="subDel" data-type="${type}" data-cat="${esc(c)}" data-sub="${esc(s)}" aria-label="Remover ${esc(s)}">${UI.ic('x')}</button></span>`).join('')}<form data-form="subAdd" data-type="${type}" data-cat="${esc(c)}" class="row gap4"><input class="field" style="width:130px;padding:3px 8px;font-size:12.5px" name="s" placeholder="+ subcategoria" aria-label="Nova subcategoria"></form></div></div>`).join('')}
    <form data-form="catAdd" data-type="${type}" class="row gap8" style="margin-top:12px"><input class="field grow" name="c" placeholder="Nova categoria" aria-label="Nova categoria"><button class="btn sm">${UI.ic('plus')}Adicionar</button></form></div>`).join('')}</div>`;
};
A.catDel = b => UI.ask('Remover categoria?', `"${esc(b.dataset.cat)}" deixa de aparecer nas opções.`, 'Remover', () => { const f = OS.one('fin'); delete f.cats[b.dataset.type][b.dataset.cat]; OS.touch('fin'); });
A.subDel = b => { const f = OS.one('fin'), a = f.cats[b.dataset.type][b.dataset.cat]; f.cats[b.dataset.type][b.dataset.cat] = a.filter(x => x !== b.dataset.sub); OS.touch('fin'); };
OS.forms = OS.forms || {};
OS.forms.catAdd = (f, v) => { const c = v('c'); if (!c) return; const fin = OS.one('fin'); fin.cats[f.dataset.type][c] = fin.cats[f.dataset.type][c] || []; OS.touch('fin'); };
OS.forms.subAdd = (f, v) => { const s = v('s'); if (!s) return; const fin = OS.one('fin'), a = fin.cats[f.dataset.type][f.dataset.cat]; if (!a.includes(s)) a.push(s); OS.touch('fin'); };

/* ================= INVESTIMENTOS ================= */
V.investimentos = sub => {
  const head = UI.head('Investimentos', 'Carteira: ações, ETFs, fundos, obrigações, títulos, depósitos, CDB, REITs, cripto e commodities. Preço médio, rentabilidade, dividendos e exposição calculados a partir dos movimentos.', `${UI.addBtn('invtx', 'Movimento')}${UI.addBtn('assets', 'Ativo', null, '')}`, 'Dinheiro') + UI.tabs('investimentos', [['', 'Visão'], ['ativos', 'Ativos'], ['movimentos', 'Movimentos'], ['cotacoes', 'Cotações']], sub);
  const miss = Inv.fxMissing();
  const fxNote = miss.length ? `<div class="note"><b>Câmbio em falta:</b> ${miss.join(', ')}. Define a taxa em Definições → Ligações (câmbio manual) para converter para euros; até lá esses ativos contam 1:1.</div>` : '';
  return head + fxNote + (INV[sub || 'visao'] || INV.visao)();
};
const INV = {};
INV.visao = () => {
  const A2 = OS.all('assets'); if (!A2.length) return UI.empty('Adiciona o primeiro ativo e regista a compra. Tudo o resto é calculado.', UI.addBtn('assets', 'Adicionar ativo'));
  const pos = A2.map(a => Object.assign({ a }, Inv.pos(a))).filter(p => p.qty > 0 || p.realized || p.divs);
  const val = U.sum(pos, p => p.value), cost = U.sum(pos, p => p.cost), pl = val - cost, divs12 = Inv.divs(U.addDays(U.today(), -365)), yr = U.today().slice(0, 4);
  const aport = Fin.months(12), ab = Inv.contribByMonth(12);
  const nws = Fin.nwSeries().filter(s => s.inv || s.invested);
  const byCls = Object.entries(U.groupBy(pos, p => p.a.cls)).map(([k, arr]) => ({ k, val: U.sum(arr, p => p.value), cost: U.sum(arr, p => p.cost), divs: U.sum(arr, p => p.divs) })).sort((x, y) => y.val - x.val);
  return `<div class="kpis">${UI.kpi('Valor atual', U.eur(val))}${UI.kpi('Investido (custo)', U.eur(cost))}${UI.kpi('Lucro / prejuízo', U.eur(pl, { sign: 1 }), cost ? U.pct(pl / cost, 1) : '', { tone: pl >= 0 ? 'pos' : 'neg' })}${UI.kpi('Dividendos e juros (12m)', U.eur(divs12), val ? 'yield ' + U.pct(divs12 / val, 1) : '')}${UI.kpi('Aportes ' + yr, U.eur(U.sum(ab.filter((_, i) => aport[i].startsWith(yr)), v => v)))}${UI.kpi('Realizado (vendas)', U.eur(U.sum(pos, p => p.realized), { sign: 1 }))}</div>
  ${pos.some(p => p.stale) ? `<div class="note"><b>Cotações desatualizadas</b> (mais de 7 dias): ${pos.filter(p => p.stale).map(p => esc(p.a.ticker || p.a.name)).join(', ')}. <a class="acc" href="#investimentos.cotacoes">Atualizar</a></div>` : ''}
  <div class="g g-main"><div class="pn"><div class="pn-h"><h3>Evolução patrimonial</h3><span class="mut" style="font-size:12px">retratos mensais</span></div>${C.mount({ type: 'line', labels: nws.map(s => U.fmtYM(s.ym)), series: [{ name: 'Valor', data: nws.map(s => s.inv) }, { name: 'Investido', data: nws.map(s => s.invested), color: 'var(--mut)', dash: 1 }], fmt: U.eurK, min0: false, empty: 'A curva começa hoje e ganha um ponto por mês.' }, 220)}</div>
  <div class="pn"><div class="pn-h"><h3>Aportes líquidos por mês</h3></div>${C.mount({ type: 'bar', labels: aport.map(U.fmtYM), series: [{ name: 'Aportes', data: ab, color: v => v >= 0 ? 'var(--c2)' : 'var(--neg)' }], fmt: U.eurK }, 220)}</div></div>
  <div class="g g4">${[['cls', 'Classe'], ['currency', 'Moeda'], ['country', 'País'], ['sector', 'Setor']].map(([k, l]) => `<div class="pn"><div class="pn-h"><h3>Por ${l.toLowerCase()}</h3></div>${C.mount({ type: 'donut', data: Inv.byKey(k), label: 'Exposição por ' + l, max: 5 }, 170)}</div>`).join('')}</div>
  <section><div class="sech"><h2>Rentabilidade por ativo</h2></div>${UI.table({ key: 'pos', rows: pos, rowAttr: p => `data-edit="assets:${p.a.id}" tabindex="0"`, cols: [
    { l: 'Ativo', v: p => `<b style="font-weight:530">${esc(p.a.ticker || p.a.name)}</b><div class="mut" style="font-size:12px">${esc(p.a.name)}</div>`, s: p => p.a.name },
    { l: 'Classe', v: p => esc(p.a.cls) }, { l: 'Qtd.', cls: 'r', v: p => `<span class="mono">${U.nf(p.qty, p.qty % 1 ? 4 : 0)}</span>` },
    { l: 'Preço médio', cls: 'r', v: p => `<span class="mono">${U.nf(p.avg, 2)} ${p.a.currency || 'EUR'}</span>` },
    { l: 'Preço atual', cls: 'r', v: p => `<span class="mono ${p.stale ? 'warn' : ''}">${p.hasPrice ? U.nf(U.num(p.a.price), 2) : '—'}</span>` },
    { l: 'Valor', cls: 'r', v: p => `<span class="mono">${U.eur(p.value)}</span>`, s: p => p.value },
    { l: 'L/P', cls: 'r', v: p => `<span class="mono ${p.pl >= 0 ? 'pos' : 'neg'}">${U.eur(p.pl, { sign: 1 })}</span>`, s: p => p.pl },
    { l: 'Rent.', cls: 'r', v: p => `<span class="mono ${p.ret >= 0 ? 'pos' : 'neg'}">${U.pct(p.ret, 1)}</span>`, s: p => p.ret },
    { l: 'Dividendos', cls: 'r', v: p => `<span class="mono">${p.divs ? U.eur(p.divs) : '—'}</span>` },
    { l: 'Peso / alvo', cls: 'r', v: p => `<span class="mono">${val ? U.pct(p.value / val) : '—'}${U.num(p.a.target) ? ' / ' + p.a.target + '%' : ''}</span>` }] })}</section>
  <section><div class="sech"><h2>Rentabilidade por classe</h2></div><div class="pn">${byCls.map(c => `<div class="bar-row" style="grid-template-columns:140px 1fr 220px"><span class="l">${esc(c.k)}</span>${UI.bar(val ? c.val / val : 0, '')}<span class="v">${U.eur(c.val, { dec: 0 })} · <span class="${c.val - c.cost >= 0 ? 'pos' : 'neg'}">${c.cost ? U.pct((c.val - c.cost) / c.cost, 1) : '—'}</span></span></div>`).join('')}</div></section>`;
};
INV.ativos = () => UI.table({ key: 'assets', coll: 'assets', rows: OS.all('assets'), empty: 'Sem ativos.', emptyAct: UI.addBtn('assets', 'Adicionar ativo', null, ''), cols: [
  { l: 'Ticker', v: a => `<b class="mono">${esc(a.ticker || '—')}</b>`, s: a => a.ticker || '' }, { l: 'Nome', v: a => esc(a.name), s: a => a.name, cls: 'wrap' }, { l: 'Classe', v: a => esc(a.cls), s: a => a.cls },
  { l: 'Corretora', v: a => esc(a.broker || '') }, { l: 'Moeda', v: a => a.currency || 'EUR' }, { l: 'País', v: a => esc(a.country || '') }, { l: 'Setor', v: a => esc(a.sector || '') },
  { l: 'Qtd.', cls: 'r', v: a => `<span class="mono">${U.nf(Inv.pos(a).qty, 2)}</span>` }, { l: 'Valor', cls: 'r', v: a => `<span class="mono">${U.eur(Inv.pos(a).value)}</span>`, s: a => Inv.pos(a).value }] });
INV.movimentos = () => UI.table({ key: 'invtx', coll: 'invtx', rows: U.sortBy(OS.all('invtx'), t => t.date, -1), limit: 80, empty: 'Sem movimentos.', emptyAct: UI.addBtn('invtx', 'Registar compra', null, ''), cols: [
  { l: 'Data', v: t => `<span class="mono">${U.fmtD(t.date)}</span>`, s: t => t.date }, { l: 'Ativo', v: t => { const a = OS.get('assets', t.asset) || {}; return esc(a.ticker || a.name || '—'); } },
  { l: 'Tipo', v: t => UI.badge(t.type, t.type === 'Compra' ? 'acc' : t.type === 'Venda' ? 'vio' : t.type === 'Taxa' ? 'neg' : 'pos') }, { l: 'Qtd.', cls: 'r', v: t => t.qty ? `<span class="mono">${U.nf(t.qty, 4)}</span>` : '' },
  { l: 'Preço', cls: 'r', v: t => t.price ? `<span class="mono">${U.nf(t.price, 2)}</span>` : '' }, { l: 'Valor', cls: 'r', v: t => `<span class="mono">${U.nf(['Compra', 'Venda'].includes(t.type) ? U.num(t.qty) * U.num(t.price) : U.num(t.amount), 2)}</span>` },
  { l: 'Comissões', cls: 'r', v: t => t.fees ? `<span class="mono">${U.eur(t.fees)}</span>` : '' }, { l: 'Conta', v: t => esc(accN(t.account)) }] });
INV.cotacoes = () => {
  const fx = OS.one('profile').fx || {}, P = Inv.providers;
  return `<div class="pn"><div class="pn-h"><h3>${UI.ic('sync')}Fonte das cotações</h3></div>${Object.values(P).map(p => `<div class="li"><div class="li-t"><b>${p.name}</b><small>${esc(p.note)}</small></div>${UI.badge(p.available ? 'ativa' : 'indisponível aqui', p.available ? 'pos' : '')}</div>`).join('')}
    <div class="note" style="margin-top:10px">Não há cotações inventadas: o valor da carteira usa o último preço que registaste e a data desse preço. A arquitetura (<span class="mono">OS.Inv.providers</span>) está pronta para um fornecedor automático quando houver um conector de mercado disponível.</div></div>
  <div class="pn"><div class="pn-h"><h3>Atualizar preços</h3><span class="mut" style="font-size:12px">na moeda de cada ativo</span></div>${OS.all('assets').length ? `<div class="list">${OS.all('assets').map(a => { const p = Inv.pos(a); return `<form class="li" data-form="setPrice" data-id="${a.id}"><div class="li-t"><b>${esc(a.ticker || a.name)}</b><small>${esc(a.name)} · ${a.priceDate ? 'preço de ' + U.fmtD(a.priceDate) : 'sem preço'}${p.stale && a.priceDate ? ' · <span class="warn">desatualizado</span>' : ''}</small></div><div class="inp-wrap" style="width:150px"><input type="number" step="any" name="p" value="${a.price ?? ''}" aria-label="Preço de ${esc(a.ticker || a.name)}"><span>${a.currency || 'EUR'}</span></div><button class="btn sm">Guardar</button></form>`; }).join('')}</div>` : UI.empty('Sem ativos.')}</div>
  <div class="pn"><div class="pn-h"><h3>Câmbio para euro</h3><span class="mut" style="font-size:12px">quantos € vale 1 unidade</span></div><div class="row gap16">${['USD', 'BRL', 'GBP'].map(c => `<label class="row gap8"><span class="mono">1 ${c} =</span><div class="inp-wrap" style="width:120px"><input type="number" step="any" data-bind="profile.fx.${c}" data-fk="fx${c}" value="${fx[c] || ''}" aria-label="Câmbio ${c}"><span>€</span></div></label>`).join('')}</div></div>`;
};
OS.forms.setPrice = (f, v) => { const p = v('p'); if (p === '') return; OS.upd('assets', f.dataset.id, { price: U.num(p), priceDate: U.today() }); UI.toast('Preço atualizado', 'pos'); };

/* ================= COMPRAS POR IMPULSO ================= */
V.compras = () => {
  const W = OS.all('wishlist'), st = I.wishStats(), now = Date.now();
  const waiting = U.sortBy(W.filter(w => w.status === 'Em espera'), w => I.wishUntil(w)), hist = U.sortBy(W.filter(w => w.status !== 'Em espera'), w => w.decidedAt || w.created, -1);
  const card = w => { const until = I.wishUntil(w), ready = now >= until, im = I.wishImpact(w), rule = I.wishWait(w.price);
    return `<div class="pn"><div class="row between gap12" style="align-items:flex-start"><div class="click" data-edit="wishlist:${w.id}" style="cursor:pointer"><div class="eyebrow">${esc(w.cat || 'Sem categoria')} · espera de ${rule.label}</div><div style="font-size:17px;font-weight:600;margin-top:2px">${esc(w.product)}</div><div class="big-num" style="font-size:26px;margin-top:4px">${U.eur(w.price)}</div></div>
      <div style="text-align:right">${ready ? UI.badge('pode decidir', 'pos') : `<span class="bdg warn" data-until="${until}">…</span>`}<div class="row gap8 end" style="margin-top:10px"><button class="btn sm" data-act="wishBuy" data-id="${w.id}"${ready ? '' : ' disabled title="Espera ainda não terminou"'}>Comprar</button><button class="btn sm ghost" data-act="wishNo" data-id="${w.id}">Desistir</button></div></div></div>
      <div class="divider"></div>
      <div class="two"><dl class="kv"><dt>Necessidade real</dt><dd>${w.need || '—'}/5</dd><dt>Prioridade</dt><dd>${esc(w.prio || '—')}</dd><dt>Já tenho algo semelhante</dt><dd>${w.similar ? 'Sim' + (w.similarNote ? ' · ' + esc(w.similarNote) : '') : 'Não'}</dd>${im.budget ? `<dt>Orçamento de ${esc(w.cat)} disponível</dt><dd class="${im.bLeft < w.price ? 'neg' : ''}">${U.eur(im.bLeft)}</dd>` : ''}</dl>
      <dl class="kv"><dt>Horas de trabalho</dt><dd>${im.hours ? U.nf(im.hours, 1) + ' h' : 'define o valor/hora'}</dd><dt>Do saldo mensal livre</dt><dd>${im.freeShare != null ? U.pct(im.freeShare) : '—'}</dd><dt>Custo de oportunidade <span class="est">6%/ano</span></dt><dd>${U.eurK(im.fv5)} em 5a · ${U.eurK(im.fv10)} em 10a</dd>${im.goal ? `<dt>Atrasa "${esc(im.goal.title)}"</dt><dd>${im.goalDelayDays != null ? '~' + im.goalDelayDays + ' dias' : '—'}</dd>` : ''}</dl></div>
      ${w.reason ? `<div class="note" style="margin-top:10px"><b>Motivo:</b> ${esc(w.reason)}</div>` : ''}</div>`; };
  return UI.head('Compras', 'Toda a compra fora do essencial entra em espera antes de decidires. Até € 50: 24 h. Até € 200: 3 dias úteis. Até € 1.000: 7 dias. Acima: 14 dias.', UI.addBtn('wishlist', 'Quero comprar…'), 'Dinheiro') +
  `<div class="kpis">${UI.kpi('Em espera', st.waiting, U.eur(U.sum(waiting, w => w.price)))}${UI.kpi('Poupado ao desistir', U.eur(st.saved), st.gaveUp + ' desistência(s)', { tone: 'pos' })}${UI.kpi('Comprado depois da espera', U.eur(st.bought))}${UI.kpi('Taxa de resistência', st.resist == null ? '—' : U.pct(st.resist), 'desistências / decisões')}</div>
  ${waiting.length ? `<div class="g g2">${waiting.map(card).join('')}</div>` : UI.empty('Nada em espera. Da próxima vez que quiseres comprar algo, regista aqui primeiro.')}
  <div class="g g-side"><div class="pn"><div class="pn-h"><h3>Desejos por categoria</h3></div>${C.mount({ type: 'donut', data: st.byCat, label: 'Desejos por categoria' }, 180)}</div>
  <div class="pn"><div class="pn-h"><h3>Histórico de decisões</h3></div>${hist.length ? `<div class="list">${hist.slice(0, 12).map(w => `<div class="li" data-edit="wishlist:${w.id}" style="cursor:pointer"><div class="li-t"><b>${esc(w.product)}</b><small>${w.decidedAt ? U.fmtD(w.decidedAt) : ''} · esperou ${w.decidedAt ? Math.max(0, U.diff(w.decidedAt, U.iso(new Date(w.created)))) : '—'} dias</small></div>${UI.badge(w.status, w.status === 'Desisti' ? 'pos' : '')}<span class="mono">${U.eur(w.price)}</span></div>`).join('')}</div>` : UI.empty('Ainda sem decisões.')}</div></div>`;
};
A.wishNo = b => { OS.upd('wishlist', b.dataset.id, { status: 'Desisti', decidedAt: U.today() }); UI.toast('Desististe. Esse dinheiro continua contigo.', 'pos'); };
A.wishBuy = b => { const w = OS.get('wishlist', b.dataset.id); if (!w || Date.now() < I.wishUntil(w)) return; UI.openForm('transactions', null, { type: 'Despesa', amount: w.price, desc: w.product, cat: w.cat || '', ess: U.num(w.need) >= 4 ? 'Essencial' : 'Supérfluo', note: 'Compra aprovada após espera' }, { onSave: () => OS.upd('wishlist', w.id, { status: 'Comprada', decidedAt: U.today() }) }); };
setInterval(() => { document.querySelectorAll('[data-until]').forEach(el => { const ms = +el.dataset.until - Date.now(); if (ms <= 0) { if (!el.dataset.done) { el.dataset.done = 1; OS.request(); } return; } const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3); el.textContent = 'faltam ' + (d ? d + 'd ' : '') + U.pad(h) + 'h ' + U.pad(m) + 'm ' + U.pad(s) + 's'; }); }, 1000);

/* ================= SIMULADORES (seguem o país escolhido na Visão) ================= */
/* Perfil financeiro por país: moeda, inflação, taxas de referência, como se cota um crédito e como se tributam os ganhos.
   Valores de referência aproximados (2026) — servem de ponto de partida, todos editáveis. */
const P = (o) => Object.assign({ cur: 'EUR', sym: '€', loc: 'pt-PT', k: 1, inf: 2, dep: 2, ret: 7, real: 4, loan: 8, mo: 0, wage: 10, rate: 'Taxa anual nominal', eff: 'Taxa efetiva anual', sys: ['Prestação fixa', 'Amortização constante'], tax: g => .25 * g, taxL: '', fees: null, wt: 0, wtFree: 0 }, o);
const pos = g => Math.max(0, g);
const FP = {
  PT: P({ inf: 2.2, dep: 1.8, ret: 6, loan: 8.5, wage: 6, rate: 'TAN', eff: 'TAEG', sys: ['Prestação constante (francês)', 'Capital constante'], tax: g => .28 * pos(g), taxL: '28% (taxa liberatória)',
    fees: (pv, n, ints) => ({ up: pv * (n < 12 ? .0004 * n : n < 60 ? .005 : .006), ip: .04, lbl: 'Imposto do Selo' }),
    prod: [['Depósito a prazo', 1.8], ['Certificados de Aforro', 2.3], ['ETF global (média histórica)', 7]],
    note: 'Juros e mais-valias pagam <b>28%</b> (taxa liberatória). Nos créditos compara a <b>TAEG</b>, que inclui o Imposto do Selo (sobre o capital e 4% dos juros), e não só a TAN. Produtos comuns: depósitos a prazo, Certificados de Aforro e do Tesouro, PPR e ETFs.' }),
  BR: P({ cur: 'BRL', sym: 'R$', loc: 'pt-BR', k: 5, inf: 4.5, dep: 13.5, ret: 12, real: 5, loan: 3.5, mo: 1, wage: 15, rate: 'Taxa de juros (% ao mês)', eff: 'CET', sys: ['Tabela Price', 'SAC'], taxL: 'IR regressivo 22,5% → 15%',
    tax: (g, y) => pos(g) * (y <= .5 ? .225 : y <= 1 ? .2 : y <= 2 ? .175 : .15),
    fees: (pv, n, ints, amos) => ({ up: pv * .0038 + amos.reduce((s, a, m) => s + a * .000082 * Math.min(365, 30 * (m + 1)), 0), ip: 0, lbl: 'IOF' }),
    prod: [['Poupança', 6.2, 1], ['CDB 100% do CDI', 13.5], ['LCI/LCA 90% do CDI', 12.1, 1]],
    note: 'No Brasil os empréstimos são cotados <b>ao mês</b> e o custo real é o <b>CET</b>, que soma o <b>IOF</b> (0,38% + 0,0082% ao dia). Renda fixa paga <b>IR regressivo</b>: 22,5% até 6 meses, 20% até 1 ano, 17,5% até 2 anos e 15% depois. Poupança, LCI e LCA são isentas. Referência: CDI/Selic. Compras: o "parcelado sem juros" esconde o juro quando há desconto à vista.' }),
  ES: P({ inf: 2.5, dep: 2, loan: 8, wage: 9, rate: 'TIN', eff: 'TAE', taxL: 'IRPF do aforro 19–30%',
    tax: g => { g = pos(g); let t = 0, prev = 0; for (const [lim, r] of [[6e3, .19], [5e4, .21], [2e5, .23], [3e5, .27], [Infinity, .3]]) { t += Math.max(0, Math.min(g, lim) - prev) * r; prev = lim; if (g <= lim) break; } return t; },
    prod: [['Cuenta remunerada', 2], ['Letras del Tesoro', 2.1], ['Fondo indexado global', 7]],
    note: 'Os rendimentos da poupança pagam IRPF do aforro por escalões: <b>19%</b> até 6 000 €, 21% até 50 000 €, 23% até 200 000 €, 27% e 30%. Nos créditos compara a <b>TAE</b>, não o TIN.' }),
  FR: P({ inf: 1.5, dep: 1.7, loan: 6, wage: 13, rate: 'Taux nominal', eff: 'TAEG', tax: g => .3 * pos(g), taxL: 'PFU (flat tax) 30%',
    prod: [['Livret A', 1.7, 1], ['Assurance-vie (fonds euros)', 2.5], ['PEA / ETF', 7]],
    note: 'Juros e mais-valias pagam a <b>flat tax de 30%</b> (PFU). O Livret A e o LDDS são isentos; o PEA fica isento de IR após 5 anos. Nos créditos compara a <b>TAEG</b>.' }),
  IT: P({ inf: 1.8, dep: 2.5, loan: 8.5, wage: 11, rate: 'TAN', eff: 'TAEG', tax: g => .26 * pos(g), taxL: '26% (12,5% em títulos do Estado)',
    prod: [['Conto deposito', 2.5], ['BTP (títulos do Estado)', 3.5, .125], ['ETF global', 7]],
    note: 'Os rendimentos financeiros pagam <b>26%</b>; os títulos do Estado (BTP, BOT) só <b>12,5%</b>. Créditos: compara a <b>TAEG</b>, não a TAN.' }),
  DE: P({ inf: 2.2, dep: 2, loan: 7, wage: 16, rate: 'Sollzins', eff: 'Effektivzins', tax: g => .26375 * pos(g - 1000), taxL: '26,375% acima de 1 000 €/ano',
    prod: [['Tagesgeld', 2], ['Festgeld', 2.3], ['ETF-Sparplan', 7]],
    note: 'Abgeltungsteuer de <b>25% + Soli = 26,375%</b>, com <b>1 000 €</b> isentos por ano (Sparerpauschbetrag). Nos créditos o que conta é o <b>Effektivzins</b>.' }),
  GB: P({ cur: 'GBP', sym: '£', loc: 'en-GB', k: .85, inf: 3.2, dep: 4, loan: 7, wage: 14, rate: 'Taxa nominal anual', eff: 'APR', tax: g => .24 * pos(g - 3000), taxL: 'CGT 18–24% fora da ISA',
    prod: [['Cash ISA', 4, 1], ['Premium Bonds', 3.6, 1], ['Stocks & Shares ISA', 7, 1]],
    note: 'Dentro de uma <b>ISA</b> (até £20 000/ano) não pagas imposto. Fora dela, mais-valias pagam <b>CGT de 18–24%</b> acima de £3 000/ano. Nos créditos compara a <b>APR</b>.' }),
  IE: P({ inf: 2.2, dep: 2, loan: 9, wage: 16, rate: 'Taxa nominal anual', eff: 'APR', tax: g => .33 * pos(g), taxL: 'CGT/DIRT 33%',
    prod: [['Depósito (DIRT 33%)', 2], ['State Savings', 2, 1], ['ETF (exit tax 38%)', 7, .38]],
    note: 'Juros pagam <b>DIRT de 33%</b>, mais-valias <b>CGT de 33%</b> e os ETFs uma <b>exit tax de 38%</b>. Os produtos State Savings são isentos. Créditos: compara a <b>APR</b>.' }),
  CH: P({ cur: 'CHF', sym: 'CHF', loc: 'de-CH', k: .95, inf: .4, dep: .5, ret: 6, loan: 6, wage: 30, rate: 'Zins', eff: 'Effektivzins', tax: () => 0, taxL: 'mais-valias isentas', wt: .003,
    prod: [['Sparkonto', .5], ['Säule 3a (conta)', 1, 1], ['ETF global', 6]],
    note: 'Mais-valias privadas são <b>isentas</b>; há um <b>imposto cantonal sobre a fortuna</b> (aqui ~0,3%/ano) e 35% de retenção sobre juros e dividendos, recuperável na declaração. O pilar 3a reduz o IRS.' }),
  BE: P({ inf: 2.5, dep: 1.5, loan: 6, wage: 16, rate: 'Taux débiteur', eff: 'TAEG', tax: g => .1 * pos(g - 1e4), taxL: '10% acima de 10 000 €',
    prod: [['Compte d’épargne réglementé', 1.5, 1], ['Bons d’État', 2.5], ['ETF global', 7]],
    note: 'Juros da conta poupança regulamentada são isentos até ~1 000 €/ano; desde 2026 as mais-valias pagam <b>10%</b> acima de 10 000 €. Créditos: compara a <b>TAEG</b>.' }),
  NL: P({ inf: 2.8, dep: 1.8, loan: 7, wage: 16, rate: 'Debetrente', eff: 'JKP', tax: () => 0, taxL: 'Box 3 (~2,2%/ano)', wt: .0216, wtFree: 57000,
    prod: [['Spaarrekening', 1.8], ['Deposito', 2.2], ['ETF global', 7]],
    note: 'Não se tributa o ganho real: o <b>Box 3</b> cobra 36% sobre um rendimento fictício do património — na prática <b>~2,2% ao ano</b> do valor acima de ~57 000 €. Créditos: compara o <b>JKP</b> (taxa anual efetiva).' }),
  LU: P({ inf: 2.3, dep: 2, loan: 6, wage: 18, rate: 'Taux nominal', eff: 'TAEG', tax: (g, y) => y > .5 ? 0 : .2 * pos(g), taxL: 'isento após 6 meses (ações)',
    prod: [['Compte épargne', 2], ['Dépôt à terme', 2.3], ['ETF global', 7]],
    note: 'Mais-valias de ações detidas há <b>mais de 6 meses</b> são isentas; os juros pagam <b>20%</b> de retenção na fonte. Créditos: compara a <b>TAEG</b>.' }),
  US: P({ cur: 'USD', sym: 'US$', loc: 'en-US', k: 1.1, inf: 2.8, dep: 3.8, ret: 10, real: 5, loan: 12, wage: 25, rate: 'Taxa nominal anual', eff: 'APR', tax: (g, y) => (y >= 1 ? .15 : .22) * pos(g), taxL: '15% longo prazo (22% curto)',
    prod: [['High-yield savings', 3.8], ['T-Bills', 3.7], ['S&P 500 (média histórica)', 10]],
    note: 'Ganhos de <b>longo prazo</b> (mais de 1 ano) pagam 0/15/20% federal; curto prazo paga como salário. <b>401(k), IRA e Roth IRA</b> adiam ou evitam o imposto. Nos créditos compara a <b>APR</b>.' }),
  CA: P({ cur: 'CAD', sym: 'C$', loc: 'en-CA', k: 1.5, inf: 2.2, dep: 3, loan: 9, wage: 25, rate: 'Taxa nominal anual', eff: 'APR', tax: g => .15 * pos(g), taxL: '50% do ganho tributado (~15%)',
    prod: [['HISA', 3], ['GIC', 3.3], ['ETF na TFSA', 7, 1]],
    note: 'Só <b>50% da mais-valia</b> é tributada (≈15% efetivo). A <b>TFSA</b> é isenta e a <b>RRSP</b> adia o imposto. Créditos: compara a <b>APR</b>.' }),
  MX: P({ cur: 'MXN', sym: 'MX$', loc: 'es-MX', k: 20, inf: 3.8, dep: 7, ret: 10, real: 5, loan: 35, wage: 60, rate: 'Tasa anual', eff: 'CAT', tax: g => .1 * pos(g), taxL: 'ISR 10% (bolsa)',
    fees: () => ({ up: 0, ip: .16, lbl: 'IVA sobre juros (16%)' }),
    prod: [['Cuenta remunerada', 5], ['CETES', 7], ['ETF / IPC (bolsa)', 10]],
    note: 'Ganhos em bolsa pagam <b>ISR de 10%</b>; os <b>CETES</b> são a referência sem risco. Nos créditos pessoais paga-se <b>IVA de 16% sobre os juros</b>; compara sempre o <b>CAT</b>.' }),
  AR: P({ cur: 'ARS', sym: 'AR$', loc: 'es-AR', k: 1200, inf: 25, dep: 30, ret: 32, real: 4, loan: 70, wage: 3500, rate: 'TNA', eff: 'CFT', tax: () => 0, taxL: 'isento (pessoas, em pesos)',
    fees: () => ({ up: 0, ip: .21, lbl: 'IVA sobre juros (21%)' }),
    prod: [['Caja de ahorro remunerada', 25], ['Plazo fijo', 30], ['Plazo fijo UVA (inflação+1%)', 26]],
    note: 'Com inflação alta, o que importa é ganhar <b>acima da inflação</b> (vê o "valor real"). Plazo fijo em pesos é isento para pessoas. Créditos cotam <b>TNA</b>; o custo real é o <b>CFT</b>, com IVA de 21% sobre os juros.' }),
  AO: P({ cur: 'AOA', sym: 'Kz', k: 1000, inf: 18, dep: 15, ret: 18, real: 3, loan: 25, wage: 1500, tax: g => .1 * pos(g), taxL: 'IAC 10%',
    prod: [['Depósito a prazo', 15], ['Bilhetes do Tesouro', 17], ['Obrigações do Tesouro', 18]],
    note: 'Juros de depósitos e títulos pagam <b>IAC de 10%</b>. Com a inflação alta, compara sempre com o valor real. Referência: Bilhetes e Obrigações do Tesouro.' }),
  MZ: P({ cur: 'MZN', sym: 'MT', k: 70, inf: 4.5, dep: 9, ret: 12, real: 5, loan: 22, wage: 100, tax: g => .2 * pos(g), taxL: 'IRPS 20% retido',
    prod: [['Depósito a prazo', 9], ['Bilhetes do Tesouro', 11], ['Obrigações do Tesouro', 14]],
    note: 'Juros pagam <b>IRPS de 20%</b> retido na fonte. Referência: Bilhetes e Obrigações do Tesouro.' }),
  CV: P({ cur: 'CVE', sym: 'CVE', k: 110, inf: 2, dep: 2, ret: 6, loan: 10, wage: 500, tax: g => .2 * pos(g), taxL: '20% retido',
    prod: [['Depósito a prazo', 2], ['Títulos do Tesouro', 3.5], ['Bolsa (BVC)', 6]],
    note: 'O escudo está ligado ao euro (110,265 CVE = 1 €). Juros pagam imposto retido na fonte (aqui ~20%).' })
};
const cc = () => (OS.Country ? OS.Country.code() : 'PT');
/* perfil do país com os valores AO VIVO por cima (inflação, depósitos, crédito, produtos) quando já foram obtidos */
let FC = null;
const F = () => { const c = cc(), b = FP[c] || FP.PT, L = OS.LiveRates && OS.LiveRates.vals(c); if (!L) return b; if (FC && FC.c === c && FC.L === L) return FC.o;
  const o = Object.assign({}, b, { live: L }), r = (x, d = 2) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);
  if (L.inf) o.inf = r(L.inf.v, 1); if (L.dep) o.dep = r(L.dep.v); if (L.loan) o.loan = r(L.loan.v);
  o.prod = b.prod.map((p, i) => L.prod && L.prod[i] ? [p[0], r(L.prod[i].v), p[2]] : p);
  FC = { c, L, o }; return o; };
OS.FinCountry = { FP, get: F };
const nice = v => { if (!v) return 0; const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.abs(v))) - 1)); return Math.round(v / p) * p; };
const M = (v, o = {}) => { const f = F(), n = Number(v) || 0, d = o.dec ?? 2; return (o.sign && n > 0 ? '+' : '') + (n < 0 ? '−' : '') + f.sym + ' ' + Math.abs(n).toLocaleString(f.loc, { minimumFractionDigits: d, maximumFractionDigits: d }); };
const MK = v => { const s = F().sym, a = Math.abs(v), g = v < 0 ? '−' : ''; return a >= 1e9 ? g + s + U.r1(a / 1e9) + 'B' : a >= 1e6 ? g + s + U.r1(a / 1e6) + 'M' : a >= 1e4 ? g + s + Math.round(a / 1e3) + 'k' : g + s + Math.round(a); };
const pp = v => (+v).toLocaleString('pt-PT', { maximumFractionDigits: 2 }) + '%';
const SIMS = [['juros', 'Juros compostos'], ['emprestimo', 'Empréstimo'], ['parcelado', 'Parcelado vs à vista'], ['compra', 'Impacto de uma compra'], ['meta', 'Meta financeira'], ['independencia', 'Independência financeira'], ['taxas', 'Comparar taxas'], ['inflacao', 'Inflação']];
const skey = k => cc() === 'PT' ? k : k + '_' + cc(); // cada país guarda os seus valores
const sv = (k, d) => Object.assign({}, d, OS.ui['sim_' + skey(k)] || {});
const LIVE = { juros: { inf: 'inf' }, emprestimo: { r: 'loan' }, parcelado: { r: 'dep' }, meta: { r: 'dep' }, inflacao: { inf: 'inf' }, taxas: { r1: 'p0', r2: 'p1', r3: 'p2' } };
const isLive = (k, fld) => { const L = F().live, src = (LIVE[k] || {})[fld]; if (!L || !src) return false; const st = OS.ui['sim_' + skey(k)]; if (st && st[fld] != null) return false; return src[0] === 'p' && src.length === 2 ? !!(L.prod && L.prod[src[1]]) : !!L[src]; };
const inp = (k, f, l, v, unit = '', step = 'any') => { const cur = unit === '€', sym = F().sym; if (isLive(k, f)) l += ' <span class="lv-tag">ao vivo</span>'; return `<div class="fld"><label for="s_${k}_${f}">${l}</label><div class="inp-wrap">${cur ? `<span>${sym}</span>` : ''}<input id="s_${k}_${f}" type="number" step="${step}" inputmode="decimal" value="${v}" data-sim="${skey(k)}.${f}" data-fk="sim${k}${f}">${unit && !cur ? `<span>${unit}</span>` : ''}</div></div>`; };
/* custo efetivo de um crédito (TAEG / CET / APR…): taxa que iguala o dinheiro recebido ao que se paga */
const effRate = (got, flows) => { let lo = 0, hi = 1; for (let it = 0; it < 80; it++) { const x = (lo + hi) / 2, v = flows.reduce((s, c, m) => s + c / Math.pow(1 + x, m + 1), 0); if (v > got) lo = x; else hi = x; } return Math.pow(1 + (lo + hi) / 2, 12) - 1; };
const SC = OS.SimCalc = { effRate, FP };
const liveBar = f => { const LR = OS.LiveRates, c = cc(); if (!LR) return ''; LR.fetch(c); const st = LR.state(c), L = f.live, it = (l, x, unit = '%') => x ? `<span class="lv-i"><b>${l} ${pp(x.v)}${unit === '%' ? '' : ' ' + unit}</b> <small>${esc(LR.when2(x.d))} · ${esc(x.s)}</small></span>` : '';
  const items = L ? [it('Inflação', L.inf), it(L.depL || 'Depósitos', L.dep), L.raw && L.raw.selic ? it('Selic', L.raw.selic) : '', L.raw && L.raw.dfr ? it('Taxa do BCE', L.raw.dfr) : '', it(c === 'BR' ? 'Crédito pessoal' : 'Crédito ao consumo', L.loan, f.mo ? 'a.m.' : ''), L.raw && L.raw.cons ? it('Consignado INSS', L.raw.cons, 'a.m.') : ''].join('') : '';
  const head = st === 'busy' ? `<span class="lv-dot busy"></span>A atualizar as taxas ao vivo…` : st === 'live' ? `<span class="lv-dot"></span>Ao vivo` : st === 'stale' ? `<span class="lv-dot off"></span>Sem ligação · últimos valores obtidos ${LR.when(c) ? U.fmtD(U.iso(new Date(LR.when(c)))) : ''}` : st === 'fail' ? `<span class="lv-dot off"></span>Sem ligação · a usar valores de referência` : `<span class="lv-dot busy"></span>A obter as taxas ao vivo…`;
  return `<div class="lv-bar"><span class="lv-h">${head}</span>${items}<button class="btn xs ghost" data-act="ratesRefresh" ${st === 'busy' ? 'disabled' : ''}>Atualizar</button></div>`; };
V.simuladores = sub => {
  const k = sub || 'juros'; const p = OS.one('profile'); const pr = I.finProjection(); const f = F(), $ = v => nice(v * f.k);
  let inH = '', out = '';
  if (k === 'juros') { const s = sv(k, { p0: Math.round(OS.Inv.value()) || $(1000), pmt: $(150), r: f.ret, y: 20, inf: f.inf });
    const rows = []; let v = +s.p0, c = +s.p0, w = +s.p0, wtPaid = 0; for (let y = 0; y <= s.y; y++) { rows.push({ y, v, c, real: v / Math.pow(1 + s.inf / 100, y), w }); for (let m = 0; m < 12; m++) { v = v * (1 + s.r / 100 / 12) + +s.pmt; w = w * (1 + s.r / 100 / 12) + +s.pmt; c += +s.pmt; } if (f.wt) { const t = Math.max(0, w - f.wtFree * f.k) * f.wt; w -= t; wtPaid += t; } }
    const last = rows[rows.length - 1], gain = last.w - last.c, tx = f.tax(gain, +s.y), net = last.w - tx, taxT = tx + wtPaid;
    inH = inp(k, 'p0', 'Valor inicial', s.p0, '€') + inp(k, 'pmt', 'Aporte mensal', s.pmt, '€') + inp(k, 'r', 'Rentabilidade anual', s.r, '%') + inp(k, 'y', 'Anos', s.y, 'anos', 1) + inp(k, 'inf', 'Inflação anual', s.inf, '%');
    out = `<div class="kpis">${UI.kpi('Valor final', M(last.v, { dec: 0 }), f.mo ? '≈ ' + pp(U.r2((Math.pow(1 + s.r / 100, 1 / 12) - 1) * 100)) + ' ao mês' : '')}${UI.kpi('Total aportado', M(last.c, { dec: 0 }))}${UI.kpi('Juros ganhos', M(last.v - last.c, { dec: 0 }), '', { tone: 'pos' })}${UI.kpi('Líquido de impostos', M(net, { dec: 0 }), `${f.taxL}${taxT > 0 ? ' · −' + M(taxT, { dec: 0 }) : ''}`, { tone: 'pos' })}${UI.kpi('Em dinheiro de hoje', M(net / Math.pow(1 + s.inf / 100, s.y), { dec: 0 }), 'líquido, descontada a inflação')}</div>${C.mount({ type: 'line', labels: rows.map(r => 'a' + r.y), series: [{ name: 'Valor', data: rows.map(r => r.v) }, { name: 'Aportado', data: rows.map(r => r.c), color: 'var(--mut)', dash: 1 }, { name: 'Valor real', data: rows.map(r => r.real), color: 'var(--c8)' }], fmt: MK }, 280)}`; }
  if (k === 'emprestimo') { const s = sv(k, { pv: $(10000), r: f.loan, n: f.mo ? 48 : 60, sys: 'price' }); const i = f.mo ? s.r / 100 : s.r / 100 / 12; let bal = +s.pv, tot = 0, totI = 0, first = 0, lastP = 0; const ints = [], amos = [], pays = [];
    for (let m = 1; m <= s.n; m++) { let pay, int = bal * i, amo; if (s.sys === 'sac') { amo = s.pv / s.n; pay = amo + int; } else { pay = i ? s.pv * i / (1 - Math.pow(1 + i, -s.n)) : s.pv / s.n; amo = pay - int; } bal = Math.max(0, bal - amo); tot += pay; totI += int; if (m === 1) first = pay; lastP = pay; ints.push(int); amos.push(amo); pays.push(pay); }
    const fe = f.fees ? f.fees(+s.pv, +s.n, ints, amos) : null, up = fe ? fe.up : 0, ip = fe ? fe.ip : 0, taxes = up + U.sum(ints) * ip;
    const eff = s.pv > 0 && s.n > 0 ? effRate(s.pv - up, pays.map((x, m) => x + ints[m] * ip)) : 0, yrs = Math.ceil(s.n / 12);
    inH = inp(k, 'pv', 'Valor pedido', s.pv, '€') + inp(k, 'r', f.rate, s.r, f.mo ? '%/mês' : '%') + inp(k, 'n', 'Prazo', s.n, 'meses', 1) + `<div class="fld"><label>Sistema</label>${UI.seg('sim_' + skey('emprestimo') + '.sys', [['price', f.sys[0]], ['sac', f.sys[1]]], s.sys)}</div>`;
    out = `<div class="kpis">${UI.kpi(s.sys === 'sac' ? '1.ª prestação' : 'Prestação', M(first, { dec: first >= 1000 ? 0 : 2 }))}${s.sys === 'sac' ? UI.kpi('Última prestação', M(lastP, { dec: lastP >= 1000 ? 0 : 2 })) : ''}${UI.kpi('Total pago', M(tot + taxes, { dec: 0 }), taxes ? 'inclui ' + M(taxes, { dec: 0 }) + ' de ' + fe.lbl : '')}${UI.kpi('Juros totais', M(totI, { dec: 0 }), U.pct(totI / s.pv) + ' do valor pedido', { tone: 'neg' })}${UI.kpi(f.eff + ' ao ano (aprox.)', U.pct(eff, 1), f.mo ? 'sem IOF seria ' + U.pct(Math.pow(1 + i, 12) - 1, 1) : 'custo real com ' + (fe ? fe.lbl : 'juros compostos'), { tone: 'warn' })}${UI.kpi('Peso no rendimento', Fin.recurIncome() ? U.pct(first / Fin.recurIncome()) : '—', 'da receita recorrente')}</div>${C.mount({ type: 'bar', stacked: true, labels: Array.from({ length: yrs }, (_, y) => 'ano ' + (y + 1)), series: [{ name: 'Amortização', data: Array.from({ length: yrs }, (_, y) => U.sum(amos.slice(y * 12, y * 12 + 12))), color: 'var(--accent)' }, { name: 'Juros', data: Array.from({ length: yrs }, (_, y) => U.sum(ints.slice(y * 12, y * 12 + 12))), color: 'var(--neg)' }], fmt: MK }, 260)}`; }
  if (k === 'parcelado') { const s = sv(k, f.mo ? { cash: 2700, n: 10, inst: 300, r: f.dep } : { cash: $(1000), n: 10, inst: $(105), r: f.dep }); const i = s.r / 100 / 12; const pv = i ? s.inst * (1 - Math.pow(1 + i, -s.n)) / i : s.inst * s.n; const tot = s.inst * s.n;
    let eff = 0; if (tot > s.cash) { let lo = 0, hi = 1; for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; const v = s.inst * (1 - Math.pow(1 + mid, -s.n)) / mid; if (v > s.cash) lo = mid; else hi = mid; } eff = Math.pow(1 + (lo + hi) / 2, 12) - 1; }
    inH = inp(k, 'cash', 'Preço à vista', s.cash, '€') + inp(k, 'n', 'Nº de parcelas', s.n, '', 1) + inp(k, 'inst', 'Valor de cada parcela', s.inst, '€') + inp(k, 'r', 'Rendimento do teu dinheiro parado', s.r, '%/ano');
    out = `<div class="kpis">${UI.kpi('Total parcelado', M(tot))}${UI.kpi('Diferença nominal', M(tot - s.cash, { sign: 1 }), '', { tone: tot > s.cash ? 'neg' : 'pos' })}${UI.kpi('Valor presente das parcelas', M(pv), 'descontado a ' + s.r + '%/ano')}${UI.kpi('Juro implícito', tot > s.cash ? U.pct(eff, 1) + '/ano' + (f.mo ? ' · ' + U.pct(Math.pow(1 + eff, 1 / 12) - 1, 2) + ' a.m.' : '') : 'sem juros')}</div>
    <div class="note">Em valor presente, parcelar custa <b>${M(pv)}</b> contra <b>${M(s.cash)}</b> à vista: ${pv < s.cash ? 'parcelar sai mais barato em ' + M(s.cash - pv) : 'pagar à vista sai mais barato em ' + M(pv - s.cash)}, assumindo que o dinheiro rende ${s.r}%/ano enquanto não o gastas.${f.mo ? ' No "parcelado sem juros" com desconto à vista, o juro está escondido no preço: o juro implícito mostra quanto é.' : ''} A decisão é tua: pesa também o risco de ficar com compromissos mensais.</div>`; }
  if (k === 'compra') { const s = sv(k, { price: $(1200), hourly: U.num(p.hourly) || Fin.hourly() || f.wage, save: Math.max(0, Math.round(pr.monthlyNet)) || $(200), r: f.ret });
    inH = inp(k, 'price', 'Preço', s.price, '€') + inp(k, 'hourly', 'Quanto ganhas por hora', s.hourly, '€') + inp(k, 'save', 'Quanto poupas por mês', s.save, '€') + inp(k, 'r', 'Rentabilidade alternativa', s.r, '%/ano');
    const yrs = [0, 1, 3, 5, 10, 20];
    out = `<div class="kpis">${UI.kpi('Horas de trabalho', U.nf(s.price / s.hourly, 1) + ' h', U.nf(s.price / s.hourly / 8, 1) + ' dias de 8 h')}${UI.kpi('Meses de poupança', s.save ? U.nf(s.price / s.save, 1) : '—')}${UI.kpi('Custo de oportunidade 10 anos', M(s.price * Math.pow(1 + s.r / 100, 10), { dec: 0 }), 'se investisses em vez de gastar')}${UI.kpi('Em dinheiro de hoje', M(s.price * Math.pow(1 + s.r / 100, 10) / Math.pow(1 + f.inf / 100, 10), { dec: 0 }), 'descontada a inflação de ' + pp(f.inf))}</div>${C.mount({ type: 'bar', labels: yrs.map(y => y + ' anos'), series: [{ name: 'Valor se investido', data: yrs.map(y => s.price * Math.pow(1 + s.r / 100, y)), color: 'var(--c2)' }], fmt: MK }, 240)}<div class="note">Premissa: rentabilidade constante de ${s.r}%/ano, sem novos aportes, antes de impostos.</div>`; }
  if (k === 'meta') { const s = sv(k, { target: U.num(p.emergencyTarget) || $(1000), cur: Math.round(Fin.reserve()), months: 12, r: f.dep }); const i = s.r / 100 / 12, fvCur = s.cur * Math.pow(1 + i, s.months), need = Math.max(0, s.target - fvCur); const pmt = i ? need * i / (Math.pow(1 + i, s.months) - 1) : need / s.months;
    const path = []; let v = +s.cur; for (let m = 0; m <= s.months; m++) { path.push(v); v = v * (1 + i) + pmt; }
    inH = inp(k, 'target', 'Valor da meta', s.target, '€') + inp(k, 'cur', 'Já tenho', s.cur, '€') + inp(k, 'months', 'Prazo', s.months, 'meses', 1) + inp(k, 'r', 'Rentabilidade', s.r, '%/ano');
    out = `<div class="kpis">${UI.kpi('Poupar por mês', M(pmt))}${UI.kpi('Por semana', M(pmt * 12 / 52))}${UI.kpi('Do teu saldo mensal atual', pr.monthlyNet > 0 ? U.pct(pmt / pr.monthlyNet) : '—', pr.monthlyNet > 0 ? 'saldo médio ' + M(pr.monthlyNet) : 'sem saldo positivo registado')}${UI.kpi('Meta em dinheiro de hoje', M(s.target / Math.pow(1 + f.inf / 100, s.months / 12), { dec: 0 }), 'com inflação de ' + pp(f.inf))}</div>${C.mount({ type: 'line', labels: path.map((_, m) => 'm' + m), series: [{ name: 'Acumulado', data: path }], target: +s.target, targetLabel: 'meta', fmt: MK }, 250)}`; }
  if (k === 'independencia') { const s = sv(k, { exp: Math.round(Fin.avgMonthly(3, 'exp')) || $(900), inv: Math.round(OS.Inv.value()), pmt: $(200), r: f.real, wr: 4 }); const fi = s.exp * 12 / (s.wr / 100); const i = s.r / 100 / 12; let v = +s.inv, m = 0; const path = [v]; while (v < fi && m < 12 * 60) { v = v * (1 + i) + +s.pmt; m++; if (m % 12 === 0) path.push(v); }
    inH = inp(k, 'exp', 'Despesas mensais', s.exp, '€') + inp(k, 'inv', 'Património investido', s.inv, '€') + inp(k, 'pmt', 'Aporte mensal', s.pmt, '€') + inp(k, 'r', 'Rentabilidade real', s.r, '%/ano') + inp(k, 'wr', 'Taxa de levantamento', s.wr, '%');
    out = `<div class="kpis">${UI.kpi('Número da independência', M(fi, { dec: 0 }), s.wr + '% de levantamento anual')}${UI.kpi('Tempo até lá', m >= 720 ? '60+ anos' : Math.floor(m / 12) + ' anos ' + (m % 12) + ' m')}${UI.kpi('Já percorrido', U.pct(s.inv / fi, 1))}</div>${C.mount({ type: 'line', labels: path.map((_, y) => 'a' + y), series: [{ name: 'Património', data: path }], target: fi, targetLabel: 'independência', fmt: MK }, 260)}<div class="note">Premissas: rentabilidade real constante (já descontada a inflação de ~${pp(f.inf)}), aportes constantes e regra dos ${s.wr}%. Impostos: ${f.taxL}. É uma ordem de grandeza, não uma previsão.</div>`; }
  if (k === 'taxas') { const pd = f.prod, s = sv(k, { p0: $(1000), pmt: $(100), y: 15, r1: pd[0][1], r2: pd[1][1], r3: pd[2][1] }); const ser = r => { const out2 = []; let v = +s.p0; for (let y = 0; y <= s.y; y++) { out2.push(v); for (let m = 0; m < 12; m++) v = v * (1 + r / 100 / 12) + +s.pmt; } return out2; };
    const contrib = +s.p0 + s.pmt * 12 * s.y, netOf = (fv, j) => { const ex = pd[j][2], g = fv - contrib; return fv - (ex === 1 ? 0 : ex ? Math.max(0, g) * ex : f.tax(g, +s.y)); };
    inH = inp(k, 'p0', 'Valor inicial', s.p0, '€') + inp(k, 'pmt', 'Aporte mensal', s.pmt, '€') + inp(k, 'y', 'Anos', s.y, 'anos', 1) + inp(k, 'r1', pd[0][0], s.r1, '%/ano') + inp(k, 'r2', pd[1][0], s.r2, '%/ano') + inp(k, 'r3', pd[2][0], s.r3, '%/ano');
    const sr = [ser(s.r1), ser(s.r2), ser(s.r3)], rs = [s.r1, s.r2, s.r3];
    out = `<div class="kpis">${sr.map((a, j) => UI.kpi(`${esc(pd[j][0])} · ${pp(rs[j])}`, M(a[a.length - 1], { dec: 0 }), 'líquido: ' + M(netOf(a[a.length - 1], j), { dec: 0 }) + (pd[j][2] === 1 ? ' (isento)' : ''))).join('')}</div>${C.mount({ type: 'line', labels: sr[0].map((_, y) => 'a' + y), series: sr.map((a, j) => ({ name: pd[j][0], data: a, color: ['var(--mut)', 'var(--accent)', 'var(--c2)'][j] })), fmt: MK, area: false }, 280)}<div class="note">${f.live && Object.keys(f.live.prod || {}).length ? 'Taxas ao vivo onde há fonte oficial (' + Object.keys(f.live.prod).map(i => esc(f.prod[i][0])).join(', ') + '); as outras são referências aproximadas' : 'Taxas de referência aproximadas'} para ${esc(OS.Country ? OS.Country.get()[1] : 'Portugal')} — confirma as do teu banco/corretora e muda à vontade. Impostos: ${f.taxL}.</div>`; }
  if (k === 'inflacao') { const s = sv(k, { amt: $(1000), inf: f.inf, y: 20 }); const ys = Array.from({ length: +s.y + 1 }, (_, y) => y);
    inH = inp(k, 'amt', 'Valor', s.amt, '€') + inp(k, 'inf', 'Inflação anual', s.inf, '%') + inp(k, 'y', 'Anos', s.y, 'anos', 1);
    out = `<div class="kpis">${UI.kpi('Poder de compra daqui a ' + s.y + ' anos', M(s.amt / Math.pow(1 + s.inf / 100, s.y), { dec: 0 }), 'o que ' + M(s.amt, { dec: 0 }) + ' compram')}${UI.kpi('Preço equivalente no futuro', M(s.amt * Math.pow(1 + s.inf / 100, s.y), { dec: 0 }), 'o que hoje custa ' + M(s.amt, { dec: 0 }))}${UI.kpi('Perda', U.pct(1 - 1 / Math.pow(1 + s.inf / 100, s.y)), '', { tone: 'neg' })}${UI.kpi('Para não perder', pp(s.inf) + ' ao ano', 'líquido de impostos; referência local: ' + esc(f.prod[1][0]) + ' ' + pp(f.prod[1][1]))}</div>${C.mount({ type: 'line', labels: ys.map(y => 'a' + y), series: [{ name: 'Poder de compra', data: ys.map(y => s.amt / Math.pow(1 + s.inf / 100, y)), color: 'var(--neg)' }, { name: 'Preço equivalente', data: ys.map(y => s.amt * Math.pow(1 + s.inf / 100, y)), color: 'var(--c8)' }], fmt: MK }, 260)}`; }
  const cn = OS.Country ? OS.Country.get()[1] : 'Portugal', other = f.cur !== 'EUR' && (OS.Inv.value() || Fin.reserve());
  return UI.head('Simuladores', 'Muda as variáveis e vê o resultado. Moeda, taxas, impostos e regras seguem o país escolhido.', '', 'Dinheiro') +
  `<div class="sim-top"><div class="ctry-bar sim-cty">${OS.Country ? OS.Country.btn() : ''}<small class="mut">${esc(cn)} · ${f.cur} · ${esc(f.taxL)}</small></div>${liveBar(f)}
  <div class="note sim-note">${f.note}${other ? ' <br><small class="mut">Os valores que vêm dos teus dados (investimentos, reserva) aparecem como os registaste, sem conversão de moeda.</small>' : ''}</div></div>` +
  UI.tabs('simuladores', SIMS.map(([a, b]) => [a === 'juros' ? '' : a, b]), sub) +
  `<div class="sim"><div class="pn sim-in">${inH}<button class="btn ghost sm" data-act="simReset" data-k="${skey(k)}">Repor valores</button></div><div class="pn sim-out">${out}</div></div>`;
};
A.simReset = b => { delete OS.ui['sim_' + b.dataset.k]; OS.setUI('sim_' + b.dataset.k, undefined); };
})();
