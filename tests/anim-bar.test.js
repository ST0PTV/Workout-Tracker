// v2.7.0: Phasenleiste der Animationen – Segmente und Beschriftungsplan (ohne DOM).
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const B = await import('../js/anim-bar.js');
const D = await import('../js/anim-data.js');
const { test, done } = runner();
console.log('# Phasenleiste (v2.7.0)');

test('Segmente: gleich benannte Nachbarphasen werden zusammengefasst, Zeiten lückenlos', () => {
  const dl = D.animationFor('deadlift');
  const { T, segs } = B.segmentsOf(dl.phases);
  assert.equal(dl.phases.length, 6);
  assert.equal(segs.length, 5, 'Absenken + Absenken = ein Segment');
  assert.equal(segs[0].start, 0);
  for (let i = 1; i < segs.length; i++) assert.equal(segs[i].start, segs[i - 1].end);
  assert.ok(Math.abs(segs.at(-1).end - T) < 1e-9);
  assert.ok(Math.abs(segs.reduce((s, x) => s + x.share, 0) - 1) < 1e-9);
});

test('Jede Animation: immer ein Label für die aktuelle Phase, keine Überlappung, nie leer', () => {
  for (const a of D.ANIMATIONS) {
    const { segs } = B.segmentsOf(a.phases);
    for (let act = 0; act < segs.length; act++) {
      const plan = B.labelPlan(segs, act);
      assert.ok(plan.some((l) => l.i === act), `${a.ref}: aktive Phase ${act} ohne Label`);
      const px = plan.map((l) => ({ c: (l.left / 100) * B.BAR_W, w: l.label.length * B.CHAR_W + 8 }));
      for (let i = 1; i < px.length; i++) assert.ok(px[i].c - px[i - 1].c >= (px[i].w + px[i - 1].w) / 2, `${a.ref}: Labels überlappen`);
      for (const p of px) assert.ok(p.c - p.w / 2 >= -0.01 && p.c + p.w / 2 <= B.BAR_W + 0.01, `${a.ref}: Label außerhalb der Leiste`);
    }
  }
});

test('Ab 6 Segmenten steht nur der Name der aktuellen Phase', () => {
  const lunge = D.animationFor('dumbbell-forward-lunge');
  const { segs } = B.segmentsOf(lunge.phases);
  assert.ok(segs.length >= 6);
  for (let act = 0; act < segs.length; act++) assert.equal(B.labelPlan(segs, act).length, 1);
});

test('Bis 5 Segmente: Kniebeuge zeigt alle vier Namen; kurze Haltephase ohne Text, solange sie nicht aktiv ist', () => {
  const sq = B.segmentsOf(D.animationFor('back-squat').phases).segs;
  assert.deepEqual(B.labelPlan(sq, 1).map((l) => l.label), ['Oben', 'Absenken', 'Unten', 'Aufstehen']);
  const lc = B.segmentsOf(D.animationFor('lying-leg-curl').phases).segs; // „Gebeugt“ nur ~2 % der Zeit
  const hold = lc.findIndex((s) => s.label === 'Gebeugt');
  assert.ok(!B.labelPlan(lc, 0).some((l) => l.i === hold));
  assert.ok(B.labelPlan(lc, hold).some((l) => l.i === hold), 'aktiv: Name erscheint');
});

test('Sprungziel und Segment-Suche', () => {
  const { T, segs } = B.segmentsOf(D.animationFor('back-squat').phases);
  assert.equal(B.segmentIndexAt(segs, 0.1, T), 0);
  assert.equal(B.segmentIndexAt(segs, T + 0.1, T), 0, 'Zeit läuft zyklisch');
  const i = segs.findIndex((s) => s.label === 'Unten');
  assert.equal(B.segmentIndexAt(segs, B.jumpTime(segs[i]), T), i);
  for (let k = 0; k < segs.length; k++) assert.equal(B.segmentIndexAt(segs, B.jumpTime(segs[k]), T), k);
});

done();
