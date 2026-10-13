// Fortschritt: e1RM (Epley, nur 1–10 Wdh.), Verlauf, Rauschschwelle, Zusammenfassung.
import assert from 'node:assert/strict';
import { runner } from './helpers.js';
const M = await import('../js/model.js');
const G = await import('../js/progress.js');
const I = await import('../js/progress-info.js');
const { test, done } = runner();
console.log('# progress');

const T = (d) => new Date(Date.UTC(2026, 9, d, 10)).toISOString();
const set = (w, r, type = 'work', extra = {}) => M.createSet({ type, weightKg: w, reps: r, completedAt: T(1), ...extra });
const session = (d, exId, sets, ended = true) => M.createSession({ startedAt: T(d), endedAt: ended ? T(d) : null, entries: [M.createEntry(exId, { sets })] });

test('e1RM nach Epley; 1 Wdh. = Gewicht; > 10 Wdh. oder ungültig → null', () => {
  assert.equal(G.e1rm(100, 10), 100 * (1 + 10 / 30));
  assert.equal(G.e1rm(100, 1), 100);
  assert.equal(G.e1rm(100, 11), null);
  assert.equal(G.e1rm(0, 5), null);
  assert.equal(G.e1rm(100, 0), null);
  assert.equal(G.e1rm(100, 2.5), null);
});

const ex = 'ex-1';
const sessions = [
  session(3, ex, [set(40, 10, 'warmup'), set(80, 8), set(80, 7)]),
  session(1, ex, [set(77.5, 8), set(77.5, 6)]),
  session(5, ex, [set(82.5, 8), set(60, 15), set(82.5, 3, 'drop', { drops: [{ weightKg: 60, reps: 6 }] })]),
  session(7, ex, [set(82.5, 12)]),
  session(9, ex, [set(85, 6)], false) // läuft noch
];

test('Verlauf chronologisch, nur abgeschlossene Trainings, ohne Aufwärmsätze', () => {
  const rows = G.exerciseProgress(ex, sessions);
  assert.deepEqual(rows.map((r) => r.date), [T(1), T(3), T(5), T(7)]);
  assert.equal(rows[1].hardSets, 2);
  assert.deepEqual(rows[1].topSet, { weightKg: 80, reps: 8 });
});

test('Top-Satz: schwerstes Gewicht, bei Gleichstand mehr Wdh.; Drop zählt mit erster Stufe', () => {
  const rows = G.exerciseProgress(ex, sessions);
  assert.deepEqual(rows[2].topSet, { weightKg: 82.5, reps: 8 });
  assert.equal(rows[2].volume, 82.5 * 8 + 60 * 15 + 82.5 * 3 + 60 * 6);
});

test('e1RM: bester Satz ≤ 10 Wdh.; Satz mit 12 Wdh. ergibt keinen Schätzwert', () => {
  const rows = G.exerciseProgress(ex, sessions);
  assert.equal(rows[2].e1rm.value, 82.5 * (1 + 8 / 30));
  assert.equal(rows[3].e1rm, null, '82,5 × 12 liegt außerhalb des Gültigkeitsbereichs');
});

test('Veränderung gegenüber vorherigem Schätzwert; < 5 % = im Rauschbereich', () => {
  const rows = G.exerciseProgress(ex, sessions);
  assert.equal(rows[0].change, null);
  const pct = ((80 - 77.5) / 77.5) * 100;
  assert.ok(Math.abs(rows[1].change.pct - pct) < 1e-9);
  assert.equal(rows[1].change.withinNoise, true);
  assert.equal(rows[3].change, null);
});

test('Zusammenfassung: Bestwerte und Gesamttrend', () => {
  const s = G.progressSummary(G.exerciseProgress(ex, sessions));
  assert.equal(s.sessions, 4);
  assert.deepEqual([s.bestTop.weightKg, s.bestTop.reps], [82.5, 12]);
  assert.equal(s.estimatePoints, 3);
  const pct = ((82.5 - 77.5) / 77.5) * 100;
  assert.ok(Math.abs(s.trend.pct - pct) < 1e-9);
  assert.equal(s.trend.withinNoise, false);
});

test('Körpergewicht: kein e1RM, kein Volumen in kg', () => {
  const rows = G.exerciseProgress('bw', [session(2, 'bw', [set(0, 10), set(10, 6)])], { kind: 'bodyweight' });
  assert.equal(rows[0].e1rm, null);
  assert.equal(rows[0].volume, null);
  assert.equal(rows[0].totalReps, 16);
});

test('Übungen mit Verlauf: zuletzt trainierte zuerst, laufendes Training zählt nicht', () => {
  const exs = [{ id: ex, name: 'A' }, { id: 'ex-2', name: 'B' }, { id: 'ex-3', name: 'C' }];
  const list = G.exercisesWithHistory(exs, [...sessions, session(8, 'ex-2', [set(50, 10)]), session(10, 'ex-3', [set(20, 10)], false)]);
  assert.deepEqual(list.map((x) => x.exercise.id), ['ex-2', ex]);
  assert.equal(list[1].sessions, 4);
});

test('Übung zweimal im selben Training zählt als ein Training', () => {
  const twice = M.createSession({ startedAt: T(4), endedAt: T(4), entries: [M.createEntry('ex-2', { sets: [set(50, 10)] }), M.createEntry('ex-2', { sets: [set(55, 8)] })] });
  const list = G.exercisesWithHistory([{ id: 'ex-2', name: 'B' }], [twice]);
  assert.equal(list[0].sessions, 1);
  const rows = G.exerciseProgress('ex-2', [twice]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hardSets, 2);
});

test('Formatierung kg', () => {
  assert.equal(G.fmtKg(82.5), '82,5');
  assert.equal(G.fmtKg(110), '110');
  assert.equal(G.fmtKg(null), '–');
});

test('v1.8.1: e1RM-Info nennt Grenzen (Beinübungen, Versagen, Trend) und hat DOI-Quellen', () => {
  assert.match(I.E1RM_EXPLAIN, /Epley/);
  assert.match(I.E1RM_EXPLAIN, /Beinübungen/);
  assert.match(I.E1RM_EXPLAIN, /Versagen/);
  assert.ok(I.PROGRESS_INFO.summary.some((t) => /grober Hinweis/.test(t)));
  assert.ok(I.PROGRESS_INFO.sources.length >= 10);
  for (const s of I.PROGRESS_INFO.sources) {
    assert.match(s.url, /^https:\/\//);
    assert.ok(s.note.length <= 170, s.label);
  }
});

done();
