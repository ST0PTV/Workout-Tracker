// v3.2.0: Plan-Assistent – Logik ohne DOM (in Node testbar).
// Aus fünf Antworten (Ziel, Tage, Zeit, Geräte, Erfahrung) entsteht ein Vorschlag aus einem oder mehreren Plänen.
//
// Grundlage (Abstracts per PubMed geprüft 2026-10-26; Details: Drive „Research - Plan Builder Rules 2026-10-26“):
// - ACSM 2009 (Med Sci Sports Exerc 41:687): Einsteiger 8–12 Wdh., 2–3 Tage/Woche; große vor kleinen und
//   mehrgelenkige vor eingelenkigen Übungen; Hypertrophie 1–2 min Pause.
// - ACSM 2026 (Currier et al., Med Sci Sports Exerc 58:851): Kraft profitiert von schweren Lasten, 2–3 Sätzen, Übung am
//   Anfang der Einheit und ≥ 2 Einheiten/Woche; Muskelwachstum von ≥ 10 Sätzen/Woche; Geräteart ohne durchgehenden Effekt.
// - Schoenfeld et al. 2016 (Sports Med 46:1689): jeden großen Muskel mind. 2× pro Woche.
// - Ramos-Campo et al. 2024 (J Strength Cond Res 38:1330): Split und Ganzkörper bei gleichem Volumen gleichwertig.
// - Nunes et al. 2020 (Eur J Sport Sci 21:149): Kraft wächst am meisten in den Übungen am Anfang; Muskelwachstum unabhängig
//   von der Reihenfolge.
// - Schoenfeld et al. 2017 (J Strength Cond Res 31:3508): Muskelwachstum über ein breites Lastspektrum ähnlich.
// - Singer et al. 2024 (Front Sports Act Living 6:1429789): Pausen > 60 s leicht besser, über 90 s kein weiterer Unterschied.
// Konventionen (keine Studienwerte, in der App als Schätzung gekennzeichnet): Zuordnung Tage → Split und Wochentage,
// Kandidatenlisten je Bewegungsmuster, 40 s pro Satz, 5 min Aufwärmen, Satzzahlen je Erfahrung.
import { POOL, poolEntry, fitsGear } from './pool.js';
import { MUSCLES } from './model.js';

export const GOALS = { strength: 'Kraft', muscle: 'Muskelaufbau', fit: 'Fit bleiben' };
export const DAY_OPTIONS = [1, 2, 3, 4, 5, 6]; // Krafttage pro Woche (v3.8.0: 1 und 6 dazu)
export const TIME_OPTIONS = [30, 45, 60, 75];
export const LEVELS = { new: 'Neu', some: 'Bis 1 Jahr', long: 'Länger' };
export const WARMUP_SEC = 300; // Konvention: allgemeines Aufwärmen
export const SET_WORK_SEC = 40; // Konvention: Dauer eines Satzes (ca. 8–12 Wdh.)

// Geräte-Vorlagen für die Frage „Was hast du?“ (Schlüssel aus pool.js GEAR; [] = nur Körpergewicht).
export const GEAR_PRESETS = {
  gym: { label: 'Fitnessstudio', sub: 'Maschinen, Kabel, Hanteln', gear: null },
  home: { label: 'Zu Hause mit Kurzhanteln', sub: 'Kurzhanteln und eine Bank', gear: ['dumbbell', 'bench'] },
  body: { label: 'Nur Körpergewicht', sub: 'Ohne Geräte', gear: [] }
};

