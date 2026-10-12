/* OCEANUM — Bioimpedância com IA: tiras uma foto (ou envias o PDF) do resultado do exame, a IA lê todos os valores,
   e depois analisa-os com o teu treino, dieta e objetivo para dizer onde tens de melhorar e como. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, BX = OS.BodyX;
const n = v => U.num(v) || 0;

/* ================= IA (Google Gemini, chave grátis do utilizador) ================= */
const AI = OS.AI = {};
AI.key = () => OS.one('diet').aiKey || '';
/* A IA do OCEANUM é o Spyke: uma só chave (Gemini, grátis) liga tudo o que usa IA — exames, fotos da comida, investimentos,
   universidade, e-mails, notícias, decisões, conversa com o Spyke. Liga-se num só sítio: Definições → Spyke. */
AI.uses = ['conversar com o Spyke e a voz Gemini', 'decisões (Centro de decisões)', 'e-mails e LinkedIn', 'notícias resumidas e traduzidas', 'fotos da comida', 'exames de bioimpedância', 'investimentos e empresas', 'universidade (resumos, cartões, testes)', 'escala do trabalho por foto', 'Fé, biografia e treinador de desporto'];
const STEPS = `<ol class="ai-steps"><li>Abre <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> com a tua conta Google.</li><li>Toca em <b>Create API key</b> (Criar chave) e copia a chave.</li><li>Cola-a aqui e toca em <b>Ligar</b>.</li></ol>`;
const FORM = act => `<div class="row gap8 ai-row"><input class="field grow" data-aikey placeholder="Cola aqui a chave (começa por AIza…)" autocomplete="off" autocapitalize="none" spellcheck="false"><button class="btn pri" data-act="aiKeySave" data-next="${act || ''}">Ligar</button></div>`;
const moved = () => OS.Move && !OS.Move.isOld && !U.ls.get('os2sync', 0) ? `<small class="mut">Já tinhas o Spyke ligado no endereço antigo? <a href="#definicoes" data-act="mvWelcome">Traz os teus dados</a> e a chave vem com eles.</small>` : '';
// cartão pequeno onde uma função precisa da IA: o mesmo em toda a app. A configuração (chave, passos) vive só em Definições → Spyke.
AI.setup = act => `<div class="ai-off"><div class="ai-h"><span class="ai-orb" aria-hidden="true"></span><div><b>Esta função usa o Spyke, a IA do OCEANUM</b><small>Liga a IA uma vez em Definições e tudo o que usa IA passa a funcionar na app inteira.</small></div></div>
  <a class="btn pri sm ai-go" href="#definicoes.spyke">${UI.ic('settings')}Ligar em Definições → Spyke</a></div>`;
// dentro de uma janela, o botão leva às Definições e fecha a janela logo a seguir (depois de navegar)
document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#modal .ai-go')) setTimeout(() => UI.closeModal(), 0); });
// secção central (Definições → Spyke)
AI.panel = () => { const k = AI.key(), st = U.ls.get('os2aiOk', null);
  return `<div class="pn" id="spyBrain"><div class="pn-h"><h3>Cérebro do Spyke (IA)</h3><span class="bdg ${k ? (st && st.ok === false ? 'neg' : 'pos') : ''}">${k ? (st && st.ok === false ? 'chave com problema' : 'ligado') : 'desligado'}</span></div>
    <p class="mut" style="margin:0 0 8px;font-size:13px">Uma só ligação para a app inteira: ${AI.uses.join(', ')}.</p>
    <div class="ai-eng"><b>Sem limites e sem pagar:</b> a app usa os modelos mais recentes do Google (descobertos sozinhos: ${esc(MODELS.slice(0, 3).join(', '))}${MODELS.length > 3 ? '…' : ''}) e, quando a cota grátis de um acaba, passa logo ao seguinte. Se todos acabarem, responde a <b>IA grátis de reserva</b> (modelo aberto GPT-OSS, sem chave).${AI.lastEngine ? ` <small class="mut">Última resposta: ${esc(AI.lastEngine === 'reserva' ? 'IA de reserva' : AI.lastEngine)}.</small>` : ''}
      <label class="ai-free"><input type="checkbox" data-act="aiFreeTg" ${AI.freeOn() ? 'checked' : ''}> Usar a IA grátis de reserva quando o Google não responder <small class="mut">(o texto do pedido vai para a Pollinations; fotos e e-mails só pelo Google)</small></label></div>
    ${k ? `<div class="row gap8" style="flex-wrap:wrap"><code class="ai-k">${'•'.repeat(8) + esc(k.slice(-4))}</code><button class="btn sm" data-act="aiTest">${UI.ic('zap')}Testar</button><button class="btn sm ghost" data-act="aiChange">Mudar a chave</button><button class="btn sm ghost" data-act="dietAiOff">Desligar</button></div>${st && st.ok === false ? `<p class="neg" style="font-size:12.5px;margin:8px 0 0">${esc(st.msg || '')}</p>` : ''}${OS.ui.aiChg ? FORM('') : ''}`
      : `${STEPS}${FORM('')}${moved()}`}</div>`; };
