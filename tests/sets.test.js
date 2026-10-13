// v1.2: Satztypen (Drop, Rest-Pause), Stufen, Markierungen – Zählregeln, Training, Tagebuch, Vorbelegung.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const SETS = await import('../js/sets.js');
const lib = await import('../js/exercises.js');
const S = await import('../js/session.js');
const H = await import('../js/history.js');
const G = await import('../js/progress.js');
const { test, done } = runner();

console.log('# sets (Drop, Rest-Pause, Markierungen)');
store.init();
const ext = lib.addFromPool('leg-extension')?.exercise || lib.addFromPool('bench-press-barbell').exercise;

const T = (d) => new Date(Date.UTC(2026, 9, d, 10)).toISOString();
const set = (w, r, type = 'work', extra = {}) => M.createSet({ type, weightKg: w, reps: r, completedAt: T(1), ...extra });

test('Formatierung: Drop, Rest-Pause gleiches/anderes Gewicht, Kurzzeichen', () => {
  assert.equal(SETS.formatSet(set(85, 8)), '85 × 8');
  assert.equal(SETS.formatSet(set(50, 10, 'drop', { drops: [{ weightKg: 35, reps: 8 }, { weightKg: 25, reps: 6 }] })), '50 × 10 + 35 × 8 + 25 × 6');
  assert.equal(SETS.formatSet(set(50, 12, 'restpause', { drops: [{ weightKg: 50, reps: 4 }, { weightKg: 45, reps: 3 }] })), '50 × 12 + 4 + 45 × 3');
  assert.equal(SETS.formatSet(set(82.5, 8)), '82,5 × 8');
  assert.deepEqual([SETS.setLabel(set(1, 1, 'warmup'), 0), SETS.setLabel(set(1, 1), 2), SETS.setLabel(set(1, 1, 'drop'), 2), SETS.setLabel(set(1, 1, 'restpause'), 3)], ['A', '2', '2D', '3RP']);
});

test('Validierung: Stufen nur bei drop/restpause; restpause ist gültiger Typ; Markierungen', () => {
  assert.deepEqual(M.validateSet(set(50, 12, 'restpause', { drops: [{ weightKg: 50, reps: 4 }] })), []);
  assert.ok(M.validateSet(set(50, 12, 'work', { drops: [{ weightKg: 50, reps: 4 }] })).length);
  assert.deepEqual(M.validateSet(set(50, 12, 'work', { tags: ['failure', 'custom:Pause oben'] })), []);
  assert.ok(M.validateSet(set(50, 12, 'work', { tags: ['rest-pause'] })).length, 'rest-pause ist keine Markierung mehr');
});

test('Zählung: Drop/Rest-Pause = 1 harter Satz, Volumen alle Stufen, e1RM/Top-Satz nur erste Stufe', () => {
  const rp = set(50, 8, 'restpause', { drops: [{ weightKg: 50, reps: 4 }, { weightKg: 50, reps: 3 }] });
  const dr = set(60, 6, 'drop', { drops: [{ weightKg: 40, reps: 8 }] });
  const en = M.createEntry(ext.id, { sets: [set(30, 10, 'warmup'), rp, dr] });
  assert.equal(M.hardSets(en), 2);
  assert.equal(M.entryVolume(en), 50 * 8 + 50 * 4 + 50 * 3 + 60 * 6 + 40 * 8);
  const s = M.createSession({ startedAt: T(2), endedAt: T(2), entries: [en] });
  const row = G.exerciseProgress(ext.id, [s])[0];
  assert.deepEqual(row.topSet, { weightKg: 60, reps: 6 });
  assert.equal(row.e1rm.value, G.e1rm(60, 6), 'Rest-Pause-Gesamt-Wdh. (15) blähen e1RM nicht auf');
  assert.equal(row.totalReps, 8 + 4 + 3 + 6 + 8);
  assert.equal(row.hardSets, 2);
});

test('Stufen-Helfer: Rest-Pause übernimmt Gewicht, Drop lässt es leer; Typwechsel löscht Stufen; leere Stufen fallen weg', () => {
  const rp = set(50, 8, 'restpause');
  assert.deepEqual(SETS.addStage(rp), { weightKg: 50, reps: null });
  const dr = set(60, 6, 'drop');
  assert.deepEqual(SETS.addStage(dr), { weightKg: null, reps: null });
  assert.equal(SETS.addStage(set(1, 1)), null);
  SETS.updateStage(rp, 0, { reps: 4 });
  SETS.addStage(rp);
  SETS.cleanStages(rp);
  assert.equal(rp.drops.length, 1, 'Mini-Satz mit vorbelegtem Gewicht, aber ohne Wdh. fällt weg');
  rp.drops.push({ weightKg: null, reps: 3 });
  SETS.cleanStages(rp);
  assert.equal(rp.drops.length, 2, 'Stufe mit Wdh. bleibt');
  SETS.setType(rp, 'work');
  assert.deepEqual(rp.drops, []);
  assert.equal(SETS.customTag('  Pause   oben '), 'custom:Pause oben');
  assert.equal(SETS.customTag('  '), null);
  const t = set(1, 1);
  SETS.toggleTag(t, 'failure'); SETS.toggleTag(t, 'partials'); SETS.toggleTag(t, 'failure');
  assert.deepEqual(t.tags, ['partials']);
});

