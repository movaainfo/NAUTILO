/* OCEANUM — Fé & Devoção: uma parte dedicada a Deus.
   Hoje com Deus (versículo do dia, como estás, uma palavra para hoje pela IA com base no teu dia, leitura, oração guiada) ·
   Bíblia completa (Bíblia Livre 2018 e Almeida 1911, sem internet), com pesquisa, destaques e notas ·
   Meu devocional (método SOAP: Escritura, Observação, Aplicação, Oração + gratidão) · Pedidos de oração e respostas · Planos de leitura. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc, FD = OS.FaithData || { vod: ['JHN 3:16'], mood: {} };
OS.ONE_DEF.faith = { ver: 'livre', plan: '', planStart: '', fs: 18, word: null };
const cfg = () => OS.one('faith');
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const today = () => U.today();

/* ---------- coleções ---------- */
OS.S.devos = { label: 'Devocional', title: r => 'Devocional · ' + U.fmtD(r.date), fields: [
  { k: 'date', l: 'Data', t: 'date', req: 1 }, { k: 'ref', l: 'Leitura (passagem)', t: 'text', h: 'Ex.: Romanos 8, Salmos 23, João 15:1-11' }, { k: 'key', l: 'Versículo que mais me tocou', t: 'area', rows: 2 },
  { k: 'obs', l: 'Observação — o que o texto diz?', t: 'area', rows: 3 }, { k: 'app', l: 'Aplicação — o que Deus me pede hoje?', t: 'area', rows: 3 }, { k: 'prayer', l: 'Oração', t: 'area', rows: 3 },
  { k: 'g1', l: 'Gratidão 1', t: 'text' }, { k: 'g2', l: 'Gratidão 2', t: 'text' }, { k: 'g3', l: 'Gratidão 3', t: 'text' }], defaults: () => ({ date: today() }) };
OS.S.prayers = { label: 'Pedido de oração', title: r => r.title, fields: [
  { k: 'title', l: 'Pedido', t: 'text', req: 1 }, { k: 'who', l: 'Por quem', t: 'sel', o: ['Eu', 'Família', 'Amigos', 'Igreja', 'Estudos e trabalho', 'Saúde', 'Finanças', 'Mundo', 'Outros'] },
  { k: 'details', l: 'Detalhes', t: 'area', rows: 3 }, { k: 'date', l: 'Desde', t: 'date' }, { k: 'status', l: 'Estado', t: 'sel', o: ['A orar', 'Respondida'] },
  { k: 'answer', l: 'Como Deus respondeu (testemunho)', t: 'area', rows: 3, show: r => r.status === 'Respondida' }, { k: 'answeredAt', l: 'Respondida em', t: 'date', show: r => r.status === 'Respondida' }],
  defaults: () => ({ date: today(), status: 'A orar', who: 'Eu' }), after: (r) => { if (r.status === 'Respondida' && !r.answeredAt) OS.upd('prayers', r.id, { answeredAt: today() }, { silent: true }); } };

/* ---------- Bíblia ---------- */
const VERS = { livre: 'Bíblia Livre (2018)', almeida: 'Almeida (1911)' };
const BIB = {}, BL = {};
const loadBible = v => BL[v] || (BL[v] = fetch('vendor/biblia/' + v + '.json').then(r => r.json()).then(d => { d.idx = {}; d.b.forEach((b, i) => d.idx[b[0]] = i); BIB[v] = d; OS.request(); return d; }).catch(e => { delete BL[v]; throw e; }));
const ver = () => BIB[cfg().ver] ? cfg().ver : BIB.livre ? 'livre' : cfg().ver || 'livre';
const bible = () => { const v = cfg().ver || 'livre'; if (!BIB[v]) loadBible(v).catch(() => { }); return BIB[v] || BIB.livre || null; };
const FB = OS.Faith = { loadBible, bible };
const bookOf = id => { const B = bible(); return B ? B.b[B.idx[id]] : null; };
const parseRef = r => { const m = String(r || '').match(/^([1-3]?[A-Z]{2,3})\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/); return m ? { b: m[1], c: +m[2], v1: m[3] ? +m[3] : null, v2: m[4] ? +m[4] : m[3] ? +m[3] : null } : null; };
const label = R => { const b = bookOf(R.b); return (b ? b[1] : R.b) + ' ' + R.c + (R.v1 ? ':' + R.v1 + (R.v2 && R.v2 !== R.v1 ? '-' + R.v2 : '') : ''); };
const verses = R => { const b = bookOf(R.b); if (!b) return []; const ch = b[3][R.c - 1] || []; const v1 = R.v1 || 1, v2 = R.v2 || (R.v1 ? R.v1 : ch.length); return ch.slice(v1 - 1, v2).map((t, i) => [v1 + i, t]); };
const textOf = R => verses(R).map(x => x[1]).join(' ');
FB.parseRef = parseRef; FB.textOf = textOf; FB.label = label;
/* passagem escrita por extenso: "Romanos 8", "Rm 8:28", "1 Coríntios 13:4-7", "sl 23" */
FB.parseHuman = s => { const B = bible(); if (!B) return null; const m = norm(s).trim().match(/^([1-3]?\s*[a-zÀ-ſ. ]+?)\s*(\d+)(?:[:.,](\d+)(?:\s*-\s*(\d+))?)?$/); if (!m) return null; const nm = m[1].replace(/[.\s]/g, '');
  const b = B.b.find(x => norm(x[1]).replace(/\s/g, '') === nm) || B.b.find(x => norm(x[2]).replace(/\s/g, '') === nm) || B.b.find(x => norm(x[1]).replace(/\s/g, '').startsWith(nm) && nm.length >= 3);
  if (!b || +m[2] > b[3].length) return null; return { b: b[0], c: +m[2], v1: m[3] ? +m[3] : null, v2: m[4] ? +m[4] : m[3] ? +m[3] : null }; };
const hashDay = d => { let h = 0; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
FB.vod = (d = today()) => parseRef(FD.vod[hashDay(d + 'oc') % FD.vod.length]);
const crisis = t => /suic|me matar|quero morrer|acabar com (a minha|tudo)|n[aã]o quero (mais )?viver|n[aã]o aguento mais viver|tirar a (minha )?vida/i.test(t || '');
const HELP = `<div class="fe-help"><b>Não estás sozinho.</b> Se estás a pensar em fazer-te mal, fala já com alguém: <b>SOS Voz Amiga</b> 213 544 545 · 912 802 669 · <b>SNS 24</b> 808 24 24 24 (opção 4, aconselhamento psicológico) · emergência <b>112</b>. No Brasil: <b>CVV 188</b>. Deus está perto dos que têm o coração quebrantado (Salmos 34:18), e há pessoas prontas para te ouvir agora.</div>`;

/* ---------- registo do dia ---------- */
const todayDevo = () => OS.all('devos').find(d => d.date === today());
const devoSet = (k, v) => { const d = todayDevo(); if (d) OS.upd('devos', d.id, { [k]: v }, { silent: true }); else OS.add('devos', { date: today(), [k]: v }, { silent: true }); };
document.addEventListener('change', e => { const el = e.target; if (!el.dataset || !el.dataset.dv) return; devoSet(el.dataset.dv, el.value); if (el.dataset.dv === 'note' && crisis(el.value)) OS.request(); });
const MOODS = Object.keys(FD.mood);
A.feMood = b => { const d = todayDevo(), cur = (d && d.moods) || [], m = b.dataset.m; devoSet('moods', cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m].slice(-4)); OS.request(); };
const streak = () => { const days = new Set(OS.all('devos').filter(d => d.obs || d.app || d.prayer || d.key || d.g1 || d.read).map(d => d.date)); OS.all('bread').forEach(r => days.add(r.date)); let s = 0, d = today(); if (!days.has(d)) d = U.addDays(d, -1); while (days.has(d)) { s++; d = U.addDays(d, -1); } return { s, days }; };

