/* NÁUTILO — Ouvido do Spyke (silencioso).
   O ditado do iPhone (reconhecimento de voz do Safari) toca um som sempre que liga e desliga — ao entrar e ao sair da app.
   Este ouvido não usa o ditado: abre o microfone uma vez (sem som nenhum), percebe sozinho quando começas e acabas de falar
   (espera uma pausa a sério antes de responder, e guarda o meio segundo antes de começares para não cortar a 1.ª palavra)
   e transcreve a frase inteira com a IA (Microsoft, se tiveres a chave; senão Google Gemini, grátis com a tua chave).
   Enquanto o Spyke fala continua a ouvir: se falares por cima, ele pára logo para te ouvir. */
(() => {
'use strict';
const U = OS.U;
const E = OS.Ear = { on: false, speaking: false, level: 0, floor: .004, playing: false, hang: 1150, n: 0 };
const AC = window.AudioContext || window.webkitAudioContext;
let MS = null, CTX = null, SRC = null, PROC = null, PRE = [], preMs = 0, SEG = null, voiceAt = 0, above = 0, rate = 48000, cb = {};
const PREMS = 500, MINVOICE = 300, MAXMS = 30000;
E.supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && AC);
const live = () => !!(MS && MS.getAudioTracks().some(t => t.readyState === 'live'));
// o mesmo microfone fica aberto enquanto a app está aberta (fechar e reabrir faria o iPhone perguntar outra vez)
const getMic = async () => { if (live()) return MS; MS = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }); return MS; };
E.start = async (o = {}) => { cb = o; if (E.on) return true; E.on = true;
  try { const ms = await getMic(); if (!E.on) return false; if (!CTX || CTX.state === 'closed') CTX = new AC(); if (CTX.state !== 'running') { try { await Promise.race([CTX.resume(), new Promise(r => setTimeout(r, 900))]); } catch (e) { } }
    rate = CTX.sampleRate || 48000; SRC = CTX.createMediaStreamSource(ms); PROC = CTX.createScriptProcessor(2048, 1, 1); PROC.onaudioprocess = frame; SRC.connect(PROC); PROC.connect(CTX.destination); return true; }
  catch (e) { E.on = false; cb.onErr && cb.onErr(e); return false; } };
// parar: desliga o processamento; o microfone em si só fecha com stop(true) (ao sair da app não toca som nenhum)
E.stop = hard => { E.on = false; E.speaking = false; SEG = null; PRE = []; preMs = 0; above = 0; try { PROC && (PROC.onaudioprocess = null, PROC.disconnect()); } catch (e) { } try { SRC && SRC.disconnect(); } catch (e) { } PROC = SRC = null;
  if (hard && MS) { try { MS.getTracks().forEach(t => t.stop()); } catch (e) { } MS = null; } };
E.abort = () => E.stop();
// o iPhone pode suspender o som até um toque: ao primeiro toque, volta a ligar
['touchend', 'click'].forEach(ev => document.addEventListener(ev, () => { if (E.on && CTX && CTX.state !== 'running') CTX.resume().catch(() => { }); }, { capture: true, passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden && E.on && CTX && CTX.state !== 'running') CTX.resume().catch(() => { }); });
E.stream = () => live() ? MS : null;
const rmsPk = x => { let s = 0, pk = 0; for (let i = 0; i < x.length; i++) { const v = x[i]; s += v * v; const a = v < 0 ? -v : v; if (a > pk) pk = a; } return [Math.sqrt(s / x.length), pk]; };
function frame(ev) { if (!E.on) return; const x = new Float32Array(ev.inputBuffer.getChannelData(0)), ms = x.length / rate * 1000, now = performance.now(), [r, pk] = rmsPk(x); E.level = r;
  if (cb.onPeak) { try { cb.onPeak(pk, now); } catch (e) { } }
  // limiares: acima do ruído de fundo (que se vai ajustando); enquanto o Spyke fala, mais alto e mais tempo (para não se interromper com a própria voz)
  const startT = Math.max(E.floor * (E.playing ? 5 : 3.2), E.playing ? .03 : .011), keepT = startT * .5;
  if (!SEG) { PRE.push(x); preMs += ms; while (preMs > PREMS && PRE.length > 1) { preMs -= PRE.shift().length / rate * 1000; }
    if (r > startT) above += ms; else { above = Math.max(0, above - ms * 1.5); E.floor = Math.min(.05, Math.max(.0015, E.floor * .97 + r * .03)); }
    if (above >= (E.playing ? 320 : 140)) { SEG = { ch: PRE.slice(), t0: now, voiced: above }; PRE = []; preMs = 0; voiceAt = now; E.speaking = true; if (cb.onStart) { try { cb.onStart(); } catch (e) { } } }
    return; }
  SEG.ch.push(x); if (r > keepT) { voiceAt = now; SEG.voiced += ms; }
  if (now - voiceAt > (+E.hang || 1150) || now - SEG.t0 > MAXMS) finish(); }
