// Frontansicht der Übungsfigur (v2.1), ohne DOM – für Klimmzug, Latzug und Seitheben.
// Gleiche Einheiten wie die Seitenansicht (js/motion.js): y nach unten, Boden = 0, Körpergröße H ≈ 358, Längen nach ANSUR II.
// Breiten (Schultergelenke ±38 ≈ Biakromialbreite 0,23 · H, Hüftgelenke ±16, Knie ±13) folgen ANSUR-Mittelwerten,
// Umrisse und Muskelformen sind Zeichenkonvention (Drive: Research - Animations, Unverified #71).
//
// Spezifikation (Zahlen oder { v }): view: 'front';
//   root: 'pelvis' | 'wristR' | 'handR', rootPos [x, y];
//   arm: { abd, elbow } – Abduktion in der Frontalebene (0° = Arm hängt, 90° = waagerecht, 180° = über Kopf),
//        Ellbogenbeugung in der Bildebene (Unterarm dreht zur Körpermitte / nach unten);
//   armPoints: { elbow: [dx, dy], wrist: [dx, dy] } – projizierte Armgeometrie relativ zur Schulter (dx nach außen, dy nach unten);
//   legs: { hip, knee } – Beugung in der Sagittalebene; in der Frontansicht nur als Verkürzung sichtbar;
//   props(P, spec) → { anchors, scene } wie in der Seitenansicht.
import { LEN, smooth, num, f1 } from './motion.js';

const DEG = Math.PI / 180;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const nrm = (d) => [d[1], -d[0]];
// Richtung in der Frontalebene für die rechte Körperseite: 0° = nach unten, 90° = nach außen (rechts), 180° = nach oben.
const fdir = (deg) => [Math.sin(deg * DEG), Math.cos(deg * DEG)];

// Gelenke im Stand (rechte Seite; linke gespiegelt)
export const J0F = { pelvis: [0, -183], hip: [16, -183], knee: [13, -95], ankle: [13, -15], shoulder: [38, -287], elbow: [43, -219], wrist: [46, -165] };
const MIN_SCALE = 0.12;

