/*
 * Blutsand · Spiellogik · Ruhm des Ludus (Ränge) und Ruhm der Kämpfer
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
/* ---------- Ruhm, Ränge ---------- */
var RANKS = [
  { n: 'Hinterhof', min: 0, slots: 8, crowd: 8, unlock: '' },
  { n: 'Provinzarena', min: 20, slots: 12, crowd: 4, unlock: 'Neu: Bronzetruhe, Schwierigkeit Schwer, 12 Kaderplätze und dein erster Rivale.' },
  { n: 'Stadtarena', min: 60, slots: 18, crowd: 0, unlock: 'Neu: Goldtruhe, 18 Kaderplätze und eine neue Rivalin.' },
  { n: 'Große Arena', min: 150, slots: 24, crowd: -4, unlock: 'Neu: Ruhmestruhe, Meisterklasse, 24 Kaderplätze und ein neuer Rivale.' },
  { n: 'Kolosseum', min: 350, slots: 30, crowd: -8, unlock: 'Neu: 30 Kaderplätze. Der Meister des Kolosseums erwartet dich.' }
];
var FAME = ['Rekrut', 'Veteran', 'Champion', 'Legende'];
var FAME_MIN = [0, 10, 30, 80];
function rankIdx() { var r = 0; RANKS.forEach(function (x, i) { if (S.ruhm >= x.min) r = i; }); return r; }
function slotsMax() { return RANKS[rankIdx()].slots; }
function fameLevel(f) { f = f || 0; return f >= 80 ? 3 : f >= 30 ? 2 : f >= 10 ? 1 : 0; }
function capOf(g) { return RAR[g.rar].cap + [0, 5, 10, 15][fameLevel(g.fame)]; }
function power(g) { return g.str + g.spd + g.end + g.tec; }
function rarFor(p) { return p < 55 ? 'common' : p < 82 ? 'rare' : p < 115 ? 'epic' : 'legendary'; }

function addRuhm(n) {
  if (n <= 0) return;
  var before = rankIdx(); S.ruhm += n; var after = rankIdx();
  for (var r = before + 1; r <= after; r++) {
    var t = 'Dein Ludus steigt auf: ' + RANKS[r].n + '. ' + RANKS[r].unlock;
    chron('rang', t); note(t);
  }
}
function loseRuhm(n) { S.ruhm = Math.max(RANKS[rankIdx()].min, S.ruhm - n); }
function addFame(g, n) {
  var before = fameLevel(g.fame); g.fame = (g.fame || 0) + n; var after = fameLevel(g.fame);
  if (after > before) {
    var t = g.name + ' steigt zum ' + FAME[after] + ' auf. Obergrenze der Werte +' + [0, 5, 10, 15][after] + '.';
    if (after === 3) {
      var buffs = Object.keys(PERS).filter(function (k) { return PERS[k].k === 'buff' && !PERS[k].special; });
      for (var i = 0; i < 12; i++) { var id = pick(buffs); if (addPers(g, id, 1)) { t += ' Neue Persönlichkeit: ' + PERS[id].n + ' I.'; break; } }
    }
    chron('ruhm', t); note(t);
  }
}
