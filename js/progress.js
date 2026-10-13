// Fortschritt pro Übung (ohne DOM, in Node testbar).
// Recherche 2026-10-13 (Drive → Research & Sources, Abschnitt 3):
// - Gemessene Werte (Top-Satz: Gewicht × Wdh.) stehen im Vordergrund.
// - e1RM nach Epley nur aus Arbeitssätzen mit 1–10 Wdh.; typische Abweichung ±3–6 %, bei Sätzen
//   weit vor dem Muskelversagen systematisch zu niedrig. Klar als Schätzung kennzeichnen.
// - Änderungen unter ca. 5 % liegen im normalen Tagesrauschen (1RM-Retest: Median-CV 4,2 %).
// - Volumen (kg × Wdh.) nur nachrangig; als Volumenmaß gelten in der Forschung harte Sätze.
// - Nie zwischen Übungen oder Geräte-Varianten vergleichen – Verlauf immer pro konkreter Übung.

export const E1RM_MAX_REPS = 10;
export const NOISE_PCT = 5;

// Epley: w × (1 + r/30); bei 1 Wdh. ist das Gewicht selbst der Wert.
export function e1rm(weightKg, reps) {
  if (!(weightKg > 0) || !Number.isInteger(reps) || reps < 1 || reps > E1RM_MAX_REPS) return null;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

const isWorkLike = (s) => s.completedAt !== null && (s.type === 'work' || s.type === 'drop' || s.type === 'restpause');

// Ein Eintrag pro Training, älteste zuerst. Bei Drop- und Rest-Pause-Sätzen zählt für Top-Satz und e1RM
// nur die erste Stufe; Volumen und Wdh. zählen alle Stufen.
export function exerciseProgress(exerciseId, sessions, { kind = 'strength' } = {}) {
  const rows = [];
  for (const s of sessions) {
    if (s.endedAt === null) continue;
    const sets = s.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets).filter(isWorkLike);
    if (!sets.length) continue;
    let top = null;
    let best = null;
    let volume = 0;
    let reps = 0;
    for (const x of sets) {
      const w = x.weightKg ?? 0;
      const r = x.reps ?? 0;
      if (!top || w > top.weightKg || (w === top.weightKg && r > top.reps)) top = { weightKg: w, reps: r };
      const est = kind === 'strength' ? e1rm(w, r) : null;
      if (est !== null && (!best || est > best.value)) best = { value: est, weightKg: w, reps: r };
      volume += w * r;
      reps += r;
      if (x.type === 'drop' || x.type === 'restpause') for (const d of x.drops) { volume += (d.weightKg || 0) * (d.reps || 0); reps += d.reps || 0; }
    }
    rows.push({
      sessionId: s.id,
      date: s.startedAt,
      sets: sets.map((x) => ({ type: x.type, weightKg: x.weightKg, reps: x.reps, drops: x.drops, tags: x.tags })),
      hardSets: sets.length,
      topSet: top,
      e1rm: best,
      volume: kind === 'strength' ? volume : null,
      totalReps: reps
    });
  }
  rows.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  // Veränderung der Schätzung gegenüber dem vorherigen Training mit Schätzwert.
  let prev = null;
  for (const r of rows) {
    if (r.e1rm) {
      if (prev) {
        const pct = ((r.e1rm.value - prev) / prev) * 100;
        r.change = { pct, withinNoise: Math.abs(pct) < NOISE_PCT };
      } else r.change = null;
      prev = r.e1rm.value;
    } else r.change = null;
  }
  return rows;
}

// Gesamtentwicklung: erster vs. letzter Schätzwert und Bestwerte (gemessen und geschätzt).
export function progressSummary(rows) {
  const withEst = rows.filter((r) => r.e1rm);
  const bestTop = rows.reduce((b, r) => (!b || r.topSet.weightKg > b.weightKg || (r.topSet.weightKg === b.weightKg && r.topSet.reps > b.reps) ? { ...r.topSet, date: r.date } : b), null);
  const bestEst = withEst.reduce((b, r) => (!b || r.e1rm.value > b.value ? { ...r.e1rm, date: r.date } : b), null);
  let trend = null;
  if (withEst.length >= 2) {
    const first = withEst[0].e1rm.value;
    const last = withEst[withEst.length - 1].e1rm.value;
    const pct = ((last - first) / first) * 100;
    trend = { pct, withinNoise: Math.abs(pct) < NOISE_PCT, from: withEst[0].date, to: withEst[withEst.length - 1].date };
  }
  return { sessions: rows.length, bestTop, bestEst, trend, estimatePoints: withEst.length };
}

// Übungen mit Verlauf, zuletzt trainierte zuerst.
export function exercisesWithHistory(exercises, sessions) {
  const last = new Map();
  const count = new Map();
  for (const s of sessions) {
    if (s.endedAt === null) continue;
    // Pro Training zählt jede Übung einmal, auch wenn sie mehrfach eingetragen ist.
    const ids = new Set(s.entries.filter((e) => e.sets.some(isWorkLike)).map((e) => e.exerciseId));
    for (const id of ids) {
      count.set(id, (count.get(id) || 0) + 1);
      if (!last.has(id) || Date.parse(s.startedAt) > Date.parse(last.get(id))) last.set(id, s.startedAt);
    }
  }
  return exercises
    .filter((e) => count.has(e.id))
    .map((e) => ({ exercise: e, sessions: count.get(e.id), lastDate: last.get(e.id) }))
    .sort((a, b) => Date.parse(b.lastDate) - Date.parse(a.lastDate));
}

export const fmtKg = (n) => (n === null || n === undefined ? '–' : (Math.round(n * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 }));
