// v2.31.0: „Mein Equipment“ – Gerätezuordnung der Pool-Übungen und Filter.
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const { POOL, GEAR, EQUIPMENT, gearOf, ownedGear, fitsGear, poolEntry } = await import('../js/pool.js');
const M = await import('../js/model.js');
const { test, done } = runner();

console.log('# v2.31.0');

test('GEAR: Schlüssel eindeutig, kein Körpergewicht, alle Haupt-Geräte enthalten', () => {
  const keys = Object.keys(GEAR);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(!('bodyweight' in GEAR));
  for (const k of Object.keys(EQUIPMENT)) if (k !== 'bodyweight') assert.ok(k in GEAR, k);
});

test('gearOf: nur bekannte Schlüssel, eigenes Gerät dabei, Cardio am Gerät = cardio, draußen ohne (Rad = bike)', () => {
  for (const p of POOL) {
    const g = gearOf(p);
    assert.ok(g.every((k) => k in GEAR), p.ref);
    assert.equal(new Set(g).size, g.length, p.ref);
    // v3.8.0: Cardio draußen (equipment 'bodyweight') ohne Cardiogerät; Radfahren draußen braucht ein Fahrrad.
    if (p.kind === 'cardio') assert.deepEqual(g, p.equipment === 'bodyweight' ? (p.ref === 'outdoor-cycling' ? ['bike'] : []) : ['cardio'], p.ref);
    else if (p.equipment !== 'bodyweight') assert.ok(g.includes(p.equipment), p.ref);
  }
});

test('Körpergewicht ist weiter unterteilt', () => {
  const g = (ref) => gearOf(poolEntry(ref));
  assert.deepEqual(g('push-up'), []);
  assert.deepEqual(g('plank'), []);
  assert.deepEqual(g('pull-up'), ['pullbar']);
  assert.deepEqual(g('hanging-leg-raise'), ['pullbar']);
  assert.deepEqual(g('dips'), ['dipbars']);
  assert.deepEqual(g('bench-dips'), ['bench']);
  assert.deepEqual(g('clamshell-band'), ['band']);
  assert.deepEqual(g('ab-wheel-rollout'), ['wheel']);
  assert.deepEqual(g('bench-press-barbell').sort(), ['barbell', 'bench']);
  assert.deepEqual(g('dumbbell-curl'), ['dumbbell']);
  const bw = POOL.filter((p) => p.equipment === 'bodyweight');
  assert.ok(bw.some((p) => gearOf(p).length === 0) && bw.some((p) => gearOf(p).length > 0));
});

test('ownedGear: null, leer, ungültig und Reihenfolge', () => {
  assert.equal(ownedGear({}), null);
  assert.equal(ownedGear({ equipment: null }), null);
  assert.equal(ownedGear({ equipment: [] }), null);
  assert.equal(ownedGear({ equipment: ['unsinn'] }), null);
  assert.equal(ownedGear({ equipment: 'barbell' }), null);
  assert.deepEqual(ownedGear({ equipment: ['band', 'barbell', 'x'] }), ['barbell', 'band']);
});

test('fitsGear: ohne Auswahl passt alles, mit Auswahl nur vollständig Abgedecktes', () => {
  assert.ok(POOL.every((p) => fitsGear(p, null)));
  const none = ['dumbbell'];
  const fit = POOL.filter((p) => fitsGear(p, none)).map((p) => p.ref);
  assert.ok(fit.includes('push-up') && fit.includes('plank') && fit.includes('dumbbell-curl'));
  assert.ok(!fit.includes('pull-up') && !fit.includes('dumbbell-bench-press') && !fit.includes('lat-pulldown'));
  assert.ok(fitsGear(poolEntry('dumbbell-bench-press'), ['dumbbell', 'bench']));
  assert.ok(!fitsGear(poolEntry('dips'), ['dumbbell', 'bench']));
  // alle Geräte gewählt = alles passt
  assert.ok(POOL.every((p) => fitsGear(p, Object.keys(GEAR))));
});

test('Standard-Einstellung: equipment null, Backup-Altdaten ohne Feld bleiben gültig', () => {
  assert.equal(M.DEFAULT_SETTINGS.equipment, null);
  assert.equal(ownedGear({ ...M.DEFAULT_SETTINGS, restSeconds: 90 }), null);
});

done();
