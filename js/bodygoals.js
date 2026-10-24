/* PRUMO — Corpo: separadores (Visão · Desafios e metas · Mapa corporal · Peso e medidas), calendário de disciplina
   ("fui hoje?": treino, corrida ou presença marcada), desafios com progresso automático e metas do corpo (peso, gordura,
   cintura, músculo e força num exercício). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, S = OS.S, V = OS.views, n = v => U.num(v) || 0;
const F = (k, l, t = 'text', x = {}) => Object.assign({ k, l, t }, x);
OS.SHARD.bchal = 200; OS.SHARD.bgoals = 200; OS.SHARD.checkins = 400;
S.checkins = { label: 'Presença no ginásio', title: r => U.fmtD(r.date), fields: [F('date', 'Data', 'date', { req: 1 }), F('notes', 'Notas')], defaults: () => ({ date: U.today() }) };
S.bchal = { label: 'Desafio', title: r => r.name, fields: [F('name', 'Nome', 'text', { req: 1, wide: 1 }), F('start', 'Início', 'date', { req: 1 }), F('days', 'Duração', 'num', { unit: 'dias', req: 1 })] };
S.bgoals = { label: 'Meta do corpo', title: r => r.name || 'Meta', fields: [F('target', 'Alvo', 'num', { req: 1 }), F('deadline', 'Prazo', 'date')] };

/* ---------- presença: os dias em que foste ---------- */
const BG = OS.BodyGoals = {};
BG.days = () => { const m = {}; const put = (d, k) => { (m[d] = m[d] || {})[k] = 1; }; OS.all('workouts').forEach(w => put(w.date, 'w')); OS.all('runs').forEach(r => put(r.date, 'r')); OS.all('checkins').forEach(c => put(c.date, 'c')); return m; };
BG.stats = () => { const m = BG.days(), t = U.today(), tgt = n(OS.one('profile').trainTarget) || 4; let cur = 0, d = m[t] ? t : U.addDays(t, -1); while (m[d]) { cur++; d = U.addDays(d, -1); }
  let best = 0, run = 0; Object.keys(m).sort().forEach((k, i, a) => { run = i && U.diff(k, a[i - 1]) === 1 ? run + 1 : 1; best = Math.max(best, run); });
  let wk = 0, w = U.monday(t); const cnt = a => U.range(a, U.addDays(a, 6)).filter(x => m[x]).length; if (cnt(w) < tgt) w = U.addDays(w, -7); while (cnt(w) >= tgt) { wk++; w = U.addDays(w, -7); }
  const d30 = U.lastN(30).filter(x => m[x]).length, exp = Math.round(tgt / 7 * 30), pct = Math.min(100, Math.round(d30 / Math.max(1, exp) * 100)), month = Object.keys(m).filter(x => U.ym(x) === U.ym(t)).length;
  const lvl = pct >= 90 ? ['Disciplina de ferro', 'pos'] : pct >= 70 ? ['Boa consistência', 'pos'] : pct >= 40 ? ['Irregular', 'warn'] : ['A precisar de foco', 'neg'];
  return { m, cur, best, wk, d30, exp, pct, month, tgt, lvl, today: !!m[t] }; };
BG.calendar = (weeks = 26) => { const st = BG.stats(), t = U.today(), start = U.addDays(U.monday(t), -7 * (weeks - 1)), cols = [];
  for (let w = 0; w < weeks; w++) { const a = U.addDays(start, w * 7); cols.push(U.range(a, U.addDays(a, 6))); }
  const cls = d => { const x = st.m[d]; return d > t ? 'fut' : !x ? '' : x.w && x.r ? 'wr' : x.w ? 'w' : x.r ? 'r' : 'c'; };
  return `<div class="dc-cal" role="img" aria-label="Calendário de presença das últimas ${weeks} semanas"><div class="dc-wd">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(l => `<i>${l}</i>`).join('')}</div><div class="dc-sc"><div class="dc-grid">${cols.map((c, i) => `<div class="dc-col">${U.parse(c[0]).getDate() <= 7 || i === 0 ? `<em>${U.MES[U.parse(c[0]).getMonth()]}</em>` : '<em></em>'}${c.map(d => `<button class="dc-d ${cls(d)}${d === t ? ' today' : ''}" data-act="bgDay" data-d="${d}" title="${U.fmtD(d)}" ${d > t ? 'disabled' : ''}></button>`).join('')}</div>`).join('')}</div></div></div>
    <div class="dc-leg"><span><i class="dc-d w"></i>treino</span><span><i class="dc-d r"></i>corrida</span><span><i class="dc-d wr"></i>treino + corrida</span><span><i class="dc-d c"></i>fui (marcado)</span><span><i class="dc-d"></i>não fui</span></div>`; };
