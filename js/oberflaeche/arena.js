/*
 * Blutsand · Oberfläche · Arena
 * Vorbereitung (Kämpfer, Gegner, Schwierigkeit), dann die Bühne:
 *  - Seitenansicht: Tore, Fallgitter, Einlauf, Jubel, Angriffe mit Lebensbalken und Schadenszahlen
 *  - Duell-Kamera (Handy hochkant): zwei Fenster, eigener Kämpfer oben, Gegner unten, von vorne gefilmt
 * Jede Animation kommt aus den echten Ereignissen von simulate(). Danach folgen Urteil und Ergebnis unter der Bühne.
 */
var K_DAUER = { rd: 250, crit: 1250, cheer: 750, tired: 750, end: 1000 };
var K_FLOAT = {
  hit: function (e) { return ['dmg', '−' + e.dmg, '']; },
  crit: function (e) { return ['crit', '−' + e.dmg, 'KRITISCH!']; },
  block: function (e) { return ['blk', 'BLOCK', 'NUR −' + e.dmg]; },
  miss: function () { return ['miss', 'VERFEHLT', '']; },
  dodge: function () { return ['dodge', 'AUSGEWICHEN', '']; },
  counter: function (e) { return ['dmg', '−' + e.dmg, 'KONTER']; }
};
var K_ABWEHR = { hit: 'treffer', crit: 'treffer', block: 'block', dodge: 'ausweichen', counter: 'treffer' };
ui.kampf = null;
(function () { var t = +lies('blutsand-tempo'); if (t === 1 || t === 2 || t === 4) ui.tempo = t; var k = lies('blutsand-kamera'); if (k === 'seite' || k === 'duell') ui.kamera = k; })();

function kameraAnsicht() {
  if (ui.kamera === 'seite' || ui.kamera === 'duell') return ui.kamera;
  return window.matchMedia && window.matchMedia('(max-width: 640px) and (orientation: portrait)').matches ? 'duell' : 'seite';
}

/* ---------- Gegner und Einschätzung ---------- */
function arenaGegner() {
  var t = ui.target;
  if (t && t.kind === 'ladder') { var f = ladderById(t.id); if (f) return f; ui.target = null; }
  if (t && t.kind === 'rival') return rivalFighter(t.id);
  if (t && t.kind === 'aufstieg') { var ag = byId(t.id); if (ag && aufstiegInfo(ag).bereit) return pruefer(ag); ui.target = null; }
  var G = aktuellerGegner(), key = G.foe.id + '|' + S.diff + '|' + G.foe.scouted;
  if (!ui.opp || ui.oppKey !== key) { ui.opp = gegnerMitDiff(G.foe, S.diff); ui.oppKey = key; }
  return ui.opp;
}
function schaetzung(g, foe) {
  var key = g.id + '|' + power(g) + '|' + foe.id + '|' + power(foe) + '|' + codeStr(g.eq) + '|' + codeStr(foe.eq);
  if (ui.estKey === key) return ui.est;
  var w = 0, n = 240, fr = friendsOf(g).filter(function (x) { return !x.inj; }).length, rv = rivalsOf(g).filter(function (x) { return !x.inj; }).length;
  for (var i = 0; i < n; i++) if (simulate(g, foe, { friendsA: fr, rivalsA: rv }).winner === 'a') w++;
  ui.estKey = key; ui.est = Math.round(w / n * 100);
  return ui.est;
}
function vergleichHTML(a, b) {
  return '<div class="vergleich" aria-label="Werte im Vergleich">' + STATS.map(function (s) { return [s[1].toUpperCase(), a[s[0]], b[s[0]]]; }).concat([['KRAFT', power(a), power(b)]]).map(function (r) {
    var mx = Math.max(r[1], r[2], 1);
    return '<div class="vergleich-zeile"><b>' + r[1] + '</b><div class="l"><i style="width:' + Math.round(r[1] / mx * 100) + '%"></i></div><span>' + r[0] + '</span><div class="r"><i style="width:' + Math.round(r[2] / mx * 100) + '%"></i></div><b>' + r[2] + '</b></div>';
  }).join('') + '</div>';
}
/* Herausforderungen vor dem Kampf: Haken, wenn dein gewählter Kämpfer die Bedingung schon erfüllt */
function aufgabenHTML(g, foe, prize) {
  var G = aktuellerGegner();
  if (!G.aufgaben || !G.aufgaben.length) return '';
  return '<div class="aufgaben"><div class="unterkopf">HERAUSFORDERUNGEN · BONUSGOLD BEI SIEG</div><ul>' + G.aufgaben.map(function (a) {
    var vor = aufgabeVorab(a), ok = vor && aufgabeOk(a, g, null, foe);
    var cls = !vor ? 'offen' : ok ? 'erfuellt' : 'fehlt';
    var st = !vor ? 'Entscheidet sich im Kampf' : ok ? 'Dein Kämpfer erfüllt die Bedingung' : 'Dein Kämpfer erfüllt die Bedingung nicht';
    return '<li class="' + cls + '"><span class="haken" aria-hidden="true">' + (!vor ? '?' : ok ? '✓' : '✗') + '</span><span>' + esc(aufgabeText(a)) + '<small>' + st + '</small></span><b>+' + fmt(aufgabeGold(a, prize)) + ' Den.</b></li>';
  }).join('') + '</ul></div>';
}
/* Herausforderungen nach dem Kampf */
function aufgabenErgHTML(m) {
  if (!m.aufgabenErg || !m.aufgabenErg.length) return '';
  return '<div class="aufgaben"><div class="unterkopf">HERAUSFORDERUNGEN</div><ul>' + m.aufgabenErg.map(function (a) {
    return '<li class="' + (a.ok ? 'erfuellt' : 'fehlt verpasst') + '"><span class="haken" aria-hidden="true">' + (a.ok ? '✓' : '✗') + '</span><span>' + esc(a.t) +
      '<small>' + (a.ok ? 'Geschafft, das Gold ist schon in deiner Kasse' : m.win ? 'Nicht geschafft' : 'Gilt nur bei einem Sieg') + '</small></span><b>' + (a.ok ? '+' : '') + fmt(a.gold) + ' Den.</b></li>';
  }).join('') + '</ul></div>';
}

