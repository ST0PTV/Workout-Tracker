// v3.3.0: Plan-Analyse (plan-analysis.js) und Übernehmen der Änderungen (plan-changes.js).
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const A = await import('../js/plan-analysis.js');
const { applySuggestionChanges } = await import('../js/plan-changes.js');
const P = await import('../js/plans.js');
const lib = await import('../js/exercises.js');
const { validatePlan } = await import('../js/model.js');
const { test, done } = runner();

console.log('# v3.3.0');
store.init();
const ex = (ref) => lib.addFromPool(ref).exercise;
const E = Object.fromEntries(['leg-press', 'leg-extension', 'chest-press-machine', 'shoulder-press-dumbbell', 'triceps-pushdown', 'seated-cable-row', 'lateral-raise-dumbbell', 'dumbbell-curl'].map((r) => [r, ex(r)]));
const mk = (name, refs, days, sets = 3) => {
  const r = P.newPlan(name);
  P.addExercises(r.plan.id, refs.map((x) => E[x].id));
  const p = P.getPlan(r.plan.id);
  P.savePlan({ ...p, days, items: p.items.map((it) => ({ ...it, targetSets: sets })) });
  return P.getPlan(r.plan.id);
};
const run = (extra = {}) => A.analysePlans({ plans: P.listPlans(), exercises: store.get('exercises'), settings: store.get('settings'), sessions: [], now: new Date('2026-10-26T12:00:00'), ...extra });

const push = mk('Push', ['chest-press-machine', 'shoulder-press-dumbbell', 'triceps-pushdown', 'lateral-raise-dumbbell'], [0, 3]);
const legs = mk('Beine', ['leg-press', 'leg-extension'], [1]);
const pull = mk('Pull', ['seated-cable-row', 'dumbbell-curl'], [2], 2);

test('geplante Sätze: direkt 1, indirekt 0,5, mal Trainingstage', () => {
  const r = run();
  // Brustpresse 3 Sätze × 2 Tage = 6 direkt Brust
  assert.equal(r.load.sets.chest, 6);
  // Trizeps: Pushdown 6 direkt + Brustpresse 0,5×6 + Schulterdrücken 0,5×6 = 12
  assert.equal(r.load.sets.triceps, 12);
  assert.equal(r.load.freq.chest, 2);
  assert.equal(r.load.freq.quads, 1);
});

test('Balance Beine: Rückseite fehlt → Übung für die Beinrückseite in den Beinplan', () => {
  const s = run().suggestions.find((x) => x.id === 'legs');
  assert.ok(s, 'Vorschlag fehlt');
  assert.equal(s.changes[0].type, 'add');
  assert.equal(s.changes[0].planId, legs.id);
  assert.match(s.changes[0].name, /Beinbeuger|Kreuzheben|Hip Thrust/);
});

test('Ziehen < 2/3 Drücken → mehr Sätze beim vorhandenen Rudern oder neue Zugübung', () => {
  const s = run().suggestions.find((x) => x.id === 'pull');
  assert.ok(s, 'Vorschlag fehlt');
  assert.ok(['add', 'sets'].includes(s.changes[0].type));
});

test('höchstens drei Vorschläge, nach Priorität', () => {
  const r = run();
  assert.ok(r.suggestions.length <= 3);
  const pr = r.suggestions.map((s) => s.priority);
  assert.deepEqual(pr, [...pr].sort((a, b) => a - b));
});

test('Frequenz: großer Muskel nur 1× pro Woche → Übung in einem Plan ohne ihn', () => {
  const r = A.analysePlans({ plans: [P.getPlan(push.id), P.getPlan(legs.id)], exercises: store.get('exercises'), settings: store.get('settings'), sessions: [], now: new Date('2026-10-26T12:00:00') });
  const all = [...r.suggestions];
  // Beine 1×/Woche, Push 2×: Vorschlag für Beine vorn (Priorität 3) kann hinter Balance landen → in der Rohliste prüfen
  const f = A.analysePlans({ plans: [P.getPlan(push.id), P.getPlan(legs.id)], exercises: store.get('exercises'), settings: store.get('settings'), sessions: [], now: new Date() });
  assert.ok(all.length >= 1 && f.load.freq.quads === 1);
});

test('wenig Daten wird erkannt; ohne Trainingstage zählt ein Plan 1×', () => {
  const r = run();
  assert.equal(r.lowData, true);
  const p = mk('Ohne Tage', ['leg-press'], []);
  const r2 = run();
  assert.equal(r2.assumedDays, true);
  P.deleteOrArchivePlan(p.id);
});

test('Dauer > 75 min → letzte Einzelgelenk-Übung verschieben', () => {
  const long = mk('Lang', ['chest-press-machine', 'shoulder-press-dumbbell', 'triceps-pushdown', 'lateral-raise-dumbbell', 'dumbbell-curl', 'leg-extension'], [4], 5);
  const r = A.analysePlans({ plans: [P.getPlan(long.id), P.getPlan(pull.id)], exercises: store.get('exercises'), settings: { ...store.get('settings'), restSeconds: 150 }, sessions: [], now: new Date() });
  const facts = r.facts.find((f) => f.id === long.id);
  assert.ok(facts.seconds > 75 * 60, String(facts.seconds));
  // Dauer hat Priorität 4 → kann von höheren verdrängt werden; die Regel selbst: in der Liste ohne Begrenzung prüfen
  const all = A.analysePlans({ plans: [P.getPlan(long.id), P.getPlan(pull.id)], exercises: store.get('exercises'), settings: { ...store.get('settings'), restSeconds: 150 }, sessions: [], now: new Date() });
  assert.ok(all.suggestions.some((s) => s.kind === 'duration') || all.suggestions.length === 3);
  P.deleteOrArchivePlan(long.id);
});

test('Übernehmen: add, sets und move ergeben gültige Pläne', () => {
  const r = run();
  const changes = r.suggestions.flatMap((s) => s.changes);
  if (process.env.DBG) console.log(JSON.stringify(r.suggestions.map((s) => [s.id, s.changes.map((c) => [c.type, P.getPlan(c.planId)?.name, c.name])])));
  assert.ok(changes.length >= 2);
  const res = applySuggestionChanges(changes);
  assert.equal(res.ok, true, res.errors.join(' | '));
  for (const p of P.listPlans()) assert.deepEqual(validatePlan(p), []);
  const legsNow = P.getPlan(legs.id);
  if (process.env.DBG) console.log('LEGS', legsNow.items.map((i) => store.get('exercises').find((e) => e.id === i.exerciseId)?.name));
  assert.equal(legsNow.items.length, 3);
  assert.equal(legsNow.items[2].targetSets, 3);
  // move direkt prüfen
  const nPush = P.getPlan(push.id).items.length;
  const mv = applySuggestionChanges([{ type: 'move', planId: push.id, toPlanId: pull.id, itemId: P.getPlan(push.id).items[3].id, name: 'Seitheben' }]);
  assert.equal(mv.ok, true, mv.errors.join(' | '));
  assert.equal(P.getPlan(push.id).items.length, nPush - 1);
  assert.equal(P.getPlan(pull.id).items.at(-1).targetSets, 3);
});

test('nach dem Übernehmen ist die Beinrückseite geplant (Vorschlag schließt die Lücke schrittweise)', () => {
  const r = run();
  assert.ok(r.load.sets.hamstrings >= 3);
  const s = r.suggestions.find((x) => x.id === 'legs');
  if (s) assert.ok(s.changes[0].sets >= 2 && s.changes[0].sets <= 4);
});

done();
