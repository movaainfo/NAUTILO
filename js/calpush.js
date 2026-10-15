/* OCEANUM — A tua agenda do Oceanum também FORA da app: TUDO o que está no Calendário do Oceanum (trabalho e folgas — também os da
   escala importada por foto —, compromissos, aulas, provas e entregas, tarefas com data, prazos, metas, rotina, treinos, contas,
   aniversários…) vai sozinho para um calendário "Oceanum" no teu Google Calendar, que aparece no Calendário do iPhone.
   Quando alteras ou apagas na app, atualiza ou apaga lá. É feito pela Parte 6 do script (um ficheiro novo: não mexe nas outras partes).
   Só escreve no calendário "Oceanum": os teus outros calendários ficam intactos. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc, IB = OS.Inbox;
const CP = OS.CalPush = {};
// [chave, nome, dias para trás, dias para a frente] — o que se repete todos os dias vai menos à frente, para não encher o calendário
const TYPES = [['shift', 'Trabalho (turnos)', 30, 180], ['off', 'Folgas e férias', 30, 180], ['event', 'Compromissos', 30, 180], ['exam', 'Provas, testes e entregas', 30, 180], ['class', 'Aulas', 7, 120],
  ['task', 'Tarefas com data', 14, 180], ['opp', 'Prazos, entrevistas e follow-ups', 14, 180], ['goal', 'Metas e projetos', 14, 180], ['routine', 'Rotina', 2, 21], ['workout', 'Treinos e desporto', 14, 0],
  ['run', 'Corridas', 14, 0], ['bill', 'Contas a pagar', 0, 60], ['bday', 'Aniversários', 0, 180], ['mail', 'Eventos dos e-mails', 14, 180]];
const TW = Object.fromEntries(TYPES.map(t => [t[0], [t[2], t[3]]])), ALL = () => Object.fromEntries(TYPES.map(t => [t[0], 1]));
OS.ONE_DEF.calx = { on: false, types: ALL(), tv: 2, map: {}, at: 0, n: 0, err: '' };
const cfg = () => { const c = OS.one('calx'); if (!c.tv) { c.types = ALL(); c.tv = 2; } return c; }; // quem tinha só turnos/folgas/compromissos/provas passa a ter tudo
const BACK = 30, AHEAD = 180;   // janela total gerida: 30 dias para trás e 6 meses para a frente
const win = (k) => { const w = TW[k] || [BACK, AHEAD]; return [U.addDays(U.today(), -w[0]), U.addDays(U.today(), w[1])]; };
const st = () => OS.one('inbox') || {};
const has6 = () => +(st().c6 || 0) >= 1, has7 = () => +(st().c7 || 0) >= 1, old6 = () => !!(OS.Files && OS.Files.has6());   // Parte 7 (cores), Parte 6 ou a Parte 5 versão 6 (antiga)
const ready = () => !!(OS.Files && OS.Files.ready() && (has7() || has6() || old6()));
const OP = () => has7() ? 'cal7' : has6() ? 'cal6' : 'calsync';
// cores lá fora (só no Google Calendar e no iPhone; a app fica igual): cada tipo vai para o seu calendário, com uma cor pastel
const CATS = [['trabalho', 'Oceanum · Trabalho', '#A9C8F0', 'azul', ['shift']], ['folgas', 'Oceanum · Folgas', '#B8E6C9', 'verde menta', ['off']], ['tarefas', 'Oceanum · Tarefas', '#FBE7A1', 'amarelo', ['task']],
  ['estudos', 'Oceanum · Estudos', '#D6C8F2', 'lavanda', ['class', 'exam']], ['compromissos', 'Oceanum · Compromissos', '#F7C3D6', 'rosa', ['event', 'mail', 'opp']], ['treino', 'Oceanum · Treino e rotina', '#FFD1B3', 'pêssego', ['workout', 'run', 'routine']],
  ['outros', 'Oceanum', '#E3DCCF', 'areia', ['goal', 'bill', 'bday']]];
const CAT_OF = {}; CATS.forEach(c => c[4].forEach(k => { CAT_OF[k] = c[0]; }));
const CALS = () => Object.fromEntries(CATS.map(c => [c[0], [c[1], c[2]]]));
CP.CATS = CATS;

/* ---------- Parte 6 do script (ficheiro novo Parte6) ---------- */
IB.addon6 = () => `// Oceanum · PARTE 6 — A tua agenda do Oceanum no Google Calendar (calendário "Oceanum"), que aparece também no Calendário do iPhone.
// Tudo o que está no Calendário do Oceanum vai para lá (trabalho, folgas, compromissos, aulas, provas, tarefas…); o que mudas ou apagas na app muda lá.
// Vai num FICHEIRO NOVO do mesmo projeto (＋ → Script → nome Parte6), por baixo da Parte5. Não apagues nem mudes as outras partes.
function oc6Cal_() { const P = PropertiesService.getScriptProperties(); let c = null; const id = P.getProperty('OC_CAL');
  if (id) { try { c = CalendarApp.getCalendarById(id); } catch (e) { c = null; } }
  if (!c) { const l = CalendarApp.getCalendarsByName('Oceanum'); c = l.length ? l[0] : CalendarApp.createCalendar('Oceanum', { summary: 'Tudo o que registas no Oceanum: trabalho, folgas, compromissos, aulas, provas, tarefas…' }); P.setProperty('OC_CAL', c.getId()); }
  return c; }
function oc6Dia_(s) { const d = String(s).split('-'); return new Date(+d[0], +d[1] - 1, +d[2]); }
function op_c6ping(p) { const c = oc6Cal_(); return { ok: true, v: 1, cal: c.getName() }; }
// j = {"up":[{"id","eid","t","s","e","all","l","d"}], "del":["eid", …]} → cria, atualiza e apaga; devolve id → eid
function op_cal6(p) { const c = oc6Cal_(), J = JSON.parse(String(p.j || '{}')), map = {}, del = (J.del || []).slice(0, 80), up = (J.up || []).slice(0, 60); let n = 0, x = 0, parar = '';
  for (let i = 0; i < del.length && !parar; i++) { try { const e = c.getEventById(String(del[i])); if (e) e.deleteEvent(); x++; } catch (er) { if (/too many|rate|limit|demasiad/i.test(String(er))) parar = String(er); } }
  for (let i = 0; i < up.length && !parar; i++) { const it = up[i]; try { let e = it.eid ? c.getEventById(String(it.eid)) : null; const t = String(it.t || '').slice(0, 200), o = { location: String(it.l || '').slice(0, 200), description: String(it.d || '').slice(0, 800) };
      if (e) { e.setTitle(t); e.setLocation(o.location); e.setDescription(o.description); if (it.all) { const a = oc6Dia_(it.s), b = oc6Dia_(it.e || it.s); if (b > a) e.setAllDayDates(a, new Date(b.getTime() + 864e5)); else e.setAllDayDate(a); } else e.setTime(new Date(it.s), new Date(it.e)); }
      else if (it.all) { const a = oc6Dia_(it.s), b = oc6Dia_(it.e || it.s); e = b > a ? c.createAllDayEvent(t, a, new Date(b.getTime() + 864e5), o) : c.createAllDayEvent(t, a, o); }
      else e = c.createEvent(t, new Date(it.s), new Date(it.e), o);
      map[it.id] = e.getId(); n++; } catch (er) { map[it.id] = ''; if (/too many|rate|limit|demasiad/i.test(String(er))) parar = String(er); } }
  return { ok: true, v: 1, map: map, n: n, apagados: x, cal: c.getName(), parar: parar }; }
`;
IB.addon7 = () => `// Oceanum · PARTE 7 — Cores na tua agenda: cada tipo vai para o seu calendário, com a sua cor pastel
// (Trabalho, Folgas, Tarefas, Estudos, Compromissos, Treino e rotina, e o calendário "Oceanum" para o resto). Aparece assim no Google Calendar e no iPhone.
// Vai num FICHEIRO NOVO do mesmo projeto (＋ → Script → nome Parte7), por baixo da Parte6. Não apagues nem mudes as outras partes.
function oc7Cal_(k, nome, cor) { const P = PropertiesService.getScriptProperties(), pk = 'OC7_' + k; let c = null; const id = P.getProperty(pk) || (k === 'outros' ? P.getProperty('OC_CAL') : null);
  if (id) { try { c = CalendarApp.getCalendarById(id); } catch (e) { c = null; } }
  if (!c) { const l = CalendarApp.getCalendarsByName(nome); c = l.length ? l[0] : CalendarApp.createCalendar(nome, { summary: 'Criado pelo Oceanum: o que registas na app aparece aqui.' }); }
  if (P.getProperty(pk) !== c.getId()) P.setProperty(pk, c.getId());
  if (cor && P.getProperty(pk + '_cor') !== cor) { try { c.setColor(cor); P.setProperty(pk + '_cor', cor); } catch (e) { } }
  return c; }
function oc7Dia_(s) { const d = String(s).split('-'); return new Date(+d[0], +d[1] - 1, +d[2]); }
function op_c7ping(p) { return { ok: true, v: 1 }; }
// j = {"cals":{"trabalho":["nome","#cor"],…}, "up":[{"id","eid","c","t","s","e","all","l","d","x","xc"}], "del":[{"e","c"}]} → cria, atualiza, muda de calendário e apaga
function op_cal7(p) { const J = JSON.parse(String(p.j || '{}')), K = J.cals || {}, cache = {}, map = {}, del = (J.del || []).slice(0, 80), up = (J.up || []).slice(0, 60); let n = 0, x = 0, parar = '';
  const cal = function (k) { k = K[k] ? k : 'outros'; if (!cache[k]) { const d = K[k] || ['Oceanum', '']; cache[k] = oc7Cal_(k, d[0], d[1]); } return cache[k]; };
  const tira = function (eid, k) { try { const e = cal(k).getEventById(String(eid)); if (e) e.deleteEvent(); x++; } catch (er) { if (/too many|rate|limit|demasiad/i.test(String(er))) parar = String(er); } };
  for (let i = 0; i < del.length && !parar; i++) tira(del[i].e, del[i].c);
  for (let i = 0; i < up.length && !parar; i++) { const it = up[i]; try { if (it.x) tira(it.x, it.xc);
      const c = cal(it.c); let e = it.eid ? c.getEventById(String(it.eid)) : null; const t = String(it.t || '').slice(0, 200), o = { location: String(it.l || '').slice(0, 200), description: String(it.d || '').slice(0, 800) };
      if (e) { e.setTitle(t); e.setLocation(o.location); e.setDescription(o.description); if (it.all) { const a = oc7Dia_(it.s), b = oc7Dia_(it.e || it.s); if (b > a) e.setAllDayDates(a, new Date(b.getTime() + 864e5)); else e.setAllDayDate(a); } else e.setTime(new Date(it.s), new Date(it.e)); }
      else if (it.all) { const a = oc7Dia_(it.s), b = oc7Dia_(it.e || it.s); e = b > a ? c.createAllDayEvent(t, a, new Date(b.getTime() + 864e5), o) : c.createAllDayEvent(t, a, o); }
      else e = c.createEvent(t, new Date(it.s), new Date(it.e), o);
      map[it.id] = e.getId(); n++; } catch (er) { map[it.id] = ''; if (/too many|rate|limit|demasiad/i.test(String(er))) parar = String(er); } }
  return { ok: true, v: 1, map: map, n: n, apagados: x, parar: parar }; }
`;
const ping = async op => { try { const j = await IB.post({ op }); return j && j.ok ? (+j.v || 1) : 0; } catch (e) { return -1; } };
CP.check = async () => { if (!(OS.Files && OS.Files.ready())) return false; const [v6, v7] = await Promise.all([ping('c6ping'), ping('c7ping')]); if (v6 < 0 && v7 < 0) return has6() || has7();
  const c = st(); if ((v6 >= 0 && +(c.c6 || 0) !== v6) || (v7 >= 0 && +(c.c7 || 0) !== v7)) { if (v6 >= 0) c.c6 = v6; if (v7 >= 0) c.c7 = v7; OS.touch('inbox'); }
  const any = v6 > 0 || v7 > 0; if (any && !cfg().on && !cfg().userOff) OS.setOne('calx', { on: true, err: '' });   // colaste a Parte 6 ou 7: liga sozinho
  if (any) CP.soon(1500); return any; };
