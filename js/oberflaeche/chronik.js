/*
 * Blutsand · Oberfläche · Chronik
 * Zahlen des Ludus, Gedenksteine der Gefallenen und das Ereignisbuch.
 */
ANSICHT.chronik = function () {
  var nem = S.ladder.filter(function (f) { return f.nemesis; }).length;
  $('#cZahlen').innerHTML = [['KÄMPFE', S.fights], ['SIEGE', S.wins], ['NIEDERLAGEN', S.losses], ['GEFALLENE', S.dead.length], ['NEMESES', nem], ['RANG', RANKS[rankIdx()].n]]
    .map(function (x) { return '<div><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('');
  $('#cGraeber').innerHTML = S.dead.length ? S.dead.map(function (d) {
    return '<div class="grab"><strong>' + esc(d.name) + '</strong>' + d.type + ' · ' + RAR[d.rar].name + ' · ' + esc(d.code) + '<br>' + d.wins + ' Siege · ' + FAME[fameLevel(d.fame)] + '<br>Gefallen in Kampf ' + d.f + ' durch ' + esc(d.by) + '</div>';
  }).join('') : '<p class="hinweis">Noch ist keiner deiner Kämpfer gefallen.</p>';
  $('#cListe').innerHTML = S.chron.map(function (c) { return '<li class="' + c.k + '"><span>KAMPF ' + c.f + '</span><div>' + esc(c.t) + '</div></li>'; }).join('');
};