/* ---------- palavra para hoje (IA + o teu dia) ---------- */
const dayContext = () => { const t = today(), d = todayDevo() || {}, safe = f => { try { return f(); } catch (e) { return null; } };
  return { hoje: new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }), hora: new Date().getHours(), como_estou: (d.moods || []).join(', ') || null, o_que_me_pesa: d.note || null,
    agenda_hoje: safe(() => OS.all('events').filter(e => e.date === t).map(e => (e.start ? e.start + ' ' : '') + e.title).slice(0, 6)),
    tarefas_atrasadas: safe(() => OS.Tasks.open().filter(OS.Tasks.late).map(x => x.title).slice(0, 5)), tarefas_abertas: safe(() => OS.Tasks.open().length),
    avaliacoes_proximas: safe(() => OS.all('assessments').filter(a => a.date >= t && U.diff(a.date, t) <= 10 && !(a.grade > 0)).map(a => a.title + ' (' + U.fmtD(a.date) + ')').slice(0, 4)),
    treinos_ultimos_7_dias: safe(() => OS.all('workouts').filter(w => w.date >= U.addDays(t, -7)).length), corridas_7_dias: safe(() => OS.all('runs').filter(r => r.date >= U.addDays(t, -7)).length),
    alertas_da_vida: safe(() => OS.Intel.alerts().slice(0, 6).map(a => a.title + (a.detail ? ' — ' + a.detail : ''))),
    devocional: { dias_seguidos: streak().s, pedidos_de_oracao_abertos: OS.all('prayers').filter(p => p.status !== 'Respondida').map(p => p.title).slice(0, 5) } }; };
const pickByMood = (moods, seed) => { const pool = (moods || []).flatMap(m => FD.mood[m] || []); const list = pool.length ? pool : FD.vod; return parseRef(list[hashDay(today() + (seed || '')) % list.length]); };
const PHR = { ansioso: 'Entrega a Deus o que não controlas. Ele cuida do amanhã; tu só precisas do passo de hoje.', cansado: 'Descansar também é fé. Hoje, recebe em vez de provar.', triste: 'A tristeza não te afasta de Deus: Ele está mais perto do coração quebrantado.', 'com medo': 'O medo fala alto, mas não tem a última palavra. Não estás sozinho nisto.', sobrecarregado: 'Não tens de carregar tudo hoje. Faz a próxima coisa certa e deixa o resto com Ele.', desanimado: 'O que Deus começou em ti, Ele não abandona a meio.', sozinho: 'Mesmo quando ninguém vê, Deus vê-te pelo nome.', culpado: 'Arrepender-se é voltar para casa — e a porta está aberta.', tentado: 'Há sempre uma saída. Hoje, escolhe a porta que Deus abre.', irritado: 'Antes de responderes, respira e ora. A mansidão também é força.', confuso: 'Pede sabedoria: Deus dá a quem pede, sem te humilhar por perguntares.', grato: 'Agradecer abre os olhos para tudo o que já recebeste.', alegre: 'Que a tua alegria hoje seja também louvor.', 'em paz': 'Guarda esta paz: ela é presente, não conquista.', motivado: 'Faz tudo de coração, como para Deus — os resultados são d\'Ele.', 'preocupado com dinheiro': 'Busca primeiro o Reino; Deus conhece cada conta que tens.', 'pressionado nos estudos': 'Estuda com diligência e descansa em Deus: a tua identidade não é uma nota.', doente: 'O teu corpo está cansado, mas a tua vida está nas mãos d\'Ele.' };
let WB = false, WERR = '';
A.feWord = async () => { if (WB) return; const d = todayDevo() || {}, ctx = dayContext();
  if (!(OS.AI && OS.AI.key())) { const R = pickByMood(d.moods, 'w'); cfg().word = { date: today(), ref: R.b + ' ' + R.c + ':' + R.v1 + (R.v2 !== R.v1 ? '-' + R.v2 : ''), frase: (d.moods || []).map(m => PHR[m]).filter(Boolean)[0] || 'Deus está contigo neste dia — em cada tarefa, em cada conversa, em cada silêncio.', porque: (d.moods || []).length ? 'Escolhido para quem hoje se sente ' + d.moods.join(', ') + '.' : 'O versículo do dia.', ai: false }; OS.touch('faith'); return; }
  WB = true; WERR = ''; OS.request();
  try { const o = await OS.AI.json([{ text: `És um conselheiro devocional cristão, fiel à Bíblia, caloroso e sem julgamentos, a falar com o Ryan (brasileiro, vive em Aveiro, Portugal, estudante). Com base em como ele está hoje e no que a vida dele mostra (dados do Oceanum abaixo), escolhe a palavra de Deus que ele provavelmente PRECISA de ouvir hoje.
DADOS DE HOJE: ${JSON.stringify(ctx)}
Regras: usa versículos reais e adequados ao contexto (não tires versículos do contexto para prometer riqueza ou sucesso); não inventes factos sobre a vida dele; português de Portugal, 2.ª pessoa (tu); a frase deve ser curta e memorável; se houver sinais de sofrimento grave ou risco, preenche "alerta" com uma mensagem de cuidado.
Responde APENAS JSON: {"frase":"máx 25 palavras","ref":{"livro":"código USFM de 3 letras (GEN, EXO, PSA, PRO, ISA, MAT, MRK, LUK, JHN, ACT, ROM, 1CO, 2CO, GAL, EPH, PHP, COL, 1TH, 2TI, HEB, JAS, 1PE, 1JN, REV…)","cap":numero,"v1":numero,"v2":numero},"porque":"1–2 frases a ligar a palavra ao dia dele, concreto","reflexao":"3 a 5 frases","oracao":"oração curta em 1.ª pessoa","passo":"um passo prático de fé para hoje","alerta":null}` }], .4);
    const r = o.ref || {}, R = { b: String(r.livro || '').toUpperCase(), c: +r.cap, v1: +r.v1 || 1, v2: +r.v2 || +r.v1 || 1 }; const ok = bookOf(R.b) && verses(R).length && verses(R).length <= 8;
    const RR = ok ? R : pickByMood(d.moods, 'w');
    cfg().word = { date: today(), ref: RR.b + ' ' + RR.c + ':' + RR.v1 + (RR.v2 !== RR.v1 ? '-' + RR.v2 : ''), frase: String(o.frase || '').slice(0, 220), porque: String(o.porque || '').slice(0, 400), reflexao: String(o.reflexao || '').slice(0, 1200), oracao: String(o.oracao || '').slice(0, 800), passo: String(o.passo || '').slice(0, 300), alerta: o.alerta ? String(o.alerta).slice(0, 400) : '', ai: true, fixed: !ok }; OS.touch('faith'); }
  catch (e) { WERR = e.message || 'A IA não respondeu.'; }
  WB = false; OS.request(); };

/* ---------- planos de leitura ---------- */
const NT0 = 39;
const chaptersOf = ids => { const B = bible(); if (!B) return []; return ids.flatMap(id => { const b = B.b[B.idx[id]]; return b ? b[3].map((ch, i) => ({ r: id + '.' + (i + 1), n: ch.length })) : []; }); };
const split = (list, days) => { const tot = U.sum(list, x => x.n), per = tot / days, out = []; let cur = [], acc = 0, k = 1; list.forEach(x => { cur.push(x.r); acc += x.n; if (acc >= per * k && out.length < days - 1) { out.push(cur); cur = []; k++; } }); if (cur.length) out.push(cur); return out; };
const PLANS = { ano: ['Bíblia em 1 ano', 'Do Génesis ao Apocalipse, ~15 min por dia', () => { const B = bible(); return split(chaptersOf(B.b.map(b => b[0])), 365); }],
  nt90: ['Novo Testamento em 90 dias', 'Os Evangelhos, Atos, as cartas e o Apocalipse', () => { const B = bible(); return split(chaptersOf(B.b.slice(NT0).map(b => b[0])), 90); }],
  evang: ['Evangelhos em 30 dias', 'A vida de Jesus: Mateus, Marcos, Lucas e João', () => split(chaptersOf(['MAT', 'MRK', 'LUK', 'JHN']), 30)],
  sp: ['Salmos e Provérbios em 31 dias', '5 Salmos e 1 Provérbio por dia', () => Array.from({ length: 31 }, (_, i) => [...Array.from({ length: 5 }, (_, k) => 'PSA.' + (i * 5 + k + 1)).filter(r => +r.split('.')[1] <= 150), 'PRO.' + (i + 1)])],
  cartas: ['Cartas de Paulo em 40 dias', 'De Romanos a Filémon', () => split(chaptersOf(['ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM']), 40)] };
