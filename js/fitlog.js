/* PRUMO — Treino ao estilo Hevy: biblioteca com imagens animadas, rotinas, treino em curso
   (séries com "anterior", tipos de série, temporizador de descanso), resumo com recordes e ficha de cada exercício. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, L = OS.L, Fit = OS.Fit, S = OS.S;
const F = (k, l, t = 'text', x = {}) => Object.assign({ k, l, t }, x);
UI.IP.camera = 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';
UI.IP.timer = 'M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z';
UI.IP.list = 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01';

/* ================= biblioteca ================= */
const LIB = OS.ExLib || { EX: [], ST: [], CUES: [], IMG: '' };
const Ex = OS.Ex = {};
const BY = {}, BYNAME = {};
LIB.EX.forEach(e => { const o = { id: e[0], name: e[1], muscle: e[2], sec: e[3], equip: e[4], pop: e[5], level: e[6], kind: e[7], cue: e[8] >= 0 ? LIB.CUES[e[8]] : '' }; BY[o.id] = o; BYNAME[o.name.toLowerCase()] = o; });
Ex.LIST = Object.values(BY);
Ex.lib = id => BY[id];
Ex.KINDS = { kg: 'Peso e repetições', bw: 'Peso corporal (repetições)', time: 'Tempo', dist: 'Distância e tempo' };
Ex.EQUIP = ['Barra', 'Halteres', 'Máquina', 'Cabo', 'Peso corporal', 'Kettlebell', 'Barra W', 'Elástico', 'Bola medicinal', 'Bola suíça', 'Outro'];
// os exercícios que já existiam (nomes antigos) ficam ligados às imagens da biblioteca
const SEED = { 'crucifixo no cabo': 'Cross-over no cabo', 'paralelas (dips)': 'Paralelas (tríceps)', 'tríceps na polia': 'Tríceps na polia (barra)', 'tríceps francês': 'Tríceps francês com halter', 'puxada frontal': 'Puxada frontal (pegada aberta)', 'elevações (pull-ups)': 'Elevações (pull-up)', 'remada unilateral': 'Remada unilateral com halter', 'encolhimentos': 'Encolhimento com halteres', 'leg press': 'Leg press 45°', 'extensão de pernas': 'Cadeira extensora', 'afundos (lunges)': 'Afundo com halteres', 'flexão de pernas': 'Mesa flexora (deitado)', 'gémeos em pé': 'Gémeos em pé (máquina)', 'desenvolvimento militar': 'Desenvolvimento militar em pé', 'elevações laterais': 'Elevação lateral com halteres', 'abdominal na roda': 'Roda abdominal', 'russian twist': 'Rotação russa (russian twist)', 'farmer walk': 'Farmer walk (caminhada do agricultor)' };
Ex.libFor = name => { const n = String(name || '').trim().toLowerCase(); return BYNAME[n] || (SEED[n] && BYNAME[SEED[n].toLowerCase()]) || null; };
Ex.img = (libId, f = 0) => LIB.IMG + libId + '/' + f + '.jpg';
Ex.info = recId => { const r = OS.get('exercises', recId); if (!r) return null; const l = r.lib && BY[r.lib]; return { id: r.id, rec: r, name: r.name, muscle: r.muscle || (l && l.muscle) || '', sec: r.secondary || (l && l.sec) || [], equip: r.equip || (l && l.equip) || '', lib: l ? l.id : '', kind: r.kind || (l && l.kind) || 'kg', cue: (l && l.cue) || '', notes: r.notes || '' }; };
Ex.infoLib = libId => { const l = BY[libId]; if (!l) return null; const r = OS.all('exercises').find(x => x.lib === libId); return r ? Ex.info(r.id) : { id: '', name: l.name, muscle: l.muscle, sec: l.sec, equip: l.equip, lib: l.id, kind: l.kind, cue: l.cue }; };
// devolve o id do registo do exercício (cria-o a partir da biblioteca se for a primeira vez)
Ex.ensure = libId => { const ex = OS.all('exercises').find(x => x.lib === libId); if (ex) return ex.id; const l = BY[libId]; if (!l) return '';
  const byName = OS.all('exercises').find(x => x.name.trim().toLowerCase() === l.name.toLowerCase()); if (byName) { OS.upd('exercises', byName.id, { lib: libId }, { silent: true }); return byName.id; }
  return OS.add('exercises', { name: l.name, muscle: l.muscle, secondary: l.sec, equip: l.equip, lib: libId, kind: l.kind }, { silent: true }).id; };
// miniatura "em vídeo": as duas fotos do movimento alternam
Ex.video = info => 'https://www.youtube.com/results?search_query=' + encodeURIComponent((info.name || '') + ' execução correta como fazer');
// vídeo da execução correta, a tocar dentro da app (YouTube sem cookies)
Ex.vids = libId => { const v = ((OS.ExLib || {}).VID || {})[libId]; return !v ? [] : Array.isArray(v[0]) ? v : [v]; };
Ex.vid = libId => Ex.vids(libId)[0] || null;
Ex.player = (libId, name, i = 0) => { const all = Ex.vids(libId), v = all[i] || all[0]; if (!v) return `<div class="wk-novid">${UI.ic('play')}<p>Ainda não há vídeo escolhido para este exercício.</p><a class="btn ghost sm" href="${Ex.video({ name })}" target="_blank" rel="noopener">Procurar no YouTube</a></div>`;
  return `<div class="wk-player"><iframe src="https://www.youtube-nocookie.com/embed/${v[0]}?autoplay=1&playsinline=1&rel=0&modestbranding=1&cc_load_policy=0" title="${esc(v[1] || name)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><small class="wk-vt">${esc(v[1] || '')}${v[4] ? ' · ' + esc(v[4]) : ''}</small>${all.length > 1 ? `<div class="wk-vsel">${all.map((x, k) => `<button class="chip ${k === (all[i] ? i : 0) ? 'on' : ''}" data-xv="${libId}" data-k="${k}">Vídeo ${k + 1}</button>`).join('')}</div>` : ''}`; };
Ex.media = (info, mode) => { const lib = info.lib; if (mode === 'vid' && lib) return Ex.player(lib, info.name); if (mode === 'img' && lib) return Ex.thumb(info, 'lg'); return OS.Anim3D ? OS.Anim3D.html(info, 'lg') : Ex.thumb(info, 'lg'); };
Ex.modes = (info, mode) => `<div class="wk-modes" role="tablist"><button class="${mode === '3d' ? 'on' : ''}" data-xmode="3d">${UI.ic('users')}<span>Animação 3D</span></button>${info.lib && Ex.vid(info.lib) ? `<button class="${mode === 'vid' ? 'on' : ''}" data-xmode="vid">${UI.ic('play')}<span>Vídeo</span></button>` : ''}${info.lib ? `<button class="${mode === 'img' ? 'on' : ''}" data-xmode="img">${UI.ic('eye')}<span>Fotos</span></button>` : ''}</div>`;
Ex.thumb = (info, cls = '') => info && info.lib ? `<span class="exi ${cls}" aria-hidden="true"><img src="${Ex.img(info.lib, 0)}" alt="" loading="lazy" decoding="async"><img class="f2" src="${Ex.img(info.lib, 1)}" alt="" loading="lazy" decoding="async"></span>`
  : `<span class="exi ${cls} noimg" aria-hidden="true">${UI.ic('dumbbell')}</span>`;
