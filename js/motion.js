// Bewegungsmodell für die Übungsanimationen (v2.0), ohne DOM.
// Figur in Seitenansicht (Blick nach rechts), Bildschirmkoordinaten: y nach unten, Boden = 0, Körpergröße H ≈ 358.
// Längen und Tiefen folgen ANSUR II (Männer, Mittelwerte); Aufteilung vorne/hinten und Muskelformen sind
// Zeichenkonvention (Drive: Research - Animations, Unverified #70/#71).
//
// Winkelkonvention (wie in der Recherche): Knie-/Hüft-/Ellbogenbeugung 0° = gestreckt; Dorsalflexion positiv;
// Rumpf- und Schienbeinneigung aus der Senkrechten, nach vorn positiv; Schulterflexion 0° = Arm hängt, 180° = über Kopf.
// Intern wird jede Segmentrichtung als Winkel von „senkrecht nach oben“ gemessen, nach vorn positiv: dir(θ) = (sin θ, −cos θ).

import { solveFront, layersFront, anchorFront } from './motion-front.js';
import { femaleSide, ANCHORS_FEMALE } from './motion-female.js';

export const H = 358;
export const J0 = { ankle: [0, -15], knee: [0, -95], hip: [0, -183], shoulder: [2, -287], elbow: [2, -219], wrist: [2, -165] };
export const LEN = { shank: 80, thigh: 88, trunk: 104, uarm: 68, farm: 54, hand: 14 };
// Ballen des Fußes relativ zum Knöchel (Drehpunkt beim Wadenheben), Fußlänge nach ANSUR 0.154 · H.
const TOE = { u: 30, w: -13 };

const SEGS = {
  trunk: { from: 'shoulder', to: 'hip' }, thigh: { from: 'hip', to: 'knee' }, shank: { from: 'knee', to: 'ankle' },
  foot: { from: 'ankle', dir: [1, 0] }, uarm: { from: 'shoulder', to: 'elbow' }, farm: { from: 'elbow', to: 'wrist' }
};
// Formen in Standkoordinaten; id 'body' = Silhouette, sonst Muskel (Schlüssel wie im Pool, delts = alle Schulteranteile).
export const SHAPES = [
  { seg: 'trunk', id: 'body', pts: [[11, -312], [14, -293], [22, -284], [28, -268], [29, -258], [27, -245], [25, -230], [27, -214], [26, -200], [21, -186], [14, -176], [8, -170], [-6, -168], [-18, -166], [-28, -170], [-33, -180], [-32, -195], [-26, -208], [-20, -222], [-21, -236], [-24, -252], [-25, -265], [-22, -280], [-16, -294], [-11, -306], [-9, -314]] },
  { seg: 'trunk', id: 'body', part: 'head', pts: [[-10, -312], [-14, -325], [-17, -337], [-15, -348], [-8, -355], [2, -358], [12, -356], [19, -350], [22, -342], [23, -337], [21.5, -334.5], [25, -329], [22, -326], [22.5, -322], [21, -318], [17, -314], [11, -313], [8, -310]] },
  { seg: 'trunk', id: 'ear', pts: [[-1, -338], [3, -336], [3, -329], [0, -325], [-3, -328], [-3, -335]] },
  { seg: 'trunk', id: 'lats', pts: [[-6, -222], [-20, -226], [-24, -252], [-24, -270], [-14, -276], [-6, -262], [-4, -240]] },
  { seg: 'trunk', id: 'upper-back', pts: [[-6, -286], [-15, -292], [-11, -306], [-7, -314], [-2, -300]] },
  { seg: 'trunk', id: 'lower-back', pts: [[-14, -213], [-21, -216], [-22, -236], [-24, -250], [-17, -250], [-14, -232]] },
  { seg: 'trunk', id: 'glutes', pts: [[-12, -170], [-24, -168], [-32, -178], [-31, -196], [-25, -210], [-14, -212], [-8, -195], [-8, -178]] },
  { seg: 'trunk', id: 'chest', pts: [[16, -292], [25, -282], [29, -264], [27, -250], [16, -250], [12, -270]] },
  { seg: 'trunk', id: 'obliques', pts: [[8, -185], [14, -192], [18, -215], [17, -242], [6, -240], [2, -215]] },
  { seg: 'trunk', id: 'abs', pts: [[14, -176], [21, -186], [26, -200], [27, -214], [25, -230], [26, -246], [17, -246], [16, -225], [15, -200], [10, -182]] },
  { seg: 'thigh', id: 'body', pts: [[10, -172], [17, -160], [19, -140], [17, -120], [13, -104], [12, -96], [-12, -92], [-14, -104], [-17, -122], [-20, -145], [-22, -165], [-18, -175]] },
  { seg: 'thigh', id: 'quads', pts: [[6, -168], [16, -160], [18.5, -140], [16.5, -120], [12, -104], [6, -100], [4, -125], [3, -150]] },
  { seg: 'thigh', id: 'hip-flexors', pts: [[4, -177], [11, -175], [15.5, -167], [13, -159], [7, -161], [3.5, -169]] }, // v2.18.0: Hüftbeuger (Iliopsoas/Leiste) vorn am Hüftgelenk – Zeichenkonvention
  { seg: 'thigh', id: 'hamstrings', pts: [[-4, -170], [-20, -163], [-19, -140], [-16, -118], [-12, -98], [-5, -100], [-5, -130], [-4, -155]] },
  { seg: 'shank', id: 'body', pts: [[11, -92], [10, -80], [9, -60], [7, -40], [6, -22], [7, -15], [-7, -15], [-7, -22], [-8, -38], [-13, -55], [-16, -70], [-15, -82], [-12, -92]] },
  { seg: 'shank', id: 'calves', pts: [[-4, -90], [-12, -91], [-15.5, -75], [-15, -62], [-10, -50], [-5, -58], [-3, -75]] },
  { seg: 'shank', id: 'tibialis', pts: [[5, -88], [9.5, -80], [8.5, -60], [7, -48], [3, -55], [3, -75]] },
  { seg: 'foot', id: 'body', pts: [[-14, -4], [-13, -11], [-8, -17], [6, -20], [18, -14], [32, -7], [41, -4], [41, 0], [10, 0], [-12, 0]] },
  { seg: 'uarm', id: 'body', pts: [[4, -297], [12, -292], [13, -275], [11, -258], [11, -240], [9, -225], [8, -217], [-5, -217], [-8, -230], [-10, -248], [-11, -265], [-9, -282], [-4, -294]] },
  { seg: 'uarm', id: 'delts', pts: [[-3, -294], [5, -298], [12, -291], [13, -275], [10, -260], [3, -257], [-8, -266], [-10, -282]] },
  { seg: 'uarm', id: 'biceps', pts: [[4, -256], [11, -254], [11, -240], [9, -226], [4, -224], [3, -242]] },
  { seg: 'uarm', id: 'triceps', pts: [[-1, -258], [-10, -260], [-10, -245], [-7, -228], [-2, -226], [-1, -245]] },
  // v2.21.0: Unterarm bis zum Handgelenk, Hand getrennt: Faust (hält Griffe, mit Fingerknöcheln und Daumen) oder flache Hand (handFlat, Stütz).
  // Faust: Mitte 7–10 unter dem Handgelenk, Griff und Stange (Handgelenk + 7 bzw. + 14) liegen darin. Zeichenkonvention.
  { seg: 'farm', id: 'body', pts: [[8, -217], [10, -205], [9, -190], [7, -176], [6, -168], [2, -164], [-3, -168], [-4, -178], [-6, -195], [-7, -210], [-5, -220]] },
  { seg: 'farm', id: 'body', hand: 'open', pts: [[6, -170], [6, -166], [7, -158], [8, -145], [6, -130], [3, -125], [0, -128], [-2, -140], [-3, -155], [-3, -166], [-3, -170], [2, -172]] },
  { seg: 'farm', id: 'body', hand: 'fist', pts: [[6, -172], [9, -166], [10, -158], [9, -150], [6, -146], [1, -144], [-4, -146], [-6, -151], [-6, -160], [-5, -167], [-3, -172]] },
  { seg: 'farm', id: 'body', hand: 'knuckle', pts: [[-6, -154], [9.5, -154], [9, -149], [6, -145.5], [1, -144.5], [-4, -146], [-6, -149]] },
  { seg: 'farm', id: 'body', hand: 'thumb', pts: [[7, -169], [11.5, -164], [12.5, -158], [10.5, -153.5], [7.5, -155], [6.5, -161]] },
  { seg: 'farm', id: 'forearms', pts: [[-5, -216], [7, -216], [9.5, -203], [8, -185], [2, -180], [-4, -182], [-6, -198]] }
];
// Pool-Muskel → Form der Figur. Adduktoren und Abduktoren sind in der Seitenansicht nicht als Fläche sichtbar; Hüftbeuger seit v2.18.0 als kleine Fläche vorn an der Leiste.
export const MUSCLE_SHAPE = {
  chest: 'chest', 'front-delts': 'delts', 'side-delts': 'delts', 'rear-delts': 'delts', lats: 'lats', 'upper-back': 'upper-back',
  'lower-back': 'lower-back', biceps: 'biceps', triceps: 'triceps', forearms: 'forearms', abs: 'abs', obliques: 'obliques',
  glutes: 'glutes', quads: 'quads', hamstrings: 'hamstrings', calves: 'calves', 'hip-flexors': 'hip-flexors'
};
export const HIDDEN_MUSCLES = ['adductors', 'abductors'];

