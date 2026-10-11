/* OCEANUM — Caixa de entrada de gastos (atalho do iPhone).
   O atalho pede valor e descrição e envia para um script Google (Apps Script) na conta do utilizador, que guarda numa folha.
   O Oceanum, quando está aberto, puxa o que chegou, cria a despesa e marca como importado. Sem abrir a app para registar. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
OS.ONE_DEF.inbox = { url: '', key: '', last: '', n: 0 };
const IB = OS.Inbox = {};
const cfg = () => OS.one('inbox');
const SEEN = 'os2inboxSeen';
const genKey = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

IB.script = key => `// Oceanum · caixa de entrada de gastos + sincronização entre aparelhos. Não partilhes este código: a chave abaixo é a tua.
const KEY = '${key}';
function doGet(e) {
  const p = e.parameter || {};
  if (p.k !== KEY) return out({ ok: false, msg: 'Chave errada' });
  if (p.op === 'ping') return out({ ok: true, v: 10 });
  // ---- cotações em tempo real (Yahoo Finance) para os Investimentos ----
  if (p.op === 'q') return out({ ok: true, q: cotacoes_(String(p.s || '')) });
  if (p.op === 'h') return out({ ok: true, h: historico_(String(p.s || ''), String(p.r || '1y'), String(p.i || '1d')) });
  if (p.op === 's') return out(Object.assign({ ok: true }, procura_(String(p.q || ''), Number(p.n || 0))));
  if (p.op === 'f') return out({ ok: true, f: empresa_(String(p.s || '')) });
  if (p.op === 'td') return out({ ok: true, td: tesouro_() });
  if (p.op === 'nw') { let fs = []; try { fs = JSON.parse(p.f || '[]'); } catch (e) { } return out({ ok: true, nw: noticias_(fs.slice(0, 10)) }); }
  if (p.op === 'al') { PropertiesService.getScriptProperties().setProperty('AL', String(p.j || '[]').slice(0, 8500)); const on = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'verificarAlertas'; }); return out({ ok: true, ativo: on }); }
  if (p.op === 'c') return out({ ok: true, c: agenda_(String(p.s || '')) });
  // ---- e-mail (Gmail) e LinkedIn (pelas notificações no Gmail), para o resumo do Oceanum ----
  if (p.op === 'gm') return out({ ok: true, gm: correio_(String(p.q || ''), Number(p.n || 30)) });
  if (p.op === 'ga') return out({ ok: true, n: acaoCorreio_(String(p.a || ''), String(p.ids || '')) });
  if (p.op === 'dr') return out(rascunho_(String(p.id || ''), String(p.b || '')));
  // ---- Spyke: resumo do dia e perguntas pela Siri (funciona com a app fechada) ----
  if (p.op === 'br') { const P = PropertiesService.getScriptProperties(); P.setProperty('BR', String(p.j || '{}').slice(0, 8500)); P.setProperty('CX', String(p.cx || '').slice(0, 8500)); if (p.gk) P.setProperty('GK', String(p.gk).slice(0, 120)); else if (p.nogk) P.deleteProperty('GK'); return out({ ok: true }); }
  if (p.op === 'brief') return ContentService.createTextOutput(resumo_());
  if (p.op === 'ask') return ContentService.createTextOutput(pergunta_(String(p.q || '')));
  // ---- sincronização: os dados do Oceanum num ficheiro do teu Google Drive ----
  if (p.op === 'list') { const all = dados_(); const m = {}; Object.keys(all).forEach(function (id) { m[id] = all[id].t || 0; }); return out({ ok: true, docs: m }); }
  if (p.op === 'get') { const all = dados_(), ids = String(p.ids || '').split(',').filter(String); const o = {}; (ids.length ? ids : Object.keys(all)).forEach(function (id) { if (all[id]) o[id] = all[id]; }); return out({ ok: true, docs: o }); }
  if (p.op === 'put') { const L = LockService.getScriptLock(); L.waitLock(20000);
    try { const all = dados_(), d = JSON.parse(p.j); Object.keys(d).forEach(function (id) { all[id] = d[id]; }); guardar_(all); } finally { L.releaseLock(); }
    return out({ ok: true }); }
  // ---- caixa de entrada de gastos (atalho do iPhone) ----
  const sh = folha_();
  if (sh.getLastRow() === 0) sh.appendRow(['id', 'data', 'valor', 'descricao', 'categoria', 'importado', 'reservado']);
  if (p.op === 'pull') { const L = LockService.getScriptLock(); L.waitLock(20000);
    try { const rows = sh.getDataRange().getValues(), items = [], now = Date.now();
      for (let i = 1; i < rows.length; i++) { if (rows[i][5]) continue; const res = Number(rows[i][6] || 0); if (res && now - res < 10 * 60 * 1000) continue;
        items.push({ id: String(rows[i][0]), t: String(rows[i][1]), v: Number(rows[i][2]), d: String(rows[i][3]), c: String(rows[i][4]) }); sh.getRange(i + 1, 7).setValue(now); }
      return out({ ok: true, items: items }); } finally { L.releaseLock(); } }
  if (p.op === 'ack') {
    const ids = String(p.ids || '').split(','), rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) if (ids.indexOf(String(rows[i][0])) >= 0) sh.getRange(i + 1, 6).setValue(new Date());
    return out({ ok: true });
  }
  const txt = String(p.v || '') + ' ', m = txt.match(/\\d+(?:[.,]\\d+)?/), v = m ? Number(m[0].replace(',', '.')) : 0;
  if (!(v > 0)) return out({ ok: false, msg: 'Valor inválido' });
  sh.appendRow([Utilities.getUuid(), new Date().toISOString(), v, p.d || '', p.c || '', '', '']);
  return ContentService.createTextOutput('✓ ' + v.toFixed(2).replace('.', ',') + ' € registado no Oceanum');
}
function doPost(e) { return doGet(e); }
// funciona dentro de uma folha ou sozinho (script.google.com): cria a folha de gastos se for preciso
function folha_() { let ss = null; try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { }
  if (!ss) { const P = PropertiesService.getScriptProperties(), id = P.getProperty('SHEET'); if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
    if (!ss) { ss = SpreadsheetApp.create('Oceanum · Gastos do atalho'); P.setProperty('SHEET', ss.getId()); } }
  return ss.getSheets()[0]; }
function ficheiro_() { const P = PropertiesService.getScriptProperties(), id = P.getProperty('DATA'); if (id) { try { return DriveApp.getFileById(id); } catch (e) { } }
  // projeto novo ou copiado: usa o ficheiro de dados que já existe no teu Drive (nunca começa do zero por engano)
  const it = DriveApp.getFilesByName('Oceanum · dados.json'); let best = null; while (it.hasNext()) { const x = it.next(); if (!x.isTrashed() && (!best || x.getSize() > best.getSize())) best = x; }
  if (best) { P.setProperty('DATA', best.getId()); return best; }
  const f = DriveApp.createFile('Oceanum · dados.json', '{}', 'application/json'); P.setProperty('DATA', f.getId()); return f; }
function dados_() { try { return JSON.parse(ficheiro_().getBlob().getDataAsString() || '{}'); } catch (e) { return {}; } }
function guardar_(all) { const f = ficheiro_();
  // cópia de segurança diária ANTES de gravar (fica no teu Drive; guarda as últimas 14)
  const P = PropertiesService.getScriptProperties(), hoje = Utilities.formatDate(new Date(), 'Europe/Lisbon', 'yyyy-MM-dd');
  if (P.getProperty('BK') !== hoje && f.getBlob().getDataAsString() !== '{}') { P.setProperty('BK', hoje); f.makeCopy('Oceanum · cópia ' + hoje);
    const it = DriveApp.searchFiles("title contains 'Oceanum · cópia ' and trashed = false"), lista = []; while (it.hasNext()) lista.push(it.next());
    lista.sort(function (a, b) { return b.getName() < a.getName() ? -1 : 1; }).slice(14).forEach(function (x) { x.setTrashed(true); }); }
  f.setContent(JSON.stringify(all)); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
// ---- e-mail: só lê o que pedires (assunto, remetente, início do texto); ações: lido, arquivar, spam, lixo, estrela ----
function autorizarGmail() { GmailApp.getInboxUnreadCount(); }
function correio_(q, n) { const th = GmailApp.search(q || 'in:inbox newer_than:3d', 0, Math.max(1, Math.min(50, n || 30))), r = [];
  th.forEach(function (t) { const ms = t.getMessages(), m = ms[ms.length - 1]; let sn = ''; try { sn = String(m.getPlainBody() || '').replace(/\\s+/g, ' ').slice(0, 500); } catch (e) { }
    r.push({ id: t.getId(), s: t.getFirstMessageSubject() || '', f: m.getFrom() || '', to: m.getTo() || '', d: m.getDate().toISOString(), u: t.isUnread(), n: ms.length, imp: t.isImportant(), st: t.hasStarredMessages(), l: t.getLabels().map(function (x) { return x.getName(); }), sn: sn }); });
  return r; }
function acaoCorreio_(a, ids) { let n = 0; ids.split(',').filter(String).slice(0, 50).forEach(function (id) { try { const t = GmailApp.getThreadById(id); if (!t) return;
    if (a === 'lido') t.markRead(); else if (a === 'arquivar') t.moveToArchive(); else if (a === 'spam') t.moveToSpam(); else if (a === 'lixo') t.moveToTrash(); else if (a === 'estrela') t.getMessages().slice(-1)[0].star(); else return; n++; } catch (e) { } }); return n; }
// resposta: fica como RASCUNHO no teu Gmail (nunca é enviada sem ti)
function rascunho_(id, b) { if (!id || !b) return { ok: false, msg: 'Falta o e-mail ou o texto' }; const t = GmailApp.getThreadById(id); if (!t) return { ok: false, msg: 'E-mail não encontrado' };
  const eu = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(), ms = t.getMessages(); let m = ms[ms.length - 1];
  for (let i = ms.length - 1; i >= 0; i--) { if (String(ms[i].getFrom()).toLowerCase().indexOf(eu) < 0) { m = ms[i]; break; } }
  const d = m.createDraftReply(b.slice(0, 20000)); return { ok: true, id: d.getId() }; }
// ---- Spyke pela Siri: o Oceanum envia o resumo do dia; o atalho lê-o em voz alta ----
function resumo_() { let b = {}; try { b = JSON.parse(PropertiesService.getScriptProperties().getProperty('BR') || '{}'); } catch (e) { }
  const hoje = Utilities.formatDate(new Date(), 'Europe/Lisbon', 'yyyy-MM-dd');
  if (b.d === hoje && b.t) return b.t; if (b.d2 === hoje && b.t2) return b.t2;
  return 'Ainda não tenho o resumo de hoje. Abre o Oceanum uma vez e eu fico atualizado.'; }
function pergunta_(q) { const P = PropertiesService.getScriptProperties(), gk = P.getProperty('GK'), cx = P.getProperty('CX') || '';
  if (!q) return resumo_(); if (!gk) return 'Para te responder pela Siri, liga a IA no Oceanum e ativa as perguntas pela Siri nas definições do Spyke.';
  const agora = Utilities.formatDate(new Date(), 'Europe/Lisbon', 'yyyy-MM-dd HH:mm');
  const prompt = 'És o Spyke, o assistente pessoal do Ryan (estilo J.A.R.V.I.S.): direto, calmo, confiante, com um toque de humor. Agora em Portugal: ' + agora + '.\\nDados do Oceanum do Ryan (podem ter algumas horas):\\n' + cx + '\\n\\nO Ryan pergunta: ' + q + '\\nResponde em português do Brasil, no máximo 3 frases curtas, para serem ditas em voz alta: sem listas, sem markdown, sem emojis. Usa só os dados acima; se não souberes, diz que não sabes.';
  const ms = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  for (let i = 0; i < ms.length; i++) { try { const r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + ms[i] + ':generateContent?key=' + encodeURIComponent(gk), { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }) });
    if (r.getResponseCode() !== 200) continue; const j = JSON.parse(r.getContentText()), t = (((j.candidates || [])[0] || {}).content || {}).parts; if (t && t.length) return t.map(function (x) { return x.text || ''; }).join('').trim(); } catch (e) { } }
  return 'Não consegui falar com a IA agora. Tenta daqui a pouco.'; }
// ---- mercado: Yahoo Finance (o teu script vai buscar; a app só recebe os números) ----
const YH_ = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'], UA_ = { 'User-Agent': 'Mozilla/5.0 (Oceanum)' };
function yget_(path) { for (let i = 0; i < YH_.length; i++) { try { const r = UrlFetchApp.fetch(YH_[i] + path, { muteHttpExceptions: true, headers: UA_ }); if (r.getResponseCode() === 200) return JSON.parse(r.getContentText()); } catch (e) { } } return null; }
function cart_(j) { const r = j && j.chart && j.chart.result && j.chart.result[0]; if (!r || !r.meta) return null; const m = r.meta, q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {}, c = (q.close || []).filter(function (x) { return x != null; });
  const per = m.currentTradingPeriod && m.currentTradingPeriod.regular, now = Date.now() / 1000, open = per ? now >= per.start && now < per.end : false, k = Math.max(1, Math.ceil(c.length / 80));
  return { p: m.regularMarketPrice, pc: m.chartPreviousClose != null ? m.chartPreviousClose : m.previousClose, cur: m.currency, ex: m.fullExchangeName || m.exchangeName, nm: m.longName || m.shortName || m.symbol, t: m.regularMarketTime, hi: m.regularMarketDayHigh, lo: m.regularMarketDayLow, h52: m.fiftyTwoWeekHigh, l52: m.fiftyTwoWeekLow, v: m.regularMarketVolume, ty: m.instrumentType, open: open, d: c.filter(function (_, i) { return i % k === 0 || i === c.length - 1; }) }; }
function cotacoes_(s) { const syms = s.split(',').map(function (x) { return x.trim(); }).filter(String).slice(0, 40), C = CacheService.getScriptCache(), res = {}, hit = C.getAll(syms.map(function (x) { return 'q:' + x; })), falta = [];
  syms.forEach(function (x) { if (hit['q:' + x]) res[x] = JSON.parse(hit['q:' + x]); else falta.push(x); });
  if (falta.length) { let rs = []; try { rs = UrlFetchApp.fetchAll(falta.map(function (x) { return { url: YH_[0] + '/v8/finance/chart/' + encodeURIComponent(x) + '?range=1d&interval=5m', muteHttpExceptions: true, headers: UA_ }; })); } catch (e) { }
    falta.forEach(function (x, i) { let o = null; try { if (rs[i] && rs[i].getResponseCode() === 200) o = cart_(JSON.parse(rs[i].getContentText())); } catch (e) { }
      if (!o) o = cart_(yget_('/v8/finance/chart/' + encodeURIComponent(x) + '?range=1d&interval=5m'));
      if (o) { res[x] = o; try { C.put('q:' + x, JSON.stringify(o), 15); } catch (e) { } } }); }
  return res; }
function historico_(s, r, i) { const C = CacheService.getScriptCache(), k = 'h:' + s + ':' + r + ':' + i, h = C.get(k); if (h) return JSON.parse(h);
  const j = yget_('/v8/finance/chart/' + encodeURIComponent(s) + '?range=' + encodeURIComponent(r) + '&interval=' + encodeURIComponent(i) + '&events=div%2Csplit'), x = j && j.chart && j.chart.result && j.chart.result[0]; if (!x) return null;
  const q = (x.indicators && x.indicators.quote && x.indicators.quote[0]) || {}, ac = x.indicators && x.indicators.adjclose && x.indicators.adjclose[0] && x.indicators.adjclose[0].adjclose, t = [], c = [];
  (x.timestamp || []).forEach(function (ts, n) { if (q.close && q.close[n] != null) { t.push(ts); c.push(Math.round(q.close[n] * 10000) / 10000); } });
  const ev = x.events || {}, div = Object.keys(ev.dividends || {}).map(function (z) { return [ev.dividends[z].date, ev.dividends[z].amount]; }), spl = Object.keys(ev.splits || {}).map(function (z) { return [ev.splits[z].date, ev.splits[z].numerator / ev.splits[z].denominator]; });
  const o = { cur: x.meta && x.meta.currency, nm: x.meta && (x.meta.longName || x.meta.shortName), t: t, c: c, div: div, spl: spl }; try { C.put(k, JSON.stringify(o), 1800); } catch (e) { } return o; }
// ---- análise de empresas: perfil, donos, gestão, múltiplos, analistas e 10 anos de demonstrações financeiras ----
function crumb_(novo) { const C = CacheService.getScriptCache(); if (!novo) { const c = C.get('yc'); if (c) return JSON.parse(c); }
  const r = UrlFetchApp.fetch('https://fc.yahoo.com', { muteHttpExceptions: true, followRedirects: false, headers: UA_ }), h = r.getAllHeaders(); let ck = h['Set-Cookie'] || h['set-cookie'] || '';
  ck = (Array.isArray(ck) ? ck : [ck]).map(function (x) { return String(x).split(';')[0]; }).filter(String).join('; ');
  const cr = UrlFetchApp.fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { muteHttpExceptions: true, headers: { 'User-Agent': UA_['User-Agent'], Cookie: ck } }).getContentText();
  const o = { ck: ck, cr: cr }; if (cr && cr.length < 40) C.put('yc', JSON.stringify(o), 21600); return o; }
const TS_ = ['TotalRevenue', 'GrossProfit', 'OperatingIncome', 'EBITDA', 'EBIT', 'NetIncome', 'DilutedEPS', 'ResearchAndDevelopment', 'InterestExpense', 'OperatingCashFlow', 'CapitalExpenditure', 'FreeCashFlow', 'CashDividendsPaid', 'RepurchaseOfCapitalStock', 'TotalAssets', 'TotalLiabilitiesNetMinorityInterest', 'StockholdersEquity', 'TotalDebt', 'CashCashEquivalentsAndShortTermInvestments', 'NetDebt', 'CurrentAssets', 'CurrentLiabilities', 'RetainedEarnings', 'WorkingCapital', 'OrdinarySharesNumber'];
function empresa_(s) { const C = CacheService.getScriptCache(), k = 'f:' + s, h = C.get(k); if (h) return JSON.parse(h);
  const mods = 'assetProfile,price,summaryDetail,financialData,defaultKeyStatistics,majorHoldersBreakdown,institutionOwnership,fundOwnership,insiderHolders,recommendationTrend,calendarEvents,earningsTrend';
  let sum = null; for (let t = 0; t < 2 && !sum; t++) { const c = crumb_(t > 0); try { const r = UrlFetchApp.fetch(YH_[0] + '/v10/finance/quoteSummary/' + encodeURIComponent(s) + '?modules=' + mods + '&crumb=' + encodeURIComponent(c.cr), { muteHttpExceptions: true, headers: { 'User-Agent': UA_['User-Agent'], Cookie: c.ck } }); if (r.getResponseCode() === 200) sum = (JSON.parse(r.getContentText()).quoteSummary.result || [])[0] || null; } catch (e) { } }
  const p2 = Math.floor(Date.now() / 1000), p1 = p2 - 12 * 365 * 86400, ts = {};
  [['annual', TS_], ['quarterly', ['TotalRevenue', 'NetIncome', 'OperatingIncome', 'FreeCashFlow']]].forEach(function (g) { const j = yget_('/ws/fundamentals-timeseries/v1/finance/timeseries/' + encodeURIComponent(s) + '?type=' + g[1].map(function (x) { return g[0] + x; }).join(',') + '&period1=' + (g[0] === 'annual' ? p1 : p2 - 3 * 365 * 86400) + '&period2=' + p2);
    ((j && j.timeseries && j.timeseries.result) || []).forEach(function (r) { const key = r.meta && r.meta.type && r.meta.type[0]; if (!key || !r[key]) return; ts[key] = r[key].filter(function (x) { return x && x.reportedValue; }).map(function (x) { return [x.asOfDate, x.reportedValue.raw, x.currencyCode]; }); }); });
  const o = { sum: sum, ts: ts, at: Date.now() }; try { const js = JSON.stringify(o); if (js.length < 99000) C.put(k, js, 21600); } catch (e) { } return o; }
// ---- Tesouro Direto: preços e taxas oficiais (marcação a mercado) ----
function tesouro_() { const C = CacheService.getScriptCache(), h = C.get('td'); if (h) return JSON.parse(h); let j = null;
  try { const r = UrlFetchApp.fetch('https://www.tesourodireto.com.br/o/rentabilidade/investir', { muteHttpExceptions: true, headers: UA_ }); if (r.getResponseCode() === 200) j = JSON.parse(r.getContentText()); } catch (e) { }
  const l = []; Object.keys(j || {}).forEach(function (k) { (j[k] || []).forEach(function (x) { if (x && x.treasuryBondName) l.push({ n: x.treasuryBondName, pr: x.unitaryRedemptionValue, pc: x.unitaryInvestmentValue, tc: x.investmentProfitabilityIndexerName, tv: x.redemptionProfitabilityFeeIndexerName, v: String(x.maturityDate || '').slice(0, 10), t: x.lastMarketPricingDate, min: x.investmentBondMinimumValue }); }); });
  if (l.length) C.put('td', JSON.stringify(l), 600); return l; }
// ---- agenda de dividendos (data-ex, pagamento, valor anual) ----
function agenda_(s) { const syms = s.split(',').filter(String).slice(0, 25), C = CacheService.getScriptCache(), out = {}, c = crumb_();
  syms.forEach(function (x) { const k = 'c:' + x, h = C.get(k); if (h) { out[x] = JSON.parse(h); return; }
    try { const r = UrlFetchApp.fetch(YH_[0] + '/v10/finance/quoteSummary/' + encodeURIComponent(x) + '?modules=calendarEvents,summaryDetail&crumb=' + encodeURIComponent(c.cr), { muteHttpExceptions: true, headers: { 'User-Agent': UA_['User-Agent'], Cookie: c.ck } });
      if (r.getResponseCode() !== 200) return; const q = (JSON.parse(r.getContentText()).quoteSummary.result || [])[0] || {}, ce = q.calendarEvents || {}, sd = q.summaryDetail || {}, v = function (o) { return o && o.raw != null ? o.raw : null; };
      const o = { ex: v(ce.exDividendDate) || v(sd.exDividendDate), pay: v(ce.dividendDate), rate: v(sd.dividendRate) || v(sd.trailingAnnualDividendRate), dy: v(sd.dividendYield) || v(sd.trailingAnnualDividendYield), res: ce.earnings && ce.earnings.earningsDate && ce.earnings.earningsDate[0] ? v(ce.earnings.earningsDate[0]) : null };
      out[x] = o; C.put(k, JSON.stringify(o), 21600); } catch (e) { } });
  return out; }
// ---- alertas de preço por email, mesmo com a app fechada ----
// Corre UMA vez esta função no editor (▶ Executar) para ligar: pede autorização para enviar email e criar o temporizador.
function ativarAlertas() { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'verificarAlertas') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('verificarAlertas').timeBased().everyMinutes(15).create(); MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Oceanum · alertas ligados', 'Vais receber aqui os alertas de preço que criares no Oceanum (verificados a cada 15 minutos).'); }
function verificarAlertas() { const P = PropertiesService.getScriptProperties(); let al = []; try { al = JSON.parse(P.getProperty('AL') || '[]'); } catch (e) { return; }
  const ativos = al.filter(function (a) { return a.on; }); if (!ativos.length) return; const fired = JSON.parse(P.getProperty('ALF') || '{}'), hoje = Utilities.formatDate(new Date(), 'Europe/Lisbon', 'yyyy-MM-dd');
  const q = cotacoes_(ativos.map(function (a) { return a.s; }).filter(function (x, i, l) { return l.indexOf(x) === i; }).join(',')), msgs = [];
  const ag = ativos.some(function (a) { return a.k === 'dataex'; }) ? agenda_(ativos.filter(function (a) { return a.k === 'dataex'; }).map(function (a) { return a.s; }).join(',')) : {};
  ativos.forEach(function (a) { if (fired[a.id] && (a.r !== 'diario' || fired[a.id] === hoje)) return; const x = q[a.s]; let hit = '';
    if (x && x.p != null) { const ch = x.pc ? (x.p / x.pc - 1) * 100 : 0;
      if (a.k === 'acima' && x.p >= a.v) hit = a.s + ' subiu para ' + x.p + ' ' + (x.cur || '') + ' (alvo ' + a.v + ')';
      if (a.k === 'abaixo' && x.p <= a.v) hit = a.s + ' desceu para ' + x.p + ' ' + (x.cur || '') + ' (alvo ' + a.v + ')';
      if (a.k === 'queda' && ch <= -Math.abs(a.v)) hit = a.s + ' cai ' + ch.toFixed(2) + '% hoje';
      if (a.k === 'subida' && ch >= Math.abs(a.v)) hit = a.s + ' sobe ' + ch.toFixed(2) + '% hoje'; }
    if (a.k === 'dataex' && ag[a.s] && ag[a.s].ex) { const d = Utilities.formatDate(new Date(ag[a.s].ex * 1000), 'UTC', 'yyyy-MM-dd'), am = Utilities.formatDate(new Date(Date.now() + 864e5), 'Europe/Lisbon', 'yyyy-MM-dd'); if (d === am) hit = a.s + ': data-ex amanhã (' + d + '). Para receberes o dividendo tens de ter o ativo hoje.'; }
    if (hit) { msgs.push(hit + (a.n ? ' — ' + a.n : '')); fired[a.id] = hoje; } });
  P.setProperty('ALF', JSON.stringify(fired));
  if (msgs.length) MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Oceanum · ' + (msgs.length === 1 ? msgs[0] : msgs.length + ' alertas de preço'), msgs.join('\\n') + '\\n\\nAbre o Oceanum para ver os detalhes.'); }
// ---- jornal: Google Notícias (edição de cada país, temas e pesquisa), atualizado a cada poucos minutos ----
function gnUrl_(f) { const ed = f.ed || 'hl=pt-PT&gl=PT&ceid=PT:pt-150';
  if (f.q) return 'https://news.google.com/rss/search?q=' + encodeURIComponent(f.q + ' when:2d') + '&' + ed;
  if (f.t && f.t !== 'TOP') return 'https://news.google.com/rss/headlines/section/topic/' + f.t + '?' + ed;
  return 'https://news.google.com/rss?' + ed; }
function xmlTxt_(s) { return String(s || '').replace(/<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim(); }
function rss_(xml) { const out = [], re = /<item>([\\s\\S]*?)<\\/item>/g; let m;
  while ((m = re.exec(xml)) && out.length < 40) { const it = m[1], g = function (tag) { const x = it.match(new RegExp('<' + tag + '[^>]*>([\\\\s\\\\S]*?)</' + tag + '>')); return x ? xmlTxt_(x[1]) : ''; };
    const src = it.match(/<source[^>]*url="([^"]*)"[^>]*>([\\s\\S]*?)<\\/source>/), title = g('title'), sn = src ? xmlTxt_(src[2]) : '', desc = g('description');
    const rel = []; const rr = /<a href="([^"]+)"[^>]*>([\\s\\S]*?)<\\/a>(?:&nbsp;|\\s)*<font[^>]*>([\\s\\S]*?)<\\/font>/g; let r2; while ((r2 = rr.exec(desc)) && rel.length < 5) rel.push({ l: r2[1], t: xmlTxt_(r2[2].replace(/<[^>]+>/g, '')), s: xmlTxt_(r2[3]) });
    out.push({ t: sn && title.slice(-(sn.length + 3)) === ' - ' + sn ? title.slice(0, -(sn.length + 3)) : title, s: sn, su: src ? src[1] : '', l: g('link'), d: Date.parse(g('pubDate')) || 0, rel: rel.slice(1) }); }
  return out; }
function noticias_(fs) { const C = CacheService.getScriptCache(), res = {}, falta = [];
  fs.forEach(function (f) { const k = 'n:' + Utilities.base64Encode(gnUrl_(f)).slice(0, 200), h = C.get(k); if (h) res[f.id] = JSON.parse(h); else falta.push([f, k]); });
  if (falta.length) { let rs = []; try { rs = UrlFetchApp.fetchAll(falta.map(function (x) { return { url: gnUrl_(x[0]), muteHttpExceptions: true, headers: UA_, followRedirects: true }; })); } catch (e) { }
    falta.forEach(function (x, i) { let items = []; try { if (rs[i] && rs[i].getResponseCode() === 200) items = rss_(rs[i].getContentText()); } catch (e) { } res[x[0].id] = items; if (items.length) { try { C.put(x[1], JSON.stringify(items), 240); } catch (e) { } } }); }
  return res; }
function procura_(q, n) { if (!q) return { q: [], news: [] }; const C = CacheService.getScriptCache(), k = 's:' + q + ':' + n, h = C.get(k); if (h) return JSON.parse(h);
  const j = yget_('/v1/finance/search?q=' + encodeURIComponent(q) + '&quotesCount=10&newsCount=' + (n || 0) + '&lang=pt-PT') || {};
  const o = { q: (j.quotes || []).filter(function (x) { return x.symbol; }).map(function (x) { return { s: x.symbol, n: x.longname || x.shortname || x.symbol, t: x.quoteType, ty: x.typeDisp, ex: x.exchDisp || x.exchange }; }),
    news: (j.news || []).map(function (x) { return { ti: x.title, l: x.link, pub: x.publisher, t: x.providerPublishTime }; }) };
  try { C.put(k, JSON.stringify(o), 600); } catch (e) { } return o; }
`;

/* ---- adivinhar categoria e conta ---- */
const KW = [[/uber|bolt|taxi|táxi|metro|comboio|autocarro|gasolina|combust|portagem|estaciona|cp |carris/i, ['Transporte', 'Carro']], [/caf[eé]|restaurante|almo[cç]o|jantar|lanche|mercado|continente|pingo|lidl|aldi|mercadona|supermercado|padaria|pizza|burger|mcdonald|kfc|glovo|uber ?eats|bolt ?food|a[cç]a[ií]/i, ['Alimentação', 'Restauração', 'Supermercado']],
  [/netflix|spotify|youtube|apple|icloud|disney|hbo|prime|chatgpt|claude|subscri/i, ['Subscrições']], [/farm[aá]cia|m[eé]dico|consulta|hospital|dentista|gin[aá]sio|whey|creatina|suplement/i, ['Saúde']], [/renda|luz|[aá]gua|internet|vodafone|meo|nos |edp|casa|ikea/i, ['Casa']], [/roupa|zara|primark|sapat|t[eé]nis|nike|adidas|corte|barbe/i, ['Pessoal']], [/cinema|bar|festa|jogo|steam|playstation|concerto|bilhete/i, ['Lazer']], [/livro|curso|propina|faculdade|universidade/i, ['Educação', 'Pessoal']]];
