/* NÁUTILO — motor de mercado dos Investimentos.
   Cotações ao vivo: Yahoo Finance através do teu script Google (ações, ETFs, fundos, FII, índices, câmbio, cripto de todas as bolsas),
   cripto em tempo real por streaming (Binance) e CoinGecko, câmbio diário do BCE (Frankfurter), EUA em streaming com chave Finnhub (opcional).
   Renda fixa: rende sozinha com CDI, Selic, IPCA e poupança diários do Banco Central do Brasil, ou taxa pré-fixada.
   Histórico: reconstrói a carteira dia a dia → rentabilidade (TWR e TIR), volatilidade, Sharpe, queda máxima, meses. */
(() => {
'use strict';
const U = OS.U, L = OS.L, Inv = OS.Inv;
const IX = OS.InvX = { ver: 0, st: {} };
OS.ONE_DEF.invcfg = { fh: '', view: 'EUR', watch: [], perfil: null, ips: '', tgt: {}, meta: 0, auto: 1 };
const cfg = () => OS.one('invcfg');
const n = v => U.num(v) || 0;
const today = () => U.today();

/* ================= cotações ================= */
const PX = IX.px = U.ls.get('oc_px1', {}) || {};
const savePx = U.deb(() => U.ls.set('oc_px1', PX), 1500);
const CRYPTO = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano', XRP: 'ripple', DOT: 'polkadot', DOGE: 'dogecoin', BNB: 'binancecoin', USDT: 'tether', USDC: 'usd-coin', LTC: 'litecoin', AVAX: 'avalanche-2', LINK: 'chainlink', MATIC: 'matic-network', POL: 'polygon-ecosystem-token', TRX: 'tron', XLM: 'stellar', ATOM: 'cosmos', SHIB: 'shiba-inu', TON: 'the-open-network', NEAR: 'near', UNI: 'uniswap', ARB: 'arbitrum', OP: 'optimism', PEPE: 'pepe', SUI: 'sui', APT: 'aptos', BCH: 'bitcoin-cash', ETC: 'ethereum-classic', XMR: 'monero' };
const isCrypto = s => /^[A-Z0-9]{2,10}-(EUR|USD|BRL|USDT|GBP)$/.test(s || '');
IX.isCrypto = isCrypto;
const normQ = q => { if (!q) return q; if (q.cur === 'GBp' || q.cur === 'GBX') return Object.assign({}, q, { cur: 'GBP', p: q.p / 100, pc: q.pc / 100, hi: q.hi / 100, lo: q.lo / 100, h52: q.h52 / 100, l52: q.l52 / 100, d: (q.d || []).map(x => x / 100) }); if (q.cur === 'ZAc') return Object.assign({}, q, { cur: 'ZAR', p: q.p / 100, pc: q.pc / 100 }); return q; };
IX.q = s => s && PX[s] ? normQ(PX[s]) : null;
IX.setQ = (s, o, src) => { const old = PX[s] || {}; PX[s] = Object.assign({}, old, o, { at: Date.now(), src }); IX.ver++; savePx(); IX.paint(s, old.p); };
/* sem nova ação do mercado há muito tempo? */
IX.age = s => { const q = PX[s]; return q && q.at ? Date.now() - q.at : Infinity; };

/* ---------- o script Google (Yahoo Finance) ---------- */
const scr = () => { const c = OS.one('inbox'); return c && c.url && c.key ? c : null; };
IX.hasScript = () => !!scr();
const sget = async (qs, ms = 25000) => { const c = scr(); if (!c) throw new Error('sem script');
  const u = c.url + (c.url.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(c.key) + qs + '&_=' + Date.now();
  const r = await Promise.race([fetch(u, { cache: 'no-store', credentials: 'omit' }), new Promise((_, ko) => setTimeout(() => ko(new Error('tempo esgotado')), ms))]);
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { throw new Error('o script respondeu com uma página (implementação com acesso "Qualquer pessoa"?)'); }
  if (j.msg === 'Chave errada') throw new Error('chave do script errada'); return j; };
IX.scriptQuotes = async syms => { syms = [...new Set(syms.filter(Boolean))]; if (!syms.length) return 0; let got = 0;
  for (let i = 0; i < syms.length; i += 40) { const j = await sget('&op=q&s=' + encodeURIComponent(syms.slice(i, i + 40).join(',')));
    if (!j.q) { IX.st.script = 'old'; IX.st.oldAt = Date.now(); throw new Error('script antigo'); }
    Object.entries(j.q).forEach(([s, o]) => { if (o && o.p != null) { IX.setQ(s, o, 'Yahoo Finance'); got++; } }); }
  IX.st.script = 'ok'; IX.st.scriptAt = Date.now(); return got; };
IX.fund = async s => { const k = 'oc_f1_' + s, c = U.ls.get(k, null); if (c && Date.now() - c.at < 12 * 36e5) return c.f; const j = await sget('&op=f&s=' + encodeURIComponent(s), 40000); if (!j.f) { IX.st.script = 'old'; throw new Error('script antigo'); } try { U.ls.set(k, { at: Date.now(), f: j.f }); } catch (e) { } return j.f; };
IX.agenda = async syms => { const j = await sget('&op=c&s=' + encodeURIComponent(syms.slice(0, 25).join(',')), 40000); if (!j.c) { IX.st.script = 'old'; throw new Error('script antigo'); } return j.c; };
IX.search = async (q, news = 0) => { const j = await sget('&op=s&q=' + encodeURIComponent(q) + '&n=' + news); if (!j.q) { IX.st.script = 'old'; throw new Error('script antigo'); } return j; };
/* histórico de um símbolo (guardado 12 h no aparelho) */
const HK = (s, r, i) => 'oc_h1_' + s + '_' + r + '_' + i;
IX.hist = async (s, r = '1y', i = '1d') => { const k = HK(s, r, i), c = U.ls.get(k, null); if (c && Date.now() - c.at < 12 * 36e5) return c.h;
  try { let h = null;
    if (scr()) { const j = await sget(`&op=h&s=${encodeURIComponent(s)}&r=${r}&i=${i}`); h = j.h || null; }
    else if (isCrypto(s)) h = await cgHist(s, r);
    if (h && h.t && h.t.length) { try { U.ls.set(k, { at: Date.now(), h }); } catch (e) { } return h; }
  } catch (e) { if (c) return c.h; throw e; }
  return c ? c.h : null; };

/* ---------- cripto sem script: CoinGecko (preço) e Binance (tempo real) ---------- */
const cgId = s => { const [b] = String(s).split('-'); return CRYPTO[b] || (OS.all('assets').find(a => a.sym === s && a.cg) || {}).cg || null; };
IX.cgQuotes = async syms => { const by = {}; syms.filter(isCrypto).forEach(s => { const id = cgId(s); if (id) (by[id] = by[id] || []).push(s); }); const ids = Object.keys(by); if (!ids.length) return 0;
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=eur,usd,brl,gbp&include_24hr_change=true&include_last_updated_at=true`); if (!r.ok) throw new Error('CoinGecko ' + r.status); const j = await r.json(); let got = 0;
  Object.entries(by).forEach(([id, ss]) => ss.forEach(s => { const c = s.split('-')[1].toLowerCase().replace('usdt', 'usd'), o = j[id]; if (!o || o[c] == null) return; const p = o[c], ch = o[c + '_24h_change'] || 0;
    if (PX[s] && PX[s].src === 'Binance (tempo real)' && IX.age(s) < 60000) return; IX.setQ(s, { p, pc: p / (1 + ch / 100), cur: c.toUpperCase(), nm: (PX[s] && PX[s].nm) || id, t: o.last_updated_at, open: true, ex: 'Cripto 24h' }, 'CoinGecko'); got++; }));
  return got; };
const cgHist = async (s, r) => { const id = cgId(s); if (!id) return null; const c = s.split('-')[1].toLowerCase().replace('usdt', 'usd'), days = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730, '5y': 1825, '10y': 3650, max: 'max' }[r] || 365;
  const j = await (await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${c}&days=${days}&interval=daily`)).json();
  return { cur: c.toUpperCase(), t: (j.prices || []).map(x => Math.round(x[0] / 1000)), c: (j.prices || []).map(x => x[1]), div: [], spl: [] }; };
let ws = null, wsSyms = '';
const wsStart = syms => { const cs = [...new Set(syms.filter(isCrypto))].sort(), key = cs.join(','); if (key === wsSyms && ws && ws.readyState <= 1) return; if (ws) { try { ws.close(); } catch (e) { } ws = null; } wsSyms = key; if (!cs.length || !('WebSocket' in window)) return;
  const map = {}; cs.forEach(s => { const [b, c] = s.split('-'); map[(b + (c === 'USD' ? 'USDT' : c)).toLowerCase()] = s; });
  try { ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + Object.keys(map).map(x => x + '@miniTicker').join('/'));
    ws.onmessage = e => { try { const d = JSON.parse(e.data).data; const s = map[String(d.s).toLowerCase()]; if (!s) return; IX.setQ(s, { p: +d.c, pc: +d.o, hi: +d.h, lo: +d.l, open: true, cur: s.split('-')[1].replace('USDT', 'USD'), t: Math.round(d.E / 1000) }, 'Binance (tempo real)'); IX.st.ws = 'ok'; } catch (er) { } };
    ws.onerror = () => { IX.st.ws = 'erro'; }; ws.onclose = () => { ws = null; };
  } catch (e) { IX.st.ws = 'erro'; } };
