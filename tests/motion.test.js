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

test('Rumpfbeugung (v2.13): curl 0 ändert nichts; Crunch hebt die Schulter, Becken bleibt; Reverse Crunch hebt das Becken, Schulter bleibt', () => {
  const lie = { root: 'hip', rootPos: [0, -36], trunk: -90, hip: 35, knee: 90, foot: 90, shoulder: 30 };
  const a = M.solvePose(lie), b = M.solvePose({ ...lie, curl: 0 });
  assert.deepEqual(M.layers(a).map((l) => l.d), M.layers(b).map((l) => l.d), 'curl 0 zeichnet identisch');
  assert.deepEqual(M.bendLocal([5, -250], 0), [5, -250]);
  assert.deepEqual(M.bendLocal([5, -200], 30), [5, -200], 'unter der Biegezone unverändert');
  const c = M.solvePose({ ...lie, curl: 30 });
  assert.ok(c.joints.shoulder[1] < a.joints.shoulder[1] - 15, `Schulter hebt sich (${c.joints.shoulder[1]})`);
  assert.deepEqual(c.joints.hip, a.joints.hip, 'Hüfte bleibt');
  near(dist(c.joints.shoulder, c.joints.hip), M.LEN.trunk, 6, 'Rumpflänge bleibt etwa gleich (Bogen statt Strecke)');
  near(c.angles.upper, -60, 0.1, 'oberer Rumpf = Rumpf + curl');
  const lieS = { root: 'shoulder', rootPos: [-104, -36], trunk: -90, hip: 90, knee: 90 };
  const r0 = M.solvePose(lieS), r1 = M.solvePose({ ...lieS, trunk: -110, curl: 20 });
  assert.deepEqual(r1.joints.shoulder, r0.joints.shoulder, 'Schulter bleibt liegen');
  assert.ok(r1.joints.hip[1] < r0.joints.hip[1] - 10, `Becken hebt sich (${r1.joints.hip[1]})`);
  near(M.anchor(r1, 'upperBack')[1], M.anchor(r0, 'upperBack')[1], 0.5, 'oberer Rücken bleibt liegen');
});

test('Liegende Übungen (v2.13): Körper liegt auf der Matte, nichts sinkt in den Boden', () => {
  for (const ref of ['floor-crunch', 'sit-up', 'reverse-crunch', 'lying-leg-raise', 'dead-bug']) {
    const a = D.animationFor(ref), fr = M.resolveFrames(D.framesOf(a)), T = M.cycleLength(a.phases);
    for (const sex of ['male', 'female']) for (let i = 0; i <= 24; i++) {
      const { pose } = M.poseAt(fr, a.phases, (T * i) / 24);
      let low = -1e9;
      for (const sh of M.shapesFor(sex)) if (pose.F[sh.seg]) for (const q of sh.pts) low = Math.max(low, M.tf(pose, sh.seg, q)[1]); // Konturpunkte (ohne Bézier-Kontrollpunkte)
      const sink = sex === 'female' ? 10 : 1.5; // weibliche Figur: Gesäß und Haarknoten tiefer, drückt bis ≈ 4,5 cm in die Matte
      assert.ok(low <= -6 + sink, `${ref} (${sex}) t=${i}: tiefster Punkt ${low.toFixed(1)} unter der Matte`);
      assert.ok(low >= -6 - 8, `${ref} (${sex}) t=${i}: schwebt (${low.toFixed(1)})`);
    }
  }
});


test('v2.14.1: Langhantelrudern ohne Sprung am Schleifenende (armScale in allen Keyframes)', () => {
  const a = D.animationFor('barbell-row'), fr = M.resolveFrames(D.framesOf(a)), T = M.cycleLength(a.phases);
  for (const f of fr) assert.ok(Array.isArray(f.pose.armScale), 'armScale in jedem Keyframe');
  const p0 = M.poseAt(fr, a.phases, 0).pose, p1 = M.poseAt(fr, a.phases, T - 1e-6).pose;
  near(p1.joints.hand[0], p0.joints.hand[0], 0.5, 'Hand x am Schleifenende');
  near(p1.joints.hand[1], p0.joints.hand[1], 0.5, 'Hand y am Schleifenende');
});