BG.panel = (compact) => { const s = BG.stats();
  return `<div class="pn dc"><div class="pn-h"><h3>Disciplina</h3><span class="bdg ${s.lvl[1]}">${s.lvl[0]}</span></div>
    <div class="dc-top"><div class="dc-score"><b class="mono">${s.pct}%</b><small>consistência<br>30 dias</small></div><div class="dc-kp">${[['Dias seguidos', s.cur], ['Melhor sequência', s.best], ['Semanas a cumprir', s.wk], ['Este mês', s.month]].map(([l, v]) => `<div><b class="mono">${v}</b><small>${l}</small></div>`).join('')}</div>
    ${s.today ? `<span class="dc-ok">${UI.ic('check')}Hoje: feito</span>` : `<button class="btn pri sm" data-act="bgWent">${UI.ic('check')}Fui hoje</button>`}</div>
    ${BG.calendar(compact ? 17 : 26)}
    <small class="mut">Meta: ${s.tgt} dias por semana (${s.exp} em 30 dias; fizeste ${s.d30}). Conta como "fui" um treino, uma corrida ou tocares num dia para o marcar.</small></div>`; };
A.bgWent = () => { if (!BG.days()[U.today()]) OS.add('checkins', { date: U.today() }); UI.toast('Boa! Dia marcado.', 'pos'); };
A.bgDay = b => { const d = b.dataset.d, m = BG.days()[d]; if (m && (m.w || m.r)) { UI.toast(`${U.fmtD(d)}: ${m.w ? 'treino' : ''}${m.w && m.r ? ' e ' : ''}${m.r ? 'corrida' : ''} registados`, ''); return; }
  const c = OS.all('checkins').find(x => x.date === d); if (c) OS.del('checkins', c.id); else OS.add('checkins', { date: d }); };

/* ---------- desafios ---------- */
const tg = d => OS.BodyX ? OS.BodyX.target(d) : { kcal: 0, p: 0 };
const TPL = [
  { k: 'presenca', name: 'Ir treinar 20 dias em 30', days: 30, kind: 'total', goal: 20, unit: 'dias', val: d => BG.days()[d] ? 1 : 0, desc: 'Treino, corrida ou presença marcada.' },
  { k: 'treinos', name: '12 treinos em 4 semanas', days: 28, kind: 'total', goal: 12, unit: 'treinos', val: d => OS.all('workouts').filter(w => w.date === d).length, desc: 'Conta cada treino registado.' },
  { k: 'proteina', name: 'Meta de proteína 14 dias seguidos', days: 14, kind: 'daily', ok: d => { const x = OS.Diet.day(d), t = tg(d); return t.p && x.p >= t.p * .95; }, desc: 'Comer pelo menos 95% da proteína do dia.' },
  { k: 'calorias', name: 'Calorias na meta 21 dias', days: 21, kind: 'daily', ok: d => { const x = OS.Diet.day(d), t = tg(d); return x.n && t.kcal && x.kcal >= t.kcal * .9 && x.kcal <= t.kcal * 1.1; }, desc: 'Ficar a ±10% das calorias do dia.' },
  { k: 'agua', name: 'Beber a água toda 14 dias', days: 14, kind: 'daily', ok: d => { const w = n(OS.one('diet').water) || 2500; return OS.Diet.day(d).water >= w; }, desc: 'Chegar à meta de água do dia.' },
  { k: 'km', name: 'Correr 50 km em 30 dias', days: 30, kind: 'total', goal: 50, unit: 'km', val: d => U.sum(OS.all('runs').filter(r => r.date === d), r => n(r.km)), desc: 'Soma das corridas registadas.' },
  { k: 'along', name: 'Alongar 7 dias seguidos', days: 7, kind: 'daily', ok: d => OS.all('stretches').some(s => s.date === d), desc: 'Uma rotina de alongamentos por dia.' },
  { k: 'acucar', name: 'Sem açúcar 21 dias', days: 21, kind: 'manual', desc: 'Marca cada dia em que cumpriste.' },
  { k: 'alcool', name: 'Sem álcool 30 dias', days: 30, kind: 'manual', desc: 'Marca cada dia em que cumpriste.' },
  { k: 'sono', name: 'Dormir 8 horas 14 dias', days: 14, kind: 'manual', desc: 'Marca cada dia em que cumpriste.' },
  { k: 'custom', name: 'Desafio personalizado', days: 30, kind: 'manual', desc: 'Dá-lhe um nome e uma duração e marca os dias.' }];