// Ankerpunkte für Kernpunkte (Standkoordinaten je Segment).
export const ANCHORS = {
  toe: { seg: 'foot', p: [30, -4] }, heel: { seg: 'foot', p: [-12, -4] }, foot: { seg: 'foot', p: [13, -19] },
  knee: { seg: 'shank', p: [11, -92] }, kneeBack: { seg: 'thigh', p: [-12, -100] }, shin: { seg: 'shank', p: [9, -55] },
  thigh: { seg: 'thigh', p: [18, -138] }, hip: { seg: 'thigh', p: [-20, -168] }, glute: { seg: 'trunk', p: [-30, -185] },
  lowBack: { seg: 'trunk', p: [-26, -232] }, back: { seg: 'trunk', p: [-24, -262] }, upperBack: { seg: 'trunk', p: [-14, -300] },
  neck: { seg: 'trunk', p: [-9, -316] }, chin: { seg: 'trunk', p: [22, -326] }, head: { seg: 'trunk', p: [2, -358] },
  chest: { seg: 'trunk', p: [28, -268] }, belly: { seg: 'trunk', p: [26, -214] }, shoulder: { seg: 'uarm', p: [8, -296] },
  elbow: { seg: 'farm', p: [-6, -218] }, wrist: { seg: 'farm', p: [2, -165] }, hand: { seg: 'farm', p: [1, -152] }
};

// v2.5.0: Figur je Einstellung 'male' | 'female' (Gelenke und Längen gleich, nur Formen und einige Anker anders).
export const SHAPES_FEMALE = femaleSide(SHAPES, { bun: true });
export const shapesFor = (sex) => (sex === 'female' ? SHAPES_FEMALE : SHAPES);
const anchorDef = (sex, k) => (sex === 'female' && ANCHORS_FEMALE[k]) || ANCHORS[k];

const DEG = Math.PI / 180;
export const f1 = (v) => Math.round(v * 10) / 10;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (v) => Math.hypot(v[0], v[1]);
const unit = (v) => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
const nrm = (d) => [d[1], -d[0]];
export const dir = (deg) => [Math.sin(deg * DEG), -Math.cos(deg * DEG)];
export const angOf = (v) => Math.atan2(v[0], -v[1]) / DEG; // Umkehrung von dir()
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// Zahl oder Messwert-Objekt { v, src, read } → Zahl.
export const num = (x) => (x && typeof x === 'object' ? x.v : x);

const REST = {};
for (const [k, s] of Object.entries(SEGS)) {
  const J = J0[s.from], d = s.dir || unit(sub(J0[s.to], J));
  REST[k] = { J, d, n: nrm(d) };
}
const baseSeg = (seg) => seg.replace(/2$/, '');

