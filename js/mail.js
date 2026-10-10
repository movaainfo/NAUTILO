/* OCEANUM — E-mail & LinkedIn.
   Os e-mails vêm do Gmail através do teu script Google (o mesmo do atalho de gastos; versão 9+). Nada passa por servidores do Oceanum.
   A IA (a tua chave Gemini) separa: urgente, responder, atenção, informativo, promoções e spam, e escreve o resumo.
   LinkedIn: não há API pessoal; o Oceanum lê as notificações do LinkedIn que chegam ao teu Gmail (mensagens, convites, vagas, visualizações).
   Ligações: e-mails urgentes vão para o Control Room e para o Next Action / Bloco de foco; vagas → Oportunidades; convites → Rede; e-mail → Tarefa. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc;
const K = 'os2mail';
OS.ONE_DEF.mail = { q: 'in:inbox newer_than:3d', n: 30, liq: 'from:linkedin.com newer_than:14d', accts: [], auto: true };
const cfg = () => Object.assign({}, OS.ONE_DEF.mail, OS.one('mail'));
// cache só neste aparelho (os e-mails não vão para a sincronização)
let M = U.ls.get(K, null) || { at: 0, items: [], ai: {}, sum: '', done: {}, li: { at: 0, items: [], sum: null } };
M.done = M.done || {}; M.ai = M.ai || {}; if (M.aiv !== 2) { M.ai = {}; M.sum = ''; M.aiv = 2; } M.li = M.li || { at: 0, items: [], sum: null };
const save = () => { const keep = new Set(M.items.map(x => x.id).concat(M.li.items.map(x => x.id))); Object.keys(M.ai).forEach(k => { if (!keep.has(k)) delete M.ai[k]; }); Object.keys(M.done).forEach(k => { if (!keep.has(k)) delete M.done[k]; }); U.ls.set(K, M); };
let busy = '', err = '';

const CATS = [['urgente', '', 'Urgente'], ['responder', '', 'Responder'], ['atencao', '', 'Ler com atenção'], ['info', '', 'Informativo'], ['promo', '', 'Promoções'], ['spam', '', 'Spam / suspeito']];
const catL = c => (CATS.find(x => x[0] === c) || CATS[3]);
const IB = () => OS.Inbox || {};
const ready = () => { const c = OS.one('inbox'); return !!(c.url && c.key); };
const ver = () => +(OS.one('inbox').ver || 0);
const sources = () => { const c = OS.one('inbox'), out = []; if (c.url) out.push(c.url.trim()); (cfg().accts || []).forEach(a => a && a.url && out.push(a.url.trim())); return out; };
const qs = (u, extra) => u + (u.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(OS.one('inbox').key) + extra;
const nameOf = f => { const m = String(f || '').match(/^\s*"?([^"<]+?)"?\s*</); return (m ? m[1] : String(f || '').replace(/<.*>/, '')).trim() || f; };
const addrOf = f => { const m = String(f || '').match(/<([^>]+)>/); return (m ? m[1] : f || '').trim().toLowerCase(); };
const gmailLink = it => 'https://mail.google.com/mail/u/' + (+it.src || 0) + '/#all/' + encodeURIComponent(String(it.id || ''));

/* ---------- classificação sem IA (reserva) ---------- */
const guess = it => { const t = (it.s + ' ' + it.sn).toLowerCase(), f = (it.f || '').toLowerCase(), robot = /no-?reply|notifica|notification|newsletter|mailer|news@|info@|marketing|bounce/.test(f);
  if (/verif(y|ique) (your|a sua|sua) conta|confirme os seus dados|ganhou um|you won|prémio|premio|bitcoin|herança|heranca|gift card|password expir|senha expira|conta (será|sera) (suspensa|bloqueada)/.test(t)) return { c: 'spam', why: 'parece burla ou phishing' };
  if (/unsubscribe|cancelar (a )?subscri|anular (a )?subscri|newsletter|promo|desconto|% off|oferta|saldos|cup[ãa]o|cupom|black friday|liquida/.test(t)) return { c: 'promo', why: 'publicidade ou newsletter' };
  if (/urgente|urgent|último aviso|ultimo aviso|em atraso|overdue|prazo (termina|acaba)|deadline|alerta de segurança|security alert|ação necessária|action required/.test(t)) return { c: 'urgente', why: 'tem prazo ou alerta' };
  if (!robot && (/^re:|^res:/i.test(it.s) || /\?/.test(it.sn.slice(0, 300)))) return { c: 'responder', why: 'uma pessoa espera resposta' };
  if (it.imp && !robot) return { c: 'atencao', why: 'marcado como importante' };
  return { c: 'info', why: robot ? 'notificação automática' : '' }; };
const info = it => M.ai[it.id] || guess(it);

/* ---------- buscar ---------- */
const fetchQ = async (q, n) => { const all = []; const S = sources();
  await Promise.all(S.map(async (u, si) => { const j = await IB().getJSON(qs(u, '&op=gm&n=' + n + '&q=' + encodeURIComponent(q) + '&_=' + Date.now()), 2);
    if (!j || !j.ok) throw new Error(j && j.msg === 'Chave errada' ? 'Chave errada no script — cola o código outra vez.' : 'O script não devolveu os e-mails.');
    if (!Array.isArray(j.gm)) throw new Error('O script ainda não tem a parte do e-mail. Atualiza-o (passo abaixo).');
    j.gm.forEach(x => all.push(Object.assign(x, { src: si, sn: String(x.sn || '') }))); }));
  return U.sortBy(all, x => x.d).reverse(); };