/* ---------- EUA em tempo real (Finnhub, chave grátis opcional) ---------- */
let fh = null, fhSyms = '';
const isUS = s => /^[A-Z]{1,5}$/.test(s || '');
const fhStart = syms => { const k = cfg().fh, us = [...new Set(syms.filter(isUS))].sort(), key = k + '|' + us.join(','); if (key === fhSyms && fh && fh.readyState <= 1) return; if (fh) { try { fh.close(); } catch (e) { } fh = null; } fhSyms = key; if (!k || !us.length || !('WebSocket' in window)) return;
  try { fh = new WebSocket('wss://ws.finnhub.io?token=' + encodeURIComponent(k)); fh.onopen = () => us.forEach(s => fh.send(JSON.stringify({ type: 'subscribe', symbol: s })));
    fh.onmessage = e => { try { const j = JSON.parse(e.data); if (j.type !== 'trade') return; const last = {}; (j.data || []).forEach(t => last[t.s] = t); Object.values(last).forEach(t => IX.setQ(t.s, { p: t.p, t: Math.round(t.t / 1000), open: true }, 'Finnhub (tempo real)')); IX.st.fh = 'ok'; } catch (er) { } };
    fh.onerror = () => { IX.st.fh = 'erro'; }; fh.onclose = () => { fh = null; };
  } catch (e) { IX.st.fh = 'erro'; } };

