/* OCEANUM — Floresta: foco ao estilo do app Forest.
   Planta uma árvore e ela cresce enquanto te concentras; se saíres do Oceanum ou desistires, a árvore morre.
   Cada sessão fica na tua floresta (ilha 3D por dia, semana, mês, ano), dá moedas para desbloquear espécies
   (carvalho, pinheiro, cerejeira, ipê-amarelo, palmeira, sequoia…) e regista o tempo como sessão de estudo.
   Árvores procedimentais em 3D (three.js, em vendor/), sons ambiente gerados no próprio aparelho. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, C = OS.C, V = OS.views, A = OS.act, esc = U.esc, today = () => U.today();
OS.ONE_DEF.forest = { coins: 0, owned: ['carvalho', 'pinheiro', 'arbusto'], sp: 'carvalho', mins: 25, strict: '20', sound: '', tag: '', brk: 5 };
const cfg = () => OS.one('forest');
OS.S.trees = { label: 'Árvore', title: r => ((SP[r.sp] || {}).n || 'Árvore') + ' · ' + U.fmtD(r.date), fields: [
  { k: 'date', l: 'Data', t: 'date', req: 1 }, { k: 'mins', l: 'Minutos', t: 'num', req: 1 }, { k: 'sp', l: 'Espécie', t: 'sel', o: () => Object.entries(SP).map(([k, s]) => [k, s.n]) },
  { k: 'tag', l: 'Etiqueta', t: 'text' }, { k: 'alive', l: 'Viva', t: 'bool' }, { k: 'note', l: 'Nota', t: 'area', rows: 2 }], defaults: () => ({ date: today(), mins: 25, sp: 'carvalho', alive: true }) };

/* ================= espécies ================= */
const SP = {
  carvalho: { n: 'Carvalho', k: 'cl', d: 'Forte e frondoso — a árvore clássica.', e: '🌳' },
  pinheiro: { n: 'Pinheiro', k: 'cl', d: 'Sempre verde, cresce direito ao céu.', e: '🌲' },
  arbusto: { n: 'Arbusto', k: 'cl', d: 'Pequeno, redondo e florido.', e: '🌿' },
  betula: { n: 'Bétula', k: 'cl', d: 'Tronco branco e folhas claras e leves.', e: '🌳' },
  cipreste: { n: 'Cipreste', k: 'cl', d: 'Alto e esguio, como nos campos da Toscana.', e: '🌲' },
  acer: { n: 'Ácer de outono', k: 'cl', d: 'Folhas laranja e vermelhas do outono.', e: '🍁' },
  oliveira: { n: 'Oliveira', k: 'cl', d: 'Tronco retorcido e folhas prateadas — paz.', e: '🫒' },
  salgueiro: { n: 'Salgueiro-chorão', k: 'cl', d: 'Ramos compridos a cair como cortinas.', e: '🌿' },
  embondeiro: { n: 'Embondeiro', k: 'cl', d: 'O baobá africano, tronco gigante.', e: '🌳' },
  sequoia: { n: 'Sequoia', k: 'cl', d: 'A maior árvore do mundo. Paciência de séculos.', e: '🌲' },
  cerejeira: { n: 'Cerejeira (sakura)', k: 'fl', d: 'Flores cor-de-rosa do Japão.', e: '🌸' },
  ipe: { n: 'Ipê-amarelo', k: 'fl', d: 'O ipê do Brasil, coberto de flores amarelas.', e: '💛' },
  iperoxo: { n: 'Ipê-roxo', k: 'fl', d: 'Flores roxas que pintam as cidades brasileiras.', e: '💜' },
  glicinia: { n: 'Glicínia', k: 'fl', d: 'Cachos roxos pendurados como cascatas.', e: '🪻' },
  girassol: { n: 'Girassóis', k: 'fl', d: 'Sempre virados para a luz.', e: '🌻' },
  roseira: { n: 'Roseira', k: 'fl', d: 'Rosas vermelhas num arbusto verde.', e: '🌹' },
  lavanda: { n: 'Lavanda', k: 'fl', d: 'Espigas roxas e perfumadas.', e: '🪻' },
  laranjeira: { n: 'Laranjeira', k: 'tr', d: 'Copa redonda cheia de laranjas.', e: '🍊' },
  palmeira: { n: 'Coqueiro', k: 'tr', d: 'Praia, sol e cocos.', e: '🌴' },
  bananeira: { n: 'Bananeira', k: 'tr', d: 'Folhas enormes e um cacho de bananas.', e: '🍌' },
  jabuticabeira: { n: 'Jabuticabeira', k: 'tr', d: 'Os frutos nascem no tronco — Brasil puro.', e: '🫐' },
  cacto: { n: 'Cacto', k: 'tr', d: 'Resistente no deserto, com uma flor no topo.', e: '🌵' },
  bambu: { n: 'Bambu', k: 'tr', d: 'Flexível e forte. Cresce depressa.', e: '🎋' },
  natal: { n: 'Árvore de Natal', k: 'te', d: 'Bolas, luzes, estrela e presentes.', e: '🎄' },
  neve: { n: 'Pinheiro de inverno', k: 'te', d: 'Neve nos ramos e um boneco de neve.', e: '☃️' },
  halloween: { n: 'Árvore de Halloween', k: 'te', d: 'Ramos retorcidos, abóboras e lanternas.', e: '🎃' },
  bonsai: { n: 'Bonsai japonês', k: 'te', d: 'Pinheiro moldado com lanterna de pedra.', e: '🏯' },
  momiji: { n: 'Momiji (ácer japonês)', k: 'te', d: 'O vermelho intenso do outono japonês.', e: '🍁' },
  pascoa: { n: 'Árvore de Páscoa', k: 'te', d: 'Ovos coloridos pendurados nos ramos.', e: '🥚' },
  saojoao: { n: 'Árvore de São João', k: 'te', d: 'Bandeirinhas e fogueira — festa junina!', e: '🎉' },
  coracao: { n: 'Árvore do coração', k: 'te', d: 'Copa em forma de coração.', e: '❤️' },
  dinheiro: { n: 'Árvore do dinheiro', k: 'te', d: 'Moedas de ouro em vez de folhas.', e: '💰' },
  cristal: { n: 'Árvore de cristal', k: 'te', d: 'Mágica, com folhas de cristal.', e: '💎' },
  cogumelo: { n: 'Cogumelo gigante', k: 'te', d: 'Saído de um conto de fadas.', e: '🍄' }
};
const CATS = [['', 'Todas'], ['cl', 'Clássicas'], ['fl', 'Floridas'], ['tr', 'Tropicais & frutos'], ['te', 'Temas especiais']];
const SEASON = () => { const d = new Date(), m = d.getMonth() + 1, day = d.getDate(); return m === 10 ? ['halloween', 'Época de Halloween'] : m === 12 || (m === 1 && day <= 6) ? ['natal', 'Época de Natal'] : m <= 2 && !(m === 2 && day >= 10 && day <= 16) ? ['neve', 'Inverno'] : m === 2 ? ['coracao', 'Dia dos Namorados'] : m === 3 ? ['cerejeira', 'Época das cerejeiras'] : m === 4 ? ['pascoa', 'Páscoa'] : m === 6 ? ['saojoao', 'Festas de São João'] : m === 11 ? ['momiji', 'Outono japonês'] : m >= 7 && m <= 8 ? ['palmeira', 'Verão'] : ['ipe', 'Primavera']; };
const coinsFor = m => Math.round(m * 1.2);

/* ================= 3D: carregamento e construção ================= */
// No iPhone o 3D pode falhar por instantes (app em segundo plano, pouca memória, contexto perdido): não fica preso no erro,
// tenta outra vez sozinho e, enquanto não dá, mostra a árvore em 2D.
let T = null, loadP = null, FAIL = false, failAt = 0, failWhy = '', failN = 0;
const fail = (why, e) => { FAIL = true; failAt = Date.now(); failN++; failWhy = why + (e && (e.message || e.name) ? ' (' + String(e.message || e.name).slice(0, 80) + ')' : ''); console.warn('3D:', failWhy); };
const load3 = () => loadP || (loadP = import(new URL('vendor/three.module.min.js', document.baseURI).href).then(m => { T = m; }).catch(e => { loadP = null; fail('o motor 3D não carregou', e); }));
const retry3 = () => { FAIL = false; failWhy = ''; };
const rngOf = seed => { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));
const nz = (x, y, z) => Math.sin(x * 1.9 + y * 1.3) * Math.cos(z * 1.7 - x * .9) * .6 + Math.sin(y * 3.1 + z * 2.3) * .4;
const TMP = { c: null, t: null, a: null, b: null, n: null };
class Bld {
  constructor(rng, det = 1) { this.p = []; this.n = []; this.c = []; this.r = rng; this.det = det; this.pre = null; this.col = new T.Color(); this.tc = new T.Color(); this.va = new T.Vector3(); this.vb = new T.Vector3(); this.vn = new T.Vector3(); }
  add(geo, m, color, o = {}) { let g = geo; const sm = o.smooth !== false; if (sm && !g.attributes.normal) g.computeVertexNormals(); if (sm && g.index) g.computeVertexNormals();
    const gi = g.index ? g.toNonIndexed() : g, mm = this.pre ? this.pre.clone().multiply(m) : m; gi.applyMatrix4(mm); const a = gi.attributes.position.array, na = gi.attributes.normal && sm ? gi.attributes.normal.array : null;
    const base = this.col.set(color), tint = o.tint ? this.tc.set(o.tint) : null, vary = o.vary == null ? .12 : o.vary, ao = o.ao, cen = o.cen, top = o.top || 0;
    for (let i = 0; i < a.length; i += 9) { let fx = 0, fy = 1, fz = 0; if (!na) { this.va.set(a[i + 3] - a[i], a[i + 4] - a[i + 1], a[i + 5] - a[i + 2]); this.vb.set(a[i + 6] - a[i], a[i + 7] - a[i + 1], a[i + 8] - a[i + 2]); this.vn.crossVectors(this.va, this.vb).normalize(); fx = this.vn.x; fy = this.vn.y; fz = this.vn.z; }
      const fv = 1 + (this.r() - .5) * (o.faceVary || 0) * 2;
      for (let k = 0; k < 3; k++) { const j = i + k * 3, x = a[j], y = a[j + 1], z = a[j + 2], nx = na ? na[j] : fx, ny = na ? na[j + 1] : fy, nzv = na ? na[j + 2] : fz;
        let s = fv * (1 + vary * nz(x * (o.freq || 2.2), y * (o.freq || 2.2), z * (o.freq || 2.2)));
        if (ao) s *= ao[2] + (1 - ao[2]) * Math.max(0, Math.min(1, (y - ao[0]) / (ao[1] - ao[0] || 1)));
        if (cen) { const d = Math.hypot(x - cen[0], (y - cen[1]) * 1.2, z - cen[2]) / cen[3]; s *= .62 + .38 * Math.max(0, Math.min(1, d)); }
        if (top) s *= 1 + top * Math.max(0, ny);
        let r = base.r, gg = base.g, b = base.b; if (tint) { const t = Math.max(0, ny) * (o.tintAmt || .35); r += (tint.r - r) * t; gg += (tint.g - gg) * t; b += (tint.b - b) * t; }
        this.p.push(x, y, z); this.n.push(nx, ny, nzv); this.c.push(r * s, gg * s, b * s); } }
    if (gi !== geo) gi.dispose(); geo.dispose(); }
  limb(a, b, r0, r1, color, seg = 7) { const A3 = new T.Vector3(...a), B3 = new T.Vector3(...b), d = B3.clone().sub(A3), L = d.length(); if (L < 1e-4) return; const g = new T.CylinderGeometry(r1, r0, L, seg, 3); g.translate(0, L / 2, 0);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); this.add(g, new T.Matrix4().compose(A3, q, new T.Vector3(1, 1, 1)), color, { vary: .18, freq: 6, top: .08 }); }
  blob(r, x, y, z, color, o = {}) { const hi = (o.det == null ? this.det : o.det) >= 1, g = new T.SphereGeometry(r, hi ? 16 : 8, hi ? 12 : 6), p = g.attributes.position, sd = this.r() * 10, ro = o.rough == null ? .2 : o.rough;
    for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), n = 1 + ro * (Math.sin(X / r * 2.7 + sd) * Math.cos(Y / r * 3.1 + sd * 1.3) * Math.sin(Z / r * 2.3 + sd * .7) + .35 * Math.sin(X / r * 6.1 - sd) * Math.sin(Z / r * 5.3 + sd)); p.setXYZ(i, X * n, Y * n, Z * n); }
    g.computeVertexNormals(); this.add(g, M4(x, y, z, this.r() * 3, this.r() * 3, 0, o.sx || 1, o.sy || o.sx || 1, o.sz || o.sx || 1), color, { vary: o.vary == null ? .1 : o.vary, ao: o.ao, cen: o.cen, top: o.top == null ? .22 : o.top, tint: o.tint, tintAmt: o.tintAmt, freq: 3.5, smooth: true }); }
  geo() { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3)); return g; }
}
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const DEAD = { bark: '#6f6153', twig: '#857565' };
// copa folhosa genérica
function crown(b, cx, cy, cz, rx, ry, rz, n, cols, size, o = {}) { const r = b.r, ao = [cy - ry * 1.1, cy + ry, o.aoMin || .52];
  for (let i = 0; i < n; i++) { const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), k = Math.pow(r(), .35) * (o.inner || .78); let x = Math.sin(v) * Math.cos(u) * rx * k, y = Math.cos(v) * ry * k, z = Math.sin(v) * Math.sin(u) * rz * k; if (o.flatBottom && y < -ry * .45) y = -ry * .45 + r() * .1;
    b.blob(size * (.62 + r() * .55), cx + x, cy + y, cz + z, pick(r, cols), { ao, rough: o.rough, cen: [cx, cy, cz, Math.max(rx, ry, rz) * 1.05], tint: o.tint || '#e8f59a', tintAmt: o.tintAmt == null ? .28 : o.tintAmt }); } }
function flowersOn(b, cx, cy, cz, rx, ry, rz, n, cols, s = .06) { const r = b.r; for (let i = 0; i < n; i++) { const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1) * .8; b.blob(s * (.7 + r() * .6), cx + Math.sin(v) * Math.cos(u) * rx, cy + Math.cos(v) * ry * .9, cz + Math.sin(v) * Math.sin(u) * rz, pick(r, cols), { det: 0, rough: .1, vary: .1 }); } }
function fallen(b, n, R, cols) { const r = b.r; for (let i = 0; i < n; i++) { const a = r() * 6.283, d = .25 + r() * R; b.add(new T.BoxGeometry(.07, .015, .05), M4(Math.cos(a) * d, .01, Math.sin(a) * d, 0, r() * 3, 0), pick(r, cols), { vary: .15 }); } }
function sprout(b, g) { // g 0..0.2: semente → rebento → plantinha
  b.blob(.42, 0, -.05, 0, '#5b3a22', { sy: .32, rough: .25, vary: .12, top: .05 }); for (let i = 0; i < 5; i++) b.blob(.06, Math.cos(i * 1.3) * .32, .01, Math.sin(i * 1.3) * .32, '#6b4a2e', { det: 0, sy: .5, rough: .2 });
  if (g < .06) { const f = g / .06; b.blob(.13, 0, .1, 0, '#8a5a2b', { sx: .8, sy: 1.15, sz: .8, rough: .04, top: .3 }); b.add(new T.TorusGeometry(.11, .012, 4, 16, Math.PI), M4(0, .1, 0, 0, 0, Math.PI / 2), '#4a2f18', { vary: .05 });
    if (f > .45) { const h = .05 + (f - .45) * .35; b.limb([0, .18, 0], [.02, .18 + h, 0], .018, .014, '#7fbf4a', 5); b.blob(.035 + .03 * f, .03, .2 + h, 0, '#8fd468', { sx: 1, sy: .4, sz: .6, rough: .05 }); } return; }
  const f = (g - .06) / .14, h = .25 + f * .75, lf = .12 + f * .16; b.blob(.1, 0, .06, 0, '#8a5a2b', { sx: .9, sy: .6, sz: .9, rough: .1 });
  b.limb([0, .05, 0], [.03, h * .55, .01], .03 + .015 * f, .026, '#6c9a3a', 6); b.limb([.03, h * .55, .01], [0, h, 0], .026, .02, '#76a640', 6);
  b.blob(lf, -lf * .8, h * .62, 0, '#7cc95a', { sx: 1.1, sy: .28, sz: .6, rough: .08, top: .3 }); b.blob(lf, lf * .8, h * .6, 0, '#8fd468', { sx: 1.1, sy: .28, sz: .6, rough: .08, top: .3 });
  if (f > .35) { const l2 = lf * (f - .35) * 1.4; b.blob(l2, 0, h + l2 * .3, -l2 * .6, '#6dbb4c', { sx: .6, sy: .3, sz: 1.1, rough: .08, top: .3 }); b.blob(l2, 0, h + l2 * .3, l2 * .6, '#7cc95a', { sx: .6, sy: .3, sz: 1.1, rough: .08, top: .3 }); }
  if (f > .7) b.blob(.08 + .1 * (f - .7), .02, h + .12, 0, '#9be07a', { sy: .7, rough: .1, top: .4 }); }