const aiOn = () => OS.AI && OS.AI.key && OS.AI.key();
const classify = async items => { const todo = items.filter(x => !M.ai[x.id]).slice(0, 30); if (!todo.length && M.sum) return;
  const p = OS.one('profile');
  const o = await OS.AI.json([{ text: `És o assistente de e-mail de ${p.short || 'Ryan'} (estudante no ISCA-UA em Aveiro, trabalha, brasileiro a viver em Portugal). Hoje é ${U.today()}.
Classifica cada e-mail numa categoria: "urgente" (prazo hoje/amanhã, pagamento em atraso, segurança da conta, universidade/trabalho a pedir ação já), "responder" (uma pessoa real espera resposta dele), "atencao" (importante ler, sem resposta), "info" (notificações, recibos, confirmações), "promo" (marketing, newsletters), "spam" (suspeito: phishing, burla, pede dados ou dinheiro, remetente estranho).
Para cada e-mail: {"id","c","porque":"máx. 12 palavras","acao":"o que fazer, máx. 8 palavras, ou vazio","prazo":"AAAA-MM-DD ou null","evento":null ou {"titulo","data":"AAAA-MM-DD","hora":"HH:MM" ou null,"fim":"HH:MM" ou null,"local":"…" ou null}}.
"evento" só quando o e-mail marca algo com data concreta para ele: reunião, entrevista, aula, consulta, exame, evento, entrega com prazo. Converte datas relativas ("amanhã", "sexta") usando a data do e-mail.
Escreve também "resumo": 2 a 3 frases sobre o que precisa da atenção dele (todos os e-mails, não só estes). Não inventes nada que não esteja nos e-mails.
JSON: {"resumo":"…","itens":[…]}
E-mails novos: ${JSON.stringify(todo.map(x => ({ id: x.id, de: x.f, assunto: x.s, data: x.d.slice(0, 16), nao_lido: x.u, importante: x.imp, inicio: x.sn.slice(0, 320) })))}
Outros já vistos (só para o resumo): ${JSON.stringify(items.filter(x => M.ai[x.id]).slice(0, 25).map(x => ({ assunto: x.s, c: M.ai[x.id].c })))}` }], .15);
  (o.itens || []).forEach(r => { if (r && r.id && CATS.some(c => c[0] === r.c)) { M.ai[r.id] = { c: r.c, why: String(r.porque || '').slice(0, 120), a: String(r.acao || '').slice(0, 80), due: /^\d{4}-\d\d-\d\d$/.test(r.prazo || '') ? r.prazo : '' }; addEvent(items.find(x => x.id === r.id), r.evento); } });
  if (o.resumo) M.sum = String(o.resumo).slice(0, 600); };
const refresh = async (manual) => { if (busy || !ready()) { if (manual && !ready()) UI.toast('Liga primeiro o script Google (aba Ligar contas)', 'warn'); return; }
  busy = 'mail'; err = ''; if (manual) OS.request();
  try { const c = cfg(); M.items = await fetchQ(c.q, c.n); M.at = Date.now(); if (aiOn()) { try { await classify(M.items); } catch (e) { err = 'IA: ' + (e.message || 'sem resposta') + ' (usei a classificação simples)'; } } save(); OS.emit && OS.emit('mail'); }
  catch (e) { err = e.message || 'Não consegui ir buscar os e-mails.'; }
  busy = ''; OS.request(); };
const refreshLi = async (manual) => { if (busy || !ready()) return; busy = 'li'; err = ''; if (manual) OS.request();
  try { const items = await fetchQ(cfg().liq, 40); M.li = { at: Date.now(), items, sum: liGuess(items) };
    if (aiOn() && items.length) { try { const o = await OS.AI.json([{ text: `Estes são e-mails de notificação do LinkedIn do ${OS.one('profile').short || 'Ryan'}. Extrai SÓ o que está nos e-mails (não inventes):
JSON {"resumo":"2 frases: o que vale a pena fazer no LinkedIn agora","mensagens":[{"de","texto":"máx. 20 palavras","id"}],"convites":[{"nome","cargo","id"}],"vagas":[{"titulo","empresa","local","id"}],"visualizacoes":número ou null,"publicacoes":[{"texto":"máx. 15 palavras","id"}]}
E-mails: ${JSON.stringify(items.slice(0, 35).map(x => ({ id: x.id, assunto: x.s, data: x.d.slice(0, 10), inicio: x.sn.slice(0, 300) })))}` }], .1); M.li.sum = Object.assign(liGuess(items), o, { ai: true }); } catch (e) { err = 'IA: ' + (e.message || '') ; } }
    save(); } catch (e) { err = e.message || 'Não consegui ir buscar o LinkedIn.'; }
  busy = ''; OS.request(); };
