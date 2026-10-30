// v3.14.0 (Sicherheit vor der Beta): Grenzen beim Backup-Import, kein Prototype Pollution, Kanal-Konstanten,
// Backup-Status. Nur erfundene Testdaten.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const B = await import('../js/backup.js');
const C = await import('../js/channel.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const { lastBackupText } = await import('../js/privacy-info.js').catch(() => ({ lastBackupText: null }));
const { test, done } = runner();

console.log('# v3.14.0');
store.init();
lib.addFromPool('plank');
const base = () => JSON.parse(JSON.stringify(B.buildBackup()));

test('Hauptversion: Kanal main, Präfix wt_, Dateiname ohne beta', () => {
  assert.equal(C.CHANNEL, 'main');
  assert.equal(C.STORAGE_PREFIX, 'wt_');
  assert.equal(C.BETA_VERSION, null);
  assert.ok(localStorage.getItem('wt_exercises'), 'speichert unter wt_');
  assert.match(B.backupFilename(new Date(2026, 9, 31)), /^workout-tracker-backup-2026-10-31\.json$/);
});

test('Import: zu große Datei und zu lange Texte werden abgelehnt', () => {
  const big = 'x'.repeat(B.MAX_BACKUP_BYTES + 1);
  assert.equal(B.parseBackupText(big).ok, false);
  const b = base(); b.data.exercises[0].name = 'x'.repeat(B.MAX_TEXT_CHARS + 1);
  const r = B.parseBackupText(JSON.stringify(b));
  assert.equal(r.ok, false); assert.match(r.errors[0], /länger als/);
  const k = base(); k.data.settings['y'.repeat(B.MAX_TEXT_CHARS + 1)] = 1;
  assert.equal(B.parseBackupText(JSON.stringify(k)).ok, false, 'auch überlange Schlüssel');
  const ok = base(); ok.data.exercises[0].name = 'x'.repeat(80);
  assert.equal(B.parseBackupText(JSON.stringify(ok)).ok, true, 'normale Namen bleiben erlaubt');
});

test('Import: __proto__ in der Datei verändert keine Prototypen', () => {
  const t = JSON.stringify(base()).replace('"settings":{', '"settings":{"__proto__":{"polluted":true},')
    .replace('"exercises":[{', '"exercises":[{"__proto__":{"isAdmin":true},');
  const r = B.parseBackupText(t);
  if (r.ok) B.applyBackup(r);
  assert.equal(({}).polluted, undefined);
  assert.equal(({}).isAdmin, undefined);
  assert.equal(Object.getPrototypeOf(store.get('settings')), Object.prototype);
});

test('Import: HTML im Namen bleibt reiner Text (Darstellung über Textknoten)', () => {
  const b = base(); b.data.exercises[0].name = '<img src=x onerror=alert(1)>';
  const r = B.parseBackupText(JSON.stringify(b));
  assert.equal(r.ok, true);
  assert.equal(r.backup.data.exercises[0].name, '<img src=x onerror=alert(1)>');
});

test('Einstellungen: betaInfo und lastBackupAt mit Standard', () => {
  assert.equal(M.DEFAULT_SETTINGS.betaInfo, false);
  assert.equal(M.DEFAULT_SETTINGS.lastBackupAt, null);
});

test('Backup-Status: Datum oder „noch nie“, kaputte Werte ohne Fehler', () => {
  assert.equal(typeof lastBackupText, 'function');
  assert.equal(lastBackupText(null), 'noch nie');
  assert.equal(lastBackupText('kaputt'), 'noch nie');
  assert.match(lastBackupText('2026-10-31T10:00:00.000Z'), /^31\.10\.2026$/);
});

done();
