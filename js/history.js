// Trainings-Tagebuch (v1.1): Liste und Bearbeiten abgeschlossener Trainings (ohne DOM, in Node testbar).
// Bearbeitet wird eine Kopie („Entwurf“); erst saveEdited() schreibt sie zurück. Das laufende Training
// (endedAt === null) ist hier nie erreichbar – dafür ist session.js zuständig.
import * as store from './store.js';
import { nowISO } from './util.js';
import { createSet, sessionSummary, hardSets, validateSession, SET_TYPES } from './model.js';
import { getPlan } from './plans.js';

const exercisesById = () => Object.fromEntries(store.get('exercises').map((e) => [e.id, e]));

export function finishedSessions() {
  return store.get('sessions').filter((s) => s.endedAt !== null).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function getFinished(id) {
  return store.get('sessions').find((s) => s.id === id && s.endedAt !== null) || null;
}

export function sessionName(session) {
  if (!session.planId) return 'Freies Training';
  return getPlan(session.planId)?.name || 'Plan';
}

export function durationMin(session) {
  if (!session.endedAt) return null;
  return Math.max(0, Math.round((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60000));
}

// Anzeige-Daten für eine Tagebuch-Karte (neueste zuerst).
export function diaryRows(sessions = finishedSessions()) {
  const byId = exercisesById();
  return sessions.map((s) => {
    const sum = sessionSummary(s, byId);
    return {
      session: s,
      name: sessionName(s),
      durationMin: durationMin(s),
      hardSets: sum.hardSets,
      volume: sum.volume,
      exercises: s.entries.map((en) => ({ name: byId[en.exerciseId]?.name || 'Unbekannte Übung', hardSets: hardSets(en) }))
    };
  });
}

// Kurzfassung der Übungen: "Kniebeuge 3 · Bankdrücken 3 · +2"
export function exerciseLine(exercises, max = 3) {
  const head = exercises.slice(0, max).map((e) => `${e.name} ${e.hardSets}`);
  const rest = exercises.length - max;
  return rest > 0 ? `${head.join(' · ')} · +${rest}` : head.join(' · ');
}

// ---------- Entwurf ----------

export function startEdit(id) {
  const s = getFinished(id);
  return s ? structuredClone(s) : null;
}

const findEntry = (draft, entryId) => draft.entries.find((e) => e.id === entryId) || null;
const findSet = (draft, entryId, setId) => findEntry(draft, entryId)?.sets.find((x) => x.id === setId) || null;

export function setValues(draft, entryId, setId, values) {
  const set = findSet(draft, entryId, setId);
  if (!set) return false;
  for (const k of ['weightKg', 'reps']) if (k in values) set[k] = values[k];
  return true;
}

// Aufwärm <-> Arbeit. Drop-Sätze haben noch keine Oberfläche (ab v1.2) und bleiben unverändert.
export function toggleType(draft, entryId, setId) {
  const set = findSet(draft, entryId, setId);
  if (!set || set.type === 'drop') return false;
  set.type = set.type === 'warmup' ? 'work' : 'warmup';
  return true;
}

export function setType(draft, entryId, setId, type) {
  const set = findSet(draft, entryId, setId);
  if (!set || !SET_TYPES.includes(type)) return false;
  set.type = type;
  if (type !== 'drop') set.drops = [];
  return true;
}

// Wie im laufenden Training: Arbeitssatz am Ende mit den Werten des letzten Arbeitssatzes,
// Aufwärmsatz vor dem ersten Arbeitssatz. Gilt als erledigt (Zeitpunkt = Trainingsende),
// sonst würde er von Verlauf und Vorbelegung ignoriert.
export function addSet(draft, entryId, type = 'work') {
  const entry = findEntry(draft, entryId);
  if (!entry) return null;
  const doneAt = draft.endedAt;
  if (type === 'warmup') {
    const firstWork = entry.sets.findIndex((x) => x.type !== 'warmup');
    const set = createSet({ type: 'warmup', completedAt: doneAt });
    entry.sets.splice(firstWork < 0 ? entry.sets.length : firstWork, 0, set);
    return set;
  }
  const prev = [...entry.sets].reverse().find((x) => x.type !== 'warmup');
  const set = createSet({ type: 'work', weightKg: prev?.weightKg ?? null, reps: prev?.reps ?? null, completedAt: doneAt });
  entry.sets.push(set);
  return set;
}

export function removeSet(draft, entryId, setId) {
  const entry = findEntry(draft, entryId);
  if (!entry) return false;
  const n = entry.sets.length;
  entry.sets = entry.sets.filter((x) => x.id !== setId);
  return entry.sets.length < n;
}

export function removeEntry(draft, entryId) {
  const n = draft.entries.length;
  draft.entries = draft.entries.filter((e) => e.id !== entryId);
  return draft.entries.length < n;
}

// Entwurf prüfen und speichern. Übungen ohne Sätze fallen weg; bleibt keine Übung übrig,
// wird nicht gespeichert ({ empty: true }) – die Oberfläche bietet dann „Training löschen“ an.
export function saveEdited(draft) {
  const sessions = store.get('sessions');
  const i = sessions.findIndex((s) => s.id === draft?.id);
  if (i < 0) return { ok: false, errors: ['Training nicht gefunden.'] };
  const orig = sessions[i];
  if (orig.endedAt === null) return { ok: false, errors: ['Ein laufendes Training wird im Training-Tab bearbeitet.'] };
  if (draft.startedAt !== orig.startedAt || draft.endedAt !== orig.endedAt) return { ok: false, errors: ['Datum und Dauer sind nicht bearbeitbar.'] };
  const next = structuredClone(draft);
  next.entries = next.entries.filter((e) => e.sets.length);
  if (!next.entries.length) return { ok: false, errors: ['Das Training hat keine Sätze mehr.'], empty: true };
  for (const e of next.entries) {
    for (const x of e.sets) {
      if (x.completedAt === null) x.completedAt = next.endedAt;
      if (x.type !== 'drop') x.drops = [];
    }
  }
  next.restTimer = null;
  next.updatedAt = nowISO();
  const errors = validateSession(next);
  if (errors.length) return { ok: false, errors };
  sessions[i] = next;
  if (!store.set('sessions', sessions)) return { ok: false, errors: ['Speichern fehlgeschlagen (Speicher voll?).'] };
  return { ok: true, errors: [], session: next };
}

export function deleteSession(id) {
  const sessions = store.get('sessions');
  const s = sessions.find((x) => x.id === id);
  if (!s) return { ok: false, errors: ['Training nicht gefunden.'] };
  if (s.endedAt === null) return { ok: false, errors: ['Ein laufendes Training wird im Training-Tab verworfen.'] };
  if (!store.set('sessions', sessions.filter((x) => x.id !== id))) return { ok: false, errors: ['Speichern fehlgeschlagen.'] };
  return { ok: true, errors: [] };
}

// Gibt es ungespeicherte Änderungen? (für „Abbrechen“)
export function isDirty(draft) {
  const orig = getFinished(draft.id);
  return !orig || JSON.stringify(orig.entries) !== JSON.stringify(draft.entries);
}