// Formen in Standkoordinaten der rechten Seite; `both` = beidseitig (gespiegelt), `mid` = symmetrische Form um x = 0.
function headPts() {
  const out = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * 2 * Math.PI;
    const rx = 19 - 2.5 * Math.max(0, Math.sin(a)), ry = 23; // Kinn etwas schmaler
    out.push([rx * Math.cos(a), -336 + ry * Math.sin(a)]);
  }
  return out;
}
export const SHAPES_F = [
  { seg: 'trunk', id: 'body', mid: true, pts: [[9, -314], [10, -300], [24, -295], [38, -290], [41, -270], [40, -248], [35, -230], [30, -215], [31, -200], [34, -186], [32, -172], [20, -167], [6, -166], [0, -165]] },
  { seg: 'trunk', id: 'body', part: 'head', pts: headPts() },
  { seg: 'trunk', id: 'upper-back', both: true, pts: [[6, -314], [12, -312], [24, -302], [37, -293], [31, -289], [17, -295], [8, -303]] },
  { seg: 'trunk', id: 'chest', both: true, pts: [[1, -288], [1, -262], [8, -254], [22, -252], [34, -258], [40, -271], [36, -284], [22, -290], [8, -290]] },
  { seg: 'trunk', id: 'lats', both: true, pts: [[34, -268], [41, -262], [39, -242], [33, -228], [29, -244], [30, -260]] },
  { seg: 'trunk', id: 'obliques', both: true, pts: [[14, -246], [19, -240], [21, -215], [19, -195], [15, -190], [13, -215], [13, -240]] },
  { seg: 'trunk', id: 'abs', mid: true, pts: [[12, -250], [13, -225], [12, -200], [8, -186], [0, -184]] },
  { seg: 'thigh', id: 'body', both: true, pts: [[4, -181], [28, -183], [32, -160], [28, -130], [24, -105], [20, -92], [8, -92], [6, -110], [5, -140], [4, -165]] },
  { seg: 'thigh', id: 'quads', both: true, pts: [[10, -176], [26, -176], [30, -150], [26, -120], [22, -100], [12, -100], [9, -125], [8, -150]] },
  { seg: 'shank', id: 'body', both: true, pts: [[6, -96], [21, -96], [22, -80], [19, -50], [18, -25], [17, -14], [9, -14], [8, -28], [6, -55], [5, -78]] },
  { seg: 'foot', id: 'body', both: true, pts: [[6, -16], [21, -16], [23, -6], [20, 0], [8, 0], [5, -8]] },
  { seg: 'uarm', id: 'body', both: true, pts: [[28, -296], [38, -300], [48, -294], [52, -282], [50, -262], [49, -240], [48, -222], [43, -212], [37, -220], [35, -240], [31, -262], [28, -280]] },
  { seg: 'uarm', id: 'delts', both: true, pts: [[28, -296], [38, -300], [48, -294], [52, -282], [50, -266], [42, -258], [32, -262], [28, -278]] },
  { seg: 'uarm', id: 'biceps', both: true, pts: [[34, -258], [44, -256], [47, -240], [45, -226], [38, -224], [34, -238]] },
  { seg: 'farm', id: 'body', both: true, pts: [[36, -222], [50, -222], [53, -205], [52, -185], [50, -168], [51, -158], [50, -146], [45, -141], [40, -144], [39, -156], [40, -168], [40, -180], [37, -200]] },
  { seg: 'farm', id: 'forearms', both: true, pts: [[37, -220], [49, -220], [52, -204], [48, -190], [40, -192], [37, -206]] }
];
export const MUSCLE_SHAPE_F = { chest: 'chest', 'front-delts': 'delts', 'side-delts': 'delts', 'rear-delts': 'delts', lats: 'lats', 'upper-back': 'upper-back', biceps: 'biceps', forearms: 'forearms', abs: 'abs', obliques: 'obliques', quads: 'quads' };
export const HIDDEN_MUSCLES_F = ['triceps', 'lower-back', 'glutes', 'hamstrings', 'calves', 'adductors', 'abductors', 'hip-flexors'];
export const ANCHORS_F = {
  head: { seg: 'trunk', p: [0, -358] }, chin: { seg: 'trunk', p: [0, -313] }, neck: { seg: 'trunk', p: [9, -312] }, chest: { seg: 'trunk', p: [0, -268] },
  belly: { seg: 'trunk', p: [0, -210] }, hip: { seg: 'trunk', p: [30, -186] }, shoulder: { seg: 'uarm', p: [48, -294] }, uarm: { seg: 'uarm', p: [50, -250] },
  elbow: { seg: 'farm', p: [52, -215] }, farm: { seg: 'farm', p: [52, -190] }, wrist: { seg: 'farm', p: [50, -166] }, hand: { seg: 'farm', p: [49, -150] },
  thigh: { seg: 'thigh', p: [30, -150] }, knee: { seg: 'shank', p: [22, -94] }, shin: { seg: 'shank', p: [19, -55] }, foot: { seg: 'foot', p: [22, -4] }, heel: { seg: 'foot', p: [13, -2] }
};

const SEGS_F = { trunk: ['pelvis', 'shoulder'], thigh: ['hip', 'knee'], shank: ['knee', 'ankle'], foot: ['ankle', null], uarm: ['shoulder', 'elbow'], farm: ['elbow', 'wrist'] };
const RESTF = {};
for (const [k, [from, to]] of Object.entries(SEGS_F)) {
  const J = k === 'trunk' ? J0F.pelvis : J0F[from];
  const d = k === 'trunk' ? [0, -1] : to ? unit(sub(J0F[to], J0F[from])) : [0, 1];
  RESTF[k] = { J, d, n: nrm(d) };
}
const mirror = (p) => [-p[0], p[1]];