test('v2.14.1: Phasen-Easing in/none/out ist stetig und monoton', () => {
  const ph = [{ a: 0, b: 1, dur: 1, ease: 'in' }, { a: 1, b: 2, dur: 1, ease: 'none' }, { a: 2, b: 3, dur: 1, ease: 'out' }];
  for (const e of ['in', 'none', 'out']) {
    const p = [{ a: 0, b: 1, dur: 1, ease: e }]; let last = -1;
    for (let i = 0; i <= 20; i++) { const u = M.phaseAt(p, i / 20 - (i === 20 ? 1e-9 : 0)).u; assert.ok(u >= last - 1e-12, `${e} monoton`); last = u; }
    near(M.phaseAt(p, 0).u, 0, 1e-9, `${e} Start`); near(M.phaseAt(p, 1 - 1e-9).u, 1, 1e-6, `${e} Ende`);
  }
  assert.ok(ph.length === 3);
});

test('v2.14.1: Sit-up – Gesäß bleibt auf der Matte, Füße bleiben fest', () => {
  const a = D.animationFor('sit-up'), fr = M.resolveFrames(D.framesOf(a)), T = M.cycleLength(a.phases);
  const ank0 = M.poseAt(fr, a.phases, 0).pose.joints.ankle;
  for (let i = 0; i <= 60; i++) {
    const { pose } = M.poseAt(fr, a.phases, (T * i) / 60 - (i === 60 ? 1e-6 : 0));
    let low = -1e9;
    for (const sh of M.shapesFor('male')) if (sh.seg === 'trunk') for (const q of sh.pts) low = Math.max(low, M.tf(pose, 'trunk', q)[1]);
    assert.ok(Math.abs(low + 6) <= 3, `t=${i}: tiefster Rumpfpunkt ${low.toFixed(1)} statt −6`);
    near(pose.joints.ankle[0], ank0[0], 0.5, 'Knöchel x'); near(pose.joints.ankle[1], ank0[1], 0.5, 'Knöchel y');
  }
});

test('v2.14.1: Kabelcurl langsamer; keine Block-Hanteln mehr in den Szenen', () => {
  const a = D.animationFor('cable-curl'); const up = a.phases.find((p) => p.label === 'Beugen'), dn = a.phases.find((p) => p.label === 'Senken');
  assert.ok(up.dur >= 1.5 && dn.dur >= 2, 'heben ≥ 1,5 s, senken ≥ 2 s');
  for (const ref of ['lateral-raise-dumbbell', 'dumbbell-reverse-fly', 'shoulder-press-dumbbell', 'dumbbell-curl', 'incline-press-dumbbell']) {
    const an = D.animationFor(ref), fr = M.resolveFrames(D.framesOf(an));
    const { pose } = M.poseAt(fr, an.phases, 0);
    const sc = pose.scene || [];
    assert.ok(sc.some((s) => s.type === 'db'), `${ref}: echte Kurzhantel`);
    assert.ok(!sc.some((s) => s.type === 'dumbbell'), `${ref}: kein Block`);
  }
});


test('v2.14.1: „Konsens“ braucht mindestens zwei Quellen', () => {
  for (const a of D.ANIMATIONS) {
    for (const k of a.keyPoints) if (k.status === 'consensus') assert.ok((k.src || []).length >= 2, `${a.ref} „${k.short}“: Konsens mit einer Quelle`);
  }
});


// ---------- v2.15.0 ----------
const jointSpeed = (fr, ph, t, dt = 1 / 240) => {
  const J = (x) => Object.values(M.poseAt(fr, ph, x).pose.joints).filter((p) => Array.isArray(p) && p.length === 2);
  const a = J(t - dt / 2), b = J(t + dt / 2); let s = 0; for (let i = 0; i < a.length; i++) s += Math.hypot(b[i][0] - a[i][0], b[i][1] - a[i][1]); return s / dt;
};
test('v2.15.0: Bewegungsketten ohne Stopp am Zwischenbild, Phasendauern bleiben', () => {
  for (const ref of ['standing-barbell-overhead-press', 'dumbbell-forward-lunge', 'dumbbell-reverse-lunge', 'dumbbell-step-up', 'smith-machine-squat', 'deadlift', 'dumbbell-fly']) {
    const a = D.animationFor(ref), fr = M.resolveFrames(D.framesOf(a)), T = M.cycleLength(a.phases);
    let peak = 0; for (let t = 0; t < T; t += 0.01) peak = Math.max(peak, jointSpeed(fr, a.phases, t));
    let t0 = 0;
    a.phases.forEach((p, i) => {
      const q = a.phases[(i + 1) % a.phases.length]; t0 += p.dur;
      if (p.a !== p.b && q.a !== q.b && q.a === p.b && q.b !== p.a) assert.ok(jointSpeed(fr, a.phases, t0) / peak > 0.15, `${ref}: Stopp bei ${p.label} → ${q.label}`);
    });
    const occ = a.phases.map(() => 0); for (let t = 0; t < T; t += 0.001) occ[M.phaseAt(a.phases, t, fr).index] += 0.001;
    a.phases.forEach((p, i) => near(occ[i], p.dur, 0.01, `${ref} Dauer ${p.label}`));
  }
  // Umkehr (Dead Bug) und Halten bleiben wie bisher: Stopp am Wendepunkt
  const db = D.animationFor('dead-bug'), fdb = M.resolveFrames(D.framesOf(db));
  const tw = db.phases[0].dur + db.phases[1].dur; assert.ok(jointSpeed(fdb, db.phases, tw) < 1, 'Dead Bug hält am Wendepunkt');
});

