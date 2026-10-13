// Satztypen, Stufen und Markierungen (v1.2, ohne DOM, in Node testbar).
// Ein Drop-Satz (Typ "drop") hat Stufen mit leichterem Gewicht, ein Rest-Pause-Satz (Typ "restpause")
// Mini-Sätze nach kurzer Pause, meist mit gleichem Gewicht. Beide speichern die Folge-Stufen in `drops[]`;
// Gewicht/Wdh. des Satzes selbst sind die erste Stufe.
// Zählregeln (Konvention, nicht belegt – Recherche 2026-10-13, Drive → Research & Sources):
// - ein Drop- oder Rest-Pause-Satz zählt als 1 harter Satz;
// - Volumen und Gesamt-Wdh. zählen alle Stufen;
// - bester Satz und e1RM nur aus der ersten Stufe (sonst würden Gesamt-Wdh. die Schätzung aufblähen).
import { fmtDuration, fmtKm } from './input.js';

export const STAGE_TYPES = ['drop', 'restpause'];
export const hasStages = (type) => STAGE_TYPES.includes(type);

export const TYPE_LABELS = { warmup: 'Aufwärm', work: 'Arbeit', drop: 'Drop', restpause: 'Rest-Pause' };
export const STAGE_LABEL = { drop: 'Stufe', restpause: 'Mini-Satz' };

// Kurzzeichen vor der Satznummer: A, 1, 2D, 3RP
export function setLabel(set, workNo) {
  if (set.type === 'warmup') return 'A';
  if (set.type === 'drop') return `${workNo}D`;
  if (set.type === 'restpause') return `${workNo}RP`;
  return String(workNo);
}

// Satztyp ändern. Stufen bleiben nur bei Drop/Rest-Pause erhalten.
export function setType(set, type) {
  set.type = type;
  if (!hasStages(type)) set.drops = [];
  return set;
}

// Neue Stufe: Rest-Pause übernimmt das Gewicht der vorigen Stufe; Drop lässt das Gewicht leer
// (Platzhalter zeigt das vorige), weil die Abstufung individuell ist.
export function addStage(set) {
  if (!hasStages(set.type)) return null;
  const prevW = set.drops.length ? set.drops[set.drops.length - 1].weightKg : set.weightKg;
  const stage = { weightKg: set.type === 'restpause' ? (prevW ?? null) : null, reps: null };
  set.drops.push(stage);
  return stage;
}

export function updateStage(set, index, values) {
  const st = set.drops[index];
  if (!st) return false;
  for (const k of ['weightKg', 'reps']) if (k in values) st[k] = values[k];
  return true;
}

export function removeStage(set, index) {
  if (!set.drops[index]) return false;
  set.drops.splice(index, 1);
  return true;
}

// Stufen ohne Wiederholungen gelten als nicht gemacht und werden entfernt – z. B. beim Beenden oder Speichern
// (bei Rest-Pause ist das Gewicht vorbelegt, daher zählt nur die Wdh.-Eingabe).
export function cleanStages(set) {
  set.drops = (set.drops || []).filter((d) => d.reps !== null && d.reps !== undefined);
  if (!hasStages(set.type)) set.drops = [];
  return set;
}

// ---------- Markierungen ----------
// Feste Schlüssel aus SET_TAGS (model.js) oder eigene als "custom:<Text>".
export const CUSTOM_PREFIX = 'custom:';
export const MAX_CUSTOM_LEN = 30;

export function toggleTag(set, tag) {
  const i = set.tags.indexOf(tag);
  if (i >= 0) set.tags.splice(i, 1); else set.tags.push(tag);
  return set;
}

// Eigene Markierung aus Freitext; leer oder doppelt → null.
export function customTag(text) {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_CUSTOM_LEN);
  return t ? `${CUSTOM_PREFIX}${t}` : null;
}

export function tagLabel(tag, labels) {
  return tag.startsWith(CUSTOM_PREFIX) ? tag.slice(CUSTOM_PREFIX.length) : (labels[tag] || tag);
}

// ---------- Anzeige ----------
const num = (n) => (n === null || n === undefined ? '–' : (Math.round(n * 100) / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 }));

// "85 × 8", Drop: "85 × 8 + 60 × 6", Rest-Pause mit gleichem Gewicht: "50 × 12 + 4 + 3".
// v1.4: kind-abhängig. Cardio "20:00 · 4,6 km"; Körpergewicht "KG × 8" bzw. "+5 × 5" / "−10 × 6" (Unterstützung);
// ohne Gewicht und ohne bekannten Typ "8 Wdh.".
export function formatSet(set, kind = null) {
  if (kind === 'cardio' || (set.reps === null && (set.durationSec || set.distanceM))) {
    return [set.durationSec ? fmtDuration(set.durationSec) : null, set.distanceM ? `${fmtKm(set.distanceM)} km` : null].filter(Boolean).join(' · ') || '–';
  }
  let w;
  if (kind === 'bodyweight') w = set.weightKg === null || set.weightKg === 0 ? 'KG' : `${set.weightKg > 0 ? '+' : '−'}${num(Math.abs(set.weightKg))}`;
  else if (set.weightKg === null && set.reps !== null && !set.drops?.length) return `${num(set.reps)} Wdh.`;
  else w = num(set.weightKg);
  const base = `${w} × ${num(set.reps)}`;
  if (!hasStages(set.type) || !set.drops?.length) return base;
  const rest = set.drops.map((d) => (set.type === 'restpause' && d.weightKg === set.weightKg ? num(d.reps) : `${num(d.weightKg)} × ${num(d.reps)}`));
  return [base, ...rest].join(' + ');
}