function trunkBranches(b, H, tr, bark, nb, spread, lean, dead) { const r = b.r, top = [lean, H, lean * .3]; b.limb([0, 0, 0], top, tr, tr * .62, bark, 7);
  const tips = []; for (let i = 0; i < nb; i++) { const a = i / nb * 6.283 + r() * .8, h0 = H * (.55 + r() * .4), base = [lean * h0 / H, h0, lean * .3 * h0 / H], len = spread * (.6 + r() * .5), tip = [base[0] + Math.cos(a) * len, h0 + len * (dead ? .45 : .75) + r() * .3, base[2] + Math.sin(a) * len];
    b.limb(base, tip, tr * .42, tr * .16, bark, 5); tips.push(tip); if (dead && r() < .7) { const t2 = [tip[0] + Math.cos(a + 1) * .3, tip[1] + .25, tip[2] + Math.sin(a + 1) * .3]; b.limb(tip, t2, tr * .14, tr * .06, DEAD.twig, 4); } }
  return { top, tips }; }

// construtores por espécie: g = crescimento 0..1, dead = morta
const BUILD = {
  arbusto(b, g, dead) { const r = b.r, s = .45 + .55 * g; if (dead) { for (let i = 0; i < 5; i++) { const a = i * 1.3; b.limb([0, 0, 0], [Math.cos(a) * .4 * s, .55 * s, Math.sin(a) * .4 * s], .04, .015, DEAD.twig, 4); } return; }
    crown(b, 0, .45 * s, 0, .75 * s, .45 * s, .7 * s, 9, ['#4fa43c', '#62b84a', '#45963a', '#74c357'], .42 * s, { flatBottom: 1, inner: .9 }); if (g > .6) flowersOn(b, 0, .5 * s, 0, .7 * s, .45 * s, .65 * s, 10, ['#ffffff', '#ffd6e8', '#fff3a0'], .05); },
  carvalho(b, g, dead) { const H = 1.5 + 1.0 * g, tr = .14 + .14 * g, bark = dead ? DEAD.bark : '#6b4a32'; const t = trunkBranches(b, H, tr, bark, 5, .7 + .5 * g, (b.r() - .5) * .25, dead); if (dead) return;
    crown(b, t.top[0], H + .55 + .5 * g, t.top[2], 1.05 + .55 * g, .85 + .35 * g, 1.0 + .55 * g, Math.round(9 + 9 * g), ['#3f8f34', '#4ea33c', '#5cb444', '#47963a', '#6fbf4a'], .55 + .2 * g); },
  pinheiro(b, g, dead) { const r = b.r, H = 2.6 + 1.6 * g, tr = .11 + .1 * g; b.limb([0, 0, 0], [0, H, 0], tr, tr * .3, dead ? DEAD.bark : '#5d3f2a', 6);
    if (dead) { for (let i = 0; i < 6; i++) { const h = H * (.3 + i * .1), a = r() * 6.28; b.limb([0, h, 0], [Math.cos(a) * .55, h - .1, Math.sin(a) * .55], .03, .01, DEAD.twig, 4); } return; }
    const L = 5 + Math.round(g * 2); for (let i = 0; i < L; i++) { const f = i / L, R = (1.25 - f * .95) * (.75 + .25 * g), y = H * (.28 + f * .72), h = .95 * (1 - f * .4);
      const cg = new T.ConeGeometry(R, h, 9, 2), p = cg.attributes.position, sd = r() * 9; for (let k = 0; k < p.count; k++) { const X = p.getX(k), Y = p.getY(k), Z = p.getZ(k), n = 1 + .14 * Math.sin(X * 6 + sd) * Math.cos(Z * 6 + sd); p.setXYZ(k, X * n, Y, Z * n); }
      cg.computeVertexNormals(); b.add(cg, M4(0, y, 0, 0, r() * 3), pick(r, ['#2f7a3f', '#2b6f3a', '#378544', '#2e7540']), { vary: .12, ao: [y - h / 2, y + h / 2, .5], top: .25, tint: '#b9e07a', tintAmt: .25, freq: 4 }); } },
  cipreste(b, g, dead) { const H = 2.8 + 1.6 * g; b.limb([0, 0, 0], [0, H * .6, 0], .1 + .05 * g, .06, dead ? DEAD.bark : '#5a4030'); if (dead) { b.limb([0, H * .6, 0], [.1, H, 0], .05, .01, DEAD.twig); return; }
    for (let i = 0; i < 9 + g * 5; i++) { const f = i / (9 + g * 5), y = .5 + f * H, R = .55 * Math.sin(Math.PI * (.15 + f * .85)) * (.75 + .25 * g) + .08; b.blob(R, (b.r() - .5) * .12, y, (b.r() - .5) * .12, pick(b.r, ['#2f6a3a', '#377340', '#2c6236']), { sy: 1.3, ao: [0, H + .6, .5], rough: .22 }); } },
  betula(b, g, dead) { const r = b.r, H = 2.2 + 1.3 * g, tr = .09 + .07 * g; let y = 0; const lean = (r() - .5) * .2; while (y < H) { const h = .18 + r() * .25, y2 = Math.min(H, y + h); b.limb([lean * y / H, y, 0], [lean * y2 / H, y2, 0], tr * (1 - y / H * .4), tr * (1 - y2 / H * .4), dead ? DEAD.bark : (r() < .22 ? '#3b3632' : '#ece8de'), 7); y = y2; }
    if (dead) { trunkBranches(b, H, tr * .6, '#cfc8bb', 3, .5, lean, 1); return; } for (let i = 0; i < 4; i++) { const a = i * 1.6 + r(), h0 = H * (.55 + i * .1); b.limb([lean * h0 / H, h0, 0], [Math.cos(a) * .55, h0 + .5, Math.sin(a) * .55], tr * .35, tr * .12, '#e6e1d6', 5); }
    crown(b, lean, H + .2, 0, .75 + .3 * g, 1.0 + .4 * g, .75 + .3 * g, Math.round(12 + 10 * g), ['#8cc152', '#a2cf5c', '#7cb342', '#b5d86a'], .3 + .08 * g, { rough: .35 }); },
  acer(b, g, dead) { const H = 1.4 + .9 * g, tr = .12 + .12 * g; const t = trunkBranches(b, H, tr, dead ? DEAD.bark : '#5b3d2b', 5, .65 + .45 * g, (b.r() - .5) * .2, dead); if (dead) return;
    const cols = ['#d9541e', '#e8742a', '#c43b1f', '#f0a12c', '#b8321c']; crown(b, t.top[0], H + .6 + .4 * g, t.top[2], 1.0 + .45 * g, .9 + .35 * g, 1.0 + .45 * g, Math.round(9 + 9 * g), cols, .5 + .2 * g); if (g > .5) fallen(b, 18, 1.3, cols); },
  cerejeira(b, g, dead) { const H = 1.2 + .8 * g, tr = .12 + .1 * g; const t = trunkBranches(b, H, tr, dead ? DEAD.bark : '#4a3330', 6, .85 + .55 * g, (b.r() - .5) * .3, dead); if (dead) return;
    const cols = ['#f7b6cf', '#f4a3c0', '#fbc9db', '#ee93b5', '#fdd9e6']; crown(b, t.top[0], H + .5 + .3 * g, t.top[2], 1.2 + .6 * g, .7 + .3 * g, 1.15 + .6 * g, Math.round(10 + 10 * g), cols, .48 + .17 * g, { flatBottom: 1, aoMin: .7 }); if (g > .5) fallen(b, 26, 1.5, cols); },
  oliveira(b, g, dead) { const r = b.r, H = 1.1 + .7 * g, tr = .08 + .07 * g, bark = dead ? DEAD.bark : '#6e6152'; for (let k = 0; k < 3; k++) { const a = k * 2.1, p1 = [Math.cos(a) * .1, H * .45, Math.sin(a) * .1], p2 = [Math.cos(a + 1.5) * .18, H, Math.sin(a + 1.5) * .18]; b.limb([Math.cos(a) * .06, 0, Math.sin(a) * .06], p1, tr, tr * .8, bark); b.limb(p1, p2, tr * .8, tr * .5, bark); }
    const t = trunkBranches(b, H, tr * .6, bark, 4, .7 + .3 * g, 0, dead); if (dead) return; crown(b, 0, H + .55, 0, 1.05 + .35 * g, .6 + .2 * g, 1.0 + .35 * g, Math.round(12 + 8 * g), ['#7d8f5c', '#8e9d6c', '#6f8250', '#9aa77a'], .38 + .1 * g, { rough: .4, aoMin: .6 }); if (g > .7) flowersOn(b, 0, H + .55, 0, 1.0, .55, 1.0, 14, ['#3b3a2a', '#556b2f'], .045); },
  ipe(b, g, dead, cols) { const H = 1.6 + 1.0 * g, tr = .12 + .1 * g; const t = trunkBranches(b, H, tr, dead ? DEAD.bark : '#5e4636', 6, .9 + .5 * g, (b.r() - .5) * .25, dead); if (dead) return;
    cols = cols || ['#f6c90e', '#f9d423', '#f2b705', '#ffe066', '#e8a90c']; crown(b, t.top[0], H + .45 + .3 * g, t.top[2], 1.25 + .5 * g, .7 + .25 * g, 1.2 + .5 * g, Math.round(10 + 10 * g), cols, .45 + .17 * g, { flatBottom: 1, aoMin: .68, rough: .35 }); if (g > .5) fallen(b, 30, 1.6, cols); },
  iperoxo(b, g, dead) { BUILD.ipe(b, g, dead, ['#9b59b6', '#a569bd', '#8e44ad', '#c39bd3', '#b07cc6']); },
  laranjeira(b, g, dead) { const H = .9 + .6 * g, tr = .1 + .08 * g; const t = trunkBranches(b, H, tr, dead ? DEAD.bark : '#5f4532', 4, .5 + .3 * g, 0, dead); if (dead) return; const cy = H + .7 + .3 * g, R = .95 + .35 * g;
    crown(b, 0, cy, 0, R, R * .9, R, Math.round(10 + 8 * g), ['#2f7d32', '#3a8d3a', '#2b722e', '#46963f'], .5 + .15 * g, { inner: .7 }); if (g > .45) flowersOn(b, 0, cy, 0, R * 1.02, R * .92, R * 1.02, Math.round(12 * g), ['#f39c12', '#f5a623', '#e67e22'], .1); },
  palmeira(b, g, dead) { const r = b.r, H = 2.0 + 1.6 * g, seg = 9, bend = .5 + .4 * r(); let prev = [0, 0, 0];
    for (let i = 1; i <= seg; i++) { const f = i / seg, p = [Math.sin(f * 1.2) * bend * f, H * f, 0]; b.limb(prev, p, .13 - f * .05, .13 - f * .055, i % 2 ? (dead ? DEAD.bark : '#8b6b47') : (dead ? '#7a6a5a' : '#7a5c3b'), 7); prev = p; }
    if (dead) { for (let i = 0; i < 4; i++) { const a = i * 1.57; b.limb(prev, [prev[0] + Math.cos(a) * .6, prev[1] - .5, prev[2] + Math.sin(a) * .6], .03, .01, DEAD.twig, 4); } return; }
    const nf = 7 + Math.round(g * 3), Lf = 1.0 + 1.2 * g, K = 11; for (let i = 0; i < nf; i++) { const a = i / nf * 6.283 + r() * .3, lift = .35 + r() * .3, col = pick(r, ['#3d8b3d', '#4a9a40', '#368034', '#5aa848']); let pp = [prev[0], prev[1], prev[2]];
      for (let k = 1; k <= K; k++) { const f = k / K, d = f * Lf, x = prev[0] + Math.cos(a) * d, z = prev[2] + Math.sin(a) * d, y = prev[1] + lift * Math.sin(f * 2.2) - f * f * (.9 + .3 * g); b.limb(pp, [x, y, z], .025, .02, '#6f8f3a', 3);
        const len = .42 * Math.sin(Math.PI * Math.min(1, f * 1.1 + .05)) * (.7 + .3 * g) + .08; [-1, 1].forEach(sd => { const ang = a + sd * 1.15; b.add(new T.BoxGeometry(len, .015, .075), M4(x + Math.cos(ang) * len * .45, y - len * .18, z + Math.sin(ang) * len * .45, 0, -ang, -.35 * sd * 0 - .3), col, { vary: .12 }); }); pp = [x, y, z]; } }
    if (g > .55) for (let i = 0; i < 4; i++) b.blob(.09, prev[0] + Math.cos(i * 1.6) * .15, prev[1] - .12, prev[2] + Math.sin(i * 1.6) * .15, '#6b4a2a', { det: 0, rough: .05 }); },
  salgueiro(b, g, dead) { const r = b.r, H = 1.3 + .8 * g, tr = .14 + .1 * g; const t = trunkBranches(b, H, tr, dead ? DEAD.bark : '#5a4a36', 6, .8 + .4 * g, 0, dead); if (dead) return; const cy = H + .7, R = 1.0 + .5 * g;
    crown(b, 0, cy, 0, R, .55, R, 9 + Math.round(5 * g), ['#86a83c', '#94b84a', '#7a9c33'], .5, { flatBottom: 1 });
    const n = 26 + Math.round(20 * g); for (let i = 0; i < n; i++) { const a = r() * 6.283, d = R * (.55 + r() * .5), x = Math.cos(a) * d, z = Math.sin(a) * d, len = (.9 + r() * .8) * (.6 + .4 * g); b.add(new T.CylinderGeometry(.05, .02, len, 4), M4(x, cy - len / 2 + .1, z, (r() - .5) * .15, 0, (r() - .5) * .15), pick(r, ['#9bbd4c', '#a8c75a', '#8aae40', '#b3cf68']), { vary: .1, ao: [cy - len, cy, .6] }); } },
  embondeiro(b, g, dead) { const r = b.r, H = 1.5 + .9 * g, R0 = .32 + .3 * g, bark = dead ? DEAD.bark : '#8d7660'; const pts = [new T.Vector2(R0 * .95, 0), new T.Vector2(R0 * 1.05, H * .2), new T.Vector2(R0 * 1.1, H * .5), new T.Vector2(R0 * .9, H * .85), new T.Vector2(R0 * .6, H)];
    b.add(new T.LatheGeometry(pts, 10), M4(), bark, { vary: .08 }); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + r() * .5, base = [Math.cos(a) * R0 * .4, H, Math.sin(a) * R0 * .4], tip = [Math.cos(a) * (.7 + .3 * g), H + .45 + r() * .3, Math.sin(a) * (.7 + .3 * g)]; b.limb(base, tip, .08 + .04 * g, .03, bark, 5);
      if (!dead) b.blob(.28 + .12 * g, tip[0], tip[1] + .1, tip[2], pick(r, ['#5a8f3a', '#6aa045', '#4f8233']), { sy: .55 }); } },
  sequoia(b, g, dead) { const r = b.r, H = 3.4 + 2.0 * g, tr = .2 + .16 * g; b.limb([0, 0, 0], [0, H, 0], tr, tr * .25, dead ? DEAD.bark : '#8a4b2e', 8); if (dead) { for (let i = 0; i < 6; i++) { const h = H * (.35 + i * .1); b.limb([0, h, 0], [Math.cos(i * 2) * .5, h + .05, Math.sin(i * 2) * .5], .04, .01, DEAD.twig, 4); } return; }
    const L = 9 + Math.round(4 * g); for (let i = 0; i < L; i++) { const f = i / L, y = H * (.3 + f * .72), R = (.95 - f * .7) * (.7 + .3 * g); for (let k = 0; k < 4; k++) { const a = k * 1.57 + r() * .8; b.blob(R * .55, Math.cos(a) * R * .55, y, Math.sin(a) * R * .55, pick(r, ['#2f6b33', '#3a7a3b', '#2c6230']), { sy: .5, ao: [H * .25, H * 1.05, .5] }); } } }
};

