// Datenmodell: Validierung und Berechnungen (Volumen, harte Sätze, Vorbelegung, Aufwärm-Hinweis, Tausch, Verlauf).
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const M = await import('../js/model.js');
const { test, done } = runner();

console.log('# model');

const T = (min) => new Date(Date.UTC(2026, 9, 1, 10, min)).toISOString();
const done_ = (fields) => M.createSet({ completedAt: T(0), ...fields });

const bench = M.createExercise({ name: 'Bankdrücken', muscles: { primary: ['chest'], secondary: ['triceps', 'front-delts'] } });
const fly = M.createExercise({ name: 'Butterfly', muscles: { primary: ['chest'], secondary: [] } });
const pushdown = M.createExercise({ name: 'Trizepsdrücken', muscles: { primary: ['triceps'], secondary: [] } });
const row = M.createExercise({ name: 'Rudern', muscles: { primary: ['lats', 'upper-back'], secondary: ['biceps'] } });
const pullup = M.createExercise({ name: 'Klimmzug', kind: 'bodyweight', muscles: { primary: ['lats'], secondary: ['biceps'] } });
const byId = Object.fromEntries([bench, fly, pushdown, row, pullup].map((e) => [e.id, e]));

test('Fabriken erzeugen gültige Objekte', () => {
  assert.deepEqual(M.validateExercise(bench), []);
  assert.deepEqual(M.validateGroup(M.createGroup({ name: 'Brust' })), []);
  assert.deepEqual(M.validatePlan(M.createPlan({ name: 'Push', items: [M.createPlanItem(bench.id)] })), []);
  assert.deepEqual(M.validateSession(M.createSession({ entries: [M.createEntry(bench.id, { sets: [M.createSet()] })] })), []);
});

test('Validierung findet typische Fehler', () => {
  assert.ok(M.validateExercise({ ...bench, name: ' ' }).length);
  assert.ok(M.validateExercise({ ...bench, kind: 'yoga' }).length);
  assert.ok(M.validateExercise({ ...bench, muscles: { primary: ['bizeps'], secondary: [] } }).length);
  assert.ok(M.validateSet(M.createSet({ weightKg: -5 })).length);
  assert.ok(M.validateSet(M.createSet({ reps: 8.5 })).length);
  assert.ok(M.validateSet(M.createSet({ type: 'work', drops: [{ weightKg: 50, reps: 5 }] })).length, 'Drops nur bei Typ drop');
  assert.ok(M.validateSet(M.createSet({ tags: ['zufall'] })).length);
  assert.deepEqual(M.validateSet(M.createSet({ tags: ['stretch-hold', 'custom:Tempo 3-1-1'] })), []);
});

test('Volumen: Gewicht × Wdh.; Aufwärmen zählt nicht; Drop-Stufen zählen alle', () => {
  assert.equal(M.setVolume(M.createSet({ weightKg: 100, reps: 10 })), 1000);
  assert.equal(M.setVolume(M.createSet({ type: 'warmup', weightKg: 60, reps: 10 })), 0);
  const drop = M.createSet({ type: 'drop', weightKg: 80, reps: 8, drops: [{ weightKg: 60, reps: 6 }, { weightKg: 40, reps: 5 }] });
  assert.equal(M.setVolume(drop), 80 * 8 + 60 * 6 + 40 * 5);
  assert.equal(M.setReps(drop), 19);
});

test('Volumen bei Körpergewichtsübungen = 0 (Körpergewicht unbekannt), Wdh. zählen', () => {
  const s = M.createSet({ weightKg: 10, reps: 8 });
  assert.equal(M.setVolume(s, 'bodyweight'), 0);
  assert.equal(M.setReps(s), 8);
});

test('Harte Sätze: nur abgeschlossene Arbeits-/Drop-Sätze, Drop = 1 Satz', () => {
  const en = M.createEntry(bench.id, { sets: [
    done_({ type: 'warmup', weightKg: 40, reps: 10 }),
    done_({ weightKg: 80, reps: 8 }),
    done_({ type: 'drop', weightKg: 80, reps: 6, drops: [{ weightKg: 60, reps: 6 }] }),
    M.createSet({ weightKg: 80, reps: 8 }) // nicht abgeschlossen
  ] });
  assert.equal(M.hardSets(en), 2);
  assert.equal(M.entryVolume(en), 640 + 480 + 360);
});

// Zwei Trainings: älteres mit Bankdrücken 80 kg, neueres mit 82.5 kg
const s1 = M.createSession({ startedAt: T(0), entries: [M.createEntry(bench.id, { sets: [done_({ weightKg: 80, reps: 8 }), done_({ weightKg: 80, reps: 7 })] })] });
const s2 = M.createSession({ startedAt: new Date(Date.UTC(2026, 9, 4, 10)).toISOString(), entries: [
  M.createEntry(bench.id, { sets: [done_({ type: 'warmup', weightKg: 40, reps: 10 }), done_({ weightKg: 82.5, reps: 8 }), done_({ weightKg: 82.5, reps: 6 }), M.createSet({ weightKg: 82.5 })] }),
  M.createEntry(pullup.id, { sets: [done_({ weightKg: 0, reps: 10 })] })
] });
const sessions = [s1, s2];

