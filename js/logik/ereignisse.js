/*
 * Blutsand · Spiellogik · Zufallsereignisse zwischen den Kämpfen
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
/* ---------- Ereignisse ---------- */
function G(id) { return byId(id); }
function pickG(filter) { var l = S.roster.filter(filter || function () { return true; }); return l.length ? pick(l) : null; }
function canPay(c) { return S.gold >= c; }
var EVENTS = {
  streit: {
    title: 'Streit im Kader',
    w: function () { return S.roster.length >= 2 ? 10 + 6 * S.roster.filter(function (g) { return hasP(g, 'streitsuechtig') || hasP(g, 'jaehzornig'); }).length : 0; },
    make: function () {
      var a = pickG(function (g) { return hasP(g, 'streitsuechtig') || hasP(g, 'jaehzornig'); }) || pickG();
      var b = rivalsOf(a)[0] || pickG(function (g) { return g.id !== a.id; });
      return b ? { a: a.id, b: b.id } : null;
    },
    text: function (i) { return nm(i.a) + ' und ' + nm(i.b) + ' geraten beim Essen aneinander. Bänke fliegen, die anderen Kämpfer bilden einen Kreis.'; },
    ch: function (i) { return [
      { l: 'Schlichten', s: 'Wein und strenge Worte. Beide beruhigen sich.', cost: 60, fn: function () { setRel(i.a, i.b, 0); mor(i.a, 3); mor(i.b, 3); return 'Mit Wein und strengen Worten legst du den Streit bei. Die beiden gehen sich vorerst aus dem Weg.'; } },
      { l: 'Austragen lassen', s: 'Ein Übungskampf entscheidet. Verletzungen möglich.', fn: function () {
        var A = G(i.a), B = G(i.b), w = power(A) + rnd(0, 30) >= power(B) + rnd(0, 30) ? A : B, l = w === A ? B : A;
        mor(w.id, 10); mor(l.id, -10); setRel(A.id, B.id, -1);
        var t = w.name + ' gewinnt den Übungskampf und gewinnt Moral. ' + l.name + ' verliert Moral. Die beiden sind jetzt Rivalen.';
        if (chance(0.2)) { l.inj = Math.max(l.inj, 1); t += ' ' + l.name + ' ist für 1 Kampf verletzt.'; }
        return t; } },
      { l: 'Ignorieren', s: 'Der Streit schwelt weiter.', fn: function () { setRel(i.a, i.b, -1); mor(i.a, -5); mor(i.b, -5); return 'Du lässt sie gewähren. Ab jetzt sind die beiden Rivalen, und das kostet beide im Kampf etwas Konzentration.'; } }
    ]; }
  },
  essen: {
    title: 'Ein Kämpfer verweigert das Essen',
    w: function () { return S.roster.length ? 8 + 4 * S.roster.filter(function (g) { return g.moral < 45; }).length : 0; },
    make: function () { var g = pickG(function (x) { return x.moral < 50; }) || pickG(); return g ? { g: g.id } : null; },
    text: function (i) { return nm(i.g) + ' rührt seit zwei Tagen seine Schüssel nicht an und starrt nur auf die Wand.'; },
    ch: function (i) { return [
      { l: 'Mit ihm reden', s: 'Gelingt eher, wenn er Freunde im Kader hat.', fn: function () {
        var g = G(i.g), p = 0.5 + (friendsOf(g).length ? 0.15 : 0) + (g.moral - 50) / 200;
        if (chance(p)) { mor(g.id, 10); return 'Das Gespräch hilft. ' + g.name + ' isst wieder und wirkt erleichtert.'; }
        mor(g.id, -5); return g.name + ' schweigt. Das Gespräch macht es eher schlimmer.'; } },
      { l: 'Besseres Essen kaufen', s: 'Teuer, aber sicher.', cost: 70, fn: function () { mor(i.g, 12); return 'Fleisch und frisches Brot wirken Wunder. ' + nm(i.g) + ' isst wieder.'; } },
      { l: 'Ihn zwingen', s: 'Das Problem ist weg, die Ausdauer leidet.', fn: function () { var g = G(i.g); g.end = Math.max(3, g.end - 1); mor(g.id, -3); return g.name + ' isst unter Zwang. Er verliert 1 Ausdauer.'; } },
      { l: 'Nichts tun', s: 'Er wird schwächer.', fn: function () { var g = G(i.g); mor(g.id, -10); g.tmp.push({ k: 'schwach', n: 'Geschwächt', f: 3, dmg: -0.1 }); return g.name + ' wird schwächer: −10 % Schaden für die nächsten Kämpfe.'; } }
    ]; }
  },
  ruf: {
    title: 'Ein Nemesis fordert dich heraus',
    w: function () { return S.ladder.some(function (f) { return f.nemesis; }) && !S.challenge && healthy().length ? 14 : 0; },
    make: function () { var n = pick(S.ladder.filter(function (f) { return f.nemesis; })); var g = pickG(function (x) { return !x.inj; }); return n && g ? { n: n.id, g: g.id } : null; },
    text: function (i) { var n = ladderById(i.n); return n ? n.name + ', „' + n.title + '“, ruft vor deinem Tor nach ' + nm(i.g) + '. Er will einen Kampf vor vollen Rängen.' : 'Der Herausforderer ist verschwunden.'; },
    ch: function (i) { var n = ladderById(i.n); var list = [
      { l: 'Annehmen', s: 'Sonderkampf mit hoher Prämie. Du wählst den Kämpfer in der Arena.', fn: function () { S.challenge = { id: i.n, gid: i.g }; return 'Du nimmst an. Der Kampf wartet in der Arena.'; } },
      { l: 'Ablehnen', s: 'Dein Ruf leidet, der Nemesis wird selbstsicherer.', fn: function () { loseRuhm(2); var f = ladderById(i.n); if (f) growFoe(f, 2); var g = G(i.g); if (g) g.fame = Math.max(0, g.fame - 3); return 'Du lehnst ab. Auf dem Markt wird über deinen Ludus gelacht: −2 Ruhm.'; } }
    ];
    if (n && !n.scouted) list.splice(1, 0, { l: 'Späher losschicken', s: 'Zeigt seine Persönlichkeiten, bevor du entscheidest.', cost: 60, fn: function () { var f = ladderById(i.n); if (f) f.scouted = true; return { keep: true, text: 'Dein Späher kehrt zurück: ' + (f ? f.pers.map(function (p) { return PERS[p.id].n + ' ' + ROMAN[p.lv]; }).join(', ') : 'nichts') + '.' }; } });
    return list; }
  },
  haendler: {
    title: 'Ein Waffenhändler am Tor',
    w: function () { return S.roster.some(function (g) { return g.lv.w < 5 || g.lv.a < 5; }) ? 8 : 0; },
    make: function () { var g = pickG(function (x) { return x.lv.w < 5 || x.lv.a < 5; }); if (!g) return null; var slot = g.lv.w < 5 && (g.lv.a >= 5 || chance(0.5)) ? 'w' : 'a'; return { g: g.id, slot: slot }; },
    text: function (i) { return 'Ein Händler aus dem Osten bietet ' + (i.slot === 'w' ? 'eine meisterhaft geschärfte Waffe' : 'eine verstärkte Rüstung') + ' an. Sie würde ' + nm(i.g) + ' gut passen.'; },
    ch: function (i) { return [
      { l: 'Kaufen', s: (i.slot === 'w' ? 'Waffe' : 'Rüstung') + ' +1 Stufe.', cost: 150, fn: function () { var g = G(i.g); g.lv[i.slot] = Math.min(5, g.lv[i.slot] + 1); return g.name + ' erhält die neue Ausrüstung: ' + SMITH_SLOT[i.slot] + ' Stufe ' + g.lv[i.slot] + '.'; } },
      { l: 'Verhandeln', s: 'Vielleicht günstiger. Vielleicht beleidigt.', fn: function () { var g = G(i.g); if (chance(0.5) && S.gold >= 90) { S.gold -= 90; g.lv[i.slot] = Math.min(5, g.lv[i.slot] + 1); return 'Für 90 Denare wechselt die Ausrüstung den Besitzer. ' + g.name + ': ' + SMITH_SLOT[i.slot] + ' Stufe ' + g.lv[i.slot] + '.'; } return 'Der Händler fühlt sich beleidigt und zieht weiter.'; } },
      { l: 'Ablehnen', s: '', fn: function () { return 'Der Händler zuckt mit den Schultern.'; } }
    ]; }
  },
  fest: {
    title: 'Ein Sponsor lädt zum Fest',
    w: function () { return 7; },
    make: function () { return {}; },
    text: function () { return 'Ein reicher Senator lädt deinen Ludus zu einem Gelage ein. Die halbe Stadt wird dort sein.'; },
    ch: function () { return [
      { l: 'Teilnehmen', s: 'Ruhm und Wein. Jemand könnte sich danebenbenehmen.', fn: function () {
        addRuhm(2); S.gold += 40; S.roster.forEach(function (g) { mor(g.id, 4); });
        var t = 'Ein gelungener Abend: +2 Ruhm, +40 Denare, bessere Stimmung im Kader.';
        if (chance(0.35)) { var g = pickG(); var bad = pick(['eitel', 'streitsuechtig', 'jaehzornig', 'faul', 'gierig']); if (g && addPers(g, bad, 1)) t += ' Aber ' + g.name + ' benimmt sich daneben und wird ' + PERS[bad].n.toLowerCase() + ' (neue Persönlichkeit, Stufe I).'; }
        return t; } },
      { l: 'Den besten Kämpfer vorführen', s: 'Er gewinnt Ruhm, könnte aber eitel werden.', fn: function () {
        var g = S.roster.slice().sort(function (a, b) { return (b.fame || 0) - (a.fame || 0) || power(b) - power(a); })[0];
        addFame(g, 3); mor(g.id, 6); var t = g.name + ' wird bewundert: +3 Kämpfer-Ruhm.';
        if (chance(0.25) && addPers(g, 'eitel', 1)) t += ' Der Applaus steigt ihm zu Kopf: Eitel I.';
        return t; } },
      { l: 'Absagen', s: 'Der Sponsor ist beleidigt.', fn: function () { loseRuhm(1); return 'Der Senator ist beleidigt: −1 Ruhm.'; } }
    ]; }
  },
  unfall: {
    title: 'Unfall beim Training',
    w: function () { return healthy().length ? 7 : 0; },
    make: function () { var g = pickG(function (x) { return !x.inj; }); if (!g) return null; g.inj = Math.max(g.inj, 2); return { g: g.id }; },
    text: function (i) { return nm(i.g) + ' stürzt am Pfahl und verdreht sich das Knie. Er fällt für 2 Kämpfe aus.'; },
    ch: function (i) { return [
      { l: 'Heiler rufen', s: 'Nur noch 1 Kampf Pause.', cost: 50, fn: function () { var g = G(i.g); g.inj = 1; return 'Der Heiler richtet das Knie. ' + g.name + ' fällt nur für 1 Kampf aus.'; } },
      { l: 'Ruhen lassen', s: 'Er fällt 2 Kämpfe aus.', fn: function () { return nm(i.g) + ' ruht sich aus.'; } },
      { l: 'Weitertrainieren', s: 'Riskant: stärker oder länger verletzt.', fn: function () {
        var g = G(i.g), k = pick(STATS)[0];
        if (chance(0.45)) { g.inj = 0; if (g[k] < capOf(g)) g[k]++; return g.name + ' beißt die Zähne zusammen: Verletzung vergessen, +1 ' + STAT_NAME[k] + '.'; }
        g.inj = 4; var t = 'Das Knie gibt nach. ' + g.name + ' fällt für 4 Kämpfe aus.'; if (chance(0.3)) t += ' ' + scarG(g); return t; } }
    ]; }
  },
  heimweh: {
    title: 'Heimweh',
    w: function () { return S.roster.length >= 2 ? 4 + 5 * S.roster.filter(function (g) { return g.moral < 45; }).length : 0; },
    make: function () { var g = pickG(function (x) { return x.moral < 50; }) || pickG(); return g ? { g: g.id } : null; },
    text: function (i) { return nm(i.g) + ' spricht nachts von seiner Heimat. Er wirkt abwesend und unruhig.'; },
    ch: function (i) { return [
      { l: 'Einen Brief erlauben', s: 'Ein Bote bringt ihn in seine Heimat.', cost: 20, fn: function () { mor(i.g, 10); return nm(i.g) + ' schreibt seiner Familie und schläft wieder ruhiger.'; } },
      { l: 'Ausgang gewähren', s: 'Hebt die Moral stark. Er könnte fliehen.', fn: function () {
        var g = G(i.g); if (S.roster.length > 1 && chance(0.15)) { S.roster = S.roster.filter(function (x) { return x.id !== g.id; }); purgeRel(g.id); fixSelection(); chron('info', g.name + ' ist aus dem Ludus geflohen.'); return g.name + ' kehrt nicht zurück. Er ist geflohen.'; }
        mor(g.id, 18); return g.name + ' kehrt mit leuchtenden Augen zurück.'; } },
      { l: 'Ignorieren', s: 'Seine Moral sinkt.', fn: function () {
        var g = G(i.g); if (S.roster.length > 1 && chance(0.1)) { S.roster = S.roster.filter(function (x) { return x.id !== g.id; }); purgeRel(g.id); fixSelection(); chron('info', g.name + ' ist aus dem Ludus geflohen.'); return 'In der Nacht klettert ' + g.name + ' über die Mauer und ist fort.'; }
        mor(g.id, -8); return g.name + ' zieht sich weiter zurück.'; } }
    ]; }
  },
  spion: {
    title: 'Ein Spion im Ludus',
    w: function () { return 5; },
    make: function () { return {}; },
    text: function () { return 'Ein neuer Wasserträger stellt zu viele Fragen über deine Kämpfer. Arbeitet er für einen anderen Ludus?'; },
    ch: function () { return [
      { l: 'Verhören', s: 'Vielleicht entlarvst du ihn. Vielleicht ist er unschuldig.', fn: function () {
        if (chance(0.5)) { S.gold += 60; return 'Er gesteht. Der Magistrat zahlt dir 60 Denare Belohnung.'; }
        var g = pickG(); if (g) mor(g.id, -10); return 'Er war unschuldig. ' + (g ? g.name + ' war mit ihm befreundet und ist verärgert.' : ''); } },
      { l: 'Bestechen', s: 'Er spioniert ab jetzt für dich: die nächsten 3 Zufallsgegner sind ausgespäht.', cost: 50, fn: function () { S.flags.intel = 3; return 'Gegen 50 Denare wechselt er die Seite. Die nächsten 3 Zufallsgegner sind ausgespäht.'; } },
      { l: 'Ignorieren', s: 'Andere Ludi kennen deine Kämpfer besser.', fn: function () { S.flags.spied = 2; return 'Die nächsten 2 Zufallsgegner sind auf deine Kämpfer vorbereitet (+8 % Kraft).'; } }
    ]; }
  },
  lehrer: {
    title: 'Ein Wanderlehrer',
    w: function () { return 6; },
    make: function () {
      var g = pickG(function (x) { return STATS.some(function (s) { return x[s[0]] < capOf(x) - 1; }); }); if (!g) return null;
      var ks = STATS.filter(function (s) { return g[s[0]] < capOf(g) - 1; }); return { g: g.id, k: pick(ks)[0] };
    },
    text: function (i) { return 'Ein alter Doctor, Ausbilder in vielen Ludi, bietet ' + nm(i.g) + ' Unterricht in ' + STAT_NAME[i.k] + ' an.'; },
    ch: function (i) { return [
      { l: 'Unterricht bezahlen', s: '+2 ' + STAT_NAME[i.k] + '.', cost: 150, fn: function () { var g = G(i.g); g[i.k] = Math.min(capOf(g), g[i.k] + 2); return g.name + ' lernt schnell: +2 ' + STAT_NAME[i.k] + '.'; } },
      { l: 'Verhandeln', s: 'Halber Preis oder gar nichts.', fn: function () { var g = G(i.g); if (chance(0.5) && S.gold >= 90) { S.gold -= 90; g[i.k] = Math.min(capOf(g), g[i.k] + 2); return 'Für 90 Denare willigt er ein: +2 ' + STAT_NAME[i.k] + ' für ' + g.name + '.'; } return 'Der Doctor lacht und geht.'; } },
      { l: 'Ablehnen', s: '', fn: function () { return 'Er zieht weiter in die nächste Stadt.'; } }
    ]; }
  },
  freund: {
    title: 'Eine Freundschaft entsteht',
    w: function () { return S.roster.length >= 2 ? 7 : 0; },
    make: function () {
      var pairs = []; S.roster.forEach(function (a) { S.roster.forEach(function (b) { if (a.id < b.id && !getRel(a.id, b.id)) pairs.push([a.id, b.id]); }); });
      if (!pairs.length) return null; var p = pick(pairs); return { a: p[0], b: p[1] };
    },
    text: function (i) { return nm(i.a) + ' und ' + nm(i.b) + ' sitzen jeden Abend zusammen am Feuer und teilen ihr Essen.'; },
    ch: function (i) { return [
      { l: 'Gemeinsames Training fördern', s: 'Sie werden Freunde. Freunde stärken sich im Kampf.', cost: 40, fn: function () { setRel(i.a, i.b, 1); mor(i.a, 6); mor(i.b, 6); return nm(i.a) + ' und ' + nm(i.b) + ' sind jetzt Freunde.'; } },
      { l: 'Nichts unternehmen', s: 'Vielleicht werden sie trotzdem Freunde.', fn: function () { if (chance(0.4)) { setRel(i.a, i.b, 1); return 'Auch ohne dein Zutun werden die beiden Freunde.'; } return 'Die Abende am Feuer werden seltener.'; } }
    ]; }
  },
  seuche: {
    title: 'Fieber im Ludus',
    w: function () { return S.roster.length >= 3 ? 4 : 0; },
    make: function () { return {}; },
    text: function () { return 'Schlechtes Wasser: Mehrere Kämpfer haben Fieber. Es könnte sich ausbreiten.'; },
    ch: function () { return [
      { l: 'Heiler holen', s: 'Teuer, aber niemand fällt aus.', cost: 120, fn: function () { return 'Der Heiler kocht Kräuter und lässt das Wasser abkochen. Das Fieber verschwindet.'; } },
      { l: 'Kranke absondern', s: 'Zwei Kämpfer fallen je 2 Kämpfe aus.', fn: function () { var l = S.roster.slice().sort(function () { return rng() - 0.5; }).slice(0, 2); l.forEach(function (g) { g.inj = Math.max(g.inj, 2); }); return l.map(function (g) { return g.name; }).join(' und ') + ' werden abgesondert und fallen 2 Kämpfe aus.'; } },
      { l: 'Nichts tun', s: 'Jeder kann krank werden.', fn: function () { var hit = []; S.roster.forEach(function (g) { mor(g.id, -4); if (chance(0.3)) { g.inj = Math.max(g.inj, 2); hit.push(g.name); } }); return hit.length ? 'Das Fieber erwischt ' + hit.join(', ') + ' (je 2 Kämpfe Pause).' : 'Glück gehabt: Das Fieber klingt von selbst ab.'; } }
    ]; }
  },
  steuer: {
    title: 'Der Steuereintreiber',
    w: function () { return S.gold >= 200 ? 6 : 0; },
    make: function () { return { amt: Math.round(Math.min(300, S.gold * 0.15)) }; },
    text: function (i) { return 'Der Steuereintreiber des Magistrats verlangt ' + i.amt + ' Denare Abgabe für die Spiele.'; },
    ch: function (i) { return [
      { l: 'Zahlen', s: '', cost: i.amt, fn: function () { return 'Du zahlst. Der Magistrat ist zufrieden.'; } },
      { l: 'Verhandeln', s: 'Halb so viel oder anderthalbmal so viel.', fn: function () { if (chance(0.5)) { var h = Math.round(i.amt / 2); S.gold -= Math.min(S.gold, h); return 'Du handelst ihn auf ' + h + ' Denare herunter.'; } var x = Math.round(i.amt * 1.5); S.gold -= Math.min(S.gold, x); return 'Er fühlt sich verhöhnt und verlangt nun ' + x + ' Denare.'; } },
      { l: 'Verweigern', s: 'Der Magistrat hetzt das Volk gegen dich auf.', fn: function () { loseRuhm(2); S.missgunst = Math.max(S.missgunst, 2); return 'Du verweigerst. −2 Ruhm, und für 2 Kämpfe ist das Publikum gegen deine Kämpfer (Missgunst).'; } }
    ]; }
  },
  lanista: {
    title: 'Ein alter Lanista bietet Rat',
    w: function () { return S.roster.some(function (g) { return g.pers.some(function (p) { return PERS[p.id].k !== 'buff' && !PERS[p.id].special; }); }) ? 5 : 0; },
    make: function () {
      var g = pickG(function (x) { return x.pers.some(function (p) { return PERS[p.id].k !== 'buff' && !PERS[p.id].special; }); }); if (!g) return null;
      var p = pick(g.pers.filter(function (p) { return PERS[p.id].k !== 'buff' && !PERS[p.id].special; })); return { g: g.id, p: p.id };
    },
    text: function (i) { var g = G(i.g); var p = g && g.pers.filter(function (x) { return x.id === i.p; })[0]; return 'Ein ehemaliger Lanista will ' + nm(i.g) + ' das Wesen „' + PERS[i.p].n + (p ? ' ' + ROMAN[p.lv] : '') + '“ austreiben.'; },
    ch: function (i) { return [
      { l: 'Ganz austreiben', s: 'Die Persönlichkeit verschwindet.', cost: 180, fn: function () { var g = G(i.g); g.pers = g.pers.filter(function (p) { return p.id !== i.p; }); return g.name + ' ist wie verwandelt: ' + PERS[i.p].n + ' entfernt.'; } },
      { l: 'Nur abschwächen', s: 'Eine Stufe schwächer.', cost: 80, fn: function () { var g = G(i.g); var p = g.pers.filter(function (x) { return x.id === i.p; })[0]; if (!p) return 'Nichts zu tun.'; if (p.lv > 1) { p.lv--; return PERS[i.p].n + ' sinkt auf Stufe ' + ROMAN[p.lv] + '.'; } g.pers = g.pers.filter(function (x) { return x !== p; }); return PERS[i.p].n + ' ist verschwunden.'; } },
      { l: 'Ablehnen', s: '', fn: function () { return 'Der alte Lanista brummt und geht.'; } }
    ]; }
  },
  findling: {
    title: 'Ein junger Kämpfer klopft an',
    w: function () { return S.roster.length < slotsMax() ? 6 : 0; },
    make: function () { return {}; },
    text: function () { return 'Ein junger Mann aus den Gassen bittet um Aufnahme. Er hat nichts außer Mut.'; },
    ch: function () { return [
      { l: 'Aufnehmen', s: 'Kostenloser Kämpfer, meist Gewöhnlich.', fn: function () { var g = makeGlad(chance(0.25) ? 'rare' : 'common'); addFighter(g); return g.name + ' tritt deinem Ludus bei (' + RAR[g.rar].name + ').'; } },
      { l: 'Ausbilden lassen', s: 'Mit guter Ausbildung wird er Selten oder Episch.', cost: 100, fn: function () { var g = makeGlad(chance(0.3) ? 'epic' : 'rare'); addFighter(g); return 'Nach einem harten Monat kehrt ' + g.name + ' zurück (' + RAR[g.rar].name + ').'; } },
      { l: 'Wegschicken', s: '', fn: function () { return 'Er verschwindet in der Menge.'; } }
    ]; }
  },
  schau: {
    title: 'Ein Edler wünscht eine Vorführung',
    w: function () { return healthy().length ? 5 : 0; },
    make: function () { var g = healthy().sort(function (a, b) { return power(b) - power(a); })[0]; return g ? { g: g.id } : null; },
    text: function (i) { return 'Ein Edler möchte ' + nm(i.g) + ' bei einem privaten Bankett kämpfen sehen, mit stumpfen Waffen.'; },
    ch: function (i) { return [
      { l: 'Zusagen', s: 'Gelingt die Vorführung, gibt es Denare und Ruhm.', fn: function () {
        var g = G(i.g), p = clamp(0.35 + power(g) / 400, 0.35, 0.85);
        if (chance(p)) { S.gold += 120; addRuhm(2); return g.name + ' begeistert die Gäste: +120 Denare, +2 Ruhm.'; }
        S.gold += 30; mor(g.id, -6); return g.name + ' stolpert vor den Gästen. Nur 30 Denare und gekränkter Stolz.'; } },
      { l: 'Absagen', s: '', fn: function () { return 'Der Edle sucht sich einen anderen Ludus.'; } }
    ]; }
  },
  begraebnis: {
    title: 'Ein Begräbnis',
    w: function () { return 0; },
    make: function () { return null; },
    text: function (i) { return i.dead + ' ist gefallen. Der Kader versammelt sich am Abend vor dem Tor.'; },
    ch: function (i) { return [
      { l: 'Ehrenvolle Bestattung', s: 'Die Moral aller Kämpfer steigt, +1 Ruhm.', cost: 100, fn: function () { S.roster.forEach(function (g) { mor(g.id, 8); }); addRuhm(1); return i.dead + ' wird mit Fackeln und Musik bestattet. Der Kader ist dankbar.'; } },
      { l: 'Schlichte Beisetzung', s: 'Ein kleiner Trost.', fn: function () { S.roster.forEach(function (g) { mor(g.id, 2); }); return 'Ein schlichtes Grab vor der Stadtmauer.'; } },
      { l: 'Keine Zeremonie', s: 'Der Kader nimmt dir das übel.', fn: function () { S.roster.forEach(function (g) { mor(g.id, -5); }); return 'Der Körper wird fortgeschafft. Im Kader wird es still.'; } }
    ]; }
  }
};
function buildQueued(q) { var i = Object.assign({}, q); return i; }
function rollEvent() {
  var ids = Object.keys(EVENTS), ws = ids.map(function (id) { try { return EVENTS[id].w(); } catch (e) { return 0; } });
  var tot = ws.reduce(function (s, v) { return s + v; }, 0);
  for (var tries = 0; tries < 6 && tot > 0; tries++) {
    var r = rng() * tot, id = ids[0];
    for (var k = 0; k < ids.length; k++) { r -= ws[k]; if (r <= 0) { id = ids[k]; break; } }
    var inst = EVENTS[id].make();
    if (inst) { inst.id = id; return inst; }
  }
  return null;
}
function eventValid(i) {
  if (!i || !EVENTS[i.id]) return false;
  var ids = ['a', 'b', 'g'].filter(function (k) { return i[k]; });
  return ids.every(function (k) { return byId(i[k]); }) && (!i.n || ladderById(i.n));
}
function eventChoices(i) { return EVENTS[i.id].ch(i); }
function applyChoice(i, idx) {
  var c = eventChoices(i)[idx]; if (!c) return null;
  if (c.cost && !canPay(c.cost)) return { err: 'Nicht genug Denare.' };
  if (c.cost) S.gold -= c.cost;
  var r = c.fn();
  var out = typeof r === 'string' ? { text: r } : r;
  out.text = out.text || '';
  var extra = MSG.splice(0); if (extra.length) out.text += ' ' + extra.join(' ');
  chron('event', EVENTS[i.id].title + ': ' + out.text);
  if (!out.keep) S.pendingEvent = null;
  return out;
}
