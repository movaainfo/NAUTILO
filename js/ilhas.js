/* PRUMO — MUNDO › Ilhas e territórios.
   Quase 200 ilhas, arquipélagos e territórios que não entram nos 195 países: as de Portugal (Madeira, Porto Santo, as 9 dos Açores…),
   as do Brasil (Noronha, Ilha Grande, Ilhabela, Florianópolis…), o Mediterrâneo, o Norte da Europa e o Ártico, as Caraíbas e as Américas,
   o Índico e África, a Ásia e o Pacífico, e os territórios com bandeira própria (Gronelândia, Porto Rico, Bermudas, Taiwan, Polinésia…).
   Marcas como os países (visitei, morei, quero ir); aparecem no mapa como pequenos losangos e cada ilha conhecida dá XP de Mente. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, V = OS.views, M = OS.Mundo; if (!M) return;
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const G = ['Portugal', 'Brasil', 'Espanha e Mediterrâneo', 'Norte da Europa e Ártico', 'Caraíbas e Américas', 'Índico e África', 'Ásia', 'Pacífico e Oceania'];
const GCOL = ['#E0896A', '#3FCF8E', '#F2B544', '#9A8CF5', '#5CC8E6', '#F2A65A', '#E8807A', '#F28CB1'];
// [id, nome, país (código de 3 letras), tipo, latitude, longitude, bandeira própria (2 letras) ou '', grupo]
const RAW = [
  ['madeira', 'Madeira', 'PRT', 'Ilha', 32.75, -16.95, '', 0], ['portosanto', 'Porto Santo', 'PRT', 'Ilha', 33.06, -16.34, '', 0], ['selvagens', 'Ilhas Selvagens', 'PRT', 'Arquipélago', 30.14, -15.87, '', 0],
  ['saomiguel', 'São Miguel (Açores)', 'PRT', 'Ilha', 37.78, -25.5, '', 0], ['terceira', 'Terceira (Açores)', 'PRT', 'Ilha', 38.72, -27.22, '', 0], ['pico', 'Pico (Açores)', 'PRT', 'Ilha', 38.47, -28.32, '', 0],
  ['faial', 'Faial (Açores)', 'PRT', 'Ilha', 38.58, -28.7, '', 0], ['saojorge', 'São Jorge (Açores)', 'PRT', 'Ilha', 38.65, -28.07, '', 0], ['santamaria', 'Santa Maria (Açores)', 'PRT', 'Ilha', 36.97, -25.1, '', 0],
  ['graciosa', 'Graciosa (Açores)', 'PRT', 'Ilha', 39.05, -28.0, '', 0], ['flores', 'Flores (Açores)', 'PRT', 'Ilha', 39.45, -31.2, '', 0], ['corvo', 'Corvo (Açores)', 'PRT', 'Ilha', 39.7, -31.1, '', 0],
  ['berlengas', 'Berlengas', 'PRT', 'Arquipélago', 39.41, -9.51, '', 0], ['culatra', 'Ilha da Culatra', 'PRT', 'Ilha', 36.99, -7.83, '', 0], ['armona', 'Ilha da Armona', 'PRT', 'Ilha', 37.02, -7.75, '', 0], ['tavira', 'Ilha de Tavira', 'PRT', 'Ilha', 37.1, -7.62, '', 0],
  ['noronha', 'Fernando de Noronha', 'BRA', 'Arquipélago', -3.85, -32.42, '', 1], ['ilhagrande', 'Ilha Grande', 'BRA', 'Ilha', -23.15, -44.23, '', 1], ['ilhabela', 'Ilhabela', 'BRA', 'Ilha', -23.8, -45.36, '', 1],
  ['floripa', 'Florianópolis (Ilha de Santa Catarina)', 'BRA', 'Ilha', -27.6, -48.5, '', 1], ['ilhadomel', 'Ilha do Mel', 'BRA', 'Ilha', -25.55, -48.31, '', 1], ['itaparica', 'Ilha de Itaparica', 'BRA', 'Ilha', -12.98, -38.7, '', 1],
  ['boipeba', 'Boipeba', 'BRA', 'Ilha', -13.6, -38.93, '', 1], ['tinhare', 'Tinharé (Morro de São Paulo)', 'BRA', 'Ilha', -13.38, -38.91, '', 1], ['marajo', 'Ilha de Marajó', 'BRA', 'Ilha', -0.9, -49.5, '', 1],
  ['abrolhos', 'Abrolhos', 'BRA', 'Arquipélago', -17.96, -38.7, '', 1], ['itamaraca', 'Ilha de Itamaracá', 'BRA', 'Ilha', -7.75, -34.84, '', 1], ['saoluis', 'Ilha de São Luís', 'BRA', 'Ilha', -2.55, -44.25, '', 1],
  ['bananal', 'Ilha do Bananal', 'BRA', 'Ilha', -11.5, -50.3, '', 1], ['paqueta', 'Paquetá', 'BRA', 'Ilha', -22.76, -43.11, '', 1], ['ilhacomprida', 'Ilha Comprida', 'BRA', 'Ilha', -24.85, -47.7, '', 1],
  ['tenerife', 'Tenerife (Canárias)', 'ESP', 'Ilha', 28.29, -16.63, '', 2], ['grancanaria', 'Gran Canaria', 'ESP', 'Ilha', 27.92, -15.6, '', 2], ['lanzarote', 'Lanzarote', 'ESP', 'Ilha', 29.04, -13.63, '', 2],
  ['fuerteventura', 'Fuerteventura', 'ESP', 'Ilha', 28.36, -14.05, '', 2], ['lapalma', 'La Palma', 'ESP', 'Ilha', 28.68, -17.86, '', 2], ['lagomera', 'La Gomera', 'ESP', 'Ilha', 28.1, -17.11, '', 2],
  ['cies', 'Ilhas Cíes', 'ESP', 'Arquipélago', 42.22, -8.9, '', 2], ['maiorca', 'Maiorca', 'ESP', 'Ilha', 39.62, 2.98, '', 2], ['menorca', 'Menorca', 'ESP', 'Ilha', 39.95, 4.1, '', 2], ['ibiza', 'Ibiza', 'ESP', 'Ilha', 38.98, 1.43, '', 2],
  ['formentera', 'Formentera', 'ESP', 'Ilha', 38.7, 1.45, '', 2], ['corsega', 'Córsega', 'FRA', 'Ilha', 42.15, 9.1, '', 2], ['sardenha', 'Sardenha', 'ITA', 'Ilha', 40.1, 9.0, '', 2], ['sicilia', 'Sicília', 'ITA', 'Ilha', 37.6, 14.0, '', 2],
  ['capri', 'Capri', 'ITA', 'Ilha', 40.55, 14.24, '', 2], ['ischia', 'Ischia', 'ITA', 'Ilha', 40.73, 13.9, '', 2], ['elba', 'Elba', 'ITA', 'Ilha', 42.78, 10.25, '', 2], ['lampedusa', 'Lampedusa', 'ITA', 'Ilha', 35.51, 12.6, '', 2],
  ['creta', 'Creta', 'GRC', 'Ilha', 35.24, 24.9, '', 2], ['santorini', 'Santorini', 'GRC', 'Ilha', 36.4, 25.46, '', 2], ['mykonos', 'Mykonos', 'GRC', 'Ilha', 37.45, 25.35, '', 2], ['rodes', 'Rodes', 'GRC', 'Ilha', 36.2, 28.0, '', 2],
  ['corfu', 'Corfu', 'GRC', 'Ilha', 39.6, 19.9, '', 2], ['zakynthos', 'Zakynthos', 'GRC', 'Ilha', 37.78, 20.9, '', 2], ['naxos', 'Naxos', 'GRC', 'Ilha', 37.05, 25.47, '', 2], ['paros', 'Paros', 'GRC', 'Ilha', 37.08, 25.15, '', 2],
  ['lesbos', 'Lesbos', 'GRC', 'Ilha', 39.2, 26.3, '', 2], ['kefalonia', 'Cefalónia', 'GRC', 'Ilha', 38.2, 20.5, '', 2], ['hvar', 'Hvar', 'HRV', 'Ilha', 43.15, 16.7, '', 2], ['brac', 'Brač', 'HRV', 'Ilha', 43.3, 16.6, '', 2],
  ['korcula', 'Korčula', 'HRV', 'Ilha', 42.95, 16.9, '', 2], ['krk', 'Krk', 'HRV', 'Ilha', 45.08, 14.6, '', 2], ['gozo', 'Gozo', 'MLT', 'Ilha', 36.04, 14.24, '', 2], ['djerba', 'Djerba', 'TUN', 'Ilha', 33.8, 10.85, '', 2],
  ['groenlandia', 'Gronelândia', 'DNK', 'Território', 72.0, -40.0, 'GL', 3], ['faroe', 'Ilhas Faroé', 'DNK', 'Território', 62.0, -6.9, 'FO', 3], ['svalbard', 'Svalbard', 'NOR', 'Território', 78.2, 15.6, 'SJ', 3],
  ['lofoten', 'Lofoten', 'NOR', 'Arquipélago', 68.2, 14.0, '', 3], ['aland', 'Åland', 'FIN', 'Território', 60.2, 20.0, 'AX', 3], ['gotland', 'Gotland', 'SWE', 'Ilha', 57.5, 18.5, '', 3], ['bornholm', 'Bornholm', 'DNK', 'Ilha', 55.1, 14.9, '', 3],
  ['man', 'Ilha de Man', 'GBR', 'Território', 54.24, -4.55, 'IM', 3], ['jersey', 'Jersey', 'GBR', 'Território', 49.21, -2.13, 'JE', 3], ['guernsey', 'Guernsey', 'GBR', 'Território', 49.45, -2.58, 'GG', 3],
  ['wight', 'Ilha de Wight', 'GBR', 'Ilha', 50.69, -1.3, '', 3], ['skye', 'Skye', 'GBR', 'Ilha', 57.3, -6.2, '', 3], ['orkney', 'Órcadas', 'GBR', 'Arquipélago', 59.0, -3.0, '', 3], ['shetland', 'Shetland', 'GBR', 'Arquipélago', 60.3, -1.3, '', 3],
  ['hebridas', 'Hébridas Exteriores', 'GBR', 'Arquipélago', 57.8, -7.0, '', 3], ['aran', 'Ilhas Aran', 'IRL', 'Arquipélago', 53.1, -9.7, '', 3], ['sylt', 'Sylt', 'DEU', 'Ilha', 54.9, 8.3, '', 3], ['rugen', 'Rügen', 'DEU', 'Ilha', 54.4, 13.4, '', 3],
  ['heligoland', 'Heligolândia', 'DEU', 'Ilha', 54.18, 7.89, '', 3], ['texel', 'Texel', 'NLD', 'Ilha', 53.08, 4.8, '', 3], ['saaremaa', 'Saaremaa', 'EST', 'Ilha', 58.4, 22.5, '', 3],
  ['portorico', 'Porto Rico', 'USA', 'Território', 18.2, -66.5, 'PR', 4], ['virgensus', 'Ilhas Virgens Americanas', 'USA', 'Território', 18.34, -64.9, 'VI', 4], ['virgensuk', 'Ilhas Virgens Britânicas', 'GBR', 'Território', 18.42, -64.64, 'VG', 4],
  ['caimao', 'Ilhas Caimão', 'GBR', 'Território', 19.3, -81.25, 'KY', 4], ['turks', 'Turks e Caicos', 'GBR', 'Território', 21.75, -71.6, 'TC', 4], ['anguila', 'Anguila', 'GBR', 'Território', 18.22, -63.06, 'AI', 4],
  ['montserrat', 'Montserrat', 'GBR', 'Território', 16.74, -62.19, 'MS', 4], ['aruba', 'Aruba', 'NLD', 'Território', 12.52, -69.97, 'AW', 4], ['curacao', 'Curaçao', 'NLD', 'Território', 12.17, -68.98, 'CW', 4],
  ['bonaire', 'Bonaire', 'NLD', 'Território', 12.15, -68.27, 'BQ', 4], ['sintmaarten', 'Sint Maarten', 'NLD', 'Território', 18.04, -63.07, 'SX', 4], ['saomartinho', 'São Martinho', 'FRA', 'Território', 18.07, -63.05, 'MF', 4],
  ['saobartolomeu', 'São Bartolomeu', 'FRA', 'Território', 17.9, -62.83, 'BL', 4], ['guadalupe', 'Guadalupe', 'FRA', 'Território', 16.25, -61.58, 'GP', 4], ['martinica', 'Martinica', 'FRA', 'Território', 14.64, -61.02, 'MQ', 4],
  ['bermudas', 'Bermudas', 'GBR', 'Território', 32.3, -64.78, 'BM', 4], ['cozumel', 'Cozumel', 'MEX', 'Ilha', 20.42, -86.92, '', 4], ['mujeres', 'Isla Mujeres', 'MEX', 'Ilha', 21.23, -86.73, '', 4], ['holbox', 'Holbox', 'MEX', 'Ilha', 21.55, -87.25, '', 4],
  ['sanandres', 'San Andrés', 'COL', 'Ilha', 12.55, -81.72, '', 4], ['margarita', 'Isla Margarita', 'VEN', 'Ilha', 11.0, -63.9, '', 4], ['roatan', 'Roatán', 'HND', 'Ilha', 16.33, -86.53, '', 4], ['ambergris', 'Ambergris Caye', 'BLZ', 'Ilha', 17.92, -87.96, '', 4],
  ['bocas', 'Bocas del Toro', 'PAN', 'Arquipélago', 9.35, -82.25, '', 4], ['juventud', 'Isla de la Juventud', 'CUB', 'Ilha', 21.7, -82.8, '', 4], ['cayococo', 'Cayo Coco', 'CUB', 'Ilha', 22.5, -78.4, '', 4],
  ['galapagos', 'Galápagos', 'ECU', 'Arquipélago', -0.75, -90.5, '', 4], ['pascoa', 'Ilha de Páscoa', 'CHL', 'Ilha', -27.1, -109.35, '', 4], ['chiloe', 'Chiloé', 'CHL', 'Ilha', -42.6, -73.9, '', 4],
  ['terradofogo', 'Terra do Fogo', 'ARG', 'Arquipélago', -54.0, -68.0, '', 4], ['malvinas', 'Ilhas Malvinas (Falkland)', 'GBR', 'Território', -51.8, -59.5, 'FK', 4], ['keys', 'Florida Keys', 'USA', 'Arquipélago', 24.66, -81.4, '', 4],
  ['manhattan', 'Manhattan', 'USA', 'Ilha', 40.78, -73.97, '', 4], ['vineyard', "Martha's Vineyard", 'USA', 'Ilha', 41.4, -70.6, '', 4], ['vancouver', 'Ilha de Vancouver', 'CAN', 'Ilha', 49.6, -125.5, '', 4],
  ['principeeduardo', 'Ilha do Príncipe Eduardo', 'CAN', 'Ilha', 46.4, -63.2, '', 4], ['terranova', 'Terra Nova', 'CAN', 'Ilha', 48.9, -55.6, '', 4], ['miquelao', 'São Pedro e Miquelão', 'FRA', 'Território', 46.88, -56.3, 'PM', 4],
  ['santahelena', 'Santa Helena', 'GBR', 'Território', -15.96, -5.7, 'SH', 5], ['ascensao', 'Ascensão', 'GBR', 'Ilha', -7.95, -14.36, '', 5], ['tristao', 'Tristão da Cunha', 'GBR', 'Ilha', -37.1, -12.28, '', 5],
  ['zanzibar', 'Zanzibar', 'TZA', 'Arquipélago', -6.13, 39.31, '', 5], ['ilhamocambique', 'Ilha de Moçambique', 'MOZ', 'Ilha', -15.03, 40.73, '', 5], ['bazaruto', 'Bazaruto', 'MOZ', 'Arquipélago', -21.65, 35.47, '', 5],
  ['reuniao', 'Reunião', 'FRA', 'Território', -21.1, 55.5, 'RE', 5], ['mayotte', 'Mayotte', 'FRA', 'Território', -12.8, 45.15, 'YT', 5], ['nosybe', 'Nosy Be', 'MDG', 'Ilha', -13.33, 48.27, '', 5], ['lamu', 'Lamu', 'KEN', 'Ilha', -2.27, 40.9, '', 5],
  ['goree', 'Ilha de Gorée', 'SEN', 'Ilha', 14.67, -17.4, '', 5], ['bijagos', 'Bijagós', 'GNB', 'Arquipélago', 11.2, -16.1, '', 5], ['bioko', 'Bioko', 'GNQ', 'Ilha', 3.5, 8.7, '', 5], ['ilhaluanda', 'Ilha de Luanda', 'AGO', 'Ilha', -8.8, 13.22, '', 5],
  ['socotora', 'Socotorá', 'YEM', 'Ilha', 12.5, 53.9, '', 5], ['andamao', 'Ilhas Andamão', 'IND', 'Arquipélago', 11.7, 92.7, '', 5], ['lakshadweep', 'Laquedivas', 'IND', 'Arquipélago', 10.5, 72.6, '', 5],
  ['taiwan', 'Taiwan', 'CHN', 'Território', 23.7, 121.0, 'TW', 6], ['hongkong', 'Hong Kong', 'CHN', 'Território', 22.3, 114.17, 'HK', 6], ['macau', 'Macau', 'CHN', 'Território', 22.2, 113.55, 'MO', 6],
  ['bali', 'Bali', 'IDN', 'Ilha', -8.4, 115.2, '', 6], ['lombok', 'Lombok', 'IDN', 'Ilha', -8.65, 116.3, '', 6], ['gili', 'Ilhas Gili', 'IDN', 'Arquipélago', -8.35, 116.05, '', 6], ['java', 'Java', 'IDN', 'Ilha', -7.5, 110.0, '', 6],
  ['sumatra', 'Samatra', 'IDN', 'Ilha', 0.0, 102.0, '', 6], ['borneu', 'Bornéu', 'IDN', 'Ilha', 1.0, 114.0, '', 6], ['komodo', 'Komodo', 'IDN', 'Ilha', -8.55, 119.45, '', 6], ['phuket', 'Phuket', 'THA', 'Ilha', 7.9, 98.35, '', 6],
  ['samui', 'Koh Samui', 'THA', 'Ilha', 9.5, 100.0, '', 6], ['phiphi', 'Koh Phi Phi', 'THA', 'Ilha', 7.74, 98.77, '', 6], ['kohtao', 'Koh Tao', 'THA', 'Ilha', 10.1, 99.84, '', 6], ['lanta', 'Koh Lanta', 'THA', 'Ilha', 7.6, 99.05, '', 6],
  ['langkawi', 'Langkawi', 'MYS', 'Ilha', 6.35, 99.8, '', 6], ['penang', 'Penang', 'MYS', 'Ilha', 5.4, 100.25, '', 6], ['palawan', 'Palawan', 'PHL', 'Ilha', 9.8, 118.7, '', 6], ['boracay', 'Boracay', 'PHL', 'Ilha', 11.97, 121.92, '', 6],
  ['cebu', 'Cebu', 'PHL', 'Ilha', 10.3, 123.9, '', 6], ['siargao', 'Siargao', 'PHL', 'Ilha', 9.85, 126.05, '', 6], ['hainan', 'Hainan', 'CHN', 'Ilha', 19.2, 109.7, '', 6], ['jeju', 'Jeju', 'KOR', 'Ilha', 33.4, 126.55, '', 6],
  ['okinawa', 'Okinawa', 'JPN', 'Ilha', 26.3, 127.8, '', 6], ['hokkaido', 'Hokkaido', 'JPN', 'Ilha', 43.2, 142.8, '', 6], ['miyajima', 'Miyajima', 'JPN', 'Ilha', 34.3, 132.32, '', 6], ['phuquoc', 'Phu Quoc', 'VNM', 'Ilha', 10.23, 103.96, '', 6],
  ['kish', 'Kish', 'IRN', 'Ilha', 26.53, 53.98, '', 6],
  ['havai', 'Havai', 'USA', 'Arquipélago', 20.8, -156.3, '', 7], ['taiti', 'Taiti (Polinésia Francesa)', 'FRA', 'Território', -17.65, -149.43, 'PF', 7], ['borabora', 'Bora Bora', 'FRA', 'Ilha', -16.5, -151.74, 'PF', 7],
  ['moorea', 'Moorea', 'FRA', 'Ilha', -17.54, -149.83, 'PF', 7], ['novacaledonia', 'Nova Caledónia', 'FRA', 'Território', -21.3, 165.5, 'NC', 7], ['guam', 'Guam', 'USA', 'Território', 13.44, 144.79, 'GU', 7],
  ['marianas', 'Ilhas Marianas do Norte', 'USA', 'Território', 15.2, 145.75, 'MP', 7], ['samoaam', 'Samoa Americana', 'USA', 'Território', -14.3, -170.7, 'AS', 7], ['cook', 'Ilhas Cook', 'NZL', 'Território', -21.24, -159.78, 'CK', 7],
  ['niue', 'Niue', 'NZL', 'Território', -19.05, -169.87, 'NU', 7], ['tokelau', 'Tokelau', 'NZL', 'Território', -9.2, -171.85, 'TK', 7], ['wallis', 'Wallis e Futuna', 'FRA', 'Território', -13.3, -176.2, 'WF', 7],
  ['norfolk', 'Ilha Norfolk', 'AUS', 'Território', -29.04, 167.95, 'NF', 7], ['natal', 'Ilha do Natal', 'AUS', 'Território', -10.49, 105.62, 'CX', 7], ['cocos', 'Ilhas Cocos', 'AUS', 'Território', -12.16, 96.87, 'CC', 7],
  ['pitcairn', 'Ilhas Pitcairn', 'GBR', 'Território', -25.07, -130.1, 'PN', 7], ['tasmania', 'Tasmânia', 'AUS', 'Ilha', -42.0, 146.6, '', 7], ['kgari', "K'gari (Fraser)", 'AUS', 'Ilha', -25.2, 153.1, '', 7],
  ['whitsundays', 'Whitsundays', 'AUS', 'Arquipélago', -20.25, 149.0, '', 7], ['rottnest', 'Rottnest', 'AUS', 'Ilha', -32.0, 115.5, '', 7], ['ilhanorte', 'Ilha Norte (Nova Zelândia)', 'NZL', 'Ilha', -38.5, 176.0, '', 7],
  ['ilhasul', 'Ilha Sul (Nova Zelândia)', 'NZL', 'Ilha', -43.5, 170.5, '', 7]];
// a mesma projeção do mapa (Natural Earth): latitude e longitude → ponto no desenho
const proj = (lng, lat) => { const l = lng * Math.PI / 180, p = lat * Math.PI / 180, p2 = p * p, p4 = p2 * p2;
  const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))), y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
  return { x: Math.round((500 + 182.89 * x) * 10) / 10, y: Math.round((259.7 - 182.6 * y) * 10) / 10 }; };
const ISL = RAW.map(([id, n, p, t, lat, lng, c2, g]) => Object.assign({ id, n, p, t, lat, lng, c2, g }, proj(lng, lat))), IBY = {}; ISL.forEach(i => { IBY[i.id] = i; });
const flagOf = i => i.c2 ? M.flag2(i.c2) : M.flag(i.p);
const ST = ['Visitei', 'Morei', 'Quero ir'], RANK = { Morei: 3, Visitei: 2, 'Quero ir': 1 }, FILL = { Visitei: 'v', Morei: 'm', 'Quero ir': 'w' };
OS.S.islands = { label: 'Ilha', title: r => (IBY[r.code] || {}).n || r.code || 'Ilha', fields: [
  { k: 'code', l: 'Ilha ou território', t: 'sel', o: ISL.map(i => [i.id, i.n]), req: 1 }, { k: 'status', l: 'Estado', t: 'sel', o: ST },
  { k: 'date', l: 'Primeira vez que fui (ou quando quero ir)', t: 'date' }, { k: 'trips', l: 'Quantas vezes já fui', t: 'num' }, { k: 'with', l: 'Com quem', t: 'text' }, { k: 'notes', l: 'Memórias e notas', t: 'area', rows: 3 }],
  defaults: () => ({ status: 'Visitei' }) };
const imine = () => { const m = {}; OS.all('islands').forEach(r => { if (!IBY[r.code]) return; const o = m[r.code]; if (!o || (RANK[r.status] || 0) > (RANK[o.status] || 0)) m[r.code] = r; }); return m; };
const istats = () => { const m = imine(), v = ISL.filter(i => M.been(m[i.id])); return { m, v, n: v.length, w: ISL.filter(i => m[i.id] && m[i.id].status === 'Quero ir') }; };
Object.assign(M, { ISL, IBY, imine, istats, iname: id => (IBY[id] || {}).n || id });

/* ---------- ações ---------- */
const recOf = id => OS.all('islands').filter(r => r.code === id);
A.muPickI = b => { const i = IBY[b.dataset.i]; if (!i) return; const r = imine()[i.id], s = r ? r.status : '';
  UI.modal(`<div class="mu-md"><div class="mu-mh"><span class="mu-fl">${flagOf(i)}</span><div><h3>${esc(i.n)}</h3><small class="mut">${esc(i.t)} · ${esc(M.name(i.p))} · ${esc(G[i.g])}</small></div><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <div class="mu-mst">${ST.map(v => `<button class="btn ${s === v ? 'pri' : 'ghost'}" data-act="muSetI" data-i="${i.id}" data-v="${v}">${v === 'Visitei' ? UI.ic('check') : v === 'Morei' ? UI.ic('home') : UI.ic('heart')}<span>${v}</span></button>`).join('')}</div>
    ${r ? `<div class="mu-mi">${r.date ? `<span>${UI.ic('cal')}${U.fmtD(r.date)}</span>` : ''}${+r.trips > 1 ? `<span>${r.trips} vezes</span>` : ''}</div><div class="row gap8"><button class="btn sm" data-act="muEditI" data-id="${r.id}">${UI.ic('edit')}<span>Data e memórias</span></button><button class="btn sm ghost" data-act="muClearI" data-i="${i.id}">Tirar</button></div>` : '<p class="mut">Marca se já foste, se viveste lá ou se queres ir.</p>'}</div>`, 'mu-modal'); };
