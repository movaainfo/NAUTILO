/* NÁUTILO — taxas e inflação AO VIVO para os simuladores.
   Vai buscar os últimos valores publicados às fontes oficiais (sem chave, direto do navegador) e guarda-os 6 h:
   zona euro → Eurostat (inflação HICP) + BCE (taxas dos bancos: depósitos, poupança, crédito ao consumo);
   Brasil → Banco Central do Brasil (IPCA 12 m, CDI, Selic, poupança, crédito pessoal);
   EUA → BLS (CPI) + Tesouro (T-Bills); Reino Unido, Suíça, México → OCDE; Canadá → Banco do Canadá;
   Argentina → BCRA; Angola, Moçambique, Cabo Verde → Banco Mundial (anual).
   Sem ligação ficam os últimos valores obtidos ou, na falta deles, os valores de referência. */
(() => {
'use strict';
const U = OS.U, A = OS.act;
const KEY = 'oc_rates1', TTL = 6 * 36e5, RETRY = 10 * 6e4;
const LR = OS.LiveRates = { busy: {} };
let mem = {}; try { mem = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { mem = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { } };
const to = (p, ms = 25000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('tempo esgotado')), ms))]);
const get = (u, kind = 'json') => to(fetch(u, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return kind === 'json' ? r.json() : r.text(); }));
const csv = t => { const rows = []; let row = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; } else if (ch === '"') q = true; else if (ch === ',') { row.push(f); f = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += ch; } if (f || row.length) { row.push(f); rows.push(row); } const H = rows.shift() || []; return rows.filter(r => r.length > 1).map(r => Object.fromEntries(H.map((k, i) => [k, r[i]]))); };
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const pt = (v, d, s) => { if (v == null) return null; d = String(d || ''); const t = U.today(); if (d.length >= 10 && d > t) d = t; return { v: Math.round(v * 100) / 100, d, s }; };
const fresh = (x, months = 18) => { if (!x || !x.d) return x; const m = x.d.match(/^(\d{4})(?:-(\d{2}))?/); if (!m) return x; const age = (new Date().getFullYear() - +m[1]) * 12 + (new Date().getMonth() + 1 - (+m[2] || 12)); return age <= (m[2] ? months : 30) ? x : null; };
const yr = r => (Math.pow(1 + r / 100, 12) - 1) * 100, mo = r => (Math.pow(1 + r / 100, 1 / 12) - 1) * 100;

/* ---------- fontes ---------- */
const ECB = 'https://data-api.ecb.europa.eu/service/data/', ESTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
const mir = async cc => { const r = csv(await get(`${ECB}MIR/M.${cc}.B.L22%2BL23%2BA2B.A%2BD%2BF.R.A.2250.EUR.N?lastNObservations=1&format=csvdata`, 'text')), o = {};
  const pick = (k, name) => { const x = r.find(y => y.KEY === `MIR.M.${cc}.B.${k}.R.A.2250.EUR.N` && y.OBS_VALUE !== ''); if (x) o[name] = pt(num(x.OBS_VALUE), x.TIME_PERIOD, 'BCE'); };
  pick('L22.F', 'dep'); pick('L23.D', 'sav'); pick('A2B.A', 'loan'); return o; };