A.aiChange = () => { OS.ui.aiChg = !OS.ui.aiChg; OS.request(); };
A.aiFreeTg = b => { OS.setOne('diet', { freeAI: !!b.checked }); UI.toast(b.checked ? 'IA de reserva ligada: a IA nunca fica parada' : 'IA de reserva desligada', b.checked ? 'pos' : ''); };
AI.test = async () => { const k = AI.key(); if (!k) return { ok: false, msg: 'Sem chave.' };
  try { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=5&key=${encodeURIComponent(k)}`), j = await r.json().catch(() => ({}));
    const o = r.ok ? { ok: true } : { ok: false, msg: /API key not valid|API_KEY_INVALID/i.test((j.error && j.error.message) || '') || r.status === 400 ? 'A chave não é válida: volta a copiá-la em aistudio.google.com/apikey.' : 'O Google respondeu com erro ' + r.status + '.' };
    U.ls.set('os2aiOk', Object.assign({ at: Date.now() }, o)); if (o.ok) AI.discover(true); return o; } catch (e) { return { ok: null, msg: 'Sem internet para testar agora.' }; } };
A.aiTest = async () => { UI.toast('A testar…'); const o = await AI.test(); UI.toast(o.ok ? 'O Spyke está ligado e a funcionar' : o.msg, o.ok ? 'pos' : 'warn'); OS.request(); };
A.aiKeySave = b => { const box = b.closest('.ai-row') || document, inp = box.querySelector('[data-aikey]') || document.getElementById('aiKeyIn'), v = ((inp || {}).value || '').trim().replace(/^['"]|['"]$/g, '');
  if (v.length < 20) { UI.toast('Esta chave parece incompleta', 'warn'); return; } OS.setOne('diet', { aiKey: v }); OS.ui.aiChg = false; U.ls.del('os2aiOk'); UI.toast('Spyke ligado: a IA já funciona em toda a app', 'pos'); OS.emit('ai:on');
  AI.test().then(o => { if (o.ok === false) UI.toast(o.msg, 'warn'); OS.request(); });
  if (b.dataset.next && A[b.dataset.next]) A[b.dataset.next](b); else OS.request(); };
/* IA sem parar:
   1) Os modelos do Google mudam (o Google desliga os antigos, ex.: gemini-2.0): a app pergunta ao Google, com a tua chave,
      que modelos existem hoje e usa os mais recentes. Nunca mais fica presa num modelo desligado.
   2) Cada modelo tem a sua cota grátis (por minuto e por dia): quando um esgota, passa logo ao seguinte, sem esperar.
   3) Se todos os do Google estiverem esgotados (ou sem chave), usa uma IA grátis e sem chave (Pollinations, modelo aberto GPT-OSS). */
const FALLBACK = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemma-3-27b-it', 'gemma-3-12b-it'];
const MK = 'os2aiModels', QK = 'os2aiQuota';
let MODELS = (() => { const c = U.ls.get(MK, null); return c && Array.isArray(c.m) && c.m.length ? c.m : FALLBACK; })();
const ptDay = () => { try { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }); } catch (e) { return U.today(); } };
// ordem: "latest" (o Google aponta sempre para o mais recente) → versões mais novas → flash antes de lite → pro → gemma (cota diária enorme, menos inteligente)
const rank = n => { const v = +((n.match(/-(\d+(?:\.\d+)?)/) || [])[1] || 0), fam = /^gemma/.test(n) ? 3 : /pro/.test(n) ? 2 : /lite/.test(n) ? 1 : 0;
  return (/latest/.test(n) ? -1e4 : 0) + fam * 1e3 - v * 10 + (/preview|exp/.test(n) ? 3 : 0) + (/lite/.test(n) ? 1 : 0); };
AI.discover = async force => { const k = AI.key(); if (!k) return MODELS; const c = U.ls.get(MK, null);
  if (!force && c && c.k === k.slice(-6) && Date.now() - c.at < 12 * 36e5 && Array.isArray(c.m) && c.m.length) return (MODELS = c.m);
  try { let names = [], tok = '';
    for (let i = 0; i < 5; i++) { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200${tok ? '&pageToken=' + encodeURIComponent(tok) : ''}&key=${encodeURIComponent(k)}`); const j = await r.json().catch(() => ({})); if (!r.ok) break;
      (j.models || []).forEach(m => { const n = String(m.name || '').replace(/^models\//, ''); if ((m.supportedGenerationMethods || []).includes('generateContent') && /^(gemini|gemma)/.test(n) && !/(tts|image|embed|aqa|live|audio|robotics|computer|veo|imagen|native|banana|nano|learnlm|vision)/i.test(n)) names.push(n); });
      tok = j.nextPageToken; if (!tok) break; }
    if (names.length) { MODELS = [...new Set(names)].sort((x, y) => rank(x) - rank(y)).slice(0, 16); U.ls.set(MK, { k: k.slice(-6), at: Date.now(), m: MODELS }); } } catch (e) { }
  return MODELS; };
AI.blocked = m => { const q = U.ls.get(QK, {}) || {}, x = q[m]; return !!x && (x.dead ? x.dead > Date.now() : x.d ? x.d === ptDay() : x.until > Date.now()); };
AI.markLimit = (m, msg) => { const q = U.ls.get(QK, {}) || {}; q[m] = /per ?day|perday|daily|diári/i.test(msg || '') ? { d: ptDay() } : { until: Date.now() + 65000 }; U.ls.set(QK, q); };
// modelo desligado pelo Google ("no longer available", "not found"): fica de lado 7 dias e a lista é pedida outra vez
AI.markDead = m => { const q = U.ls.get(QK, {}) || {}; q[m] = { dead: Date.now() + 7 * 864e5 }; U.ls.set(QK, q); U.ls.del(MK); };
AI.isDead = (status, msg) => status === 404 || (status === 400 && /no longer available|is not found|not supported for generateContent|deprecated|has been shut ?down/i.test(msg || ''));
AI.models = list => (list || MODELS).filter(m => !AI.blocked(m));
AI.gemini = () => AI.models(MODELS).filter(m => !/^gemma/.test(m));
AI.limitMsg = 'A cota grátis dos modelos do Google acabou por hoje e a IA de reserva não respondeu. Tenta daqui a um minuto.';
// IA grátis de reserva: sem chave e sem limite diário (modelo aberto GPT-OSS na Pollinations). Desliga-se em Definições da IA (freeAI = false).
AI.freeOn = () => OS.one('diet').freeAI !== false;
AI.free = async (messages, o = {}) => { if (!AI.freeOn()) throw new Error('A IA de reserva está desligada.');
  let last = ''; for (let i = 0; i < 3; i++) { const ac = window.AbortController ? new AbortController() : null, to = ac && setTimeout(() => ac.abort(), 45000);
    try { const r = await fetch('https://text.pollinations.ai/openai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac ? ac.signal : undefined, credentials: 'omit', referrerPolicy: 'no-referrer',
        body: JSON.stringify(Object.assign({ model: 'openai', messages, temperature: o.temp == null ? .3 : o.temp, private: true, referrer: 'oceanum' }, o.tools ? { tools: o.tools } : {}, o.json ? { response_format: { type: 'json_object' } } : {})) });
      const j = await r.json().catch(() => ({})); if (r.ok && j.choices && j.choices[0]) { AI.lastEngine = 'reserva'; return j.choices[0].message || {}; }
      last = (j.error && (j.error.message || j.error)) || 'erro ' + r.status; if (r.status === 429) await new Promise(res => setTimeout(res, 1500 * (i + 1))); else if (r.status < 500) break; }
    catch (e) { last = e.name === 'AbortError' ? 'demorou demasiado' : (e.message || 'sem rede'); } finally { to && clearTimeout(to); } }
  throw new Error('IA de reserva: ' + last); };
