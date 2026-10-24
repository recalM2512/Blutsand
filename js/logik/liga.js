/*
 * Blutsand · Spiellogik · Ligen, Gegnersuche und Herausforderungen
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 *
 * Arena-Gegner richten sich nach der Liga (= Rang des Ludus), nicht nach deinem Kämpfer.
 * Ihre Seltenheit wird ausgewürfelt, höhere Ligen haben seltenere und besser trainierte Gegner.
 * Der aktuelle Gegner bleibt gespeichert, bis gekämpft oder (gegen Denare und Ruhm) neu gesucht wird.
 */
var LIGA = [
  { rar: { common: 78, rare: 20, epic: 2 }, t: -2 },                   // Hinterhof
  { rar: { common: 55, rare: 35, epic: 9, legendary: 1 }, t: 0 },      // Provinzarena
  { rar: { common: 30, rare: 45, epic: 22, legendary: 3 }, t: 4 },     // Stadtarena
  { rar: { common: 10, rare: 40, epic: 40, legendary: 10 }, t: 9 },    // Große Arena
  { rar: { rare: 25, epic: 50, legendary: 25 }, t: 15 }                // Kolosseum
];
function ligaQuoten(r) {
  var L = LIGA[r];
  return RAR_KEYS.filter(function (k) { return L.rar[k]; }).map(function (k) { return RAR[k].name + ' ' + String(L.rar[k]).replace('.', ',') + ' %'; }).join(' · ');
}
/* Ein Gegner der Liga r. Werte aus seiner Seltenheit plus Liga-Training. faktor macht ihn stärker (z. B. für die Grube). */
function ligaRohling(r, faktor) {
  var L = LIGA[r], rar = weighted(L.rar), type = pick(TYPE_KEYS), R = RAR[rar];
  var f = baseFighter({ id: 'f' + uid(), rar: rar, type: type, eq: randSpec(type), pers: genPers(rar), fame: R.fame });
  STATS.forEach(function (s) { f[s[0]] = Math.max(3, Math.round((rnd(R.min, R.max) + TYPES[type].b[s[0]] + L.t) * (faktor || 1))); });
  f.lv = gearLvFor(power(f)); f.nemesis = false; f.title = ''; f.scouted = false; f.grudge = 0;
  return f;
}
function neuerLigaGegner() {
  var f = ligaRohling(rankIdx(), S.flags.spied > 0 ? 1.08 : 1);
  if (S.flags.intel > 0) f.scouted = true;
  return { liga: rankIdx(), foe: f, aufgaben: aufgabenWuerfeln(f) };
}
/* Der gespeicherte Gegner für Zufallskämpfe. Nach einem Aufstieg in eine neue Liga gibt es kostenlos einen neuen. */
function aktuellerGegner() {
  if (!S.gegner || S.gegner.liga !== rankIdx()) S.gegner = neuerLigaGegner();
  return S.gegner;
}
/* Die Schwierigkeit verändert nur die Werte, nicht den Gegner selbst. So bringt Hin- und Herschalten keinen neuen Gegner. */
function gegnerMitDiff(foe, diffId) {
  var f = JSON.parse(JSON.stringify(foe)), fk = DIFFS[diffId].mult / DIFFS[1].mult;
  STATS.forEach(function (s) { f[s[0]] = Math.max(3, Math.round(foe[s[0]] * fk)); });
  f.lv = gearLvFor(power(f));
  return f;
}
function tauschKosten() { return { gold: 10 + 5 * rankIdx(), ruhm: S.ruhm > RANKS[rankIdx()].min ? 1 : 0 }; }
/* Neuen Gegner suchen: Das Publikum hält das für feige. */
function gegnerTauschen() {
  var k = tauschKosten();
  if (S.gold < k.gold) return { err: 'Nicht genug Denare, um einen anderen Gegner zu suchen.' };
  S.gold -= k.gold; if (k.ruhm) loseRuhm(k.ruhm);
  var alt = S.gegner ? S.gegner.foe.name : 'deinem Gegner';
  S.gegner = neuerLigaGegner();
  return { kosten: k, alt: alt };
}

