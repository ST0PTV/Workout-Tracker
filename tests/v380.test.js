// v3.8.0: Wochentage im Plan-Assistenten frei wählbar (Split bleibt, die Tage werden der Reihe nach belegt).
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const B = await import('../js/plan-builder.js');
const P = await import('../js/plans.js');
const { applyProgram } = await import('../js/plan-apply.js');
const { gearOf, poolEntry } = await import('../js/pool.js');
const { planSeconds } = await import('../js/plan-duration.js');
const { test, done } = runner();

console.log('# v3.8.0');
store.init();
const gym = { goal: 'muscle', days: 3, minutes: 45, gear: null, level: 'new' };
const daysOf = (prog) => prog.plans.map((p) => [p.name, p.days]);

test('Reihenfolge der Trainings je Tageszahl entspricht den bisherigen Standardtagen', () => {
  assert.deepEqual(B.sessionOrder(2), ['fbA', 'fbB']);
  assert.deepEqual(B.sessionOrder(3), ['fbA', 'fbB', 'fbA']);
  assert.deepEqual(B.sessionOrder(4), ['upper', 'lower', 'upper', 'lower']);
  assert.deepEqual(B.sessionOrder(5), ['push', 'pull', 'legs', 'upper', 'lower']);
  assert.deepEqual(B.sessionOrder(1), ['fbA']);
  assert.deepEqual(B.sessionOrder(6), ['push', 'pull', 'legs', 'push', 'pull', 'legs']);
  assert.deepEqual(B.DEFAULT_WEEKDAYS, { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] });
});

test('Rückwärtskompatibel: die Standardtage ergeben genau den früheren Vorschlag (Pläne, Übungen, Tage)', () => {
  for (const d of B.DAY_OPTIONS) {
    const old = B.buildProgram({ ...gym, days: d });
    const neu = B.buildProgram({ ...gym, days: d, weekdays: B.DEFAULT_WEEKDAYS[d] });
    assert.deepEqual(neu.plans, old.plans, `${d} Tage`);
    assert.deepEqual(neu.weekly, old.weekly, `${d} Tage`);
  }
});

test('Eigene Tage: gewählte Tage werden der Reihe nach auf die Trainings verteilt', () => {
  assert.deepEqual(daysOf(B.buildProgram({ ...gym, weekdays: [1, 3, 5] })), [['Ganzkörper A', [1, 5]], ['Ganzkörper B', [3]]]);
  assert.deepEqual(daysOf(B.buildProgram({ ...gym, weekdays: [5, 2] })), [['Ganzkörper A', [2]], ['Ganzkörper B', [5]]]);
  assert.deepEqual(daysOf(B.buildProgram({ ...gym, weekdays: [0, 1, 2, 3] })), [['Oberkörper', [0, 2]], ['Unterkörper', [1, 3]]]);
  assert.deepEqual(daysOf(B.buildProgram({ ...gym, weekdays: [1, 2, 4, 5, 6] })),
    [['Drücken', [1]], ['Ziehen', [2]], ['Beine', [4]], ['Oberkörper', [5]], ['Unterkörper', [6]]]);
});

test('Die Zahl der gewählten Tage bestimmt den Split, auch gegen ein abweichendes days', () => {
  const p = B.buildProgram({ ...gym, days: 2, weekdays: [0, 1, 3, 4] });
  assert.equal(p.answers.days, 4);
  assert.equal(p.splitLabel, 'Oberkörper / Unterkörper');
  assert.equal(p.plans.flatMap((x) => x.days).length, 4);
});

test('Wochensätze: gleiche Tageszahl ergibt dieselbe Summe, mehr Tage ergeben mehr Sätze', () => {
  const a = B.buildProgram({ ...gym, weekdays: [0, 2, 4] }).weekly;
  const b = B.buildProgram({ ...gym, weekdays: [1, 3, 5] }).weekly;
  assert.deepEqual(a, b);
  const two = B.buildProgram({ ...gym, weekdays: [0, 3] }).weekly;
  assert.ok(Object.values(a).reduce((x, y) => x + y, 0) > Object.values(two).reduce((x, y) => x + y, 0));
});

test('Ungültige Krafttage fallen auf days zurück: 7 Krafttage, doppelt, außerhalb, falscher Typ, leer ohne Cardio', () => {
  for (const bad of [[0, 1, 2, 3, 4, 5, 6], [1, 1, 2], [0, 7], [-1, 2], ['1', '3'], [1.5, 3], [], 'Mo', {}, undefined, null]) {
    const n = B.normalizeAnswers({ days: 4, weekdays: bad });
    assert.equal(n.weekdays, null, JSON.stringify(bad));
    assert.equal(n.days, 4, JSON.stringify(bad));
    assert.deepEqual(n.cardioDays, [], JSON.stringify(bad));
  }
  assert.deepEqual(B.normalizeAnswers({ weekdays: [4, 0, 2] }).weekdays, [0, 2, 4]);
  assert.equal(B.normalizeAnswers({ weekdays: [4, 0, 2] }).days, 3);
  assert.equal(B.normalizeAnswers({ weekdays: [3] }).days, 1);
  assert.equal(B.normalizeAnswers({ weekdays: [0, 1, 2, 3, 4, 5] }).days, 6);
  assert.equal(B.normalizeAnswers({}).days, 3);
});