const freeJSON = async (parts, temp) => { const txt = parts.filter(p => p.text).map(p => p.text).join('\n'); if (!txt || parts.some(p => p.inline_data)) throw new Error('sem texto');
  const m = await AI.free([{ role: 'system', content: 'Respondes APENAS com JSON válido, sem texto à volta.' }, { role: 'user', content: txt }], { temp, json: true }), t = String(m.content || '').replace(/```(?:json)?/g, '').trim();
  try { return JSON.parse(t); } catch (e) { const mm = t.match(/[\[{][\s\S]*[\]}]/); if (mm) return JSON.parse(mm[0]); throw e; } };
AI.json = async (parts, temp = .2) => { const key = AI.key(); if (!key) { if (AI.freeOn()) return freeJSON(parts, temp); throw Object.assign(new Error('A IA não está ligada.'), { fatal: 1 }); }
  let last = '', limited = 0; await AI.discover(); const list = AI.models();
  for (const m of list) { const gemma = /^gemma/.test(m); try { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: gemma ? parts.concat([{ text: '\nResponde APENAS com o JSON pedido, sem texto à volta.' }]) : parts }], generationConfig: gemma ? { temperature: temp } : { responseMimeType: 'application/json', temperature: temp } }) });
      const j = await r.json().catch(() => ({})), msg = (j.error && j.error.message) || '';
      if (!r.ok) { if (/API key not valid|API_KEY_INVALID/i.test(msg)) throw Object.assign(new Error('A chave da IA não é válida. Volta a copiá-la em aistudio.google.com/apikey.'), { fatal: 1 });
        if (r.status === 429) { AI.markLimit(m, msg); limited++; last = 'limite'; continue; } if (AI.isDead(r.status, msg)) { AI.markDead(m); last = 'modelo desligado'; continue; } last = msg || 'erro ' + r.status; continue; }
      const txt = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('').replace(/```(?:json)?/g, '').trim();
      try { AI.lastEngine = m; return JSON.parse(txt); } catch (e) { const mm = txt.match(/[\[{][\s\S]*[\]}]/); if (mm) return JSON.parse(mm[0]); throw e; } }
    catch (e) { if (e.fatal) throw e; last = e.message; } }
  // o Google não deu: IA grátis de reserva (só texto; fotos e PDFs precisam do Google)
  if (AI.freeOn() && !parts.some(p => p.inline_data)) { try { return await freeJSON(parts, temp); } catch (e) { last = e.message; } }
  if (limited && !AI.models().length) throw Object.assign(new Error(AI.limitMsg), { fatal: 1 });
  throw new Error('A IA não respondeu (' + last + '). Verifica a internet e tenta de novo.'); };
// texto simples (resumos, explicações): Google primeiro, reserva grátis depois
AI.text = async (prompt, o = {}) => { const key = AI.key(); if (key) { await AI.discover(); for (const m of AI.models()) { try { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: (o.system ? o.system + '\n\n' : '') + prompt }] }], generationConfig: { temperature: o.temp == null ? .4 : o.temp } }) });
      const j = await r.json().catch(() => ({})), msg = (j.error && j.error.message) || ''; if (!r.ok) { if (r.status === 429) AI.markLimit(m, msg); else if (AI.isDead(r.status, msg)) AI.markDead(m); continue; }
      const t = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('').trim(); if (t) { AI.lastEngine = m; return t; } } catch (e) { } } }
  const m = await AI.free([o.system ? { role: 'system', content: o.system } : null, { role: 'user', content: prompt }].filter(Boolean), { temp: o.temp }); return String(m.content || '').trim(); };
OS.on('ready', () => { if (AI.key()) setTimeout(() => AI.discover(), 5000); });

/* ================= ler o exame ================= */
const FIELDS = { weight: 'peso total em kg', bf: 'percentagem de gordura corporal (PBF, %)', fatKg: 'massa de gordura corporal em kg (Body Fat Mass)', muscleKg: 'massa muscular esquelética em kg (SMM)', leanKg: 'massa livre de gordura / massa magra em kg (FFM, LBM)', water: 'água corporal em % do peso', waterL: 'água corporal total em litros (TBW)', protein: 'proteína em % do peso (se só houver kg, converte para % do peso)', bone: 'minerais / massa óssea em kg', visceral: 'nível de gordura visceral (número)', subq: 'gordura subcutânea em %', bmr: 'taxa metabólica basal em kcal', metAge: 'idade metabólica em anos', lArmL: 'massa magra braço esquerdo kg', lArmR: 'massa magra braço direito kg', lTrunk: 'massa magra tronco kg', lLegL: 'massa magra perna esquerda kg', lLegR: 'massa magra perna direita kg', gArmL: 'gordura braço esquerdo em %', gArmR: 'gordura braço direito em %', gTrunk: 'gordura tronco em %', gLegL: 'gordura perna esquerda em %', gLegR: 'gordura perna direita em %', ecw: 'rácio água extracelular / água total (ECW/TBW, ex. 0.380)', phase: 'ângulo de fase em graus', score: 'pontuação do aparelho (ex. InBody score)', waist: 'perímetro da cintura cm', hip: 'perímetro da anca cm', neck: 'pescoço cm', chest: 'peito cm', abdomen: 'abdómen cm', armLc: 'braço esquerdo cm', armRc: 'braço direito cm', thighL: 'coxa esquerda cm', thighR: 'coxa direita cm', calf: 'gémeo cm' };
const READ = `Esta imagem (ou PDF) é o resultado de um exame de bioimpedância (InBody, Tanita, Omron ou outro). Lê TODOS os valores com atenção. Responde APENAS com JSON com estas chaves (número sem unidades, ponto decimal; null se não aparecer; NÃO inventes valores): {"date":"AAAA-MM-DD ou null","device":"nome do aparelho ou null",${Object.entries(FIELDS).map(([k, d]) => `"${k}": "${d}"`).join(',')},"legivel": true/false}. Se a análise segmentar só mostrar percentagens do normal, ignora-as. Atenção a esquerda/direita.`;
let SC = null; // { step:'pick'|'busy'|'err', err }
const scanHTML = () => { if (!AI.key()) return AI.setup('bioScan');
  if (SC.step === 'busy') return `<div class="fd-ai" style="align-items:center;text-align:center"><div class="fd-spin"></div><h3>A ler o exame…</h3><p class="mut">A IA está a ler todos os valores. Demora uns segundos.</p></div>`;
  return `<div class="fd-ai"><h3>Ler exame de bioimpedância</h3><p class="mut">Tira uma foto ao papel do resultado (bem direito, com luz e sem reflexos) ou escolhe o PDF / captura de ecrã da app da balança. A IA preenche tudo e depois diz-te onde melhorar.</p>
    <label class="fd-cam" for="bioFile">${UI.ic('camera')}<b>Tirar foto ou escolher ficheiro</b><small>Foto, captura de ecrã ou PDF</small></label><input id="bioFile" type="file" accept="image/*,application/pdf" hidden>${SC.err ? `<p class="neg">${esc(SC.err)}</p>` : ''}</div>`; };
