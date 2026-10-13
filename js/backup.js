// Backup-Export/-Import mit versioniertem Schema.
// Schema (Version 1):
// { app: "workout-tracker", schemaVersion: 1, exportedAt: ISO, data: { exercises[], plans[], sessions[], settings{} } }
import * as store from './store.js';
import { nowISO } from './util.js';

export const BACKUP_APP = 'workout-tracker';

export function buildBackup() {
  return {
    app: BACKUP_APP,
    schemaVersion: store.SCHEMA_VERSION,
    exportedAt: nowISO(),
    data: store.snapshot()
  };
}

export function backupFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `workout-tracker-backup-${stamp}.json`;
}

// Platz für spätere Schema-Migrationen: ältere Versionen schrittweise auf die aktuelle heben.
function migrate(backup) {
  return backup;
}

// Prüft eine geparste Datei. Gibt { ok, errors[], backup?, summary? } zurück. Ändert nichts.
export function validateBackup(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: ['Datei enthält kein gültiges Backup-Objekt.'] };
  }
  if (obj.app !== BACKUP_APP) errors.push('Kein Backup dieser App (Feld "app" passt nicht).');
  if (!Number.isInteger(obj.schemaVersion)) errors.push('Schema-Version fehlt oder ist ungültig.');
  else if (obj.schemaVersion > store.SCHEMA_VERSION) {
    errors.push(`Backup stammt aus einer neueren App-Version (Schema ${obj.schemaVersion}, hier ${store.SCHEMA_VERSION}).`);
  } else if (obj.schemaVersion < 1) errors.push('Schema-Version ungültig.');

  const data = obj.data;
  if (!data || typeof data !== 'object') errors.push('Feld "data" fehlt.');
  else {
    for (const key of store.COLLECTIONS) {
      if (!Array.isArray(data[key])) errors.push(`"${key}" fehlt oder ist keine Liste.`);
      else {
        const ids = new Set();
        for (const item of data[key]) {
          if (!item || typeof item.id !== 'string' || !item.id) {
            errors.push(`Eintrag ohne gültige id in "${key}".`);
            break;
          }
          if (ids.has(item.id)) {
            errors.push(`Doppelte id in "${key}".`);
            break;
          }
          ids.add(item.id);
        }
      }
    }
    if (data.settings !== undefined && (typeof data.settings !== 'object' || data.settings === null || Array.isArray(data.settings))) {
      errors.push('"settings" ist kein Objekt.');
    }
  }
  if (errors.length) return { ok: false, errors };

  const backup = migrate(obj);
  return {
    ok: true,
    errors: [],
    backup,
    summary: {
      exportedAt: backup.exportedAt || null,
      exercises: backup.data.exercises.length,
      plans: backup.data.plans.length,
      sessions: backup.data.sessions.length
    }
  };
}

export function parseBackupText(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Datei ist kein gültiges JSON.'] };
  }
  return validateBackup(obj);
}

// Spielt ein bereits validiertes Backup ein und ersetzt alle Daten.
export function applyBackup(validated) {
  if (!validated || !validated.ok) return false;
  const data = validated.backup.data;
  return store.replaceAll({
    exercises: data.exercises,
    plans: data.plans,
    sessions: data.sessions,
    settings: data.settings || {}
  });
}