// v2.13: Rumpfbeugung (curl, Grad; positiv = Beugung nach vorn, z. B. Crunch). Der Rumpf biegt sich gleichmäßig in einer Zone
// 35–80 Einheiten über dem Hüftgelenk (etwa Lendenwirbelsäule bis untere Brustwirbelsäule, Zeichenkonvention); darunter bleibt er
// wie bisher, darüber dreht er starr mit. Rechnet in Standkoordinaten des Rumpfs; curl = 0 lässt jeden Punkt unverändert.
const BEND = { y0: J0.hip[1], s0: 35, s1: 80 };
export function bendLocal(pt, curl) {
  const s = BEND.y0 - pt[1];
  if (!curl || s <= BEND.s0) return pt;
  const K = (curl * DEG) / (BEND.s1 - BEND.s0), sr = Math.min(s, BEND.s1) - BEND.s0, a = K * sr;
  let cx = (1 - Math.cos(a)) / K, cy = -BEND.s0 - Math.sin(a) / K; // Mittellinie relativ zu (0, y0)
  if (s > BEND.s1) { const r = s - BEND.s1; cx += r * Math.sin(a); cy -= r * Math.cos(a); }
  return [cx + pt[0] * Math.cos(a), BEND.y0 + cy + pt[0] * Math.sin(a)];
}
// Punkt in Standkoordinaten des Rumpfs → Welt, mit dem ungebogenen Rumpfrahmen (Ursprung Schulter, Richtung Schulter → Hüfte).
function mapTrunk(Jsh, d, pt) {
  const R = REST.trunk, v = sub(pt, R.J), u = dot(v, R.d), w = dot(v, R.n), n = nrm(d);
  return [Jsh[0] + u * d[0] + w * n[0], Jsh[1] + u * d[1] + w * n[1]];
}

// Geschlossener Pfad durch Punkte (Catmull-Rom als Bézier).
export function smooth(pts) {
  const n = pts.length;
  let d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ' C' + f1(c1[0]) + ' ' + f1(c1[1]) + ' ' + f1(c2[0]) + ' ' + f1(c2[1]) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
  }
  return d + ' Z';
}

// ---------- Posenlöser ----------
// spec (Zahlen oder { v }): root ('ankle'|'toe'|'hip'|'shoulder'|'wrist'), rootPos [x,y];
//   trunk (absolute Rumpfneigung) ODER shank (Schienbeinneigung; Rumpf folgt aus Knie und Hüfte);
//   hip, knee, ankle (Beugung); shoulder, elbow ODER armTarget [dx,dy] (Handgelenk relativ zur Schulter) mit elbow;
//   armScale [oberarm, unterarm] Projektionsfaktoren für Arme außerhalb der Bildebene; elbowSide ±1;
//   leg2: { hip, knee, ankle } oder { ankle: [x,y], foot: Winkel } (zweites Bein per Zwei-Glieder-IK);
//   arm2: { shoulder, elbow } (zweiter Arm, sonst wie der erste);
//   armWorld: [x, y] – Handgelenk-Ziel in Weltkoordinaten (Zwei-Glieder-IK wie armTarget; Hände bleiben an einer festen Stange);
//   handFlat2 – wie handFlat, nur für den zweiten Arm (Stützhand auf der Bank, die andere Hand hält eine Hantel);
//   armAt: [x, y] – gestreckter Arm zeigt von der Schulter auf einen festen Punkt (Weltkoordinaten, z. B. die Stange);
//   solve: { param: 'trunk'|'shank', joint, y, range } – unbekannten Winkel so lösen, dass ein Gelenk eine Höhe erreicht,
//     oder { param, joint, at: [x,y], dist } – so, dass ein Gelenk einen festen Abstand zu einem Punkt hat (z. B. Schulter–Stange = Armlänge).
export const ARM_REACH = LEN.uarm + LEN.farm + LEN.hand;
export function solvePose(specIn) {
  if (specIn.view === 'front') return solveFront(specIn);
  const spec = {};
  for (const [k, v] of Object.entries(specIn)) spec[k] = v;
  if (spec.solve) {
    const s = spec.solve, [a, b] = s.range || (s.param === 'shank' ? [-20, 60] : [-100, 100]);
    const target = num(s.y);
    const evalAt = (x) => {
      const P = buildPose({ ...spec, [s.param]: x, solve: null });
      const j = P.joints[s.joint] || P.props[s.joint];
      if (s.at) return Math.hypot(j[0] - num(s.at[0]), j[1] - num(s.at[1])) - num(s.dist);
      return j[1] - target;
    };
    let lo = a, hi = b, flo = evalAt(lo), fhi = evalAt(hi);
    if (flo * fhi > 0) { // kein Vorzeichenwechsel: nimm den näheren Rand
      spec[s.param] = Math.abs(flo) < Math.abs(fhi) ? lo : hi;
    } else {
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2, fm = evalAt(mid);
        if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
      }
      spec[s.param] = (lo + hi) / 2;
    }
    spec.solved = { param: s.param, value: f1(spec[s.param]) };
    spec.solve = null;
  }
  return buildPose(spec);
}

