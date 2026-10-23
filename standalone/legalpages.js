// NÁUTILO · páginas públicas dos documentos legais (para o Google, lojas e links): os mesmos textos de js/legal.js,
// cada um com endereço próprio (/privacidade, /termos, /cookies, /direitos, /acessibilidade, /creditos).
// Uso: node standalone/legalpages.js <pasta de saída>
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const out = process.argv[2] || 'dist-gh', src = fs.readFileSync(path.join(__dirname, '..', 'js', 'legal.js'), 'utf8');
const OS = { on: () => { }, act: {}, forms: {} };
const ctx = { OS, document: { addEventListener: () => { }, baseURI: 'https://nautilo-app.vercel.app/' }, fetch: () => Promise.reject(new Error('sem rede')), URL, console };
vm.createContext(ctx); vm.runInContext(src, ctx);
const L = OS.Legal, links = L.DOCS.map(([k, t]) => `<a href="/${k}">${t}</a>`).join('');
const page = (k, t) => `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t} · Náutilo</title>
<meta name="description" content="${t} do Náutilo."><link rel="icon" href="/icon-192.png">
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#070D16;color:#C9D2DD;font:15.5px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{border-bottom:1px solid rgba(170,195,225,.14);padding:18px 16px}header .w{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{color:#F1F4F8;text-decoration:none;font:500 24px/1 Georgia,"Times New Roman",serif}.w{max-width:820px;margin:0 auto}
nav{display:flex;flex-wrap:wrap;gap:6px}nav a{color:#A9B6C6;border:1px solid rgba(170,195,225,.2);border-radius:999px;padding:6px 11px;font-size:13px;text-decoration:none}nav a[aria-current]{color:#F5E2C8;border-color:rgba(242,196,141,.55);background:rgba(242,196,141,.12)}
main{padding:28px 16px 64px}h1{font:italic 500 38px/1.1 Georgia,"Times New Roman",serif;color:#F1F4F8;margin:0 0 6px}section{max-width:70ch;margin:0 0 22px}
h3{color:#F1F4F8;font-size:16px;margin:0 0 6px}a{color:#F2C48D}ul{padding-left:20px}li{margin:0 0 4px}.lg-meta{font-size:13px;color:#7A8BA0}
table{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 12px}th,td{text-align:left;vertical-align:top;padding:9px 8px;border-top:1px solid rgba(170,195,225,.14)}th{color:#A9B6C6;font-size:12.5px}
@media (max-width:620px){thead{display:none}tr{display:block;padding:8px 0;border-top:1px solid rgba(170,195,225,.14)}td{display:block;border:0;padding:2px 0}td[data-l]::before{content:attr(data-l) ": ";color:#7A8BA0;font-weight:600}}
a:focus-visible{outline:2px solid #F2C48D;outline-offset:2px}footer{max-width:820px;margin:0 auto;padding:0 16px 40px;font-size:13px;color:#7A8BA0}</style></head>
<body><header><div class="w"><a class="brand" href="/">Náutilo</a><nav aria-label="Documentos">${links.replace(`href="/${k}"`, `href="/${k}" aria-current="page"`)}</nav></div></header>
<main><div class="w"><h1>${t}</h1>${L.html(k).replace(/<a href="#" data-lgl="([a-z]+)">/g, '<a href="/$1">').replace(/ em Definições › Privacidade e termos/g, ' na app, em Definições › Privacidade e termos')}</div></main>
<footer>Náutilo · <a href="/">Abrir a app</a></footer></body></html>`;
L.DOCS.forEach(([k, t]) => fs.writeFileSync(path.join(out, k + '.html'), page(k, t)));
console.log('páginas legais:', L.DOCS.map(d => '/' + d[0]).join(' '));
