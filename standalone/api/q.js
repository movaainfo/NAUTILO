// NÁUTILO · cotações de reserva (função do Vercel). Quando o script Google não consegue buscar as cotações
// (o Yahoo às vezes bloqueia os servidores do Google), a app pede-as aqui: dados públicos do Yahoo Finance.
// Só símbolos válidos, no máximo 30 por pedido, guardados 30 s; só responde à própria app.
const CACHE = new Map(), HITS = new Map();
const OK = /^https:\/\/(oceanum|nautilo)(-[a-z0-9-]+)?\.vercel\.app$/;
module.exports = async (req, res) => {
  const origin = req.headers.origin || '', ref = req.headers.referer || '', site = req.headers['sec-fetch-site'] || '';
  // só a própria app: pedido do mesmo site (o navegador marca-o) ou com origem/referência da app; o resto é recusado
  const mine = OK.test(origin) || (!origin && (site === 'same-origin' || OK.test((ref.match(/^https:\/\/[^/]+/) || [''])[0])));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!mine) { res.statusCode = 403; return res.end('{"ok":false}'); }
  // travão contra abusos: no máximo 120 pedidos por minuto por endereço
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim(), now = Date.now(), h = HITS.get(ip) || [];
  const recent = h.filter(t => now - t < 60000); recent.push(now); HITS.set(ip, recent); if (HITS.size > 2000) HITS.delete(HITS.keys().next().value);
  if (recent.length > 120) { res.statusCode = 429; return res.end('{"ok":false,"msg":"demasiados pedidos"}'); }
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Cache-Control', 'public, s-maxage=30, max-age=0');
  const syms = String((req.query && req.query.s) || '').split(',').map(x => x.trim()).filter(x => /^[A-Za-z0-9.^=\-]{1,24}$/.test(x)).slice(0, 30);
  if (!syms.length) return res.end('{"ok":false,"msg":"sem símbolos"}');
  const out = {};
  await Promise.all(syms.map(async s => { const c = CACHE.get(s); if (c && Date.now() - c.t < 30000) { out[s] = c.v; return; }
    for (const host of ['query1', 'query2']) { try {
      const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=1d&interval=5m`, { headers: { 'User-Agent': 'Mozilla/5.0 (NAUTILO)' } });
      if (!r.ok) continue; const j = await r.json(), x = j && j.chart && j.chart.result && j.chart.result[0]; if (!x || !x.meta) continue;
      const m = x.meta, q = (x.indicators && x.indicators.quote && x.indicators.quote[0]) || {}, cl = (q.close || []).filter(v => v != null), k = Math.max(1, Math.ceil(cl.length / 80)), per = m.currentTradingPeriod && m.currentTradingPeriod.regular, now = Date.now() / 1000;
      const v = { p: m.regularMarketPrice, pc: m.chartPreviousClose != null ? m.chartPreviousClose : m.previousClose, cur: m.currency, ex: m.fullExchangeName || m.exchangeName, nm: m.longName || m.shortName || m.symbol, t: m.regularMarketTime, hi: m.regularMarketDayHigh, lo: m.regularMarketDayLow, h52: m.fiftyTwoWeekHigh, l52: m.fiftyTwoWeekLow, v: m.regularMarketVolume, ty: m.instrumentType, open: per ? now >= per.start && now < per.end : false, d: cl.filter((_, i) => i % k === 0 || i === cl.length - 1) };
      if (v.p == null) continue; CACHE.set(s, { t: Date.now(), v }); if (CACHE.size > 500) CACHE.delete(CACHE.keys().next().value); out[s] = v; return; } catch (e) { } } }));
  res.end(JSON.stringify({ ok: true, q: out }));
};