test('Laufendes Training: Schnellknopf + Drop/Rest-Pause, Stufen bearbeiten, Beenden entfernt leere Stufen', () => {
  assert.ok(S.startEmpty().ok);
  assert.ok(S.addEntry(ext.id).ok);
  let en = S.activeSession().entries[0];
  const [first] = en.sets;
  assert.equal(S.quickStage(en.id, first.id, 'drop').ok, false, 'nur bei erledigtem Satz');
  assert.ok(S.completeSet(en.id, first.id, { weightKg: 50, reps: 10 }).ok);
  assert.ok(S.quickStage(en.id, first.id, 'restpause').ok);
  en = S.activeSession().entries[0];
  let x = en.sets[0];
  assert.equal(x.type, 'restpause');
  assert.deepEqual(x.drops, [{ weightKg: 50, reps: null }]);
  assert.ok(S.updateStage(en.id, x.id, 0, { reps: 4 }).ok);
  assert.ok(S.addStage(en.id, x.id).ok);
  assert.ok(S.toggleTag(en.id, x.id, 'failure').ok);
  assert.ok(S.quickStage(en.id, x.id, 'drop').ok, 'Wechsel zu Drop');
  x = S.activeSession().entries[0].sets[0];
  assert.equal(x.type, 'drop');
  assert.equal(x.drops.length, 3, 'Stufen bleiben beim Wechsel Drop <-> Rest-Pause');
  assert.ok(S.removeStage(en.id, x.id, 2).ok);
  assert.ok(S.updateStage(en.id, x.id, 1, { weightKg: 35, reps: 8 }).ok);
  S.addStage(en.id, x.id); // leere Stufe
  const fin = S.finish();
  assert.ok(fin.ok);
  const saved = fin.session.entries[0].sets[0];
  assert.deepEqual(saved.drops, [{ weightKg: 50, reps: 4 }, { weightKg: 35, reps: 8 }]);
  assert.deepEqual(saved.tags, ['failure']);
});

test('Vorbelegung übernimmt Typ, Stufen und Markierungen (Entscheidung c)', () => {
  const pre = M.prefillSets(ext, H.finishedSessions());
  const x = pre.find((p) => p.type === 'drop');
  assert.ok(x);
  assert.deepEqual(x.drops, [{ weightKg: 50, reps: 4 }, { weightKg: 35, reps: 8 }]);
  assert.deepEqual(x.tags, ['failure']);
  assert.equal(x.completedAt, null);
  const last = H.finishedSessions()[0].entries[0].sets[0];
  x.drops[0].reps = 99;
  assert.equal(last.drops[0].reps, 4, 'Vorbelegung ist eine Kopie');
});

test('Tagebuch: Typ und Stufen im Entwurf ändern, leere Stufen fallen beim Speichern weg', () => {
  const id = H.finishedSessions()[0].id;
  const d = H.startEdit(id);
  const en = d.entries[0];
  const x = H.draftSet(d, en.id, en.sets[0].id);
  assert.equal(H.toggleType(d, en.id, x.id), false, 'Kurzweg nicht für Drop');
  assert.ok(H.setType(d, en.id, x.id, 'restpause'));
  SETS.addStage(x);
  SETS.updateStage(x, 2, { reps: 2 });
  SETS.addStage(x); // ohne Wdh. → fällt weg
  assert.ok(H.saveEdited(d).ok);
  const saved = H.getFinished(id).entries[0].sets[0];
  assert.equal(saved.type, 'restpause');
  assert.equal(saved.drops.length, 3);
  const d2 = H.startEdit(id);
  assert.ok(H.setType(d2, d2.entries[0].id, d2.entries[0].sets[0].id, 'work'));
  assert.ok(H.saveEdited(d2).ok);
  assert.deepEqual(H.getFinished(id).entries[0].sets[0].drops, []);
});

test('Gleiche Übung zweimal mit Drop-Sätzen: ein Training, Volumen beider Einträge', () => {
  const twice = M.createSession({ startedAt: T(5), endedAt: T(5), entries: [
    M.createEntry(ext.id, { sets: [set(60, 6, 'drop', { drops: [{ weightKg: 40, reps: 8 }] })] }),
    M.createEntry(ext.id, { sets: [set(50, 8, 'restpause', { drops: [{ weightKg: 50, reps: 3 }] })] })
  ] });
  const rows = G.exerciseProgress(ext.id, [twice]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hardSets, 2);
  assert.equal(rows[0].volume, 60 * 6 + 40 * 8 + 50 * 8 + 50 * 3);
  assert.equal(M.lastPerformance(ext.id, [twice]).sets[0].type, 'restpause', 'letzter Eintrag');
});

done();