CP.has6 = has6; CP.has7 = has7;

/* ---------- o que vai para fora ---------- */
const iso = (d, hm) => new Date(d + 'T' + hm + ':00').toISOString();
const plusMin = (d, hm, m) => new Date(new Date(d + 'T' + hm + ':00').getTime() + m * 6e4).toISOString();
const DUR = { exam: 120, class: 60, routine: 30 };
const TITLE = x => { const t = String(x.title || '');
  return x.src === 'shift' ? t.replace(/^Turno/, 'Trabalho') : x.src === 'off' ? (t || 'Folga') : x.src === 'class' ? 'Aula: ' + t : x.src === 'task' ? (x.done ? '✓ ' : '') + 'Tarefa: ' + t : x.src === 'bday' ? 'Aniversário: ' + t : t; };
CP.items = () => { const T = cfg().types || {}, out = [], seen = new Set();
  (OS.Cal.items(U.addDays(U.today(), -BACK), U.addDays(U.today(), AHEAD)) || []).forEach(x => { if (!x || !x.date || x.src === 'gcal' || x.src === 'mova' || x.planned || !T[x.src]) return;
    const [a, b] = win(x.src); if (x.date < a || x.date > b) return;
    const id = (x.edit || x.src + ':' + String(x.title || '').slice(0, 60)) + '@' + x.date; if (seen.has(id)) return; seen.add(id);
    const hm = /^\d\d:\d\d$/.test(x.start || '') ? x.start : '', he = /^\d\d:\d\d$/.test(x.end || '') ? x.end : '';
    let s, e, all = false; if (!hm) { all = true; s = x.date; e = x.date; }
    else { s = iso(x.date, hm); e = he ? (he > hm ? iso(x.date, he) : iso(U.addDays(x.date, 1), he)) : plusMin(x.date, hm, DUR[x.src] || 60); } // turno da noite: acaba no dia seguinte
    const place = x.src === 'event' || x.src === 'class' ? String(x.sub || '') : '', more = !place && x.sub ? String(x.sub) + '\n' : '';
    out.push({ id, k: x.src, c: CAT_OF[x.src] || 'outros', date: x.date, t: TITLE(x).slice(0, 200), s, e, all, l: place.slice(0, 200), d: more + 'Criado pelo Oceanum (' + ((OS.Cal.src[x.src] || [x.src])[0]) + '). Para mudar, altera na app.' }); });
  return out; };
