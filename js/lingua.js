/* PRUMO — línguas. O app é escrito em português de Portugal; para quem lê outra língua, o ecrã é traduzido na hora:
   cada texto que aparece (botões, títulos, avisos, listas…) é trocado pela tradução do dicionário dessa língua.
   Os dicionários são feitos a partir dos textos do código (standalone/i18n): os principais vêm com o app (i18n/<língua>.json)
   e os outros são preparados uma vez pela IA no servidor (api/lingua) e guardados para todos.
   Só se traduzem textos do app que estão no dicionário: o que escreves (tarefas, notas, nomes…) nunca sai do aparelho por causa disto.
   A IA e a voz passam a falar a língua da pessoa. */
(() => {
'use strict';
const U = OS.U;
const LANGS = ['pt-PT', 'pt-BR', 'en', 'es', 'fr', 'it', 'de', 'nl', 'ca', 'pl', 'ro', 'ru', 'uk', 'tr', 'el', 'cs', 'sk', 'sl', 'hr', 'sr', 'bs', 'mk', 'bg', 'hu', 'sv', 'no', 'da', 'fi', 'is', 'et', 'lv', 'lt', 'sq', 'hy', 'ka', 'az', 'uz',
  'ar', 'he', 'fa', 'hi', 'bn', 'ne', 'zh', 'zh-TW', 'ja', 'ko', 'id', 'ms', 'th', 'vi', 'km', 'lo', 'my', 'mn', 'sw', 'am', 'so'];
const SHIP = new Set(['pt-BR', 'en', 'es', 'fr', 'it', 'de']);   // dicionários que vêm com o app
const RTL = new Set(['ar', 'he', 'fa']);
const ok = c => LANGS.includes(c);
const fromNav = n => { n = String(n || ''); if (/^pt-BR/i.test(n)) return 'pt-BR'; if (/^pt/i.test(n)) return 'pt-PT'; if (/^zh-(TW|HK|MO|Hant)/i.test(n)) return 'zh-TW'; let b = n.slice(0, 2).toLowerCase(); if (b === 'nb' || b === 'nn') b = 'no'; return ok(b) ? b : 'en'; };
const acc = () => OS.Acc || {};
const prof = () => { try { return OS.one('profile') || {}; } catch (e) { return {}; } };
let isReady = false; const booted = () => isReady;
const dev = () => { const s = U.ls.get('nau:lang', ''); if (ok(s)) return s; return fromNav((navigator.languages && navigator.languages[0]) || navigator.language); };
// a língua de agora: a escolhida no perfil; senão a do país (contas novas); o perfil pessoal do Ryan e o modo local ficam em português de Portugal
const want = () => { if (window.__lang && ok(window.__lang)) return window.__lang;
  if (!booted()) return acc().on || acc().sess ? dev() : 'pt-PT';
  const p = prof(); if (ok(p.lang)) return p.lang;
  if (acc().on && acc().pub) return p.country && OS.Pais && OS.Pais.has(p.country) ? OS.Pais.langOf(p.country) : dev();
  return 'pt-PT'; };
let code = 'pt-PT';
const L = OS.Lang = {
  list: () => LANGS.slice(), ship: c => SHIP.has(c), ok,
  code: () => code,
  base: () => code.slice(0, 2),
  on: () => code !== 'pt-PT',
  name: (c = code, inLang) => { if (c === 'pt-PT') return 'Português (Portugal)'; if (c === 'pt-BR') return 'Português (Brasil)'; try { const n = new Intl.DisplayNames([inLang || c], { type: 'language' }).of(c); return n ? n.charAt(0).toUpperCase() + n.slice(1) : c; } catch (e) { return c; } },
  // nome da língua em inglês (para a IA)
  en: (c = code) => { if (c === 'pt-BR') return 'Brazilian Portuguese (pt-BR)'; if (c === 'pt-PT') return 'European Portuguese (pt-PT)'; try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(c) + ' (' + c + ')'; } catch (e) { return c; } },
  loc: () => { if (code === 'pt-PT' || code === 'pt-BR' || code === 'zh-TW') return code; const cc = OS.Pais ? OS.Pais.code() : 'PT', t = code + '-' + cc; try { return Intl.NumberFormat.supportedLocalesOf([t]).length ? t : code; } catch (e) { return code; } },
  // voz: reconhecimento e leitura
  speech: () => { if (code === 'pt-PT' || code === 'pt-BR') return code; const l = L.loc(); return /-/.test(l) ? l : ({ en: 'en-US', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', de: 'de-DE', nl: 'nl-NL', ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR', ru: 'ru-RU', ar: 'ar-SA', hi: 'hi-IN', sv: 'sv-SE', pl: 'pl-PL', tr: 'tr-TR' }[code] || code); },
  ready: false };
// formatos (números, datas, moeda) na língua e país da pessoa; em português de Portugal fica tudo igual
OS.loc = () => L.loc();

/* ---------- dicionário ---------- */
let EX = null, PAT = [], IDX = new Map(), CACHE = new Map(), FB = null;
const norm = s => s.replace(/\s+/g, ' ').trim();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const words = s => (s.toLowerCase().match(/[a-zà-ÿ]{3,}/g) || []);
const compile = (m, into) => { const ex = new Map(), pats = [], idx = new Map(), shorts = [];
  for (const k in m) { const v = m[k]; if (typeof v !== 'string' || !v) continue;
    if (!/\{\d+\}/.test(k)) { ex.set(k, v); continue; }
    const parts = k.split(/(\{\d+\})/), ids = [], isP = x => /^\{\d+\}$/.test(x || ''); let re = '^';
    // {n} pode ser vazio (um ícone, um plural) e os espaços à volta dele também
    // (o espaço entre o texto e o {n} vai junto com ele: "com {0}" serve para "com 5" e "com", nunca para "comprimida")
    parts.forEach((p, i) => { const mm = p.match(/^\{(\d+)\}$/); if (mm) { ids.push(+mm[1]); const pre = /\s$/.test(parts[i - 1] || ''), post = /^\s/.test(parts[i + 1] || '');
        re += pre && post ? '(?:\\s+(.*?)\\s+|\\s+)' : pre ? '(?:\\s+(.*?))?' : post ? '(?:(.*?)\\s+)?' : '(.*?)'; return; }
      let e = esc(p); if (isP(parts[i - 1])) e = e.replace(/^\s+/, ''); if (isP(parts[i + 1])) e = e.replace(/\s+$/, ''); re += e; });
    re += '$'; let rx; try { rx = new RegExp(re, 's'); } catch (e) { continue; }
    const lit = parts.filter(p => !isP(p)).join(' ');
    // a palavra-chave para encontrar o modelo: a mais comprida que aparece inteira (não "treino" em "treino{1}", que no ecrã é "treinos")
    const whole = parts.map((p, i) => isP(p) ? '' : p.replace(isP(parts[i - 1]) ? /^[A-Za-zÀ-ÿ]+/ : /^$/, '').replace(isP(parts[i + 1]) ? /[A-Za-zÀ-ÿ]+$/ : /^$/, '')).join(' ');
    const ws = words(whole).length ? words(whole) : words(lit);
    if (!ws.length) { if (/[A-Za-zÀ-ÿ]{2}/.test(lit)) shorts.push({ rx, ids, v, n: lit.length }); continue; }   // "{0} de {1}": sem palavra-chave, só para números
    const anchor = ws.sort((a, b) => b.length - a.length)[0], pt = { rx, ids, v, n: lit.length };
    pats.push(pt); if (!idx.has(anchor)) idx.set(anchor, []); idx.get(anchor).push(pt); }
  idx.forEach(l => l.sort((a, b) => b.n - a.n));
  return { ex, pats, idx, shorts }; };
let D = null;
const sym = () => { try { return OS.cur() === 'EUR' ? null : (new Intl.NumberFormat(L.loc(), { style: 'currency', currency: OS.cur(), currencyDisplay: 'narrowSymbol' }).formatToParts(0).find(p => p.type === 'currency') || {}).value; } catch (e) { return null; } };
const lookup = (d, key, depth) => { const v = d.ex.get(key); if (v != null) return v;
  // de todos os modelos que servem, fica o mais completo ("Meta: {0} dias por semana…" ganha a "Meta: {0}")
  const seen = new Set(); let best = null, bm = null;
  // e o texto fixo do modelo tem de ser boa parte da frase (um "{0} de volta" não serve para um versículo inteiro)
  const fits = (p, m) => m.slice(1).reduce((t, c) => t + (c ? c.length : 0), 0) <= Math.max(48, 3 * p.n);
  for (const w of words(key)) { const L2 = d.idx.get(w); if (!L2) continue; for (const p of L2) { if (seen.has(p) || (best && p.n <= best.n)) continue; seen.add(p); const m = p.rx.exec(key); if (m && fits(p, m)) { best = p; bm = m; } } }
  // modelos curtos ("2 de 3", "há 5 dias") só com números no lugar dos {n}, para não mexer em nomes que as pessoas escrevem
  if (!best && key.length <= 48) for (const p of d.shorts) { const m = p.rx.exec(key); if (m && m.slice(1).every(c => /^[\d\s.,:%/+\-−]*$/.test(c || ''))) { best = p; bm = m; break; } }
  if (!best) return null;
  let out = best.v; best.ids.forEach((id, i) => { const cap = bm[i + 1] || '', tr = cap && depth < 2 ? tx(cap, depth + 1) : null; out = out.split('{' + id + '}').join(tr != null ? cap.match(/^\s*/)[0] + tr + cap.match(/\s*$/)[0] : cap); });
  return out.replace(/ {2,}/g, ' ').trim(); };
// aspas, parênteses, símbolos e pontuação à volta: traduz o miolo e devolve-os ("“…”", "+ …", "…:")
const EDGE = /^([^A-Za-zÀ-ÿ0-9]*)([\s\S]*?)([^A-Za-zÀ-ÿ0-9]*)$/;
const core = (key, depth) => { let r = lookup(D, key, depth); if (r == null && FB) r = lookup(FB, key, depth);
  if (r == null && depth < 2) { const m = key.match(EDGE); if (m && (m[1] || m[3]) && /[A-Za-zÀ-ÿ]{2}/.test(m[2])) { let c = lookup(D, m[2], depth); if (c == null && FB) c = lookup(FB, m[2], depth); if (c != null) r = m[1] + c + m[3]; } }
  // uma contagem no fim: "Concluído (3)"
  if (r == null && depth < 2) { const m = key.match(/^(.*?[A-Za-zÀ-ÿ].*?)(\s*\(\s*[\d.,%/]+\s*\))$/); if (m) { let c = lookup(D, m[1], depth); if (c == null && FB) c = lookup(FB, m[1], depth); if (c != null) r = c + m[2]; } }
  return r; };
const tx = (s, depth = 0) => { if (!D) return null; const key = norm(s); if (!key || !/[A-Za-zÀ-ÿ]/.test(key)) return null;
  if (!depth && CACHE.has(key)) return CACHE.get(key);
  let r = core(key, depth);
  // partes separadas por " · " ou " — " (ex.: "Experiência · 40%"): cada uma à parte
  if (r == null && depth < 2 && / [·—] /.test(key)) { let any = false; const out = key.split(/( [·—] )/).map((x, i) => { if (i % 2) return x; const t = /[A-Za-zÀ-ÿ]{2}/.test(x) ? core(x, depth + 1) : null; if (t != null) { any = true; return t; } return x; }); if (any) r = out.join(''); }
  if (r != null && SYM && r.includes('€')) r = r.replace(/€/g, SYM);
  if (!depth) { if (CACHE.size > 40000) CACHE.clear(); CACHE.set(key, r); }
  return r; };
let SYM = null;
// traduz um texto (para a voz, avisos, títulos…); devolve o original se não houver tradução
L.t = s => { if (!D || s == null) return s; const str = String(s), r = tx(str); if (r == null) return str; const lead = str.match(/^\s*/)[0], trail = str.match(/\s*$/)[0]; return lead + r + trail; };

/* ---------- traduzir o ecrã ---------- */
const SRC = new WeakMap();   // nó de texto → { s: original, o: traduzido }
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const ASRC = new WeakMap();
const skipEl = el => !el || el.closest('script,style,textarea,code,pre,noscript,[data-notr],[translate="no"],[contenteditable="true"],[contenteditable=""]');
const doText = n => { const d = n.data; if (!d || d.length > 4000) return; const rec = SRC.get(n); if (rec && rec.o === d) return;
  const r = tx(d); if (r == null) { if (rec) SRC.delete(n); return; }
  const lead = d.match(/^\s*/)[0], trail = d.match(/\s*$/)[0], out = lead + r + trail; if (out === d) return;
  SRC.set(n, { s: d, o: out }); n.data = out; };
const doAttrs = el => { for (const a of ATTRS) { const v = el.getAttribute(a); if (!v) continue; const m = ASRC.get(el) || {}; if (m[a] && m[a].o === v) continue; const r = tx(v); if (r == null || r === v) continue; m[a] = { s: v, o: r }; ASRC.set(el, m); el.setAttribute(a, r); }
  if (el.tagName === 'INPUT' && /^(submit|button)$/i.test(el.type) && el.value) { const r = tx(el.value); if (r != null) el.value = r; } };
const walk = root => { if (!D || !root) return;
  if (root.nodeType === 3) { if (!skipEl(root.parentElement)) doText(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1 && skipEl(root)) return;
  if (root.nodeType === 1) doAttrs(root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: n => n.nodeType === 1 ? (/^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|NOSCRIPT)$/.test(n.tagName) || n.hasAttribute('data-notr') || n.getAttribute('translate') === 'no' || n.isContentEditable ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) : NodeFilter.FILTER_ACCEPT });
  let n; while ((n = it.nextNode())) { if (n.nodeType === 3) doText(n); else { if (n.hasAttribute('placeholder') || n.hasAttribute('title') || n.hasAttribute('aria-label') || n.hasAttribute('alt') || n.tagName === 'INPUT') doAttrs(n); } } };