const drawScan = () => { const box = document.getElementById('bioScanBox'); if (box) box.innerHTML = scanHTML(); };
A.bioScan = () => { SC = { step: 'pick', err: '' }; UI.modal(`<div class="row" style="justify-content:flex-end"><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div><div id="bioScanBox">${scanHTML()}</div>`, 'bio-m'); };
const fileData = f => new Promise((ok, ko) => { const r = new FileReader(); r.onerror = ko; r.onload = () => { if (f.type === 'application/pdf') return ok({ mime: 'application/pdf', data: String(r.result).split(',')[1] });
  const im = new Image(); im.onerror = ko; im.onload = () => { const m = 2000, k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok({ mime: 'image/jpeg', data: c.toDataURL('image/jpeg', .9).split(',')[1] }); }; im.src = r.result; }; r.readAsDataURL(f); });
AI.readExam = async (fd) => { const o = await AI.json([{ text: READ }, { inline_data: { mime_type: fd.mime, data: fd.data } }], 0); const out = {};
  Object.keys(FIELDS).forEach(k => { const v = o[k]; if (v != null && v !== '' && isFinite(+String(v).replace(',', '.'))) out[k] = +(+String(v).replace(',', '.')).toFixed(3); });
  if (o.date && /^\d{4}-\d{2}-\d{2}$/.test(o.date) && o.date <= U.today()) out.date = o.date; if (o.device) out.device = String(o.device).slice(0, 60);
  return { vals: out, ok: o.legivel !== false && Object.keys(out).length >= 3 }; };
document.addEventListener('change', async e => { if (e.target.id !== 'bioFile') return; const f = e.target.files && e.target.files[0]; if (!f || !SC) return;
  SC.step = 'busy'; drawScan();
  try { const fd = await fileData(f), r = await AI.readExam(fd);
    if (!r.ok) { SC.step = 'pick'; SC.err = 'Não consegui ler os valores. Tira outra foto mais perto, direita e sem reflexos.'; drawScan(); return; }
    UI.closeModal(); UI.toast(`Li ${Object.keys(r.vals).length} valores. Confere e guarda.`, 'pos');
    UI.openForm('body', null, Object.assign({ date: U.today(), bio: true, src: 'ia' }, r.vals), { title: 'Exame lido pela IA · confere', onSave: rec => { OS.go('corpo.peso'); setTimeout(() => BIO.analyse(rec.id), 300); } }); }
  catch (er) { SC.step = 'pick'; SC.err = er.message; drawScan(); } });

/* ================= análise: onde melhorar ================= */

