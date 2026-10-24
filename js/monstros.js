/* PRUMO — o bestiário do Dominus: monstros e chefes em pixel art (64 × 64), sinistros, como os chefes do Terraria.
   Cada monstro é desenhado a partir de um corpo-base (golem, hidra, espectro, dragão, demónio, olho, aranha, lich, verme, lodo,
   titã, gárgula, vazio, lobo, cavaleiro oco) com a sua paleta, olhos que brilham, contorno escuro colorido e uma aura.
   Ferido ganha rachas; derrotado fica cinzento com os olhos apagados. A imagem é feita uma vez e guardada como PNG. */
(() => {
'use strict';
const W = 64, H = 64;
/* ---------- cor ---------- */
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v * (1 - t) + B[i] * t)); };
const toHsl = h => { let [r, g, b] = hx(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let Hh = 0, S = 0;
  if (mx !== mn) { const d = mx - mn; S = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); Hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; Hh *= 60; } return [Hh, S, l]; };
const fromHsl = (Hh, S, l) => { Hh = ((Hh % 360) + 360) % 360; S = Math.max(0, Math.min(1, S)); l = Math.max(0, Math.min(1, l)); const q = l < .5 ? l * (1 + S) : l + S - l * S, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return toHex([f(Hh / 360 + 1 / 3), f(Hh / 360), f(Hh / 360 - 1 / 3)].map(v => v * 255)); };
const toward = (h, T, a) => { const d = ((T - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), a); };
// rampa de 6 tons: contorno, sombra funda, sombra, base, luz, brilho (sombras para o violeta, luzes para o amarelo-pálido)
const RAMP = c => { const [h, s, l] = toHsl(c); return [fromHsl(toward(h, 265, 30), Math.min(1, s + .15), l * .22), fromHsl(toward(h, 265, 20), Math.min(1, s + .1), l * .48), fromHsl(toward(h, 265, 9), s, l * .74), c,
  fromHsl(toward(h, 60, 8), s * .92, l + (1 - l) * .2), fromHsl(toward(h, 60, 14), s * .75, l + (1 - l) * .45)]; };
const grey = c => { const [h, s, l] = toHsl(c); return fromHsl(h, s * .12, l * .7); };
const rng = seed => { let x = 2166136261; for (const ch of String(seed)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return () => { x = Math.imul(x ^ (x >>> 15), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909); x ^= x >>> 16; return (x >>> 0) / 4294967296; }; };
const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/* ---------- máscaras (conjuntos de píxeis) ---------- */
const ok = (x, y) => x >= 0 && x < W && y >= 0 && y < H, id = (x, y) => y * W + x;
const M = {
  ell: (cx, cy, rx, ry) => { const s = new Set(); for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const a = (x + .5 - cx) / rx, b = (y + .5 - cy) / ry; if (a * a + b * b <= 1 && ok(x, y)) s.add(id(x, y)); } return s; },
  rect: (x0, y0, x1, y1) => { const s = new Set(); for (let y = Math.round(y0); y <= y1; y++) for (let x = Math.round(x0); x <= x1; x++) if (ok(x, y)) s.add(id(x, y)); return s; },
  poly: pts => { const s = new Set(), ys = pts.map(p => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) { const xs = []; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length], yy = y + .5; if ((y0 <= yy && y1 > yy) || (y1 <= yy && y0 > yy)) xs.push(x0 + (yy - y0) / (y1 - y0) * (x1 - x0)); }
    xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - .5); x <= Math.floor(xs[k + 1] - .5); x++) if (ok(x, y)) s.add(id(x, y)); } return s; },
  // traço com espessura que afina (pescoços, patas, chifres, tentáculos)
  cap: (x0, y0, x1, y1, r0, r1 = r0) => { const s = new Set(), n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for (let i = 0; i <= n; i++) { const t = i / n; M.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, Math.max(.5, r0 + (r1 - r0) * t), Math.max(.5, r0 + (r1 - r0) * t)).forEach(v => s.add(v)); } return s; },
  // curva (quadrática) com espessura
  curve: (p0, p1, p2, r0, r1 = r0) => { const s = new Set(), n = 24; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t, x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1], r = r0 + (r1 - r0) * t; M.ell(x, y, Math.max(.6, r), Math.max(.6, r)).forEach(v => s.add(v)); } return s; },
  U: (...a) => { const s = new Set(); a.forEach(t => t && t.forEach(i => s.add(i))); return s; },
  X: (a, ...b) => { const s = new Set(a); b.forEach(t => t && t.forEach(i => s.delete(i))); return s; },
  mir: a => new Set([...a].map(i => id(W - 1 - (i % W), (i / W) | 0))),
  both: a => M.U(a, M.mir(a)),
  where: (a, f) => new Set([...a].filter(i => f(i % W, (i / W) | 0))) };

/* ---------- tela ---------- */
const canvas = () => { const px = new Array(W * H).fill(null), C = { px, solid: new Set() };
  C.put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (c && ok(x, y)) { px[id(x, y)] = c; C.solid.add(id(x, y)); } };
  C.at = (x, y) => ok(x, y) ? px[id(x, y)] : null;
  C.line = (x0, y0, x1, y1, c) => { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (let k = 0; k < 400; k++) { C.put(x0, y0, typeof c === 'function' ? c(x0, y0) : c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } };
  // pinta com volume: luz de cima à esquerda, contorno com a cor mais escura da rampa
  C.vol = (m, col, o = {}) => { const R = Array.isArray(col) ? col : RAMP(col), h = i => m.has(i), lx = o.lx != null ? o.lx : .55;
    m.forEach(i => { const x = i % W, y = (i / W) | 0, L = x > 0 && h(i - 1), Rr = x < W - 1 && h(i + 1), Up = y > 0 && h(i - W), Dn = y < H - 1 && h(i + W);
      let c; if (!(L && Rr && Up && Dn) && !o.noline) c = R[0];
      else { let dl = 0, dr = 0, du = 0, dd = 0; while (x - dl - 1 >= 0 && h(i - dl - 1)) dl++; while (x + dr + 1 < W && h(i + dr + 1)) dr++; while (y - du - 1 >= 0 && h(i - (du + 1) * W)) du++; while (y + dd + 1 < H && h(i + (dd + 1) * W)) dd++;
        const v = lx * (dl / ((dl + dr) || 1)) + (1 - lx) * (du / ((du + dd) || 1)), b = BAY[y & 3][x & 3] / 16 * .08 - .04 + v;
        c = b < (o.hi || .1) && o.shine !== false ? R[5] : b < .28 ? R[4] : b < .55 ? R[3] : b < .8 ? R[2] : R[1]; }
      C.put(x, y, c); }); return R; };
  // brilho à volta (olhos, lava, runas): mistura a cor por cima do que lá está
  C.glow = (cx, cy, r, c, k = .55) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { if (!ok(x, y)) continue; const d = Math.hypot(x + .5 - cx, y + .5 - cy) / r; if (d > 1) continue; const t = k * (1 - d) * (1 - d), cur = px[id(x, y)];
    if (cur) px[id(x, y)] = mix(cur, c, t); else if (t > .12 && (BAY[y & 3][x & 3] / 16) < t * 1.6) { px[id(x, y)] = mix('#000000', c, Math.min(.7, t * 1.4)); } } };
  // olho que brilha: núcleo claro, íris e halo
  C.eye = (x, y, r, c, o = {}) => { if (o.dead) { C.put(x, y, '#2A2A2E'); if (r >= 2) { C.put(x - 1, y - 1, '#2A2A2E'); C.put(x + 1, y + 1, '#2A2A2E'); C.put(x + 1, y - 1, '#2A2A2E'); C.put(x - 1, y + 1, '#2A2A2E'); } return; }
    C.glow(x + .5, y + .5, r + 3.5, c, .6); if (r <= 1) { C.put(x, y, mix(c, '#FFFFFF', .55)); if (o.wide) C.put(x + 1, y, c); return; }
    M.ell(x + .5, y + .5, r, o.slit ? r * .7 : r).forEach(i => C.put(i % W, (i / W) | 0, c)); C.put(x, y, mix(c, '#FFFFFF', .75)); if (o.slit) { C.put(x, y - 1, '#0A0508'); C.put(x, y + 1, '#0A0508'); } else C.put(x - 1, y - 1, '#FFFFFF'); };
  C.fill = (m, c) => m.forEach(i => C.put(i % W, (i / W) | 0, typeof c === 'function' ? c(i % W, (i / W) | 0) : c));
  return C; };

