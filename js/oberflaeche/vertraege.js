/*
 * Blutsand · Oberfläche · Verträge (Kisten öffnen)
 * Ablauf: Kiste wählen → Kiste wackelt und springt auf → fünf versiegelte Verträge fliegen heraus →
 * je nach Kiste 1, 2 oder 3 wählen → unterzeichnen (erst jetzt kommen die Kämpfer in den Kader) →
 * Siegel brechen: Das Siegel glüht in der Farbe der Seltenheit, bei Episch und Legendär folgt ein Walkout.
 * Die Karten werden über Klassen umgeschaltet statt neu gezeichnet, damit Dreh- und Glüheffekte flüssig bleiben.
 */
var VT_TITEL = { wahl: 'Wähle eine Kiste', oeffnen: 'Die Kiste öffnet sich …', austeilen: 'Fünf Verträge', zug: '', aufdecken: 'Brich die Siegel', fertig: 'Neue Kämpfer unterzeichnet' };

function vtNeu() { return { phase: 'wahl', id: null, n: 0, list: [], picks: [], deckel: false, weg: false, gedreht: {}, glut: -1, walk: null, timers: [] }; }
function vtSpaeter(fn, ms) { var v = ui.vt; v.timers.push(setTimeout(function () { if (ui.vt === v) fn(); }, REDUCE ? Math.min(ms, 150) : ms)); }
function vtStopp() { if (ui.vt) { ui.vt.timers.forEach(clearTimeout); ui.vt.timers = []; } }
function vtPack(id) { return PACKS.filter(function (p) { return p.id === id; })[0]; }

function kisteHTML(farbe, cls) {
  return '<span class="kiste' + (cls ? ' ' + cls : '') + '" style="--holz:' + farbe + '" aria-hidden="true"><span class="deckel"></span>' +
    '<span class="koerper"><span class="band" style="left:18px"></span><span class="band" style="right:18px"></span><span class="schloss"></span></span></span>';
}
function vtHinweis() {
  var v = ui.vt, p = v.id ? vtPack(v.id) : null;
  return {
    wahl: 'Jede Kiste enthält fünf versiegelte Verträge. Wie viele du unterzeichnen darfst, hängt von der Kiste ab.',
    oeffnen: p ? p.desc : '',
    austeilen: 'Die Verträge sind noch versiegelt. Niemand weiß, wer dahinter steckt.',
    zug: v.picks.length + ' von ' + v.n + ' gewählt. Die übrigen Verträge verfallen.',
    aufdecken: 'Fahre über einen Vertrag: Das Siegel schimmert in der Farbe seiner Seltenheit. Tippe, um es zu brechen.',
    fertig: 'Deine neuen Kämpfer warten im Kader.'
  }[v.phase];
}
function vtKopf() {
  var v = ui.vt;
  $('#vtTitel').textContent = v.phase === 'zug' ? 'Wähle ' + v.n + ' von 5 Verträgen' : VT_TITEL[v.phase];
  $('#vtHinweis').textContent = vtHinweis();
}
function vtKarte(g, i) {
  var v = ui.vt, cls = 'ct', picked = v.picks.indexOf(i) >= 0, style = '';
  if (v.phase === 'austeilen') { cls += ' fliegen'; style = 'animation-delay:' + (i * 130) + 'ms'; }
  if (v.phase === 'zug') cls += ' waehlbar' + (picked ? ' gewaehlt' : v.picks.length >= v.n ? ' blass' : '');
  var offen = v.phase === 'aufdecken' || v.phase === 'fertig';
  if (offen) {
    if (!picked) cls += v.weg ? ' weg' : ' verbrennen';
    else { cls += ' gewaehlt'; if (v.gedreht[i]) cls += ' gedreht'; else if (!v.walk) cls += ' bereit'; style = '--glow:' + GLOW[g.rar]; }
  }
  var label = v.phase === 'zug' ? (picked ? 'Vertrag ' + (i + 1) + ' abwählen' : 'Vertrag ' + (i + 1) + ' wählen') :
    v.gedreht[i] ? g.name + ', ' + RAR[g.rar].name + ', ' + g.type : 'Siegel von Vertrag ' + (i + 1) + ' brechen';
  var vorne = offen && picked ? karteHTML(g, { pers: true, ohneStatus: true }) : '';
  return '<button class="' + cls + '" style="' + style + '" data-act="ctklick" data-i="' + i + '" aria-label="' + esc(label) + '"' + (v.phase === 'oeffnen' || v.phase === 'austeilen' ? ' tabindex="-1"' : '') + '>' +
    '<span class="ct-in"><span class="ct-seite ct-rueck"><span class="vt-titel">VERTRAG</span><span class="linien"><i></i><i style="width:86%"></i><i style="width:94%"></i><i style="width:70%"></i><i style="width:90%"></i></span>' +
    '<span class="siegel">B</span><small>LUDUS BLUTSAND</small></span>' +
    '<span class="ct-seite ct-vorne">' + vorne + '</span></span></button>';
}
function vtKnoepfeHTML() {
  var v = ui.vt;
  if (v.phase === 'zug') return '<button class="knopf" data-act="vtsiegeln"' + (v.picks.length === v.n ? '' : ' disabled') + '>Verträge unterzeichnen</button>';
  if (v.phase === 'aufdecken') return '<button class="knopf rand" data-act="vtalle"' + (v.walk || v.glut >= 0 ? ' disabled' : '') + '>Alle Siegel brechen</button>';
  if (v.phase === 'fertig') return '<button class="knopf" data-act="vtkader">Zum Kader</button><button class="knopf rand" data-act="vtneu">Neue Kiste öffnen</button>';
  return '';
}

