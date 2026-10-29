// v2.4.0: Bewertung pro Übung, Vorschlag fürs nächste Training, Wiedereinstieg nach einer Pause.
// Ohne DOM, in Node testbar. Recherche 2026-10-16 (Drive → Research - Progression and Breaks), Quellen per PubMed-Abstract geprüft.
// Alles sind Vorschläge: nichts ändert sich ohne Tippen auf „Übernehmen“ bzw. „Leichter einsteigen“.
// Schätzungen ohne Studienbeleg (Konvention, in der App so gekennzeichnet): Schrittgrößen, die 10-%-Grenze,
// die Regel „zweimal passend → mehr Gewicht“, „zweimal schwer → weniger“, die Prozentwerte der Pausentabelle.
import { lastPerformance } from './model.js';
import { poolEntry } from './pool.js';
import { isTimed } from './timed.js';

export const PROGRESSION_CHECKED_AT = '2026-10-16';
export const RANGE_LIGHT_CHECKED_AT = '2026-10-22'; // v2.30.0: Bereich und leichte Woche (Abstracts in PubMed)

// Drei Stufen nach Wiederholungen in Reserve (RIR-Skala, Zourdos 2016). 'none' = gefragt, aber übersprungen.
export const RATINGS = {
  easy: { label: 'Leicht', hint: '4+ Wdh. wären noch gegangen' },
  right: { label: 'Passend', hint: 'noch 1–3 Wdh. übrig' },
  hard: { label: 'Schwer', hint: 'keine Wdh. mehr drin' }
};
export const RATING_VALUES = ['easy', 'right', 'hard', 'none'];
export const SUGGESTION_STATES = ['accepted', 'declined'];

// Kleinster übliche Gewichtsschritt je Gerät (Konvention). Wenn die Historie einen kleineren Schritt zeigt, gilt der.
export const DEFAULT_STEP = { barbell: 2.5, dumbbell: 2, machine: 5, cable: 2.5, bodyweight: 2.5 };
export const FALLBACK_STEP = 2.5;
export const MAX_STEP_SHARE = 0.10; // Schritt > 10 % des Gewichts → erst Wiederholungen (ACSM 2009: 2–10 %)

// Pausen: ab 21 Tagen ohne Training (Bosquet 2013: Kraftverlust ab Woche 3–4 messbar).
// Prozentwerte sind Expertenmeinung (Recherche-Report), nicht in Studien getestet.
export const BREAK_MIN_DAYS = 21;
export const BREAK_TABLE = [
  { from: 21, pct: 5 },
  { from: 35, pct: 10 },
  { from: 56, pct: 15 },
  { from: 112, pct: 20 },
  { from: 182, pct: 25 }
];

const DAY = 86400000;
const round2 = (x) => Math.round(x * 100) / 100;
const workSets = (sets) => sets.filter((x) => x.type !== 'warmup');

export function daysBetween(fromIso, to = Date.now()) {
  return Math.floor((to - Date.parse(fromIso)) / DAY);
}

export function breakReduction(days) {
  let pct = 0;
  for (const row of BREAK_TABLE) if (days >= row.from) pct = row.pct;
  return pct;
}

// Kleinster positiver Unterschied zwischen den Arbeitsgewichten verschiedener Trainings (≥ 0,5 kg), sonst Gerät-Standard.
export function loadStep(exercise, sessions) {
  const tops = [];
  for (const s of sessions) {
    if (s.endedAt === null) continue;
    for (const en of s.entries) {
      if (en.exerciseId !== exercise.id) continue;
      const w = workSets(en.sets).filter((x) => x.completedAt !== null && x.weightKg > 0).map((x) => x.weightKg);
      if (w.length) tops.push(Math.max(...w));
    }
  }
  const distinct = [...new Set(tops)].sort((a, b) => a - b);
  let observed = null;
  for (let i = 1; i < distinct.length; i++) {
    const d = round2(distinct[i] - distinct[i - 1]);
    if (d >= 0.5 && (observed === null || d < observed)) observed = d;
  }
  const equipment = exercise.source?.ref ? poolEntry(exercise.source.ref)?.equipment : null;
  const def = DEFAULT_STEP[equipment] ?? FALLBACK_STEP;
  return observed !== null ? Math.min(observed, def * 2) : def;
}

const topWeight = (sets) => Math.max(0, ...workSets(sets).map((x) => x.weightKg || 0));
const minReps = (sets) => Math.min(...workSets(sets).map((x) => x.reps || 0));

