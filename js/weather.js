/* NÁUTILO — Clima (Open-Meteo: grátis, sem chave). Cidade do perfil (por omissão Aveiro). Guarda 30 min neste aparelho. */
(() => {
'use strict';
const U = OS.U;
const K = 'os2wx';
const W = OS.Weather = {};
const CODES = { 0: 'céu limpo', 1: 'quase limpo', 2: 'parcialmente nublado', 3: 'nublado', 45: 'nevoeiro', 48: 'nevoeiro com geada', 51: 'chuvisco fraco', 53: 'chuvisco', 55: 'chuvisco forte', 56: 'chuvisco gelado', 57: 'chuvisco gelado', 61: 'chuva fraca', 63: 'chuva', 65: 'chuva forte', 66: 'chuva gelada', 67: 'chuva gelada forte', 71: 'neve fraca', 73: 'neve', 75: 'neve forte', 77: 'grãos de neve', 80: 'aguaceiros fracos', 81: 'aguaceiros', 82: 'aguaceiros fortes', 85: 'aguaceiros de neve', 86: 'aguaceiros de neve fortes', 95: 'trovoada', 96: 'trovoada com granizo', 99: 'trovoada forte com granizo' };
W.desc = c => CODES[c] || 'tempo variável';
W.kind = c => c === 0 || c === 1 ? 'sol' : c === 2 ? 'sol-nuvem' : c === 3 || c === 45 || c === 48 ? 'nuvem' : c >= 71 && c <= 86 && ![80, 81, 82].includes(c) ? 'neve' : c >= 95 ? 'trovoada' : 'chuva';
W.city = () => (OS.one('profile').city || 'Aveiro').trim();
let data = U.ls.get(K, null), busy = null;
const geo = async name => { const g = U.ls.get('os2wxgeo', null); if (g && g.n === name) return g;
  const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&name=' + encodeURIComponent(name)), j = await r.json(), x = (j.results || [])[0];
  const o = x ? { n: name, lat: x.latitude, lon: x.longitude, label: x.name } : { n: name, lat: 40.6405, lon: -8.6538, label: 'Aveiro' }; U.ls.set('os2wxgeo', o); return o; };
W.get = async force => { const city = W.city(); if (!force && data && data.city === city && Date.now() - data.at < 30 * 6e4) return data; if (busy) return busy;
  busy = (async () => { try { const g = await geo(city);
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,relative_humidity_2m&hourly=precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Europe%2FLisbon&forecast_days=4`);
    const j = await r.json(); if (!j.current) throw new Error('sem dados');
    const h = new Date().getHours(), pp = (j.hourly && j.hourly.precipitation_probability || []).slice(h, h + 12);
    data = { at: Date.now(), city, label: g.label, now: { t: Math.round(j.current.temperature_2m), feel: Math.round(j.current.apparent_temperature), code: j.current.weather_code, wind: Math.round(j.current.wind_speed_10m), hum: j.current.relative_humidity_2m, rainNext: pp.length ? Math.max(...pp) : null },
      days: (j.daily.time || []).map((d, i) => ({ d, code: j.daily.weather_code[i], max: Math.round(j.daily.temperature_2m_max[i]), min: Math.round(j.daily.temperature_2m_min[i]), rain: j.daily.precipitation_probability_max[i], sunrise: (j.daily.sunrise[i] || '').slice(11, 16), sunset: (j.daily.sunset[i] || '').slice(11, 16) })) };
    U.ls.set(K, data); return data; } catch (e) { return data; } finally { busy = null; } })();
  return busy; };
W.cached = () => data;
// frase para o Spyke dizer
W.say = (d = data, day = 0) => { if (!d || !d.now) return ''; const x = d.days[day] || d.days[0];
  if (day === 0) return `Em ${d.label} estão ${d.now.t} graus${Math.abs(d.now.feel - d.now.t) >= 3 ? ', sensação de ' + d.now.feel : ''}, ${W.desc(d.now.code)}. Máxima de ${x.max} e mínima de ${x.min}${x.rain >= 30 ? `, ${x.rain}% de probabilidade de chuva${x.rain >= 60 ? ': leva guarda-chuva' : ''}` : ''}.`;
  return `${day === 1 ? 'Amanhã' : 'Nesse dia'} em ${d.label}: ${W.desc(x.code)}, entre ${x.min} e ${x.max} graus${x.rain >= 30 ? `, ${x.rain}% de chuva` : ''}.`; };
// ícone simples em SVG (sem emojis)
W.icon = (code, size = 28) => { const k = W.kind(code), sun = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>', cloud = '<path d="M7 18h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 9.6 4.2 4.2 0 0 0 7 18z"/>';
  const body = k === 'sol' ? sun : k === 'sol-nuvem' ? '<g transform="translate(-3 -4) scale(.75)">' + sun + '</g><path d="M9 19h9a3 3 0 0 0 .3-6 4.6 4.6 0 0 0-8.9-1.2A3.6 3.6 0 0 0 9 19z"/>' : k === 'nuvem' ? cloud : k === 'neve' ? cloud + '<path d="M9 21l.01 0M12 22l.01 0M15 21l.01 0"/>' : k === 'trovoada' ? cloud + '<path d="M12.5 15l-2 3.5h3l-2 3.5"/>' : '<path d="M7 15h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 6.6 4.2 4.2 0 0 0 7 15z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>';
  return `<svg class="wx-ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`; };
OS.on('ready', () => { if (!navigator.webdriver) setTimeout(() => W.get(), 3000); });
})();
