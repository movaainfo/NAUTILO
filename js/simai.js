/* NÁUTILO — Assistente de decisão com IA nos Simuladores.
   Lê o simulador aberto (valores, resultados, regras e taxas ao vivo do país) e a tua situação financeira real,
   e responde: veredicto, porquê, riscos, cenários alternativos (aplicáveis com um toque) e próximos passos.
   Usa a mesma IA da app (Google Gemini com a chave do utilizador). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
const ST = {}; let cur = 'juros';
const cc = () => (OS.Country ? OS.Country.code() : 'PT');
const sk = () => cur + '|' + cc();
const S = () => ST[sk()] || (ST[sk()] = { q: '', busy: false, err: '', ans: null, hist: [] });
const CHIPS = {
  juros: ['Vale a pena investir assim?', 'Quanto devo aportar por mês?', 'Onde ponho este dinheiro no meu país?'],
  emprestimo: ['Devo pedir este crédito?', 'Prestação fixa ou amortização constante?', 'Como pago menos juros?'],
  parcelado: ['Pago à vista ou parcelo?', 'Este desconto à vista compensa?'],
  compra: ['Devo fazer esta compra agora?', 'Quanto tempo devo esperar?', 'Como compro sem estragar as finanças?'],
  meta: ['A meta é realista?', 'Onde guardo este dinheiro até lá?', 'Como chego mais cedo?'],
  independencia: ['Como chego lá mais cedo?', 'A taxa de levantamento é segura?', 'O que priorizo primeiro?'],
  taxas: ['Qual destas opções é melhor para mim?', 'Compensa o risco do investimento mais rentável?'],
  inflacao: ['Como protejo o meu dinheiro da inflação?', 'O meu dinheiro parado está a perder valor?']
};
const r0 = v => v == null || !isFinite(v) ? null : Math.round(v);
const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- o que a IA vê ---------- */
const snapshot = () => { const Fin = OS.Fin, I = OS.Intel, p = OS.one('profile'); let pr = {}; try { pr = I.finProjection() || {}; } catch (e) { }
  const safe = f => { try { return r0(f()); } catch (e) { return null; } };
  return { saldo_disponivel: safe(() => Fin.liquid()), reserva_emergencia: safe(() => Fin.reserve()), meta_reserva: r0(U.num(p.emergencyTarget)) || null,
    receita_media_mensal_3m: safe(() => Fin.avgMonthly(3, 'inc')), despesa_media_mensal_3m: safe(() => Fin.avgMonthly(3, 'exp')), receita_recorrente_mensal: safe(() => Fin.recurIncome()),
    despesas_fixas_mensais: safe(() => Fin.fixedMonthly()), saldo_mensal_medio: r0(pr.monthlyNet), investimentos: safe(() => OS.Inv.value()), dividas: safe(() => Fin.debtsTotal()), cartoes_em_divida: safe(() => Fin.cardDebt()),
    valor_hora: r0(U.num(p.hourly) || 0) || null, metas: (OS.all('goals') || []).filter(g => g.area === 'Finanças' || /€|poup|reserva|invest|dinheiro/i.test(g.title || '')).slice(0, 5).map(g => g.title) };
};
const readSim = () => { const v = document.getElementById('view'); if (!v) return null;
  const inputs = [...v.querySelectorAll('.sim-in [data-sim]')].map(i => { const f = i.closest('.fld'), lab = f && f.querySelector('label'), un = [...(i.parentElement.querySelectorAll('span') || [])].map(s => s.textContent.trim()).join(' ');
    return { campo: i.dataset.sim.split('.')[1], rotulo: lab ? lab.textContent.replace(/ao vivo/i, '').trim() : '', valor: U.num(i.value), unidade: un }; });
  const seg = [...v.querySelectorAll('.sim-in .seg button.on')].map(b => b.textContent.trim());
  const kpis = [...v.querySelectorAll('.sim-out .kpi')].map(k => [k.querySelector('.kpi-l'), k.querySelector('.kpi-v'), k.querySelector('.kpi-s')].map(x => x ? x.textContent.trim() : '').filter(Boolean).join(' · '));
  const notes = [...v.querySelectorAll('.sim-out .note')].map(n => n.textContent.trim());
  const live = [...v.querySelectorAll('.lv-bar .lv-h, .lv-bar .lv-i')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).join(' | ');
  const tab = (v.querySelector('.tabs .on, [role=tab][aria-selected=true]') || {}).textContent || cur;
  return { simulador: tab.trim() || cur, inputs, opcoes_escolhidas: seg, resultados: kpis, notas: notes, taxas_ao_vivo: live };
};
const PROMPT = (q, sim, hist) => { const f = OS.FinCountry ? OS.FinCountry.get() : {}, c = OS.Country ? OS.Country.get()[1] : 'Portugal';
  return `És o assistente financeiro pessoal da app Náutilo. O utilizador (Ryan, brasileiro, vive em Aveiro, Portugal) está a usar um SIMULADOR e quer ajuda para tomar a MELHOR decisão.
Escreve em português de Portugal, direto e concreto, como um amigo que percebe muito de finanças. Usa os números da simulação e da vida real dele; não inventes taxas nem dados que não estão aqui (se faltar algo, diz o que falta). Aplica as regras do país escolhido (${c}: moeda ${f.cur || 'EUR'}, impostos: ${f.taxL || ''}). Lembra que as taxas ao vivo são médias de mercado. Não recomendes produtos de uma empresa específica; fala de tipos de produto. Se a decisão for má para a situação dele (ex.: sem reserva de emergência, dívidas caras, prestação pesada), diz claramente.
PAÍS E REGRAS: ${strip(f.note || '')}
SIMULAÇÃO ATUAL: ${JSON.stringify(sim)}
SITUAÇÃO FINANCEIRA REAL (valores na moeda em que ele regista, null = sem dados): ${JSON.stringify(snapshot())}
${hist.length ? 'CONVERSA ANTERIOR: ' + JSON.stringify(hist.slice(-4)) : ''}
PERGUNTA: ${q}
Responde APENAS com JSON: {"nivel":"bom"|"atencao"|"evitar"|"neutro","veredicto":"uma frase curta com a recomendação","resposta":"2 a 4 frases a explicar a decisão com números","porque":["motivo com número"],"riscos":["risco ou ponto de atenção"],"cenarios":[{"titulo":"nome curto","valores":{"<campo do simulador>":numero},"efeito":"o que muda, com números"}],"passos":["próximo passo prático"],"falta":["informação que ajudaria a decidir melhor"]}
Nos cenários usa SÓ estes campos: ${sim.inputs.map(i => i.campo + ' (' + i.rotulo + ')').join(', ')}. Dá 1 a 3 cenários úteis e realistas. Máximo 4 itens por lista.`; };

