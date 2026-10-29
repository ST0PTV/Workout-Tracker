// v3.13.0 (Feature-Audit 2026-10-29): Halteübungen in Sekunden (M2), Analyse-Schwelle (M4), Tausch-Alternativen (S3).
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const { isTimed, TIMED_REFS } = await import('../js/timed.js');
const M = await import('../js/model.js');
const { formatSet } = await import('../js/sets.js');
const { parseHold, fmtHold } = await import('../js/input.js');
const { exerciseProgress } = await import('../js/progress.js');
const { suggestFor } = await import('../js/progression.js');
const A = await import('../js/plan-analysis.js');
const B = await import('../js/plan-builder.js');
const { applyProgram } = await import('../js/plan-apply.js');
const { alternativesFor } = await import('../js/swap-alt.js');
const lib = await import('../js/exercises.js');
const { poolEntry } = await import('../js/pool.js');
const { test, done } = runner();

console.log('# v3.13.0');
store.init();

test('Halteübungen: Pool nach ref, eigene über timed, Cardio nie', () => {
  for (const r of TIMED_REFS) assert.ok(poolEntry(r), r);
  assert.equal(isTimed({ kind: 'bodyweight', source: { ref: 'plank' } }), true);
  assert.equal(isTimed({ kind: 'bodyweight', source: { ref: 'push-up' } }), false);
  assert.equal(isTimed({ kind: 'bodyweight', source: { origin: 'custom' }, timed: true }), true);
  assert.equal(isTimed({ kind: 'cardio', timed: true }), false);
  assert.ok(B.TIMED.has('plank'), 'plan-builder nutzt dieselbe Liste');
});

test('Haltezeit eingeben: ganze Zahl = Sekunden, sonst m:ss; Anzeige unter 1 min als Zahl', () => {
  assert.equal(parseHold('45'), 45); assert.equal(parseHold('1:30'), 90); assert.equal(parseHold(''), null); assert.ok(Number.isNaN(parseHold('abc')));
  assert.equal(fmtHold(45), '45'); assert.equal(fmtHold(90), '1:30');
});

test('Abhaken: Halteübung braucht Zeit, Farmer’s Walk zusätzlich Gewicht', () => {
  assert.match(M.completionError({ reps: null, durationSec: null }, 'bodyweight', true), /Haltezeit/);
  assert.equal(M.completionError({ reps: null, durationSec: 45, weightKg: null }, 'bodyweight', true), null);
  assert.match(M.completionError({ reps: null, durationSec: 60, weightKg: null }, 'strength', true), /Gewicht/);
  assert.equal(M.completionError({ reps: null, durationSec: 60, weightKg: 24 }, 'strength', true), null);
  assert.match(M.completionError({ reps: null, durationSec: 45 }, 'bodyweight', false), /Wiederholungen/); // ohne timed wie bisher
});

test('Anzeige: „0:45“, „+10 kg · 0:45“, „24 kg · 1:00“', () => {
  assert.equal(formatSet({ reps: null, durationSec: 45, weightKg: null, drops: [] }, 'bodyweight'), '0:45');
  assert.equal(formatSet({ reps: null, durationSec: 45, weightKg: 10, drops: [] }, 'bodyweight'), '+10 kg · 0:45');
  assert.equal(formatSet({ reps: null, durationSec: 60, weightKg: 24, drops: [] }, 'strength'), '24 kg · 1:00');
  assert.equal(formatSet({ reps: 8, weightKg: 50, drops: [], type: 'work' }, 'strength'), '50 × 8');
});

test('Platzhalter und „Zuletzt“ übernehmen die Haltezeit', () => {
  const entry = { sets: [{ type: 'work', reps: null, durationSec: 40, weightKg: null }, { type: 'work', reps: null, durationSec: null, weightKg: null }] };
  assert.deepEqual(M.placeholderFor(entry, 1, null), { weightKg: null, reps: null, durationSec: 40 });
  const last = { sets: [{ type: 'work', reps: null, durationSec: 50, weightKg: null }] };
  assert.deepEqual(M.lastSetFor(entry, 0, last), { weightKg: null, reps: null, durationSec: 50 });
});

