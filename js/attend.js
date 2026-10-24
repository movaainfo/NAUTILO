/* PRUMO — Faltas por disciplina (Universidade → Faltas).
   Cada aula do teu horário que já passou é marcada sozinha:
   - Sem aula: feriado (Portugal; Aveiro também a 12 de maio) ou fora do semestre;
   - Falta: estavas num turno do trabalho a essa hora, ou a tua rotina não te põe na faculdade a essa hora;
   - Presente: a tua rotina tem a faculdade a essa hora (ou não há nada que diga o contrário).
   Tocas numa aula para corrigir (Presente → Falta → Falta justificada → Sem aula → automático).
   Com o limite de faltas de cada disciplina, avisa antes de lá chegares e quando um turno vai bater com uma aula. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc, St = OS.St, UNI = OS.UNI, UT = OS.UT;
const Att = OS.Att = {};
const ST = ['Presente', 'Falta', 'Falta justificada', 'Sem aula'];
const m = t => U.t2m(t);

// correções tuas (uma por aula e dia)
OS.S.attend = { label: 'Presença na aula', title: r => ((OS.get('subjects', r.subject) || {}).name || 'Aula') + ' · ' + U.fmtD(r.date) + ' · ' + (r.status || ''), fields: [
  { k: 'subject', l: 'Disciplina', t: 'rel', c: 'subjects', req: 1 }, { k: 'date', l: 'Dia', t: 'date', req: 1 }, { k: 'start', l: 'Hora da aula', t: 'time' },
  { k: 'status', l: 'Estado', t: 'sel', o: ST, req: 1 }, { k: 'notes', l: 'Notas (ex.: atestado, motivo)', t: 'area', rows: 2 }],
  defaults: () => ({ date: U.today(), status: 'Falta' }) };

/* ---------- feriados ---------- */
const easter = y => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, mm = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * mm + 114) / 31), da = (h + l - 7 * mm + 114) % 31 + 1; return y + '-' + U.pad(mo) + '-' + U.pad(da); };
const HOL = {};
// feriados nacionais do país do perfil (Portugal por omissão; Brasil com os seus)
const BRH = (y, e) => ({ [y + '-01-01']: 'Ano Novo', [U.addDays(e, -48)]: 'Carnaval', [U.addDays(e, -47)]: 'Carnaval', [U.addDays(e, -2)]: 'Sexta-feira Santa', [y + '-04-21']: 'Tiradentes', [y + '-05-01']: 'Dia do Trabalho', [U.addDays(e, 60)]: 'Corpus Christi', [y + '-09-07']: 'Independência', [y + '-10-12']: 'Nossa Senhora Aparecida', [y + '-11-02']: 'Finados', [y + '-11-15']: 'Proclamação da República', [y + '-11-20']: 'Consciência Negra', [y + '-12-25']: 'Natal' });
Att.holiday = d => { const y = +d.slice(0, 4), cc = OS.one('profile').country || 'PT', ky = cc + y;
  // outros países: feriados nacionais pelo serviço público Nager.Date (guardados neste aparelho)
  if (cc !== 'PT' && cc !== 'BR' && OS.Pais && OS.Pais.has(cc)) return OS.Pais.holidays(cc, y)[d] || '';
  if (!HOL[ky] && cc === 'BR') HOL[ky] = BRH(y, easter(y)); if (!HOL[ky]) { const e = easter(y), o = { [y + '-01-01']: 'Ano Novo', [U.addDays(e, -47)]: 'Carnaval', [U.addDays(e, -2)]: 'Sexta-feira Santa', [e]: 'Páscoa', [y + '-04-25']: '25 de Abril', [y + '-05-01']: 'Dia do Trabalhador', [U.addDays(e, 60)]: 'Corpo de Deus', [y + '-06-10']: 'Dia de Portugal', [y + '-08-15']: 'Assunção', [y + '-10-05']: 'Implantação da República', [y + '-11-01']: 'Todos os Santos', [y + '-12-01']: 'Restauração da Independência', [y + '-12-08']: 'Imaculada Conceição', [y + '-12-25']: 'Natal' };
    const p = OS.one('profile'); if (/aveiro/i.test([p.city, p.uni].join(' '))) o[y + '-05-12'] = 'Feriado de Aveiro'; HOL[ky] = o; }
  return HOL[ky][d] || ''; };
