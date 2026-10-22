/* NÁUTILO — Sono: as noites que o app Saúde do iPhone regista (relógio, iPhone ou outra app ligada ao Saúde), ou registadas à mão.
   Como a app não pode ler o Saúde diretamente, um atalho do iPhone (automação "Ao acordar") lê a "Análise do sono" e envia-a:
   - numa conta: para o link do perfil (fica na caixa da conta e entra sozinho, sem abrir a app);
   - em qualquer modo: abrindo o endereço …/#sono-add?s=<as amostras>.
   Cada amostra chega como "Valor|Início|Fim" (uma por linha). Juntamos as amostras por noite e guardamos uma noite por dia (o dia em que acordaste). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act = OS.act || {}, V = OS.views;
if (UI.IP && !UI.IP.moon) UI.IP.moon = 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z';
OS.S.sleep = { label: 'Noite de sono', title: r => 'Sono · ' + U.fmtD(r.date), fields: [
  { k: 'date', l: 'Dia em que acordaste', t: 'date', req: 1 }, { k: 'bedT', l: 'Adormeci', t: 'time' }, { k: 'wakeT', l: 'Acordei', t: 'time' },
  { k: 'q', l: 'Como dormiste', t: 'sel', o: ['', '1 · muito mal', '2 · mal', '3 · normal', '4 · bem', '5 · muito bem'] }, { k: 'notes', l: 'Notas (sonhos, acordei a meio, cafeína…)', t: 'area', rows: 2 }],
  defaults: () => ({ date: U.today(), src: 'manual' }),
  // registo à mão: as horas dão a duração
  after: r => { if (r.src !== 'saude' && r.bedT && r.wakeT) { let m = U.t2m(r.wakeT) - U.t2m(r.bedT); if (m <= 0) m += 1440; if (r.min !== m) OS.upd('sleep', r.id, { min: m, inBed: m, src: 'manual' }, { silent: true }); } } };
const target = () => (U.num(OS.one('profile').sleepH) || 8) * 60;

/* ---------- leitura das amostras do Saúde ---------- */
const stageOf = v => { const s = String(v || '').toLowerCase();
  if (/cama|in ?bed|inbed/.test(s)) return 'cama'; if (/acord|awake|despert/.test(s)) return 'acordado'; if (/profund|deep/.test(s)) return 'profundo';
  if (/\brem\b/.test(s)) return 'rem'; if (/essencial|principal|n[uú]cleo|core|leve|light/.test(s)) return 'leve'; if (/dorm|asleep|sono|sleep/.test(s)) return 'dormir'; return ''; };