/* ---------- pedir à IA ---------- */
A.simAIAsk = async b => { const s = S(); const q = (b && b.dataset.q) || s.q.trim(); if (!q || s.busy) { if (!q) UI.toast('Escreve a tua dúvida ou toca numa sugestão', ''); return; }
  if (!OS.AI || !OS.AI.key()) { s.err = ''; s.needKey = true; OS.request(); return; }
  const sim = readSim(); if (!sim) return; s.busy = true; s.err = ''; s.q = q; OS.request();
  try { const o = await OS.AI.json([{ text: PROMPT(q, sim, s.hist) }], .3);
    const L = x => (Array.isArray(x) ? x : []).map(t => String(t || '').slice(0, 400)).filter(Boolean).slice(0, 4), fields = new Set(sim.inputs.map(i => i.campo));
    const cen = (Array.isArray(o.cenarios) ? o.cenarios : []).slice(0, 3).map(c => ({ titulo: String(c.titulo || 'Cenário').slice(0, 80), efeito: String(c.efeito || '').slice(0, 300), valores: Object.fromEntries(Object.entries(c.valores || {}).filter(([k, v]) => fields.has(k) && isFinite(+v)).map(([k, v]) => [k, +v])) })).filter(c => Object.keys(c.valores).length);
    s.ans = { q, nivel: ['bom', 'atencao', 'evitar', 'neutro'].includes(o.nivel) ? o.nivel : 'neutro', veredicto: String(o.veredicto || '').slice(0, 240), resposta: String(o.resposta || '').slice(0, 1200), porque: L(o.porque), riscos: L(o.riscos), passos: L(o.passos), falta: L(o.falta), cenarios: cen, lab: Object.fromEntries(sim.inputs.map(i => [i.campo, i.rotulo + (i.unidade ? ' (' + i.unidade + ')' : '')])) };
    s.hist.push({ pergunta: q, resposta: s.ans.veredicto + ' ' + s.ans.resposta }); s.q = ''; }
  catch (e) { s.err = e.message || 'A IA não respondeu.'; }
  s.busy = false; OS.request(); };
