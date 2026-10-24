/* PRUMO — modelo de dados: esquemas, singletons, sementes, migração e lógica de domínio. */
(() => {
'use strict';
const U = OS.U, S = OS.S;
const F = (k, l, t = 'text', x = {}) => Object.assign({ k, l, t }, x);

/* ================= LISTAS ================= */
const L = OS.L = {};
L.AREAS = ['Universidade', 'Aprendizagem', 'Finanças', 'Investimentos', 'Treino', 'Corrida', 'Trabalho', 'Carreira', 'Mova', 'Projetos', 'Casa', 'Pessoal', 'Fé', 'Saúde'];
L.CTX = ['@Universidade', '@Casa', '@Trabalho', '@Mova', '@Financeiro', '@Estudos', '@Computador', '@Rua'];
L.PRIO = [['1', 'Crítica'], ['2', 'Alta'], ['3', 'Média'], ['4', 'Baixa']];
L.EFFORT = [['5', '5 min'], ['15', '15 min'], ['30', '30 min'], ['60', '1 h'], ['120', '2 h'], ['240', '4 h+']];
L.TSTAT = ['Inbox', 'Próxima', 'Em curso', 'Aguardando', 'Feita'];
L.HORIZON = ['3 meses', '1 ano', '3 anos', '5 anos', 'Longo prazo'];
L.GCAT = ['Finanças', 'Estudos', 'Academia', 'Corrida', 'Trabalho', 'Empresa', 'Desenvolvimento pessoal', 'Outros'];
L.PTYPE = ['Acadêmico', 'Financeiro', 'Profissional', 'Empresarial', 'Pessoal', 'Aprendizagem'];
L.PSTAT = ['Ideia', 'Planejado', 'Em andamento', 'Pausado', 'Concluído', 'Cancelado'];
L.ACCT = ['Conta à ordem', 'Poupança', 'Reserva', 'Dinheiro', 'Cartão de crédito', 'Corretora', 'Outro'];
// bancos mais usados (Portugal, Brasil e digitais): nome, cor da marca (para o ponto), moeda habitual
L.BANKS = [['Caixa Geral de Depósitos', '#0067A6', 'EUR'], ['Millennium BCP', '#D1005D', 'EUR'], ['Santander', '#EC0000', 'EUR'], ['Novo Banco', '#00A3AD', 'EUR'], ['BPI', '#F26C21', 'EUR'], ['ActivoBank', '#7AB800', 'EUR'], ['Crédito Agrícola', '#00843D', 'EUR'], ['Montepio', '#1F5FA8', 'EUR'], ['Banco CTT', '#E30613', 'EUR'], ['Moey!', '#FF5A5F', 'EUR'], ['Revolut', '#3D7BF7', 'EUR'], ['Wise', '#9FE870', 'EUR'], ['N26', '#36A18B', 'EUR'], ['BTG Pactual', '#2B5DA8', 'BRL'], ['Nubank', '#820AD1', 'BRL'], ['Itaú', '#EC7000', 'BRL'], ['Bradesco', '#CC092F', 'BRL'], ['Banco do Brasil', '#F5D90A', 'BRL'], ['Caixa Econômica Federal', '#005CA9', 'BRL'], ['Inter', '#FF7A00', 'BRL'], ['C6 Bank', '#8C8C8C', 'BRL'], ['Mercado Pago', '#00B1EA', 'BRL'], ['PicPay', '#21C25E', 'BRL'], ['XP Investimentos', '#B8B8B8', 'BRL'], ['PayPal', '#2D6FD2', 'EUR'], ['Trading 212', '#00A8E8', 'EUR']];
L.bank = s => { const n = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); if (!n) return null; return L.BANKS.find(b => { const k = b[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return k === n || k.split(' ')[0] === n.split(' ')[0] && n.split(' ')[0].length >= 3 || (n === 'cgd' && k.startsWith('caixa geral')) || (n === 'bb' && k === 'banco do brasil') || (n === 'btg' && k.startsWith('btg')); }) || null; };
// como uma conta aparece em toda a app: "Banco · nome" (sem repetir o banco se já estiver no nome)
L.accLabel = a => { if (!a) return ''; const nm = a.name || '', b = String(a.inst || '').trim(); if (!b) return nm; const k = b.toLowerCase().split(' ')[0]; return nm.toLowerCase().includes(k) ? nm : b + ' · ' + nm; };
L.METHOD = ['Débito', 'Crédito', 'MB WAY', 'Multibanco', 'Transferência', 'Débito direto', 'Dinheiro', 'PayPal'];
L.CUR = ['EUR', 'USD', 'BRL', 'GBP', 'CHF', 'CAD', 'JPY'];
L.ACLS = ['Ação', 'ETF', 'FII', 'REIT', 'BDR', 'Fundo', 'PPR', 'Previdência', 'Obrigação', 'Título público', 'Tesouro Direto', 'Certificados de Aforro', 'Certificados do Tesouro', 'Depósito a prazo', 'CDB', 'LCI/LCA', 'LC', 'Debênture', 'CRI/CRA', 'Poupança', 'Cripto', 'Commodity', 'Ouro', 'Imóvel', 'Crowdlending/P2P', 'Opção', 'Futuro', 'CFD', 'Caixa em moeda estrangeira', 'Outro'];
L.RFC = ['Título público', 'Tesouro Direto', 'Certificados de Aforro', 'Certificados do Tesouro', 'Depósito a prazo', 'CDB', 'LCI/LCA', 'LC', 'Debênture', 'CRI/CRA', 'Poupança', 'Crowdlending/P2P'];
L.MUSCLES = ['Peito', 'Dorsais', 'Trapézio', 'Lombar', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraços', 'Abdómen', 'Oblíquos', 'Glúteos', 'Quadríceps', 'Isquiotibiais', 'Gémeos'];
L.RUNT = ['Regenerativa', 'Rodagem', 'Longa', 'Fartlek', 'Intervalado', 'Tempo / Limiar', 'Prova', 'Livre'];
L.WEEK = [['1', 'Segunda'], ['2', 'Terça'], ['3', 'Quarta'], ['4', 'Quinta'], ['5', 'Sexta'], ['6', 'Sábado'], ['0', 'Domingo']];
L.TRACK = ['Conteúdos', 'Estudo', 'Exercícios', 'Projeto', 'Avaliação', 'Domínio'];
L.SEM = ['1.º Semestre 26/27', '2.º Semestre 26/27', '1.º Semestre 27/28', '2.º Semestre 27/28', '1.º Semestre 28/29', '2.º Semestre 28/29', 'Por definir'];
L.METRICS = [['manual', 'Manual (atualizo eu)'], ['account', 'Saldo de uma conta'], ['networth', 'Patrimônio líquido'], ['invested', 'Valor da carteira'], ['studyHours', 'Horas de estudo (desde o início)'], ['avgGrade', 'Média ponderada das disciplinas'], ['runKm', 'Km corridos (desde o início)'], ['run5k', 'Melhor tempo em 5 km (min)'], ['workouts', 'Treinos (desde o início)'], ['books', 'Livros concluídos (desde o início)'], ['movaRevenue', 'Receita da Mova (desde o início)'], ['contacts', 'Contactos na rede'], ['certs', 'Certificações concluídas'], ['steps', '% das etapas concluídas'], ['linked', '% das tarefas e projetos ligados a esta meta']];
L.QUOTES = ["A dor da disciplina pesa gramas. A dor do arrependimento pesa toneladas.", "Ninguém vem te salvar. Ou você se levanta, ou continua exatamente onde está.", "Não é falta de tempo. É falta de prioridade.", "A prova não é o dia do exame. A prova é cada dia antes dele.", "Quem não revê, esquece. Quem esquece, estudou para nada.", "Quem não controla o dinheiro é controlado por ele.", "Rico não é quem ganha muito. É quem gasta menos do que ganha, durante muito tempo.", "Cada compra por impulso é um voto contra o teu futuro.", "Ninguém se arrepende de um treino. Todos se arrependem de faltar.", "Tu não és o que dizes que vais fazer. És o que fazes quando ninguém está a ver.", "Motivação faz-te começar. Hábito faz-te continuar.", "Um dia ou dia um. Tu decides.", "Tu não sobes ao nível dos teus objetivos; desces ao nível da tua rotina.", "O Ryan de daqui a 5 anos está a ver o que fazes hoje.", "Sê implacável com as tuas desculpas e paciente com o teu progresso.", "Enquanto Deus continuar a te despertar a cada manhã, é porque Ele ainda tem planos para a sua vida.", "Não vos conformeis com este século, mas transformai-vos pela renovação da vossa mente.", "Disciplina ou arrependimento. Escolha a sua dor.", "Consistência supera intensidade.", "Ascensão é obrigatória. Estagnação não é opção."];

/* ================= SINGLETONS ================= */
OS.ONE_DEF.profile = { name: 'Ryan da Silva Magalhães', short: 'Ryan', city: 'Aveiro', uni: 'ISCA-UA · Universidade de Aveiro', course: '', year: '2026/2027', semester: '1.º Semestre 26/27', semStart: '2026-09-14', semEnd: '2027-01-31', ectsTotal: 180, employer: '', jobRole: '', hourly: '', savingsTarget: 20, emergencyTarget: 1000, trainTarget: 4, runKmTarget: 15, fx: { USD: '', BRL: '', GBP: '' }, wakeTime: '', sleepTime: '' };
OS.ONE_DEF.fin = { cats: {
  Despesa: { 'Casa': ['Renda', 'Água', 'Luz', 'Gás', 'Internet', 'Manutenção'], 'Alimentação': ['Supermercado', 'Restaurantes', 'Café & snacks', 'Delivery'], 'Transporte': ['Transportes públicos', 'Combustível', 'Uber/Bolt', 'Viagens'], 'Universidade': ['Propinas', 'Material', 'Livros', 'Cursos'], 'Saúde': ['Farmácia', 'Consultas', 'Ginásio', 'Suplementos'], 'Subscrições': ['Streaming', 'Software', 'Telemóvel', 'Outras'], 'Lazer': ['Saídas', 'Hobbies', 'Viagens', 'Jogos'], 'Pessoal': ['Roupa', 'Cuidados pessoais', 'Presentes', 'Eletrónica'], 'Fé & Doações': ['Dízimo', 'Doações'], 'Impostos & Taxas': ['Impostos', 'Taxas bancárias', 'Multas'], 'Dívidas': ['Prestação', 'Juros'], 'Outros': ['Diversos'] },
  Receita: { 'Salário': ['Salário', 'Horas extra', 'Subsídios'], 'Mova': ['Distribuição de lucro'], 'Serviços próprios': ['Freelance', 'Serviços'], 'Família': ['Mesada', 'Ajuda'], 'Investimentos': ['Dividendos', 'Juros', 'Mais-valias'], 'Bolsas': ['Bolsa de estudo'], 'Outros': ['Reembolsos', 'Vendas', 'Diversos'] }
} };
OS.ONE_DEF.fit = { split: { 1: 'Peito & Tríceps', 2: 'Costas & Bíceps', 3: 'Pernas', 4: 'Ombros & Core', 5: 'Full Body', 6: 'Corrida', 0: 'Mobilidade' } };
// quem usa a app: no modo pessoal é o Ryan (os textos de sempre); numa conta é o nome do perfil e o que ele disser (cidade, curso, trabalho)
OS.who = () => OS.one('profile').short || (OS.Acc && OS.Acc.pub ? 'o utilizador' : 'Ryan');
const whoBits = () => { const p = OS.one('profile'); return [p.city && 'vive em ' + p.city, p.uni && 'estuda em ' + p.uni + (p.course ? ', ' + p.course : ''), p.jobRole && 'trabalha como ' + p.jobRole].filter(Boolean); };
OS.whoCtx = (ryan, prep = '') => { if (!(OS.Acc && OS.Acc.pub)) return ryan; const b = whoBits(); return (prep ? prep + ' ' : '') + OS.who() + (b.length ? ' (' + b.join('; ') + ')' : ''); };
// textos fixos com o nome do Ryan ("o Ryan de daqui a 5 anos"): numa conta passam a "o teu eu de…"
OS.my = s => OS.Acc && OS.Acc.pub ? String(s || '').replace(/\b(o|O|ao|Ao|no|do) Ryan de\b/g, '$1 teu eu de') : s;
OS.whoFlat = ryan => OS.Acc && OS.Acc.pub ? [OS.who()].concat(whoBits()).join(', ') : ryan;
OS.ONE_DEF.mova = { name: 'Mova', what: '', offer: '', customer: '', stage: 'Ideia', founded: '', revenueTarget: '', clientsTarget: '', marginTarget: '', notes: '' };
OS.ONE_DEF.northstar = { h3m: '', h1y: '', h3y: '', h5y: '', hlong: '', values: '', identity: '', notAccept: '' };
OS.ONE_DEF.plan = { week: {}, month: {}, mit: {} };
OS.ONE_DEF.integ = { gcal: false };
OS.ONE_DEF.meta = { seeded: false, migrated: false };

/* ================= ESQUEMAS ================= */
const rel = (k, l, c, x = {}) => F(k, l, 'rel', Object.assign({ c }, x));
const expCats = () => Object.keys(OS.one('fin').cats.Despesa || {});
const catsFor = r => Object.keys((OS.one('fin').cats[r.type === 'Receita' ? 'Receita' : 'Despesa']) || {});
const subsFor = r => ((OS.one('fin').cats[r.type === 'Receita' ? 'Receita' : 'Despesa'] || {})[r.cat] || []);

S.tasks = { label: 'Tarefa', title: r => r.title || 'Tarefa', fields: [
  F('title', 'Tarefa', 'text', { req: 1, wide: 1 }),
  F('status', 'Estado', 'sel', { o: L.TSTAT, req: 1 }), F('prio', 'Prioridade', 'sel', { o: L.PRIO, req: 1 }),
  F('impact', 'Impacto', 'rating', { h: '1 = pouco · 5 = muda o jogo' }), F('effort', 'Esforço', 'sel', { o: L.EFFORT }),
  F('due', 'Prazo', 'date'), F('sched', 'Fazer em', 'date', { h: 'Dia planeado' }),
  F('energy', 'Energia', 'sel', { o: ['Alta', 'Baixa'] }), F('recur', 'Repetir', 'sel', { o: ['Não', 'Diária', 'Semanal', 'Mensal'] }),
  F('ctx', 'Contextos', 'multi', { o: () => L.CTX }),
  F('area', 'Área', 'sel', { o: L.AREAS }), rel('project', 'Projeto', 'projects', { filter: p => !['Concluído', 'Cancelado'].includes(p.status) }),
  rel('goal', 'Meta', 'goals', { filter: g => g.status !== 'Concluída' }), rel('subject', 'Disciplina', 'subjects', { show: r => r.area === 'Universidade', filter: s => s.status === 'Em curso' }),
  rel('parent', 'Subtarefa de', 'tasks', { show: r => !!r.project, filter: (t, r) => t.project === r.project && t.id !== r.id && t.status !== 'Feita' }),
  F('notes', 'Notas', 'area')
], defaults: () => ({ status: 'Inbox', prio: '3', impact: 3, effort: '30', ctx: [] }),
  after: (r, isNew) => OS.Tasks.afterSave(r, isNew) };

S.events = { label: 'Compromisso', title: r => r.title, fields: [
  F('title', 'Compromisso', 'text', { req: 1, wide: 1 }), F('date', 'Data', 'date', { req: 1 }), F('allDay', 'Dia inteiro', 'bool'),
  F('start', 'Início', 'time', { show: r => !r.allDay }), F('end', 'Fim', 'time', { show: r => !r.allDay }),
  F('area', 'Área', 'sel', { o: L.AREAS }), F('recur', 'Repetir', 'sel', { o: ['Não', 'Semanal', 'Mensal', 'Anual'] }),
  F('location', 'Local'), F('important', 'Importante', 'bool'), F('notes', 'Notas', 'area')
], defaults: () => ({ date: U.today(), recur: 'Não' }) };

S.habits = { label: 'Hábito', title: r => r.name, fields: [
  F('name', 'Hábito', 'text', { req: 1, wide: 1 }), F('group', 'Momento', 'sel', { o: ['Manhã', 'Dia', 'Noite'] }),
  F('freq', 'Frequência', 'sel', { o: ['Diário', 'Dias úteis', 'X por semana'], req: 1 }), F('perWeek', 'Vezes por semana', 'num', { show: r => r.freq === 'X por semana' }),
  F('area', 'Área', 'sel', { o: L.AREAS }), F('core', 'Inegociável', 'bool', { h: 'Entra na sequência de dias perfeitos' }), F('active', 'Ativo', 'bool'),
  F('auto', 'Marcar sozinho a partir de', 'sel', { o: [['', 'Não (manual)'], ['study100', 'Estudo ≥ 100 min'], ['workout', 'Treino ou corrida registado'], ['cash', 'Movimento financeiro registado'], ['review', 'Revisão espaçada feita']], h: 'O sistema marca quando o dado real existe' })
], defaults: () => ({ freq: 'Diário', group: 'Dia', active: true, log: {} }) };

S.routine = { label: 'Bloco de rotina', title: r => r.title, fields: [
  F('title', 'Bloco', 'text', { req: 1, wide: 1 }), F('days', 'Dias', 'multi', { o: L.WEEK }), F('start', 'Início', 'time', { req: 1 }), F('end', 'Fim', 'time', { req: 1 }),
  F('area', 'Área', 'sel', { o: L.AREAS }), F('notes', 'Notas', 'area')
], defaults: () => ({ days: ['1', '2', '3', '4', '5'] }) };

S.projects = { label: 'Projeto', title: r => r.name, fields: [
  F('name', 'Projeto', 'text', { req: 1, wide: 1 }), F('type', 'Tipo', 'sel', { o: L.PTYPE, req: 1 }), F('status', 'Estado', 'sel', { o: L.PSTAT, req: 1 }),
  F('prio', 'Prioridade', 'sel', { o: L.PRIO }), F('start', 'Início', 'date'), F('due', 'Prazo', 'date'),
  rel('goal', 'Meta ligada', 'goals'), F('progMode', 'Progresso', 'sel', { o: [['auto', 'Automático (tarefas)'], ['manual', 'Manual']] }),
  F('progress', 'Progresso manual', 'pct', { show: r => r.progMode === 'manual' }),
  F('objective', 'Objetivo', 'area', { rows: 2 }), F('expected', 'Resultado esperado', 'area', { rows: 2 }),
  F('kpis', 'Indicadores', 'area', { rows: 3, ph: 'Um por linha:  Clientes validados: 2 / 5' }), F('notes', 'Notas', 'area')
], defaults: () => ({ type: 'Pessoal', status: 'Planejado', prio: '3', progMode: 'auto', start: U.today() }) };

S.goals = { label: 'Meta', title: r => r.title, fields: [
  F('title', 'Meta', 'text', { req: 1, wide: 1 }), F('cat', 'Categoria', 'sel', { o: L.GCAT, req: 1 }), F('horizon', 'Horizonte', 'sel', { o: L.HORIZON, req: 1 }),
  F('start', 'Início', 'date'), F('due', 'Prazo', 'date'), F('importance', 'Importância', 'rating'),
  F('metric', 'Como medir', 'sel', { o: L.METRICS, req: 1 }), rel('account', 'Conta', 'accounts', { show: r => r.metric === 'account' }),
  F('target', 'Alvo', 'num', { show: r => r.metric !== 'steps' && r.metric !== 'linked' }), F('base', 'Valor inicial', 'num', { show: r => r.metric === 'manual' || r.metric === 'run5k', h: 'Ponto de partida' }),
  F('cur', 'Valor atual', 'num', { show: r => r.metric === 'manual' }), F('unit', 'Unidade', 'text', { show: r => r.metric === 'manual', ph: 'ex.: livros, €, kg' }),
  F('status', 'Estado', 'sel', { o: ['Ativa', 'Pausada', 'Concluída', 'Abandonada'] }),
  F('steps', 'Etapas', 'steps'), F('why', 'Porquê', 'area', { rows: 2 })
], defaults: () => ({ cat: 'Outros', horizon: '1 ano', metric: 'manual', status: 'Ativa', start: U.today(), importance: 3, steps: [] }) };

S.milestones = { label: 'Marco', title: r => r.title, fields: [
  F('title', 'Marco / acontecimento', 'text', { req: 1, wide: 1 }), F('date', 'Data', 'date', { req: 1 }), F('kind', 'Tipo', 'sel', { o: ['Marco', 'Acontecimento', 'Conquista'] }),
  F('area', 'Área', 'sel', { o: L.AREAS }), rel('goal', 'Meta', 'goals'), F('done', 'Concluído', 'bool'), F('notes', 'Notas', 'area')
], defaults: () => ({ kind: 'Marco', date: U.today() }) };

S.notes = { label: 'Nota', title: r => r.title, fields: [
  F('title', 'Título', 'text', { req: 1, wide: 1 }), F('type', 'Tipo', 'sel', { o: ['Conceito', 'Fórmula', 'Ideia', 'Insight', 'Resumo', 'Anotação', 'Referência', 'Link'] }),
  F('area', 'Área', 'sel', { o: L.AREAS }), F('body', 'Conteúdo', 'area', { rows: 8 }), F('url', 'Link'), F('tags', 'Tags', 'tags'),
  rel('subject', 'Disciplina', 'subjects'), rel('project', 'Projeto', 'projects'), rel('goal', 'Meta', 'goals'), rel('skill', 'Competência', 'skills')
], defaults: () => ({ type: 'Conceito' }) };

S.decisions = { label: 'Decisão', title: r => r.title, fields: [
  F('title', 'Decisão', 'text', { req: 1, wide: 1 }), F('status', 'Estado', 'sel', { o: ['Em análise', 'Decidida', 'Adiada'] }), F('deadline', 'Decidir até', 'date'),
  F('context', 'Contexto', 'area', { rows: 3 }), F('chosen', 'O que decidi', 'text', { show: r => r.status === 'Decidida' }), F('outcome', 'Resultado (revisão posterior)', 'area', { show: r => r.status === 'Decidida' })
], defaults: () => ({ status: 'Em análise', alts: [], alpha: {}, weights: { cost: 3, benefit: 4, risk: 3, time: 2, fin: 3, goals: 5, routine: 2 } }) };

/* ---- Finanças ---- */
S.accounts = { label: 'Conta', title: r => L.accLabel(r), fields: [
  F('inst', 'Banco', 'text', { list: () => L.BANKS.map(b => b[0]), ph: 'Ex.: Revolut, Santander, BTG, Caixa Geral, Wise' }), F('name', 'Nome da conta', 'text', { req: 1, ph: 'Ex.: Conta à ordem, Cartão, Poupança' }), F('type', 'Tipo', 'sel', { o: L.ACCT, req: 1 }),
  F('currency', 'Moeda', 'sel', { o: L.CUR, re: 1, h: 'Euro, real, dólar… O saldo fica nesta moeda; os totais aparecem em euros ao câmbio do dia.' }), F('opening', 'Saldo inicial', 'money', { cur: r => r.currency }), F('openDate', 'Data do saldo inicial', 'date'),
  F('limit', 'Limite do cartão', 'money', { show: r => r.type === 'Cartão de crédito', cur: r => r.currency }), F('dueDay', 'Dia de pagamento', 'num', { show: r => r.type === 'Cartão de crédito' }),
  F('archived', 'Arquivada', 'bool')
], defaults: () => ({ type: 'Conta à ordem', currency: 'EUR', opening: 0, openDate: U.today() }) };

S.transactions = { label: 'Movimento', title: r => r.desc || r.cat || r.type, fields: [
  F('type', 'Tipo', 'sel', { o: ['Despesa', 'Receita', 'Transferência'], req: 1, re: 1 }), F('amount', 'Valor', 'money', { req: 1, cur: r => OS.Fin.curOf(r.account) }),
  F('date', 'Data', 'date', { req: 1 }), F('desc', 'Descrição', 'text', { list: () => [...new Set(OS.all('transactions').map(t => t.desc).filter(Boolean))].slice(-80) }),
  rel('account', 'Conta', 'accounts', { req: 1, filter: a => !a.archived, re: 1 }), rel('toAccount', 'Para a conta', 'accounts', { show: r => r.type === 'Transferência', filter: a => !a.archived, re: 1 }),
  F('toAmount', 'Valor que chega à outra conta', 'money', { show: r => r.type === 'Transferência' && r.toAccount && OS.Fin.curOf(r.account) !== OS.Fin.curOf(r.toAccount), cur: r => OS.Fin.curOf(r.toAccount), h: 'As contas têm moedas diferentes. Se deixares vazio, usa o câmbio do dia.' }),
  F('cat', 'Categoria', 'sel', { o: catsFor, show: r => r.type !== 'Transferência', re: 1 }), F('sub', 'Subcategoria', 'sel', { o: subsFor, show: r => r.type !== 'Transferência' }),
  F('method', 'Forma de pagamento', 'sel', { o: L.METHOD }), F('ess', 'Classificação', 'sel', { o: ['Essencial', 'Supérfluo'], show: r => r.type === 'Despesa' }),
  F('inst', 'Parcelas', 'num', { show: r => r.type === 'Despesa' && !r.instG, h: 'Divide o valor em N meses (cria as parcelas futuras)' }),
  rel('debt', 'Pagamento da dívida', 'debts', { show: r => r.type === 'Despesa' }),
  F('tags', 'Tags', 'tags'), F('note', 'Observação', 'area', { rows: 2 })
], defaults: () => ({ type: 'Despesa', date: U.today(), method: 'Débito', ess: 'Essencial', account: (OS.all('accounts').find(a => !a.archived && a.type === 'Conta à ordem') || OS.all('accounts')[0] || {}).id }),
  validate: (d) => d.type === 'Transferência' && (!d.toAccount || d.toAccount === d.account) ? 'Escolhe uma conta de destino diferente.' : (U.num(d.amount) <= 0 ? 'O valor tem de ser maior que zero.' : null),
  after: (r, isNew) => OS.Fin.afterTx(r, isNew) };

S.recurring = { label: 'Recorrente', title: r => r.name, fields: [
  F('name', 'Nome', 'text', { req: 1 }), F('kind', 'Tipo', 'sel', { o: ['Assinatura', 'Conta fixa', 'Salário', 'Renda', 'Outro'], req: 1 }),
  F('type', 'Movimento', 'sel', { o: ['Despesa', 'Receita'], req: 1, re: 1 }), F('amount', 'Valor', 'money', { req: 1 }),
  F('freq', 'Frequência', 'sel', { o: ['Mensal', 'Anual', 'Semanal'] }), F('day', 'Dia do mês', 'num', { show: r => r.freq !== 'Semanal', h: '1 a 31' }),
  F('month', 'Mês (anual)', 'num', { show: r => r.freq === 'Anual', h: '1 a 12' }), F('wday', 'Dia da semana', 'sel', { o: L.WEEK, show: r => r.freq === 'Semanal' }),
  rel('account', 'Conta', 'accounts'), F('cat', 'Categoria', 'sel', { o: catsFor, re: 1 }), F('sub', 'Subcategoria', 'sel', { o: subsFor }), F('method', 'Forma de pagamento', 'sel', { o: L.METHOD }),
  F('ess', 'Classificação', 'sel', { o: ['Essencial', 'Supérfluo'], show: r => r.type === 'Despesa' }),
  F('review', 'Ainda preciso disto?', 'sel', { o: ['Manter', 'Rever', 'Cancelar'], show: r => r.type === 'Despesa' }),
  F('start', 'Início', 'date'), F('end', 'Fim', 'date'), F('active', 'Ativa', 'bool')
], defaults: () => ({ type: 'Despesa', kind: 'Assinatura', freq: 'Mensal', day: 1, active: true, review: 'Manter', ess: 'Essencial', start: U.today() }) };

S.budgets = { label: 'Orçamento', title: r => r.cat, fields: [F('cat', 'Categoria', 'sel', { o: expCats, req: 1 }), F('limit', 'Limite mensal', 'money', { req: 1 }), F('note', 'Nota')] };

S.debts = { label: 'Dívida', title: r => r.name, fields: [
  F('name', 'Nome', 'text', { req: 1 }), F('kind', 'Tipo', 'sel', { o: ['Empréstimo', 'Dívida pessoal', 'Parcelamento', 'Financiamento', 'Cartão', 'Outro'] }), F('creditor', 'Credor'),
  F('principal', 'Valor em dívida (inicial)', 'money', { req: 1 }), F('rate', 'Taxa anual', 'pct'), F('installment', 'Prestação', 'money'), F('dueDay', 'Dia de pagamento', 'num'),
  F('start', 'Início', 'date'), F('end', 'Fim previsto', 'date'), F('notes', 'Notas', 'area')
], defaults: () => ({ kind: 'Empréstimo', start: U.today() }) };

S.wishlist = { label: 'Desejo de compra', title: r => r.product, fields: [
  F('product', 'Produto', 'text', { req: 1, wide: 1 }), F('price', 'Preço', 'money', { req: 1 }), F('cat', 'Categoria', 'sel', { o: expCats }),
  F('need', 'Necessidade real', 'rating', { h: '1 = capricho · 5 = indispensável' }), F('prio', 'Prioridade', 'sel', { o: ['Alta', 'Média', 'Baixa'] }),
  F('similar', 'Já tenho algo semelhante', 'bool'), F('similarNote', 'O quê?', 'text', { show: r => r.similar }),
  F('reason', 'Motivo', 'area', { rows: 2, ph: 'Porque quero isto agora?' }), F('link', 'Link')
], defaults: () => ({ need: 3, prio: 'Média', status: 'Em espera', created: Date.now() }) };

/* ---- Investimentos ---- */
S.assets = { label: 'Ativo', title: r => r.ticker ? r.ticker + ' · ' + r.name : r.name, fields: [
  F('name', 'Nome', 'text', { req: 1 }), F('ticker', 'Ticker'), F('cls', 'Classe', 'sel', { o: L.ACLS, req: 1 }), F('broker', 'Corretora'),
  F('sym', 'Símbolo da cotação ao vivo', 'text', { show: r => !L.RFC.includes(r.cls) && r.cls !== 'Caixa em moeda estrangeira', h: 'Ex.: AAPL, VWCE.DE, PETR4.SA, EDP.LS, BTC-EUR. Preenche-se sozinho quando escolhes o ativo na pesquisa (Mercado).' }),
  F('idx', 'Rentabilidade', 'sel', { o: ['Pré-fixado', '% do CDI', 'CDI +', 'IPCA +', 'Selic +', 'Poupança'], show: r => L.RFC.includes(r.cls) && !(r.cls === 'Tesouro Direto' && r.td), h: 'Como o título rende. Em Portugal (depósitos, Certificados) usa Pré-fixado com a taxa anual.' }),
  F('rate', 'Taxa', 'num', { show: r => L.RFC.includes(r.cls) && r.idx !== 'Poupança', h: '% ao ano (pré-fixado e o "+" de IPCA/CDI/Selic) ou % do CDI (ex.: 110)' }),
  F('venc', 'Vencimento', 'date', { show: r => L.RFC.includes(r.cls) }), F('liq', 'Liquidez', 'sel', { o: ['Diária', 'No vencimento', 'D+30', 'Outra'], show: r => L.RFC.includes(r.cls) }),
  F('irx', 'Isento de imposto', 'bool', { show: r => L.RFC.includes(r.cls), h: 'LCI, LCA, poupança, Certificados de Aforro não são isentos em PT (28%).' }),
  F('td', 'Título do Tesouro Direto', 'text', { show: r => r.cls === 'Tesouro Direto', h: 'Ex.: Tesouro IPCA+ 2035. Com o nome certo, o valor segue o preço de resgate oficial (marcação a mercado).' }),
  F('mrate', 'Taxa de mercado atual (marcação a mercado)', 'num', { show: r => L.RFC.includes(r.cls) && r.cls !== 'Tesouro Direto' && ['Pré-fixado', 'IPCA +', 'CDI +', 'Selic +'].includes(r.idx), h: 'Opcional, para obrigações e debêntures negociáveis: a taxa a que o título negoceia hoje. Vazio = valor na curva.' }),
  F('mult', 'Multiplicador do contrato', 'num', { show: r => ['Opção', 'Futuro', 'CFD', 'Obrigação'].includes(r.cls), h: 'Opções EUA: 100. Opções B3: 1. Mini-índice: 0,2. Obrigações cotadas em % do nominal: 0,01.' }),
  F('under', 'Ativo subjacente', 'text', { show: r => ['Opção', 'Futuro', 'CFD'].includes(r.cls) }), F('optType', 'Tipo de opção', 'sel', { o: ['Call (compra)', 'Put (venda)'], show: r => r.cls === 'Opção' }), F('strike', 'Preço de exercício (strike)', 'num', { show: r => r.cls === 'Opção' }),
  F('alav', 'Alavancagem', 'num', { show: r => ['Futuro', 'CFD'].includes(r.cls), h: 'Ex.: 5 = 1:5. A margem é o valor da posição a dividir pela alavancagem.' }), F('margem', 'Margem depositada', 'money', { show: r => ['Futuro', 'CFD'].includes(r.cls), h: 'Opcional: se vazio, calculada pela alavancagem.' }),
  F('currency', 'Moeda', 'sel', { o: L.CUR }), F('country', 'País'), F('sector', 'Setor'),
  F('price', 'Preço atual (por unidade)', 'num', { h: 'Na moeda do ativo. Com símbolo ao vivo atualiza sozinho.', show: r => !L.RFC.includes(r.cls) }), F('priceDate', 'Data do preço', 'date', { show: r => !L.RFC.includes(r.cls) }),
  F('target', 'Alocação alvo', 'pct'), F('notes', 'Notas', 'area', { rows: 2 })
], defaults: () => ({ cls: 'ETF', currency: 'EUR', priceDate: U.today() }) };
L.INC = ['Dividendo', 'JCP', 'Rendimento', 'Juros', 'Aluguer'];
L.QTX = ['Compra', 'Venda', 'Bonificação', 'Subscrição', 'Transferência (entrada)', 'Transferência (saída)'];
S.invtx = { label: 'Movimento de investimento', title: r => r.type, fields: [
  rel('asset', 'Ativo', 'assets', { req: 1 }), F('type', 'Tipo', 'sel', { o: ['Compra', 'Venda', 'Dividendo', 'JCP', 'Rendimento', 'Juros', 'Aluguer', 'Amortização', 'Bonificação', 'Desdobramento/Grupamento', 'Subscrição', 'Transferência (entrada)', 'Transferência (saída)', 'Taxa'], req: 1, h: 'Rendimento = FII/REIT. Juros = cupões e juros de renda fixa. Aluguer = empréstimo de ações. Venda sem ter o ativo = venda a descoberto.' }), F('date', 'Data', 'date', { req: 1 }),
  F('qty', 'Quantidade', 'num', { show: r => L.QTX.includes(r.type), h: 'Opções/futuros: número de contratos. Tesouro: número de títulos (pode ter decimais).' }),
  F('price', 'Preço unitário', 'num', { show: r => L.QTX.includes(r.type), h: r => r.type === 'Bonificação' ? 'Custo atribuído por ação (pode ser 0)' : /Transferência/.test(r.type) ? 'Preço médio que tinhas na outra corretora' : '' }),
  F('ratio', 'Fator', 'num', { show: r => r.type === 'Desdobramento/Grupamento', h: 'Desdobramento 1 → 2: escreve 2. Grupamento 10 → 1: escreve 0,1.' }),
  F('amount', 'Valor bruto', 'money', { show: r => !L.QTX.includes(r.type) && r.type !== 'Desdobramento/Grupamento' }),
  F('tax', 'Imposto retido na fonte', 'money', { show: r => L.INC.includes(r.type), h: 'JCP no Brasil: 15%. Dividendos dos EUA: 15–30%. Em Portugal: 28% (ou 25% retido).' }),
  F('fees', 'Comissões', 'money', { show: r => r.type !== 'Desdobramento/Grupamento' }),
  rel('account', 'Conta de dinheiro', 'accounts', { h: 'Debita/credita esta conta (ex.: corretora)', show: r => !['Bonificação', 'Desdobramento/Grupamento', 'Transferência (entrada)', 'Transferência (saída)'].includes(r.type) }), F('note', 'Nota')
], defaults: () => ({ type: 'Compra', date: U.today() }) };

/* ---- Universidade ---- */
S.subjects = { label: 'Disciplina', title: r => r.name, fields: [
  F('name', 'Disciplina', 'text', { req: 1, wide: 1 }), F('sem', 'Semestre', 'sel', { o: L.SEM }), F('status', 'Estado', 'sel', { o: ['Em curso', 'Plano', 'Aprovada', 'Reprovada', 'Em atraso'] }),
  F('ects', 'ECTS', 'num'), F('target', 'Nota alvo', 'num', { h: '0–20' }), F('final', 'Nota final', 'num'),
  F('hoursWeek', 'Horas de estudo alvo / semana', 'num'), F('diff', 'Dificuldade', 'sel', { o: ['Baixa', 'Média', 'Alta'] }),
  F('prof', 'Professor(a)'), F('mail', 'Palavras dos e-mails', 'text', { h: 'Sigla, código da cadeira ou e-mail do professor, separados por vírgula: servem para separar os e-mails da faculdade por matéria' }), F('room', 'Sala'), F('notes', 'Notas', 'area', { rows: 2 })
], defaults: () => ({ sem: '1.º Semestre 26/27', status: 'Em curso', target: 15, ects: 6, hoursWeek: 4, diff: 'Média' }) };
S.classes = { label: 'Aula', title: r => (OS.get('subjects', r.subject) || {}).name || 'Aula', fields: [
  rel('subject', 'Disciplina', 'subjects', { req: 1, filter: s => s.status === 'Em curso' }), F('wday', 'Dia', 'sel', { o: L.WEEK, req: 1 }),
  F('start', 'Início', 'time', { req: 1 }), F('end', 'Fim', 'time', { req: 1 }), F('kind', 'Tipo', 'sel', { o: ['Teórica', 'Prática', 'Teórico-prática', 'Tutorial'] }), F('room', 'Sala')
], defaults: () => ({ wday: '1', kind: 'Teórica' }) };
S.topics = { label: 'Conteúdo', title: r => r.title, fields: [
  rel('subject', 'Disciplina', 'subjects', { req: 1 }), F('title', 'Conteúdo / matéria', 'text', { req: 1, wide: 1 }),
  F('status', 'Estado', 'sel', { o: ['Por estudar', 'Estudado', 'Revisto', 'Dominado'] }), F('studiedAt', 'Estudado em', 'date'), F('notes', 'Notas', 'area', { rows: 2 })
], defaults: () => ({ status: 'Por estudar' }), after: r => OS.St.topicAfter(r) };
S.assessments = { label: 'Avaliação', title: r => r.title, fields: [
  F('title', 'Avaliação', 'text', { req: 1, wide: 1 }), rel('subject', 'Disciplina', 'subjects', { req: 1 }), F('type', 'Tipo', 'sel', { o: ['Teste', 'Exame', 'Exame de recurso', 'Trabalho', 'Apresentação', 'Mini-teste', 'Projeto'] }),
  F('date', 'Data / entrega', 'date', { req: 1 }), F('time', 'Hora', 'time'), F('weight', 'Peso', 'pct'), F('grade', 'Nota (0–20)', 'num'),
  F('prep', 'Preparação', 'sel', { o: ['Não comecei', 'A preparar', 'Pronto', 'Feito'] }), F('content', 'Matéria', 'area', { rows: 2 })
], defaults: () => ({ type: 'Teste', prep: 'Não comecei' }) };
S.sessions = { label: 'Sessão de estudo', title: r => (OS.get('subjects', r.subject) || OS.get('skills', r.skill) || {}).name || 'Sessão', fields: [
  F('date', 'Data', 'date', { req: 1 }), F('minutes', 'Minutos', 'num', { req: 1 }), rel('subject', 'Disciplina', 'subjects', { filter: s => s.status === 'Em curso' }), rel('skill', 'Ou competência', 'skills'),
  F('type', 'Tipo', 'sel', { o: ['Estudo profundo', 'Exercícios', 'Revisão', 'Leitura', 'Aula', 'Simulado'] }), F('focus', 'Foco', 'rating'),
  F('distractions', 'Distrações', 'num'), F('phone', 'Telemóvel longe', 'bool'), F('learned', 'O que aprendi', 'area', { rows: 2 }), F('doubts', 'Dúvidas', 'area', { rows: 2 })
], defaults: () => ({ date: U.today(), type: 'Estudo profundo', phone: true, focus: 4 }) };
S.reviews = { label: 'Revisão espaçada', title: r => r.topic, fields: [
  F('topic', 'Tópico', 'text', { req: 1, wide: 1 }), rel('subject', 'Disciplina', 'subjects'), F('studied', 'Estudado em', 'date', { req: 1 }),
  F('r1', 'R1 (24 h) feita', 'bool'), F('r2', 'R2 (7 dias) feita', 'bool'), F('r3', 'R3 (30 dias) feita', 'bool'), F('mastery', 'Domínio', 'sel', { o: ['Fraco', 'Médio', 'Dominado'] })
], defaults: () => ({ studied: U.today(), mastery: 'Fraco' }) };
S.errors = { label: 'Erro', title: r => r.title, fields: [
  F('title', 'Erro', 'text', { req: 1, wide: 1 }), rel('subject', 'Disciplina', 'subjects'), F('date', 'Data', 'date'),
  F('type', 'Tipo de erro', 'sel', { o: ['Não sabia a matéria', 'Distração', 'Interpretação', 'Cálculo', 'Falta de tempo'] }),
  F('why', 'Porque errei', 'area', { rows: 2 }), F('right', 'Resposta certa', 'area', { rows: 2 }), F('rule', 'Regra para não repetir', 'area', { rows: 2 }), F('redone', 'Refeito sem errar', 'bool')
], defaults: () => ({ date: U.today() }) };

/* ---- Aprendizagem ---- */
S.skills = { label: 'Competência', title: r => r.name, fields: [
  F('name', 'Competência / o que queres aprender', 'text', { req: 1, wide: 1, h: 'Ex.: Tocar violão, Excel, Inglês, Cozinhar, Nadar, Falar em público' }), F('area', 'Área', 'sel', { o: ['Música', 'Línguas', 'Desporto & corpo', 'Arte & criatividade', 'Culinária', 'Fé & ministério', 'Comunicação', 'Liderança', 'Dados & Programação', 'Tecnologia', 'Contabilidade', 'Finanças', 'Economia', 'Gestão', 'Empreendedorismo', 'Vida prática', 'Hobby', 'Outro'] }),
  F('level', 'Nível atual', 'rating', { h: '1 iniciante · 5 domínio' }), F('targetLevel', 'Nível alvo', 'rating'), F('stage', 'Etapa da trilha', 'sel', { o: L.TRACK }),
  F('why', 'Para quê', 'area', { rows: 2 }), F('plan', 'Conteúdos da trilha', 'steps')
], defaults: () => ({ level: 1, targetLevel: 4, stage: 'Conteúdos', plan: [] }) };
S.learn = { label: 'Item de aprendizagem', title: r => r.title, fields: [
  F('title', 'Título', 'text', { req: 1, wide: 1 }), F('kind', 'Tipo', 'sel', { o: ['Curso', 'Livro', 'Certificação', 'Artigo', 'Projeto prático', 'Vídeo / palestra'], req: 1 }),
  F('status', 'Estado', 'sel', { o: ['Na fila', 'Em curso', 'Concluído', 'Abandonado'] }), rel('skill', 'Competência', 'skills'), F('author', 'Autor / plataforma'),
  F('total', 'Total', 'num'), F('done', 'Feito', 'num'), F('unit', 'Unidade', 'sel', { o: ['páginas', 'aulas', 'capítulos', 'horas', 'módulos'] }),
  F('start', 'Início', 'date'), F('end', 'Fim', 'date'), F('rating', 'Nota (1–10)', 'num'), F('url', 'Link'), F('lesson', 'Lição principal', 'area', { rows: 2 })
], defaults: () => ({ kind: 'Livro', status: 'Na fila', unit: 'páginas' }), after: (r) => { if (r.status === 'Concluído' && !r.end) OS.upd('learn', r.id, { end: U.today() }, { silent: true }); } };

/* ---- Corpo ---- */
S.exercises = { label: 'Exercício', title: r => r.name, fields: [
  F('name', 'Exercício', 'text', { req: 1, wide: 1 }), F('muscle', 'Músculo principal', 'sel', { o: L.MUSCLES, req: 1 }), F('secondary', 'Secundários', 'multi', { o: L.MUSCLES }),
  F('equip', 'Equipamento', 'sel', { o: ['Barra', 'Halteres', 'Máquina', 'Cabo', 'Peso corporal', 'Kettlebell', 'Outro'] }), F('notes', 'Notas', 'area', { rows: 2 })
] };
OS.SHARD.workouts = 60;
S.workouts = { label: 'Treino', title: r => r.title || 'Treino', fields: [
  F('date', 'Data', 'date', { req: 1 }), F('title', 'Treino', 'text', { list: () => Object.values(OS.one('fit').split) }), F('dur', 'Duração', 'num', { unit: 'min' }),
  F('rpe', 'Esforço da sessão (RPE)', 'num', { h: '1–10' }), F('bw', 'Peso corporal', 'num', { unit: 'kg' }),
  F('items', 'Exercícios e séries', 'custom', { wide: 1, render: r => OS.Fit.editor(r), read: (form) => OS.Fit.readEditor(form) }),
  F('notes', 'Notas', 'area', { rows: 2 })
], defaults: () => ({ date: U.today(), title: OS.one('fit').split[new Date().getDay()] || '', items: [] }),
  after: r => { if (U.num(r.bw)) { const ex = OS.all('body').find(b => b.date === r.date); if (ex) OS.upd('body', ex.id, { weight: r.bw }, { silent: true }); else OS.add('body', { date: r.date, weight: r.bw }, { silent: true }); } } };
S.body = { label: 'Medição corporal', title: r => U.fmtD(r.date), fields: [F('date', 'Data', 'date', { req: 1 }), F('weight', 'Peso', 'num', { unit: 'kg', req: 1 }), F('waist', 'Cintura', 'num', { unit: 'cm' }), F('bf', 'Gordura corporal', 'pct'), F('notes', 'Notas')], defaults: () => ({ date: U.today() }) };
S.runs = { label: 'Corrida', title: r => U.r2(U.num(r.km)) + ' km · ' + (r.type || ''), fields: [
  F('date', 'Data', 'date', { req: 1 }), F('type', 'Tipo', 'sel', { o: L.RUNT, req: 1 }), F('km', 'Distância', 'num', { unit: 'km', req: 1 }), F('time', 'Tempo', 'dur', { req: 1, ph: '25:30' }),
  F('hr', 'FC média', 'num', { unit: 'bpm' }), F('hrMax', 'FC máxima', 'num', { unit: 'bpm' }), F('elev', 'Desnível', 'num', { unit: 'm' }), F('feel', 'Sensação', 'rating'), F('notes', 'Observações', 'area', { rows: 2 })
], defaults: () => ({ date: U.today(), type: 'Rodagem', feel: 3 }) };
S.runplan = { label: 'Treino de corrida planeado', title: r => r.type, fields: [
  F('wday', 'Dia', 'sel', { o: L.WEEK, req: 1 }), F('type', 'Tipo', 'sel', { o: L.RUNT, req: 1 }), F('km', 'Distância alvo', 'num', { unit: 'km' }), F('mins', 'Ou duração', 'num', { unit: 'min' }),
  F('desc', 'Descrição', 'text', { wide: 1, ph: 'ex.: 6 × 400 m a ritmo de 5 km, 90 s de recuperação' }), F('active', 'Ativo', 'bool')
], defaults: () => ({ active: true, wday: '6', type: 'Rodagem' }) };

/* ---- Trabalho e carreira ---- */
S.shifts = { label: 'Turno', title: r => U.fmtD(r.date) + ' ' + (r.start || ''), fields: [
  F('date', 'Data', 'date', { req: 1 }), F('start', 'Entrada', 'time', { req: 1 }), F('end', 'Saída', 'time', { req: 1 }), F('breakMin', 'Pausa', 'num', { unit: 'min' }),
  F('place', 'Local'), F('role', 'Função'), F('rate', 'Valor por hora', 'money', { h: 'Vazio = valor do perfil' }), F('notes', 'Notas')
], defaults: () => ({ date: U.today(), breakMin: 0 }) };
S.applications = { label: 'Candidatura', title: r => r.company, fields: [
  F('company', 'Empresa / instituição', 'text', { req: 1 }), F('role', 'Cargo'), F('date', 'Data de envio', 'date'),
  F('status', 'Estado', 'sel', { o: ['Por enviar', 'Enviada', 'Entrevista', 'Proposta', 'Recusada', 'Aceite', 'Sem resposta'] }),
  F('interview', 'Data da entrevista', 'date', { show: r => ['Entrevista', 'Proposta'].includes(r.status) }), F('next', 'Próximo passo'), F('link', 'Link'), F('notes', 'Notas', 'area', { rows: 2 })
], defaults: () => ({ status: 'Por enviar', date: U.today() }) };
S.contacts = { label: 'Contacto', title: r => r.name, fields: [
  F('name', 'Nome', 'text', { req: 1 }), F('org', 'Organização'), F('role', 'Cargo / descrição'), F('how', 'Como conheci'),
  F('strength', 'Força da relação', 'rating'), F('last', 'Último contacto', 'date'), F('next', 'Próximo follow-up', 'date'), F('contact', 'Telefone / email'), F('tags', 'Tags', 'tags'), F('notes', 'Notas', 'area', { rows: 2 })
], defaults: () => ({ strength: 2, last: U.today() }) };
S.experiences = { label: 'Experiência', title: r => r.title, fields: [
  F('title', 'Título', 'text', { req: 1, wide: 1 }), F('org', 'Organização'), F('kind', 'Tipo', 'sel', { o: ['Emprego', 'Voluntariado', 'Projeto', 'Evento', 'Liderança', 'Competição', 'Palestra'] }),
  F('start', 'Início', 'date'), F('end', 'Fim', 'date'), F('skills', 'Competências usadas', 'tags'), F('desc', 'Descrição / resultados', 'area')
], defaults: () => ({ kind: 'Emprego' }) };
S.opps = { label: 'Oportunidade', title: r => r.name, fields: [
  F('name', 'Nome', 'text', { req: 1, wide: 1 }), F('inst', 'Instituição'), F('kind', 'Tipo', 'sel', { o: ['Curso', 'Certificação', 'Evento', 'Palestra', 'Programa universitário', 'Estágio', 'Emprego', 'Projeto', 'Competição', 'Networking', 'Bolsa', 'Negócio'] }),
  F('area', 'Área', 'sel', { o: L.AREAS }), F('deadline', 'Prazo', 'date'), F('status', 'Estado', 'sel', { o: ['Identificada', 'A preparar', 'Submetida', 'Em avaliação', 'Aceite', 'Recusada', 'Perdida', 'Descartada'] }),
  F('prio', 'Prioridade', 'sel', { o: L.PRIO }), F('next', 'Próxima ação', 'text', { wide: 1 }), F('reqs', 'Requisitos', 'area', { rows: 2 }), F('benefits', 'Benefícios', 'area', { rows: 2 }), F('link', 'Link')
], defaults: () => ({ status: 'Identificada', prio: '3' }) };

/* ---- Mova ---- */
S.mvsales = { label: 'Venda', title: r => r.desc || 'Venda', fields: [
  F('date', 'Data', 'date', { req: 1 }), rel('client', 'Cliente', 'mvclients'), rel('product', 'Produto / serviço', 'mvproducts'), F('desc', 'Descrição'),
  F('qty', 'Quantidade', 'num'), F('price', 'Preço unitário', 'money', { req: 1 }), F('cost', 'Custo unitário', 'money', { h: 'Vazio = custo do produto' }),
  F('status', 'Pagamento', 'sel', { o: ['Pago', 'Pendente', 'Cancelado'] }), F('dueDate', 'Receber até', 'date', { show: r => r.status === 'Pendente' }), F('channel', 'Canal'), F('notes', 'Notas')
], defaults: () => ({ date: U.today(), qty: 1, status: 'Pago' }),
  validate: d => U.num(d.price) < 0 ? 'Preço inválido.' : null };
S.mvexp = { label: 'Despesa da Mova', title: r => r.desc || r.cat, fields: [
  F('date', 'Data', 'date', { req: 1 }), F('amount', 'Valor', 'money', { req: 1 }), F('cat', 'Categoria', 'sel', { o: ['Produto / material', 'Marketing', 'Ferramentas / software', 'Transporte', 'Impostos / taxas', 'Serviços', 'Outros'] }),
  F('desc', 'Descrição'), F('recurring', 'Recorrente', 'bool')
], defaults: () => ({ date: U.today(), cat: 'Outros' }) };
S.mvclients = { label: 'Cliente', title: r => r.name, fields: [
  F('name', 'Nome', 'text', { req: 1 }), F('contact', 'Contacto'), F('source', 'Origem', 'sel', { o: ['Indicação', 'Instagram', 'WhatsApp', 'Presencial', 'Site', 'LinkedIn', 'Outro'] }),
  F('status', 'Estado', 'sel', { o: ['Lead', 'Proposta', 'Ativo', 'Inativo', 'Perdido'] }), F('since', 'Desde', 'date'), F('next', 'Próximo contacto', 'date'), F('notes', 'Notas', 'area', { rows: 2 })
], defaults: () => ({ status: 'Lead', since: U.today() }) };
S.mvproducts = { label: 'Produto / serviço', title: r => r.name, fields: [F('name', 'Nome', 'text', { req: 1 }), F('price', 'Preço', 'money'), F('cost', 'Custo unitário', 'money'), F('active', 'Ativo', 'bool'), F('desc', 'Descrição', 'area', { rows: 2 })], defaults: () => ({ active: true }) };
S.mvmkt = { label: 'Ação de marketing', title: r => r.action, fields: [
  F('date', 'Data', 'date', { req: 1 }), F('channel', 'Canal', 'sel', { o: ['Instagram', 'TikTok', 'WhatsApp', 'LinkedIn', 'Presencial', 'Parcerias', 'Anúncios', 'Outro'] }), F('action', 'Ação', 'text', { req: 1 }),
  F('cost', 'Custo', 'money'), F('leads', 'Leads', 'num'), F('conv', 'Conversões', 'num'), F('notes', 'Notas')
], defaults: () => ({ date: U.today() }) };

/* ---- Recompensas reais (usadas pelo Dominus) ---- */
S.rewards = { label: 'Recompensa', title: r => r.title, fields: [
  F('title', 'Recompensa', 'text', { req: 1, wide: 1 }), F('desc', 'Descrição', 'area', { rows: 2 }),
  F('cond', 'Como se ganha', 'sel', { o: [['merit', 'Trocar por Méritos'], ['level', 'Nível total'], ['rank', 'Título (1 Recruta … 8 Dominus)'], ['legacy', 'Marcos do Codex'], ['ach', 'Conquistas']], req: 1 }),
  F('value', 'Valor (méritos, nível, título…)', 'num', { req: 1 })
], defaults: () => ({ cond: 'merit', value: 5 }) };

/* ================= LÓGICA DE DOMÍNIO ================= */

/* ---- Tarefas ---- */
const Tasks = OS.Tasks = {};
Tasks.open = () => OS.all('tasks').filter(t => t.status !== 'Feita');
Tasks.late = t => t.status !== 'Feita' && t.due && t.due < U.today();
Tasks.afterSave = (r, isNew) => {
  if (r.status === 'Feita' && !r.doneAt) {
    OS.upd('tasks', r.id, { doneAt: U.today() }, { silent: true });
    if (r.recur && r.recur !== 'Não') {
      const base = r.due || r.sched || U.today();
      const next = r.recur === 'Diária' ? U.addDays(base, 1) : r.recur === 'Semanal' ? U.addDays(base, 7) : U.addMonths(U.ym(base), 1) + base.slice(7);
      const c = Object.assign({}, r); ['id', '_c', '_u', '_s', 'doneAt'].forEach(k => delete c[k]);
      OS.add('tasks', Object.assign(c, { status: 'Próxima', due: r.due ? next : '', sched: r.sched ? next : '' }), { silent: true });
    }
  }
  if (r.status !== 'Feita' && r.doneAt) OS.upd('tasks', r.id, { doneAt: '' }, { silent: true });
};
Tasks.complete = id => { const t = OS.get('tasks', id); if (!t) return; OS.upd('tasks', id, { status: 'Feita' }); Tasks.afterSave(OS.get('tasks', id)); };
Tasks.quickParse = str => { // "Rever balanço @Universidade !1 amanhã"
  const o = { ctx: [], status: 'Inbox', prio: '3', impact: 3, effort: '30' };
  let s = ' ' + str + ' ';
  s = s.replace(/\s@(\w+)/g, (m, c) => { const hit = L.CTX.find(x => x.slice(1).toLowerCase() === c.toLowerCase()); if (hit) o.ctx.push(hit); return ' '; });
  s = s.replace(/\s!([1-4])/g, (m, p) => { o.prio = p; return ' '; });
  s = s.replace(/\s#([^\s#@!]+)/g, (m, k) => { const n = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''), kk = n(k), P = OS.all('projects').filter(p => !['Concluído', 'Cancelado'].includes(p.status)); const hit = kk && (P.find(p => n(p.name) === kk) || P.find(p => n(p.name).startsWith(kk)) || P.find(p => n(p.name).includes(kk))); if (hit) { o.project = hit.id; return ' '; } return m; });
  if (/\shoje\s/i.test(s)) { o.sched = U.today(); o.status = 'Próxima'; s = s.replace(/\shoje\s/i, ' '); }
  if (/\samanhã\s/i.test(s)) { o.sched = U.addDays(U.today(), 1); o.status = 'Próxima'; s = s.replace(/\samanhã\s/i, ' '); }
  o.title = s.trim().replace(/\s+/g, ' ');
  if (o.ctx.includes('@Universidade') || o.ctx.includes('@Estudos')) o.area = 'Universidade';
  if (o.ctx.includes('@Mova')) o.area = 'Mova';
  if (o.ctx.includes('@Financeiro')) o.area = 'Finanças';
  if (o.ctx.includes('@Trabalho')) o.area = 'Trabalho';
  return o;
};

/* ---- Hábitos ---- */
const Hab = OS.Hab = {};
Hab.due = (h, d) => { if (!h.active) return false; const wd = U.parse(d).getDay(); if (h.freq === 'Dias úteis') return wd >= 1 && wd <= 5; return true; };
Hab.autoDone = (h, d) => {
  switch (h.auto) {
    case 'study100': return U.sum(OS.all('sessions').filter(s => s.date === d), s => s.minutes) >= 100;
    case 'workout': return OS.all('workouts').some(w => w.date === d) || OS.all('runs').some(r => r.date === d);
    case 'cash': return OS.all('transactions').some(t => t.date === d);
    case 'review': return OS.all('reviews').some(r => [r.r1At, r.r2At, r.r3At].includes(d));
    default: return false;
  }
};
Hab.done = (h, d) => !!(h.log && h.log[d]) || Hab.autoDone(h, d);
Hab.toggle = (id, d) => { const h = OS.get('habits', id); if (!h || (d && d !== U.today())) return; const log = Object.assign({}, h.log || {}); if (log[d]) delete log[d]; else log[d] = 1; OS.upd('habits', id, { log }); };
Hab.streak = h => { let d = U.today(), s = 0; if (!Hab.done(h, d)) d = U.addDays(d, -1); for (let i = 0; i < 800; i++) { if (!Hab.due(h, d)) { d = U.addDays(d, -1); continue; } if (!Hab.done(h, d)) break; s++; d = U.addDays(d, -1); } return s; };
Hab.rate = (h, days) => { const ds = U.lastN(days).filter(d => Hab.due(h, d) && (!h._c || d >= U.iso(new Date(h._c)))); if (h.freq === 'X por semana') { const wks = Math.max(1, days / 7); const done = U.lastN(days).filter(d => Hab.done(h, d)).length; return Math.min(1, done / (wks * (U.num(h.perWeek) || 1))); } return ds.length ? ds.filter(d => Hab.done(h, d)).length / ds.length : 0; };
Hab.dayScore = d => { const hs = OS.all('habits').filter(h => h.active && Hab.due(h, d) && h.freq !== 'X por semana'); return hs.length ? hs.filter(h => Hab.done(h, d)).length / hs.length : null; };
Hab.perfectStreak = () => { const core = OS.all('habits').filter(h => h.active && h.core); if (!core.length) return 0; let d = U.today(), s = 0; const ok = x => core.filter(h => Hab.due(h, x)).every(h => Hab.done(h, x)); if (!ok(d)) d = U.addDays(d, -1); for (let i = 0; i < 800 && ok(d); i++) { s++; d = U.addDays(d, -1); } return s; };

/* ---- Finanças ---- */
const Fin = OS.Fin = {};
Fin.cats = type => OS.one('fin').cats[type] || {};
const curOf = id => { const a = id && OS.get('accounts', id); return (a && a.currency) || 'EUR'; };
Fin.curOf = curOf;
Fin.accBal = (a, upTo) => {
  let b = U.num(a.opening);
  const from = a.openSet && a.openDate ? a.openDate : ''; // com o saldo inicial definido, o que é anterior já está dentro dele
  OS.all('transactions').forEach(t => { if (upTo && t.date > upTo) return; if (t.date > U.today() && !upTo) return; if (from && t.date < from) return; const v = U.num(t.amount);
    if (t.type === 'Receita' && t.account === a.id) b += v; else if (t.type === 'Despesa' && t.account === a.id) b -= v;
    else if (t.type === 'Transferência') { if (t.account === a.id) b -= v; if (t.toAccount === a.id) b += U.num(t.toAmount) || (curOf(t.account) === (a.currency || 'EUR') ? v : v * (Inv.fx(curOf(t.account)) || 1) / (Inv.fx(a.currency) || 1)); } });
  const accFx = Inv.fx(a.currency) || 1; // os ativos passam para a moeda da conta (e não para euros)
  OS.all('invtx').forEach(t => { if (t.account !== a.id) return; if (upTo && t.date > upTo) return; if (from && t.date < from) return; const gross = ['Compra', 'Venda', 'Subscrição'].includes(t.type) ? U.num(t.qty) * U.num(t.price) * (U.num((OS.get('assets', t.asset) || {}).mult) || 1) : U.num(t.amount);
    const fx = Inv.fx((OS.get('assets', t.asset) || {}).currency) / accFx;
    if (['Bonificação', 'Desdobramento/Grupamento', 'Transferência (entrada)', 'Transferência (saída)'].includes(t.type)) return; if (t.type === 'Compra' || t.type === 'Subscrição') b -= gross * fx + U.num(t.fees); else if (t.type === 'Venda') b += gross * fx - U.num(t.fees); else if (t.type === 'Taxa') b -= U.num(t.amount) + U.num(t.fees); else b += (U.num(t.amount) - U.num(t.tax)) * fx - U.num(t.fees); });
  return b;
};
Fin.accBalE = (a, upTo) => Fin.accBal(a, upTo) * (Inv.fx(a.currency) || 1);   // o saldo em euros (para somar contas de moedas diferentes)
Fin.accounts = () => OS.all('accounts').filter(a => !a.archived);
Fin.liquid = () => U.sum(Fin.accounts().filter(a => ['Conta à ordem', 'Dinheiro', 'Poupança'].includes(a.type)), a => Fin.accBalE(a));
Fin.reserve = () => U.sum(Fin.accounts().filter(a => a.type === 'Reserva'), a => Fin.accBalE(a));
Fin.cardDebt = () => -U.sum(Fin.accounts().filter(a => a.type === 'Cartão de crédito'), a => Math.min(0, Fin.accBalE(a)));
Fin.debtBal = d => Math.max(0, U.num(d.principal) - U.sum(OS.all('transactions').filter(t => t.debt === d.id && t.date <= U.today()), t => t.amount));
Fin.debtsTotal = () => U.sum(OS.all('debts'), Fin.debtBal);
Fin.cashTotal = () => U.sum(OS.all('accounts'), a => Fin.accBalE(a));
Fin.netWorth = () => Fin.cashTotal() + Inv.value() - Fin.debtsTotal();
const toE = (L) => { const cur = {}; let other = false; OS.all('accounts').forEach(a => { cur[a.id] = a.currency || 'EUR'; if (cur[a.id] !== 'EUR') other = true; }); if (!other) return L;
  return L.map(t => { const c = cur[t.account] || 'EUR'; return c === 'EUR' ? t : Object.assign({}, t, { amount: U.num(t.amount) * (Inv.fx(c) || 1), amountOrig: t.amount, curOrig: c }); }); };
Fin.tx = (from, to, f = {}) => toE(OS.all('transactions').filter(t => t.date >= from && t.date <= to && (!f.type || t.type === f.type) && (!f.cat || t.cat === f.cat) && (!f.account || t.account === f.account || t.toAccount === f.account) && (!f.method || t.method === f.method) && (!f.tag || (t.tags || []).includes(f.tag)) && (!f.q || ((t.desc || '') + ' ' + (t.note || '') + ' ' + (t.cat || '') + ' ' + (t.sub || '')).toLowerCase().includes(f.q.toLowerCase()))));
Fin.isInvestAcc = id => { const a = OS.get('accounts', id); return a && ['Corretora', 'Reserva', 'Poupança'].includes(a.type); };
Fin.month = ym => {
  const from = ym + '-01', to = ym + '-' + U.pad(U.dim(ym)), txs = Fin.tx(from, to);
  const inc = U.sum(txs.filter(t => t.type === 'Receita'), t => t.amount), exp = U.sum(txs.filter(t => t.type === 'Despesa'), t => t.amount);
  const saved = U.sum(txs.filter(t => t.type === 'Transferência' && Fin.isInvestAcc(t.toAccount) && !Fin.isInvestAcc(t.account)), t => t.amount);
  const sup = U.sum(txs.filter(t => t.type === 'Despesa' && t.ess === 'Supérfluo'), t => t.amount);
  return { ym, inc, exp, net: inc - exp, rate: inc ? (inc - exp) / inc : 0, investRate: inc ? saved / inc : 0, saved, sup, n: txs.length, txs };
};
Fin.months = n => Array.from({ length: n }, (_, i) => U.addMonths(U.ym(U.today()), i - n + 1));
Fin.byCat = (from, to, type = 'Despesa', f = {}) => { const o = {}; Fin.tx(from, to, Object.assign({}, f, { type })).forEach(t => { o[t.cat || 'Sem categoria'] = (o[t.cat || 'Sem categoria'] || 0) + U.num(t.amount); }); return Object.entries(o).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v); };
Fin.spentCat = (cat, ym) => U.sum(Fin.tx(ym + '-01', ym + '-31', { type: 'Despesa', cat }), t => t.amount);
Fin.recurDue = (r, ym) => { // data de vencimento no mês (mensal/anual)
  if (!r.active) return null; if (r.freq === 'Anual' && +r.month !== +ym.slice(5, 7)) return null;
  if (r.freq === 'Semanal') return null;
  const d = ym + '-' + U.pad(Math.min(U.dim(ym), U.num(r.day) || 1));
  if (r.start && d < r.start.slice(0, 7) + '-01') return null; if (r.end && d > r.end) return null; return d;
};
Fin.recurPaid = (r, ym) => OS.all('transactions').some(t => t.recurring === r.id && U.ym(t.date) === ym);
Fin.upcoming = (days = 30) => { // compromissos futuros: recorrentes por pagar + parcelas + prestações
  const t0 = U.today(), t1 = U.addDays(t0, days), out = [];
  OS.all('recurring').forEach(r => { [U.ym(t0), U.ym(t1)].filter((v, i, a) => a.indexOf(v) === i).forEach(ym => { const d = Fin.recurDue(r, ym); if (d && d <= t1 && !Fin.recurPaid(r, ym) && (d >= U.addDays(t0, -10))) out.push({ date: d, title: r.name, amount: r.type === 'Receita' ? U.num(r.amount) : -U.num(r.amount), kind: r.kind, rec: r, late: d < t0 }); }); });
  OS.all('transactions').filter(t => t.date > t0 && t.date <= t1).forEach(t => out.push({ date: t.date, title: (t.desc || t.cat) + (t.instN ? ` (${t.instI}/${t.instN})` : ''), amount: t.type === 'Receita' ? U.num(t.amount) : t.type === 'Despesa' ? -U.num(t.amount) : 0, kind: t.instN ? 'Parcela' : 'Agendado', tx: t }));
  OS.all('debts').forEach(d => { if (!U.num(d.dueDay) || !U.num(d.installment) || Fin.debtBal(d) <= 0) return; [U.ym(t0), U.ym(t1)].filter((v, i, a) => a.indexOf(v) === i).forEach(ym => { const dt = ym + '-' + U.pad(Math.min(U.dim(ym), U.num(d.dueDay))); const paid = OS.all('transactions').some(t => t.debt === d.id && U.ym(t.date) === ym); if (!paid && dt >= U.addDays(t0, -10) && dt <= t1) out.push({ date: dt, title: 'Prestação · ' + d.name, amount: -U.num(d.installment), kind: 'Dívida', debt: d, late: dt < t0 }); }); });
  return U.sortBy(out, x => x.date);
};
Fin.payRecurring = (r, ym) => { const d = Fin.recurDue(r, ym) || U.today(); return OS.add('transactions', { type: r.type, amount: U.num(r.amount), date: d > U.today() ? U.today() : d, desc: r.name, account: r.account || (Fin.accounts()[0] || {}).id, cat: r.cat, sub: r.sub, method: r.method, ess: r.ess, recurring: r.id, tags: [] }); };
Fin.afterTx = (r, isNew) => {
  if (isNew && r.type === 'Despesa' && U.num(r.inst) > 1 && !r.instG) {
    const n = Math.round(U.num(r.inst)), per = U.r2(U.num(r.amount) / n), g = U.uid();
    OS.upd('transactions', r.id, { amount: per, instG: g, instI: 1, instN: n, inst: '' }, { silent: true });
    for (let i = 2; i <= n; i++) { const ym = U.addMonths(U.ym(r.date), i - 1); const d = ym + '-' + U.pad(Math.min(U.dim(ym), +r.date.slice(8, 10))); const c = Object.assign({}, r); ['id', '_c', '_u', '_s'].forEach(k => delete c[k]); OS.add('transactions', Object.assign(c, { amount: per, date: d, instG: g, instI: i, instN: n, inst: '' }), { silent: true }); }
    OS.UI.toast(`${n} parcelas de ${U.eur(per)} criadas`, 'pos');
  }
  if (isNew && r.type === 'Despesa' && r.ess === 'Supérfluo') OS.UI.toast('Supérfluo registado. Regra: o mesmo valor vai para a poupança.', 'warn');
  const b = OS.all('budgets').find(x => x.cat === r.cat);
  if (b && r.type === 'Despesa') { const sp = Fin.spentCat(r.cat, U.ym(r.date)); if (sp > U.num(b.limit)) setTimeout(() => OS.UI.toast(`Orçamento de ${r.cat} ultrapassado: ${U.eur(sp)} de ${U.eur(b.limit)}`, 'neg'), 900); }
};
Fin.avgMonthly = (months = 3, field = 'exp') => { const ms = Fin.months(months + 1).slice(0, -1); const vals = ms.map(m => Fin.month(m)[field]).filter((v, i) => Fin.month(ms[i]).n > 0); return vals.length ? U.avg(vals) : null; };
Fin.fixedMonthly = () => U.sum(OS.all('recurring').filter(r => r.active && r.type === 'Despesa'), r => r.freq === 'Anual' ? U.num(r.amount) / 12 : r.freq === 'Semanal' ? U.num(r.amount) * 52 / 12 : U.num(r.amount));
Fin.recurIncome = () => U.sum(OS.all('recurring').filter(r => r.active && r.type === 'Receita'), r => r.freq === 'Anual' ? U.num(r.amount) / 12 : r.freq === 'Semanal' ? U.num(r.amount) * 52 / 12 : U.num(r.amount));
Fin.hourly = () => { const p = OS.one('profile'); if (U.num(p.hourly)) return U.num(p.hourly); const sh = OS.all('shifts').filter(s => U.num(s.rate)); return sh.length ? U.avg(sh, s => s.rate) : 0; };
Fin.snapshot = () => { // guarda um retrato mensal do patrimônio (um por mês, atualizado no máximo 1×/dia)
  const ym = U.ym(U.today()), cur = OS.all('snapshots').find(s => s.ym === ym);
  const v = { ym, date: U.today(), nw: U.r2(Fin.netWorth()), cash: U.r2(Fin.cashTotal()), inv: U.r2(Inv.value()), invested: U.r2(Inv.cost()), debt: U.r2(Fin.debtsTotal()) };
  if (!OS.all('accounts').length && !OS.all('assets').length) return;
  if (!cur) OS.add('snapshots', v, { silent: true }); else if (cur.date !== U.today() && (cur.nw !== v.nw || cur.inv !== v.inv)) OS.upd('snapshots', cur.id, v, { silent: true });
};
Fin.nwSeries = () => U.sortBy(OS.all('snapshots'), s => s.ym);

/* ---- Investimentos ---- */
const Inv = OS.Inv = {};
Inv.fx = cur => { if (!cur || cur === 'EUR') return 1; const v = U.num((OS.one('profile').fx || {})[cur]); return v || 1; };
Inv.fxMissing = () => [...new Set(OS.all('assets').map(a => a.currency).filter(c => c && c !== 'EUR' && !U.num((OS.one('profile').fx || {})[c])))];
Inv.pos = a => {
  let qty = 0, cost = 0, realized = 0, divs = 0, fees = 0, bought = 0;
  U.sortBy(OS.all('invtx').filter(t => t.asset === a.id), t => t.date).forEach(t => {
    const q = U.num(t.qty), p = U.num(t.price);
    if (t.type === 'Compra') { qty += q; cost += q * p + U.num(t.fees); bought += q * p; }
    else if (t.type === 'Venda') { const avg = qty ? cost / qty : 0; realized += q * (p - avg) - U.num(t.fees); cost -= avg * q; qty -= q; }
    else if (t.type === 'Dividendo' || t.type === 'Juros') divs += U.num(t.amount) - U.num(t.fees);
    else if (t.type === 'Taxa') fees += U.num(t.amount);
  });
  const fx = Inv.fx(a.currency), price = U.num(a.price) || (qty ? cost / qty : 0);
  const value = qty * price * fx, costE = cost * fx, pl = value - costE;
  return { qty, avg: qty ? cost / qty : 0, cost: costE, value, pl, ret: costE ? pl / costE : 0, realized: realized * fx, divs: divs * fx, total: pl + realized * fx + divs * fx, stale: !a.priceDate || U.diff(U.today(), a.priceDate) > 7, hasPrice: !!U.num(a.price) };
};
Inv.value = () => U.sum(OS.all('assets'), a => Inv.pos(a).value);
Inv.cost = () => U.sum(OS.all('assets'), a => Inv.pos(a).cost);
Inv.divs = (from, to) => U.sum(OS.all('invtx').filter(t => (t.type === 'Dividendo' || t.type === 'Juros') && (!from || t.date >= from) && (!to || t.date <= to)), t => U.num(t.amount) * Inv.fx((OS.get('assets', t.asset) || {}).currency));
Inv.byKey = key => { const o = {}; OS.all('assets').forEach(a => { const v = Inv.pos(a).value; if (v > 0) o[a[key] || 'Sem dados'] = (o[a[key] || 'Sem dados'] || 0) + v; }); return Object.entries(o).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v); };
Inv.contribByMonth = n => Fin.months(n).map(ym => U.sum(OS.all('invtx').filter(t => U.ym(t.date) === ym && t.type === 'Compra'), t => U.num(t.qty) * U.num(t.price) * Inv.fx((OS.get('assets', t.asset) || {}).currency)) - U.sum(OS.all('invtx').filter(t => U.ym(t.date) === ym && t.type === 'Venda'), t => U.num(t.qty) * U.num(t.price) * Inv.fx((OS.get('assets', t.asset) || {}).currency)));
/* Fornecedores de cotações. Só "manual" funciona neste ambiente: a página não pode chamar APIs externas.
   Para automatizar: adicionar um conector MCP de dados de mercado no claude.ai e registar aqui um fornecedor. */
Inv.providers = { manual: { name: 'Manual', available: true, note: 'Atualizas o preço em Cotações. A data mostra se está desatualizado.' },
  mcp: { name: 'Conector de mercado (MCP)', available: false, note: 'Precisa de um conector de dados de mercado ligado ao claude.ai (não existe nenhum nesta conta).' },
  api: { name: 'API direta (ex.: Alpha Vantage, Twelve Data)', available: false, note: 'Bloqueado aqui: a página só pode comunicar com a própria base de dados. Exige um serviço intermédio com chave de API.' } };

/* ---- Universidade ---- */
const St = OS.St = {};
St.current = () => OS.all('subjects').filter(s => s.status === 'Em curso');
St.contrib = a => a.grade === '' || a.grade == null ? 0 : U.num(a.grade) * U.num(a.weight) / 100;
St.stats = s => {
  const ses = OS.all('sessions').filter(x => x.subject === s.id), mins = U.sum(ses, x => x.minutes);
  const graded = OS.all('assessments').filter(a => a.subject === s.id && a.grade !== '' && a.grade != null);
  const w = U.sum(graded, a => a.weight), acc = U.sum(graded, St.contrib), avg = w ? U.r1(acc * 100 / w) : 0;
  const tgt = U.num(s.target) || 15, wk = U.monday(U.today());
  const minWk = U.sum(ses.filter(x => x.date >= wk), x => x.minutes);
  const sit = !avg ? ['Sem notas', ''] : avg >= tgt ? ['Acima do alvo', 'pos'] : avg >= 10 ? ['Abaixo do alvo', 'warn'] : ['Risco de reprovar', 'neg'];
  const topics = OS.all('topics').filter(t => t.subject === s.id), dom = topics.filter(t => ['Revisto', 'Dominado'].includes(t.status)).length;
  const next = U.sortBy(OS.all('assessments').filter(a => a.subject === s.id && a.date >= U.today() && a.prep !== 'Feito'), a => a.date)[0];
  return { mins, hours: U.r1(mins / 60), avg, w, tgt, sit, minWk, hWk: U.r1(minWk / 60), targetWk: U.num(s.hoursWeek), topics: topics.length, topicsDone: dom, next, errors: OS.all('errors').filter(e => e.subject === s.id && !e.redone).length, last: U.sortBy(ses, x => x.date).pop() };
};
St.gpa = () => { const sub = OS.all('subjects').filter(s => U.num(s.final) > 0); if (sub.length) return U.r1(U.sum(sub, s => U.num(s.final) * (U.num(s.ects) || 6)) / U.sum(sub, s => U.num(s.ects) || 6)); const cur = St.current().map(s => St.stats(s)).filter(x => x.avg); return cur.length ? U.r1(U.avg(cur, x => x.avg)) : 0; };
St.ectsDone = () => U.sum(OS.all('subjects').filter(s => s.status === 'Aprovada'), s => s.ects);
St.revNext = r => { if (!r.studied) return ''; if (!r.r1) return U.addDays(r.studied, 1); if (!r.r2) return U.addDays(r.studied, 7); if (!r.r3) return U.addDays(r.studied, 30); return ''; };
St.revState = r => { if (r.r1 && r.r2 && r.r3) return ['Ciclo completo', 'pos']; const n = St.revNext(r); if (!n) return ['—', '']; return n < U.today() ? ['Atrasada', 'neg'] : n === U.today() ? ['Hoje', 'warn'] : ['Em dia', '']; };
St.revDue = () => OS.all('reviews').filter(r => { const n = St.revNext(r); return n && n <= U.today(); });
St.revDone = id => { const r = OS.get('reviews', id); if (!r) return; const p = !r.r1 ? { r1: true, r1At: U.today() } : !r.r2 ? { r2: true, r2At: U.today() } : { r3: true, r3At: U.today() }; OS.upd('reviews', id, p); };
St.topicAfter = t => { if (['Estudado', 'Revisto', 'Dominado'].includes(t.status)) { if (!t.studiedAt) OS.upd('topics', t.id, { studiedAt: U.today() }, { silent: true }); if (!OS.all('reviews').some(r => r.topicId === t.id)) { OS.add('reviews', { topic: t.title, subject: t.subject, studied: t.studiedAt || U.today(), topicId: t.id, mastery: 'Fraco' }, { silent: true }); OS.UI.toast('Revisões R1/R2/R3 agendadas', 'pos'); } } };
St.assessAlert = a => { if (!a.date || a.prep === 'Feito') return null; const d = U.diff(a.date, U.today()); return d < 0 ? ['Passou', ''] : d <= 7 ? ['Zona vermelha', 'neg'] : d <= 14 ? ['Modo exame', 'warn'] : ['Em preparação', '']; };
/* O que estudar hoje: revisões vencidas → provas próximas → disciplinas atrasadas no alvo semanal → conteúdos por estudar */
St.today = () => {
  const out = [], t = U.today();
  St.revDue().forEach(r => out.push({ score: 100 + U.diff(t, St.revNext(r)) * 5, kind: 'Revisão', title: r.topic, subject: r.subject, why: St.revNext(r) < t ? 'Revisão atrasada ' + U.diff(t, St.revNext(r)) + ' dia(s)' : 'Revisão ' + (!r.r1 ? 'R1' : !r.r2 ? 'R2' : 'R3') + ' vence hoje', act: `data-act="revDone" data-id="${r.id}"`, actL: 'Marcar feita', mins: 20 }));
  OS.all('assessments').filter(a => a.date >= t && a.prep !== 'Feito' && a.prep !== 'Pronto').forEach(a => { const d = U.diff(a.date, t); if (d > 21) return; const w = U.num(a.weight) || 20; out.push({ score: 90 - d * 3 + w / 2 + (!a.prep || a.prep === 'Não comecei' ? 15 : 0), kind: a.type, title: 'Preparar: ' + a.title, subject: a.subject, why: `Faltam ${d} dias · peso ${w}% · ${a.prep || 'por começar'}` + (d <= 14 ? ' · modo exame: exercícios e exames antigos' : ''), mins: d <= 7 ? 100 : 50 }); });
  St.current().forEach(s => { const x = St.stats(s); if (!x.targetWk) return; const wd = (new Date().getDay() + 6) % 7 + 1; const expected = x.targetWk * 60 * wd / 7; if (x.minWk < expected - 30) out.push({ score: 50 + (expected - x.minWk) / 10, kind: 'Ritmo', title: s.name, subject: s.id, why: `${x.hWk} h de ${x.targetWk} h esta semana (esperado ${U.r1(expected / 60)} h até hoje)`, mins: Math.min(100, Math.round(expected - x.minWk)) }); });
  OS.all('topics').filter(tp => tp.status === 'Por estudar' && St.current().some(s => s.id === tp.subject)).slice(0, 4).forEach(tp => out.push({ score: 30, kind: 'Conteúdo', title: tp.title, subject: tp.subject, why: 'Conteúdo ainda por estudar', act: `data-act="topicDone" data-id="${tp.id}"`, actL: 'Marcar estudado', mins: 50 }));
  return out.sort((a, b) => b.score - a.score);
};
St.weekMins = (from = U.monday(U.today())) => U.sum(OS.all('sessions').filter(s => s.date >= from && s.date <= U.addDays(from, 6)), s => s.minutes);
St.targetWeek = () => U.sum(St.current(), s => s.hoursWeek);

/* ---- Treino ---- */
const Fit = OS.Fit = {};
Fit.sets = w => (Array.isArray(w.items) ? w.items : []).reduce((a, it) => a + (Array.isArray(it.sets) ? it.sets : []).filter(s => U.num(s.reps)).length, 0);
Fit.volume = w => (Array.isArray(w.items) ? w.items : []).reduce((a, it) => a + (Array.isArray(it.sets) ? it.sets : []).reduce((b, s) => b + U.num(s.kg) * U.num(s.reps), 0), 0);
Fit.e1rm = (kg, reps) => reps > 0 && kg > 0 ? kg * (1 + Math.min(reps, 12) / 30) : 0;
Fit.muscleSets = (from, to) => { const o = {}; L.MUSCLES.forEach(m => o[m] = 0); OS.all('workouts').filter(w => w.date >= from && w.date <= to).forEach(w => (Array.isArray(w.items) ? w.items : []).forEach(it => { const ex = OS.get('exercises', it.ex); if (!ex) return; const n = (Array.isArray(it.sets) ? it.sets : []).filter(s => U.num(s.reps)).length; o[ex.muscle] = (o[ex.muscle] || 0) + n; (ex.secondary || []).forEach(m => o[m] = (o[m] || 0) + n * .5); })); return o; };
Fit.muscleVolume = (m, from, to) => { let v = 0; OS.all('workouts').filter(w => w.date >= from && w.date <= to).forEach(w => (Array.isArray(w.items) ? w.items : []).forEach(it => { const ex = OS.get('exercises', it.ex); if (ex && ex.muscle === m) v += (Array.isArray(it.sets) ? it.sets : []).reduce((b, s) => b + U.num(s.kg) * U.num(s.reps), 0); })); return v; };
Fit.exHistory = exId => { const out = []; U.sortBy(OS.all('workouts'), w => w.date).forEach(w => (Array.isArray(w.items) ? w.items : []).forEach(it => { if (it.ex !== exId) return; const sets = (Array.isArray(it.sets) ? it.sets : []).filter(s => U.num(s.reps)); if (!sets.length) return; const best = Math.max(...sets.map(s => Fit.e1rm(U.num(s.kg), U.num(s.reps)))); const top = Math.max(...sets.map(s => U.num(s.kg))); out.push({ date: w.date, e1rm: U.r1(best), top, vol: U.sum(sets, s => U.num(s.kg) * U.num(s.reps)), sets: sets.length }); })); return out; };
Fit.prs = () => { const out = []; OS.all('exercises').forEach(ex => { const h = Fit.exHistory(ex.id); if (!h.length) return; let best = 0; h.forEach(x => { if (x.top > best) { if (best > 0) out.push({ date: x.date, ex, kg: x.top }); best = x.top; } }); }); return U.sortBy(out, x => x.date, -1); };
Fit.editor = r => {
  const items = r.items || [], exs = U.sortBy(OS.all('exercises'), e => e.muscle + e.name);
  const opt = sel => `<option value="">Escolher exercício…</option>` + L.MUSCLES.map(m => { const g = exs.filter(e => e.muscle === m); return g.length ? `<optgroup label="${m}">${g.map(e => `<option value="${e.id}"${e.id === sel ? ' selected' : ''}>${U.esc(e.name)}</option>`).join('')}</optgroup>` : ''; }).join('');
  const setRow = s => `<div class="set-row"><input type="number" step="any" inputmode="decimal" placeholder="kg" value="${s.kg ?? ''}" data-s="kg"><input type="number" inputmode="numeric" placeholder="reps" value="${s.reps ?? ''}" data-s="reps"><input type="number" step="0.5" placeholder="RPE" value="${s.rpe ?? ''}" data-s="rpe"><input type="number" placeholder="desc. s" value="${s.rest ?? ''}" data-s="rest"><button type="button" class="icon-btn" data-set-del aria-label="Remover série">${OS.UI.ic('x')}</button></div>`;
  const block = it => `<div class="ex-block"><div class="row gap8"><select class="ex-sel">${opt(it.ex)}</select><button type="button" class="icon-btn" data-ex-del aria-label="Remover exercício">${OS.UI.ic('trash')}</button></div><div class="set-head"><span>kg</span><span>reps</span><span>RPE</span><span>descanso</span><span></span></div><div class="sets">${(it.sets && it.sets.length ? it.sets : [{}]).map(setRow).join('')}</div><button type="button" class="btn ghost sm" data-set-add>${OS.UI.ic('plus')}Série</button></div>`;
  Fit._setRow = setRow; Fit._block = block;
  return `<div class="wk-ed">${(Array.isArray(items) ? items : []).filter(x => x && typeof x === 'object').map(it => block(Object.assign({ sets: [] }, it, { sets: Array.isArray(it.sets) ? it.sets : [] }))).join('')}<button type="button" class="btn sm" data-ex-add>${OS.UI.ic('plus')}Adicionar exercício</button></div>`;
};
Fit.readEditor = form => [...form.querySelectorAll('.ex-block')].map(b => ({ ex: b.querySelector('.ex-sel').value, sets: [...b.querySelectorAll('.set-row')].map(r => { const o = {}; r.querySelectorAll('[data-s]').forEach(i => { if (i.value !== '') o[i.dataset.s] = U.num(i.value); }); return o; }).filter(s => s.reps || s.kg) })).filter(it => it.ex);
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-ex-add]')) { const b = t.closest('[data-ex-add]'); b.insertAdjacentHTML('beforebegin', Fit._block({ sets: [{}] })); return; }
  if (t.closest('[data-ex-del]')) { t.closest('.ex-block').remove(); return; }
  if (t.closest('[data-set-add]')) { const blk = t.closest('.ex-block'), sets = blk.querySelector('.sets'); const last = sets.lastElementChild; const prev = {}; if (last) last.querySelectorAll('[data-s]').forEach(i => prev[i.dataset.s] = i.value); sets.insertAdjacentHTML('beforeend', Fit._setRow(prev)); return; }
  if (t.closest('[data-set-del]')) { const r = t.closest('.set-row'); if (r.parentElement.children.length > 1) r.remove(); return; }
});

