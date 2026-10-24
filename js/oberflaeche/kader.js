/*
 * Blutsand · Oberfläche · Kader (Vertragsmappe)
 * Alle Kämpfer als Bogenkarten mit Filter und Sortierung. Ein Klick öffnet den Vertrag als Pergament
 * über der Seite: blättern mit ‹ › oder den Pfeiltasten, schließen mit Escape oder Klick daneben.
 */
var FILTER = [['alle', 'Alle'], ['common', 'Gewöhnlich'], ['rare', 'Selten'], ['epic', 'Episch'], ['legendary', 'Legendär']];
var SORT = [['kraft', 'Kraft'], ['selten', 'Seltenheit'], ['neu', 'Neueste']];

function kaderListe() {
  var l = S.roster.filter(function (g) { return ui.kFilter === 'alle' || g.rar === ui.kFilter; });
  var by = {
    kraft: function (a, b) { return power(b) - power(a); },
    selten: function (a, b) { return RAR_KEYS.indexOf(b.rar) - RAR_KEYS.indexOf(a.rar) || power(b) - power(a); },
    neu: function (a, b) { return (b.joined || 0) - (a.joined || 0) || S.roster.indexOf(b) - S.roster.indexOf(a); }
  }[ui.kSort];
  return l.sort(by);
}

ANSICHT.kader = function () {
  $('#kZahl').textContent = S.roster.length + ' von ' + slotsMax() + ' Plätzen belegt. Tippe eine Karte an, um den Vertrag zu öffnen.';
  $('#kWerkzeug').innerHTML =
    '<div class="feld"><span id="fLbl">SELTENHEIT</span><div class="segment" role="group" aria-labelledby="fLbl">' + FILTER.map(function (f) {
      var n = f[0] === 'alle' ? S.roster.length : S.roster.filter(function (g) { return g.rar === f[0]; }).length;
      return '<button data-act="kfilter" data-v="' + f[0] + '" aria-pressed="' + (ui.kFilter === f[0]) + '">' + f[1] + ' <span class="zahl">' + n + '</span></button>';
    }).join('') + '</div></div>' +
    '<div class="feld"><span id="sLbl">SORTIEREN</span><div class="segment" role="group" aria-labelledby="sLbl">' + SORT.map(function (s) {
      return '<button data-act="ksort" data-v="' + s[0] + '" aria-pressed="' + (ui.kSort === s[0]) + '">' + s[1] + '</button>';
    }).join('') + '</div></div>';
  var l = kaderListe();
  $('#kRaster').innerHTML = l.length ? l.map(function (g) {
    return karteHTML(g, { gr: 'm', knopf: { act: 'vertrag', label: 'Vertrag von ' + g.name + ' öffnen' } });
  }).join('') : '<p class="hinweis">In dieser Seltenheit hast du keine Kämpfer.</p>';
  var lg = $('#kLegende');
  if (!lg.innerHTML) {
    lg.innerHTML = Object.keys(CODES).map(function (k) { return '<dt>' + k + '</dt><dd>' + esc(CODES[k]) + '</dd>'; }).join('') +
      '<dt>★</dt><dd>Meisterschaft: Ausrüstung passt zum Kämpfertyp (+4 % Schaden und Treffer)</dd><dt>+1/0/0</dt><dd>Schmiedestufen von Waffe, Rüstung und Schild</dd>' +
      '<dt>▲ ▼ ◆</dt><dd>Persönlichkeit mit Vorteil, Nachteil oder beidem. Stufen I bis III bestimmen die Stärke.</dd>' +
      '<dt>MUR RET SEC THR</dt><dd>Murmillo, Retiarius, Secutor, Thraex</dd>';
  }
};