const H = it => U.hash ? U.hash([it.t, it.s, it.e, it.all ? 1 : 0, it.l, it.d].join('|')).toString(36) : JSON.stringify([it.t, it.s, it.e, it.all, it.l, it.d]);
const catOf = (x, op) => op === 'cal7' ? x.c : 'outros';   // sem a Parte 7 vai tudo para o calendário "Oceanum"
// depois de "Começar do zero": também apaga lá fora os eventos já passados cujo registo deixou de existir na app
const gone = id => { const k = String(id).split('@')[0], i = k.indexOf(':'); if (i < 0) return false; const c = k.slice(0, i); return Array.isArray(OS.D[c]) && !OS.get(c, k.slice(i + 1)); };
CP.plan = (op = OP()) => { const c = cfg(), map = c.map || {}, cur = CP.items(), ids = new Set(cur.map(x => x.id));
  const up = []; cur.forEach(x => { const m = map[x.id], mc = (m && m.c) || 'outros', nc = catOf(x, op);
    if (m && m.e && mc !== nc) up.push(Object.assign({}, x, { c: nc, eid: '', x: m.e, xc: mc }));          // muda para o calendário da sua cor (sem duplicar)
    else if (!m || !m.e || m.h !== H(x)) up.push(Object.assign({}, x, { c: nc, eid: (m || {}).e || '' })); });
  const del = Object.entries(map).filter(([id, m]) => { if (ids.has(id) || !m || !m.e) return false; if (!m.d || (CP.purge && gone(id))) return true; const [a, b] = win(m.k); return m.d >= a && m.d <= b; }).map(([id, m]) => ({ id, e: m.e, c: m.c || 'outros' }));
  return { up, del, n: cur.length }; };

