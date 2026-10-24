/* PRUMO — animações dos exercícios: boneco articulado (vista de lado ou de frente), equipamento e músculo-alvo em destaque.
   Cada padrão de movimento tem duas poses (início e fim); a animação vai e volta entre elas, como no Hevy. */
(() => {
'use strict';
const AN = OS.Anim = {};
const D = Math.PI / 180, L = { tor: 41, neck: 6, head: 7.5, ua: 23, fa: 21, th: 33, sn: 31, ft: 9 };
const v = (a, len) => [Math.sin(a * D) * len, Math.cos(a * D) * len]; // ângulo absoluto: 0 = para baixo, 90 = para a frente, 180 = para cima
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
// ---------- padrões: [vista, âncora, pose A, pose B, adereços] ----------
// pose: tor, th, sn, ua, fa (+ th2, sn2, ua2, fa2 para o lado de trás), hip:[x,y] quando a âncora é a anca
const G = 142; // linha do chão
const P = {
  squat: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: -45, fa: 150 }, { tor: 140, th: 95, sn: -28, ua: -30, fa: 165 }, 'backbar'],
  frontsquat: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: 70, fa: 200 }, { tor: 158, th: 95, sn: -30, ua: 80, fa: 210 }, 'chestbar'],
  goblet: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: 15, fa: 170 }, { tor: 150, th: 100, sn: -30, ua: 30, fa: 175 }, 'chest1'],
  lunge: ['s', 'ankle', { tor: 180, th: 20, sn: 5, th2: -25, sn2: -15, ua: 0, fa: 0 }, { tor: 178, th: 85, sn: -5, th2: -20, sn2: -95, ua: 0, fa: 0 }, 'hands'],
  stepup: ['s', 'ankle', { tor: 175, th: 70, sn: -5, th2: -10, sn2: -10, ua: 0, fa: 0, dy: 0 }, { tor: 180, th: 5, sn: 0, th2: 60, sn2: -40, ua: 0, fa: 0 }, 'box'],
  deadlift: ['s', 'ankle', { tor: 112, th: 60, sn: -18, ua: 0, fa: 0 }, { tor: 180, th: 0, sn: 0, ua: 0, fa: 0 }, 'hands'],
  rdl: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: 0, fa: 0 }, { tor: 100, th: 12, sn: 4, ua: 0, fa: 0 }, 'hands'],
  goodmorning: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: -45, fa: 150 }, { tor: 100, th: 12, sn: 4, ua: -45, fa: 150 }, 'backbar'],
  hipthrust: ['s', 'ankle', { tor: -112, th: 55, sn: -5, ua: -60, fa: 20 }, { tor: -88, th: 92, sn: -5, ua: -75, fa: 10 }, 'bench_back,hipbar'],
  bridge: ['s', 'ankle', { tor: -95, th: 60, sn: -8, ua: -100, fa: -100 }, { tor: -70, th: 98, sn: -8, ua: -100, fa: -100 }, 'floor'],
  legpress: ['s', 'hip', { hip: [60, 92], tor: -125, th: 150, sn: 60, ua: -120, fa: -80 }, { hip: [60, 92], tor: -125, th: 110, sn: 110, ua: -120, fa: -80 }, 'sled'],
  legext: ['s', 'hip', { hip: [92, 88], tor: 186, th: 90, sn: 0, ua: 0, fa: 70 }, { hip: [92, 88], tor: 186, th: 90, sn: 85, ua: 0, fa: 70 }, 'seat,shinpad'],
  legcurl: ['s', 'hip', { hip: [100, 86], tor: -90, th: 90, sn: 90, ua: -170, fa: -100 }, { hip: [100, 86], tor: -90, th: 92, sn: 205, ua: -170, fa: -100 }, 'flatbench,heelpad'],
  seatcurl: ['s', 'hip', { hip: [92, 86], tor: 190, th: 90, sn: 80, ua: 10, fa: 80 }, { hip: [92, 86], tor: 190, th: 90, sn: -15, ua: 10, fa: 80 }, 'seat,heelpad'],
  calf: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: 0, fa: 0, rise: 0 }, { tor: 180, th: 0, sn: 0, ua: 0, fa: 0, rise: 9 }, 'step'],
  seatcalf: ['s', 'hip', { hip: [92, 98], tor: 182, th: 90, sn: 0, ua: 10, fa: 80, rise: 0 }, { hip: [92, 98], tor: 182, th: 90, sn: 0, ua: 10, fa: 80, rise: 7 }, 'seat'],
  abduct: ['f', 'hip', { hip: [100, 95], arm: 10, el: 0, leg: 6, seat: 1 }, { hip: [100, 95], arm: 10, el: 0, leg: 32, seat: 1 }, ''],
  adduct: ['f', 'hip', { hip: [100, 95], arm: 10, el: 0, leg: 32, seat: 1 }, { hip: [100, 95], arm: 10, el: 0, leg: 6, seat: 1 }, ''],
  bench: ['s', 'hip', { hip: [118, 100], tor: -90, th: 70, sn: -3, ua: 35, fa: 178 }, { hip: [118, 100], tor: -90, th: 70, sn: -3, ua: 178, fa: 180 }, 'flatbench,handsbar'],
  incline: ['s', 'hip', { hip: [112, 96], tor: -128, th: 70, sn: -5, ua: 60, fa: 200 }, { hip: [112, 96], tor: -128, th: 70, sn: -5, ua: 168, fa: 170 }, 'inclinebench,handsbar'],
  decline: ['s', 'hip', { hip: [112, 80], tor: -70, th: 120, sn: 30, ua: 20, fa: 160 }, { hip: [112, 80], tor: -70, th: 120, sn: 30, ua: 165, fa: 170 }, 'declinebench,handsbar'],
  fly: ['s', 'hip', { hip: [118, 100], tor: -90, th: 70, sn: -3, ua: 178, fa: 175 }, { hip: [118, 100], tor: -90, th: 70, sn: -3, ua: 70, fa: 95 }, 'flatbench,hands'],
  pushup: ['s', 'hand', { tor: 115, th: -65, sn: -65, ua: 0, fa: 0 }, { tor: 104, th: -76, sn: -76, ua: -75, fa: 15 }, 'floor', { ah: [150, G - 3] }],
  plank: ['s', 'hand', { tor: 103, th: -77, sn: -77, ua: 0, fa: 90 }, { tor: 104, th: -76, sn: -76, ua: 0, fa: 90 }, 'floor', { ah: [158, G - 3] }],
  dips: ['s', 'hand', { tor: 178, th: 10, sn: -40, ua: 2, fa: 2 }, { tor: 160, th: 25, sn: -60, ua: -65, fa: 8 }, 'parallel', { ah: [100, 66] }],
  benchdip: ['s', 'hand', { tor: 180, th: 90, sn: 90, ua: -15, fa: -5 }, { tor: 178, th: 80, sn: 95, ua: -75, fa: 5 }, 'benchbehind', { ah: [62, 78] }],
  pullup: ['s', 'hand', { tor: 180, th: 8, sn: -25, ua: 178, fa: 180 }, { tor: 172, th: 15, sn: -35, ua: 25, fa: 168 }, 'bar'],
  pulldown: ['s', 'hip', { hip: [95, 92], tor: 192, th: 90, sn: 5, ua: 172, fa: 178 }, { hip: [95, 92], tor: 200, th: 90, sn: 5, ua: 25, fa: 165 }, 'seat,cabletop,handsbar'],
  row: ['s', 'ankle', { tor: 118, th: 28, sn: -12, ua: 0, fa: 0 }, { tor: 118, th: 28, sn: -12, ua: -65, fa: -5 }, 'hands'],
  cablerow: ['s', 'hip', { hip: [75, 102], tor: 178, th: 88, sn: 70, ua: 85, fa: 88 }, { hip: [75, 102], tor: 196, th: 88, sn: 70, ua: -35, fa: 80 }, 'floor,cablefront,hands'],
  machrow: ['s', 'hip', { hip: [80, 92], tor: 175, th: 90, sn: 5, ua: 85, fa: 88 }, { hip: [80, 92], tor: 182, th: 90, sn: 5, ua: -35, fa: 80 }, 'seat,chestpad,hands'],
  ohp: ['s', 'ankle', { tor: 182, th: 0, sn: 0, ua: 35, fa: 175 }, { tor: 180, th: 0, sn: 0, ua: 176, fa: 180 }, 'handsbar'],
  seatohp: ['s', 'hip', { hip: [95, 92], tor: 184, th: 90, sn: 5, ua: 35, fa: 175 }, { hip: [95, 92], tor: 182, th: 90, sn: 5, ua: 176, fa: 180 }, 'seat,hands'],
  latraise: ['f', 'hip', { hip: [100, 82], arm: 6, el: 8, leg: 6 }, { hip: [100, 82], arm: 88, el: 12, leg: 6 }, ''],
  frontraise: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: 5, fa: 5 }, { tor: 180, th: 0, sn: 0, ua: 95, fa: 95 }, 'hands'],
  shrug: ['f', 'hip', { hip: [100, 82], arm: 4, el: 0, leg: 6, sh: 0 }, { hip: [100, 82], arm: 4, el: 0, leg: 6, sh: -7 }, ''],
  uprow: ['f', 'hip', { hip: [100, 82], arm: 6, el: -8, leg: 6 }, { hip: [100, 82], arm: 95, el: -150, leg: 6 }, ''],
  revfly: ['s', 'ankle', { tor: 112, th: 25, sn: -10, ua: 0, fa: 0 }, { tor: 112, th: 25, sn: -10, ua: -88, fa: -88 }, 'hands'],
  facepull: ['s', 'ankle', { tor: 182, th: 0, sn: 5, ua: 90, fa: 92 }, { tor: 186, th: 0, sn: 5, ua: -20, fa: 125 }, 'cablefronthigh,hands'],
  curl: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: 2, fa: 4 }, { tor: 180, th: 0, sn: 0, ua: 12, fa: 160 }, 'hands'],
  preacher: ['s', 'hip', { hip: [80, 92], tor: 170, th: 90, sn: 5, ua: 45, fa: 60 }, { hip: [80, 92], tor: 170, th: 90, sn: 5, ua: 45, fa: 165 }, 'seat,preacherpad,hands'],
  pushdown: ['s', 'ankle', { tor: 172, th: 3, sn: 0, ua: 4, fa: 140 }, { tor: 172, th: 3, sn: 0, ua: 4, fa: 6 }, 'cabletop,hands'],
  skull: ['s', 'hip', { hip: [118, 100], tor: -90, th: 70, sn: -3, ua: 160, fa: -145 }, { hip: [118, 100], tor: -90, th: 70, sn: -3, ua: 165, fa: 172 }, 'flatbench,handsbar'],
  ohtri: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: 172, fa: -20 }, { tor: 180, th: 0, sn: 0, ua: 175, fa: 178 }, 'hands'],
  kickback: ['s', 'ankle', { tor: 112, th: 25, sn: -10, ua: -85, fa: 0 }, { tor: 112, th: 25, sn: -10, ua: -88, fa: -88 }, 'hands'],
  crunch: ['s', 'hip', { hip: [98, 124], tor: -92, th: 140, sn: 15, ua: -140, fa: 60 }, { hip: [98, 124], tor: -128, th: 140, sn: 15, ua: -175, fa: 25 }, 'floor'],
  situp: ['s', 'hip', { hip: [98, 124], tor: -92, th: 140, sn: 15, ua: -140, fa: 60 }, { hip: [98, 124], tor: 165, th: 140, sn: 15, ua: 120, fa: 200 }, 'floor'],
  hangraise: ['s', 'hand', { tor: 180, th: 2, sn: 0, ua: 178, fa: 180 }, { tor: 178, th: 95, sn: 95, ua: 178, fa: 180 }, 'bar'],
  legraise: ['s', 'hip', { hip: [95, 124], tor: -90, th: 92, sn: 92, ua: -95, fa: -95 }, { hip: [95, 124], tor: -90, th: 172, sn: 172, ua: -95, fa: -95 }, 'floor'],
  twist: ['s', 'hip', { hip: [95, 122], tor: 140, th: 130, sn: 55, ua: 60, fa: 70 }, { hip: [95, 122], tor: 140, th: 130, sn: 55, ua: 120, fa: 115 }, 'floor,hands'],
  sidebend: ['f', 'hip', { hip: [100, 82], arm: 4, el: 0, leg: 8, lean: 0 }, { hip: [100, 82], arm: 4, el: 0, leg: 8, lean: 14 }, ''],
  woodchop: ['s', 'ankle', { tor: 168, th: 10, sn: 0, ua: 160, fa: 165 }, { tor: 140, th: 30, sn: -15, ua: 30, fa: 40 }, 'cablefronthigh,hands'],
  backext: ['s', 'hip', { hip: [95, 70], tor: 35, th: -55, sn: -55, ua: 20, fa: 30 }, { hip: [95, 70], tor: 125, th: -55, sn: -55, ua: 100, fa: 140 }, 'hyperpad'],
  pullover: ['s', 'hip', { hip: [118, 100], tor: -90, th: 70, sn: -3, ua: -110, fa: -100 }, { hip: [118, 100], tor: -90, th: 70, sn: -3, ua: 178, fa: 180 }, 'flatbench,chest1'],
  swing: ['s', 'ankle', { tor: 115, th: 35, sn: -12, ua: -15, fa: -15 }, { tor: 180, th: 0, sn: 0, ua: 92, fa: 92 }, 'kb'],
  clean: ['s', 'ankle', { tor: 112, th: 60, sn: -18, ua: 0, fa: 0 }, { tor: 180, th: 10, sn: -5, ua: 70, fa: 200 }, 'handsbar'],
  snatch: ['s', 'ankle', { tor: 112, th: 60, sn: -18, ua: 0, fa: 0 }, { tor: 178, th: 5, sn: 0, ua: 172, fa: 175 }, 'handsbar'],
  jump: ['s', 'ankle', { tor: 145, th: 80, sn: -25, ua: -40, fa: -40, rise: 0 }, { tor: 180, th: 0, sn: 0, ua: 165, fa: 170, rise: 26 }, 'floor'],
  run: ['s', 'hip', { hip: [100, 66], tor: 172, th: 40, sn: -30, th2: -30, sn2: -75, ua: -35, fa: 60, ua2: 40, fa2: 120 }, { hip: [100, 62], tor: 172, th: -30, sn: -75, th2: 40, sn2: -30, ua: 40, fa: 120, ua2: -35, fa2: 60 }, 'tread'],
  walk: ['s', 'hip', { hip: [100, 64], tor: 180, th: 22, sn: 5, th2: -18, sn2: -25, ua: 0, fa: 0, ua2: 0, fa2: 0 }, { hip: [100, 63], tor: 180, th: -18, sn: -25, th2: 22, sn2: 5, ua: 0, fa: 0, ua2: 0, fa2: 0 }, 'hands,floor'],
  bike: ['s', 'hip', { hip: [92, 78], tor: 140, th: 70, sn: -15, th2: 105, sn2: 40, ua: 95, fa: 100 }, { hip: [92, 78], tor: 140, th: 105, sn: 40, th2: 70, sn2: -15, ua: 95, fa: 100 }, 'bike'],
  rower: ['s', 'hip', { hip: [80, 112], tor: 150, th: 135, sn: 40, ua: 92, fa: 92 }, { hip: [112, 112], tor: 200, th: 88, sn: 88, ua: -30, fa: 80 }, 'rail'],
  climber: ['s', 'hand', { tor: 115, th: -65, sn: -65, th2: 10, sn2: -95, ua: 0, fa: 0 }, { tor: 115, th: 10, sn: -95, th2: -65, sn2: -65, ua: 0, fa: 0 }, 'floor', { ah: [150, G - 3] }],
  kbsquat: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: 15, fa: 170 }, { tor: 150, th: 100, sn: -30, ua: 30, fa: 175 }, 'chest1'],
  rollout: ['s', 'hip', { hip: [100, 108], tor: 150, th: 0, sn: -90, ua: 25, fa: 25 }, { hip: [123, 120], tor: 100, th: -45, sn: -90, ua: 92, fa: 92 }, 'floor'],
  kneelcrunch: ['s', 'hip', { hip: [100, 106], tor: 172, th: 0, sn: -90, ua: 165, fa: -15 }, { hip: [100, 106], tor: 110, th: 0, sn: -90, ua: 125, fa: -45 }, 'floor'],
  kick4: ['s', 'hand', { tor: 92, th: 0, sn: -90, th2: 5, sn2: -85, ua: 0, fa: 0 }, { tor: 92, th: 0, sn: -90, th2: -95, sn2: -100, ua: 0, fa: 0 }, 'floor', { ah: [132, G - 3] }],
  stkick: ['s', 'ankle', { tor: 172, th: 0, sn: 0, th2: 2, sn2: -5, ua: 35, fa: 40 }, { tor: 166, th: 0, sn: 0, th2: -48, sn2: -60, ua: 35, fa: 40 }, ''],
  nordic: ['s', 'ankle', { tor: 180, th: 0, sn: -90, ua: 20, fa: 80 }, { tor: 128, th: -52, sn: -90, ua: 100, fa: 110 }, 'floor', { ax: 70 }],
  ropes: ['s', 'ankle', { tor: 165, th: 35, sn: -25, ua: 35, fa: 70 }, { tor: 165, th: 35, sn: -25, ua: 80, fa: 110 }, 'hands'],
  wristcurl: ['s', 'hip', { hip: [92, 92], tor: 160, th: 90, sn: 5, ua: 40, fa: 92 }, { hip: [92, 92], tor: 160, th: 90, sn: 5, ua: 42, fa: 105 }, 'seat,hands'],
  sapd: ['s', 'ankle', { tor: 160, th: 8, sn: -5, ua: 150, fa: 150 }, { tor: 160, th: 8, sn: -5, ua: 8, fa: 8 }, 'cabletop,hands'],
  invrow: ['s', 'hand', { tor: -112, th: 70, sn: 70, ua: 180, fa: 180 }, { tor: -100, th: 82, sn: 82, ua: 135, fa: -135 }, 'bar', { ah: [92, 62] }],
  hipabd: ['f', 'hip', { hip: [100, 82], arm: 10, el: 5, leg: 5 }, { hip: [100, 82], arm: 10, el: 5, leg: 28 }, ''],
  hipadd: ['f', 'hip', { hip: [100, 82], arm: 10, el: 5, leg: 28 }, { hip: [100, 82], arm: 10, el: 5, leg: 4 }, ''],
  floorpress: ['s', 'hip', { hip: [112, 134], tor: -90, th: 135, sn: -20, ua: 30, fa: 178 }, { hip: [112, 134], tor: -90, th: 135, sn: -20, ua: 178, fa: 180 }, 'floor'],
  kbsquat2: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: 15, fa: 170 }, { tor: 150, th: 100, sn: -30, ua: 30, fa: 175 }, 'chest1'],
  halo: ['f', 'hip', { hip: [100, 82], arm: 160, el: -100, leg: 6 }, { hip: [100, 82], arm: 175, el: -150, leg: 6 }, ''],
  getup: ['s', 'hip', { hip: [100, 130], tor: -95, th: 140, sn: 20, ua: 175, fa: 180 }, { hip: [100, 108], tor: 150, th: 100, sn: 0, ua: 175, fa: 180 }, 'floor'],
  windmill: ['f', 'hip', { hip: [100, 82], arm: 175, el: 0, leg: 10, lean: 0 }, { hip: [100, 82], arm: 175, el: 0, leg: 10, lean: 35 }, ''],
  sitrow: ['s', 'hip', { hip: [80, 112], tor: 150, th: 100, sn: 90, ua: 92, fa: 92 }, { hip: [80, 112], tor: 172, th: 100, sn: 90, ua: -35, fa: 80 }, 'floor'],
  inclcurl: ['s', 'hip', { hip: [95, 92], tor: 200, th: 90, sn: 5, ua: -15, fa: -10 }, { hip: [95, 92], tor: 200, th: 90, sn: 5, ua: -10, fa: 140 }, 'seat'],
  seatcurl2: ['s', 'hip', { hip: [95, 92], tor: 180, th: 90, sn: 5, ua: 2, fa: 4 }, { hip: [95, 92], tor: 180, th: 90, sn: 5, ua: 12, fa: 160 }, 'seat'],
  prone: ['s', 'hip', { hip: [92, 74], tor: 128, th: -12, sn: -12, ua: 0, fa: 0 }, { hip: [92, 74], tor: 128, th: -12, sn: -12, ua: -75, fa: -5 }, 'pronebench'],
  ezskull: ['s', 'hip', { hip: [118, 100], tor: -90, th: 70, sn: -3, ua: 160, fa: -145 }, { hip: [118, 100], tor: -90, th: 70, sn: -3, ua: 165, fa: 172 }, 'flatbench,handsbar'],
  dumbrow1: ['s', 'ankle', { tor: 112, th: 30, sn: -10, ua: 0, fa: 0, th2: -10, sn2: -10 }, { tor: 112, th: 30, sn: -10, ua: -75, fa: -5, th2: -10, sn2: -10 }, 'flatbench'],
  hipthrustfloor: ['s', 'ankle', { tor: -95, th: 60, sn: -8, ua: -100, fa: -100 }, { tor: -70, th: 98, sn: -8, ua: -100, fa: -100 }, 'floor'],
  oneleg: ['s', 'ankle', { tor: 175, th: 85, sn: -5, th2: -5, sn2: -5, ua: 70, fa: 75 }, { tor: 150, th: 100, sn: -30, th2: 75, sn2: 75, ua: 85, fa: 90 }, ''],
  deadbug: ['s', 'hip', { hip: [98, 128], tor: -90, th: 95, sn: 5, ua: 180, fa: 180 }, { hip: [98, 128], tor: -90, th: 150, sn: 90, ua: 120, fa: 120 }, 'floor'],
  sideplank: ['f', 'hip', { hip: [100, 118], arm: 90, el: 0, leg: 2, lean: 70 }, { hip: [100, 112], arm: 95, el: 0, leg: 2, lean: 72 }, ''],
  stepside: ['f', 'hip', { hip: [100, 82], arm: 8, el: 0, leg: 5 }, { hip: [100, 82], arm: 8, el: 0, leg: 22 }, ''],
  generic: ['s', 'ankle', { tor: 180, th: 0, sn: 0, ua: 0, fa: 0 }, { tor: 180, th: 0, sn: 0, ua: 20, fa: 120 }, 'hands']
};
// ---------- escolher o padrão a partir do nome / equipamento / músculo ----------
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const RULES = [[/peso morto romeno|stiff|bom dia|good morning/, 'rdl'], [/peso morto|rack pull|deadlift/, 'deadlift'], [/agachamento frontal|zercher/, 'frontsquat'], [/goblet|sumo com halter/, 'goblet'], [/agachamento|squat|pistol|sissy/, 'squat'],
  [/afundo|bulgaro|passada|lunge|split/, 'lunge'], [/subida ao banco|step/, 'stepup'], [/hip thrust|elevacao de quadril|elevacao pelvica/, 'hipthrust'], [/ponte de gluteos|ponte/, 'bridge'], [/leg press|gemeos no leg press/, 'legpress'],
  [/cadeira extensora|extensora|extensao de pernas|extensao de perna|extensao de joelho|leg extension/, 'legext'], [/nordic|glute-ham/, 'nordic'], [/mesa flexora|flexora em pe|flexao de pernas deitado|leg curl/, 'legcurl'], [/cadeira flexora|flexora/, 'seatcurl'], [/gemeos sentado|panturrilha sentad/, 'seatcalf'], [/gemeos|panturrilha|tibial/, 'calf'],
  [/abdutora|abducao.*maquina|cadeira abdu/, 'abduct'], [/adutora|aducao.*maquina|cadeira adu/, 'adduct'], [/abducao|monster walk/, 'hipabd'], [/aducao/, 'hipadd'], [/bulgaro/, 'lunge'], [/rollout|roda abdominal/, 'rollout'], [/punho/, 'wristcurl'], [/remada invertida|australian/, 'invrow'], [/rotacao (externa|interna)/, 'extrot'], [/coice de gluteo|kickback de gluteo/, 'stkick'], [/coice de gluteo|kickback de gluteo/, 'hipthrust'],
  [/supino inclinado|inclinado com halteres|supino.*inclinad/, 'incline'], [/supino declinado|declinad/, 'decline'], [/crucifixo invertido|peck deck invertido|elevacao posterior|deltoide posterior/, 'revfly'],
  [/crucifixo|peck deck|cross-over|crossover|cruz de ferro|svend/, 'fly'], [/supino|floor press|jm press/, 'bench'], [/flexao|flexoes|push-up/, 'pushup'], [/prancha|isometria|dead bug|pallof/, 'plank'],
  [/mergulho no banco/, 'benchdip'], [/paralelas|mergulho|dips/, 'dips'], [/elevac(ao|oes) supinada|chin-up|elevacoes|barra fixa|muscle-up|pull-up|subida a corda/, 'pullup'], [/puxada|pulldown|pullover no cabo/, 'pulldown'],
  [/pullover/, 'pullover'], [/remada sentada|remada no cabo|remada.*cabo baixo|remada unilateral sentada/, 'cablerow'], [/remada na maquina|remada alta na maquina|remada barra t apoiada/, 'machrow'], [/remada alta/, 'uprow'],
  [/remada|row/, 'row'], [/face pull/, 'facepull'], [/desenvolvimento.*sentad|desenvolvimento na maquina|desenvolvimento no smith|arnold/, 'seatohp'], [/desenvolvimento|press cubano|push press|thruster|jerk/, 'ohp'],
  [/elevacao lateral|scaption|em y/, 'latraise'], [/elevacao frontal/, 'frontraise'], [/encolhimento/, 'shrug'], [/curl scott|scott/, 'preacher'], [/curl|rosca/, 'curl'],
  [/triceps na polia|polia|pushdown/, 'pushdown'], [/triceps testa|tate press|testa/, 'skull'], [/triceps frances|frances|extensao de triceps|toalha/, 'ohtri'], [/coice|kickback/, 'kickback'],
  [/abdominal completo|sit-up|canivete|sapo/, 'situp'], [/elevacao de pernas suspenso|joelhos nas paralelas|pike suspenso/, 'hangraise'], [/elevacao de pernas|recolha de pernas|flutter|tesouras/, 'legraise'],
  [/abdominal|crunch|rollout|roda abdominal/, 'crunch'], [/rotacao|russian twist|landmine/, 'twist'], [/inclinacao lateral|flexao lateral|prancha lateral/, 'sidebend'], [/lenhador|wood chop|judo/, 'woodchop'],
  [/hiperextensao|superman/, 'backext'], [/swing|marreta/, 'swing'], [/clean|arremesso/, 'clean'], [/arranco|snatch/, 'snatch'], [/salto|box jump|pliometr|star jump/, 'jump'],
  [/passadeira|corrida|sprints|trilho/, 'run'], [/caminhada|farmer|yoke|empurrar treno|trenó/, 'walk'], [/bicicleta|ciclismo|air bike|eliptica|escada/, 'bike'], [/remo \(maquina\)|remo/, 'rower'], [/mountain climbers|escaladores|corda naval|saltar a corda/, 'climber'],
  [/turkish|halo|moinho|kettlebell em oito/, 'kbsquat']];