test('1 Krafttag: ein Ganzkörperplan; 6 Krafttage: Drücken/Ziehen/Beine zweimal', () => {
  assert.deepEqual(daysOf(B.buildProgram({ ...gym, weekdays: [2] })), [['Ganzkörper A', [2]]]);
  assert.deepEqual(daysOf(B.buildProgram({ ...gym, weekdays: [0, 1, 2, 4, 5, 6] })), [['Drücken', [0, 4]], ['Ziehen', [1, 5]], ['Beine', [2, 6]]]);
  assert.equal(B.buildProgram({ ...gym, weekdays: [0, 1, 2, 3, 4, 5] }).splitLabel, 'Drücken / Ziehen / Beine ×2');
});

test('Cardio-Tage: eigener Plan „Ausdauer“ mit einer Übung ohne Gerät, Minuten pro Woche = Dauer × Tage', () => {
  const p = B.buildProgram({ ...gym, minutes: 30, weekdays: [0, 2, 4], cardioDays: [6, 1] });
  const c = p.plans.find((x) => x.cardio);
  assert.equal(c.name, 'Ausdauer');
  assert.deepEqual(c.days, [1, 6]);
  assert.equal(c.items.length, 1);
  assert.equal(c.items[0].ref, 'outdoor-walking'); // Einsteiger
  assert.equal(c.seconds, 30 * 60);
  assert.equal(p.cardioMinutes, 60);
  assert.equal(B.buildProgram({ ...gym, level: 'long', weekdays: [0], cardioDays: [3] }).plans.find((x) => x.cardio).items[0].ref, 'outdoor-running');
  for (const ref of Object.values(B.CARDIO_PICK)) assert.deepEqual(gearOf(poolEntry(ref)), [], ref);
});

test('Nur Cardio: keine Krafttage, alle 7 Tage Cardio möglich; Muskelsätze bleiben 0', () => {
  const p = B.buildProgram({ ...gym, weekdays: [], cardioDays: [0, 1, 2, 3, 4, 5, 6] });
  assert.equal(p.splitLabel, 'Nur Ausdauer');
  assert.deepEqual(daysOf(p), [['Ausdauer', [0, 1, 2, 3, 4, 5, 6]]]);
  assert.equal(Object.values(p.weekly).reduce((x, y) => x + y, 0), 0);
});

test('Kraft und Cardio nie am selben Tag (Schumann 2022: Schnellkraft leidet v. a. in derselben Einheit) – doppelt belegt → keine Cardio-Tage', () => {
  const n = B.normalizeAnswers({ weekdays: [0, 2], cardioDays: [2, 4] });
  assert.deepEqual(n.weekdays, [0, 2]);
  assert.deepEqual(n.cardioDays, []);
  assert.deepEqual(B.normalizeAnswers({ cardioDays: [1] }).cardioDays, []); // ohne gültige Krafttage-Angabe
});

test('Übernehmen legt auch den Cardio-Plan mit seinen Tagen an', () => {
  const r = applyProgram(B.buildProgram({ ...gym, weekdays: [0], cardioDays: [2, 5] }));
  assert.equal(r.ok, true);
  const cardio = P.listPlans().find((p) => p.name === 'Ausdauer');
  assert.deepEqual(cardio.days, [2, 5]);
  const ex = store.get('exercises').find((e) => e.id === cardio.items[0].exerciseId);
  assert.equal(ex.source.ref, 'outdoor-walking');
  assert.equal(ex.kind, 'cardio');
  // Ein reiner Cardio-Plan hat keine Dauer-Schätzung (sonst stünde dort nur das Aufwärmen, 5 min)
  assert.equal(planSeconds(cardio, store.get('exercises'), store.get('settings')), 0);
});

test('Hinweis Ganzkörper an Tagen direkt hintereinander: nur bei 2–3 Krafttagen, So und Mo zählen als benachbart', () => {
  assert.equal(B.adjacentFullBody([0, 1, 3]), true);
  assert.equal(B.adjacentFullBody([0, 6]), true);
  assert.equal(B.adjacentFullBody([0, 2, 4]), false);
  assert.equal(B.adjacentFullBody([1, 3, 5]), false);
  assert.equal(B.adjacentFullBody([0, 1, 2, 3]), false); // Oberkörper/Unterkörper: kein Hinweis
  assert.equal(B.adjacentFullBody([3]), false);
});

test('Übernehmen legt die Pläne mit den gewählten Tagen an', () => {
  const r = applyProgram(B.buildProgram({ ...gym, weekdays: [1, 3, 5] }));
  assert.equal(r.ok, true);
  // Tests teilen sich einen Speicher: frühere Pläne heißen schon „Ganzkörper A“, neue bekommen „(2)“ usw.
  const plans = P.listPlans();
  assert.ok(plans.some((p) => p.name.startsWith('Ganzkörper A') && JSON.stringify(p.days) === '[1,5]'), JSON.stringify(plans.map((p) => [p.name, p.days])));
  assert.ok(plans.some((p) => p.name.startsWith('Ganzkörper B') && JSON.stringify(p.days) === '[3]'));
});

done();
