/* NÁUTILO — Spyke: assistente de voz (estilo J.A.R.V.I.S.), voz masculina.
   Com a app aberta: toca no microfone, diz "Spyke…" (palavra de ativação) ou bate duas palmas.
   Com a app fechada (limite do iPhone: uma app web não pode ouvir em segundo plano): Atalhos da Siri + "Atalhos vocais" do iOS
   chamam o teu script Google, que devolve o resumo do dia (o Náutilo envia-o sempre que está aberto) ou responde com a IA.
   Voz: Gemini TTS (voz masculina, ex.: Charon) com a tua chave; sem chave, a voz do sistema (masculina se existir). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc;
const VOICES = [['Charon', 'Charon · informativo, grave'], ['Orus', 'Orus · firme'], ['Iapetus', 'Iapetus · claro'], ['Algenib', 'Algenib · rouco'], ['Alnilam', 'Alnilam · decidido'], ['Sadaltager', 'Sadaltager · sabedor'], ['Fenrir', 'Fenrir · enérgico'], ['Puck', 'Puck · animado'], ['Umbriel', 'Umbriel · descontraído']];
OS.ONE_DEF.spyke = { brain: 'gemini', anKey: '', anModel: 'claude-opus-5-5', always: true, convWin: -1, azKey: '', azRegion: 'westeurope', azVoice: 'pt-BR-AntonioNeural', cont: true, barge: false, alerts: true, newsBrief: true, jarvisStart: true, eng: 'auto', elKey: '', elVoice: '', elModel: 'eleven_multilingual_v2', voice: 'Charon', accent: 'BR', speed: 1, ai: true, wake: false, clap: false, sens: 5, morning: true, siri: true, siriAsk: false, ear: 'auto', pausa: 1.2, bargeS: true, alertVoz: false };
const cfg = () => Object.assign({}, OS.ONE_DEF.spyke, OS.one('spyke'));
// vozes masculinas do ElevenLabs (as tuas próprias vozes aparecem quando carregas a lista)
const EL = [['onwK4e9ZLuTAKqWW03F9', 'Daniel · grave e elegante (estilo Jarvis)'], ['pNInz6obpgDQGcFmaJgB', 'Adam · grave e firme'], ['nPczCjzI2devNBz1zQrb', 'Brian · grave e calmo'], ['JBFqnCBsd6RMkjVDRZzb', 'George · quente'], ['N2lVS1w4EtoT3dr4eOWO', 'Callum · rouco']];
const S = OS.Spyke = {};
OS.S.spymem = { label: 'Memória do Spyke', title: r => String(r.text || '').slice(0, 60), fields: [{ k: 'text', l: 'O que o Spyke sabe', t: 'area', req: 1, rows: 3 }, { k: 'date', l: 'Desde', t: 'date' }] , defaults: () => ({ date: U.today(), src: 'manual' }) };
OS.S.spyroutines = { label: 'Rotina de voz', title: r => r.phrase || 'Rotina', fields: [{ k: 'phrase', l: 'Quando eu disser', t: 'text', req: 1, ph: 'ex.: modo leitura' }, { k: 'steps', l: 'O Spyke faz (um comando por linha)', t: 'area', rows: 5, req: 1, ph: 'abre as Leituras\nclima\nnotícias' }, { k: 'reply', l: 'E diz no fim (opcional)', t: 'text' }] };
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s€.,:%-]/g, ' ').replace(/\s+/g, ' ').trim();
// o nome dele como o ditado do iPhone o escreve: Spyke, Spike, Spaik, Espaique, Spike's, Speak…
const WAKE_L = /\b(e?sp[aeiy]{1,2}[ck]+[eiy]?s?|spike|spyke|spaik\w*|e?spa[iy]\w*|espi[ck]\w*|speak|spy)\b/;
// com o ouvido silencioso a transcrição escreve o que ouviu (Spike, Spyke, Spaik, Espaique…): só essas formas contam, nada de palavras parecidas
const WAKE_S = /\b(e?spaik\w*|e?spaiq\w*|e?spaic\w*|e?spyk\w*|e?spikes?|e?spaiky?)\b/;
let WAKE = WAKE_L, WAKET = new RegExp('^' + WAKE.source.replace(/\\b/g, '') + '$');
const wakeMode = strict => { const r = strict ? WAKE_S : WAKE_L; if (r !== WAKE) { WAKE = r; WAKET = new RegExp('^' + r.source.replace(/\\b/g, '') + '$'); } };
S._wakeMode = wakeMode; S._isWake = t => WAKE.test(N(t));
const FILLW = new Set(['ei', 'hey', 'oi', 'ola', 'ok', 'okay', 'e', 'ai', 'eai', 'fala', 'o', 'ah', 'eh']);
// tira o nome (e o "ei", "olá", "e aí" logo antes) e devolve o resto, com acentos: "Bom dia, Spike" → "Bom dia"; "Spike" → ""; sem nome → null
const wakeSplit = raw => { const T = String(raw || '').split(/\s+/).filter(Boolean), w = x => N(x).replace(/[^\w]/g, ''), k = T.findIndex(x => WAKET.test(w(x))); if (k < 0) return null;
  let a = k; while (a > 0 && FILLW.has(w(T[a - 1]))) a--; return T.slice(0, a).concat(T.slice(k + 1)).join(' ').replace(/^[\s,.:;!?-]+|[\s,;:-]+$/g, '').trim(); };
// chamar é dizer o nome no início ou no fim da frase ("Spyke, …", "…, Spyke"); o nome perdido a meio de uma conversa (televisão, outras pessoas) não o chama
const vocative = raw => { const T = String(raw || '').split(/\s+/).filter(Boolean), k = T.findIndex(x => WAKET.test(N(x).replace(/[^\w]/g, ''))); return k >= 0 && (k <= 3 || k >= T.length - 3); };
S._vocative = vocative;
const name = () => OS.one('profile').short || 'Ryan';
const eurS = v => { const n = Math.abs(U.num(v)); return (Math.abs(n - Math.round(n)) < .005 ? Math.round(n) : n.toFixed(2).replace('.', ',')) + ' euros'; };
const listS = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];
const dayS = d => U.parse(d).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

/* ================= o que o Spyke sabe (resumo e contexto) ================= */
S.brief = (d = U.today()) => { const t = U.today(), fut = d > t, h = new Date().getHours(), out = [];
  const g = fut || h < 12 ? 'Bom dia' : h < 19 ? 'Boa tarde' : 'Boa noite';
  out.push(`${g}, ${name()}. ${fut ? 'Hoje' : 'Hoje'} é ${dayS(d)}.`);
  try { const wx = OS.Weather && OS.Weather.cached(); if (wx && wx.now) out.push(OS.Weather.say(wx, fut ? 1 : 0).replace(/^Amanhã em/, 'Em')); } catch (e) { }
  try { const it = OS.Cal.items(d, d).filter(x => x.src !== 'task' && !x.done), timed = U.sortBy(it.filter(x => x.start), x => x.start), off = it.find(x => x.src === 'off');
    if (off) out.push('Hoje é dia de folga no trabalho.');
    if (timed.length) out.push(`Na agenda tens ${timed.length === 1 ? 'um compromisso' : timed.length + ' compromissos'}: ${listS(timed.slice(0, 4).map(x => x.title.replace(/^[^\wÀ-ú]+/, '') + ' às ' + x.start))}${timed.length > 4 ? ', e mais ' + (timed.length - 4) : ''}.`);
    else out.push('A agenda está livre de compromissos com hora.'); } catch (e) { }
  try { if (!fut) { const urg = OS.Intel.alerts().filter(a => a.lvl === 'urgent' && a.area !== 'Tarefas').slice(0, 2); if (urg.length) out.push('Atenção: ' + listS(urg.map(a => a.title)) + '.'); } } catch (e) { }
  try { const na = fut ? U.sortBy(OS.Tasks.open().filter(x => (x.due && x.due <= d) || x.sched === d), x => +x.prio || 3).map(x => ({ title: x.title })) : OS.Intel.next().filter(n => !['Hábito', 'E-mail', 'Treino', 'Corrida'].includes(n.kind));
    if (na.length) out.push(`A tua prioridade número um é ${na[0].title}.${na.length > 1 ? ' Depois, ' + listS(na.slice(1, 3).map(n => n.title)) + '.' : ''}`); } catch (e) { }
  try { const hb = OS.all('habits').filter(x => x.active && OS.Hab.due(x, d) && !OS.Hab.done(x, d)); if (hb.length) out.push(`${hb.length === 1 ? 'Tens um hábito' : 'Tens ' + hb.length + ' hábitos'} para cumprir${hb.length > 1 ? ', incluindo ' + listS(hb.slice(0, 2).map(x => x.name)) : ': ' + hb[0].name}.`); } catch (e) { }
  try { if (!fut && OS.Mail) { const m = OS.Mail.speak(); if (m) out.push(m); } } catch (e) { }
  try { const bills = OS.Fin.upcoming(3).filter(x => x.amount < 0 && !x.tx && (x.rec || x.debt) && U.diff(x.date, d) <= 1); if (bills.length) out.push('Nas finanças: ' + listS(bills.slice(0, 2).map(x => `${x.title}, ${eurS(x.amount)}, ${x.late ? 'em atraso' : U.diff(x.date, d) <= 0 ? 'vence hoje' : 'vence amanhã'}`)) + '.'); } catch (e) { }
  try { const ex = U.sortBy(OS.all('assessments').filter(a => a.date >= d && U.diff(a.date, d) <= 7), a => a.date)[0]; if (ex) { const n = U.diff(ex.date, d); out.push(`${ex.type || 'Avaliação'} de ${(OS.get('subjects', ex.subject) || {}).name || ex.title} ${n === 0 ? 'é hoje' : n === 1 ? 'é amanhã' : 'daqui a ' + n + ' dias'}.`); } } catch (e) { }
  try { const sp = OS.one('fit').split[String(U.parse(d).getDay())]; if (sp && sp !== 'Descanso') out.push(`Treino de hoje: ${sp}.`); } catch (e) { }
  try { if (!fut && cfg().newsBrief && S._news && S._news.length) out.push('Nas notícias: ' + S._news.slice(0, 3).join('; ') + '.'); } catch (e) { }
  try { if (OS.Quotes) out.push('E a verdade de hoje: ' + OS.Quotes.truth()); } catch (e) { }
  out.push(fut ? 'Bom dia de trabalho.' : 'Estou aqui se precisares.');
  return out.join(' '); };
S.ctx = () => { const t = U.today(), L = [], add = (k, v) => { if (v) L.push(k + ': ' + v); };
  add('Agora', new Date().toLocaleString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + ' (Portugal)');
  const p = OS.one('profile'); add('Utilizador', [p.name || name(), p.city].filter(Boolean).join(', '));
  try { add('Agenda hoje e amanhã', OS.Cal.items(t, U.addDays(t, 1)).filter(x => x.src !== 'task').slice(0, 14).map(x => (x.date === t ? 'hoje' : 'amanhã') + (x.start ? ' ' + x.start : '') + ' ' + x.title).join('; ')); } catch (e) { }
  try { add('Alertas', OS.Intel.alerts().slice(0, 10).map(a => `${a.area}: ${a.title}${a.detail ? ' (' + a.detail + ')' : ''}`).join('; ')); } catch (e) { }
  try { add('Próximas ações por prioridade', OS.Intel.next().slice(0, 10).map(n => `${n.kind}: ${n.title}${n.why && n.why.length ? ' (' + n.why.slice(0, 2).join(', ') + ')' : ''}`).join('; ')); } catch (e) { }
  try { if (OS.Dom && OS.Dom.summary) add('Dominus (o jogo da vida dele)', OS.Dom.summary()); } catch (e) { }
  try { if (OS.Mundo) { const w = OS.Mundo.stats(); if (w.n || w.w.length) add('Mundo (países)', `conhece ${w.n} de 195 países (${Math.round(w.pct)}% do mundo, ${w.conts} continentes): ${w.v.map(c => c.n).join(', ')}${w.w.length ? '. Quer ir: ' + w.w.map(c => c.n).join(', ') : ''}`); } } catch (e) { }
  try { add('Hábitos por fazer hoje', OS.all('habits').filter(h => h.active && OS.Hab.due(h, t) && !OS.Hab.done(h, t)).map(h => h.name).join(', ')); } catch (e) { }
  try { const F = OS.Fin, m = F.month(U.ym(t)); add('Finanças', `disponível ${U.eur(F.liquid())}; este mês receitas ${U.eur(m.inc)}, despesas ${U.eur(m.exp)}; a pagar em 7 dias: ${F.upcoming(7).filter(x => x.amount < 0 && !x.tx).slice(0, 5).map(x => x.title + ' ' + U.eur(-x.amount) + ' ' + x.date).join(', ') || 'nada'}`); } catch (e) { }
  try { add('Faltas nas aulas', OS.Att ? OS.Att.summary() : ''); } catch (e) { }
  try { add('Universidade', U.sortBy(OS.all('assessments').filter(a => a.date >= t && U.diff(a.date, t) <= 21), a => a.date).map(a => `${a.type} ${a.title} ${a.date}`).join('; ')); } catch (e) { }
  try { add('Trabalho', OS.all('shifts').filter(s => s.date >= t && s.date <= U.addDays(t, 6)).map(s => s.date + ' ' + s.start + '-' + s.end).join('; ') + (OS.all('dayoffs').filter(o => o.date >= t && o.date <= U.addDays(t, 13)).length ? ' · folgas: ' + OS.all('dayoffs').filter(o => o.date >= t && o.date <= U.addDays(t, 13)).map(o => o.date).join(', ') : '')); } catch (e) { }
  try { add('Metas ativas', OS.all('goals').filter(g => g.status === 'Ativa').slice(0, 6).map(g => g.title + ' ' + Math.round(OS.Goal.info(g).p * 100) + '%').join('; ')); } catch (e) { }
  try { add('Treino', 'hoje ' + (OS.one('fit').split[String(new Date().getDay())] || '—')); } catch (e) { }
  try { if (OS.Mail) add('E-mails importantes', OS.Mail.ctx().replace(/\n/g, '; ')); } catch (e) { }
  try { const wx = OS.Weather && OS.Weather.cached(); if (wx && wx.now) add('Clima', OS.Weather.say(wx, 0) + ' ' + OS.Weather.say(wx, 1)); } catch (e) { }
  try { add('Decisões em análise', OS.all('decisions').filter(d => d.status === 'Em análise').slice(0, 4).map(d => d.title + ' (' + (d.alts || []).map(a => a.name).filter(Boolean).join(' vs ') + ')' + (d.ai && d.ai.r && d.ai.r.inclinacao && d.ai.r.inclinacao.nome ? ' — a análise aponta para ' + d.ai.r.inclinacao.nome : '')).join('; ')); } catch (e) { }
  try { const I = OS.Inv; add('Património e investimentos', `património líquido ${U.eur(OS.Fin.netWorth(), { dec: 0 })}; carteira ${U.eur(I.value(), { dec: 0 })} (investido ${U.eur(I.cost(), { dec: 0 })}); proventos nos últimos 12 meses ${U.eur(I.divs(U.addDays(t, -365), t), { dec: 0 })}`); } catch (e) { }
  try { const S = OS.all('shifts').filter(s => U.ym(s.date) === U.ym(t)); if (S.length) add('Horas de trabalho este mês', `${U.nf(U.sum(S, s => OS.Car.workedHours(s)), 1)} h trabalhadas de ${U.nf(U.sum(S, OS.Car.shiftHours), 1)} h marcadas`); } catch (e) { }
  try { const wk = U.monday(t), h = U.sum(OS.all('sessions').filter(s => s.date >= wk), s => s.minutes) / 60, tg = OS.St.targetWeek(); add('Estudo esta semana', U.nf(h, 1) + ' h' + (tg ? ' de ' + tg + ' h' : '') + (OS.St.gpa() ? ' · média ' + OS.St.gpa() : '')); } catch (e) { }
  try { add('Projetos ativos', OS.all('projects').filter(p => !['Concluído', 'Cancelado'].includes(p.status)).slice(0, 6).map(p => p.name + ' ' + Math.round(OS.Proj.info(p).prog * 100) + '%').join('; ')); } catch (e) { }
  try { add('Desporto (últimas práticas)', U.sortBy(OS.all('sportlog'), x => x.date).slice(-4).map(x => x.date + ' ' + ((OS.get('sports', x.sport) || {}).name || '') + ' ' + (x.kind || '') + (x.mins ? ' ' + x.mins + ' min' : '') + (x.res ? ' ' + x.res : '')).join('; ')); } catch (e) { }
  try { if (OS.Diet && OS.Diet.day) { const d = OS.Diet.day(t), o = OS.one('diet'); if (d.n || o.kcal) add('Dieta hoje', `${Math.round(d.kcal)}${o.kcal ? ' de ' + o.kcal : ''} kcal, ${Math.round(d.p)}${o.p ? ' de ' + o.p : ''} g de proteína`); } } catch (e) { }
  try { const T = OS.all('trees').filter(x => x.date >= U.addDays(t, -6) && x.alive !== false); if (T.length) add('Foco (Floresta, 7 dias)', U.nf(U.sum(T, x => U.num(x.mins)) / 60, 1) + ' h'); } catch (e) { }
  try { const dv = OS.all('devos'); if (dv.length) add('Fé', 'devocionais nos últimos 30 dias: ' + dv.filter(x => x.date >= U.addDays(t, -29)).length + (dv.some(x => x.date === t) ? ' (já fez o de hoje)' : '')); } catch (e) { }
  try { add('A ler', OS.all('books').filter(b => b.status === 'A ler').map(b => b.title + (b.curPage && b.pages ? ' (' + b.curPage + '/' + b.pages + ')' : '')).join('; ')); } catch (e) { }
  try { add('Tendências recentes', OS.Intel.insights().slice(0, 5).map(x => x.text).join(' ')); } catch (e) { }
  try { add('Pessoas da vida dele', OS.all('people').slice(0, 30).map(x => x.name + (x.rel ? ' (' + x.rel + ')' : '') + (x.birthday ? ' faz anos a ' + x.birthday.slice(8, 10) + '/' + x.birthday.slice(5, 7) : '')).join('; ')); } catch (e) { }
  try { add('Memória (coisas que ele te contou)', U.sortBy(OS.all('spymem'), m => m.date || '').reverse().slice(0, 60).map(m => m.text).join(' | ')); } catch (e) { }
  return L.join('\n').slice(0, 9500); };