OS.on('one:profile', () => { Object.keys(HOL).forEach(k => delete HOL[k]); });

/* ---------- o que diz a tua semana ---------- */
const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const UNIB = r => r.area === 'Universidade' || /faculdade|universidade|\baulas?\b|\bua\b|campus/i.test(r.title || '');
const shiftSpan = (s, d) => { const a = m(s.start), b0 = m(s.end); if (a == null || b0 == null) return null; let b = b0 <= a ? b0 + 1440 : b0; return s.date === d ? [a, b] : s.date === U.addDays(d, -1) && b > 1440 ? [0, b - 1440] : null; };
Att.auto = (c, d) => { const s0 = m(c.start), s1 = m(c.end) || (s0 + 60), dur = Math.max(1, s1 - s0);
  const hol = Att.holiday(d); if (hol) return ['Sem aula', 'Feriado: ' + hol];
  // turno do trabalho à hora da aula
  for (const s of OS.all('shifts')) { if (s.date !== d && s.date !== U.addDays(d, -1)) continue; const sp = shiftSpan(s, d); if (sp && overlap(s0, s1, sp[0], sp[1]) >= Math.min(30, dur / 2)) return ['Falta', `Estavas a trabalhar (turno ${s.start}–${s.end})`]; }
  // a tua rotina: os blocos da faculdade dizem quando lá estás
  const R = OS.all('routine').filter(UNIB); if (R.length) { const wd = String(U.parse(d).getDay()), today = R.filter(r => (r.days || []).includes(wd));
    const hit = today.find(r => overlap(s0, s1, m(r.start), m(r.end)) >= dur / 2); if (hit) return ['Presente', `Rotina: ${hit.title} ${hit.start}–${hit.end}`];
    return ['Falta', today.length ? `A tua rotina não te põe na faculdade a esta hora (${today.map(r => r.start + '–' + r.end).join(', ')})` : 'A tua rotina não tem faculdade neste dia']; }
  return ['Presente', 'Estava no teu horário e nada o impediu']; };

/* ---------- todas as aulas que já passaram ---------- */
let CACHE = null;
OS.on('change', () => { CACHE = null; }); OS.on('remote', () => { CACHE = null; }); OS.on('one:profile', () => { CACHE = null; });
const semFrom = () => { const p = OS.one('profile'), c = OS.all('classes'); if (p.semStart) return p.semStart; const f = c.map(x => x._c ? U.iso(new Date(x._c)) : '').filter(Boolean).sort()[0]; return f || U.today(); };
Att.all = () => { const now = new Date(), key = U.today() + '|' + (now.getHours() * 60 + now.getMinutes()); if (CACHE && CACHE.key === key) return CACHE.L;
  const p = OS.one('profile'), t = U.today(), nowM = now.getHours() * 60 + now.getMinutes(), from = semFrom(), to = p.semEnd && p.semEnd < t ? p.semEnd : t, out = [];
  const man = {}; OS.all('attend').forEach(r => { man[(r.cls || r.subject + '#' + (r.start || '')) + '@' + r.date] = r; });
  const cls = OS.all('classes').filter(c => { const s = OS.get('subjects', c.subject); return s && s.status === 'Em curso' && m(c.start) != null; });
  if (from <= to) U.range(from, to).forEach(d => { const wd = String(U.parse(d).getDay()); cls.forEach(c => { if (String(c.wday) !== wd) return; if (d === t && (m(c.end) || m(c.start) + 60) > nowM) return;
    const k = c.id + '@' + d, mr = man[k] || man[c.subject + '#' + c.start + '@' + d], [st, why] = mr ? [mr.status, mr.notes ? 'Marcado por ti · ' + mr.notes : 'Marcado por ti'] : Att.auto(c, d);
    out.push({ k, cls: c.id, subject: c.subject, date: d, start: c.start, end: c.end, kind: c.kind || '', st, why, man: !!mr }); }); });
  // faltas que marcaste numa aula que não está no horário
  OS.all('attend').filter(r => !r.cls && !out.some(o => o.subject === r.subject && o.date === r.date && o.start === r.start)).forEach(r => out.push({ k: 'x' + r.id, rid: r.id, subject: r.subject, date: r.date, start: r.start || '', end: '', kind: '', st: r.status, why: 'Marcado por ti' + (r.notes ? ' · ' + r.notes : ''), man: true }));
  out.sort((a, b) => (b.date + (b.start || '')).localeCompare(a.date + (a.start || '')));
  CACHE = { key, L: out }; return out; };
