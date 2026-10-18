/* NÁUTILO — Investimentos+: alertas de preço (no ecrã, notificação e email pelo script Google mesmo com a app fechada)
   e comparação de ativos lado a lado (rentabilidade, risco e múltiplos). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, C = OS.C, A = OS.act, esc = U.esc, IX = OS.InvX, T = IX.T, Inv = OS.Inv;
const n = v => U.num(v) || 0;
const KINDS = [['acima', 'Preço sobe acima de'], ['abaixo', 'Preço desce abaixo de'], ['queda', 'Cai mais de X% no dia'], ['subida', 'Sobe mais de X% no dia'], ['dataex', 'Data-ex amanhã (dividendo)']];
OS.S.palerts = { label: 'Alerta de preço', title: r => r.s + ' · ' + ((KINDS.find(k => k[0] === r.k) || [])[1] || ''), fields: [
  { k: 's', l: 'Símbolo', t: 'text', req: 1, h: 'Ex.: AAPL, PETR4.SA, VWCE.DE, BTC-EUR' },
  { k: 'k', l: 'Avisar quando', t: 'sel', o: KINDS, req: 1 },
  { k: 'v', l: 'Valor', t: 'num', show: r => r.k !== 'dataex', h: r => r.k === 'queda' || r.k === 'subida' ? 'Percentagem (ex.: 5)' : 'Preço na moeda do ativo' },
  { k: 'r', l: 'Repetir', t: 'sel', o: [['uma', 'Só uma vez'], ['diario', 'Todos os dias em que acontecer']] },
  { k: 'n', l: 'Nota (o que fazer)', t: 'text', h: 'Ex.: comprar mais 5' }, { k: 'on', l: 'Ativo', t: 'bool' }],
  defaults: () => ({ k: 'abaixo', r: 'uma', on: true }) };
const AL = () => OS.all('palerts');
/* ---------- verificação no aparelho (a cada atualização de preços) ---------- */
const notify = (title, body) => { try { if (!('Notification' in window) || Notification.permission !== 'granted') return; if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: 'icon-192.png', tag: 'oc-' + title })).catch(() => new Notification(title, { body })); else new Notification(title, { body }); } catch (e) { } };
IX.checkAlerts = () => { const today = U.today(); AL().filter(a => a.on && a.s).forEach(a => { if (a.firedAt && (a.r !== 'diario' || a.firedAt === today)) return; const q = IX.q(a.s); let hit = '';
  if (q && q.p != null) { const ch = q.pc ? (q.p / q.pc - 1) * 100 : 0;
    if (a.k === 'acima' && q.p >= n(a.v)) hit = `${a.s} subiu para ${U.nf(q.p, 2)} ${q.cur || ''} (alvo ${U.nf(n(a.v), 2)})`;
    if (a.k === 'abaixo' && q.p <= n(a.v)) hit = `${a.s} desceu para ${U.nf(q.p, 2)} ${q.cur || ''} (alvo ${U.nf(n(a.v), 2)})`;
    if (a.k === 'queda' && ch <= -Math.abs(n(a.v))) hit = `${a.s} cai ${U.nf(ch, 2)}% hoje`;
    if (a.k === 'subida' && ch >= Math.abs(n(a.v))) hit = `${a.s} sobe ${U.nf(ch, 2)}% hoje`; }
  if (!hit) return; const msg = hit + (a.n ? ' — ' + a.n : ''); UI.toast('' + msg, 'pos'); notify('Náutilo · alerta', msg);
  OS.upd('palerts', a.id, a.r === 'diario' ? { firedAt: today, last: msg } : { firedAt: today, last: msg, on: false }, { silent: true }); }); };