// volta ao português (ao mudar de língua sem recarregar)
const restore = () => { const it = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
  while ((n = it.nextNode())) { if (n.nodeType === 3) { const r = SRC.get(n); if (r && r.o === n.data) n.data = r.s; SRC.delete(n); } else { const m = ASRC.get(n); if (m) { Object.entries(m).forEach(([a, x]) => { if (n.getAttribute(a) === x.o) n.setAttribute(a, x.s); }); ASRC.delete(n); } } } };
let MO = null;
const observe = () => { if (MO) return; MO = new MutationObserver(recs => { if (!D) return; for (const r of recs) {
    if (r.type === 'characterData') { const p = r.target.parentElement; if (!skipEl(p)) doText(r.target); }
    else if (r.type === 'attributes') { if (!skipEl(r.target)) doAttrs(r.target); }
    else r.addedNodes.forEach(walk); } });
  MO.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS }); };
// alert/confirm/prompt do navegador também na língua
['alert', 'confirm', 'prompt'].forEach(f => { const o = window[f]; if (typeof o !== 'function') return; window[f] = function (msg, ...a) { return o.call(window, D ? L.t(msg) : msg, ...a); }; });

/* ---------- carregar o dicionário ---------- */
const VER = () => (window.OCEANUM_VERSION && window.OCEANUM_VERSION.v) || '0';
const CK = 'oceanum-lingua';
const getPack = async c => {
  if (SHIP.has(c)) { const r = await fetch('i18n/' + c + '.json?v=' + VER()); if (!r.ok) throw new Error('http ' + r.status); return r.json(); }
  // outras línguas: preparadas no servidor; guardadas também neste aparelho
  const url = 'api/lingua?l=' + encodeURIComponent(c) + '&v=' + VER();
  let cache = null; try { cache = window.caches ? await caches.open(CK) : null; } catch (e) { }
  const hit = cache && await cache.match(url); if (hit) { const j = await hit.json(); if (j && j.completo) return j; }
  const r = await fetch(url); const j = await r.json(); if (j && j.completo && cache) { try { await cache.put(url, new Response(JSON.stringify(j), { headers: { 'content-type': 'application/json' } })); } catch (e) { } }
  return j; };
