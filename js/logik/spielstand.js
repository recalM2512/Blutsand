/*
 * Blutsand · Spiellogik · Neues Spiel, Kader, Beziehungen, Training, Schmiede, Umrüsten, Packs kaufen
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
/* ---------- Spielstand ---------- */
function newGame() {
  S = { v: 2, gold: 300, ruhm: 0, wins: 0, losses: 0, fights: 0, roster: [], sel: null, fighter: null, diff: 1,
    rel: {}, chron: [], dead: [], ladder: [], rivals: {}, missgunst: 0, flags: {}, pendingEvent: null, evQueue: [], match: null,
    challenge: null, pendingPack: null, savedAt: 0 };
  var a = makeGlad('common'), b = makeGlad('common');
  addFighter(a, true); addFighter(b, true);
  S.sel = a.id; S.fighter = a.id;
  [30, 38, 47, 58, 72, 88, 108, 132].forEach(function (p) { S.ladder.push(makeFoe(p)); });
  sortLadder();
  chron('info', 'Du übernimmst einen heruntergekommenen Ludus im Hinterhof. Zwei Kämpfer, 300 Denare und ein Traum.');
  return S;
}
function byId(id) { return S.roster.filter(function (g) { return g.id === id; })[0]; }
function nm(id) { var g = byId(id); return g ? g.name : 'ein Kämpfer'; }
function chron(kind, text) { S.chron.unshift({ f: S.fights, k: kind, t: text }); if (S.chron.length > 150) S.chron.length = 150; }
function rk(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
function getRel(a, b) { return S.rel[rk(a, b)] || 0; }
function setRel(a, b, v) { if (!v) delete S.rel[rk(a, b)]; else S.rel[rk(a, b)] = v; }
function friendsOf(g) { return S.roster.filter(function (x) { return x.id !== g.id && getRel(g.id, x.id) > 0; }); }
function rivalsOf(g) { return S.roster.filter(function (x) { return x.id !== g.id && getRel(g.id, x.id) < 0; }); }
function purgeRel(id) { Object.keys(S.rel).forEach(function (k) { if (k.split('|').indexOf(id) >= 0) delete S.rel[k]; }); }
function mor(id, d) { var g = byId(id); if (g) g.moral = clamp(Math.round(g.moral + d), 0, 100); }
function addFighter(g, silent) {
  var made = 0;
  S.roster.forEach(function (x) {
    if (made >= 2) return;
    if (chance(0.08)) { setRel(g.id, x.id, 1); made++; }
    else if (chance(0.05)) { setRel(g.id, x.id, -1); made++; }
  });
  g.joined = S.fights;
  S.roster.push(g);
  if (!silent) chron('neu', g.name + ' (' + RAR[g.rar].name + ', ' + g.type + ') tritt deinem Ludus bei.');
}
function healthy() { return S.roster.filter(function (g) { return !g.inj; }); }
function ensureFighter() {
  if (S.roster.length) return;
  var g = makeGlad('common');
  addFighter(g, true);
  var t = 'Dein Ludus ist leer. Ein Sklavenhändler überlässt dir ' + g.name + ' als letzte Chance.';
  chron('info', t); note(t);
}
function fixSelection() {
  if (!byId(S.sel)) S.sel = S.roster[0] ? S.roster[0].id : null;
  var f = byId(S.fighter);
  if (!f || f.inj) { var h = healthy()[0]; S.fighter = h ? h.id : (S.roster[0] ? S.roster[0].id : null); }
}

/* ---------- Training, Schmiede, Umrüsten ---------- */
function trainCost(g, k) { var v = g[k]; return Math.max(4, Math.round((8 + v * v * 0.15) * (1 + fxOf(g).train))); }
function train(g, k) {
  if (g[k] >= capOf(g)) return 'cap';
  var c = trainCost(g, k); if (S.gold < c) return 'gold';
  S.gold -= c; g[k]++; return 'ok';
}
var SMITH = [120, 220, 380, 600, 900];
var SMITH_SLOT = { w: 'Waffe', a: 'Rüstung', s: 'Schild' };
var SMITH_FX = { w: '+4 % Schaden je Stufe', a: '+2,5 % Schutz je Stufe', s: '+3 % Blockchance je Stufe' };
function smithCost(g, slot) { var l = g.lv[slot]; return l >= 5 ? null : SMITH[l]; }
function smith(g, slot) {
  if (slot === 's' && g.eq.shield === '–') return 'none';
  var c = smithCost(g, slot); if (c == null) return 'max'; if (S.gold < c) return 'gold';
  S.gold -= c; g.lv[slot]++; return 'ok';
}
function normEq(eq) { var e = { grip: eq.grip, weapon: eq.weapon, shield: eq.shield, armor: eq.armor }; if (e.grip !== '1H') e.shield = '–'; return e; }
function reequipCost(g, eq) {
  eq = normEq(eq);
  var ch = ['grip', 'weapon', 'shield', 'armor'].filter(function (k) { return g.eq[k] !== eq[k]; }).length;
  return ch ? 100 + 50 * ch : 0;
}
function reequip(g, eq) {
  eq = normEq(eq);
  var c = reequipCost(g, eq); if (!c) return 'same'; if (S.gold < c) return 'gold';
  S.gold -= c;
  if (eq.grip !== g.eq.grip || eq.weapon !== g.eq.weapon) g.lv.w = 0;
  if (eq.armor !== g.eq.armor) g.lv.a = 0;
  if (eq.shield !== g.eq.shield) g.lv.s = 0;
  g.eq = eq;
  g.tmp = g.tmp.filter(function (t) { return t.k !== 'eing'; });
  g.tmp.push({ k: 'eing', n: 'Eingewöhnung', f: 3, dmg: -0.08, hit: -0.08 });
  chron('info', g.name + ' wird umgerüstet: ' + codeStr(eq) + '.');
  return 'ok';
}
function healCost(g) { return 40 * (g.inj || 0); }
function heal(g) { var c = healCost(g); if (!c) return 'none'; if (S.gold < c) return 'gold'; S.gold -= c; g.inj = 0; return 'ok'; }
function sellValue(g) { return RAR[g.rar].sell + power(g) * 2 + (g.fame || 0) * 3; }
function sell(g) {
  if (S.roster.length <= 1) return 'last';
  if (S.match && S.match.gid === g.id) return 'busy';
  S.gold += sellValue(g);
  S.roster = S.roster.filter(function (x) { return x.id !== g.id; });
  purgeRel(g.id); fixSelection();
  chron('info', g.name + ' wurde für ' + sellValue(g) + ' Denare verkauft.');
  return 'ok';
}
function weighted(odds) {
  var total = 0, k; for (k in odds) total += odds[k];
  var r = rng() * total; for (k in odds) { r -= odds[k]; if (r <= 0) return k; }
  return Object.keys(odds)[0];
}
function chestById(id) { return PACKS.filter(function (x) { return x.id === id; })[0]; }
function openChest(id) {
  var p = chestById(id);
  if (!p || rankIdx() < p.rank) return { err: 'Diese Truhe ist noch gesperrt.' };
  if (S.pendingPack) return { err: 'Unterzeichne zuerst die offenen Verträge.' };
  if (S.gold < p.price) return { err: 'Nicht genug Denare.' };
  if (S.roster.length + p.n > slotsMax()) return { err: 'Nicht genug Kaderplätze. Löse zuerst Verträge auf oder steige im Rang auf.' };
  S.gold -= p.price;
  var list = p.pool.map(function (o) { return makeGlad(weighted(o)); });
  if (p.sure) {
    var best = Math.max.apply(null, list.map(function (g) { return RAR_KEYS.indexOf(g.rar); }));
    if (best < RAR_KEYS.indexOf(p.sure)) list[rnd(0, list.length - 1)] = makeGlad(p.sure);
  }
  S.pendingPack = { id: id, n: p.n, contracts: list };
  chron('info', p.name + ' geöffnet: fünf versiegelte Verträge liegen bereit.');
  return { pack: S.pendingPack };
}
function signContracts(picks) {
  var pp = S.pendingPack; if (!pp) return { err: 'Es gibt keine offenen Verträge.' };
  picks = picks.filter(function (i, k, a) { return i >= 0 && i < pp.contracts.length && a.indexOf(i) === k; });
  if (picks.length !== pp.n) return { err: 'Wähle genau ' + pp.n + (pp.n === 1 ? ' Vertrag.' : ' Verträge.') };
  if (S.roster.length + pp.n > slotsMax()) return { err: 'Nicht genug Kaderplätze.' };
  var got = picks.map(function (i) { var g = pp.contracts[i]; addFighter(g); return g; });
  S.pendingPack = null;
  return { got: got };
}
