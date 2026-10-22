// Speicherschicht: einzige Stelle, die localStorage anfasst.
// Alle Keys tragen das Präfix "wt_", damit sie nicht mit anderen Apps unter derselben Origin kollidieren.
import { clone } from './util.js';
import { SCHEMA_VERSION, DEFAULT_SETTINGS } from './model.js';
import { migrateData } from './migrate.js';
import { DEFAULT_CYCLE } from './cycle.js';

export { SCHEMA_VERSION };
const PREFIX = 'wt_';

const DEFAULTS = {
  exercises: [],
  groups: [],
  plans: [],
  sessions: [],
  routines: [], // v2.3.0: eigene Aufwärm-/Cool-down-Routinen (Vorlagen stehen im Code)
  settings: DEFAULT_SETTINGS,
  cycle: DEFAULT_CYCLE // v2.24.0: optionale Zyklusdaten (nur lokal, im Backup enthalten)
};
export const COLLECTIONS = ['exercises', 'groups', 'plans', 'sessions', 'routines'];
export const KEYS = Object.keys(DEFAULTS);

function storage() {
  return globalThis.localStorage;
}

// v2.7.1: Ein Wert mit falscher Form (z. B. null statt Liste) oder kaputtes JSON gilt als beschädigt: Es gilt der
// Standardwert, und der Rohtext wird einmalig unter wt_broken_<key> aufgehoben, damit nichts still verloren geht.
const shapeOk = (value, fallback) => {
  if (Array.isArray(fallback)) return Array.isArray(value);
  if (fallback && typeof fallback === 'object') return !!value && typeof value === 'object' && !Array.isArray(value);
  return true;
};

function keepBroken(key, raw) {
  try {
    if (storage().getItem(PREFIX + 'broken_' + key) === null) storage().setItem(PREFIX + 'broken_' + key, raw);
  } catch { /* Speicher voll: egal */ }
}

function read(key, fallback) {
  let raw = null;
  try {
    raw = storage().getItem(PREFIX + key);
    if (raw === null) return clone(fallback);
    const value = JSON.parse(raw);
    if (shapeOk(value, fallback)) return value;
  } catch { /* kaputtes JSON: unten behandelt */ }
  if (raw !== null) keepBroken(key, raw);
  return clone(fallback);
}

// v2.26.0 (A3): Jeder Schreibversuch meldet sein Ergebnis an die Beobachter (Banner „Nicht gespeichert“).
const writeListeners = new Set();
export function onWriteResult(fn) {
  writeListeners.add(fn);
  return () => writeListeners.delete(fn);
}
function notifyWrite(ok, key) {
  for (const fn of writeListeners) { try { fn(ok, key); } catch { /* Beobachter darf das Speichern nicht stören */ } }
}

function write(key, value) {
  let ok = true;
  try {
    storage().setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    ok = false; // z. B. Speicher voll oder privater Modus
  }
  notifyWrite(ok, key);
  return ok;
}

// Gespeicherte Schema-Version; ohne Eintrag = neue Installation.
export function storedSchema() {
  return read('schema', null);
}

// Beim App-Start: neue Installation anlegen oder ältere lokale Daten migrieren.
// Gibt { ok, migratedFrom, errors } zurück. Bei Fehlern bleiben die Daten unverändert.
export function init() {
  const stored = storedSchema();
  if (stored === null) {
    write('schema', SCHEMA_VERSION);
    return { ok: true, migratedFrom: null, errors: [] };
  }
  if (stored === SCHEMA_VERSION) return { ok: true, migratedFrom: null, errors: [] };
  const raw = {};
  for (const key of KEYS) raw[key] = read(key, DEFAULTS[key]);
  const result = migrateData(raw, stored);
  if (!result.ok) return { ok: false, migratedFrom: stored, errors: result.errors };
  if (!replaceAll(result.data)) return { ok: false, migratedFrom: stored, errors: ['Speichern nach Migration fehlgeschlagen.'] };
  return { ok: true, migratedFrom: stored, errors: [] };
}

export function get(key) {
  if (!(key in DEFAULTS)) throw new Error(`Unbekannter Speicher-Key: ${key}`);
  const value = read(key, DEFAULTS[key]);
  return key === 'settings' ? { ...clone(DEFAULT_SETTINGS), ...value } : value;
}

export function set(key, value) {
  if (!(key in DEFAULTS)) throw new Error(`Unbekannter Speicher-Key: ${key}`);
  return write(key, value);
}

export function snapshot() {
  const out = {};
  for (const key of KEYS) out[key] = get(key);
  return out;
}

// Ersetzt alle Daten. Bei einem Schreibfehler wird der vorherige Stand wiederhergestellt.
export function replaceAll(data) {
  const before = {};
  for (const key of KEYS) before[key] = read(key, DEFAULTS[key]);
  const beforeSchema = storedSchema();
  for (const key of KEYS) {
    const value = key in data ? data[key] : DEFAULTS[key];
    if (!write(key, value)) {
      for (const k of KEYS) write(k, before[k]);
      if (beforeSchema !== null) write('schema', beforeSchema);
      return false;
    }
  }
  write('schema', SCHEMA_VERSION);
  return true;
}

export function counts() {
  const snap = snapshot();
  return { exercises: snap.exercises.length, groups: snap.groups.length, plans: snap.plans.length, sessions: snap.sessions.length, routines: snap.routines.length };
}

// Grobe Größe der eigenen Daten in KB (UTF-16 ≈ 2 Byte pro Zeichen).
export function usageKB() {
  let chars = 0;
  try {
    const ls = storage();
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(PREFIX)) chars += k.length + (ls.getItem(k) || '').length;
    }
  } catch {
    return 0;
  }
  return Math.round((chars * 2) / 102.4) / 10;
}