// Bewegungsmuster → Kandidaten in Reihenfolge der Vorliebe (Konvention: geführte Geräte zuerst, weil leichter zu lernen;
// laut ACSM 2026 hat die Geräteart keinen durchgehenden Effekt). compound = mehrgelenkig (kommt zuerst).
export const SLOTS = {
  squat: { compound: true, refs: ['leg-press', 'goblet-squat', 'back-squat', 'smith-machine-squat', 'hack-squat', 'belt-squat', 'bulgarian-split-squat', 'dumbbell-reverse-lunge', 'bodyweight-squat'] },
  lunge: { compound: true, refs: ['bulgarian-split-squat', 'dumbbell-reverse-lunge', 'goblet-squat', 'hack-squat', 'leg-press', 'dumbbell-step-up', 'bodyweight-reverse-lunge'] },
  hinge: { compound: true, refs: ['romanian-deadlift', 'single-leg-romanian-deadlift', 'hip-thrust', 'back-extension-45', 'glute-bridge', 'good-morning', 'bodyweight-glute-bridge'] },
  hpush: { compound: true, refs: ['chest-press-machine', 'dumbbell-bench-press', 'bench-press-barbell', 'push-up'] },
  ipush: { compound: true, refs: ['incline-machine-chest-press', 'incline-press-dumbbell', 'incline-barbell-bench-press', 'smith-machine-incline-bench-press', 'feet-elevated-push-up', 'push-up'] },
  vpush: { compound: true, refs: ['machine-shoulder-press', 'shoulder-press-dumbbell', 'standing-barbell-overhead-press', 'pike-push-up'] },
  hpull: { compound: true, refs: ['seated-cable-row', 'machine-row', 'chest-supported-row', 'one-arm-dumbbell-row', 'barbell-row', 'inverted-row'] },
  vpull: { compound: true, refs: ['lat-pulldown', 'close-grip-lat-pulldown', 'pull-up', 'chin-up'] },
  legcurl: { compound: false, refs: ['seated-leg-curl', 'lying-leg-curl'] },
  legext: { compound: false, refs: ['leg-extension'] },
  lateral: { compound: false, refs: ['lateral-raise-dumbbell', 'cable-lateral-raise', 'machine-lateral-raise'] },
  reardelt: { compound: false, refs: ['face-pull', 'reverse-pec-deck', 'dumbbell-reverse-fly', 'cable-reverse-fly', 'prone-y-t-raise'] },
  biceps: { compound: false, refs: ['dumbbell-curl', 'cable-curl', 'barbell-curl-ez', 'hammer-curl'] },
  triceps: { compound: false, refs: ['triceps-pushdown', 'overhead-dumbbell-triceps-extension', 'overhead-triceps-extension', 'machine-triceps-dip', 'bench-dips'] },
  calves: { compound: false, refs: ['standing-calf-raise', 'leg-press-calf-raise', 'seated-calf-raise', 'single-leg-calf-raise'] },
  core: { compound: false, refs: ['plank', 'dead-bug', 'cable-crunch', 'reverse-crunch', 'side-plank'] }
};

// Übungen mit Haltezeit statt Wiederholungen: kein Wiederholungsbereich.
export const TIMED = new Set(['plank', 'side-plank', 'copenhagen-plank', 'l-sit', 'farmers-walk']);

// Tagesvorlagen: erst die festen Muster (Reihenfolge = mehrgelenkig zuerst), dann Zusätze, solange die Zeit reicht.
export const DAY_TEMPLATES = {
  fbA: { name: 'Ganzkörper A', main: ['squat', 'hpush', 'hpull', 'hinge', 'lateral', 'core'], extra: ['triceps', 'biceps', 'calves'] },
  fbB: { name: 'Ganzkörper B', main: ['lunge', 'ipush', 'vpull', 'legcurl', 'reardelt', 'core'], extra: ['biceps', 'triceps', 'calves'] },
  upper: { name: 'Oberkörper', main: ['hpush', 'hpull', 'vpush', 'vpull', 'lateral', 'triceps', 'biceps'], extra: ['reardelt'] },
  lower: { name: 'Unterkörper', main: ['squat', 'hinge', 'legcurl', 'legext', 'calves', 'core'], extra: ['lunge'] },
  push: { name: 'Drücken', main: ['hpush', 'vpush', 'ipush', 'lateral', 'triceps'], extra: ['core'] },
  pull: { name: 'Ziehen', main: ['vpull', 'hpull', 'reardelt', 'biceps'], extra: ['hinge', 'core'] },
  legs: { name: 'Beine', main: ['squat', 'hinge', 'legcurl', 'legext', 'calves'], extra: ['core'] }
};

