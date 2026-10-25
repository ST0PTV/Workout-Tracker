// Körper-Piktogramm zum Plan (v2.33.0). Ohne DOM, in Node testbar.
// Muskeln eines Plans = Vereinigung der Muskeln seiner Übungen: primär (Hauptmuskeln) vor sekundär
// (ein Muskel, der in einer Übung primär ist, zählt nur als primär). Cardio-Übungen tragen nichts bei,
// sie haben keine gezählten Muskeln (Muskeln nur zur Info). Dieselbe Zuordnung wie Muskelkarte und Piktogramme.
import { dayIndex } from './schedule.js';

export function planMuscles(plan, exercisesById) {
  const prim = new Set();
  const sec = new Set();
  for (const it of plan?.items || []) {
    const ex = exercisesById[it.exerciseId];
    if (!ex || ex.kind === 'cardio') continue;
    for (const m of ex.muscles?.primary || []) prim.add(m);
    for (const m of ex.muscles?.secondary || []) sec.add(m);
  }
  for (const m of prim) sec.delete(m);
  return { primary: [...prim], secondary: [...sec] };
}

// Ist heute ein Trainingstag dieses Plans? (plan.days, Mo = 0 … So = 6; ohne Tage nie)
export function isPlanDay(plan, date = new Date()) {
  return Array.isArray(plan?.days) && plan.days.includes(dayIndex(date));
}

// Pläne des Tages nach oben, sonst Reihenfolge wie übergeben (stabil).
export function todayFirst(plans, date = new Date()) {
  return [...plans.filter((p) => isPlanDay(p, date)), ...plans.filter((p) => !isPlanDay(p, date))];
}
