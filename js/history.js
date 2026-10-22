// Trainings-Tagebuch (v1.1): Liste und Bearbeiten abgeschlossener Trainings (ohne DOM, in Node testbar).
// Bearbeitet wird eine Kopie („Entwurf“); erst saveEdited() schreibt sie zurück. Das laufende Training
// (endedAt === null) ist hier nie erreichbar – dafür ist session.js zuständig.
import * as store from './store.js';
import { nowISO } from './util.js';
import { createSet, createEntry, createSession, sessionSummary, hardSets, validateSession, prefillSets, SET_TYPES } from './model.js';
import { getPlan } from './plans.js';
import * as SETS from './sets.js';
import { fmtDuration } from './input.js';

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
      exercises: s.entries.map((en) => { const kind = byId[en.exerciseId]?.kind; return { name: byId[en.exerciseId]?.name || 'Unbekannte Übung', hardSets: hardSets(en, kind), kind, durationSec: kind === 'cardio' ? en.sets.filter((x) => x.completedAt).reduce((a, x) => a + (x.durationSec || 0), 0) : 0 }; })
    };
  });
}

// Kurzfassung der Übungen: "Kniebeuge 3 · Bankdrücken 3 · +2"
export function exerciseLine(exercises, max = 3) {
  const head = exercises.slice(0, max).map((e) => `${e.name} ${e.kind === 'cardio' ? (e.durationSec ? fmtDuration(e.durationSec) : '–') : e.hardSets}`); // Cardio: Dauer statt Satzzahl
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
  for (const k of ['weightKg', 'reps', 'durationSec', 'distanceM', 'intensity']) if (k in values) set[k] = values[k];
  return true;
}

// Aufwärm <-> Arbeit (Kurzweg); Drop/Rest-Pause bleiben unverändert – dafür setType.
export function toggleType(draft, entryId, setId) {
  const set = findSet(draft, entryId, setId);
  if (!set || SETS.hasStages(set.type)) return false;
  set.type = set.type === 'warmup' ? 'work' : 'warmup';
  return true;
}

// Satz-Objekt im Entwurf für die Stufen-/Markierungs-Helfer aus sets.js (v1.2).
export const draftSet = (draft, entryId, setId) => findSet(draft, entryId, setId);

export function setType(draft, entryId, setId, type) {
  const set = findSet(draft, entryId, setId);
  if (!set || !SET_TYPES.includes(type)) return false;
  SETS.setType(set, type);
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

// v1.4 (Entscheidung 5 B): Beginn und Ende ändern. Die Zeitpunkte der Sätze werden um dieselbe Differenz
// wie der Beginn verschoben und in [Beginn, Ende] gehalten, damit die Reihenfolge der Sätze erhalten bleibt.
export const MAX_SESSION_HOURS = 12;
export function setTimes(draft, startISO, endISO, now = Date.now()) {
  const a = Date.parse(startISO);
  const b = Date.parse(endISO);
  if (Number.isNaN(a) || Number.isNaN(b)) return { ok: false, errors: ['Bitte Datum und Uhrzeit angeben.'] };
  if (b <= a) return { ok: false, errors: ['Das Ende muss nach dem Beginn liegen.'] };
  if (b - a > MAX_SESSION_HOURS * 3600000) return { ok: false, errors: [`Ein Training dauert höchstens ${MAX_SESSION_HOURS} Stunden.`] };
  if (b > now + 60000) return { ok: false, errors: ['Das Ende liegt in der Zukunft.'] };
  const delta = a - Date.parse(draft.startedAt);
  const clamp = (t) => Math.min(b, Math.max(a, t));
  for (const en of draft.entries) {
    for (const x of en.sets) if (x.completedAt !== null) x.completedAt = new Date(clamp(Date.parse(x.completedAt) + delta)).toISOString();
  }
  draft.startedAt = new Date(a).toISOString();
  draft.endedAt = new Date(b).toISOString();
  return { ok: true, errors: [] };
}

// Satz ganz ohne Werte (kein Gewicht, keine Wdh., keine Dauer/Strecke) trägt keine Information.
export const isEmptySet = (x) => x.weightKg === null && x.reps === null && !x.durationSec && !x.distanceM;

// Entwurf bereinigen und prüfen (gemeinsam für Bearbeiten und Nachtragen): leere Sätze und Übungen ohne Sätze
// fallen weg; bleibt keine Übung übrig, gibt es { empty: true }.
function finalizeDraft(draft) {
  if (!(Date.parse(draft.endedAt) > Date.parse(draft.startedAt))) return { ok: false, errors: ['Das Ende muss nach dem Beginn liegen.'] };
  const next = structuredClone(draft);
  for (const e of next.entries) e.sets = e.sets.filter((x) => !isEmptySet(x)); // v1.4: leere Sätze fallen weg
  next.entries = next.entries.filter((e) => e.sets.length);
  if (!next.entries.length) return { ok: false, errors: ['Das Training hat keine Sätze mehr.'], empty: true };
  for (const e of next.entries) {
    for (const x of e.sets) {
      if (x.completedAt === null) x.completedAt = next.endedAt;
      SETS.cleanStages(x);
    }
  }
  next.restTimer = null;
  next.updatedAt = nowISO();
  const errors = validateSession(next);
  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], session: next };
}