/* ---- Corrida ---- */
const Run = OS.Run = {};
Run.pace = r => U.num(r.km) ? U.parseDur(r.time) / U.num(r.km) : 0; // s/km
Run.paceStr = s => s ? U.mmss(s) + ' /km' : '—';
Run.speed = r => U.num(r.km) && U.parseDur(r.time) ? U.num(r.km) / (U.parseDur(r.time) / 3600) : 0;
Run.kmIn = (from, to) => U.sum(OS.all('runs').filter(r => r.date >= from && r.date <= to), r => r.km);
Run.best = dist => { const c = OS.all('runs').filter(r => U.num(r.km) >= dist * .98 && U.parseDur(r.time)); if (!c.length) return null; const b = c.reduce((a, r) => Run.pace(r) < Run.pace(a) ? r : a); return { run: b, est: Run.pace(b) * dist, exact: Math.abs(U.num(b.km) - dist) < .2 }; };
Run.longest = () => OS.all('runs').reduce((a, r) => !a || U.num(r.km) > U.num(a.km) ? r : a, null);
Run.weeks = n => Array.from({ length: n }, (_, i) => U.addDays(U.monday(U.today()), -7 * (n - 1 - i)));

/* ---- Trabalho, carreira, capital ---- */
const Car = OS.Car = {};
Car.shiftHours = s => { const a = U.t2m(s.start), b = U.t2m(s.end); if (a == null || b == null) return 0; let m = b - a; if (m < 0) m += 1440; return Math.max(0, (m - U.num(s.breakMin)) / 60); };
Car.shiftPay = s => Car.shiftHours(s) * (U.num(s.rate) || U.num(OS.one('profile').hourly));
// horas REALMENTE trabalhadas até agora: turno que já acabou conta inteiro, o que está a decorrer só o que já passou, os futuros não contam
Car.workedHours = (s, now = new Date()) => { const full = Car.shiftHours(s), a = U.t2m(s.start), b = U.t2m(s.end); if (!full || a == null || b == null || !s.date) return 0;
  const st = new Date(s.date + 'T' + s.start + ':00'), len = (((b - a) % 1440 + 1440) % 1440 || 1440) * 6e4, en = st.getTime() + len, n = +now;
  return n >= en ? full : n <= +st ? 0 : full * (n - st) / len; };
