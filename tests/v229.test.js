// v2.29.0: Trainingstage pro Plan (A) und „Änderungen in den Plan übernehmen“ (B4).
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const S = await import('../js/session.js');
const SCH = await import('../js/schedule.js');
const SYNC = await import('../js/plan-sync.js');
const { test, done } = runner();

console.log('# v2.29.0');
store.init();
const bench = lib.addFromPool('bench-press-barbell').exercise;
const row = lib.addFromPool('seated-cable-row').exercise;
const squat = lib.addFromPool('back-squat').exercise;
const byId = () => Object.fromEntries(lib.listExercises({ includeArchived: true }).map((e) => [e.id, e]));

// ---------- A: Trainingstage ----------

test('dateKey nach Ortszeit, dayIndex Mo = 0', () => {
  assert.equal(SCH.dateKey(new Date(2026, 9, 19, 23, 59)), '2026-10-19');
  assert.equal(SCH.dayIndex(new Date(2026, 9, 19)), 0); // Montag
  assert.equal(SCH.dayIndex(new Date(2026, 9, 25)), 6); // Sonntag
  assert.equal(SCH.weekKey(new Date(2026, 9, 25, 12)), '2026-10-19');
  assert.equal(SCH.formatDays([3, 0]), 'Mo · Do');
  assert.equal(SCH.formatDays([]), '');
});

test('Validierung: Tage, Wochen, Hinweis-Datum (alle optional)', () => {
  const p = M.createPlan({ name: 'X' });
  assert.deepEqual(M.validatePlan(p), []);
  assert.deepEqual(M.validatePlan({ ...p, days: [0, 3], skipWeeks: ['2026-10-19'], missedAck: '2026-10-20' }), []);
  assert.ok(M.validatePlan({ ...p, days: [7] }).length);
  assert.ok(M.validatePlan({ ...p, days: [1, 1] }).length);
  assert.ok(M.validatePlan({ ...p, skipWeeks: ['19.10.2026'] }).length);
  assert.ok(M.validatePlan({ ...p, missedAck: 'gestern' }).length);
});

const mk = (name, days, createdAt = '2026-10-01T08:00:00.000Z') => ({ ...M.createPlan({ name, days }), createdAt });
const sess = (iso, planId = null) => ({ ...M.createSession({ planId, startedAt: iso }), endedAt: iso });
const TUE = new Date(2026, 9, 20, 9, 0); // Dienstag → gestern = Montag 19.10.

test('Hinweis nur für gestern, nur ohne jedes Training, nur für Pläne mit diesem Tag', () => {
  const a = mk('Push', [0, 3]);
  const b = mk('Beine', [1]);
  const h = SCH.missedHints([a, b], [], TUE);
  assert.equal(h.length, 1);
  assert.equal(h[0].plan.name, 'Push');
  assert.equal(h[0].date, '2026-10-19');
  assert.equal(h[0].day, 'Montag');
});

test('Ein Training mit einem anderen Plan oder ein freies Training am Tag → kein Hinweis', () => {
  const a = mk('Push', [0]);
  const other = mk('Zug', []);
  assert.equal(SCH.missedHints([a, other], [sess(new Date(2026, 9, 19, 18).toISOString(), other.id)], TUE).length, 0);
  assert.equal(SCH.missedHints([a], [sess(new Date(2026, 9, 19, 7).toISOString())], TUE).length, 0);
  // Training vorgestern oder heute zählt nicht für gestern
  assert.equal(SCH.missedHints([a], [sess(new Date(2026, 9, 18, 7).toISOString()), sess(new Date(2026, 9, 20, 7).toISOString())], TUE).length, 1);
});

test('Kein Hinweis: archiviert, erst gestern angelegt, bestätigt, Woche ausgesetzt; nie für vorgestern', () => {
  assert.equal(SCH.missedHints([{ ...mk('A', [0]), archived: true }], [], TUE).length, 0);
  assert.equal(SCH.missedHints([mk('A', [0], new Date(2026, 9, 19, 20).toISOString())], [], TUE).length, 0);
  assert.equal(SCH.missedHints([{ ...mk('A', [0]), missedAck: '2026-10-19' }], [], TUE).length, 0);
  assert.equal(SCH.missedHints([{ ...mk('A', [0]), skipWeeks: ['2026-10-19'] }], [], TUE).length, 0);
  // Mittwoch: Montag liegt zwei Tage zurück → kein Hinweis mehr
  assert.equal(SCH.missedHints([mk('A', [0])], [], new Date(2026, 9, 21, 9)).length, 0);
  // Montag nach einem verpassten Sonntag: die Woche des Sonntags zählt
  const sun = mk('A', [6]);
  assert.equal(SCH.missedHints([sun], [], new Date(2026, 9, 26, 9)).length, 1);
  assert.equal(SCH.missedHints([{ ...sun, skipWeeks: ['2026-10-19'] }], [], new Date(2026, 9, 26, 9)).length, 0);
});

