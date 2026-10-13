// Übungs-Bibliothek: Anlegen, Speichern, Archivieren, Pool-Übernahme, Suche und Gruppierung.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const { POOL } = await import('../js/pool.js');
const { test, done } = runner();

console.log('# exercises');
store.init();

test('Pool-Übung übernehmen; zweites Mal wird abgelehnt', () => {
  const r = lib.addFromPool('bench-press-barbell');
  assert.ok(r.ok, r.errors.join('; '));
  assert.equal(r.exercise.source.ref, 'bench-press-barbell');
  assert.equal(r.exercise.source.verification, 'verified');
  const again = lib.addFromPool('bench-press-barbell');
  assert.equal(again.ok, false);
  assert.equal(lib.listExercises().length, 1);
});

test('eigene Übung braucht Namen und primären Muskel; doppelte Namen abgelehnt', () => {
  assert.equal(lib.saveExercise(M.createExercise({ name: '  ' })).ok, false);
  assert.equal(lib.saveExercise(M.createExercise({ name: 'High Row' })).ok, false, 'ohne Muskel');
  const r = lib.saveExercise(M.createExercise({ name: ' High Row ', muscles: { primary: ['upper-back'], secondary: [] }, note: 'Plate Loaded (Hammer)' }));
  assert.ok(r.ok, r.errors.join('; '));
  assert.equal(r.exercise.name, 'High Row', 'getrimmt');
  assert.equal(lib.saveExercise(M.createExercise({ name: 'high row', muscles: { primary: ['lats'], secondary: [] } })).ok, false);
});

test('Cardio-Übung ohne Muskeln ist erlaubt', () => {
  assert.ok(lib.saveExercise(M.createExercise({ name: 'Rudergerät', kind: 'cardio' })).ok);
});

test('Muskeln einer Pool-Übung ändern → Status "eigene Angabe"; zurück → wieder geprüft', () => {
  const ex = lib.listExercises().find((e) => e.source.ref === 'bench-press-barbell');
  const changed = lib.saveExercise({ ...ex, muscles: { primary: ['chest'], secondary: ['triceps'] } });
  assert.equal(changed.exercise.source.verification, 'user');
  const back = lib.saveExercise({ ...changed.exercise, muscles: { primary: ['chest'], secondary: ['front-delts', 'triceps'] } });
  assert.equal(back.exercise.source.verification, 'verified', 'Reihenfolge egal');
});

test('Archivieren blendet aus; Pool-Übernahme stellt archivierte wieder her statt Duplikat', () => {
  const ex = lib.listExercises().find((e) => e.source.ref === 'bench-press-barbell');
  assert.ok(lib.setArchived(ex.id, true).ok);
  assert.ok(!lib.listExercises().some((e) => e.id === ex.id));
  assert.ok(lib.listExercises({ includeArchived: true }).some((e) => e.id === ex.id));
  const r = lib.addFromPool('bench-press-barbell');
  assert.ok(r.ok && r.restored);
  assert.equal(lib.listExercises({ includeArchived: true }).filter((e) => e.source.ref === 'bench-press-barbell').length, 1);
});

test('Wiederherstellen scheitert, wenn eine aktive Übung gleichen Namens existiert', () => {
  const a = lib.saveExercise(M.createExercise({ name: 'Dips eng', muscles: { primary: ['triceps'], secondary: [] } })).exercise;
  lib.setArchived(a.id, true);
  lib.saveExercise(M.createExercise({ name: 'Dips eng', muscles: { primary: ['triceps'], secondary: [] } }));
  assert.equal(lib.setArchived(a.id, false).ok, false);
});

test('Suche ignoriert Groß-/Kleinschreibung, Umlaute und findet Notizen', () => {
  const ex = { name: 'Überkopf-Trizepsstrecken', note: '' };
  assert.ok(lib.matchesQuery(ex, 'uberkopf'));
  assert.ok(lib.matchesQuery(ex, 'TRIZEPS'));
  assert.ok(lib.matchesQuery({ name: 'High Row', note: 'Plate Loaded (Hammer)' }, 'hammer'));
  assert.ok(!lib.matchesQuery(ex, 'bizeps'));
});

test('Gruppierung nach Region des ersten primären Muskels, alphabetisch; Regionsfilter nach primären Muskeln', () => {
  const list = POOL.map((p) => ({ ...p, note: '' }));
  const sections = lib.groupedExercises(list);
  assert.deepEqual(sections.map((s) => s.key), ['chest', 'shoulders', 'back', 'arms', 'core', 'legs', 'cardio']);
  const legs = sections.find((s) => s.key === 'legs').items.map((e) => e.name);
  assert.deepEqual(legs, [...legs].sort((a, b) => a.localeCompare(b, 'de')));
  const filtered = lib.groupedExercises(list, { region: 'arms' });
  assert.ok(filtered.flatMap((s) => s.items).every((e) => lib.inRegion(e, 'arms')));
  assert.ok(filtered.some((s) => s.key === 'chest'), 'Dips (Brust + Trizeps) erscheinen auch beim Filter Arme, einsortiert unter Brust');
});

test('jeder Muskel gehört zu genau einer Region', () => {
  for (const m of Object.keys(M.MUSCLES)) {
    assert.equal(lib.REGIONS.filter((r) => r.muscles.includes(m)).length, 1, m);
  }
});

test('Muskelzusammenfassung', () => {
  assert.equal(lib.muscleSummary({ muscles: { primary: ['chest'], secondary: ['triceps', 'front-delts'] } }), 'Brust · Trizeps, Vordere Schulter');
  assert.equal(lib.muscleSummary({ muscles: { primary: ['quads'], secondary: [] } }), 'Quadrizeps');
});

done();