const BYM = { 'Peito': 'bench', 'Dorsais': 'row', 'Trapézio': 'shrug', 'Lombar': 'backext', 'Ombros': 'ohp', 'Bíceps': 'curl', 'Tríceps': 'pushdown', 'Antebraços': 'curl', 'Abdómen': 'crunch', 'Oblíquos': 'twist', 'Glúteos': 'hipthrust', 'Quadríceps': 'squat', 'Isquiotibiais': 'rdl', 'Gémeos': 'calf' };
// cada exercício da biblioteca com o movimento e o equipamento certos (revisto um a um)
const FIX = {
  'elevacao de deltoide alternada': 'frontraise', 'supino no chao alternado': 'floorpress:kb', 'remada renegada': 'pushup:kb', 'volta ao mundo com halteres': 'fly',
  'crucifixo invertido com elastico': 'rfly:band', 'abertura com elastico (pull apart)': 'rfly:band', 'triceps testa com elastico': 'ohtri:band', 'elevacoes assistidas com elastico': 'pullup',
  'agachamento hack com barra (atras)': 'deadlift:barbell', 'remada para deltoide posterior com barra': 'row:barbell', 'gemeos sentado com barra': 'seatcalf:barbell', 'encolhimento com barra atras do corpo': 'shrug:barbell',
  'inclinacao lateral com barra': 'sidebend:barbell', 'agachamento lateral com barra': 'squat:barbell', 'salto sobre o banco': 'jump', 'pullover com barra': 'pullover:barbell',
  'elevacao posterior com cabeca apoiada': 'rfly:db', 'elevacao posterior no cabo baixo': 'rfly:cable:handles', 'ciclismo': 'bike', 'bicicleta estatica': 'bike', 'bicicleta reclinada': 'bike', 'air bike': 'bike',
  'crucifixo com peso corporal': 'rollout', 'agachamento livre (peso corporal)': 'squat:none', 'afundo a andar (peso corporal)': 'lunge:none', 'agachamento com salto': 'jump',
  'peck deck (voador)': 'fly:machine', 'peso morto no cabo': 'deadlift:cable:bar', 'curl martelo na corda': 'curl:cable:rope', 'extensao de triceps inclinado no cabo': 'ohtri:cable:rope',
  'rotacao interna no cabo': 'extrot:cable', 'cruz de ferro no cabo': 'fly:cable:handles', 'rotacao de tronco judo no cabo': 'woodchop:cable', 'curl scott no cabo': 'preacher:cable:bar',
  'crucifixo invertido no cabo': 'rfly:cable:handles', 'abdominal invertido no cabo': 'legraise', 'remada para deltoide posterior na corda': 'facepull:cable:rope', 'elevacao lateral sentado no cabo': 'latraise:cable',
  'desenvolvimento no cabo': 'ohp:cable:handles', 'encolhimento no cabo': 'shrug:cable:bar', 'flexao de punho no cabo': 'wristcurl:cable:bar', 'encolhimento na maquina de gemeos': 'shrug:machine',
  'gemeos no leg press': 'legpress:machine', 'agachamento na cadeira': 'squat:none', 'mergulho na maquina': 'dips:none', 'flexao de pernas na bola suica': 'bridge',
  'abdominal no banco declinado': 'situp', 'abdominal obliquo declinado': 'situp', 'abdominal invertido declinado': 'legraise', 'triceps testa declinado com halteres': 'skull:db', 'triceps testa declinado com barra w': 'ezskull:ez',
  'dead bug': 'deadbug', 'press cubano': 'ohp:db', 'pullover com halter': 'pullover:db', 'pullover com bracos estendidos': 'pullover:db',
  'kettlebell em oito': 'swing:kb', 'halo com kettlebell': 'halo:kb', 'turkish get-up': 'getup:kb', 'moinho com kettlebell': 'windmill:kb', 'agachamento pistol com kettlebell': 'oneleg:kb', 'agachamento pistol no smith': 'oneleg:smith',
  'agachamento unilateral com barra': 'oneleg:barbell', 'agachamento unilateral na caixa': 'oneleg', 'remada no cabo elevada': 'sitrow:cable', 'remada sentada no cabo': 'sitrow:cable', 'remada unilateral sentada no cabo': 'sitrow:cable', 'remada no cabo baixo ao pescoco': 'sitrow:cable',
  'remada no cabo alto ajoelhado': 'pulldown:cable:bar', 'remada unilateral no cabo alto ajoelhado': 'pulldown:cable:handle', 'curl no banco inclinado': 'inclcurl:db', 'curl no banco inclinado (flexor)': 'inclcurl:db', 'curl alternado no banco inclinado': 'inclcurl:db', 'curl martelo no banco inclinado': 'inclcurl:db', 'curl inclinado (biceps interno)': 'inclcurl:db',
  'curl unilateral apoiado no banco inclinado': 'preacher:db', 'curl deitado de brucos no banco inclinado': 'prone:db', 'remada com halteres no banco inclinado': 'prone:db', 'remada deitado no banco inclinado': 'prone:barbell', 'elevacao posterior deitado no banco': 'prone:db', 'elevacao posterior unilateral deitado': 'prone:db', 'elevacao posterior deitado': 'prone:db',
  'curl com barra deitado no banco inclinado': 'prone:barbell', 'curl com barra deitado no banco alto': 'prone:barbell', 'curl no cabo deitado': 'prone:cable:bar', 'elevacao lateral unilateral deitado': 'latraise:db', 'curl deitado com halteres': 'prone:db',
  'curl sentado com halteres': 'seatcurl2:db', 'curl sentado (biceps interno)': 'seatcurl2:db', 'curl concentrado': 'seatcurl2:db', 'curl concentrado com barra': 'seatcurl2:barbell', 'triceps coice sentado': 'kickback:db', 'elevacao posterior sentado': 'rfly:db', 'elevacao lateral sentado': 'latraise:db',
  'triceps testa no banco inclinado': 'skull:barbell', 'triceps testa atras da cabeca': 'skull:barbell', 'triceps testa ao queixo': 'ezskull:ez', 'triceps testa com barra': 'ezskull:ez', 'triceps testa com barra w': 'ezskull:ez',
  'remada unilateral com halter': 'dumbrow1:db', 'remada com kettlebell': 'row:kb', 'remada alternada com kettlebell': 'row:kb', 'passagem entre as pernas com kettlebell': 'swing:kb', 'elevacao de quadril com elastico': 'hipthrustfloor:band',
  'extensao de triceps ajoelhado no cabo': 'ohtri:cable:rope', 'extensao de triceps no cabo baixo': 'ohtri:cable:rope', 'extensao de triceps unilateral no cabo': 'ohtri:cable:handle', 'triceps frances unilateral no cabo': 'ohtri:cable:handle',
  'monster walk (passada lateral com elastico)': 'stepside:band', 'prancha lateral': 'plank', 'flexao com prancha lateral': 'pushup', 'canivete lateral': 'situp', 'pinca de discos (pegada)': 'walk',
  'rotacao com disco': 'twist', 'rotacao sentado com barra': 'twist:barbell', 'elevacao escapular': 'pullup', 'isometria do pescoco (frente e tras)': 'shrug', 'isometria do pescoco (lados)': 'shrug',
  'curl inverso com disco': 'curl:none', 'mergulho nas argolas': 'dips', 'subida a corda': 'pullup', 'saltar a corda': 'jump', 'empurrar treno': 'run', 'yoke walk': 'walk', 'farmer walk (caminhada do agricultor)': 'walk:db',
  'svend press': 'mpress:none', 'pallof press (antirrotacao)': 'mpress:cable:handle', 'pallof press com rotacao': 'mpress:cable:handle', 'supino no cabo': 'mpress:cable:handles', 'supino em pe no cabo': 'mpress:cable:handles',
  'flexao com um braco': 'pushup', 'escadas (stairmaster)': 'stepup', 'escada rolante (step mill)': 'stepup', 'eliptica': 'walk', 'virar pneu': 'deadlift', 'marreta no pneu': 'woodchop',
  'supino no chao alternado': 'floorpress:kb', 'supino no chao com halteres': 'floorpress:db', 'supino no chao com barra': 'floorpress:barbell',
  'roda abdominal': 'rollout', 'rollout com barra': 'rollout:barbell', 'rollout com barra (de joelhos)': 'rollout:barbell', 'rollout com barra a partir do banco': 'rollout:barbell', 'rollout em fitas (trx)': 'rollout', 'crucifixo com peso corporal': 'rollout:ez',
  'elevacao de deltoide alternada': 'latraise', 'volta ao mundo com halteres': 'pullover', 'flexao de pernas na bola suica': 'bridge', 'abertura com elastico (pull apart)': 'rfly:band', 'triceps testa com elastico': 'ohtri:band',
  'ponte de gluteos com barra': 'bridge:barbell', 'agachamento hack com barra (atras)': 'deadlift:barbell', 'remada para deltoide posterior com barra': 'row', 'inclinacao lateral com barra': 'sidebend:barbell',
  'cordas navais (battle ropes)': 'ropes', 'elevacao de quadril (joelhos fletidos)': 'legraise', 'extensao de triceps com o corpo': 'pushup', 'remada com peso corporal': 'invrow', 'remada invertida': 'invrow', 'remada invertida em fitas (trx)': 'invrow', 'remada em fitas (trx)': 'invrow',
  'abdominal no cabo (ajoelhado)': 'kneelcrunch:cable:rope', 'abdominal na corda': 'kneelcrunch:cable:rope', 'abdominal sentado no cabo': 'kneelcrunch:cable:rope', 'abdominal no cabo com rotacao': 'kneelcrunch:cable:rope', 'abdominal no cabo em bosu com inclinacao': 'kneelcrunch:cable:rope', 'abdominal em pe na corda': 'kneelcrunch:cable:rope',
  'aducao de anca no cabo': 'hipadd:cable', 'monster walk (passada lateral com elastico)': 'hipabd:band',
  'rotacao interna no cabo': 'extrot:cable', 'rotacao externa no cabo': 'extrot:cable', 'rotacao externa com halter': 'extrot:db', 'rotacao externa com elastico': 'extrot:band',
  'rotacao de tronco judo no cabo': 'woodchop', 'rotacao russa no cabo': 'woodchop', 'landmine 180': 'woodchop:barbell', 'rotacao completa com bola medicinal': 'woodchop:ball',
  'abdominal invertido no cabo': 'legraise', 'remada para deltoide posterior na corda': 'facepull', 'flexao de punho no cabo': 'wristcurl:cable', 'encolhimento na maquina de gemeos': 'shrug:machine',
  'abdominal no banco declinado': 'situp', 'abdominal obliquo declinado': 'situp', 'flexao declinada (pes elevados)': 'pushup', 'abdominal invertido declinado': 'legraise', 'triceps testa declinado com halteres': 'skull', 'triceps testa declinado com barra w': 'skull:ez',
  'eliptica': 'walk', 'escadas (stairmaster)': 'stepup', 'escada rolante (step mill)': 'stepup', 'farmer walk (caminhada do agricultor)': 'walk:db', 'flexao de dedos com barra': 'wristcurl:barbell',
  'nordic curl no chao': 'nordic', 'nordic curl': 'nordic', 'glute-ham raise (nordico)': 'nordic', 'coice de gluteo (4 apoios)': 'kick4', 'extensao de anca com elastico': 'stkick:band', 'elevacao de perna': 'stkick', 'coice de gluteo no cabo': 'stkick:cable',
  'cruz de ferro com halteres': 'latraise', 'isometria do pescoco (frente e tras)': 'shrug', 'isometria do pescoco (lados)': 'shrug', 'peso morto unilateral com kettlebell': 'rdl', 'elevacao de joelhos nas paralelas': 'hangraise', 'peso morto na maquina': 'deadlift:barbell',
  'agachamento deitado na maquina': 'legpress', 'curl na maquina': 'preacher:machine', 'extensao de triceps na maquina': 'pushdown:machine', 'passe de peito com bola medicinal': 'mpress:ball', 'supino no cabo': 'mpress:cable', 'supino em pe no cabo': 'mpress:cable', 'svend press': 'mpress',
  'pallof press (antirrotacao)': 'mpress:cable', 'pallof press com rotacao': 'mpress:cable', 'elevacao com um braco': 'pullup', 'slam com bola medicinal': 'swing:ball',
  'extensao de punho com halteres': 'wristcurl:db', 'extensao de punho com barra': 'wristcurl:barbell', 'flexao de punho com barra': 'wristcurl:barbell', 'flexao de punho com halteres': 'wristcurl:db', 'rolo de punho': 'wristcurl', 'pinca de discos (pegada)': 'shrug',
  'pull-through no cabo': 'rdl:cable', 'saltar a corda': 'jump', 'pullover na corda (bracos estendidos)': 'sapd:cable:rope', 'pullover no cabo (bracos estendidos)': 'sapd:cable:bar', 'recolha de joelhos sentado': 'legraise',
  'agachamento bulgaro no smith': 'lunge:smith', 'agachamento bulgaro com halteres': 'lunge:db', 'agachamento bulgaro em fitas (trx)': 'lunge', 'virar pneu': 'deadlift', 'peso morto com barra hexagonal': 'deadlift:barbell', 'marreta no pneu': 'swing',
  'passagem entre as pernas com kettlebell': 'swing:kb', 'elevacao com halter': 'frontraise', 'empurrar treno': 'walk', 'remada renegada': 'row', 'elevacao frontal com disco': 'frontraise' };
