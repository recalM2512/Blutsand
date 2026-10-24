/*
 * Blutsand · Oberfläche · Ludus (Trainingszentrum)
 * Kämpfer auswählen, an vier Stationen trainieren, in der Waffenkammer mit Live-Vorschau umrüsten,
 * in der Schmiede verbessern und verletzte Kämpfer heilen.
 */
var STATIONEN = [
  { k: 'str', name: 'Der Pfahl', desc: 'Schläge gegen den Holzpfahl, bis die Arme brennen.', verb: 'schlägt auf den Pfahl ein', icon: 'M16 4 V28 M9 28 H23 M9 11 H23 M12 7 L20 15' },
  { k: 'spd', name: 'Die Laufbahn', desc: 'Sprints durch den tiefen Sand des Hofes.', verb: 'sprintet durch den Sand', icon: 'M5 16 C5 9 27 9 27 16 C27 23 5 23 5 16 Z M20 9 L24 6 M20 9 L23 12' },
  { k: 'end', name: 'Steine schleppen', desc: 'Schwere Lasten im Kreis über den Hof tragen.', verb: 'schleppt Steine über den Hof', icon: 'M6 18 H26 V27 H6 Z M10 18 V13 H22 V18 M13 13 V8 H19 V13' },
  { k: 'tec', name: 'Beim Doctor', desc: 'Finten und Paraden mit dem alten Ausbilder.', verb: 'übt Finten mit dem Doctor', icon: 'M6 26 L22 10 M22 10 L26 6 M10 10 L26 26 M10 10 L6 6 M5 21 L11 27 M21 27 L27 21' }
];
var KAMMER = [['grip', 'GRIFF'], ['weapon', 'WAFFE'], ['shield', 'SCHILD'], ['armor', 'RÜSTUNG']];

function ludusKaempfer() { fixSelection(); return byId(S.sel) || S.roster[0]; }
function meldeLudus(t) {
  ui.meldung = t;
  var m = $('#lMeldung'); m.textContent = t; m.hidden = false; neuStarten(m, 'meldung');
  clearTimeout(ui.meldungT); ui.meldungT = setTimeout(function () { ui.meldung = ''; m.hidden = true; }, 6000);
}