const SCH = {};
const schedule = k => { if (!PLANS[k] || !bible()) return null; return SCH[k] || (SCH[k] = PLANS[k][2]()); };
const readSet = () => new Set(OS.all('bread').map(r => r.ref));
const planToday = () => { const k = cfg().plan, S = k && schedule(k); if (!S) return null; const di = Math.max(0, Math.min(S.length - 1, U.diff(today(), cfg().planStart || today()))), rs = readSet();
  const done = S.flat().filter(r => rs.has(r)).length, total = S.flat().length, behind = S.slice(0, di).flat().filter(r => !rs.has(r)).length; return { k, di, day: S[di], done, total, behind, all: S }; };
const refLabel = r => { const [b, c] = r.split('.'); const bk = bookOf(b); return (bk ? bk[1] : b) + ' ' + c; };
const groupRefs = rs => { const out = []; rs.forEach(r => { const [b, c] = r.split('.'); const last = out[out.length - 1]; if (last && last.b === b && last.c2 === +c - 1) last.c2 = +c; else out.push({ b, c1: +c, c2: +c }); }); return out.map(g => { const bk = bookOf(g.b); return (bk ? bk[1] : g.b) + ' ' + g.c1 + (g.c2 !== g.c1 ? '–' + g.c2 : ''); }).join(', '); };
A.fePlan = b => { const c = cfg(); c.plan = b.dataset.k; c.planStart = today(); OS.touch('faith'); UI.toast('Plano iniciado: ' + PLANS[b.dataset.k][0], 'pos'); };
A.fePlanStop = () => UI.ask('Parar o plano de leitura?', 'O que já leste continua registado.', 'Parar', () => { cfg().plan = ''; OS.touch('faith'); });
A.feRead = b => { const r = b.dataset.r; const ex = OS.all('bread').find(x => x.ref === r); if (ex) OS.del('bread', ex.id); else { OS.add('bread', { ref: r, date: today() }); devoSet('read', 1); UI.toast(refLabel(r) + ' lido ✓', 'pos'); } };
A.feGo = b => { OS.setUI('bRef', b.dataset.r); OS.setUI('bSel', []); location.hash = 'fe.biblia'; };

/* ---------- ecrã principal ---------- */
const TABS = [['', 'Hoje com Deus'], ['biblia', 'Bíblia'], ['devocional', 'Meu devocional'], ['oracoes', 'Orações'], ['planos', 'Planos de leitura']];
V.fe = sub => { bible(); const h = new Date().getHours(), nm = (OS.one('profile').short || 'Ryan');
  return UI.head(`${h < 12 ? 'Bom dia' : h < 19 ? 'Boa tarde' : 'Boa noite'}, ${esc(nm)}`, 'Um tempo dedicado a Deus: a Palavra, a oração e o que Ele te diz hoje.', '', 'Fé & Devoção') + UI.tabs('fe', TABS, sub || '') + `<div class="fe">${(T[sub || ''] || T[''])()}</div>`; };
const T = {};
const verseCard = (R, title, extra = '') => { const vs = verses(R); return `<div class="fe-v"><div class="eyebrow">${title}</div><blockquote>${vs.map(([n, t]) => `<sup>${n}</sup>${esc(t)}`).join(' ') || '…'}</blockquote><div class="fe-vr"><b>${esc(label(R))}</b><span class="mut">${esc(VERS[ver()])}</span></div>
  <div class="row gap6" style="flex-wrap:wrap;margin-top:10px"><button class="btn xs" data-act="feGo" data-r="${R.b}.${R.c}">Ler o capítulo</button><button class="btn xs ghost" data-act="feCopy" data-ref="${R.b} ${R.c}:${R.v1 || 1}${R.v2 && R.v2 !== R.v1 ? '-' + R.v2 : ''}">Copiar</button><button class="btn xs ghost" data-act="feUse" data-ref="${R.b} ${R.c}:${R.v1 || 1}${R.v2 && R.v2 !== R.v1 ? '-' + R.v2 : ''}">Usar no devocional</button>${extra}</div></div>`; };
A.feCopy = async b => { const R = parseRef(b.dataset.ref); const t = `"${textOf(R)}" — ${label(R)} (${VERS[ver()]})`; try { await navigator.clipboard.writeText(t); UI.toast('Copiado', 'pos'); } catch (e) { UI.toast(t, ''); } };
A.feUse = b => { const R = parseRef(b.dataset.ref); devoSet('ref', label(R)); devoSet('key', textOf(R) + ' (' + label(R) + ')'); UI.toast('No devocional de hoje', 'pos'); location.hash = 'fe.devocional'; };
/* explicação do versículo do dia (IA, uma vez por dia, ligada ao teu dia) */
let VXB = false;
const vodExplain = (force) => { const R = FB.vod(), key = R.b + ' ' + R.c + ':' + R.v1, c = cfg(); if (VXB || !(OS.AI && OS.AI.key())) return; if (!force && c.vodx && c.vodx.date === today() && c.vodx.ref === key) return; VXB = true;
  OS.AI.json([{ text: `Explica o versículo do dia ao Ryan (cristão, estudante, vive em Aveiro) de forma fiel à Bíblia, simples e calorosa, em português de Portugal. Versículo: ${label(R)} — "${textOf(R)}". Contexto do capítulo: "${verses({ b: R.b, c: R.c }).map(x => x[1]).join(' ').slice(0, 2500)}". O dia dele: ${JSON.stringify(dayContext())}.
Responde APENAS JSON: {"contexto":"quem escreveu, para quem e em que situação (1–2 frases)","significado":"o que o versículo quer dizer (2–3 frases)","hoje":"como viver isto hoje, ligado ao dia dele quando fizer sentido (1–2 frases)"}` }], .3)
    .then(o => { c.vodx = { date: today(), ref: key, contexto: String(o.contexto || '').slice(0, 400), significado: String(o.significado || '').slice(0, 700), hoje: String(o.hoje || '').slice(0, 400) }; OS.touch('faith'); })
    .catch(() => { }).finally(() => { VXB = false; OS.request(); }); };
A.feVodX = () => vodExplain(true);
const vodBox = () => { const R = FB.vod(), key = R.b + ' ' + R.c + ':' + R.v1, x = cfg().vodx && cfg().vodx.date === today() && cfg().vodx.ref === key ? cfg().vodx : null; if (!x) { vodExplain(); return VXB ? '<div class="sai-busy" style="margin-top:10px"><div class="fd-spin"></div><span>A preparar a explicação…</span></div>' : (OS.AI && OS.AI.key() ? '' : '<p class="mut" style="font-size:12px;margin:10px 0 0">Com a IA ligada, aparece aqui a explicação do versículo e como o viver hoje.</p>'); }
  return `<div class="fe-vx">${x.contexto ? `<p class="mut">${esc(x.contexto)}</p>` : ''}<p><b>O que significa:</b> ${esc(x.significado)}</p>${x.hoje ? `<p><b>Para hoje:</b> ${esc(x.hoje)}</p>` : ''}</div>`; };
