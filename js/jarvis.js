/* OCEANUM — Modo Jarvis: painel em ecrã inteiro com o essencial do dia, ao vivo.
   O X fecha o painel mas o botão redondo (núcleo) fica no canto para voltar quando quiseres. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
const J = OS.Jarvis = {};
const cfg = () => Object.assign({ jarvisStart: true }, OS.one('spyke'));
let el = null, fab = null, raf = 0, dataAt = 0, newsX = 0, newsW = 0;
const name = () => OS.one('profile').short || 'Ryan';
const eur = v => U.eur(v);
const greet = () => { const h = new Date().getHours(); return h < 6 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 19 ? 'Boa tarde' : 'Boa noite'; };

/* ---------- dados ---------- */
const D = () => { const t = U.today(), nowM = new Date().getHours() * 60 + new Date().getMinutes(), o = {};
  try { o.agenda = U.sortBy(OS.Cal.items(t, t).filter(x => x.src !== 'task' && !x.done), x => x.start || '99').slice(0, 6); } catch (e) { o.agenda = []; }
  try { o.next = OS.Intel.next().slice(0, 4); } catch (e) { o.next = []; }
  try { o.alerts = OS.Intel.alerts(); } catch (e) { o.alerts = []; }
  try { const hs = OS.all('habits').filter(h => h.active && OS.Hab.due(h, t)); o.hab = [hs.filter(h => OS.Hab.done(h, t)).length, hs.length]; } catch (e) { o.hab = [0, 0]; }
  try { o.study = U.sum(OS.all('sessions').filter(x => x.date === t), x => x.minutes); } catch (e) { o.study = 0; }
  try { const F = OS.Fin, m = F.month(U.ym(t)); o.fin = { liq: F.liquid(), exp: m.exp, inc: m.inc, bill: F.upcoming(14).filter(x => x.amount < 0 && !x.tx)[0] }; } catch (e) { o.fin = null; }
  try { o.exam = U.sortBy(OS.all('assessments').filter(a => a.date >= t), a => a.date)[0]; o.rev = OS.St.revDue().length; } catch (e) { }
  try { o.mail = OS.Mail ? OS.Mail.counts() : null; } catch (e) { }
  try { o.doneT = OS.all('tasks').filter(x => x.doneAt === t).length; } catch (e) { o.doneT = 0; }
  o.wx = OS.Weather && OS.Weather.cached(); o.news = (OS.Spyke && OS.Spyke._news) || [];
  o.dayP = Math.min(1, Math.max(0, (nowM - 360) / (1440 - 360 - 60)));
  return o; };

