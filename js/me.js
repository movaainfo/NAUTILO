/* OCEANUM — Quem sou eu: a vida do Ryan num só lugar.
   Retrato (quem és em poucas palavras) · Biografia completa escrita pela IA, editável capítulo a capítulo (as tuas edições ficam protegidas) ·
   Família & amigos (aniversários, histórias) · Linha do tempo da vida · Tudo sobre mim (origens, personalidade, valores, gostos, fé, sonhos) ·
   Entrevista guiada (perguntas que alimentam a biografia). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc;
OS.ONE_DEF.me = { birth: '', birthplace: '', hometown: '', nationality: 'Brasileira', ptSince: '', langs: 'Português', qa: {}, bio: null, photo: '' };
OS.ONE_DEF.mever = { v: [] };
const me = () => OS.one('me'), P = () => OS.one('profile'), today = () => U.today();
const first = () => (P().short || (P().name || 'Ryan').split(' ')[0]);

/* ---------- coleções ---------- */
const RELS = ['Mãe', 'Pai', 'Irmão', 'Irmã', 'Avó', 'Avô', 'Tio', 'Tia', 'Primo', 'Prima', 'Namorada', 'Esposa', 'Filho', 'Filha', 'Padrasto', 'Madrasta', 'Cunhado(a)', 'Sogro(a)', 'Melhor amigo(a)', 'Amigo(a)', 'Mentor', 'Pastor / líder', 'Professor(a)', 'Colega', 'Chefe', 'Outro'];
const GROUPS = ['Família', 'Amigos', 'Igreja', 'Universidade', 'Trabalho', 'Mentores', 'Outros'];
const grpOf = r => /Mãe|Pai|Irm|Av[óô]|Tio|Tia|Prim|Esposa|Filh|Padrast|Madrast|Cunhad|Sogr/.test(r || '') ? 'Família' : /amig/i.test(r || '') ? 'Amigos' : /Pastor/.test(r || '') ? 'Igreja' : /Mentor|Professor/.test(r || '') ? 'Mentores' : /Colega|Chefe/.test(r || '') ? 'Trabalho' : 'Outros';
OS.S.people = { label: 'Pessoa', title: r => r.name, fields: [
  { k: 'name', l: 'Nome', t: 'text', req: 1 }, { k: 'rel', l: 'Quem é para mim', t: 'sel', o: RELS }, { k: 'group', l: 'Grupo', t: 'sel', o: GROUPS, h: 'Família, amigos, igreja…' },
  { k: 'close', l: 'Proximidade', t: 'rating' }, { k: 'birthday', l: 'Aniversário', t: 'date', h: 'Se não souberes o ano, usa um ano qualquer.' }, { k: 'where', l: 'Onde vive', t: 'text' },
  { k: 'since', l: 'Conheço desde', t: 'text', h: 'Ex.: desde sempre, 2019, no 1.º ano da universidade' }, { k: 'how', l: 'Como nos conhecemos', t: 'area', rows: 2 },
  { k: 'story', l: 'Histórias e memórias juntos', t: 'area', rows: 3 }, { k: 'means', l: 'O que significa para mim', t: 'area', rows: 2 },
  { k: 'contact', l: 'Telefone / email', t: 'text' }, { k: 'notes', l: 'Notas (gostos, presentes, pedidos de oração…)', t: 'area', rows: 2 }],
  defaults: () => ({ close: 3 }), after: r => { if (!r.group && r.rel) OS.upd('people', r.id, { group: grpOf(r.rel) }, { silent: true }); } };
const CATS = ['Nascimento', 'Família', 'Infância', 'Escola', 'Mudança', 'Estudos', 'Trabalho', 'Empreender', 'Fé', 'Relação', 'Amizade', 'Conquista', 'Viagem', 'Saúde', 'Perda', 'Dificuldade', 'Decisão', 'Outro'];
const CIC = { Nascimento: '•', Família: '•', Infância: '•', Escola: '•', Mudança: '•', Estudos: '•', Trabalho: '•', Empreender: '•', Fé: '•', Relação: '•', Amizade: '•', Conquista: '•', Viagem: '•', Saúde: '•', Perda: '•', Dificuldade: '•', Decisão: '•', Outro: '•' };
OS.S.lifeev = { label: 'Momento da minha vida', title: r => r.title, fields: [
  { k: 'title', l: 'O que aconteceu', t: 'text', req: 1 }, { k: 'date', l: 'Quando (data)', t: 'date', h: 'Se só souberes o ano, escolhe 1 de janeiro desse ano.' }, { k: 'cat', l: 'Tipo', t: 'sel', o: CATS },
  { k: 'place', l: 'Onde', t: 'text' }, { k: 'people', l: 'Com quem', t: 'text' }, { k: 'imp', l: 'Importância', t: 'rating' },
  { k: 'desc', l: 'Conta como foi', t: 'area', rows: 4 }, { k: 'lesson', l: 'O que aprendi', t: 'area', rows: 2 }],
  defaults: () => ({ cat: 'Outro', imp: 3 }) };

/* ---------- tudo sobre mim (campos) ---------- */
const ABOUT = [
  ['Origens', [['birth', 'Data de nascimento', 'date'], ['birthplace', 'Onde nasci (cidade, estado)'], ['hometown', 'Onde cresci'], ['nationality', 'Nacionalidade'], ['ptSince', 'Em Portugal desde', 'date'], ['whyPT', 'Porque vim para Portugal', 'area'], ['langs', 'Línguas que falo'], ['childhood', 'A minha infância em poucas linhas', 'area']]],
  ['Família', [['parents', 'Os meus pais (quem são, o que fazem)', 'area'], ['siblings', 'Irmãos'], ['familyNote', 'Como é a minha família', 'area'], ['relationship', 'Estado / relação']]],
  ['Personalidade', [['personality', 'Como me descrevo', 'area'], ['mbti', 'Tipo de personalidade (ex.: MBTI, temperamento)'], ['strengths', 'Pontos fortes', 'area'], ['weak', 'Pontos a melhorar', 'area'], ['fears', 'Medos que quero vencer', 'area'], ['energy', 'O que me dá energia / o que me tira']]],
  ['Valores e propósito', [['values', 'Os meus valores', 'area'], ['mission', 'A minha missão de vida', 'area'], ['motto', 'Frase que me define'], ['proud', 'Do que mais me orgulho', 'area']]],
  ['Fé', [['testimony', 'O meu testemunho (como conheci Deus)', 'area'], ['church', 'Igreja / comunidade'], ['verse', 'Versículo da minha vida'], ['faithNow', 'Como está a minha fé hoje', 'area']]],
  ['Gostos', [['hobbies', 'Hobbies'], ['music', 'Música e artistas'], ['films', 'Filmes e séries'], ['books', 'Livros que me marcaram'], ['food', 'Comida favorita'], ['sports', 'Desporto / clube'], ['places', 'Lugares favoritos']]],
  ['Sonhos e futuro', [['dreams', 'Sonhos', 'area'], ['bucket', 'Coisas que quero fazer antes de morrer', 'area'], ['legacy', 'Como quero ser lembrado', 'area']]],
  ['Saúde', [['blood', 'Grupo sanguíneo'], ['allergies', 'Alergias / medicação'], ['emergency', 'Contacto de emergência']]]];
