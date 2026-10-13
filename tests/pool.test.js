// Startpool: Vollständigkeit und Gültigkeit.
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const M = await import('../js/model.js');
const { POOL, EQUIPMENT, exerciseFromPool, poolRefsInLibrary } = await import('../js/pool.js');
const { test, done } = runner();

console.log('# pool');

test('Pool hat mindestens 30 Einträge mit eindeutigen refs und Namen', () => {
  assert.ok(POOL.length >= 30, `nur ${POOL.length}`);
  assert.equal(new Set(POOL.map((p) => p.ref)).size, POOL.length);
  assert.equal(new Set(POOL.map((p) => p.name.toLowerCase())).size, POOL.length);
});

test('jeder Eintrag: gültiger Typ, Gerät, mind. ein primärer Muskel, keine Doppelung primär/sekundär', () => {
  for (const p of POOL) {
    assert.ok(M.EXERCISE_KINDS.includes(p.kind), p.ref);
    assert.ok(p.equipment in EQUIPMENT, p.ref);
    assert.ok(p.muscles.primary.length >= 1, p.ref);
    const overlap = p.muscles.primary.filter((m) => p.muscles.secondary.includes(m));
    assert.deepEqual(overlap, [], p.ref);
    assert.equal(p.verification, 'training-knowledge', `${p.ref}: Status muss ehrlich sein, solange nicht geprüft`);
  }
});

test('jede aus dem Pool erzeugte Übung ist gültig und trägt die Quelle', () => {
  for (const p of POOL) {
    const e = exerciseFromPool(p);
    assert.deepEqual(M.validateExercise(e), [], p.ref);
    assert.equal(e.source.origin, 'builtin');
    assert.equal(e.source.ref, p.ref);
  }
});

test('Pool deckt alle Muskelgruppen der Taxonomie primär ab', () => {
  const covered = new Set(POOL.flatMap((p) => p.muscles.primary));
  const missing = Object.keys(M.MUSCLES).filter((m) => !covered.has(m));
  assert.deepEqual(missing, []);
});

test('Übernahme erzeugt neue Objekte (keine geteilten Arrays mit dem Pool)', () => {
  const e = exerciseFromPool(POOL[0]);
  e.muscles.primary.push('abs');
  assert.ok(!POOL[0].muscles.primary.includes('abs'));
});

test('poolRefsInLibrary erkennt übernommene Einträge', () => {
  const lib = [exerciseFromPool(POOL[0]), M.createExercise({ name: 'Eigene' })];
  assert.deepEqual([...poolRefsInLibrary(lib)], [POOL[0].ref]);
});

done();
