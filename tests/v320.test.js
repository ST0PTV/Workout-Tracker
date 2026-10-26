// v3.2.0: Plan-Assistent – Regeln (plan-builder.js) und Anlegen (plan-apply.js).
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const B = await import('../js/plan-builder.js');
const { applyProgram } = await import('../js/plan-apply.js');
const P = await import('../js/plans.js');
const lib = await import('../js/exercises.js');
const { poolEntry } = await import('../js/pool.js');
const { validatePlan } = await import('../js/model.js');
const { test, done } = runner();

console.log('# v3.2.0');
store.init();

const gym = { goal: 'muscle', days: 3, minutes: 45, gear: null, level: 'new' };

test('alle Kandidaten existieren im Pool', () => {
  assert.deepEqual(B.ALL_REFS.filter((r) => !B.POOL_REFS.has(r)), []);
});

test('Antworten werden geprüft (unbekannt → Standard)', () => {
  const a = B.normalizeAnswers({ goal: 'x', days: 9, minutes: 1, gear: 'y', level: 'z' });
  assert.deepEqual(a, { goal: 'muscle', weekdays: null, days: 3, minutes: 45, gear: null, level: 'new' }); // weekdays seit 3.8.0
});

test('Split je Tage; jeder Plan mit Wochentagen, Summe = Tage', () => {
  for (const d of B.DAY_OPTIONS) {
    const p = B.buildProgram({ ...gym, days: d });
    assert.equal(p.plans.reduce((n, x) => n + x.days.length, 0), d);
    assert.ok(p.plans.every((x) => x.items.length >= 3));
  }
});

test('Einsteiger: 2 Sätze, 8–12 bei Grundübungen; Haltübungen ohne Bereich', () => {
  const p = B.buildProgram(gym);
  const a = p.plans[0];
  assert.ok(a.items.every((it) => it.sets === 2));
  const squat = a.items.find((it) => it.slot === 'squat');
  assert.deepEqual(squat.repRange, { min: 8, max: 12 });
  const plank = p.plans.flatMap((x) => x.items).find((it) => it.ref === 'plank');
  assert.equal(plank.repRange, null);
});

test('Kraft mit Erfahrung: 4–6 Wdh. und 3 min Pause bei Grundübungen; Einzelgelenk 10–15', () => {
  const p = B.buildProgram({ ...gym, goal: 'strength', level: 'long', days: 4, minutes: 60 });
  const c = p.plans[0].items.find((it) => B.SLOTS[it.slot].compound);
  assert.deepEqual(c.repRange, { min: 4, max: 6 });
  assert.equal(c.restSeconds, 180);
  const iso = p.plans.flatMap((x) => x.items).find((it) => !B.SLOTS[it.slot].compound && it.repRange);
  assert.deepEqual(iso.repRange, { min: 10, max: 15 });
});

test('mehrgelenkige Übungen stehen vor eingelenkigen', () => {
  for (const d of B.DAY_OPTIONS) {
    for (const plan of B.buildProgram({ ...gym, days: d }).plans) {
      const flags = plan.items.map((it) => B.SLOTS[it.slot].compound);
      const firstIso = flags.indexOf(false);
      if (firstIso >= 0) assert.ok(flags.slice(firstIso).every((f) => !f), `${plan.name}: ${plan.items.map((i) => i.ref).join(',')}`);
    }
  }
});

test('geschätzte Dauer bleibt im Zeitrahmen (außer Mindestumfang von 3 Übungen)', () => {
  for (const minutes of B.TIME_OPTIONS) {
    for (const plan of B.buildProgram({ ...gym, minutes }).plans) {
      if (plan.items.length > 3) assert.ok(plan.seconds <= minutes * 60, `${plan.name} ${minutes}: ${plan.seconds}`);
    }
  }
});

