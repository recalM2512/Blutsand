/*
 * Blutsand · Balance- und Ablauftest
 *
 * Aufruf im Projektordner:  node tests/simulation.js
 *
 * 1. Prüft, wie stark jede der 30 Ausrüstungen bei gleichen Werten ist.
 * 2. Prüft die Konter aus dem Konzept (z. B. Doppelwaffe gegen schwere Rüstung).
 * 3. Lässt einen Bot 40 komplette Partien spielen und meldet jeden Fehler.
 *
 * Die Logikdateien werden in genau der Reihenfolge geladen, die in index.html steht.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="(js\/logik\/[^"]+)"><\/script>/g)].map(m => m[1]);
const code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const L = new Function(code + `
  return { get S() { return S; }, set S(v) { S = v; }, newGame, simulate, spannParts, ALL_SPECS, eqFrom, TYPES, TYPE_KEYS,
    power, runMatch, newMatch, makeRandomOpp, decideWin, verdictLoss, winChoices, applyChoice, eventChoices, eventValid,
    buyPack, train, STATS, healthy, slotsMax, rankIdx, RANKS, smith, reequip, heal };
`)();

let failed = false;
function check(cond, msg) { if (!cond) { failed = true; console.log('FEHLER: ' + msg); } }

// 1) Ausrüstung bei gleichen Werten
function plain(c, v) {
  const type = L.TYPE_KEYS.find(t => !L.TYPES[t].typ.some(x => x.join('|') === c.join('|')));
  return { id: 'x', name: c.join(''), rar: 'rare', type, eq: L.eqFrom(c), lv: { w: 0, a: 0, s: 0 }, pers: [], fame: 0, moral: 50, tmp: [], str: v, spd: v, end: v, tec: v };
}
L.S = L.newGame();
const rows = [];
let rounds = 0, fights = 0;
for (const a of L.ALL_SPECS) {
  let w = 0, n = 0;
  for (const b of L.ALL_SPECS) for (let i = 0; i < 8; i++) {
    const r = L.simulate(plain(a, 15), plain(b, 15));
    if (r.winner === 'a') w++; n++; rounds += r.rounds; fights++;
  }
  rows.push([a.join(' '), w / n * 100]);
}
rows.sort((x, y) => y[1] - x[1]);
console.log('Stärkste Ausrüstung: ' + rows.slice(0, 3).map(r => r[0] + ' ' + r[1].toFixed(0) + ' %').join(', '));
console.log('Schwächste Ausrüstung: ' + rows.slice(-3).map(r => r[0] + ' ' + r[1].toFixed(0) + ' %').join(', '));
console.log('Durchschnittliche Runden pro Kampf: ' + (rounds / fights).toFixed(1));
check(rows[0][1] < 70 && rows[rows.length - 1][1] > 30, 'Ausrüstung ist unausgeglichen (Spanne außerhalb 30–70 %).');

// 2) Konter
function duel(a, b, n = 1500) { let w = 0; for (let i = 0; i < n; i++) if (L.simulate(plain(a, 15), plain(b, 15)).winner === 'a') w++; return w / n * 100; }
const dwVsHeavy = duel(['DW', 'LW', '–', 'LR'], ['1H', 'LW', '–', 'SR']);
const parVsDw = duel(['1H', 'LW', 'PAR', 'MR'], ['DW', 'LW', '–', 'MR']);
console.log('Doppelwaffe gegen schwere Rüstung: ' + dwVsHeavy.toFixed(0) + ' % (soll deutlich unter 50 % liegen)');
console.log('Parma gegen Doppelwaffe: ' + parVsDw.toFixed(0) + ' % (soll über 50 % liegen)');
check(dwVsHeavy < 40, 'Doppelwaffe ist gegen schwere Rüstung zu stark.');
check(parVsDw > 50, 'Parma kontert die Doppelwaffe nicht.');

// 3) Bot-Partien
let total = 0, deaths = 0;
for (let game = 0; game < 40; game++) {
  L.S = L.newGame();
  try {
    for (let f = 0; f < 200; f++) {
      const S = L.S;
      for (let k = 0; k < 5 && S.pendingEvent; k++) {
        if (!L.eventValid(S.pendingEvent)) { S.pendingEvent = null; break; }
        const ch = L.eventChoices(S.pendingEvent);
        const r = L.applyChoice(S.pendingEvent, Math.floor(Math.random() * ch.length));
        if (r && r.err) S.pendingEvent = null;
      }
      S.pendingEvent = null;
      if (S.gold > 500 && S.roster.length < L.slotsMax()) L.buyPack('holz');
      const g0 = S.roster[Math.floor(Math.random() * S.roster.length)];
      if (S.gold > 150) L.train(g0, L.STATS[Math.floor(Math.random() * 4)][0]);
      if (S.gold > 400) L.smith(S.roster[0], 'w');
      if (Math.random() < 0.02) L.reequip(S.roster[0], L.eqFrom(L.ALL_SPECS[Math.floor(Math.random() * 30)]));
      S.roster.forEach(g => { if (g.inj && S.gold > 300) L.heal(g); });
      const h = L.healthy();
      if (!h.length) { S.roster.forEach(g => g.inj = Math.max(0, g.inj - 1)); continue; }
      const g = h.sort((a, b) => L.power(b) - L.power(a))[0];
      S.fighter = g.id; S.diff = Math.random() < 0.3 ? 0 : 1;
      const roll = Math.random();
      let m;
      if (roll < 0.15) m = L.newMatch('ladder', g.id, { id: S.ladder[S.ladder.length - 1].id });
      else if (roll < 0.2 && L.rankIdx() >= 1) m = L.newMatch('rival', g.id, { id: 'gaius' });
      else m = L.newMatch('random', g.id, { foe: L.makeRandomOpp(g) });
      L.runMatch(m); total++;
      if (m.stage === 'decide') { const c = L.winChoices(m); L.decideWin(m, c[Math.floor(Math.random() * c.length)]); }
      else if (m.stage === 'verdict') { L.verdictLoss(m, null); if (!m.mercy) deaths++; }
      JSON.stringify(S);
      if (S.roster.some(x => isNaN(L.power(x)))) throw new Error('Kraft ist keine Zahl');
      if (!S.roster.length) throw new Error('Kader ist leer');
    }
  } catch (e) { check(false, 'Partie ' + game + ': ' + e.stack); break; }
}
console.log('Bot-Partien: ' + total + ' Kämpfe, ' + deaths + ' Tode (' + (deaths / total * 100).toFixed(1) + ' %)');
console.log(failed ? '\nTEST FEHLGESCHLAGEN' : '\nAlle Prüfungen bestanden.');
process.exit(failed ? 1 : 0);