/* ---------- enviar ---------- */
let busy = false, timer = 0, again = false;
CP.state = { msg: '' };
CP.sync = async (quiet = true) => { const c = cfg(); if (!c.on) return 0; if (!ready()) { CP.state.msg = 'Falta a Parte 6 do script.'; return 0; } if (busy) { again = true; return 0; } busy = true; let sent = 0;
  try { for (let round = 0; round < 12; round++) { const op = OP(), P = CP.plan(op); if (!P.up.length && !P.del.length) break;
      const up = P.up.slice(0, 40), del = P.del.slice(0, 60), c7 = op === 'cal7';
      const body = c7 ? { cals: CALS(), up: up.map(x => ({ id: x.id, eid: x.eid, c: x.c, x: x.x || '', xc: x.xc || '', t: x.t, s: x.s, e: x.e, all: x.all, l: x.l, d: x.d })), del: del.map(x => ({ e: x.e, c: x.c })) }
        : { up: up.map(x => ({ id: x.id, eid: x.eid, t: x.t, s: x.s, e: x.e, all: x.all, l: x.l, d: x.d })), del: del.map(x => x.e) };
      const j = await IB.post({ op, j: JSON.stringify(body) });
      if (!j || !j.ok) throw new Error(j && /Valor inválido|Pedido inválido/.test(j.msg || '') ? 'O teu script ainda não tem a agenda: cola a Parte 6 (Definições → Script Google).' : (j && j.msg) || 'o script não respondeu');
      const map = Object.assign({}, cfg().map || {}); del.forEach(x => { delete map[x.id]; });
      up.forEach(x => { const eid = (j.map || {})[x.id]; if (eid) map[x.id] = { e: eid, h: H(x), d: x.date, k: x.k, c: x.c }; else if (x.x && c7 && map[x.id]) delete map[x.id]; }); // se não conseguiu mudar de calendário, volta a tentar
      const old = U.addDays(U.today(), -(BACK + 30)); Object.keys(map).forEach(k => { if (map[k] && map[k].d && map[k].d < old) delete map[k]; }); // o que já é passado fica lá, só deixa de ser seguido
      const okN = up.filter(x => (j.map || {})[x.id]).length; sent += okN + del.length;
      OS.setOne('calx', { map, at: Date.now(), n: Object.keys(map).length, err: '' }); if ((!okN && !del.length) || j.parar) break; }
    CP.purge = false;
    CP.state.msg = ''; if (!quiet) UI.toast(sent ? `Google Calendar atualizado (${sent} alteração${sent === 1 ? '' : 'ões'})` : 'O Google Calendar já está igual à app ✓', 'pos'); }
  catch (e) { OS.setOne('calx', { err: e.message || 'erro', at: Date.now() }); if (!quiet) UI.toast('Não consegui atualizar o Google Calendar: ' + (e.message || e), 'neg'); }
  busy = false; OS.request(); if (again) { again = false; CP.soon(3000); } return sent; };