/* ---------- Vorbereitung ---------- */
function vorkampfHTML() {
  if (S.challenge && ladderById(S.challenge.id) && !ui.target) {
    ui.target = { kind: 'ladder', id: S.challenge.id, challenge: true };
    var cg = byId(S.challenge.gid); if (cg && !cg.inj) S.fighter = cg.id;
  }
  if (S.challenge && !ladderById(S.challenge.id)) S.challenge = null;
  if (ui.target && ui.target.kind === 'aufstieg') { var ag = byId(ui.target.id); if (ag && aufstiegInfo(ag).bereit) S.fighter = ag.id; else ui.target = null; }
  fixSelection();
  var h = healthy(), t = ui.target, r = rankIdx(), auf = t && t.kind === 'aufstieg';
  var out = '<div class="kopfzeile"><h2 class="seitentitel">Die Arena</h2><p class="hinweis">Wähle deinen Kämpfer und den Gegner. Dann öffnen sich die Tore.</p></div>';
  if (t) {
    var tf = arenaGegner();
    if (tf) {
      var lbl = t.kind === 'rival' ? 'Rivalenkampf gegen <b>' + esc(tf.name) + '</b>, „' + esc(tf.title) + '“.' :
        auf ? 'Aufstiegskampf: <b>' + esc(byId(t.id).name) + '</b> tritt gegen den Prüfer an. Gewinnt er, steigt er zu <b>' + RAR[tf.rar].name + '</b> auf. Verliert er, darf er es nach ' + PRUEF_SPERRE + ' Kämpfen erneut versuchen. Kein Kampf auf Leben und Tod.' :
        (t.challenge ? 'Sonderkampf: <b>' + esc(tf.name) + '</b> hat dich herausgefordert. Prämie ×1,5 und +2 Ruhm.' : 'Herausforderung: Platz ' + ladderPlace(tf.id) + ' der Grubenrangliste, <b>' + esc(tf.name) + '</b>.');
      out += '<div class="banner-ziel"><p>' + lbl + '</p><button class="knopf rand klein" data-act="untarget">' + (t.challenge ? 'Herausforderung zurückziehen (−1 Ruhm)' : 'Zurück zum Ligakampf') + '</button></div>';
    }
  }
  if (!h.length) {
    return out + '<div class="tafel"><p>Alle Kämpfer sind verletzt. Heile sie im Ludus oder lege einen Ruhetag ein.</p>' +
      '<div class="knopfreihe" style="margin-top:12px"><button class="knopf" data-act="rest">Ruhetag einlegen · 10 Den.</button><button class="knopf rand" data-act="tab" data-tab="ludus">Zum Ludus</button></div></div>';
  }
  var g = byId(S.fighter), foe = arenaGegner();
  out += '<div class="tafel vorkampf"><div class="werkzeug">';
  if (auf) out += '<div class="feld"><span>DEIN KÄMPFER</span><b class="fest">' + esc(g.name) + ' (Kraft ' + power(g) + ')</b></div>';
  else {
    out += '<div class="feld"><label for="kWahl">DEIN KÄMPFER</label><select id="kWahl" data-change="kfighter">' + S.roster.slice().sort(function (a, b) { return power(b) - power(a); }).map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === g.id ? ' selected' : '') + (x.inj ? ' disabled' : '') + '>' + esc(x.name) + ' (Kraft ' + power(x) + ')' + (x.inj ? ' · verletzt' : '') + '</option>';
    }).join('') + '</select></div>';
  }
  if (!t) {
    out += '<div class="feld"><span id="diffLbl">SCHWIERIGKEIT</span><div class="segment" role="group" aria-labelledby="diffLbl">' + DIFFS.map(function (d) {
      var lock = r < d.rank;
      return '<button data-act="diff" data-d="' + d.id + '" aria-pressed="' + (d.id === S.diff) + '"' + (lock ? ' disabled' : '') + '>' + d.name + '<small>' + (lock ? 'ab ' + RANKS[d.rank].n : d.sub) + '</small></button>';
    }).join('') + '</div></div>';
  }
  out += '</div>';
  if (!t) out += '<div class="liga-zeile"><span class="marke gold">LIGA: ' + RANKS[r].n.toUpperCase() + '</span><span class="hinweis">Gegner hier: ' + ligaQuoten(r) + '. Mit jedem Rang kämpfst du in einer stärkeren Liga.</span></div>';
  var verdeckt = !foe.scouted, marken = '<span class="marke selt-marke r-' + foe.rar + '">' + RAR[foe.rar].name + '</span>';
  if (foe.nemesis) marken += '<span class="marke rot">Nemesis</span>';
  if (foe.rival) marken += '<span class="marke gold">Rivale</span>';
  if (foe.title) marken += '<span class="titelzeile">„' + esc(foe.title) + '“</span>';
  out += '<div class="paarung">' +
    '<div class="seite">' + karteHTML(g, { gr: 'm' }) + persChips(g, false) + statusMarken(g) + '</div>' +
    '<div class="vs" aria-hidden="true">VS</div>' +
    '<div class="seite">' + karteHTML(foe, { gr: 'm' }) + '<div class="chips" style="justify-content:center">' + marken + '</div>' + persChips(foe, verdeckt) + '</div>' +
    '</div>' + vergleichHTML(g, foe);
  var kind = t ? t.kind : 'random';
  var rw = matchReward({ kind: kind, diff: S.diff, foe: foe, rivalId: t && t.kind === 'rival' ? t.id : null, challenge: t && t.challenge }, g);
  var lethal = kind !== 'random' ? kind !== 'aufstieg' : DIFFS[S.diff].lethal;
  if (!t) out += aufgabenHTML(g, foe, rw.prize);
  out += '<div class="belohnung">' +
    '<p>Siegprämie: <b>' + fmt(rw.prize) + ' Denare</b> und <b>' + rw.ruhm + ' Ruhm</b>, dazu bis zu +50 % Spektakelbonus bei einem spannenden Kampf. Bei einer Niederlage gibt es 15 Denare.</p>' +
    (auf ? '<p>Prüfung: Niemand stirbt. Bei einer Niederlage kann sich dein Kämpfer leicht verletzen.</p>' :
      lethal ? '<p class="toedlich">Auf Leben und Tod: Verliert dein Kämpfer, entscheidet das Publikum, ob er stirbt. Je knapper der Kampf, desto eher gibt es Gnade.</p>' : '<p>Schaukampf: Niemand stirbt, aber Prämie und Ruhm sind kleiner.</p>') +
    (foe.scouted ? '<p>Späher-Einschätzung: Siegchance etwa <b>' + schaetzung(g, foe) + ' %</b>.</p>' : '<p>Persönlichkeiten und Siegchance des Gegners kennst du erst, wenn ein Späher ihn beobachtet hat.</p>') +
    '</div>';
  out += '<div class="knopfreihe"><button class="knopf gross-k" data-act="kstart">' + (auf ? 'Zum Aufstiegskampf' : 'Tore öffnen') + '</button>';
  if (!t) {
    var k = tauschKosten();
    out += '<button class="knopf rand" data-act="reroll"' + (S.gold < k.gold ? ' disabled' : '') + ' title="Das Publikum hält das für feige.">Anderen Gegner suchen · ' + k.gold + ' Den.' + (k.ruhm ? ' · −' + k.ruhm + ' Ruhm' : '') + '</button>';
  }
  if (!foe.scouted) out += '<button class="knopf rand" data-act="scout"' + (S.gold < SCOUT_COST ? ' disabled' : '') + '>Späher losschicken · ' + SCOUT_COST + ' Den.</button>';
  if (S.roster.some(function (x) { return x.inj; })) out += '<button class="knopf rand" data-act="rest">Ruhetag einlegen · 10 Den.</button>';
  out += '</div>' + (!t ? '<p class="hinweis">Einen anderen Gegner zu suchen kostet Denare und 1 Ruhm, denn das Publikum hält es für feige. Unter die Grenze deines Rangs fällt dein Ruhm dabei nie.</p>' : '') + '</div>';
  return out;
}