const guess = (d, c) => { const cats = Object.keys(OS.one('fin').cats.Despesa || {}), has = x => cats.find(k => k.toLowerCase() === String(x || '').trim().toLowerCase());
  if (has(c)) return { cat: has(c) };
  const prev = OS.all('transactions').filter(t => t.type === 'Despesa' && t.desc && d && t.desc.trim().toLowerCase() === d.trim().toLowerCase()).slice(-1)[0];
  if (prev) return { cat: prev.cat, account: prev.account };
  for (const [re, opts] of KW) if (re.test(' ' + d + ' ')) { const k = opts.map(has).find(Boolean); if (k) return { cat: k }; }
  return { cat: has('Outros') || cats[0] || '' }; };
const defAcc = () => { const q = OS.ui.qg || {}, accs = OS.Fin.accounts(); return (q.acc && accs.some(a => a.id === q.acc) && q.acc) || (accs.find(a => a.type === 'Conta à ordem') || accs[0] || {}).id; };

let busy = false;
const getJSON = async (url, tries = 3) => { let last = null;
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url, { cache: 'no-store', credentials: 'omit' }), t = await r.text(); try { return JSON.parse(t); } catch (e) { last = new Error('resposta do Google não é JSON'); } } catch (e) { last = e; }
    await new Promise(res => setTimeout(res, 800 * (i + 1))); }
  throw last || new Error('sem resposta'); };
