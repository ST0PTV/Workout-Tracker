// v1.3: Übungsgruppen, Tausch-Kandidaten, Tausch im laufenden Training.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const S = await import('../js/session.js');
const H = await import('../js/history.js');
const G = await import('../js/groups.js');
const PR = await import('../js/progress.js');
const { test, done } = runner();

console.log('# groups (Gruppen und Tausch)');
store.init();
const mk = (name) => lib.saveExercise(M.createExercise({ name, muscles: { primary: ['quads'], secondary: ['glutes'] }, defaultWorkSets: 3 })).exercise;
const press = mk('Beinpresse');
const hack = mk('Hack Squat');
const squat = mk('Kniebeuge');
const curl = mk('Beinbeuger');
const T = (d) => new Date(Date.UTC(2026, 9, d, 10)).toISOString();

let legs;
test('Gruppe anlegen: Name getrimmt, eindeutig (Groß/klein egal), nicht leer', () => {
  const r = G.addGroup('  Beine   Grundübung ');
  assert.ok(r.ok); legs = r.group;
  assert.equal(legs.name, 'Beine Grundübung');
  assert.equal(G.addGroup('beine grundübung').ok, false);
  assert.equal(G.addGroup('   ').ok, false);
  assert.ok(G.renameGroup(legs.id, 'Beine Grundübung').ok, 'Umbenennen auf eigenen Namen erlaubt');
});

test('Mitglieder: aktive Übungen, sortiert; archivierte nie', () => {
  for (const e of [press, hack, squat]) assert.ok(lib.saveExercise({ ...lib.getExercise(e.id), groupIds: [legs.id] }).ok);
  assert.deepEqual(G.groupMembers(legs.id).map((e) => e.name), ['Beinpresse', 'Hack Squat', 'Kniebeuge']);
  lib.setArchived(squat.id, true);
  assert.deepEqual(G.groupMembers(legs.id).map((e) => e.name), ['Beinpresse', 'Hack Squat']);
  lib.setArchived(squat.id, false);
});

test('Kandidaten: aus den Gruppen der geplanten Übung, ohne die aktuelle; geplante nach Tausch dabei', () => {
  const en = M.createEntry(press.id);
  assert.deepEqual(G.swapCandidates(en).candidates.map((e) => e.name), ['Hack Squat', 'Kniebeuge']);
  const swapped = { ...en, exerciseId: hack.id, plannedExerciseId: press.id };
  assert.deepEqual(G.swapCandidates(swapped).candidates.map((e) => e.name), ['Beinpresse', 'Kniebeuge']);
  assert.deepEqual(G.swapCandidates(M.createEntry(curl.id)).candidates, [], 'ohne Gruppe keine Kandidaten');
});

test('Plan-groupId schränkt optional auf eine Gruppe ein; unbekannte Gruppe wird ignoriert', () => {
  const other = G.addGroup('Quadrizeps').group;
  lib.saveExercise({ ...lib.getExercise(press.id), groupIds: [legs.id, other.id] });
  lib.saveExercise({ ...lib.getExercise(curl.id), groupIds: [other.id] });
  const en = M.createEntry(press.id);
  assert.deepEqual(G.swapCandidates(en).candidates.map((e) => e.name), ['Hack Squat', 'Kniebeuge', 'Beinbeuger']);
  assert.deepEqual(G.swapCandidates({ ...en, groupId: other.id }).candidates.map((e) => e.name), ['Beinbeuger']);
  assert.equal(G.swapCandidates({ ...en, groupId: 'gibt-es-nicht' }).candidates.length, 3);
  assert.ok(G.deleteGroup(other.id).ok);
});

test('Gruppe löschen bereinigt Übungen und Pläne; Daten bleiben gültig', () => {
  const tmp = G.addGroup('Temp').group;
  lib.saveExercise({ ...lib.getExercise(curl.id), groupIds: [tmp.id] });
  const plan = P.newPlan('Beine').plan;
  P.addExercises(plan.id, [press.id, curl.id]);
  const stored = store.get('plans');
  stored.find((p) => p.id === plan.id).items[1].groupId = tmp.id;
  store.set('plans', stored);
  assert.deepEqual(M.validateData(store.snapshot()), []);
  assert.ok(G.deleteGroup(tmp.id).ok);
  assert.deepEqual(lib.getExercise(curl.id).groupIds, []);
  assert.equal(P.getPlan(plan.id).items[1].groupId, null);
  assert.deepEqual(M.validateData(store.snapshot()), []);
});

