// PRUMO · contas (função do Vercel): criar conta, entrar, perfis (como na Netflix), senha, recuperação e apagar a conta.
// Uma conta = e-mail + senha (guardada em scrypt, nunca em texto). Cada conta tem até 5 perfis; cada perfil tem os seus dados.
// Sem serviço de e-mail: ao criar a conta mostramos um código de recuperação (só aparece uma vez) para repor a senha.
'use strict';
const N = require('./_nuvem');
const MAXP = 5, COLORS = ['#F2C48D', '#7FA9DA', '#3FCF8E', '#E0896A', '#9A8CF5', '#F28CB1', '#5CC8E6', '#F2B544'];
// administração: só as contas cujo e-mail está em NAUTILO_ADMIN (variável do projeto no Vercel) veem o separador
const isAdmin = e => String(process.env.NAUTILO_ADMIN || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean).includes(String(e || '').toLowerCase());
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
// aceitação dos termos: versão (data) + o que a pessoa confirmou + quando (prova do consentimento, LGPD art. 8 / RGPD art. 7)
const TV = /^\d{4}-\d{2}-\d{2}$/;
const termsOf = b => { if (!TV.test(String(b.termos || '')) || b.saude !== true || b.idade !== true) throw N.err('termos', 'Para usar o Prumo tens de aceitar os Termos de Serviço e a Política de Privacidade e confirmar as outras duas caixas.', 400);
  return { v: b.termos, at: new Date().toISOString(), saude: true, idade: true }; };
