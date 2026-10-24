/* PRUMO — países: cada pessoa escolhe o país onde vive (qualquer país do mundo) e o app adapta-se:
   moeda principal, língua da interface, formato de números e datas, escala de notas, feriados, notícias, bolsa e unidades.
   O perfil pessoal do Ryan (ps) e o modo sem conta ficam como sempre: euros e português de Portugal. */
(() => {
'use strict';
const U = OS.U;
// código do país : moeda : língua principal (ISO 3166-1, ISO 4217, BCP 47)
const RAW = 'AD:EUR:ca AE:AED:ar AF:AFN:fa AG:XCD:en AI:XCD:en AL:ALL:sq AM:AMD:hy AO:AOA:pt-PT AR:ARS:es AS:USD:en AT:EUR:de AU:AUD:en AW:AWG:nl AX:EUR:sv AZ:AZN:az '
  + 'BA:BAM:bs BB:BBD:en BD:BDT:bn BE:EUR:fr BF:XOF:fr BG:EUR:bg BH:BHD:ar BI:BIF:fr BJ:XOF:fr BL:EUR:fr BM:BMD:en BN:BND:ms BO:BOB:es BQ:USD:nl BR:BRL:pt-BR BS:BSD:en BT:BTN:en BW:BWP:en BY:BYN:ru BZ:BZD:en '
  + 'CA:CAD:en CC:AUD:en CD:CDF:fr CF:XAF:fr CG:XAF:fr CH:CHF:de CI:XOF:fr CK:NZD:en CL:CLP:es CM:XAF:fr CN:CNY:zh CO:COP:es CR:CRC:es CU:CUP:es CV:CVE:pt-PT CW:ANG:nl CX:AUD:en CY:EUR:el CZ:CZK:cs '
  + 'DE:EUR:de DJ:DJF:fr DK:DKK:da DM:XCD:en DO:DOP:es DZ:DZD:ar EC:USD:es EE:EUR:et EG:EGP:ar EH:MAD:ar ER:ERN:en ES:EUR:es ET:ETB:am FI:EUR:fi FJ:FJD:en FK:FKP:en FM:USD:en FO:DKK:da FR:EUR:fr '
  + 'GA:XAF:fr GB:GBP:en GD:XCD:en GE:GEL:ka GF:EUR:fr GG:GBP:en GH:GHS:en GI:GIP:en GL:DKK:da GM:GMD:en GN:GNF:fr GP:EUR:fr GQ:XAF:es GR:EUR:el GT:GTQ:es GU:USD:en GW:XOF:pt-PT GY:GYD:en '
  + 'HK:HKD:zh-TW HN:HNL:es HR:EUR:hr HT:HTG:fr HU:HUF:hu ID:IDR:id IE:EUR:en IL:ILS:he IM:GBP:en IN:INR:en IQ:IQD:ar IR:IRR:fa IS:ISK:is IT:EUR:it JE:GBP:en JM:JMD:en JO:JOD:ar JP:JPY:ja '
  + 'KE:KES:en KG:KGS:ru KH:KHR:km KI:AUD:en KM:KMF:fr KN:XCD:en KP:KPW:ko KR:KRW:ko KW:KWD:ar KY:KYD:en KZ:KZT:ru LA:LAK:lo LB:LBP:ar LC:XCD:en LI:CHF:de LK:LKR:en LR:LRD:en LS:LSL:en LT:EUR:lt LU:EUR:fr LV:EUR:lv LY:LYD:ar '
  + 'MA:MAD:fr MC:EUR:fr MD:MDL:ro ME:EUR:sr MF:EUR:fr MG:MGA:fr MH:USD:en MK:MKD:mk ML:XOF:fr MM:MMK:my MN:MNT:mn MO:MOP:zh-TW MP:USD:en MQ:EUR:fr MR:MRU:ar MS:XCD:en MT:EUR:en MU:MUR:en MV:MVR:en MW:MWK:en MX:MXN:es MY:MYR:ms MZ:MZN:pt-PT '
  + 'NA:NAD:en NC:XPF:fr NE:XOF:fr NF:AUD:en NG:NGN:en NI:NIO:es NL:EUR:nl NO:NOK:no NP:NPR:ne NR:AUD:en NU:NZD:en NZ:NZD:en OM:OMR:ar PA:USD:es PE:PEN:es PF:XPF:fr PG:PGK:en PH:PHP:en PK:PKR:en PL:PLN:pl PM:EUR:fr PN:NZD:en PR:USD:es PS:ILS:ar PT:EUR:pt-PT PW:USD:en PY:PYG:es '
  + 'QA:QAR:ar RE:EUR:fr RO:RON:ro RS:RSD:sr RU:RUB:ru RW:RWF:en SA:SAR:ar SB:SBD:en SC:SCR:en SD:SDG:ar SE:SEK:sv SG:SGD:en SH:SHP:en SI:EUR:sl SK:EUR:sk SL:SLE:en SM:EUR:it SN:XOF:fr SO:SOS:so SR:SRD:nl SS:SSP:en ST:STN:pt-PT SV:USD:es SX:ANG:nl SY:SYP:ar SZ:SZL:en '
  + 'TC:USD:en TD:XAF:fr TG:XOF:fr TH:THB:th TJ:TJS:ru TL:USD:pt-PT TM:TMT:ru TN:TND:fr TO:TOP:en TR:TRY:tr TT:TTD:en TV:AUD:en TW:TWD:zh-TW TZ:TZS:sw UA:UAH:uk UG:UGX:en US:USD:en UY:UYU:es UZ:UZS:uz '
  + 'VA:EUR:it VC:XCD:en VE:VES:es VG:USD:en VI:USD:en VN:VND:vi VU:VUV:en WF:XPF:fr WS:WST:en XK:EUR:sq YE:YER:ar YT:EUR:fr ZA:ZAR:en ZM:ZMW:en ZW:USD:en';
const C = {}; RAW.split(' ').forEach(x => { const [cc, cur, lang] = x.split(':'); C[cc] = { cc, cur, lang }; });
// semana a começar ao domingo; unidades imperiais
const SUN = new Set('US CA BR MX JP KR IL PH TW HK MO SA AE QA KW BH OM JO EG IN PK BD ZA ZW PE CO VE GT HN SV NI PA DO PR JM BS BZ BO PY TH KH LA MM ID'.split(' '));
const IMP = new Set(['US', 'LR', 'MM']);
/* escala de notas de cada país: min, max, aprovação, "boa", "muito boa", passo; inv = a nota mais baixa é a melhor (Alemanha, Áustria…) */
const SC = {
  p20: { min: 0, max: 20, pass: 9.5, good: 14, great: 17, step: .1 },
  p20pe: { min: 0, max: 20, pass: 10.5, good: 14, great: 17, step: .1 },
  p10br: { min: 0, max: 10, pass: 6, good: 8, great: 9, step: .1 },
  p10es: { min: 0, max: 10, pass: 5, good: 7, great: 9, step: .1 },
  p10mx: { min: 0, max: 10, pass: 6, good: 8, great: 9.5, step: .1 },
  p10ar: { min: 1, max: 10, pass: 4, good: 7, great: 9, step: .1 },
  p10nl: { min: 1, max: 10, pass: 5.5, good: 7, great: 8.5, step: .1 },
  p30it: { min: 0, max: 30, pass: 18, good: 25, great: 28, step: 1 },
  p7cl: { min: 1, max: 7, pass: 4, good: 5.5, great: 6.5, step: .1 },
  p5co: { min: 0, max: 5, pass: 3, good: 4, great: 4.5, step: .1 },
  p6ch: { min: 1, max: 6, pass: 4, good: 5, great: 5.5, step: .25 },
  p5ru: { min: 2, max: 5, pass: 3, good: 4, great: 5, step: 1 },
  inv5de: { min: 1, max: 5, pass: 4, good: 2.3, great: 1.5, step: .1, inv: 1 },
  inv5cz: { min: 1, max: 5, pass: 4, good: 2, great: 1, step: 1, inv: 1 },
  p100us: { min: 0, max: 100, pass: 60, good: 80, great: 90, step: 1 },
  p100gb: { min: 0, max: 100, pass: 40, good: 60, great: 70, step: 1 },
  p100: { min: 0, max: 100, pass: 50, good: 70, great: 85, step: 1 } };
const GRADE = { p20: 'PT FR BE LU AO MZ CV GW ST TL TN MA DZ LB VE SN CI CM GA CG CD ML BF NE TG BJ MG HT', p20pe: 'PE', p10br: 'BR', p10es: 'ES GR RO DO CU', p10mx: 'MX EC SV GT HN NI PA CR BO PY UY', p10ar: 'AR', p10nl: 'NL',
  p30it: 'IT SM VA', p7cl: 'CL', p5co: 'CO', p6ch: 'CH LI', p5ru: 'RU BY UA KZ PL BG', inv5de: 'DE AT', inv5cz: 'CZ SK', p100us: 'US CA PH JP CN KR TW', p100gb: 'GB IE IN NG GH KE' };
const GBY = {}; Object.entries(GRADE).forEach(([k, l]) => l.split(' ').forEach(cc => GBY[cc] = k));

const acc = () => OS.Acc || {};
// pessoas com conta (perfis "pub") seguem o seu país; o perfil pessoal do Ryan e o modo local ficam em Portugal/euros, salvo escolha explícita
const pub = () => !!(acc().on && acc().pub);
const prof = () => (OS.one ? OS.one('profile') : {}) || {};
const P = OS.Pais = {
  data: C,
  has: cc => !!C[cc],
  codes: () => Object.keys(C),
  code: () => { const c = prof().country; return C[c] ? c : 'PT'; },
  name: (cc, lang) => { try { return new Intl.DisplayNames([lang || (OS.Lang ? OS.Lang.base() : 'pt'), 'pt'], { type: 'region' }).of(cc) || cc; } catch (e) { return cc; } },
  // a lista para escolher, por ordem alfabética na língua de quem lê (Portugal e Brasil primeiro)
  list: lang => { const L = Object.keys(C).filter(cc => cc !== 'PT' && cc !== 'BR').map(cc => [cc, P.name(cc, lang)]).sort((a, b) => a[1].localeCompare(b[1], lang || 'pt')); return [['PT', P.name('PT', lang)], ['BR', P.name('BR', lang)]].concat(L); },
  flag: cc => /^[A-Z]{2}$/.test(cc || '') ? String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0))) : '',
  curOf: cc => (C[cc] || {}).cur || 'EUR',
  langOf: cc => (C[cc] || {}).lang || 'en',
  sunday: cc => SUN.has(cc || P.code()),
  imperial: cc => IMP.has(cc || P.code()),
  scaleKey: cc => GBY[cc || P.code()] || 'p100',
  pub };
