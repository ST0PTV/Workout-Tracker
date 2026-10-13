// Pausenzeit zwischen Sätzen. Pro Übung einstellbar (exercise.restSeconds), sonst Standard aus den Einstellungen.
// Keine Empfehlung im Sinne einer wissenschaftlichen Aussage: der Standard ist eine reine Voreinstellung.
export const REST_MIN = 15;
export const REST_MAX = 600;
export const REST_STEP = 15;

export function clampRest(sec) {
  const n = Math.round(sec / REST_STEP) * REST_STEP;
  return Math.max(REST_MIN, Math.min(REST_MAX, n));
}

export function stepRest(sec, delta) {
  return clampRest(sec + delta * REST_STEP);
}

// Reihenfolge (v1.4): Pause nur in diesem Plan (am Trainingseintrag) → Pause der Übung → Standard.
export function effectiveRest(exercise, settings, entry = null) {
  if (Number.isInteger(entry?.restSeconds)) return entry.restSeconds;
  const own = exercise?.restSeconds;
  return Number.isInteger(own) ? own : settings.restSeconds;
}

// 90 → "1:30", 600 → "10:00"
export function formatDuration(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