const tplOf = c => TPL.find(t => t.k === c.tpl) || TPL[TPL.length - 1];
BG.chal = c => { const T = tplOf(c), days = n(c.days) || T.days, end = U.addDays(c.start, days - 1), t = U.today(), upto = t < end ? t : end, past = c.start <= upto ? U.range(c.start, upto) : [];
  const ok = d => T.kind === 'manual' ? !!(c.done || {})[d] : T.kind === 'daily' ? !!T.ok(d) : T.val(d) > 0;
  let prog, goal, st;
  if (T.kind === 'total') { goal = n(c.goal) || T.goal; prog = U.sum(past, d => T.val(d)); st = prog >= goal ? 'done' : t > end ? 'fail' : 'on'; }
  else { goal = days; prog = past.filter(ok).length; const missed = past.filter(d => d < t && !ok(d)).length; st = prog >= goal ? 'done' : missed ? 'fail' : t > end ? 'fail' : 'on'; }
  return { T, days, end, prog, goal, st, ok, left: Math.max(0, U.diff(end, t) + 1) }; };
const chalCard = c => { const x = BG.chal(c), g = U.range(c.start, x.end), t = U.today(), pct = Math.min(1, x.prog / Math.max(1, x.goal));
  return `<article class="ch-c ${x.st}"><div class="ch-h"><div><b>${esc(c.name)}</b><small>${esc(x.T.desc)} · ${x.st === 'on' ? `faltam ${x.left} dias` : x.st === 'done' ? 'concluído' : 'falhado'}</small></div><button class="icon-btn" data-act="bgChalDel" data-id="${c.id}" aria-label="Apagar desafio">${UI.ic('trash')}</button></div>
    <div class="ch-p"><b class="mono">${U.nf(x.prog, x.prog % 1 ? 1 : 0)} / ${U.nf(x.goal)}</b><small>${x.T.unit || 'dias'}</small></div>${UI.bar(pct, x.st === 'done' ? 'pos' : x.st === 'fail' ? 'neg' : '')}
    <div class="ch-g">${g.map(d => `<button class="ch-d ${d > t ? 'fut' : x.ok(d) ? 'ok' : d < t ? 'miss' : ''}${d === t ? ' today' : ''}" ${x.T.kind === 'manual' && d <= t ? `data-act="bgChalTick" data-id="${c.id}" data-d="${d}"` : 'disabled'} title="${U.fmtD(d)}"></button>`).join('')}</div>
    ${x.T.kind === 'manual' && x.st === 'on' ? `<button class="btn ${x.ok(t) ? 'ghost' : 'pri'} sm" data-act="bgChalTick" data-id="${c.id}" data-d="${t}">${UI.ic('check')}${x.ok(t) ? 'Feito hoje (desmarcar)' : 'Cumpri hoje'}</button>` : ''}</article>`; };
A.bgChalNew = () => UI.modal(`<div class="row" style="justify-content:space-between;align-items:center"><h3>Novo desafio</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
  <form class="col gap8" data-form="bgChal"><div class="ch-tpl">${TPL.map((t, i) => `<label><input type="radio" name="tpl" value="${t.k}"${i ? '' : ' checked'}><span><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></span></label>`).join('')}</div>
  <div class="form-grid"><div class="fld"><label for="ch_name">Nome (só no personalizado)</label><input id="ch_name" class="field" name="name" placeholder="Ex.: Sem fast food"></div><div class="fld"><label for="ch_days">Duração</label><div class="inp-wrap"><input id="ch_days" class="field" name="days" type="number" inputmode="numeric" placeholder="automático"><span>dias</span></div></div><div class="fld"><label for="ch_start">Começa</label><input id="ch_start" class="field" name="start" type="date" value="${U.today()}"></div></div>
  <button class="btn pri">${UI.ic('plus')}Começar desafio</button></form>`, 'bio-m');
