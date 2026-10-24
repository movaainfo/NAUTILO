/* PRUMO — Imóveis e Renda passiva (dentro de Investimentos).
   · Imóveis: a casa onde vives e os imóveis para arrendar também são investimento. Valor de mercado, a tua parte, crédito,
     capital próprio, valorização desde a compra, rendas, despesas (IMI, condomínio, seguro, manutenção, gestão), rentabilidade
     bruta e líquida, cash flow depois da prestação e o real (movimentos das Finanças ligados ao imóvel).
   · Renda passiva: tudo o que te paga sem trabalhares — dividendos, JCP, rendimentos de FII, juros, rendas de imóveis,
     aluguer de ações e negócios — por mês e por fonte, meta, % das despesas coberto, projeção e caminho para a liberdade financeira.
   Os imóveis entram no património total (Visão de Investimentos, Painel e Finanças). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, C = OS.C, A = OS.act, L = OS.L, esc = U.esc, Inv = OS.Inv, IX = OS.InvX, T = IX.T, Fin = OS.Fin;
const n = v => U.num(v) || 0, M = (v, o) => IX.M(v, o), MK = v => IX.MK(v), cfg = () => OS.one('invcfg');
const tone = v => v > 0 ? 'pos' : v < 0 ? 'neg' : 'mut', pctS = (v, d = 1) => (v >= 0 ? '+' : '') + U.pct(v, d);
const F = (k, l, t = 'text', x = {}) => Object.assign({ k, l, t }, x);

/* ================= dados ================= */
L.RTYPE = ['Habitação própria', 'Para arrendar', 'Casa de férias', 'Terreno', 'Loja / escritório', 'Garagem / arrecadação', 'Outro'];
L.RUSE = ['Habitação própria e permanente', 'Arrendado', 'Arrendado por quartos', 'Alojamento local', 'Vazio', 'Uso próprio (secundário)'];
const rented = r => /Arrendado|Alojamento/.test(r.uso || '');
OS.S.props = { label: 'Imóvel', title: r => r.name, fields: [
  F('name', 'Nome', 'text', { req: 1, ph: 'Ex.: Apartamento em Aveiro, T2 para arrendar, Terreno em Minas' }),
  F('tipo', 'Tipo', 'sel', { o: L.RTYPE }), F('uso', 'Situação', 'sel', { o: L.RUSE }),
  F('city', 'Cidade'), F('country', 'País', 'text', { list: () => ['Portugal', 'Brasil', 'Espanha', 'França'] }), F('area', 'Área (m²)', 'num'),
  F('share', 'A tua parte (%)', 'num', { h: '100 se é só teu; 50 se é a meias.' }), F('currency', 'Moeda', 'sel', { o: L.CUR }),
  F('value', 'Valor de mercado hoje', 'money', { req: 1, h: 'Estimativa realista (Idealista, Imovirtual, avaliação do banco; ZAP no Brasil). Atualiza 1 ou 2 vezes por ano: o histórico fica guardado.' }), F('valueDate', 'Data do valor', 'date'),
  F('buyDate', 'Data de compra', 'date'), F('buyPrice', 'Preço de compra', 'money'), F('buyCosts', 'Custos de compra', 'money', { h: 'IMT, Imposto do Selo, escritura, registo e comissões (no Brasil: ITBI e cartório).' }), F('works', 'Obras de valorização', 'money', { h: 'Obras que aumentaram o valor: contam para a mais-valia quando venderes.' }),
  { k: 'debt', l: 'Crédito registado em Finanças → Dívidas', t: 'rel', c: 'debts', h: 'Se já registaste o crédito em Dívidas, escolhe-o: o saldo vem de lá e não conta duas vezes.' },
  F('loanBal', 'Crédito à habitação em dívida', 'money', { show: r => !r.debt }), F('loanRate', 'Taxa do crédito (TAN %)', 'num'), F('loanPay', 'Prestação mensal', 'money'), F('loanEnd', 'Fim do crédito', 'date'), F('loanBank', 'Banco do crédito', 'text', { list: () => (L.BANKS || []).map(b => b[0]) }),
  F('rent', 'Renda mensal', 'money', { show: r => rented(r) || r.tipo === 'Para arrendar' || r.uso === 'Vazio' }), F('occ', 'Meses arrendado por ano', 'num', { show: rented, h: '12 = sempre ocupado. Alojamento local: meses equivalentes de ocupação.' }),
  F('tenant', 'Inquilino', 'text', { show: rented }), F('contractEnd', 'Fim do contrato', 'date', { show: rented }), F('rentTax', 'Retenção na fonte da renda (%)', 'num', { show: rented, h: 'Quando o inquilino é uma empresa retém 25% em Portugal. Particular: 0.' }),
  F('imi', 'IMI por ano', 'money', { h: 'IPTU no Brasil.' }), F('condo', 'Condomínio por mês', 'money'), F('ins', 'Seguro por ano', 'money'), F('maint', 'Manutenção por ano (estimativa)', 'money'),
  F('mgmt', 'Gestão / imobiliária (% da renda)', 'num', { show: rented }), F('other', 'Outros custos por ano', 'money'), F('notes', 'Notas', 'area', { rows: 2 })
], defaults: () => ({ tipo: 'Habitação própria', uso: 'Habitação própria e permanente', country: 'Portugal', share: 100, currency: 'EUR', occ: 12, valueDate: U.today() }),
  after: r => { const h = (r.hist || []).slice(), last = h[h.length - 1]; if (n(r.value) && (!last || last.v !== n(r.value))) { h.push({ d: r.valueDate || U.today(), v: n(r.value) }); OS.upd('props', r.id, { hist: h.slice(-40) }, { silent: true }); } } };
