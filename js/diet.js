/* PRUMO — Dieta: refeições, calorias, macros, água, biblioteca de alimentos e metas.
   Registar a dieta e bater a proteína alimenta o pilar Corpo no DOMINUS. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, V = OS.views, A = OS.act, S = OS.S, C = OS.C;
const F = (k, l, t = 'text', x = {}) => Object.assign({ k, l, t }, x);
const MEALS = ['Pequeno-almoço', 'Almoço', 'Lanche', 'Jantar', 'Ceia', 'Snack'];
const ACT = [['1.2', 'Sedentário'], ['1.375', 'Leve (1–3 treinos/sem.)'], ['1.55', 'Moderado (3–5)'], ['1.725', 'Intenso (6–7)'], ['1.9', 'Muito intenso']];
const GOALS = [['cut', 'Perder gordura'], ['keep', 'Manter'], ['bulk', 'Ganhar massa']];

OS.ONE_DEF.diet = { kcal: 2400, p: 150, c: 280, f: 70, water: 3000, waterLog: {}, h: '', age: '', sex: 'M', act: '1.55', goal: 'keep' };
OS.SHARD.meals = 200;
S.foods = { label: 'Alimento', title: r => r.name, fields: [
  F('name', 'Alimento', 'text', { req: 1, wide: 1 }), F('portion', 'Porção', 'text', { ph: '100 g · 1 unidade · 1 prato' }),
  F('kcal', 'Calorias', 'num', { unit: 'kcal', req: 1 }), F('p', 'Proteína', 'num', { unit: 'g' }), F('c', 'Hidratos', 'num', { unit: 'g' }), F('f', 'Gordura', 'num', { unit: 'g' })
], defaults: () => ({ portion: '1 porção' }) };
const nowMeal = () => { const h = new Date().getHours(); return h < 11 ? 'Pequeno-almoço' : h < 15 ? 'Almoço' : h < 18.5 ? 'Lanche' : h < 22 ? 'Jantar' : 'Ceia'; };
S.meals = { label: 'Refeição', title: r => r.food || r.meal, fields: [
  F('date', 'Data', 'date', { req: 1 }), F('meal', 'Refeição', 'sel', { o: MEALS, req: 1 }),
  F('food', 'O que comeste', 'text', { req: 1, wide: 1, list: () => OS.all('foods').map(f => f.name) }), F('qty', 'Quantidade', 'num', { unit: 'porções', h: '1 = uma porção do alimento guardado' }),
  F('kcal', 'Calorias', 'num', { unit: 'kcal', h: 'Vazio = usa o alimento guardado' }), F('p', 'Proteína', 'num', { unit: 'g' }), F('c', 'Hidratos', 'num', { unit: 'g' }), F('f', 'Gordura', 'num', { unit: 'g' }),
  F('notes', 'Notas', 'area', { rows: 2 })
], defaults: () => ({ date: OS.ui.dietDay || U.today(), meal: nowMeal(), qty: 1 }),
  after: (r) => Diet.fill(r) };

/* ================= domínio ================= */
const Diet = OS.Diet = {};
const n = v => U.num(v) || 0;
Diet.food = name => OS.all('foods').find(f => f.name.trim().toLowerCase() === String(name || '').trim().toLowerCase());
// completa macros a partir da biblioteca e aprende alimentos novos
Diet.fill = r => { const fd = Diet.food(r.food), q = n(r.qty) || 1;
  if (fd && r.kcal === '' || fd && r.kcal == null) { OS.upd('meals', r.id, { kcal: Math.round(n(fd.kcal) * q), p: U.r1(n(fd.p) * q), c: U.r1(n(fd.c) * q), f: U.r1(n(fd.f) * q) }, { silent: true }); }
  else if (!fd && n(r.kcal)) OS.add('foods', { name: r.food.trim(), portion: '1 porção', kcal: Math.round(n(r.kcal) / q), p: U.r1(n(r.p) / q), c: U.r1(n(r.c) / q), f: U.r1(n(r.f) / q) }, { silent: true }); };
Diet.day = d => { const m = OS.all('meals').filter(x => x.date === d), o = OS.one('diet');
  return { m, n: m.length, kcal: U.sum(m, x => n(x.kcal)), p: U.sum(m, x => n(x.p)), c: U.sum(m, x => n(x.c)), f: U.sum(m, x => n(x.f)), water: n((o.waterLog || {})[d]) }; };