ANSICHT.vertraege = function () {
  if (!ui.vt) ui.vt = vtNeu();
  var v = ui.vt;
  if (S.pendingPack && v.phase === 'wahl') { v.phase = 'zug'; v.id = S.pendingPack.id; v.n = S.pendingPack.n; v.list = S.pendingPack.contracts; v.picks = []; }
  if (!S.pendingPack && v.phase === 'zug') { ui.vt = vtNeu(); v = ui.vt; }
  vtKopf();
  var b = $('#vtBuehne'), r = rankIdx(), html = '';
  if (v.phase === 'wahl') {
    html = '<div class="truhen">' + PACKS.map(function (p) {
      var gesperrt = r < p.rank, voll = S.roster.length + p.n > slotsMax(), arm = S.gold < p.price;
      var unten = gesperrt ? '<span class="sperre">Ab ' + RANKS[p.rank].n + '</span>' : voll ? '<span class="sperre">Zu wenige Kaderplätze</span>' :
        '<span class="preis">ÖFFNEN · ' + fmt(p.price) + ' DEN.</span>';
      return '<button class="truhe" style="--holz:' + p.color + '" data-act="vtkiste" data-id="' + p.id + '"' + (gesperrt || voll || arm ? ' disabled' : '') + '>' +
        kisteHTML(p.color) + '<h3>' + p.name + '</h3><p>Wähle <b>' + p.n + ' von 5</b> Verträgen</p><p>' + esc(p.desc) + '</p><p class="quoten">' + esc(p.odds) + '</p>' + unten +
        (arm && !gesperrt && !voll ? '<span class="hinweis">Dir fehlen ' + fmt(p.price - S.gold) + ' Denare.</span>' : '') + '</button>';
    }).join('') + '</div>' +
      '<p class="hinweis" style="margin-top:22px;text-align:center">Kaderplätze: ' + S.roster.length + ' von ' + slotsMax() + ' belegt. Mehr Plätze gibt es mit jedem Rang.</p>';
  } else if (v.phase === 'oeffnen') {
    var p = vtPack(v.id);
    html = '<div class="oeffnen">' + (v.deckel ? '<div class="strahlen"></div>' : '') + '<div style="margin-bottom:40px">' + kisteHTML(p.color, 'gross' + (v.deckel ? ' offen' : ' wackeln')) + '</div></div>';
  } else {
    html = '<div class="vertraege-reihe" id="vtReihe">' + v.list.map(vtKarte).join('') + '</div>' +
      '<div class="knopfreihe" id="vtKnoepfe" style="justify-content:center;margin-top:34px;min-height:48px">' + vtKnoepfeHTML() + '</div>';
  }
  b.innerHTML = html;
  if (v.walk) walkZeigen();
};
function vtAuffrischen() { vtKopf(); var k = $('#vtKnoepfe'); if (k) k.innerHTML = vtKnoepfeHTML(); renderReiter(); }

