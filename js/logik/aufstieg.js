/*
 * Blutsand · Spiellogik · Aufstieg in die nächste Seltenheit
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 *
 * Ein Kämpfer mit genug Ruhm darf einen Aufstiegskampf gegen einen Prüfer bestreiten.
 * Gewinnt er, steigt er eine Seltenheit auf (höhere Wertegrenze, alle Werte +3, manchmal eine neue Persönlichkeit).
 * Verliert er, darf er es nach 3 Kämpfen erneut versuchen. Der Aufstiegskampf ist kein Kampf auf Leben und Tod.
 */
var AUFSTIEG = {
  common: { ziel: 'rare', stufe: 1 },     // ab Veteran
  rare: { ziel: 'epic', stufe: 2 },       // ab Champion
  epic: { ziel: 'legendary', stufe: 3 }   // ab Legende
};
var PRUEF_KRAFT = { rare: 72, epic: 110, legendary: 150 };   // feste Stärke des Prüfers, wächst nicht mit deinem Kämpfer
var PRUEF_SPERRE = 3;

function aufstiegInfo(g) {
  var A = AUFSTIEG[g.rar];
  if (!A) return { ende: true, bereit: false, grund: 'Höchste Seltenheit erreicht.' };
  var genug = fameLevel(g.fame) >= A.stufe, sperre = (g.pruefSperre || 0) > S.fights;
  var busy = !!(S.match && S.match.gid === g.id && S.match.stage !== 'done');
  var grund = !genug ? 'Möglich ab ' + FAME[A.stufe] + ' (' + FAME_MIN[A.stufe] + ' Ruhm, jetzt ' + (g.fame || 0) + ').' :
    sperre ? 'Neuer Versuch ab Kampf ' + g.pruefSperre + ' (jetzt ' + S.fights + ').' :
    g.inj ? 'Erst muss er gesund werden.' : busy ? 'Er wartet noch auf ein Urteil.' : 'Bereit für den Aufstiegskampf.';
  return { ziel: A.ziel, bereit: genug && !sperre && !g.inj && !busy, grund: grund, genug: genug };
}
/* Der Prüfer bleibt gespeichert, damit Neuladen keinen leichteren Gegner bringt. */
function pruefer(g) {
  var A = AUFSTIEG[g.rar]; if (!A) return null;
  if (S.pruefung && S.pruefung.gid === g.id && S.pruefung.ziel === A.ziel) return S.pruefung.foe;
  var f = makeFoe(PRUEF_KRAFT[A.ziel]);
  f.rar = A.ziel; f.fame = RAR[A.ziel].fame; f.pers = genPers(A.ziel); f.scouted = true;
  f.title = 'Prüfer der Lanisten-Gilde'; f.pruefer = true;
  S.pruefung = { gid: g.id, ziel: A.ziel, foe: f };
  return f;
}
function aufsteigen(g) {
  var alt = g.rar, A = AUFSTIEG[alt]; if (!A) return '';
  g.rar = A.ziel;
  STATS.forEach(function (s) { g[s[0]] = Math.min(capOf(g), g[s[0]] + 3); });
  var t = g.name + ' besteht die Prüfung und steigt auf: ' + RAR[alt].name + ' → ' + RAR[A.ziel].name + '. Alle Werte +3, neue Obergrenze ' + capOf(g) + '.';
  if (corePersCount(g) < RAR[A.ziel].pers[1] && chance(0.5)) {
    var buffs = Object.keys(PERS).filter(function (k) { return PERS[k].k === 'buff' && !PERS[k].special; });
    for (var i = 0; i < 12; i++) { var id = pick(buffs); if (addPers(g, id, 1)) { t += ' Neue Persönlichkeit: ' + PERS[id].n + ' I.'; break; } }
  }
  g.moral = clamp(g.moral + 10, 0, 100);
  chron('ruhm', t);
  return t;
}
/* Wird von runMatch aufgerufen, wenn ein Aufstiegskampf vorbei ist. */
function pruefungAuswerten(m, g) {
  S.pruefung = null;
  if (m.win) { m.aufgestiegen = { von: g.rar, nach: AUFSTIEG[g.rar] ? AUFSTIEG[g.rar].ziel : g.rar }; m.msgs.push(aufsteigen(g)); }
  else {
    g.pruefSperre = S.fights + PRUEF_SPERRE;
    m.msgs.push(g.name + ' besteht die Prüfung nicht. Ein neuer Versuch ist ab Kampf ' + g.pruefSperre + ' möglich.');
    chron('info', g.name + ' scheitert im Aufstiegskampf.');
  }
}