const BIO = OS.BioAI = {};
const age = () => n(OS.one('diet').age), sex = () => OS.one('diet').sex === 'F' ? 'F' : 'M';
// regras (funcionam sem IA)
BIO.rules = (b, prev) => { const out = [], m = BX.metrics(b), F = sex() === 'F', goal = OS.one('diet').goal || 'keep';
  const add = (pri, area, why, how) => out.push({ pri, area, why, how });
  const bf = n(b.bf), hiBf = F ? 32 : 25, okBf = F ? 25 : 18;
  if (bf >= hiBf) add('alta', 'Gordura corporal', `${U.nf(bf, 1)}% está acima do saudável (até ${okBf}%${F ? '' : ' em homens'}).`, `Défice de 300–500 kcal/dia, proteína 2,2 g/kg, 3–4 treinos de força e 2–3 corridas leves por semana. Ritmo: −0,5 a −1% do peso por semana.`);
  else if (bf > okBf) add('media', 'Gordura corporal', `${U.nf(bf, 1)}% é médio. Para ficares "em forma": ${F ? '21–24' : '14–17'}%.`, `Défice ligeiro de 200–300 kcal/dia mantendo a proteína alta e o treino de força.`);
  if (n(b.visceral) >= 10) add('alta', 'Gordura visceral', `Nível ${n(b.visceral)} (saudável: até 9). É a gordura à volta dos órgãos, a mais perigosa.`, 'Corta açúcar e álcool, mais fibra (30 g/dia), cardio 150 min/semana e dorme 7–8 h. Desce depressa com défice calórico.');
  if (m.ffmi && m.ffmi < (F ? 15 : 18)) add('alta', 'Massa muscular', `FFMI ${U.nf(m.ffmi, 1)}: massa muscular abaixo da média para a tua altura.`, `Prioriza força: 10–20 séries por músculo por semana, progressão de carga, proteína ${Math.round(n(b.weight) * 2)} g/dia e ligeiro superávit (+200 kcal) ou recomposição.`);
  else if (m.ffmi && m.ffmi < (F ? 17 : 20) && goal !== 'cut') add('media', 'Massa muscular', `FFMI ${U.nf(m.ffmi, 1)}: médio, há margem para ganhar músculo.`, 'Mantém 10–20 séries por grupo muscular/semana e sobe as cargas todas as semanas.');
  const pairs = [['lArmL', 'lArmR', 'braços'], ['lLegL', 'lLegR', 'pernas']];
  pairs.forEach(([a, c, l]) => { if (n(b[a]) && n(b[c])) { const d = Math.abs(n(b[a]) - n(b[c])) / Math.max(n(b[a]), n(b[c])); if (d > .06) add('media', 'Equilíbrio ' + l, `O lado ${n(b[a]) < n(b[c]) ? 'esquerdo' : 'direito'} tem ${U.nf(d * 100, 0)}% menos massa magra.`, `Inclui exercícios unilaterais (${l === 'braços' ? 'halteres, remada e curl unilateral' : 'búlgaro, afundos, leg press unilateral'}) começando pelo lado mais fraco.`); } });
  if (n(b.lTrunk) && n(b.lLegL) && n(b.lLegR) && (n(b.lLegL) + n(b.lLegR)) / n(b.lTrunk) < .62) add('media', 'Pernas', 'As pernas têm pouca massa magra em relação ao tronco.', 'Dois treinos de pernas por semana: agachamento, peso morto romeno, leg press e gémeos.');
  const w = n(b.water), wl = F ? 45 : 50; if (w && w < wl) add('media', 'Hidratação', `Água ${U.nf(w, 1)}% (normal ${wl}–${F ? 60 : 65}%).`, `Bebe 35 ml por kg (${U.nf(n(b.weight) * .035, 1)} L/dia) e repete o exame hidratado, em jejum e de manhã.`);
  if (n(b.ecw) > .39) add('media', 'Água extracelular', `ECW/TBW ${U.nf(n(b.ecw), 3)} (normal até 0,390): sinal de inflamação, retenção ou excesso de treino.`, 'Mais sono, menos sal e álcool, e reduz o volume de treino uma semana.');
  if (n(b.phase) && n(b.phase) < (F ? 4.5 : 5)) add('media', 'Ângulo de fase', `${U.nf(n(b.phase), 1)}° é baixo: células com menos "saúde".`, 'Treino de força regular, proteína suficiente e sono melhoram-no.');
  if (age() && n(b.metAge) > age()) add('media', 'Idade metabólica', `${n(b.metAge)} anos, acima da tua idade (${age()}).`, 'Mais massa muscular e menos gordura baixam a idade metabólica.');
  if (prev && n(prev.muscleKg) && n(b.muscleKg) && n(b.muscleKg) < n(prev.muscleKg) - .4) add('alta', 'Perda de músculo', `Perdeste ${U.nf(n(prev.muscleKg) - n(b.muscleKg), 1)} kg de músculo desde o último exame.`, 'Défice demasiado grande ou proteína baixa: sobe 150–200 kcal e garante a proteína todos os dias.');
  const ord = { alta: 0, media: 1, baixa: 2 }; return out.sort((a, c) => ord[a.pri] - ord[c.pri]); };
BIO.fortes = b => { const o = [], m = BX.metrics(b), F = sex() === 'F'; if (n(b.bf) && n(b.bf) <= (F ? 24 : 17)) o.push('Gordura corporal num bom nível'); if (n(b.visceral) && n(b.visceral) < 10) o.push('Gordura visceral saudável'); if (m.ffmi >= (F ? 17 : 20)) o.push('Boa massa muscular para a tua altura'); if (n(b.water) >= (F ? 45 : 50)) o.push('Bem hidratado'); if (n(b.phase) >= (F ? 5.5 : 6)) o.push('Ângulo de fase bom (células saudáveis)'); return o; };
const ctx = (b, prev) => { const t = U.today(), from = U.addDays(t, -27), W = OS.all('workouts').filter(w => w.date >= from), R = OS.all('runs').filter(r => r.date >= from), days = U.range(from, t).map(d => OS.Diet.day(d)).filter(x => x.n), o = OS.one('diet');
  const pick = r => { const x = {}; ['date', 'weight', ...Object.keys(FIELDS)].forEach(k => { if (r && r[k] !== '' && r[k] != null && (k === 'date' || n(r[k]))) x[k] = r[k]; }); return x; };
  return { pessoa: { idade: age() || null, sexo: sex() === 'F' ? 'mulher' : 'homem', altura_cm: BX.height() || null, objetivo: { cut: 'perder gordura', keep: 'manter / recomposição', bulk: 'ganhar massa' }[o.goal || 'keep'] },
    exame: Object.assign(pick(b), { origem: b.src === 'ia' ? 'estimado pela IA a partir de medidas' + (b.look ? ' e fotos' : '') + ' (não é bioimpedância real)' : 'aparelho de bioimpedância' }), observacoes_fotos: b.look || null, exame_anterior: prev ? pick(prev) : null, calculado: { imc: U.r1(BX.metrics(b).bmi), ffmi: U.r1(BX.metrics(b).ffmi) },
    ultimas_4_semanas: { treinos_forca_por_semana: U.r1(W.length / 4), series_por_musculo_por_semana: Object.fromEntries(Object.entries(OS.Fit.muscleSets(from, t)).map(([k, v]) => [k, U.r1(v / 4)])), corrida_km_por_semana: U.r1(U.sum(R, r => r.km) / 4),
      dieta_dias_registados: days.length, kcal_media: days.length ? Math.round(U.avg(days, x => x.kcal)) : null, proteina_media_g: days.length ? Math.round(U.avg(days, x => x.p)) : null, metas_dieta: { kcal: n(o.kcal), proteina: n(o.p), hidratos: n(o.c), gordura: n(o.f) } } }; };