/* ---------- Bühne bauen ---------- */
function kNamen(m) { var foe = m.foeSnap || m.foe; return { a: m.me.name, b: foe.name, foe: foe }; }
function kEtikett(m) {
  var foe = m.foeSnap || m.foe;
  return m.kind === 'rival' ? 'RIVALE' : m.kind === 'aufstieg' ? 'PRÜFER' : foe.nemesis ? 'NEMESIS' : m.kind === 'ladder' ? 'GRUBENKÄMPFER' : 'GEGNER';
}
function kLeisteKnoepfe(view, fertig) {
  var tempo = '<div class="tempo" role="group" aria-label="Kampftempo">' + [1, 2, 4].map(function (t) {
    return '<button data-act="ktempo" data-v="' + t + '" aria-pressed="' + (ui.tempo === t) + '">' + t + '×</button>'; }).join('') + '</div>';
  var ansicht = '<button data-act="kansicht" aria-label="' + (view === 'duell' ? 'Zur Seitenansicht wechseln' : 'Zur Duell-Kamera wechseln') + '">' +
    (view === 'duell' ? '<svg viewBox="0 0 24 16" width="18" height="12" aria-hidden="true"><rect x="1" y="1" width="22" height="14" rx="2" fill="none" stroke="#e9b65a" stroke-width="2"/></svg><span class="breit">SEITE</span>'
      : '<svg viewBox="0 0 16 24" width="12" height="18" aria-hidden="true"><rect x="1" y="1" width="14" height="22" rx="2" fill="none" stroke="#e9b65a" stroke-width="2"/><path d="M1 12 H15" stroke="#e9b65a" stroke-width="2"/></svg><span class="breit">KAMERA</span>') + '</button>';
  var skip = '<button data-act="kskip" id="kSkip" aria-label="Kampf überspringen"' + (fertig ? ' disabled' : '') + '><svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M3 4 L11 10 L3 16 Z M10 4 L18 10 L10 16 Z" fill="currentColor"/></svg><span class="breit lang">ÜBERSPRINGEN</span><span class="kurz">ZUM ENDE</span></button>';
  var prot = '<button data-act="kprot" aria-pressed="' + ui.protokoll + '" aria-label="Kampfprotokoll anzeigen"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4 5 H16 M4 10 H16 M4 15 H12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>';
  return { tempo: tempo, ansicht: ansicht, skip: skip, prot: prot };
}
function kProtokollHTML(z) {
  return '<div class="protokoll" id="kProt"' + (ui.protokoll ? '' : ' hidden') + '><div class="pk-kopf"><span>KAMPFPROTOKOLL</span><button data-act="kprot" aria-label="Protokoll schließen"><svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M4 4 L16 16 M16 4 L4 16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button></div>' +
    '<ol class="protokoll-liste" id="kProtListe">' + (z.log.length ? z.log.map(kZeile).join('') : '<li class="zl-miss">' + (z.ohneLog ? 'Das Protokoll ist nach dem Neuladen nicht mehr verfügbar.' : 'Noch ist nichts passiert.') + '</li>') + '</ol></div>';
}
function kZeile(e) { return '<li class="zl-' + e.t + '">' + esc(e.text) + '</li>'; }
function kHudSeite(id, name, z, mhp, rechts) {
  var hp = z['hp' + id], st = z['st' + id], f = hp / mhp;
  var nameH = '<span class="name">' + esc(name) + '</span>', zahl = '<span class="zahl" id="hpT' + id + '">' + hp + '/' + mhp + '</span>';
  return '<div class="zeile">' + (rechts ? zahl + nameH : nameH + zahl) + '</div>' +
    '<div class="lp"><i id="lp' + id + '" class="' + (f < 0.3 ? 'tief' : '') + '" style="width:' + Math.round(f * 100) + '%"></i></div>' +
    '<div class="as"><i id="as' + id + '" style="width:' + Math.round(st * 100) + '%"></i></div>';
}
function kMedaillon(z) {
  return '<div class="medaillon" id="kMed" title="Spannung ' + z.sp + '" style="--sp:' + Math.round(z.sp * 3.6) + 'deg"><div><b id="kRunde">' + roemisch(z.runde) + '</b><small>RUNDE</small></div></div>';
}
function buehneHTML(view, m, z) {
  var n = kNamen(m), foe = n.foe, mA = m.sum.mhpA, mB = m.sum.mhpB, k = kLeisteKnoepfe(view, !!z.liegt);
  var liegtA = z.liegt === 'a', liegtB = z.liegt === 'b';
  if (view === 'duell') {
    var fenster = function (id, g, flip, etikett, liegt) {
      var menge = ''; for (var c = 0; c < 40; c++) menge += '<span style="background:' + KOEPFE[(c * (id === 'A' ? 7 : 3) + (id === 'A' ? 0 : 4)) % KOEPFE.length] + '"></span>';
      var schild = g.eq.shield !== '–' ? '<div class="k-schild" id="schild' + id + '" aria-hidden="true" style="background:' + TYPES[g.type].color + '"><i style="background:' + RC[g.rar] + '"></i></div>' : '';
      return '<div class="fenster" id="fenster' + id + '"><div class="menge" aria-hidden="true">' + menge + '</div><div class="boden" aria-hidden="true"></div>' +
        '<div class="nah' + (z.pos ? '' : ' fern') + '" id="nah' + id + '"><div class="nah-in' + (liegt ? ' k-liegt' : '') + '" id="fa' + id + '">' + figSVG(g, { flip: flip, ground: false, deko: true }) + '</div></div>' +
        schild + '<div class="k-blitz" id="blitz' + id + '" aria-hidden="true"></div><div class="k-dunkel" id="dunkel' + id + '" aria-hidden="true"' + (liegt ? ' style="opacity:.5"' : '') + '></div>' +
        '<div class="k-gitter" aria-hidden="true"><i></i></div><div class="schwebe" id="schwebe' + id + '" aria-hidden="true"></div><div class="etikett">' + etikett + '</div><div class="urteil-platz" id="urteil' + id + '"></div></div>';
    };
    return '<div class="kamera' + (z.tore ? ' offen' : '') + '" id="buehne" style="--spd:' + ui.tempo + '" role="region" aria-label="Kampf: ' + esc(n.a) + ' gegen ' + esc(n.b) + '">' +
      fenster('A', m.me, false, 'DEIN KÄMPFER', liegtA) +
      '<div class="trenner"><div class="seite">' + kHudSeite('A', n.a, z, mA, false) + '</div>' +
      '<div class="seite"><div class="as"><i id="asB" style="width:' + Math.round(z.stB * 100) + '%"></i></div><div class="lp"><i id="lpB" class="' + (z.hpB / mB < 0.3 ? 'tief' : '') + '" style="width:' + Math.round(z.hpB / mB * 100) + '%"></i></div>' +
      '<div class="zeile"><span class="name">' + esc(n.b) + '</span><span class="zahl" id="hpTB">' + z.hpB + '/' + mB + '</span></div></div>' + kMedaillon(z) + '</div>' +
      fenster('B', foe, true, kEtikett(m), liegtB) +
      '<div class="k-leiste"><p class="ticker" id="kTicker">' + esc(z.ticker) + '</p><div class="reihe">' + k.ansicht + k.tempo + k.prot + k.skip + '</div></div>' +
      '<div id="kBanner"></div>' + kProtokollHTML(z) + '</div>';
  }
  var boegen = '';
  for (var a = 0; a < 10; a++) { boegen += '<span>'; for (var h = 0; h < 3; h++) boegen += '<i class="kopf-z" style="background:' + KOEPFE[(a * 3 + h * 5) % KOEPFE.length] + '"></i>'; boegen += '</span>'; }
  var xA = z.pos ? 27 : 1, xB = z.pos ? 54 : 80;
  return '<div class="buehne' + (z.tore ? ' offen' : '') + '" id="buehne" style="--spd:' + ui.tempo + '" role="region" aria-label="Kampf: ' + esc(n.a) + ' gegen ' + esc(n.b) + '">' +
    '<div class="raenge" id="kRaenge" aria-hidden="true"><div class="boegen">' + boegen + '</div><div class="bruestung"></div></div>' +
    '<div class="fleck" aria-hidden="true"></div><div class="tor l" aria-hidden="true"></div><div class="tor r" aria-hidden="true"></div>' +
    '<div class="ftr sofort' + (z.muede.a && !z.liegt ? ' muede' : '') + '" id="ftrA" style="--dir:1;left:' + xA + '%"><div class="fa' + (liegtA ? ' liegt' : '') + '" id="faA">' + figSVG(m.me, { ground: false, deko: true }) + '</div></div>' +
    '<div class="ftr sofort' + (z.muede.b && !z.liegt ? ' muede' : '') + '" id="ftrB" style="--dir:-1;left:' + xB + '%"><div class="fa' + (liegtB ? ' liegt' : '') + '" id="faB">' + figSVG(foe, { flip: true, ground: false, deko: true }) + '</div></div>' +
    '<div class="gitter l" aria-hidden="true"><i></i></div><div class="gitter r" aria-hidden="true"><i></i></div>' +
    '<div class="hud l">' + kHudSeite('A', n.a, z, mA, false) + '</div><div class="hud r">' + kHudSeite('B', n.b, z, mB, true) + '</div>' + kMedaillon(z) +
    '<div class="schwebe" id="schwebe" aria-hidden="true"></div><div id="kBanner"></div><div class="urteil-platz" id="urteilS"></div>' + kProtokollHTML(z) +
    '<div class="leiste"><p class="ticker" id="kTicker">' + esc(z.ticker) + '</p>' + k.ansicht + k.tempo + k.skip + k.prot + '</div></div>';
}