/* ---------- câmbio: BCE (Frankfurter) diário + Yahoo ao vivo quando há script ---------- */
const FXS = U.ls.get('oc_fx1', null);
IX.fxRates = FXS && FXS.r ? FXS.r : null; IX.fxDate = FXS && FXS.d;
IX.loadFx = async () => { if (FXS && IX.fxRates && Date.now() - FXS.at < 6 * 36e5) return; try { const j = await (await fetch('https://api.frankfurter.dev/v1/latest?base=EUR')).json(); if (j && j.rates) { IX.fxRates = j.rates; IX.fxDate = j.date; U.ls.set('oc_fx1', { at: Date.now(), r: j.rates, d: j.date }); IX.ver++; } } catch (e) { } };
const FXLIVE = { USD: 'EURUSD=X', BRL: 'EURBRL=X', GBP: 'EURGBP=X', CHF: 'EURCHF=X', CAD: 'EURCAD=X', JPY: 'EURJPY=X' };
/* quantos EUR vale 1 unidade de "cur" */
const fxBase = Inv.fx;
IX.perEur = cur => { if (!cur || cur === 'EUR') return 1; const q = FXLIVE[cur] && PX[FXLIVE[cur]]; if (q && q.p && Date.now() - q.at < 864e5) return q.p; return IX.fxRates && IX.fxRates[cur] ? IX.fxRates[cur] : null; };
Inv.fx = cur => { if (!cur || cur === 'EUR') return 1; const r = IX.perEur(cur); if (r) return 1 / r; return fxBase(cur); };
const fxMissBase = Inv.fxMissing;
Inv.fxMissing = () => fxMissBase().filter(c => !IX.perEur(c));
/* moeda de visualização (EUR, BRL, USD…) */
IX.view = () => cfg().view || 'EUR';
IX.toView = eur => { const v = IX.view(); if (v === 'EUR') return eur; const r = IX.perEur(v); return r ? eur * r : eur; };
const SYM = { EUR: '€', BRL: 'R$', USD: 'US$', GBP: '£', CHF: 'CHF', CAD: 'C$', JPY: '¥' };
IX.M = (eur, o = {}) => { const v = IX.toView(eur), d = o.dec ?? 2, x = Number(v) || 0; return (o.sign && x > 0 ? '+' : '') + (x < 0 ? '−' : '') + (SYM[IX.view()] || IX.view()) + ' ' + Math.abs(x).toLocaleString(IX.view() === 'BRL' ? 'pt-BR' : 'pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d }); };
IX.MK = eur => { const v = IX.toView(eur), a = Math.abs(v), s = SYM[IX.view()] || '', g = v < 0 ? '−' : ''; return a >= 1e6 ? g + s + U.r1(a / 1e6) + 'M' : a >= 1e4 ? g + s + Math.round(a / 1e3) + 'k' : g + s + Math.round(a); };
IX.Mc = (v, cur, d = 2) => (SYM[cur] || cur || '€') + ' ' + (Number(v) || 0).toLocaleString(cur === 'BRL' ? 'pt-BR' : 'pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ================= renda fixa (CDI, Selic, IPCA, poupança do Banco Central do Brasil) ================= */
const SER = { cdi: 12, selic: 11, ipca: 433, poup: 195 };
const SK = id => 'oc_bcb_' + id;
const SERIES = {}; Object.entries(SER).forEach(([k, id]) => { const c = U.ls.get(SK(id), null); if (c) SERIES[k] = c; });
const bcbFetch = async (id, from, to) => { const f = d => d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4);
  const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${id}/dados?formato=json&dataInicial=${f(from)}&dataFinal=${f(to)}`); if (!r.ok) throw new Error('BCB ' + r.status); const j = await r.json();
  return (Array.isArray(j) ? j : []).map(x => { const [d, m, y] = x.data.split('/'); return [`${y}-${m}-${d}`, +x.valor]; }); };
IX.loadSeries = async (k, from) => { const id = SER[k], c = SERIES[k]; if (c && c.from <= from && Date.now() - c.at < 12 * 36e5) return c;
  let rows = c && c.from <= from ? c.rows.slice() : [], start = c && c.from <= from && rows.length ? U.addDays(rows[rows.length - 1][0], 1) : from;
  if (!(c && c.from <= from)) rows = [];
  try { let d = start; const end = today(); while (d <= end) { const e = U.addDays(d, 365 * 9); rows = rows.concat(await bcbFetch(id, d, e < end ? e : end)); d = U.addDays(e, 1); }
    const seen = new Set(); rows = rows.filter(r => !seen.has(r[0]) && seen.add(r[0])).sort((a, b) => a[0] < b[0] ? -1 : 1);
    SERIES[k] = { from: c && c.from < from ? c.from : from, rows, at: Date.now() }; try { U.ls.set(SK(id), SERIES[k]); } catch (e) { } IX.ver++; } catch (e) { if (c) return c; }
  return SERIES[k]; };
/* índice acumulado diário (dia a dia, preenchendo fins de semana) */
const IDXC = {};
const cumIdx = k => { const s = SERIES[k]; if (!s || !s.rows.length) return null; if (IDXC[k] && IDXC[k].at === s.at) return IDXC[k];
  const m = new Map(); let acc = 1;
  if (k === 'cdi' || k === 'selic') { s.rows.forEach(([d, v]) => { m.set(d, acc); acc *= 1 + v / 100; }); }
  else { s.rows.forEach(([d, v]) => { const dim = new Date(+d.slice(0, 4), +d.slice(5, 7), 0).getDate(), g = Math.pow(1 + v / 100, 1 / dim); for (let i = 0; i < dim; i++) { const dd = d.slice(0, 8) + U.pad(i + 1); m.set(dd, acc); acc *= g; } }); }
  const o = { at: s.at, m, first: s.rows[0][0], last: [...m.keys()].pop(), lastV: acc, lastRate: s.rows[s.rows.length - 1][1] }; IDXC[k] = o; return o; };
const live = () => (OS.LiveRates && OS.LiveRates.vals('BR')) || null;
const annual = k => { const L2 = live(), raw = L2 && L2.raw || {}; return k === 'cdi' ? (raw.cdi ? raw.cdi.v : 13.65) : k === 'selic' ? (raw.selic ? raw.selic.v : 13.75) : k === 'ipca' ? (raw.inf ? raw.inf.v : 4.5) : k === 'poup' ? (raw.poup ? raw.poup.v : 8) : 0; };
const idxAt = (k, d) => { const c = cumIdx(k); const a = annual(k) / 100;
  if (!c) return Math.pow(1 + a, U.diff(d, '2000-01-01') / 365); // sem dados: taxa atual constante
  if (d < c.first) return Math.pow(1 + a, -U.diff(c.first, d) / 365);
  const v = c.m.get(d); if (v != null) return v;
  if (d > c.last) { const days = U.diff(d, c.last); if (k === 'cdi' || k === 'selic') return c.lastV * Math.pow(1 + c.lastRate / 100, days * 5 / 7); return c.lastV * Math.pow(1 + a, days / 365); }
  let x = d; for (let i = 0; i < 6; i++) { x = U.addDays(x, -1); const w = c.m.get(x); if (w != null) return w; } return c.lastV; };
const factor = (a, d0, d1) => { if (d1 <= d0) return 1; const r = n(a.rate) / 100, yrs = U.diff(d1, d0) / 365;
  switch (a.idx) {
    case '% do CDI': { const c = cumIdx('cdi'); if (!c) return Math.pow(1 + annual('cdi') / 100 * (n(a.rate) || 100) / 100, yrs);
      // % do CDI: aplica a percentagem à taxa de cada dia
      const pct = (n(a.rate) || 100) / 100; if (pct === 1) return idxAt('cdi', d1) / idxAt('cdi', d0); let acc = 1, ok = 0; for (const [d, v] of SERIES.cdi.rows) { if (d < d0) continue; if (d >= d1) break; acc *= 1 + v / 100 * pct; ok = d; }
      if (ok && ok < U.addDays(d1, -1)) acc *= Math.pow(1 + c.lastRate / 100 * pct, U.diff(d1, ok) * 5 / 7); return acc; }
    case 'CDI +': return idxAt('cdi', d1) / idxAt('cdi', d0) * Math.pow(1 + r, yrs);
    case 'Selic +': return idxAt('selic', d1) / idxAt('selic', d0) * Math.pow(1 + r, yrs);
    case 'IPCA +': return idxAt('ipca', d1) / idxAt('ipca', d0) * Math.pow(1 + r, yrs);
    case 'Poupança': return idxAt('poup', d1) / idxAt('poup', d0);
    default: return Math.pow(1 + r, yrs); } };
IX.factor = factor;
IX.isRF = a => !!a.idx && !a.sym && !(a.cls === 'Tesouro Direto' && a.td); // renda fixa com indexador (os antigos sem indexador continuam com preço manual)
IX.needSeries = () => { const need = {}; OS.all('assets').filter(IX.isRF).forEach(a => { const k = { '% do CDI': 'cdi', 'CDI +': 'cdi', 'Selic +': 'selic', 'IPCA +': 'ipca', Poupança: 'poup' }[a.idx]; if (!k) return; const d = (U.sortBy(OS.all('invtx').filter(t => t.asset === a.id), t => t.date)[0] || {}).date; if (d && (!need[k] || d < need[k])) need[k] = d; }); return need; };
/* imposto sobre o ganho de renda fixa */
const rfTax = (a, gain, days) => { if (gain <= 0 || a.irx) return 0; if (a.currency === 'BRL' || ['Tesouro Direto', 'CDB', 'LC', 'Debênture', 'CRI/CRA', 'LCI/LCA'].includes(a.cls)) return gain * (days <= 180 ? .225 : days <= 360 ? .2 : days <= 720 ? .175 : .15); return gain * .28; };
/* ================= movimentos → posição (todos os tipos) ================= */
const INC = IX.INC = new Set(L.INC || ['Dividendo', 'JCP', 'Rendimento', 'Juros', 'Aluguer']);
IX.mult = a => n(a.mult) || 1;
IX.isLev = a => ['Futuro', 'CFD'].includes(a.cls);
/* aplica um movimento ao estado (valores em dinheiro da moeda do ativo; aceita posições vendidas a descoberto) */
const step = (s, t, m = 1) => { const q = n(t.qty), p = n(t.price), fee = n(t.fees), amt = n(t.amount);
  switch (t.type) {
    case 'Compra': case 'Subscrição': { let left = q, f = fee; if (s.qty < 0 && left > 0) { const cov = Math.min(left, -s.qty), avg = s.cost / (s.qty * m), fc = q ? fee * cov / q : 0; s.realized += cov * m * (avg - p) - fc; s.qty += cov; s.cost = s.qty * m * avg; left -= cov; f -= fc; } if (left > 0) { s.qty += left; s.cost += left * p * m + f; } s.first = s.first || t.date; break; }
    case 'Venda': { let left = q, f = fee; if (s.qty > 0 && left > 0) { const sv = Math.min(left, s.qty), avg = s.cost / (s.qty * m), fs = q ? fee * sv / q : 0; s.realized += sv * m * (p - avg) - fs; s.qty -= sv; s.cost = s.qty * m * avg; left -= sv; f -= fs; s.sold = (s.sold || 0) + sv * p * m; } if (left > 0) { s.qty -= left; s.cost -= left * p * m - f; s.first = s.first || t.date; } break; }
    case 'Bonificação': case 'Transferência (entrada)': s.qty += q; s.cost += q * p * m; s.first = s.first || t.date; break;
    case 'Transferência (saída)': { const avg = s.qty ? s.cost / (s.qty * m) : 0; s.qty -= q; s.cost = s.qty * m * avg; break; }
    case 'Desdobramento/Grupamento': { const r = n(t.ratio) || 1; s.qty *= r; break; }
    case 'Amortização': if (s.cost >= amt) s.cost -= amt; else { s.realized += amt - Math.max(0, s.cost); s.cost = 0; } s.realized -= fee; s.amort += amt; break;
    case 'Taxa': s.fees += amt + fee; break;
    default: if (INC.has(t.type)) { s.gross += amt; s.tax += n(t.tax); s.divs += amt - n(t.tax) - fee; } }
  if (Math.abs(s.qty) < 1e-9) { s.qty = 0; s.cost = 0; } return s; };
IX.step = step;
IX.st0 = () => ({ qty: 0, cost: 0, realized: 0, divs: 0, gross: 0, tax: 0, fees: 0, amort: 0, first: null });
const posCalc = (a, price, upTo) => { const m = IX.mult(a), s = IX.st0(); U.sortBy(OS.all('invtx').filter(t => t.asset === a.id && (!upTo || t.date <= upTo)), t => t.date).forEach(t => step(s, t, m));
  const fx = Inv.fx(a.currency), p = a.cls === 'Caixa em moeda estrangeira' ? 1 : price != null ? price : n(a.price) || (s.qty ? s.cost / (s.qty * m) : 0);
  let value, cost, pl; const expo = s.qty * p * m;
  if (IX.isLev(a)) { const margin = n(a.margem) || Math.abs(s.cost) / (n(a.alav) || 1); pl = expo - s.cost; value = s.qty ? margin + pl : 0; cost = s.qty ? margin : 0; }
  else { value = expo; cost = s.cost; pl = value - cost; }
  return { qty: s.qty, avg: s.qty ? s.cost / (s.qty * m) : 0, cost: cost * fx, value: value * fx, pl: pl * fx, ret: cost ? pl / Math.abs(cost) : 0, realized: s.realized * fx, divs: s.divs * fx, gross: s.gross * fx, taxW: s.tax * fx, fees: s.fees * fx, total: (pl + s.realized + s.divs) * fx,
    exposure: Math.abs(expo) * fx, short: s.qty < 0, lev: IX.isLev(a) && cost ? Math.abs(expo) / Math.abs(cost) : null, price: p, stale: a.cls !== 'Caixa em moeda estrangeira' && (!a.priceDate || U.diff(U.today(), a.priceDate) > 7), hasPrice: !!n(a.price) || a.cls === 'Caixa em moeda estrangeira', first: s.first }; };
IX.posCalc = posCalc;
/* renda fixa: rende sozinha; com taxa de mercado, mostra a marcação a mercado */
const rfPos = (a, at = today()) => { const end = a.venc && a.venc < at ? a.venc : at; let cost = 0, value = 0, divs = 0, fees = 0, first = null, realized = 0, gross = 0, taxW = 0;
  U.sortBy(OS.all('invtx').filter(t => t.asset === a.id && t.date <= at), t => t.date).forEach(t => { const amt = L.QTX.includes(t.type) ? n(t.qty || 1) * n(t.price) : n(t.amount);
    if (t.type === 'Compra' || t.type === 'Subscrição' || t.type === 'Transferência (entrada)') { value += amt * factor(a, t.date, end); cost += amt + n(t.fees); first = first || t.date; }
    else if (t.type === 'Venda' || t.type === 'Amortização' || t.type === 'Transferência (saída)') { const vAt = value / factor(a, t.date, end); const frac = vAt ? Math.min(1, amt / vAt) : 1; if (t.type !== 'Transferência (saída)') realized += amt - cost * frac; cost -= cost * frac; value -= amt * factor(a, t.date, end); }
    else if (INC.has(t.type)) { divs += amt - n(t.tax) - n(t.fees); gross += amt; taxW += n(t.tax); } else if (t.type === 'Taxa') fees += amt; });
  value = Math.max(0, value); const curve = value; let mam = null;
  if (n(a.mrate) && a.venc && a.venc > at && ['Pré-fixado', 'IPCA +', 'CDI +', 'Selic +'].includes(a.idx)) { const tr = U.diff(a.venc, at) / 365; mam = curve * Math.pow((1 + n(a.rate) / 100) / (1 + n(a.mrate) / 100), tr); value = mam; }
  const fx = Inv.fx(a.currency), gain = value - cost, days = first ? U.diff(at, first) : 0, tax = rfTax(a, gain, days);
  return { qty: value > 0 ? 1 : 0, avg: cost, cost: cost * fx, value: value * fx, pl: gain * fx, ret: cost ? gain / cost : 0, realized: realized * fx, divs: divs * fx, gross: gross * fx, taxW: taxW * fx, total: (gain + realized + divs) * fx, stale: false, hasPrice: true, rf: true, tax: tax * fx, net: (value - tax) * fx, days, matured: !!(a.venc && a.venc < at), curve: curve * fx, mam: mam != null ? mam * fx : null, exposure: value * fx }; };
IX.rfPos = rfPos;

/* ================= posição de cada ativo (com cotação ao vivo) ================= */
IX.tdSym = a => a.cls === 'Tesouro Direto' && a.td ? 'TD:' + String(a.td).trim() : null;
IX.quoteFor = a => { const s = IX.tdSym(a) || a.sym; if (!s) return null; const q = IX.q(s); return q && q.p != null ? q : null; };
Inv.pos = a => { if (IX.isRF(a)) return rfPos(a);
  const q = IX.quoteFor(a); if (!q) return posCalc(a);
  const qc = q.cur || a.currency || 'EUR', ac = a.currency || 'EUR', price = qc === ac ? q.p : q.p * Inv.fx(qc) / Inv.fx(ac), pcv = q.pc ? (qc === ac ? q.pc : q.pc * Inv.fx(qc) / Inv.fx(ac)) : null;
  const o = posCalc(a, price); o.live = q; o.dayPct = pcv ? price / pcv - 1 : 0; o.day = pcv ? (price - pcv) * o.qty * IX.mult(a) * Inv.fx(ac) : 0; o.stale = IX.age(IX.tdSym(a) || a.sym) > 3 * 864e5; o.hasPrice = true; return o; };
Inv.divs = (from, to) => U.sum(OS.all('invtx').filter(t => INC.has(t.type) && (!from || t.date >= from) && (!to || t.date <= to)), t => (n(t.amount) - n(t.tax) - n(t.fees)) * Inv.fx((OS.get('assets', t.asset) || {}).currency));
Inv.contribByMonth = k => OS.Fin.months(k).map(ym => U.sum(OS.all('invtx').filter(t => U.ym(t.date) === ym && ['Compra', 'Subscrição', 'Venda'].includes(t.type)), t => { const a = OS.get('assets', t.asset) || {}; return (t.type === 'Venda' ? -1 : 1) * n(t.qty) * n(t.price) * IX.mult(a) * Inv.fx(a.currency); }));

/* guarda o último preço no ativo (para o património e outros aparelhos), no máximo a cada 15 min */
const persist = () => { const now = Date.now(); OS.all('assets').forEach(a => { if (!(a.sym || IX.tdSym(a)) || IX.isRF(a)) return; const q = IX.quoteFor(a); if (!q) return; const qc = q.cur || a.currency || 'EUR', ac = a.currency || 'EUR', p = U.r2(qc === ac ? q.p : q.p * Inv.fx(qc) / Inv.fx(ac));
  if (a.priceDate === today() && Math.abs(n(a.price) - p) / (p || 1) < .003) return; if (a._pAt && now - a._pAt < 15 * 6e4) return; OS.upd('assets', a.id, { price: p, priceDate: today(), _pAt: now }, { silent: true }); }); };

/* ================= ciclo ao vivo ================= */
IX.symsHeld = () => OS.all('assets').filter(a => a.sym && !IX.isRF(a) && Inv.pos(a).qty !== 0).map(a => a.sym);
IX.tdList = (U.ls.get('oc_td1', null) || {}).l || [];
IX.loadTD = async (force) => { const c = U.ls.get('oc_td1', null); if (!force && c && Date.now() - c.at < 10 * 6e4) return c.l; const j = await sget('&op=td'); if (!j.td) { IX.st.script = 'old'; throw new Error('script antigo'); } IX.tdList = j.td; U.ls.set('oc_td1', { at: Date.now(), l: j.td }); j.td.forEach(x => IX.setQ('TD:' + x.n, { p: x.pr, pc: null, cur: 'BRL', nm: x.n, ex: 'Tesouro Direto', open: true, t: x.t, buy: x.pc, txc: x.tc, txv: x.tv, venc: x.v }, 'Tesouro Direto')); return j.td; };
IX.symsWatch = () => (cfg().watch || []).slice();
// reserva: função do próprio site (Vercel) quando o script não traz a cotação (o Yahoo às vezes bloqueia os servidores do Google)
let apiOff = 0;
IX.apiQuotes = async syms => { syms = [...new Set(syms.filter(Boolean))]; if (!syms.length || Date.now() < apiOff) return 0; let got = 0;
  for (let i = 0; i < syms.length; i += 30) { let j; try { const r = await fetch(new URL('api/q?s=' + encodeURIComponent(syms.slice(i, i + 30).join(',')), document.baseURI).href, { cache: 'no-store', credentials: 'omit' }); if (!r.ok) { apiOff = Date.now() + 10 * 6e4; return got; } j = await r.json(); } catch (e) { apiOff = Date.now() + 2 * 6e4; return got; }
    Object.entries(j.q || {}).forEach(([s, o]) => { if (o && o.p != null) { IX.setQ(s, o, 'Yahoo Finance'); got++; } }); }
  IX.st.api = 'ok'; IX.st.apiAt = Date.now(); return got; };
IX.extra = new Set(); // símbolos pedidos pelo ecrã aberto (índices, detalhe de um ativo)
const onInv = () => /^#?investimentos/.test(location.hash.replace(/^#/, '#'));
let busy = false, lastTick = 0;
IX.tick = async (force) => { if (busy) { if (force) IX._again = true; return; } if (document.hidden && !force) return; busy = true; lastTick = Date.now();
  const held = IX.symsHeld(), all = [...new Set([...held, ...IX.symsWatch(), ...IX.extra, ...Object.values(FXLIVE).filter(s => OS.all('assets').some(a => a.currency && FXLIVE[a.currency] === s) || FXLIVE[IX.view()] === s)])];
  wsStart(all); fhStart(all); IX.loadFx();
  try { if (scr() && (IX.st.script !== 'old' || Date.now() - (IX.st.oldAt || 0) > 120000)) await IX.scriptQuotes(all.filter(s => !(isCrypto(s) && IX.age(s) < 15000 && PX[s].src === 'Binance (tempo real)'))); }
  catch (e) { IX.st.script = IX.st.script === 'old' ? 'old' : 'erro'; IX.st.scriptErr = e.message; }
  try { await IX.apiQuotes(all.filter(s => !isCrypto(s) && !/=X$/.test(s) && (!PX[s] || IX.age(s) > 10 * 6e4))); } catch (e) { }
  try { await IX.cgQuotes(all.filter(s => isCrypto(s) && (!scr() || IX.st.script !== 'ok'))); } catch (e) { }
  if (scr() && OS.all('assets').some(a => IX.tdSym(a))) { try { await IX.loadTD(); } catch (e) { } }
  const need = IX.needSeries(); for (const [k, d] of Object.entries(need)) { try { await IX.loadSeries(k, d); } catch (e) { } }
  persist(); busy = false; IX.lastTick = Date.now(); if (onInv()) OS.request(); if (IX._again) { IX._again = false; setTimeout(() => IX.tick(true), 50); } };
const loop = () => { const ms = onInv() ? 20000 : 300000; if (Date.now() - lastTick >= ms - 500) IX.tick(); };
OS.on('ready', () => { setTimeout(() => IX.tick(true), 1500); setInterval(loop, 5000); addEventListener('hashchange', () => { if (onInv() && Date.now() - lastTick > 8000) IX.tick(); }); document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastTick > 15000) IX.tick(); }); });

/* atualiza no ecrã só os números que mudaram (sem redesenhar a página) */
const flashT = {};
IX.paint = (s, oldP) => { const q = IX.q(s); if (!q) return; const up = oldP != null && q.p > oldP, dn = oldP != null && q.p < oldP;
  document.querySelectorAll(`[data-pxs="${CSS.escape(s)}"]`).forEach(el => { const k = el.dataset.k;
    if (k === 'p') el.textContent = U.nf(q.p, q.p < 10 ? 4 : 2); else if (k === 'ch' && q.pc) { const c = q.p / q.pc - 1; el.textContent = (c >= 0 ? '+' : '') + U.pct(c, 2); el.className = el.className.replace(/\b(pos|neg)\b/g, '') + ' ' + (c >= 0 ? 'pos' : 'neg'); }
    if ((up || dn) && k === 'p') { el.classList.remove('px-up', 'px-dn'); void el.offsetWidth; el.classList.add(up ? 'px-up' : 'px-dn'); } });
  if (!flashT.tot) flashT.tot = setTimeout(() => { flashT.tot = 0; IX.paintTot(); }, 1200); };
IX.paintTot = () => { const els = document.querySelectorAll('[data-live]'); if (!els.length) return; const S = IX.summary();
  els.forEach(el => { const k = el.dataset.live; if (k === 'val') el.textContent = IX.M(S.val); else if (k === 'day') { el.textContent = IX.M(S.day, { sign: 1 }); el.className = el.className.replace(/\b(pos|neg)\b/g, '') + ' ' + (S.day >= 0 ? 'pos' : 'neg'); } else if (k === 'pl') el.textContent = IX.M(S.pl, { sign: 1 }); }); };

/* ================= resumo da carteira ================= */
IX.positions = () => OS.all('assets').map(a => Object.assign({ a }, Inv.pos(a))).filter(p => p.qty !== 0 || p.value > 0);
IX.summary = () => { const P = IX.positions(), val = U.sum(P, p => p.value), cost = U.sum(P, p => p.cost), day = U.sum(P, p => p.day || 0), prev = val - day;
  const divs12 = Inv.divs(U.addDays(today(), -365)), realized = U.sum(OS.all('assets').map(a => Inv.pos(a)), p => p.realized);
  return { P, val, cost, pl: val - cost, ret: cost ? (val - cost) / cost : 0, day, dayPct: prev ? day / prev : 0, divs12, realized, total: val - cost + realized + Inv.divs() }; };

/* ================= histórico da carteira e métricas ================= */
const tsISO = t => U.iso(new Date(t * 1000));
const fxHistCache = {};
IX.fxHist = async (cur, from) => { if (!cur || cur === 'EUR') return null; const k = 'oc_fxh_' + cur, c = U.ls.get(k, null); if (c && c.from <= from && Date.now() - c.at < 12 * 36e5) return fxHistCache[cur] = c;
  const j = await (await fetch(`https://api.frankfurter.dev/v1/${from}..?base=EUR&symbols=${cur}`)).json(); const m = {}; Object.entries(j.rates || {}).forEach(([d, r]) => m[d] = r[cur]);
  const o = { from, at: Date.now(), m }; try { U.ls.set(k, o); } catch (e) { } return fxHistCache[cur] = o; };
const ffill = (m, dates) => { const out = new Array(dates.length); let last = null; const keys = Object.keys(m).sort(); let ki = 0;
  dates.forEach((d, i) => { while (ki < keys.length && keys[ki] <= d) { last = m[keys[ki]]; ki++; } out[i] = last; }); return out; };
const rangeFor = d0 => { const days = U.diff(today(), d0); return days <= 360 ? '1y' : days <= 720 ? '2y' : days <= 1800 ? '5y' : '10y'; };
IX.hcache = null;
/* reconstrói o valor diário da carteira (dias úteis) */
IX.build = async () => { const tx = U.sortBy(OS.all('invtx').filter(t => t.date), t => t.date); if (!tx.length) return null; const d0 = tx[0].date, d1 = today();
  const assets = OS.all('assets').filter(a => tx.some(t => t.asset === a.id)), dates = []; for (let d = d0; d <= d1; d = U.addDays(d, 1)) { const w = U.parse(d).getDay(); if (w !== 0 && w !== 6 || d === d1) dates.push(d); }
  const need = IX.needSeries(); for (const [k, d] of Object.entries(need)) { try { await IX.loadSeries(k, d); } catch (e) { } }
  const curs = [...new Set(assets.map(a => a.currency).filter(c => c && c !== 'EUR'))], fxs = {}; for (const c of curs) { try { const h = await IX.fxHist(c, d0); fxs[c] = h ? ffill(h.m, dates) : null; } catch (e) { fxs[c] = null; } }
  const pxs = {}, V = new Array(dates.length).fill(0), Fl = new Array(dates.length).fill(0), Dv = new Array(dates.length).fill(0), C = new Array(dates.length).fill(0), missing = [], perAsset = {};
  const di = new Map(dates.map((d, i) => [d, i])), idxOf = d => { if (di.has(d)) return di.get(d); let lo = 0, hi = dates.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] < d) lo = m + 1; else hi = m; } return lo; };
  for (const a of assets) { const T = tx.filter(t => t.asset === a.id), fxA = i => a.currency && a.currency !== 'EUR' ? (fxs[a.currency] && fxs[a.currency][i] ? 1 / fxs[a.currency][i] : Inv.fx(a.currency)) : 1;
    const mA = IX.mult(a); T.forEach(t => { const i = idxOf(t.date), amt = L.QTX.includes(t.type) ? n(t.qty || (IX.isRF(a) ? 1 : 0)) * n(t.price) * (IX.isRF(a) ? 1 : mA) : n(t.amount); if (i >= dates.length) return; const e = amt * fxA(i), fe = n(t.fees) * fxA(i);
      if (t.type === 'Compra' || t.type === 'Subscrição') Fl[i] += IX.isLev(a) ? (n(a.margem) ? 0 : e / (n(a.alav) || 1)) + fe : e + fe; else if (t.type === 'Venda') Fl[i] -= IX.isLev(a) ? 0 : e - fe; else if (t.type === 'Transferência (entrada)') Fl[i] += e; else if (t.type === 'Transferência (saída)') Fl[i] -= e; else if (t.type === 'Amortização') Fl[i] -= e - fe; else if (INC.has(t.type)) Dv[i] += e - n(t.tax) * fxA(i) - fe; });
      if (IX.isLev(a) && n(a.margem)) { const i0 = idxOf(T[0].date); if (i0 < dates.length) Fl[i0] += n(a.margem) * fxA(i0); }
    const va = new Array(dates.length).fill(0);
    if (IX.isRF(a)) { dates.forEach((d, i) => { if (d < T[0].date) return; va[i] = rfPos(a, d).value; }); pxs[a.id] = dates.map(d => d < T[0].date ? null : factor(a, T[0].date, d)); }
    else { let closes = null; if (a.sym) { try { const h = await IX.hist(a.sym, rangeFor(d0), '1d'); if (h && h.t.length) { const m = {}; h.t.forEach((t, k) => m[tsISO(t)] = h.c[k]); closes = ffill(m, dates); const hc = h.cur === 'GBp' || h.cur === 'GBX' ? .01 : 1; if (hc !== 1) closes = closes.map(x => x == null ? x : x * hc);
          const sp = (h.spl || []).map(([ts, r]) => [tsISO(ts), r]).filter(x => x[1] > 0 && x[1] !== 1); if (sp.length) closes = closes.map((x, k) => x == null ? x : x * sp.filter(z => z[0] > dates[k]).reduce((g, z) => g * z[1], 1)); } } catch (e) { } }
      if (!closes) missing.push(a.ticker || a.name);
      const st = IX.st0(); let ti = 0; dates.forEach((d, i) => { while (ti < T.length && T[ti].date <= d) { step(st, T[ti], mA); ti++; }
        const px = a.cls === 'Caixa em moeda estrangeira' ? 1 : closes && closes[i] != null ? closes[i] : (i === dates.length - 1 && n(Inv.pos(a).price || a.price)) || (st.qty ? st.cost / (st.qty * mA) : 0), expo = st.qty * px * mA;
        va[i] = (IX.isLev(a) ? (st.qty ? (n(a.margem) || Math.abs(st.cost) / (n(a.alav) || 1)) + expo - st.cost : 0) : expo) * fxA(i); });
      if (closes) { const lastI = dates.length - 1, p = Inv.pos(a); if (p.qty) va[lastI] = p.value; pxs[a.id] = closes.map((c, i) => c == null ? null : c * fxA(i)); } }
    va.forEach((v, i) => V[i] += v); perAsset[a.id] = va; }
  // custo acumulado (aportes líquidos)
  let acc = 0; Fl.forEach((f, i) => { acc += f; C[i] = acc; });
  // retornos diários (TWR): (V_t + D_t − F_t) / V_{t−1} − 1
  const R = new Array(dates.length).fill(0), cum = new Array(dates.length).fill(0); let g = 1;
  for (let i = 1; i < dates.length; i++) { const prev = V[i - 1]; R[i] = prev > 1 ? (V[i] + Dv[i] - Fl[i]) / prev - 1 : 0; if (!isFinite(R[i]) || Math.abs(R[i]) > .6) R[i] = 0; g *= 1 + R[i]; cum[i] = g - 1; }
  IX.hcache = { dates, V, F: Fl, D: Dv, C, R, cum, missing, perAsset, pxs, at: Date.now(), key: OS.all('invtx').length + ':' + OS.all('assets').length }; return IX.hcache; };
