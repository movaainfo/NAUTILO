/* NÁUTILO — Oportunidades automáticas.
   Lê os teus e-mails e as notificações do LinkedIn que chegam ao Gmail (o mesmo script Google da página E-mail) e encontra oportunidades:
   vagas, estágios, bolsas, cursos, certificações, eventos, palestras, competições, programas e negócios. Não adiciona nada sozinho:
   aparecem como sugestões e tu decides — adicionar, recusar ou ver depois. As que adicionas entram no quadro como "Identificada"
   e daí decides com calma: avançar, descartar ou pensar no Centro de decisões. As decisões sincronizam; os e-mails ficam só no aparelho. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc;
OS.ONE_DEF.oppscan = { no: [], later: [], took: [] };
const D = () => { const s = OS.one('oppscan'); ['no', 'later', 'took'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; }); return s; };
const AIK = 'os2oppai'; let AI = U.ls.get(AIK, {}) || {}; const saveAI = () => { const keep = {}; Object.entries(AI).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 300).forEach(([k, v]) => { keep[k] = v; }); AI = keep; U.ls.set(AIK, AI); };

/* ---------- reconhecer uma oportunidade ---------- */
const KINDS = [
  ['Estágio', /est[áa]gio|internship|trainee|summer (job|internship)|programa de est/i],
  ['Emprego', /\bvagas?\b(?! limitadas| esgotadas)|job alert|alerta de (emprego|vagas)|emprego|we.?re hiring|est[áa] a contratar|contratando|recrutamento|recruit|\bposition\b|vacancy|candidat[ae]-te|apply now|oferta de (emprego|trabalho)|open role|new jobs?/i],
  ['Bolsa', /\bbolsas?\b|scholarship|\bgrant\b|financiamento para estudantes|funding/i],
  ['Certificação', /certifica[çc][ãa]o|certification|\bcertificate\b/i],
  ['Curso', /\bcursos?\b|\bcourse\b|forma[çc][ãa]o|bootcamp|mooc|masterclass|aulas abertas/i],
  ['Competição', /hackathon|competi[çc][ãa]o|concurso|case competition|\bchallenge\b|desafio de/i],
  ['Programa universitário', /erasmus|mobilidade internacional|voluntariado|mentoria|mentorship|summer school|escola de ver[ãa]o|embaixador|programa (de|para) (estudantes|jovens)/i],
  ['Palestra', /palestra|\btalk\b|semin[áa]rio|keynote|workshop/i],
  ['Evento', /\beventos?\b|\bevent\b|webinar|meetup|feira|career fair|job fair|open day|confer[êe]ncia|summit|jornadas/i],
  ['Negócio', /parceria|partnership|proposta comercial|investidor|freelance|projeto pago|pedido de or[çc]amento/i]];
