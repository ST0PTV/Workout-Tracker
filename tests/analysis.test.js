// v2.23.0: 4-Wochen-Analyse (Sätze je Woche, Ø, Hauptübung mit e1RM-Trend, relativer Hinweis).
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const M = await import('../js/model.js');
const A = await import('../js/analysis.js');
const { test, done } = runner();

console.log('# v2.23.0 4-Wochen-Analyse');
const mk = (name, primary, secondary = [], kind = 'strength', extra = {}) => M.createExercise({ name, kind, muscles: { primary, secondary }, ...extra });
const bench = mk('Bankdrücken', ['chest'], ['triceps']);
const squat = mk('Kniebeuge', ['quads'], []);
const row = mk('Rudern', ['lats'], []);
const curl = mk('Curl', ['biceps'], []);
const calf = mk('Wadenheben', ['calves'], []);
const old = mk('Alt', ['abs'], [], 'strength', { archived: true });
const exercises = [bench, squat, row, curl, calf, old];
const at = (y, mo, d, h = 10) => new Date(y, mo - 1, d, h).toISOString();
const set = (iso, w, r, type = 'work') => M.createSet({ type, weightKg: w, reps: r, completedAt: iso });
const session = (iso, entries) => M.createSession({ startedAt: iso, endedAt: iso, entries });
const now = new Date(2026, 9, 21, 12); // Mi 21.10.2026 → Fenster 21.09.–18.10.
const mondays = [[9, 21], [9, 28], [10, 5], [10, 12]];
const sessions = mondays.map(([mo, d], i) => {
  const t = at(2026, mo, d);
  const entries = [
    M.createEntry(bench.id, { sets: [set(t, 60, 10, 'warmup'), set(t, 80 + i * 2.5, 5), set(t, 80, 5), set(t, 80, 5)] }),
    M.createEntry(squat.id, { sets: [set(t, 100, 5), set(t, 100, 5), set(t, 100, 5)] })
  ];
  if (i % 2 === 0) entries.push(M.createEntry(row.id, { sets: [set(t, 50, 10), set(t, 50, 10)] }));
  return session(t, entries);
});
sessions.push(session(at(2026, 10, 20), [M.createEntry(curl.id, { sets: [set(at(2026, 10, 20), 15, 10)] })])); // laufende Woche
sessions.push(M.createSession({ startedAt: at(2026, 10, 1), endedAt: null, entries: [M.createEntry(curl.id, { sets: [set(at(2026, 10, 1), 15, 10)] })] })); // nicht abgeschlossen

const a = A.fourWeekAnalysis(sessions, exercises, now);
const row_ = (id) => a.muscles.find((m) => m.id === id);

test('Zeitraum: 4 abgeschlossene Kalenderwochen, laufende Woche und offene Trainings zählen nicht', () => {
  assert.equal(a.weeks.length, 4);
  assert.equal(a.weeks[0].start.getDate(), 21);
  assert.equal(a.weeks[3].start.getDate(), 12);
  assert.deepEqual(a.weeks.map((w) => w.kw), [39, 40, 41, 42]);
  assert.equal(a.sessions, 4);
  assert.equal(row_('biceps').avg, 0, 'Curl aus der laufenden Woche zählt nicht');
});

test('Sätze je Woche und Ø: direkt 1, indirekt 0,5, Aufwärmen nicht', () => {
  assert.deepEqual(row_('chest').weeks, [3, 3, 3, 3]);
  assert.equal(row_('chest').avg, 3);
  assert.equal(row_('triceps').avg, 1.5);
  assert.deepEqual(row_('lats').weeks, [2, 0, 2, 0]);
  assert.equal(row_('lats').avg, 1);
});

test('Hauptübung und e1RM-Trend (Schätzung) nur aus dem Zeitraum', () => {
  const m = row_('chest').main;
  assert.equal(m.exerciseId, bench.id);
  assert.equal(m.points, 4);
  const first = 80 * (1 + 5 / 30), last = 87.5 * (1 + 5 / 30);
  assert.ok(Math.abs(m.trend.pct - ((last - first) / first) * 100) < 1e-9);
  assert.equal(m.trend.withinNoise, false);
  assert.equal(row_('quads').main.trend.pct, 0);
  assert.equal(row_('quads').main.trend.withinNoise, true);
  assert.equal(row_('triceps').main, null, 'nur primäre Kraftübungen');
});

test('Hinweis relativ zum Median, nur Muskeln mit eigener Übung, höchstens 3, wenigste zuerst', () => {
  assert.equal(a.median, 2.25);
  assert.deepEqual(a.hints.map((m) => m.id), ['biceps', 'calves', 'lats']);
  assert.ok(!a.hints.some((m) => m.id === 'abs'), 'archivierte Übung zählt nicht als eigene');
  assert.ok(a.uncovered.includes('abs') && a.uncovered.includes('hamstrings') && !a.uncovered.includes('calves'));
});

test('Zu wenig Vergleich: unter 3 trainierten Muskelgruppen kein Hinweis', () => {
  const b = A.fourWeekAnalysis(sessions.slice(0, 1).map((s) => ({ ...s, entries: s.entries.slice(1) })), exercises, now);
  assert.equal(b.enough, false);
  assert.deepEqual(b.hints, []);
});

test('Hilfen: ISO-Kalenderwoche und Median', () => {
  assert.equal(A.isoWeek(new Date(2026, 0, 1)), 1);
  assert.equal(A.isoWeek(new Date(2027, 0, 1)), 53);
  assert.equal(A.isoWeek(new Date(2026, 9, 19)), 43);
  assert.equal(A.median([3, 1, 2]), 2);
  assert.equal(A.median([]), 0);
});

done();