test('Tausch ohne erledigten Satz: Übung ersetzt, „statt“ gemerkt, Vorbelegung der neuen Übung', () => {
  // Historie für Hack Squat: 2 Sätze à 100 kg
  store.set('sessions', [M.createSession({ startedAt: T(1), endedAt: T(1), entries: [M.createEntry(hack.id, { sets: [1, 2].map(() => M.createSet({ weightKg: 100, reps: 10, completedAt: T(1) })) })] })]);
  const plan = P.newPlan('Beine 2').plan;
  P.addExercises(plan.id, [press.id]);
  const items = store.get('plans'); items.find((p) => p.id === plan.id).items[0].targetSets = 4; store.set('plans', items);
  assert.ok(S.startFromPlan(plan.id).ok);
  let en = S.activeSession().entries[0];
  assert.equal(en.targetSets, 4);
  assert.equal(en.sets.length, 4);
  const r = S.swapEntry(en.id, hack.id);
  assert.ok(r.ok); assert.equal(r.mode, 'swapped');
  en = S.activeSession().entries[0];
  assert.equal(en.exerciseId, hack.id);
  assert.equal(en.plannedExerciseId, press.id);
  assert.deepEqual(en.sets.map((x) => x.weightKg), [100, 100], 'Werte vom letzten Mal der neuen Übung');
});

test('Tausch auf Übung ohne Historie: Satzzahl aus dem Plan (Entscheidung c); zurück: kein „statt“', () => {
  let en = S.activeSession().entries[0];
  assert.ok(S.swapEntry(en.id, squat.id).ok);
  en = S.activeSession().entries[0];
  assert.equal(en.sets.length, 4, 'Plan sagt 4, Standard der Übung wäre 3');
  assert.equal(en.plannedExerciseId, press.id);
  assert.ok(S.swapEntry(en.id, press.id).ok);
  en = S.activeSession().entries[0];
  assert.equal(en.exerciseId, press.id);
  assert.equal(en.plannedExerciseId, null);
  assert.equal(S.swapEntry(en.id, press.id).ok, false, 'gleiche Übung');
});

test('Tausch nach erledigtem Satz: neue Übung als eigener Eintrag dahinter (Entscheidung b)', () => {
  let en = S.activeSession().entries[0];
  assert.ok(S.completeSet(en.id, en.sets[0].id, { weightKg: 140, reps: 10 }).ok);
  const r = S.swapEntry(en.id, hack.id);
  assert.ok(r.ok); assert.equal(r.mode, 'inserted'); assert.equal(r.index, 1);
  const s = S.activeSession();
  assert.deepEqual(s.entries.map((e) => e.exerciseId), [press.id, hack.id]);
  assert.equal(s.entries[0].sets[0].completedAt !== null, true, 'erledigter Satz bleibt');
  assert.equal(s.entries[1].plannedExerciseId, null);
  assert.equal(s.entries[1].targetSets, 4);
});

test('Fortschritt bleibt pro Übung: getauschtes Training zählt für die gemachte Übung', () => {
  const s = S.activeSession();
  assert.ok(S.completeSet(s.entries[1].id, s.entries[1].sets[0].id, { weightKg: 105, reps: 8 }).ok);
  const fin = S.finish();
  assert.ok(fin.ok);
  const rowsHack = PR.exerciseProgress(hack.id, store.get('sessions'));
  assert.equal(rowsHack.at(-1).topSet.weightKg, 105);
  const rowsPress = PR.exerciseProgress(press.id, store.get('sessions'));
  assert.equal(rowsPress.at(-1).topSet.weightKg, 140);
  assert.deepEqual(M.validateData(store.snapshot()), []);
});

test('Gleiche Übung zweimal nach Einfügen: Vorbelegung nimmt den letzten Eintrag', () => {
  assert.ok(S.startEmpty().ok);
  assert.ok(S.addEntry(hack.id).ok);
  let en = S.activeSession().entries[0];
  assert.ok(S.completeSet(en.id, en.sets[0].id, { weightKg: 90, reps: 10 }).ok);
  assert.ok(S.swapEntry(en.id, squat.id).ok);
  en = S.activeSession().entries[1];
  assert.ok(S.swapEntry(en.id, hack.id).ok, 'zweiter Eintrag: Kniebeuge → Hack Squat');
  const s = S.activeSession();
  assert.deepEqual(s.entries.map((e) => e.exerciseId), [hack.id, hack.id]);
  assert.ok(S.completeSet(s.entries[1].id, s.entries[1].sets[0].id, { weightKg: 110, reps: 6 }).ok);
  assert.ok(S.finish().ok);
  assert.equal(M.lastPerformance(hack.id, H.finishedSessions()).sets[0].weightKg, 110);
  assert.equal(PR.exerciseProgress(hack.id, store.get('sessions')).filter((r) => r.date === H.finishedSessions()[0].startedAt).length, 1);
});

done();