IX.metrics = h => { if (!h || h.dates.length < 3) return null; const R = h.R.slice(1), nD = R.length, mean = U.avg(R), sd = Math.sqrt(U.avg(R, r => (r - mean) * (r - mean))), years = U.diff(h.dates[h.dates.length - 1], h.dates[0]) / 365;
  const tot = h.cum[h.cum.length - 1], ann = years > 0 ? Math.pow(1 + tot, 1 / Math.max(years, 1 / 12)) - 1 : tot, vol = sd * Math.sqrt(252);
  const rfA = ((OS.LiveRates && OS.LiveRates.vals(OS.Country ? OS.Country.code() : 'PT') || {}).dep || {}).v / 100 || .02;
  let peak = -Infinity, mdd = 0, mddAt = null; h.cum.forEach((c, i) => { const v = 1 + c; if (v > peak) peak = v; const dd = v / peak - 1; if (dd < mdd) { mdd = dd; mddAt = h.dates[i]; } });
  const months = {}; h.dates.forEach((d, i) => { const ym = d.slice(0, 7); months[ym] = (months[ym] || 1) * (1 + h.R[i]); }); const mret = Object.entries(months).map(([ym, g]) => [ym, g - 1]);
  const pos = mret.filter(x => x[1] > 0).length, best = mret.reduce((a, b) => b[1] > a[1] ? b : a, ['', -Infinity]), worst = mret.reduce((a, b) => b[1] < a[1] ? b : a, ['', Infinity]);
  const down = R.filter(r => r < 0), dsd = Math.sqrt(U.avg(down, r => r * r) || 0) * Math.sqrt(252);
  return { tot, ann, vol, sharpe: vol ? (ann - rfA) / vol : null, sortino: dsd ? (ann - rfA) / dsd : null, mdd, mddAt, mret, pos, nm: mret.length, best, worst, rf: rfA, years, xirr: IX.xirr(h) }; };
