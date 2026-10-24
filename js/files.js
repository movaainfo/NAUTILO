/* PRUMO — Ficheiros na nuvem: PDFs, slides, exames e documentos da Universidade e dos Cursos guardados no TEU Google Drive
   (pasta "Náutilo · Ficheiros", uma subpasta por disciplina e por curso). Depois de enviados, podes apagá-los do aparelho:
   ficam no Drive e abrem-se daqui em qualquer aparelho. Precisa da Parte 5 do script Google (Definições → Script Google). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc, IB = OS.Inbox;
const FL = OS.Files = {};
const CH = 3000000, MAX = 40 * 1048576;
OS.S.files = { label: 'Ficheiro', title: r => r.name, fields: [
  { k: 'name', l: 'Nome', t: 'text', req: 1 }, { k: 'kind', l: 'Tipo', t: 'sel', o: ['PDF', 'Slides', 'Sebenta / apontamentos', 'Exercícios', 'Exames antigos', 'Livro', 'Certificado', 'Imagem', 'Documento', 'Outro'] },
  { k: 'notes', l: 'Notas', t: 'area', rows: 2 }], defaults: () => ({ kind: 'PDF' }) };

/* ---------- Parte 5 do script ---------- */
IB.addon5 = () => `// Prumo · PARTE 5 — Ficheiros na nuvem (pasta "Náutilo · Ficheiros" no TEU Google Drive): PDFs e documentos da Universidade e dos Cursos.
// Vai num FICHEIRO NOVO do mesmo projeto (＋ → Script → nome Parte5), por baixo da Parte4. Não apagues as outras partes.
function fRaiz_() { const P = PropertiesService.getScriptProperties(); let f = null; const id = P.getProperty('F_ROOT');
  if (id) { try { f = DriveApp.getFolderById(id); if (f.isTrashed()) f = null; } catch (e) { f = null; } }
  if (!f) { let it = DriveApp.getFoldersByName('Náutilo · Ficheiros'); if (!it.hasNext()) it = DriveApp.getFoldersByName('Oceanum · Ficheiros'); f = it.hasNext() ? it.next() : DriveApp.createFolder('Náutilo · Ficheiros'); P.setProperty('F_ROOT', f.getId()); }
  if (/^Oceanum/.test(f.getName())) { try { f.setName('Náutilo · Ficheiros'); } catch (e) { } }
  return f; }
function fPasta_(c) { let f = fRaiz_(); String(c || '').split('/').map(function (x) { return x.replace(/[\\\\:*?"<>|]/g, ' ').trim().slice(0, 80); }).filter(String).forEach(function (n) { const it = f.getFoldersByName(n); f = it.hasNext() ? it.next() : f.createFolder(n); }); return f; }
function fTmp_() { const r = fRaiz_(), it = r.getFoldersByName('_envios'); return it.hasNext() ? it.next() : r.createFolder('_envios'); }
function op_fping(p) { const r = fRaiz_(); return { ok: true, v: 5, pasta: r.getUrl() }; }
// envio por partes: up = id do envio, i = número da parte, n = total de partes, d = pedaço em base64
function op_fup(p) { const up = String(p.up || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40), i = Number(p.i || 0), n = Number(p.n || 1);
  if (!up || !(n >= 1) || !(i >= 0) || i >= n) return { ok: false, msg: 'Pedido inválido' };
  let b64 = String(p.d || '');
  if (n > 1) { const tmp = fTmp_(), nm = function (k) { return up + '.' + ('000' + k).slice(-4); };
    tmp.createFile(nm(i), b64, MimeType.PLAIN_TEXT); if (i < n - 1) return { ok: true, i: i };
    const fs = []; for (let k = 0; k < n; k++) { const it = tmp.getFilesByName(nm(k)); if (!it.hasNext()) return { ok: false, msg: 'Falta a parte ' + (k + 1) }; fs.push(it.next()); }
    b64 = fs.map(function (f) { return f.getBlob().getDataAsString(); }).join(''); fs.forEach(function (f) { f.setTrashed(true); });
    const velho = Date.now() - 864e5, it2 = tmp.getFiles(); while (it2.hasNext()) { const f = it2.next(); if (f.getDateCreated().getTime() < velho) f.setTrashed(true); } }
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), String(p.mime || 'application/octet-stream'), String(p.nome || 'ficheiro').slice(0, 180));
  const f = fPasta_(p.pasta).createFile(blob); if (p.desc) f.setDescription(String(p.desc).slice(0, 500));
  return { ok: true, id: f.getId(), url: f.getUrl(), size: f.getSize() }; }
// descarregar por partes (para abrir dentro da app ou guardar no aparelho)
function op_fdl(p) { const f = DriveApp.getFileById(String(p.id || '')), b = Utilities.base64Encode(f.getBlob().getBytes()), c = 3000000, i = Number(p.i || 0);
  return { ok: true, n: Math.max(1, Math.ceil(b.length / c)), d: b.slice(i * c, (i + 1) * c), mime: f.getMimeType(), nome: f.getName() }; }
function op_frm(p) { try { DriveApp.getFileById(String(p.id || '')).setTrashed(true); return { ok: true }; } catch (e) { return { ok: false, msg: String(e.message || e) }; } }
// lista tudo o que está na pasta (para recuperar a lista noutro aparelho)
function op_fls(p) { const out = []; (function anda(f, cam) { const fs = f.getFiles(); while (fs.hasNext() && out.length < 3000) { const x = fs.next(); if (!x.isTrashed()) out.push({ id: x.getId(), n: x.getName(), s: x.getSize(), m: x.getMimeType(), u: x.getUrl(), p: cam, t: x.getDateCreated().getTime() }); }
  const ds = f.getFolders(); while (ds.hasNext()) { const d = ds.next(); if (d.getName() !== '_envios') anda(d, cam ? cam + '/' + d.getName() : d.getName()); } })(fRaiz_(), ''); return { ok: true, f: out }; }
`;

