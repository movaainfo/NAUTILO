/* PRUMO — cérebro do Spyke: um agente que pensa e age.
   Recebe o pedido, decide o que precisa (consultar os teus dados, pesquisar na internet, criar uma tarefa, um compromisso, um gasto…),
   usa as ferramentas e responde em poucas frases para ser dito em voz alta.
   Dois cérebros:
   - Gemini (grátis, com a chave do Google): chamadas de função + pesquisa Google;
   - Claude (opcional, pago, com a tua chave da Anthropic): SDK oficial carregado só quando o escolhes (vendor/anthropic-sdk.min.js),
     com a pesquisa web da Anthropic e recurso automático a outro modelo se um pedido for recusado. */
(() => {
'use strict';
const U = OS.U;
const B = OS.Brain = {};
const cfg = () => Object.assign({}, OS.ONE_DEF.spyke, OS.one('spyke'));
const who = () => OS.one('profile').short || OS.who();
const today = () => U.today();
const cut = (o, n = 6000) => { const s = typeof o === 'string' ? o : JSON.stringify(o); return s.length > n ? s.slice(0, n) + '…' : s; };
const safe = f => { try { return f(); } catch (e) { return null; } };

/* ---------- o que o Spyke consegue consultar ---------- */
const AREAS = ['agenda', 'tarefas', 'financas', 'habitos', 'universidade', 'investimentos', 'emails', 'noticias', 'clima', 'metas', 'treino', 'pessoas', 'decisoes', 'memoria', 'trabalho', 'proximos_passos', 'projetos', 'desporto', 'dieta', 'foco', 'fe', 'leitura', 'evolucao'];
const consult = async area => { const t = today(), F = OS.Fin;
  switch (area) {
    case 'agenda': return safe(() => OS.Cal.items(t, U.addDays(t, 14)).filter(x => x.src !== 'bill').slice(0, 60).map(x => ({ dia: x.date, hora: x.start || '', fim: x.end || '', titulo: x.title, tipo: x.src, feito: !!x.done })));
    case 'tarefas': return safe(() => U.sortBy(OS.Tasks.open(), x => (+x.prio || 3) + (x.due || '9')).slice(0, 40).map(x => ({ titulo: x.title, prazo: x.due || '', planeada: x.sched || '', prioridade: x.prio || '', projeto: (OS.get('projects', x.project) || {}).name || '', atrasada: OS.Tasks.late(x) })));
    case 'financas': return safe(() => { const m = F.month(U.ym(t)); return { disponivel: U.r2(F.liquid()), reserva: U.r2(F.reserve()), mes: { receitas: U.r2(m.inc), despesas: U.r2(m.exp), saldo: U.r2(m.net) }, por_categoria: F.byCat(U.ym(t) + '-01', t).slice(0, 10), a_pagar_14_dias: F.upcoming(14).filter(x => x.amount < 0).slice(0, 15).map(x => ({ dia: x.date, o_que: x.title, valor: U.r2(-x.amount), atraso: !!x.late })), dividas: U.r2(F.debtsTotal()), patrimonio: U.r2(F.netWorth()) }; });
    case 'habitos': return safe(() => OS.all('habits').filter(h => h.active).map(h => ({ nome: h.name, hoje: OS.Hab.due(h, t) ? (OS.Hab.done(h, t) ? 'feito' : 'por fazer') : 'não é hoje', sequencia: OS.Hab.streak(h), inegociavel: !!h.core })));
    case 'universidade': return safe(() => ({ media: OS.St.gpa(), disciplinas: OS.St.current().map(s => { const x = OS.St.stats(s); return { nome: s.name, media: x.avg, horas: x.hours, situacao: x.sit[0] }; }), avaliacoes: U.sortBy(OS.all('assessments').filter(a => a.date >= t), a => a.date).slice(0, 12).map(a => ({ dia: a.date, tipo: a.type, titulo: a.title, disciplina: (OS.get('subjects', a.subject) || {}).name || '', peso: a.weight, preparacao: a.prep || 'Não comecei' })), revisoes_hoje: OS.St.revDue().length }));
    case 'investimentos': return safe(() => { const I = OS.Inv, R = OS.InvX && OS.InvX.realEstate ? safe(() => OS.InvX.realEstate()) : null; return { valor_total: U.r2(I.value()), investido: U.r2(I.cost()), resultado: U.r2(I.value() - I.cost()), proventos_12_meses: U.r2(I.divs(U.addDays(t, -365), t)), imoveis: R ? { valor: U.r2(R.val), credito: U.r2(R.loanOut) } : null,
      ativos: U.sortBy(OS.all('assets').map(a => ({ a, p: I.pos(a) })).filter(x => x.p.qty), x => -x.p.value).slice(0, 30).map(({ a, p }) => ({ nome: a.name || a.ticker, ticker: a.ticker || a.sym || '', classe: a.cls || '', moeda: a.currency || 'EUR', valor_eur: U.r2(p.value), resultado_pct: Math.round(p.ret * 1000) / 10, setor: a.sector || '', pais: a.country || '' })) }; });
    case 'emails': return safe(() => OS.Mail ? { resumo: OS.Mail.sum ? OS.Mail.sum() : '', itens: OS.Mail.items().slice(0, 15).map(m => ({ de: m.f, assunto: m.s, categoria: m.c, trecho: String(m.sn || '').slice(0, 160), nao_lido: !!m.u })), faculdade_outlook: OS.UniMail ? OS.UniMail.summary() : [] } : 'O e-mail não está ligado.');
    case 'noticias': try { return OS.News && OS.News.headlines ? await OS.News.headlines(8) : []; } catch (e) { return 'Sem notícias agora.'; }
    case 'clima': try { const w = OS.Weather && await OS.Weather.get(); return w && w.now ? OS.Weather.say(w, 0) + ' ' + OS.Weather.say(w, 1) : 'Sem dados do clima.'; } catch (e) { return 'Sem dados do clima.'; }
    case 'proximos_passos': return safe(() => { const { out } = OS.LifePlan.build(); return Object.fromEntries(Object.entries(out).map(([k, L]) => [k, L.slice(0, 12).map(x => ({ nivel: ['', 'hoje', 'esta semana', 'este mês', 'este ano', 'longo prazo'][x.lv], passo: x.t, porque: x.why || '' }))])); }, {});
    case 'metas': return safe(() => OS.all('goals').filter(g => g.status === 'Ativa').map(g => { const i = OS.Goal.info(g); return { meta: g.title, progresso: Math.round(i.p * 100) + '%', estado: i.st[0], prazo: g.due || '' }; }));
    case 'treino': return safe(() => ({ divisao: OS.one('fit').split, hoje: OS.one('fit').split[String(new Date().getDay())] || '', ultimos: U.sortBy(OS.all('workouts'), w => w.date).slice(-5).map(w => ({ dia: w.date, treino: w.title })), corridas: U.sortBy(OS.all('runs'), r => r.date).slice(-5).map(r => ({ dia: r.date, km: r.km })) }));
    case 'pessoas': return safe(() => OS.all('people').slice(0, 60).map(p => ({ nome: p.name, relacao: p.rel || '', aniversario: p.birthday || '', proximidade: p.close || '' })));
    case 'decisoes': return safe(() => OS.all('decisions').filter(d => d.status === 'Em análise').map(d => ({ decisao: d.title, alternativas: (d.alts || []).map(a => a.name), analise: d.ai && d.ai.r ? d.ai.r.resumo : '' })));
    case 'memoria': return safe(() => OS.all('spymem').map(m => m.text));
    case 'trabalho': return safe(() => { const S = OS.all('shifts'), ym = U.ym(t), M = S.filter(s => U.ym(s.date) === ym); return { horas_trabalhadas_mes: U.r1(U.sum(M, s => OS.Car.workedHours(s))), horas_marcadas_mes: U.r1(U.sum(M, OS.Car.shiftHours)), turnos: U.sortBy(S.filter(s => s.date >= t), s => s.date + s.start).slice(0, 14).map(s => ({ dia: s.date, inicio: s.start, fim: s.end, local: s.place || '' })), folgas: U.sortBy(OS.all('dayoffs').filter(o => o.date >= t), o => o.date).slice(0, 10).map(o => ({ dia: o.date, tipo: o.kind || 'Folga' })) }; });
    case 'projetos': return safe(() => OS.all('projects').filter(p => !['Concluído', 'Cancelado'].includes(p.status)).map(p => { const i = OS.Proj.info(p); return { projeto: p.name, estado: p.status, progresso: Math.round(i.prog * 100) + '%', prazo: p.due || '', tarefas_abertas: i.open.length, atrasado: !!i.late }; }));
    case 'desporto': return safe(() => ({ desportos: OS.all('sports').map(s => s.name || s.cat || ''), ultimas_praticas: U.sortBy(OS.all('sportlog'), x => x.date).slice(-10).map(x => ({ dia: x.date, desporto: (OS.get('sports', x.sport) || {}).name || '', tipo: x.kind || '', minutos: x.mins || '', resultado: x.res || '', marcador: x.score || '' })), corridas: U.sortBy(OS.all('runs'), r => r.date).slice(-5).map(r => ({ dia: r.date, km: r.km, tempo: r.time })) }));
    case 'dieta': return safe(() => { const o = OS.one('diet'), D = OS.Diet && OS.Diet.day ? OS.Diet.day : null; if (!D) return 'A dieta não está disponível.'; const d0 = D(t), L = U.range(U.addDays(t, -6), t).map(D).filter(x => x.n); return { metas: { kcal: o.kcal || '', proteina: o.p || '' }, hoje: { refeicoes: d0.n, kcal: Math.round(d0.kcal), proteina: Math.round(d0.p), agua: d0.water }, media_7_dias: L.length ? { kcal: Math.round(U.avg(L, x => x.kcal)), proteina: Math.round(U.avg(L, x => x.p)), dias_registados: L.length } : null }; });
    case 'foco': return safe(() => { const T = OS.all('trees'), wk = U.addDays(t, -6); return { minutos_hoje: U.sum(T.filter(x => x.date === t && x.alive !== false), x => U.num(x.mins)), minutos_7_dias: U.sum(T.filter(x => x.date >= wk && x.alive !== false), x => U.num(x.mins)), arvores_vivas: T.filter(x => x.alive !== false).length, arvores_mortas: T.filter(x => x.alive === false).length, blocos_de_foco_7_dias: OS.all('focusblocks').filter(x => x.date >= wk).map(x => ({ dia: x.date, tema: x.theme || '', minutos: x.minutes || '', resolvidas: x.done || 0 })) }; });
    case 'fe': return safe(() => ({ devocionais_30_dias: OS.all('devos').filter(x => x.date >= U.addDays(t, -29)).length, ultimo_devocional: (U.sortBy(OS.all('devos'), x => x.date).slice(-1)[0] || {}).date || '', pedidos_de_oracao: OS.all('prayers').filter(x => !x.answered && x.status !== 'Respondida').slice(0, 15).map(x => x.title) }));
    case 'leitura': return safe(() => ({ a_ler: OS.all('books').filter(b => b.status === 'A ler').map(b => ({ livro: b.title, autor: b.author || '', pagina: b.curPage || '', paginas: b.pages || '' })), lidos_este_ano: OS.all('books').filter(b => b.status === 'Lido' && (b.end || '').slice(0, 4) === t.slice(0, 4)).map(b => b.title), quero_ler: OS.all('books').filter(b => /Quero|Lista/i.test(b.status || '')).slice(0, 10).map(b => b.title) }));
    case 'evolucao': return safe(() => ({ tendencias: OS.Intel.insights().slice(0, 10).map(x => x.text), metricas: OS.Intel.metrics.filter(m => !m.off && (!m.has || m.has())).map(m => { const v = OS.Intel.compare(m); return { metrica: m.l, hoje: v[0] == null ? null : m.fmt(v[0]), ha_30_dias: v[1] == null ? null : m.fmt(v[1]), ha_1_ano: v[3] == null ? null : m.fmt(v[3]) }; }) }));
    default: return 'Área desconhecida. Usa uma destas: ' + AREAS.join(', ');
  } };

/* ---------- procurar em toda a app ---------- */
const nrm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const SKIPK = new Set(['id', '_c', '_u', '_s', 'pic', 'cover', 'img', 'photo', 'data', 'b64']);
const brief1 = (c, r) => { const S = OS.S[c] || {}, o = { area: S.label || c }; try { o.titulo = S.title ? String(S.title(r)).slice(0, 120) : r.title || r.name || ''; } catch (e) { o.titulo = r.title || r.name || ''; }
  Object.keys(r).forEach(k => { if (SKIPK.has(k) || k === 'title' || k === 'name') return; const v = r[k]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) return; if (typeof v === 'object' && !Array.isArray(v)) return;
    const f = (S.fields || []).find(x => x.k === k); let val = Array.isArray(v) ? v.slice(0, 8).join(', ') : v; if (f && f.t === 'rel' && typeof v === 'string') { const t = OS.get(f.c, v); if (t) val = t.name || t.title || v; } else if (typeof v === 'string' && /^[a-z0-9]{8,14}$/.test(v) && !/\d{4}-/.test(v)) { const hit = ['subjects', 'projects', 'goals', 'accounts', 'assets', 'sports', 'people'].map(cc => OS.get(cc, v)).find(Boolean); if (hit) val = hit.name || hit.title || v; }
    o[(f && f.l) || k] = String(val).slice(0, 300); }); return o; };
const findAll = q => { const w = nrm(q).split(/\s+/).filter(x => x.length > 1); if (!w.length) return 'Diz o que procurar.'; const out = [];
  Object.keys(OS.D || {}).forEach(c => { if (!Array.isArray(OS.D[c]) || /^(snapshots|reports|files)$/.test(c)) return; OS.D[c].forEach(r => { if (!r || typeof r !== 'object') return; const txt = nrm(Object.keys(r).filter(k => !SKIPK.has(k)).map(k => typeof r[k] === 'object' ? JSON.stringify(r[k]).slice(0, 400) : r[k]).join(' '));
    const hit = w.filter(x => txt.includes(x)).length; if (hit === w.length || (w.length > 2 && hit >= w.length - 1)) out.push([hit, r.date || r.due || r.doneAt || '', c, r]); }); });
  try { const m = OS.one('me') || {}, Q = {}; try { (OS.Me && OS.Me.qList ? OS.Me.qList() : []).forEach(q => { Q[q.id] = q.q || q.t || q.text; }); } catch (e) { } Object.entries(m.qa || {}).forEach(([k, v]) => { const t = nrm(v) + ' ' + nrm(Q[k]); if (w.every(x => t.includes(x))) out.push([w.length, '', 'biografia', { pergunta: Q[k] || k, resposta: String(v).slice(0, 600) }]); }); } catch (e) { }
  if (!out.length) return 'Não encontrei nada na app com "' + q + '".';
  return JSON.stringify(out.sort((a, b) => b[0] - a[0] || String(b[1]).localeCompare(String(a[1]))).slice(0, 30).map(([, , c, r]) => c === 'biografia' ? Object.assign({ area: 'Biografia (entrevista)' }, r) : brief1(c, r))); };
const readArea = (c, n) => { const k = Object.keys(OS.D || {}).find(x => x === c) || Object.keys(OS.S).find(x => nrm((OS.S[x] || {}).label) === nrm(c)); if (!k || !Array.isArray(OS.D[k])) return 'Área desconhecida. Existem: ' + Object.keys(OS.D || {}).filter(x => Array.isArray(OS.D[x]) && OS.D[x].length).join(', ');
  const L = U.sortBy(OS.D[k], r => r.date || r.due || r.doneAt || (r._c ? new Date(r._c).toISOString() : ''), -1).slice(0, Math.min(60, Math.max(1, n)));
  return JSON.stringify({ area: (OS.S[k] || {}).label || k, total: OS.D[k].length, registos: L.map(r => brief1(k, r)) }); };
B.findAll = findAll; B.readArea = readArea;

/* ---------- ferramentas (as mesmas para os dois cérebros) ---------- */
const did = [];   // o que o Spyke fez nesta resposta (aparece no ecrã)
const T = [
  { name: 'consultar', description: 'Lê os dados atuais do PRUMO numa área (agenda, tarefas, finanças, hábitos, universidade, investimentos, e-mails, notícias, clima, metas, treino, pessoas, decisões, memória, trabalho, projetos, desporto, dieta, foco/Floresta, fé, leitura, evolução). Usa sempre antes de responder sobre dados dele.', props: { area: { type: 'string', enum: AREAS, description: 'A área a consultar' } }, req: ['area'],
    run: async a => cut(await consult(a.area)) },
  { name: 'criar_tarefa', description: 'Cria uma tarefa na lista dele. Só quando ele pede para anotar, lembrar ou criar uma tarefa.', props: { titulo: { type: 'string' }, data: { type: 'string', description: 'AAAA-MM-DD, opcional' }, prioridade: { type: 'integer', description: '1 (crítica) a 4 (baixa), opcional' } }, req: ['titulo'],
    run: a => { const o = OS.Tasks.quickParse(String(a.titulo).slice(0, 200)); o.status = 'Próxima'; if (/^\d{4}-\d\d-\d\d$/.test(a.data || '')) o.due = a.data; if (a.prioridade >= 1 && a.prioridade <= 4) o.prio = String(a.prioridade); OS.add('tasks', o); did.push('Tarefa: ' + o.title); return 'Tarefa criada: ' + o.title; } },
  { name: 'concluir_tarefa', description: 'Marca como feita a tarefa aberta cujo título mais se parece com o indicado.', props: { titulo: { type: 'string' } }, req: ['titulo'],
    run: a => { const n = s => String(s || '').toLowerCase(), q = n(a.titulo), L = OS.Tasks.open(), t = L.find(x => n(x.title) === q) || L.find(x => n(x.title).includes(q) || q.includes(n(x.title))); if (!t) return 'Não encontrei essa tarefa.'; OS.Tasks.complete(t.id); did.push('Feita: ' + t.title); return 'Concluída: ' + t.title; } },
  { name: 'criar_compromisso', description: 'Marca um compromisso/evento na agenda dele. Com google=true (só quando ele pede a agenda Google) vai para a agenda Google em vez da do Prumo.', props: { titulo: { type: 'string' }, data: { type: 'string', description: 'AAAA-MM-DD' }, hora: { type: 'string', description: 'HH:MM, opcional' }, fim: { type: 'string', description: 'HH:MM, opcional' }, google: { type: 'boolean', description: 'true só se ele pedir a agenda Google' } }, req: ['titulo', 'data'],
    run: async a => { if (!/^\d{4}-\d\d-\d\d$/.test(a.data || '')) return 'Data inválida (usa AAAA-MM-DD).'; const o = { title: String(a.titulo).slice(0, 200), date: a.data }; if (/^\d\d:\d\d$/.test(a.hora || '')) o.start = a.hora; if (/^\d\d:\d\d$/.test(a.fim || '')) o.end = a.fim;
      if (a.google && OS.gcalAdd) { const r = await OS.gcalAdd(o); if (r && r.ok) { did.push('Agenda Google: ' + o.title + ' · ' + U.fmtDS(o.date) + (o.start ? ' ' + o.start : '')); return 'Marcado na agenda Google.'; } }
      OS.add('events', o); did.push('Agenda: ' + o.title + ' · ' + U.fmtDS(o.date) + (o.start ? ' ' + o.start : '')); return 'Compromisso marcado' + (a.google ? ' no Prumo (a agenda Google ainda não está ligada pelo script).' : '.'); } },
  { name: 'registar_gasto', description: 'Regista uma despesa nas finanças dele (só quando ele diz que gastou/pagou/comprou algo).', props: { valor: { type: 'number', description: 'em euros' }, descricao: { type: 'string' } }, req: ['valor', 'descricao'],
    run: a => { const r = OS.Spyke && OS.Spyke.addExpense ? OS.Spyke.addExpense(+a.valor, String(a.descricao).slice(0, 120)) : null; if (!r || !r.ok) return (r && r.msg) || 'Não consegui registar.'; did.push('Gasto: ' + r.text); return 'Registado: ' + r.text; } },
  { name: 'marcar_habito', description: 'Marca um hábito de hoje como feito.', props: { nome: { type: 'string' } }, req: ['nome'],
    run: a => { const q = String(a.nome).toLowerCase(), h = OS.all('habits').find(x => x.active && String(x.name).toLowerCase().includes(q)); if (!h) return 'Não encontrei esse hábito.'; if (OS.Hab.done(h, today())) return 'Já estava feito.'; OS.Hab.toggle(h.id, today()); did.push('Hábito: ' + h.name); return 'Hábito marcado: ' + h.name; } },
  { name: 'memorizar', description: 'Guarda um facto duradouro sobre a vida dele (pessoas, gostos, planos, datas) quando ele conta ou pede para lembrares.', props: { facto: { type: 'string', description: 'uma frase curta na 3.ª pessoa' } }, req: ['facto'],
    run: a => { const ok = OS.Spyke && OS.Spyke.memAdd ? OS.Spyke.memAdd(String(a.facto).slice(0, 300), 'ia') : false; if (ok) did.push('Memória: ' + a.facto); return ok ? 'Guardado.' : 'Já sabia isso.'; } },
  { name: 'responder_email', description: 'Escreve uma resposta a um e-mail recebido e guarda-a como rascunho no Gmail dele (não envia).', props: { pessoa: { type: 'string', description: 'nome ou e-mail de quem escreveu' }, instrucao: { type: 'string', description: 'o que ele quer responder' } }, req: ['pessoa', 'instrucao'],
    run: async a => { if (!OS.Mail || !OS.Mail.replyByName) return 'O e-mail não está ligado.'; const r = await OS.Mail.replyByName(String(a.pessoa), String(a.instrucao)); if (r.ok) did.push('Rascunho para ' + r.to); return r.ok ? 'Rascunho guardado no Gmail para ' + r.to + ': ' + String(r.body).slice(0, 300) : r.msg; } },
  { name: 'procurar_na_app', description: 'Procura um texto em TODA a app (tarefas, notas, metas, projetos, pessoas, livros, decisões, movimentos, investimentos, universidade, trabalho, biografia, memória…). Usa quando ele pergunta por algo que não está no resumo.', props: { texto: { type: 'string', description: 'palavras a procurar' } }, req: ['texto'],
    run: a => cut(findAll(String(a.texto || '')), 6000) },
  { name: 'ler_area', description: 'Lê os registos mais recentes de qualquer área da app pelo nome da coleção (ex.: notes, books, people, decisions, transactions, assets, invtx, subjects, assessments, sessions, workouts, runs, sportlog, meals, body, shifts, dayoffs, projects, goals, milestones, habits, devos, prayers, trees, opps, applications, contacts, skills, lifeev, reviews_w, reviews_m).', props: { area: { type: 'string', description: 'nome da coleção' }, quantos: { type: 'integer', description: 'quantos registos (até 60)' } }, req: ['area'],
    run: a => cut(readArea(String(a.area || ''), +a.quantos || 30), 7000) },
  { name: 'abrir_pagina', description: 'Abre uma página da app quando ele pede para ver/abrir algo.', props: { pagina: { type: 'string', description: 'nome da página, ex.: finanças, floresta, universidade, e-mail, jornal, investimentos' } }, req: ['pagina'],
    run: a => { const r = OS.Spyke && OS.Spyke.findRoute ? OS.Spyke.findRoute(a.pagina) : null; if (!r) return 'Não encontrei essa página.'; location.hash = r[0]; return 'Abri ' + r[1] + '.'; } }];

/* ---------- instruções ---------- */
const system = () => `És o Spyke, o assistente pessoal ${OS.Acc && OS.Acc.pub ? OS.whoCtx('', 'de') : 'do ' + who()} (estilo J.A.R.V.I.S.): pensas por ti, és direto, calmo, confiante e leal, com um toque de humor seco.${OS.Acc && OS.Acc.pub ? '' : ' Ele é brasileiro, vive em Aveiro (Portugal), estuda na universidade, trabalha e investe.'}
Regras:
- Responde SEMPRE em português do Brasil, para ser dito em voz alta: no máximo 3 ou 4 frases curtas, sem listas, sem markdown, sem emojis. Nunca digas o teu próprio nome.
- Recebes um resumo atual com quase tudo da vida dele: se o resumo chega, responde logo (é mais rápido). Para detalhes que não estão lá, usa "consultar" (por área), "procurar_na_app" (procura em toda a app) ou "ler_area". Não inventes números nem factos.
- Para perguntas sobre o mundo (notícias, factos, preços, como fazer algo), pesquisa na internet antes de responder.
- Age quando ele pedir (criar tarefa, compromisso, gasto, marcar hábito, memorizar, abrir página) e confirma numa frase o que fizeste. Não faças ações que ele não pediu.
- Se não tiveres a informação, diz isso com honestidade e sugere o que ele pode fazer.
- Hoje é ${new Date().toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${new Date().toLocaleTimeString(OS.loc ? OS.loc() : 'pt-PT', { hour: '2-digit', minute: '2-digit' })} (hora de Portugal). As datas vão no formato AAAA-MM-DD.`;
const brief = () => { try { return OS.Spyke && OS.Spyke.ctx ? OS.Spyke.ctx().slice(0, 12000) : ''; } catch (e) { return ''; } };

/* ---------- Gemini (grátis) ---------- */
// os modelos vêm da lista que a app descobre com a tua chave (o Google desliga os antigos); gemma não serve aqui (não usa ferramentas nem pesquisa)
const gemCall = async (model, body) => { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(OS.AI.key())}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) { const m = (j.error && j.error.message) || 'erro ' + r.status; if (r.status === 429 && OS.AI.markLimit) OS.AI.markLimit(model, m); if (OS.AI.isDead && OS.AI.isDead(r.status, m)) { OS.AI.markDead(model); const e = new Error('modelo desligado'); e.status = 404; throw e; } const e = new Error(/API key/i.test(m) ? 'a chave da IA não é válida' : r.status === 429 ? 'limite grátis da IA atingido por agora' : m); e.status = r.status; throw e; } return j; };
// limite grátis: passa ao modelo seguinte (cada um tem a sua cota)
const gemModel = async body => { await OS.AI.discover(); const list = OS.AI.gemini(); if (!list.length) { const e = new Error(OS.AI.limitMsg || 'limite grátis da IA atingido'); e.status = 429; throw e; } let last;
  for (const m of list) { try { return await gemCall(m, body); } catch (e) { last = e; if (e.status !== 404 && e.status !== 400 && e.status !== 429 && e.status !== 500 && e.status !== 503) throw e; } }
  throw last; };