/* TIR (dinheiro ponderado no tempo) */
IX.xirr = h => { const cf = []; h.dates.forEach((d, i) => { const f = -h.F[i] + h.D[i]; if (Math.abs(f) > .005) cf.push([d, f]); }); const lastV = h.V[h.V.length - 1]; cf.push([h.dates[h.dates.length - 1], lastV]); if (cf.length < 2) return null;
  const t0 = cf[0][0], npv = r => cf.reduce((s, [d, f]) => s + f / Math.pow(1 + r, U.diff(d, t0) / 365), 0); let lo = -.99, hi = 10; if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (npv(lo) * npv(m) <= 0) hi = m; else lo = m; } return (lo + hi) / 2; };
/* referências (benchmarks) acumuladas desde a mesma data */
IX.bench = async (key, dates) => { const d0 = dates[0];
  if (key === 'CDI' || key === 'IPCA' || key === 'Selic' || key === 'Poupança') { const k = { CDI: 'cdi', IPCA: 'ipca', Selic: 'selic', Poupança: 'poup' }[key]; await IX.loadSeries(k, d0); const b = idxAt(k, d0); return dates.map(d => idxAt(k, d) / b - 1); }
  if (/^dep:/.test(key)) { const r = +key.slice(4) / 100; return dates.map(d => Math.pow(1 + r, U.diff(d, d0) / 365) - 1); }
  const h = await IX.hist(key, rangeFor(d0), '1d'); if (!h || !h.t.length) return null; const m = {}; h.t.forEach((t, i) => m[tsISO(t)] = h.c[i]); const c = ffill(m, dates); const b = c.find(x => x != null); return c.map(x => x == null || !b ? null : x / b - 1); };
