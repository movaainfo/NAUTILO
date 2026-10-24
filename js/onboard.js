/* PRUMO — "Vamos conhecer-te": na primeira vez que alguém abre o seu Prumo (contas; o perfil do Ryan fica como está), umas perguntas
   rápidas e o Prumo fica feito para essa pessoa: as abas do menu, o país (feriados, moeda, sotaque da voz), o nome da IA, as disciplinas,
   o trabalho, os marcos do Dominus, o treino, a dieta, os desportos, o dinheiro, os hábitos, a rotina e as metas.
   Pode saltar e voltar a responder em Definições › Geral; as abas mudam-se em Definições ou em Explorar. Tudo fica editável. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
OS.ONE_DEF.areas = { hide: [] };
OS.ONE_DEF.onb = { done: '', at: '', ans: null };
const pub = () => !!(OS.Acc && OS.Acc.on && OS.Acc.pub);

/* ---------- abas (áreas) do menu ---------- */
const MUST = ['visao', 'definicoes'];
const hiddenSet = () => new Set(((OS.one('areas') || {}).hide || []).filter(k => !MUST.includes(k)));
const groups = () => (OS.NAV || []).filter(([g]) => g !== 'Admin');
OS.Areas = { on: k => !hiddenSet().has(k), hidden: hiddenSet, set: hide => { OS.setOne('areas', { hide: [...new Set(hide)].filter(k => !MUST.includes(k)) }); if (OS.fitNav) setTimeout(OS.fitNav, 60); } };
const areaChips = (hide, attr) => groups().map(([g, items]) => { const on = items.filter(([k]) => !hide.has(k)).length;
  return `<div class="onb-g"><div class="onb-gh"><b>${esc(g === 'Visão geral' ? 'Visão Geral' : g)}</b><button type="button" class="btn xs ghost" ${attr}g="${esc(g)}">${on === items.length ? 'Tirar tudo' : 'Quero tudo'}</button></div>
    <div class="onb-chips">${items.map(([k, l, ic]) => { const lock = MUST.includes(k), sel = lock || !hide.has(k); return `<button type="button" class="chip onb-c ${sel ? 'on' : ''}" ${lock ? 'disabled' : ''} ${attr}="${k}" aria-pressed="${sel}">${UI.ic(ic)}${esc(k === 'mova' ? (OS.one('mova').name || 'O meu negócio') : l)}</button>`; }).join('')}</div></div>`; }).join('');
const toggleArea = (hide, k) => { if (MUST.includes(k)) return; hide.has(k) ? hide.delete(k) : hide.add(k); };
const toggleGroup = (hide, g) => { const it = (groups().find(x => x[0] === g) || [, []])[1].map(x => x[0]).filter(k => !MUST.includes(k)); const allOn = it.every(k => !hide.has(k)); it.forEach(k => allOn ? hide.add(k) : hide.delete(k)); };

/* ---------- respostas ---------- */
const CUR = new Proxy({}, { get: (o, cc) => OS.Pais ? OS.Pais.curOf(cc) : cc === 'BR' ? 'BRL' : 'EUR' });
// moedas para escolher: a do país primeiro, depois as mais usadas e todas as outras
const CURS = cc => { const all = OS.Pais ? [...new Set(Object.values(OS.Pais.data).map(x => x.cur))] : ['EUR', 'BRL', 'USD']; const top = [CUR[cc], 'EUR', 'USD', 'BRL', 'GBP', 'CHF']; return [...new Set(top.concat(all.sort()))]; };
const curName = c => { try { return new Intl.DisplayNames([OS.Lang ? OS.Lang.base() : 'pt'], { type: 'currency' }).of(c); } catch (e) { return c; } };
// vozes para escolher logo no início (as 30 estão em Definições › Spyke)
const VOZ = [['Charon', '♂ Grave'], ['Puck', '♂ Animada'], ['Iapetus', '♂ Clara'], ['Kore', '♀ Firme'], ['Aoede', '♀ Leve'], ['Sulafat', '♀ Calorosa']];
const NAMES = ['Spyke', 'Jarvis', 'Atlas', 'Nova', 'Luna', 'Aurora', 'Max', 'Íris'], FEM = /^(Nova|Luna|Aurora|Íris|Iris|Sofia|Ana|Maria|Alice|Eva|Lia|Mia|Clara)$/i;
const SPORTS = [['corrida', 'Corrida'], ['futebol', 'Futebol'], ['futsal', 'Futsal'], ['basquetebol', 'Basquetebol'], ['voleibol', 'Voleibol'], ['natacao', 'Natação'], ['ciclismo', 'Ciclismo'], ['tenis', 'Ténis'], ['padel', 'Padel'], ['jiujitsu', 'Jiu-Jitsu'], ['boxe', 'Boxe'], ['muaythai', 'Muay Thai'], ['surf', 'Surf'], ['escalada', 'Escalada'], ['crossfit', 'CrossFit'], ['calistenia', 'Calistenia']];
const HABITS = [['acordar', 'Acordar à hora, sem snooze', 'Manhã', 1], ['treino', 'Treino ou corrida', 'Dia', 1, 'workout'], ['estudo', '2 blocos de foco (100 min)', 'Dia', 1, 'study100'], ['ler', '20 páginas de leitura', 'Noite', 0],
  ['agua', 'Beber 2 litros de água', 'Dia', 0], ['gastos', 'Registar gastos do dia', 'Noite', 0, 'cash'], ['tele', 'Telemóvel fora do quarto', 'Noite', 0], ['meditar', 'Meditar 10 minutos', 'Manhã', 0],
  ['fe', 'Oração e leitura da Bíblia', 'Manhã', 0], ['diario', 'Escrever no diário', 'Noite', 0], ['deitar', 'Deitar à hora', 'Noite', 0]];
