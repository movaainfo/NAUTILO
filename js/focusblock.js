/* NÁUTILO — Bloco de foco: resolver pendências, uma de cada vez.
   Escolhes o tema (ou o Náutilo escolhe pela prioridade da app toda), o tempo de cada pendência e as apps a bloquear.
   Ecrã fechado: no fim de cada tempo pergunta "Terminaste?" — sim passa à seguinte, não acrescenta tempo.
   Sair antes do fim pede Face ID ou o código.
   Limite real: uma app web não consegue bloquear outras apps do iPhone. Esse bloqueio faz-se com o modo Foco + Atalhos
   (o Náutilo pode ligar/desligar o Atalho sozinho); o guia está na aba "Bloquear apps". */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc;
const K = 'os2fblk';
let B = U.ls.get(K, null);                 // bloco em curso
const save = () => { if (B) U.ls.set(K, B); else U.ls.del(K); };
const APPS = ['Instagram', 'TikTok', 'YouTube', 'WhatsApp', 'X (Twitter)', 'Facebook', 'Snapchat', 'Reddit', 'Netflix', 'Twitch', 'Discord', 'Telegram', 'Pinterest', 'Kwai', 'Jogos', 'Safari', 'Spotify', 'LinkedIn'];
OS.ONE_DEF.focusblk = { apps: ['Instagram', 'TikTok', 'YouTube', 'WhatsApp', 'X (Twitter)', 'Netflix', 'Jogos'], sc: false, scOn: 'Náutilo Foco', scOff: 'Náutilo Fim', n: 5 };
const cfg = () => Object.assign({}, OS.ONE_DEF.focusblk, OS.one('focusblk'));
// o app passou a chamar-se Náutilo: os atalhos com os nomes antigos passam para os novos (e o aviso diz o que mudar no iPhone)
OS.on('ready', () => { const o = OS.one('focusblk'); if (!o) return; let ch = 0; if (o.scOn === 'Oceanum Foco') { o.scOn = 'Náutilo Foco'; ch = 1; } if (o.scOff === 'Oceanum Fim') { o.scOff = 'Náutilo Fim'; ch = 1; } if (ch) { o.renMsg = 1; OS.touch('focusblk'); } });
A.fbRenOk = () => { const o = OS.one('focusblk'); o.renMsg = 0; OS.touch('focusblk'); };
const renNote = c => c.renMsg && c.sc ? `<div class="pn fb-ren"><div class="pn-h"><h3>O app chama-se agora Náutilo: muda 4 nomes no iPhone</h3></div><ol><li>Atalhos: <b>Oceanum Foco</b> → <b>Náutilo Foco</b> e <b>Oceanum Fim</b> → <b>Náutilo Fim</b> (toca e mantém → Mudar o nome).</li><li>Ajustes → Foco: o modo <b>OCEANUM</b> → <b>NÁUTILO</b> (e nas ações <b>Definir Foco</b> dos dois atalhos escolhe o NÁUTILO).</li><li>Nos dois atalhos e na automação, o ficheiro <code>Atalhos/oceanum-foco.txt</code> passa a <code>Atalhos/nautilo-foco.txt</code>.</li></ol><button class="btn sm" data-act="fbRenOk">Já mudei</button></div>` : '';
OS.S.focusblocks = { label: 'Bloco de foco', title: r => 'Bloco · ' + (r.theme || '') + ' · ' + U.fmtD(r.date), fields: [
  { k: 'date', l: 'Dia', t: 'date' }, { k: 'theme', l: 'Tema', t: 'text' }, { k: 'planned', l: 'Pendências planeadas', t: 'num' }, { k: 'done', l: 'Resolvidas', t: 'num' },
  { k: 'minutes', l: 'Minutos', t: 'num' }, { k: 'leaves', l: 'Saídas da app', t: 'num' }, { k: 'early', l: 'Saiu antes do fim', t: 'bool' }, { k: 'note', l: 'Nota', t: 'text' }] };

