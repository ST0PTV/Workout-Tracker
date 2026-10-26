// Routinen (v2.3.0) ohne DOM: Vorlagen + eigene Routinen, Zeitschätzung, Ablauf-Schritte,
// Verknüpfung mit Plänen und Protokoll im Training. Routinen zählen nie als Sätze/Volumen/Muskelkarte.
import * as store from './store.js';
import { uuid, nowISO } from './util.js';
import { validateRoutine, validatePlan, validateSession, ROUTINE_LIMITS } from './model.js';
import { ROUTINE_ITEMS, ITEM_BY_REF, TEMPLATES, PHASES } from './routine-data.js';

// Konventionen für die Zeitschätzung (keine Messwerte): Sekunden pro Wiederholung und Wechselzeit pro Übung.
export const REP_SECONDS = 3;
export const TRANSITION_SEC = 10;

const clone = (x) => JSON.parse(JSON.stringify(x));

// Katalog-Eintrag + gespeicherte Dosis → vollständige Übung für Anzeige und Ablauf.
export function resolveItem(ri) {
  const base = ITEM_BY_REF[ri?.ref];
  if (!base) return null;
  const dose = { ...base.dose };
  if (dose.mode !== 'reps' && Number.isInteger(ri.seconds)) dose.seconds = ri.seconds;
  if (dose.mode === 'reps' && Number.isInteger(ri.reps)) dose.reps = ri.reps;
  if (dose.mode === 'hold' && Number.isInteger(ri.rounds)) dose.rounds = ri.rounds;
  return { id: ri.id || null, ref: base.ref, name: base.name, type: base.type, cue: base.cue, equipment: base.equipment, muscles: base.muscles, dose };
}

export function itemSeconds(dose) {
  const sides = dose.perSide ? 2 : 1;
  if (dose.mode === 'time') return dose.seconds;
  if (dose.mode === 'hold') return dose.seconds * dose.rounds * sides;
  return dose.reps * sides * REP_SECONDS;
}

export function estimateSeconds(routine) {
  const items = (routine?.items || []).map(resolveItem).filter(Boolean);
  return items.reduce((n, x) => n + itemSeconds(x.dose) + TRANSITION_SEC, 0);
}

// v3.5.0: Gesamtdauer einer Routine ändern – Wiederholungen und Zeiten anteilig skalieren (Wechselzeiten bleiben),
// gerundet auf die Stufen des Editors und innerhalb der Grenzen. Runden bleiben gleich.
const SCALE_STEP = { reps: 1, time: 5, hold: 5 };
export function scaleRoutine(routine, targetSec) {
  const rows = (routine?.items || []).map((ri) => ({ ri, x: resolveItem(ri) })).filter((r) => r.x);
  const work = rows.reduce((n, r) => n + itemSeconds(r.x.dose), 0);
  if (!rows.length || work <= 0) return routine;
  const f = Math.max(0.05, (targetSec - rows.length * TRANSITION_SEC) / work);
  const lim = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
  const items = routine.items.map((ri) => {
    const x = resolveItem(ri);
    if (!x) return ri;
    const d = x.dose; const step = SCALE_STEP[d.mode];
    if (d.mode === 'reps') return { ...ri, reps: lim(Math.round(d.reps * f), ROUTINE_LIMITS.reps) };
    return { ...ri, seconds: lim(Math.round((d.seconds * f) / step) * step, ROUTINE_LIMITS.seconds) };
  });
  return { ...routine, items };
}

/** Nächste Zielzeit in Minuten für die Dauer-Taste: unter 5 min in 1er-, darüber in 5er-Schritten. */
export function nextMinutes(cur, delta) {
  if (delta > 0) return Math.min(120, cur < 5 ? cur + 1 : Math.floor(cur / 5) * 5 + 5);
  return Math.max(1, cur <= 5 ? cur - 1 : Math.ceil(cur / 5) * 5 - 5);
}