/* ---------- Anzeige während des Kampfes ---------- */
function kHud(z, m) {
  [['A', z.hpA, m.sum.mhpA, z.stA], ['B', z.hpB, m.sum.mhpB, z.stB]].forEach(function (x) {
    var lp = $('#lp' + x[0]); if (!lp) return;
    var f = x[1] / x[2]; lp.style.width = Math.round(f * 100) + '%'; lp.classList.toggle('tief', f < 0.3);
    $('#hpT' + x[0]).textContent = x[1] + '/' + x[2];
    $('#as' + x[0]).style.width = Math.round(x[3] * 100) + '%';
  });
  var med = $('#kMed'); if (med) { med.style.setProperty('--sp', Math.round(z.sp * 3.6) + 'deg'); med.title = 'Spannung ' + z.sp; $('#kRunde').textContent = roemisch(z.runde); }
  var t = $('#kTicker'); if (t) t.textContent = z.ticker;
}
function kBanner(gross, klein) {
  var b = $('#kBanner'); if (!b) return;
  if (ui.kampf) ui.kampf.banner = gross ? [gross, klein] : null;
  b.innerHTML = gross ? '<div class="banner" role="status"><b>' + esc(gross) + '</b>' + (klein ? '<small>' + esc(klein) + '</small>' : '') + '</div>' : '';
}
function kAnim(side, typ) {
  var duell = $('#buehne').classList.contains('kamera'), id = side === 'a' ? 'A' : 'B', el = $('#fa' + id); if (!el) return;
  var pre = duell ? 'k-' : 'a-';
  ['angriff', 'treffer', 'block', 'ausweichen'].forEach(function (x) { el.classList.remove(pre + x); });
  void el.offsetWidth; el.classList.add(pre + typ);
  if (duell && typ === 'block') { var s = $('#schild' + id); if (s) neuStarten(s, 'hoch'); }
}
function kBlitz(side, gold) {
  var b = $('#blitz' + (side === 'a' ? 'A' : 'B')); if (!b) return;
  b.classList.remove('rot', 'gold'); void b.offsetWidth; b.classList.add(gold ? 'gold' : 'rot');
}
function kZahl(side, e) {
  var f = K_FLOAT[e.t]; if (!f) return;
  f = f(e);
  var duell = $('#buehne').classList.contains('kamera'), box = $(duell ? '#schwebe' + (side === 'a' ? 'A' : 'B') : '#schwebe'); if (!box) return;
  var d = document.createElement('div'), K = ui.kampf, n = K ? K.i : 0;
  d.className = 'fl ' + f[0];
  d.style.top = (duell ? (n % 2 ? 22 : 30) : (n % 2 ? 40 : 46)) + '%';
  if (!duell) d.style.left = (side === 'a' ? 36.5 : 63.5) + '%';
  d.innerHTML = esc(f[1]) + (f[2] ? '<small>' + esc(f[2]) + '</small>' : '');
  box.appendChild(d);
  var weg = function () { if (d.parentNode) d.parentNode.removeChild(d); };
  d.addEventListener('animationend', weg); setTimeout(weg, 4000);
}
function kJubel(ms) {
  var r = $('#kRaenge'); if (!r) return;
  r.classList.add('jubel'); clearTimeout(kJubel.t);
  kJubel.t = setTimeout(function () { var x = $('#kRaenge'); if (x) x.classList.remove('jubel'); }, ms / ui.tempo);
}
function kAnwenden(e, still) {
  var K = ui.kampf, z = K.z;
  if (e.t === 'rd') z.runde = parseInt(e.text.replace(/\D/g, ''), 10) || z.runde;
  z.hpA = e.hpA; z.hpB = e.hpB; z.stA = e.stA; z.stB = e.stB; z.sp = liveSpann(e, K.m.sum.mhpA, K.m.sum.mhpB);
  if (e.t !== 'rd') {
    z.ticker = e.text; z.log.push(e);
    var pl = $('#kProtListe'); if (pl) { if (z.log.length === 1) pl.innerHTML = ''; pl.insertAdjacentHTML('beforeend', kZeile(e)); pl.scrollTop = pl.scrollHeight; }
  }
  if (e.t === 'tired' && e.side) { z.muede[e.side] = true; var ft = $('#ftr' + (e.side === 'a' ? 'A' : 'B')); if (ft) ft.classList.add('muede'); }
  kHud(z, K.m);
  if (still || REDUCE) return;
  var at = e.side, df = at === 'a' ? 'b' : 'a';
  if (K_FLOAT[e.t] && at) {
    kAnim(at, 'angriff');
    if (K_ABWEHR[e.t]) kAnim(df, K_ABWEHR[e.t]);
    if (e.t === 'hit' || e.t === 'counter') kBlitz(df, false);
    if (e.t === 'crit') kBlitz(df, true);
    kZahl(df, e);
  }
  if (e.t === 'crit') {
    var duell = $('#buehne').classList.contains('kamera');
    neuStarten(duell ? $('#fenster' + (df === 'a' ? 'A' : 'B')) : $('#buehne'), 'beben');
    kJubel(1300);
  }
  if (e.t === 'cheer') kJubel(1500);
  if (e.t === 'end') kBanner('DIE ZEIT IST UM', 'Die Kampfrichter entscheiden nach Treffern.');
}