Att.stats = s => { const L = Att.all().filter(x => x.subject === s.id), n = k => L.filter(x => x.st === k).length;
  const pres = n('Presente'), fal = n('Falta'), just = n('Falta justificada'), sem = n('Sem aula'), extra = Math.max(0, +s.abs || 0), faltas = fal + extra, dadas = pres + fal + just + extra;
  const max = +s.absMax || 0; return { L, pres, fal, just, sem, extra, faltas, dadas, pct: dadas ? pres / dadas : null, max, rest: max ? max - faltas : null, p: max ? faltas / max : 0 }; };
// aulas dos próximos dias que vão bater com um turno do trabalho
Att.conflicts = (days = 7) => { const t = U.today(), out = []; U.range(t, U.addDays(t, days)).forEach(d => { const wd = String(U.parse(d).getDay());
  OS.all('classes').forEach(c => { if (String(c.wday) !== wd) return; const s = OS.get('subjects', c.subject); if (!s || s.status !== 'Em curso') return; const p = OS.one('profile'); if (p.semEnd && d > p.semEnd) return; if (Att.holiday(d)) return;
    if (d === t) { const nm = new Date().getHours() * 60 + new Date().getMinutes(); if ((m(c.end) || 0) <= nm) return; }
    const r = Att.auto(c, d); if (r[0] === 'Falta' && /trabalhar/.test(r[1]) && !OS.all('attend').some(x => x.cls === c.id && x.date === d)) out.push({ c, s, d, why: r[1] }); }); }); return out; };

/* ---------- corrigir ---------- */
Att.set = (cls, d, st, notes) => { const c = OS.get('classes', cls); if (!c) return; const ex = OS.all('attend').find(r => r.cls === cls && r.date === d);
  if (!st) { if (ex) OS.del('attend', ex.id); return; }
  if (ex) OS.upd('attend', ex.id, Object.assign({ status: st }, notes != null ? { notes } : {})); else OS.add('attend', { cls, subject: c.subject, date: d, start: c.start, status: st, notes: notes || '' }); };
A.attCyc = b => { const L = Att.all(), o = L.find(x => x.k === b.dataset.k); if (!o) return;
  if (o.rid) { const i = ST.indexOf(o.st); if (i >= ST.length - 1) OS.del('attend', o.rid); else OS.upd('attend', o.rid, { status: ST[i + 1] }); return; }
  // Presente → Falta → Falta justificada → Sem aula → automático
  const nx = o.man ? ST[ST.indexOf(o.st) + 1] || null : (o.st === 'Presente' ? 'Falta' : 'Presente');
  Att.set(o.cls, o.date, nx); const s = OS.get('subjects', o.subject), x = s && Att.stats(s);
  if (x && x.max && nx === 'Falta' && x.faltas >= x.max * .75) UI.toast(x.faltas >= x.max ? `Atingiste o limite de faltas em ${s.name}!` : `Atenção: ${x.faltas} de ${x.max} faltas em ${s.name}`, x.faltas >= x.max ? 'neg' : 'warn'); };
