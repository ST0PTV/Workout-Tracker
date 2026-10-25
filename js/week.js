// Harte Sätze pro Muskel und Woche (v1.4, ohne DOM, in Node testbar).
// Recherche 2026-10-13 (Drive → Research & Sources, Abschnitt 5; per Websuche geprüft):
// Pelland et al. 2026 (Sports Medicine 56:481–505) – Sätze für sekundär beteiligte Muskeln als 0,5 zu zählen
// („fraktional“) sagte Muskelzuwachs und Kraft am besten vorher. 0,5 ist eine Konvention: eine explorative
// Auswertung (Remmert et al. 2025, Preprint) kam auf ca. 16–32 %. Deshalb zeigt die App direkt und indirekt getrennt.
// Keine Zielwerte, keine Bewertung – nur Zählung (Projektregel: kein Druck, keine Belohnung).
import { MUSCLES } from './model.js';

export const INDIRECT_FACTOR = 0.5;

// Montag 00:00 Ortszeit der Woche, in der `date` liegt (Woche = Montag bis Sonntag, Entscheidung 2026-10-13).
export function weekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mo = 0 … So = 6
  d.setDate(d.getDate() - dow);
  return d;
}

export function addWeeks(start, n) {
  const d = new Date(start);
  d.setDate(d.getDate() + 7 * n);
  return d;
}

const isHard = (s) => s.completedAt !== null && s.type !== 'warmup';

// Ergebnis: { start, end, sessions, muscles: { [id]: { direct, indirect, total, exercises: [{ exerciseId, direct, indirect }] } } }
// Nur abgeschlossene Trainings, deren Beginn in [start, start + 7 Tage) liegt. Cardio zählt nicht.
// Drop- und Rest-Pause-Sätze zählen je 1 (wie überall in der App).
export function weeklyMuscleSets(sessions, exercisesById, start = weekStart()) {
  const from = weekStart(start).getTime();
  const to = addWeeks(new Date(from), 1).getTime();
  const muscles = Object.fromEntries(Object.keys(MUSCLES).map((m) => [m, { direct: 0, indirect: 0, total: 0, byEx: {} }]));
  let count = 0;
  for (const s of sessions) {
    if (s.endedAt === null) continue;
    const t = Date.parse(s.startedAt);
    if (t < from || t >= to) continue;
    count += 1;
    for (const en of s.entries) {
      const ex = exercisesById[en.exerciseId];
      if (!ex || ex.kind === 'cardio') continue;
      const n = en.sets.filter(isHard).length;
      if (!n) continue;
      const add = (m, key, v) => {
        const row = muscles[m];
        if (!row) return;
        row[key] += v;
        const e = row.byEx[ex.id] || (row.byEx[ex.id] = { exerciseId: ex.id, direct: 0, indirect: 0 });
        e[key] += v;
      };
      for (const m of ex.muscles.primary) add(m, 'direct', n);
      for (const m of ex.muscles.secondary) add(m, 'indirect', n * INDIRECT_FACTOR);
    }
  }
  for (const row of Object.values(muscles)) {
    row.total = row.direct + row.indirect;
    row.exercises = Object.values(row.byEx).sort((a, b) => (b.direct + b.indirect) - (a.direct + a.indirect));
    delete row.byEx;
  }
  return { start: new Date(from), end: new Date(to - 1), sessions: count, muscles };
}

// Stufe für die Einfärbung (0 = nichts, 1 = 1–4, 2 = 5–8, 3 = 9+ Sätze, direkt + indirekt).
// Reine Darstellungsstufen, keine Empfehlung.
export const LEVEL_LABELS = ['0', '<5', '5–8', '≥9'];
export function level(total) {
  if (!(total > 0)) return 0;
  if (total < 5) return 1;
  if (total < 9) return 2;
  return 3;
}

// "9", "1,5", "0"
export const fmtSets = (n) => (Math.round(n * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 });