Car.workedPay = (s, now) => Car.workedHours(s, now) * (U.num(s.rate) || U.num(OS.one('profile').hourly));
Car.capital = (asOf = U.today()) => {
  const before = r => { const d = r.date || r.start || r.last || (r._c ? U.iso(new Date(r._c)) : ''); return !d || d <= asOf; };
  const skills = OS.all('skills').filter(before), certs = OS.all('learn').filter(l => l.kind === 'Certificação' && l.status === 'Concluído' && (!l.end || l.end <= asOf)).concat(OS.all('certs').filter(c => c.status === 'Obtida' && (!c.date || c.date <= asOf)));
  const learnDone = OS.all('learn').filter(l => l.status === 'Concluído' && l.kind !== 'Certificação' && (!l.end || l.end <= asOf));
  const exps = OS.all('experiences').filter(e => !e.start || e.start <= asOf);
  const months = U.sum(exps.filter(e => e.kind === 'Emprego' || e.kind === 'Voluntariado'), e => { const a = e.start || asOf, b = e.end && e.end < asOf ? e.end : asOf; return Math.max(0, U.diff(b, a) / 30.4); });
  const contacts = OS.all('contacts').filter(before), active = contacts.filter(c => c.last && U.diff(asOf, c.last) <= 90 && c.last <= asOf);
  const apps = OS.all('applications').filter(a => a.date && a.date <= asOf), interviews = apps.filter(a => ['Entrevista', 'Proposta', 'Aceite'].includes(a.status));
  const projects = OS.all('projects').filter(p => p.status === 'Concluído' && ['Profissional', 'Empresarial', 'Aprendizagem'].includes(p.type));
  const events = exps.filter(e => ['Evento', 'Palestra', 'Competição'].includes(e.kind));
  const learnH = U.sum(OS.all('sessions').filter(s => s.skill && s.date <= asOf), s => s.minutes) / 60;
  const dims = { 'Competências': Math.min(1, U.sum(skills, s => U.num(s.level)) / 40), 'Certificações': Math.min(1, certs.length / 6), 'Experiência': Math.min(1, months / 36), 'Rede': Math.min(1, (contacts.length + active.length * 2) / 90), 'Projetos & eventos': Math.min(1, (projects.length * 2 + events.length) / 12), 'Aprendizagem': Math.min(1, (learnH / 150) + learnDone.length / 20), 'Mercado': Math.min(1, (apps.length + interviews.length * 3) / 30) };
  const score = Math.round(Object.values(dims).reduce((a, b) => a + b, 0) / Object.keys(dims).length * 1000);
  return { dims, score, skills: skills.length, certs: certs.length, months: U.r1(months), contacts: contacts.length, active: active.length, apps: apps.length, interviews: interviews.length, projects: projects.length, events: events.length, learnH: U.r1(learnH) };
};

