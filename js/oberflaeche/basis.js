/*
 * Blutsand · Oberfläche · Grundlagen
 * Gemeinsamer Zustand der Oberfläche, Speichern, Kopfzeile, Reiter, Bausteine (Karten, Kürzel, Persönlichkeiten)
 * und die zentrale Klick-Verteilung. Die anderen Dateien in js/oberflaeche/ hängen ihre Aktionen an AKT
 * und ihre Ansichten an ANSICHT.
 */
var KEY = 'blutsand-save-v2';
var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var TABS = ['ludus', 'kader', 'vertraege', 'arena', 'grube', 'chronik'];
var UNTERZEILE = {
  ludus: 'LUDUS · TRAININGSZENTRUM', kader: 'KADER · VERTRAGSMAPPE', vertraege: 'VERTRÄGE · KISTEN UND SIEGEL',
  arena: 'ARENA · SAND UND BLUT', grube: 'GRUBE · RIVALEN UND RANGLISTE', chronik: 'CHRONIK · GESCHICHTE DEINES LUDUS'
};
var SHORT = { Murmillo: 'MUR', Retiarius: 'RET', Secutor: 'SEC', Thraex: 'THR' };
var STAT_KURZ = { str: 'STÄ', spd: 'TEM', end: 'AUS', tec: 'TEC' };
var GLOW = { common: '#d8d0c2', rare: '#5b9be0', epic: '#b06be0', legendary: '#efbf4f' };
var KOEPFE = ['#7a5238', '#c9936a', '#3a2a1d', '#a8754f', '#e0b48c', '#5a3a22', '#8e2a1e', '#2f5d9a', '#d6c39c', '#efe3c8'];

var ui = {
  tab: 'ludus', view3d: false, figKey: '', probe: null, meldung: '', meldungT: null,
  kFilter: 'alle', kSort: 'kraft', vertrag: null, vertragVon: null, sellArm: null,
  vt: null,
  target: null, opp: null, oppKey: '', est: null, estKey: '', lastMatch: null, don: null, suspense: false,
  buehne: null, protokoll: false, tempo: 1, kamera: 'auto',
  evRes: null, modalOpen: false, resetArm: null
};
var AKT = {};      // Klick-Aktionen: AKT[name](element, ereignis)
var ANSICHT = {};  // Zeichnen der Bereiche: ANSICHT[tab]()