// Vorschlag aus den letzten zwei Ausführungen. Ergebnis null oder
// { kind: 'weight' | 'reps', deltaKg, deltaReps, repsFrom, from, to, reason, step, smallStepNote }.
// repsFrom: Wiederholungen je Arbeitssatz zurück auf den Stand der vorletzten Ausführung (Doppelprogression).
// v2.30.0 (B2): repRange { min, max } aus dem Plan – dann entscheidet der Bereich (siehe rangeSuggestion),
// die Bewertung bremst nur. Trainings der leichten Woche sind nie Ausgangspunkt (skipLight).
export function suggestFor(exercise, sessions, { now = Date.now(), beforeSessionId = null, repRange = null } = {}) {
  if (!exercise || exercise.kind === 'cardio' || isTimed(exercise)) return null; // v3.13.0: kein Wdh.-Vorschlag für Halteübungen
  const done = sessions.filter((s) => s.endedAt !== null && s.light !== true);
  const l1 = lastPerformance(exercise.id, done, { beforeSessionId });
  if (!l1 || daysBetween(l1.date, now) >= BREAK_MIN_DAYS) return null;
  const r1 = ratingOf(l1, done, exercise.id);
  if (repRange) return rangeSuggestion(exercise, done, l1, r1, repRange, beforeSessionId);
  if (!r1 || r1 === 'none') return null;
  const l2 = lastPerformance(exercise.id, done.filter((s) => s.id !== l1.sessionId), { beforeSessionId });
  const r2 = l2 ? ratingOf(l2, done, exercise.id) : null;
  const w1 = topWeight(l1.sets);
  const bw = exercise.kind === 'bodyweight';
  const step = loadStep(exercise, done);
  const repsUp = (reason) => ({ kind: 'reps', deltaKg: 0, deltaReps: 1, repsFrom: null, from: w1, to: w1, reason, step, smallStepNote: false });
  const weightBy = (sign, reason, repsFrom = null) => ({ kind: 'weight', deltaKg: sign * step, deltaReps: 0, repsFrom, from: w1, to: round2(w1 + sign * step), reason, step, smallStepNote: false });
  const sameWeight = l2 && topWeight(l2.sets) === w1;

  if (bw && !(w1 > 0)) {
    if (r1 === 'easy') return repsUp('Zuletzt „Leicht“');
    if (r1 === 'right' && r2 === 'right' && sameWeight) return repsUp('Zweimal „Passend“');
    return null;
  }
  if (!(w1 > 0)) return null;
  const big = step / w1 > MAX_STEP_SHARE;
  if (r1 === 'easy') {
    if (!big) return weightBy(1, 'Zuletzt „Leicht“');
    return { ...repsUp('Zuletzt „Leicht“'), smallStepNote: true };
  }
  if (r1 === 'right') {
    if ((r2 === 'right' || r2 === 'easy') && sameWeight && minReps(l1.sets) >= minReps(l2.sets)) {
      if (!big) return weightBy(1, 'Zweimal „Passend“', workSets(l2.sets).map((x) => x.reps));
      return { ...repsUp('Zweimal „Passend“'), smallStepNote: true };
    }
    return repsUp('Zuletzt „Passend“');
  }
  if (r1 === 'hard' && r2 === 'hard' && sameWeight && w1 - step > 0) return weightBy(-1, 'Zweimal „Schwer“');
  return null; // „Schwer“ einmal: Gewicht halten, keine Karte
}