let plan;
test('Plan: Tage setzen, Woche aussetzen und zurück, Hinweis bestätigen', () => {
  plan = P.newPlan('Ganzkörper').plan;
  assert.ok(P.setPlanDays(plan.id, [3, 0]).ok);
  assert.deepEqual(P.getPlan(plan.id).days, [0, 3]);
  assert.equal(P.setPlanDays(plan.id, [8]).ok, false);
  assert.ok(P.skipWeek(plan.id, new Date(2026, 9, 21), new Date(2026, 9, 20)).ok);
  assert.deepEqual(P.getPlan(plan.id).skipWeeks, ['2026-10-19']);
  assert.equal(P.getPlan(plan.id).missedAck, '2026-10-20');
  assert.ok(P.skipWeek(plan.id, new Date(2026, 9, 22)).ok, 'gleiche Woche doppelt');
  assert.deepEqual(P.getPlan(plan.id).skipWeeks, ['2026-10-19']);
  assert.ok(P.unskipWeek(plan.id, new Date(2026, 9, 22)).ok);
  assert.deepEqual(P.getPlan(plan.id).skipWeeks, []);
  assert.ok(P.ackMissed(plan.id, '2026-10-22').ok);
  for (let i = 0; i < 12; i++) P.skipWeek(plan.id, new Date(2026, 0, 5 + 7 * i));
  assert.equal(P.getPlan(plan.id).skipWeeks.length, SCH.SKIP_WEEKS_KEEP);
  assert.ok(P.setPlanDays(plan.id, []).ok);
  assert.deepEqual(P.getPlan(plan.id).days, []);
});

// ---------- B: Änderungen übernehmen ----------

function doAll(entryFilter = () => true) {
  const s = S.activeSession();
  for (const en of s.entries.filter(entryFilter)) {
    for (const set of en.sets.filter((x) => x.type !== 'warmup')) S.completeSet(en.id, set.id, { weightKg: 50, reps: 8 });
  }
}

test('Training aus dem Plan: Einträge kennen ihren Plan-Platz; ohne Abweichung keine Änderungen', () => {
  assert.ok(P.addExercises(plan.id, [squat.id, bench.id, row.id]).ok);
  P.setTargetSets(plan.id, P.getPlan(plan.id).items[0].id, 3);
  P.setTargetSets(plan.id, P.getPlan(plan.id).items[1].id, 3);
  P.setTargetSets(plan.id, P.getPlan(plan.id).items[2].id, 3);
  const r = S.startFromPlan(plan.id);
  assert.ok(r.ok);
  assert.deepEqual(r.session.entries.map((e) => e.planItemId), P.getPlan(plan.id).items.map((i) => i.id));
  doAll();
  const f = S.finish();
  assert.ok(f.ok);
  assert.deepEqual(M.validateSession(f.session), []);
  assert.deepEqual(SYNC.planChanges(f.session, P.getPlan(plan.id), byId()), []);
});

let changes;
test('Abweichungen: Tausch, Satzzahl, hinzugefügt, nicht gemacht', () => {
  const dips = lib.addFromPool('dips').exercise || lib.listExercises()[0];
  const curl = lib.addFromPool('dumbbell-curl').exercise;
  S.startFromPlan(plan.id);
  let s = S.activeSession();
  // 1. Kniebeuge → Bankdrücken-Platz bleibt, Kniebeuge mit 4 Sätzen
  S.addSet(s.entries[0].id);
  // 2. Bankdrücken getauscht gegen Curl
  assert.ok(S.swapEntry(s.entries[1].id, curl.id).ok);
  // 3. Rudern nicht gemacht; 4. Dips hinzugefügt
  assert.ok(S.addEntry(dips.id).ok);
  s = S.activeSession();
  doAll((en) => en.exerciseId !== row.id);
  const f = S.finish();
  assert.ok(f.ok);
  changes = SYNC.planChanges(f.session, P.getPlan(plan.id), byId());
  const kinds = changes.map((c) => c.kind).sort();
  assert.deepEqual(kinds, ['add', 'remove', 'sets', 'swap']);
  assert.equal(changes.find((c) => c.kind === 'sets').to, 4);
  assert.equal(changes.find((c) => c.kind === 'swap').to, curl.id);
  assert.equal(changes.find((c) => c.kind === 'remove').exerciseId, row.id);
  const add = changes.find((c) => c.kind === 'add');
  assert.equal(add.exerciseId, dips.id);
  assert.equal(add.afterItemId, P.getPlan(plan.id).items[1].id, 'hinter dem letzten gemachten Plan-Platz');
  for (const c of changes) assert.ok(c.text && !/undefined|null|NaN/.test(c.text), c.text);
});