// pesquisa na internet (Google) feita pelo Gemini, com as fontes
const webSearch = async q => { const j = await gemModel({ contents: [{ role: 'user', parts: [{ text: `Pesquisa e responde em português, de forma factual e atual, em 4 a 6 frases: ${q}` }] }], tools: [{ google_search: {} }] });
  const c = (j.candidates || [])[0] || {}, txt = ((c.content || {}).parts || []).map(p => p.text || '').join(''), src = ((c.groundingMetadata || {}).groundingChunks || []).map(x => x.web && x.web.title).filter(Boolean).slice(0, 4);
  return txt + (src.length ? '\nFontes: ' + src.join(', ') : ''); };
// pesquisa para outras partes da app (ex.: ler uma notícia inteira): texto + fontes { t, u }
B.search = async (prompt, temp = .3) => { if (!OS.AI.key()) throw new Error('pesquisa precisa da chave do Google'); const j = await gemModel({ contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: temp } });
  const c = (j.candidates || [])[0] || {}, txt = ((c.content || {}).parts || []).map(p => p.text || '').join('').trim(), seen = new Set();
  const src = ((c.groundingMetadata || {}).groundingChunks || []).map(x => x.web).filter(w => w && w.title && !seen.has(w.title) && seen.add(w.title)).slice(0, 8).map(w => ({ t: w.title, u: w.uri }));
  if (!txt) throw new Error('a IA não respondeu'); return { text: txt, src }; };