// Doppelprogression im Bereich (Konvention, keine Studie zur Regel selbst; Plotkin 2022: mehr Wiederholungen
// oder mehr Gewicht – beides wirksam). Alle Arbeitssätze am oberen Ende → ein Gewichtsschritt mehr, Wiederholungen
// zurück ans untere Ende; sonst +1 Wdh. je Satz bis zum oberen Ende. „Schwer“ bremst: keine Steigerung,
// nach zweimal „Schwer“ beim gleichen Gewicht ein Schritt weniger (wie ohne Bereich).
function rangeSuggestion(exercise, done, l1, r1, range, beforeSessionId) {
  const ws = workSets(l1.sets);
  const reps = ws.map((x) => x.reps).filter(Number.isInteger);
  if (!reps.length) return null;
  const w1 = topWeight(l1.sets);
  const step = loadStep(exercise, done);
  const base = { deltaKg: 0, deltaReps: 0, repsFrom: null, repsCap: null, from: w1, to: w1, step, smallStepNote: false, range: { ...range } };
  if (r1 === 'hard') {
    const l2 = lastPerformance(exercise.id, done.filter((s) => s.id !== l1.sessionId), { beforeSessionId });
    const r2 = l2 ? ratingOf(l2, done, exercise.id) : null;
    if (r2 === 'hard' && w1 > 0 && topWeight(l2.sets) === w1 && w1 - step > 0) return { ...base, kind: 'weight', deltaKg: -step, to: round2(w1 - step), reason: 'Zweimal „Schwer“' };
    return null; // „Schwer“ bremst: Gewicht und Wiederholungen halten
  }
  const top = reps.every((r) => r >= range.max);
  if (top) {
    if (!(w1 > 0)) return null; // Körpergewicht ohne Zusatzgewicht: oberes Ende erreicht, kein Gewichtsschritt möglich
    return { ...base, kind: 'weight', deltaKg: step, to: round2(w1 + step), repsFrom: ws.map(() => range.min), reason: `Alle Sätze bei ${range.max} Wdh. – oberes Ende erreicht` };
  }
  return { ...base, kind: 'reps', deltaReps: 1, repsCap: range.max, reason: `Ziel ${range.min}–${range.max} Wdh.: erst Wiederholungen bis ${range.max}` };
}

function ratingOf(perf, sessions, exerciseId) {
  const s = sessions.find((x) => x.id === perf.sessionId);
  const en = s ? [...s.entries].reverse().find((e) => e.exerciseId === exerciseId && e.sets.some((x) => x.completedAt !== null)) : null;
  return en?.rating ?? null;
}

// Vorschlag auf die offenen Arbeitssätze eines Eintrags anwenden (gibt neue Sätze zurück).
export function applySuggestion(sets, sug) {
  let i = -1;
  return sets.map((x) => {
    if (x.type === 'warmup') return x;
    i++;
    if (x.completedAt !== null) return x;
    const y = { ...x };
    if (sug.deltaKg && y.weightKg !== null && y.weightKg > 0) y.weightKg = Math.max(0, round2(y.weightKg + sug.deltaKg));
    if (sug.repsFrom && Number.isInteger(sug.repsFrom[i])) y.reps = sug.repsFrom[i];
    else if (sug.deltaReps && Number.isInteger(y.reps)) y.reps = Number.isInteger(sug.repsCap) ? Math.max(y.reps, Math.min(sug.repsCap, y.reps + sug.deltaReps)) : y.reps + sug.deltaReps;
    return y;
  });
}

// Gewicht nach einer Pause: mindestens pct % weniger, in ganzen Schritten (abgerundet). Unterstützung (negativ) bleibt.
export function reducedWeight(weightKg, pct, step) {
  if (!(weightKg > 0) || !pct) return weightKg;
  const steps = Math.ceil(round2((weightKg * pct) / 100 / step));
  return Math.max(0, round2(weightKg - steps * step));
}

export function applyReduction(sets, pct, step) {
  return sets.map((x) => (x.completedAt === null && x.weightKg > 0 ? { ...x, weightKg: reducedWeight(x.weightKg, pct, step), drops: x.drops.map((d) => ({ ...d, weightKg: d.weightKg > 0 ? reducedWeight(d.weightKg, pct, step) : d.weightKg })) } : x));
}

// ---------- v2.30.0 (B3): leichte Woche ----------
// Vorschlag (Konvention, in der App so gekennzeichnet): Arbeitssätze halbieren (aufgerundet, mindestens 1)
// und Gewichte um 10 % senken (ganze Schritte). Grundlage: Umfragen (Rogerson 2024: weniger Volumen und Last;
// De Marco 2024: meist 0–25 % weniger) und zwei RCTs ohne Nachteil durch reduzierte Wochen (Pancar 2026)
// bzw. ganz ohne Training nur bei der Kraft (Coleman 2024). Keine Studie hat eine beste Reduktion ermittelt.
export const LIGHT_WEEK = { setShare: 0.5, pct: 10 };

export const lightSetCount = (n) => Math.max(1, Math.ceil(n * LIGHT_WEEK.setShare));

// Offene Arbeitssätze: nur die ersten lightSetCount(n) bleiben, Gewichte −10 %. Aufwärmsätze und erledigte bleiben.
export function applyLight(sets, step) {
  const work = sets.filter((x) => x.type !== 'warmup');
  const keep = new Set(work.slice(0, lightSetCount(work.length)).map((x) => x.id));
  return sets
    .filter((x) => x.type === 'warmup' || x.completedAt !== null || keep.has(x.id))
    .map((x) => (x.type === 'warmup' || x.completedAt !== null ? x : {
      ...x,
      weightKg: lightWeight(x.weightKg, step),
      drops: x.drops.map((d) => ({ ...d, weightKg: lightWeight(d.weightKg, step) }))
    }));
}

