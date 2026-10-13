// Laufendes Training und Pausen-Timer.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const S = await import('../js/session.js');
const T = await import('../js/timer.js');
const { test, done } = runner();

console.log('# session + timer');
store.init();
const bench = lib.addFromPool('bench-press-barbell').exercise;
const fly = lib.addFromPool('pec-deck').exercise;
const row = lib.addFromPool('seated-cable-row').exercise;
lib.saveExercise({ ...lib.getExercise(fly.id), restSeconds: 90 });
const plan = P.newPlan('Push').plan;
P.addExercises(plan.id, [bench.id, fly.id]);

test('Timer: Restzeit, Ende, Überzeit, ohne Abhängigkeit von Intervallen', () => {
  const start = '2026-10-13T10:00:00.000Z';
  const t = T.startRest('e1', 120, start);
  const at = (s) => Date.parse(start) + s * 1000;
  assert.deepEqual(T.restState(t, at(0)), { remaining: 120, overtime: 0, done: false, progress: 0 });
  assert.equal(T.restState(t, at(30.2)).remaining, 90);
  const end = T.restState(t, at(120));
  assert.equal(end.done, true); assert.equal(end.remaining, 0);
  assert.equal(T.restState(t, at(145)).overtime, 25);
  assert.equal(T.restState(null), null);
});

test('Timer: ±15 s, begrenzt', () => {
  const t = T.startRest('e1', 120);
  assert.equal(T.adjustRest(t, 1).durationSec, 135);
  assert.equal(T.adjustRest(T.startRest('e', 15), -1).durationSec, 15);
});

test('Training aus Plan starten; nur ein laufendes Training', () => {
  const r = S.startFromPlan(plan.id);
  assert.ok(r.ok, r.errors.join('; '));
  assert.equal(r.session.entries.length, 2);
  assert.equal(r.session.entries[0].sets.length, 3, 'Standard-Arbeitssätze');
  assert.equal(S.startEmpty().ok, false);
  assert.equal(S.startFromPlan(plan.id).ok, false);
});

test('Aufwärm-Hinweis: erste Übung ja; zweite Brustübung nach erledigtem Satz nein', () => {
  let v = S.sessionView();
  assert.equal(v.entries[0].warmupHint, true);
  assert.equal(v.entries[1].warmupHint, true, 'noch nichts erledigt');
  const e0 = v.entries[0].entry;
  S.completeSet(e0.id, e0.sets[0].id, { weightKg: 80, reps: 8 });
  v = S.sessionView();
  assert.equal(v.entries[1].warmupHint, false);
});

test('Satz abhaken startet die Pause der Übung (eigene Zeit vor Standard)', () => {
  let s = S.activeSession();
  assert.equal(s.restTimer.durationSec, 120, 'Bankdrücken: Standard 2:00');
  assert.equal(s.restTimer.entryId, s.entries[0].id);
  const e1 = s.entries[1];
  S.completeSet(e1.id, e1.sets[0].id, { weightKg: 50, reps: 12 });
  s = S.activeSession();
  assert.equal(s.restTimer.durationSec, 90, 'Butterfly: eigene 1:30');
  assert.ok(S.adjustRunningRest(1).ok);
  assert.equal(S.activeSession().restTimer.durationSec, 105);
  assert.ok(S.stopRest().ok);
  assert.equal(S.activeSession().restTimer, null);
});

test('Sätze ändern, abhaken rückgängig, hinzufügen, Aufwärmsatz vorn, entfernen', () => {
  const e = S.activeSession().entries[0];
  S.updateSet(e.id, e.sets[1].id, { weightKg: 82.5, reps: 6 });
  assert.equal(S.activeSession().entries[0].sets[1].weightKg, 82.5);
  S.uncompleteSet(e.id, e.sets[0].id);
  assert.equal(S.activeSession().entries[0].sets[0].completedAt, null);
  S.completeSet(e.id, e.sets[0].id, { weightKg: 80, reps: 8 });
  S.addSet(e.id, 'work');
  const sets = S.activeSession().entries[0].sets;
  assert.equal(sets.length, 4);
  assert.equal(sets[3].weightKg, sets[2].weightKg, 'übernimmt Werte des letzten Satzes');
  S.addSet(e.id, 'warmup');
  assert.equal(S.activeSession().entries[0].sets[0].type, 'warmup');
  S.removeSet(e.id, S.activeSession().entries[0].sets[0].id);
  assert.equal(S.activeSession().entries[0].sets.length, 4);
  assert.equal(S.updateSet(e.id, 'x', {}).ok, false);
});

test('Ungültige Werte werden abgelehnt und nichts gespeichert', () => {
  const e = S.activeSession().entries[0];
  const before = JSON.stringify(S.activeSession());
  assert.equal(S.updateSet(e.id, e.sets[1].id, { reps: -3 }).ok, false);
  assert.equal(JSON.stringify(S.activeSession()), before);
});

test('Übung hinzufügen (vorbelegt), verschieben, entfernen', () => {
  assert.ok(S.addEntry(row.id).ok);
  let s = S.activeSession();
  assert.equal(s.entries[2].exerciseId, row.id);
  S.moveEntry(s.entries[2].id, 0);
  s = S.activeSession();
  assert.equal(s.entries[0].exerciseId, row.id);
  S.removeEntry(s.entries[0].id);
  assert.equal(S.activeSession().entries.length, 2);
});

test('Beenden entfernt nicht erledigte Sätze; Werte dienen als Vorbelegung fürs nächste Mal', () => {
  const r = S.finish();
  assert.ok(r.ok, r.errors.join('; '));
  assert.equal(S.activeSession(), null);
  const fin = S.finishedSessions()[0];
  assert.ok(fin.endedAt);
  assert.ok(fin.entries.every((e) => e.sets.every((x) => x.completedAt)));
  assert.equal(fin.restTimer, null);
  const r2 = S.startFromPlan(plan.id);
  const benchSets = r2.session.entries[0].sets;
  assert.deepEqual(benchSets.map((x) => [x.weightKg, x.reps]), [[80, 8]], 'nur erledigter Satz vom letzten Mal');
  assert.ok(benchSets.every((x) => x.completedAt === null));
});

test('Beenden ohne erledigten Satz → Hinweis; Verwerfen löscht', () => {
  const r = S.finish();
  assert.equal(r.ok, false); assert.equal(r.empty, true);
  assert.ok(S.discard().ok);
  assert.equal(S.activeSession(), null);
  assert.equal(S.finishedSessions().length, 1);
});

test('Freies Training ohne Plan', () => {
  assert.ok(S.startEmpty().ok);
  assert.ok(S.addEntry(bench.id).ok);
  assert.equal(S.activeSession().planId, null);
  S.discard();
});

test('Alle Daten bleiben gültig', () => {
  assert.deepEqual(M.validateData(store.snapshot()), []);
});

done();