AN.fix = info => FIX[N(info.name)] || '';
AN.pattern = info => { const n = N(info.name); const f = FIX[n]; if (f) return f.split(':')[0]; for (const [rx, k] of RULES) if (rx.test(n)) return k; return BYM[info.muscle] || 'generic'; };
// ---------- cinemática ----------
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (A, B, t) => { const o = {}; Object.keys(A).forEach(k => { o[k] = Array.isArray(A[k]) ? [lerp(A[k][0], B[k][0], t), lerp(A[k][1], B[k][1], t)] : lerp(A[k], B[k] ?? A[k], t); }); return o; };
const side = (p, anchor, o = {}) => { const hip = [0, 0], sh = add(hip, v(p.tor, L.tor)), hd = add(sh, v(p.tor, L.neck + L.head)), el = add(sh, v(p.ua, L.ua)), ha = add(el, v(p.fa, L.fa)), kn = add(hip, v(p.th, L.th)), an = add(kn, v(p.sn, L.sn)),
    el2 = add(sh, v(p.ua2 ?? p.ua, L.ua)), ha2 = add(el2, v(p.fa2 ?? p.fa, L.fa)), kn2 = add(hip, v(p.th2 ?? p.th, L.th)), an2 = add(kn2, v(p.sn2 ?? p.sn, L.sn));
  const j = { hip, sh, hd, el, ha, kn, an, el2, ha2, kn2, an2 };
  let off; if (anchor === 'hip') off = p.hip; else if (anchor === 'hand') { const ah = o.ah || [100, 24]; off = [ah[0] - ha[0], ah[1] - ha[1]]; } else off = [(o.ax || 96) - an[0], G - 4 - an[1] - (p.rise || 0)];
  if (anchor === 'hip') off = [p.hip[0], p.hip[1]];
  Object.keys(j).forEach(k => { j[k] = add(j[k], off); }); return j; };
