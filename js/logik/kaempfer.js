/*
 * Blutsand · Spiellogik · Kämpfer und Gegner erzeugen
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
/* ---------- Kämpfer erzeugen ---------- */
var FIRST = ['Marcus', 'Darius', 'Kaelan', 'Brutus', 'Orsus', 'Varro', 'Tarkan', 'Lucan', 'Silas', 'Ragnar', 'Cassian', 'Drusus', 'Fenris', 'Anuk', 'Zeno', 'Corvin', 'Balbus', 'Ostar', 'Flavus', 'Tiro', 'Spurius', 'Hektor', 'Barca', 'Galen', 'Ulrik', 'Askan', 'Ferox', 'Septimus', 'Kadmos', 'Tullus', 'Severin', 'Quintus', 'Bran', 'Iskander', 'Otho', 'Rufus'];
var EPI = ['der Eiserne', 'Steinfaust', 'der Wolf', 'Blutläufer', 'der Stille', 'Sandbrecher', 'Narbengesicht', 'Rabenauge', 'Löwenherz', 'der Unbeugsame', 'Knochenbrecher', 'der Fuchs', 'Sturmhand', 'Eisenzahn', 'der Schatten', 'Dornherz', 'der Bär', 'Kettenreißer', 'Staubkönig', 'der Rote', 'Sichelhand', 'der Kalte'];
function genName() { return pick(FIRST) + ' ' + pick(EPI); }

function distStats(total, type, jitter) {
  var b = TYPES[type].b, w = {}, sum = 0, out = {};
  STATS.forEach(function (s) { var k = s[0]; w[k] = Math.max(0.3, 1 + b[k] * 0.07 + (jitter ? (rng() - 0.5) * 0.5 : 0)); sum += w[k]; });
  STATS.forEach(function (s) { var k = s[0]; out[k] = Math.max(3, Math.round(total * w[k] / sum)); });
  return out;
}
function baseFighter(o) {
  return { id: o.id, name: o.name || genName(), rar: o.rar, type: o.type, eq: o.eq, lv: o.lv || { w: 0, a: 0, s: 0 },
    pers: o.pers || genPers(o.rar), fame: o.fame || 0, moral: 60, inj: 0, scars: 0, tmp: [], skin: rnd(0, 3),
    wins: 0, losses: 0, kills: 0, str: 3, spd: 3, end: 3, tec: 3 };
}
function makeGlad(rar, o) {
  o = o || {};
  var type = o.type || pick(TYPE_KEYS);
  var g = baseFighter({ id: 'g' + uid(), name: o.name, rar: rar, type: type, eq: o.eq ? eqFrom(o.eq) : randSpec(type), pers: o.pers });
  var R = RAR[rar];
  STATS.forEach(function (s) { g[s[0]] = Math.max(3, rnd(R.min, R.max) + TYPES[type].b[s[0]]); });
  return g;
}
function gearLvFor(p) { var l = clamp(Math.floor((p - 50) / 35), 0, 5); return { w: l, a: l, s: l }; }
function makeFoe(pw, o) {
  o = o || {};
  var type = o.type || pick(TYPE_KEYS), rar = rarFor(pw);
  var f = baseFighter({ id: 'f' + uid(), name: o.name, rar: rar, type: type, eq: o.eq ? eqFrom(o.eq) : randSpec(type), lv: gearLvFor(pw), pers: o.pers, fame: RAR[rar].fame });
  var st = distStats(pw, type, !o.fixed);
  STATS.forEach(function (s) { f[s[0]] = st[s[0]]; });
  f.nemesis = false; f.title = ''; f.scouted = false; f.grudge = 0;
  return f;
}