test('v2.15.0: Griffe – Frontkniebeuge Hand an der Stange, Goblet Unterarm steil, Überkopf-Hantel verdeckt die Fingerspitzen', () => {
  const fs = D.animationFor('front-squat'), ffs = M.resolveFrames(D.framesOf(fs));
  for (const f of ffs) { const P = M.solvePose(f.pose), bar = P.scene.find((s) => s.type === 'plate').at;
    assert.ok(Math.hypot(P.joints.wrist[0] - bar[0], P.joints.wrist[1] - bar[1]) < 20, `Frontkniebeuge ${f.label}: Handgelenk an der Stange`);
    assert.ok(P.joints.hand[1] > P.joints.shoulder[1] - 20, `Frontkniebeuge ${f.label}: Hand nicht am Ohr`); }
  const gb = D.animationFor('goblet-squat'), fgb = M.resolveFrames(D.framesOf(gb));
  for (const f of fgb) { const P = M.solvePose(f.pose), J = P.joints, t = P.angles.trunk;
    const fa = Math.atan2(J.wrist[0] - J.elbow[0], -(J.wrist[1] - J.elbow[1])) * 180 / Math.PI - t;
    assert.ok(Math.abs(fa) < 25, `Goblet ${f.label}: Unterarm fast parallel zum Rumpf (${fa.toFixed(0)}°)`); }
  const oh = D.animationFor('overhead-dumbbell-triceps-extension'), foh = M.resolveFrames(D.framesOf(oh));
  const P = M.solvePose(foh[1].pose), dbs = P.scene.find((s) => s.type === 'db');
  let tip = 1e9; for (const sh of M.shapesFor('male')) if (sh.seg === 'farm' && sh.id === 'body') for (const q of sh.pts) tip = Math.min(tip, M.tf(P, 'farm', q)[1]);
  assert.ok(dbs.at[1] - 39 <= tip + 1, 'Überkopf oben: oberer Hantelkopf über den Fingerspitzen');
});

test('v2.15.0: Good Morning – Schienbein fast senkrecht, Schwerpunkt-Lösung', () => {
  const a = D.animationFor('good-morning'), fr = M.resolveFrames(D.framesOf(a));
  const sh = fr.map((f) => M.num ? M.num(f.pose.shank) : f.pose.shank.v);
  assert.ok(sh[1] > -15 && sh[1] < 5, `Schienbein unten ${sh[1]}° (vorher −20,7°)`);
});

test('v2.15.0: Geräte – Hebel hinter dem Bein, Sitzstütze unter dem Sitz, T-Bar-Scheiben frei, feste Rolle beim engen Latzug', () => {
  for (const ref of ['leg-extension', 'lying-leg-curl']) {
    const a = D.animationFor(ref), P = M.solvePose(M.resolveFrames(D.framesOf(a))[0].pose);
    const lever = P.scene.find((s) => s.type === 'line' && s.w === 7 && Math.hypot(s.from[0] - P.joints.knee[0], s.from[1] - P.joints.knee[1]) < 1);
    assert.ok(lever && lever.back && !lever.front, `${ref}: Hebel hinter dem Bein`);
  }
  const cp = M.solvePose(M.resolveFrames(D.framesOf(D.animationFor('chest-press-machine')))[0].pose);
  const seat = cp.scene.find((s) => s.type === 'rect'), post = cp.scene.find((s) => s.type === 'line' && s.to[1] === 0 && Math.abs(s.from[1] - (seat.y + seat.h)) < 1);
  assert.ok(post && post.from[0] >= seat.x && post.from[0] <= seat.x + seat.w, 'Brustpresse: Stütze unter dem Sitz');
  const tb = D.animationFor('t-bar-row'), ftb = M.resolveFrames(D.framesOf(tb)), T = M.cycleLength(tb.phases);
  for (let i = 0; i <= 30; i++) {
    const { pose } = M.poseAt(ftb, tb.phases, (T * i) / 30 - (i === 30 ? 1e-6 : 0)), pl = pose.scene.find((s) => s.type === 'plate');
    for (const sh of M.shapesFor('male')) if (sh.id === 'body' && ['trunk', 'thigh'].includes(sh.seg)) for (const q of sh.pts) {
      const w = M.tf(pose, sh.seg, q); assert.ok(Math.hypot(w[0] - pl.at[0], w[1] - pl.at[1]) >= pl.r, `T-Bar t=${i}: Scheibe im Körper`); }
  }
  const cg = D.animationFor('close-grip-lat-pulldown'), fcg = M.resolveFrames(D.framesOf(cg));
  const rolls = fcg.map((f) => M.solvePose(f.pose).scene.find((s) => s.type === 'bar' && s.r === 8).at[0]);
  near(rolls[0], rolls[1], 0.01, 'Rolle bleibt bei Rücklage stehen');
  assert.ok(M.solvePose(fcg[1].pose).angles.trunk < -5, 'Rücklage an der Brust');
});

