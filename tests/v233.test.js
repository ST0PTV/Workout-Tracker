// v2.33.0: Muskeln eines Plans, Plan des Tages oben, Tiefenfeld des 3D-Körpers.
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const { planMuscles, isPlanDay, todayFirst } = await import('../js/plan-body.js');
const B = await import('../js/body3d.js');
const { test, done } = runner();

console.log('# v2.33.0');

const ex = {
  a: { id: 'a', kind: 'strength', muscles: { primary: ['chest'], secondary: ['triceps', 'front-delts'] } },
  b: { id: 'b', kind: 'strength', muscles: { primary: ['triceps'], secondary: [] } },
  c: { id: 'c', kind: 'cardio', muscles: { primary: [], secondary: [] }, involved: { primary: ['quads'], secondary: [] } },
  d: { id: 'd', kind: 'bodyweight', muscles: { primary: ['abs'], secondary: ['chest'] } }
};
const plan = (ids, days) => ({ id: 'p', name: 'P', items: ids.map((x, i) => ({ id: `i${i}`, exerciseId: x })), ...(days ? { days } : {}) });

test('planMuscles: Vereinigung, primär vor sekundär, ohne Doppelung', () => {
  const m = planMuscles(plan(['a', 'b', 'd']), ex);
  assert.deepEqual(m.primary.sort(), ['abs', 'chest', 'triceps']);
  assert.deepEqual(m.secondary, ['front-delts']);
});

test('planMuscles: Cardio, unbekannte Übungen und leerer Plan tragen nichts bei', () => {
  assert.deepEqual(planMuscles(plan(['c', 'x']), ex), { primary: [], secondary: [] });
  assert.deepEqual(planMuscles(null, ex), { primary: [], secondary: [] });
});

test('isPlanDay und todayFirst: Pläne des Tages oben, Rest in Reihenfolge', () => {
  const sun = new Date(2026, 9, 25, 12); // Sonntag = 6
  const p1 = { id: '1', days: [0] }; const p2 = { id: '2', days: [6, 2] }; const p3 = { id: '3' }; const p4 = { id: '4', days: [6] };
  assert.ok(isPlanDay(p2, sun) && !isPlanDay(p1, sun) && !isPlanDay(p3, sun));
  assert.deepEqual(todayFirst([p1, p2, p3, p4], sun).map((p) => p.id), ['2', '4', '1', '3']);
  assert.deepEqual(todayFirst([], sun), []);
});

// Synthetische Silhouette: Kopf, Rumpf mit getrennten Armen, zwei Beine (Figur-Einheiten 200 × 440)
const W = B.FIG_W; const H = B.FIG_H;
const mask = new Uint8Array(W * H);
const rect = (x0, x1, y0, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * W + x] = 1; };
rect(84, 116, 8, 56); rect(92, 108, 50, 62); rect(62, 138, 62, 140); rect(70, 130, 140, 258);
rect(40, 58, 90, 280); rect(142, 160, 90, 280); rect(72, 98, 258, 430); rect(102, 128, 258, 430);

test('depthField: innen positiv, außen negativ, höchstens D_MAX, links/rechts symmetrisch', () => {
  const D = B.depthField(mask);
  let bad = 0;
  for (let i = 0; i < D.length; i++) {
    if (mask[i] && !(D[i] > 0)) bad++;
    if (!mask[i] && D[i] > 0) bad++;
    assert.ok(D[i] <= B.D_MAX && D[i] >= -B.D_NEG);
  }
  assert.equal(bad, 0, `${bad} Pixel mit falschem Vorzeichen`);
  for (const [x, y] of [[50, 200], [85, 300], [80, 180], [70, 100]]) {
    assert.ok(Math.abs(D[y * W + x] - D[y * W + (W - 1 - x)]) < 0.05, `symmetrisch bei ${x},${y}`);
  }
});

test('depthField: Rumpf flacher als breit, Arme und Beine etwa rund, Mitte dicker als Rand', () => {
  const D = B.depthField(mask);
  const at = (x, y) => D[y * W + x];
  const torso = at(100, 200); // Rumpf 60 breit → halbe Dicke deutlich unter 30
  assert.ok(torso > 15 && torso < 30, `Rumpf ${torso}`);
  const arm = at(49, 220); // Arm 18 breit → halbe Dicke etwa 8
  assert.ok(arm > 5 && arm < 10, `Arm ${arm}`);
  assert.ok(at(100, 200) > at(75, 200), 'Rumpfmitte dicker als Rand');
  const leg = at(85, 350);
  assert.ok(leg > 8 && leg < 14, `Bein ${leg}`);
});

test('runsOf und gradientField: Läufe einer Zeile, Steigung begrenzt', () => {
  assert.deepEqual(B.runsOf(mask, W, 200), [[40, 57], [70, 129], [142, 159]]);
  const G = B.gradientField(B.depthField(mask));
  assert.equal(G.length, W * H * 2);
  assert.ok(G.every((g) => Math.abs(g) <= B.GRAD_MAX));
});

done();