/* ---------- pendências candidatas (mesma prioridade do Next Action) ---------- */
const clamp = m => Math.max(5, Math.min(120, Math.round((U.num(m) || 25) / 5) * 5));
const taskOf = n => n.edit && n.edit.startsWith('tasks:') ? OS.get('tasks', n.edit.slice(6)) : null;
const subjOf = n => { const t = taskOf(n); if (t && t.subject) return t.subject; const m = (n.focus || '').match(/data-subject="([^"]+)"/); return m ? m[1] : ''; };
const projName = id => (OS.get('projects', id) || {}).name || '';
const themeL = th => th === 'auto' ? 'Automático (prioridade)' : th.startsWith('area:') ? th.slice(5) : th.startsWith('proj:') ? 'Projeto · ' + projName(th.slice(5)) : th.startsWith('subj:') ? 'Disciplina · ' + ((OS.get('subjects', th.slice(5)) || {}).name || '') : th;
const cands = th => {
  let na = OS.Intel.next();
  if (th.startsWith('area:')) { const a = th.slice(5); na = na.filter(n => n.area === a || (taskOf(n) && taskOf(n).area === a)); }
  else if (th.startsWith('proj:')) { const p = th.slice(5); na = na.filter(n => (taskOf(n) || {}).project === p); }
  else if (th.startsWith('subj:')) { const s = th.slice(5); na = na.filter(n => subjOf(n) === s); }
  const seen = new Set();
  return na.map(n => { const t = taskOf(n); return { k: n.edit || (n.kind + ':' + n.title), title: n.title, kind: n.kind, area: n.area || '', why: (n.why || []).slice(0, 2).join(' · '), mins: clamp(n.eff), act: t ? '' : (n.act || ''), task: t ? t.id : '', subject: subjOf(n) }; })
    .filter(x => !seen.has(x.k) && seen.add(x.k));
};
const themes = () => { const na = OS.Intel.next(), open = OS.Tasks.open();
  return { areas: [...new Set(na.map(n => n.area).filter(Boolean))], projs: OS.all('projects').filter(p => !['Concluído', 'Cancelado'].includes(p.status) && open.some(t => t.project === p.id)), subs: OS.St.current().filter(s => na.some(n => subjOf(n) === s.id)) }; };

/* ---------- rascunho do bloco (antes de começar) ---------- */
let DR = { th: 'auto', sel: {}, mins: {}, extra: [] };
const list = () => cands(DR.th).concat(DR.extra);
const isSel = (x, i) => DR.sel[x.k] != null ? DR.sel[x.k] : i < cfg().n;
const picked = () => list().filter(isSel).map(x => Object.assign({}, x, { mins: clamp(DR.mins[x.k] || x.mins) }));

/* ---------- página ---------- */
// bloquear as apps do iPhone (Foco + Atalhos) configura-se em Definições → Atalhos do iPhone (OS.FocusBlock.settings)
const TB = [['', 'Começar'], ['hist', 'Histórico']];
V.foco = sub => { const k = TB.some(t => t[0] === (sub || '')) ? (sub || '') : '';
  return UI.head('Bloco de foco', 'Resolve as tuas pendências, uma de cada vez. Sem fugir até acabar.', B ? `<button class="btn pri" data-act="fbShow">${UI.ic('focus')}Voltar ao bloco</button>` : '') + UI.tabs('foco', TB, k) + `<div class="fb-page">${P[k]()}</div>`; };
