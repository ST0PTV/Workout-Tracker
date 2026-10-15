// Speicher, Backup-Roundtrip, Validierung, Rollback und Migration v1 → v2.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();

const store = await import('../js/store.js');
const backup = await import('../js/backup.js');
const M = await import('../js/model.js');
const { uuid } = await import('../js/util.js');
const { test, done } = runner();

console.log('# store + backup');

test('init legt Schema-Version 2 an, Standardwerte', () => {
  const r = store.init();
  assert.ok(r.ok);
  assert.equal(localStorage.getItem('wt_schema'), '2');
  assert.deepEqual(store.get('exercises'), []);
  assert.deepEqual(store.get('groups'), []);
  assert.deepEqual(store.get('settings'), M.DEFAULT_SETTINGS);
});

test('alle Keys tragen das Präfix wt_', () => {
  store.set('exercises', [M.createExercise({ name: 'Testübung' })]);
  for (let i = 0; i < localStorage.length; i++) assert.ok(localStorage.key(i).startsWith('wt_'));
});

test('uuid ist ein gültiger UUID-String und eindeutig', () => {
  const a = uuid(), b = uuid();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(a, b);
});

test('unbekannte Keys werden abgelehnt', () => {
  assert.throws(() => store.get('nope'));
  assert.throws(() => store.set('nope', 1));
});

// Gültiger Beispieldatensatz mit Verweisen zwischen allen Sammlungen
function sampleData() {
  const g = M.createGroup({ name: 'Beine Grundübung' });
  const a = M.createExercise({ name: 'Beinpresse', muscles: { primary: ['quads', 'glutes'], secondary: [] }, groupIds: [g.id] });
  const b = M.createExercise({ name: 'Hack Squat', muscles: { primary: ['quads'], secondary: ['glutes'] }, groupIds: [g.id] });
  const p = M.createPlan({ name: 'Beine', items: [M.createPlanItem(a.id, { groupId: g.id })] });
  const s = M.createSession({
    planId: p.id,
    startedAt: '2026-01-01T10:00:00.000Z',
    entries: [M.createEntry(b.id, {
      plannedExerciseId: a.id,
      groupId: g.id,
      sets: [M.createSet({ weightKg: 100, reps: 10, completedAt: '2026-01-01T10:05:00.000Z' })]
    })]
  });
  return { exercises: [a, b], groups: [g], plans: [p], sessions: [s], routines: [], settings: { ...M.DEFAULT_SETTINGS, restSeconds: 90 } };
}

test('Backup-Roundtrip: Export → leeren → Import ergibt identische Daten', () => {
  const sample = sampleData();
  assert.ok(store.replaceAll(sample));
  const file = JSON.stringify(backup.buildBackup());
  localStorage.clear();
  assert.deepEqual(store.get('exercises'), []);
  const result = backup.parseBackupText(file);
  assert.ok(result.ok, result.errors.join('; '));
  assert.equal(result.summary.exercises, 2);
  assert.equal(result.summary.groups, 1);
  assert.ok(backup.applyBackup(result));
  assert.deepEqual(store.snapshot(), sample);
});

test('Backup enthält Metadaten und Schema-Version 2', () => {
  const b = backup.buildBackup();
  assert.equal(b.app, 'workout-tracker');
  assert.equal(b.schemaVersion, 2);
  assert.ok(!Number.isNaN(Date.parse(b.exportedAt)));
});

test('Validierung lehnt Fremddateien und kaputte Backups ab', () => {
  store.replaceAll(sampleData());
  const good = backup.buildBackup();
  assert.equal(backup.parseBackupText('kein json').ok, false);
  assert.equal(backup.validateBackup(null).ok, false);
  assert.equal(backup.validateBackup({ ...good, app: 'calorie-tracker' }).ok, false);
  assert.equal(backup.validateBackup({ ...good, schemaVersion: 3 }).ok, false);
  assert.equal(backup.validateBackup({ ...good, schemaVersion: 0 }).ok, false);
  assert.equal(backup.validateBackup({ ...good, data: { ...good.data, plans: 'x' } }).ok, false);
  assert.equal(backup.validateBackup({ ...good, data: { ...good.data, groups: undefined } }).ok, false);
  assert.equal(backup.validateBackup({ ...good, data: { ...good.data, exercises: [{ name: 'ohne id' }] } }).ok, false);
  const dup = good.data.exercises[0];
  assert.equal(backup.validateBackup({ ...good, data: { ...good.data, exercises: [dup, dup] } }).ok, false);
});