OS.S.props.detail = r => { const p = IX.prop(r); return `<div class="pn tint"><dl class="kv"><dt>Capital próprio</dt><dd>${M(p.eq, { dec: 0 })}</dd><dt>Valorização</dt><dd class="${tone(p.gain)}">${p.basis ? M(p.gain, { sign: 1, dec: 0 }) + ' (' + pctS(p.gainP) + ')' : '—'}</dd>${p.rentY ? `<dt>Rentabilidade líquida</dt><dd>${U.pct(p.ny, 2)} ao ano</dd><dt>Cash flow</dt><dd class="${tone(p.cf)}">${M(p.cf / 12, { sign: 1, dec: 0 })}/mês</dd>` : ''}</dl></div>`; };

// movimentos das Finanças podem ficar ligados a um imóvel (rendas recebidas, IMI, condomínio, obras…)
(() => { const fs = OS.S.transactions.fields; if (fs.some(f => f.k === 'prop')) return; const i = fs.findIndex(f => f.k === 'tags'); fs.splice(i < 0 ? fs.length : i, 0, { k: 'prop', l: 'Imóvel', t: 'rel', c: 'props', show: r => r.type !== 'Transferência' && OS.all('props').length > 0, h: 'Renda recebida, IMI, condomínio, seguro, obras… ficam na conta do imóvel.' }); })();
OS.on('ready', () => { try { const f = OS.one('fin'), c = f.cats; let ch = false;
  if (c.Receita && !c.Receita.Rendas) { c.Receita.Rendas = ['Renda recebida', 'Alojamento local', 'Caução']; ch = true; }
  if (c.Despesa && c.Despesa.Casa) ['IMI', 'Condomínio', 'Seguro da casa', 'Obras', 'Prestação do crédito'].forEach(s => { if (!c.Despesa.Casa.includes(s)) { c.Despesa.Casa.push(s); ch = true; } });
  if (ch) OS.touch('fin'); } catch (e) { } });