/* ---- formas auxiliares ---- */
function ball(b, r, x, y, z, col, o = {}) { b.blob(r, x, y, z, col, Object.assign({ rough: .02, top: .25, vary: .04 }, o)); }
function star(b, x, y, z, R, col) { const sh = new T.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? R * .45 : R; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } sh.closePath(); const g = new T.ExtrudeGeometry(sh, { depth: R * .3, bevelEnabled: false }); g.translate(0, 0, -R * .15); b.add(g, M4(x, y, z), col, { vary: .04, top: .3, smooth: false }); }
function gift(b, x, z, s2, c1, c2) { const ry = b.r() * 3, m = M4(x, s2 * .4, z, 0, ry); b.add(new T.BoxGeometry(s2, s2 * .8, s2), m, c1, { vary: .04, smooth: false }); b.add(new T.BoxGeometry(s2 * 1.03, s2 * .82, s2 * .2), m, c2, { vary: .03, smooth: false }); b.add(new T.BoxGeometry(s2 * .2, s2 * .82, s2 * 1.03), m, c2, { vary: .03, smooth: false }); ball(b, s2 * .14, x - s2 * .1, s2 * .86, z, c2); ball(b, s2 * .14, x + s2 * .1, s2 * .86, z, c2); }
function pumpkin(b, x, z, s2) { const g = new T.SphereGeometry(s2, 18, 12), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), f = 1 + .09 * Math.cos(Math.atan2(Z, X) * 8); p.setXYZ(i, X * f, Y * .72, Z * f); } g.computeVertexNormals(); b.add(g, M4(x, s2 * .7, z, 0, b.r() * 3), '#ef7d1f', { vary: .05, top: .2, freq: 3 }); b.limb([x, s2 * 1.35, z], [x + .02, s2 * 1.6, z], s2 * .12, s2 * .08, '#4f6b2a', 5); }
function twisty(b, H, tr, bark, segs = 5, amp = .25) { let p = [0, 0, 0]; const pts = [p]; for (let i = 1; i <= segs; i++) { const f = i / segs, q = [Math.sin(f * 4.2 + b.r()) * amp * f, H * f, Math.cos(f * 3.1 + b.r()) * amp * f]; b.limb(p, q, tr * (1 - (i - 1) / segs * .55), tr * (1 - i / segs * .55), bark, 8); p = q; pts.push(q); } return pts; }
function flowerHead(b, c, R, petal, center, n = 14) { const nrm = new T.Vector3(0, .55, .84).normalize(), u = new T.Vector3(1, 0, 0), v = new T.Vector3().crossVectors(nrm, u).normalize(); const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), nrm);
  const disc = new T.CylinderGeometry(R * .42, R * .42, R * .14, 18); b.add(disc, new T.Matrix4().compose(new T.Vector3(...c), q, new T.Vector3(1, 1, 1)), center, { vary: .1, freq: 12 });
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, dir = u.clone().multiplyScalar(Math.cos(a)).add(v.clone().multiplyScalar(Math.sin(a))), pos = new T.Vector3(...c).addScaledVector(dir, R * .72); const g = new T.SphereGeometry(R * .3, 8, 6); g.scale(1, .18, .5); const qq = new T.Quaternion().setFromUnitVectors(new T.Vector3(1, 0, 0), dir); const q2 = q.clone(); q2.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -a)); b.add(g, new T.Matrix4().compose(pos, q2, new T.Vector3(1, 1, 1)), petal, { vary: .06, top: .2 }); } }
const XTRA = {
  natal(b, g, dead) { if (dead) return BUILD.pinheiro(b, g, true); const r = b.r, H = 2.4 + 1.4 * g; b.limb([0, 0, 0], [0, H * .3, 0], .14, .12, '#5d3f2a', 7); const L = 5;
    for (let i = 0; i < L; i++) { const f = i / L, R = (1.3 - f * 1.0) * (.75 + .25 * g), y = H * (.28 + f * .66), h = .9 * (1 - f * .35); const cg = new T.ConeGeometry(R, h, 14, 2); b.add(cg, M4(0, y, 0, 0, r()), '#2a7d41', { vary: .08, ao: [y - h / 2, y + h / 2, .55], top: .2, tint: '#9fd97a', tintAmt: .2 });
      const nb = Math.round(5 + R * 5); for (let k = 0; k < nb; k++) { const a = k / nb * 6.283 + i, rr = R * .86; ball(b, .07 + .03 * g, Math.cos(a) * rr, y - h * .38, Math.sin(a) * rr, pick(r, ['#d62828', '#f4c430', '#1d6fd8', '#e5e5e5', '#c1121f', '#f7b801'])); } }
    for (let k = 0; k < 46; k++) { const f = k / 46, y = H * (.28 + f * .7) - .3, R = (1.3 - f * 1.05) * (.75 + .25 * g) * .92, a = f * 6.283 * 4.5; ball(b, .03, Math.cos(a) * R, y, Math.sin(a) * R, pick(r, ['#fff3b0', '#ffe066', '#ffd166']), { top: .6 }); }
    star(b, 0, H * .98 + .25, 0, .22 + .06 * g, '#ffd23f'); gift(b, .75, .35, .3, '#c1121f', '#ffd166'); gift(b, -.6, .55, .26, '#1d6fd8', '#ffffff'); gift(b, .1, -.8, .32, '#2a9d8f', '#e63946'); },
  neve(b, g, dead) { if (dead) return BUILD.pinheiro(b, g, true); const r = b.r, H = 2.5 + 1.5 * g; b.limb([0, 0, 0], [0, H, 0], .13, .04, '#5d3f2a', 7);
    for (let i = 0; i < 6; i++) { const f = i / 6, R = (1.2 - f * .95) * (.75 + .25 * g), y = H * (.25 + f * .72), h = .85 * (1 - f * .35); b.add(new T.ConeGeometry(R, h, 12, 2), M4(0, y, 0, 0, r()), '#2f6e46', { vary: .08, ao: [y - h / 2, y + h / 2, .55] }); const sg = new T.ConeGeometry(R * .78, h * .5, 12, 1, true); b.add(sg, M4(0, y + h * .26, 0, 0, r()), '#f3f7ff', { vary: .03, top: .15 }); }
    const sx = .95, sz = .55; ball(b, .26, sx, .24, sz, '#f7fbff'); ball(b, .19, sx, .6, sz, '#f7fbff'); ball(b, .14, sx, .88, sz, '#f7fbff'); b.add(new T.ConeGeometry(.035, .16, 8), M4(sx, .88, sz + .17, Math.PI / 2), '#f28c28', { vary: .02 }); ball(b, .022, sx - .05, .93, sz + .12, '#222'); ball(b, .022, sx + .05, .93, sz + .12, '#222');
    b.add(new T.TorusGeometry(.14, .04, 6, 14), M4(sx, .76, sz, Math.PI / 2), '#d62828', { vary: .05 }); b.add(new T.CylinderGeometry(.11, .11, .14, 12), M4(sx, 1.06, sz), '#222', { vary: .02 }); b.add(new T.CylinderGeometry(.16, .16, .02, 14), M4(sx, .99, sz), '#222', { vary: .02 });
    for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = .4 + r() * 1.2; b.blob(.22 + r() * .15, Math.cos(a) * d, .01, Math.sin(a) * d, '#f3f7ff', { sy: .18, rough: .1, vary: .02 }); } },
  halloween(b, g, dead) { const r = b.r, H = 1.6 + 1.0 * g, bark = '#3a2f3f'; const pts = twisty(b, H, .16 + .08 * g, bark, 5, .3);
    for (let i = 0; i < 7; i++) { const base = pts[2 + (i % 3)], a = i / 7 * 6.283 + r(), L = .6 + .5 * g; let p = base; for (let k = 1; k <= 3; k++) { const q = [base[0] + Math.cos(a + k * .5) * L * k / 3, base[1] + .25 * k + (k === 3 ? -.15 : 0), base[2] + Math.sin(a + k * .5) * L * k / 3]; b.limb(p, q, .06 / k, .04 / k, bark, 5); p = q; }
      if (!dead) { b.limb(p, [p[0], p[1] - .3, p[2]], .006, .006, '#222', 3); ball(b, .07, p[0], p[1] - .36, p[2], '#ffb347', { top: .6 }); if (r() < .6) b.blob(.18, p[0], p[1] + .05, p[2], pick(r, ['#5b2a6e', '#3d1f4a', '#ff7b1a']), { sy: .6 }); } }
    pumpkin(b, .75, .4, .24); pumpkin(b, -.55, .65, .18); if (!dead) pumpkin(b, .15, -.85, .2); },
  bonsai(b, g, dead) { const r = b.r, H = 1.3 + .9 * g, bark = dead ? DEAD.bark : '#5e4a3a', pts = [[0, 0, 0], [.32, H * .3, .05], [-.24, H * .58, -.04], [.18, H * .82, .02], [0, H, 0]];
    for (let i = 1; i < pts.length; i++) b.limb(pts[i - 1], pts[i], .2 * (1 - (i - 1) * .2), .2 * (1 - i * .2), bark, 8);
    const pads = [[pts[1], 1, .9], [pts[2], -1, .8], [pts[3], 1, .65], [pts[4], 0, .7]]; pads.forEach(([p, sd, sc], i) => { const tip = sd ? [p[0] + sd * (.75 + .25 * g), p[1] + .1, p[2] + (r() - .5) * .3] : [p[0], p[1] + .15, p[2]]; if (sd) b.limb(p, tip, .08, .04, bark, 6); if (dead) return;
      for (let k = 0; k < 5; k++) b.blob((.28 + .1 * g) * sc, tip[0] + (r() - .5) * .5 * sc, tip[1] + .12 + r() * .05, tip[2] + (r() - .5) * .45 * sc, pick(r, ['#2f6b3a', '#3a7d44', '#2c6236']), { sy: .38, tint: '#a5d98a', tintAmt: .25 }); });
    const lx = -.95, lz = .45; b.add(new T.BoxGeometry(.3, .07, .3), M4(lx, .035, lz), '#9a958c', { smooth: false, vary: .05 }); b.add(new T.CylinderGeometry(.06, .07, .32, 8), M4(lx, .23, lz), '#9a958c', { vary: .05 }); b.add(new T.BoxGeometry(.24, .18, .24), M4(lx, .48, lz), '#b3ada2', { smooth: false, vary: .05 }); b.add(new T.BoxGeometry(.13, .1, .26), M4(lx, .48, lz), '#ffcf6e', { smooth: false, vary: .02 }); b.add(new T.ConeGeometry(.26, .16, 4), M4(lx, .65, lz, 0, Math.PI / 4), '#7d7870', { smooth: false, vary: .05 }); ball(b, .04, lx, .76, lz, '#7d7870');
    for (let i = 0; i < 5; i++) b.blob(.08 + r() * .06, .6 + r() * .6, .02, -.5 + r() * .5, '#9e9e9e', { det: 0, sy: .5, rough: .2 }); },
  momiji(b, g, dead) { const H = 1.3 + .8 * g, tr = .1 + .08 * g; const t = trunkBranches(b, H, tr, dead ? DEAD.bark : '#4a3330', 6, .85 + .45 * g, (b.r() - .5) * .3, dead); if (dead) return; const cols = ['#d7263d', '#c81d25', '#e63946', '#a4161a', '#f25c54'];
    crown(b, t.top[0], H + .45 + .3 * g, t.top[2], 1.2 + .5 * g, .75 + .25 * g, 1.15 + .5 * g, Math.round(14 + 12 * g), cols, .36 + .12 * g, { flatBottom: 1, tint: '#ffb4a2', aoMin: .62 }); if (g > .4) fallen(b, 30, 1.5, cols); },
  pascoa(b, g, dead) { const r = b.r, H = 1.3 + .8 * g, tr = .11 + .09 * g; const t = trunkBranches(b, H, tr, dead ? DEAD.bark : '#6b4a32', 5, .75 + .4 * g, 0, dead); if (dead) return; const cy = H + .55 + .35 * g, R = 1.05 + .45 * g;
    crown(b, t.top[0], cy, t.top[2], R, .7 + .3 * g, R, Math.round(10 + 8 * g), ['#7cc95a', '#8fd468', '#6dbb4c'], .5 + .15 * g, { flatBottom: 1 }); flowersOn(b, t.top[0], cy, t.top[2], R, .7, R, 16, ['#ffffff', '#ffd6e8']);
    const ec = ['#ffb3c6', '#bde0fe', '#caffbf', '#fdffb6', '#d4b8ff', '#ffd6a5']; for (let i = 0; i < 10 + Math.round(6 * g); i++) { const a = r() * 6.283, d = R * (.4 + r() * .55), x = t.top[0] + Math.cos(a) * d, z = t.top[2] + Math.sin(a) * d, y0 = cy - .45 - r() * .2, y = y0 - .25 - r() * .2; b.limb([x, y0, z], [x, y + .1, z], .007, .007, '#ffffff', 3); ball(b, .1, x, y, z, pick(r, ec), { sy: 1.3 }); }
    for (let i = 0; i < 5; i++) ball(b, .11, .5 + r() * .6, .1, -.4 + r() * .9, pick(r, ec), { sy: 1.25 }); },
  saojoao(b, g, dead) { const r = b.r, H = 1.4 + .9 * g, tr = .12 + .1 * g; const t = trunkBranches(b, H, tr, dead ? DEAD.bark : '#6b4a32', 5, .8 + .4 * g, 0, dead); const cy = H + .55 + .35 * g, R = 1.1 + .45 * g;
    if (!dead) crown(b, t.top[0], cy, t.top[2], R, .75 + .3 * g, R, Math.round(10 + 8 * g), ['#3f8f34', '#4ea33c', '#5cb444'], .5 + .17 * g);
    const fc = ['#e63946', '#ffd60a', '#06d6a0', '#118ab2', '#ff70a6', '#f77f00']; for (let k = 0; k < 3; k++) { const y0 = cy - .55 + k * .38, rr = R * (1.12 - k * .12); let prev = null; for (let i = 0; i <= 28; i++) { const a = i / 28 * 6.283, sag = Math.abs(Math.sin(a * 3)) * .1, p = [t.top[0] + Math.cos(a) * rr, y0 - sag, t.top[2] + Math.sin(a) * rr]; if (prev) b.limb(prev, p, .006, .006, '#f1e3c8', 3); prev = p;
      if (i < 28) { const fg = new T.ConeGeometry(.11, .2, 3); fg.scale(1, 1, .18); b.add(fg, M4(p[0], p[1] - .12, p[2], Math.PI, -a + Math.PI / 2, 0), fc[(i + k) % fc.length], { vary: .03, smooth: false }); } } }
    const fx = .95, fz = .5; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4; b.limb([fx + Math.cos(a) * .25, .03, fz + Math.sin(a) * .25], [fx, .32, fz], .05, .04, '#6b4423', 6); }
    b.add(new T.ConeGeometry(.17, .42, 10), M4(fx, .3, fz), '#ff7b00', { vary: .1, top: .4 }); b.add(new T.ConeGeometry(.1, .3, 8), M4(fx, .34, fz), '#ffd000', { vary: .05, top: .5 }); },
  coracao(b, g, dead) { const r = b.r, H = 1.4 + .8 * g; b.limb([0, 0, 0], [0, H, 0], .12 + .08 * g, .09, dead ? DEAD.bark : '#5b3d2b', 7); if (dead) return trunkBranches(b, H, .1, DEAD.bark, 4, .6, 0, 1); const S = .95 + .45 * g, cy = H + .8 * S, cols = ['#e63946', '#ff4d6d', '#c9184a', '#ff758f', '#ff8fa3'];
    let n = 0, tries = 0; const N = Math.round(26 + 22 * g); while (n < N && tries++ < 4000) { const x = (r() * 2 - 1) * 1.2, y = (r() * 2 - 1) * 1.2; if (Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y > 0) continue; b.blob(.2 * S + r() * .06, x * S, cy + y * S, (r() - .5) * .5 * S, pick(r, cols), { tint: '#ffd6de', tintAmt: .25, cen: [0, cy, 0, 1.3 * S] }); n++; }
    fallen(b, 18, 1.3, cols); },
  dinheiro(b, g, dead) { const r = b.r, H = 1.3 + .8 * g, tr = .11 + .09 * g; const t = trunkBranches(b, H, tr, dead ? DEAD.bark : '#5f4532', 5, .7 + .4 * g, 0, dead); if (dead) return; const cy = H + .55 + .35 * g, R = 1.0 + .45 * g;
    crown(b, t.top[0], cy, t.top[2], R * .85, .6 + .25 * g, R * .85, Math.round(7 + 5 * g), ['#3f8f34', '#4ea33c'], .45 + .12 * g);
    for (let i = 0; i < 46 + Math.round(40 * g); i++) { const u = r() * 6.283, v = Math.acos(2 * r() - 1), k = .8 + r() * .3; b.add(new T.CylinderGeometry(.11, .11, .022, 14), M4(t.top[0] + Math.sin(v) * Math.cos(u) * R * k, cy + Math.cos(v) * (.65 + .25 * g) * k, t.top[2] + Math.sin(v) * Math.sin(u) * R * k, r() * 3, r() * 3, r() * 3), pick(r, ['#f5c542', '#ffd966', '#e6b422']), { vary: .05, top: .4 }); }
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = .3 + r() * .5; b.add(new T.CylinderGeometry(.07, .07, .016, 12), M4(.6 + Math.cos(a) * d * .4, .01 + i * .016, .4 + Math.sin(a) * d * .1), '#f5c542', { vary: .05 }); } },
  cristal(b, g, dead) { const r = b.r, H = 1.4 + .9 * g; const t = trunkBranches(b, H, .1 + .08 * g, dead ? '#6d6880' : '#8e7cc3', 6, .8 + .4 * g, 0, dead); if (dead) return; const cy = H + .55 + .35 * g, R = 1.1 + .45 * g, cols = ['#7df9ff', '#b388ff', '#ff8ad8', '#a0f0ff', '#c7a6ff'];
    for (let i = 0; i < 26 + Math.round(22 * g); i++) { const u = r() * 6.283, v = Math.acos(2 * r() - 1), k = Math.pow(r(), .4); b.add(new T.OctahedronGeometry(.13 + r() * .12, 0), M4(t.top[0] + Math.sin(v) * Math.cos(u) * R * k, cy + Math.cos(v) * (.75 + .25 * g) * k, t.top[2] + Math.sin(v) * Math.sin(u) * R * k, r() * 3, r() * 3, 0, 1, 1.5, 1), pick(r, cols), { vary: .08, top: .5, smooth: false }); }
    for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = .7 + r() * .7; b.add(new T.OctahedronGeometry(.1, 0), M4(Math.cos(a) * d, .12, Math.sin(a) * d, 0, r() * 3, 0, 1, 2.2, 1), pick(r, cols), { smooth: false, vary: .05 }); } },
  cogumelo(b, g, dead) { const r = b.r, H = .9 + .9 * g, R = .75 + .55 * g; b.add(new T.LatheGeometry([new T.Vector2(.26, 0), new T.Vector2(.2, H * .4), new T.Vector2(.17, H * .8), new T.Vector2(.2, H)], 16), M4(), '#f1e7d6', { vary: .05 });
    const cap = new T.SphereGeometry(R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, .62, 1); b.add(cap, M4(0, H - .05, 0), dead ? '#8a6f5e' : '#e53935', { vary: .06, top: .2 }); b.add(new T.CircleGeometry(R * .98, 24), M4(0, H - .04, 0, Math.PI / 2), '#f3e3c3', { vary: .05 });
    if (!dead) for (let i = 0; i < 12; i++) { const u = r() * 6.283, v = r() * 1.2, x = Math.sin(v) * Math.cos(u) * R, y = Math.cos(v) * R * .62, z = Math.sin(v) * Math.sin(u) * R; ball(b, .07 + r() * .05, x, H - .05 + y, z, '#ffffff', { sy: .4 }); }
    [[.7, .5, .35], [-.6, .6, .28], [.3, -.75, .22]].forEach(([x, z, s2]) => { b.limb([x, 0, z], [x, s2 * 1.1, z], s2 * .2, s2 * .17, '#f1e7d6', 8); const c2 = new T.SphereGeometry(s2 * .7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); c2.scale(1, .6, 1); b.add(c2, M4(x, s2 * 1.05, z), '#e53935', { vary: .05 }); }); },
  glicinia(b, g, dead) { const r = b.r, H = 1.4 + .8 * g; const pts = twisty(b, H, .14 + .08 * g, dead ? DEAD.bark : '#6a5a4a', 4, .2); if (dead) return trunkBranches(b, H, .08, DEAD.bark, 4, .6, 0, 1); const top = pts[pts.length - 1], cy = top[1] + .45, R = 1.2 + .5 * g;
    crown(b, top[0], cy, top[2], R, .45, R, Math.round(9 + 6 * g), ['#7cb342', '#8bc34a', '#6fa83a'], .45, { flatBottom: 1 }); const cols = ['#9b72cf', '#b39ddb', '#7e57c2', '#c5b3e6'];
    for (let i = 0; i < 18 + Math.round(16 * g); i++) { const a = r() * 6.283, d = R * (.3 + r() * .7), x = top[0] + Math.cos(a) * d, z = top[2] + Math.sin(a) * d, len = (.45 + r() * .4) * (.6 + .4 * g); for (let k = 0; k < 5; k++) { const f = k / 5; b.blob(.11 * (1 - f * .7), x, cy - .25 - f * len, z, cols[Math.min(3, k)], { sy: 1.3, rough: .25, top: .15 }); } } },
  girassol(b, g, dead) { const r = b.r; [[0, 0, 1], [.45, .3, .8], [-.4, .25, .7]].forEach(([x, z, s2]) => { const H = (1.2 + 1.0 * g) * s2; b.limb([x, 0, z], [x + .05, H, z + .05], .045, .035, dead ? '#7a6a3a' : '#4e8a30', 6);
      for (let k = 0; k < 3; k++) { const y = H * (.3 + k * .2), sd = k % 2 ? 1 : -1; b.blob(.17 * s2, x + sd * .17, y, z, dead ? '#8a7a4a' : '#4f9a35', { sx: 1, sy: .2, sz: .55, rough: .1 }); }
      flowerHead(b, [x + .05, H + .05, z + .1], (.32 + .14 * g) * s2, dead ? '#a08a4a' : '#ffcc00', '#5d3a1a', 16); }); },
  roseira(b, g, dead) { const r = b.r, s2 = .55 + .45 * g; crown(b, 0, .5 * s2, 0, .8 * s2, .5 * s2, .75 * s2, 10, dead ? ['#6f6a4a'] : ['#2f6b2c', '#3a7d33', '#2a6428'], .38 * s2, { flatBottom: 1, inner: .9 }); if (dead) return;
    const rc = pick(r, [['#c1121f', '#e63946'], ['#ff8fab', '#ffb3c6'], ['#ffffff', '#f8edeb'], ['#c1121f', '#e63946']]); for (let i = 0; i < 9 + Math.round(5 * g); i++) { const u = r() * 6.283, v = r() * 1.3, x = Math.sin(v) * Math.cos(u) * .78 * s2, y = .5 * s2 + Math.cos(v) * .5 * s2, z = Math.sin(v) * Math.sin(u) * .73 * s2; ball(b, .085, x, y, z, rc[0], { rough: .25, top: .2 }); for (let k = 0; k < 3; k++) ball(b, .05, x + Math.cos(k * 2.1) * .05, y - .02, z + Math.sin(k * 2.1) * .05, rc[1], { rough: .2 }); } },
  lavanda(b, g, dead) { const r = b.r, s2 = .55 + .45 * g; crown(b, 0, .18, 0, .55 * s2, .2, .55 * s2, 7, ['#7f9a7a', '#8aa587'], .26 * s2, { flatBottom: 1 }); for (let i = 0; i < 26 + Math.round(16 * g); i++) { const a = r() * 6.283, d = r() * .45 * s2, x = Math.cos(a) * d, z = Math.sin(a) * d, tip = [x * 1.8, (.55 + r() * .35) * s2 + .2, z * 1.8];
      b.limb([x, .1, z], tip, .012, .01, '#6f8f5a', 3); if (!dead) b.blob(.05, tip[0], tip[1] + .07, tip[2], pick(r, ['#9b7fd4', '#7e5bc2', '#b39ddb']), { sx: .8, sy: 2.4, sz: .8, rough: .3 }); } },
  bananeira(b, g, dead) { const r = b.r, H = 1.3 + 1.0 * g; b.limb([0, 0, 0], [0, H, 0], .16, .12, '#7d8f3a', 9); if (dead) { for (let i = 0; i < 4; i++) b.limb([0, H, 0], [Math.cos(i * 1.6) * .6, H - .4, Math.sin(i * 1.6) * .6], .03, .01, '#8a7a4a', 4); return; }
    for (let i = 0; i < 6 + Math.round(2 * g); i++) { const a = i / 7 * 6.283 + r() * .4, L = (1.1 + .8 * g); let pp = [0, H, 0]; for (let k = 1; k <= 8; k++) { const f = k / 8, p = [Math.cos(a) * L * f, H + .55 * Math.sin(f * 2.2) - f * f * .6, Math.sin(a) * L * f]; const w = .52 * Math.sin(Math.PI * Math.min(1, f * 1.05 + .05)) + .08, mid = [(pp[0] + p[0]) / 2, (pp[1] + p[1]) / 2, (pp[2] + p[2]) / 2];
      b.add(new T.BoxGeometry(L / 8 * 1.15, .015, w), M4(mid[0], mid[1], mid[2], 0, -a, Math.atan2(p[1] - pp[1], L / 8)), pick(r, ['#5fae43', '#6cbd4b', '#55a03c']), { vary: .06, smooth: false }); pp = p; } }
    if (g > .5) { const bx = .25, by = H - .25; b.limb([0, H - .05, 0], [bx, by - .4, .05], .03, .025, '#6b7a33', 5); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, y = by - .1 - (i % 3) * .1; b.limb([bx + Math.cos(a) * .05, y, .05 + Math.sin(a) * .05], [bx + Math.cos(a) * .14, y + .12, .05 + Math.sin(a) * .14], .028, .02, '#d9c53a', 5); } b.add(new T.ConeGeometry(.07, .2, 10), M4(bx, by - .55, .05, Math.PI), '#6a1b4d', { vary: .05 }); } },
  jabuticabeira(b, g, dead) { const r = b.r, H = 1.1 + .7 * g, bark = dead ? DEAD.bark : '#9a8f84', tips = [];
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + r() * .5, p1 = [Math.cos(a) * .12, 0, Math.sin(a) * .12], p2 = [Math.cos(a) * (.45 + .2 * g), H, Math.sin(a) * (.45 + .2 * g)]; b.limb(p1, p2, .09 + .04 * g, .06, bark, 7); tips.push([p1, p2]); }
    if (!dead) { crown(b, 0, H + .55 + .2 * g, 0, 1.05 + .35 * g, .75 + .2 * g, 1.05 + .35 * g, Math.round(12 + 8 * g), ['#2f6b2c', '#3a7d33', '#2a6428'], .5 + .12 * g);
      if (g > .4) tips.forEach(([a, c]) => { for (let k = 0; k < 9; k++) { const f = .12 + r() * .8, a2 = r() * 6.283; ball(b, .045, a[0] + (c[0] - a[0]) * f + Math.cos(a2) * .08, a[1] + (c[1] - a[1]) * f, a[2] + (c[2] - a[2]) * f + Math.sin(a2) * .08, pick(r, ['#2b1638', '#3c1f4f', '#1f1028']), { top: .5 }); } }); } },
  cacto(b, g, dead) { const r = b.r, H = .9 + 1.0 * g, col = dead ? '#7a7a4a' : '#3f8f4a', rib = (rad, len) => { const c = new T.CapsuleGeometry(rad, len, 6, 14), p = c.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Z = p.getZ(i), f = 1 + .07 * Math.cos(Math.atan2(Z, X) * 12); p.setX(i, X * f); p.setZ(i, Z * f); } c.computeVertexNormals(); return c; };
    b.add(rib(.2, H), M4(0, H / 2 + .2, 0), col, { vary: .06, top: .15, freq: 4 }); if (g > .3) { [[1, .55], [-1, .8]].forEach(([sd, hf]) => { const y = H * hf * .8 + .2, L = .28 + .12 * g; b.add(rib(.12, L), M4(sd * (.2 + L / 2), y, 0, 0, 0, Math.PI / 2), col, { vary: .06 }); b.add(rib(.12, .3 + .25 * g), M4(sd * (.24 + L), y + .2 + .1 * g, 0), col, { vary: .06, top: .15 }); }); }
    if (!dead && g > .6) for (let i = 0; i < 5; i++) ball(b, .05, Math.cos(i * 1.25) * .07, H + .42, Math.sin(i * 1.25) * .07, '#ff5fa2', { sy: .6 });
    b.blob(.55, 0, -.02, 0, '#e2c58c', { sy: .06, rough: .1, vary: .05 }); for (let i = 0; i < 3; i++) b.blob(.06 + r() * .04, (r() - .5) * .8, .02, (r() - .5) * .8, '#b8a07a', { det: 0, sy: .6 }); },
  bambu(b, g, dead) { const r = b.r, n = 6 + Math.round(3 * g); for (let i = 0; i < n; i++) { const a = r() * 6.283, d = r() * .35, x = Math.cos(a) * d, z = Math.sin(a) * d, H = (1.8 + 1.6 * g) * (.7 + r() * .4), lean = [(r() - .5) * .25, (r() - .5) * .25], segs = 7;
    let p = [x, 0, z]; for (let k = 1; k <= segs; k++) { const f = k / segs, q = [x + lean[0] * f * H, H * f, z + lean[1] * f * H]; b.limb(p, q, .045, .04, dead ? '#a89a6a' : '#86b347', 8); b.add(new T.CylinderGeometry(.05, .05, .03, 8), M4(q[0], q[1], q[2]), dead ? '#8a7a4a' : '#5e8a2c', { vary: .03 });
      if (!dead && f > .45) for (let j = 0; j < 3; j++) { const aa = r() * 6.283; const lf = new T.SphereGeometry(.2, 6, 4); lf.scale(1, .08, .22); b.add(lf, M4(q[0] + Math.cos(aa) * .17, q[1] - .03, q[2] + Math.sin(aa) * .17, 0, -aa, -.4), pick(r, ['#6fb342', '#7cc04d', '#5ea338']), { vary: .05 }); } p = q; } } }
};
Object.assign(BUILD, XTRA);
const SPARAM = { girassol: .75, roseira: .7, lavanda: .7, cacto: .85, cogumelo: .9, arbusto: .6, carvalho: 1, pinheiro: 1, cipreste: 1, betula: 1, acer: 1, cerejeira: 1, oliveira: 1, ipe: 1, iperoxo: 1, laranjeira: 1, palmeira: 1, salgueiro: 1, embondeiro: 1, sequoia: 1 };
function tree(b, sp, g, dead) { const fn = BUILD[sp] || BUILD.carvalho; if (dead || g >= 1) return fn(b, dead ? Math.max(.3, g) : 1, !!dead); if (g < .2) { const o0 = b.pre; b.pre = (o0 ? o0.clone() : new T.Matrix4()).multiply(M4(0, 0, 0, 0, 0, 0, 2.3)); sprout(b, g); b.pre = o0; return; }
  const gg = (g - .2) / .8, sc = .3 + .7 * Math.pow(gg, .85), old = b.pre; b.pre = (old ? old.clone() : new T.Matrix4()).multiply(M4(0, 0, 0, 0, 0, 0, sc)); fn(b, gg, false); b.pre = old; }

