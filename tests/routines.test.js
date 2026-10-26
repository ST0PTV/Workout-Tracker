// v2.3.0: Warm-up- und Cool-down-Routinen – Katalog, Vorlagen, eigene Routinen, Pläne, Protokoll, Backup.
import assert from 'node:assert/strict';
import { MemoryStorage, runner } from './helpers.js';

globalThis.localStorage = new MemoryStorage();
const store = await import('../js/store.js');
const M = await import('../js/model.js');
const D = await import('../js/routine-data.js');
const R = await import('../js/routines.js');
const lib = await import('../js/exercises.js');
const P = await import('../js/plans.js');
const S = await import('../js/session.js');
const B = await import('../js/backup.js');
const W = await import('../js/week.js');
const { test, done } = runner();

console.log('# Routinen (v2.3.0)');
store.init();

test('Katalog: gültige Muskeln, Typen, Phasen, Dosis und kurze Anleitungen', () => {
  const refs = new Set();
  for (const x of D.ROUTINE_ITEMS) {
    assert.ok(!refs.has(x.ref), `doppelt: ${x.ref}`); refs.add(x.ref);
    assert.ok(x.type in D.ITEM_TYPES, x.ref);
    assert.ok(['warmup', 'cooldown', 'both'].includes(x.phase), x.ref);
    for (const m of [...x.muscles.primary, ...x.muscles.secondary]) assert.ok(m in M.MUSCLES, `${x.ref}: ${m}`);
    assert.ok(!x.muscles.primary.some((m) => x.muscles.secondary.includes(m)), `${x.ref}: primär und sekundär`);
    if (x.type !== 'cardio') assert.ok(x.muscles.primary.length, `${x.ref}: ohne primären Muskel`);
    assert.ok(x.cue.length <= 90, `${x.ref}: Anleitung zu lang`);
    assert.ok(['time', 'reps', 'hold'].includes(x.dose.mode), x.ref);
    if (x.type === 'stretch') assert.equal(x.dose.mode, 'hold', `${x.ref}: Dehnung ohne Haltezeit`);
  }
  assert.ok(D.ROUTINE_ITEMS.length >= 30);
});

test('Vorlagen: bekannte Übungen, Dauer nahe der Angabe, kein langes Halten im Aufwärmen', () => {
  for (const t of D.TEMPLATES) {
    assert.ok(t.id.startsWith('tpl:'));
    for (const it of t.items) assert.ok(D.ITEM_BY_REF[it.ref], `${t.id}: ${it.ref}`);
    const min = R.estimateSeconds(t) / 60;
    assert.ok(Math.abs(min - t.minutes) / t.minutes <= 0.3, `${t.id}: ${min.toFixed(1)} min statt ${t.minutes}`);
    if (t.phase === 'warmup') {
      assert.deepEqual(R.longHoldsInWarmup(t), [], `${t.id}: langes Halten im Aufwärmen`);
      // Locker angelegt: das allgemeine Aufwärmen (Cardio) ist nie länger als 10 min (Barroso 2013: 15 min mittel senkte das 1RM).
      for (const it of t.items) if (D.ITEM_BY_REF[it.ref].type === 'cardio') assert.ok((it.seconds ?? D.ITEM_BY_REF[it.ref].dose.seconds) <= 600);
    }
  }
  assert.deepEqual([...new Set(D.TEMPLATES.filter((t) => t.phase === 'warmup').map((t) => t.minutes))].sort((a, b) => a - b), [5, 10, 15]);
  assert.ok(D.TEMPLATES.some((t) => t.phase === 'cooldown'));
});

test('v3.4.0: Armübungen ohne Gewicht nur im Katalog (Beweglichkeit), nicht im Übungspool', async () => {
  const { POOL } = await import('../js/pool.js');
  const t = D.TEMPLATES.find((x) => x.id === 'tpl:mob-arms-5');
  assert.ok(t && t.items.length === 7);
  for (const ref of ['shoulder-press-bw', 'lateral-raise-bw', 'front-raise-bw', 'triceps-back-bw', 'wrist-curl-bw', 'reverse-wrist-curl-bw']) {
    assert.equal(D.ITEM_BY_REF[ref].type, 'dynamic', ref);
    assert.ok(!POOL.some((p) => p.ref === ref), ref);
  }
  const m = D.TEMPLATES.find((x) => x.id === 'tpl:mob-full-15');
  assert.equal(m.items.length, 13);
  assert.ok(m.items.filter((x) => x.ref !== 'hip-circles').every((x) => x.reps === 20));
  assert.equal(R.steps(m).length >= 13, true);
});

test('Info: Quellen mit https-Link und kurzer Notiz, keine Heilsversprechen', () => {
  for (const s of D.ROUTINE_INFO.sources) {
    assert.ok(s.url.startsWith('https://'), s.label);
    assert.ok(s.note.length <= 170, s.label);
    assert.ok(/geprüft/i.test(s.note), `${s.label}: Prüfstatus fehlt`);
  }
  const text = [...D.ROUTINE_INFO.warmup, ...D.ROUTINE_INFO.cooldown, ...D.ROUTINE_INFO.rules, ...D.TEMPLATES.map((t) => t.note)].join(' ');
  for (const bad of ['verhindert Verletzungen', 'beugt Verletzungen vor', 'gegen Muskelkater hilft', 'Streak', 'Serie']) assert.ok(!text.includes(bad), bad);
});

