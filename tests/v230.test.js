// v2.30.0: Wiederholungsbereich pro Planeintrag (B2) und leichte Woche (B3).
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const PR = await import('../js/progression.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const S = await import('../js/session.js');
const { test, done } = runner();

console.log('# v2.30.0');
store.init();

const DAY = 86400000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();
const ex = lib.saveExercise(M.createExercise({ name: 'Bankdrücken', muscles: { primary: ['chest'], secondary: [] } })).exercise;
const bw = lib.saveExercise(M.createExercise({ name: 'Liegestütz', kind: 'bodyweight', muscles: { primary: ['chest'], secondary: [] } })).exercise;
const R = { min: 8, max: 12 };

function past(daysAgo, exercise, sets, rating, extra = {}) {
  const s = { ...M.createSession({ startedAt: iso(daysAgo), endedAt: iso(daysAgo - 0.04) }), ...extra };
  const en = M.createEntry(exercise.id, { sets: sets.map(([w, r]) => M.createSet({ weightKg: w, reps: r, completedAt: iso(daysAgo - 0.02) })) });
  if (rating) en.rating = rating;
  s.entries = [en];
  return s;
}

// ---------- Validierung ----------

test('Validierung: repRange an Plan-Eintrag und Trainings-Eintrag, light am Training', () => {
  const p = M.createPlan({ name: 'X', items: [M.createPlanItem(ex.id, { repRange: { min: 8, max: 12 } })] });
  assert.deepEqual(M.validatePlan(p), []);
  for (const bad of [{ min: 0, max: 5 }, { min: 9, max: 8 }, { min: 5, max: 51 }, { min: 8 }, '8-12']) {
    assert.ok(M.validatePlan({ ...p, items: [{ ...p.items[0], repRange: bad }] }).length, JSON.stringify(bad));
  }
  assert.deepEqual(M.validatePlan({ ...p, items: [{ ...p.items[0], repRange: { min: 5, max: 5 } }] }), [], 'feste Zahl erlaubt');
  const s = past(1, ex, [[60, 10]]);
  assert.deepEqual(M.validateSession({ ...s, light: true }), []);
  assert.ok(M.validateSession({ ...s, light: 'ja' }).length);
  assert.ok(M.validateSession({ ...s, entries: [{ ...s.entries[0], repRange: { min: 3, max: 2 } }] }).length);
});

// ---------- B2: Bereich ----------

test('Bereich: nicht alle Sätze oben → +1 Wdh. je Satz, gedeckelt am oberen Ende', () => {
  const sug = PR.suggestFor(ex, [past(3, ex, [[60, 12], [60, 11], [60, 10]], 'right')], { repRange: R });
  assert.equal(sug.kind, 'reps');
  assert.equal(sug.repsCap, 12);
  const sets = [12, 11, 10].map((r) => M.createSet({ weightKg: 60, reps: r }));
  assert.deepEqual(PR.applySuggestion(sets, sug).map((x) => x.reps), [12, 12, 11]);
});

test('Bereich: alle Sätze am oberen Ende → ein Schritt mehr, Wdh. zurück ans untere Ende', () => {
  const sug = PR.suggestFor(ex, [past(3, ex, [[60, 12], [60, 12], [60, 13]], 'right')], { repRange: R });
  assert.equal(sug.kind, 'weight');
  assert.equal(sug.to, 62.5);
  const sets = [12, 12, 13].map((r) => M.createSet({ weightKg: 60, reps: r }));
  const out = PR.applySuggestion(sets, sug);
  assert.deepEqual(out.map((x) => [x.weightKg, x.reps]), [[62.5, 8], [62.5, 8], [62.5, 8]]);
});

test('Bereich entscheidet auch ohne Bewertung; „Leicht“ ändert nichts an der Regel', () => {
  assert.equal(PR.suggestFor(ex, [past(3, ex, [[60, 10], [60, 10]])], { repRange: R }).kind, 'reps');
  assert.equal(PR.suggestFor(ex, [past(3, ex, [[60, 10], [60, 10]], 'none')], { repRange: R }).kind, 'reps');
  assert.equal(PR.suggestFor(ex, [past(3, ex, [[60, 10], [60, 10]], 'easy')], { repRange: R }).kind, 'reps', 'ohne Bereich wäre es ein Gewichtsschritt');
});

test('„Schwer“ bremst: einmal → kein Vorschlag, zweimal beim gleichen Gewicht → ein Schritt weniger', () => {
  assert.equal(PR.suggestFor(ex, [past(3, ex, [[60, 12], [60, 12]], 'hard')], { repRange: R }), null, 'auch am oberen Ende keine Steigerung');
  const two = [past(6, ex, [[60, 9]], 'hard'), past(3, ex, [[60, 9]], 'hard')];
  const sug = PR.suggestFor(ex, two, { repRange: R });
  assert.equal(sug.kind, 'weight');
  assert.equal(sug.to, 57.5);
});

test('Körpergewicht ohne Zusatzgewicht: Wdh. bis oben, dann kein Vorschlag', () => {
  assert.equal(PR.suggestFor(bw, [past(3, bw, [[null, 10]], 'right')], { repRange: R }).kind, 'reps');
  assert.equal(PR.suggestFor(bw, [past(3, bw, [[null, 12], [null, 12]], 'right')], { repRange: R }), null);
});

// ---------- B3: leichte Woche ----------

test('Sätze halbieren (aufgerundet, mindestens 1), Gewicht etwa −10 % in ganzen Schritten', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(PR.lightSetCount), [1, 1, 2, 2, 3, 3]);
  assert.equal(PR.lightWeight(60, 2.5), 55);
  assert.equal(PR.lightWeight(100, 2.5), 90);
  assert.equal(PR.lightWeight(20, 2), 18);
  assert.equal(PR.lightWeight(10, 5), 5, 'mindestens ein Schritt');
  assert.equal(PR.lightWeight(null, 2.5), null);
  assert.equal(PR.lightWeight(-20, 2.5), -20, 'Unterstützung bleibt');
});

