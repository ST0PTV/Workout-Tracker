// v3.5.0: Gesamtdauer eines Plans ändern (Nutzerwunsch). Nutzt das Dauermodell der Plan-Analyse
// (Aufwärmen + Sätze × (Satzzeit + Pause), Konvention aus 3.2.0, Unverified #286) und passt nur die Satzzahl an.
// Regeln (Konvention, keine Studie): Kürzen zuerst bei Einzelgelenk-Übungen mit den meisten Sätzen, jede Übung
// behält mindestens 1 Satz; Verlängern zuerst bei mehrgelenkigen Übungen mit den wenigsten Sätzen, höchstens 5.
// Cardio-Einträge bleiben unverändert und zählen (wie in der Analyse) nicht zur Dauer.
import { planFacts } from './plan-analysis.js';
import { WARMUP_SEC, SET_WORK_SEC } from './plan-builder.js';

export const FIT_MIN_SETS = 1;
export const FIT_MAX_SETS = 5;

/** Geschätzte Dauer eines Plans in Sekunden (gleiches Modell wie die Plan-Analyse). */
export function planSeconds(plan, exercises, settings) {
  // v3.8.0: Pläne nur mit Cardio (z. B. „Ausdauer“ aus dem Assistenten) haben keine Schätzung – sonst stünde dort nur das Aufwärmen.
  const f = planFacts([{ ...plan, archived: false }], exercises, settings)[0];
  return f && f.items.length ? f.seconds : 0;
}

/**
 * Sätze so ändern, dass die geschätzte Dauer möglichst nah an targetSec liegt, ohne sie beim Verlängern zu überschreiten.
 * Rückgabe: { items, seconds, changed } – items = Plan-Einträge mit neuem targetSets.
 */
export function fitPlanToSeconds(plan, exercises, settings, targetSec) {
  const f = planFacts([{ ...plan, archived: false }], exercises, settings)[0];
  if (!f || !f.items.length) return { items: plan.items, seconds: f?.seconds || 0, changed: false };
  const rows = f.items.map((it) => ({ ...it }));
  const setSec = (r) => SET_WORK_SEC + r.rest;
  const total = () => WARMUP_SEC + rows.reduce((n, r) => n + r.sets * setSec(r), 0);
  // Kürzen
  while (total() > targetSec) {
    const cand = rows.filter((r) => r.sets > FIT_MIN_SETS).sort((a, b) => (a.compound - b.compound) || (b.sets - a.sets));
    if (!cand.length) break;
    cand[0].sets -= 1;
  }
  // Verlängern (nur solange das Ziel nicht überschritten wird)
  for (;;) {
    const cand = rows.filter((r) => r.sets < FIT_MAX_SETS && total() + setSec(r) <= targetSec)
      .sort((a, b) => (b.compound - a.compound) || (a.sets - b.sets));
    if (!cand.length) break;
    cand[0].sets += 1;
  }
  const bySet = new Map(rows.map((r) => [r.itemId, r.sets]));
  let changed = false;
  const items = plan.items.map((it) => {
    if (!bySet.has(it.id)) return it;
    const s = bySet.get(it.id);
    const old = f.items.find((x) => x.itemId === it.id).sets;
    if (s === old) return it;
    changed = true;
    return { ...it, targetSets: s };
  });
  return { items, seconds: total(), changed };
}