/* ---- Mova ---- */
const Mv = OS.Mv = {};
Mv.rev = s => s.status === 'Cancelado' ? 0 : (U.num(s.qty) || 1) * U.num(s.price);
Mv.cost = s => { if (s.status === 'Cancelado') return 0; const p = OS.get('mvproducts', s.product); const c = s.cost !== '' && s.cost != null ? U.num(s.cost) : p ? U.num(p.cost) : 0; return (U.num(s.qty) || 1) * c; };
Mv.month = ym => { const sales = OS.all('mvsales').filter(s => U.ym(s.date) === ym && s.status !== 'Cancelado'), exps = OS.all('mvexp').filter(e => U.ym(e.date) === ym);
  const rev = U.sum(sales, Mv.rev), cogs = U.sum(sales, Mv.cost), opex = U.sum(exps, e => e.amount), gross = rev - cogs, profit = gross - opex;
  const mk = OS.all('mvmkt').filter(m => U.ym(m.date) === ym), mkCost = U.sum(mk, m => m.cost) + U.sum(exps.filter(e => e.cat === 'Marketing'), e => e.amount);
  const newClients = OS.all('mvclients').filter(c => c.since && U.ym(c.since) === ym && ['Ativo', 'Inativo'].includes(c.status)).length;
  return { ym, rev, cogs, opex, gross, profit, margin: rev ? profit / rev : 0, grossMargin: rev ? gross / rev : 0, n: sales.length, ticket: sales.length ? rev / sales.length : 0, mkCost, cac: newClients ? mkCost / newClients : null, newClients, pending: U.sum(OS.all('mvsales').filter(s => s.status === 'Pendente'), Mv.rev) };
};
Mv.total = () => U.sum(OS.all('mvsales').filter(s => s.status !== 'Cancelado'), Mv.rev);