AKT.vtkiste = function (el) {
  var res = openChest(el.dataset.id);
  if (res.err) { toast(res.err); return; }
  vtStopp();
  var v = ui.vt = vtNeu();
  v.phase = 'oeffnen'; v.id = res.pack.id; v.n = res.pack.n; v.list = res.pack.contracts;
  save(); renderKopf(); renderReiter(); ANSICHT.vertraege();
  vtSpaeter(function () { v.deckel = true; ANSICHT.vertraege(); }, 900);
  vtSpaeter(function () { v.phase = 'austeilen'; ANSICHT.vertraege(); }, 1900);
  vtSpaeter(function () { v.phase = 'zug'; ANSICHT.vertraege(); }, 3400);
};
AKT.ctklick = function (el) {
  var v = ui.vt, i = +el.dataset.i; if (!v) return;
  if (v.phase === 'zug') {
    var at = v.picks.indexOf(i);
    if (at >= 0) v.picks.splice(at, 1); else if (v.picks.length < v.n) v.picks.push(i); else { toast('Du darfst nur ' + v.n + (v.n === 1 ? ' Vertrag' : ' Verträge') + ' wählen. Tippe einen gewählten an, um ihn abzuwählen.'); return; }
    document.querySelectorAll('#vtReihe .ct').forEach(function (c, k) {
      var p = v.picks.indexOf(k) >= 0;
      c.classList.toggle('gewaehlt', p); c.classList.toggle('blass', !p && v.picks.length >= v.n);
      c.setAttribute('aria-label', (p ? 'Vertrag ' + (k + 1) + ' abwählen' : 'Vertrag ' + (k + 1) + ' wählen'));
    });
    vtAuffrischen(); return;
  }
  if (v.phase !== 'aufdecken' || v.picks.indexOf(i) < 0 || v.gedreht[i] || v.glut >= 0 || v.walk) return;
  var g = v.list[i];
  v.glut = i; el.classList.remove('bereit'); el.classList.add('gluehen'); vtAuffrischen();
  var gross = g.rar === 'epic' || g.rar === 'legendary';
  vtSpaeter(function () {
    if (gross) {
      v.walk = { i: i, step: 0 }; el.classList.remove('gluehen'); walkZeigen();
      vtSpaeter(function () { walkSchritt(1); }, 1100);
      vtSpaeter(function () { walkSchritt(2); }, 2300);
      vtSpaeter(function () { walkSchritt(3); }, 3900);
    } else vtDrehen(i);
  }, g.rar === 'rare' ? 900 : 650);
};
function vtDrehen(i) {
  var v = ui.vt; v.gedreht[i] = true; v.glut = -1;
  var c = document.querySelector('#vtReihe .ct[data-i="' + i + '"]');
  if (c) { c.classList.remove('gluehen', 'bereit'); c.classList.add('gedreht'); c.setAttribute('aria-label', v.list[i].name + ', ' + RAR[v.list[i].rar].name + ', ' + v.list[i].type); }
  if (v.picks.every(function (p) { return v.gedreht[p]; })) v.phase = 'fertig';
  vtAuffrischen();
  if (v.phase === 'fertig') { var k = document.querySelector('[data-act="vtkader"]'); if (k) k.focus({ preventScroll: true }); }
}
AKT.vtsiegeln = function () {
  var v = ui.vt; if (!v || v.phase !== 'zug') return;
  var res = signContracts(v.picks.slice());
  if (res.err) { toast(res.err); return; }
  v.phase = 'aufdecken'; v.weg = false;
  if (res.got[0]) S.sel = res.got[0].id;
  save(); renderKopf(); renderReiter(); ANSICHT.vertraege();
  vtSpaeter(function () { v.weg = true; document.querySelectorAll('#vtReihe .ct.verbrennen').forEach(function (c) { c.classList.remove('verbrennen'); c.classList.add('weg'); }); }, 850);
};
AKT.vtalle = function () {
  var v = ui.vt; if (!v || v.phase !== 'aufdecken') return;
  vtStopp(); v.walk = null; v.weg = true; v.glut = -1;
  v.picks.forEach(function (p) { v.gedreht[p] = true; });
  v.phase = 'fertig'; walkWeg(); ANSICHT.vertraege();
};
AKT.vtkader = function () { ui.vt = vtNeu(); ui.kFilter = 'alle'; ui.kSort = 'neu'; zeige('kader'); };
AKT.vtneu = function () { ui.vt = vtNeu(); ANSICHT.vertraege(); };