const WEB = { name: 'pesquisar_internet', description: 'Pesquisa na internet (Google) informação atual: notícias, factos, preços, horários, como fazer algo.', props: { pergunta: { type: 'string' } }, req: ['pergunta'], run: async a => cut(await webSearch(String(a.pergunta).slice(0, 300)), 4000) };
const gemTools = list => [{ functionDeclarations: list.map(t => ({ name: t.name, description: t.description, parameters: { type: 'object', properties: t.props, required: t.req } })) }];
const askGemini = async (q, hist) => { const tools = T.concat([WEB]), contents = hist.concat([{ role: 'user', parts: [{ text: `Resumo atual dos dados dele (para contexto; consulta para detalhes):\n${brief()}\n\nPedido: ${q}` }] }]);
  for (let i = 0; i < 6; i++) { const j = await gemModel({ systemInstruction: { parts: [{ text: system() }] }, contents, tools: gemTools(tools), generationConfig: { temperature: .4 } });
    const c = (j.candidates || [])[0]; if (!c || !c.content) throw new Error('a IA não respondeu'); contents.push(c.content);
    const calls = (c.content.parts || []).filter(p => p.functionCall); if (!calls.length) return (c.content.parts || []).map(p => p.text || '').join('').trim();
    const res = []; for (const p of calls) { const f = tools.find(t => t.name === p.functionCall.name); let out; try { out = f ? await f.run(p.functionCall.args || {}) : 'Ferramenta desconhecida.'; } catch (e) { out = 'Erro: ' + (e.message || 'falhou'); } res.push({ functionResponse: { name: p.functionCall.name, response: { resultado: String(out) } } }); }
    contents.push({ role: 'user', parts: res }); }
  return 'Fiz o que consegui, mas precisei de passos demais. Diz-me de outra forma.'; };