/* ---- Metas ---- */
const Goal = OS.Goal = {};
Goal.lower = g => g.metric === 'run5k';
Goal.value = g => {
  const since = g.start || '0000';
  switch (g.metric) {
    case 'account': { const a = OS.get('accounts', g.account); return a ? Fin.accBalE(a) : 0; }
    case 'networth': return Fin.netWorth();
    case 'invested': return Inv.value();
    case 'studyHours': return U.r1(U.sum(OS.all('sessions').filter(s => s.date >= since), s => s.minutes) / 60);
    case 'avgGrade': return St.gpa();
    case 'runKm': return U.r1(Run.kmIn(since, '9999'));
    case 'run5k': { const b = Run.best(5); return b ? U.r1(b.est / 60) : null; }
    case 'workouts': return OS.all('workouts').filter(w => w.date >= since).length;
    case 'books': return OS.all('learn').filter(l => l.kind === 'Livro' && l.status === 'Concluído' && (l.end || '9999') >= since).length + OS.all('books').filter(b => b.status === 'Lido' && (b.end || '9999') >= since).length;
    case 'movaRevenue': return U.sum(OS.all('mvsales').filter(s => s.date >= since && s.status !== 'Cancelado'), Mv.rev);
    case 'contacts': return OS.all('contacts').length;
    case 'certs': return OS.all('learn').filter(l => l.kind === 'Certificação' && l.status === 'Concluído').length + OS.all('certs').filter(c => c.status === 'Obtida').length;
    case 'steps': { const s = g.steps || []; return s.length ? U.r1(s.filter(x => x.done).length / s.length * 100) : 0; }
    // progresso pelas tarefas e projetos ligados à meta (tarefas de um projeto já ligado contam dentro do projeto)
    case 'linked': { const P = OS.all('projects').filter(x => x.goal === g.id && x.status !== 'Cancelado'), inP = new Set(P.map(x => x.id)), T = OS.all('tasks').filter(t => t.goal === g.id && !inP.has(t.project));
      const v = T.map(t => t.status === 'Feita' ? 1 : 0).concat(P.map(x => x.status === 'Concluído' ? 1 : OS.Proj.info(x).prog)); return v.length ? U.r1(U.avg(v) * 100) : 0; }
    default: return U.num(g.cur);
  }
};
Goal.info = g => {
  const cur = Goal.value(g), tgt = g.metric === 'steps' || g.metric === 'linked' ? 100 : U.num(g.target);
  let p;
  if (Goal.lower(g)) { const base = U.num(g.base) || (cur != null ? cur * 1.2 : 0); p = cur == null ? 0 : base === tgt ? (cur <= tgt ? 1 : 0) : U.clamp((base - cur) / (base - tgt), 0, 1); }
  else { const base = g.metric === 'manual' ? U.num(g.base) : 0; p = tgt - base ? U.clamp((U.num(cur) - base) / (tgt - base), 0, 1) : 0; }
  if (g.status === 'Concluída') p = 1;
  let exp = null; if (g.start && g.due && g.due > g.start) exp = U.clamp(U.diff(U.today(), g.start) / U.diff(g.due, g.start), 0, 1);
  const late = g.status === 'Ativa' && g.due && g.due < U.today() && p < 1;
  const behind = exp != null && g.status === 'Ativa' && p + .1 < exp;
  const st = g.status !== 'Ativa' ? [g.status, g.status === 'Concluída' ? 'pos' : ''] : p >= 1 ? ['Alvo atingido', 'pos'] : late ? ['Atrasada', 'neg'] : behind ? ['Atrás do ritmo', 'warn'] : exp != null ? ['No ritmo', 'pos'] : ['Em curso', ''];
  const tasks = OS.all('tasks').filter(t => t.goal === g.id), projects = OS.all('projects').filter(x => x.goal === g.id);
  return { cur, tgt, p, exp, late, behind, st, tasks, projects };
};
Goal.fmt = (g, v) => { if (v == null) return '—'; if (['account', 'networth', 'invested', 'movaRevenue'].includes(g.metric)) return U.eur(v, { dec: 0 }); if (g.metric === 'run5k') return U.mmss(v * 60); if (g.metric === 'studyHours') return U.nf(v, 1) + ' h'; if (g.metric === 'runKm') return U.nf(v, 1) + ' km'; if (g.metric === 'steps' || g.metric === 'linked') return Math.round(v) + '%'; return U.nf(v, v % 1 ? 1 : 0) + (g.unit ? ' ' + g.unit : ''); };