IB.pull = async (manual) => { const c = cfg(); if (!c.url || !c.key || busy) { if (manual) UI.toast('Configura primeiro o endereço do script', 'warn'); return; } busy = true;
  try { const j = await getJSON(c.url + (c.url.includes('?') ? '&' : '?') + 'op=pull&k=' + encodeURIComponent(c.key) + '&_=' + Date.now());
    if (!j.ok) { if (manual) UI.toast(j.msg || 'O script recusou o pedido', 'neg'); return; }
    const seen = new Set(U.ls.get(SEEN, [])), got = [];
    (j.items || []).forEach(it => { if (seen.has(it.id) || it.d === '__teste__') { got.push(it.id); if (it.d === '__teste__') IB.testOk = true; return; } let v = U.num(it.v); if (!(v > 0)) { got.push(it.id); return; }
      // atalho de uma só pergunta: "12,50 uber" chega em v e d; o valor sai do texto e fica só a descrição
      { const raw = String(it.d || ''), tok = raw.match(/(?:^|\s)([-+]?\d+(?:[.,]\d+)?)(?=\s*(?:€|eur|euros?)?\s*[,;:\-–]?(?:\s|$))/i), dz = x => String(x).replace(/\D/g, '').replace(/0+$/, '');
        if (tok && /[a-zà-ú]/i.test(raw) && dz(raw) === dz(it.v)) { const t = U.num(tok[1].replace(',', '.')); if (t > 0) v = t; } }
      it.d = String(it.d || '').replace(/(^|\s)[-+]?\d+(?:[.,]\d+)?\s*(?:€|eur|euros?)?\s*[,;:\-–]?(?=\s|$)/i, ' ').replace(/\s+/g, ' ').trim();
      it.d = it.d ? it.d.charAt(0).toUpperCase() + it.d.slice(1) : '';
      if (OS.get('transactions', 'ib_' + it.id)) { seen.add(it.id); got.push(it.id); return; }
      const g = guess(it.d, it.c), d = it.t ? U.iso(new Date(it.t)) : U.today();
      const rec = OS.add('transactions', { id: 'ib_' + it.id, type: 'Despesa', amount: v, date: d, desc: it.d || '', cat: g.cat, account: g.account || defAcc(), method: 'Débito', ess: 'Essencial', tags: ['atalho'] }, { silent: true });
      try { OS.S.transactions.after && OS.S.transactions.after(rec, true); } catch (e) { }
      seen.add(it.id); got.push(it.id); c.n = (c.n || 0) + 1; UI.toast(`Gasto do atalho: ${U.eur(v)}${it.d ? ' · ' + it.d : ''}`, 'pos'); });
    U.ls.set(SEEN, [...seen].slice(-500));
    if (got.length) fetch(c.url + (c.url.includes('?') ? '&' : '?') + 'op=ack&k=' + encodeURIComponent(c.key) + '&ids=' + encodeURIComponent(got.join(','))).catch(() => { });
    c.last = new Date().toISOString(); c.err = ''; OS.touch('inbox');
    if (manual) UI.toast(got.length ? `${got.length} gasto(s) importado(s)` : 'Ligação OK. Nada novo.', 'pos');
  } catch (e) { c.err = (e && e.message) || 'erro'; OS.touch('inbox'); if (manual) UI.toast('O Google não respondeu agora (' + c.err + '). Tenta outra vez daqui a pouco.', 'neg'); }
  finally { busy = false; } };