/* ---------- corpos-base ---------- */
// cada um recebe a tela C, as cores o.b (corpo), o.a (olhos/brilho), o.c (2.ª cor), o.r (aleatório), o.t (ameaça 0–3), o.dead
const fang = (C, x, y, len, c = '#E9E2CF', dir = 1) => { for (let k = 0; k < len; k++) C.put(x, y + k * dir, k === len - 1 ? mix(c, '#7A6E5A', .4) : c); };
const crack = (C, r, m, n, c) => { const L = [...m]; for (let k = 0; k < n; k++) { let i = L[Math.floor(r() * L.length)], x = i % W, y = (i / W) | 0; for (let s = 0; s < 6 + r() * 6; s++) { if (m.has(id(x, y))) C.put(x, y, c); x += Math.round(r() * 2 - 1); y += r() < .7 ? 1 : 0; } } };
const P = {
  golem: (C, o) => { const r = o.r, legs = M.both(M.rect(17, 48, 27, 61)), feet = M.both(M.rect(14, 58, 28, 62)), torso = M.poly([[11, 22], [24, 17], [40, 17], [53, 22], [55, 37], [49, 50], [15, 50], [9, 37]]);
    const arm = M.U(M.cap(12, 25, 7, 42, 6, 5), M.rect(1, 40, 13, 54)), arms = M.both(arm), head = M.poly([[25, 7], [39, 7], [41, 19], [23, 19]]);
    C.vol(M.U(legs, feet), mix(o.b, '#000000', .25)); C.vol(arms, o.b); C.vol(torso, o.b); C.vol(head, mix(o.b, '#FFFFFF', .06));
    // pedras soltas e musgo
    for (let k = 0; k < 14; k++) { const x = 12 + Math.floor(r() * 40), y = 20 + Math.floor(r() * 30); if (torso.has(id(x, y))) { C.put(x, y, RAMP(o.b)[1]); C.put(x + 1, y, RAMP(o.b)[4]); } }
    crack(C, r, torso, 4 + o.t, o.a); crack(C, r, arms, 2 + o.t, o.a); [[20, 30], [44, 32], [32, 42], [6, 47], [58, 47]].forEach(([x, y]) => C.glow(x, y, 6, o.a, .35));
    C.eye(28, 13, 1, o.a, { dead: o.dead, wide: 1 }); C.eye(35, 13, 1, o.a, { dead: o.dead, wide: 1 }); C.line(29, 16, 35, 16, RAMP(o.b)[0]);
    if (o.t >= 2) { C.vol(M.both(M.poly([[22, 18], [16, 8], [25, 15]])), mix(o.b, '#000000', .2)); } },
  hidra: (C, o) => { const r = o.r, n = 3 + Math.min(2, o.t), body = M.U(M.ell(32, 53, 21, 10), M.ell(32, 60, 26, 5)), xs = n === 3 ? [12, 32, 52] : n === 4 ? [9, 24, 40, 55] : [8, 20, 32, 44, 56];
    C.vol(body, mix(o.b, '#000000', .2));
    xs.forEach((hx2, k) => { const hy = k % 2 ? 14 : 20 - (hx2 === 32 ? 12 : 0), neck = M.curve([32 + (hx2 - 32) * .3, 50], [hx2 + (hx2 < 32 ? -6 : 6), 36], [hx2, hy + 5], 4.5, 3);
      C.vol(neck, o.b);
      neck.forEach(i => { const x = i % W, y = (i / W) | 0; if ((x + y * 2) % 5 === 0 && C.at(x, y) !== RAMP(o.b)[0]) C.put(x, y, RAMP(o.b)[2]); });
      const head = M.U(M.ell(hx2, hy, 6, 4.5), M.poly([[hx2 - 4, hy + 2], [hx2 + 4, hy + 2], [hx2 + 1, hy + 8], [hx2 - 1, hy + 8]])); C.vol(head, mix(o.b, '#FFFFFF', .05));
      C.fill(M.poly([[hx2 - 3, hy + 3], [hx2 + 3, hy + 3], [hx2, hy + 7]]), '#1A0408'); fang(C, hx2 - 2, hy + 3, 3); fang(C, hx2 + 2, hy + 3, 3); C.put(hx2, hy + 4, mix(o.a, '#FF0000', .5));
      C.vol(M.cap(hx2 - 4, hy - 2, hx2 - 7, hy - 7, 1.2, .5), RAMP(o.b)[1]); C.vol(M.cap(hx2 + 4, hy - 2, hx2 + 7, hy - 7, 1.2, .5), RAMP(o.b)[1]);
      C.eye(hx2 - 3, hy - 1, 1, o.a, { dead: o.dead }); C.eye(hx2 + 2, hy - 1, 1, o.a, { dead: o.dead }); }); },
  espectro: (C, o) => { const r = o.r, hem = [], N = 12; for (let k = 0; k <= N; k++) hem.push([6 + k * 52 / N, 56 + (k % 2 ? -6 : 3) + Math.round(r() * 3)]);
    const cloak = M.poly([[32, 3], [44, 12], [50, 30], [58, 50]].concat(hem.slice().reverse()).concat([[6, 50], [14, 30], [20, 12]])); C.vol(cloak, o.b, { lx: .7 });
    // rasgões
    for (let k = 0; k < 6; k++) { const x = 10 + Math.floor(r() * 44); for (let y = 48; y < 60; y++) if (r() < .55) C.px[id(x, y)] = null; }
    const void_ = M.ell(32, 18, 9, 10); C.fill(void_, (x, y) => mix('#020106', o.a, Math.max(0, .12 - Math.hypot(x - 32, y - 16) / 80)));
    C.eye(28, 17, 1, o.a, { dead: o.dead, wide: 1 }); C.eye(35, 17, 1, o.a, { dead: o.dead, wide: 1 });
    // mãos ossudas
    [[12, 36, -1], [52, 36, 1]].forEach(([x, y, s]) => { const bone = '#C9C2B2'; C.line(x, y, x + 6 * s, y + 4, bone); C.line(x + 6 * s, y + 4, x + 9 * s, y + 2, bone); C.line(x + 6 * s, y + 4, x + 10 * s, y + 6, bone); C.line(x + 6 * s, y + 4, x + 8 * s, y + 9, bone); });
    for (let k = 0; k < 30; k++) { const x = 4 + r() * 56, y = 40 + r() * 23; if (!C.at(x, y)) C.put(x, y, mix(o.a, '#000000', .55 + r() * .3)); }
    C.glow(32, 18, 14, o.a, .2); },
  dragao: (C, o) => { const r = o.r, wing = M.poly([[26, 24], [12, 6], [2, 4], [6, 14], [1, 22], [7, 28], [3, 36], [11, 38], [10, 46], [24, 40]]), wings = M.both(wing);
    C.vol(wings, mix(o.b, '#000000', .35), { lx: .3 }); [[12, 6, 24, 26], [6, 14, 24, 30], [7, 28, 25, 34], [11, 38, 25, 38]].forEach(([a, b, c, d]) => { C.line(a, b, c, d, RAMP(o.b)[1]); C.line(63 - a, b, 63 - c, d, RAMP(o.b)[1]); });
    const neck = M.cap(32, 50, 32, 28, 9, 6), chest = M.ell(32, 54, 14, 10); C.vol(M.U(chest, neck), o.b);
    neck.forEach(i => { const x = i % W, y = (i / W) | 0; if (Math.abs(x - 32) <= 3 && y % 3 === 0) C.put(x, y, mix(o.c || '#C9A060', '#000000', .3)); });
    const head = M.poly([[22, 14], [27, 9], [37, 9], [42, 14], [40, 24], [36, 32], [28, 32], [24, 24]]); C.vol(head, mix(o.b, '#FFFFFF', .05));
    C.vol(M.both(M.curve([25, 11], [16, 6], [14, -2], 2.2, .6)), mix(o.c || '#C9A060', '#000000', .2)); if (o.t >= 1) C.vol(M.both(M.curve([24, 16], [15, 15], [11, 10], 1.6, .5)), mix(o.c || '#C9A060', '#000000', .3));
    const maw = M.poly([[27, 25], [37, 25], [35, 32], [29, 32]]); C.fill(maw, (x, y) => mix('#2A0500', o.a, (y - 25) / 9)); fang(C, 28, 25, 3); fang(C, 36, 25, 3); fang(C, 30, 32, 2, '#E9E2CF', -1); fang(C, 34, 32, 2, '#E9E2CF', -1);
    C.glow(32, 31, 10, o.a, .55); C.eye(27, 17, 1, o.a, { dead: o.dead, slit: 1 }); C.eye(36, 17, 1, o.a, { dead: o.dead, slit: 1 }); C.put(30, 22, '#05020A'); C.put(33, 22, '#05020A'); },
  demonio: (C, o) => { const r = o.r, body = M.U(M.poly([[16, 26], [48, 26], [44, 48], [38, 58], [26, 58], [20, 48]]), M.ell(32, 30, 18, 8)), arm = M.U(M.cap(16, 28, 8, 44, 5, 4), M.cap(8, 44, 10, 54, 4, 3)), arms = M.both(arm);
    if (o.t >= 1) { const wing = M.poly([[20, 26], [6, 6], [0, 18], [3, 30], [8, 40]]); C.vol(M.both(wing), mix(o.b, '#000000', .45), { lx: .3 }); }
    C.vol(arms, o.b); C.vol(body, o.b);
    [[24, 34], [40, 34], [28, 42], [36, 42]].forEach(([x, y]) => C.put(x, y, RAMP(o.b)[1])); C.line(32, 32, 32, 50, RAMP(o.b)[1]);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) C.line(32 + s * (22 + k), 55, 32 + s * (24 + k), 59, '#E9E2CF');
    const head = M.U(M.ell(32, 18, 9, 9), M.poly([[26, 20], [38, 20], [35, 28], [29, 28]])); C.vol(head, mix(o.b, '#FFFFFF', .04));
    C.vol(M.both(M.curve([25, 12], [14, 10], [12, 0], 3, .6)), mix(o.c || '#2A2020', '#000000', .1)); if (o.t >= 2) C.vol(M.both(M.curve([27, 10], [23, 2], [26, -2], 1.5, .5)), mix(o.c || '#2A2020', '#000000', .1));
    C.eye(28, 17, 1, o.a, { dead: o.dead, wide: 1 }); C.eye(35, 17, 1, o.a, { dead: o.dead, wide: 1 }); C.line(28, 15, 30, 16, RAMP(o.b)[0]); C.line(34, 16, 36, 15, RAMP(o.b)[0]);
    C.fill(M.poly([[27, 23], [37, 23], [34, 27], [30, 27]]), '#120206'); for (let x = 28; x <= 36; x += 2) C.put(x, 23, '#EDE6D2'); C.glow(32, 26, 6, o.a, .3); },
  olho: (C, o) => { const r = o.r, n = 5 + o.t * 2, ball = M.ell(32, 34, 20, 19); for (let k = 0; k < n; k++) { const a = -Math.PI * (.12 + .76 * k / (n - 1)), x1 = 32 + Math.cos(a) * 30, y1 = 32 + Math.sin(a) * 30, stalk = M.curve([32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14], [32 + Math.cos(a + .3) * 24, 30 + Math.sin(a + .3) * 22], [x1, y1], 2, 1.2);
      C.vol(stalk, mix(o.b, '#000000', .15)); C.vol(M.ell(x1, y1, 2.6, 2.6), '#D8D0C8'); C.eye(Math.round(x1), Math.round(y1), 1, o.a, { dead: o.dead }); }
    C.vol(ball, o.b); const sc = M.ell(32, 33, 12, 10); C.fill(sc, (x, y) => mix('#E6DDD2', '#B88A8A', Math.hypot(x - 32, y - 33) / 14));
    for (let k = 0; k < 7; k++) { let x = 32 + Math.round((r() - .5) * 22), y = 33 + Math.round((r() - .5) * 18); for (let s = 0; s < 5; s++) { if (sc.has(id(x, y))) C.put(x, y, '#A33A3A'); x += Math.round((32 - x) / 6 + r() - .5); y += Math.round((33 - y) / 6 + r() - .5); } }
    if (o.dead) C.fill(M.ell(32, 33, 6, 6), '#5A5A5E'); else { C.fill(M.ell(32, 33, 6, 6), o.a); C.fill(M.ell(32, 33, 4, 4), mix(o.a, '#000000', .25)); C.fill(M.rect(31, 28, 32, 38), '#050208'); C.put(29, 30, '#FFFFFF'); C.glow(32, 33, 10, o.a, .3); }
    C.fill(M.where(M.ell(32, 33, 13, 11), (x, y) => y < 24 + Math.abs(x - 32) * .3), RAMP(o.b)[1]);
    const mouth = M.poly([[22, 46], [42, 46], [38, 51], [26, 51]]); C.fill(mouth, '#14030A'); for (let x = 23; x <= 41; x += 2) { C.put(x, 46, '#E9E2CF'); C.put(x + 1, 51, '#E9E2CF'); } },
  aranha: (C, o) => { const r = o.r; for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const sx = 32 + s * 7, sy = 36 + k * 3, kx = 32 + s * (18 + k * 2), ky = 22 + k * 8, fx = 32 + s * (27 + k), fy = 46 + k * 4;
      C.vol(M.U(M.cap(sx, sy, kx, ky, 2, 1.6), M.cap(kx, ky, fx, fy, 1.6, .7)), mix(o.b, '#000000', .1)); C.put(kx, ky, RAMP(o.b)[4]); }
    const abd = M.ell(32, 18, 15, 13), tho = M.ell(32, 39, 10, 8); C.vol(abd, o.b); C.vol(tho, mix(o.b, '#FFFFFF', .04));
    // marca de caveira nas costas
    const sk = o.c || o.a; C.fill(M.ell(32, 16, 5, 4.5), mix(sk, '#000000', .25)); C.fill(M.rect(30, 19, 34, 22), mix(sk, '#000000', .25)); C.put(30, 16, RAMP(o.b)[0]); C.put(34, 16, RAMP(o.b)[0]); C.put(32, 21, RAMP(o.b)[0]);
    [[28, 36], [36, 36], [30, 34], [34, 34], [26, 38], [38, 38], [31, 38], [33, 38]].forEach(([x, y], k) => C.eye(x, y, k < 2 ? 1 : 0, o.a, { dead: o.dead }));
    C.vol(M.both(M.cap(30, 44, 28, 50, 1.6, .5)), '#2A1E1E'); for (let k = 0; k < 6; k++) C.put(20 + r() * 24, 58 + r() * 4, '#C8C0C8'); },
  caveira: (C, o) => { const r = o.r, robe = M.poly([[18, 30], [46, 30], [56, 62], [8, 62]]); C.vol(robe, o.c || '#2A1F3A', { lx: .7 });
    for (let y = 34; y <= 46; y += 3) { C.line(24, y, 40, y, '#BDB4A0'); C.put(23, y + 1, '#8E8674'); C.put(41, y + 1, '#8E8674'); } C.line(32, 32, 32, 48, '#D8D0BC');
    C.vol(M.cap(52, 10, 52, 62, 1.2), '#4A3424'); C.vol(M.ell(52, 8, 4, 4), o.a, { shine: true }); C.glow(52, 8, 9, o.a, .5); C.line(44, 40, 52, 38, '#D8D0BC');
    const skull = M.U(M.ell(32, 16, 11, 11), M.rect(26, 22, 38, 30)); C.vol(skull, o.bone || '#D6CDB6');
    C.fill(M.ell(27.5, 17, 3, 3.5), '#08040A'); C.fill(M.ell(36.5, 17, 3, 3.5), '#08040A'); C.eye(27, 17, 0, o.a, { dead: o.dead }); C.eye(36, 17, 0, o.a, { dead: o.dead });
    C.fill(M.poly([[31, 21], [33, 21], [32, 24]]), '#08040A'); for (let x = 26; x <= 38; x += 2) { C.put(x, 27, '#08040A'); C.put(x, 29, '#08040A'); }
    const crown = M.U(M.rect(22, 5, 42, 8), ...[22, 27, 32, 37, 42].map(x => M.poly([[x - 2, 6], [x + 2, 6], [x, 0 + (x === 32 ? -1 : 2)]]))); C.vol(crown, o.metal || '#9A7A30');
    C.put(32, 6, o.a); C.glow(32, 6, 4, o.a, .4); crack(C, r, skull, o.t, '#6E6656'); },
  verme: (C, o) => { const body = M.U(M.rect(10, 26, 54, 64), M.ell(32, 26, 22, 22)); C.vol(body, o.b, { lx: .6 }); for (let y = 32; y < 64; y += 5) { C.line(10, y, 54, y + 1, RAMP(o.b)[1]); C.line(11, y + 1, 53, y + 2, RAMP(o.b)[4]); }
    C.fill(M.ell(32, 26, 18, 17), (x, y) => mix('#5A0A14', '#1A0206', Math.min(1, Math.hypot(x - 32, y - 26) / 18 * .3 + .2)));
    [[17, 14], [11.5, 11]].forEach(([R, T], ring) => { for (let j = 0; j < T; j++) { const a = (j + ring * .5) / T * Math.PI * 2, w = Math.PI / T * .8, p = r => [32 + Math.cos(a) * r, 26 + Math.sin(a) * r * .95], q = (r, d) => [32 + Math.cos(a + d) * r, 26 + Math.sin(a + d) * r * .95];
      const tooth = M.poly([q(R, -w), q(R, w), p(R - (ring ? 5 : 6.5))]); C.fill(tooth, (x, y) => Math.hypot(x - 32, y - 26) > R - 2 ? '#E8DEC6' : '#B8AC92'); } });
    C.fill(M.ell(32, 26, 5.5, 5), '#050104'); C.glow(32, 26, 9, o.a, .5); C.eye(32, 26, 0, o.a, { dead: o.dead });
    for (let k = 0; k < 5; k++) { const x = 20 + k * 6; for (let d = 0; d < 3 + (k % 3); d++) C.put(x, 40 + d, mix('#C8E06A', o.b, .5)); } },
  lodo: (C, o) => { const r = o.r, blob = M.U(M.ell(32, 44, 25, 18), M.ell(32, 30, 17, 15), M.ell(22, 52, 14, 10), M.ell(44, 52, 14, 10)); C.vol(blob, o.b, { lx: .45 });
    blob.forEach(i => { const x = i % W, y = (i / W) | 0; if (y < 40 && x < 30 && (x + y) % 7 === 0) C.put(x, y, RAMP(o.b)[5]); });
    // ossos e caveiras lá dentro
    [[24, 46], [40, 50]].forEach(([x, y]) => { C.fill(M.ell(x, y, 3.5, 3), mix('#D8D0BC', o.b, .45)); C.put(x - 1, y, mix('#000000', o.b, .5)); C.put(x + 1, y, mix('#000000', o.b, .5)); }); C.line(30, 55, 37, 53, mix('#D8D0BC', o.b, .45));
    for (let k = 0; k < 7; k++) { const x = 10 + Math.floor(r() * 44); let y = 50; while (y < 63 && blob.has(id(x, y))) y++; for (let d = 0; d < 2 + r() * 4; d++) C.put(x, y + d, RAMP(o.b)[d ? 2 : 3]); }
    C.eye(26, 28, 1, o.a, { dead: o.dead }); C.eye(37, 27, 2, o.a, { dead: o.dead }); if (o.t >= 1) C.eye(32, 36, 1, o.a, { dead: o.dead });
    const mouth = M.poly([[21, 37], [43, 37], [38, 44], [26, 44]]); C.fill(mouth, '#0E0306'); for (let x = 22; x <= 42; x += 3) { C.put(x, 37, '#E2D8C0'); C.put(x + 1, 38, '#E2D8C0'); C.put(x - 1, 43, '#C8BEA6'); } C.glow(32, 41, 6, o.a, .2); },
  tita: (C, o) => { const body = M.poly([[14, 24], [50, 24], [46, 52], [18, 52]]), legs = M.both(M.rect(18, 50, 29, 63)), pauld = M.both(M.ell(13, 24, 11, 8)), arms = M.both(M.U(M.cap(10, 28, 6, 50, 5, 4.5), M.ell(6, 52, 5, 5)));
    C.vol(legs, mix(o.b, '#000000', .25)); C.vol(arms, o.b); C.vol(body, o.b); C.vol(pauld, mix(o.b, '#FFFFFF', .08));
    C.line(20, 38, 44, 38, RAMP(o.b)[1]); C.fill(M.rect(18, 44, 46, 47), mix(o.c || '#5A4A30', '#000000', .2)); C.put(32, 45, o.a);
    // runas a brilhar no peito
    [[32, 30], [26, 33], [38, 33], [32, 36]].forEach(([x, y]) => { C.put(x, y, o.a); C.glow(x, y, 4, o.a, .3); }); C.line(26, 33, 32, 30, mix(o.a, '#000000', .3)); C.line(38, 33, 32, 30, mix(o.a, '#000000', .3));
    const helm = M.U(M.poly([[23, 8], [41, 8], [43, 20], [38, 26], [26, 26], [21, 20]]), M.rect(30, 2, 34, 8)); C.vol(helm, mix(o.b, '#FFFFFF', .05));
    C.fill(M.rect(25, 15, 39, 16), '#050208'); C.fill(M.rect(31, 15, 32, 23), '#050208'); if (!o.dead) { C.line(26, 15, 38, 15, o.a); C.glow(32, 15, 8, o.a, .45); }
    if (o.t >= 2) C.vol(M.both(M.curve([22, 12], [12, 8], [10, -1], 2, .6)), mix(o.c || '#5A4A30', '#000000', .1)); },
  garg: (C, o) => { const r = o.r, wing = M.poly([[28, 26], [16, 8], [4, 4], [0, 16], [2, 30], [6, 26], [8, 34], [13, 29], [16, 38], [20, 32], [24, 40]]); C.vol(M.both(wing), mix(o.b, '#000000', .3), { lx: .3 });
    [[16, 8, 26, 28], [4, 4, 26, 30], [2, 30, 26, 32]].forEach(([a, b, c, d]) => { C.line(a, b, c, d, RAMP(o.b)[1]); C.line(63 - a, b, 63 - c, d, RAMP(o.b)[1]); });
    const body = M.U(M.ell(32, 40, 9, 13), M.both(M.cap(26, 50, 22, 60, 3, 2))); C.vol(body, o.b); const head = M.ell(32, 24, 8, 7); C.vol(head, mix(o.b, '#FFFFFF', .05));
    C.vol(M.both(M.poly([[25, 22], [21, 8], [29, 18]])), o.b); C.eye(28, 23, 1, o.a, { dead: o.dead }); C.eye(35, 23, 1, o.a, { dead: o.dead });
    C.fill(M.rect(29, 27, 35, 28), '#12040A'); fang(C, 30, 27, 3); fang(C, 34, 27, 3); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) C.line(32 + s * (20 + k), 60, 32 + s * (21 + k), 63, '#D8D0BC'); },
  vazio: (C, o) => { const r = o.r, blob = M.U(M.ell(32, 30, 24, 22), M.ell(18, 46, 12, 10), M.ell(46, 46, 12, 10)); for (let k = 0; k < 7; k++) { const x = 10 + k * 7.3; M.curve([x, 46], [x + (r() - .5) * 14, 54], [x + (r() - .5) * 10, 63], 3, .6).forEach(i => blob.add(i)); }
    C.vol(blob, o.b, { lx: .7, shine: false }); blob.forEach(i => { const x = i % W, y = (i / W) | 0; if (BAY[y & 3][x & 3] === 0 && C.at(x, y) !== RAMP(o.b)[0]) C.put(x, y, mix(o.b, o.a, .3)); });
    const n = 6 + o.t * 3, spots = []; for (let k = 0; k < 60 && spots.length < n; k++) { const x = 13 + Math.round(r() * 38), y = 12 + Math.round(r() * 34), s = spots.length === 0 ? 3 : r() < .3 ? 2 : 1;
      if (blob.has(id(x, y)) && blob.has(id(x - s - 2, y)) && blob.has(id(x + s + 2, y)) && spots.every(([a, b, z]) => Math.hypot(a - x, b - y) > z + s + 4)) spots.push([x, y, s]); }
    spots.forEach(([x, y, s]) => { const lid = M.ell(x + .5, y + .5, s + 2.2, s * .8 + 1); C.fill(lid, '#0A0410'); C.fill(M.ell(x + .5, y + .5, s + 1.5, s * .6 + .6), mix('#E8E2EE', o.a, .2)); if (o.dead) C.line(x - s - 1, y, x + s + 1, y, '#2A2A2E');
      else { C.fill(M.ell(x + .5, y + .5, Math.max(.8, s * .7), Math.max(.8, s * .6)), o.a); C.put(x, y, '#05020A'); if (s > 1) C.put(x, y - 1, '#05020A'); C.glow(x + .5, y + .5, s + 4, o.a, .35); } });
    C.glow(32, 30, 30, o.a, .14); },
  lobo: (C, o) => { const r = o.r, head = M.poly([[12, 18], [20, 12], [44, 12], [52, 18], [54, 32], [46, 44], [40, 56], [24, 56], [18, 44], [10, 32]]), ears = M.both(M.poly([[13, 20], [10, 0], [24, 13]]));
    C.vol(ears, mix(o.b, '#000000', .15)); C.fill(M.both(M.poly([[14, 16], [12, 5], [20, 13]])), '#3A1A1E'); C.vol(head, o.b);
    // pelo eriçado nos lados
    for (let y = 22; y < 46; y += 3) { C.line(10 - (y % 2), y, 6, y + 2, RAMP(o.b)[1]); C.line(53 + (y % 2), y, 57, y + 2, RAMP(o.b)[1]); }
    const muzzle = M.poly([[24, 34], [40, 34], [38, 50], [26, 50]]); C.vol(muzzle, mix(o.b, '#FFFFFF', .15)); C.fill(M.ell(32, 36, 3.5, 2.2), '#08040A');
    C.fill(M.poly([[25, 44], [39, 44], [36, 50], [28, 50]]), '#2A0206'); for (let x = 26; x <= 38; x += 3) fang(C, x, 44, x === 26 || x === 38 ? 4 : 2); fang(C, 29, 50, 2, '#E9E2CF', -1); fang(C, 35, 50, 2, '#E9E2CF', -1);
    C.eye(23, 26, 1, o.a, { dead: o.dead, slit: 1 }); C.eye(40, 26, 1, o.a, { dead: o.dead, slit: 1 }); C.line(19, 22, 26, 25, RAMP(o.b)[0]); C.line(44, 22, 37, 25, RAMP(o.b)[0]);
    if (o.t >= 1) C.line(42, 16, 48, 30, '#C9B8B8'); },
  oco: (C, o) => { const r = o.r, cape = M.poly([[16, 22], [48, 22], [56, 62], [8, 62]]); C.vol(cape, o.c || '#3A0E14', { lx: .7 }); for (let k = 0; k < 8; k++) { const x = 9 + Math.floor(r() * 46); for (let y = 54; y < 63; y++) if (r() < .5) C.px[id(x, y)] = null; }
    const body = M.poly([[18, 22], [46, 22], [44, 46], [20, 46]]), legs = M.both(M.rect(21, 46, 30, 62)), pauld = M.both(M.ell(17, 23, 7, 5)); C.vol(legs, mix(o.b, '#000000', .2)); C.vol(body, o.b); C.vol(pauld, mix(o.b, '#FFFFFF', .1));
    C.line(32, 24, 32, 44, RAMP(o.b)[1]); crack(C, r, body, 2 + o.t, '#0A0608');
    C.vol(M.rect(49, 4, 52, 46), '#9AA6B8'); C.vol(M.rect(45, 44, 56, 46), '#5A4A30'); C.vol(M.rect(49, 47, 52, 54), '#3A2A1A'); C.line(50, 6, 50, 42, '#E6EEFA');
    const helm = M.U(M.poly([[24, 4], [40, 4], [42, 18], [32, 22], [22, 18]])); C.vol(helm, mix(o.b, '#FFFFFF', .05)); C.fill(M.rect(25, 11, 39, 12), '#030104'); if (!o.dead) { C.line(26, 11, 30, 11, o.a); C.line(34, 11, 38, 11, o.a); C.glow(32, 11, 9, o.a, .4); }
    if (o.t >= 1) C.vol(M.both(M.curve([25, 6], [18, 2], [16, -4], 1.6, .5)), '#2A2420'); } };