const ASK = c => `És um treinador e nutricionista desportivo experiente. Analisa este exame de bioimpedância no contexto da pessoa (treino, corrida e dieta das últimas 4 semanas e o objetivo). Sê concreto, honesto e prático, em português de Portugal, tratando por "tu". Indica onde tem de melhorar, por prioridade, com ações específicas (números: séries, kcal, gramas de proteína, minutos de cardio), compara com o exame anterior se existir e define metas para o próximo exame (daqui a 6–8 semanas). Não faças diagnósticos médicos; se algo for preocupante, recomenda falar com um médico.
DADOS: ${JSON.stringify(c)}
Responde APENAS com JSON: {"resumo":"2–3 frases","nota":0-100,"fortes":["..."],"melhorar":[{"area":"","prioridade":"alta|media|baixa","porque":"","como":""}],"metas":[{"medida":"","atual":"","alvo":"","prazo":""}],"treino":["ajustes ao treino"],"dieta":["ajustes à dieta"],"corrida":["ajustes à corrida"],"evolucao":"comparação com o exame anterior ou null"}`;
let busy = '';
BIO.analyse = async id => { const b = OS.get('body', id); if (!b) return; if (!AI.key()) { UI.modal(`<div class="row" style="justify-content:flex-end"><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>${AI.setup('')}`, 'bio-m'); return; }
  const all = U.sortBy(OS.all('body').filter(x => x.bio || n(x.bf)), x => x.date), prev = all.filter(x => x.date < b.date).pop();
  busy = id; OS.request();
  try { const r = await AI.json([{ text: ASK(ctx(b, prev)) }], .4); if (!r || !r.resumo) throw new Error('resposta vazia');
    OS.upd('body', id, { ai: { at: new Date().toISOString(), resumo: String(r.resumo), nota: Math.round(n(r.nota)) || null, fortes: (r.fortes || []).slice(0, 6).map(String), melhorar: (r.melhorar || []).slice(0, 8).map(x => ({ area: String(x.area || ''), pri: /alta/i.test(x.prioridade) ? 'alta' : /baixa/i.test(x.prioridade) ? 'baixa' : 'media', why: String(x.porque || ''), how: String(x.como || '') })), metas: (r.metas || []).slice(0, 6).map(x => ({ m: String(x.medida || ''), a: String(x.atual ?? ''), t: String(x.alvo ?? ''), p: String(x.prazo || '') })), treino: (r.treino || []).slice(0, 6).map(String), dieta: (r.dieta || []).slice(0, 6).map(String), corrida: (r.corrida || []).slice(0, 4).map(String), evolucao: r.evolucao ? String(r.evolucao) : '' } });
    UI.toast('Análise pronta', 'pos'); }
  catch (e) { UI.toast(e.message, 'neg'); }
  busy = ''; OS.request(); };
