// v3.13.0 (M2, Feature-Audit 2026-10-29): Halteübungen werden in Sekunden erfasst statt in Wiederholungen.
// Pool-Übungen über ihre ref; eigene Übungen über das optionale Feld `timed` (true/false, fehlt = nach ref).
// Gespeichert wird die Haltezeit im vorhandenen Satzfeld `durationSec` (keine Schemaänderung), `reps` bleibt null.
export const TIMED_REFS = new Set(['plank', 'side-plank', 'copenhagen-plank', 'l-sit', 'farmers-walk']);

export const isTimed = (ex) => !!ex && ex.kind !== 'cardio' && (typeof ex.timed === 'boolean' ? ex.timed : TIMED_REFS.has(ex.source?.ref));