/* ---------- Claude (opcional, SDK oficial) ---------- */
let SDK = null;
const sdk = () => SDK || (SDK = import(new URL('vendor/anthropic-sdk.min.js', document.baseURI).href));
B.MODELS = [['claude-opus-5-5', 'Claude Opus 5.5 · o mais inteligente (~10 cêntimos por conversa)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 · rápido e muito bom (~5 cêntimos)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 · o mais barato (~0,3 cêntimos)']];
const askClaude = async (q, hist) => { const { Anthropic, betaTool } = await sdk(), c = cfg();
  const client = new Anthropic({ apiKey: c.anKey.trim(), dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60000 });
  const tools = T.map(t => betaTool({ name: t.name, description: t.description, inputSchema: { type: 'object', properties: t.props, required: t.req, additionalProperties: false }, run: async a => String(await t.run(a)) }));
  const model = c.anModel || B.MODELS[0][0], fb = model === 'claude-opus-5-5' || model === 'claude-sonnet-5-5';
  const runner = client.beta.messages.toolRunner(Object.assign({ model, max_tokens: 8000, max_iterations: 6, system: system(), output_config: { effort: 'low' },
    tools: tools.concat([{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }]),
    messages: hist.concat([{ role: 'user', content: `Resumo atual dos dados dele (para contexto; consulta para detalhes):\n${brief()}\n\nPedido: ${q}` }]) },
    // se um pedido for recusado por engano, a Anthropic responde com outro modelo no mesmo pedido
    fb ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}));
  for await (const message of runner) { if (message.stop_reason === 'pause_turn') runner.pushMessages({ role: 'assistant', content: message.content }); }
  const fin = await runner.done(); if (fin.stop_reason === 'refusal') return 'Prefiro não responder a isso.';
  return fin.content.filter(b => b.type === 'text').map(b => b.text).join(' ').trim(); };
