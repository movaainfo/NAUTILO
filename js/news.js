/* OCEANUM — Jornal: notícias reais do mundo, atualizadas ao longo do dia (Google Notícias via o teu script Google).
   Mundo (em português, edições de Portugal e Brasil) + um separador por cada país que escolheres (edição local, traduzida pela IA)
   · temas (destaques, mundo, país, economia, tecnologia, ciência, saúde, desporto, cultura) e temas teus (pesquisa)
   · "O essencial agora": resumo da IA só com as manchetes reais do momento · novas notícias aparecem sozinhas. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc;
OS.ONE_DEF.news = { tabs: ['PT', 'BR'], themes: [], tr: true };
const cfg = () => OS.one('news');
const ED = { PT: ['Portugal', '🇵🇹', 'hl=pt-PT&gl=PT&ceid=PT:pt-150', 'pt'], BR: ['Brasil', '🇧🇷', 'hl=pt-BR&gl=BR&ceid=BR:pt-419', 'pt'], US: ['Estados Unidos', '🇺🇸', 'hl=en-US&gl=US&ceid=US:en', 'en'], GB: ['Reino Unido', '🇬🇧', 'hl=en-GB&gl=GB&ceid=GB:en', 'en'],
  ES: ['Espanha', '🇪🇸', 'hl=es&gl=ES&ceid=ES:es', 'es'], FR: ['França', '🇫🇷', 'hl=fr&gl=FR&ceid=FR:fr', 'fr'], DE: ['Alemanha', '🇩🇪', 'hl=de&gl=DE&ceid=DE:de', 'de'], IT: ['Itália', '🇮🇹', 'hl=it&gl=IT&ceid=IT:it', 'it'], NL: ['Países Baixos', '🇳🇱', 'hl=nl&gl=NL&ceid=NL:nl', 'nl'], BE: ['Bélgica', '🇧🇪', 'hl=fr&gl=BE&ceid=BE:fr', 'fr'], CH: ['Suíça', '🇨🇭', 'hl=de&gl=CH&ceid=CH:de', 'de'], IE: ['Irlanda', '🇮🇪', 'hl=en-IE&gl=IE&ceid=IE:en', 'en'],
  CA: ['Canadá', '🇨🇦', 'hl=en-CA&gl=CA&ceid=CA:en', 'en'], MX: ['México', '🇲🇽', 'hl=es-419&gl=MX&ceid=MX:es-419', 'es'], AR: ['Argentina', '🇦🇷', 'hl=es-419&gl=AR&ceid=AR:es-419', 'es'], CO: ['Colômbia', '🇨🇴', 'hl=es-419&gl=CO&ceid=CO:es-419', 'es'], CL: ['Chile', '🇨🇱', 'hl=es-419&gl=CL&ceid=CL:es-419', 'es'],
  JP: ['Japão', '🇯🇵', 'hl=ja&gl=JP&ceid=JP:ja', 'ja'], CN: ['China', '🇨🇳', 'hl=zh-CN&gl=CN&ceid=CN:zh-Hans', 'zh'], KR: ['Coreia do Sul', '🇰🇷', 'hl=ko&gl=KR&ceid=KR:ko', 'ko'], IN: ['Índia', '🇮🇳', 'hl=en-IN&gl=IN&ceid=IN:en', 'en'], AU: ['Austrália', '🇦🇺', 'hl=en-AU&gl=AU&ceid=AU:en', 'en'],
  RU: ['Rússia', '🇷🇺', 'hl=ru&gl=RU&ceid=RU:ru', 'ru'], UA: ['Ucrânia', '🇺🇦', 'hl=uk&gl=UA&ceid=UA:uk', 'uk'], IL: ['Israel', '🇮🇱', 'hl=he&gl=IL&ceid=IL:he', 'he'], TR: ['Turquia', '🇹🇷', 'hl=tr&gl=TR&ceid=TR:tr', 'tr'], SA: ['Arábia Saudita', '🇸🇦', 'hl=ar&gl=SA&ceid=SA:ar', 'ar'], EG: ['Egito', '🇪🇬', 'hl=ar&gl=EG&ceid=EG:ar', 'ar'],
  ZA: ['África do Sul', '🇿🇦', 'hl=en-ZA&gl=ZA&ceid=ZA:en', 'en'], NG: ['Nigéria', '🇳🇬', 'hl=en-NG&gl=NG&ceid=NG:en', 'en'], PL: ['Polónia', '🇵🇱', 'hl=pl&gl=PL&ceid=PL:pl', 'pl'], SE: ['Suécia', '🇸🇪', 'hl=sv&gl=SE&ceid=SE:sv', 'sv'], NO: ['Noruega', '🇳🇴', 'hl=no&gl=NO&ceid=NO:no', 'no'], GR: ['Grécia', '🇬🇷', 'hl=el&gl=GR&ceid=GR:el', 'el'] };
const TOPICS = [['TOP', 'Destaques'], ['WORLD', 'Mundo'], ['NATION', 'País'], ['BUSINESS', 'Economia'], ['TECHNOLOGY', 'Tecnologia'], ['SCIENCE', 'Ciência'], ['HEALTH', 'Saúde'], ['SPORTS', 'Desporto'], ['ENTERTAINMENT', 'Cultura']];
const NW = OS.News = { cache: {} };
const scr = () => { const c = OS.one('inbox'); return c && c.url && c.key ? c : null; };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
/* que feeds formam cada vista */
const specs = (tab, topic, theme) => { if (theme) return tab === 'W' ? [{ id: 'q:PT:' + theme, q: theme, ed: ED.PT[2] }, { id: 'q:BR:' + theme, q: theme, ed: ED.BR[2] }] : [{ id: 'q:' + tab + ':' + theme, q: theme, ed: ED[tab][2] }];
  if (tab === 'W') { const t = topic === 'TOP' || topic === 'NATION' ? 'WORLD' : topic; return [{ id: 'PT:' + t, t, ed: ED.PT[2] }, { id: 'BR:' + t, t, ed: ED.BR[2] }]; }
  return [{ id: tab + ':' + topic, t: topic, ed: ED[tab][2] }]; };
