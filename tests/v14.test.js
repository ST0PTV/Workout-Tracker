// v1.4: Wochensätze pro Muskel, Figur, Pause pro Planeintrag, Körpergewicht/Cardio, leerer Satz, Datum/Dauer im Tagebuch.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const S = await import('../js/session.js');
const H = await import('../js/history.js');
const W = await import('../js/week.js');
const F = await import('../js/figure.js');
const I = await import('../js/input.js');
const SETS = await import('../js/sets.js');
const R = await import('../js/rest.js');
const G = await import('../js/groups.js');
const { test, done } = runner();

console.log('# v1.4 (Paket)');
store.init();
const mk = (name, primary, secondary = [], kind = 'strength') => lib.saveExercise(M.createExercise({ name, kind, muscles: { primary, secondary } })).exercise;
const press = mk('Beinpresse', ['quads'], ['glutes', 'adductors']);
const bench = mk('Bankdrücken', ['chest'], ['triceps', 'front-delts']);
const pull = mk('Klimmzüge', ['lats'], ['biceps'], 'bodyweight');
const row = mk('Rudergerät', [], [], 'cardio');
const local = (y, mo, d, h = 10) => new Date(y, mo - 1, d, h).toISOString();
const done1 = (iso, w, r, type = 'work') => M.createSet({ type, weightKg: w, reps: r, completedAt: iso });

test('Woche: Montag 00:00 bis Sonntag (Ortszeit)', () => {
  const mon = W.weekStart(new Date(2026, 9, 14, 18)); // Mi 14.10.2026
  assert.equal(mon.getDay(), 1);
  assert.equal(mon.getDate(), 12);
  assert.equal(mon.getHours(), 0);
  assert.equal(W.weekStart(new Date(2026, 9, 18, 23, 59)).getDate(), 12, 'Sonntag gehört zur Woche davor');
  assert.equal(W.weekStart(new Date(2026, 9, 19, 0, 1)).getDate(), 19, 'Montag beginnt neue Woche');
  assert.equal(W.addWeeks(mon, -1).getDate(), 5);
});

test('Wochensätze: primär 1, sekundär 0,5; Aufwärmen, offene Sätze, Cardio und andere Wochen zählen nicht', () => {
  const byId = Object.fromEntries(store.get('exercises').map((e) => [e.id, e]));
  const s1 = M.createSession({ startedAt: local(2026, 10, 12), endedAt: local(2026, 10, 12, 11), entries: [
    M.createEntry(press.id, { sets: [done1(local(2026, 10, 12), 60, 10, 'warmup'), done1(local(2026, 10, 12), 100, 10), done1(local(2026, 10, 12), 100, 9), M.createSet({ weightKg: 100, reps: 8 })] }),
    M.createEntry(row.id, { sets: [M.createSet({ durationSec: 1200, distanceM: 4600, completedAt: local(2026, 10, 12) })] })
  ] });
  const s2 = M.createSession({ startedAt: local(2026, 10, 18, 20), endedAt: local(2026, 10, 18, 21), entries: [
    M.createEntry(press.id, { sets: [done1(local(2026, 10, 18, 20), 100, 8, 'drop')] }),
    M.createEntry(bench.id, { sets: [done1(local(2026, 10, 18, 20), 80, 8), done1(local(2026, 10, 18, 20), 80, 7)] })
  ] });
  const other = M.createSession({ startedAt: local(2026, 10, 19), endedAt: local(2026, 10, 19, 11), entries: [M.createEntry(bench.id, { sets: [done1(local(2026, 10, 19), 80, 8)] })] });
  const running = M.createSession({ startedAt: local(2026, 10, 13), entries: [M.createEntry(bench.id, { sets: [done1(local(2026, 10, 13), 80, 8)] })] });
  const w = W.weeklyMuscleSets([s1, s2, other, running], byId, new Date(2026, 9, 14));
  assert.equal(w.sessions, 2);
  assert.equal(w.muscles.quads.direct, 3, '2 Arbeitssätze + 1 Drop-Satz');
  assert.equal(w.muscles.glutes.indirect, 1.5);
  assert.equal(w.muscles.glutes.direct, 0);
  assert.equal(w.muscles.chest.direct, 2);
  assert.equal(w.muscles.triceps.total, 1);
  assert.equal(w.muscles.lats.total, 0);
  assert.deepEqual(w.muscles.quads.exercises, [{ exerciseId: press.id, direct: 3, indirect: 0 }]);
  assert.deepEqual([0, 0.5, 4.5, 5, 8.5, 9].map(W.level), [0, 1, 1, 2, 2, 3]);
  assert.equal(W.fmtSets(1.5), '1,5');
});