S.exercises.fields = [F('name', 'Exercício', 'text', { req: 1, wide: 1 }), F('muscle', 'Músculo principal', 'sel', { o: L.MUSCLES, req: 1 }), F('secondary', 'Secundários', 'multi', { o: L.MUSCLES }),
  F('equip', 'Equipamento', 'sel', { o: Ex.EQUIP }), F('kind', 'Tipo de registo', 'sel', { o: Object.entries(Ex.KINDS) }), F('notes', 'Notas', 'area', { rows: 2 })];
S.exercises.defaults = () => ({ kind: 'kg', equip: 'Halteres' });
OS.on('ready', () => { OS.all('exercises').forEach(r => { if (r.lib) return; const l = Ex.libFor(r.name); if (l && !OS.all('exercises').some(x => x.lib === l.id)) OS.upd('exercises', r.id, { lib: l.id }, { silent: true }); }); });

/* ================= histórico e recordes ================= */
const n = v => U.num(v) || 0;
const workSets = it => (Array.isArray(it.sets) ? it.sets : []).filter(s => s.t !== 'W' && (n(s.reps) || n(s.sec) || n(s.km)));
Fit.prev = (exId, before) => { const W = U.sortBy(OS.all('workouts').filter(w => !before || w.date <= before), w => w.date + (w.start || ''), -1); for (const w of W) { const it = (Array.isArray(w.items) ? w.items : []).find(i => i.ex === exId && (Array.isArray(i.sets) ? i.sets : []).length); if (it) return it.sets; } return []; };
Fit.best = exId => { let kg = 0, e1 = 0, vol = 0, reps = 0; OS.all('workouts').forEach(w => (Array.isArray(w.items) ? w.items : []).forEach(it => { if (it.ex !== exId) return; workSets(it).forEach(s => { kg = Math.max(kg, n(s.kg)); e1 = Math.max(e1, Fit.e1rm(n(s.kg), n(s.reps))); vol = Math.max(vol, n(s.kg) * n(s.reps)); reps = Math.max(reps, n(s.reps)); }); })); return { kg, e1: U.r1(e1), vol, reps }; };
const setTxt = (s, kind) => kind === 'time' ? U.mmss(n(s.sec)) : kind === 'dist' ? `${U.nf(n(s.km), 2)} km${n(s.sec) ? ' · ' + U.mmss(n(s.sec)) : ''}` : kind === 'bw' ? `${n(s.kg) ? '+' + U.nf(n(s.kg), 1) + ' kg × ' : ''}${n(s.reps)} reps` : `${U.nf(n(s.kg), n(s.kg) % 1 ? 1 : 0)} kg × ${n(s.reps)}`;
Fit.setTxt = setTxt;

/* ================= rotinas ================= */
S.routines = { label: 'Rotina', title: r => r.name, fields: [F('name', 'Nome', 'text', { req: 1, wide: 1 }), F('notes', 'Notas', 'area', { rows: 2 })] };

/* ================= treino em curso / editor de rotina ================= */
const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
let W = LS.get('os2live', null); // { mode:'live'|'routine', start, title, items:[{ex, note, rest, sets:[{t,kg,reps,sec,km,done}]}], restEnd, restTot, rid }
let shown = false, tick = 0;
const save = () => { if (W && W.mode === 'live') LS.set('os2live', W); };
const host = () => { let h = document.getElementById('wkLive'); if (!h) { h = document.createElement('div'); h.id = 'wkLive'; h.hidden = true; document.body.appendChild(h); h.addEventListener('click', onClick); h.addEventListener('input', onInput); h.addEventListener('change', onInput); } return h; };
const pill = () => { let p = document.getElementById('wkPill'); if (!p) { p = document.createElement('button'); p.id = 'wkPill'; p.className = 'wk-pill'; p.onclick = () => open(); document.body.appendChild(p); } return p; };
const elapsed = () => W && W.start ? Math.floor((Date.now() - W.start) / 1000) : 0;
const totals = () => { let vol = 0, sets = 0; (Array.isArray(W.items) ? W.items : []).forEach(it => (Array.isArray(it.sets) ? it.sets : []).forEach(s => { if (W.mode === 'live' && !s.done) return; sets++; vol += n(s.kg) * n(s.reps); })); return { vol, sets }; };
const TYPES = { N: '', W: 'A', F: 'F', D: 'D' }, TYPEL = { N: 'Normal', W: 'Aquecimento', F: 'Até à falha', D: 'Drop set' };
const newSet = (prev = {}) => ({ t: prev.t === 'W' ? 'N' : (prev.t || 'N'), kg: prev.kg ?? '', reps: prev.reps ?? '', sec: prev.sec ?? '', km: prev.km ?? '', done: false });

Ex.start = (opt = {}) => {
  if (W && W.mode === 'live' && !opt.force) { open(); UI.toast('Já tens um treino em curso', 'warn'); return; }
  const r = opt.rid && OS.get('routines', opt.rid);
  W = { mode: 'live', start: Date.now(), title: r ? r.name : (opt.title || (s => s && !['Corrida', 'Descanso', 'Mobilidade'].includes(s) ? s : 'Treino')(OS.one('fit').split[new Date().getDay()])), rid: r ? r.id : '', restEnd: 0, restTot: 0,
    items: r ? (Array.isArray(r.items) ? r.items : []).filter(it => OS.get('exercises', it.ex)).map(it => ({ ex: it.ex, note: it.note || '', rest: it.rest || 90, sets: (it.sets && it.sets.length ? it.sets : [{}]).map(s => newSet(s)) })) : [] };
  // pré-preenche com o que fizeste da última vez
  W.items.forEach(it => { const pv = Fit.prev(it.ex).filter(s => s.t !== 'W'); it.sets.forEach((s, i) => { const p = pv[i] || pv[pv.length - 1]; if (p && s.kg === '' && s.reps === '') { s.kg = p.kg ?? ''; s.reps = p.reps ?? ''; s.sec = p.sec ?? ''; s.km = p.km ?? ''; } }); });
  save(); open(); if (!W.items.length) setTimeout(() => picker(), 250);
};
Ex.editRoutine = rid => { const r = rid && OS.get('routines', rid); W = { mode: 'routine', rid: r ? r.id : '', title: r ? r.name : '', items: r ? U.clone(Array.isArray(r.items) ? r.items : []).filter(it => OS.get('exercises', it.ex)).map(it => Object.assign({ rest: 90, note: '' }, it, { sets: (it.sets && it.sets.length ? it.sets : [{}]).map(s => newSet(s)) })) : [] }; open(); };
Ex.live = () => W && W.mode === 'live' ? W : null;
const open = () => { if (!W) return; shown = true; draw(); host().hidden = false; document.body.classList.add('noscroll'); pill().hidden = true; clearInterval(tick); tick = setInterval(onTick, 1000); };
const close = () => { shown = false; host().hidden = true; document.body.classList.remove('noscroll'); updPill(); };
const updPill = () => { const p = pill(); if (W && W.mode === 'live' && !shown) { p.hidden = false; p.innerHTML = `${UI.ic('dumbbell')}<span>${esc(W.title || 'Treino')}</span><b class="mono" data-wk-el>${U.mmss(elapsed())}</b>`; } else p.hidden = true; if (!(W && W.mode === 'live')) clearInterval(tick); };
const onTick = () => { if (!W) return; const h = host(); const el = h.querySelector('[data-wk-el]'); if (el) el.textContent = U.mmss(elapsed()); const pe = document.querySelector('#wkPill [data-wk-el]'); if (pe) pe.textContent = U.mmss(elapsed());
  if (W.restEnd) { const left = Math.ceil((W.restEnd - Date.now()) / 1000); const bar = h.querySelector('.wk-rest');
    if (left <= 0) { W.restEnd = 0; save(); restDone(); if (bar) bar.remove(); }
    else if (bar) { bar.querySelector('b').textContent = U.mmss(left); bar.querySelector('i').style.width = (100 - left / W.restTot * 100) + '%'; } else if (shown) draw(); } };