test('Nur gewählte Änderungen werden übernommen; nichts gewählt → Fehler, Plan unverändert', () => {
  const before = structuredClone(P.getPlan(plan.id).items);
  assert.equal(P.applyPlanChanges(plan.id, []).ok, false);
  assert.deepEqual(P.getPlan(plan.id).items, before);
  const pick = changes.filter((c) => c.kind === 'swap' || c.kind === 'add');
  assert.ok(P.applyPlanChanges(plan.id, pick).ok);
  const items = P.getPlan(plan.id).items;
  assert.equal(items.length, 4);
  assert.equal(items[0].targetSets, 3, 'Satzzahl nicht gewählt → unverändert');
  assert.equal(items[1].exerciseId, changes.find((c) => c.kind === 'swap').to);
  assert.equal(items[1].id, before[1].id, 'Platz behält seine id');
  assert.equal(items[2].exerciseId, changes.find((c) => c.kind === 'add').exerciseId);
  assert.equal(items[2].targetSets, 3);
  assert.equal(items[3].exerciseId, row.id, 'nicht gemacht, aber nicht gewählt → bleibt');
});

test('Entfernen und Satzzahl übernehmen', () => {
  const pick = changes.filter((c) => c.kind === 'remove' || c.kind === 'sets');
  assert.ok(P.applyPlanChanges(plan.id, pick).ok);
  const items = P.getPlan(plan.id).items;
  assert.equal(items.length, 3);
  assert.equal(items[0].targetSets, 4);
  assert.ok(!items.some((i) => i.exerciseId === row.id));
});

test('Mehrere neue Übungen hinter demselben Platz behalten die Trainingsreihenfolge; Anfang möglich', () => {
  const mkItem = (exerciseId, f = {}) => ({ id: `n-${exerciseId}`, exerciseId, groupId: null, targetSets: null, ...f });
  const items = [{ id: 'i1', exerciseId: 'a', groupId: null, targetSets: null }];
  const out = SYNC.applyChanges(items, [
    { kind: 'add', exerciseId: 'x', sets: 2, afterItemId: 'i1' },
    { kind: 'add', exerciseId: 'y', sets: 12, afterItemId: 'i1' },
    { kind: 'add', exerciseId: 'z', sets: null, afterItemId: null }
  ], mkItem);
  assert.deepEqual(out.map((i) => i.exerciseId), ['z', 'a', 'x', 'y']);
  assert.equal(out[3].targetSets, 10, 'auf 10 begrenzt');
  assert.equal(out[0].targetSets, null);
});

test('Alte Trainings ohne planItemId, freie Trainings, fremder Plan → keine Änderungen', () => {
  const s = { ...M.createSession({ planId: plan.id }), entries: [M.createEntry(bench.id, { sets: [M.createSet({ completedAt: new Date().toISOString(), weightKg: 50, reps: 5 })] })] };
  assert.deepEqual(SYNC.planChanges(s, P.getPlan(plan.id), byId()), []);
  assert.deepEqual(SYNC.planChanges({ ...s, planId: null }, P.getPlan(plan.id), byId()), []);
  assert.deepEqual(SYNC.planChanges(s, null, byId()), []);
});

test('Backup-Validierung akzeptiert die neuen Felder', () => {
  const data = { plans: store.get('plans'), sessions: store.get('sessions') };
  for (const p of data.plans) assert.deepEqual(M.validatePlan(p), [], p.name);
  for (const s of data.sessions) assert.deepEqual(M.validateSession(s), []);
});

done();
