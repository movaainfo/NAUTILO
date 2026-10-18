/* NÁUTILO — Assistente de investimentos com IA.
   Não é "adivinhar": a IA (Gemini, chave do utilizador) é condicionada por
   1) um REGULAMENTO de princípios de investimento baseados em evidência (diversificação, custos, horizonte, reserva, risco, impostos);
   2) o teu PERFIL de investidor (questionário de adequação) e a tua POLÍTICA de investimento;
   3) FACTOS calculados pelo Náutilo (carteira ao vivo, rentabilidade, risco, alocação, finanças pessoais, taxas e regras do país) — a IA não inventa números;
   4) pesquisa web com fontes (opcional, para ativos e notícias);
   5) uma SEGUNDA PASSAGEM que verifica a resposta contra o regulamento e os factos, e corrige o que estiver fora. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc, Inv = OS.Inv, IX = OS.InvX;
const n = v => U.num(v) || 0;
const cfg = () => OS.one('invcfg');
const cc = () => (OS.Country ? OS.Country.code() : 'PT');
const IA = OS.InvAI = {};

/* ================= perfil de investidor (adequação) ================= */
const QS = [
  ['obj', 'Qual é o principal objetivo deste dinheiro?', [['Proteger o que tenho', 0], ['Rendimento regular (dividendos/juros)', 1], ['Crescer o património a longo prazo', 2], ['Crescimento máximo, aceito muito risco', 3]]],
  ['hor', 'Quando vais precisar da maior parte deste dinheiro?', [['Menos de 2 anos', 0], ['2 a 5 anos', 1], ['5 a 10 anos', 2], ['Mais de 10 anos', 3]]],
  ['queda', 'A carteira cai 25% num ano. O que fazes?', [['Vendo tudo para não perder mais', 0], ['Vendo uma parte', 1], ['Não mexo e espero', 2], ['Aproveito e compro mais', 3]]],
  ['exp', 'Que experiência tens a investir?', [['Nenhuma', 0], ['Depósitos / renda fixa', 1], ['Fundos e ETFs', 2], ['Ações, cripto ou derivados há anos', 3]]],
  ['res', 'Tens reserva de emergência (3–6 meses de despesas)?', [['Não', 0], ['Menos de 3 meses', 1], ['3 a 6 meses', 2], ['Mais de 6 meses', 3]]],
  ['rend', 'O teu rendimento é…', [['Instável / sem rendimento', 0], ['Variável', 1], ['Estável', 2], ['Estável e com folga grande', 3]]],
  ['perda', 'Qual a maior perda temporária que aguentas sem perder o sono?', [['5%', 0], ['15%', 1], ['30%', 2], ['50% ou mais', 3]]]];
const PERFIS = [[0, 7, 'Conservador', 'Proteger capital: maioria em renda fixa e liquidez.', 'Conservador'], [8, 12, 'Moderado', 'Equilíbrio entre segurança e crescimento.', 'Moderado'], [13, 17, 'Arrojado', 'Crescimento de longo prazo; aceita quedas grandes.', 'Arrojado'], [18, 21, 'Agressivo', 'Crescimento máximo; risco muito alto.', 'Arrojado']];
let QZ = null;
const quiz = () => `<div class="pn ia-quiz"><div class="pn-h"><h3>Perfil de investidor</h3><button class="icon-btn" data-act="iaQuiz" aria-label="Fechar">${UI.ic('x')}</button></div><p class="mut" style="margin:0 0 10px;font-size:13px">7 perguntas. A IA respeita sempre o teu perfil (é a mesma lógica da "adequação" que os bancos são obrigados a fazer).</p>
  ${QS.map(([k, q, o], i) => `<div class="ia-q"><b>${i + 1}. ${q}</b><div class="ia-o">${o.map(([l, v]) => `<button class="chip ${QZ[k] === v ? 'on' : ''}" data-act="iaAns" data-k="${k}" data-v="${v}">${esc(l)}</button>`).join('')}</div></div>`).join('')}
  <button class="btn pri" data-act="iaQuizSave" ${Object.keys(QZ).length < QS.length ? 'disabled' : ''}>Ver o meu perfil</button></div>`;
A.iaQuiz = () => { QZ = QZ ? null : Object.assign({}, (cfg().perfil || {}).ans || {}); OS.request(); };
A.iaAns = b => { QZ[b.dataset.k] = +b.dataset.v; OS.request(); };
A.iaQuizSave = () => { let s = U.sum(Object.values(QZ), x => x); if (QZ.hor === 0) s = Math.min(s, 7); if (QZ.res === 0) s = Math.min(s, 12); const p = PERFIS.find(x => s >= x[0] && s <= x[1]) || PERFIS[1];
  cfg().perfil = { nome: p[2], desc: p[3], score: s, ans: Object.assign({}, QZ), at: U.today(), modelo: p[4] }; if (!Object.keys(cfg().tgt || {}).length) cfg().tgt = Object.assign({}, { Conservador: { 'Renda fixa': 70, ETFs: 20, 'Ações': 5, 'Ouro e commodities': 5 }, Moderado: { 'Renda fixa': 40, ETFs: 40, 'Ações': 10, 'Fundos imobiliários': 5, Cripto: 5 }, Arrojado: { 'Renda fixa': 15, ETFs: 55, 'Ações': 20, 'Fundos imobiliários': 5, Cripto: 5 } }[p[4]]);
  OS.touch('invcfg'); QZ = null; UI.toast('Perfil: ' + p[2], 'pos'); };

