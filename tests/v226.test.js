// v2.26.0: Quick Wins – Scheiben pro Seite, „je Seite“, Rückgängig, Speicher-Rückmeldung, Gerätefunktionen.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const S = await import('../js/session.js');
const PL = await import('../js/plates.js');
const D = await import('../js/device.js');
const { test, done } = runner();

console.log('# v2.26.0 quick wins');
store.init();

test('Scheiben: Standardsatz, greedy, genaue und ungenaue Lasten', () => {
  assert.deepEqual(PL.platesFor(80, 20), { perSide: 30, plates: [25, 5], exact: true });
  assert.deepEqual(PL.platesFor(102.5, 20), { perSide: 41.25, plates: [25, 15, 1.25], exact: true });
  assert.deepEqual(PL.platesFor(60, 20).plates, [20]);
  assert.equal(PL.platesFor(81, 20).exact, false); // 30,5 kg pro Seite geht mit dem Standardsatz nicht
  assert.equal(PL.platesFor(20, 20), null); // nur die Stange
  assert.equal(PL.platesFor(null, 20), null);
});

test('Scheiben: Anzeigezeile', () => {
  assert.equal(PL.plateLine(80, 20), 'Stange 20 kg · 30 kg pro Seite (25 + 5)');
  assert.equal(PL.plateLine(42.5, 20), 'Stange 20 kg · 11,25 kg pro Seite (10 + 1,25)');
  assert.equal(PL.plateLine(20, 20), 'Nur die Stange (20 kg)');
  assert.equal(PL.plateLine(15, 20), 'Stange 20 kg · leichter als die Stange');
  assert.match(PL.plateLine(81, 20), /nicht genau ladbar/);
  assert.equal(PL.plateLine(null, 20), null);
});

test('Stange: Pool-Langhantel ja, T-Bar und Kurzhantel nein, eigene Übung nur mit barKg, Schalter aus', () => {
  const bench = lib.addFromPool('bench-press-barbell').exercise;
  const tbar = lib.addFromPool('t-bar-row').exercise;
  const db = lib.addFromPool('dumbbell-curl').exercise;
  const st = store.get('settings');
  assert.equal(PL.barFor(bench, st), 20);
  assert.equal(PL.barFor({ ...bench, barKg: 15 }, st), 15);
  assert.equal(PL.barFor(tbar, st), null);
  assert.equal(PL.barFor(db, st), null);
  const own = M.createExercise({ name: 'Meine Stange', muscles: { primary: ['chest'], secondary: [] } });
  assert.equal(PL.barFor(own, st), null);
  assert.equal(PL.barFor({ ...own, barKg: 10 }, st), 10);
  assert.equal(PL.barFor(bench, { ...st, plateMath: false }), null);
  assert.equal(PL.barFor(bench, { ...st, barKg: 15 }), 15);
});

test('je Seite: Vorgabe aus dem Pool, eigener Wert gewinnt, Ausfallschritte nicht', () => {
  const bss = lib.addFromPool('bulgarian-split-squat').exercise;
  const lunge = lib.addFromPool('dumbbell-forward-lunge').exercise;
  assert.equal(PL.isPerSide(bss), true);
  assert.equal(PL.isPerSide({ ...bss, perSide: false }), false);
  assert.equal(PL.isPerSide(lunge), false);
  assert.equal(PL.isPerSide({ ...lunge, perSide: true }), true);
  assert.ok([...PL.PER_SIDE_REFS].every((r) => lib.addFromPool(r).ok || lib.listExercises().some((e) => e.source.ref === r)), 'alle Refs gibt es im Pool');
});

test('Validierung: barKg und perSide optional, falsche Werte abgelehnt', () => {
  const base = M.createExercise({ name: 'X', muscles: { primary: ['chest'], secondary: [] } });
  assert.deepEqual(M.validateExercise(base), []);
  assert.deepEqual(M.validateExercise({ ...base, barKg: 12.5, perSide: true }), []);
  assert.deepEqual(M.validateExercise({ ...base, barKg: null }), []);
  assert.equal(M.validateExercise({ ...base, barKg: -1 }).length, 1);
  assert.equal(M.validateExercise({ ...base, barKg: 60 }).length, 1);
  assert.equal(M.validateExercise({ ...base, perSide: 'ja' }).length, 1);
  const r = lib.saveExercise({ ...lib.listExercises()[0], barKg: 10, perSide: true });
  assert.ok(r.ok, r.errors.join());
});