const liGuess = items => { const r = { resumo: '', mensagens: [], convites: [], vagas: [], visualizacoes: null, publicacoes: [] };
  items.forEach(x => { const s = x.s; if (/mensagem|message|enviou-lhe|sent you/i.test(s)) r.mensagens.push({ de: s.replace(/^(.*?)( enviou| sent| te enviou).*$/i, '$1'), texto: x.sn.slice(0, 120), id: x.id });
    else if (/convite|invitation|quer ligar|wants to connect|conectar/i.test(s)) r.convites.push({ nome: s.replace(/^(.*?)( quer| wants| enviou| convid).*$/i, '$1'), cargo: '', id: x.id });
    else if (/vaga|job|emprego|candidat|hiring|está a contratar|contratando/i.test(s)) r.vagas.push({ titulo: s, empresa: '', local: '', id: x.id });
    else if (/visualiz|viewed|apareceu em|appeared in/i.test(s)) { const m = s.match(/(\d+)/); r.visualizacoes = (r.visualizacoes || 0) + (m ? +m[1] : 1); }
    else r.publicacoes.push({ texto: s, id: x.id }); });
  return r; };
const act = async (it, a) => { try { const u = sources()[it.src || 0]; const j = await IB().getJSON(qs(u, '&op=ga&a=' + a + '&ids=' + encodeURIComponent(it.id) + '&_=' + Date.now()), 2); return j && j.ok && j.n > 0; } catch (e) { return false; } };

/* ---------- API para as outras áreas (Spyke, Control Room, Next Action, Bloco de foco) ---------- */
const open = () => M.items.filter(x => !M.done[x.id]);
const Mail = OS.Mail = {
  items: () => open().map(x => Object.assign({}, x, info(x))),
  counts: () => { const L = Mail.items(); return { urg: L.filter(x => x.c === 'urgente').length, resp: L.filter(x => x.c === 'responder').length, unread: L.filter(x => x.u).length, spam: L.filter(x => x.c === 'spam').length, at: M.at }; },
  sum: () => M.sum, li: () => M.li, refresh, refreshLi,
  speak: () => { if (!M.at) return ''; const c = Mail.counts(), L = Mail.items(), top = L.filter(x => x.c === 'urgente' || x.c === 'responder').slice(0, 2);
    if (!c.urg && !c.resp) return 'Nos e-mails, nada urgente nem à espera de resposta.';
    return `Nos e-mails: ${c.urg ? c.urg + (c.urg === 1 ? ' urgente' : ' urgentes') : ''}${c.urg && c.resp ? ' e ' : ''}${c.resp ? c.resp + ' à espera de resposta' : ''}. ${top.map(x => nameOf(x.f) + ' sobre ' + x.s.replace(/^(re|res|fw|fwd|enc):\s*/i, '')).join('; ')}.`; },
  ctx: () => Mail.items().filter(x => ['urgente', 'responder', 'atencao'].includes(x.c)).slice(0, 8).map(x => `${catL(x.c)[2]}: ${nameOf(x.f)} — ${x.s}`).join('\n'),
  _set: v => { M = Object.assign(M, v); save(); },
  // Spyke: "responde à Ana que envio amanhã" → rascunho no Gmail
  replyByName: async (who, instr) => { const n = String(who || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), L = Mail.items(); const it = L.find(x => nameOf(x.f).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(n)) || L.find(x => addrOf(x.f).includes(n)); if (!it) return { ok: false, msg: `Não encontrei um e-mail recente de ${who}.` };
    if (!OS.AI || !OS.AI.key()) return { ok: false, msg: 'Preciso da IA ligada para escrever a resposta.' }; const body = await compose(it, instr); await saveDraft(it, body); M.done[it.id] = Date.now(); save(); return { ok: true, to: nameOf(it.f), body }; }
};
// Control Room: e-mails urgentes
const I = OS.Intel;
if (I && I.alerts) { const _a = I.alerts; I.alerts = () => { const out = _a(); try { Mail.items().filter(x => x.c === 'urgente').slice(0, 3).forEach(x => out.push({ lvl: 'attention', area: 'E-mail', title: x.s || '(sem assunto)', detail: nameOf(x.f) + (x.a ? ' · ' + x.a : x.why ? ' · ' + x.why : ''), href: '#email' })); } catch (e) { } return out; }; }
// Next Action (e Bloco de foco): responder aos e-mails que esperam por ti
if (I && I.next) { const _n = I.next; I.next = (o = {}) => { const out = _n(o); try { if (!o.ctx || o.ctx === '@Computador') Mail.items().filter(x => x.c === 'urgente' || x.c === 'responder').slice(0, 5).forEach(x => out.push({ kind: 'E-mail', title: 'Responder: ' + (x.s || nameOf(x.f)), score: x.c === 'urgente' ? 62 : 36, why: [nameOf(x.f), x.a || x.why].filter(Boolean), eff: 10, area: 'E-mail', act: `data-act="mlDone" data-id="${esc(x.id)}"`, actL: 'Feito', href: '#email' })); } catch (e) { } return out.sort((a, b) => b.score - a.score); }; }