/* ---------- o bestiário ---------- */
// [id, nome, atributo, corpo-base, cor do corpo, cor dos olhos/brilho, 2.ª cor, história]
const A = 'corpo mente intelecto fortuna relacoes espirito carreira disciplina'.split(' ');
const BOSSES = [
  ['golem', 'Golem da Preguiça', 'corpo', 'golem', '#4E4756', '#FF5A1F', '', 'Pesa toneladas e alimenta-se de sofá. Cada treino que falhas é mais uma pedra no corpo dele.'],
  ['hidra', 'Hidra da Distração', 'mente', 'hidra', '#2E5A4A', '#E8FF5A', '', 'Cada notificação faz-lhe nascer uma cabeça nova. Só o foco fundo lhe corta os pescoços.'],
  ['sombra', 'Sombra da Ignorância', 'intelecto', 'olho', '#3B2A4A', '#C6FF3A', '', 'Um olho que vê tudo o que não sabes. Cresce em cada página que não abres.'],
  ['dragao', 'Dragão do Desperdício', 'fortuna', 'dragao', '#5A1E24', '#FFB13B', '#B8925A', 'Dorme em cima do teu dinheiro mal gasto e cospe fogo em cada compra por impulso.'],
  ['espectro', 'Espectro do Isolamento', 'relacoes', 'espectro', '#26283A', '#7DF9FF', '', 'Afasta-te de quem gostas, um dia de cada vez, até ficares sozinho no escuro.'],
  ['vazio', 'O Vazio', 'espirito', 'vazio', '#140B22', '#B388FF', '', 'Enche-se quando deixas de alimentar a alma. Tem mil olhos e nenhum deles vê luz.'],
  ['tita', 'Titã da Estagnação', 'carreira', 'tita', '#3A4250', '#FF4D2E', '#5A4A30', 'Quer que fiques sempre no mesmo sítio. A armadura dele é feita dos teus "um dia".'],
  ['lorde', 'Lorde da Procrastinação', 'disciplina', 'demonio', '#3A1A2E', '#FF3B3B', '#2A1414', '"Amanhã." Sempre amanhã. Rei de todas as desculpas.']];