/* ---- painel nas Definições: assistente com verificação em cada passo ---- */
const base = () => { const c = cfg(); return c.url ? c.url.trim() : ''; };
const q = (extra) => base() + (base().includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(cfg().key) + (extra || '');
IB.st = IB.st || {};
IB.base = base; IB.q = q; IB.getJSON = getJSON; IB.guess = (d, c) => guess(d, c); IB.defAcc = () => defAcc();
IB.post = async o => { const r = await fetch(base(), { method: 'POST', body: new URLSearchParams(Object.assign({ k: cfg().key }, o)), credentials: 'omit', cache: 'no-store' }); const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { ok: false, msg: t.slice(0, 200) }; } };
const urlOk = u => /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u) || /^https:\/\/script\.google\.com\/a\/[^/]+\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u) || /^http:\/\/127\.0\.0\.1/.test(u);
IB.check = async () => { const u = base(), c = cfg();
  if (!c.key) return IB.st = { ok: false, m: 'Falta o passo 1: carrega em "Copiar código".' };
  if (!u) return IB.st = { ok: false, m: 'Cola o URL da aplicação Web no passo 2.' };
  if (/\/dev$/.test(u)) return IB.st = { ok: false, m: 'Esse é o URL de teste (termina em /dev). Usa o "URL da aplicação Web", que termina em /exec.' };
  if (!urlOk(u)) return IB.st = { ok: false, m: 'O endereço tem de começar por https://script.google.com/macros/s/ e terminar em /exec.' };
  try { let j = null; try { j = await getJSON(q('&op=ping&_=' + Date.now())); } catch (e) { }
    if (!j) return IB.st = { ok: false, m: 'O Google respondeu com uma página em vez dos dados. Na implementação, "Quem tem acesso" tem de ser "Qualquer pessoa".' };
    if (j.msg === 'Chave errada') return IB.st = { ok: false, m: 'Chave errada: o código no Apps Script não é o atual. Cola-o outra vez, guarda e faz Implementar → Gerir implementações → ✏️ → Nova versão.' };
    if (!j.ok && /Valor inv/i.test(j.msg || '')) { cfg().ver = 1; OS.touch('inbox'); return IB.st = { ok: false, m: 'O script Google é uma versão antiga: atualiza-o (página do Spyke → Estado do Spyke → passo a passo).' }; }
    if (!j.ok) return IB.st = { ok: false, m: 'O script respondeu com erro: ' + (j.msg || '?') };
    cfg().ver = j.v || 2; OS.touch('inbox');
    if ((j.v || 2) >= 3) { // testa também a gravação no Google Drive (precisa de autorização dada no editor)
      try { const r = await fetch(base(), { method: 'POST', body: new URLSearchParams({ k: cfg().key, op: 'put', j: JSON.stringify({ 'one~__ping': { t: Date.now(), data: {} } }) }), credentials: 'omit', cache: 'no-store' }), t = await r.text();
        let ok = false; try { ok = JSON.parse(t).ok; } catch (e) { }
        if (!ok) { cfg().drive = 0; OS.touch('inbox'); return IB.st = { ok: false, m: /DriveApp|permission|autoriza/i.test(t) ? 'Falta autorizar o Google Drive. No Apps Script: escolhe a função "doGet" na lista ao lado de ▶ Executar → ▶ Executar → Rever permissões → a tua conta → Avançado → Acessar → Permitir. (O erro "TypeError" que aparece a seguir é normal.) Depois toca outra vez em Verificar.' : 'O Google não conseguiu gravar os dados. Tenta Verificar outra vez daqui a pouco.' }; }
        cfg().drive = 1; OS.touch('inbox');
      } catch (e) { return IB.st = { ok: false, m: 'Não consegui testar a gravação no Google Drive. Tenta outra vez.' }; } }
    return IB.st = { ok: true, m: 'Ligado. A caixa de entrada está a funcionar' + ((j.v || 2) >= 3 ? ' e a gravação no Google Drive também.' : '.') };
  } catch (e) { return IB.st = { ok: false, m: 'Não consegui falar com o script. Confirma: (1) "Quem tem acesso: Qualquer pessoa"; (2) autorizaste a app com a tua conta Google; (3) o código tem "doGet" (cola-o outra vez se for antigo).' }; } };
