/*
 * Blutsand · Balance- und Ablauftest
 *
 * Aufruf im Projektordner:  node tests/simulation.js
 *
 * 1. Prüft, wie stark jede der 30 Ausrüstungen bei gleichen Werten ist.
 * 2. Prüft die Konter aus dem Konzept (z. B. Doppelwaffe gegen schwere Rüstung).
 * 3. Zeigt, wie stark die Arena-Gegner in jeder Liga sind.
 * 4. Prüft Aufstiegskampf und Herausforderungen.
 * 5. Lässt einen Bot 40 komplette Partien spielen und meldet jeden Fehler.
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
    openChest, signContracts, train, STATS, healthy, slotsMax, rankIdx, RANKS, smith, reequip, heal,
    LIGA, ligaRohling, aktuellerGegner, gegnerMitDiff, gegnerTauschen, aufstiegInfo, RAR_KEYS, RAR };
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

// 3) Liga-Gegner
L.S = L.newGame();
for (let r = 0; r < L.LIGA.length; r++) {
  L.S.ruhm = L.RANKS[r].min;
  const n = 600, cnt = {}; let sum = 0;
  for (let i = 0; i < n; i++) { const f = L.ligaRohling(r); sum += L.power(f); cnt[f.rar] = (cnt[f.rar] || 0) + 1; if (isNaN(L.power(f))) check(false, 'Liga-Gegner ohne Kraft'); }
  console.log('Liga ' + L.RANKS[r].n + ': Kraft im Schnitt ' + (sum / n).toFixed(0) + ' · ' + L.RAR_KEYS.filter(k => cnt[k]).map(k => L.RAR[k].name + ' ' + Math.round(cnt[k] / n * 100) + ' %').join(', '));
}
L.S = L.newGame();
const vor = L.aktuellerGegner().foe.id; L.S.diff = 0; L.gegnerMitDiff(L.aktuellerGegner().foe, 0); L.S.diff = 1;
check(L.aktuellerGegner().foe.id === vor, 'Schwierigkeit wechseln darf keinen neuen Gegner bringen.');
L.S.gold = 100; const t = L.gegnerTauschen();
check(!t.err && L.S.gold === 100 - t.kosten.gold && L.aktuellerGegner().foe.id !== vor, 'Gegner tauschen kostet nichts oder bringt keinen neuen Gegner.');

// 4) Aufstiegskampf und Herausforderungen
L.S = L.newGame();
const ag = L.S.roster[0]; ag.fame = 10; L.STATS.forEach(s => { ag[s[0]] = 20; });
check(L.aufstiegInfo(ag).bereit, 'Ein Veteran sollte zum Aufstiegskampf bereit sein.');
let versuche = 0, sperreGesehen = false;
while (ag.rar === 'common' && versuche < 40) {
  versuche++; ag.inj = 0; ag.pruefSperre = 0;
  const m = L.newMatch('aufstieg', ag.id, {}); L.runMatch(m);
  check(m.stage === 'done' && !m.lethal, 'Der Aufstiegskampf muss ohne Todesurteil enden.');
  if (!m.win) sperreGesehen = sperreGesehen || ag.pruefSperre > L.S.fights;
  check(!L.S.pruefung, 'Der Prüfer muss nach dem Kampf verschwinden.');
}
check(ag.rar === 'rare', 'Nach einem gewonnenen Aufstiegskampf muss der Kämpfer Selten sein.');
console.log('Aufstieg Gewöhnlich → Selten nach ' + versuche + ' Versuch(en).');
L.S = L.newGame();
const schwach = L.S.roster[0]; schwach.fame = 10; L.STATS.forEach(s => { schwach[s[0]] = 6; });
for (let i = 0; i < 20 && !sperreGesehen; i++) {
  schwach.inj = 0; schwach.pruefSperre = 0;
  const m = L.newMatch('aufstieg', schwach.id, {}); L.runMatch(m);
  if (!m.win) sperreGesehen = schwach.pruefSperre > L.S.fights && !L.aufstiegInfo(schwach).bereit;
}
check(sperreGesehen, 'Nach einem verlorenen Aufstiegskampf muss eine Sperre gelten.');
L.S = L.newGame();
let erfuellt = 0, bonusGold = 0;
for (let i = 0; i < 300; i++) {
  const g = L.S.roster[0]; g.inj = 0; L.S.match = null;
  const G = L.aktuellerGegner(), m = L.newMatch('random', g.id, { foe: L.gegnerMitDiff(G.foe, 0), aufgaben: G.aufgaben });
  const vorher = L.S.gold; L.runMatch(m);
  if (m.stage === 'decide') L.decideWin(m, 'gnade'); else if (m.stage === 'verdict') L.verdictLoss(m, null);
  check(m.aufgabenErg && m.aufgabenErg.length === 2 && m.aufgabenErg.every(a => a.gold > 0), 'Herausforderungen fehlen oder haben kein Gold.');
  m.aufgabenErg.forEach(a => { if (a.ok) { erfuellt++; bonusGold += a.gold; } });
  if (!L.S.roster.length) break;
  L.S.pendingEvent = null;
}
console.log('Herausforderungen: ' + erfuellt + ' geschafft, zusammen ' + bonusGold + ' Bonusdenare.');

// 5) Bot-Partien
let total = 0, deaths = 0, aufstiege = 0, rangSumme = 0;
const proLiga = L.RANKS.map(() => ({ n: 0, w: 0, tot: 0 }));
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
      if (S.gold > 500 && S.roster.length < L.slotsMax()) { const o = L.openChest('holz'); if (!o.err) { const r = L.signContracts([Math.floor(Math.random() * 5)]); if (r.err) throw new Error(r.err); } }
      const g0 = S.roster[Math.floor(Math.random() * S.roster.length)];
      if (S.gold > 150) L.train(g0, L.STATS[Math.floor(Math.random() * 4)][0]);
      const best = S.roster.slice().sort((a, b) => L.power(b) - L.power(a))[0];
      for (let k = 0; k < 3 && S.gold > 120; k++) L.train(best, L.STATS[Math.floor(Math.random() * 4)][0]);
      if (S.gold > 400) L.smith(S.roster[0], 'w');
      if (Math.random() < 0.02) L.reequip(S.roster[0], L.eqFrom(L.ALL_SPECS[Math.floor(Math.random() * 30)]));
      S.roster.forEach(g => { if (g.inj && S.gold > 300) L.heal(g); });
      const h = L.healthy();
      if (!h.length) { S.roster.forEach(g => g.inj = Math.max(0, g.inj - 1)); continue; }
      const g = h.sort((a, b) => L.power(b) - L.power(a))[0];
      S.fighter = g.id;
      // Wie ein vernünftiger Spieler: viel zu starke Gegner tauschen, bei starken Gegnern auf Leicht gehen
      for (let k = 0; k < 2 && L.power(L.aktuellerGegner().foe) > L.power(g) * 1.3 && S.gold > 60; k++) L.gegnerTauschen();
      const pf = L.power(L.aktuellerGegner().foe), pg = L.power(g);
      S.diff = pf <= pg * 0.9 && L.rankIdx() >= 1 && Math.random() < 0.3 ? 2 : pf <= pg * 1.05 ? 1 : 0;
      const roll = Math.random();
      let m;
      if (roll < 0.15) m = L.newMatch('ladder', g.id, { id: S.ladder[S.ladder.length - 1].id });
      else if (roll < 0.2 && L.rankIdx() >= 1) m = L.newMatch('rival', g.id, { id: 'gaius' });
      else if (L.aufstiegInfo(g).bereit && Math.random() < 0.5) m = L.newMatch('aufstieg', g.id, {});
      else {
        if (Math.random() < 0.05) L.gegnerTauschen();
        const G = L.aktuellerGegner();
        m = L.newMatch('random', g.id, { foe: L.gegnerMitDiff(G.foe, S.diff), aufgaben: G.aufgaben });
      }
      const liga = L.rankIdx();
      L.runMatch(m); total++;
      if (m.kind === 'random') { proLiga[liga].n++; if (m.win) proLiga[liga].w++; }
      if (m.aufgestiegen) aufstiege++;
      if (m.stage === 'decide') { const c = L.winChoices(m); L.decideWin(m, c[Math.floor(Math.random() * c.length)]); }
      else if (m.stage === 'verdict') { L.verdictLoss(m, null); if (!m.mercy) { deaths++; proLiga[liga].tot++; } }
      JSON.stringify(S);
      if (S.roster.some(x => isNaN(L.power(x)))) throw new Error('Kraft ist keine Zahl');
      if (!S.roster.length) throw new Error('Kader ist leer');
    }
    rangSumme += L.rankIdx();
  } catch (e) { check(false, 'Partie ' + game + ': ' + e.stack); break; }
}
console.log('Bot-Partien: ' + total + ' Kämpfe, ' + deaths + ' Tode (' + (deaths / total * 100).toFixed(1) + ' %), ' + aufstiege + ' Aufstiege, Rang am Ende im Schnitt ' + (rangSumme / 40).toFixed(1));
console.log('Siegquote in Zufallskämpfen je Liga: ' + proLiga.map((x, i) => x.n ? L.RANKS[i].n + ' ' + Math.round(x.w / x.n * 100) + ' % (' + x.n + ' Kämpfe, ' + x.tot + ' Tote)' : null).filter(Boolean).join(' · '));
console.log(failed ? '\nTEST FEHLGESCHLAGEN' : '\nAlle Prüfungen bestanden.');
process.exit(failed ? 1 : 0);