/* ---------- Ablauf: Tore, Einlauf, Jubel, Kampf, Ende ---------- */
function kSpaeter(fn, ms) {
  var K = ui.kampf; if (!K) return;
  K.timers.push(setTimeout(function () { if (ui.kampf === K) fn(); }, REDUCE ? Math.min(ms, 250) : ms / ui.tempo));
}
function kStopp() { var K = ui.kampf; if (K) { K.timers.forEach(clearTimeout); K.timers = []; } }
function kNeuBauen() {
  var K = ui.kampf, halter = $('#buehneHalter'); if (!K || !halter) return;
  K.view = kameraAnsicht();
  halter.innerHTML = buehneHTML(K.view, K.m, K.z);
  if (K.banner) kBanner(K.banner[0], K.banner[1]);
}
AKT.kstart = function () {
  if (ui.kampf || (S.match && S.match.stage !== 'done')) return;
  var g = byId(S.fighter);
  if (!g || g.inj) { toast('Wähle einen gesunden Kämpfer.'); return; }
  var t = ui.target, m;
  if (t && t.kind === 'ladder') { if (!ladderById(t.id)) { ui.target = null; ANSICHT.arena(); return; } m = newMatch('ladder', g.id, { id: t.id, challenge: t.challenge }); }
  else if (t && t.kind === 'rival') m = newMatch('rival', g.id, { id: t.id });
  else if (t && t.kind === 'aufstieg') m = newMatch('aufstieg', g.id, {});
  else { var G = aktuellerGegner(); m = newMatch('random', g.id, { foe: gegnerMitDiff(G.foe, S.diff), aufgaben: G.aufgaben }); }
  m.me = JSON.parse(JSON.stringify(g));
  m.foeSnap = JSON.parse(JSON.stringify(m.foe));
  runMatch(m);
  ui.opp = null; ui.estKey = ''; ui.target = null; ui.don = null; ui.lastMatch = null; ui.suspense = false; ui.buehne = null;
  S.match = m.stage === 'done' ? null : m;
  save();
  var n = kNamen(m);
  var K = ui.kampf = { m: m, i: 0, timers: [], banner: null, view: kameraAnsicht(),
    z: { tore: false, pos: false, hpA: m.sum.mhpA, hpB: m.sum.mhpB, stA: 1, stB: 1, runde: 0, sp: 0, ticker: 'Beide Kämpfer warten hinter den Toren.', log: [], muede: {}, liegt: null } };
  renderKopf(); renderReiter();
  $('#arenaBox').innerHTML = '<div class="kampfplatz"><div id="buehneHalter">' + buehneHTML(K.view, m, K.z) + '</div><div id="arenaUnten"></div></div>';
  var b = $('#buehne'); b.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
  if (REDUCE) { K.z.tore = K.z.pos = true; kNeuBauen(); kSpaeter(kSchritt, 200); return; }
  kBanner('DIE TORE ÖFFNEN SICH', n.a + ' gegen ' + n.b);
  kSpaeter(function () {
    K.z.tore = true; $('#buehne').classList.add('offen'); K.z.ticker = 'Die Fallgitter heben sich …'; kHud(K.z, m);
    kSpaeter(function () {
      K.z.pos = true; kBanner('');
      K.z.ticker = n.a + ' und ' + n.b + ' betreten den Sand.'; kHud(K.z, m);
      if (K.view === 'duell') ['A', 'B'].forEach(function (id) { var x = $('#nah' + id); x.classList.remove('fern'); x.classList.add('naehern'); });
      else [['A', 27], ['B', 54]].forEach(function (x) { var f = $('#ftr' + x[0]); f.classList.remove('sofort'); f.classList.add('gehen'); f.style.left = x[1] + '%'; });
      kSpaeter(function () {
        document.querySelectorAll('.ftr').forEach(function (f) { f.classList.remove('gehen'); f.classList.add('jubeln'); });
        if (K.view === 'duell') ['A', 'B'].forEach(function (id) { $('#fa' + id).classList.add('k-jubeln'); });
        kJubel(1700); kBanner('DIE MENGE JUBELT!', n.a + ' gegen ' + n.b);
        K.z.ticker = 'Die Menge springt auf und jubelt.'; kHud(K.z, m);
        kSpaeter(function () {
          kBanner('');
          document.querySelectorAll('.ftr').forEach(function (f) { f.classList.remove('jubeln'); });
          document.querySelectorAll('.nah-in').forEach(function (f) { f.classList.remove('k-jubeln'); });
          K.z.ticker = 'Die Kämpfer umkreisen sich.'; kHud(K.z, m);
          kSpaeter(kSchritt, 400);
        }, 1700);
      }, 1800);
    }, 1100);
  }, 400);
};
function kSchritt() {
  var K = ui.kampf, ev = K.m.events;
  if (K.i >= ev.length) { kSpaeter(function () { kEnde(false); }, 500); return; }
  var e = ev[K.i++]; kAnwenden(e, false);
  kSpaeter(kSchritt, K_DAUER[e.t] || 850);
}
function kEndText(m) {
  var s = m.sum, f = m.win ? s.hpA / s.mhpA : s.hpB / s.mhpB, n = kNamen(m), wer = m.win ? n.a : n.b, hp = m.win ? s.hpA : s.hpB;
  if (s.hpA > 0 && s.hpB > 0) return 'Nach Punkten entschieden. Spannung ' + m.spann + '.';
  if (f < 0.25) return 'Ein knapper Kampf: ' + wer + ' hat nur noch ' + hp + ' Leben.';
  if (f > 0.7) return 'Ein klarer Sieg. Spannung ' + m.spann + '.';
  return s.rounds + ' Runden, Spannung ' + m.spann + '.';
}
function kEnde(sofort) {
  var K = ui.kampf; if (!K) return;
  var m = K.m, n = kNamen(m), verl = m.win ? 'b' : 'a', sieger = m.win ? 'a' : 'b', duell = K.view === 'duell';
  K.z.liegt = verl; K.z.muede = {};
  K.z.ticker = (verl === 'a' ? n.a : n.b) + ' liegt im Sand. ' + (m.stage === 'decide' ? (m.kind === 'rival' ? 'Du entscheidest über den Rivalen.' : 'Das Publikum ruft sein Urteil.') : m.stage === 'verdict' ? 'Das Publikum entscheidet über sein Schicksal.' : 'Der Schaukampf ist vorbei.');
  var titel = m.kind === 'aufstieg' ? (m.win ? (n.a + ' besteht die Prüfung').toUpperCase() : 'DIE PRÜFUNG IST GESCHEITERT') :
    ((sieger === 'a' ? n.a : n.b) + ' siegt').toUpperCase() + (m.lethal ? '' : ' IM SCHAUKAMPF');
  if (sofort) {
    kNeuBauen();
  } else {
    document.querySelectorAll('.ftr').forEach(function (f) { f.classList.remove('muede'); });
    var V = verl === 'a' ? 'A' : 'B', W = sieger === 'a' ? 'A' : 'B', fv = $('#fa' + V);
    ['angriff', 'treffer', 'block', 'ausweichen'].forEach(function (x) { fv.classList.remove('a-' + x, 'k-' + x); });
    fv.classList.add(duell ? 'k-fallen' : 'a-fallen');
    if (duell) { $('#dunkel' + V).style.opacity = '.5'; $('#fa' + W).classList.add('k-jubeln'); }
    else neuStarten($('#ftr' + W), 'jubeln');
    kJubel(2200); kHud(K.z, m);
    var s = $('#kSkip'); if (s) s.disabled = true;
  }
  kBanner(titel, kEndText(m));
  var fertig = function () {
    kBanner('');
    ui.kampf = null; ui.buehne = { m: m, view: K.view, urteil: null };
    if (m.stage === 'done') ui.lastMatch = m;
    if (m.stage === 'decide' && m.kind !== 'rival' && m.lethal) {
      var foeN = n.b;
      kUrteil({ cls: m.crowdMercy ? 'gnade' : 'tod', hoch: m.crowdMercy, klein: 'DAS PUBLIKUM FORDERT', gross: m.crowdMercy ? 'GNADE FÜR ' + foeN.toUpperCase() : 'DEN TOD VON ' + foeN.toUpperCase(), wo: 'b' });
    }
    renderAll();
    var u = $('#arenaUnten'); if (u) setTimeout(function () { u.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'nearest' }); }, 60);
    if (m.aufgestiegen) zeigeAufstieg(byId(m.gid), m.aufgestiegen);
  };
  if (sofort) fertig(); else kSpaeter(fertig, 1700);
}
function kUrteil(u) {
  if (ui.buehne) ui.buehne.urteil = u;
  var duell = $('#buehne') && $('#buehne').classList.contains('kamera');
  document.querySelectorAll('.urteil-platz').forEach(function (p) { p.innerHTML = ''; });
  var ziel = $(duell ? '#urteil' + (u.wo === 'a' ? 'A' : 'B') : '#urteilS'); if (!ziel) return;
  var farbe = u.cls === 'gnade' ? '#2f5a1f' : u.cls === 'tod' ? '#8e2a1e' : '#7a4a14';
  ziel.innerHTML = '<div class="urteil-box ' + (u.cls || '') + '" role="status">' + (u.hoch == null ? '' : daumenSVG(u.hoch, farbe).replace('<svg ', '<svg width="42" height="42" ')) +
    '<div><small>' + esc(u.klein) + '</small><b>' + esc(u.gross) + '</b></div></div>';
}
AKT.kskip = function () {
  var K = ui.kampf; if (!K) return;
  kStopp();
  var ev = K.m.events;
  while (K.i < ev.length) kAnwenden(ev[K.i++], true);
  K.z.tore = K.z.pos = true; K.banner = null;
  kEnde(true);
};
AKT.ktempo = function (el) {
  ui.tempo = +el.dataset.v; merke('blutsand-tempo', String(ui.tempo));
  var b = $('#buehne'); if (b) b.style.setProperty('--spd', ui.tempo);
  document.querySelectorAll('[data-act="ktempo"]').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.dataset.v === ui.tempo)); });
};
AKT.kansicht = function () {
  var jetzt = ui.kampf ? ui.kampf.view : (ui.buehne ? ui.buehne.view : kameraAnsicht());
  ui.kamera = jetzt === 'duell' ? 'seite' : 'duell'; merke('blutsand-kamera', ui.kamera);
  if (ui.kampf) { kNeuBauen(); return; }
  var u = ui.buehne && ui.buehne.urteil; ui.buehne = null; ANSICHT.arena();
  if (u && ui.buehne) kUrteil(u);
};
AKT.kprot = function () {
  ui.protokoll = !ui.protokoll;
  var p = $('#kProt'); if (p) p.hidden = !ui.protokoll;
  document.querySelectorAll('.leiste [data-act="kprot"], .k-leiste [data-act="kprot"]').forEach(function (x) { x.setAttribute('aria-pressed', String(ui.protokoll)); });
  if (ui.protokoll) { var l = $('#kProtListe'); if (l) l.scrollTop = l.scrollHeight; }
};

