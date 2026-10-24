/* PRUMO — movimento: o app mais vivo, sem pesar.
   - ao abrir uma página, os blocos entram em cascata e as barras enchem;
   - os números grandes (saldos, médias, totais) contam até ao valor;
   - ao tocar num botão ele afunda um pouco, e o que mudou dá um pequeno salto quando a página se redesenha;
   - avisos e janelas entram a deslizar.
   Só animações curtas (nada que fique a mexer para sempre dentro do app) e só com opacidade e deslocações, para o iPhone e os tablets.
   Definições › Aplicação › Animações: completas, suaves (só as entradas) ou desligadas. Respeita "reduzir movimento" do aparelho. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act;
const K = 'os2anim';
const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
// (nos testes automáticos fica desligado, salvo se o teste o ligar, para os números não estarem a meio da contagem)
const mode = () => { const v = U.ls.get(K, null); if (v === 'off' || v === 'soft' || v === 'full') return v; return reduce() || navigator.webdriver ? 'off' : 'full'; };
const apply = () => { const R = document.documentElement, m = mode(); R.classList.toggle('vv', m !== 'off'); R.classList.toggle('vv-full', m === 'full'); if (m === 'off') { const v = document.getElementById('view'); if (v) v.classList.remove('pg-in'); } };
apply();
const V = OS.Vivo = { mode, set: v => { U.ls.set(K, v); apply(); OS.request && OS.request(); } };

/* ---------- entrada de página ---------- */
const view = () => document.getElementById('view');
let lastR = null, tIn = 0;
const enter = () => { const v = view(); if (!v) return; if (mode() === 'off') { v.classList.remove('pg-in'); return; }
  v.classList.remove('pg-in'); void v.offsetWidth; v.classList.add('pg-in');
  clearTimeout(tIn); tIn = setTimeout(() => v.classList.remove('pg-in'), 1300);
  if (mode() === 'full') requestAnimationFrame(() => countUp(v)); };

