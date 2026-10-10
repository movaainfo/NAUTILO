/* OCEANUM — versão independente (fora do claude.ai).
   Sem configuração: os dados ficam guardados neste dispositivo (funciona offline).
   Com Firebase configurado em config.js: entras com a tua conta Google e os dados sincronizam entre telemóvel e computador.
   O motor de dados (core.js) fala com uma base de dados ao estilo Firestore; aqui ligamo-lo ao Firestore real, numa pasta só tua. */
(() => {
'use strict';
if (window.claude) return; // dentro do claude.ai usa a base de dados do artifact
const CFG = window.OCEANUM_FIREBASE;
const V = 'https://www.gstatic.com/firebasejs/10.12.2/';
const load = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
const Cloud = OS.Cloud = { enabled: !!(CFG && CFG.apiKey), user: null, state: CFG && CFG.apiKey ? 'a ligar…' : 'off' };
let ready = null;
const init = () => ready || (ready = (async () => {
  if (!window.firebase) { await load(V + 'firebase-app-compat.js'); await load(V + 'firebase-auth-compat.js'); await load(V + 'firebase-firestore-compat.js'); }
  firebase.initializeApp(CFG);
  try { firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(() => { }); } catch (e) { }
  try { await firebase.auth().getRedirectResult(); } catch (e) { Cloud.err = e.message; }
  return new Promise(res => { const off = firebase.auth().onAuthStateChanged(u => { off(); Cloud.user = u; res(u); }); });
})());
window.claude = { use: async cap => {
  if (cap !== 'db' || !Cloud.enabled) return null;
  let u = null; try { u = await init(); } catch (e) { Cloud.state = 'sem ligação ao Firebase'; return null; }
  if (!u) { Cloud.state = 'por entrar'; return null; }
  if (CFG.allowedEmail && u.email !== CFG.allowedEmail) { Cloud.state = 'conta não autorizada'; await firebase.auth().signOut(); return null; }
  Cloud.state = 'ligado';
  const base = firebase.firestore().collection('users').doc(u.uid);
  return { collection: name => ({ onSnapshot: (cb, err) => base.collection(name).onSnapshot(cb, err) }),
    doc: path => { const [c, id] = path.split('/'); return base.collection(c).doc(id); } };
} };
OS.act.cloudIn = async () => { try { await init(); const p = new firebase.auth.GoogleAuthProvider(); try { await firebase.auth().signInWithPopup(p); location.reload(); } catch (e) { await firebase.auth().signInWithRedirect(p); } } catch (e) { OS.UI.toast('Não foi possível entrar: ' + (e.message || e), 'neg'); } };
OS.act.cloudOut = async () => { try { await init(); await firebase.auth().signOut(); location.reload(); } catch (e) { } };
OS.act.cloudPush = () => { OS.pushAll(); OS.UI.toast('A enviar tudo para a nuvem…'); };
const panel = () => { const U = OS.U, e = U.esc;
  return `<div class="pn"><div class="pn-h"><h3>Sincronização na nuvem</h3><span class="mut" style="font-size:12px">${e(Cloud.state)}</span></div>
  ${!Cloud.enabled ? `<p class="mut" style="margin:0">Os dados estão guardados só neste dispositivo. Para sincronizar entre telemóvel e computador, configura o Firebase (vê o guia LANCAR.md) e volta a publicar.</p>`
    : Cloud.user ? `<p style="margin:0 0 10px">Ligado como <b>${e(Cloud.user.email || '')}</b>. Tudo o que registas sincroniza sozinho.</p><div class="row gap8"><button class="btn" data-act="cloudPush">Enviar tudo agora</button><button class="btn ghost" data-act="cloudOut">Sair</button></div>`
    : `<p style="margin:0 0 10px">Entra com a tua conta Google para guardar na nuvem e ver os mesmos dados em todos os dispositivos.</p><button class="btn pri" data-act="cloudIn">Entrar com Google</button>`}</div>`; };
// só aparece se o Firebase estiver configurado (a sincronização normal é a do Google Drive, em "Sincronizar aparelhos")
const orig = OS.views.definicoes; if (orig && Cloud.enabled) OS.views.definicoes = sub => orig(sub) + panel();
if (Cloud.enabled) init().then(u => { Cloud.state = u ? 'ligado' : 'por entrar'; OS.request(); }).catch(() => { Cloud.state = 'sem ligação'; OS.request(); });
})();