ANSICHT.ludus = function () {
  var g = ludusKaempfer(); if (!g) return;
  if (ui.probe && ui.probe.gid !== g.id) ui.probe = null;
  var eq = ui.probe ? ui.probe.eq : g.eq, gg = ui.probe ? Object.assign({}, g, { eq: eq }) : g;
  var fl = fameLevel(g.fame), cap = capOf(g), busy = istBeschaeftigt(g);

  // Seitenleiste
  $('#lWahl').innerHTML = S.roster.slice().sort(function (a, b) { return power(b) - power(a); }).map(function (x) {
    return '<button class="r-' + x.rar + '" data-act="lwahl" data-id="' + x.id + '" aria-pressed="' + (x.id === g.id) + '">' +
      figSVG(x, { vb: '40 0 160 290', ground: false, deko: true }) +
      '<span style="min-width:0"><strong>' + esc(x.name) + '</strong><small>' + x.type + ' · ' + RAR[x.rar].name + '</small></span>' +
      '<span class="kr">' + power(x) + (x.inj ? '<em>VERLETZT</em>' : '') + '</span></button>';
  }).join('');

  // Trainingshof
  var moralFx = Math.round((g.moral - 50) / 50 * 6);
  $('#lInfo').innerHTML = '<h2>' + esc(g.name) + '</h2>' +
    '<p class="meta">' + g.type + ' · <b class="selt r-' + g.rar + '">' + RAR[g.rar].name + '</b> · ' + FAME[fl] + ' (' + (g.fame || 0) + ' Ruhm' + (fl < 3 ? ', ' + FAME[fl + 1] + ' ab ' + FAME_MIN[fl + 1] : '') + ')</p>' +
    persChips(g, false) +
    '<div class="moral' + (g.moral < 40 ? ' tief' : '') + '"><span>MORAL</span><div class="balken" role="img" aria-label="Moral ' + g.moral + ' von 100"><i style="width:' + g.moral + '%"></i></div><b>' + g.moral + '</b></div>' +
    '<p class="hinweis">Moral wirkt im Kampf: ' + (moralFx >= 0 ? '+' : '−') + Math.abs(moralFx) + ' % Schaden und Treffer.</p>' +
    statusMarken(g) + aufstiegBoxHTML(g) +
    (g.inj ? '<div class="knopfreihe"><button class="knopf" data-act="heal" data-id="' + g.id + '"' + (S.gold < healCost(g) ? ' disabled' : '') + '>Heiler rufen · ' + healCost(g) + ' Den.</button></div>' : '');

  var key = [g.id, codeStr(eq), g.rar, g.skin, g.inj ? 1 : 0, g.scars, ui.view3d, g.lv.s, ui.probe ? 1 : 0].join('|');
  if (key !== ui.figKey) {
    ui.figKey = key;
    var box = $('#lFig');
    if (ui.view3d) mount3D(box, gg);
    else { stop3D(); box.innerHTML = figSVG(gg, { spark: true, ground: false }); }
  }
  $('#lVorschau').hidden = !ui.probe;
  $('#b2d').setAttribute('aria-pressed', String(!ui.view3d)); $('#b3d').setAttribute('aria-pressed', String(ui.view3d));

  $('#lKraft').innerHTML = '<span>KRAFT</span><b>' + power(g) + '</b>' + codeChips(g, true, eq) +
    (isTypical(gg) ? '<small style="color:var(--gold-h)">★ Meisterschaft</small>' : '') +
    '<small>Leben ' + maxLeben(g) + ' · ' + g.wins + ' Siege</small>';

  var m = $('#lMeldung'); m.hidden = !ui.meldung; if (ui.meldung) m.textContent = ui.meldung;

  // Trainingsplatz
  $('#lGrenze').textContent = 'Obergrenze ' + cap + ' pro Wert (' + RAR[g.rar].name + ', ' + FAME[fl] + ')' + (fxOf(g).train ? ' · Training ' + (fxOf(g).train < 0 ? 'günstiger' : 'teurer') + ' durch Persönlichkeit' : '');
  var st = $('#lStationen'); st.className = 'stationen r-' + g.rar;
  st.innerHTML = STATIONEN.map(function (x) {
    var v = g[x.k], c = trainCost(g, x.k), voll = v >= cap;
    return '<div class="station"><div class="kopf-s"><svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="' + x.icon + '" fill="none" stroke="#7a4a14" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<div style="min-width:0"><h3>' + x.name + '</h3><div class="wertname">' + STAT_NAME[x.k].toUpperCase() + '</div></div></div>' +
      '<p>' + x.desc + '</p>' +
      '<div class="stand"><div class="balken" role="img" aria-label="' + STAT_NAME[x.k] + ' ' + v + ' von ' + cap + '"><i style="width:' + Math.round(v / cap * 100) + '%"></i></div><b>' + v + ' / ' + cap + '</b></div>' +
      (voll ? '<button class="knopf" disabled>Maximum erreicht</button>' :
        '<button class="knopf" data-act="train" data-stat="' + x.k + '"' + (S.gold < c ? ' disabled' : '') + '>Trainieren +1 · ' + fmt(c) + ' Den.</button>') +
      '</div>';
  }).join('');

  // Waffenkammer
  var cost = ui.probe ? reequipCost(g, eq) : 0;
  var rows = KAMMER.map(function (r) {
    var slot = r[0], opts = Object.keys(EQ_LABEL[slot]);
    return '<div class="eq-zeile"><span id="kl-' + slot + '">' + r[1] + '</span><div class="segment mono" role="group" aria-labelledby="kl-' + slot + '">' + opts.map(function (o) {
      var aus = slot === 'shield' && eq.grip !== '1H' && o !== '–';
      return '<button data-act="probe" data-slot="' + slot + '" data-v="' + o + '" aria-pressed="' + (eq[slot] === o) + '" title="' + esc(CODES[o]) + '"' + (aus || busy ? ' disabled' : '') + '>' + o + '</button>';
    }).join('') + '</div></div>';
  }).join('');
  var info;
  if (busy) info = '<p>' + esc(g.name) + ' wartet auf das Urteil der Arena. Umrüsten ist erst danach möglich.</p>';
  else if (!ui.probe) {
    info = '<p>Aktuell: <b>' + codeStr(g.eq) + '</b>' + (isTypical(g) ? ' ★' : '') + '. ' +
      (isTypical(g) ? 'Meisterschaft: Diese Ausrüstung ist typisch für den ' + g.type + ' (+4 % Schaden und Treffer).' : 'Typisch für den ' + g.type + ' wäre: ' + TYPES[g.type].typ.map(function (t) { return t.join(' · '); }).join(' oder ') + '.') + '</p>';
  } else {
    info = '<p>Neu: <b>' + codeStr(eq) + '</b>' + (isTypical(gg) ? ' ★' : '') + ' · Kosten <b>' + fmt(cost) + ' Den.</b> · 3 Kämpfe Eingewöhnung (−8 % Schaden und Treffer). Geänderte Teile verlieren ihre Schmiedestufe.</p>' +
      '<div class="knopfreihe"><button class="knopf" data-act="probeOk"' + (S.gold < cost ? ' disabled' : '') + '>Umrüsten · ' + fmt(cost) + ' Den.</button><button class="knopf rand" data-act="probeWeg">Verwerfen</button></div>';
  }
  $('#lKammer').innerHTML = rows + '<div class="kammer-info">' + info + '</div>';

  // Schmiede
  $('#lSchmiede').innerHTML = ['w', 'a', 's'].map(function (sl) {
    var keins = sl === 's' && g.eq.shield === '–', l = g.lv[sl], c = smithCost(g, sl), pips = '';
    for (var i = 0; i < 5; i++) pips += '<i' + (i < l ? ' class="an"' : '') + '></i>';
    var btn = keins ? '<button class="knopf rand klein" disabled>Kein Schild</button>' : c == null ? '<button class="knopf rand klein" disabled>Maximum</button>' :
      '<button class="knopf rand klein" data-act="smith" data-slot="' + sl + '"' + (S.gold < c ? ' disabled' : '') + '>+1 · ' + fmt(c) + ' Den.</button>';
    return '<div class="schmiede-zeile"><span>' + SMITH_SLOT[sl].toUpperCase() + '</span><div class="pips" role="img" aria-label="' + SMITH_SLOT[sl] + ' Stufe ' + l + ' von 5">' + pips + '</div>' + btn + '</div>';
  }).join('') + '<p class="hinweis">Waffe ' + SMITH_FX.w + ', Rüstung ' + SMITH_FX.a + ', Schild ' + SMITH_FX.s + '.</p>';
};