/* ================= risco da carteira ================= */
const q = (arr, p) => { const a = arr.slice().sort((x, y) => x - y); if (!a.length) return 0; const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const cov = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb); return a.length > 1 ? s / (a.length - 1) : 0; };
IX.SRI = vol => vol < .005 ? 1 : vol < .05 ? 2 : vol < .12 ? 3 : vol < .2 ? 4 : vol < .3 ? 5 : vol < .8 ? 6 : 7;
IX.STRESS = [
  ['Crise financeira 2008', 'Ações mundiais −50%, imobiliário −45%, ouro +5% (out/2007 → mar/2009)', { eq: -.5, reit: -.45, crypto: -.75, gold: .05, bond: .02, rf: 0 }],
  ['COVID (fev–mar 2020)', 'Queda de −34% das ações em 5 semanas; recuperou em 5 meses', { eq: -.34, reit: -.4, crypto: -.5, gold: -.03, bond: 0, rf: 0 }],
  ['Inflação e juros 2022', 'Ações −18%, obrigações −15%, cripto −65%', { eq: -.18, reit: -.25, crypto: -.65, gold: 0, bond: -.15, rf: 0 }],
  ['Inverno cripto', 'Cripto −75% (2018, 2022)', { eq: 0, reit: 0, crypto: -.75, gold: 0, bond: 0, rf: 0 }],
  ['Real desvaloriza 20%', 'Tudo o que está em BRL vale −20% em euros', { cur: { BRL: -.2 } }],
  ['Dólar desvaloriza 15%', 'Tudo o que está em USD vale −15% em euros', { cur: { USD: -.15 } }]];