OS.on('ready', () => { const t = IX.tick; IX.tick = async f => { await t(f); try { IX.checkAlerts(); } catch (e) { } }; AL().forEach(a => a.s && a.on && a.k !== 'dataex' && IX.extra.add(a.s)); });
/* símbolos dos alertas também entram no ciclo ao vivo */
const symsW = IX.symsWatch; IX.symsWatch = () => [...new Set([...symsW(), ...AL().filter(a => a.on && a.s).map(a => a.s)])];
/* ---------- envia a lista para o script (email com a app fechada) ---------- */
const pushAlerts = U.deb(async () => { const c = OS.one('inbox'); if (!c.url || !c.key) return; const j = JSON.stringify(AL().map(a => ({ id: a.id, s: a.s, k: a.k, v: n(a.v), r: a.r, n: a.n || '', on: a.on ? 1 : 0 })));
  try { const r = await fetch(c.url, { method: 'POST', body: new URLSearchParams({ k: c.key, op: 'al', j }), credentials: 'omit', cache: 'no-store' }); const o = JSON.parse(await r.text()); IX.st.alerts = o.ok ? (o.ativo ? 'email' : 'sem-email') : 'erro'; if (/investimentos/.test(location.hash)) OS.request(); } catch (e) { IX.st.alerts = 'erro'; } }, 1500);
OS.on('change', c => { if (c === 'palerts') pushAlerts(); });
OS.on('ready', () => setTimeout(pushAlerts, 4000));
A.invAlert = b => UI.openForm('palerts', null, { s: b.dataset.s || '', k: b.dataset.k || 'abaixo', v: b.dataset.v ? U.r2(+b.dataset.v) : '', r: 'uma', on: true }, { title: 'Novo alerta' + (b.dataset.s ? ' · ' + b.dataset.s : '') });
A.invNotif = async () => { if (!('Notification' in window)) { UI.toast('Este navegador não suporta notificações. No iPhone, instala o Náutilo no ecrã principal.', 'warn'); return; } const p = await Notification.requestPermission(); UI.toast(p === 'granted' ? 'Notificações ligadas' : 'Notificações recusadas', p === 'granted' ? 'pos' : 'warn'); OS.request(); };
IX.alertsPanel = () => { const L = U.sortBy(AL(), a => (a.on ? 0 : 1) + (a.s || '')), np = 'Notification' in window ? Notification.permission : 'n/a', em = IX.st.alerts;
  return `<div class="pn"><div class="pn-h"><h3>Alertas de preço</h3><button class="btn sm pri" data-act="invAlert">+ Alerta</button></div>
    ${L.length ? `<div class="list">${L.map(a => { const q = IX.q(a.s), kk = (KINDS.find(k => k[0] === a.k) || [, ''])[1]; return `<div class="li ${a.on ? '' : 'mut'}"><div class="li-t click" data-edit="palerts:${a.id}"><b>${esc(a.s)} · ${esc(kk)} ${a.k !== 'dataex' ? U.nf(n(a.v), 2) + (a.k === 'queda' || a.k === 'subida' ? '%' : '') : ''}</b><small>${q ? 'agora ' + U.nf(q.p, 2) + ' ' + esc(q.cur || '') + ' · ' : ''}${a.on ? (a.r === 'diario' ? 'todos os dias' : 'uma vez') : 'disparado' + (a.firedAt ? ' a ' + U.fmtD(a.firedAt) : '')}${a.n ? ' · ' + esc(a.n) : ''}</small></div>${a.on ? '<span class="bdg pos">ativo</span>' : `<button class="btn xs ghost" data-act="invAlertOn" data-id="${a.id}">reativar</button>`}</div>`; }).join('')}</div>` : UI.empty('Cria alertas para seres avisado quando um ativo chegar ao preço que queres, cair muito num dia ou tiver data-ex amanhã.')}
    <div class="ia-al-ch"><span class="${np === 'granted' || em === 'email' ? 'pos' : 'mut'}">${np === 'granted' || em === 'email' ? '✓ Avisos ligados' + (np === 'granted' ? ' no aparelho' : '') + (em === 'email' ? (np === 'granted' ? ' e' : '') + ' por e-mail' : '') : 'Os avisos só aparecem com a app aberta.'} <a class="acc" href="#definicoes.ligacoes">Notificações e e-mail: Definições → Ligações</a></span></div></div>`; };
