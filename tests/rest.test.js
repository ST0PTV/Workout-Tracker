// Pausenzeit: Formatierung, Schritte, Grenzen, Standard vs. eigener Wert, Validierung.
import assert from 'node:assert/strict';
import { runner } from './helpers.js';
const R = await import('../js/rest.js');
const M = await import('../js/model.js');
const { test, done } = runner();
console.log('# rest');

test('Formatierung m:ss', () => {
  assert.equal(R.formatDuration(90), '1:30');
  assert.equal(R.formatDuration(600), '10:00');
  assert.equal(R.formatDuration(5), '0:05');
  assert.equal(R.formatDuration(-3), '0:00');
});

test('Schritte à 15 s, begrenzt auf 15 s bis 10 min', () => {
  assert.equal(R.stepRest(120, 1), 135);
  assert.equal(R.stepRest(120, -1), 105);
  assert.equal(R.stepRest(15, -1), 15);
  assert.equal(R.stepRest(600, 1), 600);
  assert.equal(R.clampRest(100), 105, 'auf 15er-Raster gerundet');
});

test('Eigene Pausenzeit vor Standard', () => {
  const s = { restSeconds: 120 };
  assert.equal(R.effectiveRest(M.createExercise(), s), 120);
  assert.equal(R.effectiveRest(M.createExercise({ restSeconds: 180 }), s), 180);
  assert.equal(R.effectiveRest(null, s), 120);
});

test('Validierung: null/fehlend ok (Altdaten), ungültige Werte abgelehnt', () => {
  const ex = M.createExercise({ name: 'X', muscles: { primary: ['chest'], secondary: [] } });
  assert.deepEqual(M.validateExercise(ex), []);
  const old = { ...ex }; delete old.restSeconds;
  assert.deepEqual(M.validateExercise(old), [], 'Übungen aus v0.3 ohne Feld bleiben gültig');
  assert.ok(M.validateExercise({ ...ex, restSeconds: 0 }).length);
  assert.ok(M.validateExercise({ ...ex, restSeconds: 12.5 }).length);
  assert.deepEqual(M.validateExercise({ ...ex, restSeconds: 90 }), []);
});

done();
