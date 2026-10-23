/* ===================== Figuren: 2D (SVG) und 3D (three.js) ===================== */
var RC = { common: '#a39a8e', rare: '#5b9be0', epic: '#b06be0', legendary: '#efbf4f' };
var SKINS = ['#c9936a', '#a8754f', '#e0b48c', '#7a5238'];
function shade(hex, a) {
  var n = parseInt(hex.slice(1), 16);
  var r = clamp((n >> 16) + a, 0, 255), g = clamp(((n >> 8) & 255) + a, 0, 255), b = clamp((n & 255) + a, 0, 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function wkey(eq) {
  if (eq.grip === 'DW') return eq.weapon === 'LW' ? 'dual' : 'dualaxe';
  if (eq.grip === '2H') return eq.weapon === 'LW' ? 'spear' : 'great';
  return eq.weapon === 'LW' ? 'sword' : 'axe';
}
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

function figSVG(g, o) {
  o = o || {};
  var eq = g.eq, A = eq.armor, rc = RC[g.rar], tc = TYPES[g.type].color, skin = SKINS[g.skin || 0], W = wkey(eq);
  var steel = '#dfe5ea', steel2 = '#b9c2cf', wood = '#6b4a2b', bronze = '#d9903f', dk = '#161a26';
  var cl = { LR: { t: '#b88a52', a: skin, l: skin, bt: '#6b4326' }, MR: { t: '#6f7f96', a: '#6f7f96', l: '#7a4a2a', bt: '#4a3626' }, SR: { t: '#8d97ab', a: '#8d97ab', l: '#8d97ab', bt: '#5a6572' } }[A];
  var out = [];
  function P(pts, f) { out.push('<polygon points="' + pts.join(' ') + '" fill="' + f + '"/>'); }
  function T(cx, yT, yB, wT, wB, c) { var l = cx - wT / 2, lb = cx - wB / 2, r = cx + wT / 2, rb = cx + wB / 2; P([l, yT, cx, yT, cx, yB, lb, yB], shade(c, -24)); P([cx, yT, r, yT, rb, yB, cx, yB], c); }
  function M(pts) { return pts.map(function (v, i) { return i % 2 === 0 ? 240 - v : v; }); }
  if (o.ground !== false) out.push('<ellipse cx="120" cy="285" rx="70" ry="8" fill="' + dk + '" stroke="' + rc + '" stroke-width="3"/>');
  var sp = o.spark ? RAR_KEYS.indexOf(g.rar) * 2 : 0, SPK = [[30, 60], [212, 74], [24, 150], [218, 160], [36, 236], [206, 240]];
  for (var s = 0; s < sp; s++) { var q = SPK[s]; P([q[0], q[1] - 8, q[0] + 5, q[1], q[0], q[1] + 8, q[0] - 5, q[1]], rc); }
  // Beine, Schienen, Stiefel
  T(109, 190, 272, 22, 18, cl.l); T(131, 190, 272, 22, 18, cl.l);
  if (A !== 'LR') { var gc = A === 'SR' ? bronze : '#5a3a22'; T(109, 206, 226, 23, 22, gc); T(131, 206, 226, 23, 22, gc); }
  T(107, 268, 282, 24, 30, cl.bt); T(133, 268, 282, 24, 30, cl.bt);
  // Rumpf
  T(120, 190, 210, 56, 68, A === 'SR' ? '#8d97ab' : '#7a4a2a');
  T(120, 112, 194, 64, 50, cl.t);
  P([120, 112, 152, 112, 142, 152], shade(cl.t, 24));
  if (A === 'MR') { for (var ry = 124; ry < 172; ry += 14) for (var rx = 102; rx < 140; rx += 12) P([rx, ry, rx + 5, ry + 6, rx, ry + 12, rx - 5, ry + 6], shade(cl.t, 30)); }
  if (A === 'SR') { [132, 148, 164].forEach(function (y) { P([90, y, 150, y, 149, y + 3, 91, y + 3], shade(cl.t, -40)); }); }
  if (A === 'LR') P([98, 112, 108, 112, 142, 190, 132, 190], rc);
  else P([120, 134, 128, 144, 120, 154, 112, 144], rc);
  T(120, 176, 190, 52, 50, bronze);
  // Schultern
  if (A === 'SR') { P([80, 110, 104, 104, 104, 134], '#c2792f'); P([160, 110, 136, 104, 136, 134], '#e8ab5f'); P([80, 110, 104, 104, 104, 109, 84, 114], rc); P([160, 110, 136, 104, 136, 109, 156, 114], rc); }
  if (A === 'MR') { P([88, 114, 104, 106, 104, 128], '#5a3a22'); P([152, 114, 136, 106, 136, 128], '#7a4a2a'); }
  // Arme
  var twoH = W === 'spear' || W === 'great';
  if (twoH) { P([86, 116, 102, 114, 146, 166, 136, 178], shade(cl.a, -24)); P([134, 168, 148, 164, 152, 178, 138, 184], shade(skin, -24)); }
  else { P([86, 116, 102, 114, 98, 182, 86, 178], shade(cl.a, -24)); P([86, 178, 98, 182, 97, 194, 87, 192], shade(skin, -24)); }
  P([138, 114, 154, 116, 154, 178, 142, 182], cl.a); P([142, 182, 154, 178, 153, 192, 143, 194], skin);
  if (g.inj) P([138, 132, 154, 134, 154, 142, 138, 140], '#e8e2d4');
  // Kopf
  T(120, 90, 106, 16, 20, skin);
  P([120, 38, 142, 48, 142, 76, 120, 94], skin); P([120, 38, 98, 48, 98, 76, 120, 94], shade(skin, -24));
  if (A !== 'SR') { P([107, 70, 115, 70, 115, 75, 107, 75], dk); P([125, 70, 133, 70, 133, 75, 125, 75], dk); }
  if (g.scars && A !== 'SR') out.push('<line x1="126" y1="64" x2="136" y2="84" stroke="#8e2f22" stroke-width="2.5"/>');
  if (A === 'LR') { P([120, 38, 98, 48, 98, 58, 120, 58], '#2b1f15'); P([120, 38, 142, 48, 142, 58, 120, 58], '#3a2a1d'); P([98, 58, 142, 58, 142, 63, 98, 63], rc); }
  if (A === 'MR') {
    P([120, 34, 96, 46, 96, 66, 120, 66], shade(bronze, -24)); P([120, 34, 144, 46, 144, 66, 120, 66], bronze);
    P([117, 66, 123, 66, 123, 84, 117, 84], bronze); P([96, 66, 104, 66, 104, 80, 96, 78], '#b8742c'); P([144, 66, 136, 66, 136, 80, 144, 78], '#e8ab5f');
    P([120, 14, 131, 36, 109, 36], rc);
  }
  if (A === 'SR') {
    P([120, 36, 96, 48, 96, 78, 120, 96], '#6f7a90'); P([120, 36, 144, 48, 144, 78, 120, 96], '#8d97ab'); P([120, 36, 144, 48, 120, 60], '#a9b3c4');
    P([102, 64, 138, 64, 138, 71, 102, 71], dk);
    P([120, 8, 104, 34, 120, 36], shade(rc, -40)); P([120, 8, 138, 34, 120, 36], rc);
  }
  // Schild
  if (eq.shield === 'SCU') {
    P([44, 112, 68, 115, 67, 214, 44, 196], shade(tc, -30)); P([68, 115, 92, 118, 92, 196, 67, 214], tc);
    P([44, 112, 92, 118, 92, 124, 44, 118], bronze); P([68, 142, 83, 156, 68, 170, 53, 156], rc);
    if (g.lv && g.lv.s >= 3) { P([44, 190, 67, 208, 67, 214, 44, 196], bronze); P([67, 208, 92, 190, 92, 196, 67, 214], bronze); }
  }
  if (eq.shield === 'PAR') {
    var pts = [], cx = 70, cy = 150, R = 28;
    for (var k = 0; k < 8; k++) { var an = Math.PI / 8 + k * Math.PI / 4; pts.push([Math.round(cx + Math.cos(an) * R), Math.round(cy + Math.sin(an) * R)]); }
    P([cx, cy - R, pts[5][0], pts[5][1], pts[4][0], pts[4][1], pts[3][0], pts[3][1], pts[2][0], pts[2][1], cx, cy + R].concat([]), shade(tc, -30));
    P([cx, cy - R, pts[6][0], pts[6][1], pts[7][0], pts[7][1], pts[0][0], pts[0][1], pts[1][0], pts[1][1], cx, cy + R], tc);
    P([cx, cy - 8, cx + 8, cy, cx, cy + 8, cx - 8, cy], rc);
    out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (R - 3) + '" fill="none" stroke="' + bronze + '" stroke-width="2"/>');
  }
  // Waffen
  function sword(mirror) {
    var f = mirror ? M : function (x) { return x; };
    P(f([146, 186, 152, 188, 186, 112, 177, 108]), mirror ? steel2 : steel); P(f([177, 108, 186, 112, 182, 122]), steel2);
    P(f([140, 184, 160, 196, 156, 200, 136, 188]), bronze); P(f([148, 198, 153, 204, 148, 210, 143, 204]), rc);
  }
  function hatchet(mirror) {
    var f = mirror ? M : function (x) { return x; };
    P(f([146, 194, 152, 194, 170, 118, 164, 116]), wood);
    P(f([163, 104, 186, 98, 190, 128, 170, 130]), steel); P(f([163, 104, 172, 102, 174, 129, 170, 130]), '#9aa5b1');
    P(f([147, 196, 152, 201, 147, 206, 142, 201]), rc);
  }
  if (W === 'sword') sword(false);
  if (W === 'dual') { sword(false); sword(true); }
  if (W === 'dualaxe') { hatchet(false); hatchet(true); }
  if (W === 'axe') {
    P([147, 100, 153, 100, 155, 216, 149, 216], wood); P([153, 98, 170, 92, 170, 131, 153, 128], '#9aa5b1');
    P([170, 92, 190, 86, 190, 134, 170, 131], steel); P([162, 108, 168, 114, 162, 120, 156, 114], rc); P([152, 214, 157, 220, 152, 226, 147, 220], rc);
  }
  if (W === 'spear') {
    P([148, 26, 152, 26, 152, 268, 148, 268], '#8a6a45');
    P([134, 58, 166, 58, 166, 64, 134, 64], steel2);
    [[134, 140], [147.5, 152.5], [160, 166]].forEach(function (x, i) {
      var top = i === 1 ? 18 : 26;
      P([x[0], top, x[1], top, x[1], 60, x[0], 60], steel); P([x[0], top, (x[0] + x[1]) / 2, top - 11, x[1], top], steel);
    });
    P([150, 56, 155, 61, 150, 66, 145, 61], rc);
  }
  if (W === 'great') {
    P([146, 50, 152, 50, 154, 264, 148, 264], wood); P([146, 50, 149, 34, 152, 50], steel);
    P([152, 56, 171, 50, 171, 98, 152, 92], '#8997a6'); P([171, 50, 190, 44, 190, 104, 171, 98], steel);
    P([146, 62, 130, 74, 146, 86], '#8997a6'); P([168, 66, 174, 72, 168, 78, 162, 72], rc);
  }
  var lab = esc(g.name + ', ' + g.type + ', ' + codeStr(eq));
  return '<svg viewBox="0 0 240 300" class="fig' + (o.cls ? ' ' + o.cls : '') + '" role="img" aria-label="' + lab + '">' +
    (o.flip ? '<g transform="translate(240 0) scale(-1 1)">' : '<g>') + out.join('') + '</g></svg>';
}

/* ---------- 3D ---------- */
var threeP = null;
function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (threeP) return threeP;
  threeP = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = function () { window.THREE ? res(window.THREE) : rej(new Error('three')); };
    s.onerror = function () { threeP = null; rej(new Error('three')); };
    document.head.appendChild(s);
  });
  return threeP;
}
function build3D(T, g) {
  var grp = new T.Group(), A = g.eq.armor, W = wkey(g.eq), rcH = parseInt(RC[g.rar].slice(1), 16), tcH = parseInt(TYPES[g.type].color.slice(1), 16);
  function v(x, y, z) { return new T.Vector3(x, y, z); }
  function Mt(c, e) { return new T.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.7, metalness: 0.25, emissive: e || 0, emissiveIntensity: e ? 0.7 : 0 }); }
  function mk(geo, mat, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x, y, z); return m; }
  function limb(p1, p2, r1, r2, mat) {
    var d = new T.Vector3().subVectors(p2, p1), len = d.length();
    var m = new T.Mesh(new T.CylinderGeometry(r2, r1, len, 6), mat);
    m.position.copy(p1).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()); return m;
  }
  var skinC = parseInt(SKINS[g.skin || 0].slice(1), 16);
  var skin = Mt(skinC), dark = Mt(0x161a26), bronze = Mt(0xd9903f), steel = Mt(0xdfe5ea), rcm = Mt(rcH, rcH), wood = Mt(0x6b4a2b);
  var C = { LR: { t: 0xb88a52, l: skinC, a: skinC, bt: 0x6b4326 }, MR: { t: 0x6f7f96, l: 0x7a4a2a, a: 0x6f7f96, bt: 0x4a3626 }, SR: { t: 0x8d97ab, l: 0x8d97ab, a: 0x8d97ab, bt: 0x5a6572 } }[A];
  function sword(len) {
    var s = new T.Group();
    s.add(mk(new T.BoxGeometry(0.07, len, 0.02), steel, 0, 0.14 + len / 2, 0));
    s.add(mk(new T.BoxGeometry(0.3, 0.05, 0.07), bronze, 0, 0.12, 0));
    s.add(mk(new T.CylinderGeometry(0.028, 0.028, 0.2, 5), wood, 0, 0, 0));
    s.add(mk(new T.OctahedronGeometry(0.05), rcm, 0, -0.13, 0));
    return s;
  }
  function hatchet() {
    var s = new T.Group();
    s.add(mk(new T.CylinderGeometry(0.03, 0.03, 0.85, 5), wood, 0, 0.3, 0));
    s.add(mk(new T.BoxGeometry(0.3, 0.26, 0.05), steel, 0.15, 0.62, 0));
    s.add(mk(new T.OctahedronGeometry(0.045), rcm, 0, -0.14, 0));
    return s;
  }
  [-1, 1].forEach(function (s) {
    grp.add(limb(v(s * 0.14, 0.98, 0), v(s * 0.14, 0.12, 0), 0.115, 0.085, Mt(C.l)));
    if (A === 'SR') { grp.add(limb(v(s * 0.14, 0.58, 0), v(s * 0.14, 0.12, 0), 0.13, 0.1, Mt(0xa9b3c4))); grp.add(mk(new T.SphereGeometry(0.1, 5, 4), bronze, s * 0.14, 0.6, 0.05)); }
    if (A === 'MR') grp.add(limb(v(s * 0.14, 0.58, 0), v(s * 0.14, 0.12, 0), 0.125, 0.095, Mt(0x5a3a22)));
    grp.add(mk(new T.BoxGeometry(0.2, 0.12, 0.34), Mt(C.bt), s * 0.14, 0.06, 0.05));
  });
  grp.add(mk(new T.CylinderGeometry(0.3, 0.36, 0.24, 8), Mt(A === 'SR' ? 0x8d97ab : 0x7a4a2a), 0, 0.98, 0));
  var torso = mk(new T.CylinderGeometry(0.3, 0.25, 0.72, 6), Mt(C.t), 0, 1.4, 0); torso.scale.z = 0.7; grp.add(torso);
  var belt = mk(new T.CylinderGeometry(0.265, 0.265, 0.09, 6), bronze, 0, 1.08, 0); belt.scale.z = 0.7; grp.add(belt);
  if (A === 'LR') { var sash = mk(new T.BoxGeometry(0.09, 0.85, 0.02), rcm, 0, 1.4, 0.22); sash.rotation.z = 0.55; grp.add(sash); }
  else grp.add(mk(new T.OctahedronGeometry(0.06), rcm, 0, 1.52, 0.22));
  if (A === 'SR') [-1, 1].forEach(function (s) { var p = mk(new T.SphereGeometry(0.2, 5, 4), Mt(0xc2792f), s * 0.4, 1.75, 0); p.scale.y = 0.65; grp.add(p); });
  if (A === 'MR') [-1, 1].forEach(function (s) { var p = mk(new T.SphereGeometry(0.15, 5, 4), Mt(0x5a3a22), s * 0.4, 1.75, 0); p.scale.y = 0.7; grp.add(p); });
  var R = v(0.52, 1.15, 0.2), L = v(-0.52, 1.15, 0.15);
  if (W === 'dual' || W === 'dualaxe') { R = v(0.58, 1.2, 0.3); L = v(-0.58, 1.2, 0.3); }
  if (W === 'great' || W === 'spear') { R = v(0.45, 1.1, 0.32); L = v(0.45, 1.58, 0.32); }
  if (g.eq.shield !== '–') L = v(-0.5, 1.2, 0.2);
  var armMat = Mt(C.a);
  grp.add(limb(v(-0.4, 1.7, 0), L, 0.08, 0.06, armMat)); grp.add(limb(v(0.4, 1.7, 0), R, 0.08, 0.06, armMat));
  grp.add(mk(new T.SphereGeometry(0.075, 5, 4), skin, L.x, L.y, L.z)); grp.add(mk(new T.SphereGeometry(0.075, 5, 4), skin, R.x, R.y, R.z));
  grp.add(mk(new T.CylinderGeometry(0.07, 0.08, 0.14, 5), skin, 0, 1.82, 0));
  var head = mk(new T.SphereGeometry(0.2, 6, 5), skin, 0, 1.98, 0); head.scale.y = 1.1; grp.add(head);
  if (A !== 'SR') { grp.add(mk(new T.BoxGeometry(0.045, 0.04, 0.03), dark, -0.07, 1.99, 0.18)); grp.add(mk(new T.BoxGeometry(0.045, 0.04, 0.03), dark, 0.07, 1.99, 0.18)); }
  if (A === 'LR') { grp.add(mk(new T.SphereGeometry(0.215, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), Mt(0x3a2a1d), 0, 2.02, 0)); grp.add(mk(new T.CylinderGeometry(0.212, 0.212, 0.05, 6), rcm, 0, 2.03, 0)); }
  if (A === 'MR') { grp.add(mk(new T.SphereGeometry(0.225, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), bronze, 0, 2.0, 0)); grp.add(mk(new T.BoxGeometry(0.04, 0.15, 0.03), bronze, 0, 1.93, 0.2)); grp.add(mk(new T.ConeGeometry(0.07, 0.24, 4), rcm, 0, 2.3, 0)); }
  if (A === 'SR') { var hm = mk(new T.SphereGeometry(0.235, 6, 5), Mt(0x8d97ab), 0, 1.99, 0); hm.scale.set(1, 1.1, 1.05); grp.add(hm); grp.add(mk(new T.BoxGeometry(0.3, 0.045, 0.04), dark, 0, 2.0, 0.22)); var cr = mk(new T.ConeGeometry(0.09, 0.36, 4), rcm, 0, 2.38, -0.02); cr.rotation.x = -0.25; grp.add(cr); }
  if (g.eq.shield === 'SCU') {
    var sg = new T.Group(); sg.add(mk(new T.BoxGeometry(0.6, 1.05, 0.06), bronze, 0, 0, -0.02)); sg.add(mk(new T.BoxGeometry(0.52, 0.95, 0.09), Mt(tcH), 0, 0, 0));
    var bo = mk(new T.ConeGeometry(0.1, 0.1, 4), rcm, 0, 0, 0.07); bo.rotation.x = Math.PI / 2; sg.add(bo);
    sg.position.set(-0.58, 1.25, 0.3); sg.rotation.y = 0.5; grp.add(sg);
  }
  if (g.eq.shield === 'PAR') {
    var pg = new T.Group(), r1 = mk(new T.CylinderGeometry(0.33, 0.33, 0.05, 8), bronze, 0, 0, -0.02); r1.rotation.x = Math.PI / 2; pg.add(r1);
    var r2 = mk(new T.CylinderGeometry(0.29, 0.29, 0.08, 8), Mt(tcH), 0, 0, 0); r2.rotation.x = Math.PI / 2; pg.add(r2);
    var b2 = mk(new T.ConeGeometry(0.08, 0.09, 4), rcm, 0, 0, 0.06); b2.rotation.x = Math.PI / 2; pg.add(b2);
    pg.position.set(-0.56, 1.25, 0.3); pg.rotation.y = 0.5; grp.add(pg);
  }
  if (W === 'axe') {
    grp.add(limb(v(0.52, 0.75, 0.2), v(0.52, 1.95, 0.2), 0.03, 0.03, wood));
    grp.add(mk(new T.BoxGeometry(0.4, 0.34, 0.07), Mt(0x9aa5b1), 0.72, 1.8, 0.2)); grp.add(mk(new T.BoxGeometry(0.16, 0.34, 0.07), steel, 0.88, 1.8, 0.2));
    grp.add(mk(new T.ConeGeometry(0.06, 0.2, 4), Mt(0x9aa5b1), 0.52, 2.05, 0.2)); grp.add(mk(new T.OctahedronGeometry(0.05), rcm, 0.52, 0.72, 0.2));
  }
  if (W === 'great') {
    grp.add(limb(v(0.45, 0.0, 0.32), v(0.45, 2.3, 0.32), 0.035, 0.035, wood));
    grp.add(mk(new T.BoxGeometry(0.55, 0.46, 0.08), Mt(0x8997a6), 0.72, 2.02, 0.32)); grp.add(mk(new T.BoxGeometry(0.2, 0.46, 0.08), steel, 0.95, 2.02, 0.32));
    grp.add(mk(new T.ConeGeometry(0.07, 0.25, 4), steel, 0.45, 2.4, 0.32)); grp.add(mk(new T.OctahedronGeometry(0.06), rcm, 0.7, 2.02, 0.37));
  }
  if (W === 'spear') {
    grp.add(limb(v(0.45, 0.0, 0.32), v(0.45, 2.45, 0.32), 0.028, 0.028, Mt(0x8a6a45)));
    grp.add(mk(new T.BoxGeometry(0.32, 0.04, 0.04), steel, 0.45, 2.45, 0.32));
    [-0.14, 0, 0.14].forEach(function (dx) { grp.add(mk(new T.ConeGeometry(0.03, dx ? 0.3 : 0.38, 4), steel, 0.45 + dx, dx ? 2.6 : 2.64, 0.32)); });
    grp.add(mk(new T.OctahedronGeometry(0.05), rcm, 0.45, 2.45, 0.36));
  }
  if (W === 'dual' || W === 'sword') {
    var s1 = sword(0.9); s1.position.copy(R); s1.rotation.x = 0.55; s1.rotation.z = -0.25; grp.add(s1);
    if (W === 'dual') { var s2 = sword(0.9); s2.position.copy(L); s2.rotation.x = 0.55; s2.rotation.z = 0.25; grp.add(s2); }
  }
  if (W === 'dualaxe') {
    var h1 = hatchet(); h1.position.copy(R); h1.rotation.x = 0.5; h1.rotation.z = -0.3; grp.add(h1);
    var h2 = hatchet(); h2.position.copy(L); h2.rotation.x = 0.5; h2.rotation.z = 0.3; h2.rotation.y = Math.PI; grp.add(h2);
  }
  return grp;
}
var viewer3D = null;
function stop3D() { if (viewer3D) { viewer3D.stop(); viewer3D = null; } }
function mount3D(box, g) {
  stop3D();
  box.innerHTML = '<p class="hint">3D-Ansicht wird geladen…</p>';
  return loadThree().then(function (T) {
    if (!box.isConnected) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'c3d'; canvas.setAttribute('aria-label', '3D-Ansicht von ' + g.name + '. Ziehen zum Drehen.');
    box.innerHTML = ''; box.appendChild(canvas);
    var renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true }); }
    catch (e) { box.innerHTML = '<p class="hint">Dein Browser kann keine 3D-Grafik darstellen. Die 2D-Figur zeigt dieselbe Ausrüstung.</p>'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new T.Scene(); scene.background = new T.Color(0x1d1712);
    var cam = new T.PerspectiveCamera(35, 1, 0.1, 50); cam.position.set(0, 1.5, 6.4); cam.lookAt(0, 1.1, 0);
    scene.add(new T.AmbientLight(0xffffff, 0.55));
    var d1 = new T.DirectionalLight(0xffe2c0, 0.95); d1.position.set(3, 5, 4); scene.add(d1);
    var d2 = new T.DirectionalLight(0x88aaff, 0.45); d2.position.set(-4, 3, -3); scene.add(d2);
    var pivot = new T.Group(); scene.add(pivot);
    var rcH = parseInt(RC[g.rar].slice(1), 16);
    pivot.add(new T.Mesh(new T.CylinderGeometry(1.25, 1.35, 0.1, 8), new T.MeshStandardMaterial({ color: 0x161a26, flatShading: true })));
    pivot.children[0].position.y = -0.05;
    var ring = new T.Mesh(new T.TorusGeometry(1.3, 0.035, 4, 8), new T.MeshStandardMaterial({ color: rcH, emissive: rcH, emissiveIntensity: 0.7 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; pivot.add(ring);
    var fig = build3D(T, g); pivot.add(fig);
    var sparks = [], n = RAR_KEYS.indexOf(g.rar) * 2;
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; var spk = new T.Mesh(new T.OctahedronGeometry(0.07), new T.MeshStandardMaterial({ color: rcH, emissive: rcH, emissiveIntensity: 0.8, flatShading: true })); spk.position.set(Math.cos(a) * 1.5, 0.7 + (i % 3) * 0.55, Math.sin(a) * 1.5); sparks.push(spk); pivot.add(spk); }
    var yaw = 0.5, pitch = 0.08, drag = false, lx = 0, ly = 0, alive = true;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    canvas.addEventListener('pointerdown', function (e) { drag = true; lx = e.clientX; ly = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} });
    canvas.addEventListener('pointermove', function (e) { if (!drag) return; yaw += (e.clientX - lx) * 0.01; pitch = clamp(pitch + (e.clientY - ly) * 0.005, -0.4, 0.5); lx = e.clientX; ly = e.clientY; });
    function up() { drag = false; }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    function size() { var w = canvas.clientWidth, h = canvas.clientHeight; if (w && h) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } }
    var t0 = performance.now();
    function loop(now) {
      if (!alive) return;
      if (!canvas.isConnected) { stop(); return; }
      size();
      var t = (now - t0) / 1000;
      if (!drag && !reduce) yaw += 0.008;
      pivot.rotation.y = yaw; pivot.rotation.x = pitch;
      if (!reduce) fig.position.y = 0.025 * Math.sin(t * 2);
      sparks.forEach(function (s, i) { s.rotation.y = t * 1.5 + i; });
      renderer.render(scene, cam);
      requestAnimationFrame(loop);
    }
    function stop() {
      alive = false;
      scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      renderer.dispose();
    }
    viewer3D = { stop: stop };
    requestAnimationFrame(loop);
  }).catch(function () {
    if (box.isConnected) box.innerHTML = '<p class="hint">Die 3D-Bibliothek konnte nicht geladen werden. Die 2D-Figur zeigt dieselbe Ausrüstung.</p>';
  });
}