const claudeErr = async e => { try { const { Anthropic } = await sdk(); if (e instanceof Anthropic.AuthenticationError) return 'a chave da Anthropic não é válida'; if (e instanceof Anthropic.RateLimitError) return 'limite da Anthropic atingido, tenta daqui a pouco'; if (e instanceof Anthropic.PermissionDeniedError) return 'a conta da Anthropic não tem acesso a esse modelo ou não tem saldo'; if (e instanceof Anthropic.BadRequestError) return 'pedido recusado pela Anthropic (' + String(e.message).slice(0, 80) + ')'; if (e instanceof Anthropic.APIConnectionError) return 'sem ligação à Anthropic'; } catch (x) { } return e.message || 'erro'; };

/* ---------- conversa ---------- */
const H = []; // últimas trocas (para continuar a conversa)
B.which = () => cfg().brain === 'claude' && cfg().anKey ? 'claude' : OS.AI && OS.AI.key() ? 'gemini' : OS.AI && OS.AI.freeOn && OS.AI.freeOn() ? 'free' : '';
/* ---------- reserva grátis (sem chave, sem limite diário): o mesmo Spyke com ferramentas, se o Google não responder ---------- */
const wiki = async q => { try { const u = 'https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=3&prop=extracts&exintro=1&explaintext=1&exchars=700&format=json&origin=*&gsrsearch=' + encodeURIComponent(q);
    const j = await (await fetch(u)).json(), ps = Object.values((j.query || {}).pages || {}); return ps.length ? ps.map(p => p.title + ': ' + p.extract).join('\n') + '\nFonte: Wikipédia' : 'Não encontrei nada sobre isso.'; } catch (e) { return 'Pesquisa indisponível agora.'; } };
