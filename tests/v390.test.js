// v3.9.0: Tutorial – Sandbox im Speicher (Probetraining speichert nichts), Zustand, Tipps, Beispieldaten.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const T = await import('../js/tutorial.js');
const S = await import('../js/session.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const { test, done } = runner();

console.log('# v3.9.0');
store.init();
const snap = () => JSON.stringify(Object.fromEntries([...globalThis.localStorage.map.entries()].sort()));

test('Sandbox: alles läuft im Speicher, localStorage bleibt Byte für Byte gleich, danach sind die echten Daten wieder da', () => {
  const ex = lib.addFromPool('bench-press-barbell').exercise;
  const plan = P.newPlan('Echt').plan; P.addExercises(plan.id, [ex.id]);
  const before = snap();
  assert.equal(store.startSandbox(T.trialData(store.get('settings'))), true);
  assert.equal(store.inSandbox(), true);
  assert.equal(store.startSandbox({}), false, 'zweite Sandbox wird abgelehnt');
  assert.deepEqual(store.get('plans').map((p) => p.name), [T.TRIAL_PLAN_NAME]);
  const r = S.startFromPlan(store.get('plans')[0].id);
  assert.equal(r.ok, true);
  const s = S.activeSession();
  S.completeSet(s.entries[0].id, s.entries[0].sets[0].id, {});
  assert.equal(S.finish().ok, true);
  store.set('settings', { ...store.get('settings'), theme: 'light' });
  assert.equal(snap(), before, 'localStorage während der Sandbox unverändert');
  store.endSandbox();
  assert.equal(store.inSandbox(), false);
  assert.deepEqual(store.get('plans').map((p) => p.name), ['Echt']);
  assert.equal(store.get('sessions').length, 0);
  assert.equal(snap(), before);
});

test('Beispieldaten sind gültig und füllen die Werte vom letzten Mal vor', () => {
  const d = T.trialData({ theme: 'dark', hints: true }, new Date('2026-10-27T10:00:00Z'));
  const data = { exercises: d.exercises, groups: [], plans: d.plans, sessions: d.sessions, routines: [], settings: { ...M.DEFAULT_SETTINGS, ...d.settings } };
  assert.deepEqual(M.validateData(data), []);
  assert.equal(d.plans[0].items.length, 2);
  assert.deepEqual(d.exercises.map((e) => e.source.ref), T.TRIAL_REFS);
  assert.ok(d.sessions[0].endedAt < '2026-10-27');
  assert.equal(d.settings.theme, 'dark', 'eigene Darstellung bleibt');
  assert.ok(T.TIPS.every((t) => d.settings.tutorial.tips[t.id]), 'im Probetraining keine Tipps');
  store.startSandbox(d);
  S.startFromPlan(store.get('plans')[0].id);
  const set = S.activeSession().entries[0].sets[0];
  assert.equal(set.weightKg, 60); assert.equal(set.reps, 10);
  store.endSandbox();
});

test('Zustand: unvollständig → vollständig; Rundgang beendet setzt onboarded; Tipps werden gemerkt', () => {
  assert.deepEqual(T.tutorialState({}), { tour: null, trial: null, tips: {} });
  assert.deepEqual(T.tutorialState({ tutorial: { tour: 'x', tips: 5 } }), { tour: null, trial: null, tips: {} });
  let st = T.withTutorial({ onboarded: false }, { tour: 'skipped' });
  assert.equal(st.onboarded, true); assert.equal(st.tutorial.tour, 'skipped');
  st = T.withTutorial(st, { tips: { a: true } }); st = T.withTutorial(st, { tips: { b: true } });
  assert.deepEqual(st.tutorial.tips, { a: true, b: true });
  assert.equal(T.withTutorial({ onboarded: false }, { trial: 'done' }).onboarded, false, 'nur der Rundgang zählt als Einführung');
});

test('Tipps: erst nach dem Rundgang oder für bestehende Nutzer, nicht bei ausgeschalteten Hinweisen, jeder nur einmal', () => {
  assert.deepEqual(T.pendingTips('/progress', { onboarded: false }), []);
  assert.deepEqual(T.pendingTips('/progress', { onboarded: true, hints: false }), []);
  assert.deepEqual(T.pendingTips('/progress', { onboarded: true }).map((t) => t.id), ['progress-4w']);
  assert.deepEqual(T.pendingTips('/progress', { tutorial: { tour: 'done', tips: { 'progress-4w': true } } }), []);
  assert.deepEqual(T.pendingTips('/plans', { onboarded: true }).map((t) => t.id), ['plans-analyse', 'plans-routines']);
  for (const t of T.TIPS) assert.ok(t.body.length > 20 && t.body.length < 140, t.id);
});

test('Rundgang: jeder Schritt hat Route, Ziel, Titel und kurzen Text; Routen gibt es', () => {
  const routes = ['/', '/plans', '/exercises', '/progress', '/settings'];
  for (const s of T.TOUR_STEPS) {
    assert.ok(routes.includes(s.route), s.id);
    assert.ok(Array.isArray(s.target) && s.target.length, s.id);
    assert.ok(s.title && s.body && s.body.length < 160, s.id);
  }
  assert.equal(new Set(T.TOUR_STEPS.map((s) => s.id)).size, T.TOUR_STEPS.length);
  assert.ok(/\d+ Übungen/.test(T.TOUR_STEPS.find((s) => s.id === 'exercises').body));
});

test('Standard-Einstellungen enthalten tutorial: null (kein Schema-Sprung)', () => {
  assert.equal(M.DEFAULT_SETTINGS.tutorial, null);
  assert.equal(M.SCHEMA_VERSION, 2);
});

done();