A.muSetI = b => { const id = b.dataset.i, v = b.dataset.v, L = recOf(id), i = IBY[id], was = M.been(imine()[id]); if (!i) return;
  if (L.length) { OS.upd('islands', L[0].id, { status: v }); L.slice(1).forEach(r => OS.del('islands', r.id)); } else OS.add('islands', { code: id, status: v });
  UI.closeModal(); UI.toast(v === 'Quero ir' ? `${i.n} está nos teus próximos destinos` : was ? `${i.n}: ${v.toLowerCase()}` : `${flagOf(i)} ${i.n} no teu mapa! +500 XP de Mente no Dominus`, 'pos'); };
A.muClearI = b => { recOf(b.dataset.i).forEach(r => OS.del('islands', r.id)); UI.closeModal(); };
A.muEditI = b => { UI.closeModal(); UI.openForm('islands', b.dataset.id); };
A.muTogI = b => { const id = b.dataset.i, v = b.dataset.v, r = imine()[id]; if (r && (r.status === v || (v === 'Visitei' && r.status === 'Morei'))) { recOf(id).forEach(x => OS.del('islands', x.id)); return; } A.muSetI(b); };
A.muIG = b => OS.setUI('muIG', b.dataset.v);
A.muIF = b => OS.setUI('muIF', b.dataset.v);