const P = {};
P[''] = () => { if (B) return `<div class="pn"><b>Tens um bloco em curso.</b><p class="mut">${B.items.filter(x => x.st === 'done').length} de ${B.items.length} pendências resolvidas.</p><button class="btn pri" data-act="fbShow">Voltar ao bloco</button></div>`;
  const th = themes(), L = list(), sel = picked(), tot = U.sum(sel, x => x.mins), c = cfg(), opt = (v, l) => `<option value="${esc(v)}"${DR.th === v ? ' selected' : ''}>${esc(l)}</option>`;
  return `<div class="pn"><div class="pn-h"><h3>1 · Tema</h3></div>
    <select class="field" id="fbTheme" aria-label="Tema do bloco">${opt('auto', 'Automático — o Náutilo escolhe pela prioridade da app toda')}${th.areas.length ? `<optgroup label="Área">${th.areas.map(a => opt('area:' + a, a)).join('')}</optgroup>` : ''}${th.projs.length ? `<optgroup label="Projeto">${th.projs.map(p => opt('proj:' + p.id, p.name)).join('')}</optgroup>` : ''}${th.subs.length ? `<optgroup label="Disciplina">${th.subs.map(s => opt('subj:' + s.id, s.name)).join('')}</optgroup>` : ''}</select>
    <small class="mut">Sem tema, a ordem vem da Próxima ação: atrasos, prazos, prioridade, impacto e metas.</small></div>
  <div class="pn"><div class="pn-h"><h3>2 · Pendências e tempo de cada uma</h3><span class="mut">${sel.length} escolhidas · ${U.hours(tot)}</span></div>
    <div class="fb-list">${L.map((x, i) => `<label class="fb-it ${isSel(x, i) ? 'on' : ''}"><input type="checkbox" data-fbk="${esc(x.k)}" ${isSel(x, i) ? 'checked' : ''}><span class="fb-n">${i + 1}</span><span class="fb-t"><b>${esc(x.title)}</b><small>${esc([x.kind, x.area, x.why].filter(Boolean).join(' · '))}</small></span><span class="fb-m"><input type="number" min="5" max="120" step="5" inputmode="numeric" data-fbm="${esc(x.k)}" value="${clamp(DR.mins[x.k] || x.mins)}" aria-label="Minutos"><small>min</small></span></label>`).join('') || UI.empty('Sem pendências neste tema. Escolhe outro ou acrescenta uma abaixo.')}</div>
    <form class="fb-add" data-form="fbAdd"><input class="field" name="t" placeholder="Acrescentar pendência (ex.: responder ao e-mail da Joana)" required><input class="field" name="m" type="number" min="5" max="120" step="5" value="15" aria-label="Minutos"><button class="btn">${UI.ic('plus')}Juntar</button></form></div>
  <div class="fb-go"><div><b>${sel.length} pendência(s) · ${U.hours(tot)}</b><small>Para sair antes do fim: Face ID ou código.${c.sc ? ' As apps do iPhone ficam bloqueadas pelo modo Foco.' : ''} <a class="acc" href="#definicoes.atalhos">Bloquear apps</a></small></div><button class="btn pri lg" data-act="fbGo" ${sel.length ? '' : 'disabled'}>${UI.ic('focus')}Começar bloco</button></div>`; };
P.apps = () => { const c = cfg(), ap = c.apps.length ? c.apps.join(', ') : '(escolhe as apps acima)';
  return renNote(c) + `<div class="pn"><p style="margin:0 0 8px"><b>A verdade:</b> o iPhone não deixa nenhuma app web (nem o Safari) fechar ou bloquear outras apps. O que o Náutilo faz sozinho: ecrã fechado até acabares, saída só com Face ID ou código, e conta cada vez que sais da app. Para bloquear as outras apps de verdade usa o <b>modo Foco</b> + <b>Atalhos</b> (5 minutos, uma vez só):</p></div>
  <div class="pn fb-guide"><h3>1 · Criar o modo Foco "NÁUTILO"</h3><ol><li>Ajustes → Foco → <b>+</b> → Personalizado → nome <b>NÁUTILO</b>.</li><li>Notificações → Pessoas: só favoritos. Apps: permite só as essenciais (Telefone, Náutilo).</li><li>Ecrãs → Ecrã principal → escolhe uma página só com o Náutilo. Com o Foco ligado as outras apps desaparecem do ecrã.</li></ol></div>
  <div class="pn fb-guide"><h3>2 · Atalho "${esc(c.scOn)}" (o Náutilo chama-o ao começar)</h3><ol><li>App Atalhos → <b>+</b> → nome <b>${esc(c.scOn)}</b>.</li><li>Ação <b>Adicionar à data</b>: Data atual + <i>Entrada do atalho</i> minutos.</li><li>Ação <b>Guardar ficheiro</b>: guarda essa data em <code>Atalhos/nautilo-foco.txt</code> (substituir: sim, perguntar: não).</li><li>Ação <b>Definir Foco</b>: Náutilo → Ligado → até essa data.</li></ol></div>
  <div class="pn fb-guide"><h3>3 · Atalho "${esc(c.scOff)}" (chamado quando o bloco acaba)</h3><ol><li>Ação <b>Guardar ficheiro</b>: texto <code>2000-01-01</code> em <code>Atalhos/nautilo-foco.txt</code>.</li><li>Ação <b>Definir Foco</b>: Náutilo → Desligado.</li></ol></div>
  <div class="pn fb-guide"><h3>4 · Bloquear as apps (automação)</h3><ol><li>Atalhos → Automação → <b>+</b> → <b>App</b> → escolhe: <b>${esc(ap)}</b> → "É aberta" → <b>Executar imediatamente</b>.</li><li>Ações: <b>Obter ficheiro</b> <code>Atalhos/nautilo-foco.txt</code> → <b>Se</b> Data atual <i>é antes de</i> o conteúdo do ficheiro → <b>Mostrar notificação</b> "Estás num bloco de foco. Volta ao Náutilo." → <b>Ir para o ecrã principal</b>.</li><li>Pronto: durante o bloco essas apps fecham-se sozinhas mal as abres.</li></ol>
    <div class="ws-form" style="margin-top:10px"><label>Nome do Atalho que liga<input class="field" data-bind="focusblk.scOn" value="${esc(c.scOn)}"></label><label>Nome do Atalho que desliga<input class="field" data-bind="focusblk.scOff" value="${esc(c.scOff)}"></label></div>
    <label class="switch" style="margin-top:10px"><input type="checkbox" data-bind="focusblk.sc" ${c.sc ? 'checked' : ''}><span></span>Chamar os Atalhos automaticamente ao começar e ao acabar</label>
    <div class="row gap8" style="margin-top:10px"><button class="btn ghost sm" data-act="fbTestSc">Testar Atalho agora</button></div></div>
  <div class="pn"><b>Mais forte ainda:</b> <span class="mut">Ajustes → Tempo de ecrã → Limites de apps (1 min/dia) nas piores apps, com código do Tempo de ecrã guardado por outra pessoa.</span></div>`; };