// Pose in der Frontansicht lösen. Rückgabe wie solvePose: { view, joints, F, angles, scene, props }.
export function solveFront(spec) {
  const g = (k, d = 0) => { const x = num(spec[k]); return Number.isFinite(x) ? x : d; };
  const lean = g('trunk'); // Rumpfneigung in der Frontalebene (nach rechts positiv), meist 0
  const tUp = fdir(180 + lean);
  // Rumpf relativ zum Beckenmittelpunkt
  const pelvis = [0, 0];
  const shC = add(pelvis, mul(tUp, LEN.trunk));
  const sides = { R: 1, L: -1 };
  const J = { pelvis };
  const F = {};
  const fr = (Jp, d, f = 1) => ({ J: Jp, d, n: nrm(d), f });
  F.trunk = fr(pelvis, tUp); // Rumpfrahmen: Ursprung Becken, Richtung vom Becken zur Schulter
  // Beine: Beugung in der Sagittalebene erscheint als Verkürzung
  const legs = spec.legs || {};
  const hipF = num(legs.hip) || 0, kneeF = num(legs.knee) || 0;
  const thighScale = Math.max(Math.cos(hipF * DEG), MIN_SCALE), shankScale = Math.max(Math.cos((hipF - kneeF) * DEG), MIN_SCALE);
  const stance = num(legs.stance); // Fußabstand relativ zum Stand (± Einheiten je Seite), Konvention
  for (const [s, sg] of Object.entries(sides)) {
    const hip = add(pelvis, [sg * (J0F.hip[0] - J0F.pelvis[0]), 0]);
    const dT = unit([sg * (J0F.knee[0] - J0F.hip[0]) + sg * (Number.isFinite(stance) ? stance : 0) * 0.5, J0F.knee[1] - J0F.hip[1]]);
    const knee = add(hip, mul(dT, LEN.thigh * thighScale));
    const dS = unit([sg * (Number.isFinite(stance) ? stance : 0) * 0.5, J0F.ankle[1] - J0F.knee[1]]);
    const ankle = add(knee, mul(dS, LEN.shank * shankScale));
    J['hip' + s] = hip; J['knee' + s] = knee; J['ankle' + s] = ankle;
    F['thigh' + s] = fr(hip, dT, thighScale); F['shank' + s] = fr(knee, dS, shankScale); F['foot' + s] = fr(ankle, [0, 1], shankScale);
  }
  // Arme (symmetrisch; rechte Seite als Vorlage, linke gespiegelt)
  const armsOf = (side) => {
    const sg = sides[side];
    const sh = add(shC, [sg * J0F.shoulder[0], 0]);
    let E, W, sU = 1, sF = 1;
    if (spec.armPoints) {
      const e = spec.armPoints.elbow, w = spec.armPoints.wrist;
      E = add(sh, [sg * num(e[0]), num(e[1])]); W = add(sh, [sg * num(w[0]), num(w[1])]);
      sU = Math.hypot(num(e[0]), num(e[1])) / LEN.uarm; sF = Math.hypot(num(w[0]) - num(e[0]), num(w[1]) - num(e[1])) / LEN.farm;
    } else {
      const arm = spec.arm || {};
      const abd = num(arm.abd) || 0, el = num(arm.elbow) || 0;
      const dU = fdir(abd), dF = fdir(abd - el);
      E = add(sh, mul([sg * dU[0], dU[1]], LEN.uarm)); W = add(E, mul([sg * dF[0], dF[1]], LEN.farm));
    }
    const dU = unit(sub(E, sh)), dF = unit(sub(W, E));
    const hand = add(W, mul(dF, LEN.hand));
    return { sh, E, W, hand, dU, dF, sU: Math.max(sU, MIN_SCALE), sF: Math.max(sF, MIN_SCALE) };
  };
  for (const s of Object.keys(sides)) {
    const A = armsOf(s);
    J['shoulder' + s] = A.sh; J['elbow' + s] = A.E; J['wrist' + s] = A.W; J['hand' + s] = A.hand;
    F['uarm' + s] = fr(A.sh, A.dU, A.sU); F['farm' + s] = fr(A.E, A.dF, A.sF);
  }
  J.shoulder = J.shoulderR; J.elbow = J.elbowR; J.wrist = J.wristR; J.hand = J.handR; J.hip = J.hipR; J.knee = J.kneeR; J.ankle = J.ankleR;
  J.chin = add(shC, mul(tUp, 26)); J.head = add(shC, mul(tUp, 71));
  J.toe = add(J.ankleR, [0, 13]); J.toe2 = add(J.ankleL, [0, 13]); // Sohle wie in der Seitenansicht 2 Einheiten über dem Boden
  // Wurzel verschieben
  const root = spec.root || 'pelvis';
  const rp = spec.rootPos ? [num(spec.rootPos[0]), num(spec.rootPos[1])] : [0, J0F.pelvis[1]];
  const off = sub(rp, J[root] || J.pelvis);
  for (const k of Object.keys(J)) J[k] = add(J[k], off);
  for (const k of Object.keys(F)) F[k] = { ...F[k], J: add(F[k].J, off) };
  const A = armsOf('R');
  const abdDeg = Math.atan2(A.dU[0], A.dU[1]) / DEG; // 0 = hängend, 90 = waagerecht, 180 = oben
  const elbowDeg = Math.acos(Math.max(-1, Math.min(1, dot(A.dU, A.dF)))) / DEG;
  const angles = { trunk: f1(lean), abd: f1(abdDeg), elbow: f1(elbowDeg), hip: f1(hipF), knee: f1(kneeF) };
  const P = { view: 'front', joints: J, F, angles, segAngles: {}, solved: null, props: {}, scene: [], handFlat: 0 };
  if (typeof spec.props === 'function') {
    const pr = spec.props(P, spec) || {};
    P.props = pr.anchors || {};
    P.scene = pr.scene || [];
  }
  return P;
}

