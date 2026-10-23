/* ===================== Oberfläche ===================== */
var KEY = 'blutsand-save-v2';
var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var ui = { tab: 'roster', view3d: false, reveals: [], anim: null, opp: null, oppKey: '', target: null, lastMatch: null,
  don: null, sellArm: null, resetArm: null, evRes: null, suspense: false, figKey: '', est: null, estKey: '', logHTML: '', modalOpen: false };

function $(s) { return document.querySelector(s); }
function fmt(n) { return Number(n).toLocaleString('de-DE'); }
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

/* ---------- Speichern: Browser sofort, Claude-Konto im Hintergrund ---------- */
var store = { ref: null, pending: null, writing: false, timer: null };
function serialize() {
  var c = Object.assign({}, S);
  if (c.match) { c.match = Object.assign({}, c.match); delete c.match.events; }
  return JSON.stringify(c);
}
function parseSave(j) {
  if (!j) return null;
  try { var o = JSON.parse(j); if (o && o.v === 2 && Array.isArray(o.roster) && o.roster.length) return o; } catch (e) {}
  return null;
}
function migrate() {
  S.flags = S.flags || {}; S.evQueue = S.evQueue || []; S.rivals = S.rivals || {}; S.rel = S.rel || {};
  S.dead = S.dead || []; S.chron = S.chron || []; S.ladder = S.ladder || []; S.missgunst = S.missgunst || 0;
  S.roster.forEach(function (g) { g.tmp = g.tmp || []; g.lv = g.lv || { w: 0, a: 0, s: 0 }; g.pers = g.pers || []; });
  if (S.ladder.length < 8) refillLadder();
}
function save() {
  S.savedAt = Date.now();
  var j = serialize();
  try { localStorage.setItem(KEY, j); } catch (e) {}
  if (store.ref) { store.pending = j; clearTimeout(store.timer); store.timer = setTimeout(flushRemote, 1200); }
}
function flushRemote() {
  if (store.writing || !store.pending || !store.ref) return;
  var j = store.pending; store.pending = null; store.writing = true;
  store.ref.set({ json: j, savedAt: S.savedAt }).then(function () {
    setSaveState();
  }).catch(function (e) {
    var code = e && e.code;
    if (code === 'unavailable') { if (!store.pending) store.pending = j; }
    else { store.ref = null; setSaveState(); }
  }).then(function () {
    store.writing = false;
    if (store.pending && store.ref) store.timer = setTimeout(flushRemote, 1500 + Math.random() * 1000);
  });
}
function setSaveState() {
  $('#saveState').textContent = store.ref ? 'Spielstand wird in deinem Claude-Konto gespeichert.' : 'Spielstand wird in diesem Browser gespeichert.';
}
function initRemote() {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function (r) {
    var db = r[0], user = r[1];
    if (!db || !user) return null;
    return user.id().then(function (id) {
      if (!id) return null;
      var ref = db.doc('data/users/' + id + '/save');
      return ref.get().then(function (snap) {
        store.ref = ref;
        var remote = snap.exists ? parseSave((snap.data() || {}).json) : null;
        if (remote && (remote.savedAt || 0) > (S.savedAt || 0) && !ui.anim) {
          S = remote; migrate(); fixSelection();
          ui.lastMatch = null; ui.opp = null; ui.reveals = []; ui.figKey = ''; ui.target = null;
          try { localStorage.setItem(KEY, serialize()); } catch (e) {}
          renderAll(); toast('Spielstand aus deinem Claude-Konto geladen.');
        } else {
          store.pending = serialize(); flushRemote();
        }
        setSaveState();
      });
    });
  }).catch(function () {});
}

/* ---------- Bausteine ---------- */
function codeChips(g, withLv) {
  var c = codeOf(g.eq).map(function (x) { return '<span class="code" title="' + esc(CODES[x]) + '">' + x + '</span>'; }).join('');
  if (isTypical(g)) c += '<span class="code star" title="Meisterschaft: Diese Ausrüstung ist typisch für den ' + g.type + '. +4 % Schaden und Trefferchance.">★</span>';
  if (withLv && g.lv && (g.lv.w || g.lv.a || g.lv.s)) c += '<span class="code lvl" title="Schmiedestufen: Waffe ' + g.lv.w + ', Rüstung ' + g.lv.a + ', Schild ' + g.lv.s + '">+' + g.lv.w + '/' + g.lv.a + '/' + g.lv.s + '</span>';
  return '<div class="chips">' + c + '</div>';
}
function persChip(p) {
  var k = PERS[p.id].k, sym = k === 'buff' ? '▲' : k === 'debuff' ? '▼' : '◆';
  return '<span class="pc ' + k + '" title="' + esc(persEffect(p)) + '">' + sym + ' ' + PERS[p.id].n + ' ' + ROMAN[p.lv] + '</span>';
}
function persChips(g, hidden) {
  if (hidden) return '<div class="chips"><span class="pc unk" title="Schicke einen Späher oder kämpfe gegen ihn, um mehr zu erfahren.">Persönlichkeit unbekannt</span></div>';
  if (!g.pers.length) return '<div class="chips"><span class="pc unk">Keine besonderen Eigenschaften</span></div>';
  return '<div class="chips">' + g.pers.map(persChip).join('') + '</div>';
}
function miniStats(g) {
  return '<ul class="mini-stats">' + STATS.map(function (s) { return '<li><span>' + s[1] + '</span><b>' + g[s[0]] + '</b></li>'; }).join('') + '</ul>';
}
function cardHTML(g, o) {
  o = o || {};
  var tags = '';
  if (g.nemesis) tags += '<span class="tag red">Nemesis</span>';
  if (g.rival) tags += '<span class="tag gold">Rivale</span>';
  return '<article class="card r-' + g.rar + '">' + figSVG(g, { flip: o.flip, ground: false }) +
    '<div class="main"><h3>' + esc(g.name) + '</h3>' +
    (g.title ? '<p class="title">„' + esc(g.title) + '“</p>' : '') +
    '<p class="meta">' + g.type + ' · <b>' + RAR[g.rar].name + '</b>' + (o.fame !== false ? ' · ' + FAME[fameLevel(g.fame)] : '') + '</p>' +
    (tags ? '<div class="chips">' + tags + '</div>' : '') +
    codeChips(g, true) + persChips(g, o.hide) + miniStats(g) + '</div>' +
    '<div class="pow"><b>' + power(g) + '</b><span>Kraft</span></div></article>';
}
function thumb(up) {
  return '<svg viewBox="0 0 48 48" class="' + (up ? 'up' : 'down') + '" aria-hidden="true"' + (up ? '' : ' style="transform:rotate(180deg)"') + '>' +
    '<path d="M14 22h7l4-12c1-3 6-2 6 2v8h8c2 0 4 2 3 5l-3 12c-1 2-2 3-4 3H21l-7-3z" fill="currentColor"/><rect x="5" y="21" width="8" height="20" fill="currentColor"/></svg>';
}
function statusTags(g) {
  var t = '';
  if (S.match && S.match.gid === g.id && S.match.stage !== 'done') t += '<span class="tag red">Wartet auf das Urteil</span>';
  if (g.inj) t += '<span class="tag red">Verletzt: ' + g.inj + (g.inj === 1 ? ' Kampf' : ' Kämpfe') + '</span>';
  (g.tmp || []).forEach(function (x) { t += '<span class="tag">' + x.n + ': ' + x.f + (x.f === 1 ? ' Kampf' : ' Kämpfe') + '</span>'; });
  if (g.scars) t += '<span class="tag">' + g.scars + (g.scars === 1 ? ' Narbe' : ' Narben') + '</span>';
  return t ? '<div class="chips">' + t + '</div>' : '';
}

