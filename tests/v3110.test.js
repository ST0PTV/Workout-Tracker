// v3.11.0: Kraft + Cardio am selben Tag im Plan-Assistenten (Cardio nach dem Kraftteil, eigene Dauer-Frage) und
// Cardio-Auswahl nach Ziel, Geräten und Ort (#311). Eine Prüfung je Regel; Quellen in plan-builder.js.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const B = await import('../js/plan-builder.js');
const P = await import('../js/plans.js');
const { applyProgram } = await import('../js/plan-apply.js');
const { poolEntry } = await import('../js/pool.js');
const { validatePlan } = await import('../js/model.js');
const { planSeconds, fitPlanToSeconds, cardioSeconds } = await import('../js/plan-duration.js');
const { test, done } = runner();

console.log('# v3.11.0');
store.init();
const base = { goal: 'muscle', minutes: 60, gear: null, level: 'some' };
const isCardio = (it) => it.slot === 'cardio';

test('Antworten: Kombi-Tage nur unter den Krafttagen, Dauer nur 10/20/30 (Standard 20)', () => {
  assert.deepEqual(B.normalizeAnswers({ ...base, weekdays: [0, 2, 4], comboDays: [2, 3, 9] }).comboDays, []); // ungültiger Eintrag (9) → ganze Liste verworfen
  assert.deepEqual(B.normalizeAnswers({ ...base, weekdays: [0, 2, 4], comboDays: [2, 3] }).comboDays, [2]); // 3 ist kein Krafttag
  assert.deepEqual(B.normalizeAnswers({ ...base, weekdays: [0, 2, 4], comboDays: [9] }).comboDays, []);
  assert.deepEqual(B.normalizeAnswers({ ...base, comboDays: [1] }).comboDays, []); // ohne Krafttage-Angabe
  assert.equal(B.normalizeAnswers({ comboMinutes: 15 }).comboMinutes, 20);
  for (const m of [10, 20, 30]) assert.equal(B.normalizeAnswers({ comboMinutes: m }).comboMinutes, m);
});

test('Kombi-Tage zählen zu den höchstens 6 Krafttagen', () => {
  assert.equal(B.normalizeAnswers({ weekdays: [0, 1, 2, 3, 4, 5, 6], comboDays: [0] }).weekdays, null);
  assert.deepEqual(B.normalizeAnswers({ weekdays: [0, 1, 2, 3, 4, 5], comboDays: [0, 5] }).comboDays, [0, 5]);
});

test('Cardio kommt nach dem Kraftteil (Eddens 2018; Murlasits 2018): letzter Eintrag, Dauer = Antwort', () => {
  const p = B.buildProgram({ ...base, weekdays: [0, 2, 4], comboDays: [0, 2, 4], comboMinutes: 20 });
  for (const plan of p.plans) {
    assert.ok(plan.combo && plan.name.endsWith(B.COMBO_SUFFIX), plan.name);
    assert.ok(isCardio(plan.items.at(-1)) && plan.items.filter(isCardio).length === 1, plan.name);
    assert.ok(plan.items.slice(0, -1).every((it) => !isCardio(it)));
    assert.equal(plan.items.at(-1).minutes, 20);
  }
});

test('Kraftteil wird um die Cardio-Zeit kürzer, aber nicht unter 20 min (Konvention); Gesamtdauer = Kraftteil + Cardio', () => {
  const plain = B.buildProgram({ ...base, minutes: 60, weekdays: [0, 2, 4] }).plans[0];
  const combo = B.buildProgram({ ...base, minutes: 60, weekdays: [0, 2, 4], comboDays: [0, 2, 4], comboMinutes: 30 }).plans[0];
  const strength = combo.seconds - 30 * 60;
  assert.ok(strength < plain.seconds, `${strength} < ${plain.seconds}`);
  assert.ok(strength <= 30 * 60 + 5 * 60, `Kraftteil ≈ 30 min (${strength / 60})`); // Budget 60 − 30; Schätzung, 3 Übungen Minimum
  // 30 min Training mit 30 min Cardio: Kraftteil-Budget 20 min, nicht 0
  const short = B.comboDay('fbA', B.normalizeAnswers({ ...base, minutes: 30, weekdays: [0, 3], comboDays: [0], comboMinutes: 30 }), new Set());
  assert.ok(short.items.filter((it) => !isCardio(it)).length >= 3);
});

test('Gemischte Tage eines Trainings: eigene Fassung „… + Cardio“ für die Kombi-Tage, gleiche Übungen am Anfang', () => {
  // 3 Krafttage = Ganzkörper A (Mo, Fr), B (Mi); nur Mo mit Cardio
  const p = B.buildProgram({ ...base, weekdays: [0, 2, 4], comboDays: [0] });
  const a = p.plans.find((x) => x.name === 'Ganzkörper A'), ac = p.plans.find((x) => x.name === 'Ganzkörper A + Cardio');
  assert.deepEqual(a.days, [4]); assert.deepEqual(ac.days, [0]);
  const strengthRefs = ac.items.filter((it) => !isCardio(it)).map((it) => it.ref);
  assert.ok(strengthRefs.length >= 3 && strengthRefs.every((r) => a.items.some((it) => it.ref === r)), 'Kombi-Fassung nutzt die gleichen Übungen');
  assert.equal(p.plans.filter((x) => x.name.startsWith('Ganzkörper B')).length, 1);
  // alle Tage zusammen weiterhin genau die Krafttage
  assert.deepEqual(p.plans.filter((x) => !x.cardio).flatMap((x) => x.days).sort(), [0, 2, 4]);
});