OS.forms = OS.forms || {};
OS.forms.bgChal = (f, v) => { const k = (f.querySelector('[name=tpl]:checked') || {}).value || 'custom', T = TPL.find(t => t.k === k), name = k === 'custom' ? (v('name') || 'Desafio') : T.name;
  OS.add('bchal', { tpl: k, name, start: v('start') || U.today(), days: n(v('days')) || T.days, goal: T.goal || 0, done: {} }); UI.closeModal(); UI.toast('Desafio começado. Bora!', 'pos'); };
A.bgChalTick = b => { const c = OS.get('bchal', b.dataset.id); if (!c) return; const d = Object.assign({}, c.done || {}); if (d[b.dataset.d]) delete d[b.dataset.d]; else d[b.dataset.d] = 1; OS.upd('bchal', c.id, { done: d }); };
A.bgChalDel = b => UI.ask('Apagar este desafio?', '', 'Apagar', () => OS.del('bchal', b.dataset.id));

/* ---------- metas do corpo ---------- */
const lastOf = k => { const r = U.sortBy(OS.all('body').filter(b => n(b[k])), b => b.date).pop(); return r ? n(r[k]) : 0; };
const GK = { peso: ['Peso', 'kg', () => lastOf('weight')], gordura: ['Gordura corporal', '%', () => lastOf('bf')], cintura: ['Cintura', 'cm', () => lastOf('waist')], musculo: ['Massa muscular', 'kg', () => lastOf('muscleKg')],
  forca: ['Força', 'kg', g => g.ex && OS.Fit && OS.Fit.best ? n(OS.Fit.best(g.ex).kg) : 0] };
BG.goal = g => { const K = GK[g.kind] || GK.peso, cur = K[2](g), start = n(g.start) || cur, tgt = n(g.target), span = tgt - start, pct = span ? Math.max(0, Math.min(1, (cur - start) / span)) : cur && cur === tgt ? 1 : 0, left = g.deadline ? U.diff(g.deadline, U.today()) : null;
  const perW = left > 0 && cur ? (tgt - cur) / (left / 7) : null; return { K, cur, start, tgt, pct, left, perW, done: span ? (span < 0 ? cur <= tgt : cur >= tgt) && cur > 0 : false }; };
const goalCard = g => { const x = BG.goal(g), u = x.K[1], ex = g.ex ? OS.get('exercises', g.ex) : null;
  return `<article class="ch-c ${x.done ? 'done' : ''}"><div class="ch-h"><div><b>${esc(x.K[0])}${ex ? ': ' + esc(ex.name) : ''} → ${U.nf(x.tgt, 1)} ${u}</b><small>${x.cur ? `agora ${U.nf(x.cur, 1)} ${u} · começaste em ${U.nf(x.start, 1)} ${u}` : 'ainda sem registos'}${x.left != null ? ` · ${x.left >= 0 ? 'faltam ' + x.left + ' dias' : 'prazo passou'}` : ''}</small></div><button class="icon-btn" data-act="bgGoalDel" data-id="${g.id}" aria-label="Apagar meta">${UI.ic('trash')}</button></div>
    ${UI.bar(x.pct, x.done ? 'pos' : '')}<small class="mut">${x.done ? 'Meta atingida!' : x.perW != null ? `Ritmo necessário: ${x.perW > 0 ? '+' : ''}${U.nf(x.perW, 2)} ${u} por semana` : `${Math.round(x.pct * 100)}% do caminho`}</small></article>`; };
A.bgGoalNew = () => { const exs = U.sortBy(OS.all('exercises'), e => e.name);
  UI.modal(`<div class="row" style="justify-content:space-between;align-items:center"><h3>Nova meta do corpo</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
  <form class="col gap8" data-form="bgGoal"><div class="form-grid"><div class="fld"><label for="gl_k">Meta</label><select id="gl_k" class="field" name="kind">${Object.entries(GK).map(([k, v]) => `<option value="${k}">${v[0]} (${v[1]})</option>`).join('')}</select></div>
    <div class="fld"><label for="gl_ex">Exercício (só para força)</label><select id="gl_ex" class="field" name="ex"><option value="">—</option>${exs.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div>
    <div class="fld"><label for="gl_t">Alvo</label><input id="gl_t" class="field" name="target" type="text" inputmode="decimal" required placeholder="ex.: 78"></div><div class="fld"><label for="gl_d">Prazo</label><input id="gl_d" class="field" name="deadline" type="date" value="${U.addDays(U.today(), 84)}"></div></div>
  <button class="btn pri">${UI.ic('plus')}Criar meta</button></form>`, 'bio-m'); };