const MINIONS = [
  ['ghoul', 'Ghoul do Sofá', 'corpo', 'oco', '#5A5A48', '#C6FF3A', '#2A2A1E', 'Arrasta-se do sofá para a cama e de volta.'], ['lesma', 'Lodo da Inércia', 'corpo', 'lodo', '#4A5A2A', '#E8FF5A', '', 'Cola-te ao chão quando devias estar a correr.'],
  ['ogro', 'Verme do Açúcar', 'corpo', 'verme', '#7A4A5A', '#FF8AB0', '', 'Uma boca sem fundo que pede sempre mais um doce.'], ['gargula', 'Gárgula Atrofiada', 'corpo', 'garg', '#4A4A52', '#FF5A1F', '', 'Pedra parada. Músculos que esqueceram para que servem.'], ['lobo-c', 'Lobo do Cansaço', 'corpo', 'lobo', '#4A4038', '#FFB13B', '', 'Morde nas pernas ao fim do dia e diz-te para parar.'],
  ['morcego', 'Morcego da Insónia', 'mente', 'garg', '#2A2230', '#FF3B5C', '', 'Acorda-te às 3 da manhã com tudo o que não fizeste.'], ['enxame', 'Olho das Notificações', 'mente', 'olho', '#2A3A4A', '#5AE8FF', '', 'Cada vibração é um dos seus olhos a abrir-se.'],
  ['scroll', 'Verme do Scroll Infinito', 'mente', 'verme', '#2A3A5A', '#7DF9FF', '', 'Engole horas inteiras e nunca chega ao fim.'], ['aranha-a', 'Aranha da Ansiedade', 'mente', 'aranha', '#1E1A22', '#FF2D55', '#B33A50', 'Tece teias de "e se…" à volta da tua cabeça.'], ['ruido', 'Espírito do Ruído', 'mente', 'espectro', '#2E2A3A', '#E8FF5A', '', 'Fala alto dentro de ti para não ouvires o que importa.'],
  ['traca', 'Traça dos Livros Fechados', 'intelecto', 'garg', '#5A4A3A', '#C6FF3A', '', 'Come as páginas que nunca leste.'], ['lich-e', 'Lich do Esquecimento', 'intelecto', 'caveira', '#2A1F3A', '#4CFFB0', '#2A1F3A', 'Rouba o que estudaste e não reviste.'],
  ['verme-m', 'Lodo da Preguiça Mental', 'intelecto', 'lodo', '#3A2A5A', '#C6FF3A', '', 'Torna tudo difícil de pensar.'], ['esfinge', 'Olho da Dúvida Muda', 'intelecto', 'olho', '#4A3A2A', '#FFB13B', '', 'Faz perguntas e não te deixa responder.'], ['papel', 'Golem de Papel', 'intelecto', 'golem', '#6A6258', '#5AE8FF', '', 'Feito de fotocópias que nunca abriste.'],
  ['goblin', 'Demónio do Supérfluo', 'fortuna', 'demonio', '#3A4A1E', '#FFD23B', '#3A2A10', 'Ri-se cada vez que compras o que não precisas.'], ['mimico', 'Mímico do Impulso', 'fortuna', 'verme', '#5A3A1E', '#FFD23B', '', 'Parece uma promoção. É uma boca.'],
  ['sangue', 'Lodo das Subscrições', 'fortuna', 'lodo', '#5A1E2A', '#FF5A5A', '', 'Suga-te um pouco todos os meses sem fazer barulho.'], ['corvo', 'Gárgula das Dívidas', 'fortuna', 'garg', '#1E1E26', '#FFB13B', '', 'Pousa no teu ombro e não sai.'], ['slime-d', 'Aranha do Crédito', 'fortuna', 'aranha', '#2A1E14', '#FFD23B', '#8A6A2A', 'Prende-te com juros, fio a fio.'],
  ['lobo-s', 'Lobo Solitário', 'relacoes', 'lobo', '#3A3A44', '#9BE7FF', '', 'Convence-te de que não precisas de ninguém.'], ['banshee', 'Banshee do Silêncio', 'relacoes', 'espectro', '#3A2A3A', '#FF8AD8', '', 'Grita em silêncio as mensagens que não mandaste.'],
  ['distancia', 'Vazio da Distância', 'relacoes', 'vazio', '#1A1428', '#9BE7FF', '', 'Cresce entre ti e quem está longe.'], ['orgulho', 'Cavaleiro do Orgulho', 'relacoes', 'oco', '#4A4458', '#FF8AD8', '#2A1A3A', 'Nunca é o primeiro a pedir desculpa.'], ['rancor', 'Hidra do Rancor', 'relacoes', 'hidra', '#3A2A3A', '#FF5A5A', '', 'Cada mágoa guardada é uma cabeça nova.'],
  ['duvida', 'Demónio da Dúvida', 'espirito', 'demonio', '#2A1A3A', '#B388FF', '#1A1024', 'Sussurra que Deus se esqueceu de ti.'], ['serpente', 'Hidra da Tentação', 'espirito', 'hidra', '#2A3A1E', '#FFD23B', '', 'Uma serpente com muitas bocas e uma só mentira.'],
  ['abismo', 'Abismo Faminto', 'espirito', 'verme', '#1A1428', '#B388FF', '', 'Tudo o que lhe dás desaparece.'], ['oco-e', 'Cavaleiro Oco', 'espirito', 'oco', '#3A3E48', '#B388FF', '#1A1024', 'Uma armadura vazia que já foi fé.'], ['olho-v', 'Olho do Vazio', 'espirito', 'olho', '#1A1024', '#B388FF', '', 'Olha para dentro de ti e só vê o que falta.'],
  ['cav-est', 'Cavaleiro da Rotina Morta', 'carreira', 'oco', '#4A4A40', '#FF4D2E', '#3A2A10', 'Faz o mesmo todos os dias e chama-lhe estabilidade.'], ['golem-r', 'Golem do Comodismo', 'carreira', 'golem', '#5A5048', '#FFB13B', '', 'Confortável demais para se mexer.'],
  ['aranha-b', 'Aranha da Burocracia', 'carreira', 'aranha', '#2A2A2A', '#FF4D2E', '#6A6A6A', 'Prende os teus projetos em papelada.'], ['verme-c', 'Verme do "Está Bom Assim"', 'carreira', 'verme', '#4A4A3A', '#FFB13B', '', 'Come a ambição por dentro.'], ['tita-p', 'Titã de Pedra', 'carreira', 'tita', '#4A4A4E', '#FFB13B', '#3A3020', 'Bloqueia a porta da promoção.'],
  ['diabrete', 'Diabrete do Adiar', 'disciplina', 'demonio', '#4A1A1A', '#FF8A3B', '#2A1010', 'Pequeno, rápido, convincente: "só mais 5 minutos".'], ['hidra-a', 'Hidra do Amanhã', 'disciplina', 'hidra', '#4A2A2A', '#FF3B3B', '', 'Corta uma tarefa e nascem duas.'],
  ['snooze', 'Lodo do Snooze', 'disciplina', 'lodo', '#2A3A5A', '#FF3B3B', '', 'Prende-te na cama todas as manhãs.'], ['lich-d', 'Lich da Desculpa', 'disciplina', 'caveira', '#3A1A1A', '#FF3B3B', '#3A1A1A', 'Tem uma desculpa para cada dia do ano.'], ['morcego-a', 'Gárgula do Atraso', 'disciplina', 'garg', '#3A2A2A', '#FF8A3B', '', 'Chega sempre tarde e arrasta-te com ela.']];