// chão: ilha redonda (plantar) e talhão quadrado (floresta)
const SCN = {
  verde: { n: 'Prado verde', c: 0, g: '#6cbd46', s: '#5aa83e', t1: '#6dbd48', t2: '#66b543', tuft: ['#5da63c', '#4f9632', '#6cb34a'], fl: ['#ffffff', '#ffd54f', '#f48fb1', '#ce93d8', '#ff8a65'], d: 'O clássico.' },
  outono: { n: 'Outono dourado', c: 150, g: '#c9a24a', s: '#a9822f', t1: '#c99f45', t2: '#bf943d', tuft: ['#b07a2a', '#c48a30', '#9a6a24'], fl: ['#e2582c', '#f2a13a', '#c43b1f'], extra: ['#d9541e', '#f0a12c', '#b8321c'], d: 'Folhas laranja pelo chão.' },
  sakura: { n: 'Jardim sakura', c: 250, g: '#8fcf72', s: '#76b85c', t1: '#92d275', t2: '#88c86c', tuft: ['#7cc05e', '#6fb352'], fl: ['#ffd1e1', '#ffb7cf', '#ffffff'], extra: ['#ffc2d6', '#ffd6e4', '#f7a8c4'], d: 'Pétalas cor-de-rosa por todo o lado.' },
  praia: { n: 'Ilha de praia', c: 350, g: '#ecd9a0', s: '#d9c184', t1: '#eedba2', t2: '#e6d196', tuft: ['#9bc46a', '#86b35a'], fl: ['#ffffff', '#ffb4a2', '#f4d35e'], extra: ['#ffffff', '#f6e7c8', '#ffcfb3'], d: 'Areia, conchas e sol.' },
  neve: { n: 'Inverno nevado', c: 450, g: '#eef4fb', s: '#d6e2ef', t1: '#f2f7fc', t2: '#e7eff8', tuft: ['#cfe0ee', '#b9cfe2'], fl: ['#ffffff', '#d8ecff'], extra: ['#ffffff', '#e9f3ff'], d: 'Tudo coberto de neve.' },
  magica: { n: 'Floresta mágica', c: 700, g: '#5fd1a8', s: '#43b48d', t1: '#62d4ab', t2: '#57c79f', tuft: ['#4fc4a0', '#7ae0c0'], fl: ['#b388ff', '#7df9ff', '#ff8ad8'], extra: ['#c7a6ff', '#a0f0ff', '#ffb3ea'], d: 'Relva turquesa e flores a brilhar.' }
};
const SC = () => SCN[cfg().scene] || SCN.verde;
function decor(b, x, z, s = 1) { const P = SC(); const r = b.r, k = r(); if (k < .35) { for (let i = 0; i < 4; i++) b.add(new T.ConeGeometry(.035 * s, (.12 + r() * .12) * s, 4), M4(x + (r() - .5) * .25 * s, .05 * s, z + (r() - .5) * .25 * s, (r() - .5) * .4, 0, (r() - .5) * .4), pick(r, P.tuft), { vary: .1 }); }
  else if (P.extra && k < .45) { for (let i = 0; i < 4; i++) b.add(new T.BoxGeometry(.07 * s, .012, .05 * s), M4(x + (r() - .5) * .4 * s, .01, z + (r() - .5) * .4 * s, 0, r() * 3, 0), pick(r, P.extra), { vary: .1, smooth: false }); }
  else if (k < .55) { const c = pick(r, P.fl); for (let i = 0; i < 3; i++) { const fx = x + (r() - .5) * .3 * s, fz = z + (r() - .5) * .3 * s; b.limb([fx, 0, fz], [fx, .12 * s, fz], .008, .008, '#4e8a30', 3); b.blob(.035 * s, fx, .13 * s, fz, c, { det: 0, rough: .1 }); } }
  else if (k < .68) b.blob((.07 + r() * .08) * s, x, .03 * s, z, pick(r, ['#9e9e9e', '#8d8d8d', '#a8a29e']), { det: 0, sy: .6, rough: .2 }); }