// ---------- desenho ----------
const MUS = { 'Peito': ['chest'], 'Dorsais': ['lat'], 'Trapézio': ['trap'], 'Lombar': ['low'], 'Ombros': ['delt'], 'Bíceps': ['ua'], 'Tríceps': ['ua'], 'Antebraços': ['fa'], 'Abdómen': ['abs'], 'Oblíquos': ['abs'], 'Glúteos': ['glute'], 'Quadríceps': ['th'], 'Isquiotibiais': ['th'], 'Gémeos': ['sn'] };
const ln = (a, b, w, c, o = 1) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
const ci = (p, r, c, o = 1) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="${c}" opacity="${o}"/>`;
const mid = (a, b, t = .5) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const BODY = '#BFD3E6', BACK = '#7F97AD', HI = 'var(--accent)', EQ = '#E8EEF4', EQ2 = '#5E7A93';
const props = (list, j, equip) => { let s = ''; const has = k => list.split(',').includes(k);
  const bar = (p) => ln([p[0] - 3, p[1]], [p[0] + 3, p[1]], 4, EQ) + ci(p, 7.5, EQ2) + ci(p, 4.5, EQ);
  if (has('floor') || has('box') || has('step') || has('tread')) s += ln([20, G], [180, G], 2, EQ2);
  if (!/floor/.test(list) && !has('hip') && !has('bike') && !has('rail') && !has('sled')) s += ln([20, G], [180, G], 2, EQ2, .5);
  if (has('flatbench')) s += `<rect x="50" y="${j.hip[1] + 4}" width="95" height="6" rx="3" fill="${EQ2}"/>` + ln([62, j.hip[1] + 10], [62, G], 4, EQ2) + ln([132, j.hip[1] + 10], [132, G], 4, EQ2);
  if (has('inclinebench')) s += ln([j.hip[0] + 6, j.hip[1] + 7], add([j.hip[0] + 6, j.hip[1] + 7], v(-128, 56)), 6, EQ2) + ln([j.hip[0] - 6, j.hip[1] + 8], [j.hip[0] + 20, j.hip[1] + 8], 6, EQ2) + ln([j.hip[0], j.hip[1] + 10], [j.hip[0], G], 4, EQ2);
  if (has('declinebench')) s += ln([j.hip[0] + 4, j.hip[1] + 7], add([j.hip[0] + 4, j.hip[1] + 7], v(-70, 56)), 6, EQ2) + ln([j.hip[0], j.hip[1] + 10], [j.hip[0], G], 4, EQ2);
  if (has('seat')) s += `<rect x="${j.hip[0] - 16}" y="${j.hip[1] + 5}" width="30" height="6" rx="3" fill="${EQ2}"/>` + ln([j.hip[0] - 14, j.hip[1] - 4], [j.hip[0] - 18, j.hip[1] - 48], 6, EQ2, .8) + ln([j.hip[0] - 2, j.hip[1] + 11], [j.hip[0] - 2, G], 4, EQ2);
  if (has('bench_back')) s += `<rect x="20" y="${j.sh[1] + 4}" width="34" height="7" rx="3" fill="${EQ2}"/>` + ln([30, j.sh[1] + 11], [30, G], 4, EQ2);
  if (has('box')) s += `<rect x="110" y="${G - 26}" width="46" height="26" rx="2" fill="${EQ2}"/>`;
  if (has('step')) s += `<rect x="82" y="${G - 8}" width="30" height="8" rx="2" fill="${EQ2}"/>`;
  if (has('parallel')) s += ln([j.ha[0] - 18, j.ha[1] + 2], [j.ha[0] + 18, j.ha[1] + 2], 4, EQ) + ln([j.ha[0] + 14, j.ha[1] + 2], [j.ha[0] + 14, G], 4, EQ2);
  if (has('benchbehind')) s += `<rect x="${j.ha[0] - 22}" y="${j.ha[1] + 2}" width="28" height="7" rx="3" fill="${EQ2}"/>` + ln([j.ha[0] - 10, j.ha[1] + 9], [j.ha[0] - 10, G], 4, EQ2);
  if (has('bar')) s += ln([60, j.ha[1]], [140, j.ha[1]], 4, EQ) + ln([60, j.ha[1]], [60, 6], 3, EQ2) + ln([140, j.ha[1]], [140, 6], 3, EQ2);
  if (has('cabletop')) s += ln([j.ha[0], j.ha[1]], [j.ha[0] + 4, 6], 1.5, EQ) + `<rect x="${j.ha[0] - 3}" y="2" width="14" height="6" rx="2" fill="${EQ2}"/>`;
  if (has('cablefront')) s += ln(j.ha, [176, j.ha[1] + 6], 1.5, EQ) + `<rect x="174" y="40" width="8" height="${G - 40}" rx="2" fill="${EQ2}"/>`;
  if (has('cablefronthigh')) s += ln(j.ha, [176, 36], 1.5, EQ) + `<rect x="174" y="20" width="8" height="${G - 20}" rx="2" fill="${EQ2}"/>`;
  if (has('sled')) s += ln(add(j.an, [-6, -12]), add(j.an, [10, 14]), 6, EQ2) + ln([30, G], [180, G], 2, EQ2) + `<rect x="${j.hip[0] - 26}" y="${j.hip[1] + 4}" width="34" height="7" rx="3" fill="${EQ2}" transform="rotate(-35 ${j.hip[0]} ${j.hip[1]})"/>`;
  if (has('shinpad') || has('heelpad')) s += ci(add(j.an, [0, -4]), 4.5, EQ2);
  if (has('chestpad')) s += `<rect x="${j.sh[0] + 6}" y="${j.sh[1] + 4}" width="7" height="22" rx="3" fill="${EQ2}"/>`;
  if (has('preacherpad')) s += ln(j.sh, add(j.el, [2, 4]), 8, EQ2, .7);
  if (has('hyperpad')) s += ln(add(j.hip, [-12, 6]), add(j.hip, [12, 2]), 7, EQ2) + ln(j.hip, [j.hip[0], G], 4, EQ2) + ln([20, G], [180, G], 2, EQ2);
  if (has('tread')) s += `<rect x="40" y="${G - 6}" width="125" height="6" rx="3" fill="${EQ2}"/>` + ln([160, G - 6], [168, 50], 4, EQ2);
  if (has('bike')) s += ci([j.hip[0] + 30, j.hip[1] + 36], 12, 'none') + `<circle cx="${j.hip[0] + 30}" cy="${j.hip[1] + 36}" r="12" fill="none" stroke="${EQ2}" stroke-width="3"/>` + ln([j.hip[0] - 8, j.hip[1] + 5], [j.hip[0] + 30, j.hip[1] + 36], 4, EQ2) + ln([j.hip[0] + 30, j.hip[1] + 36], [j.hip[0] + 30, G], 4, EQ2) + ln([j.ha[0], j.ha[1]], [j.hip[0] + 30, j.hip[1] + 36], 3, EQ2, .6);
  if (has('rail')) s += ln([40, G - 6], [175, G - 6], 5, EQ2) + ln(j.ha, [170, G - 12], 1.5, EQ);
  // pesos nas mãos
  const handsbar = has('handsbar') || has('hipbar') || has('backbar') || has('chestbar');
  if (has('backbar')) s += bar(add(j.sh, [-2, -2]));
  else if (has('chestbar')) s += bar(add(j.sh, [6, 0]));
  else if (has('hipbar')) s += bar(add(j.hip, [0, -6]));
  else if (has('kb')) s += `<rect x="${j.ha[0] - 6}" y="${j.ha[1] + 2}" width="12" height="11" rx="5" fill="${EQ}"/>`;
  else if (has('chest1')) s += `<rect x="${j.ha[0] - 6}" y="${j.ha[1] - 4}" width="12" height="9" rx="3" fill="${EQ}"/>`;
  else if (has('handsbar') || (has('hands') && /Barra/.test(equip))) s += bar(j.ha);
  else if (has('hands') && /Halteres|Kettlebell/.test(equip)) s += `<rect x="${j.ha[0] - 7}" y="${j.ha[1] - 3}" width="14" height="6" rx="2" fill="${EQ}"/>` + `<rect x="${j.ha2[0] - 7}" y="${j.ha2[1] - 3}" width="14" height="6" rx="2" fill="${EQ}" opacity=".5"/>`;
  else if (has('hands') && /Cabo|Elástico/.test(equip) && !/cable/.test(list)) s += ln(j.ha, [180, j.ha[1]], 1.5, EQ, .8);
  return s; };
const drawSide = (j, m, list, equip) => { const hl = MUS[m] || [], h = k => hl.includes(k);
  let s = props(list, j, equip);
  // membros de trás
  s += ln(j.hip, j.kn2, 10, BACK) + ln(j.kn2, j.an2, 8, BACK) + ln(j.an2, add(j.an2, v(90, L.ft)), 5, BACK);
  s += ln(j.sh, j.el2, 8, BACK) + ln(j.el2, j.ha2, 7, BACK);
  // tronco, cabeça
  s += ln(j.hip, j.sh, 17, BODY) + ln(j.sh, mid(j.sh, j.hd, .45), 6, BODY) + ci(j.hd, L.head, BODY);
  // músculos do tronco
  const tor = (a, b, w) => ln(mid(j.hip, j.sh, a), mid(j.hip, j.sh, b), w, HI, .95);
  if (h('chest')) s += ln(mid(j.hip, j.sh, .62), mid(j.hip, j.sh, .9), 9, HI);
  if (h('abs')) s += tor(.18, .55, 8);
  if (h('lat')) s += tor(.35, .85, 12);
  if (h('low')) s += tor(.05, .35, 12);
  if (h('trap')) s += ln(j.sh, mid(j.sh, j.hd, .4), 8, HI) + tor(.8, .98, 12);
  if (h('glute')) s += ci(j.hip, 8.5, HI);
  // pernas da frente
  s += ln(j.hip, j.kn, 12, BODY) + ln(j.kn, j.an, 9, BODY) + ln(j.an, add(j.an, v(90, L.ft)), 6, BODY);
  if (h('th')) s += ln(mid(j.hip, j.kn, .12), mid(j.hip, j.kn, .9), 8, HI) + ln(mid(j.hip, j.kn2, .12), mid(j.hip, j.kn2, .9), 6, HI, .5);
  if (h('sn')) s += ln(mid(j.kn, j.an, .1), mid(j.kn, j.an, .6), 8, HI) + ln(mid(j.kn2, j.an2, .1), mid(j.kn2, j.an2, .6), 6, HI, .5);
  // braço da frente
  s += ln(j.sh, j.el, 9, BODY) + ln(j.el, j.ha, 7.5, BODY) + ci(j.ha, 3.6, BODY);
  if (h('delt')) s += ci(j.sh, 7, HI);
  if (h('ua')) s += ln(mid(j.sh, j.el, .15), mid(j.sh, j.el, .85), 6.5, HI);
  if (h('fa')) s += ln(mid(j.el, j.ha, .1), mid(j.el, j.ha, .8), 5.5, HI);
  return s; };
const drawFront = (p, m) => { const hl = MUS[m] || [], h = k => hl.includes(k), cx = p.hip[0], hy = p.seat ? p.hip[1] + 6 : G - 2 - (L.th + L.sn) * Math.cos(p.leg * D), lean = p.lean || 0, sy = hy - L.tor + (p.sh || 0);
  const shL = [cx - 15 + lean * .3, sy], shR = [cx + 15 + lean * .3, sy], neck = [cx + lean * .3, sy - 4], hd = [cx + lean * .45, sy - 14];
  const arm = (sh, dir) => { const el = add(sh, [Math.sin(p.arm * D) * L.ua * dir, Math.cos(p.arm * D) * L.ua]), fa = p.arm + p.el; const ha = add(el, [Math.sin(fa * D) * L.fa * dir, Math.cos(fa * D) * L.fa]); return [el, ha]; };
  const [eL, hL] = arm(shL, -1), [eR, hR] = arm(shR, 1);
  const legA = p.leg, kL = add([cx - 8, hy], [-Math.sin(legA * D) * L.th, Math.cos(legA * D) * L.th]), kR = add([cx + 8, hy], [Math.sin(legA * D) * L.th, Math.cos(legA * D) * L.th]);
  const fL = p.seat ? add(kL, [0, L.sn]) : add(kL, [-Math.sin(legA * D) * L.sn, Math.cos(legA * D) * L.sn]), fR = p.seat ? add(kR, [0, L.sn]) : add(kR, [Math.sin(legA * D) * L.sn, Math.cos(legA * D) * L.sn]);
  let s = ln([20, G], [180, G], 2, EQ2, .5);
  if (p.seat) s += `<rect x="${cx - 26}" y="${hy + 3}" width="52" height="7" rx="3" fill="${EQ2}"/>` + ln([cx - 26 - 6, hy - 50], [cx - 26 - 6, G], 5, EQ2, .6) + ci(add(kL, [-7, -4]), 4, EQ2) + ci(add(kR, [7, -4]), 4, EQ2);
  s += `<path d="M${cx - 12} ${hy}L${shL[0]} ${shL[1]}L${shR[0]} ${shR[1]}L${cx + 12} ${hy}Z" fill="${BODY}" stroke="${BODY}" stroke-width="8" stroke-linejoin="round"/>`;
  s += ln(neck, hd, 6, BODY) + ci(hd, L.head, BODY);
  if (h('abs')) s += ln([cx, hy - 6], [cx, sy + 22], 9, HI);
  if (h('chest')) s += ln([cx - 9, sy + 9], [cx + 9, sy + 9], 9, HI);
  if (h('trap')) s += ln([cx - 9, sy - 1], [cx + 9, sy - 1], 6, HI);
  [[shL, eL, hL], [shR, eR, hR]].forEach(([sh, el, ha]) => { s += ln(sh, el, 9, BODY) + ln(el, ha, 7.5, BODY) + ci(ha, 3.6, BODY); if (h('delt')) s += ci(sh, 7, HI); if (h('ua')) s += ln(mid(sh, el, .15), mid(sh, el, .85), 6, HI); });
  [[[cx - 8, hy], kL, fL], [[cx + 8, hy], kR, fR]].forEach(([hp, kn, ft]) => { s += ln(hp, kn, 12, BODY) + ln(kn, ft, 9, BODY); if (h('th') || h('glute')) s += ln(mid(hp, kn, .1), mid(hp, kn, .85), 8, HI); });
  [hL, hR].forEach(ha => { s += `<rect x="${ha[0] - 3}" y="${ha[1] - 7}" width="6" height="14" rx="2" fill="${EQ}" opacity=".9"/>`; });
  return s; };
AN.frame = (key, t, muscle, equip) => { const P0 = P[key] || P.generic, p = mix(P0[2], P0[3], t);
  return P0[0] === 'f' ? drawFront(p, muscle) : drawSide(side(p, P0[1], P0[5]), muscle, P0[4] || '', equip || ''); };
// ---------- ciclo: só anima o que está visível ----------
const live = new Set(); let raf = 0, t0 = performance.now();
const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const loop = now => { raf = 0; const per = 2600, ph = ((now - t0) % per) / per, u = ph < .1 ? 0 : ph < .5 ? ease((ph - .1) / .4) : ph < .6 ? 1 : 1 - ease((ph - .6) / .4);
  let any = false; live.forEach(el => { if (!el.isConnected) { live.delete(el); return; } any = true; el.querySelector('g').innerHTML = AN.frame(el.dataset.ak, u, el.dataset.am, el.dataset.ae); });
  if (any) raf = requestAnimationFrame(loop); };
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); if (live.size && !raf) raf = requestAnimationFrame(loop); })) : null;
new MutationObserver(() => document.querySelectorAll('svg.anim:not([data-ao])').forEach(el => { el.setAttribute('data-ao', 1); if (io) io.observe(el); else live.add(el); if (!raf) raf = requestAnimationFrame(loop); })).observe(document.documentElement, { childList: true, subtree: true });
AN.L = L; AN.patterns = P;
AN.pose = (key, u) => { const P0 = P[key]; return P0 ? mix(P0[2], P0[3], u) : null; };
AN.joints = (key, u) => { const P0 = P[key]; if (!P0 || P0[0] === 'f') return null; return side(mix(P0[2], P0[3], u), P0[1], P0[5]); };
AN.svg = (info, cls = '') => { const k = AN.pattern(info); return `<svg class="anim ${cls}" viewBox="0 0 200 150" data-ak="${k}" data-am="${OS.U.esc(info.muscle || '')}" data-ae="${OS.U.esc(info.equip || '')}" role="img" aria-label="Animação: ${OS.U.esc(info.name || '')}"><rect width="200" height="150" rx="14" fill="var(--pn2)"/><g>${AN.frame(k, 0, info.muscle, info.equip)}</g></svg>`; };
})();