// Tage pro Woche → Pläne mit Wochentagen (Mo = 0). Konvention; Split vs. Ganzkörper gleichwertig (Ramos-Campo 2024),
// jeder Muskel mind. 2× pro Woche (Schoenfeld 2016) – außer bei 1 Krafttag (dann ein Hinweis).
// v3.8.0: 1 Tag = Ganzkörper A; 6 Tage = Drücken/Ziehen/Beine zweimal (Konvention). Kein 7. Krafttag (STRENGTH_MAX).
export const SPLITS = {
  1: { label: 'Ganzkörper', plans: [['fbA', [0]]] },
  2: { label: 'Ganzkörper', plans: [['fbA', [0]], ['fbB', [3]]] },
  3: { label: 'Ganzkörper', plans: [['fbA', [0, 4]], ['fbB', [2]]] },
  4: { label: 'Oberkörper / Unterkörper', plans: [['upper', [0, 3]], ['lower', [1, 4]]] },
  5: { label: 'Drücken / Ziehen / Beine + Ober-/Unterkörper', plans: [['push', [0]], ['pull', [1]], ['legs', [2]], ['upper', [4]], ['lower', [5]]] },
  6: { label: 'Drücken / Ziehen / Beine ×2', plans: [['push', [0, 3]], ['pull', [1, 4]], ['legs', [2, 5]]] }
};

// v3.8.0: Wochentage frei wählbar, jeder Tag Kraft oder Cardio (Nutzer entscheidet). Ein Split ist eine Reihenfolge von
// Trainings (z. B. Ganzkörper A, B, A); die Krafttage werden der Reihe nach belegt. Mit den Standardtagen von SPLITS
// kommt exakt der frühere Vorschlag heraus.
export const STRENGTH_MAX = 6; // Konvention: mindestens ein Tag ohne Krafttraining (Regel: kein Druck gegen Ruhetage)
export const DEFAULT_WEEKDAYS = Object.fromEntries(DAY_OPTIONS.map((n) => [n, SPLITS[n].plans.flatMap(([, days]) => days).sort((x, y) => x - y)]));
// Übergang für die alte Tagesfrage (2–5 Tage); die neue Frage nutzt STRENGTH_MAX.
export const WEEKDAY_MIN = 1;
export const WEEKDAY_MAX = STRENGTH_MAX;

// Cardio-Tage: ein eigener Plan „Ausdauer“ mit einer Übung ohne Gerät, tauschbar im Plan. Einsteiger: zügiges Gehen,
// sonst Laufen (Konvention). Dauer = Antwort „Wie lange pro Training?“. Kraft und Cardio an getrennten Tagen bremsen
// Muskelaufbau und Maximalkraft im Mittel nicht (Schumann et al. 2022, Meta-Analyse; Abstract).
export const CARDIO_PLAN_NAME = 'Ausdauer';
export const CARDIO_PICK = { new: 'outdoor-walking', some: 'outdoor-running', long: 'outdoor-running' };
// WHO 2020 (Bull et al., Abstract): 150–300 min mittlere oder 75–150 min hohe Intensität pro Woche – nur als Orientierung.
export const WHO_AEROBIC = { moderate: [150, 300], vigorous: [75, 150] };

/** Reihenfolge der Trainings je Tageszahl, z. B. 3 → ['fbA', 'fbB', 'fbA']. */
export function sessionOrder(count) {
  return SPLITS[count].plans.flatMap(([key, days]) => days.map((d) => [d, key])).sort((x, y) => x[0] - y[0]).map(([, key]) => key);
}