/* ================= voz ================= */
let AC = null, tok = 0, engine = '';
const ac = () => { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); } return AC; };
/* Som no iPhone:
   - o Web Audio fica mudo com o botão de silêncio ligado; um elemento <audio> toca sempre (como música/vídeo);
   - o <audio> e a voz do aparelho só tocam depois de serem "destravados" num toque do utilizador;
   - depois de usar o microfone o iOS manda o som para o altifalante de chamadas: pedimos o modo "playback" antes de falar. */
const SIL = () => wav({ b64: btoa(String.fromCharCode(0).repeat(1600)), rate: 8000 });
let AU = null, unlocked = false, playing = null;
const au = () => { if (!AU) { AU = document.createElement('audio'); AU.setAttribute('playsinline', ''); AU.setAttribute('webkit-playsinline', ''); AU.preload = 'auto'; document.body.appendChild(AU); } return AU; };
const session = t => { try { if (navigator.audioSession) navigator.audioSession.type = t; } catch (e) { } };
const unlock = () => { if (unlocked) return; unlocked = true; outSession();
  try { const a = au(); a.muted = false; a.src = SIL(); const p = a.play(); p && p.catch(() => { unlocked = false; }); } catch (e) { unlocked = false; }
  try { if (window.speechSynthesis && !S._ssOk) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); S._ssOk = 1; } } catch (e) { }
  try { const c = ac(); c && c.state !== 'running' && c.resume().catch(() => { }); } catch (e) { } };
['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
/* ---------- motores de voz: ElevenLabs (mais humana) → Gemini (IA, grátis com a tua chave) → voz do aparelho ---------- */
const TTS = ['gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-tts', 'gemini-2.5-pro-preview-tts'];
const cache = new Map(); const remember = (k, v) => { cache.set(k, v); if (cache.size > 24) { const [ok, ov] = cache.entries().next().value; cache.delete(ok); try { URL.revokeObjectURL(ov.url); } catch (e) { } } return v; };
// envelope de volume (para a esfera mexer ao ritmo da voz)
const envPCM = (bin, rate) => { const step = Math.round(rate * .04), n = bin.length >> 1, out = []; let mx = 1e-6;
  for (let i = 0; i < n; i += step) { let s = 0, c = 0; for (let j = i; j < Math.min(n, i + step); j += 4) { let v = bin.charCodeAt(2 * j) | (bin.charCodeAt(2 * j + 1) << 8); if (v >= 32768) v -= 65536; s += v * v; c++; } const r = Math.sqrt(s / Math.max(1, c)); out.push(r); if (r > mx) mx = r; }
  return out.map(x => Math.min(1, x / mx)); };
const envBuf = async ab => { try { const C = window.OfflineAudioContext || window.webkitOfflineAudioContext; const d = await new C(1, 1, 44100).decodeAudioData(ab.slice(0)), ch = d.getChannelData(0), step = Math.round(d.sampleRate * .04), out = []; let mx = 1e-6;
  for (let i = 0; i < ch.length; i += step) { let s = 0, c = 0; for (let j = i; j < Math.min(ch.length, i + step); j += 8) { s += ch[j] * ch[j]; c++; } const r = Math.sqrt(s / Math.max(1, c)); out.push(r); if (r > mx) mx = r; } return out.map(x => Math.min(1, x / mx)); } catch (e) { return null; } };
const wav = ({ b64, rate }) => { const bin = atob(b64), n = bin.length, buf = new ArrayBuffer(44 + n), v = new DataView(buf), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n, true);
  const u8 = new Uint8Array(buf, 44); for (let i = 0; i < n; i++) u8[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })); };
const ttsModels = async key => { const c = U.ls.get('os2ttsl', null); if (c && Date.now() - c.at < 864e5 && c.k === key.slice(-6)) return c.m; try { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(key)}`), j = await r.json(); const m = (j.models || []).filter(x => /tts/i.test(x.name) && (x.supportedGenerationMethods || ['generateContent']).includes('generateContent')).map(x => x.name.replace(/^models\//, '')).sort((a, b) => (/flash/.test(b) - /flash/.test(a)) || (/preview/.test(a) - /preview/.test(b)) || (b > a ? 1 : -1)); U.ls.set('os2ttsl', { at: Date.now(), m, k: key.slice(-6) }); return m; } catch (e) { return []; } };
// A língua vai na configuração da voz (languageCode), não no texto: antes as instruções iam escritas no pedido e o modelo às vezes
// lia-as em voz alta ("fala sempre em português…") antes do resumo. Agora o pedido leva SÓ o texto a dizer.
const TTSTO = 40000; let noLang = U.ls.get('os2ttsnl', 0);
const gemClip = async text => { const key = OS.AI && OS.AI.key(); if (!key) throw new Error('sem chave da IA'); const c = cfg(), ck = 'g' + c.voice + c.accent + text; if (cache.has(ck)) return cache.get(ck);
  const lang = c.accent === 'PT' ? 'pt-PT' : 'pt-BR';
  const best = U.ls.get('os2ttsm', ''), found = await ttsModels(key), all = found.concat(TTS.filter(m => !found.includes(m))), list = best ? [best].concat(all.filter(m => m !== best)) : all; let last = '';
  const call = async (m, withLang) => { const ctl = window.AbortController ? new AbortController() : null, to = ctl ? setTimeout(() => ctl.abort(), TTSTO) : 0;
    try { return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
      body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: Object.assign({ voiceConfig: { prebuiltVoiceConfig: { voiceName: c.voice } } }, withLang ? { languageCode: lang } : {}) } }) }); }
    finally { clearTimeout(to); } };
  for (const m of list) { if (OS.AI.blocked && OS.AI.blocked(m)) continue; let r, j;
    try { r = await call(m, !noLang); j = await r.json().catch(() => ({}));
      // modelo que não aceita a língua na configuração: volta a pedir sem ela (e lembra-se)
      if (!r.ok && r.status === 400 && /language/i.test((j.error && j.error.message) || '')) { noLang = 1; U.ls.set('os2ttsnl', 1); r = await call(m, false); j = await r.json().catch(() => ({})); } }
    catch (e) { last = e && e.name === 'AbortError' ? 'demorou demasiado' : 'sem internet'; continue; }
    if (!r.ok) { const msg = (j.error && j.error.message) || ('erro ' + r.status); last = msg; if (/API key/i.test(msg)) throw new Error('a chave da IA não é válida'); if (r.status === 429) { if (OS.AI.markLimit) OS.AI.markLimit(m, msg); last = 'cota grátis de voz gasta'; continue; } continue; }
    const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [], d = parts.map(p => p.inlineData || p.inline_data).find(Boolean); if (!d || !d.data) { last = 'sem áudio'; continue; }
    if (best !== m) U.ls.set('os2ttsm', m);
    const rate = +(((d.mimeType || d.mime_type || '').match(/rate=(\d+)/) || [0, 24000])[1]), bin = atob(d.data);
    return remember(ck, { url: wav({ b64: d.data, rate }), env: envPCM(bin, rate), eng: 'IA Gemini · ' + c.voice }); }
  throw new Error('voz da IA indisponível (' + last.slice(0, 110) + ')'); };
/* Microsoft Azure (voz neural oficial): grátis até 500 mil caracteres por mês (~8 a 9 horas de fala). Sempre em português (SSML com a língua fixa). */
const AZV = [['pt-BR-AntonioNeural', 'Antônio · grave e natural (Brasil)'], ['pt-BR-MacerioMultilingualNeural', 'Macério · muito natural (Brasil)'], ['pt-BR-JulioNeural', 'Júlio · jovem (Brasil)'], ['pt-BR-HumbertoNeural', 'Humberto · maduro (Brasil)'], ['pt-BR-FabioNeural', 'Fábio · calmo (Brasil)'], ['pt-BR-DonatoNeural', 'Donato · firme (Brasil)'], ['pt-BR-ValerioNeural', 'Valério · sério (Brasil)'], ['pt-BR-NicolauNeural', 'Nicolau · leve (Brasil)'], ['pt-PT-DuarteNeural', 'Duarte · Portugal']];
const xmlEsc = t => String(t).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
const azClip = async text => { const c = cfg(); if (!c.azKey) throw new Error('falta a chave da Microsoft'); const v = c.azVoice || AZV[0][0], lang = v.slice(0, 5), ck = 'a' + v + c.speed + text; if (cache.has(ck)) return cache.get(ck);
  const rate = Math.round(((+c.speed || 1) - 1) * 100), ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'><voice name='${v}'><lang xml:lang='${lang}'><prosody rate='${rate >= 0 ? '+' : ''}${rate}%'>${xmlEsc(text)}</prosody></lang></voice></speak>`;
  let r; try { r = await fetch(`https://${encodeURIComponent((c.azRegion || 'westeurope').trim().toLowerCase())}.tts.speech.microsoft.com/cognitiveservices/v1`, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': c.azKey.trim(), 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3' }, body: ssml }); } catch (e) { throw new Error('Microsoft sem internet ou região errada'); }
  if (!r.ok) throw new Error('Microsoft: ' + (r.status === 401 ? 'chave inválida (ou de outra região)' : r.status === 429 || r.status === 403 ? 'acabou a cota grátis deste mês' : r.status === 400 ? 'voz não disponível nesta região' : 'erro ' + r.status));
  const ab = await r.arrayBuffer(), env = await envBuf(ab), nm = (AZV.find(x => x[0] === v) || [0, v])[1];
  return remember(ck, { url: URL.createObjectURL(new Blob([ab], { type: 'audio/mpeg' })), env, eng: 'Microsoft · ' + String(nm).split(' ·')[0] }); };
const elClip = async text => { const c = cfg(); if (!c.elKey) throw new Error('falta a chave do ElevenLabs'); const vid = c.elVoice || EL[0][0], ck = 'e' + vid + c.elModel + text; if (cache.has(ck)) return cache.get(ck);
  let r; try { r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vid)}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': c.elKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(Object.assign({ text, model_id: c.elModel || 'eleven_multilingual_v2', voice_settings: { stability: .45, similarity_boost: .8, style: .25, use_speaker_boost: true } }, /v2_5|flash|turbo/.test(c.elModel || '') ? { language_code: 'pt' } : {})) }); } catch (e) { throw new Error('ElevenLabs sem internet'); }
  if (!r.ok) { let m = ''; try { const j = await r.json(); m = (j.detail && (j.detail.message || j.detail.status)) || ''; } catch (e) { } throw new Error('ElevenLabs: ' + (r.status === 401 ? 'chave inválida' : r.status === 404 ? 'voz não encontrada' : /quota|credits/i.test(m) ? 'acabaram os créditos do mês' : m || 'erro ' + r.status)); }
  const ab = await r.arrayBuffer(), env = await envBuf(ab), name = ((S.elVoices || []).find(v => v[0] === vid) || EL.find(v => v[0] === vid) || [0, 'voz'])[1];
  return remember(ck, { url: URL.createObjectURL(new Blob([ab], { type: 'audio/mpeg' })), env, eng: 'ElevenLabs · ' + String(name).split(' ·')[0] }); };
let envNow = null, lvlBump = 0;
S.level = () => { if (playing && envNow && AU && !AU.paused) { const i = Math.floor(AU.currentTime / .04 * (AU.playbackRate || 1) / (AU.playbackRate || 1)); return envNow[Math.min(envNow.length - 1, Math.max(0, Math.floor(AU.currentTime / .04)))] || 0; } if (st === 'speaking') { lvlBump *= .9; return lvlBump; } return 0; };
const playClip = (clip, my) => new Promise(res => { if (my !== tok) return res('stop'); const a = au(); let done = false; const end = r => { if (done) return; done = true; playing = null; envNow = null; a.onended = a.onerror = null; res(r); };
  outSession(); a.src = clip.url; a.playbackRate = +cfg().speed || 1; a.onended = () => end('ok'); a.onerror = () => end('erro'); envNow = clip.env || null;
  playing = { stop: () => { try { a.pause(); } catch (e) { } end('stop'); } }; orb();
  const p = a.play(); if (p && p.catch) p.catch(e => end(e && e.name === 'NotAllowedError' ? 'blocked' : 'erro')); });
const MALE = /felipe|daniel|duarte|ricardo|thiago|tiago|joaquim|ant[oó]nio|jorge|paulo|eddy|reed|rocko|grandpa|male|mascul/i, GOOD = /premium|enhanced|melhorad|neural|natural|siri/i;
const sysVoice = () => { try { const vs = speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang)), pref = cfg().accent === 'PT' ? /pt[-_]PT/i : /pt[-_]BR/i, rank = v => (MALE.test(v.name) ? 4 : 0) + (GOOD.test(v.name) ? 2 : 0) + (pref.test(v.lang) ? 1 : 0); return vs.sort((a, b) => rank(b) - rank(a))[0] || null; } catch (e) { return null; } };
const sysSay = (text, my) => new Promise(res => { try { if (!window.speechSynthesis || my !== tok) return res('none'); outSession(); const u = new SpeechSynthesisUtterance(text), v = sysVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = cfg().accent === 'PT' ? 'pt-PT' : 'pt-BR'; u.rate = (+cfg().speed || 1) * .98; u.pitch = v && MALE.test(v.name) ? 1 : .9;
  let started = false; const to = setTimeout(() => res(started ? 'ok' : 'blocked'), Math.max(5000, text.length * 95)); u.onstart = () => { started = true; engine = 'voz do aparelho' + (v ? ' · ' + v.name : ''); orb(); }; u.onboundary = () => { lvlBump = .9; }; u.onend = () => { clearTimeout(to); res('ok'); }; u.onerror = e => { clearTimeout(to); res(e && /not-allowed/.test(e.error || '') ? 'blocked' : 'erro'); }; speechSynthesis.speak(u); } catch (e) { res('erro'); } });
// primeiro pedaço curto (a 1.ª frase, ou as duas primeiras se forem curtas) para a voz começar logo; o resto em pedaços grandes
// (1.º pedaço: 1 ou 2 frases; 2.º: até ~350 letras; depois pedaços grandes — cada um fica pronto antes de o anterior acabar de tocar)
const first = (t, max) => { const all = String(t).trim(), s = all.match(/[^.!?]+[.!?]*\s*/g) || [all]; let head = s[0] || ''; if (head.length < 70 && s[1]) head += s[1]; head = head.trim();
  let rest = all.slice(all.indexOf(head) + head.length).trim(); if (!rest) return [head]; const p2 = parts(rest, 350)[0] || ''; rest = rest.slice(rest.indexOf(p2) + p2.length).trim();
  return [head, p2].concat(rest ? parts(rest, max) : []).filter(Boolean); };
