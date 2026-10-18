/* NÁUTILO — Mapa corporal: figura anatómica musculada (frente e costas), músculos clicáveis
   e ficha detalhada por músculo: o que treinaste, séries, cargas, recordes, recuperação e equilíbrio. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, C = OS.C, Fit = OS.Fit, L = OS.L;
const BM = OS.BodyMap = {};

/* ---------- geometria: pontos da metade esquerda, curvas suaves, espelho ---------- */
const mx = p => [200 - p[0], p[1]];
const smooth = (pts, closed = true) => { const n = pts.length, P = i => pts[(i + n) % n]; let d = `M${P(0)[0]} ${P(0)[1]}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), t = .18;
    d += `C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) * t).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) * t).toFixed(1)} ${p2[0]} ${p2[1]}`; }
  return d + (closed ? 'Z' : ''); };
const outline = half => smooth(half.concat(half.slice().reverse().map(mx)));
// silhueta (metade esquerda, de cima a baixo, depois a subir por dentro)
const BODY = [[100, 50], [91, 52], [89, 60], [76, 63], [62, 66], [50, 70], [42, 80], [39, 96], [37, 118], [34, 146], [28, 168], [24, 196], [22, 212], [19, 226], [23, 236], [30, 232], [33, 216], [38, 198], [46, 170], [51, 150], [55, 124], [60, 106], [64, 128], [69, 160], [71, 188], [68, 212], [64, 246], [65, 286], [71, 324], [68, 356], [72, 392], [76, 414], [70, 426], [90, 428], [92, 412], [93, 380], [95, 350], [95, 328], [97, 290], [99, 250], [100, 236]];
const HEAD = 'M100 8C112 8 118 18 118 31C118 44 111 54 100 54C89 54 82 44 82 31C82 18 88 8 100 8Z';
// [grupo, pontos, espelhar?]  grupo null = detalhe anatómico sem ligação
const FRONT = [
  ['Trapézio', [[89, 56], [91, 63], [74, 68], [64, 67], [78, 61]], 1],
  ['Ombros', [[64, 66], [52, 69], [44, 79], [42, 95], [46, 105], [55, 99], [61, 87], [67, 74]], 1],
  ['Peito', [[69, 72], [98, 75], [99, 101], [90, 108], [75, 107], [63, 101], [61, 88]], 1],
  ['Bíceps', [[47, 105], [43, 117], [42, 134], [45, 146], [51, 141], [55, 124], [55, 107]], 1],
  ['Antebraços', [[41, 150], [34, 166], [29, 190], [30, 208], [36, 206], [43, 182], [49, 162], [49, 151]], 1],
  [null, [[64, 108], [69, 112], [70, 118], [65, 116]], 1], [null, [[65, 119], [70, 123], [71, 129], [66, 127]], 1], [null, [[66, 130], [71, 134], [72, 140], [67, 138]], 1],
  ['Oblíquos', [[68, 142], [80, 132], [85, 152], [85, 186], [77, 198], [71, 186], [69, 164]], 1],
  ['Abdómen', [[88, 110], [99, 110], [99, 128], [88, 128]], 1], ['Abdómen', [[88, 132], [99, 132], [99, 150], [88, 150]], 1], ['Abdómen', [[88, 154], [99, 154], [99, 172], [88, 173]], 1], ['Abdómen', [[88, 177], [99, 177], [99, 206], [93, 200]], 1],
  ['Quadríceps', [[71, 214], [66, 242], [66, 282], [72, 318], [80, 320], [80, 280], [78, 240]], 1],
  ['Quadríceps', [[81, 222], [91, 228], [94, 262], [90, 300], [85, 318], [81, 300], [79, 260]], 1],
  ['Quadríceps', [[91, 288], [96, 280], [97, 302], [94, 322], [87, 322]], 1],
  [null, [[93, 232], [99, 238], [98, 272], [94, 262]], 1],
  [null, [[82, 324], [90, 324], [91, 334], [83, 334]], 1],
  ['Gémeos', [[72, 338], [68, 356], [70, 380], [76, 382], [78, 356]], 1],
  [null, [[80, 340], [86, 340], [87, 396], [82, 398]], 1],
  ['Gémeos', [[92, 340], [96, 356], [94, 380], [89, 378], [89, 352]], 1]];
const BACK = [
  ['Trapézio', [[100, 50], [112, 57], [134, 66], [118, 75], [108, 102], [100, 126], [92, 102], [82, 75], [66, 66], [88, 57]], 0],
  ['Ombros', [[63, 66], [51, 70], [43, 82], [44, 99], [52, 97], [62, 85], [69, 73]], 1],
  ['Dorsais', [[71, 78], [85, 85], [89, 101], [73, 105], [64, 93]], 1],
  ['Tríceps', [[46, 101], [41, 117], [41, 137], [45, 149], [51, 144], [55, 123], [53, 104]], 1],
  ['Antebraços', [[41, 152], [34, 168], [29, 192], [30, 208], [36, 206], [43, 182], [49, 162], [49, 153]], 1],
  ['Dorsais', [[65, 106], [89, 107], [96, 132], [94, 162], [85, 172], [74, 152], [66, 128]], 1],
  ['Lombar', [[89, 150], [100, 146], [111, 150], [113, 196], [100, 203], [87, 196]], 0],
  ['Oblíquos', [[67, 162], [75, 160], [78, 200], [71, 200]], 1],
  ['Glúteos', [[72, 206], [98, 208], [100, 234], [94, 250], [78, 252], [68, 238]], 1],
  ['Isquiotibiais', [[68, 256], [82, 256], [82, 320], [75, 318], [68, 290]], 1],
  ['Isquiotibiais', [[84, 256], [97, 258], [96, 300], [90, 322], [84, 320]], 1],
  ['Gémeos', [[70, 334], [80, 332], [84, 358], [80, 386], [72, 384], [68, 360]], 1],
  ['Gémeos', [[86, 332], [96, 336], [98, 360], [92, 388], [86, 386], [84, 360]], 1]];
const LINES = { front: ['M100 76L100 206', 'M60 90Q75 100 98 101', 'M88 130L99 130M88 152L99 152M88 175L99 175'], back: ['M100 60L100 200', 'M82 75Q92 90 100 126', 'M72 206Q86 214 100 234'] };

const heatCol = k => k <= 0 ? '#1E2A38' : `color-mix(in oklab, ${k < .5 ? '#2FA9C9' : '#F0A43A'} ${Math.round(60 + 40 * Math.min(1, k < .5 ? k * 2 : (k - .5) * 2))}%, ${k < .5 ? '#1E2A38' : '#2FA9C9'})`;
function figure(side, heat, sel) {
  const list = side === 'front' ? FRONT : BACK, id = 'bm' + side;
  const shape = ([m, pts, mirror]) => { const ds = [smooth(pts)].concat(mirror ? [smooth(pts.map(mx))] : []);
    return ds.map(d => m ? `<path class="bm2-m ${sel === m ? 'sel' : ''}" d="${d}" style="fill:${heatCol(U.clamp((heat[m] || 0) / 16, 0, 1))}" data-act="muscle" data-m="${m}" role="button" tabindex="0" aria-label="${m}: ${U.nf(heat[m] || 0, 1)} séries"><title>${m} · ${U.nf(heat[m] || 0, 1)} séries</title></path><path class="bm2-sh" d="${d}" fill="url(#${id}g)"/>` : `<path class="bm2-d" d="${d}"/>`).join(''); };
  return `<svg viewBox="0 0 200 440" class="bm2" role="group" aria-label="Corpo, ${side === 'front' ? 'frente' : 'costas'}"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient><radialGradient id="${id}b" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#1B2633"/><stop offset="1" stop-color="#0F161F"/></radialGradient></defs>
    <ellipse cx="100" cy="432" rx="46" ry="5" fill="#000" opacity=".35"/><path class="bm2-body" d="${outline(BODY)}" fill="url(#${id}b)"/><path class="bm2-body" d="${HEAD}" fill="url(#${id}b)"/>
    ${list.map(shape).join('')}${(LINES[side] || []).map(d => `<path class="bm2-ln" d="${d}"/>`).join('')}</svg>`;
}

/* ---------- dados por músculo ---------- */
const exOf = m => OS.all('exercises').filter(e => e.muscle === m || (e.secondary || []).includes(m));
const hits = (m, from, to) => { const out = []; U.sortBy(OS.all('workouts').filter(w => w.date >= from && w.date <= to), w => w.date, -1).forEach(w => { const items = (Array.isArray(w.items) ? w.items : []).map(it => ({ it, ex: OS.get('exercises', it.ex) })).filter(x => x.ex && (x.ex.muscle === m || (x.ex.secondary || []).includes(m))); if (items.length) out.push({ w, items }); }); return out; };
const setsTxt = sets => { const s = (sets || []).filter(x => U.num(x.reps)); if (!s.length) return '—'; const same = s.every(x => x.reps === s[0].reps && x.kg === s[0].kg); return same ? `${s.length}×${s[0].reps}${U.num(s[0].kg) ? ' · ' + U.nf(U.num(s[0].kg), 1) + ' kg' : ''}` : s.map(x => `${x.reps}${U.num(x.kg) ? '×' + U.nf(U.num(x.kg), 1) : ''}`).join(' · '); };
const ANT = { Peito: 'Dorsais', Dorsais: 'Peito', Bíceps: 'Tríceps', Tríceps: 'Bíceps', Quadríceps: 'Isquiotibiais', Isquiotibiais: 'Quadríceps', Abdómen: 'Lombar', Lombar: 'Abdómen' };
const TIP = { Peito: 'Supino, flexões, crucifixos.', Dorsais: 'Remadas, puxadas, elevações.', Trapézio: 'Encolhimentos, remada alta, face pull.', Lombar: 'Peso morto, hiperextensões.', Ombros: 'Press militar, elevações laterais, face pull.', Bíceps: 'Rosca direta, martelo, concentrada.', Tríceps: 'Mergulhos, extensões, supino fechado.', Antebraços: 'Rosca de punho, farmer walk.', Abdómen: 'Prancha, crunch, elevação de pernas.', Oblíquos: 'Pallof press, rotações, prancha lateral.', Glúteos: 'Hip thrust, agachamento, peso morto romeno.', Quadríceps: 'Agachamento, prensa, extensões.', Isquiotibiais: 'Peso morto romeno, flexões de perna.', Gémeos: 'Elevações de gémeos em pé e sentado.' };

BM.view = () => {
  const t = U.today(), per = OS.ui.bmPer || '7', from = U.addDays(t, -(+per - 1)), heat = Fit.muscleSets(from, t), sel = OS.ui.bmSel || 'Peito', m = sel;
  const hs = {}; Object.keys(heat).forEach(k => hs[k] = heat[k] * 7 / +per);
  const s7 = Fit.muscleSets(U.addDays(t, -6), t), s30 = Fit.muscleSets(U.addDays(t, -29), t), w7 = s7[m], w30 = s30[m];
  const vol7 = Fit.muscleVolume(m, U.addDays(t, -6), t), vol30 = Fit.muscleVolume(m, U.addDays(t, -29), t);
  const H = hits(m, U.addDays(t, -59), t), last = H[0] && H[0].w.date, ago = last ? U.diff(last, t) : null;
  const st = ago == null ? ['Nunca treinado', 'neg'] : ago < 2 ? ['A recuperar', 'warn'] : ago <= 5 ? ['Pronto para treinar', 'pos'] : ['Esquecido há ' + ago + ' dias', 'neg'];
  const zone = w7 < 6 ? ['abaixo do ideal', 'neg'] : w7 <= 20 ? ['zona ideal (10–20)', 'pos'] : ['acima do ideal', 'warn'];
  const exs = exOf(m), done = exs.map(e => ({ e, h: Fit.exHistory(e.id), prim: e.muscle === m })).filter(x => x.h.length).sort((a, b) => b.h[b.h.length - 1].date.localeCompare(a.h[a.h.length - 1].date));
  const weeks = Array.from({ length: 8 }, (_, i) => U.addDays(U.monday(t), -7 * (7 - i)));
  const idle = exs.filter(e => !done.some(d => d.e.id === e.id) || done.find(d => d.e.id === e.id).h.slice(-1)[0].date < U.addDays(t, -21)).slice(0, 5);
  const ant = ANT[m], ratio = ant && s30[ant] ? s30[m] / s30[ant] : null;
  const rank = L.MUSCLES.map(x => [x, s7[x]]).sort((a, b) => b[1] - a[1]);
  return `<div class="row between gap12" style="flex-wrap:wrap"><div class="bm-legend">séries por semana <span class="bm2-scale"><i style="background:${heatCol(0)}"></i><i style="background:${heatCol(.25)}"></i><i style="background:${heatCol(.5)}"></i><i style="background:${heatCol(.75)}"></i><i style="background:${heatCol(1)}"></i></span> 0 → 16+</div>${UI.seg('bmPer', [['7', '7 dias'], ['30', '30 dias']], per)}</div>
  <div class="bm2-wrap"><div class="bm2-figs"><div class="bm-fig">${figure('front', hs, sel)}<span class="cap">Frente</span></div><div class="bm-fig">${figure('back', hs, sel)}<span class="cap">Costas</span></div></div>
  <div class="pn bm2-panel">
    <div class="row between gap8" style="align-items:flex-start"><div><div class="eyebrow">Músculo</div><h2 class="bm2-h">${m}</h2></div>${UI.badge(st[0], st[1])}</div>
    <div class="bm2-stats"><div><b class="mono">${U.nf(w7, w7 % 1 ? 1 : 0)}</b><span>séries · 7 dias</span><small class="${zone[1]}">${zone[0]}</small></div><div><b class="mono">${U.nf(w30, w30 % 1 ? 1 : 0)}</b><span>séries · 30 dias</span></div><div><b class="mono">${U.nf(vol7)}</b><span>kg de volume · 7d</span><small class="mut">${U.nf(vol30)} kg em 30d</small></div><div><b class="mono">${last ? U.rel(last) : '—'}</b><span>último treino</span><small class="mut">${new Set(H.filter(h => h.w.date >= U.addDays(t, -29)).map(h => h.w.date)).size} dias em 30</small></div></div>
    ${ratio != null ? `<div class="bm2-bal"><span>Equilíbrio com ${ant} (30d)</span><div class="bm2-balbar"><i style="width:${Math.min(100, s30[m] / (s30[m] + s30[ant]) * 100)}%"></i></div><small class="mut">${U.nf(s30[m], 0)} vs ${U.nf(s30[ant], 0)} séries${ratio > 1.5 ? ` · treinas pouco ${ant}` : ratio < .67 ? ` · ${m} está atrás` : ' · equilibrado'}</small></div>` : ''}
    <div class="eyebrow" style="margin:16px 0 6px">Séries por semana · 8 semanas</div>${C.mount({ type: 'bar', labels: weeks.map(w => U.fmtDS(w)), series: [{ name: 'Séries', data: weeks.map(w => Fit.muscleSets(w, U.addDays(w, 6))[m]), color: 'var(--accent)' }], target: 10, targetLabel: '10', empty: 'Sem séries registadas para este músculo.' }, 130)}
    <div class="eyebrow" style="margin:16px 0 4px">O que treinaste</div>${H.length ? H.slice(0, 6).map(h => `<div class="bm2-sess" data-edit="workouts:${h.w.id}"><div class="row between"><b>${esc(h.w.title || 'Treino')}</b><span class="mono mut">${U.fmtDS(h.w.date)} · ${U.rel(h.w.date)}</span></div>${h.items.map(x => `<div class="bm2-ex"><span>${esc(x.ex.name)}${x.ex.muscle !== m ? ' <em>secundário</em>' : ''}</span><span class="mono">${setsTxt(x.it.sets)}</span></div>`).join('')}</div>`).join('') : `<div class="mut" style="font-size:13px">Nada nos últimos 60 dias.</div>`}
    ${done.length ? `<div class="eyebrow" style="margin:16px 0 4px">Exercícios e cargas</div>${done.map(x => { const b = x.h.reduce((a, z) => z.e1rm > a.e1rm ? z : a), lt = x.h[x.h.length - 1], top = Math.max(...x.h.map(z => z.top)); return `<div class="li" data-act="exOpen" data-id="${x.e.id}" style="cursor:pointer"><div class="li-t"><b>${esc(x.e.name)}${x.prim ? '' : ' <span class="mut" style="font-weight:400">(sec.)</span>'}</b><small>${x.h.length} sessões · última ${U.fmtDS(lt.date)} · ${lt.sets} séries · recorde ${U.nf(top, 1)} kg</small></div><span class="mono" title="1RM estimado">${b.e1rm} kg</span>${UI.spark(x.h.slice(-10).map(z => z.e1rm))}</div>`; }).join('')}` : ''}
    <div class="eyebrow" style="margin:16px 0 6px">Para variar</div><div class="mut" style="font-size:13px;margin-bottom:6px">${TIP[m] || ''}</div><div class="row gap4" style="flex-wrap:wrap">${idle.map(e => UI.badge(e.name, 'out')).join('') || ''}</div>
  </div></div>
  <div class="pn" style="margin-top:16px"><div class="pn-h"><h3>Todos os músculos · 7 dias</h3></div><div class="bm2-rank">${rank.map(([x, v]) => `<button class="${x === m ? 'on' : ''}" data-act="muscle" data-m="${x}"><span>${x}</span><i style="width:${Math.min(100, v / 20 * 100)}%;background:${heatCol(U.clamp(v / 16, .05, 1))}"></i><b class="mono">${U.nf(v, v % 1 ? 1 : 0)}</b></button>`).join('')}</div></div>`;
};
})();
