/* PRUMO — Importador da B3 (Área do Investidor): lê os ficheiros Excel (ou CSV) que descarregas em investidor.b3.com.br
   · Extratos → Negociação: compras e vendas na data do negócio
   · Extratos → Movimentação: dividendos, JCP, rendimentos de FII, juros, amortizações, bonificações, desdobramentos, resgates do Tesouro
     (e as liquidações de compras/vendas, quando não juntas o ficheiro de Negociação)
   · Posição: confere se as quantidades da app batem com as da B3
   Nada se duplica: o que já existe é ignorado. Os ativos novos são criados com o símbolo da cotação (.SA) e a classe certa. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, L = OS.L, esc = U.esc, IX = OS.InvX;
const B3 = OS.B3 = {};
const XLSX_URL = 'vendor/xlsx.full.min.js'; // SheetJS 0.18.5 (só é descarregado quando importas um Excel)
let ST = null; // { files:[], rows:[], pos:[], skip:{}, err:'', busy:false }
const n = v => U.num(v) || 0;
const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

/* ---------- leitura dos ficheiros ---------- */
let xlsxP = null;
const loadX = () => window.XLSX ? Promise.resolve(window.XLSX) : (xlsxP = xlsxP || new Promise((res, rej) => { const s = document.createElement('script'); s.src = XLSX_URL; s.async = true; s.onload = () => window.XLSX ? res(window.XLSX) : rej(new Error('leitor de Excel indisponível')); s.onerror = () => { xlsxP = null; rej(new Error('Sem internet para abrir o Excel. Tenta de novo com ligação, ou exporta em CSV.')); }; document.head.appendChild(s); }));
const num = v => { if (typeof v === 'number') return v; let s = String(v == null ? '' : v).replace(/[^\d,.\-]/g, ''); if (!s || s === '-') return 0; if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''); else if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); return +s || 0; };
const date = v => { if (v instanceof Date && !isNaN(v)) return U.iso(v); if (typeof v === 'number' && v > 20000 && v < 80000) { const X = window.XLSX; if (X && X.SSF) { const d = X.SSF.parse_date_code(v); if (d) return `${d.y}-${U.pad(d.m)}-${U.pad(d.d)}`; } const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0, 10); }
  const s = String(v || '').trim(); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]; m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${U.pad(+m[2])}-${U.pad(+m[1])}`; return ''; };
const csvRows = txt => { const lines = String(txt).replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim()); if (!lines.length) return []; const sep = [';', '\t', ','].map(c => [c, lines[0].split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  return lines.map(l => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()); }); };
// cada folha → { kind: 'neg' | 'mov' | 'pos', H: {coluna: índice}, rows: [[…]] }
const COLS = { d: /^data( do negocio)?$|^data$/, dn: /data do negocio/, es: /entrada\/saida|entrada e saida|^entrada/, mv: /^movimentacao$/, tm: /tipo de movimentacao/, prod: /^produto$/, cod: /codigo de negociacao/, inst: /instituicao/, q: /^quantidade$/, p: /^preco( unitario)?$|preco unitario/, v: /valor da operacao|^valor$/, mk: /^mercado$/, pf: /preco de fechamento/, va: /valor atualizado/, tipo: /^tipo$/ };
const sheetOf = (name, rows) => { for (let i = 0; i < Math.min(rows.length, 12); i++) { const hdr = (rows[i] || []).map(norm), H = {}; Object.entries(COLS).forEach(([k, re]) => { const j = hdr.findIndex(h => re.test(h)); if (j >= 0) H[k] = j; });
    const kind = H.mv != null && H.prod != null ? 'mov' : H.tm != null && H.cod != null ? 'neg' : (H.q != null && (H.pf != null || H.va != null) && (H.cod != null || H.prod != null)) ? 'pos' : null;
    if (kind) return { name, kind, H, rows: rows.slice(i + 1).filter(r => r && r.some(c => String(c == null ? '' : c).trim())) }; } return null; };
const readFile = async f => { if (/\.(xlsx|xls)$/i.test(f.name)) { const X = await loadX(), buf = await f.arrayBuffer(), wb = X.read(new Uint8Array(buf), { type: 'array' });
    return wb.SheetNames.map(sn => sheetOf(sn, X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' }))).filter(Boolean); }
  const txt = await f.text(); const s = sheetOf(f.name, csvRows(txt)); return s ? [s] : []; };

/* ---------- ativo a partir do nome da B3 ---------- */
const tkOf = (prod, cod) => { let t = String(cod || '').trim().toUpperCase(); if (!t) { const m = String(prod || '').trim().match(/^([A-Z]{4}\d{1,2}[A-Z]?)\b/); t = m ? m[1] : ''; } if (/^[A-Z]{4}\d{1,2}F$/.test(t)) t = t.slice(0, -1); return t; };
const nameOf = prod => { const s = String(prod || '').trim(), i = s.indexOf(' - '); return i > 0 ? s.slice(i + 3).trim() : s; };
const clsOf = (tk, prod, mk, tipo) => { const p = norm(prod + ' ' + (tipo || '')), m = norm(mk);
  if (/^tesouro/.test(norm(prod))) return 'Tesouro Direto'; if (/^cdb\b/.test(norm(prod))) return 'CDB'; if (/^(lci|lca)\b/.test(norm(prod))) return 'LCI/LCA'; if (/^(cri|cra)\b/.test(norm(prod))) return 'CRI/CRA'; if (/debenture/.test(p)) return 'Debênture'; if (/^lc\b/.test(norm(prod))) return 'LC';
  if (/opcao/.test(m)) return 'Opção'; if (/termo|futuro/.test(m)) return 'Futuro';
  if (/\d{2}$/.test(tk) && /3[2-9]$/.test(tk)) return 'BDR';
  if (/11$/.test(tk)) { if (/imobiliar|\bfii\b|fdo inv imob|fundo de investimento imob|fiagro/.test(p)) return 'FII'; if (/indice|\betf\b|ishares|it now|trend/.test(p)) return 'ETF';
    if (ETF11.has(tk)) return 'ETF'; if (UNIT11.has(tk)) return 'Ação'; if (/fundo|fdo|fic\b/.test(p)) return 'FII'; return p.replace(norm(tk), '').trim() ? 'Ação' : 'FII'; }
  return 'Ação'; };
// ETFs e units mais negociados na B3 (terminam em 11 como os FII)
const ETF11 = new Set('BOVA11 BOVV11 BOVB11 BOVX11 XBOV11 IVVB11 SPXI11 SPXB11 SMAL11 SMAC11 HASH11 QBTC11 QETH11 ETHE11 BITH11 CRPT11 DEFI11 META11 WEB311 NASD11 TECK11 GOLD11 DIVO11 NDIV11 BDIV11 XINA11 ACWI11 WRLD11 EURP11 FIXA11 IMAB11 IRFM11 B5P211 IB5M11 ECOO11 ISUS11 BBSD11 PIBB11 BRAX11 USDB11 GOVE11 MATB11 UTIL11 FIND11 AGRI11 HTEK11 REVE11 SHOT11 ALUG11 BOVS11 DNAI11 JOGO11 ESGB11 5GTK11 LVOL11 SMAB11 TRIG11 BITI11 NSDV11 USAL11'.split(' '));
const UNIT11 = new Set('TAEE11 KLBN11 SANB11 ALUP11 BPAC11 SAPR11 ENGI11 IGTI11 RNEW11 SULA11 BIDI11 ITUB11 AESB11 CPLE11 STBP11 PPLA11 TIET11 BRBI11 BBDC11 ITSA11 GGPS11 CXSE11'.split(' '));
const brokerOf = inst => { const s = String(inst || '').trim(); if (!s) return ''; const b = L.bank && L.bank(s); if (b) return b[0]; return s.replace(/\s+(S\.?A\.?|LTDA\.?|CTVM|DTVM|CCTVM|CORRETORA.*)$/i, '').replace(/\s+(S\.?A\.?|CTVM|DTVM)\b.*$/i, '').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); };
const findA = (tk, prod) => { const T = String(tk || '').toUpperCase(), sym = T ? T + '.SA' : ''; const nm = norm(prod);
  return OS.all('assets').find(a => (T && [a.ticker, a.sym].some(x => x && (x.toUpperCase() === T || x.toUpperCase() === sym))) || (!T && nm && (norm(a.td) === nm || norm(a.name) === nm))); };

/* ---------- interpretação ---------- */
const MOV = [[/^dividendo/, 'Dividendo'], [/juros sobre capital/, 'JCP'], [/^rendimento/, 'Rendimento'], [/^juros/, 'Juros'], [/^amortizacao/, 'Amortização'], [/^bonificacao em ativos|^bonificacao/, 'Bonificação'], [/^desdobro|^desdobramento/, 'Desdobro'], [/^grupamento/, 'Grupamento'],
  [/^transferencia - liquidacao|^liquidacao/, 'Liq'], [/^resgate|^vencimento/, 'Resgate'], [/^leilao de fracao/, 'Leilão']];
const parse = sheets => { const out = [], skip = {}, pos = [], hasNeg = sheets.some(s => s.kind === 'neg');
  const negKeys = new Set();
  sheets.filter(s => s.kind === 'neg').forEach(s => s.rows.forEach(r => { const H = s.H, d = date(r[H.dn != null ? H.dn : H.d]), tm = norm(r[H.tm]), tk = tkOf('', r[H.cod]), q = Math.abs(num(r[H.q])), p = Math.abs(num(r[H.p])), v = Math.abs(num(r[H.v]));
    if (!d || !tk || !q || !/compra|venda/.test(tm)) { skip['linha de negociação sem dados'] = (skip['linha de negociação sem dados'] || 0) + 1; return; }
    const mk = H.mk != null ? r[H.mk] : ''; out.push({ src: 'Negociação', date: d, tk, prod: tk, type: /venda/.test(tm) ? 'Venda' : 'Compra', qty: q, price: p || (v && q ? v / q : 0), cls: clsOf(tk, '', mk), broker: brokerOf(r[H.inst]) }); negKeys.add(tk); }));
  sheets.filter(s => s.kind === 'mov').forEach(s => s.rows.forEach(r => { const H = s.H, d = date(r[H.d]), mvRaw = String(r[H.mv] || '').trim(), mv = norm(mvRaw), prod = String(r[H.prod] || '').trim(), es = norm(H.es != null ? r[H.es] : ''), q = Math.abs(num(r[H.q])), p = Math.abs(num(r[H.p])), v = Math.abs(num(r[H.v])), tk = tkOf(prod, '');
    const hit = MOV.find(([re]) => re.test(mv)); if (!d || !prod || !hit) { skip[mvRaw || 'sem tipo'] = (skip[mvRaw || 'sem tipo'] || 0) + 1; return; }
    const kind = hit[1], cls = clsOf(tk, prod), base = { src: 'Movimentação', date: d, tk, prod, cls, broker: brokerOf(r[H.inst]), name: nameOf(prod) };
    if (['Dividendo', 'Rendimento', 'Juros', 'Amortização'].includes(kind)) { if (!v) { skip[mvRaw + ' sem valor'] = (skip[mvRaw + ' sem valor'] || 0) + 1; return; } out.push(Object.assign(base, { type: kind, amount: v })); }
    else if (kind === 'JCP') { if (!v) return; const gross = U.r2(v / .85); out.push(Object.assign(base, { type: 'JCP', amount: gross, tax: U.r2(gross - v), note: 'Importado da B3 · bruto calculado (15% retido na fonte)' })); }
    else if (kind === 'Bonificação') { if (!q) return; out.push(Object.assign(base, { type: 'Bonificação', qty: q, price: p })); }
    else if (kind === 'Desdobro' || kind === 'Grupamento') { if (!q) return; out.push(Object.assign(base, { type: 'Split', qty: q, sign: kind === 'Grupamento' || /debito|saida/.test(es) ? -1 : 1 })); }
    else if (kind === 'Liq') { if (hasNeg && negKeys.has(tk)) { skip['liquidação (já vem na Negociação)'] = (skip['liquidação (já vem na Negociação)'] || 0) + 1; return; } if (!q) return; out.push(Object.assign(base, { type: /debito|saida/.test(es) ? 'Venda' : 'Compra', qty: q, price: p || (v && q ? v / q : 0), liq: 1 })); }
    else if (kind === 'Resgate') { if (!q && !v) return; out.push(Object.assign(base, q ? { type: 'Venda', qty: q, price: p || (v / q) } : { type: 'Amortização', amount: v })); }
    else if (kind === 'Leilão') { if (!q || !v) { skip[mvRaw] = (skip[mvRaw] || 0) + 1; return; } out.push(Object.assign(base, { type: 'Venda', qty: q, price: v / q, note: 'Leilão de frações (B3)' })); } }));
  sheets.filter(s => s.kind === 'pos').forEach(s => s.rows.forEach(r => { const H = s.H, prod = String(H.prod != null ? r[H.prod] : '').trim(), tk = tkOf(prod, H.cod != null ? r[H.cod] : ''), q = num(r[H.q]); if (!tk && !prod) return; if (!q && !num(r[H.va])) return;
    pos.push({ tk, prod: prod || tk, q, px: H.pf != null ? num(r[H.pf]) : 0, val: H.va != null ? num(r[H.va]) : 0, sheet: s.name }); }));
  // o extrato de Negociação só traz o código: a classe e o nome vêm da Movimentação/Posição quando existem
  const hint = {}, names = {}; out.filter(r => r.src === 'Movimentação').forEach(r => { if (r.tk) { hint[r.tk] = r.cls; if (r.name) names[r.tk] = r.name; } });
  pos.forEach(p => { if (!p.tk) return; const sn = norm(p.sheet), c = /etf/.test(sn) ? 'ETF' : /bdr/.test(sn) ? 'BDR' : /fundo|fii|imobili/.test(sn) ? 'FII' : /acoe|acao/.test(sn) ? 'Ação' : clsOf(p.tk, p.prod); if (!hint[p.tk]) hint[p.tk] = c; if (!names[p.tk] && p.prod && p.prod !== p.tk) names[p.tk] = nameOf(p.prod); });
  out.forEach(r => { if (r.src === 'Negociação' && r.tk && hint[r.tk] && !['Opção', 'Futuro'].includes(r.cls)) r.cls = hint[r.tk]; if (r.tk && !r.name && names[r.tk]) r.name = names[r.tk]; });
  return { rows: U.sortBy(out, x => x.date + (x.type === 'Split' ? '1' : '0')), skip, pos }; };

/* ---------- duplicados e quantidades ---------- */
const sameTx = (a, r) => OS.all('invtx').some(t => t.asset === a.id && t.type === r.type && (L.QTX.includes(r.type) ? Math.abs(n(t.qty) - r.qty) < 1e-6 && (t.date === r.date || (r.liq && Math.abs(U.diff(t.date, r.date)) <= 5)) && (!r.price || !n(t.price) || Math.abs(n(t.price) - r.price) < Math.max(.011, r.price * .002)) : t.date === r.date && Math.abs(n(t.amount) - n(r.amount)) < .05));
const dupSplit = (a, r) => OS.all('invtx').some(t => t.asset === a.id && t.type === 'Desdobramento/Grupamento' && t.date === r.date);
const heldAt = (aid, d) => { let q = 0; U.sortBy(OS.all('invtx').filter(t => t.asset === aid && t.date <= d), t => t.date).forEach(t => { if (['Compra', 'Bonificação', 'Subscrição', 'Transferência (entrada)'].includes(t.type)) q += n(t.qty); else if (['Venda', 'Transferência (saída)'].includes(t.type)) q -= n(t.qty); else if (t.type === 'Desdobramento/Grupamento' && n(t.ratio)) q *= n(t.ratio); }); return q; };
const review = () => { if (!ST || !ST.rows) return; let dup = 0; const fresh = [];
  ST.rows.forEach(r => { const a = findA(r.tk, r.prod); if (a && (r.type === 'Split' ? dupSplit(a, r) : sameTx(a, r))) { dup++; return; } fresh.push(r); });
  ST.fresh = fresh; ST.dup = dup; ST.newA = [...new Set(fresh.filter(r => !findA(r.tk, r.prod)).map(r => r.tk || r.prod))];
  ST.byType = U.groupBy(fresh, r => r.type === 'Split' ? 'Desdobramento/Grupamento' : r.type); };

/* ---------- importar ---------- */
const mkAsset = r => { const isRF = L.RFC.includes(r.cls) || r.cls === 'Tesouro Direto', tk = r.tk;
  const o = { name: r.name && r.name !== tk ? r.name.slice(0, 80) : tk || r.prod, ticker: tk || '', cls: r.cls, currency: 'BRL', country: 'Brasil', broker: r.broker || '', notes: 'Criado pelo importador da B3' };
  if (!isRF && tk) o.sym = tk + '.SA'; if (r.cls === 'Tesouro Direto') { o.td = r.prod; o.name = r.prod; o.ticker = ''; } if (isRF && r.cls !== 'Tesouro Direto') { o.name = r.prod.slice(0, 80); o.ticker = ''; o.idx = '% do CDI'; o.rate = 100; o.notes += ' · confirma a taxa e o vencimento'; }
  if (r.cls === 'Opção') o.mult = 1; return OS.add('assets', o, { silent: true }); };
A.b3Go = () => { if (!ST || !ST.fresh || !ST.fresh.length) return; let nA = 0, nT = 0, warn = 0;
  ST.fresh.forEach(r => { let a = findA(r.tk, r.prod); if (!a) { a = mkAsset(r); nA++; }
    if (r.type === 'Split') { const h = heldAt(a.id, U.addDays(r.date, -1)); if (!(h > 0)) { warn++; return; } const ratio = (h + r.sign * r.qty) / h; if (!(ratio > 0)) { warn++; return; } OS.add('invtx', { asset: a.id, type: 'Desdobramento/Grupamento', date: r.date, ratio: Math.round(ratio * 1e6) / 1e6, note: 'Importado da B3' }, { silent: true }); nT++; return; }
    const base = { asset: a.id, type: r.type, date: r.date, note: r.note || 'Importado da B3' + (r.liq ? ' (data de liquidação)' : '') };
    OS.add('invtx', Object.assign(base, L.QTX.includes(r.type) ? { qty: r.qty, price: Math.round(r.price * 1e4) / 1e4 } : { amount: U.r2(r.amount), tax: r.tax || '' }), { silent: true }); nT++; });
  UI.toast(`${nT} movimento(s) importado(s) da B3${nA ? ` · ${nA} ativo(s) novo(s)` : ''}${warn ? ` · ${warn} desdobramento(s) por rever` : ''}`, 'pos');
  ST = null; OS.touch && OS.touch('invtx'); OS.request(); if (IX && IX.tick) IX.tick(true); };

/* ---------- conferência com a posição da B3 ---------- */
const recon = () => (ST.pos || []).map(p => { const a = findA(p.tk, p.prod), mine = a ? (OS.Inv.pos(a).qty || 0) : 0; return Object.assign({}, p, { a, mine, ok: a && Math.abs(mine - p.q) < 1e-6 }); });

/* ---------- ecrã ---------- */
A.b3Open = () => { ST = ST ? null : { files: [], rows: null }; OS.request(); setTimeout(() => { const el = document.getElementById('b3Panel'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 80); };
A.b3Pick = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = '.xlsx,.xls,.csv,.txt'; inp.style.display = 'none'; inp.onchange = () => { B3.read([...(inp.files || [])]); inp.remove(); }; document.body.appendChild(inp); inp.click(); };
B3.read = async files => { if (!files.length) return; ST = ST || { files: [] }; ST.busy = true; ST.err = ''; OS.request();
  try { const sheets = []; for (const f of files) { const s = await readFile(f); if (!s.length) ST.err = (ST.err ? ST.err + ' ' : '') + `"${f.name}" não parece um extrato da B3.`; sheets.push(...s); ST.files.push(f.name); }
    ST.sheets = (ST.sheets || []).concat(sheets); const p = parse(ST.sheets); ST.rows = p.rows; ST.skip = p.skip; ST.pos = p.pos; review(); }
  catch (e) { ST.err = e.message || String(e); }
  ST.busy = false; OS.request(); };
B3.parse = parse; B3.sheetOf = sheetOf; B3.state = () => ST;
B3.btn = (cls = 'btn') => `<button class="${cls}" data-act="b3Open">${UI.ic('arrowUp')}Importar da B3</button>`;
const TY = { Compra: 'acc', Venda: 'vio', Dividendo: 'pos', JCP: 'pos', Rendimento: 'pos', Juros: 'pos', 'Amortização': '', 'Bonificação': '', 'Desdobramento/Grupamento': '' };
B3.panel = () => { if (!ST) return ''; const R = ST.fresh || [], P = ST.pos && ST.pos.length ? recon() : [];
  return `<div class="pn b3" id="b3Panel"><div class="pn-h"><h3>${UI.ic('arrowUp')}Importar da B3 (Área do Investidor)</h3><button class="icon-btn" data-act="b3Open" aria-label="Fechar">${UI.ic('x')}</button></div>
  <ol class="ai-steps b3-steps"><li>Entra em <a class="acc" href="https://www.investidor.b3.com.br" target="_blank" rel="noopener">investidor.b3.com.br</a> com a tua conta gov.br.</li>
    <li><b>Extratos → Negociação</b>: escolhe o período (podes ir até ao início) → <b>Baixar → Excel</b>.</li>
    <li><b>Extratos → Movimentação</b>: o mesmo período → <b>Baixar → Excel</b> (traz dividendos, JCP, rendimentos, bonificações e desdobramentos).</li>
    <li>Opcional: <b>Posição → Baixar</b>, para conferir se tudo bate.</li>
    <li>Escolhe os ficheiros aqui (podes escolher vários de uma vez). Todos os meses basta repetir: o que já foi importado é ignorado.</li></ol>
  <div class="row gap8" style="flex-wrap:wrap"><button class="btn pri" data-act="b3Pick">${ST.busy ? 'A ler…' : 'Escolher ficheiros da B3'}</button>${ST.files && ST.files.length ? `<span class="mut" style="font-size:12.5px">${ST.files.map(esc).join(' · ')}</span>` : ''}</div>
  ${ST.err ? `<p class="neg">${esc(ST.err)}</p>` : ''}
  ${ST.rows ? `<div class="note" style="margin-top:10px"><b>${R.length}</b> movimento(s) novo(s) para importar${ST.dup ? ` · ${ST.dup} já existiam (ignorados)` : ''}${ST.newA && ST.newA.length ? ` · <b>${ST.newA.length}</b> ativo(s) novo(s): ${ST.newA.slice(0, 10).map(esc).join(', ')}${ST.newA.length > 10 ? '…' : ''}` : ''}.</div>
    ${Object.keys(ST.byType || {}).length ? `<div class="row gap6" style="flex-wrap:wrap;margin:8px 0">${Object.entries(ST.byType).map(([k, v]) => UI.badge(`${k}: ${v.length}`, TY[k] || '')).join('')}</div>` : ''}
    ${R.length ? `<div class="tblw" style="max-height:260px;overflow:auto"><table class="tbl"><thead><tr><th>Data</th><th>Ativo</th><th>Tipo</th><th class="r">Qtd.</th><th class="r">Preço</th><th class="r">Valor</th></tr></thead><tbody>${R.slice(0, 120).map(r => `<tr><td class="mono">${U.fmtD(r.date)}</td><td><b>${esc(r.tk || '')}</b> <span class="mut" style="font-size:11.5px">${esc(r.cls)}</span>${r.tk ? '' : `<div class="mut" style="font-size:11.5px">${esc(r.prod)}</div>`}</td><td>${r.type === 'Split' ? (r.sign > 0 ? 'Desdobramento' : 'Grupamento') : esc(r.type)}${r.liq ? ' <span class="mut" style="font-size:11px">(liquidação)</span>' : ''}</td><td class="r mono">${r.qty ? U.nf(r.qty, r.qty % 1 ? 4 : 0) : ''}</td><td class="r mono">${r.price ? U.nf(r.price, 2) : ''}</td><td class="r mono">${r.amount ? U.nf(r.amount, 2) : r.qty && r.price ? U.nf(r.qty * r.price, 2) : ''}</td></tr>`).join('')}</tbody></table></div>${R.length > 120 ? `<p class="mut" style="font-size:12px">… e mais ${R.length - 120}.</p>` : ''}
      <button class="btn pri" data-act="b3Go" style="margin-top:8px">Importar ${R.length} movimento(s)</button>` : ''}
    ${Object.keys(ST.skip || {}).length ? UI.toggle(`Linhas que não entram (${U.sum(Object.values(ST.skip), x => x)})`, `<div class="list">${Object.entries(ST.skip).map(([k, v]) => `<div class="li"><div class="li-t"><b>${esc(k)}</b></div><span class="mono mut">${v}</span></div>`).join('')}</div><p class="mut" style="font-size:12px">Atualizações, transferências entre corretoras, empréstimos e direitos de subscrição não mexem no teu preço médio. Se precisares de algum, regista-o à mão em Movimentos.</p>`, 'b3skip') : ''}
    <p class="mut" style="font-size:12px;margin-top:8px">JCP: a B3 mostra o valor líquido; guardo o bruto e os 15% retidos (para os impostos). Compras e vendas usam a data do negócio quando juntas o extrato de Negociação. Todos os movimentos ficam com a nota "Importado da B3" e podes editá-los.</p>` : ''}
  ${P.length ? `<div class="pn-h" style="margin-top:12px"><h3>Conferência com a posição da B3</h3><span class="${P.every(p => p.ok) ? 'pos' : 'warn'}" style="font-size:12.5px">${P.filter(p => p.ok).length} de ${P.length} batem${ST.fresh && ST.fresh.length ? ' (antes de importar)' : ''}</span></div>
    <div class="tblw"><table class="tbl"><thead><tr><th>Ativo</th><th class="r">B3</th><th class="r">Na app</th><th></th></tr></thead><tbody>${P.map(p => `<tr><td><b>${esc(p.tk || p.prod)}</b>${p.val ? `<div class="mut" style="font-size:11.5px">${IX && IX.Mc ? IX.Mc(p.val, 'BRL') : U.nf(p.val, 2)}</div>` : ''}</td><td class="r mono">${U.nf(p.q, p.q % 1 ? 4 : 0)}</td><td class="r mono">${p.a ? U.nf(p.mine, p.mine % 1 ? 4 : 0) : '—'}</td><td>${p.ok ? '<span class="pos">✓</span>' : `<span class="warn">${p.a ? 'diferente' : 'não existe na app'}</span>`}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>`; };
})();
