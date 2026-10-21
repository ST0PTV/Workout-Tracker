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
//   legs: { hip, knee, abdR, abdL } – Beugung in der Sagittalebene (nur als Verkürzung sichtbar); abdR/abdL (v2.16) Abspreizen je Bein;
//   legs: { thighDir, shankDir, thighF, shankF } (v2.18) – Richtung und Verkürzung je Segment frei gesetzt; legsFront: Beine vor dem Rumpf zeichnen;
//   legs: { thighDirL, shankDirL, thighFL, shankFL } (v2.19) – dasselbe nur für das linke Bein (überschreibt die gemeinsamen Werte);
//   frontLeg: 'R' (v2.19) – rechtes Bein über dem linken zeichnen (Bein kreuzt vor dem Standbein);
//   legs: { planted: true, stance, toeOut, knee, shank } (v2.9) – Füße stehen am Boden (Knöchelmitte bei x = ±stance),
//        das Bein liegt in einer um toeOut nach außen gedrehten Ebene (Knie folgt der Fußrichtung). knee = Kniebeugung,
//        shank = Schienbeinneigung in dieser Ebene; Becken- und Kniehöhe folgen aus der Geometrie (räumlich gelöst, dann projiziert);
//   shrug (v2.20) – Hebung des Schultergürtels (Einheiten nach oben): Schultergelenke und Arme steigen, die Rumpfkontur an den Schultern
//        (Trapez, Schulterlinie) folgt mit einem Übergang zum Hals und zur Brust; Kopf und Hals bleiben. 0 = unverändert;
//   trunkFlex – Vorneigung des Rumpfs in der Sagittalebene (v2.9); in der Frontansicht als Verkürzung bis zur Schulter, Kopf bleibt unverzerrt;
//   props(P, spec) → { anchors, scene } wie in der Seitenansicht.
import { LEN, smooth, num, f1 } from './motion.js';
import { femaleFront, ANCHORS_F_FEMALE } from './motion-female.js';

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
// e: Abstand über der Schulter entlang des Rumpfs. Hals (bis zum Kinn) wird mit dem Rumpf verkürzt (bis v2.14: bis NECK_F). v2.15.0: Der Kopf wird als Ganzes so verschoben,
// dass seine Mitte (HEAD_C) ebenfalls verkürzt erscheint (bleibt dabei unverzerrt). Vorher saß der Kopf bei starker Vorneigung in voller Höhe
// auf dem kurzen Rumpf – die Figur wirkte wie ein aufrechter, gestauchter Oberkörper (vorgebeugtes Seitheben). Jetzt liegt der Kopf vor dem
// oberen Rücken, wie man ihn von vorn sieht. Bei aufrechtem Rumpf (f = 1) unverändert.
const HEAD_C = 49, CHIN_E = 26; // Kopfmitte (y −336) und Kinn (y −313) über der Schulter (y −287)
const neckFold = (e, f) => (f >= 1 ? e : e < CHIN_E ? e * f : e - HEAD_C + HEAD_C * f);
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
  { seg: 'thigh', id: 'adductors', both: true, pts: [[5, -177], [12, -173], [14, -152], [11, -128], [7, -117], [5, -138], [4, -160]] }, // v2.9: Innenseite, Zeichenkonvention
  { seg: 'thigh', id: 'abductors', both: true, pts: [[23, -183], [28, -184], [32, -168], [31.5, -152], [29, -146], [27, -158], [24.5, -172]] }, // v2.19.0: Außenseite oben (mittlerer Gesäßmuskel/Spanner der Oberschenkelfaszie), Zeichenkonvention
  { seg: 'shank', id: 'body', both: true, pts: [[6, -96], [21, -96], [22, -80], [19, -50], [18, -25], [17, -14], [9, -14], [8, -28], [6, -55], [5, -78]] },
  { seg: 'foot', id: 'body', both: true, pts: [[6, -16], [21, -16], [23, -6], [20, 0], [8, 0], [5, -8]] },
  { seg: 'uarm', id: 'body', both: true, pts: [[28, -296], [38, -300], [48, -294], [52, -282], [50, -262], [49, -240], [48, -222], [43, -212], [37, -220], [35, -240], [31, -262], [28, -280]] },
  { seg: 'uarm', id: 'delts', both: true, pts: [[28, -296], [38, -300], [48, -294], [52, -282], [50, -266], [42, -258], [32, -262], [28, -278]] },
  { seg: 'uarm', id: 'biceps', both: true, pts: [[34, -258], [44, -256], [47, -240], [45, -226], [38, -224], [34, -238]] },
  // v2.21.0: Unterarm bis zum Handgelenk, Hand als Faust mit Daumen (innen) – greift Griffe und Stangen; Zeichenkonvention.
  { seg: 'farm', id: 'body', both: true, pts: [[36, -222], [50, -222], [53, -205], [52, -185], [50, -171], [46, -167], [41, -171], [40, -180], [37, -200]] },
  { seg: 'farm', id: 'body', both: true, hand: 'fist', pts: [[40, -173], [51, -173], [53.5, -165], [53.5, -155], [50.5, -148.5], [45.5, -146.5], [40.5, -148.5], [38, -155], [38, -165]] },
  { seg: 'farm', id: 'body', both: true, hand: 'thumb', pts: [[37, -169], [41, -166], [42, -159], [39, -155], [36, -158], [35.5, -164]] },
  { seg: 'farm', id: 'forearms', both: true, pts: [[37, -220], [49, -220], [52, -204], [48, -190], [40, -192], [37, -206]] }
];
// v2.20.0: Rückansicht (spec.back): gleiche Gelenke und Umrisse wie vorn, Muskeln der Rückseite; Arme werden hinter dem Rumpf gezeichnet
// (was vor dem Körper liegt, verdeckt der Rücken). Formen in Standkoordinaten der rechten Seite (von hinten gesehen gespiegelt, die Figur ist
// symmetrisch). Zeichenkonvention.
const BACK_MUSCLES = [
  { seg: 'trunk', id: 'upper-back', mid: true, pts: [[0, -316], [9, -314], [22, -303], [37, -293], [24, -281], [12, -263], [4, -238], [0, -230]] },
  { seg: 'trunk', id: 'lats', both: true, pts: [[13, -266], [27, -276], [39, -268], [39, -248], [33, -229], [23, -213], [11, -207], [6, -223], [9, -246]] },
  { seg: 'trunk', id: 'lower-back', mid: true, pts: [[4, -224], [11, -212], [12, -196], [8, -186], [0, -184]] },
  { seg: 'thigh', id: 'glutes', both: true, pts: [[4, -181], [28, -183], [33, -168], [29, -154], [15, -150], [5, -158]] },
  { seg: 'thigh', id: 'hamstrings', both: true, pts: [[8, -148], [27, -148], [27, -122], [21, -102], [12, -102], [8, -124]] },
  { seg: 'shank', id: 'calves', both: true, pts: [[6, -92], [21, -92], [22, -75], [18, -55], [11, -52], [7, -70]] }
];
// v2.10: Beine in der Frontansicht breiter (vorher wirkten sie neben dem Rumpf zu schmal, v. a. bei weitem Stand).
// Oberschenkel oben ≈ 41 Einheiten (≈ 20 cm), Unterschenkel ≈ 24 (≈ 12 cm) statt 28 und 16 – Zeichenkonvention, keine Messung.
const LEG_WIDEN = { thigh: [17, 1.45], shank: [13.5, 1.5], foot: [14, 1.2] }; // [Mittellinie x, Faktor]
for (const sh of SHAPES_F) { const w = LEG_WIDEN[sh.seg]; if (w) sh.pts = sh.pts.map(([x, y]) => [w[0] + (x - w[0]) * w[1], y]); }
for (const sh of BACK_MUSCLES) { const w = LEG_WIDEN[sh.seg]; if (w) sh.pts = sh.pts.map(([x, y]) => [w[0] + (x - w[0]) * w[1], y]); }
// v2.5.0: weibliche Formen (js/motion-female.js); Gelenke wie oben.
let SHAPES_F_FEMALE = null;
export const shapesForF = (sex) => (sex === 'female' ? (SHAPES_F_FEMALE ??= femaleFront(SHAPES_F)) : SHAPES_F);
// Rückansicht: Umriss, Kopf, Schulter und Unterarm wie vorn (je Geschlecht), Bizeps-Fläche wird zum Trizeps, dazu die Rückenmuskeln.
// Weibliche Figur: Rumpfmuskeln auf die schmalere Kontur gestaucht (Faktor 0,88).
const SHAPES_B = {};
export function shapesForB(sex) {
  if (SHAPES_B[sex]) return SHAPES_B[sex];
  const F = shapesForF(sex), k = sex === 'female' ? 0.88 : 1;
  const own = F.filter((sh) => sh.id === 'body' || sh.id === 'delts' || sh.id === 'forearms');
  const tri = F.filter((sh) => sh.id === 'biceps').map((sh) => ({ ...sh, id: 'triceps' }));
  const back = BACK_MUSCLES.map((sh) => (sh.seg === 'trunk' && k !== 1 ? { ...sh, pts: sh.pts.map(([x, y]) => [x * k, y]) } : sh));
  return (SHAPES_B[sex] = [...own, ...back, ...tri]);
}
export const MUSCLE_SHAPE_B = { 'front-delts': 'delts', 'side-delts': 'delts', 'rear-delts': 'delts', lats: 'lats', 'upper-back': 'upper-back', 'lower-back': 'lower-back', triceps: 'triceps', forearms: 'forearms', glutes: 'glutes', hamstrings: 'hamstrings', calves: 'calves' };
export const HIDDEN_MUSCLES_B = ['chest', 'biceps', 'abs', 'obliques', 'quads', 'adductors', 'abductors', 'hip-flexors'];
export const MUSCLE_SHAPE_F = { chest: 'chest', 'front-delts': 'delts', 'side-delts': 'delts', 'rear-delts': 'delts', lats: 'lats', 'upper-back': 'upper-back', biceps: 'biceps', forearms: 'forearms', abs: 'abs', obliques: 'obliques', quads: 'quads', adductors: 'adductors', abductors: 'abductors' };
export const HIDDEN_MUSCLES_F = ['triceps', 'lower-back', 'glutes', 'hamstrings', 'calves', 'hip-flexors'];
export const ANCHORS_F = {
  head: { seg: 'trunk', p: [0, -358] }, chin: { seg: 'trunk', p: [0, -313] }, neck: { seg: 'trunk', p: [9, -312] }, chest: { seg: 'trunk', p: [0, -268] },
  belly: { seg: 'trunk', p: [0, -210] }, hip: { seg: 'trunk', p: [30, -186] }, shoulder: { seg: 'uarm', p: [48, -294] }, uarm: { seg: 'uarm', p: [50, -250] },
  elbow: { seg: 'farm', p: [52, -215] }, farm: { seg: 'farm', p: [52, -190] }, wrist: { seg: 'farm', p: [50, -166] }, hand: { seg: 'farm', p: [49, -150] },
  upperBack: { seg: 'trunk', p: [0, -280] }, midBack: { seg: 'trunk', p: [0, -235] }, lats: { seg: 'trunk', p: [34, -248] }, // v2.20.0: Rückansicht
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

// Stehendes Bein räumlich lösen (rechte Seite, Ursprung Becken, y nach unten, z nach vorn) und in die Frontalebene projizieren.
// Ebene des Beins: um toeOut nach außen gedreht; darin Schienbein (shank) und Oberschenkel wie in der Seitenansicht.
// Der Abstand Hüfte–Knöchel folgt aus der Kniebeugung; die seitliche Lage aus Hüftbreite und Stand. Zeichenmodell, keine Messung.
export function plantedLegs(legs) {
  const knee = num(legs.knee) || 0, s = num(legs.shank) || 0, th = (num(legs.toeOut) || 0) * DEG;
  const ax = Number.isFinite(num(legs.stance)) ? num(legs.stance) : J0F.ankle[0];
  const t = knee - s; // Oberschenkelneigung zur Senkrechten in der Beinebene
  // Ebene: Knöchel (0,0), vorn = +w, oben = −y
  const kw = LEN.shank * Math.sin(s * DEG), ky = -LEN.shank * Math.cos(s * DEG);
  const hw = kw - LEN.thigh * Math.sin(t * DEG), hy = ky - LEN.thigh * Math.cos(t * DEG);
  const D = Math.hypot(hw, hy);
  // Die Beinebene dreht um die Senkrechte, bis der Knöchel seitlich unter dem Stand liegt; reicht der waagerechte Abstand
  // in der Ebene nicht (fast gestreckt), kippt das Bein in der Frontalebene (Abduktion). Höhe und Länge bleiben wie in der Ebene.
  const hx = J0F.hip[0] - J0F.pelvis[0], dx = hx - ax;
  let dz, dy;
  if (hw * hw >= dx * dx) { dz = -Math.sqrt(hw * hw - dx * dx); dy = hy; } else { dz = 0; dy = -Math.sqrt(Math.max(D * D - dx * dx, 1)); }
  const A3 = [ax, 0, 0], H3 = [hx, dy, dz]; // Knöchel auf Höhe 0 (relativ), Hüfte darüber
  const u = (() => { const v = [A3[0] - H3[0], A3[1] - H3[1], A3[2] - H3[2]], l = Math.hypot(...v); return v.map((c) => c / l); })();
  // Beugerichtung des Knies: waagerecht von der Hüfte zum Knöchel (das Bein bleibt eben, Knie über dem Fuß), bei fast
  // gestrecktem Bein zusätzlich in Fußrichtung (toeOut), damit die Richtung stetig bleibt.
  const hor = [A3[0] - H3[0], 0, A3[2] - H3[2]], fd = [Math.sin(th), 0, Math.cos(th)];
  const fwd = [hor[0] + 5 * fd[0], 0, hor[2] + 5 * fd[2]], k = fwd[0] * u[0] + fwd[1] * u[1] + fwd[2] * u[2];
  let v = [fwd[0] - k * u[0], fwd[1] - k * u[1], fwd[2] - k * u[2]]; const lv = Math.hypot(...v) || 1; v = v.map((c) => c / lv);
  const a = (LEN.thigh ** 2 - LEN.shank ** 2 + D * D) / (2 * D), h = Math.sqrt(Math.max(LEN.thigh ** 2 - a * a, 0));
  const K3 = [0, 1, 2].map((i) => H3[i] + u[i] * a + v[i] * h);
  const ankleY = J0F.ankle[1]; // Knöchel 15 über dem Boden
  const pelvisY = ankleY + dy; // Becken über dem Knöchel (dy < 0)
  const leg = { hip: [hx, 0], knee: [K3[0], K3[1] - dy], ankle: [ax, -dy] };
  const thigh3 = [K3[0] - H3[0], K3[1] - H3[1], K3[2] - H3[2]];
  const hipAbd = Math.asin(Math.max(-1, Math.min(1, thigh3[0] / LEN.thigh))) / DEG; // Winkel des Oberschenkels zur Sagittalebene (≈ Abduktion)
  const hipFlex = Math.acos(Math.max(-1, Math.min(1, thigh3[1] / LEN.thigh))) / DEG; // Winkel zur Senkrechten
  return { pelvisY, leg, hipAbd, hipFlex, thighFront: Math.atan2(thigh3[0], thigh3[1]) / DEG, D };
}

// Pose in der Frontansicht lösen. Rückgabe wie solvePose: { view, joints, F, angles, scene, props }.
export function solveFront(spec) {
  const g = (k, d = 0) => { const x = num(spec[k]); return Number.isFinite(x) ? x : d; };
  const lean = g('trunk'); // Rumpfneigung in der Frontalebene (nach rechts positiv), meist 0
  const tUp = fdir(180 + lean);
  const shrug = g('shrug'); // v2.20.0: Schulterhebung (Einheiten)
  const flex = g('trunkFlex'), tScale = Math.max(Math.cos(flex * DEG), MIN_SCALE);
  // Rumpf relativ zum Beckenmittelpunkt
  const pelvis = [0, 0];
  const shC = add(pelvis, mul(tUp, LEN.trunk * tScale));
  const sides = { R: 1, L: -1 };
  const J = { pelvis };
  const F = {};
  const fr = (Jp, d, f = 1) => ({ J: Jp, d, n: nrm(d), f });
  F.trunk = fr(pelvis, tUp, tScale); // Rumpfrahmen: Ursprung Becken, Richtung vom Becken zur Schulter
  // Beine: Beugung in der Sagittalebene erscheint als Verkürzung
  const legs = spec.legs || {};
  const hipF = num(legs.hip) || 0, kneeF = num(legs.knee) || 0;
  const thighScale = Math.max(Math.cos(hipF * DEG), MIN_SCALE), shankScale = Math.max(Math.cos((hipF - kneeF) * DEG), MIN_SCALE);
  const stance = num(legs.stance); // Fußabstand relativ zum Stand (± Einheiten je Seite), Konvention
  const planted = legs.planted ? plantedLegs(legs) : null;
  for (const [s, sg] of Object.entries(sides)) {
    if (planted) {
      const L = planted.leg, m = (p) => [sg * p[0], p[1]];
      const hip = add(pelvis, m(L.hip)), knee = add(pelvis, m(L.knee)), ankle = add(pelvis, m(L.ankle));
      const dT = unit(sub(knee, hip)), dS = unit(sub(ankle, knee));
      J['hip' + s] = hip; J['knee' + s] = knee; J['ankle' + s] = ankle;
      F['thigh' + s] = fr(hip, dT, Math.max(Math.hypot(...sub(knee, hip)) / LEN.thigh, MIN_SCALE));
      F['shank' + s] = fr(knee, dS, Math.max(Math.hypot(...sub(ankle, knee)) / LEN.shank, MIN_SCALE));
      F['foot' + s] = fr(ankle, [0, 1], 1);
      continue;
    }
    const hip = add(pelvis, [sg * (J0F.hip[0] - J0F.pelvis[0]), 0]);
    let dT = unit([sg * (J0F.knee[0] - J0F.hip[0]) + sg * (Number.isFinite(stance) ? stance : 0) * 0.5, J0F.knee[1] - J0F.hip[1]]);
    let dS = unit([sg * (Number.isFinite(stance) ? stance : 0) * 0.5, J0F.ankle[1] - J0F.knee[1]]);
    // v2.16.0: legs.abdR / legs.abdL – Abspreizen eines Beins in der Frontalebene (Grad, nach außen positiv), z. B. unteres Bein beim Copenhagen Plank
    const abdLeg = num(legs['abd' + s]) || 0;
    if (abdLeg) { const a = -sg * abdLeg * DEG, c = Math.cos(a), si = Math.sin(a), rt = (v) => [v[0] * c - v[1] * si, v[0] * si + v[1] * c]; dT = rt(dT); dS = rt(dS); }
    // v2.18.0: legs.thighDir / legs.shankDir – Richtung im Bild (Grad wie fdir: 0 = nach unten, 180 = nach oben, positiv nach außen) und
    // legs.thighF / legs.shankF – Verkürzung (Projektionsfaktor), z. B. Sitz mit angehobenen Knien (Russian Twist). Ohne Angabe unverändert.
    const own = (k) => (s === 'L' && Number.isFinite(num(legs[k + 'L'])) ? num(legs[k + 'L']) : num(legs[k])); // v2.19.0: eigene Werte fürs linke Bein
    const tDir = own('thighDir'), sDir = own('shankDir'), tF = own('thighF'), sF = own('shankF');
    if (Number.isFinite(tDir)) dT = [sg * Math.sin(tDir * DEG), Math.cos(tDir * DEG)];
    if (Number.isFinite(sDir)) dS = [sg * Math.sin(sDir * DEG), Math.cos(sDir * DEG)];
    const tSc = Number.isFinite(tF) ? Math.max(tF, MIN_SCALE) : thighScale, sSc = Number.isFinite(sF) ? Math.max(sF, MIN_SCALE) : shankScale;
    const knee = add(hip, mul(dT, LEN.thigh * tSc));
    const ankle = add(knee, mul(dS, LEN.shank * sSc));
    J['hip' + s] = hip; J['knee' + s] = knee; J['ankle' + s] = ankle;
    F['thigh' + s] = fr(hip, dT, tSc); F['shank' + s] = fr(knee, dS, sSc); F['foot' + s] = fr(ankle, [0, 1], sSc);
  }
  // Arme (symmetrisch; rechte Seite als Vorlage, linke gespiegelt)
  const armsOf = (side) => {
    const sg = sides[side];
    const sh = add(shC, [sg * J0F.shoulder[0], -shrug]);
    let E, W, sU = 1, sF = 1;
    const own = side === 'L' && spec.armL ? spec.armL : null; // v2.11: linker Arm getrennt (einarmige Übungen); gleiche Form wie arm / armPoints
    const pts = own ? own.points : spec.armPoints;
    if (pts) {
      const e = pts.elbow, w = pts.wrist;
      E = add(sh, [sg * num(e[0]), num(e[1])]); W = add(sh, [sg * num(w[0]), num(w[1])]);
      sU = Math.hypot(num(e[0]), num(e[1])) / LEN.uarm; sF = Math.hypot(num(w[0]) - num(e[0]), num(w[1]) - num(e[1])) / LEN.farm;
    } else {
      const arm = own || spec.arm || {};
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
  J.chin = add(shC, mul(tUp, neckFold(26, tScale))); J.head = add(shC, mul(tUp, neckFold(71, tScale)));
  J.toe = add(J.ankleR, [0, 13]); J.toe2 = add(J.ankleL, [0, 13]); // Sohle wie in der Seitenansicht 2 Einheiten über dem Boden
  // v2.12: Drehung der ganzen Figur in der Bildebene (Grad, um den Ursprung) – z. B. −90° für den Blick von oben auf eine liegende Figur
  // (Kopf links). Gelenke und Segmentrahmen drehen mit, daher folgen Formen und Anker; die Winkelangaben bleiben die der Figur.
  const rotDeg = num(spec.rotate) || 0;
  if (rotDeg) {
    const c = Math.cos(rotDeg * DEG), s = Math.sin(rotDeg * DEG), rot = (p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
    for (const k of Object.keys(J)) J[k] = rot(J[k]);
    for (const k of Object.keys(F)) F[k] = { ...F[k], J: rot(F[k].J), d: rot(F[k].d), n: rot(F[k].n) };
  }
  // Wurzel verschieben
  const root = spec.root || 'pelvis';
  const rp = spec.rootPos ? [num(spec.rootPos[0]), num(spec.rootPos[1])] : [0, planted ? planted.pelvisY : J0F.pelvis[1]];
  const off = sub(rp, J[root] || J.pelvis);
  for (const k of Object.keys(J)) J[k] = add(J[k], off);
  for (const k of Object.keys(F)) F[k] = { ...F[k], J: add(F[k].J, off) };
  const A = armsOf('R');
  const abdDeg = Math.atan2(A.dU[0], A.dU[1]) / DEG; // 0 = hängend, 90 = waagerecht, 180 = oben
  const elbowDeg = Math.acos(Math.max(-1, Math.min(1, dot(A.dU, A.dF)))) / DEG;
  const angles = { trunk: f1(lean), abd: f1(abdDeg), elbow: f1(elbowDeg), hip: f1(planted ? planted.hipFlex : hipF), knee: f1(planted ? num(legs.knee) : kneeF) };
  if (shrug) angles.shrug = f1(shrug);
  if (planted) { angles.hipAbd = f1(planted.hipAbd); angles.thighFront = f1(planted.thighFront); angles.trunkFlex = f1(flex); }
  const P = { view: 'front', joints: J, F, angles, segAngles: {}, solved: null, props: {}, scene: [], handFlat: 0, legsFront: !!spec.legsFront, frontLeg: spec.frontLeg || null, shrug, back: !!spec.back }; // v2.18.0: legsFront – Beine vor dem Rumpf zeichnen (Knie zeigen zum Betrachter)
  if (typeof spec.props === 'function') {
    const pr = spec.props(P, spec) || {};
    P.props = pr.anchors || {};
    P.scene = pr.scene || [];
  }
  return P;
}

// Punkt eines Segments (Standkoordinaten der rechten Seite) in die Pose abbilden; side 'L' spiegelt die Ruhelage.
// v2.20.0: Gewicht der Schulterhebung für einen Rumpfpunkt (Standkoordinaten, rechte Seite): außen an der Schulterlinie 1, zum Hals (|x| < 10),
// zur Brust (y > −255) und zum Kopf (y < −318) auf 0. Zeichenkonvention.
export function shrugWeight(pt) {
  const x = Math.abs(pt[0]), y = pt[1];
  const wx = Math.max(0, Math.min(1, (x - 10) / 20));
  const wy = y >= -255 ? 0 : y > -285 ? (-255 - y) / 30 : y >= -305 ? 1 : y > -318 ? (y + 318) / 13 : 0;
  return wx * wy;
}
function tfF(P, seg, side, pt0) {
  const R = RESTF[seg], A = P.F[seg + (seg === 'trunk' ? '' : side)];
  const pt = P.shrug && seg === 'trunk' ? [pt0[0], pt0[1] - P.shrug * shrugWeight(pt0)] : pt0;
  const pRest = side === 'L' ? mirror(pt) : pt;
  const JRest = side === 'L' ? mirror(R.J) : R.J, dRest = side === 'L' ? [-R.d[0], R.d[1]] : R.d;
  const nRest = nrm(dRest);
  const v = sub(pRest, JRest);
  const ur = dot(v, dRest), f = A.f || 1, w = dot(v, nRest);
  // v2.11: Bei Vorneigung zeigt der Hals zum Betrachter – der Halsbereich bis zum Kinn wird mit dem Rumpf verkürzt,
  // der Kopf darüber nur verschoben (bleibt unverzerrt) und sinkt so zur Schulterlinie.
  const u = seg === 'trunk' && f !== 1 ? Math.min(ur, LEN.trunk) * f + neckFold(Math.max(0, ur - LEN.trunk), f) : ur * f;
  return [A.J[0] + u * A.d[0] + w * A.n[0], A.J[1] + u * A.d[1] + w * A.n[1]];
}
// Schulter: Deltamuskel und Armansatz folgen beim Armheben teils dem Rumpf (Schulterblatt dreht mit), wie in der Seitenansicht (motion.js).
const SHOULDER_BLEND_F = 0.45;
function tfFS(P, seg, side, pt) {
  const a = tfF(P, seg, side, pt);
  if (seg !== 'uarm' || pt[1] >= -262) return a;
  const w = Math.min(1, (-262 - pt[1]) / 30) * SHOULDER_BLEND_F;
  const o = tfF(P, 'trunk', side, pt);
  return [a[0] + (o[0] - a[0]) * w, a[1] + (o[1] - a[1]) * w];
}
export function anchorFront(P, key, sex = 'male') {
  if (P.props && P.props[key]) return P.props[key].map(f1);
  const side = key.endsWith('L') ? 'L' : 'R';
  const base = key.replace(/[LR]$/, '');
  if (P.joints[key]) return P.joints[key].map(f1);
  const a = (sex === 'female' && ANCHORS_F_FEMALE[base]) || ANCHORS_F[base];
  if (!a) return null;
  return tfF(P, a.seg, side, a.p).map(f1);
}

// Zeichenebenen wie in der Seitenansicht: Beine, Rumpf mit Kopf, Arme. Klassen bleiben gleich (an-body, an-m prim/sec/rest).
export function layersFront(P, roleOf = () => '', sex = 'male') {
  const out = [];
  const disc = (c, r) => 'M' + f1(c[0] - r) + ' ' + f1(c[1]) + ' a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0 Z';
  const group = (segs, joints, order = ['R', 'L']) => {
    const shapes = [], hands = [];
    for (const sh of P.back ? shapesForB(sex) : shapesForF(sex)) {
      if (!segs.includes(sh.seg)) continue;
      if (sh.hand && !P.back) { for (const side of order) hands.push(smooth(sh.pts.map((q) => tfFS(P, sh.seg, side, q)))); continue; } // v2.21.0: Hände nach den Muskeln, über Griffen
      if (sh.mid) { // symmetrische Form: rechte Hälfte plus gespiegelte linke Hälfte als ein Pfad
        const right = sh.pts.map((q) => tfFS(P, sh.seg, 'R', q)), left = sh.pts.slice().reverse().map((q) => tfFS(P, sh.seg, 'L', q));
        shapes.push({ sh, d: smooth(right.concat(left)) });
      } else if (sh.both) {
        for (const side of order) shapes.push({ sh, d: smooth(sh.pts.map((q) => tfFS(P, sh.seg, side, q))) });
      } else shapes.push({ sh, d: smooth(sh.pts.map((q) => tfFS(P, sh.seg, 'R', q))) });
    }
    const body = shapes.filter((x) => x.sh.id === 'body').map((x) => x.d).concat(joints.filter((j) => P.joints[j[0]]).map((j) => disc(P.joints[j[0]], j[1])));
    for (const d of body) out.push({ d, cls: 'an-body edge' });
    for (const d of body) out.push({ d, cls: 'an-body fill' });
    for (const { sh, d } of shapes) {
      if (sh.id === 'body') continue;
      if (sh.id === 'bust') { out.push({ d, cls: 'an-soft' }); continue; }
      const role = roleOf(sh.id);
      out.push({ d, cls: 'an-m ' + (role === 'p' ? 'prim' : role === 's' ? 'sec' : 'rest') });
    }
    for (const d of hands) out.push({ d, cls: 'an-body hand edge' }, { d, cls: 'an-body hand fill' });
  };
  // v2.19.0: frontLeg 'R' – erst das linke Bein ganz (Umriss und Muskeln), dann das rechte darüber (Bein kreuzt vor dem Standbein)
  const legGroups = () => {
    const LS = ['thigh', 'shank', 'foot'];
    if (P.frontLeg === 'R') { group(LS, [['kneeL', 8]], ['L']); group(LS, [['kneeR', 8]], ['R']); } else group(LS, [['kneeR', 8], ['kneeL', 8]]);
  };
  if (P.back) group(['uarm', 'farm'], [['shoulderR', 10], ['shoulderL', 10], ['elbowR', 6], ['elbowL', 6]]); // Rückansicht: Arme vor dem Körper liegen hinter dem Rumpf
  if (!P.legsFront) legGroups();
  group(['trunk'], []);
  // v2.15.0: Bei starker Vorneigung liegt der Kopf vor dem oberen Rücken – er wird nach den Rumpfmuskeln noch einmal gezeichnet (sonst verdeckt).
  // v2.22.0: In der Rückansicht liegt der Kopf bei Vorneigung hinter dem oberen Rücken – kein zweites Zeichnen.
  if (!P.back && P.F.trunk && P.F.trunk.f < 0.6) {
    const head = shapesForF(sex).find((sh) => sh.part === 'head');
    if (head) { const d = smooth(head.pts.map((q) => tfFS(P, 'trunk', 'R', q))); out.push({ d, cls: 'an-body edge' }, { d, cls: 'an-body fill' }); }
  }
  if (P.legsFront) legGroups();
  if (!P.back) group(['uarm', 'farm'], [['shoulderR', 10], ['shoulderL', 10], ['elbowR', 6], ['elbowL', 6]]);
  return out;
}