CP.soon = (ms = 12000) => { if (!cfg().on) return; clearTimeout(timer); timer = setTimeout(() => CP.sync(true), ms); };
// qualquer mudança na app (turno, folga, escala importada, compromisso, aula, tarefa…) volta a comparar; só usa o script se houver diferenças
OS.on('change', () => CP.soon());
OS.on('ready', () => { setTimeout(() => { if (OS.Files && OS.Files.ready() && !has6()) CP.check(); }, 5500); setTimeout(() => CP.sync(true), 9000); setInterval(() => { if (!document.hidden) CP.sync(true); }, 2 * 6e4); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) CP.soon(4000); });

/* ---------- apagar tudo o que a app pôs lá ---------- */
CP.clear = async () => { const c = cfg(), L = Object.entries(c.map || {}).filter(([, m]) => m && m.e); let k = 0;
  while (k < L.length) { const part = L.slice(k, k + 60), op = OP(), j = await IB.post({ op, j: JSON.stringify(op === 'cal7' ? { cals: CALS(), up: [], del: part.map(([, m]) => ({ e: m.e, c: m.c || 'outros' })) } : { up: [], del: part.map(([, m]) => m.e) }) }); if (!j || !j.ok) throw new Error((j && j.msg) || 'o script não respondeu'); k += part.length; }
  OS.setOne('calx', { map: {}, n: 0, at: Date.now() }); return L.length; };

/* ---------- Definições → Ligações ---------- */
A.cpOn = async () => { if (!ready()) { if (OS.Files && OS.Files.ready()) await CP.check(); if (!ready()) { location.hash = 'definicoes.script'; return UI.toast('Cola a Parte 7 do script: é um ficheiro novo (Parte7), não mexes nas outras partes.', 'warn'); } }
  OS.setOne('calx', { on: true, userOff: false, err: '' }); OS.request(); UI.toast('A pôr a tua agenda no Google Calendar…'); await CP.sync(false); };
A.cpOff = () => UI.ask('Deixar de enviar para o Google Calendar?', 'Os eventos que a app já lá pôs (calendário "Oceanum") podem ficar ou ser apagados.', 'Desligar e apagar de lá', async () => {
  try { const n = await CP.clear(); OS.setOne('calx', { on: false, userOff: true }); UI.toast(`Desligado. ${n} evento(s) apagado(s) do calendário Oceanum.`, 'pos'); } catch (e) { OS.setOne('calx', { on: false, userOff: true }); UI.toast('Desligado, mas não consegui apagar de lá: ' + (e.message || e), 'warn'); } OS.request(); });
