/*
 * Blutsand · Spiellogik · Kampfsimulation, Spannung und Gnade-Chance
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
/* ---------- Kampf ---------- */
function combatant(g, foe, ctx) {
  var fx = fxOf(g), E = gearOf(g.eq), lv = g.lv || { w: 0, a: 0, s: 0 };
  var bonus = { dmg: fx.dmg + 0.04 * lv.w, hit: fx.hit };
  if (isTypical(g)) { bonus.dmg += 0.04; bonus.hit += 0.04; }
  var fl = fameLevel(g.fame);
  if (fl >= 2) { var fb = fl === 3 ? 0.05 : 0.03; bonus.dmg += fb; bonus.hit += fb; }
  var fr = Math.min(3, ctx.friends || 0), rv = Math.min(2, ctx.rivals || 0);
  bonus.dmg += fr * 0.01 - rv * 0.01; bonus.hit += fr * 0.01 - rv * 0.01;
  var mo = ((g.moral == null ? 60 : g.moral) - 50) / 50 * 0.06;
  bonus.dmg += mo; bonus.hit += mo;
  (g.tmp || []).forEach(function (t) { bonus.dmg += t.dmg || 0; bonus.hit += t.hit || 0; });
  if (fx.c_weaker && power(foe) >= power(g) * 1.1) { bonus.dmg += fx.c_weaker; bonus.hit += fx.c_weaker * 0.3; }
  if (fx.c_nem && foe.nemesis) { bonus.dmg += fx.c_nem; bonus.hit += fx.c_nem * 0.25; }
  var mhp = Math.round((28 + g.end * 4.5) * (1 + fx.hp));
  var mst = 40 + g.end * 2.5;
  return {
    g: g, E: E, fx: fx, bonus: bonus, lv: lv, mhp: mhp, hp: mhp, mst: mst, st: mst,
    spd: g.spd + E.armor.spd + E.shield.spd + E.grip.spd + fx.spd,
    tec: g.tec * (1 + fx.tec),
    stamCost: (3 + E.grip.stam + E.weapon.stam + E.shield.stam + E.armor.stam) * (1 + fx.stam),
    tiredShown: false
  };
}
var VERB = { LW: ['sticht', 'schlitzt', 'trifft'], SW: ['schmettert gegen', 'spaltet die Deckung von', 'trifft mit voller Wucht'] };

