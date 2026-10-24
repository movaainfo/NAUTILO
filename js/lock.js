/* PRUMO — ecrã de abertura e bloqueio.
   Face ID / impressão digital: WebAuthn com autenticador da plataforma, registado por dispositivo.
   Código: só o hash SHA-256 fica no código ou na base de dados; o código nunca é guardado em texto.
   Nota: é um bloqueio de privacidade no dispositivo. A proteção real da página é a tua conta claude.ai (artifact privado). */
(() => {
'use strict';
const U = OS.U;
const L = OS.Lock = {};
const SALT = 'oceanum-v1|';
const DEFAULT_HASH = 'e18cf01ee14b8fc1001060a44feca6635d905597402a61e893d315e38bb72d5c';
// logo do Prumo: quatro anéis (mais finos para fora) cortados no topo pela linha de prumo, e o ponto vermelho ao centro
const MARK = 'M53.42 32.72A17.61 17.61 0 1 1 46.58 32.72L46.58 38.71A11.8 11.8 0 1 0 53.42 38.71ZM53.42 21.99A28.22 28.22 0 1 1 46.58 21.99L46.58 26.48A23.77 23.77 0 1 0 53.42 26.48ZM53.42 12.71A37.45 37.45 0 1 1 46.58 12.71L46.58 15.8A34.37 34.37 0 1 0 53.42 15.8ZM53.42 4.13A46 46 0 1 1 46.58 4.13L46.58 5.84A44.29 44.29 0 1 0 53.42 5.84Z', MDOT = 4.86;
L.logo = (size = 96, color = '#E9E3D8', dot = '#E0431F') => `<svg class="oc-logo pr-logo" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><path fill="${color}" d="${MARK}"/><circle cx="50" cy="50" r="${MDOT}" fill="${dot}"/></svg>`;
L.word = (t = 'Prumo') => `<span class="pr-word">${t}</span>`;

const sha = async s => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const rand = n => crypto.getRandomValues(new Uint8Array(n));
const hash = () => (OS.one('security').hash) || (OS.Acc && OS.Acc.on ? OS.Acc.lk() || '-' : DEFAULT_HASH);
OS.ONE_DEF.security = { hash: '', changed: '' };
L.curHash = () => hash();

// memória primeiro: se o navegador bloquear o sessionStorage (vista embutida), o desbloqueio continua válido nesta sessão
let memUnlock = false;
// Android: sem biometria (o pedido do sistema escurecia o ecrã e pedia a senha do tablet). Apaga registos antigos.
const UA = navigator.userAgent || '', ANDROID = /Android/i.test(UA), IPHONE = /iPhone|iPod/.test(UA);
// Face ID só no iPhone (pedido do utilizador). Noutros aparelhos apaga registos antigos.
if (!IPHONE) { try { localStorage.removeItem('os2bio'); } catch (e) { } }
L.android = ANDROID; L.bioAllowed = IPHONE;
// aparelho de confiança: não pede código neste aparelho (opção nas Definições)
L.trusted = () => { try { return localStorage.getItem('os2trust') === '1'; } catch (e) { return false; } };
L.setTrusted = on => { try { on ? localStorage.setItem('os2trust', '1') : localStorage.removeItem('os2trust'); } catch (e) { } };
L.unlocked = () => { if (memUnlock || L.trusted()) return true; try { return sessionStorage.getItem('os2unlock') === '1'; } catch (e) { return false; } };
const setUnlocked = v => { memUnlock = !!v; try { v ? sessionStorage.setItem('os2unlock', '1') : sessionStorage.removeItem('os2unlock'); } catch (e) { } };
L.bioId = () => IPHONE ? U.ls.get('os2bio', null) : null;
L.bioAvailable = async () => { if (!IPHONE) return false; try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; } };
const bioErr = e => { const n = e && e.name;
  if (n === 'NotAllowedError') return 'O Face ID foi cancelado ou bloqueado. Tenta outra vez; confirma em Ajustes → Face ID e código que o Safari pode usar o Face ID e que o Porta-chaves do iCloud está ligado (Ajustes → o teu nome → iCloud → Palavras-passe e porta-chaves).';
  if (n === 'InvalidStateError') return 'Este iPhone já tem o Face ID registado no Prumo.';
  if (n === 'SecurityError') return 'O endereço da app não permite Face ID. Abre pelo link ' + location.origin + location.pathname + '.';
  if (n === 'NotSupportedError') return 'O iPhone não suporta este tipo de chave. Atualiza o iOS.';
  return 'Face ID indisponível: ' + ((e && (e.message || e.name)) || 'erro desconhecido'); };
L.register = async () => { if (ANDROID) { OS.UI.toast('No Android a biometria está desligada. Usa "Entrar direto" em Definições.', 'warn'); return false; }
  try {
    const cred = await navigator.credentials.create({ publicKey: { challenge: rand(32), rp: { name: 'Prumo' }, user: { id: rand(16), name: 'ryan', displayName: OS.one('profile').short || OS.who() }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, timeout: 60000 } });
    U.ls.set('os2bio', { id: b64u(cred.rawId), at: U.today() }); U.ls.set('os2bioAsk', true); try { OS.UI.closeModal(); } catch (e) { } OS.UI.toast('Face ID ativado. Da próxima vez entras com a cara.', 'pos'); OS.request(); return true;
  } catch (e) { U.ls.set('os2bioAsk', true); OS.UI.toast(bioErr(e), 'warn'); return false; }
};
L.forget = () => { U.ls.del('os2bio'); OS.UI.toast('Face ID removido deste dispositivo'); OS.request(); };
let bioBusy = false;
const bioUnlock = async auto => {
  const b = L.bioId(); if (!b || bioBusy) return false; bioBusy = true;
  try { await navigator.credentials.get({ publicKey: { challenge: rand(32), allowCredentials: [{ type: 'public-key', id: unb64u(b.id) }], userVerification: 'preferred', timeout: 45000 } }); return true; }
  // ao abrir sozinho, um cancelamento não é erro: fica o botão para tentar outra vez
  catch (e) { msg(auto && e && (e.name === 'NotAllowedError' || e.name === 'AbortError') ? 'Toca em "Desbloquear com Face ID" ou escreve o código.' : bioErr(e)); return false; }
  finally { bioBusy = false; }
};
// verificação para sair do Bloco de foco (e outros ecrãs protegidos): Face ID no iPhone ou o código, com o mesmo limite de tentativas
L.verifyBio = async () => { const b = L.bioId(); if (!b) return false; try { await navigator.credentials.get({ publicKey: { challenge: rand(32), allowCredentials: [{ type: 'public-key', id: unb64u(b.id) }], userVerification: 'required', timeout: 45000 } }); return true; } catch (e) { OS.UI.toast(bioErr(e), 'warn'); return false; } };
L.verifyCode = async v => { const w = wait(); if (w) return `Muitas tentativas. Espera ${w} s.`; if ((await sha(SALT + (v || ''))) === hash()) { U.ls.del('os2lkfails'); return null; }
  const f = U.ls.get('os2lkfails', 0) + 1; U.ls.set('os2lkfails', f); if (f >= 5) { U.ls.set('os2lkwait', Date.now() + 30000); U.ls.set('os2lkfails', 0); return 'Código errado 5 vezes. Espera 30 s.'; } return 'Código incorreto.'; };
L.setCode = async (cur, nw) => { if (await sha(SALT + cur) !== hash()) return 'O código atual não está certo.'; if (nw.length < 6) return 'O novo código precisa de pelo menos 6 caracteres.'; OS.setOne('security', { hash: await sha(SALT + nw), changed: U.today() }); return null; };

/* ---------- ecrã ---------- */
let done = null, busy = false;
const el = () => document.getElementById('splash');
const msg = t => { const m = document.getElementById('lkMsg'); if (m) m.textContent = t || ''; };
const wait = () => { const w = U.ls.get('os2lkwait', 0); return w > Date.now() ? Math.ceil((w - Date.now()) / 1000) : 0; };
async function tryCode(v) {
  if (busy) return; const w = wait(); if (w) { msg(`Muitas tentativas. Espera ${w} s.`); return; }
  busy = true; const ok = (await sha(SALT + v)) === hash(); busy = false;
  if (ok) { U.ls.del('os2lkfails'); open(); return; }
  const f = U.ls.get('os2lkfails', 0) + 1; U.ls.set('os2lkfails', f);
  if (f >= 5) { U.ls.set('os2lkwait', Date.now() + 30000); U.ls.set('os2lkfails', 0); msg('Código errado 5 vezes. Espera 30 s.'); } else msg('Código incorreto.');
  const i = document.getElementById('lkCode'); if (i) { i.value = ''; i.classList.remove('shake'); void i.offsetWidth; i.classList.add('shake'); i.focus(); }
}
const offerBio = async () => { if (!IPHONE || L.bioId() || U.ls.get('os2bioAsk', false) || !(await L.bioAvailable())) return;
  setTimeout(() => { OS.UI.modal(`<div style="padding:20px;text-align:center"><div style="display:grid;place-items:center;color:#9be7ff">${OS.UI.ic('lock')}</div><h3 style="margin:8px 0 6px">Ativar o Face ID?</h3><p class="mut" style="margin:0 0 16px">Da próxima vez entras só com a cara, sem escrever o código.</p><div class="col gap8"><button class="btn pri" data-act="bioRegister">Ativar Face ID</button><button class="btn ghost" data-act="bioLater">Agora não</button></div></div>`); }, 700); };
OS.act = OS.act || {};
OS.act.bioLater = () => { U.ls.set('os2bioAsk', true); OS.UI.closeModal(); };
function open() { const viaCode = !L.unlocked(); setUnlocked(true); if (viaCode) offerBio(); const s = el(); s.classList.add('out'); setTimeout(() => { s.hidden = true; s.classList.remove('out'); }, 520); const d = done; done = null; d && d(); setTimeout(() => OS.emit('unlock'), 600); }
// campo do código: sem o gestor de palavras-passe do iOS (que desenhava bordas brancas e o ícone escuro ao lado)
const codeInput = () => { const sec = (() => { try { return CSS.supports('-webkit-text-security', 'disc'); } catch (e) { return false; } })();
  return `<input id="lkCode" class="${sec ? 'lk-sec' : ''}" type="${sec ? 'text' : 'password'}" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" data-lpignore="true" data-1p-ignore placeholder="Código de acesso" aria-label="Código de acesso">`; };
// ecrã de entrada: o mar visto do forte, à hora real, com a tua frase do dia
const hello = () => { const h = new Date().getHours(); return h < 6 ? 'Boa madrugada' : h < 13 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite'; };
const hm = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
let lkTick = 0, lkRes = 0, lkRT = 0;
const scene = () => OS.Scene ? `<div class="lk-scene">${OS.Scene.svg(Math.max(320, innerWidth), Math.max(480, innerHeight), { anim: 1, id: 'lks' })}<i class="lk-grain" style="background-image:url(${OS.Scene.grain()})"></i></div>` : '';
async function showLock() {
  const s = el(), bio = L.bioId(), can = bio && await L.bioAvailable();
  s.hidden = false; s.classList.add('lkx');
  let name = 'Ryan', q = ''; try { name = (OS.one('profile').short || OS.who()).split(' ')[0]; } catch (e) { } try { q = OS.Quotes ? OS.Quotes.push() : ''; } catch (e) { }
  const qs = q.length < 42 ? 'l' : q.length < 75 ? 'm' : 's';
  s.innerHTML = `${scene()}<div class="lk-top"><div class="lk-time" id="lkTime">${hm()}</div><div class="lk-date">${OS.U ? OS.U.esc(OS.U.longDate(OS.U.today())) : ''}</div></div>
    <div class="lk-mid"><p class="lk-hi">${hello()}, ${OS.U ? OS.U.esc(name) : 'Ryan'}.</p>${q ? `<p class="lk-q ${qs}">${OS.U.esc(q)}</p>` : ''}</div>
    <div class="sp-in lk-bot"><div class="lk-brand">${L.logo(26)}<span class="sp-name">Prumo</span></div>
    <form class="lk" id="lkForm" autocomplete="off">
      ${can ? `<button type="button" class="lk-bio" id="lkBio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2M9 9v1M15 9v1M12 9v4h-1M9 16c1.5 1 4.5 1 6 0"/></svg>Desbloquear com Face ID</button><div class="lk-or">ou código</div>` : ''}
      ${codeInput()}
      <button class="lk-go" type="submit" aria-label="Entrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
    </form><div class="lk-msg" id="lkMsg" role="status" aria-live="polite"></div>${OS.Acc && OS.Acc.on ? '<button type="button" class="lk-sw" id="lkSw">Trocar de perfil</button>' : ''}<div class="sp-foot">MIND CONTROL${window.OceanumVersion && window.OceanumVersion.v ? ' · v' + window.OceanumVersion.v : ''}</div></div>`;
  clearInterval(lkTick); lkTick = setInterval(() => { const t = document.getElementById('lkTime'); if (!t || s.hidden) { clearInterval(lkTick); return; } t.textContent = hm(); }, 15000);
  if (!lkRes) { lkRes = 1; addEventListener('resize', () => { clearTimeout(lkRT); lkRT = setTimeout(() => { const sc = s.querySelector('.lk-scene'); if (sc && !s.hidden) sc.outerHTML = scene(); }, 250); }); }
  document.getElementById('lkForm').onsubmit = e => { e.preventDefault(); tryCode(document.getElementById('lkCode').value); };
  const sw = document.getElementById('lkSw'); if (sw) sw.onclick = () => OS.Acc.switchProfile();
  const bb = document.getElementById('lkBio');
  if (bb) { const go = async auto => { if (bb.disabled || !bb.isConnected || L.unlocked()) return; bb.disabled = true; try { if (await bioUnlock(auto)) open(); } finally { bb.disabled = false; } };
    bb.onclick = () => go(false);
    // iPhone: o Face ID abre sozinho ao entrar (no Android a biometria está desligada: lá mostrava um ecrã preto do sistema)
    if (IPHONE && (!navigator.webdriver || window.__bioAuto)) { const auto = () => { if (document.hidden) return; document.removeEventListener('visibilitychange', auto); setTimeout(() => go(true), 250); };
      document.hidden ? document.addEventListener('visibilitychange', auto) : auto(); } }
  else if (matchMedia('(pointer:fine)').matches) setTimeout(() => { const i = document.getElementById('lkCode'); i && i.focus(); }, 300);
}
L._autoBio = IPHONE;
L.gate = fn => { done = fn; if (L.unlocked()) { const s = el(); s.classList.add('out'); setTimeout(() => { s.hidden = true; s.classList.remove('out'); }, 520); done = null; fn(); setTimeout(() => OS.emit('unlock'), 600); } else showLock(); };
L.lock = () => { L.setTrusted(false); setUnlocked(false); done = () => OS.request(); showLock(); };
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000 && L.unlocked()) L.lock(); });
OS.act = OS.act || {};
OS.act.lockNow = () => L.lock();
OS.act.bioRegister = () => L.register();
OS.act.bioForget = () => L.forget();
OS.forms = OS.forms || {};
OS.forms.codeChange = async (f) => { const err = await L.setCode(f.elements.cur.value, f.elements.nw.value); OS.UI.toast(err || 'Código alterado em todos os dispositivos', err ? 'neg' : 'pos'); };
})();