let loading = null, prepT = 0;
L.progress = null;   // { feito, total } enquanto a IA prepara uma língua nova
const prepare = async c => { // pede ao servidor para traduzir o que falta (aos poucos), mostra o progresso e recarrega no fim
  if (!(acc().on && acc().token && acc().token())) return; if (prepT) return; prepT = 1;
  for (let i = 0; i < 400 && L.code() === c; i++) { let j; try { const r = await fetch('api/lingua', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + acc().token() }, body: JSON.stringify({ op: 'preparar', l: c }) }); j = await r.json(); } catch (e) { j = null; }
    if (!j || !j.ok) { await new Promise(r => setTimeout(r, 15000)); continue; }
    L.progress = { feito: j.feito, total: j.total }; OS.request && OS.request(); bar();
    if (j.completo) break; await new Promise(r => setTimeout(r, 500)); }
  prepT = 0; L.progress = null; bar(); if (L.code() === c) { delete PKS[c]; await use(c, true); } };
const PKS = {};
const use = async (c, force) => {
  if (c === 'pt-PT') { const was = !!D; D = null; FB = null; CACHE.clear(); SYM = null; L.ready = true; if (was) restore(); dir(); return; }
  let pk = null; try { if (!PKS[c] || force) { pk = await getPack(c); PKS[c] = compile(pk.m || {}); } } catch (e) { PKS[c] = PKS[c] || null; }
  // fora do português, o que falta numa língua preparada aos poucos aparece em inglês
  if (c !== 'en' && !c.startsWith('pt')) { try { if (!PKS.en) PKS.en = compile((await getPack('en')).m || {}); } catch (e) { } FB = PKS.en || null; } else FB = null;
  if (L.code() !== c) return;
  if (D) restore();   // vinha de outra língua: primeiro volta ao original, depois traduz para a nova
  D = PKS[c] || FB; CACHE.clear(); SYM = sym(); L.ready = true; dir(); observe(); walk(document.documentElement);
  if (!SHIP.has(c) && pk && !pk.completo) prepare(c); };
