/*
 * Blutsand · Spiellogik · Grubenrangliste und Nemesis-System
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
/* ---------- Rangliste und Nemesis ---------- */
function sortLadder() { S.ladder.sort(function (a, b) { return power(b) - power(a); }); }
function ladderById(id) { return S.ladder.filter(function (f) { return f.id === id; })[0]; }
function ladderPlace(id) { for (var i = 0; i < S.ladder.length; i++) if (S.ladder[i].id === id) return i + 1; return 0; }
function trimLadder() {
  while (S.ladder.length > 8) {
    sortLadder();
    var weak = S.ladder.slice().reverse().filter(function (f) { return !f.nemesis; })[0] || S.ladder[S.ladder.length - 1];
    S.ladder = S.ladder.filter(function (f) { return f !== weak; });
  }
  sortLadder();
}
/* Neue Grubenkämpfer kommen aus der eigenen Liga und sind etwas härter als normale Arena-Gegner. */
function refillLadder() {
  while (S.ladder.length < 8) S.ladder.push(ligaRohling(rankIdx(), 1.1));
  sortLadder();
}
function cleanFoe(f) {
  var c = JSON.parse(JSON.stringify(f));
  if (c.id.charAt(0) !== 'f') c.id = 'f' + uid();
  c.inj = 0; c.tmp = [];
  return c;
}
function makeNemesis(foe, title) {
  if (foe.rival) return null;
  var L = ladderById(foe.id);
  if (!L) { L = cleanFoe(foe); S.ladder.push(L); }
  var fresh = !L.nemesis;
  L.nemesis = true; L.scouted = L.scouted || false;
  if (!L.title || /Schlächter/.test(title)) L.title = title;
  L.grudge = (L.grudge || 0) + 1;
  trimLadder();
  var t = fresh ? L.name + ' wird zu deinem Nemesis: „' + L.title + '“.' : L.name + ' trägt jetzt den Titel „' + L.title + '“.';
  chron('nemesis', t); note(t);
  return L;
}
function growFoe(f, n) { for (var i = 0; i < n; i++) { var k = pick(STATS)[0]; f[k]++; } f.rar = rarFor(power(f)); }
