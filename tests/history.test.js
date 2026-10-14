// Trainings-Tagebuch (v1.1): Bearbeiten abgeschlossener Trainings, Folgen für Fortschritt und Vorbelegung.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const lib = await import('../js/exercises.js');
const S = await import('../js/session.js');
const H = await import('../js/history.js');
const G = await import('../js/progress.js');
const I = await import('../js/input.js');
const { test, done } = runner();

console.log('# history (Tagebuch)');
store.init();
const bench = lib.addFromPool('bench-press-barbell').exercise;
const fly = lib.addFromPool('pec-deck').exercise;

const T = (d, h = 10) => new Date(Date.UTC(2026, 9, d, h)).toISOString();
const set = (w, r, type = 'work', d = 1) => M.createSet({ type, weightKg: w, reps: r, completedAt: T(d) });
function finished(d, entries) {
  const s = M.createSession({ startedAt: T(d, 10), endedAt: T(d, 11), entries });
  store.set('sessions', [...store.get('sessions'), s]);
  return s;
}

const old = finished(1, [M.createEntry(bench.id, { sets: [set(40, 10, 'warmup'), set(80, 8), set(80, 7)] })]);
const typo = finished(3, [
  M.createEntry(bench.id, { sets: [set(85, 8, 'work', 3), set(850, 8, 'work', 3)] }),
  M.createEntry(fly.id, { sets: [set(50, 12, 'work', 3)] })
]);

test('Eingabe-Parsing: Komma, Grenzen, leer = null, ungültig = NaN', () => {
  assert.equal(I.parseWeight('82,5'), 82.5);
  assert.equal(I.parseWeight(''), null);
  assert.ok(Number.isNaN(I.parseWeight('-5')));
  assert.ok(Number.isNaN(I.parseWeight('1001')));
  assert.equal(I.parseReps('8'), 8);
  assert.ok(Number.isNaN(I.parseReps('8,5')));
  assert.equal(I.fmtNum(82.5), '82,5');
});

test('Tagebuch: neueste zuerst, Name, Dauer, Arbeitssätze, Kurzfassung', () => {
  const rows = H.diaryRows();
  assert.deepEqual(rows.map((r) => r.session.id), [typo.id, old.id]);
  assert.equal(rows[0].name, 'Freies Training');
  assert.equal(rows[0].durationMin, 60);
  assert.equal(rows[1].hardSets, 2); // Aufwärmsatz zählt nicht
  assert.equal(H.exerciseLine([{ name: 'A', hardSets: 3 }, { name: 'B', hardSets: 2 }, { name: 'C', hardSets: 1 }, { name: 'D', hardSets: 4 }]), 'A 3 · B 2 · C 1 · +1');
  // v2.1.1: Cardio zeigt die Dauer statt einer Satzzahl "0"
  assert.equal(H.exerciseLine([{ name: 'Rudergerät', hardSets: 0, kind: 'cardio', durationSec: 1200 }, { name: 'Laufband', hardSets: 0, kind: 'cardio', durationSec: 0 }]), 'Rudergerät 20:00 · Laufband –');
});

test('Tippfehler-Hinweis: > 2 × bisher bestes Gewicht, ohne das bearbeitete Training, ohne Historie keiner', () => {
  assert.deepEqual(M.weightWarning(bench.id, 850, store.get('sessions'), { excludeSessionId: typo.id }), { best: 80 });
  assert.equal(M.weightWarning(bench.id, 160, store.get('sessions'), { excludeSessionId: typo.id }), null);
  assert.equal(M.weightWarning(fly.id, 500, store.get('sessions'), { excludeSessionId: typo.id }), null);
  assert.equal(M.weightWarning(bench.id, null, store.get('sessions')), null);
});

test('Tippfehler korrigieren: Fortschritt und Vorbelegung lesen die korrigierten Werte', () => {
  assert.equal(G.exerciseProgress(bench.id, store.get('sessions')).at(-1).topSet.weightKg, 850);
  const d = H.startEdit(typo.id);
  const bad = d.entries[0].sets[1];
  assert.ok(H.setValues(d, d.entries[0].id, bad.id, { weightKg: 85 }));
  assert.equal(store.get('sessions').find((s) => s.id === typo.id).entries[0].sets[1].weightKg, 850, 'Entwurf ändert nichts vor dem Speichern');
  assert.ok(H.saveEdited(d).ok);
  assert.equal(G.exerciseProgress(bench.id, store.get('sessions')).at(-1).topSet.weightKg, 85);
  assert.deepEqual(M.lastPerformance(bench.id, H.finishedSessions()).sets.map((x) => x.weightKg), [85, 85]);
  assert.deepEqual(M.prefillSets(bench, H.finishedSessions()).map((x) => x.weightKg), [85, 85]);
});