/* ---------- Vertragsfenster ---------- */
ANSICHT.ueberlage = function () {
  var box = $('#ueberlage'), g = ui.vertrag && ui.tab === 'kader' ? byId(ui.vertrag) : null;
  if (!g) {
    if (box.innerHTML) { box.innerHTML = ''; document.body.classList.remove('gesperrt'); }
    ui.vertrag = null; return;
  }
  var l = kaderListe(); if (l.indexOf(g) < 0) l = S.roster.slice().sort(function (a, b) { return power(b) - power(a); });
  var pos = l.indexOf(g) + 1, fl = fameLevel(g.fame), cap = capOf(g), busy = istBeschaeftigt(g);
  var fr = friendsOf(g), rv = rivalsOf(g);
  var tag = g.joined == null ? 'in den Anfangstagen' : g.joined === 0 ? 'vor dem ersten Kampf' : 'am Kampftag ' + g.joined;
  var bars = STATS.map(function (s) {
    return '<div class="wertzeile"><span>' + s[1].toUpperCase() + '</span><div class="balken" role="img" aria-label="' + s[1] + ' ' + g[s[0]] + ' von ' + cap + '"><i style="width:' + Math.round(g[s[0]] / cap * 100) + '%"></i></div><b>' + g[s[0]] + '</b></div>';
  }).join('') + '<div class="wertzeile"><span>LEBEN</span><div class="balken"><i style="width:' + Math.min(100, Math.round(maxLeben(g) / 4.5)) + '%;background:var(--gruen)"></i></div><b>' + maxLeben(g) + '</b></div>';
  var pers = g.pers.length ? g.pers.map(function (p) { return '<div>' + persChip(p) + '<div class="hinweis" style="margin-top:2px">' + esc(persEffect(p)) + '</div></div>'; }).join('') : '<p class="hinweis">Keine besonderen Eigenschaften.</p>';
  var erkl = codeOf(g.eq).map(function (c) { return '<div class="erkl"><span class="code">' + c + '</span><span>' + esc(CODES[c]) + '</span></div>'; }).join('');
  var arm = ui.sellArm === g.id;
  box.innerHTML = '<div class="vertrag-huelle">' +
    '<button class="hintergrund" data-act="vzu" aria-label="Vertrag schließen" tabindex="-1"></button>' +
    '<article class="vertrag" role="dialog" aria-modal="true" aria-labelledby="vName">' +
      '<div class="vertrag-kopf"><div class="eyebrow">VERTRAG · LUDUS BLUTSAND</div>' +
        '<div class="blaettern"><button data-act="vnav" data-d="-1" aria-label="Vorheriger Vertrag">‹</button><span class="zahl">' + pos + ' / ' + l.length + '</span>' +
        '<button data-act="vnav" data-d="1" aria-label="Nächster Vertrag">›</button>' +
        '<button class="zu" data-act="vzu" aria-label="Vertrag schließen" id="vZu"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4 4 L16 16 M16 4 L4 16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button></div></div>' +
      '<div class="vertrag-rumpf">' +
        '<div class="vertrag-links">' + karteHTML(g, { gr: 'l', ohneStatus: true }) +
          '<div class="siegelzeile"><span class="siegel" aria-hidden="true">B</span><div>Unterzeichnet<br><b>' + tag + '</b></div></div></div>' +
        '<div class="vertrag-rechts">' +
          '<div><h2 id="vName">' + esc(g.name) + '</h2>' +
            '<p class="meta" style="margin-top:4px">' + g.type + ' · <b class="selt r-' + g.rar + '">' + RAR[g.rar].name + '</b> · ' + FAME[fl] + ' (' + (g.fame || 0) + ' Ruhm)</p>' +
            '<div style="margin-top:8px">' + statusMarken(g) + '</div>' +
            '<p style="margin-top:8px;color:var(--tinte-3)">' + TYPES[g.type].d + '</p></div>' +
          '<div class="paragraphen r-' + g.rar + '">' +
            '<section class="paragraph"><h3>§ I · PERSÖNLICHKEIT</h3>' + pers + '</section>' +
            '<section class="paragraph"><h3>§ II · WERTE · GRENZE ' + cap + '</h3>' + bars + '</section>' +
            '<section class="paragraph"><h3>§ III · AUSRÜSTUNG</h3>' + erkl +
              '<p class="hinweis">Schmiede: Waffe ' + g.lv.w + ', Rüstung ' + g.lv.a + ', Schild ' + g.lv.s + '</p>' +
              (isTypical(g) ? '<p class="hinweis" style="color:#6b4a0e">★ Meisterschaft für den ' + g.type + '</p>' : '') + '</section>' +
            '<section class="paragraph"><h3>§ IV · BILANZ UND KAMERADEN</h3>' +
              '<div class="bilanz"><div><span>SIEGE</span><b>' + g.wins + '</b></div><div><span>NIEDERL.</span><b>' + g.losses + '</b></div><div><span>GETÖTET</span><b>' + (g.kills || 0) + '</b></div></div>' +
              '<p class="hinweis" style="color:var(--tinte-3)">Moral: <b>' + g.moral + '</b> von 100</p>' +
              '<p class="hinweis" style="color:var(--tinte-3)">Freunde: <b>' + (fr.length ? fr.map(function (x) { return esc(x.name); }).join(', ') : 'keine') + '</b>' + (fr.length ? ' (+1 % je gesundem Freund im Kampf)' : '') + '</p>' +
              '<p class="hinweis" style="color:var(--tinte-3)">Rivalen im Kader: <b>' + (rv.length ? rv.map(function (x) { return esc(x.name); }).join(', ') : 'keine') + '</b>' + (rv.length ? ' (−1 % je Rivale im Kampf)' : '') + '</p></section>' +
            '<section class="paragraph"><h3>§ V · AUFSTIEG</h3>' + aufstiegBoxHTML(g) + '</section>' +
          '</div>' +
          '<div class="vertrag-fuss knopfreihe">' +
            '<button class="knopf" data-act="vludus" data-id="' + g.id + '">Im Ludus trainieren</button>' +
            '<button class="knopf rand" data-act="varena" data-id="' + g.id + '"' + (g.inj || busy ? ' disabled' : '') + '>' + (g.inj ? 'Verletzt' : 'In die Arena') + '</button>' +
            '<button class="knopf gefahr" data-act="aufloesen" data-id="' + g.id + '"' + (S.roster.length <= 1 || busy ? ' disabled' : '') + '>' + (arm ? 'Wirklich auflösen?' : 'Vertrag auflösen · ' + fmt(sellValue(g)) + ' Den.') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</article></div>';
  document.body.classList.add('gesperrt');
  if (ui.vertragFokus !== g.id) { ui.vertragFokus = g.id; var z = $('#vZu'); if (z) z.focus({ preventScroll: true }); }
};
function vertragZu() {
  var id = ui.vertrag; ui.vertrag = null; ui.sellArm = null; ui.vertragFokus = null;
  ANSICHT.ueberlage();
  var b = document.querySelector('#kRaster [data-id="' + id + '"]'); if (b) b.focus({ preventScroll: true });
}
function vertragBlaettern(d) {
  var g = byId(ui.vertrag); if (!g) return;
  var l = kaderListe(); if (l.indexOf(g) < 0) l = S.roster.slice().sort(function (a, b) { return power(b) - power(a); });
  var i = (l.indexOf(g) + d + l.length) % l.length;
  ui.vertrag = l[i].id; ui.sellArm = null; ui.vertragFokus = null;
  ANSICHT.ueberlage();
  var b = document.querySelector('[data-act="vnav"][data-d="' + d + '"]'); if (b) b.focus({ preventScroll: true });
}