test('Gleiche Übung zweimal in einer Woche/einem Training: Sätze addieren sich (Lesson 5)', () => {
  const byId = Object.fromEntries(store.get('exercises').map((e) => [e.id, e]));
  const s = M.createSession({ startedAt: local(2026, 10, 13), endedAt: local(2026, 10, 13, 11), entries: [
    M.createEntry(bench.id, { sets: [done1(local(2026, 10, 13), 80, 8)] }),
    M.createEntry(bench.id, { sets: [done1(local(2026, 10, 13), 60, 12), done1(local(2026, 10, 13), 60, 10)] })
  ] });
  const w = W.weeklyMuscleSets([s], byId, new Date(2026, 9, 13));
  assert.equal(w.muscles.chest.direct, 3);
  assert.equal(w.muscles.chest.exercises.length, 1);
});

test('Figur: Ansicht nach primären Muskeln; Einstellung figure mit Standard', () => {
  assert.equal(F.pickView(bench), 'front');
  assert.equal(F.pickView(pull), 'back');
  assert.equal(F.pickView({ muscles: { primary: ['hamstrings', 'glutes'] } }), 'back');
  assert.equal(F.pickView({ muscles: { primary: [] } }), 'front');
  // v2.3.0: primäre Muskeln vorn und hinten → beide Seiten
  assert.deepEqual(F.pickViews({ muscles: { primary: ['chest', 'triceps'] } }), ['front', 'back']);
  assert.deepEqual(F.pickViews({ muscles: { primary: ['forearms'] } }), ['front']);
  assert.deepEqual(F.pickViews(pull), ['back']);
  assert.equal(store.get('settings').figure, 'male');
  for (const m of Object.keys(M.MUSCLES)) assert.ok(F.FRONT.includes(m) || F.BACK.includes(m), `${m} ist in einer Ansicht`);
});

test('Leerer Satz: ohne Werte kein Haken; Platzhalter aus vorherigem Satz bzw. letzter Ausführung', () => {
  assert.equal(M.completionError({ weightKg: null, reps: null }, 'strength'), 'Erst Gewicht und Wdh. eintragen.');
  assert.equal(M.completionError({ weightKg: 80, reps: 0 }, 'strength') !== null, true);
  assert.equal(M.completionError({ weightKg: 0, reps: 8 }, 'strength'), null, '0 kg ist ein Wert');
  assert.equal(M.completionError({ weightKg: null, reps: 8 }, 'bodyweight'), null);
  assert.equal(M.completionError({ durationSec: null, distanceM: null }, 'cardio') !== null, true);
  assert.equal(M.completionError({ durationSec: 600, distanceM: null }, 'cardio'), null);
  const entry = M.createEntry(bench.id, { sets: [M.createSet({ weightKg: 80, reps: 8 }), M.createSet(), M.createSet()] });
  assert.deepEqual(M.placeholderFor(entry, 1, null), { weightKg: 80, reps: 8 });
  const fresh = M.createEntry(bench.id, { sets: [M.createSet({ type: 'warmup' }), M.createSet(), M.createSet()] });
  const last = { sets: [M.createSet({ type: 'warmup', weightKg: 40, reps: 10 }), M.createSet({ weightKg: 82.5, reps: 8 }), M.createSet({ weightKg: 82.5, reps: 7 })] };
  assert.deepEqual(M.placeholderFor(fresh, 2, last), { weightKg: 82.5, reps: 7 });
  assert.deepEqual(M.placeholderFor(fresh, 0, last), { weightKg: 40, reps: 10 });
  assert.equal(M.placeholderFor(fresh, 1, null), null);
});