const KEYS = ABOUT.flatMap(s => s[1].map(f => f[0]));

/* ---------- entrevista ---------- */
const QS = [
  ['Origens', ['Qual é a tua lembrança mais antiga?', 'Como era a casa onde cresceste?', 'Como eram os teus dias de criança?', 'Que pessoa mais te marcou na infância e porquê?', 'Em que eras bom na escola? E em que tinhas dificuldade?']],
  ['Família', ['O que aprendeste com a tua mãe?', 'O que aprendeste com o teu pai?', 'Qual é a tradição de família de que mais gostas?', 'Que momento em família nunca vais esquecer?']],
  ['Portugal', ['Como foi a decisão de vir para Portugal?', 'Como foi o primeiro dia em Portugal?', 'O que mais estranhaste? E do que mais gostaste?', 'Do que sentes mais saudades do Brasil?']],
  ['Fé', ['Quando é que a fé se tornou tua e não só da tua família?', 'Em que momento sentiste Deus mais perto?', 'Que oração respondida mais te marcou?']],
  ['Caminho', ['Qual foi o momento mais difícil da tua vida até hoje? Como saíste dele?', 'Qual foi a melhor decisão que já tomaste?', 'Do que te arrependes e o que aprendeste com isso?', 'Qual foi a tua maior vitória?', 'Quem são os teus melhores amigos e como os conheceste?']],
  ['Futuro', ['Onde te vês daqui a 10 anos?', 'Que tipo de pai, marido e amigo queres ser?', 'Que impacto queres deixar no mundo?', 'Se pudesses dizer uma coisa ao Ryan de 10 anos, o que seria?']]];
const QALL = QS.flatMap(([g, a]) => a.map((q, i) => ({ id: g.slice(0, 3).toLowerCase() + i, g, q })));
const aiQs = () => (me().aiq || []).map((q, i) => ({ id: 'ai' + U.hash(q).toString(36), g: 'A IA quer saber', q }));

/* ---------- utilidades ---------- */
const age = d => { if (!d) return null; const b = U.parse(d), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--; return a; };
const nextBday = d => { if (!d) return null; const t = today(), y = +t.slice(0, 4); let n = y + d.slice(4); if (n < t) n = (y + 1) + d.slice(4); return { date: n, days: U.diff(n, t), turns: +n.slice(0, 4) - +d.slice(0, 4) }; };
const yrs = d => { if (!d) return ''; const m = Math.round(U.diff(today(), d) / 30.44); return m < 12 ? m + (m === 1 ? ' mês' : ' meses') : Math.floor(m / 12) + (Math.floor(m / 12) === 1 ? ' ano' : ' anos'); };
const fullDate = s => { const d = U.parse(s); return d.getDate() + ' de ' + U.MESL[d.getMonth()] + ' de ' + d.getFullYear(); };
const fmtY = d => d ? (d.slice(5) === '01-01' ? d.slice(0, 4) : U.fmtD(d)) : 'sem data';
const filled = () => { const m = me(); return KEYS.filter(k => String(m[k] || '').trim()).length; };
const answered = () => Object.values(me().qa || {}).filter(x => String(x || '').trim()).length;
const completeness = () => { const parts = [[filled() / KEYS.length, 3], [Math.min(1, OS.all('people').length / 8), 2], [Math.min(1, OS.all('lifeev').length / 10), 2], [Math.min(1, answered() / 15), 2], [me().bio ? 1 : 0, 1]]; return parts.reduce((s, [v, w]) => s + v * w, 0) / parts.reduce((s, [, w]) => s + w, 0); };

/* ---------- factos para a IA (só o que está registado) ---------- */
const facts = () => { const m = me(), p = P(), ns = OS.one('northstar'), about = {}, qa = [];
  KEYS.forEach(k => { if (String(m[k] || '').trim()) about[k] = m[k]; });
  [...QALL, ...aiQs()].forEach(q => { const a = (m.qa || {})[q.id]; if (a && a.trim()) qa.push({ pergunta: q.q, resposta: a }); });
  const lst = (c, f, n = 40) => OS.all(c).slice(0, n).map(f);
  return { nome: p.name, tratamento: first(), idade: age(m.birth), cidade_atual: p.city, universidade: p.uni, curso: p.course, trabalho: [p.jobRole, p.employer].filter(Boolean).join(' em '), sobre: about, entrevista: qa,
    pessoas: lst('people', x => ({ nome: x.name, rel: x.rel, desde: x.since, como: x.how, historias: x.story, significa: x.means, onde: x.where }), 60),
    linha_do_tempo: U.sortBy(OS.all('lifeev'), x => x.date || '').map(x => ({ data: x.date, o_que: x.title, tipo: x.cat, onde: x.place, com: x.people, como_foi: x.desc, aprendi: x.lesson })),
    norte: { visao_3m: ns.h3m, visao_1a: ns.h1y, visao_3a: ns.h3y, visao_5a: ns.h5y, longo_prazo: ns.hlong, valores: ns.values, identidade: ns.identity, nao_aceito: ns.notAccept },
    experiencias: lst('experiences', x => ({ titulo: x.title, org: x.org, tipo: x.kind, inicio: x.start, fim: x.end, desc: x.desc })),
    metas: lst('goals', x => ({ meta: x.title, estado: x.status, area: x.area }), 25), projetos: lst('projects', x => ({ projeto: x.name, estado: x.status, objetivo: x.objective }), 25),
    competencias: lst('skills', x => x.name, 30), empresa: OS.one('mova').what ? { nome: OS.one('mova').name, o_que: OS.one('mova').what, fase: OS.one('mova').stage } : null,
    fe: { oracoes_respondidas: OS.all('prayers').filter(x => x.status === 'Respondida').map(x => x.title + (x.answer ? ': ' + x.answer : '')).slice(0, 10), devocionais: OS.all('devos').length },
    habitos: OS.all('habits').map(h => h.name).slice(0, 15) };
};

