// v2.26.0: Scheiben pro Seite (A4) und „je Seite“ (A8) – reine Rechen- und Zuordnungslogik, in Node testbar.
// Eingetragen wird immer das Gesamtgewicht; die Anzeige ist nur eine Lesehilfe beim Beladen.
import { poolEntry } from './pool.js';

// Standard-Scheibensatz (kg), wie mit dem Nutzer festgelegt (2026-10-22). Keine eigene Liste.
export const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

// Langhantel-Übungen aus dem Pool ohne normale Stange mit zwei beladenen Enden.
const NO_PLATE_MATH = new Set(['t-bar-row']); // Landmine: nur ein Ende beladen

// Pool-Übungen, bei denen jede Seite einzeln trainiert wird (feste Seite pro Satz).
// Abwechselnde Ausfallschritte gehören bewusst nicht dazu; „je Seite“ ist pro Übung umschaltbar.
export const PER_SIDE_REFS = new Set([
  'one-arm-dumbbell-row', 'bulgarian-split-squat', 'single-leg-calf-raise', 'side-lying-hip-abduction',
  'single-leg-romanian-deadlift', 'dumbbell-step-up', 'concentration-curl', 'cable-hip-abduction-standing',
  'cable-kickback', 'cable-hip-adduction', 'copenhagen-plank', 'cable-woodchop', 'standing-cable-hip-flexion', 'side-plank'
]);

const ref = (exercise) => exercise?.source?.origin === 'builtin' ? exercise.source.ref : null;

// Wiederholungen je Seite? Eigener Wert der Übung, sonst Vorgabe aus dem Pool.
export function isPerSide(exercise) {
  if (!exercise) return false;
  if (typeof exercise.perSide === 'boolean') return exercise.perSide;
  return PER_SIDE_REFS.has(ref(exercise));
}

// Ist die Übung (laut Pool) eine Langhantel-Übung mit zwei beladenen Enden?
export function isBarbell(exercise) {
  const r = ref(exercise);
  if (!r || NO_PLATE_MATH.has(r)) return false;
  return poolEntry(r)?.equipment === 'barbell';
}

// Stangengewicht für die Anzeige oder null (keine Anzeige).
// Eigene Übungen bekommen die Anzeige nur, wenn im Editor ein Stangengewicht eingetragen ist.
export function barFor(exercise, settings = {}) {
  if (!exercise || exercise.kind !== 'strength' || settings.plateMath === false) return null;
  if (typeof exercise.barKg === 'number') return exercise.barKg;
  return isBarbell(exercise) ? (settings.barKg ?? 20) : null;
}

const round2 = (x) => Math.round(x * 100) / 100;

// Gesamtgewicht → { perSide, plates, exact } oder null, wenn nichts zu laden ist.
// Greedy über den Standardsatz (größte Scheibe zuerst), wie man beim Beladen üblicherweise vorgeht.
export function platesFor(totalKg, barKg, plates = STANDARD_PLATES) {
  if (typeof totalKg !== 'number' || !Number.isFinite(totalKg) || typeof barKg !== 'number') return null;
  const perSide = round2((totalKg - barKg) / 2);
  if (perSide <= 0) return null;
  let rest = perSide;
  const out = [];
  for (const p of plates) {
    while (rest + 1e-9 >= p) { out.push(p); rest = round2(rest - p); }
  }
  return { perSide, plates: out, exact: rest < 1e-9 };
}

const de = (x) => x.toLocaleString('de-DE', { maximumFractionDigits: 2 });

// Anzeigezeile, z. B. „Stange 20 kg · 30 kg pro Seite (25 + 5)“.
export function plateLine(totalKg, barKg) {
  if (typeof totalKg !== 'number' || !Number.isFinite(totalKg)) return null;
  if (totalKg < barKg) return `Stange ${de(barKg)} kg · leichter als die Stange`;
  const r = platesFor(totalKg, barKg);
  if (!r) return `Nur die Stange (${de(barKg)} kg)`;
  const detail = r.exact ? ` (${r.plates.map(de).join(' + ')})` : ' (mit dem Standardsatz nicht genau ladbar)';
  return `Stange ${de(barKg)} kg · ${de(r.perSide)} kg pro Seite${detail}`;
}