test('Fortschritt: längste Haltezeit je Training; kein Wdh.-Vorschlag', () => {
  const ex = { id: 'x1', kind: 'bodyweight', source: { ref: 'plank' } };
  const mk = (day, secs) => ({ id: `s${day}`, startedAt: `2026-10-${day}T18:00:00.000Z`, endedAt: `2026-10-${day}T18:30:00.000Z`,
    entries: [{ exerciseId: 'x1', sets: secs.map((d) => ({ type: 'work', completedAt: 'x', reps: null, durationSec: d, weightKg: null, drops: [], tags: [] })) }] });
  const rows = exerciseProgress('x1', [mk(10, [30, 45]), mk(12, [50, 40])], { kind: 'bodyweight' });
  assert.deepEqual(rows.map((r) => r.holdSec), [45, 50]);
  assert.equal(suggestFor(ex, [mk(10, [30]), mk(12, [50])], { now: Date.parse('2026-10-13') }), null);
});

test('Validierung: timed optional boolean', () => {
  const e = { ...M.createExercise(), name: 'Eigene Halte', muscles: { primary: ['abs'], secondary: [] } };
  assert.deepEqual(M.validateExercise({ ...e, timed: true }), []);
  assert.ok(M.validateExercise({ ...e, timed: 'ja' }).some((x) => /Sekunden/.test(x)));
});

test('M4: Plan des Assistenten wird nicht wegen 5–9 Sätzen „zum Anpassen“ gemeldet; Hinweis stattdessen', () => {
  applyProgram(B.buildProgram({ goal: 'muscle', minutes: 60, gear: null, level: 'some', weekdays: [0, 2, 4] }));
  const res = A.analysePlans({ plans: store.get('plans'), exercises: store.get('exercises'), settings: store.get('settings'), sessions: store.get('sessions') });
  assert.ok(res.nearTarget.length >= 1, 'mindestens ein Muskel mit 5–9 Sätzen im Hinweis');
  assert.ok(!res.suggestions.some((s) => s.kind === 'volume'), JSON.stringify(res.suggestions.map((s) => s.title)));
  for (const n of res.nearTarget) assert.ok(n.sets >= A.VOLUME_SUGGEST_BELOW && n.sets < A.VOLUME_TARGET, JSON.stringify(n));
});

test('M4: unter 5 Sätzen bleibt der Vorschlag (+1 Satz)', () => {
  const exs = store.get('exercises');
  const chest = exs.find((e) => e.source?.ref === 'chest-press-machine');
  const row = exs.find((e) => e.source?.ref === 'seated-cable-row');
  const mk = (id, ex) => ({ id, name: id, archived: false, days: [0, 3], items: [{ id: `${id}-i`, exerciseId: ex.id, groupId: null, targetSets: 2, restSeconds: null }] });
  const res = A.analysePlans({ plans: [mk('p1', chest), mk('p2', row)], exercises: exs, settings: store.get('settings'), sessions: [] });
  const vol = res.suggestions.filter((s) => s.kind === 'volume');
  assert.ok(vol.length >= 1 && vol.every((s) => s.changes.every((c) => c.to === c.from + 1)), JSON.stringify(res.suggestions.map((s) => s.title)));
});

test('S3: Alternativen aus dem Bewegungsmuster – Bibliothek zuerst, dann Pool passend zum Equipment', () => {
  const exs = store.get('exercises');
  const base = exs.find((e) => e.source?.ref === 'leg-press') || lib.addFromPool('leg-press').exercise;
  const alt = alternativesFor(base, store.get('exercises'), { equipment: null });
  const refs = [...alt.library.map((e) => e.source.ref), ...alt.pool.map((p) => p.ref)];
  assert.ok(refs.length >= 3 && refs.length <= 6 && !refs.includes('leg-press'), refs.join());
  assert.ok(refs.includes('goblet-squat') || refs.includes('back-squat'));
  const home = alternativesFor(base, store.get('exercises'), { equipment: ['dumbbell', 'bench'] });
  assert.ok(home.pool.every((p) => !['back-squat', 'hack-squat', 'smith-machine-squat', 'belt-squat'].includes(p.ref)), home.pool.map((p) => p.ref).join());
  assert.deepEqual(alternativesFor({ kind: 'cardio' }, exs, {}), { library: [], pool: [] });
});

test('S3: eigene Übung ohne ref → Bibliotheksübungen mit gleichem erstem Hauptmuskel', () => {
  const own = lib.saveExercise({ ...M.createExercise(), name: 'Eigene Presse', muscles: { primary: ['chest'], secondary: [] } }).exercise;
  const alt = alternativesFor(own, store.get('exercises'), {});
  assert.ok(alt.library.length >= 1 && alt.library.every((e) => e.muscles.primary[0] === 'chest' && e.id !== own.id));
  assert.equal(alt.pool.length, 0);
});

done();