function buildPose(spec) {
  const g = (k, d = 0) => { const x = num(spec[k]); return Number.isFinite(x) ? x : d; };
  let hip = g('hip'), knee = g('knee'), ankle = g('ankle');
  const hasTrunk = spec.trunk !== undefined && spec.trunk !== null && Number.isFinite(num(spec.trunk));
  const hasShank = spec.shank !== undefined && spec.shank !== null && Number.isFinite(num(spec.shank));
  // Segmentwinkel (von senkrecht-oben, nach vorn positiv)
  let t, aThigh, aShank;
  if (hasShank) {
    aShank = 180 + g('shank'); // Knie → Knöchel
    aThigh = aShank - knee; // Hüfte → Knie
    if (hasTrunk) { t = g('trunk'); hip = t - aThigh + 180; } // Hüfte folgt aus Rumpf und Oberschenkel
    else t = aThigh - 180 + hip;
  } else {
    t = g('trunk');
    aThigh = t - hip + 180;
    aShank = aThigh + knee;
  }
  const aTrunkUp = t; // Hüfte → Schulter (unterer Rumpf; bei curl ≠ 0 nur bis zur Biegezone)
  const curl = g('curl'), tu = t + curl; // tu: Neigung des oberen Rumpfs (Brustkorb), daran hängen Arme und Kopf
  let aFoot = aShank - 90 - ankle; // Knöchel → Zehen
  if (Number.isFinite(num(spec.foot))) { aFoot = num(spec.foot); ankle = aShank - 90 - aFoot; }
  // Arm
  const sc = spec.armScale || [1, 1];
  const a = LEN.uarm * sc[0], b = LEN.farm * sc[1];
  let elbow = g('elbow'), aU;
  let target = spec.armTarget ? [num(spec.armTarget[0]), num(spec.armTarget[1])] : null;
  if (!target && spec.armTargetTrunk) { // Ziel in Rumpfkoordinaten (dx nach vorn, dy nach oben entlang des Rumpfs)
    const up = dir(tu), fw = dir(tu + 90), dx = num(spec.armTargetTrunk[0]), dy = num(spec.armTargetTrunk[1]);
    target = [fw[0] * dx + up[0] * dy, fw[1] * dx + up[1] * dy];
  }
  // Positionen relativ zur Hüfte (Beine zuerst, damit die Wurzelverschiebung für Weltziele des Arms bekannt ist)
  const hipP = [0, 0];
  const shU = add(hipP, mul(dir(aTrunkUp), LEN.trunk)); // ungebogener Rumpf: Ursprung des Rumpfrahmens
  const dTrunk = dir(aTrunkUp + 180);
  const shP = curl ? mapTrunk(shU, dTrunk, bendLocal(J0.shoulder, curl)) : shU; // Schultergelenk am gebogenen Rumpf
  const knP = add(hipP, mul(dir(aThigh), LEN.thigh));
  const anP = add(knP, mul(dir(aShank), LEN.shank));
  const fd = dir(aFoot), fn = nrm(fd);
  const toeP = add(add(anP, mul(fd, TOE.u)), mul(fn, TOE.w));
  const root = spec.root || 'ankle';
  const rootRel = { hip: hipP, shoulder: shP, knee: knP, ankle: anP, toe: toeP };
  const rp = spec.rootPos ? [num(spec.rootPos[0]), num(spec.rootPos[1])] : (root === 'toe' ? [TOE.u, -2] : [0, root === 'ankle' ? -15 : 0]);
  const off = rootRel[root] ? sub(rp, rootRel[root]) : null; // null: Wurzel ist ein Armgelenk, Verschiebung folgt unten

  if (!target && spec.armWorld && off) target = sub(sub([num(spec.armWorld[0]), num(spec.armWorld[1])], off), shP); // v2.10: Weltziel → relativ zur Schulter
  let armPts = null, ikForearm = null;
  if (spec.armPoints) { // Projizierte Armgeometrie: Ellbogen und Handgelenk relativ zur Schulter (Arme außerhalb der Bildebene)
    const E = [num(spec.armPoints.elbow[0]), num(spec.armPoints.elbow[1])], W = [num(spec.armPoints.wrist[0]), num(spec.armPoints.wrist[1])];
    armPts = { E, W, a: len(E), b: len(sub(W, E)) };
    aU = angOf(unit(E));
    elbow = aU - angOf(unit(sub(W, E)));
    if (elbow > 180) elbow -= 360; if (elbow < -180) elbow += 360;
  } else if (spec.armAt && off) { // gestreckter Arm zeigt auf einen festen Weltpunkt (Stange); Länge bleibt, der Punkt wird bei passendem Abstand genau erreicht
    const B = sub([num(spec.armAt[0]), num(spec.armAt[1])], off);
    aU = angOf(unit(sub(B, shP))); elbow = 0;
  } else if (spec.armPlumb) { aU = 180; } // Arm hängt senkrecht
  else if (Number.isFinite(num(spec.armHang))) { aU = 180 + num(spec.armHang); } // Arm hängt schräg (positiv = Hand hinter der Schulter)
  else if (target) {
    // Zwei-Glieder-IK: Ellbogen so, dass das Handgelenk das Ziel erreicht; elbowSide wählt die Lösung (±).
    const T = target;
    const dT = clamp(len(T), Math.abs(a - b) + 0.5, a + b - 0.5);
    const gammaSh = Math.acos(clamp((a * a + dT * dT - b * b) / (2 * a * dT), -1, 1)) / DEG;
    aU = angOf(unit(T)) + (spec.elbowSide || 1) * gammaSh;
    const E = mul(dir(aU), a), Tc = mul(unit(T), dT);
    const aFdir = angOf(unit(sub(Tc, E)));
    elbow = ((aU - aFdir) % 360 + 540) % 360 - 180; // vorzeichenbehaftet, nur intern
    ikForearm = aFdir;
  } else {
    aU = tu + 180 - g('shoulder');
  }
  const aF = ikForearm !== null ? ikForearm : aU - elbow;
  const shoulderFlex = ((tu + 180 - aU) % 360 + 540) % 360 - 180;
  const aLen = armPts ? armPts.a : a, bLen = armPts ? armPts.b : b;
  const scU = armPts ? armPts.a / LEN.uarm : sc[0], scF = armPts ? armPts.b / LEN.farm : sc[1];

  const elP = add(shP, mul(dir(aU), aLen));
  const wrP = add(elP, mul(dir(aF), bLen));
  const wristDeg = num(spec.wrist) || 0; // v2.21.0: Hand dreht um das Handgelenk zur Unterarm-Normalen
  const handP = add(wrP, mul(dir(aF - wristDeg), LEN.hand));
  const J = { hip: hipP, shoulder: shP, knee: knP, ankle: anP, toe: toeP, elbow: elP, wrist: wrP, hand: handP };
  // Wurzel verschieben
  const offAll = off || sub(rp, J[root]);
  for (const k of Object.keys(J)) J[k] = add(J[k], offAll);

  const fr = (Jp, d, f) => ({ J: Jp, d, n: nrm(d), f: f || 1 });
  const F = {
    trunk: fr(curl ? add(shU, offAll) : J.shoulder, dTrunk), thigh: fr(J.hip, dir(aThigh)), shank: fr(J.knee, dir(aShank)),
    foot: fr(J.ankle, fd), uarm: fr(J.shoulder, dir(aU), scU), farm: fr(J.elbow, dir(aF), scF)
  };
  const angles = { trunk: f1(t), hip: f1(hip), knee: f1(knee), ankle: f1(ankle), shoulder: f1(shoulderFlex), elbow: f1(Math.abs(elbow)) };
  if (curl) { angles.curl = f1(curl); angles.upper = f1(tu); }
  // Segmentwinkel in Spezifikationskonvention (für das Angleichen der Keyframes vor dem Mischen)
  const segAngles = { trunk: t, shank: aShank - 180, knee, hip, ankle, foot: aFoot, armHang: aU - 180, elbow: Math.abs(elbow), curl };

  // Zweites Bein
  if (spec.leg2) {
    const L2 = spec.leg2;
    let a2T, a2S, a2F, kn2, an2;
    if (Array.isArray(L2.ankle)) { // IK: Hüfte → Knöchel-Ziel
      const T = [num(L2.ankle[0]), num(L2.ankle[1])];
      const v = sub(T, J.hip), dT = clamp(len(v), Math.abs(LEN.thigh - LEN.shank) + 0.5, LEN.thigh + LEN.shank - 0.5);
      const gammaHip = Math.acos(clamp((LEN.thigh ** 2 + dT * dT - LEN.shank ** 2) / (2 * LEN.thigh * dT), -1, 1)) / DEG;
      a2T = angOf(unit(v)) - (L2.kneeSide || 1) * gammaHip; // Knie nach vorn (+1)
      const kn = mul(dir(a2T), LEN.thigh), Tc = mul(unit(v), dT);
      a2S = angOf(unit(sub(Tc, kn)));
      const kneeFlex = ((a2S - a2T) % 360 + 540) % 360 - 180;
      a2F = Number.isFinite(num(L2.foot)) ? num(L2.foot) : a2S - 90 - (num(L2.ankleFlex) || 0);
      kn2 = add(J.hip, mul(dir(a2T), LEN.thigh));
      an2 = add(kn2, mul(dir(a2S), LEN.shank));
      angles.hip2 = f1(t + 180 - a2T); angles.knee2 = f1(kneeFlex);
    } else {
      const h2 = num(L2.hip) || 0, k2 = num(L2.knee) || 0, d2 = num(L2.ankle) || 0;
      a2T = t - h2 + 180; a2S = a2T + k2; a2F = a2S - 90 - d2;
      kn2 = add(J.hip, mul(dir(a2T), LEN.thigh));
      an2 = add(kn2, mul(dir(a2S), LEN.shank));
      angles.hip2 = h2; angles.knee2 = k2;
    }
    const fd2 = dir(a2F);
    J.knee2 = kn2; J.ankle2 = an2; J.toe2 = add(add(an2, mul(fd2, TOE.u)), mul(nrm(fd2), TOE.w));
    F.thigh2 = fr(J.hip, dir(a2T)); F.shank2 = fr(kn2, dir(a2S)); F.foot2 = fr(an2, fd2);
  }
  // Zweiter Arm
  if (spec.arm2) {
    const A2 = spec.arm2, aU2 = tu + 180 - (num(A2.shoulder) || 0), aF2 = aU2 - (num(A2.elbow) || 0);
    const el2 = add(J.shoulder, mul(dir(aU2), a)), wr2 = add(el2, mul(dir(aF2), b));
    J.elbow2 = el2; J.wrist2 = wr2; J.hand2 = add(wr2, mul(dir(aF2), LEN.hand));
    F.uarm2 = fr(J.shoulder, dir(aU2), sc[0]); F.farm2 = fr(el2, dir(aF2), sc[1]);
  }
  if (wristDeg) angles.wrist = f1(wristDeg);
  const P = { joints: J, F, angles, segAngles, solved: spec.solved || null, props: {}, scene: [], handFlat: num(spec.handFlat) || 0, handFlat2: num(spec.handFlat2) || 0, headTilt: num(spec.headTilt) || 0, curl, wrist: wristDeg };
  if (typeof spec.props === 'function') {
    const pr = spec.props(P, spec) || {};
    P.props = pr.anchors || {};
    P.scene = pr.scene || [];
  }
  return P;
}