P.hist = () => { const H = U.sortBy(OS.all('focusblocks'), r => r.date + (r._c || '')).reverse(), wk = U.monday(U.today()), W = H.filter(r => r.date >= wk);
  return `<div class="kpis">${UI.kpi('Blocos esta semana', W.length)}${UI.kpi('Pendências resolvidas', U.sum(W, r => r.done), 'esta semana')}${UI.kpi('Minutos de foco', U.sum(W, r => r.minutes), 'esta semana')}${UI.kpi('Saídas da app', H.length ? U.r1(U.sum(H, r => r.leaves) / H.length) : '—', 'média por bloco')}</div>
  <div class="pn"><div class="list">${H.slice(0, 40).map(r => `<div class="li click" data-edit="focusblocks:${r.id}"><span class="when">${U.fmtDS(r.date)}</span><div class="li-t"><b>${esc(r.theme || 'Bloco')}</b><small>${r.done}/${r.planned} resolvidas · ${r.minutes} min · ${r.leaves || 0} saída(s)${r.early ? ' · saiu antes do fim' : ''}</small></div></div>`).join('') || UI.empty('Ainda sem blocos. Começa o primeiro.')}</div></div>`; };

/* ---------- interações do rascunho ---------- */
document.addEventListener('change', e => { const t = e.target;
  if (t.id === 'fbTheme') { DR = { th: t.value, sel: {}, mins: {}, extra: DR.extra }; OS.request(); return; }
  if (t.dataset && t.dataset.fbk != null) { DR.sel[t.dataset.fbk] = t.checked; OS.request(); return; }
  if (t.dataset && t.dataset.fbm != null) { DR.mins[t.dataset.fbm] = clamp(t.value); OS.request(); } });
OS.forms.fbAdd = f => { const t = f.elements.t.value.trim(); if (!t) return; const k = 'x:' + Date.now(); DR.extra.push({ k, title: t, kind: 'Pendência', area: '', why: 'acrescentada por ti', mins: clamp(f.elements.m.value), act: '', task: '', subject: '' }); DR.sel[k] = true; OS.request(); };
A.fbApp = b => { const c = cfg(), a = b.dataset.a, apps = c.apps.includes(a) ? c.apps.filter(x => x !== a) : c.apps.concat(a); OS.setOne('focusblk', Object.assign({}, OS.one('focusblk'), { apps })); };
const runSc = name => { if (!name) return; if (B) { B.grace = Date.now(); save(); } try { location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent(name) + '&input=text&text=' + (B ? Math.max(5, Math.ceil((B.items.filter(x => x.st !== 'done' && x.st !== 'skip').reduce((s, x) => s + x.mins, 0)) + 15)) : 25); } catch (e) { } };
A.fbTestSc = () => runSc(cfg().scOn);