export function fmtClock(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function doseText(dose) {
  const side = dose.perSide ? ' je Seite' : '';
  if (dose.mode === 'time') return fmtClock(dose.seconds);
  if (dose.mode === 'reps') return `${dose.reps}×${side}`;
  return `${dose.rounds > 1 ? `${dose.rounds} × ` : ''}${dose.seconds} s halten${side}`;
}

// ---------- Liste und Zugriff ----------

export function ownRoutines() {
  return store.get('routines');
}

export function listRoutines({ phase = null } = {}) {
  const all = [...TEMPLATES.map(clone), ...ownRoutines()];
  return phase ? all.filter((r) => r.phase === phase) : all;
}

export function getRoutine(id) {
  if (!id) return null;
  return listRoutines().find((r) => r.id === id) || null;
}

export function isTemplate(id) {
  return typeof id === 'string' && id.startsWith('tpl:');
}

// ---------- Eigene Routinen ----------

function newItem(ref, over = {}) {
  const base = ITEM_BY_REF[ref];
  if (!base) return null;
  const d = base.dose;
  return {
    id: uuid(),
    ref,
    seconds: d.mode === 'reps' ? null : (Number.isInteger(over.seconds) ? over.seconds : d.seconds),
    reps: d.mode === 'reps' ? (Number.isInteger(over.reps) ? over.reps : d.reps) : null,
    rounds: d.mode === 'hold' ? (Number.isInteger(over.rounds) ? over.rounds : d.rounds) : 1
  };
}

export function createRoutine({ name = '', phase = 'warmup', items = [] } = {}) {
  const now = nowISO();
  return { id: uuid(), name, phase, items: items.map((x) => newItem(x.ref, x)).filter(Boolean), createdAt: now, updatedAt: now };
}

export function addItem(routine, ref) {
  const item = newItem(ref);
  return item ? { ...routine, items: [...routine.items, item] } : routine;
}

export function saveRoutine(routine) {
  const r = { ...routine, name: (routine.name || '').trim(), updatedAt: nowISO() };
  const errors = validateRoutine(r);
  if (!r.name) return { ok: false, errors: ['Bitte einen Namen eingeben.'] };
  if (!r.items.length) return { ok: false, errors: ['Bitte mindestens eine Übung hinzufügen.'] };
  if (errors.length) return { ok: false, errors };
  const list = ownRoutines();
  const i = list.findIndex((x) => x.id === r.id);
  if (i >= 0) list[i] = r; else list.push(r);
  if (!store.set('routines', list)) return { ok: false, errors: ['Speichern fehlgeschlagen (Speicher voll?).'] };
  return { ok: true, errors: [], routine: r };
}

// Vorlage als eigene, bearbeitbare Kopie (noch nicht gespeichert).
export function copyOf(id) {
  const src = getRoutine(id);
  if (!src) return null;
  return createRoutine({ name: `${src.name} (eigene)`.slice(0, 60), phase: src.phase, items: src.items });
}

// Löschen entfernt auch die Verknüpfung in Plänen; Protokolle in alten Trainings bleiben (mit Namen).
export function deleteRoutine(id) {
  if (isTemplate(id)) return { ok: false, errors: ['Vorlagen können nicht gelöscht werden.'] };
  const list = ownRoutines();
  if (!list.some((r) => r.id === id)) return { ok: false, errors: ['Routine nicht gefunden.'] };
  const plans = store.get('plans').map((p) => {
    const next = { ...p };
    for (const k of ['warmupRoutineId', 'cooldownRoutineId']) if (next[k] === id) next[k] = null;
    return next;
  });
  if (!store.set('plans', plans) || !store.set('routines', list.filter((r) => r.id !== id))) return { ok: false, errors: ['Speichern fehlgeschlagen.'] };
  return { ok: true, errors: [] };
}

// ---------- Pläne ----------

export const PLAN_KEY = { warmup: 'warmupRoutineId', cooldown: 'cooldownRoutineId' };

export function planRoutine(plan, phase) {
  return getRoutine(plan?.[PLAN_KEY[phase]] || null);
}

export function setPlanRoutine(planId, phase, routineId) {
  if (!(phase in PLAN_KEY)) return { ok: false, errors: ['Phase ungültig.'] };
  if (routineId && getRoutine(routineId)?.phase !== phase) return { ok: false, errors: ['Routine passt nicht zur Phase.'] };
  const plans = store.get('plans');
  const i = plans.findIndex((p) => p.id === planId);
  if (i < 0) return { ok: false, errors: ['Plan nicht gefunden.'] };
  const next = { ...plans[i], [PLAN_KEY[phase]]: routineId || null, updatedAt: nowISO() };
  const errors = validatePlan(next);
  if (errors.length) return { ok: false, errors };
  plans[i] = next;
  if (!store.set('plans', plans)) return { ok: false, errors: ['Speichern fehlgeschlagen.'] };
  return { ok: true, errors: [], plan: next };
}

// ---------- Ablauf ----------

// Flache Schritte: Haltezeiten je Runde und Seite einzeln, damit „Weiter“ immer genau einen Abschnitt beendet.
export function steps(routine) {
  const out = [];
  (routine?.items || []).map(resolveItem).filter(Boolean).forEach((item, itemIndex) => {
    const d = item.dose;
    if (d.mode === 'hold') {
      const sides = d.perSide ? ['links', 'rechts'] : [null];
      for (let r = 1; r <= d.rounds; r++) for (const side of sides) {
        const parts = [d.rounds > 1 ? `Runde ${r} von ${d.rounds}` : null, side].filter(Boolean);
        out.push({ itemIndex, item, seconds: d.seconds, label: parts.join(' · ') });
      }
    } else if (d.mode === 'time') {
      out.push({ itemIndex, item, seconds: d.seconds, label: '' });
    } else {
      out.push({ itemIndex, item, seconds: null, label: doseText(d) });
    }
  });
  return out;
}

// Restzeit ab Schritt i (inkl. laufendem Schritt, dessen verstrichene Zeit abgezogen wird).
export function remainingSeconds(stepList, index, elapsedInStep = 0) {
  let sec = 0;
  let lastItem = -1;
  for (let i = index; i < stepList.length; i++) {
    const st = stepList[i];
    const own = st.seconds !== null ? st.seconds : (st.item.dose.reps * (st.item.dose.perSide ? 2 : 1) * REP_SECONDS);
    sec += i === index ? Math.max(0, own - elapsedInStep) : own;
    if (st.itemIndex !== lastItem && i !== index) sec += TRANSITION_SEC;
    lastItem = st.itemIndex;
  }
  return sec;
}

// Protokoll: erledigte Routine an ein Training hängen (laufend oder beendet). Zählt nirgends mit.
export function recordRoutine(sessionId, { routine, startedAt, done, total }) {
  if (!sessionId || !routine || done < 1) return { ok: false, errors: ['Nichts zu speichern.'] };
  const sessions = store.get('sessions');
  const i = sessions.findIndex((s) => s.id === sessionId);
  if (i < 0) return { ok: false, errors: ['Training nicht gefunden.'] };
  const entry = { routineId: routine.id, name: routine.name, phase: routine.phase, startedAt, endedAt: nowISO(), done, total };
  const next = { ...sessions[i], routines: [...(sessions[i].routines || []), entry] };
  const errors = validateSession(next);
  if (errors.length) return { ok: false, errors };
  sessions[i] = next;
  if (!store.set('sessions', sessions)) return { ok: false, errors: ['Speichern fehlgeschlagen.'] };
  return { ok: true, errors: [], entry };
}

export function catalog({ type = null, phase = null } = {}) {
  return ROUTINE_ITEMS.filter((x) => (!type || x.type === type) && (!phase || x.phase === phase || x.phase === 'both'));
}

// Hinweis-Regel (Konsens, Behm 2016 / Warneke 2024 / Delphi 2025): langes statisches Halten vor schweren Sätzen.
export function longHoldsInWarmup(routine) {
  if (routine?.phase !== 'warmup') return [];
  return (routine.items || []).map(resolveItem).filter((x) => x && x.dose.mode === 'hold' && x.dose.seconds * x.dose.rounds >= 60);
}
