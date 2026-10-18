/* NÁUTILO — escudo contra código malicioso (XSS).
   Todo o HTML que a app põe na página passa por aqui: scripts, atributos on…= (exceto os poucos da própria app),
   links javascript:, iframes estranhos e objetos são removidos antes de chegarem ao ecrã.
   Assim, mesmo que um texto vindo de um e-mail, notícia, IA, sincronização ou campo mal escapado traga código, ele não corre. */
(() => {
'use strict';
const XH = 'http://www.w3.org/1999/xhtml', P = Element.prototype, dIn = Object.getOwnPropertyDescriptor(P, 'innerHTML'), dOut = Object.getOwnPropertyDescriptor(P, 'outerHTML'), iAdj = P.insertAdjacentHTML;
if (!dIn || !dIn.set || window.__ocSafe) return; window.__ocSafe = 1;
// os únicos atributos on…= que a própria app usa (inofensivos)
const OK_ON = new Set(['this.remove()', 'this.select()', 'window.print()', "this.parentNode.classList.add('noimg');this.remove()"]);
const RISK = /<\s*(script|iframe|object|embed|base|meta|link|frame)\b|\son[a-z]+\s*=|javascript:|vbscript:|srcdoc|data:text\/html/i;
const BAD_TAG = new Set(['script', 'object', 'embed', 'base', 'meta', 'link', 'frame', 'frameset', 'applet']);
const URL_ATTR = /^(href|src|action|formaction|xlink:href|data|poster|background|lowsrc|ping)$/;
const badUrl = v => /^(javascript|vbscript|data:text\/html|data:application)/i.test(String(v).replace(/[\u0000- \u007f- ]+/g, ''));
const YT = /^https:\/\/(www\.)?(youtube-nocookie\.com|youtube\.com)\/embed\//;
const scrub = root => { for (const el of root.querySelectorAll('*')) { const tag = el.localName;
    if (BAD_TAG.has(tag)) { el.remove(); continue; }
    if (tag === 'iframe') { if (el.classList.contains('ml-fr')) { el.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox'); el.removeAttribute('src'); } else if (!YT.test(el.getAttribute('src') || '')) { el.remove(); continue; } else el.removeAttribute('srcdoc'); }
    if (tag === 'form') { el.removeAttribute('action'); el.removeAttribute('target'); }
    for (const a of Array.from(el.attributes)) { const n = a.name.toLowerCase();
      if (n.startsWith('on')) { if (!OK_ON.has(a.value.trim())) el.removeAttribute(a.name); }
      else if (URL_ATTR.test(n) && badUrl(a.value)) el.removeAttribute(a.name);
      else if (n === 'srcdoc' && !(tag === 'iframe' && el.classList.contains('ml-fr'))) el.removeAttribute(a.name);
      else if (n === 'formaction') el.removeAttribute(a.name); } } };
const tpl = document.createElement('template'), RAW = /^(textarea|title|style|xmp|noscript|noembed|noframes|plaintext)$/;
// devolve um fragmento já limpo (para HTML) ou o texto limpo (para SVG/strings)
const frag = html => { dIn.set.call(tpl, html); scrub(tpl.content); return tpl.content; };
const cleanStr = html => { const f = frag(html), d = document.createElement('div'); d.appendChild(f); return dIn.get.call(d); };
const svgClean = html => String(html).replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '').replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '');
const SAFE = window.OceanumSafe = { clean: h => (typeof h === 'string' && RISK.test(h) ? cleanStr(h) : h), scrub };
Object.defineProperty(P, 'innerHTML', { configurable: true, enumerable: dIn.enumerable, get() { return dIn.get.call(this); },
  set(h) { if (typeof h !== 'string' || !RISK.test(h) || this === tpl || RAW.test(this.localName)) return dIn.set.call(this, h);
    if (this.namespaceURI !== XH) return dIn.set.call(this, svgClean(h));
    if (this.localName === 'template') { dIn.set.call(this, h); scrub(this.content); return; }
    const f = frag(h); dIn.set.call(this, ''); this.appendChild(f); } });
if (dOut && dOut.set) Object.defineProperty(P, 'outerHTML', { configurable: true, enumerable: dOut.enumerable, get() { return dOut.get.call(this); }, set(h) { dOut.set.call(this, typeof h === 'string' && RISK.test(h) ? (this.namespaceURI !== XH ? svgClean(h) : cleanStr(h)) : h); } });
P.insertAdjacentHTML = function (pos, h) { return iAdj.call(this, pos, typeof h === 'string' && RISK.test(h) ? (this.namespaceURI !== XH ? svgClean(h) : cleanStr(h)) : h); };
// imagens de capas de livros que falham: troca por um cartão com o título (sem código dentro do HTML)
document.addEventListener('error', e => { const t = e.target; if (!t || t.tagName !== 'IMG' || !t.dataset || t.dataset.fbt == null) return; const d = document.createElement('div'); d.className = t.dataset.fbc || 'bk-cv bk-cv0'; d.textContent = t.dataset.fbt; t.replaceWith(d); }, true);
void SAFE;
})();