const defaults = () => { const p = OS.one('profile'), d = OS.one('diet'), sp = OS.one('spyke'), cc = p.country || (OS.Lang && OS.Lang.code() === 'pt-BR' ? 'BR' : 'PT'), nm = (OS.Acc && OS.Acc.profile && OS.Acc.profile() || {}).nome || '';
  return { short: p.short || nm, country: cc, lang: p.lang || (OS.Lang ? OS.Lang.code() : 'pt-PT'), city: p.city || '', ia: sp.nome || 'Spyke', hide: [...hiddenSet()],
    est: p.uni ? 'uni' : '', inst: p.uni || '', curso: p.course || '', ano: p.curYear || '', subs: '',
    trab: p.jobRole ? 'emp' : '', cargo: p.jobRole || '', empresa: p.employer || '', horas: p.workHours || '',
    obj: '', nivel: 'Iniciante', dias: '', onde: '', desp: [], peso: '', altura: d.h || '', idade: d.age || '', sexo: d.sex || '',
    moeda: p.cur || CUR[cc] || 'EUR', dinh: [], poup: '20', acordar: p.wakeTime || '', deitar: p.sleepTime || '', hab: [], metas: ['', '', ''] }; };

/* ---------- os passos ---------- */
const on = (a, ...ks) => ks.some(k => !new Set(a.hide).has(k));
const chips = (a, k, opts, multi) => `<div class="onb-chips">${opts.map(([v, l]) => { const sel = multi ? (a[k] || []).includes(v) : String(a[k]) === String(v); return `<button type="button" class="chip onb-c ${sel ? 'on' : ''}" data-o${multi ? 'm' : 'c'}="${k}" data-v="${esc(v)}" aria-pressed="${sel}">${esc(l)}</button>`; }).join('')}</div>`;
const inp = (a, k, l, o = {}) => `<label class="onb-f"><span>${esc(l)}</span><input class="field" data-ok="${k}" type="${o.t || 'text'}" value="${esc(a[k] == null ? '' : a[k])}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''}${o.t === 'number' ? ' inputmode="decimal"' : ''} autocomplete="off"></label>`;
const STEPS = [
  { id: 'tu', t: 'Vamos fazer o Prumo à tua medida', s: 'São dois minutos. Tudo fica editável depois, e podes saltar quando quiseres.',
    b: a => `${inp(a, 'short', 'Como te chamas?', { ph: 'O teu nome' })}<div class="onb-2">${`<label class="onb-f"><span>País onde vives</span><select class="field" data-ok="country">${(OS.Pais ? OS.Pais.list() : [['PT', 'Portugal'], ['BR', 'Brasil']]).map(c => `<option value="${c[0]}"${c[0] === a.country ? ' selected' : ''}>${OS.Pais ? OS.Pais.flag(c[0]) + ' ' : ''}${esc(c[1])}</option>`).join('')}</select></label>`}${inp(a, 'city', 'Cidade', { ph: 'ex.: Lisboa, São Paulo' })}</div>
      ${OS.Lang ? `<label class="onb-f"><span>Língua do app</span><select class="field" data-ok="lang" data-notr>${OS.Lang.list().map(c => `<option value="${c}"${c === a.lang ? ' selected' : ''}>${esc(OS.Lang.name(c))}</option>`).join('')}</select></label>` : ''}
      <div class="onb-f"><span>Como queres chamar a tua IA? (é por este nome que a chamas por voz)</span>${chips(a, 'ia', NAMES.map(n => [n, n]))}<input class="field" data-ok="ia" value="${esc(NAMES.includes(a.ia) ? '' : a.ia)}" placeholder="Ou escreve outro nome"></div>
      <div class="onb-f"><span>E a voz? (toca para ouvir)</span>${chips(a, 'voz', VOZ)}</div>` },
  { id: 'areas', t: 'O que queres no teu Prumo?', s: 'Toca para escolher as abas que vais usar. As outras ficam escondidas do menu e podes ligá-las quando quiseres em Definições.',
    b: a => areaChips(new Set(a.hide), 'data-oa') },
  { id: 'estudos', show: a => on(a, 'universidade', 'cursos'), t: 'Estudas?', s: 'Com isto monto a tua Universidade: disciplinas, faltas, notas e o tutor.',
    b: a => `${chips(a, 'est', [['uni', 'Universidade'], ['sec', 'Ensino secundário'], ['curso', 'Curso ou formação'], ['nao', 'Não estou a estudar']])}
      ${a.est === 'uni' ? `<div class="onb-2">${inp(a, 'inst', 'Universidade ou faculdade', { ph: 'ex.: Universidade de Lisboa' })}${inp(a, 'curso', 'Curso', { ph: 'ex.: Gestão' })}</div><div class="onb-f"><span>Ano</span>${chips(a, 'ano', [1, 2, 3, 4, 5, 6].map(n => [n, n + '.º']))}</div>` : ''}
      ${a.est === 'sec' ? `<div class="onb-f"><span>Ano</span>${chips(a, 'ano', [10, 11, 12].map(n => [n, n + '.º']))}</div>` : ''}
      ${a.est === 'curso' ? inp(a, 'curso', 'Que curso?', { ph: 'ex.: Programação web' }) : ''}
      ${a.est === 'uni' || a.est === 'sec' ? `<label class="onb-f"><span>Disciplinas deste semestre (uma por linha)</span><textarea class="field" rows="5" data-ok="subs" placeholder="ex.:&#10;Matemática&#10;Contabilidade">${esc(a.subs)}</textarea></label>
        <button type="button" class="btn sm" data-act="onbSug" ${a.curso || a.est === 'sec' ? '' : 'disabled'}>${UI.ic('star')}${W && W.sug ? 'A pensar…' : 'Sugerir as disciplinas com IA'}</button>${W && W.sugErr ? `<small class="onb-err">${esc(W.sugErr)}</small>` : ''}` : ''}` },
  { id: 'trabalho', show: a => on(a, 'trabalho', 'carreira'), t: 'Trabalhas?', s: 'Serve para a tua página de Trabalho, as horas e as oportunidades.',
    b: a => `${chips(a, 'trab', [['emp', 'Por conta de outrem'], ['proprio', 'Por conta própria'], ['nao', 'Não trabalho']])}
      ${a.trab && a.trab !== 'nao' ? `<div class="onb-2">${inp(a, 'cargo', 'O que fazes', { ph: 'ex.: Rececionista, Designer' })}${inp(a, 'empresa', a.trab === 'proprio' ? 'O teu negócio (opcional)' : 'Empresa (opcional)')}</div>${inp(a, 'horas', 'Horas por semana', { t: 'number', min: 1, max: 80, ph: 'ex.: 20' })}` : ''}` },
  { id: 'corpo', show: a => on(a, 'treino', 'dieta', 'corrida', 'desporto', 'corpo'), t: 'O teu corpo', s: 'Com isto faço o teu plano de treino, a meta de calorias e os teus desportos.',
    b: a => `<div class="onb-f"><span>Objetivo</span>${chips(a, 'obj', [['cut', 'Perder gordura'], ['bulk', 'Ganhar massa muscular'], ['keep', 'Manter e ter saúde'], ['sport', 'Render mais num desporto']])}</div>
      <div class="onb-f"><span>Quantos dias por semana queres treinar?</span>${chips(a, 'dias', [[0, 'Nenhum'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']])}</div>
      ${+a.dias ? `<div class="onb-f"><span>Onde?</span>${chips(a, 'onde', [['gym', 'Ginásio'], ['casa', 'Em casa'], ['fora', 'Ao ar livre']])}</div><div class="onb-f"><span>Nível</span>${chips(a, 'nivel', [['Iniciante', 'Iniciante'], ['Intermédio', 'Intermédio'], ['Avançado', 'Avançado']])}</div>` : ''}
      <div class="onb-f"><span>Desportos que praticas</span>${chips(a, 'desp', SPORTS, 1)}</div>
      <div class="onb-3">${inp(a, 'peso', 'Peso (kg)', { t: 'number', min: 30, max: 250 })}${inp(a, 'altura', 'Altura (cm)', { t: 'number', min: 120, max: 230 })}${inp(a, 'idade', 'Idade', { t: 'number', min: 12, max: 100 })}</div>
      <div class="onb-f"><span>Para as contas das calorias</span>${chips(a, 'sexo', [['M', 'Homem'], ['F', 'Mulher']])}</div>` },
  { id: 'dinheiro', show: a => on(a, 'financas', 'investimentos'), t: 'O teu dinheiro', s: 'Para as contas, as metas de poupança e os marcos de Fortuna.',
    b: a => `<label class="onb-f"><span>Moeda principal</span><select class="field" data-ok="moeda">${CURS(a.country).map(m => `<option value="${m}"${m === a.moeda ? ' selected' : ''}>${m} · ${esc(curName(m))}</option>`).join('')}</select></label>
      <div class="onb-f"><span>O que queres agora? (podes escolher vários)</span>${chips(a, 'dinh', [['controlar', 'Saber para onde vai o dinheiro'], ['divida', 'Sair das dívidas'], ['reserva', 'Criar um fundo de emergência'], ['poupar', 'Poupar para um objetivo'], ['investir', 'Começar a investir']], 1)}</div>
      <div class="onb-f"><span>Quanto do que ganhas queres poupar?</span>${chips(a, 'poup', [['10', '10%'], ['15', '15%'], ['20', '20%'], ['30', '30%']])}</div>` },
  { id: 'rotina', t: 'A tua rotina e as tuas metas', s: 'Os hábitos entram no teu quadro de hábitos; as metas entram em Metas e no jogo.',
    b: a => `<div class="onb-2">${inp(a, 'acordar', 'Acordo às', { t: 'time' })}${inp(a, 'deitar', 'Deito-me às', { t: 'time' })}</div>
      <div class="onb-f"><span>Hábitos que queres ter</span>${chips(a, 'hab', HABITS.filter(h => (h[0] !== 'fe' || on(a, 'fe')) && (h[0] !== 'estudo' || (a.est && a.est !== 'nao')) && (h[0] !== 'treino' || +a.dias || (a.desp || []).length) && (h[0] !== 'gastos' || on(a, 'financas', 'gasto'))).map(h => [h[0], h[1]]), 1)}</div>
      <div class="onb-f"><span>Três coisas que queres conseguir nos próximos 12 meses</span>${[0, 1, 2].map(i => `<input class="field onb-m" data-om3="${i}" value="${esc(a.metas[i] || '')}" placeholder="${['ex.: Passar a todas as cadeiras', 'ex.: Juntar 1000 € de reserva', 'ex.: Correr 10 km'][i]}">`).join('')}</div>` },
  { id: 'fim', t: 'Pronto para criar o teu Prumo', s: 'Isto é o que vou preparar para ti. Muda o que quiseres depois.',
    b: a => `<ul class="onb-sum">${plan(a).map(x => `<li>${UI.ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` }];

/* ---------- o que vai ser criado ---------- */
const subsOf = a => (Array.isArray(a.subs) ? a.subs.map(String) : String(a.subs || '').split(/\n|;/)).map(s => s.replace(/^[\s•\-\d.)]+/, '').trim()).filter(s => s.length > 1).slice(0, 20);
const metasOf = a => (a.metas || []).map(s => String(s || '').trim()).filter(Boolean).slice(0, 3);
const plan = a => { const L = [], S = subsOf(a), d = +a.dias || 0, hid = new Set(a.hide);
  L.push(hid.size ? `Menu com as abas que escolheste (${groups().reduce((n, [, it]) => n + it.filter(([k]) => !hid.has(k)).length, 0)} de ${groups().reduce((n, [, it]) => n + it.length, 0)})` : 'Menu com todas as abas');
  if (a.country) L.push(`País: ${((OS.Country && OS.Country.list || []).find(c => c[0] === a.country) || [, a.country])[1]} (feriados, moeda e sotaque da voz)`);
  if (S.length) L.push(`${S.length} disciplina${S.length > 1 ? 's' : ''} em ${a.est === 'sec' ? 'Estudos' : 'Universidade'}`);
  if (d) L.push(`Plano de treino de ${d} dia${d > 1 ? 's' : ''} por semana (${a.onde === 'casa' ? 'em casa' : a.onde === 'fora' ? 'ao ar livre' : 'ginásio'})`);
  if ((a.desp || []).length) L.push('Desportos: ' + a.desp.map(k => (SPORTS.find(s => s[0] === k) || [, k])[1]).join(', '));
  if (+a.peso && +a.altura && +a.idade && a.sexo) L.push('Meta de calorias e proteína feita para ti');
  if ((a.hab || []).length) L.push(`${a.hab.length} hábito${a.hab.length > 1 ? 's' : ''} no teu quadro`);
  if (metasOf(a).length) L.push(`${metasOf(a).length} meta${metasOf(a).length > 1 ? 's' : ''} para os próximos 12 meses`);
  L.push('Marcos do Dominus à tua medida, nos 5 pilares (o Spyke afina-os com a IA)');
  return L; };

/* ---------- aplicar ---------- */
const semNow = () => { const d = new Date(), y = d.getFullYear() % 100, m = d.getMonth() + 1; return m >= 8 || m === 1 ? `1.º Semestre ${m === 1 ? y - 1 : y}/${m === 1 ? y : y + 1}` : `2.º Semestre ${y - 1}/${y}`; };
const exId = n => (OS.all('exercises').find(e => e.name === n) || {}).id;
const ROUT = { 'Corpo inteiro A': ['Agachamento com barra', 'Supino reto com barra', 'Remada curvada com barra', 'Desenvolvimento com halteres', 'Prancha'],
  'Corpo inteiro B': ['Peso morto romeno', 'Supino inclinado com halteres', 'Puxada frontal', 'Afundos (lunges)', 'Elevações laterais'],
  'Corpo inteiro C': ['Leg press', 'Flexões', 'Remada sentada no cabo', 'Hip thrust', 'Russian twist'],
  'Superior': ['Supino reto com barra', 'Remada curvada com barra', 'Desenvolvimento com halteres', 'Puxada frontal', 'Curl com barra', 'Tríceps na polia'],
  'Inferior': ['Agachamento com barra', 'Peso morto romeno', 'Leg press', 'Flexão de pernas', 'Gémeos em pé', 'Prancha'],
  'Empurrar': ['Supino reto com barra', 'Supino inclinado com halteres', 'Desenvolvimento militar', 'Elevações laterais', 'Tríceps na polia'],
  'Puxar': ['Puxada frontal', 'Remada curvada com barra', 'Remada unilateral', 'Face pull', 'Curl martelo'],
  'Pernas': ['Agachamento com barra', 'Peso morto romeno', 'Leg press', 'Extensão de pernas', 'Flexão de pernas', 'Gémeos em pé'],
  'Em casa A': ['Flexões', 'Afundos (lunges)', 'Prancha', 'Hip thrust', 'Russian twist'],
  'Em casa B': ['Paralelas (dips)', 'Afundos (lunges)', 'Flexões', 'Prancha', 'Elevação de pernas suspenso'] };
const SLOTS = { 1: ['1'], 2: ['1', '4'], 3: ['1', '3', '5'], 4: ['1', '2', '4', '5'], 5: ['1', '2', '3', '4', '5'], 6: ['1', '2', '3', '4', '5', '6'] };
const splitFor = a => { const d = Math.min(6, +a.dias || 0), adv = a.nivel !== 'Iniciante';
  if (a.onde && a.onde !== 'gym') return Array.from({ length: d }, (_, i) => i % 2 ? 'Em casa B' : 'Em casa A');
  return ({ 1: ['Corpo inteiro A'], 2: ['Corpo inteiro A', 'Corpo inteiro B'], 3: adv ? ['Empurrar', 'Puxar', 'Pernas'] : ['Corpo inteiro A', 'Corpo inteiro B', 'Corpo inteiro C'], 4: ['Superior', 'Inferior', 'Superior', 'Inferior'],
    5: ['Empurrar', 'Puxar', 'Pernas', 'Superior', 'Inferior'], 6: ['Empurrar', 'Puxar', 'Pernas', 'Empurrar', 'Puxar', 'Pernas'] })[d] || []; };
const pillarOf = t => /dinheiro|poupar|poupan|€|reais|r\$|invest|dívida|divida|salário|salario|ganhar mais|negócio|negocio|clientes|emprego|promo/i.test(t) ? 'for'
  : /peso|kg|correr|corrida|maratona|treino|ginásio|ginasio|saúde|saude|dieta|músculo|musculo|km|nadar|desporto/i.test(t) ? 'cor'
  : /família|familia|amig|namor|casar|relação|relacao|pais|filh|networking|contactos/i.test(t) ? 'inf'
  : /fé|deus|igreja|orar|oração|bíblia|biblia|paz|ansiedade|meditar|espiritual/i.test(t) ? 'esp' : 'int';
const marcosFor = a => { const m = { int: [], for: [], cor: [], inf: [], esp: [] }, w = +a.peso || 0, d = +a.dias || 0, cc = a.country;
  metasOf(a).forEach(t => m[pillarOf(t)].push(t.charAt(0).toUpperCase() + t.slice(1)));
  if (a.est === 'uni' && a.curso) { m.int.push(`Fechar o ${a.ano ? a.ano + '.º ano' : 'ano'} de ${a.curso} sem nenhuma cadeira em atraso`); if (cc === 'PT') m.int.push('Média do semestre igual ou acima de 14'); else if (cc === 'BR') m.int.push('Média do semestre igual ou acima de 7'); else if (OS.Grade) m.int.push(OS.Grade.inv() ? `Média do semestre de ${OS.Grade.fmt(OS.Grade.good())} ou melhor` : `Média do semestre igual ou acima de ${OS.Grade.fmt(OS.Grade.good())}`); }
  if (a.est === 'sec') m.int.push(`Acabar o ${a.ano ? a.ano + '.º ano' : 'ano'} com média igual ou acima de 15`);
  if (a.est === 'curso' && a.curso) m.int.push(`Acabar o curso de ${a.curso} e pôr em prática num projeto real`);
  const dn = new Set(a.dinh || []);
  if (dn.has('controlar')) m.for.push('Registar todos os gastos durante 90 dias seguidos');
  if (dn.has('divida')) m.for.push('Pagar todas as dívidas de consumo (cartão de crédito, crédito pessoal)');
  if (dn.has('reserva')) m.for.push('Juntar um fundo de emergência com 3 meses de despesas');
  if (dn.has('poupar')) m.for.push(`Poupar ${a.poup || 20}% do que ganho durante 6 meses seguidos`);
  if (dn.has('investir')) m.for.push('Fazer o primeiro investimento e mantê-lo 12 meses sem mexer');
  if (a.trab === 'proprio') m.for.push('Ter 10 clientes que pagam');
  if (a.trab === 'emp') m.for.push('Conseguir um aumento ou uma promoção');
  if (a.obj === 'cut' && w) m.cor.push(`Perder 5 kg com saúde (de ${w} para ${w - 5} kg)`);
  if (a.obj === 'bulk' && w) m.cor.push(`Ganhar 4 kg de massa muscular (de ${w} para ${w + 4} kg)`);
  if (d) m.cor.push(`Treinar ${d} vezes por semana durante 12 semanas seguidas`);
  if ((a.desp || []).includes('corrida')) m.cor.push(a.nivel === 'Avançado' ? 'Correr uma meia maratona' : a.nivel === 'Intermédio' ? 'Correr 10 km em menos de 60 minutos' : 'Correr 5 km sem parar');
  (a.desp || []).filter(k => k !== 'corrida').slice(0, 2).forEach(k => m.cor.push(`Praticar ${(SPORTS.find(s => s[0] === k) || [, k])[1]} 2 vezes por semana durante 3 meses`));
  if (on(a, 'fe')) m.esp.push('Ler o Novo Testamento todo', 'Orar todos os dias durante 30 dias seguidos');
  return m; };
const apply = async a => { const t = U.today(), S = subsOf(a), done = [];
  if (OS.seedBase) OS.seedBase();
  // perfil, país e nome da IA
  const prof = { short: String(a.short || '').trim().slice(0, 30), country: a.country || 'PT', city: String(a.city || '').trim().slice(0, 60) };
  if (a.moeda) prof.cur = a.moeda; if (a.lang && OS.Lang && OS.Lang.ok(a.lang)) prof.lang = a.lang;
  if (a.est === 'uni') Object.assign(prof, { uni: String(a.inst || '').trim(), course: String(a.curso || '').trim(), curYear: a.ano || '', semester: semNow() });
  else if (a.est === 'sec') Object.assign(prof, { uni: 'Ensino secundário', course: a.ano ? a.ano + '.º ano' : '', curYear: a.ano || '', semester: semNow() });
  else if (a.est === 'curso') Object.assign(prof, { course: String(a.curso || '').trim() });
  if (a.trab && a.trab !== 'nao') Object.assign(prof, { jobRole: String(a.cargo || '').trim(), employer: String(a.empresa || '').trim(), workHours: +a.horas || '' });
  if (a.acordar) prof.wakeTime = a.acordar; if (a.deitar) prof.sleepTime = a.deitar;
  if (+a.dias) prof.trainTarget = +a.dias; if ((a.desp || []).includes('corrida')) prof.runKmTarget = a.nivel === 'Avançado' ? 35 : a.nivel === 'Intermédio' ? 20 : 10;
  if (a.poup) prof.savingsTarget = +a.poup;
  OS.setOne('profile', prof);
  const ia = String(a.ia || 'Spyke').trim().slice(0, 24) || 'Spyke';
  const lg = prof.lang || (a.country === 'BR' ? 'pt-BR' : 'pt-PT');
  OS.setOne('spyke', Object.assign({ nome: ia === 'Spyke' ? '' : ia, art: FEM.test(ia) ? 'a' : 'o', nomeAt: t }, a.voz ? { voice: a.voz, eng: 'gemini' } : {}, lg === 'pt-BR' ? { accent: 'BR', azVoice: 'pt-BR-AntonioNeural' } : lg === 'pt-PT' ? { accent: 'PT', azVoice: 'pt-PT-DuarteNeural' } : { accent: lg, azVoice: '' }));
  try { OS.Spyke && OS.Spyke.setWakeName && OS.Spyke.setWakeName(); } catch (e) { }
  if (['PT', 'BR'].includes(a.country)) OS.setOne('news', { tabs: a.country === 'BR' ? ['BR', 'PT'] : ['PT', 'BR'] }); else if (OS.News && OS.News.has && OS.News.has(a.country)) OS.setOne('news', { tabs: [a.country] });
  OS.Areas.set(a.hide || []);
  // moeda das contas (só enquanto não há movimentos)
  if (a.moeda && !OS.all('transactions').length) OS.all('accounts').forEach(x => { if (x.currency !== a.moeda) OS.upd('accounts', x.id, { currency: a.moeda }, { silent: true }); });
  // disciplinas
  const have = new Set(OS.all('subjects').map(s => String(s.name || '').toLowerCase()));
  let ns = 0; S.forEach(n => { if (have.has(n.toLowerCase())) return; OS.add('subjects', Object.assign({ name: n, sem: semNow(), status: 'Em curso', ects: a.country === 'PT' && a.est === 'uni' ? 6 : '', hoursWeek: 4, diff: 'Média' }, a.country === 'PT' ? { target: 14 } : a.country === 'BR' ? { target: 7 } : OS.Grade ? { target: OS.Grade.good() } : {}), { silent: true }); ns++; });
  if (ns) done.push(`${ns} disciplina${ns > 1 ? 's' : ''}`);
  // treino: divisão da semana e rotinas com os exercícios da biblioteca
  const sp = splitFor(a);
  if (sp.length) { const sl = SLOTS[sp.length] || [], split = { 0: 'Mobilidade', 1: 'Descanso', 2: 'Descanso', 3: 'Descanso', 4: 'Descanso', 5: 'Descanso', 6: 'Descanso' };
    sl.forEach((wd, i) => split[wd] = sp[i]); if ((a.desp || []).includes('corrida')) { const free = ['6', '3', '2', '4', '5'].find(x => split[x] === 'Descanso'); if (free) split[free] = 'Corrida'; }
    OS.setOne('fit', { split });
    const reps = a.obj === 'bulk' ? 8 : a.obj === 'cut' ? 12 : 10, nset = a.obj === 'bulk' ? 4 : 3, rest = a.obj === 'bulk' ? 120 : 75, rn = new Set(OS.all('routines').map(r => r.name));
    [...new Set(sp)].forEach(name => { if (rn.has(name)) return; const items = (ROUT[name] || []).map(exId).filter(Boolean).map(ex => ({ ex, note: '', rest, sets: Array.from({ length: nset }, () => ({ t: 'N', kg: '', reps, sec: '', km: '', done: false })) }));
      if (items.length) OS.add('routines', { name, items }, { silent: true }); });
    done.push(`treino de ${sp.length} dia${sp.length > 1 ? 's' : ''}`); }
  // desportos
  const hs = new Set(OS.all('sports').map(s => s.key)); (a.desp || []).forEach(k => { if (!hs.has(k)) OS.add('sports', { key: k, level: a.nivel || 'Iniciante', freq: 2 }, { silent: true }); });
  // dieta: peso de hoje e metas de calorias e proteína
  if (+a.peso) { if (!OS.all('body').some(b => b.date === t)) OS.add('body', { date: t, weight: +a.peso }, { silent: true }); }
  if (+a.altura || +a.idade || a.sexo || a.obj) { const d = +a.dias || 0; OS.setOne('diet', Object.assign({}, +a.altura ? { h: +a.altura } : {}, +a.idade ? { age: +a.idade } : {}, a.sexo ? { sex: a.sexo } : {}, { act: d >= 6 ? '1.725' : d >= 3 ? '1.55' : d >= 1 ? '1.375' : '1.2', goal: a.obj === 'cut' ? 'cut' : a.obj === 'bulk' ? 'bulk' : 'keep' }));
    try { const g = OS.Diet && OS.Diet.suggest && OS.Diet.suggest(); if (g && g.kcal) { OS.setOne('diet', { kcal: g.kcal, p: g.p, c: g.c, f: g.f, water: Math.round(g.w * 35 / 250) * 250 }); done.push(`meta de ${g.kcal} kcal`); } } catch (e) { } }
  // hábitos: os escolhidos ficam ativos; os que vieram de origem e não escolheste ficam desligados
  if ((a.hab || []).length) { const pick = HABITS.filter(h => a.hab.includes(h[0])), names = new Set(pick.map(h => h[1].toLowerCase()));
    OS.all('habits').forEach(h => { if (!names.has(String(h.name || '').toLowerCase()) && h.active !== false && !Object.keys(h.log || {}).length) OS.upd('habits', h.id, { active: false }, { silent: true }); });
    const ex = new Set(OS.all('habits').map(h => String(h.name || '').toLowerCase()));
    pick.forEach(([k, name, group, core, auto]) => { const tr = k === 'treino' && +a.dias ? { freq: 'X por semana', perWeek: +a.dias } : {};
      if (ex.has(name.toLowerCase())) { const h = OS.all('habits').find(x => String(x.name).toLowerCase() === name.toLowerCase()); if (h) OS.upd('habits', h.id, Object.assign({ active: true }, tr), { silent: true }); return; }
      OS.add('habits', Object.assign({ name, group, core: !!core, active: true, log: {}, auto: auto || '', freq: k === 'treino' && +a.dias ? 'X por semana' : 'Diário' }, k === 'treino' && +a.dias ? { perWeek: +a.dias } : {}), { silent: true }); });
    done.push(`${pick.length} hábito${pick.length > 1 ? 's' : ''}`); }
  // metas dos próximos 12 meses
  const gt = new Set(OS.all('goals').map(g => String(g.title || '').toLowerCase()));
  metasOf(a).forEach(m => { if (gt.has(m.toLowerCase())) return; const p = pillarOf(m); OS.add('goals', { title: m.charAt(0).toUpperCase() + m.slice(1), cat: p === 'for' ? 'Finanças' : p === 'cor' ? 'Academia' : p === 'int' ? 'Estudos' : 'Desenvolvimento pessoal', horizon: '1 ano', metric: 'manual', status: 'Ativa', start: t, due: U.addDays(t, 365), importance: 4, steps: [] }, { silent: true }); });
  // marcos do Dominus (primeiro os feitos aqui; a IA acrescenta mais à medida, sem esperar)
  let nm = 0; const M = marcosFor(a); if (OS.Dom && OS.Dom.legAddMine) Object.entries(M).forEach(([p, L]) => { nm += OS.Dom.legAddMine(p, L); });
  if (!on(a, 'fe') && OS.Dom && OS.Dom.legOffWhere) OS.Dom.legOffWhere('esp', /Bíblia|biblia|oração|orar|igreja|Deus|jejum|devocional|fé\b|Cristo|batismo|culto|louvor/i);
  if (nm) done.push(`${nm} marco${nm > 1 ? 's' : ''} no Dominus`);
  OS.setOne('onb', { done: 'ok', at: new Date().toISOString(), ans: Object.assign({}, a, { subs: S.join('\n') }) });
  OS.request(); aiMarcos(a); return done; };

/* ---------- IA: disciplinas sugeridas e marcos afinados ---------- */
const aiOn = () => !!(OS.AI && OS.AI.key && OS.AI.key());
const ctxOf = a => JSON.stringify({ nome: a.short, pais: a.country, cidade: a.city, estudos: a.est, instituicao: a.inst, curso: a.curso, ano: a.ano, trabalho: a.trab, cargo: a.cargo, objetivo_corpo: a.obj, dias_treino: a.dias, desportos: a.desp, dinheiro: a.dinh, metas: metasOf(a), fe: on(a, 'fe') });
A.onbSug = async () => { if (!W || W.sug) return; if (!aiOn()) { W.sugErr = 'A IA ainda não está ligada nesta conta.'; return draw(); } W.sug = true; W.sugErr = ''; draw();
  try { const a = W.a, o = await OS.AI.json([{ text: `Lista as disciplinas (unidades curriculares) típicas do ${a.est === 'sec' ? (a.ano || '') + '.º ano do ensino secundário' : (a.ano ? a.ano + '.º ano' : '1.º ano') + ' do curso de ' + a.curso + (a.inst ? ' em ' + a.inst : '')}, no semestre atual (${semNow()}), em ${a.country === 'BR' ? 'Brasil' : a.country === 'PT' ? 'Portugal' : OS.Pais ? OS.Pais.name(a.country, 'pt') : a.country}. Usa os nomes oficiais mais prováveis, ${a.country === 'BR' ? 'em português do Brasil' : a.country === 'PT' ? 'em português de Portugal' : 'na língua em que são ensinadas nesse país'}. Se não tiveres a certeza, dá as mais comuns desse curso e ano. Entre 4 e 8.
JSON: {"disciplinas":["…"]}` }], .2);
    const L = (o.disciplinas || []).map(s => String(s).trim()).filter(Boolean).slice(0, 10); if (!L.length) throw new Error('vazio');
    W.a.subs = [...new Set(subsOf(W.a).concat(L))].join('\n'); }
  catch (e) { W.sugErr = 'Não consegui sugerir agora. Escreve as tuas disciplinas, uma por linha.'; }
  W.sug = false; draw(); };
const aiMarcos = async a => { if (!aiOn() || !OS.Dom || !OS.Dom.legAddMine) return;
  try { const o = await OS.AI.json([{ text: `És o mestre de jogo do Dominus, o RPG da vida real da app Prumo. Cria marcos (conquistas reais da vida, difíceis mas possíveis, concretos e verificáveis, com números quando fizer sentido) para esta pessoa, a partir do que ela contou. Português de Portugal, frases curtas (máx. 90 caracteres), sem emojis.
Pilares: "int" (Intelecto: estudos, línguas, leitura, competências), "for" (Fortuna: dinheiro, trabalho, carreira, negócio), "cor" (Corpo: treino, saúde, desporto, sono), "inf" (Influência: família, amizades, relações, rede), "esp" (Espírito: ${on(a, 'fe') ? 'fé, oração, gratidão, paz interior' : 'paz interior, gratidão, propósito, sem religião'}).
Dá 3 marcos por pilar, do mais próximo ao mais ambicioso, ligados à vida dela (curso, trabalho, desportos, metas). Não repitas estes: ${JSON.stringify(marcosFor(a))}.
A pessoa: ${ctxOf(a)}
JSON: {"int":["…"],"for":["…"],"cor":["…"],"inf":["…"],"esp":["…"]}` }], .5);
    let n = 0; ['int', 'for', 'cor', 'inf', 'esp'].forEach(p => { const L = (o[p] || []).map(s => String(s).trim()).filter(s => s.length > 6).slice(0, 4); if (L.length) n += OS.Dom.legAddMine(p, L, true); });
    if (n) { OS.setOne('onb', { ai: n }); OS.request(); } } catch (e) { } };

/* ---------- o ecrã ---------- */
let W = null; // { i, a, busy, res, sug, sugErr, only }
const steps = () => W.only ? STEPS.filter(s => s.id === 'areas') : STEPS.filter(s => !s.show || s.show(W.a));
const host = () => { let h = document.getElementById('onb'); if (!h) { h = document.createElement('div'); h.id = 'onb'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true'); h.setAttribute('aria-label', 'Personalizar o Prumo'); document.body.appendChild(h);
    h.addEventListener('click', onClick); h.addEventListener('input', onInput); h.addEventListener('change', onInput); } return h; };
const draw = () => { if (!W) return; const h = host(), L = steps(), s = L[Math.min(W.i, L.length - 1)], last = s.id === 'fim', n = L.length;
  if (W.res) { h.innerHTML = `<div class="onb-in"><div class="onb-top"><span class="onb-brand">${OS.Lock.logo(26)}<b class="pr-word">Prumo</b></span></div><div class="onb-body"><p class="eyebrow">Está feito</p><h1>O teu Prumo está pronto${W.a.short ? ', ' + esc(W.a.short) : ''}</h1>
    <ul class="onb-sum">${(W.res.length ? W.res : ['As tuas escolhas foram guardadas']).map(x => `<li>${UI.ic('check')}<span>${esc(x.charAt(0).toUpperCase() + x.slice(1))}</span></li>`).join('')}</ul>
    <p class="mut">Podes mudar tudo nas páginas de cada área, voltar a responder em <b>Definições › Geral</b> e ligar ou esconder abas em Definições ou em Explorar.</p></div>
    <div class="onb-foot"><span class="grow"></span><button class="btn pri" data-onb="fechar">Começar</button></div></div>`; h.hidden = false; return; }
  h.innerHTML = `<div class="onb-in"><div class="onb-top"><span class="onb-brand">${OS.Lock.logo(26)}<b class="pr-word">Prumo</b></span><span class="onb-n">${W.only ? '' : `${W.i + 1} de ${n}`}</span>${W.only ? `<button class="icon-btn" data-onb="fechar" aria-label="Fechar">${UI.ic('x')}</button>` : `<button class="btn sm ghost" data-onb="saltar">Saltar</button>`}</div>
    ${W.only ? '' : `<div class="onb-bar" aria-hidden="true"><i style="width:${Math.round((W.i + 1) / n * 100)}%"></i></div>`}
    <div class="onb-body"><h1>${esc(s.t)}</h1><p class="onb-s">${esc(s.s)}</p>${s.b(W.a)}</div>
    <div class="onb-foot">${W.i > 0 && !W.only ? `<button class="btn ghost" data-onb="voltar">Voltar</button>` : ''}<span class="grow"></span>${W.only ? `<button class="btn pri" data-onb="guardarAreas">Guardar</button>` : last ? `<button class="btn pri" data-onb="criar" ${W.busy ? 'disabled' : ''}>${W.busy ? 'A preparar…' : 'Criar o meu Prumo'}</button>` : `<button class="btn pri" data-onb="seguinte">Continuar</button>`}</div></div>`;
  h.hidden = false; document.body.classList.add('onb-open'); };
const close = () => { const h = document.getElementById('onb'); if (h) { h.hidden = true; h.innerHTML = ''; } document.body.classList.remove('onb-open'); W = null; OS.request(); };
// a língua muda logo, para o resto das perguntas já aparecer nela
const langNow = c => { if (OS.Lang && OS.Lang.ok(c)) OS.Lang.set(c); };
const onInput = e => { if (!W) return; const el = e.target, k = el.dataset.ok, m3 = el.dataset.om3; if (k) { W.a[k] = el.value; if (k === 'ia') { /* nome escrito à mão */ } if (k === 'country' && e.type === 'change') { W.a.moeda = CUR[el.value] || W.a.moeda; if (OS.Pais && !W.langSet) { W.a.lang = OS.Pais.langOf(el.value); langNow(W.a.lang); } draw(); }
    if (k === 'lang' && e.type === 'change') { W.langSet = 1; langNow(el.value); draw(); } }
  if (m3 != null) W.a.metas[+m3] = el.value; };
const onClick = async e => { if (!W) return; const b = e.target.closest('button'); if (!b || b.disabled) return; const a = W.a, hide = new Set(a.hide);
  if (b.dataset.oc) { a[b.dataset.oc] = isNaN(+b.dataset.v) || b.dataset.oc === 'poup' || b.dataset.oc === 'nivel' ? b.dataset.v : +b.dataset.v; if (b.dataset.oc === 'ia') { const f = document.querySelector('#onb [data-ok=ia]'); if (f) f.value = ''; }
    if (b.dataset.oc === 'voz' && OS.Spyke && OS.Spyke.say) { const prev = OS.one('spyke').voice; OS.one('spyke').voice = b.dataset.v; try { OS.Spyke.say(`Olá${a.short ? ', ' + a.short.split(' ')[0] : ''}. É assim que eu falo.`, { bg: true, tap: true, eng: 'gemini' }); } catch (e) { } setTimeout(() => { if (!OS.one('onb').done) OS.one('spyke').voice = prev; }, 8000); }
    return draw(); }
  if (b.dataset.om) { const L = new Set(a[b.dataset.om] || []); L.has(b.dataset.v) ? L.delete(b.dataset.v) : L.add(b.dataset.v); a[b.dataset.om] = [...L]; return draw(); }
  if (b.dataset.oa) { toggleArea(hide, b.dataset.oa); a.hide = [...hide]; return draw(); }
  if (b.dataset.oag) { toggleGroup(hide, b.dataset.oag); a.hide = [...hide]; return draw(); }
  const o = b.dataset.onb; if (!o) return; const L = steps();
  if (o === 'seguinte') { if (L[W.i].id === 'tu' && !String(a.short || '').trim()) { UI.toast('Escreve o teu nome', 'warn'); return; } W.i = Math.min(W.i + 1, L.length - 1); draw(); document.querySelector('#onb .onb-body') && document.querySelector('#onb .onb-body').scrollTo(0, 0); return; }
  if (o === 'voltar') { W.i = Math.max(0, W.i - 1); return draw(); }
  if (o === 'saltar') { if (!W.again) OS.setOne('onb', { done: 'skip', at: new Date().toISOString() }); close(); UI.toast('Podes personalizar mais tarde em Definições › Geral'); return; }
  if (o === 'fechar') { close(); if (location.hash !== '#definicoes' && !W) location.hash = 'visao'; return; }
  if (o === 'guardarAreas') { OS.Areas.set(a.hide); close(); UI.toast('Menu atualizado', 'pos'); return; }
  if (o === 'criar') { W.busy = true; draw(); try { W.res = await apply(a); } catch (er) { console.error(er); W.res = ['As tuas escolhas foram guardadas']; } W.busy = false; draw(); } };
OS.Onb = { open: again => { W = { i: 0, a: defaults(), again: !!again }; draw(); }, isOpen: () => !!W, plan: a => plan(Object.assign(defaults(), a)), apply: a => apply(Object.assign(defaults(), a)) };
A.onbOpen = () => OS.Onb.open(true);
A.onbAreas = () => { W = { i: 0, a: defaults(), only: true }; draw(); };

/* ---------- abrir na primeira vez; Definições › Geral ---------- */
const due = () => pub() && !window.__noOnb && !OS.one('onb').done && !(OS.Legal && OS.Legal.pending && OS.Legal.pending());
const tryOpen = () => { if (!due() || W || !(OS.Lock && OS.Lock.unlocked && OS.Lock.unlocked())) return; const m = document.getElementById('modal'); if (m && !m.hidden) UI.closeModal(); OS.Onb.open(false); };
OS.on('ready', () => { setTimeout(tryOpen, 900); });
OS.on('unlock', () => setTimeout(tryOpen, 600));
setInterval(() => { if (!W && due()) tryOpen(); }, 2500);
OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._onb) return; OS.views.definicoes = sub => o(sub) + (String(sub || '') === '' && pub() ? `<div class="pn" id="onbSet"><div class="pn-h"><h3>${UI.ic('star')}O teu Prumo</h3></div>
  <p class="mut" style="margin:0 0 10px">${OS.one('onb').done === 'ok' ? 'Já personalizaste o Prumo. Podes responder outra vez às perguntas (o que já existe fica, e junta-se o que for novo) ou mudar as abas do menu.' : 'Responde a umas perguntas rápidas e o Prumo fica feito para ti: abas, disciplinas, treino, dieta, hábitos, metas e marcos do jogo.'}</p>
  <div class="row gap8" style="flex-wrap:wrap"><button class="btn sm pri" data-act="onbOpen">${OS.one('onb').done === 'ok' ? 'Responder outra vez' : 'Personalizar agora'}</button><button class="btn sm" data-act="onbAreas">Abas do menu${hiddenSet().size ? ' · ' + hiddenSet().size + ' escondida' + (hiddenSet().size > 1 ? 's' : '') : ''}</button></div></div>` : ''); OS.views.definicoes._onb = 1; });
})();