function island(b, R) { const r = b.r, P = SC(); b.add(new T.RingGeometry(0, R, 48, 10), M4(0, 0, 0, -Math.PI / 2), P.g, { vary: .16, freq: 1.6, smooth: true }); b.add(new T.CylinderGeometry(R, R * .985, .3, 48, 1, true), M4(0, -.15, 0), P.s, { vary: .1 }); b.add(new T.CylinderGeometry(R * .985, R * .78, .6, 40, 2), M4(0, -.6, 0), '#8a5a36', { vary: .14, freq: 5 });
  b.add(new T.CylinderGeometry(R * .78, R * .45, .5, 32, 2), M4(0, -1.15, 0), '#6d452a', { vary: .14, freq: 5 }); b.add(new T.ConeGeometry(R * .45, .7, 24, 2), M4(0, -1.75, 0, Math.PI), '#57361f', { vary: .14, freq: 5 });
  for (let i = 0; i < 4; i++) { const a = r() * 6.28; b.blob(.13 + r() * .1, Math.cos(a) * R * .97, -.5 - r() * .35, Math.sin(a) * R * .97, '#8a8178', { det: 0, rough: .2 }); }
  for (let i = 0; i < 22; i++) { const a = r() * 6.283, d = .75 + r() * (R - .9); decor(b, Math.cos(a) * d, Math.sin(a) * d, 1.2); } }
function plot(b, N) { const off = -(N - 1) / 2, P = SC(); for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) b.add(new T.BoxGeometry(.98, .26, .98, 2, 1, 2), M4(off + x, -.13, off + z), (x + z) % 2 ? P.t1 : P.t2, { vary: .1, freq: 1.4 });
  b.add(new T.BoxGeometry(N - .02, .55, N - .02), M4(0, -.52, 0), '#8a5a36', { vary: .12, freq: 4 }); b.add(new T.BoxGeometry(N * .97, .45, N * .97), M4(0, -1.02, 0), '#6d452a', { vary: .12, freq: 4 }); b.add(new T.BoxGeometry(N * .9, .35, N * .9), M4(0, -1.4, 0), '#57361f', { vary: .12, freq: 4 }); }

/* ================= cena (um renderer reaproveitado entre páginas) ================= */
const G = { r: null, scene: null, cam: null, world: null, key: '', mode: '', raf: 0, last: 0, drag: null, zoom: 1, dirty: true, ro: null, host: null, objs: [] };
const SKY = () => { const h = new Date().getHours(); return h < 6 || h >= 21 ? 'night' : h < 9 ? 'dawn' : h < 17 ? 'day' : 'dusk'; };
const LIGHT = { day: ['#fff3dc', 2.3, '#d6ecff', '#7a9a5a', 1.25], dawn: ['#ffd2a8', 2.0, '#ffe2cf', '#7a8a5a', 1.15], dusk: ['#ffbf8a', 1.9, '#f9cdb3', '#6d7a50', 1.1], night: ['#d4ddff', 1.7, '#a3b3ec', '#4a5c48', 1.3] };
const MOB = matchMedia('(pointer:coarse)').matches;
function ensure() { if (G.r) return true; if (FAIL || document.hidden) return false; let r = null, err = null;
  for (const o of [{ antialias: true, alpha: true, powerPreference: 'low-power' }, { antialias: false, alpha: true }, { antialias: false, alpha: true, precision: 'mediump', powerPreference: 'default' }]) { try { r = new T.WebGLRenderer(o); break; } catch (e) { err = e; } }
  if (!r) { fail('o aparelho não abriu o 3D', err); return false; }
  try { r.setPixelRatio(Math.min(MOB ? 1.75 : 2, window.devicePixelRatio || 1)); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = SKY() === 'night' ? 1.25 : 1.05; r.domElement.className = 'fo-cv';
    r.domElement.addEventListener('webglcontextlost', ev => { ev.preventDefault(); lost(); }, false);
    G.r = r; failN = 0; bindDrag(r.domElement); return true; } catch (e) { try { r.dispose(); } catch (er) { } fail('o 3D falhou ao arrancar', e); return false; } }
// o iPhone apaga o 3D quando a app vai para segundo plano: refaz-se ao voltar
function lost() { const r = G.r; G.r = null; G.key = ''; try { clear(); } catch (e) { } if (G.raf) cancelAnimationFrame(G.raf); G.raf = 0; try { r && r.domElement.remove(); r && r.dispose(); } catch (e) { } setTimeout(() => { if (!document.hidden) mount(); }, 400); }
function clear() { if (G.scene) G.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => m.dispose()); }); G.scene = null; }
function baseScene(span) { const s = new T.Scene(), L = LIGHT[SKY()], hemi = new T.HemisphereLight(L[2], L[3], L[4]), sun = new T.DirectionalLight(L[0], L[1]); s.add(hemi); sun.position.set(span * .9, span * 1.6, span * .7); sun.castShadow = true; sun.shadow.mapSize.set(MOB ? 1024 : 2048, MOB ? 1024 : 2048);
  const c = sun.shadow.camera; c.left = c.bottom = -span * 1.2; c.right = c.top = span * 1.2; c.near = .1; c.far = span * 6; sun.shadow.bias = -.0006; sun.shadow.normalBias = .02; s.add(sun); s.add(sun.target); const w = new T.Group(); s.add(w); G.scene = s; G.world = w; return w; }
const MAT = () => new T.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0 });
function mesh(geo, cast = true, recv = true) { const m = new T.Mesh(geo, MAT()); m.castShadow = cast; m.receiveShadow = recv; return m; }
function buildPot(sp, g, dead, seed) { clear(); const w = baseScene(4); const b = new Bld(rngOf(seed || 7), 1); island(b, 2.4); w.add(mesh(b.geo(), true, true)); const t = new Bld(rngOf(seed || 11), 1); tree(t, sp, g, dead); const tm = mesh(t.geo(), true, true); w.add(tm);
  const fh = fitH(sp), top = Math.max(.5, fh.h), bot = -2.1, rh = Math.max(2.45, fh.w), cy = (top + bot) / 2, rad = Math.hypot((top - bot) / 2, rh) * .94;
  const cam = new T.PerspectiveCamera(30, 1, .1, 200); G.cam = cam; G.base = { cy, rad, ring: true }; G.zoom = 1; }
const FITH = {}; const fitH = sp => FITH[sp] || (FITH[sp] = (() => { const b = new Bld(rngOf(3), 0); tree(b, sp, 1, false); const g = b.geo(); g.computeBoundingBox(); const bb = g.boundingBox; g.dispose(); return { h: bb.max.y, w: Math.max(Math.abs(bb.min.x), bb.max.x, Math.abs(bb.min.z), bb.max.z) }; })());
function buildForest(list, key) { clear(); const n = list.length, N = Math.max(4, Math.ceil(Math.sqrt(n * 1.35))), w = baseScene(N * .75 + 1.5), seed = U.hash(key), r = rngOf(seed);
  const g = new Bld(rngOf(seed + 3), 0); plot(g, N); const tiles = []; for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) tiles.push([x, z]); for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
  const off = -(N - 1) / 2; tiles.slice(n).forEach(([x, z]) => { if (r() < .55) decor(g, off + x, off + z, .9); }); w.add(mesh(g.geo(), false, true));
  const tb = new Bld(rngOf(seed + 5), 0); list.forEach((t, i) => { const [x, z] = tiles[i], s = .34 * (SPARAM[t.sp] || 1) * (.9 + (U.hash(t.id || String(i)) % 100) / 500); tb.r = rngOf(U.hash(t.id || String(i))); tb.pre = M4(off + x + (tb.r() - .5) * .2, 0, off + z + (tb.r() - .5) * .2, 0, tb.r() * 6.28, t.alive === false ? (tb.r() - .5) * .3 : 0, s); tree(tb, t.sp, 1, t.alive === false); });
  if (n) w.add(mesh(tb.geo(), true, true)); const cam = new T.OrthographicCamera(-1, 1, 1, -1, -100, 200); cam.position.set(N * 1.6, N * 1.45, N * 1.6); cam.lookAt(0, .2, 0); G.cam = cam; G.base = { span: N * .58 + .75 }; G.zoom = 1; G.world.rotation.y = 0; }
function size() { const h = G.host; if (!h || !G.r || !G.cam) return; const W = h.clientWidth || 300, H = h.clientHeight || 300; G.r.setSize(W, H, false); G.r.domElement.style.width = '100%'; G.r.domElement.style.height = '100%';
  if (G.cam.isPerspectiveCamera) { G.cam.aspect = W / H; const vf = G.cam.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * W / H), fmin = Math.min(vf, hf), d = G.base.rad / (.78 * Math.tan(fmin)) / G.zoom, el = 14 * Math.PI / 180;
    G.cam.position.set(0, G.base.cy + Math.sin(el) * d, Math.cos(el) * d); G.cam.lookAt(0, G.base.cy, 0); }
  else { const s = G.base.span / G.zoom, a = W / H; G.cam.left = -s * a; G.cam.right = s * a; G.cam.top = s * .9; G.cam.bottom = -s * 1.1; } G.cam.updateProjectionMatrix(); G.dirty = true; }
function frame(t) { G.raf = 0; if (!G.host || !G.host.isConnected || document.hidden) return; if (!G.scene || !G.cam) { G.raf = requestAnimationFrame(frame); return; } const dt = Math.min(.05, (t - (G.last || t)) / 1000); G.last = t;
  if (G.mode === 'pot' && !G.drag) { G.world.rotation.y += dt * .22; G.dirty = true; } if (G.dirty) { G.r.render(G.scene, G.cam); G.dirty = false; } G.raf = requestAnimationFrame(frame); }
