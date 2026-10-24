// gera os dicionários das línguas no servidor ao vivo (api/lingua) e guarda-os em standalone/i18n/packs/<l>.json
// uso: depois de publicar a lista dos textos (i18n/strings.json) → node standalone/i18n/packgen.js (LANGS=pt-BR,en… SITE=…) → python3 standalone/i18n/packfix.py
// cria uma conta temporária para pedir as traduções e apaga-a no fim
const fs = require('fs'), crypto = require('crypto');
const SITE = (process.env.SITE || 'https://prumo-vida.vercel.app').replace(/\/$/, '') + '/';
const LANGS = (process.env.LANGS || 'pt-BR,en,es,fr,it,de').split(',');
const OUT = require('path').join(__dirname, 'packs');
const H = { 'content-type': 'application/json', origin: SITE.replace(/\/$/, '') };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const post = async (p, body, tok) => { const r = await fetch(SITE + p, { method: 'POST', headers: Object.assign({}, H, tok ? { authorization: 'Bearer ' + tok } : {}), body: JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch (e) { } return { s: r.status, j }; };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const TV = (fs.readFileSync(require('path').join(__dirname, '../../js/legal.js'), 'utf8').match(/V: '([\d-]+)'/) || [])[1];
  const email = 'lingua-' + crypto.randomBytes(5).toString('hex') + '@nautilo.test', senha = 'L' + crypto.randomBytes(9).toString('hex');
  const reg = await post('api/conta', { op: 'registar', email, senha, termos: TV, saude: true, idade: true }); if (!reg.j || !reg.j.token) { console.log('registo falhou', reg.s, reg.j); process.exit(1); }
  const tok = reg.j.token; console.log('conta temporária criada');
  try {
    await Promise.all(LANGS.map(async (l, k) => { await sleep(k * 2500); let last = 0, fails = 0;
      for (let i = 0; i < 600; i++) { const { s, j } = await post('api/lingua', { op: 'preparar', l }, tok);
        if (!j || !j.ok) { fails++; if (fails % 5 === 1) console.log(l, 'espera', s, j && j.msg); await sleep(s === 429 ? 30000 : 15000); continue; }
        if (j.ocupado) { await sleep(5000); continue; }
        if (j.feito - last >= 1500 || j.completo) { console.log(l, j.feito + '/' + j.total, j.completo ? 'COMPLETO' : ''); last = j.feito; }
        if (j.completo) break; await sleep(300); }
      const r = await fetch(SITE + 'api/lingua?l=' + encodeURIComponent(l) + '&_=' + Date.now(), { headers: H }); const g = await r.json();
      fs.writeFileSync(OUT + '/' + l + '.json', JSON.stringify({ v: g.v, l, completo: g.completo, m: g.m })); console.log(l, 'guardado', Object.keys(g.m || {}).length, 'textos', g.completo ? '(completo)' : '(INCOMPLETO)'); }));
  } finally { const d = await post('api/conta', { op: 'apagar', senha }, tok); console.log('conta temporária apagada', d.s); }
})().catch(e => { console.log('ERRO', e.message); process.exit(1); });
