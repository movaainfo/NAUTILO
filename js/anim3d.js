/* NÁUTILO — animação 3D dos exercícios, ao estilo Hevy: corpo anatómico com a musculatura toda (BodyParts3D, CC BY-SA),
   posto em movimento com os padrões de anim.js. O músculo principal fica vermelho (e brilha na contração), os secundários a laranja.
   As mãos agarram mesmo o equipamento: barra, halteres, kettlebell, cabo com corda/barra/pega, ou a máquina certa para o exercício.
   Ficheiros em vendor/ (three.js + body.bin), servidos pela própria app e guardados para funcionar sem internet. Arrasta para rodar. */
(() => {
'use strict';
const A3 = OS.Anim3D = {};
const D = Math.PI / 180, S = .0134, G = 142;
let T = null, BODY = null, loading = null;
A3.load = () => loading || (loading = (async () => { const base = new URL('vendor/', document.baseURI).href;
  const [t, buf] = await Promise.all([import(base + 'three.module.min.js'), fetch(base + 'body.bin').then(r => { if (!r.ok) throw new Error('body ' + r.status); return r.arrayBuffer(); })]);
  T = t; BODY = parse(buf); })().catch(e => { loading = null; throw e; }));
// ---------- corpo: metade direita no ficheiro, espelhada aqui ----------
const parse = buf => { const dv = new DataView(buf), hl = dv.getUint32(4, true), H = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl))); let o = 8 + hl;
  const nv = H.nv, nf = H.nf, q = new Uint16Array(buf, o, nv * 3); o += nv * 6;
  const idx = nv > 65535 ? new Uint32Array(buf, o, nf * 3) : new Uint16Array(buf, o, nf * 3); o += nf * 3 * (nv > 65535 ? 4 : 2); if (nv <= 65535 && (nf * 3) % 2) o += 2;
  const si = new Uint8Array(buf, o, nv * 4); o += nv * 4; const sw = new Uint8Array(buf, o, nv * 4); o += nv * 4; const rg = new Uint8Array(buf, o, nv); o += nv; o += (4 - nv % 4) % 4;
  const ax = H.axis ? new Int8Array(buf, o, nv * 3) : null;
  return { H, nv, nf, q, idx, si, sw, rg, ax }; };