/* ---------- Walkout bei Episch und Legendär ---------- */
function walkWeg() { var w = $('#walk'); if (w) w.remove(); document.body.classList.remove('gesperrt'); }
function walkZeigen() {
  var v = ui.vt, w = v.walk; if (!w) return;
  var g = v.list[w.i], rc = GLOW[g.rar];
  walkWeg();
  document.body.insertAdjacentHTML('beforeend', '<div class="walk" id="walk" role="dialog" aria-modal="true" aria-label="Neuer Kämpfer: ' + esc(RAR[g.rar].name) + '" style="--rc:' + rc + '">' +
    '<div class="strahl" style="background:repeating-conic-gradient(' + rc + ' 0deg 6deg, transparent 6deg 17deg)"></div>' +
    '<div class="selt-gross rein" style="color:' + rc + '">' + RAR[g.rar].name.toUpperCase() + '</div>' +
    '<div id="walkSil"></div><div id="walkCodes"></div><div id="walkKarte"></div>' +
    '<button class="ueber" data-act="walkueber" id="walkUeber">Überspringen</button></div>');
  document.body.classList.add('gesperrt');
  var s = w.step; w.step = 0;
  for (var k = 1; k <= s; k++) walkSchritt(k);
  var u = $('#walkUeber'); if (u) u.focus({ preventScroll: true });
}
function walkSchritt(s) {
  var v = ui.vt, w = v.walk; if (!w || w.step >= s || !$('#walk')) return;
  var g = v.list[w.i], rc = GLOW[g.rar];
  for (var k = w.step + 1; k <= s; k++) {
    if (k === 1) $('#walkSil').innerHTML = '<div class="rein" style="display:flex;flex-direction:column;align-items:center;gap:8px"><div class="typ">' + g.type.toUpperCase() + '</div>' +
      figSVG(g, { crop: true, ground: false, deko: true, sil: '#0b0806', cls: 'silhouette' }).replace('<svg ', '<svg style="filter:drop-shadow(0 0 16px ' + rc + ')" ') + '</div>';
    if (k === 2) $('#walkCodes').innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">' + codeOf(g.eq).map(function (c, j) {
      return '<span class="code rein" style="animation-delay:' + (j * 300) + 'ms;border-color:' + rc + '">' + c + '</span>'; }).join('') + '</div>';
    if (k === 3) {
      $('#walkSil').innerHTML = '';
      $('#walkKarte').innerHTML = '<div class="rein" style="display:flex;flex-direction:column;align-items:center;gap:10px">' +
        karteHTML(g, { gr: 'l', ohneStatus: true }).replace('class="karte', 'style="box-shadow:0 0 60px ' + rc + '" class="karte') +
        '<div class="chips" style="justify-content:center;max-width:420px">' + g.pers.map(persChip).join('') + '</div>' +
        '<button class="knopf" data-act="walkweiter" id="walkWeiter">Weiter</button></div>';
      var u = $('#walkUeber'); if (u) u.remove();
      var b = $('#walkWeiter'); if (b) b.focus({ preventScroll: true });
    }
  }
  w.step = s;
}
AKT.walkueber = function () { vtStopp(); walkSchritt(3); };
AKT.walkweiter = function () { var v = ui.vt, w = v && v.walk; if (!w) return; v.walk = null; walkWeg(); vtDrehen(w.i); };

/* Beim Verlassen des Reiters: Zeitgeber stoppen, laufende Effekte sauber abschließen */
function vtVerlassen() {
  var v = ui.vt; if (!v) return;
  vtStopp();
  if (v.phase === 'oeffnen' || v.phase === 'austeilen') v.phase = S.pendingPack ? 'zug' : 'wahl';
  if (v.phase === 'aufdecken') {
    v.weg = true;
    if (v.walk) { v.gedreht[v.walk.i] = true; v.walk = null; walkWeg(); }
    if (v.glut >= 0) { v.gedreht[v.glut] = true; v.glut = -1; }
    if (v.picks.every(function (p) { return v.gedreht[p]; })) v.phase = 'fertig';
  }
  if (v.phase === 'fertig') ui.vt = vtNeu();
}