test('applyLight: Aufwärmsätze und erledigte Sätze bleiben, offene Arbeitssätze halbiert und leichter', () => {
  const sets = [
    M.createSet({ type: 'warmup', weightKg: 40, reps: 8 }),
    ...[1, 2, 3, 4].map(() => M.createSet({ weightKg: 60, reps: 10 }))
  ];
  const out = PR.applyLight(sets, 2.5);
  assert.equal(out.length, 3);
  assert.equal(out[0].weightKg, 40);
  assert.deepEqual(out.slice(1).map((x) => x.weightKg), [55, 55]);
});

test('Leichte Trainings sind kein Ausgangspunkt für Vorschlag und Vorbelegung', () => {
  const normal = past(8, ex, [[60, 12], [60, 12]], 'right');
  const light = past(2, ex, [[55, 8]], 'easy', { light: true });
  const sug = PR.suggestFor(ex, [normal, light], { repRange: R });
  assert.equal(sug.from, 60);
  assert.equal(sug.to, 62.5);
  const pre = M.prefillSets(ex, [normal, light]);
  assert.deepEqual(pre.map((x) => [x.weightKg, x.reps]), [[60, 12], [60, 12]]);
  assert.equal(M.lastPerformance(ex.id, [normal, light]).sets[0].weightKg, 55, 'ohne skipLight: wirklich zuletzt');
});

// ---------- Ablauf mit Plan ----------

let plan;
test('Plan: Bereich setzen, prüfen, entfernen; Training übernimmt ihn, auch nach Tausch', () => {
  plan = P.newPlan('Push').plan;
  P.addExercises(plan.id, [ex.id, bw.id]);
  const it = P.getPlan(plan.id).items[0];
  assert.ok(P.setItemRepRange(plan.id, it.id, { min: 8, max: 12 }).ok);
  assert.equal(P.setItemRepRange(plan.id, it.id, { min: 13, max: 12 }).ok, false);
  assert.deepEqual(P.getPlan(plan.id).items[0].repRange, { min: 8, max: 12 });
  assert.ok(P.setItemRepRange(plan.id, P.getPlan(plan.id).items[1].id, { min: 5, max: 5 }).ok);
  assert.ok(P.setItemRepRange(plan.id, P.getPlan(plan.id).items[1].id, null).ok);
  assert.equal(P.getPlan(plan.id).items[1].repRange, undefined);
  const r = S.startFromPlan(plan.id);
  assert.ok(r.ok);
  assert.deepEqual(r.session.entries[0].repRange, { min: 8, max: 12 });
  assert.equal(r.session.entries[1].repRange, undefined);
  const dips = lib.saveExercise(M.createExercise({ name: 'Dips', muscles: { primary: ['chest'], secondary: [] } })).exercise;
  assert.ok(S.swapEntry(r.session.entries[0].id, dips.id).ok);
  const sw = S.activeSession().entries[0];
  assert.equal(sw.exerciseId, dips.id);
  assert.deepEqual(sw.repRange, { min: 8, max: 12 }, 'Bereich gehört zum Platz');
  S.discard();
});