test('Letzte Ausführung: neuestes Training, nur abgeschlossene Sätze', () => {
  const last = M.lastPerformance(bench.id, sessions);
  assert.equal(last.sessionId, s2.id);
  assert.deepEqual(last.sets.map((x) => x.weightKg), [40, 82.5, 82.5]);
  assert.equal(M.lastPerformance(fly.id, sessions), null);
});

test('Vorbelegung übernimmt Satzzahl, Typen und Gewichte vom letzten Mal als offene Sätze', () => {
  const sets = M.prefillSets(bench, sessions);
  assert.deepEqual(sets.map((x) => [x.type, x.weightKg, x.reps]), [['warmup', 40, 10], ['work', 82.5, 8], ['work', 82.5, 6]]);
  assert.ok(sets.every((x) => x.completedAt === null));
  assert.notEqual(sets[0].id, s2.entries[0].sets[0].id, 'neue ids');
});

test('Vorbelegung ohne Historie: defaultWorkSets bzw. targetSets leere Arbeitssätze', () => {
  assert.equal(M.prefillSets(fly, sessions).length, 3);
  assert.equal(M.prefillSets(fly, sessions, 5).length, 5);
});

test('Aufwärm-Hinweis: nur wenn primäre Muskelgruppe im Training noch nicht belastet', () => {
  const s = M.createSession({ entries: [
    M.createEntry(bench.id, { sets: [done_({ weightKg: 80, reps: 8 })] }),
    M.createEntry(fly.id),        // Brust schon belastet → kein Hinweis
    M.createEntry(pushdown.id),   // Trizeps sekundär bei Bankdrücken → kein Hinweis
    M.createEntry(row.id)         // Rücken neu → Hinweis
  ] });
  assert.equal(M.needsWarmupHint(s, 0, byId), true);
  assert.equal(M.needsWarmupHint(s, 1, byId), false);
  assert.equal(M.needsWarmupHint(s, 2, byId), false);
  assert.equal(M.needsWarmupHint(s, 3, byId), true);
});

test('Aufwärm-Hinweis: übersprungene Übung (keine Sätze erledigt) zählt nicht als Belastung', () => {
  const s = M.createSession({ entries: [M.createEntry(bench.id), M.createEntry(fly.id)] });
  assert.equal(M.needsWarmupHint(s, 1, byId), true);
});

test('Tausch im Training: neue Übung wird geloggt, geplante bleibt vermerkt', () => {
  const en = M.createEntry(fly.id, { sets: M.prefillSets(fly, sessions) });
  const swapped = M.swapEntryExercise(en, bench, sessions);
  assert.equal(swapped.exerciseId, bench.id);
  assert.equal(swapped.plannedExerciseId, fly.id);
  assert.equal(swapped.sets[1].weightKg, 82.5, 'Werte der neuen Übung');
  const back = M.swapEntryExercise(swapped, fly, sessions);
  assert.equal(back.plannedExerciseId, fly.id, 'ursprünglich geplante Übung bleibt bei Mehrfachtausch');
});

test('Training aus Plan starten: Reihenfolge, Gruppe, Vorbelegung', () => {
  const g = M.createGroup({ name: 'Brust' });
  const plan = M.createPlan({ name: 'Push', items: [M.createPlanItem(bench.id, { groupId: g.id }), M.createPlanItem(fly.id, { targetSets: 4 })] });
  const s = M.startSessionFromPlan(plan, byId, sessions);
  assert.equal(s.planId, plan.id);
  assert.deepEqual(s.entries.map((e) => e.exerciseId), [bench.id, fly.id]);
  assert.equal(s.entries[0].groupId, g.id);
  assert.equal(s.entries[0].sets.length, 3);
  assert.equal(s.entries[1].sets.length, 4);
  assert.deepEqual(M.validateSession(s), []);
});

test('Verlauf einer Übung: chronologisch, Top-Satz, harte Sätze, Volumen', () => {
  const h = M.exerciseHistory(bench.id, [s2, s1]);
  assert.deepEqual(h.map((r) => r.sessionId), [s1.id, s2.id]);
  assert.deepEqual(h[0].topSet, { weightKg: 80, reps: 8 });
  assert.deepEqual(h[1].topSet, { weightKg: 82.5, reps: 8 });
  assert.equal(h[1].hardSets, 2, 'ohne Aufwärmsatz und offenen Satz');
  assert.equal(h[1].volume, 82.5 * 8 + 82.5 * 6);
});

test('Trainingszusammenfassung', () => {
  const sum = M.sessionSummary(s2, byId);
  assert.equal(sum.hardSets, 3);
  assert.equal(sum.volume, 82.5 * 14);
  assert.equal(sum.reps, 24);
});

test('validateData prüft Verweise zwischen Sammlungen', () => {
  const g = M.createGroup({ name: 'Brust' });
  const ok = { exercises: [{ ...bench, groupIds: [g.id] }], groups: [g], plans: [], sessions: [], settings: {} };
  assert.deepEqual(M.validateData(ok), []);
  const bad = { ...ok, groups: [] };
  assert.ok(M.validateData(bad).some((e) => e.includes('Gruppe')));
});

done();