let actx = null;
const restDone = () => { try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { }
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); [0, .25].forEach(t => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.value = .15; o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + .15); }); } catch (e) { }
  UI.toast('Descanso terminado. Próxima série!', 'pos'); };

const kindOf = it => { const i = Ex.info(it.ex); return i ? i.kind : 'kg'; };
const cols = kind => kind === 'time' ? ['Tempo'] : kind === 'dist' ? ['km', 'Tempo'] : kind === 'bw' ? ['+kg', 'Reps'] : ['kg', 'Reps'];
const inputs = (s, kind, ii, si) => { const inp = (f, ph, mode = 'decimal') => `<input class="wk-in" data-f="${f}" data-i="${ii}" data-s="${si}" inputmode="${mode}" type="text" value="${esc(f === 'sec' && s.sec !== '' && s.sec != null ? U.mmss(s.sec) : s[f] ?? '')}" placeholder="${ph}" aria-label="${f}">`;
  return kind === 'time' ? inp('sec', '0:45', 'numeric') : kind === 'dist' ? inp('km', 'km') + inp('sec', '25:00', 'numeric') : inp('kg', kind === 'bw' ? '0' : 'kg') + inp('reps', 'reps', 'numeric'); };
const draw = () => {
  const h = host(), live = W.mode === 'live', t = live ? totals() : null, sc = h.querySelector('.wk-body') ? h.querySelector('.wk-body').scrollTop : 0;
  const body = W.items.map((it, ii) => { const info = Ex.info(it.ex); if (!info) return ''; const kind = info.kind, pv = live ? Fit.prev(it.ex).filter(s => s.t !== 'W') : [], c = cols(kind);
    let nN = 0;
    return `<section class="wk-ex" data-ii="${ii}"><div class="wk-exh"><button class="wk-th-b" data-w="info" data-i="${ii}" aria-label="Ver execução">${Ex.thumb(info, 'sm')}<i>${UI.ic('play')}</i></button><button class="wk-exn" data-w="info" data-i="${ii}"><b>${esc(info.name)}</b><small>${esc(info.muscle)}${info.equip ? ' · ' + esc(info.equip) : ''}</small></button><button class="wk-vb" data-w="vid" data-i="${ii}" aria-label="Vídeo da execução">${UI.ic('play')}<span>Vídeo</span></button><button class="icon-btn" data-w="menu" data-i="${ii}" aria-label="Opções">${UI.ic('dots')}</button></div>
      ${it.menu ? `<div class="wk-menu"><button data-w="up" data-i="${ii}">${UI.ic('up')}Subir</button><button data-w="down" data-i="${ii}">${UI.ic('down')}Descer</button><button data-w="replace" data-i="${ii}">${UI.ic('swap')}Substituir</button><button data-w="del" data-i="${ii}" class="neg">${UI.ic('trash')}Remover</button></div>` : ''}
      <input class="wk-note" data-f="note" data-i="${ii}" value="${esc(it.note || '')}" placeholder="Notas (ex.: banco no 4, pegada…)">
      <div class="wk-rst">${UI.ic('timer')}<span>Descanso</span><select data-f="rest" data-i="${ii}" aria-label="Descanso">${[0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map(v => `<option value="${v}"${+it.rest === v ? ' selected' : ''}>${v ? U.mmss(v) : 'desligado'}</option>`).join('')}</select></div>
      <div class="wk-t ${live ? '' : 'nolive'} k${c.length}"><div class="wk-th"><span>Série</span>${live ? '<span>Anterior</span>' : ''}${c.map(x => `<span>${x}</span>`).join('')}${live ? `<span>${UI.ic('check')}</span>` : '<span></span>'}</div>
      ${it.sets.map((s, si) => { const lab = s.t === 'N' || !s.t ? ++nN : TYPES[s.t]; const p = pv[si]; return `<div class="wk-tr ${s.done ? 'done' : ''}"><button class="wk-sn t${s.t || 'N'}" data-w="type" data-i="${ii}" data-s="${si}" title="${TYPEL[s.t || 'N']}">${lab}</button>${live ? `<button class="wk-pv" data-w="prev" data-i="${ii}" data-s="${si}">${p ? setTxt(p, kind) : '—'}</button>` : ''}${inputs(s, kind, ii, si)}${live ? `<button class="wk-ck" data-w="done" data-i="${ii}" data-s="${si}" aria-label="Série feita">${UI.ic('check')}</button>` : `<button class="wk-ck x" data-w="sdel" data-i="${ii}" data-s="${si}" aria-label="Remover série">${UI.ic('x')}</button>`}</div>`; }).join('')}</div>
      <button class="btn ghost sm wk-add" data-w="sadd" data-i="${ii}">${UI.ic('plus')}Adicionar série</button></section>`; }).join('');
  const rest = live && W.restEnd ? Math.max(0, Math.ceil((W.restEnd - Date.now()) / 1000)) : 0;
  h.innerHTML = `<div class="wk-sheet" role="dialog" aria-modal="true" aria-label="${live ? 'Treino em curso' : 'Editar rotina'}">
    <header class="wk-top"><button class="icon-btn" data-w="min" aria-label="${live ? 'Minimizar' : 'Fechar'}">${UI.ic(live ? 'down' : 'x')}</button>
      ${live ? `<div class="wk-stats"><div><small>Duração</small><b class="mono" data-wk-el>${U.mmss(elapsed())}</b></div><div><small>Volume</small><b class="mono">${U.nf(t.vol)} kg</b></div><div><small>Séries</small><b class="mono">${t.sets}</b></div></div><button class="btn pri sm" data-w="finish">Terminar</button>`
        : `<b class="wk-ttl">${W.rid ? 'Editar rotina' : 'Nova rotina'}</b><button class="btn pri sm" data-w="rsave">Guardar</button>`}</header>
    <div class="wk-body"><input class="wk-title" data-f="title" value="${esc(W.title || '')}" placeholder="${live ? 'Nome do treino' : 'Nome da rotina (ex.: Push A)'}" aria-label="Nome">
      ${body || `<div class="wk-empty">${UI.ic('dumbbell')}<p>${live ? 'Começa por adicionar um exercício.' : 'Adiciona os exercícios desta rotina.'}</p></div>`}
      <button class="btn pri wk-addex" data-w="pick">${UI.ic('plus')}Adicionar exercício</button>
      ${live ? `<button class="btn ghost danger wk-discard" data-w="discard">Descartar treino</button>` : W.rid ? `<button class="btn ghost danger wk-discard" data-w="rdel">Apagar rotina</button>` : ''}</div>
    ${rest ? `<div class="wk-rest"><i style="width:${100 - rest / (W.restTot || 1) * 100}%"></i><span>${UI.ic('timer')}Descanso</span><button data-w="rest" data-v="-15">−15</button><b class="mono">${U.mmss(rest)}</b><button data-w="rest" data-v="15">+15</button><button data-w="rest" data-v="0" class="skip">Saltar</button></div>` : ''}</div>`;
  const b = h.querySelector('.wk-body'); if (b) b.scrollTop = sc;
};
function onInput(e) { const el = e.target, f = el.dataset.f; if (!f || !W) return;
  if (f === 'title') { W.title = el.value; save(); return; }
  const it = W.items[+el.dataset.i]; if (!it) return;
  if (f === 'note') it.note = el.value; else if (f === 'rest') it.rest = +el.value;
  else { const s = it.sets[+el.dataset.s], v = el.value.trim(); if (s) s[f] = v === '' ? '' : f === 'sec' ? (/^\d+$/.test(v) ? +v : U.parseDur(v)) : U.num(v); }
  save(); }