test('Leichte Woche im Training: markiert, Sätze halbiert, kein Vorschlag; danach wieder vom Normalstand', () => {
  store.set('sessions', [past(5, ex, [[60, 12], [60, 12], [60, 12], [60, 12]], 'right')]);
  S.startFromPlan(plan.id);
  assert.ok(S.applyLightWeek().ok);
  let s = S.activeSession();
  assert.equal(s.light, true);
  const benchEntry = s.entries.find((e) => e.exerciseId === ex.id);
  assert.deepEqual(benchEntry.sets.map((x) => x.weightKg), [55, 55]);
  assert.equal(S.sessionView().entries[0].suggestion, null, 'in der leichten Woche keine Vorschlagskarte');
  for (const set of benchEntry.sets) S.completeSet(benchEntry.id, set.id, { weightKg: 55, reps: 8 });
  const bwEntry = s.entries.find((e) => e.exerciseId === bw.id);
  for (const set of bwEntry.sets) S.completeSet(bwEntry.id, set.id, { reps: 10 });
  assert.ok(S.finish().ok);
  assert.deepEqual(M.validateSession(store.get('sessions').find((x) => x.light)), []);
  // nächstes normales Training: Vorbelegung vom Training vor der leichten Woche, Vorschlag aus dem Bereich
  S.startFromPlan(plan.id);
  s = S.activeSession();
  const e2 = s.entries.find((e) => e.exerciseId === ex.id);
  assert.deepEqual(e2.sets.map((x) => x.weightKg), [60, 60, 60, 60]);
  const sug = S.sessionView().entries.find((d) => d.entry.id === e2.id).suggestion;
  assert.equal(sug?.kind, 'weight');
  assert.equal(sug.to, 62.5);
  assert.ok(S.decideSuggestion(e2.id, true).ok);
  assert.deepEqual(S.activeSession().entries.find((e) => e.id === e2.id).sets.map((x) => [x.weightKg, x.reps]), [[62.5, 8], [62.5, 8], [62.5, 8], [62.5, 8]]);
  S.discard();
});

test('Einstellung lightWeek gültig speicherbar', () => {
  const st = store.get('settings');
  assert.equal(st.lightWeek, null);
  assert.ok(store.set('settings', { ...st, lightWeek: '2026-10-19' }));
});

// ---------- B1: Supersätze ----------
const SS = await import('../js/superset.js');
const SYNC = await import('../js/plan-sync.js');

test('chainGroups: Ketten ab zwei Einträgen, Kopplung am Ende zählt nicht', () => {
  const it = (id, link) => ({ id, exerciseId: id, groupId: null, targetSets: null, ...(link ? { supersetNext: true } : {}) });
  let n = 0;
  const g = SS.chainGroups([it('a', 1), it('b'), it('c'), it('d', 1), it('e', 1), it('f'), it('g', 1)], () => `g${++n}`);
  assert.equal(g.get('a'), g.get('b'));
  assert.ok(!g.has('c'));
  assert.equal(g.get('d'), g.get('f'));
  assert.notEqual(g.get('a'), g.get('d'));
  assert.ok(!g.has('g'), 'letzter Eintrag gekoppelt ins Leere');
  assert.deepEqual(SS.normalizeLinks([it('x', 1)]), [{ id: 'x', exerciseId: 'x', groupId: null, targetSets: null }]);
});

let ssPlan, a, bb, c;
test('Plan: koppeln, lösen; Verschieben und Entfernen lösen Kopplungen am Platz', () => {
  a = lib.saveExercise(M.createExercise({ name: 'SS-A', muscles: { primary: ['chest'], secondary: [] }, restSeconds: 90 })).exercise;
  bb = lib.saveExercise(M.createExercise({ name: 'SS-B', muscles: { primary: ['lats'], secondary: [] }, restSeconds: 150 })).exercise;
  c = lib.saveExercise(M.createExercise({ name: 'SS-C', muscles: { primary: ['quads'], secondary: [] } })).exercise;
  ssPlan = P.newPlan('Supersatz').plan;
  P.addExercises(ssPlan.id, [a.id, bb.id, c.id]);
  const ids = () => P.getPlan(ssPlan.id).items.map((x) => x.id);
  const links = () => P.getPlan(ssPlan.id).items.map((x) => !!x.supersetNext);
  assert.ok(P.setLinkNext(ssPlan.id, ids()[0], true).ok);
  assert.equal(P.setLinkNext(ssPlan.id, ids()[2], true).ok, false, 'letzter Eintrag');
  assert.deepEqual(links(), [true, false, false]);
  assert.deepEqual(M.validatePlan(P.getPlan(ssPlan.id)), []);
  // Verschieben von C nach vorn: Kopplung am neuen Platz (davor nichts) und alte bleiben vorhersehbar
  P.moveItem(ssPlan.id, ids()[2], 1);
  assert.deepEqual(links(), [false, false, false], 'A war Vorgänger des neuen Platzes → gelöst');
  P.moveItem(ssPlan.id, ids()[1], 2); // C zurück ans Ende
  assert.ok(P.setLinkNext(ssPlan.id, ids()[0], true).ok);
  assert.ok(P.setLinkNext(ssPlan.id, ids()[1], true).ok);
  P.removeItem(ssPlan.id, ids()[2]);
  assert.deepEqual(links(), [true, false], 'Kopplung ins Leere entfernt');
  P.addExercises(ssPlan.id, [c.id]);
  P.removeItem(ssPlan.id, ids()[1]);
  assert.deepEqual(links(), [false, false], 'Vorgänger eines entfernten Eintrags gelöst');
  P.removeItem(ssPlan.id, ids()[1]);
  P.addExercises(ssPlan.id, [bb.id, c.id]);
  P.setLinkNext(ssPlan.id, ids()[0], true);
  assert.deepEqual(P.getPlan(ssPlan.id).items.map((x) => x.exerciseId), [a.id, bb.id, c.id]);
});

