// PRUMO · línguas (função do Vercel): o dicionário de cada língua, feito pela IA a partir dos textos do app e guardado para todos.
//   GET  ?l=en            → { completo, total, feito, m: { "texto em português": "tradução" } } (público: são só textos do app)
//   POST { op:'preparar', l } → traduz o próximo lote do que falta (só com sessão numa conta) e devolve o progresso
// Os textos vêm de i18n/strings.json (gerado no build a partir do código). Nada do que as pessoas escrevem passa por aqui.
'use strict';
const N = require('./_nuvem');
const G = 'https://generativelanguage.googleapis.com/v1beta/models/';
const FREE = () => process.env.NAUTILO_IA_LIVRE || 'https://text.pollinations.ai/openai';
const gkey = () => String(process.env.GEMINI_API_KEY || '').trim();
const LANG = /^(pt-BR|zh-TW|[a-z]{2})$/;
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
const BATCH_N = 240, BATCH_C = 9000;

// a lista dos textos do app (do próprio site), guardada em memória
let SRC = null, SRC_AT = 0;
const strings = async req => { if (SRC && Date.now() - SRC_AT < 10 * 60e3) return SRC;
  let j = null; const local = process.env.NAUTILO_STRINGS;
  if (local) j = JSON.parse(require('fs').readFileSync(local, 'utf8'));
  else { const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim(); if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) throw N.err('host', 'Endereço inválido.', 400);
    const r = await fetch('https://' + host + '/i18n/strings.json', { cache: 'no-store' }); if (!r.ok) throw N.err('strings', 'Sem a lista de textos do app.', 503); j = await r.json(); }
  SRC = { v: j.v, all: (j.s || []).concat(j.p || []) };   // já vêm por ordem de importância SRC_AT = Date.now(); return SRC; };
const KEY = l => 'i18n/' + l + '.json';
const load = async l => { const g = await N.store().get(KEY(l)); if (!g) return { d: { m: {}, f: {} }, etag: null }; let d; try { d = JSON.parse(g.buf.toString()); } catch (e) { d = { m: {}, f: {} }; } d.m = d.m || {}; d.f = d.f || {}; return { d, etag: g.etag }; };

const NAME = l => { if (l === 'pt-BR') return 'Brazilian Portuguese (pt-BR)'; try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(l) + ' (' + l + ')'; } catch (e) { return l; } };
const RULES = l => `You translate the user interface of "Prumo", a personal life-management app (money, studies, workouts, diet, habits, goals, calendar, e-mail, a life RPG game called Dominus, and an AI assistant). Source language: European Portuguese (pt-PT). Target language: ${NAME(l)}.
Rules:
1. Return ONLY a JSON object that maps every input key to its translation (same keys).
2. Keep placeholders like {0}, {1} exactly as written (you may move them). A placeholder glued to the end of a word (like "dia{1}") is a plural ending: drop it if the target language does not need it.
3. Keep unchanged: brand and product names (Prumo, Dominus, Spyke, Gmail, Google, iPhone, Android, LinkedIn, Outlook, Notion, Excel, Strava…), emojis, symbols, numbers, currency signs, units, URLs, e-mail addresses and code.
4. Use the informal "you" (tu → you / tú / du / tu…), short natural UI wording, the same capitalization style and the same punctuation at the start and the end.
5. Inputs can be fragments of a larger sentence (a label before a value, words between two values): translate them so they still fit there.
6. Names of Portuguese or Brazilian institutions, taxes and products (IRS, NIF, ECTS, Segurança Social, recibos verdes, Tesouro Direto, CDI, IPCA, B3, FII…) stay as they are.
${l === 'pt-BR' ? '7. Rewrite in Brazilian Portuguese: você, celular, tela, salvar, cadastrar, registrar, academia, ônibus, time, banheiro, etc. Keep the meaning and the tone.' : ''}`.trim();

