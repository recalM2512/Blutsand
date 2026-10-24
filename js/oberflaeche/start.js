/*
 * Blutsand · Oberfläche · Start
 * Wird als letzte Datei geladen: Arkadenband zeichnen, Reiter per Tastatur bedienbar machen,
 * Spielstand laden und alles zum ersten Mal anzeigen.
 */
ANSICHT.verlassen = function (von) {
  if (von === 'vertraege') vtVerlassen();
  if (von === 'kader') { ui.vertrag = null; ui.sellArm = null; }
  if (von === 'ludus') ui.probe = null;
};
ANSICHT.abbrechen = function () {
  vtStopp(); walkWeg();
  if (ui.kampf) { kStopp(); ui.kampf = null; }
  ui.suspense = false; ui.don = null;
};

/* Reiter mit Pfeiltasten wechseln (wie es Screenreader-Nutzer von Tablisten erwarten) */
$('#reiter').addEventListener('keydown', function (e) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
  var i = TABS.indexOf(ui.tab);
  i = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
  e.preventDefault(); zeige(TABS[i]); $('#tab-' + TABS[i]).focus();
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (ui.protokoll && $('#kProt')) { AKT.kprot(); return; }
  var w = $('#walkWeiter'); if ($('#walk') && w) w.click();
});
/* Beim Drehen des Handys passt sich die Kampfansicht an */
var drehT = null;
window.addEventListener('resize', function () {
  clearTimeout(drehT);
  drehT = setTimeout(function () {
    if (ui.kamera !== 'auto' || ui.tab !== 'arena') return;
    var v = kameraAnsicht();
    if (ui.kampf && ui.kampf.view !== v) kNeuBauen();
    else if (!ui.kampf && ui.buehne && ui.buehne.view !== v) { var u = ui.buehne.urteil; ui.buehne = null; ANSICHT.arena(); if (u && ui.buehne) kUrteil(u); }
  }, 250);
});

(function boot() {
  var a = ''; for (var i = 0; i < 16; i++) a += '<span></span>';
  $('#arkaden').innerHTML = a;
  var loc = parseSave(lies(KEY));
  if (loc) S = loc; else { newGame(); MSG.length = 0; }
  migrate(); fixSelection();
  if (!loc) save();
  renderAll(); setSaveState();
  setTimeout(initRemote, 0);
})();