test('Validierung prüft Inhalte und Verweise (z. B. Training auf fehlende Übung)', () => {
  const good = backup.buildBackup();
  const broken = structuredClone(good);
  broken.data.exercises = broken.data.exercises.slice(1); // Beinpresse fehlt, wird aber in Plan/Training referenziert
  const r = backup.validateBackup(broken);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('existiert nicht')), r.errors.join('; '));
  const badSet = structuredClone(good);
  badSet.data.sessions[0].entries[0].sets[0].reps = 2.5;
  assert.equal(backup.validateBackup(badSet).ok, false);
});

test('fehlgeschlagener Import verändert bestehende Daten nicht (Rollback)', () => {
  store.replaceAll(sampleData());
  const before = store.snapshot();
  const incoming = backup.validateBackup({
    app: 'workout-tracker', schemaVersion: 2, exportedAt: new Date().toISOString(),
    data: { exercises: [], groups: [], plans: [], sessions: [], settings: {} }
  });
  assert.ok(incoming.ok, incoming.errors.join('; '));
  localStorage.failOnKey = 'wt_sessions';
  assert.equal(backup.applyBackup(incoming), false);
  localStorage.failOnKey = null;
  assert.deepEqual(store.snapshot(), before);
});

test('Dateiname enthält Datum', () => {
  assert.equal(backup.backupFilename(new Date(2026, 9, 13)), 'workout-tracker-backup-2026-10-13.json');
});

console.log('\n# Migration v1 → v2');

const v1Backup = {
  app: 'workout-tracker', schemaVersion: 1, exportedAt: '2026-10-13T08:00:00.000Z',
  data: { exercises: [], plans: [], sessions: [], settings: {} }
};

test('v1-Backup (v0.1.0) wird beim Import migriert', () => {
  const r = backup.validateBackup(v1Backup);
  assert.ok(r.ok, r.errors.join('; '));
  assert.equal(r.summary.fromSchema, 1);
  assert.equal(r.backup.schemaVersion, 2);
  assert.deepEqual(r.backup.data.groups, []);
  assert.deepEqual(r.backup.data.settings, M.DEFAULT_SETTINGS);
});

test('v1-Backup mit Altdaten: fehlende Felder werden aufgefüllt, ids bleiben', () => {
  const old = structuredClone(v1Backup);
  old.data.exercises = [{ id: 'ex-1', name: 'Bankdrücken', createdAt: '2026-10-13T08:00:00.000Z', updatedAt: '2026-10-13T08:00:00.000Z' }];
  old.data.settings = { restSeconds: 150 };
  const r = backup.validateBackup(old);
  assert.ok(r.ok, r.errors.join('; '));
  const ex = r.backup.data.exercises[0];
  assert.equal(ex.id, 'ex-1');
  assert.equal(ex.kind, 'strength');
  assert.deepEqual(ex.muscles, { primary: [], secondary: [] });
  assert.equal(r.backup.data.settings.restSeconds, 150);
  assert.equal(r.backup.data.settings.weightUnit, 'kg');
});

test('lokale v1-Daten werden beim App-Start migriert', () => {
  localStorage.clear();
  localStorage.setItem('wt_schema', '1');
  localStorage.setItem('wt_exercises', '[]');
  localStorage.setItem('wt_plans', '[]');
  localStorage.setItem('wt_sessions', '[]');
  localStorage.setItem('wt_settings', '{}');
  const r = store.init();
  assert.ok(r.ok);
  assert.equal(r.migratedFrom, 1);
  assert.equal(localStorage.getItem('wt_schema'), '2');
  assert.equal(localStorage.getItem('wt_groups'), '[]');
});

test('lokale Daten aus neuerer Version werden nicht angefasst', () => {
  localStorage.clear();
  localStorage.setItem('wt_schema', '99');
  localStorage.setItem('wt_exercises', '[{"id":"x"}]');
  const r = store.init();
  assert.equal(r.ok, false);
  assert.equal(localStorage.getItem('wt_schema'), '99');
  assert.equal(localStorage.getItem('wt_exercises'), '[{"id":"x"}]');
});

done();