test('Satz hinzufügen zählt als erledigt; Aufwärmsatz landet vor den Arbeitssätzen', () => {
  const d = H.startEdit(typo.id);
  const en = d.entries[0];
  const w = H.addSet(d, en.id, 'work');
  assert.equal(w.completedAt, d.endedAt);
  assert.equal(w.weightKg, 85);
  const a = H.addSet(d, en.id, 'warmup');
  assert.equal(en.sets[0].id, a.id);
  H.setValues(d, en.id, a.id, { weightKg: 40, reps: 10 }); // v1.4: leere Sätze fallen beim Speichern weg
  assert.ok(H.saveEdited(d).ok);
  const saved = H.getFinished(typo.id);
  assert.equal(saved.entries[0].sets.length, 4);
  assert.equal(M.hardSets(saved.entries[0]), 3);
});

test('Satztyp ändern und Satz löschen wirken auf harte Sätze', () => {
  const d = H.startEdit(typo.id);
  const en = d.entries[0];
  assert.ok(H.toggleType(d, en.id, en.sets[0].id)); // Aufwärm → Arbeit
  assert.ok(H.removeSet(d, en.id, en.sets[3].id));
  assert.ok(H.saveEdited(d).ok);
  assert.equal(M.hardSets(H.getFinished(typo.id).entries[0]), 3);
  const d2 = H.startEdit(typo.id);
  d2.entries[0].sets[0].drops = [{ weightKg: 1, reps: 1 }];
  assert.ok(H.saveEdited(d2).ok);
  assert.deepEqual(H.getFinished(typo.id).entries[0].sets[0].drops, [], 'Drop-Stufen nur bei Typ drop');
});

test('Übung entfernen; Übung ohne Sätze fällt weg; ohne Übungen wird nicht gespeichert', () => {
  const d = H.startEdit(typo.id);
  assert.ok(H.removeEntry(d, d.entries[1].id));
  assert.ok(H.saveEdited(d).ok);
  assert.equal(H.getFinished(typo.id).entries.length, 1);
  assert.equal(G.exercisesWithHistory([fly], store.get('sessions')).length, 0, 'Fly hat keinen Verlauf mehr');
  const d2 = H.startEdit(typo.id);
  for (const x of [...d2.entries[0].sets]) H.removeSet(d2, d2.entries[0].id, x.id);
  const r = H.saveEdited(d2);
  assert.equal(r.ok, false); assert.equal(r.empty, true);
  assert.equal(H.getFinished(typo.id).entries.length, 1, 'unverändert');
});

test('Ungültige Werte werden wie beim Loggen abgelehnt; Ende vor Beginn wird abgelehnt (v1.4)', () => {
  const d = H.startEdit(typo.id);
  H.setValues(d, d.entries[0].id, d.entries[0].sets[0].id, { reps: 2.5 });
  assert.equal(H.saveEdited(d).ok, false);
  const d2 = H.startEdit(typo.id);
  d2.startedAt = new Date(Date.parse(d2.endedAt) + 60000).toISOString();
  assert.equal(H.saveEdited(d2).ok, false);
});

test('Gleiche Übung zweimal: Vorbelegung nimmt den letzten Eintrag, Fortschritt zählt ein Training', () => {
  const twice = finished(5, [
    M.createEntry(bench.id, { sets: [set(80, 8, 'work', 5)] }),
    M.createEntry(fly.id, { sets: [set(50, 12, 'work', 5)] }),
    M.createEntry(bench.id, { sets: [set(60, 12, 'work', 5), set(60, 11, 'work', 5)] })
  ]);
  assert.deepEqual(M.lastPerformance(bench.id, H.finishedSessions()).sets.map((x) => x.weightKg), [60, 60]);
  const d = H.startEdit(twice.id);
  H.setValues(d, d.entries[2].id, d.entries[2].sets[0].id, { weightKg: 62.5 });
  assert.ok(H.saveEdited(d).ok);
  assert.equal(M.lastPerformance(bench.id, H.finishedSessions()).sets[0].weightKg, 62.5, 'Korrektur am zweiten Eintrag wirkt auf die Vorbelegung');
  assert.equal(G.exerciseProgress(bench.id, store.get('sessions')).filter((r) => r.sessionId === twice.id).length, 1);
});

test('Laufendes Training bleibt unberührt und ist im Tagebuch nicht bearbeitbar', () => {
  assert.ok(S.startEmpty().ok);
  assert.ok(S.addEntry(bench.id).ok);
  const active = S.activeSession();
  const before = JSON.stringify(active);
  assert.equal(H.diaryRows().some((r) => r.session.id === active.id), false);
  assert.equal(H.startEdit(active.id), null);
  assert.equal(H.saveEdited(structuredClone(active)).ok, false);
  assert.equal(H.deleteSession(active.id).ok, false);
  const d = H.startEdit(old.id);
  H.setValues(d, d.entries[0].id, d.entries[0].sets[1].id, { reps: 9 });
  assert.ok(H.saveEdited(d).ok);
  assert.equal(JSON.stringify(S.activeSession()), before);
  S.discard();
});

test('Training löschen entfernt es aus Tagebuch, Fortschritt und Vorbelegung; Daten bleiben gültig', () => {
  const n = H.finishedSessions().length;
  assert.ok(H.deleteSession(typo.id).ok);
  assert.equal(H.finishedSessions().length, n - 1);
  assert.equal(G.exerciseProgress(bench.id, store.get('sessions')).some((r) => r.sessionId === typo.id), false);
  assert.deepEqual(M.validateData(store.snapshot()), []);
});

done();
