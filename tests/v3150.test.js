// v3.15.0 (Feedback nach dem Test): Aufwärmpause, Startpool in der Suche, Drop vor dem Abhaken,
// Pause läuft beim Übungswechsel weiter, kein Doppeltipp-Zoom. Nur erfundene Testdaten.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const lib = await import('../js/exercises.js');
const S = await import('../js/session.js');
const R = await import('../js/rest.js');
const M = await import('../js/model.js');
const { POOL } = await import('../js/pool.js');
const { test, done } = runner();

console.log('# v3.15.0');
store.init();

test('Aufwärmpause: Standard 60 s, eigene Einstellung, in den Grenzen der Pause', () => {
  assert.equal(M.DEFAULT_SETTINGS.warmupRestSeconds, 60);
  assert.equal(store.get('settings').warmupRestSeconds, 60, 'alte Einstellungen bekommen den Standard');
  assert.equal(R.warmupRest({}), 60);
  assert.equal(R.warmupRest({ warmupRestSeconds: 45 }), 45);
  assert.equal(R.warmupRest({ warmupRestSeconds: 5 }), R.REST_MIN);
});

test('Aufwärmsatz abhaken startet die Aufwärmpause, Arbeitssatz die normale', () => {
  store.set('settings', { ...store.get('settings'), restSeconds: 120, warmupRestSeconds: 45 });
  const ex = lib.addFromPool('bench-press-barbell').exercise;
  assert.ok(S.startEmpty().ok);
  assert.ok(S.addEntry(ex.id).ok);
  let en = S.activeSession().entries[0];
  assert.ok(S.addSet(en.id, 'warmup').ok);
  en = S.activeSession().entries[0];
  const warm = en.sets.find((x) => x.type === 'warmup');
  const work = en.sets.find((x) => x.type !== 'warmup');
  assert.ok(S.completeSet(en.id, warm.id, { weightKg: 20, reps: 10 }).ok);
  let t = S.activeSession().restTimer;
  assert.equal(t.durationSec, 45);
  assert.equal(t.warmup, true);
  assert.deepEqual(M.validateSession(S.activeSession()), [], 'Timer mit Markierung bleibt gültig');
  assert.ok(S.completeSet(en.id, work.id, { weightKg: 60, reps: 8 }).ok);
  t = S.activeSession().restTimer;
  assert.equal(t.durationSec, 120);
  assert.ok(!t.warmup);
});

test('Pause läuft beim Wechsel zur nächsten Übung weiter (Timer hängt am Training, nicht an der Seite)', () => {
  const other = lib.addFromPool('chest-press-machine').exercise;
  const before = S.activeSession().restTimer;
  assert.ok(S.addEntry(other.id).ok);
  const en2 = S.activeSession().entries[1];
  assert.deepEqual(S.activeSession().restTimer, before, 'Hinzufügen einer Übung lässt die Pause laufen');
  assert.ok(S.moveEntry(en2.id, 0).ok);
  assert.deepEqual(S.activeSession().restTimer, before, 'Umsortieren lässt die Pause laufen');
  S.discard();
});

test('Suche: alle Startpool-Übungen, ohne Doppelte, Übernahme erst beim Antippen', () => {
  const all = lib.pickableExercises();
  const inLib = lib.listExercises().length;
  assert.equal(all.length, POOL.length, 'Bibliothek + restlicher Pool = ganzer Pool (hier nur Pool-Übungen in der Bibliothek)');
  assert.equal(new Set(all.map((e) => e.name.toLowerCase())).size, all.length, 'kein Name doppelt');
  const pick = all.find((e) => e.poolRef === 'squat-barbell') || all.find((e) => e.poolRef);
  assert.ok(pick.id.startsWith(lib.POOL_ID_PREFIX));
  assert.equal(lib.listExercises().length, inLib, 'Anzeigen übernimmt nichts');
  const r = lib.ensureExercise(pick);
  assert.ok(r.ok && r.added);
  assert.equal(r.exercise.source.ref, pick.poolRef);
  assert.equal(lib.listExercises().length, inLib + 1);
  assert.ok(!lib.pickableExercises().some((e) => e.poolRef === pick.poolRef), 'danach nur noch als eigene Übung');
  const own = lib.ensureExercise(lib.listExercises()[0]);
  assert.ok(own.ok && !own.added);
  assert.equal(lib.ensureExercise({ id: 'gibt-es-nicht' }).ok, false);
});

test('Suche: eigene Übung mit Pool-Namen verdrängt den Pool-Eintrag; archivierte kommen zurück', () => {
  const p = POOL.find((x) => !lib.listExercises().some((e) => e.source?.ref === x.ref) && x.kind === 'strength');
  assert.ok(lib.saveExercise(M.createExercise({ name: p.name, muscles: { primary: ['chest'], secondary: [] } })).ok);
  assert.ok(!lib.pickableExercises().some((e) => e.poolRef === p.ref));
  const q = lib.listExercises().find((e) => e.source?.origin === 'builtin');
  assert.ok(lib.setArchived(q.id, true).ok);
  const back = lib.pickableExercises().find((e) => e.poolRef === q.source.ref);
  assert.ok(back, 'archivierte Pool-Übung ist wieder wählbar');
  const r = lib.ensureExercise(back);
  assert.ok(r.ok && r.restored, 'wird wiederhergestellt statt doppelt angelegt');
  assert.equal(r.exercise.id, q.id);
});

test('Drop und Rest-Pause schon vor dem Abhaken; Aufwärmsätze nicht', () => {
  const ex = lib.listExercises().find((e) => e.kind === 'strength');
  assert.ok(S.startEmpty().ok);
  assert.ok(S.addEntry(ex.id).ok);
  let en = S.activeSession().entries[0];
  const open = en.sets[0];
  assert.equal(open.completedAt, null);
  assert.ok(S.quickStage(en.id, open.id, 'drop').ok);
  let x = S.activeSession().entries[0].sets[0];
  assert.equal(x.type, 'drop');
  assert.equal(x.drops.length, 1);
  assert.ok(S.updateStage(en.id, x.id, 0, { weightKg: 30, reps: 6 }).ok);
  assert.ok(S.completeSet(en.id, x.id, { weightKg: 40, reps: 8 }).ok);
  x = S.activeSession().entries[0].sets[0];
  assert.deepEqual(x.drops, [{ weightKg: 30, reps: 6 }]);
  assert.ok(S.addSet(en.id, 'warmup').ok);
  en = S.activeSession().entries[0];
  const warm = en.sets.find((s) => s.type === 'warmup');
  assert.equal(S.quickStage(en.id, warm.id, 'drop').ok, false);
  S.discard();
});

test('Kein Doppeltipp-Zoom: touch-action manipulation auf html', () => {
  const css = readFileSync(new URL('../css/glass.css', import.meta.url), 'utf8');
  assert.match(css, /\nhtml \{ touch-action: manipulation; \}/);
});

done();
