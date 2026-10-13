// Speicherschicht: einzige Stelle, die localStorage anfasst.
// Alle Keys tragen das Präfix "wt_", damit sie nicht mit anderen Apps unter derselben Origin kollidieren.
import { clone } from './util.js';

export const SCHEMA_VERSION = 1;
const PREFIX = 'wt_';

// Sammlungen (Arrays von Objekten mit `id`) und Einzelobjekte.
const DEFAULTS = {
  exercises: [],
  plans: [],
  sessions: [],
  settings: {}
};
export const COLLECTIONS = ['exercises', 'plans', 'sessions'];
export const KEYS = Object.keys(DEFAULTS);

function storage() {
  return globalThis.localStorage;
}

function read(key, fallback) {
  try {
    const raw = storage().getItem(PREFIX + key);
    return raw === null ? clone(fallback) : JSON.parse(raw);
  } catch {
    return clone(fallback);
  }
}

function write(key, value) {
  try {
    storage().setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false; // z. B. Speicher voll oder privater Modus
  }
}

export function init() {
  if (read('schema', null) === null) write('schema', SCHEMA_VERSION);
}

export function get(key) {
  if (!(key in DEFAULTS)) throw new Error(`Unbekannter Speicher-Key: ${key}`);
  return read(key, DEFAULTS[key]);
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
  const before = snapshot();
  for (const key of KEYS) {
    const value = key in data ? data[key] : DEFAULTS[key];
    if (!write(key, value)) {
      for (const k of KEYS) write(k, before[k]);
      return false;
    }
  }
  write('schema', SCHEMA_VERSION);
  return true;
}

export function counts() {
  const snap = snapshot();
  return { exercises: snap.exercises.length, plans: snap.plans.length, sessions: snap.sessions.length };
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