/* ---------- Herausforderungen: Bonusgold für einen Sieg unter einer Bedingung ---------- */
var AUFGABEN = {
  gewoehnlich: { p: 1.0, vor: true, t: function () { return 'Siege mit einem gewöhnlichen Kämpfer'; }, ok: function (a, g) { return g.rar === 'common'; } },
  doppel: { p: 0.6, vor: true, t: function () { return 'Siege mit zwei Waffen (DW)'; }, ok: function (a, g) { return g.eq.grip === 'DW'; } },
  zweihand: { p: 0.5, vor: true, t: function () { return 'Siege mit einer Zweihandwaffe (2H)'; }, ok: function (a, g) { return g.eq.grip === '2H'; } },
  ohneschild: { p: 0.5, vor: true, t: function () { return 'Siege ohne Schild'; }, ok: function (a, g) { return g.eq.shield === '–'; } },
  leicht: { p: 0.5, vor: true, t: function () { return 'Siege in leichter Rüstung (LR)'; }, ok: function (a, g) { return g.eq.armor === 'LR'; } },
  schwer: { p: 0.4, vor: true, t: function () { return 'Siege mit einer schweren Waffe (SW)'; }, ok: function (a, g) { return g.eq.weapon === 'SW'; } },
  rekrut: { p: 0.7, vor: true, t: function () { return 'Siege mit einem Rekruten (unter 10 Ruhm)'; }, ok: function (a, g) { return fameLevel(g.fame) === 0; } },
  schwaecher: { p: 0.8, vor: true, t: function () { return 'Siege mit einem schwächeren Kämpfer'; }, ok: function (a, g, m, foe) { return power(g) < power(foe); } },
  typ: { p: 0.4, vor: true, t: function (a) { return 'Siege mit einem ' + a.typ; }, ok: function (a, g) { return g.type === a.typ; } },
  haelfte: { p: 0.5, vor: false, t: function () { return 'Siege mit mindestens halbem Leben'; }, ok: function (a, g, m) { return m.sum.hpA / m.sum.mhpA >= 0.5; } },
  schnell: { p: 0.6, vor: false, t: function () { return 'Siege in höchstens 6 Runden'; }, ok: function (a, g, m) { return m.sum.rounds <= 6; } },
  spannend: { p: 0.5, vor: false, t: function () { return 'Siege mit einer Spannung von 60 oder mehr'; }, ok: function (a, g, m) { return m.spann >= 60; } }
};
function aufgabenWuerfeln() {
  var ids = Object.keys(AUFGABEN), out = [];
  while (out.length < 2 && ids.length) {
    var id = ids.splice(Math.floor(rng() * ids.length), 1)[0], a = { id: id };
    if (id === 'typ') a.typ = pick(TYPE_KEYS);
    out.push(a);
  }
  return out;
}
function aufgabeText(a) { return AUFGABEN[a.id].t(a); }
function aufgabeVorab(a) { return AUFGABEN[a.id].vor; }
/* m darf fehlen, solange die Bedingung nur vom Kämpfer abhängt (vor dem Kampf prüfbar). */
function aufgabeOk(a, g, m, foe) { return !!AUFGABEN[a.id].ok(a, g, m, foe); }
function aufgabeGold(a, prize) { return Math.max(10, Math.round(prize * AUFGABEN[a.id].p)); }
/* Nach einem Zufallskampf: Bonusgold auszahlen und das Ergebnis jeder Herausforderung merken. */
function aufgabenAuswerten(m, g, prize) {
  m.aufgabenErg = (m.aufgaben || []).map(function (a) {
    var ok = m.win && aufgabeOk(a, g, m, m.foe), gold = aufgabeGold(a, prize);
    if (ok) S.gold += gold;
    return { t: aufgabeText(a), gold: gold, ok: ok };
  });
}
