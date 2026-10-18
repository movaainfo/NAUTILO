/* NÁUTILO — DESPORTO › AVENTURAS: a tua lista de aventuras e desportos radicais.
   Um catálogo grande (montanha, céu, neve, água, terra, provas e desportos para experimentar) para escolheres o que queres viver;
   cada aventura fica com estado (Quero fazer · Planeada · Feita), data, sítio e notas. As feitas dão XP de Corpo no Dominus. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, today = () => U.today();
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// [título, onde, dificuldade 1 (fácil) … 4 (extremo)]
const CAT = {
  'Montanha e trilhos': [['Passadiços do Paiva', 'Arouca, Portugal', 1], ['Subir à Torre da Serra da Estrela', 'Portugal', 1], ['Subir ao Pico, o ponto mais alto de Portugal', 'Ilha do Pico, Açores', 2], ['Vereda do Pico Ruivo ao Pico do Areeiro', 'Madeira', 2],
    ['Caminho de Santiago (Caminho Português)', 'Porto → Santiago de Compostela', 2], ['Trilha da Pedra da Gávea', 'Rio de Janeiro, Brasil', 2], ['Subir ao Pico da Bandeira', 'Minas Gerais / Espírito Santo, Brasil', 2], ['Vale do Pati', 'Chapada Diamantina, Brasil', 2],
    ['Chapada dos Veadeiros', 'Goiás, Brasil', 1], ['Monte Roraima', 'Venezuela / Brasil', 3], ['Subir ao Teide', 'Tenerife, Espanha', 2], ['Tour du Mont Blanc', 'França · Itália · Suíça', 3],
    ['Trilho Inca até Machu Picchu', 'Peru', 3], ['Circuito W de Torres del Paine', 'Patagónia, Chile', 3], ['Laguna de los Tres (Fitz Roy)', 'El Chaltén, Argentina', 2], ['Subir ao Monte Fuji', 'Japão', 2],
    ['Campo Base do Everest', 'Nepal', 3], ['Subir ao Kilimanjaro', 'Tanzânia', 3], ['Subir ao Mont Blanc', 'França', 4], ['Subir ao Aconcágua', 'Argentina', 4], ['Subir ao Elbrus', 'Rússia', 4],
    ['Escalar o Everest', 'Nepal / Tibete', 4], ['Os Sete Cumes (o mais alto de cada continente)', 'Mundo', 4], ['Ver o nascer do sol no topo de uma montanha', 'Onde quiseres', 1], ['Acampar no alto de uma serra', 'Onde quiseres', 1]],
  'Céu': [['Salto de paraquedas em tandem', 'Évora / Boituva', 2], ['Túnel de vento (queda livre indoor)', 'Lisboa / São Paulo', 1], ['Curso de paraquedismo (saltar sozinho)', 'Escola de paraquedismo', 3], ['Parapente em voo duplo', 'Serra da Estrela / Rio de Janeiro', 2],
    ['Asa-delta', 'Pedra Bonita, Rio de Janeiro', 2], ['Voo de balão', 'Capadócia, Turquia', 1], ['Paramotor', 'Escola de voo', 2], ['Voo de helicóptero', 'Onde quiseres', 1], ['Voo acrobático num avião', 'Aeródromo', 2],
    ['Tirar a licença de piloto de parapente', 'Escola de voo', 3], ['Saltar de paraquedas a 4 000 m', 'Escola de paraquedismo', 3], ['Wingsuit', 'Só com muita experiência', 4]],
  'Neve e gelo': [['Aprender a esquiar', 'Serra Nevada / Andorra', 2], ['Snowboard', 'Andorra / Alpes', 2], ['Esquiar nos Alpes', 'Zermatt / Chamonix', 2], ['Esquiar fora de pista (heli-ski)', 'Canadá / Alpes', 4],
    ['Caminhada com raquetes de neve', 'Pirenéus', 1], ['Trenó puxado por cães', 'Lapónia, Finlândia', 1], ['Mota de neve', 'Lapónia / Islândia', 2], ['Ver a aurora boreal', 'Noruega / Lapónia / Islândia', 1],
    ['Dormir num iglu ou hotel de gelo', 'Lapónia / Suécia', 1], ['Escalada em gelo', 'Alpes / Pirenéus', 3], ['Patinar num lago gelado', 'Norte da Europa', 1], ['Caminhar num glaciar', 'Islândia / Patagónia', 2]],
  'Água': [['Aula de surf', 'Peniche / Ericeira / Florianópolis', 1], ['Surfar uma onda grande', 'Ericeira / Nazaré (com guia)', 3], ['Ver as ondas gigantes da Nazaré', 'Nazaré, Portugal', 1], ['Bodyboard', 'Costa portuguesa', 1],
    ['Kitesurf', 'Guincho / Jericoacoara', 2], ['Windsurf', 'Lagoa de Óbidos', 2], ['Stand up paddle', 'Onde quiseres', 1], ['Curso de mergulho PADI Open Water', 'Sesimbra / Berlengas / Noronha', 2],
    ['Mergulhar com tubarões', 'Açores / África do Sul', 3], ['Mergulhar na Grande Barreira de Coral', 'Austrália', 2], ['Snorkel em Fernando de Noronha', 'Brasil', 1], ['Rafting', 'Rio Paiva / Brotas', 2],
    ['Canyoning', 'Madeira / Açores', 2], ['Coasteering', 'Costa Vicentina / Algarve', 2], ['Nadar com golfinhos', 'Açores', 1], ['Ver baleias', 'Açores', 1], ['Caiaque no mar', 'Benagil, Algarve', 1],
    ['Jet ski', 'Onde quiseres', 1], ['Wakeboard', 'Cabo de esqui aquático', 2], ['Apneia (mergulho livre)', 'Curso de apneia', 3], ['Travessia a nado em águas abertas', 'Rio / lago / mar', 3], ['Navegar à vela', 'Escola de vela', 1]],
  'Terra e adrenalina': [['Escalada indoor (bouldering)', 'Ginásio de escalada', 1], ['Escalada em rocha', 'Sintra / Rio de Janeiro', 2], ['Via ferrata', 'Pirenéus / Dolomitas', 2], ['Rapel', 'Onde quiseres', 2],
    ['Slide (zipline) gigante', 'Lindoso, Portugal / Zip World, Gales', 1], ['Bungee jumping', 'Ponte / grua', 3], ['Salto pendular', 'Ponte', 3], ['Arborismo', 'Parque aventura', 1], ['Espeleologia (explorar grutas)', 'Serra de Aire e Candeeiros', 2],
    ['Downhill de BTT', 'Lousã / Sintra', 3], ['Trilho de BTT', 'Onde quiseres', 1], ['Kart', 'Kartódromo', 1], ['Conduzir num circuito de corrida', 'Autódromo do Estoril / Portimão', 2], ['Enduro de mota', 'Escola de off-road', 3],
    ['Moto 4 nas dunas', 'Onde quiseres', 2], ['Sandboard nas dunas', 'Jericoacoara / Lençóis Maranhenses', 1], ['Buggy nas dunas', 'Natal, Brasil', 1], ['Safari em África', 'Quénia / Tanzânia / África do Sul', 1],
    ['Noite no deserto', 'Sahara, Marrocos', 1], ['Andar a cavalo numa trilha', 'Onde quiseres', 1], ['Road trip de mota', 'Onde quiseres', 2]],
  'Provas e desafios': [['Corrida de obstáculos (Spartan / Tough Mudder)', 'Portugal / Brasil', 2], ['Corrida de 10 km', 'Onde quiseres', 1], ['Meia maratona', 'Lisboa / Porto / Rio', 2], ['Maratona', 'Lisboa / Porto / Rio', 3],
    ['Maratona de uma Major (Berlim, Londres, Nova Iorque…)', 'Mundo', 3], ['Corrida de São Silvestre', 'São Paulo / Porto', 1], ['Trail de 50 km', 'Serra', 3], ['Ultramaratona de 100 km', 'Mundo', 4],
    ['Triatlo sprint', 'Portugal', 2], ['Triatlo olímpico', 'Portugal', 3], ['Ironman 70.3', 'Cascais / Mundo', 3], ['Ironman completo', 'Mundo', 4], ['Gran Fondo de bicicleta', 'Portugal / Espanha', 3],
    ['Subir o Alpe d’Huez de bicicleta', 'França', 3], ['Travessia de 100 km a pé', 'Trailwalker', 3], ['Competição de CrossFit', 'Box', 2], ['Torneio de voleibol de praia', 'Onde quiseres', 1]],
  'Experimentar': [['Paintball', 'Onde quiseres', 1], ['Airsoft', 'Onde quiseres', 1], ['Tiro com arco', 'Clube de tiro', 1], ['Tiro desportivo', 'Clube de tiro', 1], ['Esgrima', 'Clube', 1], ['Golfe', 'Algarve', 1],
    ['Aula de boxe', 'Ginásio', 1], ['Combate amador de boxe ou muay thai', 'Ginásio', 3], ['Jiu-jitsu', 'Academia', 2], ['Patinagem no gelo', 'Pista de gelo', 1], ['Skate', 'Skatepark', 1], ['Parkour', 'Escola de parkour', 2],
    ['Escalar uma parede de 20 m', 'Ginásio de escalada', 2], ['Tirolesa sobre o mar', 'Onde quiseres', 1], ['Ginástica acrobática / trampolim', 'Clube', 1], ['Aula de dança (salsa, forró)', 'Escola de dança', 1]] };
const ALL = []; Object.entries(CAT).forEach(([c, L]) => L.forEach(([t, w, d]) => ALL.push({ id: N(t).replace(/[^a-z0-9]+/g, '-').slice(0, 48), t, w, d, c })));
OS.Adv = { CAT, ALL, xp: d => 60 + 40 * (+d || 1) };
const ST = ['Quero fazer', 'Planeada', 'Feita'];
const DIF = ['', 'Fácil', 'Médio', 'Difícil', 'Extremo'];
OS.S.adventures = { label: 'Aventura', title: r => r.title, fields: [
  { k: 'title', l: 'Aventura', t: 'text', req: 1 }, { k: 'cat', l: 'Tipo', t: 'sel', o: Object.keys(CAT).concat(['Outra']) }, { k: 'place', l: 'Onde', t: 'text' },
  { k: 'status', l: 'Estado', t: 'sel', o: ST }, { k: 'date', l: 'Data (planeada ou quando fizeste)', t: 'date' }, { k: 'diff', l: 'Dificuldade', t: 'sel', o: [['1', 'Fácil'], ['2', 'Médio'], ['3', 'Difícil'], ['4', 'Extremo']] },
  { k: 'with', l: 'Com quem', t: 'text' }, { k: 'cost', l: 'Custo previsto (€)', t: 'num' }, { k: 'notes', l: 'Notas (como foi, o que levar…)', t: 'area', rows: 3 }],
  defaults: () => ({ status: 'Quero fazer', diff: '2', cat: 'Outra' }) };
const mine = () => OS.all('adventures');
const has = it => mine().find(a => a.key === it.id || N(a.title) === N(it.t));
const dots = d => `<span class="adv-d d${d}" title="${DIF[d]}">${[1, 2, 3, 4].map(i => `<i class="${i <= d ? 'on' : ''}"></i>`).join('')}</span>`;

A.advAdd = b => { const it = ALL.find(x => x.id === b.dataset.id); if (!it) return; const ex = has(it); if (ex) { UI.openForm('adventures', ex.id); return; }
  OS.add('adventures', { key: it.id, title: it.t, place: it.w, cat: it.c, diff: String(it.d), status: 'Quero fazer' }); UI.toast(`"${it.t}" está na tua lista`, 'pos'); };
A.advSt = b => { const r = OS.get('adventures', b.dataset.id); if (!r) return; const st = b.dataset.v, up = { status: st }; if (st === 'Feita' && (!r.date || r.date > today())) up.date = today();
  OS.upd('adventures', r.id, up); if (st === 'Feita') UI.toast(`Aventura feita! +${OS.Adv.xp(r.diff)} XP de Corpo no Dominus`, 'pos'); };
A.advCat = b => OS.setUI('advCat', b.dataset.v);
A.advMine = b => OS.setUI('advMine', b.dataset.v);

const row = a => { const done = a.status === 'Feita', pl = a.status === 'Planeada';
  return `<div class="adv-row ${done ? 'done' : ''}"><div class="li-t click" data-edit="adventures:${a.id}"><b>${esc(a.title)}</b><small>${esc([a.place, a.date ? (done ? 'feita ' : 'em ') + U.fmtD(a.date) : '', a.with ? 'com ' + a.with : ''].filter(Boolean).join(' · '))}</small></div>${dots(+a.diff || 1)}
    <div class="adv-acts">${done ? `<span class="pos adv-ok">${UI.ic('check')}Feita</span>` : `${pl ? '' : `<button class="btn xs ghost" data-act="advSt" data-id="${a.id}" data-v="Planeada">Planear</button>`}<button class="btn xs pri" data-act="advSt" data-id="${a.id}" data-v="Feita">Feita ✓</button>`}</div></div>`; };

OS.Adv.view = () => { const L = mine(), q = N((OS.ui.adv || {}).q || ''), c = OS.ui.advCat || '', f = OS.ui.advMine || 'Quero fazer';
  const n = s => L.filter(a => (a.status || 'Quero fazer') === s).length, sel = U.sortBy(L.filter(a => (a.status || 'Quero fazer') === f), a => (a.date || '9999') + a.title);
  const items = ALL.filter(it => q ? N(it.t + ' ' + it.w + ' ' + it.c).includes(q) : !c || it.c === c);
  return `<div class="pn adv-top"><div class="pn-h"><h3>${UI.ic('mountain')}As minhas aventuras</h3>${UI.addBtn('adventures', 'Outra aventura', null, 'sm')}</div>
    <div class="adv-k">${ST.map(s => `<button class="${f === s ? 'on' : ''}" data-act="advMine" data-v="${s}"><b class="mono">${n(s)}</b><span>${s === 'Quero fazer' ? 'quero fazer' : s === 'Planeada' ? 'planeadas' : 'feitas'}</span></button>`).join('')}</div>
    ${sel.length ? `<div class="adv-list">${sel.map(row).join('')}</div>` : `<p class="mut">${f === 'Feita' ? 'Ainda nenhuma feita. A primeira está à tua espera.' : f === 'Planeada' ? 'Nenhuma planeada. Escolhe uma e põe-lhe uma data.' : 'Escolhe abaixo as aventuras que queres viver: tocas em “Quero” e ficam aqui.'}</p>`}</div>
  <div class="pn"><div class="pn-h"><h3>Escolhe as tuas aventuras</h3><span class="mut">${ALL.length} ideias · ${L.length} na tua lista</span></div>
    <div class="row gap8" style="flex-wrap:wrap;margin-bottom:10px">${UI.chip('Todas', 'advCat', !c, 'data-v=""')}${Object.keys(CAT).map(k => UI.chip(k, 'advCat', c === k, `data-v="${esc(k)}"`)).join('')}</div>
    <input class="inp adv-q" type="search" placeholder="Procurar: paraquedas, esqui, Everest, surf…" value="${esc((OS.ui.adv || {}).q || '')}" data-uif="adv.q" aria-label="Procurar aventuras">
    ${!q && !c ? Object.keys(CAT).map(k => { const L2 = items.filter(it => it.c === k); return `<div class="adv-sec"><div class="adv-sh"><b>${esc(k)}</b><button class="btn xs ghost" data-act="advCat" data-v="${esc(k)}">Ver as ${L2.length}</button></div><div class="adv-grid">${L2.slice(0, 4).map(card).join('')}</div></div>`; }).join('')
      : `<div class="adv-grid">${items.map(card).join('') || '<p class="mut">Nada encontrado.</p>'}</div>`}</div>`; };
const card = it => { const m = has(it); return `<div class="adv-c ${m ? 'in' : ''}"><div class="adv-ct"><b>${esc(it.t)}</b><small>${esc(it.w)}</small></div><div class="adv-cf">${dots(it.d)}<small class="mut">${esc(DIF[it.d])}</small><button class="btn xs ${m ? 'ghost' : 'pri'}" data-act="advAdd" data-id="${it.id}">${m ? (m.status === 'Feita' ? '✓ feita' : '✓ na lista') : '+ Quero'}</button></div></div>`; };
})();