/* ---------- o bloco ---------- */
let wl = null; const wake = () => { try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => wl = l).catch(() => { }); } catch (e) { } };
const cur = () => B && B.items[B.i];
A.fbGo = () => { const items = picked(); if (!items.length) return UI.toast('Escolhe pelo menos uma pendência', 'neg'); const now = Date.now(), c = cfg();
  B = { th: themeL(DR.th), items: items.map(x => Object.assign(x, { st: '', extra: 0, t0: 0, used: 0 })), i: 0, start: now, end: 0, phase: 'run', leaves: 0, away: 0, apps: c.apps.slice(), out: 0, grace: 0 };
  begin(); DR = { th: DR.th, sel: {}, mins: {}, extra: [] }; wake(); draw(); if (c.sc) setTimeout(() => runSc(c.scOn), 400); };
const begin = () => { const it = cur(); if (!it) return; it.t0 = Date.now(); B.end = it.t0 + it.mins * 6e4; B.phase = 'run'; save(); };
const usedOf = it => it.used + (it.t0 ? Date.now() - it.t0 : 0);
const SAFE = ['taskDone', 'habit', 'contactDone', 'mlDone'];
const resolve = it => { try {
  if (it.task) { const t = OS.get('tasks', it.task); if (t && t.status !== 'Feita') OS.Tasks.complete(it.task); }
  else if (it.act) { const m = it.act.match(/data-act="(\w+)"/), ds = {}; it.act.replace(/data-([\w-]+)="([^"]*)"/g, (_, k, v) => { ds[k.replace(/-(\w)/g, (__, ch) => ch.toUpperCase())] = v; }); if (m && SAFE.includes(m[1]) && A[m[1]]) A[m[1]]({ dataset: ds, closest: () => null }); }
} catch (e) { } };
const stop = it => { it.used = usedOf(it); it.t0 = 0; };
const next = () => { const i = B.items.findIndex(x => !x.st); if (i < 0) return finish(false); B.i = i; begin(); draw(); };
A.fbDone = () => { const it = cur(); if (!it) return; stop(it); it.st = 'done'; resolve(it); UI.toast('Resolvida: ' + it.title, 'pos'); next(); };
A.fbSkip = () => { const it = cur(); if (!it) return; stop(it); it.st = 'skip'; next(); };
A.fbNo = () => { B.phase = 'more'; save(); draw(); };
A.fbMore = b => { const m = +b.dataset.m || 10, it = cur(); it.extra += m; B.end = Date.now() + m * 6e4; B.phase = 'run'; save(); draw(); };
A.fbExit = () => { B.prev = B.phase; B.phase = 'exit'; save(); draw(); setTimeout(() => { const i = U.$('#fbCode'); i && matchMedia('(pointer:fine)').matches && i.focus(); }, 60); };
A.fbStay = () => { B.phase = B.prev && B.prev !== 'exit' ? B.prev : 'run'; save(); draw(); };
A.fbBio = async b => { b.disabled = true; const ok = await OS.Lock.verifyBio(); b.disabled = false; if (ok) finish(true); };
OS.forms.fbCode = async f => { const err = await OS.Lock.verifyCode(f.elements.c.value); if (!err) return finish(true); const m = U.$('#fbMsg'); if (m) m.textContent = err; f.elements.c.value = ''; };
A.fbShow = () => { if (B) { B.hide = 0; save(); draw(); } };
function finish(early) {
  const it = cur(); if (it && it.t0) stop(it);
  const done = B.items.filter(x => x.st === 'done'), mins = Math.round(U.sum(B.items, x => x.used) / 6e4);
  const rec = OS.add('focusblocks', { date: U.today(), theme: B.th, planned: B.items.length, done: done.length, minutes: mins, leaves: B.leaves, early: !!early, note: done.map(x => x.title).join(' · ').slice(0, 300) }, { silent: true });
  // tempo em pendências de estudo conta como sessão de estudo da disciplina
  const bySub = {}; B.items.forEach(x => { if (x.subject && x.used >= 5 * 6e4) bySub[x.subject] = (bySub[x.subject] || 0) + Math.round(x.used / 6e4); });
  Object.keys(bySub).forEach(s => OS.add('sessions', { date: U.today(), subject: s, minutes: bySub[s], type: 'Estudo profundo', phone: true, focus: 4, learned: 'Bloco de foco', fblock: rec.id }, { silent: true }));
  B.phase = 'end'; B.early = !!early; B.mins = mins; save(); draw(); try { wl && wl.release(); } catch (e) { } wl = null;
  const c = cfg(); if (c.sc) setTimeout(() => runSc(c.scOff), 600);
}
A.fbClose = () => { B = null; save(); draw(); OS.request(); };