/* ================= cálculos ================= */
const isFinTx = t => /Prestação|crédito/i.test(t.sub || '') || t.cat === 'Dívidas' || !!t.debt;
IX.prop = r => { const sh = (r.share === '' || r.share == null ? 100 : n(r.share)) / 100, fx = Inv.fx(r.currency), val = n(r.value) * sh * fx;
  const d = r.debt && OS.get('debts', r.debt), loan = d ? Fin.debtBal(d) : n(r.loanBal) * fx, basis = (n(r.buyPrice) + n(r.buyCosts) + n(r.works)) * sh * fx, eq = val - loan;
  const R = rented(r), occ = r.occ === '' || r.occ == null ? 12 : n(r.occ), rentY = R ? n(r.rent) * occ * sh * fx : 0;
  const fixed = (n(r.imi) + n(r.condo) * 12 + n(r.ins) + n(r.maint) + n(r.other)) * sh * fx, opex = fixed + rentY * n(r.mgmt) / 100;
  const noi = rentY - opex, debtY = n(r.loanPay) * 12 * (d ? 1 : fx), interestY = loan * n(r.loanRate) / 100, cf = noi - debtY;
  const yrs = r.buyDate ? Math.max(U.diff(U.today(), r.buyDate) / 365, 0) : 0, gain = basis ? val - basis : 0, cagr = basis && yrs >= 1 && val > 0 ? Math.pow(val / basis, 1 / yrs) - 1 : null;
  const from = U.addDays(U.today(), -365), tx = OS.all('transactions').filter(t => t.prop === r.id && t.date >= from && t.date <= U.today());
  const realIn = U.sum(tx.filter(t => t.type === 'Receita'), t => n(t.amount)), realFin = U.sum(tx.filter(t => t.type === 'Despesa' && isFinTx(t)), t => n(t.amount)), realOut = U.sum(tx.filter(t => t.type === 'Despesa' && !isFinTx(t)), t => n(t.amount));
  return { r, sh, val, loan, inDebts: !!d, basis, eq, rented: R, occ, rentY, fixed, opex, noi, debtY, interestY, cf, gy: val ? rentY / val : 0, ny: val ? noi / val : 0, coc: eq > 0 ? cf / eq : null, ltv: val ? loan / val : 0, gain, gainP: basis ? gain / basis : null, cagr, yrs,
    tx, realIn, realOut, realFin, realNoi: realIn - realOut, costMonth: (fixed + interestY) / 12, perM2: n(r.area) ? n(r.value) / n(r.area) : null }; };
IX.realEstate = () => { const P = OS.all('props').map(IX.prop), legacy = IX.positions().filter(p => p.a.cls === 'Imóvel');
  return { P, legacy, val: U.sum(P, p => p.val), loan: U.sum(P, p => p.loan), loanOut: U.sum(P.filter(p => !p.inDebts), p => p.loan), eq: U.sum(P, p => p.eq), rentY: U.sum(P, p => p.rentY), noi: U.sum(P, p => p.noi), cf: U.sum(P, p => p.cf), basis: U.sum(P, p => p.basis), gain: U.sum(P, p => p.gain), legacyVal: U.sum(legacy, p => p.value) }; };
// os imóveis entram no património líquido em toda a app (o crédito registado em Dívidas já é descontado lá)
if (!Fin._nwRE) { const nw0 = Fin.netWorth; Fin.netWorth = () => { let x = nw0(); try { const R = IX.realEstate(); x += R.val - R.loanOut; } catch (e) { } return x; }; Fin._nwRE = 1; }

/* ---------- renda passiva ---------- */
const SRC = [['div', 'Dividendos e JCP', 'var(--pos)'], ['fii', 'Rendimentos de FII / REIT', '#f2a65a'], ['jur', 'Juros (renda fixa e contas)', '#a78bfa'], ['ren', 'Rendas de imóveis', '#fb7185'], ['alu', 'Aluguer de ações', '#5cc8e6'], ['neg', 'Negócios (lucros distribuídos)', '#fbbf24']];
IX.passive = (months = 24) => { const ms = Fin.months(months), by = {}; ms.forEach(m => { by[m] = { div: 0, fii: 0, jur: 0, ren: 0, alu: 0, neg: 0 }; });
  const fxOf = t => Inv.fx((OS.get('assets', t.asset) || {}).currency), net = t => (n(t.amount) - n(t.tax) - n(t.fees)) * fxOf(t);
  const K = { Dividendo: 'div', JCP: 'div', Rendimento: 'fii', Juros: 'jur', Aluguer: 'alu' }, hasInv = OS.all('invtx').some(t => IX.INC.has(t.type));
  OS.all('invtx').forEach(t => { const k = K[t.type], m = U.ym(t.date); if (k && by[m]) by[m][k] += net(t); });
  OS.all('transactions').forEach(t => { if (t.type !== 'Receita' || t.date > U.today()) return; const m = U.ym(t.date); if (!by[m]) return; const a = n(t.amount);
    if (t.prop || t.cat === 'Rendas') by[m].ren += a; else if (t.cat === 'Investimentos' && /juro/i.test(t.sub || '')) by[m].jur += a; else if (t.cat === 'Investimentos' && /divid/i.test(t.sub || '') && !hasInv) by[m].div += a; else if (t.cat === 'Mova' || /lucro/i.test(t.sub || '')) by[m].neg += a; });
  const tot = m => U.sum(Object.values(by[m]), x => x), last12 = ms.slice(-13, -1).length ? ms.slice(-12) : ms, y12 = U.sum(last12, tot), src12 = {}; SRC.forEach(([k]) => { src12[k] = U.sum(last12, m => by[m][k]); });
  const R = IX.realEstate(), estRent = R.P.some(p => p.rented) && !U.sum(last12, m => by[m].ren) ? U.sum(R.P, p => p.rentY * (1 - n(p.r.mgmt) / 100)) / 12 : 0;
  return { ms, by, tot, y12, avg: y12 / 12, src12, cur: tot(ms[ms.length - 1]), estRent }; };

