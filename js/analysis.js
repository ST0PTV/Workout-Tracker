// 4-Wochen-Analyse (v2.23.0, ohne DOM, in Node testbar).
// Harte Sätze pro Muskel und Woche über die letzten 4 abgeschlossenen Kalenderwochen (Mo–So, laufende Woche nicht),
// Durchschnitt pro Woche, Kraft-Trend (e1RM, Schätzung) der Hauptübung je Muskel und ein relativer Hinweis
// „zuletzt wenig trainiert“.
// Entscheidung 2026-10-22 (Nutzer: Variante A „relativ“): keine festen Sollwerte. „Wenig“ heißt nur: deutlich
// unter dem Median deiner anderen Muskelgruppen (Hälfte des Medians). Das ist eine Konvention, keine Empfehlung
// aus Studien. Zählweise wie in der Muskelkarte (direkt 1, indirekt 0,5 – Pelland et al. 2026, siehe week.js).
// Projektregel: keine Streaks, kein Druck. Ruhewochen werden nicht markiert; sie senken den Schnitt aller Muskeln gleich.
import { MUSCLES } from './model.js';
import { weeklyMuscleSets, weekStart, addWeeks } from './week.js';
import { exerciseProgress, progressSummary } from './progress.js';

export const WEEKS = 4;
export const LOW_SHARE = 0.5; // „wenig“ = Schnitt unter der Hälfte des Medians (Konvention)
export const MIN_TRAINED = 3; // ohne mindestens 3 trainierte Muskelgruppen kein Hinweis (zu wenig Vergleich)
export const MAX_HINTS = 3;

// ISO-Kalenderwoche (Montag als Wochenbeginn).
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - y0) / 86400000 + 1) / 7);
}

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return 0;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const isHard = (s) => s.completedAt !== null && s.type !== 'warmup';

// exercises: alle Übungen (auch archivierte, damit alte Trainings zählen). now: Bezugszeitpunkt.
// Ergebnis: { weeks: [{ start, end, kw, sessions }], sessions, muscles: [{ id, name, weeks: [n…], avg, direct, indirect,
//   main: { exerciseId, name, trend: { pct, withinNoise } | null, points } | null }], hints, uncovered, median, enough }
export function fourWeekAnalysis(sessions, exercises, now = new Date(), weeks = WEEKS) {
  const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const cur = weekStart(now);
  const starts = Array.from({ length: weeks }, (_, i) => addWeeks(cur, i - weeks));
  const per = starts.map((s) => weeklyMuscleSets(sessions, byId, s));
  const from = starts[0].getTime(), to = cur.getTime();
  const inWindow = sessions.filter((s) => s.endedAt !== null && Date.parse(s.startedAt) >= from && Date.parse(s.startedAt) < to);

  // Harte Sätze je Übung im Zeitraum (für die Wahl der Hauptübung)
  const hardByEx = {};
  for (const s of inWindow) for (const en of s.entries) hardByEx[en.exerciseId] = (hardByEx[en.exerciseId] || 0) + en.sets.filter(isHard).length;

  const muscles = Object.keys(MUSCLES).map((id) => {
    const w = per.map((p) => p.muscles[id].total);
    const direct = per.reduce((a, p) => a + p.muscles[id].direct, 0);
    const indirect = per.reduce((a, p) => a + p.muscles[id].indirect, 0);
    const avg = w.reduce((a, b) => a + b, 0) / weeks;
    // Hauptübung: Kraftübung mit dem Muskel als primär und den meisten harten Sätzen im Zeitraum
    const cands = exercises.filter((e) => e.kind === 'strength' && e.muscles.primary.includes(id) && hardByEx[e.id] > 0)
      .sort((a, b) => hardByEx[b.id] - hardByEx[a.id] || a.name.localeCompare(b.name, 'de'));
    let main = null;
    if (cands.length) {
      const ex = cands[0];
      const sum = progressSummary(exerciseProgress(ex.id, inWindow, { kind: ex.kind }));
      main = { exerciseId: ex.id, name: ex.name, trend: sum.trend ? { pct: sum.trend.pct, withinNoise: sum.trend.withinNoise } : null, points: sum.estimatePoints };
    }
    return { id, name: MUSCLES[id], weeks: w, avg, direct, indirect, main };
  });

  // Relativer Hinweis: nur Muskeln, für die es eine eigene (nicht archivierte) Übung mit dem Muskel als primär gibt.
  const covered = new Set(exercises.filter((e) => !e.archived && e.kind !== 'cardio').flatMap((e) => e.muscles.primary));
  const trained = muscles.filter((m) => m.avg > 0);
  const med = median(trained.map((m) => m.avg));
  const enough = trained.length >= MIN_TRAINED;
  const hints = enough
    ? muscles.filter((m) => covered.has(m.id) && m.avg < LOW_SHARE * med)
      .sort((a, b) => a.avg - b.avg || a.name.localeCompare(b.name, 'de')).slice(0, MAX_HINTS)
    : [];
  const uncovered = muscles.filter((m) => !covered.has(m.id) && m.avg === 0).map((m) => m.id);

  return {
    weeks: starts.map((s, i) => ({ start: s, end: new Date(addWeeks(s, 1).getTime() - 1), kw: isoWeek(s), sessions: per[i].sessions })),
    sessions: inWindow.length,
    muscles, hints, uncovered, median: med, enough
  };
}