/* ---------- biografia ---------- */
const CH = ['Origens', 'Família', 'Infância e juventude', 'Uma nova vida em Portugal', 'Estudos', 'Trabalho e empreendedorismo', 'Fé', 'Amigos e pessoas que me marcaram', 'Quem sou hoje', 'Sonhos e o futuro'];
const chId = () => 'c' + Math.random().toString(36).slice(2, 8);
const sent = a => a.filter(Boolean).join(' ');
const draft = () => { const m = me(), p = P(), n = first(), ppl = OS.all('people'), ev = U.sortBy(OS.all('lifeev'), x => x.date || ''), ns = OS.one('northstar'), fam = ppl.filter(x => (x.group || grpOf(x.rel)) === 'Família'), fr = ppl.filter(x => (x.group || grpOf(x.rel)) !== 'Família');
  const evs = cats => ev.filter(e => cats.includes(e.cat)).map(e => `${e.date ? 'Em ' + fmtY(e.date) + ', ' : ''}${e.title.charAt(0).toLowerCase() + e.title.slice(1)}${e.place ? ' (' + e.place + ')' : ''}.${e.desc ? ' ' + e.desc : ''}`).join(' ');
  const ch = [
    ['Origens', sent([m.birthplace || m.birth ? `${p.name || n} nasceu${m.birthplace ? ' em ' + m.birthplace : ''}${m.birth ? ' a ' + fullDate(m.birth) : ''}.` : '', m.hometown ? `Cresceu em ${m.hometown}.` : '', m.childhood, evs(['Nascimento'])])],
    ['Família', sent([m.parents, m.siblings ? 'Irmãos: ' + m.siblings + '.' : '', m.familyNote, fam.length ? `Na família, ${fam.map(x => `${x.name}${x.rel ? ' (' + x.rel.toLowerCase() + ')' : ''}`).join(', ')}.` : '', fam.filter(x => x.means).map(x => `${x.name}: ${x.means}`).join(' '), evs(['Família'])])],
    ['Infância e juventude', sent([evs(['Infância', 'Escola'])])],
    ['Uma nova vida em Portugal', sent([m.ptSince ? `Chegou a Portugal em ${fullDate(m.ptSince)}${p.city ? ' e vive em ' + p.city : ''}.` : p.city ? `Vive hoje em ${p.city}, Portugal.` : '', m.whyPT, evs(['Mudança'])])],
    ['Estudos', sent([p.uni ? `Estuda ${p.course ? p.course + ' ' : ''}no ${p.uni}.` : '', evs(['Estudos'])])],
    ['Trabalho e empreendedorismo', sent([p.employer || p.jobRole ? `Trabalha${p.jobRole ? ' como ' + p.jobRole : ''}${p.employer ? ' na ' + p.employer : ''}.` : '', OS.all('experiences').map(x => `${x.title}${x.org ? ' — ' + x.org : ''}.`).join(' '), OS.one('mova').what ? `Está a construir a ${OS.one('mova').name || 'Mova'}: ${OS.one('mova').what}.` : '', evs(['Trabalho', 'Empreender'])])],
    ['Fé', sent([m.testimony, m.church ? 'Faz parte da ' + m.church + '.' : '', m.verse ? `O versículo da sua vida é ${m.verse}.` : '', m.faithNow, evs(['Fé'])])],
    ['Amigos e pessoas que me marcaram', sent([fr.map(x => `${x.name}${x.rel ? ' (' + x.rel.toLowerCase() + ')' : ''}${x.how ? ': ' + x.how : ''}${x.means ? ' — ' + x.means : ''}`).join('. ') + (fr.length ? '.' : ''), evs(['Amizade', 'Relação'])])],
    ['Quem sou hoje', sent([m.personality, m.strengths ? 'Pontos fortes: ' + m.strengths + '.' : '', m.values || ns.values ? 'Valores: ' + (m.values || ns.values) + '.' : '', m.mission ? 'Missão: ' + m.mission + '.' : '', ns.identity, m.motto ? `“${m.motto}”` : '', evs(['Conquista', 'Decisão', 'Dificuldade', 'Perda', 'Saúde', 'Viagem', 'Outro'])])],
    ['Sonhos e o futuro', sent([m.dreams, ns.h5y ? 'Daqui a cinco anos: ' + ns.h5y + '.' : '', ns.hlong, m.legacy ? 'Quer ser lembrado assim: ' + m.legacy : ''])]];
  return { title: `A história de ${n}`, sub: [m.birthplace, p.city].filter(Boolean).join(' → '), sum: sent([m.motto ? `“${m.motto}”` : '', m.personality]).slice(0, 400), ch: ch.filter(c => c[1].trim()).map(([t, txt]) => ({ id: chId(), t, txt })), at: Date.now(), ai: false, pov: me().pov || '3' };
};
let BUSY = '', ERR = '';
const snap = (label) => { const b = me().bio; if (!b) return; const v = OS.one('mever').v; v.unshift({ at: Date.now(), label, bio: JSON.parse(JSON.stringify(b)) }); v.splice(6); OS.touch('mever'); };
A.meBioAI = async b => { if (BUSY) return; const upd = b && b.dataset.mode === 'upd' && me().bio, pov = me().pov || '3', F = facts();
  if (!OS.AI || !OS.AI.key()) { UI.toast('Liga o Spyke (IA) na página do Spyke, ou usa o rascunho automático', 'neg'); return; }
  BUSY = upd ? 'A atualizar a tua biografia…' : 'A escrever a tua biografia…'; ERR = ''; OS.request();
  const cur = upd ? me().bio.ch.map(c => ({ id: c.id, titulo: c.t, texto: c.txt, editado_por_ele: !!c.lock })) : null;
  try { const o = await OS.AI.json([{ text: `És um biógrafo talentoso e rigoroso. Escreve a biografia de ${F.nome} (trata-o por ${F.tratamento}) em português${/^Brasil/i.test(me().nationality || 'Brasileira') ? ' (ele é brasileiro e vive em Portugal; usa um português natural e caloroso, sem regionalismos forçados)' : ''}, ${pov === '1' ? 'na PRIMEIRA pessoa ("eu"), como se fosse ele a contar' : 'na TERCEIRA pessoa'}.
REGRAS:
- Usa APENAS os factos abaixo. NUNCA inventes nomes, datas, lugares, acontecimentos ou sentimentos que não estejam lá. Se um capítulo não tem factos suficientes, escreve pouco ou omite-o — e põe em "faltam" perguntas concretas para o completar.
- Escreve bem: narrativa viva, com fio condutor, ligando os acontecimentos à pessoa que ele é hoje (identidade, fé, valores, sonhos). Parágrafos separados por \\n\\n. Sem listas, sem títulos dentro do texto.
- Respeita a fé dele (cristão) com naturalidade, sem exagero.
- Capítulos sugeridos (usa os que tiverem conteúdo, por esta ordem): ${CH.join(' · ')}.
${upd ? `- MODO ATUALIZAR: abaixo está a biografia atual. Os capítulos com "editado_por_ele": true foram escritos/corrigidos por ele — devolve-os EXATAMENTE iguais (mesmo id, mesmo texto). Nos outros, mantém o estilo e o que já está, e acrescenta/ajusta só com factos novos. Mantém os ids existentes; capítulos novos sem id.
BIOGRAFIA ATUAL: ${JSON.stringify(cur)}` : ''}
Devolve JSON: {"titulo":"título bonito","subtitulo":"uma linha","resumo":"2-3 frases: quem ele é","capitulos":[{"id":"(se existir)","titulo":"…","texto":"…"}],"faltam":["até 8 perguntas para completar a história"]}
FACTOS: ${JSON.stringify(F).slice(0, 60000)}` }], .6);
    if (me().bio) snap(upd ? 'Antes da atualização pela IA' : 'Antes de reescrever com IA'); const old = upd ? me().bio : null;
    const ch = (o.capitulos || []).filter(c => c && (c.texto || '').trim()).map(c => { const prev = old && old.ch.find(x => x.id === c.id); return prev && prev.lock ? prev : { id: (prev && prev.id) || chId(), t: c.titulo || 'Capítulo', txt: String(c.texto).trim() }; });
    if (old) old.ch.filter(c => c.lock && !ch.some(x => x.id === c.id)).forEach(c => ch.push(c));
    me().bio = { title: o.titulo || `A história de ${first()}`, sub: o.subtitulo || '', sum: o.resumo || '', ch, at: Date.now(), ai: true, pov };
    me().aiq = (o.faltam || []).slice(0, 8); OS.touch('me'); UI.toast(upd ? 'Biografia atualizada ✓' : 'Biografia escrita ✓', 'pos');
  } catch (e) { ERR = e.message || 'Não consegui escrever agora.'; }
  BUSY = ''; OS.request(); };