function bindDrag(el) { let px = 0, pts = new Map(), pd = 0; el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { pts.set(e.pointerId, e); px = e.clientX; G.drag = true; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b2] = [...pts.values()], d = Math.hypot(a.clientX - b2.clientX, a.clientY - b2.clientY); if (pd) { G.zoom = Math.max(.6, Math.min(3, G.zoom * d / pd)); size(); } pd = d; return; } if (G.world) { G.world.rotation.y += (e.clientX - px) * .01; px = e.clientX; G.dirty = true; } });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pd = 0; if (!pts.size) G.drag = false; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { e.preventDefault(); G.zoom = Math.max(.6, Math.min(3, G.zoom * (e.deltaY < 0 ? 1.1 : .9))); size(); }, { passive: false }); }
function mount() { const h = document.getElementById('fo3d'); if (!h) { G.host = null; return; } if (FAIL && failN < 4 && Date.now() - failAt > 6000 && !document.hidden) retry3();
  if (!T && !FAIL) { load3().then(() => FAIL ? mount() : OS.request()); return; } if (!FAIL && document.hidden && !G.r) return; if (FAIL || !ensure()) { flat(h); return; }
  h.classList.remove('fo-nogl');
  G.host = h; const key = h.dataset.k; if (key !== G.key) { G.key = key; const mode = h.dataset.mode, list = FLIST || []; clearTimeout(G.bt); G.bt = setTimeout(() => { if (G.key !== key || !G.host) return; G.mode = mode; try { mode === 'pot' ? potFromKey(key) : buildForest(list, key); } catch (e) { console.error(e); } mount(); }, G.scene ? 0 : 30); if (!G.scene) return; }
  if (G.r.domElement.parentNode !== h) h.appendChild(G.r.domElement);
  if (G.ro) G.ro.disconnect(); G.ro = new ResizeObserver(size); G.ro.observe(h); size(); if (!G.raf) G.raf = requestAnimationFrame(frame); }
const potFromKey = k => { const [, sp, st, dead, seed] = k.split('|'); buildPot(sp, +st, dead === '1', +seed); };
OS.on('render', () => queueMicrotask(mount));
const obsView = () => { const v = document.getElementById('view'); if (v && !v._foObs) { v._foObs = new MutationObserver(() => queueMicrotask(mount)); v._foObs.observe(v, { childList: true }); } };
obsView(); OS.on('ready', obsView); addEventListener('hashchange', () => setTimeout(mount, 0));
document.addEventListener('visibilitychange', () => { if (document.hidden) return; if (!G.r || FAIL) { setTimeout(mount, 300); return; } if (G.host && !G.raf) { G.dirty = true; G.raf = requestAnimationFrame(frame); } });
let FLIST = null;

/* miniaturas das espécies (renderizadas uma vez) */
const THUMB = {}; let TR = null, TQ = [], tbusy = false;
function thumbOne(k) { const s = new T.Scene(); s.add(new T.HemisphereLight('#e6f2ff', '#5a7a44', 1.25)); const d = new T.DirectionalLight('#fff4e0', 2.1); d.position.set(3, 6, 4); s.add(d); const b = new Bld(rngOf(42), 1); tree(b, k, 1, false); const m = new T.Mesh(b.geo(), MAT()); s.add(m);
  const bs = new T.Box3().setFromObject(m).getBoundingSphere(new T.Sphere()), c = bs.center, dd = bs.radius / Math.sin(15 * Math.PI / 180) * .92, cam = new T.PerspectiveCamera(30, 1, .1, 200), dir = new T.Vector3(.42, .3, 1).normalize(); cam.position.copy(c).addScaledVector(dir, dd); cam.lookAt(c);
  TR.render(s, cam); THUMB[k] = TR.domElement.toDataURL('image/png'); m.geometry.dispose(); m.material.dispose(); document.querySelectorAll(`[data-th="${k}"]`).forEach(el => { el.innerHTML = `<img src="${THUMB[k]}" alt="">`; }); }
function thumbs(first) { if (!T || FAIL) return; const want = (first || []).concat(Object.keys(SP)).filter((k, i, a) => !THUMB[k] && a.indexOf(k) === i); TQ = want; if (tbusy || !TQ.length) return; tbusy = true;
  try { if (!TR) { TR = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); TR.setSize(160, 160); TR.toneMapping = T.ACESFilmicToneMapping; } } catch (e) { tbusy = false; return; }
  const next = () => { const t0 = performance.now(); while (TQ.length && performance.now() - t0 < 24) { const k = TQ.shift(); if (THUMB[k]) continue; try { thumbOne(k); } catch (e) { console.warn('thumb', k, e); THUMB[k] = ''; } } if (TQ.length) setTimeout(next, 16); else tbusy = false; };
  setTimeout(next, 30); }
const thumb = k => `<span class="fo-thw" data-th="${k}">${THUMB[k] ? `<img src="${THUMB[k]}" alt="">` : '<span class="fo-sk"></span>'}</span>`;
const mini = (k, dead) => `<span class="fo-mini ${dead ? 'dead' : ''}" data-th="${k}">${THUMB[k] ? `<img src="${THUMB[k]}" alt="">` : ''}</span>`;

/* ================= sons ambiente (gerados, sem ficheiros) ================= */
const SND = { ctx: null, nodes: [], timers: [], kind: '' };
const SOUNDS = [['', 'Silêncio'], ['chuva', 'Chuva'], ['floresta', 'Floresta'], ['ribeiro', 'Ribeiro'], ['lareira', 'Lareira'], ['castanho', 'Ruído castanho']];
function noiseBuf(ctx, brown) { const n = ctx.sampleRate * 3, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { l = (l + .02 * w) / 1.02; d[i] = l * 3.5; } else d[i] = w; } return b; }
function sndStop() { SND.nodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { } }); SND.nodes = []; SND.timers.forEach(clearTimeout); SND.timers = []; SND.kind = ''; }
function sndPlay(kind) { sndStop(); if (!kind) return; try { const ctx = SND.ctx || (SND.ctx = new (window.AudioContext || window.webkitAudioContext)()); ctx.resume && ctx.resume(); SND.kind = kind; const out = ctx.createGain(); out.gain.value = .5; out.connect(ctx.destination); SND.nodes.push(out);
  const src = (brown, f1, f2, gain) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, brown); s.loop = true; let n = s; if (f1) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f1; n.connect(lp); n = lp; } if (f2) { const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = f2; n.connect(hp); n = hp; } const g = ctx.createGain(); g.gain.value = gain; n.connect(g); g.connect(out); s.start(); SND.nodes.push(s); return g; };
  const blip = (f0, f1, dur, vol, type = 'sine') => { const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .02); };
  const every = (fn, a, b2) => { const go = () => { if (SND.kind !== kind) return; fn(); SND.timers.push(setTimeout(go, a + Math.random() * (b2 - a))); }; SND.timers.push(setTimeout(go, a)); };
  if (kind === 'chuva') { src(false, 2400, 400, .35); src(true, 500, 0, .25); every(() => blip(2200 + Math.random() * 1500, 900, .04, .03, 'triangle'), 40, 160); }
  if (kind === 'floresta') { src(true, 900, 0, .14); src(false, 6000, 2500, .015); every(() => { const f = 2600 + Math.random() * 1800; for (let i = 0; i < 2 + Math.random() * 4; i++) setTimeout(() => SND.kind === kind && blip(f, f * (1.2 + Math.random() * .4), .09, .05), i * 110); }, 1800, 6500); }
  if (kind === 'ribeiro') { const g = src(false, 1800, 600, .25); const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .25; lg.gain.value = .1; lfo.connect(lg); lg.connect(g.gain); lfo.start(); SND.nodes.push(lfo); every(() => blip(700 + Math.random() * 900, 1400, .06, .02), 150, 600); }
  if (kind === 'lareira') { src(true, 400, 0, .4); every(() => blip(1800 + Math.random() * 2500, 300, .015, .09, 'square'), 60, 500); }
  if (kind === 'castanho') src(true, 0, 0, .5);
} catch (e) { console.warn(e); } }
function chime() { try { const ctx = SND.ctx || (SND.ctx = new (window.AudioContext || window.webkitAudioContext)()); [523, 659, 784, 1046].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * .14; o.frequency.value = f; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); o.start(t); o.stop(t + .52); }); } catch (e) { } }

/* ================= temporizador ================= */
const RK = 'oc_forest_run';
let RUN = U.ls.get(RK, null), LAST = null, tick = 0, wake = null;
const save = () => RUN ? U.ls.set(RK, RUN) : U.ls.del(RK);
const durMs = () => RUN ? RUN.mins * 6e4 : 0;
const left = () => RUN ? Math.max(0, RUN.t0 + durMs() - Date.now()) : 0;
const prog = () => RUN ? Math.min(1, (Date.now() - RUN.t0) / durMs()) : 0;
const mmss = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(x).padStart(2, '0'); };
const STAGES = 30, stageOf = p => Math.floor(p * STAGES) / STAGES;
const PHRASES = ['Larga o telemóvel. A tua árvore está a crescer', 'Uma coisa de cada vez.', 'Disciplina é escolher o que queres mais em vez do que queres agora.', 'O foco de hoje é a floresta de amanhã.', '"Tudo o que fizerem, façam de todo o coração" — Colossenses 3:23', 'Só mais um pouco. Estás a ir bem.', 'Grandes árvores começam com uma semente.'];
function tagInfo(v) { if (!v) return { tag: '', subject: '', skill: '' }; if (v.startsWith('s:')) { const s = OS.get('subjects', v.slice(2)); return { tag: s ? s.name : '', subject: v.slice(2), skill: '' }; } if (v.startsWith('k:')) { const s = OS.get('skills', v.slice(2)); return { tag: s ? s.name : '', subject: '', skill: v.slice(2) }; } return { tag: v, subject: '', skill: '' }; }
function plant() { const c = cfg(), sp = SP[c.sp] ? c.sp : 'carvalho', ti = tagInfo(c.tag);
  RUN = { phase: 'grow', t0: Date.now(), mins: Math.max(1, +c.mins || 25), sp, tagv: c.tag || '', tag: ti.tag, subject: ti.subject, skill: ti.skill, seed: (Math.random() * 1e9) | 0, hid: null, ph: Math.floor(Math.random() * PHRASES.length) };
  LAST = null; save(); sndPlay(c.sound); try { navigator.wakeLock && navigator.wakeLock.request('screen').then(w => wake = w).catch(() => { }); } catch (e) { } loop(); try { vid(); } catch (e) { } OS.request(); }
function finish(ok, why) { if (!RUN || RUN.phase !== 'grow') return; const mins = ok ? RUN.mins : Math.max(0, Math.floor((Date.now() - RUN.t0) / 6e4)), coins = ok ? coinsFor(RUN.mins) : 0;
  const t = OS.add('trees', { date: today(), t0: RUN.t0, mins, plan: RUN.mins, sp: RUN.sp, alive: !!ok, tag: RUN.tag, subject: RUN.subject, skill: RUN.skill, coins, why: why || '', seed: RUN.seed });
  if (ok) { cfg().coins = (+cfg().coins || 0) + coins; OS.touch('forest'); if ((RUN.subject || RUN.skill) && mins >= 5) OS.add('sessions', { date: today(), subject: RUN.subject, skill: RUN.skill, minutes: mins, type: 'Estudo profundo', phone: true, focus: 5, learned: 'Floresta: ' + SP[RUN.sp].n, tree: t.id }); chime(); }
  LAST = { id: t.id, ok: !!ok, sp: RUN.sp, mins, coins, why: why || '', seed: RUN.seed }; RUN = null; save(); sndStop(); try { wake && wake.release(); } catch (e) { } wake = null; clearInterval(tick); pill(); OS.request(); }
function startBreak() { RUN = { phase: 'break', t0: Date.now(), mins: Math.max(1, +cfg().brk || 5) }; LAST = null; save(); loop(); OS.request(); }
function loop() { clearInterval(tick); if (!RUN) return; tick = setInterval(step, 1000); step(); }
function step() { if (!RUN) { clearInterval(tick); pill(); return; } if (left() <= 0) { if (RUN.phase === 'grow') return finish(true); RUN = null; save(); chime(); UI.toast('A pausa acabou. Bora plantar outra?', 'pos'); clearInterval(tick); pill(); OS.request(); return; } paint(); }
function paint() { const L = left(), el = document.getElementById('foTime'); if (el) el.textContent = mmss(L); const ring = document.getElementById('foRing'); if (ring) ring.style.strokeDashoffset = String(100 - prog() * 100);
  if (RUN && RUN.phase === 'grow') { const k = `pot|${RUN.sp}|${stageOf(prog())}|0|${RUN.seed}|${cfg().scene || ''}`, h = document.getElementById('fo3d'); if (h && h.dataset.k !== k) { h.dataset.k = k; mount(); } document.title = 'Floresta · ' + mmss(L) + ' · OCEANUM'; } pill(); }
/* ---- janela flutuante (dentro do app) + Picture-in-Picture (fora do app) ---- */
const GI = {}, MSPH = {}; let FL = null, FC = null, VID = null, giBusy = '';
function growImg(sp, st) { const k = sp + '|' + st; if (GI[k] || giBusy === k) return GI[k]; if (!T || FAIL) { if (!FAIL) load3(); return null; }
  try { giBusy = k; if (!TR) { TR = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); TR.setSize(160, 160); TR.toneMapping = T.ACESFilmicToneMapping; }
    if (!MSPH[sp]) { const mb = new Bld(rngOf(42), 0); tree(mb, sp, 1, false); const g0 = mb.geo(); g0.computeBoundingSphere(); MSPH[sp] = g0.boundingSphere.clone(); g0.dispose(); }
    const sc = new T.Scene(); sc.add(new T.HemisphereLight('#e6f2ff', '#5a7a44', 1.25)); const d = new T.DirectionalLight('#fff4e0', 2.1); d.position.set(3, 6, 4); sc.add(d); const b = new Bld(rngOf(42), 1); tree(b, sp, st, false); const m = new T.Mesh(b.geo(), MAT()); sc.add(m);
    const bs = MSPH[sp], c = bs.center.clone(), dd = bs.radius / Math.sin(15 * Math.PI / 180) * .95, cam = new T.PerspectiveCamera(30, 1, .1, 200); c.y = Math.max(c.y, bs.radius * .8); cam.position.copy(c).addScaledVector(new T.Vector3(.42, .3, 1).normalize(), dd); cam.lookAt(c);
    TR.render(sc, cam); const img = new Image(); img.src = TR.domElement.toDataURL('image/png'); GI[k] = img; m.geometry.dispose(); m.material.dispose(); } catch (e) { console.warn(e); } giBusy = ''; return GI[k]; }
function drawFC() { if (!FC) { FC = document.createElement('canvas'); FC.width = 320; FC.height = 400; } const x = FC.getContext('2d'), W = 320, H = 400, sky = SKY(), p = RUN ? (RUN.phase === 'grow' ? prog() : 1) : 0;
  const gr = x.createLinearGradient(0, 0, 0, H); ({ day: [['#7cc7ef', 0], ['#e3f4ea', 1]], dawn: [['#f3a98c', 0], ['#eef0d8', 1]], dusk: [['#4b3f8f', 0], ['#f6b98a', 1]], night: [['#0a1630', 0], ['#2e4b5f', 1]] }[sky]).forEach(([c, o]) => gr.addColorStop(o, c)); x.fillStyle = gr; x.fillRect(0, 0, W, H);
  const cx = W / 2, cy = 150, R = 118; x.lineWidth = 7; x.strokeStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke(); x.strokeStyle = RUN && RUN.phase === 'break' ? '#ffd166' : '#8ef0a0'; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); x.stroke();
  x.fillStyle = 'rgba(70,140,60,.55)'; x.beginPath(); x.ellipse(cx, cy + 82, 70, 14, 0, 0, Math.PI * 2); x.fill();
  if (RUN && RUN.phase === 'grow') { const img = growImg(RUN.sp, Math.max(.1, Math.ceil(p * 10) / 10)) || growImg(RUN.sp, 1); if (img && img.complete && img.naturalWidth) x.drawImage(img, cx - 95, cy - 105, 190, 190); else { x.fillStyle = '#6fd17f'; x.beginPath(); x.arc(cx, cy, 30 + 40 * p, 0, Math.PI * 2); x.fill(); } }
  else { x.font = '64px system-ui'; x.textAlign = 'center'; x.fillText('Pausa', cx, cy + 22); }
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '600 64px system-ui,-apple-system,sans-serif'; x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 8; x.fillText(mmss(left()), cx, 330); x.shadowBlur = 0; x.font = '500 18px system-ui,-apple-system,sans-serif'; x.fillStyle = 'rgba(255,255,255,.9)';
  x.fillText(RUN ? (RUN.phase === 'grow' ? (SP[RUN.sp] || {}).n + (RUN.tag ? ' · ' + RUN.tag : '') : 'Pausa') : '', cx, 365, W - 30); return FC; }
