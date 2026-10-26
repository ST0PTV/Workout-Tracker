// v3.6.0: Animationen für die Mobilitäts-Übungen (Türrahmen-Push-up, Stuhl-Kniebeuge, Balanceboard-Wadenheben, Hüftkreisen).
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const D = await import('../js/anim-data.js');
const RD = await import('../js/routine-data.js');
const M = await import('../js/motion.js');
const { test, done } = runner();
const NEW = ['door-frame-push-up', 'chair-squat', 'balance-board-calf-raise', 'hip-circles'];

console.log('# v3.6.0');

test('vier neue Animationen vorhanden, ehrlich als Übertragung oder Konvention gekennzeichnet (nicht „gemessen“)', () => {
  for (const ref of NEW) {
    const a = D.animationFor(ref);
    assert.ok(a, `${ref} fehlt`);
    assert.ok(['transfer', 'convention'].includes(a.basis), `${ref}: Basis ${a.basis}`);
    assert.ok(a.basisNote.length > 80, `${ref}: Datenbasis erklärt`);
    assert.ok(a.keyPoints.length >= 3 && a.phases.length >= 2, `${ref}: Kernpunkte und Phasen`);
    assert.equal(D.framesOf(a).length, 2, `${ref}: zwei Keyframes`);
  }
});

test('Quellen-IDs der Kernpunkte und Werte sind definiert; Quellen haben Lesart und Link', () => {
  for (const ref of NEW) {
    const a = D.animationFor(ref);
    for (const kp of a.keyPoints) for (const id of kp.src) assert.ok(a.sources[id], `${ref}: Quelle ${id} fehlt`);
    for (const s of Object.values(a.sources)) { assert.ok(s.url.startsWith('https://') && s.read, `${ref}: Quelle unvollständig`); }
    for (const f of D.framesOf(a)) for (const v of Object.values(f.pose)) if (v && v.src) for (const id of v.src) assert.ok(a.sources[id], `${ref}: Wert-Quelle ${id}`);
  }
});

test('alle Phasen verweisen auf vorhandene Kernpunkte und Keyframes', () => {
  for (const ref of NEW) {
    const a = D.animationFor(ref), n = D.framesOf(a).length;
    for (const ph of a.phases) { assert.ok(ph.a < n && ph.b < n); for (const k of ph.kp) assert.ok(a.keyPoints[k], `${ref}: kp ${k}`); }
  }
});

test('Figur lässt sich in allen Keyframes lösen (Gelenke endlich), Füße fest in den Stand-Übungen', () => {
  for (const ref of ['door-frame-push-up', 'chair-squat', 'balance-board-calf-raise']) {
    for (const f of M.resolveFrames(D.framesOf(D.animationFor(ref)))) {
      const P = M.solvePose(f.pose);
      for (const j of Object.values(P.joints)) assert.ok(j.every(Number.isFinite), `${ref}: NaN`);
    }
  }
  const toes = M.resolveFrames(D.framesOf(D.animationFor('door-frame-push-up'))).map((f) => M.solvePose(f.pose).joints.toe[1]);
  assert.ok(toes.every((y) => Math.abs(y) < 1.5), 'Türrahmen: Zehen am Boden');
});

test('Routine-Katalog verknüpft die vier Übungen mit ihren Animationen', () => {
  assert.deepEqual(Object.values(RD.ANIM_REF).sort(), [...NEW].sort());
  for (const [item, ref] of Object.entries(RD.ANIM_REF)) { assert.ok(RD.ITEM_BY_REF[item], `${item} fehlt im Katalog`); assert.ok(D.animationFor(ref)); }
});

done();