A.meDraft = () => { if (me().bio) snap('Antes do rascunho automático'); me().bio = draft(); OS.touch('me'); UI.toast('Rascunho criado com os teus dados — edita à vontade', 'pos'); };
A.mePov = b => { me().pov = b.dataset.v; OS.touch('me'); };
A.meChEdit = b => OS.setUI('meEd', b.dataset.id);
A.meChDone = () => OS.setUI('meEd', '');
A.meChLock = b => { const c = (me().bio.ch || []).find(x => x.id === b.dataset.id); if (c) { c.lock = !c.lock; OS.touch('me'); } };
A.meChDel = b => { if (!confirm('Apagar este capítulo?')) return; snap('Antes de apagar um capítulo'); me().bio.ch = me().bio.ch.filter(x => x.id !== b.dataset.id); OS.touch('me'); };
A.meChMove = b => { const a = me().bio.ch, i = a.findIndex(x => x.id === b.dataset.id), j = i + +b.dataset.d; if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; OS.touch('me'); };
A.meChAdd = () => { if (!me().bio) me().bio = { title: `A história de ${first()}`, sub: '', sum: '', ch: [], at: Date.now(), ai: false }; const c = { id: chId(), t: 'Novo capítulo', txt: '', lock: true }; me().bio.ch.push(c); OS.touch('me'); OS.setUI('meEd', c.id); };
A.meRestore = b => { const v = OS.one('mever').v[+b.dataset.i]; if (!v || !confirm('Voltar a esta versão? A atual fica guardada no histórico.')) return; snap('Antes de restaurar'); me().bio = JSON.parse(JSON.stringify(v.bio)); OS.touch('me'); };
A.meCopy = () => { const b = me().bio; if (!b) return; const t = `${b.title}\n${b.sub || ''}\n\n${b.sum || ''}\n\n` + b.ch.map(c => c.t.toUpperCase() + '\n\n' + c.txt).join('\n\n'); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => UI.toast('Biografia copiada', 'pos')).catch(() => UI.toast('Não consegui copiar', 'neg')); };
A.meDown = () => { const b = me().bio; if (!b) return; const t = `# ${b.title}\n\n_${b.sub || ''}_\n\n${b.sum || ''}\n\n` + b.ch.map(c => `## ${c.t}\n\n${c.txt}`).join('\n\n'), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/markdown' })); a.download = 'biografia-' + first().toLowerCase() + '.md'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
// edição: guarda ao sair do campo; capítulo editado por ti fica protegido da IA
document.addEventListener('change', e => { const el = e.target, d = el.dataset || {}; if (!d.mech) return; const b = me().bio; if (!b) return;
  if (d.mech === '_title' || d.mech === '_sub' || d.mech === '_sum') { b[{ _title: 'title', _sub: 'sub', _sum: 'sum' }[d.mech]] = el.value; OS.touch('me'); return; }
  const c = b.ch.find(x => x.id === d.mech); if (!c) return; if (d.f === 't') c.t = el.value; else { if (c.txt !== el.value) c.lock = true; c.txt = el.value; } OS.touch('me'); });
document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.mech && el.tagName === 'TEXTAREA') { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } });

/* ---------- foto ---------- */
A.mePhoto = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const s = 320, c = document.createElement('canvas'), k = Math.min(im.width, im.height); c.width = c.height = s; c.getContext('2d').drawImage(im, (im.width - k) / 2, (im.height - k) / 2, k, k, 0, 0, s, s); me().photo = c.toDataURL('image/jpeg', .82); OS.touch('me'); }; im.src = r.result; }; r.readAsDataURL(f); }; i.click(); };
A.mePhotoDel = () => { me().photo = ''; OS.touch('me'); };
const avatar = (cls = '') => me().photo ? `<img class="me-av ${cls}" src="${me().photo}" alt="${esc(first())}">` : `<div class="me-av ${cls} me-av0">${esc(first().charAt(0))}</div>`;

/* ---------- entrevista: guardar respostas ---------- */
document.addEventListener('change', e => { const el = e.target; if (!el.dataset || !el.dataset.meq) return; me().qa = me().qa || {}; me().qa[el.dataset.meq] = el.value; OS.touch('me'); });

/* ---------- vistas ---------- */
const T = {};
const TABS = [['', 'Retrato'], ['bio', 'Biografia'], ['pessoas', 'Família & amigos'], ['historia', 'Linha do tempo'], ['sobre', 'Tudo sobre mim'], ['entrevista', 'Entrevista']];
V.eu = sub => { const k = TABS.some(t => t[0] === (sub || '')) ? (sub || '') : '';
  return UI.head(`Quem sou eu`, `A tua vida num só lugar: a tua história, as pessoas que amas, os momentos que te marcaram e quem és.`, '', 'Eu') + UI.tabs('eu', TABS, k) + `<div class="me">${T[k]()}</div>`; };

T[''] = () => { const m = me(), p = P(), a = age(m.birth), cp = completeness(), ppl = OS.all('people'), ev = OS.all('lifeev'), b = m.bio;
  const bd = U.sortBy(ppl.map(x => ({ x, n: nextBday(x.birthday) })).filter(o => o.n), o => o.n.days).slice(0, 4);
  const miss = [!m.birth && ['Data de nascimento', 'eu.sobre'], !m.birthplace && ['Onde nasceste', 'eu.sobre'], !m.testimony && ['O teu testemunho', 'eu.sobre'], ppl.length < 3 && ['Família e amigos', 'eu.pessoas'], ev.length < 5 && ['Momentos da tua vida', 'eu.historia'], answered() < 5 && ['Responder à entrevista', 'eu.entrevista'], !b && ['Escrever a biografia', 'eu.bio']].filter(Boolean);
  const fact = (l, v) => v ? `<div class="me-f"><small>${l}</small><b>${esc(v)}</b></div>` : '';
  return `<div class="pn me-hero"><div class="me-hero-ph">${avatar('lg')}<div class="row gap6"><button class="btn xs ghost" data-act="mePhoto">${m.photo ? 'Mudar foto' : 'Pôr foto'}</button>${m.photo ? `<button class="btn xs ghost" data-act="mePhotoDel">Tirar</button>` : ''}</div></div>
    <div class="me-hero-t"><div class="eyebrow">Quem sou eu</div><h2>${esc(p.name || first())}</h2><p class="me-tag">${esc(m.motto || (b && b.sum) || 'Filho de Deus, estudante, sonhador — a história ainda está a ser escrita.')}</p>
      <div class="me-facts">${fact('Idade', a != null ? a + ' anos' : '')}${fact('Nasci em', m.birthplace)}${fact('Vivo em', p.city ? p.city + (m.ptSince ? ' · há ' + yrs(m.ptSince) : '') : '')}${fact('Estudo', [p.course, p.uni].filter(Boolean).join(' · '))}${fact('Trabalho', [p.jobRole, p.employer].filter(Boolean).join(' · '))}${fact('Fé', m.church)}${fact('Línguas', m.langs)}${fact('Versículo', m.verse)}</div></div></div>
  <div class="g g3">
    <div class="pn"><div class="pn-h"><h3>${UI.ic('note')}A minha biografia</h3><a class="acc" href="#eu.bio" style="font-size:12px">abrir →</a></div>${b ? `<p class="me-q">${esc(b.sum || (b.ch[0] || {}).txt || '').slice(0, 320)}${(b.sum || '').length > 320 ? '…' : ''}</p><small class="mut">${b.ch.length} capítulos · atualizada ${U.rel(U.iso(new Date(b.at)))}</small>` : `<p class="mut">A IA escreve a tua história com tudo o que está no Oceanum — e tu podes mudar tudo.</p><a class="btn sm pri" href="#eu.bio">Escrever a minha biografia</a>`}</div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('users')}Pessoas da minha vida</h3><a class="acc" href="#eu.pessoas" style="font-size:12px">ver →</a></div><div class="co-own"><div><b>${ppl.filter(x => (x.group || grpOf(x.rel)) === 'Família').length}</b><small>família</small></div><div><b>${ppl.filter(x => (x.group || grpOf(x.rel)) === 'Amigos').length}</b><small>amigos</small></div><div><b>${ppl.length}</b><small>no total</small></div></div>
      ${bd.length ? `<div class="eyebrow" style="margin-top:8px">Próximos aniversários</div>${bd.map(o => `<div class="li click" data-edit="people:${o.x.id}"><div class="li-t"><b>${esc(o.x.name)}</b><small>${o.n.days === 0 ? '<span class="pos">hoje!</span>' : o.n.days === 1 ? 'amanhã' : 'daqui a ' + o.n.days + ' dias'} · ${U.fmtDS(o.n.date)}${o.n.turns > 0 && o.n.turns < 120 ? ' · faz ' + o.n.turns : ''}</small></div></div>`).join('')}` : UI.addBtn('people', 'Adicionar pessoa', null, 'sm')}</div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('star')}O meu perfil</h3><span class="mono">${U.pct(cp)}</span></div>${UI.bar(cp, cp >= .8 ? 'pos' : '')}<small class="mut">Quanto mais contares, melhor a IA te conhece (e melhor fica a tua biografia).</small>
      <div class="fe-chs" style="margin-top:8px">${miss.slice(0, 6).map(([l, h]) => `<a class="chip" href="#${h}">+ ${l}</a>`).join('') || '<span class="pos">Perfil muito completo</span>'}</div></div></div>
  ${ev.length ? `<div class="pn"><div class="pn-h"><h3>${UI.ic('clock')}Momentos que me marcaram</h3><a class="acc" href="#eu.historia" style="font-size:12px">linha do tempo →</a></div><div class="me-strip">${U.sortBy(ev.filter(e => +e.imp >= 4), e => e.date || '', -1).concat(U.sortBy(ev.filter(e => !(+e.imp >= 4)), e => e.date || '', -1)).slice(0, 6).map(e => `<div class="me-mom" data-edit="lifeev:${e.id}"><span>${CIC[e.cat] || '•'}</span><b>${esc(e.title)}</b><small>${fmtY(e.date)}${e.place ? ' · ' + esc(e.place) : ''}</small></div>`).join('')}</div></div>` : ''}
  ${(m.values || m.mission || m.dreams) ? `<div class="g g3">${[['Os meus valores', m.values], ['A minha missão', m.mission], ['Os meus sonhos', m.dreams]].filter(x => x[1]).map(([t, v]) => `<div class="pn"><div class="pn-h"><h3>${t}</h3></div><p class="me-q">${esc(v)}</p></div>`).join('')}</div>` : ''}`; };