// ---------- Hautmodell ----------
function tf1(P, seg, pt0) {
  const R = REST[baseSeg(seg)], A = P.F[seg];
  const pt = P.curl && baseSeg(seg) === 'trunk' ? bendLocal(pt0, P.curl) : pt0;
  if (P.curl && P.headTilt && baseSeg(seg) === 'trunk' && pt0[1] < -300) { // Kopfneigung am gebogenen Rumpf (in Rumpfkoordinaten, gleiche Drehung)
    const k = clamp((-300 - pt0[1]) / 12, 0, 1), a = P.headTilt * k * DEG, c = bendLocal([-2, -310], P.curl);
    const dx = pt[0] - c[0], dy = pt[1] - c[1];
    return tf1({ ...P, curl: 0, headTilt: 0 }, seg, [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]);
  }
  const v = sub(pt, R.J);
  let u = dot(v, R.d) * A.f, w = dot(v, R.n);
  const hf = seg === 'farm2' ? (P.handFlat2 || P.handFlat) : P.handFlat;
  if (hf && baseSeg(seg) === 'farm' && u > LEN.farm * A.f) { // Hand liegt flach auf (Liegestütz): Handteil quer statt längs
    const extra = u - LEN.farm * A.f;
    u = LEN.farm * A.f; w += hf * extra;
  }
  const out = [A.J[0] + u * A.d[0] + w * A.n[0], A.J[1] + u * A.d[1] + w * A.n[1]];
  // v2.9: Kopfneigung (headTilt, Grad; positiv = Kinn zur Brust). Kopf und Hals oberhalb y = −300 drehen um den Halsansatz.
  if (P.headTilt && baseSeg(seg) === 'trunk' && pt[1] < -300) {
    const k = clamp((-300 - pt[1]) / 12, 0, 1), a = P.headTilt * k * DEG;
    const pv = [-2, -310], c = [A.J[0] + dot(sub(pv, R.J), R.d) * A.f * A.d[0] + dot(sub(pv, R.J), R.n) * A.n[0], A.J[1] + dot(sub(pv, R.J), R.d) * A.f * A.d[1] + dot(sub(pv, R.J), R.n) * A.n[1]];
    const dx = out[0] - c[0], dy = out[1] - c[1];
    return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
  }
  return out;
}
const SHOULDER_BLEND = 0.45;
// Weiche Übergänge an der Hüfte: Gesäß und oberer Oberschenkel folgen teils dem Nachbarsegment.
function blend(seg, pt) {
  const c = (x) => clamp(x, 0, 1);
  const b = baseSeg(seg), two = seg.endsWith('2') ? '2' : '';
  if (b === 'trunk' && pt[1] > -215) return { other: 'thigh' + two, w: c((pt[1] + 215) / 45) * (pt[0] < -4 ? 0.6 : 0.35) };
  if (b === 'thigh' && pt[1] < -150) return { other: 'trunk', w: c((-150 - pt[1]) / 25) * 0.35 };
  // Schulter: Deltamuskel und Schultergelenk folgen beim Armheben teils dem Rumpf (Schulterblatt dreht mit), sonst sitzt der Muskel wie ein Ball am Armansatz.
  if (b === 'uarm' && pt[1] < -262) return { other: 'trunk', w: c((-262 - pt[1]) / 30) * SHOULDER_BLEND };
  return null;
}
export function tf(P, seg, pt, hand = false) {
  if (hand && P.wrist && baseSeg(seg) === 'farm' && P.F[seg]) return wristRot(P, seg, tf1(P, seg, pt));
  const a = tf1(P, seg, pt), bl = blend(seg, pt);
  if (!bl || !bl.w || !P.F[bl.other]) return a;
  const o = tf1(P, bl.other, pt);
  return [a[0] + (o[0] - a[0]) * bl.w, a[1] + (o[1] - a[1]) * bl.w];
}
// v2.21.0: Handgelenk (spec.wrist, Grad): die Hand dreht um das Handgelenk von der Unterarmrichtung zur Unterarm-Normalen (im Stand nach vorn).
// Positiv = Hand zur Normalen; bei Handgelenkcurls mit Unterarm nach vorn ist das „Hand hoch“ (Beugung mit Handfläche oben, Streckung mit Handfläche unten).
function wristRot(P, seg, q) {
  const F = P.F[seg], W = seg === 'farm2' ? P.joints.wrist2 : P.joints.wrist, w = P.wrist * DEG, c = Math.cos(w), s = Math.sin(w);
  const v = sub(q, W), a = dot(v, F.d), b = dot(v, F.n);
  return [W[0] + a * (F.d[0] * c + F.n[0] * s) + b * (F.n[0] * c - F.d[0] * s), W[1] + a * (F.d[1] * c + F.n[1] * s) + b * (F.n[1] * c - F.d[1] * s)];
}
export function anchor(P, key, sex = 'male') {
  if (P.view === 'front') return anchorFront(P, key, sex);
  if (P.props && P.props[key]) return P.props[key].map(f1);
  if (P.joints[key]) return P.joints[key].map(f1);
  const a = anchorDef(sex, key.replace(/2$/, ''));
  if (!a) return null;
  const seg = key.endsWith('2') ? a.seg + '2' : a.seg;
  if (!P.F[seg]) return null;
  return tf(P, seg, a.p).map(f1);
}