function onClick(e) { const b = e.target.closest('[data-w]'); if (!b || !W) return; e.preventDefault(); const w = b.dataset.w, ii = +b.dataset.i, si = +b.dataset.s, it = W.items[ii];
  switch (w) {
    case 'min': if (W.mode === 'routine') { W = LS.get('os2live', null); close(); return; } close(); return;
    case 'pick': picker(); return;
    case 'info': if (it) Ex.sheet({ rec: it.ex }); return;
    case 'vid': if (it) Ex.sheet({ rec: it.ex, video: true }); return;
    case 'menu': W.items.forEach((x, k) => { if (k !== ii) x.menu = false; }); it.menu = !it.menu; break;
    case 'up': if (ii > 0) { [W.items[ii - 1], W.items[ii]] = [W.items[ii], W.items[ii - 1]]; } it.menu = false; break;
    case 'down': if (ii < W.items.length - 1) { [W.items[ii + 1], W.items[ii]] = [W.items[ii], W.items[ii + 1]]; } it.menu = false; break;
    case 'del': W.items.splice(ii, 1); break;
    case 'replace': it.menu = false; picker(ii); return;
    case 'sadd': it.sets.push(newSet(it.sets[it.sets.length - 1])); break;
    case 'sdel': if (it.sets.length > 1) it.sets.splice(si, 1); break;
    case 'type': { const o = ['N', 'W', 'F', 'D'], s = it.sets[si]; s.t = o[(o.indexOf(s.t || 'N') + 1) % 4]; UI.toast(TYPEL[s.t]); break; }
    case 'prev': { const p = Fit.prev(it.ex).filter(s => s.t !== 'W')[si]; if (p) Object.assign(it.sets[si], { kg: p.kg ?? '', reps: p.reps ?? '', sec: p.sec ?? '', km: p.km ?? '' }); break; }
    case 'done': { const s = it.sets[si]; const row = b.closest('.wk-tr'); row && row.querySelectorAll('.wk-in').forEach(i => { const f = i.dataset.f; s[f] = f === 'sec' ? (/^\d+$/.test(i.value) ? +i.value : U.parseDur(i.value)) : i.value === '' ? '' : U.num(i.value.replace(',', '.')); });
      const kind = kindOf(it); if (!s.done && kind === 'kg' && !n(s.reps)) { UI.toast('Falta o número de repetições', 'warn'); return; }
      if (!s.done && kind === 'bw' && !n(s.reps)) { UI.toast('Falta o número de repetições', 'warn'); return; }
      s.done = !s.done; if (s.done && +it.rest) { W.restTot = +it.rest; W.restEnd = Date.now() + it.rest * 1000; } if (s.done) { try { navigator.vibrate && navigator.vibrate(15); } catch (er) { } } break; }
    case 'rest': { const v = +b.dataset.v; if (!v) W.restEnd = 0; else { W.restEnd = Math.max(Date.now() + 1000, W.restEnd + v * 1000); W.restTot = Math.max(W.restTot, Math.ceil((W.restEnd - Date.now()) / 1000)); } break; }
    case 'discard': UI.ask('Descartar este treino?', 'O que registaste neste treino em curso perde-se.', 'Descartar', () => { W = null; LS.set('os2live', null); close(); }); return;
    case 'finish': finish(); return;
    case 'rsave': saveRoutine(); return;
    case 'rdel': UI.ask('Apagar esta rotina?', 'Os treinos já feitos com ela ficam no histórico.', 'Apagar', () => { OS.del('routines', W.rid); W = LS.get('os2live', null); close(); OS.request(); }); return;
  }
  save(); draw(); }

const saveRoutine = () => { const name = (W.title || '').trim(); if (!name) { UI.toast('Dá um nome à rotina', 'warn'); host().querySelector('.wk-title').focus(); return; }
  if (!W.items.length) { UI.toast('Adiciona pelo menos um exercício', 'warn'); return; }
  const items = W.items.map(it => ({ ex: it.ex, note: it.note || '', rest: +it.rest || 0, sets: it.sets.map(s => ({ t: s.t || 'N', kg: s.kg, reps: s.reps, sec: s.sec, km: s.km })) }));
  if (W.rid && OS.get('routines', W.rid)) OS.upd('routines', W.rid, { name, items }); else OS.add('routines', { name, items });
  UI.toast('Rotina guardada', 'pos'); W = LS.get('os2live', null); close(); OS.request(); };

