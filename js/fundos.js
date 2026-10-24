/* PRUMO — fundos do ecrã de entrada. Cada pessoa escolhe o seu, no próprio ecrã de entrada (botão "Fundo") ou em Definições:
   o Farol de sempre, outras cenas desenhadas no mesmo estilo (o céu segue a hora real) ou uma foto da galeria.
   A escolha fica neste aparelho, para cada perfil; a foto fica guardada só aqui (IndexedDB), reduzida para não pesar. */
(() => {
'use strict';
const S = OS.Scene; if (!S) return;
const f = v => Math.round(v * 10) / 10;
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), toH = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toH(A.map((v, i) => v + (B[i] - v) * t)); };
const rng = s => { let x = s; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; };
const hour = o => { const d = (o && o.date) || new Date(); return d.getHours() + d.getMinutes() / 60; };

// o que todas as cenas partilham: céu da hora, estrelas, sol ou lua, vinheta
const base = (W, H, o, hz, P, extra = {}) => { const id = o.id || 'fd', h = hour(o), r = rng(7 + new Date().getDate() * 13), u = Math.min(W, H * 1.6) / 400;
  const t = P.day ? (h - 6.5) / 13.1 : ((h < 12 ? h + 24 : h) - 19.6) / 10.9, bx = W * (extra.sx != null ? extra.sx : .2 + .6 * t), by = hz - Math.sin(Math.PI * Math.max(0, Math.min(1, t))) * hz * .62 + hz * .1, br = (extra.big || 9) * u;
  const n = extra.stars || 70, st = P.stars > .02 || extra.night ? Array.from({ length: n }, () => { const x = r() * W, y = r() * hz * .9, s = r(), tw = r() < .4; return `<circle${tw ? ` class="fd-tw" style="animation-delay:-${f(r() * 4)}s"` : ''} cx="${f(x)}" cy="${f(y)}" r="${f((s > .93 ? 1.5 : .75) * Math.max(.8, u * .9))}" fill="#E6EEF8" opacity="${f((extra.night ? 1 : P.stars) * (.3 + s * .6))}"/>`; }).join('') : '';
  return { id, u, r, bx, by, br,
    defs: `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.top}"/><stop offset="1" stop-color="${P.hz}"/></linearGradient>
      <radialGradient id="${id}g"><stop offset="0" stop-color="${P.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}v" cx="50%" cy="45%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>`,
    sky: `<rect width="${f(W)}" height="${f(H)}" fill="url(#${id}s)"/>${st}`,
    cloud: (cx, cy, w, k) => `<g class="fd-drift" style="animation-delay:-${f(r() * 40)}s"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(w)}" ry="${f(w * .07)}" fill="${mix(P.top, P.hz, .55)}" opacity="${k}"/><ellipse cx="${f(cx + w * .25)}" cy="${f(cy - w * .05)}" rx="${f(w * .55)}" ry="${f(w * .05)}" fill="${mix(P.top, P.hz, .7)}" opacity="${k}"/></g>`,
    sun: `<circle class="fd-glow" cx="${f(bx)}" cy="${f(by)}" r="${f(br * 9)}" fill="url(#${id}g)"/><circle cx="${f(bx)}" cy="${f(by)}" r="${f(br)}" fill="${P.glow}" opacity=".92"/>${P.day ? '' : `<circle cx="${f(bx + br * .35)}" cy="${f(by - br * .2)}" r="${f(br * .85)}" fill="${P.top}" opacity=".35"/>`}`,
    vig: `<rect width="${f(W)}" height="${f(H)}" fill="url(#${id}v)"/>` }; };