/* ---------- Kopf und Reiter ---------- */
function renderHeader() {
  var r = rankIdx(), R = RANKS[r], N = RANKS[r + 1];
  $('#purse').innerHTML =
    '<div class="gold"><span>Denare</span><b>' + fmt(S.gold) + '</b></div>' +
    '<div><span>Ruhm</span><b>' + fmt(S.ruhm) + '</b></div>' +
    '<div><span>Siege / Niederl.</span><b>' + S.wins + ' / ' + S.losses + '</b></div>';
  $('#rankLine').textContent = 'Ludus-Rang: ' + R.n;
  var pct = N ? clamp((S.ruhm - R.min) / (N.min - R.min) * 100, 0, 100) : 100;
  $('#rankBox').innerHTML = '<h2>' + R.n + '</h2><div class="bar" role="img" aria-label="Fortschritt zum nächsten Rang: ' + Math.round(pct) + ' %"><i style="width:' + pct + '%"></i></div>' +
    '<small class="num">' + (N ? fmt(S.ruhm) + ' / ' + fmt(N.min) + ' Ruhm' : fmt(S.ruhm) + ' Ruhm') + '</small>' +
    '<p class="next">' + (N ? 'Nächster Rang: ' + N.n + '. ' + N.unlock : 'Du hast den höchsten Rang erreicht.') +
    (S.missgunst > 0 ? ' <span class="mg">Missgunst des Publikums: noch ' + S.missgunst + (S.missgunst === 1 ? ' Kampf' : ' Kämpfe') + '.</span>' : '') + '</p>';
}
function renderTabs() {
  ['roster', 'packs', 'arena', 'grube', 'chronik'].forEach(function (t) {
    $('#view-' + t).hidden = t !== ui.tab;
    var b = $('#tab-' + t); b.setAttribute('aria-selected', t === ui.tab ? 'true' : 'false');
    var dot = (t === 'arena' && ((S.match && S.match.stage !== 'done') || S.challenge)) ? '<span class="dot" aria-label="wartet"></span>' : '';
    var label = { roster: 'Kader', packs: 'Packs', arena: 'Arena', grube: 'Grube', chronik: 'Chronik' }[t];
    b.innerHTML = label + dot;
  });
}

