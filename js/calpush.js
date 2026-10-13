/* OCEANUM — A tua agenda do Oceanum também FORA da app: tudo o que registas (turnos e folgas do trabalho, compromissos,
   provas e entregas, aulas, tarefas com data…) vai sozinho para um calendário "Oceanum" no teu Google Calendar, que aparece
   no Calendário do iPhone. Quando alteras ou apagas na app, atualiza ou apaga lá. É feito pelo teu script Google (Parte 5, versão 6).
   Só escreve no calendário "Oceanum": os teus outros calendários ficam intactos. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc, IB = OS.Inbox;
const CP = OS.CalPush = {};
OS.ONE_DEF.calx = { on: false, types: { shift: 1, off: 1, event: 1, exam: 1, class: 0, task: 0, opp: 0 }, map: {}, at: 0, n: 0, err: '' };
const cfg = () => OS.one('calx');
const TYPES = [['shift', 'Turnos de trabalho'], ['off', 'Folgas'], ['event', 'Compromissos'], ['exam', 'Provas, testes e entregas'], ['class', 'Aulas'], ['task', 'Tarefas com data'], ['opp', 'Prazos (oportunidades e contactos)']];
const BACK = 30, AHEAD = 180;   // janela gerida: 30 dias para trás e 6 meses para a frente
const win = () => [U.addDays(U.today(), -BACK), U.addDays(U.today(), AHEAD)];
const ready = () => !!(OS.Files && OS.Files.ready() && OS.Files.has6());

/* ---------- o que vai para fora ---------- */
const iso = (d, hm) => new Date(d + 'T' + hm + ':00').toISOString();
const plusMin = (d, hm, m) => new Date(new Date(d + 'T' + hm + ':00').getTime() + m * 6e4).toISOString();
CP.items = () => { const [a, b] = win(), T = cfg().types || {}, out = [];
  (OS.Cal.items(a, b) || []).forEach(x => { if (!x.edit || x.src === 'gcal' || !T[x.src] || x.planned) return; if (x.src === 'task' && x.done) return;
    const id = x.edit + '@' + x.date, hm = /^\d\d:\d\d$/.test(x.start || '') ? x.start : '', he = /^\d\d:\d\d$/.test(x.end || '') ? x.end : '';
    let s, e, all = false; if (!hm) { all = true; s = x.date; e = x.date; }
    else { s = iso(x.date, hm); e = he ? (he > hm ? iso(x.date, he) : iso(U.addDays(x.date, 1), he)) : plusMin(x.date, hm, x.src === 'exam' ? 120 : 60); } // turno da noite: acaba no dia seguinte
    const title = x.src === 'off' ? (x.title || 'Folga') : x.src === 'class' ? 'Aula: ' + x.title : x.src === 'task' ? 'Tarefa: ' + x.title : x.title;
    out.push({ id, date: x.date, t: String(title).slice(0, 200), s, e, all, l: String(x.sub || '').slice(0, 200), d: 'Criado pelo Oceanum (' + ((OS.Cal.src[x.src] || [x.src])[0]) + '). Para mudar, altera na app.' }); });
  return out; };
const H = it => U.hash ? U.hash([it.t, it.s, it.e, it.all ? 1 : 0, it.l].join('|')).toString(36) : JSON.stringify([it.t, it.s, it.e, it.all, it.l]);
CP.plan = () => { const c = cfg(), map = c.map || {}, cur = CP.items(), ids = new Set(cur.map(x => x.id)), [a, b] = win();
  const up = cur.filter(x => !map[x.id] || !map[x.id].e || map[x.id].h !== H(x)).map(x => Object.assign({}, x, { eid: (map[x.id] || {}).e || '' }));
  const del = Object.entries(map).filter(([id, m]) => !ids.has(id) && m && m.e && (!m.d || (m.d >= a && m.d <= b))).map(([id, m]) => ({ id, e: m.e }));
  return { up, del, n: cur.length }; };