const panel = () => { const c = cfg(), st = IB.st || {}, ready = !!(c.key && base());
  return `<div class="pn" id="inboxPn"><div class="pn-h"><h3>Atalho de gastos no iPhone</h3><span class="mut" style="font-size:12px">${c.n ? c.n + ' gastos importados' : ''}</span></div>
  ${c.url && c.key ? `<div class="ib-now"><button class="btn sm pri" data-act="ibTest">${UI.ic('sync')}Ir buscar gastos agora</button><span class="mut">${c.last ? 'última verificação: ' + new Date(c.last).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : 'ainda não verificou'}${c.err ? ' · <span class="neg">' + esc(c.err) + '</span>' : ''}</span></div>` : ''}
  <p class="mut" style="margin:0 0 14px">Um toque no Centro de Controlo → valor → descrição → fica registado, sem abrir o Oceanum. Precisa de uma folha Google tua como caixa de entrada (grátis, uma vez só).</p>
  <div class="ib-w">
    <div class="ib-s ${c.key ? 'done' : ''}"><i>1</i><div><b>Copiar o código</b><p>Toca no botão: o código fica copiado.</p><button class="btn sm pri" data-act="ibCopy" data-t="code">${UI.ic('link')}Copiar código</button>
      <p>Depois, no <b>Chrome</b> (não na app do Sheets), abre <a class="acc" href="https://script.google.com/create" target="_blank" rel="noopener"><b>script.google.com/create</b></a>. Se aparecer em versão de telemóvel ou abrir uma app: menu <b>⋮ → Site para computador</b> (no iPhone: <b>aA → Pedir site para computador</b>).</p>
      <p>Apaga o texto que lá está (<code>function myFunction…</code>) → cola o código → <b>💾 Guardar</b>. Não precisas de criar folha nenhuma: o script cria a "Oceanum · Gastos" sozinho.</p>
      <p class="mut">Se tiveres várias contas Google, usa uma janela anónima e entra só com uma.</p></div></div>
    <div class="ib-s ${st.ok ? 'done' : ''}"><i>2</i><div><b>Publicar e colar o endereço</b><p>No Apps Script: <b>Implementar → Nova implementação</b> → ⚙ tipo <b>Aplicação Web</b> → Executar como: <b>Eu</b> → Quem tem acesso: <b>Qualquer pessoa</b> → <b>Implementar</b> → <b>Autorizar acesso</b> → escolhe a tua conta → "Avançadas" → "Aceder a (não seguro)" → <b>Permitir</b>. Copia o <b>URL da aplicação Web</b> (termina em <code>/exec</code>):</p>
      <div class="ib-url"><input class="field" id="ibUrl" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.url || '')}" aria-label="URL da aplicação Web" autocomplete="off" autocapitalize="none" spellcheck="false"><button class="btn sm pri" data-act="ibSave">Verificar</button></div>
      ${st.m ? `<div class="ib-st ${st.ok ? 'ok' : 'bad'}">${st.ok ? '✓' : '✗'} ${esc(st.m)}</div>` : ''}</div></div>
    <div class="ib-s ${IB.testDone ? 'done' : ''}"><i>3</i><div><b>Testar como o atalho</b><p>Envia um gasto de teste e confirma que o Oceanum o recebe (não fica nas tuas finanças).</p><button class="btn sm" data-act="ibRound" ${st.ok ? '' : 'disabled'}>Testar agora</button>${IB.testMsg ? `<div class="ib-st ${IB.testDone ? 'ok' : 'bad'}">${esc(IB.testMsg)}</div>` : ''}</div></div>
    <div class="ib-s"><i>4</i><div><b>Criar o atalho (3 ações)</b><p>App <b>Atalhos</b> → <b>+</b> → nome "Gasto". Adiciona:</p>
      <div class="ib-sc"><div><b>1 · Pedir entrada</b> → toca em "Texto" e muda para <b>Número</b> → pergunta: <i>Quanto gastaste?</i></div><div><b>2 · Pedir entrada</b> → Texto → pergunta: <i>Em quê?</i></div><div><b>3 · Obter conteúdo do URL</b> → no URL cola o <b>link abaixo</b> → toca em ▸ (mostrar mais) → Método: <b>POST</b> → Corpo do pedido: <b>Formulário</b> → <b>Adicionar campo → Texto</b>:<br>&nbsp;&nbsp;chave <code>v</code> · valor: toca e escolhe <b>Entrada fornecida</b> (a 1.ª)<br>&nbsp;&nbsp;chave <code>d</code> · valor: <b>Entrada fornecida</b> (a 2.ª)</div><div><b>4 · Mostrar resultado</b> (opcional) → <b>Conteúdo do URL</b></div></div>
      ${ready ? `<div class="ib-link"><code>${esc(q(''))}</code><button class="btn sm pri" data-act="ibCopy" data-t="link">Copiar link</button></div>` : '<p class="mut">O link aparece depois do passo 2.</p>'}
      <p>Toca em ▶️ para experimentar: deve aparecer "✓ … registado no Oceanum".</p></div></div>
    <div class="ib-s"><i>5</i><div><b>Pôr no Centro de Controlo</b><p>Abre o Centro de Controlo → <b>+</b> (canto superior esquerdo) → <b>Adicionar controlo</b> → pesquisa <b>Atalhos</b> → toca em <b>Atalho</b> → <b>Escolher</b> → "Gasto". Também podes pô-lo no <b>botão de Ação</b> ou no ecrã principal.</p></div></div>
  </div>
  <p class="mut" style="margin:12px 0 0;font-size:12.5px">Os gastos entram em Finanças sempre que abres o Oceanum, com a categoria adivinhada pela descrição (Uber → Transporte, café → Alimentação) e a etiqueta <i>atalho</i>.</p></div>`; };