test('jeder große Muskel mind. 2× pro Woche (Studio, 2–5 Tage)', () => {
  const big = ['chest', 'lats', 'quads', 'hamstrings', 'glutes'];
  for (const d of B.DAY_OPTIONS) {
    const p = B.buildProgram({ ...gym, days: d, minutes: 60 });
    for (const m of big) {
      const times = p.plans.reduce((n, plan) => n + (plan.items.some((it) => poolEntry(it.ref).muscles.primary.includes(m) || poolEntry(it.ref).muscles.secondary.includes(m)) ? plan.days.length : 0), 0);
      assert.ok(times >= 2, `${d} Tage: ${m} nur ${times}×`);
    }
  }
});

test('Geräte: nur passende Übungen; fehlende Muster werden gemeldet', () => {
  const p = B.buildProgram({ ...gym, gear: ['dumbbell', 'bench'] });
  const refs = p.plans.flatMap((x) => x.items.map((it) => it.ref));
  assert.ok(refs.every((r) => ['dumbbell', 'bodyweight'].includes(poolEntry(r).equipment)), refs.join(','));
  assert.ok(p.missing.includes('vpull'));
  const body = B.buildProgram({ ...gym, gear: [] });
  // v3.4.0: Kniebeuge, Ausfallschritt, Hüftstreckung und Drücken über Kopf gehen jetzt ohne Geräte; Rudern nicht.
  for (const s of ['squat', 'lunge', 'hinge']) assert.ok(!body.missing.includes(s), s);
  assert.ok(body.missing.includes('hpull'));
  assert.ok(body.plans.flatMap((x) => x.items.map((it) => it.ref)).includes('bodyweight-squat'));
});

test('v3.4.0: Balanceboard ist eigenes Gerät, Stuhl-Kniebeuge und Türrahmen-Push-up ohne Zubehör', async () => {
  const { gearOf, GEAR } = await import('../js/pool.js');
  assert.equal(GEAR.balance, 'Balanceboard');
  assert.deepEqual(gearOf(poolEntry('balance-board-calf-raise')), ['balance']);
  assert.deepEqual(gearOf(poolEntry('chair-squat')), []);
  assert.deepEqual(gearOf(poolEntry('door-frame-push-up')), []);
});

test('Wochensätze: direkt 1, indirekt 0,5', () => {
  const w = B.weeklyMuscleSets([{ days: [0, 3], items: [{ ref: 'bench-press-barbell', sets: 3 }] }]);
  assert.equal(w.chest, 6);
  assert.equal(w.triceps, 3);
});

test('uniqueName hängt (2) an', () => {
  assert.equal(B.uniqueName('Ganzkörper A', ['ganzkörper a']), 'Ganzkörper A (2)');
  assert.equal(B.uniqueName('Neu', ['Alt']), 'Neu');
});

test('Übernehmen legt Übungen und gültige Pläne mit Tagen, Sätzen, Bereich und Pause an', () => {
  lib.addFromPool('leg-press'); // schon in der Bibliothek → wird wiederverwendet
  const before = store.get('exercises').length;
  const prog = B.buildProgram(gym);
  const r = applyProgram(prog);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.count, 2);
  const plans = P.listPlans();
  assert.equal(plans.length, 2);
  for (const pl of plans) assert.deepEqual(validatePlan(pl), []);
  const a = plans.find((x) => x.name === 'Ganzkörper A');
  assert.deepEqual(a.days, [0, 4]);
  assert.equal(a.items[0].targetSets, 2);
  assert.deepEqual(a.items[0].repRange, { min: 8, max: 12 });
  assert.equal(a.items[0].restSeconds, 120);
  const legPress = store.get('exercises').filter((e) => e.source?.ref === 'leg-press');
  assert.equal(legPress.length, 1);
  assert.ok(store.get('exercises').length > before);
});

test('zweites Übernehmen: neue Namen, keine doppelten Übungen', () => {
  const n = store.get('exercises').length;
  const r = applyProgram(B.buildProgram(gym));
  assert.equal(r.ok, true);
  assert.ok(P.listPlans().some((p) => p.name === 'Ganzkörper A (2)'));
  assert.equal(store.get('exercises').length, n);
});

done();
