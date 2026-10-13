// Node-Tests ohne Abhängigkeiten: Speicher, Backup-Roundtrip, Validierung, Rollback.
import assert from 'node:assert/strict';

// Minimaler localStorage-Ersatz (mit optionalem Schreibfehler für den Rollback-Test)
class MemoryStorage {
  constructor() { this.map = new Map(); this.failOnKey = null; }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) {
    if (this.failOnKey && k === this.failOnKey) throw new Error('QuotaExceededError');
    this.map.set(k, String(v));
  }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
globalThis.localStorage = new MemoryStorage();

const store = await import('../js/store.js');
const backup = await import('../js/backup.js');
const { uuid } = await import('../js/util.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { console.error(`FAIL ${name}\n     ${e.message}`); process.exitCode = 1; }
}

test('init legt Schema-Version an, Standardwerte sind leer', () => {
  store.init();
  assert.equal(localStorage.getItem('wt_schema'), String(store.SCHEMA_VERSION));
  assert.deepEqual(store.get('exercises'), []);
  assert.deepEqual(store.get('settings'), {});
});

test('alle Keys tragen das Präfix wt_', () => {
  store.set('exercises', [{ id: uuid(), name: 'Testübung' }]);
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

const sample = {
  exercises: [{ id: uuid(), name: 'Übung A' }, { id: uuid(), name: 'Übung B' }],
  plans: [{ id: uuid(), name: 'Plan 1' }],
  sessions: [{ id: uuid(), date: '2026-01-01T10:00:00.000Z' }],
  settings: { focus: 'strength' }
};

test('Backup-Roundtrip: Export → leeren → Import ergibt identische Daten', () => {
  assert.ok(store.replaceAll(sample));
  const file = JSON.stringify(backup.buildBackup());
  localStorage.clear();
  assert.deepEqual(store.get('exercises'), []);
  const result = backup.parseBackupText(file);
  assert.ok(result.ok, result.errors.join('; '));
  assert.equal(result.summary.exercises, 2);
  assert.ok(backup.applyBackup(result));
  assert.deepEqual(store.snapshot(), sample);
});

test('Backup enthält Metadaten und Schema-Version', () => {
  const b = backup.buildBackup();
  assert.equal(b.app, 'workout-tracker');
  assert.equal(b.schemaVersion, store.SCHEMA_VERSION);
  assert.ok(!Number.isNaN(Date.parse(b.exportedAt)));
});

test('Validierung lehnt Fremddateien und kaputte Backups ab', () => {
  assert.equal(backup.parseBackupText('kein json').ok, false);
  assert.equal(backup.validateBackup(null).ok, false);
  assert.equal(backup.validateBackup({ app: 'calorie-tracker', schemaVersion: 1, data: {} }).ok, false);
  const good = backup.buildBackup();
  assert.equal(backup.validateBackup({ ...good, schemaVersion: store.SCHEMA_VERSION + 1 }).ok, false);
  assert.equal(backup.validateBackup({ ...good, data: { ...good.data, plans: 'x' } }).ok, false);
  assert.equal(backup.validateBackup({ ...good, data: { ...good.data, exercises: [{ name: 'ohne id' }] } }).ok, false);
  const dup = { id: 'same' };
  assert.equal(backup.validateBackup({ ...good, data: { ...good.data, exercises: [dup, dup] } }).ok, false);
});

test('fehlgeschlagener Import verändert bestehende Daten nicht (Rollback)', () => {
  store.replaceAll(sample);
  const before = store.snapshot();
  const incoming = backup.validateBackup({
    app: 'workout-tracker', schemaVersion: 1, exportedAt: new Date().toISOString(),
    data: { exercises: [{ id: 'x1' }], plans: [], sessions: [], settings: {} }
  });
  assert.ok(incoming.ok);
  localStorage.failOnKey = 'wt_sessions';
  assert.equal(backup.applyBackup(incoming), false);
  localStorage.failOnKey = null;
  assert.deepEqual(store.snapshot(), before);
});

test('Dateiname enthält Datum', () => {
  assert.equal(backup.backupFilename(new Date(2026, 9, 13)), 'workout-tracker-backup-2026-10-13.json');
});

console.log(`\n${passed} Tests bestanden.`);