T[''] = () => { if (!bible()) return `<div class="pn"><div class="sai-busy"><div class="fd-spin"></div><span>A abrir a Bíblia…</span></div></div>`;
  const d = todayDevo() || {}, W = cfg().word && cfg().word.date === today() ? cfg().word : null, P = planToday(), st = streak(), open = OS.all('prayers').filter(p => p.status !== 'Respondida'), ans = OS.all('prayers').filter(p => p.status === 'Respondida');
  const WR = W && parseRef(W.ref), hasAI = OS.AI && OS.AI.key(), danger = crisis(d.note) || (W && W.alerta);
  return `${danger ? HELP : ''}<div class="g g-main"><div>${verseCard(FB.vod(), 'Versículo do dia').replace(/<\/div>$/, vodBox() + '</div>')}</div>
    <div class="pn fe-day"><div class="pn-h"><h3>Como estás hoje?</h3><span class="mut" style="font-size:12px">só tu vês isto</span></div><div class="fe-moods">${MOODS.map(m => `<button class="chip ${(d.moods || []).includes(m) ? 'on' : ''}" data-act="feMood" data-m="${esc(m)}">${esc(m)}</button>`).join('')}</div>
      <textarea class="field" data-dv="note" data-fk="feNote" rows="2" style="width:100%;margin-top:8px" placeholder="O que te pesa ou alegra hoje? (opcional)">${esc(d.note || '')}</textarea>
      <button class="btn pri" data-act="feWord" style="margin-top:8px" ${WB ? 'disabled' : ''}>${WB ? 'A ouvir o teu dia…' : W ? 'Receber outra palavra' : 'Receber a palavra de hoje'}</button>${WERR ? `<p class="neg">${esc(WERR)}</p>` : ''}
      ${!hasAI ? '<p class="mut" style="font-size:12px;margin:6px 0 0">Sem a IA ligada, a palavra é escolhida pelo teu estado de alma. Com a IA (a mesma chave Gemini), ela olha também para o teu dia: agenda, tarefas, avaliações, treino e finanças.</p>' : ''}</div></div>
  ${W ? `<div class="pn fe-word"><div class="eyebrow">Uma palavra para ti hoje</div><div class="fe-phrase">“${esc(W.frase)}”</div>${WR ? `<blockquote>${verses(WR).map(([n, t]) => `<sup>${n}</sup>${esc(t)}`).join(' ')}<footer>${esc(label(WR))}</footer></blockquote>` : ''}
    ${W.porque ? `<p class="mut">${esc(W.porque)}</p>` : ''}${W.reflexao ? `<p>${esc(W.reflexao)}</p>` : ''}${W.passo ? `<div class="fe-step"><b>Passo de fé para hoje:</b> ${esc(W.passo)}</div>` : ''}${W.oracao ? `<div class="fe-pray"><b>Oração</b><p>${esc(W.oracao)}</p></div>` : ''}
    <div class="row gap6" style="flex-wrap:wrap">${WR ? `<button class="btn xs" data-act="feGo" data-r="${WR.b}.${WR.c}">Ler o capítulo</button><button class="btn xs ghost" data-act="feUse" data-ref="${esc(W.ref)}">Usar no devocional</button>` : ''}</div></div>` : ''}
  <div class="g g3"><div class="pn"><div class="pn-h"><h3>${UI.ic('book')}Leitura de hoje</h3><a class="acc" href="#fe.planos" style="font-size:12px">planos →</a></div>${P ? `<p style="margin:0 0 6px"><b>${esc(groupRefs(P.day))}</b></p><div class="fe-chs">${P.day.map(r => `<button class="chip ${readSet().has(r) ? 'on' : ''}" data-act="feGo" data-r="${r}">${esc(refLabel(r))}${readSet().has(r) ? ' ✓' : ''}</button>`).join('')}</div>${UI.bar(P.done / P.total, 'pos')}<small class="mut">${esc(PLANS[P.k][0])} · dia ${P.di + 1} de ${P.all.length} · ${U.pct(P.done / P.total)}${P.behind ? ` · <span class="warn">${P.behind} capítulo(s) em atraso</span>` : ''}</small>` : `<p class="mut">Escolhe um plano ou abre a Bíblia e lê o que Deus puser no teu coração.</p><a class="btn sm" href="#fe.planos">Escolher plano</a>`}</div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('flame')}Tempo com Deus</h3></div><div class="fe-streak"><b>${st.s}</b><small>${st.s === 1 ? 'dia seguido' : 'dias seguidos'}</small></div>${grid(st.days)}<button class="btn sm" data-act="fePrayStart" style="margin-top:8px">Oração guiada (10 min)</button></div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('heart')}Orações</h3><a class="acc" href="#fe.oracoes" style="font-size:12px">ver todas →</a></div><div class="co-own"><div><b>${open.length}</b><small>a orar</small></div><div><b class="pos">${ans.length}</b><small>respondidas</small></div></div>${open.slice(0, 3).map(p => `<div class="li click" data-edit="prayers:${p.id}"><div class="li-t"><b>${esc(p.title)}</b><small>${esc(p.who || '')} · desde ${U.fmtD(p.date)}</small></div></div>`).join('')}${UI.addBtn('prayers', 'Pedido de oração', null, 'sm')}</div></div>
  <div class="pn"><div class="pn-h"><h3>Gratidão de hoje</h3><span class="mut" style="font-size:12px">3 coisas pelas quais agradeces a Deus</span></div><div class="fe-grat">${[1, 2, 3].map(i => `<input class="field" data-dv="g${i}" data-fk="feg${i}" value="${esc(d['g' + i] || '')}" placeholder="${['Hoje agradeço por…', 'E também por…', 'E por…'][i - 1]}">`).join('')}</div></div>`; };
const grid = days => { const end = today(), cells = []; for (let i = 83; i >= 0; i--) { const d = U.addDays(end, -i); cells.push(`<i class="${days.has(d) ? 'on' : ''}" title="${U.fmtD(d)}"></i>`); } return `<div class="fe-grid">${cells.join('')}</div>`; };

/* ---------- Bíblia (leitor) ---------- */
let SQ = '', SRES = null, ND = null, SELR = null;
const FS0 = 18, FSMIN = 12, FSMAX = 40, clampFs = v => Math.round(Math.max(FSMIN, Math.min(FSMAX, +v || FS0)));
const fsz = () => clampFs(U.ls.get('oc_fefs', 0) || cfg().fs || FS0);
const pctOf = f => Math.round(f / FS0 * 100) + '%';
const setFs = v => { const f = clampFs(v); U.ls.set('oc_fefs', f); if (cfg().fs !== f) { cfg().fs = f; OS.touch('faith'); } else OS.request(); };
const hlCol = () => OS.ui.bCol || U.ls.get('oc_fecol', 'y');
const COLS = { y: 'Amarelo', g: 'Verde', b: 'Azul', p: 'Rosa' };
const chMarks = (bid, c) => { const W = {}, P = {}; OS.all('bmarks').filter(m => m.ref.startsWith(bid + '.' + c + '.')).forEach(m => { const v = +m.ref.split('.')[2]; if (m.w) (P[v] = P[v] || []).push(m); else W[v] = m; }); return { W, P }; };
const wholeMark = r => OS.all('bmarks').find(m => m.ref === r && !m.w);
const vsHtml = (t, parts) => { if (!parts || !parts.length) return esc(t); const L = t.length, k = new Set([0, L]); parts.forEach(p => { k.add(Math.max(0, Math.min(L, p.w[0]))); k.add(Math.max(0, Math.min(L, p.w[1]))); });
  const pts = [...k].sort((a, b) => a - b); let o = ''; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (a >= b) continue; const p = parts.filter(x => x.w[0] <= a && x.w[1] >= b).pop(); o += p ? `<mark class="hl-${p.color || 'y'}">${esc(t.slice(a, b))}</mark>` : esc(t.slice(a, b)); } return o; };