const pub = (r, eid) => ({ email: r.email, nome: r.nome || '', criado: r.criado, adm: isAdmin(r.email), termos: (r.termos || {}).v || '', termosAt: (r.termos || {}).at || '', perfis: (r.perfis || []).map(p => ({ id: p.id, nome: p.nome, cor: p.cor, av: p.av || '', lk: p.lk || '', inf: !!p.inf, ps: !!p.ps, img: p.img || '', criado: p.criado })) });
const cleanName = (s, max) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanProfile = (p, old) => { const o = Object.assign({}, old || {});
  if (p.nome != null) o.nome = cleanName(p.nome, 24);
  if (p.cor != null && /^#[0-9A-Fa-f]{6}$/.test(p.cor)) o.cor = p.cor;
  if (p.av != null) o.av = [...String(p.av)].slice(0, 2).join('').replace(/[<>&"']/g, '');
  if (p.lk != null && /^([a-f0-9]{64})?$/.test(p.lk)) o.lk = p.lk;
  if (p.inf != null) o.inf = !!p.inf;
  if (p.ps != null) o.ps = !!p.ps;
  // imagem do perfil (foto ou personagem do Dominus), pequena: até ~45 kB
  if (p.img != null) { if (p.img === '') o.img = ''; else if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.img) && p.img.length <= 60000) o.img = p.img; else throw N.err('imagem', 'A imagem é grande demais ou não é válida.', 400); }
  return o; };

// ler e gravar a conta (cifrada); grava só se ninguém a mudou entretanto (etag), e volta a tentar
const readAcc = async eid => { const g = await N.store().get('a/' + eid); if (!g) return null; return { rec: N.open(await N.accKey(), g.buf), etag: g.etag }; };
// para gravar: a etiqueta oficial (head, pela API) tem de ser a do conteúdo lido; se a leitura veio atrasada, lê outra vez
const readFresh = async eid => { const s = N.store(); for (let i = 0; i < 4; i++) { const a = await readAcc(eid); if (!a) return null; const h = await s.head('a/' + eid).catch(() => null);
    const nt = x => String(x || '').replace(/^W\//, '').replace(/"/g, ''); if (!h || !h.etag) return a; if (nt(h.etag) === nt(a.etag)) return { rec: a.rec, etag: h.etag }; await N.sleep(150 * (i + 1)); }
  return readAcc(eid); };
const writeAcc = (eid, rec, etag) => N.accKey().then(k => N.store().put('a/' + eid, N.seal(k, rec), etag ? { ifMatch: etag } : { overwrite: false }));
const change = async (eid, fn) => { for (let i = 0; i < 5; i++) { const a = await (i ? readFresh(eid) : readAcc(eid)); if (!a) throw N.err('sem_conta', 'Conta não encontrada.', 404);
    const out = await fn(a.rec); if (out === false) return a.rec;
    try { await writeAcc(eid, a.rec, a.etag); return a.rec; } catch (e) { if (e.code !== 'conflict') throw e; await N.sleep(80 + Math.random() * 200); } }
  throw N.err('ocupado', 'A conta está a ser alterada noutro aparelho. Tenta outra vez.', 409); };
const session = async req => { const t = await N.readToken(req); if (!t) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
  const a = await readAcc(t.a); if (!a || a.rec.uid !== t.u || (a.rec.tv || 1) !== t.v) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
  return { t, eid: t.a, rec: a.rec }; };
const needPw = async (rec, pw) => { if (!(await N.checkPw(pw, rec.pw))) throw N.err('senha', 'A senha não está certa.', 403); };
const dropData = async (uid, pid) => { const s = N.store(), sub = pid ? pid + '/' : ''; const L = (await s.list('d/' + uid + '/' + sub)).concat(await s.list('i/' + uid + '/' + sub), pid ? await s.list('m/' + uid + '/' + pid) : await s.list('m/' + uid + '/'), await s.list('g/' + uid + '/' + (pid || ''))); if (L.length) await s.del(L); };

const OPS = {
  async registar(req, b) {
    if (N.limit(req, 'registar', 6, 3600e3)) throw N.err('limite', 'Muitas contas criadas a partir daqui. Tenta mais tarde.', 429);
    const email = N.normEmail(b.email), senha = String(b.senha || ''), nome = cleanName(b.nome, 40);
    if (!EMAIL.test(email)) throw N.err('email', 'Esse e-mail não parece válido.', 400);
    if (senha.length < 8) throw N.err('senha', 'A senha precisa de pelo menos 8 caracteres.', 400);
    if (senha.length > 200) throw N.err('senha', 'A senha é longa demais.', 400);
    const termos = termsOf(b), eid = await N.emailId(email), code = N.newCode();
    const rec = { v: 1, uid: N.crypto.randomBytes(12).toString('hex'), email, nome, criado: new Date().toISOString(), pw: await N.hashPw(senha), rc: await N.hashPw(N.normCode(code)), perfis: [], tv: 1, falhas: 0, bloq: 0, termos };
    try { await writeAcc(eid, rec); } catch (e) { if (e.code === 'exists') throw N.err('existe', 'Já existe uma conta com este e-mail. Entra com a tua senha.', 409); throw e; }
    return { token: await N.signToken(rec, eid), conta: pub(rec), recuperacao: code }; },

  async entrar(req, b) {
    if (N.limit(req, 'entrar', 30, 600e3)) throw N.err('limite', 'Muitas tentativas. Espera uns minutos.', 429);
    const email = N.normEmail(b.email), eid = await N.emailId(email), a = await readAcc(eid);
    if (!a) { await N.hashPw('x'); throw N.err('credenciais', 'E-mail ou senha errados.', 401); }
    if (a.rec.bloq > Date.now()) throw N.err('bloqueada', `Muitas tentativas erradas. Tenta daqui a ${Math.ceil((a.rec.bloq - Date.now()) / 60000)} min.`, 429);
    if (!(await N.checkPw(String(b.senha || ''), a.rec.pw))) {
      await change(eid, r => { r.falhas = (r.falhas || 0) + 1; if (r.falhas >= 8) { r.bloq = Date.now() + 15 * 60e3; r.falhas = 0; } }).catch(() => { });
      throw N.err('credenciais', 'E-mail ou senha errados.', 401); }
    const rec = await change(eid, r => { r.falhas = 0; r.bloq = 0; r.ult = Date.now(); r.logins = (r.logins || 0) + 1; }).catch(() => a.rec);
    return { token: await N.signToken(rec, eid), conta: pub(rec) }; },

  async eu(req) { const s = await session(req); return { conta: pub(s.rec) }; },
  // contas que já existiam (ou termos novos): aceitar uma vez
  async termos(req, b) { const s = await session(req), t = termsOf(b); const rec = await change(s.eid, r => { r.termos = t; }); return { conta: pub(rec) }; },
  // quem é o responsável e como contactar (para a Política de Privacidade); sem sessão
  async publico() { return { responsavel: String(process.env.NAUTILO_RESPONSAVEL || '').slice(0, 120), contacto: String(process.env.NAUTILO_CONTACTO || '').slice(0, 120) }; },
  // pedidos dos titulares (LGPD art. 18 / RGPD art. 15–22): ficam cifrados para a administração responder
  async pedido(req, b) { const s = await session(req); if (N.limit(req, 'pedido|' + s.rec.uid, 5, 864e5)) throw N.err('limite', 'Já fizeste vários pedidos hoje. Responderemos a todos.', 429);
    const TIPOS = ['confirmar', 'acesso', 'corrigir', 'eliminar', 'portabilidade', 'partilha', 'revogar', 'oposicao', 'outro'], tipo = TIPOS.includes(b.tipo) ? b.tipo : 'outro';
    const id = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) + '-' + N.crypto.randomBytes(3).toString('hex');
    await N.store().put('p/' + id, N.seal(await N.accKey(), { id, uid: s.rec.uid, email: s.rec.email, nome: s.rec.nome || '', tipo, msg: String(b.msg || '').slice(0, 3000), at: new Date().toISOString(), estado: 'novo' }), { overwrite: false });
    return { protocolo: id }; },
  async pedidoFeito(req, b) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403); const id = String(b.id || ''); if (!/^\d{14}-[a-f0-9]{6}$/.test(id)) throw N.err('id', 'Pedido desconhecido.', 400);
    const st = N.store(), key = await N.accKey(), g = await st.get('p/' + id); if (!g) throw N.err('id', 'Pedido desconhecido.', 404); const p = N.open(key, g.buf);
    p.estado = b.estado === 'novo' ? 'novo' : 'respondido'; p.feito = new Date().toISOString(); await st.put('p/' + id, N.seal(key, p), { ifMatch: g.etag }); return { pedido: p }; },

  // criar, editar ou apagar um perfil (apagar pede a senha da conta e apaga os dados desse perfil)
  async perfil(req, b) { const s = await session(req), acao = b.acao; let made = null;
    if (acao === 'apagar') { await needPw(s.rec, b.senha); if (!(s.rec.perfis || []).some(p => p.id === b.id)) throw N.err('perfil', 'Esse perfil já não existe.', 404); }
    const rec = await change(s.eid, r => { r.perfis = r.perfis || [];
      if (acao === 'criar') { if (r.perfis.length >= MAXP) throw N.err('maximo', `Cada conta pode ter até ${MAXP} perfis.`, 400);
        const p = cleanProfile(b.perfil || {}, { id: N.crypto.randomBytes(6).toString('hex'), cor: COLORS[r.perfis.length % COLORS.length], criado: new Date().toISOString() });
        if (!p.nome) throw N.err('nome', 'Dá um nome ao perfil.', 400); if (!p.lk) throw N.err('codigo', 'Escolhe o código de bloqueio do perfil.', 400);
        r.perfis.push(p); made = p; return; }
      const i = r.perfis.findIndex(p => p.id === b.id); if (i < 0) throw N.err('perfil', 'Esse perfil já não existe.', 404);
      if (acao === 'editar') { const p = cleanProfile(b.perfil || {}, r.perfis[i]); if (!p.nome) throw N.err('nome', 'Dá um nome ao perfil.', 400); r.perfis[i] = p; made = p; return; }
      if (acao === 'apagar') { r.perfis.splice(i, 1); return; }
      throw N.err('acao', 'Ação desconhecida.', 400); });
    if (acao === 'apagar') await dropData(rec.uid, b.id);
    return { conta: pub(rec), perfil: made }; },

  // esqueci o código de bloqueio do perfil: com a senha da conta escolhes outro
  async codigo(req, b) { const s = await session(req); await needPw(s.rec, b.senha);
    if (!/^[a-f0-9]{64}$/.test(b.lk || '')) throw N.err('codigo', 'Código inválido.', 400);
    const rec = await change(s.eid, r => { const p = (r.perfis || []).find(x => x.id === b.id); if (!p) throw N.err('perfil', 'Esse perfil já não existe.', 404); p.lk = b.lk; });
    return { conta: pub(rec) }; },

  async senha(req, b) { const s = await session(req); await needPw(s.rec, b.atual); const nova = String(b.nova || '');
    if (nova.length < 8) throw N.err('senha', 'A nova senha precisa de pelo menos 8 caracteres.', 400);
    const pw = await N.hashPw(nova), rec = await change(s.eid, r => { r.pw = pw; r.tv = (r.tv || 1) + 1; });
    return { token: await N.signToken(rec, s.eid), conta: pub(rec) }; },

  async recuperar(req, b) {
    if (N.limit(req, 'recuperar', 10, 3600e3)) throw N.err('limite', 'Muitas tentativas. Tenta mais tarde.', 429);
    const email = N.normEmail(b.email), eid = await N.emailId(email), a = await readAcc(eid), nova = String(b.nova || '');
    if (nova.length < 8) throw N.err('senha', 'A nova senha precisa de pelo menos 8 caracteres.', 400);
    if (!a) { await N.hashPw('x'); throw N.err('credenciais', 'E-mail ou código de recuperação errados.', 401); }
    if (a.rec.bloq > Date.now()) throw N.err('bloqueada', `Muitas tentativas erradas. Tenta daqui a ${Math.ceil((a.rec.bloq - Date.now()) / 60000)} min.`, 429);
    if (!(await N.checkPw(N.normCode(b.codigo), a.rec.rc))) { await change(eid, r => { r.falhas = (r.falhas || 0) + 1; if (r.falhas >= 8) { r.bloq = Date.now() + 15 * 60e3; r.falhas = 0; } }).catch(() => { }); throw N.err('credenciais', 'E-mail ou código de recuperação errados.', 401); }
    const code = N.newCode(), pw = await N.hashPw(nova), rc = await N.hashPw(N.normCode(code));
    const rec = await change(eid, r => { r.pw = pw; r.rc = rc; r.tv = (r.tv || 1) + 1; r.falhas = 0; r.bloq = 0; });
    return { token: await N.signToken(rec, eid), conta: pub(rec), recuperacao: code }; },

  async novocodigo(req, b) { const s = await session(req); await needPw(s.rec, b.senha); const code = N.newCode(), rc = await N.hashPw(N.normCode(code));
    await change(s.eid, r => { r.rc = rc; }); return { recuperacao: code }; },

  async sairtodos(req) { const s = await session(req); const rec = await change(s.eid, r => { r.tv = (r.tv || 1) + 1; }); return { token: await N.signToken(rec, s.eid) }; },

  // chave do atalho de gastos do iPhone para este perfil (nova = a antiga deixa de funcionar)
  async atalho(req, b) { const s = await session(req); let n = '';
    const rec = await change(s.eid, r => { const p = (r.perfis || []).find(x => x.id === b.id); if (!p) throw N.err('perfil', 'Esse perfil já não existe.', 404);
      if (p.ak && !b.nova) { n = p.ak; return false; } p.ak = n = N.crypto.randomBytes(6).toString('hex'); });
    return { chave: await N.atalhoKey(s.eid, b.id, n) }; },

  // tempo de uso: a app manda os minutos que esteve aberta e visível (por dia); fica num ficheiro à parte da conta
  async uso(req, b) { const t = await N.readToken(req); if (!t) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
    const min = Math.max(0, Math.min(30, Math.round(Number(b.min) || 0))), day = /^\d{4}-\d{2}-\d{2}$/.test(b.dia || '') ? b.dia : new Date().toISOString().slice(0, 10), s = N.store(), p = 'u/' + t.u, key = await N.accKey();
    for (let i = 0; i < 4; i++) { const g = await s.get(p); let u = { dias: {}, ult: 0, a: t.a }; try { if (g) u = N.open(key, g.buf); } catch (e) { }
      u.dias = u.dias || {}; u.dias[day] = (u.dias[day] || 0) + min; u.ult = Date.now(); u.a = t.a;
      const ks = Object.keys(u.dias).sort(); ks.slice(0, Math.max(0, ks.length - 90)).forEach(k => delete u.dias[k]);
      try { await s.put(p, N.seal(key, u), g ? { ifMatch: g.etag } : { overwrite: false }); return { ok2: true }; } catch (e) { if (e.code !== 'conflict' && e.code !== 'exists') throw e; await N.sleep(60 + Math.random() * 150); } }
    return { ok2: false }; },

  // separador de administração (só para quem está em NAUTILO_ADMIN): quem tem conta, quem entrou, quanto usa. Nunca mostra senhas nem dados.
  async admin(req) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403);
    const s = N.store(), key = await N.accKey(), [A, Us] = await Promise.all([s.list('a/'), s.list('u/')]);
    // lê aos poucos (16 de cada vez) para aguentar milhares de contas sem estourar a base de dados
    const pool = async (L, f) => { let i = 0; await Promise.all(Array.from({ length: Math.min(16, L.length) }, async () => { while (i < L.length) { const x = L[i++]; try { await f(x); } catch (e) { } } })); };
    const uso = {}; await pool(Us, async x => { const g = await s.get(x.pathname); if (g) uso[x.pathname.slice(2)] = N.open(key, g.buf); });
    const contas = []; await pool(A, async x => { const g = await s.get(x.pathname); if (!g) return; const r = N.open(key, g.buf), u = uso[r.uid] || { dias: {} };
      contas.push({ email: r.email, nome: r.nome || '', criado: r.criado, perfis: (r.perfis || []).map(p => p.nome), ultEntrada: r.ult || 0, entradas: r.logins || 0, ultUso: u.ult || 0, dias: u.dias || {}, admin: isAdmin(r.email), termos: (r.termos || {}).v || '', termosAt: (r.termos || {}).at || '' }); });
    contas.sort((a, b) => Math.max(b.ultUso, b.ultEntrada) - Math.max(a.ultUso, a.ultEntrada));
    const P = await s.list('p/'), pedidos = []; await pool(P.slice(-300), async x => { const g = await s.get(x.pathname); if (g) pedidos.push(N.open(key, g.buf)); });
    pedidos.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return { contas, total: contas.length, perfis: contas.reduce((n, c) => n + c.perfis.length, 0), pedidos }; },

  async nome(req, b) { const s = await session(req); const rec = await change(s.eid, r => { r.nome = cleanName(b.nome, 40); }); return { conta: pub(rec) }; },

  async apagar(req, b) { const s = await session(req); await needPw(s.rec, b.senha);
    await dropData(s.rec.uid); await N.store().del([{ pathname: 'a/' + s.eid }, { pathname: 'u/' + s.rec.uid }]); return { apagada: true }; }
};

module.exports = N.handler(async (req, res) => {
  if (req.method !== 'POST') return N.send(res, 405, { ok: false, msg: 'Só POST.' });
  const b = await N.body(req), op = OPS[b.op];
  if (!op || !Object.prototype.hasOwnProperty.call(OPS, b.op)) return N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' });
  N.send(res, 200, Object.assign({ ok: true }, await op(req, b)));
});