/* ---- Projetos ---- */
const Proj = OS.Proj = {};
Proj.info = p => {
  const tasks = OS.all('tasks').filter(t => t.project === p.id), done = tasks.filter(t => t.status === 'Feita');
  const prog = p.progMode === 'manual' ? U.num(p.progress) / 100 : tasks.length ? done.length / tasks.length : (p.status === 'Concluído' ? 1 : 0);
  const acts = tasks.map(t => t.doneAt || (t._u ? U.iso(new Date(t._u)) : '')).concat(p._u ? [U.iso(new Date(p._u))] : []).filter(Boolean).sort();
  const lastAct = acts.pop() || '';
  const idle = lastAct ? U.diff(U.today(), lastAct) : 0;
  const stalled = p.status === 'Em andamento' && idle >= 14;
  const late = p.due && p.due < U.today() && !['Concluído', 'Cancelado'].includes(p.status);
  const kpis = String(p.kpis || '').split('\n').map(l => { const m = l.match(/^(.*?):\s*([\d.,]+)\s*\/\s*([\d.,]+)/); return m ? { l: m[1].trim(), cur: U.num(m[2]), tgt: U.num(m[3]) } : null; }).filter(Boolean);
  return { tasks, done, open: tasks.filter(t => t.status !== 'Feita'), prog, lastAct, idle, stalled, late, kpis };
};