test('v2.15.0: Frontansicht – Kopf bei starker Vorneigung vor dem Rumpf, aufrecht unverändert', () => {
  const up = MF.solveFront({ trunkFlex: 0 }), bent = MF.solveFront({ trunkFlex: 75 });
  near(up.joints.head[1] - up.joints.shoulderR[1], -71, 0.5, 'aufrecht: Kopf wie bisher');
  assert.ok(bent.joints.head[1] - bent.joints.shoulderR[1] > -40, 'vorgebeugt: Kopf tiefer');
  const L = MF.layersFront(bent, () => '', 'male'), idxArms = L.length; // Kopf wird nach den Rumpfmuskeln erneut gezeichnet
  assert.ok(L.filter((l) => l.cls === 'an-body fill').length > MF.layersFront(up, () => '', 'male').filter((l) => l.cls === 'an-body fill').length, 'Kopf zusätzlich vorn');
  assert.ok(idxArms > 0);
});


test('v2.15.0: Kein Sprung an Phasengrenzen (alle Animationen und Varianten)', () => {
  for (const a of D.ANIMATIONS) for (const v of a.variants ? a.variants.map((x) => x.key) : [undefined]) {
    const fr = M.resolveFrames(D.framesOf(a, v)); let t0 = 0;
    for (const p of a.phases) {
      t0 += p.dur;
      const A = M.poseAt(fr, a.phases, t0 - 1e-4).pose.joints, B = M.poseAt(fr, a.phases, t0 + 1e-4).pose.joints;
      for (const k of Object.keys(A)) if (Array.isArray(A[k]) && A[k].length === 2 && B[k]) assert.ok(Math.hypot(B[k][0] - A[k][0], B[k][1] - A[k][1]) < 0.5, `${a.ref}${v ? ':' + v : ''} ${p.label}: ${k} springt`);
    }
  }
});


