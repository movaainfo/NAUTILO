/* OCEANUM — mudança de endereço (GitHub Pages → Vercel) com os dados.
   Os dados ficam guardados por endereço no aparelho, por isso a mudança leva-os:
   1) com a sincronização ligada: o novo endereço liga-se ao teu Google Drive e recebe tudo;
   2) sem sincronização: exportas um ficheiro aqui e importas no novo endereço. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc;
const NEW = 'https://oceanum-movaa.vercel.app', OLDS = ['https://kd25gpgdw9-lang.github.io', 'https://movaainfo.github.io', 'https://oceanum-ryan.vercel.app'], OLD = OLDS[0];
const isOld = OLDS.includes(location.origin), SY = () => window.OceanumSync || {};
const host = NEW.replace(/^https:\/\//, '');

/* ---------- endereço antigo: aviso de mudança ---------- */
const movePanel = () => { const on = !!SY().on;
  UI.modal(`<div class="mv-p"><div class="pn-h"><h3>O Oceanum mudou de endereço</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <p>O novo endereço é <b>${host}</b>. Este vai deixar de funcionar, por isso leva os teus dados contigo:</p>
    ${on ? `<div class="mv-o rec"><b>Com a sincronização (recomendado)</b><small>Envio as últimas alterações para o teu Google Drive e abro o novo endereço já ligado. Tudo aparece lá.</small><button class="btn pri" data-act="mvSync">Mudar agora</button></div>` : ''}
    <div class="mv-o ${on ? '' : 'rec'}"><b>${on ? 'Ou com um ficheiro' : 'Com um ficheiro'}</b><small>1. Guarda os dados num ficheiro (Guardar em Ficheiros).<br>2. Abre o novo endereço e toca em <b>Importar</b>.</small>
      <div class="row gap8" style="flex-wrap:wrap"><button class="btn ${on ? '' : 'pri'}" data-act="exportData">${UI.ic('arrowDown')}1 · Guardar os meus dados</button><a class="btn" href="${NEW}/#mudanca" target="_blank" rel="noopener">2 · Abrir o novo endereço</a></div>
      <small class="mut">O ficheiro tem as tuas chaves e dados pessoais: apaga-o depois de importares.</small></div>
    <p class="mut" style="font-size:12.5px;margin:10px 0 0">No novo endereço: Partilhar → <b>Adicionar ao ecrã principal</b>, e apaga o ícone antigo. O Face ID ativa-se outra vez lá.</p></div>`, 'tall'); };
A.mvOpen = () => movePanel();
A.mvSync = () => { const s = SY(); if (!s.on || !s.linkCode) return movePanel(); try { OS.pushAll(); } catch (e) { } UI.toast('A enviar as últimas alterações…');
  setTimeout(() => { location.href = NEW + '/#ligar=' + encodeURIComponent(s.linkCode()); }, 2500); };
if (isOld) {
  OS.on('ready', () => { if (navigator.webdriver) return; let seen = false; try { seen = sessionStorage.getItem('os2mvSeen') === '1'; sessionStorage.setItem('os2mvSeen', '1'); } catch (e) { } if (!seen) setTimeout(movePanel, 1200); });
  OS.on('ready', () => { const o = V.visao; if (!o || o._mv) return; V.visao = s => `<button class="mv-bar" data-act="mvOpen"><b>Novo endereço: ${host}</b><span>Mudar e levar os dados</span></button>` + o(s); V.visao._mv = 1; });
}

/* ---------- endereço novo: boas-vindas e importação ---------- */
const fresh = () => !U.ls.get('os2sync', 0) && !OS.all('transactions').length && OS.all('tasks').length < 12 && !U.ls.get('os2mvDone', 0);
const welcome = () => UI.modal(`<div class="mv-p"><div class="pn-h"><h3>Bem-vindo ao novo endereço</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <p>Traz os teus dados do endereço antigo:</p>
    <div class="mv-o rec"><b>Tenho o ficheiro</b><small>O ficheiro .json que guardaste no endereço antigo.</small><label class="btn pri">${UI.ic('arrowUp')}Importar o ficheiro<input type="file" id="impData" accept="application/json,.json" hidden></label></div>
    <div class="mv-o"><b>Uso a sincronização</b><small>No endereço antigo toca em <b>Mudar agora</b>, ou cola aqui o código de ligação em Definições → Sincronizar aparelhos.</small><a class="btn" href="#definicoes" data-mclose>Abrir Definições</a></div>
    <div class="mv-o"><b>Recuperar pela sincronização (Google Drive)</b><small>Se a sincronização estava ligada, os teus dados estão no Drive. Precisas do endereço e da chave do teu script Google:<br>• <b>Endereço</b>: script.google.com → o teu projeto do Oceanum → Implementar → Gerir implementações → <i>URL da aplicação Web</i> (termina em /exec).<br>• <b>Chave</b>: no código do script, a linha <code>const KEY = '…'</code> — copia só o que está entre as aspas.</small>
      <form class="mv-rec" data-form="mvRec" autocomplete="off"><input class="field" name="u" placeholder="https://script.google.com/macros/s/…/exec" required autocapitalize="none" spellcheck="false"><input class="field" name="k" placeholder="Chave (ex.: a8k2…)" required autocapitalize="none" spellcheck="false"><button class="btn pri">Recuperar os meus dados</button></form></div>
    <button class="btn ghost sm" data-act="mvDone" style="margin-top:6px">Começar do zero</button></div>`, 'tall');
OS.forms.mvRec = f => { const u = f.elements.u.value.trim(), k = f.elements.k.value.trim().replace(/^['"]|['"]$/g, '');
  if (!/^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u)) return UI.toast('O endereço tem de começar por https://script.google.com/macros/s/ e terminar em /exec', 'neg');
  if (k.length < 8) return UI.toast('A chave parece incompleta', 'neg'); const SYc = window.OceanumSync;
  if (!SYc || !SYc.applyLink || !SYc.applyLink(btoa(unescape(encodeURIComponent(JSON.stringify({ u, k })))))) return UI.toast('Não consegui guardar a ligação', 'neg');
  U.ls.set('os2mvDone', 1); UI.toast('Ligado. A trazer os teus dados do Google Drive…', 'pos'); setTimeout(() => window.__noReload || location.reload(), 900); };
A.mvDone = () => { U.ls.set('os2mvDone', 1); UI.closeModal(); };
if (!isOld) {
  OS.on('ready', () => { if (navigator.webdriver && !window.__mvTest) return; const want = /mudanca/.test(location.hash); if (want) history.replaceState(null, '', location.pathname + '#visao'); if (want || fresh()) setTimeout(welcome, 900); });
  // a importação (Definições ou boas-vindas) fecha a mudança
  document.addEventListener('change', e => { if (e.target.id === 'impData' && e.target.files[0]) { U.ls.set('os2mvDone', 1); setTimeout(() => { try { UI.closeModal(); } catch (er) { } }, 600); } });
}
OS.on('ready', () => { const o = V.definicoes; if (!o || o._mv) return; V.definicoes = sub => o(sub) + `<div class="pn"><div class="pn-h"><h3>Mudança de endereço</h3></div><p class="mut" style="margin:0 0 8px">Trazer os dados de outro endereço do Oceanum: ficheiro exportado ou sincronização do Google Drive.</p><button class="btn" data-act="mvWelcome">Trazer os meus dados</button></div>`; V.definicoes._mv = 1; });
A.mvWelcome = () => welcome();
OS.Move = { NEW, OLD, isOld, welcome, panel: movePanel };
})();