const askFree = async (q, hist) => { const tools = T.concat([{ name: WEB.name, description: WEB.description + ' (na reserva: Wikipédia)', props: WEB.props, req: WEB.req, run: a => wiki(String(a.pergunta || '').slice(0, 200)) }]);
  const fns = tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: { type: 'object', properties: t.props, required: t.req } } }));
  const msgs = [{ role: 'system', content: system() + '\nResumo atual dos dados dele (consulta para detalhes):\n' + brief() }].concat(hist, [{ role: 'user', content: q }]);
  for (let i = 0; i < 6; i++) { const m = await OS.AI.free(msgs, { tools: fns, temp: .4 }), calls = m.tool_calls || [];
    if (!calls.length) return String(m.content || '').trim();
    msgs.push({ role: 'assistant', content: m.content || '', tool_calls: calls });
    for (const c of calls) { const f = tools.find(t => t.name === (c.function || {}).name); let out; try { let a = {}; try { a = JSON.parse((c.function || {}).arguments || '{}'); } catch (e) { } out = f ? await f.run(a) : 'Ferramenta desconhecida.'; } catch (e) { out = 'Erro: ' + (e.message || 'falhou'); }
      msgs.push({ role: 'tool', tool_call_id: c.id, content: String(out).slice(0, 6000) }); } }
  return 'Fiz o que consegui, mas precisei de passos demais. Diz-me de outra forma.'; };
