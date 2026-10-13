// Laufendes Training: Datenoperationen über dem Store (ohne DOM, in Node testbar).
// Es gibt höchstens ein laufendes Training (endedAt === null). Jede Änderung wird sofort gespeichert,
// damit nichts verloren geht, wenn iOS die App im Hintergrund beendet.
import * as store from './store.js';
import { nowISO } from './util.js';
import { createSession, createEntry, createSet, prefillSets, startSessionFromPlan, needsWarmupHint, lastPerformance, validateSession, sessionSummary } from './model.js';
import { getPlan } from './plans.js';
import { effectiveRest } from './rest.js';
import * as SETS from './sets.js';
import { startRest, adjustRest } from './timer.js';

function exercisesById() {
  return Object.fromEntries(store.get('exercises').map((e) => [e.id, e]));
}

export function activeSession() {
  return store.get('sessions').find((s) => s.endedAt === null) || null;
}

export function finishedSessions() {
  return store.get('sessions').filter((s) => s.endedAt !== null).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

function save(session) {
  const errors = validateSession(session);
  if (errors.length) return { ok: false, errors, session };
  const sessions = store.get('sessions');
  const i = sessions.findIndex((s) => s.id === session.id);
  const next = { ...session, updatedAt: nowISO() };
  if (i >= 0) sessions[i] = next; else sessions.push(next);
  if (!store.set('sessions', sessions)) return { ok: false, errors: ['Speichern fehlgeschlagen (Speicher voll?).'], session };
  return { ok: true, errors: [], session: next };
}

function update(fn) {
  const s = activeSession();
  if (!s) return { ok: false, errors: ['Kein laufendes Training.'] };
  const next = structuredClone(s);
  const err = fn(next);
  if (err) return { ok: false, errors: [err] };
  return save(next);
}

function findSet(session, entryId, setId) {
  const entry = session.entries.find((e) => e.id === entryId);
  const set = entry?.sets.find((x) => x.id === setId);
  return { entry, set };
}

// ---------- Starten / Beenden ----------

export function startFromPlan(planId) {
  if (activeSession()) return { ok: false, errors: ['Es läuft schon ein Training.'] };
  const plan = getPlan(planId);
  if (!plan) return { ok: false, errors: ['Plan nicht gefunden.'] };
  const byId = exercisesById();
  const session = startSessionFromPlan(plan, byId, finishedSessions());
  if (!session.entries.length) return { ok: false, errors: ['Der Plan enthält keine Übungen.'] };
  return save(session);
}

export function startEmpty() {
  if (activeSession()) return { ok: false, errors: ['Es läuft schon ein Training.'] };
  return save(createSession());
}

// Beenden: nicht erledigte Sätze und Übungen ohne erledigten Satz werden entfernt
// (sie wären sonst „geplant, aber nicht gemacht“ und würden Verlauf und Vorbelegung verfälschen).
export function finish() {
  const s = activeSession();
  if (!s) return { ok: false, errors: ['Kein laufendes Training.'] };
  const done = s.entries
    .map((e) => ({ ...e, sets: e.sets.filter((x) => x.completedAt !== null).map((x) => SETS.cleanStages({ ...x, drops: [...x.drops] })) }))
    .filter((e) => e.sets.length);
  if (!done.length) return { ok: false, errors: ['Noch kein Satz erledigt. Training verwerfen?'], empty: true };
  return save({ ...s, entries: done, endedAt: nowISO(), restTimer: null });
}

export function discard() {
  const s = activeSession();
  if (!s) return { ok: false, errors: ['Kein laufendes Training.'] };
  const ok = store.set('sessions', store.get('sessions').filter((x) => x.id !== s.id));
  return ok ? { ok: true, errors: [] } : { ok: false, errors: ['Speichern fehlgeschlagen.'] };
}

// ---------- Sätze ----------

// Satz abhaken: Werte übernehmen, Zeitstempel setzen und die Satzpause der Übung starten.
export function completeSet(entryId, setId, values = {}) {
  return update((s) => {
    const { entry, set } = findSet(s, entryId, setId);
    if (!set) return 'Satz nicht gefunden.';
    Object.assign(set, values, { completedAt: nowISO() });
    const ex = exercisesById()[entry.exerciseId];
    s.restTimer = startRest(entryId, effectiveRest(ex, store.get('settings')));
  });
}

export function uncompleteSet(entryId, setId) {
  return update((s) => {
    const { set } = findSet(s, entryId, setId);
    if (!set) return 'Satz nicht gefunden.';
    set.completedAt = null;
  });
}

export function updateSet(entryId, setId, values) {
  return update((s) => {
    const { set } = findSet(s, entryId, setId);
    if (!set) return 'Satz nicht gefunden.';
    const allowed = ['weightKg', 'reps', 'type', 'drops', 'tags', 'durationSec', 'distanceM'];
    for (const k of Object.keys(values)) if (allowed.includes(k)) set[k] = values[k];
    if (!SETS.hasStages(set.type)) set.drops = [];
  });
}

// Neuer Satz: Arbeitssatz am Ende (Werte vom letzten Satz) oder Aufwärmsatz vor dem ersten Arbeitssatz (leer).
export function addSet(entryId, type = 'work') {
  return update((s) => {
    const entry = s.entries.find((e) => e.id === entryId);
    if (!entry) return 'Übung nicht gefunden.';
    if (type === 'warmup') {
      const firstWork = entry.sets.findIndex((x) => x.type !== 'warmup');
      const at = firstWork < 0 ? entry.sets.length : firstWork;
      entry.sets.splice(at, 0, createSet({ type: 'warmup' }));
      return;
    }
    const prev = [...entry.sets].reverse().find((x) => x.type !== 'warmup');
    entry.sets.push(createSet({ type: 'work', weightKg: prev?.weightKg ?? null, reps: prev?.reps ?? null }));
  });
}

// ---------- Satztyp, Stufen, Markierungen (v1.2) ----------

function onSet(entryId, setId, fn) {
  return update((s) => {
    const { set } = findSet(s, entryId, setId);
    if (!set) return 'Satz nicht gefunden.';
    return fn(set) === false ? 'Aktion nicht möglich.' : undefined;
  });
}

export const setSetType = (entryId, setId, type) => onSet(entryId, setId, (set) => { SETS.setType(set, type); });
export const addStage = (entryId, setId) => onSet(entryId, setId, (set) => (SETS.addStage(set) ? undefined : false));
export const updateStage = (entryId, setId, index, values) => onSet(entryId, setId, (set) => SETS.updateStage(set, index, values));
export const removeStage = (entryId, setId, index) => onSet(entryId, setId, (set) => SETS.removeStage(set, index));
export const toggleTag = (entryId, setId, tag) => onSet(entryId, setId, (set) => { SETS.toggleTag(set, tag); });

// Schnellknopf (Variante C): erledigten Arbeitssatz in Drop/Rest-Pause umwandeln und die erste Folge-Stufe anlegen.
export const quickStage = (entryId, setId, type) => onSet(entryId, setId, (set) => {
  if (!SETS.hasStages(type) || set.completedAt === null || set.type === 'warmup') return false;
  if (set.type !== type) SETS.setType(set, type);
  return SETS.addStage(set) ? undefined : false;
});

export function removeSet(entryId, setId) {
  return update((s) => {
    const entry = s.entries.find((e) => e.id === entryId);
    if (!entry) return 'Übung nicht gefunden.';
    const n = entry.sets.length;
    entry.sets = entry.sets.filter((x) => x.id !== setId);
    if (entry.sets.length === n) return 'Satz nicht gefunden.';
  });
}

// ---------- Übungen im Training ----------

export function addEntry(exerciseId) {
  return update((s) => {
    const ex = exercisesById()[exerciseId];
    if (!ex) return 'Übung nicht gefunden.';
    s.entries.push(createEntry(exerciseId, { sets: prefillSets(ex, finishedSessions()) }));
  });
}

export function removeEntry(entryId) {
  return update((s) => {
    const n = s.entries.length;
    s.entries = s.entries.filter((e) => e.id !== entryId);
    if (s.entries.length === n) return 'Übung nicht gefunden.';
    if (s.restTimer?.entryId === entryId) s.restTimer = null;
  });
}

export function moveEntry(entryId, toIndex) {
  return update((s) => {
    const from = s.entries.findIndex((e) => e.id === entryId);
    if (from < 0) return 'Übung nicht gefunden.';
    const to = Math.max(0, Math.min(s.entries.length - 1, toIndex));
    const [e] = s.entries.splice(from, 1);
    s.entries.splice(to, 0, e);
  });
}

// ---------- Pausen-Timer ----------

export function adjustRunningRest(delta) {
  return update((s) => {
    if (!s.restTimer) return 'Keine Pause aktiv.';
    s.restTimer = adjustRest(s.restTimer, delta);
  });
}

export function stopRest() {
  return update((s) => { s.restTimer = null; });
}

// ---------- Anzeige-Daten ----------

// Pro Übung: Übung, letzte Ausführung (früheres Training), Aufwärm-Hinweis, Fortschritt.
export function sessionView(session = activeSession()) {
  if (!session) return null;
  const byId = exercisesById();
  const past = finishedSessions();
  return {
    session,
    summary: sessionSummary(session, byId),
    entries: session.entries.map((entry, index) => {
      const ex = byId[entry.exerciseId] || null;
      const last = ex ? lastPerformance(ex.id, past) : null;
      const doneCount = entry.sets.filter((x) => x.completedAt !== null).length;
      return {
        entry,
        index,
        exercise: ex,
        last,
        warmupHint: needsWarmupHint(session, index, byId) && !entry.sets.some((x) => x.type === 'warmup'),
        doneCount,
        complete: entry.sets.length > 0 && doneCount === entry.sets.length
      };
    })
  };
}
