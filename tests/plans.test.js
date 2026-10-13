// Trainingspläne: Anlegen, Übungen hinzufügen/entfernen/verschieben, Sätze, Archiv, Anzeige-Daten.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const { test, done } = runner();

console.log('# plans');
store.init();
const bench = lib.addFromPool('bench-press-barbell').exercise;
const row = lib.addFromPool('seated-cable-row').exercise;
const squat = lib.addFromPool('back-squat').exercise;

let plan;
test('Plan anlegen; leerer oder doppelter Name abgelehnt', () => {
  assert.equal(P.newPlan('  ').ok, false);
  const r = P.newPlan(' Ganzkörper A ');
  assert.ok(r.ok, r.errors.join('; '));
  plan = r.plan;
  assert.equal(plan.name, 'Ganzkörper A');
  assert.equal(P.newPlan('ganzkörper a').ok, false);
});

test('Übungen in Reihenfolge hinzufügen; unbekannte Übung abgelehnt', () => {
  assert.ok(P.addExercises(plan.id, [squat.id, bench.id, row.id]).ok);
  assert.deepEqual(P.getPlan(plan.id).items.map((i) => i.exerciseId), [squat.id, bench.id, row.id]);
  assert.equal(P.addExercises(plan.id, ['gibt-es-nicht']).ok, false);
  assert.equal(P.getPlan(plan.id).items.length, 3, 'unverändert nach Fehler');
  assert.equal(P.addExercises(plan.id, []).ok, false);
});

test('Verschieben (auch über die Grenzen hinaus begrenzt)', () => {
  const items = P.getPlan(plan.id).items;
  P.moveItem(plan.id, items[2].id, 0);
  assert.deepEqual(P.getPlan(plan.id).items.map((i) => i.exerciseId), [row.id, squat.id, bench.id]);
  P.moveItem(plan.id, items[2].id, 99);
  assert.deepEqual(P.getPlan(plan.id).items.map((i) => i.exerciseId), [squat.id, bench.id, row.id]);
});

test('Sätze überschreiben und zurücksetzen; ungültige Werte abgelehnt', () => {
  const it = P.getPlan(plan.id).items[1];
  assert.ok(P.setTargetSets(plan.id, it.id, 4).ok);
  assert.equal(P.getPlan(plan.id).items[1].targetSets, 4);
  assert.equal(P.setTargetSets(plan.id, it.id, 0).ok, false);
  assert.equal(P.setTargetSets(plan.id, it.id, 2.5).ok, false);
  assert.ok(P.setTargetSets(plan.id, it.id, null).ok);
  assert.equal(P.getPlan(plan.id).items[1].targetSets, null);
});

test('Eintrag entfernen', () => {
  const it = P.getPlan(plan.id).items[2];
  assert.ok(P.removeItem(plan.id, it.id).ok);
  assert.equal(P.getPlan(plan.id).items.length, 2);
  assert.equal(P.removeItem(plan.id, 'x').ok, false);
});

test('Anzeige-Daten: effektive Sätze, letzte Arbeitssätze ohne Aufwärmen, archivierte Übung markiert', () => {
  const p = P.getPlan(plan.id);
  P.setTargetSets(plan.id, p.items[0].id, 5);
  const session = M.createSession({
    planId: plan.id,
    entries: [M.createEntry(bench.id, { sets: [
      M.createSet({ type: 'warmup', weightKg: 40, reps: 10, completedAt: new Date().toISOString() }),
      M.createSet({ weightKg: 82.5, reps: 8, completedAt: new Date().toISOString() }),
      M.createSet({ weightKg: 82.5, reps: 6, completedAt: new Date().toISOString() })
    ] })]
  });
  store.set('sessions', [session]);
  lib.setArchived(squat.id, true);
  const byId = Object.fromEntries(lib.listExercises({ includeArchived: true }).map((e) => [e.id, e]));
  const d = P.planDetails(P.getPlan(plan.id), byId, store.get('sessions'));
  assert.equal(d[0].sets, 5);
  assert.equal(d[0].setsOverridden, true);
  assert.equal(d[0].archivedExercise, true);
  assert.equal(d[1].sets, 3);
  assert.equal(d[1].last.sets.length, 2, 'ohne Aufwärmsatz');
  assert.equal(P.formatLastSets(d[1].last.sets), '82,5 kg × 8, 82,5 × 6');
  assert.equal(d[0].last, null);
  lib.setArchived(squat.id, false);
});

test('Löschen: benutzter Plan wird archiviert, unbenutzter gelöscht', () => {
  const r = P.deleteOrArchivePlan(plan.id);
  assert.ok(r.ok && r.archived);
  assert.equal(P.listPlans().length, 0);
  assert.equal(P.listPlans({ includeArchived: true }).length, 1);
  const unused = P.newPlan('Test').plan;
  const r2 = P.deleteOrArchivePlan(unused.id);
  assert.ok(r2.ok && r2.deleted);
  assert.equal(P.getPlan(unused.id), null);
});

test('Gespeicherte Daten bleiben insgesamt gültig (Verweise)', () => {
  assert.deepEqual(M.validateData(store.snapshot()), []);
});

done();