test('Training: completeSet lehnt leeren Satz ab; Cardio startet keine Pause; Beenden entfernt leere Sätze', () => {
  assert.ok(S.startEmpty().ok);
  assert.ok(S.addEntry(bench.id).ok);
  assert.ok(S.addEntry(row.id).ok);
  let s = S.activeSession();
  const [b, c] = s.entries;
  const r1 = S.completeSet(b.id, b.sets[0].id, { weightKg: null, reps: null });
  assert.equal(r1.ok, false);
  assert.equal(r1.errors[0], 'Erst Gewicht und Wdh. eintragen.');
  assert.ok(S.completeSet(b.id, b.sets[0].id, { weightKg: 80, reps: 8 }).ok);
  assert.ok(S.activeSession().restTimer);
  S.stopRest();
  assert.ok(S.completeSet(c.id, c.sets[0].id, { durationSec: 1200, distanceM: 4600, intensity: 'moderate' }).ok);
  s = S.activeSession();
  assert.equal(s.restTimer, null, 'keine Satzpause nach Cardio');
  assert.equal(s.entries[1].sets[0].intensity, 'moderate');
  assert.equal(M.sessionSummary(s, Object.fromEntries(store.get('exercises').map((e) => [e.id, e]))).hardSets, 1, 'Cardio ist kein harter Satz');
  // Altdaten-Fall: erledigter Satz ganz ohne Werte wird beim Beenden verworfen
  const all = store.get('sessions');
  all.find((x) => x.endedAt === null).entries[0].sets.push(M.createSet({ completedAt: new Date().toISOString() }));
  store.set('sessions', all);
  const fin = S.finish();
  assert.ok(fin.ok);
  assert.equal(fin.session.entries[0].sets.length, 1);
});

test('Körpergewicht: Zusatzgewicht/Unterstützung; negatives Gewicht nur bei Körpergewicht gültig', () => {
  assert.equal(I.parseAddedWeight('+5'), 5);
  assert.equal(I.parseAddedWeight('-10'), -10);
  assert.equal(I.parseAddedWeight('−10'), -10, 'typografisches Minus');
  assert.equal(I.parseAddedWeight(''), null);
  assert.ok(Number.isNaN(I.parseAddedWeight('abc')));
  assert.equal(I.fmtAdded(5), '+5');
  assert.equal(I.fmtAdded(-2.5), '-2,5');
  assert.equal(SETS.formatSet(M.createSet({ weightKg: null, reps: 8 }), 'bodyweight'), 'KG × 8');
  assert.equal(SETS.formatSet(M.createSet({ weightKg: 5, reps: 5 }), 'bodyweight'), '+5 × 5');
  assert.equal(SETS.formatSet(M.createSet({ weightKg: -10, reps: 6 }), 'bodyweight'), '−10 × 6');
  assert.equal(SETS.formatSet(M.createSet({ weightKg: null, reps: 8 })), '8 Wdh.');
  const ok = M.createSession({ startedAt: local(2026, 10, 1), endedAt: local(2026, 10, 1, 11), entries: [M.createEntry(pull.id, { sets: [done1(local(2026, 10, 1), -10, 6)] })] });
  const bad = M.createSession({ startedAt: local(2026, 10, 2), endedAt: local(2026, 10, 2, 11), entries: [M.createEntry(bench.id, { sets: [done1(local(2026, 10, 2), -10, 6)] })] });
  const data = { exercises: store.get('exercises'), groups: [], plans: [], sessions: [ok] };
  assert.deepEqual(M.validateData(data), []);
  assert.ok(M.validateData({ ...data, sessions: [bad] }).some((e) => e.includes('negatives Gewicht')));
});

test('Cardio: Dauer/Strecke parsen und formatieren, Tempo', () => {
  assert.equal(I.parseDuration('20'), 1200);
  assert.equal(I.parseDuration('20:30'), 1230);
  assert.equal(I.parseDuration('1:05:00'), 3900);
  assert.ok(Number.isNaN(I.parseDuration('20:75')));
  assert.equal(I.parseDuration(''), null);
  assert.equal(I.fmtDuration(1230), '20:30');
  assert.equal(I.fmtDuration(3900), '1:05:00');
  assert.equal(I.parseDistanceKm('4,6'), 4600);
  assert.equal(I.fmtKm(4600), '4,6');
  assert.equal(I.fmtPace(1200, 4600, 500), '2:10 /500 m');
  assert.equal(I.fmtPace(1800, 5000), '6:00 /km');
  assert.equal(SETS.formatSet(M.createSet({ durationSec: 1200, distanceM: 4600 }), 'cardio'), '20:00 · 4,6 km');
  assert.ok(M.validateSet(M.createSet({ intensity: 'brutal' })).length);
  assert.deepEqual(M.validateSet(M.createSet({ intensity: 'hard' })), []);
});