const kindOf = a => a.cls === 'Caixa em moeda estrangeira' ? 'rf' : a.cls === 'Cripto' ? 'crypto' : ['FII', 'REIT', 'Imóvel'].includes(a.cls) ? 'reit' : ['Ouro', 'Commodity'].includes(a.cls) ? 'gold' : a.cls === 'Obrigação' || /obriga|bond|treasury|aggregate/i.test(a.name || '') ? 'bond' : IX.isRF(a) || L.RFC.includes(a.cls) ? 'rf' : 'eq';
IX.risk = (h, benchCum) => { if (!h || h.dates.length < 25) return null; const N = h.dates.length, W0 = Math.max(1, N - 253);
  const R = h.R.slice(W0).filter(r => isFinite(r)), val = IX.summary().val || 0;
  const sd = Math.sqrt(cov(R, R)), vol = sd * Math.sqrt(252), var1 = -q(R, .05), tail = R.filter(r => r <= -var1), cvar1 = tail.length ? -mean(tail) : var1, varP = 1.645 * sd;
  // queda e recuperação
  let peak = 1, mdd = 0, uw = 0, maxUw = 0; const dd = h.cum.map(c => { const v = 1 + c; if (v >= peak) { peak = v; uw = 0; } else { uw++; maxUw = Math.max(maxUw, uw); } const x = v / peak - 1; if (x < mdd) mdd = x; return x; });
  // beta e correlação com a referência
  let beta = null, corr = null; if (benchCum) { const br = [], pr = []; for (let i = W0 + 1; i < N; i++) { const b0 = benchCum[i - 1], b1 = benchCum[i]; if (b0 == null || b1 == null) continue; br.push((1 + b1) / (1 + b0) - 1); pr.push(h.R[i]); } const vb = cov(br, br); if (br.length > 20 && vb) { beta = cov(pr, br) / vb; corr = cov(pr, br) / Math.sqrt(vb * cov(pr, pr)); } }
  // contribuição de cada ativo para o risco (covariâncias dos últimos 12 meses)
  const P = IX.positions().filter(p => h.pxs && h.pxs[p.a.id]), tot = U.sum(P, p => p.value) || 1, w = P.map(p => p.value / tot);
  const rets = P.map(p => { const s = h.pxs[p.a.id], out = []; for (let i = W0 + 1; i < N; i++) out.push(s[i] != null && s[i - 1] ? s[i] / s[i - 1] - 1 : 0); return out; });
  const S = rets.map(a => rets.map(b => cov(a, b))), Sw = S.map(row => row.reduce((acc, x, j) => acc + x * w[j], 0)), varp = w.reduce((acc, x, i) => acc + x * Sw[i], 0);
  const assets = P.map((p, i) => ({ a: p.a, w: w[i], vol: Math.sqrt(S[i][i] * 252), rc: varp ? w[i] * Sw[i] / varp : 0 })).sort((x, y) => y.rc - x.rc);
  const C = rets.map((a, i) => rets.map((b, j) => { const d = Math.sqrt(S[i][i] * S[j][j]); return d ? S[i][j] / d : (i === j ? 1 : 0); }));
  const divRatio = varp ? U.sum(assets, x => x.w * x.vol) / Math.sqrt(varp * 252) : 1;
  // stress
  const Pall = IX.positions(), stress = IX.STRESS.map(([nm, ds, sh]) => { let loss = 0; Pall.forEach(p => { const k = kindOf(p.a), base = IX.isLev(p.a) || p.a.cls === 'Opção' ? (p.short ? -p.exposure : p.exposure) : p.value; if (sh.cur) loss += p.value * (sh.cur[p.a.currency || 'EUR'] || 0); else loss += base * (sh[k] || 0); }); return { nm, ds, loss, pct: val ? loss / val : 0 }; });
  const liq = U.sum(Pall.filter(p => !(IX.isRF(p.a) && p.a.liq && p.a.liq !== 'Diária') && !['Imóvel', 'PPR', 'Previdência', 'Crowdlending/P2P'].includes(p.a.cls)), p => p.value) / (val || 1);
  return { vol, sri: IX.SRI(vol), var1, cvar1, varP, var1e: var1 * val, var21e: var1 * Math.sqrt(21) * val, cvar21e: cvar1 * Math.sqrt(21) * val, mdd, curDD: dd[dd.length - 1], maxUw, dd, beta, corr, assets, C, names: P.map(p => p.a.ticker || p.a.sym || p.a.name), divRatio, stress, liq, n: R.length }; };