// ---------- v2.16.0: Runde 11 ----------
test('v2.16.0: Halteübungen – Kontakte über den ganzen Zyklus', () => {
  const each = (ref, fn) => { const a = D.animationFor(ref), fr = M.resolveFrames(D.framesOf(a)), T = M.cycleLength(a.phases); for (let i = 0; i <= 40; i++) fn(M.poseAt(fr, a.phases, (T * i) / 40 - (i === 40 ? 1e-6 : 0)).pose, i); };
  // Plank: Ellbogen und Handgelenk 7 über der Matte (Unterarm flach), Zehen auf der Matte
  each('plank', (P, i) => { near(P.joints.elbow[1], -13, 0.6, `Plank t=${i}: Ellbogen`); near(P.joints.wrist[1], -13, 0.6, `Plank t=${i}: Handgelenk`); assert.ok(P.joints.toe[1] <= -5 && P.joints.toe[1] >= -9, `Plank t=${i}: Zehen ${P.joints.toe[1]}`); });
  // Liegestütz mit erhöhten Füßen: Zehen auf der Stufe, Kinn/Brust nie unter dem Boden
  const box = D.animationFor('feet-elevated-push-up');
  each('feet-elevated-push-up', (P, i) => { const r = P.scene.find((x) => x.type === 'rect'); near(P.joints.toe[1], r.y, 0.6, `FE t=${i}: Zehen auf der Stufe`); assert.ok(P.joints.toe[0] >= r.x && P.joints.toe[0] <= r.x + r.w, `FE t=${i}: Zehen über der Stufe`);
    let low = -1e9; for (const sh of M.shapesFor('male')) if (sh.seg === 'trunk') for (const q of sh.pts) low = Math.max(low, M.tf(P, 'trunk', q)[1]); assert.ok(low <= -4, `FE t=${i}: Rumpf im Boden (${low.toFixed(1)})`); });
  assert.ok(box.keyPoints.length >= 3);
  // Seitstütz: Ellbogen und unterer Knöchel bleiben, Oberarm im Halten senkrecht
  const e0 = []; each('side-plank', (P, i) => { if (!e0.length) e0.push(P.joints.elbowL, P.joints.ankleL); near(P.joints.elbowL[0], e0[0][0], 2.5, `Seitstütz t=${i}: Ellbogen x (Zwischenbilder linear gemischt, ≤ 1,2 cm)`); near(P.joints.elbowL[1], e0[0][1], 2.5, `Seitstütz t=${i}: Ellbogen y`); near(P.joints.ankleL[1], e0[1][1], 0.1, `Seitstütz t=${i}: Fuß`); });
  const sp = D.animationFor('side-plank'), H = MF.solveFront(M.resolveFrames(D.framesOf(sp))[1].pose);
  near(H.joints.shoulderL[0], H.joints.elbowL[0], 1, 'Seitstütz: Oberarm senkrecht');
  // Copenhagen: oberer Knöchel auf der Bank, Ellbogen auf der Matte, unterer Fuß nie unter der Matte
  each('copenhagen-plank', (P, i) => { near(P.joints.ankleR[1], -90 - 9, 0.6, `Copenhagen t=${i}: Bein auf der Bank`); assert.ok(Math.abs(P.joints.elbowL[1] - (-14)) < 1.5, `Copenhagen t=${i}: Ellbogen ${P.joints.elbowL[1]}`); assert.ok(P.joints.ankleL[1] <= -14.5, `Copenhagen t=${i}: unterer Fuß im Boden`); });
  // L-Sitz: Handgelenk am Griff; im Halten Beine über dem Boden
  const ls = D.animationFor('l-sit'), fls = M.resolveFrames(D.framesOf(ls));
  each('l-sit', (P, i) => near(Math.hypot(P.joints.wrist[0] - 0, P.joints.wrist[1] + 28), 0, 1, `L-Sitz t=${i}: Hand am Griff`));
  const PH = M.solvePose(fls[1].pose); let low = -1e9; for (const sh of M.shapesFor('male')) if (['trunk', 'thigh', 'shank', 'foot'].includes(sh.seg)) for (const q of sh.pts) low = Math.max(low, M.tf(PH, sh.seg, q)[1]);
  assert.ok(low < -2, `L-Sitz oben: Körper hebt ab (${low.toFixed(1)})`);
});

test('v2.16.0: Frontansicht – Bein einzeln abspreizen (abdL/abdR), ohne Angabe unverändert', () => {
  const a = MF.solveFront({}), b = MF.solveFront({ legs: { abdL: 30 } });
  assert.deepEqual(b.joints.ankleR, a.joints.ankleR, 'rechtes Bein bleibt');
  assert.ok(b.joints.ankleL[0] < a.joints.ankleL[0] - 30, 'linkes Bein nach außen');
});

