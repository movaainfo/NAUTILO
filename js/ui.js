/* OCEANUM — componentes de interface: ícones, blocos, tabelas, formulários, gaveta, gráficos. */
(() => {
'use strict';
const U = OS.U;
const UI = OS.UI = {};
const { esc, fmtD, eur, num } = OS.U;

/* ================= ÍCONES (traço 1.6, 24×24) ================= */
const IP = UI.IP = { mail: 'M3 6h18v12H3zM3 7l9 6 9-6', mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3', news: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4', cross: 'M12 3v18M6.5 8.5h11', tree: 'M12 22v-5M12 3l5 6h-3l4 5h-4l3 3H7l3-3H6l4-5H7z', user: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7', apple: 'M12 7c-2-2-6.5-1.5-6.5 3.5 0 4.5 3.2 9.5 6.5 9.5s6.5-5 6.5-9.5C18.5 5.5 14 5 12 7zM12 7c0-2 1-3.5 3-4.5', drop: 'M12 3c3.2 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.8-6.8 6-11z', hex: 'M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  grid: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  radar: 'M12 12 19 5M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7z',
  cal: 'M3 6h18v15H3zM3 10h18M8 3v4M16 3v4',
  check: 'M4 12l5 5L20 6',
  checksq: 'M4 4h16v16H4zM8 12l3 3 5-6',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  folder: 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h.01',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  cart: 'M3 4h2l2.4 11h11L21 7H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  calc: 'M5 3h14v18H5zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  school: 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6',
  book: 'M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 0 2 2h14',
  brain: 'M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 2V5a3 3 0 0 0-3-2zM15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 2',
  dumbbell: 'M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12',
  run: 'M14 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM7 21l3-5 3 2v4M10 16l1.5-6 4 3.5 3.5-1M11.5 10 8 11l-2 3',
  briefcase: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 3.5a4 4 0 0 1 0 7.5M18 15c2.5.7 4 2.6 4 6',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9z',
  door: 'M5 21V4a1 1 0 0 1 1-1h10l3 3v15M3 21h18M14 12h.01',
  rocket: 'M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2M12 15l-3-3M9 12c1-4 4-8 11-9-1 7-5 10-9 11zM15 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  mountain: 'M3 20 9.5 8l4 7 2.5-4 5 9zM14 5l1.5 2',
  scale: 'M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM8 21h8',
  rewind: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  chart: 'M3 3v18h18M7 15l4-5 3 3 5-7',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5zM5 19h14',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6 6 18', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  right: 'M9 6l6 6-6 6', left: 'M15 6l-6 6 6 6', down: 'M6 9l6 6 6-6', up: 'M6 15l6-6 6 6',
  arrowUp: 'M12 19V5M5 12l7-7 7 7', arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  play: 'M7 4l13 8-13 8z', pause: 'M7 4h4v16H7zM13 4h4v16h-4z', stop: 'M6 6h12v12H6z',
  focus: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01', flag: 'M5 21V4M5 4h12l-2 4 2 4H5', dots: 'M5 12h.01M12 12h.01M19 12h.01',
  sync: 'M20 11a8 8 0 0 0-14.9-3M4 5v3h3M4 13a8 8 0 0 0 14.9 3M20 19v-3h-3', info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7h.01',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  gift: 'M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1',
  sword: 'M14.5 3H21v6.5L10 20.5 3.5 14zM5 16l3 3M3 21l2-2',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3-1-3 0-6 0-8z',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9h-4a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9M12 7v2M12 15v2',
  heart: 'M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z', wave: 'M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  menu: 'M4 6h16M4 12h16M4 18h16', note: 'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6', bolt: 'M13 2 4 14h7l-1 8 9-12h-7z', building: 'M4 21V5l8-3 8 3v16M9 21v-5h6v5M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7', card: 'M3 6h18v12H3zM3 10h18M7 15h4', bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
  hourglass: 'M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5'
};
UI.ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IP[n] || IP.dots}"/></svg>`;

/* ================= BLOCOS ================= */
UI.head = (title, sub, actions = '', eyebrow = '') => `<header class="phead"><div class="phead-t">${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="phead-a">${actions}</div>` : ''}</header>`;
UI.tabs = (base, items, cur) => `<nav class="tabs" aria-label="Secções">${items.map(([k, l]) => `<a href="#${base}${k ? '.' + k : ''}" class="${(cur || '') === k ? 'on' : ''}">${l}</a>`).join('')}</nav>`;
UI.sec = (title, actions = '', sub = '') => `<div class="sech"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="row gap8">${actions}</div>` : ''}</div>`;
UI.kpi = (l, v, s = '', o = {}) => `<div class="kpi ${o.cls || ''}"${o.href ? ` data-go="${o.href}" role="link" tabindex="0"` : ''}><span class="kpi-l">${l}</span><span class="kpi-v ${o.tone || ''}">${v}</span>${s ? `<span class="kpi-s">${s}</span>` : ''}</div>`;
UI.badge = (t, tone = '') => t ? `<span class="bdg ${tone}">${esc(t)}</span>` : '';
UI.dot = tone => `<i class="dot ${tone}"></i>`;
UI.bar = (p, tone = '', mark) => `<div class="pbar ${tone}"><i style="width:${Math.max(0, Math.min(100, p * 100))}%"></i>${mark != null ? `<b style="left:${Math.max(0, Math.min(100, mark * 100))}%" title="Ritmo esperado"></b>` : ''}</div>`;
UI.empty = (t, act = '') => `<div class="empty"><p>${t}</p>${act}</div>`;
UI.btn = (label, act, o = {}) => `<button class="btn ${o.cls || ''}" ${act ? `data-act="${act}"` : ''} ${o.data || ''} ${o.dis ? 'disabled' : ''} ${o.title ? `title="${esc(o.title)}"` : ''}>${o.ic ? UI.ic(o.ic) : ''}${label ? `<span>${label}</span>` : ''}</button>`;
UI.addBtn = (coll, label = 'Adicionar', defs, cls = 'pri') => `<button class="btn ${cls}" data-new="${coll}"${defs ? ` data-defs='${esc(JSON.stringify(defs))}'` : ''}>${UI.ic('plus')}<span>${label}</span></button>`;
UI.trend = (cur, prev, goodUp = true, fmt = v => U.pct(v)) => {
  if (!prev && !cur) return '';
  const t = OS.U.trend(cur, prev); if (!isFinite(t) || Math.abs(t) < .005) return `<span class="trend flat">estável</span>`;
  const good = (t > 0) === goodUp;
  return `<span class="trend ${good ? 'pos' : 'neg'}">${UI.ic(t > 0 ? 'arrowUp' : 'arrowDown')}${fmt(Math.abs(t))}</span>`;
};
UI.chip = (label, act, on, data = '') => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" ${data}>${label}</button>`;
UI.seg = (key, opts, cur) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-ui="${key}" data-v="${esc(v)}">${l}</button>`).join('')}</div>`;
UI.toggle = (title, body, key, icon = '') => { const open = OS.ui['tog_' + key]; return `<details class="tog" data-tog="${key}"${open ? ' open' : ''}><summary>${icon ? UI.ic(icon) : ''}<span>${title}</span>${UI.ic('down', 'chev')}</summary><div class="tog-b">${body}</div></details>`; };

