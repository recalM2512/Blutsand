/*
 * Blutsand · Spiellogik · Ablauf eines Kampfes: Belohnung, Urteil, Tod, Missio
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
/* ---------- Ablauf nach jedem Kampf ---------- */
function tick(gid) {
  S.roster.forEach(function (g) {
    if (g.inj > 0) g.inj--;
    g.tmp = (g.tmp || []).filter(function (t) { t.f--; return t.f > 0; });
    g.pers = g.pers.filter(function (p) { if (p.ttl == null) return true; p.ttl--; return p.ttl > 0; });
    if (g.id !== gid) g.moral += g.moral < 55 ? 1 : g.moral > 65 ? -1 : 0;
  });
  if (S.missgunst > 0) S.missgunst--;
  S.ladder.forEach(function (f) {
    if (chance(f.nemesis ? 0.5 : 0.1)) { growFoe(f, 1); if (f.nemesis) f.fame = (f.fame || 0) + 1; }
  });
  sortLadder();
}

function makeRandomOpp(g) {
  var d = DIFFS[S.diff];
  var spied = S.flags.spied > 0 ? 1.08 : 1;
  var f = makeFoe(Math.max(20, Math.round(power(g) * d.mult * (0.93 + rng() * 0.12) * spied)));
  if (S.flags.intel > 0) { f.scouted = true; }
  return f;
}
function consumeOppFlags() {
  if (S.flags.spied > 0) S.flags.spied--;
  if (S.flags.intel > 0) S.flags.intel--;
}