const COLOSSI = [
  ['leviata', 'Leviatã do Abismo', 'verme', '#14324A', '#5AE8FF', '', 'Sobe das profundezas uma vez por mês para engolir quem parou de nadar.'], ['rei-cav', 'Rei Caveira', 'caveira', '#2A1F3A', '#4CFFB0', '#2A1F3A', 'Governa um exército de dias perdidos.'],
  ['kraken', 'Kraken das Profundezas', 'olho', '#2A1A3A', '#FF2D55', '', 'Cada tentáculo é um vício que ainda não largaste.'], ['wyrm', 'Wyrm Ancestral', 'dragao', '#1E3A2A', '#C6FF3A', '#7A8A4A', 'Mais velho do que as tuas desculpas.'],
  ['moscas', 'Senhor das Moscas', 'demonio', '#2A2A14', '#E8FF5A', '#1A1A0A', 'Onde ele passa, tudo apodrece.'], ['obsidiana', 'Colosso de Obsidiana', 'tita', '#1A1A24', '#B388FF', '#2A2030', 'Não sente dor. Não se cansa. Não para.'],
  ['devorador', 'Devorador de Mundos', 'vazio', '#0E0618', '#FF3B3B', '', 'Já engoliu sonhos maiores do que o teu.'], ['caido', 'Anjo Caído', 'oco', '#2A2A3A', '#F2C48D', '#1A0A10', 'Já foi o que tu queres ser. Desistiu.'],
  ['behemoth', 'Behemoth', 'golem', '#3A2A20', '#FF5A1F', '', 'A soma de todos os teus maus hábitos.'], ['rainha', 'Rainha Aranha', 'aranha', '#140E18', '#FF2D55', '#FF2D55', 'Mãe de todas as ansiedades.'],
  ['ceifador', 'O Ceifador', 'espectro', '#141418', '#E8E2EE', '', 'Lembra-te de que o tempo acaba.'], ['dominador', 'O Dominador Sombrio', 'demonio', '#0E0E18', '#38BDF8', '#14141E', 'A tua pior versão. O último chefe.']];