T.bio = () => { const m = me(), b = m.bio, key = OS.AI && OS.AI.key(), ed = OS.ui.meEd, pov = m.pov || '3', vers = OS.one('mever').v;
  const tools = `<div class="pn me-btools"><div class="row gap8" style="flex-wrap:wrap;align-items:center">
    ${key ? `<button class="btn ${b ? '' : 'pri'}" data-act="meBioAI" data-mode="new" ${BUSY ? 'disabled' : ''}>${UI.ic('zap')}${b ? 'Reescrever do zero com IA' : 'Escrever a minha biografia com IA'}</button>${b ? `<button class="btn pri" data-act="meBioAI" data-mode="upd" ${BUSY ? 'disabled' : ''}>${UI.ic('zap')}Atualizar com o que há de novo</button>` : ''}` : ''}
    <button class="btn ${key ? 'ghost' : 'pri'}" data-act="meDraft" ${BUSY ? 'disabled' : ''}>Rascunho automático (sem IA)</button>
    <div class="seg" role="group" aria-label="Narrador"><button class="${pov === '3' ? 'on' : ''}" data-act="mePov" data-v="3">Ele</button><button class="${pov === '1' ? 'on' : ''}" data-act="mePov" data-v="1">Eu</button></div>
    ${b ? `<span class="grow"></span><button class="btn sm ghost" data-act="meCopy">Copiar</button><button class="btn sm ghost" data-act="meDown">Descarregar</button><button class="btn sm ghost" onclick="window.print()">Imprimir</button>` : ''}</div>
    <small class="mut" style="display:block;margin-top:8px">A IA só usa o que está registado (Tudo sobre mim, pessoas, linha do tempo, entrevista, metas, projetos, fé…) — não inventa. Capítulos que editas ficam protegidos e a IA não os altera.</small>
    ${BUSY ? `<div class="sai-busy"><div class="fd-spin"></div><span>${BUSY}</span></div>` : ''}${ERR ? `<p class="neg" style="margin:8px 0 0">${esc(ERR)}</p>` : ''}</div>`;
  if (!b) return (key ? '' : (OS.AI && OS.AI.setup ? `<div class="pn">${OS.AI.setup('')}</div>` : '')) + tools + UI.empty('Ainda não há biografia. Antes de a escrever, conta um pouco em <a href="#eu.sobre">Tudo sobre mim</a>, <a href="#eu.pessoas">Família & amigos</a>, <a href="#eu.historia">Linha do tempo</a> e na <a href="#eu.entrevista">Entrevista</a> — quanto mais contares, melhor fica.');
  const aq = m.aiq || [];
  return tools + `<article class="pn me-book">
    <header class="me-bh">${avatar('md')}<div class="grow"><input class="me-in me-tt" data-mech="_title" value="${esc(b.title)}" aria-label="Título"><input class="me-in me-st" data-mech="_sub" value="${esc(b.sub || '')}" placeholder="Subtítulo" aria-label="Subtítulo"></div></header>
    <textarea class="me-in me-sum" data-mech="_sum" rows="2" placeholder="Em poucas palavras…" aria-label="Resumo">${esc(b.sum || '')}</textarea>
    ${b.ch.map((c, i) => `<section class="me-ch" id="mech-${c.id}"><div class="me-chh"><h3>${ed === c.id ? `<input class="field" id="meti-${c.id}" data-mech="${c.id}" data-f="t" value="${esc(c.t)}" aria-label="Título do capítulo">` : `<span class="me-n">${i + 1}</span>${esc(c.t)}`}${c.lock ? ' <span title="Editado por ti — a IA não altera" class="me-lock">protegido</span>' : ''}</h3>
      <div class="me-cha">${ed === c.id ? `<button class="btn xs pri" data-act="meChDone">Concluir</button>` : `<button class="btn xs ghost" data-act="meChEdit" data-id="${c.id}">✎ Editar</button>`}<button class="icon-btn" data-act="meChMove" data-id="${c.id}" data-d="-1" aria-label="Subir">↑</button><button class="icon-btn" data-act="meChMove" data-id="${c.id}" data-d="1" aria-label="Descer">↓</button><button class="icon-btn" data-act="meChLock" data-id="${c.id}" title="${c.lock ? 'Deixar a IA atualizar' : 'Proteger da IA'}" aria-label="Proteger">${c.lock ? 'Desproteger' : 'Proteger'}</button><button class="icon-btn" data-act="meChDel" data-id="${c.id}" aria-label="Apagar">${UI.ic('x')}</button></div></div>
      ${ed === c.id ? `<textarea class="field me-ta" id="meta-${c.id}" data-mech="${c.id}" rows="${Math.min(30, Math.max(6, Math.ceil(c.txt.length / 70)))}" aria-label="Texto do capítulo">${esc(c.txt)}</textarea><small class="mut">Guarda ao sair do campo.</small>` : `<div class="me-tx" data-act="meChEdit" data-id="${c.id}" title="Toca para editar">${esc(c.txt).split(/\n{2,}/).map(x => `<p>${x.replace(/\n/g, '<br>')}</p>`).join('') || '<p class="mut">(vazio — toca para escrever)</p>'}</div>`}</section>`).join('')}
    <button class="btn sm ghost" data-act="meChAdd">${UI.ic('plus')}Acrescentar capítulo</button>
    <p class="mut" style="font-size:11.5px;margin:14px 0 0">${b.ai ? 'Escrita com IA' : 'Rascunho automático'} · ${new Date(b.at).toLocaleString('pt-PT')}</p></article>
  ${aq.length ? `<div class="pn"><div class="pn-h"><h3>${UI.ic('zap')}Para a história ficar completa, a IA quer saber</h3><a class="acc" href="#eu.entrevista" style="font-size:12px">responder →</a></div><ul class="me-ul">${aq.map(q => `<li>${esc(q)}</li>`).join('')}</ul></div>` : ''}
  ${vers.length ? UI.toggle(`Versões anteriores (${vers.length})`, `<div class="list">${vers.map((v, i) => `<div class="li"><div class="li-t"><b>${esc(v.label || 'Versão')}</b><small>${new Date(v.at).toLocaleString('pt-PT')} · ${v.bio.ch.length} capítulos</small></div><div class="li-r"><button class="btn xs ghost" data-act="meRestore" data-i="${i}">Restaurar</button></div></div>`).join('')}</div>`, 'meVers', 'rewind') : ''}`; };

