/* OCEANUM — corridas do relógio (Aurea Fit → app Saúde → Atalho do iPhone → Oceanum).
   O atalho lê a última corrida no Saúde e abre este endereço:
   …/Oceanum/#corrida-add?km=5,2&seg=1860&bpm=152&bpmmax=178&kcal=410&data=2026-10-04
   (aceita também tempo=31:00, min=31, metros=5200). Abre o registo de corrida já preenchido para confirmar. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, V = OS.views, n = v => U.num(String(v == null ? '' : v).replace(',', '.')) || 0;
const RL = OS.RunLink = {};
const BASE = () => location.origin + location.pathname;
RL.parse = q => { const p = new URLSearchParams(q), g = k => p.get(k), out = {};
  let km = n(g('km')); if (!km && n(g('metros'))) km = n(g('metros')) / 1000; if (km > 200) km = km / 1000; // veio em metros
  let sec = n(g('seg')) || n(g('segundos')); if (!sec && g('tempo')) sec = U.parseDur(g('tempo')); if (!sec && n(g('min'))) sec = n(g('min')) * 60;
  let d = g('data') || ''; const m = d.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/); if (m) d = `${m[3]}-${U.pad(+m[2])}-${U.pad(+m[1])}`; if (!/^\d{4}-\d{2}-\d{2}/.test(d)) d = U.today(); d = d.slice(0, 10);
  if (km) out.km = U.r2(km); if (sec) out.time = Math.round(sec); if (n(g('bpm'))) out.hr = Math.round(n(g('bpm'))); if (n(g('bpmmax'))) out.hrMax = Math.round(n(g('bpmmax')));
  out.date = d; out.type = g('tipo') || 'Rodagem'; out.kcal = Math.round(n(g('kcal'))) || ''; out.src = 'relogio';
  out.notes = 'Importada do relógio (Aurea Fit → Saúde)' + (out.kcal ? ` · ${out.kcal} kcal` : '');
  return out; };
RL.pace = r => r.km && r.time ? U.mmss(r.time / r.km) + ' /km' : '';
const pending = () => { const h = location.hash; if (!/^#corrida-add/.test(h)) return null; const i = h.indexOf('?'); return RL.parse(i < 0 ? '' : h.slice(i + 1)); };
let todo = null;
const handle = () => { const r = pending(); if (r) { todo = r; history.replaceState(null, '', location.pathname + '#corrida'); }
  if (!todo || (OS.Lock && !OS.Lock.unlocked())) return;
  const x = todo; todo = null;
  const dup = OS.all('runs').find(o => o.date === x.date && Math.abs(n(o.km) - n(x.km)) < .05 && x.km);
  if (dup) { UI.toast(`Esta corrida já está registada (${U.nf(n(dup.km), 2)} km).`, ''); OS.go('corrida'); return; }
  OS.go('corrida');
  setTimeout(() => { UI.openForm('runs', null, x, { title: 'Corrida do relógio — confirma e guarda' }); UI.toast(x.km && x.time ? `Corrida: ${U.nf(x.km, 2)} km · ${U.mmss(x.time)} · ritmo ${RL.pace(x)}` : 'Corrida recebida: completa o que faltar', 'pos'); }, 250); };
addEventListener('hashchange', handle);
OS.on('ready', () => { handle(); const t = setInterval(() => { if (!todo) return clearInterval(t); handle(); }, 800); });
if (/^#corrida-add/.test(location.hash)) { todo = pending(); }

/* ---------- Definições → Atalhos do iPhone: ligar o relógio ---------- */
const step = (i, t, b) => `<div class="ib-s"><i>${i}</i><div><b>${t}</b>${b}</div></div>`;
RL.panel = () => { const ex = BASE() + '#corrida-add?km=5,2&seg=1860&bpm=152&kcal=410';
  return UI.toggle('Ligar o relógio (Aurea Fit → Saúde → Oceanum)', `<div class="ib-steps">
    ${step(1, 'Confirma que o relógio envia a corrida para o Saúde', '<p>App <b>Aurea Fit</b> → definições → <b>Apple Saúde</b> → ativa <b>Treinos</b>, <b>Distância</b>, <b>Frequência cardíaca</b> e <b>Energia ativa</b>. Depois de uma corrida, abre <b>Saúde → Explorar → Atividade → Treinos</b> e vê se aparece a distância.</p>')}
    ${step(2, 'Cria o atalho "Corrida → Oceanum"', `<p>App <b>Atalhos</b> → <b>+</b>. Junta estas ações por ordem:</p><ol class="rl-ol">
      <li><b>Encontrar amostras de saúde</b> → Tipo: <b>Treinos</b> · Ordenar por <b>Data de início</b>, <b>Mais recente primeiro</b> · Limite <b>1</b>.</li>
      <li><b>Obter detalhes de amostras de saúde</b> → <b>Duração</b> (o atalho dá-a em segundos; se aparecer em minutos usa <code>min=</code> em vez de <code>seg=</code>).</li>
      <li>Outra vez <b>Encontrar amostras de saúde</b> → Tipo: <b>Distância (a pé e a correr)</b> · Data de início <b>é hoje</b> → <b>Calcular estatísticas</b> → <b>Soma</b>, em <b>km</b>.</li>
      <li>Opcional: o mesmo para <b>Frequência cardíaca</b> → Estatística <b>Média</b>, e <b>Energia ativa</b> → <b>Soma</b>.</li>
      <li><b>Texto</b>: <code>${U.esc(BASE())}#corrida-add?km=</code>[Soma da distância]<code>&amp;seg=</code>[Duração]<code>&amp;bpm=</code>[Média]<code>&amp;kcal=</code>[Energia]</li>
      <li><b>Abrir URL</b> → o Texto.</li></ol>`)}
    ${step(3, 'Usa depois de correr', '<p>Toca no atalho (ou pede à Siri "Corrida para Oceanum"). A Oceanum abre o registo já preenchido com km, tempo, ritmo e frequência cardíaca: confirma e guarda. Conta logo para os desafios, o calendário de disciplina e as calorias da dieta.</p>')}
    ${step(4, 'Testar já', `<p>Abre este endereço de teste (corrida de 5,2 km em 31 min):</p><div class="row gap8"><a class="btn sm" href="${U.esc(ex)}">Abrir teste</a><button class="btn ghost sm" data-act="rlCopy">Copiar endereço base</button></div>`)}
  </div>`, 'rlink', 'run'); };
A.rlCopy = () => { const t = BASE() + '#corrida-add?km='; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => UI.toast('Endereço copiado', 'pos')).catch(() => UI.toast(t, '')); };
// o guia de ligar o relógio vive em Definições → Atalhos do iPhone (RL.panel); a Corrida só mostra as corridas
})();