/* ---------- Unter der Bühne: Entscheidung, Urteil, Ergebnis ---------- */
function aufschluesselung(m) {
  var p = m.sp;
  return '<div class="aufschluesselung"><span>Spannung <b>' + m.spann + '</b></span><span>Knappheit <b>' + p.knapp + '</b></span><span>Wendungen <b>' + p.wend + '</b></span><span>Kritische Treffer <b>' + p.kr + '</b></span><span>Comeback <b>' + p.come + '</b></span><span>Runden <b>' + m.sum.rounds + '</b></span></div>';
}
function entscheidungHTML(m) {
  var foe = m.foeSnap || m.foe, ch = winChoices(m);
  var extra = m.kind === 'rival' ? 'Ein Rivale stirbt nicht in der Arena. Entscheide, wie du ihn behandelst.' :
    foe.nemesis ? 'Er ist dein Nemesis. Bei Gnade kann er sich mit etwas Glück deinem Ludus anschließen.' : '';
  return '<div class="ergebnis sieg"><h3>Sieg</h3><p>' + esc(m.gname) + ' besiegt ' + esc(foe.name) + '.</p>' + aufschluesselung(m) +
    '<p>Prämie: <b>' + fmt(m.prize) + ' Denare</b> · Ruhm <b>+' + m.ruhmGain + '</b></p>' + aufgabenErgHTML(m) +
    (m.kind === 'rival' ? '' : '<div class="daumen">' + daumenSVG(m.crowdMercy) + '<div><span class="hinweis">Das Publikum fordert</span><br><strong class="' + (m.crowdMercy ? 'hoch' : 'runter') + '">' + (m.crowdMercy ? 'Gnade' : 'Tod') + '</strong>' +
      '<p class="hinweis">Folgst du dem Urteil, gibt es +1 Ruhm. Entscheidest du dagegen, sinkt für 3 Kämpfe die Gnade für deine eigenen Kämpfer.</p></div></div>') +
    (extra ? '<p class="hinweis">' + extra + '</p>' : '') +
    '<div class="wahlen">' + ch.map(function (c) {
      var folgt = (c === 'gnade' && m.crowdMercy) || (c === 'toeten' && !m.crowdMercy);
      var gegen = (c === 'gnade' && !m.crowdMercy) || (c === 'toeten' && m.crowdMercy);
      return '<button class="wahl-knopf" data-act="choose" data-c="' + c + '"><b>' + CHOICE_TXT[c][0] + '</b><span>' + CHOICE_TXT[c][1] + '</span>' +
        (m.kind !== 'rival' && folgt ? '<em>Folgt dem Publikum: +1 Ruhm</em>' : '') + (m.kind !== 'rival' && gegen ? '<em>Gegen das Publikum: Missgunst</em>' : '') + '</button>';
    }).join('') + '</div></div>';
}
function urteilHTML(m) {
  var foe = m.foeSnap || m.foe, p = lossChance(m, ui.don);
  var dons = '<button data-act="don" data-d="-1" aria-pressed="' + (ui.don == null) + '"' + (ui.suspense ? ' disabled' : '') + '>Keine</button>' + DONATIONS.map(function (d, i) {
    return '<button data-act="don" data-d="' + i + '" aria-pressed="' + (ui.don === i) + '"' + (S.gold < d.c || ui.suspense ? ' disabled' : '') + '>' + d.c + ' Den.<small>+' + d.p + ' %</small></button>';
  }).join('');
  function sg(v) { return (v >= 0 ? '+' : '−') + Math.abs(v); }
  return '<div class="ergebnis niederlage"><h3>Niederlage</h3><p>' + esc(foe.name) + ' besiegt ' + esc(m.gname) + '. Dein Kämpfer liegt im Sand, das Publikum erhebt sich.</p>' + aufschluesselung(m) +
    '<div class="daumen" style="flex-wrap:wrap"><div><span class="hinweis">Chance auf Gnade</span><div class="gross zahl">' + p.total + ' %</div></div>' +
    '<div class="aufschluesselung"><span>Aus der Spannung <b>' + p.base + ' %</b></span><span>Beliebtheit <b>' + sg(p.fame) + '</b></span><span>Persönlichkeit <b>' + sg(p.pers) + '</b></span><span>Publikum (' + RANKS[rankIdx()].n + ') <b>' + sg(p.crowd) + '</b></span>' +
      (p.missgunst ? '<span>Missgunst <b>' + p.missgunst + '</b></span>' : '') + '<span>Spende <b>+' + p.donation + '</b></span><span>Zuschläge zusammen höchstens ±20</span></div></div>' +
    '<div class="feld"><span id="donLbl">SPENDE AN DAS PUBLIKUM</span><div class="segment" role="group" aria-labelledby="donLbl">' + dons + '</div></div>' +
    (ui.suspense ? '<p class="spannung-text" role="status">Das Publikum entscheidet …</p>' : '<div class="knopfreihe"><button class="knopf gross-k" data-act="verdict">Urteil abwarten</button></div>') + '</div>';
}
function ergebnisHTML(m) {
  var foe = m.foeSnap || m.foe, head, cls;
  if (m.kind === 'aufstieg') { head = m.win ? 'Aufgestiegen' : 'Prüfung nicht bestanden'; cls = m.win ? 'sieg' : 'niederlage'; }
  else if (m.win) { head = m.lethal ? 'Sieg' : 'Sieg im Schaukampf'; cls = 'sieg'; }
  else { head = !m.lethal ? 'Niederlage im Schaukampf' : m.mercy ? 'Begnadigt' : 'Gefallen'; cls = 'niederlage'; }
  var v = '';
  if (!m.win && m.lethal) v = '<div class="daumen">' + daumenSVG(m.mercy) + '<div><strong class="' + (m.mercy ? 'hoch' : 'runter') + '">' + (m.mercy ? 'Daumen hoch' : 'Daumen runter') + '</strong><p class="hinweis">Die Chance auf Gnade lag bei ' + m.verdictP + ' %' + (m.donated ? ' (mit Spende von ' + m.donated + ' Denaren)' : '') + '.</p></div></div>';
  var lines = (m.win ? ['Prämie: ' + fmt(m.prize) + ' Denare · Ruhm +' + m.ruhmGain] : ['Trostgeld: 15 Denare']).concat(m.msgs || []);
  return '<div class="ergebnis ' + cls + '"><h3>' + head + '</h3><p>' + esc(m.win ? m.gname + ' besiegt ' + foe.name + '.' : foe.name + ' besiegt ' + m.gname + '.') + '</p>' + aufschluesselung(m) + v + aufgabenErgHTML(m) +
    '<ul>' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
    '<div class="knopfreihe"><button class="knopf gross-k" data-act="weiter">Weiter</button></div></div>';
}
function statischerZustand(m) {
  var ev = m.events, last = ev && ev.length ? ev[ev.length - 1] : null, n = kNamen(m), verl = m.win ? n.b : n.a;
  return { tore: true, pos: true, hpA: m.sum.hpA, hpB: m.sum.hpB, stA: last ? last.stA : 1, stB: last ? last.stB : 1, runde: m.sum.rounds, sp: m.spann,
    ticker: verl + ' liegt im Sand.', log: ev ? ev.filter(function (e) { return e.t !== 'rd'; }) : [], ohneLog: !ev, muede: {}, liegt: m.win ? 'b' : 'a' };
}

