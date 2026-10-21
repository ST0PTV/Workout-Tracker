// Zyklus (v2.24.0, optional, ohne DOM, in Node testbar).
// Konzept (Entscheidung 2026-10-22, Nutzerwahl): Beschwerden statt Phasen. Die App zeigt Periodentage (eingetragen),
// eine grob geschätzte nächste Periode als Zeitfenster und erlaubt Symptome und einen frei gewählten „leichten Tag“.
// Keine Trainingsempfehlung nach Phase: In Studien mit hormonell bestätigten Phasen gab es keinen Vorteil für
// phasenbasiertes Training (D'Souza et al. 2026, MSSE; Colenso-Semple et al. 2023). Kalenderschätzungen sind ungenau
// (Lutealphase 7–17 Tage, 95 %-Bereich; Bull et al. 2019). Recherche: Drive → Research - Cycle-Aware Training.
// Datenschutz: alles lokal unter wt_cycle, im Backup enthalten, nie im Repo.

export const CONTRACEPTION = {
  none: 'Keine hormonelle Verhütung',
  combined: 'Pille, Ring oder Pflaster (kombiniert)',
  other: 'Hormonspirale, Implantat, Minipille oder Spritze'
};

export const SYMPTOMS = {
  cramps: 'Krämpfe',
  tired: 'Müde',
  headache: 'Kopfschmerzen',
  mood: 'Stimmung',
  sleep: 'Schlecht geschlafen',
  bloating: 'Blähbauch',
  heavy: 'Sehr starke Blutung',
  pain: 'Starke Schmerzen'
};

export const LIMITS = { avgLength: [15, 60], bleedDays: [1, 14] };
export const DEFAULT_CYCLE = { enabled: false, avgLength: 28, bleedDays: 5, contraception: 'none', periods: [], symptoms: [], checkedAt: null };
export const CHECK_DAYS = 30; // monatlich die Angaben prüfen (nur Hinweis beim Öffnen, keine Benachrichtigung)
export const ABSENT_DAYS = 90; // IOC REDs CAT2: sekundäre Amenorrhö = 3–11 ausgebliebene Zyklen (Hinweis, keine Diagnose)
export const LONG_CYCLE = 35, SHORT_CYCLE = 21; // IOC REDs CAT2 (> 35 Tage); 21–35 Tage = üblicher Bereich (Elliott-Sale et al. 2021)

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
export const addDays = (k, n) => { const d = toDate(k); d.setDate(d.getDate() + n); return dayKey(d); };
const clampInt = (v, [lo, hi], fallback) => (Number.isInteger(v) && v >= lo && v <= hi ? v : fallback);

// Gespeicherte Daten in eine sichere Form bringen (fehlerhafte Einträge fallen weg).
export function normalizeCycle(raw) {
  const c = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const periods = (Array.isArray(c.periods) ? c.periods : [])
    .filter((p) => p && ISO.test(p.start) && (p.end == null || (ISO.test(p.end) && p.end >= p.start)))
    .map((p) => ({ start: p.start, end: p.end ?? null }))
    .sort((a, b) => a.start.localeCompare(b.start))
    .filter((p, i, arr) => i === 0 || p.start !== arr[i - 1].start);
  const symptoms = (Array.isArray(c.symptoms) ? c.symptoms : [])
    .filter((s) => s && ISO.test(s.date) && Array.isArray(s.tags))
    .map((s) => ({ date: s.date, tags: s.tags.filter((t) => t in SYMPTOMS) }))
    .filter((s) => s.tags.length);
  return {
    enabled: c.enabled === true,
    avgLength: clampInt(c.avgLength, LIMITS.avgLength, DEFAULT_CYCLE.avgLength),
    bleedDays: clampInt(c.bleedDays, LIMITS.bleedDays, DEFAULT_CYCLE.bleedDays),
    contraception: c.contraception in CONTRACEPTION ? c.contraception : 'none',
    periods, symptoms,
    checkedAt: typeof c.checkedAt === 'string' && ISO.test(c.checkedAt) ? c.checkedAt : null
  };
}

// Zykluslängen aus aufeinanderfolgenden eingetragenen Periodenbeginnen (plausibel 10–120 Tage), älteste zuerst.
export function cycleLengths(periods) {
  const out = [];
  for (let i = 1; i < periods.length; i++) {
    const d = daysBetween(periods[i - 1].start, periods[i].start);
    if (d >= 10 && d <= 120) out.push(d);
  }
  return out;
}

// Stand für einen Tag. mode: 'off' | 'combined' (keine natürlichen Phasen) | 'other' (nicht vorhersagbar) |
// 'nodata' (noch kein Periodenbeginn) | 'calendar'.
export function cycleStatus(raw, today = dayKey()) {
  const c = normalizeCycle(raw);
  if (!c.enabled) return { mode: 'off' };
  const past = c.periods.filter((p) => p.start <= today);
  const last = past[past.length - 1] || null;
  const day = last ? daysBetween(last.start, today) + 1 : null;
  const inPeriod = !!last && (last.end ? today <= last.end : day <= c.bleedDays);
  const base = { day, inPeriod, lastStart: last?.start || null, checkDue: !c.checkedAt || daysBetween(c.checkedAt, today) >= CHECK_DAYS };
  if (c.contraception === 'combined') return { ...base, mode: 'combined', next: null };
  if (!last) return { ...base, mode: 'nodata', next: null };
  if (c.contraception === 'other') return { ...base, mode: 'other', next: null };
  // Schätzung der nächsten Periode: Mittel der letzten bis zu 6 eingetragenen Zykluslängen, sonst die Angabe.
  // Fenster ± halbe Spannweite der letzten Längen, mindestens ± 3 Tage (Zykluslängen schwanken bei rund der Hälfte
  // der Nutzerinnen um ≥ 5 Tage; Soumpasis et al. 2020).
  const lens = cycleLengths(c.periods).slice(-6);
  const avg = lens.length >= 2 ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : c.avgLength;
  const half = lens.length >= 2 ? Math.ceil((Math.max(...lens) - Math.min(...lens)) / 2) : 0;
  const spread = Math.max(3, half);
  const center = addDays(last.start, avg);
  return { ...base, mode: 'calendar', avgLength: avg, spread, basedOn: lens.length >= 2 ? lens.length : 0, next: { from: addDays(center, -spread), to: addDays(center, spread) } };
}