T.pessoas = () => { const ppl = OS.all('people'), g = OS.ui.meG || '';
  if (!ppl.length) return UI.empty('Quem são as pessoas da tua vida? Pais, irmãos, avós, amigos, a tua igreja, mentores… Guarda quem são, como se conheceram, aniversários e as vossas histórias.', UI.addBtn('people', 'Adicionar a primeira pessoa', { rel: 'Mãe', group: 'Família', close: 5 }, ''));
  const by = {}; ppl.forEach(x => { const k = x.group || grpOf(x.rel); (by[k] = by[k] || []).push(x); });
  const card = x => { const n = nextBday(x.birthday), a = x.birthday ? age(x.birthday) : null; return `<div class="me-p" data-edit="people:${x.id}"><div class="me-pa">${esc((x.name || '?').charAt(0))}</div><div class="grow"><b>${esc(x.name)}</b><small>${esc([x.rel, x.where].filter(Boolean).join(' · '))}</small>
    ${x.means || x.story ? `<p>${esc((x.means || x.story).slice(0, 140))}${(x.means || x.story).length > 140 ? '…' : ''}</p>` : ''}<div class="me-pm">${'❤'.repeat(+x.close || 0)}${n ? `<span>${U.fmtDS(x.birthday)}${a != null && a > 0 && a < 120 ? ' · ' + a + ' anos' : ''}${n.days <= 30 ? ` · <b class="${n.days <= 7 ? 'warn' : ''}">${n.days === 0 ? 'hoje!' : 'em ' + n.days + ' d'}</b>` : ''}</span>` : ''}${x.since ? `<span>desde ${esc(x.since)}</span>` : ''}</div></div></div>`; };
  const ks = GROUPS.filter(k => by[k]);
  return `<div class="row gap8" style="flex-wrap:wrap;align-items:center;margin-bottom:10px">${UI.chip('Todos', 'meG', !g, 'data-v=""')}${ks.map(k => UI.chip(`${k} (${by[k].length})`, 'meG', g === k, `data-v="${k}"`)).join('')}<span class="grow"></span>${UI.addBtn('people', 'Pessoa', g ? { group: g } : null, 'sm pri')}</div>
    ${ks.filter(k => !g || g === k).map(k => `<section><div class="sech"><h2>${k} <span class="mut mono" style="font-weight:400">${by[k].length}</span></h2></div><div class="me-pg">${U.sortBy(by[k], x => -(+x.close || 0)).map(card).join('')}</div></section>`).join('')}`; };
A.meG = b => OS.setUI('meG', b.dataset.v);

const autoEv = () => { const out = [], m = me();
  if (m.birth) out.push({ date: m.birth, title: 'Nasci' + (m.birthplace ? ' em ' + m.birthplace : ''), cat: 'Nascimento', auto: 'eu.sobre' });
  if (m.ptSince) out.push({ date: m.ptSince, title: 'Cheguei a Portugal', cat: 'Mudança', auto: 'eu.sobre' });
  OS.all('experiences').forEach(x => x.start && out.push({ date: x.start, title: x.title + (x.org ? ' — ' + x.org : ''), cat: 'Trabalho', auto: 'experiences:' + x.id }));
  OS.all('projects').filter(x => x.status === 'Concluído').forEach(x => out.push({ date: x.due || (x._u ? U.iso(new Date(x._u)) : ''), title: 'Concluí o projeto ' + x.name, cat: 'Conquista', auto: 'projects:' + x.id }));
  OS.all('goals').filter(x => /Conclu|Atingid/.test(x.status || '')).forEach(x => out.push({ date: x.doneAt || x.due || '', title: 'Meta atingida: ' + x.title, cat: 'Conquista', auto: 'goals:' + x.id }));
  OS.all('prayers').filter(x => x.status === 'Respondida' && x.answeredAt).forEach(x => out.push({ date: x.answeredAt, title: 'Oração respondida: ' + x.title, cat: 'Fé', auto: 'prayers:' + x.id }));
  return out.filter(x => x.date); };
