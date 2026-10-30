// Backup-Export/-Import mit versioniertem Schema.
// Format: { app: "workout-tracker", schemaVersion, exportedAt: ISO,
//           data: { exercises[], groups[], plans[], sessions[], routines[], settings{} } }
// routines[] seit v2.3.0 (fehlt in älteren Backups → leere Liste).
// Ältere Schema-Versionen werden beim Import migriert (js/migrate.js).
import * as store from './store.js';
import { nowISO } from './util.js';
import { migrateData } from './migrate.js';
import { validateData } from './model.js';
import { normalizeCycle } from './cycle.js';
import { CHANNEL } from './channel.js';

export const BACKUP_APP = 'workout-tracker'; // gleich in Haupt- und Beta-Version: Backups lassen sich zwischen beiden übertragen

// v3.14.0 (Sicherheit): Grenzen für eingelesene Dateien. Echte Backups liegen weit darunter
// (Schätzung: ein Training ≈ 1–3 KB, 1000 Trainings ≈ 3 MB). Lange Texte deuten auf eine kaputte oder präparierte Datei.
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export const MAX_TEXT_CHARS = 5000;

// Längster Text irgendwo in den Daten (iterativ, ohne Rekursionstiefe).
function tooLongText(root) {
  const stack = [root];
  while (stack.length) {
    const v = stack.pop();
    if (typeof v === 'string') { if (v.length > MAX_TEXT_CHARS) return true; }
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (k.length > MAX_TEXT_CHARS) return true; stack.push(v[k]); }
  }
  return false;
}

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
  return `workout-tracker${CHANNEL === 'beta' ? '-beta' : ''}-backup-${stamp}.json`;
}

// Prüft eine geparste Datei: Kopf → Migration → Struktur → Inhalte und Verweise.
// Gibt { ok, errors[], backup?, summary? } zurück. Ändert nichts.
export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: ['Datei enthält kein gültiges Backup-Objekt.'] };
  }
  if (obj.app !== BACKUP_APP) return { ok: false, errors: ['Kein Backup dieser App (Feld "app" passt nicht).'] };
  if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return { ok: false, errors: ['Feld "data" fehlt.'] };

  if (tooLongText(obj.data)) return { ok: false, errors: [`Ein Text in der Datei ist länger als ${MAX_TEXT_CHARS} Zeichen – Datei beschädigt?`] };

  const errors = [];
  // Struktur vor der Migration: vorhandene Sammlungen müssen Listen mit eindeutigen ids sein.
  for (const key of store.COLLECTIONS) {
    const list = obj.data[key];
    if (list === undefined && key === 'groups' && obj.schemaVersion === 1) continue; // in v1 noch nicht vorhanden
    if (list === undefined && key === 'routines') continue; // vor v2.3.0 nicht vorhanden
    if (!Array.isArray(list)) { errors.push(`"${key}" fehlt oder ist keine Liste.`); continue; }
    const ids = new Set();
    for (const item of list) {
      if (!item || typeof item.id !== 'string' || !item.id) { errors.push(`Eintrag ohne gültige id in "${key}".`); break; }
      if (ids.has(item.id)) { errors.push(`Doppelte id in "${key}".`); break; }
      ids.add(item.id);
    }
  }
  const settings = obj.data.settings;
  if (settings !== undefined && (typeof settings !== 'object' || settings === null || Array.isArray(settings))) {
    errors.push('"settings" ist kein Objekt.');
  }
  const cycle = obj.data.cycle; // v2.24.0, optional
  if (cycle !== undefined && (typeof cycle !== 'object' || cycle === null || Array.isArray(cycle))) errors.push('"cycle" ist kein Objekt.');
  if (errors.length) return { ok: false, errors };

  const migrated = migrateData(obj.data, obj.schemaVersion);
  if (!migrated.ok) return { ok: false, errors: migrated.errors };
  migrated.data.routines = Array.isArray(obj.data.routines) ? migrated.data.routines || obj.data.routines : [];
  if (cycle !== undefined) migrated.data.cycle = normalizeCycle(cycle);

  const contentErrors = validateData(migrated.data);
  if (contentErrors.length) return { ok: false, errors: contentErrors };

  const data = migrated.data;
  return {
    ok: true,
    errors: [],
    backup: { ...obj, schemaVersion: store.SCHEMA_VERSION, data },
    summary: {
      exportedAt: obj.exportedAt || null,
      fromSchema: obj.schemaVersion,
      exercises: data.exercises.length,
      groups: data.groups.length,
      plans: data.plans.length,
      sessions: data.sessions.length,
      routines: data.routines.length
    }
  };
}

export function parseBackupText(text) {
  if (typeof text !== 'string' || text.length > MAX_BACKUP_BYTES) return { ok: false, errors: ['Datei ist zu groß für ein Backup (über 20 MB).'] };
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
  return store.replaceAll(validated.backup.data);
}