const parts = (t, max) => { const s = String(t).match(/[^.!?]+[.!?]*\s*/g) || [t], out = []; let cur = ''; s.forEach(x => { if ((cur + x).length > max && cur) { out.push(cur.trim()); cur = ''; } cur += x; }); if (cur.trim()) out.push(cur.trim()); return out; };
// pausa a voz sem a perder: se quem falou por cima era só o eco do Spyke, ele continua de onde estava
let paused = '';
S.pauseVoice = () => { try { if (AU && !AU.paused && playing) { AU.pause(); paused = 'au'; } } catch (e) { } try { if (window.speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) { speechSynthesis.pause(); paused = paused || 'ss'; } } catch (e) { } return !!paused; };
S.resumeVoice = () => { const p = paused; paused = ''; try { if (p === 'au' && AU && playing) { const r = AU.play(); r && r.catch && r.catch(() => { }); } } catch (e) { } try { if (window.speechSynthesis && speechSynthesis.paused) speechSynthesis.resume(); } catch (e) { } };
S.stop = () => { tok++; paused = ''; try { playing && playing.stop(); } catch (e) { } playing = null; try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } try { rec && rec.abort(); } catch (e) { } setSt('idle'); };
const order = () => { const c = cfg(), has = { azure: !!c.azKey, eleven: !!c.elKey, gemini: !!(OS.AI && OS.AI.key()), device: true }, pref = c.eng === 'gemini' ? ['gemini', 'azure', 'eleven', 'device'] : c.eng === 'eleven' ? ['eleven', 'azure', 'gemini', 'device'] : c.eng === 'device' ? ['device'] : ['azure', 'eleven', 'gemini', 'device']; return pref.filter(e => has[e]); };
S.say = async (text, o = {}) => { if (!text) return; S.stop(); const my = ++tok; curSay = N(text); if (!o.bg) { open(); if (!o.again) push('spyke', text); } else UI.toast(text.slice(0, 160)); setSt('thinking'); hist.push({ r: 'spyke', t: text }); needTap = ''; voiceErr = '';
  let res = '';
  const ord = o.eng ? [o.eng].concat(order().filter(x => x !== o.eng)) : order();
  for (const e of ord) { if (my !== tok) return; if ((e === 'eleven' && !cfg().elKey) || (e === 'azure' && !cfg().azKey)) continue;
    if (e === 'device') { setSt('speaking'); res = await sysSay(text, my); if (res === 'ok' || res === 'blocked') break; voiceErr += (voiceErr ? ' · ' : '') + 'a voz do aparelho não respondeu'; continue; }
    try { const P = e === 'gemini' ? first(text, 1400) : first(text, 2400), get = e === 'gemini' ? gemClip : e === 'azure' ? azClip : elClip;
      // todos os pedaços começam a ser gerados já (o 1.º é curto, por isso a voz arranca em poucos segundos); toca-os por ordem
      const Q = P.map((x, i) => i < 3 ? get(x) : null); Q.forEach(q => q && q.catch(() => { }));
      for (let i = 0; i < P.length; i++) { if (!Q[i]) { Q[i] = get(P[i]); Q[i].catch(() => { }); } if (i + 3 < P.length && !Q[i + 3]) { Q[i + 3] = get(P[i + 3]); Q[i + 3].catch(() => { }); } const cur = await Q[i]; if (my !== tok) return; setSt('speaking'); res = await playClip(cur, my); engine = cur.eng; if (res !== 'ok') break; } }
    catch (er) { voiceErr += (voiceErr ? ' · ' : '') + (er.message || 'erro'); res = 'erro'; }
    if (res === 'ok' || res === 'blocked' || res === 'stop') break; }
  if (my !== tok || res === 'stop') return;
  if (res === 'blocked') { needTap = text; unlocked = false; if (o.bg) { setSt('idle'); S.banner('Spyke tem um aviso', text, () => S.say(text, { tap: true })); return; } const lm = msgs.filter(m => m.r === 'spyke').pop(); if (lm) lm.tap = 1; setSt('idle'); renderChat(); return; }
  setSt('idle'); diag(); if (!o.bg && (o.listen || (cfg().cont && convOn()))) S.listen({ follow: true }); };
let voiceErr = '';
const diag = () => { if (!el) return; const d = el.querySelector('.spy-dg'); if (d) d.textContent = (engine ? 'Voz: ' + engine : '') + (voiceErr ? (engine ? ' · ' : '') + 'falhou antes: ' + voiceErr : ''); };

/* ================= ouvir ================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, srErr = '';
const MICSET = 'Ajustes → Apps → Safari → Microfone → Permitir';
const SRERR = { 'not-allowed': 'Sem acesso ao microfone: ' + MICSET + '.', 'service-not-allowed': 'O iPhone não deixou ditar: liga Ajustes → Geral → Teclado → Ativar ditado (e a Siri).', 'audio-capture': 'O microfone está a ser usado por outra coisa.', network: 'O ditado precisa de internet.' };
// com o microfone ligado o iPhone precisa do modo "gravar e tocar"; sem microfone, "tocar" (som mais alto)
const micLive = () => !!(ear || rec || barge || (clapSt && clapSt.ms));
const outSession = () => session(micLive() ? 'play-and-record' : 'playback');
const once = () => new Promise(res => { if (!SR) return res(''); srErr = ''; let fin = '', r; try { r = new SR(); } catch (e) { return res(''); } r.lang = cfg().accent === 'PT' ? 'pt-PT' : 'pt-BR'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  r.onresult = e => { let t = ''; for (const x of e.results) t += x[0].transcript; fin = t; cap('user', t); }; r.onerror = e => { srErr = SRERR[e.error] || (e.error && e.error !== 'no-speech' && e.error !== 'aborted' ? 'Erro do ditado: ' + e.error : ''); }; r.onend = () => { rec = null; outSession(); res(fin.trim()); }; rec = r; try { session('play-and-record'); r.start(); } catch (e) { rec = null; res(''); } });
// conversa: enquanto está aberta, o que dizes vai direto ao Spyke (sem dizer "Spyke")
let conv = false, convUntil = 0, lsT = 0;
const strict = () => +cfg().convWin < 0; // só responde quando ouve "Spyke" (padrão)
const win = () => { const w = +cfg().convWin; return w < 0 ? 0 : w === 0 ? 7 * 864e5 : (w || 120) * 1000; };
const convOn = () => !strict() && conv && Date.now() < convUntil;
const convGo = ms => { if (strict() && !ms) return; conv = true; convUntil = Date.now() + (ms || win()); };
S.listen = async (lo = {}) => { if (silent()) { tapEar = Date.now() + 25000; earStopped = false; earBlock = 0; } if (!SR && !silent()) { open(); setSt('idle'); cap('spyke', 'Este navegador não deixa ditar. Escreve abaixo.'); const i = U.$('#spyIn'); i && i.focus(); return; }
  if (!lo.follow) { earStopped = false; earBlock = 0; earTaps = 0; }
  // escuta contínua ligada: o mesmo microfone continua aberto (não volta a pedir autorização)
  if (earWanted()) { if (!lo.follow) { S.stop(); convGo(Math.max(30000, win())); } open(); earMark(); setSt('listening'); bgSync(); clearTimeout(lsT); lsT = setTimeout(() => { if (st === 'listening') setSt('idle'); }, lo.follow ? 8000 : 15000); return; }
  if (!lo.follow) convGo(30000);
  S.stop(); open(); pauseBg(); setSt('listening'); const t = await once(); resumeBg(); if (!t) { setSt('idle'); if (lo.follow && !srErr) { conv = false; const l = el && el.querySelector('.spy-st'); if (l) l.textContent = 'Conversa terminada. Toca no microfone para falar.'; return; } cap('spyke', srErr || 'Não ouvi nada. Toca outra vez no microfone ou escreve abaixo.'); return; } convGo(30000); await S.handle(t); };

/* ---------- escuta contínua: liga sozinha ao entrar e só para quando dizes "para de ouvir" ----------
   Um único reconhecimento de voz fica aberto (reinicia sozinho quando o iPhone o fecha), por isso não pede o microfone a cada frase.
   - diz "Spyke…" a qualquer momento; durante a conversa nem precisas do nome;
   - enquanto ele fala: "Spyke" interrompe e ouve, "para" cala-o;
   - "para de ouvir" / "desliga o microfone" desliga até tocares no microfone ou voltares a abrir a app.
   Limite do iPhone: uma app web só ouve com a app aberta e no ecrã. Com a app fechada usa a Siri (guia em baixo). */
let earConf = 1, ear = null, appIn = false, earStopped = false, earBlock = 0, earTaps = 0, earErr = '', earFull = '', earBase = '', earT = 0, earFails = 0, earAt = 0, curSay = '', sayEnd = 0, bgPaused = 0;
const SAYSTOP = /^(?:e?sp\w*\s+)?(?:para|pare|parar|chega|cala|silencio|stop)\b/;
const EARSTOP = /\b(para|pare|parar|deixa|deixe|desliga|desligue|desativa|desative)\s+(?:de\s+)?(ouvir|escutar|o microfone|a escuta|microfone)\b|\b(vai|pode ir) dormir\b/;
let hush = false; // true enquanto o Spyke prepara a resposta e fala (o microfone descansa)
// ouvido silencioso (sem o som do ditado do iPhone): microfone aberto uma vez + deteção da fala + transcrição pela IA
let tapEar = 0, silentFail = 0;
const silent = () => cfg().ear !== 'ditado' && !silentFail && !!(OS.Ear && OS.Ear.can()) && (!navigator.webdriver || !!window.__spyEar);
S.silent = () => silent();
const earWanted = () => (!!SR || silent()) && appIn && !earStopped && !earBlock && !hush && !document.hidden && !bgPaused && (!!cfg().always || tapEar > Date.now()) && (!navigator.webdriver || !!window.__spyEar);
const earMark = () => { clearTimeout(earT); earBase = earFull; };
const cut = full => { if (full.startsWith(earBase)) return full.slice(earBase.length); let i = 0; const m = Math.min(full.length, earBase.length); while (i < m && full[i] === earBase[i]) i++; return full.slice(i); };
// o que o Spyke acabou de dizer e o microfone apanhou não conta como pedido teu
const echo = n => { if (!curSay || Date.now() - sayEnd > 3500 && st !== 'speaking') return false; const w = n.split(' ').filter(x => x.length > 2); return w.length > 0 && w.filter(x => curSay.includes(x)).length / w.length >= .7; };
let armed = 0; // depois de ouvir só "Spyke", a frase seguinte (até 10 s) é o comando
// registo (só neste aparelho) das últimas frases que acordaram o Spyke: se alguma não foste tu a chamar, vês aqui o que ele percebeu
const wakeLog = t => { try { const L = U.ls.get('os2spWake', []); L.unshift({ at: Date.now(), t: String(t).slice(0, 140), e: silent() ? (OS.Ear.engine() || 'IA') : 'ditado' }); U.ls.set('os2spWake', L.slice(0, 12)); } catch (e) { } };
S.wakeLog = () => U.ls.get('os2spWake', []);
const earPhrase = s => { const n = N(s); if (!n || echo(n)) return; if (earConf > 0 && earConf < .3 && !WAKE.test(n)) return; // barulho mal reconhecido
  if (EARSTOP.test(n) && (WAKE.test(n) || armed > Date.now() || st === 'listening')) { push('user', s); armed = 0; return earQuit(true); }
  const cmd = wakeSplit(s), inConv = st === 'listening' || armed > Date.now() || (cfg().cont && convOn());
  if (cmd !== null && !inConv && !vocative(s)) return;
  if (cmd !== null && !inConv) wakeLog(s);
  if (cmd !== null) { S.wakeFx(); convGo(); clearTimeout(lsT);
    if (N(cmd).length > 1) { armed = 0; S.handle(cmd); return; }
    // só o nome: um som curto e fica à espera do pedido (sem falar)
    armed = Date.now() + 10000; setSt('listening'); const l = el && el.querySelector('.spy-st'); if (l) l.textContent = 'Diz o que precisas…'; lsT = setTimeout(() => { if (st === 'listening' && armed <= Date.now()) setSt('idle'); }, 10500); return; }
  if (inConv) { armed = 0; convGo(); clearTimeout(lsT); S.handle(s); } };
const earTake = () => { clearTimeout(earT); const s = cut(earFull).trim(); earBase = earFull; const n0 = msgs.length; if (s && st !== 'speaking' && st !== 'thinking') earPhrase(s); if (live && msgs.length === n0) { live = ''; renderChat(); } };
const earStart = () => { if (ear || !earWanted()) return; if (silent()) return earSilent(); wakeMode(false); let r; try { r = new SR(); } catch (e) { return; }
  r.lang = cfg().accent === 'PT' ? 'pt-PT' : 'pt-BR'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1; earFull = earBase = ''; let got = false;
  r.onresult = e => { if (ear !== r) return; got = true; earFails = 0; let full = ''; for (const x of e.results) full += x[0].transcript; earFull = full; const lr = e.results[e.results.length - 1]; earConf = lr && lr[0] && typeof lr[0].confidence === 'number' ? lr[0].confidence : 1; const fresh = cut(full).trim(); if (!fresh) return;
    if (st === 'speaking' || st === 'thinking') { const n = N(fresh); if (!cfg().barge || echo(n)) return;
      if (WAKE.test(n)) { earMark(); S.stop(); convGo(); push('spyke', 'Sim?'); S.listen({ follow: true }); } else if (SAYSTOP.test(n)) { earMark(); S.stop(); } return; }
    if ((st === 'listening' || convOn()) && el && !el.hidden && !echo(N(fresh))) cap('user', fresh);
    clearTimeout(earT); if (e.results[e.results.length - 1].isFinal) earTake(); else earT = setTimeout(earTake, 1500); };
  r.onerror = e => { earErr = e.error || ''; if (earErr === 'not-allowed' || earErr === 'service-not-allowed') { earBlock = Date.now(); earNeedTap(earErr); } };
  r.onend = () => { if (ear !== r) return; ear = null; if (earT) earTake(); setEarCls(); const quick = !got && Date.now() - earAt < 2500; earFails = quick ? earFails + 1 : 0;
    if (earWanted()) setTimeout(earStart, quick ? Math.min(15000, 400 * Math.pow(2, earFails)) : 250); else outSession(); };
  ear = r; earAt = Date.now(); setEarCls(); try { session('play-and-record'); r.start(); } catch (e) { ear = null; setEarCls(); } };
/* ---------- ouvido silencioso ---------- */
let bargeP = false, sttBusy = 0, echoN = 0, echoTok = -1, noisy = [], quietUntil = 0;
const stLbl = t => { const l = el && el.querySelector('.spy-st'); if (l) l.textContent = t; };
const earSilent = () => { wakeMode(true); const E = OS.Ear; E.hang = Math.round((+cfg().pausa || 1.2) * 1000); ear = E; earAt = Date.now(); setEarCls(); session('play-and-record');
  E.start({ onStart: () => { if (st === 'speaking') { if (echoTok !== tok) { echoTok = tok; echoN = 0; } if (cfg().bargeS !== false && echoN < 2 && S.pauseVoice()) { bargeP = true; stLbl('A ouvir-te…'); } return; }
      if (el && !el.hidden && (st === 'listening' || convOn() || armed > Date.now())) { live = '…'; renderChat(); stLbl('A ouvir-te…'); } },
    onDrop: () => { if (bargeP) { bargeP = false; S.resumeVoice(); stLbl(STL.speaking); } if (live === '…') { live = ''; renderChat(); } },
    onUtt: u => { const idle = st === 'idle' && !(el && !el.hidden) && armed <= Date.now() && !convOn() && tapEar <= Date.now();
      // muito barulho à volta (televisão, conversas) e ninguém a chamar o Spyke: descansa 30 s para não gastar a IA
      if (idle) { if (Date.now() < quietUntil) return; noisy = noisy.filter(x => Date.now() - x < 60000); noisy.push(Date.now()); if (noisy.length > 14) { quietUntil = Date.now() + 30000; noisy = []; return; } }
      sttTake(u); },
    onPeak: (pk, now) => { if (clapSt && clapSt.det && st === 'idle' && !bgPaused && clapSt.det(pk, now)) clapGo(); },
    onErr: e => { ear = null; setEarCls(); if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) { earBlock = Date.now(); earNeedTap('not-allowed'); return; } silentFail = Date.now(); setTimeout(bgSync, 300); } }).then(ok => { if (!ok && ear === E) { ear = null; setEarCls(); } }); };