// moeda principal do perfil: a escolhida; senão a do país (só contas novas); senão euros
OS.cur = () => { const p = prof(); if (p.cur && /^[A-Z]{3}$/.test(p.cur)) return p.cur; if (pub() && C[p.country]) return C[p.country].cur; return 'EUR'; };

/* ---------- escala de notas ---------- */
const G = OS.Grade = {
  key: () => { const p = prof(); return SC[p.gradeScale] ? p.gradeScale : pub() || p.gradeScale ? P.scaleKey(P.code()) : 'p20'; },
  s: () => SC[G.key()],
  all: SC,
  label: (s = G.s()) => s.inv ? `${U.nf(s.min, s.step < 1 ? 1 : 0)}–${U.nf(s.max, s.step < 1 ? 1 : 0)}` : `${U.nf(s.min)}–${U.nf(s.max)}`,
  // 0 (pior) a 1 (melhor), qualquer escala
  frac: g => { const s = G.s(), v = U.num(g); const f = (v - s.min) / (s.max - s.min); return Math.max(0, Math.min(1, s.inv ? 1 - f : f)); },
  fromFrac: f => { const s = G.s(); return s.inv ? s.max - f * (s.max - s.min) : s.min + f * (s.max - s.min); },
  better: (a, b) => G.s().inv ? U.num(a) <= U.num(b) : U.num(a) >= U.num(b),   // a é pelo menos tão boa como b
  ok: g => G.better(g, G.s().pass),
  pass: () => G.s().pass, good: () => G.s().good, great: () => G.s().great, max: () => G.s().max, min: () => G.s().min, inv: () => !!G.s().inv,
  fmt: g => U.nf(U.num(g), G.s().step < 1 ? 1 : 0),
  // converte uma nota guardada na escala de 0–20 (dados antigos e exemplos) para a escala atual
  from20: v => G.fromFrac(U.num(v) / 20) };