A.bioAnalyse = b => BIO.analyse(b.dataset.id);
const PRI = { alta: ['neg', 'Prioridade alta'], media: ['warn', 'Prioridade média'], baixa: ['', 'Prioridade baixa'] };
const item = x => `<div class="bio-it ${PRI[x.pri][0]}"><div><b>${esc(x.area)}</b><span class="bdg ${PRI[x.pri][0]}">${PRI[x.pri][1]}</span></div>${x.why ? `<p>${esc(x.why)}</p>` : ''}${x.how ? `<p class="bio-how">${UI.ic('right')}<span>${esc(x.how)}</span></p>` : ''}</div>`;
const list = (t, ic, a) => a && a.length ? `<div class="bio-l"><b>${UI.ic(ic)}${t}</b><ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
BIO.panel = (b, prev) => { if (!b) return ''; const ai = b.ai, rules = BIO.rules(b, prev), fortes = ai ? ai.fortes : BIO.fortes(b);
  if (busy === b.id) return `<div class="pn bio-p"><div class="pn-h"><h3>Onde melhorar</h3></div><div class="fd-ai" style="align-items:center;text-align:center"><div class="fd-spin"></div><p class="mut">A IA está a analisar o teu exame com o teu treino, dieta e corrida…</p></div></div>`;
  return `<div class="pn bio-p"><div class="pn-h"><h3>${ai ? 'Análise da IA · onde melhorar' : 'Onde melhorar'}</h3>${ai && ai.nota ? `<span class="bio-nota">${ai.nota}<small>/100</small></span>` : ''}</div>
    ${ai ? `<p class="bio-res">${esc(ai.resumo)}</p>${ai.evolucao ? `<p class="note">${esc(ai.evolucao)}</p>` : ''}` : ''}
    ${fortes.length ? `<div class="bio-ok">${fortes.map(f => `<span>${UI.ic('check')}${esc(f)}</span>`).join('')}</div>` : ''}
    <div class="bio-its">${(ai ? ai.melhorar : rules).map(item).join('') || `<p class="mut">Nada de preocupante neste exame. Continua assim e repete daqui a 6–8 semanas.</p>`}</div>
    ${ai && ai.metas && ai.metas.length ? `<div class="eyebrow" style="margin:14px 0 6px">Metas para o próximo exame</div><div class="bio-metas">${ai.metas.map(x => `<div><small>${esc(x.m)}</small><b class="mono">${esc(x.a)} → ${esc(x.t)}</b><em>${esc(x.p)}</em></div>`).join('')}</div>` : ''}
    ${ai ? `<div class="bio-ls">${list('Treino', 'dumbbell', ai.treino)}${list('Dieta', 'apple', ai.dieta)}${list('Corrida', 'run', ai.corrida)}</div>` : ''}
    <div class="row gap8" style="margin-top:12px;flex-wrap:wrap"><button class="btn ${ai ? 'ghost' : 'pri'} sm" data-act="bioAnalyse" data-id="${b.id}">${UI.ic('zap')}${ai ? 'Analisar de novo' : 'Análise completa com IA'}</button>${ai ? `<small class="mut">Analisado ${U.rel(ai.at.slice(0, 10))} · não substitui um médico ou nutricionista</small>` : `<small class="mut">${AI.key() ? 'A IA cruza o exame com o teu treino, dieta e corrida.' : 'Sem IA: análise automática pelas faixas de referência.'}</small>`}</div></div>`; };

/* ================= exame feito pela IA (estimativa sem aparelho) =================
   Medidas com fita métrica + fotos do corpo → a IA e fórmulas validadas (Marinha dos EUA, Deurenberg, Katch-McArdle)
   estimam a composição corporal; o resultado fica como um exame e é analisado logo a seguir. */
let EX = null; // { step, v:{weight,h,age,sex,waist,neck,hip,armRc,thighR}, ph:{front,side,back}, err }
const PHOTOS = [['front', 'Frente'], ['side', 'Lado'], ['back', 'Costas']];
const lastWeight = () => BX.weight() || '';
BIO.navy = (sx, h, waist, neck, hip) => { if (!h || !waist || !neck) return 0; if (sx === 'F') { if (!hip || waist + hip - neck <= 0) return 0; return 495 / (1.29579 - .35004 * Math.log10(waist + hip - neck) + .221 * Math.log10(h)) - 450; } if (waist - neck <= 0) return 0; return 495 / (1.0324 - .19077 * Math.log10(waist - neck) + .15456 * Math.log10(h)) - 450; };
BIO.deur = (sx, w, h, a) => { const bmi = w / Math.pow(h / 100, 2); return 1.2 * bmi + .23 * a - 10.8 * (sx === 'M' ? 1 : 0) - 5.4; };
BIO.estimate = (v, ph) => { const sx = v.sex === 'F' ? 'F' : 'M', w = n(v.weight), h = n(v.h), a = n(v.age) || 30, nav = BIO.navy(sx, h, n(v.waist), n(v.neck), n(v.hip)), deu = BIO.deur(sx, w, h, a), vis = ph && n(ph.bf);
  let bf = nav && vis ? nav * .5 + vis * .5 : nav ? nav * .8 + deu * .2 : vis ? vis * .75 + deu * .25 : deu; bf = U.clamp(bf, sx === 'F' ? 10 : 4, 55);
  const fat = w * bf / 100, lean = w - fat, tbw = lean * .73, smm = lean * (sx === 'F' ? .53 : .565), bmr = 370 + 21.6 * lean, mif = 10 * w + 6.25 * h + (sx === 'F' ? -161 : 5);
  const vAge = U.clamp(Math.round((10 * w + 6.25 * h + (sx === 'F' ? -161 : 5) - bmr) / 5), 15, 80);
  const visceral = n(v.waist) ? U.clamp(Math.round((n(v.waist) - (sx === 'F' ? 66 : 72)) / 2.6 + (a - 30) / 12 + 3), 1, 20) : 0;
  const r = { weight: w, bf: U.r1(bf), fatKg: U.r1(fat), leanKg: U.r1(lean), muscleKg: U.r1(smm), water: U.r1(tbw / w * 100), waterL: U.r1(tbw), protein: U.r1(lean * .197 / w * 100), bone: U.r1(lean * .057), bmr: Math.round(bmr), metAge: vAge };
  if (visceral) r.visceral = visceral; ['waist', 'neck', 'hip', 'armRc', 'thighR', 'chest'].forEach(k => { if (n(v[k])) r[k] = n(v[k]); });
  return Object.assign(r, { method: [nav ? 'medidas (fórmula da Marinha)' : '', vis ? 'fotos (IA)' : '', !nav && !vis ? 'IMC e idade (Deurenberg)' : ''].filter(Boolean).join(' + ') }); };
const exBody = () => { const v = EX.v, step = EX.step, num = (k, l, u, ph, help) => `<div class="fld"><label for="ex_${k}">${l}</label><div class="inp-wrap"><input id="ex_${k}" data-ex="${k}" type="text" inputmode="decimal" value="${esc(v[k] ?? '')}" placeholder="${ph || ''}"><span>${u}</span></div>${help ? `<small>${help}</small>` : ''}</div>`;
  const dots = `<div class="ex-dots">${[1, 2, 3].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
  if (step === 1) return `${dots}<h3>Exame de composição corporal com IA</h3><p class="mut">Sem aparelho: a IA estima a gordura, o músculo, a água, o metabolismo e a gordura visceral a partir das tuas medidas e de fotos. Depois mostra o resultado e diz-te onde melhorar.</p>
    <div class="ex-g">${num('weight', 'Peso', 'kg', 'ex.: 80,5', 'de manhã, em jejum')}${num('h', 'Altura', 'cm', 'ex.: 178')}${num('age', 'Idade', 'anos')}<div class="fld"><label for="ex_sex">Sexo</label><select id="ex_sex" data-ex="sex"><option value="M"${v.sex !== 'F' ? ' selected' : ''}>Masculino</option><option value="F"${v.sex === 'F' ? ' selected' : ''}>Feminino</option></select></div></div>
    <div class="eyebrow" style="margin:14px 0 4px">Com uma fita métrica (muito mais preciso)</div>
    <div class="ex-g">${num('waist', 'Cintura', 'cm', '', 'na linha do umbigo, barriga relaxada, depois de expirar')}${num('neck', 'Pescoço', 'cm', '', 'logo abaixo da maçã de Adão')}${num('hip', 'Anca', 'cm', '', 'na parte mais larga dos glúteos' + (v.sex === 'F' ? ' (obrigatório)' : ' (opcional)'))}${num('armRc', 'Braço contraído', 'cm', '', 'opcional')}${num('thighR', 'Coxa', 'cm', '', 'opcional, a meio da coxa')}</div>
    ${EX.err ? `<p class="neg">${esc(EX.err)}</p>` : ''}<div class="row gap8 end"><button class="btn ghost" data-mclose>Cancelar</button><button class="btn pri" data-act="exNext">Continuar</button></div>`;
  if (step === 2) return `${dots}<h3>Fotos do corpo</h3><p class="mut">Opcional, mas torna o resultado bem mais preciso. Roupa justa ou de treino, corpo inteiro, boa luz, braços ligeiramente afastados. As fotos só servem para a análise: <b>não ficam guardadas</b>.</p>
    ${AI.key() ? `<div class="ex-ph">${PHOTOS.map(([k, l]) => `<label class="ex-pc ${EX.ph[k] ? 'on' : ''}" for="exph_${k}">${EX.ph[k] ? `<img src="data:image/jpeg;base64,${EX.ph[k]}" alt="">` : UI.ic('camera')}<b>${l}</b></label><input id="exph_${k}" data-exph="${k}" type="file" accept="image/*" capture="environment" hidden>`).join('')}</div>` : `<div class="note">Para usar fotos, liga a IA (grátis) aqui em baixo. Também podes continuar só com as medidas.</div>${AI.setup('exShow')}`}
    ${EX.err ? `<p class="neg">${esc(EX.err)}</p>` : ''}<div class="row gap8 end"><button class="btn ghost" data-act="exBack">Voltar</button><button class="btn pri" data-act="exRun">${UI.ic('zap')}${Object.values(EX.ph).some(Boolean) ? 'Fazer o exame' : 'Fazer só com as medidas'}</button></div>`;
  return `${dots}<div class="fd-ai" style="align-items:center;text-align:center"><div class="fd-spin"></div><h3>A fazer o exame…</h3><p class="mut">${EX.msg || 'A analisar as tuas medidas e fotos.'}</p></div>`; };