Diet.protOk = d => { const t = n(OS.one('diet').p); return t > 0 && Diet.day(d).p >= t * .9; };
Diet.kcalOk = d => { const t = n(OS.one('diet').kcal), k = Diet.day(d).kcal; return t > 0 && k >= t * .9 && k <= t * 1.1; };
Diet.streak = () => { let s = 0, d = U.today(); if (!Diet.day(d).n) d = U.addDays(d, -1); while (Diet.day(d).n && s < 999) { s++; d = U.addDays(d, -1); } return s; };
Diet.top = () => { const c = {}; OS.all('meals').slice(-300).forEach(m => { const k = (m.food || '').trim(); if (k) c[k] = (c[k] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).map(x => x[0]); };
const lastWt = () => n((U.sortBy(OS.all('body').filter(b => n(b.weight)), b => b.date).slice(-1)[0] || {}).weight);
Diet.bmr = () => { const o = OS.one('diet'), w = lastWt(), h = n(o.h), a = n(o.age); if (!w || !h || !a) return 0; return 10 * w + 6.25 * h - 5 * a + (o.sex === 'F' ? -161 : 5); };
Diet.suggest = () => { const o = OS.one('diet'), b = (OS.BodyX && OS.BodyX.bmrMeasured()) || Diet.bmr(); if (!b) return null; const w = lastWt(), lean = OS.BodyX ? OS.BodyX.lean() : 0;
  if (!w) return null; const kcal = Math.round(b * n(o.act || 1.55) * ({ cut: .82, keep: 1, bulk: 1.1 })[o.goal || 'keep'] / 10) * 10, p = lean ? Math.round(lean * (o.goal === 'cut' ? 2.6 : 2.3)) : Math.round(w * (o.goal === 'cut' ? 2.2 : 2)), f = Math.round(w * .9), c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
  return { kcal, p, c, f, w }; };

/* ================= vista ================= */
const day = () => OS.ui.dietDay && OS.ui.dietDay <= U.today() ? OS.ui.dietDay : U.today();
const mbar = (l, v, t, col, u = 'g') => `<div class="dt-m"><div class="dt-mh"><span>${l}</span><b class="mono">${U.nf(v, 0)}<small> / ${U.nf(t, 0)} ${u}</small></b></div><div class="pbar"><i style="width:${t ? Math.min(100, v / t * 100) : 0}%;background:${v > t * 1.1 && u === 'kcal' ? 'var(--neg,#F26D6D)' : col}"></i></div></div>`;
const T = {};
T.hoje = () => { const d = day(), x = Diet.day(d), o = OS.one('diet'), left = n(o.kcal) - x.kcal, cups = Math.ceil(n(o.water) / 250), got = Math.round(x.water / 250), top = Diet.top().slice(0, 8), meal = d === U.today() ? nowMeal() : 'Almoço';
  return `<div class="dt-day"><button class="icon-btn" data-act="dietDay" data-d="-1" aria-label="Dia anterior">${UI.ic('left')}</button><b>${d === U.today() ? 'Hoje' : d === U.addDays(U.today(), -1) ? 'Ontem' : U.fmtD(d)}</b><button class="icon-btn" data-act="dietDay" data-d="1" aria-label="Dia seguinte" ${d >= U.today() ? 'disabled' : ''}>${UI.ic('right')}</button></div>
  <section class="dt-sum"><div class="dt-k"><span class="mut">${left >= 0 ? 'Faltam' : 'Passaste'}</span><b class="mono">${U.nf(Math.abs(left), 0)}</b><span class="mut">kcal · ${U.nf(x.kcal, 0)} de ${U.nf(n(o.kcal), 0)}</span></div>
    <div class="dt-ms">${mbar('Calorias', x.kcal, n(o.kcal), 'var(--accent)', 'kcal')}${mbar('Proteína', x.p, n(o.p), '#5FB3E8')}${mbar('Hidratos', x.c, n(o.c), '#E8B75F')}${mbar('Gordura', x.f, n(o.f), '#C98AE0')}</div></section>
  <section class="dt-water"><div><b>${UI.ic('drop')}Água</b><span class="mut mono">${U.nf(x.water / 1000, 2)} / ${U.nf(n(o.water) / 1000, 1)} L</span></div><div class="dt-cups">${Array.from({ length: cups }, (_, i) => `<i class="${i < got ? 'on' : ''}"></i>`).join('')}</div><div class="dt-wb"><button class="btn ghost sm" data-act="dietWater" data-v="-250">−</button><button class="btn sm" data-act="dietWater" data-v="250">+ 250 ml</button><button class="btn ghost sm" data-act="dietWater" data-v="500">+ 500 ml</button></div></section>
  <section class="pn"><form class="dt-add" data-form="dietQuick" autocomplete="off"><select class="field" name="meal" aria-label="Refeição">${MEALS.map(m => `<option${m === meal ? ' selected' : ''}>${m}</option>`).join('')}</select><input class="field" name="food" list="dl_dfood" placeholder="O que comeste? (ex.: 3 ovos)" aria-label="Alimento" required><datalist id="dl_dfood">${OS.all('foods').map(f => `<option value="${esc(f.name)}">`).join('')}</datalist><input class="field" name="qty" type="number" step="any" inputmode="decimal" placeholder="porções" aria-label="Porções" value="1"><input class="field" name="kcal" type="number" step="any" inputmode="decimal" placeholder="kcal" aria-label="Calorias"><input class="field" name="p" type="number" step="any" inputmode="decimal" placeholder="prot g" aria-label="Proteína"><button class="btn pri">${UI.ic('plus')}<span>Registar</span></button></form>
    <small class="mut">Se o alimento já estiver guardado, as calorias e macros preenchem-se sozinhas. Se for novo, fica guardado para a próxima.</small>
    ${top.length ? `<div class="dt-quick">${top.map(t => `<button data-act="dietAgain" data-f="${esc(t)}" data-m="${meal}">+ ${esc(t)}</button>`).join('')}</div>` : ''}</section>
  ${MEALS.map(m => { const it = x.m.filter(r => r.meal === m); if (!it.length) return ''; return `<section class="dt-meal"><div class="dt-mt"><b>${m}</b><span class="mut mono">${U.nf(U.sum(it, r => n(r.kcal)), 0)} kcal · ${U.nf(U.sum(it, r => n(r.p)), 0)} g prot</span></div>${it.map(r => `<div class="li" data-edit="meals:${r.id}" style="cursor:pointer"><div class="li-t"><b>${esc(r.food)}${n(r.qty) && n(r.qty) !== 1 ? ` <span class="mut">× ${U.nf(r.qty, 1)}</span>` : ''}</b><small class="mono">P ${U.nf(n(r.p), 0)} · H ${U.nf(n(r.c), 0)} · G ${U.nf(n(r.f), 0)}</small></div><span class="mono">${U.nf(n(r.kcal), 0)}</span><button class="icon-btn" data-act="dietDel" data-id="${r.id}" aria-label="Apagar">${UI.ic('x')}</button></div>`).join('')}</section>`; }).join('') || UI.empty('Ainda nada registado neste dia.')}`; };
T.semana = () => { const days = U.lastN(14), o = OS.one('diet'), X = days.map(Diet.day), w7 = X.slice(-7), reg = w7.filter(x => x.n);
  const avg = k => reg.length ? U.sum(reg, x => x[k]) / reg.length : 0;
  return `<div class="kpis">${UI.kpi('Média kcal (7 dias)', reg.length ? U.nf(avg('kcal'), 0) : '—', 'meta ' + U.nf(n(o.kcal), 0))}${UI.kpi('Proteína média', reg.length ? U.nf(avg('p'), 0) + ' g' : '—', 'meta ' + n(o.p) + ' g')}${UI.kpi('Dias na meta de kcal', days.slice(-7).filter(Diet.kcalOk).length + '/7')}${UI.kpi('Dias com proteína', days.slice(-7).filter(Diet.protOk).length + '/7')}${UI.kpi('Sequência de registo', Diet.streak() + ' dias')}</div>
  <div class="pn"><div class="pn-h"><h3>Calorias por dia</h3></div>${C.mount({ type: 'bar', labels: days.map(d => U.fmtDS(d)), series: [{ name: 'kcal', data: X.map(x => x.kcal), color: 'var(--accent)' }], target: n(o.kcal) || null, targetLabel: 'meta', fmt: v => U.nf(v, 0), empty: 'Regista refeições para ver o gráfico.' }, 220)}</div>
  <div class="pn"><div class="pn-h"><h3>Proteína por dia (g)</h3></div>${C.mount({ type: 'bar', labels: days.map(d => U.fmtDS(d)), series: [{ name: 'g', data: X.map(x => Math.round(x.p)), color: '#5FB3E8' }], target: n(o.p) || null, targetLabel: 'meta', fmt: v => U.nf(v, 0), empty: 'Sem dados.' }, 200)}</div>`; };
T.alimentos = () => UI.table({ key: 'foods', coll: 'foods', rows: U.sortBy(OS.all('foods'), f => f.name.toLowerCase()), limit: 200, empty: 'Sem alimentos guardados. Ficam aqui sozinhos quando registas algo novo com calorias.', emptyAct: UI.addBtn('foods', 'Novo alimento', null, ''), cols: [
  { l: 'Alimento', v: f => `<b>${esc(f.name)}</b>`, s: f => f.name }, { l: 'Porção', v: f => esc(f.portion || '') }, { l: 'kcal', cls: 'r', v: f => `<span class="mono">${U.nf(n(f.kcal), 0)}</span>`, s: f => n(f.kcal) },
  { l: 'P', cls: 'r', v: f => `<span class="mono">${U.nf(n(f.p), 1)}</span>` }, { l: 'H', cls: 'r', v: f => `<span class="mono">${U.nf(n(f.c), 1)}</span>` }, { l: 'G', cls: 'r', v: f => `<span class="mono">${U.nf(n(f.f), 1)}</span>` }] });
T.metas = () => { const o = OS.one('diet'), sg = Diet.suggest(), num = (k, l, u) => `<div class="fld"><label for="dg_${k}">${l}</label><div class="inp-wrap"><input id="dg_${k}" type="number" step="any" inputmode="decimal" data-bind="diet.${k}" value="${esc(o[k] ?? '')}"><span>${u}</span></div></div>`;
  const sel = (k, l, opts) => `<div class="fld"><label for="dg_${k}">${l}</label><select id="dg_${k}" data-bind="diet.${k}">${opts.map(([v, t]) => `<option value="${v}"${String(o[k]) === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`;
  return `<div class="g g2"><div class="pn"><div class="pn-h"><h3>Metas diárias</h3></div><div class="form-grid">${num('kcal', 'Calorias', 'kcal')}${num('p', 'Proteína', 'g')}${num('c', 'Hidratos', 'g')}${num('f', 'Gordura', 'g')}${num('water', 'Água', 'ml')}</div></div>
  <div class="pn"><div class="pn-h"><h3>Calcular a partir do corpo</h3></div><div class="form-grid">${num('h', 'Altura', 'cm')}${num('age', 'Idade', 'anos')}${sel('sex', 'Sexo', [['M', 'Masculino'], ['F', 'Feminino']])}${sel('act', 'Atividade', ACT)}${sel('goal', 'Objetivo', GOALS)}</div>
    ${sg ? `<p style="margin:14px 0 8px">Com ${U.nf(sg.w, 1)} kg: <b class="mono">${U.nf(sg.kcal, 0)} kcal</b> · P ${sg.p} g · H ${sg.c} g · G ${sg.f} g</p><button class="btn pri" data-act="dietApply">Usar estas metas</button>` : `<p class="mut" style="margin-top:12px">Preenche altura e idade, e regista o teu peso em Treino → Peso, para calcular.</p>`}</div></div>`; };
Diet.T = T;
V.dieta = sub => UI.head('Dieta', '', `<button class="btn pri" data-act="dietAdd">${UI.ic('plus')}<span>Adicionar alimento</span></button>`, 'Corpo') + UI.tabs('dieta', [['', 'Hoje'], ['fixas', 'Refeições fixas'], ['semana', 'Semana'], ['alimentos', 'Alimentos'], ['metas', 'Metas']], sub) + (T[sub] || T.hoje)();

/* ================= ações ================= */
A.dietDay = b => { const d = U.addDays(day(), +b.dataset.d); OS.setUI('dietDay', d > U.today() ? U.today() : d); };
A.dietWater = b => { const o = OS.one('diet'), d = day(); o.waterLog = o.waterLog || {}; o.waterLog[d] = Math.max(0, n(o.waterLog[d]) + +b.dataset.v); Object.keys(o.waterLog).forEach(k => { if (k < U.addDays(U.today(), -120)) delete o.waterLog[k]; }); OS.touch('diet'); };
A.dietDel = (b, e) => { e && e.stopPropagation && e.stopPropagation(); OS.del('meals', b.dataset.id); UI.toast('Apagado'); };
A.dietAgain = b => { const last = OS.all('meals').filter(m => m.food === b.dataset.f).slice(-1)[0]; if (!last) return; const r = OS.add('meals', { date: day(), meal: b.dataset.m, food: last.food, qty: last.qty || 1, kcal: last.kcal, p: last.p, c: last.c, f: last.f }); UI.toast(`${last.food} · ${b.dataset.m}`, 'pos'); return r; };
A.dietApply = () => { const s = Diet.suggest(); if (!s) return; OS.setOne('diet', { kcal: s.kcal, p: s.p, c: s.c, f: s.f }); UI.toast('Metas atualizadas', 'pos'); };
OS.forms = OS.forms || {};
OS.forms.dietQuick = (f, v) => { const food = v('food'); if (!food) return; const blank = v('kcal') === ''; const r = OS.add('meals', { date: day(), meal: f.elements.meal.value, food, qty: U.num(v('qty')) || 1, kcal: blank ? '' : U.num(v('kcal')), p: v('p') === '' ? '' : U.num(v('p')), c: '', f: '' }); Diet.fill(r);
  if (blank && !Diet.food(food)) UI.toast('Registado sem calorias. Edita para acrescentar, e o alimento fica guardado.', 'warn'); else UI.toast('Registado', 'pos'); };
})();
