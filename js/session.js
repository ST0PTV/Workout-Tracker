// Laufendes Training: Datenoperationen über dem Store (ohne DOM, in Node testbar).
// Es gibt höchstens ein laufendes Training (endedAt === null). Jede Änderung wird sofort gespeichert,
// damit nichts verloren geht, wenn iOS die App im Hintergrund beendet.
import * as store from './store.js';
import { nowISO } from './util.js';
import { createSession, createEntry, createSet, prefillSets, startSessionFromPlan, needsWarmupHint, lastPerformance, validateSession, sessionSummary, swapEntryExercise, completionError } from './model.js';
import { getPlan } from './plans.js';
import { isEmptySet } from './history.js';
import { effectiveRest } from './rest.js';
import * as SETS from './sets.js';
import { startRest, adjustRest } from './timer.js';
import * as PR from './progression.js';

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
    .map((e) => ({ ...e, sets: e.sets.filter((x) => x.completedAt !== null && !isEmptySet(x)).map((x) => SETS.cleanStages({ ...x, drops: [...x.drops] })) }))
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

// Satz abhaken: Werte übernehmen, Zeitstempel setzen und die Satzpause starten.
// v1.4: ohne Werte kein Haken (completionError); Cardio-Einheiten starten keine Satzpause.
export function completeSet(entryId, setId, values = {}) {
  return update((s) => {
    const { entry, set } = findSet(s, entryId, setId);
    if (!set) return 'Satz nicht gefunden.';
    const ex = exercisesById()[entry.exerciseId];
    const kind = ex?.kind || 'strength';
    const err = completionError({ ...set, ...values }, kind);
    if (err) return err;
    Object.assign(set, values, { completedAt: nowISO() });
    if (kind !== 'cardio') s.restTimer = startRest(entryId, effectiveRest(ex, store.get('settings'), entry));
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
    const allowed = ['weightKg', 'reps', 'type', 'drops', 'tags', 'durationSec', 'distanceM', 'intensity'];
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

// v2.26.0 (A10): Ergebnis enthält removed = { set, index } für „Rückgängig“.
export function removeSet(entryId, setId) {
  let removed = null;
  const r = update((s) => {
    const entry = s.entries.find((e) => e.id === entryId);
    if (!entry) return 'Übung nicht gefunden.';
    const index = entry.sets.findIndex((x) => x.id === setId);
    if (index < 0) return 'Satz nicht gefunden.';
    removed = { set: structuredClone(entry.sets[index]), index };
    entry.sets.splice(index, 1);
  });
  return r.ok ? { ...r, removed } : r;
}

// v2.26.0 (A10): gelöschten Satz an seiner alten Stelle wieder einsetzen. Nur das eine Element –
// spätere Änderungen im selben Training bleiben erhalten.
export function restoreSet(entryId, removed) {
  return update((s) => {
    const entry = s.entries.find((e) => e.id === entryId);
    if (!entry || !removed?.set) return 'Die Übung ist nicht mehr im Training.';
    if (entry.sets.some((x) => x.id === removed.set.id)) return 'Satz ist schon wieder da.';
    entry.sets.splice(Math.min(removed.index, entry.sets.length), 0, structuredClone(removed.set));
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

// Tausch (v1.3, Entscheidung b): ohne erledigten Satz wird die Übung des Eintrags ersetzt;
// mit erledigtem Satz bleibt der Eintrag und die neue Übung kommt als eigener Eintrag direkt dahinter
// (gleiche Gruppe, gleiche Plan-Satzzahl). Ergebnis: { ok, mode: 'swapped' | 'inserted', index }.
export function swapEntry(entryId, exerciseId) {
  const s = activeSession();
  if (!s) return { ok: false, errors: ['Kein laufendes Training.'] };
  const i = s.entries.findIndex((e) => e.id === entryId);
  if (i < 0) return { ok: false, errors: ['Übung nicht gefunden.'] };
  const ex = exercisesById()[exerciseId];
  if (!ex) return { ok: false, errors: ['Übung nicht gefunden.'] };
  const entry = s.entries[i];
  if (entry.exerciseId === exerciseId) return { ok: false, errors: ['Diese Übung ist schon eingetragen.'] };
  const next = structuredClone(s);
  let mode;
  if (entry.sets.some((x) => x.completedAt !== null)) {
    next.entries.splice(i + 1, 0, createEntry(ex.id, {
      groupId: entry.groupId,
      targetSets: entry.targetSets ?? null,
      restSeconds: entry.restSeconds ?? null,
      ...(entry.repRange ? { repRange: { ...entry.repRange } } : {}),
      sets: prefillSets(ex, finishedSessions(), entry.targetSets ?? null)
    }));
    mode = 'inserted';
  } else {
    next.entries[i] = swapEntryExercise(entry, ex, finishedSessions());
    if (next.restTimer?.entryId === entry.id) next.restTimer = null;
    mode = 'swapped';
  }
  const r = save(next);
  return r.ok ? { ...r, mode, index: mode === 'inserted' ? i + 1 : i } : r;
}

// v2.26.0 (A10): Ergebnis enthält removed = { entry, index } für „Rückgängig“ (der Pausen-Timer kommt nicht zurück).
export function removeEntry(entryId) {
  let removed = null;
  const r = update((s) => {
    const index = s.entries.findIndex((e) => e.id === entryId);
    if (index < 0) return 'Übung nicht gefunden.';
    removed = { entry: structuredClone(s.entries[index]), index };
    s.entries.splice(index, 1);
    if (s.restTimer?.entryId === entryId) s.restTimer = null;
  });
  return r.ok ? { ...r, removed } : r;
}

export function restoreEntry(removed) {
  return update((s) => {
    if (!removed?.entry) return 'Nichts wiederherzustellen.';
    if (s.entries.some((e) => e.id === removed.entry.id)) return 'Übung ist schon wieder da.';
    s.entries.splice(Math.min(removed.index, s.entries.length), 0, structuredClone(removed.entry));
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

// ---------- v2.4.0: Bewertung, Vorschlag, Wiedereinstieg ----------

// Bewertung der Übung (letzter Arbeitssatz): 'easy' | 'right' | 'hard' | 'none' (übersprungen) | null (zurücksetzen).
export function rateEntry(entryId, rating) {
  return update((s) => {
    const en = s.entries.find((e) => e.id === entryId);
    if (!en) return 'Übung nicht gefunden.';
    if (rating !== null && !PR.RATING_VALUES.includes(rating)) return 'Unbekannte Bewertung.';
    if (rating === null) delete en.rating; else en.rating = rating;
  });
}

// Vorschlag übernehmen (offene Arbeitssätze ändern) oder ablehnen (Karte verschwindet, Werte bleiben).
export function decideSuggestion(entryId, accept) {
  const s = activeSession();
  const en = s?.entries.find((e) => e.id === entryId);
  const ex = en ? exercisesById()[en.exerciseId] : null;
  const sug = ex ? PR.suggestFor(ex, finishedSessions(), { beforeSessionId: s.id, repRange: en.repRange ?? null }) : null;
  return update((x) => {
    const e = x.entries.find((y) => y.id === entryId);
    if (!e) return 'Übung nicht gefunden.';
    if (accept) {
      if (!sug) return 'Kein Vorschlag vorhanden.';
      e.sets = PR.applySuggestion(e.sets, sug);
    }
    e.suggestion = accept ? 'accepted' : 'declined';
  });
}

// v2.30.0 (B3): leichte Woche – Training markieren und offene Arbeitssätze halbieren, Gewichte −10 %.
export function applyLightWeek() {
  const past = finishedSessions();
  const byId = exercisesById();
  return update((s) => {
    for (const e of s.entries) {
      const ex = byId[e.exerciseId];
      if (!ex || ex.kind === 'cardio') continue;
      e.sets = PR.applyLight(e.sets, PR.loadStep(ex, past));
    }
    s.light = true;
  });
}

// Nach einer Pause: alle offenen Sätze um pct % leichter (in ganzen Gewichtsschritten je Übung).
export function applyBreakReduction(pct, days) {
  const past = finishedSessions();
  const byId = exercisesById();
  return update((s) => {
    if (!(pct > 0)) return 'Keine Reduktion.';
    for (const e of s.entries) {
      const ex = byId[e.exerciseId];
      if (!ex || ex.kind === 'cardio') continue;
      e.sets = PR.applyReduction(e.sets, pct, PR.loadStep(ex, past));
    }
    s.returnAdjust = { days, pct };
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
      const last = ex ? lastPerformance(ex.id, past, { skipLight: true }) : null;
      const doneCount = entry.sets.filter((x) => x.completedAt !== null).length;
      const open = !entry.suggestion && !entry.sets.some((x) => x.type !== 'warmup' && x.completedAt !== null) && !session.returnAdjust && !session.light && session.endedAt === null;
      return {
        suggestion: open && ex ? PR.suggestFor(ex, past, { beforeSessionId: session.id, repRange: entry.repRange ?? null }) : null,
        workDone: entry.sets.some((x) => x.type !== 'warmup' && x.completedAt !== null),
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