const syncPanel = () => { const c = cfg(), SY = window.OceanumSync || {}, on = !!SY.on, ready = !!(c.url && c.key), v3 = (c.ver || 0) >= 3 && c.drive !== 0, st = IB.st || {};
  const t = SY.last ? new Date(SY.last).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '';
  return `<div class="pn" id="syncPn"><div class="pn-h"><h3>Sincronizar aparelhos</h3><span class="${on && !SY.err ? 'pos' : 'mut'}" style="font-size:12px">${on ? esc(SY.state || '') + (t ? ' · ' + t : '') : 'desligada'}</span></div>
  <p class="mut" style="margin:0 0 12px">Uma só conta: o que fazes no telemóvel aparece no tablet e vice-versa. Os dados ficam no teu Google Drive ("Oceanum · dados.json"), com uma cópia de segurança por dia.</p>
  ${on ? `<div class="ib-st ${SY.err ? 'bad' : 'ok'}">${SY.err ? '✗ ' + esc(SY.err) + ' — os dados ficam guardados aqui e são enviados quando a ligação voltar.' : '✓ Ligada neste aparelho.'}</div>
    <div class="ib-s"><i>+</i><div><b>Ligar outro aparelho</b><p>Copia o código e abre-o no outro aparelho (manda para ti por WhatsApp ou email). No outro aparelho: Oceanum → Definições → Sincronizar aparelhos → cola o código → <b>Ligar</b>. É como uma palavra-passe: não o partilhes.</p><button class="btn sm pri" data-act="syCopy">${UI.ic('link')}Copiar código de ligação</button></div></div>
    <p style="margin:10px 0 0"><button class="btn sm ghost" data-act="syOff">Desligar a sincronização neste aparelho</button></p>`
  : `<div class="ib-w">
    <div class="ib-s sy-rec"><i>↺</i><div><b>Já tinhas a sincronização ligada (ou mudaste de endereço)?</b><p>Os teus dados estão no teu Google Drive. Recupera-os neste aparelho com o endereço e a chave do teu script Google (os passos aparecem ao tocar).</p><button class="btn sm pri" data-act="mvWelcome">Recuperar os meus dados</button></div></div>
    <div class="ib-s"><i>A</i><div><b>Este aparelho já tem o atalho ligado?</b><p>Se sim (passo 2 do atalho com ✓), segue para B. Se este é o <b>segundo aparelho</b>, cola aqui o código de ligação que copiaste no primeiro:</p>
      <div class="ib-url"><input class="field" id="syCode" placeholder="Código de ligação" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Código de ligação"><button class="btn sm pri" data-act="syLink">Ligar</button></div></div></div>
    ${ready ? `<div class="ib-s ${v3 ? 'done' : ''}"><i>B</i><div><b>Atualizar o script do Google (uma vez)</b>${v3 ? '<p class="pos">✓ O script já está atualizado e pode gravar no teu Google Drive.</p>' : `${(c.ver || 0) >= 3 && st.m && !st.ok ? `<div class="ib-st bad">✗ ${esc(st.m)}</div>` : ''}<p>A sincronização precisa da versão nova do script:</p><p>1. Toca em <b>Copiar código</b> (passo 1 do atalho, mais abaixo).<br>2. No Apps Script: apaga tudo → cola → <b>💾 Guardar</b>.<br>3. <b>Implantar → Gerenciar implantações</b> → ✏️ (lápis) → em <b>Versão</b> escolhe <b>Nova versão</b> → <b>Implantar</b>.<br>4. Se pedir, <b>autoriza o acesso ao Google Drive</b> (Avançado → Acessar → Permitir).<br>5. Volta aqui e toca em <b>Verificar</b>.</p><button class="btn sm" data-act="syVer">Verificar</button>`}</div></div>
    <div class="ib-s"><i>C</i><div><b>Ligar a sincronização</b><p>Faz isto <b>primeiro no aparelho com os dados principais</b> (o tablet). Os outros aparelhos ligam-se depois com o código.</p><button class="btn sm pri" data-act="syOn" ${v3 ? '' : 'disabled'}>Ligar sincronização neste aparelho</button></div></div>` : ''}
  </div>`}</div>`; };
