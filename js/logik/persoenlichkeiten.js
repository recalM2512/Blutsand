/*
 * Blutsand · Spiellogik · Persönlichkeiten mit Stufen I bis III
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
/* ---------- Persönlichkeiten ---------- */
var PERS = {
  jaehzornig:     { n: 'Jähzornig', k: 'mixed', m: function (v) { return { dmg: v, tec: -v * 1.5 }; } },
  kaltbluetig:    { n: 'Kaltblütig', k: 'mixed', m: function (v) { return { crit: v * 0.6, block: -v * 0.8 }; } },
  unerschrocken:  { n: 'Unerschrocken', k: 'buff', m: function (v) { return { c_weaker: v * 1.4 }; } },
  feige:          { n: 'Feige', k: 'debuff', m: function (v) { return { c_low: v * 1.6 }; } },
  eitel:          { n: 'Eitel', k: 'mixed', m: function (v) { return { ruhm: v * 4, taken: v }; } },
  fleissig:       { n: 'Fleißig', k: 'buff', m: function (v) { return { train: -v * 1.4 }; } },
  faul:           { n: 'Faul', k: 'debuff', m: function (v) { return { train: v * 1.4 }; } },
  rachsuechtig:   { n: 'Rachsüchtig', k: 'buff', m: function (v) { return { c_nem: v * 1.6 }; } },
  liebling:       { n: 'Publikumsliebling', k: 'buff', m: function (v) { return { gnade: v * 100 }; } },
  langweiler:     { n: 'Langweiler', k: 'debuff', m: function (v) { return { gnade: -v * 100 }; } },
  zaeh:           { n: 'Zäh', k: 'buff', m: function (v) { return { hp: v * 1.2 }; } },
  flink:          { n: 'Flink', k: 'buff', m: function (v) { return { spd: Math.round(v * 30) }; } },
  ungeschickt:    { n: 'Ungeschickt', k: 'debuff', m: function (v) { return { hit: -v * 0.6 }; } },
  gierig:         { n: 'Gierig', k: 'mixed', m: function (v) { return { prize: v * 2, tec: -v }; } },
  streitsuechtig: { n: 'Streitsüchtig', k: 'mixed', m: function (v) { return { dmg: v * 0.6, streit: 1 }; } },
  ausdauernd:     { n: 'Ausdauernd', k: 'buff', m: function (v) { return { stam: -v * 2.5 }; } },
  trauernd:       { n: 'Trauernd', k: 'debuff', special: true, m: function (v) { return { dmg: -v, hit: -v * 0.5 }; } }
};
var PERS_EXCL = [['unerschrocken', 'feige'], ['fleissig', 'faul'], ['liebling', 'langweiler']];
var LV = [0, 0.05, 0.10, 0.15];
var ROMAN = ['', 'I', 'II', 'III'];
var FX_TXT = {
  dmg: ['Schaden', '%'], tec: ['Technik', '%'], crit: ['Krit-Chance', '%'], block: ['Blockchance', '%'],
  c_weaker: ['Schaden gegen stärkere Gegner', '%'], c_low: ['Schaden unter 30 % Leben', '%', -1],
  ruhm: ['Ruhm pro Sieg', '%'], taken: ['erlittener Schaden', '%'], train: ['Trainingskosten', '%'],
  c_nem: ['Schaden gegen Nemesis', '%'], gnade: ['Gnade-Chance', 'pt'], hp: ['Leben', '%'],
  spd: ['Tempo', 'n'], hit: ['Trefferchance', '%'], prize: ['Siegprämie', '%'], stam: ['Ausdauerverbrauch', '%']
};
function persEffect(p) {
  var m = PERS[p.id].m(LV[p.lv]), parts = [];
  for (var k in m) {
    var t = FX_TXT[k]; if (!t) continue;
    var v = m[k] * (t[2] || 1), s;
    if (t[1] === 'n') s = (v > 0 ? '+' : '−') + Math.abs(v);
    else if (t[1] === 'pt') s = (v > 0 ? '+' : '−') + Math.round(Math.abs(v)) + ' %';
    else s = (v > 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + ' %';
    parts.push(s + ' ' + t[0]);
  }
  if (p.id === 'streitsuechtig') parts.push('löst öfter Streit aus');
  if (p.ttl) parts.push('noch ' + p.ttl + ' Kämpfe');
  return parts.join(', ');
}
function hasP(g, id) { return (g.pers || []).some(function (p) { return p.id === id; }); }
function persConflict(list, id) {
  if (list.some(function (p) { return p.id === id; })) return true;
  return PERS_EXCL.some(function (pair) {
    return pair.indexOf(id) >= 0 && list.some(function (p) { return p.id !== id && pair.indexOf(p.id) >= 0; });
  });
}
function rollLv(rar) {
  var w = RAR[rar].lvW, r = rng() * 100;
  return r < w[0] ? 1 : r < w[0] + w[1] ? 2 : 3;
}
function persNet(list) {
  return list.reduce(function (s, p) { var k = PERS[p.id].k; return s + (k === 'buff' ? 1 : k === 'debuff' ? -1 : 0); }, 0);
}
function genPers(rar) {
  var R = RAR[rar], keys = Object.keys(PERS).filter(function (k) { return !PERS[k].special; }), out = [];
  for (var tries = 0; tries < 40; tries++) {
    var n = rnd(R.pers[0], R.pers[1]), pool = keys.slice();
    out = [];
    while (out.length < n && pool.length) {
      var k = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      if (persConflict(out, k)) continue;
      out.push({ id: k, lv: rollLv(rar) });
    }
    var net = persNet(out);
    if (rar === 'legendary' && net < 1) continue;
    if (rar === 'epic' && net < 0) continue;
    break;
  }
  return out;
}
function corePersCount(g) { return g.pers.filter(function (p) { return !PERS[p.id].special; }).length; }
function addPers(g, id, lv, ttl) {
  if (persConflict(g.pers, id)) return false;
  if (!PERS[id].special && corePersCount(g) >= 4) return false;
  var p = { id: id, lv: lv }; if (ttl) p.ttl = ttl;
  g.pers.push(p); return true;
}
function fxOf(g) {
  var fx = { dmg: 0, hit: 0, crit: 0, block: 0, taken: 0, spd: 0, tec: 0, hp: 0, stam: 0, train: 0, prize: 0, ruhm: 0, gnade: 0, c_weaker: 0, c_low: 0, c_nem: 0, streit: 0 };
  (g.pers || []).forEach(function (p) { var m = PERS[p.id].m(LV[p.lv]); for (var k in m) fx[k] += m[k]; });
  return fx;
}