/* ---------- página ---------- */
const TB = [['', 'Resumo'], ['caixa', 'Caixa'], ['linkedin', 'LinkedIn'], ['contas', 'Ligar contas']];
V.email = sub => { const k = TB.some(t => t[0] === (sub || '')) ? (sub || '') : '';
  const when = M.at ? 'atualizado ' + U.rel(U.iso(new Date(M.at))) + ' às ' + new Date(M.at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : 'ainda não atualizado';
  return UI.head('E-mail & LinkedIn', 'O que precisa da tua atenção, separado do lixo.', `<button class="btn sm" data-act="mlRefresh" ${busy ? 'disabled' : ''}>${UI.ic('sync')}${busy ? 'A atualizar…' : 'Atualizar'}</button>`) + UI.tabs('email', TB, k) + `<div class="ml-page">${err ? `<div class="ib-st bad" style="margin-bottom:10px">${esc(err)}</div>` : ''}${!ready() || ver() < 9 ? (k === 'contas' ? '' : setupCard()) : ''}${P[k](when)}</div>`; };
const setupCard = () => `<div class="pn ml-setup"><b>${ready() ? 'Falta atualizar o script Google' : 'Liga o teu Gmail ao Oceanum'}</b><p class="mut">${ready() ? 'O teu script ainda não tem a parte do e-mail.' : 'Usa o mesmo script Google do atalho de gastos e da sincronização.'} Demora 3 minutos, uma vez só.</p><a class="btn sm pri" href="#email.contas">Ver os passos</a></div>`;
const row = (x, o = {}) => { const [c, ic, l] = catL(x.c); return `<div class="ml-it ${x.u ? 'unread' : ''} c-${c}"><div class="ml-ic" title="${l}"></div><div class="ml-t"><div class="ml-h"><b>${esc(nameOf(x.f))}</b><small>${U.fmtDS(x.d.slice(0, 10))} ${x.d.slice(11, 16) ? new Date(x.d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}</small></div><div class="ml-s">${esc(x.s || '(sem assunto)')}</div><small class="ml-w">${esc([x.why, x.a ? '→ ' + x.a : '', x.due ? 'prazo ' + U.fmtDS(x.due) : ''].filter(Boolean).join(' · ') || x.sn.slice(0, 110))}</small>
  <div class="ml-a"><a class="btn xs" href="${esc(gmailLink(x))}" target="_blank" rel="noopener">Abrir</a>${c === 'urgente' || c === 'responder' || c === 'atencao' ? `<button class="btn xs pri" data-act="mlReply" data-id="${esc(x.id)}">Responder</button><button class="btn xs ghost" data-act="mlTask" data-id="${esc(x.id)}">${UI.ic('plus')}Tarefa</button><button class="btn xs ghost" data-act="mlDone" data-id="${esc(x.id)}">${UI.ic('check')}Feito</button>` : ''}<button class="btn xs ghost" data-act="mlDo" data-a="arquivar" data-id="${esc(x.id)}">Arquivar</button>${c === 'spam' || c === 'promo' ? `<button class="btn xs ghost" data-act="mlDo" data-a="spam" data-id="${esc(x.id)}">Spam</button>` : ''}${o.move === false ? '' : `<select class="ml-mv" data-mlmv="${esc(x.id)}" aria-label="Mudar categoria">${CATS.map(k => `<option value="${k[0]}"${k[0] === c ? ' selected' : ''}>${k[2]}</option>`).join('')}</select>`}</div></div></div>`; };
const P = {};
P[''] = when => { const L = Mail.items(), c = Mail.counts(), by = k => L.filter(x => x.c === k);
  if (!M.at) return ready() && ver() >= 9 ? `<div class="pn">${UI.empty('Ainda sem e-mails. Toca em Atualizar.')}</div>` : '';
  return `<div class="kpis">${UI.kpi('Urgentes', c.urg, '', { tone: c.urg ? 'neg' : '' })}${UI.kpi('Para responder', c.resp)}${UI.kpi('Não lidos', c.unread)}${UI.kpi('Spam suspeito', c.spam, '', { tone: c.spam ? 'warn' : '' })}</div>
  <div class="pn ml-sum"><div class="pn-h"><h3>${aiOn() ? 'Resumo' : 'Resumo'}</h3><small class="mut">${esc(when)}</small></div><p>${esc(M.sum || (aiOn() ? 'Toca em Atualizar para a IA ler os e-mails.' : 'Liga o Spyke (IA) na página do Spyke para teres o resumo escrito e a separação inteligente. Agora uso regras simples.'))}</p>${(OS.Spyke && OS.Spyke.say) ? `<button class="btn xs ghost" data-act="mlSay">${UI.ic('mic')}Spyke, lê-me isto</button>` : ''}</div>
  ${['urgente', 'responder', 'atencao'].map(k => by(k).length ? `<div class="pn"><div class="pn-h"><h3>${catL(k)[2]} · ${by(k).length}</h3></div><div class="ml-list">${by(k).map(x => row(x)).join('')}</div></div>` : '').join('')}
  ${by('urgente').length + by('responder').length + by('atencao').length ? '' : `<div class="pn">${UI.empty('Nada urgente nem à espera de resposta.')}</div>`}
  ${(by('promo').length + by('spam').length) ? `<div class="pn"><div class="pn-h"><h3>Lixo e promoções · ${by('promo').length + by('spam').length}</h3><div class="row gap6">${by('promo').length ? `<button class="btn xs ghost" data-act="mlBulk" data-c="promo" data-a="arquivar">Arquivar promoções</button>` : ''}${by('spam').length ? `<button class="btn xs ghost" data-act="mlBulk" data-c="spam" data-a="spam">Mandar suspeitos para spam</button>` : ''}</div></div>${UI.toggle('Ver lista', `<div class="ml-list">${by('spam').concat(by('promo')).map(x => row(x)).join('')}</div>`, 'mlJunk')}</div>` : ''}`; };
P.caixa = () => { const L = Mail.items(), f = OS.ui.mlF || '', V2 = f ? L.filter(x => x.c === f) : L;
  return `<div class="ml-f"><button class="chip ${!f ? 'on' : ''}" data-ui="mlF" data-v="">Tudo · ${L.length}</button>${CATS.map(([k, ic, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-ui="mlF" data-v="${k}">${l} · ${L.filter(x => x.c === k).length}</button>`).join('')}</div>
  <div class="pn"><div class="ml-list">${V2.map(x => row(x)).join('') || UI.empty(M.at ? 'Nada aqui.' : 'Toca em Atualizar.')}</div></div>${Object.keys(M.done).length ? `<p class="mut" style="font-size:12.5px">${Object.keys(M.done).length} marcado(s) como feito neste aparelho · <button class="btn xs ghost" data-act="mlUndo">mostrar outra vez</button></p>` : ''}`; };
P.linkedin = () => { const li = M.li, s = li.sum;
  if (!li.at) return `<div class="pn"><p class="mut">O LinkedIn não deixa apps pessoais lerem a tua conta. O Oceanum lê as <b>notificações do LinkedIn que chegam ao teu Gmail</b> (mensagens, convites, vagas, quem viu o perfil). Confirma no LinkedIn → Definições → Comunicações → E-mail que estas notificações estão ligadas.</p><button class="btn pri" data-act="mlLi" ${ready() && ver() >= 9 ? '' : 'disabled'}>Ler o LinkedIn agora</button></div>`;
  const it = id => li.items.find(x => x.id === id) || {}, lk = id => id && it(id).id ? `<a class="btn xs" href="${esc(gmailLink(it(id)))}" target="_blank" rel="noopener">Abrir</a>` : '';
  return `<div class="row gap8" style="margin-bottom:10px;align-items:center"><button class="btn sm" data-act="mlLi">${UI.ic('sync')}${busy === 'li' ? 'A ler…' : 'Atualizar LinkedIn'}</button><small class="mut">${li.items.length} notificações dos últimos 14 dias</small><span class="grow"></span><a class="btn sm ghost" href="https://www.linkedin.com/" target="_blank" rel="noopener">Abrir LinkedIn</a></div>
  ${s.resumo ? `<div class="pn ml-sum"><p>${esc(s.resumo)}</p></div>` : ''}
  <div class="kpis">${UI.kpi('Mensagens', (s.mensagens || []).length)}${UI.kpi('Convites', (s.convites || []).length)}${UI.kpi('Vagas', (s.vagas || []).length)}${UI.kpi('Visualizações do perfil', s.visualizacoes != null ? s.visualizacoes : '—')}</div>
  ${(s.mensagens || []).length ? `<div class="pn"><div class="pn-h"><h3>Mensagens</h3></div><div class="list">${s.mensagens.map(m => `<div class="li"><div class="li-t"><b>${esc(m.de || '')}</b><small>${esc(m.texto || '')}</small></div><div class="li-r">${lk(m.id)}</div></div>`).join('')}</div></div>` : ''}
  ${(s.convites || []).length ? `<div class="pn"><div class="pn-h"><h3>Convites</h3></div><div class="list">${s.convites.map(m => `<div class="li"><div class="li-t"><b>${esc(m.nome || '')}</b><small>${esc(m.cargo || '')}</small></div><div class="li-r"><button class="btn xs ghost" data-act="mlContact" data-n="${esc(m.nome || '')}" data-r="${esc(m.cargo || '')}">${UI.ic('plus')}Rede</button>${lk(m.id)}</div></div>`).join('')}</div></div>` : ''}
  ${(s.vagas || []).length ? `<div class="pn"><div class="pn-h"><h3>Vagas</h3></div><div class="list">${s.vagas.map(m => `<div class="li"><div class="li-t"><b>${esc(m.titulo || '')}</b><small>${esc([m.empresa, m.local].filter(Boolean).join(' · '))}</small></div><div class="li-r"><button class="btn xs ghost" data-act="mlOpp" data-t="${esc(m.titulo || '')}" data-e="${esc(m.empresa || '')}" data-id="${esc(m.id || '')}">${UI.ic('plus')}Oportunidades</button>${lk(m.id)}</div></div>`).join('')}</div></div>` : ''}
  ${(s.publicacoes || []).length ? UI.toggle('Outras notificações · ' + s.publicacoes.length, `<div class="list">${s.publicacoes.map(m => `<div class="li"><div class="li-t"><small>${esc(m.texto || '')}</small></div><div class="li-r">${lk(m.id)}</div></div>`).join('')}</div>`, 'mlLiO') : ''}`; };
P.contas = () => { const c = cfg(), ib = OS.one('inbox');
  return `<div class="pn fb-guide"><h3>1 · Gmail principal ${ready() && ver() >= 10 ? '<span class="pos">✓ ligado</span>' : ready() && ver() >= 9 ? '<span class="mut">ligado · atualiza para poderes responder</span>' : ''}</h3>
    ${!ready() ? `<p>Primeiro liga o script Google em <a class="acc" href="#definicoes">Definições → Atalho de gastos</a> (passos 1 e 2). Depois volta aqui.</p>` : ver() >= 10 ? '<p class="mut">O teu script já lê o Gmail e guarda respostas como rascunho.</p>' : ''}
    ${ready() && ver() < 10 ? `<ol><li>Toca em <b>Copiar código novo</b> (versão 10: lê o Gmail e guarda respostas como rascunho).</li><li>Abre <a class="acc" href="https://script.google.com/home" target="_blank" rel="noopener">script.google.com</a> → o teu projeto do Oceanum → apaga tudo → cola → <b>Guardar</b>.</li><li>Na lista de funções ao lado de ▶ escolhe <b>autorizarGmail</b> → <b>▶ Executar</b> → <b>Rever permissões</b> → a tua conta → Avançadas → Aceder → <b>Permitir</b> (agora pede também o Gmail).</li><li><b>Implementar → Gerir implementações → ✏️ → Versão: Nova versão → Implementar</b>. O endereço fica igual.</li><li>Volta aqui e toca em <b>Verificar</b>.</li></ol>
      <div class="row gap8"><button class="btn sm pri" data-act="ibCopy" data-t="code">${UI.ic('link')}Copiar código novo</button><button class="btn sm" data-act="mlCheck">Verificar</button></div>` : ''}
    <p class="mut" style="font-size:12.5px;margin-top:8px">Privacidade: o script corre na tua conta Google e só envia ao Oceanum o assunto, o remetente e o início do texto dos e-mails recentes. Com a IA ligada, isso vai para a tua chave Gemini para ser separado e resumido. Ações (arquivar, spam) só quando tocas.</p></div>
  <div class="pn fb-guide"><h3>2 · O que ler</h3><div class="ws-form"><label>Pesquisa do Gmail<input class="field" data-bind="mail.q" value="${esc(c.q)}"></label><label>Quantos e-mails (máx. 50)<input class="field" type="number" min="5" max="50" data-bind="mail.n" value="${c.n}"></label><label>LinkedIn<input class="field" data-bind="mail.liq" value="${esc(c.liq)}"></label></div><small class="mut">Exemplos: <code>in:inbox newer_than:3d</code> · <code>is:unread newer_than:7d</code> · <code>in:inbox -category:promotions newer_than:2d</code></small></div>
  <div class="pn fb-guide"><h3>3 · Outras contas de e-mail</h3><ol><li><b>Outro Gmail:</b> entra nessa conta em script.google.com (janela anónima), cria um projeto, cola o <b>mesmo código</b>, executa <b>autorizarGmail</b>, implementa como Aplicação Web (Eu · Qualquer pessoa) e cola o endereço abaixo.</li><li><b>E-mail da universidade, Outlook, iCloud:</b> configura o reencaminhamento automático para o teu Gmail (no Outlook/Office 365: Definições → Correio → Reencaminhamento). Esses e-mails passam a aparecer aqui, com o endereço de destino.</li></ol>
    ${(c.accts || []).map((a, i) => `<div class="li"><div class="li-t"><b>${esc(a.label || 'Conta ' + (i + 2))}</b><small>${esc(a.url.replace(/^https:\/\/script\.google\.com\/macros\/s\//, '').slice(0, 24))}…</small></div><div class="li-r"><button class="btn xs ghost" data-act="mlAcctDel" data-i="${i}">${UI.ic('trash')}</button></div></div>`).join('')}
    <form class="fb-add" data-form="mlAcct" style="grid-template-columns:120px minmax(0,1fr) auto"><input class="field" name="l" placeholder="Nome (ex.: Pessoal)"><input class="field" name="u" placeholder="https://script.google.com/macros/s/…/exec" required autocapitalize="none" spellcheck="false"><button class="btn">Juntar</button></form></div>`; };

/* ---------- eventos encontrados nos e-mails → calendário ---------- */
OS.S.mailevents = { label: 'Evento do e-mail', title: r => r.title || 'Evento', fields: [
  { k: 'title', l: 'Título', t: 'text', req: 1 }, { k: 'date', l: 'Dia', t: 'date', req: 1 }, { k: 'start', l: 'Início', t: 'time' }, { k: 'end', l: 'Fim', t: 'time' }, { k: 'place', l: 'Local', t: 'text' }, { k: 'from', l: 'De', t: 'text' }, { k: 'note', l: 'Nota', t: 'text' }] };
function addEvent(it, ev) { try { if (!it || !ev || !/^\d{4}-\d\d-\d\d$/.test(ev.data || '') || ev.data < U.addDays(U.today(), -1)) return; const no = cfg().evNo || [];
  if (no.includes(it.id) || OS.all('mailevents').some(e => e.mid === it.id)) return; const tm = x => /^\d\d:\d\d$/.test(x || '') ? x : '';
  OS.add('mailevents', { mid: it.id, title: String(ev.titulo || it.s || 'Evento').slice(0, 120), date: ev.data, start: tm(ev.hora), end: tm(ev.fim), place: String(ev.local || '').slice(0, 120), from: nameOf(it.f), subj: String(it.s || '').slice(0, 160), src: it.src || 0 }, { silent: true }); } catch (e) { } }
OS.on('del:mailevents', e => { if (!e.mid) return; const no = (cfg().evNo || []).concat(e.mid).slice(-300); OS.setOne('mail', { evNo: no }); });
if (OS.Cal && OS.Cal.items) { OS.Cal.src.mail = ['E-mail', '#f59e0b']; const _it = OS.Cal.items; OS.Cal.items = (from, to) => { const out = _it(from, to); OS.all('mailevents').forEach(e => { if (e.date >= from && e.date <= to) out.push({ date: e.date, start: e.start || '', end: e.end || '', title: e.title + (e.place ? ' · ' + e.place : ''), src: 'mail', imp: true, edit: 'mailevents:' + e.id }); }); return out.sort((a, b) => (a.date + (a.start || '99')).localeCompare(b.date + (b.start || '99'))); }; }

/* ---------- responder: o texto fica como rascunho no teu Gmail ---------- */
const postTo = async (u, o) => { const r = await fetch(u, { method: 'POST', body: new URLSearchParams(Object.assign({ k: OS.one('inbox').key }, o)), credentials: 'omit', cache: 'no-store' }); const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { ok: false, msg: t.slice(0, 160) }; } };
const compose = async (it, instr) => { const p = OS.one('profile');
  const o = await OS.AI.json([{ text: `Escreve a resposta de ${p.name || p.short || 'Ryan'} a este e-mail. Língua: a mesma do e-mail (se for português, usa o português de quem escreveu). Tom: educado, direto e humano; curto (2 a 6 frases). Termina com "${p.short || 'Ryan'}". Não inventes factos, datas ou compromissos que ele não disse.