const orig = OS.views.definicoes; if (orig) OS.views.definicoes = sub => orig(sub) + syncPanel() + panel();
A.syVer = async () => { UI.toast('A verificar…'); await IB.check(); const c = cfg(); UI.toast((c.ver || 0) < 3 ? 'Ainda é a versão antiga. Confirma que escolheste "Nova versão" ao implantar.' : c.drive === 0 ? 'Falta autorizar o Google Drive (vê as instruções).' : 'Script atualizado ✓', (c.ver || 0) >= 3 && c.drive !== 0 ? 'pos' : 'warn'); OS.request(); };
A.syOn = () => { try { localStorage.setItem('os2sync', '1'); localStorage.setItem('os2syncJoined', '0'); } catch (e) { } UI.toast('A ligar…'); setTimeout(() => location.reload(), 400); };
A.syOff = () => UI.ask('Desligar a sincronização neste aparelho?', 'Os dados ficam neste aparelho, mas deixam de ser trocados com os outros.', 'Desligar', () => { try { localStorage.removeItem('os2sync'); } catch (e) { } location.reload(); });
A.syLink = () => { const el = document.getElementById('syCode'); const SY = window.OceanumSync; if (!el || !SY || !SY.applyLink(el.value)) { UI.toast('Código inválido. Copia-o outra vez no outro aparelho.', 'neg'); return; } UI.toast('Ligado. A buscar os dados da conta…', 'pos'); setTimeout(() => location.reload(), 500); };
A.syCopy = async () => { const SY = window.OceanumSync; const code = SY.linkCode(); const link = location.origin + location.pathname + '#ligar=' + encodeURIComponent(code);
  try { await navigator.clipboard.writeText(link); UI.toast('Código copiado. Abre-o no outro aparelho.', 'pos'); } catch (e) { UI.modal(`<div style="padding:18px"><b>Copia este código</b><textarea readonly style="width:100%;height:120px;font:12px var(--mono);margin-top:8px" onfocus="this.select()">${esc(link)}</textarea><div style="text-align:right;margin-top:10px"><button class="btn" data-mclose>Fechar</button></div></div>`); } };