// Hinweise zum ärztlichen Abklären – keine Diagnose. Nur aus eigenen Angaben, nur ohne hormonelle Verhütung
// (Zyklusmerkmale sind mit Hormonen nicht beurteilbar; IOC REDs CAT2). Symptome „sehr starke Blutung“ und
// „starke Schmerzen“ lösen den Hinweis immer aus (letzte 7 Tage).
export function redFlags(raw, today = dayKey()) {
  const c = normalizeCycle(raw);
  if (!c.enabled) return [];
  const out = [];
  const recent = c.symptoms.filter((s) => s.date <= today && daysBetween(s.date, today) < 7);
  if (recent.some((s) => s.tags.includes('heavy'))) out.push('heavy');
  if (recent.some((s) => s.tags.includes('pain'))) out.push('pain');
  if (c.contraception === 'none') {
    const past = c.periods.filter((p) => p.start <= today);
    const last = past[past.length - 1];
    if (last && daysBetween(last.start, today) > ABSENT_DAYS) out.push('absent');
    const lens = cycleLengths(c.periods).slice(-3);
    if (lens.length >= 2 && lens.filter((d) => d > LONG_CYCLE).length >= 2) out.push('long');
    if (lens.length >= 2 && lens.filter((d) => d < SHORT_CYCLE).length >= 2) out.push('short');
  }
  return out;
}

export const RED_FLAG_TEXT = {
  heavy: 'Sehr starke Blutung (z. B. Schutz stündlich durchnässt, große Klumpen) oder Zeichen von Blutarmut wie ungewohnte Müdigkeit, Atemnot oder Schwindel solltest du ärztlich abklären lassen.',
  pain: 'Starke Regelschmerzen, die dich im Alltag einschränken, schlimmer werden oder auf übliche Schmerzmittel nicht ansprechen, sind ein Grund für einen Arztbesuch – ebenso Schmerzen außerhalb der Periode oder Blutungen zwischen den Perioden.',
  absent: `Seit über ${ABSENT_DAYS} Tagen ist keine Periode eingetragen. Das kann viele Ursachen haben, die meisten sind behandelbar – sprich es bei einer Ärztin oder einem Arzt an. Falls du die Periode nur nicht eingetragen hast, trage sie nach.`,
  long: `Deine letzten Zyklen waren mehrfach länger als ${LONG_CYCLE} Tage. Das kann viele Ursachen haben – es lohnt sich, das ärztlich anzusprechen, besonders bei viel Training oder wenig Essen.`,
  short: `Deine letzten Zyklen waren mehrfach kürzer als ${SHORT_CYCLE} Tage. Das kann viele Ursachen haben – es lohnt sich, das ärztlich anzusprechen.`
};

// ---------- Änderungen (geben neue Daten zurück, ändern die Eingabe nicht) ----------
export function startPeriod(raw, date = dayKey()) {
  const c = normalizeCycle(raw);
  const prev = c.periods.filter((p) => p.start < date);
  const last = prev[prev.length - 1];
  const periods = c.periods.filter((p) => p.start !== date).map((p) => (p === last && p.end == null ? { ...p, end: addDays(p.start, Math.min(c.bleedDays, daysBetween(p.start, date)) - 1) } : p));
  periods.push({ start: date, end: null });
  return normalizeCycle({ ...c, periods });
}

export function endPeriod(raw, date = dayKey()) {
  const c = normalizeCycle(raw);
  const past = c.periods.filter((p) => p.start <= date);
  const last = past[past.length - 1];
  if (!last) return c;
  return normalizeCycle({ ...c, periods: c.periods.map((p) => (p === last ? { ...p, end: date } : p)) });
}

export function removePeriod(raw, start) {
  const c = normalizeCycle(raw);
  return normalizeCycle({ ...c, periods: c.periods.filter((p) => p.start !== start) });
}

export function toggleSymptom(raw, tag, date = dayKey()) {
  const c = normalizeCycle(raw);
  if (!(tag in SYMPTOMS)) return c;
  const cur = c.symptoms.find((s) => s.date === date);
  const tags = cur ? (cur.tags.includes(tag) ? cur.tags.filter((t) => t !== tag) : [...cur.tags, tag]) : [tag];
  const rest = c.symptoms.filter((s) => s.date !== date);
  return normalizeCycle({ ...c, symptoms: tags.length ? [...rest, { date, tags }] : rest });
}

export const symptomsOn = (raw, date = dayKey()) => normalizeCycle(raw).symptoms.find((s) => s.date === date)?.tags || [];
