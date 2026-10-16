// v2.0: Bewegungsmodell und Animationsdaten (ohne DOM prüfbar).
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const M = await import('../js/motion.js');
const MF = await import('../js/motion-front.js');
const D = await import('../js/anim-data.js');
const { POOL } = await import('../js/pool.js');
const { test, done } = runner();
console.log('# Animationen (v2.0)');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b} (±${tol})`);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const nums = (d) => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
const READS = Object.keys(D.READ);
const allFrames = (a) => (a.variants ? a.variants.map((v) => D.framesOf(a, v.key)) : [D.framesOf(a)]); // wie die App: framesOf ergänzt die Ansicht

test('Standpose: alle Gelenke an den Ruhepositionen, Längen stimmen', () => {
  const P = M.solvePose({ shank: 0, knee: 0, hip: 0, ankle: 0, shoulder: 0, elbow: 0 });
  for (const k of ['ankle', 'knee', 'hip']) near(dist(P.joints[k], M.J0[k]), 0, 0.5, k);
  for (const k of ['shoulder', 'elbow', 'wrist']) near(dist(P.joints[k], M.J0[k]), 0, 2.5, k); // Rumpf in J0 2 Einheiten schräg
  near(dist(P.joints.hip, P.joints.knee), M.LEN.thigh, 0.01, 'Oberschenkel');
  near(dist(P.joints.knee, P.joints.ankle), M.LEN.shank, 0.01, 'Unterschenkel');
  near(dist(P.joints.hip, P.joints.shoulder), M.LEN.trunk, 0.01, 'Rumpf');
});

test('Winkel werden aus den Positionen wiedergefunden (Kniebeuge unten)', () => {
  const P = M.solvePose({ shank: 33, knee: 126, hip: 111, ankle: 33 });
  const J = P.joints;
  const ang = (u, v) => Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))) * 180 / Math.PI;
  const thigh = [J.hip[0] - J.knee[0], J.hip[1] - J.knee[1]], shank = [J.ankle[0] - J.knee[0], J.ankle[1] - J.knee[1]];
  near(180 - ang(thigh, shank), 126, 0.5, 'Kniebeugung');
  const trunk = [J.shoulder[0] - J.hip[0], J.shoulder[1] - J.hip[1]], thighDown = [J.knee[0] - J.hip[0], J.knee[1] - J.hip[1]];
  near(180 - ang(trunk, thighDown), 111, 0.5, 'Hüftbeugung');
  near(P.angles.trunk, 18, 0.5, 'Rumpfneigung = Schienbein − Knie + Hüfte');
  near(J.toe[1], -2, 0.5, 'Fuß bleibt am Boden');
});

test('Löser: Rumpfneigung so, dass die Hand eine Höhe erreicht (Kreuzheben Start)', () => {
  const P = M.solvePose({ shank: 11.7, knee: 58.6, ankle: 11.7, solve: { param: 'trunk', joint: 'hand', y: -46, range: [-10, 95] }, armHang: 10, elbow: 0 });
  near(P.joints.hand[1], -46, 0.5, 'Hand auf Scheibenhöhe');
  assert.equal(P.solved.param, 'trunk');
  assert.ok(P.angles.trunk > 50 && P.angles.trunk < 90, `Rumpf plausibel: ${P.angles.trunk}`);
});

test('Zwei-Glieder-IK: zweites Bein erreicht sein Ziel, Knie nach vorn', () => {
  const P = M.solvePose({ shank: 0, knee: 20, hip: 20, ankle: 0, leg2: { ankle: [-120, -100], foot: 200 } });
  near(dist(P.joints.ankle2, [-120, -100]), 0, 0.5, 'Knöchel 2');
  near(dist(P.joints.hip, P.joints.knee2), M.LEN.thigh, 0.01, 'Oberschenkel 2');
  near(dist(P.joints.knee2, P.joints.ankle2), M.LEN.shank, 0.01, 'Unterschenkel 2');
  assert.ok(P.angles.knee2 > 0, 'Kniebeugung positiv');
});

test('Zwei-Glieder-IK: Hand erreicht das Ziel (Kniebeuge, Stange hinter der Schulter)', () => {
  const P = M.solvePose({ shank: 0, knee: 10, hip: 11, ankle: 0, armTargetTrunk: [-8, 15], armScale: [0.55, 0.95], elbowSide: -1 });
  const s = P.joints.shoulder;
  near(dist(P.joints.wrist, [s[0] - 8, s[1] - 15]), 0, 0.6, 'Handgelenk am Ziel');
});

test('Zeitachse: Phasen summieren sich, Mischung ist stetig an den Keyframes', () => {
  const anim = D.animationFor('back-squat');
  const frames = M.resolveFrames(D.framesOf(anim, 'high'));
  const T = M.cycleLength(anim.phases);
  const a = M.poseAt(frames, anim.phases, 0).pose, b = M.poseAt(frames, anim.phases, T - 1e-6).pose;
  near(dist(a.joints.shoulder, b.joints.shoulder), 0, 0.5, 'Zyklus schließt sich');
  let acc = 0;
  for (const p of anim.phases) {
    const end = M.poseAt(frames, anim.phases, acc + p.dur - 1e-6).pose, next = M.poseAt(frames, anim.phases, acc + p.dur + 1e-6).pose;
    near(dist(end.joints.hip, next.joints.hip), 0, 0.5, `Phase ${p.label} stetig`);
    acc += p.dur;
  }
});

test('Stetigkeit: kein Gelenk springt zwischen zwei Bildern (1/60 s) – alle Animationen und Varianten', () => {
  // v2.1: fand den Kreuzheben-Sprung (Rumpf 60° in einem Bild), Ursache ungleiche Schlüssel der Keyframes (resolveFrames gleicht an).
  const DT = 1 / 60, MAX_POS = 10, MAX_ANG = 10;
  const wrap = (d) => Math.abs(((d % 360) + 540) % 360 - 180);
  for (const a of D.ANIMATIONS) {
    const variants = a.variants ? a.variants.map((v) => v.key) : [null];
    for (const v of variants) {
      const frames = M.resolveFrames(D.framesOf(a, v));
      const T = M.cycleLength(a.phases);
      let prev = null;
      for (let t = 0; t <= T + 1e-9; t += DT) {
        const { pose, phase } = M.poseAt(frames, a.phases, Math.min(t, T - 1e-6));
        if (prev) {
          for (const k of Object.keys(pose.joints)) {
            if (!prev.joints[k]) continue;
            const d = dist(pose.joints[k], prev.joints[k]);
            assert.ok(d <= MAX_POS, `${a.ref}${v ? '/' + v : ''}: ${k} springt ${d.toFixed(1)} bei t=${t.toFixed(2)} (${phase.label})`);
          }
          for (const k of Object.keys(pose.angles).filter((x) => Number.isFinite(prev.angles[x]))) {
            const d = wrap(pose.angles[k] - prev.angles[k]);
            assert.ok(d <= MAX_ANG, `${a.ref}${v ? '/' + v : ''}: Winkel ${k} springt ${d.toFixed(1)}° bei t=${t.toFixed(2)} (${phase.label})`);
          }
        }
        prev = pose;
      }
    }
  }
});

test('resolveFrames gleicht die Schlüssel an: Keyframes bleiben gleich, Zwischenbild ohne Sprung', () => {
  const frames = [
    { label: 'A', pose: { shank: 10, knee: 60, ankle: 10, solve: { param: 'trunk', joint: 'hand', y: -46 }, armHang: 8, elbow: 0 } },
    { label: 'B', pose: { shank: 0, knee: 6, hip: 4, ankle: 0, armPlumb: true, elbow: 0 } }
  ];
  const R = M.resolveFrames(frames);
  for (const k of ['trunk', 'shank', 'knee', 'hip', 'ankle', 'armHang']) assert.ok(R.every((f) => Number.isFinite(M.num(f.pose[k]))), `Schlüssel ${k} überall`);
  const a0 = M.solvePose(frames[0].pose), a1 = M.solvePose(R[0].pose), b0 = M.solvePose(frames[1].pose), b1 = M.solvePose(R[1].pose);
  near(dist(a0.joints.shoulder, a1.joints.shoulder), 0, 0.2, 'Keyframe A unverändert');
  near(dist(b0.joints.shoulder, b1.joints.shoulder), 0, 0.2, 'Keyframe B unverändert');
  const mid = M.solvePose(M.mixSpec(R[0].pose, R[1].pose, 0.5));
  near(mid.angles.trunk, (a0.angles.trunk + b0.angles.trunk) / 2, 1, 'Rumpf in der Mitte halb aufgerichtet');
  const late = M.solvePose(M.mixSpec(R[0].pose, R[1].pose, 0.99));
  near(late.angles.trunk, b0.angles.trunk, 2, 'kurz vor dem Ende fast aufrecht (vorher: Sprung)');
});

test('Jede Animation gehört zu einer Pool-Übung und hat vollständige Daten', () => {
  assert.ok(D.ANIMATIONS.length >= 11, 'mindestens 11 Übungen');
  const refs = new Set();
  for (const a of D.ANIMATIONS) {
    assert.ok(POOL.some((p) => p.ref === a.ref), `Pool-Ref ${a.ref}`);
    assert.ok(!refs.has(a.ref), `doppelt: ${a.ref}`); refs.add(a.ref);
    assert.ok(D.BASIS[a.basis], `Datenbasis ${a.ref}`);
    assert.ok(a.basisNote.length > 40, `basisNote ${a.ref}`);
    assert.ok(D.TEMPO_BASIS[a.tempo.basis] && a.tempo.note, `Tempo ${a.ref}`);
    assert.ok(a.keyPoints.length >= 3 && a.keyPoints.length <= 5, `3–5 Kernpunkte ${a.ref}`);
    assert.ok(a.phases.length >= 2, `Phasen ${a.ref}`);
    for (const fr of allFrames(a)) {
      assert.ok(fr.length >= 2, `Keyframes ${a.ref}`);
      for (const f of fr) assert.ok(f.label && f.pose, `Keyframe ${a.ref}`);
      for (const p of a.phases) assert.ok(fr[p.a] && fr[p.b] && p.dur > 0 && p.label, `Phase ${a.ref} ${p.label}`);
    }
    if (a.variants) { assert.ok(a.variants.length >= 2); for (const v of a.variants) assert.ok(Array.isArray(a.frames[v.key]), `Variante ${v.key}`); }
  }
});

test('Jeder Messwert trägt Quelle und Lesart; Quellen existieren und sind https', () => {
  for (const a of D.ANIMATIONS) {
    for (const [id, s] of Object.entries(a.sources)) {
      assert.match(s.url, /^https:\/\//, `${a.ref} ${id}`);
      assert.ok(READS.includes(s.read), `${a.ref} ${id} Lesart`);
      assert.ok(/\d{4}/.test(s.label), `${a.ref} ${id} Jahr`);
    }
    const check = (v, where) => {
      if (!v || typeof v !== 'object' || !('v' in v)) return;
      assert.ok(Number.isFinite(v.v), `${where} Zahl`);
      assert.ok(READS.includes(v.read), `${where} Lesart ${v.read}`);
      for (const id of v.src) assert.ok(a.sources[id], `${where} Quelle ${id}`);
      if (['fulltext', 'abstract', 'summary'].includes(v.read)) assert.ok(v.src.length, `${where}: gelesene Werte brauchen eine Quelle`);
    };
    for (const fr of allFrames(a)) for (const f of fr) {
      for (const [k, v] of Object.entries(f.pose)) check(v, `${a.ref}/${f.label}/${k}`);
      for (const v of f.facts || []) check(v, `${a.ref}/${f.label}/fact`);
    }
  }
});

test('Kernpunkte: ≤ 90 Zeichen, Status gültig, Quellen vorhanden, Erklärung mit Gegenseite bei „umstritten“', () => {
  for (const a of D.ANIMATIONS) {
    for (const kp of a.keyPoints) {
      assert.ok(kp.text.length <= 90, `${a.ref}: „${kp.text}“ (${kp.text.length})`);
      assert.ok(kp.short.length <= 10, `${a.ref}: Kurzlabel ${kp.short}`);
      assert.ok(D.STATUS[kp.status], `${a.ref} Status ${kp.status}`);
      assert.ok(kp.src.length && kp.src.every((id) => a.sources[id]), `${a.ref} Kernpunkt-Quellen`);
      assert.ok(kp.explain.length > 40, `${a.ref} Erklärung`);
      if (kp.status === 'contested') assert.match(kp.explain, /Umstritten/, `${a.ref}: ${kp.short}`);
      assert.ok(!/verhindert Verletzung|schützt vor Verletzung|verletzungsfrei/i.test(kp.text + kp.explain), `${a.ref}: kein Verletzungsversprechen`);
    }
  }
});

test('Alle Keyframes lösbar: endliche Koordinaten, Anker vorhanden, Fuß nie unter dem Boden', () => {
  for (const a of D.ANIMATIONS) {
    for (const fr of allFrames(a)) {
      const frames = M.resolveFrames(fr);
      const T = M.cycleLength(a.phases);
      for (let i = 0; i <= 12; i++) {
        const { pose } = M.poseAt(frames, a.phases, (T * i) / 12);
        for (const [k, j] of Object.entries(pose.joints)) assert.ok(Number.isFinite(j[0]) && Number.isFinite(j[1]), `${a.ref} ${k}`);
        for (const l of M.layers(pose)) assert.ok(!/NaN|undefined/.test(l.d), `${a.ref} Pfad`);
        if (!a.noFloor) {
          assert.ok(pose.joints.toe[1] <= 1.5, `${a.ref}: Zehen über dem Boden (${pose.joints.toe[1]})`); if (pose.joints.toe2) assert.ok(pose.joints.toe2[1] <= 1.5, `${a.ref}: Zehen 2`);
          assert.ok(M.anchor(pose, 'heel')[1] <= 1.5, `${a.ref}: Ferse über dem Boden (${M.anchor(pose, 'heel')[1]})`);
        }
        // Stufe: der Fuß steht auf einem Block und darf ihn nicht durchdringen (v2.1, Wadenheben)
        for (const r of pose.scene.filter((x) => x.type === 'rect' && x.step)) {
          const toe = pose.joints.toe, heel = M.anchor(pose, 'heel');
          near(toe[1], r.y - 2, 0.6, `${a.ref}: Ballen auf der Stufe`);
          assert.ok(heel[0] < r.x || heel[1] <= r.y + 0.5, `${a.ref}: Ferse im Block (${heel})`);
        }
        for (const kp of a.keyPoints) assert.ok(M.anchor(pose, kp.anchor), `${a.ref} Anker ${kp.anchor}`);
      }
    }
  }
});

test('Gezeichnete Muskeln: jede Pool-Muskelgruppe ist zugeordnet oder als nicht sichtbar gelistet (Seite und Front)', () => {
  const ids = new Set(M.SHAPES.map((s) => s.id)), idsF = new Set(MF.SHAPES_F.map((s) => s.id));
  for (const [m, shape] of Object.entries(M.MUSCLE_SHAPE)) assert.ok(ids.has(shape), `${m} → ${shape}`);
  for (const [m, shape] of Object.entries(MF.MUSCLE_SHAPE_F)) assert.ok(idsF.has(shape), `front ${m} → ${shape}`);
  for (const a of D.ANIMATIONS) {
    const p = POOL.find((x) => x.ref === a.ref);
    const map = a.view === 'front' ? MF.MUSCLE_SHAPE_F : M.MUSCLE_SHAPE, hidden = a.view === 'front' ? MF.HIDDEN_MUSCLES_F : M.HIDDEN_MUSCLES;
    for (const m of [...p.muscles.primary, ...p.muscles.secondary]) assert.ok(map[m] || hidden.includes(m), `${a.ref}: ${m}`);
    const prim = p.muscles.primary.filter((m) => map[m]);
    assert.ok(prim.length, `${a.ref}: mindestens ein primärer Muskel ist sichtbar`);
  }
});

test('Frontansicht: Figur symmetrisch im Stand, Hände am Ziel, Verkürzung angewinkelter Beine', () => {
  const P = M.solvePose({ view: 'front', arm: { abd: 0, elbow: 0 }, legs: { hip: 0, knee: 0 } });
  near(P.joints.shoulderR[0], -P.joints.shoulderL[0], 0.01, 'Schultern symmetrisch');
  near(P.joints.ankleR[1], MF.J0F.ankle[1], 0.5, 'Knöchelhöhe im Stand');
  near(dist(P.joints.shoulderR, P.joints.elbowR), M.LEN.uarm, 0.01, 'Oberarmlänge');
  const H = M.solvePose({ view: 'front', root: 'wristR', rootPos: [62, -322], armPoints: { elbow: [13.4, -66.9], wrist: [24, -120] }, legs: { hip: 0, knee: 70 } });
  near(dist(H.joints.wristR, [62, -322]), 0, 0.01, 'rechtes Handgelenk an der Stange');
  near(H.joints.wristL[0], -62, 0.01, 'linkes Handgelenk gespiegelt');
  assert.ok(dist(H.joints.kneeR, H.joints.ankleR) < M.LEN.shank * 0.5, 'angewinkelter Unterschenkel erscheint verkürzt');
  for (const l of M.layers(H, () => 'p')) assert.ok(!/NaN/.test(l.d));
});

test('Beinstrecker: Rolle ist als Rolle sichtbar (Radius ≥ 10) und sitzt vor dem Schienbein', () => {
  const a = D.animationFor('leg-extension'), frames = M.resolveFrames(D.framesOf(a));
  const T = M.cycleLength(a.phases);
  for (let i = 0; i < 8; i++) {
    const P = M.poseAt(frames, a.phases, (T * i) / 8).pose, bar = P.scene.find((s) => s.type === 'bar');
    assert.ok(bar && bar.r >= 10, 'Rolle hat Radius ≥ 10');
    const sd = [P.joints.ankle[0] - P.joints.knee[0], P.joints.ankle[1] - P.joints.knee[1]], L = Math.hypot(sd[0], sd[1]);
    const rel = [bar.at[0] - P.joints.ankle[0], bar.at[1] - P.joints.ankle[1]];
    const off = Math.abs((rel[0] * sd[1] - rel[1] * sd[0]) / L); // Abstand der Rollenmitte von der Schienbeinachse
    assert.ok(off >= bar.r, 'Rolle überdeckt die Schienbeinachse nicht');
  }
});

// v2.5.0: weibliche Figur – gleiche Gelenke, nur andere Umrisse
test('Weibliche Figur: alle Animationen zeichnen ohne NaN, Anker lösbar und am Körper', () => {
  for (const a of D.ANIMATIONS) {
    for (const fr of allFrames(a)) {
      const frames = M.resolveFrames(fr), T = M.cycleLength(a.phases);
      for (let i = 0; i <= 8; i++) {
        const { pose } = M.poseAt(frames, a.phases, (T * i) / 8);
        const L = M.layers(pose, () => '', 'female');
        assert.ok(L.length > 0, `${a.ref} Ebenen`);
        for (const l of L) assert.ok(!/NaN|undefined/.test(l.d), `${a.ref} Pfad (weiblich)`);
        for (const kp of a.keyPoints) {
          const p = M.anchor(pose, kp.anchor, 'female'), q = M.anchor(pose, kp.anchor, 'male');
          assert.ok(p && Number.isFinite(p[0]) && Number.isFinite(p[1]), `${a.ref} Anker ${kp.anchor} (weiblich)`);
          assert.ok(dist(p, q) < 25, `${a.ref} Anker ${kp.anchor} weicht zu weit ab (${dist(p, q).toFixed(1)})`);
        }
      }
    }
  }
});

test('Weibliche Figur: gleiche Muskelflächen wie die männliche, nur Haarknoten/Brust zusätzlich', () => {
  const ids = (S) => new Set(S.map((s) => s.id));
  const m = ids(M.SHAPES), f = ids(M.SHAPES_FEMALE);
  for (const id of m) assert.ok(f.has(id), `Seite fehlt ${id}`);
  assert.deepEqual([...f].filter((id) => !m.has(id)), [], 'keine neuen Muskeln seitlich');
  assert.equal(M.SHAPES_FEMALE.length, M.SHAPES.length + 1, 'Haarknoten als zusätzliche Körperform');
  const mF = ids(MF.SHAPES_F), fF = ids(MF.shapesForF('female'));
  for (const id of mF) assert.ok(fF.has(id), `Front fehlt ${id}`);
  assert.deepEqual([...fF].filter((id) => !mF.has(id)), ['bust']);
  assert.equal(M.shapesFor('male'), M.SHAPES, 'Standard bleibt männlich');
  assert.equal(MF.shapesForF(undefined), MF.SHAPES_F);
});

done();