function simulate(ga, gb, opt) {
  opt = opt || {};
  var A = combatant(ga, gb, { friends: opt.friendsA, rivals: opt.rivalsA });
  var B = combatant(gb, ga, { friends: opt.friendsB, rivals: opt.rivalsB });
  var C = { a: A, b: B }, ev = [], round = 0, leads = [], crits = 0, lastLead = 0, leadChanges = 0, lowShown = false;
  function frac(x) { return x.hp / x.mhp; }
  function push(t, text, side) { ev.push({ t: t, text: text, hpA: A.hp, hpB: B.hp, stA: A.st / A.mst, stB: B.st / B.mst, lc: leadChanges, cr: crits, side: side || '' }); }
  function attack(at, df, k) {
    var aN = at.g.name, dN = df.g.name, o = k === 'a' ? 'b' : 'a';
    var tired = at.st < at.mst * 0.3;
    var hitCh = 0.64 + (at.spd - df.spd) * 0.012 + at.E.weapon.hit + at.bonus.hit - df.E.armor.evade - (tired ? 0.08 : 0);
    hitCh = clamp(hitCh, 0.3, 0.92);
    if (!chance(hitCh)) {
      push('miss', df.g.eq.armor === 'LR' && chance(0.5) ? dN + ' tänzelt zur Seite.' : aN + ' verfehlt ' + dN + '.', k);
      return;
    }
    var lowMul = (at.fx.c_low && frac(at) < 0.3) ? (1 - at.fx.c_low) : 1;
    var dmg = at.g.str * (0.8 + rng() * 0.4) * at.E.weapon.dmg * at.E.grip.dmg * (1 + at.bonus.dmg) * (tired ? 0.85 : 1) * lowMul;
    var crit = chance(clamp(0.05 + at.tec * 0.004 + at.E.weapon.crit + at.fx.crit, 0.02, 0.45));
    if (crit) { dmg *= 1.7; crits++; }
    var blocked = false;
    if (df.E.shield.block > 0) {
      var bc = df.E.shield.block + 0.03 * df.lv.s + df.fx.block - (df.st < df.mst * 0.3 ? 0.08 : 0);
      if (chance(clamp(bc, 0, 0.7))) { blocked = true; dmg *= 1 - df.E.shield.red; }
    }
    var p = at.E.weapon.pierce, red = Math.min(0.55, df.E.armor.red + 0.025 * df.lv.a);
    dmg = dmg * (1 - red * p) - df.E.armor.flat * p - df.tec * 0.08;
    dmg *= 1 + df.fx.taken;
    dmg = Math.max(1, Math.round(dmg));
    df.hp = Math.max(0, df.hp - dmg);
    var verb = pick(VERB[at.g.eq.weapon]);
    if (blocked) push('block', dN + ' fängt den Schlag mit dem Schild ab und nimmt nur ' + dmg + ' Schaden.', k);
    else push(crit ? 'crit' : 'hit', (crit ? 'Kritischer Treffer! ' : '') + aN + ' ' + verb + ' ' + dN + ': ' + dmg + ' Schaden.', k);
    if (crit && df.hp > 0) push('cheer', pick(['Die Menge johlt!', 'Ein Aufschrei geht durch die Ränge!', 'Die Zuschauer springen auf!']), '');
    if (blocked && df.E.shield.counter && df.hp > 0 && at.hp > 0 && chance(df.E.shield.counter)) {
      var cd = Math.max(1, Math.round(df.g.str * 0.5 * (0.8 + rng() * 0.4)));
      at.hp = Math.max(0, at.hp - cd);
      push('counter', dN + ' kontert mit der Parma: ' + cd + ' Schaden.', o);
    }
  }
  while (A.hp > 0 && B.hp > 0 && round < 40) {
    round++;
    push('rd', 'Runde ' + round);
    var order = (A.spd + rnd(0, 8)) >= (B.spd + rnd(0, 8)) ? ['a', 'b'] : ['b', 'a'];
    for (var i = 0; i < 2; i++) {
      var k = order[i], at = C[k], df = C[k === 'a' ? 'b' : 'a'];
      if (A.hp <= 0 || B.hp <= 0) break;
      for (var j = 0; j < at.E.grip.att && df.hp > 0 && at.hp > 0; j++) attack(at, df, k);
      at.st = Math.max(0, at.st - at.stamCost);
      if (!at.tiredShown && at.st < at.mst * 0.3 && at.hp > 0) { at.tiredShown = true; push('tired', at.g.name + ' ringt nach Luft. Die Rüstung wird schwer.', k); }
    }
    A.st = Math.min(A.mst, A.st + 1.5); B.st = Math.min(B.mst, B.st + 1.5);
    var lead = Math.sign(frac(A) - frac(B));
    if (lead !== 0) {
      if (lastLead !== 0 && lead !== lastLead && A.hp > 0 && B.hp > 0) { leadChanges++; push('cheer', 'Die Menge tobt: Der Kampf kippt!', ''); }
      lastLead = lead;
    }
    leads.push(lead);
    if (!lowShown && A.hp > 0 && B.hp > 0 && (frac(A) < 0.25 || frac(B) < 0.25)) { lowShown = true; push('cheer', 'Die Menge hält den Atem an.', ''); }
  }
  var winner = A.hp <= 0 ? 'b' : B.hp <= 0 ? 'a' : (frac(A) >= frac(B) ? 'a' : 'b');
  if (A.hp > 0 && B.hp > 0) push('end', 'Die Zeit ist um. Die Kampfrichter entscheiden nach Treffern.', '');
  return { events: ev, winner: winner, rounds: round, leadChanges: leadChanges, crits: crits, leads: leads, hpA: A.hp, hpB: B.hp, mhpA: A.mhp, mhpB: B.mhp };
}

function spannParts(res) {
  var wf = res.winner === 'a' ? res.hpA / res.mhpA : res.hpB / res.mhpB;
  var knapp = Math.round(50 * Math.pow(Math.max(0, 1 - wf), 0.8));
  var wend = Math.min(25, res.leadChanges * 8);
  var kr = Math.min(15, res.crits * 5);
  var loserSign = res.winner === 'a' ? -1 : 1;
  var come = (res.leads.length >= 3 && res.leads[1] === loserSign) ? 10 : 0;
  return { knapp: knapp, wend: wend, kr: kr, come: come, total: Math.round(clamp(knapp + wend + kr + come, 0, 100)) };
}
function liveSpann(e, mA, mB) {
  var lead = Math.max(e.hpA / mA, e.hpB / mB);
  return Math.round(clamp(50 * Math.pow(1 - lead, 0.8) + Math.min(25, e.lc * 8) + Math.min(15, e.cr * 5), 0, 100));
}
function gnadeParts(loser, spann, o) {
  var base = Math.round(30 + 0.65 * spann);
  var fame = fameLevel(loser.fame) * 4, pers = Math.round(fxOf(loser).gnade), crowd = RANKS[rankIdx()].crowd;
  var mg = (o.own && S.missgunst > 0) ? -15 : 0;
  var mod = clamp(fame + pers + crowd + mg, -20, 20);
  var don = o.donation || 0;
  return { base: base, fame: fame, pers: pers, crowd: crowd, missgunst: mg, mod: mod, donation: don, total: Math.round(clamp(base + mod + don, 3, 97)) };
}
