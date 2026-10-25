// Datenmodell (Schema v2): Konstanten, Fabriken, Validierung und reine Berechnungen.
// Kein Zugriff auf localStorage oder DOM – dadurch in Node testbar.
//
// Grundsätze (Decisions in Drive):
// - Gewichtshistorie hängt an der konkreten Übung, nicht am Plan. Ein Tausch im Training
//   loggt also die tatsächlich gemachte Übung.
// - Gruppen (= Bewegungsmuster, z. B. "Beine Grundübung") sind eine eigene Sammlung;
//   Übungen verweisen per groupIds darauf.
// - Satztypen: warmup (geloggt, zählt nicht für Volumen/Fortschritt), work, drop
//   (ein harter Satz; alle Stufen zählen ins Volumen).
import { uuid, nowISO } from './util.js';
import { ITEM_BY_REF, TEMPLATES, PHASES } from './routine-data.js';
import { chainGroups } from './superset.js';

export const SCHEMA_VERSION = 2;

export const EXERCISE_KINDS = ['strength', 'bodyweight', 'cardio'];
// 'restpause' seit v1.2 (ohne Schemaänderung: alte Daten bleiben gültig). Stufen-Regeln: js/sets.js.
export const SET_TYPES = ['warmup', 'work', 'drop', 'restpause'];
const STAGED = ['drop', 'restpause'];

// Satz-Markierungen (UI seit v1.2). Eigene Markierungen sind als "custom:<Text>" erlaubt.
// "Rest-Pause" ist seit v1.2 ein Satztyp statt einer Markierung (vorher nie in der UI, daher keine Altdaten).
export const SET_TAGS = {
  'stretch-hold': 'Stretch halten',
  partials: 'Teilwiederholungen',
  failure: 'Bis Muskelversagen'
};

// Muskel-Taxonomie. Bewusst grob (19 Einträge), damit Zuordnung und Muskelkarte handhabbar bleiben.
// Abgrenzungen (Recherche 2026-10-13): biceps = Armbeuger (Biceps brachii + Brachialis);
// glutes = Gluteus maximus; abductors = Gluteus medius/minimus + TFL; hip-flexors seit v0.3.
export const MUSCLES = {
  chest: 'Brust',
  'front-delts': 'Vordere Schulter',
  'side-delts': 'Seitliche Schulter',
  'rear-delts': 'Hintere Schulter',
  lats: 'Latissimus',
  'upper-back': 'Oberer Rücken / Trapez',
  'lower-back': 'Unterer Rücken',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  forearms: 'Unterarme',
  abs: 'Bauch',
  obliques: 'Seitliche Bauchmuskeln',
  glutes: 'Gesäß',
  quads: 'Quadrizeps',
  hamstrings: 'Beinbeuger',
  adductors: 'Adduktoren',
  abductors: 'Abduktoren',
  calves: 'Waden',
  'hip-flexors': 'Hüftbeuger'
};

export const VERIFICATION = ['verified', 'training-knowledge', 'user'];

export const DEFAULT_SETTINGS = {
  focus: ['strength'],
  weightUnit: 'kg',
  restSeconds: 120,
  figure: 'male', // v1.4: Figur für Muskelkarte und Piktogramme ('male' | 'female'); Logik ist gleich
  keepAwake: true, // v2.26.0 (A1): Bildschirm während eines laufenden Trainings anlassen (falls das Gerät es kann)
  plateMath: true, // v2.26.0 (A4): Scheiben pro Seite bei Langhantel-Übungen anzeigen
  barKg: 20, // v2.26.0 (A4): Standard-Stangengewicht; pro Übung überschreibbar (exercise.barKg)
  persistAsked: false, // v2.26.0 (A2): einmal nach dauerhaftem Speicher gefragt (nach dem ersten beendeten Training)
  lightWeek: null, // v2.30.0 (B3): Montag der „leichten Woche“ als "JJJJ-MM-TT" oder null
  hints: true, // v2.34.0: kurze Erklärzeilen auf den Bildschirmen (Einstellungen → Anzeige)
  onboarded: false, // v2.34.0: Einführung gesehen oder ausgeblendet
  equipment: null // v2.31.0: „Mein Equipment“ als Liste von Geräte-Schlüsseln (siehe pool.js GEAR) oder null = alles zeigen
};

// v2.26.0 (A4): Grenzen für das Stangengewicht (kg).
export const BAR_KG_MIN = 0;
export const BAR_KG_MAX = 50;

export const FIGURES = ['male', 'female'];