/* ---- Calendário central ---- */
const Cal = OS.Cal = {};
Cal.src = { task: ['Tarefas', 'var(--c1)'], event: ['Compromissos', 'var(--c2)'], class: ['Aulas', 'var(--c3)'], exam: ['Avaliações', 'var(--neg)'], shift: ['Trabalho', 'var(--c4)'], workout: ['Treino', 'var(--c5)'], run: ['Corrida', 'var(--c6)'], bill: ['Contas', 'var(--warn)'], opp: ['Oportunidades', 'var(--c7)'], goal: ['Metas & projetos', 'var(--c8)'], routine: ['Rotina', 'var(--muted)'], gcal: ['Google Calendar', 'var(--c9)'], mova: ['Mova', 'var(--c10)'] };
Cal.gcal = [];   // preenchido pela integração
Cal.items = (from, to) => {
  const out = [], days = U.range(from, to), p = OS.one('profile');
  const push = (o) => out.push(o);
  OS.all('tasks').forEach(t => { const d = t.sched || t.due; if (d && d >= from && d <= to) push({ date: d, title: t.title, src: 'task', done: t.status === 'Feita', late: OS.Tasks.late(t), edit: 'tasks:' + t.id, sub: t.due ? 'prazo ' + U.fmtDS(t.due) : '' }); });
  OS.all('events').forEach(e => days.forEach(d => { if (!e.date) return; let hit = e.date === d; if (!hit && e.recur && e.recur !== 'Não' && d > e.date) { hit = e.recur === 'Semanal' ? U.diff(d, e.date) % 7 === 0 : e.recur === 'Mensal' ? d.slice(8) === e.date.slice(8) : d.slice(5) === e.date.slice(5); } if (hit) push({ date: d, start: e.allDay ? '' : e.start, end: e.end, title: e.title, src: 'event', imp: e.important, edit: 'events:' + e.id, sub: e.location || '' }); }));
  OS.all('classes').forEach(c => days.forEach(d => { if (String(U.parse(d).getDay()) !== String(c.wday)) return; if (p.semStart && d < p.semStart) return; if (p.semEnd && d > p.semEnd) return; const s = OS.get('subjects', c.subject); if (!s || s.status !== 'Em curso') return; push({ date: d, start: c.start, end: c.end, title: s.name, src: 'class', sub: (c.kind || '') + (c.room ? ' · ' + c.room : ''), edit: 'classes:' + c.id }); }));
  OS.all('assessments').forEach(a => { if (a.date >= from && a.date <= to) push({ date: a.date, start: a.time || '', title: a.type + ': ' + a.title, src: 'exam', imp: true, edit: 'assessments:' + a.id, done: a.prep === 'Feito' }); });
  OS.all('shifts').forEach(s => { if (s.date >= from && s.date <= to) push({ date: s.date, start: s.start, end: s.end, title: 'Turno' + (s.place ? ' · ' + s.place : ''), src: 'shift', edit: 'shifts:' + s.id }); });
  OS.all('workouts').forEach(w => { if (w.date >= from && w.date <= to) push({ date: w.date, title: w.title || 'Treino', src: 'workout', done: true, edit: 'workouts:' + w.id }); });
  OS.all('runs').forEach(r => { if (r.date >= from && r.date <= to) push({ date: r.date, title: U.r1(U.num(r.km)) + ' km · ' + r.type, src: 'run', done: true, edit: 'runs:' + r.id }); });
  days.forEach(d => { if (d < U.today()) return; const wd = String(U.parse(d).getDay()); const split = OS.one('fit').split[wd]; if (split && !OS.all('workouts').some(w => w.date === d) && split !== 'Corrida' && split !== 'Descanso') push({ date: d, title: split, src: 'workout', planned: true, sub: 'planeado' }); OS.all('runplan').filter(r => r.active && String(r.wday) === wd).forEach(r => { if (!OS.all('runs').some(x => x.date === d)) push({ date: d, title: r.type + (U.num(r.km) ? ' ' + r.km + ' km' : U.num(r.mins) ? ' ' + r.mins + ' min' : ''), src: 'run', planned: true, sub: r.desc || 'planeado' }); }); });
  Fin.upcoming(Math.max(0, U.diff(to, U.today()))).filter(x => x.date >= from && x.date <= to && x.amount < 0).forEach(x => push({ date: x.date, title: x.title + ' · ' + U.eur(-x.amount), src: 'bill', late: x.late }));
  OS.all('opps').forEach(o => { if (o.deadline && o.deadline >= from && o.deadline <= to && !['Aceite', 'Recusada', 'Perdida', 'Descartada', 'Submetida'].includes(o.status)) push({ date: o.deadline, title: 'Prazo: ' + o.name, src: 'opp', imp: true, edit: 'opps:' + o.id }); });
  OS.all('goals').forEach(g => { if (g.due && g.due >= from && g.due <= to && g.status === 'Ativa') push({ date: g.due, title: 'Meta: ' + g.title, src: 'goal', edit: 'goals:' + g.id }); });
  OS.all('projects').forEach(g => { if (g.due && g.due >= from && g.due <= to && !['Concluído', 'Cancelado'].includes(g.status)) push({ date: g.due, title: 'Projeto: ' + g.name, src: 'goal', edit: 'projects:' + g.id }); });
  OS.all('routine').forEach(r => days.forEach(d => { if ((r.days || []).includes(String(U.parse(d).getDay()))) push({ date: d, start: r.start, end: r.end, title: r.title, src: 'routine', edit: 'routine:' + r.id }); }));
  if (0) OS.all('mvclients').forEach(c => { if (c.next && c.next >= from && c.next <= to && !['Perdido', 'Inativo'].includes(c.status)) push({ date: c.next, title: 'Mova · contactar ' + c.name, src: 'mova', edit: 'mvclients:' + c.id }); });
  OS.all('contacts').forEach(c => { if (c.next && c.next >= from && c.next <= to) push({ date: c.next, title: 'Follow-up: ' + c.name, src: 'opp', edit: 'contacts:' + c.id }); });
  Cal.gcal.forEach(g => { if (g.date >= from && g.date <= to) push(Object.assign({ src: 'gcal' }, g)); });
  return out.sort((a, b) => (a.date + (a.start || '99')).localeCompare(b.date + (b.start || '99')));
};

/* ================= SEMENTES (primeira utilização) =================
   Estrutura personalizada a partir do que sei do Ryan (PDF Modo Caverna, Notion Mind Crontrol). Tudo editável. */