// Zeichenebenen: [{ d, cls }] – drei Gruppen, jede als Vereinigung (Rand, dann Füllung) plus Muskeln:
// 1. fernes Bein / ferner Arm, 2. Rumpf mit nahem Bein, 3. naher Arm (liegt vor dem Rumpf).
// roleOf(shapeId) → 'p' | 's' | '' (primär / sekundär / nicht beansprucht).
export function layers(P, roleOf = () => '', sex = 'male') {
  if (P.view === 'front') return layersFront(P, roleOf, sex);
  const out = [];
  const disc = (c, r) => 'M' + f1(c[0] - r) + ' ' + f1(c[1]) + ' a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0 Z';
  const group = (segs, joints, far) => {
    const present = segs.filter((sg) => P.F[sg]);
    if (!present.length) return;
    const shapes = [], hands = [];
    const flat = far ? (P.handFlat2 || P.handFlat) : P.handFlat; // v2.21.0: flache Hand nur beim Stütz, sonst Faust
    for (const sh of shapesFor(sex)) {
      const seg = far ? sh.seg + '2' : sh.seg;
      if (!present.includes(seg)) continue;
      if (sh.hand && (sh.hand === 'open') !== !!flat) continue;
      const d = smooth(sh.pts.map((q) => tf(P, seg, q, !!sh.hand)));
      if (sh.hand && sh.hand !== 'open') hands.push(d); else shapes.push({ sh, d });
    }
    const body = shapes.filter((x) => x.sh.id === 'body').map((x) => x.d).concat(joints.filter((j) => P.joints[j[0]]).map((j) => disc(P.joints[j[0]], j[1])));
    const cls = far ? 'an-body far' : 'an-body';
    for (const d of body) out.push({ d, cls: cls + ' edge' });
    for (const d of body) out.push({ d, cls: cls + ' fill' });
    const handCls = far ? cls : cls + ' hand'; // nahe Hand: Klasse „hand“ – wird über Griffen gezeichnet (sceneSplit)
    const handOut = [];
    for (const d of hands) handOut.push({ d, cls: handCls + ' edge' }, { d, cls: handCls + ' fill' });
    for (const { sh, d } of shapes) {
      if (sh.id === 'body') continue;
      if (sh.id === 'ear') { if (!far) out.push({ d, cls: 'an-ear' }); continue; }
      const role = roleOf(sh.id);
      out.push({ d, cls: 'an-m ' + (role === 'p' ? 'prim' : role === 's' ? 'sec' : 'rest') + (far ? ' far' : '') });
    }
    out.push(...handOut);
  };
  group(['thigh2', 'shank2', 'foot2', 'uarm2', 'farm2'], [['knee2', 12], ['ankle2', 7], ['elbow2', 7]], true);
  group(['trunk', 'thigh', 'shank', 'foot'], [['hip', 15], ['knee', 12], ['ankle', 7]], false);
  group(['uarm', 'farm'], [['shoulder', 11], ['elbow', 7]], false);
  return out;
}