const dir = () => { document.documentElement.lang = code === 'pt-PT' ? 'pt' : code; dates(); };
// nomes dos meses e dos dias da semana na língua (os do português ficam guardados para voltar)
const PTD = { MES: U.MES.slice(), MESL: U.MESL.slice(), WD: U.WD.slice(), WDS: U.WDS.slice() };
const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
const dates = () => { const put = (k, a) => { if (Array.isArray(U[k]) && a.length === U[k].length) U[k].splice(0, U[k].length, ...a); };
  if (/^pt/.test(code)) { Object.keys(PTD).forEach(k => put(k, PTD[k])); return; }
  try { const lc = L.loc(), m = o => Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(lc, o).format(new Date(2026, i, 15))), w = o => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(lc, o).format(new Date(2026, 1, 1 + i)));
    put('MES', m({ month: 'short' }).map(x => x.replace(/\.$/, ''))); put('MESL', m({ month: 'long' })); put('WD', w({ weekday: 'long' }).map(cap)); put('WDS', w({ weekday: 'short' }).map(x => cap(x.replace(/\.$/, '')))); } catch (e) { } };
// barra fina no topo enquanto a IA prepara uma língua nova
const bar = () => { let b = document.getElementById('lgBar'); const p = L.progress;
  if (!p) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'lgBar'; b.setAttribute('data-notr', ''); b.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;font:12px system-ui;background:#0B1830;color:#E9E3D8;padding:6px 12px;text-align:center'; document.body.appendChild(b); }
  b.textContent = (L.name() + ' · ' + Math.round(100 * p.feito / Math.max(1, p.total)) + '%'); };