test('Eigene Routine: anlegen, Fehler, Kopie einer Vorlage', () => {
  let r = R.createRoutine({ name: '  ', phase: 'warmup' });
  assert.equal(R.saveRoutine(r).ok, false);
  r = R.addItem({ ...r, name: 'Mein Start' }, 'leg-swing-front');
  assert.equal(r.items[0].reps, 10);
  r = R.addItem(r, 'stretch-hip-flexor');
  assert.equal(r.items[1].seconds, 30);
  assert.equal(r.items[1].rounds, 2);
  const saved = R.saveRoutine(r);
  assert.ok(saved.ok, saved.errors.join('; '));
  assert.equal(R.ownRoutines().length, 1);
  assert.equal(R.getRoutine(r.id).name, 'Mein Start');
  assert.equal(R.saveRoutine({ ...r, items: [{ ...r.items[0], reps: 0 }] }).ok, false);
  const copy = R.copyOf('tpl:wu-full-10');
  assert.ok(!R.isTemplate(copy.id));
  assert.equal(copy.items.length, D.TEMPLATES.find((t) => t.id === 'tpl:wu-full-10').items.length);
  assert.equal(R.deleteRoutine('tpl:wu-full-10').ok, false);
});

test('Ablauf: Halten je Runde und Seite einzeln, Restzeit sinkt', () => {
  const r = R.createRoutine({ name: 'x', phase: 'cooldown', items: [{ ref: 'stretch-quad' }, { ref: 'cat-cow' }, { ref: 'cardio-walk', seconds: 60 }] });
  const st = R.steps(r);
  assert.equal(st.length, 2 * 2 + 1 + 1);
  assert.equal(st[0].label, 'Runde 1 von 2 · links');
  assert.equal(st[1].label, 'Runde 1 von 2 · rechts');
  assert.equal(st[4].seconds, null);
  assert.equal(st[5].seconds, 60);
  const all = R.remainingSeconds(st, 0, 0);
  assert.ok(R.remainingSeconds(st, 0, 10) < all);
  assert.ok(R.remainingSeconds(st, 5, 0) === 60);
  assert.equal(R.doseText(st[0].item.dose), '2 × 30 s halten je Seite');
});

test('Pläne: Routine verknüpfen, Phase prüfen, Löschen entfernt Verknüpfung', () => {
  const ex = lib.saveExercise(M.createExercise({ name: 'Kniebeuge', muscles: { primary: ['quads'], secondary: [] } })).exercise;
  const plan = P.newPlan('Beine').plan;
  P.addExercises(plan.id, [ex.id]);
  assert.equal(R.setPlanRoutine(plan.id, 'warmup', 'tpl:cd-relax-5').ok, false);
  assert.ok(R.setPlanRoutine(plan.id, 'warmup', 'tpl:wu-lower-10').ok);
  const own = R.ownRoutines()[0];
  assert.ok(R.setPlanRoutine(plan.id, 'cooldown', null).ok);
  const ownCd = R.saveRoutine(R.createRoutine({ name: 'Dehnen', phase: 'cooldown', items: [{ ref: 'stretch-calf' }] })).routine;
  assert.ok(R.setPlanRoutine(plan.id, 'cooldown', ownCd.id).ok);
  assert.equal(R.planRoutine(P.getPlan(plan.id), 'warmup').id, 'tpl:wu-lower-10');
  assert.deepEqual(M.validateData(store.snapshot()), []);
  assert.ok(R.deleteRoutine(ownCd.id).ok);
  assert.equal(P.getPlan(plan.id).cooldownRoutineId, null);
  assert.ok(own);
  const broken = store.snapshot();
  broken.plans[0].warmupRoutineId = 'gibt-es-nicht';
  assert.ok(M.validateData(broken).some((e) => e.includes('Routine')));
});

test('Protokoll: Routine am Training, zählt nicht als Satz und nicht in die Muskelkarte', () => {
  const plan = P.listPlans()[0];
  const start = S.startFromPlan(plan.id);
  assert.ok(start.ok);
  const routine = R.getRoutine('tpl:wu-lower-10');
  const before = S.sessionView().summary;
  const rec = R.recordRoutine(start.session.id, { routine, startedAt: new Date().toISOString(), done: 5, total: R.steps(routine).length });
  assert.ok(rec.ok, rec.errors.join('; '));
  assert.equal(S.activeSession().routines.length, 1);
  assert.deepEqual(S.sessionView().summary, before);
  const s = S.activeSession();
  s.entries[0].sets[0].completedAt = new Date().toISOString();
  s.entries[0].sets[0].weightKg = 60; s.entries[0].sets[0].reps = 5;
  store.set('sessions', [s]);
  const fin = S.finish();
  assert.ok(fin.ok);
  assert.equal(fin.session.routines.length, 1, 'Protokoll bleibt beim Beenden erhalten');
  const week = W.weeklyMuscleSets(store.get('sessions'), Object.fromEntries(lib.listExercises({ includeArchived: true }).map((e) => [e.id, e])), new Date());
  assert.equal(week.muscles.quads.direct, 1, 'nur der Kraftsatz zählt');
  assert.equal(R.recordRoutine(fin.session.id, { routine, startedAt: new Date().toISOString(), done: 0, total: 3 }).ok, false);
});

test('Backup: Routinen im Roundtrip, ältere Backups ohne Routinen bleiben gültig', () => {
  const file = JSON.stringify(B.buildBackup());
  const res = B.parseBackupText(file);
  assert.ok(res.ok, res.errors.join('; '));
  assert.equal(res.summary.routines, R.ownRoutines().length);
  const old = JSON.parse(file);
  delete old.data.routines;
  for (const p of old.data.plans) { delete p.warmupRoutineId; delete p.cooldownRoutineId; }
  const res2 = B.parseBackupText(JSON.stringify(old));
  assert.ok(res2.ok, res2.errors.join('; '));
  assert.deepEqual(res2.backup.data.routines, []);
});

done();