// Definições → Ligações: como os alertas de preço chegam (notificações do aparelho e e-mail pelo script)
IX.alertSettings = () => { const np = 'Notification' in window ? Notification.permission : 'n/a', em = IX.st.alerts;
  return `<div class="pn" id="alertSet"><div class="pn-h"><h3>Alertas de preço (Investimentos)</h3><span class="bdg ${np === 'granted' || em === 'email' ? 'pos' : ''}">${np === 'granted' || em === 'email' ? 'ligados' : 'só com a app aberta'}</span></div>
    <div class="list"><div class="li"><div class="li-t"><b>Notificações neste aparelho</b><small>${np === 'granted' ? '✓ Ligadas (com a app aberta).' : np === 'n/a' ? 'Este navegador não tem notificações. No iPhone, instala o Náutilo no ecrã principal.' : 'Mostram o alerta mesmo noutra página da app.'}</small></div><div class="li-r">${np === 'granted' || np === 'n/a' ? '' : '<button class="btn sm" data-act="invNotif">Ligar</button>'}</div></div>
    <div class="li"><div class="li-t"><b>E-mail com a app fechada</b><small>${em === 'email' ? '✓ Ligado: o script verifica a cada 15 min, mesmo com a app fechada.' : IX.hasScript() ? 'No Apps Script, escolhe a função <b>ativarAlertas</b> → ▶ Executar → autoriza (uma vez).' : 'Precisa do script Google ligado (cotações, acima).'}</small></div></div></div>
    <small class="mut">Os alertas em si (preço, queda, subida, data-ex) crias em Investimentos.</small></div>`; };
A.invAlertOn = b => OS.upd('palerts', b.dataset.id, { on: true, firedAt: '' });