T.biblia = () => { const B = bible(); if (!B) return `<div class="pn"><div class="sai-busy"><div class="fd-spin"></div><span>A abrir a Bíblia…</span></div></div>`;
  const ref = OS.ui.bRef || 'GEN.1', [bid, cs] = ref.split('.'), bk = B.b[B.idx[bid]] || B.b[0], c = Math.min(+cs || 1, bk[3].length), sel = OS.ui.bSel || [], fs = fsz(), rs = readSet(), r = bk[0] + '.' + c, mode = !!OS.ui.bMode, col = hlCol(), en = OS.ui.bNote;
  const { W, P } = chMarks(bk[0], c);
  const bi = B.idx[bk[0]], prev = c > 1 ? bk[0] + '.' + (c - 1) : bi > 0 ? B.b[bi - 1][0] + '.' + B.b[bi - 1][3].length : null, next = c < bk[3].length ? bk[0] + '.' + (c + 1) : bi < B.b.length - 1 ? B.b[bi + 1][0] + '.1' : null;
  const noteBox = v => { const rv = r + '.' + v, m = W[v], t = ND && ND.r === rv ? ND.t : (m && m.note) || '';
    if (en === v) return `<span class="fe-ned"><textarea class="field" id="feNoteIn" data-r="${rv}" rows="3" placeholder="Escreve aqui a tua nota sobre o versículo ${v}…">${esc(t)}</textarea><span class="row gap8"><small class="mut grow">Guarda sozinho</small>${m && m.note ? `<button class="btn xs ghost" data-act="feNoteDel" data-r="${rv}">Apagar nota</button>` : ''}<button class="btn xs pri" data-act="feNoteDone">Concluir</button></span></span>`;
    return m && m.note ? `<span class="fe-ni" data-act="feNoteEdit" data-v="${v}" title="Editar nota">✎ ${esc(m.note)}</span>` : ''; };
  return `<div class="pn fe-bar"><div class="row gap8" style="flex-wrap:wrap;align-items:center"><button class="btn sm" data-act="fePick">${esc(bk[1])} ${c} ${UI.ic('down')}</button>
      <div class="seg" role="group">${Object.entries(VERS).map(([k, l]) => `<button class="${ver() === k ? 'on' : ''}" data-act="feVer" data-v="${k}">${k === 'livre' ? 'Livre' : 'Almeida 1911'}</button>`).join('')}</div>
      <form class="row gap6 grow" data-form="feSearch" style="min-width:200px"><input class="field grow" name="q" value="${esc(SQ)}" placeholder="Pesquisar ou ir para (ex.: Romanos 8, amor, ansiosos)" aria-label="Pesquisar na Bíblia"><button class="btn sm">Ir</button></form></div>
    ${OS.ui.bPick ? picker(B, bk[0]) : ''}${SRES ? searchRes() : ''}</div>
  <div class="fe-rbar" role="toolbar" aria-label="Leitura">
    <div class="fe-rb-nav">${prev ? `<button class="icon-btn" data-act="feGo" data-r="${prev}" aria-label="Capítulo anterior">‹</button>` : ''}<button class="btn xs ghost" data-act="fePick">${esc(bk[2] || bk[1])} ${c}</button>${next ? `<button class="icon-btn" data-act="feGo" data-r="${next}" aria-label="Capítulo seguinte">›</button>` : ''}</div>
    <div class="seg fe-zoom" role="group" aria-label="Tamanho da letra"><button data-act="feFs" data-d="-1" aria-label="Letra mais pequena" ${fs <= FSMIN ? 'disabled' : ''}>A−</button><button class="fe-pct" data-act="feFs0" title="Repor tamanho normal">${pctOf(fs)}</button><button data-act="feFs" data-d="1" aria-label="Letra maior" ${fs >= FSMAX ? 'disabled' : ''}>A+</button></div>
    <button class="btn xs ${mode ? 'pri' : 'ghost'}" data-act="feMode" aria-pressed="${mode}">✎ Grifar${mode ? ' (ligado)' : ''}</button>
    ${mode ? `<span class="fe-cols">${Object.keys(COLS).map(k => `<button class="fe-dot hl-${k} ${col === k ? 'on' : ''}" data-act="feCol" data-c="${k}" aria-label="${COLS[k]}"></button>`).join('')}</span>` : ''}
    <button class="btn xs pri" id="feSelHl" data-act="feHlSel" ${SELR ? '' : 'hidden'}>Grifar seleção</button></div>
  ${mode ? `<p class="fe-hint mut">Toca num versículo para o grifar com a cor escolhida (toca de novo para tirar), ou seleciona só algumas palavras e carrega em <b>Grifar seleção</b>.</p>` : ''}
  <div class="pn fe-read ${mode ? 'mode-hl' : ''}" style="--fs:${fs}px"><div class="fe-txt"><h2>${esc(bk[1])} ${c}</h2>${bk[3][c - 1].map((t, i) => { const v = i + 1, m = W[v]; return `<span class="fe-vs ${sel.includes(v) ? 'sel' : ''} ${m && m.color ? 'hl-' + m.color : ''}" data-act="feSel" data-v="${v}"><sup>${v}</sup><span class="fe-t" data-v="${v}">${vsHtml(t, P[v])}</span></span>${noteBox(v)} `; }).join('')}</div>
    <div class="row between gap8" style="margin-top:18px;flex-wrap:wrap">${prev ? `<button class="btn sm ghost" data-act="feGo" data-r="${prev}">← ${esc(refLabel(prev))}</button>` : '<span></span>'}<button class="btn sm ${rs.has(r) ? 'pri' : ''}" data-act="feRead" data-r="${r}">${rs.has(r) ? '✓ Lido' : 'Marcar como lido'}</button>${next ? `<button class="btn sm ghost" data-act="feGo" data-r="${next}">${esc(refLabel(next))} →</button>` : '<span></span>'}</div>
    <p class="mut" style="font-size:11.5px;margin:14px 0 0">${esc(B.a)} · Dica: aproxima ou afasta dois dedos sobre o texto para mudar o tamanho da letra.</p></div>
  ${sel.length ? `<div class="fe-tool"><b>${esc(bk[1])} ${c}:${sel.length > 1 ? Math.min(...sel) + '-' + Math.max(...sel) : sel[0]}</b>${Object.keys(COLS).map(k => `<button class="fe-dot hl-${k}" data-act="feHl" data-c="${k}" aria-label="Destacar a ${COLS[k]}"></button>`).join('')}<button class="btn xs ghost" data-act="feHl" data-c="">Tirar</button><button class="btn xs ghost" data-act="feNoteV">Nota</button><button class="btn xs ghost" data-act="feCopy" data-ref="${bk[0]} ${c}:${Math.min(...sel)}${sel.length > 1 ? '-' + Math.max(...sel) : ''}">Copiar</button><button class="btn xs" data-act="feUse" data-ref="${bk[0]} ${c}:${Math.min(...sel)}${sel.length > 1 ? '-' + Math.max(...sel) : ''}">Devocional</button><button class="icon-btn" data-act="feSelClear" aria-label="Fechar">${UI.ic('x')}</button></div>` : ''}
  ${(() => { const all = OS.all('bmarks'), M = U.sortBy(all, m => (m.date || '') + (m._u || 0), -1).slice(0, 30); return M.length ? UI.toggle(`Os meus destaques e notas (${all.length})`, `<div class="list">${M.map(m => { const [b2, c2, v2] = m.ref.split('.'), R = { b: b2, c: +c2, v1: +v2, v2: +v2 }, tx = textOf(R), q = m.w ? '“' + tx.slice(m.w[0], m.w[1]).trim() + '”' : tx.slice(0, 140); return `<div class="li click" data-act="feGo" data-r="${b2}.${c2}"><div class="li-t"><b>${m.color ? `<span class="fe-dot hl-${m.color}"></span> ` : '✎ '}${esc(label(R))}</b><small>${esc(q)}${m.note ? ' — ✎ ' + esc(m.note) : ''}</small></div></div>`; }).join('')}</div>`, 'feMarks', 'star') : ''; })()}`; };
const picker = (B, cur) => { const sb = OS.ui.bBook || cur, b = B.b[B.idx[sb]];
  return `<div class="fe-pick"><div><div class="eyebrow">Antigo Testamento</div><div class="fe-books">${B.b.slice(0, NT0).map(x => `<button class="${x[0] === sb ? 'on' : ''}" data-act="feBook" data-b="${x[0]}" title="${esc(x[1])}">${esc(x[2] || x[1].slice(0, 3))}</button>`).join('')}</div>
    <div class="eyebrow" style="margin-top:8px">Novo Testamento</div><div class="fe-books">${B.b.slice(NT0).map(x => `<button class="${x[0] === sb ? 'on' : ''}" data-act="feBook" data-b="${x[0]}" title="${esc(x[1])}">${esc(x[2] || x[1].slice(0, 3))}</button>`).join('')}</div></div>
    <div><div class="eyebrow">${esc(b[1])} · capítulos</div><div class="fe-books">${b[3].map((_, i) => `<button class="${readSet().has(b[0] + '.' + (i + 1)) ? 'rd' : ''}" data-act="feGo" data-r="${b[0]}.${i + 1}">${i + 1}</button>`).join('')}</div></div></div>`; };