IX.BENCH = cc => cc === 'BR' ? [['CDI', 'CDI'], ['IPCA', 'IPCA (inflação)'], ['^BVSP', 'Ibovespa'], ['^GSPC', 'S&P 500']] : [['URTH', 'MSCI World'], ['^GSPC', 'S&P 500'], ['PSI20.LS', 'PSI (Lisboa)'], ['dep:' + ((((OS.LiveRates && OS.LiveRates.vals(cc)) || {}).dep || {}).v || 1.6), 'Depósito a prazo']];
IX.INDICES = cc => (cc === 'BR' ? [['^BVSP', 'Ibovespa'], ['IFIX.SA', 'IFIX'], ['BRL=X', 'Dólar (USD/BRL)'], ['^GSPC', 'S&P 500'], ['^IXIC', 'Nasdaq'], ['BTC-BRL', 'Bitcoin']] : [['PSI20.LS', 'PSI (Lisboa)'], ['^STOXX50E', 'Euro Stoxx 50'], ['^GDAXI', 'DAX'], ['^GSPC', 'S&P 500'], ['^IXIC', 'Nasdaq'], ['EURUSD=X', 'EUR/USD'], ['EURBRL=X', 'EUR/BRL'], ['GC=F', 'Ouro'], ['BTC-EUR', 'Bitcoin']]);
})();