/* ================= COMPARAR ATIVOS ================= */
const CR = [['6mo', '6M'], ['1y', '1A'], ['2y', '2A'], ['5y', '5A']];
const CH = {};
const histC = (s, r) => { const k = s + '|' + r; if (CH[k]) return CH[k] === 'busy' ? null : CH[k]; CH[k] = 'busy'; IX.hist(s, r, r === '5y' ? '1wk' : '1d').then(h => { CH[k] = h || { t: [], c: [] }; OS.request(); }).catch(() => { CH[k] = { t: [], c: [] }; OS.request(); }); return null; };
const FU = {};
const fundC = s => { if (FU[s]) return FU[s] === 'busy' ? null : FU[s]; if (!IX.hasScript() || IX.isCrypto(s) || /^\^|=X$|=F$/.test(s)) return null; FU[s] = 'busy'; IX.fund(s).then(f => { FU[s] = f; OS.request(); }).catch(() => { FU[s] = null; }); return null; };
let CQ = '', CRES = null;
T.comparar = () => { const sel = OS.ui.invCmp || IX.positions().filter(p => p.a.sym).sort((a, b) => b.value - a.value).slice(0, 3).map(p => p.a.sym), rg = OS.ui.invCmpR || '1y', pal = ['var(--accent)', '#f2a65a', '#a78bfa', 'var(--pos)'];
  sel.forEach(s => IX.extra.add(s)); const hs = sel.map(s => histC(s, rg)), ready = hs.every(Boolean);
  let chart = '', stats = [];
  if (ready && sel.length) { const day = t => U.iso(new Date(t * 1000)), all = [...new Set(hs.flatMap(h => h.t.map(day)))].sort(), k = Math.max(1, Math.ceil(all.length / 180)), dates = all.filter((_, i) => i % k === 0 || i === all.length - 1);
    const ser = hs.map(h => { const m = {}; h.t.forEach((t, i) => m[day(t)] = h.c[i]); let last = null, base = null; return dates.map(d => { if (m[d] != null) last = m[d]; if (last != null && base == null) base = last; return last == null ? null : (last / base - 1) * 100; }); });
    chart = C.mount({ type: 'line', labels: dates.map(U.fmtDS), series: sel.map((s, i) => ({ name: s, data: ser[i], color: pal[i] })), fmt: v => U.nf(v, 0) + '%', min0: false, area: false }, 300);
    const rets = hs.map(h => { const r = []; for (let i = 1; i < h.c.length; i++) if (h.c[i - 1]) r.push(h.c[i] / h.c[i - 1] - 1); return r; }), per = rg === '5y' ? 52 : 252;
    const sd = r => { const m = U.avg(r); return Math.sqrt(U.avg(r, x => (x - m) * (x - m))); }, mdd = c => { let p = -Infinity, d = 0; c.forEach(x => { if (x > p) p = x; d = Math.min(d, x / p - 1); }); return d; };
    const corr = (a, b) => { const L2 = Math.min(a.length, b.length), x = a.slice(-L2), y = b.slice(-L2), mx = U.avg(x), my = U.avg(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < L2; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; };
    stats = sel.map((s, i) => { const h = hs[i], c = h.c.filter(x => x != null), q = IX.q(s), f = fundC(s), m = f && f.sum ? IX.coModel(f) : null, divs = (h.div || []).filter(d => d[0] * 1000 > Date.now() - 365 * 864e5).reduce((a, d) => a + d[1], 0);
      return { s, nm: (q && q.nm) || (m && (m.pr.longName || m.pr.shortName)) || s, cur: (q && q.cur) || h.cur, p: q ? q.p : c[c.length - 1], ret: c.length > 1 ? c[c.length - 1] / c[0] - 1 : null, vol: rets[i].length > 5 ? sd(rets[i]) * Math.sqrt(per) : null, mdd: c.length ? mdd(c) : null, corr: i ? corr(rets[0], rets[i]) : 1, dy: q && q.p && divs ? divs / q.p : (m ? m.dy : null), m }; }); }
  const fmt = (x, f) => x == null || !isFinite(x) ? '—' : f(x), P = x => fmt(x, v => U.pct(v, 1)), N = (x, d = 2) => fmt(x, v => U.nf(v, d));
  const rows = [['Preço', x => N(x.p) + ' ' + esc(x.cur || '')], ['Rentabilidade no período', x => `<span class="${x.ret >= 0 ? 'pos' : 'neg'}">${P(x.ret)}</span>`], ['Volatilidade anual', x => P(x.vol)], ['Queda máxima', x => `<span class="neg">${P(x.mdd)}</span>`], ['Correlação com ' + esc(sel[0] || ''), x => N(x.corr)], ['Dividend yield', x => P(x.dy)],
    ['P/L', x => N(x.m && x.m.pe, 1)], ['P/VP', x => N(x.m && x.m.pb)], ['ROE', x => P(x.m && x.m.roe)], ['Margem líquida', x => P(x.m && x.m.nm)], ['Dívida líq./EBITDA', x => fmt(x.m && x.m.ndEb, v => U.nf(v, 1) + '×')], ['Cresc. receita/ano', x => P(x.m && x.m.grow)], ['Piotroski', x => x.m && x.m.pio ? x.m.pio.score + '/' + x.m.pio.of : '—'], ['Preço justo de Graham', x => N(x.m && x.m.graham)], ['Valor de mercado', x => x.m && x.m.mcap ? U.nf(x.m.mcap / 1e9, 1) + ' mM' : '—']];
  return `<div class="pn"><div class="pn-h"><h3>Comparar ativos</h3><span class="mut" style="font-size:12px">até 4: ações, ETFs, fundos, cripto, índices</span></div>
    <div class="row gap6" style="flex-wrap:wrap;align-items:center">${sel.map((s, i) => `<span class="chip on" style="border-color:${pal[i]}">${esc(s)} <button class="icon-btn" style="width:18px;height:18px" data-act="invCmpDel" data-s="${esc(s)}" aria-label="Remover">${UI.ic('x')}</button></span>`).join('')}
      ${sel.length < 4 ? `<form class="row gap6" data-form="invCmpAdd"><input class="field" name="q" value="${esc(CQ)}" placeholder="+ ativo (ex.: VOO, ITSA4)" style="width:200px" aria-label="Adicionar ativo"><button class="btn sm">Adicionar</button></form>` : ''}</div>
    ${CRES ? `<div class="list" style="margin-top:6px">${CRES.map(r => `<div class="li click" data-act="invCmpPick" data-s="${esc(r.s)}"><div class="li-t"><b>${esc(r.s)}</b><small>${esc(r.n)} · ${esc(r.ex || '')}</small></div></div>`).join('')}</div>` : ''}
    <div class="row gap6" style="margin:10px 0">${CR.map(([k, l]) => `<button class="chip ${rg === k ? 'on' : ''}" data-ui="invCmpR" data-v="${k}">${l}</button>`).join('')}</div>
    ${sel.length ? (ready ? chart : '<div class="sai-busy"><div class="fd-spin"></div><span>A carregar o histórico…</span></div>') : UI.empty('Adiciona ativos para comparar.')}</div>
  ${stats.length ? `<div class="pn"><div class="tblw"><table class="tbl cmp-t"><thead><tr><th></th>${stats.map((x, i) => `<th class="r" style="color:${pal[i]}">${esc(x.s)}<div class="mut" style="font-size:11px;font-weight:400">${esc(String(x.nm).slice(0, 28))}</div></th>`).join('')}</tr></thead><tbody>${rows.filter(([l, f]) => stats.some(x => !/^—$/.test(String(f(x)).replace(/<[^>]+>/g, '').trim()))).map(([l, f]) => `<tr><th>${l}</th>${stats.map(x => `<td class="r mono">${f(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="mut" style="font-size:12px;margin:6px 0 0">Rentabilidade em moeda local de cada ativo (sem câmbio). Os múltiplos aparecem para ações quando o script está ligado.</p>
    <div class="row gap8" style="margin-top:8px"><button class="btn sm ghost" data-act="invCmpAI">${UI.ic('zap')}Pedir à IA para comparar</button></div></div>` : ''}`; };
A.invCmpDel = b => { const cur = OS.ui.invCmp || IX.positions().filter(p => p.a.sym).sort((x, y) => y.value - x.value).slice(0, 3).map(p => p.a.sym); OS.setUI('invCmp', cur.filter(s => s !== b.dataset.s)); };
A.invCmpPick = b => { const cur = OS.ui.invCmp || IX.positions().filter(p => p.a.sym).sort((x, y) => y.value - x.value).slice(0, 3).map(p => p.a.sym); CRES = null; CQ = ''; if (!cur.includes(b.dataset.s)) OS.setUI('invCmp', [...cur, b.dataset.s].slice(0, 4)); else OS.request(); };
OS.forms.invCmpAdd = async (f, v) => { const q = String(v('q') || '').trim(); if (!q) return; CQ = q;
  if (/^[A-Z0-9.^=\-]{1,15}$/.test(q) && (!IX.hasScript() || IX.q(q))) { A.invCmpPick({ dataset: { s: q } }); return; }
  try { const j = IX.hasScript() ? await IX.search(q) : { q: [] }; CRES = (j.q || []).slice(0, 6); if (!CRES.length) { A.invCmpPick({ dataset: { s: q.toUpperCase() } }); return; } } catch (e) { A.invCmpPick({ dataset: { s: q.toUpperCase() } }); return; } OS.request(); };
A.invCmpAI = () => { const sel = OS.ui.invCmp || IX.positions().filter(p => p.a.sym).sort((x, y) => y.value - x.value).slice(0, 3).map(p => p.a.sym); OS.setUI('invAIq', `Compara ${sel.join(', ')}: qual faz mais sentido para a minha carteira e perfil, com que peso, e porquê? Considera risco, custos, dividendos, avaliação e o que diriam os mestres.`); location.hash = 'investimentos.ia'; };
})();