/* ================= política de investimento ================= */
OS.ONE_DEF.invcfg.ipsr = { maxAtivo: 15, maxCripto: 5, aporte: 0, horizonte: 10, objetivo: '', evitar: '' };
const ips = () => Object.assign({ maxAtivo: 15, maxCripto: 5, aporte: 0, horizonte: 10, objetivo: '', evitar: '' }, cfg().ipsr || {});

/* ================= regulamento (o "condicionamento") ================= */
const RULES = `REGULAMENTO DE INVESTIMENTO DO NÁUTILO (obrigatório; baseado em evidência académica e nas boas práticas de aconselhamento):
R1 Prioridades: primeiro reserva de emergência (3–6 meses de despesas, em produto líquido e seguro), depois eliminar dívidas caras (cartão, crédito pessoal), só depois investir com risco.
R2 Núcleo e satélite: o núcleo deve ser diversificado globalmente e barato (ETFs de índice com TER baixo, ex.: mundo/S&P 500/obrigações); ações individuais, setores, temas e cripto são satélite (tipicamente ≤ 20–30% no total).
R3 Concentração: nenhum ativo individual acima do limite da política do utilizador (ETF global diversificado é exceção); nenhum setor/país dominante sem justificação.
R4 Cripto e especulação: limitar ao máximo da política; nunca dinheiro necessário em menos de 5 anos; nada de alavancagem, opções, day trade ou produtos complexos para perfis não Agressivos.
R5 Horizonte: dinheiro necessário em < 3 anos vai para renda fixa/curto prazo, não para ações.
R6 Não adivinhar o mercado: preferir aportes regulares (custo médio), rebalancear quando o desvio ao alvo > 5 p.p. ou 1–2× por ano; não vender em pânico.
R7 Custos, câmbio e impostos contam: comparar comissões e TER, evitar rotação excessiva; aplicar as regras do país (PT: 28% sobre mais-valias/juros, cripto isenta >365 dias, PPR; BR: IR regressivo na renda fixa, isenção de vendas de ações até R$ 20 mil/mês, FII 20%, LCI/LCA isentas).
R8 Moeda: quem gasta em EUR (ou BRL) deve ter a renda fixa e a reserva nessa moeda; risco cambial nas ações é aceitável a longo prazo.
R9 Honestidade: nunca prometer retornos; falar em cenários e intervalos; distinguir FACTOS (fornecidos) de OPINIÃO; se faltar informação, dizer qual.
R10 Números: usar APENAS números dos FACTOS ou cálculos explícitos sobre eles; não inventar cotações, P/L, dividendos ou notícias. Notícias só com fonte da pesquisa.
R11 Perfil e política mandam: respeitar o perfil de investidor e a política; se o pedido do utilizador os contrariar, avisar claramente e propor alternativa compatível.
R12 Ativos individuais: avaliar papel na carteira (diversificação, risco, peso), volatilidade e histórico fornecidos, riscos do negócio/setor; nunca "compra garantida".
R13 Sem conflito de interesses: não recomendar corretoras, bancos ou produtos de marca específica como melhores; falar de tipos de produto e critérios de escolha (o utilizador pode nomear os seus).
R14 Linguagem: português de Portugal, claro, direto, com números concretos e próximos passos práticos.`;