A.cpNow = () => CP.sync(false);
A.cpType = b => { const t = Object.assign({}, cfg().types || {}); t[b.dataset.k] = t[b.dataset.k] ? 0 : 1; OS.setOne('calx', { types: t }); CP.soon(1500); OS.request(); };
CP.panel = () => { const c = cfg(), T = c.types || {}, ok = ready(), P = c.on && ok ? CP.plan() : null;
  return `<div class="pn" id="cpSet"><div class="pn-h"><h3>${UI.ic('cal')}A tua agenda também fora da app</h3>${c.on ? `<span class="bdg ${c.err ? 'warn' : 'pos'}">${c.err ? 'com erro' : 'ligado'}</span>` : ''}</div>
    <p class="mut" style="margin:0 0 10px">Tudo o que está no Calendário do Oceanum vai sozinho para um calendário <b>Oceanum</b> no teu Google Calendar e aparece no <b>Calendário do iPhone</b>: o trabalho (também a escala que importas por foto), as folgas, os compromissos, as aulas, as provas… Quando alteras ou apagas na app, muda lá também. Os teus outros calendários não são tocados.</p>
    <div class="cp-types">${TYPES.map(([k, l]) => `<button class="chip ${T[k] ? 'on' : ''}" data-act="cpType" data-k="${k}" aria-pressed="${T[k] ? 'true' : 'false'}">${T[k] ? '✓ ' : ''}${l}</button>`).join('')}</div>
    ${ok && has7() ? `<div class="cp-cols" aria-label="Cores no Google Calendar e no iPhone"><small class="mut">Cores lá fora (Google Calendar e iPhone):</small>${CATS.map(c => `<span class="cp-col"><i style="background:${c[2]}"></i>${esc(c[1].replace('Oceanum · ', '').replace(/^Oceanum$/, 'Outros (metas, contas, aniversários)'))}</span>`).join('')}</div>` : ''}
    ${!ok ? `<div class="note" style="margin-top:10px">Precisa da <b>Parte 7</b> do script, em <a class="acc" href="#definicoes.script">Definições → Script Google</a>. É um <b>ficheiro novo</b> (Parte7): não apagas nem mudas nenhuma das outras partes. Depois de a colares, liga-se sozinho e cada tipo aparece com a sua cor pastel (Trabalho, Folgas, Tarefas…).</div>` : !has7() ? `<div class="note" style="margin-top:10px">Para cada tipo ter a <b>sua cor</b> lá fora (Trabalho azul, Folgas verde, Tarefas amarelo…), cola a <b>Parte 7</b> em <a class="acc" href="#definicoes.script">Definições → Script Google</a>: é um ficheiro novo, não mexes na Parte 6 nem nas outras. Os eventos que já lá estão mudam sozinhos para o calendário da sua cor.</div>` : ''}
    <div class="row gap8" style="margin-top:10px;flex-wrap:wrap">${c.on ? `<button class="btn sm" data-act="cpNow">${UI.ic('sync')}Atualizar agora</button><button class="btn sm ghost" data-act="cpOff">Desligar</button>` : `<button class="btn sm pri" data-act="cpOn">${UI.ic('cal')}Pôr a minha agenda no Google Calendar</button>`}</div>
    ${c.on ? `<p class="mut" style="font-size:12.5px;margin:8px 0 0">${c.n || 0} evento(s) no calendário Oceanum${c.at ? ' · última atualização ' + new Date(c.at).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}${P && (P.up.length || P.del.length) ? ` · ${P.up.length + P.del.length} por enviar` : ''}${c.err ? `<br><span class="warn">${esc(c.err)}</span>` : ''}</p>` : ''}
    <details class="tog" style="margin-top:10px"><summary><span>Ver no iPhone</span>${UI.ic('down', 'chev')}</summary><div class="tog-b"><ol class="ai-steps"><li>No iPhone: <b>Ajustes → Apps → Calendário → Contas</b> (ou Ajustes → Calendário → Contas).</li><li>Se a tua conta Google não estiver lá: <b>Adicionar conta → Google</b>. Se estiver, abre-a e liga <b>Calendários</b>.</li><li>Abre a app Calendário → <b>Calendários</b> (em baixo) e confirma que o <b>Oceanum</b> está marcado.</li></ol><p class="mut" style="font-size:12.5px">Também aparece no Google Calendar no telemóvel e no computador. As alterações chegam em poucos minutos.</p></div></details></div>`; };
})();
