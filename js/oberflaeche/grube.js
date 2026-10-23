/*
 * Blutsand · Oberfläche · Grube
 * Die vier Story-Rivalen und die Grubenrangliste mit Nemesis-Kämpfern.
 */
ANSICHT.grube = function () {
  var r = rankIdx();
  $('#gRivalen').innerHTML = RIVALS.map(function (R) {
    var offen = r >= R.rank, st = rivalState(R.id), f = rivalFighter(R.id);
    return '<div class="rivale' + (offen ? '' : ' gesperrt') + '">' + figSVG(f, { crop: true, ground: false, deko: true }) + '<div>' +
      '<h3>' + esc(R.name) + '</h3><p class="titelzeile">„' + esc(R.title) + '“</p><p>' + esc(R.intro) + '</p>' +
      codeChips(f, true) + persChips(f, false) +
      '<p class="hinweis">Kraft <b>' + power(f) + '</b> · ' + (st.beaten ? 'Besiegt ×' + st.beaten : 'Noch unbesiegt') + (st.lost ? ' · ' + st.lost + '× gegen ihn verloren' : '') + '</p>' +
      '<div class="knopfreihe">' + (offen ? '<button class="knopf klein" data-act="target" data-kind="rival" data-id="' + R.id + '">Herausfordern</button>' : '<span class="marke">Ab ' + RANKS[R.rank].n + '</span>') + '</div></div></div>';
  }).join('');
  $('#gRangliste').innerHTML = S.ladder.map(function (f, i) {
    return '<div class="rang-zeile' + (f.nemesis ? ' nem' : '') + '"><span class="platz">' + roemisch(i + 1) + '</span>' + figSVG(f, { vb: '40 0 160 290', ground: false, deko: true }) +
      '<div class="wer"><strong>' + esc(f.name) + '</strong>' + (f.title ? '<span class="titelzeile">„' + esc(f.title) + '“</span>' : '') +
      '<div class="chips">' + (f.nemesis ? '<span class="marke rot">Nemesis</span>' : '') + '<span class="marke">' + f.type + '</span></div>' + codeChips(f, true) + persChips(f, !f.scouted) + '</div>' +
      '<div class="kraft">' + power(f) + '<small>Kraft</small><small>' + (f.wins || 0) + ' : ' + (f.losses || 0) + ' gegen dich</small></div>' +
      '<div class="knopfreihe"><button class="knopf klein" data-act="target" data-kind="ladder" data-id="' + f.id + '">Herausfordern</button>' +
      (f.scouted ? '' : '<button class="knopf rand klein" data-act="scoutL" data-id="' + f.id + '"' + (S.gold < SCOUT_COST ? ' disabled' : '') + '>Späher · ' + SCOUT_COST + ' Den.</button>') + '</div></div>';
  }).join('');
};
AKT.scoutL = function (el) {
  var f = ladderById(el.dataset.id); if (!f || S.gold < SCOUT_COST) { toast('Nicht genug Denare.'); return; }
  S.gold -= SCOUT_COST; f.scouted = true; save(); renderAll();
};
