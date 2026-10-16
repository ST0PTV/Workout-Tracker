// v2.4.0: Bewertung pro Übung, Vorschlag fürs nächste Training, Wiedereinstieg nach einer Pause.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const PR = await import('../js/progression.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const S = await import('../js/session.js');
const B = await import('../js/backup.js');
const { test, done } = runner();

console.log('# Progression (v2.4.0)');
store.init();

const DAY = 86400000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();
const ex = lib.saveExercise(M.createExercise({ name: 'Kniebeuge', muscles: { primary: ['quads'], secondary: [] } })).exercise;
const bw = lib.saveExercise(M.createExercise({ name: 'Klimmzug', kind: 'bodyweight', muscles: { primary: ['lats'], secondary: [] } })).exercise;

// Ein beendetes Training mit einer Übung; sets = [[kg, wdh], …]
function past(daysAgo, exercise, sets, rating) {
  const s = M.createSession({ startedAt: iso(daysAgo), endedAt: iso(daysAgo - 0.04) });
  const en = M.createEntry(exercise.id, { sets: sets.map(([w, r]) => M.createSet({ weightKg: w, reps: r, completedAt: iso(daysAgo - 0.02) })) });
  if (rating) en.rating = rating;
  s.entries = [en];
  return s;
}
const setSessions = (list) => store.set('sessions', list);

test('Bewertungs-Stufen und Pausentabelle', () => {
  assert.deepEqual(Object.keys(PR.RATINGS), ['easy', 'right', 'hard']);
  assert.equal(PR.breakReduction(20), 0);
  assert.equal(PR.breakReduction(21), 5);
  assert.equal(PR.breakReduction(40), 10);
  assert.equal(PR.breakReduction(60), 15);
  assert.equal(PR.breakReduction(120), 20);
  assert.equal(PR.breakReduction(400), 25);
});

test('Schrittgröße: kleinster Sprung aus der Historie, sonst Standard', () => {
  setSessions([]);
  assert.equal(PR.loadStep(ex, []), PR.FALLBACK_STEP);
  const hist = [past(20, ex, [[80, 5]]), past(10, ex, [[82.5, 5]]), past(5, ex, [[85, 5]])];
  assert.equal(PR.loadStep(ex, hist), 2.5);
  assert.equal(PR.loadStep(ex, [past(20, ex, [[80, 5]]), past(10, ex, [[81, 5]])]), 1);
});

test('Leicht → ein Gewichtsschritt mehr', () => {
  const hist = [past(9, ex, [[80, 6]], 'right'), past(3, ex, [[82.5, 6], [82.5, 5]], 'easy')];
  const s = PR.suggestFor(ex, hist);
  assert.equal(s.kind, 'weight');
  assert.equal(s.from, 82.5);
  assert.equal(s.to, 85);
  const sets = PR.applySuggestion([M.createSet({ type: 'warmup', weightKg: 40, reps: 8 }), M.createSet({ weightKg: 82.5, reps: 6 }), M.createSet({ weightKg: 82.5, reps: 5 })], s);
  assert.deepEqual(sets.map((x) => x.weightKg), [40, 85, 85], 'Aufwärmsatz bleibt');
});

test('Passend → +1 Wdh.; zweimal Passend beim gleichen Gewicht → Gewicht hoch, Wdh. zurück', () => {
  let s = PR.suggestFor(ex, [past(3, ex, [[82.5, 8], [82.5, 8]], 'right')]);
  assert.equal(s.kind, 'reps');
  assert.equal(s.deltaReps, 1);
  s = PR.suggestFor(ex, [past(8, ex, [[82.5, 8], [82.5, 7]], 'right'), past(3, ex, [[82.5, 9], [82.5, 8]], 'right')]);
  assert.equal(s.kind, 'weight');
  assert.equal(s.to, 85);
  const sets = PR.applySuggestion([M.createSet({ weightKg: 82.5, reps: 9 }), M.createSet({ weightKg: 82.5, reps: 8 })], s);
  assert.deepEqual(sets.map((x) => [x.weightKg, x.reps]), [[85, 8], [85, 7]]);
});

test('Schwer → halten; zweimal Schwer → ein Schritt weniger', () => {
  assert.equal(PR.suggestFor(ex, [past(8, ex, [[80, 6]], 'right'), past(3, ex, [[82.5, 5]], 'hard')]), null);
  const s = PR.suggestFor(ex, [past(8, ex, [[82.5, 5]], 'hard'), past(3, ex, [[82.5, 4]], 'hard')]);
  assert.equal(s.kind, 'weight');
  assert.equal(s.to, 80);
});

test('Großer Schritt (> 10 %) → erst Wiederholungen', () => {
  const s = PR.suggestFor(ex, [past(10, ex, [[15, 10]]), past(3, ex, [[20, 10]], 'easy')]);
  assert.equal(s.kind, 'reps');
  assert.equal(s.smallStepNote, true);
});