ANSICHT.arena = function () {
  if (ui.kampf) return;
  var m = (S.match && S.match.stage !== 'done') ? S.match : ui.lastMatch;
  if (m) {
    if (!m.me) { var mg = byId(m.gid); m.me = mg ? JSON.parse(JSON.stringify(mg)) : { name: m.gname, eq: m.foe.eq, rar: 'common', type: m.foe.type, lv: { w: 0, a: 0, s: 0 }, skin: 0 }; }
    var view = kameraAnsicht();
    if (!(ui.buehne && ui.buehne.m === m && ui.buehne.view === view && $('#buehne'))) {
      var alt = ui.buehne && ui.buehne.m === m ? ui.buehne.urteil : null;
      $('#arenaBox').innerHTML = '<div class="kampfplatz"><div id="buehneHalter">' + buehneHTML(view, m, statischerZustand(m)) + '</div><div id="arenaUnten"></div></div>';
      ui.buehne = { m: m, view: view, urteil: null };
      if (alt) kUrteil(alt);
      else if (m.stage === 'decide' && m.kind !== 'rival' && m.lethal) { var fn = kNamen(m).b.toUpperCase(); kUrteil({ cls: m.crowdMercy ? 'gnade' : 'tod', hoch: m.crowdMercy, klein: 'DAS PUBLIKUM FORDERT', gross: m.crowdMercy ? 'GNADE FÜR ' + fn : 'DEN TOD VON ' + fn, wo: 'b' }); }
    }
    $('#arenaUnten').innerHTML = m.stage === 'decide' ? entscheidungHTML(m) : m.stage === 'verdict' ? urteilHTML(m) : ergebnisHTML(m);
    return;
  }
  ui.buehne = null;
  $('#arenaBox').innerHTML = vorkampfHTML();
};