/* ---------- feriados de qualquer país (Nager.Date, grátis, sem chave); Portugal e Brasil continuam calculados no app ---------- */
const HK = 'os2hol:';
const HOLN = {}, busy = {};
P.holidays = (cc, y) => { const k = cc + y; if (HOLN[k]) return HOLN[k]; const c = U.ls.get(HK + k, null); if (c && c.m) { HOLN[k] = c.m; return c.m; }
  if (!busy[k] && navigator.onLine !== false) { busy[k] = 1; fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${cc}`).then(r => r.ok ? r.json() : []).then(L => { const m = {};
      const lg = OS.Lang ? OS.Lang.base() : 'pt'; (Array.isArray(L) ? L : []).filter(h => h.global !== false && (h.types || ['Public']).includes('Public')).forEach(h => { m[h.date] = lg === 'en' || lg === P.langOf(cc).slice(0, 2) ? (lg === 'en' ? h.name : h.localName) : h.localName || h.name; });
      HOLN[k] = m; U.ls.set(HK + k, { at: Date.now(), m }); OS.request && OS.request(); }).catch(() => { setTimeout(() => { busy[k] = 0; }, 6e5); }); }
  return {}; };

/* ---------- Definições › Geral: país, língua, moeda, notas e unidades ---------- */
const SCN = { p20: '0–20 (Portugal, França…)', p20pe: '0–20, passa com 11 (Peru)', p10br: '0–10, passa com 6 (Brasil)', p10es: '0–10, passa com 5 (Espanha…)', p10mx: '0–10, passa com 6 (México…)', p10ar: '1–10, passa com 4 (Argentina)', p10nl: '1–10, passa com 5,5 (Países Baixos)',
  p30it: '18–30 (Itália, universidade)', p7cl: '1–7 (Chile)', p5co: '0–5 (Colômbia)', p6ch: '1–6, 6 é a melhor (Suíça)', p5ru: '2–5 (Rússia, Polónia…)', inv5de: '1–5, 1 é a melhor (Alemanha, Áustria)', inv5cz: '1–5, 1 é a melhor (Chéquia, Eslováquia)', p100us: '0–100 / letras A–F (EUA…)', p100gb: '0–100, passa com 40 (Reino Unido…)', p100: '0–100, passa com 50' };
const curName = c => { try { return new Intl.DisplayNames([OS.Lang ? OS.Lang.base() : 'pt'], { type: 'currency' }).of(c); } catch (e) { return c; } };
const opt = (v, l, sel) => `<option value="${U.esc(v)}"${v === sel ? ' selected' : ''}>${U.esc(l)}</option>`;
const panel = () => { const p = prof(), cc = P.code(), curs = [...new Set([P.curOf(cc), 'EUR', 'USD', 'BRL', 'GBP', 'CHF'].concat([...new Set(Object.values(C).map(x => x.cur))].sort()))];
  return `<div class="pn" id="paisSet"><div class="pn-h"><h3>${OS.UI.ic('globe')}País, língua e moeda</h3></div>
  <p class="mut" style="margin:0 0 10px">O Prumo adapta-se ao sítio onde vives: feriados, moeda, formato das datas e dos números, escala das notas, notícias e a língua de tudo (também a da IA e da voz).</p>
  <div class="g g2" style="gap:10px">
    <label class="fld"><span>País onde vives</span><select class="field" data-pset="country">${P.list().map(([c, n]) => opt(c, P.flag(c) + ' ' + n, cc)).join('')}</select></label>
    <label class="fld"><span>Língua do app</span><select class="field" data-pset="lang" data-notr>${opt('', 'Automática (do país) · ' + (OS.Lang ? OS.Lang.name(OS.Lang.code()) : ''), p.lang || '')}${(OS.Lang ? OS.Lang.list() : []).map(c => opt(c, OS.Lang.name(c), p.lang || '')).join('')}</select></label>
    <label class="fld"><span>Moeda principal</span><select class="field" data-pset="cur">${opt('', 'Automática (' + OS.cur() + ')', p.cur || '')}${curs.map(c => opt(c, c + ' · ' + curName(c), p.cur || '')).join('')}</select></label>
    <label class="fld"><span>Escala das notas</span><select class="field" data-pset="gradeScale">${opt('', 'Automática (' + (SCN[G.key()] || G.key()) + ')', p.gradeScale || '')}${Object.keys(SC).map(k => opt(k, SCN[k] || k, p.gradeScale || '')).join('')}</select></label>
    <label class="fld"><span>Unidades</span><select class="field" data-pset="units">${opt('', 'Automáticas (' + (OS.Units.imp() ? 'libras e milhas' : 'kg e km') + ')', p.units || '')}${opt('met', 'Métricas (kg, km, °C)', p.units || '')}${opt('imp', 'Imperiais (lb, mi, °F)', p.units || '')}</select></label>
  </div></div>`; };
document.addEventListener('change', e => { const el = e.target.closest && e.target.closest('[data-pset]'); if (!el) return; const k = el.dataset.pset, v = el.value;
  OS.setOne('profile', { [k]: v }); OS.U.ls.set('nau:lang', '');
  if (k === 'country' || k === 'lang') { if (OS.Lang) OS.Lang.apply(); }
  OS.UI && OS.UI.toast && OS.UI.toast('Guardado', 'pos'); OS.request && OS.request(); });
OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._pais) return; OS.views.definicoes = sub => o(sub) + (String(sub || '') === '' ? panel() : ''); OS.views.definicoes._pais = 1; });

/* ---------- unidades (sistema imperial nos EUA, Libéria e Myanmar) ---------- */
OS.Units = {
  imp: () => { const p = prof(); return p.units ? p.units === 'imp' : pub() && P.imperial(); },
  kg: v => OS.Units.imp() ? U.nf(U.num(v) * 2.20462, 1) + ' lb' : U.nf(U.num(v), 1) + ' kg',
  km: v => OS.Units.imp() ? U.nf(U.num(v) * .621371, 1) + ' mi' : U.nf(U.num(v), 1) + ' km',
  temp: c => OS.Units.imp() ? Math.round(U.num(c) * 9 / 5 + 32) + '°F' : Math.round(U.num(c)) + '°C' };
})();