// Cardio-Intensität (v1.4, optional, Selbsteinschätzung): keine Kalorien, keine Zielwerte.
export const INTENSITIES = { easy: 'Locker', moderate: 'Mittel', hard: 'Hart' };

// Untergrenze für Zusatzgewicht bei Körpergewichtsübungen (negativ = Unterstützung, z. B. Band oder Maschine).
export const MIN_ADDED_KG = -300;

// ---------- Fabriken ----------

export function createExercise(fields = {}) {
  const now = nowISO();
  return {
    id: uuid(),
    name: '',
    kind: 'strength',
    muscles: { primary: [], secondary: [] },
    groupIds: [],
    defaultWorkSets: 3,
    restSeconds: null, // Pause zwischen Sätzen in s; null = Standard aus den Einstellungen (seit v0.4)
    note: '',
    source: { origin: 'custom', ref: null, verification: 'user', checkedAt: null },
    archived: false,
    createdAt: now,
    updatedAt: now,
    ...fields
  };
}

export function createGroup(fields = {}) {
  const now = nowISO();
  return { id: uuid(), name: '', createdAt: now, updatedAt: now, ...fields };
}

export function createPlanItem(exerciseId, fields = {}) {
  return { id: uuid(), exerciseId, groupId: null, targetSets: null, ...fields };
}

export function createPlan(fields = {}) {
  const now = nowISO();
  return { id: uuid(), name: '', items: [], archived: false, createdAt: now, updatedAt: now, ...fields };
}

export function createSet(fields = {}) {
  return {
    id: uuid(),
    type: 'work',
    weightKg: null,
    reps: null,
    durationSec: null,
    distanceM: null,
    drops: [],
    tags: [],
    completedAt: null,
    ...fields
  };
}

export function createEntry(exerciseId, fields = {}) {
  return { id: uuid(), exerciseId, plannedExerciseId: null, groupId: null, sets: [], ...fields };
}

export function createSession(fields = {}) {
  const now = nowISO();
  // restTimer (seit v0.5, optional): { entryId, startedAt, durationSec } oder null – laufende Satzpause
  return { id: uuid(), planId: null, startedAt: now, endedAt: null, note: '', entries: [], restTimer: null, createdAt: now, updatedAt: now, ...fields };
}

// ---------- Validierung ----------
// Jede Funktion gibt eine Liste von Fehlertexten zurück (leer = gültig).

const isStr = (v) => typeof v === 'string';
const isId = (v) => isStr(v) && v.length > 0;
const isISO = (v) => isStr(v) && !Number.isNaN(Date.parse(v));
const isNullableNum = (v, { int = false } = {}) =>
  v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && (!int || Number.isInteger(v)));
const isDateKey = (v) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
// v2.30.0 (B2, optional): Wiederholungsbereich { min, max } mit 1 ≤ min ≤ max ≤ REP_RANGE_MAX.
export const REP_RANGE_MAX = 50;
const isRepRange = (v) => v === undefined || v === null || (typeof v === 'object' && Number.isInteger(v.min) && Number.isInteger(v.max) && v.min >= 1 && v.min <= v.max && v.max <= REP_RANGE_MAX);
const isStrArray = (v) => Array.isArray(v) && v.every(isStr);
// Optionale Pausenzeit (v1.4 an Planeintrag und Trainingseintrag): fehlt, null oder 1–3600 s.
const isRest = (v) => v === undefined || v === null || (Number.isInteger(v) && v > 0 && v <= 3600);

