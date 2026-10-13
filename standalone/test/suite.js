/* Oceanum — bateria de testes rigorosa.
   Serve dist-gh/ em /Oceanum/ (igual ao GitHub Pages) e testa em 5 aparelhos simulados.
   Uso: NODE_PATH=$(npm root -g) node standalone/test/suite.js            (todos)
        ... suite.js --quick                                              (sem stress nem crawl completo)
        ... suite.js --only=areas,novidades                              (só alguns blocos: perfis, geral, areas, novidades, aparelhos, stress) */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), url = require('url');
const ROOT = path.resolve(__dirname, '../../dist-gh');
const QUICK = process.argv.includes('--quick');
const PORT = 8781, BASE = `http://localhost:${PORT}/Oceanum/`;
const CODE = 'teste1234', HASH = crypto.createHash('sha256').update('oceanum-v1|' + CODE).digest('hex');
let OVERRIDE = {}; // ficheiros substituídos (teste de atualização)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.json': 'application/json', '.md': 'text/plain', '.glb': 'model/gltf-binary' };
let OFFLINE = false, GSFAIL = 0, SLOWIDX = 0, FAILP = '';
// os mesmos cabeçalhos de segurança do Vercel (CSP incluída), para os testes apanharem o que ela bloquearia; o Apps Script simulado está em http://127.0.0.1
const SECH = (() => { try { const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')), all = v.headers.find(h => h.source === '/(.*)'), o = {}; all.headers.forEach(h => { o[h.key] = h.key === 'Content-Security-Policy' ? h.value.replace("connect-src 'self'", `connect-src 'self' http://127.0.0.1:${PORT}`) : h.value; }); delete o['Strict-Transport-Security']; return o; } catch (e) { return {}; } })();
// servidor estático + caixa de entrada simulada (Apps Script)
const INBOX = [], STORE = {};
const srv = http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  if (u.pathname === '/gs') { // simula o Apps Script
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      const q = Object.assign({}, u.query, Object.fromEntries(new URLSearchParams(body)));
      const out = (o, t) => { res.writeHead(200, { 'Content-Type': t ? 'text/plain' : 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(t ? o : JSON.stringify(o)); };
      if (GSFAIL > 0 && q.op === 'pull') { GSFAIL--; res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }); return res.end('<html>Sorry, unable to open the file at this time.</html>'); }
      if (q.k !== 'KEY_T') return out({ ok: false, msg: 'Chave errada' });
      if (q.op === 'ping') return out({ ok: true, v: 3 });
      if (q.op === 'list') { const m = {}; Object.keys(STORE).forEach(id => m[id] = STORE[id].t || 0); return out({ ok: true, docs: m }); }
      if (q.op === 'get') { const ids = String(q.ids || '').split(',').filter(String), o = {}; (ids.length ? ids : Object.keys(STORE)).forEach(id => { if (STORE[id]) o[id] = STORE[id]; }); return out({ ok: true, docs: o }); }
      if (q.op === 'put') { Object.assign(STORE, JSON.parse(q.j)); return out({ ok: true }); }
      if (q.op === 'pull') { const now = Date.now(), it = INBOX.filter(r => !r.done && !(r.res && now - r.res < 600000)); it.forEach(r => r.res = now); return out({ ok: true, items: it }); }
      if (q.op === 'ack') { const ids = String(q.ids || '').split(','); INBOX.forEach(r => { if (ids.includes(r.id)) r.done = 1; }); return out({ ok: true }); }
      const v = Number(String(q.v || '').replace(/[^0-9,.-]/g, '').replace(',', '.')); if (!(v > 0)) return out({ ok: false, msg: 'Valor inválido' });
      INBOX.push({ id: crypto.randomUUID(), t: new Date().toISOString(), v, d: q.d || '', c: q.c || '' }); out('✓ registado', 1); });
    return; }
  if (OFFLINE) { req.socket.destroy(); return; }
  let p = decodeURIComponent(u.pathname);
  if (!p.startsWith('/Oceanum/')) { res.writeHead(404); return res.end(); }
  p = p.slice('/Oceanum/'.length) || 'index.html';
  if (FAILP && FAILP === p) { res.writeHead(500); return res.end('erro'); }
  const file = OVERRIDE[p] || path.join(ROOT, p);
  setTimeout(() => fs.readFile(file, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, Object.assign({}, SECH, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' })); res.end(d); }), SLOWIDX && p === 'index.html' && !u.query.vchk ? SLOWIDX : 0);
});

const PROFILES = [
  { id: 'iPhone', o: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' } },
  { id: 'Android tel', o: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' } },
  { id: 'Tablet horiz', o: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' }, slow: 6 },
  { id: 'Tablet vert', o: { viewport: { width: 800, height: 1280 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' } },
  { id: 'Computador', o: { viewport: { width: 1440, height: 900 } } }];

const R = []; let cur = '';
const ok = (name, pass, info = '') => { R.push({ p: cur, name, pass, info }); console.log(`${pass ? '  ✓' : '  ✗'} [${cur}] ${name}${info ? ' — ' + info : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function newPage(b, prof, init = {}) {
  const ctx = await b.newContext(prof.o); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('JS: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource|ERR_INTERNET|ERR_CONNECTION/.test(m.text())) errs.push('consola: ' + m.text().slice(0, 160)); });
  p.on('dialog', d => d.dismiss());
  await p.addInitScript(([HASH, init]) => {
    if (!localStorage.getItem('__seeded')) { localStorage.setItem('os2:one~security', JSON.stringify({ data: { hash: HASH } })); Object.entries(init).forEach(([k, v]) => localStorage.setItem(k, v)); localStorage.setItem('__seeded', '1'); }
    window.__cred = 0; try { Object.defineProperty(navigator, 'credentials', { value: { get: () => { window.__cred++; return new Promise(() => { }); }, create: () => new Promise(() => { }) } }); } catch (e) { }
    window.PublicKeyCredential = window.PublicKeyCredential || { isUserVerifyingPlatformAuthenticatorAvailable: async () => true };
  }, [HASH, init]);
  if (prof.slow) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.slow }); }
  return { ctx, p, errs };
}
const unlock = async p => { await p.waitForFunction(() => document.getElementById('lkCode') || (document.querySelector('#view') && document.querySelector('#view').innerText.trim().length > 30), null, { timeout: 8000 }); if (!(await p.$('#lkCode')) || !(await p.isVisible('#lkCode'))) return; await p.fill('#lkCode', CODE); await p.click('.lk-go'); await p.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').innerText.trim().length > 30, null, { timeout: 8000 }); };
const E = (p, f, a) => p.evaluate(f, a);

async function profileTests(b, prof) {
  cur = prof.id; console.log(`\n=== ${prof.id} ===`);
  const { ctx, p, errs } = await newPage(b, prof, { os2bio: JSON.stringify({ id: 'AAAA', at: '2026-10-01' }) });
  // A · arranque e ecrã do código
  const t0 = Date.now(); await p.goto(BASE); await p.waitForSelector('#lkCode'); const tl = Date.now() - t0;
  ok('abre o ecrã do código', true, tl + ' ms');
  ok('versão visível no ecrã do código', await E(p, () => /v\d+\.\d+/.test(document.querySelector('.sp-foot').textContent)), await E(p, () => document.querySelector('.sp-foot').textContent));
  await sleep(1500); ok('sem pedido biométrico em modo de teste', (await E(p, () => window.__cred)) === 0);
  const inp = await E(p, () => { const i = document.getElementById('lkCode'), cs = getComputedStyle(i); return { t: i.type, sec: cs.webkitTextSecurity, bg: cs.backgroundColor, ac: i.autocomplete }; });
  ok('campo do código sem gestor de palavras-passe', inp.t === 'text' && inp.sec === 'disc' && inp.ac === 'off', JSON.stringify(inp));
  const android = /Android/.test(prof.o.userAgent || '');
  ok('modo leve ' + (android ? 'ligado (Android)' : 'conforme o aparelho'), android ? await E(p, () => document.documentElement.classList.contains('lite')) : true);
  await p.fill('#lkCode', 'errado'); await p.click('.lk-go'); await sleep(400); ok('código errado é recusado', /incorreto/i.test(await E(p, () => document.getElementById('lkMsg').textContent)));
  await unlock(p); ok('código certo abre a Visão Geral', await E(p, () => !!document.querySelector('.dash')));
  // P · leveza
  const heavy = await E(p, () => { let inf = 0, bf = 0; document.querySelectorAll('*').forEach(el => { const cs = getComputedStyle(el); if (cs.animationName !== 'none' && cs.animationIterationCount === 'infinite') inf++; if (cs.backdropFilter && cs.backdropFilter !== 'none') bf++; }); return { inf, bf, fixedBg: getComputedStyle(document.body).backgroundAttachment }; });
  ok('sem animações infinitas nem desfoque de fundo', heavy.inf === 0 && heavy.bf === 0 && heavy.fixedBg !== 'fixed', JSON.stringify(heavy));
  // C · não se redesenha sozinho
  await E(p, () => { window.__r = 0; OS.on('render', () => window.__r++); }); await sleep(4000); const idle = await E(p, () => window.__r);
  ok('parado não se redesenha (Visão Geral)', idle === 0, idle + ' renders em 4 s');
  // B · todas as páginas e separadores
  const base = await E(p, () => Object.keys(OS.views)); let routes = [];
  for (const r of base) { await E(p, r => location.hash = r, r); await sleep(150); routes.push(r, ...(await E(p, () => [...document.querySelectorAll('#view nav.tabs a, #view .dtabs a[href^="#"]')].map(a => a.getAttribute('href').slice(1))))); }
  routes = [...new Set(routes)];
  const bad = [], ovf = [], slow = []; let maxT = 0;
  for (const r of routes) { const t = await E(p, async r => { const t0 = performance.now(); location.hash = r; await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); return performance.now() - t0; }, r); maxT = Math.max(maxT, t); if (t > (prof.slow ? 900 : 250)) slow.push(r + ' ' + Math.round(t) + 'ms');
    const s = await E(p, () => { const v = document.querySelector('#view'), tx = v.innerText.trim(); document.querySelectorAll('.ceremony').forEach(e => e.remove()); return { len: tx.length, err: tx.includes('Não foi possível'), ov: document.documentElement.scrollWidth > innerWidth + 1 }; });
    if (s.len < 30 || s.err) bad.push(r); if (s.ov) ovf.push(r); }
  ok(`${routes.length} páginas abrem com conteúdo`, !bad.length, bad.join(', '));
  ok('nada sai para o lado', !ovf.length, ovf.join(', '));
  ok('páginas rápidas' + (prof.slow ? ' (processador 6× mais lento)' : ''), !slow.length, slow.length ? slow.join(', ') : 'máx ' + Math.round(maxT) + ' ms');
  // D · carregar nos botões
  const SKIP = 'wipe|lockNow|[Dd]el|remove|[Rr]eset|[Aa]bort|navOpen|cmdOpen|focusStart|focusEnd|exportData|bioRegister|bioForget|cloud|qgStart|dStart|liteSet|ibSave|ibRound|ibCopy|gcal';
  let clicks = 0; const cErr0 = errs.length;
  for (const r of (QUICK ? routes.slice(0, 12) : routes)) { await E(p, r => location.hash = r, r); await sleep(120);
    const n = await E(p, SK => [...document.querySelectorAll('#view [data-act]')].filter(x => !new RegExp(SK).test(x.dataset.act) && x.offsetParent).length, SKIP);
    for (let i = 0; i < Math.min(n, 12); i++) { const a = await E(p, ([i, SK]) => { const els = [...document.querySelectorAll('#view [data-act]')].filter(x => !new RegExp(SK).test(x.dataset.act) && x.offsetParent); const el = els[i]; if (!el) return null; el.click(); return el.dataset.act; }, [i, SKIP]); if (!a) break; clicks++; await sleep(60);
      await E(p, () => { document.querySelectorAll('.ceremony').forEach(e => e.remove()); if (!document.getElementById('drawer').hidden) OS.UI.closeDrawer(); const m = document.getElementById('modal'); if (!m.hidden) { m.hidden = true; m.innerHTML = ''; } document.body.classList.remove('nav-open', 'noscroll'); });
      if ((await E(p, () => location.hash.slice(1))) !== r) { await E(p, r => location.hash = r, r); await sleep(100); } } }
  ok(`${clicks} botões carregados sem erro`, errs.length === cErr0, errs.slice(cErr0, cErr0 + 3).join(' | '));
  // F · scroll preso com painéis
  await E(p, () => { location.hash = 'financas'; }); await sleep(300); await E(p, () => scrollTo(0, 300));
  await E(p, () => document.body.classList.add('nav-open')); await sleep(100);
  const lock1 = await E(p, () => document.body.style.position === 'fixed');
  await E(p, () => document.body.classList.remove('nav-open')); await sleep(100);
  const lock2 = await E(p, () => document.body.style.position === '' && Math.abs(scrollY - 300) < 40 || document.documentElement.scrollHeight <= innerHeight + 300);
  ok('com o menu aberto só o menu rola', lock1 && lock2);
  await E(p, () => OS.UI.openForm('transactions')); await sleep(150); const lock3 = await E(p, () => document.body.style.position === 'fixed'); await E(p, () => OS.UI.closeDrawer()); await sleep(100);
  ok('com um formulário aberto a página de trás não rola', lock3 && await E(p, () => document.body.style.position === ''));
  // G · rodar o ecrã
  if (prof.o.isMobile) { const vp = prof.o.viewport; const e0 = errs.length; let ov = 0;
    for (let i = 0; i < 8; i++) { await p.setViewportSize(i % 2 ? vp : { width: vp.height, height: vp.width }); await sleep(150); for (const r of ['visao', 'treino.mapa', 'dominus', 'dieta']) { await E(p, r => location.hash = r, r); await sleep(80); if (await E(p, () => document.documentElement.scrollWidth > innerWidth + 1)) ov++; } }
    await p.setViewportSize(vp); ok('rodar o ecrã 8 vezes', errs.length === e0 && !ov, ov ? ov + ' páginas a sair para o lado' : ''); }
  // H · fugas de memória
  const h0 = await E(p, () => (performance.memory || {}).usedJSHeapSize || 0);
  for (let i = 0; i < (QUICK ? 60 : 200); i++) await E(p, r => location.hash = r, routes[i % routes.length]);
  await sleep(500); const mem = await E(p, () => ({ h: (performance.memory || {}).usedJSHeapSize || 0, dom: document.getElementsByTagName('*').length, ch: document.querySelectorAll('.ceremony,.upd').length }));
  ok('sem fugas de memória (200 mudanças de página)', (mem.h - h0) < 40e6 && mem.dom < 6000, `heap +${Math.round((mem.h - h0) / 1e6)} MB · ${mem.dom} elementos`);
  ok('sem erros de JavaScript nesta sessão', !errs.length, errs.slice(0, 3).join(' | '));
  await ctx.close();
}

async function sharedTests(b) {
  cur = 'Geral'; console.log('\n=== Testes gerais (iPhone) ===');
  const prof = PROFILES[0];
  // E · formulários
  { const { ctx, p, errs } = await newPage(b, prof); await p.goto(BASE); await unlock(p);
    const colls = await E(p, () => Object.keys(OS.S)), fail = [];
    for (const c of colls) { const before = await E(p, c => OS.all(c).length, c); await E(p, c => OS.UI.openForm(c), c); await sleep(120);
      await E(p, () => { const f = document.querySelector('#drawer form'); if (!f) return; f.querySelectorAll('[required]').forEach(el => { if (el.value) return; if (el.tagName === 'SELECT') { const o = [...el.options].find(o => o.value); if (o) el.value = o.value; } else if (el.type === 'date') el.value = OS.U.today(); else if (el.type === 'number') el.value = '10'; else if (el.type === 'time') el.value = '10:00'; else el.value = el.name === 'time' ? '25:00' : 'Teste'; }); f.requestSubmit(); });
      await sleep(200); if ((await E(p, c => OS.all(c).length, c)) <= before) fail.push(c); await E(p, () => { if (!document.getElementById('drawer').hidden) OS.UI.closeDrawer(); }); }
    ok(`os ${colls.length} formulários gravam`, !fail.length, fail.join(', '));
    // I · guardar e recarregar, exportar e importar
    await E(p, () => location.hash = 'gasto'); await sleep(300); await p.fill('.qg-amt input', '12,34'.replace(',', '.')); await p.fill('.qg-desc', 'Teste persistência'); await p.click('.qg-go'); await sleep(900);
    await p.reload(); await unlock(p); ok('gasto rápido fica guardado depois de recarregar', await E(p, () => OS.all('transactions').some(t => t.desc === 'Teste persistência' && t.amount === 12.34)));
    const exp = await E(p, () => JSON.stringify(OS.exportAll())); const n0 = await E(p, () => OS.all('transactions').length);
    await E(p, () => { Object.keys(OS.D).forEach(c => OS.D[c] = []); });
    await E(p, j => OS.importAll(JSON.parse(j)), exp); await sleep(800); ok('exportar e importar devolve tudo', (await E(p, () => OS.all('transactions').length)) === n0, n0 + ' movimentos');
    // M · atalho de gastos (Apps Script simulado, envio por formulário como o iPhone)
    await E(p, base => { const c = OS.one('inbox'); c.url = base; c.key = 'KEY_T'; OS.touch('inbox'); }, `http://127.0.0.1:${PORT}/gs`);
    await E(p, () => location.hash = 'definicoes'); await sleep(400);
    await p.evaluate(() => document.querySelector('[data-act=ibSave]').click()); await sleep(800);
    ok('atalho: verificação da ligação', /Ligado/.test(await E(p, () => document.querySelector('.ib-st').innerText)));
    await new Promise(res => { const rq = http.request({ host: 'localhost', port: PORT, path: '/gs?k=KEY_T', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, r => { r.resume(); r.on('end', res); }); rq.end('v=8%2C50&d=Uber+para+a+faculdade'); });
    await new Promise(res => { const rq = http.request({ host: 'localhost', port: PORT, path: '/gs?k=KEY_T', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, r => { r.resume(); r.on('end', res); }); rq.end('v=' + encodeURIComponent('99 pizza 2 pessoas') + '&d=' + encodeURIComponent('99 pizza 2 pessoas')); });
    await new Promise(res => { const rq = http.request({ host: 'localhost', port: PORT, path: '/gs?k=KEY_T', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, r => { r.resume(); r.on('end', res); }); rq.end('v=' + encodeURIComponent('18, uber ') + '&d=' + encodeURIComponent('18, uber ')); });
    GSFAIL = 1; await E(p, () => OS.Inbox.pull(true)); await sleep(2500);
    const u18 = await E(p, () => OS.all('transactions').filter(t => t.desc === 'Uber' && t.amount === 18).length);
    ok('atalho: o Google falha à 1.ª e a app tenta de novo · "18, uber" → 18 € · Uber', u18 === 1, u18 + ' encontrados');
    const one = await E(p, () => OS.all('transactions').filter(t => t.desc === 'Pizza 2 pessoas').map(t => t.amount));
    ok('atalho de uma pergunta: "99 pizza 2 pessoas" → 99 € · Pizza 2 pessoas', one.length === 1 && one[0] === 99, JSON.stringify(one));
    const ib = await E(p, () => OS.all('transactions').filter(t => (t.tags || []).includes('atalho')).map(t => [t.amount, t.desc, t.cat]));
    ok('atalho: gasto enviado entra nas Finanças com categoria', ib.length === 3 && ib[0][0] === 8.5 && ib[0][2] === 'Transporte', JSON.stringify(ib));
    await E(p, () => OS.Inbox.pull(true)); await sleep(600); ok('atalho: não duplica', (await E(p, () => OS.all('transactions').filter(t => (t.tags || []).includes('atalho')).length)) === 3);
    // N · jogo
    await E(p, () => location.hash = 'dominus'); await sleep(300); if (await p.$('[data-act=dStart]')) { await p.click('[data-act=dStart]'); await sleep(500); await E(p, () => document.querySelectorAll('.ceremony').forEach(e => e.remove())); }
    await E(p, () => { const d = OS.one('dominus'); d.xp.cor = (d.xp.cor || 0) + 400; OS.touch('dominus'); }); await sleep(900);
    let choice = 0; for (let i = 0; i < 12 && !choice; i++) { await sleep(300); choice = await E(p, () => document.querySelectorAll('.ch-cel .ch-optb').length); if (!choice) { const c = await p.$('.ch-cel [data-close]'); if (c) await c.click(); } }
    ok('jogo: subir de nível mostra parabéns com 2 recompensas à escolha', choice === 2, choice + ' opções');
    await p.click('.ch-cel .ch-optb'); await sleep(400); ok('jogo: escolher recompensa guarda-a', (await E(p, () => (OS.one('dominus').rwv2.got || []).length)) >= 1);
    for (let i = 0; i < 8 && await p.$('.ch-cel'); i++) { const c = await p.$('.ch-cel .ch-optb') || await p.$('.ch-cel [data-close]'); if (c) await c.click(); await sleep(350); }
    await E(p, () => location.hash = 'dominus.colmeia'); await sleep(300); ok('jogo: colmeia com 61 favos', (await E(p, () => document.querySelectorAll('.hx2').length)) === 61);
    ok('sem erros de JavaScript', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // J · funciona sem internet
  { const { ctx, p, errs } = await newPage(b, prof); await p.goto(BASE); await unlock(p);
    await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => { });
    await p.reload(); await unlock(p); await sleep(800);
    OFFLINE = true; await ctx.setOffline(true); await p.reload().catch(() => { }); let off = false; try { await unlock(p); off = await E(p, () => !!document.querySelector('.dash')); } catch (e) { }
    OFFLINE = false; await ctx.setOffline(false); ok('abre sem internet', off); await ctx.close(); }
  // K · atualização: ecrã "A atualizar" e "Atualizado"
  { const { ctx, p } = await newPage(b, prof); await p.goto(BASE); await unlock(p);
    await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => { });
    await p.reload(); await unlock(p); await sleep(800); // segunda visita: já há uma versão instalada
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/OCEANUM_VERSION=\{"v": "[^"]+"/, 'OCEANUM_VERSION={"v": "9.9"'), sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').replace(/oceanum-[a-z0-9]+/, 'oceanum-teste99');
    fs.writeFileSync('/tmp/oc_idx.html', html); fs.writeFileSync('/tmp/oc_sw.js', sw); OVERRIDE = { 'index.html': '/tmp/oc_idx.html', '': '/tmp/oc_idx.html', 'sw.js': '/tmp/oc_sw.js' };
    let sawUpdating = false; p.on('framenavigated', () => { });
    await E(p, () => navigator.serviceWorker.getRegistration().then(r => r && r.update()));
    for (let i = 0; i < 30 && !sawUpdating; i++) { await sleep(200); sawUpdating = await E(p, () => !!document.querySelector('.upd')).catch(() => false); }
    let saw = ''; for (let i = 0; i < 40 && !/Atualizado/.test(saw); i++) { await sleep(150); saw = await E(p, () => (document.querySelector('.upd') || {}).innerText || '').catch(() => ''); }
    const ver = await E(p, () => (window.OceanumVersion || {}).v || '').catch(() => '');
    ok('atualização: aparece "A atualizar o Oceanum…"', sawUpdating);
    ok('atualização: depois mostra "Atualizado" e a versão nova', /Atualizado/.test(saw) && /9\.9/.test(saw + ver), (saw || '').replace(/\n/g, ' · ').slice(0, 80));
    OVERRIDE = {}; await ctx.close(); }
  // L · modo de segurança
  { const { ctx, p } = await newPage(b, prof); await p.goto(BASE + '?seguro'); await sleep(1500);
    ok('modo de segurança (?seguro) limpa a cache e liga o modo leve', await E(p, () => !location.search && localStorage.getItem('os2lite') === '1' && document.documentElement.classList.contains('lite'))); await ctx.close(); }
  // Definições acessíveis no telemóvel
  { const { ctx, p, errs } = await newPage(b, PROFILES[0]); await p.goto(BASE); await unlock(p); await E(p, () => document.querySelectorAll('#modal').forEach(m => { m.hidden = true; m.innerHTML = ''; }));
    ok('iPhone: engrenagem das Definições visível no topo', await p.isVisible('#top a[href="#definicoes"]'));
    await p.tap('#top a[href="#definicoes"]'); await sleep(400); ok('iPhone: tocar na engrenagem abre as Definições', (await E(p, () => location.hash)) === '#definicoes');
    await E(p, () => location.hash = 'visao'); await sleep(300); await p.tap('.tn-menu'); await sleep(400);
    const vis = await E(p, () => { const a = document.querySelector('#side .side-set'); const r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    ok('iPhone: "Definições" no topo do menu ☰, visível sem rolar', vis); await p.tap('#side .side-set'); await sleep(400);
    ok('iPhone: tocar no menu abre as Definições', (await E(p, () => location.hash)) === '#definicoes');
    ok('sem erros de JavaScript', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // Face ID no iPhone (simulado: o iPhone aceita o rosto)
  { const ctx = await b.newContext(PROFILES[0].o); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(HASH => { if (!localStorage.getItem('__s')) { localStorage.setItem('os2:one~security', JSON.stringify({ data: { hash: HASH } })); localStorage.setItem('__s', '1'); }
      window.__c = 0; window.__g = 0; Object.defineProperty(navigator, 'credentials', { value: { create: async () => { window.__c++; return { rawId: new Uint8Array([1, 2, 3, 4]).buffer }; }, get: async () => { window.__g++; return {}; } } });
      window.PublicKeyCredential = { isUserVerifyingPlatformAuthenticatorAvailable: async () => true }; }, HASH);
    await p.goto(BASE); await unlock(p); await sleep(1200);
    ok('iPhone: depois do código aparece "Ativar o Face ID?"', /Ativar o Face ID/.test(await E(p, () => document.getElementById('modal').innerText)));
    await p.tap('#modal [data-act=bioRegister]'); await sleep(500);
    ok('iPhone: "Ativar Face ID" regista o rosto', (await E(p, () => window.__c)) === 1 && !!(await E(p, () => localStorage.getItem('os2bio'))));
    await E(p, () => OS.act.lockNow()); await sleep(500); ok('iPhone: ao bloquear aparece "Desbloquear com Face ID"', await p.isVisible('#lkBio'));
    ok('iPhone: em modo de teste o Face ID só abre pelo botão (o automático é testado à parte)', (await E(p, () => window.__g)) === 0);
    await p.tap('#lkBio'); await sleep(900); ok('iPhone: entrar com o Face ID abre a app', (await E(p, () => window.__g)) === 1 && !(await p.isVisible('#lkCode').catch(() => false)));
    ok('sem erros de JavaScript', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // tablet e computador: sem Face ID
  for (const pi of [2, 4]) { const { ctx, p, errs } = await newPage(b, PROFILES[pi], { os2bio: JSON.stringify({ id: 'AAAA', at: '2026-10-01' }) }); await p.goto(BASE); await unlock(p); await sleep(1200);
    ok(PROFILES[pi].id + ': sem convite nem botão de Face ID', !/Face ID/.test(await E(p, () => document.getElementById('modal').innerText)) && (await E(p, () => localStorage.getItem('os2bio'))) === null);
    await E(p, () => location.hash = 'definicoes'); await sleep(300); ok(PROFILES[pi].id + ': Definições dizem "só no iPhone"', /Só disponível no iPhone/.test(await E(p, () => document.querySelector('#view').innerText)));
    await ctx.close(); }
  // SINCRONIZAÇÃO: tablet e iPhone na mesma conta
  { for (const k of Object.keys(STORE)) delete STORE[k];
    const T = await newPage(b, PROFILES[3]), I = await newPage(b, PROFILES[0]);
    const GS = `http://127.0.0.1:${PORT}/gs`;
    // tablet: tem dados, atalho configurado, liga a sincronização
    await T.p.goto(BASE); await unlock(T.p);
    await E(T.p, GS => { const U = OS.U, a = OS.all('accounts')[0] || OS.add('accounts', { name: 'Conta', type: 'Conta à ordem' }); OS.add('transactions', { type: 'Despesa', amount: 33, date: U.today(), desc: 'Jantar tablet', cat: 'Alimentação', account: a.id }); OS.add('transactions', { type: 'Despesa', amount: 18, date: U.today(), desc: '18, uber', cat: 'Transporte', account: a.id, tags: ['atalho'] }); const c = OS.one('inbox'); c.url = GS; c.key = 'KEY_T'; c.ver = 3; OS.touch('inbox'); }, GS);
    await sleep(1200); await E(T.p, () => { localStorage.setItem('os2sync', '1'); localStorage.setItem('os2syncJoined', '0'); }); await T.p.reload(); await unlock(T.p); await sleep(4000);
    ok('sync: o tablet envia os seus dados para o Google', Object.keys(STORE).some(id => id.startsWith('transactions~')) && JSON.stringify(STORE).includes('Jantar tablet'));
    ok('limpeza: "18, uber" passa a "Uber"', await E(T.p, () => OS.all('transactions').some(t => t.desc === 'Uber' && t.amount === 18)));
    // iPhone: tinha outra coisa; liga-se com o código do tablet
    await I.p.goto(BASE); await unlock(I.p); await E(I.p, () => OS.add('transactions', { type: 'Despesa', amount: 1, date: OS.U.today(), desc: 'só no iPhone' })); await sleep(1000);
    const code = await E(T.p, () => window.OceanumSync.linkCode());
    await I.p.goto(BASE + '?r=1#ligar=' + encodeURIComponent(code)); await sleep(500); await unlock(I.p).catch(() => { }); await sleep(4500);
    ok('sync: o iPhone liga-se com o código e recebe os dados do tablet', await E(I.p, () => OS.all('transactions').some(t => t.desc === 'Jantar tablet')));
    ok('código de ligação aceite em qualquer formato (link, código, codificado, com espaços)', await E(I.p, c => { const f = [c, encodeURIComponent(c), 'https://x.github.io/Oceanum/#ligar=' + encodeURIComponent(c), 'Abre isto: https://x.github.io/Oceanum/#ligar=' + c + ' ok', c.slice(0, 10) + '\n ' + c.slice(10)]; const r = f.map(x => window.OceanumSync.applyLink(x)); localStorage.setItem('os2syncJoined', '1'); return r.every(Boolean) && !window.OceanumSync.applyLink('lixo'); }, code));
    ok('sync: a configuração do atalho também passa para o iPhone', await E(I.p, () => !!OS.one('inbox').url && OS.one('inbox').key === 'KEY_T'));
    // computador: liga-se com o mesmo código, recebe tudo e o que faz chega aos outros
    { const C = await newPage(b, PROFILES[4]); await C.p.goto(BASE + '?r=2#ligar=' + encodeURIComponent(code)); await sleep(500); await unlock(C.p).catch(() => { }); await sleep(4500);
      ok('sync: o computador liga-se com o código e recebe os dados', await E(C.p, () => OS.all('transactions').some(t => t.desc === 'Jantar tablet') && !!OS.one('inbox').url));
      await E(C.p, () => OS.add('transactions', { type: 'Despesa', amount: 9, date: OS.U.today(), desc: 'Livro computador', cat: 'Educação', account: (OS.all('accounts')[0] || {}).id })); await sleep(3000);
      for (const X of [T, I]) await E(X.p, () => document.dispatchEvent(new Event('visibilitychange'))); await sleep(3500);
      ok('sync: o que registas no computador aparece no tablet e no iPhone', await E(T.p, () => OS.all('transactions').some(t => t.desc === 'Livro computador')) && await E(I.p, () => OS.all('transactions').some(t => t.desc === 'Livro computador')));
      ok('sem erros de JavaScript (computador)', !C.errs.length, C.errs.slice(0, 3).join(' | ')); await C.ctx.close(); }
    // alteração no iPhone aparece no tablet
    await E(I.p, () => OS.add('transactions', { type: 'Despesa', amount: 7, date: OS.U.today(), desc: 'Café iPhone', cat: 'Alimentação', account: (OS.all('accounts')[0] || {}).id })); await sleep(3000);
    await E(T.p, () => document.dispatchEvent(new Event('visibilitychange'))); await sleep(3000);
    ok('sync: o que registas no iPhone aparece no tablet', await E(T.p, () => OS.all('transactions').some(t => t.desc === 'Café iPhone')));
    // apagar no tablet apaga no iPhone
    await E(T.p, () => { const t = OS.all('transactions').find(x => x.desc === 'Café iPhone'); OS.del('transactions', t.id); }); await sleep(3000);
    await E(I.p, () => document.dispatchEvent(new Event('visibilitychange'))); await sleep(3000);
    ok('sync: apagar num aparelho apaga no outro', await E(I.p, () => !OS.all('transactions').some(t => t.desc === 'Café iPhone')));
    // gasto do atalho com os dois aparelhos abertos: entra uma só vez
    INBOX.length = 0; INBOX.push({ id: 'g1', t: new Date().toISOString(), v: 12.5, d: '12,50 mercado', c: '' });
    await Promise.all([E(T.p, () => OS.Inbox.pull(false)), E(I.p, () => OS.Inbox.pull(false))]); await sleep(3500);
    await E(T.p, () => document.dispatchEvent(new Event('visibilitychange'))); await E(I.p, () => document.dispatchEvent(new Event('visibilitychange'))); await sleep(3500);
    const nT = await E(T.p, () => OS.all('transactions').filter(t => t.desc === 'Mercado').length), nI = await E(I.p, () => OS.all('transactions').filter(t => t.desc === 'Mercado').length);
    ok('sync: gasto do atalho entra uma só vez e aparece nos dois aparelhos', nT === 1 && nI === 1, `tablet ${nT} · iPhone ${nI}`);
    ok('sem erros de JavaScript (2 aparelhos)', !T.errs.length && !I.errs.length, T.errs.concat(I.errs).slice(0, 3).join(' | '));
    await T.ctx.close(); await I.ctx.close(); }
  // segurança Android: sem biometria, registo antigo apagado, opção "entrar direto"
  { const prof = PROFILES[2]; const { ctx, p, errs } = await newPage(b, prof, { os2bio: JSON.stringify({ id: 'AAAA', at: '2026-10-01' }) }); await p.goto(BASE); await sleep(1200);
    ok('Android: sem botão de biometria e registo antigo apagado', !(await p.$('#lkBio')) && (await E(p, () => localStorage.getItem('os2bio'))) === null);
    ok('Android: nenhum pedido biométrico ao abrir', (await E(p, () => window.__cred)) === 0);
    await unlock(p); await E(p, () => location.hash = 'definicoes'); await sleep(400); await p.click('[data-act=trustSet][data-v="1"]'); await sleep(200);
    await E(p, () => sessionStorage.clear()); await p.reload(); await sleep(1500);
    ok('"Entrar direto": abre sem pedir código', !(await p.isVisible('#lkCode').catch(() => false)) && await E(p, () => !!document.querySelector('#view .pn, #view .dash')));
    await E(p, () => OS.act.lockNow()); await sleep(400); ok('cadeado volta a pedir o código', await p.isVisible('#lkCode'));
    ok('sem erros de JavaScript', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // CORPO: treino estilo Hevy, rotinas, bioimpedância, dieta com base de alimentos, foto (IA simulada), alongamentos, tudo ligado
  { const { ctx, p, errs } = await newPage(b, PROFILES[0]); await p.goto(BASE); await unlock(p); await E(p, () => document.querySelectorAll('#modal').forEach(m => { m.hidden = true; m.innerHTML = ''; }));
    ok('biblioteca: mais de 500 exercícios com imagens e 60 alongamentos', await E(p, () => OS.Ex.LIST.length > 500 && OS.ExLib.ST.length >= 60 && OS.Ex.LIST.every(x => x.id && x.name && x.muscle)));
    ok('base de alimentos: mais de 700 alimentos', await E(p, () => OS.Diet.DB.length > 700 && OS.Diet.DB.every(x => x.name && x.kcal >= 0)));
    ok('exercícios antigos ligados às imagens', await E(p, () => { const r = OS.all('exercises').find(x => x.name === 'Supino reto com barra'); return !r || !!r.lib; }));
    // treino vazio → escolher 2 exercícios → registar séries → terminar
    await E(p, () => location.hash = 'treino'); await sleep(500);
    await p.click('#view [data-act=wkStart]'); await sleep(700);
    ok('treino: abre a lista para escolher exercícios', await p.isVisible('#wkPick .wk-pick'));
    await p.fill('#wkPick [data-pq]', 'supino reto'); await sleep(400);
    await p.locator('#wkPick [data-p=sel]').nth(0).click(); await sleep(150);
    await p.fill('#wkPick [data-pq]', 'curl martelo'); await sleep(400); await p.locator('#wkPick [data-p=sel]').nth(0).click(); await sleep(150);
    await p.click('#wkPick [data-p=ok]'); await sleep(500);
    ok('treino: 2 exercícios no treino em curso', await E(p, () => document.querySelectorAll('#wkLive .wk-ex').length === 2));
    const fillSet = async (i, kg, reps) => { await p.locator('#wkLive .wk-tr').nth(i).locator('[data-f=kg]').fill(String(kg)); await p.locator('#wkLive .wk-tr').nth(i).locator('[data-f=reps]').fill(String(reps)); await p.locator('#wkLive .wk-tr').nth(i).locator('[data-w=done]').click(); await sleep(250); };
    await fillSet(0, 60, 10); await fillSet(1, 62.5, 8);
    ok('treino: série feita fica verde e o descanso começa', await E(p, () => document.querySelectorAll('#wkLive .wk-tr.done').length === 2 && !!document.querySelector('#wkLive .wk-rest')));
    ok('treino: volume calculado ao vivo', await E(p, () => /1\.?100 kg/.test(document.querySelector('#wkLive .wk-stats').innerText)));
    // continua depois de fechar a app
    await p.reload(); await unlock(p); await sleep(800);
    ok('treino em curso sobrevive a fechar a app (botão flutuante)', await p.isVisible('#wkPill'));
    await p.click('#wkPill'); await sleep(500);
    ok('treino em curso retomado com as séries', await E(p, () => document.querySelectorAll('#wkLive .wk-tr.done').length === 2));
    await p.locator('#wkLive [data-w=type]').nth(2).click(); await sleep(200);
    ok('tipo de série: aquecimento', await E(p, () => document.querySelectorAll('#wkLive .wk-sn.tW').length === 1));
    await p.click('#wkLive [data-w=finish]'); await sleep(800);
    const W1 = await E(p, () => { const w = OS.all('workouts').slice(-1)[0]; return { n: (w.items || []).length, sets: (w.items[0] || {}).sets, title: w.title, dur: w.dur }; });
    ok('terminar: treino guardado com as séries feitas', W1.n === 1 && W1.sets.length === 2 && W1.sets[1].kg === 62.5, JSON.stringify(W1).slice(0, 120));
    ok('terminar: resumo com volume e dicas de dieta e alongamento', await E(p, () => /Treino concluído/.test(document.querySelector('#modal').innerText) && !!document.querySelector('#modal [data-act=stPlay]')));
    await E(p, () => OS.UI.closeModal());
    // rotina a partir do treino e recorde no treino seguinte
    await E(p, () => { const w = OS.all('workouts').slice(-1)[0]; OS.act.wkToRoutine({ dataset: { id: w.id } }); }); await sleep(400);
    ok('rotina criada a partir do treino', await E(p, () => OS.all('routines').length === 1));
    await E(p, () => location.hash = 'treino'); await sleep(400); await p.click('#view .wk-rt [data-act=wkStart]'); await sleep(600);
    ok('rotina: abre com as cargas da última vez', await E(p, () => document.querySelectorAll('#wkLive [data-f=kg]')[1].value === '62.5' && /62,5 kg × 8/.test(document.querySelector('#wkLive .wk-pv').parentNode.parentNode.innerText)));
    await p.locator('#wkLive .wk-tr').nth(0).locator('[data-f=kg]').fill('70'); await p.locator('#wkLive .wk-tr').nth(0).locator('[data-w=done]').click(); await sleep(200);
    await p.click('#wkLive [data-w=finish]'); await sleep(800);
    ok('recorde detetado no treino seguinte', await E(p, () => /Supino reto com barra: 70 kg/.test(document.querySelector('#modal').innerText)));
    await E(p, () => OS.UI.closeModal());
    // editor de rotina
    await E(p, () => OS.Ex.editRoutine('')); await sleep(300); await p.fill('#wkLive .wk-title', 'Pernas A'); await p.click('#wkLive [data-w=pick]'); await sleep(300); await p.fill('#wkPick [data-pq]', 'leg press'); await sleep(300); await p.locator('#wkPick [data-p=sel]').nth(0).click(); await p.click('#wkPick [data-p=ok]'); await sleep(300); await p.click('#wkLive [data-w=rsave]'); await sleep(400);
    ok('nova rotina guardada com exercícios', await E(p, () => OS.all('routines').some(r => r.name === 'Pernas A' && r.items.length === 1 && r.items[0].sets.length === 3)));
    // ficha do exercício
    await E(p, () => location.hash = 'treino.exercicios'); await sleep(500); await p.click('#view .wk-gi'); await sleep(400);
    ok('ficha do exercício com animação 3D e como fazer', await E(p, () => !document.getElementById('wkInfo').hidden && !!document.querySelector('#wkInfo .a3d') && /Como fazer/.test(document.querySelector('#wkInfo').innerText)));
    await p.click('#wkInfo [data-x]'); await sleep(200);
    ok('histórico em cartões', await E(p, () => { location.hash = 'treino.historico'; return true; }) && (await sleep(400), await E(p, () => document.querySelectorAll('#view .wk-card').length >= 2)));
    // peso, altura e bioimpedância
    ok('treino já não tem mapa nem peso (passaram para o Corpo)', await E(p, () => { location.hash = 'treino'; return true; }) && (await sleep(300), await E(p, () => !/Mapa corporal|Peso e medidas/.test(document.querySelector('#view .tabs').textContent))));
    await E(p, () => location.hash = 'corpo.peso'); await sleep(500);
    ok('corpo: separadores visão, desafios, mapa e peso', await E(p, () => [...document.querySelectorAll('#view .tabs a')].map(a => a.textContent).join('|') === 'Visão|Desafios e metas|Mapa corporal|Peso e medidas'));
    await p.fill('#bx_h', '178'); await p.dispatchEvent('#bx_h', 'change'); await sleep(200);
    ok('altura guardada', await E(p, () => OS.one('diet').h === 178));
    await p.click('#view [data-new=body][data-defs]'); await sleep(400);
    ok('formulário de bioimpedância com análise segmentar', await E(p, () => !!document.querySelector('#osform [name=lArmL]') && !!document.querySelector('#osform [name=visceral]')));
    await p.fill('#osform [name=weight]', '80'); await p.fill('#osform [name=bf]', '18'); await p.fill('#osform [name=muscleKg]', '37.5'); await p.fill('#osform [name=visceral]', '7'); await p.fill('#osform [name=bmr]', '1800'); await p.fill('#osform [name=lArmL]', '3.6'); await p.fill('#osform [name=lArmR]', '4.0'); await p.click('#osform [type=submit]'); await sleep(600);
    ok('bioimpedância: faixas de referência e IMC', await E(p, () => { const t = document.querySelector('#view').textContent; return /Faixas de referência/.test(t) && /IMC/.test(t) && /25,2/.test(t) && document.querySelectorAll('#view .gz').length >= 4; }));
    ok('bioimpedância: aviso de diferença entre braços', await E(p, () => /Diferença entre braços/.test(document.querySelector('#view').textContent)));
    ok('metabolismo medido usado nas metas', await E(p, () => OS.BodyX.bmr() === 1800 && OS.BodyX.lean() > 65));
    // dieta: procurar, gramas, porções
    await E(p, () => location.hash = 'dieta'); await sleep(500);
    await p.click('#view .dt-acts [data-act=dietAdd]'); await sleep(300); await p.fill('#fdAdd [data-fq]', 'peito frango grelhado'); await sleep(500);
    ok('dieta: procurar encontra o alimento certo primeiro', await E(p, () => /Peito de frango/.test(document.querySelector('#fdAdd .fd-r').innerText)));
    await p.click('#fdAdd .fd-r'); await sleep(250); await p.fill('#fdAdd [data-famt]', '200'); await p.dispatchEvent('#fdAdd [data-famt]', 'change'); await sleep(250);
    await p.click('#fdAdd [data-fa=add]'); await sleep(300);
    ok('dieta: 200 g de frango = macros certas', await E(p, () => { const m = OS.all('meals').slice(-1)[0]; return m.g === 200 && m.kcal === 318 && m.p === 64; }), await E(p, () => JSON.stringify(OS.all('meals').slice(-1)[0])));
    await p.fill('#fdAdd [data-fq]', 'banana'); await sleep(400); await p.click('#fdAdd .fd-r'); await sleep(250);
    ok('dieta: porção típica (unidade)', await E(p, () => document.querySelector('#fdAdd [data-funit]').value === 'u'));
    await p.click('#fdAdd [data-fa=add]'); await sleep(200); await p.click('#fdAdd [data-fa=x]'); await sleep(400);
    ok('dieta: refeições com fotos dos alimentos', await E(p, () => document.querySelectorAll('#view .dt-it .fdi').length >= 2));
    // refeição fixa
    await E(p, () => OS.act.tplEdit({ dataset: {} })); await sleep(300); await p.fill('#fdAdd [data-ftn]', 'Pequeno-almoço de sempre'); await p.dispatchEvent('#fdAdd [data-ftn]', 'input');
    for (const q of ['aveia', 'whey']) { await p.fill('#fdAdd [data-fq]', q); await sleep(350); await p.click('#fdAdd .fd-r'); await sleep(200); await p.click('#fdAdd [data-fa=add]'); await sleep(200); }
    await p.click('#fdAdd [data-fa=tplsave]'); await sleep(400);
    ok('refeição fixa criada com 2 alimentos', await E(p, () => OS.all('mealtpl').length === 1 && OS.all('mealtpl')[0].items.length === 2));
    const n0 = await E(p, () => OS.all('meals').length); await E(p, () => location.hash = 'dieta.fixas'); await sleep(400); await p.click('#view .tp-c [data-act=tplApply]'); await sleep(300);
    ok('refeição fixa adicionada com um toque', (await E(p, () => OS.all('meals').length)) === n0 + 2);
    // foto com IA (resposta simulada)
    const GEM = (txt) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(txt) }] } }] }) });
    await ctx.route(/generativelanguage\.googleapis\.com/, rt => { const b = rt.request().postData() || '';
      if (/Analisa este exame/.test(b)) return rt.fulfill(GEM({ resumo: 'Estás com gordura média e boa base muscular.', nota: 72, fortes: ['Boa massa muscular'], melhorar: [{ area: 'Gordura abdominal', prioridade: 'alta', porque: 'Cintura de 86 cm.', como: 'Défice de 400 kcal e 3 corridas por semana.' }], metas: [{ medida: 'Gordura', atual: '18%', alvo: '15%', prazo: '8 semanas' }], treino: ['Mais séries de pernas'], dieta: ['Proteína 170 g'], corrida: ['2 rodagens leves'], evolucao: null }));
      if (/fotos do corpo/.test(b)) return rt.fulfill(GEM({ bf: 17, confianca: 'media', musculo: 'bom', fortes: ['peito'], fracas: ['pernas'], gordura_local: 'abdómen', postura: null, foto_valida: true }));
      return rt.fulfill(GEM({ itens: [{ nome: 'Arroz branco cozido', gramas: 150, kcal: 195, proteina: 4, hidratos: 42, gordura: .5, fibra: 1 }, { nome: 'Bife grelhado', gramas: 120, kcal: 260, proteina: 34, hidratos: 0, gordura: 13 }], nota: 'Prato de almoço' })); });
    await E(p, () => location.hash = 'dieta'); await sleep(300); await E(p, () => OS.act.dietAdd({ dataset: { tab: 'foto' } })); await sleep(300);
    ok('foto: sem IA mostra só o botão para Definições → Spyke (sem passos nem chave aqui)', await E(p, () => !!document.querySelector('#fdAdd a[href="#definicoes.spyke"]') && !document.querySelector('#fdAdd [data-aikey]') && !/aistudio/.test(document.querySelector('#fdAdd').innerHTML)));
    await E(p, () => { OS.setOne('diet', { aiKey: 'AIzaTESTE_chave_de_teste_1234567890' }); OS.emit('ai:on'); }); await sleep(300);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await p.setInputFiles('#fdCam', { name: 'prato.png', mimeType: 'image/png', buffer: png }); await sleep(1500);
    ok('foto: a IA identifica os alimentos', await E(p, () => document.querySelectorAll('#fdAdd .fd-phl>div').length === 2));
    await p.fill('#fdAdd [data-phg="0"]', '300'); await p.dispatchEvent('#fdAdd [data-phg="0"]', 'change'); await sleep(300);
    const n1 = await E(p, () => OS.all('meals').length); await p.click('#fdAdd [data-fa=phadd]'); await sleep(400);
    ok('foto: corrigir gramas reescala as calorias e regista', await E(p, n1 => OS.all('meals').length === n1 + 2 && OS.all('meals').some(m => m.food === 'Arroz branco cozido' && m.kcal === 390 && m.src === 'foto'), n1));
    // marcas reais com foto da embalagem
    await E(p, () => OS.act.dietAdd({ dataset: {} })); await sleep(300); await p.fill('#fdAdd [data-fq]', 'coca cola zero'); await sleep(500);
    ok('marcas: produtos reais com marca e foto', await E(p, () => !!document.querySelector('#fdAdd .fd-r .fd-br') && !!document.querySelector('#fdAdd .fd-r .fdi.brand')));
    await E(p, () => [...document.querySelectorAll('#fdAdd .fd-r')].find(r => r.querySelector('.fdi.brand')).click()); await sleep(250); await p.click('#fdAdd [data-fa=add]'); await sleep(250); await p.click('#fdAdd [data-fa=x]'); await sleep(300);
    ok('marcas: refeição guarda a foto do produto', await E(p, () => { const m = OS.all('meals').slice(-1)[0]; return /\(/.test(m.food) && /openfoodfacts/.test(m.pic); }));
    await ctx.route(/pt\.wikipedia\.org\/w\/api\.php/, rt => { const q = new URL(rt.request().url()).searchParams.get('gsrsearch'); rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ query: { pages: { 1: { index: 1, title: q, thumbnail: { source: 'https://upload.wikimedia.org/x/' + encodeURIComponent(q) + '.jpg' } } } } }) }); });
    await ctx.route(/upload\.wikimedia\.org\/x\//, rt => rt.fulfill({ status: 200, contentType: 'image/png', body: png }));
    // país e marcas por país (Open Food Facts simulado)
    await ctx.route(/openfoodfacts\.org\/cgi\/search\.pl/, rt => { const u = new URL(rt.request().url()), c = u.searchParams.get('tag_0'), br = c === 'brazil' ? 'Renata' : 'Milaneza';
      rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ products: [{ code: '56' + br.length, product_name: 'Esparguete ' + br, brands: br, image_front_small_url: 'https://images.openfoodfacts.org/x/' + br + '.jpg', nutriments: { 'energy-kcal_100g': 359, proteins_100g: 12, carbohydrates_100g: 71, fat_100g: 1.5, fiber_100g: 3 } }] }) }); });
    await E(p, () => location.hash = 'visao'); await sleep(400);
    ok('país: botão na página inicial', await E(p, () => /Portugal/.test((document.querySelector('#view .ctry-bar .ctry') || {}).textContent || '')));
    await E(p, () => OS.act.dietAdd({ dataset: {} })); await sleep(300); await p.fill('#fdAdd [data-fq]', 'esparguete cozida'); await sleep(500);
    await E(p, () => [...document.querySelectorAll('#fdAdd .fd-r')].find(r => /Massa esparguete/.test(r.textContent)).click()); await sleep(800);
    ok('marcas: ao tocar no alimento escolhe-se a marca', await E(p, () => { const t = document.querySelector('#fdAdd .fd-brands').textContent, c = [...document.querySelectorAll('#fdAdd .fd-bc')].map(b => b.textContent).join('|'); return /Sem marca/.test(t) && /Milaneza/.test(c) && !/Renata/.test(t); }));
    await E(p, () => [...document.querySelectorAll('#fdAdd .fd-bc')].find(b => /Milaneza/.test(b.textContent)).click()); await sleep(250);
    await p.click('#fdAdd [data-fa=add]'); await sleep(250); await p.click('#fdAdd [data-fa=x]'); await sleep(300);
    ok('marcas: regista o alimento com a marca escolhida', await E(p, () => /Milaneza/.test(OS.all('meals').slice(-1)[0].food)));
    await E(p, () => location.hash = 'visao'); await sleep(300); await p.click('#view .ctry-bar .ctry'); await sleep(250); await p.click('#modal [data-act=countrySet][data-v=BR]'); await sleep(300);
    ok('país: muda para Brasil', await E(p, () => OS.Country.code() === 'BR' && /Brasil/.test(document.querySelector('#view .ctry-bar').textContent)));
    await E(p, () => OS.act.dietAdd({ dataset: {} })); await sleep(300); await p.fill('#fdAdd [data-fq]', 'esparguete cozida'); await sleep(500);
    await E(p, () => [...document.querySelectorAll('#fdAdd .fd-r')].find(r => /Massa esparguete/.test(r.textContent)).click()); await sleep(800);
    ok('marcas: mudam conforme o país', await E(p, () => { const t = document.querySelector('#fdAdd .fd-brands').textContent; return /Renata/.test(t) && !/Milaneza/.test(t); }));
    await E(p, () => OS.setOne('profile', { country: 'PT' })); await E(p, () => OS.act.dietAdd({ dataset: {} })); await sleep(300); await p.fill('#fdAdd [data-fq]', 'ovos'); await sleep(500);
    await E(p, () => [...document.querySelectorAll('#fdAdd .fd-r')].find(r => /^Ovos$/.test(r.querySelector('b').textContent.trim())).click()); await sleep(1200);
    ok('marcas certas: nos ovos só aparecem ovos (nada de massa ou salsichas)', await E(p, () => { const c = [...document.querySelectorAll('#fdAdd .fd-bc small')].map(x => x.textContent); return c.length >= 5 && c.every(t => /ovo|egg|oeuf|huevo/i.test(t)) && !c.some(t => /massa|pasta|tagliat|salsich|atum|wrap/i.test(t)); }));
    await p.click('#fdAdd [data-fa=back]'); await sleep(200); await p.fill('#fdAdd [data-fq]', 'batata frita fast'); await sleep(500);
    await E(p, () => [...document.querySelectorAll('#fdAdd .fd-r')].find(r => /Batata frita \(fast food\)/.test(r.textContent)).click()); await sleep(1200);
    ok('marcas certas: na batata frita não aparece batata palha nem chips', await E(p, () => { const c = [...document.querySelectorAll('#fdAdd .fd-bc')].map(x => x.textContent); return c.some(t => /McDonald/.test(t)) && c.some(t => /Burger King/.test(t)) && !c.some(t => /palha|chips|onduladas|crisps/i.test(t)); }));
    await E(p, () => OS.setOne('profile', { country: 'BR' }));
    ok('fast food conforme o país', await E(p, () => OS.Diet.search('coxinha padaria', 20).some(x => /Padaria/.test(x.brand || '')) ));
    await p.click('#fdAdd [data-fa=x]'); await sleep(200);
    ok('refeições já guardadas com marca de outro país ficam iguais', await E(p, () => OS.all('meals').some(m => /Milaneza/.test(m.food))));
    await E(p, () => OS.setOne('profile', { country: 'PT' })); await sleep(100);
    ok('fast food de outro país não aparece', await E(p, () => !OS.Diet.search('coxinha padaria', 20).some(x => /Padaria/.test(x.brand || ''))));
    { const bad = await E(p, () => OS.Diet.DB.filter(x => !OS.Diet.pic(x.name, x.cat).u).map(x => x.name)); ok('alimentos sem emojis: todos com foto real', !bad.length, bad.slice(0, 4).join(', ')); }
    ok('alimentos agrupados: cada alimento uma vez, com as variantes lá dentro', await E(p, () => { const G = OS.Diet.GR, a = G.find(g => g.name === 'Arroz integral'); return G.length > 350 && a && a.vars.map(v => v.l).join() === 'Cozido,Cru' && OS.Diet.DB.filter(x => !x.g).length === 0; }));
    ok('cada alimento tem a sua foto (sem repetir)', await E(p, () => { const G = OS.Diet.GR, u = G.map(g => g.pic).filter(Boolean); return u.length === G.length && new Set(u).size >= G.length * .97; }), await E(p, () => OS.Diet.GR.filter(g => !g.pic).map(g => g.name).slice(0, 5).join(', ')));
    ok('cada alimento tem descrição', await E(p, () => OS.Diet.GR.every(g => g.desc && g.desc.length > 15)));
    await E(p, () => OS.act.dietAdd({ dataset: {} })); await sleep(300); await p.fill('#fdAdd [data-fq]', 'arroz tipo 1'); await sleep(500);
    await E(p, () => [...document.querySelectorAll('#fdAdd .fd-r')].find(r => /Arroz branco tipo 1/.test(r.textContent)).click()); await sleep(400);
    ok('ao tocar no arroz aparecem as opções (cozido / cru) e as marcas', await E(p, () => [...document.querySelectorAll('#fdAdd [data-fa=var]')].map(b => b.textContent).join() === 'Cozido,Cru' && /Cigala/.test(document.querySelector('#fdAdd .fd-brands').textContent)));
    await E(p, () => document.querySelector('#fdAdd [data-fa=var][data-k="1"]').click()); await sleep(200); await E(p, () => [...document.querySelectorAll('#fdAdd .fd-brands [data-fa=bname], #fdAdd .fd-brands [data-fa=brand]')].find(b => /Cigala/.test(b.textContent)).click()); await sleep(200);
    await p.click('#fdAdd [data-fa=add]'); await sleep(250); await p.click('#fdAdd [data-fa=x]'); await sleep(300);
    ok('regista com a opção e a marca escolhidas', await E(p, () => { const m = OS.all('meals').slice(-1)[0]; return /Cigala/.test(m.food) && /arroz|cru/i.test(m.food) && m.kcal > 300 && m.kcal < 400 && !!m.pic; }), await E(p, () => JSON.stringify(OS.all('meals').slice(-1)[0])));
    await E(p, () => location.hash = 'dieta.alimentos'); await sleep(600);
    ok('biblioteca de alimentos com fotos e descrições', await E(p, () => document.querySelectorAll('#view .fd-gi .fd-gd').length >= 40 && document.querySelectorAll('#view .fd-gi img').length >= 40));
    // exame de composição corporal feito pela IA
    await E(p, () => location.hash = 'corpo.peso'); await sleep(400); await p.click('#view [data-act=bioExam]'); await sleep(300);
    await p.fill('#ex_weight', '81'); await p.fill('#ex_age', '24'); await p.fill('#ex_waist', '86'); await p.fill('#ex_neck', '38'); await p.click('#modal [data-act=exNext]'); await sleep(300);
    ok('exame IA: passo das fotos', await E(p, () => document.querySelectorAll('#modal .ex-pc').length === 3));
    await p.setInputFiles('#exph_front', { name: 'f.png', mimeType: 'image/png', buffer: png }); await sleep(600);
    await p.click('#modal [data-act=exRun]'); await sleep(2500);
    const bx = await E(p, () => { const b = OS.all('body').filter(x => x.src === 'ia').pop(); return b ? { bf: b.bf, lean: b.leanKg, bmr: b.bmr, vis: b.visceral, look: !!b.look, ai: !!b.ai } : null; });
    ok('exame IA: resultado completo (gordura, magra, metabolismo, visceral)', bx && bx.bf > 10 && bx.bf < 25 && bx.lean > 55 && bx.bmr > 1500 && bx.vis >= 1 && bx.look, JSON.stringify(bx));
    ok('exame IA: análise com onde melhorar', await E(p, () => { const t = document.querySelector('#view').textContent; return /Gordura abdominal/.test(t) && /Défice de 400 kcal/.test(t) && /Metas para o próximo exame/.test(t); }));
    ok('exame IA: estimativa sem fotos também funciona', await E(p, () => { const e = OS.BioAI.estimate({ weight: 81, h: 178, age: 24, sex: 'M', waist: 86, neck: 38 }); return e.bf > 12 && e.bf < 22 && e.muscleKg > 30; }));
    // vídeo da execução no treino
    await E(p, () => OS.Ex.start({})); await sleep(400); await E(p, () => { const h = document.getElementById('wkPick'); h.hidden = true; }); await E(p, () => { const id = OS.Ex.ensure('Barbell_Squat'); OS.Ex.live().items.push({ ex: id, rest: 90, sets: [{ t: 'N', kg: '', reps: '' }] }); OS.Ex.live(); }); await E(p, () => OS.act.wkResume()); await sleep(300);
    await ctx.route(/youtube-nocookie\.com/, rt => rt.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>v</title>' }));
    ok('vídeos escolhidos para os exercícios', await E(p, () => Object.keys(OS.ExLib.VID || {}).length > 400));
    await p.click('#wkLive .wk-vb'); await sleep(400);
    ok('treino: vídeo da execução toca dentro da app', await E(p, () => /youtube-nocookie\.com\/embed\/[\w-]{11}/.test((document.querySelector('#wkInfo .wk-player iframe') || {}).src || '')));
    if (await p.$('#wkInfo .wk-vsel [data-k="1"]')) { await p.click('#wkInfo .wk-vsel [data-k="1"]'); await sleep(200); }
    ok('ficha: vários vídeos bons para escolher', await E(p, () => document.querySelectorAll('#wkInfo .wk-vsel [data-k]').length >= 2 && document.querySelector('#wkInfo .wk-vsel [data-k="1"]').classList.contains('on')));
    await p.click('#wkInfo [data-xmode="3d"]'); await sleep(300);
    ok('ficha: alterna entre vídeo e animação 3D', await E(p, () => !document.querySelector('#wkInfo iframe') && !!document.querySelector('#wkInfo .a3d') && !!document.querySelector('#wkInfo [data-xmode="vid"]')));
    await p.waitForFunction(() => { const a = document.querySelector('#wkInfo .a3d'); return a && (a.querySelector('canvas') || a.classList.contains('fail') || a.querySelector('svg')); }, null, { timeout: 20000 }).catch(() => { });
    ok('ficha: animação 3D (ou recurso) aparece', await E(p, () => { const a = document.querySelector('#wkInfo .a3d'); return !!a && !!(a.querySelector('canvas') || a.querySelector('svg')); }));
    await p.click('#wkInfo [data-xmode="img"]'); await sleep(200);
    ok('ficha: modo fotos', await E(p, () => !document.querySelector('#wkInfo .a3d') && !!document.querySelector('#wkInfo .wk-media img')));
    await p.click('#wkInfo [data-x]'); await sleep(200);
    ok('fechar a ficha para o vídeo', await E(p, () => !document.querySelector('#wkInfo iframe')));
    await p.click('#wkLive .wk-th-b'); await sleep(300);
    ok('ficha: abre na animação 3D com botão do vídeo', await E(p, () => !!document.querySelector('#wkInfo .a3d') && !!document.querySelector('#wkInfo [data-xmode="vid"]')));
    await p.click('#wkInfo [data-x]'); await E(p, () => { document.querySelector('#wkLive [data-w=discard]').click(); }); await sleep(200); await E(p, () => document.querySelector('#modal [data-mok]').click()); await sleep(200);
    ok('animação certa: extensão de pernas na cadeira extensora (não agachamento)', await E(p, () => OS.Anim.pattern({ name: 'Extensão de pernas', muscle: 'Quadríceps' }) === 'legext' && OS.Anim.pattern({ name: 'Agachamento búlgaro com halteres', muscle: 'Quadríceps' }) === 'lunge' && OS.Anim.pattern({ name: 'Abdominal no banco declinado', muscle: 'Abdómen' }) === 'situp' && OS.Anim3D.setup('kneelcrunch', 'Abdominal no cabo (ajoelhado)', 'Cabo').att === 'rope'));
    // simuladores seguem o país
    // taxas ao vivo: fontes oficiais simuladas (Eurostat, BCE, Banco Central do Brasil); EUA sem ligação
    const BCBV = { 13522: '4.22', 4389: '13.65', 432: '13.75', 195: '0.6624', 20742: '110.22', 20746: '24.12' };
    await ctx.route(/ec\.europa\.eu\/eurostat/, rt => rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ dimension: { time: { category: { index: { '2026-09': 0 } } } }, value: { 0: 3.6 } }) }));
    await ctx.route(/data-api\.ecb\.europa\.eu/, rt => { const u = rt.request().url(), cc = (u.match(/MIR\/M\.(\w\w)\./) || [])[1];
      rt.fulfill({ status: 200, contentType: 'text/csv', headers: { 'Access-Control-Allow-Origin': '*' }, body: /\/FM\//.test(u) ? 'KEY,TITLE,TIME_PERIOD,OBS_VALUE\nFM.D.U2.EUR.4F.KR.DFR.LEV,"Deposit facility, rate",2026-10-01,2.5\n' : `KEY,TIME_PERIOD,OBS_VALUE\nMIR.M.${cc}.B.L22.F.R.A.2250.EUR.N,2026-08,1.62\nMIR.M.${cc}.B.A2B.A.R.A.2250.EUR.N,2026-08,8.98\n` }); });
    await ctx.route(/api\.bcb\.gov\.br/, rt => { const n = rt.request().url().match(/sgs\.(\d+)/)[1]; rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify([{ data: '01/08/2026', valor: BCBV[n] }]) }); });
    await ctx.route(/api\.bls\.gov|fiscaldata\.treasury|sdmx\.oecd/, rt => rt.abort());
    await E(p, () => { OS.setOne('profile', { country: 'PT' }); location.hash = 'simuladores'; }); await sleep(400);
    ok('simuladores: em Portugal usa € e 28% de imposto', await E(p, () => { const t = document.querySelector('#view').textContent; return /€ /.test(document.querySelector('#view .sim-out .kpis').textContent) && /28%/.test(t) && /Portugal/.test(document.querySelector('#view .sim-cty').textContent) && /Líquido de impostos/.test(t); }));
    await sleep(900);
    ok('ao vivo: inflação de Portugal vem do Eurostat e entra no simulador', await E(p, () => { const b = document.querySelector('#view .lv-bar').textContent, i = document.querySelector('#view [data-sim="juros.inf"]'); return /Ao vivo/.test(b) && /Inflação 3,6%/.test(b) && /Eurostat/.test(b) && i.value == '3.6' && /ao vivo/.test(i.closest('.fld').querySelector('label').textContent); }));
    await E(p, () => location.hash = 'simuladores.emprestimo'); await sleep(300);
    const ptLoan = await E(p, () => document.querySelector('#view .sim-out').textContent);
    ok('ao vivo: crédito ao consumo do BCE como taxa do empréstimo', await E(p, () => document.querySelector('#view [data-sim="emprestimo.r"]').value == '8.98'));
    ok('simuladores: empréstimo em Portugal mostra TAN e TAEG com Imposto do Selo', /TAEG/.test(ptLoan) && /Imposto do Selo/.test(ptLoan) && await E(p, () => /TAN/.test(document.querySelector('#view .sim-in').textContent)));
    await E(p, () => OS.setOne('profile', { country: 'BR' })); await sleep(400);
    ok('simuladores: no Brasil usa R$, juros ao mês e CET com IOF', await E(p, () => { const o = document.querySelector('#view .sim-out').textContent, i = document.querySelector('#view .sim-in').textContent; return /R\$/.test(o) && !/€/.test(o) && /CET/.test(o) && /IOF/.test(o) && /ao mês/.test(i) && /Tabela Price/.test(i) && /SAC/.test(i); }));
    ok('simuladores: custo efetivo de um crédito sem juros é 0%', await E(p, () => { const r = OS.SimCalc.effRate(10000, Array(12).fill(10000 / 12)); return Math.abs(r) < 1e-6; }));
    await sleep(700);
    ok('ao vivo: no Brasil a taxa do crédito pessoal vem do BCB, ao mês', await E(p, () => { const v = +document.querySelector('#view [data-sim="emprestimo_BR.r"]').value; return Math.abs(v - 6.39) < .02 && /Banco Central do Brasil/.test(document.querySelector('#view .lv-bar').textContent) && /Selic 13,75%/.test(document.querySelector('#view .lv-bar').textContent); }));
    await E(p, () => location.hash = 'simuladores.taxas'); await sleep(300);
    ok('simuladores: comparar taxas com produtos do Brasil (poupança isenta, CDI)', await E(p, () => { const t = document.querySelector('#view .sim-out').textContent; return /Poupança/.test(t) && /CDI/.test(t) && /isento/.test(t); }));
    ok('ao vivo: CDI e LCI/LCA (90% do CDI) atualizados', await E(p, () => { const g = k => +document.querySelector(`#view [data-sim="taxas_BR.${k}"]`).value; return g('r2') === 13.65 && Math.abs(g('r3') - 12.29) < .02 && Math.abs(g('r1') - 8.24) < .02; }));
    await E(p, () => { document.querySelector('#view [data-sim="taxas_BR.r1"]').value = '7'; document.querySelector('#view [data-sim="taxas_BR.r1"]').dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
    await E(p, () => OS.setOne('profile', { country: 'PT' })); await sleep(400);
    ok('simuladores: cada país guarda os seus valores', await E(p, () => (OS.ui.sim_taxas_BR || {}).r1 == 7 && !/Poupança/.test(document.querySelector('#view .sim-out').textContent) && /Depósito a prazo/.test(document.querySelector('#view .sim-out').textContent)));
    // assistente de decisão com IA (Gemini simulado)
    let simPrompt = '';
    await ctx.route(/generativelanguage/, rt => { const b = rt.request().postData() || ''; if (!/SIMULADOR/.test(b)) return rt.fallback(); simPrompt = JSON.parse(b).contents[0].parts[0].text;
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ nivel: 'atencao', veredicto: 'Completa primeiro a reserva de emergência.', resposta: 'Vais pagar muitos juros.', porque: ['TAEG alta'], riscos: ['Sem reserva'], cenarios: [{ titulo: 'Prazo mais curto', valores: { n: 36, hack: 1 }, efeito: 'Menos juros' }], passos: ['Comparar 3 bancos'], falta: ['Para que é o crédito?'] }) }] } }] }) }); });
    const oldKey = await E(p, () => OS.one('diet').aiKey || '');
    await E(p, () => { OS.setOne('diet', { aiKey: '' }); location.hash = 'simuladores.emprestimo'; }); await sleep(400);
    ok('IA nos simuladores: painel do assistente com sugestões', await E(p, () => /Assistente de decisão/.test(document.querySelector('#view .sim-ai').textContent) && document.querySelectorAll('#view .sai-chips .chip').length >= 2));
    await p.click('#view .sai-chips .chip'); await sleep(300);
    ok('IA nos simuladores: sem chave mostra o cartão único do Spyke (IA)', await E(p, () => /Definições → Spyke/.test(document.querySelector('#view .sim-ai').textContent) && !!document.querySelector('#view .sim-ai .ai-off a[href="#definicoes.spyke"]')));
    await E(p, () => OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' })); await sleep(200);
    await p.click('#view .sai-chips .chip'); await sleep(900);
    ok('IA nos simuladores: responde com veredicto, riscos e passos', await E(p, () => { const t = document.querySelector('#view .sim-ai').textContent; return /Completa primeiro a reserva/.test(t) && /Riscos/.test(t) && /Comparar 3 bancos/.test(t) && /Prazo \(meses\): 36/.test(t); }));
    ok('IA nos simuladores: a IA recebe a simulação, as regras do país e as finanças', /"campo":"n"/.test(simPrompt) && /TAEG/.test(simPrompt) && /SITUAÇÃO FINANCEIRA REAL/.test(simPrompt) && /Portugal/.test(simPrompt) && /Ao vivo/.test(simPrompt));
    await p.click('#view [data-act=simAIApply][data-i="0"]'); await sleep(400);
    ok('IA nos simuladores: "Testar" aplica o cenário (e ignora campos inventados)', await E(p, () => document.querySelector('#view [data-sim="emprestimo.n"]').value == '36' && !('hack' in (OS.ui.sim_emprestimo || {}))));
    await E(p, k => OS.setOne('diet', { aiKey: k }), oldKey);
    await E(p, () => { OS.setOne('profile', { country: 'US' }); location.hash = 'simuladores'; }); await sleep(1200);
    ok('ao vivo: sem ligação usa os valores de referência e avisa', await E(p, () => /Sem ligação/.test(document.querySelector('#view .lv-bar').textContent) && document.querySelector('#view [data-sim="juros_US.inf"]').value == '2.8'));
    await E(p, () => OS.setOne('profile', { country: 'PT' }));
    // INVESTIMENTOS: cotações ao vivo (script Google simulado), renda fixa, rentabilidade, risco, mercado, importação, impostos e IA
    const T0 = Math.floor(Date.now() / 1000), hist = (b, drift) => { const t = [], c = []; for (let i = 420; i >= 0; i--) { t.push(T0 - i * 86400); c.push(Math.round(b * Math.pow(1 + drift, 420 - i) * (1 + .02 * Math.sin(i / 6)) * 100) / 100); } return { cur: 'EUR', t, c, div: [[T0 - 40 * 86400, 0.5]], spl: [] }; };
    const QT = { 'VWCE.DE': { p: 171.14, pc: 169.38, cur: 'EUR', nm: 'Vanguard FTSE All-World', ex: 'XETRA', open: true, d: [169, 170, 171.14], h52: 172, l52: 138 }, 'TST.LS': { p: 10, pc: 10.5, cur: 'EUR', nm: 'Teste SA', ex: 'Lisbon', open: true, d: [10.5, 10] } };
    await ctx.route(/script\.google\.com/, rt => { const u = new URL(rt.request().url()), op = u.searchParams.get('op'); let body;
      if (op === 'q') { const o = {}; String(u.searchParams.get('s') || '').split(',').forEach(s => { if (QT[s]) o[s] = QT[s]; }); body = { ok: true, q: o }; }
      else if (op === 'h') { const s = u.searchParams.get('s'); body = { ok: true, h: s === 'TST.LS' ? hist(12, -.0004) : hist(140, .0005) }; }
      else if (op === 's') body = { ok: true, q: [{ s: 'TST.LS', n: 'Teste SA', t: 'EQUITY', ty: 'Ação', ex: 'Lisboa' }], news: [{ ti: 'Notícia de teste', l: 'https://example.com', pub: 'Teste', t: T0 }] };
      else if (op === 'f') body = { ok: true, f: { sum: { assetProfile: { longBusinessSummary: 'Test company that makes tests.', sector: 'Tecnologia', industry: 'Software', country: 'Portugal', companyOfficers: [{ name: 'Ana Teste', title: 'CEO', age: 45 }] }, price: { longName: 'Teste SA', currency: 'EUR', regularMarketPrice: { raw: 10 }, marketCap: { raw: 1e9 } }, summaryDetail: { trailingPE: { raw: 12 }, dividendYield: { raw: .07 }, dividendRate: { raw: .7 }, payoutRatio: { raw: .5 } }, financialData: { returnOnEquity: { raw: .2 }, profitMargins: { raw: .15 }, currentRatio: { raw: 2 }, targetMeanPrice: { raw: 12 }, numberOfAnalystOpinions: { raw: 5 } }, defaultKeyStatistics: { priceToBook: { raw: 1.2 }, trailingEps: { raw: .8 }, bookValue: { raw: 8 } }, majorHoldersBreakdown: { insidersPercentHeld: { raw: .3 }, institutionsPercentHeld: { raw: .4 }, institutionsCount: { raw: 12 } }, institutionOwnership: { ownershipList: [{ organization: 'Fundo X', pctHeld: { raw: .05 }, value: { raw: 5e7 } }] }, recommendationTrend: { trend: [{ strongBuy: 1, buy: 2, hold: 2, sell: 0, strongSell: 0 }] } },
        ts: { annualTotalRevenue: [['2023-12-31', 1e9, 'EUR'], ['2024-12-31', 1.1e9, 'EUR']], annualNetIncome: [['2023-12-31', 1e8, 'EUR'], ['2024-12-31', 1.2e8, 'EUR']], annualTotalAssets: [['2023-12-31', 2e9, 'EUR'], ['2024-12-31', 2.1e9, 'EUR']], annualOperatingCashFlow: [['2023-12-31', 1.3e8, 'EUR'], ['2024-12-31', 1.5e8, 'EUR']] } } };
      else if (op === 'ping') body = { ok: true, v: 5 }; else return rt.fallback();
      rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) }); });
    await ctx.route(/frankfurter/, rt => rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ date: '2026-10-02', rates: { USD: 1.12, BRL: 5.86, GBP: .85 } }) }));
    await ctx.route(/coingecko/, rt => rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' }));
    await E(p, () => { const c = OS.one('inbox'); c.__old = { url: c.url, key: c.key, ver: c.ver }; c.url = 'https://script.google.com/macros/s/TESTE/exec'; c.key = 'k'; c.ver = 4; OS.touch('inbox');
      const d = n => OS.U.addDays(OS.U.today(), -n);
      const a = OS.add('assets', { name: 'Vanguard FTSE All-World', ticker: 'VWCE', sym: 'VWCE.DE', cls: 'ETF', currency: 'EUR' }); OS.add('invtx', { asset: a.id, type: 'Compra', date: d(400), qty: 10, price: 120 });
      const b = OS.add('assets', { name: 'Teste SA', ticker: 'TST', sym: 'TST.LS', cls: 'Ação', currency: 'EUR' }); OS.add('invtx', { asset: b.id, type: 'Compra', date: d(300), qty: 100, price: 12 }); OS.add('invtx', { asset: b.id, type: 'Venda', date: d(10), qty: 20, price: 10.2 });
      const r = OS.add('assets', { name: 'Depósito teste', cls: 'Depósito a prazo', idx: 'Pré-fixado', rate: 3, currency: 'EUR' }); OS.add('invtx', { asset: r.id, type: 'Compra', date: d(365), qty: 1, price: 1000 });
      OS.InvX.tick(true); location.hash = 'investimentos.carteira'; }); await sleep(1500);
    ok('investimentos: cotação ao vivo do script (Yahoo) na carteira', await E(p, () => { const t = document.querySelector('#view').textContent; return /171,14/.test(t) && /Ao vivo/.test(t) && OS.InvX.st.script === 'ok'; }));
    ok('investimentos: variação do dia calculada ao vivo', await E(p, () => { const pp = OS.Inv.pos(OS.all('assets').find(a => a.sym === 'VWCE.DE')); return Math.abs(pp.dayPct - (171.14 / 169.38 - 1)) < 1e-6 && Math.abs(pp.value - 1711.4) < .01; }));
    ok('investimentos: renda fixa rende sozinha (3% ao ano)', await E(p, () => { const pp = OS.Inv.pos(OS.all('assets').find(a => a.name === 'Depósito teste')); return Math.abs(pp.value - 1030) < 1 && pp.rf && pp.tax > 0; }));
    await E(p, () => location.hash = 'investimentos.rentabilidade'); for (let i = 0; i < 20 && !(await E(p, () => !!OS.InvX.hcache)); i++) await sleep(300); await sleep(500);
    ok('investimentos: rentabilidade com histórico (TWR, TIR, volatilidade, Sharpe)', await E(p, () => { const t = document.querySelector('#view').textContent, m = OS.InvX.metrics(OS.InvX.hcache); return /Volatilidade/.test(t) && /Sharpe/.test(t) && /mês a mês/.test(t) && m && isFinite(m.tot) && m.vol > 0 && m.xirr != null; }));
    await E(p, () => location.hash = 'investimentos.risco'); await sleep(900);
    ok('investimentos: risco (nota 1–7, VaR, CVaR, stress, correlação)', await E(p, () => { const t = document.querySelector('#view').textContent, r = OS.InvX.risk(OS.InvX.hcache); return /Nota de risco/.test(t) && /VaR 95%/.test(t) && /CVaR/.test(t) && /Testes de stress/.test(t) && /Correlação/.test(t) && r.sri >= 1 && r.sri <= 7 && r.var1 > 0 && r.cvar1 >= r.var1 - 1e-9; }));
    await E(p, () => location.hash = 'investimentos.mercado'); await sleep(400); await p.fill('#invQ', 'teste'); await p.click('#view [data-form=invSearch] button'); await sleep(800);
    ok('investimentos: pesquisar ativo no mercado', await E(p, () => /TST\.LS/.test(document.querySelector('#view').textContent) && !!document.querySelector('#view [data-act=invAddAsset][data-s="TST.LS"]')));
    await E(p, () => { OS.setUI('invSym', 'VWCE.DE'); location.hash = 'investimentos.ativo'; }); await sleep(1200);
    ok('investimentos: página do ativo com gráfico, estatísticas e notícias', await E(p, () => { const t = document.querySelector('#view').textContent; return /Estatísticas/.test(t) && /A tua posição/.test(t) && /Notícia de teste/.test(t) && !!document.querySelector('#view .chart svg'); }));
    await E(p, () => location.hash = 'investimentos.movimentos'); await sleep(300); await p.click('#view [data-act=invImp]'); await sleep(300);
    await p.fill('#invImpTxt', 'Data;Ticker;Tipo;Quantidade;Preço;Taxas\n10/03/2025;NOVO.LS;Compra;5;20,50;1\n12/04/2025;NOVO.LS;Dividendo;;;\n'); await p.click('#view [data-act=invImpParse]'); await sleep(300);
    const nTx = await E(p, () => OS.all('invtx').length); await p.click('#view [data-act=invImpGo]'); await sleep(400);
    ok('investimentos: importar CSV da corretora', await E(p, n => OS.all('invtx').length === n + 1 && OS.all('assets').some(a => a.sym === 'NOVO.LS') && OS.all('invtx').some(t => t.price === 20.5 && t.qty === 5), nTx));
    // todos os tipos: venda a descoberto, opção, CFD alavancado, caixa em USD, Tesouro (marcação a mercado), bonificação, transferência, desdobramento, amortização, JCP com imposto retido
    const pos = await E(p, () => { const d = n => OS.U.addDays(OS.U.today(), -n), mk = (a, txs) => { const r = OS.add('assets', a); txs.forEach(t => OS.add('invtx', Object.assign({ asset: r.id }, t))); return OS.Inv.pos(r); };
      return { short: mk({ name: 'Curto', cls: 'Ação', currency: 'EUR', price: 12, priceDate: OS.U.today() }, [{ type: 'Venda', date: d(30), qty: 10, price: 10 }]),
        cover: mk({ name: 'Curto fechado', cls: 'Ação', currency: 'EUR', price: 7, priceDate: OS.U.today() }, [{ type: 'Venda', date: d(30), qty: 10, price: 10 }, { type: 'Compra', date: d(5), qty: 10, price: 8 }]),
        opt: mk({ name: 'Call', cls: 'Opção', mult: 100, currency: 'EUR', price: 4, priceDate: OS.U.today() }, [{ type: 'Compra', date: d(10), qty: 2, price: 3 }]),
        cfd: mk({ name: 'CFD', cls: 'CFD', alav: 10, currency: 'EUR', price: 110, priceDate: OS.U.today() }, [{ type: 'Compra', date: d(10), qty: 10, price: 100 }]),
        cash: mk({ name: 'Dólares', cls: 'Caixa em moeda estrangeira', currency: 'USD' }, [{ type: 'Compra', date: d(10), qty: 112, price: 1 }]),
        evts: mk({ name: 'Eventos', cls: 'Ação', currency: 'EUR', price: 5, priceDate: OS.U.today() }, [{ type: 'Compra', date: d(400), qty: 100, price: 10 }, { type: 'Desdobramento/Grupamento', date: d(300), ratio: 2 }, { type: 'Bonificação', date: d(200), qty: 10, price: 0 }, { type: 'Transferência (entrada)', date: d(100), qty: 40, price: 6 }, { type: 'Transferência (saída)', date: d(50), qty: 50 }, { type: 'JCP', date: d(20), amount: 100, tax: 15 }, { type: 'Amortização', date: d(10), amount: 40 }]) }; });
    ok('todos os tipos: venda a descoberto (ganha quando o preço cai, perde quando sobe)', Math.abs(pos.short.qty + 10) < 1e-9 && pos.short.short && Math.abs(pos.short.pl + 20) < 1e-6 && Math.abs(pos.cover.realized - 20) < 1e-6 && pos.cover.qty === 0, JSON.stringify(pos.short));
    ok('todos os tipos: opções com multiplicador e CFD alavancado (margem + resultado)', Math.abs(pos.opt.value - 800) < 1e-6 && Math.abs(pos.opt.pl - 200) < 1e-6 && Math.abs(pos.cfd.cost - 100) < 1e-6 && Math.abs(pos.cfd.value - 200) < 1e-6 && Math.abs(pos.cfd.lev - 11) < 1e-6, JSON.stringify([pos.opt, pos.cfd]));
    ok('todos os tipos: caixa em dólares convertida ao câmbio', Math.abs(pos.cash.value - 100) < .5, String(pos.cash.value));
    ok('todos os tipos: desdobramento, bonificação, transferências, amortização e JCP líquido', Math.abs(pos.evts.qty - 200) < 1e-9 && Math.abs(pos.evts.cost - 952) < 1e-6 && Math.abs(pos.evts.divs - 85) < 1e-6, JSON.stringify(pos.evts));
    ok('todos os tipos: formulário com os novos movimentos', await E(p, () => OS.S.invtx.fields.find(f => f.k === 'type').o.includes('Desdobramento/Grupamento') && OS.S.invtx.fields.some(f => f.k === 'tax') && OS.S.assets.fields.some(f => f.k === 'td') && OS.S.assets.fields.some(f => f.k === 'alav')));
    // alertas de preço e comparação
    await E(p, () => { OS.add('palerts', { s: 'VWCE.DE', k: 'acima', v: 150, r: 'uma', on: true, n: 'teste' }); OS.add('palerts', { s: 'VWCE.DE', k: 'abaixo', v: 100, r: 'uma', on: true }); OS.InvX.checkAlerts(); });
    ok('alertas: dispara quando o preço passa o alvo (e só esse)', await E(p, () => { const a = OS.all('palerts'); const up = a.find(x => x.k === 'acima'), dn = a.find(x => x.k === 'abaixo'); return up.on === false && !!up.firedAt && /171,14/.test(up.last) && dn.on === true && !dn.firedAt; }));
    await E(p, () => location.hash = 'investimentos.mercado'); await sleep(500);
    ok('alertas: painel no Mercado com estado', await E(p, () => /Alertas de preço/.test(document.querySelector('#view').textContent) && /disparado/.test(document.querySelector('#view').textContent)));
    await E(p, () => { OS.setUI('invCmp', ['VWCE.DE', 'TST.LS']); location.hash = 'investimentos.comparar'; }); await sleep(1500);
    ok('comparar: gráfico e tabela de rentabilidade, volatilidade e correlação', await E(p, () => { const t = document.querySelector('#view').textContent; return /Comparar ativos/.test(t) && /Volatilidade anual/.test(t) && /Correlação com VWCE\.DE/.test(t) && !!document.querySelector('#view .chart svg'); }));
    const dt = await E(p, () => { const a = OS.add('assets', { name: 'Day trade BR', ticker: 'DTBR', cls: 'Ação', currency: 'BRL', price: 10, priceDate: OS.U.today() }), y = OS.U.today().slice(0, 4);
      OS.add('invtx', { asset: a.id, type: 'Compra', date: y + '-01-05', qty: 100, price: 10 }); OS.add('invtx', { asset: a.id, type: 'Venda', date: y + '-01-05', qty: 100, price: 11 });
      OS.add('invtx', { asset: a.id, type: 'Compra', date: y + '-01-06', qty: 100, price: 10 }); OS.add('invtx', { asset: a.id, type: 'Venda', date: y + '-02-10', qty: 100, price: 9 }); return y; });
    await E(p, y => { OS.setUI('invTaxY', y); location.hash = 'investimentos.impostos'; }, dt); await sleep(500);
    ok('impostos BR: day trade detetado (20%) e prejuízo acumulado', await E(p, () => { const t = document.querySelector('#view').textContent; return /Day trade/.test(t) && /Prejuízo acumulado a compensar/.test(t) && /R\$ 100,00/.test(t); }));
    await E(p, () => location.hash = 'investimentos.impostos'); await sleep(400);
    ok('investimentos: impostos (mais-valias PT a 28%)', await E(p, () => { const t = document.querySelector('#view').textContent; return /Mais-valias realizadas/.test(t) && /28%/.test(t) && /DARF/.test(t); }));
    // IA de investimentos (Gemini simulado): perfil, mestres e verificação
    let invP = [];
    await ctx.route(/generativelanguage/, rt => { const b = rt.request().postData() || ''; if (/Explica em português de Portugal/.test(b)) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ pt: 'Empresa portuguesa que faz testes.' }) }] } }] }) }); if (/Pesquisa informação RECENTE/.test(b)) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '- resultados de 2024 subiram' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.com/r', title: 'Fonte de teste' } }] } }] }) }); if (!/assistente de investimentos|VERIFICADOR de conformidade/.test(b)) return rt.fallback(); const tx = JSON.parse(b).contents[0].parts[0].text; invP.push(tx);
      const ans = { nivel: 'atencao', veredicto: 'Mantém o ETF como núcleo.', resposta: 'Ok.', recomendacoes: [{ acao: 'aportar', alvo: 'ETF global', valor_eur: 200, porque: 'núcleo', mestres: ['Bogle'] }], riscos: ['x'], passos: ['y'], regras_aplicadas: ['R2'], mestres: [{ nome: 'John Bogle', ideia: 'Custos baixos.' }], divergencia: 'Lynch escolheria ações.', vies: null, confianca: 'alta', dados_em_falta: [] };
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(/VERIFICADOR/.test(tx) ? { aprovado: true, problemas: [], resposta_corrigida: ans } : ans) }] } }] }) }); });
    const oldKey2 = await E(p, () => OS.one('diet').aiKey || ''); await E(p, () => { OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); OS.setUI('iaWeb', false); location.hash = 'investimentos.ia'; }); await sleep(400);
    await p.click('#view [data-act=iaQuiz]'); await sleep(200);
    for (const k of ['obj', 'hor', 'queda', 'exp', 'res', 'rend', 'perda']) await p.click(`#view [data-act=iaAns][data-k=${k}][data-v="2"]`);
    await p.click('#view [data-act=iaQuizSave]'); await sleep(300);
    ok('IA investimentos: questionário de perfil (adequação)', await E(p, () => (OS.one('invcfg').perfil || {}).nome === 'Arrojado' && Object.keys(OS.one('invcfg').tgt || {}).length > 0));
    await p.click('#view [data-act=iaGo][data-k=diag]'); await sleep(1500);
    ok('IA investimentos: resposta com mestres, divergência e verificação em 2 passos', await E(p, () => { const t = document.querySelector('#view').textContent; return /Mantém o ETF como núcleo/.test(t) && /O que diriam os mestres/.test(t) && /John Bogle/.test(t) && /Onde discordam/.test(t) && /verificado em 2 passos/.test(t); }));
    ok('IA investimentos: condicionada pelo regulamento, mestres, perfil, risco e factos', invP.length >= 2 && /REGULAMENTO DE INVESTIMENTO/.test(invP[0]) && /BIBLIOTECA DOS MESTRES/.test(invP[0]) && /Warren Buffett/.test(invP[0]) && /Arrojado/.test(invP[0]) && /nota_risco_1a7/.test(invP[0]) && /VWCE/.test(invP[0]) && /VERIFICADOR/.test(invP[1]));
    // análise de empresas
    await E(p, () => { OS.setUI('invCo', 'TST.LS'); location.hash = 'investimentos.empresas'; }); await sleep(1500);
    ok('empresas: perfil, o que faz (traduzido), donos, gestão e analistas', await E(p, () => { const t = document.querySelector('#view').textContent; return /Teste SA/.test(t) && /Empresa portuguesa que faz testes/.test(t) && /Quem é dono/.test(t) && /Fundo X/.test(t) && /Ana Teste/.test(t) && /Analistas/.test(t); }));
    ok('empresas: demonstrações financeiras e múltiplos', await E(p, () => { const t = document.querySelector('#view').textContent; return /Demonstrações financeiras/.test(t) && /Lucro líquido/.test(t) && /2024/.test(t) && /P\/L/.test(t) && /ROE/.test(t); }));
    ok('empresas: preço justo de Graham (12,00) e preço-teto de Bazin (11,67)', await E(p, () => { const t = document.querySelector('#view .co-sc').textContent; return /12,00/.test(t) && /11,67/.test(t) && /Piotroski/.test(t); }));
    invP = []; await p.click('#view [data-act=invCoAI]'); await sleep(1800);
    ok('empresas: relatório da IA com pesquisa web, fontes e a carteira', await E(p, () => /Fonte de teste/.test(document.querySelector('#view .co-ai').textContent) && /Mantém o ETF como núcleo/.test(document.querySelector('#view .co-ai').textContent)) && invP.some(x => /empresa_em_analise/.test(x) && /Teste SA/.test(x) && /PESQUISA WEB RECENTE/.test(x)));
    await E(p, k => { OS.setOne('diet', { aiKey: k }); const c = OS.one('inbox'); Object.assign(c, c.__old || {}); delete c.__old; OS.touch('inbox'); }, oldKey2);
    // TAREFAS POR PROJETO
    await E(p, () => { const a = OS.add('projects', { name: 'Projeto Teste Casa', type: 'Pessoal', status: 'Em andamento', progMode: 'auto' }); OS.add('projects', { name: 'Curso Teste Python', type: 'Aprendizagem', status: 'Em andamento', progMode: 'auto' }); OS.add('tasks', { title: 'Empacotar livros teste', project: a.id, status: 'Próxima', prio: '3' }); OS.ui.tf = {}; location.hash = 'tarefas'; }); await sleep(400);
    await p.click('#view .tp-c:has-text("Projeto Teste Casa")'); await sleep(300);
    ok('tarefas: barra de projetos filtra pelo projeto', await E(p, () => /Empacotar livros teste/.test(document.querySelector('#view').textContent) && !!document.querySelector('#view .tp-head') && /Projeto Teste Casa/.test(document.querySelector('#view .tp-head').textContent)));
    await p.fill('#view form[data-form=quickTask] input', 'Contratar mudanças teste !1'); await p.press('#view form[data-form=quickTask] input', 'Enter'); await sleep(300);
    await E(p, () => { OS.setUI('tf', {}); }); await sleep(200); await p.fill('#view form[data-form=quickTask] input', 'Ver aula teste #cursoteste'); await p.press('#view form[data-form=quickTask] input', 'Enter'); await sleep(300);
    ok('tarefas: captura rápida dentro do projeto e com #projeto', await E(p, () => { const n = t => (OS.get('projects', (OS.all('tasks').find(x => x.title === t) || {}).project) || {}).name; return n('Contratar mudanças teste') === 'Projeto Teste Casa' && n('Ver aula teste') === 'Curso Teste Python'; }));
    await E(p, () => { location.hash = 'tarefas.projetos'; }); await sleep(400);
    ok('tarefas: vista por projeto', await E(p, () => [...document.querySelectorAll('#view .tp-sec h2')].some(h => /Curso Teste Python/.test(h.textContent)) && document.documentElement.scrollWidth <= innerWidth + 1));
    await E(p, () => { OS.setUI('tf', {}); }); await sleep(100);
    // QUEM SOU EU: entrevista (com perguntas de seguimento) e livro escrito capítulo a capítulo
    let meP = [];
    await ctx.route(/generativelanguage/, rt => { const b = rt.request().postData() || ''; if (!/biógrafo|editor do livro/.test(b)) return rt.fallback(); const tx = JSON.parse(b).contents[0].parts[0].text; meP.push(tx);
      const T = t => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] }) });
      if (/perguntas de seguimento/.test(tx)) return T(JSON.stringify({ q: ['Quem estava contigo nesse dia de teste?', 'O que sentiste nesse momento de teste?'] }));
      if (/editor do livro/.test(tx)) return T(JSON.stringify({ titulo: 'Ryan — a história', subtitulo: 'x', resumo: 'Estudante em Aveiro.', faltam: ['Pergunta da IA de teste?'] }));
      const ch = (tx.match(/capítulo \d+ — "([^"]+)"/) || [])[1] || '?', v2 = /NOVA RESPOSTA TESTE/.test(tx) ? ' Versão atualizada.' : '';
      return T(`Capítulo ${ch} escrito com o material.${v2} ` + 'Frase longa de teste para o capítulo ter corpo suficiente e parecer um livro a sério. '.repeat(8)); });
    await E(p, () => { OS.setOne('me', { birthplace: 'Teste Cidade', birth: '2005-03-10', qa: { ori0: 'Cresci em Teste Cidade, na casa da minha avó, com um quintal enorme.' } }); OS.add('people', { name: 'Pessoa Teste Mãe', rel: 'Mãe', close: 5, birthday: '1978' + OS.U.addDays(OS.U.today(), 2).slice(4) }); OS.add('lifeev', { title: 'Momento teste', date: '2024-09-01', cat: 'Mudança', imp: 5 }); location.hash = 'eu'; }); await sleep(400);
    ok('eu: retrato com idade, origem e aniversário próximo', await E(p, () => { const v = document.querySelector('#view').textContent; return !!document.querySelector('a[href="#eu"]') && /Teste Cidade/.test(v) && /Pessoa Teste Mãe/.test(v) && /daqui a 2 dias/.test(v); }));
    await E(p, () => { location.hash = 'eu.historia'; }); await sleep(300);
    ok('eu: linha do tempo por anos', await E(p, () => /Momento teste/.test(document.querySelector('#view .me-tl').textContent) && /Nasci em Teste Cidade/.test(document.querySelector('#view .me-tl').textContent)));
    await E(p, () => { location.hash = 'eu.entrevista'; }); await sleep(400);
    const iv = await E(p, () => ({ n: OS.Me.qList().length, q: (document.querySelector('#view .me-ivq') || {}).textContent || '' }));
    ok('eu: entrevista com mais de 200 perguntas, uma de cada vez (as respostas antigas mantêm-se)', iv.n >= 200 && !!iv.q && await E(p, () => OS.one('me').qa.ori0.length > 10), JSON.stringify(iv));
    await p.fill('#meqCur', 'A minha avó contava histórias da família todas as noites, à luz do candeeiro.'); await p.click('#view [data-act=meQSave]'); await sleep(900);
    ok('eu: depois de responder, a IA faz perguntas de seguimento sobre essa história', await E(p, () => /Quem estava contigo nesse dia de teste/.test(document.querySelector('#view .me-ivq').textContent) && (OS.one('me').fu || []).length === 2) && meP.some(t => /perguntas de seguimento/.test(t) && /candeeiro/.test(t)));
    await p.click('#view [data-act=meQSkip]'); await sleep(300);
    ok('eu: "Saltar" passa à pergunta seguinte', await E(p, () => /O que sentiste nesse momento de teste/.test(document.querySelector('#view .me-ivq').textContent)));
    meP = []; await E(p, () => { location.hash = 'eu.bio'; }); await sleep(300); await p.click('#view [data-act=meBioAI][data-mode=new]'); await sleep(2500);
    const bk = await E(p, () => { const b = OS.one('me').bio; return { book: b.book, ch: b.ch.map(c => c.t), todo: b.ch.filter(c => c.todo).length, stats: (document.querySelector('#view .me-stats') || {}).textContent || '' }; });
    const chP = meP.filter(t => /LIVRO da vida/.test(t)), pOf = n => chP.find(t => t.includes('"' + n + '"')) || '';
    ok('eu: o livro é escrito capítulo a capítulo, só com as partes que têm material', bk.book === 1 && bk.ch.join('|') === 'Raízes|Os primeiros anos|Uma nova vida em Portugal' && !bk.todo && chP.length === 3 && /3 capítulos/.test(bk.stats), JSON.stringify(bk));
    ok('eu: cada capítulo recebe só o seu material e a regra de não inventar', chP.every(t => /NUNCA inventes/.test(t)) && /Teste Cidade/.test(pOf('Os primeiros anos')) && !/Momento teste/.test(pOf('Os primeiros anos')) && /Momento teste/.test(pOf('Uma nova vida em Portugal')) && /candeeiro/.test(pOf('Raízes')));
    await p.click('#view .me-ch >> nth=0 >> .me-tx'); await sleep(250); await p.fill('#view .me-ta', 'Texto escrito por mim.'); await p.click('#view [data-act=meChDone]'); await sleep(300);
    await E(p, () => { const qa = OS.one('me').qa, q = OS.Me.qList().find(x => x.g === 'Portugal' && !qa[x.id]); qa[q.id] = 'NOVA RESPOSTA TESTE sobre a chegada.'; OS.touch('me'); }); meP = [];
    await p.click('#view [data-act=meBioAI][data-mode=upd]'); await sleep(2000);
    ok('eu: atualizar reescreve só o capítulo que mudou e respeita o que escrevi', await E(p, () => { const b = OS.one('me').bio; return b.ch[0].txt === 'Texto escrito por mim.' && b.ch[0].lock && /Versão atualizada/.test(b.ch[2].txt) && !/Versão atualizada/.test(b.ch[1].txt) && OS.one('mever').v.length >= 1; }) && meP.filter(t => /LIVRO da vida/.test(t)).length === 1);
    // ESTUDOS: CURSOS, CERTIFICAÇÕES, LEITURAS
    await ctx.route(/googleapis\.com\/books/, rt => rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ items: [{ id: 'g1', volumeInfo: { title: 'O Pequeno Príncipe', authors: ['Antoine de Saint-Exupéry'], publishedDate: '2015', pageCount: 96, categories: ['Juvenile Fiction'], description: 'Um piloto.' } }] }) }));
    await ctx.route(/openlibrary\.org\/search/, rt => rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ docs: [{ key: '/w/2', title: 'Dom Casmurro', author_name: ['Machado de Assis'], number_of_pages_median: 256 }] }) }));
    await E(p, () => { location.hash = 'leituras.buscar'; }); await sleep(300); await p.fill('#view [data-form=bkSearch] input', 'pequeno principe'); await p.press('#view [data-form=bkSearch] input', 'Enter'); await sleep(700);
    await p.click('#view .bk-r >> nth=0 >> [data-act=bkAdd][data-s=Lido]'); await sleep(200); await p.click('#view .bk-r >> nth=1 >> [data-act=bkAdd][data-own="1"]'); await sleep(200);
    ok('leituras: pesquisar livro e marcar já li / tenho na estante', await E(p, () => { const a = OS.all('books').find(x => x.title === 'O Pequeno Príncipe'), b = OS.all('books').find(x => x.title === 'Dom Casmurro'); return a && a.status === 'Lido' && a.pages === 96 && a.cats.includes('Infantojuvenil') && b && b.own === 'Tenho'; }));
    await E(p, () => { OS.ui.bk = OS.all('books').find(x => x.title === 'O Pequeno Príncipe').id; location.hash = 'leituras.livro'; }); await sleep(300); await p.fill('#bkRev', 'Resenha de teste.'); await p.press('#bkRev', 'Tab'); await sleep(200);
    await E(p, () => { location.hash = 'leituras.desafios'; }); await sleep(300); await p.click('#view [data-act=chNew][data-i="3"]'); await sleep(300);
    ok('leituras: resenha e desafio literário que conta o livro lido', await E(p, () => OS.all('books').find(x => x.title === 'O Pequeno Príncipe').review === 'Resenha de teste.' && /1 de 12 cumpridos/.test(document.querySelector('#view').textContent)));
    await E(p, () => { OS.add('learn', { title: 'Curso Teste', kind: 'Curso', status: 'Em curso', total: 1, done: 0, unit: 'aulas' }); OS.add('certs', { name: 'Cert Teste', issuer: 'Org', status: 'Obtida', date: '2025-01-01', cat: 'Outro' }); location.hash = 'cursos'; }); await sleep(300); await p.click('#view [data-act=cuStep]'); await sleep(200);
    ok('cursos e certificações', await E(p, () => OS.all('learn').find(x => x.title === 'Curso Teste').status === 'Concluído') && (await E(p, () => { location.hash = 'certificacoes'; }), await sleep(300), await E(p, () => /Cert Teste/.test(document.querySelector('#view').textContent))));
    // FLORESTA (foco ao estilo Forest)
    await E(p, () => { location.hash = 'floresta'; }); await sleep(800);
    ok('floresta: página abre com temporizador e 34 espécies', await E(p, () => /25:00|\d\d:00/.test(document.getElementById('foTime').textContent) && Object.keys(OS.Forest.SP).length >= 34 && !!document.querySelector('#view [data-act=foPlant]')));
    await E(p, () => { OS.one('forest').sp = 'natal'; OS.one('forest').mins = 25; OS.one('forest').tag = 's:' + (OS.all('subjects').find(s => s.status === 'Em curso') || OS.add('subjects', { name: 'Disciplina Floresta', status: 'Em curso' })).id; OS.touch('forest'); }); await sleep(300); await p.click('#view [data-act=foPlant]'); await sleep(500);
    await E(p, () => { OS.Forest.run().t0 = Date.now() - 25 * 60000 + 800; }); await sleep(2500);
    ok('floresta: árvore cresce até ao fim, dá moedas e regista estudo', await E(p, () => { const t = OS.all('trees').slice(-1)[0]; return t && t.alive && t.sp === 'natal' && t.mins === 25 && OS.one('forest').coins >= 30 && OS.all('sessions').some(x => /Floresta/.test(x.learned || '')) && /Plantaste/.test(document.querySelector('#view').textContent); }));
    await p.click('#view [data-act=foAgain]'); await sleep(300); await p.click('#view [data-act=foPlant]'); await sleep(400);
    await E(p, () => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); OS.Forest.run().hid = Date.now() - 90000; Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(500);
    ok('floresta: sair do Oceanum mata a árvore', await E(p, () => OS.all('trees').slice(-1)[0].alive === false && /morreu/.test(document.querySelector('#view').textContent)));
    await E(p, () => { delete document.hidden; location.hash = 'floresta.floresta'; }); await sleep(600);
    ok('floresta: a minha floresta e catálogo', await E(p, () => /árvore/.test(document.querySelector('#view .fo-ov').textContent)) && (await E(p, () => { location.hash = 'floresta.loja'; }), await sleep(400), await E(p, () => document.querySelectorAll('#view .fo-card').length >= 34)));
    // UNIVERSIDADE+
    let uP = [];
    await ctx.route(/generativelanguage/, rt => { const b = rt.request().postData() || ''; if (!/simulado de|flashcards excelentes|tutor universitário/.test(b)) return rt.fallback(); const tx = JSON.parse(b).contents[0].parts[0].text; uP.push(tx);
      const o = /flashcards excelentes/.test(tx) ? { cartoes: [{ frente: 'Taxa normal do IVA?', verso: '23%' }, { frente: 'Quem suporta o IVA?', verso: 'O consumidor final' }] } : /simulado de/.test(tx) ? { titulo: 'Simulado teste', perguntas: [{ pergunta: 'Taxa normal?', opcoes: ['6%', '13%', '23%', '21%'], certa: 2, explicacao: 'É 23%.' }] } : { titulo: 'Resposta', resposta: '**Ideia** principal' };
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] }) }); });
    const uS = await E(p, () => { const s = OS.add('subjects', { name: 'Disciplina Calc Teste', status: 'Em curso', target: 15, ects: 6 }); OS.add('assessments', { title: 'T1 calc', subject: s.id, date: OS.U.addDays(OS.U.today(), -5), weight: 40, grade: 12 }); OS.add('assessments', { title: 'Exame calc', subject: s.id, date: OS.U.addDays(OS.U.today(), 5), weight: 60, type: 'Exame', prep: 'Não comecei' }); OS.add('topics', { subject: s.id, title: 'Tema calc', status: 'Por estudar' }); OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); location.hash = 'universidade.notas'; return s.id; }); await sleep(500);
    ok('universidade: calculadora diz quanto precisas no exame', await E(p, () => [...document.querySelectorAll('#view .pn')].some(x => /Disciplina Calc Teste/.test(x.textContent) && /7,8/.test(x.textContent))));
    await E(p, s => { OS.ui.uePick = OS.all('assessments').find(a => a.title === 'Exame calc').id; location.hash = 'universidade.exames'; }, uS); await sleep(400); await p.click('#view [data-act=uePlanTasks]'); await sleep(400);
    ok('universidade: plano até ao exame vai para as tarefas', await E(p, () => OS.all('tasks').filter(t => t.examPlan).length >= 5 && /Tema calc/.test(document.querySelector('#view .un-plan').textContent)));
    await E(p, s => { OS.ui.fcS = s; location.hash = 'universidade.flashcards'; }, uS); await sleep(400); await p.fill('#view form[data-form=fcAI] input[name=deck]', 'IVA'); await p.click('#view form[data-form=fcAI] button'); await sleep(900); await p.click('#view [data-act=fcAIAdd]'); await sleep(300);
    await p.click('#view [data-act=fcStart]'); await sleep(300); await p.click('#view .fc-card'); await sleep(200); await p.click('#view .fc-r.good'); await sleep(300);
    ok('universidade: flashcards da IA e repetição espaçada', await E(p, s => OS.all('cards').filter(c => c.subject === s).length === 2 && OS.all('cards').some(c => c.subject === s && c.iv === 1), uS) && uP.some(x => /flashcards excelentes/.test(x)));
    await E(p, () => OS.act.fcStop()); await E(p, s => { OS.ui.qzS = s; location.hash = 'universidade.simulados'; }, uS); await sleep(400); await p.click('#view form[data-form=qzAI] button'); await sleep(900); await p.click('#view .qz-o >> nth=2'); await p.click('#view [data-act=qzDone]'); await sleep(400);
    ok('universidade: simulado da IA corrigido (20/20)', await E(p, () => /20,0/.test(document.querySelector('#view .un-score').textContent) && OS.all('quizzes').length >= 1));
    await E(p, () => OS.act.qzX()); await E(p, () => { location.hash = 'universidade'; }); await sleep(400);
    ok('universidade: visão com contagem decrescente e mapa de estudo', await E(p, () => /Contagem decrescente/.test(document.querySelector('#view').textContent) && document.querySelectorAll('#view .un-heat i').length > 150 && !!document.querySelector('#view a[href="#universidade.tutor"]')));
    await ctx.route(/generativelanguage/, rt => { const b = rt.request().postData() || ''; if (!/questões de escolha|orientador de estudo/.test(b)) return rt.fallback(); const o = /questões de escolha/.test(b) ? { questoes: [{ pergunta: 'Q banco 1?', opcoes: ['certa', 'b', 'c', 'd'], certa: 0, explicacao: 'x' }] } : { diagnostico: 'Diagnóstico de teste', focos: [{ tema: 'Tema calc', porque: 'p', exercicios: ['Exercício teste'], aulas: ['aula teste'] }], dicas: [], plano: '' };
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] }) }); });
    await E(p, s => { OS.ui.qbS = s; OS.ui.dpS = s; location.hash = 'universidade.questoes'; }, uS); await sleep(400); await p.click('#view form[data-form=qbAI] button'); await sleep(900); await p.click('#view [data-act=qbPlay][data-m=all]'); await sleep(300); await p.click('#view .qz-o >> nth=0'); await p.click('#view [data-act=qzDone]'); await sleep(300); await E(p, () => OS.act.qzX());
    await E(p, () => { location.hash = 'universidade.desempenho'; }); await sleep(400); await p.click('#view [data-act=dpAI]'); await sleep(900);
    ok('universidade: banco de questões, desempenho e recomendações', await E(p, s => OS.all('qbank').some(q => q.subject === s && q.n === 1) && OS.all('qlog').length >= 1 && /Onde tens de melhorar/.test(document.querySelector('#view').textContent) && /Diagnóstico de teste/.test(document.querySelector('#view').textContent), uS));
    // DESPORTO
    await E(p, () => { location.hash = 'desporto.novo'; }); await sleep(400); await p.click('#view .sp-pc[data-k=padel]'); await sleep(400);
    await p.click('#view [data-act=spTab][data-v=registar]'); await sleep(300); await p.selectOption('#view form[data-form=spLog] select[name=res]', 'Vitória'); await p.fill('#view input[name=st_setsG]', '2'); await p.click('#view form[data-form=spLog] button.pri'); await sleep(400);
    ok('desporto: adicionar padel e registar jogo com estatísticas', await E(p, () => { const s = OS.all('sports').find(x => x.key === 'padel'), l = OS.all('sportlog').find(x => x.sport === s.id); return l && l.res === 'Vitória' && l.st.setsG === 2 && /100%/.test(document.querySelector('#view').textContent); }));
    await p.click('#view [data-act=spTab][data-v=treinos]'); await sleep(300);
    ok('desporto: treinos específicos e auxílios', await E(p, () => /Saída de parede/.test(document.querySelector('#view').textContent)) && (await p.click('#view [data-act=spTab][data-v=ajuda]'), await sleep(300), await E(p, () => /Aquecimento/.test(document.querySelector('#view').textContent))));
    await E(p, () => { OS.add('runs', { date: OS.U.today(), type: 'Rodagem', km: 7, time: '35:00' }); const c = OS.all('sports').find(s => s.key === 'corrida') || OS.add('sports', { key: 'corrida' }); OS.ui.spId = c.id; OS.ui.spTab = ''; location.hash = 'desporto.sp'; }); await sleep(500);
    ok('desporto: corrida preenche-se sozinha com a aba Corrida', await E(p, () => /Rodagem/.test(document.querySelector('#view').textContent) && OS.Sport.logs(OS.ui.spId).some(l => l.virtual && l.st.km === 7 && l.st.ritmo === 5)));
    // FRASES, HÁBITOS, TRABALHO+
    await E(p, () => { location.hash = 'visao'; }); await sleep(400);
    ok('visão geral: frase forte e verdade do dia', await E(p, () => !!document.querySelector('#view .q-push') && !!document.querySelector('#view .q-truth')));
    await E(p, () => { OS.add('habits', { name: 'Hábito teste hoje', active: true, freq: 'Diário', days: ['0', '1', '2', '3', '4', '5', '6'] }); location.hash = 'habitos'; }); await sleep(400);
    await E(p, () => { const h = OS.all('habits').find(x => x.name === 'Hábito teste hoje'); OS.act.habit({ dataset: { id: h.id, d: OS.U.addDays(OS.U.today(), -1) } }); OS.act.habit({ dataset: { id: h.id, d: OS.U.today() } }); }); await sleep(300);
    ok('hábitos: só se marca o dia de hoje', await E(p, () => { const h = OS.all('habits').find(x => x.name === 'Hábito teste hoje'), k = Object.keys(h.log || {}); return k.length === 1 && k[0] === OS.U.today(); }));
    await E(p, () => { location.hash = 'trabalho.horario'; }); await sleep(400); await p.click('#view [data-act=wsOff] >> nth=0'); await sleep(300);
    ok('trabalho: horário e folgas', await E(p, () => OS.all('dayoffs').length >= 1 && /Folga/.test(document.querySelector('#view .ws-cal').textContent)));
    // BLOCO DE FOCO
    await E(p, () => { OS.add('tasks', { title: 'Pendência bloco teste', status: 'Próxima', prio: '1', due: OS.U.addDays(OS.U.today(), -2), effort: 15 }); location.hash = 'foco'; }); await sleep(400);
    ok('bloco de foco: pendências por prioridade', await E(p, () => [...document.querySelectorAll('#view .fb-it .fb-t b')].some(x => x.textContent === 'Pendência bloco teste')));
    await p.click('#view [data-act=fbGo]'); await sleep(400);
    await E(p, () => { const B = OS.FocusBlock.state(); B.end = Date.now() - 500; OS.FocusBlock._set(B); }); await sleep(1300);
    ok('bloco de foco: no fim do tempo pergunta se terminaste', await E(p, () => /Terminaste\?/.test(document.getElementById('fblk').textContent)));
    await p.click('#fblk [data-act=fbNo]'); await sleep(200); await p.click('#fblk [data-act=fbMore][data-m="5"]'); await sleep(200);
    ok('bloco de foco: "ainda não" acrescenta tempo', await E(p, () => { const B = OS.FocusBlock.state(); return B.phase === 'run' && B.items[B.i].extra === 5; }));
    await p.click('#fblk [data-act=fbExit]'); await sleep(200); await p.fill('#fbCode', 'errado'); await p.click('#fblk .fb-code button'); await sleep(400);
    ok('bloco de foco: sair sem código certo não deixa', await E(p, () => OS.FocusBlock.state().phase === 'exit'));
    await p.fill('#fbCode', 'teste1234'); await p.click('#fblk .fb-code button'); await sleep(500); await p.click('#fblk [data-act=fbClose]'); await sleep(300);
    ok('bloco de foco: código certo sai e grava o histórico', await E(p, () => !OS.FocusBlock.state() && OS.all('focusblocks').length >= 1 && document.getElementById('fblk').hidden));
    // SPYKE + E-MAIL
    await E(p, () => { OS.Spyke.handle('anota ligar à avó amanhã'); }); await sleep(400);
    ok('spyke: "anota…" cria tarefa', await E(p, () => OS.all('tasks').some(t => /ligar à avó/i.test(t.title))));
    await E(p, () => { OS.Spyke.handle('abre a floresta'); }); await sleep(400);
    ok('spyke: abre páginas por voz', await E(p, () => location.hash === '#floresta'));
    ok('spyke: resumo do dia', await E(p, () => /prioridade|agenda/i.test(OS.Spyke.brief())));
    await E(p, () => OS.Spyke.close());
    await E(p, () => { const d = new Date().toISOString(); OS.Mail._set({ at: Date.now(), items: [{ id: 'z1', s: 'Último aviso: pagamento em atraso', f: 'Banco <b@b.pt>', d, u: true, sn: 'regularize' }, { id: 'z2', s: '50% desconto', f: 'Loja <news@l.pt>', d, u: false, sn: 'unsubscribe' }], ai: {}, sum: '' }); location.hash = 'email'; }); await sleep(400);
    ok('e-mail: separa urgente e promoções (sem IA)', await E(p, () => OS.Mail.counts().urg === 1 && OS.Mail.items().some(x => x.c === 'promo') && !!document.querySelector('#view .ml-it.c-urgente')));
    ok('e-mail: urgente aparece no Control Room', await E(p, () => OS.Intel.alerts().some(a => a.area === 'E-mail')));
    ok('google script completo é JavaScript válido', await E(p, () => { try { new Function(OS.Inbox.script('abc')); return true; } catch (e) { return false; } }));
    const gp = await E(p, () => { const P = OS.Inbox.parts('abc'), full = OS.Inbox.script('abc'), v = t => { try { new Function(t); return true; } catch (e) { return false; } };
      return { P, n: P.length, ok: P.map(v), len: P.map(x => x.length), same: (P[0] + P[1].replace(/^\/\/ Oceanum · parte 2[^\n]*\n/, '') + P[2] + P[3] + P[4] + P[5] + P[6]).replace(/\s+/g, '') === full.replace(/\s+/g, ''), key1: /const KEY = 'abc'/.test(P[0]), core: OS.Inbox.core('abc').length, addon: OS.Inbox.addon() === P[2] && OS.Inbox.addon4() === P[3] && OS.Inbox.addon5() === P[4] && OS.Inbox.addon6() === P[5] && OS.Inbox.addon7() === P[6] }; });
    ok('script em 7 partes: 1 e 2 = núcleo, 3 a 7 = ficheiros das novidades; cada parte é JavaScript válido e juntas dão o código completo', gp.n === 7 && gp.ok.every(Boolean) && gp.same && gp.key1 && gp.addon, JSON.stringify(Object.assign({}, gp, { P: undefined })));
    ok('script em 7 partes: cada parte tem menos de 15 mil caracteres (não é cortada ao colar no telemóvel)', gp.len.every(l => l < 15000), gp.len.join(' + '));
    { // como o Apps Script: cada ficheiro é carregado à parte, pela ordem; a Parte 3 substitui o doGet e liga-se às funções das partes 1 e 2
      const vm = require('vm'), ctx = vm.createContext({ ContentService: { createTextOutput: t => ({ t, setMimeType() { return this; } }), MimeType: { JSON: 1 } } });
      Object.assign(ctx, { PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) }, ScriptApp: { getScriptId: () => 'ID' } });
      vm.runInContext(gp.P[0], ctx); vm.runInContext(gp.P[1], ctx); const before = vm.runInContext("doGet({ parameter: { k: 'abc', op: 'ping' } }).t", ctx); vm.runInContext(gp.P[2], ctx); vm.runInContext(gp.P[3], ctx);
      const r = vm.runInContext("[doGet({ parameter: { k: 'abc', op: 'ping' } }).t, doPost({ parameter: { k: 'abc', op: 'ping' } }).t, doGet({ parameter: { k: 'x', op: 'ping' } }).t, typeof mensagem_, typeof eventos_, typeof noticias_, typeof cotacoes_]", ctx);
      ok('script: a Parte 4 (Outlook) liga-se às outras e responde', /"v":12/.test(vm.runInContext("doGet({ parameter: { k: 'abc', op: 'olinfo' } }).t", ctx)) && /usercallback/.test(vm.runInContext("doGet({ parameter: { k: 'abc', op: 'olinfo' } }).t", ctx)));
      ok('script: só com as partes 1 e 2 responde versão 10; com a Parte 3 num ficheiro novo responde versão 11 (sem apagar nada)', /"v":10/.test(before) && /"v":11/.test(r[0]) && /"v":11/.test(r[1]) && /Chave errada/.test(r[2]) && r.slice(3).every(x => x === 'function'), before + ' → ' + r.join(' | '));
      vm.runInContext("function op_novo(p) { return { ok: true, eco: p.x }; }", ctx);
      ok('script: novidades futuras entram num ficheiro novo (function op_nome) sem mexer na Parte 3', /"eco":"7"/.test(vm.runInContext("doGet({ parameter: { k: 'abc', op: 'novo', x: '7' } }).t", ctx))); }
    // SPYKE+: memória, rotinas, balanço da noite, modo Jarvis, eventos do e-mail
    await E(p, () => OS.Spyke.handle('lembra-te que gosto de estudar de manhã')); await sleep(300);
    ok('spyke: memória guarda o que lhe dizes', await E(p, () => OS.all('spymem').some(m => /estudar de manhã/.test(m.text))));
    await E(p, () => { OS.add('spyroutines', { phrase: 'rotina teste', steps: 'abre a floresta', reply: 'Feito.' }); OS.Spyke.handle('rotina teste'); }); await sleep(500);
    ok('spyke: rotina de voz corre os passos', await E(p, () => location.hash === '#floresta'));
    ok('spyke: balanço da noite', await E(p, () => /balanço de hoje/.test(OS.Spyke.evening())));
    await E(p, () => { OS.Spyke.close(); OS.Jarvis.open(); }); await sleep(700);
    ok('modo Jarvis abre com os painéis', await E(p, () => !document.getElementById('jv').hidden && document.querySelectorAll('#jv .jv-c').length >= 7));
    await p.click('#jv [data-act=jvClose]'); await sleep(200);
    ok('modo Jarvis: o X fecha e o botão fica no canto', await E(p, () => document.getElementById('jv').hidden && !document.getElementById('jvFab').hidden));
    ok('e-mail: eventos dos e-mails no calendário', await E(p, () => { const d = OS.U.addDays(OS.U.today(), 3); OS.add('mailevents', { mid: 'x1', title: 'Reunião do e-mail', date: d, start: '15:00' }); return OS.Cal.items(d, d).some(x => x.src === 'mail'); }));
    // LIGAÇÕES ENTRE ÁREAS
    ok('ligações: apagar projeto deixa as tarefas sem projeto', await E(p, () => { const pr = OS.add('projects', { name: 'PL', status: 'Em andamento' }); const t = OS.add('tasks', { title: 'TL', status: 'Próxima', project: pr.id }); OS.del('projects', pr.id); return OS.get('tasks', t.id).project === ''; }));
    ok('ligações: data da avaliação move o plano de estudo', await E(p, () => { const U = OS.U, t = U.today(), a = OS.add('assessments', { title: 'TL', type: 'Teste', date: U.addDays(t, 10) }); const k = OS.add('tasks', { title: 'plano', status: 'Próxima', sched: U.addDays(t, 5), examPlan: a.id }); OS.upd('assessments', a.id, { date: U.addDays(t, 12) }); const r = OS.get('tasks', k.id).sched === U.addDays(t, 7); OS.del('assessments', a.id); return r && !OS.get('tasks', k.id); }));
    ok('ligações: turno e folga no mesmo dia não coexistem', await E(p, () => { const d = OS.U.addDays(OS.U.today(), 5); const o = OS.add('dayoffs', { date: d, kind: 'Folga' }); OS.add('shifts', { date: d, start: '10:00', end: '18:00' }); return !OS.get('dayoffs', o.id); }));
    ok('ligações: oportunidade submetida cria candidatura', await E(p, () => { const o = OS.add('opps', { name: 'Estágio L', inst: 'X', kind: 'Estágio', status: 'A preparar' }); OS.upd('opps', o.id, { status: 'Submetida' }); return OS.all('applications').some(a => a.opp === o.id); }));
    // FÉ & DEVOÇÃO
    let feP = [];
    await ctx.route(/generativelanguage/, rt => { const b = rt.request().postData() || ''; if (/Explica o versículo do dia/.test(b)) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ contexto: 'Contexto de teste.', significado: 'Significado de teste.', hoje: 'Vive isto hoje.' }) }] } }] }) }); if (!/conselheiro devocional|mestre da Palavra/.test(b)) return rt.fallback(); const tx = JSON.parse(b).contents[0].parts[0].text; feP.push(tx);
      const ans = /mestre da Palavra/.test(tx) ? { contexto: 'Carta de Paulo.', mensagem: 'Nada nos separa do amor de Deus.', licoes: ['Identidade em Cristo'], perguntas: ['O que te pesa?'], oracao: 'Obrigado, Senhor.', ligacoes: ['Salmos 23'] } : { frase: 'Um passo de cada vez, com Deus.', ref: { livro: 'MAT', cap: 11, v1: 28, v2: 28 }, porque: 'Tens um exame em breve.', reflexao: 'Jesus convida os cansados.', oracao: 'Dá-me descanso.', passo: 'Ora antes de estudar.', alerta: null };
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(ans) }] } }] }) }); });
    await E(p, () => location.hash = 'fe'); for (let i = 0; i < 20 && !(await E(p, () => !!OS.Faith.bible())); i++) await sleep(300); await sleep(400);
    ok('fé: aba no menu, versículo do dia com o texto da Bíblia', await E(p, () => { const v = document.querySelector('#view .fe-v'); const R = OS.Faith.vod(); return !!document.querySelector('a[href="#fe"]') && !!v && v.textContent.includes(OS.Faith.textOf(R).slice(0, 30)) && /Versículo do dia/.test(v.textContent); }));
    await sleep(700);
    ok('fé: versículo do dia com explicação e aplicação para hoje', await E(p, () => /Significado de teste/.test(document.querySelector('#view .fe-v').textContent) && /Para hoje/.test(document.querySelector('#view .fe-v').textContent)));
    ok('fé: Bíblia completa (66 livros, 31 102 versículos)', await E(p, () => { const B = OS.Faith.bible(); return B.b.length === 66 && B.b.reduce((s, b) => s + b[3].reduce((a, c) => a + c.length, 0), 0) === 31102 && /amou ao mundo/.test(OS.Faith.textOf(OS.Faith.parseRef('JHN 3:16'))); }));
    const oldK = await E(p, () => OS.one('diet').aiKey || ''); await E(p, () => OS.setOne('diet', { aiKey: '' })); await sleep(200);
    await p.click('#view [data-act=feMood][data-m=ansioso]'); await sleep(200); await p.click('#view [data-act=feWord]'); await sleep(400);
    ok('fé: palavra para hoje sem IA, escolhida pelo estado de alma', await E(p, () => { const w = OS.one('faith').word; return w && w.date === OS.U.today() && OS.FaithData.mood.ansioso.includes(w.ref) && /Entrega a Deus/.test(document.querySelector('#view .fe-word').textContent); }));
    await E(p, () => { OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); OS.add('assessments', { title: 'Exame de Teste da Fé', date: OS.U.addDays(OS.U.today(), 2) }); }); await sleep(200); await p.click('#view [data-act=feWord]'); await sleep(900);
    ok('fé: palavra da IA usa o dia real (avaliações, alertas) e o texto vem da Bíblia instalada', await E(p, () => { const w = OS.one('faith').word, t = document.querySelector('#view .fe-word').textContent; return w.ai && w.ref === 'MAT 11:28' && /Vinde a mim/.test(t) && /Um passo de cada vez/.test(t); }) && feP.some(x => /Exame de Teste da Fé/.test(x) && /ansioso/.test(x)));
    await E(p, () => { location.hash = 'fe.biblia'; }); await sleep(300); await p.fill('#view [data-form=feSearch] input', 'Romanos 8:28'); await p.click('#view [data-form=feSearch] button'); await sleep(400);
    ok('fé: ir para uma passagem escrita por extenso (Romanos 8:28)', await E(p, () => OS.ui.bRef === 'ROM.8' && (OS.ui.bSel || []).includes(28) && /Romanos 8/.test(document.querySelector('#view .fe-read h2').textContent)));
    await p.click('#view [data-act=feHl][data-c=g]'); await sleep(300);
    ok('fé: destacar versículo', await E(p, () => OS.all('bmarks').some(m => m.ref === 'ROM.8.28' && m.color === 'g') && !!document.querySelector('#view .fe-vs.hl-g')));
    await E(p, () => { OS.U.ls.set('oc_fefs', 18); OS.request(); }); await sleep(200); for (let i = 0; i < 3; i++) { await p.click('#view [data-act=feFs][data-d="-1"]'); await sleep(150); }
    ok('fé: leitor diminui a letra (A−) até 12px, barra sempre visível', await E(p, () => getComputedStyle(document.querySelector('#view .fe-read')).fontSize === '12px' && document.querySelector('#view [data-act=feFs][data-d="-1"]').disabled && getComputedStyle(document.querySelector('#view .fe-rbar')).position === 'sticky'));
    await p.click('#view .fe-pct'); await sleep(200); await p.click('#view [data-act=feMode]'); await sleep(200); await p.click('#view [data-act=feCol][data-c=p]'); await sleep(150); await p.click('#view .fe-vs[data-v="1"]'); await sleep(250);
    await E(p, () => { const t = document.querySelector('#view .fe-t[data-v="2"]').firstChild, r = document.createRange(); r.setStart(t, 2); r.setEnd(t, 9); getSelection().removeAllRanges(); getSelection().addRange(r); }); await sleep(350); await p.click('#feSelHl'); await sleep(300);
    ok('fé: modo grifar (versículo inteiro e só palavras selecionadas)', await E(p, () => OS.all('bmarks').some(m => m.ref === 'ROM.8.1' && m.color === 'p' && !m.w) && OS.all('bmarks').some(m => m.ref === 'ROM.8.2' && m.w) && !!document.querySelector('#view .fe-t[data-v="2"] mark.hl-p')));
    await p.click('#view [data-act=feMode]'); await sleep(200); await p.click('#view .fe-vs[data-v="3"]'); await sleep(200); await p.click('#view [data-act=feNoteV]'); await sleep(250); await p.fill('#feNoteIn', 'Nota de teste dentro do texto'); await p.click('#view [data-act=feNoteDone]'); await sleep(300);
    ok('fé: nota escrita dentro do texto e guardada', await E(p, () => OS.all('bmarks').some(m => m.ref === 'ROM.8.3' && m.note === 'Nota de teste dentro do texto') && /Nota de teste/.test(document.querySelector('#view .fe-read .fe-ni').textContent)));
    await p.fill('#view [data-form=feSearch] input', 'ansiosos'); await p.click('#view [data-form=feSearch] button'); await sleep(500);
    ok('fé: pesquisa de palavras em toda a Bíblia', await E(p, () => document.querySelectorAll('#view .fe-sr .li').length >= 1 && /ansiosos/i.test(document.querySelector('#view .fe-sr').textContent)));
    await E(p, () => OS.act.feRead({ dataset: { r: 'ROM.8' } })); await E(p, () => { location.hash = 'fe.devocional'; }); await sleep(300);
    await p.fill('#view [data-dv=ref]', 'Salmos 23'); await p.press('#view [data-dv=ref]', 'Tab'); await p.fill('#view [data-dv=app]', 'Descansar em Deus hoje'); await p.press('#view [data-dv=app]', 'Tab'); await sleep(300);
    ok('fé: devocional guarda sozinho e mostra a passagem', await E(p, () => { const d = OS.all('devos').find(x => x.date === OS.U.today()); return d && d.ref === 'Salmos 23' && d.app === 'Descansar em Deus hoje' && /meu pastor/.test(document.querySelector('#view .fe-pass').textContent); }));
    await p.click('#view [data-act=feReflect]'); await sleep(800);
    ok('fé: reflexão da IA sobre a leitura', await E(p, () => /Nada nos separa/.test(document.querySelector('#view .fe-refl').textContent)) && feP.some(x => /mestre da Palavra/.test(x) && /Salmos 23/.test(x)));
    await E(p, () => { const r = OS.add('prayers', { title: 'Pela família', who: 'Família', date: OS.U.today(), status: 'A orar' }); OS.upd('prayers', r.id, { status: 'Respondida', answer: 'Deus cuidou' }); OS.S.prayers.after(OS.get('prayers', r.id)); location.hash = 'fe.oracoes'; }); await sleep(300);
    ok('fé: pedidos de oração e respondidas', await E(p, () => /Respondidas/.test(document.querySelector('#view').textContent) && /Pela família/.test(document.querySelector('#view').textContent) && !!OS.all('prayers').find(x => x.title === 'Pela família').answeredAt));
    await E(p, () => { location.hash = 'fe.planos'; }); await sleep(300); await p.click('#view [data-act=fePlan][data-k=evang]'); await sleep(300);
    ok('fé: plano de leitura com o dia de hoje e progresso', await E(p, () => /Evangelhos em 30 dias/.test(document.querySelector('#view').textContent) && document.querySelectorAll('#view .fe-days button').length === 30 && /1 de 1189|1 de 1 189/.test(document.querySelector('#view').textContent)));
    await E(p, () => { location.hash = 'fe'; }); await sleep(300); await p.fill('#view [data-dv=note]', 'às vezes não quero mais viver'); await p.press('#view [data-dv=note]', 'Tab'); await sleep(300);
    ok('fé: sinais de crise mostram contactos de ajuda', await E(p, () => /SOS Voz Amiga/.test(document.querySelector('#view').textContent)));
    await E(p, k => { OS.setOne('diet', { aiKey: k }); const d = OS.all('devos').find(x => x.date === OS.U.today()); OS.upd('devos', d.id, { note: '' }); location.hash = 'hoje'; }, oldK); await sleep(400);
    ok('fé: versículo do dia na página Hoje', await E(p, () => !!document.querySelector('#view .fe-mini')));
    // JORNAL
    const NOW = Date.now(), mkN = (p, n) => Array.from({ length: n }, (_, i) => ({ t: `${p} notícia ${i + 1}`, s: 'Jornal ' + (i % 3), su: 'https://exemplo.pt', l: 'https://exemplo.pt/' + p + i, d: NOW - i * 36e5, rel: i ? [] : [{ t: 'Outra fonte', s: 'Outro', l: 'https://o.pt' }] }));
    let nwCall = 0;
    await ctx.route(/script\.google\.com/, rt => { const u = new URL(rt.request().url()); if (u.searchParams.get('op') !== 'nw') return rt.fallback(); nwCall++; const f = JSON.parse(u.searchParams.get('f') || '[]'), o = {};
      f.forEach(x => { o[x.id] = x.q ? mkN('Tema ' + x.q, 5) : /JP:ja/.test(x.ed || '') ? mkN('日本', 6) : mkN(x.id + (nwCall > 3 && x.id === 'PT:WORLD' ? ' NOVA' : ''), 12); });
      rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, nw: o }) }); });
    let nwP = [];
    await ctx.route(/generativelanguage/, rt => { const b = rt.request().postData() || ''; if (!/editor de um jornal|Traduz para português de Portugal estes títulos/.test(b)) return rt.fallback(); const tx = JSON.parse(b).contents[0].parts[0].text; nwP.push(tx);
      const ans = /editor de um jornal/.test(tx) ? { titulo: 'Um dia cheio no mundo', pontos: [{ titulo: 'Assunto principal', resumo: 'Resumo.', porque: 'Importa.', idx: [0, 1] }], para_ti: 'Fica atento.' } : { t: JSON.parse(tx.slice(tx.indexOf('Títulos: ') + 9)).map((x, i) => 'Título traduzido ' + (i + 1)) };
      rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(ans) }] } }] }) }); });
    const oldK3 = await E(p, () => OS.one('diet').aiKey || ''), oldIb = await E(p, () => { const c = OS.one('inbox'), o = { url: c.url, key: c.key }; c.url = 'https://script.google.com/macros/s/TESTE/exec'; c.key = 'k'; OS.touch('inbox'); OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); return o; });
    await E(p, () => location.hash = 'jornal'); await sleep(1500);
    ok('jornal: notícias do mundo com fontes e hora', await E(p, () => { const t = document.querySelector('#view').textContent; return !!document.querySelector('a[href="#jornal"]') && document.querySelectorAll('#view .nw-c').length >= 20 && /PT:WORLD notícia 1/.test(t) && /BR:WORLD notícia 1/.test(t) && /há 1 h|agora/.test(t) && /\+1 fonte/.test(t); }));
    ok('jornal: "O essencial agora" feito pela IA só com as manchetes', await E(p, () => /Um dia cheio no mundo/.test(document.querySelector('#view .nw-brief').textContent)) && nwP.some(x => /editor de um jornal/.test(x) && /PT:WORLD notícia 1/.test(x)));
    await E(p, () => { OS.act.nwTopic({ dataset: { v: 'BUSINESS' } }); }); await sleep(900);
    ok('jornal: temas (economia)', await E(p, () => /PT:BUSINESS notícia 1/.test(document.querySelector('#view').textContent)));
    await E(p, () => OS.forms.nwTheme(null, k => k === 'q' ? 'Aveiro' : '')); await sleep(900);
    ok('jornal: tema próprio por pesquisa', await E(p, () => /Tema Aveiro notícia 1/.test(document.querySelector('#view').textContent) && OS.one('news').themes.includes('Aveiro')));
    await p.click('#view [data-act=nwAddTab]'); await sleep(300); await p.click('#modal [data-act=nwPick][data-v=JP]'); await sleep(1800);
    ok('jornal: "+ País" cria um separador com as notícias desse país, traduzidas', await E(p, () => OS.one('news').tabs.includes('JP') && /Japão/.test(document.querySelector('#view .nw-tabs').textContent) && /Título traduzido 1/.test(document.querySelector('#view').textContent) && /日本 notícia 1/.test(document.querySelector('#view').textContent)));
    await E(p, () => { OS.setUI('nwTab', 'W'); OS.setUI('nwTopic', 'TOP'); }); await sleep(300); await E(p, () => OS.act.nwRefresh()); await sleep(1200);
    ok('jornal: notícias novas aparecem marcadas ao atualizar', await E(p, () => /NOVA/.test(document.querySelector('#view').textContent) && document.querySelectorAll('#view .nw-c .bdg.pos').length >= 1));
    await E(p, ([k, ib]) => { OS.setOne('diet', { aiKey: k }); const c = OS.one('inbox'); Object.assign(c, ib); OS.touch('inbox'); }, [oldK3, oldIb]);
    // corrida do relógio (Aurea Fit → Saúde → atalho)
    await E(p, () => { location.hash = 'corrida-add?km=5,2&seg=1860&bpm=152&kcal=410&data=10/01/2025'; }); await sleep(900);
    ok('relógio: o atalho abre a corrida já preenchida', await E(p, () => { const f = document.querySelector('#osform'); return !!f && f.querySelector('[name=km]').value.replace(',', '.') == '5.2' && /31:00/.test(f.querySelector('[name=time]').value) && f.querySelector('[name=hr]').value == '152'; }));
    await E(p, () => document.querySelector('#osform').requestSubmit()); await sleep(400);
    ok('relógio: corrida guardada com ritmo 5:58 /km', await E(p, () => { const r = OS.all('runs').find(x => x.date === '2025-01-10' && x.km == 5.2); return r && r.time === 1860 && OS.RunLink.pace(r) === '5:58 /km'; }));
    await E(p, () => { location.hash = 'corrida-add?km=5,2&seg=1860&data=2025-01-10'; }); await sleep(900);
    ok('relógio: não regista a mesma corrida duas vezes', await E(p, () => OS.all('runs').filter(x => x.date === '2025-01-10').length === 1 && !document.querySelector('#osform')));
    ok('relógio: a Corrida só mostra as corridas (o guia do relógio saiu)', await E(p, () => !/Ligar o relógio/.test(document.querySelector('#view').textContent)));
    await E(p, () => location.hash = 'definicoes.atalhos'); await sleep(400);
    ok('relógio: instruções em Definições → Atalhos do iPhone', await E(p, () => /Ligar o relógio/.test(document.querySelector('#view').textContent) && !!document.getElementById('runSet')));
    // alongamentos
    await E(p, () => location.hash = 'corrida.alongamentos'); await sleep(400);
    ok('alongamentos com fotos', await E(p, () => document.querySelectorAll('#view .st-c .exi img').length >= 10));
    await p.click('#view [data-act=stPlay][data-kind=post]'); await sleep(400);
    for (let i = 0; i < 12; i++) { if (await p.$('#stPlay [data-pl=done]')) break; await p.click('#stPlay [data-pl=next]'); await sleep(120); }
    await p.click('#stPlay [data-pl=done]'); await sleep(300);
    ok('rotina guiada de alongamentos registada', await E(p, () => OS.all('stretches').length === 1 && OS.all('stretches')[0].kind === 'Depois da corrida'));
    // tudo ligado
    ok('meta de calorias sobe nos dias de treino', await E(p, () => OS.BodyX.burn(OS.U.today()) > 0 && OS.BodyX.target(OS.U.today()).adj > 0));
    await E(p, () => location.hash = 'corpo'); await sleep(600);
    ok('corpo: calendário de disciplina na visão', await E(p, () => document.querySelectorAll('#view .dc-cal .dc-d').length > 100 && !!document.querySelector('#view .dc-score')));
    { const had = await E(p, () => !!OS.BodyGoals.days()[OS.U.today()]); if (!had) { await p.click('#view [data-act=bgWent]'); await sleep(300); }
      ok('corpo: "Fui hoje" marca o dia', await E(p, () => !!OS.BodyGoals.days()[OS.U.today()] && document.querySelectorAll('#view .dc-d.today.w, #view .dc-d.today.r, #view .dc-d.today.c, #view .dc-d.today.wr').length === 1)); }
    await E(p, () => location.hash = 'corpo.desafios'); await sleep(400); await E(p, () => OS.act.bgChalNew()); await sleep(200); await p.click('#modal input[value=acucar]'); await p.click('#modal form button.btn.pri'); await sleep(300);
    await E(p, () => document.querySelector('#view [data-act=bgChalTick]').click()); await sleep(300);
    ok('desafio: começa e marca o dia', await E(p, () => { const c = OS.all('bchal')[0]; return c && c.name === 'Sem açúcar 21 dias' && OS.BodyGoals.chal(c).prog === 1; }));
    await E(p, () => OS.act.bgChalNew()); await sleep(200); await p.click('#modal form button.btn.pri'); await sleep(300);
    ok('desafio automático conta os dias em que foste', await E(p, () => { const c = OS.all('bchal').find(x => x.tpl === 'presenca'); return c && OS.BodyGoals.chal(c).prog === 1; }));
    await E(p, () => OS.act.bgGoalNew()); await sleep(200); await p.fill('#gl_t', '76'); await p.click('#modal form button.btn.pri'); await sleep(300);
    ok('meta do corpo com progresso e ritmo semanal', await E(p, () => { const g = OS.all('bgoals')[0]; const x = g && OS.BodyGoals.goal(g); return x && x.cur > 0 && x.perW != null; }));
    await E(p, () => location.hash = 'corpo'); await sleep(500);
    ok('visão do corpo: treino, dieta, corrida e recomendações', await E(p, () => { const t = document.querySelector('#view').textContent; return /Esta semana/.test(t) && /Energia/.test(t) && document.querySelectorAll('#view .bxs').length === 6; }));
    ok('sem erros de JavaScript (corpo)', !errs.length, errs.slice(0, 3).join(' | '));
    await ctx.close(); }
  // manifesto
  { const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8')); ok('manifesto sem orientação forçada', !('orientation' in m));
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), list = JSON.parse(sw.match(/SHELL = (\[.*?\]);/)[1]); const miss = list.filter(f => f !== './' && !fs.existsSync(path.join(ROOT, f)));
    ok('todos os ficheiros da cache offline existem', !miss.length, miss.join(', ')); }
}

/* ================= COBERTURA POR ÁREA: a lógica de cada parte da app, com valores exatos ================= */
async function areaTests(b) {
  cur = 'Áreas'; console.log('\n=== Cobertura por área (lógica com valores exatos) ===');
  const { ctx, p, errs } = await newPage(b, PROFILES[0]);
  await ctx.route(/open-meteo\.com/, rt => { const u = rt.request().url(); if (/geocoding/.test(u)) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ name: 'Aveiro', latitude: 40.64, longitude: -8.65 }] }) });
    const days = [0, 1, 2, 3].map(i => { const d = new Date(Date.now() + i * 864e5); return d.toISOString().slice(0, 10); });
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 18.4, apparent_temperature: 14, weather_code: 61, wind_speed_10m: 12, precipitation: 0, relative_humidity_2m: 80 }, hourly: { precipitation_probability: Array(48).fill(40) }, daily: { time: days, weather_code: [61, 2, 0, 3], temperature_2m_max: [21, 22, 23, 20], temperature_2m_min: [13, 12, 14, 13], precipitation_probability_max: [70, 20, 5, 10], sunrise: days.map(d => d + 'T07:40'), sunset: days.map(d => d + 'T19:10') } }) }); });
  await p.goto(BASE); await unlock(p); await E(p, () => { OS.Jarvis && OS.Jarvis.close(); document.querySelectorAll('#modal').forEach(m => { m.hidden = true; m.innerHTML = ''; }); });
  // ---------- FINANÇAS ----------
  const fin = await E(p, () => { const U = OS.U, F = OS.Fin, t = U.today(), ym = U.ym(t), m0 = F.month(ym);
    const a = OS.add('accounts', { name: 'Conta T', type: 'Conta à ordem', opening: 1000 }), c = OS.add('accounts', { name: 'Poupança T', type: 'Reserva', opening: 0 });
    OS.add('transactions', { type: 'Receita', amount: 500, date: t, account: a.id, desc: 'Salário T', cat: 'Salário' });
    OS.add('transactions', { type: 'Despesa', amount: 120.5, date: t, account: a.id, desc: 'Mercado T', cat: 'Alimentação' });
    OS.add('transactions', { type: 'Transferência', amount: 100, date: t, account: a.id, toAccount: c.id, desc: 'Poupar' });
    OS.add('transactions', { type: 'Despesa', amount: 999, date: U.addDays(t, 5), account: a.id, desc: 'Futuro T', cat: 'Lazer' });
    const m1 = F.month(ym);
    return { a: F.accBal(OS.get('accounts', a.id)), c: F.accBal(OS.get('accounts', c.id)), inc: m1.inc - m0.inc, exp: m1.exp - m0.exp, up: F.upcoming(10).some(x => x.title === 'Futuro T' && x.amount === -999) }; });
  ok('finanças: saldo da conta = abertura + receitas − despesas − transferências (1279,50 €)', fin.a === 1279.5, JSON.stringify(fin));
  ok('finanças: transferência entra na conta de destino (100 €)', fin.c === 100);
  ok('finanças: mês soma receitas e despesas (despesa futura ainda não conta no saldo)', fin.inc === 500 && Math.abs(fin.exp - (120.5 + 999)) < .001 && fin.a === 1279.5);
  ok('finanças: despesa agendada aparece nos próximos pagamentos', fin.up);
  const inst = await E(p, () => { const U = OS.U, a = OS.all('accounts').find(x => x.name === 'Conta T'), r = OS.add('transactions', { type: 'Despesa', amount: 300, inst: 3, date: U.today(), account: a.id, desc: 'Telemóvel T', cat: 'Pessoal' }); OS.Fin.afterTx(OS.get('transactions', r.id), true);
    const L = OS.U.sortBy(OS.all('transactions').filter(t => /Telemóvel T/.test(t.desc)), t => t.date); return L.map(t => [t.amount, t.instI, t.instN, t.date.slice(0, 7)]); });
  ok('finanças: compra em 3 parcelas cria 3 movimentos de 100 € em meses seguidos', inst.length === 3 && inst.every(x => x[0] === 100 && x[2] === 3) && new Set(inst.map(x => x[3])).size === 3, JSON.stringify(inst));
  const rec = await E(p, () => { const U = OS.U, F = OS.Fin, t = U.today(), a = OS.all('accounts').find(x => x.name === 'Conta T'), day = +U.addDays(t, 2).slice(8, 10);
    const r = OS.add('recurring', { name: 'Ginásio T', type: 'Despesa', amount: 30, freq: 'Mensal', day, active: true, account: a.id, cat: 'Saúde' }); const ym = U.ym(U.addDays(t, 2));
    const before = F.upcoming(10).some(x => x.title === 'Ginásio T'); F.payRecurring(OS.get('recurring', r.id), ym); return { before, paid: F.recurPaid(OS.get('recurring', r.id), ym), after: F.upcoming(10).some(x => x.title === 'Ginásio T') }; });
  ok('finanças: recorrente aparece antes de pagar e desaparece depois de pago', rec.before && rec.paid && !rec.after, JSON.stringify(rec));
  const debt = await E(p, () => { const U = OS.U, F = OS.Fin, a = OS.all('accounts').find(x => x.name === 'Conta T'), d = OS.add('debts', { name: 'Empréstimo T', principal: 1000, installment: 200, dueDay: 28 }); const nw0 = F.netWorth();
    OS.add('transactions', { type: 'Despesa', amount: 200, date: U.today(), account: a.id, desc: 'Prestação', debt: d.id }); return { bal: F.debtBal(OS.get('debts', d.id)), nwDelta: Math.round((F.netWorth() - nw0) * 100) / 100 }; });
  ok('finanças: pagar 200 € de uma dívida de 1000 € deixa 800 € (património igual)', debt.bal === 800 && debt.nwDelta === 0, JSON.stringify(debt));
  const bud = await E(p, () => { const U = OS.U; OS.add('budgets', { cat: 'Alimentação', limit: 50 }); return OS.Fin.spentCat('Alimentação', U.ym(U.today())) >= 120.5; });
  ok('finanças: orçamento soma o gasto da categoria no mês', bud);
  // ---------- TAREFAS ----------
  const qp = await E(p, () => { const o = OS.Tasks.quickParse('Rever balanço @Universidade !1 amanhã'); return [o.title, o.prio, o.sched === OS.U.addDays(OS.U.today(), 1), o.area, o.status]; });
  ok('tarefas: "Rever balanço @Universidade !1 amanhã" → título, prioridade 1, amanhã, área', qp[0] === 'Rever balanço' && qp[1] === '1' && qp[2] && qp[3] === 'Universidade' && qp[4] === 'Próxima', JSON.stringify(qp));
  const rt = await E(p, () => { const U = OS.U, t = OS.add('tasks', { title: 'Regar T', status: 'Próxima', due: U.today(), recur: 'Diária' }); OS.Tasks.complete(t.id); const nx = OS.all('tasks').find(x => x.title === 'Regar T' && x.status === 'Próxima'); return { done: OS.get('tasks', t.id).doneAt === U.today(), next: nx && nx.due === U.addDays(U.today(), 1) }; });
  ok('tarefas: concluir tarefa diária marca a data e cria a de amanhã', rt.done && rt.next, JSON.stringify(rt));
  const late = await E(p, () => { const U = OS.U; OS.add('tasks', { title: 'Atrasada T', status: 'Próxima', due: U.addDays(U.today(), -3), prio: '1' }); return OS.Tasks.late(OS.all('tasks').find(x => x.title === 'Atrasada T')); });
  ok('tarefas: prazo passado conta como atrasada', late);
  const nx = await E(p, () => { OS.add('tasks', { title: 'Urgente T', status: 'Próxima', prio: '1', impact: 5, due: OS.U.today() }); OS.add('tasks', { title: 'Calma T', status: 'Próxima', prio: '4', impact: 1 }); const L = OS.Intel.next().map(x => x.title); return L.indexOf('Urgente T') > -1 && (L.indexOf('Calma T') === -1 || L.indexOf('Urgente T') < L.indexOf('Calma T')); });
  ok('próxima ação: prioridade 1 com prazo hoje vem antes da prioridade 4', nx);
  // ---------- HÁBITOS ----------
  const hb = await E(p, () => { const U = OS.U, H = OS.Hab, log = {}; [0, 1, 2].forEach(i => log[U.addDays(U.today(), -i)] = 1); const h = OS.add('habits', { name: 'Ler T', active: true, freq: 'Diário', log });
    const sat = (() => { let d = U.today(); while (U.parse(d).getDay() !== 6) d = U.addDays(d, 1); return d; })(), wk = OS.add('habits', { name: 'Úteis T', active: true, freq: 'Dias úteis' });
    const c = OS.add('habits', { name: 'Caixa T', active: true, freq: 'Diário', auto: 'cash' }); H.toggle(h.id, U.addDays(U.today(), -5));
    return { streak: H.streak(OS.get('habits', h.id)), wkend: H.due(OS.get('habits', wk.id), sat), auto: H.done(OS.get('habits', c.id), U.today()), past: !(OS.get('habits', h.id).log || {})[U.addDays(U.today(), -5)] }; });
  ok('hábitos: 3 dias seguidos = sequência de 3', hb.streak === 3, JSON.stringify(hb));
  ok('hábitos: "dias úteis" não conta ao sábado', hb.wkend === false);
  ok('hábitos: automático (registar um gasto) marca-se sozinho', hb.auto);
  ok('hábitos: não deixa marcar dias passados', hb.past);
  // ---------- METAS ----------
  const gl = await E(p, () => { const U = OS.U, G = OS.Goal, a = OS.all('accounts').find(x => x.name === 'Poupança T');
    const g1 = OS.add('goals', { title: 'Manual T', metric: 'manual', base: 0, target: 10, cur: 5, status: 'Ativa' }), g2 = OS.add('goals', { title: 'Passos T', metric: 'steps', steps: [{ t: 'a', done: true }, { t: 'b', done: true }, { t: 'c' }, { t: 'd' }], status: 'Ativa' }), g3 = OS.add('goals', { title: 'Conta T', metric: 'account', account: a.id, target: 400, status: 'Ativa' });
    const g4 = OS.add('goals', { title: 'Atraso T', metric: 'manual', base: 0, target: 100, cur: 10, status: 'Ativa', start: U.addDays(U.today(), -90), due: U.addDays(U.today(), 10) });
    return [G.info(OS.get('goals', g1.id)).p, G.info(OS.get('goals', g2.id)).p, G.info(OS.get('goals', g3.id)).p, G.info(OS.get('goals', g4.id)).st[0]]; });
  ok('metas: manual 5 de 10 = 50%', gl[0] === .5, JSON.stringify(gl)); ok('metas: 2 de 4 passos = 50%', gl[1] === .5); ok('metas: meta ligada a uma conta segue o saldo (100 de 400 = 25%)', gl[2] === .25); ok('metas: atrás do ritmo é detetado', gl[3] === 'Atrás do ritmo');
  // ---------- UNIVERSIDADE ----------
  const un = await E(p, () => { const U = OS.U, St = OS.St, s = OS.add('subjects', { name: 'Contabilidade T', status: 'Em curso', target: 15, ects: 6 });
    OS.add('assessments', { subject: s.id, title: 'Teste 1', type: 'Teste', weight: 40, grade: 12, date: U.addDays(U.today(), -20) }); OS.add('assessments', { subject: s.id, title: 'Exame', type: 'Exame', weight: 60, grade: 16, date: U.addDays(U.today(), -2) });
    const r = OS.add('reviews', { title: 'Tema T', studied: U.addDays(U.today(), -1) }); const due1 = St.revDue().some(x => x.id === r.id); St.revDone(r.id);
    return { avg: St.stats(OS.get('subjects', s.id)).avg, due1, r1: !!OS.get('reviews', r.id).r1, next: St.revNext(OS.get('reviews', r.id)) === U.addDays(U.addDays(U.today(), -1), 7) }; });
  ok('universidade: média ponderada 40%×12 + 60%×16 = 14,4', un.avg === 14.4, JSON.stringify(un));
  ok('universidade: revisão de ontem está para hoje e a seguinte é a 7 dias', un.due1 && un.r1 && un.next);
  // ---------- CALENDÁRIO ----------
  const cal = await E(p, () => { const U = OS.U, t = U.today(), d7 = U.addDays(t, 7), d3 = U.addDays(t, 3);
    OS.add('events', { title: 'Reunião T', date: t, start: '10:00', recur: 'Semanal' }); OS.add('shifts', { date: d3, start: '14:00', end: '22:00' }); OS.add('assessments', { title: 'Teste Cal', type: 'Teste', date: d3 });
    const it = OS.Cal.items(t, d7); return { ev0: it.some(x => x.title === 'Reunião T' && x.date === t), ev7: it.some(x => x.title === 'Reunião T' && x.date === d7), shift: it.some(x => x.src === 'shift' && x.date === d3), exam: it.some(x => x.src === 'exam' && /Teste Cal/.test(x.title)) }; });
  ok('calendário: evento semanal repete-se daqui a 7 dias', cal.ev0 && cal.ev7, JSON.stringify(cal)); ok('calendário: turnos e avaliações aparecem', cal.shift && cal.exam);
  // ---------- DECISION CENTER ----------
  const al = await E(p, () => { const A = OS.Decide.alpha, all = v => ({ q0: v[0], q1: v[1], q2: v[2], q3: v[3], q4: v[4] }); return [A({}, 0)[0], A(all(['Sim', 'Sim', 'Sim', 'Sim', 'Sim']), 10)[0], A(all(['Não', 'Sim', 'Sim', 'Sim', 'Sim']), 200)[0], A(all(['Não', 'Sim', 'Não', 'Sim', 'Sim']), 200)[0], A(all(['Não', 'Sim', 'Sim', 'Sim', 'Sim']), 10)[0]]; });
  ok('decisões: filtro Alpha (24 h, 3 dias, passado)', al[0] === 'Responde às 5 perguntas' && al[1] === 'Esperar 24 h' && al[2] === 'Filtro passado' && al[3] === 'Esperar 3 dias' && al[4] === 'Filtro passado', JSON.stringify(al));
  // ---------- SEGURANÇA ----------
  const sec = await E(p, async () => { const L = OS.Lock; const r = []; r.push(await L.setCode('errado', 'novo123456')); r.push(await L.setCode('teste1234', '123')); r.push(await L.setCode('teste1234', 'novo123456'));
    r.push(await L.verifyCode('novo123456')); r.push(await L.verifyCode('teste1234')); r.push(await L.setCode('novo123456', 'teste1234')); return r; });
  ok('segurança: mudar o código pede o atual e 6+ caracteres', /atual/.test(sec[0]) && /6 caracteres/.test(sec[1]) && sec[2] === null, JSON.stringify(sec));
  ok('segurança: depois de mudar, o novo código entra e o antigo não', sec[3] === null && /incorreto/i.test(sec[4]) && sec[5] === null);
  ok('segurança: o código nunca fica guardado em texto', await E(p, () => !JSON.stringify(localStorage).includes('teste1234') && !JSON.stringify(localStorage).includes('novo123456')));
  const lk = await E(p, async () => { const L = OS.Lock; OS.U.ls.del('os2lkfails'); OS.U.ls.del('os2lkwait'); let m = ''; for (let i = 0; i < 5; i++) m = await L.verifyCode('x' + i); const w = await L.verifyCode('teste1234'); localStorage.removeItem('os2lkwait'); OS.U.ls.del('os2lkwait'); return [m, w]; });
  ok('segurança: 5 códigos errados bloqueiam 30 s (mesmo com o certo)', /5 vezes/.test(lk[0]) && /Espera/.test(lk[1]), JSON.stringify(lk));
  // ---------- CLIMA ----------
  const wx = await E(p, async () => { const d = await OS.Weather.get(true); return { say: OS.Weather.say(d, 0), tom: OS.Weather.say(d, 1), ic: OS.Weather.icon(61) }; });
  ok('clima: frase com cidade, graus, sensação e chuva', /Aveiro/.test(wx.say) && /18 graus/.test(wx.say) && /sensação de 14/.test(wx.say) && /70% de probabilidade de chuva/.test(wx.say) && /guarda-chuva/.test(wx.say), wx.say);
  ok('clima: amanhã e ícone sem emojis', /^Amanhã em Aveiro/.test(wx.tom) && /^<svg/.test(wx.ic));
  // ---------- MUDANÇA DE ENDEREÇO ----------
  const mv = await E(p, () => { window.__noReload = 1; let called = null; const S0 = window.OceanumSync; window.OceanumSync = Object.assign({}, S0 || {}, { applyLink: c => { called = JSON.parse(decodeURIComponent(escape(atob(c)))); return true; } });
    const reload = location.reload; const f = n => { const el = document.createElement('form'); el.innerHTML = '<input name="u"><input name="k">'; el.elements.u.value = n[0]; el.elements.k.value = n[1]; return el; };
    OS.forms.mvRec(f(['https://exemplo.com/exec', 'abcdefghij'])); const bad = called; OS.forms.mvRec(f(['https://script.google.com/macros/s/AKfy_123-x/exec', "'abcdefghij'"])); window.OceanumSync = S0; return { bad, ok: called && called.u.endsWith('/exec') && called.k === 'abcdefghij', done: OS.U.ls.get('os2mvDone', 0) }; });
  ok('mudança: recuperar recusa endereço errado e aceita o do script (tira as aspas da chave)', mv.bad === null && mv.ok && mv.done === 1, JSON.stringify(mv));
  // ---------- TODAS AS PÁGINAS: botões com função, sem "undefined" nem "NaN" ----------
  const base = await E(p, () => Object.keys(OS.views)); let routes = [];
  for (const r of base) { await E(p, r => location.hash = r, r); await sleep(120); routes.push(r, ...(await E(p, () => [...document.querySelectorAll('#view nav.tabs a, #view .dtabs a[href^="#"]')].map(a => a.getAttribute('href').slice(1))))); }
  routes = [...new Set(routes)]; const noFn = new Set(), noForm = new Set(), badTxt = [], badEdit = new Set();
  for (const r of routes) { await E(p, r => location.hash = r, r); await sleep(140);
    const o = await E(p, () => { const v = document.getElementById('view'), acts = [...v.querySelectorAll('[data-act]')].map(x => x.dataset.act).filter(a => typeof OS.act[a] !== 'function'), forms = [...v.querySelectorAll('[data-form]')].map(x => x.dataset.form).filter(f => f !== 'quickTask' && typeof OS.forms[f] !== 'function'), edits = [...v.querySelectorAll('[data-edit]')].map(x => x.dataset.edit.split(':')[0]).filter(c => !OS.S[c]);
      const tx = v.innerText, m = tx.match(/.{0,30}(\bundefined\b|\bNaN\b|\[object Object\]|Invalid Date).{0,30}/); return { acts, forms, edits, m: m ? m[0] : '' }; });
    o.acts.forEach(a => noFn.add(a)); o.forms.forEach(f => noForm.add(f)); o.edits.forEach(c => badEdit.add(c)); if (o.m) badTxt.push(r + ': ' + o.m.replace(/\s+/g, ' ')); }
  ok(`todas as ${routes.length} páginas: cada botão tem função`, !noFn.size, [...noFn].join(', '));
  ok('todas as páginas: cada formulário tem função', !noForm.size, [...noForm].join(', '));
  ok('todas as páginas: "editar" aponta para dados que existem', !badEdit.size, [...badEdit].join(', '));
  ok('todas as páginas: sem "undefined", "NaN" ou "[object Object]" no ecrã', !badTxt.length, badTxt.slice(0, 4).join(' | '));
  // ---------- IA UNIFICADA (Spyke) ----------
  await E(p, () => OS.setOne('diet', { aiKey: '' })); const oldCard = [], cards = new Set();
  for (const r of routes) { await E(p, r => location.hash = r, r); await sleep(90); const o = await E(p, () => ({ old: /Ligar a IA \(grátis/.test(document.getElementById('view').innerText), n: document.querySelectorAll('#view .ai-off').length })); if (o.old) oldCard.push(r); if (o.n) cards.add(r); }
  ok('IA unificada: nenhuma página tem o cartão antigo "Ligar a IA"', !oldCard.length, oldCard.join(', '));
  ok('IA unificada: o cartão do Spyke aparece onde a IA faz falta', cards.size >= 3, [...cards].join(', '));
  await E(p, () => location.hash = 'spyke'); await sleep(300);
  ok('IA unificada: a página do Spyke tem o cérebro (IA) com os passos', await E(p, () => !!document.querySelector('#spyBrain') && /aistudio\.google\.com/.test(document.querySelector('#spyBrain').innerHTML)));
  await E(p, () => { document.querySelector('#spyBrain [data-aikey]').value = 'AIzaChave_de_teste_1234567890'; document.querySelector('#spyBrain [data-act=aiKeySave]').click(); }); await sleep(400);
  ok('IA unificada: ligar uma vez liga a app inteira', await E(p, () => OS.AI.key() === 'AIzaChave_de_teste_1234567890' && !document.querySelector('#view .ai-off')) && (await E(p, () => { location.hash = 'trabalho.foto'; }), await sleep(300), await E(p, () => !document.querySelector('#view .ai-off'))));
  ok('sem erros de JavaScript (áreas)', !errs.length, errs.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ================= SPYKE SEMPRE A OUVIR, PALMAS, FACE ID AUTOMÁTICO, FLORESTA 3D, DECISÕES COM IA, JORNAL ================= */
async function newFeatureTests(b) {
  cur = 'Novidades'; console.log('\n=== Spyke a ouvir, palmas, Face ID automático, Floresta 3D, decisões com IA, jornal ===');
  const IPH = PROFILES[0].o;
  // Face ID automático
  { const ctx = await b.newContext(IPH); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(H => { window.__bioAuto = 1; window.__g = 0; window.__deny = 0; localStorage.setItem('os2:one~security', JSON.stringify({ data: { hash: H } })); localStorage.setItem('os2bio', JSON.stringify({ id: 'AAAA', at: '2026-10-01' })); localStorage.setItem('os2bioAsk', 'true');
      Object.defineProperty(navigator, 'credentials', { value: { get: async () => { window.__g++; if (window.__deny) throw Object.assign(new Error('cancelado'), { name: 'NotAllowedError' }); return {}; }, create: async () => ({ rawId: new Uint8Array([1]).buffer }) } }); window.PublicKeyCredential = { isUserVerifyingPlatformAuthenticatorAvailable: async () => true }; }, HASH);
    await p.goto(BASE); await sleep(2200);
    ok('Face ID: ao abrir a app o Face ID começa sozinho e entra', await E(p, () => window.__g) === 1 && await E(p, () => document.getElementById('splash').hidden && !!document.querySelector('.dash')));
    ok('Face ID: não pergunta "Ativar o Face ID?" outra vez', !/Ativar o Face ID/.test(await E(p, () => document.getElementById('modal').innerText)));
    await E(p, () => { window.__deny = 1; OS.act.lockNow(); }); await sleep(900);
    ok('Face ID: se cancelares fica o botão e uma mensagem calma (sem repetir sozinho)', await E(p, () => window.__g) === 2 && await p.isVisible('#lkBio') && /Toca em/.test(await E(p, () => document.getElementById('lkMsg').textContent)));
    await sleep(1500); ok('Face ID: não fica a pedir em ciclo', await E(p, () => window.__g) === 2);
    await E(p, () => { window.__deny = 0; }); await p.tap('#lkBio'); await sleep(900); ok('Face ID: tocar no botão entra', await E(p, () => document.getElementById('splash').hidden));
    ok('sem erros de JavaScript (Face ID)', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // Spyke: escuta contínua (reconhecimento de voz simulado)
  { const ctx = await b.newContext(IPH); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(H => { window.__spyTest = 1; window.__spyEar = 1; window.__srN = 0;
      class FakeSR { start() { window.__srN++; this.live = true; this.res = []; window.__cur = this; } say(t, fin = true) { if (!this.live) return; this.res.push(Object.assign([{ transcript: t }], { isFinal: fin })); this.onresult && this.onresult({ resultIndex: this.res.length - 1, results: this.res }); }
        interim(t) { if (!this.live) return; const L = this.res.concat([Object.assign([{ transcript: t }], { isFinal: false })]); this.onresult && this.onresult({ resultIndex: L.length - 1, results: L }); } abort() { this.live = false; setTimeout(() => this.onend && this.onend(), 5); } stop() { this.abort(); } end() { this.live = false; this.onend && this.onend(); } }
      window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR; localStorage.setItem('os2:one~security', JSON.stringify({ data: { hash: H } })); }, HASH);
    await p.goto(BASE); await unlock(p); await sleep(1500); await E(p, () => { OS.Jarvis && OS.Jarvis.close(); OS.setOne('spyke', { eng: 'device' }); window.speechSynthesis.speak = u => { window.__utt = u; setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => window.__utt === u && u.onend && u.onend(), 300); }, 20); }; window.speechSynthesis.cancel = () => { const u = window.__utt; window.__utt = null; u && u.onend && u.onend(); }; });
    const last = () => E(p, () => { const L = [...document.querySelectorAll('#spy .spy-m.spyke .spy-bb')]; return L.length ? L[L.length - 1].textContent : ''; });
    const users = () => E(p, () => document.querySelectorAll('#spy .spy-m.user:not(.live)').length);
    ok('Spyke: começa a ouvir sozinho ao entrar (ponto no microfone do topo)', await E(p, () => OS.Spyke.earOn() && document.documentElement.classList.contains('spy-ear')));
    const u00 = await users(); await E(p, () => window.__cur.say('que horas são')); await sleep(900); ok('Spyke: sem dizer o nome dele não responde (só "Spyke, …")', await users() === u00 && !/^São \d/.test(await last()), await last());
    await E(p, () => window.__cur.say('Spyke que horas são')); await sleep(900); ok('Spyke: com o nome responde logo', /^São \d/.test(await last()), await last());
    await E(p, () => window.__cur.say('Spyke que dia é hoje')); await sleep(1200);
    ok('Spyke: conversa seguida (depois de responder volta a ouvir sozinho)', /Hoje é/.test(await last()) && await E(p, () => OS.Spyke.earOn()));
    // os pedidos do Ryan, tal como os diz
    const spk = () => E(p, () => document.querySelectorAll('#spy .spy-m.spyke').length);
    await E(p, () => OS.Spyke._endConv()); await E(p, () => window.__cur.say('Spike, bom dia')); await sleep(1300);
    ok('Spyke: "Spike, bom dia" dá o resumo do dia (escrito "Spike", como o iPhone ouve)', /Hoje é/.test(await last()) && /(Bom dia|Boa tarde|Boa noite)/.test(await last()), (await last()).slice(0, 80));
    await E(p, () => OS.Spyke._endConv()); await E(p, () => window.__cur.say('que horas são')); await sleep(900);
    await E(p, () => window.__cur.say('Bom dia, Spike')); await sleep(1300);
    ok('Spyke: "Bom dia, Spike" (nome no fim) também dá o resumo', /Hoje é/.test(await last()) && /(Bom dia|Boa tarde|Boa noite)/.test(await last()));
    await E(p, () => OS.Spyke._endConv()); const s0 = await spk(); await E(p, () => window.__cur.say('Spike')); await sleep(900);
    ok('Spyke: só "Spike" não fala nada (som e fica à espera do pedido)', await spk() === s0 && await E(p, () => OS.Spyke.earOn()));
    await E(p, () => window.__cur.say('que horas são')); await sleep(1200);
    ok('Spyke: o pedido logo a seguir ao nome (sem repetir o nome) é executado', /^São \d/.test(await last()), await last());
    await E(p, () => OS.Spyke._endConv()); await E(p, () => window.__cur.interim('Spike')); await sleep(1800); await E(p, () => window.__cur.interim('Spike que dia é hoje')); await sleep(1900);
    ok('Spyke: com uma pausa depois do nome ("Spike… que dia é hoje") faz o pedido', /Hoje é/.test(await last()), await last());
    await E(p, () => window.__cur.say('e amanhã vai chover')); await sleep(900); ok('Spyke: depois de responder, sem o nome volta a ignorar', !/chover|Amanhã/i.test(await E(p, () => [...document.querySelectorAll('#spy .spy-m.user:not(.live)')].map(x => x.textContent).join('|'))));
    await E(p, () => OS.Spyke._endConv()); const u0 = await users(); await E(p, () => window.__cur.say('isto é a televisão a falar')); await sleep(800);
    ok('Spyke: fora da conversa ignora o que não é para ele', await users() === u0);
    await E(p, () => window.__cur.say('Spyke que horas são')); await sleep(900); ok('Spyke: "Spyke, …" funciona sempre', /^São \d/.test(await last()));
    await E(p, () => OS.Spyke._endConv()); await E(p, () => window.__cur.interim('Spyke que dia')); await sleep(250); await E(p, () => window.__cur.interim('Spyke que dia é hoje')); await sleep(1700);
    ok('Spyke: frase sem "fim" é apanhada pela pausa (iPhone)', /Hoje é/.test(await last()));
    const u1 = await users(); await E(p, () => window.__cur.say((document.querySelector('#spy .spy-m.spyke:last-child .spy-bb') || {}).textContent || 'Hoje é dia')); await sleep(800);
    ok('Spyke: o eco da própria voz não conta como pedido', await users() === u1);
    const n2 = await E(p, () => window.__srN); await E(p, () => window.__cur.end()); await sleep(900); ok('Spyke: o iPhone fecha o microfone e ele reabre sozinho', await E(p, () => window.__srN) === n2 + 1 && await E(p, () => OS.Spyke.earOn()));
    await E(p, () => window.__cur.say('Spyke para de ouvir')); await sleep(1500); ok('Spyke: "para de ouvir" desliga e não reabre', !(await E(p, () => OS.Spyke.earOn())));
    await E(p, () => OS.Spyke.listen()); await sleep(400); ok('Spyke: tocar no microfone volta a ouvir', await E(p, () => OS.Spyke.earOn()));
    E(p, () => OS.Spyke.say('Esta é uma frase comprida que estou a dizer agora mesmo, sem parar, para testar a interrupção.')); await sleep(150);
    ok('Spyke: enquanto fala o microfone descansa (não ouve a própria voz nem corta o som)', !(await E(p, () => OS.Spyke.earOn())));
    await sleep(900); ok('Spyke: acabou de falar e volta a ouvir sozinho', await E(p, () => OS.Spyke.earOn()));
    await E(p, () => OS.setOne('spyke', { barge: true })); await sleep(300); E(p, () => OS.Spyke.say('Esta é outra frase comprida que estou a dizer agora mesmo, sem parar, para testar a interrupção.')); await sleep(250);
    await E(p, () => window.__cur && window.__cur.interim('Spyke')); await sleep(400); ok('Spyke: com "Interromper por voz" ligado, dizer "Spyke" enquanto fala interrompe e ouve', await last() === 'Sim?', await last());
    await E(p, () => OS.setOne('spyke', { barge: false })); await sleep(300);
    await E(p, () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(300); const off = !(await E(p, () => OS.Spyke.earOn()));
    await E(p, () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(1200);
    ok('Spyke: ao sair da app o microfone desliga e ao voltar liga sozinho', off && await E(p, () => OS.Spyke.earOn()));
    const det = await E(p, () => { const run = (sens, seq) => { const d = OS.Spyke._clapDetector(() => sens); let t = 0, n = 0; seq.forEach(([pk, k]) => { for (let i = 0; i < k; i++) { t += 16; if (d(pk, t)) n++; } }); return n; };
      return { two: run(5, [[.01, 120], [.6, 1], [.08, 20], [.55, 1], [.05, 40]]), one: run(5, [[.01, 120], [.6, 1], [.02, 80]]), voice: run(5, [[.01, 120], [.5, 1], [.4, 30], [.5, 1], [.4, 30]]), far: run(5, [[.01, 120], [.5, 1], [.02, 120], [.5, 1], [.02, 10]]), soft9: run(9, [[.005, 120], [.12, 1], [.01, 15], [.12, 1], [.01, 20]]), soft1: run(1, [[.005, 120], [.12, 1], [.01, 15], [.12, 1], [.01, 20]]) }; });
    ok('palmas: duas palmas chamam o Spyke', det.two === 1, JSON.stringify(det)); ok('palmas: uma palma sozinha não chama', det.one === 0); ok('palmas: voz ou música contínua não chamam', det.voice === 0); ok('palmas: palmas muito afastadas não contam', det.far === 0);
    ok('palmas: a sensibilidade muda o que conta (máxima ouve palmas fracas, mínima não)', det.soft9 === 1 && det.soft1 === 0);
    await E(p, () => { OS.Spyke.close(); location.hash = 'spyke'; }); await sleep(400);
    ok('Spyke: página explica o limite do iPhone com a app fechada e como não pedir o microfone', await E(p, () => /segundo plano/.test(document.getElementById('view').innerText) && /Safari → Microfone → Permitir/.test(document.getElementById('view').innerText)));
    ok('sem erros de JavaScript (Spyke a ouvir)', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // Floresta: o 3D recupera sozinho
  { const { ctx, p, errs } = await newPage(b, PROFILES[0]); await p.goto(BASE); await unlock(p); await E(p, () => { OS.Jarvis && OS.Jarvis.close(); location.hash = 'floresta'; }); await sleep(2500);
    const gl0 = await E(p, () => OS.Forest.gl());
    if (gl0.ok) { await E(p, () => { const c = document.querySelector('#fo3d canvas'); c.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); }); await sleep(1500);
      ok('floresta: quando o iPhone apaga o 3D, ele refaz-se sozinho', await E(p, () => OS.Forest.gl().ok && !!document.querySelector('#fo3d canvas'))); }
    else ok('floresta: o 3D abre neste navegador de teste', false, JSON.stringify(gl0));
    await E(p, () => { OS.Forest._fail('falha simulada'); location.hash = 'visao'; }); await sleep(200); await E(p, () => location.hash = 'floresta'); await sleep(500);
    ok('floresta: se o 3D falhar mostra "A abrir o 3D…" (não fica preso no erro)', await E(p, () => /A abrir o 3D/.test(document.getElementById('fo3d').innerText)));
    await sleep(7000); ok('floresta: tenta outra vez sozinha e volta a mostrar a árvore 3D', await E(p, () => OS.Forest.gl().ok && !!document.querySelector('#fo3d canvas')), JSON.stringify(await E(p, () => OS.Forest.gl())));
    ok('sem erros de JavaScript (Floresta)', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // Decision Center com o Spyke e jornal que não fica a rodar
  { const { ctx, p, errs } = await newPage(b, PROFILES[0]); await p.addInitScript(() => { window.__nwTO = 1500; });
    await ctx.route(/generativelanguage/, rt => { const R = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) }); if (rt.request().method() === 'GET') return R({ models: [] }); const txt = JSON.parse(rt.request().postData()).contents[0].parts[0].text; let o;
      if (/Estima os valores/.test(txt)) o = { alts: [{ i: 0, cost: 900, benefit: 4, risk: 2, time: 3, fin: -50, goals: 5, routine: 3 }, { i: 1, cost: 0, benefit: 2, risk: 1, time: 0, fin: 0, goals: 2, routine: 5 }], nota: 'assumi 900 €' };
      else if (/Pergunta dele/.test(txt)) o = { resposta: 'Se esperares até janeiro, juntas o dinheiro.' };
      else o = { resumo: 'Curso ou poupar.', alternativas: [{ nome: 'Fazer o curso', pros: ['carreira'], contras: ['900 €'], encaixe: 'meta de emprego' }], riscos: ['época de exames'], perguntas: ['Tem certificado?'], nova: 'Curso online mais barato', inclinacao: { nome: 'Fazer o curso', porque: 'alinha com a meta', confianca: 'média' }, emocao: '', passo: 'Pedir o programa do curso' };
      R({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] }); });
    await ctx.route(/script\.google\.com/, async rt => { await sleep(4000); rt.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }).catch(() => { }); });
    await p.goto(BASE); await unlock(p); await E(p, () => { OS.Jarvis && OS.Jarvis.close(); OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); });
    const id = await E(p, () => OS.add('decisions', { title: 'Curso de Excel', status: 'Em análise', alts: [{ name: 'Fazer o curso' }, { name: 'Não fazer nada' }] }).id);
    await E(p, id => { location.hash = 'decisoes'; OS.Decide.open(id); }, id); await sleep(400); await p.click('#drawer [data-act=decAI]'); await sleep(1200);
    const dt = await E(p, () => document.querySelector('#drawer .dc-ai').innerText);
    ok('decisões: o Spyke analisa (prós, contras, riscos, perguntas, para onde apontam os dados)', /Os dados apontam para: Fazer o curso/.test(dt) && /Riscos/.test(dt) && /Responde a isto/.test(dt) && /A decisão continua a ser tua/.test(dt));
    await p.click('#drawer [data-act=decFill]'); await sleep(900); ok('decisões: "Preencher a matriz" estima só o que está vazio', await E(p, id => { const a = OS.get('decisions', id).alts; return a[0].cost === 900 && a[1].routine === 5; }, id));
    await p.fill('#drawer .dc-ask input', 'E se eu esperar?'); await p.click('#drawer .dc-ask button'); await sleep(900); ok('decisões: perguntas ao Spyke ficam guardadas na decisão', await E(p, id => (OS.get('decisions', id).aiQ || []).length === 1, id));
    await p.click('#drawer [data-act=decTask]'); await sleep(300); ok('decisões: próximo passo vira tarefa', await E(p, () => OS.all('tasks').some(t => /programa do curso/.test(t.title))));
    await E(p, () => { OS.UI.closeDrawer(); OS.setOne('inbox', { url: 'https://script.google.com/macros/s/X/exec', key: 'k', ver: 10 }); OS.News.cache = {}; location.hash = 'jornal'; }); await sleep(600);
    ok('jornal: mostra os segundos enquanto espera', await E(p, () => !!document.getElementById('nwSec')));
    await sleep(2500); const nt = await E(p, () => document.getElementById('view').innerText);
    ok('jornal: sem resposta desiste, explica e oferece "Tentar outra vez" (sem ficar em ciclo)', /não respondeu/.test(nt) && /Tentar outra vez/.test(nt) && !/A buscar as notícias/.test(nt), nt.slice(0, 120));
    ok('sem erros de JavaScript (decisões e jornal)', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // script Google antigo: o Spyke diz o que falta e o passo a passo; depois de atualizado fica tudo verde
  { const { ctx, p, errs } = await newPage(b, PROFILES[0]); let NEWV = false;
    await ctx.route(/script\.google\.com/, rt => { const u = new URL(rt.request().url()), P = Object.fromEntries(new URLSearchParams(rt.request().postData() || '')), op = u.searchParams.get('op') || P.op, J = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (!NEWV && op !== 'list' && op !== 'get' && op !== 'put' && op !== 'pull') return J({ ok: false, msg: 'Valor inválido' });
      if (op === 'ping') return J({ ok: true, v: 11 }); if (op === 'put') return J({ ok: true }); if (op === 'nw') return J({ ok: true, nw: { 'PT:WORLD': [{ t: 'Notícia de teste - Público', s: 'Público', l: 'https://x.pt', d: Date.now() }], 'BR:WORLD': [], 'PT:TOP': [], 'W:TOP': [] } }); return J({ ok: true, items: [], docs: {} }); });
    await ctx.route(/generativelanguage/, rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [] }) }));
    await p.goto(BASE); await unlock(p); await E(p, () => { OS.Jarvis && OS.Jarvis.close(); OS.setOne('inbox', { url: 'https://script.google.com/macros/s/AKfyTESTE123/exec', key: 'k', ver: 1 }); OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); OS.News.cache = {}; location.hash = 'jornal'; }); await sleep(1500);
    ok('script antigo: o Jornal explica que o script é antigo e leva a Definições → Script Google', await E(p, () => /versão antiga/.test(document.getElementById('view').innerText) && !!document.querySelector('#view a[href="#definicoes.script"]')));
    await E(p, () => location.hash = 'spyke'); await sleep(400);
    const st = await E(p, () => ({ bad: document.querySelectorAll('#spyState .spy-chk.bad').length, guide: !!document.querySelector('#spyState .spy-upd a[href="#definicoes.script"]'), noCopy: !document.querySelector('#spyState [data-act=ibCopy]') }));
    ok('estado do Spyke: mostra o que falta (script, notícias, e-mail) e leva a Definições → Script Google (sem partes para copiar no Spyke)', st.bad >= 3 && st.guide && st.noCopy, JSON.stringify(st));
    NEWV = true; await E(p, () => document.querySelector('#spyState [data-act=spyCheckAll]').click()); await sleep(2500);
    const st2 = await E(p, () => ({ ok: [...document.querySelectorAll('#spyState .spy-chk.ok b')].map(x => x.textContent), guide: !!document.querySelector('#spyState .spy-upd') }));
    ok('estado do Spyke: depois de atualizar o script fica tudo verde (IA, script, notícias)', ['Cérebro (IA)', 'Script Google', 'Notícias'].every(t => st2.ok.includes(t)) && !st2.guide, JSON.stringify(st2));
    await E(p, () => { OS.News.cache = {}; location.hash = 'jornal'; }); await sleep(1500);
    ok('script atualizado: o Jornal mostra as notícias', await E(p, () => /Notícia de teste/.test(document.getElementById('view').innerText)));
    ok('sem erros de JavaScript (estado do Spyke)', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // script v10 → só falta a Parte 3 (um ficheiro novo, sem apagar nada)
  { const { ctx, p, errs } = await newPage(b, PROFILES[0]);
    await ctx.route(/script\.google\.com/, rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, v: 10, items: [], docs: {} }) }));
    await p.goto(BASE); await unlock(p); await E(p, () => { OS.Jarvis && OS.Jarvis.close(); OS.setOne('inbox', { url: 'https://script.google.com/macros/s/AKfyTESTE123/exec', key: 'k', ver: 10 }); location.hash = 'definicoes.script'; }); await sleep(700);
    const g = await E(p, () => { const u = document.getElementById('parte4'); return u ? { t: u.innerText, btns: [...u.querySelectorAll('[data-act=ibCopy]')].map(x => x.dataset.t) } : null; });
    ok('script v10: Definições → Script Google pede a Parte 3, num ficheiro novo (sem apagar as partes 1 e 2)', g && /Parte 3 · copiar e colar/.test(g.t) && /ficheiro novo/.test(g.t) && g.btns.join() === 'p3', JSON.stringify(g && g.btns));
    await p.evaluate(() => { window.__clip = ''; navigator.clipboard.writeText = t => { window.__clip = t; return Promise.resolve(); }; });
    await p.click('#parte4 [data-act=ibCopy]'); await sleep(300);
    ok('script v10: o botão copia a Parte 3 (com o doGet novo e sem repetir a chave)', await E(p, () => /PARTE 3/.test(window.__clip) && /function doGet/.test(window.__clip) && !/const KEY/.test(window.__clip)));
    ok('sem erros de JavaScript (Parte 3)', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // leitores dentro da app: e-mail inteiro, notícia completa (texto do jornal ou escrita pelo Spyke) e agenda Google pelo script
  { const { ctx, p, errs } = await newPage(b, PROFILES[0]); const d0 = new Date(); d0.setDate(d0.getDate() + 2); d0.setHours(19, 30, 0, 0); let ce = null;
    await ctx.route(/script\.google\.com/, rt => { const u = new URL(rt.request().url()), op = u.searchParams.get('op'), J = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (op === 'ping') return J({ ok: true, v: 11 });
      if (op === 'gx') return J({ ok: true, s: 'Proposta de estágio', t: [{ id: 'z1', f: 'Ana RH <ana@empresa.pt>', to: 'ryan@x.pt', d: new Date().toISOString(), s: 'Proposta de estágio', b: 'Olá Ryan,\n\nSegue a proposta completa do estágio com todos os detalhes do contrato e a parte final que antes não aparecia. Fim da mensagem.', h: '<p>Olá <b>Ryan</b></p><script>parent.__x=1</script><img src=x onerror="parent.__x=1"><a href="javascript:parent.__x=1">x</a>', at: ['contrato.pdf'] }] });
      if (op === 'cl') return J({ ok: true, ev: [{ id: 'g1', t: 'Jantar (Google)', s: d0.toISOString(), e: new Date(d0.getTime() + 36e5).toISOString(), all: false, loc: 'Aveiro', cal: 'Pessoal' }] });
      if (op === 'ce') { ce = Object.fromEntries(u.searchParams); return J({ ok: true }); }
      if (op === 'nw') return J({ ok: true, nw: { 'PT:WORLD': [{ t: 'Notícia aberta pelo jornal', s: 'JN', l: 'https://news.google.com/rss/articles/AAA', d: Date.now() }, { t: 'Notícia de jornal fechado', s: 'Público', l: 'https://news.google.com/rss/articles/BBB', d: Date.now() - 6e4 }], 'BR:WORLD': [] } });
      return J({ ok: true, items: [], docs: {} }); });
    await ctx.route(/\/api\/read/, rt => { const u = new URL(rt.request().url()).searchParams.get('u'), J = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (/AAA/.test(u)) return J({ ok: true, u: 'https://www.jn.pt/a', t: 'Notícia aberta pelo jornal', s: 'Jornal de Notícias', img: '', p: ['Primeiro parágrafo da notícia completa, com os factos principais do que aconteceu hoje em Aveiro e no resto do país.', 'Segundo parágrafo com as declarações dos envolvidos e o contexto do que levou a esta situação inesperada para todos.', 'Terceiro parágrafo com números: 120 pessoas, 3 cidades e um investimento de 4 milhões de euros anunciado pelo governo.', 'Quarto parágrafo com o que vem a seguir, as próximas reuniões e o calendário previsto pelas autoridades responsáveis.', '<img src=x onerror="parent.__x=1"> parágrafo com texto perigoso que tem de aparecer só como texto e nunca como código a correr.'] });
      return J({ ok: true, u: 'https://www.publico.pt/b', t: 'x', s: 'publico.pt', p: [], desc: 'Resumo curto.' }); });
    await ctx.route(/generativelanguage/, rt => { const b = rt.request().postData() || ''; if (/conta-a COMPLETA/.test(b) && /google_search/.test(b)) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'O Spyke escreveu o primeiro parágrafo.\n\nSegundo parágrafo escrito.\n\nTerceiro parágrafo escrito.' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://vertexaisearch.cloud.google.com/x', title: 'publico.pt' } }, { web: { uri: 'https://vertexaisearch.cloud.google.com/y', title: 'rtp.pt' } }] } }] }) }); return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }) }); });
    await p.goto(BASE); await unlock(p); await E(p, () => { OS.Jarvis && OS.Jarvis.close(); OS.setOne('inbox', { url: 'https://script.google.com/macros/s/AKfyTESTE123/exec', key: 'k', ver: 11 }); OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' });
      OS.Mail._set({ at: Date.now(), items: [{ id: 'z1', s: 'Proposta de estágio', f: 'Ana RH <ana@empresa.pt>', d: new Date().toISOString(), u: true, sn: 'Segue a proposta…' }], ai: {}, sum: '' }); location.hash = 'email.caixa'; }); await sleep(500);
    await p.click('#view .ml-it .ml-t'); await sleep(800);
    const em = await E(p, () => { const m = document.querySelector('#modal .ml-rd'); return m ? m.innerText : ''; });
    ok('e-mail: abre o e-mail inteiro dentro da app (até ao fim, com anexos)', /parte final que antes não aparecia\. Fim da mensagem/.test(em) && /contrato\.pdf/.test(em), em.slice(0, 160));
    ok('e-mail: nada abre fora da app', ctx.pages().length === 1);
    await p.click('#modal [data-act=mlFmt]'); await sleep(800);
    ok('e-mail formatado: num quadro isolado, sem scripts (o código malicioso de um e-mail não corre)', await E(p, () => { const f = document.querySelector('#modal iframe.ml-fr'); return !!f && !/allow-scripts|allow-same-origin/.test(f.getAttribute('sandbox')) && window.__x === undefined; }));
    // LinkedIn: as notificações abrem no leitor dentro da app, nunca no Gmail
    await E(p, () => { OS.UI.closeModal(); OS.Mail._set({ li: { at: Date.now(), items: [{ id: 'li1', s: 'Nova mensagem de Joana Silva', f: 'LinkedIn <messages-noreply@linkedin.com>', d: new Date().toISOString(), u: true, sn: 'Olá Ryan, vi o teu perfil…' }], sum: { resumo: 'Uma mensagem nova.', mensagens: [{ id: 'li1', de: 'Joana Silva', texto: 'Olá Ryan, vi o teu perfil…' }], convites: [], vagas: [], publicacoes: [] } } }); location.hash = 'email.linkedin'; }); await sleep(500);
    ok('LinkedIn: nenhum botão leva ao Gmail', await E(p, () => !document.querySelector('#view a[href*="mail.google.com"]') && !!document.querySelector('#view [data-act=mlRead][data-id="li1"]')));
    await p.click('#view button[data-act=mlRead][data-id="li1"]'); await sleep(800);
    ok('LinkedIn: "Abrir" abre o e-mail dentro da app (sem Responder nem Gmail)', await E(p, () => { const m = document.querySelector('#modal .ml-rd'); return !!m && /proposta completa/.test(m.innerText) && !m.querySelector('[data-act=mlReply]') && !m.querySelector('a[href*="mail.google.com"]'); }) && ctx.pages().length === 1);
    await E(p, () => OS.UI.closeModal()); await p.click('#view .li-t[data-act=mlRead][data-id="li1"]'); await sleep(600);
    ok('LinkedIn: tocar na própria notificação também abre o leitor', await E(p, () => !!document.querySelector('#modal .ml-rd')));
    await E(p, () => { OS.UI.closeModal(); OS.News.cache = {}; location.hash = 'jornal'; }); await sleep(1500);
    await p.click('#view .nw-c .nw-a'); await sleep(1200);
    const n1 = await E(p, () => { const m = document.querySelector('#modal .nw-rd'); return m ? m.innerText : ''; });
    ok('jornal: a notícia abre dentro da app com o texto completo do jornal', /Texto de Jornal de Notícias/i.test(n1) && /Quarto parágrafo/.test(n1) && ctx.pages().length === 1, n1.replace(/\s+/g, ' ').slice(0, 300));
    ok('jornal: texto do jornal entra só como texto (sem código a correr)', await E(p, () => window.__x === undefined && /onerror/.test(document.querySelector('#modal .nw-body').textContent)));
    await E(p, () => OS.UI.closeModal()); await sleep(200); await p.click('#view .nw-c:nth-child(2) .nw-a'); await sleep(1500);
    const n2 = await E(p, () => { const m = document.querySelector('#modal .nw-rd'); return m ? m.innerText : ''; });
    ok('jornal: jornal que bloqueia → o Spyke escreve a notícia completa com as fontes, dentro da app', /escrita pelo Spyke/i.test(n2) && /Terceiro parágrafo escrito/.test(n2) && /publico\.pt · rtp\.pt/.test(n2), n2.replace(/\s+/g, ' ').slice(0, 300));
    await E(p, () => { OS.UI.closeModal(); OS.setOne('integ', { gcal: true }); OS.gcalStart(); }); await sleep(800);
    ok('agenda Google pelo script: os eventos aparecem no Calendário', await E(p, d => OS.Cal.items(d, d).some(x => x.src === 'gcal' && x.title === 'Jantar (Google)' && x.start === '19:30'), await E(p, t => OS.U.iso(new Date(t)), d0.getTime())));
    const ad = await E(p, () => OS.gcalAdd({ title: 'Dentista', date: OS.U.addDays(OS.U.today(), 5), start: '10:00' }));
    ok('agenda Google: o Spyke consegue marcar eventos na agenda Google', ad && ad.ok && ce && ce.t === 'Dentista' && ce.h === '10:00', JSON.stringify(ce));
    const er2 = errs.filter(e => !/sandboxed|about:srcdoc|Content Security Policy/.test(e)); ok('sem erros de JavaScript (leitores)', !er2.length, er2.slice(0, 3).join(' | ')); await ctx.close(); }
  // nome da app
  { const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), m = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    ok('nome da app: OCEANUM no ecrã principal, no título e no manifesto', m.name === 'OCEANUM' && m.short_name === 'OCEANUM' && /<title>OCEANUM<\/title>/.test(html) && /apple-mobile-web-app-title" content="OCEANUM"/.test(html)); }
}

/* ================= PAINEL ÚNICO, PRÓXIMOS PASSOS, NOMES EM PORTUGUÊS E OUTLOOK DA FACULDADE ================= */
async function novosTests(b) { cur = 'Novos'; console.log('\n=== Painel, Próximos passos, nomes e Outlook ===');
  const { ctx, p, errs } = await newPage(b, PROFILES[0]); const posts = []; let linked = false, opened = '';
  const ITEMS = [{ id: 'o1', s: 'CONT1 - enunciado do trabalho', f: 'Secretaria <sec@ua.pt>', d: new Date().toISOString(), u: true, sn: 'Segue o enunciado.' }, { id: 'o2', s: 'Dúvidas', f: 'Ana Silva <ana.silva@ua.pt>', d: new Date(Date.now() - 6e4).toISOString(), u: false, sn: 'Olá, sobre a aula.' }, { id: 'o3', s: 'Campanha de produto', f: 'Prof. Rui <rui@ua.pt>', d: new Date(Date.now() - 12e4).toISOString(), u: false, sn: 'Segmentação de mercado e 4P.' }, { id: 'o4', s: 'Propinas', f: 'Serviços <sas@ua.pt>', d: new Date(Date.now() - 18e4).toISOString(), u: false, sn: 'Prazo de pagamento.' }];
  await ctx.route(/script\.google\.com/, rt => { const u = new URL(rt.request().url()), P = Object.fromEntries(new URLSearchParams(rt.request().postData() || '')), op = u.searchParams.get('op') || P.op, J = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (rt.request().method() === 'POST') posts.push(P);
    if (op === 'ping') return J({ ok: true, v: 11 }); if (op === 'olinfo') return J({ ok: true, v: 12, redirect: 'https://script.google.com/macros/d/SID/usercallback', cfg: posts.some(x => x.op === 'olcfg'), linked, user: linked ? 'ryan@ua.pt' : '', err: '' });
    if (op === 'olcfg') return J({ ok: true }); if (op === 'olauth') return J({ ok: true, url: 'https://login.microsoftonline.com/ua.pt/oauth2/v2.0/authorize?client_id=x' });
    if (op === 'ol') return J({ ok: true, user: 'ryan@ua.pt', items: ITEMS }); if (op === 'olx') return J({ ok: true, s: 'Dúvidas', t: [{ id: 'o2', f: 'Ana Silva <ana.silva@ua.pt>', d: new Date().toISOString(), b: 'Texto completo do e-mail da professora.', h: '<p>Texto</p>', at: ['slides.pdf'] }] });
    if (op === 'ols') return J({ ok: true }); return J({ ok: true, items: [], docs: {} }); });
  await ctx.route(/generativelanguage/, rt => { const b2 = rt.request().postData() || ''; if (/\/models\?/.test(rt.request().url())) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }] }) });
    if (/Separa estes e-mails/.test(b2)) { const sid = (b2.match(/\\"id\\":\\"([a-z0-9]+)\\",\\"nome\\":\\"Marketing/) || [])[1]; return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ m: [{ id: 'o3', disc: sid || 'geral' }, { id: 'o4', disc: 'geral' }] }) }] } }] }) }); }
    if (/plano de próximos passos/.test(b2)) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ foco: 'Fechar o semestre com média 15.', passos: [{ area: 'estudos', nivel: 1, passo: 'Resolver 10 exercícios de Contabilidade', porque: 'meta média 15' }, { area: 'dinheiro', nivel: 3, passo: 'Criar transferência automática de 300 €', porque: 'meta poupar' }] }) }] } }] }) });
    return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }) }); });
  await p.goto(BASE); await unlock(p); await p.evaluate(() => { window.open = u => { window.__opened = u || 'blank'; return { set location(v) { window.__opened = String(v); }, close() { } }; }; });
  await E(p, () => { OS.Jarvis && OS.Jarvis.close(); OS.setOne('inbox', { url: 'https://script.google.com/macros/s/AKfyX/exec', key: 'k', ver: 11 }); OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); localStorage.removeItem('os2aiQuota'); });
  // Painel único
  await E(p, () => { location.hash = 'painel'; }); await sleep(900);
  const pv = await E(p, () => ({ hash: location.hash, nav: [...document.querySelectorAll('#side a[href^="#"] span')].map(x => x.textContent), ctrl: !!document.getElementById('control'), life: !!document.querySelector('#view .life'), grid: !!document.querySelector('#view .dash-grid'), money: /Receitas × despesas/.test(document.getElementById('view').innerText), uni: !!document.querySelector('#view .dash') && /Universidade/.test(document.getElementById('view').innerText), agendaDup: [...document.querySelectorAll('#view .dc h3')].some(h => h.textContent === 'Agenda') }));
  ok('Painel: Visão Geral e Painel são uma só página "Painel" (o endereço antigo leva lá)', pv.hash === '#visao' && pv.nav.includes('Painel') && !pv.nav.includes('Visão Geral') && pv.nav.filter(x => x === 'Painel').length === 1, JSON.stringify(pv.nav.slice(0, 6)));
  ok('Painel: tem tudo (estado das áreas, centro de controlo, cartões, dinheiro em 6 meses, universidade) sem cartões repetidos', pv.ctrl && pv.life && pv.grid && pv.money && pv.uni && !pv.agendaDup, JSON.stringify(pv));
  // nomes em português
  const eng = await E(p, () => [...document.querySelectorAll('#side a span, .tn-dd b, #view .tabs a')].map(x => x.textContent).filter(t => /Next Action|North Star|Roadmap|Long Term|Decision Center|Knowledge Base|Networking|Control Room|Opportunity/i.test(t)));
  ok('nomes: nenhum separador em inglês no menu', !eng.length, eng.join(', '));
  // próximos passos
  await E(p, () => { const U = OS.U, t = U.today(); OS.add('subjects', { name: 'Contabilidade', status: 'Em curso', prof: 'Ana Silva', mail: 'CONT1' }); OS.add('subjects', { name: 'Marketing', status: 'Em curso', prof: 'Rui' });
    OS.add('goals', { title: 'Poupar 5000 €', cat: 'Finanças', horizon: '1 ano', metric: 'manual', target: 5000, base: 0, cur: 1000, status: 'Ativa', start: U.addDays(t, -30), due: U.addDays(t, 300), steps: [{ t: 'Abrir conta poupança' }] }); location.hash = 'next'; }); await sleep(700);
  const lp = await E(p, () => ({ dir: [...document.querySelectorAll('#side .nav-g')].filter(g => /Direção/.test(g.querySelector('h6').textContent)).map(g => g.textContent)[0] || '', cats: document.querySelectorAll('.lp-c').length, txt: document.getElementById('view').innerText }));
  ok('Próximos passos: está na Direção, com as áreas da vida e os passos do pequeno ao grande', /Próximos passos/.test(lp.dir) && lp.cats === 5 && /Abrir conta poupança/.test(lp.txt) && /Hoje/.test(lp.txt) && /Este mês/.test(lp.txt), lp.dir.replace(/\s+/g, ' ').slice(0, 120));
  await p.click('#view [data-act=lpAI]'); await sleep(1500);
  ok('Próximos passos: o Spyke faz o plano com novos passos ligados às metas', await E(p, () => /Resolver 10 exercícios de Contabilidade/.test(document.getElementById('view').innerText) && /Fechar o semestre/.test(document.getElementById('view').innerText)));
  await E(p, () => location.hash = 'next.agora'); await sleep(400); ok('Próximos passos: a aba "Agora" mantém a próxima ação de sempre', await E(p, () => !!document.querySelector('#view .na') || /Nada encaixa/.test(document.getElementById('view').innerText)));
  // Outlook da faculdade: a aba Faculdade só mostra e-mails; a configuração está em Definições → E-mail
  await E(p, () => location.hash = 'email.faculdade'); await sleep(1200);
  ok('Faculdade: sem nada configurado, não há passos de configuração (só o botão para Definições → E-mail)', await E(p, () => !document.querySelector('#view .ol-f, #view [data-act=olAuth], #view [data-form=olDom], #view .ol-set') && !!document.querySelector('#view a[href="#definicoes.email"]')));
  ok('E-mail: o separador "Ligar contas" saiu da página E-mail', await E(p, () => ![...document.querySelectorAll('#view .tabs a')].some(a => /Ligar contas/.test(a.textContent))));
  await E(p, () => location.hash = 'email.contas'); await sleep(900);
  ok('E-mail: o endereço antigo "Ligar contas" abre Definições → E-mail', await E(p, () => location.hash === '#definicoes.email' && /Gmail principal/.test(document.getElementById('view').innerText) && !!document.getElementById('uniSet') && [...document.querySelectorAll('#view .tabs a')].map(a => a.textContent.trim()).join('|') === 'Geral|E-mail|Ligações|Atalhos do iPhone|Spyke (assistente)|Impostos|Script Google'));
  ok('Outlook: mostra o passo a passo com o endereço de redirecionamento para copiar', await E(p, () => /usercallback/.test(document.getElementById('view').innerText) && /Registos de aplicações/.test(document.getElementById('view').innerText)));
  await p.fill('#view .ol-f [name=id]', '11111111-2222-3333-4444-555555555555'); await p.fill('#view .ol-f [name=ten]', '22222222-3333-4444-5555-666666666666'); await p.fill('#view .ol-f [name=sec]', 'segredo-de-teste-123'); await p.click('#view .ol-f button'); await sleep(800);
  ok('Outlook: os dados da aplicação vão por POST (o segredo não fica no endereço)', posts.some(x => x.op === 'olcfg' && x.sec === 'segredo-de-teste-123' && x.id.length === 36));
  await p.click('#view [data-act=olAuth]'); await sleep(600); ok('Outlook: "Entrar com a conta da faculdade" abre o login da Microsoft', /login\.microsoftonline\.com/.test(await E(p, () => window.__opened || '')));
  linked = true; await p.click('#view [data-act=olInfo]'); await sleep(1200);
  ok('Definições → E-mail: mostra "Outlook ligado" com o botão Desligar', await E(p, () => /Outlook ligado/.test(document.getElementById('uniSet').innerText) && !!document.querySelector('#uniSet [data-act=olOff]')));
  await E(p, () => location.hash = 'email.faculdade'); await sleep(1500);
  ok('Faculdade: ligada, só e-mails e matérias (nenhum passo de configuração)', await E(p, () => !!document.querySelector('#view .ol-list') && !document.querySelector('#view .ol-f, #view [data-act=olAuth], #view [data-act=olOff], #view [data-form=olDom], #view details')));
  const om = await E(p, () => ({ n: document.querySelectorAll('#view .ol-it').length, chips: [...document.querySelectorAll('#view .ml-f .chip')].map(c => c.textContent.trim()), m: Object.fromEntries(OS.UniMail.items().map(it => [it.id, OS.UniMail.subjName(OS.UniMail.subjOf(it))])) }));
  ok('Outlook: ligado, lê os e-mails da faculdade', om.n === 4, JSON.stringify(om.chips));
  ok('Outlook: separa por matéria (código da cadeira, professor, IA e Geral)', om.m.o1 === 'Contabilidade' && om.m.o2 === 'Contabilidade' && om.m.o3 === 'Marketing' && om.m.o4 === 'Geral' && om.chips.some(c => /Contabilidade · 2/.test(c)) && om.chips.some(c => /Marketing · 1/.test(c)), JSON.stringify(om.m));
  await p.click('#view .ml-f .chip:has-text("Marketing")'); await sleep(300); ok('Outlook: filtrar por matéria', await E(p, () => document.querySelectorAll('#view .ol-it').length === 1));
  await p.click('#view .ml-f .chip:has-text("Todas")'); await sleep(300);
  await E(p, () => { const s = document.querySelector('#view .ol-sel[data-id="o4"]'), mk = OS.all('subjects').find(x => x.name === 'Marketing'); s.value = mk.id; s.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(400);
  ok('Outlook: mudar a matéria à mão também ensina o remetente', await E(p, () => OS.UniMail.subjName(OS.UniMail.subjOf(OS.UniMail.get('o4'))) === 'Marketing' && Object.keys(OS.one('unimail').snd).includes('sas@ua.pt')));
  await p.click('#view .ol-it .ml-t[data-id="o2"]'); await sleep(900);
  ok('Outlook: abre o e-mail inteiro dentro da app', await E(p, () => /Texto completo do e-mail da professora/.test((document.querySelector('#modal .ml-rd') || {}).innerText || '') && /slides\.pdf/.test(document.querySelector('#modal .ml-rd').innerText)));
  await p.fill('#olRpT', 'Obrigado, professora.'); await p.click('#modal [data-act=olSend]'); await sleep(700);
  ok('Outlook: responder vai pelo Outlook da faculdade', posts.some(x => x.op === 'ols' && x.id === 'o2' && /Obrigado/.test(x.b)));
  await E(p, () => OS.UI.closeModal && OS.UI.closeModal()); await sleep(200);
  // pelo Gmail (reencaminhamento): o domínio fica em Definições → E-mail e os e-mails aparecem na Faculdade, separados por matéria
  await E(p, () => { OS.add('subjects', { name: 'Estatística', status: 'Em curso', mail: 'EST' }); OS.Mail._set({ at: Date.now(), items: [{ id: 'g1', s: 'CONT1 - notas do teste', f: 'Prof. Rui <rui@ua.pt>', to: 'ryan@ua.pt', d: new Date().toISOString(), u: true, sn: 'Notas publicadas.' }] }); });
  await E(p, () => location.hash = 'definicoes.email'); await sleep(600);
  await p.fill('#uniSet [name=dom]', 'ua.pt'); await p.click('#uniSet [data-form=olDom] button'); await sleep(600);
  ok('Definições → E-mail: guarda o domínio e mostra que o reencaminhamento funciona', await E(p, () => OS.one('unimail').dom === 'ua.pt' && /A funcionar: 1 e-mail de @ua\.pt/.test(document.getElementById('uniSet').innerText)), await E(p, () => (document.getElementById('uniSet') || {}).innerText || 'sem cartão'));
  await E(p, () => location.hash = 'email.faculdade'); await sleep(700);
  ok('Faculdade: uma sigla curta (EST) só conta como palavra inteira, não dentro de "prestação"', await E(p, () => { const f = { id: 'gx', s: 'Propinas: prazo da 2.ª prestação', f: 'Serviços Académicos <sa@ua.pt>', sn: 'O prazo termina a 31.' }, g = { id: 'gy', s: 'EST - exame de recurso', f: 'Prof. Eva <eva@ua.pt>', sn: '' }; return OS.UniMail.subjName(OS.UniMail.subjOf(f)) !== 'Estatística' && OS.UniMail.subjName(OS.UniMail.subjOf(g)) === 'Estatística'; }));
  ok('Faculdade: a linha do e-mail mostra o remetente e o assunto com a largura toda', await E(p, () => { const t = document.querySelector('#view .ol-it .ml-t'); return !!t && t.getBoundingClientRect().width > 200 && /Prof\. Rui/.test(t.innerText) && /notas do teste/.test(t.innerText); }));
  ok('Faculdade: o e-mail reencaminhado pelo Gmail aparece na matéria certa', await E(p, () => { const it = OS.UniMail.items().find(x => x.id === 'g1'); return !!it && OS.UniMail.subjName(OS.UniMail.subjOf(it)) === 'Contabilidade' && !!document.querySelector('#view .ml-t[data-id="g1"]'); }));
  // Spyke dentro de Definições + Parte 4 fácil de copiar
  ok('Definições: o Spyke saiu do menu principal', !(await E(p, () => [...document.querySelectorAll('#side a, .tn-dd a')].some(a => a.getAttribute('href') === '#spyke'))));
  await E(p, () => location.hash = 'spyke'); await sleep(700);
  const sp = await E(p, () => ({ h: location.hash, tabs: [...document.querySelectorAll('#view .tabs a')].map(a => a.textContent.trim()), st: !!document.getElementById('spyState'), h1: (document.querySelector('#view h1') || {}).textContent, side: !!document.querySelector('#side .side-set.on') }));
  ok('Definições: #spyke abre Definições → Spyke (links antigos e Siri continuam a funcionar)', sp.h === '#definicoes.spyke' && sp.st && sp.h1 === 'Definições' && sp.tabs.join('|') === 'Geral|E-mail|Ligações|Atalhos do iPhone|Spyke (assistente)|Impostos|Script Google' && sp.side, JSON.stringify(sp));
  ok('Definições → Spyke: a Parte 4 já não aparece no Spyke (só em Definições → Script Google)', await E(p, () => !/Parte 4/.test(document.getElementById('spyState').innerText) && !document.querySelector('#spyState [data-act=ibCopy]')));
  await E(p, () => location.hash = 'definicoes.script'); await sleep(700);
  const sc = await E(p, () => ({ t: document.getElementById('view').innerText, b: [...document.querySelectorAll('#view [data-act=ibCopy]')].map(x => x.dataset.t) }));
  ok('Definições → Script Google: as 7 partes com botão de copiar e a parte que falta (5) em destaque', /Parte 4/.test(sc.t) && /Parte 5/.test(sc.t) && /Parte 7/.test(sc.t) && ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].every(x => sc.b.includes(x)) && sc.b[0] === 'p5' && /Parte 5 · copiar e colar/.test(sc.t), JSON.stringify(sc.b));
  await E(p, () => { window.__clip = ''; navigator.clipboard.writeText = t => { window.__clip = t; return Promise.resolve(); }; });
  await p.click('#view .sc-parts [data-act=ibCopy][data-t=p4]'); await sleep(300);
  ok('Definições → Script Google: "Copiar parte 4" copia a Parte 4 (Outlook), sem mexer nas outras', await E(p, () => /function op_olinfo/.test(window.__clip) && !/function doGet/.test(window.__clip)));
  await E(p, () => { OS.UniMail._set(null, { has4: false }); OS.request(); }); await sleep(500);
  ok('Definições → Script Google: sem a Parte 4 diz "falta" e mostra os passos', await E(p, () => { const t = document.getElementById('parte4').innerText; return /copiar e colar/.test(t) && /falta/.test(t) && /Parte4/.test(t) && /Nova versão/.test(t); }));
  await E(p, () => location.hash = 'definicoes.spyke'); await sleep(500);
  ok('Definições → Spyke: mesmo sem a Parte 4, o Spyke não fala dela (está só em Script Google)', await E(p, () => !/Parte 4/.test(document.getElementById('spyState').innerText)));
  await E(p, () => location.hash = 'definicoes'); await sleep(600);
  ok('Definições → Geral: mantém perfil, segurança, sincronização e atalho', await E(p, () => !!document.getElementById('syncPn') && !!document.getElementById('inboxPn') && !document.getElementById('spyState') && /Perfil/.test(document.getElementById('view').innerText) && document.querySelectorAll('#view .tabs').length === 1 && document.querySelectorAll('#view h1').length === 1));
  // "Ver mais": o botão mostra logo o que estava escondido (a página não é redesenhada se não mudou)
  await E(p, () => { OS.views.zzteste = () => OS.UI.head('Teste', '') + '<div class="pn"><div class="list">' + Array.from({ length: 7 }, (_, i) => '<div class="li"><div class="li-t"><b>Dia ' + (i + 1) + '</b></div></div>').join('') + '</div></div>'; location.hash = 'zzteste'; }); await sleep(600);
  const vm0 = await E(p, () => { const b = document.querySelector('#view .list .pg-more'); return b ? b.textContent + '|' + document.querySelectorAll('#view .list .pg-hide').length : ''; });
  await p.click('#view .list .pg-more'); await sleep(300);
  ok('"Ver mais": tocar mostra os itens escondidos na hora', vm0 === 'Ver mais 2|2' && await E(p, () => !document.querySelector('#view .list .pg-hide') && !document.querySelector('#view .list .pg-more')), vm0);
  // hábitos no iPhone: os nomes e as etiquetas nunca ficam por cima dos quadrados dos dias
  await E(p, () => { ['Acordar à hora, sem snooze', '2 blocos de estudo (100 min)'].forEach((n, i) => OS.add('habits', { name: n, core: true, auto: i ? 'estudo' : '', active: true, freq: 'Diário' })); location.hash = 'habitos'; }); await sleep(700);
  const hb = await E(p, () => { const rows = [...document.querySelectorAll('.hab-tbl tbody tr')]; let over = 0; rows.forEach(r => { const n = r.querySelector('.hab-n'), nr = n.getBoundingClientRect().right; [...n.querySelectorAll('b, .bdg')].forEach(e => { if (e.getBoundingClientRect().right > nr + 1) over++; }); }); const t = document.querySelector('.hab-tbl tbody tr button.hab-b'); return { over, rows: rows.length, today: !!t && t.getBoundingClientRect().right <= innerWidth, page: document.documentElement.scrollWidth <= innerWidth + 1 }; });
  ok('Hábitos (iPhone): nomes e etiquetas cabem na coluna, o dia de hoje está à vista e a página não sai para o lado', hb.rows >= 2 && !hb.over && hb.today && hb.page, JSON.stringify(hb));
  // Finanças: cada conta tem o banco (BTG, Santander, Revolut, Caixa Geral, Wise…) e aparece como "Banco · conta"
  await E(p, () => location.hash = 'financas.contas'); await sleep(600);
  const bk = await E(p, () => [...document.querySelectorAll('#view .bk-add .chip')].map(c => c.textContent.trim()));
  ok('Finanças: botões para juntar conta por banco (BTG, Santander, Revolut, Caixa Geral, Wise)', ['BTG Pactual', 'Santander', 'Revolut', 'Caixa Geral de Depósitos', 'Wise'].every(n => bk.includes(n)), bk.slice(0, 8).join(', '));
  await p.click('#view .bk-add .chip:has-text("Revolut")'); await sleep(500);
  ok('Finanças: tocar no banco abre a nova conta já com o banco', await E(p, () => { const f = document.querySelector('#osform'); return !!f && f.elements.inst.value === 'Revolut' && f.elements.name.value === 'Conta à ordem'; }));
  await E(p, () => document.querySelector('#osform').requestSubmit()); await sleep(500);
  const rv = await E(p, () => { const a = OS.all('accounts').find(x => x.inst === 'Revolut'); return a ? { lab: OS.L.accLabel(a), id: a.id } : null; });
  ok('Finanças: a conta fica "Revolut · Conta à ordem"', !!rv && rv.lab === 'Revolut · Conta à ordem', JSON.stringify(rv));
  await E(p, () => OS.UI.openForm('transactions', null, { type: 'Despesa' })); await sleep(400);
  ok('Finanças: ao registar um gasto, a conta mostra o banco', await E(p, () => [...document.querySelectorAll('#osform [name=account] option')].some(o => o.textContent === 'Revolut · Conta à ordem')));
  await E(p, () => { OS.UI.closeDrawer && OS.UI.closeDrawer(); OS.UI.closeModal && OS.UI.closeModal(); location.hash = 'gasto'; }); await sleep(500);
  ok('Gasto rápido: "Pago com" mostra o banco de cada conta', await E(p, () => [...document.querySelectorAll('#view .qg-chips span')].some(s => /Revolut · Conta à ordem/.test(s.textContent))));
  // toda a configuração vive nas Definições: nenhuma página tem passos, chaves ou botões de ligar serviços
  const CFG = '[data-aikey], .ai-steps, .ib-w, .ib-steps, .fb-guide, [data-act=gcalOn], [data-act=gcalOff], [data-act=qgStart], [data-bind="invcfg.fh"], [data-act=olAuth], [data-form=olDom], [data-act=invNotif], [data-act=fbApp], [data-bind="focusblk.sc"], #quotesSet, #alertSet, #runSet';
  const pages = await E(p, () => [...new Set([...document.querySelectorAll('#side a[href^="#"], .tn-dd a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(h => h && !/^definicoes/.test(h)))]);
  const bad = [];
  for (const r of pages.concat(['investimentos.cotacoes', 'investimentos.proventos', 'foco', 'gasto', 'calendario', 'corrida', 'dieta.metas', 'email', 'email.faculdade', 'email.caixa', 'jornal', 'simuladores', 'universidade', 'trabalho', 'trabalho.foto', 'fe', 'eu'])) { await E(p, r => location.hash = r, r); await sleep(120); const n = await E(p, q => [...document.querySelectorAll('#view ' + q.split(', ').join(', #view '))].map(e => e.className || e.id || e.getAttribute('data-act') || e.tagName).slice(0, 3), CFG); if (n.length) bad.push(r + ': ' + n.join('/')); }
  ok('Definições: nenhuma página fora das Definições tem passos de configuração (' + pages.length + ' páginas)', !bad.length, bad.slice(0, 6).join(' | '));
  await E(p, () => location.hash = 'foco.apps'); await sleep(500);
  ok('Definições → Atalhos do iPhone: bloquear apps, gasto rápido e relógio (o endereço antigo do Bloco de foco leva lá)', await E(p, () => location.hash === '#definicoes.atalhos' && !!document.querySelector('#fbSet [data-act=fbApp]') && !!document.querySelector('#qgSet [data-act=qgStart]') && !!document.getElementById('runSet')));
  await E(p, () => location.hash = 'definicoes.ligacoes'); await sleep(500);
  ok('Definições → Ligações: agenda Google, cotações (com a chave Finnhub e o câmbio) e alertas de preço', await E(p, () => !!document.querySelector('#gcalSet [data-act=gcalOn], #gcalSet [data-act=gcalOff]') && !!document.querySelector('#quotesSet [data-bind="invcfg.fh"]') && /Câmbio manual/.test(document.getElementById('view').innerText) && !!document.getElementById('alertSet')));
  await E(p, () => location.hash = 'definicoes'); await sleep(500);
  ok('Definições → Geral: sem o painel antigo "Integrações"', await E(p, () => !/Integrações/.test(document.getElementById('view').innerText)));
  const er = errs.filter(e => !/Failed to load|net::|sandboxed|about:srcdoc|Content Security Policy/.test(e)); ok('sem erros de JavaScript (novos)', !er.length, er.slice(0, 3).join(' | ')); await ctx.close(); }

/* ================= IA SEM LIMITES: modelos descobertos sozinhos + reserva grátis ================= */
async function aiTests(b) { cur = 'IA'; console.log('\n=== IA sem limites ===');
  const { ctx, p, errs } = await newPage(b, PROFILES[0]); let mode = 'ok'; const hits = [], free = [];
  await ctx.route(/generativelanguage\.googleapis\.com/, rt => { const u = rt.request().url(), J = (st, o) => rt.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    if (/\/models\?/.test(u)) return J(200, { models: ['gemini-2.0-flash-lite', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemma-3-27b-it', 'text-embedding-005', 'gemini-3.5-flash-preview-tts'].map(n => ({ name: 'models/' + n, supportedGenerationMethods: /embedding/.test(n) ? ['embedContent'] : ['generateContent'] })) });
    const m = (u.match(/models\/([^:]+):generateContent/) || [])[1]; hits.push(m);
    if (m === 'gemini-2.0-flash-lite') return J(400, { error: { message: 'This model models/gemini-2.0-flash-lite is no longer available. Please update your code to use models/gemini-3.5-flash-lite' } });
    if (mode === 'quota' || m === 'gemini-3.5-flash' || (mode === 'old' && m === 'gemini-3.5-flash-lite')) return J(429, { error: { message: 'Quota exceeded for metric generate_content_free_tier_requests, limit per day' } });
    const body = rt.request().postData() || '';
    if (/"functionDeclarations"/.test(body)) return J(200, { candidates: [{ content: { role: 'model', parts: [{ text: 'Feito pelo Google.' }] } }] });
    return J(200, { candidates: [{ content: { parts: [{ text: JSON.stringify({ ok: 'google' }) }] } }] }); });
  await ctx.route(/text\.pollinations\.ai/, rt => { const b2 = JSON.parse(rt.request().postData() || '{}'); free.push(b2); const J = o => rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
    const last = (b2.messages || []).slice(-1)[0] || {};
    if (b2.tools && last.role === 'user') return J({ choices: [{ message: { role: 'assistant', content: '', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'criar_tarefa', arguments: JSON.stringify({ titulo: 'Tarefa criada pela reserva' }) } }] } }] });
    if (b2.tools) return J({ choices: [{ message: { role: 'assistant', content: 'Criei a tarefa, chefe.' } }] });
    if (b2.response_format) return J({ choices: [{ message: { role: 'assistant', content: JSON.stringify({ ok: 'reserva' }) } }] });
    return J({ choices: [{ message: { role: 'assistant', content: 'Primeiro parágrafo do resumo da reserva.\n\nSegundo parágrafo do resumo.' } }] }); });
  await ctx.route(/\/api\/read/, rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, u: 'https://x.pt/a', t: 'x', s: 'x.pt', p: [], desc: 'O que o jornal mostra.' }) }));
  await ctx.route(/script\.google\.com/, rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, v: 11, nw: {}, items: [], docs: {} }) }));
  await p.goto(BASE); await unlock(p); await E(p, () => { OS.Jarvis && OS.Jarvis.close(); OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); localStorage.removeItem('os2aiModels'); localStorage.removeItem('os2aiQuota'); });
  const ms = await E(p, () => OS.AI.discover(true));
  ok('IA: descobre sozinha os modelos que o Google tem hoje (sem voz, imagem nem embeddings)', ms.includes('gemini-3.5-flash') && ms.includes('gemini-3.5-flash-lite') && !ms.some(m => /tts|embedding/.test(m)) && ms.indexOf('gemini-3.5-flash') < ms.indexOf('gemini-2.0-flash-lite') && ms[ms.length - 1] === 'gemma-3-27b-it', ms.join(', '));
  const r1 = await E(p, () => OS.AI.json([{ text: 'teste' }]).then(o => o.ok, e => 'ERRO ' + e.message));
  ok('IA: cota de um modelo esgotada → passa logo ao seguinte, sem esperar', r1 === 'google' && await E(p, () => OS.AI.blocked('gemini-3.5-flash')), r1 + ' · ' + hits.join(' > '));
  mode = 'old'; hits.length = 0; const r1b = await E(p, () => OS.AI.json([{ text: 'teste' }]).then(o => o.ok, e => 'ERRO ' + e.message));
  ok('IA: modelo desligado pelo Google (como o gemini-2.0) fica de lado e usa outro', r1b === 'google' && await E(p, () => OS.AI.blocked('gemini-2.0-flash-lite')) && hits.includes('gemma-3-27b-it'), r1b + ' · ' + hits.join(' > ')); mode = 'ok';
  mode = 'quota'; const r2 = await E(p, () => OS.AI.json([{ text: 'teste' }]).then(o => o.ok, e => 'ERRO ' + e.message));
  ok('IA: com toda a cota do Google esgotada responde a IA grátis de reserva (sem esperar)', r2 === 'reserva', r2);
  const r3 = await E(p, () => OS.AI.text('Resume isto').catch(e => 'ERRO ' + e.message));
  ok('IA: texto (resumos) também passa à reserva', /Primeiro parágrafo/.test(r3), String(r3).slice(0, 60));
  const r4 = await E(p, () => OS.Brain.ask('cria uma tarefa para estudar contabilidade amanhã de manhã').then(r => r.text + ' | ' + (r.did || []).join(';')));
  ok('IA: o Spyke continua a pensar e a agir com a reserva (criou a tarefa)', /Criei a tarefa/.test(r4) && await E(p, () => OS.all('tasks').some(t => t.title === 'Tarefa criada pela reserva')), r4);
  mode = 'quota'; await E(p, () => { OS.setOne('inbox', { url: 'https://script.google.com/macros/s/AKfyX/exec', key: 'k', ver: 11 }); OS.News.cache = { 'PT:WORLD': { at: Date.now(), items: [{ t: 'Notícia bloqueada', s: 'Estadão', l: 'https://news.google.com/rss/articles/ZZZ', d: Date.now(), rel: [{ l: 'https://news.google.com/rss/articles/YYY', t: 'Outra versão', s: 'O Globo' }] }] }, 'BR:WORLD': { at: Date.now(), items: [] } }; location.hash = 'jornal'; }); await sleep(800);
  await E(p, () => { const c = document.querySelector('#view .nw-a'); c && c.click(); }); await sleep(2500);
  const nr = await E(p, () => (document.querySelector('#modal .nw-rd') || {}).innerText || '');
  ok('IA: notícia bloqueada e Google sem cota → o Spyke faz o resumo com o que os jornais publicaram (não mostra erro em inglês)', /Resumo feito pelo Spyke/i.test(nr) && /Primeiro parágrafo/.test(nr) && !/no longer available|IA não conseguiu/i.test(nr), nr.replace(/\s+/g, ' ').slice(0, 200));
  await E(p, () => { OS.UI.closeModal(); OS.setOne('diet', { freeAI: false }); }); const r5 = await E(p, () => OS.AI.json([{ text: 'teste' }]).then(o => o.ok, e => 'ERRO'));
  ok('IA: se desligares a reserva, nada vai para fora do Google', r5 === 'ERRO' && free.length === await E(p, () => window.__fc || 0) + free.length);
  await E(p, () => OS.setOne('diet', { freeAI: true }));
  const er = errs.filter(e => !/Failed to load|net::|status of 4\d\d/.test(e)); ok('sem erros de JavaScript (IA)', !er.length, er.slice(0, 3).join(' | ')); await ctx.close(); }

/* ================= ATUALIZAÇÃO AUTOMÁTICA: nunca mais desinstalar ================= */
async function updateTests(b) { cur = 'Atualização'; console.log('\n=== Atualização automática (sem reinstalar) ===');
  const NEWV = (v, swTag) => { const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/OCEANUM_VERSION=\{"v": "[^"]+"/, `OCEANUM_VERSION={"v": "${v}"`); fs.writeFileSync('/tmp/oc_u_' + v + '.html', html); OVERRIDE = { 'index.html': '/tmp/oc_u_' + v + '.html' };
    if (swTag) { fs.writeFileSync('/tmp/oc_u_sw.js', fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').replace(/oceanum-[a-z0-9]+/, 'oceanum-' + swTag)); OVERRIDE['sw.js'] = '/tmp/oc_u_sw.js'; } };
  const ver = p => p.evaluate(() => (window.OceanumVersion || {}).v || '').catch(() => '');
  const waitVer = async (p, v, ms) => { const t0 = Date.now(); let x = ''; while (Date.now() - t0 < ms) { x = await ver(p); if (x === v) return Date.now() - t0; await sleep(200); } return -1; };
  const installed = async p => { await p.goto(BASE); await unlock(p); await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => { }); await p.reload(); await unlock(p).catch(() => { }); await sleep(600); };
  for (const prof of PROFILES) { const { ctx, p, errs } = await newPage(b, prof); await installed(p); const v0 = await ver(p);
    ok(prof.id + ': app instalada (a funcionar com a cópia guardada)', !!v0 && await p.evaluate(() => !!navigator.serviceWorker.controller));
    // publicaram uma versão nova: ao abrir outra vez já vem a nova (antes vinha a antiga da cópia guardada)
    NEWV('9.1'); await p.reload(); await unlock(p).catch(() => { });
    ok(prof.id + ': ao abrir a app depois de publicar, abre logo a versão nova', await ver(p) === '9.1', 'versão ' + await ver(p));
    // app aberta em segundo plano e sai outra versão: ao voltar atualiza-se sozinha, sem tocar em nada
    NEWV('9.2'); await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(300); await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    const t = await waitVer(p, '9.2', 12000);
    ok(prof.id + ': ao voltar à app, atualiza-se sozinha em poucos segundos', t >= 0, t >= 0 ? (t / 1000).toFixed(1) + ' s' : 'ficou ' + await ver(p));
    const er = errs.filter(e => !/Failed to load|net::/.test(e)); ok(prof.id + ': sem erros de JavaScript (atualização)', !er.length, er.slice(0, 2).join(' | '));
    OVERRIDE = {}; await ctx.close(); }
  // instalação da versão nova a falhar (um ficheiro dá erro, como acontecia no iPhone): mesmo assim atualiza
  { const { ctx, p } = await newPage(b, PROFILES[0]); await installed(p); FAILP = 'manifest.webmanifest'; NEWV('9.3', 'falha93');
    await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r && r.update())).catch(() => { }); await sleep(1500); await p.reload().catch(() => { }); await unlock(p).catch(() => { });
    const t = await waitVer(p, '9.3', 8000); ok('atualização: mesmo com um ficheiro da instalação a falhar, a versão nova entra', t >= 0, 'ficou ' + await ver(p)); FAILP = ''; OVERRIDE = {}; await ctx.close(); }
  // service worker antigo preso: a verificação de versão apaga a cópia guardada e recarrega (os dados ficam)
  { const { ctx, p } = await newPage(b, PROFILES[0]); await installed(p); const id = await p.evaluate(() => OS.add('tasks', { title: 'Fica depois de atualizar', status: 'Próxima' }).id); await sleep(800);
    NEWV('9.4'); await p.evaluate(() => localStorage.setItem('os2updT', JSON.stringify({ v: '9.4', n: 1 }))); await p.evaluate(() => window.OceanumCheckUpdate(false)).catch(() => { });
    const t = await waitVer(p, '9.4', 10000); ok('atualização: se recarregar não chegar, limpa a cópia guardada e entra a nova', t >= 0, 'ficou ' + await ver(p));
    await unlock(p).catch(() => { }); let kept = false; for (let i = 0; i < 30 && !kept; i++) { await sleep(200); kept = await p.evaluate(id => !!(window.OS && OS.get && OS.get('tasks', id)), id).catch(() => false); }
    ok('atualização: os dados ficam depois de atualizar', kept); OVERRIDE = {}; await ctx.close(); }
  // a meio de escrever: não recarrega por baixo do dedo; atualiza quando acabares
  { const { ctx, p } = await newPage(b, PROFILES[0]); await installed(p); await p.evaluate(() => OS.UI.openForm('tasks')); await sleep(300); await p.fill('#drawer input', 'a escrever uma tarefa');
    NEWV('9.5'); await p.evaluate(() => window.OceanumCheckUpdate(false)).catch(() => { }); await sleep(2500);
    ok('atualização: com um formulário a meio, espera (não perde o que escreves)', await ver(p) !== '9.5' && await p.evaluate(() => (document.querySelector('#drawer input') || {}).value === 'a escrever uma tarefa'));
    await p.evaluate(() => OS.UI.closeDrawer()); const t = await waitVer(p, '9.5', 25000); ok('atualização: depois de fechar o formulário, atualiza sozinha', t >= 0, 'ficou ' + await ver(p)); OVERRIDE = {}; await ctx.close(); }
  // rede muito lenta: não fica à espera, abre logo a cópia guardada (e atualiza depois)
  { const { ctx, p } = await newPage(b, PROFILES[0]); await installed(p); SLOWIDX = 9000; const t0 = Date.now(); await p.reload({ waitUntil: 'domcontentloaded' }).catch(() => { }); const dt = Date.now() - t0;
    ok('atualização: com rede muito lenta, abre em menos de 5 s com a cópia guardada', dt < 5500, (dt / 1000).toFixed(1) + ' s'); SLOWIDX = 0; await ctx.close(); }
  // sem internet: abre na mesma
  { const { ctx, p } = await newPage(b, PROFILES[0]); await installed(p); OFFLINE = true; await ctx.setOffline(true); await p.reload().catch(() => { }); let off = false; try { await unlock(p); off = await p.evaluate(() => !!document.querySelector('#view')); } catch (e) { }
    OFFLINE = false; await ctx.setOffline(false); ok('atualização: sem internet a app abre na mesma', off); await ctx.close(); }
}

/* ================= SEGURANÇA: tentar atacar a própria app ================= */
async function securityTests(b) { cur = 'Segurança'; console.log('\n=== Segurança: ataques à própria app ===');
  const PAY = `"'><img src=x onerror="window.__xss=(window.__xss||0)+1"><svg onload="window.__xss=1"></svg><script>window.__xss=1</script>`, JSP = 'javascript:window.__xss=1';
  const { ctx, p, errs } = await newPage(b, PROFILES[0]);
  await ctx.route(/script\.google\.com/, rt => { const u = new URL(rt.request().url()), op = u.searchParams.get('op'), J = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    const it = { t: PAY, s: PAY, l: JSP, su: JSP, d: Date.now(), rel: [{ l: JSP, t: PAY, s: PAY }] };
    if (op === 'ping') return J({ ok: true, v: 11 }); if (op === 'nw') { const nw = {}; JSON.parse(u.searchParams.get('f') || '[]').forEach(f => nw[f.id] = [it, Object.assign({}, it, { d: Date.now() - 1000 })]); return J({ ok: true, nw }); }
    if (op === 'gm') return J({ ok: true, gm: { items: [{ id: 'x1', s: PAY, f: PAY + ' <a@b.pt>', d: new Date().toISOString(), u: true, sn: PAY, lab: [PAY] }], li: [] } });
    if (op === 'gx') return J({ ok: true, s: PAY, t: [{ id: 'x1', f: PAY, to: PAY, d: new Date().toISOString(), s: PAY, b: PAY + ' ' + JSP, h: PAY, at: [PAY] }] });
    if (op === 'cl') return J({ ok: true, ev: [{ id: 'g1', t: PAY, s: new Date().toISOString(), e: new Date(Date.now() + 36e5).toISOString(), all: false, loc: PAY, cal: PAY }] });
    if (op === 'q') return J({ ok: true, q: { AAPL: { p: 1, pc: 1, nm: PAY, cur: 'USD', ex: PAY } } });
    if (op === 'pull') return J({ ok: true, items: [{ id: 'i1', t: new Date().toISOString(), v: 3, d: PAY, c: PAY }] });
    return J({ ok: true, items: [], docs: {} }); });
  await ctx.route(/\/api\/read/, rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, u: JSP, t: PAY, s: PAY, img: JSP, p: [PAY, PAY, PAY, PAY + ' texto comprido o bastante para contar como parágrafo de notícia verdadeira, com mais palavras e mais palavras e mais palavras ainda para passar dos 400 caracteres no total da notícia que estamos a ler.'] }) }));
  await ctx.route(/generativelanguage/, rt => { const T = JSON.stringify({ t: [PAY], titulo: PAY, pontos: [{ titulo: PAY, resumo: PAY, porque: PAY, idx: [0] }], para_ti: PAY, text: PAY, resumo: PAY, sum: PAY, cats: {} });
    rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: /responseMimeType|Responde APENAS JSON|JSON/.test(rt.request().postData() || '') ? T : PAY }] }, groundingMetadata: { groundingChunks: [{ web: { uri: JSP, title: PAY } }] } }] }) }); });
  await p.goto(BASE); await unlock(p);
  const seeded = await E(p, ([PAY, JSP]) => { OS.Jarvis && OS.Jarvis.close(); let n = 0; const t = OS.U.today();
    Object.entries(OS.S).forEach(([c, sc]) => { const o = {}; (sc.fields || []).forEach(f => { const ty = f.t || 'text'; if (/link|url|site|href|web/i.test(f.k)) o[f.k] = JSP; else if (['text', 'area', 'sel', 'custom'].includes(ty)) o[f.k] = PAY; else if (ty === 'multi' || ty === 'tags') o[f.k] = [PAY]; else if (ty === 'date') o[f.k] = t; else if (ty === 'time') o[f.k] = '10:00'; else if (['num', 'money', 'pct', 'rating', 'dur'].includes(ty)) o[f.k] = 1; });
      try { OS.add(c, Object.assign({}, sc.defaults ? sc.defaults() : {}, o), { silent: true }); n++; } catch (e) { } });
    OS.setOne('profile', { name: PAY, short: PAY, employer: PAY, jobRole: PAY }); OS.setOne('mova', { name: PAY }); OS.setOne('news', { tabs: ['PT', 'BR'], themes: [PAY] });
    OS.setOne('inbox', { url: 'https://script.google.com/macros/s/AKfyX/exec', key: 'k', ver: 11 }); OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); OS.setOne('integ', { gcal: true }); try { OS.gcalStart(); } catch (e) { }
    return n; }, [PAY, JSP]);
  ok('segurança: código malicioso gravado em todos os campos de ' + seeded + ' tipos de registo', seeded > 40);
  const bad = () => E(p, () => ({ x: window.__xss || 0, img: document.querySelectorAll('img[src="x"][onerror]').length, svg: document.querySelectorAll('svg[onload]').length, scr: [...document.querySelectorAll('script')].filter(s => /__xss/.test(s.textContent)).length, js: [...document.querySelectorAll('a[href]')].filter(a => /^\s*javascript:/i.test(a.getAttribute('href'))).length }));
  const base = await E(p, () => [...new Set([...document.querySelectorAll('#side a[href^="#"], .tn-dd a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(Boolean))]);
  const hits = []; const seen = new Set();
  for (const r of base.concat(['dominus', 'definicoes', 'explorar'])) { for (const rr of [r]) { if (seen.has(rr)) continue; seen.add(rr); await E(p, rr => { location.hash = rr; }, rr); await sleep(350);
      const subs = await E(p, () => [...document.querySelectorAll('#view .tabs a[href^="#"], #view [role=tablist] a[href^="#"]')].map(a => a.getAttribute('href').slice(1)));
      const v = await bad(); if (v.x || v.img || v.svg || v.scr || v.js) { hits.push(rr + ' ' + JSON.stringify(v)); if (process.env.XSSDBG) console.log('XSS em', rr, await E(p, () => [...document.querySelectorAll('img[src="x"], svg[onload]')].slice(0, 3).map(e => (e.parentElement.parentElement || e.parentElement).outerHTML.slice(0, 400)).join('\n---\n'))); } await E(p, () => { window.__xss = 0; });
      for (const s2 of subs) { if (seen.has(s2)) continue; seen.add(s2); await E(p, s2 => { location.hash = s2; }, s2); await sleep(300); const v2 = await bad(); if (v2.x || v2.img || v2.svg || v2.scr || v2.js) { hits.push(s2 + ' ' + JSON.stringify(v2)); if (process.env.XSSDBG) console.log('XSS em', s2, await E(p, () => [...document.querySelectorAll('img[src="x"], svg[onload]')].slice(0, 3).map(e => (e.parentElement.parentElement || e.parentElement).outerHTML.slice(0, 400)).join('\n---\n'))); } await E(p, () => { window.__xss = 0; }); } } }
  ok('segurança: nenhuma página executa código malicioso guardado nos dados (' + seen.size + ' páginas)', !hits.length, hits.slice(0, 6).join(' | '));
  // formulários de edição com os dados maliciosos
  const fh = []; for (const c of await E(p, () => Object.keys(OS.S))) { await E(p, c => { const r = OS.all(c).slice(-1)[0]; if (r) OS.UI.openForm(c, r.id); }, c); await sleep(120); const v = await bad(); if (v.x || v.img || v.svg || v.scr) fh.push(c); await E(p, () => { OS.UI.closeDrawer && OS.UI.closeDrawer(); OS.UI.closeModal && OS.UI.closeModal(); }); }
  ok('segurança: os formulários de edição mostram o código como texto', !fh.length, fh.join(', '));
  // leitores, Spyke e endereços com código
  await E(p, () => { location.hash = 'email.caixa'; }); await sleep(300); await E(p, () => { OS.Mail._set({ at: Date.now(), items: [{ id: 'x1', s: document.title, f: 'a <a@b.pt>', d: new Date().toISOString(), u: true, sn: 'x' }], ai: {}, sum: '' }); OS.Mail.read('x1'); }); await sleep(700);
  await E(p, () => { const b2 = document.querySelector('#modal [data-act=mlFmt]'); b2 && b2.click(); }); await sleep(500); const em = await bad();
  await E(p, () => { OS.UI.closeModal(); OS.News.cache = {}; location.hash = 'jornal'; }); await sleep(1500); await E(p, () => { const c = document.querySelector('#view .nw-a'); c && c.click(); }); await sleep(1200); const nw = await bad();
  await E(p, () => { OS.UI.closeModal(); OS.Spyke.handle(document.querySelector('#view') ? 'Spyke ' + '"\'><img src=x onerror="window.__xss=1">' : ''); }); await sleep(1200); const sp = await bad();
  for (const h of ['tarefas.<img src=x onerror=window.__xss=1>', 'gasto.<img src=x onerror=window.__xss=1>', 'jornal.<svg onload=window.__xss=1>', 'spyke.<img src=x onerror=window.__xss=1>']) { await E(p, h => { location.hash = h; }, h); await sleep(300); }
  const hs = await bad();
  ok('segurança: e-mail (texto e formatado), notícia aberta, conversa com o Spyke e endereços com código não executam nada', !(em.x || em.img || nw.x || nw.img || nw.js || sp.x || sp.img || hs.x || hs.img || hs.svg), JSON.stringify({ em, nw, sp, hs }));
  // sem desbloquear não se vê nada
  await E(p, () => { OS.add('transactions', { type: 'Despesa', amount: 1, date: OS.U.today(), desc: 'SEGREDO_XYZ', account: (OS.Fin.accounts()[0] || {}).id }); }); await sleep(800);
  const p2 = await ctx.newPage(); await p2.goto(BASE + '#financas.transacoes'); await sleep(1500);
  ok('segurança: sem o código/Face ID não aparece nenhum dado (mesmo abrindo o endereço de uma página)', !(await p2.evaluate(() => document.body.innerText.includes('SEGREDO_XYZ'))));
  await p2.close();
  const er2 = errs.filter(e => !/sandboxed|about:srcdoc|Content Security Policy|Failed to load|net::/.test(e)); ok('sem erros de JavaScript (segurança)', !er2.length, er2.slice(0, 3).join(' | ')); await ctx.close(); }

/* ================= TODOS OS APARELHOS: iPhone, Android, tablets e computador ================= */
async function deviceMatrix(b) {
  for (const prof of PROFILES) { cur = 'Aparelhos · ' + prof.id; console.log(`\n=== Em todos os aparelhos: ${prof.id} ===`);
    const ctx = await b.newContext(prof.o); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('JS: ' + e.message));
    if (prof.slow) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 3 }); }
    await p.addInitScript(H => { window.__spyEar = 1; window.__srN = 0;
      class FakeSR { start() { window.__srN++; this.live = true; this.res = []; window.__cur = this; } say(t) { if (!this.live) return; this.res.push(Object.assign([{ transcript: t }], { isFinal: true })); this.onresult && this.onresult({ resultIndex: this.res.length - 1, results: this.res }); } abort() { this.live = false; setTimeout(() => this.onend && this.onend(), 5); } stop() { this.abort(); } }
      window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;
      if (!localStorage.getItem('__s')) { localStorage.setItem('os2:one~security', JSON.stringify({ data: { hash: H } })); localStorage.setItem('__s', '1'); } }, HASH);
    await p.goto(BASE); await unlock(p); await sleep(1500); await E(p, () => { OS.Jarvis && OS.Jarvis.close(); document.querySelectorAll('#modal').forEach(m => { m.hidden = true; m.innerHTML = ''; }); });
    ok('abre e entra com o código', await E(p, () => !!document.querySelector('.dash')));
    const ovf = async () => E(p, () => document.documentElement.scrollWidth > innerWidth + 1);
    // Definições: sincronização, versão, sem Firebase
    await E(p, () => location.hash = 'definicoes'); await sleep(400);
    const df = await E(p, () => { const v = document.getElementById('view').innerText; return { fb: /Firebase/.test(v), rec: !!document.querySelector('#syncPn [data-act=mvWelcome]'), ver: !!document.querySelector('#verPn [data-act=updCheck]') && /v\d+\.\d+/.test(document.querySelector('#verPn').innerText), bio: /Face ID/.test(v) }; });
    ok('Definições: sem o painel antigo do Firebase', !df.fb);
    ok('Definições: "Sincronizar aparelhos" com "Recuperar os meus dados"', df.rec);
    ok('Definições: versão visível e botão "Procurar atualização"', df.ver);
    ok(prof.id === 'iPhone' ? 'Face ID disponível (só no iPhone)' : 'sem Face ID (só existe no iPhone)', prof.id === 'iPhone' ? df.bio : !(await E(p, () => !!localStorage.getItem('os2bio'))));
    ok('Definições não saem para o lado', !(await ovf()));
    // recuperar os dados abre o formulário com endereço e chave
    await E(p, () => document.querySelector('#syncPn [data-act=mvWelcome]').click()); await sleep(300);
    ok('recuperar: abre o formulário (endereço do script + chave) e cabe no ecrã', await E(p, () => { const f = document.querySelector('#modal form[data-form=mvRec]'), b = f && f.querySelector('button'); if (!b) return false; b.scrollIntoView(); const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));
    await E(p, () => OS.UI.closeModal());
    // Spyke a ouvir
    await E(p, () => { OS.setOne('spyke', { eng: 'device' }); }); await E(p, () => window.__cur && window.__cur.say('Spyke que horas são')); await sleep(900);
    ok('Spyke: começa a ouvir sozinho e responde sem tocar (ao ouvir o nome)', await E(p, () => OS.Spyke.earOn() && [...document.querySelectorAll('#spy .spy-m.spyke .spy-bb')].some(x => /^São \d/.test(x.textContent))));
    ok('Spyke: o painel cabe no ecrã', !(await ovf()) && await E(p, () => { const c = document.querySelector('#spy .spy-card'); if (!c) return false; const r = c.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; }));
    await E(p, () => OS.Spyke.close());
    // Floresta 3D
    await E(p, () => location.hash = 'floresta'); await sleep(2500);
    ok('Floresta: árvore em 3D', await E(p, () => OS.Forest.gl().ok && !!document.querySelector('#fo3d canvas')), JSON.stringify(await E(p, () => OS.Forest.gl())));
    // Decision Center
    const id = await E(p, () => OS.add('decisions', { title: 'Decisão ' + Math.random().toString(36).slice(2, 6), status: 'Em análise', alts: [{ name: 'A' }, { name: 'B' }] }).id);
    await E(p, id => { location.hash = 'decisoes'; OS.Decide.open(id); }, id); await sleep(400);
    ok('Decision Center: abre com o Spyke (IA) e a tabela', await E(p, () => !!document.querySelector('#drawer .dc-ai') && !!document.querySelector('#drawer table.matrix')));
    await E(p, () => OS.UI.closeDrawer());
    // atualização à força: versão nova no servidor e o service worker preso (o que acontecia no tablet Android)
    await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => { });
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/OCEANUM_VERSION=\{"v": "[^"]+"/, 'OCEANUM_VERSION={"v": "9.9"');
    fs.writeFileSync('/tmp/oc_idx2.html', html); OVERRIDE = { 'index.html': '/tmp/oc_idx2.html', '': '/tmp/oc_idx2.html' };
    await E(p, () => window.OceanumCheckUpdate(true)).catch(() => { }); let v = '';
    for (let i = 0; i < 50 && v !== '9.9'; i++) { await sleep(200); v = await E(p, () => (window.OceanumVersion || {}).v || '').catch(() => ''); }
    OVERRIDE = {}; ok('atualização: aparelho atrasado atualiza-se sozinho (mesmo com o service worker preso)', v === '9.9', 'versão ' + v);
    let kept = false; for (let i = 0; i < 40 && !kept; i++) { await sleep(250); kept = await E(p, id => !!(window.OS && OS.get && OS.get('decisions', id)), id).catch(() => false); }
    ok('atualização: os dados continuam lá depois de atualizar', kept);
    ok('sem erros de JavaScript neste aparelho', !errs.length, errs.slice(0, 3).join(' | '));
    await ctx.close(); }
}

async function stress(b) {
  cur = 'Stress'; console.log('\n=== Stress: 3 anos de dados num tablet fraco (CPU 6× mais lenta) ===');
  const prof = PROFILES[2]; const { ctx, p, errs } = await newPage(b, prof); await p.goto(BASE); await unlock(p);
  const n = await E(p, () => { const U = OS.U, acc = (OS.all('accounts')[0] || OS.add('accounts', { name: 'Conta', type: 'Conta à ordem', initial: 1000 }, { silent: true })).id, cats = Object.keys(OS.one('fin').cats.Despesa || { Outros: 1 }), ex = OS.all('exercises');
    for (let i = 0; i < 1095; i++) { const d = U.addDays(U.today(), -i);
      for (let k = 0; k < 3; k++) OS.add('transactions', { type: k ? 'Despesa' : (i % 30 ? 'Despesa' : 'Receita'), amount: 5 + (i * 7 + k * 13) % 90, date: d, cat: cats[(i + k) % cats.length], account: acc, desc: 'Item ' + (i % 40) }, { silent: true });
      if (i % 2 === 0 && ex.length) OS.add('workouts', { date: d, title: 'Treino', items: ex.slice(i % 5, i % 5 + 4).map(e => ({ ex: e.id, sets: [{ reps: 10, kg: 40 }, { reps: 8, kg: 45 }, { reps: 8, kg: 45 }] })) }, { silent: true });
      if (i % 3 === 0) OS.add('runs', { date: d, type: 'Rodagem', km: 5, time: 1800 }, { silent: true });
      OS.add('sessions', { date: d, minutes: 60 + i % 60 }, { silent: true });
      for (let k = 0; k < 3; k++) OS.add('meals', { date: d, meal: ['Almoço', 'Jantar', 'Lanche'][k], food: 'Comida ' + (i % 20), qty: 1, kcal: 600, p: 40, c: 60, f: 20 }, { silent: true }); }
    OS.request(); return OS.all('transactions').length + OS.all('meals').length + OS.all('workouts').length + OS.all('sessions').length; });
  ok('dados de teste criados', n > 7000, n + ' registos');
  const routes = ['visao', 'hoje', 'painel', 'financas', 'financas.transacoes', 'treino', 'treino.mapa', 'dieta', 'dieta.semana', 'universidade', 'dominus', 'dominus.desafios', 'dominus.colmeia', 'evolucao', 'control', 'gasto'];
  const slow = []; let max = 0;
  for (const r of routes) { const t = await E(p, async r => { const t0 = performance.now(); location.hash = r; await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); return performance.now() - t0; }, r); max = Math.max(max, t); if (t > 2500) slow.push(r + ' ' + Math.round(t) + 'ms'); await E(p, () => document.querySelectorAll('.ceremony').forEach(e => e.remove())); }
  ok('com 3 anos de dados nenhuma página bloqueia (> 2,5 s)', !slow.length, slow.join(', ') || 'máx ' + Math.round(max) + ' ms');
  const save = await E(p, async () => { const t0 = performance.now(); OS.pushAll(); return performance.now() - t0; }); ok('guardar tudo é rápido', save < 3000, Math.round(save) + ' ms');
  ok('sem erros de JavaScript', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close();
}

/* ---------- extras: importador da B3, ficheiros na nuvem (Parte 5), metas com categoria própria ---------- */
async function extrasTests(b) { cur = 'Extras'; console.log('\n=== Importador B3, ficheiros na nuvem e metas ===');
  const X = require(path.join(__dirname, '..', 'vendor', 'xlsx.full.min.js')), TMP = require('os').tmpdir() + '/oc-extras-' + Date.now(); fs.mkdirSync(TMP, { recursive: true });
  const wx = (rows, name, file) => { const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(rows), name); fs.writeFileSync(TMP + '/' + file, X.write(wb, { type: 'buffer', bookType: 'xlsx' })); return TMP + '/' + file; };
  const F = [wx([['Data do Negócio', 'Tipo de Movimentação', 'Mercado', 'Prazo/Vencimento', 'Instituição', 'Código de Negociação', 'Quantidade', 'Preço', 'Valor'], ['10/03/2025', 'Compra', 'Mercado Fracionário', '-', 'BTG PACTUAL CTVM S.A.', 'PETR4F', 10, '37,50', '375,00'], ['12/05/2025', 'Compra', 'Mercado à Vista', '-', 'BTG PACTUAL CTVM S.A.', 'MXRF11', 100, 10.2, 1020], ['20/06/2025', 'Venda', 'Mercado Fracionário', '-', 'BTG PACTUAL CTVM S.A.', 'PETR4F', 4, 39, 156], ['02/07/2025', 'Compra', 'Mercado à Vista', '-', 'BTG PACTUAL CTVM S.A.', 'BOVA11', 5, 130, 650]], 'Negociacao', 'negociacao.xlsx'),
    wx([['Entrada/Saída', 'Data', 'Movimentação', 'Produto', 'Instituição', 'Quantidade', 'Preço unitário', 'Valor da Operação'], ['Credito', '12/03/2025', 'Transferência - Liquidação', 'PETR4 - PETROLEO BRASILEIRO S.A. PETROBRAS', 'BTG PACTUAL CTVM S.A.', 10, 37.5, 375], ['Credito', '15/06/2025', 'Rendimento', 'MXRF11 - MAXI RENDA FUNDO DE INVESTIMENTO IMOBILIARIO - FII', 'BTG PACTUAL CTVM S.A.', 100, 0.1, 10], ['Credito', '20/08/2025', 'Dividendo', 'PETR4 - PETROLEO BRASILEIRO S.A. PETROBRAS', 'BTG PACTUAL CTVM S.A.', 6, 0.5, 3], ['Credito', '20/08/2025', 'Juros Sobre Capital Próprio', 'PETR4 - PETROLEO BRASILEIRO S.A. PETROBRAS', 'BTG PACTUAL CTVM S.A.', 6, 0.2, '1,02'], ['Credito', '01/09/2025', 'Desdobro', 'PETR4 - PETROLEO BRASILEIRO S.A. PETROBRAS', 'BTG PACTUAL CTVM S.A.', 6, '-', '-'], ['Credito', '03/09/2025', 'Atualização', 'PETR4 - PETROLEO BRASILEIRO S.A. PETROBRAS', 'BTG PACTUAL CTVM S.A.', 6, '-', '-'], ['Debito', '10/09/2025', 'Resgate', 'Tesouro Selic 2029', 'BTG PACTUAL CTVM S.A.', 0.5, '15000', '7500']], 'Movimentacao', 'movimentacao.xlsx'),
    wx([['Produto', 'Instituição', 'Conta', 'Código de Negociação', 'CNPJ da Empresa', 'Código ISIN / Distribuição', 'Tipo', 'Escriturador', 'Quantidade', 'Quantidade Disponível', 'Quantidade Indisponível', 'Motivo', 'Preço de Fechamento', 'Valor Atualizado'], ['PETR4 - PETROLEO BRASILEIRO S.A. PETROBRAS', 'BTG PACTUAL CTVM S.A.', '123', 'PETR4', '', '', 'PN', '', 12, 12, 0, '-', 38, 456], ['MXRF11 - MAXI RENDA', 'BTG PACTUAL CTVM S.A.', '123', 'MXRF11', '', '', 'Cotas', '', 100, 100, 0, '-', 10, 1000]], 'Acoes', 'posicao.xlsx')];
  const { ctx, p, errs } = await newPage(b, PROFILES[0]); const drive = {}; let nid = 0, five = false;
  await ctx.route(/script\.google\.com/, rt => { const u = new URL(rt.request().url()), P = Object.assign(Object.fromEntries(u.searchParams), Object.fromEntries(new URLSearchParams(rt.request().postData() || ''))), J = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (P.op === 'ping') return J({ ok: true, v: 11 }); if (P.op === 'olinfo') return J({ ok: true, v: 12, redirect: '', cfg: false, linked: false });
    if (!five && /^f/.test(P.op || '')) return J({ ok: false, msg: 'Valor inválido' });
    if (P.op === 'fping') return J({ ok: true, v: 5, pasta: 'https://drive.google.com/drive/folders/RAIZ' });
    if (P.op === 'fup') { drive.ch = drive.ch || {}; (drive.ch[P.up] = drive.ch[P.up] || [])[+P.i] = P.d; if (+P.i < +P.n - 1) return J({ ok: true, i: +P.i }); const id = 'F' + (++nid); drive[id] = { b64: drive.ch[P.up].join(''), pasta: P.pasta, mime: P.mime, nome: P.nome, n: +P.n }; return J({ ok: true, id, url: 'https://drive.google.com/file/d/' + id + '/view', size: Buffer.from(drive[id].b64, 'base64').length }); }
    if (P.op === 'fdl') { const f = drive[P.id]; return J({ ok: true, n: 1, d: f.b64, mime: f.mime, nome: f.nome }); }
    if (P.op === 'frm') { delete drive[P.id]; return J({ ok: true }); }
    if (P.op === 'fls') return J({ ok: true, f: [{ id: 'FX', n: 'Exame 2024.pdf', s: 1234, m: 'application/pdf', u: 'https://drive.google.com/file/d/FX/view', p: 'Universidade/Contabilidade ZZ', t: Date.now() }] });
    return J({ ok: true, items: [], docs: {} }); });
  await p.goto(BASE); await unlock(p);
  await E(p, () => { window.open = u => { window.__opened = u || 'blank'; return null; }; OS.Jarvis && OS.Jarvis.close(); OS.setOne('inbox', { url: 'https://script.google.com/macros/s/AKfyX/exec', key: 'k', ver: 11 }); });
  const view = () => E(p, () => document.getElementById('view').innerText), go = async (h, ms = 600) => { await E(p, h => location.hash = h, h); await sleep(ms); return view(); };
  // ---- B3 ----
  let v = await go('investimentos.movimentos'); ok('B3: botão "Importar da B3" nos Movimentos', /Importar da B3/.test(v));
  await p.click('#view [data-act="b3Open"]'); await sleep(300); ok('B3: painel com os passos da Área do Investidor', /Extratos → Negociação/.test(await view()) && /Extratos → Movimentação/.test(await view()));
  let [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act="b3Pick"]')]); await fc.setFiles(F); await p.waitForFunction(() => OS.B3.state() && OS.B3.state().rows, null, { timeout: 10000 }).catch(() => { }); await sleep(300);
  const st = await E(p, () => { const s = OS.B3.state(); return { n: (s.fresh || []).length, liq: !!(s.skip || {})['liquidação (já vem na Negociação)'], upd: !!(s.skip || {})['Atualização'], err: s.err }; });
  ok('B3: lê Negociação + Movimentação + Posição (9 movimentos; liquidação e atualização ficam de fora)', st.n === 9 && st.liq && st.upd && !st.err, JSON.stringify(st));
  ok('B3: conferência com a posição aparece', /Conferência com a posição da B3/.test(await view()));
  await p.click('[data-act="b3Go"]'); await sleep(700);
  const r = await E(p, () => { const A = OS.all('assets'), P = t => A.find(a => a.ticker === t), pe = P('PETR4'); return { pe: pe && [pe.sym, pe.cls, pe.currency, pe.broker, OS.Inv.pos(pe).qty].join('|'), mx: (P('MXRF11') || {}).cls, bo: (P('BOVA11') || {}).cls, td: A.filter(a => a.cls === 'Tesouro Direto').map(a => a.td).join(), jcp: OS.all('invtx').filter(t => t.type === 'JCP').map(t => t.amount + '/' + t.tax).join(), sp: OS.all('invtx').filter(t => t.type === 'Desdobramento/Grupamento').map(t => t.ratio).join(), rend: OS.all('invtx').filter(t => t.type === 'Rendimento').length }; });
  ok('B3: PETR4 criado como Ação, PETR4.SA, BRL, corretora BTG Pactual', r.pe && r.pe.startsWith('PETR4.SA|Ação|BRL|BTG Pactual'), r.pe);
  ok('B3: desdobro calculado (10 − 4 = 6 → 12 ações)', r.pe && r.pe.endsWith('|12') && r.sp === '2', r.pe + ' fator ' + r.sp);
  ok('B3: MXRF11 é FII, BOVA11 é ETF, Tesouro Selic 2029 no Tesouro Direto', r.mx === 'FII' && r.bo === 'ETF' && /Tesouro Selic 2029/.test(r.td), JSON.stringify(r));
  ok('B3: JCP guardado bruto com os 15% retidos (1,02 líquido → 1,20 bruto)', r.jcp === '1.2/0.18' && r.rend === 1, r.jcp);
  await p.click('#view [data-act="b3Open"]'); await sleep(200); [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act="b3Pick"]')]); await fc.setFiles(F); await sleep(1500);
  const st2 = await E(p, () => ({ f: OS.B3.state().fresh.length, d: OS.B3.state().dup })); v = await view();
  ok('B3: importar outra vez não duplica nada e a conferência bate', st2.f === 0 && st2.d === 9 && /2 de 2 batem/.test(v), JSON.stringify(st2));
  await E(p, () => OS.act.b3Open());
  // ---- ficheiros na nuvem ----
  await E(p, () => { OS.add('subjects', { name: 'Contabilidade ZZ', status: 'Em curso' }); OS.add('learn', { title: 'Curso de Excel ZZ', kind: 'Curso', status: 'Em curso', unit: 'aulas' }); });
  v = await go('universidade.materiais', 700); const sid = await E(p, () => OS.all('subjects').find(s => s.name === 'Contabilidade ZZ').id);
  ok('Ficheiros: Universidade → Materiais tem "Guardar ficheiros" em cada disciplina', /Guardar ficheiros/.test(v) && !!(await p.$(`[data-act="fPick"][data-ref="${sid}"]`)));
  await p.click(`[data-act="fPick"][data-ref="${sid}"]`); await sleep(500);
  ok('Ficheiros: sem a Parte 5, explica como a colar (com botão para copiar)', await E(p, () => /Parte 5/.test((document.querySelector('#modal') || document.body).innerText) && !!document.querySelector('#modal [data-act=ibCopy]')));
  five = true; await p.click('#modal [data-act="fVer"]'); await sleep(600); ok('Ficheiros: "Verificar" deteta a Parte 5', await E(p, () => OS.Files.has5()));
  await E(p, () => OS.UI.closeModal && OS.UI.closeModal());
  const pdf = TMP + '/Resumo cap 3.pdf'; fs.writeFileSync(pdf, Buffer.alloc(7 * 1048576, 66));
  [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click(`[data-act="fPick"][data-ref="${sid}"]`)]); await fc.setFiles([pdf]);
  await p.waitForFunction(() => OS.all('files').length > 0, null, { timeout: 20000 }).catch(() => { }); await sleep(500);
  const f1 = await E(p, () => OS.all('files').map(f => [f.name, f.kind, f.area, f.size, f.fid].join('|')));
  ok('Ficheiros: PDF de 7 MB enviado em 4 partes para Universidade/Contabilidade ZZ no Drive', f1.length === 1 && f1[0] === `Resumo cap 3|PDF|uni|${7 * 1048576}|F1` && drive.F1 && drive.F1.n === 4 && drive.F1.pasta === 'Universidade/Contabilidade ZZ', f1.join() + ' ' + JSON.stringify(drive.F1 && { n: drive.F1.n, pasta: drive.F1.pasta }));
  v = await go('universidade.materiais', 600); ok('Ficheiros: aparece na disciplina com Abrir / descarregar / apagar', /Resumo cap 3/.test(v) && /no Drive/.test(v) && !!(await p.$('[data-act=fOpen]')) && !!(await p.$('[data-act=fDown]')) && !!(await p.$('[data-act=fDel]')));
  await p.click('#view .f-act [data-act=fOpen]'); await sleep(200); ok('Ficheiros: "Abrir" abre o ficheiro no Google Drive', await E(p, () => /drive\.google\.com\/file\/d\/F1/.test(window.__opened || '')));
  v = await go('cursos', 600); ok('Ficheiros: cada curso tem "Guardar PDFs / ficheiros"', /Guardar PDFs \/ ficheiros/.test(v));
  await go('universidade.materiais', 500); await p.click('[data-act=fSync]'); await sleep(700); ok('Ficheiros: "Atualizar lista" recupera do Drive o que foi guardado noutro aparelho (na disciplina certa)', await E(p, () => OS.all('files').some(f => f.fid === 'FX' && f.area === 'uni' && OS.get('subjects', f.ref) && OS.get('subjects', f.ref).name === 'Contabilidade ZZ')));
  await E(p, () => { OS.UI.ask = (t, d, l, fn) => fn(); }); const fid = await E(p, () => OS.all('files').find(f => f.fid === 'F1').id); await p.click(`[data-act="fDel"][data-id="${fid}"]`); await sleep(500);
  ok('Ficheiros: apagar tira da lista e manda para o lixo do Drive', await E(p, () => !OS.all('files').some(f => f.fid === 'F1')) && !drive.F1);
  v = await go('definicoes.script', 700); ok('Definições → Script Google lista a Parte 5 (ficheiros na nuvem)', /Parte 5 · ficheiro Parte5/.test(v));
  const code5 = await E(p, () => OS.Inbox.parts('k')[4]); let syn = ''; try { new Function(code5); } catch (e) { syn = e.message; }
  ok('Parte 5: código válido com op_fup, op_fdl, op_frm, op_fls', !syn && /function op_fup/.test(code5) && /function op_fdl/.test(code5) && /function op_frm/.test(code5) && /function op_fls/.test(code5), syn);
  // ---- metas com categoria fora da lista ----
  await E(p, () => OS.add('goals', { title: 'Meta Pessoal ZZ', cat: 'Pessoal', horizon: '1 ano', metric: 'manual', target: 5, status: 'Ativa', start: OS.U.today() }));
  v = await go('metas', 600); ok('Metas: meta com categoria própria ("Pessoal") aparece', /Meta Pessoal ZZ/.test(v));
  const er = errs.filter(e => !/Failed to load|net::|sandboxed|about:srcdoc|Content Security Policy/.test(e)); ok('sem erros de JavaScript (extras)', !er.length, er.slice(0, 3).join(' | ')); await ctx.close(); }

/* ---------- extras 2: investimentos completos (imóveis, renda passiva, visão, carteira), relatórios de IRS e análise de empresas ---------- */
async function extras2Tests(b) { cur = 'Extras'; console.log('\n=== Investimentos completos, Relatórios (IRS) e empresas ===');
  const { ctx, p, errs } = await newPage(b, PROFILES[0]); const aiP = [];
  const T0 = Math.floor(Date.now() / 1000), mh = () => { const t = [], c = []; for (let i = 180; i >= 0; i--) { t.push(T0 - i * 30 * 86400); c.push(Math.round(20 * Math.pow(1.012, 180 - i) * 100) / 100); } const div = []; for (let y = 0; y < 8; y++) div.push([T0 - (y * 365 + 100) * 86400, 1 + (7 - y) * .1]); return { cur: 'USD', t, c, div, spl: [] }; };
  await ctx.route(/script\.google\.com/, rt => { const u = new URL(rt.request().url()), op = u.searchParams.get('op'), J = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (op === 'ping') return J({ ok: true, v: 11 }); if (op === 'h') return J({ ok: true, h: mh() }); if (op === 'q') return J({ ok: true, q: {} });
    if (op === 'f') return J({ ok: true, f: { sum: { assetProfile: { longBusinessSummary: 'Makes things.', sector: 'Technology', industry: 'Consumer Electronics', country: 'United States' }, price: { longName: 'Maçã Inc', currency: 'USD', regularMarketPrice: { raw: 200 }, marketCap: { raw: 3e12 } }, summaryDetail: {}, financialData: {}, defaultKeyStatistics: {} },
      ts: Object.assign({ quarterlyTotalRevenue: [['2025-03-31', 9e10, 'USD'], ['2025-06-30', 9.4e10, 'USD'], ['2025-09-30', 1.02e11, 'USD'], ['2025-12-31', 1.24e11, 'USD']], quarterlyNetIncome: [['2025-03-31', 2.4e10, 'USD'], ['2025-06-30', 2.3e10, 'USD'], ['2025-09-30', 2.7e10, 'USD'], ['2025-12-31', 3.6e10, 'USD']] },
        { annualTotalRevenue: Array.from({ length: 10 }, (_, i) => [(2015 + i) + '-09-30', (2 + i * .2) * 1e11, 'USD']), annualNetIncome: Array.from({ length: 10 }, (_, i) => [(2015 + i) + '-09-30', (5 + i) * 1e10, 'USD']) }) } });
    return J({ ok: true, items: [], docs: {} }); });
  await ctx.route(/generativelanguage/, rt => { const u = rt.request().url(), b2 = rt.request().postData() || ''; if (/\/models\?/.test(u)) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }] }) }); aiP.push(b2);
    const R = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '```json\n' + JSON.stringify(o) + '\n```' }] }, groundingMetadata: { groundingChunks: [{ web: { title: 'Fonte oficial', uri: 'https://example.com/fonte' } }] } }] }) });
    if (/HISTÓRIA COMPLETA/.test(b2)) return R({ fundacao: '1976, Cupertino, EUA', fundadores: ['Steve Teste — cofundador'], origem: 'Começou numa garagem.\n\nCresceu com computadores pessoais.', marcos: [{ ano: '1976', t: 'Fundação na garagem', d: 'Primeiro computador.' }, { ano: '2007', t: 'Lança o telefone', d: 'Muda tudo.' }], aquisicoes: [{ ano: '2014', nome: 'Batidas', valor: '3 mM', porque: 'música' }], crises: [{ ano: '1997', t: 'Quase falência', d: 'O fundador volta.' }], lideres: [{ nome: 'Tim Teste', cargo: 'CEO', de: '2011', ate: 'hoje' }], ipo: '1980, NASDAQ', hoje: 'Uma das maiores do mundo.', curiosidades: ['O logótipo era outro.'] });
    if (/Analisa a EVOLUÇÃO/.test(b2)) return R({ resumo: 'Estás a evoluir nos estudos e a correr menos.', nota: 7, por_area: [{ area: 'Estudos', nota: 8, comentario: 'Mais horas que no mês passado.' }, { area: 'Desporto e corpo', nota: 5, comentario: 'Menos km.' }], a_melhorar: ['Estudo diário'], a_piorar: ['Corrida'], foco: ['Correr 3 vezes por semana', 'Manter 2 h de estudo', 'Poupar 10%'], alerta: '' });
    if (/escreveu isto sobre uma decisão/.test(b2)) return R({ titulo: 'Trabalho ao fim de semana', contexto: 'Ganhar mais dinheiro contra ter menos tempo para estudar.', prazo: '', alternativas: [{ nome: 'Aceitar', notas: 'mais 400 € por mês' }, { nome: 'Não aceitar', notas: 'mais tempo para estudar' }] });
    if (/Analisa o que ele ESCREVEU/.test(b2)) return R({ resumo: 'Dinheiro contra notas.', sobre_o_que_escreveste: 'Não disseste quantas horas por semana.', alternativas: [{ nome: 'Aceitar', fortes: [{ t: 'Mais 400 € por mês', peso: 5 }, { t: 'Experiência', peso: 2 }], fracos: [{ t: 'Menos estudo', peso: 4 }], oportunidades: ['Contactos'], ameacas: ['Exames em janeiro'], encaixe: 'Ajuda a meta da reserva.' }, { nome: 'Não aceitar', fortes: [{ t: 'Notas', peso: 4 }], fracos: [{ t: 'Sem dinheiro extra', peso: 3 }] }], pesa_mais: [{ fator: 'As notas deste semestre', porque: 'A tua meta é média 15.', peso: 5 }, { fator: 'Reserva de emergência', porque: 'Tens 1 mês.', peso: 4 }], pesos: { cost: 2, benefit: 4, risk: 3, time: 5, fin: 4, goals: 5, routine: 3 }, pesos_porque: 'O tempo e as metas pesam mais.', riscos: ['Cansaço'], perguntas: ['Quantas horas?'], nova: 'Trabalhar só nas férias', inclinacao: { nome: 'Não aceitar', porque: 'As notas pesam mais agora.', confianca: 'média' }, emocao: '', passo: 'Perguntar o horário exato.' });
    if (/DOSSIÊ COMPLETO/.test(b2)) return R({ resumo: 'Vende telefones e serviços.', modelo: 'Hardware com margens altas e serviços recorrentes.', segmentos: [{ nome: 'Telefones', pct: 52, d: '' }, { nome: 'Serviços', pct: 24 }], geografia: [{ regiao: 'Américas', pct: 43 }], produtos: ['Telefone'], concorrentes: [{ nome: 'Rival SA', ticker: 'RIV', nota: 'Mais barata' }], fosso: ['Ecossistema'], riscos: ['China'], catalisadores: ['IA no telefone'], cenarios: { pessimista: 'Vendas caem', base: 'Cresce 5%', otimista: 'Serviços disparam' }, tese: 'Qualidade a preço alto.', perguntas: ['O crescimento dos serviços continua?'], data: 'out 2026' });
    return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }) }); });
  await p.goto(BASE); await unlock(p);
  await E(p, () => { OS.Jarvis && OS.Jarvis.close(); OS.setOne('inbox', { url: 'https://script.google.com/macros/s/AKfyX/exec', key: 'k', ver: 11 }); OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); localStorage.removeItem('os2aiQuota'); });
  const view = () => E(p, () => document.getElementById('view').innerText), go = async (h, ms = 700) => { await E(p, h => location.hash = h, h); await sleep(ms); return view(); };
  // ---- dados: carteira, imóvel arrendado com crédito, rendas e despesas ligadas, salário com bruto ----
  const ids = await E(p, () => { const U = OS.U, T = U.today(), d = k => U.addDays(T, -k), Y = String(+T.slice(0, 4) - 1);
    const acc = OS.add('accounts', { name: 'Conta', inst: 'Santander', type: 'Conta à ordem', currency: 'EUR', opening: 1000, openDate: Y + '-01-01' }); OS.add('accounts', { name: 'Conta', inst: 'Revolut', type: 'Conta à ordem', currency: 'EUR', opening: 0, openDate: Y + '-01-01' });
    OS.one('profile').fx = { USD: 0.9, BRL: 0.17 }; OS.touch('profile');
    const ap = OS.add('assets', { name: 'Maçã Inc', ticker: 'MACA', sym: 'MACA', cls: 'Ação', currency: 'USD', price: 200, priceDate: T, broker: 'Trading 212', country: 'EUA', sector: 'Tecnologia' });
    const et = OS.add('assets', { name: 'ETF Mundo', ticker: 'MUND', cls: 'ETF', currency: 'EUR', price: 110, priceDate: T, broker: 'XTB', country: 'Irlanda' });
    OS.add('invtx', { asset: ap.id, type: 'Compra', date: Y + '-02-01', qty: 10, price: 150 }); OS.add('invtx', { asset: ap.id, type: 'Venda', date: Y + '-06-10', qty: 4, price: 190 }); OS.add('invtx', { asset: ap.id, type: 'Dividendo', date: Y + '-05-15', amount: 10, tax: 1.5 });
    OS.add('invtx', { asset: et.id, type: 'Compra', date: Y + '-03-01', qty: 20, price: 100 }); OS.add('invtx', { asset: et.id, type: 'Venda', date: Y + '-11-20', qty: 5, price: 105 });
    const h = OS.add('props', { name: 'T1 Teste', tipo: 'Para arrendar', uso: 'Arrendado', city: 'Aveiro', country: 'Portugal', share: 100, currency: 'EUR', value: 200000, buyPrice: 150000, buyCosts: 10000, buyDate: '2020-01-01', loanBal: 100000, loanRate: 3, loanPay: 600, rent: 900, occ: 12, imi: 300, condo: 50, ins: 150, maint: 300 });
    for (let m = 1; m <= 12; m++) { const mm = U.pad(m); OS.add('transactions', { type: 'Receita', amount: 900, date: Y + '-' + mm + '-05', desc: 'Renda T1', account: acc.id, cat: 'Rendas', sub: 'Renda recebida', prop: h.id, tags: [] }); OS.add('transactions', { type: 'Receita', amount: 1000, gross: 1250, wht: 100, ss: 137.5, payer: 'Empresa Teste', date: Y + '-' + mm + '-25', desc: 'Salário', account: acc.id, cat: 'Salário', sub: 'Salário', tags: [] }); OS.add('transactions', { type: 'Despesa', amount: 300, date: Y + '-' + mm + '-10', desc: 'Renda casa', account: acc.id, cat: 'Casa', sub: 'Renda', tags: [] }); OS.add('transactions', { type: 'Despesa', amount: 50, date: Y + '-' + mm + '-12', desc: 'Farmácia', account: acc.id, cat: 'Saúde', sub: 'Farmácia', tags: [] }); }
    OS.add('transactions', { type: 'Despesa', amount: 300, date: Y + '-05-20', desc: 'IMI', account: acc.id, cat: 'Casa', sub: 'IMI', prop: h.id, tags: [] });
    for (let i = 0; i < 6; i++) OS.add('transactions', { type: 'Receita', amount: 900, date: d(i * 30 + 2), desc: 'Renda T1', account: acc.id, cat: 'Rendas', sub: 'Renda recebida', prop: h.id, tags: [] });
    return { h: h.id, Y }; });
  // ---- Investimentos: visão de tudo, carteira dividida, imóveis e renda passiva ----
  let v = await go('investimentos', 900);
  ok('Investimentos → Visão: "Tudo o que tens investido" junta mercado e imóveis', /Tudo o que tens investido/.test(v) && /imóveis/.test(v) && /Todos os números/.test(v) && /Yield on cost/.test(v) && /Diversificação efetiva/.test(v));
  ok('Investimentos → Visão: gráficos por classe, setor, país e moeda', ['Por classe', 'Por setor', 'Por país', 'Por moeda'].every(x => v.includes(x)));
  ok('Investimentos: separadores Imóveis e Renda passiva', await E(p, () => [...document.querySelectorAll('#view .tabs a')].map(a => a.textContent).join('|').includes('Carteira|Imóveis|Renda passiva')));
  await E(p, () => OS.setUI('invGrp', 'sector')); v = await go('investimentos.carteira', 700);
  ok('Carteira: divisão por setor com % e imóveis incluídos', /Divisão da carteira por setor/.test(v) && /Tecnologia/.test(v) && /Imóveis/.test(v) && /%/.test(v) && !!(await p.$('#view .inv-dt')));
  await E(p, () => OS.setUI('invGrp', 'country')); v = await go('investimentos.carteira', 500); ok('Carteira: divisão por país (EUA, Irlanda, Portugal)', /Divisão da carteira por país/.test(v) && /EUA/.test(v) && /Irlanda/.test(v) && /Portugal/.test(v));
  v = await go('investimentos.imoveis', 700);
  const pr = await E(p, id => { const x = OS.InvX.prop(OS.get('props', id)); return { eq: x.eq, noi: Math.round(x.noi), cf: Math.round(x.cf), gy: +x.gy.toFixed(4), realIn: x.realIn }; }, ids.h);
  ok('Imóveis: capital próprio, rendimento líquido, cash flow e rentabilidade', pr.eq === 100000 && pr.noi === 10800 - (300 + 600 + 150 + 300) && pr.cf === 9450 - 7200 && pr.gy === .054 && /Capital próprio/.test(v) && /Rentabilidade líquida/.test(v), JSON.stringify(pr));
  ok('Imóveis: o real das Finanças (rendas ligadas ao imóvel) aparece', pr.realIn >= 5400 && /Real 12 meses/.test(v));
  ok('Património líquido inclui o imóvel (valor − crédito)', await E(p, () => { const R = OS.InvX.realEstate(); return Math.abs(OS.Fin.netWorth() - (OS.Fin.cashTotal() + OS.Inv.value() - OS.Fin.debtsTotal() + R.val - R.loanOut)) < 1 && R.val - R.loanOut === 100000; }));
  v = await go('investimentos.renda', 700); ok('Renda passiva: por mês, despesas cobertas, liberdade financeira e fontes', /Renda passiva por mês/.test(v) && /Despesas cobertas/.test(v) && /Liberdade financeira/.test(v) && /Rendas de imóveis/.test(v));
  // ---- Relatórios ----
  v = await go('relatorios', 800); ok('Dinheiro → Relatórios: mensal, trimestral e anual com prazos', /Mensal · resumido/i.test(v) && /Trimestral · completo/i.test(v) && /Anual · declaração de IRS/i.test(v) && /Próximos prazos/.test(v));
  await E(p, () => OS.setOne('tax', { born: 2004, firstWork: 2012, res: 'PT' })); await E(p, Y => { OS.setUI('rpPer', 'a'); OS.setUI('rpRef_a', Y); }, ids.Y);
  v = await go('relatorios.completo', 1200);
  ok('Relatório anual: anexos A, F, G, H, J e simulação do imposto', ['Anexo A', 'Anexo F', 'Anexo G', 'Anexo J', 'Anexo H', 'Simulação do imposto', 'Quadro 9.2A', 'Quadro 8A', 'Quadro 11'].every(x => v.includes(x)), ['Anexo A', 'Anexo F', 'Anexo G', 'Anexo J', 'Anexo H', 'Simulação do imposto'].filter(x => !v.includes(x)).join());
  const X = await E(p, Y => { const r = OS.Reports.irs(Y); return { aG: r.aG, aW: r.aW, fG: r.fG, fD: r.fD, j: r.jSales.map(s => r.code(s) + ':' + s.a.country + ':' + Math.round(s.gainE)), e: r.eForeign.length, acc: r.accF.map(a => a.cty).join(), hab: Math.round(r.D2.habitacao), sau: Math.round(r.D2.saude), rc: Math.round(r.rc), jp: r.jp }; }, ids.Y);
  ok('IRS: salário bruto, retenções e rendas (anexo F) somados', X.aG === 15000 && X.aW === 1200 && X.fG === 10800 && X.fD === 300, JSON.stringify(X));
  ok('IRS: vendas no anexo J com código (G01 ações, G20 ETF) e país', X.j.includes('G01:EUA:144') && X.j.some(x => /^G20:Irlanda:/.test(x)), X.j.join(' '));
  ok('IRS: deduções (rendas 15% até ao limite, saúde 15%) e contas no estrangeiro (Revolut → Lituânia)', X.hab === Math.min(Math.round(.15 * 3600), 700) && X.sau === 90 && /Lituânia/.test(X.acc), JSON.stringify(X));
  ok('IRS: rendimento coletável com dedução específica (sem IRS Jovem fora do prazo)', X.jp === 0 && X.rc === Math.round(15000 - Math.max(8.54 * 522.5, 1650)), JSON.stringify(X));
  await E(p, () => { window.__dl = []; const oc = URL.createObjectURL; URL.createObjectURL = bl => { window.__dl.push(bl.type); return oc(bl); }; }); await p.click('#view [data-act=rpCsv][data-id=rpJ92]'); await sleep(200);
  ok('IRS Jovem: 6.º ano de rendimentos = 50% isento (até 55 × IAS)', await E(p, Y => { OS.setOne('tax', { born: 2004, firstWork: +Y - 5 }); const r = OS.Reports.irs(Y); OS.setOne('tax', { firstWork: 2012 }); return r.jp === .5 && Math.round(r.jEx) === 7500; }, ids.Y));
  ok('Relatório: tabelas para descarregar em CSV (para o contabilista)', await E(p, () => window.__dl.includes('text/csv')));
  await p.click('#view [data-act=rpDown]'); await sleep(200); ok('Relatório: descarregar o relatório completo (para PDF)', await E(p, () => window.__dl.includes('text/html')));
  await E(p, () => { OS.setUI('rpPer', 'm'); OS.setUI('rpRef_m', OS.U.addMonths(OS.U.today().slice(0, 7), -1)); }); v = await go('relatorios.completo', 800);
  ok('Relatório mensal enxuto: resumo, receitas e despesas, investimentos e impostos do mês', /Resumo/.test(v) && /Receitas e despesas/.test(v) && /Impostos deste período/.test(v) && !/Anexo J/.test(v));
  const ag = await E(p, () => { OS.all('reports').slice().forEach(r => OS.del('reports', r.id)); const k = OS.Reports.autogen(); return { k, per: OS.all('reports').map(r => r.per).sort().join(',') }; });
  ok('Relatórios gerados sozinhos quando o mês, o trimestre e o ano fecham (Arquivo)', ag.k === 3 && ag.per === 'a,m,q', JSON.stringify(ag));
  v = await go('relatorios.arquivo', 600); ok('Arquivo lista os relatórios novos', /novo/.test(v) && /Mensal/.test(v));
  v = await go('definicoes.impostos', 600); ok('Definições → Impostos: país dos relatórios, IRS Jovem, dependentes, englobamento', /País dos relatórios: Portugal/.test(v) && /Ano de nascimento/.test(v) && /primeiro rendimento de trabalho/.test(v) && /Englobar/.test(v));
  // ---- Relatórios adaptados ao país: os novos seguem o país da app, os que já passaram ficam como estavam ----
  const cy = await E(p, () => { const U = OS.U, T = U.today(), acc = OS.add('accounts', { name: 'Conta BR', inst: 'BTG', type: 'Conta à ordem', currency: 'BRL', opening: 0, openDate: T.slice(0, 4) + '-01-01' });
    OS.add('transactions', { type: 'Receita', amount: 4200, gross: 5000, wht: 300, ss: 500, payer: 'Empresa Brasil', date: T.slice(0, 4) + '-01-28', desc: 'Salário BR', account: acc.id, cat: 'Salário', sub: 'Salário', tags: [] });
    OS.setOne('profile', { country: 'BR' }); return { y: T.slice(0, 4), H: JSON.stringify(OS.one('tax').ctyH || []) }; });
  ok('País: a app guarda quando mudaste de país (Portugal → Brasil hoje)', /\["","PT"\]/.test(cy.H) && new RegExp('\\["' + (await E(p, () => OS.U.today())) + '","BR"\\]').test(cy.H), cy.H);
  await E(p, y => { OS.setUI('rpPer', 'a'); OS.setUI('rpRef_a', y); }, cy.y); v = await go('relatorios.completo', 1200);
  ok('Brasil: relatório anual no formato do IRPF (fichas, bens e direitos, completa x simplificada) em reais', /Declaração de Ajuste Anual/.test(v) && /Bens e direitos/.test(v) && /Rendimentos tributáveis/.test(v) && /Pagamentos efetuados/.test(v) && /simplificada/i.test(v) && /R\$ /.test(v) && !/Anexo J/.test(v) && !/\(€\)/.test(v) && /Custo \(R\$\)/.test(v), JSON.stringify([/Declaração de Ajuste Anual/.test(v), /Bens e direitos/.test(v), /Rendimentos tributáveis/.test(v), /Pagamentos efetuados/.test(v), /simplificada/i.test(v), /R\$ /.test(v), !/Anexo J/.test(v), v.split('Bens e direitos')[0].slice(Math.max(0, v.split('Bens e direitos')[0].indexOf('€ ') - 80), v.split('Bens e direitos')[0].indexOf('€ ') + 40)]));
  const BRx = await E(p, y => { OS.Reports.setCtx('BR'); const x = OS.Reports.irpf(y), u = 900 / OS.Inv.fx('BRL'), r = { pj: Math.round(x.pj.find(q => q.payer === 'Empresa Brasil').gross), irrf: x.irrf, inss: x.inss, pf: Math.round(x.pfG), k: x.pfG / u, carne: x.carne > 0, best: x.best }; OS.Reports.setCtx('PT'); return r; }, cy.y);
  ok('Brasil: salário da conta em reais fica em reais; rendas em euros passam a reais (carnê-leão)', BRx.pj === 5000 && BRx.irrf === 300 && BRx.inss === 500 && BRx.carne && BRx.pf > 0 && Math.abs(BRx.k - Math.round(BRx.k)) < .01, JSON.stringify(BRx));
  ok('Brasil: DARF e carnê-leão vencem no último dia útil do mês', await E(p, () => OS.Reports.lastBiz('2026-05') === '2026-05-29' && OS.Reports.lastBiz('2026-11') === '2026-11-30'));
  await E(p, () => { OS.setUI('rpPer', 'm'); OS.setUI('rpRef_m', OS.U.today().slice(0, 7)); }); v = await go('relatorios.completo', 900);
  ok('Brasil: relatório deste mês com carnê-leão, DARF da renda variável e IR retido', /Impostos deste período \(Brasil\)/.test(v) && /Carnê-leão/.test(v) && /DARF renda variável/.test(v));
  await E(p, y => { OS.setUI('rpPer', 'a'); OS.setUI('rpRef_a', y); }, ids.Y); v = await go('relatorios.completo', 1200);
  ok('Os relatórios que já passaram ficam como estavam (ano anterior continua no formato do IRS, em euros)', /Anexo J/.test(v) && /Simulação do imposto/.test(v) && /€ /.test(v) && !/Declaração de Ajuste Anual/.test(v));
  await E(p, () => { OS.setUI('rpPer', 'm'); OS.setUI('rpRef_m', OS.U.addMonths(OS.U.today().slice(0, 7), -1)); }); v = await go('relatorios.completo', 800);
  ok('O mês passado (já arquivado) continua no formato de Portugal', /Impostos deste período/.test(v) && !/Impostos deste período \(Brasil\)/.test(v) && /€ /.test(v), JSON.stringify([/Impostos deste período/.test(v), !/\(Brasil\)/.test(v), /€ /.test(v), (v.match(/.{50}Brasil.{30}/g) || []).slice(0, 4)]));
  v = await go('relatorios.arquivo', 600); ok('Arquivo: cada relatório mostra o país com que foi gerado', /Portugal/.test(v));
  v = await go('relatorios', 700); const hubOk = [/declaração de IRPF \(Brasil\)/.test(v), /Completo \(IRPF\)/.test(v), /Anual · declaração de IRPF/i.test(v), /IRPF \d{4}: a (pagar|restituir) ~R\$/.test(v), /Mensal · resumido[\s\S]{0,40}Entrou\s*€/i.test(v), /Carnê-leão e DARF/.test(v), !!(await p.$('#view [data-act=countryPick]'))];
  ok('Relatórios: o topo segue o Brasil ("Completo (IRPF)", prazos do Brasil); o mês já fechado continua em euros', hubOk.every(Boolean), JSON.stringify(hubOk) + v.slice(300, 900));
  const ag2 = await E(p, () => { OS.all('reports').slice().forEach(r => OS.del('reports', r.id)); OS.Reports.autogen(); return OS.all('reports').map(r => r.per + ':' + r.cty).sort().join(','); });
  ok('Períodos que fecharam antes da mudança de país são gerados no país de então (Portugal)', ag2 === 'a:PT,m:PT,q:PT', ag2);
  v = await go('definicoes.impostos', 600); ok('Definições → Impostos no Brasil: país, dependentes (sem campos do IRS português)', /País dos relatórios: Brasil/.test(v) && /Dependentes/.test(v) && /IRPF/.test(v) && !/IRS Jovem/.test(v) && !/Englobar/.test(v));
  await E(p, y => { OS.setOne('profile', { country: 'ES' }); OS.setUI('rpPer', 'a'); OS.setUI('rpRef_a', y); }, cy.y); v = await go('relatorios.completo', 1000);
  ok('Outro país: relatório completo de receitas, despesas e investimentos (sem formato fiscal português ou brasileiro)', /O formato da declaração fiscal existe para Portugal e para o Brasil/.test(v) && /Espanha/.test(v) && !/Anexo J/.test(v) && !/Declaração de Ajuste Anual/.test(v));
  await E(p, () => OS.setOne('profile', { country: 'PT' }));
  ok('Movimento de salário com bruto, retenção e Segurança Social', await E(p, () => ['gross', 'wht', 'ss', 'payer'].every(k => OS.S.transactions.fields.some(f => f.k === k)) && OS.S.transactions.fields.some(f => f.k === 'prop')));
  // ---- Análise de empresas: história, dossiê, longo prazo, 10 anos, trimestres ----
  await E(p, () => { OS.setUI('invCo', 'MACA'); location.hash = 'investimentos.empresas'; }); await sleep(1500); v = await view();
  ok('Empresa: preço de longo prazo, retornos e dividendos por ano', /Preço de longo prazo e dividendos/.test(v) && /10 anos/.test(v) && /Dividendos por ação, por ano/.test(v));
  ok('Empresa: últimos trimestres e escolha 5/10 anos nas demonstrações', /Últimos trimestres/.test(v) && !!(await p.$('[data-act=coYrs][data-v="10"]')));
  await p.click('[data-act=coYrs][data-v="10"]'); await sleep(700); ok('Empresa: 10 anos de demonstrações financeiras', await E(p, () => [...document.querySelectorAll('.co-t thead th')].length === 11));
  await p.click('#view [data-act=coHist]'); await p.waitForFunction(() => /Linha do tempo/.test(document.getElementById('view').innerText), null, { timeout: 8000 }).catch(() => { }); v = await view();
  ok('Empresa: a história completa (fundação, fundadores, linha do tempo, crises, líderes, fontes)', /Fundação/.test(v) && /Cupertino/.test(v) && /Linha do tempo/.test(v) && /Quase falência/.test(v) && /Tim Teste/.test(v) && /Fontes/.test(v) && aiP.some(x => /HISTÓRIA COMPLETA/.test(x) && /google_search/.test(x)));
  await p.click('#view [data-act=coDos]'); await p.waitForFunction(() => /Concorrentes/.test(document.getElementById('view').innerText), null, { timeout: 8000 }).catch(() => { }); v = await view();
  ok('Empresa: tudo sobre a empresa (modelo, segmentos, concorrentes, cenários, tese)', /Como ganha dinheiro/.test(v) && /Segmentos/.test(v) && /Rival SA/.test(v) && /Pessimista/.test(v) && /Tese de investimento/.test(v));
  ok('Empresa: história e dossiê ficam guardados (não gasta IA outra vez)', await E(p, () => !!(JSON.parse(localStorage.getItem('oc_cohist') || '{}').MACA) && !!(JSON.parse(localStorage.getItem('oc_codos') || '{}').MACA)));
  // ---- Entrevista profunda ----
  const iv2 = await E(p, () => ({ n: OS.Me.qList().length, parts: OS.Me.PARTS.length, names: OS.Me.PARTS.map(x => x.n).join('|'), keep: OS.Me.PARTS.find(x => x.k === 'raizes').q[0] }));
  ok('Entrevista: mais de 500 perguntas em 37 capítulos (mente e emoções, perdas, valores, identidade, sentidos, cartas…)', iv2.n >= 500 && iv2.parts >= 37 && ['Mente e emoções', 'Perdas e luto', 'Valores e crenças', 'Identidade e cultura', 'Os sentidos da memória', 'Cartas', 'A família que quero construir'].every(x => iv2.names.includes(x)) && /avós do lado da mãe/.test(iv2.keep), JSON.stringify({ n: iv2.n, parts: iv2.parts }));
  // ---- Minha Evolução (juntou o Longo prazo) ----
  await E(p, () => { location.hash = 'longterm'; }); await sleep(900); v = await view();
  ok('Minha Evolução: o antigo Longo prazo abre aqui (mesmo visual) e o menu tem só "Minha Evolução"', (await E(p, () => location.hash)) === '#evolucao' && /Minha Evolução/.test(v) && await E(p, () => { const t = document.getElementById('view').textContent; return /Patrimônio · projeção/.test(t) && /Grandes metas/.test(t) && /Life Analytics/.test(t); }) && await E(p, () => { const t = [...document.querySelectorAll('#side .nav-g a')].map(a => a.textContent).join('|'); return /Minha Evolução/.test(t) && !/Longo prazo/.test(t); }));
  ok('Minha Evolução: evolução por área (dinheiro, estudos, desporto, carreira, metas)', /Evolução por área/.test(v) && /Dinheiro/.test(v) && /Metas/.test(v));
  await p.click('#view [data-act=evoAI]'); await p.waitForFunction(() => /Foco para os próximos 30 dias/i.test(document.getElementById('view').innerText), null, { timeout: 8000 }).catch(() => { }); v = await view();
  ok('Minha Evolução: o Spyke analisa a evolução (nota, por área, foco para 30 dias)', /7\s*\/10/.test(v) && /Correr 3 vezes por semana/.test(v) && /Parado ou a piorar/i.test(v), v.slice(0, 200));
  // ---- Centro de decisões com o Spyke ----
  v = await go('decisoes', 600); ok('Decisões: "Pensar com o Spyke" no topo da página', /Pensar com o Spyke/.test(v) && !!(await p.$('#decThinkT')));
  await p.fill('#decThinkT', 'Estou a pensar aceitar um trabalho ao fim de semana para juntar dinheiro, mas tenho medo de baixar as notas'); await p.click('#view [data-form=decThink] button');
  await p.waitForFunction(() => /O que pesa mais/.test((document.querySelector('#drawer') || document.body).innerText), null, { timeout: 10000 }).catch(() => { });
  const dd = await E(p, () => { const d = OS.all('decisions').find(x => x.title === 'Trabalho ao fim de semana'); const t = (document.querySelector('#drawer') || document.body).innerText; return { ok: !!d, alts: d ? d.alts.map(a => a.name).join('|') : '', an: !!(d && d.ai && d.ai.r), t: /Pontos fortes/i.test(t) && /Pontos fracos/i.test(t) && /Sobre o que escreveste/.test(t) && /As notas deste semestre/.test(t) && /Os dados apontam para: Não aceitar/.test(t), id: d && d.id }; });
  ok('Decisões: o Spyke organiza o que escrevi (alternativas) e analisa: pontos fortes e fracos com peso, o que pesa mais, sobre o que escrevi', dd.ok && dd.alts === 'Aceitar|Não aceitar' && dd.an && dd.t, JSON.stringify(dd));
  await p.click('#drawer [data-act=decWts]').catch(() => { }); await sleep(400);
  ok('Decisões: "Usar estes pesos" aplica os pesos sugeridos à matriz', await E(p, id => { const w = (OS.get('decisions', id) || {}).weights || {}; return w.time === 5 && w.goals === 5 && w.cost === 2; }, dd.id));
  await E(p, () => OS.UI.closeDrawer && OS.UI.closeDrawer());
  const er = errs.filter(e => !/Failed to load|net::|sandboxed|about:srcdoc|Content Security Policy/.test(e)); ok('sem erros de JavaScript (extras 2)', !er.length, er.slice(0, 3).join(' | ')); await ctx.close(); }

/* ---------- Spyke: a voz Gemini não lê instruções e o resumo começa logo (1.º pedaço curto, os outros em paralelo) ---------- */
async function voiceTests(b) { cur = 'Voz'; console.log('\n=== Voz do Spyke (resumo do dia) ===');
  const { ctx, p, errs } = await newPage(b, PROFILES[0]); const tts = []; let t0 = 0;
  const pcm = Buffer.alloc(2400 * 2).toString('base64'); // 0,1 s de silêncio a 24 kHz
  await ctx.route(/generativelanguage/, async rt => { const u = rt.request().url(), b2 = rt.request().postData() || '';
    if (/\/models\?/.test(u)) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] }) });
    if (/tts/.test(u)) { const j = JSON.parse(b2); tts.push({ at: Date.now() - t0, text: j.contents[0].parts[0].text, lang: (j.generationConfig.speechConfig || {}).languageCode, voice: ((j.generationConfig.speechConfig || {}).voiceConfig || {}).prebuiltVoiceConfig }); await sleep(300); return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm } }] } }] }) }); }
    return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }) }); });
  await p.goto(BASE); await unlock(p);
  await E(p, () => { OS.Jarvis && OS.Jarvis.close(); OS.setOne('diet', { aiKey: 'AIzaTESTE_TESTE_TESTE_TESTE' }); localStorage.removeItem('os2ttsm'); localStorage.removeItem('os2ttsl'); localStorage.removeItem('os2ttsnl'); const c = OS.one('spyke'); c.eng = 'gemini'; OS.touch('spyke'); });
  const brief = await E(p, () => OS.Spyke.brief()); t0 = Date.now();
  await E(p, () => { OS.Spyke.say(OS.Spyke.brief()); }); await p.waitForFunction(() => !/speaking|thinking/.test(document.body.className + ' ' + ((OS.Spyke.state && OS.Spyke.state()) || '')), null, { timeout: 15000 }).catch(() => { }); await sleep(800);
  ok('Voz Gemini: o pedido leva só o texto do resumo (nenhuma instrução para ler em voz alta)', tts.length >= 1 && tts.every(x => !/Fala SEMPRE|Voz masculina|Lê exatamente|Sotaque/i.test(x.text)), JSON.stringify(tts.map(x => x.text.slice(0, 60))));
  ok('Voz Gemini: a língua vai na configuração da voz (pt-BR) e a voz é a mesma', tts.length && tts[0].lang === 'pt-BR' && !!(tts[0].voice && tts[0].voice.voiceName), JSON.stringify(tts[0] || {}));
  ok('Resumo: o 1.º pedaço é só a saudação (começa a falar em segundos) e o resto é pedido logo a seguir, em paralelo', tts.length >= 2 && tts[0].text.length <= 160 && /^(Bom dia|Boa tarde|Boa noite)/.test(tts[0].text) && tts[1].at - tts[0].at < 1500, JSON.stringify(tts.map(x => [x.at, x.text.length])));
  ok('Resumo: nada do texto se perde ao dividir em pedaços', tts.map(x => x.text).join(' ').replace(/\s+/g, ' ').trim() === brief.replace(/\s+/g, ' ').trim());
  const er = errs.filter(e => !/Failed to load|net::|sandboxed|about:srcdoc|Content Security Policy|NotSupportedError|play\(\)/.test(e)); ok('sem erros de JavaScript (voz)', !er.length, er.slice(0, 3).join(' | ')); await ctx.close(); }

/* ---------- a agenda do Oceanum fora da app (Google Calendar e iPhone): TUDO o que está no Calendário, pela Parte 6 ---------- */
async function calTests(b) { cur = 'Agenda'; console.log('\n=== Agenda fora da app (Google Calendar e iPhone) ===');
  const { ctx, p, errs } = await newPage(b, PROFILES[0]); const calls = [], ops = []; const G = {}; let nid = 0, P6 = false, P7 = false;
  await ctx.route(/script\.google\.com/, rt => { const u = new URL(rt.request().url()), P = Object.assign(Object.fromEntries(u.searchParams), Object.fromEntries(new URLSearchParams(rt.request().postData() || ''))), J = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) }); ops.push(P.op);
    if (P.op === 'ping') return J({ ok: true, v: 11 }); if (P.op === 'olinfo') return J({ ok: true, v: 12 }); if (P.op === 'fping') return J({ ok: true, v: 5, pasta: 'https://drive.google.com/x' });
    if (P.op === 'c6ping') return J(P6 ? { ok: true, v: 1, cal: 'Oceanum' } : { ok: false, msg: 'Valor inválido' });
    if (P.op === 'cal6' && P6) { const j = JSON.parse(P.j); calls.push(j); const map = {}; (j.del || []).forEach(e => { delete G[e]; }); (j.up || []).forEach(it => { const e = it.eid && G[it.eid] ? it.eid : 'E' + (++nid); G[e] = Object.assign({}, it, { cal: 'outros' }); map[it.id] = e; }); return J({ ok: true, v: 1, map, n: (j.up || []).length }); }
    if (P.op === 'cl') return J({ ok: true, ev: [{ id: 'x1', t: 'Jantar com a família', s: new Date().toISOString(), e: new Date(Date.now() + 36e5).toISOString(), all: false, cal: 'Pessoal' }, { id: 'x2', t: 'Trabalho · Loja', s: new Date().toISOString(), e: new Date(Date.now() + 36e5).toISOString(), all: false, cal: 'Oceanum' }] });
    if (P.op === 'c7ping') return J(P7 ? { ok: true, v: 1 } : { ok: false, msg: 'Valor inválido' });
    if (P.op === 'cal7' && P7) { const j = JSON.parse(P.j); calls.push(j); const map = {}; (j.del || []).forEach(d => { delete G[d.e]; }); (j.up || []).forEach(it => { if (it.x) delete G[it.x]; const e = it.eid && G[it.eid] ? it.eid : 'E' + (++nid); G[e] = Object.assign({}, it, { cal: it.c, cor: (j.cals[it.c] || [])[1] }); map[it.id] = e; }); return J({ ok: true, v: 1, map, n: (j.up || []).length }); }
    if (P.op === 'calsync' || P.op === 'cal6' || P.op === 'cal7') return J({ ok: false, msg: 'Valor inválido' });
    return J({ ok: true, items: [], docs: {} }); });
  await p.goto(BASE); await unlock(p);
  const T = await E(p, () => { OS.Jarvis && OS.Jarvis.close(); OS.setOne('inbox', { url: 'https://script.google.com/macros/s/AKfyX/exec', key: 'k', ver: 11 }); return OS.U.today(); });
  // a Parte 5 fica como está (só ficheiros) e a agenda vem numa Parte 6 nova
  const code = await E(p, () => { const v = t => { try { new Function(t); return true; } catch (e) { return false; } }, p5 = OS.Inbox.addon5(), p6 = OS.Inbox.addon6(); return { p5ok: v(p5), p6ok: v(p6), p5cal: /CalendarApp/.test(p5), p6: /function op_cal6/.test(p6) && /function op_c6ping/.test(p6) && /CalendarApp/.test(p6) && !/function op_calsync|function ocCal_|function op_fping/.test(p6), p5v: /v: 5, pasta/.test(p5), n: OS.Inbox.parts('x').length, p7ok: v(OS.Inbox.addon7()), p7: /function op_cal7/.test(OS.Inbox.addon7()) && /setColor/.test(OS.Inbox.addon7()), dup: (() => { const f = {}; OS.Inbox.parts('x').forEach((t, i) => (t.match(/^\s*function\s+([A-Za-z0-9_]+)/gm) || []).forEach(m => { const k = m.trim().split(/\s+/)[1]; (f[k] = f[k] || []).push(i + 1); })); return Object.entries(f).filter(([, a]) => a.length > 1 && a.some(i => i >= 5)).map(([k, a]) => k + ':' + a.join('/')); })() }; });
  ok('Script: a Parte 5 fica igual (só ficheiros), a agenda vem na Parte 6 e as cores na Parte 7 (ficheiros novos, sem repetir nenhuma função das outras partes)', code.p5ok && code.p6ok && code.p7ok && !code.p5cal && code.p6 && code.p7 && code.p5v && code.n === 7 && !code.dup.length, JSON.stringify(code));
  await E(p, () => location.hash = 'definicoes.script'); await sleep(1200);
  let v = await E(p, () => document.getElementById('view').innerText);
  ok('Definições → Script Google: com as partes 1 a 5 instaladas, pede só a Parte 7 (ficheiro novo, com as cores, sem mexer nas outras)', /Parte 7 · copiar e colar/.test(v) && /ficheiro novo/.test(v) && /Parte 7 · ficheiro Parte7/.test(v) && /cor pastel/.test(v) && await E(p, () => [...document.querySelectorAll('#parte4 [data-act=ibCopy]')].map(x => x.dataset.t).join() === 'p7'), v.slice(0, 400));
  const ids = await E(p, T => { const U = OS.U; const sh = OS.add('shifts', { date: T, start: '22:00', end: '06:00', place: 'Loja' }); const off = OS.add('dayoffs', { date: U.addDays(T, 1), kind: 'Folga' }); const ev = OS.add('events', { title: 'Dentista', date: U.addDays(T, 2), start: '10:00', end: '11:00', location: 'Aveiro' }); const s0 = OS.add('subjects', { name: 'Contabilidade', status: 'Em curso' }); OS.add('classes', { subject: s0.id, wday: String(U.parse(U.addDays(T, 1)).getDay()), start: '09:00', end: '11:00', room: 'Sala 2', kind: 'Teórica' }); const ex = OS.add('assessments', { title: 'Contabilidade', type: 'Teste', date: U.addDays(T, 3), subject: s0.id }); OS.add('tasks', { title: 'Entregar trabalho', sched: U.addDays(T, 2), status: 'Próxima' }); OS.add('routine', { title: 'Ginásio da manhã', start: '07:00', end: '08:00', days: [String(U.parse(U.addDays(T, 1)).getDay())] }); return { sh: sh.id, ev: ev.id }; }, T);
  v = await (async () => { await E(p, () => location.hash = 'definicoes.ligacoes'); await sleep(700); return E(p, () => document.getElementById('view').innerText); })();
  ok('Definições → Ligações: tudo o que está no Calendário (trabalho, folgas, aulas, tarefas, rotina…) marcado por omissão', /A tua agenda também fora da app/.test(v) && /Trabalho \(turnos\)/.test(v) && /Calendário do iPhone/.test(v) && await E(p, () => [...document.querySelectorAll('#cpSet .cp-types .chip')].every(c => c.classList.contains('on')) && document.querySelectorAll('#cpSet .cp-types .chip').length >= 12) && /Parte 7/.test(v));
  // colar a Parte 6 → a app reconhece e liga sozinha
  P6 = true; await E(p, () => OS.CalPush.check()); await p.waitForFunction(() => OS.one('calx').n > 0, null, { timeout: 9000 }).catch(() => { }); await sleep(300);
  ok('Parte 6 colada: a app reconhece-a e liga a agenda sozinha (sem carregar em nada)', await E(p, () => OS.CalPush.has6() && OS.one('calx').on === true && OS.one('calx').n > 0) && ops.includes('cal6') && !ops.includes('calsync'), JSON.stringify(ops.slice(-6)));
  const up = calls.flatMap(c => c.up || []), by = t => up.find(x => x.t === t);
  const sh = by('Trabalho · Loja'), off = by('Folga'), ev = by('Dentista'), ex = up.find(x => /Teste: Contabilidade/.test(x.t)), cl = up.find(x => /^Aula: Contabilidade/.test(x.t)), tk = by('Tarefa: Entregar trabalho'), ro = by('Ginásio da manhã');
  ok('Vai tudo para fora: trabalho, folgas, compromissos, aulas, provas, tarefas e rotina', !!sh && !!off && !!ev && !!ex && !!cl && !!tk && !!ro, JSON.stringify(up.map(x => x.t)));
  ok('Trabalho de noite (22:00–06:00) acaba no dia seguinte; aula com hora e sala; folga e prova sem hora ficam "dia inteiro"', sh && new Date(sh.e) - new Date(sh.s) === 8 * 36e5 && off.all === true && ex.all === true && ev && new Date(ev.e) - new Date(ev.s) === 36e5 && cl && new Date(cl.e) - new Date(cl.s) === 2 * 36e5 && /Sala 2/.test(cl.l), JSON.stringify({ sh, off, ex, cl }));
  const eidSh = await E(p, id => { const m = OS.one('calx').map; const k = Object.keys(m).find(x => x.startsWith('shifts:' + id)); return k && m[k].e; }, ids.sh), nG = Object.keys(G).length;
  calls.length = 0; await E(p, id => { OS.upd('shifts', id, { start: '21:00' }); }, ids.sh); await E(p, () => OS.CalPush.sync(true)); await sleep(200);
  const up2 = calls.flatMap(c => c.up || []);
  ok('Alterar o turno na app atualiza o MESMO evento lá fora (sem duplicar)', up2.length === 1 && up2[0].eid === eidSh && /T\d\d:00:00/.test(up2[0].s) && Object.keys(G).length === nG, JSON.stringify({ up2: up2.map(x => [x.t, x.eid]), total: Object.keys(G).length, nG }));
  calls.length = 0; await E(p, id => OS.del('events', id), ids.ev); await E(p, () => OS.CalPush.sync(true)); await sleep(200);
  ok('Apagar na app apaga lá fora', calls.some(c => (c.del || []).length === 1) && !Object.values(G).some(x => x.t === 'Dentista'), JSON.stringify(calls));
  calls.length = 0; await E(p, () => OS.CalPush.sync(true)); ok('Sem mudanças não envia nada (não gasta o script)', calls.length === 0);
  // importar a escala da semana (foto): os turnos aparecem no Trabalho, no Calendário da app e lá fora, logo a seguir
  calls.length = 0; const d1 = await E(p, T => OS.U.addDays(T, 4), T), d2 = await E(p, T => OS.U.addDays(T, 5), T);
  await E(p, ([d1, d2]) => { OS.WorkSched._res([{ date: d1, start: '09:00', end: '17:00', breakMin: 30, place: 'Loja' }, { date: d2, off: true, kind: 'Folga' }]); OS.act.wsApply(); }, [d1, d2]); await sleep(4000);
  const imp = calls.flatMap(c => c.up || []), inApp = await E(p, d1 => { const it = OS.Cal.items(d1, d1); return it.some(x => x.src === 'shift' && x.start === '09:00' && x.end === '17:00'); }, d1);
  await E(p, d1 => { OS.setUI('calView', 'semana'); OS.setUI('calDate', d1); location.hash = 'calendario'; }, d1); await sleep(700);
  ok('Escala importada: o trabalho (09:00–17:00) e a folga aparecem no Calendário da app e vão logo para o Google Calendar', inApp && await E(p, () => /Turno · Loja/.test(document.getElementById('view').innerText)) && imp.some(x => x.t === 'Trabalho · Loja' && x.s === new Date(d1 + 'T09:00:00').toISOString() && x.e === new Date(d1 + 'T17:00:00').toISOString()) && imp.some(x => x.t === 'Folga' && x.s === d2 && x.all), JSON.stringify(imp.map(x => [x.t, x.s])));
  calls.length = 0; await E(p, T => OS.add('dayoffs', { date: OS.U.addDays(T, 9), kind: 'Férias' }), T); await sleep(13500);
  ok('Uma folga nova vai sozinha para fora, poucos segundos depois de a registar', calls.some(c => (c.up || []).some(x => x.t === 'Férias' && x.all)), JSON.stringify(calls));
  calls.length = 0; await E(p, () => { OS.setOne('calx', { types: Object.assign({}, OS.one('calx').types, { routine: 0 }) }); }); await E(p, () => OS.CalPush.sync(true));
  ok('Desmarcar um tipo (Rotina) tira-o do calendário de fora', calls.some(c => (c.del || []).length >= 1) && !Object.values(G).some(x => x.t === 'Ginásio da manhã'), JSON.stringify(calls.map(c => (c.del || []).length)));
  // Parte 7: cada tipo no seu calendário, com cor pastel; o que já lá estava muda sozinho, sem duplicar
  const before = Object.keys(G).length; calls.length = 0; P7 = true; await E(p, () => OS.CalPush.check()); await p.waitForFunction(() => !Object.values(OS.one('calx').map).some(m => m.e && !m.c), null, { timeout: 12000 }).catch(() => { }); await E(p, () => OS.CalPush.sync(true)); await sleep(300);
  const evs = Object.values(G), cal = t => (evs.find(x => x.t === t) || {}), cals = (calls.find(c => c.cals) || {}).cals || {};
  ok('Parte 7: Trabalho, Folgas e Tarefas vão cada um para o seu calendário, com cor pastel própria', cal('Trabalho · Loja').cal === 'trabalho' && cal('Folga').cal === 'folgas' && cal('Tarefa: Entregar trabalho').cal === 'tarefas' && /^Aula/.test((evs.find(x => x.cal === 'estudos') || {}).t || '') && new Set([cals.trabalho[1], cals.folgas[1], cals.tarefas[1], cals.estudos[1], cals.compromissos[1]]).size === 5 && Object.values(cals).every(([n, c]) => /^Oceanum/.test(n) && /^#[0-9A-F]{6}$/i.test(c) && Math.min(...[1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))) >= 0xA0), JSON.stringify({ cals, sh: cal('Trabalho · Loja').cal, off: cal('Folga').cal, tk: cal('Tarefa: Entregar trabalho').cal }));
  ok('Parte 7: os eventos que já estavam no calendário "Oceanum" mudam para o da sua cor sem duplicar (o antigo é apagado)', Object.keys(G).length === before && calls.some(c => (c.up || []).some(x => x.x)) && ops.includes('cal7'), JSON.stringify({ before, after: Object.keys(G).length }));
  calls.length = 0; await E(p, T => OS.add('tasks', { title: 'Ligar ao banco', sched: OS.U.addDays(T, 3), status: 'Próxima' }), T); await E(p, () => OS.CalPush.sync(true)); await sleep(200);
  ok('Parte 7: uma tarefa nova vai logo para o calendário Tarefas (amarelo pastel)', (Object.values(G).find(x => x.t === 'Tarefa: Ligar ao banco') || {}).cal === 'tarefas' && (Object.values(G).find(x => x.t === 'Tarefa: Ligar ao banco') || {}).cor === cals.tarefas[1]);
  ok('As cores são só lá fora: o Calendário da app continua com as cores de sempre', await E(p, () => OS.Cal.src.shift[1] === 'var(--c4)' && OS.Cal.src.task[1] === 'var(--c1)'));
  await E(p, () => { OS.setOne('integ', { gcal: true }); OS.gcalStart && OS.gcalStart(); }); await sleep(1200);
  ok('A app não lê de volta o calendário "Oceanum" (nada aparece duas vezes)', await E(p, () => OS.Cal.gcal.some(g => g.title === 'Jantar com a família') && !OS.Cal.gcal.some(g => /Trabalho · Loja/.test(g.title))));
  const er = errs.filter(e => !/Failed to load|net::|sandboxed|about:srcdoc|Content Security Policy/.test(e)); ok('sem erros de JavaScript (agenda)', !er.length, er.slice(0, 3).join(' | ')); await ctx.close(); }

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const b = await chromium.launch(); const t0 = Date.now();
  const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean), run = k => !ONLY.length || ONLY.includes(k);
  try { if (run('perfis')) for (const prof of PROFILES) await profileTests(b, prof); if (run('geral')) await sharedTests(b); if (run('areas')) await areaTests(b); if (run('novidades')) await newFeatureTests(b); if (run('seguranca')) await securityTests(b); if (run('atualizacao')) await updateTests(b); if (run('ia')) await aiTests(b); if (run('novos')) await novosTests(b); if (run('extras')) { await extrasTests(b); await extras2Tests(b); } if (run('voz')) await voiceTests(b); if (run('agenda')) await calTests(b); if (run('aparelhos')) await deviceMatrix(b); if (!QUICK && run('stress')) await stress(b); }
  catch (e) { R.push({ p: cur, name: 'execução da bateria', pass: false, info: e.message.split('\n')[0] }); console.log('ERRO NA BATERIA:', e.message); }
  await b.close(); srv.close();
  const f = R.filter(x => !x.pass);
  console.log(`\n────────\n${R.length - f.length}/${R.length} testes passaram em ${Math.round((Date.now() - t0) / 1000)} s`);
  if (f.length) { console.log('FALHAS:'); f.forEach(x => console.log(`  ✗ [${x.p}] ${x.name} — ${x.info}`)); }
  fs.writeFileSync(path.resolve(__dirname, 'last-report.json'), JSON.stringify(R, null, 1));
  process.exit(f.length ? 1 : 0);
})();