/* ================= factos calculados pelo Náutilo ================= */
const r2 = v => v == null || !isFinite(v) ? null : Math.round(v * 100) / 100;
const pc = v => v == null || !isFinite(v) ? null : Math.round(v * 1000) / 10;
IA.facts = (extra = {}) => { const S = IX.summary(), val = S.val || 0, H = IX.health(S), h = IX.hcache, m = h ? IX.metrics(h) : null, Fin = OS.Fin, p = cfg().perfil, pol = ips(), tg = cfg().tgt || {};
  const GRP = c => ({ 'Ação': 'Ações', BDR: 'Ações', ETF: 'ETFs', FII: 'Fundos imobiliários', REIT: 'Fundos imobiliários', Fundo: 'Fundos', PPR: 'Reforma', 'Previdência': 'Reforma', Cripto: 'Cripto', Commodity: 'Ouro e commodities', Ouro: 'Ouro e commodities', 'Imóvel': 'Imóveis' }[c] || (OS.L.RFC.includes(c) || c === 'Obrigação' ? 'Renda fixa' : 'Outros'));
  const alloc = {}; S.P.forEach(x => { const g = GRP(x.a.cls); alloc[g] = (alloc[g] || 0) + x.value; });
  const safe = f => { try { return r2(f()); } catch (e) { return null; } };
  const L2 = OS.LiveRates && OS.LiveRates.vals(cc()), F2 = OS.FinCountry ? OS.FinCountry.get() : {};
  const idx = IX.INDICES(cc()).map(([s, l]) => { const q = IX.q(s); return q ? { indice: l, valor: r2(q.p), dia_pct: q.pc ? pc(q.p / q.pc - 1) : null } : null; }).filter(Boolean);
  return Object.assign({
    data: U.today(), pais: OS.Country ? OS.Country.get()[1] : 'Portugal', moeda_base: 'EUR',
    perfil_investidor: p ? { perfil: p.nome, descricao: p.desc, respostas: p.ans } : 'NÃO DEFINIDO (recomenda fazer o questionário)',
    politica_investimento: { max_por_ativo_pct: pol.maxAtivo, max_cripto_pct: pol.maxCripto, aporte_mensal: pol.aporte || null, horizonte_anos: pol.horizonte, objetivo: pol.objetivo || null, evitar: pol.evitar || null, alocacao_alvo_pct: tg },
    carteira: { valor_total_eur: r2(val), aplicado_eur: r2(S.cost), lucro_eur: r2(S.pl), lucro_pct: pc(S.ret), variacao_hoje_eur: r2(S.day), variacao_hoje_pct: pc(S.dayPct), proventos_12m_eur: r2(S.divs12), yield_12m_pct: val ? pc(S.divs12 / val) : null, realizado_vendas_eur: r2(S.realized), n_ativos: S.P.length },
    alocacao_atual_pct: Object.fromEntries(Object.entries(alloc).map(([k, v]) => [k, pc(v / (val || 1))])),
    posicoes: U.sortBy(S.P, x => x.value, -1).slice(0, 30).map(x => ({ ticker: x.a.ticker || x.a.sym || x.a.name, nome: x.a.name, classe: x.a.cls, moeda: x.a.currency || 'EUR', pais: x.a.country || null, setor: x.a.sector || null, valor_eur: r2(x.value), peso_pct: pc(x.value / (val || 1)), rent_pct: pc(x.ret), lucro_eur: r2(x.pl), dia_pct: x.live && x.live.pc ? pc(x.dayPct) : null, proventos_eur: r2(x.divs), renda_fixa: x.rf ? { indexador: x.a.idx, taxa: n(x.a.rate), vencimento: x.a.venc || null, liquido_estimado_eur: r2(x.net) } : undefined, cotacao_ao_vivo: !!x.live, vendido: x.short || undefined, alavancagem: x.lev ? r2(x.lev) : undefined, exposicao_eur: x.lev || x.a.cls === 'Opção' ? r2(x.exposure) : undefined })),
    rentabilidade: m ? { total_pct: pc(m.tot), anual_pct: m.years >= .9 ? pc(m.ann) : null, tir_pct: pc(m.xirr), volatilidade_anual_pct: pc(m.vol), sharpe: r2(m.sharpe), queda_maxima_pct: pc(m.mdd), meses_positivos: m.pos + '/' + m.nm, anos: r2(m.years) } : 'histórico ainda não calculado',
    risco: (() => { try { const r = IX.hcache ? IX.risk(IX.hcache, IX._rb) : null; return r ? { nota_risco_1a7: r.sri, perfil_maximo: p ? ({ Conservador: 3, Moderado: 4, Arrojado: 5, Agressivo: 6 })[p.nome] : null, volatilidade_anual_pct: pc(r.vol), var95_1mes_eur: r2(r.var21e), cvar_1mes_eur: r2(r.cvar21e), queda_maxima_pct: pc(r.mdd), queda_atual_pct: pc(r.curDD), beta: r2(r.beta), rácio_diversificacao: r2(r.divRatio), liquidez_imediata_pct: pc(r.liq), stress: r.stress.map(x => ({ cenario: x.nm, perda_pct: pc(x.pct), perda_eur: r2(x.loss) })), contribuicao_risco: r.assets.slice(0, 8).map(x => ({ ativo: x.a.ticker || x.a.name, peso_pct: pc(x.w), parte_do_risco_pct: pc(x.rc), volatilidade_pct: pc(x.vol) })) } : 'histórico ainda não calculado'; } catch (e) { return null; } })(),
    saude_carteira: { pontuacao_0_100: H.score, verificacoes: H.items.map(i => (i.ok ? 'OK: ' : 'FALHA: ') + i.t), diversificacao_efetiva_ativos: r2(H.eff), maior_posicao_pct: pc(H.top), cripto_pct: pc(H.cryptoW) },
    financas_pessoais: { reserva_emergencia: safe(() => Fin.reserve()), despesa_media_mensal: safe(() => Fin.avgMonthly(3, 'exp')), receita_media_mensal: safe(() => Fin.avgMonthly(3, 'inc')), saldo_mensal_medio: safe(() => OS.Intel.finProjection().monthlyNet), dividas: safe(() => Fin.debtsTotal()), cartoes_em_divida: safe(() => Fin.cardDebt()), disponivel_em_contas: safe(() => Fin.liquid()) },
    regras_do_pais: { impostos: F2.taxL || null, nota: String(F2.note || '').replace(/<[^>]+>/g, '') },
    taxas_ao_vivo: L2 ? { inflacao_pct: L2.inf ? L2.inf.v : null, deposito_ou_cdi_pct: L2.dep ? L2.dep.v : null, credito_pct: L2.loan ? L2.loan.v : null, selic: L2.raw && L2.raw.selic ? L2.raw.selic.v : undefined } : null,
    mercado_hoje: idx
  }, extra); };

