/* Náutilo — atualizações visíveis: ecrã curto "A atualizar…" quando chega uma versão nova,
   e aviso "Atualizado · versão X" na primeira abertura dessa versão. */
(() => {
'use strict';
const VER = window.OCEANUM_VERSION || {}, KEY = 'os2ver';
// modo de segurança: endereço com ?seguro → apaga a cache da app, liga o modo leve e recarrega a versão mais recente
if (/[?&](seguro|safe)\b/.test(location.search)) { try { localStorage.setItem('os2lite', '1'); } catch (e) { }
  const done = () => location.replace(location.pathname + '#visao');
  Promise.all([navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))) : 0, window.caches ? caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))) : 0]).then(done, done);
  return; }
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
const css = `.upd{position:fixed;inset:0;z-index:300;display:grid;place-items:center;background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(14,165,233,.18),transparent 60%),#04101F;color:#EAF6FF;font:500 15px 'Geist',system-ui,sans-serif;animation:updIn .25s ease-out}
.upd .in{display:flex;flex-direction:column;align-items:center;gap:14px;padding:24px;text-align:center;max-width:340px}
.upd .ring{width:54px;height:54px;border-radius:50%;border:3px solid rgba(125,211,252,.2);border-top-color:#38BDF8;animation:updSpin .8s linear infinite}
.upd .ok{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#22D3EE,#3B82F6);box-shadow:0 0 40px rgba(56,189,248,.45);animation:updPop .4s cubic-bezier(.2,1.5,.4,1)}
.upd .ok svg{width:28px;height:28px;fill:none;stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.upd b{font-size:18px;font-weight:600}.upd small{color:#7DD3FC;font:500 12px 'Geist Mono',monospace;letter-spacing:.06em}
.upd ul{margin:4px 0 0;padding:0;list-style:none;color:#A6C3DA;font-size:13.5px;line-height:1.5}.upd li::before{content:"· "}
.upd .bar{width:180px;height:3px;border-radius:3px;background:rgba(125,211,252,.15);overflow:hidden}.upd .bar i{display:block;height:100%;background:#38BDF8;animation:updBar 2.6s linear forwards}
.upd.out{opacity:0;transition:opacity .3s}
@keyframes updSpin{to{transform:rotate(360deg)}}@keyframes updIn{from{opacity:0}}@keyframes updPop{from{transform:scale(.5);opacity:0}}@keyframes updBar{from{width:0}to{width:100%}}`;
const style = () => { if (!document.getElementById('updCss')) { const s = document.createElement('style'); s.id = 'updCss'; s.textContent = css; document.head.appendChild(s); } };
const show = html => { style(); const el = document.createElement('div'); el.className = 'upd'; el.setAttribute('role', 'status'); el.innerHTML = `<div class="in">${html}</div>`; document.body.appendChild(el); return el; };
// 1) chegou uma versão nova enquanto a app estava aberta: ecrã curto e recarrega
window.OceanumUpdating = () => { show('<div class="ring"></div><b>A atualizar o Náutilo…</b><small>versão nova encontrada</small>'); setTimeout(() => location.reload(), 900); };
// 2) primeira abertura de uma versão nova: confirmação
const prev = ls.get(KEY);
if (VER.v && prev !== VER.v) { ls.set(KEY, VER.v);
  if (prev) { const go = () => { const el = show(`<div class="ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><b>Atualizado</b><small>versão ${VER.v} · ${VER.date || ''}</small>${(VER.notes || []).length ? `<ul>${VER.notes.slice(0, 4).map(n => `<li>${String(n).replace(/[<&]/g, c => c === '<' ? '&lt;' : '&amp;')}</li>`).join('')}</ul>` : ''}<div class="bar"><i></i></div>`);
      const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }; el.addEventListener('click', close); setTimeout(close, 2600); };
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', go); else go(); } }
// 3) atualização automática: ao abrir, ao voltar à app e de 10 em 10 minutos compara a versão desta página com a do servidor.
//    Se houver uma mais nova, recarrega logo (a app vem sempre da internet primeiro, por isso o recarregar já traz a nova).
//    Se mesmo assim não vier, apaga a cópia guardada da app (os teus dados ficam) e recarrega. Nunca interrompe um formulário a meio.
const num = v => { const m = String(v || '').match(/^(\d+)\.(\d+)/); return m ? +m[1] * 1000 + +m[2] : 0; };
const note = (t, k) => { try { if (window.OS && OS.UI && OS.UI.toast) OS.UI.toast(t, k); } catch (e) { } };
let checking = false, lastCheck = 0, forcing = false, waitT = 0;
const TK = 'os2updT', tget = () => { try { return JSON.parse(ls.get(TK) || '{}') || {}; } catch (e) { return {}; } };
if (num(VER.v) >= num(tget().v)) ls.set(TK, '{}'); // já estamos na versão pedida
const serverVer = async () => { const r = await fetch(location.pathname + '?vchk=' + Date.now(), { cache: 'no-store', credentials: 'omit' }); if (!r.ok) return ''; const m = (await r.text()).match(/OCEANUM_VERSION=\{"v": *"([^"]+)"/); return m ? m[1] : ''; };
const hard = async () => { if (forcing) return; forcing = true; show('<div class="ring"></div><b>A atualizar o Náutilo…</b><small>versão nova encontrada</small>');
  try { if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); } if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== 'oceanum-img').map(k => caches.delete(k))); } } catch (e) { }
  setTimeout(() => location.reload(), 300); };