const NOT = /fatura|invoice|recibo|receipt|password|palavra-passe|c[óo]digo de (verifica|seguran)|verification code|alerta de seguran|security alert|encomenda|\border\b|entrega|delivery|renova[çc][ãa]o|pagamento (recebido|efetuado)|extrato|unsubscribe confirm|reposi[çc][ãa]o de senha/i;
const LI_NOISE = /quer ligar-se|wants to connect|aceitou o seu convite|accepted your invitation|viu o seu perfil|viewed your profile|apareceu em|appeared in|reagiu|reacted|comentou|commented|felicita|congratulate|anivers|birthday|enviou-lhe uma mensagem|sent you a message/i;
const MES = { janeiro: 1, fevereiro: 2, 'março': 3, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
const iso = (y, m, d) => { const s = `${y}-${U.pad(m)}-${U.pad(d)}`; return /^\d{4}-\d\d-\d\d$/.test(s) && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? s : ''; };
// prazo: "até 30 de outubro", "prazo: 30/10/2026", "deadline 2026-10-30", "inscrições até 5/11"
const deadline = (txt, ref) => { const t = String(txt || '').toLowerCase(), y0 = +String(ref || U.today()).slice(0, 4), near = /(at[ée]|prazo|deadline|termina|fecha|limite|candidaturas|inscri[çc][õo]es|until|by)\D{0,24}/;
  const tries = [[new RegExp(near.source + '(\\d{4})-(\\d\\d)-(\\d\\d)'), m => iso(+m[2], +m[3], +m[4])], [new RegExp(near.source + '(\\d{1,2})[/.-](\\d{1,2})(?:[/.-](\\d{2,4}))?'), m => iso(m[4] ? (m[4].length === 2 ? 2000 + +m[4] : +m[4]) : y0, +m[3], +m[2])],
    [new RegExp(near.source + '(\\d{1,2}) de (' + Object.keys(MES).join('|') + ')(?: de (\\d{4}))?'), m => iso(m[4] ? +m[4] : y0, MES[m[3]], +m[2])]];
  for (const [re, f] of tries) { const m = t.match(re); if (m) { let d = f(m); if (d && d < String(ref || '').slice(0, 10)) d = iso(+d.slice(0, 4) + 1, +d.slice(5, 7), +d.slice(8, 10)); if (d) return d; } } return ''; };
const urlOf = t => { const m = String(t || '').match(/https?:\/\/[^\s<>")]+/g) || []; return m.find(u => !/unsubscribe|optout|opt-out|preferences|privacy|tracking|pixel/i.test(u)) || ''; };
const nameOf = f => { const m = String(f || '').match(/^\s*"?([^"<]+?)"?\s*</); return (m ? m[1] : String(f || '').replace(/<.*>/, '')).trim() || String(f || ''); };
const clean = s => String(s || '').replace(/^\s*((re|res|fw|fwd|enc)\s*:\s*)+/i, '').replace(/^\[[^\]]{1,30}\]\s*/, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim();
const gmail = it => 'https://mail.google.com/mail/u/' + (+it.src || 0) + '/#all/' + encodeURIComponent(String(it.id || ''));
const isLi = it => /linkedin/i.test(it.f || '');
// regras: devolve a sugestão ou null
const guess = (it, info) => { const txt = (it.s || '') + ' ' + (it.sn || '');
  if (!txt.trim() || NOT.test(txt) || (info && info.c === 'spam')) return null; if (isLi(it) && LI_NOISE.test(it.s || '')) return null;
  const hit = KINDS.filter(([, re]) => re.test(txt)); if (!hit.length) return null;
  // o tipo vem primeiro do assunto (o "workshop" do assunto ganha às "vagas limitadas" do texto)
  const subj = KINDS.find(([, re]) => re.test(it.s || '')), kind = (subj || hit[0])[0], dl = deadline(txt, it.d); if (info && info.c === 'promo' && !(dl && ['Curso', 'Bolsa', 'Evento', 'Certificação', 'Competição', 'Programa universitário'].includes(kind))) return null;
  return { id: it.id, name: clean(it.s).slice(0, 120) || kind, inst: isLi(it) ? '' : nameOf(it.f), kind, deadline: dl, why: (isLi(it) ? 'LinkedIn: ' : 'E-mail: ') + hit.slice(0, 2).map(h => h[0].toLowerCase()).join(', '), src: isLi(it) ? 'LinkedIn' : 'E-mail', date: String(it.d || '').slice(0, 10), link: urlOf(it.sn) || gmail(it), mail: gmail(it), score: hit.length + (dl ? 1 : 0) + (isLi(it) ? 1 : 0) }; };

/* ---------- juntar as fontes ---------- */
const sources = () => { const out = []; try { const Mm = OS.Mail; if (!Mm) return out; Mm.items().forEach(x => out.push([x, x])); const li = Mm.li() || {}; (li.items || []).forEach(x => out.push([x, null]));
    // vagas que a IA do LinkedIn já separou (título, empresa, local)
    ((li.sum || {}).vagas || []).forEach(v => { const it = (li.items || []).find(x => x.id === v.id); if (it) out.push([Object.assign({}, it, { s: [v.titulo, v.empresa].filter(Boolean).join(' · ') || it.s, _v: v }), null]); }); } catch (e) { } return out; };
const all = () => { const seen = new Set(), L = []; sources().forEach(([it, info]) => { if (!it || !it.id) return; const ai = AI[it.id];
    let g = ai ? (ai.ok ? Object.assign(guess(it, info) || { id: it.id, src: isLi(it) ? 'LinkedIn' : 'E-mail', date: String(it.d || '').slice(0, 10), link: gmail(it), mail: gmail(it), score: 2 }, { name: ai.t || clean(it.s), inst: ai.i || '', kind: ai.k || 'Emprego', deadline: ai.p || '', why: ai.w || '', ai: 1, score: 5 }) : null) : guess(it, info);
    if (g && it._v) { g.name = clean(it._v.titulo || g.name); g.inst = it._v.empresa || g.inst; g.loc = it._v.local || ''; g.kind = /est[áa]gio|intern/i.test(g.name) ? 'Estágio' : 'Emprego'; }
    if (!g) return; const k = (g.name + '|' + g.inst).toLowerCase(); if (seen.has(it.id) || seen.has(k)) { const o = L.find(x => x.id === it.id); if (o && it._v) Object.assign(o, g); return; } seen.add(it.id); seen.add(k); L.push(g); });
  return L.sort((a, b) => b.date.localeCompare(a.date) || b.score - a.score); };
const taken = () => { const ids = new Set(D().took); OS.all('opps').forEach(o => o.mailId && ids.add(o.mailId)); return ids; };
const pending = () => { const s = D(), no = new Set(s.no), later = new Set(s.later), tk = taken(), names = new Set(OS.all('opps').map(o => String(o.name || '').toLowerCase()));
  const L = all().filter(g => !no.has(g.id) && !tk.has(g.id) && !names.has(g.name.toLowerCase())); return { now: L.filter(g => !later.has(g.id)), later: L.filter(g => later.has(g.id)) }; };

/* ---------- IA (a tua chave Gemini): confirma e arruma as candidatas ---------- */
let busy = false, lastAI = 0;
const aiOn = () => OS.AI && OS.AI.key && OS.AI.key();
const aiScan = async (force) => { if (busy || !aiOn() || (!force && Date.now() - lastAI < 10 * 60e3)) return; const todo = sources().map(([it, info]) => [it, info]).filter(([it, info]) => it && it.id && !AI[it.id] && !(info && info.c === 'spam') && !NOT.test((it.s || '') + ' ' + (it.sn || ''))).slice(0, 25);
  if (!todo.length) return; busy = true; lastAI = Date.now(); const p = OS.one('profile');
  try { const o = await OS.AI.json([{ text: `${p.short || 'Ryan'} é estudante no ISCA-UA (Aveiro, Portugal), trabalha e quer crescer na carreira (finanças, contabilidade, gestão, empreender). Hoje é ${U.today()}.
Destes e-mails (Gmail e notificações do LinkedIn), diz quais trazem uma OPORTUNIDADE concreta para ele: vaga, estágio, bolsa, curso, certificação, evento, palestra, competição, programa universitário, mentoria ou negócio.
Não contes: publicidade genérica, faturas, segurança, convites para ligar, quem viu o perfil, reações e newsletters sem nada concreto.
Para cada e-mail: {"id","ok":true/false,"titulo":"nome curto da oportunidade","instituicao":"quem oferece","tipo":"Curso|Certificação|Evento|Palestra|Programa universitário|Estágio|Emprego|Projeto|Competição|Networking|Bolsa|Negócio","prazo":"AAAA-MM-DD ou null","porque":"porque lhe interessa, máx. 14 palavras"}
Não inventes nada que não esteja no e-mail. JSON: {"itens":[…]}
E-mails: ${JSON.stringify(todo.map(([x]) => ({ id: x.id, de: x.f, assunto: x.s, data: String(x.d || '').slice(0, 10), inicio: String(x.sn || '').slice(0, 360) })))}` }], .1);
    (o.itens || []).forEach(r => { if (!r || !r.id) return; AI[r.id] = r.ok ? { ok: 1, t: String(r.titulo || '').slice(0, 120), i: String(r.instituicao || '').slice(0, 80), k: S_KINDS.includes(r.tipo) ? r.tipo : 'Emprego', p: /^\d{4}-\d\d-\d\d$/.test(r.prazo || '') ? r.prazo : '', w: String(r.porque || '').slice(0, 120), at: Date.now() } : { ok: 0, at: Date.now() }; });
    todo.forEach(([it]) => { if (!AI[it.id]) AI[it.id] = { ok: 0, at: Date.now(), skip: 1 }; }); saveAI(); }
  catch (e) { if (OS.debug) console.warn('oportunidades IA', e); }
  busy = false; OS.request(); };
const S_KINDS = ['Curso', 'Certificação', 'Evento', 'Palestra', 'Programa universitário', 'Estágio', 'Emprego', 'Projeto', 'Competição', 'Networking', 'Bolsa', 'Negócio'];

/* ---------- decidir ---------- */
const find = id => all().find(g => g.id === id);
A.opsTake = b => { const g = find(b.dataset.id); if (!g) return; const s = D(); OS.add('opps', { name: g.name, inst: g.inst || '', kind: g.kind || 'Emprego', area: 'Carreira', deadline: g.deadline || '', status: 'Identificada', prio: g.deadline && U.diff(g.deadline, U.today()) <= 14 ? '2' : '3', next: 'Decidir se vale a pena', link: g.link || '', reqs: [g.why, g.loc ? 'Local: ' + g.loc : '', 'Origem: ' + g.src + ' · ' + g.mail].filter(Boolean).join('\n'), mailId: g.id, src: g.src });
  OS.setOne('oppscan', { took: s.took.concat(g.id).slice(-400), later: s.later.filter(x => x !== g.id) }); UI.toast('Adicionada às Oportunidades', 'pos'); };
A.opsNo = b => { const s = D(), id = b.dataset.id; OS.setOne('oppscan', { no: s.no.concat(id).slice(-600), later: s.later.filter(x => x !== id) }); UI.toast('Não aparece mais'); };
A.opsLater = b => { const s = D(), id = b.dataset.id; if (!s.later.includes(id)) OS.setOne('oppscan', { later: s.later.concat(id).slice(-200) }); UI.toast('Fica para ver depois'); };
A.opsScan = async () => { const Mm = OS.Mail; if (!Mm) return; UI.toast('A ler o e-mail e o LinkedIn…'); try { await Mm.refresh(true); await Mm.refreshLi(true); } catch (e) { } await aiScan(true); OS.request(); const n = pending().now.length; UI.toast(n ? `${n} oportunidade${n > 1 ? 's' : ''} para decidir` : 'Nada de novo por agora', n ? 'pos' : ''); };
// no quadro: avançar, descartar ou pensar no Centro de decisões
A.oppGo = b => { const o = OS.get('opps', b.dataset.id); if (!o) return; OS.upd('opps', o.id, { status: 'A preparar', next: o.next && o.next !== 'Decidir se vale a pena' ? o.next : 'Preparar a candidatura' }); UI.toast('Avançaste: está em "A preparar"', 'pos'); };
A.oppDrop = b => { const o = OS.get('opps', b.dataset.id); if (!o) return; OS.upd('opps', o.id, { status: 'Descartada' }); UI.toast('Descartada'); };
A.oppThink = b => { const o = OS.get('opps', b.dataset.id); if (!o) return; const ex = OS.all('decisions').find(d => d.opp === o.id); if (ex) { location.hash = 'decisoes'; setTimeout(() => OS.Decide && OS.Decide.open(ex.id), 300); return; }
  const d = OS.add('decisions', { title: `Avançar com: ${o.name}${o.inst ? ' (' + o.inst + ')' : ''}?`, status: 'Em análise', deadline: o.deadline ? U.addDays(o.deadline, -3) : '', context: [o.kind, o.inst, o.reqs, o.benefits, o.link].filter(Boolean).join('\n'), alts: [{ name: 'Avançar' }, { name: 'Não avançar' }], opp: o.id });
  location.hash = 'decisoes'; setTimeout(() => OS.Decide && d && OS.Decide.open(d.id), 300); };
OS.on('upd:decisions', d => { if (!d || !d.opp || d.status !== 'Decidida' || !d.chosen) return; const o = OS.get('opps', d.opp); if (!o || o.status !== 'Identificada') return; if (/^n[ãa]o/i.test(d.chosen)) OS.upd('opps', o.id, { status: 'Descartada' }); else if (/avan/i.test(d.chosen)) OS.upd('opps', o.id, { status: 'A preparar' }); });

/* ---------- página ---------- */
const card = g => `<div class="ops-c"><div class="ops-h"><span class="bdg ${g.src === 'LinkedIn' ? 'acc' : ''}">${esc(g.src)}</span><span class="eyebrow">${esc(g.kind || '')}</span>${g.deadline ? UI.badge('prazo ' + U.fmtDS(g.deadline), U.diff(g.deadline, U.today()) <= 7 ? 'neg' : 'warn') : ''}</div>
  <b>${esc(g.name)}</b>${g.inst || g.loc ? `<small class="mut">${esc([g.inst, g.loc].filter(Boolean).join(' · '))}</small>` : ''}${g.why ? `<small class="tx2">${esc(g.why)}</small>` : ''}
  <div class="ops-a"><button class="btn sm pri" data-act="opsTake" data-id="${esc(g.id)}">${UI.ic('plus')}Adicionar</button><button class="btn sm" data-act="opsLater" data-id="${esc(g.id)}">Depois</button><button class="btn sm ghost" data-act="opsNo" data-id="${esc(g.id)}">Não me interessa</button><a class="btn sm ghost" href="${esc(g.mail)}" target="_blank" rel="noopener">Ver e-mail</a></div></div>`;
const panel = () => { const ok = (() => { const c = OS.one('inbox'); return !!(c.url && c.key); })(), P = ok ? pending() : { now: [], later: [] }, li = OS.Mail && OS.Mail.li ? OS.Mail.li() : {}, at = Math.max((OS.Mail && OS.Mail.counts ? OS.Mail.counts().at : 0) || 0, (li && li.at) || 0);
  if (ok && P.now.length && aiOn()) setTimeout(() => aiScan(), 800);
  return `<section class="pn ops"><div class="pn-h"><h3>${UI.ic('mail')} Encontradas no teu e-mail e no LinkedIn</h3><button class="btn sm" data-act="opsScan" ${ok ? '' : 'disabled'}>${UI.ic('sync')}${busy ? 'A ler…' : 'Procurar agora'}</button></div>
    ${!ok ? `<p class="mut" style="margin:0">Liga o teu Gmail em <a class="acc" href="#definicoes.email">Definições → E-mail</a>. O LinkedIn entra pelas notificações que ele te manda para o Gmail (vagas, alertas de emprego, eventos). Depois disto as oportunidades aparecem aqui sozinhas e tu decides cada uma.</p>`
      : P.now.length ? `<p class="mut" style="margin:0 0 10px">${P.now.length} por decidir. Nada entra no teu quadro sem tu aceitares.${at ? ' Lido ' + U.rel(U.iso(new Date(at))) + '.' : ''}</p><div class="ops-l">${P.now.slice(0, 12).map(card).join('')}</div>${P.now.length > 12 ? `<p class="mut">E mais ${P.now.length - 12}. Decide estas primeiro.</p>` : ''}`
      : `<p class="mut" style="margin:0">Nada novo para decidir.${at ? ' Última leitura ' + U.rel(U.iso(new Date(at))) + '.' : ''} Volta a procurar quando quiseres; também lê sozinho quando abres a app.</p>`}
    ${P.later.length ? `<details class="ops-later"><summary class="mut">Para ver depois (${P.later.length})</summary><div class="ops-l">${P.later.map(card).join('')}</div></details>` : ''}</section>`; };
const _v = V.oportunidades;
if (_v) V.oportunidades = sub => { const h = _v(sub), i = h.indexOf('</header>'); return i > 0 ? h.slice(0, i + 9) + panel() + h.slice(i + 9) : panel() + h; };
OS.on('mail', () => { if (aiOn()) setTimeout(() => aiScan(), 1500); });

// Centro de controlo: há oportunidades à espera de decisão
const I = OS.Intel;
if (I && I.alerts) { const _a = I.alerts; I.alerts = () => { const out = _a(); try { const c = OS.one('inbox'); if (c.url && c.key) { const n = pending().now.length; if (n) out.push({ lvl: 'attention', area: 'Oportunidades', title: `${n} oportunidade${n > 1 ? 's' : ''} encontrada${n > 1 ? 's' : ''} no e-mail e no LinkedIn`, detail: 'Decide: adicionar, ver depois ou recusar', href: '#oportunidades' }); } } catch (e) { } return out; }; }
OS.OppScan = { all, pending, guess, deadline, aiScan };
})();