A.attExtra = b => { const s = OS.get('subjects', b.dataset.id); if (!s) return; OS.upd('subjects', s.id, { abs: Math.max(0, (+s.abs || 0) + +b.dataset.d) }); };

/* ---------- a aba ---------- */
const chip = o => `<button type="button" class="att-c ${o.st === 'Presente' ? 'p' : o.st === 'Falta' ? 'f' : o.st === 'Falta justificada' ? 'j' : 's'}" data-act="attCyc" data-k="${esc(o.k)}" title="${esc(o.why)} · toca para mudar">${esc(o.st)}${o.man ? '' : '<i>auto</i>'}</button>`;
const row = o => `<div class="att-r"><span class="mono att-d">${U.WDS[U.parse(o.date).getDay()].slice(0, 3)} ${U.fmtDS(o.date)}${o.start ? ' · ' + o.start : ''}</span><small class="mut att-w">${esc(o.why)}</small>${chip(o)}</div>`;
UNI.presencas = () => { const S = St.current(), cls = OS.all('classes'), hasR = OS.all('routine').some(UNIB), cf = Att.conflicts(7);
  const tip = !cls.length ? `<div class="pn">${UI.empty('Para as faltas se marcarem sozinhas, regista o horário das aulas.', `<a class="btn sm pri" href="#universidade.horario">${UI.ic('plus')}Ir para o Horário</a>`)}</div>` : '';
  return `<div class="note">As faltas marcam-se sozinhas a partir do teu <a class="acc" href="#universidade.horario">horário de aulas</a>, da tua <a class="acc" href="#habitos.rotina">rotina</a> e dos teus <a class="acc" href="#trabalho">turnos</a>: se a rotina te põe na faculdade à hora da aula conta presença; se estavas a trabalhar ou a rotina não te põe lá, conta falta; nos feriados não há aula. Toca numa aula para corrigir.${hasR ? '' : ' <b>Dica:</b> cria na Rotina os blocos "Faculdade" (área Universidade) nos dias e horas em que vais, para as faltas saírem certas.'}</div>
  ${cf.length ? `<div class="pn att-warn"><div class="pn-h"><h3>${UI.ic('flag')}Aulas que vão bater com o trabalho</h3></div>${cf.slice(0, 6).map(x => `<div class="li"><div class="li-t"><b>${esc(x.s.name)} · ${U.WDS[U.parse(x.d).getDay()]} ${U.fmtDS(x.d)} ${x.c.start}</b><small>${esc(x.why)}${+x.s.absMax ? ` · já tens ${Att.stats(x.s).faltas} de ${x.s.absMax} faltas` : ''}</small></div></div>`).join('')}</div>` : ''}
  ${tip}${S.length ? `<div class="g g3">${S.map(s => { const x = Att.stats(s), tone = x.max ? (x.p >= 1 ? 'neg' : x.p >= .75 ? 'warn' : '') : '';
    return `<div class="pn un-abs att-s"><div class="pn-h"><h3 class="click" data-edit="subjects:${s.id}">${esc(s.name)}</h3>${x.pct != null ? `<small class="mut">${U.pct(x.pct)} presença</small>` : ''}</div>
      <div class="row between" style="align-items:center;gap:10px"><div><div class="big-num ${tone}" style="font-size:32px">${x.faltas}${x.max ? `<span class="mut" style="font-size:16px"> / ${x.max}</span>` : ''}</div><small class="mut">${x.faltas === 1 ? 'falta' : 'faltas'} · ${x.max ? (x.p >= 1 ? '<span class="neg">limite atingido!</span>' : `podes faltar mais ${x.rest}`) : 'sem limite definido'}</small></div>
      <div class="att-n"><span><b>${x.pres}</b> presenças</span>${x.just ? `<span><b>${x.just}</b> justificadas</span>` : ''}${x.sem ? `<span><b>${x.sem}</b> sem aula</span>` : ''}${x.extra ? `<span><b>${x.extra}</b> avulsas</span>` : ''}</div></div>
      ${x.max ? UI.bar(Math.min(1, x.p), x.p >= 1 ? 'neg' : x.p >= .75 ? 'warn' : 'pos') : `<button class="btn xs ghost" data-edit="subjects:${s.id}" style="margin-top:8px">Definir limite de faltas</button>`}
      ${x.L.length ? `<div class="att-l">${x.L.slice(0, 5).map(row).join('')}</div>${x.L.length > 5 ? UI.toggle('Ver todas as ' + x.L.length + ' aulas', `<div class="att-l">${x.L.slice(5).map(row).join('')}</div>`, 'att' + s.id) : ''}` : `<p class="mut" style="font-size:12.5px;margin:8px 0 0">${cls.some(c => c.subject === s.id) ? 'Ainda não houve aulas desta disciplina neste semestre.' : 'Sem aulas no horário.'}</p>`}
      <div class="row gap6" style="margin-top:8px;align-items:center"><small class="mut" style="flex:1">Falta numa aula fora do horário?</small><button class="btn xs" data-act="attExtra" data-id="${s.id}" data-d="-1" aria-label="Menos uma falta avulsa">−</button><button class="btn xs" data-act="attExtra" data-id="${s.id}" data-d="1" aria-label="Mais uma falta avulsa">+ falta</button></div></div>`; }).join('')}</div>` : UI.empty('Sem disciplinas em curso.')}`; };