const exDraw = () => { const b = document.getElementById('exBox'); if (b) b.innerHTML = exBody(); };
A.bioExam = () => { const o = OS.one('diet'); EX = { step: 1, v: { weight: lastWeight(), h: o.h || '', age: o.age || '', sex: o.sex || 'M' }, ph: {}, err: '' }; const last = U.sortBy(OS.all('body').filter(b => n(b.waist)), b => b.date).pop(); if (last) ['waist', 'neck', 'hip'].forEach(k => { if (n(last[k])) EX.v[k] = last[k]; });
  UI.modal(`<div id="exBox" class="ex">${exBody()}</div>`, 'bio-m'); };
A.exShow = () => { if (!EX) return A.bioExam(); UI.modal(`<div id="exBox" class="ex">${exBody()}</div>`, 'bio-m'); };
document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.ex; if (!k || !EX) return; EX.v[k] = k === 'sex' ? e.target.value : e.target.value.replace(',', '.'); if (k === 'sex') exDraw(); });
document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.ex; if (k === 'sex' && EX) { EX.v.sex = e.target.value; exDraw(); } });
A.exNext = () => { const v = EX.v; EX.err = !n(v.weight) ? 'Falta o peso.' : !n(v.h) ? 'Falta a altura.' : !n(v.age) ? 'Falta a idade.' : v.sex === 'F' && n(v.waist) && !n(v.hip) ? 'Para mulheres, a anca é necessária na fórmula.' : ''; if (EX.err) return exDraw();
  OS.setOne('diet', { h: n(v.h), age: n(v.age), sex: v.sex }); EX.step = 2; exDraw(); };
A.exBack = () => { EX.step = 1; EX.err = ''; exDraw(); };
document.addEventListener('change', async e => { const k = e.target.dataset && e.target.dataset.exph; if (!k || !EX) return; const f = e.target.files && e.target.files[0]; if (!f) return;
  try { const d = await fileData(f); EX.ph[k] = d.mime === 'image/jpeg' ? await small(d.data) : null; } catch (er) { EX.err = 'Não consegui abrir esta foto.'; } exDraw(); });
const small = b64 => new Promise(ok => { const im = new Image(); im.onload = () => { const m = 1024, k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .85).split(',')[1]); }; im.onerror = () => ok(b64); im.src = 'data:image/jpeg;base64,' + b64; });
const LOOK = v => `És um especialista em composição corporal. Estas são fotos do corpo de uma pessoa (${PHOTOS.filter(([k]) => EX.ph[k]).map(([, l]) => l.toLowerCase()).join(', ')}). Dados: ${v.sex === 'F' ? 'mulher' : 'homem'}, ${n(v.age)} anos, ${n(v.h)} cm, ${n(v.weight)} kg${n(v.waist) ? ', cintura ' + n(v.waist) + ' cm' : ''}. Estima a percentagem de gordura corporal pela definição muscular, distribuição de gordura e silhueta (compara com referências visuais de % de gordura). Avalia o desenvolvimento muscular por zona. Sê realista, não lisonjeies. Responde APENAS com JSON: {"bf": número, "confianca":"baixa|media|alta", "musculo":"baixo|medio|bom|muito bom", "fortes":["zonas mais desenvolvidas"], "fracas":["zonas a desenvolver"], "gordura_local":"onde se acumula mais gordura", "postura":"observação curta ou null", "foto_valida": true/false}. Se as fotos não mostrarem um corpo humano, foto_valida=false.`;
A.exRun = async () => { const v = EX.v, has = Object.values(EX.ph).some(Boolean); EX.step = 3; EX.err = ''; EX.msg = has ? 'A IA está a observar as fotos…' : 'A calcular pelas medidas…'; exDraw();
  let look = null;
  if (has) { try { const parts = [{ text: LOOK(v) }]; PHOTOS.forEach(([k]) => { if (EX.ph[k]) parts.push({ inline_data: { mime_type: 'image/jpeg', data: EX.ph[k] } }); }); look = await AI.json(parts, .2);
      if (look && look.foto_valida === false) { EX.step = 2; EX.err = 'As fotos não mostram bem o corpo. Tira-as de corpo inteiro, com roupa justa.'; exDraw(); return; } }
    catch (er) { EX.step = 2; EX.err = er.message + ' (podes fazer só com as medidas)'; exDraw(); return; } }
  const est = BIO.estimate(v, look && n(look.bf) ? { bf: U.clamp(n(look.bf), 4, 55) } : null);
  const rec = OS.add('body', Object.assign({ date: U.today(), bio: true, src: 'ia', method: est.method, device: 'Exame estimado pela IA', look: look ? { bf: n(look.bf) || null, conf: String(look.confianca || ''), musc: String(look.musculo || ''), fortes: (look.fortes || []).slice(0, 5).map(String), fracas: (look.fracas || []).slice(0, 5).map(String), gord: String(look.gordura_local || ''), post: look.postura ? String(look.postura) : '' } : null }, est));
  EX = null; UI.closeModal(); OS.go('corpo.peso'); UI.toast('Exame feito. A preparar a análise…', 'pos');
  if (AI.key()) setTimeout(() => BIO.analyse(rec.id), 200); };
})();