const ALL = {}; BOSSES.forEach(b => { ALL[b[0]] = { id: b[0], n: b[1], a: b[2], p: b[3], b: b[4], ac: b[5], c: b[6], lore: b[7], k: 'boss' }; });
MINIONS.forEach(b => { ALL[b[0]] = { id: b[0], n: b[1], a: b[2], p: b[3], b: b[4], ac: b[5], c: b[6], lore: b[7], k: 'min' }; });
COLOSSI.forEach(b => { ALL[b[0]] = { id: b[0], n: b[1], a: '', p: b[2], b: b[3], ac: b[4], c: b[5], lore: b[6], k: 'col' }; });

// ameaça: quanto mais vezes já o venceste, mais forte (e mais escuro) ele volta
const THREAT = ['', 'Antigo', 'Corrompido', 'Supremo'];
const paint = (m, o) => { const C = canvas(), r = rng(m.id + '|' + o.t), body = o.dead ? grey(m.b) : o.t ? mix(m.b, '#000000', .12 * o.t) : m.b, ac = o.dead ? '#3A3A40' : m.ac;
  P[m.p](C, { b: body, a: ac, c: m.c ? (o.dead ? grey(m.c) : m.c) : '', r, t: o.t, dead: o.dead, bone: o.dead ? '#8A8680' : undefined });
  // feridas: rachas escuras conforme a vida que já perdeu
  if (!o.dead && o.hurt > .2) { const all = new Set([...C.solid].filter(i => C.px[i])); crack(C, r, all, Math.round(o.hurt * 6), '#0A0306'); const L = [...all]; for (let k = 0; k < o.hurt * 10; k++) { const i = L[Math.floor(r() * L.length)], x = i % W, y = (i / W) | 0; for (let d = 0; d < 3; d++) if (C.px[id(x, y + d)]) C.px[id(x, y + d)] = mix(C.px[id(x, y + d)], '#7A0610', .6 - d * .15); } }
  return C.px; };