const searchRes = () => `<div class="fe-sr"><div class="row between"><b>${SRES.length >= 150 ? '150+' : SRES.length} resultado(s) para “${esc(SQ)}”</b><button class="icon-btn" data-act="feSClear" aria-label="Fechar">${UI.ic('x')}</button></div>${SRES.slice(0, 150).map(x => `<div class="li click" data-act="feGo" data-r="${x.b}.${x.c}"><div class="li-t"><b>${esc(x.l)}</b><small>${esc(x.t)}</small></div></div>`).join('')}</div>`;
A.fePick = () => { const o = !OS.ui.bPick; OS.setUI('bPick', o); OS.setUI('bBook', ''); if (o) window.scrollTo({ top: 0, behavior: 'smooth' }); };
A.feBook = b => OS.setUI('bBook', b.dataset.b);
A.feVer = b => { cfg().ver = b.dataset.v; OS.touch('faith'); loadBible(b.dataset.v).catch(() => UI.toast('Não consegui abrir esta versão agora', 'neg')); };
A.feFs = b => setFs(fsz() + +b.dataset.d * 2);
A.feFs0 = () => setFs(FS0);
A.feMode = () => { OS.setUI('bMode', !OS.ui.bMode); OS.setUI('bSel', []); };
A.feCol = b => { OS.setUI('bCol', b.dataset.c); U.ls.set('oc_fecol', b.dataset.c); };
const hasSel = () => { const s = window.getSelection && getSelection(); return !!(s && !s.isCollapsed && String(s).trim()); };
const setWhole = (r, color) => { const ex = wholeMark(r); if (ex) { if (!color && !ex.note) OS.del('bmarks', ex.id, { silent: true }); else OS.upd('bmarks', ex.id, { color }, { silent: true }); } else if (color) OS.add('bmarks', { ref: r, color, date: today() }, { silent: true }); };
const clearParts = r => OS.all('bmarks').filter(m => m.ref === r && m.w).forEach(m => OS.del('bmarks', m.id, { silent: true }));
A.feSel = b => { if (hasSel()) return; const v = +b.dataset.v, ref = OS.ui.bRef || 'GEN.1';
  if (OS.ui.bMode) { const r = ref + '.' + v, ex = wholeMark(r), parts = OS.all('bmarks').some(m => m.ref === r && m.w), c = hlCol(); if ((ex && ex.color === c) || (!ex && parts)) { setWhole(r, ''); clearParts(r); } else { clearParts(r); setWhole(r, c); } OS.request(); return; }
  const cur = OS.ui.bSel || []; OS.setUI('bSel', cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v].sort((x, y) => x - y)); };
