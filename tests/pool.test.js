// Startpool: Vollständigkeit und Gültigkeit.
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const M = await import('../js/model.js');
const { POOL, EQUIPMENT, CONFIDENCE, exerciseFromPool, poolRefsInLibrary, poolEntry } = await import('../js/pool.js');
const { MUSCLE_INFO } = await import('../js/muscle-info.js');
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
    assert.equal(p.verification, 'verified', p.ref);
    assert.ok(p.confidence in CONFIDENCE, p.ref);
    assert.ok(typeof p.basis === 'string' && p.basis.length > 0, p.ref);
    assert.ok(Array.isArray(p.others), p.ref);
  }
});

test('jeder Eintrag hat mindestens eine Quelle mit https-Link und Notiz', () => {
  for (const p of POOL) {
    assert.ok(p.sources.length >= 1, p.ref);
    for (const s of p.sources) {
      assert.match(s.url, /^https:\/\//, `${p.ref}: ${s.label}`);
      assert.ok(s.label && s.note, `${p.ref}: Quelle unvollständig`);
    }
  }
});

test('Muskelgruppen-Infos: jede Gruppe der Taxonomie hat Text und Quelle', () => {
  for (const key of Object.keys(M.MUSCLES)) {
    const info = MUSCLE_INFO[key];
    assert.ok(info, `Info fehlt: ${key}`);
    assert.ok(info.includes && info.location && info.functions.length >= 1, key);
    assert.ok(info.sources.length >= 1 && info.sources.every((s) => /^https:\/\//.test(s.url)), key);
  }
  assert.deepEqual(Object.keys(MUSCLE_INFO).filter((k) => !(k in M.MUSCLES)), []);
});

test('poolEntry findet Einträge per ref', () => {
  assert.equal(poolEntry('deadlift').name, 'Kreuzheben');
  assert.equal(poolEntry('gibt-es-nicht'), null);
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
  const archived = exerciseFromPool(POOL[1], { archived: true });
  const lib = [exerciseFromPool(POOL[0]), M.createExercise({ name: 'Eigene' }), archived];
  assert.deepEqual([...poolRefsInLibrary(lib)], [POOL[0].ref], 'archivierte zählen nicht');
});

test('v1.5 Runde 1: Schultern, Waden, Hüfte, unterer Rücken mit mindestens 4 Übungen (primär); Quellen-Notizen kurz', () => {
  const count = {};
  for (const p of POOL) for (const m of p.muscles.primary) count[m] = (count[m] || 0) + 1;
  for (const m of ['front-delts', 'side-delts', 'rear-delts', 'calves', 'adductors', 'abductors', 'lower-back']) assert.ok(count[m] >= 4, `${m}: ${count[m]}`);
  assert.ok(POOL.length >= 70);
  for (const p of POOL) {
    assert.ok(p.note.length <= 140, `${p.ref}: Notiz zu lang`);
    for (const s of p.sources) assert.ok(s.note.length <= 170, `${p.ref}: Quellen-Notiz zu lang`);
  }
});

done();
