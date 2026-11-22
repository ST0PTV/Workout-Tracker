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
const A = await import('../js/analysis.js');
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

// ---------- Rückblick (Variante A + Gesamtverlauf aus C) ----------
const mkS = (iso, exId, n) => M.createSession({ startedAt: iso, endedAt: iso, entries: [M.createEntry(exId, { sets: Array.from({ length: n }, () => M.createSet({ weightKg: 50, reps: 8, completedAt: iso })) })] });
const benchEx = M.createExercise({ name: 'Testdrücken', muscles: { primary: ['chest'], secondary: ['triceps'] } });
const cardioEx = M.createExercise({ name: 'Testrad', kind: 'cardio', muscles: { primary: [], secondary: [] } });
const nowR = new Date(2026, 10, 18, 12); // Mi 18.11.2026 → laufende Woche ab 16.11.
const histR = [
  mkS(new Date(2026, 0, 7, 10).toISOString(), benchEx.id, 3), // Mi 07.01.2026 (Woche ab 05.01.)
  mkS(new Date(2026, 9, 14, 10).toISOString(), benchEx.id, 4),
  mkS(new Date(2026, 10, 10, 10).toISOString(), benchEx.id, 5),
  mkS(new Date(2026, 10, 11, 10).toISOString(), cardioEx.id, 1),
  mkS(new Date(2026, 10, 17, 10).toISOString(), benchEx.id, 6) // laufende Woche: zählt nicht
];

test('Gesamtverlauf: eine Zeile je abgeschlossener Woche seit dem ersten Training, Cardio und laufende Woche nicht', () => {
  const t = A.weeklyTotals(histR, [benchEx, cardioEx], nowR);
  assert.equal(t[0].start.getDate(), 5);
  assert.equal(t[0].start.getMonth(), 0);
  assert.equal(t[t.length - 1].start.getDate(), 9, 'letzte Woche = 09.11.');
  assert.equal(t.length, 45);
  assert.equal(t[0].sets, 3);
  assert.equal(t[t.length - 1].sets, 5, 'Cardio zählt keine Sätze');
  assert.equal(t[t.length - 1].sessions, 2);
  assert.equal(t.reduce((a, w) => a + w.sets, 0), 12);
  assert.deepEqual(A.weeklyTotals([], [benchEx], nowR), []);
});

test('Voreinstellungen: am Ende ausgerichtet, kürzer bei wenig Daten', () => {
  assert.deepEqual(A.presetWindow(45, '3m'), { from: 32, to: 45 });
  assert.deepEqual(A.presetWindow(45, '1y'), { from: 0, to: 45 });
  assert.deepEqual(A.presetWindow(45, 'all'), { from: 0, to: 45 });
  assert.deepEqual(A.presetWindow(10, '6m'), { from: 0, to: 10 });
});

test('Spalten: Wochen bis 7, sonst Monate, Quartale, Jahre; Werte als Ø pro Woche', () => {
  const weeks = (n) => Array.from({ length: n }, (_, i) => new Date(2026, 0, 5 + 7 * i));
  assert.equal(A.columnsFor(weeks(4))[0].unit, 'week');
  assert.equal(A.columnsFor(weeks(4)).length, 4);
  const m = A.columnsFor(weeks(13));
  assert.equal(m[0].unit, 'month');
  assert.ok(m.length <= A.MAX_COLUMNS);
  assert.equal(m.reduce((a, c) => a + c.idx.length, 0), 13, 'jede Woche genau einmal');
  assert.equal(A.columnsFor(weeks(52))[0].unit, 'quarter');
  assert.equal(A.columnsFor(weeks(400))[0].unit, 'year');
  assert.equal(A.columnLabel(m[0]), 'Jan');
  assert.equal(A.columnLabel(A.columnsFor(weeks(4))[0]), 'KW 2');
  assert.deepEqual(A.columnValues([2, 4, 6, 0], [{ idx: [0, 1] }, { idx: [2, 3] }]), [3, 3]);
});

test('rangeAnalysis: gleiche Zählung wie 4 Wochen, beliebige Länge', () => {
  const end = new Date(2026, 10, 16); // Montag der laufenden Woche
  const four = A.fourWeekAnalysis(histR, [benchEx], nowR);
  const r4 = A.rangeAnalysis(histR, [benchEx], end, 4);
  assert.deepEqual(r4.muscles.map((m) => m.avg), four.muscles.map((m) => m.avg));
  const all = A.rangeAnalysis(histR, [benchEx], end, 45);
  assert.equal(all.weeks.length, 45);
  assert.equal(all.sessions, 4, 'auch das Cardio-Training zählt als Training (Sätze nicht)');
  const chest = all.muscles.find((m) => m.id === 'chest');
  assert.equal(chest.weeks.reduce((a, b) => a + b, 0), 12);
  assert.ok(Math.abs(chest.avg - 12 / 45) < 1e-9);
});

done();
