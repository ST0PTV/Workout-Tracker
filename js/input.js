// Zahlen-Eingaben für Sätze (gemeinsam für laufendes Training und Tagebuch, ohne DOM).
// Gleiche Regeln überall, damit Korrekturen nicht strenger oder lockerer sind als das Loggen.

export const MAX_WEIGHT_KG = 1000;
export const MAX_REPS = 200;

// "82,5" → 82.5; leer → null; ungültig → NaN
export function parseWeight(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= MAX_WEIGHT_KG ? Math.round(n * 100) / 100 : NaN;
}

// "8" → 8; leer → null; ungültig (Komma, negativ, zu groß) → NaN
export function parseReps(text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 && n <= MAX_REPS ? n : NaN;
}

export const fmtNum = (n) => (n === null || n === undefined ? '' : String(n).replace('.', ','));