const NB = 17, MIR = i => i >= 5 ? i + 12 : i; // ossos 5..16 = lado direito; 17..28 = esquerdo
const REGN = { 'Peito': ['pec'], 'Dorsais': ['lat'], 'Trapézio': ['trap'], 'Lombar': ['low'], 'Ombros': ['delt'], 'Bíceps': ['bi'], 'Tríceps': ['tri'], 'Antebraços': ['fa'], 'Abdómen': ['abs'], 'Oblíquos': ['obl'], 'Glúteos': ['glute'], 'Quadríceps': ['quad'], 'Isquiotibiais': ['ham'], 'Gémeos': ['calf'], 'Adutores': ['add'], 'Abdutores': ['glute'], 'Pescoço': ['neck'], 'Tibial': ['shin'] };
const geometry = () => { const { H, nv, nf, q, idx, si, sw, rg, ax } = BODY, lo = H.lo, hi = H.hi, N2 = nv * 2, axA = new Float32Array(N2 * 3);
  const pos = new Float32Array(N2 * 3), sI = new Uint16Array(N2 * 4), sW = new Float32Array(N2 * 4), reg = new Uint8Array(N2), ind = new Uint32Array(nf * 6);
  for (let i = 0; i < nv; i++) { for (let k = 0; k < 3; k++) pos[i * 3 + k] = lo[k] + q[i * 3 + k] / 65535 * (hi[k] - lo[k]);
    const j = i + nv; pos[j * 3] = pos[i * 3]; pos[j * 3 + 1] = pos[i * 3 + 1]; pos[j * 3 + 2] = -pos[i * 3 + 2];
    for (let k = 0; k < 4; k++) { const b = si[i * 4 + k], w = sw[i * 4 + k] / 255; sI[i * 4 + k] = b; sW[i * 4 + k] = w; sI[j * 4 + k] = MIR(b); sW[j * 4 + k] = w; }
    reg[i] = reg[j] = rg[i]; if (ax) { const a = ax[i * 3] / 127, b = ax[i * 3 + 1] / 127, c = ax[i * 3 + 2] / 127; axA.set([a, b, c], i * 3); axA.set([a, b, -c], j * 3); } }
  for (let f = 0; f < nf; f++) { const a = idx[f * 3], b = idx[f * 3 + 1], c = idx[f * 3 + 2]; ind.set([a, b, c], f * 3); ind.set([a + nv, c + nv, b + nv], (nf + f) * 3); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('skinIndex', new T.Uint16BufferAttribute(sI, 4)); g.setAttribute('skinWeight', new T.BufferAttribute(sW, 4));
  g.setIndex(new T.BufferAttribute(ind, 1)); g.computeVertexNormals();
  // sombra nas reentrâncias entre músculos (cavidade), como nas ilustrações anatómicas
  { const nr = g.attributes.normal.array, acc = new Float32Array(N2 * 3), cnt = new Float32Array(N2); for (let f = 0; f < ind.length; f += 3) for (let k = 0; k < 3; k++) { const a = ind[f + k]; for (let m = 1; m < 3; m++) { const b = ind[f + (k + m) % 3]; acc[a * 3] += pos[b * 3]; acc[a * 3 + 1] += pos[b * 3 + 1]; acc[a * 3 + 2] += pos[b * 3 + 2]; cnt[a]++; } }
    const cav = new Float32Array(N2); for (let i = 0; i < N2; i++) { if (!cnt[i]) continue; const dx = acc[i * 3] / cnt[i] - pos[i * 3], dy = acc[i * 3 + 1] / cnt[i] - pos[i * 3 + 1], dz = acc[i * 3 + 2] / cnt[i] - pos[i * 3 + 2]; cav[i] = dx * nr[i * 3] + dy * nr[i * 3 + 1] + dz * nr[i * 3 + 2]; }
    const ao = new Float32Array(N2); for (let i = 0; i < N2; i++) ao[i] = Math.max(.55, Math.min(1.08, 1 - cav[i] * 260)); reg.ao = ao; } g.setAttribute('aAxis', new T.BufferAttribute(axA, 3)); g.setAttribute('color', new T.BufferAttribute(new Float32Array(N2 * 3), 3)); return { g, reg }; };
const skeleton = () => { const H = BODY.H, bones = [], info = [];
  const mk = (b, i, mir) => { const s = b[2].slice(), e = b[3].slice(); if (mir) { s[2] = -s[2]; e[2] = -e[2]; } const bone = new T.Bone(); bone.name = (mir ? 'L' : i >= 5 ? 'R' : '') + b[0]; return { bone, s: new T.Vector3(...s), e: new T.Vector3(...e), p: b[1] < 0 ? -1 : mir ? MIR(b[1]) : b[1] }; };
  H.bones.forEach((b, i) => info[i] = mk(b, i, false)); H.bones.forEach((b, i) => { if (i >= 5) info[MIR(i)] = mk(b, i, true); });
  info.forEach((x, i) => { x.dir = x.e.clone().sub(x.s).normalize(); x.side = /foot|toes/.test(x.bone.name) ? new T.Vector3(0, 1, 0) : new T.Vector3(1, 0, 0); const par = info[x.p]; x.bone.position.copy(par ? x.s.clone().sub(par.s) : x.s); if (par) par.bone.add(x.bone); bones[i] = x.bone; });
  info[0].bone.updateMatrixWorld(true); return { bones, info, sk: new T.Skeleton(bones) }; };
// ---------- cena ----------
let R = null, tv = null;
const build = () => { tv = [0, 1, 2, 3, 4, 5].map(() => new T.Vector3());
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 1, .05, 40);
  scene.add(new T.HemisphereLight(0xeaf4ff, 0x6f7884, 1.15)); const key = new T.DirectionalLight(0xffffff, 2.3); key.position.set(2.5, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2.6, bottom: -1 }); key.shadow.bias = -.0004; scene.add(key);
  const fill = new T.DirectionalLight(0xe6eef6, .9); fill.position.set(-3, 2.2, -2.5); scene.add(fill); const rim = new T.DirectionalLight(0xffffff, .55); rim.position.set(-1, 3, 4); scene.add(rim);
  const floor = new T.Mesh(new T.CircleGeometry(2.6, 64), new T.ShadowMaterial({ opacity: .16 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const { g, reg } = geometry(), { bones, info, sk } = skeleton();
  const glow = { value: 0 }, mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .58, metalness: 0 });
  mat.onBeforeCompile = sh => { sh.uniforms.uGlow = glow;
    sh.vertexShader = 'attribute vec3 aAxis;\nvarying vec3 vAx;\nvarying vec3 vBP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vAx = aAxis; vBP = position;');
    sh.fragmentShader = 'uniform float uGlow;\nvarying vec3 vAx;\nvarying vec3 vBP;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hot = step(0.3, vColor.r - vColor.b);
      vec3 ax = normalize(vAx + vec3(1e-4));
      vec3 pr = vBP - ax * dot(vBP, ax);
      float f = sin(dot(pr, normalize(cross(ax, vec3(0.31, 0.52, 0.79)))) * 900.0) * 0.5 + 0.5;
      float f2 = sin(dot(pr, normalize(cross(ax, vec3(0.8, 0.1, 0.59)))) * 1500.0) * 0.5 + 0.5;
      float fib = mix(1.0, 0.8 + 0.2 * (f * 0.7 + f2 * 0.3), hot * step(0.01, length(vAx)));
      diffuseColor.rgb *= fib;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (1.0 + 0.3 * uGlow) + vec3(0.1 * uGlow, 0.0, 0.0), hot);`); };
  const mesh = new T.SkinnedMesh(g, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.add(bones[0]); mesh.bind(sk);
  const body = new T.Group(); body.add(mesh); scene.add(body);
  const eq = new T.Group(); scene.add(eq);
  return { renderer, scene, camera, body, mesh, bones, info, reg, glow, eq, yaw: 0, user: 0 }; };
const paint = (main, sec) => { const RN = BODY.H.reg, m = new Set((REGN[main] || []).map(x => RN.indexOf(x))), s = new Set(sec.flatMap(x => REGN[x] || []).map(x => RN.indexOf(x))), c = R.mesh.geometry.attributes.color.array;
  for (let i = 0; i < R.reg.length; i++) { const g = R.reg[i]; let r = g ? .86 : .78, gg = g ? .865 : .785, b = g ? .87 : .79; if (g && m.has(g)) { r = .93; gg = .28; b = .16; } else if (g && s.has(g)) { r = .98; gg = .62; b = .45; } const k = R.reg.ao ? R.reg.ao[i] : 1; c[i * 3] = r * k; c[i * 3 + 1] = gg * k; c[i * 3 + 2] = b * k; }
  if (A3.debugBones) { const si = R.mesh.geometry.attributes.skinIndex, sw = R.mesh.geometry.attributes.skinWeight; for (let i = 0; i < R.reg.length; i++) { let b = 0, w = -1; for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > w) { w = sw.getComponent(i, k); b = si.getComponent(i, k); } const h = (b * 0.618) % 1; const col = new T.Color().setHSL(h, .8, .55); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; } }
  R.mesh.geometry.attributes.color.needsUpdate = true; };
// ---------- exercício → equipamento, pega e padrão ----------
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const CUSTOM = [[/peck deck invertido|crucifixo invertido|elevacao posterior|deltoide posterior|reverse fly/, 'rfly'], [/peck deck|voador|crucifixo|cross-?over|cruz de ferro|fly/, 'fly'],
  [/supino.*maquina|chest press|supino em pe no cabo|supino no cabo/, 'mpress'], [/agachamento hack|hack squat/, 'hack']];
const setup = (key, name, equip) => { const n = N(name), e = equip || '', fx = (OS.Anim.fix ? OS.Anim.fix({ name }) : '').split(':');
  let pat = key; if (!fx[0]) for (const [rx, k] of CUSTOM) if (rx.test(n)) { pat = k; break; }
  let tool = /smith/.test(n) ? 'smith' : /\bcabo\b|polia|\bcorda\b(?!.*saltar)|cross|face pull|puxada|pulldown|pallof|lenhador/.test(n) && !/subida a corda|saltar/.test(n) ? 'cable'
    : e === 'Máquina' || /maquina|peck deck|voador|cadeira|mesa flexora|leg press|hack/.test(n) ? 'machine' : e === 'Barra' ? 'barbell' : e === 'Barra W' ? 'ez' : e === 'Halteres' ? 'db' : e === 'Kettlebell' ? 'kb' : e === 'Elástico' ? 'band' : e === 'Bola medicinal' ? 'ball' : 'none';
  if (['pullup', 'hangraise', 'dips', 'benchdip', 'pushup', 'plank', 'climber', 'bridge', 'crunch', 'situp', 'legraise', 'backext', 'run', 'walk', 'bike', 'rower', 'jump', 'kick4', 'nordic', 'invrow', 'ropes', 'stkick', 'hipabd', 'hipadd', 'deadbug', 'sideplank', 'stepside'].includes(pat) && tool !== 'cable' && tool !== 'machine') tool = pat === 'backext' && /barra|anilha|halter/.test(n) ? tool : pat === 'walk' && tool === 'db' ? 'db' : 'none';
  if (fx[1]) tool = fx[1];
  if (['legpress', 'legext', 'legcurl', 'seatcurl', 'seatcalf', 'abduct', 'adduct'].includes(pat) && tool !== 'cable') tool = 'machine';
  if (pat === 'pulldown' && tool !== 'machine') tool = 'cable';
  const one = /unilateral|um braco|concentrad|serrote|goblet|pullover|alternad|halo|get-up|moinho|em oito|pistol com kettlebell/.test(n) || pat === 'goblet' || pat === 'kbsquat' || pat === 'pullover' || pat === 'swing' && tool === 'kb';
  let att = tool !== 'cable' ? '' : /corda|face pull/.test(n) ? 'rope' : /triangulo|barra v|pegada neutra/.test(n) ? 'vbar' : pat === 'pulldown' && !/unilateral/.test(n) ? 'latbar' : /barra|\(barra\)/.test(n) || pat === 'curl' && !one ? 'bar' : 'handle';
  if (pat === 'fly' || pat === 'rfly') att = tool === 'cable' ? 'handles' : att;
  if (fx[2]) att = fx[2]; if (tool === 'cable' && !att) att = 'handle';
  let grip = /martelo|hammer|neutra|triangulo|barra v|corda|face pull/.test(n) ? 'flex' : /supinad|chin|curl|rosca|scott/.test(n) && !/inverso|invertid|punho|martelo/.test(n) ? 'out' : 'in';
  if (pat === 'latraise' || pat === 'frontraise' && tool === 'db') grip = pat === 'latraise' ? 'fwd' : 'in';
  if (['pushup', 'plank', 'climber'].includes(pat)) grip = 'flat';
  if (tool === 'db' && (pat === 'row' || pat === 'walk' || pat === 'rdl' || pat === 'lunge' || pat === 'stepup' || pat === 'squat' || pat === 'calf' || pat === 'shrug')) grip = 'flex';
  if (pat === 'fly' || pat === 'rfly') grip = tool === 'machine' ? 'flex' : 'flex';
  if (['dips', 'benchdip'].includes(pat)) grip = 'flex';
  const gw = att === 'rope' ? .05 : att === 'vbar' ? .045 : att === 'latbar' ? (/fechad|supinad/.test(n) ? .2 : .36) : /fechad|diamante|close/.test(n) ? .12 : pat === 'skull' ? .13 : tool === 'ez' ? .15 : pat === 'curl' && tool !== 'db' ? .18
    : pat === 'pullup' ? (/supinad|chin|fechad/.test(n) ? .17 : .34) : pat === 'bench' || pat === 'incline' || pat === 'decline' ? .27 : pat === 'squat' ? .3 : pat === 'deadlift' || pat === 'rdl' || pat === 'row' ? (/sumo/.test(n) ? .15 : .24)
    : pat === 'shrug' ? .25 : pat === 'uprow' ? .12 : tool === 'db' ? (pat === 'curl' ? .2 : pat === 'ohp' || pat === 'seatohp' ? .27 : .22) : pat === 'dips' ? .25 : pat === 'pushup' || pat === 'plank' || pat === 'climber' ? .22 : .22;
  if (pat === 'wristcurl' || pat === 'kneelcrunch' && att === 'rope' || pat === 'sapd') grip = pat === 'wristcurl' ? 'out' : pat === 'sapd' && att === 'rope' ? 'flex' : 'in';
  const props = ((OS.Anim.patterns[pat] || [])[4] || ''), fix = (tool === 'barbell' || tool === 'smith' || tool === 'ez') && /backbar/.test(props) ? 'back' : (tool === 'barbell' || tool === 'smith') && /chestbar/.test(props) ? 'chest' : (/hipbar/.test(props) || pat === 'bridge') && /barbell|smith/.test(tool) ? 'hip' : pat === 'sidebend' && tool === 'barbell' ? 'back' : '';
  const stand = (pat === 'mpress' || pat === 'rfly' || pat === 'fly') && tool !== 'machine' && (tool === 'band' || tool === 'ball' || tool === 'none' || tool === 'cable' && !/banco|deitad|sentad/.test(n)) && !(pat === 'rfly' && /curvad|deitad|cabeca apoiada|sentad|baixo/.test(n));
  return { pat, tool, att, grip, gw, one, n, fix, stand }; };
// ---------- articulações-alvo em 3D (metros; chão em y = 0; frente = +X; lado direito = +Z) ----------
const to3 = (p, z = 0) => [(p[0] - 100) * S, (G - p[1]) * S, z];
const fwdOf = (hip, sh) => { const dx = sh[0] - hip[0], dy = sh[1] - hip[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l, 0]; };
const STANCE = { squat: [.15, .17], frontsquat: [.14, .15], goblet: [.15, .17], kbsquat: [.15, .17], hack: [.13, .14], deadlift: [.11, .1], clean: [.11, .1], snatch: [.13, .13], rdl: [.1, .09], legpress: [.15, .14], swing: [.14, .15], jump: [.12, .12] };
const sideJ = (key, u, st) => { const j = OS.Anim.joints(key, u); if (!j) return null; const gw = st.gw, s0 = .17, [kz, az] = STANCE[key] || [.095, .09];
  const flare = /bench|incline|decline|skull|pullover|mpress/.test(key) ? .07 : /pulldown|pullup|ohp|seatohp|snatch/.test(key) ? .1 : key === 'row' || key === 'cablerow' || key === 'machrow' ? .05 : key === 'squat' ? .12 : .015;
  const arm = (s, sh, el, ha) => { const hz = s * gw, ez = s * (s0 + (gw - s0) * .5 + flare); return [to3(sh, s * s0), to3(el, ez), to3(ha, hz)]; };
  const [shR, elR, haR] = arm(1, j.sh, j.el, j.ha), [shL, elL, haL] = arm(-1, j.sh, j.el2, j.ha2), hip = to3(j.hip), sh = to3(j.sh);
  return { hip, sh, fwd: fwdOf(hip, sh), shR, elR, haR, shL, elL, haL, knR: to3(j.kn, kz), anR: to3(j.an, az), knL: to3(j.kn2, -kz), anL: to3(j.an2, -az) }; };
const frontJ = (key, u, st) => { const p = OS.Anim.pose(key, u); if (!p) return null; const L = OS.Anim.L, k = S, legA = p.leg * D, armA = p.arm * D, elA = (p.arm + p.el) * D, lean = (p.lean || 0) * D;
  const hy = p.seat ? .6 : (L.th + L.sn) * Math.cos(legA) * k + .08, hip = [0, hy, 0], sh = [0, hy + .5 * Math.cos(lean) + (p.sh ? -p.sh * k : 0), .5 * Math.sin(lean)];
  const arm = s => { const s0 = [0, sh[1], sh[2] + s * .17], el = [0, s0[1] - Math.cos(armA) * .27, s0[2] + s * Math.sin(armA) * .27], ha = [.03, el[1] - Math.cos(elA) * .25, el[2] + s * Math.sin(elA) * .25]; return [s0, el, ha]; };
  const leg = s => { const h0 = [0, hy, s * .09]; if (p.seat) { const kn = [.42, hy, h0[2] + s * Math.sin(legA) * .42]; return [kn, [kn[0], kn[1] - .4, kn[2]]]; } const kn = [0, hy - Math.cos(legA) * .42, h0[2] + s * Math.sin(legA) * .42]; return [kn, [0, kn[1] - Math.cos(legA) * .4, kn[2] + s * Math.sin(legA) * .4]]; };
  const [shR, elR, haR] = arm(1), [shL, elL, haL] = arm(-1), [knR, anR] = leg(1), [knL, anL] = leg(-1);
  if (st && /barbell|ez|smith/.test(st.tool) || st && st.tool === 'cable' && st.att !== 'handle' && st.att !== 'handles') { haR[2] = Math.min(haR[2], st.gw || .15); haL[2] = Math.max(haL[2], -(st.gw || .15)); haR[0] = haL[0] = .1; }
  return { hip, sh, fwd: [1, 0, 0], shR, elR, haR, shL, elL, haL, knR, anR, knL, anL, seat: p.seat, front: 1 }; };
// padrões 3D próprios (movimentos fora do plano lateral): crucifixo/peck deck/cross-over, crucifixo invertido, press sentado, hack
const lerp = (a, b, t) => a + (b - a) * t;
const customJ = (key, u, st) => { const seat = st.tool === 'machine', lying = st.tool === 'db' || st.tool === 'none' || /banco|deitado|inclinad/.test(st.n) && st.tool !== 'cable';
  if (key === 'fly') { const a = (st.tool === 'cable' && !lying ? lerp(-20, 72, u) : lerp(-10, 80, u)) * D; // abertura → braços à frente
    if (lying && !seat) { const hip = [.08, .62, 0], sh = [-.42, .66, 0], up = [0, 1, 0]; const ha = s => [sh[0] + .04, sh[1] + Math.sin(a) * .5 + .05, s * (.17 + Math.cos(a) * .48)], el = s => [sh[0] + .02, sh[1] + Math.sin(a) * .3, s * (.17 + Math.cos(a) * .3) + s * .02];
      return { hip, sh, fwd: up, shR: [sh[0], sh[1], .17], elR: el(1), haR: ha(1), shL: [sh[0], sh[1], -.17], elL: el(-1), haL: ha(-1), knR: [.48, .52, .14], anR: [.5, .06, .15], knL: [.48, .52, -.14], anL: [.5, .06, -.15], lie: 1 }; }
    const hip = seat ? [0, .62, 0] : [0, .95, 0], sh = seat ? [-.03, 1.12, 0] : [.04, 1.45, 0], lean = seat ? 0 : .06, y = sh[1] - (st.tool === 'cable' ? .05 : 0);
    const ha = s => [sh[0] + .08 + Math.sin(a) * .5, y - .02, s * (.17 + Math.cos(a) * .48)], el = s => [sh[0] + .02 + Math.sin(a) * .28, y - .03, s * (.17 + Math.cos(a) * .3) + s * .03];
    const legs = seat ? { knR: [.42, .6, .12], anR: [.45, .1, .12], knL: [.42, .6, -.12], anL: [.45, .1, -.12] } : { knR: [.03, .52, .1], anR: [0, .06, .1], knL: [.03, .52, -.1], anL: [-.02, .06, -.11] };
    return Object.assign({ hip, sh: [sh[0] + lean, sh[1], 0], fwd: [1, 0, 0], shR: [sh[0], sh[1], .17], elR: el(1), haR: ha(1), shL: [sh[0], sh[1], -.17], elL: el(-1), haL: ha(-1), seat }, legs); }
  if (key === 'rfly') { const a = lerp(80, 0, u) * D; const bent = !seat && !st.stand; const hip = bent ? [0, .9, 0] : [0, .62, 0], sh = bent ? [.4, 1.1, 0] : [.04, 1.12, 0];
    const yb = bent ? sh[1] - .02 : sh[1] - .02, ha = s => bent ? [sh[0] + .02, yb - Math.sin(a) * .52, s * (.17 + Math.cos(a) * .5)] : [sh[0] + .08 + Math.sin(a) * .5, yb, s * (.17 + Math.cos(a) * .48)], el = s => bent ? [sh[0], yb - Math.sin(a) * .3, s * (.17 + Math.cos(a) * .3) + s * .03] : [sh[0] + .02 + Math.sin(a) * .28, yb, s * (.17 + Math.cos(a) * .3) + s * .03];
    const sd = st.stand && !seat, legs = bent ? { knR: [.08, .5, .12], anR: [0, .06, .12], knL: [.08, .5, -.12], anL: [0, .06, -.12] } : sd ? { knR: [.03, .52, .1], anR: [0, .06, .1], knL: [.03, .52, -.1], anL: [-.02, .06, -.11] } : { knR: [.42, .6, .12], anR: [.45, .1, .12], knL: [.42, .6, -.12], anL: [.45, .1, -.12] };
    if (sd) { hip[1] = .95; sh[1] = 1.45; }
    return Object.assign({ hip, sh, fwd: fwdOf(hip, sh), shR: [sh[0], sh[1], .17], elR: el(1), haR: ha(1), shL: [sh[0], sh[1], -.17], elL: el(-1), haL: ha(-1), seat: !bent && !sd }, legs); }
  if (key === 'mpress') { const sd = st.stand, hip = sd ? [0, .95, 0] : [0, .62, 0], sh = sd ? [.03, 1.45, 0] : [-.04, 1.13, 0], r = lerp(.06, .5, u), y = sh[1] - .08;
    const ha = s => [sh[0] + .06 + r, y, s * .24], el = s => [sh[0] + Math.max(.02, r * .55) - .08 * (1 - u), y - .06 * (1 - u), s * (.27 + .08 * (1 - u))];
    const lg = sd ? { knR: [.03, .52, .1], anR: [0, .06, .1], knL: [.03, .52, -.1], anL: [-.02, .06, -.11] } : { knR: [.42, .6, .12], anR: [.45, .1, .12], knL: [.42, .6, -.12], anL: [.45, .1, -.12], seat: 1 };
    return Object.assign({ hip, sh, fwd: [1, 0, 0], shR: [sh[0], sh[1], .17], elR: el(1), haR: ha(1), shL: [sh[0], sh[1], -.17], elL: el(-1), haL: ha(-1) }, lg); }
  if (key === 'extrot') { const hip = [0, .95, 0], sh = [.03, 1.45, 0], a = lerp(0, 80, u) * D, el = s => [sh[0] + .02, sh[1] - .28, s * .2], ha = s => [sh[0] + .02 + Math.cos(a) * .26, sh[1] - .3, s * (.2 + Math.sin(a) * .26)];
    return { hip, sh, fwd: [1, 0, 0], shR: [sh[0], sh[1], .17], elR: el(1), haR: ha(1), shL: [sh[0], sh[1], -.17], elL: el(-1), haL: [sh[0] + .05, sh[1] - .55, -.2], knR: [.03, .52, .1], anR: [0, .06, .1], knL: [.03, .52, -.1], anL: [-.02, .06, -.11] }; }
  if (key === 'hack') { const J = sideJ('squat', u, st); J.hack = 1; return J; }
  return null; };
A3.joints = (key, u, st) => { if (['fly', 'rfly', 'mpress', 'hack', 'extrot'].includes(key)) return customJ(key, u, st); const pat = OS.Anim.patterns[key]; return pat && pat[0] === 'f' ? frontJ(key, u, st) : sideJ(key, u, st); };
// ---------- posar o esqueleto (cada osso: direção + orientação) ----------
const V3 = a => new T.Vector3(a[0], a[1], a[2]);
const perp = (v, d) => v.clone().sub(d.clone().multiplyScalar(v.dot(d)));
const basisQ = (d, s) => { const x = d.clone().normalize(), y = perp(s, x).normalize(), z = new T.Vector3().crossVectors(x, y); return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z)); };
const ID = { pelvis: 0, spine: 1, chest: 2, neck: 3, head: 4, clav: 5, uarm: 6, farm: 7, farm2: 8, hand: 9, fing1: 10, fing2: 11, thumb: 12, thigh: 13, shin: 14, foot: 15, toes: 16 };
const bi = (name, side) => { const i = ID[name]; return side === 'L' && i >= 5 ? MIR(i) : i; };
const pose = J0 => { let J = J0; const B = R.bones, I = R.info, W = []; // W[i] = rotação no mundo (o bind não tem rotações)
  const setW = (i, dir, side) => { const b = I[i]; let s = side; if (!s || perp(s, dir.clone().normalize()).lengthSq() < 1e-5) s = new T.Vector3(1, 0, 0); const qb = basisQ(b.dir, b.side), qt = basisQ(dir, s); W[i] = qt.multiply(qb.invert()); };
  const fwd = V3(J.fwd), torso = V3(J.sh).sub(V3(J.hip)).normalize();
  setW(0, torso, fwd); setW(1, torso, fwd); setW(2, torso, fwd); setW(3, torso.clone().add(fwd.clone().multiplyScalar(.12)).normalize(), fwd); setW(4, torso.clone().add(fwd.clone().multiplyScalar(.05)).normalize(), fwd);
  const rot = (v, axis, ang) => v.clone().applyAxisAngle(axis.clone().normalize(), ang);
  // barra presa ao corpo (costas, peito, anca): as mãos vão agarrá-la (cinemática inversa de 2 ossos)
  const fix = R.st.fix; if (fix) { for (let i = 0; i < 5; i++) { const p = I[i].p; B[i].quaternion.copy(p < 0 ? W[i] : W[p].clone().invert().multiply(W[i])); }
    B[5].quaternion.identity(); B[MIR(5)].quaternion.identity(); R.body.position.set(0, 0, 0); R.body.updateMatrixWorld(true);
    const nk = new T.Vector3(), pv = new T.Vector3(); B[3].getWorldPosition(nk); B[0].getWorldPosition(pv);
    const c = fix === 'back' ? nk.clone().add(fwd.clone().multiplyScalar(-.075)).add(torso.clone().multiplyScalar(-.035)) : fix === 'chest' ? nk.clone().add(fwd.clone().multiplyScalar(.09)).add(torso.clone().multiplyScalar(-.04)) : pv.clone().add(fwd.clone().multiplyScalar(.13)).add(torso.clone().multiplyScalar(-.03));
    R.fixC = c; const gw = fix === 'back' ? .3 : fix === 'chest' ? .2 : .32;
    J = Object.assign({}, J); ['R', 'L'].forEach(sd => { const sg = sd === 'L' ? -1 : 1, Su = new T.Vector3(); B[bi('uarm', sd)].getWorldPosition(Su);
      const Tg = c.clone().add(new T.Vector3(0, 0, sg * gw)), a = I[bi('uarm', sd)].s.distanceTo(I[bi('farm', sd)].s), b = I[bi('farm', sd)].s.distanceTo(I[bi('hand', sd)].s) + .075;
      let dv = Tg.clone().sub(Su), d = Math.min(dv.length(), a + b - .002); dv.normalize(); const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
      const hint = fix === 'back' ? torso.clone().negate().add(fwd.clone().multiplyScalar(-.3)) : fix === 'chest' ? fwd.clone().add(torso.clone().multiplyScalar(-.4)) : new T.Vector3(0, 0, sg).add(torso.clone().multiplyScalar(.2));
      const pole = perp(hint, dv).normalize(), E = Su.clone().add(dv.clone().multiplyScalar(x)).add(pole.multiplyScalar(h));
      J['sh' + sd] = Su.toArray(); J['el' + sd] = E.toArray(); J['ha' + sd] = Su.clone().add(dv.multiplyScalar(d)).toArray(); }); }
  const limb = sd => { const L = sd === 'L', sg = L ? -1 : 1, sh = V3(J['sh' + sd]), el = V3(J['el' + sd]), ha = V3(J['ha' + sd]);
    W[bi('clav', sd)] = W[2].clone();
    const ud = el.clone().sub(sh).normalize(), fd = ha.clone().sub(el).normalize();
    let us = fd.clone().sub(ud).add(fwd.clone().multiplyScalar(.18)).add(torso.clone().multiplyScalar(.06)); us = perp(us, ud); if (us.lengthSq() < 1e-4) us = perp(fwd, ud);
    setW(bi('uarm', sd), ud, us);
    const qT = new T.Quaternion().setFromUnitVectors(ud, fd), fs = us.clone().normalize().applyQuaternion(qT); // lado do antebraço sem rotação (transporte paralelo)
    // polegar e palma conforme a pega
    const g = R.st.grip; let thumb;
    if (g === 'out') thumb = new T.Vector3(0, 0, sg); else if (g === 'in') thumb = new T.Vector3(0, 0, -sg); else if (g === 'fwd') thumb = fwd.clone(); else if (g === 'flat') thumb = new T.Vector3(0, 0, -sg); else thumb = fs.clone();
    let hd = fd.clone();
    if (g === 'flat') hd = new T.Vector3(1, 0, 0).add(fwd.clone().multiplyScalar(.2)).normalize();
    thumb = perp(thumb, hd); if (thumb.lengthSq() < 1e-4) thumb = perp(fs, hd); thumb.normalize();
    let pn = new T.Vector3().crossVectors(thumb, hd).normalize().multiplyScalar(sg); // normal da palma (direita: polegar × direção)
    if (g === 'flat') pn = new T.Vector3(0, -1, 0);
    const fs0 = perp(fs, fd).normalize(), pnF = perp(pn, fd).normalize(); let phi = Math.atan2(new T.Vector3().crossVectors(fs0, pnF).dot(fd), fs0.dot(pnF));
    if (g === 'flat') phi = 0;
    setW(bi('farm', sd), fd, rot(fs0, fd, phi * .3)); setW(bi('farm2', sd), fd, rot(fs0, fd, phi * .75)); setW(bi('hand', sd), hd, g === 'flat' ? pn : rot(fs0, fd, phi));
    const curl = R.hold ? [1.45, 1.55, .8] : g === 'flat' ? [.05, .05, .2] : [.35, .45, .3], hq = W[bi('hand', sd)], hdW = I[bi('hand', sd)].dir.clone().applyQuaternion(hq), hsW = new T.Vector3(1, 0, 0).applyQuaternion(hq), ax = new T.Vector3().crossVectors(hdW, hsW).normalize();
    W[bi('fing1', sd)] = new T.Quaternion().setFromAxisAngle(ax, curl[0]).multiply(hq.clone()); W[bi('fing2', sd)] = new T.Quaternion().setFromAxisAngle(ax, curl[0] + curl[1]).multiply(hq.clone());
    W[bi('thumb', sd)] = new T.Quaternion().setFromAxisAngle(hdW, -sg * curl[2] * .6).multiply(new T.Quaternion().setFromAxisAngle(ax, curl[2])).multiply(hq.clone());
    const hip = V3(J.hip).add(new T.Vector3(0, 0, sg * .08)), kn = V3(J['kn' + sd]), an = V3(J['an' + sd]), td = kn.clone().sub(hip).normalize(), sd2 = an.clone().sub(kn).normalize();
    let ts = td.clone().sub(sd2).add(fwd.clone().multiplyScalar(.25)); ts = perp(ts, td); if (ts.lengthSq() < 1e-4) ts = perp(fwd, td); setW(bi('thigh', sd), td, ts);
    const ss = ts.clone().normalize().applyQuaternion(new T.Quaternion().setFromUnitVectors(td, sd2)); setW(bi('shin', sd), sd2, ss);
    let ft = new T.Vector3(-sd2.y, sd2.x, 0); if (J.front || J.lie) ft.set(1, -.15, 0); else if (ft.x < .2 && Math.abs(sd2.y) > .5) ft.set(1, Math.max(-.4, ft.y), 0); if (J.rise && !L) ft.y -= .0;
    if (R.st.pat === 'calf' || R.st.pat === 'seatcalf') ft = rot(new T.Vector3(1, 0, 0), new T.Vector3(0, 0, 1), -R.u * .55);
    setW(bi('foot', sd), ft.normalize(), perp(sd2.clone().negate(), ft)); W[bi('toes', sd)] = W[bi('foot', sd)].clone(); };
  limb('R'); limb('L');
  // aplicar: local = inverso(pai) × mundo
  for (let i = 0; i < I.length; i++) { const p = I[i].p; B[i].quaternion.copy(p < 0 ? W[i] : W[p].clone().invert().multiply(W[i])); }
  R.body.position.set(0, 0, 0); R.body.updateMatrixWorld(true);
  const anc = J.front || J.seat || J.lie || ['fly', 'rfly', 'mpress', 'extrot'].includes(R.st.pat) ? 'hip' : ((OS.Anim.patterns[R.st.pat === 'hack' ? 'squat' : R.st.pat] || [])[1] || 'ankle'), P = new T.Vector3();
  if (anc === 'hip') { B[0].getWorldPosition(P); R.body.position.add(V3(J.hip).sub(P)); }
  else if (anc === 'hand') { grip('R', P); R.body.position.add(V3(J.haR).sub(P).setZ(0)); }
  else { B[bi('foot', 'R')].getWorldPosition(P); R.body.position.add(V3(J.anR).add(new T.Vector3(0, .012, 0)).sub(P).setZ(0)); }
  R.body.updateMatrixWorld(true); };
// ponto onde a mão agarra (no meio da palma, junto aos dedos dobrados) e eixo da pega
const grip = (sd, out, axis) => { const h = R.bones[bi('hand', sd)], q = new T.Quaternion(); h.getWorldPosition(out); h.getWorldQuaternion(q); const I = R.info[bi('hand', sd)], d = I.dir.clone().applyQuaternion(q), s = new T.Vector3(1, 0, 0).applyQuaternion(q);
  out.add(d.multiplyScalar(.075)).add(s.clone().multiplyScalar(.022 * (R.st.grip === 'flat' ? -1 : 1))); if (axis) axis.crossVectors(I.dir.clone().applyQuaternion(q), s).normalize(); return out; };
// ---------- equipamento ----------
const mats = () => R.m || (R.m = { steel: new T.MeshStandardMaterial({ color: 0xb5bec8, roughness: .28, metalness: .9 }), dark: new T.MeshStandardMaterial({ color: 0x2b3138, roughness: .5, metalness: .3 }), plate: new T.MeshStandardMaterial({ color: 0x1f2328, roughness: .6, metalness: .2 }),
  pad: new T.MeshStandardMaterial({ color: 0x3a434d, roughness: .8 }), frame: new T.MeshStandardMaterial({ color: 0x8792a0, roughness: .35, metalness: .7 }), rope: new T.MeshStandardMaterial({ color: 0x1d2329, roughness: .9 }), band: new T.MeshStandardMaterial({ color: 0xd94b4b, roughness: .6 }), ball: new T.MeshStandardMaterial({ color: 0x3b4a5c, roughness: .7 }) });
const cyl = (r, l, m, seg = 16) => { const o = new T.Mesh(new T.CylinderGeometry(r, r, l, seg), m); o.castShadow = o.receiveShadow = true; return o; };
const boxM = (w, h, d, m) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.castShadow = o.receiveShadow = true; return o; };
const alongZ = o => { o.rotation.x = Math.PI / 2; return o; };
const barbell = (len = 1.7, ez = false) => { const M = mats(), g = new T.Group(); g.add(alongZ(cyl(.0125, len, M.steel, 12)));
  [-1, 1].forEach(s => { const sl = alongZ(cyl(.025, .36, M.steel, 14)); sl.position.z = s * (len / 2 - .18); g.add(sl); [0, 1].forEach(k => { const p = alongZ(cyl(k ? .15 : .225, .05, M.plate, 40)); p.position.z = s * (len / 2 - .33 + k * .06); g.add(p); }); const c = alongZ(cyl(.035, .04, M.steel, 14)); c.position.z = s * (len / 2 - .36); g.add(c); });
  if (ez) g.children[0].scale.set(1, 1, 1); return g; };
const dumbbell = () => { const M = mats(), g = new T.Group(); g.add(alongZ(cyl(.016, .16, M.steel, 12))); [-1, 1].forEach(s => { const h = alongZ(cyl(.055, .075, M.plate, 6)); h.position.z = s * .115; g.add(h); }); return g; };
const kettlebell = () => { const M = mats(), g = new T.Group(); const h = new T.Mesh(new T.TorusGeometry(.055, .012, 10, 24, Math.PI), M.plate); h.rotation.z = Math.PI; h.rotation.y = Math.PI / 2; g.add(h); const b = new T.Mesh(new T.SphereGeometry(.1, 24, 18), M.plate); b.position.y = -.13; b.castShadow = true; g.add(b); return g; };
const attachment = kind => { const M = mats(), g = new T.Group();
  if (kind === 'rope') { [-1, 1].forEach(s => { const r = cyl(.014, .3, M.rope, 10); r.position.set(0, -.13, s * .045); r.rotation.x = s * .25; g.add(r); const k = new T.Mesh(new T.SphereGeometry(.024, 12, 10), M.rope); k.position.set(0, -.28, s * .085); g.add(k); }); }
  else if (kind === 'latbar') { const b = alongZ(cyl(.014, .9, M.steel, 12)); g.add(b); [-1, 1].forEach(s => { const e = cyl(.014, .25, M.steel, 12); e.position.set(0, -.08, s * .5); e.rotation.x = s * .5; g.add(e); }); }
  else if (kind === 'bar') g.add(alongZ(cyl(.014, .5, M.steel, 12)));
  else if (kind === 'vbar') { [-1, 1].forEach(s => { const e = cyl(.013, .2, M.steel, 10); e.position.set(0, -.06, s * .04); e.rotation.x = s * .9; g.add(e); }); }
  else { const t = new T.Mesh(new T.TorusGeometry(.055, .009, 8, 24), M.dark); t.rotation.y = Math.PI / 2; g.add(t); g.add(alongZ(cyl(.016, .11, M.dark, 10))); }
  return g; };
const buildEq = J => { const g = R.eq, M = mats(), st = R.st, pat = st.pat; while (g.children.length) g.remove(g.children[0]); R.w = null; R.cab = null; R.lever = null; R.sled = null; R.roller = null; R.smith = null;
  const add = (o, x, y, z = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.z = rz; g.add(o); return o; };
  const bench = (x0, x1, y) => { add(boxM(Math.abs(x1 - x0), .07, .3, M.pad), (x0 + x1) / 2, y - .035); [x0 + .1, x1 - .1].forEach(x => add(boxM(.05, y - .07, .24, M.frame), x, (y - .07) / 2)); add(boxM(Math.abs(x1 - x0) - .1, .03, .3, M.frame), (x0 + x1) / 2, .015); };
  const seat = (x, y, back = true, tilt = .08) => { add(boxM(.42, .08, .4, M.pad), x + .05, y - .04); add(boxM(.06, y - .08, .06, M.frame), x + .05, (y - .08) / 2); add(boxM(.5, .04, .36, M.frame), x + .05, .02); if (back) add(boxM(.08, .66, .38, M.pad), x - .19, y + .3, 0, -tilt); };
  const hipY = J.hip[1], hx = J.hip[0];
  // superfícies onde o corpo se apoia
  if (pat === 'bench' || pat === 'skull' || pat === 'pullover' || pat === 'legcurl' || J.lie && pat === 'fly') bench(-.75, .42, hipY - .1);
  if (pat === 'incline' || pat === 'decline') { const a = pat === 'incline' ? 38 * D : -20 * D, L = .8; add(boxM(L, .07, .3, M.pad), hx - Math.cos(a) * L / 2, hipY - .1 + Math.sin(a) * L / 2, 0, -a); add(boxM(.32, .07, .3, M.pad), hx + .14, hipY - .1); add(boxM(.05, hipY - .14, .24, M.frame), hx, (hipY - .14) / 2); }
  if (pat === 'hipthrust') { const h = Math.max(.3, J.sh[1] - .06); add(boxM(.36, h, .9, M.pad), J.sh[0] - .12, h / 2); }
  if (pat === 'benchdip') { const h = Math.max(.3, J.haR[1] - .025); add(boxM(.4, h, .9, M.pad), J.haR[0] - .2, h / 2); }
  // assentos para exercícios sentados com pesos livres / cabo
  if (st.tool !== 'machine') {
    if (pat === 'seatohp' || pat === 'preacher' || pat === 'pulldown' || pat === 'machrow') seat(hx, hipY, pat === 'seatohp', .05);
    if (pat === 'pulldown') add(alongZ(cyl(.05, .42, M.pad)), J.knR[0] - .02, J.knR[1] + .1);
    if (pat === 'preacher') { add(boxM(.32, .07, .4, M.pad), J.elR[0] - .02, J.elR[1] - .05, 0, -.7); add(boxM(.05, J.elR[1] - .1, .05, M.frame), J.elR[0] - .1, (J.elR[1] - .1) / 2); }
    if (pat === 'cablerow') { add(boxM(1.3, .08, .3, M.pad), hx + .25, hipY - .1); add(boxM(1.3, hipY - .14, .2, M.frame), hx + .25, (hipY - .14) / 2); add(boxM(.06, .3, .4, M.frame), J.anR[0] + .1, .15, 0, -.3); } }
  if (pat === 'stepup') add(boxM(.5, .4, .55, M.pad), .32, .2); if (pat === 'calf' && st.tool !== 'machine') add(boxM(.32, .08, .55, M.pad), J.anR[0] + .08, .04);
  if (pat === 'backext') { add(boxM(.32, .07, .4, M.pad), hx + .05, hipY - .07, 0, .55); add(boxM(.05, hipY - .1, .05, M.frame), hx + .05, (hipY - .1) / 2); add(boxM(.12, .1, .3, M.pad), J.anR[0], J.anR[1] + .05); add(boxM(1.1, .04, .45, M.frame), hx - .1, .02, 0, .0); }
  if (pat === 'rollout' && st.tool === 'none') { R.w = { kind: 'ball', o: add(alongZ(cyl(.09, .06, M.plate, 24)), 0, 0) }; }
  if (pat === 'prone') { const dx = J.sh[0] - J.hip[0], dy = J.sh[1] - J.hip[1], a = Math.atan2(dy, dx), L = Math.hypot(dx, dy) + .25, nx = Math.sin(a) * .13, ny = -Math.cos(a) * .13; add(boxM(L, .07, .34, M.pad), (J.hip[0] + J.sh[0]) / 2 + nx - .05, (J.hip[1] + J.sh[1]) / 2 + ny - .02, 0, a); add(boxM(.06, J.hip[1] - .1, .06, M.frame), J.hip[0] + .05, (J.hip[1] - .1) / 2); add(boxM(.8, .04, .4, M.frame), J.hip[0] + .15, .02); }
  if (pat === 'inclcurl') { add(boxM(.4, .08, .4, M.pad), hx + .05, hipY - .04); add(boxM(.08, .75, .38, M.pad), hx - .27, hipY + .3, 0, -.45); add(boxM(.06, hipY - .08, .06, M.frame), hx, (hipY - .08) / 2); }
  if (pat === 'seatcurl2') { add(boxM(.42, .08, .4, M.pad), hx + .05, hipY - .04); add(boxM(.06, hipY - .08, .06, M.frame), hx + .05, (hipY - .08) / 2); }
  if (pat === 'dumbrow1') { const y = .48; add(boxM(1.0, .07, .3, M.pad), J.hip[0] + .25, y); [-.15, .6].forEach(x => add(boxM(.05, y - .04, .24, M.frame), J.hip[0] + x, (y - .04) / 2)); }
  if (pat === 'sitrow' && st.tool === 'cable') { add(boxM(.06, .3, .4, M.frame), J.anR[0] + .1, .15, 0, -.3); }
  if (pat === 'nordic') add(boxM(.14, .1, .4, M.pad), J.anR[0] - .02, J.anR[1] + .09);
  if (pat === 'wristcurl') seat(hx, hipY, false);
  if (pat === 'pullup' || pat === 'hangraise' || pat === 'invrow') { const y = J.haR[1] + .03; add(alongZ(cyl(.016, 1.3, M.steel)), J.haR[0], y); [-.62, .62].forEach(z => add(boxM(.06, y + .05, .06, M.frame), J.haR[0], (y + .05) / 2, z)); }
  if (pat === 'dips') [-1, 1].forEach(s => { const y = J.haR[1] - .02; const b = cyl(.02, .7, M.steel); b.rotation.z = Math.PI / 2; add(b, J.haR[0] - .12, y, s * .27); add(boxM(.05, y, .05, M.frame), J.haR[0] + .2, y / 2, s * .27); add(boxM(.05, y, .05, M.frame), J.haR[0] - .45, y / 2, s * .27); });
  if (pat === 'run' || pat === 'walk' && /passadeira/.test(st.n)) { add(boxM(1.5, .1, .6, M.dark), 0, .05); add(boxM(.05, 1.1, .05, M.frame), .7, .55, .3); add(boxM(.05, 1.1, .05, M.frame), .7, .55, -.3); add(boxM(.2, .08, .65, M.dark), .72, 1.1); }
  if (pat === 'bike') { add(boxM(.08, .66, .08, M.frame), hx + .45, .33); add(boxM(.3, .06, .2, M.pad), hx, hipY - .07); add(boxM(.06, hipY - .1, .06, M.frame), hx, (hipY - .1) / 2); add(boxM(.9, .05, .3, M.frame), hx + .2, .025); }
  if (pat === 'rower') { add(boxM(2.1, .06, .2, M.frame), .35, .14); add(boxM(.3, .06, .3, M.pad), hx, hipY - .06); add(boxM(.25, .45, .45, M.dark), 1.25, .25); }
  if (['crunch', 'situp', 'legraise', 'bridge', 'pushup', 'plank', 'climber', 'twist', 'rollout', 'kneelcrunch', 'kick4', 'nordic', 'floorpress', 'getup', 'sitrow', 'deadbug', 'hipthrustfloor', 'sideplank'].includes(pat)) add(boxM(1.9, .015, .7, new T.MeshStandardMaterial({ color: 0x4f6475, roughness: .9 })), J.hip[0] - .1, .0075);
  // máquinas
  if (st.tool === 'machine') {
    if (pat === 'legpress') { add(boxM(.6, .08, .45, M.pad), hx - .22, hipY - .08, 0, -.62); add(boxM(.42, .08, .45, M.pad), hx + .1, hipY - .1, 0, .15); add(boxM(.05, hipY - .12, .05, M.frame), hx, (hipY - .12) / 2); [-.27, .27].forEach(z => add(boxM(1.7, .05, .05, M.frame), hx + .75, hipY + .25, z, .78)); R.sled = add(boxM(.08, .55, .55, M.frame), 0, 0, 0, -.79); }
    else if (pat === 'legext' || pat === 'seatcurl') { seat(hx, hipY, true, .05); R.roller = alongZ(cyl(.045, .4, M.pad)); g.add(R.roller); R.lever = add(boxM(.04, .4, .04, M.frame), 0, 0); if (pat === 'seatcurl') add(alongZ(cyl(.045, .4, M.pad)), hx + .35, hipY + .12); }
    else if (pat === 'legcurl') { R.roller = alongZ(cyl(.045, .4, M.pad)); g.add(R.roller); R.lever = add(boxM(.04, .4, .04, M.frame), 0, 0); }
    else if (pat === 'seatcalf') { seat(hx, hipY, false); add(boxM(.25, .06, .45, M.pad), J.knR[0], J.knR[1] + .1); add(boxM(.25, .08, .5, M.frame), J.anR[0] + .08, .04); }
    else if (pat === 'calf' || pat === 'shrug' && /maquina/.test(st.n)) { add(boxM(.3, .08, .55, M.frame), J.anR[0] + .08, .04); R.pads = 1; }
    else if (pat === 'abduct' || pat === 'adduct') { seat(hx - .05, hipY, true, .15); R.kpad = [add(boxM(.25, .14, .05, M.pad), 0, 0), add(boxM(.25, .14, .05, M.pad), 0, 0)]; }
    else if (pat === 'hack') { R.hackpad = add(boxM(.08, .7, .4, M.pad), 0, 0); add(boxM(.6, .06, .6, M.frame), J.anR[0] + .05, .03, 0, -.3); [-1, 1].forEach(s => add(boxM(.05, 1.8, .05, M.frame), -.35, .9, s * .32, -.35)); }
    else if (pat === 'mpress' || pat === 'seatohp' || pat === 'machrow' || pat === 'preacher' || pat === 'pulldown' || pat === 'fly' || pat === 'rfly' || pat === 'crunch' || pat === 'curl' || pat === 'pushdown' || pat === 'ohtri' || pat === 'dips') {
      const sx = J.seat || ['mpress', 'seatohp', 'machrow', 'preacher', 'pulldown', 'fly', 'rfly'].includes(pat) ? hx : null;
      if (sx != null) seat(sx, hipY, pat !== 'machrow' && pat !== 'preacher' && pat !== 'pulldown' && !(pat === 'rfly'), pat === 'seatohp' ? .05 : .1);
      if (pat === 'machrow' || pat === 'rfly' && J.seat) add(boxM(.08, .4, .36, M.pad), J.sh[0] + .2, J.sh[1] - .2, 0, .1);
      if (pat === 'preacher') { add(boxM(.32, .07, .4, M.pad), J.elR[0] - .02, J.elR[1] - .05, 0, -.7); add(boxM(.05, J.elR[1] - .1, .05, M.frame), J.elR[0] - .1, (J.elR[1] - .1) / 2); }
      const pv = pat === 'pulldown' ? null : pat === 'fly' || pat === 'rfly' ? [J.sh[0] - .05, J.sh[1] + .35] : pat === 'seatohp' ? [J.sh[0] - .35, J.sh[1] + .1] : [J.sh[0] - .25, J.sh[1] + .55];
      if (pv) { R.lever = [0, 1].map(() => add(boxM(.04, .04, .04, M.frame), 0, 0)); R.pivot = pv; add(boxM(.1, pv[1] + .1, .1, M.frame), pv[0] - .1, (pv[1] + .1) / 2, -.35); add(boxM(.1, pv[1] + .1, .1, M.frame), pv[0] - .1, (pv[1] + .1) / 2, .35); add(boxM(.1, .1, .8, M.frame), pv[0] - .1, pv[1] + .1); }
    } }
  // pesos livres e cabos (presos às mãos)
  const two = !st.one;
  if (st.tool === 'barbell' || st.tool === 'ez' || st.tool === 'smith') { R.w = { kind: 'bar', o: add(barbell(st.tool === 'smith' ? 1.5 : 1.75, st.tool === 'ez'), 0, 0) };
    if (st.tool === 'smith') { [-1, 1].forEach(s => add(boxM(.05, 2.2, .05, M.frame), 0, 1.1, s * .82)); R.smith = 1; } }
  else if (st.tool === 'db') R.w = { kind: 'db', a: add(dumbbell(), 0, 0), b: two ? add(dumbbell(), 0, 0) : null };
  else if (st.tool === 'kb') R.w = { kind: 'kb', a: add(kettlebell(), 0, 0), b: two && !st.one ? add(kettlebell(), 0, 0) : null };
  else if (pat === 'ropes') { R.cab = { hands2: true, tops: [[1.4, .3, .25], [1.4, .3, -.25]], lines: [], att: [] }; [0, 1].forEach(() => { const l = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), new T.LineBasicMaterial({ color: 0x1d2329, linewidth: 3 })); g.add(l); R.cab.lines.push(l); }); }
  else if (st.tool === 'ball') { const b = new T.Mesh(new T.SphereGeometry(.12, 24, 18), M.ball); b.castShadow = true; R.w = { kind: 'ball', o: add(b, 0, 0) }; }
  else if (st.tool === 'cable' || st.tool === 'band') {
    const hands2 = st.att === 'handles' || st.one === false && st.att === 'handle' && /cross|lateral/.test(st.n);
    const high = ['pushdown', 'pulldown', 'facepull', 'woodchop', 'fly', 'crunch', 'ohtri', 'situp', 'kneelcrunch', 'sapd'].includes(pat) && !/baixo|de baixo/.test(st.n), front = !['pulldown', 'crunch', 'ohtri'].includes(pat);
    const top = pat === 'sitrow' ? [J.anR[0] + .45, .35] : pat === 'kneelcrunch' ? [J.sh[0] - .1, 2.0] : pat === 'sapd' ? [.75, 2.0] : pat === 'extrot' ? [.15, 1.12] : pat === 'hipadd' || pat === 'hipabd' ? [0, .12] : pat === 'stkick' ? [.75, .15] : pat === 'wristcurl' ? [J.haR[0] + .3, .12] : pat === 'pulldown' ? [J.hip[0] + .05, 2.25] : pat === 'pushdown' ? [J.haR[0] + .42, 2.05] : pat === 'facepull' ? [1.05, 1.6] : pat === 'crunch' ? [J.sh[0] - .15, 2.0] : pat === 'ohtri' ? [-.45, .2] : high ? [1.0, 1.95] : [.9, .12];
    if (st.tool === 'cable') { const tx = pat === 'kneelcrunch' ? J.hip[0] - .55 : top[0] + (pat === 'pulldown' ? -.25 : .12); if (pat === 'kneelcrunch') add(boxM(.55, .06, .1, M.frame), tx + .25, 2.0); [-1, 1].forEach(s => add(boxM(.07, 2.25, .07, M.frame), tx, 1.125, s * (hands2 ? .95 : .3))); add(boxM(.07, .07, hands2 ? 1.97 : .67, M.frame), tx, 2.25); if (!hands2) add(boxM(.2, .5, .25, M.dark), tx, .5); }
    R.cab = { hands2, tops: hands2 ? [[top[0] - .2, pat === 'rfly' || pat === 'latraise' ? .2 : 1.85, .9], [top[0] - .2, pat === 'rfly' || pat === 'latraise' ? .2 : 1.85, -.9]] : [[top[0], top[1], 0]], lines: [] };
    if (st.tool === 'band') R.cab.tops = [[J.anR[0] + .05, .04, 0]];
    R.cab.att = hands2 || st.one ? [add(attachment('handle'), 0, 0)].concat(hands2 ? [add(attachment('handle'), 0, 0)] : []) : [add(attachment(st.att || 'bar'), 0, 0)];
    (hands2 ? [0, 1] : [0]).forEach(() => { const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), l = new T.Line(geo, new T.LineBasicMaterial({ color: st.tool === 'band' ? 0xd94b4b : 0x20262c })); g.add(l); R.cab.lines.push(l); }); }
  R.hold = !!(R.w || R.cab || ['pullup', 'hangraise', 'dips', 'benchdip'].includes(pat) || st.tool === 'machine' && ['mpress', 'seatohp', 'machrow', 'fly', 'rfly', 'pulldown'].includes(pat)); };
const moveEq = J => { const pR = new T.Vector3(), pL = new T.Vector3(), aR = new T.Vector3(), aL = new T.Vector3(); grip('R', pR, aR); grip('L', pL, aL); const mid = pR.clone().add(pL).multiplyScalar(.5), st = R.st;
  if (R.w) { const w = R.w;
    if (w.kind === 'bar') { w.o.position.copy(st.fix && R.fixC ? R.fixC.clone().add(R.body.position) : mid); const ax = pL.clone().sub(pR).normalize(); w.o.quaternion.setFromUnitVectors(new T.Vector3(0, 0, -1), ax.lengthSq() > .5 ? ax : new T.Vector3(0, 0, -1)); if (R.smith) w.o.position.z = 0; }
    else if (w.kind === 'db' || w.kind === 'kb') { const put = (o, p, a) => { o.position.copy(p); if (w.kind === 'db') o.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), a); else { o.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), a); } };
      if (w.b) { put(w.a, pR, aR); put(w.b, pL, aL); } else { put(w.a, st.pat === 'pullover' || st.pat === 'goblet' || st.pat === 'kbsquat' ? mid : pR, st.pat === 'goblet' || st.pat === 'kbsquat' ? new T.Vector3(0, 1, 0) : aR); if (st.pat === 'goblet' || st.pat === 'kbsquat') w.a.position.y -= .04; } }
    else if (w.kind === 'ball') w.o.position.copy(mid).add(new T.Vector3(.06, 0, 0)); }
  if (R.cab) { const c = R.cab, pts = c.hands2 ? [pR, pL] : [st.one ? pR : mid];
    pts.forEach((p, i) => { const a = c.att[i]; if (a) { a.position.copy(p); const dirTo = new T.Vector3(...c.tops[Math.min(i, c.tops.length - 1)]).sub(p).normalize(); a.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dirTo); if (!c.hands2 && !st.one && st.att !== 'rope' && st.att !== 'vbar') { const ax = pL.clone().sub(pR).normalize(); const q1 = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, -1), ax); a.quaternion.copy(q1); } }
      const l = c.lines[i], tp = c.tops[Math.min(i, c.tops.length - 1)], pa = l.geometry.attributes.position; pa.setXYZ(0, p.x, p.y + (st.att === 'rope' && !c.hands2 ? .02 : 0), p.z); pa.setXYZ(1, tp[0], tp[1], tp[2]); pa.needsUpdate = true; }); }
  if (R.sled) { const f = new T.Vector3(); R.bones[bi('foot', 'R')].getWorldPosition(f); R.sled.position.set(f.x + .07, f.y + .04, 0); }
  if (R.roller) { const a = new T.Vector3(), k = new T.Vector3(); R.bones[bi('foot', 'R')].getWorldPosition(a); R.bones[bi('shin', 'R')].getWorldPosition(k); const sd = a.clone().sub(k).normalize(), side = st.pat === 'legext' ? 1 : -1;
    const n = new T.Vector3(-sd.y, sd.x, 0).multiplyScalar(side * .065); R.roller.position.copy(a).add(n).add(sd.clone().multiplyScalar(-.03)); R.roller.position.z = 0; const mid2 = k.clone().add(R.roller.position).multiplyScalar(.5); R.lever.position.set(mid2.x, mid2.y, .24); R.lever.scale.set(1, k.distanceTo(R.roller.position) / .4, 1); R.lever.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), R.roller.position.clone().sub(k).setZ(0).normalize()); }
  if (Array.isArray(R.lever) && R.pivot) [pR, pL].forEach((p, i) => { const pv = new T.Vector3(R.pivot[0], R.pivot[1], p.z), o = R.lever[i], d = p.clone().sub(pv); o.position.copy(pv.clone().add(p).multiplyScalar(.5)); o.scale.set(1, d.length() / .04, 1); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); });
  if (R.kpad) { const kR = new T.Vector3(), kL = new T.Vector3(); R.bones[bi('shin', 'R')].getWorldPosition(kR); R.bones[bi('shin', 'L')].getWorldPosition(kL); const s = st.pat === 'abduct' ? 1 : -1; R.kpad[0].position.set(kR.x - .08, kR.y, kR.z + s * .07); R.kpad[1].position.set(kL.x - .08, kL.y, kL.z - s * .07); }
  if (R.hackpad) { const c7 = new T.Vector3(), pv = new T.Vector3(); R.bones[ID.neck].getWorldPosition(c7); R.bones[0].getWorldPosition(pv); const d = c7.clone().sub(pv); R.hackpad.position.copy(pv.clone().add(c7).multiplyScalar(.5)).add(new T.Vector3(-d.y, d.x, 0).normalize().multiplyScalar(-.13)); R.hackpad.position.z = 0; R.hackpad.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); } };
// ---------- ciclo ----------
const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const jAt = u => A3.joints(R.st.pat, u, R.st);
const frame = now => { if (!R || !R.box || !R.box.isConnected) { if (R) R.raf = 0; return; } R.raf = requestAnimationFrame(frame);
  if (document.hidden) return;
  // ritmo humano: pausa, fase concêntrica (~1,1 s), contração no topo, fase excêntrica controlada (~1,6 s); acelerações suaves
  const per = 3500, t = (now - R.t0) % per, ss = x => x * x * x * (x * (x * 6 - 15) + 10);
  let u = t < 350 ? 0 : t < 1450 ? ss((t - 350) / 1100) : t < 1800 ? 1 : t < 3400 ? 1 - ss((t - 1800) / 1600) : 0;
  if (A3.forceU != null) u = A3.forceU;
  R.us = R.us == null ? u : R.us + (u - R.us) * .35; u = A3.forceU != null ? u : R.us; R.u = u; const J = jAt(u); if (!J) return;
  if (!R.eqOk) { buildEq(J); R.eqOk = 1; }
  pose(J); moveEq(J); R.glow.value = u;
  if (A3.forceYaw != null) R.yaw = A3.forceYaw; else if (!R.drag) R.yaw = R.base + Math.sin((now - R.t0) / 7000) * .3 + R.user; const c = R.center;
  if (A3.forceCam) { const f = A3.forceCam(R); R.camera.position.set(...f[0]); R.camera.lookAt(...f[1]); } else { R.camera.position.set(c[0] + Math.sin(R.yaw) * R.dist, c[1] + .3, Math.cos(R.yaw) * R.dist); R.camera.lookAt(c[0], c[1], 0); }
  const w = R.box.clientWidth, h = R.box.clientHeight; if (w && (R._w !== w || R._h !== h)) { R.renderer.setSize(w, h, false); R.camera.aspect = w / h; R.camera.updateProjectionMatrix(); R._w = w; R._h = h; }
  R.renderer.render(R.scene, R.camera); };
A3.mount = async el => { try { await A3.load(); } catch (e) { el.classList.add('fail'); el.innerHTML = OS.Anim.svg({ name: '', muscle: el.dataset.am, equip: el.dataset.ae }).replace(/data-ak="[^"]*"/, `data-ak="${el.dataset.ak}"`); return; }
  if (!R) R = build(); if (R.raf) cancelAnimationFrame(R.raf); R.box = el; R.st = setup(el.dataset.ak, el.dataset.an || '', el.dataset.ae); R.eqOk = 0; R.t0 = performance.now(); R._w = 0; R.user = 0; R.u = 0; R.us = null; R.pads = 0; R.kpad = null; R.hackpad = null; R.pivot = null;
  paint(el.dataset.am, (el.dataset.as || '').split('|').filter(Boolean));
  const pts = []; [0, .5, 1].forEach(u => { const J = jAt(u); if (J) ['sh', 'haR', 'haL', 'anR', 'anL', 'knR', 'hip', 'elR'].forEach(k => J[k] && pts.push(J[k])); });
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]).concat(0), x0 = Math.min(...xs) - .25, x1 = Math.max(...xs) + .25, y0 = Math.min(...ys), y1 = Math.max(...ys) + .3;
  const front = (OS.Anim.patterns[R.st.pat] || [])[0] === 'f' || ['fly', 'rfly', 'mpress', 'extrot'].includes(R.st.pat) && !(R.st.pat === 'fly' && R.st.tool === 'db');
  R.center = [(x0 + x1) / 2, (y0 + y1) / 2, 0]; R.dist = Math.max(x1 - x0, (y1 - y0) * 1.05, 1.0) * 1.62 + .35; R.base = front ? 1.2 : .62;
  el.innerHTML = ''; el.appendChild(R.renderer.domElement); const cv = R.renderer.domElement; cv.style.touchAction = 'none';
  cv.onpointerdown = e => { R.drag = { x: e.clientX, yaw: R.yaw, user: R.user }; try { cv.setPointerCapture(e.pointerId); } catch (er) { } }; cv.onpointermove = e => { if (R.drag) { R.yaw = R.drag.yaw - (e.clientX - R.drag.x) * .012; R.user = R.drag.user - (e.clientX - R.drag.x) * .012; } }; cv.onpointerup = cv.onpointercancel = () => { R.drag = null; };
  R.raf = requestAnimationFrame(frame); };
A3.html = (info, cls = '') => `<div class="a3d ${cls}" data-ak="${OS.Anim.pattern(info)}" data-an="${OS.U.esc(info.name || '')}" data-am="${OS.U.esc(info.muscle || '')}" data-ae="${OS.U.esc(info.equip || '')}" data-as="${OS.U.esc((info.sec || []).join('|'))}"><div class="a3d-w"><div class="fd-spin"></div><small>A carregar o corpo 3D…</small></div></div>`;
A3.setup = setup; A3._R = () => R;
new MutationObserver(ms => { if (!ms.some(m => m.addedNodes.length)) return; document.querySelectorAll('.a3d:not([data-m3])').forEach(el => { el.setAttribute('data-m3', 1); A3.mount(el); }); }).observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