L.set = async (c, save = true) => { if (!ok(c)) return; if (save) { U.ls.set('nau:lang', c); if (booted()) OS.setOne('profile', { lang: c }); } await L.apply(); };
L.apply = async () => { const c = want(); if (booted()) U.ls.set('nau:lang', c);   // o ecrã da conta, da próxima vez, já abre nesta língua
  if (c === code && (L.ready || c === 'pt-PT')) { L.ready = true; return; }
  code = c; L.ready = false; loading = use(c); await loading; OS.emit && OS.emit('lang', c); OS.request && OS.request(); };
L.wait = () => loading || Promise.resolve();
L.apply();
OS.on('ready', () => { isReady = true; L.apply(); });
OS.on('unlock', () => L.apply());
OS.on('one:profile', () => { if (want() !== code) L.apply(); });
OS.on('remote', () => { if (want() !== code) L.apply(); });

/* ---------- a IA responde na língua da pessoa ---------- */
const NOTE = () => code === 'pt-BR' ? 'IMPORTANTE — IDIOMA: escreve tudo o que for para a pessoa ler em português do Brasil (pt-BR), com vocabulário e tratamento brasileiros (você, celular, tela, salvar…), mesmo que as instruções acima digam "português de Portugal". Não traduzas chaves de JSON nem valores que tenham de coincidir com uma lista de opções dada nas instruções.'
  : `IMPORTANT — LANGUAGE: the person using this app reads ${L.en()}. Write every word meant for the person in ${L.en()}, even if the instructions above are written in Portuguese or ask for Portuguese. Do not translate JSON keys, IDs, or values that must match a list of allowed options given in the instructions (keep those exactly as written).${OS.Pais ? ' The person lives in ' + OS.Pais.name(OS.Pais.code(), 'en') + '.' : ''}`;
