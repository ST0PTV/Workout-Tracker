// v3.5.0: Mobility als eigener Routinen-Bereich, Gesamtdauer von Routinen und Plänen ändern.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const D = await import('../js/routine-data.js');
const R = await import('../js/routines.js');
const P = await import('../js/plans.js');
const lib = await import('../js/exercises.js');
const { fitPlanToSeconds, planSeconds, FIT_MAX_SETS } = await import('../js/plan-duration.js');
const { validatePlan, validateRoutine } = await import('../js/model.js');
const { test, done } = runner();

console.log('# v3.5.0');
store.init();

test('Mobility ist ein eigener Bereich; die Mobilitäts-Vorlagen liegen dort', () => {
  assert.equal(D.PHASES.mobility, 'Mobility');
  assert.deepEqual(D.TEMPLATES.filter((t) => t.phase === 'mobility').map((t) => t.id).sort(), ['tpl:mob-arms-5', 'tpl:mob-full-15']);
  assert.ok(D.ROUTINE_INFO.short.mobility.length && D.ROUTINE_INFO.mobility.length);
  const own = R.createRoutine({ name: 'Opa', phase: 'mobility', items: [{ ref: 'arm-circles' }] });
  assert.equal(R.saveRoutine(own).ok, true);
  assert.ok(R.listRoutines({ phase: 'mobility' }).some((r) => r.name === 'Opa'));
});

test('Mobility-Routinen lassen sich nicht als Aufwärmen/Cool-down an Pläne hängen', () => {
  const p = P.newPlan('Test').plan;
  assert.equal(R.setPlanRoutine(p.id, 'mobility', 'tpl:mob-arms-5').ok, false);
  assert.equal(R.setPlanRoutine(p.id, 'cooldown', 'tpl:mob-arms-5').ok, false);
});

test('Routine skalieren: Ziel wird ungefähr erreicht, Grenzen und Stufen bleiben gültig', () => {
  const t = R.getRoutine('tpl:mob-full-15');
  const r = R.copyOf(t.id);
  for (const target of [5, 10, 20, 30]) {
    const s = R.scaleRoutine(r, target * 60);
    const min = R.estimateSeconds(s) / 60;
    assert.ok(Math.abs(min - target) <= Math.max(1.5, target * 0.15), `${target}: ${min.toFixed(1)}`);
    assert.deepEqual(validateRoutine({ ...s, name: 'x' }), []);
    for (const it of s.items) if (it.seconds !== null) assert.equal(it.seconds % 5, 0);
  }
  // Untergrenze: nie unter 1 Wdh. bzw. 5 s
  const tiny = R.scaleRoutine(r, 10);
  assert.ok(tiny.items.every((it) => (it.reps === null || it.reps >= 1) && (it.seconds === null || it.seconds >= 5)));
});

test('Dauer-Stufen: unter 5 min in 1er-, darüber in 5er-Schritten', () => {
  assert.equal(R.nextMinutes(15, -1), 10);
  assert.equal(R.nextMinutes(15, 1), 20);
  assert.equal(R.nextMinutes(13, 1), 15);
  assert.equal(R.nextMinutes(13, -1), 10);
  assert.equal(R.nextMinutes(5, -1), 4);
  assert.equal(R.nextMinutes(1, -1), 1);
  assert.equal(R.nextMinutes(4, 1), 5);
});

const ex = (ref) => lib.addFromPool(ref).exercise;
const ids = ['leg-press', 'chest-press-machine', 'seated-cable-row', 'lateral-raise-dumbbell', 'dumbbell-curl'].map((r) => ex(r).id);
const mk = () => {
  const r = P.newPlan(`Plan ${Math.random()}`);
  P.addExercises(r.plan.id, ids);
  const p = P.getPlan(r.plan.id);
  P.savePlan({ ...p, items: p.items.map((it) => ({ ...it, targetSets: 3 })) });
  return P.getPlan(r.plan.id);
};
const exs = () => store.get('exercises');
const st = () => store.get('settings');

test('Plan kürzen: zuerst Einzelgelenk-Übungen, jede Übung behält ≥ 1 Satz, Dauer ≤ Ziel', () => {
  const p = mk();
  const before = planSeconds(p, exs(), st());
  const res = fitPlanToSeconds(p, exs(), st(), before - 5 * 60);
  assert.ok(res.changed);
  assert.ok(res.seconds <= before - 5 * 60);
  const sets = Object.fromEntries(res.items.map((it) => [exs().find((e) => e.id === it.exerciseId).source.ref, it.targetSets]));
  assert.equal(sets['leg-press'], 3, JSON.stringify(sets));
  assert.ok(sets['lateral-raise-dumbbell'] < 3 || sets['dumbbell-curl'] < 3, JSON.stringify(sets));
  const floor = fitPlanToSeconds(p, exs(), st(), 60);
  assert.ok(floor.items.every((it) => it.targetSets >= 1));
  assert.deepEqual(validatePlan({ ...p, items: floor.items }), []);
});

test('Plan verlängern: zuerst mehrgelenkige Übungen, höchstens 5 Sätze, Ziel nicht überschritten', () => {
  const p = mk();
  const before = planSeconds(p, exs(), st());
  const res = fitPlanToSeconds(p, exs(), st(), before + 5 * 60);
  assert.ok(res.changed && res.seconds <= before + 5 * 60 && res.seconds > before);
  const lp = res.items.find((it) => exs().find((e) => e.id === it.exerciseId).source.ref === 'leg-press');
  assert.ok(lp.targetSets > 3);
  const max = fitPlanToSeconds(p, exs(), st(), 600 * 60);
  assert.ok(max.items.every((it) => it.targetSets <= FIT_MAX_SETS));
});

done();