test('Pause nur in diesem Plan: Planeintrag → Trainingseintrag → Satzpause; bleibt nach Tausch', () => {
  const plan = P.newPlan('Beine').plan;
  P.addExercises(plan.id, [press.id, bench.id]);
  const [it1, it2] = P.getPlan(plan.id).items;
  assert.ok(P.setItemRest(plan.id, it1.id, 150).ok);
  assert.equal(P.setItemRest(plan.id, it1.id, 7).ok, false);
  assert.ok(P.setItemRest(plan.id, it2.id, null).ok);
  assert.equal(P.getPlan(plan.id).items[0].restSeconds, 150);
  lib.saveExercise({ ...lib.getExercise(press.id), restSeconds: 120 });
  assert.equal(R.effectiveRest(lib.getExercise(press.id), store.get('settings'), { restSeconds: 150 }), 150);
  assert.equal(R.effectiveRest(lib.getExercise(press.id), store.get('settings'), { restSeconds: null }), 120);
  assert.ok(S.startFromPlan(plan.id).ok);
  const en = S.activeSession().entries[0];
  assert.equal(en.restSeconds, 150);
  assert.ok(S.completeSet(en.id, en.sets[0].id, { weightKg: 100, reps: 10 }).ok);
  assert.equal(S.activeSession().restTimer.durationSec, 150);
  const g = G.addGroup('Beine Grund').group;
  lib.saveExercise({ ...lib.getExercise(press.id), groupIds: [g.id] });
  const hack = mk('Hack Squat', ['quads']);
  lib.saveExercise({ ...lib.getExercise(hack.id), groupIds: [g.id] });
  const ins = S.swapEntry(en.id, hack.id);
  assert.equal(ins.mode, 'inserted');
  assert.equal(S.activeSession().entries[1].restSeconds, 150, 'eingefügte Übung übernimmt die Plan-Pause des Platzes');
  assert.ok(P.setItemGroup(plan.id, it1.id, g.id).ok);
  assert.equal(P.setItemGroup(plan.id, it1.id, 'gibt-es-nicht').ok, false);
  assert.deepEqual(M.validatePlan(P.getPlan(plan.id)), []);
  S.discard();
});

test('Tagebuch: Beginn/Ende ändern verschiebt Satz-Zeitpunkte; Grenzen werden geprüft', () => {
  const start = local(2026, 10, 5, 18);
  const sess = M.createSession({ startedAt: start, endedAt: local(2026, 10, 5, 19), entries: [M.createEntry(bench.id, { sets: [
    done1(new Date(Date.parse(start) + 10 * 60000).toISOString(), 80, 8), done1(new Date(Date.parse(start) + 20 * 60000).toISOString(), 80, 7)] })] });
  store.set('sessions', [...store.get('sessions'), sess]);
  const d = H.startEdit(sess.id);
  assert.equal(H.setTimes(d, local(2026, 10, 5, 19), local(2026, 10, 5, 18)).ok, false, 'Ende vor Beginn');
  assert.equal(H.setTimes(d, local(2026, 10, 5, 6), local(2026, 10, 5, 19)).ok, false, 'länger als 12 h');
  assert.equal(H.setTimes(d, local(2030, 1, 1, 10), local(2030, 1, 1, 11)).ok, false, 'Zukunft');
  const newStart = local(2026, 10, 4, 7);
  assert.ok(H.setTimes(d, newStart, local(2026, 10, 4, 8)).ok);
  assert.ok(H.isDirty(d));
  const times = d.entries[0].sets.map((x) => Date.parse(x.completedAt) - Date.parse(newStart));
  assert.deepEqual(times, [10 * 60000, 20 * 60000], 'Abstand zum Beginn bleibt');
  assert.ok(H.saveEdited(d).ok);
  const saved = H.getFinished(sess.id);
  assert.equal(saved.startedAt, new Date(newStart).toISOString());
  assert.equal(H.durationMin(saved), 60);
  // Ende früher als ein Satz → Satz wird ans Ende gesetzt (Reihenfolge bleibt)
  const d2 = H.startEdit(sess.id);
  assert.ok(H.setTimes(d2, newStart, new Date(Date.parse(newStart) + 15 * 60000).toISOString()).ok);
  const t2 = d2.entries[0].sets.map((x) => Date.parse(x.completedAt));
  assert.ok(t2[0] <= t2[1]);
  assert.equal(t2[1], Date.parse(d2.endedAt));
});

done();