/* ---------- números a contar ---------- */
const dec = () => { try { return (1.5).toLocaleString(OS.loc ? OS.loc() : 'pt-PT').charAt(1); } catch (e) { return ','; } };
const ease = t => 1 - Math.pow(1 - t, 3);
const countUp = root => { const D = dec(), loc = OS.loc ? OS.loc() : 'pt-PT'; let n = 0;
  root.querySelectorAll('.kpi-v, .big-num, .dc-big, .fin-big, .vv-n').forEach(el => {
    if (n >= 18 || el.children.length > 1 || el.closest('[data-novv]')) return;
    const txt = el.firstChild && el.firstChild.nodeType === 3 && el.childNodes.length === 1 ? el.firstChild : null; if (!txt) return;
    const t = txt.data, m = t.match(/[−-]?\d[\d   .,']*\d|[−-]?\d/); if (!m) return;
    const raw = m[0], neg = /^[−-]/.test(raw), body = raw.replace(/^[−-]/, ''), li = body.lastIndexOf(D), hasDec = li >= 0 && /^\d{1,2}$/.test(body.slice(li + 1));
    const digits = body.replace(/[^\d]/g, ''), d = hasDec ? body.length - li - 1 : 0, v = (neg ? -1 : 1) * (+digits) / Math.pow(10, d);
    if (!isFinite(v) || Math.abs(v) < 3 || digits.length > 12 || /\d{4}-\d{2}|:\d{2}|\d\/\d/.test(t)) return;   // datas e horas não
    if (!hasDec && v >= 1900 && v <= 2100 && !/[\u00a0\u202f .,']/.test(body)) return;   // anos (2026) também não
    const grouped = /[   .,']/.test(hasDec ? body.slice(0, li) : body), pre = t.slice(0, m.index), post = t.slice(m.index + raw.length);
    const fmt = x => { let s = Math.abs(x).toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: grouped }); return (x < 0 || neg ? (raw[0] === '−' ? '−' : '-') : '') + s; };
    n++; const t0 = performance.now(), dur = 650 + Math.min(500, Math.log10(Math.abs(v) + 1) * 120);
    const step = now => { if (!txt.isConnected || (txt._vv && txt._vv !== t0)) return; const k = Math.min(1, (now - t0) / dur);
      if (k >= 1) { txt.data = t; return; } txt.data = pre + fmt(v * ease(k)) + post; requestAnimationFrame(step); };
    txt._vv = t0; txt.data = pre + fmt(0) + post; requestAnimationFrame(step); }); };

/* ---------- toque e o que acabou de mudar ---------- */
let hit = null;
const keyOf = b => { for (const a of ['data-act', 'data-edit', 'data-go', 'data-oc', 'data-om', 'data-oa']) if (b.hasAttribute(a)) { let s = `[${a}="${CSS.escape(b.getAttribute(a))}"]`;
    for (const x of ['data-id', 'data-v', 'data-k', 'data-d', 'data-i', 'data-h']) if (b.hasAttribute(x)) s += `[${x}="${CSS.escape(b.getAttribute(x))}"]`; return s; } return null; };
document.addEventListener('pointerdown', e => { if (mode() === 'off') return; const b = e.target.closest && e.target.closest('button,.btn,.chip,[data-act],[data-edit],[data-go],a.click,.li.click'); if (!b) return; b.classList.add('vv-press'); setTimeout(() => b.classList.remove('vv-press'), 220); }, { passive: true, capture: true });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-act],[data-edit],[data-go],[data-oc],[data-om],[data-oa]'); if (!b) return; const k = keyOf(b); if (k) hit = { k, at: Date.now() }; }, true);
const popAfter = root => { if (!hit || Date.now() - hit.at > 1000 || mode() === 'off') return; const el = root.querySelector(hit.k); hit = null; if (!el) return; el.classList.add('vv-pop'); setTimeout(() => el.classList.remove('vv-pop'), 520); };

/* ---------- vigiar o ecrã ---------- */
const start = () => { const v = view(); if (!v) return setTimeout(start, 300);
  new MutationObserver(() => { const r = location.hash.split('?')[0]; if (r !== lastR) { lastR = r; enter(); } else popAfter(v); }).observe(v, { childList: true });
  const m = document.getElementById('modal'); if (m) new MutationObserver(() => { if (!m.hidden && mode() !== 'off') { const d = m.querySelector('.modal'); if (d && !d._vv) { d._vv = 1; d.classList.add('vv-modal'); } } }).observe(m, { childList: true, attributes: true, attributeFilter: ['hidden'] }); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
OS.on && OS.on('unlock', () => { lastR = null; });

/* ---------- Definições › Aplicação ---------- */
A.vivoSet = b => { V.set(b.dataset.v); UI.toast(b.dataset.v === 'off' ? 'Animações desligadas' : 'Animações ' + (b.dataset.v === 'full' ? 'completas' : 'suaves'), 'pos'); };
OS.on && OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._vv) return; OS.views.definicoes = sub => o(sub) + (String(sub || '') === '' ? `<div class="pn" id="animSet"><div class="pn-h"><h3>${UI.ic('sun')}Animações</h3><span class="mut" style="font-size:12px">${{ full: 'completas', soft: 'suaves', off: 'desligadas' }[mode()]}</span></div>
  <p class="mut" style="margin:0 0 10px">Páginas que entram com movimento, números que contam até ao valor, barras que enchem e botões que respondem ao toque. Leves: não gastam bateria.${reduce() ? ' O teu aparelho pede menos movimento, por isso começam desligadas.' : ''}</p>
  <div class="seg" role="group">${[['full', 'Completas'], ['soft', 'Suaves'], ['off', 'Desligadas']].map(([v, l]) => `<button class="${mode() === v ? 'on' : ''}" data-act="vivoSet" data-v="${v}">${l}</button>`).join('')}</div></div>` : ''); OS.views.definicoes._vv = 1; });
})();