export function validateExercise(e) {
  const err = [];
  if (!e || typeof e !== 'object') return ['Übung ist kein Objekt.'];
  if (!isId(e.id)) err.push('Übung ohne id.');
  if (!isStr(e.name) || !e.name.trim()) err.push(`Übung ${e.id}: Name fehlt.`);
  if (!EXERCISE_KINDS.includes(e.kind)) err.push(`Übung ${e.id}: unbekannter Typ "${e.kind}".`);
  if (!e.muscles || !isStrArray(e.muscles.primary) || !isStrArray(e.muscles.secondary)) err.push(`Übung ${e.id}: Muskelgruppen fehlen.`);
  else {
    const unknown = [...e.muscles.primary, ...e.muscles.secondary].filter((m) => !(m in MUSCLES));
    if (unknown.length) err.push(`Übung ${e.id}: unbekannte Muskelgruppe(n) ${unknown.join(', ')}.`);
  }
  if (!isStrArray(e.groupIds)) err.push(`Übung ${e.id}: groupIds ist keine Liste.`);
  if (!Number.isInteger(e.defaultWorkSets) || e.defaultWorkSets < 0) err.push(`Übung ${e.id}: defaultWorkSets ungültig.`);
  if (!isStr(e.note)) err.push(`Übung ${e.id}: Notiz ungültig.`);
  if (e.restSeconds !== undefined && e.restSeconds !== null && !(Number.isInteger(e.restSeconds) && e.restSeconds > 0 && e.restSeconds <= 3600)) err.push(`Übung ${e.id}: Pausenzeit ungültig.`);
  // v2.26.0: optionale Felder (fehlen in älteren Daten): eigenes Stangengewicht, Wiederholungen je Seite.
  if (e.barKg !== undefined && e.barKg !== null && !(typeof e.barKg === 'number' && Number.isFinite(e.barKg) && e.barKg >= BAR_KG_MIN && e.barKg <= BAR_KG_MAX)) err.push(`Übung ${e.id}: Stangengewicht ungültig.`);
  if (e.perSide !== undefined && typeof e.perSide !== 'boolean') err.push(`Übung ${e.id}: „je Seite“ ungültig.`);
  if (!e.source || !['builtin', 'custom'].includes(e.source.origin) || !VERIFICATION.includes(e.source.verification)) {
    err.push(`Übung ${e.id}: Quelle ungültig.`);
  }
  if (typeof e.archived !== 'boolean') err.push(`Übung ${e.id}: archived ungültig.`);
  if (!isISO(e.createdAt) || !isISO(e.updatedAt)) err.push(`Übung ${e.id}: Zeitstempel ungültig.`);
  return err;
}

export function validateGroup(g) {
  const err = [];
  if (!g || !isId(g.id)) return ['Gruppe ohne id.'];
  if (!isStr(g.name) || !g.name.trim()) err.push(`Gruppe ${g.id}: Name fehlt.`);
  if (!isISO(g.createdAt) || !isISO(g.updatedAt)) err.push(`Gruppe ${g.id}: Zeitstempel ungültig.`);
  return err;
}

export function validatePlan(p) {
  const err = [];
  if (!p || !isId(p.id)) return ['Plan ohne id.'];
  if (!isStr(p.name) || !p.name.trim()) err.push(`Plan ${p.id}: Name fehlt.`);
  if (!Array.isArray(p.items)) err.push(`Plan ${p.id}: items ist keine Liste.`);
  else {
    for (const it of p.items) {
      if (!it || !isId(it.id) || !isId(it.exerciseId)) { err.push(`Plan ${p.id}: Eintrag ohne id/exerciseId.`); continue; }
      if (it.groupId !== null && !isId(it.groupId)) err.push(`Plan ${p.id}: groupId ungültig.`);
      if (it.targetSets !== null && (!Number.isInteger(it.targetSets) || it.targetSets < 0)) err.push(`Plan ${p.id}: targetSets ungültig.`);
      if (!isRest(it.restSeconds)) err.push(`Plan ${p.id}: Pausenzeit ungültig.`);
      if (!isRepRange(it.repRange)) err.push(`Plan ${p.id}: Wiederholungsbereich ungültig.`);
      if (it.supersetNext !== undefined && typeof it.supersetNext !== 'boolean') err.push(`Plan ${p.id}: Supersatz-Kopplung ungültig.`);
    }
  }
  if (typeof p.archived !== 'boolean') err.push(`Plan ${p.id}: archived ungültig.`);
  // v2.3.0 (optional, ohne Schemaänderung): Aufwärm-/Cool-down-Routine des Plans (eigene id oder Vorlage "tpl:…").
  for (const k of ['warmupRoutineId', 'cooldownRoutineId']) if (p[k] !== undefined && p[k] !== null && !isId(p[k])) err.push(`Plan ${p.id}: ${k} ungültig.`);
  // v2.29.0 (optional, ohne Schemaänderung): Trainingstage (Mo = 0 … So = 6), übersprungene Wochen
  // (Montag als "JJJJ-MM-TT") und der zuletzt bestätigte Hinweis-Tag. Logik: js/schedule.js.
  if (p.days !== undefined && !(Array.isArray(p.days) && p.days.length <= 7 && new Set(p.days).size === p.days.length && p.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))) err.push(`Plan ${p.id}: Trainingstage ungültig.`);
  if (p.skipWeeks !== undefined && !(Array.isArray(p.skipWeeks) && p.skipWeeks.every(isDateKey))) err.push(`Plan ${p.id}: übersprungene Wochen ungültig.`);
  if (p.missedAck !== undefined && p.missedAck !== null && !isDateKey(p.missedAck)) err.push(`Plan ${p.id}: Hinweis-Datum ungültig.`);
  if (!isISO(p.createdAt) || !isISO(p.updatedAt)) err.push(`Plan ${p.id}: Zeitstempel ungültig.`);
  return err;
}