/* ---------- Kader ---------- */
function renderRoster() {
  var list = S.roster.slice().sort(function (a, b) { return power(b) - power(a); });
  $('#rosterCount').textContent = S.roster.length + ' von ' + slotsMax() + ' Plätzen belegt. Sortiert nach Kraft.';
  $('#rlist').innerHTML = list.map(function (g) {
    var st = g.inj ? 'Verletzt ' + g.inj : '';
    return '<button class="ritem r-' + g.rar + '" data-act="select" data-id="' + g.id + '" aria-current="' + (g.id === S.sel) + '">' +
      figSVG(g, { ground: false }) +
      '<div><strong>' + esc(g.name) + '</strong><small>' + g.type + ' · ' + RAR[g.rar].name + ' · ' + FAME[fameLevel(g.fame)] + '</small><small>' + codeStr(g.eq) + '</small></div>' +
      '<div class="pw">' + power(g) + (st ? '<span class="st">' + st + '</span>' : '') + '</div></button>';
  }).join('');
  if (!$('#legendList').innerHTML) {
    $('#legendList').innerHTML = Object.keys(CODES).map(function (k) { return '<dt>' + k + '</dt><dd>' + esc(CODES[k]) + '</dd>'; }).join('') +
      '<dt>★</dt><dd>Meisterschaft: Ausrüstung passt zum Kämpfertyp (+4 % Schaden und Treffer)</dd><dt>+1/0/0</dt><dd>Schmiedestufen von Waffe, Rüstung und Schild</dd>' +
      '<dt>▲ ▼ ◆</dt><dd>Persönlichkeit mit Vorteil, Nachteil oder beidem. Stufen I bis III bestimmen die Stärke.</dd>';
  }
  renderDetail();
}
function renderDetail() {
  var g = byId(S.sel) || S.roster[0]; if (!g) return; S.sel = g.id;
  $('#b2d').setAttribute('aria-pressed', String(!ui.view3d)); $('#b3d').setAttribute('aria-pressed', String(ui.view3d));
  var key = [g.id, codeStr(g.eq), g.rar, g.skin, g.inj ? 1 : 0, g.scars, ui.view3d, g.lv.s, ui.tab === 'roster'].join('|');
  if (key !== ui.figKey) {
    ui.figKey = key;
    var st = $('#dStage');
    if (ui.view3d && ui.tab === 'roster') mount3D(st, g);
    else { stop3D(); st.innerHTML = figSVG(g, { spark: true }); }
  }
  var fl = fameLevel(g.fame), busy = S.match && S.match.gid === g.id && S.match.stage !== 'done';
  var mhp = Math.round((28 + g.end * 4.5) * (1 + fxOf(g).hp));
  $('#dInfo').innerHTML =
    '<h3>' + esc(g.name) + '</h3>' +
    '<p class="meta r-' + g.rar + '">' + g.type + ' · <b>' + RAR[g.rar].name + '</b> · ' + FAME[fl] + ' (' + (g.fame || 0) + ' Ruhm' + (fl < 3 ? ', ' + FAME[fl + 1] + ' ab ' + FAME_MIN[fl + 1] : '') + ')</p>' +
    '<div class="facts"><span>Kraft <b>' + power(g) + '</b></span><span>Leben <b>' + mhp + '</b></span><span>Siege <b>' + g.wins + '</b></span><span>Niederlagen <b>' + g.losses + '</b></span><span>Getötet <b>' + (g.kills || 0) + '</b></span></div>' +
    statusTags(g) +
    '<p class="hint">' + TYPES[g.type].d + '</p>' +
    '<div class="actions">' +
      '<button class="btn" data-act="tofight" data-id="' + g.id + '"' + (g.inj || busy ? ' disabled' : '') + '>In die Arena schicken</button>' +
      (g.inj ? '<button class="btn ghost" data-act="heal" data-id="' + g.id + '"' + (S.gold < healCost(g) ? ' disabled' : '') + '>Heilen · ' + healCost(g) + ' Den.</button>' : '') +
      '<button class="btn danger" data-act="sell" data-id="' + g.id + '"' + (S.roster.length <= 1 || busy ? ' disabled' : '') + '>' + (ui.sellArm === g.id ? 'Wirklich verkaufen?' : 'Verkaufen · ' + fmt(sellValue(g)) + ' Den.') + '</button>' +
    '</div>';

  var cap = capOf(g);
  var train = STATS.map(function (s) {
    var k = s[0], v = g[k], atCap = v >= cap, cost = trainCost(g, k);
    var btn = atCap ? '<button class="btn sm" disabled>Maximum</button>' :
      '<button class="btn sm" data-act="train" data-stat="' + k + '"' + (S.gold < cost ? ' disabled' : '') + '>+1 · ' + fmt(cost) + ' Den.</button>';
    return '<div class="srow r-' + g.rar + '"><span class="lab">' + s[1] + '</span><div class="bar" role="img" aria-label="' + s[1] + ' ' + v + ' von ' + cap + '"><i style="width:' + Math.round(v / cap * 100) + '%"></i></div><span class="val">' + v + '</span>' + btn + '</div>';
  }).join('');
  var smithRows = ['w', 'a', 's'].map(function (sl) {
    var none = sl === 's' && g.eq.shield === '–', l = g.lv[sl], c = smithCost(g, sl);
    var btn = none ? '<button class="btn sm" disabled>Kein Schild</button>' : c == null ? '<button class="btn sm" disabled>Maximum</button>' :
      '<button class="btn sm" data-act="smith" data-slot="' + sl + '"' + (S.gold < c ? ' disabled' : '') + '>+1 · ' + fmt(c) + ' Den.</button>';
    return '<div class="srow"><span class="lab">' + SMITH_SLOT[sl] + '</span><div class="bar" role="img" aria-label="' + SMITH_SLOT[sl] + ' Stufe ' + l + ' von 5"><i style="width:' + (l / 5 * 100) + '%"></i></div><span class="val">' + l + '</span>' + btn + '</div>';
  }).join('');
  var pers = g.pers.length ? g.pers.map(function (p) { return '<div class="prow">' + persChip(p) + '<span>' + esc(persEffect(p)) + '</span></div>'; }).join('') : '<p class="hint">Keine besonderen Eigenschaften.</p>';
  var fr = friendsOf(g), rv = rivalsOf(g);
  var opts = function (id, map, cur, dis) {
    return '<select id="' + id + '"' + (dis ? ' disabled' : '') + '>' + Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + k + ' · ' + map[k] + '</option>'; }).join('') + '</select>';
  };
  var eqExplain = codeOf(g.eq).map(function (c) { return '<div class="prow"><span class="code" title="' + esc(CODES[c]) + '">' + c + '</span><span>' + esc(CODES[c]) + '</span></div>'; }).join('');
  $('#dBody').innerHTML = '<div class="dgrid">' +
    '<div class="sec"><h4>Spezialisierung</h4>' + codeChips(g, true) + eqExplain +
      '<p class="hint">' + (isTypical(g) ? '★ Meisterschaft: Diese Ausrüstung ist typisch für den ' + g.type + ' (+4 % Schaden und Treffer).' : 'Typisch für den ' + g.type + ' wäre: ' + TYPES[g.type].typ.map(function (t) { return t.join(' · '); }).join(' oder ') + '.') + '</p></div>' +
    '<div class="sec"><h4>Persönlichkeiten</h4>' + pers + '</div>' +
    '<div class="sec"><h4>Training</h4><p class="hint">Obergrenze pro Wert: ' + cap + ' (' + RAR[g.rar].name + ', ' + FAME[fl] + ').</p>' + train + '</div>' +
    '<div class="sec"><h4>Schmiede</h4><p class="hint">Waffe ' + SMITH_FX.w + ', Rüstung ' + SMITH_FX.a + ', Schild ' + SMITH_FX.s + '.</p>' + smithRows + '</div>' +
    '<div class="sec"><h4>Umrüsten</h4><div class="eqform">' +
      '<div><label for="eqGrip">Griff</label>' + opts('eqGrip', EQ_LABEL.grip, g.eq.grip) + '</div>' +
      '<div><label for="eqWeapon">Waffe</label>' + opts('eqWeapon', EQ_LABEL.weapon, g.eq.weapon) + '</div>' +
      '<div><label for="eqShield">Schild</label>' + opts('eqShield', EQ_LABEL.shield, g.eq.shield, g.eq.grip !== '1H') + '</div>' +
      '<div><label for="eqArmor">Rüstung</label>' + opts('eqArmor', EQ_LABEL.armor, g.eq.armor) + '</div>' +
      '</div><p class="eqprev" id="eqPrev"></p><div class="actions"><button class="btn ghost sm" data-act="reequip" id="eqBtn">Umrüsten</button></div></div>' +
    '<div class="sec"><h4>Zustand</h4>' +
      '<div class="srow"><span class="lab">Moral</span><div class="bar moral' + (g.moral < 40 ? ' low' : '') + '" role="img" aria-label="Moral ' + g.moral + ' von 100"><i style="width:' + g.moral + '%"></i></div><span class="val">' + g.moral + '</span><span class="hint">' + (g.moral >= 50 ? '+' : '−') + Math.abs(Math.round((g.moral - 50) / 50 * 6)) + ' %</span></div>' +
      '<p class="rels">Freunde: ' + (fr.length ? fr.map(function (x) { return '<b>' + esc(x.name) + '</b>'; }).join(', ') + ' (+1 % je gesundem Freund im Kampf)' : 'keine') + '</p>' +
      '<p class="rels">Rivalen im Kader: ' + (rv.length ? rv.map(function (x) { return '<b>' + esc(x.name) + '</b>'; }).join(', ') + ' (−1 % je Rivale im Kampf)' : 'keine') + '</p>' +
    '</div></div>';
  updateEqPreview();
}
function readEq() {
  var g = $('#eqGrip'); if (!g) return null;
  return normEq({ grip: g.value, weapon: $('#eqWeapon').value, shield: $('#eqShield').value, armor: $('#eqArmor').value });
}
function updateEqPreview() {
  var g = byId(S.sel), eq = readEq(); if (!g || !eq) return;
  $('#eqShield').disabled = eq.grip !== '1H';
  if (eq.grip !== '1H') $('#eqShield').value = '–';
  var c = reequipCost(g, eq), p = $('#eqPrev'), b = $('#eqBtn');
  if (!c) { p.innerHTML = 'Wähle eine neue Kombination. Jede Änderung kostet Denare und 3 Kämpfe Eingewöhnung (−8 % Schaden und Treffer). Geänderte Teile verlieren ihre Schmiedestufe.'; b.disabled = true; return; }
  var tmp = { eq: eq, type: g.type };
  p.innerHTML = 'Neu: <b>' + codeStr(eq) + '</b>' + (isTypical(tmp) ? ' ★' : '') + ' · Kosten <b>' + c + ' Den.</b> · 3 Kämpfe Eingewöhnung. Geänderte Teile verlieren ihre Schmiedestufe.';
  b.disabled = S.gold < c || (S.match && S.match.gid === g.id && S.match.stage !== 'done');
  b.textContent = 'Umrüsten · ' + c + ' Den.';
}