B.ask = async q => { did.length = 0; const w = B.which(); if (!w) return { text: '', err: 'sem IA' };
  let text = '', err = '';
  try { if (w === 'free') text = await askFree(q, H.slice(-8).map(h => ({ role: h.r === 'u' ? 'user' : 'assistant', content: h.t })));
    else if (w === 'claude') { const hist = H.slice(-8).map(h => ({ role: h.r === 'u' ? 'user' : 'assistant', content: h.t })); text = await askClaude(q, hist); }
    else { const hist = H.slice(-8).map(h => ({ role: h.r === 'u' ? 'user' : 'model', parts: [{ text: h.t }] })); text = await askGemini(q, hist); } }
  catch (e) { err = w === 'claude' ? await claudeErr(e) : (e.message || 'erro');
    // o Claude falhou: tenta com o Gemini grátis para não ficar sem resposta
    if (w === 'claude' && OS.AI && OS.AI.key()) { try { const hist = H.slice(-8).map(h => ({ role: h.r === 'u' ? 'user' : 'model', parts: [{ text: h.t }] })); text = await askGemini(q, hist); err = ''; } catch (e2) { } }
    // o Google também não deu (cota esgotada, modelo desligado…): reserva grátis, sem esperar
    if (!text && OS.AI.freeOn()) { try { did.length = 0; text = await askFree(q, H.slice(-8).map(h => ({ role: h.r === 'u' ? 'user' : 'assistant', content: h.t }))); err = ''; } catch (e3) { err = err || e3.message; } } }
  if (text) { H.push({ r: 'u', t: q }, { r: 'a', t: text }); if (H.length > 20) H.splice(0, H.length - 20); }
  return { text, err, did: did.slice(), brain: w }; };
B.reset = () => { H.length = 0; };
B.test = async () => { const w = B.which(); if (w !== 'claude') return { ok: !!w }; try { const { Anthropic } = await sdk(), client = new Anthropic({ apiKey: cfg().anKey.trim(), dangerouslyAllowBrowser: true, maxRetries: 0 }); await client.models.retrieve(cfg().anModel || B.MODELS[0][0]); return { ok: true }; } catch (e) { return { ok: false, msg: await claudeErr(e) }; } };
B._tools = T; B._consult = consult;
})();