export function validateSet(s, ctx = '') {
  const err = [];
  if (!s || !isId(s.id)) return [`${ctx}Satz ohne id.`];
  if (!SET_TYPES.includes(s.type)) err.push(`${ctx}Satz ${s.id}: unbekannter Typ "${s.type}".`);
  // Negativ nur als Unterstützung bei Körpergewichtsübungen – geprüft in validateData (braucht den Übungstyp).
  if (!(s.weightKg === null || (typeof s.weightKg === 'number' && Number.isFinite(s.weightKg) && s.weightKg >= MIN_ADDED_KG))) err.push(`${ctx}Satz ${s.id}: Gewicht ungültig.`);
  if (!isNullableNum(s.reps, { int: true })) err.push(`${ctx}Satz ${s.id}: Wiederholungen ungültig.`);
  if (!isNullableNum(s.durationSec)) err.push(`${ctx}Satz ${s.id}: Dauer ungültig.`);
  if (!isNullableNum(s.distanceM)) err.push(`${ctx}Satz ${s.id}: Distanz ungültig.`);
  if (!Array.isArray(s.drops)) err.push(`${ctx}Satz ${s.id}: drops ist keine Liste.`);
  else {
    if (!STAGED.includes(s.type) && s.drops.length) err.push(`${ctx}Satz ${s.id}: Stufen nur bei Typ "drop" oder "restpause".`);
    for (const d of s.drops) {
      if (!d || !isNullableNum(d.weightKg) || !isNullableNum(d.reps, { int: true })) err.push(`${ctx}Satz ${s.id}: Drop-Stufe ungültig.`);
    }
  }
  if (!isStrArray(s.tags)) err.push(`${ctx}Satz ${s.id}: tags ungültig.`);
  else {
    const unknown = s.tags.filter((t) => !(t in SET_TAGS) && !/^custom:.+/.test(t));
    if (unknown.length) err.push(`${ctx}Satz ${s.id}: unbekannte Markierung(en) ${unknown.join(', ')}.`);
  }
  if (s.completedAt !== null && !isISO(s.completedAt)) err.push(`${ctx}Satz ${s.id}: completedAt ungültig.`);
  if (s.intensity !== undefined && s.intensity !== null && !(s.intensity in INTENSITIES)) err.push(`${ctx}Satz ${s.id}: Intensität ungültig.`);
  return err;
}