A.simAIApply = b => { const s = S(), c = s.ans && s.ans.cenarios[+b.dataset.i]; if (!c) return; const v = document.querySelector('#view .sim-in [data-sim]'); if (!v) return;
  const key = 'sim_' + v.dataset.sim.split('.')[0]; OS.setUI(key, Object.assign({}, OS.ui[key] || {}, c.valores)); UI.toast(`Cenário aplicado: ${c.titulo}`, 'pos'); };
A.simAIClear = () => { delete ST[sk()]; OS.request(); };
A.simAIOn = () => { const s = S(); s.needKey = false; UI.toast('IA ligada. Já podes perguntar.', 'pos'); OS.request(); };
document.addEventListener('input', e => { if (e.target.id === 'simAIq') S().q = e.target.value; });
document.addEventListener('keydown', e => { if (e.target.id === 'simAIq' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); A.simAIAsk(); } });

/* ---------- painel ---------- */
const NV = { bom: ['pos', 'Boa decisão'], atencao: ['warn', 'Com cuidado'], evitar: ['neg', 'Melhor evitar'], neutro: ['', 'Depende'] };
const list = (t, a, cls = '') => a.length ? `<div class="sai-l ${cls}"><b>${t}</b><ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
const panel = () => { const s = S(), a = s.ans, nv = a ? NV[a.nivel] : null;
  if (s.needKey && !(OS.AI && OS.AI.key())) return `<div class="pn sim-ai">${OS.AI ? OS.AI.setup('simAIOn') : ''}</div>`;
  return `<div class="pn sim-ai"><div class="sai-h"><span class="sai-ic">${UI.ic('zap')}</span><div><h3>Assistente de decisão</h3><small class="mut">A IA analisa esta simulação, as regras e taxas de ${esc(OS.Country ? OS.Country.get()[1] : 'Portugal')} e as tuas finanças reais, e diz-te qual a melhor decisão.</small></div>${a || s.hist.length ? `<button class="btn xs ghost" data-act="simAIClear">Nova conversa</button>` : ''}</div>
  ${a ? `<div class="sai-a sai-${a.nivel}"><div class="sai-v"><span class="sai-b ${nv[0]}">${nv[1]}</span><b>${esc(a.veredicto)}</b></div><p class="sai-q">“${esc(a.q)}”</p><p>${esc(a.resposta)}</p>
    <div class="sai-g">${list('Porquê', a.porque)}${list('Riscos e cuidados', a.riscos, 'sl-warn')}</div>
    ${a.cenarios.length ? `<div class="sai-c"><b>Cenários para testar</b>${a.cenarios.map((c, i) => `<div class="sai-ci"><div><b>${esc(c.titulo)}</b><small>${esc(Object.entries(c.valores).map(([k, v]) => (a.lab[k] || k) + ': ' + U.nf(v, v % 1 ? 2 : 0)).join(' · '))}${c.efeito ? ' — ' + esc(c.efeito) : ''}</small></div><button class="btn xs" data-act="simAIApply" data-i="${i}">Testar</button></div>`).join('')}</div>` : ''}
    ${list('Próximos passos', a.passos, 'sl-pos')}${list('Para decidir ainda melhor, diz-me', a.falta, 'sl-mut')}</div>` : ''}
  ${s.busy ? `<div class="sai-busy"><div class="fd-spin"></div><span>A analisar a simulação e as tuas finanças…</span></div>` : ''}
  ${s.err ? `<p class="neg">${esc(s.err)}</p>` : ''}
  <div class="sai-chips">${(CHIPS[cur] || []).map(q => `<button class="chip" data-act="simAIAsk" data-q="${esc(q)}" ${s.busy ? 'disabled' : ''}>${esc(q)}</button>`).join('')}</div>
  <div class="row gap8 sai-in"><textarea class="field grow" id="simAIq" rows="2" placeholder="${a ? 'Pergunta mais (ex.: e se eu pagar mais 100 por mês?)' : 'Escreve a tua dúvida (ex.: vale a pena pedir este crédito para comprar carro?)'}">${esc(s.q)}</textarea><button class="btn pri" data-act="simAIAsk" ${s.busy ? 'disabled' : ''}>Perguntar</button></div>
  <small class="mut">A IA ajuda a pensar; a decisão é tua. Não substitui um consultor financeiro certificado.</small></div>`; };
OS.SimAI = { panel, readSim, snapshot };
OS.on('ready', () => { const V = OS.views, base = V.simuladores; if (!base || base._ai) return; V.simuladores = sub => { cur = sub || 'juros'; const h = base(sub); return h + panel(); }; V.simuladores._ai = 1; });
})();