/* ---------- enviar ---------- */
let busy = false, timer = 0, again = false;
CP.state = { msg: '' };
CP.sync = async (quiet = true) => { const c = cfg(); if (!c.on) return 0; if (!ready()) { CP.state.msg = 'Falta a Parte 5 (versão 6) do script.'; return 0; } if (busy) { again = true; return 0; } busy = true; let sent = 0;
  try { for (let round = 0; round < 12; round++) { const P = CP.plan(); if (!P.up.length && !P.del.length) break;
      const up = P.up.slice(0, 40), del = P.del.slice(0, 60), j = await IB.post({ op: 'calsync', j: JSON.stringify({ up: up.map(x => ({ id: x.id, eid: x.eid, t: x.t, s: x.s, e: x.e, all: x.all, l: x.l, d: x.d })), del: del.map(x => x.e) }) });
      if (!j || !j.ok) throw new Error(j && /Valor inválido|Pedido inválido/.test(j.msg || '') ? 'O teu script ainda não tem a agenda: atualiza a Parte 5 (Definições → Script Google).' : (j && j.msg) || 'o script não respondeu');
      const map = Object.assign({}, cfg().map || {}); del.forEach(x => { delete map[x.id]; });
      up.forEach(x => { const eid = (j.map || {})[x.id]; if (eid) map[x.id] = { e: eid, h: H(x), d: x.date }; });
      const okN = up.filter(x => (j.map || {})[x.id]).length; sent += okN + del.length;
      OS.setOne('calx', { map, at: Date.now(), n: Object.keys(map).length, err: '' }); if (!okN && !del.length) break; }
    CP.state.msg = ''; if (!quiet) UI.toast(sent ? `Google Calendar atualizado (${sent} alteração${sent === 1 ? '' : 'ões'})` : 'O Google Calendar já está igual à app ✓', 'pos'); }
  catch (e) { OS.setOne('calx', { err: e.message || 'erro', at: Date.now() }); if (!quiet) UI.toast('Não consegui atualizar o Google Calendar: ' + (e.message || e), 'neg'); }
  busy = false; OS.request(); if (again) { again = false; CP.soon(3000); } return sent; };
CP.soon = (ms = 12000) => { if (!cfg().on) return; clearTimeout(timer); timer = setTimeout(() => CP.sync(true), ms); };
const WATCH = new Set(['shifts', 'dayoffs', 'events', 'assessments', 'classes', 'subjects', 'tasks', 'opps', 'contacts']);
OS.on('change', c => { if (WATCH.has(c)) CP.soon(); });
OS.on('ready', () => { setTimeout(() => CP.sync(true), 9000); setInterval(() => { if (!document.hidden) CP.sync(true); }, 30 * 6e4); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) CP.soon(4000); });

/* ---------- apagar tudo o que a app pôs lá ---------- */
CP.clear = async () => { const c = cfg(), L = Object.entries(c.map || {}).filter(([, m]) => m && m.e); let k = 0;
  while (k < L.length) { const part = L.slice(k, k + 60), j = await IB.post({ op: 'calsync', j: JSON.stringify({ up: [], del: part.map(([, m]) => m.e) }) }); if (!j || !j.ok) throw new Error((j && j.msg) || 'o script não respondeu'); k += part.length; }
  OS.setOne('calx', { map: {}, n: 0, at: Date.now() }); return L.length; };

/* ---------- Definições → Ligações ---------- */
A.cpOn = async () => { if (!ready()) { if (OS.Files && OS.Files.ready()) await OS.Files.check(); if (!ready()) { location.hash = 'definicoes.script'; return UI.toast(OS.Files && OS.Files.has5() ? 'Atualiza a Parte 5 do script (copia de novo e substitui o conteúdo do ficheiro Parte5).' : 'Cola primeiro a Parte 5 do script.', 'warn'); } }
  OS.setOne('calx', { on: true, err: '' }); OS.request(); UI.toast('A pôr a tua agenda no Google Calendar…'); await CP.sync(false); };