export function validateSession(x) {
  const err = [];
  if (!x || !isId(x.id)) return ['Training ohne id.'];
  if (x.planId !== null && !isId(x.planId)) err.push(`Training ${x.id}: planId ungültig.`);
  if (!isISO(x.startedAt)) err.push(`Training ${x.id}: startedAt ungültig.`);
  if (x.endedAt !== null && !isISO(x.endedAt)) err.push(`Training ${x.id}: endedAt ungültig.`);
  if (!isStr(x.note)) err.push(`Training ${x.id}: Notiz ungültig.`);
  if (x.restTimer !== undefined && x.restTimer !== null) {
    const t = x.restTimer;
    if (typeof t !== 'object' || !isId(t.entryId) || !isISO(t.startedAt) || !(Number.isInteger(t.durationSec) && t.durationSec > 0)) err.push(`Training ${x.id}: Pausen-Timer ungültig.`);
  }
  if (!Array.isArray(x.entries)) err.push(`Training ${x.id}: entries ist keine Liste.`);
  else {
    for (const en of x.entries) {
      if (!en || !isId(en.id) || !isId(en.exerciseId)) { err.push(`Training ${x.id}: Eintrag ohne id/exerciseId.`); continue; }
      if (en.plannedExerciseId !== null && !isId(en.plannedExerciseId)) err.push(`Training ${x.id}: plannedExerciseId ungültig.`);
      // v2.29.0 (optional): Platz im Plan, aus dem der Eintrag stammt (für „Änderungen übernehmen“).
      if (en.planItemId !== undefined && en.planItemId !== null && !isId(en.planItemId)) err.push(`Training ${x.id}: planItemId ungültig.`);
      if (en.groupId !== null && !isId(en.groupId)) err.push(`Training ${x.id}: groupId ungültig.`);
      if (en.targetSets !== undefined && en.targetSets !== null && !(Number.isInteger(en.targetSets) && en.targetSets > 0)) err.push(`Training ${x.id}: targetSets ungültig.`);
      if (!isRest(en.restSeconds)) err.push(`Training ${x.id}: Pausenzeit ungültig.`);
      if (!isRepRange(en.repRange)) err.push(`Training ${x.id}: Wiederholungsbereich ungültig.`);
      if (en.ssGroup !== undefined && en.ssGroup !== null && !isId(en.ssGroup)) err.push(`Training ${x.id}: Supersatz-Gruppe ungültig.`);
      // v2.4.0 (optional): Bewertung der Übung und Entscheidung über den Vorschlag.
      if (en.rating !== undefined && !['easy', 'right', 'hard', 'none'].includes(en.rating)) err.push(`Training ${x.id}: Bewertung ungültig.`);
      if (en.suggestion !== undefined && !['accepted', 'declined'].includes(en.suggestion)) err.push(`Training ${x.id}: Vorschlag-Status ungültig.`);
      if (!Array.isArray(en.sets)) err.push(`Training ${x.id}: sets ist keine Liste.`);
      else for (const s of en.sets) err.push(...validateSet(s, `Training ${x.id}: `));
    }
  }
  // v2.30.0 (optional): Training der „leichten Woche“ (B3) – zählt nicht als Ausgangspunkt für Vorbelegung und Vorschläge.
  if (x.light !== undefined && typeof x.light !== 'boolean') err.push(`Training ${x.id}: light ungültig.`);
  // v2.4.0 (optional): Wiedereinstieg nach einer Pause – Tage seit dem letzten Training und Reduktion in %.
  if (x.returnAdjust !== undefined && x.returnAdjust !== null) {
    const r = x.returnAdjust;
    if (typeof r !== 'object' || !Number.isInteger(r.days) || r.days < 0 || !(typeof r.pct === 'number' && r.pct > 0 && r.pct < 100)) err.push(`Training ${x.id}: Wiedereinstieg ungültig.`);
  }
  // v2.3.0 (optional): erledigte Routinen dieses Trainings – nur Protokoll, zählt nirgends mit.
  if (x.routines !== undefined) {
    if (!Array.isArray(x.routines)) err.push(`Training ${x.id}: routines ist keine Liste.`);
    else for (const r of x.routines) {
      if (!r || !isId(r.routineId) || !isStr(r.name) || !(r.phase in PHASES) || !isISO(r.startedAt) || !isISO(r.endedAt)
        || !Number.isInteger(r.done) || !Number.isInteger(r.total) || r.done < 0 || r.done > r.total) err.push(`Training ${x.id}: Routine-Eintrag ungültig.`);
    }
  }
  if (!isISO(x.createdAt) || !isISO(x.updatedAt)) err.push(`Training ${x.id}: Zeitstempel ungültig.`);
  return err;
}

// v2.3.0: eigene Routine (Aufwärmen/Cool-down). Übungen kommen aus dem Katalog (js/routine-data.js).
export const ROUTINE_LIMITS = { seconds: [5, 3600], reps: [1, 100], rounds: [1, 10] };
const inRange = (v, [lo, hi]) => Number.isInteger(v) && v >= lo && v <= hi;
export function validateRoutine(r) {
  const err = [];
  if (!r || !isId(r.id) || r.id.startsWith('tpl:')) return ['Routine ohne gültige id.'];
  if (!isStr(r.name) || !r.name.trim() || r.name.trim().length > 60) err.push(`Routine ${r.id}: Name fehlt oder zu lang.`);
  if (!(r.phase in PHASES)) err.push(`Routine ${r.id}: Phase ungültig.`);
  if (!Array.isArray(r.items)) err.push(`Routine ${r.id}: items ist keine Liste.`);
  else for (const it of r.items) {
    if (!it || !isId(it.id) || !ITEM_BY_REF[it.ref]) { err.push(`Routine ${r.id}: unbekannte Übung.`); continue; }
    if (it.seconds !== null && !inRange(it.seconds, ROUTINE_LIMITS.seconds)) err.push(`Routine ${r.id}: Dauer ungültig.`);
    if (it.reps !== null && !inRange(it.reps, ROUTINE_LIMITS.reps)) err.push(`Routine ${r.id}: Wiederholungen ungültig.`);
    if (!inRange(it.rounds, ROUTINE_LIMITS.rounds)) err.push(`Routine ${r.id}: Runden ungültig.`);
  }
  if (!isISO(r.createdAt) || !isISO(r.updatedAt)) err.push(`Routine ${r.id}: Zeitstempel ungültig.`);
  return err;
}