const merge = lists => { const seen = new Set(), out = []; const L = lists.filter(Boolean); const max = Math.max(0, ...L.map(l => l.length));
  for (let i = 0; i < max; i++) L.forEach(l => { const x = l[i]; if (!x) return; const k = norm(x.t).slice(0, 60); if (seen.has(k)) return; seen.add(k); out.push(x); }); return out; };
/* busca no script (em lotes) */
NW.fetch = async (sp, force) => { const need = sp.filter(s => force || !NW.cache[s.id] || Date.now() - NW.cache[s.id].at > 4 * 6e4); if (!need.length) return; const c = scr(); if (!c) throw new Error('sem script');
  const u = c.url + (c.url.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(c.key) + '&op=nw&f=' + encodeURIComponent(JSON.stringify(need)) + '&_=' + Date.now();
  // sem resposta em 25 s (script a acordar ou sem rede) desiste e mostra o motivo, em vez de ficar a rodar para sempre
  const ac = window.AbortController ? new AbortController() : null, to = ac && setTimeout(() => ac.abort(), window.__nwTO || 25000); let r, txt;
  try { r = await fetch(u, { cache: 'no-store', credentials: 'omit', signal: ac ? ac.signal : undefined }); txt = await r.text(); }
  catch (e) { throw new Error(e && e.name === 'AbortError' ? 'o teu script Google não respondeu a tempo (pode estar a acordar: tenta outra vez)' : 'sem ligação ao teu script Google'); } finally { to && clearTimeout(to); }
  let j; try { j = JSON.parse(txt); } catch (e) { throw new Error(/accounts\.google|ServiceLogin|Sign in/i.test(txt) ? 'o script Google pede início de sessão: na implementação escolhe "Quem tem acesso: Qualquer pessoa"' : 'o script Google respondeu com um erro'); }
  if (j && j.ok === false && /Valor inv/i.test(j.msg || '')) { NW.old = true; throw new Error('script antigo'); }
  if (j && j.ok === false) throw new Error(j.msg || 'o script recusou o pedido'); if (!j.nw) { NW.old = true; throw new Error('script antigo'); } NW.old = false;
  NW.okAt = Date.now(); Object.entries(j.nw).forEach(([id, items]) => { const prev = NW.cache[id]; NW.cache[id] = { at: Date.now(), items: items || [] }; if (prev && prev.items.length) { const old = new Set(prev.items.map(x => norm(x.t))); NW.cache[id].fresh = (items || []).filter(x => !old.has(norm(x.t))).map(x => norm(x.t)); } });
  try { U.ls.set('oc_news1', Object.fromEntries(Object.entries(NW.cache).slice(-24))); } catch (e) { } };
Object.assign(NW.cache, U.ls.get('oc_news1', {}) || {});
const itemsFor = (tab, topic, theme) => { const all = merge(specs(tab, topic, theme).map(s => NW.cache[s.id] && NW.cache[s.id].items)), cut = Date.now() - 48 * 36e5; return [...all.filter(x => !x.d || x.d >= cut), ...all.filter(x => x.d && x.d < cut)]; };
// manchetes para o Spyke ler (Portugal + mundo), sem o nome do jornal no fim
NW.headlines = async (n = 5) => { const sp = specs('PT', 'TOP', '').concat(specs('W', 'TOP', '')); try { if (scr()) await NW.fetch(sp); } catch (e) { } const L = merge([itemsFor('PT', 'TOP', ''), itemsFor('W', 'TOP', '')]); return L.slice(0, n).map(x => String(x.t || '').replace(/\s+[-–|]\s+[^-–|]{2,45}$/, '').trim()).filter(Boolean); };
const freshSet = (tab, topic, theme) => new Set(specs(tab, topic, theme).flatMap(s => (NW.cache[s.id] && NW.cache[s.id].fresh) || []));
const ago = d => { if (!d) return ''; const m = Math.round((Date.now() - d) / 6e4); return m < 1 ? 'agora' : m < 60 ? 'há ' + m + ' min' : m < 1440 ? 'há ' + Math.round(m / 60) + ' h' : U.fmtD(U.iso(new Date(d))); };
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
const fav = u => host(u) ? `<img class="nw-fav" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(u))}&sz=32" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';

/* ---------- tradução (IA) dos títulos de países noutras línguas ---------- */
const TR = U.ls.get('oc_newstr1', {}) || {}; let TRB = false;
const trKey = t => norm(t).slice(0, 80);
const translate = async (items, lang) => { if (TRB || !(OS.AI && OS.AI.key()) || !cfg().tr || lang === 'pt') return; const todo = items.filter(x => !TR[trKey(x.t)]).slice(0, 40); if (!todo.length) return; TRB = true; OS.request();
  try { const o = await OS.AI.json([{ text: 'Traduz para português de Portugal estes títulos de notícias, de forma fiel e natural (mantém nomes próprios). Responde APENAS JSON {"t":["…"]} com a mesma ordem e quantidade. Títulos: ' + JSON.stringify(todo.map(x => x.t)) }], .1);
    (o.t || []).forEach((t, i) => { if (todo[i] && t) TR[trKey(todo[i].t)] = String(t).slice(0, 300); }); const keys = Object.keys(TR); if (keys.length > 800) keys.slice(0, keys.length - 800).forEach(k => delete TR[k]); U.ls.set('oc_newstr1', TR); } catch (e) { }
  TRB = false; OS.request(); };
const ttl = (x, lang) => lang !== 'pt' && cfg().tr && TR[trKey(x.t)] ? TR[trKey(x.t)] : x.t;

/* ---------- "O essencial agora" (IA, só com as manchetes reais) ---------- */
const BR = U.ls.get('oc_newsbr1', {}) || {}; let BRB = '';
const sig = items => items.slice(0, 20).map(x => norm(x.t).slice(0, 30)).join('|');
const briefing = async (key, items, place, force) => { if (BRB || !(OS.AI && OS.AI.key()) || items.length < 5) return; const s = sig(items), b = BR[key];
  if (!force && b && (b.sig === s || Date.now() - b.at < 90 * 6e4)) return; BRB = key; OS.request();
  try { const list = items.slice(0, 35).map((x, i) => ({ i, t: x.t, fonte: x.s, quando: ago(x.d) }));
    const o = await OS.AI.json([{ text: `És o editor de um jornal. A partir APENAS destas manchetes reais de ${place} (agora: ${new Date().toLocaleString('pt-PT')}), escreve "O essencial agora" em português de Portugal para o Ryan (brasileiro, vive em Aveiro, estudante, investe). Junta manchetes do mesmo assunto, ordena por importância e não inventes factos que não estejam nas manchetes; se algo for incerto, diz que ainda está em desenvolvimento.
MANCHETES: ${JSON.stringify(list)}
Responde APENAS JSON: {"titulo":"a frase que resume o dia (máx 14 palavras)","pontos":[{"titulo":"…","resumo":"2 frases","porque":"porque importa (1 frase)","idx":[índices das manchetes]}],"para_ti":"1–2 frases: o que isto pode significar para a vida dele (Portugal, Brasil, estudos, dinheiro), sem alarmismo"}. Entre 4 e 7 pontos.` }], .2);
    BR[key] = { at: Date.now(), sig: s, titulo: String(o.titulo || '').slice(0, 160), pontos: (o.pontos || []).slice(0, 7).map(p => ({ titulo: String(p.titulo || '').slice(0, 140), resumo: String(p.resumo || '').slice(0, 500), porque: String(p.porque || '').slice(0, 250), idx: (p.idx || []).filter(n => Number.isInteger(n) && items[n]).slice(0, 4).map(n => ({ t: items[n].t, s: items[n].s, l: items[n].l })) })), para_ti: String(o.para_ti || '').slice(0, 400) };
    U.ls.set('oc_newsbr1', BR); } catch (e) { NW.berr = e.message; }
  BRB = ''; OS.request(); };

/* ---------- ecrã ---------- */
let busy = false, err = '', lastLoad = 0, busyAt = 0, tick = 0, errAt = 0;
const load = async (force) => { if (busy) return; const tab = OS.ui.nwTab || 'W', topic = OS.ui.nwTopic || 'TOP', theme = OS.ui.nwTheme || ''; busy = true; busyAt = Date.now(); err = ''; OS.request();
  clearInterval(tick); tick = setInterval(() => { const e = document.getElementById('nwSec'); if (!busy || !e) return clearInterval(tick); const s2 = Math.round((Date.now() - busyAt) / 1000); e.textContent = s2 + ' s' + (s2 >= 6 ? ' · o script Google demora mais na primeira vez do dia' : ''); }, 1000);
  try { await NW.fetch(specs(tab, topic, theme), force); const it = itemsFor(tab, topic, theme), fr = freshSet(tab, topic, theme); if (fr.size && !force && lastLoad) UI.toast(`${fr.size} notícia(s) nova(s)`, 'pos'); lastLoad = Date.now();
    if (tab !== 'W' && ED[tab][3] !== 'pt') translate(it, ED[tab][3]); if (topic === 'TOP' && !theme) briefing(tab, it, tab === 'W' ? 'todo o mundo' : ED[tab][0]); }
  catch (e) { errAt = Date.now(); err = NW.old ? 'O teu script Google é uma versão antiga e ainda não sabe buscar notícias. Atualiza-o (5 minutos, passo a passo na página do Spyke).' : !scr() ? '' : 'Não consegui buscar as notícias: ' + e.message + '.'; }
  busy = false; clearInterval(tick); OS.request(); };
V.jornal = () => { const tab = OS.ui.nwTab || 'W', topic = OS.ui.nwTopic || 'TOP', theme = OS.ui.nwTheme || '', C2 = cfg(), lang = tab === 'W' ? 'pt' : ED[tab][3];
  const sp = specs(tab, topic, theme), stale = sp.some(s => !NW.cache[s.id] || Date.now() - NW.cache[s.id].at > 4 * 6e4); if (stale && !busy && scr() && (Date.now() - errAt > 90000 || (NW.okAt || 0) > errAt)) setTimeout(() => load(false), 30);
  const items = itemsFor(tab, topic, theme), fr = freshSet(tab, topic, theme), place = tab === 'W' ? 'Mundo' : ED[tab][0], b = !theme && topic === 'TOP' ? BR[tab] : null, last = Math.max(0, ...sp.map(s => (NW.cache[s.id] || {}).at || 0));
  const tabs = `<div class="nw-tabs"><button class="${tab === 'W' ? 'on' : ''}" data-act="nwTab" data-v="W">🌍 Mundo</button>${(C2.tabs || []).filter(k => ED[k]).map(k => `<button class="${tab === k ? 'on' : ''}" data-act="nwTab" data-v="${k}">${ED[k][1]} ${esc(ED[k][0])}<i data-act="nwDelTab" data-v="${k}" title="Remover" aria-label="Remover ${esc(ED[k][0])}">×</i></button>`).join('')}<button class="nw-add" data-act="nwAddTab">+ País</button></div>`;
  const tops = `<div class="nw-topics">${TOPICS.filter(t => !(tab === 'W' && t[0] === 'NATION')).map(([k, l]) => `<button class="chip ${!theme && topic === k ? 'on' : ''}" data-act="nwTopic" data-v="${k}">${l}</button>`).join('')}${(C2.themes || []).map(t => `<button class="chip ${theme === t ? 'on' : ''}" data-act="nwTheme" data-v="${esc(t)}">#${esc(t)}<i data-act="nwDelTheme" data-v="${esc(t)}" aria-label="Remover tema">×</i></button>`).join('')}<form class="row gap6" data-form="nwTheme"><input class="field" name="q" placeholder="+ tema (ex.: Aveiro, IA, Ucrânia)" style="width:220px" aria-label="Novo tema"></form></div>`;
  if (!scr()) return UI.head('Jornal', 'As notícias mais importantes do mundo, em tempo real.', '', 'Visão geral') + tabs + `<div class="pn"><h3>Liga as notícias</h3><p>As notícias chegam através do teu script Google (o mesmo do atalho de gastos, sincronização e cotações). Configura-o em <a class="acc" href="#definicoes">Definições → Atalho de gastos</a> e cola o código novo (Investimentos → Cotações → Copiar código novo).</p>${OS.Move && !OS.Move.isOld ? '<p class="mut" style="margin:0">Já o tinhas no endereço antigo? <a class="acc" href="#definicoes" data-act="mvWelcome">Traz os teus dados</a>: o script vem com eles e as notícias aparecem logo.</p>' : ''}</div>`;
  return UI.head('Jornal', 'As notícias mais importantes do mundo e de cada país, em tempo real. Atualiza sozinho ao longo do dia.', `<button class="btn sm ghost" data-act="nwRefresh">${UI.ic('sync')}${busy ? 'A atualizar…' : 'Atualizar'}</button>`, 'Visão geral') + tabs + tops
    + `<div class="nw-meta"><span class="inv-live"><i></i>${last ? 'Atualizado ' + ago(last) : 'A carregar…'} · Google Notícias${tab !== 'W' && lang !== 'pt' ? ` · <label><input type="checkbox" data-act="nwTr" ${C2.tr ? 'checked' : ''}> traduzir para português</label>${TRB ? ' (a traduzir…)' : ''}` : ''}</span></div>${err ? `<div class="note nw-err">${esc(err)} ${NW.old ? '<a class="btn xs pri" href="#spyke">Ver o passo a passo</a>' : '<button class="btn xs" data-act="nwRefresh">Tentar outra vez</button>'}</div>` : ''}
    ${!theme && topic === 'TOP' ? brief(b, tab, place) : ''}
    ${items.length ? `<div class="nw-list">${items.slice(0, 60).map((x, i) => card(x, i, lang, fr.has(norm(x.t)))).join('')}</div>` : busy ? `<div class="pn"><div class="sai-busy"><div class="fd-spin"></div><span>A buscar as notícias do momento… <small class="mut" id="nwSec">${Math.round((Date.now() - busyAt) / 1000)} s</small></span></div></div>` : err ? '' : UI.empty('Sem notícias para mostrar.', '<button class="btn sm" data-act="nwRefresh">Atualizar</button>')}
    <p class="mut" style="font-size:11.5px">Fonte: Google Notícias (agregador de jornais). Cada notícia abre no site do jornal que a publicou.</p>`; };
const card = (x, i, lang, isNew) => { const t = ttl(x, lang), orig = t !== x.t ? x.t : '';
  return `<article class="nw-c ${i === 0 ? 'lead' : ''}"><a href="${esc(x.l)}" target="_blank" rel="noopener"><div class="nw-src">${fav(x.su)}<span>${esc(x.s || host(x.su))}</span><span class="mut">· ${ago(x.d)}</span>${isNew ? '<span class="bdg pos">novo</span>' : ''}</div><h3>${esc(t)}</h3>${orig ? `<small class="mut">${esc(orig)}</small>` : ''}</a>
    ${(x.rel || []).length ? `<details class="nw-rel"><summary>+${x.rel.length} fonte(s)</summary>${x.rel.map(r => `<a href="${esc(r.l)}" target="_blank" rel="noopener"><b>${esc(r.s)}</b> ${esc(ttl(r, lang))}</a>`).join('')}</details>` : ''}</article>`; };
const brief = (b, tab, place) => { const has = OS.AI && OS.AI.key();
  if (!has) return `<div class="pn nw-brief"><div class="eyebrow">O essencial agora</div><p class="mut" style="margin:0 0 8px">Com o Spyke (IA) ligado, aqui aparece um resumo das notícias mais importantes do momento, feito só com as manchetes reais abaixo.</p>${OS.AI && OS.AI.setup ? OS.AI.setup('') : ''}</div>`;
  if (!b || (!b.titulo && !(b.pontos || []).length)) return BRB ? `<div class="pn nw-brief"><div class="sai-busy"><div class="fd-spin"></div><span>A ler as manchetes de ${esc(place)} e a preparar o resumo…</span></div></div>` : '';
  return `<div class="pn nw-brief"><div class="row between gap8"><div class="eyebrow">O essencial agora · ${esc(place)} · ${ago(b.at)}</div><button class="btn xs ghost" data-act="nwBrief">${BRB ? 'A atualizar…' : 'Atualizar resumo'}</button></div><h2>${esc(b.titulo)}</h2>
    <ol>${b.pontos.map(p => `<li><b>${esc(p.titulo)}</b><p>${esc(p.resumo)}</p>${p.porque ? `<small class="mut">Porque importa: ${esc(p.porque)}</small>` : ''}${p.idx.length ? `<div class="nw-bs">${p.idx.map(x => `<a href="${esc(x.l)}" target="_blank" rel="noopener">${esc(x.s)}</a>`).join('')}</div>` : ''}</li>`).join('')}</ol>
    ${b.para_ti ? `<div class="fe-step"><b>Para ti:</b> ${esc(b.para_ti)}</div>` : ''}<small class="mut">Resumo feito pela IA apenas com as manchetes publicadas; abre as fontes para os detalhes.</small></div>`; };
A.nwTab = b => { if (b.target && b.target.closest && b.target.closest('[data-act=nwDelTab]')) return; OS.setUI('nwTab', b.dataset.v); OS.setUI('nwTheme', ''); OS.setUI('nwTopic', 'TOP'); };
A.nwTopic = b => { OS.setUI('nwTopic', b.dataset.v); OS.setUI('nwTheme', ''); };
A.nwTheme = b => OS.setUI('nwTheme', b.dataset.v);
A.nwRefresh = () => { errAt = 0; load(true); };
A.nwBrief = () => { const tab = OS.ui.nwTab || 'W'; briefing(tab, itemsFor(tab, 'TOP', ''), tab === 'W' ? 'todo o mundo' : ED[tab][0], true); };
A.nwTr = () => { cfg().tr = !cfg().tr; OS.touch('news'); };
A.nwDelTab = b => { const c = cfg(); c.tabs = (c.tabs || []).filter(x => x !== b.dataset.v); OS.touch('news'); if (OS.ui.nwTab === b.dataset.v) OS.setUI('nwTab', 'W'); };
A.nwDelTheme = b => { const c = cfg(); c.themes = (c.themes || []).filter(x => x !== b.dataset.v); OS.touch('news'); if (OS.ui.nwTheme === b.dataset.v) OS.setUI('nwTheme', ''); };
A.nwAddTab = () => UI.modal(`<div style="padding:18px"><div class="row between"><h3 style="margin:0">Escolhe o país</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div><p class="mut">Cria um separador com as notícias desse país (edição local do Google Notícias${OS.AI && OS.AI.key() ? ', traduzidas para português' : ''}).</p><div class="nw-countries">${Object.entries(ED).map(([k, e]) => `<button class="${(cfg().tabs || []).includes(k) ? 'on' : ''}" data-act="nwPick" data-v="${k}">${e[1]} ${esc(e[0])}</button>`).join('')}</div></div>`);
A.nwPick = b => { const c = cfg(), k = b.dataset.v; c.tabs = c.tabs || []; if (!c.tabs.includes(k)) c.tabs.push(k); OS.touch('news'); UI.closeModal(); OS.setUI('nwTab', k); OS.setUI('nwTopic', 'TOP'); OS.setUI('nwTheme', ''); };
OS.forms = OS.forms || {}; OS.forms.nwTheme = (f, v) => { const q = String(v('q') || '').trim().slice(0, 40); if (!q) return; const c = cfg(); c.themes = c.themes || []; if (!c.themes.includes(q)) c.themes.push(q); OS.touch('news'); OS.setUI('nwTheme', q); };
/* atualização ao longo do dia: com o Jornal aberto a cada 5 min; noutras páginas, os destaques do mundo a cada 20 min (para o contador no menu) */
let seenTop = U.ls.get('oc_newsseen', 0) || 0;
NW.unread = () => { const it = itemsFor('W', 'TOP', ''); return it.filter(x => x.d > seenTop && x.d > Date.now() - 6 * 36e5).length; };
// ao abrir a app já vai buscando os destaques: quando abrires o Jornal estão prontos
OS.on('ready', () => setTimeout(() => { if (document.hidden || !scr() || navigator.webdriver) return; if (Date.now() - ((NW.cache['PT:WORLD'] || {}).at || 0) > 10 * 6e4) NW.fetch(specs('W', 'TOP', '')).then(() => OS.request()).catch(() => { }); }, 2500));
OS.on('ready', () => { setInterval(() => { if (document.hidden || !scr()) return; const on = /^#jornal/.test(location.hash); if (on) load(false); else if (Date.now() - ((NW.cache['PT:WORLD'] || {}).at || 0) > 20 * 6e4) NW.fetch(specs('W', 'TOP', '')).then(() => OS.request()).catch(() => { }); }, 5 * 6e4);
  addEventListener('hashchange', () => { if (/^#jornal/.test(location.hash)) { seenTop = Date.now(); U.ls.set('oc_newsseen', seenTop); } }); });
})();
