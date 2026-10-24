/* PRUMO — conta Google (Gmail e agenda) para todas as contas, sem script.
   A pessoa toca em "Ligar a minha conta Google", autoriza uma vez no Google e a autorização fica guardada no servidor, no perfil dela
   (api/google), por isso funciona em todos os aparelhos. Só leitura: nunca envia, apaga nem muda nada no Google.
   Quem já tem o script Google ligado (a conta do Ryan) continua pelo script: aqui não muda nada. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
const Acc = () => OS.Acc || {};
const on = () => !!(Acc().on && Acc().token && Acc().token() && Acc().pid && Acc().pid());
const script = () => { const c = OS.one('inbox') || {}; return !!(c.url && c.key); };
// estado guardado neste aparelho por perfil, para a página abrir logo certa: { pronto, ligado, email, gmail, agenda, at }
let stK = '', st = null;
const cur = () => { const k = 'os2goog:' + (Acc().pid ? Acc().pid() : ''); if (k !== stK) { stK = k; st = U.ls.get(k, null); } return st || {}; };
const set = o => { cur(); st = Object.assign({}, st || {}, o); U.ls.set(stK, st); };

const call = async (op, body = {}) => { let r;
  try { r = await fetch('api/google', { method: 'POST', cache: 'no-store', credentials: 'omit', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + Acc().token() }, body: JSON.stringify(Object.assign({ op, p: Acc().pid() }, body)) }); }
  catch (e) { throw new Error('Sem ligação à internet.'); }
  let j = null; try { j = await r.json(); } catch (e) { }
  if (j && j.ok) return j;
  const e = new Error((j && j.msg) || (r.status === 404 ? 'O servidor do Prumo não respondeu.' : 'Erro ' + r.status)); e.code = j && j.code; e.status = r.status;
  if (e.code === 'desligado') { set({ ligado: false, gmail: false, agenda: false, email: '' }); OS.request(); }
  throw e; };

/* ---------- estado e regresso do Google ---------- */
let waitAt = 0, busyE = null, triedAt = 0;
const waiting = () => !!waitAt && Date.now() - waitAt < 15 * 60e3 && !cur().ligado;
const linked = was => { const s = cur(); waitAt = 0; if (was) UI.toast('Conta Google ligada' + (s.email ? ': ' + s.email : ''), 'pos');
  if (s.agenda && !script()) { OS.setOne('integ', { gcal: true }); if (OS.gcalStart) OS.gcalStart(); }
  if (s.gmail && OS.Mail && OS.Mail.refresh) setTimeout(() => OS.Mail.refresh(), 300);
  OS.emit && OS.emit('google'); };
const refresh = () => { if (!on()) return Promise.resolve(cur()); if (busyE) return busyE;
  triedAt = Date.now(); busyE = (async () => { try { const was = !!cur().ligado, j = await call('estado'), wt = waiting(); set({ pronto: !!j.pronto, ligado: !!j.ligado, email: j.email || '', gmail: !!j.gmail, agenda: !!j.agenda, at: Date.now() }); if (!was && j.ligado) linked(wt); } catch (e) { } busyE = null; OS.request(); return cur(); })();
  return busyE; };
// o endereço do Google (com o state do servidor) é preparado antes, para o botão ser um link a sério (abre logo, sem bloqueio de janelas)
let link = { url: '', at: 0, busy: false, err: '' };
const fresh = () => !!link.url && Date.now() - link.at < 10 * 60e3;
const prep = async () => { if (link.busy || !on()) return; link.busy = true; link.err = '';
  try { const j = await call('inicio'); link = { url: j.url, at: Date.now(), busy: false, err: '' }; } catch (e) { link.busy = false; link.err = e.message; link.errAt = Date.now(); }
  OS.request(); };
// ao tocar no link: fica à espera; quando a pessoa volta a esta janela, confirma sozinho
document.addEventListener('click', e => { if (!e.target.closest('[data-gggo]')) return; waitAt = Date.now(); link.at = 0; setTimeout(() => OS.request(), 60); }, true);
const poll = () => { if (waiting() && !document.hidden) refresh(); };
document.addEventListener('visibilitychange', poll); window.addEventListener('focus', poll);
setInterval(() => { if (waiting() && Date.now() - waitAt < 3 * 60e3) poll(); }, 4000);