const sttTake = async u => { const wasB = bargeP; bargeP = false; sttBusy++; if (el && !el.hidden && (wasB || st === 'listening' || convOn() || armed > Date.now())) { live = '…'; renderChat(); stLbl('A perceber o que disseste…'); }
  let text = ''; try { text = await OS.Ear.stt(u.b64); } catch (e) { earErr = e.message || 'erro'; } sttBusy--;
  if (live === '…') { live = ''; renderChat(); }
  const n = N(text);
  // falaste por cima do Spyke
  if (wasB) { if (!n || echo(n)) { echoN++; S.resumeVoice(); stLbl(STL.speaking); return; } S.stop(); armed = 0; convGo(30000); const c = wakeSplit(text); S.handle(c !== null && N(c) ? c : text); return; }
  if (!n) { if (st === 'listening') stLbl(idleTxt()); return; }
  // continuaste a falar enquanto ele pensava: junta ao que já tinhas dito
  if (st === 'thinking' && curAsk && Date.now() - curAskAt < 60000 && !echo(n)) { const prev = curAsk; askTok++; S.stop(); S.handle(prev + ' ' + (wakeSplit(text) || text)); return; }
  if (st === 'speaking' || st === 'thinking') return;
  const n0 = msgs.length; earPhrase(text); if (WAKE.test(n)) noisy = []; if (live && msgs.length === n0) { live = ''; renderChat(); } };
S._sttTake = sttTake;
let earClsT = 0; // o iPhone fecha e reabre o microfone a toda a hora: só apaga o ponto se ficar mesmo desligado (mudar a classe do <html> recalcula a página toda)
const setEarCls = () => { clearTimeout(earClsT); if (ear) document.documentElement.classList.add('spy-ear'); else earClsT = setTimeout(() => { if (!ear) document.documentElement.classList.remove('spy-ear'); }, 1500); if (el && !el.hidden && st === 'idle') { const l = el.querySelector('.spy-st'); if (l) l.textContent = idleTxt(); } };
const earOff = () => { const r = ear; ear = null; clearTimeout(earT); setEarCls(); try { r && r.abort(); } catch (e) { } if (bargeP) { bargeP = false; S.resumeVoice(); } };
const earQuit = said => { earStopped = true; earOff(); conv = false; outSession(); if (said) S.say(pickR(['Ok, deixei de ouvir. Toca no microfone quando precisares.', 'Microfone desligado. Estou aqui quando me chamares.'])); else UI.toast('O Spyke deixou de ouvir'); };
S.earStop = () => earQuit(false); S.earOn = () => !!ear; S._endConv = () => { conv = false; convUntil = 0; if (st === 'listening') setSt('idle'); };
// o iPhone pode recusar abrir o microfone sem um toque: espera pelo primeiro toque e tenta outra vez
const earNeedTap = er => { earOff();
  if (er === 'service-not-allowed') return S.banner('O Spyke não consegue ouvir', 'Liga o ditado: Ajustes → Geral → Teclado → Ativar ditado. Depois toca aqui.', () => { earBlock = 0; bgSync(); });
  if (++earTaps > 2) return S.banner('O Spyke não consegue ouvir', 'Permite o microfone: ' + MICSET + '. Depois toca aqui.', () => { earBlock = 0; earTaps = 0; bgSync(); });
  const go = () => { ['touchend', 'click'].forEach(ev => document.removeEventListener(ev, go, true)); earBlock = 0; bgSync(); };
  ['touchend', 'click'].forEach(ev => document.addEventListener(ev, go, true)); };

/* ---------- palmas: duas palmas chamam o Spyke ----------
   O microfone abre uma vez e fica aberto enquanto a app está aberta (fechar e reabrir era o que fazia o iPhone pedir autorização sempre).
   Deteção: pico súbito bem acima do ruído de fundo que cai logo a seguir (a voz e a música não caem tão depressa); duas destas entre 0,12 e 0,95 s. */
let clapSt = null, MS = null;
const pauseBg = () => { bgPaused++; earOff(); };
const resumeBg = () => { bgPaused = Math.max(0, bgPaused - 1); setTimeout(bgSync, 400); };
const clapWanted = () => !!cfg().clap && appIn && !document.hidden && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && (!navigator.webdriver || !!window.__spyClap);
const getMic = async () => { if (MS && MS.getAudioTracks().some(t => t.readyState === 'live')) return MS; if (OS.Ear && OS.Ear.stream && OS.Ear.stream()) return (MS = OS.Ear.stream());
  MS = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
  MS.getAudioTracks().forEach(t => { t.onended = () => { MS = null; if (clapSt) { stopClap(); setTimeout(bgSync, 800); } }; }); return MS; };
S._clap = { lvl: 0, muted: false, n: 0 };
const clapGo = () => { S._clap.n++; if (st !== 'idle' || document.getElementById('spyLv')) return; earStopped = false; S.wakeFx(); convGo(); S.say(pickR(['Às ordens, ' + name() + '.', 'Sim?', 'Diz, chefe.']), { listen: true }); };
S._clapDetector = sens => { let floor = .015, prev = 0, cand = null, hits = [], lastHit = -1e9;
  return (pk, now) => { const absT = .34 - sens() * .03, ratio = 8 - sens() * .5; let fired = false;
    if (cand) { if (pk < cand.pk * .45) { cand = null; lastHit = now; hits = hits.filter(t => now - t < 1100); hits.push(now); if (hits.length >= 2) { const g = hits[hits.length - 1] - hits[hits.length - 2]; if (g >= 120 && g <= 950) { hits = []; fired = true; } } } else if (now - cand.t > 170) cand = null; }
    else if (pk > absT && pk > floor * ratio && pk > prev * 1.6 && now - lastHit > 110) cand = { t: now, pk };
    if (!cand) floor = floor * .985 + Math.min(pk, .3) * .015; prev = pk; return fired; }; };
const startClap = async () => { if (clapSt || !clapWanted()) return; const me = clapSt = { on: true };
  try { const ms = await getMic(); if (clapSt !== me) return; me.ms = ms; outSession();
    const a = ac(); if (a.state !== 'running') { try { await Promise.race([a.resume(), new Promise(r => setTimeout(r, 900))]); } catch (e) { } }
    const src = a.createMediaStreamSource(ms), an = a.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0; src.connect(an); me.src = src;
    const buf = new Float32Array(an.fftSize), det = S._clapDetector(() => +cfg().sens || 5); let zero = 0;
    me.iv = setInterval(() => { if (a.state !== 'running') { S._clap.lvl = -1; if (a.state === 'interrupted' || a.state === 'suspended') a.resume().catch(() => { }); return; }
      an.getFloatTimeDomainData(buf); let pk = 0; for (let i = 0; i < buf.length; i++) { const v = buf[i] < 0 ? -buf[i] : buf[i]; if (v > pk) pk = v; }
      S._clap.lvl = pk; zero = pk === 0 ? zero + 33 : 0; S._clap.muted = zero > 3000;
      if (st !== 'idle' || bgPaused) return; if (det(pk, performance.now())) clapGo(); }, 33); }
  catch (e) { if (clapSt === me) clapSt = null; if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) { OS.setOne('spyke', { clap: false }); UI.toast('Sem acesso ao microfone: as palmas foram desligadas. ' + MICSET + '.', 'warn'); } } };
const stopClap = hard => { const c = clapSt; clapSt = null; if (c) { c.on = false; try { clearInterval(c.iv); } catch (e) { } try { c.src && c.src.disconnect(); } catch (e) { } }
  if (hard && MS) { try { MS.getTracks().forEach(t => t.stop()); } catch (e) { } MS = null; } };
const bgSync = () => { if (document.hidden) { earOff(); stopClap(); return; } if (earWanted()) earStart(); else if (ear && !bgPaused) earOff(); if (clapWanted()) startClap(); else stopClap(!cfg().clap); };
S._bgSync = () => bgSync();
document.addEventListener('visibilitychange', () => setTimeout(bgSync, document.hidden ? 0 : 500));
OS.on('one:spyke', () => setTimeout(bgSync, 100));
// vigia: se uma resposta encravar (rede, IA, voz), o microfone nunca fica desligado — ao fim de 75 s volta a ouvir sozinho
let stAt = Date.now(), stWas = '';
setInterval(() => { if (st !== stWas) { stWas = st; stAt = Date.now(); }
  if (hush && st !== 'speaking' && st !== 'thinking') { hush = false; bgSync(); }
  // nunca fica "à escuta" para sempre (senão respondia a qualquer conversa à volta sem ouvir o nome)
  else if (st === 'listening' && Date.now() - stAt > 30000 && !sttBusy && !rec && !(OS.Ear && OS.Ear.speaking) && armed <= Date.now()) setSt('idle');
  else if ((st === 'thinking' || st === 'speaking') && Date.now() - stAt > 75000 && !(st === 'speaking' && (playing || (window.speechSynthesis && window.speechSynthesis.speaking)))) { try { S.stop(); } catch (e) { } setSt('idle'); } }, 3000);
// uma vez: escuta sempre ligada, só responde ao nome e sem "interromper falando" (no iPhone ele ouvia a própria voz e interrompia-se)
OS.on('ready', () => { const c = OS.one('spyke'); if (c.fix3 !== 1) OS.setOne('spyke', { always: true, convWin: -1, barge: false, fix3: 1 }); if (OS.one('spyke').fix4 !== 1) OS.setOne('spyke', { ear: 'auto', bargeS: true, pausa: 1.2, fix4: 1 });
  // uma vez: só acorda com o nome (sem palmas, sem responder sem o nome, avisos sem voz)
  if (OS.one('spyke').fix5 !== 1) OS.setOne('spyke', { convWin: -1, clap: false, alertVoz: false, fix5: 1 }); });
// ao entrar (depois do Face ID ou do código) começa logo a ouvir: podes falar sem tocar em nada
OS.on('unlock', () => { appIn = true; earStopped = false; earBlock = 0; earTaps = 0; if (cfg().always && SR && !strict() && (!navigator.webdriver || window.__spyEar)) convGo(Math.max(60000, win())); bgSync(); });


/* ================= memória ================= */
const memAdd = (text, src) => { const x = String(text || '').trim().replace(/\s+/g, ' '); if (x.length < 3) return false; const n = N(x); if (OS.all('spymem').some(m => N(m.text) === n || N(m.text).includes(n) || (n.includes(N(m.text)) && N(m.text).length > 12))) return false; OS.add('spymem', { text: x.charAt(0).toUpperCase() + x.slice(1), date: U.today(), src: src || 'voz' }); return true; };
S.memAdd = memAdd;

/* ================= rotinas ================= */
// junta o que cada passo diria e fala tudo de uma vez no fim
const runRoutine = async R => { const real = S.say, said = []; S.say = (txt) => { if (txt) said.push(txt); return Promise.resolve(); };
  try { for (const step of String(R.steps || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12)) await S.handle(step, { quiet: true, inRoutine: true }); } finally { S.say = real; }
  return S.say([...said, R.reply || ''].filter(Boolean).join(' ') || 'Rotina feita.'); };
S.evening = () => { const t = U.today(), tm = U.addDays(t, 1), out = [`Boa noite, ${name()}. O balanço de hoje:`];
  try { const done = OS.all('tasks').filter(x => x.doneAt === t).length, hs = OS.all('habits').filter(h => h.active && OS.Hab.due(h, t)), hd = hs.filter(h => OS.Hab.done(h, t)).length, mins = U.sum(OS.all('sessions').filter(x => x.date === t), x => x.minutes), spent = U.sum(OS.all('transactions').filter(x => x.date === t && x.type === 'Despesa'), x => U.num(x.amount));
    out.push(`${done === 1 ? 'uma tarefa concluída' : done + ' tarefas concluídas'}, ${hd} de ${hs.length} hábitos${mins ? ', ' + mins + ' minutos de estudo' : ''}${spent ? ' e gastaste ' + eurS(spent) : ''}.`);
    const left = OS.Tasks.open().filter(x => x.due && x.due <= t); if (left.length) out.push(`Ficou por fazer: ${listS(left.slice(0, 2).map(x => x.title))}.`);
    const miss = hs.filter(h => h.core && !OS.Hab.done(h, t)); if (miss.length) out.push(`Ainda vais a tempo destes inegociáveis: ${listS(miss.slice(0, 3).map(h => h.name))}.`); } catch (e) { }
  try { const it = U.sortBy(OS.Cal.items(tm, tm).filter(x => x.start && x.src !== 'task'), x => x.start); out.push(it.length ? `Amanhã: ${listS(it.slice(0, 3).map(x => x.title + ' às ' + x.start))}.` : 'Amanhã não tens compromissos com hora.');
    const wx = OS.Weather && OS.Weather.cached(); if (wx && wx.now) out.push(OS.Weather.say(wx, 1));
    const p1 = U.sortBy(OS.Tasks.open().filter(x => x.due === tm || x.sched === tm), x => +x.prio || 3)[0]; if (p1) out.push(`A primeira coisa de amanhã: ${p1.title}.`); } catch (e) { }
  out.push(pickR(['Descansa bem. Amanhã há mais.', 'Dorme bem, amanhã continuamos.', 'Bom descanso. Amanhã é outro dia para vencer.']));
  return out.join(' '); };
const routineStudy = () => { const t = U.today(), out = ['Modo estudo.'];
  try { const ex = U.sortBy(OS.all('assessments').filter(a => a.date >= t), a => a.date)[0]; if (ex) out.push(`A próxima avaliação é ${ex.type || ''} de ${(OS.get('subjects', ex.subject) || {}).name || ex.title}, ${U.diff(ex.date, t) === 0 ? 'hoje' : U.diff(ex.date, t) === 1 ? 'amanhã' : 'daqui a ' + U.diff(ex.date, t) + ' dias'}.`);
    const rev = OS.St.revDue().length, cards = OS.all('cards').filter(c => !c.due || c.due <= t).length; if (rev || cards) out.push(`Tens ${rev ? rev + ' revisões' : ''}${rev && cards ? ' e ' : ''}${cards ? cards + ' cartões para rever' : ''}.`); } catch (e) { }
  out.push('Abri o Bloco de foco com as pendências da universidade. Telemóvel longe, e vamos a isso.');
  try { OS.FocusBlock && OS.FocusBlock.preset && OS.FocusBlock.preset('area:Universidade'); } catch (e) { } location.hash = 'foco'; return S.say(out.join(' ')); };
const routineGym = () => { const sp = OS.one('fit').split[String(new Date().getDay())]; location.hash = 'treino'; return S.say(sp && sp !== 'Descanso' ? `Modo treino. Hoje é dia de ${sp}. Aquece bem, foca na técnica e regista as séries.` : 'Modo treino. Hoje não tens treino planeado: escolhe uma rotina e bora.'); };
const routineWork = () => { const t = U.today(), sh = U.sortBy(OS.all('shifts').filter(s => s.date >= t), s => s.date + s.start)[0], out = ['Modo trabalho.'];
  if (sh) out.push(sh.date === t ? `O teu turno hoje é das ${sh.start} às ${sh.end}.` : `O próximo turno é ${dayS(sh.date)}, das ${sh.start} às ${sh.end}.`);
  try { const L = OS.Tasks.open().filter(x => { const p = OS.get('projects', x.project); return p && (['Profissional', 'Empresarial'].includes(p.type) || p.area === 'Trabalho'); }); if (L.length) out.push(`Nos projetos de trabalho tens ${L.length} tarefas; começa por ${L[0].title}.`); } catch (e) { }
  location.hash = 'trabalho'; return S.say(out.join(' ')); };

/* ================= avisos falados (com a app aberta) ================= */
S.banner = (title, sub, onTap) => { document.querySelectorAll('.spy-morn').forEach(x => x.remove()); const b = document.createElement('button'); b.type = 'button'; b.className = 'spy-morn'; b.innerHTML = `<i>${UI.ic('mic')}</i><span><b>${esc(title)}</b><small>${esc(sub.slice(0, 140))}</small></span><em aria-hidden="true">×</em>`;
  b.onclick = e => { b.remove(); if (e.target.closest('em')) return; onTap && onTap(); }; document.body.appendChild(b); setTimeout(() => b.remove(), 45000); };