function newMatch(kind, gid, ref) {
  var m = { kind: kind, gid: gid, diff: S.diff, stage: 'pre' };
  if (kind === 'random') { m.foe = ref.foe; m.lethal = DIFFS[S.diff].lethal; }
  else if (kind === 'ladder') { m.foe = ladderById(ref.id); m.foeId = ref.id; m.lethal = true; m.challenge = !!ref.challenge; }
  else if (kind === 'rival') { m.rivalId = ref.id; m.foe = rivalFighter(ref.id); m.lethal = true; }
  return m;
}
function matchReward(m, g) {
  var foe = m.foe, rb = 1 + 0.05 * rankIdx(), fx = fxOf(g), pay, ruhm;
  if (m.kind === 'random') { var d = DIFFS[m.diff]; pay = d.pay; ruhm = d.ruhm; }
  else if (m.kind === 'ladder') {
    var place = ladderPlace(foe.id) || 8;
    pay = 1.4; ruhm = place <= 2 ? 5 : place <= 5 ? 3 : 2;
    if (foe.nemesis) ruhm += 1;
    if (m.challenge) { pay *= 1.5; ruhm += 2; }
  } else {
    var R = RIVALS.filter(function (r) { return r.id === m.rivalId; })[0], first = !rivalState(R.id).beaten;
    pay = first ? 2.5 : 1.3; ruhm = first ? 8 + R.rank * 2 : 3;
  }
  if (power(foe) >= power(g) * 1.2) ruhm += 1;
  return { prize: Math.round((30 + power(foe) * 0.7) * pay * rb * (1 + fx.prize)), ruhm: ruhm };
}
function runMatch(m) {
  var g = byId(m.gid), foe = m.foe;
  var res = simulate(g, foe, {
    friendsA: friendsOf(g).filter(function (x) { return !x.inj; }).length,
    rivalsA: rivalsOf(g).filter(function (x) { return !x.inj; }).length
  });
  var sp = spannParts(res);
  m.res = res; m.win = res.winner === 'a'; m.sp = sp; m.spann = sp.total;
  m.sum = { hpA: res.hpA, hpB: res.hpB, mhpA: res.mhpA, mhpB: res.mhpB, rounds: res.rounds };
  m.msgs = []; m.gname = g.name;
  if (m.kind === 'random') consumeOppFlags();
  var rw = matchReward(m, g);
  S.fights++;
  tick(g.id);
  if (m.win) {
    m.prize = Math.round(rw.prize * (1 + m.spann / 200));
    var r = rw.ruhm + (m.spann >= 85 ? 2 : m.spann >= 60 ? 1 : 0);
    var fx = fxOf(g); if (fx.ruhm) r += Math.floor(r * fx.ruhm + rng());
    m.ruhmGain = r;
    S.gold += m.prize; S.wins++; g.wins++; g.moral = clamp(g.moral + 6, 0, 100);
    addRuhm(r); addFame(g, r);
    foe.losses = (foe.losses || 0) + 1;
    if (res.hpA / res.mhpA < 0.12 && chance(0.3)) { g.inj = Math.max(g.inj, 1); m.msgs.push(g.name + ' hat sich knapp durchgebissen und ist für 1 Kampf angeschlagen.'); }
  } else {
    m.prize = 15; m.ruhmGain = 0;
    S.gold += 15; S.losses++; g.losses++; g.moral = clamp(g.moral - 10, 0, 100);
    foe.wins = (foe.wins || 0) + 1; foe.fame = (foe.fame || 0) + 3;
  }
  foe.scouted = true;
  if (m.kind === 'rival') { var st = rivalState(m.rivalId); if (m.win) st.beaten++; else st.lost++; }
  if (!m.lethal) {
    m.stage = 'done';
    if (!m.win && chance(0.25)) { g.inj = Math.max(g.inj, 1); m.msgs.push(g.name + ' hat sich im Schaukampf leicht verletzt (1 Kampf Pause).'); }
    afterMatch(m);
  } else if (m.win) {
    m.stage = 'decide';
    m.crowdP = gnadeParts(foe, m.spann, { own: false }).total;
    m.crowdMercy = chance(m.crowdP / 100);
  } else {
    m.stage = 'verdict';
  }
  m.events = res.events; delete m.res;
  return m;
}
function scarG(g) {
  g.scars = (g.scars || 0) + 1;
  var k = pick(STATS)[0]; g[k] = Math.max(3, g[k] - 1);
  return g.name + ' behält eine Narbe (−1 ' + STAT_NAME[k] + ').';
}
function winChoices(m) {
  if (m.kind === 'rival') return ['gnade', 'demuetigen', 'gehen'];
  if (m.foe.nemesis) return ['gnade', 'demuetigen', 'gehen', 'toeten'];
  return ['gnade', 'toeten'];
}
var CHOICE_TXT = {
  gnade: ['Gnade gewähren', 'Der Gegner überlebt.'],
  toeten: ['Töten', 'Der Gegner stirbt in der Arena.'],
  demuetigen: ['Demütigen', 'Mehr Ruhm, aber er sinnt auf Rache.'],
  gehen: ['Gehen lassen', 'Er zieht ab und kehrt irgendwann zurück.']
};
function liveFoe(m) { return (m.kind === 'ladder' || m.foe.nemesis) ? (ladderById(m.foe.id) || m.foe) : m.foe; }
function decideWin(m, choice) {
  var g = byId(m.gid), foe = liveFoe(m), msgs = m.msgs;
  var follow = (choice === 'gnade' && m.crowdMercy) || (choice === 'toeten' && !m.crowdMercy);
  var against = (choice === 'gnade' && !m.crowdMercy) || (choice === 'toeten' && m.crowdMercy);
  if (follow) { addRuhm(1); if (g) addFame(g, 1); msgs.push('Das Publikum jubelt, weil du seinem Urteil folgst: +1 Ruhm.'); }
  if (against) { S.missgunst = 3; msgs.push('Das Publikum ist verärgert. Für 3 Kämpfe sinkt die Gnade für deine eigenen Kämpfer (Missgunst).'); }
  var narrow = m.sum.hpA / m.sum.mhpA <= 0.25;
  if (m.kind === 'rival') {
    var R = RIVALS.filter(function (r) { return r.id === m.rivalId; })[0], st = rivalState(R.id);
    if (st.beaten === 1) {
      var d = makeGlad(R.reward, { type: R.type, eq: R.eq });
      if (S.roster.length < slotsMax()) { addFighter(d, true); msgs.push(d.name + ', ein Schüler von ' + R.name + ', schließt sich deinem Ludus an (' + RAR[d.rar].name + ').'); chron('neu', d.name + ' kommt als Schüler von ' + R.name + ' in deinen Ludus.'); }
      else { S.gold += sellValue(d); msgs.push('Dein Kader ist voll. Statt eines Schülers erhältst du ' + sellValue(d) + ' Denare.'); }
      chron('sieg', g.name + ' besiegt den Rivalen ' + R.name + '.');
    }
    if (choice === 'demuetigen') { var ex = Math.ceil(m.ruhmGain * 0.5); addRuhm(ex); st.bonus += 6; msgs.push(R.name + ' wird gedemütigt: +' + ex + ' Ruhm. Er wird stärker zurückkehren.'); }
    else if (choice === 'gehen') { st.bonus += 2; msgs.push(R.name + ' verlässt die Arena mit gesenktem Kopf.'); }
    else msgs.push('Du reichst ' + R.name + ' die Hand. Das Publikum nickt anerkennend.');
  } else if (choice === 'toeten') {
    if (g) g.kills++;
    if (m.kind === 'ladder' || foe.nemesis) { S.ladder = S.ladder.filter(function (f) { return f.id !== foe.id; }); refillLadder(); }
    if (foe.nemesis) {
      addRuhm(2); msgs.push('Dein Nemesis ' + foe.name + ' ist tot: +2 Ruhm.');
      S.roster.forEach(function (x) { if (hasP(x, 'rachsuechtig')) mor(x.id, 8); });
      chron('nemesis', g.name + ' tötet den Nemesis ' + foe.name + '.');
    } else msgs.push(foe.name + ' stirbt im Sand.');
  } else if (choice === 'gnade') {
    if (foe.nemesis && S.roster.length < slotsMax() && chance(0.25)) {
      S.ladder = S.ladder.filter(function (f) { return f.id !== foe.id; }); refillLadder();
      var n = cleanFoe(foe); n.id = 'g' + uid(); n.nemesis = false; n.title = ''; n.moral = 55; n.wins = 0; n.losses = 0; n.kills = 0; n.fame = 5;
      n.pers = n.pers.filter(function (p) { return p.id !== 'rachsuechtig'; });
      addFighter(n, true); msgs.push(foe.name + ' ist von deiner Gnade bewegt und schließt sich deinem Ludus an.');
      chron('nemesis', 'Der frühere Nemesis ' + foe.name + ' tritt deinem Ludus bei.');
    } else if (foe.nemesis) {
      msgs.push(foe.name + ' überlebt und zieht sich zurück.');
    } else if (narrow && chance(0.3)) {
      makeNemesis(foe, 'Rivale von ' + (g ? g.name : 'deinem Ludus'));
      msgs.push(foe.name + ' überlebt, vergisst diesen knappen Kampf aber nicht.');
    } else msgs.push(foe.name + ' überlebt und wird aus der Arena getragen.');
  } else if (choice === 'demuetigen') {
    var e2 = Math.ceil(m.ruhmGain * 0.5); addRuhm(e2);
    growFoe(foe, 4); addPers(foe, 'rachsuechtig', 2); foe.grudge = (foe.grudge || 0) + 1;
    msgs.push(foe.name + ' wird vor dem Publikum gedemütigt: +' + e2 + ' Ruhm. Er schwört Rache und kehrt stärker zurück.');
  } else if (choice === 'gehen') {
    growFoe(foe, 2); msgs.push(foe.name + ' darf gehen. Er wird zurückkommen.');
  }
  sortLadder();
  m.choice = choice; m.stage = 'done';
  afterMatch(m);
}
function lossChance(m, don) {
  var g = byId(m.gid);
  return gnadeParts(g, m.spann, { own: true, donation: don != null ? DONATIONS[don].p : 0 });
}
function verdictLoss(m, don) {
  var g = byId(m.gid), foe = liveFoe(m), msgs = m.msgs;
  if (don != null) { if (S.gold >= DONATIONS[don].c) { S.gold -= DONATIONS[don].c; m.donated = DONATIONS[don].c; } else don = null; }
  var p = lossChance(m, don).total;
  m.verdictP = p; m.mercy = chance(p / 100);
  if (m.mercy) {
    var inj = rnd(1, 3); g.inj = Math.max(g.inj, inj);
    msgs.push('Das Publikum zeigt den Daumen nach oben. ' + g.name + ' überlebt, ist aber für ' + inj + (inj === 1 ? ' Kampf' : ' Kämpfe') + ' verletzt.');
    if (chance(0.35)) msgs.push(scarG(g));
    if (m.kind !== 'rival' && !foe.nemesis && chance(0.5)) makeNemesis(foe, 'Bezwinger von ' + g.name);
    else if (foe.nemesis) { growFoe(foe, 1); }
  } else {
    killFighter(g, foe, msgs);
  }
  sortLadder();
  m.stage = 'done';
  afterMatch(m);
}
function killFighter(g, killer, msgs) {
  var friends = friendsOf(g);
  S.roster = S.roster.filter(function (x) { return x.id !== g.id; });
  S.dead.unshift({ name: g.name, type: g.type, rar: g.rar, fame: g.fame, wins: g.wins, code: codeStr(g.eq), by: killer.name, f: S.fights });
  if (S.dead.length > 60) S.dead.length = 60;
  msgs.push('Das Publikum zeigt den Daumen nach unten. ' + g.name + ' stirbt durch die Hand von ' + killer.name + '.');
  chron('tod', g.name + ' fällt in der Arena durch ' + killer.name + ' (' + g.wins + ' Siege).');
  friends.forEach(function (f) {
    mor(f.id, -15);
    if (chance(0.5) && addPers(f, 'trauernd', 2, 5)) msgs.push(f.name + ' trauert um seinen Freund (Trauernd II für 5 Kämpfe).');
  });
  if (fameLevel(g.fame) >= 2 && friends.length) {
    var h = pick(friends), best = STATS.map(function (s) { return s[0]; }).sort(function (a, b) { return g[b] - g[a]; })[0];
    h[best] = Math.min(capOf(h), h[best] + 2);
    msgs.push('Vermächtnis: ' + h.name + ' erhält +2 ' + STAT_NAME[best] + ' im Andenken an ' + g.name + '.');
  }
  purgeRel(g.id);
  if (!killer.rival) {
    var L = makeNemesis(killer, 'Schlächter von ' + g.name);
    if (L) { L.kills = (L.kills || 0) + 1; L.fame = (L.fame || 0) + 5; growFoe(L, 3); }
  }
  S.evQueue.push({ id: 'begraebnis', dead: g.name, fame: g.fame || 0 });
  ensureFighter();
  fixSelection();
}
function afterMatch(m) {
  m.msgs = m.msgs.concat(MSG.splice(0));
  if (S.challenge && m.kind === 'ladder' && m.challenge) S.challenge = null;
  fixSelection();
  if (S.evQueue.length) S.pendingEvent = buildQueued(S.evQueue.shift());
  else if (chance(0.35)) S.pendingEvent = rollEvent();
}