// aura e sombra (por trás), para os chefes
const aura = (px, c, k) => { const out = px.slice(), D = new Array(W * H).fill(99); const q = []; px.forEach((v, i) => { if (v) { D[i] = 0; q.push(i); } });
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (!ok(nx, ny)) return; const j = id(nx, ny); if (D[j] > D[i] + 1 && D[i] < 5) { D[j] = D[i] + 1; q.push(j); } }); }
  D.forEach((d, i) => { if (d > 0 && d <= 5 && !px[i]) { const x = i % W, y = (i / W) | 0, t = (6 - d) / 6 * k; if (BAY[y & 3][x & 3] / 16 < t * (d === 1 ? 1.4 : .75)) out[i] = mix('#03010A', c, d === 1 ? .55 * k : .14 + t * .32); } }); return out; };
const CACHE = {};
const blobUrl = du => { try { const b = atob(du.split(',')[1]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type: 'image/png' })); } catch (e) { return du; } };
// o: { t: ameaça 0–3, hurt: 0–1, dead, aura }
const url = (mid, o = {}) => { const m = ALL[mid] || ALL.golem, t = Math.max(0, Math.min(3, o.t | 0)), hurt = Math.round((o.hurt || 0) * 4) / 4, dead = !!o.dead, au = o.aura != null ? o.aura : m.k !== 'min';
  const key = [m.id, t, hurt, dead, au].join('|'); if (CACHE[key]) return CACHE[key];
  let px = paint(m, { t, hurt, dead }); if (au && !dead) px = aura(px, m.ac, .55 + t * .12);
  try { const c = document.createElement('canvas'), sc = 5; c.width = W * sc; c.height = H * sc; const x = c.getContext('2d');
    px.forEach((v, i) => { if (!v) return; x.fillStyle = v; x.fillRect((i % W) * sc, ((i / W) | 0) * sc, sc, sc); }); return (CACHE[key] = blobUrl(c.toDataURL('image/png'))); } catch (e) { return ''; } };
const img = (mid, o = {}, cls = '') => `<img class="mo-px ${cls}" src="${url(mid, o)}" alt="${(ALL[mid] || {}).n || ''}" draggable="false">`;
const name = (mid, t = 0) => { const m = ALL[mid]; return m ? (t ? m.n + ' ' + THREAT[Math.min(3, t)] : m.n) : ''; };
const ofA = a => MINIONS.filter(m => m[2] === a).map(m => m[0]);
OS.Monstros = { ALL, BOSSES: BOSSES.map(b => b[0]), MINIONS: MINIONS.map(m => m[0]), COLOSSI: COLOSSI.map(c => c[0]), THREAT, url, img, name, ofA, bossOf: a => (BOSSES.find(b => b[2] === a) || BOSSES[0])[0], pixels: (mid, o = {}) => paint(ALL[mid], { t: o.t | 0, hurt: o.hurt || 0, dead: !!o.dead }), A };
})();