const said = k => { const m = U.ls.get('os2spSaid', {}); if (m[k]) return true; m[k] = Date.now(); Object.keys(m).forEach(x => { if (Date.now() - m[x] > 3 * 864e5) delete m[x]; }); U.ls.set('os2spSaid', m); return false; };
const alertTick = () => { if (!cfg().alerts || document.hidden || (navigator.webdriver && !window.__spyTest) || st !== 'idle') return; const now = new Date(), h = now.getHours(); if (!window.__spyTest && (h >= 23 || h < 8)) return; if (OS.FocusBlock && OS.FocusBlock.state()) return;
  const t = U.today(), nowM = h * 60 + now.getMinutes(), msgs = [];
  try { OS.Cal.items(t, t).filter(x => x.start && !x.done && x.src !== 'task').forEach(x => { const d = U.t2m(x.start) - nowM; if (d > 10 && d <= 30 && !said('c30|' + t + x.title + x.start)) msgs.push(`daqui a ${d} minutos tens ${x.title}, às ${x.start}`); else if (d > 0 && d <= 10 && !said('c10|' + t + x.title + x.start)) msgs.push(`daqui a ${d} minutos: ${x.title}`); }); } catch (e) { }
  try { if (nowM >= 540 && !said('bills|' + t)) { const b = OS.Fin.upcoming(1).filter(x => x.amount < 0 && !x.tx && (x.rec || x.debt) && x.date <= t); if (b.length) msgs.push('hoje vence ' + listS(b.slice(0, 2).map(x => x.title + ', ' + eurS(x.amount)))); } } catch (e) { }
  try { if (nowM >= 1080 && !said('tasks|' + t)) { const L = OS.Tasks.open().filter(x => x.due === t); if (L.length) msgs.push(`ainda tens ${L.length === 1 ? 'uma tarefa' : L.length + ' tarefas'} com prazo hoje, como ${L[0].title}`); } } catch (e) { }
  try { if (nowM >= 1140 && !said('exam|' + t)) { const ex = OS.all('assessments').find(a => a.date === U.addDays(t, 1)); if (ex) msgs.push(`amanhã tens ${ex.type || 'avaliação'} de ${(OS.get('subjects', ex.subject) || {}).name || ex.title}`); } } catch (e) { }
  try { if (nowM >= 1260 && !said('hab|' + t)) { const H = OS.all('habits').filter(x => x.active && x.core && OS.Hab.due(x, t) && !OS.Hab.done(x, t)); if (H.length) msgs.push(`faltam ${H.length} inegociáveis: ${listS(H.slice(0, 3).map(x => x.name))}`); } } catch (e) { }
  if (!msgs.length) return; const text = name() + ', ' + msgs.join('. ') + '.';
  // o Spyke só fala sozinho se pedires (Definições → Spyke); por defeito o aviso aparece no ecrã, em silêncio, e tocas para ouvir
  if (cfg().alertVoz && unlocked) S.say(text, { bg: !el || el.hidden }); else S.banner('Aviso do Spyke', text, () => S.say(text, { tap: true })); };
setInterval(alertTick, 60e3); S._alertTick = alertTick;
// notícias para o resumo da manhã (busca discreta)
S._news = []; const newsTick = async () => { if (document.hidden || navigator.webdriver || !cfg().newsBrief || !OS.News || !OS.News.headlines) return; try { const H = await OS.News.headlines(5); if (H.length) S._news = H; } catch (e) { } };
OS.on('ready', () => setTimeout(newsTick, 6000)); setInterval(newsTick, 30 * 60e3);

/* ================= comandos ================= */
const hist = [];
const pickR = a => a[Math.floor(Math.random() * a.length)];
const routes = () => { const out = []; document.querySelectorAll('.tn-dd a[href^="#"], #side a[href^="#"]').forEach(a => { const k = a.getAttribute('href').slice(1), l = (a.querySelector('b') || a.querySelector('span') || a).textContent.trim(); if (k && l && !out.some(x => x[0] === k)) out.push([k, l]); }); return out.concat([['definicoes', 'Definições'], ['visao', 'Visão geral'], ['visao', 'Painel'], ['visao', 'Control Room'], ['visao', 'Centro de controlo'], ['definicoes.spyke', 'Spyke'], ['definicoes.script', 'Script Google'], ['definicoes.script', 'Parte 4'], ['email', 'E-mail']]); };
const findRoute = q => { const n = N(q).replace(/^(o|a|os|as|aba|pagina|separador)\s+/, '').replace(/^(aba|pagina)\s+(de|do|da)?\s*/, ''); if (!n) return null; const R = routes(); return R.find(([k, l]) => N(l) === n || k === n) || R.find(([k, l]) => N(l).startsWith(n) || n.startsWith(N(l))) || R.find(([k, l]) => N(l).includes(n) || n.includes(N(l).split(' ')[0])); };
S.handle = async (raw, ho = {}) => { const t = N(raw); if (!ho.quiet) push('user', raw); hist.push({ r: 'ryan', t: raw }); let m;
  if (EARSTOP.test(t)) return earQuit(true);
  if (/^(liga|ativa|volta a) (o microfone|a escuta|ouvir)|^(comeca|volta) a (ouvir|escutar)/.test(t)) { earStopped = false; earBlock = 0; bgSync(); return S.say(SR && cfg().always ? 'Estou a ouvir.' : 'Liga "Ouvir sempre" em Definições, no separador Spyke.'); }
  if (/^(para|parar|pare|chega|silencio|cala|obrigad|valeu|cancela|e tudo|era so isso)/.test(t)) { conv = false; S.stop(); return S.say(pickR(['Às ordens.', 'Com certeza.', 'Fico por aqui.'])); }
  // rotinas (as tuas primeiro)
  const R = OS.all('spyroutines').find(r => r.phrase && (t === N(r.phrase) || t.startsWith(N(r.phrase)))); if (R && !ho.inRoutine) return runRoutine(R);
  if (/\b(boa noite|fim do dia|balanco do dia|como correu o (meu )?dia)\b/.test(t)) return S.say(S.evening());
  if (/\b(modo estudo|vou estudar|hora de estudar)\b/.test(t)) return routineStudy();
  if (/\b(modo treino|vou treinar|hora de treinar)\b/.test(t)) return routineGym();
  if (/\b(modo trabalho|vou trabalhar|vou para o trabalho)\b/.test(t)) return routineWork();
  if (/\b(modo jarvis|painel jarvis|abre o painel|mostra o painel|ecra principal|hud)\b/.test(t)) { OS.Jarvis && OS.Jarvis.open(); return S.say('Modo Jarvis ativo.', { bg: !el || el.hidden }); }
  // memória
  if ((m = raw.match(/^\s*(?:spyke[,\s]+)?(?:lembra[- ]?te|memoriza|guarda (?:isto|isso|que)|não te esqueças|nao te esquecas|fica a saber|quero que saibas)\s*(?:de\s+)?(?:que\s+)?(.{3,})$/i))) { const f = memAdd(m[1], 'voz'); return S.say(f ? 'Guardado. Vou lembrar-me de que ' + m[1].replace(/[.!]+$/, '') + '.' : 'Isso já eu sabia.'); }
  if (!ho.inRoutine && OS.Brain && OS.Brain.which() && (t.split(' ').length > 6 || /\b(porque|por que|como|explica|compara|pesquisa|procura|o que achas|o que acha|devo|deveria|recomenda|sugere|ajuda-me|me ajuda|quanto custa|quem e|quem foi|qual a diferenca)\b/.test(t))) return askAI(raw);
  if (/(o que (e que )?(tu )?sabes (sobre|de) mim|a tua memoria|o que te lembras)/.test(t)) { const L = U.sortBy(OS.all('spymem'), x => x.date || '').reverse(); return S.say(L.length ? `Sei ${L.length} coisas sobre ti. Por exemplo: ${listS(L.slice(0, 4).map(x => x.text.replace(/[.!]+$/, '')))}.` : 'Ainda não me contaste nada. Diz: lembra-te que…'); }
  if ((m = t.match(/^(?:esquece|apaga da memoria|esquece-te)(?: que| de que| o que te disse sobre| isso de)?\s+(.{3,})$/))) { const w = m[1].split(' ').filter(x => x.length > 3), L = OS.all('spymem').map(x => [x, w.filter(k => N(x.text).includes(k)).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]); if (!L.length) return S.say('Não encontrei isso na minha memória.'); OS.del('spymem', L[0][0].id); return S.say('Esquecido: ' + L[0][0].text.replace(/[.!]+$/, '') + '.'); }
  // clima e notícias
  if (/(como (esta|vai estar|fica) o tempo|previsao|clima|vai chover|chuva|temperatura|esta frio|esta calor|meteorologia|tempo (hoje|amanha|la fora|para amanha))/.test(t)) { if (!OS.Weather) return S.say('Sem dados do clima.'); setSt('thinking'); const wx = await OS.Weather.get(); if (!wx || !wx.now) return S.say('Não consegui ver o clima agora. Confirma a internet.'); return S.say(OS.Weather.say(wx, /amanha/.test(t) ? 1 : 0)); }
  if (/(noticias|manchetes|o que (se )?passa no mundo|novidades do mundo|jornal)/.test(t) && !/(abre|abrir|mostra)/.test(t)) { setSt('thinking'); const H = OS.News && OS.News.headlines ? await OS.News.headlines(5) : []; S._news = H.length ? H : S._news; return S.say(H.length ? 'As principais notícias agora: ' + H.map((x, i) => (i ? '' : '') + x.replace(/[.]+$/, '')).join('. ') + '.' : 'Não consegui buscar as notícias. Liga o script Google em Definições para eu as ir buscar.'); }
  // responder e-mail por voz → rascunho no Gmail
  if ((m = raw.match(/^\s*(?:responde|responder|responda)\s+(?:ao|à|a|para o|para a|para)\s+([A-Za-zÀ-ú.@-]+)\s*(?:que|a dizer que|dizendo que|:)?\s*(.*)$/i))) { if (!OS.Mail) return S.say('O e-mail ainda não está ligado.'); setSt('thinking'); try { const r = await OS.Mail.replyByName(m[1], m[2]); return S.say(r.ok ? `Rascunho guardado no Gmail para ${r.to}: ${r.body.slice(0, 280)}` : r.msg); } catch (e) { return S.say('Não consegui guardar o rascunho: ' + (e.message || 'erro') + '.'); } }
  if (/\b(bom dia|boa tarde|resumo|briefing|como (esta|e) o meu dia|o que (eu )?tenho (pra |para )?hoje)\b/.test(t) && !/amanha/.test(t)) return S.say(S.brief());
  if (/amanha/.test(t) && /(tenho|agenda|compromisso|resumo|planeado|fazer)/.test(t)) return S.say(S.brief(U.addDays(U.today(), 1)).replace(/^(Bom dia|Boa tarde|Boa noite), [^.]+\. Hoje é/, 'Amanhã é'));
  if (/(agenda|compromisso|calendario)/.test(t)) { const it = U.sortBy(OS.Cal.items(U.today(), U.today()).filter(x => x.src !== 'task' && x.start), x => x.start); return S.say(it.length ? 'Hoje: ' + listS(it.slice(0, 6).map(x => x.title + ' às ' + x.start)) + '.' : 'Nada com hora marcada hoje.'); }
  if (/(proxima (tarefa|acao)|o que (eu )?(faco|devo fazer|fazer agora)|prioridade|por onde comeco)/.test(t)) { const na = OS.Intel.next().slice(0, 3); return S.say(na.length ? `Agora: ${na[0].title}${na[0].why && na[0].why[0] ? ', porque ' + na[0].why[0] : ''}. Depois: ${listS(na.slice(1).map(n => n.title))}.` : 'Não tens nada pendente. Aproveita.'); }
  if ((m = t.match(/^(?:adiciona|adicionar|adicione|cria|criar|crie|anota|anotar|anote|lembra[- ]?me|lembrar|me lembra|nova)\s+(?:(?:uma|a)\s+)?(?:tarefa\s*:?\s*)?(?:de\s+|que\s+)?(.{3,})/))) { const o = OS.Tasks.quickParse(raw.replace(/^\s*\S+\s+(?:(?:uma|a)\s+)?(?:tarefa\s*:?\s*)?(?:de\s+|que\s+)?/i, '')); o.title = o.title.charAt(0).toUpperCase() + o.title.slice(1); if (o.status === 'Inbox') o.status = 'Próxima'; OS.add('tasks', o); return S.say(pickR(['Anotado: ', 'Feito. Tarefa criada: ', 'Está na lista: ']) + o.title + '.'); }
  if ((m = raw.toLowerCase().trim().match(/(?:^|\s)(?:gastei|paguei|comprei)\s\s*(?:.*?)\b(\d+(?:[.,]\d{1,2})?)\s*(?:euros?|€|eur)?\s*(?:(?:em|no|na|num|numa|de|com|pra|para)\s+)?(.*)$/))) { const r = S.addExpense(U.num(m[1].replace(',', '.')), (m[2] || '').trim()); return S.say(r.ok ? 'Registado: ' + r.text + '.' : r.msg); }
  if (/(quanto (eu )?(ja )?gastei|gastos? (do|deste|este) mes|despesas do mes)/.test(t)) { const mo = OS.Fin.month(U.ym(U.today())); return S.say(`Este mês gastaste ${eurS(mo.exp)} e recebeste ${eurS(mo.inc)}. ${mo.net < 0 ? 'Estás no vermelho em ' + eurS(mo.net) + '.' : 'Saldo do mês positivo: ' + eurS(mo.net) + '.'}`); }
  if (/(saldo|quanto (dinheiro )?(eu )?tenho|dinheiro disponivel)/.test(t)) return S.say(`Tens ${eurS(OS.Fin.liquid())} disponíveis nas contas.`);
  if (/linkedin/.test(t)) { const li = OS.Mail && OS.Mail.li(); if (!li || !li.at) { location.hash = 'email.linkedin'; return S.say('Ainda não li o teu LinkedIn. Abri a página para ligares.'); } const s = li.sum || {}; return S.say(s.resumo || `No LinkedIn: ${(s.mensagens || []).length} mensagens, ${(s.convites || []).length} convites e ${(s.vagas || []).length} vagas.`); }
  if (/(e-?mails?|emails?|correio|caixa de entrada|gmail)/.test(t)) { if (!OS.Mail || !OS.Mail.counts().at) { location.hash = 'email'; return S.say('Ainda não ligaste o e-mail. Abri a página com os passos.'); } return S.say((OS.Mail.sum() ? OS.Mail.sum() + ' ' : '') + OS.Mail.speak()); }
  if (/(versiculo|biblia|palavra do dia)/.test(t) && OS.Faith && OS.Faith.bible && OS.Faith.bible()) { const R = OS.Faith.vod(); return S.say(OS.Faith.textOf(R) + ' — ' + OS.Faith.label(R) + '.'); }
  if (/(frase|motiva|verdade do dia|da-me forca|me motiva)/.test(t) && OS.Quotes) return S.say(/verdade/.test(t) ? OS.Quotes.truth() : OS.Quotes.push());
  if (/habitos?/.test(t)) { const hb = OS.all('habits').filter(x => x.active && OS.Hab.due(x, U.today()) && !OS.Hab.done(x, U.today())); return S.say(hb.length ? `Faltam ${hb.length}: ${listS(hb.slice(0, 5).map(x => x.name))}.` : 'Hábitos de hoje todos feitos. Bom trabalho.'); }
  if (/(treino|ginasio)/.test(t) && !/(abre|abrir|mostra)/.test(t)) { const sp = OS.one('fit').split[String(new Date().getDay())]; return S.say(sp ? (sp === 'Descanso' ? 'Hoje é dia de descanso.' : 'Hoje é dia de ' + sp + '.') : 'Não tens divisão de treino definida para hoje.'); }
  if (/(ajuda(-me| me)? a decidir|decision center|minhas decisoes|as decisoes|o que (eu )?decido|qual (e|seria) a melhor (opcao|escolha))/.test(t)) { const D = U.sortBy(OS.all('decisions').filter(d => d.status === 'Em análise'), d => d.deadline || '9')[0]; location.hash = 'decisoes';
    if (!D) return S.say('Abri o Centro de decisões. Cria a decisão com as alternativas e eu ajudo-te a pensar.');
    if (!OS.AI || !OS.AI.key() || !OS.Decide) return S.say(`Abri o Centro de decisões na decisão ${D.title}.`);
    setSt('thinking'); setTimeout(() => OS.Decide.open(D.id), 300); await OS.Decide.run(D.id, 'an'); const r = ((OS.get('decisions', D.id) || {}).ai || {}).r; if (!r) return S.say('Não consegui analisar agora.'); const inc = r.inclinacao || {};
    return S.say([`Sobre ${D.title}: ${r.resumo || ''}`, inc.nome ? `Os dados apontam para ${inc.nome}. ${inc.porque || ''}` : '', r.emocao || '', r.passo ? 'Próximo passo: ' + r.passo : '', 'A decisão é tua.'].filter(Boolean).join(' ')); }
  if (/(bloco de foco|modo foco|quero focar|vamos focar|concentrar)/.test(t)) { location.hash = 'foco'; return S.say('Abri o Bloco de foco. Escolhe o tema, ou deixa que eu escolho pela prioridade.'); }
  // faltas: "quantas faltas tenho", "faltei à aula de estatística", "fui à aula de contabilidade"
  if (OS.Att && /\b(quantas faltas|minhas faltas|faltas (tenho|que tenho|dei)|limite de faltas)\b/.test(t)) { const sm = OS.Att.summary(); return S.say(sm ? 'Faltas: ' + sm + '.' : 'Ainda não tens faltas registadas.'); }
  if (OS.Att && (m = t.match(/^(?:eu )?(faltei|nao fui|fui|estive)\s+(?:a|à|ao|na|no|em)?\s*(?:aula|aulas)?\s*(?:de|da|do)?\s*(.{3,})$/))) { const q = m[2].replace(/^(a|à|ao|na|no|de|da|do)\s+/, '').trim(), S0 = OS.St.current(), s = S0.find(x => N(x.name).includes(q)) || S0.find(x => q.split(' ').filter(w => w.length > 3).some(w => N(x.name).includes(w)));
    if (s) { const L = OS.Att.all().filter(x => x.subject === s.id && x.cls); const o = L[0]; const st = /^(faltei|nao fui)$/.test(m[1]) ? 'Falta' : 'Presente';
      if (!o) return S.say(`Ainda não houve aulas de ${s.name} hoje para marcar.`); OS.Att.set(o.cls, o.date, st); const x = OS.Att.stats(OS.get('subjects', s.id));
      return S.say(`Marquei ${st === 'Falta' ? 'falta' : 'presença'} na aula de ${s.name} de ${o.date === U.today() ? 'hoje' : U.fmtD(o.date)} às ${o.start}. Tens ${x.faltas} ${x.faltas === 1 ? 'falta' : 'faltas'}${x.max ? ' de ' + x.max : ''}.`); } }
  if (/que horas/.test(t)) return S.say('São ' + new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) + '.');
  if (/(que dia e hoje|que dia e|data de hoje)/.test(t)) return S.say('Hoje é ' + dayS(U.today()) + '.');
  if ((m = t.match(/^(?:abre|abrir|abra|mostra|mostrar|mostre|vai (?:para|pra)|ir (?:para|pra)|leva-me (?:a|para|pra)|me leva (?:para|pra))\s+(.+)$/))) { const r = findRoute(m[1]); if (r) { location.hash = r[0]; return S.say(pickR(['Aqui está: ', 'A abrir ', 'Abri ']) + r[1] + '.'); } }
  return askAI(raw); };
