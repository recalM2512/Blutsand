/*
 * Blutsand · Spiellogik · Packs, Schwierigkeiten, Spenden und Story-Rivalen
 * Reine Logik ohne Oberfläche. Wird in index.html in fester Reihenfolge geladen.
 */
/* ---------- Packs, Arena ---------- */
var PACKS = [
  { id: 'holz', name: 'Holzkiste', price: 120, rank: 0, color: '#9a6a3a', desc: 'Ein Kämpfer aus der Kaserne.',
    slots: [{ common: 70, rare: 25, epic: 4.5, legendary: 0.5 }], odds: 'Gewöhnlich 70 % · Selten 25 % · Episch 4,5 % · Legendär 0,5 %' },
  { id: 'bronze', name: 'Bronzetruhe', price: 350, rank: 1, color: '#c07f3a', desc: 'Zwei Kämpfer, mindestens Selten.',
    slots: [{ rare: 70, epic: 26, legendary: 4 }, { rare: 70, epic: 26, legendary: 4 }], odds: 'Pro Kämpfer: Selten 70 % · Episch 26 % · Legendär 4 %' },
  { id: 'gold', name: 'Goldtruhe', price: 900, rank: 2, color: '#efbf4f', desc: 'Drei Kämpfer, einer garantiert Episch oder besser.',
    slots: [{ rare: 55, epic: 38, legendary: 7 }, { rare: 55, epic: 38, legendary: 7 }, { epic: 80, legendary: 20 }], odds: 'Kämpfer 1 und 2: Selten 55 % · Episch 38 % · Legendär 7 %. Kämpfer 3: Episch 80 % · Legendär 20 %' },
  { id: 'ruhm', name: 'Ruhmestruhe', price: 2400, rank: 3, color: '#b06be0', desc: 'Drei Kämpfer mit den besten Chancen auf Legendäre.',
    slots: [{ rare: 30, epic: 55, legendary: 15 }, { epic: 75, legendary: 25 }, { epic: 60, legendary: 40 }], odds: 'Kämpfer 1: Selten 30 % · Episch 55 % · Legendär 15 %. Kämpfer 2: Episch 75 % · Legendär 25 %. Kämpfer 3: Episch 60 % · Legendär 40 %' }
];
var DIFFS = [
  { id: 0, name: 'Leicht', sub: 'Schaukampf, ohne Todesgefahr', mult: 0.85, pay: 0.6, ruhm: 1, lethal: false, rank: 0 },
  { id: 1, name: 'Normal', sub: 'Auf Leben und Tod', mult: 0.95, pay: 1.0, ruhm: 2, lethal: true, rank: 0 },
  { id: 2, name: 'Schwer', sub: 'Auf Leben und Tod', mult: 1.2, pay: 1.8, ruhm: 4, lethal: true, rank: 1 },
  { id: 3, name: 'Meisterklasse', sub: 'Auf Leben und Tod', mult: 1.4, pay: 2.8, ruhm: 7, lethal: true, rank: 3 }
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
