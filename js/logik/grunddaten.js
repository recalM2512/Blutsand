/*
 * Blutsand · Spiellogik · Grunddaten: Zufall, Spielstand-Variable, Seltenheiten, Typen, Ausrüstung
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
var rng = Math.random;
function setRng(f) { rng = f; }
function rnd(a, b) { return Math.floor(rng() * (b - a + 1)) + a; }
function pick(a) { return a[Math.floor(rng() * a.length)]; }
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function chance(p) { return rng() < p; }
var _uidN = 0;
function uid() { _uidN++; return Date.now().toString(36) + _uidN.toString(36) + Math.floor(rng() * 1e6).toString(36); }

var S = null;          // Spielstand
var MSG = [];          // Meldungen für die Oberfläche
function note(t) { MSG.push(t); }

/* ---------- Grunddaten ---------- */
var RAR = {
  common:    { name: 'Gewöhnlich', min: 8,  max: 14, cap: 40, sell: 20,  pers: [1, 2], fame: 0,  lvW: [60, 32, 8] },
  rare:      { name: 'Selten',     min: 13, max: 20, cap: 55, sell: 60,  pers: [1, 3], fame: 6,  lvW: [45, 40, 15] },
  epic:      { name: 'Episch',     min: 19, max: 28, cap: 70, sell: 180, pers: [2, 4], fame: 18, lvW: [30, 45, 25] },
  legendary: { name: 'Legendär',   min: 27, max: 38, cap: 90, sell: 500, pers: [3, 4], fame: 45, lvW: [20, 40, 40] }
};
var RAR_KEYS = ['common', 'rare', 'epic', 'legendary'];
var STATS = [['str', 'Stärke'], ['spd', 'Tempo'], ['end', 'Ausdauer'], ['tec', 'Technik']];
var STAT_NAME = { str: 'Stärke', spd: 'Tempo', end: 'Ausdauer', tec: 'Technik' };

var TYPES = {
  Murmillo:  { b: { str: 1, spd: -2, end: 3, tec: 1 },  color: '#b8552f',
               d: 'Schwerer Schild und Fischhelm. Hält viel aus, ist aber langsam.',
               typ: [['1H', 'LW', 'SCU', 'SR'], ['1H', 'SW', 'SCU', 'SR']] },
  Retiarius: { b: { str: -1, spd: 3, end: -1, tec: 2 }, color: '#2f8f8a',
               d: 'Netz und Dreizack. Schnell und schwer zu treffen, kaum gepanzert.',
               typ: [['2H', 'LW', '–', 'LR'], ['2H', 'LW', '–', 'MR']] },
  Secutor:   { b: { str: 3, spd: 0, end: 1, tec: -1 },  color: '#6b7a3a',
               d: 'Der Jäger mit glattem Helm. Wuchtige Schläge, einfache Technik.',
               typ: [['1H', 'SW', 'SCU', 'MR'], ['DW', 'SW', '–', 'MR'], ['DW', 'SW', '–', 'SR']] },
  Thraex:    { b: { str: -1, spd: 1, end: 0, tec: 3 },  color: '#3f68b0',
               d: 'Krummschwert und kleiner Schild. Präzise, gut für kritische Treffer.',
               typ: [['1H', 'LW', 'PAR', 'MR'], ['1H', 'LW', 'PAR', 'LR']] }
};
var TYPE_KEYS = Object.keys(TYPES);

var CODES = {
  '1H': 'Einhändig: eine Waffe, Schild möglich',
  'DW': 'Doppelwaffe: zwei Angriffe pro Runde, kein Schild, ermüdet schnell',
  '2H': 'Beidhändig: mehr Schaden, kein Schild',
  'LW': 'Leichte Waffe: trifft öfter, mehr kritische Treffer, weniger Schaden',
  'SW': 'Schwere Waffe: viel Schaden, durchschlägt Rüstung, trifft seltener',
  '–': 'Kein Schild',
  'PAR': 'Parma: leichter Rundschild, blockt manchmal und kontert',
  'SCU': 'Scutum: schwerer Langschild, blockt oft und viel, bremst',
  'LR': 'Leichte Rüstung: Tempo und Ausweichen, kaum Schutz',
  'MR': 'Mittlere Rüstung: solider Schutz ohne Nachteile',
  'SR': 'Schwere Rüstung: starker Schutz, langsam, ermüdet schneller'
};
var EQ_LABEL = {
  grip: { '1H': 'Einhändig', 'DW': 'Doppelwaffe', '2H': 'Beidhändig' },
  weapon: { LW: 'Leichte Waffe', SW: 'Schwere Waffe' },
  shield: { '–': 'Kein Schild', PAR: 'Parma (leicht)', SCU: 'Scutum (schwer)' },
  armor: { LR: 'Leichte Rüstung', MR: 'Mittlere Rüstung', SR: 'Schwere Rüstung' }
};

var GEAR = {
  grip:   { '1H': { dmg: 1, att: 1, stam: 0, spd: 0 }, 'DW': { dmg: 0.6, att: 2, stam: 2, spd: 0 }, '2H': { dmg: 1.15, att: 1, stam: 1, spd: -1 } },
  weapon: { LW: { dmg: 0.92, hit: 0.09, crit: 0.08, pierce: 1, stam: 0 }, SW: { dmg: 1.15, hit: -0.09, crit: 0, pierce: 0.6, stam: 1 } },
  shield: { '–': { block: 0, red: 0, spd: 0, stam: 0, counter: 0 }, PAR: { block: 0.2, red: 0.33, spd: -1, stam: 0.5, counter: 0.25 }, SCU: { block: 0.35, red: 0.55, spd: -3, stam: 1.5, counter: 0 } },
  armor:  { LR: { red: 0.05, flat: 0, spd: 1, evade: 0.07, stam: 0 }, MR: { red: 0.17, flat: 0.8, spd: 0, evade: 0, stam: 1 }, SR: { red: 0.26, flat: 2, spd: -3, evade: -0.04, stam: 2.5 } }
};

var ALL_SPECS = (function () {
  var out = [];
  ['LW', 'SW'].forEach(function (w) {
    ['–', 'PAR', 'SCU'].forEach(function (s) { ['LR', 'MR', 'SR'].forEach(function (a) { out.push(['1H', w, s, a]); }); });
    ['LR', 'MR', 'SR'].forEach(function (a) { out.push(['DW', w, '–', a]); out.push(['2H', w, '–', a]); });
  });
  return out;
})();
function eqFrom(c) { return { grip: c[0], weapon: c[1], shield: c[0] === '1H' ? c[2] : '–', armor: c[3] }; }
function codeOf(eq) { return [eq.grip, eq.weapon, eq.shield, eq.armor]; }
function codeStr(eq) { return codeOf(eq).join(' · '); }
function isTypical(g) {
  var c = codeOf(g.eq).join('|');
  return TYPES[g.type].typ.some(function (t) { return t.join('|') === c; });
}
function randSpec(type) { return eqFrom(chance(0.6) ? pick(TYPES[type].typ) : pick(ALL_SPECS)); }
function gearOf(eq) { return { grip: GEAR.grip[eq.grip], weapon: GEAR.weapon[eq.weapon], shield: GEAR.shield[eq.shield], armor: GEAR.armor[eq.armor] }; }