/* ================= ecrã: Imóveis ================= */
const kv = (l, v, cls = '') => `<div><small>${l}</small><b class="mono ${cls}">${v}</b></div>`;
T.imoveis = () => { const R = IX.realEstate(), P = R.P;
  if (!P.length && !R.legacy.length) return `<div class="pn inv-on"><h3>${UI.ic('building')}Os teus imóveis</h3><p class="mut">A casa onde vives, um apartamento para arrendar, um terreno ou a tua parte na casa da família também são investimento. Regista o valor de mercado, o crédito (se houver), as rendas e as despesas: o Prumo calcula o capital próprio, a valorização, a rentabilidade e o cash flow, e junta tudo ao teu património.</p>
    <div class="row gap8" style="flex-wrap:wrap">${UI.addBtn('props', 'Adicionar a minha casa', { tipo: 'Habitação própria', uso: 'Habitação própria e permanente' }, 'pri')}${UI.addBtn('props', 'Imóvel para arrendar', { tipo: 'Para arrendar', uso: 'Arrendado', occ: 12 }, '')}${UI.addBtn('props', 'Terreno / outro', { tipo: 'Terreno', uso: 'Vazio' }, 'ghost')}</div></div>`;
  const rent = P.filter(p => p.rented);
  return `<div class="kpis">${UI.kpi('Valor dos imóveis', M(R.val + R.legacyVal, { dec: 0 }), `${P.length + R.legacy.length} imóvel(is) · a tua parte`)}${UI.kpi('Capital próprio', M(R.eq + R.legacyVal, { dec: 0 }), R.loan ? 'valor − crédito' : 'sem crédito')}${UI.kpi('Crédito em dívida', M(R.loan, { dec: 0 }), R.val ? 'LTV ' + U.pct(R.loan / R.val, 0) : '', { tone: R.loan ? 'warn' : '' })}${UI.kpi('Valorização', R.basis ? M(R.gain, { sign: 1, dec: 0 }) : '—', R.basis ? pctS(R.gain / R.basis) + ' desde a compra' : 'indica o preço de compra', { tone: tone(R.gain) })}${UI.kpi('Rendas por ano', M(R.rentY, { dec: 0 }), rent.length ? `líquido ${M(R.noi, { dec: 0 })} · ${U.pct(R.val ? R.noi / R.val : 0, 2)}` : 'sem imóveis arrendados')}${UI.kpi('Cash flow por mês', M(R.cf / 12, { sign: 1, dec: 0 }), 'depois de despesas e prestações', { tone: tone(R.cf) })}</div>
  <div class="row gap8" style="flex-wrap:wrap;margin-bottom:10px">${UI.addBtn('props', 'Imóvel', null, 'pri')}${UI.addBtn('transactions', 'Registar renda recebida', { type: 'Receita', cat: 'Rendas', sub: 'Renda recebida', prop: (rent[0] || P[0] || {}).r ? (rent[0] || P[0]).r.id : '' }, '')}${UI.addBtn('transactions', 'Registar despesa do imóvel', { type: 'Despesa', cat: 'Casa', sub: 'IMI', prop: P[0] ? P[0].r.id : '' }, 'ghost')}</div>
  ${P.map(p => { const r = p.r, h = (r.hist || []).filter(x => x.v); return `<div class="pn re-c"><div class="pn-h"><div><h3 class="click" data-edit="props:${r.id}">${UI.ic('building')}${esc(r.name)}</h3><span class="mut" style="font-size:12.5px">${esc([r.tipo, r.uso, [r.city, r.country].filter(Boolean).join(', '), r.area ? U.nf(n(r.area)) + ' m²' : '', n(r.share) && n(r.share) !== 100 ? 'a tua parte: ' + U.nf(n(r.share)) + '%' : ''].filter(Boolean).join(' · '))}</span></div><button class="btn xs ghost" data-edit="props:${r.id}">Editar</button></div>
    <div class="re-g">${kv('Valor de mercado', M(p.val, { dec: 0 }))}${kv('Capital próprio', M(p.eq, { dec: 0 }))}${p.loan ? kv('Crédito', M(p.loan, { dec: 0 }), 'warn') : ''}${p.loan ? kv('LTV', U.pct(p.ltv, 0)) : ''}${p.basis ? kv('Valorização', M(p.gain, { sign: 1, dec: 0 }) + ' · ' + pctS(p.gainP), tone(p.gain)) : ''}${p.cagr != null ? kv('Valorização por ano', pctS(p.cagr), tone(p.cagr)) : ''}${p.perM2 ? kv('Preço por m²', IX.Mc(p.perM2, r.currency || 'EUR', 0)) : ''}
      ${p.rented ? kv('Renda por ano', M(p.rentY, { dec: 0 })) + kv('Despesas por ano', M(p.opex, { dec: 0 })) + kv('Rendimento líquido (NOI)', M(p.noi, { dec: 0 }), tone(p.noi)) + kv('Rentabilidade bruta', U.pct(p.gy, 2)) + kv('Rentabilidade líquida', U.pct(p.ny, 2)) + kv('Cash flow', M(p.cf / 12, { sign: 1, dec: 0 }) + '/mês', tone(p.cf)) + (p.coc != null ? kv('Retorno do capital próprio', U.pct(p.coc, 1)) : '')
      : kv('Custo de ter a casa', M(p.costMonth, { dec: 0 }) + '/mês') + (p.debtY ? kv('Prestação', M(p.debtY / 12, { dec: 0 }) + '/mês') : '')}
      ${p.tx.length ? kv('Real 12 meses (Finanças)', `${M(p.realIn, { dec: 0 })} entrou · ${M(p.realOut + p.realFin, { dec: 0 })} saiu`) : ''}</div>
    ${h.length >= 2 ? C.mount({ type: 'line', labels: h.map(x => U.fmtDS ? U.fmtDS(x.d) : x.d), series: [{ name: 'Valor', data: h.map(x => x.v * p.sh * Inv.fx(r.currency)) }], fmt: MK, min0: false }, 150) : ''}
    ${r.contractEnd && r.contractEnd >= U.today() && U.diff(r.contractEnd, U.today()) <= 90 ? `<div class="note">O contrato com ${esc(r.tenant || 'o inquilino')} acaba a ${U.fmtD(r.contractEnd)}: decide renovar ou atualizar a renda.</div>` : ''}
    ${p.rented && !p.tx.length ? `<p class="mut" style="font-size:12px;margin:6px 0 0">Ao registar as rendas e as despesas em Finanças com o campo <b>Imóvel</b>, aparece aqui o real (além da estimativa).</p>` : ''}</div>`; }).join('')}
  ${R.legacy.length ? `<div class="pn"><div class="pn-h"><h3>Imóveis registados como ativo</h3><span class="mut" style="font-size:12px">na Carteira</span></div><div class="list">${R.legacy.map(p => `<div class="li"><div class="li-t click" data-edit="assets:${p.a.id}"><b>${esc(p.a.name)}</b><small>registado como ativo · ${esc(p.a.broker || '')}</small></div><span class="mono">${M(p.value, { dec: 0 })}</span></div>`).join('')}</div><p class="mut" style="font-size:12px">Para veres rendas, despesas e crédito, regista-os aqui como imóvel (e apaga o ativo).</p></div>` : ''}
  <p class="mut" style="font-size:12px">Valores na tua parte e em ${IX.view()}. Rentabilidade líquida = (rendas − IMI, condomínio, seguro, manutenção e gestão) ÷ valor. Cash flow = rendimento líquido − prestações. O crédito à habitação conta no património líquido (não conta duas vezes se estiver em Dívidas).</p>`; };

