// Übungs-Bibliothek: Datenoperationen über dem Store (ohne DOM, in Node testbar).
import * as store from './store.js';
import { nowISO } from './util.js';
import { MUSCLES, validateExercise } from './model.js';
import { poolEntry, exerciseFromPool } from './pool.js';

// Körperregionen für Filter-Chips und Abschnitte der Liste.
export const REGIONS = [
  { key: 'chest', label: 'Brust', muscles: ['chest'] },
  { key: 'shoulders', label: 'Schultern', muscles: ['front-delts', 'side-delts', 'rear-delts'] },
  { key: 'back', label: 'Rücken', muscles: ['lats', 'upper-back', 'lower-back'] },
  { key: 'arms', label: 'Arme', muscles: ['biceps', 'triceps', 'forearms'] },
  { key: 'core', label: 'Bauch', muscles: ['abs', 'obliques', 'hip-flexors'] },
  { key: 'legs', label: 'Beine', muscles: ['glutes', 'quads', 'hamstrings', 'adductors', 'abductors', 'calves'] }
];

export function regionOf(muscle) {
  return REGIONS.find((r) => r.muscles.includes(muscle))?.key ?? null;
}

// Region einer Übung = Region des ersten primären Muskels.
export function exerciseRegion(ex) {
  return regionOf(ex.muscles.primary[0]) ?? 'other';
}

export function inRegion(ex, regionKey) {
  if (!regionKey) return true;
  const r = REGIONS.find((x) => x.key === regionKey);
  return !!r && ex.muscles.primary.some((m) => r.muscles.includes(m));
}

const fold = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

export function matchesQuery(ex, query) {
  const q = fold(query).trim();
  if (!q) return true;
  return fold(ex.name).includes(q) || fold(ex.note).includes(q);
}

export function muscleLabel(key) {
  return MUSCLES[key] || key;
}

// "Brust · Trizeps, vordere Schulter"
export function muscleSummary(ex) {
  const p = ex.muscles.primary.map(muscleLabel).join(', ');
  const s = ex.muscles.secondary.map(muscleLabel).join(', ');
  return s ? `${p} · ${s}` : p;
}

export function listExercises({ includeArchived = false } = {}) {
  return store.get('exercises').filter((e) => includeArchived || !e.archived);
}

export function getExercise(id) {
  return store.get('exercises').find((e) => e.id === id) || null;
}

// Gefilterte, nach Region gruppierte und alphabetisch sortierte Abschnitte.
export function groupedExercises(exercises, { query = '', region = null } = {}) {
  const filtered = exercises.filter((e) => matchesQuery(e, query) && inRegion(e, region));
  const sections = [];
  for (const r of [...REGIONS, { key: 'other', label: 'Ohne Muskelgruppe' }]) {
    const items = filtered.filter((e) => exerciseRegion(e) === r.key).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (items.length) sections.push({ key: r.key, label: r.label, items });
  }
  return sections;
}

// Speichert neu oder aktualisiert. Gibt { ok, errors, exercise } zurück.
export function saveExercise(input) {
  const list = store.get('exercises');
  const now = nowISO();
  const ex = { ...input, name: (input.name || '').trim(), updatedAt: now };

  // Wurden die Muskeln einer Pool-Übung verändert, gilt die Zuordnung nicht mehr als geprüft.
  if (ex.source?.origin === 'builtin') {
    const entry = poolEntry(ex.source.ref);
    const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    const unchanged = entry && same(ex.muscles.primary, entry.muscles.primary) && same(ex.muscles.secondary, entry.muscles.secondary);
    ex.source = { ...ex.source, verification: unchanged ? entry.verification : 'user' };
  }

  const errors = validateExercise(ex);
  if (!ex.muscles.primary.length && ex.kind !== 'cardio') errors.push('Bitte mindestens eine primäre Muskelgruppe wählen.');
  if (list.some((e) => e.id !== ex.id && !e.archived && e.name.toLowerCase() === ex.name.toLowerCase())) {
    errors.push(`Es gibt schon eine Übung „${ex.name}“.`);
  }
  if (errors.length) return { ok: false, errors, exercise: ex };

  const i = list.findIndex((e) => e.id === ex.id);
  if (i >= 0) list[i] = ex;
  else list.push(ex);
  if (!store.set('exercises', list)) return { ok: false, errors: ['Speichern fehlgeschlagen (Speicher voll?).'], exercise: ex };
  return { ok: true, errors: [], exercise: ex };
}

export function setArchived(id, archived) {
  const ex = getExercise(id);
  if (!ex) return { ok: false, errors: ['Übung nicht gefunden.'] };
  if (!archived) {
    const clash = listExercises().some((e) => e.id !== id && e.name.toLowerCase() === ex.name.toLowerCase());
    if (clash) return { ok: false, errors: [`Es gibt schon eine aktive Übung „${ex.name}“.`] };
  }
  const list = store.get('exercises').map((e) => (e.id === id ? { ...e, archived, updatedAt: nowISO() } : e));
  return store.set('exercises', list) ? { ok: true, errors: [] } : { ok: false, errors: ['Speichern fehlgeschlagen.'] };
}

// Pool-Übung übernehmen. Ist sie archiviert vorhanden, wird sie wiederhergestellt statt doppelt angelegt.
export function addFromPool(ref) {
  const entry = poolEntry(ref);
  if (!entry) return { ok: false, errors: ['Unbekannte Pool-Übung.'] };
  const existing = store.get('exercises').find((e) => e.source?.origin === 'builtin' && e.source.ref === ref);
  if (existing) {
    if (!existing.archived) return { ok: false, errors: [`„${existing.name}“ ist schon in deiner Bibliothek.`] };
    const r = setArchived(existing.id, false);
    return r.ok ? { ok: true, errors: [], exercise: getExercise(existing.id), restored: true } : r;
  }
  return saveExercise(exerciseFromPool(entry));
}