// Entwurf prüfen und speichern. Übungen ohne Sätze fallen weg; bleibt keine Übung übrig,
// wird nicht gespeichert ({ empty: true }) – die Oberfläche bietet dann „Training löschen“ an.
export function saveEdited(draft) {
  const sessions = store.get('sessions');
  const i = sessions.findIndex((s) => s.id === draft?.id);
  if (i < 0) return { ok: false, errors: ['Training nicht gefunden.'] };
  if (sessions[i].endedAt === null) return { ok: false, errors: ['Ein laufendes Training wird im Training-Tab bearbeitet.'] };
  const r = finalizeDraft(draft);
  if (!r.ok) return r;
  sessions[i] = r.session;
  if (!store.set('sessions', sessions)) return { ok: false, errors: ['Speichern fehlgeschlagen (Speicher voll?).'] };
  return r;
}

// ---------- Training nachtragen (v2.32.0) ----------
// Ein nachgetragenes Training ist ein Entwurf im Speicher (noch nicht in sessions), der im Tagebuch-Editor
// ausgefüllt wird. Gespeichert wird erst mit saveNew. Sätze sind wie im laufenden Training mit den Werten vom
// letzten Mal vorbelegt (nur Trainings VOR dem gewählten Beginn zählen; ohne Verlauf leer). Sie gelten beim
// Speichern als gemacht – die Oberfläche sagt das im Dialog.
const before = (draft) => store.get('sessions').filter((s) => s.endedAt !== null && Date.parse(s.startedAt) < Date.parse(draft.startedAt));
const entrySets = (draft, exercise, targetSets = null) => {
  const sets = prefillSets(exercise, before(draft), targetSets);
  for (const x of sets) x.completedAt = draft.endedAt;
  return sets;
};

// plan: Plan-Objekt oder null (freies Training). byId: Übungen nach id. Prüft die Zeiten wie setTimes
// (Ende nach Beginn, höchstens MAX_SESSION_HOURS, nicht in der Zukunft).
export function newBackfill({ plan = null, startISO, endISO }, byId, now = Date.now()) {
  const draft = createSession({ planId: plan ? plan.id : null, endedAt: endISO });
  const t = setTimes(draft, startISO, endISO, now);
  if (!t.ok) return t;
  if (plan) {
    for (const it of plan.items) {
      const ex = byId[it.exerciseId];
      if (!ex) continue;
      const sets = entrySets(draft, ex, it.targetSets ?? null);
      draft.entries.push(createEntry(it.exerciseId, {
        planItemId: it.id, groupId: it.groupId ?? null, targetSets: it.targetSets ?? null, sets
      }));
    }
  }
  return { ok: true, errors: [], draft };
}

// Übung am Ende des Entwurfs hinzufügen (Sätze vom letzten Mal, sonst leer). Gibt den Eintrag oder null.
export function addEntry(draft, exercise) {
  if (!exercise) return null;
  const en = createEntry(exercise.id, { sets: entrySets(draft, exercise) });
  draft.entries.push(en);
  return en;
}

// Nachgetragenes Training speichern. Ohne einen Satz mit Werten wird nicht gespeichert ({ empty: true }).
export function saveNew(draft) {
  const sessions = store.get('sessions');
  if (!draft || sessions.some((s) => s.id === draft.id)) return { ok: false, errors: ['Training existiert schon.'] };
  const r = finalizeDraft(draft);
  if (!r.ok) return r.empty ? { ...r, errors: ['Noch kein Satz mit Werten eingetragen.'] } : r;
  sessions.push(r.session);
  if (!store.set('sessions', sessions)) return { ok: false, errors: ['Speichern fehlgeschlagen (Speicher voll?).'] };
  return r;
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
  return !orig || orig.startedAt !== draft.startedAt || orig.endedAt !== draft.endedAt || JSON.stringify(orig.entries) !== JSON.stringify(draft.entries);
}
