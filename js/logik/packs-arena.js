/*
 * Blutsand · Spiellogik · Packs, Schwierigkeiten, Spenden und Story-Rivalen
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
/* ---------- Packs, Arena ---------- */
function pool5(o) { return [o, o, o, o, o]; }
var PACKS = [
  { id: 'holz', name: 'Holzkiste', price: 120, rank: 0, color: '#8a5a34', n: 1, sure: null,
    pool: pool5({ common: 70, rare: 25, epic: 4.5, legendary: 0.5 }),
    desc: 'Fünf Verträge aus der Kaserne. Du unterzeichnest einen.', odds: 'Pro Vertrag: Gewöhnlich 70 % · Selten 25 % · Episch 4,5 % · Legendär 0,5 %' },
  { id: 'bronze', name: 'Bronzetruhe', price: 350, rank: 1, color: '#b0753a', n: 2, sure: 'epic',
    pool: pool5({ rare: 70, epic: 26, legendary: 4 }),
    desc: 'Fünf Verträge, mindestens Selten. Ein Episch ist sicher dabei. Du unterzeichnest zwei.', odds: 'Pro Vertrag: Selten 70 % · Episch 26 % · Legendär 4 %' },
  { id: 'gold', name: 'Goldtruhe', price: 900, rank: 2, color: '#d4a63a', n: 3, sure: 'legendary',
    pool: pool5({ rare: 55, epic: 38, legendary: 7 }),
    desc: 'Fünf Verträge, mindestens Selten. Ein Legendär ist sicher dabei. Du unterzeichnest drei.', odds: 'Pro Vertrag: Selten 55 % · Episch 38 % · Legendär 7 %' },
  { id: 'ruhm', name: 'Ruhmestruhe', price: 2400, rank: 3, color: '#8a4fb0', n: 3, sure: 'legendary',
    pool: pool5({ rare: 20, epic: 55, legendary: 25 }),
    desc: 'Fünf Verträge mit den besten Chancen. Ein Legendär ist sicher dabei. Du unterzeichnest drei.', odds: 'Pro Vertrag: Selten 20 % · Episch 55 % · Legendär 25 %' }
];
var DIFFS = [
  { id: 0, name: 'Leicht', sub: 'Schaukampf, ohne Todesgefahr', mult: 0.8, pay: 0.6, ruhm: 1, lethal: false, rank: 0 },
  { id: 1, name: 'Normal', sub: 'Auf Leben und Tod', mult: 1.0, pay: 1.0, ruhm: 2, lethal: true, rank: 0 },
  { id: 2, name: 'Schwer', sub: 'Auf Leben und Tod', mult: 1.25, pay: 1.8, ruhm: 4, lethal: true, rank: 1 },
  { id: 3, name: 'Meisterklasse', sub: 'Auf Leben und Tod', mult: 1.5, pay: 2.8, ruhm: 7, lethal: true, rank: 3 }
];
var DONATIONS = [{ c: 50, p: 5 }, { c: 150, p: 12 }, { c: 400, p: 25 }];
var SCOUT_COST = 40;

var RIVALS = [
  { id: 'gaius', rank: 1, name: 'Gaius Steinbrecher', title: 'Lokalmatador der Provinz', type: 'Murmillo', eq: ['1H', 'SW', 'SCU', 'MR'], power: 82, lv: 1,
    pers: [['unerschrocken', 2], ['eitel', 1]], reward: 'rare',
    intro: 'Gaius hat in der Provinzarena noch nie verloren. Er hält dich für einen Emporkömmling.' },
  { id: 'livia', rank: 2, name: 'Livia die Viper', title: 'Schrecken der Stadtarena', type: 'Retiarius', eq: ['2H', 'LW', '–', 'LR'], power: 120, lv: 2,
    pers: [['kaltbluetig', 3], ['flink', 2], ['faul', 1]], reward: 'epic',
    intro: 'Livias Netz hat schon drei Champions zu Fall gebracht. Sie wartet, bis du müde wirst.' },
  { id: 'brutus', rank: 3, name: 'Brutus Aschenmann', title: 'Schlächter der Großen Arena', type: 'Secutor', eq: ['DW', 'SW', '–', 'SR'], power: 162, lv: 3,
    pers: [['jaehzornig', 3], ['zaeh', 2], ['rachsuechtig', 1]], reward: 'epic',
    intro: 'Brutus kämpft mit zwei Äxten in schwerer Rüstung. Gnade kennt er nicht.' },
  { id: 'magnus', rank: 4, name: 'Magnus Aurelius', title: 'Meister des Kolosseums', type: 'Thraex', eq: ['1H', 'LW', 'PAR', 'MR'], power: 215, lv: 4,
    pers: [['liebling', 3], ['kaltbluetig', 2], ['unerschrocken', 2], ['zaeh', 1]], reward: 'legendary',
    intro: 'Das Volk liebt Magnus. Wer ihn besiegt, ist der neue Herr des Kolosseums.' }
];
function rivalState(id) { if (!S.rivals[id]) S.rivals[id] = { beaten: 0, lost: 0, bonus: 0 }; return S.rivals[id]; }
function rivalFighter(id) {
  var R = RIVALS.filter(function (r) { return r.id === id; })[0], st = rivalState(id);
  var f = makeFoe(R.power + st.bonus, { name: R.name, type: R.type, eq: R.eq, fixed: true,
    pers: R.pers.map(function (p) { return { id: p[0], lv: p[1] }; }) });
  f.id = 'r_' + R.id; f.lv = { w: R.lv, a: R.lv, s: R.lv }; f.skin = 1; f.title = R.title; f.rival = R.id; f.scouted = true;
  f.fame = 30 + R.rank * 15;
  return f;
}