// v2.21.0: Griffpunkte der greifenden Hände (Mitte der Faust) und Aufteilung der vorderen Szene: Teile, die durch die Faust laufen
// (Kurzhantelgriff in der Bildebene, Stange/Griff nahe der Faust, Markierung underHand), liegen unter der Hand; Scheiben, Hantelköpfe
// zum Betrachter und alles andere darüber. Gilt für die nahe Hand (Seite) und beide Hände (vorn, nicht in der Rückansicht).
export function gripPoints(P) {
  const J = P.joints, at = (w, h) => (w && h ? [w[0] + (h[0] - w[0]) * 0.65, w[1] + (h[1] - w[1]) * 0.65] : null);
  if (P.view === 'front') return P.back ? [] : [at(J.wristR, J.handR), at(J.wristL, J.handL)].filter(Boolean);
  return P.handFlat ? [] : [at(J.wrist, J.hand)].filter(Boolean);
}
function distSeg(p, a, b) { const ab = sub(b, a), t = clamp(dot(sub(p, a), ab) / (dot(ab, ab) || 1), 0, 1); return len(sub(p, add(a, mul(ab, t)))); }
export function sceneSplit(scene, grips) {
  const near = (s) => grips.some((g) => (s.type === 'line' ? distSeg(g, s.from, s.to) < 9 : s.type === 'rect' ? g[0] > s.x - 6 && g[0] < s.x + s.w + 6 && g[1] > s.y - 6 && g[1] < s.y + s.h + 6 : false));
  const under = [], over = [];
  for (const s of scene) (s.underHand || (s.type === 'db' && !s.endOn) || ((s.type === 'line' || s.type === 'rect') && near(s)) ? under : over).push(s);
  return { under, over };
}