OS.forms.bgGoal = (f, v) => { const kind = v('kind') || 'peso', g = { kind, ex: kind === 'forca' ? v('ex') : '', target: U.num(String(v('target')).replace(',', '.')), deadline: v('deadline') || '' }; if (!g.target) { UI.toast('Indica o alvo', 'warn'); return; } if (kind === 'forca' && !g.ex) { UI.toast('Escolhe o exercício', 'warn'); return; }
  g.start = (GK[kind] || GK.peso)[2](g) || 0; OS.add('bgoals', g); UI.closeModal(); UI.toast('Meta criada', 'pos'); };
A.bgGoalDel = b => UI.ask('Apagar esta meta?', '', 'Apagar', () => OS.del('bgoals', b.dataset.id));

BG.view = () => { const C = U.sortBy(OS.all('bchal'), c => c.start, -1), on = C.filter(c => BG.chal(c).st === 'on'), old = C.filter(c => BG.chal(c).st !== 'on'), G = OS.all('bgoals');
  return `${BG.panel(false)}
  <div class="sech"><div><h2>Desafios</h2><p>Escolhe um desafio e o progresso conta sozinho a partir do teu treino, dieta e corrida (ou marca tu os dias).</p></div><button class="btn pri sm" data-act="bgChalNew">${UI.ic('plus')}Novo desafio</button></div>
  ${on.length ? `<div class="ch-l">${on.map(chalCard).join('')}</div>` : UI.empty('Sem desafios ativos. Começa com "Ir treinar 20 dias em 30".', `<button class="btn pri" data-act="bgChalNew">${UI.ic('plus')}Escolher desafio</button>`)}
  <div class="sech"><div><h2>Metas do corpo</h2><p>Peso, gordura, cintura, massa muscular ou a carga num exercício, com prazo e o ritmo semanal que precisas.</p></div><button class="btn pri sm" data-act="bgGoalNew">${UI.ic('plus')}Nova meta</button></div>
  ${G.length ? `<div class="ch-l">${G.map(goalCard).join('')}</div>` : UI.empty('Sem metas. Ex.: chegar aos 78 kg até ao verão, ou supino com 100 kg.', `<button class="btn pri" data-act="bgGoalNew">${UI.ic('plus')}Criar meta</button>`)}
  ${old.length ? `<div class="sech"><div><h2>Histórico de desafios</h2></div></div><div class="ch-l">${old.slice(0, 12).map(chalCard).join('')}</div>` : ''}`; };

/* ---------- separadores do Corpo ---------- */
const CT = [['', 'Visão'], ['desafios', 'Desafios e metas'], ['mapa', 'Mapa corporal'], ['peso', 'Peso e medidas']];
OS.on('ready', () => { const base = V.corpo; if (!base || base._t) return;
  V.corpo = sub => { const tabs = UI.tabs('corpo', CT, sub || '');
    if (!sub || sub === 'visao') { const h = base(), i = h.indexOf('</header>'); const extra = tabs + BG.panel(true); return i > 0 ? h.slice(0, i + 9) + extra + h.slice(i + 9) : extra + h; }
    const head = UI.head('Corpo', 'Treino, dieta e corrida ligados: o que gastas, o que comes e como o corpo responde.', `${UI.addBtn('body', 'Registar peso', null, 'ghost')}<button class="btn pri" data-act="wkStart">${UI.ic('dumbbell')}<span>Treinar</span></button>`, 'Corpo') + tabs;
    if (sub === 'desafios') return head + BG.view();
    if (sub === 'mapa') return head + (OS.BodyMap ? OS.BodyMap.view() : '');
    if (sub === 'peso') return head + (V.treinoPeso ? V.treinoPeso() : '');
    return head + BG.view(); };
  V.corpo._t = 1;
  const tr = V.treino; if (tr && !tr._t) { V.treino = sub => sub === 'mapa' || sub === 'peso' ? V.corpo(sub) : tr(sub); V.treino._t = 1; } });
})();