S.addExpense = (v, desc) => { const d = String(desc || '').trim() || 'Gasto por voz', IB = OS.Inbox, g = IB && IB.guess ? IB.guess(d, '') : {}, acc = g.account || (IB && IB.defAcc && IB.defAcc());
  if (!(v > 0)) return { ok: false, msg: 'Não percebi o valor.' }; if (!acc) return { ok: false, msg: 'Primeiro cria uma conta nas Finanças, para eu saber de onde sai o dinheiro.' };
  const r = OS.add('transactions', { type: 'Despesa', amount: U.r2(v), date: U.today(), desc: d.charAt(0).toUpperCase() + d.slice(1), cat: g.cat || '', account: acc, method: 'Débito', ess: 'Essencial', tags: ['voz'] }); try { OS.S.transactions.after && OS.S.transactions.after(r, true); } catch (e) { }
  return { ok: true, text: `${eurS(v)} em ${d}${g.cat ? ', categoria ' + g.cat : ''}` }; };
S.findRoute = q => findRoute(q);

let askTok = 0, curAsk = '', curAskAt = 0;
const askAI = async raw => { if (!OS.Brain || !OS.Brain.which()) return S.say('Para conversas livres preciso do meu cérebro ligado: em Definições, no separador Spyke, cola a chave grátis do Google. Os comandos rápidos funcionam sem ela.');
  const my = ++askTok; curAsk = raw; curAskAt = Date.now(); setSt('thinking'); const r = await OS.Brain.ask(raw); if (my !== askTok) return; curAsk = '';
  if (r.did && r.did.length) { msgs.push({ r: 'act', t: r.did.join(' · ') }); renderChat(); }
  if (!r.text) return S.say('Não consegui pensar agora: ' + (r.err || 'erro') + '.');
  return S.say(r.text.slice(0, 900)); };
/* ================= Siri: enviar o resumo e o contexto ao teu script (a Siri lê-os com a app fechada) ================= */
const ib = () => OS.one('inbox');
const siriReady = () => !!(ib().url && ib().key && +(ib().ver || 0) >= 9 && cfg().siri);
S.push = async force => { if (!siriReady() || !OS.Inbox || !OS.Inbox.post) return false; const last = U.ls.get('os2spPush', 0); if (!force && Date.now() - last < 10 * 60e3) return false;
  const t = U.today(), t2 = U.addDays(t, 1), o = { op: 'br', j: JSON.stringify({ d: t, t: S.brief(t), d2: t2, t2: S.brief(t2), at: Date.now() }), cx: S.ctx() };
  if (cfg().siriAsk && OS.AI && OS.AI.key()) o.gk = OS.AI.key(); else o.nogk = '1';
  try { const j = await OS.Inbox.post(o); if (j && j.ok) { U.ls.set('os2spPush', Date.now()); return true; } } catch (e) { } return false; };
OS.on('ready', () => setTimeout(() => S.push(), 9000)); setInterval(() => { if (!document.hidden) S.push(); }, 15 * 60e3);
document.addEventListener('visibilitychange', () => { if (document.hidden && Date.now() - U.ls.get('os2spPush', 0) > 3 * 60e3) S.push(true); });

/* ================= painel (conversa) ================= */
let st = 'idle', el = null, needTap = '', raf = 0, msgs = [], live = '', wakeAt = 0;
const STL = { listening: 'A ouvir…', thinking: 'A preparar a resposta…', speaking: 'A falar…' };
let barge = null;
const bargeOff = () => { const r = barge; barge = null; try { r && r.abort(); } catch (e) { } };
const bargeOn = () => { if (ear || !cfg().barge || !SR || barge || st !== 'speaking' || document.hidden) return; let r; try { r = new SR(); } catch (e) { return; } r.lang = cfg().accent === 'PT' ? 'pt-PT' : 'pt-BR'; r.continuous = true; r.interimResults = true;
  r.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) { if (WAKE.test(N(e.results[i][0].transcript))) { bargeOff(); S.stop(); convGo(); push('spyke', 'Sim?'); setTimeout(() => S.listen({ follow: true }), 200); return; } } };
  r.onerror = () => { }; r.onend = () => { if (barge === r) { barge = null; if (st === 'speaking') setTimeout(bargeOn, 250); } }; barge = r; try { r.start(); } catch (e) { barge = null; } };
const idleTxt = () => ear ? (convOn() ? 'A ouvir. Fala à vontade.' : 'A ouvir. Diz "Spyke" para chamar.') : earStopped ? 'Microfone desligado. Toca no microfone para falar.' : 'Toca no microfone e fala';
const setSt = s => { if ((st === 'speaking') !== (s === 'speaking')) { earMark(); if (st === 'speaking') sayEnd = Date.now(); }
  if (OS.Ear) OS.Ear.playing = s === 'speaking';
  const talk = s === 'speaking' || s === 'thinking'; if (talk && !hush && !cfg().barge && !silent()) { hush = true; earOff(); } else if (!talk && hush) { hush = false; setTimeout(bgSync, 350); }
  st = s; if (s === 'speaking' && !silent()) setTimeout(bargeOn, 400); else bargeOff(); if (el) { el.dataset.st = s; const l = el.querySelector('.spy-st'); if (l) l.textContent = STL[s] || idleTxt(); el.querySelectorAll('.spy-m.talking').forEach(x => x.classList.remove('talking')); if (s === 'speaking') { const m = el.querySelectorAll('.spy-m.spyke'); m.length && m[m.length - 1].classList.add('talking'); } } if (s === 'idle') setTimeout(bgSync, 300); orb(); };