const pipOn = () => !!(document.pictureInPictureElement || (VID && VID.webkitPresentationMode === 'picture-in-picture'));
function vid() { if (VID) return VID; drawFC(); VID = document.createElement('video'); VID.muted = true; VID.playsInline = true; VID.setAttribute('playsinline', ''); VID.setAttribute('muted', ''); VID.autoplay = true; VID.setAttribute('autopictureinpicture', ''); try { VID.autoPictureInPicture = true; } catch (e) { }
  VID.className = 'fo-vid'; try { VID.srcObject = FC.captureStream ? FC.captureStream(2) : null; } catch (e) { } document.body.appendChild(VID); VID.play().catch(() => { }); return VID; }
async function openPip() { try { const v = vid(); await v.play().catch(() => { }); if (v.requestPictureInPicture && document.pictureInPictureEnabled !== false) await v.requestPictureInPicture(); else if (v.webkitSetPresentationMode) v.webkitSetPresentationMode('picture-in-picture'); else UI.toast('Este navegador não tem janela flutuante fora da app', 'neg'); } catch (e) { UI.toast('Não consegui abrir a janela flutuante: ' + (e.message || ''), 'neg'); } }
function closePip() { try { if (document.pictureInPictureElement) document.exitPictureInPicture(); else if (VID && VID.webkitPresentationMode === 'picture-in-picture') VID.webkitSetPresentationMode('inline'); } catch (e) { } }
function pill() { const fl = !/^#floresta/.test(location.hash) && RUN; if (RUN) drawFC();
  if (!RUN) { if (FL) { FL.remove(); FL = null; } closePip(); if (VID) { try { VID.pause(); (VID.srcObject && VID.srcObject.getTracks ? VID.srcObject.getTracks() : []).forEach(t => t.stop()); } catch (e) { } VID.remove(); VID = null; } return; }
  if (!FL) { FL = document.createElement('div'); FL.id = 'foFloat'; FL.className = 'fo-float mini'; FL.innerHTML = `<div class="fo-fh"><span>Floresta</span><button data-f="pip" title="Janela flutuante fora da app" aria-label="Janela flutuante fora da app">⧉</button><button data-f="min" aria-label="Aumentar ou reduzir">⤢</button></div><div class="fo-fc"></div><div class="fo-ft"><button data-f="open">Abrir</button><button data-f="give">Desistir</button></div>`;
    FL.querySelector('.fo-fc').appendChild(FC); document.body.appendChild(FL); let sx = 0, sy = 0, ox = 0, oy = 0, mv = false;
    FL.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; mv = false; sx = e.clientX; sy = e.clientY; const r = FL.getBoundingClientRect(); ox = r.left; oy = r.top; FL.setPointerCapture(e.pointerId); FL._drag = true; });
    FL.addEventListener('pointermove', e => { if (!FL._drag) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) + Math.abs(dy) > 4) mv = true; FL.style.left = Math.max(4, Math.min(innerWidth - FL.offsetWidth - 4, ox + dx)) + 'px'; FL.style.top = Math.max(4, Math.min(innerHeight - FL.offsetHeight - 4, oy + dy)) + 'px'; FL.style.right = 'auto'; FL.style.bottom = 'auto'; });
    FL.addEventListener('pointerup', () => { FL._drag = false; if (!mv) location.hash = 'floresta'; });
    FL.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); const f = b.dataset.f; if (f === 'pip') openPip(); if (f === 'min') FL.classList.toggle('mini'); if (f === 'open') location.hash = 'floresta'; if (f === 'give') A.foGiveUp(); }); }
  FL.classList.toggle('off', !fl); const t = FL.querySelector('.fo-fh span'); if (t) t.textContent = (RUN.phase === 'grow' ? '' : 'Pausa · ') + mmss(left()); }
A.foPip = () => openPip();
document.addEventListener('visibilitychange', () => { if (!RUN || RUN.phase !== 'grow') return; if (document.hidden) { RUN.hid = Date.now(); RUN.pip = pipOn(); save(); return; } back(); });
addEventListener('pagehide', () => { if (RUN && RUN.phase === 'grow' && !RUN.hid) { RUN.hid = Date.now(); save(); } });
function back() { if (!RUN || !RUN.hid) return; const away = Date.now() - RUN.hid, lim = RUN.pip ? 0 : +cfg().strict; RUN.hid = null; RUN.pip = false; save();
  if (lim && away > lim * 1000 && left() > 0) return finish(false, `Saíste do Oceanum durante ${Math.round(away / 1000)} s`); if (away > 4000 && left() > 0) UI.toast('Voltaste a tempo — a árvore continua a crescer', 'pos'); step(); }
OS.on('ready', () => { if (RUN) { if (RUN.phase === 'grow' && RUN.hid) back(); if (RUN) loop(); } });
addEventListener('hashchange', pill);
A.foPlant = () => plant();
A.foGiveUp = () => UI.ask('Desistir?', 'Se desistires agora, a tua árvore morre e fica seca na floresta.', 'Desistir', () => finish(false, 'Desististe'), 'danger');
A.foBreak = () => startBreak();
A.foSkip = () => { RUN = null; save(); clearInterval(tick); pill(); OS.request(); };
A.foAgain = () => { LAST = null; OS.request(); };
A.foSp = b => { const k = b.dataset.k; if (SP[k]) { cfg().sp = k; OS.touch('forest'); if (/loja/.test(location.hash)) UI.toast(SP[k].n + ' escolhida', 'pos'); } };
A.foCat = b => OS.setUI('foCat', b.dataset.v);
A.foMins = b => { cfg().mins = +b.dataset.v; OS.touch('forest'); };
A.foSound = b => { cfg().sound = b.dataset.v; OS.touch('forest'); if (RUN && RUN.phase === 'grow') sndPlay(b.dataset.v); };
document.addEventListener('input', e => { if (e.target.id === 'foDur') { cfg().mins = +e.target.value; const o = document.getElementById('foTime'); if (o && !RUN) o.textContent = mmss(+e.target.value * 6e4); } });
document.addEventListener('change', e => { if (e.target.id === 'foDur') OS.touch('forest'); if (e.target.id === 'foTag') { cfg().tag = e.target.value; OS.touch('forest'); } if (e.target.id === 'foStrict') { cfg().strict = e.target.value; OS.touch('forest'); } });

/* ================= vistas ================= */
const TABS = [['', 'Plantar'], ['floresta', 'A minha floresta'], ['loja', 'Todas as árvores'], ['moedas', 'Moedas & prémios'], ['stats', 'Estatísticas']];
V.floresta = sub => { const k = TABS.some(t => t[0] === (sub || '')) ? (sub || '') : '';
  return UI.head('Floresta', 'Planta uma árvore e concentra-te: ela cresce enquanto estudas. Se saíres do Oceanum ou desistires, morre. Cada sessão fica na tua floresta.', `<span class="fo-coins" title="Moedas">🪙 ${U.nf(+cfg().coins || 0)}</span>`, 'Estudos') + UI.tabs('floresta', TABS, k) + `<div class="fo">${VW[k]()}</div>`; };