/* ---------- desenho ---------- */
const card = (k, title, body, href) => `<section class="jv-c" style="--i:${k}" ${href ? `data-jvgo="${href}"` : ''}><h4>${title}</h4>${body}</section>`;
function render() { if (!el) return; const o = D(), t = U.today(), urg = o.alerts.filter(a => a.lvl === 'urgent');
  const wx = o.wx && o.wx.now ? `<div class="jv-wx">${OS.Weather.icon(o.wx.now.code, 40)}<div><b>${o.wx.now.t}°</b><small>${esc(OS.Weather.desc(o.wx.now.code))} · ${esc(o.wx.label)}</small></div></div><div class="jv-days">${o.wx.days.slice(1, 4).map(d => `<div>${OS.Weather.icon(d.code, 20)}<small>${U.WDS[U.parse(d.d).getDay()]}</small><b>${d.max}°<i>${d.min}°</i></b></div>`).join('')}</div>` : '<small class="mut">A carregar o clima…</small>';
  const ag = o.agenda.length ? `<ul class="jv-l">${o.agenda.map(x => `<li><b>${x.start || '—'}</b><span>${esc(x.title)}</span></li>`).join('')}</ul>` : '<small class="mut">Sem compromissos hoje.</small>';
  const nx = o.next.length ? `<ol class="jv-l jv-n">${o.next.map(n => `<li><span>${esc(n.title)}</span><small>${esc((n.why || [])[0] || n.kind || '')}</small></li>`).join('')}</ol>` : '<small class="mut">Nada pendente.</small>';
  const al = `<div class="jv-big ${urg.length ? 'neg' : 'pos'}">${urg.length}<small>${urg.length === 1 ? 'urgente' : 'urgentes'}</small></div>${urg.slice(0, 2).map(a => `<small class="jv-al">${esc(a.title)}</small>`).join('')}`;
  const fin = o.fin ? `<div class="jv-kv"><span>Disponível</span><b>${eur(o.fin.liq)}</b></div><div class="jv-kv"><span>Gasto do mês</span><b>${eur(o.fin.exp)}</b></div>${o.fin.bill ? `<div class="jv-kv"><span>${esc(o.fin.bill.title)}</span><b>${U.fmtDS(o.fin.bill.date)}</b></div>` : ''}` : '';
  const un = o.exam ? `<div class="jv-big">${Math.max(0, U.diff(o.exam.date, t))}<small>dias para ${esc(o.exam.type || 'avaliação')}</small></div><small>${esc((OS.get('subjects', o.exam.subject) || {}).name || o.exam.title)}</small>${o.rev ? `<small class="jv-al">${o.rev} revisões para hoje</small>` : ''}` : `<small class="mut">Sem avaliações marcadas.</small>${o.rev ? `<small class="jv-al">${o.rev} revisões para hoje</small>` : ''}`;
  const ml = o.mail && o.mail.at ? `<div class="jv-kv"><span>Urgentes</span><b class="${o.mail.urg ? 'neg' : ''}">${o.mail.urg}</b></div><div class="jv-kv"><span>Para responder</span><b>${o.mail.resp}</b></div><div class="jv-kv"><span>Não lidos</span><b>${o.mail.unread}</b></div>` : '<small class="mut">E-mail não ligado.</small>';
  el.innerHTML = `<div class="jv-in">
    <header class="jv-h"><div class="jv-brand"><b>SPYKE</b><small>MODO JARVIS</small></div><div class="jv-clock"><b data-jvt>${U.hm()}</b><small>${esc(new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }))}</small></div><button class="jv-x" data-act="jvClose" aria-label="Fechar o modo Jarvis">${UI.ic('x')}</button></header>
    <div class="jv-grid">
      <section class="jv-core"><canvas class="jv-cv" width="520" height="520" aria-hidden="true"></canvas><div class="jv-hi">${esc(greet())}, ${esc(name())}</div>
        <div class="jv-meta"><span><i style="background:#38bdf8"></i>Dia ${Math.round(o.dayP * 100)}%</span><span><i style="background:#22c55e"></i>Hábitos ${o.hab[0]}/${o.hab[1]}</span><span><i style="background:#f59e0b"></i>Estudo ${o.study} min</span></div>
        <div class="jv-btns"><button class="btn pri" data-act="jvTalk">${UI.ic('mic')}Falar</button><button class="btn" data-act="jvSay" data-q="bom dia">Resumo</button><button class="btn" data-act="jvSay" data-q="modo estudo">Estudo</button><button class="btn" data-act="jvSay" data-q="boa noite">Boa noite</button></div></section>
      ${card(1, 'Clima', wx)}${card(2, 'Agenda de hoje', ag, 'calendario')}${card(3, 'Prioridades', nx, 'next')}${card(4, 'Alertas', al, 'visao')}
      ${card(5, 'Finanças', fin, 'financas')}${card(6, 'Universidade', un, 'universidade')}${card(7, 'E-mail', ml, 'email')}${card(8, 'Hoje', `<div class="jv-kv"><span>Hábitos</span><b>${o.hab[0]}/${o.hab[1]}</b></div><div class="jv-bar"><i style="width:${o.hab[1] ? Math.round(o.hab[0] / o.hab[1] * 100) : 0}%"></i></div><div class="jv-kv"><span>Estudo</span><b>${o.study} min</b></div><div class="jv-kv"><span>Tarefas feitas</span><b>${o.doneT}</b></div>`, 'habitos')}
    </div>
    ${o.news.length ? `<div class="jv-news"><b>NOTÍCIAS</b><div class="jv-tk"><span class="jv-tr">${o.news.map(esc).join('<i></i>')}</span></div></div>` : ''}
  </div>`;
  dataAt = Date.now(); newsX = 0; newsW = 0; loop(o); }