// a meio de escrever (campo com texto, formulário aberto): espera
const busy = () => { const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value && a.type !== 'search') return true; const d = document.getElementById('drawer'); return !!(d && !d.hidden && d.querySelector('form, input, textarea')); };
const apply = sv => { if (forcing) return; if (busy()) { clearTimeout(waitT); waitT = setTimeout(() => apply(sv), 20000); return; }
  const t = tget(), n = t.v === sv ? (+t.n || 0) + 1 : 1; ls.set(TK, JSON.stringify({ v: sv, n, at: Date.now() }));
  if (n > 5) return; // algo está mesmo errado: não fica em ciclo (o botão "Procurar atualização" continua a funcionar)
  try { navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => { }); } catch (e) { }
  if (n >= 2) return hard();
  forcing = true; show('<div class="ring"></div><b>A atualizar o Náutilo…</b><small>versão ' + String(sv).replace(/[<&]/g, '') + '</small>'); setTimeout(() => location.reload(), 700); };
window.OceanumCheckUpdate = async manual => { if (checking || forcing) return ''; if (!manual && Date.now() - lastCheck < 15000) return ''; if (!manual && navigator.onLine === false) return 'off'; lastCheck = Date.now(); checking = true;
  try { const sv = await serverVer(); if (!sv || num(sv) <= num(VER.v)) { if (manual) note('Já tens a versão mais recente (' + (VER.v || '') + ').', 'pos'); return 'ok'; }
    if (manual) { ls.set(TK, JSON.stringify({ v: sv, n: 1 })); note('Versão ' + sv + ' encontrada. A atualizar…'); }
    apply(sv); return 'new'; }
  catch (e) { if (manual) note('Sem internet para procurar a atualização agora.', 'warn'); return 'off'; } finally { checking = false; } };
const soon = ms => setTimeout(() => { if (!document.hidden) window.OceanumCheckUpdate(false); }, ms);
addEventListener('load', () => soon(1500));
document.addEventListener('visibilitychange', () => { if (!document.hidden) soon(800); });
addEventListener('pageshow', e => { if (e.persisted) soon(800); });
addEventListener('online', () => soon(1000));
setInterval(() => { if (!document.hidden) window.OceanumCheckUpdate(false); }, 10 * 60000);
// versão visível no ecrã de abertura
addEventListener('DOMContentLoaded', () => { const f = document.querySelector('.sp-foot'); if (f && VER.v) f.textContent = 'MIND CONTROL · v' + VER.v; });
window.OceanumVersion = VER;
})();