/** Gültige Tagesliste (Mo = 0 … So = 6, verschieden, höchstens max Einträge, aufsteigend) oder null. Leer ist erlaubt. */
export function cleanDays(list, max = 7) {
  if (!Array.isArray(list) || list.length > max) return null;
  if (new Set(list).size !== list.length || !list.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return null;
  return [...list].sort((x, y) => x - y);
}

/** Krafttage (1–6) oder null. */
export function cleanWeekdays(list) {
  const days = cleanDays(list, STRENGTH_MAX);
  return days && days.length ? days : null;
}

/** Wochentage je Plan: Krafttage der Reihe nach auf die Trainings des Splits verteilen. */
export function planDays(weekdays) {
  const order = sessionOrder(weekdays.length);
  return SPLITS[weekdays.length].plans.map(([key]) => weekdays.filter((_, i) => order[i] === key));
}

/** Ganzkörper (2–3 Krafttage) an Tagen direkt hintereinander (So und Mo zählen auch)? Dann ein neutraler Hinweis (Konvention). */
export function adjacentFullBody(weekdays) {
  const days = cleanWeekdays(weekdays);
  if (!days || days.length < 2 || days.length > 3) return false;
  return days.some((d) => days.includes((d + 1) % 7));
}

/** Prüft und vervollständigt die Antworten; unbekannte Werte fallen auf sichere Standards.
 *  weekdays = Krafttage (0–6, leer nur zusammen mit Cardio-Tagen), cardioDays = Cardio-Tage (0–7, nicht doppelt belegt).
 *  Ohne gültige Krafttage gilt days (alte Frage) mit den Standardtagen; Cardio-Tage gibt es dann nicht. */
export function normalizeAnswers(a = {}) {
  let weekdays = cleanDays(a.weekdays, STRENGTH_MAX);
  let cardioDays = cleanDays(a.cardioDays, 7) || [];
  if (!weekdays || cardioDays.some((d) => weekdays.includes(d))) cardioDays = [];
  if (weekdays && !weekdays.length && !cardioDays.length) weekdays = null;
  return {
    goal: GOALS[a.goal] ? a.goal : 'muscle',
    weekdays,
    cardioDays,
    days: weekdays ? weekdays.length : (DAY_OPTIONS.includes(a.days) ? a.days : 3),
    minutes: TIME_OPTIONS.includes(a.minutes) ? a.minutes : 45,
    gear: a.gear === null || Array.isArray(a.gear) ? a.gear : null,
    level: LEVELS[a.level] ? a.level : 'new'
  };
}

/** Sätze, Wiederholungsbereich und Pause einer Übung je nach Ziel und Erfahrung. */
export function prescription(slotKey, ref, answers) {
  const { goal, level } = answers;
  const compound = SLOTS[slotKey]?.compound ?? false;
  const sets = level === 'new' ? 2 : level === 'some' ? (compound ? 3 : 2) : 3;
  let range;
  let rest;
  if (goal === 'strength' && compound && level !== 'new') { range = { min: 4, max: 6 }; rest = 180; }
  else if (goal === 'fit') { range = { min: 10, max: 15 }; rest = compound ? 90 : 60; }
  else { range = compound ? { min: 8, max: 12 } : { min: 10, max: 15 }; rest = compound ? 120 : 90; }
  return { sets, repRange: TIMED.has(ref) ? null : range, restSeconds: rest };
}

/** Geschätzte Dauer einer Übung in Sekunden (Konvention: Satzdauer + Pause je Satz). */
export const itemSeconds = (p) => p.sets * (SET_WORK_SEC + p.restSeconds);

/** Erster passender Kandidat eines Musters; avoid = schon genutzte Pool-Refs (wenn möglich ausweichen). */
export function pickExercise(slotKey, gear, avoid = new Set()) {
  const refs = SLOTS[slotKey]?.refs || [];
  const ok = refs.filter((r) => { const p = poolEntry(r); return p && fitsGear(p, gear); });
  return ok.find((r) => !avoid.has(r)) || ok[0] || null;
}

/** Baut einen Tag: Hauptmuster, dann Zusätze, solange die geschätzte Zeit reicht (mind. 3 Übungen). */
export function buildDay(templateKey, answers, usedRefs = new Set()) {
  const tpl = DAY_TEMPLATES[templateKey];
  const budget = answers.minutes * 60 - WARMUP_SEC;
  const items = [];
  const missing = [];
  let total = 0;
  const inDay = new Set();
  for (const [slotKey, isExtra] of [...tpl.main.map((s) => [s, false]), ...tpl.extra.map((s) => [s, true])]) {
    const ref = pickExercise(slotKey, answers.gear, new Set([...usedRefs, ...inDay]));
    if (!ref || inDay.has(ref)) { if (!isExtra && !ref) missing.push(slotKey); continue; }
    const p = prescription(slotKey, ref, answers);
    const sec = itemSeconds(p);
    if (items.length >= 3 && total + sec > budget) { if (isExtra) continue; else break; }
    items.push({ slot: slotKey, ref, ...p });
    inDay.add(ref);
    total += sec;
  }
  // Mehrgelenkige vor eingelenkigen (ACSM 2009; Nunes 2020) – auch für mehrgelenkige Zusätze; sonst Reihenfolge der Vorlage.
  items.sort((x, y) => Number(SLOTS[y.slot].compound) - Number(SLOTS[x.slot].compound));
  return { key: templateKey, name: tpl.name, items, seconds: total + WARMUP_SEC, missing };
}

/** Wöchentliche Sätze pro Muskel (direkt 1, indirekt 0,5 wie in week.js). */
export function weeklyMuscleSets(plans) {
  const out = Object.fromEntries(Object.keys(MUSCLES).map((m) => [m, 0]));
  for (const plan of plans) {
    const times = Math.max(1, plan.days.length);
    for (const it of plan.items) {
      const p = poolEntry(it.ref);
      if (!p) continue;
      for (const m of p.muscles.primary) out[m] += it.sets * times;
      for (const m of p.muscles.secondary) out[m] += 0.5 * it.sets * times;
    }
  }
  return out;
}

/** v3.8.0: Plan für die Cardio-Tage – eine Übung ohne Gerät, so lang wie die gewählte Trainingsdauer. */
export function cardioPlan(answers) {
  const ref = CARDIO_PICK[answers.level] || CARDIO_PICK.new;
  return {
    key: 'cardio', name: CARDIO_PLAN_NAME, cardio: true, days: [...answers.cardioDays],
    items: [{ slot: 'cardio', ref, sets: 1, repRange: null, restSeconds: null }],
    seconds: answers.minutes * 60, missing: []
  };
}

/** Der ganze Vorschlag: Pläne mit Wochentagen, Übungen, Dauer und Sätze pro Muskel. */
export function buildProgram(rawAnswers) {
  const answers = normalizeAnswers(rawAnswers);
  const split = answers.days ? SPLITS[answers.days] : null;
  const dayLists = !split ? [] : answers.weekdays ? planDays(answers.weekdays) : split.plans.map(([, days]) => days);
  const used = new Set();
  const plans = !split ? [] : split.plans.map(([key], i) => {
    const day = buildDay(key, answers, used);
    for (const it of day.items) used.add(it.ref);
    return { ...day, days: [...dayLists[i]] };
  });
  if (answers.cardioDays.length) plans.push(cardioPlan(answers));
  return {
    answers, splitLabel: split ? split.label : 'Nur Ausdauer', plans, weekly: weeklyMuscleSets(plans),
    cardioMinutes: answers.minutes * answers.cardioDays.length, missing: [...new Set(plans.flatMap((p) => p.missing))]
  };
}

/** Freier Name, falls „Ganzkörper A“ schon existiert: „Ganzkörper A (2)“. */
export function uniqueName(name, taken) {
  const low = new Set([...taken].map((n) => n.toLowerCase()));
  if (!low.has(name.toLowerCase())) return name;
  for (let i = 2; i < 100; i++) { const n = `${name} (${i})`; if (!low.has(n.toLowerCase())) return n; }
  return `${name} ${Date.now()}`;
}

// Muster-Namen für den Hinweis, wenn für ein Muster keine Übung zu den Geräten passt.
export const SLOT_LABELS = {
  squat: 'Kniebeuge-Muster', lunge: 'Ausfallschritt-Muster', hinge: 'Hüftstreckung', hpush: 'Drücken waagerecht', ipush: 'Schrägdrücken',
  vpush: 'Drücken über Kopf', hpull: 'Rudern', vpull: 'Ziehen von oben', legcurl: 'Beinbeuger', legext: 'Beinstrecker',
  lateral: 'Seitheben', reardelt: 'Hintere Schulter', biceps: 'Bizeps', triceps: 'Trizeps', calves: 'Waden', core: 'Rumpf'
};

// v3.4.0: Was für ein Muster ohne passende Übung fehlt (Hinweis im Assistenten).
export const SLOT_NEEDS = {
  hpull: 'Band oder Stange', vpull: 'Stange oder Kabel', lateral: 'Hanteln oder Band',
  legcurl: 'Maschine', legext: 'Maschine', calves: 'Stufe oder Maschine'
};

// Alle Pool-Refs, die der Assistent nutzen kann (für Tests: müssen im Pool existieren).
export const ALL_REFS = [...new Set(Object.values(SLOTS).flatMap((s) => s.refs))];
export const POOL_REFS = new Set(POOL.map((p) => p.ref));