/* ---------- estado ---------- */
const st = () => OS.one('inbox') || {};
FL.ready = () => !!(st().url && st().key);
FL.has5 = () => !!(st().f5);
FL.has6 = () => +(st().f5v || 0) >= 6;
FL.check = async () => { if (!FL.ready()) return false; try { const j = await IB.post({ op: 'fping' }); const ok = !!(j && j.ok && j.v >= 5); const c = st(), v = ok ? +j.v : 0; if (!!c.f5 !== ok || +(c.f5v || 0) !== v || (ok && j.pasta && c.f5url !== j.pasta)) { c.f5 = ok ? 1 : 0; c.f5v = v; if (j.pasta) c.f5url = j.pasta; OS.touch('inbox'); } return ok; } catch (e) { return false; } };
OS.on('ready', () => setTimeout(() => { if (FL.ready() && (!FL.has5() || !FL.has6())) FL.check(); }, 5000));

const ext = n => (String(n).match(/\.([a-z0-9]{1,5})$/i) || [, ''])[1].toLowerCase();
const kindOf = (n, m) => { const e = ext(n); return e === 'pdf' ? 'PDF' : /^(ppt|pptx|key|odp)$/.test(e) ? 'Slides' : /^(png|jpe?g|heic|webp|gif)$/.test(e) || /^image\//.test(m || '') ? 'Imagem' : /^(doc|docx|odt|pages|txt|rtf|md)$/.test(e) ? 'Documento' : /^(xls|xlsx|csv|numbers|ods)$/.test(e) ? 'Documento' : 'Outro'; };
const ICON = { PDF: 'note', Slides: 'grid', Imagem: 'eye', Documento: 'note', 'Exames antigos': 'checksq', 'Exercícios': 'checksq', Livro: 'book', Certificado: 'shield' };
FL.size = b => { b = +b || 0; return b >= 1048576 ? U.nf(b / 1048576, 1) + ' MB' : b >= 1024 ? U.nf(b / 1024, 0) + ' KB' : b + ' B'; };
FL.of = (area, ref) => U.sortBy(OS.all('files').filter(f => f.area === area && (!ref || f.ref === ref)), f => -(f.at || 0));
const folderFor = (area, ref) => { if (area === 'uni') { const s = OS.get('subjects', ref); return 'Universidade/' + (s ? s.name : 'Geral'); } if (area === 'curso') { const l = OS.get('learn', ref); return 'Cursos/' + (l ? l.title : 'Geral'); } return 'Outros'; };

/* ---------- envio ---------- */
const UP = FL.up = { q: [], cur: null, done: 0, total: 0 };
const pill = () => { let el = document.getElementById('fUp'); const c = UP.cur; if (!c && !UP.q.length) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'fUp'; el.className = 'f-up'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  const p = c ? Math.round(c.p * 100) : 0; el.innerHTML = `<b>${UI.ic('arrowUp')}A guardar na nuvem${UP.total > 1 ? ` · ${UP.done + 1} de ${UP.total}` : ''}</b><small>${esc(c ? c.name : '')}</small><i><span style="width:${p}%"></span></i>`; };
const b64 = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).replace(/^data:[^,]*,/, '')); r.onerror = () => rej(r.error || new Error('Não consegui ler o ficheiro')); r.readAsDataURL(file); });
const post = async (o, tries = 3) => { let e; for (let t = 0; t < tries; t++) { try { const j = await IB.post(o); if (j && j.ok) return j; e = new Error((j && j.msg) || 'sem resposta'); if (j && /Valor inválido|Pedido inválido/.test(j.msg || '')) break; } catch (x) { e = x; } await new Promise(r => setTimeout(r, 1200 * (t + 1))); } throw e; };
const sendOne = async it => { const f = it.file; UP.cur = { name: f.name, p: 0 }; pill();
  const d = await b64(f), n = Math.max(1, Math.ceil(d.length / CH)), up = U.uid ? U.uid().replace(/[^a-z0-9]/gi, '') : String(Date.now()) + Math.random().toString(36).slice(2, 8);
  let r = null; for (let i = 0; i < n; i++) { r = await post({ op: 'fup', up, i, n, d: d.slice(i * CH, (i + 1) * CH), nome: f.name, mime: f.type || 'application/octet-stream', pasta: folderFor(it.area, it.ref) }); UP.cur.p = (i + 1) / n; pill(); }
  if (!r || !r.id) throw new Error('O Drive não confirmou o ficheiro');
  OS.add('files', { name: f.name.replace(/\.[a-z0-9]{1,5}$/i, ''), file: f.name, area: it.area, ref: it.ref, kind: kindOf(f.name, f.type), size: r.size || f.size, mime: f.type || '', fid: r.id, url: r.url, at: Date.now() }); };