const ti = UT.findIndex(t => t[0] === 'presencas'); if (ti >= 0) UT[ti][1] = 'Faltas';

// no detalhe da disciplina
const oldDet = OS.S.subjects.detail; OS.S.subjects.detail = s => { const x = Att.stats(s); return (oldDet ? oldDet(s) : '') + `<div class="pn tint" style="margin-top:10px"><div class="pn-h"><h3>Faltas</h3><a class="btn xs ghost" href="#universidade.presencas" data-close>Ver</a></div><dl class="kv"><dt>Faltas</dt><dd>${x.faltas}${x.max ? ' de ' + x.max + ' permitidas' : ''}</dd><dt>Presenças</dt><dd>${x.pres}${x.pct != null ? ' (' + U.pct(x.pct) + ')' : ''}</dd>${x.just ? `<dt>Justificadas</dt><dd>${x.just}</dd>` : ''}</dl></div>`; };

/* ---------- avisos (Painel) ---------- */
if (OS.Intel && OS.Intel.alerts) { const old = OS.Intel.alerts; OS.Intel.alerts = () => { const out = old(); try {
  St.current().forEach(s => { const x = Att.stats(s); if (!x.max) return; if (x.faltas >= x.max) out.push({ lvl: 'urgent', area: 'Universidade', title: `Limite de faltas atingido em ${s.name}`, detail: `${x.faltas} de ${x.max} faltas`, href: '#universidade.presencas' }); else if (x.faltas >= x.max * .75 || x.rest <= 1) out.push({ lvl: 'attention', area: 'Universidade', title: `Faltas em ${s.name}: ${x.faltas} de ${x.max}`, detail: `Só podes faltar mais ${x.rest}`, href: '#universidade.presencas' }); });
  Att.conflicts(7).slice(0, 3).forEach(x => out.push({ lvl: 'attention', area: 'Universidade', title: `Turno à hora de ${x.s.name}`, detail: `${U.WDS[U.parse(x.d).getDay()]} ${U.fmtDS(x.d)} às ${x.c.start} · conta como falta`, href: '#universidade.presencas' })); } catch (e) { } return out; }; }

// resumo para o Spyke
Att.summary = () => St.current().map(s => { const x = Att.stats(s); return x.dadas || x.max ? `${s.name}: ${x.faltas} ${x.faltas === 1 ? 'falta' : 'faltas'}${x.max ? ' de ' + x.max : ''}, ${x.pres} ${x.pres === 1 ? 'presença' : 'presenças'}${x.pct != null ? ' (' + U.pct(x.pct) + ')' : ''}` : ''; }).filter(Boolean).join('; ');
})();