/* ---------- o cartão (Definições → E-mail, página E-mail e agenda) ---------- */
const card = () => { if (!on() || script()) return ''; const s = cur();
  // sem resposta do servidor: tenta outra vez no máximo de 30 em 30 s (nunca a cada desenho da página)
  if (!s.at) { if (Date.now() - triedAt > 30e3) refresh(); return `<div class="pn gg-card"><p class="mut" style="margin:0">${triedAt && !busyE ? 'Sem resposta do servidor do Prumo. Confirma a internet.' : 'A ver se a tua conta Google está ligada…'}</p></div>`; }
  if (!s.pronto) return `<div class="pn gg-card"><div class="pn-h"><h3>${UI.ic('mail')}Gmail e agenda Google</h3></div><p class="mut" style="margin:0">A ligação ao Google ainda não está ativa neste Prumo. Volta a ver daqui a pouco.</p></div>`;
  if (s.ligado) { const miss = [!s.gmail && 'o Gmail', !s.agenda && 'a agenda'].filter(Boolean);
    return `<div class="pn gg-card gg-on"><div class="pn-h"><h3>${UI.ic('mail')}Conta Google</h3><span class="pos">✓ ligada</span></div>
    <p style="margin:0 0 6px"><b>${esc(s.email || 'A tua conta Google')}</b></p><p class="mut" style="margin:0 0 10px;font-size:13px">${s.gmail ? 'Gmail ✓' : 'Gmail ✗'} · ${s.agenda ? 'Agenda ✓' : 'Agenda ✗'} · só leitura: o Prumo nunca envia, apaga nem muda nada no Google.</p>
    ${miss.length ? `<div class="note" style="margin-bottom:10px">Na autorização ficou por marcar ${miss.join(' e ')}. Toca em Desligar e liga outra vez, com as caixas marcadas.</div>` : ''}
    <div class="row gap8"><button class="btn sm ghost" data-act="ggOff">Desligar</button></div></div>`; }
  if (!fresh() && !link.busy && (!link.err || Date.now() - link.errAt > 30e3)) prep();
  return `<div class="pn gg-card"><div class="pn-h"><h3>${UI.ic('mail')}Ligar o Gmail e a agenda</h3></div>
    <p style="margin:0 0 10px">Autorizas uma vez no Google e o Prumo passa a ler os teus e-mails (para os separar e resumir com a IA) e os eventos da tua agenda, em todos os teus aparelhos. Só leitura: nunca envia, apaga nem muda nada.</p>
    ${fresh() ? `<a class="btn pri" href="${esc(link.url)}" target="_blank" rel="noopener" data-gggo="1">Ligar a minha conta Google</a>` : `<button class="btn pri" disabled>${link.err ? 'Sem resposta do servidor' : 'A preparar…'}</button>${link.err ? ` <button class="btn sm ghost" data-act="ggRetry">Tentar outra vez</button>` : ''}`}
    <ol class="gg-steps"><li>Escolhe a tua conta Google.</li><li>Se aparecer o aviso de app não verificada, toca em <b>Avançado</b> e depois em <b>Aceder a Prumo</b>.</li><li>Marca as caixas do <b>Gmail</b> e da <b>agenda</b> e toca em <b>Continuar</b>.</li><li>Volta ao Prumo: fica ligado sozinho.</li></ol>
    ${waiting() ? `<div class="ib-st">À espera da autorização no Google… <button class="btn xs ghost" data-act="ggCheck">Já autorizei</button></div>` : ''}</div>`; };
A.ggRetry = () => prep();
A.ggCheck = async () => { const s = await refresh(); if (!s.ligado) UI.toast('Ainda não chegou a autorização. Acaba os passos no Google e volta aqui.', 'warn'); };
A.ggOff = () => UI.ask('Desligar a conta Google?', 'O Prumo deixa de ler o teu Gmail e a tua agenda, e a autorização é apagada também no Google.', 'Desligar', async () => {
  try { await call('sair'); } catch (e) { return UI.toast(e.message, 'neg'); }
  set({ ligado: false, email: '', gmail: false, agenda: false }); if (OS.Mail && OS.Mail._clear) OS.Mail._clear(); if (A.gcalOff) A.gcalOff();
  UI.toast('Conta Google desligada', 'pos'); OS.request(); });

const s1 = () => cur();
OS.Goog = { on, card, refresh, call, st: s1,
  // usar o Google em vez do script: só nas contas sem script e com a caixa respetiva autorizada
  mail: () => on() && !script() && !!s1().ligado && !!s1().gmail,
  cal: () => on() && !script() && !!s1().ligado && !!s1().agenda,
  email: () => s1().email || '' };
OS.on('ready', () => { if (on() && !script()) refresh(); });
})();