const run = async () => { if (UP.cur) return; let ok = 0, bad = [];
  while (UP.q.length) { const it = UP.q.shift(); try { await sendOne(it); ok++; } catch (e) { bad.push(it.file.name + ': ' + (e.message || e)); } UP.done++; UP.cur = null; pill(); }
  UP.cur = null; UP.done = 0; UP.total = 0; pill(); OS.request();
  if (ok) UI.toast(ok === 1 ? 'Guardado no teu Google Drive ✓ Já o podes apagar do aparelho.' : `${ok} ficheiros guardados no teu Google Drive ✓`, 'pos');
  if (bad.length) UI.toast('Não consegui guardar: ' + bad.slice(0, 2).join(' · '), 'neg'); };
FL.send = (files, area, ref) => { const L = [...files], big = L.filter(f => f.size > MAX); if (big.length) UI.toast(`${big.map(f => f.name).slice(0, 2).join(', ')}: maior que 40 MB (divide o PDF ou guarda o link do Drive).`, 'warn');
  L.filter(f => f.size <= MAX).forEach(file => UP.q.push({ file, area, ref })); UP.total = UP.q.length + (UP.cur ? 1 : 0); if (UP.q.length) run(); };

/* ---------- ações ---------- */
const needPart5 = () => UI.modal(`<div style="padding:18px"><div class="pn-h"><h3>${UI.ic('arrowUp')}Guardar ficheiros na nuvem</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
  ${FL.ready() ? `<p style="margin:0 0 10px">Os ficheiros vão para o <b>teu Google Drive</b> (pasta <b>Náutilo · Ficheiros</b>, uma subpasta por disciplina e por curso). Para isso o teu script precisa da <b>Parte 5</b> (um ficheiro novo, 2 minutos):</p>
  <ol class="ai-steps"><li><button class="btn pri" data-act="ibCopy" data-t="p${IB.partsHelp().n}">${UI.ic('link')}Copiar a Parte 5</button></li>
  <li>Em <a class="acc" href="https://script.google.com/home" target="_blank" rel="noopener">script.google.com</a> → o projeto do Náutilo → <b>Arquivos → +</b> → <b>Script</b> → nome <b>Parte5</b> → apaga o que vier → cola → <b>Guardar</b>.</li>
  <li><b>Implantar → Gerenciar implantações</b> → lápis → Versão: <b>Nova versão</b> → <b>Implantar</b>. Se pedir, autoriza o Google Drive.</li>
  <li>Volta aqui e toca em <b>Verificar</b>.</li></ol>
  <div class="row gap8"><button class="btn sm" data-act="fVer">${UI.ic('sync')}Verificar</button><a class="btn sm ghost" href="#definicoes.script" data-mclose>Ver todas as partes</a></div>`
  : `<p>Primeiro liga o script Google em <a class="acc" href="#definicoes" data-mclose>Definições → Geral</a>. É ele que guarda os ficheiros no teu Google Drive.</p>`}</div>`);