const bubbles = () => msgs.map(m => `<div class="spy-m ${m.r}"><div class="spy-bb">${esc(m.t)}${m.tap ? `<button class="btn xs pri spy-tap" data-act="spyTap">${UI.ic('play')}Ouvir</button>` : ''}</div></div>`).join('') + (live ? `<div class="spy-m user live"><div class="spy-bb">${esc(live)}</div></div>` : '');
const renderChat = () => { if (!el) return; const c = el.querySelector('.spy-chat'); if (!c) return; c.innerHTML = bubbles() || `<div class="spy-empty">Diz "Bom dia", pede uma tarefa ou pergunta qualquer coisa.</div>`; c.scrollTop = c.scrollHeight; if (st === 'speaking') setSt('speaking'); };
const push = (r, t) => { live = ''; msgs.push({ r, t: String(t) }); if (msgs.length > 40) msgs = msgs.slice(-40); renderChat(); };
const cap = (who, t) => { if (who === 'user') { live = t; renderChat(); } else push('spyke', t); };
const SUG = ['Bom dia', 'O que faço agora?', 'Agenda de amanhã', 'Os meus e-mails', 'Quanto gastei este mês?', 'Hábitos que faltam', 'Dá-me uma frase', 'Abre a Floresta'];
function draw() { if (!el) return; el.innerHTML = `<div class="spy-bg" data-act="spyClose"></div><div class="spy-card" role="dialog" aria-modal="true" aria-label="Spyke">
  <div class="spy-h"><b>SPYKE</b>${SR && cfg().always ? `<button type="button" class="spy-on" data-act="spyEar">${ear ? 'a ouvir · desligar' : 'microfone desligado · ligar'}</button>` : `<span class="spy-on">${cfg().clap ? 'palmas' : ''}</span>`}<button type="button" class="icon-btn" data-act="spyCfg" aria-label="Definições do Spyke">${UI.ic('settings')}</button><button class="icon-btn" data-act="spyClose" aria-label="Fechar">${UI.ic('x')}</button></div>
  <div class="spy-top"><canvas class="spy-orb" width="360" height="360" aria-hidden="true"></canvas><div class="spy-st"></div><div class="spy-dg"></div></div>
  <div class="spy-chat" aria-live="polite"></div>
  <div class="spy-dock"><div class="spy-sug">${SUG.map(s => `<button class="chip" data-act="spySug" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <form class="spy-f" data-form="spyAsk" autocomplete="off"><button type="button" class="spy-mic" data-act="spyListen" aria-label="Falar com o Spyke">${UI.ic('mic')}</button><input id="spyIn" name="q" class="field" placeholder="Escreve ou toca no microfone…" aria-label="Pergunta ao Spyke"><button class="btn spy-send" aria-label="Enviar">${UI.ic('right')}</button><button type="button" class="btn ghost spy-stop" data-act="spyStop" aria-label="Parar">${UI.ic('stop')}</button></form></div></div>`; renderChat(); setSt(st); diag(); }
const open = () => { if (!el) { el = document.createElement('div'); el.id = 'spy'; document.body.appendChild(el); } if (el.hidden !== false || !el.innerHTML) { el.hidden = false; draw(); } document.documentElement.classList.add('spy-open'); };
const close = () => { if (!el) return; S.stop(); armed = 0; conv = false; tapEar = 0; clearTimeout(lsT); el.hidden = true; cancelAnimationFrame(raf); raf = 0; document.documentElement.classList.remove('spy-open'); };
S.open = open; S.close = close; S.state = () => st; S.msgs = () => msgs.slice();
// som de "acordar" (gerado aqui, toca mesmo com o iPhone em silêncio)
let SFX = null;
const wakeSnd = () => { try { const rate = 22050, n = Math.round(rate * .9), b = new Uint8Array(n * 2); for (let i = 0; i < n; i++) { const t = i / rate, f = 180 + 900 * Math.pow(t / .9, 1.6), env = Math.min(1, t * 12) * Math.pow(1 - t / .9, 1.4), v = (Math.sin(2 * Math.PI * f * t) * .55 + Math.sin(2 * Math.PI * f * 2.01 * t) * .2 + Math.sin(2 * Math.PI * 1320 * t) * .12 * (t > .55 ? 1 : 0)) * env * .5, s = Math.max(-32767, Math.min(32767, Math.round(v * 32767))); b[2 * i] = s & 255; b[2 * i + 1] = (s >> 8) & 255; }
  let bin = ''; for (let i = 0; i < b.length; i += 8192) bin += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); if (!SFX) { SFX = document.createElement('audio'); SFX.setAttribute('playsinline', ''); document.body.appendChild(SFX); } SFX.src = wav({ b64: btoa(bin), rate }); const p = SFX.play(); p && p.catch(() => { }); } catch (e) { } };
S.wakeSound = () => wakeSnd();
S.wakeFx = () => { wakeAt = performance.now(); open(); wakeSnd(); cancelAnimationFrame(raf); raf = 0; orb(); };
function orb() { if (!el || el.hidden) return; const c = el.querySelector('.spy-orb'); if (!c) return; if (raf) return; const g = c.getContext('2d'), W = c.width, H = c.height, cx = W / 2, cy = H / 2; let t0 = performance.now(), sm = 0;
  const frame = now => { if (!el || el.hidden || !c.isConnected) { raf = 0; return; } const t = (now - t0) / 1000, wk = wakeAt ? Math.min(1, (now - wakeAt) / 1100) : 1;
    const lv = st === 'speaking' ? S.level() : 0; sm += (lv - sm) * .35;
    const base = st === 'listening' ? .32 + .12 * Math.sin(t * 6) : st === 'thinking' ? .22 + .06 * Math.sin(t * 9) : st === 'speaking' ? .18 + sm * .95 : .1;
    const R = W * .44 * (wk < 1 ? .2 + .8 * (1 - Math.pow(1 - wk, 3)) : 1);
    g.clearRect(0, 0, W, H); const grd = g.createRadialGradient(cx, cy, 6, cx, cy, R); grd.addColorStop(0, `rgba(120,230,255,${.5 + base * .45})`); grd.addColorStop(.38, `rgba(14,165,233,${.22 + base * .35})`); grd.addColorStop(1, 'rgba(14,165,233,0)'); g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    g.lineCap = 'round'; [[.78, 1.6, .9, 8], [.64, -1, .6, 3], [.52, .7, .45, 5], [.92, -.4, .3, 12]].forEach(([rr, sp, al, seg], k) => { const r0 = Math.max(2, R * rr + base * 16 * (k % 2 ? -1 : 1)); g.strokeStyle = `rgba(160,235,255,${al * (wk < 1 ? wk : 1)})`; g.lineWidth = k === 3 ? 1.4 : 2.6; for (let i = 0; i < seg; i++) { const a = t * sp * (st === 'thinking' ? 3 : 1) * (wk < 1 ? 4 - 3 * wk : 1) + i * Math.PI * 2 / seg; g.beginPath(); g.arc(cx, cy, r0, a, a + Math.PI * 2 / seg * .62 * (wk < 1 ? wk : 1)); g.stroke(); } });
    if (st === 'speaking') { g.strokeStyle = `rgba(200,245,255,${.25 + sm * .6})`; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, rr = R * .36 + sm * 22 * Math.sin(a * 6 + t * 10) * Math.sin(a * 3 - t * 7); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.stroke(); }
    if (wk < 1) { g.strokeStyle = `rgba(190,245,255,${1 - wk})`; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, Math.max(1, R * (.3 + wk * .9)), 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(232,250,255,.95)'; g.beginPath(); g.arc(cx, cy, Math.max(1, (R * .17 + base * 30) * (wk < 1 ? .4 + .6 * wk : 1)), 0, 7); g.fill();
    if (st === 'idle' && wk >= 1 && t > 1.2) { raf = 0; return; } raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame); }
A.spyOpen = () => { const was = !el || el.hidden; open(); if (was && st === 'idle' && !msgs.length) push('spyke', pickR([`Olá, ${name()}. Em que posso ajudar?`, 'Às ordens.', `Diz, ${name()}.`])); if (was) { wakeAt = performance.now(); orb(); } };
A.spyClose = () => close();
A.spyCfg = () => { close(); OS.go('definicoes.spyke'); setTimeout(() => window.scrollTo(0, 0), 50); };
A.spyListen = () => S.listen();
A.spyStop = () => S.stop();
A.spyClapTest = () => { if (!cfg().clap) OS.setOne('spyke', { clap: true }); try { const c = ac(); c && c.state !== 'running' && c.resume().catch(() => { }); } catch (e) { } stopClap(); setTimeout(bgSync, 50); const n0 = S._clap.n;
  UI.modal(`<div style="padding:18px"><div class="pn-h"><h3>Teste do microfone</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div><p class="mut" style="margin:0 0 10px">Fala ou bate palmas: a barra mexe com o som. Duas palmas seguidas contam como chamada.</p>
    <div class="spy-meter"><i id="spyLv"></i></div><p id="spyLvT" class="mut" style="margin:8px 0 0;font-size:13px">A abrir o microfone…</p></div>`);
  const iv = setInterval(() => { const b = document.getElementById('spyLv'), t = document.getElementById('spyLvT'); if (!b) return clearInterval(iv); const L = S._clap.lvl;
    b.style.width = Math.max(2, Math.min(100, (L > 0 ? L : 0) * 160)) + '%'; t.textContent = !clapSt || !clapSt.ms ? 'A abrir o microfone… (se o iPhone perguntar, toca em Permitir)' : L < 0 ? 'O som está em pausa: toca no ecrã.' : S._clap.muted ? 'O microfone está mudo: outra app ou a escuta de voz pode estar a usá-lo.' : (S._clap.n - n0) + ' chamadas por palmas detetadas'; }, 120); };
A.spyEar = () => { if (ear) earQuit(false); else { earStopped = false; earBlock = 0; earTaps = 0; convGo(); bgSync(); UI.toast('O Spyke está a ouvir', 'pos'); } setTimeout(() => { if (el && !el.hidden) { const b = el.querySelector('.spy-on'); if (b && b.tagName === 'BUTTON') b.textContent = ear ? 'a ouvir · desligar' : 'microfone desligado · ligar'; } }, 300); };
A.spyTap = () => { msgs.forEach(m => { m.tap = 0; }); const t = needTap; needTap = ''; renderChat(); S.say(t, { tap: true, again: true }); };
A.spySug = b => { conv = false; S.handle(b.dataset.q); };
OS.forms.spyAsk = f => { const q = f.elements.q.value.trim(); conv = false; if (q) setTimeout(() => S.handle(q), 0); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && el && !el.hidden) close(); });

/* ================= como o Spyke pensa: Gemini (grátis) ou Claude (pago, o mais inteligente) ================= */
const brainPanel = c => { const cl = c.brain === 'claude', M = OS.Brain ? OS.Brain.MODELS : [];
  return `<div class="pn" id="spyBrainSel"><div class="pn-h"><h3>Como o Spyke pensa</h3><small class="mut">${OS.Brain && OS.Brain.which() === 'claude' ? 'Claude' : 'Gemini'}</small></div>
    <p class="mut" style="margin:0 0 8px;font-size:13px">Em qualquer dos dois, o Spyke pensa sozinho: consulta os teus dados, pesquisa na internet sem sair da app e faz coisas por ti (tarefas, agenda, gastos, hábitos, rascunhos de e-mail).</p>
    <div class="spy-eng">${[['gemini', 'Gemini', 'grátis, com a chave do Google'], ['claude', 'Claude', 'o mais inteligente, pago à parte']].map(([v, l, d]) => `<button type="button" class="spy-ec ${(c.brain || 'gemini') === v ? 'on' : ''}" data-act="spyBrain" data-v="${v}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>
    ${cl ? `${c.anKey ? '' : `<ol class="spy-steps"><li>Abre <a class="acc" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> e cria uma conta.</li><li><b>Billing</b> → carrega créditos (o mínimo é 5 dólares; o Spyke gasta cêntimos por conversa).</li><li><b>API Keys</b> → <b>Create Key</b> → copia a chave (começa por sk-ant-).</li><li>Cola aqui e toca em <b>Testar</b>.</li></ol>`}
      <div class="ws-form"><label>Chave da Anthropic<input class="field" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" data-bind="spyke.anKey" value="${esc(c.anKey || '')}" placeholder="sk-ant-…"></label>
        <label>Modelo<select class="field" data-bind="spyke.anModel">${M.map(([v, l]) => `<option value="${v}"${(c.anModel || M[0][0]) === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>
      <div class="row gap8" style="margin-top:8px"><button class="btn sm pri" data-act="spyBrainTest" ${c.anKey ? '' : 'disabled'}>${UI.ic('zap')}Testar</button></div>
      <small class="mut">A chave fica só nos teus aparelhos e no teu Google Drive. Se o Claude falhar, o Spyke responde com o Gemini.</small>` : ''}</div>`; };
A.spyBrain = b => { OS.setOne('spyke', { brain: b.dataset.v }); OS.Brain && OS.Brain.reset(); };
A.spyBrainTest = async () => { UI.toast('A testar…'); const r = await OS.Brain.test(); UI.toast(r.ok ? 'O Claude está ligado e a pensar' : r.msg || 'Não consegui ligar', r.ok ? 'pos' : 'warn'); };

/* ================= estado do Spyke: tudo o que ele usa, verificado num só sítio ================= */
const SCRV = 11; let chkBusy = false;
const statePanel = () => { const c = ib(), v = +(c.ver || 0), hasScr = !!(c.url && c.key), ai = !!(OS.AI && OS.AI.key()), aiSt = U.ls.get('os2aiOk', null), mail = OS.Mail && OS.Mail.counts ? OS.Mail.counts() : {};
  const row = (ok, t, d) => `<div class="spy-chk ${ok === true ? 'ok' : ok === false ? 'bad' : 'wait'}"><i>${ok === true ? '✓' : ok === false ? '✗' : '!'}</i><div><b>${t}</b><small>${d}</small></div></div>`;
  const oldScr = hasScr && v < SCRV;
  return `<div class="pn" id="spyState"><div class="pn-h"><h3>Estado do Spyke</h3><button class="btn sm" data-act="spyCheckAll" ${chkBusy ? 'disabled' : ''}>${UI.ic('sync')}${chkBusy ? 'A verificar…' : 'Verificar tudo'}</button></div>
    <div class="spy-chks">
    ${row(ai ? (aiSt && aiSt.ok === false ? false : true) : false, 'Cérebro (IA)', ai ? (aiSt && aiSt.ok === false ? esc(aiSt.msg || 'a chave não funciona') : 'ligado: conversa, decisões, resumos, e-mails, fotos') : 'desligado: cola a chave em "Cérebro do Spyke", aqui em baixo')}
    ${row(SR || silent() ? (ear ? true : null) : false, 'Microfone', !SR && !silent() ? 'este navegador não reconhece voz' : ear ? 'a ouvir agora' + (ear === OS.Ear ? ' (silencioso · ' + OS.Ear.engine() + ')' : '') : earStopped ? 'desligado por ti: toca no microfone ou diz "volta a ouvir"' : cfg().always ? 'parado: toca no microfone para começar' : '"Ouvir sempre" está desligado')}
    ${row(hasScr ? (v >= SCRV ? true : false) : false, 'Script Google', !hasScr ? 'não está ligado neste aparelho: Definições → Sincronizar aparelhos → Recuperar os meus dados' : v >= SCRV ? 'versão ' + v + ': notícias, e-mail, Siri e sincronização' : 'versão ' + (v || 'antiga') + ': falta atualizar para a versão ' + SCRV + ' (passo a passo abaixo)')}
    ${row(hasScr && v >= SCRV ? (OS.News && OS.News.old ? false : true) : false, 'Notícias', hasScr && v >= SCRV ? 'prontas no Jornal e no resumo do dia' : 'precisam do script Google atualizado')}
    ${row(hasScr && v >= SCRV ? (OS.one('integ').gcal ? true : null) : false, 'Agenda Google', hasScr && v >= SCRV ? (OS.one('integ').gcal ? 'ligada: os teus eventos aparecem no Calendário' : 'pronta: liga-a no Calendário') : 'precisa do script Google atualizado')}
    ${row(hasScr && v >= SCRV ? (mail.at ? true : null) : false, 'E-mail', hasScr && v >= SCRV ? (mail.at ? 'ligado' : 'falta ligar o Gmail: página E-mail → Atualizar') : 'precisa do script Google atualizado')}
    </div>
    ${oldScr ? `<div class="spy-upd"><b>O script Google está desatualizado (versão ${v || 'antiga'})</b><p class="mut" style="margin:4px 0 0">Atualiza-o em <a class="acc" href="#definicoes.script">Definições → Script Google</a>: lá estão todas as partes, com o passo a passo. Depois volta aqui e toca em <b>Verificar tudo</b>.</p></div>` : ''}</div>`; };
A.spyCheckAll = async () => { if (chkBusy) return; chkBusy = true; OS.request();
  try { if (OS.AI && OS.AI.key() && OS.AI.test) await OS.AI.test(); if (OS.Inbox && OS.Inbox.check && ib().url) await OS.Inbox.check(); if (OS.UniMail && OS.UniMail.check && ib().url) await OS.UniMail.check();
    if (OS.News && +(ib().ver || 0) >= SCRV) { OS.News.old = false; try { await OS.News.headlines(3); } catch (e) { } } } catch (e) { }
  chkBusy = false; OS.request(); const c = ib(), v = +(c.ver || 0), aiSt = U.ls.get('os2aiOk', null);
  UI.toast(!c.url ? 'O script Google não está ligado neste aparelho.' : v < SCRV ? 'Falta atualizar o script Google (versão ' + (v || 'antiga') + ').' : aiSt && aiSt.ok === false ? 'O script está bem, mas a chave da IA não funciona.' : 'Tudo verificado.', v >= SCRV && !(aiSt && aiSt.ok === false) ? 'pos' : 'warn'); };

/* ================= página do Spyke ================= */
V.spyke = sub => { const c = cfg(), ibc = ib(), link = op => ibc.url && ibc.key ? ibc.url.trim() + (ibc.url.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(ibc.key) + '&op=' + op : '';
  if (sub === 'bomdia') { try { history.replaceState(null, '', '#definicoes.spyke'); } catch (e) { } setTimeout(() => { open(); S.say(S.brief()); }, 300); }
  return UI.head('Spyke', 'O teu assistente de voz: fala contigo, resume o dia e faz coisas por ti.', `<button class="btn pri" data-act="spyBrief">${UI.ic('play')}Resumo do dia</button>`) + `<div class="spy-page">${statePanel()}${OS.AI && OS.AI.panel ? OS.AI.panel() : ''}${brainPanel(c)}
  <div class="pn"><div class="pn-h"><h3>Voz do Spyke</h3><small class="mut">${esc(engine ? 'última: ' + engine : '')}</small></div>
    <div class="spy-eng">${[['auto', 'Automática', 'a melhor que estiver ligada'], ['azure', 'Microsoft', 'humana, grátis ~9 h/mês'], ['eleven', 'ElevenLabs', 'a mais humana, 10 min/mês'], ['gemini', 'IA Gemini', 'com a tua chave da IA'], ['device', 'Aparelho', 'sem internet, mais robótica']].map(([v, l, d]) => `<button type="button" class="spy-ec ${(c.eng || 'auto') === v ? 'on' : ''}" data-act="spyEng" data-v="${v}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>
    ${voiceErr ? `<div class="ib-st bad" style="margin-top:8px">Na última vez: ${esc(voiceErr)}</div>` : ''}
    <div class="spy-vb" id="spyAz"><h4>Microsoft · voz humana grátis (recomendada)</h4>
      <p class="mut" style="margin:0 0 8px;font-size:13px">Voz neural oficial da Microsoft, masculina e natural, sempre em português. Grátis até 500 mil caracteres por mês (umas 8 a 9 horas de fala).</p>
      ${c.azKey ? '' : `<ol class="spy-steps"><li>Abre <a class="acc" href="https://portal.azure.com" target="_blank" rel="noopener">portal.azure.com</a> e entra com uma conta Microsoft. És estudante: usa <a class="acc" href="https://azure.microsoft.com/free/students" target="_blank" rel="noopener">Azure for Students</a> (não pede cartão).</li><li>Na pesquisa lá em cima escreve <b>Speech</b> → <b>Serviços de Voz / Speech services</b> → <b>Criar</b>.</li><li>Grupo de recursos: <b>Criar novo</b> → "nautilo". Região: <b>West Europe</b>. Nome: "nautilo-voz". Escalão de preço: <b>Free F0</b> → <b>Rever + criar</b> → <b>Criar</b>.</li><li>Quando acabar: <b>Ir para o recurso</b> → <b>Chaves e Ponto Final</b> → copia a <b>CHAVE 1</b> e a <b>Localização/Região</b> (ex.: westeurope).</li><li>Cola aqui as duas e toca em <b>Ouvir</b>.</li></ol>`}
      <div class="ws-form"><label>Chave (CHAVE 1)<input class="field" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" data-bind="spyke.azKey" value="${esc(c.azKey || '')}" placeholder="32 letras e números"></label>
        <label>Região<input class="field" autocomplete="off" autocapitalize="none" spellcheck="false" data-bind="spyke.azRegion" value="${esc(c.azRegion || 'westeurope')}" placeholder="westeurope"></label>
        <label>Voz<select class="field" data-bind="spyke.azVoice">${AZV.map(([v, l]) => `<option value="${esc(v)}"${(c.azVoice || AZV[0][0]) === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>
      <div class="row gap8" style="margin-top:8px"><button class="btn sm pri" data-act="spyTest" data-e="azure" ${c.azKey ? '' : 'disabled'}>${UI.ic('play')}Ouvir</button></div></div>
    <div class="spy-vb"><h4>ElevenLabs · vozes de homem que parecem pessoas reais</h4>
      ${c.elKey ? '' : `<ol class="spy-steps"><li>Cria uma conta grátis em <a class="acc" href="https://elevenlabs.io/app/sign-up" target="_blank" rel="noopener">elevenlabs.io</a> (o plano grátis dá cerca de 10 minutos de fala por mês; o plano de 5 dólares dá 30).</li><li>No ElevenLabs: o teu perfil (canto inferior esquerdo) → <b>API Keys</b> → <b>Create API Key</b> → copia.</li><li>Cola aqui em baixo e toca em <b>Carregar vozes</b>.</li></ol>`}
      <div class="ws-form"><label>Chave do ElevenLabs<input class="field" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" data-bind="spyke.elKey" value="${esc(c.elKey || '')}" placeholder="sk_…"></label>
        <label>Voz<select class="field" data-bind="spyke.elVoice">${(S.elVoices || c.elList || EL).map(([v, l]) => `<option value="${esc(v)}"${(c.elVoice || EL[0][0]) === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label>Qualidade<select class="field" data-bind="spyke.elModel"><option value="eleven_multilingual_v2"${c.elModel !== 'eleven_flash_v2_5' ? ' selected' : ''}>Máxima (mais natural)</option><option value="eleven_flash_v2_5"${c.elModel === 'eleven_flash_v2_5' ? ' selected' : ''}>Rápida (gasta metade)</option></select></label></div>
      <div class="row gap8" style="margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-act="spyElLoad" ${c.elKey ? '' : 'disabled'}>${UI.ic('sync')}Carregar vozes</button><button class="btn sm pri" data-act="spyTest" data-e="eleven" ${c.elKey ? '' : 'disabled'}>${UI.ic('play')}Ouvir</button></div>
      <small class="mut">Para sotaque brasileiro perfeito: no ElevenLabs → Voices → Voice Library, procura "Brazilian male deep", adiciona a voz e carrega a lista aqui outra vez.</small></div>
    <div class="spy-vb"><h4>IA Gemini</h4><div class="ws-form"><label>Voz<select class="field" data-bind="spyke.voice">${VOICES.map(([v, l]) => `<option value="${v}"${c.voice === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div class="row gap8" style="margin-top:8px"><button class="btn sm" data-act="spyTest" data-e="gemini" ${OS.AI && OS.AI.key() ? '' : 'disabled'}>${UI.ic('play')}Ouvir</button>${OS.AI && OS.AI.key() ? '' : '<small class="mut">Precisa do cérebro do Spyke ligado (acima).</small>'}</div></div>
    <div class="ws-form" style="margin-top:10px"><label>Sotaque<select class="field" data-bind="spyke.accent"><option value="BR"${c.accent === 'BR' ? ' selected' : ''}>Brasil</option><option value="PT"${c.accent === 'PT' ? ' selected' : ''}>Portugal</option></select></label>
      <label>Velocidade<select class="field" data-bind="spyke.speed">${[['0.9', 'Calma'], ['1', 'Normal'], ['1.1', 'Rápida']].map(([v, l]) => `<option value="${v}"${String(c.speed) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <p class="mut" style="font-size:12.5px;margin:8px 0 0">Se não ouvires nada: tira o iPhone do modo silencioso e sobe o volume.</p></div>
  <div class="pn"><div class="pn-h"><h3>Ouvir</h3><small class="mut">${SR || silent() ? (ear ? 'a ouvir agora' : earStopped ? 'desligado por ti' : earErr && earErr !== 'no-speech' && earErr !== 'aborted' ? 'erro: ' + esc(earErr) : 'parado') : 'sem reconhecimento de voz'}</small></div>
    <div class="ws-form" style="margin-bottom:8px"><label>Como ouve<select class="field" data-bind="spyke.ear"><option value="auto"${c.ear !== 'ditado' ? ' selected' : ''}>Silencioso, sem som do microfone (recomendado)${OS.Ear && OS.Ear.engine() ? ' · ' + OS.Ear.engine() : ''}</option><option value="ditado"${c.ear === 'ditado' ? ' selected' : ''}>Ditado do iPhone (faz um som ao ligar e desligar)</option></select></label>
      <label>Espera antes de responder<select class="field" data-bind="spyke.pausa">${[['0.8', 'Pouco (0,8 s)'], ['1.2', 'Normal (1,2 s)'], ['1.6', 'Mais (1,6 s)'], ['2.2', 'Muito (2,2 s) — para pensar a falar']].map(([v, l]) => `<option value="${v}"${String(c.pausa || 1.2) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
    ${OS.Ear && !OS.Ear.engine() ? '<p class="note" style="margin:0 0 8px">A escuta silenciosa precisa do cérebro do Spyke (a chave grátis do Google, mais abaixo) para perceber o que dizes. Sem ela usa o ditado do iPhone.</p>' : ''}
    <label class="switch"><input type="checkbox" data-bind="spyke.always" ${c.always ? 'checked' : ''} ${SR || silent() ? '' : 'disabled'}><span></span>Ouvir sempre com a app aberta: começa a ouvir sozinho quando entras (sem tocar em nada) e só para quando disseres <b>"para de ouvir"</b></label>
    <div class="ws-form" style="margin-top:8px"><label>Quando responde<select class="field" data-bind="spyke.convWin">${[['-1', 'Só quando digo "Spyke" (recomendado)'], ['30', 'Sem o nome durante 30 s depois de falar comigo'], ['120', 'Sem o nome durante 2 minutos'], ['0', 'Sempre (responde a tudo o que ouvir)']].map(([v, l]) => `<option value="${v}"${String(c.convWin) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <small class="mut">Com "Só quando digo Spyke" ele ignora barulho, televisão e conversas: diz <b>"Spyke, …"</b> e o pedido na mesma frase (ou só "Spyke" e espera pelo "Sim?"). Tocar no microfone também o faz ouvir a próxima frase.</small>
    ${(() => { const L = S.wakeLog(); return L.length ? `<details class="spy-wl" style="margin-top:8px"><summary class="mut" style="font-size:12.5px;cursor:pointer">O que o fez acordar (últimas ${L.length} vezes)</summary><ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px">${L.map(x => `<li><span class="mut">${esc(new Date(x.at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))} · ${esc(x.e)}:</span> “${esc(x.t)}”</li>`).join('')}</ul><small class="mut">É o que ele percebeu em cada vez. Se alguma não foste tu a chamar, aqui vês porquê.</small></details>` : ''; })()}
    <label class="switch" style="margin-top:10px"><input type="checkbox" data-bind="spyke.clap" ${c.clap ? 'checked' : ''}><span></span>Duas palmas para chamar</label>
    ${c.clap ? `<div class="ws-form" style="margin-top:8px"><label>Sensibilidade das palmas<input type="range" min="1" max="9" data-bind="spyke.sens" value="${c.sens}"></label></div><button class="btn sm" data-act="spyClapTest" style="margin-top:6px">${UI.ic('mic')}Testar o microfone e as palmas</button>` : ''}
    <label class="switch" style="margin-top:10px"><input type="checkbox" data-bind="spyke.morning" ${c.morning ? 'checked' : ''}><span></span>De manhã, ao abrir a app pela primeira vez, o Spyke dá o resumo do dia</label>
    <div class="spy-note"><b>Para o iPhone não pedir o microfone sempre</b><small>${MICSET}. Na app do ecrã principal o iPhone pode voltar a perguntar uma vez cada vez que a abres: é uma regra da Apple para apps web.</small></div>
    <div class="spy-note"><b>Com a app fechada</b><small>O iPhone não deixa nenhuma app web ouvir em segundo plano: quando sais do NÁUTILO o microfone desliga-se e volta a ligar sozinho quando voltas. Para chamar o Spyke com a app fechada diz <b>"E aí Siri, abre o NÁUTILO"</b> (abre já a ouvir) ou usa os Atalhos vocais do guia em baixo.</small></div>
    ${SR ? '' : '<p class="neg" style="font-size:12.5px;margin:8px 0 0">Este navegador não tem reconhecimento de voz: usa o Safari no iPhone ou o Chrome.</p>'}</div>
  <div class="pn"><div class="pn-h"><h3>Conversa</h3></div>
    <label class="switch"><input type="checkbox" data-bind="spyke.cont" ${c.cont ? 'checked' : ''}><span></span>Conversa contínua: depois de responder continua a ouvir sem dizeres o nome outra vez</label>
    <label class="switch" style="margin-top:8px">${silent() ? `<input type="checkbox" data-bind="spyke.bargeS" ${c.bargeS !== false ? 'checked' : ''}><span></span>Interromper falando: se começares a falar enquanto ele fala, ele pára logo e ouve-te (se for só o eco da voz dele, continua). Podes sempre tocar no ecrã para o parar.` : `<input type="checkbox" data-bind="spyke.barge" ${c.barge ? 'checked' : ''} ${SR ? '' : 'disabled'}><span></span>Interromper por voz: diz "Spyke, para" enquanto ele fala (com o ditado do iPhone ele pode ouvir a própria voz e interromper-se). Podes sempre tocar no ecrã para o parar.`}</label>
    <label class="switch" style="margin-top:8px"><input type="checkbox" data-bind="spyke.alerts" ${c.alerts ? 'checked' : ''}><span></span>Avisos no ecrã: 30 e 10 min antes dos compromissos, contas do dia, tarefas às 18h, prova amanhã, inegociáveis às 21h (nunca entre as 23h e as 8h). Tocas no aviso para o ouvir</label>
    <label class="switch" style="margin-top:8px"><input type="checkbox" data-bind="spyke.alertVoz" ${c.alertVoz ? 'checked' : ''}><span></span>Ler os avisos em voz alta sozinho, sem eu chamar (desligado: o Spyke só fala quando dizes o nome dele)</label>
    <label class="switch" style="margin-top:8px"><input type="checkbox" data-bind="spyke.newsBrief" ${c.newsBrief ? 'checked' : ''}><span></span>Três notícias no resumo do dia</label>
    <label class="switch" style="margin-top:8px"><input type="checkbox" data-bind="spyke.jarvisStart" ${c.jarvisStart ? 'checked' : ''}><span></span>Abrir o modo Jarvis quando abro a app</label></div>
  <div class="pn"><div class="pn-h"><h3>Memória</h3><small class="mut">${OS.all('spymem').length} coisas</small></div>
    <p class="mut" style="margin:0 0 8px;font-size:13px">Diz "Spyke, lembra-te que a minha mãe faz anos a 3 de março" e ele guarda. Ele também aprende sozinho o que lhe contas nas conversas. "Esquece…" apaga.</p>
    <div class="list">${U.sortBy(OS.all('spymem'), m => m.date || '').reverse().slice(0, 40).map(m => `<div class="li"><div class="li-t"><b style="font-weight:500">${esc(m.text)}</b><small>${m.src === 'ia' ? 'aprendido numa conversa' : m.src === 'voz' ? 'disseste-me' : 'escrito por ti'} · ${U.fmtDS(m.date || U.today())}</small></div><div class="li-r"><button class="icon-btn" data-act="spyMemDel" data-id="${m.id}" aria-label="Esquecer">${UI.ic('trash')}</button></div></div>`).join('') || UI.empty('Ainda sem memórias.')}</div>
    <form class="fb-add" data-form="spyMem" style="grid-template-columns:minmax(0,1fr) auto"><input class="field" name="t" placeholder="Ex.: Prefiro treinar de manhã" required><button class="btn">${UI.ic('plus')}Guardar</button></form></div>
  <div class="pn"><div class="pn-h"><h3>Rotinas por voz</h3>${UI.addBtn('spyroutines', 'Nova rotina', null, 'sm')}</div>
    <div class="spy-cmds">${[['"Bom dia"', 'clima, agenda, prioridades, hábitos, e-mails, contas, provas, treino, notícias e a verdade do dia'], ['"Boa noite"', 'o balanço do dia, o que ficou por fazer e o plano de amanhã'], ['"Modo estudo"', 'próxima prova, revisões e cartões; abre o Bloco de foco da universidade'], ['"Modo treino"', 'o treino de hoje e abre o Treino'], ['"Modo trabalho"', 'o próximo turno e as tarefas dos projetos de trabalho'], ['"Modo Jarvis"', 'abre o painel']].map(([a, b]) => `<div><b>${a}</b><small>${b}</small></div>`).join('')}
    ${OS.all('spyroutines').map(r => `<div class="click" data-edit="spyroutines:${r.id}"><b>"${esc(r.phrase)}"</b><small>${esc(String(r.steps || '').split('\n').filter(Boolean).join(' · ').slice(0, 120))}</small></div>`).join('')}</div>
    <small class="mut">Numa rotina tua, cada linha é um comando como dirias ao Spyke: "abre a Floresta", "clima", "notícias", "o que faço agora".</small></div>
  <div class="pn fb-guide"><h3>Com a app fechada: Siri e "Atalhos vocais"</h3>${siriReady() ? '' : `<p class="neg" style="margin:0 0 6px">Precisa do script Google na versão 9 (o mesmo do e-mail). <a class="acc" href="#definicoes.email">Ver passos</a></p>`}
    <label class="switch"><input type="checkbox" data-bind="spyke.siri" ${c.siri ? 'checked' : ''}><span></span>Enviar o resumo do dia para o teu script (a Siri lê-o com a app fechada)</label>
    <label class="switch" style="margin-top:6px"><input type="checkbox" data-bind="spyke.siriAsk" ${c.siriAsk ? 'checked' : ''}><span></span>Deixar a Siri fazer perguntas ao Spyke (guarda a tua chave Gemini no teu script Google)</label>
    <ol><li><b>Atalho "Bom dia Spyke":</b> app Atalhos → + → <b>Obter conteúdo do URL</b> com o link 1 → <b>Falar texto</b> (Conteúdo do URL; toca ▸ → Voz: escolhe uma voz masculina em português, ex.: Felipe) → opcional: <b>Abrir URL</b> <code>${esc(location.origin + location.pathname)}#spyke.bomdia</code>.</li>
      <li><b>Atalho "Spyke" (perguntas):</b> <b>Ditar texto</b> → <b>Obter conteúdo do URL</b> com o link 2, toca ▸ → Método <b>POST</b> → Corpo <b>Formulário</b> → campo <code>q</code> = Texto ditado → <b>Falar texto</b>.</li>
      <li><b>Sem dizer "E aí Siri":</b> Ajustes → Acessibilidade → <b>Atalhos vocais</b> → Configurar → escolhe o atalho "Spyke" → frase <b>"Spyke"</b> (repete 3 vezes). Funciona até com o iPhone bloqueado.</li>
      <li><b>Em vez de palmas:</b> Ajustes → Acessibilidade → Toque → <b>Tocar atrás</b> → Toque duplo → "Spyke". Ou o botão de Ação (iPhone 15 Pro ou mais recente).</li></ol>
    ${link('brief') ? `<div class="ib-link"><code>1 · ${esc(link('brief'))}</code><button class="btn sm" data-act="spyCopy" data-op="brief">Copiar</button></div><div class="ib-link"><code>2 · ${esc(link('ask'))}</code><button class="btn sm" data-act="spyCopy" data-op="ask">Copiar</button></div><button class="btn sm ghost" data-act="spyPush" ${siriReady() ? '' : 'disabled'}>${UI.ic('sync')}Enviar o resumo agora</button>` : ''}
    <p class="mut" style="font-size:12.5px">Os links têm a tua chave: não os partilhes.</p></div>
  <div class="pn"><div class="pn-h"><h3>O que podes dizer</h3></div><div class="spy-cmds">${[['"Bom dia" / "Resumo"', 'agenda, prioridades, hábitos, e-mails, contas, provas, treino e a verdade do dia'], ['"O que faço agora?"', 'a próxima ação pela prioridade da app'], ['"Agenda de amanhã"', 'o dia seguinte'], ['"Anota estudar Estatística amanhã !1"', 'cria tarefa (datas, @contexto e !prioridade)'], ['"Gastei 12 euros no almoço"', 'regista a despesa com a categoria certa'], ['"Quanto gastei este mês?" / "Saldo"', 'finanças'], ['"Os meus e-mails" / "LinkedIn"', 'resumo do que precisa de atenção'], ['"Abre a Floresta"', 'abre qualquer página'], ['"Quero focar"', 'abre o Bloco de foco'], ['"Versículo" / "Dá-me uma frase"', 'Fé e motivação'], ['Qualquer outra pergunta', 'responde com a IA, com os teus dados']].map(([a, b]) => `<div><b>${esc(a)}</b><small>${esc(b)}</small></div>`).join('')}</div></div></div>`; };
A.spyMemDel = b => OS.del('spymem', b.dataset.id);
OS.forms.spyMem = f => { const t = f.elements.t.value.trim(); if (t && !memAdd(t, 'manual')) UI.toast('Isso já está na memória'); };
A.spyBrief = () => { open(); S.say(S.brief(), { tap: true }); };
A.spyTest = b => { open(); S.say(`Olá, ${name()}. Esta é a minha voz. Quando precisares de mim, é só chamar.`, { tap: true, eng: b && b.dataset && b.dataset.e }); };
A.spyEng = b => OS.setOne('spyke', { eng: b.dataset.v });
A.spyElLoad = async () => { const c = cfg(); if (!c.elKey) return; UI.toast('A carregar as vozes…');
  try { const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': c.elKey } }); if (!r.ok) throw new Error(r.status === 401 ? 'chave inválida' : 'erro ' + r.status); const j = await r.json();
    const L = (j.voices || []).filter(v => !v.labels || !v.labels.gender || /male/i.test(v.labels.gender) && !/female/i.test(v.labels.gender)).map(v => [v.voice_id, v.name + ' · ' + [v.labels && (v.labels.description || v.labels.descriptive), v.labels && v.labels.accent, v.category === 'premade' ? '' : 'tua'].filter(Boolean).join(', ')]);
    if (!L.length) throw new Error('não há vozes masculinas na conta'); S.elVoices = L; const deep = L.find(x => /daniel|adam|brian|deep|grave/i.test(x[1])) || L[0];
    OS.setOne('spyke', { elList: L.slice(0, 80), elVoice: L.some(x => x[0] === c.elVoice) ? c.elVoice : deep[0], eng: c.eng === 'device' ? 'auto' : c.eng }); UI.toast(L.length + ' vozes masculinas carregadas', 'pos'); }
  catch (e) { UI.toast('ElevenLabs: ' + (e.message || 'erro'), 'neg'); } };
A.spyPush = async () => { UI.toast('A enviar…'); UI.toast(await S.push(true) ? 'Resumo enviado: a Siri já o pode ler.' : 'Não consegui enviar. Confirma o script (versão 9).', 'pos'); };
A.spyCopy = async b => { const c = ib(), u = c.url.trim() + (c.url.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(c.key) + '&op=' + b.dataset.op; try { await navigator.clipboard.writeText(u); UI.toast('Link copiado', 'pos'); } catch (e) { UI.modal(`<div style="padding:18px"><b>Copia o link</b><textarea readonly style="width:100%;height:110px;font:12px var(--mono);margin-top:8px" onfocus="this.select()">${esc(u)}</textarea><div style="text-align:right;margin-top:10px"><button class="btn" data-mclose>Fechar</button></div></div>`); } };

/* resumo da manhã: primeira abertura do dia entre as 5h e as 12h */
OS.on('ready', () => { setTimeout(bgSync, 1500); const h = new Date().getHours(), t = U.today();
  if (navigator.webdriver || !cfg().morning || h < 5 || h >= 12 || U.ls.get('os2spMorning', '') === t || /^#(definicoes\.)?spyke/.test(location.hash)) return; U.ls.set('os2spMorning', t);
  setTimeout(() => { if (OS.FocusBlock && OS.FocusBlock.state()) return; S.morning(); }, 1800); });
// aviso discreto (não tapa a app): o toque também desbloqueia o som no iPhone
S.morning = () => { const b = document.createElement('button'); b.type = 'button'; b.className = 'spy-morn'; b.innerHTML = `<i>${UI.ic('mic')}</i><span><b>${new Date().getHours() < 12 ? 'Bom dia' : 'Olá'}, ${esc(name())}</b><small>Toca para o Spyke te dar o resumo do dia</small></span><em aria-hidden="true">×</em>`;
  b.onclick = e => { b.remove(); if (e.target.closest('em')) return; open(); S.say(S.brief(), { tap: true }); }; document.body.appendChild(b); setTimeout(() => b.remove(), 30000); };
})();