// Prüft alle Daten inkl. Verweisen zwischen den Sammlungen.
// Verweise auf gelöschte Übungen in alten Trainings sind Fehler: Übungen werden archiviert, nicht gelöscht.
export function validateData(data) {
  const err = [];
  const byId = (list) => new Set((list || []).map((x) => x && x.id));
  for (const e of data.exercises) err.push(...validateExercise(e));
  for (const g of data.groups) err.push(...validateGroup(g));
  for (const p of data.plans) err.push(...validatePlan(p));
  for (const s of data.sessions) err.push(...validateSession(s));
  for (const r of data.routines || []) err.push(...validateRoutine(r));
  if (err.length) return err;

  const ex = byId(data.exercises);
  const gr = byId(data.groups);
  const pl = byId(data.plans);
  for (const e of data.exercises) for (const g of e.groupIds) if (!gr.has(g)) err.push(`Übung ${e.id}: Gruppe ${g} existiert nicht.`);
  const ro = byId(data.routines);
  const tpl = new Set(TEMPLATES.map((t) => t.id));
  for (const p of data.plans) {
    for (const k of ['warmupRoutineId', 'cooldownRoutineId']) if (p[k] && !(ro.has(p[k]) || tpl.has(p[k]))) err.push(`Plan ${p.id}: Routine ${p[k]} existiert nicht.`);
  }
  for (const p of data.plans) {
    for (const it of p.items) {
      if (!ex.has(it.exerciseId)) err.push(`Plan ${p.id}: Übung ${it.exerciseId} existiert nicht.`);
      if (it.groupId && !gr.has(it.groupId)) err.push(`Plan ${p.id}: Gruppe ${it.groupId} existiert nicht.`);
    }
  }
  const kindOf = Object.fromEntries(data.exercises.map((e) => [e.id, e.kind]));
  for (const s of data.sessions) {
    if (s.planId && !pl.has(s.planId)) err.push(`Training ${s.id}: Plan ${s.planId} existiert nicht.`);
    for (const en of s.entries) {
      if (!ex.has(en.exerciseId)) err.push(`Training ${s.id}: Übung ${en.exerciseId} existiert nicht.`);
      if (kindOf[en.exerciseId] !== 'bodyweight' && en.sets.some((x) => x.weightKg < 0 || x.drops.some((d) => d.weightKg < 0))) err.push(`Training ${s.id}: negatives Gewicht nur bei Körpergewichtsübungen.`);
      if (en.plannedExerciseId && !ex.has(en.plannedExerciseId)) err.push(`Training ${s.id}: geplante Übung existiert nicht.`);
    }
  }
  return err;
}

// ---------- Berechnungen ----------
// Volumen = Gewicht × Wiederholungen (kg·Wdh.), nur für Typ "strength".
// Bei Körpergewichtsübungen ist das Körpergewicht unbekannt (wird bewusst nicht gespeichert),
// daher kein Volumen in kg, sondern nur Wiederholungen. Aufwärmsätze zählen nie.

const counts = (s) => s.completedAt !== null && s.type !== 'warmup';

export function setVolume(set, kind = 'strength') {
  if (kind !== 'strength' || set.type === 'warmup') return 0;
  const stage = (w, r) => (w || 0) * (r || 0);
  let v = stage(set.weightKg, set.reps);
  if (STAGED.includes(set.type)) for (const d of set.drops) v += stage(d.weightKg, d.reps);
  return v;
}

export function setReps(set) {
  if (set.type === 'warmup') return 0;
  let r = set.reps || 0;
  if (STAGED.includes(set.type)) for (const d of set.drops) r += d.reps || 0;
  return r;
}

// Harte Sätze: abgeschlossene Arbeits-, Drop- und Rest-Pause-Sätze; jeder zählt als ein Satz (Konvention).
// Cardio-Einheiten sind keine harten Sätze (v1.4).
export function hardSets(entry, kind = 'strength') {
  return kind === 'cardio' ? 0 : entry.sets.filter(counts).length;
}

export function entryVolume(entry, kind = 'strength') {
  return entry.sets.filter(counts).reduce((sum, s) => sum + setVolume(s, kind), 0);
}

export function sessionSummary(session, exercisesById) {
  let volume = 0, sets = 0, reps = 0;
  for (const en of session.entries) {
    const kind = exercisesById[en.exerciseId]?.kind || 'strength';
    volume += entryVolume(en, kind);
    sets += hardSets(en, kind);
    reps += en.sets.filter(counts).reduce((r, s) => r + setReps(s), 0);
  }
  return { volume, hardSets: sets, reps };
}

function sessionTime(s) {
  return Date.parse(s.startedAt);
}