O que ele quer dizer: ${instr || '(responde de forma adequada e prática)'}
E-mail de ${it.f} · assunto: ${it.s}
Texto: ${it.sn.slice(0, 900)}
JSON: {"texto":"a resposta completa, sem assunto"}` }], .5);
  return String(o.texto || '').trim(); };
const saveDraft = async (it, body) => { const u = sources()[it.src || 0]; if (!u) throw new Error('Script não ligado'); if (ver() < 10) throw new Error('Atualiza o script Google para a versão 10 (Ligar contas)');
  const j = await postTo(u, { op: 'dr', id: it.id, b: body }); if (!j || !j.ok) throw new Error((j && j.msg) || 'O script não guardou o rascunho'); return true; };
let RP = null;
const replyModal = () => { if (!RP) return; const it = RP.it; UI.modal(`<div class="ml-rp"><div class="pn-h"><h3>Responder a ${esc(nameOf(it.f))}</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div><small class="mut">${esc(it.s || '')}</small>
  <div class="ml-rq">${esc(it.sn.slice(0, 260))}${it.sn.length > 260 ? '…' : ''}</div>
  <div class="ml-rai"><input class="field" id="mlRi" placeholder="O que queres dizer? ex.: aceito, envio amanhã até às 18h" value="${esc(RP.instr || '')}"><button class="btn sm" data-act="mlRai" ${OS.AI && OS.AI.key() ? '' : 'disabled'}>${RP.busy ? 'A escrever…' : 'Escrever com IA'}</button></div>
  <textarea id="mlRb" class="field" rows="7" placeholder="A tua resposta…">${esc(RP.body || '')}</textarea>
  <div class="row gap8" style="margin-top:10px;flex-wrap:wrap"><button class="btn sm" data-act="mlRdict">${UI.ic('mic')}Ditar</button><span class="grow"></span><button class="btn pri" data-act="mlRsave">Guardar rascunho no Gmail</button></div>
  ${RP.msg ? `<div class="ib-st ${RP.ok ? 'ok' : 'bad'}" style="margin-top:8px">${esc(RP.msg)}</div>` : ''}<small class="mut" style="display:block;margin-top:8px">Fica nos Rascunhos do Gmail: revês e envias de lá. O Oceanum nunca envia e-mails sozinho.</small></div>`, 'tall'); };
const keepRP = () => { const b = document.getElementById('mlRb'), i = document.getElementById('mlRi'); if (RP) { if (b) RP.body = b.value; if (i) RP.instr = i.value; } };
A.mlReply = b => { const it = byId(b.dataset.id); if (!it) return; RP = { it, body: '', instr: '' }; replyModal(); };
A.mlRai = async () => { keepRP(); if (!RP || RP.busy) return; RP.busy = true; replyModal(); try { RP.body = await compose(RP.it, RP.instr); RP.msg = ''; } catch (e) { RP.msg = 'IA: ' + (e.message || 'erro'); RP.ok = false; } RP.busy = false; replyModal(); };
A.mlRdict = () => { keepRP(); const SRc = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SRc) return UI.toast('Este navegador não deixa ditar', 'warn'); const r = new SRc(); r.lang = (OS.one('spyke').accent === 'PT') ? 'pt-PT' : 'pt-BR'; r.interimResults = false; r.onresult = e => { const t = [...e.results].map(x => x[0].transcript).join(' '); RP.body = (RP.body ? RP.body.trim() + ' ' : '') + t; replyModal(); }; r.onerror = () => UI.toast('Não consegui ouvir', 'warn'); UI.toast('A ouvir… fala a tua resposta'); try { r.start(); } catch (e) { } };
A.mlRsave = async () => { keepRP(); if (!RP || !RP.body.trim()) return UI.toast('Escreve a resposta primeiro', 'warn'); try { await saveDraft(RP.it, RP.body.trim()); RP.msg = 'Rascunho guardado no Gmail. Abre o Gmail → Rascunhos para enviar.'; RP.ok = true; M.done[RP.it.id] = Date.now(); save(); } catch (e) { RP.msg = e.message; RP.ok = false; } replyModal(); OS.request(); };

/* ---------- ações ---------- */
const byId = id => M.items.find(x => x.id === id) || M.li.items.find(x => x.id === id);
A.mlRefresh = () => { const h = location.hash; if (/linkedin/.test(h)) refreshLi(true); else refresh(true); };
A.mlLi = () => refreshLi(true);
A.mlDone = b => { const it = byId(b.dataset.id); M.done[b.dataset.id] = Date.now(); save(); if (it && it.u) act(it, 'lido'); UI.toast('Feito', 'pos'); OS.request(); };
A.mlUndo = () => { M.done = {}; save(); OS.request(); };
A.mlDo = async b => { const it = byId(b.dataset.id); if (!it) return; const a = b.dataset.a; b.disabled = true; const ok = await act(it, a); if (ok) { M.items = M.items.filter(x => x.id !== it.id); save(); UI.toast(a === 'spam' ? 'Enviado para o spam' : 'Arquivado', 'pos'); } else UI.toast('O script não conseguiu. Atualiza-o para a versão 9.', 'neg'); OS.request(); };
A.mlBulk = b => { const L = Mail.items().filter(x => x.c === b.dataset.c), a = b.dataset.a; if (!L.length) return;
  UI.ask(a === 'spam' ? `Mandar ${L.length} e-mail(s) suspeito(s) para o spam?` : `Arquivar ${L.length} promoção(ões)?`, 'No Gmail. Podes desfazer lá.', a === 'spam' ? 'Mandar para spam' : 'Arquivar', async () => { let n = 0; for (const it of L) if (await act(it, a)) { n++; M.items = M.items.filter(x => x.id !== it.id); } save(); UI.toast(n + ' feito(s)', n ? 'pos' : 'neg'); OS.request(); }); };
A.mlTask = b => { const it = byId(b.dataset.id); if (!it) return; const x = Object.assign({}, it, info(it)); OS.add('tasks', { title: 'Responder: ' + (x.s || nameOf(x.f)).replace(/^(re|res|fw|fwd|enc):\s*/i, ''), status: 'Próxima', prio: x.c === 'urgente' ? '1' : '2', due: x.due || (x.c === 'urgente' ? U.today() : ''), effort: 10, ctx: ['@Computador'], area: 'Pessoal', notes: nameOf(x.f) + ' <' + addrOf(x.f) + '>\n' + gmailLink(x), mail: it.id }); M.done[it.id] = Date.now(); save(); UI.toast('Tarefa criada', 'pos'); };
A.mlOpp = b => { const n = b.dataset.t + (b.dataset.e ? ' · ' + b.dataset.e : ''); if (OS.all('opps').some(o => o.name === n)) return UI.toast('Já está nas Oportunidades'); const it = byId(b.dataset.id); OS.add('opps', { name: n, inst: b.dataset.e, kind: 'Emprego', area: 'Carreira', status: 'Identificada', prio: '3', next: 'Ler a vaga e decidir', link: it ? gmailLink(it) : '' }); UI.toast('Guardada em Oportunidades', 'pos'); };
A.mlContact = b => { if (OS.all('contacts').some(c => c.name === b.dataset.n)) return UI.toast('Já está na tua rede'); OS.add('contacts', { name: b.dataset.n, role: b.dataset.r, how: 'LinkedIn', strength: 1, last: U.today(), tags: ['LinkedIn'] }); UI.toast('Adicionado à rede (Carreira)', 'pos'); };
A.mlSay = () => OS.Spyke && OS.Spyke.say((M.sum ? M.sum + ' ' : '') + Mail.speak());
A.mlCheck = async () => { UI.toast('A verificar…'); await OS.Inbox.check(); UI.toast(ver() >= 10 ? 'Script atualizado ✓' : 'Ainda é a versão ' + ver() + '. Confirma "Nova versão" ao implementar.', ver() >= 10 ? 'pos' : 'warn'); if (ver() >= 9) refresh(true); else OS.request(); };
A.mlAcctDel = b => { const a = (cfg().accts || []).slice(); a.splice(+b.dataset.i, 1); OS.setOne('mail', { accts: a }); };
OS.forms.mlAcct = f => { const u = f.elements.u.value.trim(); if (!/^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u)) return UI.toast('Endereço inválido (tem de terminar em /exec)', 'neg'); OS.setOne('mail', { accts: (cfg().accts || []).concat({ label: f.elements.l.value.trim(), url: u }) }); UI.toast('Conta juntada', 'pos'); };
document.addEventListener('change', e => { const id = e.target.dataset && e.target.dataset.mlmv; if (!id) return; const it = byId(id); if (!it) return; M.ai[id] = Object.assign({}, info(it), { c: e.target.value, why: 'mudado por ti' }); save(); OS.request(); });

// tarefa feita → e-mail tratado (e marcado como lido no Gmail)
OS.on('upd:tasks', (t, b) => { if (!t.mail || !b || b.status === t.status || t.status !== 'Feita') return; M.done[t.mail] = Date.now(); save(); const it = byId(t.mail); if (it && it.u) act(it, 'lido'); });
/* ---------- atualizar sozinho (só com a app aberta) ---------- */
const tick = () => { if (document.hidden || !ready() || ver() < 9 || !cfg().auto) return; if (Date.now() - (M.at || 0) > 15 * 60e3) refresh(); else if (Date.now() - (M.li.at || 0) > 90 * 60e3 && M.li.at) refreshLi(); };
OS.on('ready', () => setTimeout(tick, 4000)); setInterval(tick, 60e3);
})();
