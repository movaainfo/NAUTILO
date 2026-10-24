// PRUMO · IA para todas as contas (função do Vercel), sem ninguém configurar nada.
// A app fala com a IA no formato do Google Gemini; numa conta, em vez da chave de cada pessoa, os pedidos vêm para aqui:
//   - se o projeto tiver GEMINI_API_KEY (posta pelo dono no Vercel), seguem para o Google (texto, fotos e voz);
//   - senão, o texto segue para a IA grátis da Pollinations (modelo aberto) e a resposta volta no formato do Gemini.
// Só para quem tem sessão numa conta; limite por pessoa para ninguém gastar a cota de todos.
'use strict';
const N = require('./_nuvem');
const G = 'https://generativelanguage.googleapis.com/';
const FREE = () => process.env.NAUTILO_IA_LIVRE || 'https://text.pollinations.ai/openai';
const gkey = () => String(process.env.GEMINI_API_KEY || '').trim();
const OKP = /^v1beta\/models(\?[A-Za-z0-9=&_.-]*)?$|^v1beta\/models\/[A-Za-z0-9._-]{3,80}:(generateContent|countTokens)$/;
const POR_MIN = 30, POR_DIA = +(process.env.NAUTILO_IA_DIA || 400);
const SEEN = new Map(), DAY = new Map();
const okSession = async req => { const t = await N.readToken(req); if (!t) return null; const c = SEEN.get(t.a);
  if (c && Date.now() - c.at < 60e3) return c.ok ? t : null;
  let ok = false; try { const g = await N.store().get('a/' + t.a); if (g) { const r = N.open(await N.accKey(), g.buf); ok = r.uid === t.u && (r.tv || 1) === t.v; } } catch (e) { }
  SEEN.set(t.a, { ok, at: Date.now() }); if (SEEN.size > 5000) SEEN.delete(SEEN.keys().next().value); return ok ? t : null; };
const perDay = uid => { const d = new Date().toISOString().slice(0, 10), k = uid + '|' + d, n = (DAY.get(k) || 0) + 1; DAY.set(k, n); if (DAY.size > 20000) DAY.delete(DAY.keys().next().value); return n > POR_DIA; };
const gErr = (res, status, message) => N.send(res, status, { error: { code: status, message, status: status === 429 ? 'RESOURCE_EXHAUSTED' : 'FAILED_PRECONDITION' } });
// Gemini → OpenAI (só texto) e a resposta de volta ao formato Gemini
const toChat = b => { const msgs = [], txt = parts => (parts || []).map(p => p.text || '').filter(Boolean).join('\n');
  if (b.systemInstruction) msgs.push({ role: 'system', content: txt(b.systemInstruction.parts) });
  (b.contents || []).forEach(c => { const t = txt(c.parts); if (t) msgs.push({ role: c.role === 'model' ? 'assistant' : 'user', content: t }); });
  return msgs; };
const hasMedia = b => (b.contents || []).some(c => (c.parts || []).some(p => p.inline_data || p.inlineData || p.file_data || p.fileData)) || /AUDIO|IMAGE/i.test(JSON.stringify((b.generationConfig || {}).responseModalities || ''));
const free = async b => { const gc = b.generationConfig || {}, json = /json/i.test(gc.responseMimeType || ''), ac = new AbortController(), to = setTimeout(() => ac.abort(), 50e3);
  try { const r = await fetch(FREE(), { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ac.signal,
      body: JSON.stringify(Object.assign({ model: 'openai', messages: toChat(b), temperature: gc.temperature == null ? .3 : gc.temperature, private: true, referrer: 'nautilo' }, json ? { response_format: { type: 'json_object' } } : {})) });
    const j = await r.json().catch(() => ({})); const m = j.choices && j.choices[0] && j.choices[0].message;
    if (!r.ok || !m) return { status: r.status === 429 ? 429 : 502, body: { error: { code: r.status, message: 'A IA grátis não respondeu agora. Tenta daqui a um minuto.' } } };
    return { status: 200, body: { candidates: [{ content: { role: 'model', parts: [{ text: String(m.content || '') }] }, finishReason: 'STOP' }], modelVersion: 'nautilo-livre' } }; }
  catch (e) { return { status: 504, body: { error: { code: 504, message: 'A IA grátis demorou demasiado. Tenta outra vez.' } } }; } finally { clearTimeout(to); } };

module.exports = N.handler(async (req, res) => {
  const q = req.query || {}, p = String(q.p || '');
  if (p === 'estado') return N.send(res, 200, { ok: true, google: !!gkey() });
  const t = await okSession(req); if (!t) return gErr(res, 401, 'A sessão terminou. Entra outra vez na conta.');
  if (!OKP.test(p)) return gErr(res, 400, 'Pedido de IA desconhecido.');
  if (N.limit(req, 'ia|' + t.u, POR_MIN, 60e3) || perDay(t.u)) return gErr(res, 429, 'Limite de IA por minuto/dia atingido (quota per day). Tenta daqui a pouco.');
  const k = gkey();
  if (/^v1beta\/models(\?|$)/.test(p)) { if (!k) return N.send(res, 200, { models: [{ name: 'models/gemini-nautilo-livre', supportedGenerationMethods: ['generateContent'] }] });
    const r = await fetch(G + p + (p.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(k)); res.statusCode = r.status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(await r.text()); }
  if (req.method !== 'POST') return gErr(res, 405, 'Só POST.');
  const b = await N.body(req);
  if (k) { const r = await fetch(G + p + '?key=' + encodeURIComponent(k), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
    // modelo sobrecarregado no Google (503): a app trata como limite e passa ao modelo seguinte durante 1 minuto
    if (r.status === 503) return gErr(res, 429, 'Modelo sobrecarregado no Google agora (temporário).');
    res.statusCode = r.status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(await r.text()); }
  if (hasMedia(b)) return gErr(res, 400, 'Ler fotos, PDFs e voz precisa da IA do Google. Liga a tua chave grátis em Definições › Spyke › Cérebro.');
  if (/countTokens$/.test(p)) return N.send(res, 200, { totalTokens: JSON.stringify(b).length / 4 | 0 });
  const o = await free(b); N.send(res, o.status, o.body);
});