// Letzte Ausführung einer Übung (für die Vorbelegung beim Loggen).
// Gibt { sessionId, date, sets } mit den abgeschlossenen Sätzen zurück oder null.
// Kommt die Übung in einem Training mehrfach vor, zählt der letzte Eintrag mit erledigten Sätzen
// (Entscheidung v1.1: der spätere Durchgang ist der aktuellere).
// skipLight (v2.30.0): Trainings der leichten Woche überspringen – sie sind kein Ausgangspunkt fürs nächste Mal.
export function lastPerformance(exerciseId, sessions, { beforeSessionId = null, skipLight = false } = {}) {
  const sorted = [...sessions].sort((a, b) => sessionTime(b) - sessionTime(a));
  for (const s of sorted) {
    if (s.id === beforeSessionId) continue;
    if (skipLight && s.light === true) continue;
    for (const en of [...s.entries].reverse()) {
      if (en.exerciseId !== exerciseId) continue;
      const done = en.sets.filter((x) => x.completedAt !== null);
      if (done.length) return { sessionId: s.id, date: s.startedAt, sets: done };
    }
  }
  return null;
}

// Tippfehler-Hinweis (v1.1, nicht blockierend): Gewicht ist mehr als TYPO_FACTOR × das bisher
// schwerste erledigte Gewicht dieser Übung in abgeschlossenen Trainings (alle Satztypen).
// Die Schwelle ist eine Design-Entscheidung ohne Beleg; ohne Historie gibt es keinen Hinweis.
export const TYPO_FACTOR = 2;

export function bestWeight(exerciseId, sessions, { excludeSessionId = null } = {}) {
  let best = null;
  for (const s of sessions) {
    if (s.endedAt === null || s.id === excludeSessionId) continue;
    for (const en of s.entries) {
      if (en.exerciseId !== exerciseId) continue;
      for (const x of en.sets) {
        if (x.completedAt === null || !(x.weightKg > 0)) continue;
        if (best === null || x.weightKg > best) best = x.weightKg;
      }
    }
  }
  return best;
}

export function weightWarning(exerciseId, weightKg, sessions, opts = {}) {
  if (!(weightKg > 0)) return null;
  const best = bestWeight(exerciseId, sessions, opts);
  return best !== null && weightKg > best * TYPO_FACTOR ? { best } : null;
}

// Neue Sätze für ein Training vorbelegen: Werte vom letzten Mal, sonst leere Arbeitssätze.
export function prefillSets(exercise, sessions, targetSets = null) {
  const last = lastPerformance(exercise.id, sessions, { skipLight: true });
  const n = targetSets ?? exercise.defaultWorkSets;
  if (last) {
    return last.sets.map((s) => createSet({
      type: s.type,
      weightKg: s.weightKg,
      reps: s.reps,
      durationSec: s.durationSec,
      distanceM: s.distanceM,
      ...(s.intensity ? { intensity: s.intensity } : {}),
      drops: s.drops.map((d) => ({ ...d })),
      tags: [...s.tags]
    }));
  }
  return Array.from({ length: n }, () => createSet());
}

// Aufwärm-Hinweis: true, wenn eine primäre Muskelgruppe dieser Übung im laufenden Training
// vorher noch nicht primär oder sekundär belastet wurde (Reihenfolge = Reihenfolge der Einträge).
export function needsWarmupHint(session, entryIndex, exercisesById) {
  const current = exercisesById[session.entries[entryIndex]?.exerciseId];
  if (!current || current.kind === 'cardio') return false;
  const hit = new Set();
  for (const en of session.entries.slice(0, entryIndex)) {
    const ex = exercisesById[en.exerciseId];
    if (!ex) continue;
    if (!en.sets.some((s) => s.completedAt !== null)) continue;
    for (const m of [...ex.muscles.primary, ...ex.muscles.secondary]) hit.add(m);
  }
  return current.muscles.primary.some((m) => !hit.has(m));
}