A.feSelClear = () => OS.setUI('bSel', []);
A.feSClear = () => { SRES = null; SQ = ''; OS.request(); };
const _go = A.feGo; A.feGo = b => { OS.ui.bPick = false; OS.ui.bNote = null; ND = null; SRES = null; _go(b); };
A.feHl = b => { const ref = OS.ui.bRef || 'GEN.1', sel = OS.ui.bSel || []; sel.forEach(v => { const r = ref + '.' + v; if (!b.dataset.c) clearParts(r); setWhole(r, b.dataset.c); }); OS.setUI('bSel', []); OS.request(); };
/* notas dentro do texto */
const saveNote = (r, t) => { t = String(t || '').trim(); const ex = wholeMark(r); if (ex) { if (!t && !ex.color) OS.del('bmarks', ex.id); else if ((ex.note || '') !== t) OS.upd('bmarks', ex.id, { note: t }); } else if (t) OS.add('bmarks', { ref: r, color: '', note: t, date: today() }); };
A.feNoteV = () => { const sel = OS.ui.bSel || []; ND = null; OS.ui.bSel = []; OS.setUI('bNote', sel[0] || null); setTimeout(() => { const t = document.getElementById('feNoteIn'); if (t) { t.focus(); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 60); };
A.feNoteEdit = b => { if (hasSel()) return; OS.ui.bSel = []; ND = null; OS.setUI('bNote', +b.dataset.v); setTimeout(() => { const t = document.getElementById('feNoteIn'); if (t) t.focus(); }, 60); };
A.feNoteDone = () => { if (ND) saveNote(ND.r, ND.t); ND = null; OS.setUI('bNote', null); };
A.feNoteDel = b => { const ex = wholeMark(b.dataset.r); if (ex) { if (ex.color) OS.upd('bmarks', ex.id, { note: '' }); else OS.del('bmarks', ex.id); } ND = null; OS.setUI('bNote', null); };
document.addEventListener('input', e => { if (e.target.id === 'feNoteIn') ND = { r: e.target.dataset.r, t: e.target.value }; });
document.addEventListener('change', e => { if (e.target.id === 'feNoteIn') { ND = { r: e.target.dataset.r, t: e.target.value }; saveNote(ND.r, ND.t); } });
/* grifar só algumas palavras (seleção de texto) */
const selRanges = () => { const s = window.getSelection && getSelection(); if (!s || s.isCollapsed || !s.rangeCount) return null; const rg = s.getRangeAt(0), rd = document.querySelector('#view .fe-read'); if (!rd || !rd.contains(rg.commonAncestorContainer)) return null; const out = [];
  rd.querySelectorAll('.fe-t').forEach(el => { if (!rg.intersectsNode(el)) return; const t = el.textContent, L = t.length, off = (n, o) => { const x = document.createRange(); x.selectNodeContents(el); x.setEnd(n, o); return x.toString().length; };
    let a = el.contains(rg.startContainer) ? off(rg.startContainer, rg.startOffset) : 0, z = el.contains(rg.endContainer) ? off(rg.endContainer, rg.endOffset) : L;
    while (a > 0 && /\S/.test(t[a - 1])) a--; while (z < L && /\S/.test(t[z])) z++; while (a < z && /\s/.test(t[a])) a++; while (z > a && /\s/.test(t[z - 1])) z--;
    if (z > a) out.push({ v: +el.dataset.v, s: a, e: z, L }); }); return out.length ? out : null; };
const applySel = R => { const ref = OS.ui.bRef || 'GEN.1', c = hlCol(); R.forEach(x => { const r = ref + '.' + x.v; if (x.s === 0 && x.e === x.L) { clearParts(r); setWhole(r, c); } else OS.add('bmarks', { ref: r, color: c, w: [x.s, x.e], date: today() }, { silent: true }); }); SELR = null; try { getSelection().removeAllRanges(); } catch (e) { } OS.request(); UI.toast('Grifado ✓'); };
A.feHlSel = () => { const R = selRanges() || SELR; if (R) applySel(R); else UI.toast('Seleciona primeiro as palavras no texto'); };
let selT = 0; document.addEventListener('selectionchange', () => { clearTimeout(selT); selT = setTimeout(() => { if (!document.querySelector('#view .fe-read')) return; const R = selRanges(); if (R) SELR = R; else if (!hasSel()) SELR = null; const bt = document.getElementById('feSelHl'); if (bt) bt.hidden = !SELR; }, 120); });
document.addEventListener('mouseup', e => { if (!OS.ui.bMode || !e.target.closest || !e.target.closest('#view .fe-read')) return; setTimeout(() => { const R = selRanges(); if (R) applySel(R); }, 20); });
/* zoom com dois dedos (e Ctrl + roda / pinça do trackpad) só no texto */
let PZ = null, wT = 0, wF = 0;
const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1;
const live = (rd, f) => { rd.style.setProperty('--fs', f + 'px'); const p = document.querySelector('#view .fe-pct'); if (p) p.textContent = pctOf(f); };
document.addEventListener('touchstart', e => { if (e.touches.length !== 2) return; const rd = e.target.closest && e.target.closest('#view .fe-read'); if (rd) PZ = { d: dist(e.touches), f: fsz(), rd, cur: 0 }; }, { passive: true });
document.addEventListener('touchmove', e => { if (!PZ || e.touches.length !== 2) return; e.preventDefault(); PZ.cur = clampFs(PZ.f * dist(e.touches) / PZ.d); live(PZ.rd, PZ.cur); }, { passive: false });
const pzEnd = e => { if (!PZ || e.touches.length >= 2) return; const f = PZ.cur; PZ = null; if (f) setFs(f); };
document.addEventListener('touchend', pzEnd, { passive: true }); document.addEventListener('touchcancel', pzEnd, { passive: true });
document.addEventListener('gesturestart', e => { if (e.target.closest && e.target.closest('#view .fe-read')) e.preventDefault(); }, { passive: false });
document.addEventListener('wheel', e => { if (!e.ctrlKey) return; const rd = e.target.closest && e.target.closest('#view .fe-read'); if (!rd) return; e.preventDefault(); wF = clampFs((wF || fsz()) - e.deltaY * .08); live(rd, wF); clearTimeout(wT); wT = setTimeout(() => { setFs(wF); wF = 0; }, 250); }, { passive: false });
OS.forms = OS.forms || {};
OS.forms.feSearch = (f, val) => { const q = String(val('q') || '').trim(); if (!q) return; SQ = q; const R = FB.parseHuman(q); if (R) { SRES = null; OS.setUI('bRef', R.b + '.' + R.c); OS.setUI('bSel', R.v1 ? Array.from({ length: (R.v2 || R.v1) - R.v1 + 1 }, (_, i) => R.v1 + i) : []); OS.ui.bPick = false; return; }
  const B = bible(), nq = norm(q), out = []; for (const b of B.b) { b[3].forEach((ch, ci) => ch.forEach((t, vi) => { if (out.length < 150 && norm(t).includes(nq)) out.push({ b: b[0], c: ci + 1, l: b[1] + ' ' + (ci + 1) + ':' + (vi + 1), t }); })); if (out.length >= 150) break; } SRES = out; OS.request(); };

/* ---------- devocional ---------- */
let RB = false, RERR = '';
T.devocional = () => { const d = todayDevo() || {}, R = d.ref ? FB.parseHuman(d.ref) : null, hist = U.sortBy(OS.all('devos').filter(x => x.obs || x.app || x.prayer || x.key), x => x.date, -1);
  const fld = (k, l, ph, rows = 3) => `<label class="fe-f"><b>${l}</b><textarea class="field" data-dv="${k}" data-fk="fed${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(d[k] || '')}</textarea></label>`;
  return `<div class="g g-main"><div class="pn fe-devo"><div class="pn-h"><h3>Devocional de hoje · ${U.fmtD(today())}</h3><span class="mut" style="font-size:12px">guarda sozinho</span></div>
      <p class="mut" style="font-size:13px;margin:0 0 10px">Método <b>SOAP</b>: lê a <b>Escritura</b>, escreve a tua <b>Observação</b>, a <b>Aplicação</b> à tua vida e termina em <b>Oração</b>.</p>
      <label class="fe-f"><b>Escritura — o que vais ler hoje</b><div class="row gap8"><input class="field grow" data-dv="ref" data-fk="fedref" value="${esc(d.ref || '')}" placeholder="Ex.: Salmos 23, Romanos 8:28-39, João 15">${R ? `<button class="btn sm" data-act="feGo" data-r="${R.b}.${R.c}">Abrir</button>` : ''}</div></label>
      ${R ? `<blockquote class="fe-pass">${verses(R).slice(0, 40).map(([n, t]) => `<sup>${n}</sup>${esc(t)}`).join(' ')}${verses(R).length > 40 ? ' …' : ''}<footer>${esc(label(R))} · ${esc(VERS[ver()])}</footer></blockquote>` : d.ref ? '<p class="warn" style="font-size:12.5px">Não reconheci a passagem. Escreve como "Livro capítulo:versículos".</p>' : ''}
      ${fld('key', 'O versículo que mais me tocou', 'Copia ou escreve o versículo', 2)}${fld('obs', 'Observação — o que o texto diz?', 'O que aprendo sobre Deus, sobre mim, sobre a vida?')}${fld('app', 'Aplicação — o que Deus me pede hoje?', 'Uma atitude concreta para hoje…')}${fld('prayer', 'Oração', 'Fala com Deus sobre isto…', 4)}
      <div class="fe-grat">${[1, 2, 3].map(i => `<input class="field" data-dv="g${i}" data-fk="fedg${i}" value="${esc(d['g' + i] || '')}" placeholder="Gratidão ${i}">`).join('')}</div>
      <div class="row gap8" style="margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="feReflect" ${RB || !R ? 'disabled' : ''}>${UI.ic('zap')}${RB ? 'A refletir…' : 'Reflexão da IA sobre esta leitura'}</button></div>${RERR ? `<p class="neg">${esc(RERR)}</p>` : ''}
      ${d.refl && d.refl.ref === d.ref ? reflHTML(d.refl) : ''}</div>
    <div class="pn"><div class="pn-h"><h3>Os meus devocionais</h3><span class="mut" style="font-size:12px">${hist.length}</span></div>${hist.length ? `<div class="list">${hist.slice(0, 30).map(x => `<div class="li click" data-edit="devos:${x.id}"><span class="when">${U.fmtD(x.date)}</span><div class="li-t"><b>${esc(x.ref || 'Sem passagem')}</b><small>${esc((x.app || x.obs || x.prayer || x.key || '').slice(0, 120))}</small></div></div>`).join('')}</div>` : UI.empty('O teu primeiro devocional fica guardado aqui.')}</div></div>`; };
const reflHTML = r => `<div class="fe-refl"><div class="eyebrow">Reflexão</div>${r.contexto ? `<p class="mut">${esc(r.contexto)}</p>` : ''}<p>${esc(r.mensagem || '')}</p>${(r.licoes || []).length ? `<b>O que aprender</b><ul>${r.licoes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${(r.perguntas || []).length ? `<b>Perguntas para meditar</b><ul>${r.perguntas.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${r.oracao ? `<div class="fe-pray"><b>Oração</b><p>${esc(r.oracao)}</p></div>` : ''}${(r.ligacoes || []).length ? `<small class="mut">Para aprofundar: ${r.ligacoes.map(esc).join(' · ')}</small>` : ''}</div>`;
A.feReflect = async () => { const d = todayDevo() || {}, R = d.ref ? FB.parseHuman(d.ref) : null; if (!R || RB) return; if (!(OS.AI && OS.AI.key())) { UI.toast('Liga o Spyke (IA) em Definições → Spyke', 'warn'); return; }
  RB = true; RERR = ''; OS.request();
  try { const o = await OS.AI.json([{ text: `És um mestre da Palavra, fiel às Escrituras, que ajuda num devocional pessoal (o Ryan, cristão, estudante em Portugal). Passagem: ${label(R)} (${VERS[ver()]}): "${textOf(R).slice(0, 6000)}"
O que ele escreveu: observação: "${d.obs || ''}"; aplicação: "${d.app || ''}"; como está hoje: ${(d.moods || []).join(', ') || 'não disse'}.
Dá uma reflexão devocional sólida (contexto histórico e literário breve, mensagem central, aplicação prática), em português de Portugal, sem inventar e sem forçar o texto. Responde APENAS JSON: {"contexto":"1–2 frases de contexto","mensagem":"4–6 frases","licoes":["…"],"perguntas":["2–3 perguntas para meditar"],"oracao":"oração curta em 1.ª pessoa","ligacoes":["2–3 passagens relacionadas, ex.: Salmos 23"]}` }], .3);
    devoSet('refl', { ref: d.ref, contexto: String(o.contexto || '').slice(0, 500), mensagem: String(o.mensagem || '').slice(0, 1500), licoes: (o.licoes || []).slice(0, 4).map(String), perguntas: (o.perguntas || []).slice(0, 3).map(String), oracao: String(o.oracao || '').slice(0, 800), ligacoes: (o.ligacoes || []).slice(0, 3).map(String) }); }
  catch (e) { RERR = e.message || 'A IA não respondeu.'; }
  RB = false; OS.request(); };

/* ---------- orações ---------- */
T.oracoes = () => { const P = OS.all('prayers'), open = U.sortBy(P.filter(p => p.status !== 'Respondida'), p => p.date || '', -1), ans = U.sortBy(P.filter(p => p.status === 'Respondida'), p => p.answeredAt || '', -1);
  return `<div class="row gap8" style="margin-bottom:12px;flex-wrap:wrap">${UI.addBtn('prayers', 'Novo pedido de oração', null, 'pri')}<button class="btn" data-act="fePrayStart">Oração guiada (10 min)</button><button class="btn ghost" data-act="feLord">Pai Nosso</button></div>
  <div class="g g-main"><div class="pn"><div class="pn-h"><h3>A orar</h3><span class="mut" style="font-size:12px">${open.length}</span></div>${open.length ? `<div class="list">${open.map(p => `<div class="li"><div class="li-t click" data-edit="prayers:${p.id}"><b>${esc(p.title)}</b><small>${esc(p.who || '')} · há ${Math.max(0, U.diff(today(), p.date || today()))} dias${p.details ? ' · ' + esc(p.details.slice(0, 80)) : ''}</small></div><button class="btn xs" data-act="feAns" data-id="${p.id}">Deus respondeu</button></div>`).join('')}</div>` : UI.empty('Escreve os teus pedidos: por ti, pela família, pelos amigos, pelos estudos. Ver as respostas ao longo do tempo fortalece a fé.')}</div>
    <div class="pn"><div class="pn-h"><h3>Respondidas</h3><span class="mut" style="font-size:12px">${ans.length}</span></div>${ans.length ? `<div class="list">${ans.map(p => `<div class="li click" data-edit="prayers:${p.id}"><div class="li-t"><b>${esc(p.title)}</b><small>${p.answeredAt ? U.fmtD(p.answeredAt) + ' · ' : ''}${esc((p.answer || '').slice(0, 120))}</small></div></div>`).join('')}</div>` : '<p class="mut">As orações respondidas e os testemunhos ficam aqui, para te lembrares do que Deus já fez.</p>'}</div></div>`; };
A.feAns = b => UI.openForm('prayers', b.dataset.id, { status: 'Respondida', answeredAt: today() }, { title: 'Como Deus respondeu?' });
A.feLord = () => { const R = { b: 'MAT', c: 6, v1: 9, v2: 13 }; UI.modal(`<div style="padding:20px"><div class="row between"><h3 style="margin:0">Pai Nosso</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div><blockquote class="fe-pass" style="font-size:18px">${verses(R).map(([n, t]) => `<sup>${n}</sup>${esc(t)}`).join(' ')}<footer>${esc(label(R))}</footer></blockquote></div>`); };
/* oração guiada ACTS: Adoração, Confissão, Gratidão, Súplica */
const STEPS = [['Silêncio', 60, 'Respira devagar. Deixa o barulho do dia assentar. "Aquietai-vos e sabei que eu sou Deus."', 'PSA 46:10'], ['Adoração', 120, 'Louva a Deus por quem Ele é: fiel, bom, presente, Pai. Diz-Lhe o que admiras n\'Ele.', 'PSA 145:18'], ['Confissão', 120, 'Com sinceridade, entrega o que fizeste mal. Ele é fiel para perdoar.', '1JN 1:9'], ['Gratidão', 120, 'Agradece por coisas concretas de hoje e desta semana.', '1TH 5:16-18'], ['Súplica', 180, 'Apresenta os teus pedidos e intercede pelos outros (os teus pedidos de oração aparecem abaixo).', 'PHP 4:6-7']];
let PG = null;
A.fePrayStart = () => { PG = { i: 0, left: STEPS[0][1], on: true }; drawPG(); if (PG.t) clearInterval(PG.t); PG.t = setInterval(() => { if (!PG || !PG.on) return; PG.left--; if (PG.left <= 0) { if (PG.i < STEPS.length - 1) { PG.i++; PG.left = STEPS[PG.i][1]; try { navigator.vibrate && navigator.vibrate(120); } catch (e) { } } else { PG.on = false; clearInterval(PG.t); devoSet('prayed', 1); } } drawPG(); }, 1000); };
const drawPG = () => { if (!PG) return; if (PG.shown && !document.getElementById('fePG')) { clearInterval(PG.t); PG = null; return; } PG.shown = 1; const s = STEPS[PG.i], R = parseRef(s[3]), open = OS.all('prayers').filter(p => p.status !== 'Respondida');
  const html = `<div class="fe-pg" id="fePG"><div class="row between"><span class="eyebrow">Oração guiada · ${PG.i + 1}/${STEPS.length}</span><button class="icon-btn" data-act="fePrayStop" aria-label="Fechar">${UI.ic('x')}</button></div><h2>${PG.on ? esc(s[0]) : 'Amém'}</h2>
    ${PG.on ? `<div class="fe-pg-t">${Math.floor(PG.left / 60)}:${U.pad(PG.left % 60)}</div><p>${esc(s[2])}</p><blockquote>${esc(textOf(R))}<footer>${esc(label(R))}</footer></blockquote>${s[0] === 'Súplica' && open.length ? `<ul>${open.slice(0, 8).map(p => `<li>${esc(p.title)}</li>`).join('')}</ul>` : ''}
    <div class="row gap8" style="justify-content:center"><button class="btn ghost" data-act="fePrayNext">${PG.i < STEPS.length - 1 ? 'Seguinte →' : 'Terminar'}</button></div>` : '<p>Que a paz de Deus guarde o teu coração e a tua mente hoje.</p><button class="btn pri" data-act="fePrayStop">Fechar</button>'}</div>`;
  const el = document.getElementById('fePG'); if (el) el.outerHTML = html; else UI.modal(html, 'fe-pgm'); };
A.fePrayNext = () => { if (!PG) return; if (PG.i < STEPS.length - 1) { PG.i++; PG.left = STEPS[PG.i][1]; } else { PG.on = false; clearInterval(PG.t); devoSet('prayed', 1); } drawPG(); };
A.fePrayStop = () => { if (PG && PG.t) clearInterval(PG.t); PG = null; UI.closeModal(); OS.request(); };

/* ---------- planos ---------- */
T.planos = () => { if (!bible()) return `<div class="pn"><div class="sai-busy"><div class="fd-spin"></div><span>A abrir a Bíblia…</span></div></div>`; const P = planToday(), B = bible(), rs = readSet();
  const byBook = B.b.map(b => ({ b, n: b[3].length, r: b[3].filter((_, i) => rs.has(b[0] + '.' + (i + 1))).length })), tot = U.sum(byBook, x => x.n), rd = U.sum(byBook, x => x.r);
  return `${P ? `<div class="pn"><div class="pn-h"><h3>${esc(PLANS[P.k][0])}</h3><button class="btn xs ghost" data-act="fePlanStop">Parar plano</button></div><div class="kpis">${UI.kpi('Dia', (P.di + 1) + ' / ' + P.all.length)}${UI.kpi('Progresso', U.pct(P.done / P.total), P.done + ' de ' + P.total + ' capítulos')}${UI.kpi('Em atraso', P.behind ? P.behind + ' cap.' : 'em dia', '', { tone: P.behind ? 'warn' : 'pos' })}</div>
    <div class="fe-days">${P.all.map((d, i) => { const all = d.every(r => rs.has(r)); return `<button class="${all ? 'done' : ''} ${i === P.di ? 'cur' : ''}" data-act="feGo" data-r="${d.find(r => !rs.has(r)) || d[0]}" title="Dia ${i + 1}: ${esc(groupRefs(d))}">${i + 1}</button>`; }).join('')}</div></div>` : ''}
  <div class="pn"><div class="pn-h"><h3>Escolher um plano</h3></div><div class="fe-plans">${Object.entries(PLANS).map(([k, [nm, ds]]) => `<div class="fe-plan ${P && P.k === k ? 'on' : ''}"><b>${esc(nm)}</b><small class="mut">${esc(ds)}</small><button class="btn sm ${P && P.k === k ? '' : 'pri'}" data-act="fePlan" data-k="${k}">${P && P.k === k ? 'Recomeçar' : 'Começar hoje'}</button></div>`).join('')}</div></div>
  <div class="pn"><div class="pn-h"><h3>A Bíblia que já leste</h3><span class="mut" style="font-size:12px">${rd} de ${tot} capítulos · ${U.pct(rd / tot, 1)}</span></div>${UI.bar(rd / tot, 'pos')}
    <div class="fe-bk">${byBook.map(x => `<button data-act="feGo" data-r="${x.b[0]}.${(x.b[3].findIndex((_, i) => !rs.has(x.b[0] + '.' + (i + 1))) + 1) || 1}" title="${esc(x.b[1])}: ${x.r}/${x.n}"><span>${esc(x.b[2] || x.b[1])}</span><i style="width:${x.r / x.n * 100}%"></i></button>`).join('')}</div></div>`; };

/* ---------- versículo do dia na página Hoje ---------- */
OS.on('ready', () => { const h = V.hoje; if (h && !h._fe) { V.hoje = s => { const base = h(s); const B = bible(); if (!B) return base; const R = FB.vod(); const vs = textOf(R); const card = `<a class="pn fe-mini" href="#fe"><span class="eyebrow">Versículo do dia</span><span>“${esc(vs.length > 220 ? vs.slice(0, 217) + '…' : vs)}”</span><b>${esc(label(R))}</b></a>`; const i = base.indexOf('</header>'); return i > 0 ? base.slice(0, i + 9) + card + base.slice(i + 9) : card + base; }; V.hoje._fe = 1; } });
})();