/* ---------- Packs ---------- */
function crateSVG(color) {
  return '<svg viewBox="0 0 240 76" aria-hidden="true"><rect x="70" y="8" width="100" height="62" fill="#2a2118" stroke="' + color + '" stroke-width="3"/>' +
    '<path d="M70 28h100M70 48h100" stroke="' + color + '" stroke-width="2" opacity=".6"/>' +
    '<rect x="112" y="24" width="16" height="22" fill="' + color + '"/><circle cx="120" cy="35" r="3" fill="#1a1108"/></svg>';
}
function renderPacks() {
  var r = rankIdx();
  $('#packs').innerHTML = PACKS.map(function (p) {
    var locked = r < p.rank, full = S.roster.length + p.slots.length > slotsMax();
    var label = locked ? 'Ab ' + RANKS[p.rank].n : full ? 'Zu wenig Kaderplätze' : 'Kaufen · ' + fmt(p.price) + ' Den.';
    return '<div class="pack' + (locked ? ' locked' : '') + '">' + crateSVG(p.color) + '<h3>' + p.name + '</h3><p>' + p.desc + '</p><p class="odds">' + p.odds + '</p>' +
      '<button class="btn" data-act="buy" data-pack="' + p.id + '"' + (locked || full || S.gold < p.price ? ' disabled' : '') + '>' + label + '</button></div>';
  }).join('');
  var box = $('#reveal');
  if (!ui.reveals.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = '<div class="reveal-head"><h3>Dein Zug</h3><div class="actions">' +
    '<button class="btn ghost" data-act="revealall">Alle aufdecken</button><button class="btn" data-act="toroster">Zum Kader</button></div></div>' +
    '<div class="reveal-grid">' + ui.reveals.map(function (r, i) {
      return '<button class="flip' + (r.open ? ' open' : '') + '" data-act="flip" data-i="' + i + '" aria-label="' + (r.open ? esc(r.g.name) : 'Karte aufdecken') + '"><div class="flip-in">' +
        '<div class="face front"><div>?<small>Tippen zum Aufdecken</small></div></div>' +
        '<div class="face back">' + cardHTML(r.g, { fame: false }) + '</div></div></button>';
    }).join('') + '</div>';
}

/* ---------- Arena ---------- */
function currentFoe() {
  var t = ui.target;
  if (t && t.kind === 'ladder') { var f = ladderById(t.id); if (f) return f; ui.target = null; }
  if (t && t.kind === 'rival') return rivalFighter(t.id);
  var g = byId(S.fighter); if (!g) return null;
  var key = g.id + '|' + S.diff + '|' + power(g);
  if (!ui.opp || ui.oppKey !== key) { ui.opp = makeRandomOpp(g); ui.oppKey = key; }
  return ui.opp;
}
function estimate(g, foe) {
  var key = g.id + '|' + power(g) + '|' + foe.id + '|' + power(foe) + '|' + codeStr(g.eq) + '|' + codeStr(foe.eq);
  if (ui.estKey === key) return ui.est;
  var w = 0, n = 240, fr = friendsOf(g).filter(function (x) { return !x.inj; }).length, rv = rivalsOf(g).filter(function (x) { return !x.inj; }).length;
  for (var i = 0; i < n; i++) if (simulate(g, foe, { friendsA: fr, rivalsA: rv }).winner === 'a') w++;
  ui.estKey = key; ui.est = Math.round(w / n * 100);
  return ui.est;
}
function setupHTML() {
  if (S.challenge && ladderById(S.challenge.id) && !ui.target) {
    ui.target = { kind: 'ladder', id: S.challenge.id, challenge: true };
    var cg = byId(S.challenge.gid); if (cg && !cg.inj) S.fighter = cg.id;
  }
  if (S.challenge && !ladderById(S.challenge.id)) S.challenge = null;
  fixSelection();
  var h = healthy(), t = ui.target, out = '';
  if (t) {
    var tf = currentFoe();
    if (tf) {
      var lbl = t.kind === 'rival' ? 'Rivalenkampf gegen ' + esc(tf.name) + ', „' + esc(tf.title) + '“' :
        (t.challenge ? 'Sonderkampf: ' + esc(tf.name) + ' hat dich herausgefordert. Prämie ×1,5 und +2 Ruhm.' : 'Herausforderung: Platz ' + ladderPlace(tf.id) + ' der Grubenrangliste, ' + esc(tf.name) + '.');
      out += '<div class="banner"><p>' + lbl + '</p><button class="btn ghost sm" data-act="untarget">' + (t.challenge ? 'Herausforderung zurückziehen' : 'Zurück zum Zufallsgegner') + '</button></div>';
    }
  }
  if (!h.length) {
    var anyInj = S.roster.some(function (g) { return g.inj; });
    return out + '<p class="hint">Alle Kämpfer sind verletzt. Heile sie im Kader oder lege einen Ruhetag ein.</p>' +
      (anyInj ? '<div class="actions" style="margin-top:12px"><button class="btn" data-act="rest">Ruhetag einlegen · 10 Den.</button></div>' : '');
  }
  var g = byId(S.fighter);
  var foe = currentFoe();
  var opts = S.roster.slice().sort(function (a, b) { return power(b) - power(a); }).map(function (x) {
    return '<option value="' + x.id + '"' + (x.id === g.id ? ' selected' : '') + (x.inj ? ' disabled' : '') + '>' + esc(x.name) + ' (Kraft ' + power(x) + ')' + (x.inj ? ' · verletzt' : '') + '</option>';
  }).join('');
  out += '<div class="arena-ctl"><div class="field"><label for="fighterSel">Dein Kämpfer</label><select id="fighterSel">' + opts + '</select></div>';
  if (!t) {
    var r = rankIdx();
    out += '<div class="field"><span id="diffLbl">Schwierigkeit</span><div class="seg" role="group" aria-labelledby="diffLbl">' + DIFFS.map(function (d) {
      var lock = r < d.rank;
      return '<button data-act="diff" data-d="' + d.id + '" aria-pressed="' + (d.id === S.diff) + '"' + (lock ? ' disabled' : '') + '>' + d.name + '<small>' + (lock ? 'ab ' + RANKS[d.rank].n : d.sub) + '</small></button>';
    }).join('') + '</div></div>';
  }
  out += '</div>';
  var hide = !foe.scouted;
  out += '<div class="match">' + cardHTML(g) + '<div class="vs">VS</div>' + cardHTML(foe, { flip: true, hide: hide }) + '</div>';
  var kind = t ? t.kind : 'random';
  var rw = matchReward({ kind: kind, diff: S.diff, foe: foe, rivalId: t && t.kind === 'rival' ? t.id : null, challenge: t && t.challenge }, g);
  var lethal = kind !== 'random' || DIFFS[S.diff].lethal;
  out += '<div class="reward">' +
    '<p>Siegprämie: <b>' + fmt(rw.prize) + ' Denare</b> und <b>' + rw.ruhm + ' Ruhm</b>, dazu bis zu +50 % Spektakelbonus bei einem spannenden Kampf. Bei einer Niederlage gibt es 15 Denare.</p>' +
    (lethal ? '<p class="lethal">Auf Leben und Tod: Verliert dein Kämpfer, entscheidet das Publikum, ob er stirbt. Je knapper der Kampf, desto eher gibt es Gnade.</p>' : '<p>Schaukampf: Niemand stirbt, aber Prämie und Ruhm sind kleiner.</p>') +
    (foe.scouted ? '<p>Späher-Einschätzung: Siegchance etwa <b>' + estimate(g, foe) + ' %</b>.</p>' : '<p>Persönlichkeiten und Siegchance des Gegners kennst du erst, wenn ein Späher ihn beobachtet hat.</p>') +
    '</div>';
  out += '<div class="actions"><button class="btn" data-act="fight">Kampf beginnen</button>';
  if (!t) out += '<button class="btn ghost" data-act="reroll">Anderen Gegner auslosen</button>';
  if (!foe.scouted) out += '<button class="btn ghost" data-act="scout"' + (S.gold < SCOUT_COST ? ' disabled' : '') + '>Späher losschicken · ' + SCOUT_COST + ' Den.</button>';
  if (S.roster.some(function (x) { return x.inj; })) out += '<button class="btn ghost" data-act="rest">Ruhetag einlegen · 10 Den.</button>';
  out += '</div>';
  return out;
}
function duelHTML(m, live) {
  var me = m.me, foe = m.foeSnap || m.foe, s = m.sum;
  var hA = live ? s.mhpA : s.hpA, hB = live ? s.mhpB : s.hpB, sp = live ? 0 : m.spann;
  function side(x, id, hp, mhp, flip) {
    return '<div class="side"><div class="stage" id="fig' + id + '">' + figSVG(x, { flip: flip }) + '</div>' +
      '<div class="hpl"><span>' + esc(x.name) + '</span><b id="hpT' + id + '">' + hp + ' / ' + mhp + '</b></div>' +
      '<div class="hp"><i id="hp' + id + '" class="' + (hp / mhp < 0.3 ? 'low' : '') + '" style="width:' + (hp / mhp * 100) + '%"></i></div>' +
      '<div class="stam" title="Ausdauer"><i id="st' + id + '"' + (live ? '' : ' style="width:0;opacity:.3"') + '></i></div></div>';
  }
  return '<div class="duel">' + side(me, 'A', hA, s.mhpA, false) + side(foe, 'B', hB, s.mhpB, true) + '</div>' +
    '<div class="crowd"><span>Spannung</span><div class="bar" role="img" aria-label="Spannung der Menge"><i id="crowdBar" style="width:' + sp + '%"></i></div><b id="crowdVal" class="num">' + sp + '</b></div>' +
    (live ? '<ol class="log" id="log" aria-live="polite"></ol><div class="actions" style="margin-top:10px"><button class="btn ghost" data-act="skip">Kampf überspringen</button></div>'
      : (ui.logHTML && ui.logFor === m ? '<details style="margin-top:10px"><summary class="hint" style="cursor:pointer">Kampfprotokoll anzeigen</summary><ol class="log">' + ui.logHTML + '</ol></details>' : ''));
}
function breakdownHTML(m) {
  var p = m.sp;
  return '<div class="breakdown"><span>Spannung <b>' + m.spann + '</b></span><span>Knappheit <b>' + p.knapp + '</b></span><span>Wendungen <b>' + p.wend + '</b></span><span>Kritische Treffer <b>' + p.kr + '</b></span><span>Comeback <b>' + p.come + '</b></span><span>Runden <b>' + m.sum.rounds + '</b></span></div>';
}
function decisionHTML(m) {
  var foe = m.foeSnap || m.foe;
  if (m.stage === 'decide') {
    var ch = winChoices(m);
    var extra = m.kind === 'rival' ? 'Ein Rivale stirbt nicht in der Arena. Entscheide, wie du ihn behandelst.' :
      foe.nemesis ? 'Er ist dein Nemesis. Bei Gnade kann er sich mit etwas Glück deinem Ludus anschließen.' : '';
    return '<div class="result win"><h3>Sieg</h3><p>' + esc(m.gname) + ' besiegt ' + esc(foe.name) + '.</p>' + breakdownHTML(m) +
      '<p>Prämie: <b>' + fmt(m.prize) + ' Denare</b> · Ruhm <b>+' + m.ruhmGain + '</b></p>' +
      (m.kind === 'rival' ? '' : '<div class="verdict">' + thumb(m.crowdMercy) + '<div><span class="hint">Das Publikum fordert</span><br><strong class="' + (m.crowdMercy ? 'up' : 'down') + '">' + (m.crowdMercy ? 'Gnade' : 'Tod') + '</strong><p class="hint">Folgst du dem Urteil, gibt es +1 Ruhm. Entscheidest du dagegen, sinkt für 3 Kämpfe die Gnade für deine eigenen Kämpfer.</p></div></div>') +
      (extra ? '<p class="hint">' + extra + '</p>' : '') +
      '<div class="choices">' + ch.map(function (c) {
        var match = (c === 'gnade' && m.crowdMercy) || (c === 'toeten' && !m.crowdMercy);
        var against = (c === 'gnade' && !m.crowdMercy) || (c === 'toeten' && m.crowdMercy);
        return '<button class="choice" data-act="choose" data-c="' + c + '"><b>' + CHOICE_TXT[c][0] + '</b><span>' + CHOICE_TXT[c][1] + '</span>' +
          (m.kind !== 'rival' && match ? '<em>Folgt dem Publikum: +1 Ruhm</em>' : '') + (m.kind !== 'rival' && against ? '<em>Gegen das Publikum: Missgunst</em>' : '') + '</button>';
      }).join('') + '</div></div>';
  }
  // Niederlage: Urteil
  var parts = lossChance(m, ui.don);
  var dons = '<button data-act="don" data-d="-1" aria-pressed="' + (ui.don == null) + '">Keine</button>' + DONATIONS.map(function (d, i) {
    return '<button data-act="don" data-d="' + i + '" aria-pressed="' + (ui.don === i) + '"' + (S.gold < d.c ? ' disabled' : '') + '>' + d.c + ' Den.<small>+' + d.p + ' %</small></button>';
  }).join('');
  function sg(v) { return (v >= 0 ? '+' : '−') + Math.abs(v); }
  return '<div class="result lose"><h3>Niederlage</h3><p>' + esc(foe.name) + ' besiegt ' + esc(m.gname) + '. Dein Kämpfer liegt im Sand, das Publikum erhebt sich.</p>' + breakdownHTML(m) +
    '<div class="verdict"><div><span class="hint">Chance auf Gnade</span><div class="big">' + parts.total + ' %</div></div>' +
    '<div class="breakdown"><span>Aus der Spannung <b>' + parts.base + ' %</b></span><span>Beliebtheit <b>' + sg(parts.fame) + '</b></span><span>Persönlichkeit <b>' + sg(parts.pers) + '</b></span><span>Publikum (' + RANKS[rankIdx()].n + ') <b>' + sg(parts.crowd) + '</b></span>' + (parts.missgunst ? '<span>Missgunst <b>' + parts.missgunst + '</b></span>' : '') + '<span>Spende <b>+' + parts.donation + '</b></span><span class="hint">Zuschläge zusammen höchstens ±20</span></div></div>' +
    '<div class="field"><span id="donLbl">Spende an das Publikum</span><div class="seg" role="group" aria-labelledby="donLbl">' + dons + '</div></div>' +
    (ui.suspense ? '<p class="suspense">Das Publikum entscheidet …</p>' : '<div class="actions"><button class="btn" data-act="verdict">Urteil abwarten</button></div>') + '</div>';
}
function resultHTML(m) {
  var foe = m.foeSnap || m.foe;
  var head, cls;
  if (m.win) { head = m.lethal ? 'Sieg' : 'Sieg im Schaukampf'; cls = 'win'; }
  else { head = !m.lethal ? 'Niederlage im Schaukampf' : m.mercy ? 'Begnadigt' : 'Gefallen'; cls = 'lose'; }
  var v = '';
  if (!m.win && m.lethal) v = '<div class="verdict">' + thumb(m.mercy) + '<div><strong class="' + (m.mercy ? 'up' : 'down') + '">' + (m.mercy ? 'Daumen hoch' : 'Daumen runter') + '</strong><p class="hint">Die Chance auf Gnade lag bei ' + m.verdictP + ' %' + (m.donated ? ' (mit Spende von ' + m.donated + ' Denaren)' : '') + '.</p></div></div>';
  var lines = (m.win ? ['Prämie: ' + fmt(m.prize) + ' Denare · Ruhm +' + m.ruhmGain] : ['Trostgeld: 15 Denare']).concat(m.msgs || []);
  return '<div class="result ' + cls + '"><h3>' + head + '</h3><p>' + esc(m.win ? m.gname + ' besiegt ' + foe.name + '.' : foe.name + ' besiegt ' + m.gname + '.') + '</p>' + breakdownHTML(m) + v +
    '<ul>' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
    '<div class="actions"><button class="btn" data-act="next">Weiter</button></div></div>';
}
function renderArena() {
  if (ui.anim) return;
  var box = $('#arenaBox');
  var m = S.match && S.match.stage !== 'done' ? S.match : null;
  if (m && !m.me) { m.me = byId(m.gid) || { name: m.gname, eq: m.foe.eq, rar: 'common', type: m.foe.type, lv: { w: 0, a: 0, s: 0 } }; }
  if (m) { box.innerHTML = duelHTML(m, false) + decisionHTML(m); return; }
  if (ui.lastMatch) { box.innerHTML = duelHTML(ui.lastMatch, false) + resultHTML(ui.lastMatch); return; }
  box.innerHTML = setupHTML();
}
function startFight() {
  if (ui.anim || (S.match && S.match.stage !== 'done')) return;
  var g = byId(S.fighter);
  if (!g || g.inj) { toast('Wähle einen gesunden Kämpfer.'); return; }
  var t = ui.target, m;
  if (t && t.kind === 'ladder') { if (!ladderById(t.id)) { ui.target = null; renderArena(); return; } m = newMatch('ladder', g.id, { id: t.id, challenge: t.challenge }); }
  else if (t && t.kind === 'rival') m = newMatch('rival', g.id, { id: t.id });
  else { var foe = currentFoe(); m = newMatch('random', g.id, { foe: foe }); }
  m.me = JSON.parse(JSON.stringify(g));
  m.foeSnap = JSON.parse(JSON.stringify(m.foe));
  runMatch(m);
  ui.opp = null; ui.estKey = ''; ui.target = null; ui.don = null; ui.lastMatch = null; ui.suspense = false;
  S.match = m.stage === 'done' ? null : m;
  save();
  ui.anim = { m: m, i: 0, t: null };
  ui.logHTML = ''; ui.logFor = m;
  renderHeader(); renderTabs();
  $('#arenaBox').innerHTML = duelHTML(m, true);
  $('#arenaBox').scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
  stepAnim();
}
function logLine(e) { return '<li class="' + e.t + '">' + esc(e.text) + '</li>'; }
function applyEv(m, e, quiet) {
  var s = m.sum;
  function bar(id, hp, mhp) { var el = $('#hp' + id); if (!el) return; el.style.width = (hp / mhp * 100) + '%'; el.classList.toggle('low', hp / mhp < 0.3); $('#hpT' + id).textContent = hp + ' / ' + mhp; }
  bar('A', e.hpA, s.mhpA); bar('B', e.hpB, s.mhpB);
  var sa = $('#stA'), sb = $('#stB'); if (sa) sa.style.width = (e.stA * 100) + '%'; if (sb) sb.style.width = (e.stB * 100) + '%';
  var sp = liveSpann(e, s.mhpA, s.mhpB); var cb = $('#crowdBar'); if (cb) { cb.style.width = sp + '%'; $('#crowdVal').textContent = sp; }
  if (!quiet) {
    var log = $('#log'); if (log) { log.insertAdjacentHTML('beforeend', logLine(e)); log.scrollTop = log.scrollHeight; }
    if (!REDUCE && /hit|crit|block|counter/.test(e.t) && e.side) {
      var fig = $('#fig' + (e.side === 'a' ? 'B' : 'A'));
      if (fig) { fig.classList.remove('shake'); void fig.offsetWidth; fig.classList.add('shake'); }
    }
  }
  ui.logHTML += logLine(e);
}
function stepAnim() {
  var a = ui.anim; if (!a) return;
  var ev = a.m.events;
  if (a.i >= ev.length) { finishAnim(); return; }
  var e = ev[a.i++]; applyEv(a.m, e);
  a.t = setTimeout(stepAnim, REDUCE ? 80 : e.t === 'rd' ? 260 : 520);
}
function skipAnim() {
  var a = ui.anim; if (!a) return;
  clearTimeout(a.t);
  var ev = a.m.events, last = null;
  while (a.i < ev.length) { last = ev[a.i++]; ui.logHTML += logLine(last); }
  if (last) applyEv(a.m, last, true);
  finishAnim();
}
function finishAnim() {
  var m = ui.anim.m; clearTimeout(ui.anim.t); ui.anim = null;
  if (m.stage === 'done') ui.lastMatch = m;
  renderAll();
}
function doVerdict() {
  var m = S.match; if (!m || m.stage !== 'verdict' || ui.suspense) return;
  ui.suspense = true; renderArena();
  setTimeout(function () {
    ui.suspense = false;
    verdictLoss(m, ui.don);
    S.match = null; ui.lastMatch = m; ui.don = null;
    save(); renderAll();
  }, REDUCE ? 200 : 1400);
}

/* ---------- Grube ---------- */
function renderGrube() {
  var r = rankIdx();
  $('#rivalBox').innerHTML = RIVALS.map(function (R) {
    var open = r >= R.rank, st = rivalState(R.id), f = rivalFighter(R.id);
    return '<div class="rival' + (open ? '' : ' locked') + '">' + figSVG(f, { ground: false }) + '<div class="sec" style="gap:6px">' +
      '<h3>' + esc(R.name) + '</h3><p class="title">„' + esc(R.title) + '“</p><p>' + esc(R.intro) + '</p>' +
      codeChips(f, true) + persChips(f, false) +
      '<p class="hint">Kraft ' + power(f) + ' · ' + (st.beaten ? 'Besiegt ×' + st.beaten : 'Noch unbesiegt') + (st.lost ? ' · ' + st.lost + '× gegen ihn verloren' : '') + '</p>' +
      '<div class="actions">' + (open ? '<button class="btn sm" data-act="target" data-kind="rival" data-id="' + R.id + '">Herausfordern</button>' : '<span class="tag">Ab ' + RANKS[R.rank].n + '</span>') + '</div></div></div>';
  }).join('');
  $('#ladderBox').innerHTML = S.ladder.map(function (f, i) {
    return '<div class="lrow' + (f.nemesis ? ' nem' : '') + '"><span class="place">' + (i + 1) + '</span>' + figSVG(f, { ground: false }) +
      '<div class="who"><strong>' + esc(f.name) + '</strong>' + (f.title ? '<span class="title">„' + esc(f.title) + '“</span>' : '') +
      '<div class="chips">' + (f.nemesis ? '<span class="tag red">Nemesis</span>' : '') + '<span class="tag">' + f.type + '</span></div>' + codeChips(f, true) + persChips(f, !f.scouted) + '</div>' +
      '<div class="pw">' + power(f) + '<small>Kraft</small><small>' + (f.wins || 0) + ' : ' + (f.losses || 0) + ' gegen dich</small></div>' +
      '<div class="actions acts"><button class="btn sm" data-act="target" data-kind="ladder" data-id="' + f.id + '">Herausfordern</button>' +
      (f.scouted ? '' : '<button class="btn ghost sm" data-act="scoutL" data-id="' + f.id + '"' + (S.gold < SCOUT_COST ? ' disabled' : '') + '>Späher · ' + SCOUT_COST + ' Den.</button>') + '</div></div>';
  }).join('');
}

/* ---------- Chronik ---------- */
function renderChronik() {
  var nem = S.ladder.filter(function (f) { return f.nemesis; }).length;
  $('#chStats').innerHTML = [['Kämpfe', S.fights], ['Siege', S.wins], ['Niederlagen', S.losses], ['Gefallene', S.dead.length], ['Nemeses', nem], ['Rang', RANKS[rankIdx()].n]]
    .map(function (x) { return '<div><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('');
  $('#graves').innerHTML = S.dead.length ? S.dead.map(function (d) {
    return '<div class="grave r-' + d.rar + '"><strong>' + esc(d.name) + '</strong>' + d.type + ' · ' + RAR[d.rar].name + ' · ' + esc(d.code) + '<br>' + d.wins + ' Siege · ' + FAME[fameLevel(d.fame)] + '<br>Gefallen in Kampf ' + d.f + ' durch ' + esc(d.by) + '</div>';
  }).join('') : '<p class="hint">Noch ist keiner deiner Kämpfer gefallen.</p>';
  $('#chronList').innerHTML = S.chron.map(function (c) { return '<li class="' + c.k + '"><span>Kampf ' + c.f + '</span><div>' + esc(c.t) + '</div></li>'; }).join('');
}

/* ---------- Ereignis-Dialog ---------- */
function renderModal() {
  var md = $('#modal'), ev = S.pendingEvent;
  if (ev && !eventValid(ev)) { S.pendingEvent = null; ev = null; save(); }
  var blocked = !!ui.anim || (S.match && S.match.stage !== 'done') || ui.suspense || (ui.lastMatch && ui.tab === 'arena');
  if ((!ev && !ui.evRes) || blocked) { md.hidden = true; ui.modalOpen = false; return; }
  var html;
  if (!ev) {
    html = '<p class="eyebrow">Ereignis</p><h2 id="mTitle">' + esc(ui.evRes.title) + '</h2><p class="res">' + esc(ui.evRes.text) + '</p>' +
      '<div class="actions"><button class="btn" data-act="evdone">Weiter</button></div>';
  } else {
    var E = EVENTS[ev.id], ch = eventChoices(ev);
    html = '<p class="eyebrow">Ereignis zwischen den Kämpfen</p><h2 id="mTitle">' + esc(E.title) + '</h2><p>' + esc(E.text(ev)) + '</p>' +
      (ui.evRes ? '<p class="res">' + esc(ui.evRes.text) + '</p>' : '') +
      '<div class="choices">' + ch.map(function (c, i) {
        var poor = c.cost && S.gold < c.cost;
        return '<button class="choice" data-act="evc" data-i="' + i + '"' + (poor ? ' disabled' : '') + '><b>' + esc(c.l) + (c.cost ? ' · ' + c.cost + ' Den.' : '') + '</b>' + (c.s ? '<span>' + esc(c.s) + '</span>' : '') + (poor ? '<em>Nicht genug Denare</em>' : '') + '</button>';
      }).join('') + '</div>';
  }
  $('#mBody').innerHTML = html;
  md.hidden = false;
  if (!ui.modalOpen) { ui.modalOpen = true; var b = md.querySelector('button:not([disabled])'); if (b) b.focus(); }
}

function renderAll() {
  renderHeader(); renderTabs(); renderRoster(); renderPacks(); renderArena(); renderGrube(); renderChronik(); renderModal();
}

/* ---------- Aktionen ---------- */
function showTab(t) {
  ui.tab = t; if (t !== 'roster') stop3D(); ui.figKey = '';
  renderAll();
}
document.addEventListener('change', function (e) {
  var id = e.target.id;
  if (id === 'fighterSel') { S.fighter = e.target.value; ui.estKey = ''; save(); renderArena(); }
  else if (/^eq/.test(id)) updateEqPreview();
});
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  var a = el.dataset.act, g = byId(S.sel), r;
  switch (a) {
    case 'tab': showTab(el.dataset.tab); return;
    case 'select': S.sel = el.dataset.id; ui.sellArm = null; save(); renderRoster(); return;
    case 'v2d': ui.view3d = false; renderDetail(); return;
    case 'v3d': ui.view3d = true; renderDetail(); return;
    case 'train': r = train(g, el.dataset.stat); if (r === 'gold') toast('Nicht genug Denare.'); save(); renderHeader(); renderDetail(); renderRoster(); return;
    case 'smith': r = smith(g, el.dataset.slot); if (r === 'gold') toast('Nicht genug Denare.'); else if (r === 'ok') toast(SMITH_SLOT[el.dataset.slot] + ' verbessert.'); save(); ui.figKey = ''; renderHeader(); renderRoster(); return;
    case 'reequip': var eq = readEq(); r = reequip(g, eq); if (r === 'gold') toast('Nicht genug Denare.'); else if (r === 'ok') toast(g.name + ' ist umgerüstet.'); save(); ui.estKey = ''; renderHeader(); renderRoster(); return;
    case 'heal': var hg = byId(el.dataset.id); r = heal(hg); if (r === 'gold') toast('Nicht genug Denare.'); save(); renderAll(); return;
    case 'sell':
      var sg = byId(el.dataset.id);
      if (ui.sellArm !== sg.id) { ui.sellArm = sg.id; renderDetail(); setTimeout(function () { if (ui.sellArm === sg.id) { ui.sellArm = null; renderDetail(); } }, 3500); return; }
      ui.sellArm = null; var name = sg.name, val = sellValue(sg); r = sell(sg);
      if (r === 'ok') toast(name + ' verkauft für ' + val + ' Denare.'); save(); renderAll(); return;
    case 'tofight': S.fighter = el.dataset.id; ui.estKey = ''; save(); showTab('arena'); return;
    case 'buy':
      r = buyPack(el.dataset.pack);
      if (r.err) { toast(r.err); return; }
      ui.reveals = r.got.map(function (x) { return { g: x, open: false }; }); save(); renderAll();
      $('#reveal').scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'nearest' }); return;
    case 'flip': var rv = ui.reveals[+el.dataset.i]; rv.open = !rv.open; el.classList.toggle('open', rv.open); el.setAttribute('aria-label', rv.open ? rv.g.name : 'Karte aufdecken'); return;
    case 'revealall': ui.reveals.forEach(function (x) { x.open = true; }); renderPacks(); return;
    case 'toroster': if (ui.reveals[0]) S.sel = ui.reveals[0].g.id; ui.reveals = []; showTab('roster'); return;
    case 'diff': S.diff = +el.dataset.d; ui.opp = null; ui.estKey = ''; save(); renderArena(); return;
    case 'reroll': ui.opp = null; ui.estKey = ''; renderArena(); return;
    case 'scout':
      var f = currentFoe(); if (!f || S.gold < SCOUT_COST) { toast('Nicht genug Denare.'); return; }
      S.gold -= SCOUT_COST; f.scouted = true; save(); renderHeader(); renderArena(); renderGrube(); return;
    case 'scoutL':
      var lf = ladderById(el.dataset.id); if (!lf || S.gold < SCOUT_COST) { toast('Nicht genug Denare.'); return; }
      S.gold -= SCOUT_COST; lf.scouted = true; save(); renderAll(); return;
    case 'rest':
      if (S.gold < 10 && S.roster.some(function (x) { return !x.inj; })) { toast('Nicht genug Denare.'); return; }
      S.gold = Math.max(0, S.gold - 10);
      S.roster.forEach(function (x) { if (x.inj > 0) x.inj--; x.moral = clamp(x.moral + 2, 0, 100); });
      chron('info', 'Ruhetag im Ludus. Die Verletzten erholen sich.');
      toast('Ruhetag: Verletzungen heilen um einen Kampf.'); save(); renderAll(); return;
    case 'fight': startFight(); return;
    case 'skip': skipAnim(); return;
    case 'choose':
      if (!S.match || S.match.stage !== 'decide') return;
      var m = S.match; decideWin(m, el.dataset.c); S.match = null; ui.lastMatch = m; save(); renderAll(); return;
    case 'don': var d = +el.dataset.d; ui.don = d < 0 ? null : d; renderArena(); return;
    case 'verdict': doVerdict(); return;
    case 'next': ui.lastMatch = null; ui.logHTML = ''; renderAll(); return;
    case 'target':
      if (el.dataset.kind === 'rival' && rivalState(el.dataset.id).beaten === 0 && S.roster.length >= slotsMax()) toast('Hinweis: Dein Kader ist voll. Statt eines Schülers gäbe es Denare.');
      ui.target = { kind: el.dataset.kind, id: el.dataset.id }; ui.estKey = ''; ui.lastMatch = ui.anim ? ui.lastMatch : null; showTab('arena'); return;
    case 'untarget':
      if (ui.target && ui.target.challenge) { S.challenge = null; loseRuhm(1); toast('Du ziehst zurück: −1 Ruhm.'); save(); }
      ui.target = null; ui.estKey = ''; renderAll(); return;
    case 'evc':
      var ev = S.pendingEvent; if (!ev) return;
      var res = applyChoice(ev, +el.dataset.i);
      if (!res) return;
      if (res.err) { toast(res.err); return; }
      ui.evRes = { title: EVENTS[ev.id].title, text: res.text };
      if (!res.keep) ui.modalOpen = false;
      save(); renderAll(); return;
    case 'evdone':
      ui.evRes = null; ui.modalOpen = false;
      if (S.challenge) { ui.target = null; showTab('arena'); return; }
      renderAll(); return;
    case 'reset':
      if (!ui.resetArm) {
        el.textContent = 'Wirklich alles löschen?';
        ui.resetArm = setTimeout(function () { ui.resetArm = null; el.textContent = 'Spielstand zurücksetzen'; }, 3500); return;
      }
      clearTimeout(ui.resetArm); ui.resetArm = null; el.textContent = 'Spielstand zurücksetzen';
      if (ui.anim) { clearTimeout(ui.anim.t); ui.anim = null; }
      newGame(); MSG.length = 0;
      ui.reveals = []; ui.opp = null; ui.target = null; ui.lastMatch = null; ui.evRes = null; ui.figKey = ''; ui.tab = 'roster';
      save(); renderAll(); toast('Neues Spiel gestartet.'); return;
  }
});

/* ---------- Start ---------- */
(function boot() {
  var loc = null;
  try { loc = parseSave(localStorage.getItem(KEY)); } catch (e) {}
  if (loc) S = loc; else { newGame(); MSG.length = 0; }
  migrate(); fixSelection();
  if (!loc) save();
  renderAll(); setSaveState();
  setTimeout(initRemote, 0);
})();