A.fVer = async () => { UI.toast('A verificar…'); const ok = await FL.check(); OS.request(); UI.toast(ok ? 'Parte 5 instalada ✓ Já podes guardar ficheiros.' : 'Ainda não vejo a Parte 5: confirma "Nova versão" ao implantar.', ok ? 'pos' : 'warn'); if (ok) UI.closeModal && UI.closeModal(); };
A.fPick = async b => { if (!FL.has5()) { if (FL.ready() && await FL.check()) { /* instalada entretanto */ } else return needPart5(); }
  const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = b.dataset.acc || '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.md,.zip,image/*'; inp.style.display = 'none';
  inp.onchange = () => { if (inp.files && inp.files.length) FL.send(inp.files, b.dataset.area, b.dataset.ref); inp.remove(); }; document.body.appendChild(inp); inp.click(); };
A.fOpen = b => { const f = OS.get('files', b.dataset.id); if (f && f.url) window.open(f.url, '_blank', 'noopener'); };
const fetchBlob = async f => { const parts = []; let n = 1; for (let i = 0; i < n; i++) { const j = await post({ op: 'fdl', id: f.fid, i }); n = j.n || 1; parts.push(j.d || ''); }
  const bin = atob(parts.join('')), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: f.mime || 'application/octet-stream' }); };
FL.blob = fetchBlob;
A.fDown = async b => { const f = OS.get('files', b.dataset.id); if (!f) return; UI.toast('A descarregar do Drive…');
  try { const bl = await fetchBlob(f), name = f.file || f.name, fl = typeof File === 'function' ? new File([bl], name, { type: bl.type }) : null;
    if (fl && navigator.canShare && navigator.canShare({ files: [fl] })) { await navigator.share({ files: [fl], title: name }); return; }
    const u = URL.createObjectURL(bl), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 4000); }
  catch (e) { if (e && e.name === 'AbortError') return; UI.toast('Não consegui descarregar: ' + (e.message || e), 'neg'); } };
A.fDel = b => { const f = OS.get('files', b.dataset.id); if (!f) return; UI.ask('Apagar este ficheiro?', `"${f.name}" vai para o lixo do teu Google Drive (podes recuperá-lo lá durante 30 dias).`, 'Apagar', async () => {
  try { if (f.fid && FL.ready()) await post({ op: 'frm', id: f.fid }, 2); } catch (e) { } OS.del('files', f.id); UI.toast('Ficheiro apagado'); }); };
