// v2.2.0: Übungen über die Muskelkarte wählen (Vorschlagsliste und „zum Training hinzufügen“).
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const S = await import('../js/session.js');
const MP = await import('../js/muscle-pick.js');
const { POOL } = await import('../js/pool.js');
const { test, done } = runner();

console.log('# v2.2.0 (Muskelkarte → Übung)');
store.init();
const own = lib.saveExercise(M.createExercise({ name: 'Eigene Seitheber', kind: 'strength', muscles: { primary: ['side-delts'], secondary: [] } })).exercise;
const arch = lib.saveExercise(M.createExercise({ name: 'Archivierte Übung', kind: 'strength', muscles: { primary: ['side-delts'], secondary: [] } })).exercise;
lib.setArchived(arch.id, true);

test('eigene Übungen zuerst, archivierte und sekundäre fehlen', () => {
  const c = MP.candidatesFor('side-delts', store.get('exercises'));
  assert.deepEqual(c.own.map((e) => e.id), [own.id]);
  const sec = lib.saveExercise(M.createExercise({ name: 'Nur sekundär', kind: 'strength', muscles: { primary: ['chest'], secondary: ['side-delts'] } })).exercise;
  assert.ok(!MP.candidatesFor('side-delts', store.get('exercises')).own.some((e) => e.id === sec.id));
});
test('Pool-Vorschläge: nur primär, nicht schon in der Bibliothek, sichere Zuordnung zuerst, kein Cardio', () => {
  const c = MP.candidatesFor('quads', store.get('exercises'));
  assert.ok(c.pool.length > 3);
  assert.ok(c.pool.every((p) => p.muscles.primary.includes('quads') && p.kind !== 'cardio'));
  const rank = { high: 0, medium: 1, low: 2 };
  for (let i = 1; i < c.pool.length; i++) assert.ok(rank[c.pool[i - 1].confidence] <= rank[c.pool[i].confidence]);
  lib.addFromPool(c.pool[0].ref);
  assert.ok(!MP.candidatesFor('quads', store.get('exercises')).pool.some((p) => p.ref === c.pool[0].ref));
});
test('jeder Muskel hat mindestens einen Vorschlag (eigene oder Pool)', () => {
  for (const m of Object.keys(M.MUSCLES)) {
    const c = MP.candidatesFor(m, []);
    assert.ok(c.pool.length > 0, m);
  }
});
test('Stufe: unter 5 Sätze zählt als niedrig', () => {
  assert.equal(MP.isLowLevel(0), true);
  assert.equal(MP.isLowLevel(4.5), true);
  assert.equal(MP.isLowLevel(5), false);
});
test('ohne laufendes Training startet ein freies; mit laufendem wird angehängt', () => {
  assert.equal(S.activeSession(), null);
  const r = MP.addToTraining({ exerciseId: own.id });
  assert.ok(r.ok && r.started);
  assert.equal(S.activeSession().entries.length, 1);
  const ref = MP.candidatesFor('quads', store.get('exercises')).pool[0].ref;
  const r2 = MP.addToTraining({ poolRef: ref });
  assert.ok(r2.ok && !r2.started);
  const s = S.activeSession();
  assert.equal(s.entries.length, 2);
  assert.equal(store.get('exercises').find((e) => e.id === s.entries[1].exerciseId).source.ref, ref);
});
test('Fehlerfälle: nichts gewählt, unbekannte Pool-Übung', () => {
  assert.equal(MP.addToTraining({}).ok, false);
  assert.equal(MP.addToTraining({ poolRef: 'gibt-es-nicht' }).ok, false);
});
done();