/* ================= chamadas à IA ================= */
// modelos descobertos com a tua chave; se o Google não der, a IA grátis de reserva responde (sem pesquisa na web)
const raw = async (body) => { const key = OS.AI && OS.AI.key(); let last = '';
  if (key) { await OS.AI.discover(); for (const m of OS.AI.gemini()) { try { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({}));
      if (!r.ok) { const msg = (j.error && j.error.message) || ''; if (/API key not valid|API_KEY_INVALID/i.test(msg)) throw Object.assign(new Error('A chave da IA não é válida.'), { fatal: 1 }); if (r.status === 429) { OS.AI.markLimit(m, msg); last = 'limite'; continue; } if (OS.AI.isDead(r.status, msg)) { OS.AI.markDead(m); last = 'modelo desligado'; continue; } last = msg || 'erro ' + r.status; continue; }
      return j; } catch (e) { if (e.fatal) throw e; last = e.message; } } }
  // reserva grátis: converte o pedido (texto) para a IA aberta e devolve no mesmo formato do Google
  if (OS.AI.freeOn() && !(body.contents || []).some(c => (c.parts || []).some(p => p.inline_data))) { try { const txt = (body.contents || []).map(c => (c.parts || []).map(p => p.text || '').join('\n')).join('\n'), sys = body.systemInstruction ? (body.systemInstruction.parts || []).map(p => p.text || '').join('\n') : '';
      const m = await OS.AI.free([sys ? { role: 'system', content: sys } : null, { role: 'user', content: txt }].filter(Boolean), { temp: (body.generationConfig || {}).temperature, json: (body.generationConfig || {}).responseMimeType === 'application/json' });
      return { candidates: [{ content: { parts: [{ text: String(m.content || '') }] } }] }; } catch (e) { last = e.message; } }
  if (!key && !OS.AI.freeOn()) throw Object.assign(new Error('A IA não está ligada.'), { fatal: 1 });
  throw new Error('A IA não respondeu (' + last + ').'); };
const textOf = j => ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('');
const parseJ = t => { t = String(t || '').replace(/^```(json)?/m, '').replace(/```\s*$/m, '').trim(); const i = t.indexOf('{'), k = t.lastIndexOf('}'); return JSON.parse(i >= 0 ? t.slice(i, k + 1) : t); };
/* pesquisa na web com fontes (Google Search do Gemini) */
IA.research = async q => { try { const j = await raw({ contents: [{ parts: [{ text: `Pesquisa informação RECENTE e FACTUAL (últimos 12 meses) para ajudar a responder: "${q}". Resume em português de Portugal, em tópicos curtos: factos do negócio/setor, resultados recentes, notícias relevantes, riscos conhecidos e, se existirem, métricas de avaliação publicadas (P/L, dividend yield, TER de ETFs). Indica a data de cada facto. Não dês recomendação.` }] }], tools: [{ google_search: {} }], generationConfig: { temperature: .1 } });
    const g = ((j.candidates || [])[0] || {}).groundingMetadata || {}, src = (g.groundingChunks || []).map(c => c.web && { t: c.web.title, u: c.web.uri }).filter(Boolean).slice(0, 8); return { txt: textOf(j).slice(0, 6000), src }; } catch (e) { if (e.fatal) throw e; return null; } };