let ANIM = false;   // o fundo que está a ser desenhado mexe? (nos ecrãs de entrada e da conta, se a pessoa quiser)
const wrap = (W, H, defs, body) => `<svg class="scene${ANIM ? ' fd-anim' : ''}" viewBox="0 0 ${f(W)} ${f(H)}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"><defs>${defs}</defs>${body}</svg>`;
// cumeada ondulada (montanhas, dunas, colinas)
const ridge = (W, H, y0, amp, n, r, smooth) => { let d = `M0 ${f(H)} L0 ${f(y0)}`; const pts = Array.from({ length: n + 1 }, (_, i) => [W * i / n, y0 - amp * (.35 + r() * .65) * (i % 2 ? 1 : .55)]);
  pts.forEach((p, i) => { if (!i) { d += ` L0 ${f(p[1])}`; return; } const q = pts[i - 1]; d += smooth ? ` Q${f((q[0] + p[0]) / 2)} ${f(Math.min(q[1], p[1]) - amp * .25)} ${f(p[0])} ${f(p[1])}` : ` L${f(p[0])} ${f(p[1])}`; });
  return d + ` L${f(W)} ${f(H)}Z`; };

const MODELS = {
  // a cena de sempre: o mar visto do forte, com o Farol da Barra
  farol: (W, H, o) => S.svg(W, H, o),
  // serra: camadas de montanhas a perder-se na neblina
  serra: (W, H, o) => { const P = S.pal(hour(o)), hz = H * .66, B = base(W, H, o, hz, P);
    const L = [0, 1, 2, 3].map(i => `<path d="${ridge(W, H, hz - H * .02 + i * H * .075, H * (.13 - i * .025), 7 + i * 2, B.r, i > 1)}" fill="${mix(mix(P.hz, P.top, .25), mix(P.land, '#000000', .2), .28 + i * .24)}"/>`).join('');
    const mist = `<rect class="fd-mist" x="${f(-W * .1)}" y="${f(hz - H * .03)}" width="${f(W * 1.2)}" height="${f(H * .07)}" fill="${P.hz}" opacity=".18"/>`;
    return wrap(W, H, B.defs, B.sky + B.sun + B.cloud(W * .25, hz * .35, 70 * B.u, .3) + B.cloud(W * .72, hz * .2, 90 * B.u, .22) + L + mist + B.vig); },
  // cidade: prédios à beira-rio, janelas acesas ao fim do dia
  cidade: (W, H, o) => { const P = S.pal(hour(o)), hz = H * .64, B = base(W, H, o, hz, P, { stars: 40 }), u = B.u, r = B.r, lit = !P.day || P.beam > .2;
    let x = -10 * u, b = '', win = '', refl = ''; const col = mix(P.land, P.hz, .12), col2 = mix(P.land, P.hz, .28);
    while (x < W) { const w = (16 + r() * 34) * u, hh = H * (.05 + Math.pow(r(), 1.7) * (W > H ? .19 : .27)), far = r() > .55;
      b += `<rect x="${f(x)}" y="${f(hz - hh)}" width="${f(w)}" height="${f(hh + 1)}" fill="${far ? col2 : col}"/>`;
      if (r() > .7) b += `<rect x="${f(x + w * .45)}" y="${f(hz - hh - 9 * u)}" width="${f(1.2 * u)}" height="${f(9 * u)}" fill="${col}"/>`;
      const cols = Math.max(1, Math.floor(w / (6 * u))), rows = Math.floor(hh / (8 * u));
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) if (r() < (lit ? .3 : .08)) win += `<rect${lit && r() < .22 ? ` class="fd-tw" style="animation-delay:-${f(r() * 6)}s;animation-duration:${f(4 + r() * 6)}s"` : ''} x="${f(x + 2 * u + j * 6 * u)}" y="${f(hz - hh + 4 * u + i * 8 * u)}" width="${f(2.4 * u)}" height="${f(3.4 * u)}" fill="${lit ? '#F2C48D' : mix(P.hz, '#FFFFFF', .2)}" opacity="${lit ? f(.5 + r() * .45) : .35}"/>`;
      if (lit && r() > .55) refl += `<rect class="fd-shim" style="animation-delay:-${f(r() * 3)}s" x="${f(x + w * .2)}" y="${f(hz + 6 * u + r() * (H - hz) * .5)}" width="${f(w * .5)}" height="${f(1.2 * u)}" fill="#F2C48D" opacity="${f(.12 + r() * .2)}"/>`;
      x += w + (r() > .8 ? 4 * u : 0); }
    const river = `<rect y="${f(hz)}" width="${f(W)}" height="${f(H - hz)}" fill="${mix(P.seaT, P.seaB, .5)}"/><rect y="${f(hz)}" width="${f(W)}" height="${f(Math.max(1, u))}" fill="${mix(P.hz, '#FFFFFF', .2)}" opacity=".35"/>`;
    const quay = `<rect y="${f(H * .9)}" width="${f(W)}" height="${f(H * .1 + 1)}" fill="${mix(P.land, '#000000', .3)}"/>`;
    return wrap(W, H, B.defs, B.sky + B.sun + river + refl + b + win + quay + B.vig); },
  // dunas: areia ondulada e um sol (ou lua) grande
  dunas: (W, H, o) => { const P = S.pal(hour(o)), hz = H * .6, B = base(W, H, o, hz, P, { big: 15, sx: .62 }), u = B.u, sand = P.day ? '#B98A5E' : '#3B3445';
    const L = [0, 1, 2].map(i => `<path d="${ridge(W, H, hz + i * H * .09, (26 + i * 10) * u, 3 + i, B.r, true)}" fill="${mix(mix(sand, P.land, .35 + i * .22), P.hz, i ? 0 : .25)}"/>`).join('');
    return wrap(W, H, B.defs, B.sky + B.sun + B.cloud(W * .3, hz * .3, 80 * u, .22) + L + B.vig); },
  // pinhal: pinheiros em camadas, com neblina entre elas
  pinhal: (W, H, o) => { const P = S.pal(hour(o)), hz = H * .66, B = base(W, H, o, hz, P), u = Math.min(W, H) / 400, r = B.r;
    const tree = (x, y, s, c) => `<path d="M${f(x)} ${f(y - 46 * s)} L${f(x + 9 * s)} ${f(y - 30 * s)} L${f(x + 5 * s)} ${f(y - 30 * s)} L${f(x + 13 * s)} ${f(y - 16 * s)} L${f(x + 7 * s)} ${f(y - 16 * s)} L${f(x + 16 * s)} ${f(y - 2 * s)} L${f(x + 1.5 * s)} ${f(y - 2 * s)} L${f(x + 1.5 * s)} ${f(y + 6 * s)} L${f(x - 1.5 * s)} ${f(y + 6 * s)} L${f(x - 1.5 * s)} ${f(y - 2 * s)} L${f(x - 16 * s)} ${f(y - 2 * s)} L${f(x - 7 * s)} ${f(y - 16 * s)} L${f(x - 13 * s)} ${f(y - 16 * s)} L${f(x - 5 * s)} ${f(y - 30 * s)} L${f(x - 9 * s)} ${f(y - 30 * s)}Z" fill="${c}"/>`;
    let g = ''; [0, 1, 2].forEach(i => { const y = hz + i * H * .09, s = (.5 + i * .32) * u, c = mix(mix(P.hz, P.top, .2), mix(P.land, '#000000', .25), .35 + i * .3);
      g += `<rect y="${f(y)}" width="${f(W)}" height="${f(H - y)}" fill="${c}"/>`; for (let x = -10; x < W + 20; x += (14 + r() * 16) * s) g += tree(x, y + r() * 4 * u, s * (.8 + r() * .5), c);
      if (i < 2) g += `<rect class="fd-mist" style="animation-delay:-${f(i * 9)}s" x="${f(-W * .1)}" y="${f(y + 2 * u)}" width="${f(W * 1.2)}" height="${f(18 * u)}" fill="${P.hz}" opacity=".12"/>`; });
    return wrap(W, H, B.defs, B.sky + B.sun + g + B.vig); },
  // céu estrelado: noite sempre, com a Via Láctea e uma aurora suave
  estrelas: (W, H, o) => { const P = S.pal(23.2), hz = H * .74, B = base(W, H, o, hz, P, { stars: 220, night: 1 }), u = B.u, id = B.id;
    const mw = `<ellipse cx="${f(W * .55)}" cy="${f(hz * .45)}" rx="${f(Math.max(W, H) * .7)}" ry="${f(46 * u)}" fill="url(#${id}m)" transform="rotate(-28 ${f(W * .55)} ${f(hz * .45)})"/>`;
    const aur = [0, 1].map(i => `<path d="M0 ${f(hz * (.55 + i * .08))} C${f(W * .3)} ${f(hz * (.35 + i * .1))} ${f(W * .6)} ${f(hz * (.75 - i * .05))} ${f(W)} ${f(hz * (.45 + i * .1))} L${f(W)} ${f(hz * (.62 + i * .1))} C${f(W * .6)} ${f(hz * (.88 - i * .05))} ${f(W * .3)} ${f(hz * (.5 + i * .1))} 0 ${f(hz * (.72 + i * .08))}Z" fill="url(#${id}a)" opacity="${i ? .35 : .5}" class="fd-aur" style="animation-delay:-${i * 5}s"/>`).join('') + `<line class="fd-shoot" x1="${f(W * .78)}" y1="${f(hz * .12)}" x2="${f(W * .86)}" y2="${f(hz * .08)}" stroke="#F4F7FF" stroke-width="${f(1.4 * u)}" stroke-linecap="round" opacity="0"/>`;
    const hills = `<path d="${ridge(W, H, hz, 26 * u, 5, B.r, true)}" fill="#03060B"/>`;
    const defs = B.defs + `<radialGradient id="${id}m"><stop offset="0" stop-color="#C9D6F0" stop-opacity=".16"/><stop offset="1" stop-color="#C9D6F0" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5EE0B0" stop-opacity="0"/><stop offset=".5" stop-color="#5EE0B0" stop-opacity=".22"/><stop offset="1" stop-color="#2A8FA8" stop-opacity="0"/></linearGradient>`;
    return wrap(W, H, defs, B.sky + mw + aur + hills + B.vig); },
  // Prumo: os anéis da marca, grandes e calmos, com o ponto vermelho
  aneis: (W, H, o) => { const id = o.id || 'fd', cx = W * (W > H ? .74 : .62), cy = H * (W > H ? .38 : .3), R = Math.max(W, H) * .42;
    const rings = [1, .78, .57, .37].map((k, i) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * k)}" fill="none" stroke="#E9E3D8" stroke-opacity="${[.05, .07, .09, .12][i]}" stroke-width="${f(Math.max(1.5, R * .028))}"/>`).join('');
    const defs = `<radialGradient id="${id}k" cx="70%" cy="30%" r="90%"><stop offset="0" stop-color="#1A2433"/><stop offset=".6" stop-color="#0C1119"/><stop offset="1" stop-color="#060709"/></radialGradient>`;
    return wrap(W, H, defs, `<rect width="${f(W)}" height="${f(H)}" fill="url(#${id}k)"/><g class="fd-spin" style="transform-origin:${f(cx)}px ${f(cy)}px">${rings}<line x1="${f(cx)}" y1="${f(cy - R * 1.05)}" x2="${f(cx)}" y2="${f(cy - R * .2)}" stroke="#E9E3D8" stroke-opacity=".1" stroke-width="${f(R * .03)}"/></g><circle class="fd-glow" cx="${f(cx)}" cy="${f(cy)}" r="${f(R * .085)}" fill="#E0431F" opacity=".85"/>`); },
  // liso: só a cor do céu desta hora
  liso: (W, H, o) => { const P = S.pal(hour(o)), id = o.id || 'fd';
    return wrap(W, H, `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.top}"/><stop offset=".6" stop-color="${mix(P.hz, P.top, .45)}"/><stop offset="1" stop-color="${P.seaB}"/></linearGradient><radialGradient id="${id}q"><stop offset="0" stop-color="${P.glow}" stop-opacity=".14"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>`, `<rect width="${f(W)}" height="${f(H)}" fill="url(#${id}s)"/><circle class="fd-glow" cx="${f(W * .7)}" cy="${f(H * .3)}" r="${f(Math.max(W, H) * .45)}" fill="url(#${id}q)"/>`); },
  // ondas: o mar a mexer, em camadas
  ondas: (W, H, o) => { const P = S.pal(hour(o)), hz = H * .58, B = base(W, H, o, hz, P), u = B.u;
    const wave = (i) => { const y = hz + (H - hz) * (.05 + i * .24), A = (4 + i * 4) * u, k = 3 + (3 - i), L2 = W / k; let d = `M0 ${f(H)} L0 ${f(y)}`; for (let x = 0; x <= W * 2 + 1; x += L2 / 2) d += ` Q${f(x + L2 / 4)} ${f(y + ((x / (L2 / 2)) % 2 ? A : -A))} ${f(x + L2 / 2)} ${f(y)}`; return `<path class="fd-wave" style="animation-duration:${18 - i * 4}s" d="${d} L${f(W * 2 + L2)} ${f(H)}Z" fill="${mix(mix(P.seaT, P.seaB, .3 + i * .22), '#000000', i * .08)}"/>`; };
    const glint = Array.from({ length: 10 }, (_, i) => `<rect class="fd-shim" style="animation-delay:-${f(B.r() * 3)}s" x="${f(B.bx - (14 - i) * u * 1.5)}" y="${f(hz + 3 * u + i * (H - hz) * .045)}" width="${f((28 - i * 2) * u)}" height="${f(Math.max(1, 1.2 * u))}" fill="${P.glow}" opacity=".3"/>`).join('');
    return wrap(W, H, B.defs, B.sky + B.sun + B.cloud(W * .2, hz * .3, 70 * u, .3) + `<rect y="${f(hz)}" width="${f(W)}" height="${f(H - hz)}" fill="${P.seaT}"/>` + glint + [0, 1, 2, 3].map(wave).join('') + B.vig); },
  // chuva: noite de chuva sobre a cidade
  chuva: (W, H, o) => { const P = S.pal(Math.min(hour(o), 21.5) < 7 ? hour(o) : 21.5), hz = H * .66, B = base(W, H, o, hz, P, { stars: 1 }), u = B.u, r = B.r;
    let b = '', x = -8 * u; const col = mix(P.land, P.hz, .1);
    while (x < W) { const w = (18 + r() * 30) * u, hh = H * (.05 + Math.pow(r(), 1.7) * (W > H ? .18 : .25)); b += `<rect x="${f(x)}" y="${f(hz - hh)}" width="${f(w)}" height="${f(hh + 1)}" fill="${col}"/>`; for (let i = 0; i < 4; i++) if (r() < .5) b += `<rect x="${f(x + 3 * u + r() * (w - 8 * u))}" y="${f(hz - hh + 5 * u + r() * hh * .7)}" width="${f(2.4 * u)}" height="${f(3.4 * u)}" fill="#F2C48D" opacity="${f(.4 + r() * .4)}"/>`; x += w; }
    const drops = Array.from({ length: 70 }, () => { const x0 = r() * W * 1.1, y0 = r() * H * 2, l = (14 + r() * 18) * u; return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x0 - l * .18)}" y2="${f(y0 + l)}"/>`; }).join('');
    return wrap(W, H, B.defs, B.sky + `<rect y="${f(hz)}" width="${f(W)}" height="${f(H - hz)}" fill="${mix(P.seaT, P.seaB, .5)}"/>` + b + `<g class="fd-rain" stroke="#C9D6EA" stroke-width="${f(Math.max(.8, .9 * u))}" opacity=".28" stroke-linecap="round">${drops}</g>` + B.vig); } };