/* ---------- ecrã fechado ---------- */
const mmss = ms => { const s = Math.max(0, Math.round(Math.abs(ms) / 1000)); return U.pad(Math.floor(s / 60)) + ':' + U.pad(s % 60); };
let el = null;
function draw() {
  if (!el) { el = document.createElement('div'); el.id = 'fblk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Bloco de foco'); document.body.appendChild(el); }
  if (!B) { el.hidden = true; el.innerHTML = ''; document.documentElement.classList.remove('fb-on'); return; }
  el.hidden = false; document.documentElement.classList.add('fb-on');
  const it = cur(), n = B.items.length, dn = B.items.filter(x => x.st === 'done').length, up = B.items.filter((x, j) => !x.st && j !== B.i);
  if (B.phase === 'end') { el.innerHTML = `<div class="fb-in fb-end"><div class="fb-big">${UI.ic(B.early ? 'lock' : 'flag')}</div><h2>${B.early ? 'Saíste do bloco' : 'Bloco terminado'}</h2><p class="fb-sub">${dn} de ${n} pendências resolvidas · ${B.mins} min de foco · ${B.leaves} saída(s) da app</p>
    <div class="fb-sum">${B.items.map(x => `<div class="${x.st || 'todo'}"><span>${x.st === 'done' ? '✓' : x.st === 'skip' ? '↷' : '·'}</span>${esc(x.title)}<small>${Math.round(x.used / 6e4)} min</small></div>`).join('')}</div>
    <button class="btn pri lg" data-act="fbClose">Fechar</button></div>`; return; }
  const extra = it.extra ? ` · +${it.extra} min` : '';
  el.innerHTML = `<div class="fb-in">
    <div class="fb-top"><span>BLOCO DE FOCO · ${esc(B.th)}</span><span>${dn + 1 > n ? n : B.i + 1}/${n}${B.leaves ? ` · <b class="neg">${B.leaves} saída(s)</b>` : ''}</span></div>
    <div class="fb-dots">${B.items.map((x, j) => `<i class="${x.st || (j === B.i ? 'cur' : '')}"></i>`).join('')}</div>
    <div class="eyebrow">${esc([it.kind, it.area].filter(Boolean).join(' · ') || 'Pendência')}</div>
    <h2 class="fb-title">${esc(it.title)}</h2>${it.why ? `<p class="fb-sub">${esc(it.why)}</p>` : ''}
    <div class="fb-time ${B.phase !== 'run' ? 'over' : ''}" data-fbt>--:--</div><div class="fb-bar"><i data-fbb></i></div><small class="fb-sub">${it.mins} min${extra}</small>
    ${B.phase === 'run' ? `<div class="fb-btns"><button class="btn pri lg" data-act="fbDone">${UI.ic('check')}Terminei</button><button class="btn ghost" data-act="fbSkip">Saltar</button></div>`
    : B.phase === 'ask' ? `<div class="fb-ask"><b>Acabou o tempo. Terminaste?</b><div class="fb-btns"><button class="btn pri lg" data-act="fbDone">Sim, terminei</button><button class="btn lg" data-act="fbNo">Ainda não</button></div></div>`
    : B.phase === 'more' ? `<div class="fb-ask"><b>Quanto tempo mais precisas?</b><div class="fb-btns">${[5, 10, 15, 30].map(m => `<button class="btn lg" data-act="fbMore" data-m="${m}">+${m} min</button>`).join('')}</div><button class="btn ghost sm" data-act="fbSkip">Deixar para outro bloco</button></div>`
    : `<div class="fb-ask"><b>Sair do bloco antes do fim?</b><p class="fb-sub">Confirma que és tu.</p>${OS.Lock.bioId() ? `<button class="btn pri lg" data-act="fbBio">Face ID</button><div class="fb-or">ou código</div>` : ''}<form data-form="fbCode" class="fb-code" autocomplete="off"><input id="fbCode" name="c" class="field" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Código de acesso" aria-label="Código de acesso"><button class="btn">Sair</button></form><div class="fb-msg neg" id="fbMsg" role="status"></div><button class="btn ghost" data-act="fbStay">Continuar focado</button></div>`}
    ${up.length ? `<div class="fb-next"><small>A seguir</small>${up.slice(0, 3).map(x => `<div>${esc(x.title)}<span>${x.mins} min</span></div>`).join('')}${up.length > 3 ? `<small>+${up.length - 3}</small>` : ''}</div>` : ''}
    ${B.apps.length ? `<div class="fb-apps-on">Apps bloqueadas: ${B.apps.map(esc).join(' · ')}</div>` : ''}
    ${B.phase !== 'exit' ? `<button class="fb-exit" data-act="fbExit">${UI.ic('lock')}Sair do bloco</button>` : ''}</div>`;
  tick();
}
function tick() {
  if (!B || B.phase === 'end' || !el || el.hidden) return; const it = cur(); if (!it) return;
  const ms = B.end - Date.now(), tot = (it.mins + it.extra) * 6e4;
  if (ms <= 0 && B.phase === 'run') { B.phase = 'ask'; save(); alarm(it); draw(); return; }
  const t = el.querySelector('[data-fbt]'); if (t) t.textContent = (ms < 0 ? '+' : '') + mmss(ms);
  const b = el.querySelector('[data-fbb]'); if (b) b.style.width = Math.min(100, Math.max(0, (1 - ms / tot) * 100)) + '%';
  document.title = (ms < 0 ? '+' : '') + mmss(ms) + ' · Bloco de foco';
}
function alarm(it) { try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, .25, .5, .9, 1.15, 1.4].forEach(t => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.18, a.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + t + .2); o.start(a.currentTime + t); o.stop(a.currentTime + t + .21); }); } catch (e) { }
  try { navigator.vibrate && navigator.vibrate([300, 120, 300]); } catch (e) { }
  try { if (document.hidden && window.Notification && Notification.permission === 'granted') new Notification('Bloco de foco', { body: 'Acabou o tempo de: ' + it.title + '. Terminaste?' }); } catch (e) { } }
setInterval(tick, 1000);
// sair da app conta como fuga (exceto quando foi o Náutilo a abrir o Atalho)
document.addEventListener('visibilitychange', () => { if (!B || B.phase === 'end') return;
  if (document.hidden) { B.out = Date.now(); save(); return; }
  if (B.out) { const s = (Date.now() - B.out) / 1000, sc = B.grace && Date.now() - B.grace < 120000; if (s > 8 && !sc) { B.leaves++; B.away += Math.round(s); UI.toast(`Saíste ${s >= 60 ? Math.round(s / 60) + ' min' : Math.round(s) + ' s'} do bloco. Volta à pendência.`, 'warn'); } B.out = 0; if (sc) B.grace = 0; save(); }
  wake(); draw(); });
// enquanto o bloco corre, a navegação fica atrás do ecrã fechado e o teclado não abre outros ecrãs
document.addEventListener('keydown', e => { if (B && B.phase !== 'end' && e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
OS.on('ready', () => { draw(); if (B && B.phase !== 'end') wake(); });

/* ---------- entradas ---------- */
OS.on('ready', () => { const h = V.hoje; if (h && !h._fb) { V.hoje = s => h(s).replace(/(<a class="btn ghost sm" href="#next">[\s\S]*?<\/a>)/, `<div class="row gap6" style="flex-wrap:wrap;justify-content:flex-end"><a class="btn sm pri fb-hb" href="#foco">${UI.ic('lock')}Bloco de foco</a>$1</div>`); V.hoje._fb = 1; } });
// Definições → Atalhos do iPhone: que apps bloquear e como (modo Foco + Atalhos)
const fbSettings = () => { const c = cfg(); return `<div class="pn" id="fbSet"><div class="pn-h"><h3>Bloquear apps no iPhone (Bloco de foco)</h3><span class="bdg ${c.sc ? 'pos' : ''}">${c.sc ? 'ligado' : 'desligado'}</span></div>
  <p class="mut" style="margin:0 0 8px">Apps a bloquear durante um bloco de foco:</p><div class="fb-apps">${APPS.map(a => `<button type="button" class="chip ${c.apps.includes(a) ? 'on' : ''}" data-act="fbApp" data-a="${esc(a)}">${esc(a)}</button>`).join('')}</div><div class="fb-guide">${P.apps()}</div></div>`; };
OS.FocusBlock = { settings: fbSettings, preset: th => { DR = { th, sel: {}, mins: {}, extra: [] }; OS.request(); }, cands, state: () => B, finish: e => B && finish(e), _set: v => { B = v; save(); draw(); } };
})();