A.fSync = async () => { if (!FL.has5()) return needPart5(); UI.toast('A ler a pasta do Drive…');
  try { const j = await post({ op: 'fls' }), have = new Set(OS.all('files').map(f => f.fid)); let n = 0;
    (j.f || []).forEach(x => { if (have.has(x.id)) return; const [top, sub] = String(x.p || '').split('/'); let area = 'outro', ref = '';
      if (top === 'Universidade') { const s = OS.all('subjects').find(s => s.name === sub); area = 'uni'; ref = s ? s.id : ''; } else if (top === 'Cursos') { const l = OS.all('learn').find(l => l.title === sub); area = 'curso'; ref = l ? l.id : ''; }
      OS.add('files', { name: x.n.replace(/\.[a-z0-9]{1,5}$/i, ''), file: x.n, area, ref, kind: kindOf(x.n, x.m), size: x.s, mime: x.m, fid: x.id, url: x.u, at: x.t || Date.now() }); n++; });
    UI.toast(n ? `${n} ficheiro(s) recuperado(s) do Drive` : 'A lista já está igual ao Drive ✓', 'pos'); } catch (e) { UI.toast('Não consegui ler o Drive: ' + (e.message || e), 'neg'); } };

/* ---------- blocos de ecrã ---------- */
FL.btn = (area, ref, label = 'Guardar ficheiros', cls = 'btn xs') => `<button class="${cls}" data-act="fPick" data-area="${area}" data-ref="${esc(ref || '')}" title="Guardar PDFs e documentos no teu Google Drive">${UI.ic('arrowUp')}${esc(label)}</button>`;
FL.row = f => `<div class="li f-li"><span class="un-mi">${UI.ic(ICON[f.kind] || 'note')}</span><div class="li-t click" data-act="fOpen" data-id="${f.id}" title="Abrir no Google Drive"><b>${esc(f.name)}</b><small>${esc(f.kind || '')} · ${FL.size(f.size)} · ${U.fmtDS ? U.fmtDS(U.iso(new Date(+f.at || Date.now()))) : ''} · no Drive</small></div>
  <span class="row gap6 f-act"><button class="btn xs" data-act="fOpen" data-id="${f.id}">Abrir</button><button class="icon-btn" data-act="fDown" data-id="${f.id}" aria-label="Descarregar para o aparelho" title="Descarregar">${UI.ic('arrowDown')}</button><button class="icon-btn" data-edit="files:${f.id}" aria-label="Renomear" title="Renomear">${UI.ic('edit')}</button><button class="icon-btn" data-act="fDel" data-id="${f.id}" aria-label="Apagar" title="Apagar">${UI.ic('trash')}</button></span></div>`;
FL.list = (area, ref, empty = '') => { const L = FL.of(area, ref); return L.length ? `<div class="list f-list">${L.map(FL.row).join('')}</div>` : (empty ? `<p class="mut" style="font-size:13px;margin:6px 0">${empty}</p>` : ''); };
FL.summary = area => { const L = OS.all('files').filter(f => !area || f.area === area), sz = U.sum(L, f => +f.size || 0);
  return `<div class="f-sum"><span>${UI.ic('arrowUp')}<b>${L.length}</b> ficheiro(s) na nuvem · ${FL.size(sz)}</span>${FL.has5() ? `${st().f5url ? `<a class="btn xs ghost" href="${esc(st().f5url)}" target="_blank" rel="noopener">Abrir pasta no Drive ↗</a>` : ''}<button class="btn xs ghost" data-act="fSync" title="Ir buscar ao Drive ficheiros guardados noutro aparelho">${UI.ic('sync')}Atualizar lista</button>` : `<button class="btn xs ghost" data-act="fPick" data-area="${area || 'outro'}" data-ref="">Ativar ficheiros na nuvem</button>`}</div>`; };
})();
