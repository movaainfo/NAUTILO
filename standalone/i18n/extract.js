// Extrai do código todos os textos que aparecem no ecrã (para os traduzir): literais de texto, partes de template literals e concatenações.
// Saída: standalone/i18n/strings.json → { v, s: [textos exatos], p: [modelos com {0},{1}…] }
'use strict';
const ts = require('typescript'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const SKIP = new Set(process.env.I18N_SKIP ? process.env.I18N_SKIP.split(',') : []);
const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js') && !SKIP.has(f)).map(f => path.join(ROOT, 'js', f)).concat([path.join(ROOT, 'index.html')]);
const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", middot: '·', hellip: '…', ndash: '–', mdash: '—', rarr: '→', larr: '←', times: '×', copy: '©', euro: '€', laquo: '«', raquo: '»', deg: '°' };
const dec = s => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] || m));
const EXPR = { e: 1 };
const exact = new Map(), pats = new Map();
// é texto para pessoas? (e não código, classes, seletores, endereços…)
const human = s => { const t = s.replace(/\{\d+\}/g, ' ').trim(); if (t.length < 2) return false; if (!/[A-Za-zÀ-ÿ]{2}/.test(t)) return false;
  if (/^[Mm] ?-?[\d.]/.test(t) || /^[\d\s.,\-MmLlHhVvCcSsQqTtAaZz]+$/.test(t)) return false;                       // caminhos SVG
  const low = (t.match(/[a-zà-ÿ]/g) || []).length, up = (t.match(/[A-ZÀ-Ý0-9]/g) || []).length; if (t.length > 40 && low < up) return false; // listas de códigos
  if (/^(https?:|mailto:|tel:|data:|\/\/|\.\/|#[a-z]|\.[a-z])/i.test(t)) return false;
  if (/[{}]|=>|\$\{|==|&&|\|\||\bfunction\b|\bvar\(|\bcalc\(|\brgba?\(/.test(t)) return false;
  // ";" é código se não vier no meio de uma frase ("…; pois…")
  if (/;/.test(t) && (/=|;\s*$|^[a-z][\w-]*\s*:/.test(t) || !/;\s+[A-Za-zÀ-ÿ"“]/.test(t))) return false;
  if (/^[a-z-]+\s*:\s*[^ ]/.test(t) && /;|px|%|#[0-9a-f]{3}/i.test(t)) return false;           // css (as frases começam por maiúscula: "Premissas: … 5%")
  if (/^\[?[a-z][\w-]*(=|\])/.test(t) || /\[data-[\w-]+/.test(t)) return false;                 // seletores
  if (!/\s/.test(t)) { if (/[À-ÿ]/.test(t)) return true; if (/^[A-ZÁ-Ú][a-zà-ÿ]+$/.test(t)) return true; if (/^[A-ZÁ-Ú][a-zà-ÿ]+[.!?:]$/.test(t)) return true; return false; }
  if (/^[a-z0-9_\-.\/]+( [a-z0-9_\-.\/]+)*$/.test(t) && !/[À-ÿ]/.test(t) && t.split(' ').every(w => /^[a-z][a-z0-9-]*$/.test(w)) && /\b(fa|btn|pn|row|ic|sm|xs|pri|ghost|mut|on|off|act|tab|card|chip|pos|neg|warn|hide|show|flex|grid|nowrap|wrap|gap\d*)\b/.test(t)) return false; // classes
  return true; };
const norm = s => s.replace(/\s+/g, ' ').trim();
const add = (seq, file) => { // seq: array de strings e EXPR; divide em corridas de texto fora das etiquetas HTML
  let inTag = false, q = '', attr = '', run = [], av = null, avName = '';
  const flush = () => { const parts = run; run = []; if (!parts.length) return; let s = '', n = 0; parts.forEach(p => { s += p === EXPR ? '{' + (n++) + '}' : p; });
    s = norm(dec(s)); if (!s) return; if (n === 0) { if (human(s)) exact.set(s, file); return; }
    const lit = s.replace(/\{\d+\}/g, '').trim(); if (!lit) return;
    // "{0} de {1}", "{0} dias", "há {0}": palavras pequenas à volta de valores também são texto
    const small = /^[a-zà-ÿ]{2,}( [a-zà-ÿ]{2,})*$/.test(lit) && /\{\d+\} | \{\d+\}/.test(s);
    if (!small && !human(s)) return;
    // modelo só com {0} e pontuação/símbolos: nada a traduzir
    if (!/[A-Za-zÀ-ÿ]{2}/.test(lit)) return; pats.set(s, file); };
  const flushAttr = () => { if (av && /^(title|placeholder|aria-label|alt|data-tip|label)$/i.test(avName)) { const parts = av; let s = '', n = 0; parts.forEach(p => { s += p === EXPR ? '{' + (n++) + '}' : p; }); s = norm(dec(s)); if (s && human(s)) (n ? pats : exact).set(s, file); } av = null; avName = ''; };
  const hasHtml = seq.some(p => p !== EXPR && /<\/?[a-z][\w-]*[\s>\/]|<\/[a-z]/i.test(p));
  if (!hasHtml) { run = seq.slice(); flush(); return; }
  for (const p of seq) {
    if (p === EXPR) { if (inTag) { if (av) av.push(EXPR); } else run.push(EXPR); continue; }
    for (let i = 0; i < p.length; i++) { const c = p[i];
      if (!inTag) { if (c === '<' && /[a-zA-Z\/!]/.test(p[i + 1] || '')) { flush(); inTag = true; attr = ''; continue; } run.push(c); continue; }
      // dentro de uma etiqueta
      if (q) { if (c === q) { q = ''; flushAttr(); } else if (av) av.push(c); continue; }
      if (c === '"' || c === "'") { q = c; const m = attr.match(/([\w-]+)\s*=\s*$/); avName = m ? m[1] : ''; av = []; attr = ''; continue; }
      if (c === '>') { inTag = false; attr = ''; continue; }
      attr += c; } }
  if (!inTag) flush(); };
// junta strings coladas: "a" + x + "b"
const flat = n => { if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) { const l = flat(n.left), r = flat(n.right); if (l.some(x => x !== EXPR) || r.some(x => x !== EXPR)) return l.concat(r); return [EXPR]; }   // a + b sem texto: um valor só (antes deitava fora a soma inteira)
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return [n.text];
  if (ts.isTemplateExpression(n)) { const out = [n.head.text]; n.templateSpans.forEach(sp => { out.push(EXPR, sp.literal.text); }); return out; }
  if (ts.isParenthesizedExpression(n)) return flat(n.expression);
  return [EXPR]; };
const AICALL = /(\bAI|\bAi|Brain|Gemini|gem)\.?\w*\.(json|text|chat|ask|vision|stream|call)\b|\b(aiJSON|askAI|gemCall|gemModel|freeJSON|aiJson|aiText|callAI|claude)\b/;
const skipCall = n => { // argumentos que não são texto do ecrã
  for (let a = n.parent, k = 0; a && k < 8; a = a.parent, k++) if (ts.isCallExpression(a) && (ts.isIdentifier(a.expression) || ts.isPropertyAccessExpression(a.expression)) && AICALL.test(a.expression.getText())) return true;   // instruções para a IA (só pelo nome da função chamada, não pelo módulo inteiro)
  const p = n.parent; if (!p) return false;
  if (ts.isCallExpression(p) && p.arguments.includes(n)) { const e = p.expression, nm = ts.isPropertyAccessExpression(e) ? e.name.text : ts.isIdentifier(e) ? e.text : '';
    if (/^(querySelector(All)?|getElementById|closest|matches|getAttribute|setAttribute|removeAttribute|addEventListener|removeEventListener|getItem|setItem|removeItem|fetch|require|log|warn|error|debug|startsWith|endsWith|includes|indexOf|split|replace|match|test|RegExp|toLocaleString|toLocaleDateString|toLocaleTimeString|Intl|createElement|getContext|postMessage|importScripts|ic|go|touch)$/.test(nm)) return true;
    // nomes genéricos (OS.add('tasks', …), on('ready', …)…): só o primeiro argumento é uma chave; os outros podem ser texto do ecrã (add('corpo', 2, 'Cumprir …'))
    if (/^(on|emit|off|one|setOne|all|add|upd|del|get|set|has)$/.test(nm) && p.arguments[0] === n) return true; }
  if (ts.isElementAccessExpression(p) && p.argumentExpression === n) return true;
  if (ts.isPropertyAssignment(p) && p.name === n) return !/\s|[À-ÿ]/.test(n.text);   // chaves: só as que são nomes para pessoas ('Fé & Doações', 'preocupado com dinheiro')
  if ((ts.isBinaryExpression(p) && /EqualsEquals|ExclamationEquals/.test(ts.SyntaxKind[p.operatorToken.kind]))) return true;
  if (ts.isCaseClause(p)) return true;
  if (ts.isImportDeclaration(p)) return true;
  return false; };
for (const f of files) {
  const rel = path.relative(ROOT, f); let src = fs.readFileSync(f, 'utf8');
  if (f.endsWith('.html')) { const body = src.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, ''); add([body], rel); continue; }
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const visit = n => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken && !(ts.isBinaryExpression(n.parent) && n.parent.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
      const s = flat(n); if (s && s.some(x => x !== EXPR)) { if (!skipCall(n)) add(s, rel); } // continua para dentro (templates internos)
    } else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) { const p = n.parent; if (!(ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.PlusToken) && !skipCall(n) && !ts.isRegularExpressionLiteral(n)) add([n.text], rel); }
    else if (ts.isTemplateExpression(n)) { const p = n.parent; if (!(ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.PlusToken) && !skipCall(n)) add(flat(n), rel); }
    ts.forEachChild(n, visit); };
  visit(sf); }
const byFile = {}; [...exact.values(), ...pats.values()].forEach(f => byFile[f] = (byFile[f] || 0) + 1);
// ordem: primeiro o que se vê mais (menus, ecrãs principais), por fim os catálogos grandes (alimentos, exercícios…)
const LAST = /^(js\/)?(foodsdb|foodcat|exlib|brands|fastfood|faithdata|quotes|ilhas|mundo|monstros|adventures|me|legal|dominus3)\.js$/, FIRST = /^(index\.html|js\/(app|ui|core|conta|lock|onboard|fundos|lingua|pais|views-core|data|intel|dash)\.js)$/;
const rank = f => FIRST.test(f) ? 0 : LAST.test(f) ? 2 : 1;
const ord = m => [...m.keys()].sort((a, b) => rank(m.get(a)) - rank(m.get(b)) || (a < b ? -1 : a > b ? 1 : 0));
const out = { s: ord(exact), p: ord(pats) };
const crypto = require('crypto'); out.v = crypto.createHash('sha1').update(JSON.stringify(out)).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(__dirname, 'strings.json'), JSON.stringify(out));
if (process.argv.includes('--stats')) { console.log('exatos', out.s.length, 'modelos', out.p.length, 'chars', [...out.s, ...out.p].join('').length); console.log(Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 40).map(x => x.join(' ')).join('\n')); }