test('Einstellungen: neue Standardwerte, alte Einstellungen bekommen sie dazu', () => {
  store.set('settings', { focus: ['strength'], weightUnit: 'kg', restSeconds: 90, figure: 'male' });
  const st = store.get('settings');
  assert.equal(st.keepAwake, true); assert.equal(st.plateMath, true); assert.equal(st.barKg, 20); assert.equal(st.persistAsked, false);
  assert.equal(st.restSeconds, 90);
});

test('Rückgängig: Satz an alter Stelle, spätere Änderungen bleiben', () => {
  const ex = lib.listExercises().find((e) => e.source.ref === 'bench-press-barbell');
  const plan = P.newPlan('U').plan;
  P.addExercises(plan.id, [ex.id]);
  assert.ok(S.startFromPlan(plan.id).ok);
  const entry = S.activeSession().entries[0];
  const [s1, s2, s3] = entry.sets;
  const r = S.removeSet(entry.id, s2.id);
  assert.ok(r.ok); assert.equal(r.removed.index, 1); assert.equal(r.removed.set.id, s2.id);
  assert.ok(S.completeSet(entry.id, s1.id, { weightKg: 60, reps: 8 }).ok); // Änderung nach dem Löschen
  assert.ok(S.restoreSet(entry.id, r.removed).ok);
  const after = S.activeSession().entries[0];
  assert.deepEqual(after.sets.map((x) => x.id), [s1.id, s2.id, s3.id]);
  assert.notEqual(after.sets[0].completedAt, null, 'späterer Haken bleibt');
  assert.equal(S.restoreSet(entry.id, r.removed).ok, false, 'nicht doppelt');
});

test('Rückgängig: Übung an alter Stelle', () => {
  const other = lib.listExercises().find((e) => e.source.ref === 'dumbbell-curl');
  assert.ok(S.addEntry(other.id).ok);
  const ids = S.activeSession().entries.map((e) => e.id);
  const r = S.removeEntry(ids[0]);
  assert.ok(r.ok); assert.equal(r.removed.index, 0);
  assert.equal(S.activeSession().entries.length, 1);
  assert.ok(S.restoreEntry(r.removed).ok);
  assert.deepEqual(S.activeSession().entries.map((e) => e.id), ids);
  assert.equal(S.restoreEntry(r.removed).ok, false);
  S.discard();
});

test('Speicher-Rückmeldung: Beobachter bekommt Erfolg und Fehler', () => {
  const seen = [];
  const off = store.onWriteResult((ok, key) => seen.push([ok, key]));
  assert.equal(store.set('plans', store.get('plans')), true);
  const real = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(store.set('plans', []), false);
  globalThis.localStorage.setItem = real;
  off();
  store.set('plans', store.get('plans'));
  assert.deepEqual(seen, [[true, 'plans'], [false, 'plans']]);
});

// Async-Teil vorab (der Runner ist synchron), Prüfungen danach im Test.
const dev = {};
{
  dev.supported = D.wakeLockSupported();
  D.setKeepAwake(true); D.setKeepAwake(false); // darf nicht werfen
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const set = (v) => Object.defineProperty(globalThis, 'navigator', { value: v, configurable: true, writable: true });
  set({});
  dev.persistNone = await D.requestPersist();
  dev.statusNone = await D.storageStatus();
  set({ storage: { persist: async () => true, persisted: async () => true, estimate: async () => ({ usage: 2048, quota: 1e9 }) } });
  dev.persistYes = await D.requestPersist();
  dev.statusYes = await D.storageStatus();
  set({ storage: { persist: async () => { throw new Error('x'); } } });
  dev.persistThrow = await D.requestPersist();
  if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete globalThis.navigator;
}

test('Gerät: ohne Schnittstellen still, mit Schnittstellen Werte durchgereicht', () => {
  assert.equal(dev.supported, false);
  assert.equal(dev.persistNone, null);
  assert.deepEqual(dev.statusNone, { persisted: null, usage: null, quota: null });
  assert.equal(dev.persistYes, true);
  assert.deepEqual(dev.statusYes, { persisted: true, usage: 2048, quota: 1e9 });
  assert.equal(dev.persistThrow, null);
  assert.equal(D.fmtBytes(2048), '2 KB');
  assert.equal(D.fmtBytes(5 * 1024 * 1024), '5 MB');
});

done();