/* ---------- Aktionen der Arena ---------- */
AKT.kfighter = function (el) { S.fighter = el.value; ui.estKey = ''; save(); ANSICHT.arena(); };
AKT.diff = function (el) { S.diff = +el.dataset.d; ui.opp = null; ui.estKey = ''; save(); ANSICHT.arena(); };
AKT.reroll = function () {
  var r = gegnerTauschen(); if (r.err) { toast(r.err); return; }
  ui.opp = null; ui.estKey = '';
  toast('Das Publikum pfeift: Du kneifst vor ' + r.alt + '. −' + r.kosten.gold + ' Denare' + (r.kosten.ruhm ? ', −' + r.kosten.ruhm + ' Ruhm' : '') + '.');
  save(); renderKopf(); ANSICHT.arena();
};
AKT.scout = function () {
  var f = arenaGegner(); if (!f || S.gold < SCOUT_COST) { toast('Nicht genug Denare.'); return; }
  S.gold -= SCOUT_COST; f.scouted = true;
  if (!ui.target) { aktuellerGegner().foe.scouted = true; ui.opp = null; }
  save(); renderKopf(); ANSICHT.arena();
};
AKT.aufstieg = function (el) {
  var g = byId(el.dataset.id); if (!g) return;
  var info = aufstiegInfo(g); if (!info.bereit) { toast(info.grund); return; }
  S.fighter = g.id; ui.target = { kind: 'aufstieg', id: g.id }; ui.estKey = ''; ui.vertrag = null;
  if (ui.lastMatch && !ui.kampf) { ui.lastMatch = null; ui.buehne = null; }
  save();
  if (ui.tab === 'arena') renderAll(); else zeige('arena');
};
/* Feier nach einem gewonnenen Aufstiegskampf */
function zeigeAufstieg(g, au) {
  if (!g) return;
  var rc = GLOW[g.rar];
  walkWeg();
  document.body.insertAdjacentHTML('beforeend', '<div class="walk" id="walk" role="dialog" aria-modal="true" aria-label="Aufstieg zu ' + RAR[g.rar].name + '">' +
    '<div class="strahl" style="background:repeating-conic-gradient(' + rc + ' 0deg 6deg, transparent 6deg 17deg)"></div>' +
    '<div class="typ rein">AUFSTIEG</div>' +
    '<div class="selt-gross rein" style="color:' + rc + ';animation-delay:.25s">' + RAR[g.rar].name.toUpperCase() + '</div>' +
    '<div class="rein" style="animation-delay:.7s">' + karteHTML(g, { gr: 'l', ohneStatus: true }).replace('class="karte', 'style="box-shadow:0 0 60px ' + rc + '" class="karte') + '</div>' +
    '<p class="rein" style="animation-delay:1s;max-width:440px">' + esc(g.name + ': ' + RAR[au.von].name + ' → ' + RAR[au.nach].name + '. Neue Obergrenze ' + capOf(g) + ' pro Wert.') + '</p>' +
    '<button class="knopf rein" style="animation-delay:1.2s" data-act="aufstiegZu" id="walkWeiter">Weiter</button></div>');
  document.body.classList.add('gesperrt');
  setTimeout(function () { var b = $('#walkWeiter'); if (b) b.focus({ preventScroll: true }); }, 60);
}
AKT.aufstiegZu = function () { walkWeg(); };
AKT.rest = function () {
  if (S.gold < 10 && S.roster.some(function (x) { return !x.inj; })) { toast('Nicht genug Denare.'); return; }
  S.gold = Math.max(0, S.gold - 10);
  S.roster.forEach(function (x) { if (x.inj > 0) x.inj--; x.moral = clamp(x.moral + 2, 0, 100); });
  chron('info', 'Ruhetag im Ludus. Die Verletzten erholen sich.');
  toast('Ruhetag: Verletzungen heilen um einen Kampf.'); save(); renderAll();
};
AKT.choose = function (el) {
  if (!S.match || S.match.stage !== 'decide') return;
  var m = S.match, n = kNamen(m).b.toUpperCase(), c = el.dataset.c;
  decideWin(m, c); S.match = null; ui.lastMatch = m; save();
  var u = {
    gnade: { cls: 'gnade', hoch: true, gross: 'GNADE FÜR ' + n },
    toeten: { cls: 'tod', hoch: false, gross: n + ' STIRBT IM SAND' },
    demuetigen: { cls: 'tod', hoch: null, gross: n + ' WIRD GEDEMÜTIGT' },
    gehen: { cls: '', hoch: null, gross: n + ' DARF GEHEN' }
  }[c];
  if (u) { u.klein = 'DEINE ENTSCHEIDUNG'; u.wo = 'b'; kUrteil(u); }
  if (c === 'toeten') { var d = $('#dunkelB'); if (d) d.style.opacity = '.75'; }
  renderAll();
};
AKT.don = function (el) { var d = +el.dataset.d; ui.don = d < 0 ? null : d; ANSICHT.arena(); };
AKT.verdict = function () {
  var m = S.match; if (!m || m.stage !== 'verdict' || ui.suspense) return;
  ui.suspense = true; ANSICHT.arena();
  kUrteil({ cls: '', hoch: null, klein: 'DIE RÄNGE ERHEBEN SICH', gross: 'DAS PUBLIKUM ENTSCHEIDET …', wo: 'a' });
  kJubel(1400);
  setTimeout(function () {
    ui.suspense = false;
    verdictLoss(m, ui.don);
    S.match = null; ui.lastMatch = m; ui.don = null;
    var n = kNamen(m).a.toUpperCase();
    kUrteil(m.mercy ? { cls: 'gnade', hoch: true, klein: 'DAUMEN HOCH', gross: n + ' ÜBERLEBT', wo: 'a' } : { cls: 'tod', hoch: false, klein: 'DAUMEN RUNTER', gross: n + ' STIRBT', wo: 'a' });
    if (!m.mercy) { var d = $('#dunkelA'); if (d) d.style.opacity = '.75'; }
    save(); renderAll();
  }, REDUCE ? 200 : 1400);
};
AKT.weiter = function () { ui.lastMatch = null; ui.buehne = null; ui.protokoll = false; renderAll(); window.scrollTo({ top: 0, behavior: 'auto' }); };
AKT.target = function (el) {
  if (el.dataset.kind === 'rival' && rivalState(el.dataset.id).beaten === 0 && S.roster.length >= slotsMax()) toast('Hinweis: Dein Kader ist voll. Statt eines Schülers gäbe es Denare.');
  ui.target = { kind: el.dataset.kind, id: el.dataset.id }; ui.estKey = '';
  if (ui.lastMatch && !ui.kampf) { ui.lastMatch = null; ui.buehne = null; }
  if (ui.tab === 'arena') renderAll(); else zeige('arena');
};
AKT.untarget = function () {
  if (ui.target && ui.target.challenge) { S.challenge = null; loseRuhm(1); toast('Du ziehst zurück: −1 Ruhm.'); save(); }
  ui.target = null; ui.estKey = ''; renderAll();
};