/* ---------- no mapa e na página ---------- */
const layer = (m, z) => { const L = ISL.filter(i => m[i.id] || z !== ''), k = Math.max(.45, M.scale ? M.scale(z) : 1); if (!L.length) return '';
  return `<g class="mu-isl" style="stroke-width:${(.5 * k).toFixed(2)}">${L.map(i => { const r = m[i.id], s = +((r ? 4.2 : 2.6) * k).toFixed(2); return `<path d="M${i.x} ${(i.y - s).toFixed(1)}l${s} ${s}-${s} ${s}-${s}-${s}z" class="${r ? FILL[r.status] || '' : ''}" data-act="muPickI" data-i="${i.id}"><title>${esc(i.n)}</title></path>`; }).join('')}</g>`; };
// abre num grupo (Portugal) para a página não desenhar as 191 de uma vez; "Todas" a um toque, e a procura e os filtros veem todas
const section = (m) => { const f = OS.ui.muIF || 'todos', q = N((OS.ui.mu || {}).qi || ''), g = OS.ui.muIG != null ? String(OS.ui.muIG) : q || f !== 'todos' ? '' : '0', S = istats();
  const list = ISL.filter(i => (g === '' || String(i.g) === g) && (!q || N(i.n + ' ' + M.name(i.p)).includes(q)) && (f === 'todos' || (f === 'conheci' ? M.been(m[i.id]) : f === 'quero' ? m[i.id] && m[i.id].status === 'Quero ir' : !m[i.id])));
  const row = i => { const r = m[i.id], b = M.been(r), w = r && r.status === 'Quero ir';
    return `<div class="mu-row ${b ? 'on' : ''}"><button class="mu-rn" data-act="muPickI" data-i="${i.id}"><span class="mu-fl">${flagOf(i)}</span><b>${esc(i.n)}</b>${G[i.g] === M.name(i.p) && i.t !== 'Território' ? '' : `<small class="mut mu-ip">${esc(i.t === 'Território' ? 'território · ' + M.name(i.p) : M.name(i.p))}</small>`}${r ? `<small class="mu-tag ${FILL[r.status]}">${esc(r.status)}</small>` : ''}</button>
      <button class="mu-tg ${b ? 'on' : ''}" data-act="muTogI" data-i="${i.id}" data-v="Visitei" aria-label="${b ? 'Tirar' : 'Marcar'} ${esc(i.n)} como visitada" aria-pressed="${b}">${UI.ic('check')}</button>
      <button class="mu-tg w ${w ? 'on' : ''}" data-act="muTogI" data-i="${i.id}" data-v="Quero ir" aria-label="${w ? 'Tirar' : 'Pôr'} ${esc(i.n)} ${w ? 'dos' : 'nos'} próximos destinos" aria-pressed="${!!w}">${UI.ic('heart')}</button></div>`; };
  return `<section class="pn mu-isls" id="ilhas"><div class="pn-h"><h3>${UI.ic('pin')}Ilhas e territórios</h3><span class="mut"><b class="mono">${S.n}</b> de <b class="mono">${ISL.length}</b> conhecidas</span></div>
    <p class="mut" style="margin:0 0 10px">Ilhas, arquipélagos e territórios que não contam como países (Madeira, Açores, Noronha, Canárias, Havai, Bali, Gronelândia, Porto Rico…). Cada ilha conhecida dá XP de Mente no Dominus.</p>
    <div class="mu-zc">${UI.chip('Todas', 'muIG', g === '', 'data-v=""')}${G.map((n, k) => UI.chip(`${n} · ${ISL.filter(i => i.g === k && M.been(m[i.id])).length}/${ISL.filter(i => i.g === k).length}`, 'muIG', g === String(k), `data-v="${k}"`)).join('')}</div>
    <div class="row gap8 mu-fs">${[['todos', 'Todas'], ['falta', 'Por conhecer'], ['conheci', 'Conheço'], ['quero', 'Quero ir']].map(([k, l]) => UI.chip(l, 'muIF', f === k, `data-v="${k}"`)).join('')}</div>
    <input class="field mu-q" type="search" placeholder="Procurar ilha ou território…" value="${esc((OS.ui.mu || {}).qi || '')}" data-uif="mu.qi" aria-label="Procurar ilha ou território">
    ${G.map((n, k) => { const L = list.filter(i => i.g === k); return L.length ? `<div class="mu-g"><h4 style="--c:${GCOL[k]}">${esc(n)} <small class="mono">${L.filter(i => M.been(m[i.id])).length}/${L.length}</small></h4>${L.map(row).join('')}</div>` : ''; }).join('') || '<p class="mut">Nada encontrado.</p>'}</section>`; };
// liga à página Mundo: losangos no mapa, contagem no topo e a secção antes da lista dos países
const _v = V.mundo;
V.mundo = sub => { let h = _v(sub); const m = imine(), z = OS.ui.muZ != null ? String(OS.ui.muZ) : '', S = istats();
  h = h.replace('</g></svg>', '</g>' + layer(m, z) + '</svg>');
  h = h.replace(/(<b class="mono">\d+<\/b> de 6 continentes)/, `$1 · <b class="mono">${S.n}</b> ${S.n === 1 ? 'ilha' : 'ilhas'}`);
  h = h.replace('<span><i></i>Por conhecer</span>', '<span><i></i>Por conhecer</span><span><i class="isl"></i>Ilha</span>');
  const k = h.indexOf('<section class="pn"><div class="pn-h"><h3>' + UI.ic('globe') + 'Todos os países');
  return k > 0 ? h.slice(0, k) + section(m) + h.slice(k) : h + section(m); };
})();