/* ================= TABELA ================= */
UI.table = (o) => {
  const cols = o.cols, rows = o.rows || [];
  if (!rows.length) return UI.empty(o.empty || 'Sem registos.', o.emptyAct || '');
  const key = o.key || '';
  let sorted = rows;
  const st = key && OS.ui['sort_' + key];
  if (st && cols[st.i] && cols[st.i].s) sorted = U.sortBy(rows, cols[st.i].s, st.d);
  const lim = o.limit && !OS.ui['more_' + key] ? o.limit : 1e9;
  const shown = sorted.slice(0, lim);
  return `<div class="tblw"><table class="tbl ${o.cls || ''}"><thead><tr>${cols.map((c, i) => `<th class="${c.cls || ''}${c.s ? ' sortable' : ''}" ${c.s && key ? `data-sort="${key}" data-i="${i}"` : ''}>${c.l}${st && st.i === i ? (st.d > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead><tbody>${shown.map(r => `<tr ${o.coll ? `data-edit="${o.coll}:${r.id}" tabindex="0"` : o.rowAttr ? o.rowAttr(r) : ''} class="${o.rowCls ? o.rowCls(r) : ''}">${cols.map(c => `<td class="${c.cls || ''}">${c.v(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${sorted.length > lim ? `<button class="btn ghost sm more" data-more="${key}">Mostrar mais ${sorted.length - lim}</button>` : ''}`;
};

/* ================= FORMULÁRIOS / GAVETA ================= */
OS.S = OS.S || {};             // esquemas de coleção: {label, title, fields:[...], defaults(), after(rec, isNew)}
function optList(f, rec) {
  let o = typeof f.o === 'function' ? f.o(rec) : f.o || [];
  return o.map(x => Array.isArray(x) ? x : [x, x]);
}
function fieldHTML(f, rec) {
  const v = rec[f.k], id = 'f_' + f.k, req = f.req ? ' required' : '';
  const lab = `<label for="${id}">${f.l}${f.req ? ' <b class="req">*</b>' : ''}</label>`;
  const hh = typeof f.h === 'function' ? f.h(rec) : f.h, help = hh ? `<small>${hh}</small>` : '';
  let inp;
  switch (f.t) {
    case 'area': inp = `<textarea id="${id}" name="${f.k}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}"${req}>${esc(v)}</textarea>`; break;
    case 'num': case 'money': case 'pct': inp = `<div class="inp-wrap">${f.t === 'money' ? '<span>€</span>' : ''}<input id="${id}" name="${f.k}" type="number" step="${f.step || 'any'}" inputmode="decimal" value="${v ?? ''}" placeholder="${esc(f.ph || '')}"${req}>${f.t === 'pct' ? '<span>%</span>' : ''}${f.unit ? `<span>${f.unit}</span>` : ''}</div>`; break;
    case 'date': inp = `<input id="${id}" name="${f.k}" type="date" value="${v || ''}"${req}>`; break;
    case 'time': inp = `<input id="${id}" name="${f.k}" type="time" value="${v || ''}"${req}>`; break;
    case 'dur': inp = `<input id="${id}" name="${f.k}" value="${v ? OS.U.mmss(v) : ''}" placeholder="${f.ph || 'mm:ss ou h:mm:ss'}" pattern="[0-9:]*"${req}>`; break;
    case 'bool': return `<div class="fld fld-bool"><label class="switch"><input type="checkbox" id="${id}" name="${f.k}"${v ? ' checked' : ''}><span></span>${f.l}</label>${help}</div>`;
    case 'sel': case 'rel': {
      const opts = f.t === 'rel' ? OS.all(f.c).filter(x => !f.filter || f.filter(x, rec)).map(x => [x.id, OS.S[f.c] && OS.S[f.c].title ? OS.S[f.c].title(x) : (x.name || x.title || x.id)]) : optList(f, rec);
      inp = `<select id="${id}" name="${f.k}"${req}>${f.req && v ? '' : `<option value="">${f.none || '—'}</option>`}${opts.map(([a, b]) => `<option value="${esc(a)}"${String(v ?? '') === String(a) ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`; break;
    }
    case 'multi': { const cur = Array.isArray(v) ? v : []; inp = `<div class="chips" id="${id}">${optList(f, rec).map(([a, b]) => `<label class="chipc"><input type="checkbox" name="${f.k}" value="${esc(a)}"${cur.includes(a) ? ' checked' : ''}><span>${esc(b)}</span></label>`).join('')}</div>`; break; }
    case 'tags': inp = `<input id="${id}" name="${f.k}" value="${esc(Array.isArray(v) ? v.join(', ') : v || '')}" placeholder="separar por vírgulas">`; break;
    case 'rating': { const n = f.max || 5; inp = `<div class="rating" id="${id}">${Array.from({ length: n }, (_, i) => `<label><input type="radio" name="${f.k}" value="${i + 1}"${+v === i + 1 ? ' checked' : ''}><span>${i + 1}</span></label>`).join('')}</div>`; break; }
    case 'steps': { const arr = Array.isArray(v) ? v : []; inp = `<div class="steps-ed" data-steps="${f.k}">${arr.map(s => `<div class="step-row"><input type="checkbox"${s.done ? ' checked' : ''}><input class="st-t" value="${esc(s.t)}"><button type="button" class="icon-btn" data-step-del>${UI.ic('x')}</button></div>`).join('')}<button type="button" class="btn ghost sm" data-step-add>${UI.ic('plus')}Adicionar etapa</button></div>`; break; }
    case 'custom': return `<div class="fld ${f.wide ? 'wide' : ''}">${lab}${f.render(rec)}${help}</div>`;
    default: inp = `<input id="${id}" name="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || '')}"${req}${f.list ? ` list="dl_${f.k}"` : ''}>${f.list ? `<datalist id="dl_${f.k}">${(typeof f.list === 'function' ? f.list() : f.list).map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}`;
  }
  return `<div class="fld ${f.wide || f.t === 'area' || f.t === 'multi' || f.t === 'steps' ? 'wide' : ''}">${lab}${inp}${help}</div>`;
}
function readForm(form, fields, rec) {
  const out = {};
  fields.forEach(f => {
    if (f.show && !f.show(rec)) return;
    const el = form.elements[f.k];
    switch (f.t) {
      case 'bool': out[f.k] = !!(el && el.checked); break;
      case 'num': case 'money': case 'pct': out[f.k] = el && el.value !== '' ? num(el.value) : ''; break;
      case 'dur': out[f.k] = el ? OS.U.parseDur(el.value) : 0; break;
      case 'multi': out[f.k] = [...form.querySelectorAll(`input[name="${f.k}"]:checked`)].map(x => x.value); break;
      case 'tags': out[f.k] = el ? el.value.split(',').map(s => s.trim()).filter(Boolean) : []; break;
      case 'rating': { const c = form.querySelector(`input[name="${f.k}"]:checked`); out[f.k] = c ? +c.value : ''; break; }
      case 'steps': out[f.k] = [...form.querySelectorAll(`[data-steps="${f.k}"] .step-row`)].map(r => ({ t: r.querySelector('.st-t').value.trim(), done: r.querySelector('input[type=checkbox]').checked })).filter(s => s.t); break;
      case 'custom': if (f.read) out[f.k] = f.read(form, rec); break;
      default: if (el) out[f.k] = el.value.trim();
    }
  });
  return out;
}
let drawerState = null;
UI.openForm = (coll, id, defaults = {}, opt = {}) => {
  const S = OS.S[coll]; if (!S) return;
  const rec = id ? Object.assign({}, OS.get(coll, id)) : Object.assign({}, S.defaults ? S.defaults() : {}, defaults);
  if (id && !OS.get(coll, id)) return;
  drawerState = { coll, id, rec };
  const fields = S.fields.filter(f => !f.show || f.show(rec));
  const extra = id && S.detail ? S.detail(OS.get(coll, id)) : '';
  UI.drawer(`<form class="form" id="osform" novalidate>
    <div class="drw-h"><div><div class="eyebrow">${id ? 'Editar' : 'Novo'} · ${S.label}</div><h3>${esc(id ? (S.title ? S.title(rec) : rec.title || rec.name) : (opt.title || S.label))}</h3></div><button type="button" class="icon-btn" data-close aria-label="Fechar">${UI.ic('x')}</button></div>
    <div class="drw-b"><div class="fgrid">${fields.map(f => fieldHTML(f, rec)).join('')}</div>${extra}</div>
    <div class="drw-f">${id ? `<button type="button" class="btn danger ghost" data-delrec>${UI.ic('trash')}<span>Apagar</span></button>` : '<span></span>'}<div class="row gap8"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn pri" type="submit">${UI.ic('check')}<span>${id ? 'Guardar' : 'Criar'}</span></button></div></div>
  </form>`);
  const form = U.$('#osform');
  form.addEventListener('change', e => { // campos dependentes
    if (S.fields.some(f => f.show || f.re)) {
      const f0 = S.fields.find(f => f.k === e.target.name), force = !!(f0 && f0.re);
      const cur = Object.assign({}, rec, readForm(form, fields, rec));
      const nf = S.fields.filter(f => !f.show || f.show(cur));
      if (force || nf.length !== fields.length || nf.some((f, i) => f !== fields[i])) { drawerState.rec = cur; Object.assign(rec, cur); fields.length = 0; nf.forEach(f => fields.push(f)); U.$('.fgrid', form).innerHTML = nf.map(f => fieldHTML(f, cur)).join(''); }
    }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = readForm(form, fields, rec);
    const miss = fields.find(f => f.req && (data[f.k] === '' || data[f.k] == null));
    if (miss) { UI.toast('Preenche: ' + miss.l, 'neg'); const el = form.elements[miss.k]; el && el.focus && el.focus(); return; }
    if (S.validate) { const err = S.validate(data, rec, id); if (err) { UI.toast(err, 'neg'); return; } }
    let r;
    if (id) r = OS.upd(coll, id, data); else r = OS.add(coll, Object.assign({}, defaults, data));
    S.after && S.after(r, !id, data);
    UI.closeDrawer();
    UI.toast(id ? 'Guardado' : S.label + ' criado', 'pos');
    opt.onSave && opt.onSave(r);
  });
  const first = form.querySelector('input:not([type=checkbox]):not([type=radio]),select,textarea'); first && setTimeout(() => first.focus(), 60);
};
UI.drawer = (html, cls = '') => {
  const d = U.$('#drawer'); d.innerHTML = `<div class="drw-bg" data-close></div><aside class="drw ${cls}" role="dialog" aria-modal="true">${html}</aside>`; d.hidden = false;
  document.body.classList.add('noscroll');
};
UI.closeDrawer = () => { const d = U.$('#drawer'); d.hidden = true; d.innerHTML = ''; drawerState = null; document.body.classList.remove('noscroll'); };
UI.ask = (title, text, ok, fn, tone = 'danger') => {
  const m = U.$('#modal'); m.innerHTML = `<div class="drw-bg" data-mclose></div><div class="modal" role="alertdialog" aria-modal="true"><h3>${title}</h3><p>${text}</p><div class="row gap8 end"><button class="btn ghost" data-mclose>Cancelar</button><button class="btn ${tone}" data-mok>${ok}</button></div></div>`; m.hidden = false;
  U.$('[data-mok]', m).onclick = () => { m.hidden = true; m.innerHTML = ''; fn(); };
  U.$$('[data-mclose]', m).forEach(b => b.onclick = () => { m.hidden = true; m.innerHTML = ''; });
  setTimeout(() => U.$('[data-mok]', m).focus(), 30);
};
UI.modal = (html, cls = '') => { const m = U.$('#modal'); m.innerHTML = `<div class="drw-bg" data-mclose></div><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false; U.$$('[data-mclose]', m).forEach(b => b.onclick = UI.closeModal); };
UI.closeModal = () => { const m = U.$('#modal'); m.hidden = true; m.innerHTML = ''; };
UI.toast = (msg, tone = '') => { const t = U.$('#toast'); t.className = 'toast ' + tone; t.textContent = msg; t.hidden = false; clearTimeout(UI._tt); UI._tt = setTimeout(() => t.hidden = true, 3200); };

document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) { UI.closeDrawer(); return; }
  if (e.target.closest('[data-delrec]') && drawerState) {
    const { coll, id } = drawerState; const S = OS.S[coll];
    UI.ask('Apagar ' + S.label.toLowerCase() + '?', ((S.delWarn && (() => { try { return S.delWarn(OS.get(coll, id)); } catch (er) { return ''; } })()) || '') + ' Esta ação não pode ser desfeita.', 'Apagar', () => { S.beforeDel && S.beforeDel(OS.get(coll, id)); OS.del(coll, id); UI.closeDrawer(); UI.toast('Apagado'); });
    return;
  }
  const sa = e.target.closest('[data-step-add]'); if (sa) { sa.insertAdjacentHTML('beforebegin', `<div class="step-row"><input type="checkbox"><input class="st-t" value=""><button type="button" class="icon-btn" data-step-del>${UI.ic('x')}</button></div>`); sa.previousElementSibling.querySelector('.st-t').focus(); return; }
  const sd = e.target.closest('[data-step-del]'); if (sd) { sd.parentElement.remove(); return; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!U.$('#modal').hidden) UI.closeModal(); else if (!U.$('#drawer').hidden) UI.closeDrawer(); } });

/* ================= GRÁFICOS =================
   Os gráficos são desenhados depois do layout, com a largura real do contentor. */
const C = OS.C = {}; let specs = {}, cid = 0;
const PAL = C.PAL = ['#5CC8E6', '#9A8CF5', '#F2B544', '#3FCF8E', '#F28CB1', '#6E86A6', '#4F7CF7', '#E0896A', '#B5E48C', '#C9A0DC'];
C.mount = (spec, h = 200) => { const id = 'ch' + (++cid); specs[id] = spec; return `<div class="chart" id="${id}" style="height:${spec.h || h}px"></div>`; };
C.drawAll = () => { Object.keys(specs).forEach(id => { const el = document.getElementById(id); if (!el) return; try { el.innerHTML = draw(specs[id], el.clientWidth || 300, el.clientHeight || 200); } catch (e) { console.error(e); } }); };
C.reset = () => { specs = {}; };
addEventListener('resize', U.deb(() => C.drawAll(), 150));
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || 'middle'}" class="${o.c || 'cl'}"${o.fs ? ` font-size="${o.fs}"` : ''}>${esc(s)}</text>`;
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function draw(s, W, H) {
  const fmt = s.fmt || (v => U.nf(v, Math.abs(v) < 10 && v % 1 ? 1 : 0));
  if (s.type === 'donut') return donut(s, W, H);
  if (s.type === 'radar') return radar(s, W, H);
  const pl = s.pl ?? 44, pr = 12, pt = 14, pb = 24, cw = W - pl - pr, ch = H - pt - pb;
  const labels = s.labels || [];
  const n = labels.length; if (!n) return `<div class="chart-empty">Sem dados suficientes.</div>`;
  const series = s.series || [];
  let vals = []; series.forEach(se => se.data.forEach(v => v != null && vals.push(v)));
  if (s.stacked) { vals = labels.map((_, i) => series.reduce((a, se) => a + Math.max(0, se.data[i] || 0), 0)); }
  if (!vals.length || vals.every(v => v === 0 || v == null)) return `<div class="chart-empty">${s.empty || 'Sem dados neste período.'}</div>`;
  let max = Math.max(...vals, s.min0 === false ? -Infinity : 0), min = Math.min(...vals, s.min0 === false ? Infinity : 0);
  if (s.min0 === false) { const pad = (max - min) * .15 || Math.abs(max) * .1 || 1; max += pad; min -= pad; }
  if (s.target != null) max = Math.max(max, s.target);
  max = s.min0 === false ? max : niceMax(max); if (min < 0) min = -niceMax(-min);
  const Y = v => pt + ch - (v - min) / (max - min || 1) * ch;
  let g = `<svg width="${W}" height="${H}" role="img" aria-label="${esc(s.label || 'gráfico')}">`;
  const ticks = 4; for (let i = 0; i <= ticks; i++) { const v = min + (max - min) * i / ticks, y = Y(v); g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" class="gl"/>` + T(pl - 6, y + 3.5, fmt(v), { a: 'end' }); }
  if (min < 0) g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}" class="gl0"/>`;
  const step = cw / n, every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(cw / 46))));
  labels.forEach((l, i) => { if (i % every === 0 || i === n - 1) g += T(pl + step * i + step / 2, H - 7, l); });
  if (s.target != null) g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(s.target)}" y2="${Y(s.target)}" class="tgt"/>` + T(W - pr, Y(s.target) - 4, s.targetLabel || 'meta', { a: 'end', c: 'cl tgtl' });
  if (s.type === 'bar') {
    const k = s.stacked ? 1 : series.length, gw = step * .7, bw = gw / k;
    series.forEach((se, si) => se.data.forEach((v, i) => {
      if (v == null || v === 0) return;
      let x, y0, y1;
      if (s.stacked) { const below = series.slice(0, si).reduce((a, q) => a + Math.max(0, q.data[i] || 0), 0); x = pl + step * i + (step - gw) / 2; y1 = Y(below + v); y0 = Y(below); }
      else { x = pl + step * i + (step - gw) / 2 + si * bw; y1 = Y(Math.max(0, v)); y0 = Y(Math.min(0, v)); }
      const c = typeof se.color === 'function' ? se.color(v, i) : se.color || PAL[si];
      g += `<rect x="${x + .5}" y="${Math.min(y0, y1)}" width="${Math.max(1, (s.stacked ? gw : bw) - 1.5)}" height="${Math.max(1, Math.abs(y0 - y1))}" rx="2.5" fill="${c}"><title>${esc(labels[i])} · ${esc(se.name || '')}: ${esc(fmt(v))}</title></rect>`;
    }));
  } else {
    series.forEach((se, si) => {
      const c = se.color || PAL[si];
      const pts = se.data.map((v, i) => v == null ? null : [pl + step * i + step / 2, Y(v), v, i]).filter(Boolean);
      if (!pts.length) return;
      const d = pts.map((p, j) => (j ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      if (s.area !== false && si === 0 && pts.length > 1) g += `<path d="${d} L${pts[pts.length - 1][0]} ${Y(Math.max(min, 0))} L${pts[0][0]} ${Y(Math.max(min, 0))}Z" fill="${c}" opacity=".12"/>`;
      g += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${se.w || 2}" stroke-linejoin="round" stroke-linecap="round"${se.dash ? ' stroke-dasharray="5 4"' : ''}/>`;
      pts.forEach((p, j) => { const last = j === pts.length - 1; g += `<circle cx="${p[0]}" cy="${p[1]}" r="${last ? 3.8 : pts.length < 30 ? 2.2 : 0}" fill="${c}"><title>${esc(labels[p[3]])} · ${esc(se.name || '')}: ${esc(fmt(p[2]))}</title></circle>`; if (last && s.endLabel !== false && si === 0) g += T(Math.min(p[0], W - pr - 20), p[1] - 8, fmt(p[2]), { c: 'cl clv' }); });
    });
  }
  if (series.length > 1 && s.legend !== false) g += `</svg><div class="legend">${series.map((se, i) => `<span><i style="background:${typeof se.color === 'string' ? se.color : PAL[i]}"></i>${esc(se.name)}</span>`).join('')}</div>`;
  else g += '</svg>';
  return g;
}
function donut(s, W, H) {
  const data = (s.data || []).filter(d => d.v > 0); const tot = data.reduce((a, d) => a + d.v, 0);
  if (!tot) return `<div class="chart-empty">${s.empty || 'Sem dados neste período.'}</div>`;
  const size = Math.min(H, 190), r = size / 2 - 12, cx = size / 2, cy = size / 2, C2 = 2 * Math.PI * r; let acc = 0;
  let g = `<div class="donut"><svg width="${size}" height="${size}" role="img" aria-label="${esc(s.label || '')}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--line)" stroke-width="18"/>`;
  data.forEach((d, i) => { const len = d.v / tot * C2; g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.c || PAL[i % PAL.length]}" stroke-width="18" stroke-dasharray="${Math.max(0, len - 1.5)} ${C2 - len + 1.5}" stroke-dashoffset="${-acc}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(d.l)}: ${esc((s.fmt || U.eur)(d.v))}</title></circle>`; acc += len; });
  g += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" class="dn-v">${esc(s.center || (s.fmt || U.eurK)(tot))}</text><text x="${cx}" y="${cy + 15}" text-anchor="middle" class="cl">${esc(s.centerSub || 'total')}</text></svg>`;
  if (s.noleg) return g + '</div>';
  g += `<div class="dn-leg">${data.slice(0, s.max || 8).map((d, i) => `<div><i style="background:${d.c || PAL[i % PAL.length]}"></i><span>${esc(d.l)}</span><b>${esc((s.fmt || U.eur)(d.v))}</b><em>${Math.round(d.v / tot * 100)}%</em></div>`).join('')}</div></div>`;
  return g;
}
function radar(s, W, H) {
  const axes = s.axes, n = axes.length, size = Math.min(W, H), cx = W / 2, cy = size / 2 + 4, r = size / 2 - 34;
  const P = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]; };
  let g = `<svg width="${W}" height="${H}" role="img" aria-label="${esc(s.label || '')}">`;
  [.25, .5, .75, 1].forEach(k => g += `<polygon points="${axes.map((_, i) => P(i, k).join(',')).join(' ')}" class="gl" fill="none"/>`);
  axes.forEach((a, i) => { const [x, y] = P(i, 1.16); g += `<line x1="${cx}" y1="${cy}" x2="${P(i, 1)[0]}" y2="${P(i, 1)[1]}" class="gl"/>` + T(x, y + 3, a); });
  (s.series || []).forEach((se, si) => { const c = se.color || PAL[si]; g += `<polygon points="${se.data.map((v, i) => P(i, Math.max(.02, Math.min(1, v))).join(',')).join(' ')}" fill="${c}" fill-opacity="${si ? .08 : .2}" stroke="${c}" stroke-width="2"${si ? ' stroke-dasharray="4 3"' : ''}/>`; });
  g += '</svg>';
  if ((s.series || []).length > 1) g += `<div class="legend">${s.series.map((se, i) => `<span><i style="background:${se.color || PAL[i]}"></i>${esc(se.name)}</span>`).join('')}</div>`;
  return g;
}
UI.spark = (vals, color = 'var(--accent)', w = 90, h = 26) => {
  const v = vals.filter(x => x != null); if (v.length < 2) return '';
  const max = Math.max(...v), min = Math.min(...v), X = i => i * (w - 4) / (vals.length - 1) + 2, Y = x => h - 3 - (x - min) / (max - min || 1) * (h - 6);
  const d = vals.map((x, i) => x == null ? '' : (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x).toFixed(1)).join(' ');
  return `<svg class="spark" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${X(vals.length - 1)}" cy="${Y(vals[vals.length - 1] ?? v[v.length - 1])}" r="2.4" fill="${color}"/></svg>`;
};
UI.heat = (days, valFn, maxV) => `<div class="heat">${days.map(d => { const v = valFn(d); const k = maxV ? Math.min(1, v / maxV) : v ? 1 : 0; return `<i style="--k:${k}" title="${U.fmtD(d)}: ${v}"></i>`; }).join('')}</div>`;

})();