// Verlauf einer Übung für Tabelle/Diagramm (v1.0): ein Eintrag pro Training, älteste zuerst.
export function exerciseHistory(exerciseId, sessions, kind = 'strength') {
  const rows = [];
  for (const s of sessions) {
    for (const en of s.entries) {
      if (en.exerciseId !== exerciseId) continue;
      const done = en.sets.filter(counts);
      if (!done.length) continue;
      let top = null;
      for (const x of done) {
        if (top === null || (x.weightKg || 0) > (top.weightKg || 0) || ((x.weightKg || 0) === (top.weightKg || 0) && (x.reps || 0) > (top.reps || 0))) top = x;
      }
      rows.push({
        sessionId: s.id,
        date: s.startedAt,
        sets: done.map((x) => ({ type: x.type, weightKg: x.weightKg, reps: x.reps, drops: x.drops, tags: x.tags })),
        topSet: { weightKg: top.weightKg, reps: top.reps },
        hardSets: done.length,
        volume: done.reduce((v, x) => v + setVolume(x, kind), 0)
      });
    }
  }
  return rows.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

// Tausch im Training: ersetzt die Übung eines Eintrags durch eine andere (nur für dieses Training).
// Die ursprünglich geplante Übung bleibt in plannedExerciseId erhalten; Tausch zurück auf die geplante
// setzt plannedExerciseId wieder auf null (v1.3). Sätze werden neu vorbelegt – vom letzten Mal der neuen
// Übung, ohne Historie mit der Satzzahl aus dem Plan (entry.targetSets), sonst deren Standard.
// Nur für Einträge ohne erledigte Sätze gedacht; die Prüfung macht session.swapEntry.
export function swapEntryExercise(entry, newExercise, sessions) {
  const planned = entry.plannedExerciseId ?? entry.exerciseId;
  const { rating, suggestion, ...rest } = entry; // v2.4.0: Bewertung und Vorschlag gehören zur alten Übung
  return {
    ...rest,
    plannedExerciseId: newExercise.id === planned ? null : planned,
    exerciseId: newExercise.id,
    sets: prefillSets(newExercise, sessions, entry.targetSets ?? null)
  };
}

// Training aus einem Plan starten.
export function startSessionFromPlan(plan, exercisesById, sessions) {
  const session = createSession({ planId: plan.id });
  const items = plan.items.filter((it) => exercisesById[it.exerciseId]);
  const groups = chainGroups(items, uuid); // v2.30.0 (B1): gekoppelte Einträge → gemeinsame ssGroup
  session.entries = items
    .map((it) => createEntry(it.exerciseId, {
      ...(groups.has(it.id) ? { ssGroup: groups.get(it.id) } : {}),
      planItemId: it.id, // v2.29.0: Plan-Platz, bleibt auch nach einem Tausch
      groupId: it.groupId,
      targetSets: it.targetSets ?? null, // v1.3: für die Vorbelegung nach einem Tausch
      restSeconds: it.restSeconds ?? null, // v1.4: Pause nur in diesem Plan (gilt für den Platz, auch nach Tausch)
      ...(it.repRange ? { repRange: { ...it.repRange } } : {}), // v2.30.0: Bereich gilt für den Platz, auch nach Tausch
      sets: prefillSets(exercisesById[it.exerciseId], sessions, it.targetSets)
    }));
  return session;
}

// ---------- Satz abhaken (v1.4, Entscheidung 6 A) ----------
// Ein Satz braucht Werte, bevor er als erledigt gilt: Kraft = Gewicht und Wdh. (≥ 1),
// Körpergewicht = Wdh. (Zusatzgewicht optional), Cardio = Dauer oder Strecke.
// Gibt einen Fehlertext zurück oder null.
export function completionError(values, kind = 'strength') {
  if (kind === 'cardio') return values.durationSec > 0 || values.distanceM > 0 ? null : 'Erst Dauer oder Strecke eintragen.';
  if (!(Number.isInteger(values.reps) && values.reps >= 1)) return kind === 'bodyweight' ? 'Erst Wiederholungen eintragen.' : 'Erst Gewicht und Wdh. eintragen.';
  if (kind === 'strength' && (values.weightKg === null || values.weightKg === undefined)) return 'Erst Gewicht und Wdh. eintragen.';
  return null;
}

// Platzhalter (graue Werte) für einen Satz ohne eigene Werte: der vorherige Satz gleichen Typs in diesem
// Eintrag, sonst der Satz an gleicher Position bei der letzten Ausführung. Gibt { weightKg, reps } oder null.
export function placeholderFor(entry, setIndex, last) {
  const set = entry.sets[setIndex];
  if (!set) return null;
  const same = (x) => (x.type === 'warmup') === (set.type === 'warmup');
  const prev = entry.sets.slice(0, setIndex).reverse().find((x) => same(x) && x.reps !== null);
  if (prev) return { weightKg: prev.weightKg, reps: prev.reps };
  if (last) {
    const pos = entry.sets.slice(0, setIndex).filter(same).length;
    const ref = last.sets.filter(same)[pos];
    if (ref && ref.reps !== null) return { weightKg: ref.weightKg, reps: ref.reps };
  }
  return null;
}