// ---------- v2.17.0: Runde 12 ----------
test('v2.17.0: Bauch hängend, im Stütz und am Seilzug – Kontakte über den ganzen Zyklus', () => {
  const each = (ref, fn) => { const a = D.animationFor(ref), fr = M.resolveFrames(D.framesOf(a)), T = M.cycleLength(a.phases); for (let i = 0; i <= 40; i++) fn(M.poseAt(fr, a.phases, (T * i) / 40 - (i === 40 ? 1e-6 : 0)).pose, i); };
  const low = (P, segs) => { let m = -1e9; for (const sh of M.shapesFor('male')) if (sh.id === 'body' && segs.includes(sh.seg)) for (const q of sh.pts) m = Math.max(m, M.tf(P, sh.seg, q)[1]); return m; };
  // Hängendes Beinheben: Hand an der Stange, Füße frei über dem Boden; oben Beine waagerecht
  each('hanging-leg-raise', (P, i) => { const bar = P.scene.find((x) => x.type === 'bar').at; assert.ok(Math.hypot(P.joints.wrist[0] - bar[0], P.joints.wrist[1] - bar[1] - 7) < 0.6, `HLR t=${i}: Hand an der Stange`); assert.ok(low(P, ['foot', 'shank']) < -10, `HLR t=${i}: Füße frei`); });
  const hl = M.solvePose(M.resolveFrames(D.framesOf(D.animationFor('hanging-leg-raise')))[1].pose);
  near(hl.joints.knee[1], hl.joints.hip[1], 2, 'HLR oben: Oberschenkel waagerecht');
  // Captain's Chair: Ellbogen bleibt auf dem Polster, Schulter bleibt am Rückenpolster, Füße frei
  let s0 = null; each('captains-chair-knee-raise', (P, i) => { s0 ??= P.joints.shoulder; near(P.joints.elbow[0], 0, 0.3, `CC t=${i}: Ellbogen x`); near(P.joints.elbow[1], -300, 0.3, `CC t=${i}: Ellbogen y`); near(P.joints.shoulder[0], s0[0], 0.5, `CC t=${i}: Schulter am Polster`); assert.ok(low(P, ['foot']) < -40, `CC t=${i}: Füße frei`); });
  // Crunch am Kabel: Schienbein und Fußrücken liegen auf dem Boden (nicht darunter), Knie bleibt
  each('cable-crunch', (P, i) => { const l = low(P, ['shank', 'foot']); assert.ok(l <= 0.3 && l > -2, `Kabelcrunch t=${i}: Unterschenkel auf dem Boden (${l.toFixed(1)})`); });
  // Crunch-Maschine: Hüfte auf dem Sitz, Knöchel unter der Rolle
  each('machine-crunch', (P, i) => { near(P.joints.hip[0], 0, 0.1, `MC t=${i}: Hüfte x`); near(P.joints.hip[1], -100, 0.1, `MC t=${i}: Hüfte y`); const roll = P.scene.find((x) => x.type === 'bar' && !x.back); assert.ok(roll.at[1] < P.joints.ankle[1] + 1, `MC t=${i}: Rolle über dem Knöchel`); });
  // Frontansicht: beide Hände am selben Griff, Füße am Boden; Pallof gestreckt: Kabel waagerecht
  for (const ref of ['cable-woodchop', 'pallof-press']) each(ref, (P, i) => { assert.ok(Math.hypot(P.joints.handR[0] - P.joints.handL[0], P.joints.handR[1] - P.joints.handL[1]) < 24, `${ref} t=${i}: Hände zusammen`); near(P.joints.ankleR[1], -15, 0.5, `${ref} t=${i}: Fuß am Boden`); });
  const pa = MF.solveFront(M.resolveFrames(D.framesOf(D.animationFor('pallof-press')))[1].pose), g = pa.scene.find((x) => x.type === 'rect'), pul = pa.scene.find((x) => x.type === 'bar').at;
  near(g.y + 8, pul[1], 3, 'Pallof gestreckt: Kabel waagerecht');
});