/* núcleo animado: anéis = dia, hábitos e estudo; partículas e varrimento de radar */
function loop(o) { cancelAnimationFrame(raf); const c = el && el.querySelector('.jv-cv'); if (!c) return; const g = c.getContext('2d'), W = c.width, cx = W / 2, cy = W / 2, t0 = performance.now(), hp = o.hab[1] ? o.hab[0] / o.hab[1] : 0, sp = Math.min(1, o.study / 120);
  const tr = el.querySelector('.jv-tr'), tk = el.querySelector('.jv-tk');
  const frame = now => { if (!el || el.hidden) { raf = 0; return; } const t = (now - t0) / 1000, intro = Math.min(1, t / 1.4), e = 1 - Math.pow(1 - intro, 3);
    g.clearRect(0, 0, W, W); const glow = g.createRadialGradient(cx, cy, 10, cx, cy, W * .48); glow.addColorStop(0, 'rgba(120,230,255,.35)'); glow.addColorStop(.45, 'rgba(14,165,233,.12)'); glow.addColorStop(1, 'rgba(14,165,233,0)'); g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, W * .48, 0, 7); g.fill();
    g.lineCap = 'round';
    const ring = (r, p, col, w) => { g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.strokeStyle = col; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p * e); g.stroke(); };
    ring(W * .42, o.dayP, '#38bdf8', 7); ring(W * .36, hp, '#22c55e', 7); ring(W * .30, sp, '#f59e0b', 7);
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2 + t * .05; g.strokeStyle = `rgba(160,235,255,${i % 5 ? .18 : .5})`; g.lineWidth = i % 5 ? 1 : 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * W * .46, cy + Math.sin(a) * W * .46); g.lineTo(cx + Math.cos(a) * W * (i % 5 ? .475 : .485), cy + Math.sin(a) * W * (i % 5 ? .475 : .485)); g.stroke(); }
    [[.22, 1.2, 6], [.18, -1.8, 3], [.25, .5, 12]].forEach(([rr, s, n]) => { g.strokeStyle = 'rgba(170,240,255,.75)'; g.lineWidth = 2.2; for (let i = 0; i < n; i++) { const a = t * s + i * Math.PI * 2 / n; g.beginPath(); g.arc(cx, cy, Math.max(1, W * rr * e), a, a + Math.PI * 2 / n * .55); g.stroke(); } });
    const sw = t * 1.3; const sg = g.createConicGradient ? g.createConicGradient(sw, cx, cy) : null; if (sg) { sg.addColorStop(0, 'rgba(120,230,255,.28)'); sg.addColorStop(.12, 'rgba(120,230,255,0)'); sg.addColorStop(1, 'rgba(120,230,255,0)'); g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, W * .27, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(235,252,255,.96)'; g.beginPath(); g.arc(cx, cy, Math.max(1, W * (.07 + .008 * Math.sin(t * 2.2)) * e), 0, 7); g.fill();
    g.strokeStyle = 'rgba(235,252,255,.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, Math.max(1, W * .1 * e), 0, 7); g.stroke();
    if (tr && tk) { if (!newsW) newsW = tr.scrollWidth; newsX -= .6; if (newsX < -newsW) newsX = tk.clientWidth; tr.style.transform = `translateX(${newsX}px)`; }
    const tt = el.querySelector('[data-jvt]'); if (tt && Math.floor(t * 10) % 10 === 0) tt.textContent = U.hm();
    if (Date.now() - dataAt > 60e3) { render(); return; }
    raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame); }

/* ---------- abrir / fechar ---------- */
const mkFab = () => { if (fab) return; fab = document.createElement('button'); fab.type = 'button'; fab.id = 'jvFab'; fab.setAttribute('aria-label', 'Abrir o modo Jarvis'); fab.title = 'Modo Jarvis'; fab.innerHTML = '<i></i>'; fab.onclick = () => J.open(true); document.body.appendChild(fab); };
J.open = sound => { mkFab(); if (!el) { el = document.createElement('div'); el.id = 'jv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Modo Jarvis'); document.body.appendChild(el); }
  el.hidden = false; document.documentElement.classList.add('jv-open'); el.classList.remove('on'); render(); requestAnimationFrame(() => requestAnimationFrame(() => el && el.classList.add('on'))); if (fab) fab.hidden = true;
  if (sound && OS.Spyke && OS.Spyke.wakeSound) OS.Spyke.wakeSound(); if (OS.Weather && !(OS.Weather.cached() || {}).now) OS.Weather.get().then(() => el && !el.hidden && render()); };
J.close = () => { if (!el) return; el.hidden = true; el.classList.remove('on'); cancelAnimationFrame(raf); raf = 0; document.documentElement.classList.remove('jv-open'); if (fab) fab.hidden = false; };
J.isOpen = () => !!(el && !el.hidden);
A.jvClose = () => J.close();
A.jvOpen = () => J.open(true);
A.jvTalk = () => { OS.Spyke && OS.Spyke.listen(); };
A.jvSay = b => { OS.Spyke && OS.Spyke.handle(b.dataset.q); };
document.addEventListener('click', e => { const g = e.target.closest('[data-jvgo]'); if (g && el && el.contains(g)) { J.close(); OS.go(g.dataset.jvgo); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && J.isOpen() && !(document.getElementById('spy') && !document.getElementById('spy').hidden)) J.close(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && J.isOpen()) render(); });
OS.on('ready', () => { mkFab(); if (cfg().jarvisStart && !navigator.webdriver && !(OS.FocusBlock && OS.FocusBlock.state()) && !/^#(spyke|foco)/.test(location.hash)) setTimeout(() => J.open(false), 400); });
})();