const addNote = (url, body) => { let j; try { j = JSON.parse(body); } catch (e) { return body; }
  if (/AUDIO/i.test(JSON.stringify((j.generationConfig || {}).responseModalities || ''))) return body;   // voz (TTS): sem instruções extra
  if (/generativelanguage\.googleapis\.com|\/api\/ia\b/.test(url)) { const k = j.systemInstruction ? 'systemInstruction' : j.system_instruction ? 'system_instruction' : 'systemInstruction', si = j[k] || { parts: [] }; si.parts = (si.parts || []).concat([{ text: NOTE() }]); j[k] = si; }
  else if (Array.isArray(j.messages) && /anthropic|claude/i.test(url + (j.model || ''))) { j.system = j.system ? (typeof j.system === 'string' ? j.system + '\n\n' + NOTE() : j.system.concat([{ type: 'text', text: NOTE() }])) : NOTE(); }
  else if (Array.isArray(j.messages)) { j.messages = [{ role: 'system', content: NOTE() }].concat(j.messages); }
  else return body;
  return JSON.stringify(j); };
const AIURL = /generativelanguage\.googleapis\.com\/[^?]*:(generateContent|streamGenerateContent)|\/api\/ia\?[^#]*:(generateContent|streamGenerateContent)|pollinations\.ai\/openai|api\.anthropic\.com\/v1\/messages|\/api\/brain/;
const of = window.fetch;
window.fetch = function (u, o) { try { if (code !== 'pt-PT' && o && typeof o.body === 'string') { const url = typeof u === 'string' ? u : (u && u.url) || String(u); if (AIURL.test(url)) o = Object.assign({}, o, { body: addNote(url, o.body) }); } } catch (e) { } return of.apply(this, [u, o]); };
})();