const ecb = async key => { const r = csv(await get(ECB + key + '?lastNObservations=1&format=csvdata', 'text')).filter(x => x.OBS_VALUE !== '' && x.OBS_VALUE != null); const x = r[r.length - 1]; return x ? pt(num(x.OBS_VALUE), x.TIME_PERIOD, 'BCE') : null; };
const hicp = async cc => { const d = await get(`${ESTAT}prc_hicp_minr?geo=${cc}&unit=RCH_A&coicop18=TOTAL&lastTimePeriod=1`); const t = Object.keys(d.dimension.time.category.index)[0], v = d.value && d.value['0']; return v == null ? null : pt(v, t, 'Eurostat'); };
const bcb = async (s, f = v => v) => { const r = await get(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s}/dados/ultimos/1?formato=json`); const x = r && r[0]; if (!x) return null; const [d, m, y] = x.data.split('/'); return pt(f(num(x.valor)), `${y}-${m}-${d}`, 'Banco Central do Brasil'); };
const OECD = 'https://sdmx.oecd.org/public/rest/data/';
const oecd = async (flow, key, src = 'OCDE') => { const r = csv(await get(`${OECD}${flow}/${key}?lastNObservations=1&format=csv`, 'text')); const x = r[0]; return x ? pt(num(x.OBS_VALUE), x.TIME_PERIOD, src) : null; };
const ISO3 = { GB: 'GBR', CH: 'CHE', MX: 'MEX', US: 'USA', CA: 'CAN' };
const cpiO = cc => oecd('OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0', `${ISO3[cc]}.M.N.CPI.PA._T.N.GY`), r3m = cc => oecd('OECD.SDD.STES,DSD_STES@DF_FINMARK,4.0', `${ISO3[cc]}.M.IR3TIB.PA.....`);
const wb = async (cc, ind) => { const r = await get(`https://api.worldbank.org/v2/country/${cc}/indicator/${ind}?format=json&mrnev=1`); const x = r && r[1] && r[1][0]; return x && x.value != null ? pt(x.value, x.date, 'Banco Mundial') : null; };
const bcra = async id => { const r = await get(`https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/${id}?limit=1`); const x = r && r.results && r.results[0] && r.results[0].detalle && r.results[0].detalle[0]; return x ? pt(x.valor, x.fecha, 'BCRA') : null; };
const bls = async () => { const r = await get('https://api.bls.gov/publicAPI/v1/timeseries/data/CUUR0000SA0'); const d = r.Results.series[0].data, a = d[0], b = d.find(x => x.period === a.period && +x.year === +a.year - 1); return b ? pt((a.value / b.value - 1) * 100, `${a.year}-${a.period.slice(1)}`, 'BLS (EUA)') : null; };
const tbill = async () => { const r = await get('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?filter=security_desc:eq:Treasury%20Bills&sort=-record_date&page%5Bsize%5D=1'); const x = r.data && r.data[0]; return x ? pt(num(x.avg_interest_rate_amt), x.record_date, 'Tesouro dos EUA') : null; };
const boc = async () => { const r = await get('https://www.bankofcanada.ca/valet/observations/STATIC_TOTALCPICHANGE,V39079/json?recent=1'), o = {}; (r.observations || []).forEach(x => { if (x.STATIC_TOTALCPICHANGE) o.inf = pt(num(x.STATIC_TOTALCPICHANGE.v), x.d, 'Banco do Canadá'); if (x.V39079) o.on = pt(num(x.V39079.v), x.d, 'Banco do Canadá'); }); return o; };

/* o que alimenta cada produto da aba "Comparar taxas" (índice do produto no perfil do país) */
const PMAP = { PT: { 0: 'dep' }, ES: { 0: 'dep' }, FR: { 0: 'sav' }, IT: { 0: 'dep' }, DE: { 0: 'sav', 1: 'dep' }, IE: { 0: 'dep' }, BE: { 0: 'sav' }, NL: { 0: 'sav', 1: 'dep' }, LU: { 0: 'sav', 1: 'dep' },
  BR: { 0: 'poup', 1: 'cdi', 2: 'lci' }, US: { 1: 'tbill' }, MX: { 1: 'r3m' }, AR: { 1: 'pf', 2: 'uva' }, AO: { 0: 'dep' }, MZ: { 0: 'dep' }, CV: { 0: 'dep' } };
const EURO = ['PT', 'ES', 'FR', 'IT', 'DE', 'IE', 'BE', 'NL', 'LU'];
const settle = async o => { const k = Object.keys(o), r = await Promise.allSettled(k.map(x => o[x])), out = {}; r.forEach((x, i) => { if (x.status === 'fulfilled' && x.value) out[k[i]] = x.value; }); return out; };
const FETCH = cc => {
  if (EURO.includes(cc)) return settle({ inf: hicp(cc), mir: mir(cc), dfr: ecb('FM/D.U2.EUR.4F.KR.DFR.LEV') }).then(o => { const m = o.mir || {}; delete o.mir; return Object.assign(o, m); });
  if (cc === 'BR') return settle({ inf: bcb(13522), cdi: bcb(4389), selic: bcb(432), poup: bcb(195, yr), loan: bcb(20742, mo), cons: bcb(20746, mo) }).then(o => { if (!o.cdi && o.selic) o.cdi = Object.assign({}, o.selic, { v: Math.round((o.selic.v - .1) * 100) / 100 }); if (o.cdi) o.lci = Object.assign({}, o.cdi, { v: Math.round(o.cdi.v * 90) / 100 }); return o; });
  if (cc === 'US') return settle({ inf: bls(), tbill: tbill(), r3m: r3m('US') });
  if (cc === 'CA') return boc();
  if (cc === 'GB' || cc === 'CH' || cc === 'MX') return settle({ inf: cpiO(cc), r3m: r3m(cc), wbinf: wb(cc, 'FP.CPI.TOTL.ZG') });
  if (cc === 'AR') return settle({ inf: bcra(28), pf: bcra(1190), loan: bcra(14), badlar: bcra(7) }).then(o => { if (o.inf) o.uva = Object.assign({}, o.inf, { v: Math.round((o.inf.v + 1) * 100) / 100 }); return o; });
  return settle({ inf: wb(cc, 'FP.CPI.TOTL.ZG'), dep: wb(cc, 'FR.INR.DPST'), loan: wb(cc, 'FR.INR.LEND') });
};
/* junta as séries no formato que os simuladores usam */
const shape = (cc, o) => { Object.keys(o).forEach(k => { o[k] = fresh(o[k]); if (!o[k]) delete o[k]; });
  if (!o.inf && o.wbinf) o.inf = o.wbinf;
  const dk = ['dep', 'sav', 'cdi', 'tbill', 'pf', 'r3m', 'on'].find(k => o[k]), v = { inf: o.inf, loan: o.loan, dep: dk ? o[dk] : null, depL: { dep: 'Depósitos a prazo', sav: 'Poupança', cdi: 'CDI', tbill: 'T-Bills', pf: 'Plazo fijo', r3m: 'Juro a 3 meses', on: 'Taxa do banco central' }[dk], prod: {}, raw: o };
  Object.entries(PMAP[cc] || {}).forEach(([i, k]) => { if (o[k]) v.prod[i] = o[k]; });
  return v; };

LR.vals = cc => (mem[cc] && mem[cc].v) || null;
LR.state = cc => LR.busy[cc] ? 'busy' : mem[cc] && mem[cc].v ? (mem[cc].fail ? 'stale' : 'live') : mem[cc] && mem[cc].fail ? 'fail' : 'none';
LR.when = cc => mem[cc] && mem[cc].ok;
LR.fetch = (cc, force) => { const m = mem[cc]; if (LR.busy[cc]) return LR.busy[cc];
  if (!force && m && Date.now() - m.at < (m.fail ? RETRY : TTL)) return Promise.resolve(m.v);
  const job = FETCH(cc).then(o => { const prev = m && m.v && m.v.raw || {}, v = shape(cc, Object.assign({}, prev, o || {})), any = Object.keys(o || {}).length; mem[cc] = any ? { at: Date.now(), ok: Date.now(), v } : Object.assign({}, m, { at: Date.now(), fail: 1 }); save(); return mem[cc].v; })
    .catch(() => { mem[cc] = Object.assign({}, m, { at: Date.now(), fail: 1 }); save(); return m && m.v; })
    .finally(() => { delete LR.busy[cc]; if (/^#?simuladores/.test(location.hash.replace('#', ''))) OS.request(); });
  LR.busy[cc] = job; return job; };
A.ratesRefresh = () => { const cc = OS.Country ? OS.Country.code() : 'PT'; LR.fetch(cc, true); OS.request(); };
/* texto curto: "inflação 3,6% (set 2026 · Eurostat)" */
LR.when2 = d => { d = String(d || ''); return /^\d{4}-\d{2}/.test(d) ? U.fmtYM(d.slice(0, 7)) : d; };
})();
