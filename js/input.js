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

// v1.4 Körpergewicht: Zusatzgewicht "+5", "5", "-10" (Unterstützung), leer → null (nur Körpergewicht)
export function parseAddedWeight(text) {
  const t = String(text ?? '').trim().replace(',', '.').replace(/^\+/, '').replace(/^\u2212/, '-');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= -300 && n <= MAX_WEIGHT_KG ? Math.round(n * 100) / 100 : NaN;
}

export const fmtAdded = (n) => (n === null || n === undefined ? '' : `${n > 0 ? '+' : ''}${fmtNum(n)}`);

// v1.4 Cardio-Dauer: "20" (Minuten), "20:30" (mm:ss), "1:05:00" (h:mm:ss); leer → null; ungültig → NaN
export const MAX_DURATION_SEC = 24 * 3600;
export function parseDuration(text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  if (/^\d+([.,]\d+)?$/.test(t)) {
    const min = Number(t.replace(',', '.'));
    const sec = Math.round(min * 60);
    return sec > 0 && sec <= MAX_DURATION_SEC ? sec : NaN;
  }
  const m = t.match(/^(?:(\d+):)?(\d{1,3}):(\d{2})$/);
  if (!m) return NaN;
  const [h, mm, ss] = [Number(m[1] || 0), Number(m[2]), Number(m[3])];
  if (ss > 59 || (m[1] !== undefined && mm > 59)) return NaN;
  const sec = h * 3600 + mm * 60 + ss;
  return sec > 0 && sec <= MAX_DURATION_SEC ? sec : NaN;
}

// 1230 → "20:30", 3900 → "1:05:00"
export function fmtDuration(sec) {
  if (sec === null || sec === undefined) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

// v1.4 Strecke in km ("4,6") → Meter; leer → null; ungültig → NaN
export function parseDistanceKm(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 && n <= 1000 ? Math.round(n * 1000) : NaN;
}

export const fmtKm = (m) => (m === null || m === undefined ? '' : String(Math.round(m / 10) / 100).replace('.', ','));

// Tempo: Rudern pro 500 m, sonst pro km. Gibt "2:10 /500 m" bzw. "5:30 /km" oder null.
export function fmtPace(durationSec, distanceM, per = 1000) {
  if (!(durationSec > 0) || !(distanceM > 0)) return null;
  const sec = Math.round((durationSec * per) / distanceM);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} /${per === 500 ? '500 m' : 'km'}`;
}