// ---------- v2.18.0: Runde 13 ----------
test('v2.18.0: Bauch am Boden, Drehung, Seitbeugen, Hüftbeugen – Kontakte über den ganzen Zyklus', () => {
  const each = (ref, fn) => { const a = D.animationFor(ref), fr = M.resolveFrames(D.framesOf(a)), T = M.cycleLength(a.phases); for (let i = 0; i <= 40; i++) fn(M.poseAt(fr, a.phases, (T * i) / 40 - (i === 40 ? 1e-6 : 0)).pose, i); };
  const low = (P, segs) => { let m = -1e9; for (const sh of M.shapesFor('male')) if (sh.id === 'body' && segs.includes(sh.seg)) for (const q of sh.pts) m = Math.max(m, M.tf(P, sh.seg, q)[1]); return m; };
  // Rollout: Rad auf dem Boden, Arme gestreckt, Unterschenkel am Boden, Rumpf nie im Boden
  each('ab-wheel-rollout', (P, i) => { near(P.props.wheel[1], -18, 1.5, `Rollout t=${i}: Rad am Boden`); assert.ok(P.angles.elbow < 20, `Rollout t=${i}: Ellbogen ${P.angles.elbow} (fast gestreckt; Keyframes ≈ 10°)`); const l = low(P, ['shank', 'foot']); assert.ok(l <= 0.3 && l > -2, `Rollout t=${i}: Schienbein (${l.toFixed(1)})`); assert.ok(low(P, ['trunk']) < -2, `Rollout t=${i}: Rumpf über dem Boden`); });
  // Fahrrad-Crunch: Becken auf der Matte, beide Füße in der Luft
  each('bicycle-crunch', (P, i) => { const l = low(P, ['trunk']); assert.ok(l <= -5 && l >= -7.5, `Fahrrad t=${i}: Rumpf auf der Matte (${l.toFixed(1)})`); assert.ok(P.joints.toe[1] < -20 && P.joints.toe2[1] < -20, `Fahrrad t=${i}: Füße oben`); });
  // Hüftbeugen am Kabel: Standfuß fest, Manschette am arbeitenden Knöchel
  each('standing-cable-hip-flexion', (P, i) => { near(P.joints.ankle2[0], 0, 0.5, `HF t=${i}: Standfuß x`); near(P.joints.ankle2[1], -15, 0.5, `HF t=${i}: Standfuß y`); assert.ok(Math.hypot(P.props.cuff[0] - P.joints.ankle[0], P.props.cuff[1] - P.joints.ankle[1]) < 0.1, `HF t=${i}: Manschette`); });
  // Seitbeugen: Füße am Boden, linke Hand an der Hüfte
  each('dumbbell-side-bend', (P, i) => { near(P.joints.ankleR[1], -15, 0.5, `SB t=${i}: Fuß`); const h = P.joints.hipL; assert.ok(Math.hypot(P.joints.wristL[0] - (h[0] - 30), P.joints.wristL[1] - (h[1] - 16)) < 4, `SB t=${i}: linke Hand an der Hüfte`); });
  // Russian Twist: Hände zusammen, Becken auf der Matte
  each('russian-twist', (P, i) => { assert.ok(Math.hypot(P.joints.handR[0] - P.joints.handL[0], P.joints.handR[1] - P.joints.handL[1]) < 24, `RT t=${i}: Hände zusammen`); near(P.joints.pelvis[1], -34, 0.1, `RT t=${i}: Becken`); assert.ok(P.joints.kneeR[1] < P.joints.pelvis[1] - 30, `RT t=${i}: Knie oben`); });
});

test('v2.18.0: Frontansicht – Beinrichtung frei setzbar, ohne Angabe unverändert; Hüftbeuger in der Seitenansicht sichtbar', () => {
  const a = MF.solveFront({}), b = MF.solveFront({ legs: {} });
  assert.deepEqual(b.joints.kneeR, a.joints.kneeR, 'ohne Angabe unverändert');
  const c = MF.solveFront({ legs: { thighDir: 180, thighF: 0.5 } });
  assert.ok(c.joints.kneeR[1] < c.joints.hipR[1] - 40, 'Knie über der Hüfte');
  assert.equal(M.MUSCLE_SHAPE['hip-flexors'], 'hip-flexors');
  assert.ok(!M.HIDDEN_MUSCLES.includes('hip-flexors'));
});