const copy = t => new Promise(res => { try { navigator.clipboard.writeText(t).then(() => res(true), () => res(false)); } catch (e) { res(false); } });
// O código tem ~25 mil caracteres: no telemóvel e no tablet o "colar" corta o texto a meio (~20 mil). Por isso vai em 2 partes,
// cada uma num ficheiro do mesmo projeto (o Apps Script junta os ficheiros). Corta sempre entre funções.
IB.parts = key => { const L = IB.script(key).split('\n'), half = L.join('\n').length / 2; let n = 0, cut = 0;
  for (let i = 0; i < L.length; i++) { if (n >= half && /^(function |\/\/ ---- )/.test(L[i])) { cut = i; break; } n += L[i].length + 1; }
  if (!cut) cut = Math.floor(L.length / 2); return [L.slice(0, cut).join('\n') + '\n', '// Oceanum · parte 2 do código (fica num ficheiro à parte no mesmo projeto)\n' + L.slice(cut).join('\n')]; };
const partsModal = () => UI.modal(`<div style="padding:18px"><div class="pn-h"><h3>Código do script em 2 partes</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
  <p class="mut" style="margin:0 0 10px">No telemóvel e no tablet o "colar" corta textos muito grandes, por isso o código vai em duas partes.</p>
  <ol class="ai-steps"><li>Toca em <b>Copiar parte 1</b>. No Apps Script, no ficheiro <b>Código.gs</b>: seleciona tudo → apaga → cola → <b>Guardar</b>.</li>
  <li>Volta aqui e toca em <b>Copiar parte 2</b>. No Apps Script: <b>Ficheiros/Arquivos → +</b> → <b>Script</b> → nome <b>Parte2</b> → apaga o que vier lá → cola → <b>Guardar</b>.</li>
  <li>Confirma: o fim do <b>Código.gs</b> e o fim da <b>Parte2</b> não podem ficar cortados (a Parte2 acaba em <code>}</code>).</li></ol>
  <div class="row gap8" style="flex-wrap:wrap"><button class="btn pri" data-act="ibCopy" data-t="p1">${UI.ic('link')}Copiar parte 1</button><button class="btn pri" data-act="ibCopy" data-t="p2">${UI.ic('link')}Copiar parte 2</button></div></div>`, 'tall');
A.ibCopy = async b => { const c = cfg(); if (!c.key) { c.key = genKey(); OS.touch('inbox'); }
  if (b.dataset.t === 'code') return partsModal();
  const P = b.dataset.t === 'p1' || b.dataset.t === 'p2' ? IB.parts(c.key) : null;
  const t = P ? P[b.dataset.t === 'p1' ? 0 : 1] : b.dataset.t === 'all' ? IB.script(c.key) : q('');
  if (P) { if (await copy(t)) UI.toast((b.dataset.t === 'p1' ? 'Parte 1 copiada: cola-a no Código.gs.' : 'Parte 2 copiada: cola-a no ficheiro Parte2.'), 'pos'); else UI.modal(`<div style="padding:18px"><b>Copia manualmente</b><p class="mut">Toca no texto, seleciona tudo e copia.</p><textarea readonly style="width:100%;height:240px;font:12px var(--mono)" onfocus="this.select()">${esc(t)}</textarea><div style="text-align:right;margin-top:10px"><button class="btn" data-mclose>Fechar</button></div></div>`); return; }
  if (await copy(t)) UI.toast(b.dataset.t === 'code' ? 'Código copiado. Agora cola-o no teu script em script.google.com.' : 'Link copiado', 'pos');
  else UI.modal(`<div style="padding:18px"><b>Copia manualmente</b><p class="mut">Toca no texto, seleciona tudo e copia.</p><textarea readonly style="width:100%;height:240px;font:12px var(--mono)" onfocus="this.select()">${esc(t)}</textarea><div style="text-align:right;margin-top:10px"><button class="btn" data-mclose>Fechar</button></div></div>`); };
A.ibSave = async () => { const el = document.getElementById('ibUrl'), c = cfg(); c.url = (el ? el.value : '').trim(); OS.touch('inbox'); IB.st = { ok: false, m: 'A verificar…' }; OS.request(); await IB.check(); OS.request(); };
A.ibRound = async () => { IB.testMsg = 'A enviar o teste…'; IB.testDone = false; IB.testOk = false; OS.request();
  try { await fetch(q('&v=0.01&d=__teste__')); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200)); await IB.pull(false);
  IB.testDone = !!IB.testOk; IB.testMsg = IB.testOk ? '✓ Funcionou: o Oceanum recebeu o teste. Já podes criar o atalho.' : '✗ O teste não chegou. Volta ao passo 2 e carrega em Verificar.'; OS.request(); };
A.ibTest = () => IB.pull(true);
IB.clean = d => { const t = String(d || '').replace(/(^|\s)[-+]?\d+(?:[.,]\d+)?\s*(?:€|eur|euros?|r\$|reais|usd|\$)?\s*[,;:\-–]?(?=\s|$)/i, ' ').replace(/\s+/g, ' ').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; };
OS.on('ready', () => { try { OS.all('transactions').filter(t => (t.tags || []).includes('atalho') && /\d/.test(t.desc || '')).forEach(t => { const nd = IB.clean(t.desc); if (nd && nd !== t.desc) OS.upd('transactions', t.id, { desc: nd }, { silent: true }); }); } catch (e) { } });
OS.on('ready', () => { setTimeout(() => { IB.pull(false); if (cfg().url && cfg().key) IB.check().then(() => OS.request()); }, 1500); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) IB.pull(false); });
setInterval(() => { if (!document.hidden) IB.pull(false); }, 90000);
})();