// Punkt eines Segments (Standkoordinaten der rechten Seite) in die Pose abbilden; side 'L' spiegelt die Ruhelage.
function tfF(P, seg, side, pt) {
  const R = RESTF[seg], A = P.F[seg + (seg === 'trunk' ? '' : side)];
  const pRest = side === 'L' ? mirror(pt) : pt;
  const JRest = side === 'L' ? mirror(R.J) : R.J, dRest = side === 'L' ? [-R.d[0], R.d[1]] : R.d;
  const nRest = nrm(dRest);
  const v = sub(pRest, JRest);
  const u = dot(v, dRest) * (A.f || 1), w = dot(v, nRest);
  return [A.J[0] + u * A.d[0] + w * A.n[0], A.J[1] + u * A.d[1] + w * A.n[1]];
}
export function anchorFront(P, key) {
  if (P.props && P.props[key]) return P.props[key].map(f1);
  const side = key.endsWith('L') ? 'L' : 'R';
  const base = key.replace(/[LR]$/, '');
  if (P.joints[key]) return P.joints[key].map(f1);
  const a = ANCHORS_F[base];
  if (!a) return null;
  return tfF(P, a.seg, side, a.p).map(f1);
}

// Zeichenebenen wie in der Seitenansicht: Beine, Rumpf mit Kopf, Arme. Klassen bleiben gleich (an-body, an-m prim/sec/rest).
export function layersFront(P, roleOf = () => '') {
  const out = [];
  const disc = (c, r) => 'M' + f1(c[0] - r) + ' ' + f1(c[1]) + ' a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0 Z';
  const group = (segs, joints) => {
    const shapes = [];
    for (const sh of SHAPES_F) {
      if (!segs.includes(sh.seg)) continue;
      if (sh.mid) { // symmetrische Form: rechte Hälfte plus gespiegelte linke Hälfte als ein Pfad
        const right = sh.pts.map((q) => tfF(P, sh.seg, 'R', q)), left = sh.pts.slice().reverse().map((q) => tfF(P, sh.seg, 'L', q));
        shapes.push({ sh, d: smooth(right.concat(left)) });
      } else if (sh.both) {
        for (const side of ['R', 'L']) shapes.push({ sh, d: smooth(sh.pts.map((q) => tfF(P, sh.seg, side, q))) });
      } else shapes.push({ sh, d: smooth(sh.pts.map((q) => tfF(P, sh.seg, 'R', q))) });
    }
    const body = shapes.filter((x) => x.sh.id === 'body').map((x) => x.d).concat(joints.filter((j) => P.joints[j[0]]).map((j) => disc(P.joints[j[0]], j[1])));
    for (const d of body) out.push({ d, cls: 'an-body edge' });
    for (const d of body) out.push({ d, cls: 'an-body fill' });
    for (const { sh, d } of shapes) {
      if (sh.id === 'body') continue;
      const role = roleOf(sh.id);
      out.push({ d, cls: 'an-m ' + (role === 'p' ? 'prim' : role === 's' ? 'sec' : 'rest') });
    }
  };
  group(['thigh', 'shank', 'foot'], [['kneeR', 8], ['kneeL', 8]]);
  group(['trunk'], []);
  group(['uarm', 'farm'], [['shoulderR', 10], ['shoulderL', 10], ['elbowR', 6], ['elbowL', 6]]);
  return out;
}