const VW = {};
const sky = () => `fo-sky fo-${SKY()}`;
const tagSel = v => `<select class="field" id="foTag" aria-label="Etiqueta"><option value="">Sem etiqueta</option><optgroup label="Disciplinas">${OS.all('subjects').filter(s => s.status === 'Em curso').map(s => `<option value="s:${s.id}"${v === 's:' + s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup><optgroup label="Competências">${OS.all('skills').map(s => `<option value="k:${s.id}"${v === 'k:' + s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup><optgroup label="Outras">${['Leitura', 'Trabalho', 'Mova', 'Devocional', 'Projeto pessoal', 'Outro'].map(x => `<option${v === x ? ' selected' : ''}>${x}</option>`).join('')}</optgroup></select>`;
VW[''] = () => { const c = cfg(), sp = SP[c.sp] ? c.sp : 'carvalho', t = today(), Td = OS.all('trees').filter(x => x.date === t), cat = OS.ui.foCat || '', se = SEASON(), list = Object.keys(SP).filter(k => !cat || SP[k].k === cat);
  let k, title, body; const ring = (p, cls = '') => `<svg class="fo-ring ${cls}" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" pathLength="100" class="bg"/><circle id="foRing" cx="60" cy="60" r="54" pathLength="100" class="fg" style="stroke-dashoffset:${100 - p * 100}"/></svg>`;
  if (RUN && RUN.phase === 'grow') { k = `pot|${RUN.sp}|${stageOf(prog())}|0|${RUN.seed}|${cfg().scene || ''}`;
    body = `<div class="fo-ph">${esc(PHRASES[RUN.ph % PHRASES.length])}</div><div class="fo-time" id="foTime">${mmss(left())}</div><div class="fo-sub">${esc(SP[RUN.sp].n)}${RUN.tag ? ' · ' + esc(RUN.tag) : ''} · ${RUN.mins} min</div>
      <div class="row gap8" style="justify-content:center;flex-wrap:wrap"><div class="seg fo-snd">${SOUNDS.map(([v, l]) => `<button class="${(c.sound || '') === v ? 'on' : ''}" data-act="foSound" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="row gap8" style="justify-content:center;flex-wrap:wrap"><button class="btn sm" data-act="foPip">⧉ Janela flutuante (para sair da app)</button><button class="btn ghost fo-give" data-act="foGiveUp">Desistir</button></div><small class="mut" style="max-width:360px">Abre a janela flutuante antes de saíres: ficas a ver a árvore e o tempo por cima das outras apps e a árvore não morre enquanto ela estiver aberta.</small>`; return stage(k, ring(prog()), body); }
  if (RUN && RUN.phase === 'break') { return `<div class="pn fo-break"><div class="fo-ph">Pausa — estica as pernas, bebe água, olha para longe.</div><div class="fo-time" id="foTime">${mmss(left())}</div><button class="btn" data-act="foSkip">Saltar pausa</button></div>`; }
  if (LAST) { k = `pot|${LAST.sp}|1|${LAST.ok ? 0 : 1}|${LAST.seed}|${cfg().scene || ''}`;
    body = LAST.ok ? `<div class="fo-done">Plantaste ${/a$/.test(SP[LAST.sp].n) ? 'uma' : 'um'} <b>${esc(SP[LAST.sp].n)}</b>!</div><div class="fo-sub">${LAST.mins} minutos de foco · +${LAST.coins} 🪙</div><div class="row gap8" style="justify-content:center;flex-wrap:wrap"><button class="btn pri" data-act="foBreak">Pausa de ${c.brk || 5} min</button><button class="btn" data-act="foAgain">Plantar outra</button><a class="btn ghost" href="#floresta.floresta">Ver a floresta</a></div>`
      : `<div class="fo-done dead">A tua árvore morreu</div><div class="fo-sub">${esc(LAST.why || '')}${LAST.mins ? ' · ' + LAST.mins + ' min' : ''}. Fica seca na floresta como lembrete. Recomeça — tu consegues.</div><div class="row gap8" style="justify-content:center"><button class="btn pri" data-act="foAgain">Tentar outra vez</button></div>`;
    return stage(k, ring(1, LAST.ok ? 'ok' : 'dead'), body); }
  k = `pot|${sp}|1|0|${U.hash(sp) % 997}|${cfg().scene || ''}`;
  body = `<div class="fo-time" id="foTime">${mmss((+c.mins || 25) * 6e4)}</div>
    <input type="range" id="foDur" min="10" max="180" step="5" value="${+c.mins || 25}" aria-label="Duração em minutos" class="fo-range">
    <div class="row gap6 fo-chips">${[15, 25, 45, 50, 60, 90, 120].map(m => `<button class="chip ${+c.mins === m ? 'on' : ''}" data-act="foMins" data-v="${m}">${m}</button>`).join('')}</div>
    <div class="fo-ctl">${tagSel(c.tag || '')}<select class="field" id="foStrict" aria-label="Regra de saída"><option value="10"${c.strict === '10' ? ' selected' : ''}>Morre se saíres 10 s</option><option value="20"${c.strict === '20' ? ' selected' : ''}>Morre se saíres 20 s</option><option value="60"${c.strict === '60' ? ' selected' : ''}>Morre se saíres 1 min</option><option value="0"${c.strict === '0' ? ' selected' : ''}>Só morre se desistires</option></select></div>
    ${se[0] !== sp ? `<button class="fo-season" data-act="foSp" data-k="${se[0]}">${se[1]} — experimenta: <b>${esc(SP[se[0]].n)}</b></button>` : ''}
    <div class="row gap6 fo-cats">${CATS.map(([k, l]) => `<button class="chip ${cat === k ? 'on' : ''}" data-act="foCat" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="fo-sps" role="listbox" aria-label="Espécie">${list.map(x => `<button class="fo-sp ${x === sp ? 'on' : ''}" data-act="foSp" data-k="${x}" title="${esc(SP[x].n)}">${thumb(x)}<small>${esc(SP[x].n)}</small></button>`).join('')}<a class="fo-sp more" href="#floresta.loja"><small>Ver todas</small></a></div>
    <div class="row gap6" style="justify-content:center;flex-wrap:wrap;margin:6px 0 2px"><div class="seg fo-snd">${SOUNDS.map(([v, l]) => `<button class="${(c.sound || '') === v ? 'on' : ''}" data-act="foSound" data-v="${v}">${l}</button>`).join('')}</div></div>
    <button class="btn pri fo-go" data-act="foPlant">Plantar</button>
    <div class="fo-today">${Td.length ? `Hoje: <b>${Td.filter(x => x.alive !== false).length}</b> árvore(s) · <b>${U.hours(U.sum(Td.filter(x => x.alive !== false), x => +x.mins || 0))}</b> de foco${Td.some(x => x.alive === false) ? ` · ${Td.filter(x => x.alive === false).length} morta(s)` : ''}` : 'Ainda não plantaste hoje.'}</div>`;
  if (T && !FAIL) thumbs([sp].concat(list)); else if (!T && !FAIL) load3().then(() => thumbs([sp].concat(list))); return stage(k, ring(0, 'idle'), body); };
const stage = (k, ring, body) => `<div class="fo-wrap"><div class="${sky()} fo-stage"><div id="fo3d" class="fo-3d" data-mode="pot" data-k="${k}"><div class="fo-fb"><span class="fd-spin"></span><small>A preparar a tua árvore…</small></div></div>${ring}</div><div class="fo-panel">${body}</div></div>`;

const PER = [['d', 'Dia'], ['w', 'Semana'], ['m', 'Mês'], ['y', 'Ano'], ['a', 'Tudo']];
const range = (p, ref) => { if (p === 'd') return [ref, ref, U.longDate(ref)]; if (p === 'w') { const a = U.monday(ref), b = U.addDays(a, 6); return [a, b, U.fmtDS(a) + ' – ' + U.fmtDS(b)]; } if (p === 'm') { const a = ref.slice(0, 7) + '-01', d = new Date(+ref.slice(0, 4), +ref.slice(5, 7), 0).getDate(); return [a, ref.slice(0, 7) + '-' + d, (U.MESL || U.MES)[+ref.slice(5, 7) - 1] + ' ' + ref.slice(0, 4)]; } if (p === 'y') return [ref.slice(0, 4) + '-01-01', ref.slice(0, 4) + '-12-31', ref.slice(0, 4)]; return ['0000', '9999', 'Desde sempre']; };
const shift = (p, ref, d) => p === 'd' ? U.addDays(ref, d) : p === 'w' ? U.addDays(ref, 7 * d) : p === 'm' ? (() => { const x = new Date(+ref.slice(0, 4), +ref.slice(5, 7) - 1 + d, 1); return U.iso(x); })() : p === 'y' ? (+ref.slice(0, 4) + d) + ref.slice(4) : ref;
VW.floresta = () => { if (T && !FAIL) setTimeout(() => thumbs(), 400); const p = OS.ui.foP || 'd', ref = OS.ui.foR || today(), [a, b, lab] = range(p, ref), L = U.sortBy(OS.all('trees').filter(t => t.date >= a && t.date <= b), t => t.t0 || 0), alive = L.filter(t => t.alive !== false), dead = L.length - alive.length, shown = L.slice(-500);
  FLIST = shown; const key = `forest|${cfg().scene || ''}|${p}|${a}|${L.length}|${L.map(t => t.id.slice(-3)).join('').slice(-60)}`;
  const byTag = {}; alive.forEach(t => byTag[t.tag || 'Sem etiqueta'] = (byTag[t.tag || 'Sem etiqueta'] || 0) + (+t.mins || 0));
  return `<div class="row gap8 fo-pernav" style="flex-wrap:wrap;align-items:center"><div class="seg">${PER.map(([k, l]) => `<button class="${p === k ? 'on' : ''}" data-act="foPer" data-v="${k}">${l}</button>`).join('')}</div>${p !== 'a' ? `<span class="row gap4"><button class="icon-btn" data-act="foShift" data-d="-1" aria-label="Anterior">${UI.ic('left')}</button><b>${esc(lab)}</b><button class="icon-btn" data-act="foShift" data-d="1" aria-label="Seguinte" ${b >= today() ? 'disabled' : ''}>${UI.ic('right')}</button></span>` : ''}</div>
    <div class="${sky()} fo-stage fo-big"><div id="fo3d" class="fo-3d" data-mode="forest" data-k="${esc(key)}"><div class="fo-fb"><span class="fd-spin"></span><small>A plantar a tua floresta…</small></div></div>
      <div class="fo-ov"><b>${alive.length}</b> ${alive.length === 1 ? 'árvore' : 'árvores'}${dead ? ` · <span>${dead} ${dead === 1 ? "seca" : "secas"}</span>` : ''}<small>${U.hours(U.sum(alive, t => +t.mins || 0))} de foco</small></div>${!L.length ? `<div class="fo-empty">Ainda não há árvores aqui.<br><a class="btn sm pri" href="#floresta">Plantar a primeira</a></div>` : ''}<small class="fo-hint">arrasta para rodar · pinça/roda para zoom</small></div>
    ${L.length > shown.length ? `<p class="mut" style="font-size:12px">A mostrar as ${shown.length} árvores mais recentes.</p>` : ''}
    ${L.length ? `<div class="g g2"><div class="pn"><div class="pn-h"><h3>Por etiqueta</h3></div>${C.mount({ type: 'donut', data: Object.entries(byTag).sort((x, y) => y[1] - x[1]).map(([l, v]) => ({ l, v })), fmt: v => U.hours(v), max: 7, centerSub: 'foco' }, 200)}</div>
      <div class="pn"><div class="pn-h"><h3>Sessões</h3></div><div class="list">${U.sortBy(L, t => t.t0 || 0, -1).slice(0, 12).map(t => `<div class="li">${mini(t.sp, t.alive === false)}<div class="li-t"><b>${esc((SP[t.sp] || {}).n || 'Árvore')} · ${t.mins} min</b><small>${t.t0 ? new Date(t.t0).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : U.fmtD(t.date)}${t.tag ? ' · ' + esc(t.tag) : ''}${t.alive === false ? ' · ' + esc(t.why || 'morreu') : ''}</small></div></div>`).join('')}</div></div></div>` : ''}`; };
A.foPer = b => { OS.setUI('foP', b.dataset.v); OS.setUI('foR', today()); };
A.foShift = b => OS.setUI('foR', shift(OS.ui.foP || 'd', OS.ui.foR || today(), +b.dataset.d));

VW.loja = () => { const c = cfg(), cat = OS.ui.foCat || '', se = SEASON(), first = Object.keys(SP).filter(k => !cat || SP[k].k === cat); if (T && !FAIL) thumbs(first); else if (!FAIL) load3().then(() => thumbs(first));
  return `<div class="pn fo-shop-h"><div><b>${Object.keys(SP).length} árvores, todas desbloqueadas</b><small class="mut">Escolhe a que quiseres para a próxima sessão. Moedas: ${U.nf(+c.coins || 0)} 🪙 (pontos de foco — ${coinsFor(25)} por cada 25 min).</small></div><button class="btn sm" data-act="foSp" data-k="${se[0]}">${se[1]}: ${esc(SP[se[0]].n)}</button></div>
    <div class="row gap6 fo-cats" style="margin:0 0 12px">${CATS.map(([k, l]) => `<button class="chip ${cat === k ? 'on' : ''}" data-act="foCat" data-v="${k}">${l} (${Object.values(SP).filter(x => !k || x.k === k).length})</button>`).join('')}</div>
    <div class="fo-shop">${Object.entries(SP).filter(([, s2]) => !cat || s2.k === cat).map(([k, s2]) => `<div class="fo-card ${c.sp === k ? 'sel' : ''}" data-act="foSp" data-k="${k}" role="button" tabindex="0"><div class="fo-th ${sky()}">${thumb(k)}</div><b>${esc(s2.n)}</b><small>${esc(s2.d)}</small>${c.sp === k ? '<span class="bdg pos">✓ Escolhida</span>' : `<span class="btn xs">Escolher</span>`}</div>`).join('')}</div>`; };
OS.S.forewards = { label: 'Prémio', title: r => r.title, fields: [{ k: 'title', l: 'Prémio', t: 'text', req: 1, h: 'Ex.: 1 episódio de série, pizza ao fim de semana, jogo de FIFA 1 h' }, { k: 'cost', l: 'Preço em moedas', t: 'num', req: 1 }, { k: 'note', l: 'Nota', t: 'area', rows: 2 }], defaults: () => ({ cost: 100 }) };
VW.moedas = () => { const c = cfg(), coins = +c.coins || 0, own = c.scenes || ['verde'], R = OS.all('forewards'), hist = (c.redeemed || []).slice(-12).reverse(), sug = [['1 episódio de série', 60], ['30 min de videojogo', 90], ['Um doce / gelado', 120], ['Pizza ao fim de semana', 300], ['Sair com amigos sem culpa', 400], ['Comprar um livro', 600]];
  return `<div class="pn fo-shop-h"><div><b>🪙 ${U.nf(coins)} moedas</b><small class="mut">Ganhas ${coinsFor(25)} moedas por cada 25 min de foco. Usa-as para te recompensar a sério e para mudar o cenário da tua floresta.</small></div></div>
  <section><div class="sech"><h2>Os meus prémios</h2>${UI.addBtn('forewards', 'Prémio', null, 'sm')}</div>${R.length ? `<div class="fo-shop">${U.sortBy(R, r => +r.cost || 0).map(r => `<div class="fo-card fo-rw"><b>${esc(r.title)}</b><small>${esc(r.note || '')}</small><div class="row between" style="width:100%;align-items:center"><span class="mono">🪙 ${U.nf(+r.cost || 0)}</span><button class="btn xs ${coins >= +r.cost ? 'pri' : 'ghost'}" data-act="foRedeem" data-id="${r.id}">${coins >= +r.cost ? 'Trocar' : 'Faltam ' + U.nf(+r.cost - coins)}</button></div><button class="btn xs ghost" data-edit="forewards:${r.id}">Editar</button></div>`).join('')}</div>` : `<div class="pn"><p class="mut">Define prémios reais com um preço em moedas. Sugestões:</p><div class="fe-chs">${sug.map(([t, v]) => `<button class="chip" data-act="foRwSug" data-t="${esc(t)}" data-v="${v}">${esc(t)} · ${v} 🪙</button>`).join('')}</div></div>`}
    ${hist.length ? `<div class="pn"><div class="pn-h"><h3>Prémios trocados</h3></div><div class="list">${hist.map(h => `<div class="li"><span class="when">${U.fmtDS(h.d)}</span><div class="li-t"><b>${esc(h.t)}</b></div><span class="mono">−${h.c} 🪙</span></div>`).join('')}</div></div>` : ''}</section>
  <section><div class="sech"><h2>Cenários da floresta</h2></div><div class="fo-shop">${Object.entries(SCN).map(([k, x]) => { const has = own.includes(k) || !x.c, on = (c.scene || 'verde') === k; return `<div class="fo-card ${on ? 'sel' : ''}"><div class="fo-scn" style="background:linear-gradient(180deg,${x.g} 0 58%,${x.s} 58% 70%,#7d5434 70%)"></div><b>${esc(x.n)}</b><small>${esc(x.d)}</small>${on ? '<span class="bdg pos">✓ A usar</span>' : has ? `<button class="btn xs" data-act="foScene" data-k="${k}">Usar</button>` : `<button class="btn xs ${coins >= x.c ? 'pri' : 'ghost'}" data-act="foScene" data-k="${k}">🪙 ${U.nf(x.c)}</button>`}</div>`; }).join('')}</div></section>`; };
A.foRwSug = b => { OS.add('forewards', { title: b.dataset.t, cost: +b.dataset.v }); };
A.foRedeem = b => { const r = OS.get('forewards', b.dataset.id), c = cfg(); if (!r) return; if ((+c.coins || 0) < +r.cost) return UI.toast(`Faltam ${+r.cost - (+c.coins || 0)} moedas — planta mais árvores`, 'neg'); UI.ask('Trocar prémio?', `${esc(r.title)} por ${r.cost} moedas.`, 'Trocar', () => { c.coins -= +r.cost; c.redeemed = (c.redeemed || []).concat([{ d: today(), t: r.title, c: +r.cost }]).slice(-100); OS.touch('forest'); chime(); UI.toast('Aproveita! Mereceste', 'pos'); }, 'pri'); };
A.foScene = b => { const k = b.dataset.k, x = SCN[k], c = cfg(), own = c.scenes || ['verde']; if (!x) return; if (!own.includes(k) && x.c) { if ((+c.coins || 0) < x.c) return UI.toast(`Faltam ${x.c - (+c.coins || 0)} moedas`, 'neg'); c.coins -= x.c; c.scenes = own.concat(k); chime(); UI.toast('Cenário desbloqueado: ' + x.n, 'pos'); } c.scene = k; OS.touch('forest'); };
VW.stats = () => { if (T && !FAIL) setTimeout(() => thumbs(), 300); else if (!FAIL) load3().then(() => thumbs()); const Tr = OS.all('trees'), al = Tr.filter(t => t.alive !== false), t = today(), d30 = U.lastN(30), byD = U.groupBy(al, x => x.date), hrs = Array.from({ length: 24 }, (_, h) => U.sum(al.filter(x => x.t0 && new Date(x.t0).getHours() === h), x => +x.mins || 0));
  let st = 0; for (let d = t; byD[d]; d = U.addDays(d, -1)) st++; if (!st && byD[U.addDays(t, -1)]) for (let d = U.addDays(t, -1); byD[d]; d = U.addDays(d, -1)) st++;
  const best = Object.entries(byD).map(([d, a]) => [d, U.sum(a, x => +x.mins || 0)]).sort((a, b) => b[1] - a[1])[0];
  if (!Tr.length) return UI.empty('As estatísticas aparecem depois da primeira árvore.', `<a class="btn pri" href="#floresta">Plantar</a>`);
  return `<div class="kpis">${UI.kpi('Foco total', U.hours(U.sum(al, x => +x.mins || 0)), al.length + ' árvores vivas')}${UI.kpi('Taxa de sucesso', U.pct(al.length / Tr.length), (Tr.length - al.length) + ' morreram', { tone: al.length / Tr.length >= .8 ? 'pos' : 'warn' })}${UI.kpi('Sequência', st + (st === 1 ? ' dia' : ' dias'), 'dias seguidos a plantar')}${UI.kpi('Melhor dia', best ? U.hours(best[1]) : '—', best ? U.fmtD(best[0]) : '')}</div>
    <div class="g g2"><div class="pn"><div class="pn-h"><h3>Minutos de foco · 30 dias</h3></div>${C.mount({ type: 'bar', labels: d30.map(d => U.fmtDS(d)), series: [{ name: 'Minutos', data: d30.map(d => U.sum(byD[d] || [], x => +x.mins || 0)), color: 'var(--pos)' }] }, 200)}</div>
      <div class="pn"><div class="pn-h"><h3>A que horas te concentras</h3></div>${C.mount({ type: 'bar', labels: hrs.map((_, h) => h + 'h'), series: [{ name: 'Minutos', data: hrs, color: 'var(--accent)' }] }, 200)}</div></div>
    <div class="pn"><div class="pn-h"><h3>Espécies plantadas</h3></div><div class="fo-spst">${Object.entries(U.groupBy(al, x => x.sp)).sort((a, b) => b[1].length - a[1].length).map(([k, a]) => `<span>${mini(k)} ${esc((SP[k] || {}).n || k)} <b>${a.length}</b></span>`).join('')}</div></div>`; };

/* ---- quando o 3D não abre: tenta outra vez sozinho e mostra o motivo (sem trocar a árvore 3D por outra coisa) ---- */
let flatT = 0;
function flat(h) { h.classList.add('fo-nogl'); const fb = h.querySelector('.fo-fb'); if (!fb) return; const again = failN < 4;
  if (again) { clearTimeout(flatT); flatT = setTimeout(() => { if (document.getElementById('fo3d')) mount(); }, 6500); }
  const k = again + '|' + failWhy; if (fb.dataset.k === k) return; fb.dataset.k = k;
  fb.innerHTML = again ? `<span class="fd-spin"></span><small>A abrir o 3D…</small>` : `<small>O 3D não abriu agora neste aparelho.${failWhy ? `<span class="fo-why">${esc(failWhy)}</span>` : ''}</small><button type="button" class="btn xs" data-act="fo3dRetry">Tentar outra vez</button>`; }
A.fo3dRetry = () => { failN = 0; retry3(); const h = document.getElementById('fo3d'); if (h) { const fb = h.querySelector('.fo-fb'); if (fb) { fb.dataset.k = ''; fb.innerHTML = '<span class="fd-spin"></span><small>A abrir o 3D…</small>'; } } setTimeout(mount, 60); };
OS.Forest = { SP, gl: () => ({ ok: !!G.r, fail: FAIL, why: failWhy }), _fail: (w) => { fail(w || 'teste'); }, _retry: () => { failN = 0; retry3(); }, check: () => Object.keys(SP).map(k => { const out = [k]; [1, .5, .05].forEach(g => [false, true].forEach(d => { try { const b = new Bld(rngOf(5), 1); tree(b, k, g, d); } catch (e) { out.push(g + (d ? 'd' : '') + ': ' + e.message); } })); return out; }).filter(x => x.length > 1), run: () => RUN, last: () => LAST, finish, plant, coinsFor, _t: () => ({ T: !!T, FAIL, G }) };
})();
