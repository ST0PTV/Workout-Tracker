// v3.12.0 (#309): Schalter „Grundübung ja/nein“ für eigene Übungen (optionales Feld `compound`, fehlt = Heuristik).
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const lib = await import('../js/exercises.js');
const { isCompound } = await import('../js/plan-analysis.js');
const { validateExercise, createExercise } = await import('../js/model.js');
const { test, done } = runner();

console.log('# v3.12.0');
store.init();
const own = (over) => ({ ...createExercise(), name: `Eigen ${Math.random()}`, muscles: { primary: ['chest'], secondary: [] }, ...over });

test('Ohne Angabe gilt die Heuristik (ab 3 beteiligten Muskeln), mit Angabe die Angabe', () => {
  const few = own({}), many = own({ muscles: { primary: ['chest'], secondary: ['triceps', 'front-delts'] } });
  assert.equal(isCompound(few), false);
  assert.equal(isCompound(many), true);
  assert.equal(isCompound({ ...few, compound: true }), true);
  assert.equal(isCompound({ ...many, compound: false }), false);
});

test('Pool-Übungen behalten ihre ausdrückliche Einordnung, auch wenn compound gesetzt ist', () => {
  const ex = own({ source: { origin: 'builtin', ref: 'leg-extension', verification: 'verified' }, compound: true });
  assert.equal(isCompound(ex), false);
});

test('Validierung: compound optional, nur boolean', () => {
  const base = own({});
  assert.deepEqual(validateExercise(base), []);
  for (const v of [true, false, undefined]) assert.deepEqual(validateExercise({ ...base, compound: v }), []);
  for (const v of ['ja', 1, null]) assert.ok(validateExercise({ ...base, compound: v }).some((e) => /Grundübung/.test(e)), String(v));
});

test('Speichern behält compound; alte Übungen ohne Feld bleiben gültig', () => {
  const r = lib.saveExercise(own({ compound: true }));
  assert.ok(r.ok, r.errors?.[0]);
  assert.equal(lib.getExercise(r.exercise.id).compound, true);
  const old = lib.saveExercise(own({}));
  assert.ok(old.ok);
  assert.equal('compound' in lib.getExercise(old.exercise.id), false);
});

done();