A.cpOff = () => UI.ask('Deixar de enviar para o Google Calendar?', 'Os eventos que a app já lá pôs (calendário "Oceanum") podem ficar ou ser apagados.', 'Desligar e apagar de lá', async () => {
  try { const n = await CP.clear(); OS.setOne('calx', { on: false }); UI.toast(`Desligado. ${n} evento(s) apagado(s) do calendário Oceanum.`, 'pos'); } catch (e) { OS.setOne('calx', { on: false }); UI.toast('Desligado, mas não consegui apagar de lá: ' + (e.message || e), 'warn'); } OS.request(); });
A.cpNow = () => CP.sync(false);
A.cpType = b => { const t = Object.assign({}, cfg().types || {}); t[b.dataset.k] = t[b.dataset.k] ? 0 : 1; OS.setOne('calx', { types: t }); CP.soon(1500); OS.request(); };
CP.panel = () => { const c = cfg(), T = c.types || {}, ok = ready(), P = c.on && ok ? CP.plan() : null;
  return `<div class="pn" id="cpSet"><div class="pn-h"><h3>${UI.ic('cal')}A tua agenda também fora da app</h3>${c.on ? `<span class="bdg ${c.err ? 'warn' : 'pos'}">${c.err ? 'com erro' : 'ligado'}</span>` : ''}</div>
    <p class="mut" style="margin:0 0 10px">Tudo o que registas no Oceanum vai sozinho para um calendário <b>Oceanum</b> no teu Google Calendar e aparece no <b>Calendário do iPhone</b>. Quando alteras ou apagas na app, muda lá também. Os teus outros calendários não são tocados.</p>
    <div class="cp-types">${TYPES.map(([k, l]) => `<button class="chip ${T[k] ? 'on' : ''}" data-act="cpType" data-k="${k}" aria-pressed="${T[k] ? 'true' : 'false'}">${T[k] ? '✓ ' : ''}${l}</button>`).join('')}</div>
    ${!ok ? `<div class="note" style="margin-top:10px">${OS.Files && OS.Files.has5() ? 'O teu script tem a Parte 5 antiga: em <a class="acc" href="#definicoes.script">Definições → Script Google</a> copia outra vez a <b>Parte 5</b> e substitui o conteúdo do ficheiro Parte5 (e faz Nova versão). Na primeira vez o Google pede autorização para a Agenda.' : 'Precisa da <b>Parte 5</b> do script (em <a class="acc" href="#definicoes.script">Definições → Script Google</a>).'}</div>` : ''}
    <div class="row gap8" style="margin-top:10px;flex-wrap:wrap">${c.on ? `<button class="btn sm" data-act="cpNow">${UI.ic('sync')}Atualizar agora</button><button class="btn sm ghost" data-act="cpOff">Desligar</button>` : `<button class="btn sm pri" data-act="cpOn">${UI.ic('cal')}Pôr a minha agenda no Google Calendar</button>`}</div>
    ${c.on ? `<p class="mut" style="font-size:12.5px;margin:8px 0 0">${c.n || 0} evento(s) no calendário Oceanum${c.at ? ' · última atualização ' + new Date(c.at).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}${P && (P.up.length || P.del.length) ? ` · ${P.up.length + P.del.length} por enviar` : ''}${c.err ? `<br><span class="warn">${esc(c.err)}</span>` : ''}</p>` : ''}
    <details class="tog" style="margin-top:10px"><summary><span>Ver no iPhone</span>${UI.ic('down', 'chev')}</summary><div class="tog-b"><ol class="ai-steps"><li>No iPhone: <b>Ajustes → Apps → Calendário → Contas</b> (ou Ajustes → Calendário → Contas).</li><li>Se a tua conta Google não estiver lá: <b>Adicionar conta → Google</b>. Se estiver, abre-a e liga <b>Calendários</b>.</li><li>Abre a app Calendário → <b>Calendários</b> (em baixo) e confirma que o <b>Oceanum</b> está marcado.</li></ol><p class="mut" style="font-size:12.5px">Também aparece no Google Calendar no telemóvel e no computador. As alterações chegam em poucos minutos.</p></div></details></div>`; };
})();
