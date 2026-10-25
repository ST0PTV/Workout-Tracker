// v3.0.0: Spalte „Zuletzt“ – Satz der letzten Ausführung an derselben Stelle.
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const { lastSetFor, placeholderFor } = await import('../js/model.js');
const { test, done } = runner();

console.log('# v3.0.0');

const set = (type, weightKg, reps) => ({ type, weightKg, reps });
const last = { sets: [set('warmup', 40, 10), set('work', 60, 8), set('work', 60, 8), set('work', 60, 7)] };

test('Arbeitssätze zählen getrennt von Aufwärmsätzen', () => {
  const entry = { sets: [set('warmup', null, null), set('work', null, null), set('work', null, null), set('work', null, null)] };
  assert.deepEqual(lastSetFor(entry, 0, last), { weightKg: 40, reps: 10 });
  assert.deepEqual(lastSetFor(entry, 1, last), { weightKg: 60, reps: 8 });
  assert.deepEqual(lastSetFor(entry, 3, last), { weightKg: 60, reps: 7 });
});

test('unabhängig vom laufenden Training (anders als der Platzhalter)', () => {
  const entry = { sets: [set('work', 62.5, 8), set('work', null, null)] };
  assert.deepEqual(lastSetFor(entry, 1, last), { weightKg: 60, reps: 8 });
  assert.deepEqual(placeholderFor(entry, 1, last), { weightKg: 62.5, reps: 8 });
});

test('mehr Sätze als beim letzten Mal, kein letztes Training, ungültiger Index → null', () => {
  const entry = { sets: [set('work', null, null), set('work', null, null), set('work', null, null), set('work', null, null)] };
  assert.equal(lastSetFor(entry, 3, last), null);
  assert.equal(lastSetFor(entry, 0, null), null);
  assert.equal(lastSetFor(entry, 9, last), null);
});

test('Satz ohne Wiederholungen im letzten Training zählt nicht als Wert', () => {
  const entry = { sets: [set('work', null, null)] };
  assert.equal(lastSetFor(entry, 0, { sets: [set('work', 60, null)] }), null);
});

done();