// pede a tradução de um lote; devolve { chave: tradução }
const ask = async (l, items) => { const input = {}; items.forEach((s, i) => { input[i] = s; });
  const user = JSON.stringify(input), k = gkey();
  if (k) { let last = null; const t0 = Date.now();
    for (const m of MODELS) { if (Date.now() - t0 > 14e3) break; const body = { systemInstruction: { parts: [{ text: RULES(l) }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: Object.assign({ temperature: .2, responseMimeType: 'application/json', maxOutputTokens: 16000 }, /2\.5|latest/.test(m) ? { thinkingConfig: { thinkingBudget: 0 } } : {}) };
      const ac = new AbortController(), to = setTimeout(() => ac.abort(), 42e3); let r, j;
      try { r = await fetch(G + m + ':generateContent?key=' + encodeURIComponent(k), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal }); j = await r.json().catch(() => ({})); }
      catch (e) { last = 'tempo'; continue; } finally { clearTimeout(to); }
      if (!r.ok) { last = (j.error && j.error.message) || r.status; continue; }
      const txt = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('');
      try { return JSON.parse(txt.replace(/^```(?:json)?|```$/g, '').trim()); } catch (e) { last = 'json'; continue; } }
    throw N.err('ia', 'A IA não respondeu (' + String(last).slice(0, 80) + ').', 503); }
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 45e3);
  try { const r = await fetch(FREE(), { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ac.signal, body: JSON.stringify({ model: 'openai', private: true, referrer: 'nautilo', temperature: .2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: RULES(l) }, { role: 'user', content: user }] }) });
    const j = await r.json(); const t = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; return JSON.parse(String(t || '{}').replace(/^```(?:json)?|```$/g, '').trim()); }
  catch (e) { throw N.err('ia', 'A IA grátis não respondeu.', 503); } finally { clearTimeout(to); } };
// {0}, {1}… que têm de aparecer na tradução (os colados ao fim de uma palavra podem cair)
const need = s => (s.match(/(^|[^A-Za-zÀ-ÿ])\{\d+\}/g) || []).map(x => x.replace(/^[^{]/, ''));
const valid = (s, t) => typeof t === 'string' && t.trim() !== '' && need(s).every(p => t.includes(p)) && (t.match(/\{\d+\}/g) || []).every(p => s.includes(p)) && t.length < s.length * 4 + 40;

const BUSY = new Map();
module.exports = N.handler(async (req, res) => {
  const q = req.method === 'POST' ? await N.body(req) : (req.query || {}), l = String(q.l || '');
  if (!LANG.test(l) || l === 'pt-PT') return N.send(res, 400, { ok: false, msg: 'Língua desconhecida.' });
  const S = await strings(req);
  if (req.method !== 'POST') {
    if (N.limit(req, 'lingua-get', 60, 60e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos.' });
    const { d } = await load(l), m = {}; let feito = 0; S.all.forEach(s => { if (d.m[s] != null) { m[s] = d.m[s]; feito++; } });
    const completo = feito >= S.all.length;
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', completo ? 'public, max-age=300, s-maxage=3600' : 'no-store');
    return res.end(JSON.stringify({ ok: true, l, v: S.v, completo, total: S.all.length, feito, m })); }
  if (q.op !== 'preparar') return N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' });
  const t = await N.readToken(req); if (!t) return N.send(res, 401, { ok: false, msg: 'Entra numa conta para preparar uma língua nova.' });
  if (N.limit(req, 'lingua|' + t.u, 40, 60e3)) return N.send(res, 429, { ok: false, msg: 'Devagar: tenta daqui a um minuto.' });
  // um lote de cada vez por língua (nesta instância)
  if (BUSY.get(l) && Date.now() - BUSY.get(l) < 50e3) { const { d } = await load(l), feito = S.all.filter(s => d.m[s] != null).length; return N.send(res, 200, { ok: true, ocupado: true, total: S.all.length, feito, completo: feito >= S.all.length }); }
  BUSY.set(l, Date.now());
  try {
    let { d } = await load(l); const miss = S.all.filter(s => d.m[s] == null), batch = []; let c = 0;
    for (const s of miss) { if (batch.length >= BATCH_N || (c + s.length > BATCH_C && batch.length)) break; batch.push(s); c += s.length; }
    if (!batch.length) return N.send(res, 200, { ok: true, total: S.all.length, feito: S.all.length, completo: true });
    const out = await ask(l, batch), got = {};
    batch.forEach((s, i) => { const tr = out[i] != null ? out[i] : out[String(i)]; if (valid(s, tr)) got[s] = tr; });
    // grava junto com o que outros já gravaram entretanto (até 5 tentativas)
    for (let i = 0; i < 5; i++) { const cur = await load(l); cur.d.m = Object.assign(cur.d.m, got);
      batch.forEach(s => { if (got[s] == null) { cur.d.f[s] = (cur.d.f[s] || 0) + 1; if (cur.d.f[s] >= 3) cur.d.m[s] = s; } });   // 3 falhas: fica como está, para não travar
      try { await N.store().put(KEY(l), Buffer.from(JSON.stringify(cur.d)), cur.etag ? { ifMatch: cur.etag } : { overwrite: false }); d = cur.d; break; }
      catch (e) { if (e.code !== 'conflict' && e.code !== 'exists') throw e; await N.sleep(150 + Math.random() * 300); } }
    const feito = S.all.filter(s => d.m[s] != null).length;
    N.send(res, 200, { ok: true, total: S.all.length, feito, completo: feito >= S.all.length, lote: batch.length, novos: Object.keys(got).length });
  } finally { BUSY.delete(l); } });
