// v3.1.0: nächster Plan für den Play-Knopf (heute geplant > am längsten nicht trainiert > nie trainiert zuerst).
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const { nextPlan, lastTrained } = await import('../js/next-plan.js');
const { test, done } = runner();

console.log('# v3.1.0');

const item = { exerciseId: 'x' };
const plan = (id, name, extra = {}) => ({ id, name, items: [item], ...extra });
const sess = (planId, iso) => ({ planId, startedAt: iso, endedAt: iso });
const now = new Date('2026-10-26T18:00:00'); // Montag (dayIndex 0)

test('ohne Pläne mit Übungen: kein Vorschlag', () => {
  assert.equal(nextPlan([], [], now), null);
  assert.equal(nextPlan([{ id: 'a', name: 'Leer', items: [] }], [], now), null);
});

test('Wechsel Push/Pull/Beine: der am längsten nicht trainierte Plan', () => {
  const plans = [plan('push', 'Push'), plan('pull', 'Pull'), plan('legs', 'Beine')];
  const s = [sess('push', '2026-10-22T18:00:00'), sess('pull', '2026-10-21T18:00:00'), sess('push', '2026-10-20T18:00:00'), sess('legs', '2026-10-19T18:00:00')];
  const r = nextPlan(plans, s, now);
  assert.equal(r.plan.id, 'legs');
  assert.equal(r.reason, 'oldest');
});

test('nie trainierter Plan kommt zuerst', () => {
  const plans = [plan('push', 'Push'), plan('neu', 'Neu')];
  const r = nextPlan(plans, [sess('push', '2026-10-25T18:00:00')], now);
  assert.equal(r.plan.id, 'neu');
  assert.equal(r.reason, 'never');
});

test('Trainingstag heute schlägt die Reihenfolge, aber nicht wenn heute schon gemacht', () => {
  const plans = [plan('push', 'Push', { days: [0] }), plan('legs', 'Beine')];
  const s = [sess('push', '2026-10-25T18:00:00')];
  assert.equal(nextPlan(plans, s, now).reason, 'today');
  assert.equal(nextPlan(plans, s, now).plan.id, 'push');
  const done = [...s, sess('push', '2026-10-26T08:00:00')];
  assert.equal(nextPlan(plans, done, now).plan.id, 'legs');
});

test('laufende (nicht beendete) Trainings zählen nicht', () => {
  assert.equal(lastTrained('push', [{ planId: 'push', startedAt: '2026-10-25T18:00:00', endedAt: null }]), -Infinity);
});

done();