T.historia = () => { const ev = OS.all('lifeev').map(e => Object.assign({}, e)).concat(OS.ui.meAuto === '0' ? [] : autoEv()), m = me(), by = {};
  U.sortBy(ev, e => e.date || '0000', -1).forEach(e => { const y = (e.date || '').slice(0, 4) || 'Sem data'; (by[y] = by[y] || []).push(e); });
  const ys = Object.keys(by);
  return `<div class="row gap8" style="flex-wrap:wrap;align-items:center;margin-bottom:10px">${UI.addBtn('lifeev', 'Momento da minha vida', null, 'sm pri')}<label class="row gap6 mut" style="font-size:13px"><input type="checkbox" ${OS.ui.meAuto === '0' ? '' : 'checked'} data-act="meAuto"> incluir conquistas, orações respondidas e experiências do Oceanum</label></div>
  ${ys.length ? `<div class="me-tl">${ys.map(y => `<div class="me-ty"><div class="me-yr">${y}${m.birth && y !== 'Sem data' ? `<small>${+y - +m.birth.slice(0, 4)} anos</small>` : ''}</div><div>${by[y].map(e => `<div class="me-ev ${e.auto ? 'auto' : ''}" ${e.auto ? (e.auto.includes(':') ? `data-edit="${e.auto}"` : `data-go="${e.auto}"`) : `data-edit="lifeev:${e.id}"`}><span class="me-ei">${CIC[e.cat] || '•'}</span><div><b>${esc(e.title)}${+e.imp >= 4 ? '' : ''}</b><small>${[fmtY(e.date), e.cat, e.place, e.people].filter(Boolean).map(esc).join(' · ')}</small>${e.desc ? `<p>${esc(e.desc)}</p>` : ''}${e.lesson ? `<p class="me-les">${esc(e.lesson)}</p>` : ''}</div></div>`).join('')}</div></div>`).join('')}</div>` : UI.empty('A tua linha do tempo está vazia. Começa pelos grandes momentos: onde nasceste, a escola, quando conheceste a Deus, a vinda para Portugal, a universidade, conquistas, perdas, viagens…', UI.addBtn('lifeev', 'Primeiro momento', null, ''))}`; };
A.meAuto = () => OS.setUI('meAuto', OS.ui.meAuto === '0' ? '1' : '0');

T.sobre = () => { const m = me(), p = P(); ['Origens', 'Família'].forEach(g => { if (OS.ui['tog_meS_' + g] === undefined) OS.ui['tog_meS_' + g] = true; });
  const fld = ([k, l, t]) => t === 'area' ? `<label class="me-fl wide"><span>${l}</span><textarea class="field" data-bind="me.${k}" rows="3">${esc(m[k] || '')}</textarea></label>` : `<label class="me-fl"><span>${l}</span><input class="field" ${t === 'date' ? 'type="date"' : ''} data-bind="me.${k}" value="${esc(m[k] || '')}"></label>`;
  return `<p class="mut" style="margin:0 0 10px">Tudo guarda sozinho. Escreve à tua maneira — a IA usa isto para escrever a tua biografia e para te conhecer melhor nas outras abas.</p>
  <div class="pn"><div class="pn-h"><h3>O básico</h3></div><div class="me-form"><label class="me-fl"><span>Nome completo</span><input class="field" data-bind="profile.name" value="${esc(p.name || '')}"></label><label class="me-fl"><span>Como gosto de ser chamado</span><input class="field" data-bind="profile.short" value="${esc(p.short || '')}"></label><label class="me-fl"><span>Cidade onde vivo</span><input class="field" data-bind="profile.city" value="${esc(p.city || '')}"></label><label class="me-fl"><span>Curso</span><input class="field" data-bind="profile.course" value="${esc(p.course || '')}"></label></div></div>
  ${ABOUT.map(([g, fs]) => UI.toggle(`${g} <span class="mut mono" style="font-weight:400;font-size:12px">${fs.filter(f => String(m[f[0]] || '').trim()).length}/${fs.length}</span>`, `<div class="me-form">${fs.map(fld).join('')}</div>`, 'meS_' + g, '')).join('')}`; };

T.entrevista = () => { const qa = me().qa || {}, extra = aiQs(), all = [...extra, ...QALL], n = all.filter(q => (qa[q.id] || '').trim()).length, g = OS.ui.meQg || '';
  const groups = [...new Set(all.map(q => q.g))];
  return `<div class="pn"><div class="row between gap8" style="flex-wrap:wrap"><div><h3 style="margin:0">Entrevista da tua vida</h3><small class="mut">Responde ao teu ritmo — uma pergunta por dia já faz uma biografia linda. Guarda sozinho.</small></div><span class="mono">${n}/${all.length}</span></div>${UI.bar(n / all.length, 'pos')}
    <div class="row gap6" style="flex-wrap:wrap;margin-top:10px">${UI.chip('Por responder', 'meQg', !g, 'data-v=""')}${groups.map(x => UI.chip(x, 'meQg', g === x, `data-v="${x}"`)).join('')}${UI.chip('Respondidas', 'meQg', g === '_done', 'data-v="_done"')}</div></div>
  ${all.filter(q => g === '_done' ? (qa[q.id] || '').trim() : g ? q.g === g : !(qa[q.id] || '').trim()).slice(0, 40).map(q => `<div class="pn me-qa"><div class="eyebrow">${esc(q.g)}</div><label for="meq-${q.id}"><b>${esc(q.q)}</b></label><textarea class="field" id="meq-${q.id}" data-meq="${q.id}" rows="3" placeholder="A tua resposta…">${esc(qa[q.id] || '')}</textarea></div>`).join('') || UI.empty(g === '_done' ? 'Ainda não respondeste a nenhuma.' : 'Respondeste a tudo nesta secção')}`; };
A.meQg = b => OS.setUI('meQg', b.dataset.v);

/* aniversários no calendário */
if (OS.Cal && OS.Cal.items) { OS.Cal.src.bday = ['Aniversários', '#F472B6']; const _it = OS.Cal.items; OS.Cal.items = (from, to) => { const out = _it(from, to); OS.all('people').forEach(x => { if (!x.birthday) return; for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) { const d = y + x.birthday.slice(4); if (d >= from && d <= to) out.push({ date: d, title: '' + x.name + (x.rel ? ' (' + x.rel + ')' : ''), src: 'bday', edit: 'people:' + x.id, sub: +x.birthday.slice(0, 4) > 1900 && y - +x.birthday.slice(0, 4) > 0 ? 'faz ' + (y - +x.birthday.slice(0, 4)) + ' anos' : '' }); } }); return out.sort((a, b) => (a.date + (a.start || '99')).localeCompare(b.date + (b.start || '99'))); }; }

OS.Me = { facts, draft, age, nextBday, completeness };
})();