function $(s) { return document.querySelector(s); }
function fmt(n) { return Number(n).toLocaleString('de-DE'); }
function roemisch(n) {
  if (!n) return '–';
  var t = [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']], s = '';
  t.forEach(function (x) { while (n >= x[0]) { s += x[1]; n -= x[0]; } });
  return s;
}
function merke(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function lies(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('zeigen');
  clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('zeigen'); }, 2800);
}
function neuStarten(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

/* ---------- Speichern: Browser sofort, Claude-Konto im Hintergrund (nur im Claude-Artifact) ---------- */
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
  if (S.pendingPack === undefined) S.pendingPack = null;
  S.roster.forEach(function (g) { g.tmp = g.tmp || []; g.lv = g.lv || { w: 0, a: 0, s: 0 }; g.pers = g.pers || []; });
  if (S.ladder.length < 8) refillLadder();
}
function save() {
  S.savedAt = Date.now();
  var j = serialize();
  merke(KEY, j);
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
  $('#speicherStand').textContent = store.ref ? 'Spielstand wird in deinem Claude-Konto gespeichert.' : 'Spielstand wird in diesem Browser gespeichert.';
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
        if (remote && (remote.savedAt || 0) > (S.savedAt || 0) && !kampfLaeuft()) {
          S = remote; migrate(); fixSelection();
          ui.lastMatch = null; ui.opp = null; ui.vt = null; ui.figKey = ''; ui.target = null; ui.buehne = null; ui.vertrag = null;
          merke(KEY, serialize());
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
function codeChips(g, mitStufe, eq) {
  eq = eq || g.eq;
  var c = codeOf(eq).map(function (x) { return '<span class="code" title="' + esc(CODES[x]) + '">' + x + '</span>'; }).join('');
  if (isTypical({ eq: eq, type: g.type })) c += '<span class="code stern" title="Meisterschaft: Diese Ausrüstung ist typisch für den ' + g.type + '. +4 % Schaden und Trefferchance.">★</span>';
  if (mitStufe && g.lv && (g.lv.w || g.lv.a || g.lv.s)) c += '<span class="code stufe" title="Schmiedestufen: Waffe ' + g.lv.w + ', Rüstung ' + g.lv.a + ', Schild ' + g.lv.s + '">+' + g.lv.w + '/' + g.lv.a + '/' + g.lv.s + '</span>';
  return '<div class="chips">' + c + '</div>';
}
function persChip(p) {
  var k = PERS[p.id].k, sym = k === 'buff' ? '▲' : k === 'debuff' ? '▼' : '◆';
  return '<span class="pk ' + k + '" title="' + esc(persEffect(p)) + '">' + sym + ' ' + PERS[p.id].n + ' ' + ROMAN[p.lv] + '</span>';
}
function persChips(g, verdeckt) {
  if (verdeckt) return '<div class="chips"><span class="pk unk" title="Schicke einen Späher oder kämpfe gegen ihn, um mehr zu erfahren.">Persönlichkeit unbekannt</span></div>';
  if (!g.pers.length) return '<div class="chips"><span class="pk unk">Keine besonderen Eigenschaften</span></div>';
  return '<div class="chips">' + g.pers.map(persChip).join('') + '</div>';
}
function daumenSVG(hoch, farbe) {
  return '<svg viewBox="0 0 48 48" aria-hidden="true"' + (hoch ? '' : ' style="transform:rotate(180deg)"') + '>' +
    '<path d="M14 22h7l4-12c1-3 6-2 6 2v8h8c2 0 4 2 3 5l-3 12c-1 2-2 3-4 3H21l-7-3z" fill="' + (farbe || 'currentColor') + '"/><rect x="5" y="21" width="8" height="20" fill="' + (farbe || 'currentColor') + '"/></svg>';
}
function maxLeben(g) { return Math.round((28 + g.end * 4.5) * (1 + fxOf(g).hp)); }
function istBeschaeftigt(g) { return !!(S.match && S.match.gid === g.id && S.match.stage !== 'done'); }
/* Kasten mit dem Stand zum Aufstieg in die nächste Seltenheit (Ludus und Vertrag) */
function aufstiegBoxHTML(g) {
  var au = aufstiegInfo(g); if (au.ende) return '<p class="hinweis">Höchste Seltenheit erreicht.</p>';
  var A = AUFSTIEG[g.rar], ziel = RAR[au.ziel].name, pct = Math.min(100, Math.round((g.fame || 0) / FAME_MIN[A.stufe] * 100));
  return '<div class="aufstieg-box' + (au.bereit ? ' bereit' : '') + '"><span class="unterkopf">AUFSTIEG ZU ' + ziel.toUpperCase() + '</span>' +
    (au.genug ? '' : '<div class="balken" role="img" aria-label="Ruhm ' + (g.fame || 0) + ' von ' + FAME_MIN[A.stufe] + '"><i style="width:' + pct + '%;background:var(--gold)"></i></div>') +
    (au.bereit ? '<p>Gewinnt er den Aufstiegskampf gegen einen Prüfer, wird er ' + ziel + '. Kein Kampf auf Leben und Tod.</p><div class="knopfreihe"><button class="knopf gold" data-act="aufstieg" data-id="' + g.id + '">Zum Aufstiegskampf</button></div>'
      : '<p class="hinweis">' + esc(au.grund) + '</p>') + '</div>';
}
/* Bogenkarte: o.gr = '' | 'm' | 'l', o.knopf = { act, id, label } macht sie anklickbar */
function karteHTML(g, o) {
  o = o || {};
  var tag = o.knopf ? 'button' : 'div';
  var attr = o.knopf ? ' type="button" data-act="' + o.knopf.act + '" data-id="' + g.id + '" aria-label="' + esc(o.knopf.label) + '"' : '';
  var eq = o.eq || g.eq, gg = o.eq ? Object.assign({}, g, { eq: eq }) : g;
  var werte = STATS.map(function (s) { return '<span><span>' + STAT_KURZ[s[0]] + '</span><b>' + g[s[0]] + '</b></span>'; }).join('');
  var codes = codeOf(eq).map(function (x) { return '<span class="code">' + x + '</span>'; }).join('');
  return '<' + tag + ' class="karte ' + (o.gr || '') + ' r-' + g.rar + '"' + attr + '><span class="innen">' +
    '<span class="wert"><b>' + power(g) + '</b><small>' + SHORT[g.type] + '</small></span>' +
    (g.inj && !o.ohneStatus ? '<span class="verletzt">VERLETZT</span>' : o.knopf && aufstiegInfo(g).bereit ? '<span class="verletzt bereit-marke">▲ AUFSTIEG</span>' : '') +
    figSVG(gg, { crop: true, ground: false, deko: true }) +
    '<span class="schild">' + esc(g.name) + '</span>' +
    '<span class="codes">' + codes + '</span>' +
    (o.pers ? '<span class="chips" style="justify-content:center;padding:4px 6px 0">' + g.pers.slice(0, 2).map(persChip).join('') + '</span>' : '') +
    '<span class="werte">' + werte + '</span>' +
    '</span></' + tag + '>';
}
function statusMarken(g) {
  var t = '';
  if (istBeschaeftigt(g)) t += '<span class="marke rot">Wartet auf das Urteil</span>';
  if (g.inj) t += '<span class="marke rot">Verletzt: ' + g.inj + (g.inj === 1 ? ' Kampf' : ' Kämpfe') + '</span>';
  (g.tmp || []).forEach(function (x) { t += '<span class="marke">' + x.n + ': ' + x.f + (x.f === 1 ? ' Kampf' : ' Kämpfe') + '</span>'; });
  if (g.scars) t += '<span class="marke">' + g.scars + (g.scars === 1 ? ' Narbe' : ' Narben') + '</span>';
  if (g.id === S.fighter && !g.inj) t += '<span class="marke blau">Für die Arena gewählt</span>';
  return t ? '<div class="chips">' + t + '</div>' : '';
}

/* ---------- Kopf und Reiter ---------- */
function renderKopf() {
  var r = rankIdx(), R = RANKS[r], N = RANKS[r + 1];
  var pct = N ? clamp((S.ruhm - R.min) / (N.min - R.min) * 100, 0, 100) : 100;
  $('#plaketten').innerHTML =
    '<div class="plakette gold"><span>DENARE</span><b>' + fmt(S.gold) + '</b></div>' +
    '<div class="plakette"><span>SIEGE · NIEDERL.</span><b>' + S.wins + ' · ' + S.losses + '</b></div>' +
    '<div class="plakette rang"><div class="zeile"><span>' + R.n.toUpperCase() + '</span><span class="zahl">' + fmt(S.ruhm) + (N ? ' / ' + fmt(N.min) : '') + ' RUHM</span></div>' +
    '<div class="balken" role="img" aria-label="Fortschritt zum nächsten Rang: ' + Math.round(pct) + ' %"><i style="width:' + pct + '%"></i></div>' +
    '<small>' + (N ? 'Nächster Rang: ' + N.n : 'Höchster Rang erreicht') +
    (S.missgunst > 0 ? ' · <span class="mg">Missgunst noch ' + S.missgunst + (S.missgunst === 1 ? ' Kampf' : ' Kämpfe') + '</span>' : '') + '</small></div>';
  $('#unterzeile').textContent = UNTERZEILE[ui.tab];
}
function renderReiter() {
  TABS.forEach(function (t) {
    $('#view-' + t).hidden = t !== ui.tab;
    var b = $('#tab-' + t), on = t === ui.tab;
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
    var wartet = (t === 'arena' && ((S.match && S.match.stage !== 'done') || S.challenge)) || (t === 'vertraege' && S.pendingPack);
    var p = b.querySelector('.punkt');
    if (wartet && !p) b.insertAdjacentHTML('beforeend', '<span class="punkt" aria-label="wartet auf dich"></span>');
    if (!wartet && p) p.remove();
  });
}
function renderAll() {
  renderKopf(); renderReiter();
  ANSICHT[ui.tab]();
  if (ANSICHT.ueberlage) ANSICHT.ueberlage();
  renderModal();
}
function zeige(t) {
  if (t === ui.tab) return;
  if (ANSICHT.verlassen) ANSICHT.verlassen(ui.tab, t);
  ui.tab = t;
  if (t !== 'ludus') stop3D();
  ui.figKey = '';
  renderAll();
  window.scrollTo({ top: 0, behavior: 'auto' });
}
function kampfLaeuft() { return !!(ui.kampf); }

/* ---------- Ereignis-Fenster ---------- */
function vtLaeuft() { return !!(ui.vt && ui.vt.phase !== 'wahl' && ui.vt.phase !== 'fertig'); }
function renderModal() {
  var md = $('#modal'), ev = S.pendingEvent;
  if (ev && !eventValid(ev)) { S.pendingEvent = null; ev = null; save(); }
  var gesperrt = kampfLaeuft() || (S.match && S.match.stage !== 'done') || ui.suspense || (ui.lastMatch && ui.tab === 'arena') || (ui.tab === 'vertraege' && vtLaeuft());
  if ((!ev && !ui.evRes) || gesperrt) { md.hidden = true; ui.modalOpen = false; return; }
  var html;
  if (!ev) {
    html = '<p class="eyebrow">EREIGNIS</p><h2 id="mTitel">' + esc(ui.evRes.title) + '</h2><p class="res">' + esc(ui.evRes.text) + '</p>' +
      '<div class="knopfreihe"><button class="knopf" data-act="evdone">Weiter</button></div>';
  } else {
    var E = EVENTS[ev.id], ch = eventChoices(ev);
    html = '<p class="eyebrow">EREIGNIS ZWISCHEN DEN KÄMPFEN</p><h2 id="mTitel">' + esc(E.title) + '</h2><p>' + esc(E.text(ev)) + '</p>' +
      (ui.evRes ? '<p class="res">' + esc(ui.evRes.text) + '</p>' : '') +
      '<div class="wahlen">' + ch.map(function (c, i) {
        var arm = c.cost && S.gold < c.cost;
        return '<button class="wahl-knopf" data-act="evc" data-i="' + i + '"' + (arm ? ' disabled' : '') + '><b>' + esc(c.l) + (c.cost ? ' · ' + c.cost + ' Den.' : '') + '</b>' + (c.s ? '<span>' + esc(c.s) + '</span>' : '') + (arm ? '<em>Nicht genug Denare</em>' : '') + '</button>';
      }).join('') + '</div>';
  }
  $('#mInhalt').innerHTML = html;
  md.hidden = false;
  if (!ui.modalOpen) { ui.modalOpen = true; var b = md.querySelector('button:not([disabled])'); if (b) b.focus(); }
}
AKT.evc = function (el) {
  var ev = S.pendingEvent; if (!ev) return;
  var res = applyChoice(ev, +el.dataset.i);
  if (!res) return;
  if (res.err) { toast(res.err); return; }
  ui.evRes = { title: EVENTS[ev.id].title, text: res.text };
  if (!res.keep) ui.modalOpen = false;
  save(); renderAll();
};
AKT.evdone = function () {
  ui.evRes = null; ui.modalOpen = false;
  if (S.challenge) { ui.target = null; if (ui.tab !== 'arena') { zeige('arena'); return; } }
  renderAll();
};

/* ---------- Klick-Verteilung ---------- */
AKT.tab = function (el) { zeige(el.dataset.tab); };
AKT.reset = function (el) {
  if (!ui.resetArm) {
    el.textContent = 'Wirklich alles löschen?';
    ui.resetArm = setTimeout(function () { ui.resetArm = null; el.textContent = 'Spielstand zurücksetzen'; }, 3500); return;
  }
  clearTimeout(ui.resetArm); ui.resetArm = null; el.textContent = 'Spielstand zurücksetzen';
  if (ANSICHT.abbrechen) ANSICHT.abbrechen();
  newGame(); MSG.length = 0;
  ui.vt = null; ui.opp = null; ui.target = null; ui.lastMatch = null; ui.evRes = null; ui.figKey = ''; ui.probe = null;
  ui.vertrag = null; ui.buehne = null; ui.tab = 'ludus';
  save(); renderAll(); toast('Neues Spiel gestartet.');
};
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  var f = AKT[el.dataset.act];
  if (f) f(el, e);
});
document.addEventListener('change', function (e) {
  var el = e.target.closest('[data-change]');
  if (el && AKT[el.dataset.change]) AKT[el.dataset.change](el, e);
});