const NAMES = [['farol', 'Farol'], ['ondas', 'Ondas'], ['serra', 'Serra'], ['cidade', 'Cidade'], ['chuva', 'Chuva'], ['dunas', 'Dunas'], ['pinhal', 'Pinhal'], ['estrelas', 'Céu estrelado'], ['aneis', 'Prumo'], ['liso', 'Liso']];

/* ---------- a escolha (por perfil, neste aparelho) e a foto ---------- */
const LS = OS.U.ls;
const pid = () => { try { return (OS.Acc && OS.Acc.on && OS.Acc.pid && OS.Acc.pid()) || 'local'; } catch (e) { return 'local'; } };
const K = () => 'nau:bg:' + pid();
const get = () => { const v = LS.get(K(), '') || LS.get('nau:bg', ''); return v === 'foto' || MODELS[v] ? v : 'farol'; };
let IDB = null; const db = () => IDB || (IDB = new Promise((ok, ko) => { try { const q = indexedDB.open('prumo-fundo', 1); q.onupgradeneeded = () => q.result.createObjectStore('f'); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); } catch (e) { ko(e); } }));
const idb = (mode, fn) => db().then(d => new Promise((ok, ko) => { const tx = d.transaction('f', mode), st = tx.objectStore('f'), q = fn(st); tx.oncomplete = () => ok(q && q.result); tx.onerror = () => ko(tx.error); }));
const PH = {};   // fotos já lidas: pid → dataURL
const loadPhoto = p => idb('readonly', st => st.get(p)).then(v => { PH[p] = v || ''; return PH[p]; }).catch(() => { PH[p] = ''; return ''; });
// foto: reduzida para o maior lado ter 1600 px (JPEG leve)
const shrink = file => new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image();
  im.onload = () => { const M = 1600, k = Math.min(1, M / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', .84)); };
  im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Não consegui abrir esta imagem. Experimenta outra (JPG ou PNG).')); }; im.src = u; });

const F = OS.Fundo = { list: NAMES, get,
  // o fundo escolhido, à medida do ecrã
  // fundo animado: ligado por omissão; cada aparelho pode desligar
  anim: () => LS.get('nau:bganim', '1') !== '0',
  setAnim: on => { LS.set('nau:bganim', on ? '1' : '0'); F.refresh(); },
  html: (W, H, o = {}) => { const k = get(), p = pid(), mv = !!o.anim && F.anim(), oo = Object.assign({}, o, { anim: mv ? 1 : 0 });
    if (k === 'foto') { if (PH[p]) return `<div class="fd-photo${mv ? ' fd-kb' : ''}" style="background-image:url('${PH[p]}')"></div>`; if (PH[p] == null) loadPhoto(p).then(v => { if (v) F.refresh(); }); return S.svg(W, H, oo); }
    if (k === 'farol') return S.svg(W, H, oo);
    ANIM = mv; try { return MODELS[k](W, H, oo); } catch (e) { return S.svg(W, H, oo); } finally { ANIM = false; } },
  model: (k, W, H, o = {}) => (MODELS[k] || MODELS.farol)(W, H, o),
  set: k => { if (k !== 'foto' && !MODELS[k]) return; LS.set(K(), k); LS.set('nau:bg', k); F.refresh(); OS.request && OS.request(); },
  setPhoto: async file => { const d = await shrink(file), p = pid(); await idb('readwrite', st => st.put(d, p)); PH[p] = d; F.set('foto'); },
  // troca o fundo que está à vista (ecrã de entrada e ecrã da conta), sem recarregar
  refresh: () => document.querySelectorAll('.lk-scene').forEach(sc => { const g = sc.querySelector('.lk-grain'), W = Math.max(320, innerWidth), H = Math.max(480, innerHeight), id = sc.closest('#acc') ? 'acs' : 'lks';
    sc.innerHTML = F.html(W, H, { anim: 1, id }) + (g ? g.outerHTML : ''); sc.classList.toggle('fd-isphoto', get() === 'foto'); }) };
loadPhoto(pid());

/* ---------- escolher: folha com os modelos e a galeria ---------- */
const close = () => { const s = document.getElementById('fdSheet'); if (s) s.remove(); };
F.open = () => { close(); const portrait = innerHeight > innerWidth, tw = portrait ? 74 : 112, th = portrait ? 132 : 70, cur = get(), p = pid();
  const tile = (k, n) => `<button type="button" class="fd-t${k === cur ? ' on' : ''}" data-fd="${k}" aria-pressed="${k === cur}"><span class="fd-th">${MODELS[k](tw * 3, th * 3, { id: 'fdt' + k })}</span><b>${n}</b></button>`;
  const ph = PH[p] ? `<button type="button" class="fd-t${cur === 'foto' ? ' on' : ''}" data-fd="foto" aria-pressed="${cur === 'foto'}"><span class="fd-th" style="background:url('${PH[p]}') center/cover"></span><b>A tua foto</b></button>` : '';
  const el = document.createElement('div'); el.id = 'fdSheet'; el.className = 'fd-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Escolher o fundo');
  el.innerHTML = `<div class="fd-box"><div class="fd-h"><b>Fundo do ecrã de entrada</b><button type="button" class="fd-x" data-fd="x" aria-label="Fechar">Feito</button></div>
    <label class="fd-mv"><input type="checkbox" data-fdmv ${F.anim() ? 'checked' : ''}><span class="fd-sw" aria-hidden="true"></span><span>Fundo animado <small>nuvens, água, estrelas e luzes a mexer devagar</small></span></label>
    <div class="fd-g" style="--tw:${tw}px;--ar:${tw}/${th}">${NAMES.map(([k, n]) => tile(k, n)).join('')}${ph}
      <label class="fd-t fd-gal"><input type="file" accept="image/*" class="fd-file"><span class="fd-th"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg></span><b>Da galeria</b></label></div>
    <p class="fd-msg" role="status"></p></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) return close(); const b = e.target.closest('[data-fd]'); if (!b) return; const k = b.dataset.fd; if (k === 'x') return close();
    F.set(k); el.querySelectorAll('[data-fd]').forEach(x => { if (x.dataset.fd === 'x') return; x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); });
  el.querySelector('[data-fdmv]').addEventListener('change', e => F.setAnim(e.target.checked));
  el.querySelector('.fd-file').addEventListener('change', async e => { const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return; const m = el.querySelector('.fd-msg'); m.textContent = 'A preparar a foto…';
    try { await F.setPhoto(file); m.textContent = ''; F.open(); } catch (err) { m.textContent = err.message || 'Não consegui guardar a foto.'; } });
  setTimeout(() => { const b = el.querySelector('.fd-t.on') || el.querySelector('.fd-t'); b && b.focus({ preventScroll: true }); }, 30); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('fdSheet')) close(); });
OS.act && (OS.act.fundoOpen = () => F.open());
OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._fd) return; OS.views.definicoes = sub => o(sub) + (String(sub || '') === '' ? `<div class="pn" id="fdSet"><div class="pn-h"><h3>${OS.UI.ic('layers')}Fundo do ecrã de entrada</h3></div><p class="mut" style="margin:0 0 10px">Agora: <b>${(NAMES.find(x => x[0] === get()) || ['', 'A tua foto'])[1]}</b>. Escolhe outra cena ou uma foto da tua galeria. Também podes mudar no próprio ecrã de entrada, no botão Fundo.</p><button class="btn sm" data-act="fundoOpen">Mudar o fundo</button></div>` : ''); OS.views.definicoes._fd = 1; });
})();