// Etwa 10 % weniger, auf ganze Schritte gerundet (mindestens ein Schritt). Unterstützung (negativ) und leere Werte bleiben.
export function lightWeight(weightKg, step) {
  if (!(weightKg > 0)) return weightKg;
  const steps = Math.max(1, Math.round(round2((weightKg * LIGHT_WEEK.pct) / 100 / step)));
  return Math.max(0, round2(weightKg - steps * step));
}

// Pause seit dem letzten beendeten Training: { days, pct } oder null (unter 21 Tagen oder ohne Historie).
export function breakInfo(sessions, now = Date.now()) {
  const done = sessions.filter((s) => s.endedAt !== null);
  if (!done.length) return null;
  const last = Math.max(...done.map((s) => Date.parse(s.startedAt)));
  const days = Math.floor((now - last) / DAY);
  const pct = breakReduction(days);
  return pct ? { days, pct } : null;
}

export function fmtBreak(days) {
  if (days < 56) return `${Math.round(days / 7)} Wochen`;
  const m = Math.round(days / 30.4);
  return m >= 12 ? 'über einem Jahr' : `${m} Monaten`;
}

export const PROGRESSION_INFO = {
  // v2.34.0: Kurzfassung je Abschnitt (Ebene 2)
  short: {
    rating: [
      'Leicht (4+ Wdh. übrig) → nächstes Mal ein Gewichtsschritt mehr.',
      'Passend (1–3) → erst eine Wiederholung mehr, nach zweimal mehr Gewicht.',
      'Schwer (keine) → Gewicht halten. Bis zum Versagen musst du nicht.'
    ],
    range: [
      'Alle Sätze am oberen Ende → mehr Gewicht, Wiederholungen zurück ans untere Ende.',
      'Sonst je Satz eine Wiederholung mehr.',
      '„Schwer“ bremst: Dann bleibt alles gleich.'
    ],
    light: [
      'Eine Woche mit weniger Sätzen und Gewicht.',
      'Vorschlag: Sätze halbieren, etwa 10 % weniger Gewicht (Schätzung).',
      'Danach geht es mit den Werten von vorher weiter.'
    ],
    pause: [
      'Bis etwa 3 Wochen Pause bleibt die Kraft meist fast gleich.',
      'Danach schlägt die App etwas weniger Gewicht vor (Schätzung).',
      'Nach Krankheit oder Verletzung: so starten, wie es sich gut anfühlt.'
    ]
  },
  rating: [
    'Nach der Übung schätzt du ein, wie viele Wiederholungen beim letzten Arbeitssatz noch gegangen wären. Leicht: 4 oder mehr · Passend: 1–3 · Schwer: keine mehr.',
    'Die Einschätzung ist eine Schätzung. Im Mittel liegt man etwa eine Wiederholung daneben, bei hohen Wiederholungszahlen und weit weg vom Versagen deutlich mehr.',
    'Du musst nicht bis zum Muskelversagen trainieren. Für Kraft war es gleich, ob Sätze am Versagen oder kurz davor endeten; beim Muskelaufbau war der Unterschied höchstens klein.',
    '„Schwer“ heißt deshalb: Gewicht halten. Fortschritt kommt, wenn es sich wieder passend oder leicht anfühlt.'
  ],
  rules: [
    'Leicht → nächstes Mal ein Gewichtsschritt mehr.',
    'Passend → erst eine Wiederholung mehr; nach zweimal „Passend“ beim gleichen Gewicht ein Gewichtsschritt mehr, Wiederholungen zurück.',
    'Schwer → Gewicht halten; erst nach zweimal „Schwer“ ein Schritt weniger.',
    'Ist der kleinste Gewichtsschritt größer als 10 % des Gewichts, schlägt die App erst Wiederholungen vor.',
    'Mehr Wiederholungen sind auch Fortschritt. Nicht jede Einheit muss schwerer werden.',
    'Schrittgröße: der kleinste Schritt, den du bei dieser Übung schon gemacht hast, sonst ein üblicher Wert für das Gerät. Schätzung, kein Studienwert.'
  ],
  range: [
    'Mit einem Wiederholungsbereich im Plan (z. B. 8–12) entscheidet der Bereich: Erreichen alle Arbeitssätze das obere Ende, kommt ein Gewichtsschritt dazu und die Wiederholungen gehen zurück ans untere Ende. Sonst je Satz eine Wiederholung mehr, höchstens bis zum oberen Ende.',
    'Die Bewertung bremst nur: Nach „Schwer“ bleibt alles gleich, nach zweimal „Schwer“ beim gleichen Gewicht kommt ein Schritt weniger.',
    'Diese „Doppelprogression“ ist eine verbreitete Trainerregel, keine in Studien getestete Methode. Eine Studie mit Trainierten fand mehr Wiederholungen und mehr Gewicht als Fortschritt etwa gleich wirksam.'
  ],
  light: [
    'Eine leichte Woche (Deload) ist eine geplante Woche mit weniger Trainingsbelastung. Ihre Trainings zählen nicht als Ausgangspunkt: Danach geht es mit den Werten von vorher weiter.',
    'Vorschlag der App: Arbeitssätze halbieren (aufgerundet) und etwa 10 % weniger Gewicht. Das ist eine Schätzung nach Umfragen unter Athleten und Trainern, kein Studienwert.',
    'Studienlage: In einer Studie mit Untrainierten brachten zwei Wochen mit stark verringertem Umfang keinen Nachteil. Eine Woche ganz ohne Training schadete in einer Studie mit Trainierten dem Muskelaufbau nicht, die Kraft stieg aber etwas weniger.',
    'Wann und wie oft eine leichte Woche sinnvoll ist, ist nicht geklärt. Athleten berichten im Mittel etwa alle 5–6 Wochen – das ist eine Gewohnheit, keine Empfehlung.'
  ],
  pause: [
    'Bis etwa 3 Wochen Pause bleibt die Maximalkraft meist fast gleich. Danach wird der Verlust messbar, bei Älteren und wenig Trainierten stärker.',
    'Kraft kommt nach einer Pause meist schneller zurück, als sie aufgebaut wurde.',
    'Wie viel man nach einer Pause reduzieren sollte, ist nicht in Studien getestet. Die Werte hier sind vorsichtige Schätzungen: ab 3 Wochen 5 %, ab 5 Wochen 10 %, ab 8 Wochen 15 %, ab 16 Wochen 20 %, ab 26 Wochen 25 %.',
    'Nach Krankheit oder Verletzung: starte so, wie es sich gut anfühlt, und kläre im Zweifel ärztlich ab. Schmerz ist kein Trainingsziel.'
  ],
  sources: [
    { label: 'Zourdos et al. 2016, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000001049', note: 'Führt die RPE-Skala nach Wiederholungen in Reserve ein (RPE 10 = 0 RIR). 29 Personen, Kniebeuge. Abstract geprüft.' },
    { label: 'Halperin et al. 2022, Sports Med (Meta-Analyse)', url: 'https://doi.org/10.1007/s40279-021-01559-x', note: '12 Studien, 414 Personen: Wiederholungen bis zum Versagen im Mittel um 0,95 unterschätzt, große Streuung. Abstract geprüft.' },
    { label: 'Zourdos et al. 2021, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000002995', note: 'Sätze mit ~16 Wdh.: Schätzfehler 2 (nah am Versagen) bis 5 Wdh. (weit davon). Abstract geprüft.' },
    { label: 'Grgic et al. 2022, J Sport Health Sci (Meta-Analyse)', url: 'https://doi.org/10.1016/j.jshs.2021.01.007', note: '15 Studien: Versagen vs. kein Versagen ohne signifikanten Unterschied bei Kraft und Muskelaufbau. Abstract geprüft.' },
    { label: 'Refalo et al. 2023, Sports Med (Meta-Analyse)', url: 'https://doi.org/10.1007/s40279-022-01784-y', note: 'Kein Beleg, dass Training bis zum Muskelversagen mehr Muskelaufbau bringt; Vorteil von „Satz-Versagen“ trivial. Abstract geprüft.' },
    { label: 'Robinson et al. 2024, Sports Med (Meta-Regressionen)', url: 'https://doi.org/10.1007/s40279-024-02069-2', note: 'Kraft über viele RIR ähnlich; Muskelaufbau etwas größer, je näher am Versagen. Explorativ, RIR geschätzt. Abstract geprüft.' },
    { label: 'Refalo et al. 2024, J Sports Sci (RCT)', url: 'https://doi.org/10.1080/02640414.2024.2321021', note: '18 Trainierte, 8 Wochen: Versagen vs. 1–2 Wdh. Reserve – gleicher Zuwachs am Oberschenkel. Abstract geprüft.' },
    { label: 'Plotkin et al. 2022, PeerJ (RCT)', url: 'https://doi.org/10.7717/peerj.14142', note: '43 Trainierte: Wiederholungen oder Gewicht steigern – beides wirksam. Abstract geprüft.' },
    { label: 'ACSM 2009, Med Sci Sports Exerc (Position Stand)', url: 'https://doi.org/10.1249/MSS.0b013e3181915670', note: 'Leitlinie: 2–10 % mehr Gewicht, wenn 1–2 Wdh. über dem Ziel gelingen. Abstract geprüft.' },
    { label: 'ACSM 2026 (Currier et al.), Med Sci Sports Exerc (Overview of Reviews)', url: 'https://doi.org/10.1249/MSS.0000000000003897', note: '137 Reviews: Training bis zur Erschöpfung beeinflusste die Ergebnisse nicht durchgehend. Abstract geprüft.' },
    { label: 'Bosquet et al. 2013, Scand J Med Sci Sports (Meta-Analyse)', url: 'https://doi.org/10.1111/sms.12047', note: '103 Studien: Kraftverlust nach Trainingsstopp, größer bei über 65-Jährigen; signifikant ab Woche 3–4 (Volltext). Abstract und Volltext geprüft.' },
    { label: 'Ogasawara et al. 2011, Clin Physiol Funct Imaging', url: 'https://doi.org/10.1111/j.1475-097X.2011.01031.x', note: '3 Wochen Pause: kein signifikanter Verlust beim 1RM (Untrainierte). Abstract geprüft.' },
    { label: 'Blocquiaux et al. 2020, Exp Gerontol', url: 'https://doi.org/10.1016/j.exger.2020.110860', note: 'Ältere Männer: 12 Wochen Pause −5 bis −15 %, nach unter 8 Wochen wieder auf altem 1RM. Abstract geprüft.' },
    { label: 'Psilander et al. 2019, J Appl Physiol', url: 'https://doi.org/10.1152/japplphysiol.00917.2018', note: 'Nach 20 Wochen Pause blieb ~60 % des Kraftzuwachses erhalten. Abstract geprüft.' },
    { label: 'Coleman et al. 2024, PeerJ (RCT)', url: 'https://doi.org/10.7717/peerj.16777', note: '39 Trainierte, 9 Wochen: eine Woche ohne Training in der Mitte – gleicher Muskelaufbau, etwas weniger Kraftzuwachs. Abstract geprüft.' },
    { label: 'Pancar et al. 2026, Sci Rep (RCT, innerhalb der Personen)', url: 'https://doi.org/10.1038/s41598-026-40612-5', note: '19 untrainierte Männer, 8 Wochen: Wochen 4 und 8 mit 2 statt 6–8 Sätzen und einmal statt zweimal pro Woche – kein Unterschied bei Muskeldicke und 10RM. Abstract geprüft.' },
    { label: 'Rogerson et al. 2024, Sports Med Open (Umfrage)', url: 'https://doi.org/10.1186/s40798-024-00691-y', note: '246 Kraft- und Physique-Athleten: Deload ~6 Tage etwa alle 5–6 Wochen; weniger Volumen und Last, Häufigkeit gleich. Abstract geprüft.' },
    { label: 'De Marco et al. 2024, J Strength Cond Res (Umfrage)', url: 'https://doi.org/10.1519/JSC.0000000000004932', note: '204 Trainer: in leichten Phasen meist 0–25 % weniger Volumen und Intensität. Abstract geprüft.' },
    { label: 'Bell et al. 2023, Sports Med Open (Delphi-Konsens)', url: 'https://doi.org/10.1186/s40798-023-00633-0', note: 'Experten-Definition: Deload = Phase mit weniger Trainingsbelastung zur Erholung. Expertenmeinung, keine Wirksamkeitsstudie. Abstract geprüft.' },
    { label: 'Nosaka et al. 2001, Med Sci Sports Exerc', url: 'https://doi.org/10.1097/00005768-200109000-00011', note: 'Schutz vor starkem Muskelkater hält mindestens 6 Monate, nach 9–12 Monaten weg (Armbeuger). Übertragung auf die Pausenwerte ist eine Annahme. Abstract geprüft.' }
  ]
};