test('Ohne Bewertung, übersprungen, Cardio oder nach 3 Wochen: kein Vorschlag', () => {
  assert.equal(PR.suggestFor(ex, [past(3, ex, [[80, 6]])]), null);
  assert.equal(PR.suggestFor(ex, [past(3, ex, [[80, 6]], 'none')]), null);
  assert.equal(PR.suggestFor(ex, [past(25, ex, [[80, 6]], 'easy')]), null);
  assert.equal(PR.suggestFor({ ...ex, kind: 'cardio' }, [past(3, ex, [[80, 6]], 'easy')]), null);
});

test('Körpergewicht ohne Zusatzgewicht: Leicht → +1 Wdh.', () => {
  const s = PR.suggestFor(bw, [past(3, bw, [[null, 8]], 'easy')]);
  assert.equal(s.kind, 'reps');
});

test('Reduktion nach Pause: in ganzen Schritten abgerundet, Unterstützung bleibt', () => {
  assert.equal(PR.reducedWeight(82.5, 10, 2.5), 72.5);
  assert.equal(PR.reducedWeight(100, 5, 2.5), 95);
  assert.equal(PR.reducedWeight(20, 5, 2.5), 17.5);
  assert.equal(PR.reducedWeight(-10, 10, 2.5), -10);
  assert.equal(PR.breakInfo([past(10, ex, [[80, 5]])]), null);
  assert.deepEqual(PR.breakInfo([past(40, ex, [[80, 5]])]), { days: 40, pct: 10 });
  assert.equal(PR.breakInfo([]), null);
});

test('Im Training: Vorschlag sichtbar, Übernehmen ändert offene Sätze, Bewertung wird gespeichert', () => {
  setSessions([past(3, ex, [[82.5, 6], [82.5, 6]], 'easy')]);
  const plan = P.newPlan('Beine').plan;
  P.addExercises(plan.id, [ex.id]);
  assert.ok(S.startFromPlan(plan.id).ok);
  let v = S.sessionView();
  assert.equal(v.entries[0].suggestion.to, 85);
  const id = v.entries[0].entry.id;
  assert.ok(S.decideSuggestion(id, true).ok);
  v = S.sessionView();
  assert.equal(v.entries[0].suggestion, null);
  assert.deepEqual(v.entries[0].entry.sets.map((x) => x.weightKg), [85, 85]);
  const set = v.entries[0].entry.sets[0];
  assert.ok(S.completeSet(id, set.id, { weightKg: 85, reps: 6 }).ok);
  assert.ok(S.rateEntry(id, 'right').ok);
  assert.equal(S.rateEntry(id, 'super').ok, false);
  assert.ok(S.finish().ok);
  const fin = S.finishedSessions()[0];
  assert.equal(fin.entries[0].rating, 'right');
  assert.equal(fin.entries[0].suggestion, 'accepted');
  assert.deepEqual(M.validateData(store.snapshot()), []);
});

test('Ablehnen lässt Werte stehen', () => {
  setSessions([past(3, ex, [[82.5, 6]], 'easy')]);
  const plan = P.listPlans()[0];
  assert.ok(S.startFromPlan(plan.id).ok);
  const id = S.sessionView().entries[0].entry.id;
  assert.ok(S.decideSuggestion(id, false).ok);
  const v = S.sessionView();
  assert.equal(v.entries[0].suggestion, null);
  assert.equal(v.entries[0].entry.sets[0].weightKg, 82.5);
  S.discard();
});

test('Wiedereinstieg: Reduktion auf alle offenen Sätze, Vorschlagskarte entfällt, Backup gültig', () => {
  setSessions([past(40, ex, [[82.5, 6], [80, 6]], 'easy')]);
  const plan = P.listPlans()[0];
  assert.ok(S.startFromPlan(plan.id).ok);
  assert.ok(S.applyBreakReduction(10, 40).ok);
  const v = S.sessionView();
  assert.deepEqual(v.entries[0].entry.sets.map((x) => x.weightKg), [72.5, 70]);
  assert.equal(v.entries[0].suggestion, null);
  assert.deepEqual(S.activeSession().returnAdjust, { days: 40, pct: 10 });
  const res = B.parseBackupText(JSON.stringify(B.buildBackup()));
  assert.ok(res.ok, res.errors.join('; '));
  const bad = store.snapshot();
  bad.sessions[0].entries[0].rating = 'mega';
  assert.ok(M.validateData(bad).some((e) => e.includes('Bewertung')));
  S.discard();
});

test('Info-Texte: Quellen geprüft, kein Druck, keine Versagens-Pflicht', () => {
  for (const s of PR.PROGRESSION_INFO.sources) {
    assert.ok(s.url.startsWith('https://doi.org/'), s.label);
    assert.ok(/geprüft/.test(s.note), s.label);
  }
  const text = [...PR.PROGRESSION_INFO.rating, ...PR.PROGRESSION_INFO.rules, ...PR.PROGRESSION_INFO.pause].join(' ');
  for (const bad of ['Streak', 'Serie', 'musst bis zum Versagen', 'Belohnung']) assert.ok(!text.includes(bad), bad);
});

done();