AKT.kfilter = function (el) { ui.kFilter = el.dataset.v; ANSICHT.kader(); };
AKT.ksort = function (el) { ui.kSort = el.dataset.v; ANSICHT.kader(); };
AKT.vertrag = function (el) { ui.vertrag = el.dataset.id; ui.sellArm = null; ui.vertragFokus = null; ANSICHT.ueberlage(); };
AKT.vzu = function () { vertragZu(); };
AKT.vnav = function (el) { vertragBlaettern(+el.dataset.d); };
AKT.vludus = function (el) { S.sel = el.dataset.id; ui.probe = null; save(); ui.vertrag = null; ANSICHT.ueberlage(); zeige('ludus'); };
AKT.varena = function (el) {
  S.fighter = el.dataset.id; ui.estKey = ''; ui.opp = null; save();
  ui.vertrag = null; ANSICHT.ueberlage(); zeige('arena');
};
AKT.aufloesen = function (el) {
  var g = byId(el.dataset.id); if (!g) return;
  if (ui.sellArm !== g.id) {
    ui.sellArm = g.id; ANSICHT.ueberlage();
    setTimeout(function () { if (ui.sellArm === g.id) { ui.sellArm = null; ANSICHT.ueberlage(); } }, 3500);
    var b = document.querySelector('[data-act="aufloesen"]'); if (b) b.focus({ preventScroll: true });
    return;
  }
  ui.sellArm = null;
  var l = kaderListe(), i = l.indexOf(g), name = g.name, val = sellValue(g), r = sell(g);
  if (r === 'last') { toast('Dein letzter Kämpfer kann den Ludus nicht verlassen.'); return; }
  if (r === 'busy') { toast(name + ' wartet noch auf das Urteil der Arena.'); return; }
  toast('Vertrag mit ' + name + ' aufgelöst: +' + fmt(val) + ' Denare.');
  var rest = kaderListe();
  ui.vertrag = rest.length ? rest[Math.min(i, rest.length - 1)].id : null; ui.vertragFokus = null;
  save(); renderAll();
};
document.addEventListener('keydown', function (e) {
  if (!ui.vertrag || ui.tab !== 'kader') return;
  if (e.key === 'Escape') { e.preventDefault(); vertragZu(); return; }
  var tag = (e.target.tagName || '').toLowerCase();
  if (e.key === 'ArrowLeft' && tag !== 'select') { e.preventDefault(); vertragBlaettern(-1); return; }
  if (e.key === 'ArrowRight' && tag !== 'select') { e.preventDefault(); vertragBlaettern(1); return; }
  if (e.key === 'Tab') {
    var f = Array.prototype.slice.call(document.querySelectorAll('.vertrag button:not([disabled])'));
    if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
});