/* ================= ecrã: Renda passiva ================= */
T.renda = () => { const Pv = IX.passive(24), S = IX.summary(), R = IX.realEstate(), exp = (Fin.avgMonthly && Fin.avgMonthly(3, 'exp')) || 0, meta = n(cfg().meta), proj = IX.projection ? IX.projection() : { total: 0, data: [], labels: [] };
  const avg = Pv.avg + Pv.estRent, cover = exp ? avg / exp : 0, invested = S.val + R.eq, yld = invested ? (Pv.y12 + Pv.estRent * 12) / invested : 0;
  const contrib = (() => { const c = Inv.contribByMonth ? Inv.contribByMonth(12) : []; return c.length ? U.sum(c, x => Math.max(0, x)) / 12 : 0; })();
  const need = exp ? exp * 12 / .04 : 0, yearsTo = (() => { if (!need || invested >= need) return invested >= need && need ? 0 : null; let v = invested, y = 0; const r = .05; while (v < need && y < 80) { v = v * (1 + r) + contrib * 12; y++; } return y >= 80 ? null : y; })();
  const src = SRC.map(([k, l, c]) => ({ l, v: Pv.src12[k] + (k === 'ren' ? Pv.estRent * 12 : 0), c })).filter(x => x.v > 0);
  return `<div class="kpis">${UI.kpi('Renda passiva por mês', M(avg), 'média dos últimos 12 meses' + (Pv.estRent ? ' (rendas estimadas)' : ''))}${UI.kpi('Últimos 12 meses', M(Pv.y12 + Pv.estRent * 12, { dec: 0 }), invested ? 'yield ' + U.pct(yld, 2) + ' do investido' : '')}${UI.kpi('Este mês', M(Pv.cur), U.fmtYM(Pv.ms[Pv.ms.length - 1]))}${UI.kpi('Despesas cobertas', exp ? U.pct(cover, 0) : '—', exp ? `${M(avg, { dec: 0 })} de ${M(exp, { dec: 0 })}/mês de despesas` : 'regista despesas para calcular', { tone: cover >= 1 ? 'pos' : '' })}${UI.kpi('Meta', meta ? U.pct(avg / meta, 0) : '—', meta ? `${M(avg, { dec: 0 })} de ${M(meta, { dec: 0 })}/mês` : 'define a meta em Proventos')}${UI.kpi('Liberdade financeira', yearsTo == null ? '—' : yearsTo === 0 ? 'atingida' : '~' + yearsTo + ' anos', need ? `precisas de ~${M(need, { dec: 0 })} (regra dos 4%)` : '', { tone: yearsTo === 0 ? 'pos' : '' })}</div>
  ${meta ? `<div class="pn"><div class="pn-h"><h3>Caminho até à meta de ${M(meta, { dec: 0 })}/mês</h3><span class="mut" style="font-size:12px">${U.pct(Math.min(1, avg / meta), 0)}</span></div>${UI.bar(Math.min(1, avg / meta), avg >= meta ? 'pos' : '')}${yld > 0 ? `<p class="mut" style="font-size:12.5px;margin:6px 0 0">Ao yield atual (${U.pct(yld, 2)}) precisas de ~${M(meta * 12 / yld, { dec: 0 })} investidos: faltam ~${M(Math.max(0, meta * 12 / yld - invested), { dec: 0 })}.</p>` : ''}</div>` : ''}
  <div class="g g-main"><div class="pn"><div class="pn-h"><h3>Recebido por mês, por fonte</h3><span class="mut" style="font-size:12px">líquido, últimos 24 meses</span></div>${C.mount({ type: 'bar', stacked: true, labels: Pv.ms.map(U.fmtYM), series: SRC.map(([k, l, c]) => ({ name: l, data: Pv.ms.map(m => Pv.by[m][k]), color: c })).filter(s => s.data.some(Boolean)), fmt: MK, empty: 'Ainda não há renda passiva registada: dividendos, juros e rendas aparecem aqui.' }, 240)}</div>
    <div class="pn"><div class="pn-h"><h3>De onde vem</h3><span class="mut" style="font-size:12px">12 meses</span></div>${src.length ? C.mount({ type: 'donut', data: src, label: 'Fontes de renda passiva', fmt: MK, centerSub: 'por ano', max: 6 }, 210) : '<div class="chart-empty" style="height:210px">Sem dados ainda.</div>'}</div></div>
  <div class="g g2"><div class="pn"><div class="pn-h"><h3>Fontes nos últimos 12 meses</h3></div><div class="tblw"><table class="tbl"><thead><tr><th>Fonte</th><th class="r">12 meses</th><th class="r">Por mês</th><th class="r">%</th></tr></thead><tbody>${SRC.map(([k, l, c]) => { const v = Pv.src12[k] + (k === 'ren' ? Pv.estRent * 12 : 0); return v ? `<tr><td><span class="dot" style="background:${c}"></span> ${l}${k === 'ren' && Pv.estRent ? ' <span class="bdg">estimado</span>' : ''}</td><td class="r mono">${M(v, { dec: 0 })}</td><td class="r mono">${M(v / 12, { dec: 0 })}</td><td class="r mono">${U.pct(v / ((Pv.y12 + Pv.estRent * 12) || 1), 0)}</td></tr>` : ''; }).join('') || '<tr><td colspan="4" class="mut">Sem renda passiva nos últimos 12 meses.</td></tr>'}</tbody></table></div></div>
    <div class="pn"><div class="pn-h"><h3>Próximos 12 meses</h3><span class="mut" style="font-size:12px">dividendos previstos + rendas</span></div>${C.mount({ type: 'bar', labels: proj.labels, series: [{ name: 'Dividendos previstos', data: proj.data, color: 'var(--pos)' }, { name: 'Rendas (líquidas)', data: proj.labels.map(() => U.sum(R.P, p => p.rentY * (1 - n(p.r.mgmt) / 100)) / 12), color: '#fb7185' }].filter(s => s.data.some(Boolean)), fmt: MK, stacked: true, empty: 'Sem previsão: liga as cotações (dividendos) ou regista imóveis arrendados.' }, 200)}<p class="mut" style="font-size:12px;margin:6px 0 0">Previsão total: ${M(proj.total + R.rentY, { dec: 0 })} no próximo ano.</p></div></div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('target')}Como chegar mais depressa</h3></div><div class="list">
    ${[contrib ? `Estás a investir ~${M(contrib, { dec: 0 })}/mês. Reinvestir todos os proventos acelera o efeito bola de neve.` : 'Ainda não há aportes regulares registados: um valor fixo todos os meses é o motor da renda passiva.',
      exp ? `Cada ${M(exp * 0.1, { dec: 0 })}/mês a mais de renda passiva cobre 10% das tuas despesas.` : '',
      yld && yld < .03 ? 'O teu yield é baixo: ETFs de acumulação crescem mais, mas não pagam agora. Decide o que queres primeiro: crescimento ou renda.' : '',
      R.P.some(p => p.rented && p.ny < .03) ? 'Há imóveis arrendados com rentabilidade líquida abaixo de 3%: revê a renda, as despesas ou o crédito.' : '',
      'Define a tua meta mensal em Proventos e vê aqui a distância que falta.'].filter(Boolean).map(t => `<div class="li"><div class="li-t"><small style="font-size:13px;color:var(--tx)">${t}</small></div></div>`).join('')}</div></div>`; };

/* ---------- abas novas de Investimentos ---------- */
const TB = IX.TABS; if (TB && !TB.some(t => t[0] === 'imoveis')) { const i = TB.findIndex(t => t[0] === 'carteira'); TB.splice(i + 1, 0, ['imoveis', 'Imóveis'], ['renda', 'Renda passiva']); }
})();