const SCHEMA = `{"nivel":"bom"|"atencao"|"evitar"|"neutro","veredicto":"uma frase com a conclusão principal","resposta":"3 a 6 frases com o raciocínio e números dos FACTOS","recomendacoes":[{"acao":"aportar"|"comprar"|"manter"|"reduzir"|"vender"|"evitar"|"estudar"|"definir","alvo":"ativo, classe ou tema","valor_eur":numero ou null,"porque":"motivo curto com número","mestres":["mestres que sustentam esta recomendação"]}],"riscos":["…"],"passos":["próximo passo prático"],"regras_aplicadas":["R1 …"],"mestres":[{"nome":"nome do mestre","ideia":"como o princípio dele se aplica AQUI, com número"}],"divergencia":"onde os mestres discordam neste caso e porque escolheste o lado que escolheste (ou null)","vies":"viés comportamental que detetas no pedido ou na carteira (ex.: medo de perder, excesso de confiança, ancoragem, FOMO) ou null","confianca":"alta"|"media"|"baixa","dados_em_falta":["…"]}`;
IA.ask = async (q, opt = {}) => { const facts = IA.facts(opt.extra || {}); let research = null;
  if (opt.web) research = await IA.research(q + (opt.asset ? ' — ativo ' + opt.asset : ''));
  const hist = (IA.hist || []).slice(-4);
  const WZ = OS.InvWisdom, lens = opt.lens && opt.lens.length ? opt.lens : null;
  const p1 = `És o assistente de investimentos pessoal da app Náutilo para o Ryan (brasileiro, vive em Aveiro, Portugal). Raciocinas como um conselho formado pelos maiores investidores e pensadores de todos os tempos e segues RIGOROSAMENTE o regulamento.\n${RULES}\n\n${WZ ? WZ.prompt(lens) + '\n' + WZ.CONSENSO : ''}\nCOMO RACIOCINAR: aplica o regulamento primeiro; depois passa a situação pelas lentes dos mestres${lens ? ' escolhidos pelo utilizador' : ' mais relevantes para o pedido (3 a 5)'}; quando concordam, segue o consenso; quando discordam, explica a divergência e escolhe o lado que melhor serve o perfil e a política do utilizador; identifica vieses comportamentais (Kahneman, Housel). Cada recomendação diz que mestres a sustentam.\n\nFACTOS (calculados pelo Náutilo agora; valores em EUR salvo indicação; null = sem dados):\n${JSON.stringify(facts)}\n${research ? `\nPESQUISA WEB RECENTE (com fontes; usa só o que for relevante e cita a fonte pelo nome):\n${research.txt}\nFONTES: ${research.src.map(s => s.t).join('; ')}\n` : ''}${hist.length ? '\nCONVERSA ANTERIOR: ' + JSON.stringify(hist) : ''}\n\nPEDIDO: ${q}\n\nPensa passo a passo em privado (prioridades R1 → perfil → alocação → risco → custos/impostos) e responde APENAS com JSON: ${SCHEMA}\nMáximo 5 itens por lista. Valores em euros com base nos FACTOS.`;
  const d1 = parseJ(textOf(await raw({ contents: [{ parts: [{ text: p1 }] }], generationConfig: { temperature: .2, responseMimeType: 'application/json' } })));
  let ver = null, final = d1;
  try { const p2 = `És o VERIFICADOR de conformidade de um conselho de investimento. Compara a RESPOSTA com o REGULAMENTO, os FACTOS e os princípios dos mestres.\n${RULES}\n${WZ ? WZ.CONSENSO : ''}\nFACTOS: ${JSON.stringify(facts)}\nRESPOSTA A VERIFICAR: ${JSON.stringify(d1)}\nVerifica: (a) números que não existem nos FACTOS nem resultam de contas simples; (b) violações do regulamento (ex.: recomendar risco sem reserva de emergência, ultrapassar limites da política, ignorar o perfil, prometer retorno, recomendar marca específica); (c) contradições internas; (d) falta de avisos importantes; (e) recomendações que contrariam o consenso dos mestres sem explicar porquê, ou mestres citados com ideias que não são deles.\nResponde APENAS com JSON: {"aprovado":true|false,"problemas":["…"],"resposta_corrigida": <mesmo formato da RESPOSTA, já corrigida; se aprovado, repete-a>}`;
    ver = parseJ(textOf(await raw({ contents: [{ parts: [{ text: p2 }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } })));
    if (ver && ver.resposta_corrigida && ver.resposta_corrigida.veredicto) final = ver.resposta_corrigida; } catch (e) { if (e.fatal) throw e; ver = null; }
  return { q, at: new Date().toISOString(), ans: clean(final), ver: ver ? { ok: !!ver.aprovado, prob: (ver.problemas || []).map(String).slice(0, 5) } : null, src: research ? research.src : [], guard: guard(facts) }; };
const S5 = x => (Array.isArray(x) ? x : []).map(t => typeof t === 'string' ? t.slice(0, 400) : t).filter(Boolean).slice(0, 5);
const clean = o => ({ nivel: ['bom', 'atencao', 'evitar', 'neutro'].includes(o.nivel) ? o.nivel : 'neutro', veredicto: String(o.veredicto || '').slice(0, 260), resposta: String(o.resposta || '').slice(0, 2000), recomendacoes: S5(o.recomendacoes).filter(r => r && typeof r === 'object').map(r => ({ acao: String(r.acao || '').slice(0, 20), alvo: String(r.alvo || '').slice(0, 80), valor: isFinite(+r.valor_eur) && r.valor_eur != null ? +r.valor_eur : null, porque: String(r.porque || '').slice(0, 300), m: (Array.isArray(r.mestres) ? r.mestres : []).map(String).slice(0, 4) })), riscos: S5(o.riscos).map(String), passos: S5(o.passos).map(String), regras: S5(o.regras_aplicadas).map(String), mestres: S5(o.mestres).filter(x => x && typeof x === 'object').map(x => ({ nome: String(x.nome || '').slice(0, 60), ideia: String(x.ideia || '').slice(0, 400) })), div: o.divergencia ? String(o.divergencia).slice(0, 600) : '', vies: o.vies ? String(o.vies).slice(0, 300) : '', conf: ['alta', 'media', 'média', 'baixa'].includes(o.confianca) ? o.confianca.replace('média', 'media') : 'media', falta: S5(o.dados_em_falta).map(String) });
/* travões fixos (não dependem da IA): aparecem sempre por cima da resposta */
const guard = f => { const g = [], fp = f.financas_pessoais || {};
  if (fp.despesa_media_mensal && (fp.reserva_emergencia || 0) < fp.despesa_media_mensal * 3) g.push(`Reserva de emergência abaixo de 3 meses de despesas (${U.nf(fp.reserva_emergencia || 0)} € para ${U.nf(fp.despesa_media_mensal * 3)} €): completa-a antes de aumentar o risco (R1).`);
  if ((fp.cartoes_em_divida || 0) > 0 || (fp.dividas || 0) > 0) g.push(`Tens dívidas registadas (${U.nf((fp.cartoes_em_divida || 0) + (fp.dividas || 0))} €): pagar dívida cara é um retorno garantido (R1).`);
  const pol = f.politica_investimento || {}; (f.posicoes || []).forEach(p => { if (p.peso_pct > pol.max_por_ativo_pct && p.classe !== 'ETF' && !p.renda_fixa) g.push(`${p.ticker} pesa ${p.peso_pct}% (limite da tua política: ${pol.max_por_ativo_pct}%) (R3).`); });
  if (f.saude_carteira && f.saude_carteira.cripto_pct > pol.max_cripto_pct) g.push(`Cripto em ${f.saude_carteira.cripto_pct}% (limite: ${pol.max_cripto_pct}%) (R4).`);
  if (typeof f.perfil_investidor === 'string') g.push('Ainda não definiste o perfil de investidor: as respostas ficam mais genéricas.');
  return g.slice(0, 5); };

/* ================= ecrã ================= */
const ST = { busy: false, err: '', res: cfg && null, q: '', amt: '' };
IA.hist = [];
const ACTS = [['diag', 'Diagnóstico completo da carteira', 'Faz um diagnóstico completo da minha carteira: pontos fortes, fracos, riscos, se está adequada ao meu perfil e o que mudar por ordem de prioridade.'],
  ['aporte', 'Onde investir este mês', 'Tenho {amt} € para investir este mês. Onde devo pôr este dinheiro, em que proporção e porquê?'],
  ['rebal', 'Preciso de rebalancear?', 'A minha carteira precisa de rebalanceamento face ao alvo? Diz o que comprar (sem vender, se possível) e quanto.'],
  ['risco', 'Quanto risco estou a correr?', 'Analisa o risco da minha carteira: volatilidade, queda máxima, concentração, câmbio e cripto. Está adequado ao meu perfil?'],
  ['renda', 'Plano de renda passiva', 'Faz um plano para chegar à minha meta de renda passiva mensal com proventos: que tipo de ativos, quanto aportar e quanto tempo.'],
  ['conselho', 'Conselho dos mestres', 'Reúne o conselho dos mestres sobre a minha carteira e a minha situação: cada mestre relevante dá a sua opinião concreta (em "mestres"), mostra onde discordam e termina com uma síntese do que eu devo fazer.'],
  ['mercado', 'O que se passa no mercado?', 'Resume o que está a acontecer nos mercados hoje e se isso muda alguma coisa na minha estratégia (sem market timing).']];
IA.view = () => { const p = cfg().perfil, pol = ips(), S = IX.summary(), H = IX.health(S), r = ST.res || cfg().lastAI, has = OS.AI && OS.AI.key();
  if (OS.ui.invAIq && !ST.q) { ST.q = OS.ui.invAIq; OS.ui.invAIq = ''; }
  return `${QZ ? quiz() : ''}
  <div class="g g3 ia-top"><div class="pn"><div class="pn-h"><h3>Perfil</h3><button class="btn xs ghost" data-act="iaQuiz">${p ? 'Refazer' : 'Fazer questionário'}</button></div>${p ? `<div class="ia-pf"><b>${esc(p.nome)}</b><small class="mut">${esc(p.desc)}</small><small class="mut">definido a ${U.fmtD(p.at)}</small></div>` : '<p class="mut" style="font-size:13px">Responde a 7 perguntas para a IA saber quanto risco é certo para ti.</p>'}</div>
    <div class="pn"><div class="pn-h"><h3>A tua política</h3></div><div class="ia-pol">
      <label>Máx. por ativo<div class="inp-wrap"><input type="number" data-bind="invcfg.ipsr.maxAtivo" data-fk="ipsA" value="${pol.maxAtivo}"><span>%</span></div></label>
      <label>Máx. cripto<div class="inp-wrap"><input type="number" data-bind="invcfg.ipsr.maxCripto" data-fk="ipsC" value="${pol.maxCripto}"><span>%</span></div></label>
      <label>Aporte mensal<div class="inp-wrap"><input type="number" data-bind="invcfg.ipsr.aporte" data-fk="ipsP" value="${pol.aporte || ''}"><span>€</span></div></label>
      <label>Horizonte<div class="inp-wrap"><input type="number" data-bind="invcfg.ipsr.horizonte" data-fk="ipsH" value="${pol.horizonte}"><span>anos</span></div></label>
      <label class="w2">Objetivo<input class="field" data-bind="invcfg.ipsr.objetivo" data-fk="ipsO" value="${esc(pol.objetivo)}" placeholder="ex.: 100 mil € aos 35 / renda de 1 000 €/mês"></label>
      <label class="w2">Não quero<input class="field" data-bind="invcfg.ipsr.evitar" data-fk="ipsE" value="${esc(pol.evitar)}" placeholder="ex.: tabaco, alavancagem, ações individuais"></label></div></div>
    <div class="pn"><div class="pn-h"><h3>Saúde da carteira</h3></div><div class="ih-top"><div class="ih-score ${H.score >= 75 ? 'pos' : H.score >= 50 ? 'warn' : 'neg'}"><b>${H.score}</b><small>/100</small></div><div class="ih-l">${H.items.slice(0, 4).map(i => `<div class="${i.ok ? 'pos' : i.w ? 'warn' : 'neg'}">${i.ok ? '✓' : '!'} ${esc(i.t)}</div>`).join('')}</div></div></div></div>
  <div class="pn ia-main"><div class="sai-h"><span class="sai-ic">${UI.ic('zap')}</span><div><h3>Assistente de investimentos</h3><small class="mut">Raciocina como um conselho dos maiores investidores e pensadores (Buffett, Munger, Graham, Bogle, Lynch, Dalio, Marks, Taleb, Kahneman, Barsi, os estoicos…), dentro de um regulamento de investimento, do teu perfil e política, e com factos calculados pelo Náutilo. Cada resposta é verificada por uma segunda passagem.</small></div></div>
    ${!has ? (OS.AI ? OS.AI.setup('iaOn') : '') : `
    <div class="sai-chips">${ACTS.map(([k, l]) => `<button class="chip" data-act="iaGo" data-k="${k}" ${ST.busy ? 'disabled' : ''}>${esc(l)}</button>`).join('')}</div>
    <div class="row gap8" style="align-items:center;flex-wrap:wrap"><span class="mut" style="font-size:12.5px">Valor para "onde investir":</span><div class="inp-wrap" style="width:150px"><span>€</span><input type="number" id="iaAmt" value="${esc(ST.amt || pol.aporte || '')}" placeholder="500" aria-label="Valor a investir"></div>
      <label class="row gap6" style="font-size:12.5px"><input type="checkbox" id="iaWeb" ${OS.ui.iaWeb !== false ? 'checked' : ''}> pesquisar na web (notícias e dados recentes, com fontes)</label></div>
    <div class="ia-lens"><span class="mut" style="font-size:12.5px">Pensar como:</span><button class="chip ${!(OS.ui.iaLens || []).length ? 'on' : ''}" data-act="iaLens" data-id="">Todos os mestres</button>${(OS.InvWisdom ? OS.InvWisdom.MESTRES : []).filter(m => ['buffett', 'munger', 'graham', 'bogle', 'lynch', 'dalio', 'marks', 'taleb', 'barsi', 'housel'].includes(m.id) || (OS.ui.iaLens || []).includes(m.id)).map(m => `<button class="chip ${(OS.ui.iaLens || []).includes(m.id) ? 'on' : ''}" data-act="iaLens" data-id="${m.id}">${esc(m.curto || m.nome.split(' ').slice(-1)[0])}</button>`).join('')}</div>
    <div class="row gap8 sai-in"><textarea class="field grow" id="iaQ" rows="2" placeholder="Pergunta o que quiseres (ex.: vale a pena comprar VWCE ou S&P 500? Devo vender a Apple? Tesouro IPCA ou CDB?)">${esc(ST.q)}</textarea><button class="btn pri" data-act="iaGo" ${ST.busy ? 'disabled' : ''}>Perguntar</button></div>`}
    ${ST.busy ? `<div class="sai-busy"><div class="fd-spin"></div><span>${esc(ST.busy)}</span></div>` : ''}${ST.err ? `<p class="neg">${esc(ST.err)}</p>` : ''}
    ${r ? answer(r) : ''}
    ${OS.InvWisdom ? UI.toggle(`Biblioteca dos mestres (${OS.InvWisdom.MESTRES.length}) — os princípios que a IA usa`, `<p class="mut" style="font-size:12.5px;margin:0 0 8px">Toca num mestre para a IA pensar como ele. Resumos por palavras nossas das ideias centrais de cada um.</p>${OS.InvWisdom.view(OS.ui.iaLens || [])}`, 'iaLib', 'book') : ''}
    <small class="mut">Transparência: é o Gemini (Google) a raciocinar com o regulamento, a biblioteca dos mestres, o teu perfil e os factos do Náutilo, verificado por uma segunda passagem. Não é um modelo re-treinado de raiz nem um consultor certificado; serve para decidires melhor, e a decisão é tua.</small></div>`; };
A.iaLens = b => { const id = b.dataset.id, cur = OS.ui.iaLens || []; OS.setUI('iaLens', !id ? [] : cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]); };
const NV = { bom: ['pos', 'Boa direção'], atencao: ['warn', 'Com cuidado'], evitar: ['neg', 'Evitar'], neutro: ['', 'Depende'] };
const AC = { aportar: 'pos', comprar: 'pos', manter: '', reduzir: 'warn', vender: 'neg', evitar: 'neg', estudar: '', definir: '' };
const answer = r => { const a = r.ans, nv = NV[a.nivel] || NV.neutro;
  return `<div class="sai-a sai-${a.nivel}">${r.guard && r.guard.length ? `<div class="ia-guard"><b>${UI.ic('shield')}Regras do Náutilo (sempre ativas)</b>${r.guard.map(g => `<div>• ${esc(g)}</div>`).join('')}</div>` : ''}
    <div class="sai-v"><span class="sai-b ${nv[0]}">${nv[1]}</span><b>${esc(a.veredicto)}</b></div><p class="sai-q">“${esc(r.q)}” · ${new Date(r.at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p><p>${esc(a.resposta)}</p>
    ${a.recomendacoes.length ? `<div class="ia-rec">${a.recomendacoes.map(x => `<div class="ia-r"><span class="bdg ${AC[x.acao] || ''}">${esc(x.acao)}</span><b>${esc(x.alvo)}</b>${x.valor != null ? `<span class="mono">${IX.M(x.valor, { dec: 0 })}</span>` : '<span></span>'}<small>${esc(x.porque)}${x.m && x.m.length ? ` <i class="ia-rm">— ${x.m.map(esc).join(', ')}</i>` : ''}</small></div>`).join('')}</div>` : ''}
    ${a.mestres && a.mestres.length ? `<div class="ia-ms"><b>${UI.ic('book')}O que diriam os mestres</b>${a.mestres.map(x => `<div class="ia-m"><span>${esc(x.nome)}</span><small>${esc(x.ideia)}</small></div>`).join('')}</div>` : ''}
    ${a.div ? `<div class="note"><b>Onde discordam:</b> ${esc(a.div)}</div>` : ''}${a.vies ? `<div class="note"><b>Atenção ao comportamento:</b> ${esc(a.vies)}</div>` : ''}
    <div class="sai-g">${lst('Riscos', a.riscos, 'sl-warn')}${lst('Próximos passos', a.passos, 'sl-pos')}</div>
    ${a.falta.length ? lst('Para responder melhor precisava de', a.falta, 'sl-mut') : ''}
    <div class="ia-meta">${r.ver ? (r.ver.ok ? `<span class="bdg pos">✓ verificado em 2 passos</span>` : `<span class="bdg warn">corrigido pelo verificador</span>`) : '<span class="bdg">não verificado</span>'}<span class="bdg">confiança ${esc(a.conf === 'media' ? 'média' : a.conf)}</span>${a.regras.length ? `<span class="mut">regras: ${a.regras.map(x => esc(String(x).slice(0, 3).trim())).join(' ')}</span>` : ''}</div>
    ${r.ver && !r.ver.ok && r.ver.prob.length ? `<details class="tog"><summary>O que o verificador corrigiu</summary><ul>${r.ver.prob.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
    ${r.src && r.src.length ? `<div class="ia-src"><b>Fontes da pesquisa</b>${r.src.map(s => `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t || s.u)}</a>`).join('')}</div>` : ''}</div>`; };
IA.render = r => answer(r);
IA.raw = raw; IA.textOf = textOf; IA.parseJ = parseJ;
const lst = (t, a, c) => a.length ? `<div class="sai-l ${c}"><b>${t}</b><ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
document.addEventListener('input', e => { if (e.target.id === 'iaQ') ST.q = e.target.value; if (e.target.id === 'iaAmt') ST.amt = e.target.value; });
document.addEventListener('change', e => { if (e.target.id === 'iaWeb') OS.ui.iaWeb = e.target.checked; });
A.iaOn = () => { UI.toast('IA ligada.', 'pos'); OS.request(); };
A.iaGo = async b => { if (ST.busy) return; const k = b && b.dataset.k, act = ACTS.find(x => x[0] === k); let q = act ? act[2] : ST.q.trim(); const amt = n(ST.amt || ips().aporte);
  if (!q) { UI.toast('Escreve a tua pergunta ou escolhe uma ação', ''); return; } if (/\{amt\}/.test(q)) { if (!amt) { UI.toast('Indica primeiro o valor a investir', 'warn'); document.getElementById('iaAmt') && document.getElementById('iaAmt').focus(); return; } q = q.replace('{amt}', U.nf(amt)); }
  const web = OS.ui.iaWeb !== false && (k === 'mercado' || !k), asset = (q.match(/\b([A-Z0-9]{2,6}(?:\.[A-Z]{1,2}|-EUR|-USD)?)\b/) || [])[1];
  const extra = {}; if (k === 'aporte' || k === 'rebal') { const plan = (() => { try { const S = IX.summary(), tg = cfg().tgt || {}, keys = Object.keys(tg).filter(x => n(tg[x])); return keys.length ? { alvo: tg, valor: amt || 0 } : null; } catch (e) { return null; } })(); extra.calculo_rebalanceamento = plan; }
  if (asset && IX.q(asset)) { const qq = IX.q(asset); extra.ativo_em_analise = { simbolo: asset, nome: qq.nm, preco: qq.p, moeda: qq.cur, dia_pct: qq.pc ? pc(qq.p / qq.pc - 1) : null, min52: qq.l52, max52: qq.h52, bolsa: qq.ex }; }
  ST.busy = web ? 'A pesquisar na web e a analisar a tua carteira…' : 'A analisar a tua carteira…'; ST.err = ''; OS.request();
  try { setTimeout(() => { if (ST.busy) { ST.busy = 'A verificar a resposta contra o regulamento…'; OS.request(); } }, 9000);
    const r = await IA.ask(q, { web, asset, extra, lens: OS.ui.iaLens || [] }); ST.res = r; cfg().lastAI = r; OS.touch('invcfg'); IA.hist.push({ pergunta: q, resposta: r.ans.veredicto }); if (!act) ST.q = ''; }
  catch (e) { ST.err = e.message || 'A IA não respondeu.'; }
  ST.busy = false; OS.request(); };
})();