function finish() { const s = SEG; SEG = null; E.speaking = false; above = 0; if (!s) return;
  if (s.voiced < MINVOICE) { if (cb.onDrop) { try { cb.onDrop(); } catch (e) { } } return; }
  let n = 0; s.ch.forEach(c => { n += c.length; }); const pcm = new Float32Array(n); let o = 0; s.ch.forEach(c => { pcm.set(c, o); o += c.length; });
  const keep = Math.min(pcm.length, Math.round(pcm.length - Math.max(0, (+E.hang || 1150) - 350) / 1000 * rate)); // tira o silêncio do fim
  E.n++; const u = { b64: wav16(pcm.subarray(0, Math.max(keep, Math.round(rate * .3))), rate), ms: Math.round(keep / rate * 1000), voiced: Math.round(s.voiced) };
  if (cb.onUtt) { try { cb.onUtt(u); } catch (e) { } } }
// áudio para a transcrição: mono, 16 kHz, 16 bits (WAV em base64)
const wav16 = (pcm, sr) => { const out = 16000, k = sr / out, n = Math.floor(pcm.length / k), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (p, s) => { for (let i = 0; i < s.length; i++) v.setUint8(p + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, out, true); v.setUint32(28, out * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const a = i * k, j = Math.floor(a), f = a - j, s = (pcm[j] || 0) * (1 - f) + (pcm[j + 1] || 0) * f, c = Math.max(-1, Math.min(1, s)); v.setInt16(44 + i * 2, c < 0 ? c * 32768 : c * 32767, true); }
  const u8 = new Uint8Array(b); let bin = ''; for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(bin); };
E._wav16 = wav16;

/* ---------- transcrição ---------- */
const cfg = () => Object.assign({}, OS.ONE_DEF.spyke || {}, OS.one('spyke'));
const clean = t => { const s = String(t || '').replace(/^["“'\s]+|["”'\s]+$/g, '').replace(/\s+/g, ' ').trim(); return /^[-–—.\s]*$|^\[?(vazio|silêncio|silencio|sem fala|inaudível|inaudivel)\]?\.?$/i.test(s) ? '' : s; };
const azure = async (b64, lang) => { const c = cfg(), bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const r = await fetch(`https://${encodeURIComponent((c.azRegion || 'westeurope').trim().toLowerCase())}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${lang}&format=simple`, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': c.azKey.trim(), 'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', Accept: 'application/json' }, body: u8 });
  if (!r.ok) throw new Error('Microsoft ' + r.status); const j = await r.json().catch(() => ({})); return j.RecognitionStatus && j.RecognitionStatus !== 'Success' ? '' : clean(j.DisplayText); };
// sem dizer à IA o nome do assistente: quando o sabia, "ouvia-o" em frases normais ("isso aí que…" virava "Spyke")
const PROMPT = lang => `Transcreve exatamente o que a pessoa diz neste áudio (${lang === 'pt-PT' ? 'português de Portugal' : 'português do Brasil'}), palavra por palavra. Não completes, não corrijas e não inventes palavras. Responde só com as palavras ditas, sem aspas nem comentários. Se não houver fala percetível (só ruído, música ou palavras impercetíveis), responde só: -`;
const gemini = async (b64, lang) => { const key = OS.AI && OS.AI.key(); if (!key) throw new Error('sem chave da IA'); try { await OS.AI.discover(); } catch (e) { }
  // os modelos "lite" respondem mais depressa (a transcrição é simples)
  const L = (OS.AI.gemini ? OS.AI.gemini() : []).slice().sort((a, b) => (/lite/.test(b) - /lite/.test(a))); let last = '';
  for (const m of (L.length ? L : ['gemini-flash-lite-latest', 'gemini-flash-latest']).slice(0, 5)) {
    let r, j; try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ inline_data: { mime_type: 'audio/wav', data: b64 } }, { text: PROMPT(lang) }] }], generationConfig: { temperature: 0, maxOutputTokens: 400 } }) }); j = await r.json().catch(() => ({})); }
    catch (e) { last = 'sem internet'; continue; }
    if (!r.ok) { const msg = (j.error && j.error.message) || 'erro ' + r.status; last = msg; if (r.status === 429 && OS.AI.markLimit) OS.AI.markLimit(m, msg); if (OS.AI.isDead && OS.AI.isDead(r.status, msg)) OS.AI.markDead(m); continue; }
    const c = (j.candidates || [])[0] || {}; return clean(((c.content || {}).parts || []).map(p => p.text || '').join('')); }
  throw new Error('não consegui transcrever (' + String(last).slice(0, 80) + ')'); };
E.engine = () => cfg().azKey && cfg().azKey.trim() ? 'Microsoft' : OS.AI && OS.AI.key() ? 'Google' : '';
E.can = () => E.supported() && !!E.engine();
E.stt = async b64 => { const lang = cfg().accent === 'PT' ? 'pt-PT' : 'pt-BR';
  if (cfg().azKey && cfg().azKey.trim()) { try { return await azure(b64, lang); } catch (e) { if (!(OS.AI && OS.AI.key())) throw e; } }
  return gemini(b64, lang); };
})();
