// v2.32.0: Training nachtragen (Entwurf, Übung hinzufügen, Speichern).
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const S = await import('../js/session.js');
const H = await import('../js/history.js');
const { test, done } = runner();

console.log('# v2.32.0');
store.init();

const HOUR = 3600000;
const iso = (hoursAgo) => new Date(Date.now() - hoursAgo * HOUR).toISOString();
const bench = lib.saveExercise(M.createExercise({ name: 'Bankdrücken', muscles: { primary: ['chest'], secondary: [] }, defaultWorkSets: 4 })).exercise;
const run = lib.saveExercise(M.createExercise({ name: 'Laufband', kind: 'cardio', muscles: { primary: [], secondary: [] } })).exercise;
const curl = lib.saveExercise(M.createExercise({ name: 'Curls', muscles: { primary: ['biceps'], secondary: [] } })).exercise;
const plan = P.newPlan('Testplan').plan;
P.addExercises(plan.id, [bench.id, run.id]);
const byId = Object.fromEntries(lib.listExercises().map((e) => [e.id, e]));
const planNow = () => P.getPlan(plan.id);

test('freies Training: leerer Entwurf mit Zeiten, nichts gespeichert', () => {
  const r = H.newBackfill({ startISO: iso(25), endISO: iso(24) }, byId);
  assert.ok(r.ok);
  assert.equal(r.draft.planId, null);
  assert.deepEqual(r.draft.entries, []);
  assert.ok(r.draft.endedAt && Date.parse(r.draft.endedAt) - Date.parse(r.draft.startedAt) > 0);
  assert.ok(Math.abs((Date.parse(r.draft.endedAt) - Date.parse(r.draft.startedAt)) / HOUR - 1) < 0.01, 'eine Stunde');
  assert.equal(store.get('sessions').length, 0);
});

test('Zeiten: Ende nach Beginn, höchstens 12 h, nicht in der Zukunft, gültiges Datum', () => {
  assert.ok(!H.newBackfill({ startISO: iso(2), endISO: iso(3) }, byId).ok);
  assert.ok(!H.newBackfill({ startISO: iso(20), endISO: iso(5) }, byId).ok);
  assert.ok(!H.newBackfill({ startISO: iso(-1), endISO: iso(-2) }, byId).ok);
  assert.ok(!H.newBackfill({ startISO: 'x', endISO: iso(1) }, byId).ok);
});

test('mit Plan: Übungen und leere Sätze (Satzzahl aus Plan/Übung, Cardio 1), planItemId gesetzt', () => {
  const r = H.newBackfill({ plan: planNow(), startISO: iso(3), endISO: iso(2) }, byId);
  assert.ok(r.ok);
  assert.equal(r.draft.planId, plan.id);
  assert.equal(r.draft.entries.length, 2);
  assert.equal(r.draft.entries[0].sets.length, 4);
  assert.equal(r.draft.entries[1].sets.length, 1);
  assert.ok(r.draft.entries.every((e) => e.planItemId));
  for (const e of r.draft.entries) for (const x of e.sets) {
    assert.equal(x.weightKg, null); assert.equal(x.reps, null); assert.equal(x.completedAt, r.draft.endedAt);
  }
});

test('Übung hinzufügen: ein leerer Arbeitssatz am Ende', () => {
  const r = H.newBackfill({ startISO: iso(3), endISO: iso(2) }, byId);
  const en = H.addEntry(r.draft, curl);
  assert.equal(r.draft.entries.length, 1);
  assert.equal(en.sets.length, 1);
  assert.equal(H.addEntry(r.draft, null), null);
});

test('Speichern ohne Werte: nicht gespeichert (empty)', () => {
  const r = H.newBackfill({ plan: planNow(), startISO: iso(3), endISO: iso(2) }, byId);
  const res = H.saveNew(r.draft);
  assert.ok(!res.ok && res.empty);
  assert.match(res.errors[0], /Noch kein Satz/);
  assert.equal(store.get('sessions').length, 0);
});

test('Speichern mit Werten: leere Sätze/Übungen fallen weg, Training ist abgeschlossen und im Tagebuch', () => {
  const r = H.newBackfill({ plan: planNow(), startISO: iso(27), endISO: iso(26) }, byId);
  const d = r.draft;
  H.setValues(d, d.entries[0].id, d.entries[0].sets[0].id, { weightKg: 60, reps: 10 });
  H.setValues(d, d.entries[0].id, d.entries[0].sets[1].id, { weightKg: 60, reps: 9 });
  const res = H.saveNew(d);
  assert.ok(res.ok, res.errors?.join());
  assert.equal(res.session.entries.length, 1, 'Cardio ohne Werte fällt weg');
  assert.equal(res.session.entries[0].sets.length, 2);
  assert.ok(res.session.endedAt);
  assert.equal(S.activeSession(), null, 'kein laufendes Training');
  const rows = H.diaryRows();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hardSets, 2);
  assert.equal(M.validateSession(store.get('sessions')[0]).length, 0);
});

test('doppeltes Speichern desselben Entwurfs wird abgelehnt', () => {
  const r = H.newBackfill({ startISO: iso(30), endISO: iso(29) }, byId);
  H.addEntry(r.draft, curl);
  H.setValues(r.draft, r.draft.entries[0].id, r.draft.entries[0].sets[0].id, { weightKg: 20, reps: 12 });
  assert.ok(H.saveNew(r.draft).ok);
  assert.ok(!H.saveNew(r.draft).ok);
  assert.equal(store.get('sessions').length, 2);
});

test('Reihenfolge nach Beginn: ein früheres Datum landet hinten, Vorbelegung nimmt das jüngste Training', () => {
  const older = H.newBackfill({ startISO: iso(100), endISO: iso(99) }, byId);
  H.addEntry(older.draft, bench);
  H.setValues(older.draft, older.draft.entries[0].id, older.draft.entries[0].sets[0].id, { weightKg: 40, reps: 8 });
  assert.ok(H.saveNew(older.draft).ok);
  const list = S.finishedSessions();
  assert.equal(list.length, 3);
  assert.ok(Date.parse(list[0].startedAt) > Date.parse(list[2].startedAt));
  assert.equal(list[2].entries[0].sets[0].weightKg, 40);
  const last = M.lastPerformance(bench.id, S.finishedSessions());
  assert.equal(last.sets[0].weightKg, 60, 'jüngstes Training zählt, nicht das zuletzt eingetragene');
});

test('Bearbeiten bestehender Trainings bleibt wie vorher (saveEdited)', () => {
  const s = S.finishedSessions()[0];
  const d = H.startEdit(s.id);
  d.entries[0].sets[0].reps = 11;
  assert.ok(H.saveEdited(d).ok);
  assert.equal(H.getFinished(s.id).entries[0].sets[0].reps, 11);
  const empty = H.startEdit(s.id); empty.entries = [];
  const r = H.saveEdited(empty);
  assert.ok(!r.ok && r.empty);
});

done();