const when = s => { s = String(s || '').trim(); if (!s) return NaN; let t = Date.parse(s); if (!isNaN(t)) return t;
  // 22/10/2026, 23:14 · 22/10/26 23:14 · 2026-10-22 23:14
  let m = s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})[ ,àsT]*(\d{1,2}):(\d{2})/); if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(y, +m[2] - 1, +m[1], +m[4], +m[5]).getTime(); }
  m = s.match(/(\d{4})-(\d{2})-(\d{2})[ T]+(\d{1,2}):(\d{2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime(); return NaN; };
const parse = txt => String(txt || '').split(/\r?\n|;;/).map(l => l.split('|')).filter(p => p.length >= 3).map(([v, a, b]) => ({ st: stageOf(v), a: when(a), b: when(b) })).filter(x => x.st && x.a < x.b && x.b - x.a < 20 * 36e5);
// minutos cobertos por um conjunto de intervalos (sem contar duas vezes o que se sobrepõe)
const cover = L => { const s = L.map(x => [x.a, x.b]).sort((p, q) => p[0] - q[0]); let tot = 0, ca = -1, cb = -1; s.forEach(([a, b]) => { if (a > cb) { if (cb > ca) tot += cb - ca; ca = a; cb = b; } else if (b > cb) cb = b; }); if (cb > ca) tot += cb - ca; return Math.round(tot / 6e4); };
const ASLEEP = ['profundo', 'rem', 'leve', 'dormir'];
// agrupa por noite (intervalos a menos de 4 h uns dos outros) e resume cada noite
const nights = S => { const L = S.slice().sort((p, q) => p.a - q.a), out = []; let g = [];
  L.forEach(x => { if (g.length && x.a - Math.max(...g.map(y => y.b)) > 4 * 36e5) { out.push(g); g = []; } g.push(x); }); if (g.length) out.push(g);
  return out.map(g => { const sl = g.filter(x => ASLEEP.includes(x.st)); if (!sl.length) return null;
    const bed = Math.min(...sl.map(x => x.a)), wake = Math.max(...sl.map(x => x.b)), min = cover(sl), inB = g.filter(x => x.st === 'cama'), d = new Date(wake);
    const by = k => cover(g.filter(x => x.st === k && x.b > bed && x.a < wake).map(x => ({ a: Math.max(x.a, bed), b: Math.min(x.b, wake) })));
    return { date: U.iso(d), bed: new Date(bed).toISOString(), wake: new Date(wake).toISOString(), bedT: U.hm(new Date(bed)), wakeT: U.hm(d), min,
      profundo: by('profundo'), rem: by('rem'), leve: by('leve') + by('dormir'), acordado: by('acordado'), inBed: inB.length ? cover(inB) : Math.round((wake - bed) / 6e4), src: 'saude' }; }).filter(n => n && n.min >= 60); };
// guarda (uma noite por dia; a mais longa ganha se chegarem duas para o mesmo dia)
const save = n => { const old = OS.all('sleep').find(r => r.date === n.date); if (old) { if (old.src === 'saude' && (old.min || 0) > n.min + 5) return old; return OS.upd('sleep', old.id, n, { silent: true }); } return OS.add('sleep', n, { silent: true }); };
const Sono = OS.Sono = {};
Sono.ingest = txt => { const N = nights(parse(txt)); N.forEach(save); if (N.length) { OS.emit('change', 'sleep'); OS.request(); } return N; };
Sono.list = () => U.sortBy(OS.all('sleep').filter(r => r.date && (r.min || 0) > 0), r => r.date).reverse();
const hm = m => { m = Math.round(m || 0); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + U.pad(m % 60) : ''); };
const avg = L => L.length ? U.avg(L, r => r.min) : 0;
// consistência: quanto varia a hora de adormecer (minutos de desvio)
const spread = L => { const v = L.filter(r => r.bedT).map(r => { let m = U.t2m(r.bedT); if (m < 12 * 60) m += 1440; return m; }); if (v.length < 3) return null; const a = U.avg(v); return Math.round(Math.sqrt(U.avg(v, x => (x - a) * (x - a)))); };
Sono.stats = () => { const L = Sono.list(), t = U.today(), w = L.filter(r => r.date > U.addDays(t, -7)), last = L[0] || null, T = target();
  return { last, week: w, avg7: avg(w), avg30: avg(L.filter(r => r.date > U.addDays(t, -30))), debt: Math.round(w.reduce((s, r) => s + Math.max(0, T - r.min), 0)), spread: spread(w), T, n: L.length }; };

/* ---------- no Painel ---------- */
const COL = { profundo: '#3B6FD6', rem: '#9A8CF5', leve: '#7FB8E8', acordado: '#F2B544' };
const stages = r => { const tot = (r.profundo || 0) + (r.rem || 0) + (r.leve || 0) + (r.acordado || 0); if (!tot) return '';
  return `<div class="sl-bar" role="img" aria-label="Fases do sono">${['profundo', 'rem', 'leve', 'acordado'].map(k => r[k] ? `<i style="flex:${r[k]};background:${COL[k]}" title="${k} ${hm(r[k])}"></i>` : '').join('')}</div>
    <div class="sl-leg">${[['profundo', 'Profundo'], ['rem', 'REM'], ['leve', 'Leve'], ['acordado', 'Acordado']].filter(([k]) => r[k]).map(([k, l]) => `<span><i style="background:${COL[k]}"></i>${l} <b class="mono">${hm(r[k])}</b></span>`).join('')}</div>`; };
const week = (S) => { const t = U.today(), days = U.range(U.addDays(t, -6), t), mx = Math.max(S.T, ...S.week.map(r => r.min));
  return `<div class="sl-wk">${days.map(d => { const r = OS.all('sleep').find(x => x.date === d); const h = r ? Math.round(r.min / mx * 100) : 0;
    return `<div class="sl-d ${r && r.min >= S.T - 15 ? 'ok' : ''}" title="${U.fmtDS(d)}${r ? ': ' + hm(r.min) : ''}"><i style="height:${Math.max(r ? 6 : 0, h)}%"></i><small>${U.WDS[U.parse(d).getDay()].slice(0, 1)}</small></div>`; }).join('')}<span class="sl-tg" style="bottom:${Math.round(S.T / mx * 100)}%"></span></div>`; };
Sono.card = card => { const S = Sono.stats(), r = S.last;
  if (!r) return card('Sono', `<p class="dc-sub" style="margin:0 0 10px">As tuas noites do app Saúde aparecem aqui: quanto dormiste, as fases (profundo, REM, leve) e a semana.</p><div class="row gap8" style="flex-wrap:wrap"><button class="btn sm pri" data-act="setGo" data-tab="atalhos" data-id="slSet">Ligar ao app Saúde</button><button class="btn sm" data-act="slAdd">Registar à mão</button></div>`, { cls: 'span4' });
  const dif = r.min - S.T, ago = U.diff(U.today(), r.date);
  return card('Sono', `<div class="sl-top"><div><div class="dc-big">${hm(r.min)}</div><div class="dc-sub">${ago === 0 ? 'esta noite' : ago === 1 ? 'ontem' : U.fmtDS(r.date)}${r.bedT && r.wakeT ? ` · ${esc(r.bedT)} → ${esc(r.wakeT)}` : ''} · <span class="${dif >= -15 ? 'pos' : 'neg'}">${dif >= 0 ? '+' : '−'}${hm(Math.abs(dif))} da meta</span></div></div>${r.q ? `<span class="sl-q">${esc(String(r.q).slice(0, 1))}/5</span>` : ''}</div>
    ${stages(r)}${week(S)}
    <div class="dc-rows"><div><span>Média dos 7 dias</span><b class="mono">${hm(S.avg7)}</b></div><div><span>Dívida de sono (7 dias)</span><b class="mono ${S.debt > 120 ? 'neg' : ''}">${hm(S.debt)}</b></div>${S.spread != null ? `<div><span>Hora de adormecer</span><b class="mono">± ${S.spread} min</b></div>` : ''}</div>`,
    { cls: 'span8', act: `<button class="btn sm ghost" data-act="slMore">Ver as noites</button>` }); };

/* ---------- detalhe, registo e o atalho ---------- */
const tip = S => { const r = S.last; if (!r) return '';
  if (S.debt > 300) return 'Estás com mais de 5 horas de sono em falta esta semana: deita-te 30–45 min mais cedo nas próximas noites.';
  if (S.spread != null && S.spread > 60) return 'A hora a que adormeces varia mais de uma hora: um horário fixo (mesmo ao fim de semana) melhora a qualidade do sono.';
  if (r.profundo && r.min && r.profundo / r.min < .1) return 'Pouco sono profundo: evita ecrãs, cafeína e treino intenso nas 2–3 horas antes de deitar.';
  if (r.min >= S.T - 15) return 'Dormiste o que precisas. Mantém o mesmo horário.'; return 'Tenta chegar às ' + hm(S.T) + ': deita-te um pouco mais cedo hoje.'; };
A.slMore = () => { const S = Sono.stats(), L = Sono.list().slice(0, 21);
  UI.modal(`<div style="padding:18px"><div class="row between"><h3 style="margin:0">O teu sono</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <p class="mut" style="margin:6px 0 12px">${esc(tip(S))}</p>
    <div class="dc-rows"><div><span>Média 7 dias</span><b class="mono">${hm(S.avg7)}</b></div><div><span>Média 30 dias</span><b class="mono">${hm(S.avg30)}</b></div><div><span>Meta</span><b class="mono">${hm(S.T)}</b></div></div>
    <div class="sl-list">${L.map(r => `<div class="sl-row" data-edit="sleep:${r.id}"><div><b>${U.fmtDS(r.date)}</b><small class="mut">${r.bedT ? esc(r.bedT) + ' → ' + esc(r.wakeT || '') : ''}${r.src === 'saude' ? ' · Saúde' : ' · à mão'}</small></div><b class="mono ${r.min >= S.T - 15 ? 'pos' : ''}">${hm(r.min)}</b>${stages(r)}</div>`).join('') || '<p class="mut">Sem noites registadas.</p>'}</div>
    <div class="row gap8" style="margin-top:12px"><button class="btn" data-act="slAdd">Registar à mão</button><button class="btn ghost" data-act="setGo" data-tab="atalhos" data-id="slSet" data-mclose>Ligar ao app Saúde</button></div></div>`, 'sl-modal'); };
A.slAdd = () => { UI.closeModal(); UI.openForm('sleep'); };
// …/#sono-add?s=… (o atalho abre a app com as amostras)
const fromHash = () => { const h = location.hash; if (!/^#sono-add/.test(h)) return; const q = new URLSearchParams(h.split('?')[1] || ''), s = q.get('s') || '';
  try { history.replaceState(null, '', location.pathname + location.search + '#visao'); } catch (e) { } OS.request();
  const N = Sono.ingest(s); setTimeout(() => UI.toast(N.length ? `Sono do app Saúde: ${N.map(n => hm(n.min)).join(', ')} registado` : 'Não encontrei noites nas amostras do Saúde.', N.length ? 'pos' : 'warn'), 600); };
OS.on('ready', () => setTimeout(fromHash, 300)); addEventListener('hashchange', fromHash);
// instruções do atalho (Definições › Atalhos do iPhone)
Sono.panel = link => `<div class="pn" id="slSet"><div class="pn-h"><h3>${UI.ic('moon')}Sono do app Saúde</h3><span class="mut">${OS.all('sleep').length ? OS.all('sleep').length + ' noites' : ''}</span></div>
  <p class="mut" style="margin:0 0 12px">Todas as manhãs o iPhone envia a noite (do relógio, do iPhone ou de outra app ligada ao Saúde) e ela aparece no Painel, com as fases do sono.</p>
  <div class="ib-w"><div class="ib-s"><i>1</i><div><b>Criar a automação</b><p>App <b>Atalhos</b> → <b>Automação</b> → <b>+</b> → <b>Despertar</b> (ou <b>Hora do dia</b>, 9:00) → <b>Executar imediatamente</b> → <b>Novo atalho</b>.</p></div></div>
    <div class="ib-s"><i>2</i><div><b>Ler o sono (3 ações)</b><div class="ib-sc"><div><b>1 · Encontrar amostras de saúde</b> → Tipo: <b>Análise do sono</b> → Data de início: <b>nos últimos 2 dias</b>.</div><div><b>2 · Repetir com cada</b> → lá dentro <b>Texto</b>: <code>Valor|Data de início|Data de fim</code> (toca em cada data e escolhe o formato <b>ISO 8601</b>).</div><div><b>3 · Combinar texto</b> (Repetir resultados) com <b>Nova linha</b>.</div></div></div></div>
    <div class="ib-s"><i>3</i><div><b>Enviar para o Náutilo</b>${link ? `<p><b>Obter conteúdo do URL</b> → cola o link abaixo → Método <b>POST</b> → Corpo <b>Formulário</b> → campo <code>s</code> = <b>Texto combinado</b>. Fica registado sem abrir a app.</p><div class="ib-link"><code>${esc(link)}</code><button class="btn sm pri" data-act="slCopy" data-l="${esc(link)}">Copiar link</button></div>`
      : `<p><b>Abrir URL</b> → <code>${esc(location.origin + location.pathname)}#sono-add?s=</code> seguido do <b>Texto combinado</b> (Codificar URL). A app abre e regista a noite.</p>`}</div></div></div>
  <div class="row gap8" style="margin-top:10px"><button class="btn sm" data-act="slAdd">Registar uma noite à mão</button></div></div>`;
A.slCopy = async b => { try { await navigator.clipboard.writeText(b.dataset.l); UI.toast('Link copiado: cola-o no atalho', 'pos'); } catch (e) { UI.toast('Toca no link, seleciona e copia', 'warn'); } };
})();