// ---------- Zeitachse ----------
// phases: [{ a, b, dur, label, kp }] – von Keyframe a nach b (a === b: halten), kp = aktive Kernpunkte (Indizes).
const ease = (u) => (1 - Math.cos(Math.PI * u)) / 2;
// v2.14.1: optional phases[].ease – 'in' (aus der Ruhe anfahren, am Ende mit Tempo), 'none' (gleichmäßig), 'out' (mit Tempo starten, sanft stoppen).
// Aufeinanderfolgende Phasen mit in → none → out ergeben eine Bewegung ohne Stopp an den Zwischenbildern (Sit-up).
const EASES = { in: (u) => 1 - Math.cos((Math.PI * u) / 2), none: (u) => u, out: (u) => Math.sin((Math.PI * u) / 2) };
export function cycleLength(phases) { return phases.reduce((s, p) => s + p.dur, 0); }
// v2.15.0: Bewegungsketten. Folgen mehrere Bewegungsphasen ohne Umkehr aufeinander (a → b → c, z. B. Schritt → Aufsetzen → Absenken),
// bremste bisher jede Phase an ihrem Zwischenbild auf null ab. In einer Kette behält jede Phase ihre Dauer; der Verlauf in der Phase ist
// eine kubische Hermite-Kurve, deren Steigung am Zwischenbild aus den mittleren Geschwindigkeiten der beiden Nachbarphasen folgt
// (Weg der Gelenke ÷ Dauer, geometrisches Mittel). So läuft die Bewegung ohne Stopp und ohne Geschwindigkeitssprung durch das Zwischenbild;
// Anfang und Ende der Kette starten und stoppen weich (Steigung 0). Ohne frames (phaseAt allein) gilt der Weg als proportional zur Dauer.
// Halten (a === b), Umkehr (c === a), eine Phase mit eigenem ease oder flow: false beenden die Kette.
const RUNS = new WeakMap();
function pathLen(frames, a, b) {
  const A = solvePose(frames[a].pose).joints, B = solvePose(frames[b].pose).joints;
  let s = 0;
  for (const k of Object.keys(A)) if (Array.isArray(A[k]) && Array.isArray(B[k])) s += Math.hypot(B[k][0] - A[k][0], B[k][1] - A[k][1]);
  return s;
}
function runsOf(phases, frames) {
  const key = frames || phases;
  let byPh = RUNS.get(key);
  if (!byPh) { byPh = new WeakMap(); RUNS.set(key, byPh); }
  let r = byPh.get(phases);
  if (r) return r;
  r = phases.map(() => null);
  const moving = (p) => p.a !== p.b && !p.ease && p.flow !== false;
  for (let i = 0; i < phases.length; ) {
    let j = i;
    while (j + 1 < phases.length && moving(phases[j]) && moving(phases[j + 1]) && phases[j + 1].a === phases[j].b && phases[j + 1].b !== phases[j].a) j++;
    if (j > i) {
      const rate = [];
      for (let k = i; k <= j; k++) rate.push((frames ? Math.max(pathLen(frames, phases[k].a, phases[k].b), 1e-3) : phases[k].dur) / phases[k].dur);
      const at = (n) => (n <= 0 || n >= rate.length ? 0 : Math.sqrt(rate[n - 1] * rate[n])); // Geschwindigkeit an der Grenze vor Teilstück n
      for (let k = i; k <= j; k++) {
        const n = k - i;
        r[k] = { m0: Math.min(3, at(n) / rate[n]), m1: Math.min(3, at(n + 1) / rate[n]) };
      }
    }
    i = j + 1;
  }
  byPh.set(phases, r);
  return r;
}
const hermite = (t, m0, m1) => { const t2 = t * t, t3 = t2 * t; return (t3 - 2 * t2 + t) * m0 + (3 * t2 - 2 * t3) + (t3 - t2) * m1; };
export function phaseAt(phases, t, frames) {
  const T = cycleLength(phases);
  let x = ((t % T) + T) % T;
  const runs = runsOf(phases, frames);
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (x < p.dur || i === phases.length - 1) {
      const v = clamp(x / p.dur, 0, 1), R = runs[i];
      const u = p.a === p.b ? 0 : R ? clamp(hermite(v, R.m0, R.m1), 0, 1) : (EASES[p.ease] || ease)(v);
      return { index: i, a: p.a, b: p.b, u, label: p.label, kp: p.kp || [] };
    }
    x -= p.dur;
  }
  return { index: 0, a: 0, b: 0, u: 0, label: phases[0].label, kp: [] };
}
// Keyframe-Spezifikationen linear mischen (Zahlen, Messwerte, Arrays, Unterobjekte); Funktionen und Strings kommen vom Ziel.
export function mixSpec(A, B, u) {
  if (u <= 0) return A;
  if (u >= 1) return B;
  const na = num(A), nb = num(B);
  if (typeof na === 'number' && typeof nb === 'number') return na + (nb - na) * u;
  if (Array.isArray(A) && Array.isArray(B)) return A.map((x, i) => mixSpec(x, B[i], u));
  if (A && B && typeof A === 'object' && typeof B === 'object' && !Array.isArray(A)) {
    const out = {};
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) out[k] = k in A && k in B ? mixSpec(A[k], B[k], u) : (k in B ? B[k] : A[k]);
    return out;
  }
  return B;
}
// Keyframes einmal lösen und angleichen, damit die Überblendung nur noch mischt:
// 1. Der gelöste Parameter wird zur Zahl (Lesart 'ik').
// 2. Alle Keyframes eines Satzes bekommen dieselben Winkelschlüssel. mixSpec behält einen Schlüssel, den nur ein Keyframe hat,
//    bis zum Ende der Phase unverändert – beim Kreuzheben blieb so der gelöste Rumpf stehen und sprang am Phasenende (v2.0.0–2.0.2).
//    Fehlende Werte kommen als Zahlen (ohne Herkunft) aus der gelösten Pose; die Beinkette ist in den Winkeln linear, deshalb
//    ändert das Angleichen die Keyframes nicht und die Zwischenbilder nur dort, wo vorher ein Sprung war.
const LEG_KEYS = ['trunk', 'shank', 'knee', 'hip', 'ankle'];
const isSet = (x) => x !== undefined && x !== null && Number.isFinite(num(x));
export function resolveFrames(frames) {
  if (frames.some((f) => f.pose.view === 'front')) return frames.map((f) => ({ ...f, pose: { ...f.pose, solve: null } })); // Frontansicht: gleiche Schlüssel je Satz, kein Löser
  const out = frames.map((f) => {
    const P = solvePose(f.pose);
    const pose = { ...f.pose, solve: null };
    if (P.solved) {
      pose[P.solved.param] = { v: P.solved.value, src: [], read: 'ik', raw: `so gelöst, dass ${f.pose.solve.joint}${f.pose.solve.at ? ' den Abstand zur Stange hält' : ' auf Höhe ' + num(f.pose.solve.y)}` };
      if (P.solved.param === 'trunk') pose.hip = { v: P.angles.hip, src: [], read: 'ik', raw: 'Rumpf–Oberschenkel, folgt aus der Rumpfneigung' };
    }
    return { ...f, pose, P };
  });
  const any = (k) => out.some((f) => isSet(f.pose[k]) || (k === 'armHang' && f.pose.armPlumb));
  const fillFoot = any('foot'), fillCurl = any('curl'), fillScale = out.some((f) => f.pose.armScale);
  // v2.15.0: zweites Bein in beiden Formen (Winkel { hip, knee, ankle } und Ziel { ankle: [x, y], foot }) innerhalb eines Satzes – die Mischung
  // beider Formen sprang am Keyframe (Ausfallschritt vorwärts: ≈ 5 Einheiten beim Aufsetzen). Winkelform wird in die Zielform umgerechnet.
  if (out.some((f) => f.pose.leg2 && Array.isArray(f.pose.leg2.ankle)) && out.some((f) => f.pose.leg2 && !Array.isArray(f.pose.leg2.ankle))) {
    for (const f of out) {
      if (!f.pose.leg2 || Array.isArray(f.pose.leg2.ankle)) continue;
      const fd = f.P.F.foot2.d;
      f.pose.leg2 = { ankle: f.P.joints.ankle2.map(f1), foot: f1(angOf(fd)) };
    }
  }
  const hangArm = any('armHang') && !out.some((f) => f.pose.armPoints || f.pose.armTarget || f.pose.armTargetTrunk || f.pose.armAt);
  for (const f of out) {
    const S = f.P.segAngles;
    for (const k of LEG_KEYS) if (!isSet(f.pose[k])) f.pose[k] = f1(S[k]);
    if (fillFoot && !isSet(f.pose.foot)) f.pose.foot = f1(S.foot);
    if (fillCurl && !isSet(f.pose.curl)) f.pose.curl = 0;
    if (fillScale && !f.pose.armScale) f.pose.armScale = [1, 1]; // v2.14.1: armScale nur in einem Keyframe → Arm sprang am Phasenende (Langhantelrudern)
    if (hangArm) { // armPlumb ≙ armHang 0; beide Formen mischen sich dann als Zahl
      if (f.pose.armPlumb) { delete f.pose.armPlumb; if (!isSet(f.pose.armHang)) f.pose.armHang = 0; }
      if (!isSet(f.pose.elbow)) f.pose.elbow = f1(S.elbow);
    }
    delete f.P;
  }
  return out;
}
export function poseAt(frames, phases, t) {
  const ph = phaseAt(phases, t, frames);
  const spec = mixSpec(frames[ph.a].pose, frames[ph.b].pose, ph.u);
  return { pose: solvePose(spec), phase: ph };
}