test('v2.19.0: Waden, Hüftmaschinen, Kabel und Seitlage – Kontakte über den ganzen Zyklus', () => {
  const each = (ref, fn) => { const a = D.animationFor(ref), fr = M.resolveFrames(D.framesOf(a)), T = M.cycleLength(a.phases); for (let i = 0; i <= 40; i++) fn(M.poseAt(fr, a.phases, (T * i) / 40 - (i === 40 ? 1e-6 : 0)).pose, i); };
  // Wadenheben sitzend: Ballen auf dem Block, Gesäß bleibt auf dem Sitz (Hüftgelenk ±1,5 bei gemischten Zwischenbildern)
  let h0 = null; each('seated-calf-raise', (P, i) => { h0 = h0 || P.joints.hip; near(P.joints.toe[1], -28, 0.1, `WS t=${i}: Ballen auf dem Block`); assert.ok(dist(P.joints.hip, h0) < 1.5, `WS t=${i}: Hüfte bleibt (${dist(P.joints.hip, h0).toFixed(2)})`); assert.ok(dist(P.joints.wrist, P.props.pad) < 30, `WS t=${i}: Hände am Polster`); });
  // Beinpresse: Hüfte fest, Ballen an der Platte (Plattenanker liegt 10 hinter der Plattenmitte, Platte 5 hinter dem Ballen)
  each('leg-press-calf-raise', (P, i) => { near(P.joints.hip[0], 0, 0.1, `WB t=${i}: Hüfte x`); near(P.joints.hip[1], -70, 0.1, `WB t=${i}: Hüfte y`); const rail = [Math.SQRT1_2, -Math.SQRT1_2], v = [P.props.plate[0] - P.joints.toe[0], P.props.plate[1] - P.joints.toe[1]]; near(v[0] * rail[0] + v[1] * rail[1], 15, 0.5, `WB t=${i}: Platte am Ballen`); });
  // Einbeinig: Ballen auf der Stufe, Hand an der Wand
  each('single-leg-calf-raise', (P, i) => { near(P.joints.toe[1], -30, 0.1, `WE t=${i}: Ballen`); assert.ok(dist(P.joints.wrist, [94, -262]) < 1, `WE t=${i}: Hand an der Wand`); assert.ok(P.joints.toe2[1] < -40, `WE t=${i}: freier Fuß in der Luft`); });
  // Hüftmaschinen: Becken auf dem Sitz, Füße über dem Boden, Knie öffnen sich gleich weit
  for (const ref of ['hip-abduction-machine', 'hip-adduction-machine']) each(ref, (P, i) => { near(P.joints.pelvis[1], -132, 0.1, `${ref} t=${i}: Becken`); assert.ok(P.joints.ankleR[1] < -15 && P.joints.ankleL[1] < -15, `${ref} t=${i}: Füße auf der Stütze`); near(P.joints.kneeR[0], -P.joints.kneeL[0], 0.1, `${ref} t=${i}: symmetrisch`); });
  // Kabel: Standfuß fest, Manschette am rechten Knöchel, Fuß des Zugbeins nie im Boden
  for (const ref of ['cable-hip-abduction-standing', 'cable-hip-adduction']) each(ref, (P, i) => { near(P.joints.ankleL[0], -13, 0.1, `${ref} t=${i}: Standfuß x`); near(P.joints.ankleL[1], -15, 0.1, `${ref} t=${i}: Standfuß y`); assert.ok(dist(P.props.cuff, P.joints.ankleR) < 0.1, `${ref} t=${i}: Manschette`); assert.ok(P.joints.ankleR[1] <= -14.9, `${ref} t=${i}: Zugbein über dem Boden`); });
  // Seitlage: tiefster Umrisspunkt auf der Matte, unteres Bein bleibt liegen
  const lowF = (P) => { let m = -1e9; for (const l of MF.layersFront(P, () => '', 'male')) { if (!l.cls.includes('fill') || l.d.includes(' a')) continue; const n = l.d.replace(/[MCZ]/g, ' ').trim().split(/\s+/).map(Number); for (let k = 1; k < n.length; k += 2) m = Math.max(m, n[k]); } return m; };
  for (const ref of ['side-lying-hip-abduction', 'clamshell-band']) { let a0 = null; each(ref, (P, i) => { a0 = a0 || P.joints.ankleL; near(lowF(P), -6, 0.6, `${ref} t=${i}: auf der Matte`); assert.ok(dist(P.joints.ankleL, a0) < 0.1, `${ref} t=${i}: unteres Bein liegt`); assert.ok(P.joints.kneeR[1] <= P.joints.kneeL[1] + 0.1, `${ref} t=${i}: oberes Knie oben`); }); }
});

test('v2.19.0: Frontansicht – Abduktoren sichtbar, linkes Bein eigene Richtung, rechtes Bein vorn', () => {
  assert.equal(MF.MUSCLE_SHAPE_F.abductors, 'abductors');
  assert.ok(!MF.HIDDEN_MUSCLES_F.includes('abductors'));
  const a = MF.solveFront({ legs: { thighDir: 30, thighF: 0.5 } }), b = MF.solveFront({ legs: { thighDir: 30, thighF: 0.5, thighDirL: 0, thighFL: 1 } });
  assert.deepEqual(b.joints.kneeR, a.joints.kneeR, 'rechtes Bein unverändert');
  near(b.joints.kneeL[0], b.joints.hipL[0], 0.01, 'linker Oberschenkel senkrecht');
  const disc = (c) => 'M' + (Math.round((c[0] - 8) * 10) / 10) + ' ' + (Math.round(c[1] * 10) / 10);
  const order = (spec) => { const P = MF.solveFront(spec), L = MF.layersFront(P).filter((l) => l.cls.includes('fill')).map((l) => l.d); return [L.findIndex((d) => d.startsWith(disc(P.joints.kneeR))), L.findIndex((d) => d.startsWith(disc(P.joints.kneeL)))]; };
  const [r0, l0] = order({ legs: { abdR: -9 } }), [r1, l1] = order({ legs: { abdR: -9 }, frontLeg: 'R' });
  assert.ok(r0 >= 0 && l0 >= 0 && r0 < l0, 'Standard: linkes Knie zuletzt');
  assert.ok(r1 > l1, 'frontLeg R: rechtes Bein über dem linken');
});

done();