const CURRICULUM = ['Contabilidade Financeira 1', 'Estatística', 'Fundamentos de Macroeconomia', 'Introdução ao Direito Empresarial', 'Business Intelligence na Tomada de Decisão', 'Fundamentos de Economia da Empresa', 'Métodos Quantitativos Aplicados', 'Gestão das Organizações', 'Contabilidade Financeira 2', 'Introdução à Contabilidade de Gestão', 'Tecnologias Aplicadas à Contabilidade Financeira', 'Fiscalidade', 'Direito Fiscal', 'Finanças Empresariais', 'Contabilidade de Gestão', 'Auditoria', 'Contabilidade e Direito das Sociedades', 'Relato Empresarial', 'Análise Financeira', 'Tecnologias Aplicadas ao Controle de Gestão', 'Direito do Trabalho e da Segurança Social', 'Complementos de Fiscalidade', 'Contabilidade Setoriais', 'Ética e Deontologia', 'Simulação Empresarial'];
const EXERCISES = [['Supino reto com barra', 'Peito', ['Tríceps', 'Ombros'], 'Barra'], ['Supino inclinado com halteres', 'Peito', ['Ombros', 'Tríceps'], 'Halteres'], ['Crucifixo no cabo', 'Peito', [], 'Cabo'], ['Flexões', 'Peito', ['Tríceps', 'Abdómen'], 'Peso corporal'], ['Paralelas (dips)', 'Tríceps', ['Peito'], 'Peso corporal'],
  ['Tríceps na polia', 'Tríceps', [], 'Cabo'], ['Tríceps francês', 'Tríceps', [], 'Halteres'], ['Puxada frontal', 'Dorsais', ['Bíceps'], 'Cabo'], ['Elevações (pull-ups)', 'Dorsais', ['Bíceps', 'Antebraços'], 'Peso corporal'], ['Remada curvada com barra', 'Dorsais', ['Trapézio', 'Bíceps', 'Lombar'], 'Barra'],
  ['Remada unilateral', 'Dorsais', ['Bíceps'], 'Halteres'], ['Remada sentada no cabo', 'Dorsais', ['Trapézio'], 'Cabo'], ['Peso morto', 'Lombar', ['Isquiotibiais', 'Glúteos', 'Trapézio'], 'Barra'], ['Encolhimentos', 'Trapézio', [], 'Halteres'], ['Curl com barra', 'Bíceps', ['Antebraços'], 'Barra'],
  ['Curl martelo', 'Bíceps', ['Antebraços'], 'Halteres'], ['Curl no banco inclinado', 'Bíceps', [], 'Halteres'], ['Agachamento com barra', 'Quadríceps', ['Glúteos', 'Isquiotibiais', 'Lombar'], 'Barra'], ['Leg press', 'Quadríceps', ['Glúteos'], 'Máquina'], ['Extensão de pernas', 'Quadríceps', [], 'Máquina'],
  ['Afundos (lunges)', 'Quadríceps', ['Glúteos'], 'Halteres'], ['Peso morto romeno', 'Isquiotibiais', ['Glúteos', 'Lombar'], 'Barra'], ['Flexão de pernas', 'Isquiotibiais', [], 'Máquina'], ['Hip thrust', 'Glúteos', ['Isquiotibiais'], 'Barra'], ['Gémeos em pé', 'Gémeos', [], 'Máquina'],
  ['Desenvolvimento militar', 'Ombros', ['Tríceps'], 'Barra'], ['Desenvolvimento com halteres', 'Ombros', ['Tríceps'], 'Halteres'], ['Elevações laterais', 'Ombros', [], 'Halteres'], ['Face pull', 'Ombros', ['Trapézio'], 'Cabo'], ['Prancha', 'Abdómen', ['Oblíquos', 'Lombar'], 'Peso corporal'],
  ['Abdominal na roda', 'Abdómen', ['Oblíquos'], 'Outro'], ['Elevação de pernas suspenso', 'Abdómen', ['Antebraços'], 'Peso corporal'], ['Russian twist', 'Oblíquos', ['Abdómen'], 'Peso corporal'], ['Hiperextensão lombar', 'Lombar', ['Glúteos'], 'Máquina'], ['Farmer walk', 'Antebraços', ['Trapézio', 'Abdómen'], 'Halteres']];
OS.on('seed', () => {
  const meta = OS.one('meta'); if (meta.seeded) return;
  // conta nova (versão pública): só o essencial, sem nada do Ryan
  if (OS.Acc && OS.Acc.pub) { OS.touch('profile'); OS.touch('fin'); OS.touch('fit');
    if (!OS.all('accounts').length) { OS.add('accounts', { name: 'Conta principal', type: 'Conta à ordem', currency: 'EUR', opening: 0, openDate: U.today() }, { silent: true }); OS.add('accounts', { name: 'Fundo de emergência', type: 'Reserva', currency: 'EUR', opening: 0, openDate: U.today() }, { silent: true }); }
    if (!OS.all('exercises').length) EXERCISES.forEach(([name, muscle, secondary, equip]) => OS.add('exercises', { name, muscle, secondary, equip }, { silent: true }));
    if (!OS.all('habits').length) [['Acordar à hora, sem snooze', 'Manhã', 1], ['2 blocos de foco (100 min)', 'Dia', 1, 'study100'], ['Treino ou corrida', 'Dia', 1, 'workout'], ['20 páginas de leitura', 'Noite', 1], ['Registar gastos do dia', 'Noite', 0, 'cash'], ['Telemóvel fora do quarto', 'Noite', 0]].forEach(([name, group, core, auto]) => OS.add('habits', { name, group, core: !!core, freq: name.startsWith('Treino') ? 'Dias úteis' : 'Diário', active: true, log: {}, auto: auto || '', area: 'Pessoal' }, { silent: true }));
    meta.seeded = true; OS.touch('meta'); return; }
  const p = OS.one('profile'); OS.touch('profile'); OS.touch('fin'); OS.touch('fit'); OS.touch('mova');
  if (!OS.all('subjects').length) {
    [['Informática Organizacional', 'Média', 5], ['Introdução à Contabilidade', 'Alta', 6]].forEach(([n, d, h]) => OS.add('subjects', { name: n, sem: '1.º Semestre 26/27', status: 'Em curso', target: 15, hoursWeek: h, diff: d, ects: 6 }, { silent: true }));
    CURRICULUM.forEach(n => OS.add('subjects', { name: n, sem: 'Por definir', status: 'Plano', target: 15, ects: 6, diff: 'Média', notes: 'Importado do teu Notion (Disciplinas Acadêmicas). Ajusta o semestre.' }, { silent: true }));
  }
  if (!OS.all('accounts').length) { OS.add('accounts', { name: 'Conta principal', type: 'Conta à ordem', currency: 'EUR', opening: 0, openDate: U.today() }, { silent: true }); OS.add('accounts', { name: 'Fundo de emergência', type: 'Reserva', currency: 'EUR', opening: 0, openDate: U.today() }, { silent: true }); }
  if (!OS.all('exercises').length) EXERCISES.forEach(([name, muscle, secondary, equip]) => OS.add('exercises', { name, muscle, secondary, equip }, { silent: true }));
  if (!OS.all('habits').length) [['Acordar à hora, sem snooze', 'Manhã', 1], ['Oração / silêncio', 'Manhã', 1], ['2 blocos de estudo (100 min)', 'Dia', 1, 'study100'], ['Treino ou corrida', 'Dia', 1, 'workout'], ['20 páginas de leitura', 'Noite', 1], ['Registar gastos do dia', 'Noite', 0, 'cash'], ['Telemóvel fora do quarto', 'Noite', 0], ['3 gratidões escritas', 'Noite', 0]].forEach(([name, group, core, auto]) => OS.add('habits', { name, group, core: !!core, freq: name.startsWith('Treino') ? 'Dias úteis' : 'Diário', active: true, log: {}, auto: auto || '', area: 'Pessoal' }, { silent: true }));
  if (!OS.all('runplan').length) [['1', 'Rodagem', '', 20, '20 min depois do treino de peito'], ['3', 'Rodagem', '', 20, '20 min depois do treino de pernas'], ['5', 'Intervalado', '', 30, '30 min: 6 × 400 m forte / 90 s leve'], ['6', 'Longa', 5, '', 'Corrida contínua de 5 km']].forEach(([wday, type, km, mins, desc]) => OS.add('runplan', { wday, type, km, mins, desc, active: true }, { silent: true }));
  if (!OS.all('applications').length) OS.add('applications', { company: "McDonald's", role: '', status: 'Enviada', date: '' }, { silent: true });
  if (!OS.all('contacts').length) { OS.add('contacts', { name: 'Wesley', role: 'Gerente de Mercado', strength: 3 }, { silent: true }); OS.add('contacts', { name: 'Denise Santos', role: 'Ex-gerente do Itaú', strength: 3 }, { silent: true }); }
  if (!OS.all('skills').length) [['Excel', 'Dados & Programação', 2, 4], ['Inglês', 'Línguas', 2, 4], ['Python para dados', 'Dados & Programação', 1, 3], ['Contabilidade', 'Contabilidade', 1, 5]].forEach(([name, area, level, targetLevel]) => OS.add('skills', { name, area, level, targetLevel, stage: 'Conteúdos', plan: [] }, { silent: true }));
  if (!OS.all('goals').length) {
    const acc = OS.all('accounts').find(a => a.type === 'Reserva');
    [{ title: 'Fundo de emergência de € 1.000', cat: 'Finanças', horizon: '1 ano', metric: 'account', account: acc && acc.id, target: 1000, importance: 5 },
     { title: 'Média ≥ 15 no 1.º semestre', cat: 'Estudos', horizon: '3 meses', metric: 'avgGrade', target: 15, due: p.semEnd, importance: 5 },
     { title: 'Correr 5 km em menos de 25 min', cat: 'Corrida', horizon: '3 meses', metric: 'run5k', target: 25, base: 30, importance: 4 },
     { title: 'Inglês B2', cat: 'Desenvolvimento pessoal', horizon: '1 ano', metric: 'steps', importance: 3, steps: [{ t: 'Teste de nível' }, { t: '100 horas de estudo' }, { t: 'Exame B2' }] },
     { title: '12 livros num ano', cat: 'Desenvolvimento pessoal', horizon: '1 ano', metric: 'books', target: 12, importance: 3 }
    ].forEach(g => OS.add('goals', Object.assign({ status: 'Ativa', start: U.today(), steps: [] }, g), { silent: true }));
  }
  if (!OS.all('projects').length) {
    const pr = OS.add('projects', { name: 'Ideia de serviço em Aveiro', type: 'Empresarial', status: 'Planejado', prio: '2', progMode: 'auto', objective: 'Validar a ideia de serviço antes de investir.', expected: 'Primeiro cliente pago.', kpis: 'Clientes validados: 0 / 5', start: U.today() }, { silent: true });
    ['Validar a ideia com 5 clientes', 'Definir o preço', 'Abrir atividade nas Finanças (recibos verdes)', 'Conseguir o 1.º cliente'].forEach((t, i) => OS.add('tasks', { title: t, status: i ? 'Inbox' : 'Próxima', prio: '2', impact: 4, effort: '60', project: pr.id, area: 'Projetos', ctx: ['@Mova'] }, { silent: true }));
  }
  meta.seeded = true; OS.touch('meta');
});

/* ================= MIGRAÇÃO DA VERSÃO 1 (Modo Caverna) ================= */
OS.on('migrate', async () => {
  const meta = OS.one('meta'); if (meta.migrated) return;
  const old = {};
  if (OS.dbRef) { try { const snap = await OS.dbRef.collection('caverna').get(); snap.docs.forEach(d => { const x = d.data(); if (x && x.data !== undefined) old[d.id] = x.data; }); } catch (e) { } }
  ['subjects', 'sessions', 'assess', 'reviews', 'errors', 'library', 'cash', 'workouts', 'tasks', 'goals', 'wish', 't'].forEach(k => { if (old[k] === undefined) { const v = U.ls.get('mc:' + k, undefined); if (v !== undefined) old[k] = v; } });
  if (!Object.keys(old).length) { meta.migrated = true; OS.touch('meta'); return; }
  const sid = {};
  (old.subjects || []).forEach(s => { const r = OS.add('subjects', { name: s.nome, sem: '1.º Semestre 26/27', status: s.estado || 'Em curso', target: s.alvo || 15, hoursWeek: s.horas || 4, diff: s.dif || 'Média', ects: s.ects || 6, prof: s.prof || '', room: s.sala || '', final: s.final || '' }, { silent: true }); sid[s.id] = r.id; });
  (old.sessions || []).forEach(s => OS.add('sessions', { date: s.data, subject: sid[s.subj] || '', type: s.tipo === 'Simulado de exame' ? 'Simulado' : s.tipo || 'Estudo profundo', minutes: s.min, phone: !!s.tel, learned: s.aprendi || '', doubts: s.duvidas || '', distractions: s.dist || 0 }, { silent: true }));
  (old.assess || []).forEach(a => OS.add('assessments', { title: a.aval, subject: sid[a.subj] || '', type: a.tipo || 'Teste', date: a.data, weight: a.peso, grade: a.nota, prep: a.prep === 'Pronto para a guerra' ? 'Pronto' : a.prep || 'Não comecei', content: a.materia || '' }, { silent: true }));
  (old.reviews || []).forEach(r => OS.add('reviews', { topic: r.topico, subject: sid[r.subj] || '', studied: r.estudado, r1: !!r.r1, r2: !!r.r2, r3: !!r.r3, mastery: r.dom || 'Fraco' }, { silent: true }));
  (old.errors || []).forEach(e => OS.add('errors', { title: e.erro, subject: sid[e.subj] || '', date: e.data, type: e.tipo, why: e.porque, right: e.certa, rule: e.regra, redone: !!e.refeito }, { silent: true }));
  (old.library || []).forEach(l => OS.add('learn', { title: l.titulo, author: l.autor, kind: l.tipo || 'Livro', status: l.estado || 'Na fila', total: l.tot, done: l.feitas, start: l.ini, end: l.fim, lesson: l.licao, rating: l.nota }, { silent: true }));
  const acc = OS.all('accounts')[0] || OS.add('accounts', { name: 'Conta principal', type: 'Conta à ordem', opening: 0 }, { silent: true });
  let res = OS.all('accounts').find(a => a.type === 'Reserva');
  (old.cash || []).forEach(c => { if (c.tipo === 'Poupança') { res = res || OS.add('accounts', { name: 'Fundo de emergência', type: 'Reserva', opening: 0 }, { silent: true }); OS.add('transactions', { type: 'Transferência', amount: c.valor, date: c.data, desc: c.desc, account: acc.id, toAccount: res.id, note: c.nota || '' }, { silent: true }); } else OS.add('transactions', { type: c.tipo === 'Entrada' ? 'Receita' : 'Despesa', amount: c.valor, date: c.data, desc: c.desc, account: acc.id, cat: c.cat, ess: c.ess, method: 'Débito', note: c.nota || '', tags: [] }, { silent: true }); });
  (old.workouts || []).forEach(w => { if (U.num(w.dist) > 0) OS.add('runs', { date: w.data, km: w.dist, time: U.num(w.dur) * 60, type: 'Rodagem', notes: w.ex || '' }, { silent: true }); else OS.add('workouts', { date: w.data, title: w.tipo || w.treino, dur: w.dur, bw: w.peso, notes: (w.ex || '') + (w.sent ? ' · ' + w.sent : ''), items: [] }, { silent: true }); if (U.num(w.peso)) OS.add('body', { date: w.data, weight: w.peso }, { silent: true }); });
  const pmap = { 'Crítico': '1', 'Importante': '2', 'Pode Esperar': '4' }, smap = { Inbox: 'Inbox', Hoje: 'Próxima', 'Em Foco': 'Em curso', Aguardando: 'Aguardando', 'Concluído': 'Feita' };
  (old.tasks || []).forEach(t => OS.add('tasks', { title: t.tarefa, status: smap[t.status] || 'Inbox', prio: pmap[t.prio] || '3', impact: 3, effort: '30', due: t.prazo || '', doneAt: t.concl || '', notes: t.notas || '', ctx: [], area: t.area === 'Estudos' ? 'Universidade' : 'Pessoal' }, { silent: true }));
  (old.goals || []).forEach(g => OS.add('goals', { title: g.prop, cat: 'Outros', horizon: g.hor === 'Ano' ? '1 ano' : '3 meses', due: g.prazo, status: g.ok ? 'Concluída' : 'Ativa', metric: 'manual', why: g.desc || '', steps: [] }, { silent: true }));
  (old.wish || []).forEach(w => OS.add('wishlist', { product: w.p, price: w.v, reason: w.m, created: w.criado, status: w.ok === 'sim' ? 'Aprovada' : w.ok === 'nao' ? 'Desisti' : 'Em espera', need: 3, prio: 'Média' }, { silent: true }));
  const t = old.t || {};
  (t.cand || []).forEach(c => OS.add('applications', { company: c.empresa, role: c.cargo, status: c.estado || 'Enviada', date: c.data }, { silent: true }));
  (t.net || []).forEach(c => OS.add('contacts', { name: c.pessoa, role: c.desc, contact: c.contacto, last: c.ult, strength: 3 }, { silent: true }));
  meta.migrated = true; OS.touch('meta');
});
})();