test('Cardio-Auswahl bei Muskelaufbau/Kraft: Rad statt Laufen (Wilson 2012), nie Laufen', () => {
  for (const goal of ['muscle', 'strength']) for (const level of ['new', 'some', 'long']) {
    const a = B.normalizeAnswers({ goal, level, weekdays: [0], gear: null });
    assert.equal(B.pickCardio(a, true), 'stationary-bike', `${goal}/${level} Studio, Kombi`);
    assert.equal(B.pickCardio(a, false), 'outdoor-walking', `${goal}/${level} Cardio-Tag ohne Rad`);
    assert.equal(B.pickCardio({ ...a, gear: ['dumbbell', 'bike'] }, false), 'outdoor-cycling');
    assert.equal(B.pickCardio({ ...a, gear: ['dumbbell', 'cardio'] }, true), 'stationary-bike');
    assert.equal(B.pickCardio({ ...a, gear: ['dumbbell'] }, true), 'outdoor-walking', 'zu Hause ohne Cardiogerät');
    for (const g of [null, [], ['bike'], ['cardio']]) for (const c of [true, false]) assert.ok(!/running/.test(B.pickCardio({ ...a, gear: g }, c)));
  }
});

test('Cardio-Auswahl bei „Fit bleiben“: Einsteiger gehen, sonst laufen; im Studio am Kombi-Tag am Gerät (Konvention)', () => {
  const fit = (level, gear) => B.normalizeAnswers({ goal: 'fit', level, weekdays: [0], gear });
  assert.equal(B.pickCardio(fit('new', null), false), 'outdoor-walking');
  assert.equal(B.pickCardio(fit('new', null), true), 'incline-treadmill-walking');
  assert.equal(B.pickCardio(fit('long', null), false), 'outdoor-running');
  assert.equal(B.pickCardio(fit('long', null), true), 'treadmill-running');
  assert.equal(B.pickCardio(fit('long', ['dumbbell']), true), 'outdoor-running');
});

test('Alle Cardio-Vorschläge existieren im Pool und sind Cardio', () => {
  for (const goal of Object.keys(B.GOALS)) for (const level of Object.keys(B.LEVELS)) for (const gear of [null, [], ['bike'], ['cardio']]) for (const c of [true, false]) {
    const ref = B.pickCardio(B.normalizeAnswers({ goal, level, weekdays: [0], gear }), c);
    assert.equal(poolEntry(ref)?.kind, 'cardio', ref);
  }
});

test('Cardio zählt nicht als Satz; Ausdauer pro Woche = Dauer × Cardio-Tage + Cardio-Block × Kombi-Tage', () => {
  const plain = B.buildProgram({ ...base, weekdays: [0, 2, 4] });
  const combo = B.buildProgram({ ...base, weekdays: [0, 2, 4], comboDays: [0], comboMinutes: 20, cardioDays: [6] });
  assert.ok(Object.values(combo.weekly).reduce((n, v) => n + v, 0) <= Object.values(plain.weekly).reduce((n, v) => n + v, 0) + 1e-9);
  assert.equal(combo.cardioMinutes, 60 * 1 + 20 * 1);
});

test('Übernehmen speichert die Cardio-Minuten (targetMinutes); Plan gültig; Dauer schließt Cardio ein', () => {
  const r = applyProgram(B.buildProgram({ ...base, weekdays: [0, 3], comboDays: [0], comboMinutes: 20 }));
  assert.ok(r.ok, r.error);
  const plan = P.listPlans().find((x) => x.name.endsWith(' + Cardio'));
  assert.ok(plan, 'Plan „… + Cardio“ angelegt');
  const last = plan.items.at(-1);
  assert.equal(last.targetMinutes, 20);
  assert.equal(store.get('exercises').find((e) => e.id === last.exerciseId).kind, 'cardio');
  assert.deepEqual(validatePlan(plan), []);
  assert.equal(cardioSeconds(plan), 20 * 60);
  const sec = planSeconds(plan, store.get('exercises'), store.get('settings'));
  assert.ok(sec > 20 * 60, `${sec}`);
  // Dauer anpassen ändert nur den Kraftteil, Cardio bleibt 20 min
  const fit = fitPlanToSeconds(plan, store.get('exercises'), store.get('settings'), sec - 5 * 60);
  assert.ok(fit.changed && fit.seconds <= sec - 4 * 60 && fit.seconds > 20 * 60);
  assert.equal(fit.items.at(-1).targetMinutes, 20);
});

test('targetMinutes: ungültige Werte werden abgelehnt, fehlend ist erlaubt (alte Pläne/Backups)', () => {
  const plan = P.listPlans()[0];
  const bad = (v) => validatePlan({ ...plan, items: plan.items.map((it, i) => (i === 0 ? { ...it, targetMinutes: v } : it)) });
  for (const v of [0, -5, 1.5, '20', 601]) assert.ok(bad(v).some((e) => /targetMinutes/.test(e)), String(v));
  for (const v of [undefined, null, 1, 600]) assert.deepEqual(bad(v), [], String(v));
});

done();