const finish = () => { const done = W.items.map(it => Object.assign({}, it, { sets: it.sets.filter(s => s.done) })).filter(it => it.sets.length);
  if (!done.length) { UI.ask('Nenhuma série marcada como feita', 'Marca as séries com ✓ à medida que as fazes. Queres descartar este treino?', 'Descartar', () => { W = null; LS.set('os2live', null); close(); }); return; }
  const prs = []; done.forEach(it => { const b = Fit.best(it.ex), info = Ex.info(it.ex); let topKg = 0, topE = 0; workSets(it).forEach(s => { topKg = Math.max(topKg, n(s.kg)); topE = Math.max(topE, Fit.e1rm(n(s.kg), n(s.reps))); });
    if (topKg > b.kg && b.kg > 0) prs.push(`${info.name}: ${U.nf(topKg, topKg % 1 ? 1 : 0)} kg (antes ${U.nf(b.kg, b.kg % 1 ? 1 : 0)})`); else if (topE > b.e1 && b.e1 > 0) prs.push(`${info.name}: 1RM estimado ${U.nf(topE, 1)} kg`); });
  const dur = Math.max(1, Math.round(elapsed() / 60)), st = new Date(W.start);
  const rec = OS.add('workouts', { date: U.iso(st), start: U.hm(st), title: (W.title || 'Treino').trim(), dur, routine: W.rid || '', items: done.map(it => ({ ex: it.ex, note: it.note || '', sets: it.sets.map(s => { const o = { t: s.t || 'N' }; ['kg', 'reps', 'sec', 'km'].forEach(k => { if (s[k] !== '' && s[k] != null) o[k] = n(s[k]); }); return o; }) })) });
  const vol = Fit.volume(rec), sets = Fit.sets(rec), ms = {}; done.forEach(it => { const i = Ex.info(it.ex); if (i) ms[i.muscle] = (ms[i.muscle] || 0) + it.sets.length; });
  W = null; LS.set('os2live', null); close(); OS.request();
  UI.modal(`<div class="wk-fin"><div class="wk-fin-ic">${UI.ic('crown')}</div><h3>Treino concluído!</h3><p class="mut">${esc(rec.title)} · ${U.longDate(rec.date)}</p>
    <div class="kpis">${UI.kpi('Duração', dur + ' min')}${UI.kpi('Volume', U.nf(vol) + ' kg')}${UI.kpi('Séries', sets)}${UI.kpi('Recordes', prs.length, '', { tone: prs.length ? 'pos' : '' })}</div>
    ${prs.length ? `<div class="wk-prs">${prs.map(p => `<div>${UI.ic('star')}<span>${esc(p)}</span></div>`).join('')}</div>` : ''}
    <div class="wk-fin-m">${Object.entries(ms).map(([m, k]) => `<span class="chip on">${esc(m)} · ${k}</span>`).join('')}</div>
    <div class="wk-fin-x">${OS.BodyX ? OS.BodyX.afterWorkout(rec) : ''}</div>
    <div class="row gap8 end"><button class="btn ghost" data-mclose>Fechar</button></div></div>`, 'wk-finm');
};

/* ================= escolher exercício ================= */
let pickSel = [], pickRep = null, pickQ = '', pickM = '', pickE = '';
const TOP = {}; ["Barbell_Bench_Press_-_Medium_Grip", "Barbell_Squat", "Barbell_Deadlift", "Romanian_Deadlift", "Standing_Military_Press", "Bent_Over_Barbell_Row", "Wide-Grip_Lat_Pulldown", "Pullups", "Seated_Cable_Rows", "Dumbbell_Bench_Press", "Incline_Dumbbell_Press", "Leg_Press", "Leg_Extensions", "Lying_Leg_Curls", "Seated_Leg_Curl", "Barbell_Hip_Thrust", "Dumbbell_Shoulder_Press", "Side_Lateral_Raise", "Barbell_Curl", "Dumbbell_Bicep_Curl", "Hammer_Curls", "Triceps_Pushdown", "Triceps_Pushdown_-_Rope_Attachment", "Cable_Crossover", "Butterfly", "Plank", "Crunches", "Standing_Calf_Raises", "Face_Pull", "One-Arm_Dumbbell_Row", "Split_Squat_with_Dumbbells", "Hack_Squat", "Machine_Bench_Press", "Incline_Dumbbell_Flyes", "Barbell_Incline_Bench_Press_-_Medium_Grip", "Dumbbell_Flyes", "Seated_Dumbbell_Press", "Standing_Low-Pulley_Deltoid_Raise", "EZ-Bar_Skullcrusher", "Thigh_Abductor", "Thigh_Adductor", "Seated_Calf_Raise", "Hanging_Leg_Raise", "Chin-Up", "Close-Grip_Barbell_Bench_Press", "Goblet_Squat", "Dumbbell_Lunges"].forEach((id, i) => TOP[id] = 100 - i);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const allEx = () => { const used = {}; OS.all('workouts').forEach(w => (Array.isArray(w.items) ? w.items : []).forEach(it => { used[it.ex] = (used[it.ex] || 0) + 1; }));
  const recByLib = {}; OS.all('exercises').forEach(r => { if (r.lib) recByLib[r.lib] = r; });
  const out = Ex.LIST.map(l => { const r = recByLib[l.id]; return { key: r ? r.id : 'lib:' + l.id, rec: r ? r.id : '', lib: l.id, name: l.name, muscle: l.muscle, equip: l.equip, pop: l.pop, used: r ? used[r.id] || 0 : 0 }; });
  OS.all('exercises').filter(r => !r.lib).forEach(r => out.push({ key: r.id, rec: r.id, lib: '', name: r.name, muscle: r.muscle, equip: r.equip || '', pop: 1, used: used[r.id] || 0, custom: 1 }));
  return out; };
const filtered = () => { const q = norm(pickQ).split(/\s+/).filter(Boolean); return allEx().filter(x => (!pickM || x.muscle === pickM) && (!pickE || x.equip === pickE) && q.every(w => norm(x.name + ' ' + x.muscle + ' ' + x.equip).includes(w))).sort((a, b) => (b.used - a.used) || ((TOP[b.lib] || 0) - (TOP[a.lib] || 0)) || (b.pop - a.pop) || a.name.localeCompare(b.name, 'pt')); };
const pickHost = () => { let h = document.getElementById('wkPick'); if (!h) { h = document.createElement('div'); h.id = 'wkPick'; h.hidden = true; document.body.appendChild(h);
  h.addEventListener('input', e => { if (e.target.dataset.pq != null) { pickQ = e.target.value; drawList(); } });
  h.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; e.preventDefault(); const p = b.dataset.p;
    if (p === 'close') { h.hidden = true; return; }
    if (p === 'm') { pickM = pickM === b.dataset.v ? '' : b.dataset.v; drawPick(); return; }
    if (p === 'e') { pickE = pickE === b.dataset.v ? '' : b.dataset.v; drawPick(); return; }
    if (p === 'info') { const k = b.dataset.k; Ex.sheet(k.startsWith('lib:') ? { lib: k.slice(4) } : { rec: k }); return; }
    if (p === 'new') { h.hidden = true; UI.openForm('exercises', null, {}, { onSave: r => { if (W) { addEx([r.id]); } } }); return; }
    if (p === 'sel') { const k = b.dataset.k; if (pickRep != null) { pickSel = [k]; commit(); return; } pickSel = pickSel.includes(k) ? pickSel.filter(x => x !== k) : pickSel.concat(k); drawList(); return; }
    if (p === 'ok') commit(); }); }
  return h; };
