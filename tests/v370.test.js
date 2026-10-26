// v3.7.0 (#303): ausdrückliche Einordnung mehrgelenkig/eingelenkig je Pool-Übung statt Heuristik.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const { POOL, COMPOUND_REFS, ISOLATION_REFS, poolEntry, exerciseFromPool } = await import('../js/pool.js');
const { SLOTS } = await import('../js/plan-builder.js');
const { isCompound } = await import('../js/plan-analysis.js');
const { fitPlanToSeconds, planSeconds } = await import('../js/plan-duration.js');
const { createExercise, createPlanItem } = await import('../js/model.js');
const { test, done } = runner();

console.log('# v3.7.0');
store.init();

test('jede Kraftübung steht in genau einer Liste; Listen ohne Doppelungen und ohne unbekannte refs; Cardio in keiner', () => {
  const refs = new Set(POOL.map((p) => p.ref));
  assert.equal(new Set(COMPOUND_REFS).size, COMPOUND_REFS.length);
  assert.equal(new Set(ISOLATION_REFS).size, ISOLATION_REFS.length);
  for (const r of [...COMPOUND_REFS, ...ISOLATION_REFS]) assert.ok(refs.has(r), `unbekannt: ${r}`);
  assert.deepEqual(COMPOUND_REFS.filter((r) => ISOLATION_REFS.includes(r)), []);
  for (const p of POOL) {
    const n = Number(COMPOUND_REFS.includes(p.ref)) + Number(ISOLATION_REFS.includes(p.ref));
    assert.equal(n, p.kind === 'cardio' ? 0 : 1, p.ref);
    assert.equal(p.compound, COMPOUND_REFS.includes(p.ref), p.ref);
  }
});

test('Plan-Assistent: alle Übungen der mehrgelenkigen Slots sind mehrgelenkig; Ausnahmen sind nur Dips (Trizeps-Slot)', () => {
  const inCompoundSlots = new Set(Object.values(SLOTS).filter((s) => s.compound).flatMap((s) => s.refs));
  assert.deepEqual([...inCompoundSlots].filter((r) => !poolEntry(r)?.compound), []);
  const inIsoSlots = Object.values(SLOTS).filter((s) => !s.compound).flatMap((s) => s.refs);
  assert.deepEqual(inIsoSlots.filter((r) => poolEntry(r)?.compound).sort(), ['bench-dips', 'machine-triceps-dip']);
});

test('Regelfälle: Dips mehrgelenkig; Seitheben, Fliegende, Shrugs, Face Pull, Sissy Squat, Curls eingelenkig', () => {
  for (const r of ['dips', 'bench-dips', 'back-squat', 'deadlift', 'pull-up', 'dumbbell-step-up']) assert.equal(poolEntry(r).compound, true, r);
  for (const r of ['lateral-raise-dumbbell', 'dumbbell-fly', 'dumbbell-shrug', 'face-pull', 'sissy-squat', 'dumbbell-curl', 'leg-extension', 'plank']) assert.equal(poolEntry(r).compound, false, r);
});

test('isCompound: Pool-Übung nach Einordnung (nicht nach Muskelzahl), eigene Übung nach Heuristik', () => {
  // Seitheben hat 4 beteiligte Muskeln – früher fälschlich „compound“
  assert.equal(isCompound(exerciseFromPool(poolEntry('lateral-raise-dumbbell'))), false);
  assert.equal(isCompound(exerciseFromPool(poolEntry('hip-thrust'))), true); // nur 1 Muskel, aber mehrgelenkig geführt
  const own3 = createExercise({ name: 'Eigene A', muscles: { primary: ['chest'], secondary: ['triceps', 'front-delts'] } });
  const own2 = createExercise({ name: 'Eigene B', muscles: { primary: ['biceps'], secondary: ['forearms'] } });
  assert.equal(isCompound(own3), true);
  assert.equal(isCompound(own2), false);
  assert.equal(isCompound(undefined), false);
});

test('Plan kürzen: Seitheben (früher fälschlich mehrgelenkig) verliert Sätze vor der Kniebeuge', () => {
  const squat = exerciseFromPool(poolEntry('back-squat'));
  const lat = exerciseFromPool(poolEntry('lateral-raise-dumbbell'));
  const exercises = [squat, lat];
  const plan = { id: 'p1', name: 'T', archived: false, days: [], items: [createPlanItem(squat.id, { targetSets: 3 }), createPlanItem(lat.id, { targetSets: 4 })] };
  const settings = store.get('settings');
  const before = planSeconds(plan, exercises, settings);
  const res = fitPlanToSeconds(plan, exercises, settings, before - 3 * 60);
  assert.ok(res.changed);
  const sets = Object.fromEntries(res.items.map((it) => [it.exerciseId === squat.id ? 'squat' : 'lat', it.targetSets]));
  assert.equal(sets.squat, 3, JSON.stringify(sets));
  assert.ok(sets.lat < 4, JSON.stringify(sets));
});

done();
