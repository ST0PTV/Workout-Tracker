// Muskelkarte → Übung wählen (v2.2.0), ohne DOM. Vorschlagsliste für einen Muskel und „zum Training hinzufügen“.
// Rein beschreibend: es gibt keine Zielwerte, „wenig trainiert“ ist nur die Stufe der Karte (Projektregel).
import { POOL, poolRefsInLibrary } from './pool.js';
import { addFromPool } from './exercises.js';
import { activeSession, startEmpty, addEntry } from './session.js';

const RANK = { high: 0, medium: 1, low: 2 };
const byName = (a, b) => a.name.localeCompare(b.name, 'de');

// Eigene (nicht archivierte) Übungen mit dem Muskel als primär; darunter Pool-Einträge, die noch nicht in der Bibliothek sind.
// Cardio taucht nie auf (zählt nicht für die Muskelkarte).
export function candidatesFor(muscleId, exercises, pool = POOL) {
  const own = exercises.filter((e) => !e.archived && e.kind !== 'cardio' && e.muscles.primary.includes(muscleId)).sort(byName);
  const have = poolRefsInLibrary(exercises);
  const fromPool = pool
    .filter((p) => p.kind !== 'cardio' && p.muscles.primary.includes(muscleId) && !have.has(p.ref))
    .sort((a, b) => (RANK[a.confidence] ?? 3) - (RANK[b.confidence] ?? 3) || byName(a, b));
  return { own, pool: fromPool };
}

// Stufe 0 oder „unter 5“ der Karte (nur Beschreibung der Darstellung, keine Soll-Zahl).
export const isLowLevel = (total) => total < 5;

// Fügt eine eigene Übung (exerciseId) oder eine Pool-Übung (poolRef) dem laufenden Training hinzu.
// Ohne laufendes Training wird ein freies Training gestartet. Ergebnis: { ok, errors, started }.
export function addToTraining({ exerciseId = null, poolRef = null }) {
  let id = exerciseId;
  if (poolRef) {
    const r = addFromPool(poolRef);
    if (!r.ok) return r;
    id = r.exercise.id;
  }
  if (!id) return { ok: false, errors: ['Keine Übung gewählt.'] };
  let started = false;
  if (!activeSession()) {
    const s = startEmpty();
    if (!s.ok) return s;
    started = true;
  }
  const r = addEntry(id);
  return r.ok ? { ...r, started } : r;
}