const picker = (replaceIdx = null) => { pickSel = []; pickRep = replaceIdx; pickQ = ''; const h = pickHost(); h.hidden = false; drawPick(); setTimeout(() => { const i = h.querySelector('[data-pq]'); i && matchMedia('(min-width:700px)').matches && i.focus(); }, 60); };
const drawPick = () => { const h = pickHost(); h.innerHTML = `<div class="wk-pick" role="dialog" aria-modal="true" aria-label="Escolher exercício"><header class="wk-top"><button class="icon-btn" data-p="close" aria-label="Fechar">${UI.ic('x')}</button><b class="wk-ttl">${pickRep != null ? 'Substituir exercício' : 'Adicionar exercício'}</b><button class="btn ghost sm" data-p="new">${UI.ic('plus')}Criar</button></header>
  <div class="wk-pf"><input type="search" class="field" data-pq placeholder="Procurar (ex.: supino, costas, cabo)" value="${esc(pickQ)}" aria-label="Procurar exercício"><div class="wk-chips">${L.MUSCLES.map(m => `<button class="chip ${pickM === m ? 'on' : ''}" data-p="m" data-v="${m}">${m}</button>`).join('')}</div><div class="wk-chips">${Ex.EQUIP.map(m => `<button class="chip ${pickE === m ? 'on' : ''}" data-p="e" data-v="${m}">${m}</button>`).join('')}</div></div>
  <div class="wk-plist"></div><div class="wk-pok"></div></div>`; drawList(); };
const drawList = () => { const h = pickHost(), all = filtered(), lim = all.slice(0, 120); h.querySelector('.wk-plist').innerHTML = (lim.map(x => `<div class="wk-pi ${pickSel.includes(x.key) ? 'on' : ''}"><button class="wk-pib" data-p="sel" data-k="${x.key}">${Ex.thumb({ lib: x.lib }, 'sm')}<span><b>${esc(x.name)}</b><small>${esc(x.muscle)}${x.equip ? ' · ' + esc(x.equip) : ''}${x.used ? ` · ${x.used}×` : ''}</small></span></button><button class="icon-btn" data-p="info" data-k="${x.key}" aria-label="Ver exercício">${UI.ic('info')}</button></div>`).join('') || `<p class="mut" style="padding:20px">Nenhum exercício encontrado. Toca em "Criar" para adicionar o teu.</p>`) + (all.length > lim.length ? `<p class="mut" style="padding:10px 16px;font-size:12px">${all.length - lim.length} exercícios a mais: escreve para filtrar.</p>` : '');
  h.querySelector('.wk-pok').innerHTML = pickSel.length ? `<button class="btn pri" data-p="ok">${UI.ic('plus')}Adicionar ${pickSel.length} exercício${pickSel.length > 1 ? 's' : ''}</button>` : ''; };
const recOf = k => k.startsWith('lib:') ? Ex.ensure(k.slice(4)) : k;
const addEx = ids => { ids.forEach(id => { const pv = W.mode === 'live' ? Fit.prev(id).filter(s => s.t !== 'W') : []; W.items.push({ ex: id, note: '', rest: Ex.info(id) && Ex.info(id).kind === 'dist' ? 0 : 90, sets: (pv.length ? pv : [{}, {}, {}]).map(s => newSet(s)) }); }); save(); if (shown) draw(); };
const commit = () => { const ids = pickSel.map(recOf).filter(Boolean); pickHost().hidden = true; if (!W) return;
  if (pickRep != null && ids[0] && W.items[pickRep]) { const it = W.items[pickRep]; it.ex = ids[0]; save(); draw(); return; }
  addEx(ids); };