AKT.lwahl = function (el) { S.sel = el.dataset.id; ui.probe = null; save(); ANSICHT.ludus(); };
AKT.v2d = function () { ui.view3d = false; ANSICHT.ludus(); };
AKT.v3d = function () { ui.view3d = true; ANSICHT.ludus(); };
AKT.train = function (el) {
  var g = ludusKaempfer(), k = el.dataset.stat, vor = g[k], r = train(g, k);
  if (r === 'gold') toast('Nicht genug Denare.');
  else if (r === 'cap') toast('Dieser Wert hat seine Obergrenze erreicht.');
  else {
    var st = STATIONEN.filter(function (x) { return x.k === k; })[0];
    meldeLudus(g.name + ' ' + st.verb + ': ' + STAT_NAME[k] + ' ' + vor + ' → ' + g[k] + '.');
  }
  save(); renderKopf(); ANSICHT.ludus();
};
AKT.probe = function (el) {
  var g = ludusKaempfer(), cur = ui.probe ? ui.probe.eq : g.eq, eq = Object.assign({}, cur);
  eq[el.dataset.slot] = el.dataset.v; eq = normEq(eq);
  ui.probe = reequipCost(g, eq) ? { gid: g.id, eq: eq } : null;
  ANSICHT.ludus();
};
AKT.probeWeg = function () { ui.probe = null; ANSICHT.ludus(); };
AKT.probeOk = function () {
  var g = ludusKaempfer(); if (!ui.probe) return;
  var r = reequip(g, ui.probe.eq);
  if (r === 'gold') { toast('Nicht genug Denare.'); return; }
  if (r === 'ok') { ui.probe = null; ui.estKey = ''; meldeLudus(g.name + ' ist umgerüstet: ' + codeStr(g.eq) + '. Drei Kämpfe Eingewöhnung.'); }
  save(); renderKopf(); ANSICHT.ludus();
};
AKT.smith = function (el) {
  var g = ludusKaempfer(), sl = el.dataset.slot, r = smith(g, sl);
  if (r === 'gold') toast('Nicht genug Denare.');
  else if (r === 'ok') meldeLudus('Die Schmiede verbessert ' + (sl === 'w' ? 'die Waffe' : sl === 'a' ? 'die Rüstung' : 'den Schild') + ' von ' + g.name + ' auf Stufe ' + g.lv[sl] + '.');
  ui.figKey = ''; ui.estKey = '';
  save(); renderKopf(); ANSICHT.ludus();
};
AKT.heal = function (el) {
  var g = byId(el.dataset.id); if (!g) return;
  var r = heal(g);
  if (r === 'gold') toast('Nicht genug Denare.');
  else if (r === 'ok') { if (ui.tab === 'ludus') meldeLudus('Der Heiler versorgt ' + g.name + '. Er ist wieder kampfbereit.'); else toast(g.name + ' ist geheilt.'); }
  ui.figKey = '';
  save(); renderAll();
};