test('Training: A und B teilen eine Gruppe; ohne Pause in der Runde, nach der Runde die längste Pause', () => {
  store.set('sessions', []);
  assert.ok(S.startFromPlan(ssPlan.id).ok);
  let s = S.activeSession();
  assert.ok(s.entries[0].ssGroup && s.entries[0].ssGroup === s.entries[1].ssGroup);
  assert.equal(s.entries[2].ssGroup, undefined);
  assert.equal(SS.letterOf(s, s.entries[1].id), 'B');
  const [ea, eb] = s.entries;
  // A Satz 1 → weiter mit B, keine Pause
  S.completeSet(ea.id, ea.sets[0].id, { weightKg: 40, reps: 10 });
  s = S.activeSession();
  assert.equal(s.restTimer, null);
  assert.deepEqual(SS.afterSet(s, ea.id), { rest: false, next: eb.id });
  // B Satz 1 → Runde vorbei, Pause = max(90, 150), danach A
  S.completeSet(eb.id, eb.sets[0].id, { weightKg: 50, reps: 12 });
  s = S.activeSession();
  assert.equal(s.restTimer.durationSec, 150);
  assert.deepEqual(SS.afterSet(s, eb.id), { rest: true, next: ea.id });
  // C ist normal
  const ec = s.entries[2];
  S.completeSet(ec.id, ec.sets[0].id, { weightKg: 80, reps: 5 });
  assert.equal(S.activeSession().restTimer.durationSec, store.get('settings').restSeconds);
  assert.equal(SS.afterSet(S.activeSession(), ec.id), null);
});

test('Ungleiche Satzzahl: ist B fertig, kommt nach A direkt die Pause; Tausch behält die Gruppe', () => {
  let s = S.activeSession();
  const [ea, eb] = s.entries;
  // B nur 1 Satz: übrige B-Sätze entfernen
  for (const x of eb.sets.slice(1)) S.removeSet(eb.id, x.id);
  S.completeSet(ea.id, ea.sets[1].id, { weightKg: 40, reps: 10 });
  s = S.activeSession();
  assert.ok(s.restTimer && s.restTimer.durationSec === 150, 'Runde nur noch aus A → Pause');
  assert.deepEqual(SS.afterSet(s, ea.id), { rest: true, next: ea.id });
  // Tausch einer Übung ohne erledigten Satz behält ssGroup (neues Training)
  S.discard();
  S.startFromPlan(ssPlan.id);
  s = S.activeSession();
  assert.ok(S.swapEntry(s.entries[1].id, c.id).ok);
  assert.equal(S.activeSession().entries[1].ssGroup, s.entries[0].ssGroup);
  assert.deepEqual(M.validateSession(S.activeSession()), []);
  S.discard();
});

test('Plan anpassen (B4): Entfernen löst die Kopplung des Vorgängers', () => {
  const items = [{ id: 'i1', exerciseId: 'x', supersetNext: true }, { id: 'i2', exerciseId: 'y' }];
  const out = SYNC.applyChanges(items, [{ kind: 'remove', itemId: 'i2' }], () => null);
  assert.deepEqual(out, [{ id: 'i1', exerciseId: 'x' }]);
});

test('Validierung: supersetNext und ssGroup', () => {
  const p = P.getPlan(ssPlan.id);
  assert.ok(M.validatePlan({ ...p, items: [{ ...p.items[0], supersetNext: 'ja' }, ...p.items.slice(1)] }).length);
  const s = past(1, ex, [[60, 10]]);
  assert.ok(M.validateSession({ ...s, entries: [{ ...s.entries[0], ssGroup: 5 }] }).length);
});

done();