/* ================= ficha do exercício ================= */
const sheetHost = () => { let h = document.getElementById('wkInfo'); if (!h) { h = document.createElement('div'); h.id = 'wkInfo'; h.hidden = true; document.body.appendChild(h); h.addEventListener('click', e => { const xm = e.target.closest('[data-xmode],[data-xv]'); if (xm) { e.preventDefault(); const md = h.querySelector('.wk-media'), info = h._info; if (!md || !info) return; if (xm.dataset.xv) { md.innerHTML = Ex.player(xm.dataset.xv, info.name, +xm.dataset.k); return; } md.innerHTML = Ex.media(info, xm.dataset.xmode); h.querySelectorAll('[data-xmode]').forEach(b => b.classList.toggle('on', b === xm)); return; } if (e.target.closest('[data-x]') || e.target === h.firstElementChild) { h.hidden = true; h.innerHTML = ''; } const a = e.target.closest('[data-xadd]'); if (a && W) { h.hidden = true; const k = a.dataset.xadd; h.innerHTML = ''; addEx([recOf(k)]); if (!shown) open(); } }); } return h; };
const spark = (vals, fmt) => { if (vals.length < 2) return ''; const w = 300, h = 90, mx = Math.max(...vals), mn = Math.min(...vals), r = mx - mn || 1, pts = vals.map((v, i) => [i / (vals.length - 1) * (w - 16) + 8, h - 12 - (v - mn) / r * (h - 28)]);
  return `<svg viewBox="0 0 ${w} ${h}" class="wk-spark" preserveAspectRatio="none"><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.2" vector-effect="non-scaling-stroke"/>${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--accent)"/>`).join('')}<text x="8" y="12" class="wk-sl">${fmt(mx)}</text><text x="8" y="${h - 1}" class="wk-sl">${fmt(mn)}</text></svg>`; };
Ex.sheet = ({ rec, lib, video }) => { const info = rec ? Ex.info(rec) : Ex.infoLib(lib); if (!info) return; const id = info.id, h = id ? Fit.exHistory(id) : [], b = id ? Fit.best(id) : null;
  const sess = []; if (id) U.sortBy(OS.all('workouts'), w => w.date, -1).forEach(w => (Array.isArray(w.items) ? w.items : []).forEach(it => { if (it.ex === id && sess.length < 6) sess.push({ w, it }); }));
  const key = id || 'lib:' + info.lib;
  sheetHost().innerHTML = `<div class="wk-ibg"></div><div class="wk-info" role="dialog" aria-modal="true" aria-label="${esc(info.name)}"><header class="wk-top"><button class="icon-btn" data-x aria-label="Fechar">${UI.ic('x')}</button><b class="wk-ttl">${esc(info.name)}</b>${W ? `<button class="btn pri sm" data-xadd="${key}">${UI.ic('plus')}Adicionar</button>` : '<span></span>'}</header>
    <div class="wk-ib">${Ex.modes(info, video ? 'vid' : '3d')}<div class="wk-media" data-lib="${info.lib || ''}">${Ex.media(info, video ? 'vid' : '3d')}</div>
    <div class="wk-tags"><span class="chip on">${esc(info.muscle)}</span>${(info.sec || []).map(m => `<span class="chip">${esc(m)}</span>`).join('')}${info.equip ? `<span class="chip">${esc(info.equip)}</span>` : ''}</div>
    ${info.cue ? `<div class="wk-cue"><b>Como fazer</b><p>${esc(info.cue)}</p></div>` : ''}${info.notes ? `<div class="wk-cue"><b>As tuas notas</b><p>${esc(info.notes)}</p></div>` : ''}
    ${b && (b.kg || b.reps) ? `<div class="kpis">${info.kind === 'kg' ? UI.kpi('Carga máxima', U.nf(b.kg, 1) + ' kg') + UI.kpi('1RM estimado', U.nf(b.e1, 1) + ' kg') + UI.kpi('Melhor série', U.nf(b.vol) + ' kg', 'kg × reps') : UI.kpi('Máx. repetições', b.reps)}${UI.kpi('Sessões', h.length)}</div>
      ${info.kind === 'kg' && h.length > 1 ? `<div class="wk-cue"><b>1RM estimado ao longo do tempo</b>${spark(h.map(x => x.e1rm), v => U.nf(v, 0) + ' kg')}</div>` : ''}
      <div class="wk-cue"><b>Últimas sessões</b>${sess.map(({ w, it }) => `<div class="wk-ss"><span class="mono">${U.fmtDS(w.date)}</span><span>${(Array.isArray(it.sets) ? it.sets : []).map(s => setTxt(s, info.kind)).join(' · ')}</span></div>`).join('')}</div>`
      : `<p class="mut" style="margin:14px 0">Ainda não fizeste este exercício. Quando o registares, aparecem aqui os teus recordes e a evolução.</p>`}
    ${id ? `<button class="btn ghost sm" data-x data-edit="exercises:${id}">${UI.ic('edit')}Editar exercício</button>` : ''}</div></div>`;
  sheetHost()._info = info; sheetHost().hidden = false; };

/* ================= vistas ================= */
const V = OS.views;
const wkCard = w => { const its = (Array.isArray(w.items) ? w.items : []).filter(it => OS.get('exercises', it.ex)); const prs = 0;
  return `<article class="wk-card" data-act="wkOpen" data-id="${w.id}" tabindex="0"><div class="wk-ch"><div><b>${esc(w.title || 'Treino')}</b><small>${U.longDate(w.date)}${w.start ? ' · ' + w.start : ''}</small></div></div>
  <div class="wk-cs"><span>${UI.ic('clock')}${w.dur ? w.dur + ' min' : '—'}</span><span>${UI.ic('dumbbell')}${U.nf(Fit.volume(w))} kg</span><span>${UI.ic('layers')}${Fit.sets(w)} séries</span></div>
  <div class="wk-cl">${its.slice(0, 6).map(it => { const i = Ex.info(it.ex), ws = workSets(it), best = ws.reduce((a, s) => !a || n(s.kg) * Math.max(1, n(s.reps)) > n(a.kg) * Math.max(1, n(a.reps)) ? s : a, null); return `<div>${Ex.thumb(i, 'xs')}<span>${(Array.isArray(it.sets) ? it.sets : []).length} × ${esc(i.name)}</span>${best ? `<small class="mono">${setTxt(best, i.kind)}</small>` : ''}</div>`; }).join('')}${its.length > 6 ? `<small class="mut">+${its.length - 6} exercícios</small>` : ''}</div></article>`; };
A.wkOpen = b => { const w = OS.get('workouts', b.dataset.id); if (!w) return;
  UI.modal(`<div class="wk-det"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h3>${esc(w.title || 'Treino')}</h3><p class="mut">${U.longDate(w.date)}${w.start ? ' · ' + w.start : ''}${w.dur ? ' · ' + w.dur + ' min' : ''} · ${U.nf(Fit.volume(w))} kg</p></div><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
  ${(Array.isArray(w.items) ? w.items : []).map(it => { const i = Ex.info(it.ex); if (!i) return ''; let k = 0; return `<div class="wk-dx">${Ex.thumb(i, 'sm')}<div><b>${esc(i.name)}</b>${it.note ? `<small class="mut">${esc(it.note)}</small>` : ''}${(Array.isArray(it.sets) ? it.sets : []).map(s => `<div class="wk-ds"><span class="wk-sn t${s.t || 'N'}">${!s.t || s.t === 'N' ? ++k : TYPES[s.t]}</span><span class="mono">${setTxt(s, i.kind)}</span></div>`).join('')}</div></div>`; }).join('')}
  ${w.notes ? `<p class="mut">${esc(w.notes)}</p>` : ''}<div class="row gap8 end" style="margin-top:12px"><button class="btn ghost" data-act="wkRepeat" data-id="${w.id}">${UI.ic('repeat')}Repetir</button><button class="btn ghost" data-act="wkToRoutine" data-id="${w.id}">${UI.ic('note')}Guardar como rotina</button><button class="btn" data-mclose data-edit="workouts:${w.id}">${UI.ic('edit')}Editar</button></div></div>`, 'wk-detm'); };
A.wkRepeat = b => { const w = OS.get('workouts', b.dataset.id); if (!w) return; UI.closeModal(); if (W && W.mode === 'live') { open(); UI.toast('Termina primeiro o treino em curso', 'warn'); return; }
  W = { mode: 'live', start: Date.now(), title: w.title || 'Treino', rid: w.routine || '', restEnd: 0, restTot: 0, items: (Array.isArray(w.items) ? w.items : []).filter(it => OS.get('exercises', it.ex)).map(it => ({ ex: it.ex, note: it.note || '', rest: 90, sets: (it.sets || [{}]).map(s => newSet(s)) })) }; save(); open(); };
A.wkToRoutine = b => { const w = OS.get('workouts', b.dataset.id); if (!w) return; UI.closeModal(); OS.add('routines', { name: w.title || 'Rotina', items: (Array.isArray(w.items) ? w.items : []).map(it => ({ ex: it.ex, note: it.note || '', rest: 90, sets: (Array.isArray(it.sets) ? it.sets : []).map(s => ({ t: s.t || 'N', kg: s.kg ?? '', reps: s.reps ?? '', sec: s.sec ?? '', km: s.km ?? '' })) })) }); UI.toast('Rotina criada', 'pos'); OS.go('treino'); };
A.wkStart = b => Ex.start({ rid: b.dataset.id || '' });
A.wkResume = () => open();
A.wkRoutine = b => Ex.editRoutine(b.dataset.id || '');
A.wkEx = b => Ex.sheet(b.dataset.k.startsWith('lib:') ? { lib: b.dataset.k.slice(4) } : { rec: b.dataset.k });

V.treinoHome = () => { const R = U.sortBy(OS.all('routines'), r => r.name.toLowerCase()), t = U.today(), wk = U.monday(t), Wk = OS.all('workouts'), p = OS.one('profile'), split = OS.one('fit').split[new Date().getDay()];
  const done7 = Wk.filter(w => w.date >= wk).length, last = U.sortBy(Wk, w => w.date + (w.start || ''), -1).slice(0, 4), live = Ex.live();
  const streak = (() => { let s = 0, d = U.monday(t); while (s < 99 && Wk.some(w => w.date >= d && w.date <= U.addDays(d, 6))) { s++; d = U.addDays(d, -7); } return s; })();
  return `${OS.BodyX ? OS.BodyX.strip() : ''}
  ${live ? `<div class="wk-livebar"><div>${UI.ic('dumbbell')}<span><b>${esc(live.title)}</b><small>treino em curso · ${U.mmss(elapsed())}</small></span></div><button class="btn pri" data-act="wkResume">Continuar</button></div>` : ''}
  <div class="kpis">${UI.kpi('Esta semana', done7 + ' / ' + (p.trainTarget || 4), 'treinos', { tone: done7 >= (p.trainTarget || 4) ? 'pos' : '' })}${UI.kpi('Semanas seguidas', streak, 'com pelo menos 1 treino')}${UI.kpi('Hoje', esc(split || 'Livre'), 'pela divisão semanal')}${UI.kpi('Volume (7 dias)', U.nf(U.sum(Wk.filter(w => w.date >= U.addDays(t, -6)), Fit.volume) / 1000, 1) + ' t')}</div>
  <div class="wk-start"><button class="btn pri lg" data-act="wkStart">${UI.ic('plus')}<span>Começar treino vazio</span></button><button class="btn ghost" data-act="wkRoutine">${UI.ic('note')}<span>Nova rotina</span></button><a class="btn ghost" href="#treino.exercicios">${UI.ic('search')}<span>Explorar exercícios</span></a></div>
  <div class="sech"><div><h2>As minhas rotinas</h2><p>Toca em Começar e o treino abre já com as cargas da última vez.</p></div></div>
  ${R.length ? `<div class="wk-routs">${R.map(r => { const its = (Array.isArray(r.items) ? r.items : []).map(it => Ex.info(it.ex)).filter(Boolean), lastDone = U.sortBy(Wk.filter(w => w.routine === r.id), w => w.date, -1)[0];
    return `<article class="wk-rt"><div class="wk-rth"><b>${esc(r.name)}</b><button class="icon-btn" data-act="wkRoutine" data-id="${r.id}" aria-label="Editar rotina">${UI.ic('edit')}</button></div><p class="mut">${its.map(i => esc(i.name)).join(', ')}</p><div class="wk-rtt">${its.slice(0, 5).map(i => Ex.thumb(i, 'xs')).join('')}</div><small class="mut">${its.length} exercícios · ${U.sum(r.items || [], it => (Array.isArray(it.sets) ? it.sets : []).length)} séries${lastDone ? ' · última vez ' + U.rel(lastDone.date) : ''}</small><button class="btn pri sm" data-act="wkStart" data-id="${r.id}">${UI.ic('play')}Começar</button></article>`; }).join('')}</div>`
    : UI.empty('Ainda não tens rotinas. Cria uma (ex.: "Push", "Pull", "Pernas") ou faz um treino e guarda-o como rotina.', `<button class="btn pri" data-act="wkRoutine">${UI.ic('plus')}Criar rotina</button>`)}
  <div class="sech"><div><h2>Últimos treinos</h2></div><a class="more" href="#treino.historico">Histórico ${UI.ic('right')}</a></div>
  ${last.length ? `<div class="wk-cards">${last.map(wkCard).join('')}</div>` : UI.empty('Sem treinos ainda. Começa um treino vazio ou a partir de uma rotina.')}`; };
V.treinoHist = () => { const Wk = U.sortBy(OS.all('workouts'), w => w.date + (w.start || ''), -1), lim = OS.ui.more_wkh ? 1e9 : 20;
  return Wk.length ? `<div class="wk-cards">${Wk.slice(0, lim).map(wkCard).join('')}</div>${Wk.length > lim ? `<button class="btn ghost" data-more="wkh">Mostrar mais (${Wk.length - lim})</button>` : ''}` : UI.empty('Sem treinos registados.', `<button class="btn pri" data-act="wkStart">${UI.ic('plus')}Começar treino</button>`); };
V.treinoEx = () => { const q = (OS.ui.exf || {}).q || '', m = OS.ui.exM || '', e = OS.ui.exE || ''; pickQ = q; pickM = m; pickE = e; const all = filtered(), lim = OS.ui.more_exl ? 1e9 : 60;
  return `<div class="wk-pf pg"><input type="search" class="field" data-uif="exf.q" value="${esc(q)}" placeholder="Procurar entre ${all.length} exercícios…" aria-label="Procurar exercício"><div class="wk-chips">${L.MUSCLES.map(x => UI.chip(x, 'exM', m === x, `data-v="${x}"`)).join('')}</div><div class="wk-chips">${Ex.EQUIP.map(x => UI.chip(x, 'exE', e === x, `data-v="${x}"`)).join('')}</div></div>
  <div class="row gap8" style="margin:6px 0 12px">${UI.addBtn('exercises', 'Criar exercício', null, 'ghost sm')}<span class="mut" style="font-size:12px">Toca num exercício para ver o movimento, como fazer e os teus recordes.</span></div>
  <div class="wk-grid">${all.slice(0, lim).map(x => `<button class="wk-gi" data-act="wkEx" data-k="${x.key}">${Ex.thumb({ lib: x.lib }, 'md')}<b>${esc(x.name)}</b><small>${esc(x.muscle)}${x.equip ? ' · ' + esc(x.equip) : ''}${x.used ? ' · ' + x.used + '×' : ''}</small></button>`).join('')}</div>
  ${all.length > lim ? `<button class="btn ghost" data-more="exl" style="margin-top:12px">Mostrar todos (${all.length})</button>` : ''}`; };
A.exM = b => OS.setUI('exM', OS.ui.exM === b.dataset.v ? '' : b.dataset.v);
A.exE = b => OS.setUI('exE', OS.ui.exE === b.dataset.v ? '' : b.dataset.v);

OS.on('ready', () => { if (W && W.mode === 'live') { updPill(); clearInterval(tick); tick = setInterval(onTick, 1000); } else if (W) W = null; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const i = document.getElementById('wkInfo'), p = document.getElementById('wkPick'); if (i && !i.hidden) { i.hidden = true; i.innerHTML = ''; } else if (p && !p.hidden) p.hidden = true; } });
})();
