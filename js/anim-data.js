// Übungsanimationen (v2.0): Keyframes, Phasen, Kernpunkte und Quellen je Übung – Daten, kein DOM.
// Jeder Zahlenwert trägt seine Herkunft: V(wert, quellen, lesart). Lesarten (READ): wie der Wert gelesen wurde.
// Winkelkonvention siehe js/motion.js. Alle Werte sind Gruppenmittel kleiner Studien, keine Vorgabe für die eigene Technik.
// Recherche: Drive „Research - Animations“ (2026-10-14), Rohdaten im claude.ai-Projekt (claude/v2-animation-research/).
import { LEN, ARM_REACH, solvePose, anchor, shapesFor, tf } from './motion.js';
import { solveFront, layersFront } from './motion-front.js';

export const ANIM_CHECKED_AT = '2026-10-14';

// Lesart eines Werts
export const READ = {
  fulltext: 'Volltext',
  abstract: 'Abstract',
  summary: 'automatische Seitenzusammenfassung – noch nicht am PDF geprüft',
  computed: 'berechnet aus Studienwerten',
  ik: 'aus der Geometrie gelöst, nicht gemessen',
  protocol: 'Vorgabe im Studienprotokoll, nicht gemessen',
  convention: 'Zeichenkonvention, nicht gemessen'
};
// Datenbasis einer Animation
export const BASIS = {
  measured: { label: 'Gemessen', text: 'Die Gelenkwinkel der Endpositionen stammen aus Bewegungsmessungen in Studien (3D-Motion-Capture, Sensoren oder Goniometer). Fehlende Winkel sind aus der Geometrie berechnet und so gekennzeichnet.' },
  protocol: { label: 'Nach Studienprotokoll', text: 'Keine Studie hat die Bewegung gemessen. Die Winkel sind Vorgaben aus Studienprotokollen.' },
  convention: { label: 'Zeichenkonvention', text: 'Keine Studie hat die Bewegung gemessen oder Winkel vorgegeben. Gerät und Winkel folgen einem üblichen Aufbau und sind Zeichenkonvention.' },
  transfer: { label: 'Übertragen', text: 'Die Winkel stammen aus einer anderen Variante oder einem anderen Gerät und sind übertragen.' }
};
export const STATUS = { consensus: 'Konsens', contested: 'umstritten', single: 'Einzelstudie' };
export const TEMPO_BASIS = { measured: 'gemessen', protocol: 'Studienprotokoll', computed: 'aus Studienwerten berechnet', convention: 'Konvention' };

const V = (v, src, read, raw) => ({ v, src: [].concat(src || []), read, raw: raw || null });
const C = (v, raw) => V(v, [], 'convention', raw); // Konvention
const K = (v, src, raw) => V(v, src, 'computed', raw);
const PLATE = 46; // Hantelscheibe Ø 45 cm → Radius 0.225 m ≈ 46 Einheiten (1 m ≈ 204.6 Einheiten)
// Stangenpositionen beim Kreuzheben (Weltkoordinaten, Knöchel bei x = 0, Ballen bei x = 30): Start über dem Mittelfuß am Schienbein,
// auf Kniehöhe vor der Kniescheibe, oben am Oberschenkel. Konvention; Stangenweg ≈ 8 Einheiten (≈ 4 cm) nach hinten, vgl. Hancock et al. 2012.
const STEP = 28; // Stufe beim Wadenheben (≈ 14 cm): Oberkante bei y = −28, nur unter dem Vorfuß (x 16–38), Ballen bei x = 30
const PU = { grip: 62, bar: -330 }; // Klimmzugstange: Hände bei ±62 (1,5-fache Biakromialbreite ≈ 82 Einheiten), Stange auf 1,6 m
// Sumo-Kniebeuge (Frontansicht, v2.9): Knöchelmitte bei ±52 (≈ 0,51 m Fußabstand; Protokolle 1,5-fache Trochanterbreite bis 169 % Schulterbreite), Fußöffnung 32° (Konvention).
// Das räumlich gelöste Bein ergibt unten ≈ 36° Winkel des Oberschenkels zur Sagittalebene; Sinclair et al. 2022 berichten 23,2° Hüftabduktion (Tabelle, ungeprüft; andere Winkeldefinition).
// Arme: Hände an der Stange außerhalb der Schultern, Ellbogen unten (projiziert, Konvention).
const SUMO = { stance: C(52, 'Fußabstand ≈ 0,51 m; im Bereich der Protokolle (1,5-fache Trochanterbreite bis 169 % Schulterbreite)'), toeOut: C(32, 'Füße deutlich nach außen; das Knie folgt der Ebene Hüfte–Knöchel'), arms: { elbow: [30, 44], wrist: [46, 4] } };
// ---------- Runde 3.1 (v2.9): Geräte und gelöste Winkel ----------
const dir2 = (a) => [Math.sin(a * Math.PI / 180), -Math.cos(a * Math.PI / 180)]; // Richtung von senkrecht-oben, nach vorn positiv
// Multipresse: Stange läuft senkrecht über dem Punkt, den die gemessene Endstellung unten ergibt (Kotiuk et al. 2022).
// Oben und in der Mitte wird die Schienbeinneigung so gelöst, dass die Stange über demselben x liegt (Bisektion).
const SMITH_BAR = [-8, 15]; // Stange auf dem oberen Trapez, in Rumpfkoordinaten ab dem Schultergelenk (wie Kniebeuge hochstabig)
function smithBarX(spec) { const P = solvePose(spec); return trunkPoint(P, SMITH_BAR[0], SMITH_BAR[1])[0]; }
function smithShank(knee, hip, x) {
  let lo = -30, hi = 30;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (smithBarX({ shank: m, knee, hip }) > x) hi = m; else lo = m; }
  return Math.round((lo + hi) / 2 * 10) / 10;
}
const SMITH_X = smithBarX({ shank: 4.46, knee: 94.42, hip: 106.28 });
const SMITH = { x: SMITH_X, shank: [smithShank(4, 6, SMITH_X), smithShank(50, 58, SMITH_X)] };
// Hack Squat: Schlitten 45°, Hüfte läuft auf einer Linie parallel zum Rumpf. Für jede Kniebeugung wird die Schienbeinneigung
// so gelöst, dass die Hüfte auf dieser Linie liegt (Knöchel fest auf der Plattform). Plattform 24 hoch (≈ 12 cm), vorn um 20° angehoben; Konvention.
const HACK_T = -45;
function hackHip(shank, knee) { // Hüfte relativ zum Knöchel bei Rumpf −45°
  const k = dir2(shank), K = [k[0] * LEN.shank, k[1] * LEN.shank]; const t = dir2(shank - knee);
  return [K[0] + t[0] * LEN.thigh, K[1] + t[1] * LEN.thigh];
}
function hackSolve(knee, line) { // line: { p, d } Punkt und Richtung der Hüftbahn
  const off = (sh) => { const h = hackHip(sh, knee); return (h[0] - line.p[0]) * line.d[1] - (h[1] - line.p[1]) * line.d[0]; };
  let lo = -40, hi = 70, flo = off(lo);
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2, fm = off(m); if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; } }
  return Math.round((lo + hi) / 2 * 10) / 10;
}
const HACK_TOP = { knee: 5, shank: -35 }; // oben liegt der ganze Körper etwa in der Schlittenlinie, die Füße stehen weit vorn
const HACK_LINE = { p: hackHip(HACK_TOP.shank, HACK_TOP.knee), d: dir2(HACK_T) };
const HACK = { plat: 24, top: HACK_TOP, bottom: { knee: 100, shank: hackSolve(100, HACK_LINE) } };
// Runde 3.2 (v2.9): Good Morning – Schienbein so gelöst, dass die Stange über dem Mittelfuß bleibt (x = 13, Konvention).
function barShank(spec, off, x) {
  let lo = -30, hi = 40;
  const bx = (s) => trunkPoint(solvePose({ ...spec, shank: s }), off[0], off[1])[0];
  const dec = bx(lo) > bx(hi); // Richtung des Zusammenhangs
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if ((bx(m) > x) !== dec) hi = m; else lo = m; }
  return Math.round((lo + hi) / 2 * 10) / 10;
}
// v2.15.0: Good Morning – Schienbein so gelöst, dass der gemeinsame Schwerpunkt von Körper und Stange über dem Mittelfuß liegt (vorher: die Stange
// selbst). Das hielt die Stange zu weit hinten: Schienbein −21°, Oberschenkel stark nach hinten gekippt, die Hüfte „sackte“ nach hinten weg.
// Segmentmassen nach Dempster (Anteile am Körpergewicht, Trainingswissen, nicht nachgeprüft): Rumpf 0,497, Kopf 0,081, Arme 0,1, Oberschenkel 0,2,
// Unterschenkel 0,093, Füße 0,029; Stange 0,5 × Körpergewicht (Konvention, Vigotsky et al. 2015 nennen die Last nur in % 1RM).
function comShank(spec, off, barMass, x) {
  const lerp = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  const cx = (s) => {
    const P = solvePose({ ...spec, shank: s }), J = P.joints, bar = trunkPoint(P, off[0], off[1]);
    const parts = [[0.497, lerp(J.shoulder, J.hip, 0.5)], [0.081, lerp(J.hip, J.shoulder, 1.25)], [0.1, J.shoulder], [0.2, lerp(J.hip, J.knee, 0.433)], [0.093, lerp(J.knee, J.ankle, 0.433)], [0.029, [J.ankle[0] + 10, J.ankle[1]]], [barMass, bar]];
    let m = 0, sx = 0; for (const [w, q] of parts) { m += w; sx += w * q[0]; }
    return sx / m - x;
  };
  return Math.round(bisect(cx, -40, 30) * 10) / 10;
}
const GM = { shank: [comShank({ knee: 4, hip: 4 }, [-8, 15], 0.5, 13), comShank({ knee: 20.1, hip: 100.7 }, [-8, 15], 0.5, 13)] };
// Glute Bridge: Rückenlage, Füße flach (Knöchel bei x = 0). Unten liegen Schultern (y = −20) und Hüftgelenk (y = −26) am Boden,
// oben bleibt die Schulter an derselben Stelle und Schulter–Hüfte–Knie bilden eine Linie (Hüfte 0°). Verschachtelte Bisektion.
function bisect(f, lo, hi) { let flo = f(lo); for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2, fm = f(m); if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; } } return (lo + hi) / 2; }
const BRIDGE = (() => {
  const P = (sp) => solvePose({ ...sp, foot: 90 }), r = (v) => Math.round(v * 10) / 10;
  const hipAt = (s) => bisect((h) => P({ shank: s, knee: 90, hip: h }).joints.shoulder[1] + 20, -20, 140);
  const sB = bisect((s) => P({ shank: s, knee: 90, hip: hipAt(s) }).joints.hip[1] + 26, -85, 10), hB = hipAt(sB);
  const X = P({ shank: sB, knee: 90, hip: hB }).joints.shoulder[0];
  const shankAt = (k) => bisect((s) => P({ shank: s, knee: k, hip: 0 }).joints.shoulder[1] + 20, -85, 20);
  const kT = bisect((k) => P({ shank: shankAt(k), knee: k, hip: 0 }).joints.shoulder[0] - X, 30, 140);
  return { bottom: { shank: r(sB), hip: r(hB) }, top: { shank: r(shankAt(kT)), knee: r(kT) }, headTop: r(-90 - P({ shank: shankAt(kT), knee: kT, hip: 0 }).angles.trunk) };
})();
// Rückenstrecken 45°: Fußplatte 30 hoch (≈ 15 cm), Beine 45° geneigt (Konvention). Kickback: Turm vor der Figur, Rolle unten (Konvention).
const BACKEXT = { plat: 30 };
const KICK = { tower: 150, pulley: -20, hand: [78, 46] }; // Hand relativ zur Schulter, hält den Griff am Turm
// v2.10: Das arbeitende Bein ist das nahe (vorn gezeichnete) Bein; das Standbein ist das zweite Bein und steht per IK fest am Boden.
// Hüfte und Standfuß entsprechen der bisherigen Pose (Standbein: Schienbein 4°, Knie 8°, Rumpf 25°).
KICK.pose = { root: 'hip', rootPos: [-0.6, -182.6], trunk: C(25), leg2: { ankle: [0, -15], foot: C(90, 'Fuß flach'), kneeSide: 1 }, armTarget: KICK.hand, elbow: C(20) };
// Runde 3.3 (v2.9): gemeinsame Liegeposition auf der Flachbank (wie Bankdrücken) und auf der Negativbank (−15°, Beine eingehakt).
const BENCH_POSE = () => ({ root: 'shoulder', rootPos: [0, -102], trunk: C(-90, 'liegend'), hip: C(-6), knee: C(99), foot: C(90, 'Fuß flach') });
const DECLINE_POSE = () => ({ root: 'shoulder', rootPos: [0, -96], trunk: V(-105, 'C1', 'protocol', 'Bank −15° (Kopf tiefer als die Hüfte)'), hip: C(35, 'Beine unter den Rollen eingehakt'), knee: C(95), foot: C(120) });
// Step-up: Box 40 cm ≈ 82 Einheiten (Bruenger et al. 2012: 38,7–41,3 cm, Knie und Sprunggelenk je 90°).
const STEPUP = { box: 82 };
// Goblet Squat: Kurzhantel senkrecht vor dem Brustbein, Hände unter dem oberen Kopf (Konvention).
const GOBLET = { at: [34, -34], hand: [30, -30] }; // v2.15.0: Hantel an der Brust, Handgelenk unter dem oberen Kopf (Hände umfassen ihn von unten); Unterarm verkürzt (zeigt nach innen zur Hantel), damit er fast senkrecht steht
// v2.15.0: Frontkniebeuge – Handgelenk an der Stange vor der Schulter (Rumpfkoordinaten), Ellbogen vorn; Unterarm verkürzt gezeichnet (zeigt schräg nach innen).
const FSQ_HAND = [20, 6], FSQ_SIDE = 1;
const DL_BAR = { start: [16, -PLATE], knee: [14, -95], top: [8, -150] };

// Hantelscheibe an einem Punkt (Seitenansicht) – als Szene-Objekt
const plate = (at, r = PLATE) => ({ type: 'plate', at, r });
// Kurzhantel in echter Größe (v2.9): Griffmitte „at“, Achse „dir“ (Einheitsvektor in der Bildebene) oder endOn (Achse zeigt aus dem Bild).
// Maße sind Konvention (übliche Kurzhantel 10–20 kg): Länge ≈ 38 cm, Kopf ≈ 14 cm hoch und ≈ 10 cm breit, Griff ≈ 13 cm.
const DB = { len: 78, hr: 14.5, hw: 20 };
const db = (at, dir = [1, 0], endOn = false) => ({ type: 'db', at, dir, endOn });
// Umriss der Kurzhantel als SVG-Pfad: zwei Köpfe und der Griff dazwischen (für Ansicht und Prüfwerkzeuge)
export function dumbbellPath(s) {
  const [x, y] = s.at;
  if (s.endOn) { const r = DB.hr; return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`; }
  const d = s.dir, n = [-d[1], d[0]], f = (v) => Math.round(v * 10) / 10;
  const box = (c0, c1, h) => { const p = [[c0, -h], [c1, -h], [c1, h], [c0, h]].map(([a, b]) => [x + d[0] * a + n[0] * b, y + d[1] * a + n[1] * b]); return 'M' + p.map((q) => `${f(q[0])} ${f(q[1])}`).join('L') + 'Z'; };
  const e = DB.len / 2;
  return box(-e, -e + DB.hw, DB.hr) + box(e - DB.hw, e, DB.hr) + box(-e + DB.hw, e - DB.hw, 2.2);
}
export function dumbbellBox(s) { const e = s.endOn ? DB.hr : DB.len / 2 + DB.hr; return [s.at[0] - e, s.at[1] - e, s.at[0] + e, s.at[1] + e]; }

// ---------- Runde 4 (v2.10): Ruderfamilie – Geometrie aus der Pose berechnet ----------
const unit2 = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
// Einarmiges Rudern: Standbein vorn (Wurzel), Knie und Hand der fernen Seite auf der Bank (Oberkante y = −92 ≈ 45 cm).
const ONE_ROW = (() => {
  const t = 70, base = { shank: 5, knee: 15, trunk: t }, P = solvePose(base), h = P.joints.hip, s = P.joints.shoulder;
  const k2y = -103, dx = Math.sqrt(LEN.thigh ** 2 - (k2y - h[1]) ** 2); // Kniemitte ≈ 11 über der Bank, Schienbein liegt auf
  const a = Math.acos(Math.min(1, (-100 - s[1]) / (LEN.uarm + LEN.farm))) * 180 / Math.PI; // Stützarm gestreckt, Handfläche auf der Bank
  return {
    bench: [h[0] - 70, s[0] + 75],
    pose: {
      shank: C(5), ankle: C(5, 'Fuß flach'), knee: C(15, 'Standbein leicht gebeugt'), trunk: C(t, 'Rumpf ≈ 20° über der Waagerechten (Stützarm gestreckt auf der Bank)'),
      leg2: { ankle: [h[0] + dx - LEN.shank, k2y + 1], foot: C(205, 'Fuß hängt hinter der Bank'), kneeSide: 1 },
      arm2: { shoulder: C(t + a, 'Stützarm gestreckt, Hand auf der Bank'), elbow: C(0) }, handFlat2: 1
    }
  };
})();
// T-Bar: Stange im Drehpunkt am Boden hinter der Figur; Hände folgen dem Kreisbogen (Radius ≈ 1,85 m).
const TBAR = (() => {
  const pose = { shank: C(8), ankle: C(8, 'Fuß flach'), knee: V(20, 'R1', 'protocol', '„Beine leicht gebeugt“ (Langhantelrudern, übertragen)'), trunk: C(55, 'Oberkörper deutlich vorgeneigt; Winkel nicht gemessen (Konvention)') };
  const P0 = solvePose({ shank: 8, ankle: 8, knee: 20, trunk: 55, armPlumb: true, elbow: 0 });
  const bottom = P0.joints.wrist, R = 380, py = -10;
  const pivot = [bottom[0] - Math.sqrt(R * R - (bottom[1] - py) ** 2), py];
  const c = trunkPoint(P0, 36, -68), u = unit2([c[0] - pivot[0], c[1] - pivot[1]]); // Griff am unteren Brustkorb
  return { pose, pivot, R, bottom: bottom.map((x) => Math.round(x * 10) / 10), top: [pivot[0] + R * u[0], pivot[1] + R * u[1]].map((x) => Math.round(x * 10) / 10), side: 1 };
})();
// Brustgestütztes Rudern: Polster 45°, Füße auf einer Fußplatte; Hebel mit Drehpunkt vor und über den Händen.
const CSR = (() => {
  const pose = { rootPos: [0, -23], shank: C(15), knee: C(25), trunk: C(45, 'Polster 45°; 30–45° Bank ergäben 60–45° Rumpf (Konvention)') };
  const a = solvePose({ ...{ rootPos: [0, -23], shank: 15, knee: 25, trunk: 45 }, shoulder: 45, elbow: 0 }).joints.hand;
  const b = solvePose({ ...{ rootPos: [0, -23], shank: 15, knee: 25, trunk: 45 }, shoulder: -5, elbow: 105.4 }).joints.hand;
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = [b[0] - a[0], b[1] - a[1]];
  const px = m[0] + 200, py = m[1] - (px - m[0]) * d[0] / d[1]; // auf der Mittelsenkrechten: beide Endlagen gleich weit vom Drehpunkt
  return { pose, pivot: [px, py] };
})();
// Rudermaschine sitzend: Drehpunkt der Hebel über dem Kopf, auf der Mittelsenkrechten der beiden Griffpositionen.
const MROW = (() => {
  const base = { root: 'hip', rootPos: [0, -95], trunk: 0, hip: 90, knee: 90 };
  const a = solvePose({ ...base, shoulder: 61.1, elbow: 5.9 }).joints.hand, b = solvePose({ ...base, shoulder: -5, elbow: 105.4 }).joints.hand;
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = [b[0] - a[0], b[1] - a[1]];
  const py = -330, px = m[0] - (py - m[1]) * d[1] / d[0];
  return { pose: { root: 'hip', rootPos: [0, -95], trunk: V(0, 'S2', 'protocol', 'aufrecht'), hip: C(90), knee: C(90), foot: C(90, 'Füße flach') }, pivot: [px, py] };
})();
// Rudern im Hang: Stange auf Hüfthöhe (y = −185 ≈ 90 cm), Fersen am Boden; Wurzel ist der Knöchel, das Handgelenk bleibt per IK an der Stange.
// Oben ist die Brust ≈ 10 cm (20 Einheiten) unter der Stange (Brustvorderseite 31 vor der Rumpfachse, 45 unter der Schulter; McGill et al. 2014) → Rumpfwinkel oben und Fersenposition;
// unten sind die Arme gestreckt (Schulter–Handgelenk = Armlänge) → Rumpfwinkel unten. Der Körper dreht dabei um die Fersen.
const INV = (() => {
  const bar = [0, -185], grip = [0, -178], ay = -15.5; // Handgelenk ≈ 7 unter der Stangenmitte
  const pose0 = (t, ax = 0) => solvePose({ root: 'ankle', rootPos: [ax, ay], trunk: t, hip: 0, knee: 0, armWorld: grip });
  const chest = (t) => trunkPoint(pose0(t), 51, -45);
  const top = bisect((t) => chest(t)[1] - bar[1], -89, -20), ax = bar[0] - chest(top)[0];
  const low = bisect((t) => { const s = pose0(t, ax).joints.shoulder; return Math.hypot(s[0] - grip[0], s[1] - grip[1]) - 121.5; }, -89, top);
  const r1 = (x) => Math.round(x * 10) / 10;
  return { bar, grip, low: r1(low), top: r1(top), pose: { root: 'ankle', rootPos: [r1(ax), ay], hip: V(0, 'V1', 'protocol', 'Körperlinie gerade'), knee: C(0), armWorld: grip, elbowSide: 1 } };
})();

// ---------- Runde 5 (v2.11): Zugfamilie und hintere Schulter ----------
// Klimmzug im Untergriff (Seitenansicht): Wurzel ist das Handgelenk an der Stange; der Rumpf ist je Bild so gewählt,
// dass der Mittelpunkt von Schulter, Hüfte und Knie unter den Händen hängt (grobes Zeichenmodell für den Körperschwerpunkt).
const CHIN = (() => {
  const grip = [0, PU.bar + 7], base = { root: 'wrist', rootPos: grip, hip: 0, knee: 90, elbowSide: -1 };
  const solveT = (tgt) => { const ps = (t) => solvePose({ ...base, trunk: t, armTarget: tgt }); const t = bisect((x) => { const J = ps(x).joints; return (J.shoulder[0] + J.hip[0] + J.knee[0]) / 3 - grip[0]; }, -60, 60); return { t, P: ps(t) }; };
  const hang = [6, -121], top = [34, -16]; // unten fast gestreckt über der Schulter; oben Stange vor dem Hals, Schulter ≈ 34 dahinter und ≈ 23 unter der Stange → Kinn über der Stange
  const r1 = (x) => Math.round(x * 10) / 10;
  return { grip, hang, top, tHang: r1(solveT(hang).t), tTop: r1(solveT(top).t), elbowTop: r1(solveT(top).P.angles.elbow) };
})();
// Latzug eng/neutral (Seitenansicht): sitzend, Oberschenkel unter dem Polster; Umlenkrolle über dem Griff in Startstellung.
const CGP = { hip: [0, -100], start: [18, -121], mid: [50, -56], end: [38, 12], lean: -10, leanMid: -5 }; // v2.15.0: lean = leichte Rücklage an der Brust (Konvention)
// v2.20.0: Mittelbild – die Hände laufen in einem Bogen vor dem Gesicht vorbei (Griff ≈ 12 cm vor der Nase). Vorher fuhren sie senkrecht nach unten
// und glitten auf Gesichtshöhe nur ≈ 2 cm vor der Nase durch das Gesicht. Die Oberarme zeigen dabei fast waagerecht nach vorn (aus der Geometrie).
const CGP_PULLEY_X = Math.round(solvePose({ root: 'hip', rootPos: CGP.hip, trunk: 0, hip: 90, knee: 90, foot: 90 }).joints.shoulder[0] + CGP.start[0] + 8);
// Überzüge am Kabel (Seitenansicht): Turm vor der Figur, obere Rolle auf ≈ 2,05 m.
const SAP = { tower: 240, pulley: [228, -420] };
// Reverse Butterfly (Frontansicht): sitzend; Arme vorn auf Schulterhöhe (in der Projektion fast ein Punkt) bis seitlich in Linie mit dem Rumpf.
const RPD = { seat: -105, start: { elbow: [6, 6], wrist: [8, 12] }, end: { elbow: [67, 6], wrist: [119, 10] } };

// ---------- Runde 6 (v2.11): Armbeuger ----------
// Griffmitte zwischen Handgelenk und Handende (dort sitzt Stange oder Hantel)
const gripOf = (P) => [(P.joints.wrist[0] + P.joints.hand[0]) / 2, (P.joints.wrist[1] + P.joints.hand[1]) / 2];
const CURL_PLATE = 26; // kleine Scheiben (Ø ≈ 25 cm) an der SZ-Stange, Konvention
// Bayesian Curl: Rücken zum Turm, Oberarm 45° hinter dem Rumpf. Rolle so gesetzt, dass Seil und Unterarm bei 61,5° Ellbogenbeugung senkrecht stehen
// (Lage des größten Drehmoments in Attarieh et al. 2025); der Turm steht ≈ 83 cm hinter der Figur (Konvention).
const BAY = (() => {
  const P = solvePose({ shank: 0, knee: 3, ankle: 0, trunk: 0, shoulder: -45, elbow: 61.5 }), g = gripOf(P), d = P.F.farm.d;
  let c = [-d[1], d[0]]; if (c[0] > 0) c = [-c[0], -c[1]]; // senkrecht zum Unterarm, nach hinten
  const tower = -170, px = tower + 8, k = (px - g[0]) / c[0];
  return { tower, pulley: [px, Math.round((g[1] + c[1] * k) * 10) / 10] };
})();

// ---------- Runde 7 (v2.11): Schultern ----------
// Aufrechtes Rudern (Frontansicht): Griff 100 % der Schulterbreite (Hände unter den Schultern); oben liegt die Stange an der oberen Brust.
// Mit diesem Griff und der Unterarmlänge erreichen die Ellbogen ≈ 65° Abduktion (aus der Geometrie, unter Schulterhöhe).
const URR = { grip: 0, start: { elbow: [4, 68], wrist: [0, 122] }, top: { elbow: [61.6, 28.7], wrist: [8, 22] } };
// Schulterdrücken an der Maschine (Seitenansicht): Lehne 75° → Rumpf 15° zurück; Hebel mit Drehpunkt hinter dem Kopf auf der Mittelsenkrechten der beiden Griffpositionen.
const MSP = (() => {
  const base = { root: 'hip', rootPos: [0, -98], trunk: -15, hip: 75, knee: 90, foot: 90 };
  const a = solvePose({ ...base, armPoints: { elbow: [14, 36], wrist: [20, -8] } }).joints.hand, b = solvePose({ ...base, armPoints: { elbow: [8, -50], wrist: [10, -102] } }).joints.hand;
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = [b[0] - a[0], b[1] - a[1]];
  const px = m[0] - 150, py = m[1] - (px - m[0]) * d[0] / d[1]; // beide Endlagen gleich weit vom Drehpunkt
  return { pivot: [Math.round(px), Math.round(py)] };
})();
// Seitheben am Kabel (Frontansicht): Turm auf der Gegenseite, Rolle auf Handhöhe (Larsen et al. 2025), Seil vor dem Körper.
const CLR = { tower: -150, pulleyY: -152 };

// ---------- Runde 8 (v2.12): Trizeps ----------
// Überkopf-Trizepsstrecken am Kabel: Rücken zum Turm (Mir et al. 2025), Turm ≈ 45 cm hinter der Figur, Rolle auf Hüfthöhe (Konvention).
const OHX = { tower: -95, pulley: [-87, -170] };
// Bankdips: Hand fest an der Bankkante (Oberkante y = −92), Ferse fest am Boden, Beine fast gestreckt.
// Rumpf, Schulter und Ellbogen je Keyframe → Hüfte (über die Wurzel „Handgelenk“); Knie per Zwei-Glieder-IK zur festen Ferse.
// Gezeichnet wird mit der Wurzel „Knöchel“ und armWorld, damit Hand und Ferse auch zwischen den Keyframes still stehen.
const BDIP = (() => {
  const W = [0, -98], hipOf = (k) => solvePose({ root: 'wrist', rootPos: W, trunk: k.trunk, shoulder: k.shoulder, elbow: k.elbow, hip: 80, knee: 0 }).joints.hip;
  const top = { trunk: 5, shoulder: -25, elbow: 10 }, bottom = { trunk: 12.6, shoulder: -88.1, elbow: 90 };
  const ht = hipOf(top), hb = hipOf(bottom), reach = LEN.thigh + LEN.shank - 0.2; // oben Knie ≈ 3°
  const A = [Math.round(ht[0] + Math.sqrt(reach ** 2 - (-15 - ht[1]) ** 2)), -15];
  const leg = (h) => { // Knöchel → Hüfte: Schienbein- und Kniewinkel (Knie nach oben)
    const v = [h[0] - A[0], h[1] - A[1]], L = Math.hypot(v[0], v[1]), D = 180 / Math.PI;
    const g = Math.acos(Math.min(1, (LEN.shank ** 2 + L * L - LEN.thigh ** 2) / (2 * LEN.shank * L))) * D;
    const aAH = Math.atan2(v[0], -v[1]) * D, aSup = aAH + g; // Knöchel → Knie
    const kn = [A[0] + LEN.shank * Math.sin(aSup / D), A[1] - LEN.shank * Math.cos(aSup / D)];
    const aTh = Math.atan2(kn[0] - h[0], -(kn[1] - h[1])) * D; // Hüfte → Knie
    return { shank: Math.round((aSup) * 10) / 10, knee: Math.round((aSup + 180 - aTh) * 10) / 10 };
  };
  return { W, A, top, bottom, legTop: leg(ht), legBottom: leg(hb), drop: Math.round((hb[1] - ht[1]) * 10) / 10 };
})();
// ---------- Runde 9 (v2.12): Fliegende ----------
// Arm im Raum → Frontansicht (armPoints relativ zur Schulter, dx nach außen, dy nach unten). e = Hebung aus dem Hängen
// (0° unten, 90° waagerecht, 180° oben), a = Richtung in der Waagerechten (0° nach vorn, 90° zur Seite, negativ = über die Körpermitte),
// b = leichte Ellbogenbeugung, Unterarm dreht nach innen/vorn. Die Tiefe (zum Betrachter) fällt weg; Arme vorn erscheinen verkürzt.
function armFront(e, a, b) {
  const R = Math.PI / 180, u = [Math.sin(e * R) * Math.sin(a * R), Math.cos(e * R), Math.sin(e * R) * Math.cos(a * R)];
  const p = [-Math.cos(a * R), 0, Math.sin(a * R)], cb = Math.cos(b * R), sb = Math.sin(b * R);
  const f = [u[0] * cb + p[0] * sb, u[1] * cb, u[2] * cb + p[2] * sb], n = Math.hypot(f[0], f[1], f[2]);
  const r1 = (v) => Math.round(v * 10) / 10, E = [LEN.uarm * u[0], LEN.uarm * u[1]];
  return { elbow: E.map(r1), wrist: [E[0] + LEN.farm * f[0] / n, E[1] + LEN.farm * f[1] / n].map(r1) };
}
// Kabelturm-Paar (Frontansicht, Konvention): Türme bei x = ±170, Rollen 10 innen; oben ≈ 1,6 m, unten ≈ 20 cm.
const XOV = { tower: 170, high: -330, low: -40 };
// Dip-Maschine (sitzend): Griffe seitlich, Hebel mit Drehpunkt hinter der Figur auf der Mittelsenkrechten der beiden Griffpositionen (Konvention).
const DIPM = (() => {
  const base = { root: 'hip', rootPos: [0, -98], trunk: 0, hip: 90, knee: 90, foot: 90 };
  const a = solvePose({ ...base, shoulder: -35, elbow: 95 }).joints.hand, b = solvePose({ ...base, shoulder: -15, elbow: 20 }).joints.hand;
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = [b[0] - a[0], b[1] - a[1]];
  const px = m[0] - 150, py = m[1] - (px - m[0]) * d[0] / d[1];
  return { pivot: [Math.round(px), Math.round(py)] };
})();

// ---------- Runde 10 (v2.13): Bauch am Boden ----------
// Rückenlage auf einer Matte (6 Einheiten ≈ 3 cm, Konvention), Kopf links. Höhe des Hüftgelenks so gelöst, dass der tiefste Punkt
// des liegenden Körpers auf der Matte liegt. Rumpfbeugung über curl (js/motion.js): Crunch und Sit-up rollen den oberen Rumpf ein,
// beim Reverse Crunch und Beinheben bleibt der obere Rücken liegen (Wurzel Schulter, Rumpf −90 − curl) und das Becken rollt ein.
const MAT = 6;
const lowestY = (spec) => { const P = solvePose(spec); let m = -1e9; for (const sh of shapesFor('male')) if (sh.seg === 'trunk') for (const q of sh.pts) m = Math.max(m, tf(P, 'trunk', q)[1]); return m; }; // tiefster Konturpunkt des Rumpfs (Standardfigur; die weibliche liegt am Gesäß und Haarknoten bis ≈ 4,5 cm tiefer und drückt in die Matte)
const FLOOR = (() => {
  const r = (v) => Math.round(v * 10) / 10;
  // Liegewinkel: Rumpf so geneigt, dass Gesäß und Schulterblätter zugleich aufliegen (die Figur ist am Gesäß tiefer als am Rücken).
  const low = (t, f) => { const P = solvePose({ root: 'hip', rootPos: [0, 0], trunk: t, hip: 30, knee: 90 }); let m = -1e9; for (const sh of shapesFor('male')) if (sh.seg === 'trunk') for (const q of sh.pts) if (f(q)) m = Math.max(m, tf(P, 'trunk', q)[1]); return m; };
  const lie = r(bisect((t) => low(t, (q) => q[1] < -240) - low(t, (q) => q[1] > -215), -110, -85));
  const hipY = r(-MAT - lowestY({ root: 'hip', rootPos: [0, 0], trunk: lie, hip: 30, knee: 90, foot: 90, shoulder: 90 }));
  const sh = solvePose({ root: 'hip', rootPos: [0, hipY], trunk: lie, hip: 90, knee: 90 }).joints.shoulder.map(r);
  // Crunch-Start: Knie 90°, Hüfte so gelöst, dass der Fuß flach auf der Matte steht (Ballen auf Mattenhöhe).
  const hook = (h, x) => solvePose({ root: 'hip', rootPos: [0, hipY], trunk: lie, hip: h, knee: 90, foot: 90, ...x });
  const hookHip = r(bisect((h) => hook(h).joints.toe[1] + MAT + 2, 0, 90));
  const hookShank = r(hook(hookHip).segAngles.shank);
  // Crunch oben: so weit eingerollt, dass der untere Schulterblattrand (Anker back) ≈ 4 cm von der Ausgangslage abhebt.
  const back0 = anchor(hook(hookHip), 'back')[1];
  const crunchCurl = r(bisect((c) => anchor(hook(hookHip, { curl: c }), 'back')[1] - back0 + 8, 0, 70));
  return { lie, hipY, sh, hookHip, hookShank, crunchCurl };
})();
// Sit-up oben (Konvention): oberer Rumpf ≈ 15° über die Senkrechte, davon 20° Rumpfbeugung; die Ellbogen kommen damit etwa auf Kniehöhe.
const SITUP = { curlTop: 20, trunkTop: -5 };
// v2.14.1: Das Gesäß bleibt beim Aufrichten auf der Matte. Wurzel Knöchel (Füße fixiert, Knie 90°); das Schienbein neigt sich so, dass der tiefste
// Rumpfpunkt auf der Matte liegt (das Hüftgelenk sinkt beim Aufrichten um ≈ 8 cm und rutscht ein wenig zu den Füßen: Becken kippt nach vorn).
const SITUP_ROOT = (() => {
  const P0 = solvePose({ root: 'hip', rootPos: [0, FLOOR.hipY], trunk: FLOOR.lie, hip: FLOOR.hookHip, knee: 90, foot: 90 });
  const ank = P0.joints.ankle.map((v) => Math.round(v * 10) / 10);
  const at = (trunk, curl) => Math.round(bisect((sh) => lowestY({ root: 'ankle', rootPos: ank, shank: sh, knee: 90, foot: 90, trunk, curl }) + MAT, -75, -20) * 10) / 10;
  return { ank, at, midTrunk: Math.round(((FLOOR.lie + SITUP.trunkTop) / 2) * 10) / 10 };
})();


// ---------- Runde 11 (v2.16): Halteübungen und Liegestütz mit erhöhten Füßen ----------
// Gemeinsam: in die Position gehen, halten, ablegen. Kontaktstellen (Unterarm, Füße, Gesäß) sind gelöst, nicht geschätzt; Zeichenkonventionen
// sind in den Datensätzen so benannt. Matte wie in Runde 10 (MAT).
const r1 = (v) => Math.round(v * 10) / 10;
const lowSeg = (P, segs) => { let m = -1e9; for (const sh of shapesFor('male')) if (sh.id === 'body' && segs.includes(sh.seg)) for (const q of sh.pts) m = Math.max(m, tf(P, sh.seg, q)[1]); return m; };
// Unterarmstütz (Seitenansicht): Ellbogen senkrecht unter der Schulter, Unterarm flach (Gelenke 7 über der Matte), Zehen auf der Matte.
// Start: Becken abgelegt – Rumpf so geneigt, dass das Hüftgelenk 22 über der Matte liegt, Hüfte so gestreckt, dass die Zehen aufliegen.
const PLANK = (() => {
  const base = { root: 'wrist', rootPos: [60, -MAT - 7], armPoints: { elbow: [0, 68], wrist: [54, 68] }, knee: 0, foot: 165 };
  const hipFor = (t) => bisect((h) => solvePose({ ...base, trunk: t, hip: h }).joints.toe[1] + MAT, -80, 10);
  const tS = bisect((t) => solvePose({ ...base, trunk: t, hip: hipFor(t) }).joints.hip[1] + MAT + 22, 50, 95);
  const hold = solvePose({ ...base, hip: 0, solve: { param: 'trunk', joint: 'toe', y: -MAT, range: [60, 120] } });
  return { base, start: { trunk: r1(tS), hip: r1(hipFor(tS)) }, mat: [Math.round(hold.joints.toe[0] - 40), 140] };
})();
// Liegestütz mit erhöhten Füßen: Arme wie beim Liegestütz (Suprak et al. 2013), Füße auf einer Stufe von ≈ 40 cm (82 Einheiten, Konvention);
// unten so tief, dass der tiefste Rumpfpunkt (Kinn/Brust) ≈ 4 cm über dem Boden bleibt – mit erhöhten Füßen kippt der Kopf sonst in den Boden.
const FEPU = (() => {
  const BOX = 82, base = { root: 'wrist', rootPos: [0, -6], hip: 0, knee: 0, foot: 165, handFlat: 1 };
  const top = { elbow: [3, 54], wrist: [6, 104] }, bot = { elbow: [-14, 4], wrist: [10, 32] };
  const mix = (u) => ({ elbow: top.elbow.map((v, i) => r1(v + (bot.elbow[i] - v) * u)), wrist: top.wrist.map((v, i) => r1(v + (bot.wrist[i] - v) * u)) });
  const sp = (arm) => ({ ...base, armPoints: arm, solve: { param: 'trunk', joint: 'toe', y: -BOX, range: [60, 150] } });
  const u = bisect((x) => lowSeg(solvePose(sp(mix(x))), ['trunk']) + 8, 0, 1);
  const P0 = solvePose(sp(top));
  return { BOX, base, top, bottom: mix(u), depth: r1(u), toeX: Math.round(P0.joints.toe[0]), trunkTop: r1(P0.angles.trunk) };
})();
// Seitstütz und Copenhagen Plank: Frontfigur, um die Bildachse gedreht (rotate), Figur liegt auf der linken Seite (unten), rechte Seite oben.
// Unterer Oberarm im Bild senkrecht unter der Schulter, Unterarm zeigt zum Betrachter (kurz gezeichnet). armL.points: relativ zur Schulter,
// dx nach außen, dy nach unten (Körperrahmen). Ellbogen 8 und Knöchel 9 über der Matte (Dicke von Unterarm und Fußkante, Konvention).
const SIDE_DEG = Math.PI / 180;
const toBodyF = (r, v) => { const c = Math.cos(-r * SIDE_DEG), sn = Math.sin(-r * SIDE_DEG); return [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c]; };
const armDownF = (r) => { const d = toBodyF(r, [0, 1]); const e = [-d[0] * LEN.uarm, d[1] * LEN.uarm]; return { elbow: e.map(r1), wrist: [r1(e[0]), r1(e[1] - 10)] }; };
const armToF = (r, sh, E) => { const v = toBodyF(r, [E[0] - sh[0], E[1] - sh[1]]); const e = [-v[0], v[1]]; return { pts: { elbow: e.map(r1), wrist: [r1(e[0]), r1(e[1] - 10)] }, len: Math.hypot(e[0], e[1]) }; };
const SIDEP = (() => {
  const AW = [120, -MAT - 9], EY = -MAT - 8;
  const spec = (r, lean, armL, armR = 4) => ({ view: 'front', rotate: r, trunk: lean, root: 'ankleL', rootPos: AW, legs: { stance: -9 }, arm: { abd: armR }, armL: { points: armL } });
  const rH = bisect((r) => solveFront(spec(r, 0, armDownF(r))).joints.elbowL[1] - EY, -95, -40);
  const PH = solveFront(spec(rH, 0, armDownF(rH))), E = [r1(PH.joints.elbowL[0]), EY];
  const at = (r, lean) => armToF(r, solveFront(spec(r, lean, { elbow: [68, 0], wrist: [68, -10] })).joints.shoulderL, E);
  // Start: Hüfte abgesenkt (Hüftgelenk 34 über der Matte, Becken nahe am Boden), Ellbogen und Füße bleiben, der Rumpf knickt seitlich
  const rS = bisect((r) => solveFront(spec(r, 0, armDownF(r))).joints.hipL[1] - (-MAT - 28), -100, -60);
  const leanS = bisect((l) => at(rS, l).len - LEN.uarm, -80, 0);
  return { hold: { rotate: r1(rH), trunk: 0, armL: armDownF(rH), armR: 4 }, start: { rotate: r1(rS), trunk: r1(leanS), armL: at(rS, leanS).pts, armR: r1(4 + leanS) }, AW, E };
})();
const COPEN = (() => {
  const HB = 90, EW = [-150, -MAT - 8]; // Bank ≈ 44 cm (Konvention; im Protokoll hält ein Partner das Bein)
  const spec = (r, lean, armL, abdL, root, rootPos, armR = 4) => ({ view: 'front', rotate: r, trunk: lean, root, rootPos, legs: { stance: -9, abdL }, arm: { abd: armR }, armL: { points: armL } });
  const rH = bisect((r) => solveFront(spec(r, 0, armDownF(r), -4, 'elbowL', EW)).joints.ankleR[1] - (-HB - 9), -100, -30);
  const PH = solveFront(spec(rH, 0, armDownF(rH), -4, 'elbowL', EW)), AR = PH.joints.ankleR.map(r1), KR = PH.joints.kneeR.map(r1);
  const startFor = (r) => {
    const at = (lean) => armToF(r, solveFront(spec(r, lean, { elbow: [68, 0], wrist: [68, -10] }, 0, 'ankleR', AR)).joints.shoulderL, EW);
    const lean = bisect((l) => at(l).len - LEN.uarm, -60, 30), arm = at(lean).pts;
    const abdL = bisect((a) => solveFront(spec(r, lean, arm, a, 'ankleR', AR)).joints.ankleL[1] - (-MAT - 9), -10, 80);
    return { r, lean, arm, abdL };
  };
  const target = (PH.joints.hipL[1] + (-MAT - 24)) / 2; // halb abgesenkt (Serner et al. 2013)
  const rS = bisect((r) => { const S = startFor(r); return solveFront(spec(r, S.lean, S.arm, S.abdL, 'ankleR', AR)).joints.hipL[1] - target; }, rH - 30, rH + 15);
  const S = startFor(rS);
  return { HB, AR, KR, hold: { rotate: r1(rH), trunk: 0, armL: armDownF(rH), abdL: -4, armR: 4 }, start: { rotate: r1(rS), trunk: r1(S.lean), armL: S.arm, abdL: r1(S.abdL), armR: r1(4 + S.lean) } };
})();
// L-Sitz (Seitenansicht): Hände auf niedrigen Griffen (≈ 12 cm, Konvention) neben der Hüfte. Halten: Arme fast gestreckt (Schulter–Handgelenk 120),
// Rumpf 5° vor, Hüfte 95° – die Beine liegen waagerecht, Fußspitzen gestreckt. Start: Gesäß und Fersen am Boden, Arme gebeugt (Ellbogen hinten).
const LSIT = (() => {
  const HP = 24, HAND = [0, -HP - 4], base = { root: 'hip', trunk: 5, knee: 0, foot: 70, armWorld: HAND, elbowSide: 1, handFlat: 1 }; // handFlat: Hand liegt um den Griff statt nach unten in den Boden
  const yH = bisect((y) => { const P = solvePose({ ...base, hip: 95, rootPos: [-6, y] }); return Math.hypot(P.joints.shoulder[0] - HAND[0], P.joints.shoulder[1] - HAND[1]) - 120; }, -200, -20);
  // Start: Füße angezogen (90°), Ferse auf dem Boden; im Halten Fußspitzen gestreckt (Fuß in Verlängerung des Schienbeins)
  const yS0 = -20, hipS = bisect((h) => anchor(solvePose({ ...base, foot: 90, hip: h, rootPos: [-6, yS0] }), 'heel')[1] + 1, 70, 120);
  const yS = bisect((y) => lowSeg(solvePose({ ...base, foot: 90, hip: hipS, rootPos: [-6, y] }), ['trunk', 'thigh']), -60, 0);
  return { HP, HAND, base, hold: { hip: 95, y: r1(yH) }, start: { hip: r1(hipS), y: r1(yS) } };
})();

// ---------- Runde 12 (v2.17): Bauch hängend, im Stütz und am Seilzug ----------
// Körperschwerpunkt für hängende Posen: Segmentmassen nach Dempster (Kopf+Rumpf 0,578, Arme 0,1, Oberschenkel 0,2, Unterschenkel 0,093,
// Füße 0,029; Lehrbuchwerte aus dem Trainingswissen, nicht nachgeschlagen), je Segment in der Mitte – grobes Zeichenmodell.
const comX = (P) => { const J = P.joints, m = (a, b) => (a[0] + b[0]) / 2; return 0.578 * m(J.shoulder, J.hip) + 0.1 * m(J.shoulder, J.wrist) + 0.2 * m(J.hip, J.knee) + 0.093 * m(J.knee, J.ankle) + 0.029 * J.toe[0]; };
// Hängendes Beinheben (Seitenansicht): Obergriff an einer hohen Stange (≈ 2,2 m, damit die gestreckten Beine frei hängen), Arme lang.
// Oben Beine gestreckt und waagerecht, Becken nach hinten gekippt (curl, Konvention). Rumpfneigung je Bild so, dass der Schwerpunkt unter den Händen liegt.
const HLR = (() => {
  const BAR = -452, grip = [0, BAR + 7], base = { root: 'wrist', rootPos: grip, armTarget: [4, -121], elbowSide: 1, knee: 0, ankle: -20 };
  const at = (curl, legUp) => { const ps = (t) => solvePose({ ...base, trunk: t, curl, hip: legUp ? t + 90 : 0 }); return r1(bisect((t) => comX(ps(t)) - grip[0], -60, 40)); };
  return { BAR, grip, base, curlTop: 20, tHang: at(0, false), tTop: at(20, true) };
})();
// Captain's Chair (Seitenansicht): Unterarme auf den Polstern (Ellbogen fest, Oberarm senkrecht, Unterarm waagerecht), Rücken am Polster.
// Aufbau und Winkel vom hängenden Knieheben in Armschlaufen übertragen (Escamilla et al. 2006): Schulter und Ellbogen ≈ 90°, oben Hüfte und Knie
// 125–135° gebeugt und das Becken nach hinten gekippt. Der obere Rumpf bleibt am Polster (senkrecht), das Becken rollt mit curl ein.
const CAPT = (() => {
  const E = [0, -300], arm = { elbow: [0, 68], wrist: [54, 68] }, base = { root: 'elbow', rootPos: E, armPoints: arm, ankle: -20 };
  const P0 = solvePose({ ...base, trunk: 0, hip: 0, knee: 0 });
  let back = 1e9; for (const sh of shapesFor('male')) if (sh.seg === 'trunk' && sh.id === 'body' && !sh.part) for (const q of sh.pts) if (q[1] < -230) back = Math.min(back, tf(P0, 'trunk', q)[0]);
  return { E, arm, base, curlTop: 20, padX: r1(back), sh: P0.joints.shoulder.map(r1) };
})();
// Crunch am Kabel (Seitenansicht): kniend vor dem Turm, Seil von der oberen Rolle, Hände seitlich am Kopf. Schienbein und Fußrücken liegen
// auf dem Boden (Kniehöhe gelöst). Der Rumpf rollt ein (curl), die Hüfte beugt nur wenig mit – Zeichenkonvention, keine Messung.
const CCR = (() => {
  const base = { root: 'knee', shank: 90, knee: 90, foot: 262, armTargetTrunk: [8, 32], elbowSide: 1, armScale: [0.8, 0.9] };
  const y = r1(bisect((yy) => lowSeg(solvePose({ ...base, trunk: 20, rootPos: [0, yy] }), ['shank', 'foot']), -40, 20));
  const start = { trunk: 20, curl: 0 }, end = { trunk: 28, curl: 48 };
  const h0 = solvePose({ ...base, ...start, rootPos: [0, y] }).joints.hand;
  return { base, y, start, end, pulley: [Math.round(h0[0] + 96), -452] };
})();
// Crunch an der Maschine (Seitenansicht): sitzend, Oberschenkel waagerecht, Füße unter der Rolle, Brust am Polster, Hände an den Griffen.
// Das Polster dreht um eine Achse seitlich auf Höhe der Lendenwirbelsäule (Mitte der Biegezone, Konvention).
const MCR = (() => {
  const hip = [0, -100], base = { root: 'hip', rootPos: hip, knee: 90, foot: 90, armTargetTrunk: [40, -40], elbowSide: 1, armScale: [0.85, 0.9] };
  const start = { trunk: -4, curl: 0 }, end = { trunk: 6, curl: 42 };
  const pivot = [r1(hip[0] + 57 * Math.sin(start.trunk * Math.PI / 180)), r1(hip[1] - 57 * Math.cos(start.trunk * Math.PI / 180))];
  return { hip, base, start, end, pivot };
})();
// Frontansicht, beide Hände an einem Griff: Arme fast gestreckt und projiziert (Ellbogen auf der Linie Schulter–Hand, 8 Einheiten nach außen und 6 nach unten
// versetzt; liegt die Hand dicht vor der Schulter, rückt der Ellbogen nach außen unten – der Oberarm zeigt dann nach vorn und verschwindet nie ganz), W ist die Griffmitte. armPoints gelten für die rechte Seite (dx nach außen), armL für die linke (gespiegelt).
const handsTo = (spec, W, rest = [10, 16]) => { // rest: Ellbogen (nach außen, nach unten) für eine Hand dicht vor der Schulter
  const P = solveFront({ ...spec, armPoints: { elbow: [6, 60], wrist: [8, 110] } });
  const one = (S, sg) => { const g = [W[0] - S[0], W[1] - S[1]], l = Math.hypot(g[0], g[1]), v = [g[0] * (1 - 7 / l), g[1] * (1 - 7 / l)], k = LEN.uarm / ARM_REACH; const wv = Math.max(0, Math.min(1, 1 - Math.hypot(v[0], v[1]) / 80)), e = [(sg * v[0] * k + 8) * (1 - wv) + rest[0] * wv, (v[1] * k + 6) * (1 - wv) + rest[1] * wv]; return { elbow: [r1(e[0]), r1(e[1])], wrist: [r1(sg * v[0]), r1(v[1])], len: l }; }; // Griff 7 vor dem Handgelenk (Handmitte)
  const R = one(P.joints.shoulderR, 1), L = one(P.joints.shoulderL, -1);
  return { armPoints: { elbow: R.elbow, wrist: R.wrist }, armL: { points: { elbow: L.elbow, wrist: L.wrist } }, reach: r1(Math.max(R.len, L.len)) };
};
// Holzhacker (Frontansicht): von der oberen Rolle rechts diagonal nach links unten. Die Rumpfdrehung zeigt die Frontfigur nicht – sichtbar sind
// Armdiagonale, Seitneigung und die tiefer werdenden Knie. Griffpunkte und Kniebeugung sind Zeichenkonvention.
const WCH = (() => {
  const legs = (k, s) => ({ planted: true, stance: 34, toeOut: 12, knee: k, shank: s });
  const wStart = [78, -372], wEnd = [-58, -178];
  // Sieben Bilder auf der geraden Griffbahn: linear gemischte Armpunkte ließen die Hände sonst auseinanderlaufen (Schultern wandern mit),
  // und dicht vor der rechten Schulter dreht der kurze projizierte Arm schnell.
  const at = (u) => { const sp = { trunk: r1(6 - 16 * u), legs: legs(r1(6 + 20 * u), r1(3 + 9 * u)) }; return { ...sp, ...handsTo(sp, [wStart[0] + (wEnd[0] - wStart[0]) * u, wStart[1] + (wEnd[1] - wStart[1]) * u]) }; };
  return { tower: 168, pulleyY: -440, path: [0, 1, 2, 3, 4, 5, 6].map((i) => at(i / 6)) };
})();
// Pallof Press (Frontansicht): Kabel von rechts auf Höhe der gestreckten Hände (waagerecht, Juan-Recio et al. 2025); Start Hände an der Brust,
// Ende Arme gerade nach vorn auf Schulterhöhe – von vorn stark verkürzt, die Hände bleiben vor der Körpermitte.
const PAL = (() => {
  const legs = { planted: true, stance: 18, toeOut: 8, knee: 10, shank: 5 };
  const P = solveFront({ legs, armPoints: { elbow: [-16, 4], wrist: [-31, 8] } });
  return { legs, chest: { elbow: [6, 60], wrist: [-27, 30] }, out: { elbow: [-16, 4], wrist: [-31, 8] }, tower: 170, pulleyY: r1(P.joints.wristR[1] + 2) };
})();

// ---------- Runde 13 (v2.18): Bauch am Boden, Drehung, Seitbeugen, Hüftbeugen ----------
// Ab-Wheel-Rollout (Seitenansicht): kniend, Schienbein und Fußrücken am Boden (Kniehöhe gelöst wie beim Kabel-Crunch). Rad Ø ≈ 18 cm
// (Achse 18 über dem Boden, Konvention), Arme gestreckt: Schulter–Griff = 141 (Arm bis Handgelenk 121, knapp unter der vollen Länge, + Handfläche 20). Start im Vierfüßlerstand (Hüfte 90°,
// Arm senkrecht zum Rumpf; Escamilla et al. 2006), Ende gestreckt mit Brust ≈ 4 cm über dem Boden (Youdas et al. 2008: Unterarme fast am Boden).
// Neun Bilder: Hüfte 90° → 0°, Schulterhöhe linear dazwischen; die Radachse folgt aus der Armlänge.
const ROLL = (() => {
  const AX = -18, REACH = 141, base = { root: 'knee', shank: 90, foot: 262, elbow: 0 };
  const y = r1(bisect((yy) => lowSeg(solvePose({ ...base, trunk: 80, knee: 100, rootPos: [0, yy] }), ['shank', 'foot']), -40, 20));
  const at = (t, h) => solvePose({ ...base, rootPos: [0, y], trunk: t, knee: 90 - t + h, shoulder: 90 });
  const H0 = 90; // Vierfüßlerstand: Hüfte und Schulter je ≈ 90° (Escamilla et al. 2006) – der Arm steht senkrecht zum Rumpf, das Rad liegt etwas vor der Schulter
  const tS = bisect((t) => at(t, H0).joints.shoulder[1] + REACH * Math.sin(t * Math.PI / 180) - AX, 45, 95);
  const tE = bisect((t) => lowSeg(at(t, 0), ['trunk']) + 8, 40, 95);
  const s0 = at(tS, H0).joints.shoulder[1], s1 = at(tE, 0).joints.shoulder[1];
  const frame = (u) => {
    const h = H0 * (1 - u), t = bisect((tt) => at(tt, h).joints.shoulder[1] - (s0 + (s1 - s0) * u), 45, 100), P = at(t, h), sh = P.joints.shoulder;
    const ax = [r1(sh[0] + Math.sqrt(Math.max(REACH * REACH - (AX - sh[1]) ** 2, 0))), AX]; // Radachse vor der Schulter auf Achshöhe
    const d = [ax[0] - sh[0], ax[1] - sh[1]], l = Math.hypot(d[0], d[1]), w = [r1(ax[0] - d[0] / l * 20), r1(ax[1] - d[1] / l * 20)]; // Handgelenk 20 vor der Achse: die Handfläche liegt am Griff
    return { trunk: r1(t), knee: r1(90 - t + h), hip: r1(h), axle: ax, wrist: w };
  };
  const frames = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => frame(i / 8));
  // Dauer je Abschnitt nach dem Weg des Rads (gesamt 1 s), damit das Rad gleichmäßig rollt
  const seg = frames.slice(1).map((f, i) => f.axle[0] - frames[i].axle[0]), tot = seg.reduce((a, b) => a + b, 0);
  return { AX, y, base, frames, durs: seg.map((d) => Math.round((d / tot) * 1000) / 1000) };
})();
// Fahrrad-Crunch (Seitenansicht, Rückenlage auf der Matte wie Runde 10): Oberkörper bleibt eingerollt (Schulterblätter abgehoben),
// ein Knie zur Brust (Hüfte 110°, Knie 100°, Konvention), das andere Bein gestreckt bis 30° Hüftbeugung (Pereira et al. 2017).
const BIKE = (() => {
  const bent = { hip: 110, knee: 100 }, straight = { hip: 30, knee: 0 };
  // Hüfthöhe je Bild so gelöst, dass das Gesäß auf der Matte bleibt (bei angezogenem nahem Bein hebt die Gesäßkontur sonst ≈ 3 cm ab)
  const pose = (near, far) => ({ root: 'hip', trunk: FLOOR.lie, curl: FLOOR.crunchCurl, hip: near.hip, knee: near.knee, ankle: -10, leg2: { hip: far.hip, knee: far.knee, ankle: -10 } });
  const yFor = (near, far) => r1(bisect((y) => lowSeg(solvePose({ ...pose(near, far), rootPos: [0, y] }), ['trunk']) + MAT, -80, 20));
  return { bent, straight, yR: yFor(bent, straight), yL: yFor(straight, bent) };
})();
// Hüftbeugen am Kabel (Seitenansicht): aufrecht, Standbein fest (zweites Bein per IK), Manschette am arbeitenden (nahen) Bein, Kabel von
// der unteren Rolle hinter der Figur. Knie bis Hüfthöhe (Oberschenkel waagerecht, Knie 90°), Hände an den Hüften – alles Konvention.
const HFX = { tower: -150, pulley: -20, pose: { root: 'hip', rootPos: [-0.6, -182.6], trunk: 0, leg2: { ankle: [0, -15], foot: 90, kneeSide: 1 }, armTargetTrunk: [-6, -78], elbowSide: 1, armScale: [0.9, 0.9] } };
// Seitbeugen mit Kurzhantel (Frontansicht): Hantel in der rechten Hand, Arm hängt senkrecht; linke Hand an der Hüfte. Seitneigung des Rumpfs
// bis 25° zur Hantelseite und 6° zurück über die Mitte (bequemer Endbereich im Protokoll von Kang & Park 2026; Gradzahl Konvention).
const SBD = (() => {
  const legs = { planted: true, stance: 18, toeOut: 6, knee: 4, shank: 2 };
  // linke Hand bleibt an der Hüfte: Handgelenk auf einem Punkt seitlich am Becken, Ellbogen nach außen (je Neigung gelöst)
  const handL = (lean) => {
    const P = solveFront({ trunk: lean, legs }), S = P.joints.shoulderL, hp = P.joints.hipL, W = [hp[0] - 30, hp[1] - 16], v = [W[0] - S[0], W[1] - S[1]], l = Math.hypot(v[0], v[1]);
    let n = [v[1] / l, -v[0] / l]; if (n[0] > 0) n = [-n[0], -n[1]]; // senkrecht zur Linie Schulter–Hand, nach außen (links)
    const e = [v[0] / 2 + n[0] * 26, v[1] / 2 + n[1] * 26];
    return { elbow: [r1(-e[0]), r1(e[1])], wrist: [r1(-v[0]), r1(v[1])] };
  };
  return { legs, down: 25, up: -6, handUp: handL(-6), handDown: handL(25) };
})();
// Russian Twist (Frontansicht): Sitz auf der Matte, Rumpf ≈ 40° zurückgelehnt (als Verkürzung), Knie hoch vor dem Rumpf, Füße angehoben
// (Oberschenkel nach oben, Schienbein nach unten gezeichnet, Beine vor dem Rumpf). Hände zusammen, von tief neben der einen Hüfte über die
// Mitte (vor dem Bauch) zur anderen, Rumpf neigt sich leicht mit. Die Drehung um die Längsachse zeigt die Frontfigur nicht. Alles Konvention.
const RTW = (() => {
  const legs = { hip: 0, knee: 0, thighDir: 156, thighF: 0.75, shankDir: -24, shankF: 0.45 }, PEL = [0, -34], A = 70;
  const at = (u) => { const x = A * Math.cos(Math.PI * u), sp = { root: 'pelvis', rootPos: PEL, trunkFlex: 40, trunk: r1(8 * Math.cos(Math.PI * u)), legs, legsFront: true }; return { ...sp, ...handsTo(sp, [x, -58 - 34 * Math.sin(Math.PI * u)], [24, 4]) }; }; // seitlich tief neben der Hüfte, in der Mitte vor dem Bauch (über den Knien)
  return { PEL, legs, path: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => at(i / 8)) };
})();

// ---------- Runde 14 (v2.19): Waden, Hüftmaschinen, Hüfte am Kabel und in Seitlage ----------
const DG = Math.PI / 180;
// Wadenheben sitzend (Seitenansicht): Gesäß auf dem Sitz (Hüftgelenk fest), Fußballen auf dem Block (fest), Knie ≈ 90° (Kinoshita et al. 2023),
// Polster auf den Oberschenkeln knapp hinter den Knien. Je Sprunggelenkwinkel Schienbein und Knie so gelöst, dass Hüfte und Ballen am Platz bleiben –
// das Knie hebt sich mit der Ferse, der Oberschenkel kippt leicht. Block ≈ 13 cm, Sitz und Polster Konvention.
const SCR = (() => {
  const BLK = 26, P0 = solvePose({ root: 'hip', rootPos: [0, 0], trunk: 0, hip: 90, knee: 90, ankle: 25 });
  const hip = [0, r1(-BLK - 2 - P0.joints.toe[1])], toe = [r1(P0.joints.toe[0]), -BLK - 2];
  const at = (a) => {
    const kOf = (sh) => solvePose({ root: 'toe', rootPos: toe, shank: sh, knee: 0, trunk: 0, ankle: a }).joints.knee;
    const sh = bisect((x) => { const K = kOf(x); return Math.hypot(K[0] - hip[0], K[1] - hip[1]) - LEN.thigh; }, -30, 30), K = kOf(sh);
    const aThigh = Math.atan2(K[0] - hip[0], -(K[1] - hip[1])) / DG;
    return { shank: r1(sh), knee: r1(180 + sh - aThigh), ankle: a };
  };
  const withHand = (o) => { const P = solvePose({ root: 'toe', rootPos: toe, trunk: 0, ...o }), K = P.joints.knee, d = [K[0] - P.joints.hip[0], K[1] - P.joints.hip[1]], l = Math.hypot(d[0], d[1]);
    const u = [d[0] / l, d[1] / l], n = [u[1], -u[0]], pad = [K[0] - u[0] * 16 + n[0] * 24, K[1] - u[1] * 16 + n[1] * 24];
    return { ...o, hand: [r1(pad[0] - 4), r1(pad[1] - 8)] }; }; // Hände an den Griffen des Polsters
  return { BLK, hip, toe, down: withHand(at(25)), mid: withHand(at(-2.5)), up: withHand(at(-30)) };
})();
// Wadenheben an der Beinpresse (Seitenansicht): Sitz, Lehne und Beine wie oben an der Beinpresse, Knie fast gestreckt; nur die Fußballen
// stehen an der unteren Kante der Platte, die Ferse hängt frei. Das Bein bleibt starr, nur das Sprunggelenk bewegt sich – die Platte folgt
// den Ballen entlang der Schienen. Alles Konvention.
const LPC = { pose: { root: 'hip', rootPos: [0, -70], trunk: -70, hip: 70, knee: 4, shoulder: 5, elbow: 25, armScale: [1, 0.9] } };
// Wadenheben einbeinig (Seitenansicht): auf der Stufe wie beim Wadenheben stehend, das hintere Bein angewinkelt, eine Hand an der Wand vor der Figur.
const SLC = { wall: 104, hand: [94, -262] };
// Hüftmaschinen (Frontansicht, sitzend): Oberschenkel waagerecht zum Betrachter (stark verkürzt, Knie leicht unter der Hüfte gezeichnet),
// Unterschenkel senkrecht, Füße auf den Fußstützen. Abspreizen je Bein in der Waagerechten: das Knie wandert seitlich um L · sin(Winkel).
// Polster außen (Abduktion) oder innen (Adduktion) an den Knien. Winkel und Sitzhöhe Konvention.
const HIPM = (() => {
  const PEL = [0, -132], DROP = 0.45; // Knie ≈ 40 Einheiten unter der Hüfte (Projektion des leicht abfallenden Oberschenkels)
  const legs = (a) => { const lat = LEN.thigh * Math.sin(a * DG), dn = LEN.thigh * DROP; return { thighDir: r1(Math.atan2(lat, dn) / DG), thighF: Math.round(Math.hypot(lat, dn) / LEN.thigh * 1000) / 1000, shankDir: 0, shankF: 0.85 }; };
  const arms = { elbow: [12, 58], wrist: [26, 106] }; // Hände an den Griffen neben dem Sitz
  return { PEL, legs, arms, open: 38, closed: 2 };
})();
// Hand an der Hüfte (Frontansicht): Handgelenk seitlich am Becken, Ellbogen nach außen – wie beim Seitbeugen, für beide Seiten.
const hipHand = (spec, side) => {
  const P = solveFront(spec), sg = side === 'R' ? 1 : -1, S = P.joints['shoulder' + side], hp = P.joints['hip' + side];
  const W = [hp[0] + sg * 30, hp[1] - 16], v = [W[0] - S[0], W[1] - S[1]], l = Math.hypot(v[0], v[1]);
  let n = [v[1] / l, -v[0] / l]; if (n[0] * sg < 0) n = [-n[0], -n[1]];
  const e = [v[0] / 2 + n[0] * 26, v[1] / 2 + n[1] * 26];
  return { elbow: [r1(sg * e[0]), r1(e[1])], wrist: [r1(sg * v[0]), r1(v[1])] };
};
// Abduktion am Kabel stehend (Frontansicht): Stand auf dem linken Bein, Manschette am rechten Knöchel, Kabel von der unteren Rolle des
// Turms links (Standbeinseite) vor dem Standbein vorbei. Linke Hand am Turm, rechte an der Hüfte. Bein bis 35° seitlich (Konvention), Rumpf neigt leicht zum Standbein.
// Adduktion am Kabel (Frontansicht): Turm rechts, Manschette am rechten (nahen) Knöchel; das Bein startet abgespreizt und zieht bis knapp vor das Standbein.
const CHIP = (() => {
  const AL = [-13, -15], legs = (abd) => ({ abdR: abd });
  const spec = (abd, lean) => ({ root: 'ankleL', rootPos: AL, trunk: lean, legs: legs(abd) });
  const towerHand = (abd, lean, side) => { const P = solveFront(spec(abd, lean)), S = P.joints['shoulder' + side], sg = side === 'R' ? 1 : -1, T = [sg * 112, -276];
    const v = [T[0] - S[0], T[1] - S[1]], k = LEN.uarm / ARM_REACH; return { elbow: [r1(sg * v[0] * k + 2), r1(v[1] * k + 10)], wrist: [r1(sg * v[0] - 8), r1(v[1])] }; };
  const abdF = (abd, lean) => ({ armL: { points: towerHand(abd, lean, 'L') }, armPoints: hipHand(spec(abd, lean), 'R') });
  const addF = (abd, lean) => ({ armPoints: towerHand(abd, lean, 'R'), armL: { points: hipHand(spec(abd, lean), 'L') } });
  return { AL, spec, abd: { down: { abd: 0, lean: 0, ...abdF(0, 0) }, up: { abd: 35, lean: -4, ...abdF(35, -4) } }, add: { out: { abd: 28, lean: 3, ...addF(28, 3) }, in: { abd: -9, lean: 0, ...addF(-9, 0) } } };
})();
// Seitlage (Frontansicht, um −90° gedreht wie beim Seitstütz: Kopf links, linke Körperseite unten auf der Matte). Unterer Arm über dem Kopf
// (Kopf liegt darauf), oberer Arm am Körper. Beckenhöhe so gelöst, dass der tiefste Umrisspunkt auf der Matte liegt.
const lowF = (P) => { let m = -1e9; for (const l of layersFront(P, () => '', 'male')) { if (!l.cls.includes('fill') || l.d.includes(' a')) continue; const n = l.d.replace(/[MCZ]/g, ' ').trim().split(/\s+/).map(Number); for (let i = 1; i < n.length; i += 2) m = Math.max(m, n[i]); } return m; };
const SIDEL = (() => {
  const base = { rotate: -90, root: 'pelvis', armL: { abd: 186, elbow: 0 }, arm: { abd: 6, elbow: 6 } };
  const y = (extra) => r1(bisect((yy) => lowF(solveFront({ ...base, ...extra, rootPos: [0, yy] })) + MAT, -200, 100));
  return { base, y };
})();
// Seitliches Beinheben: unteres Bein gestreckt, oberes bis 40° abgespreizt (Konvention).
const SLA = { y: SIDEL.y({ legs: { abdR: 0 } }), up: 40 };
// Clamshell: Hüfte 60° gebeugt (Variante mit der höchsten Aktivität des mittleren Gesäßmuskels bei Willcox & Burden 2013), Knie 90°, Fersen zusammen.
// Das obere Knie öffnet sich um die Achse Hüfte–Knöchel bis 40° (Konvention). Bein räumlich gelöst und in die Frontalebene projiziert
// (x seitlich, y abwärts, z zum Betrachter).
const CLAM = (() => {
  const HF = 60, K = 90;
  const kn = [0, LEN.thigh * Math.cos(HF * DG), LEN.thigh * Math.sin(HF * DG)], sa = (HF - K) * DG;
  const an = [0, kn[1] + LEN.shank * Math.cos(sa), kn[2] + LEN.shank * Math.sin(sa)];
  const ax = (() => { const l = Math.hypot(...an); return an.map((c) => c / l); })(), d = kn[1] * ax[1] + kn[2] * ax[2];
  const perp = [0, kn[1] - d * ax[1], kn[2] - d * ax[2]], cr = [ax[1] * perp[2] - ax[2] * perp[1], 0, 0]; // ax × perp zeigt seitlich
  const legs = (phi) => {
    const c = Math.cos(phi * DG), sn = Math.sin(phi * DG), k = [Math.abs(cr[0]) * sn, d * ax[1] + perp[1] * c, 0];
    return { thighDir: r1(Math.atan2(k[0], k[1]) / DG), thighF: Math.round(Math.hypot(k[0], k[1]) / LEN.thigh * 1000) / 1000, shankDir: r1(Math.atan2(-k[0], an[1] - k[1]) / DG), shankF: Math.round(Math.hypot(k[0], an[1] - k[1]) / LEN.shank * 1000) / 1000 };
  };
  const closed = legs(0), open = legs(40);
  const L = { thighDirL: closed.thighDir, thighFL: closed.thighF, shankDirL: closed.shankDir, shankFL: closed.shankF };
  const mk = (o) => ({ ...o, ...L });
  return { HF, closed: mk(closed), open: mk(open), y: SIDEL.y({ legs: mk(closed), legsFront: true }) };
})();

// ---------- v2.20.0: Ausfallschritt neu aufgebaut ----------
// Bis v2.19 klappte das hintere Knie unten vor die Hüfte (fast bis zum vorderen Fuß): Mit 70 % Beinlänge Schritt und den gemessenen Winkeln des
// vorderen Beins liegt der hintere Fuß so nah unter der Hüfte, dass die Zwei-Glieder-IK nur diese Lösung hat. Außerdem schob sich die Hüfte
// beim Ausfallschritt vorwärts beim Aufsetzen ≈ 15 cm über das Ziel hinaus und rutschte beim Absenken zurück, und rückwärts setzte der hintere
// Fuß erst unten auf. Jetzt: Unten liegt das hintere Knie knapp über dem Boden (Kniemitte 15 über dem Boden, Konvention) und der hintere Fußballen
// am Boden; daraus folgt die Schrittlänge. Die Zwischenbilder geben die Hüftbahn vor (vorn/hinten und abwärts, ohne Rücklauf); die Beine folgen per IK.
const footAnkle = (ball, phi) => { const d = [Math.sin(phi * DG), -Math.cos(phi * DG)]; return [r1(ball[0] - d[0] * 30 + d[1] * 13), r1(ball[1] - d[1] * 30 - d[0] * 13)]; }; // Knöchel bei festem Ballen und Fußwinkel phi
function legTo(hip, ankle) { // Beinwinkel (Schienbeinneigung, Kniebeugung) für Hüfte → Knöchel, Knie vorn
  const ang = (w) => ((Math.atan2(w[0], -w[1]) / DG) % 360 + 360) % 360, v = [ankle[0] - hip[0], ankle[1] - hip[1]];
  const d = Math.min(Math.hypot(v[0], v[1]), LEN.thigh + LEN.shank - 0.5), g = Math.acos((LEN.thigh ** 2 + d * d - LEN.shank ** 2) / (2 * LEN.thigh * d)) / DG;
  const aT = ang(v) - g, K = [hip[0] + LEN.thigh * Math.sin(aT * DG), hip[1] - LEN.thigh * Math.cos(aT * DG)], aS = ang([ankle[0] - K[0], ankle[1] - K[1]]);
  return { shank: r1(aS - 180), knee: r1(aS - aT) };
}
const LUNGE = (() => {
  const bottom = { shank: 11.4, knee: 96.4, hip: 84.3, ankle: 11.4 }; // gemessene Winkel des vorderen Beins (Riemann et al. 2012)
  const P = solvePose({ ...bottom, rootPos: [0, -15] }), H = P.joints.hip, trunk = P.angles.trunk; // Hüfte relativ zum vorderen Knöchel
  const KY = -15, ballY = -2, phiB = 140; // Kniemitte, Ballen, Fußwinkel unten
  const knee = [H[0] - Math.sqrt(LEN.thigh ** 2 - (KY - H[1]) ** 2), KY];
  const a0 = footAnkle([0, ballY], phiB), ankY = a0[1], ankle = [knee[0] - Math.sqrt(LEN.shank ** 2 - (ankY - KY) ** 2), ankY];
  const ballX = ankle[0] - a0[0]; // Ballen relativ zum vorderen Knöchel
  return { bottom, H, trunk, ballX, ballY, phiB, step: r1(-ballX) };
})();
// Ausfallschritt vorwärts: hinterer Ballen bleibt bei x = 30 (Stand), der vordere Fuß setzt bei F auf.
const FWL = (() => {
  const ball = [30, LUNGE.ballY], F = [r1(30 - LUNGE.ballX), -15], Hb = [F[0] + LUNGE.H[0], LUNGE.H[1]];
  const back = (phi) => ({ ankle: footAnkle(ball, phi), foot: phi });
  const swing = { hip: [r1(0.3 * Hb[0]), -180], ankle: [r1(0.5 * F[0]), -34] };
  const touchX = r1(0.82 * Hb[0]), touch = { hip: [touchX, r1(F[1] - Math.sqrt(164 ** 2 - (F[0] - touchX) ** 2))], ankle: F };
  return { F, Hb, back, swing: { ...swing, leg: legTo(swing.hip, swing.ankle) }, touch: { ...touch, leg: legTo(touch.hip, touch.ankle) } };
})();
// Ausfallschritt rückwärts: der vordere Fuß bleibt bei x = 0, der hintere Ballen setzt bei LUNGE.ballX auf.
const RVL = (() => {
  const ball = [r1(LUNGE.ballX), LUNGE.ballY], Hb = LUNGE.H;
  const back = (phi) => ({ ankle: footAnkle(ball, phi), foot: phi });
  const swing = { hip: [r1(0.3 * Hb[0]), -180], ankle: [r1(0.5 * ball[0] - 10), -36], foot: 125 };
  const aT = footAnkle(ball, 125), tx = r1(0.83 * Hb[0]), touch = { hip: [tx, r1(aT[1] - Math.sqrt(164 ** 2 - (aT[0] - tx) ** 2))] }; // Hüfte so tief, dass der Ballen den Boden erreicht
  const back2 = (phi) => (phi === 125 ? { ankle: aT, foot: phi } : back(phi));
  return { ball, Hb, back: back2, swing: { ...swing, leg: legTo(swing.hip, [0, -15]) }, touch: { ...touch, leg: legTo(touch.hip, [0, -15]) } };
})();
// ---------- Runde 15 (v2.20): Drücken und Heben ----------
// Schrägbankdrücken an der Multipresse (Seitenansicht): Bank 30° und Körper wie beim Schrägbankdrücken mit der Langhantel (Rodríguez-Ridao et al. 2020).
// Die Stange läuft senkrecht über dem Punkt, an dem sie unten die obere Brust erreicht (x der Hand unten). Oben ist der Arm fast gestreckt
// (Abstand Schulter–Handgelenk 95 % der Armlänge, Konvention); das Handgelenk ist so gesetzt, dass die Hand über demselben x liegt (geführte Bahn).
const SMI = (() => {
  const base = { root: 'hip', rootPos: [0, -100], trunk: -60, hip: 30, knee: 90, foot: 90 };
  const bottom = { elbow: [16, 30], wrist: [30, -14] };
  const xb = solvePose({ ...base, armPoints: bottom }).joints.hand[0], sh = solvePose(base).joints.shoulder;
  const reach = 0.95 * (LEN.uarm + LEN.farm);
  const arm = (dx) => { // Zwei-Glieder-IK in der Bildebene, Ellbogen unter der Linie Schulter–Handgelenk
    const dy = -Math.sqrt(reach * reach - dx * dx), l = reach, a = LEN.uarm, b = LEN.farm;
    const g = Math.acos((a * a + l * l - b * b) / (2 * a * l)), base0 = Math.atan2(dy, dx), e = base0 - g;
    return { elbow: [r1(a * Math.cos(e)), r1(a * Math.sin(e))], wrist: [r1(dx), r1(dy)] };
  };
  let dx = xb - sh[0];
  for (let i = 0; i < 4; i++) { const h = solvePose({ ...base, armPoints: arm(dx) }).joints.hand[0]; dx += xb - h; }
  return { base, bottom, top: arm(dx), x: r1(xb) };
})();
// Schräge Brustpresse (Seitenansicht): Lehne 20° zurück, Griffe unten auf Höhe der oberen Brust, Druck schräg nach oben-vorn bis ≈ 115°
// Schulterbeugung zum Rumpf (übertragen von der 30°-Schrägbank: senkrechter Druck = 120°). Hebel mit Drehpunkt hinter dem Kopf auf der
// Hebel mit Drehpunkt tief hinter dem Sitz. Alles außer der Druckrichtung Konvention.
const IMP = (() => {
  const base = { root: 'hip', rootPos: [0, -100], trunk: -20, hip: 75, knee: 85, foot: 90 };
  const back = { elbow: [-20, 34], wrist: [26, 6] }, mid = { elbow: [40, 26], wrist: [64, -22] }; // Mitte: Ellbogen kommt vor den Körper (sonst springt der Oberarm beim Überblenden)
  const up = (180 + base.trunk - 115) * DG, el = 8; // Oberarm aus der Senkrechten nach vorn: 180° + Rumpf (−20°) − Beugung 115° = 45°
  const E = [LEN.uarm * Math.sin(up), -LEN.uarm * Math.cos(up)], fa = up - el * DG; // Unterarm 8° steiler (Ellbogen leicht gebeugt)
  const front = { elbow: [r1(E[0]), r1(E[1])], wrist: [r1(E[0] + LEN.farm * Math.sin(fa)), r1(E[1] - LEN.farm * Math.cos(fa))] };
  // Drehpunkt tief hinter dem Sitz (Konvention); der Hebel läuft hinter dem Körper zum Griff. Er ist nicht starr gezeichnet:
  // ein Drehpunkt, von dem beide Griffpositionen gleich weit entfernt sind, läge vor der Figur oder über dem Kopf.
  return { base, back, mid, front, pivot: [-62, -64] };
})();
// Seitheben an der Maschine (Frontansicht, sitzend): Arm in der Frontalebene von 0° auf 90° Abduktion (Protokolle Larsen et al. 2025,
// Coratella et al. 2020, Campos et al. 2020). Variante „gebeugt“: Ellbogen 90°, Unterarm zeigt nach vorn und leicht nach unten (20°, Konvention),
// in der Projektion kurz unter dem Ellbogen; Polster außen am Oberarm über dem Ellbogen. Variante „gestreckt“: Ellbogen fast gestreckt,
// Polster am Unterarm. Drehachse der Hebel hinter dem Schultergelenk (Konvention, wie in der Beschreibung im Übungspool).
const MLR = (() => {
  const seat = -105;
  const bent = (abd) => { const e = [LEN.uarm * Math.sin(abd * DG), LEN.uarm * Math.cos(abd * DG)]; return { elbow: [r1(e[0]), r1(e[1])], wrist: [r1(e[0]), r1(e[1] + LEN.farm * Math.sin(20 * DG))] }; };
  return { seat, bent, legs: { hip: 85, knee: 85 } };
})();
// Reverse Fly am Kabel (Frontansicht, stehend): Kabel über Kreuz von zwei Rollen auf Schulterhöhe (Türme wie XOV). Start mit den Armen vorn
// und leicht über der Körpermitte (−20°, Konvention für gekreuzte Kabel), Ende in Linie mit dem Rumpf (Bergquist et al. 2018); Ellbogen 14°
// gebeugt (Band-Reverse-Fly, 14,08 ± 9,14°, Liu et al. 2024). Armgeometrie mit armFront.
const CRF = { stance: 14, lift: 84, start: -20, mid: 0, end: 90, elbow: 14 }; // lift: Armhebung 84° (fast waagerecht), damit der Oberarm von vorn nie auf einen Punkt schrumpft; Mittelbild bei 0° (Arme zeigen nach vorn)
// Y-Raise auf der Schrägbank (Seitenansicht): Brust auf dem Polster einer 45°-Bank (Konvention; keine Studie mit Brustauflage gefunden),
// Füße am Boden. Start mit senkrecht hängenden Armen; oben 135° Armhebung in der Schulterblattebene (Song et al. 2026), projiziert auf die
// Seitenansicht (Ebene 30° vor der Frontalebene): Beugung 153°, sichtbare Armlänge 79 % (berechnet).
const YR = (() => {
  const e = 135 * DG, pl = 30 * DG, up = -Math.cos(e), fw = Math.sin(e) * Math.sin(pl);
  return { trunk: 45, flex: r1(180 - Math.atan2(fw, up) / DG), scale: Math.round(Math.hypot(up, fw) * 100) / 100 };
})();
// Face Pull (Seitenansicht, stehend): Turm vor der Figur, Rolle auf Kopfhöhe (Konvention; keine Studie zur Kabelhöhe gefunden).
// Start: Arme gestreckt zur Rolle. Ende: Hände neben den Ohren, Oberarme seitlich auf Schulterhöhe – in der Seitenansicht zeigen sie zum Betrachter
// und erscheinen sehr kurz, die Unterarme stehen nach oben (Außenrotation). Endstellung Trainingswissen, nicht gemessen.
const FP = (() => {
  const base = { shank: 0, knee: 4, hip: 4, ankle: 0 }, pulley = [200, -335], sh = solvePose(base).joints.shoulder;
  const v = [pulley[0] - sh[0], pulley[1] - sh[1]], l = Math.hypot(v[0], v[1]), u = [v[0] / l, v[1] / l];
  const start = { elbow: [r1(u[0] * LEN.uarm), r1(u[1] * LEN.uarm)], wrist: [r1(u[0] * (LEN.uarm + LEN.farm)), r1(u[1] * (LEN.uarm + LEN.farm))] }; // Arm gestreckt zur Rolle
  return { base, tower: 210, pulley, start, end: { elbow: [-4, -5], wrist: [2, -40] } };
})();
// Shrugs (Frontansicht): Arme hängen mit den Kurzhanteln seitlich, Schultern heben sich um 12 Einheiten (≈ 6 cm). Berechnet aus 25° Hebung des
// Schlüsselbeins (Peeters et al. 2023, passiv an Körperspenden) und ≈ 15 cm Schlüsselbeinlänge (Trainingswissen, nicht nachgeprüft).
const SHR = { up: 12 };

// ---------- Runde 16 (v2.21): Unterarme, Beinbeuger, Beine und Tragen ----------
// Beinbeuger sitzend (Seitenansicht): Hüfte ≈ 90° (Maeo et al. 2021), Oberschenkel waagerecht auf dem Sitz, Knie 0° → 90°. Kniegelenk auf der
// Drehachse des Hebels (Protokoll), Polster oben auf dem Oberschenkel knapp vor dem Knie, Rolle hinten am Unterschenkel über der Ferse.
// Hände an den Griffen neben dem Sitz (Handgelenk-Ziel in Weltkoordinaten). Sitzhöhe, Lehne und Griffe sind Konvention.
const SLC2 = { hip: [0, -112], hand: [26, -124] };
// Nordic Hamstring Curl (Seitenansicht): kniend auf einem Polster (Schienbein waagerecht, Polster 14 hoch, Konvention), Knöchel unter einer Rolle.
// Start: Oberschenkel und Rumpf senkrecht (Knie 90°, Maeo et al. 2024). Absenken mit gestreckter Hüfte bis zum Bruchpunkt bei 58° Kniebeugung
// (57,75 ± 13,28°, Soga et al. 2021, Unterschenkel flach), danach Fallen und mit den Händen abfangen (Knie ≈ 15°). Hüfte leicht gebeugt (8°,
// Konvention; gemessen wurden 24° bei maximaler Aktivität, Jorge et al. 2024). Arme: vor der Brust, beim Abfangen gestreckt zum Boden.
const NHC = (() => {
  const KN = [0, -24], base = { root: 'knee', rootPos: KN, shank: 90, foot: 205 };
  const sh = (knee, hip) => solvePose({ ...base, knee, hip }).joints.shoulder;
  const chest = { shoulder: 25, elbow: 125 }; // Arme vor der Brust (Konvention); als Winkel, damit die Überblendung glatt bleibt
  const WY = -22; // Handgelenk über dem Boden (Faust liegt auf)
  const wristY = (knee, hip, shoulder, elbow) => solvePose({ ...base, knee, hip, shoulder, elbow }).joints.wrist[1];
  const catchArm = (knee, hip, elbow) => ({ shoulder: r1(bisect((sh) => wristY(knee, hip, sh, elbow) - WY, 20, 120)), elbow }); // Schulterwinkel so, dass die Hand den Boden erreicht
  // tiefstes Knie: die fast gestreckten Arme (Ellbogen 5°) erreichen den Boden gerade senkrecht unter der Schulter
  const low = r1(bisect((k) => { const S = sh(k, 8); return -S[1] - (LEN.uarm + LEN.farm - 2) + WY + 0; }, 0, 58));
  return { KN, base, chest, bp: 57.75, low, catch: catchArm(low, 8, 5), mid: catchArm(35, 8, 70) };
})();
// Reverse Hyperextension (Seitenansicht): Bauchlage auf einem hohen Polster, Hüfte an der Polsterkante, Beine hängen; gestreckte Beine von 77°
// Hüftbeugung (76,6° Oberschenkel–Rumpf-Bewegung, Lawrence et al. 2019) bis in Linie mit dem Rumpf. Pendel mit Drehachse am Hüftgelenk,
// Schlaufe an den Unterschenkeln über dem Knöchel; Hände an Griffen vorn. Polsterhöhe ≈ 1 m (Konvention).
const RHE = { hip: [0, -222], hand: [126, -100], bottom: 76.6 };

// Handgelenkcurls (Seitenansicht): sitzend auf der Bank, Oberkörper vorgeneigt, Unterarme auf den Oberschenkeln, Handgelenk knapp vor dem Knie.
// Rumpfneigung so gelöst, dass der Ellbogen auf dem Oberschenkel liegt (Konvention; Studien fixierten den Unterarm, Takamori et al. 2026).
// Hand von waagerecht (0°) bis 60° nach oben (Takamori: „voll gebeugt/gestreckt“ ohne Gradwert; Alltag braucht 54° Beugung / 60° Streckung, Ryu et al. 1991).
const WCURL = (() => {
  const base = { root: 'hip', rootPos: [0, -100], knee: 90, foot: 90 };
  const pose = (t) => solvePose({ ...base, trunk: t, hip: t + 90 }); // Oberschenkel waagerecht auf der Bank
  const W = (P) => { const K = P.joints.knee; return [K[0] + 12, K[1] - 16]; }; // Handgelenk vor dem Knie, über dem Oberschenkel
  const elbowGap = (t) => { const P = pose(t), Wt = W(P), Q = solvePose({ ...base, trunk: t, hip: t + 90, armWorld: Wt, elbowSide: 1 }); const E = Q.joints.elbow, H = P.joints.hip, K = P.joints.knee;
    const d = [K[0] - H[0], K[1] - H[1]], l = Math.hypot(d[0], d[1]), n = [d[1] / l, -d[0] / l]; return (E[0] - H[0]) * n[0] + (E[1] - H[1]) * n[1] - 22; }; // Ellbogen 22 über der Oberschenkelachse
  const trunk = r1(bisect(elbowGap, 5, 75)), P = pose(trunk);
  return { base, trunk, wrist: W(P), top: 60 };
})();
// Farmer's Walk (Seitenansicht, auf der Stelle – die Hüfte bleibt im Bild, die Füße wandern wie auf einem Laufband nach hinten).
// Vier Bilder je Doppelschritt; Schritt ≈ 0,5 m (halbe Doppelschrittlänge 1,04 m bei Strongman-Athleten, Winwood et al. 2014 in Hindle et al. 2019),
// Füße bei ±42 vor/hinter der Hüfte; Rumpf 5° vor (Konvention; Strongman bei Höchstlast ≈ 12°). Beine per IK (legTo) zu den Fußzielen.
const FWK = (() => {
  const front = [42, -14], back = [-40, -30], under = [8, -15], swing = [-8, -48];
  const fr = (hy, near, nearFoot, far, farFoot) => ({ root: 'hip', rootPos: [0, hy], trunk: 5, ...legTo([0, hy], near), foot: nearFoot, leg2: { ankle: far, foot: farFoot } });
  const hyLow = r1(-14 - Math.sqrt(165 ** 2 - 42 ** 2)), hyHigh = -181;
  // Fußbahn eines Beins: Ziele und Fußwinkel; dazwischen Mittelbilder (gemittelte Ziele), damit der Knöchel der IK-Bahn folgt und der Fuß nicht in den Boden taucht
  const path = [[front, 80], [under, 90], [back, 125], [swing, 110]], hy = [hyLow, hyHigh, hyLow, hyHigh];
  const at = (i) => { const a = path[Math.floor(i) % 4], b = path[(Math.floor(i) + 1) % 4], u = i % 1; return [[r1(a[0][0] + (b[0][0] - a[0][0]) * u), r1(a[0][1] + (b[0][1] - a[0][1]) * u)], a[1] + (b[1] - a[1]) * u]; };
  const k = [];
  for (let i = 0; i < 8; i++) { const n = at(i / 2), f = at((i / 2 + 2) % 4), y = (hy[Math.floor(i / 2)] + hy[(Math.floor(i / 2) + 1) % 4]) / 2, h = i % 2 ? y - 1.5 : hy[i / 2];
    k.push(fr(r1(h), n[0], r1(n[1]), f[0], r1(f[1]))); }
  return { k };
})();
// Ausfallschritte gehend (Seitenansicht, Kamera folgt der Hüfte): abwechselnd links und rechts. Unten wie beim Ausfallschritt (Riemann et al. 2012,
// hinteres Knie knapp über dem Boden, LUNGE); dazwischen Aufrichten mit Durchschwingen des hinteren Beins und Aufsetzen ≈ 21 weiter vorn.
const WLG = (() => {
  const H = LUNGE.H, fx = r1(-H[0]), hb = H[1], tx = r1(fx + 21); // Hüfte bei x = 0; vorderer Knöchel unten bei +72, beim Aufsetzen 21 weiter vorn
  const ballB = r1(fx + LUNGE.ballX), ballT = r1(ballB + 21); // hinterer Ballen unten bzw. beim Aufsetzen (die Füße wandern im Bild nach hinten)
  const flat = (x) => ({ ankle: [x, -15], foot: 90 }), onBall = (x, phi) => ({ ball: x, foot: phi, ankle: footAnkle([x, -2], phi) }), air = { ankle: [-10, -50], foot: 110 };
  const hT = r1(-15 - Math.sqrt(164 ** 2 - tx ** 2));
  // Zustände [Hüfthöhe, nahes Bein, fernes Bein]; zwischen zwei Zuständen je 3 Teilbilder mit gemittelten Zielen (Ballen bleibt am Boden)
  const S = [[hb, flat(fx), onBall(ballB, LUNGE.phiB)], [-180, flat(10), air], [hT, onBall(ballT, 110), flat(tx)],
    [hb, onBall(ballB, LUNGE.phiB), flat(fx)], [-180, air, flat(10)], [hT, flat(tx), onBall(ballT, 110)]];
  const mixT = (a, b, u) => (a.ball !== undefined && b.ball !== undefined ? onBall(r1(a.ball + (b.ball - a.ball) * u), r1(a.foot + (b.foot - a.foot) * u))
    : { ankle: [r1(a.ankle[0] + (b.ankle[0] - a.ankle[0]) * u), r1(a.ankle[1] + (b.ankle[1] - a.ankle[1]) * u)], foot: r1(a.foot + (b.foot - a.foot) * u) });
  const pose = (hy, n, f) => ({ root: 'hip', rootPos: [0, hy], trunk: 3, ...legTo([0, hy], n.ankle), foot: n.foot, leg2: { ankle: f.ankle, foot: f.foot } });
  const k = [], seg = [];
  for (let i = 0; i < 6; i++) { const A = S[i], B = S[(i + 1) % 6];
    for (let j = 0; j < 3; j++) { const u = j / 3; k.push(pose(r1(A[0] + (B[0] - A[0]) * u), mixT(A[1], B[1], u), mixT(A[2], B[2], u))); seg.push(i); } }
  return { k, seg };
})();
// Belt Squat (Seitenansicht): Füße auf zwei Podesten (≈ 10 cm), Gurt um die Hüfte, Kette senkrecht zum Hebel unter dem Podest; Knöchel unter dem
// Gurt-Ansatz (Joseph et al. 2020). Rumpf möglichst aufrecht; Schienbein je Bild so gelöst, dass oben die Hüfte und unten der Gurt-Ansatz (≈ 22 vor dem
// Hüftgelenk) über dem Knöchel liegt (Gurt zieht senkrecht nach unten; Konvention). Tiefe 90° Kniebeugung (tiefste Testposition bei Varela-Olalla et al. 2024); Hände leicht am Griff vorn.
const BSQ = (() => {
  const PL = 20, root = { root: 'ankle', rootPos: [0, -15 - PL] };
  const solve = (knee, trunk) => { const sh = bisect((s) => solvePose({ ...root, shank: s, knee, trunk, ankle: s }).joints.hip[0] + 22 * knee / 90, -15, 60); // oben Hüfte über dem Knöchel, unten Hüftgelenk ≈ 22 dahinter (Gurt-Ansatz vorn an der Hüfte über dem Knöchel)
    return { shank: r1(sh), knee, trunk, ankle: r1(sh) }; };
  return { PL, root, top: solve(2, 2), mid: solve(45, 8), bottom: solve(90, 12), hand: [70, -170 - PL] };
})();
// Sissy Squat (Seitenansicht): Fußballen fest (Wurzel Ballen), Fersen heben sich, Knie wandern weit nach vorn, Hüfte gestreckt (Rumpf und
// Oberschenkel in einer Linie, Rücklage). Eine Hand hält einen Pfosten seitlich neben dem Körper. Keine Studie gefunden: alle Winkel Zeichenkonvention.
const SSQ = { post: 66, hand: [60, -200], ball: [30, -2] }; // Pfosten seitlich neben der Figur (hinter ihr gezeichnet), Hand in allen Bildern erreichbar

export const ANIMATIONS = [
  // ---------- Kniebeuge ----------
  {
    ref: 'back-squat', view: 'side', basis: 'measured',
    basisNote: 'Winkel aus Glassbrook et al. 2019 (3D, je 6 Gewichtheber hochstabig und 6 Kraftdreikämpfer tiefstabig, 74–83 % 1RM; Tabelle 4 am PDF geprüft). Rumpf- und Schienbeinneigung daraus berechnet.',
    tempo: { basis: 'protocol', note: '1,5 s ab / 1,5 s auf (Metronom in Yavuz & Erdag 2017); natürliches Tempo nicht gemessen.' },
    variants: [{ key: 'high', label: 'Hochstabig' }, { key: 'low', label: 'Tiefstabig' }],
    frames: {
      high: [
        { label: 'Oben', pose: { shank: K(0, 'S1', 'Standwert'), knee: V(10, 'S1', 'fulltext', '170° eingeschlossen'), hip: V(11, 'S1', 'fulltext', '169° eingeschlossen'), ankle: V(0, 'S1', 'fulltext'), armTargetTrunk: [-8, 15], armScale: [0.55, 0.95], elbowSide: -1, props: squatProps([-8, 15]) } },
        { label: 'Unten', pose: { shank: K(33, 'S1', 'gleich der Dorsalflexion (Fuß flach)'), knee: V(126, 'S1', 'fulltext', '54 ± 7° eingeschlossen'), hip: V(111, 'S1', 'fulltext', '69 ± 7° Thorax–Oberschenkel'), ankle: V(33, 'S1', 'fulltext', 'ROM 33 ± 4°'), armTargetTrunk: [-8, 15], armScale: [0.55, 0.95], elbowSide: -1, props: squatProps([-8, 15]) } }
      ],
      low: [
        { label: 'Oben', pose: { shank: K(0, 'S1', 'Standwert'), knee: V(4, 'S1', 'fulltext', '176° eingeschlossen'), hip: V(12, 'S1', 'fulltext', '168° eingeschlossen'), ankle: V(0, 'S1', 'fulltext'), armTargetTrunk: [-14, 3], armScale: [0.45, 0.5], elbowSide: -1, props: squatProps([-14, 3]) } },
        { label: 'Unten', pose: { shank: K(33, 'S1', 'gleich der Dorsalflexion (Fuß flach)'), knee: V(118, 'S1', 'fulltext', '62 ± 11° eingeschlossen'), hip: V(121, 'S1', 'fulltext', '59 ± 9° Thorax–Oberschenkel'), ankle: V(33, 'S1', 'fulltext', 'ROM 33 ± 6°'), armTargetTrunk: [-14, 3], armScale: [0.45, 0.5], elbowSide: -1, props: squatProps([-14, 3]) } }
      ]
    },
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0, 4] }, { a: 0, b: 1, dur: 1.5, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.4, label: 'Unten', kp: [3] }, { a: 1, b: 0, dur: 1.5, label: 'Aufstehen', kp: [2] }],
    keyPoints: [
      { short: 'Stange', anchor: 'bar', side: 'l', status: 'consensus', text: 'Hochstabig: Oberkörper aufrechter. Tiefstabig: mehr Vorlage. Beides ist korrekt.', src: ['S1', 'S2', 'S3'],
        explain: 'Die hochstabige Variante (Stange auf dem Trapezmuskel) läuft mit aufrechterem Rumpf und mehr Knie- und Sprunggelenkbeugung, die tiefstabige (Stange über der hinteren Schulter) mit mehr Vorlage. In Murawa et al. 2020 unterschied sich der Hüftwinkel zwischen beiden nicht signifikant. Keine Variante ist „richtiger“; sie verteilen die Last anders.' },
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'contested', text: 'Knie dürfen über die Zehen wandern; das verteilt die Last zwischen Knie und Hüfte.', src: ['S5', 'S4', 'S6'],
        explain: 'Umstritten. Wird das Knie am Vorwandern gehindert, sinkt das Kniedrehmoment (117 statt 150 N·m), aber das Hüftdrehmoment steigt stark (303 statt 28 N·m) und der Rumpf neigt sich weiter vor (Fry et al. 2003, n = 7). Bei der Kraftdreikampf-Kniebeuge im breiten Stand wurde ein möglichst senkrechtes Schienbein angewiesen; der Körperschwerpunkt wanderte dadurch nach hinten (Swinton et al. 2012, n = 12 Kraftdreikämpfer). Die Regel „Knie nicht über die Zehen“ gilt in der Übersicht von Straub & Powers 2024 als Lastverteilung, nicht als Fehler.' },
      { short: 'Rücken', anchor: 'back', side: 'l', status: 'single', text: 'Vorlage aus der Hüfte, Rücken neutral halten statt rund werden lassen.', src: ['S6'],
        explain: 'Empfehlung aus einem klinischen Kommentar (Evidenzstufe 5) zur Belastbarkeit der Wirbelsäule. Daten, dass eine bestimmte Rückenhaltung Verletzungen verhindert, gibt es dazu nicht.' },
      { short: 'Tiefe', anchor: 'hip', side: 'l', status: 'contested', text: 'Tiefe nach Beweglichkeit: so tief, wie Becken und Rücken stabil bleiben.', src: ['S10', 'S11', 'S6'],
        explain: 'Umstritten. Für die tiefe Kniebeuge: mehr Zuwachs an Adduktoren, Gesäß und tiefer 1RM nach 10 Wochen (Kubo et al. 2019, n = 17); eine Übersicht fand keine Belege für ein höheres Risiko passiver Strukturen (Hartmann et al. 2013). Dagegen: Straub & Powers 2024 raten, die Tiefe dort zu begrenzen, wo die Hüftbeugung ausgeschöpft ist und das Becken nach hinten kippt. Einteilung: teilweise 0–90°, parallel 90–110°, tief 110–135° Kniebeugung.' },
      { short: 'Stand', anchor: 'foot', side: 'r', status: 'single', text: 'Füße etwa schulterbreit, Zehen leicht nach außen; Knie folgen der Fußrichtung.', src: ['S7', 'S6'],
        explain: 'Lorenzetti et al. 2018 (n = 42, 0 und 50 % Körpergewicht) empfehlen etwa 20° Fußöffnung bei schulterbreitem Stand und raten von Extremen ab. Eine Fußöffnung von 30° änderte die Aktivität von Quadrizeps und Beinbeuger nicht (Übersicht Straub & Powers 2024). Einzelstudie, kein Beweis für ein Optimum.' }
    ],
    sources: {
      S1: { label: 'Glassbrook et al. 2019, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000001836', read: 'fulltext', note: 'Akzeptiertes Manuskript; Tabelle 4, Block 74–83 % 1RM' },
      S2: { label: 'Glassbrook et al. 2017, J Strength Cond Res (Review)', url: 'https://doi.org/10.1519/JSC.0000000000002007', read: 'abstract' },
      S3: { label: 'Murawa et al. 2020, PeerJ', url: 'https://doi.org/10.7717/peerj.9256', read: 'fulltext' },
      S4: { label: 'Swinton et al. 2012, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3182577067', read: 'fulltext' },
      S5: { label: 'Fry et al. 2003, J Strength Cond Res', url: 'https://doi.org/10.1519/1533-4287(2003)017<0629:eokpoh>2.0.co;2', read: 'abstract' },
      S6: { label: 'Straub & Powers 2024, Int J Sports Phys Ther (klinischer Kommentar)', url: 'https://doi.org/10.26603/001c.94600', read: 'fulltext' },
      S7: { label: 'Lorenzetti et al. 2018, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/s13102-018-0103-7', read: 'fulltext' },
      S10: { label: 'Kubo et al. 2019, Eur J Appl Physiol', url: 'https://doi.org/10.1007/s00421-019-04181-y', read: 'abstract' },
      S11: { label: 'Hartmann et al. 2013, Sports Med (Review)', url: 'https://doi.org/10.1007/s40279-013-0073-6', read: 'abstract' }
    }
  },

  // ---------- Kreuzheben ----------
  {
    ref: 'deadlift', view: 'side', basis: 'measured',
    basisNote: 'Knie- und Sprunggelenkwinkel aus Hanen et al. 2025 (3D, 30 trainierte Männer, 85 % 1RM, Volltext). Der Hüftwinkel der Studie ist ein Becken–Oberschenkel-Winkel; die Rumpfneigung ist deshalb aus der Geometrie gelöst: Die Stange liegt am Start über dem Mittelfuß am Schienbein und auf Kniehöhe vor der Kniescheibe, die gestreckten Arme (Armlänge nach ANSUR II) reichen von der Schulter zur Stange. Oben zeigt der Arm leicht nach vorn zur Stange am Oberschenkel.',
    tempo: { basis: 'computed', note: 'Konzentrisch ≈ 1,3 s aus 0,40 m/s mittlerer Geschwindigkeit bei 80–89 % 1RM (Kasovic et al. 2019) und ≈ 0,5 m Hubweg; Absenken nicht gemessen (Konvention).' },
    frames: [
      { label: 'Start', pose: { shank: V(11.7, 'S1', 'computed', 'gleich der Dorsalflexion (Fuß flach)'), knee: V(58.6, 'S1', 'fulltext'), ankle: V(11.7, 'S1', 'fulltext'), solve: { param: 'trunk', joint: 'shoulder', at: DL_BAR.start, dist: ARM_REACH, range: [-10, 95] }, trunk: null, armAt: DL_BAR.start, elbow: C(0), props: handPlate } },
      { label: 'Knie', pose: { shank: V(0, 'S1', 'fulltext', 'Sprunggelenk ≈ 0°'), knee: V(25.2, 'S1', 'fulltext'), ankle: V(0, 'S1', 'fulltext'), solve: { param: 'trunk', joint: 'shoulder', at: DL_BAR.knee, dist: ARM_REACH, range: [-10, 95] }, trunk: null, armAt: DL_BAR.knee, elbow: C(0), props: handPlate } },
      { label: 'Oben', pose: { shank: V(0, 'S1', 'fulltext'), knee: V(6.5, 'S1', 'fulltext'), hip: V(3.7, 'S1', 'fulltext', 'Lockout 3,7°'), ankle: V(0, 'S1', 'fulltext'), armAt: DL_BAR.top, elbow: C(0), props: handPlate } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Start', kp: [0] }, { a: 0, b: 1, dur: 0.6, label: 'Zug bis Knie', kp: [1, 3] }, { a: 1, b: 2, dur: 0.7, label: 'Hüfte streckt', kp: [2] }, { a: 2, b: 2, dur: 0.4, label: 'Oben', kp: [4] }, { a: 2, b: 1, dur: 0.7, label: 'Absenken', kp: [1] }, { a: 1, b: 0, dur: 0.6, label: 'Absenken', kp: [3] }],
    keyPoints: [
      { short: 'Start', anchor: 'bar', side: 'r', status: 'consensus', text: 'Start: Stange über dem Mittelfuß, Hüfte tiefer als die Schultern, Arme gestreckt.', src: ['S1', 'S3', 'S9'],
        explain: 'Hüfte unter Schulterhöhe und gestreckte Arme sind die Startdefinitionen der Messstudien. „Stange über dem Mittelfuß“ stützt sich auf eine kleine Studie (n = 6): Start über dem Kahnbein ergab weniger horizontale Stangenbewegung als über den Zehengrundgelenken (37,5 statt 66,7 mm bei 90 % 1RM; Hancock et al. 2012). Schwach: 1RM nur selbst angegeben, 4 von 6 Teilnehmern rundeten unter der Last den Rücken.' },
      { short: 'Nah', anchor: 'shin', side: 'r', status: 'consensus', text: 'Stange während des ganzen Zugs nah an Schienbeinen und Oberschenkeln führen.', src: ['S2', 'S3', 'S6'],
        explain: 'Der horizontale Abstand Hüfte–Stange bestimmt das Hüftdrehmoment; er sank in Shoji et al. 2025 von ≈ 30 cm am Start auf ≈ 14 cm am Ende, bei schwererer Last kürzer. Geübte Heber halten die Stange beim Knie näher am Körper (Schellenberg et al. 2013, Einleitung).' },
      { short: 'Hüfte', anchor: 'hip', side: 'l', status: 'single', text: 'Knie und Hüfte strecken; ab Kniehöhe schiebt vor allem die Hüfte nach vorn.', src: ['S1', 'S5'],
        explain: 'Bis zum Knie bewegen sich Knie (33°) und Hüfte (38°) ähnlich viel, danach vor allem die Hüfte (49° gegenüber 19° Knie; Hanen et al. 2025). Hales et al. 2009 beschreiben das Kreuzheben als sequenziell.' },
      { short: 'Rücken', anchor: 'back', side: 'l', status: 'contested', text: 'Rücken möglichst neutral halten – leichte Rundung unter hoher Last ist häufig.', src: ['S2', 'S6', 'S7'],
        explain: 'Umstritten, was „neutral“ bedeutet. Gemessen: Elite-Heber blieben 1,5–13° unter ihrer vollen Lendenbeugung (Cholewicki & McGill 1992, n = 4); trotz Anweisung „keine Lendenbeugung“ traten ≈ 26° auf (Schellenberg et al. 2013); die Beugung nimmt mit der Last zu und verkürzt den Hebelarm (Shoji et al. 2025). Keine gelesene Studie verbindet ein bestimmtes Maß an Rundung mit Verletzungen.' },
      { short: 'Oben', anchor: 'chest', side: 'r', status: 'consensus', text: 'Oben aufrecht stehen, Hüfte und Knie ganz gestreckt; dann kontrolliert absenken.', src: ['S1', 'S3'],
        explain: 'Lockout in Hanen et al. 2025: Hüfte 3,7°, Knie 6,5° Beugung – aufrecht, nicht überstreckt.' }
    ],
    sources: {
      S1: { label: 'Hanen et al. 2025, Front Bioeng Biotechnol', url: 'https://doi.org/10.3389/fbioe.2025.1597209', read: 'fulltext' },
      S2: { label: 'Schellenberg et al. 2013, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/2052-1847-5-27', read: 'fulltext' },
      S3: { label: 'Otsuka et al. 2021, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0251418', read: 'fulltext' },
      S5: { label: 'Hales et al. 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181bc1d2a', read: 'abstract' },
      S6: { label: 'Shoji et al. 2025, Front Sports Act Living', url: 'https://doi.org/10.3389/fspor.2025.1682991', read: 'fulltext' },
      S7: { label: 'Cholewicki & McGill 1992, J Biomech', url: 'https://doi.org/10.1016/0021-9290(92)90242-s', read: 'abstract' },
      S8: { label: 'Kasovic et al. 2019, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003377', read: 'abstract' },
      S9: { label: 'Hancock, Wyatt & Kilgore 2012, Int J Exerc Sci', url: 'https://digitalcommons.wku.edu/ijes/vol5/iss3/1', read: 'fulltext' }
    }
  },

  // ---------- Rumänisches Kreuzheben ----------
  {
    ref: 'romanian-deadlift', view: 'side', basis: 'measured',
    basisNote: 'Hüft- und Kniewinkel aus Sørensen et al. 2021 (3D, 21 Handballspielerinnen, 8RM, Volltext); Rumpfneigung daraus berechnet, Schienbein nahezu senkrecht (Konvention).',
    tempo: { basis: 'computed', note: 'Aus mittleren Hüft-Winkelgeschwindigkeiten (Sørensen et al. 2021): exzentrisch ≈ 0,9 s; konzentrisch dort explosiv (≈ 0,4 s), hier langsamer gezeigt.' },
    frames: [
      { label: 'Oben', pose: { shank: C(3), knee: V(8.4, 'S11', 'fulltext'), hip: V(9.7, 'S11', 'fulltext'), ankle: C(3), armPlumb: true, elbow: C(0), props: handPlate } },
      { label: 'Unten', pose: { shank: C(5), knee: V(34.8, 'S11', 'fulltext'), hip: V(100.2, 'S11', 'fulltext'), ankle: C(5), armPlumb: true, elbow: C(0), props: handPlate } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [4] }, { a: 0, b: 1, dur: 1.1, label: 'Absenken', kp: [0, 1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [3] }, { a: 1, b: 0, dur: 0.9, label: 'Aufrichten', kp: [1, 2] }],
    keyPoints: [
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'consensus', text: 'Knie leicht gebeugt halten; die Bewegung kommt aus der Hüfte.', src: ['S10', 'S11'],
        explain: 'Kniebeugung unten 15–35°: Definition ≈ 15° (Lee et al. 2018), gemessen 33° bis zum Boden (Lee et al. 2018) und 34,8 ± 9,7° bis unter das Knie (Sørensen et al. 2021).' },
      { short: 'Hüfte', anchor: 'glute', side: 'l', status: 'single', text: 'Hüfte nach hinten schieben, Oberkörper neigt sich nach vorn.', src: ['S11'],
        explain: 'Hüftbeugung unten 100,2 ± 7,5° (Sørensen et al. 2021). Die Rumpfneigung selbst wurde nicht gemessen; in der Animation ist sie aus Hüft- und Kniewinkel berechnet.' },
      { short: 'Stange', anchor: 'bar', side: 'r', status: 'single', text: 'Stange eng an den Oberschenkeln entlang nach unten führen.', src: ['S10'],
        explain: 'Der enge Kontakt der Stange zu den Beinen unterscheidet das rumänische vom gestreckten Kreuzheben (Definition in Lee et al. 2018). Ein gemessener Stangenweg liegt nicht vor.' },
      { short: 'Tiefe', anchor: 'hand', side: 'r', status: 'contested', text: 'Tiefe: bis knapp unter das Knie oder so weit, wie der Rücken stabil bleibt.', src: ['S10', 'S11'],
        explain: 'Umstritten. Sørensen et al. 2021 und die von Lee et al. 2018 zitierten Studien senkten bis knapp unter das Knie; Lee et al. 2018 bis zum Boden, wobei einige Teilnehmer den Boden nicht erreichten (Autoren vermuten verkürzte Beinbeuger). Rumpf- und Lendenwinkel wurden für diese Übung nicht gemessen.' },
      { short: 'Oben', anchor: 'chest', side: 'r', status: 'single', text: 'Oben die Hüfte vollständig strecken; der Oberkörper bleibt senkrecht.', src: ['S11'],
        explain: 'Oben 9,7 ± 5,9° Hüftbeugung (Sørensen et al. 2021). Dass man sich nicht nach hinten lehnen soll, ist Trainingswissen, nicht untersucht.' }
    ],
    sources: {
      S10: { label: 'Lee et al. 2018, J Exerc Sci Fit', url: 'https://doi.org/10.1016/j.jesf.2018.08.001', read: 'fulltext' },
      S11: { label: 'Sørensen et al. 2021, Int J Sports Phys Ther', url: 'https://doi.org/10.26603/001c.24150', read: 'fulltext', note: '23 Teilnehmerinnen rekrutiert, 21 ausgewertet (2 wegen Markerverlust ausgeschlossen)' }
    }
  },

  // ---------- Hip Thrust ----------
  {
    ref: 'hip-thrust', view: 'side', basis: 'measured',
    basisNote: 'Hüft- und Kniewinkel unten aus Brazil et al. 2021 (3D, 19 trainierte Männer, 70 % 1RM, Volltext); Kniewinkel oben aus Sørensen et al. 2021; Hüftwinkel oben nicht berichtet (rechnerische Untergrenze). Schienbeinneigung so gelöst, dass der obere Rücken auf der Bank liegt.',
    tempo: { basis: 'measured', note: 'Hochdrücken 0,83 ± 0,15 s bei 70 % 1RM mit maximaler Absicht (Brazil et al. 2021); Absenken 1,48 ± 0,42 s bei 70 % 1RM (Bezodis et al. 2017, n = 7).' },
    frames: [
      { label: 'Unten', pose: { knee: V(108, 'S13', 'fulltext', '−108 ± 8° bei 51 % des Hubs'), hip: V(83, 'S13', 'fulltext', '−83 ± 16° am Spitzenmoment'), foot: C(90, 'Fuß flach'), solve: { param: 'shank', joint: 'shoulder', y: -88, range: [-30, 70] }, armTargetTrunk: [22, -98], armScale: [0.6, 0.9], elbowSide: 1, props: hipThrustProps } },
      { label: 'Oben', pose: { knee: V(76.1, 'S11', 'fulltext', 'HT 90°, gestrecktes Ende'), hip: K(10, ['S13', 'S3'], 'Untergrenze ≈ 8° aus Start minus ROM; Definition „Rumpf parallel zum Boden“'), foot: C(90, 'Fuß flach'), solve: { param: 'shank', joint: 'shoulder', y: -88, range: [-30, 70] }, armTargetTrunk: [22, -98], armScale: [0.6, 0.9], elbowSide: 1, props: hipThrustProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 0.83, label: 'Hochdrücken', kp: [2, 3] }, { a: 1, b: 1, dur: 0.5, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 1.5, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Aufbau', anchor: 'upperBack', side: 'l', status: 'consensus', text: 'Oberer Rücken auf der Bank, Stange über der Hüfte, Füße schulterbreit flach am Boden.', src: ['S3', 'S11', 'S13'],
        explain: 'Aufbau der Messstudien: Schulterblätter auf einer 0,36 m hohen Bank (Otsuka et al. 2021), Stange auf dem Becken bzw. oberen Oberschenkel, Füße flach und schulterbreit.' },
      { short: 'Füße', anchor: 'foot', side: 'r', status: 'contested', text: 'Füße so stellen, dass die Schienbeine oben etwa senkrecht stehen.', src: ['S3', 'S11'],
        explain: 'Umstritten. Otsuka et al. 2021 ließen die Schienbeine senkrecht halten. In Sørensen et al. 2021 erhöhten weiter entfernte Füße (≈ 57° Kniebeugung oben) die Beinbeuger-Aktivität gegenüber ≈ 76°. Die Fußposition verschiebt den Schwerpunkt der Belastung; ein Optimum ist nicht belegt.' },
      { short: 'Oben', anchor: 'hip', side: 'r', status: 'single', text: 'Hüfte strecken, bis Oberkörper und Oberschenkel etwa waagerecht in einer Linie sind.', src: ['S3'],
        explain: 'Endkriterium „Rumpf parallel zum Boden“ (Otsuka et al. 2021). Mit einer 0,36 m hohen Bank erreichten dort einige Teilnehmer die neutrale Hüfte nicht; der Hüftwinkel oben wurde in keiner gelesenen Studie berichtet.' },
      { short: 'Rücken', anchor: 'lowBack', side: 'l', status: 'single', text: 'Bewegung aus der Hüfte; der untere Rücken bewegt sich nur wenig mit.', src: ['S13'],
        explain: 'Becken–Rumpf-Bewegung 12 ± 21° gegenüber 75 ± 19° in der Hüfte (Brazil et al. 2021); einzelne Teilnehmer streckten, andere beugten den Lenden-Becken-Bereich.' },
      { short: 'Ab', anchor: 'bar', side: 'r', status: 'consensus', text: 'Kontrolliert absenken, bis die Scheiben (fast) den Boden berühren.', src: ['S3', 'S13'],
        explain: 'In beiden Messstudien begann jede Wiederholung aus der Ruhe mit den Scheiben am oder nahe am Boden.' }
    ],
    sources: {
      S13: { label: 'Brazil et al. 2021, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0249307', read: 'fulltext' },
      S3: { label: 'Otsuka et al. 2021, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0251418', read: 'fulltext' },
      S11: { label: 'Sørensen et al. 2021, Int J Sports Phys Ther', url: 'https://doi.org/10.26603/001c.24150', read: 'fulltext' },
      S14: { label: 'Bezodis et al. 2017, ISBS Proceedings (Konferenzbeitrag)', url: 'https://commons.nmu.edu/isbs/vol35/iss1/184', read: 'fulltext' }
    }
  },

  // ---------- Bulgarian Split Squat ----------
  {
    ref: 'bulgarian-split-squat', view: 'side', basis: 'measured',
    basisNote: 'Rumpf-, Schienbein- und Hüftwinkel unten aus Arakawa et al. 2025 (3D, 9 trainierte Männer, Körpergewicht, breiter Stand 130 % Beinlänge, natürliche Rumpfneigung; Tabelle 1 am PDF geprüft); Kniewinkel daraus berechnet (106°; Mackey & Riemann 2021 nennen ≈ 96°). Hinteres Bein aus der Bankhöhe gelöst.',
    tempo: { basis: 'computed', note: '2,39 ± 0,32 s je Wiederholung ohne Metronom (Mackey & Riemann 2021), hier gleichmäßig auf Ab und Auf verteilt.' },
    frames: [
      { label: 'Oben', pose: { shank: C(8), knee: C(20), hip: C(20), ankle: C(8), leg2: { ankle: [-122, -104], foot: C(200) }, armPlumb: true, elbow: C(0), props: bssProps } },
      { label: 'Unten', pose: { shank: V(28.6, 'S2', 'fulltext', 'Schienbein 28,6 ± 6,7°'), knee: K(106, 'S2', 'aus Rumpf 13,4°, Schienbein 28,6° und Hüfte 90,8°'), hip: V(90.8, 'S2', 'fulltext', '89,2 ± 8,8° (180° = Stand)'), ankle: V(28.6, 'S2', 'computed', 'gleich der Schienbeinneigung'), leg2: { ankle: [-122, -104], foot: C(200) }, armPlumb: true, elbow: C(0), props: bssProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 1.2, label: 'Absenken', kp: [2, 3] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [2, 4] }, { a: 1, b: 0, dur: 1.2, label: 'Aufstehen', kp: [4] }],
    keyPoints: [
      { short: 'Hinten', anchor: 'ankle2', side: 'l', status: 'consensus', text: 'Hinteren Fuß mit dem Spann auf eine Bank legen, etwa auf Kniehöhe.', src: ['S1', 'S2', 'S3', 'S8'],
        explain: 'Bankhöhe in den Studien 0,40–0,41 m bzw. Kniescheiben- oder Schienbeinhöhe.' },
      { short: 'Vorne', anchor: 'foot', side: 'r', status: 'contested', text: 'Vorderen Fuß so weit vorn aufsetzen, dass das Knie unten etwa über dem Fuß steht.', src: ['S1', 'S2', 'S6'],
        explain: 'Umstritten. Abstand 100–130 % der Beinlänge (Arakawa et al. 2025) oder „Knie über den Zehen in der Parallelposition“ (Mackey & Riemann 2021). Ein längerer Schritt verlagert die Last vom Knie zur Hüfte (Song et al. 2023, normaler Split Squat).' },
      { short: 'Tiefe', anchor: 'thigh', side: 'r', status: 'consensus', text: 'Senkrecht absenken, bis der vordere Oberschenkel etwa waagerecht ist.', src: ['S1', 'S2', 'S3'],
        explain: 'Ziel ≈ 90° Knie (Mackey & Riemann 2021), Oberschenkel parallel (Arakawa et al. 2025) oder bis das hintere Knie den Boden berührt (Aygun-Polat et al. 2025).' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'contested', text: 'Oberkörper leicht nach vorn neigen; mehr Neigung betont Gesäß und Beinbeuger.', src: ['S2', 'S3'],
        explain: 'Umstritten. Natürlich ≈ 13° Vorneigung (berechnet aus Arakawa et al. 2025); 40° Vorneigung erhöhte die EMG-Aktivität von Gesäß und Beinbeuger (Aygun-Polat et al. 2025); ein aufrechterer Rumpf erhöht das Moment am hinteren Bein (Arakawa et al. 2025).' },
      { short: 'Last', anchor: 'knee', side: 'r', status: 'single', text: 'Last liegt vor allem auf dem vorderen Bein, das hintere Bein stützt nur.', src: ['S4'],
        explain: 'Der vordere Fuß trug 84 % der Vertikalkraft (Helme et al. 2022, n = 26, 5RM).' }
    ],
    sources: {
      S1: { label: 'Mackey & Riemann 2021, Int J Exerc Sci', url: 'https://doi.org/10.70252/CIYT8956', read: 'fulltext' },
      S2: { label: 'Arakawa et al. 2025, Int J Exerc Sci', url: 'https://doi.org/10.70252/NEXQ5666', read: 'fulltext', note: 'Tabelle 1, breiter Stand, natürliche Rumpfneigung' },
      S3: { label: 'Aygun-Polat et al. 2025, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/s13102-025-01306-z', read: 'fulltext' },
      S4: { label: 'Helme et al. 2022, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003727', read: 'abstract' },
      S6: { label: 'Song et al. 2023, Front Bioeng Biotechnol', url: 'https://doi.org/10.3389/fbioe.2023.1277493', read: 'fulltext' },
      S8: { label: 'Miller et al. 2019, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003338', read: 'abstract' }
    }
  },

  // ---------- Ausfallschritt vorwärts ----------
  {
    ref: 'dumbbell-forward-lunge', view: 'side', basis: 'measured',
    basisNote: 'Spitzenwinkel des vorderen Beins aus Riemann et al. 2012 (elektromagnetische Bewegungsmessung, 16 Personen, barfuß; Tabelle 1 am PDF geprüft). Rumpf daraus berechnet (≈ 0°, passt zur Anweisung „aufrecht“). Seit v2.20.0 liegt das hintere Knie unten knapp über dem Boden unter der Hüfte (Konvention); daraus folgt die Schrittlänge (≈ 0,69 m vom hinteren Ballen zum vorderen Knöchel, berechnet). Vorher klappte das Knie bei der kürzeren Schrittlänge nach vorn. Die Hüftbahn beim Schritt (nach vorn und abwärts, ohne Zurückrutschen) und das hintere Bein sind Konvention.',
    tempo: { basis: 'protocol', note: 'Absenken in ≈ 2 s (Metronom, Riemann et al. 2012); Schritt und Rückkehr nicht gemessen.' },
    frames: [
      { label: 'Stand', pose: { rootPos: [0, -15], shank: C(0), knee: C(0), hip: C(0), ankle: C(0), leg2: { hip: C(0), knee: C(0), ankle: C(0) }, armPlumb: true, elbow: C(0), props: lungeProps } },
      { label: 'Schritt', pose: { rootPos: FWL.swing.ankle, shank: C(FWL.swing.leg.shank, 'aus der Hüftbahn gelöst'), knee: C(FWL.swing.leg.knee), trunk: C(3), ankle: C(10), leg2: FWL.back(90), armPlumb: true, elbow: C(0), props: lungeProps } },
      { label: 'Aufsetzen', pose: { rootPos: FWL.F, shank: C(FWL.touch.leg.shank, 'aus der Hüftbahn gelöst'), knee: C(FWL.touch.leg.knee), trunk: C(4), ankle: C(FWL.touch.leg.shank, 'Fuß flach'), leg2: FWL.back(110), armPlumb: true, elbow: C(0), props: lungeProps } },
      { label: 'Unten', pose: { rootPos: FWL.F, shank: V(11.4, 'L1', 'computed', 'gleich der Dorsalflexion'), knee: V(96.4, 'L1', 'fulltext', '−96,4 ± 10,7°'), hip: V(84.3, 'L1', 'fulltext', '−84,3 ± 14,9°'), ankle: V(11.4, 'L1', 'fulltext', '−11,4 ± 8,1°'), leg2: FWL.back(LUNGE.phiB), armPlumb: true, elbow: C(0), props: lungeProps },
        facts: [K(LUNGE.step, 'L1', 'Schrittlänge Ballen hinten – Knöchel vorn (Einheiten; ≈ 77 % der Hüfthöhe): folgt aus den gemessenen Winkeln vorn und dem hinteren Knie knapp über dem Boden')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Stand', kp: [4] }, { a: 0, b: 1, dur: 0.45, label: 'Schritt', kp: [0] }, { a: 1, b: 2, dur: 0.4, label: 'Aufsetzen', kp: [0] }, { a: 2, b: 3, dur: 1.0, label: 'Absenken', kp: [1, 2] }, { a: 3, b: 3, dur: 0.3, label: 'Unten', kp: [2] }, { a: 3, b: 2, dur: 0.8, label: 'Abdrücken', kp: [3] }, { a: 2, b: 1, dur: 0.4, label: 'Zurück', kp: [3] }, { a: 1, b: 0, dur: 0.45, label: 'Stand', kp: [] }],
    keyPoints: [
      { short: 'Schritt', anchor: 'foot', side: 'r', status: 'contested', text: 'Mit einem großen Schritt nach vorn treten, etwa 70–100 % der Beinlänge.', src: ['L1', 'L3', 'L4'],
        explain: 'Umstritten. 70 % Beinlänge (Riemann et al. 2012) bis 100 % (Stastny et al. 2015). Ein kurzer Schritt erhöht die Last im Kniescheibengelenk bei 70–90° Kniebeugung (Escamilla et al. 2008).' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper aufrecht halten; leichte Vorneigung verlagert Arbeit zur Hüfte.', src: ['L1', 'L5'],
        explain: 'Aufrecht in Riemann et al. 2012 und Stastny et al. 2015; ein vorgeneigter Rumpf erhöhte Hüftbeugung und Hüftstrecker-Impuls (Farrokhi et al. 2008, n = 10).' },
      { short: 'Tiefe', anchor: 'knee', side: 'r', status: 'single', text: 'Absenken, bis das vordere Knie etwa 90° gebeugt ist.', src: ['L1'],
        explain: 'Gemessene Spitzenbeugung 92–96° (Riemann et al. 2012), Zusatzlast änderte die Winkel nicht signifikant.' },
      { short: 'Abdruck', anchor: 'thigh', side: 'r', status: 'single', text: 'Über das vordere Bein kräftig abdrücken und zurück in den Stand gehen.', src: ['L1'],
        explain: 'Kinematisch dominiert das Knie, kinetisch die Hüftstrecker; Zusatzlast erhöhte die Arbeit von Hüfte und Sprunggelenk, nicht des Knies (Riemann et al. 2012).' },
      { short: 'Hanteln', anchor: 'hand', side: 'l', status: 'single', text: 'Hanteln locker seitlich am Körper hängen lassen.', src: ['L1'],
        explain: 'Lasten in beiden Händen mit den Armen an der Seite; jede Hand trug die Hälfte der Zusatzlast von 12,5–50 % des Körpergewichts (Riemann et al. 2012).' }
    ],
    sources: {
      L1: { label: 'Riemann et al. 2012, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-47.4.16', read: 'fulltext' },
      L3: { label: 'Stastny et al. 2015, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000000976', read: 'fulltext' },
      L4: { label: 'Escamilla et al. 2008, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2008.2694', read: 'abstract' },
      L5: { label: 'Farrokhi et al. 2008, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2008.2634', read: 'abstract' }
    }
  },

  // ---------- Wadenheben stehend ----------
  {
    ref: 'standing-calf-raise', view: 'side', basis: 'measured',
    basisNote: 'Sprunggelenkwinkel aus Larsen et al. 2025 (23 Trainierte, Volltext): individuell per Goniometer eingestellter Bewegungsumfang, keine Bewegungsmessung unter Last. Körper über dem Fußballen senkrecht; Stufe ≈ 14 cm hoch, nur unter dem Vorfuß, die Ferse hängt frei (Konvention).',
    tempo: { basis: 'protocol', note: '1 s hoch, 2 s runter, kurz halten unten (Trainingsprotokolle Goli et al. 2026, Larsen et al. 2025).' },
    frames: [
      { label: 'Unten', pose: { root: 'toe', rootPos: [30, -STEP - 2], shank: C(0), knee: V(0, 'S1', 'protocol', 'Knie gestreckt'), hip: C(0), ankle: V(31, 'S1', 'fulltext', '−31 ± 6,8° (Dorsalflexion)'), shoulder: C(25), elbow: C(95), armScale: [1, 0.9], props: calfProps } },
      { label: 'Oben', pose: { root: 'toe', rootPos: [30, -STEP - 2], shank: C(0), knee: V(0, 'S1', 'protocol', 'Knie gestreckt'), hip: C(0), ankle: V(-33.6, 'S1', 'fulltext', '+33,6 ± 7,8° Plantarflexion'), shoulder: C(25), elbow: C(95), armScale: [1, 0.9], props: calfProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Unten, kurz halten', kp: [0, 4] }, { a: 0, b: 1, dur: 1.0, label: 'Hochdrücken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Absenken', kp: [0, 3] }],
    keyPoints: [
      { short: 'Ferse', anchor: 'heel', side: 'l', status: 'contested', text: 'Unten die Ferse kontrolliert unter Stufenhöhe senken, bis die Wade gedehnt ist.', src: ['S1', 'S2', 'S5'],
        explain: 'Umstritten, wie viel die gedehnte Position bringt: Training im gedehnten Bereich ließ den inneren Wadenkopf stärker wachsen (Kassiano et al. 2023, Beinpresse); bei gleicher Gesamtlast kein Unterschied (Goli et al. 2026); schwache Hinweise zugunsten der Dehnung bei Larsen et al. 2025.' },
      { short: 'Ballen', anchor: 'toe', side: 'r', status: 'contested', text: 'Oben so hoch wie möglich auf den Fußballen drücken.', src: ['S1', 'S5'],
        explain: 'Umstritten, ob der obere Teil der Bewegung zusätzlich etwas bringt. Spitzen-Plantarflexion 33,6 ± 7,8° (Larsen et al. 2025). Training nur im oberen Bereich brachte das geringste Wachstum (Kassiano et al. 2023); ob der obere Teil zusätzlich etwas bringt, ist offen.' },
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'single', text: 'Knie gestreckt halten – so arbeitet der Wadenmuskel (Gastrocnemius) etwas stärker.', src: ['S3'],
        explain: 'Bei 45° Kniebeugung war die Aktivität des Gastrocnemius 5 % niedriger und die des Soleus 4 % höher als bei gestrecktem Knie (Hébert-Losier et al. 2012); die Autoren halten den Unterschied für klein.' },
      { short: 'Füße', anchor: 'foot', side: 'r', status: 'single', text: 'Fußspitzen gerade; nach außen oder innen verschiebt die Last leicht.', src: ['S4'],
        explain: 'Zehen nach außen begünstigten den inneren, nach innen den äußeren Wadenkopf (Nunes et al. 2020, an der Beinpresse gemessen).' },
      { short: 'Ruhig', anchor: 'shin', side: 'r', status: 'single', text: 'Ruhig bewegen: unten kurz halten, nicht federn.', src: ['S1', 'S2'],
        explain: 'Pause in der gedehnten Position (Larsen et al. 2025) und kein Federn (Goli et al. 2026) waren Protokollanweisungen, keine Messergebnisse.' }
    ],
    sources: {
      S1: { label: 'Larsen et al. 2025, Eur J Sport Sci', url: 'https://doi.org/10.1002/ejsc.70030', read: 'fulltext' },
      S2: { label: 'Goli et al. 2026, Int J Exerc Sci', url: 'https://doi.org/10.70252/IJES2026403', read: 'fulltext' },
      S3: { label: 'Hébert-Losier et al. 2012, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e31824435cf', read: 'abstract' },
      S4: { label: 'Nunes et al. 2020, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003674', read: 'abstract' },
      S5: { label: 'Kassiano et al. 2023, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000004460', read: 'abstract' }
    }
  },

  // ---------- Dips ----------
  {
    ref: 'dips', view: 'side', basis: 'measured', noFloor: true,
    basisNote: 'Ellbogen-, Schulter- und Rumpfwinkel aus McKenzie et al. 2022 (3D, 15 geübte Männer, V-Barren, selbst gewählte Technik; Tabelle 1 am PDF geprüft). Beinhaltung Konvention.',
    tempo: { basis: 'measured', note: '1,35 ± 0,32 s je Wiederholung, Tiefpunkt bei 53 % (McKenzie et al. 2022, nicht ermüdet).' },
    frames: [
      { label: 'Oben', pose: { root: 'wrist', rootPos: [0, -200], trunk: V(18.5, 'S1', 'fulltext', '18,49 ± 12,54° Vorneigung'), shoulder: V(-3, 'S1', 'fulltext', '2,99 ± 8,21° Extension'), elbow: V(18.2, 'S1', 'fulltext'), armScale: [0.9, 0.95], hip: C(25), knee: C(90), ankle: C(-20), props: dipProps } },
      { label: 'Unten', pose: { root: 'wrist', rootPos: [0, -200], trunk: V(30.3, 'S1', 'fulltext', '30,34 ± 21,06° am Tiefpunkt (Spitze 37°)'), shoulder: V(-67.7, 'S1', 'fulltext', '67,66 ± 11,34° Extension'), elbow: V(115.9, 'S1', 'fulltext'), armScale: [0.9, 0.95], hip: C(25), knee: C(90), ankle: C(-20), props: dipProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Oben', kp: [2] }, { a: 0, b: 1, dur: 0.72, label: 'Absenken', kp: [0, 1] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [0, 4] }, { a: 1, b: 0, dur: 0.63, label: 'Hochdrücken', kp: [3, 4] }],
    keyPoints: [
      { short: 'Tiefe', anchor: 'elbow', side: 'l', status: 'contested', text: 'Absenken, bis die Ellbogen etwa 90–115° gebeugt sind – Tiefe nicht erzwingen.', src: ['S1', 'S2', 'S4'],
        explain: 'Umstritten. Selbst gewählte Tiefe: ≈ 115° Ellbogenbeugung und 68–78° Schulterextension, also 76 % (Ermüdungsstudie) bzw. 88 % (Vergleich Bank-, Barren-, Ringdips) des zuvor gemessenen maximalen Bereichs (McKenzie et al. 2022). Getestet wurden 75–95° (Çinarli et al. 2021). Bedenken gegen endgradige Schulterextension stützen sich auf Fallberichte, nicht auf Verlaufsdaten.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper leicht nach vorn neigen, unten etwa 30–40° aus der Senkrechten.', src: ['S1', 'S2'],
        explain: 'Spitzenneigung 37 ± 10° (McKenzie et al. 2022); am Barren deutlich mehr als bei Bankdips (13°).' },
      { short: 'Oben', anchor: 'shoulder', side: 'l', status: 'single', text: 'Oben Arme weitgehend strecken, Körper ruhig über den Griffen.', src: ['S1'],
        explain: 'Ellbogen oben ≈ 17–18° Beugung bei selbst gewählter Technik (McKenzie et al. 2022).' },
      { short: 'Kontrolle', anchor: 'hip', side: 'r', status: 'single', text: 'Gegen Satzende auf Kontrolle achten – Fehlversuche gingen teils tiefer als üblich.', src: ['S1'],
        explain: 'Zwei von vier gescheiterten Wiederholungen überschritten den zuvor gemessenen maximalen Bewegungsumfang (Nebenbefund, McKenzie et al. 2022).' },
      { short: 'Ellbogen', anchor: 'uarm', side: 'l', status: 'single', text: 'Ellbogen nah am Körper führen.', src: ['S1', 'S2', 'S4'],
        explain: 'Anweisung in Çinarli et al. 2021. Gemessene Schulterabduktion ≈ 12° oben, ≈ 28° am Tiefpunkt, Spitze 31° kurz davor (McKenzie et al. 2022). Dass ein weiter Griff riskanter ist, wurde nur vermutet.' }
    ],
    sources: {
      S1: { label: 'McKenzie et al. 2022, Int J Environ Res Public Health (Ermüdung, Barrendip)', url: 'https://doi.org/10.3390/ijerph192114390', read: 'fulltext' },
      S2: { label: 'McKenzie et al. 2022, Int J Environ Res Public Health (Bank-, Barren-, Ringdips)', url: 'https://doi.org/10.3390/ijerph192013211', read: 'fulltext' },
      S4: { label: 'Çinarli et al. 2021, Kinesiologia Slovenica', url: 'https://journals.uni-lj.si/kinsi/article/view/29659', read: 'fulltext' }
    }
  },

  // ---------- Bankdrücken ----------
  {
    ref: 'bench-press-barbell', view: 'side', basis: 'measured', layout: 'rows',
    basisNote: 'Ellbogenwinkel unten aus Mausehund et al. 2022 (3D, 35 Personen, 6–8RM, mittlerer Griff; am PDF geprüft); Stangenposition aus Larsen et al. 2021/2022. Schulterwinkel in der Seitenansicht aus der Stangenposition gelöst; Arme außerhalb der Bildebene verkürzt dargestellt.',
    tempo: { basis: 'protocol', note: '2 s ab (Metronom, Bartolomei et al. 2024), Drücken ≈ 1 s (bei 1RM 1,0–1,4 s bis zur zweiten Geschwindigkeitsspitze, Larsen et al. 2021).' },
    frames: [
      { label: 'Oben', pose: { root: 'shoulder', rootPos: [0, -102], trunk: C(-90, 'liegend'), hip: C(-6), knee: C(99), foot: C(90, 'Fuß flach'), armPoints: { elbow: [4, -52], wrist: [8, -104] }, facts: [V(20, 'S1', 'computed', 'Ellbogen oben: Spitze 101,4° minus ROM 78,3° ≈ 23°; 0–20° vertretbar')], props: benchProps } },
      { label: 'Brust', pose: { root: 'shoulder', rootPos: [0, -102], trunk: C(-90, 'liegend'), hip: C(-6), knee: C(99), foot: C(90, 'Fuß flach'), armPoints: { elbow: [12, 14], wrist: [34, -36] }, facts: [V(101.4, 'S1', 'fulltext', 'Ellbogen unten 101,4 ± 8,3° (3D, mittlerer Griff); Oberarm 59,3 ± 8,2° vom Rumpf'), V(0.17, 'S3', 'fulltext', 'Stange ≈ 0,17 m fußwärts vom Schultergelenk')], props: benchProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [2] }, { a: 1, b: 1, dur: 0.15, label: 'Brust', kp: [2, 4] }, { a: 1, b: 0, dur: 1.0, label: 'Drücken', kp: [3] }],
    keyPoints: [
      { short: 'Aufbau', anchor: 'upperBack', side: 'l', status: 'consensus', text: 'Schulterblätter zurückziehen, Füße fest am Boden, Gesäß bleibt auf der Bank.', src: ['S5', 'S8'],
        explain: 'Fünf Kontaktpunkte (Kopf, Schulterblätter, Rumpf, Gesäß, Füße) sind die Technikdefinition in Bartolomei et al. 2024. Zurückgezogene Schulterblätter senkten in einer Modellrechnung die Kräfte im Schultergelenk und die Aktivität der Rotatorenmanschette (Noteboom et al. 2024, n = 10, 16 kg).' },
      { short: 'Griff', anchor: 'hand', side: 'r', status: 'contested', text: 'Griff etwa 1,4- bis 2-fach schulterbreit; enger Griff fordert den Trizeps stärker.', src: ['S2', 'S1', 'S8'],
        explain: 'Umstritten. Untersucht wurden 1,0–2,1-fache Schulterbreite. Mittlerer und weiter Griff erlaubten ein höheres 1RM als der enge (Larsen et al. 2021). Eng erhöht Ellbogenmomente und Trizepsanteil, weit die Schultermomente (Mausehund et al. 2022). Ein Griff bis 1,5-fach statt 2-fach schulterbreit senkte modellierte Schultergelenkkräfte; 1-fach erhöhte dafür die Scherkraft nach oben (Noteboom et al. 2024, n = 10, 16 kg, Modellrechnung).' },
      { short: 'Senken', anchor: 'elbow', side: 'r', status: 'contested', text: 'Stange kontrolliert zur unteren Brust senken, Oberarme ca. 45–65° vom Rumpf.', src: ['S1', 'S3', 'S8', 'S12'],
        explain: 'Umstritten. Schulterabduktion unten 38–66° je nach Griff und Anweisung (Mausehund et al. 2022); Studien geben ≈ 45° vor oder testen 45/70/90°. Berührungspunkt ≈ 16–18 cm fußwärts vom Schultergelenk (berechnet aus Larsen et al. 2022); ein „idealer“ Punkt ist nicht untersucht.' },
      { short: 'Weg', anchor: 'bar', side: 'r', status: 'consensus', text: 'Beim Drücken wandert die Stange leicht Richtung Schultern zurück.', src: ['S2', 'S3', 'S10', 'S11'],
        explain: 'Horizontaler Weg ≈ 13 cm (Larsen et al. 2021); Abstand Stange–Schulter 17 → 7–9 cm (Larsen et al. 2022); Geübte halten die Stange näher an den Schultern (Madsen & McLaughlin 1984).' },
      { short: 'Bogen', anchor: 'lowBack', side: 'l', status: 'contested', text: 'Leichtes Hohlkreuz ist möglich; ein starker Bogen verkürzt den Weg der Stange.', src: ['S5', 'S6', 'S13', 'S1'],
        explain: 'Umstritten. Mit Bogen +4,2 kg 1RM und 28–47 mm weniger Hubweg (Bartolomei et al. 2024); kein 1RM-Unterschied bei 11 Kraftdreikämpfern (García-Ramos et al. 2018); der Bogen senkte die Schultermomente um 8 % (Cudlip et al. 2022). Mittlerer Bogenwinkel 26–32° (Mausehund et al. 2022).' }
    ],
    sources: {
      S1: { label: 'Mausehund et al. 2022, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003948', read: 'fulltext' },
      S2: { label: 'Larsen, Gomo & van den Tillaar 2021, Front Sports Act Living', url: 'https://doi.org/10.3389/fspor.2020.637066', read: 'fulltext' },
      S3: { label: 'Larsen et al. 2022, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph192114238', read: 'fulltext' },
      S5: { label: 'Bartolomei et al. 2024, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000004778', read: 'fulltext' },
      S6: { label: 'García-Ramos et al. 2018, Sports Biomech', url: 'https://doi.org/10.1080/14763141.2018.1544662', read: 'abstract' },
      S8: { label: 'Noteboom et al. 2024, Front Physiol', url: 'https://doi.org/10.3389/fphys.2024.1393235', read: 'fulltext' },
      S10: { label: 'Madsen & McLaughlin 1984, Med Sci Sports Exerc', url: 'https://pubmed.ncbi.nlm.nih.gov/6493018/', read: 'abstract' },
      S11: { label: 'Duffey & Challis 2007, J Strength Cond Res', url: 'https://doi.org/10.1519/R-19885.1', read: 'abstract' },
      S12: { label: 'Rodríguez-Ridao et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17197339', read: 'fulltext' },
      S13: { label: 'Cudlip et al. 2022, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2022.2046937', read: 'abstract' }
    }
  },

  // ---------- Liegestütz ----------
  {
    ref: 'push-up', view: 'side', basis: 'measured',
    basisNote: 'Ellbogenbereich aus Suprak et al. 2013 (16 Personen; gemeinsamer Bereich 105° → 35°, am PDF geprüft) und San Juan et al. 2015 (Volltext). Körperlinie gerade (Anweisung); Rumpfneigung so gelöst, dass die Zehen am Boden bleiben.',
    tempo: { basis: 'protocol', note: '2 s ab, 2 s auf (Anweisung in Suprak et al. 2013 und San Juan et al. 2015).' },
    frames: [
      { label: 'Oben', pose: { root: 'wrist', rootPos: [0, -6], solve: { param: 'trunk', joint: 'toe', y: 0, range: [20, 89] }, hip: V(0, 'P2', 'protocol', 'Körperlinie ≈ 180°'), knee: C(0), foot: C(165), armPoints: { elbow: [3, 54], wrist: [6, 104] }, handFlat: 1, facts: [V(10, 'P1', 'protocol', 'Ellbogen oben gestreckt (Anweisung); Minimum 20° in San Juan et al. 2015')], props: pushupProps } },
      { label: 'Unten', pose: { root: 'wrist', rootPos: [0, -6], solve: { param: 'trunk', joint: 'toe', y: 0, range: [20, 89] }, hip: V(0, 'P2', 'protocol', 'Körperlinie ≈ 180°'), knee: C(0), foot: C(165), armPoints: { elbow: [-14, 4], wrist: [10, 32] }, handFlat: 1, facts: [V(105, 'P1', 'fulltext', 'Ellbogen unten ≥ 105° (gemeinsamer Bereich 105° → 35°); Oberarm 53,6° vom Rumpf')], props: pushupProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [2, 3] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Hochdrücken', kp: [0] }],
    keyPoints: [
      { short: 'Linie', anchor: 'hip', side: 'l', status: 'consensus', text: 'Körper bildet eine gerade Linie von Kopf bis Ferse.', src: ['P2', 'P1'],
        explain: 'Anweisung in allen gelesenen Protokollen (≈ 180° zwischen Ober- und Unterkörper, San Juan et al. 2015); Hüft- und Rumpfwinkel wurden nicht gemessen.' },
      { short: 'Hände', anchor: 'wrist', side: 'r', status: 'consensus', text: 'Hände etwas breiter als schulterbreit auf Schulterhöhe aufsetzen.', src: ['P1', 'P2', 'P3'],
        explain: 'Hände auf Höhe des Schultereckgelenks (Suprak et al. 2013, San Juan et al. 2015); ≈ 150 % Schulterbreite beim Vergleich mit dem Bankdrücken (van den Tillaar 2019).' },
      { short: 'Tiefe', anchor: 'chest', side: 'l', status: 'consensus', text: 'Brust bis knapp über den Boden senken, dann Arme wieder strecken.', src: ['P1', 'P2'],
        explain: 'Tiefe in den Studien: Brust berührt einen 10 cm hohen Block; Ellbogenbeugung unten mindestens ≈ 105°.' },
      { short: 'Oberarme', anchor: 'elbow', side: 'r', status: 'contested', text: 'Oberarme etwa 35–55° vom Rumpf; sehr weit abgespreizt hebt das die Schulter an.', src: ['P1'],
        explain: 'Umstritten und nur eine Studie: Oberarmwinkel zum Rumpf eng 35,5°, selbst gewählt 53,6°, weit 64,8° (Suprak et al. 2013). Die Autoren verbinden die weite Position mit einer ungünstigeren Schulterblattstellung; Verletzungsdaten gibt es nicht.' }
    ],
    sources: {
      P1: { label: 'Suprak et al. 2013, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-48.5.08', read: 'fulltext' },
      P2: { label: 'San Juan et al. 2015, BMC Musculoskelet Disord', url: 'https://doi.org/10.1186/s12891-015-0486-5', read: 'fulltext' },
      P3: { label: 'van den Tillaar 2019, Sports Med Int Open', url: 'https://doi.org/10.1055/a-1001-2526', read: 'fulltext' }
    }
  },

  // ---------- Rudern am Kabel ----------
  {
    ref: 'seated-cable-row', view: 'side', basis: 'measured',
    basisNote: 'Schulter- und Ellbogenwinkel aus einer IMU-Messung an 14 Personen (NPJ Microgravity 2026, Volltext; leichte bis mittlere Last, Werte aus Mittelwertkurven). Rumpf aufrecht (Anweisung in Padovan et al. 2025), Beinhaltung Konvention.',
    tempo: { basis: 'protocol', note: '2 s ziehen, 2 s zurück, ≈ 0,5 s halten (Protokolle der IMU-Studie und Padovan et al. 2025).' },
    frames: [
      { label: 'Start', pose: { root: 'hip', rootPos: [0, -98], trunk: V(0, 'S2', 'protocol', 'aufrecht'), hip: C(80), knee: C(25), foot: C(55), shoulder: V(61.1, 'S1', 'fulltext', '61,1 ± 5,3°'), elbow: K(5.9, 'S1', 'Maximum 105,4° minus ROM 99,5°'), armScale: [1, 0.85], props: rowProps } },
      { label: 'Zug', pose: { root: 'hip', rootPos: [0, -98], trunk: V(0, 'S2', 'protocol', 'aufrecht'), hip: C(80), knee: C(25), foot: C(55), shoulder: V(-5, 'S1', 'fulltext', '−5,0 ± 9,7°'), elbow: V(105.4, 'S1', 'fulltext', '105,4 ± 13,1°'), armScale: [1, 0.65], props: rowProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Start', kp: [0] }, { a: 0, b: 1, dur: 2.0, label: 'Ziehen', kp: [1, 2] }, { a: 1, b: 1, dur: 0.5, label: 'Halten', kp: [1, 3] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [4] }],
    keyPoints: [
      { short: 'Sitz', anchor: 'knee', side: 'r', status: 'consensus', text: 'Aufrecht sitzen, Knie leicht gebeugt, Arme vorne gestreckt.', src: ['S2', 'S4'],
        explain: 'Haltung in den Studien: aufrechter Rumpf ohne Brustauflage, leicht gebeugte Knie, gestreckte Ellbogen am Start.' },
      { short: 'Zug', anchor: 'elbow', side: 'l', status: 'consensus', text: 'Griff zum Bauch ziehen, Oberarme nach hinten führen.', src: ['S1', 'S2', 'S3', 'S4'],
        explain: 'Endposition: Griff am Bauch; Schulter ≈ 0 bis −5° (gemessen −5,0 ± 9,7°), Ellbogen ≈ 90–105° (gemessen 105,4 ± 13,1°).' },
      { short: 'Ellbogen', anchor: 'uarm', side: 'l', status: 'single', text: 'Ellbogen eng: mehr Latissimus; Ellbogen weit: mehr oberer Rücken und hintere Schulter.', src: ['S4', 'S8'],
        explain: 'Wenig Abduktion begünstigte den unteren Latissimus, 60–90° Abduktion erhöhten Trapez- und hintere Schulteraktivität (Vasconcelos et al. 2023, n = 21; Begutachtung nicht angegeben). Enger Griff mit mehr Latissimus auch in einer HD-EMG-Studie (Übersicht Di Fonza et al. 2026).' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper ruhig halten; Vor- oder Rücklage verschiebt die Belastung.', src: ['S2', 'S5'],
        explain: 'Aufrecht als Anweisung (Padovan et al. 2025). 20° Rücklage: oberer Trapezmuskel 42 statt 15 % der Maximalaktivität; 30° Vorlage: unterer Trapezmuskel 61 statt 50 % (Park & Kim 2022, n = 23). Die Diskussion der Studie widerspricht teils den eigenen Tabellen.' },
      { short: 'Zurück', anchor: 'hand', side: 'r', status: 'consensus', text: 'Langsam zurück, bis die Arme wieder gestreckt sind.', src: ['S1', 'S2', 'S4'],
        explain: 'Start und Ende mit gestreckten Ellbogen in allen Protokollen.' }
    ],
    sources: {
      S1: { label: 'Winther Nielsen et al. 2026, NPJ Microgravity', url: 'https://doi.org/10.1038/s41526-026-00588-y', read: 'fulltext' },
      S2: { label: 'Padovan et al. 2025, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk11010006', read: 'fulltext' },
      S3: { label: 'Lehman et al. 2004, Dyn Med', url: 'https://doi.org/10.1186/1476-5918-3-4', read: 'fulltext' },
      S4: { label: 'Vasconcelos et al. 2023, Int J Strength Cond', url: 'https://doi.org/10.47206/ijsc.v3i1.190', read: 'fulltext' },
      S5: { label: 'Park & Kim 2022, J Musculoskelet Sci Technol', url: 'https://doi.org/10.29273/jmst.2022.6.1.22', read: 'fulltext' },
      S8: { label: 'Di Fonza et al. 2026, J Funct Morphol Kinesiol (Review)', url: 'https://doi.org/10.3390/jfmk11030315', read: 'fulltext' }
    }
  },

  // ---------- Klimmzug (Rückansicht seit v2.22.0) ----------
  {
    ref: 'pull-up', checkedAt: '2026-10-22', view: 'back', basis: 'measured', noFloor: true,
    basisNote: 'Rückansicht (seit v2.22.0; vorher von vorn), damit Latissimus und oberer Rücken sichtbar sind; oben verschwindet die Stange hinter dem Kopf. Schulterwinkel aus Prinold & Bull 2014 (3D, 11 geübte Männer, drei Griffe; humerothorakale Elevation 23–126° als gepoolter Bereich, kein Mittelwert je Position) und Ellbogen-Bewegungsumfang aus Youdas et al. 2010 (3D, n = 25, Abstract). Die Figur hängt mit den Händen an der Stange (1,5-fache Schulterbreite); Ellbogen und Handgelenke sind in die Bildebene projiziert, deshalb erscheint der Ellbogen oben stärker gebeugt als gemessen. Beine angewinkelt (Protokoll), Körperhöhe folgt aus der Armgeometrie.',
    tempo: { basis: 'measured', note: 'Hochziehen im Mittel 1,2 s (0,8–2,2 s, maximale Absicht; Prinold & Bull 2014); Absenken dort nicht gemessen, hier 1,5 s (EMG-Protokolle: 2 s / 2 s).' },
    frames: [
      { label: 'Hang', pose: { root: 'wristR', rootPos: [PU.grip, PU.bar + 8], armPoints: { elbow: [13.4, -66.9], wrist: [24, -120] }, legs: { hip: C(0), knee: C(70, 'Beine angewinkelt, Fersen hinten (Protokoll)') }, props: pullupProps },
        facts: [V(0, 'S2', 'protocol', 'Ellbogen gestreckt im Hang (Protokoll)'), V(126, 'S2', 'fulltext', 'humerothorakale Elevation: oberes Ende des Bereichs 23–126° (gepoolt); in der Frontprojektion ≈ 169°')] },
      { label: 'Oben', pose: { root: 'wristR', rootPos: [PU.grip, PU.bar + 8], armPoints: { elbow: [30, 34], wrist: [24, -22] }, legs: { hip: C(0), knee: C(70, 'Beine angewinkelt, Fersen hinten (Protokoll)') }, props: pullupProps },
        facts: [V(93.4, 'S3', 'abstract', 'Ellbogen-Bewegungsumfang 93,4 ± 14,6° (Klimmzug, n = 25); Frontprojektion zeigt ≈ 145°'), V(23, 'S2', 'fulltext', 'humerothorakale Elevation: unteres Ende des Bereichs 23–126°'), V(1, 'S2', 'protocol', 'Kinn über der Stange (Endkriterium)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Hang', kp: [0, 3] }, { a: 0, b: 1, dur: 1.2, label: 'Hochziehen', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 1.5, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Hang', anchor: 'elbowL', side: 'l', status: 'consensus', text: 'Aus dem gestreckten Hang starten: Arme lang, Ellbogen gestreckt.', src: ['S2', 'S3', 'S4'],
        explain: 'Startdefinition aller gelesenen Studien: Hang mit gestreckten Armen. Der gemessene Ellbogen-Bewegungsumfang (93 ± 15°, Youdas et al. 2010) bezieht sich auf diesen Start.' },
      { short: 'Kinn', anchor: 'bar', side: 'r', status: 'consensus', text: 'Hochziehen, bis das Kinn über der Stange ist.', src: ['S2', 'S4'],
        explain: 'Endkriterium in Prinold & Bull 2014 und Snarr et al. 2017 (Kinn über der Stange bzw. auf Höhe der Hände). Wiederholungen mit Schwung wurden dort verworfen.' },
      { short: 'Schwung', anchor: 'kneeR', side: 'r', status: 'single', text: 'Ohne Schwung aus Beinen oder Hüfte ziehen – Beine ruhig halten.', src: ['S4', 'S6'],
        explain: 'Strikte Ausführung als Protokoll (Snarr et al. 2017). Beim Kipping bewegen sich Hüfte (≈ 49°) und Knie (≈ 57°) deutlich mehr als beim strikten Klimmzug (Dinunzio et al. 2018, Abstract, n = 11). Ob das besser oder schlechter ist, hängt vom Ziel ab; untersucht wurde nur der Unterschied.' },
      { short: 'Griff', anchor: 'handL', side: 'l', status: 'single', text: 'Griff etwa schulterbreit bis 1,5-fache Schulterbreite.', src: ['S1', 'S4'],
        explain: 'Schulterbreit („front“) bis weit (Hände am abgeschrägten Teil der Stange) in Prinold & Bull 2016; 1,5-fache Schulterbreite in EMG-Protokollen. Der weite Griff hielt den Oberarm näher an der Frontalebene (≈ 90° Abduktion mit 45° Außenrotation). Ein Optimum ist nicht belegt.' },
      { short: 'Ab', anchor: 'shoulderL', side: 'l', status: 'single', text: 'Kontrolliert absenken, bis die Arme wieder gestreckt sind.', src: ['S4'],
        explain: 'Protokoll 2 s auf / 2 s ab (Snarr et al. 2017). Die Absenkphase wurde kinematisch nicht gemessen.' }
    ],
    sources: {
      S1: { label: 'Prinold & Bull 2016, J Sci Med Sport', url: 'https://doi.org/10.1016/j.jsams.2015.08.002', read: 'fulltext', note: 'Schulterblatt-Kinematik; Angaben zum Schulterblatt-Kippbereich widersprechen der eigenen Diskussion' },
      S2: { label: 'Prinold & Bull 2014, J Biomech', url: 'https://doi.org/10.1016/j.jbiomech.2014.05.015', read: 'fulltext' },
      S3: { label: 'Youdas et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181f1598c', read: 'abstract' },
      S4: { label: 'Snarr et al. 2017, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0068', read: 'fulltext' },
      S6: { label: 'Dinunzio et al. 2018, Sports Biomech', url: 'https://doi.org/10.1080/14763141.2018.1452971', read: 'abstract' }
    }
  },

  // ---------- Latzug (Frontansicht) ----------
  {
    ref: 'lat-pulldown', checkedAt: '2026-10-21', view: 'back', basis: 'transfer',
    basisNote: 'Rückansicht (seit v2.20.0; vorher von vorn, die Stange lief dann vor dem Gesicht): Stange, Hände und Unterarme verschwinden hinter Kopf und Rücken, sobald sie vor dem Körper liegen. Keine gelesene Studie berichtet Gelenkwinkel für den Latzug an Gesunden; Schulter- und Ellbogenbereich sind vom Klimmzug übertragen (Prinold & Bull 2014, Youdas et al. 2010). Griffbreite, Start mit gestreckten Armen und Endpunkt an der oberen Brust sind Studienprotokolle (Padovan et al. 2024). Sitzend, Oberschenkel unter dem Polster; Arme in die Bildebene projiziert.',
    tempo: { basis: 'protocol', note: '2 s ziehen, 0,5 s halten, 2 s zurück (Metronom, Padovan et al. 2024).' },
    frames: [
      { label: 'Start', pose: { rootPos: [0, -108], armPoints: { elbow: [13.4, -66.9], wrist: [24, -120] }, legs: { hip: C(85, 'sitzend'), knee: C(85) }, props: pulldownProps },
        facts: [V(0, 'L1', 'protocol', 'Ellbogen gestreckt am Start'), V(1.5, 'L1', 'protocol', 'Griff 1,5-fache Biakromialbreite, Obergriff'), V(126, 'S2', 'fulltext', 'Schulter: übertragen vom Klimmzug-Hang (obere Grenze 23–126°)')] },
      { label: 'Brust', pose: { rootPos: [0, -108], armPoints: { elbow: [12, 44], wrist: [24, 20] }, legs: { hip: C(85, 'sitzend'), knee: C(85) }, props: pulldownProps },
        facts: [V(93.4, 'S3', 'abstract', 'Ellbogen: übertragen vom Klimmzug (ROM 93,4 ± 14,6°)'), V(1, 'L1', 'protocol', 'Stange zur Mitte der Brust (Endkriterium)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Start', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Ziehen', kp: [2, 3] }, { a: 1, b: 1, dur: 0.5, label: 'Halten', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [4] }],
    keyPoints: [
      { short: 'Griff', anchor: 'handL', side: 'l', status: 'consensus', text: 'Griff etwa 1,5-fache Schulterbreite, Handflächen nach vorn.', src: ['L1', 'L3', 'L7'],
        explain: 'Protokoll der gelesenen Studien (1,5-fache Biakromialbreite). Enger, mittlerer und weiter Griff (1–2-fach) ergaben ähnliche Latissimus-Aktivität; mit dem weiten Griff war das 6RM etwas niedriger (Andersen et al. 2014, n = 15). Griffbreite und Unterarmdrehung änderten die Aktivität kaum (Lusk et al. 2010).' },
      { short: 'Polster', anchor: 'thighR', side: 'r', status: 'single', text: 'Oberschenkel unter dem Polster fixieren, Becken bleibt auf dem Sitz.', src: ['L1'],
        explain: 'Aufbau in Padovan et al. 2024 (Becken durch das Oberschenkelpolster fixiert). Ob das die Ausführung verbessert, wurde nicht untersucht.' },
      { short: 'Ziehen', anchor: 'upperBack', side: 'r', status: 'consensus', text: 'Aus gestreckten Armen die Stange vor dem Kopf zur oberen Brust ziehen.', src: ['L1', 'L8'],
        explain: 'Zur Brustmitte (Padovan et al. 2024). Vor dem Kopf erlaubte mehr Last als hinter dem Nacken (8RM 70,0 vs. 59,3 kg) bei gleicher Latissimus-Aktivität; Sperandei et al. 2009 fanden vor dem Kopf die höchste Brust- und ähnliche Latissimus-Aktivität.' },
      { short: 'Rumpf', anchor: 'midBack', side: 'l', status: 'contested', text: 'Oberkörper ruhig und fast aufrecht halten, nur leichte Rücklage.', src: ['L1', 'L4'],
        explain: 'Umstritten. Padovan et al. 2024 ließen eine leichte Rücklage zu, andere Protokolle verlangen einen senkrechten Rumpf; Buonsenso et al. 2025 testeten eine Variante mit 30° Rücklage als eigene Übungsform. Ein gemessener Rumpfwinkel liegt nicht vor.' },
      { short: 'Zurück', anchor: 'elbowL', side: 'l', status: 'consensus', text: 'Kontrolliert nach oben zurückführen, bis die Arme gestreckt sind.', src: ['L1', 'L7'],
        explain: 'Start und Ende mit gestreckten Ellbogen in allen Protokollen; Tempo 2 s / 2 s.' }
    ],
    sources: {
      L1: { label: 'Padovan et al. 2024, J Hum Kinet', url: 'https://doi.org/10.5114/jhk/185211', read: 'fulltext' },
      L3: { label: 'Andersen et al. 2014, J Strength Cond Res', url: 'https://doi.org/10.1097/JSC.0000000000000232', read: 'abstract' },
      L4: { label: 'Buonsenso et al. 2025, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk10030345', read: 'abstract' },
      L7: { label: 'Lusk et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181ddb0ab', read: 'abstract' },
      L8: { label: 'Sperandei et al. 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181b8d30a', read: 'abstract' },
      S2: { label: 'Prinold & Bull 2014, J Biomech (Klimmzug, übertragen)', url: 'https://doi.org/10.1016/j.jbiomech.2014.05.015', read: 'fulltext' },
      S3: { label: 'Youdas et al. 2010, J Strength Cond Res (Klimmzug, übertragen)', url: 'https://doi.org/10.1519/JSC.0b013e3181f1598c', read: 'abstract' }
    }
  },

  // ---------- Seitheben (Frontansicht) ----------
  {
    ref: 'lateral-raise-dumbbell', view: 'front', basis: 'protocol',
    basisNote: 'Frontansicht. Keine Studie hat das Seitheben selbst vermessen. Endposition 90° Abduktion und fast gestreckter Ellbogen sind das Protokoll von Coratella et al. 2020 (EMG, 10 Bodybuilder, sitzend). Dass sich das Schulterblatt beim Anheben mitdreht (≈ 1° je 2,3° Oberarm), stammt aus Messungen ohne Last (Braman et al. 2009) und wird nicht gezeichnet. Stehend, Ebene der Bewegung in der Zeichnung frontal.',
    tempo: { basis: 'protocol', note: '2 s anheben, 0,5 s halten, 2 s absenken, 0,5 s halten (Metronom, Coratella et al. 2020).' },
    frames: [
      { label: 'Unten', pose: { arm: { abd: V(8, 'L1', 'protocol', 'Arm hängt neben dem Körper (Protokoll 0°, hier 8° wegen der Hanteln)'), elbow: C(12, 'fast gestreckt') }, legs: { hip: C(0), knee: C(0) }, props: raiseProps } },
      { label: 'Oben', pose: { arm: { abd: V(90, 'L1', 'protocol', 'bis 90° Abduktion (Protokollziel, nicht gemessen)'), elbow: C(12, 'fast gestreckt, bleibt gleich') }, legs: { hip: C(0), knee: C(0) }, props: raiseProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Unten', kp: [1, 3] }, { a: 0, b: 1, dur: 2.0, label: 'Anheben', kp: [0, 2] }, { a: 1, b: 1, dur: 0.5, label: 'Oben', kp: [0] }, { a: 1, b: 0, dur: 2.0, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Höhe', anchor: 'handR', side: 'r', status: 'consensus', text: 'Arme seitlich anheben, bis die Oberarme etwa waagerecht sind.', src: ['L1', 'L5'],
        explain: 'Zielwinkel 90° im Studienprotokoll (Coratella et al. 2020). Seitheben über 90° war in einer Querschnittsstudie mit Impingement-Zeichen assoziiert (Kolber et al. 2014, n = 77) – ein Zusammenhang, kein Beleg für eine Ursache.' },
      { short: 'Ellbogen', anchor: 'elbowL', side: 'l', status: 'single', text: 'Ellbogen fast gestreckt und während der Bewegung gleich lassen.', src: ['L1'],
        explain: 'Protokoll „fast gestreckt“; eine Variante mit 90° gebeugtem Ellbogen wurde in derselben Studie getestet. Ein Vergleich der Wirkung auf das Muskelwachstum liegt nicht vor.' },
      { short: 'Daumen', anchor: 'handL', side: 'l', status: 'contested', text: 'Daumen nach vorn oder leicht nach oben, nicht nach unten gedreht.', src: ['L1', 'L4', 'L6'],
        explain: 'Umstritten. Daumen nach unten erhöhte die EMG-Aktivität des mittleren Deltamuskels (Coratella et al. 2020; Übersicht Rabello et al. 2022). Dagegen: In der Empty-Can-Position drehte das Schulterblatt stärker nach innen und kippte nach vorn (Thigpen et al. 2005, Abstract) – eine Haltung, die als ungünstig gilt; Verletzungsdaten gibt es nicht.' },
      { short: 'Rumpf', anchor: 'belly', side: 'r', status: 'single', text: 'Rumpf ruhig halten, nicht mit Schwung aus dem Oberkörper arbeiten.', src: ['L1'],
        explain: 'Die Studie ließ sitzend trainieren, um Rumpfbeteiligung zu vermeiden. Rumpfbewegung beim Seitheben wurde nie gemessen.' },
      { short: 'Ab', anchor: 'shoulderL', side: 'l', status: 'single', text: 'Kontrolliert absenken, etwa so langsam wie beim Anheben.', src: ['L1'],
        explain: 'Protokoll 2 s / 2 s (Coratella et al. 2020). Beim Absenken drehte das Schulterblatt in Messungen ohne Last etwas später zurück als es beim Anheben mitging (Braman et al. 2009).' }
    ],
    sources: {
      L1: { label: 'Coratella et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17176015', read: 'fulltext' },
      L3: { label: 'Braman et al. 2009, J Shoulder Elbow Surg', url: 'https://doi.org/10.1016/j.jse.2009.02.001', read: 'fulltext' },
      L4: { label: 'Thigpen et al. 2005, Am J Sports Med', url: 'https://doi.org/10.1177/0363546505281797', read: 'abstract' },
      L5: { label: 'Kolber et al. 2014, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000000250', read: 'abstract' },
      L6: { label: 'Rabello et al. 2022, J Bodyw Mov Ther (Review)', url: 'https://doi.org/10.1016/j.jbmt.2022.12.002', read: 'abstract' }
    }
  },

  // ========== Zweite Runde (v2.1): zehn weitere Übungen ==========
  // ---------- Frontkniebeuge ----------
  {
    ref: 'front-squat', view: 'side', basis: 'measured',
    basisNote: 'Knie- und Hüftwinkel aus Sorrentino et al. 2024 (Trägheitssensoren, 12 geübte Männer, Langhantel mit 25 % Körpergewicht; Volltext). Der Hüftwinkel der Sensoren ist ein Becken–Oberschenkel-Winkel und enthält die Beckenkippung; die daraus berechnete Rumpfneigung fällt deshalb größer aus als eine Thorax-Messung. Sprunggelenk nicht gemessen (Wert der Kniebeuge übernommen). Oberarme waagerecht, Stange auf den vorderen Schultern (Protokoll McCormick et al. 2023).',
    tempo: { basis: 'protocol', note: '≈ 3 s je Wiederholung (Sorrentino et al. 2024); 2 s ab / 2 s auf mit Metronom (Goršič et al. 2020, Bozkurt et al. 2026). Natürliches Tempo nicht gemessen.' },
    frames: [
      { label: 'Oben', pose: { shank: K(0, 'S1', 'Standwert'), knee: V(6, 'S1', 'fulltext', '6,0 ± 5,8° (Langhantel); 4,9 ± 4,6° ohne Last'), hip: V(9, 'S1', 'fulltext', '9,0 ± 7,8° (Langhantel); 11,6 ± 8,3° ohne Last'), ankle: C(0), shoulder: V(90, 'S5', 'protocol', 'Oberarme waagerecht'), armTargetTrunk: FSQ_HAND, armScale: [0.9, 0.77], elbowSide: FSQ_SIDE, props: frontSquatProps } },
      { label: 'Unten', pose: { shank: C(33, 'gleich der Dorsalflexion; nicht gemessen'), knee: V(118.3, 'S1', 'fulltext', '118,3 ± 7,0° (Langhantel); 113,5 ± 8,4° ohne Last'), hip: V(111.4, 'S1', 'fulltext', '111,4 ± 11,3° (Langhantel); 126,1 ± 12,1° ohne Last, Becken–Oberschenkel'), ankle: C(33, 'nicht gemessen; Wert der Kniebeuge (33°) übernommen'), shoulder: V(90, 'S5', 'protocol', 'Oberarme waagerecht'), armTargetTrunk: FSQ_HAND, armScale: [0.9, 0.77], elbowSide: FSQ_SIDE, props: frontSquatProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 1.5, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [2, 3] }, { a: 1, b: 0, dur: 1.5, label: 'Aufstehen', kp: [4] }],
    keyPoints: [
      { short: 'Stange', anchor: 'bar', side: 'r', status: 'single', text: 'Stange liegt vorn auf Schultern und Schlüsselbein, Oberarme etwa waagerecht.', src: ['S5'],
        explain: 'Protokolldefinition in McCormick et al. 2023 (n = 26): Stange auf vorderen Schultern und Schlüsselbein, Ellbogen voll gebeugt, Oberarme parallel zum Boden. Die Armhaltung wurde nicht gemessen.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'contested', text: 'Oberkörper bleibt aufrechter als bei der Kniebeuge mit Stange im Nacken.', src: ['S8', 'S3'],
        explain: 'Umstritten. Mit Maximallast neigte sich der Rumpf bei der Nackenkniebeuge stärker vor, die Kniekinematik war gleich (Yavuz et al. 2015, 2D, n = 12, Abstract). Goršič et al. 2020 (3D, n = 18, 70 % 1RM) fanden keinen signifikanten Rumpfunterschied, nur weniger Beckenkippung bei der Frontkniebeuge. Die Animation zeigt unten ≈ 26° Neigung, berechnet aus einem Sensor-Hüftwinkel, der die Beckenkippung enthält.' },
      { short: 'Tiefe', anchor: 'knee', side: 'r', status: 'single', text: 'Tiefster Punkt: Knie etwa 110–120° gebeugt (gemessen mit leichter Last).', src: ['S1'],
        explain: 'Maximale Kniebeugung 113,5 ± 8,4° ohne Last und 118,3 ± 7,0° mit Langhantel (25 % Körpergewicht); Einschlusskriterium war mindestens 90° (Sorrentino et al. 2024, n = 12). Schwere Lasten wurden nicht gemessen.' },
      { short: 'Hüfte', anchor: 'hip', side: 'l', status: 'single', text: 'Mit Langhantel wurde die Hüfte unten weniger gebeugt als ohne Last.', src: ['S1'],
        explain: '126,1 ± 12,1° ohne Last gegenüber 111,4 ± 11,3° mit Langhantel (signifikant; Sorrentino et al. 2024). Becken–Oberschenkel-Winkel aus Trägheitssensoren, nicht Thorax–Oberschenkel.' },
      { short: 'Knie', anchor: 'thigh', side: 'r', status: 'single', text: 'Bei gleicher Muskelaktivität waren die Druckkräfte im Knie geringer als im Nacken.', src: ['S11'],
        explain: 'Gullett et al. 2009 (n = 15, Abstract): Nackenkniebeuge mit signifikant höheren Kompressionskräften und Kniestreckmomenten; Muskelaktivität ohne Unterschied. Scherkräfte klein und gleich. Ob das langfristig einen Unterschied macht, ist nicht untersucht.' }
    ],
    sources: {
      S1: { label: 'Sorrentino et al. 2024, Physiol Rep', url: 'https://doi.org/10.14814/phy2.16034', read: 'fulltext', note: 'Raumfahrtmedizinische Studie (Zentrifuge); Werte bei normaler Schwerkraft' },
      S3: { label: 'Goršič et al. 2020, Sports Biomech', url: 'https://doi.org/10.1080/14763141.2020.1832563', read: 'fulltext' },
      S4: { label: 'Bozkurt et al. 2026, Front Physiol', url: 'https://doi.org/10.3389/fphys.2025.1727141', read: 'fulltext' },
      S5: { label: 'McCormick et al. 2023, Int J Sports Phys Ther', url: 'https://doi.org/10.26603/001c.84306', read: 'fulltext' },
      S8: { label: 'Yavuz et al. 2015, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2014.984240', read: 'abstract' },
      S11: { label: 'Gullett et al. 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e31818546bb', read: 'abstract' }
    }
  },

  // ---------- Beinpresse (45°-Schlitten) ----------
  {
    ref: 'leg-press', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Bewegung an der 45°-Beinpresse gemessen. Knie 0° → 90° ist die Vorgabe aus Martín-Fuentes et al. 2020; Lehnenneigung, Hüftwinkel und die Füße flach auf der Platte sind Konvention. Zum Vergleich sind Messwerte einer horizontalen Schwungrad-Beinpresse angegeben (Sjöberg et al. 2021).',
    tempo: { basis: 'protocol', note: '2 s ab / 2 s auf mit Metronom (Martín-Fuentes et al. 2020); natürliches Tempo nicht gemessen.' },
    frames: [
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -70], trunk: C(-70, 'Lehne ≈ 20° über der Waagerechten'), hip: C(70, 'Beine entlang der Schienen'), knee: V(5, 'L2', 'protocol', 'Startposition 0° im Protokoll; hier 5°, Knie nicht durchgedrückt'), foot: C(-45, 'Fuß flach auf der Platte'), shoulder: C(5), elbow: C(25), armScale: [1, 0.9], props: legPressProps } },
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -70], trunk: C(-70, 'Lehne ≈ 20° über der Waagerechten'), hip: C(125, 'Oberschenkel nahe am Rumpf; nicht gemessen'), knee: V(90, 'L2', 'protocol', 'Umkehrpunkt 90° (Schienbein parallel zum Boden)'), foot: C(-45, 'Fuß flach auf der Platte'), shoulder: C(5), elbow: C(25), armScale: [1, 0.9], props: legPressProps },
        facts: [V(109, 'L1', 'fulltext', 'Übertragen: Kniebeugung 109 ± 9° an einer horizontalen Schwungrad-Beinpresse (Ziel war 90°)'), V(78, 'L1', 'fulltext', 'Übertragen: Hüftbeugung 78 ± 12° (horizontale Presse, Sitz gleitet)'), V(32, 'L1', 'fulltext', 'Übertragen: Dorsalflexion 32 ± 12°; hier folgen ≈ 30° aus dem flachen Fuß')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.2, label: 'Unten', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Drücken', kp: [3] }],
    keyPoints: [
      { short: 'Füße', anchor: 'plate', side: 'r', status: 'consensus', text: 'Füße etwa schulterbreit mittig auf die Platte; Breite und Fußdrehung frei wählen.', src: ['L2', 'L5', 'L6'],
        explain: 'Breiter oder enger Stand und 0° oder 30° Fußdrehung änderten Kniekräfte und Muskelaktivität nicht (Escamilla et al. 2001, n = 10, Abstract; Übersicht Martín-Fuentes et al. 2020). Füße auf mittlerer Höhe war Protokoll der Messstudie.' },
      { short: 'Weg', anchor: 'knee', side: 'l', status: 'consensus', text: 'Knie von fast gestreckt bis etwa 90° beugen; tiefer, wenn das Becken liegen bleibt.', src: ['L2', 'L5', 'L1'],
        explain: 'Protokolle nutzen 0–90° (Martín-Fuentes et al. 2020) bis 0–120° (EMG-Studien in der Übersicht); an einer Schwungrad-Presse gingen Trainierte trotz 90°-Ziel bis 109 ± 9° (Sjöberg et al. 2021, n = 9). Ab wann das Becken von der Lehne abhebt, wurde nicht gemessen.' },
      { short: 'Höhe', anchor: 'thigh', side: 'r', status: 'contested', text: 'Füße höher oder tiefer setzen verschiebt die Last nur wenig; Befunde uneinheitlich.', src: ['L5', 'L6'],
        explain: 'Umstritten. Keine Unterschiede in Kniekräften zwischen hoher und tiefer Fußposition (Escamilla et al. 2001); in der Übersicht von Martín-Fuentes et al. 2020 berichtet eine Studie mehr Gesäßaktivität mit hohen Füßen bei 80 % 1RM, eine andere keinen Unterschied.' },
      { short: 'Lehne', anchor: 'back', side: 'l', status: 'single', text: 'Flachere Lehne (125° statt 90°) bringt mehr Hüftbewegung bei gleicher Kniebewegung.', src: ['L3'],
        explain: 'Marchetti et al. 2023 (n = 15, 70 % Körpermasse, Abstract): Sitz–Lehnen-Winkel 125° mit mehr Hüftverschiebung als 90°, Knieweg ähnlich; Zahlen im Abstract nicht angegeben. Die gezeigte Lehne ist Konvention.' }
    ],
    sources: {
      L1: { label: 'Sjöberg et al. 2021, Front Sports Act Living', url: 'https://doi.org/10.3389/fspor.2021.686335', read: 'fulltext', note: 'Horizontale Schwungrad-Beinpresse, nicht 45°-Schlitten' },
      L2: { label: 'Martín-Fuentes et al. 2020, Int J Environ Res Public Health (Beinpresse 45°)', url: 'https://doi.org/10.3390/ijerph17228698', read: 'fulltext' },
      L3: { label: 'Marchetti et al. 2023, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000004504', read: 'abstract' },
      L5: { label: 'Martín-Fuentes et al. 2020, Int J Environ Res Public Health (Review)', url: 'https://doi.org/10.3390/ijerph17134626', read: 'fulltext' },
      L6: { label: 'Escamilla et al. 2001, Med Sci Sports Exerc', url: 'https://doi.org/10.1097/00005768-200109000-00020', read: 'abstract' }
    }
  },

  // ---------- Beinstrecker ----------
  {
    ref: 'leg-extension', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Gelenkwinkel am Beinstrecker gemessen; nur der erreichte Bewegungsumfang (≈ 71° im Fenster 100° → 30°, Potentiometer an der Maschinenachse; Lacerda et al. 2021). Gezeigt ist der volle Bereich 90° → 0° (Protokoll Haffer et al. 2022). Hüftwinkel ≈ 70° aus dem Sitz-Lehnen-Winkel 110° berechnet.',
    tempo: { basis: 'measured', note: '2,04 ± 0,08 s je Wiederholung bei Vorgabe 1 s / 1 s; alternativ 5,98 ± 0,09 s bei 3 s / 3 s – beide mit ähnlichem Muskelzuwachs (Lacerda et al. 2021).' },
    frames: [
      { label: 'Start', pose: { root: 'hip', rootPos: [0, -118], trunk: K(-20, 'E1', 'Sitz–Lehnen-Winkel 110°'), hip: K(70, 'E1', 'aus 110° zwischen Sitz und Lehne, Oberschenkel waagerecht'), knee: V(90, 'E3', 'protocol', 'Start 90° (Haffer et al. 2022); 100° bei Lacerda et al. 2021'), ankle: C(0), shoulder: C(15), elbow: C(35), armScale: [1, 0.9], props: legExtensionProps } },
      { label: 'Gestreckt', pose: { root: 'hip', rootPos: [0, -118], trunk: K(-20, 'E1', 'Sitz–Lehnen-Winkel 110°'), hip: K(70, 'E1', 'aus 110° zwischen Sitz und Lehne, Oberschenkel waagerecht'), knee: V(0, 'E3', 'protocol', 'volle Streckung (Haffer et al. 2022); Endpunkt 30° bei Lacerda et al. 2021'), ankle: C(0), shoulder: C(15), elbow: C(35), armScale: [1, 0.9], props: legExtensionProps },
        facts: [V(70.8, 'E1', 'fulltext', 'Erreichter Bewegungsumfang 70,8 ± 0,8° im Fenster 100° → 30° (gemessen an der Maschinenachse)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Start', kp: [0, 1] }, { a: 0, b: 1, dur: 1.0, label: 'Strecken', kp: [2] }, { a: 1, b: 1, dur: 0.3, label: 'Gestreckt', kp: [2] }, { a: 1, b: 0, dur: 1.0, label: 'Zurück', kp: [3, 4] }],
    keyPoints: [
      { short: 'Achse', anchor: 'knee', side: 'r', status: 'single', text: 'Kniegelenk auf Höhe der Drehachse der Maschine ausrichten.', src: ['E1'],
        explain: 'Einstellung im Protokoll von Lacerda et al. 2021 (äußerer Oberschenkelknorren an der Drehachse). Ob eine Fehlstellung messbar etwas ändert, wurde nicht untersucht.' },
      { short: 'Polster', anchor: 'pad', side: 'r', status: 'single', text: 'Fußpolster knapp oberhalb des Knöchels anlegen (etwa 3 cm).', src: ['E1'],
        explain: 'Protokolleinstellung (≈ 3 cm über dem Innenknöchel; Lacerda et al. 2021, n = 10 Untrainierte). Keine Studie verglich Polsterhöhen.' },
      { short: 'Weg', anchor: 'shin', side: 'r', status: 'consensus', text: 'Knie von etwa 90–100° Beugung bis zur Streckung bewegen.', src: ['E1', 'E3'],
        explain: 'Protokolle: 100° → 30° (Lacerda et al. 2021) und 90° → 0° (Haffer et al. 2022). Der erreichte Umfang wurde nur bei Lacerda gemessen (≈ 71°).' },
      { short: 'Lehne', anchor: 'hip', side: 'l', status: 'single', text: 'Flachere Lehne (Hüfte ≈ 40° statt 90°) ließ den geraden Oberschenkelmuskel mehr wachsen.', src: ['E2'],
        explain: 'Larsen et al. 2024 (n = 22 Untrainierte, 10 Wochen, Abstract): stärkeres Wachstum des Rectus femoris bei 40° Hüftbeugung, kein Unterschied am Vastus lateralis. Beide Winkel wirken; die Lehne bestimmt nur den Rectus-Anteil.' },
      { short: 'Tempo', anchor: 'foot', side: 'r', status: 'single', text: 'Zügig (1 s / 1 s) oder langsam (3 s / 3 s): ähnlicher Muskelzuwachs – Tempo frei wählen.', src: ['E1'],
        explain: 'Gemessene Dauer 2,0 s bzw. 6,0 s je Wiederholung; Muskelquerschnitt und 1RM stiegen in beiden Gruppen ähnlich (Lacerda et al. 2021, n = 10, Untrainierte, 14 Wochen).' }
    ],
    sources: {
      E1: { label: 'Lacerda et al. 2021, PeerJ', url: 'https://doi.org/10.7717/peerj.10909', read: 'fulltext' },
      E2: { label: 'Larsen et al. 2024, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2024.2444713', read: 'abstract' },
      E3: { label: 'Haffer et al. 2022, Front Bioeng Biotechnol', url: 'https://doi.org/10.3389/fbioe.2022.857682', read: 'fulltext', note: 'Hüftprothesen-Studie; nur die Protokollvorgabe wird genutzt' }
    }
  },

  // ---------- Beinbeuger liegend ----------
  {
    ref: 'lying-leg-curl', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Bewegung am liegenden Beinbeuger gemessen. Hüfte ≈ 30° gebeugt (Geometrie der geknickten Bank) und Knie 0° → 90° sind die Vorgaben aus Maeo et al. 2021. Fußhaltung und Armposition sind Konvention.',
    tempo: { basis: 'protocol', note: '2 s beugen / 2 s strecken ohne Pause, Metronom 60 Schläge/min (Maeo et al. 2021).' },
    frames: [
      { label: 'Gestreckt', pose: { root: 'hip', rootPos: [0, -150], trunk: C(90, 'Bauchlage, Kopf nach vorn'), hip: V(30, 'C1', 'protocol', '≈ 30° durch die geknickte Bank'), knee: V(0, 'C1', 'protocol'), ankle: C(0), shoulder: C(80), elbow: C(90), armScale: [0.9, 0.9], props: legCurlProps } },
      { label: 'Gebeugt', pose: { root: 'hip', rootPos: [0, -150], trunk: C(90, 'Bauchlage, Kopf nach vorn'), hip: V(30, 'C1', 'protocol', '≈ 30° durch die geknickte Bank'), knee: V(90, 'C1', 'protocol', 'Vorgabe: voller Umfang 0–90°'), ankle: C(0), shoulder: C(80), elbow: C(90), armScale: [0.9, 0.9], props: legCurlProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Gestreckt', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Beugen', kp: [1, 3] }, { a: 1, b: 1, dur: 0.1, label: 'Gebeugt', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Strecken', kp: [3] }],
    keyPoints: [
      { short: 'Hüfte', anchor: 'hip', side: 'l', status: 'single', text: 'Im Liegen ist die Hüfte etwa 30° gebeugt – das gibt die geknickte Bank vor.', src: ['C1'],
        explain: 'Maschinengeometrie in Maeo et al. 2021 (0° = anatomische Nullstellung). Ob das Becken während des Beugens abhebt, wurde nicht gemessen.' },
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'single', text: 'Knie von gestreckt bis etwa 90° beugen; die Rolle liegt knapp über der Ferse.', src: ['C1'],
        explain: 'Voller Bewegungsumfang 0–90° als Trainingsvorgabe (Maeo et al. 2021, n = 20, 12 Wochen). Die Rollenposition ist Konvention.' },
      { short: 'Sitzend', anchor: 'thigh', side: 'l', status: 'single', text: 'Sitzend (Hüfte ≈ 90°) wuchs der Beinbeuger stärker als liegend – beides wirkt.', src: ['C1', 'C2'],
        explain: 'Innerhalb derselben Personen wuchsen die Beinbeuger (vor allem die zweigelenkigen Anteile) mit der sitzenden Variante stärker (Maeo et al. 2021). In gestreckter Hüfte entwickelten die Beinbeuger isometrisch bei 30° Kniebeugung mehr Kraft als bei 90° (Hirose et al. 2021, n = 20, Abstract).' },
      { short: 'Tempo', anchor: 'pad', side: 'r', status: 'single', text: 'Gleichmäßig: je etwa 2 s beugen und 2 s strecken, ohne Pause.', src: ['C1'],
        explain: 'Protokollvorgabe mit Metronom (Maeo et al. 2021); ein Tempovergleich wurde nicht durchgeführt.' }
    ],
    sources: {
      C1: { label: 'Maeo et al. 2021, Med Sci Sports Exerc', url: 'https://doi.org/10.1249/MSS.0000000000002523', read: 'fulltext' },
      C2: { label: 'Hirose et al. 2021, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0245838', read: 'abstract' }
    }
  },

  // ---------- Schulterdrücken mit der Langhantel stehend ----------
  {
    ref: 'standing-barbell-overhead-press', view: 'side', basis: 'protocol',
    basisNote: 'Keine lesbare Studie hat das stehende Drücken gemessen. Start an der oberen Brust und Endposition mit gestreckten Ellbogen sind Protokollvorgaben (Hernández-Belmonte et al. 2020, sitzend an der Multipresse); Griffbreite 5–7 cm breiter als die Schultern. Armhaltung, leichte Rücklage beim Passieren des Gesichts und Kopfposition sind Konvention.',
    tempo: { basis: 'convention', note: 'Protokolle geben nur „kontrolliert ab, zügig auf“ vor (Hernández-Belmonte et al. 2020); hier 1,5 s ab / 1 s auf.' },
    frames: [
      { label: 'Start', pose: { shank: C(0), knee: C(5), hip: C(2), ankle: C(0), shoulder: C(40, 'Ellbogen vor der Stange, Unterarm etwa senkrecht'), elbow: C(150), armScale: [0.9, 0.95], props: ohpProps },
        facts: [V(0, 'S1', 'protocol', 'Stange berührt am Umkehrpunkt die obere Brust'), V(6, 'S1', 'protocol', 'Griff 5–7 cm breiter als die Schulterbreite (Protokoll)')] },
      { label: 'Gesicht', pose: { shank: C(0), knee: C(5), hip: C(-2, 'leichte Rücklage, damit die Stange am Gesicht vorbeikommt'), ankle: C(0), shoulder: C(85), elbow: C(112), armScale: [0.9, 0.95], props: ohpProps } },
      { label: 'Oben', pose: { shank: C(0), knee: C(5), hip: C(2), ankle: C(0), shoulder: C(172, 'Arme senkrecht über der Schulter'), elbow: V(0, 'S1', 'protocol', 'bis die Ellbogen ganz gestreckt sind'), armScale: [0.9, 0.95], props: ohpProps },
        facts: [V(53.4, 'S1', 'fulltext', 'Stangenweg 53,4 ± 6,5 cm (sitzend, Multipresse, n = 48)'), V(46, 'S1', 'fulltext', 'Geschwindigkeitsminimum („Sticking Point“) bei 46 ± 6 % des Wegs ab 75 % 1RM')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Start', kp: [0] }, { a: 0, b: 1, dur: 0.5, label: 'Drücken', kp: [3] }, { a: 1, b: 2, dur: 0.5, label: 'Drücken', kp: [1, 2] }, { a: 2, b: 2, dur: 0.3, label: 'Oben', kp: [1] }, { a: 2, b: 1, dur: 0.75, label: 'Absenken', kp: [4] }, { a: 1, b: 0, dur: 0.75, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Start', anchor: 'bar', side: 'r', status: 'single', text: 'Start mit der Stange an der oberen Brust, Griff knapp breiter als die Schultern.', src: ['S1'],
        explain: 'Protokoll von Hernández-Belmonte et al. 2020 (sitzend, Multipresse, n = 48): Obergriff 5–7 cm breiter als die Schultern, Stange berührt die obere Brust. Für das stehende Drücken wurde die Startposition nicht gemessen.' },
      { short: 'Oben', anchor: 'wrist', side: 'r', status: 'consensus', text: 'Nach oben drücken, bis die Ellbogen ganz gestreckt sind.', src: ['S1', 'S5'],
        explain: 'Endkriterium der Protokolle. Der volle Bewegungsumfang bis zum gestreckten Ellbogen aktivierte alle gemessenen Schultermuskeln stärker als 90° oder 135° (Paoli et al. 2010, n = 6, sitzend, Abstract).' },
      { short: 'Rumpf', anchor: 'lowBack', side: 'l', status: 'single', text: 'Rumpf ruhig halten: Im Stehen stabilisiert der Körper die Last selbst.', src: ['S6'],
        explain: 'Stehend war das 1RM mit Kurzhanteln ≈ 10 % niedriger als sitzend; stehend und mit Kurzhanteln war die Schulteraktivität am höchsten (Saeterbakken & Fimland 2013, n = 15, Abstract). Wie viel sich die Lendenwirbelsäule im Stehen bewegt, wurde nicht gemessen.' },
      { short: 'Mitte', anchor: 'head', side: 'l', status: 'single', text: 'Die schwerste Stelle liegt etwa auf halber Höhe – dort nicht ins Hohlkreuz ausweichen.', src: ['S1'],
        explain: 'Geschwindigkeitsminimum bei 46 ± 6 % des Stangenwegs ab 75 % 1RM (Hernández-Belmonte et al. 2020, sitzend). „Nicht ins Hohlkreuz“ ist Trainingswissen und nicht untersucht.' },
      { short: 'Ab', anchor: 'elbow', side: 'r', status: 'single', text: 'Stange kontrolliert bis zur oberen Brust absenken.', src: ['S1'],
        explain: 'Protokoll: kontrolliertes Absenken bis zur oberen Brust, dann ohne Pause drücken (Hernández-Belmonte et al. 2020). Ein Tempovergleich liegt nicht vor.' }
    ],
    sources: {
      S1: { label: 'Hernández-Belmonte et al. 2020, Biol Sport', url: 'https://doi.org/10.5114/biolsport.2020.98453', read: 'fulltext', note: 'Sitzend an der Multipresse; übertragen' },
      S5: { label: 'Paoli et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181d756ea', read: 'abstract' },
      S6: { label: 'Saeterbakken & Fimland 2013, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e318276b873', read: 'abstract' }
    }
  },

  // ---------- Schulterdrücken mit Kurzhanteln (sitzend) ----------
  {
    ref: 'shoulder-press-dumbbell', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Bewegung gemessen. Bank 85°, volle Ellbogenstreckung und Hände über den Schultergelenken sind Protokollvorgaben einer EMG-Studie (2013, 24 Frauen, 4,5 kg). Arme außerhalb der Bildebene verkürzt dargestellt; die Tiefe unten ist Konvention.',
    tempo: { basis: 'convention', note: 'Protokolle: selbst gewählt, „kontrolliert“ (EMG-Studie 2013); hier 1,2 s auf / 1,5 s ab.' },
    frames: [
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -98], trunk: V(-5, 'D1', 'protocol', 'Bank 85°'), hip: C(85), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: { elbow: [14, 36], wrist: [20, -8] }, props: shoulderPressProps },
        facts: [V(1, 'D1', 'protocol', 'Umkehrpunkt: Hantelbewegung wechselt von abwärts nach aufwärts; keine Tiefe vorgegeben')] },
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -98], trunk: V(-5, 'D1', 'protocol', 'Bank 85°'), hip: C(85), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: { elbow: [8, -50], wrist: [10, -102] }, props: shoulderPressProps },
        facts: [V(0, 'D1', 'protocol', 'volle Ellbogenstreckung, Hände über den Schultergelenken')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.1, label: 'Unten', kp: [0, 2] }, { a: 0, b: 1, dur: 1.2, label: 'Drücken', kp: [1] }, { a: 1, b: 1, dur: 0.4, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 1.5, label: 'Absenken', kp: [2, 3] }],
    keyPoints: [
      { short: 'Bank', anchor: 'back', side: 'l', status: 'single', text: 'Bank fast senkrecht (≈ 85°) stellen; Rücken und Gesäß bleiben an der Lehne.', src: ['D1', 'S1'],
        explain: '85° Lehne in der EMG-Studie 2013; 10° Rücklage mit Kopf, Rücken und Gesäß an der Lehne beim sitzenden Langhanteldrücken (Hernández-Belmonte et al. 2020). Ein Lehnenvergleich wurde nicht untersucht.' },
      { short: 'Oben', anchor: 'wrist', side: 'r', status: 'consensus', text: 'Hanteln hochdrücken, bis die Ellbogen gestreckt sind; Hände über den Schultern.', src: ['D1', 'S5'],
        explain: 'Protokoll der EMG-Studie 2013 (volle Streckung, Hände über den Schultergelenken). Der volle Bewegungsumfang aktivierte die Schultermuskeln stärker als Teilbereiche (Paoli et al. 2010, n = 6, Abstract).' },
      { short: 'Ab', anchor: 'elbow', side: 'r', status: 'single', text: 'Kontrolliert absenken und unten ohne Pause wenden.', src: ['D1'],
        explain: 'Umkehrpunkt im Protokoll: der Moment, in dem die Hantel die Richtung wechselt; eine Tiefe wurde nicht vorgegeben oder gemessen.' },
      { short: 'Hanteln', anchor: 'hand', side: 'r', status: 'single', text: 'Kurzhanteln fordern die Schulter etwas mehr als die Langhantel; das Gewicht ist niedriger.', src: ['S6', 'D3'],
        explain: 'Sitzend war die vordere Schulter mit Kurzhanteln ≈ 11 % aktiver als mit der Langhantel; das 1RM mit Kurzhanteln lag stehend ≈ 7 % unter dem der Langhantel (Saeterbakken & Fimland 2013, n = 15, Abstract). Mit Kurzhanteln sank die Last und die Trizepsaktivität (Kohler et al. 2010, n = 30, Abstract).' }
    ],
    sources: {
      D1: { label: 'Luczak et al. 2013, J Sports Med', url: 'https://doi.org/10.1155/2013/612650', read: 'fulltext' },
      D3: { label: 'Kohler et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181c8655a', read: 'abstract' },
      S1: { label: 'Hernández-Belmonte et al. 2020, Biol Sport', url: 'https://doi.org/10.5114/biolsport.2020.98453', read: 'fulltext' },
      S5: { label: 'Paoli et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181d756ea', read: 'abstract' },
      S6: { label: 'Saeterbakken & Fimland 2013, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e318276b873', read: 'abstract' }
    }
  },

  // ---------- Langhantelrudern ----------
  {
    ref: 'barbell-row', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat Rumpf-, Hüft-, Knie- oder Armwinkel beim vorgebeugten Rudern gemessen. Vorgaben aus einem Kraft-Geschwindigkeits-Protokoll (Sports 2023): schulterbreiter Obergriff, Knie leicht gebeugt, Oberkörper weit vorgeneigt, Zug aus gestreckten Armen bis zum Bauch. Die Rumpfneigung (≈ 65°) ist Konvention.',
    tempo: { basis: 'protocol', note: '1 s ziehen, 1 s absenken (Metronom 60/min; Fenwick et al. 2009).' },
    frames: [
      { label: 'Unten', pose: { shank: C(5), knee: V(20, 'R1', 'protocol', '„Beine leicht gebeugt“'), ankle: C(5), trunk: C(65, 'Oberkörper weit vorgeneigt (Protokoll: „fast waagerecht“); nicht gemessen'), shoulder: C(65, 'Arme hängen senkrecht'), elbow: V(0, 'R1', 'protocol', 'Start mit gestreckten Ellbogen'), props: rowBarProps } },
      { label: 'Oben', pose: { shank: C(5), knee: V(20, 'R1', 'protocol', '„Beine leicht gebeugt“'), ankle: C(5), trunk: C(65, 'Oberkörper weit vorgeneigt; nicht gemessen'), shoulder: C(-25, 'Oberarm hinter die Rumpflinie gezogen; nicht gemessen'), elbow: C(95, 'nicht gemessen; Stange am Bauch'), armScale: [0.95, 0.95], props: rowBarProps },
        facts: [V(1, 'R1', 'protocol', 'Endpunkt: Stange berührt den Bauch bzw. unteren Brustkorb')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 1.0, label: 'Ziehen', kp: [2] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [2, 3] }, { a: 1, b: 0, dur: 1.0, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Griff', anchor: 'bar', side: 'r', status: 'single', text: 'Griff etwa schulterbreit, Handrücken nach oben (Obergriff).', src: ['R1'],
        explain: 'Protokoll (Sports 2023, n = 28): Obergriff auf Schulterbreite (Akromion zu Akromion). Griffbreiten wurden beim Langhantelrudern nicht verglichen.' },
      { short: 'Haltung', anchor: 'back', side: 'l', status: 'consensus', text: 'Knie leicht beugen, aus der Hüfte vorkippen, Rücken neutral halten.', src: ['R1', 'R3'],
        explain: 'Aufbau in beiden Protokollen: Knie leicht gebeugt, Oberkörper weit vorgeneigt, Wirbelsäule neutral. Trotz dieser Anweisung beugte sich die Lendenwirbelsäule im Mittel um 22,9° (42,9 % des eigenen Maximums; Fenwick et al. 2009, n = 7). Die gezeigte Rumpfneigung ist Konvention.' },
      { short: 'Zug', anchor: 'belly', side: 'r', status: 'single', text: 'Aus gestreckten Armen die Stange zum unteren Brustkorb oder Bauch ziehen.', src: ['R1'],
        explain: 'Start mit gestreckten Ellbogen, Ende bei Berührung des Bauchs (Sports 2023). Ellbogenwinkel und Zugweg wurden nicht gemessen.' },
      { short: 'Rücken', anchor: 'lowBack', side: 'l', status: 'single', text: 'Vorgebeugt belastete die Lendenwirbelsäule stärker als Kabel- oder hängendes Rudern.', src: ['R3'],
        explain: 'Fenwick, Brown & McGill 2009 (7 Männer, Modell aus EMG und Bewegung): Druck auf L4/L5 3576 N beim vorgebeugten Rudern, 2457 N beim einarmigen Kabelrudern, 2339 N beim Rudern im Hang; dafür die höchste Steifigkeit der Lendenwirbelsäule. Ob das schädlich oder nützlich ist, hängt vom Ziel ab; Verletzungsdaten gibt es nicht.' },
      { short: 'Ab', anchor: 'elbow', side: 'r', status: 'single', text: 'Kontrolliert absenken, bis die Arme wieder gestreckt sind.', src: ['R1'],
        explain: 'Jede Wiederholung begann und endete mit gestreckten Ellbogen (Sports 2023). Das Absenktempo ist nicht untersucht.' }
    ],
    sources: {
      R1: { label: 'Nieto-Acevedo et al. 2023, Sports', url: 'https://doi.org/10.3390/sports11110220', read: 'fulltext' },
      R3: { label: 'Fenwick, Brown & McGill 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181b07334', read: 'fulltext', note: 'Volltext: Heft 23(5), 1408–1417; PubMed führt dieselbe Arbeit zusätzlich unter 23(2), 350–358 (doi 10.1519/JSC.0b013e3181942019)' }
    }
  },

  // ---------- Bizepscurls ----------
  {
    ref: 'dumbbell-curl', view: 'side', basis: 'measured',
    basisNote: 'Bewegungsumfang des Ellbogens aus Marcolin et al. 2018 (Elektrogoniometer, 12 trainierte Männer, 65 % 1RM, Volltext): 123,1 ± 12,3°. Absolute Start- und Endwinkel wurden nicht berichtet; Start ≈ 15° Beugung ist Konvention, der obere Winkel folgt daraus. Leichte Vorbewegung des Ellbogens oben ist Konvention.',
    tempo: { basis: 'measured', note: 'Konzentrisch 1,44 ± 0,26 s, exzentrisch 1,72 ± 0,47 s bei Metronomvorgabe 3 s je Wiederholung (Marcolin et al. 2018).' },
    frames: [
      { label: 'Unten', pose: { shank: C(0), knee: C(3), hip: C(0), ankle: C(0), shoulder: C(0), elbow: C(15, 'fast gestreckt; Start nicht gemessen'), props: curlProps } },
      { label: 'Oben', pose: { shank: C(0), knee: C(3), hip: C(0), ankle: C(0), shoulder: C(8, 'leichte Vorbewegung des Ellbogens; nicht gemessen'), elbow: K(138, 'S1', 'Start 15° + gemessener Bewegungsumfang 123,1 ± 12,3°'), props: curlProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 1.44, label: 'Beugen', kp: [1, 3] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 1.72, label: 'Senken', kp: [4] }],
    keyPoints: [
      { short: 'Oberarm', anchor: 'uarm', side: 'l', status: 'single', text: 'Oberarme bleiben seitlich am Körper; nur der Unterarm bewegt sich.', src: ['S1', 'S2'],
        explain: 'Haltung in den Protokollen: stehend, Arme seitlich am Körper (Oliveira et al. 2009; Marcolin et al. 2018). Wie weit der Ellbogen tatsächlich nach vorn wandert, wurde in keiner begutachteten Studie gemessen.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Rumpf und Knie ruhig halten – kein Schwung aus dem Körper.', src: ['S1'],
        explain: 'Rumpfbewegung und Kniebeugung wurden in Marcolin et al. 2018 per Sichtkontrolle unterbunden; gemessen wurde das Ausweichen nicht.' },
      { short: 'Weg', anchor: 'hand', side: 'r', status: 'single', text: 'Unten den Arm fast strecken, oben so weit beugen, wie es ohne Ausweichen geht.', src: ['S1'],
        explain: 'Gemessener Umfang 123,1 ± 12,3° mit Kurzhanteln (Marcolin et al. 2018). Start- und Endwinkel wurden nicht berichtet.' },
      { short: 'Hand', anchor: 'wrist', side: 'r', status: 'single', text: 'Handfläche dreht beim Heben nach oben (ab etwa halber Beugung).', src: ['S1'],
        explain: 'Beschreibung der Kurzhantelcurls durch die Autoren (halb gedreht am Start, supiniert ab ≈ 90° Beugung), keine Messung. Ob die Drehung die Bizepsaktivität erhöht, wurde dort nicht geprüft.' },
      { short: 'Variante', anchor: 'elbow', side: 'l', status: 'single', text: 'Mit Kurzhanteln war der Bewegungsumfang etwas größer als mit SZ- oder gerader Stange.', src: ['S1', 'S2'],
        explain: 'Kurzhantel 123,1°, SZ-Stange 119,9°, gerade Stange 117,3° (Marcolin et al. 2018; der Text der Studie widerspricht an einer Stelle den eigenen Mittelwerten). Stehende und Schrägbank-Curls aktivierten den Bizeps über den ganzen Weg ähnlich, Scott-Curls nur über einen kurzen Bereich (Oliveira et al. 2009, n = 22, Abstract).' }
    ],
    sources: {
      S1: { label: 'Marcolin et al. 2018, PeerJ', url: 'https://doi.org/10.7717/peerj.5165', read: 'fulltext' },
      S2: { label: 'Oliveira et al. 2009, J Sports Sci Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/', read: 'abstract' }
    }
  },

  // ---------- Trizepsdrücken am Kabel ----------
  {
    ref: 'triceps-pushdown', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Bewegung gemessen. Oberarme senkrecht und nah am Körper, Rumpf leicht vorgeneigt, Ellbogen 90° → 0° sind Protokollvorgaben (Hussain et al. 2020; Rendos et al. 2016). Die Rumpfneigung (≈ 8°) ist Konvention.',
    tempo: { basis: 'protocol', note: '1,5 s je Phase (Rendos et al. 2016); Hussain et al. 2020: 3 Schläge drücken / 2 Schläge zurück ohne Pause.' },
    frames: [
      { label: 'Oben', pose: { rootPos: [-44, -15], shank: C(3), knee: C(8), ankle: C(3), trunk: C(8, 'leicht vorgeneigt (Protokoll, kein Winkel)'), shoulder: K(8, 'T1', 'Oberarm senkrecht bei 8° Rumpfneigung'), elbow: V(90, 'T2', 'protocol'), armScale: [1, 0.95], props: pushdownProps } },
      { label: 'Gestreckt', pose: { rootPos: [-44, -15], shank: C(3), knee: C(8), ankle: C(3), trunk: C(8, 'leicht vorgeneigt (Protokoll, kein Winkel)'), shoulder: K(8, 'T1', 'Oberarm senkrecht bei 8° Rumpfneigung'), elbow: V(0, 'T1', 'protocol', 'volle Streckung'), armScale: [1, 0.95], props: pushdownProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Oben', kp: [0, 4] }, { a: 0, b: 1, dur: 1.5, label: 'Drücken', kp: [2] }, { a: 1, b: 1, dur: 0.2, label: 'Gestreckt', kp: [2] }, { a: 1, b: 0, dur: 1.5, label: 'Zurück', kp: [3, 1] }],
    keyPoints: [
      { short: 'Oberarme', anchor: 'uarm', side: 'l', status: 'single', text: 'Oberarme senkrecht und nah am Körper; sie bleiben während der Bewegung ruhig.', src: ['T1'],
        explain: 'Protokoll von Hussain et al. 2020 (n = 25, Untrainierte): Oberarme nah am, aber nicht am Körper, senkrecht zum Boden. Die Oberarmbewegung wurde nicht gemessen.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper leicht vorgeneigt; nicht mit dem Körpergewicht nachdrücken.', src: ['T1'],
        explain: 'Vorneigung nur so weit, dass die Stange bei voller Streckung am Körper vorbeikommt; keine Unterstützung durch das Körpergewicht (Protokoll). Ein Winkel wurde nicht angegeben.' },
      { short: 'Unten', anchor: 'hand', side: 'r', status: 'consensus', text: 'Nach unten drücken, bis die Arme ganz gestreckt sind.', src: ['T1', 'T2'],
        explain: 'Endpunkt beider Protokolle (0° Ellbogenbeugung).' },
      { short: 'Zurück', anchor: 'elbow', side: 'l', status: 'consensus', text: 'Zurück bis etwa 90° im Ellbogen, kontrolliert und ohne Pause umkehren.', src: ['T1', 'T2'],
        explain: 'Startwinkel 90° (Rendos et al. 2016) und keine Pause am Umkehrpunkt (Hussain et al. 2020). Ein größerer Bereich wurde nicht verglichen.' },
      { short: 'Griff', anchor: 'wrist', side: 'r', status: 'single', text: 'Gerade Stange im Obergriff, schulterbreit; Griffform ändert vor allem den Unterarm.', src: ['T1', 'T2'],
        explain: 'Schulterbreiter Obergriff an der geraden Stange (Hussain et al. 2020). Verschiedene Griffe (Stange, Kugelgriff) änderten die Trizepsaktivität nicht, nur die der Unterarmmuskeln (Rendos et al. 2016, Abstract).' }
    ],
    sources: {
      T1: { label: 'Hussain et al. 2020, Front Physiol', url: 'https://doi.org/10.3389/fphys.2020.00112', read: 'fulltext' },
      T2: { label: 'Rendos et al. 2016, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000001293', read: 'abstract' }
    }
  },

  // ---------- Schrägbankdrücken mit Kurzhanteln ----------
  {
    ref: 'incline-press-dumbbell', view: 'side', basis: 'transfer',
    basisNote: 'Keine Kinematik für Kurzhanteln auf der Schrägbank gefunden. Der Ellbogen-Bewegungsumfang (84,3 ± 6,4°) stammt aus einer Langhantel-Schrägbankstudie mit leichter Last (Schütz et al. 2022, 20 Personen, Bankwinkel nicht berichtet; Volltext). Bankwinkel 30° nach Rodríguez-Ridao et al. 2020; Armhaltung außerhalb der Bildebene verkürzt dargestellt, Tiefe unten ist Konvention.',
    tempo: { basis: 'protocol', note: 'Exzentrisch 2–3 s (Langhantel-Schrägbank, Sci Rep 2025); Drücken ≈ 1,2 s (Konvention).' },
    frames: [
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -100], trunk: V(-60, 'P3', 'abstract', 'Bank 30° (höchste Aktivität des oberen Brustmuskels)'), hip: C(30), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: { elbow: [10, -54], wrist: [12, -106] }, props: inclineProps },
        facts: [V(0, 'P2', 'protocol', 'Drücken bis zur vollen Ellbogenstreckung')] },
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -100], trunk: V(-60, 'P3', 'abstract', 'Bank 30°'), hip: C(30), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: { elbow: [16, 30], wrist: [30, -14] }, props: inclineProps },
        facts: [V(84.3, 'P1', 'fulltext', 'Übertragen: Ellbogen-Bewegungsumfang 84,3 ± 6,4° (Langhantel, 15 % Körpergewicht); 81,4° bei 30 %'), V(1, 'P5', 'protocol', 'Unten: Hanteln bis auf Brusthöhe (Flachbank: Band zwischen den Hanteln berührt die Brust)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 2.5, label: 'Absenken', kp: [2] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [2] }, { a: 1, b: 0, dur: 1.2, label: 'Drücken', kp: [3, 4] }],
    keyPoints: [
      { short: 'Bank', anchor: 'back', side: 'l', status: 'contested', text: 'Bank auf etwa 30–45° stellen; flacher betont die Brust, steiler die vordere Schulter.', src: ['P3', 'P4', 'P2'],
        explain: 'Umstritten. 30° ergab die höchste Aktivität des oberen Brustmuskels, ab 45° verlagerte sie sich zur vorderen Schulter (Rodríguez-Ridao et al. 2020, n = 30, 60 % 1RM, Abstract); 30° und 45° lagen beide über der Flachbank, nur in einem Teil der Druckphase (Lauver et al. 2016, n = 14, Abstract). Die Kraft-Geschwindigkeits-Studie nutzte 45° (Sci Rep 2025). Langzeitwachstum nach Bankwinkel wurde nicht untersucht.' },
      { short: 'Kontakt', anchor: 'upperBack', side: 'l', status: 'consensus', text: 'Kopf, Schultern und Gesäß bleiben auf der Bank, Füße am Boden.', src: ['P5', 'P2'],
        explain: 'Protokolle: Kopf, Schultern und Hüfte an der Bank (Saeterbakken et al. 2020, Flachbank); Füße am Boden (Sci Rep 2025, Schrägbank 45°).' },
      { short: 'Senken', anchor: 'elbow', side: 'r', status: 'single', text: 'Hanteln kontrolliert bis auf Brusthöhe absenken (etwa 2–3 s).', src: ['P2', 'P5'],
        explain: 'Exzentrisch 2–3 s als Vorgabe (Sci Rep 2025, Langhantel); Tiefe bis auf Brusthöhe (Saeterbakken et al. 2020, Kurzhanteln, Flachbank). Für Kurzhanteln auf der Schrägbank liegt keine Messung vor.' },
      { short: 'Oben', anchor: 'wrist', side: 'r', status: 'consensus', text: 'Nach oben drücken, bis die Arme gestreckt sind.', src: ['P2', 'P5'],
        explain: 'Endkriterium beider Protokolle. Der Ellbogenweg auf der Schrägbank war etwas größer als auf der Flachbank (84° gegenüber 80°; Schütz et al. 2022, Langhantel).' },
      { short: 'Hanteln', anchor: 'hand', side: 'r', status: 'single', text: 'Mit Kurzhanteln ist das Gewicht niedriger, die Brustaktivität ähnlich wie mit der Stange.', src: ['P6'],
        explain: 'Flachbank, 1RM: Kurzhanteln 17 % weniger Last als die Langhantel, Brust- und vordere Schulteraktivität gleich, Bizeps höher, Trizeps niedriger (Saeterbakken et al. 2011, n = 12, Abstract). Für die Schrägbank nicht gemessen.' }
    ],
    sources: {
      P1: { label: 'Schütz et al. 2022, Sports (MDPI)', url: 'https://doi.org/10.3390/sports10020019', read: 'fulltext', note: 'Langhantel, 15/30 % Körpergewicht, Bankwinkel nicht berichtet' },
      P2: { label: 'Marques et al. 2025, Sci Rep', url: 'https://doi.org/10.1038/s41598-025-12166-5', read: 'fulltext' },
      P3: { label: 'Rodríguez-Ridao et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17197339', read: 'abstract' },
      P4: { label: 'Lauver et al. 2016, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2015.1022605', read: 'abstract' },
      P5: { label: 'Saeterbakken et al. 2020, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0235555', read: 'fulltext' },
      P6: { label: 'Saeterbakken et al. 2011, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2010.543916', read: 'abstract' }
    }
  },
  // ---------- Sumo-Kniebeuge (Frontansicht, v2.9) ----------
  {
    ref: 'sumo-squat', checkedAt: '2026-10-19', view: 'front', basis: 'measured',
    basisNote: 'Frontansicht, Langhantel hochstabig. Fußabstand ≈ 0,5 m im Bereich der Studienprotokolle (1,5-fache Trochanterbreite in Sinclair et al. 2022; breite Gruppe in Escamilla et al. 2001 mit 169 % der Schulterbreite, Abstract). Knie und Dorsalflexion unten aus Sinclair et al. 2022 (3D-Motion-Capture, 20 trainierte Männer, 70 % 1RM, Stand 1,5-fache Trochanterbreite; Tabelle 6 am PDF geprüft). Hüftbeugung und Rumpfneigung wurden dort nicht berichtet. Fußöffnung, Rumpfneigung und Armhaltung sind Konvention; das Bein ist räumlich gelöst und in die Bildebene projiziert.',
    tempo: { basis: 'measured', note: 'Wiederholung 2,19 ± 0,22 s, davon Aufstehen 1,10 ± 0,10 s (breiter Stand, Sinclair et al. 2022, Tabelle 3); Absenken daraus ≈ 1,1 s.' },
    frames: [
      { label: 'Oben', pose: { legs: { planted: true, stance: SUMO.stance, toeOut: SUMO.toeOut, knee: C(4, 'fast gestreckt'), shank: C(0) }, trunkFlex: C(5), armPoints: SUMO.arms, props: sumoProps } },
      { label: 'Unten', pose: { legs: { planted: true, stance: SUMO.stance, toeOut: SUMO.toeOut, knee: V(128.5, 'S1', 'fulltext', '128,54 ± 6,92° (breit, Tabelle 6)'), shank: V(19.4, 'S1', 'fulltext', 'gleich der Dorsalflexion 19,44 ± 6,99° (breit, Tabelle 6; Fuß flach)') }, trunkFlex: C(35, 'kein Unterschied zum engen Stand (Escamilla et al. 2001)'), armPoints: SUMO.arms, props: sumoProps },
        facts: [V(134.1, 'S1', 'fulltext', 'zum Vergleich enger Stand (1,0-fache Trochanterbreite): Knie 134,13 ± 4,44°, Dorsalflexion 27,68 ± 6,20°'), V(23.2, 'S1', 'fulltext', 'Hüftabduktion unten −23,17 ± 9,38° (breit); die gezeichnete Figur zeigt ≈ 36° (andere Winkeldefinition, Zeichenmodell)'), V(112.1, 'S1', 'fulltext', 'Bewegungsumfang Knie 112,09 ± 12,09°'), V(169, 'S2', 'abstract', 'Stand 169 ± 12 % der Schulterbreite (breite Gruppe)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 1.1, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [2, 3] }, { a: 1, b: 0, dur: 1.1, label: 'Aufstehen', kp: [4] }],
    keyPoints: [
      { short: 'Stand', anchor: 'footL', side: 'l', status: 'single', text: 'Füße etwa 1,5- bis 1,7-fach schulterbreit, Zehen deutlich nach außen.', src: ['S2', 'S1'],
        explain: 'Breite Gruppe in Escamilla et al. 2001: 169 ± 12 % der Schulterbreite, Füße 6° weiter nach außen gedreht als im engen Stand (Abstract). Sinclair et al. 2022 gaben 1,5-fache Trochanterbreite vor. Eine optimale Breite ist nicht belegt.' },
      { short: 'Knie', anchor: 'kneeR', side: 'r', status: 'single', text: 'Knie zeigen beim Absenken in Richtung der Fußspitzen.', src: ['S3'],
        explain: 'Lorenzetti et al. 2018 raten bei breitem Stand zu nach außen gedrehten Füßen, damit die Knie über den Füßen bleiben. Einzelstudie mit Körpergewicht und 50 % Zusatzlast.' },
      { short: 'Schienbein', anchor: 'shinL', side: 'l', status: 'consensus', text: 'Schienbeine bleiben steiler als bei der engen Kniebeuge.', src: ['S1', 'S2'],
        explain: 'Dorsalflexion unten 19,4° im breiten gegenüber 27,7° im engen Stand (Sinclair et al. 2022); Schienbeine 5–9° senkrechter (Escamilla et al. 2001, Abstract).' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper neigt sich etwa wie bei der normalen Kniebeuge.', src: ['S2'],
        explain: 'Kein signifikanter Unterschied der Rumpfposition zwischen engem, mittlerem und breitem Stand (Escamilla et al. 2001, Abstract). Die gezeigte Neigung ist Konvention.' },
      { short: 'Muskeln', anchor: 'thighR', side: 'r', status: 'single', text: 'Breiter Stand: mehr Arbeit für Gesäß und Beinbeuger, weniger für den Quadrizeps.', src: ['S1'],
        explain: 'Sinclair et al. 2022: im breiten Stand größere modellierte Kräfte in Gesäß, Beinbeuger und Wade, im engen größere Quadrizepskraft. Die Kräfte sind aus einem Muskel-Skelett-Modell berechnet, nicht direkt gemessen.' }
    ],
    sources: {
      S1: { label: 'Sinclair et al. 2022, Sports (Basel)', url: 'https://doi.org/10.3390/sports10090136', read: 'fulltext', note: 'Experiment 2, Tabellen 3 und 6 am PDF geprüft' },
      S2: { label: 'Escamilla et al. 2001, Med Sci Sports Exerc', url: 'https://doi.org/10.1097/00005768-200106000-00019', read: 'abstract' },
      S3: { label: 'Lorenzetti et al. 2018, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/s13102-018-0103-7', read: 'fulltext' }
    }
  }
,
  // ---------- Kniebeuge an der Multipresse (v2.9) ----------
  {
    ref: 'smith-machine-squat', checkedAt: '2026-10-19', view: 'side', basis: 'measured',
    basisNote: 'Winkel unten aus Kotiuk et al. 2022 (57 Sportler, 31 Männer und 26 Frauen, nur die 20-kg-Stange der Maschine, selbst gewählte Tiefe; Neutral-Null-Methode, Messgerät nicht beschrieben; Volltext). Die Stange läuft senkrecht in der Führung (Gutierrez & Bahamonde 2009); die Füße stehen davor. Oben und in der Mitte ist die Schienbeinneigung so gelöst, dass die Stange senkrecht über demselben Punkt bleibt – deshalb lehnt die Figur oben leicht zurück. Diese Winkel sind berechnet, nicht gemessen.',
    tempo: { basis: 'convention', note: 'Je ≈ 1,5 s ab und auf (Konvention); in den gelesenen Studien nicht gemessen.' },
    frames: [
      { label: 'Oben', pose: { shank: K(SMITH.shank[0], 'K1', 'aus der senkrechten Stangenbahn gelöst'), knee: C(4), hip: C(6), ankle: C(0), armTargetTrunk: [-8, 15], armScale: [0.55, 0.95], elbowSide: -1, props: smithProps } },
      { label: 'Mitte', pose: { shank: K(SMITH.shank[1], 'K1', 'aus der senkrechten Stangenbahn gelöst'), knee: C(50), hip: C(58), ankle: C(0), armTargetTrunk: [-8, 15], armScale: [0.55, 0.95], elbowSide: -1, props: smithProps } },
      { label: 'Unten', pose: { shank: V(4.46, 'K1', 'fulltext', 'Schienbein-Vorneigung 4,46 ± 4,80°'), knee: V(94.42, 'K1', 'fulltext', '94,42 ± 4,78°'), hip: V(106.28, 'K1', 'fulltext', '106,28 ± 9,14°'), ankle: K(4.46, 'K1', 'gleich der Schienbeinneigung (Fuß flach)'), armTargetTrunk: [-8, 15], armScale: [0.55, 0.95], elbowSide: -1, props: smithProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 0.75, label: 'Absenken', kp: [0] }, { a: 1, b: 2, dur: 0.75, label: 'Absenken', kp: [1, 2] }, { a: 2, b: 2, dur: 0.3, label: 'Unten', kp: [1, 2, 3] }, { a: 2, b: 1, dur: 0.75, label: 'Aufstehen', kp: [3] }, { a: 1, b: 0, dur: 0.75, label: 'Aufstehen', kp: [] }],
    keyPoints: [
      { short: 'Füße', anchor: 'foot', side: 'r', status: 'single', text: 'Füße ein Stück vor die Stange stellen; die Stange läuft senkrecht.', src: ['G1'],
        explain: 'Gutierrez & Bahamonde 2009 (Tagungsbeitrag, 8 erfahrene Personen, 3D-Video, 50 % Körpergewicht): Wegen der senkrechten Führung setzten alle die Füße nach vorn; die Stange war bei maximaler Kniebeugung weiter vom Knie entfernt als bei der freien Kniebeuge. Wie weit, ist nicht angegeben.' },
      { short: 'Tiefe', anchor: 'knee', side: 'r', status: 'single', text: 'Meist weniger tief als frei: Knie unten etwa 95° gebeugt.', src: ['K1'],
        explain: 'Kotiuk et al. 2022: Multipresse Knie 94,4° und Hüfte 106,3°, freie Kniebeuge bis zur Waagerechten 113,4° und 128,2° (selbst gewählte Ausführung). Gutierrez & Bahamonde 2009 fanden an der Multipresse in allen Gelenken weniger Bewegungsumfang.' },
      { short: 'Schienbein', anchor: 'shin', side: 'l', status: 'single', text: 'Das Schienbein bleibt fast senkrecht, weil die Füße vor der Stange stehen.', src: ['K1', 'G1'],
        explain: 'Schienbein-Vorneigung unten 4,5 ± 4,8° an der Multipresse gegenüber 23,3° bei der freien Kniebeuge (Kotiuk et al. 2022). Weniger Dorsalflexion auch in Gutierrez & Bahamonde 2009.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Der Oberkörper bleibt aufrechter als bei der freien Kniebeuge.', src: ['G1', 'K1'],
        explain: 'Weniger Rumpfbeugung an der Multipresse (Gutierrez & Bahamonde 2009). Aus den Winkeln von Kotiuk et al. 2022 berechnet: unten ≈ 16° Vorneigung gegenüber ≈ 38° frei.' }
    ],
    sources: {
      K1: { label: 'Kotiuk et al. 2022, Cent Eur J Sport Sci Med', url: 'https://doi.org/10.18276/cej.2022.4-02', read: 'fulltext', note: 'Neutral-Null-Methode, Messgerät nicht beschrieben' },
      G1: { label: 'Gutierrez & Bahamonde 2009, ISBS-Tagungsband', url: 'https://ojs.ub.uni-konstanz.de/cpa/article/view/3199', read: 'fulltext', note: 'Tagungsbeitrag, keine begutachtete Zeitschrift' }
    }
  },

  // ---------- Hack Squat (v2.9) ----------
  {
    ref: 'hack-squat', checkedAt: '2026-10-19', view: 'side', basis: 'convention',
    basisNote: 'Keine gelesene Studie hat Gelenkwinkel am Hack Squat gemessen oder vorgegeben (34 PubMed-Treffer gesichtet). Gezeigt ist ein üblicher Aufbau: Rücken auf einem um 45° geneigten Schlitten, Schulterpolster, Füße schulterbreit mittig auf einer flachen Plattform; das Knie beugt bis etwa 100°. Die Hüfte läuft auf der Schiene, Knie- und Schienbeinwinkel sind aus dieser Geometrie gelöst. Alles Zeichenkonvention.',
    tempo: { basis: 'convention', note: 'Je ≈ 1,5 s ab und auf (Konvention). Clark et al. 2019: Die Absenkphase dauerte länger als bei der Kniebeuge, die Hebephase gleich lang.' },
    frames: [
      { label: 'Oben', pose: { root: 'ankle', rootPos: [0, -15 - HACK.plat], trunk: C(-45, 'Schlitten 45° (Konvention)'), shank: K(HACK.top.shank, [], 'aus der Schienenbahn gelöst'), knee: C(HACK.top.knee), foot: C(70, 'Fuß flach auf der vorn angehobenen Plattform (20°)'), armTargetTrunk: [6, 6], armScale: [0.7, 0.8], elbowSide: -1, props: hackProps } },
      { label: 'Unten', pose: { root: 'ankle', rootPos: [0, -15 - HACK.plat], trunk: C(-45, 'Schlitten 45° (Konvention)'), shank: K(HACK.bottom.shank, [], 'aus der Schienenbahn gelöst'), knee: C(HACK.bottom.knee, 'Konvention; Studien geben kein Maß'), foot: C(70, 'Fuß flach auf der vorn angehobenen Plattform (20°)'), armTargetTrunk: [6, 6], armScale: [0.7, 0.8], elbowSide: -1, props: hackProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0, 2] }, { a: 0, b: 1, dur: 1.6, label: 'Absenken', kp: [1] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [1] }, { a: 1, b: 0, dur: 1.4, label: 'Drücken', kp: [0] }],
    keyPoints: [
      { short: 'Rücken', anchor: 'back', side: 'l', status: 'single', text: 'Rücken und Schultern liegen am Polster; der Schlitten führt die Bahn.', src: ['C1'],
        explain: 'Durch die Stütze am Rücken war die Rumpfmuskulatur beim Hack Squat weniger aktiv als bei der Kniebeuge, und das 1RM war höher (Clark et al. 2019, 10 Männer, Abstract).' },
      { short: 'Tiefe', anchor: 'knee', side: 'r', status: 'single', text: 'Kontrolliert absenken, bis die Oberschenkel etwa parallel zur Plattform sind.', src: ['C1'],
        explain: 'Die Absenkphase dauerte beim Hack Squat länger als bei der Kniebeuge (Clark et al. 2019). Die gezeigte Tiefe (≈ 100° Knie) ist Konvention.' },
      { short: 'Last', anchor: 'thigh', side: 'r', status: 'single', text: 'Meist mehr Gewicht als bei der Kniebeuge möglich, weil der Rücken gestützt ist.', src: ['C1'],
        explain: 'Das 1RM war beim Hack Squat signifikant höher als bei der Kniebeuge, die Rumpfmuskeln dabei weniger aktiv (Clark et al. 2019, 10 Männer, Abstract).' }
    ],
    sources: {
      C1: { label: 'Clark et al. 2019, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000002144', read: 'abstract' }
    }
  },

  // ---------- Step-up (v2.9) ----------
  {
    ref: 'dumbbell-step-up', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Keine gelesene Studie hat Hüft- und Rumpfwinkel beim Step-up gemessen. Boxhöhe und Startstellung sind ein Studienprotokoll: Box so hoch, dass Knie und Sprunggelenk mit dem Fuß auf der Box je 90° haben (38,7–41,3 cm; Bruenger et al. 2012, Tagungsbeitrag), hier 40 cm. Rumpfneigung, Hüfte und das hintere Bein sind Konvention.',
    tempo: { basis: 'protocol', note: '1 s auf / 1 s ab mit Metronom (Bruenger et al. 2012); hier etwas langsamer mit Halten oben (Konvention).' },
    frames: [
      { label: 'Fuß auf der Box', pose: { rootPos: [0, -15 - STEPUP.box], shank: V(0, 'B1', 'protocol', 'Sprunggelenk 90° (Schienbein senkrecht)'), knee: V(90, 'B1', 'protocol', 'Knie 90° mit dem Fuß auf der Box'), trunk: C(12), ankle: C(0), leg2: { ankle: [-92, -15], foot: C(90) }, armPlumb: true, elbow: C(0), props: stepUpProps } },
      { label: 'Hochdrücken', pose: { rootPos: [0, -15 - STEPUP.box], shank: C(4), knee: C(40), trunk: C(8), ankle: C(4), leg2: { ankle: [-62, -105], foot: C(110) }, armPlumb: true, elbow: C(0), props: stepUpProps } },
      { label: 'Oben', pose: { rootPos: [0, -15 - STEPUP.box], shank: C(0), knee: C(3), trunk: C(2), ankle: C(0), leg2: { ankle: [-4, -15 - STEPUP.box], foot: C(90) }, armPlumb: true, elbow: C(0), props: stepUpProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Start', kp: [0, 1] }, { a: 0, b: 1, dur: 0.6, label: 'Hochdrücken', kp: [1] }, { a: 1, b: 2, dur: 0.5, label: 'Hochdrücken', kp: [] }, { a: 2, b: 2, dur: 0.4, label: 'Oben', kp: [2] }, { a: 2, b: 1, dur: 0.5, label: 'Absenken', kp: [3] }, { a: 1, b: 0, dur: 0.6, label: 'Absenken', kp: [3] }],
    keyPoints: [
      { short: 'Box', anchor: 'box', side: 'r', status: 'single', text: 'Boxhöhe so wählen, dass das Knie mit dem Fuß oben etwa 90° gebeugt ist.', src: ['B1', 'D1'],
        explain: 'Bruenger et al. 2012 (Tagungsbeitrag, 12 Männer): Box 38,7–41,3 cm, sodass Knie und Sprunggelenk je 90° hatten. Dwyer et al. 2010 nutzten eine niedrige 20-cm-Box (Step-up-and-over) und maßen 83° Spitzenbeugung im Knie (Männer). Höhere Boxen beugen das Knie mehr; ein Optimum ist nicht belegt.' },
      { short: 'Fuß', anchor: 'foot', side: 'r', status: 'single', text: 'Den ganzen Fuß auf die Box setzen.', src: ['B1'],
        explain: 'Startstellung im Protokoll von Bruenger et al. 2012 (Fuß flach auf der Box, Sprunggelenk 90°).' },
      { short: 'Oben', anchor: 'hip', side: 'l', status: 'single', text: 'Oben ganz aufrichten, dann das hintere Bein zuerst wieder absetzen.', src: ['B1', 'D1'],
        explain: 'Ablauf in Bruenger et al. 2012 und Dwyer et al. 2010 unterschiedlich (zurück bzw. über die Box hinweg); die gezeigte Variante ist Konvention.' },
      { short: 'Ab', anchor: 'knee', side: 'r', status: 'single', text: 'Kontrolliert absenken, das vordere Bein bremst.', src: ['B1'],
        explain: 'Exzentrische Phase 1 s mit Metronom (Bruenger et al. 2012). Langsamer ist möglich; dazu gibt es keine Daten.' }
    ],
    sources: {
      B1: { label: 'Bruenger et al. 2012, ISBS-Tagungsband', url: 'https://ojs.ub.uni-konstanz.de/cpa/article/view/5380', read: 'fulltext', note: 'Tagungsbeitrag, keine begutachtete Zeitschrift' },
      D1: { label: 'Dwyer et al. 2010, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-45.2.181', read: 'fulltext', note: 'Step-up-and-over auf 20-cm-Box' }
    }
  },

  // ---------- Goblet Squat (v2.9) ----------
  {
    ref: 'goblet-squat', checkedAt: '2026-10-19', view: 'side', basis: 'transfer',
    basisNote: 'Keine Gelenkwinkel für den Goblet Squat gefunden (Collins et al. 2021 messen nur Muskelaktivität und Bodenkräfte). Knie- und Hüftwinkel sind von der Frontkniebeuge mit leichter Last übertragen (Sorrentino et al. 2024, Langhantel mit 25 % Körpergewicht; Volltext) – die Last liegt bei beiden vor dem Körper. Sprunggelenk wie bei der Kniebeuge; Haltung der Kurzhantel ist Konvention.',
    tempo: { basis: 'convention', note: 'Je ≈ 1,5 s ab und auf (Konvention); Collins et al. 2021 werteten Absenk- und Hebephase getrennt aus, ohne Zeiten im Abstract.' },
    frames: [
      { label: 'Oben', pose: { shank: C(0), knee: V(6, 'S1', 'fulltext', 'übertragen: Frontkniebeuge 6,0 ± 5,8°'), hip: V(9, 'S1', 'fulltext', 'übertragen: Frontkniebeuge 9,0 ± 7,8°'), ankle: C(0), armTargetTrunk: GOBLET.hand, armScale: [1, 0.6], elbowSide: 1, props: gobletProps } },
      { label: 'Unten', pose: { shank: C(33, 'wie bei der Kniebeuge; nicht gemessen'), knee: V(118.3, 'S1', 'fulltext', 'übertragen: Frontkniebeuge 118,3 ± 7,0° (25 % Körpergewicht)'), hip: V(111.4, 'S1', 'fulltext', 'übertragen: Frontkniebeuge 111,4 ± 11,3°, Becken–Oberschenkel'), ankle: C(33), armTargetTrunk: GOBLET.hand, armScale: [1, 0.6], elbowSide: 1, props: gobletProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [2] }, { a: 0, b: 1, dur: 1.5, label: 'Absenken', kp: [0] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 1, b: 0, dur: 1.5, label: 'Aufstehen', kp: [1] }],
    keyPoints: [
      { short: 'Tiefe', anchor: 'hip', side: 'l', status: 'single', text: 'Tief zwischen die Knie sitzen, so weit Becken und Rücken stabil bleiben.', src: ['S1'],
        explain: 'Die gezeigte Tiefe stammt von der Frontkniebeuge mit leichter Last (Knie 118°, Sorrentino et al. 2024). Für den Goblet Squat selbst gibt es keine Winkeldaten.' },
      { short: 'Muskeln', anchor: 'thigh', side: 'r', status: 'single', text: 'Viel Arbeit für den Quadrizeps, Last durch die Griffkraft begrenzt.', src: ['G1'],
        explain: 'Collins et al. 2021 (16 Männer, 16 Frauen, 30 % Körpermasse): mehr Quadrizepsaktivität und Vertikalkraft als beim Landmine Squat. Frauen hatten in beiden Varianten mehr Quadrizepsaktivität.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper bleibt recht aufrecht, weil die Last vorn liegt.', src: ['S1'],
        explain: 'Übertragen von der Frontkniebeuge, deren Rumpf aufrechter ist als bei der Kniebeuge mit der Stange hinten; die Befunde dazu sind uneinheitlich (siehe Frontkniebeuge). Für den Goblet Squat nicht gemessen.' }
    ],
    sources: {
      S1: { label: 'Sorrentino et al. 2024, Physiol Rep', url: 'https://doi.org/10.14814/phy2.16034', read: 'fulltext', note: 'Frontkniebeuge, übertragen' },
      G1: { label: 'Collins et al. 2021, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000004094', read: 'abstract' }
    }
  },

  // ---------- Ausfallschritte rückwärts (v2.9) ----------
  {
    ref: 'dumbbell-reverse-lunge', checkedAt: '2026-10-19', view: 'side', basis: 'transfer',
    basisNote: 'Winkel des vorderen Beins unten vom Ausfallschritt vorwärts übertragen (Riemann et al. 2012, Tabelle 1 am PDF geprüft). Comfort et al. 2015 (9 Männer, 3D, Volltext) fanden zwischen vorwärts und rückwärts keine Unterschiede in Hüft- und Kniewinkel; ihr Kniewert ist im Text (114,9°) und in der Tabelle (63,7–66,6°) widersprüchlich und wird deshalb nicht übernommen. Seit v2.20.0 setzt der hintere Fußballen auf, bevor die Figur absenkt, und das hintere Knie liegt unten knapp über dem Boden unter der Hüfte (Konvention); daraus folgt die Schrittlänge (≈ 0,69 m, berechnet). Hüftbahn und hinteres Bein sind Konvention.',
    tempo: { basis: 'protocol', note: '3 s ab / 2 s auf mit Metronom (Comfort et al. 2015); hier kürzer mit Schrittphase (Konvention).' },
    frames: [
      { label: 'Stand', pose: { shank: C(0), knee: C(0), hip: C(0), ankle: C(0), leg2: { ankle: [-4, -15], foot: C(90) }, armPlumb: true, elbow: C(0), props: revLungeProps } },
      { label: 'Schritt', pose: { shank: C(RVL.swing.leg.shank, 'aus der Hüftbahn gelöst'), knee: C(RVL.swing.leg.knee), trunk: C(2), ankle: C(RVL.swing.leg.shank, 'Fuß flach'), leg2: { ankle: RVL.swing.ankle, foot: C(RVL.swing.foot) }, armPlumb: true, elbow: C(0), props: revLungeProps } },
      { label: 'Aufsetzen', pose: { shank: C(RVL.touch.leg.shank, 'aus der Hüftbahn gelöst'), knee: C(RVL.touch.leg.knee), trunk: C(4), ankle: C(RVL.touch.leg.shank, 'Fuß flach'), leg2: RVL.back(125), armPlumb: true, elbow: C(0), props: revLungeProps } },
      { label: 'Unten', pose: { shank: V(11.4, 'L1', 'computed', 'übertragen: gleich der Dorsalflexion'), knee: V(96.4, 'L1', 'fulltext', 'übertragen: 96,4 ± 10,7° (vorwärts)'), hip: V(84.3, 'L1', 'fulltext', 'übertragen: 84,3 ± 14,9° (vorwärts)'), ankle: V(11.4, 'L1', 'fulltext', 'übertragen: 11,4 ± 8,1°'), leg2: RVL.back(LUNGE.phiB), armPlumb: true, elbow: C(0), props: revLungeProps },
        facts: [V(99.3, 'C2', 'fulltext', 'Comfort et al. 2015 rückwärts: Hüftbeugung 99,3 ± 6,7° (vorwärts 93,2°, kein signifikanter Unterschied)'), V(22.2, 'C2', 'fulltext', 'Comfort et al. 2015 rückwärts: Dorsalflexion 22,2 ± 4,8°')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Stand', kp: [0] }, { a: 0, b: 1, dur: 0.45, label: 'Schritt zurück', kp: [0] }, { a: 1, b: 2, dur: 0.4, label: 'Aufsetzen', kp: [0] }, { a: 2, b: 3, dur: 1.0, label: 'Absenken', kp: [1, 2] }, { a: 3, b: 3, dur: 0.3, label: 'Unten', kp: [2] }, { a: 3, b: 2, dur: 0.8, label: 'Hochdrücken', kp: [3] }, { a: 2, b: 1, dur: 0.4, label: 'Hochdrücken', kp: [3] }, { a: 1, b: 0, dur: 0.45, label: 'Stand', kp: [4] }],
    keyPoints: [
      { short: 'Schritt', anchor: 'foot2', side: 'l', status: 'single', text: 'Mit einem Bein weit nach hinten treten, der vordere Fuß bleibt stehen.', src: ['C2'],
        explain: 'Protokoll in Comfort et al. 2015: Stand auf einer Kraftmessplatte, Schritt zurück auf die zweite, der vordere Fuß bleibt die ganze Zeit am Boden.' },
      { short: 'Vorne', anchor: 'knee', side: 'r', status: 'single', text: 'Das vordere Bein trägt die Last; Knie etwa 90° beugen.', src: ['L1', 'C2'],
        explain: 'Winkel übertragen vom Ausfallschritt vorwärts (Riemann et al. 2012). Comfort et al. 2015 fanden keinen Unterschied in Hüft- und Kniewinkel zwischen vorwärts und rückwärts.' },
      { short: 'Hüfte', anchor: 'hip', side: 'l', status: 'single', text: 'Rückwärts arbeitet die Hüfte etwas weniger als vorwärts.', src: ['C2'],
        explain: 'Das Hüftmoment war beim Ausfallschritt vorwärts größer als rückwärts (Comfort et al. 2015, 9 Männer, Körpergewicht). Für das Knie waren beide Varianten ähnlich.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper bleibt aufrecht; rückwärts neigt er sich oft etwas mehr vor.', src: ['G2'],
        explain: 'Goulette et al. 2021 (20 Frauen, 3D, Tiefe 75 % der Beinlänge, Abstract): rückwärts mehr Rumpfvorneigung und weniger Kniebeugung als vorwärts; Gradzahlen nicht geprüft. Die gezeigte Haltung ist übertragen.' },
      { short: 'Zurück', anchor: 'hand', side: 'l', status: 'single', text: 'Über das vordere Bein hochdrücken und den hinteren Fuß zurückstellen.', src: ['C2'],
        explain: 'Ablauf im Protokoll von Comfort et al. 2015; Hanteln hängen locker an den Seiten (Konvention, vgl. Riemann et al. 2012).' }
    ],
    sources: {
      L1: { label: 'Riemann et al. 2012, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-47.4.16', read: 'fulltext', note: 'Ausfallschritt vorwärts, übertragen' },
      C2: { label: 'Comfort et al. 2015, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-50.9.05', read: 'fulltext', note: 'Kniewinkel in Text und Tabelle widersprüchlich' },
      G2: { label: 'Goulette et al. 2021, Phys Ther Sport', url: 'https://doi.org/10.1016/j.ptsp.2020.12.001', read: 'abstract' }
    }
  }
,
  // ---------- Good Morning (v2.9) ----------
  {
    ref: 'good-morning', checkedAt: '2026-10-19', view: 'side', basis: 'measured',
    basisNote: 'Knie, Hüfte und Lendenbeugung unten aus Vigotsky et al. 2015 (2D-Video, 15 trainierte Männer, 50–90 % 1RM, Stange hochstabig; Tabelle 2 im Volltext geprüft), hier die Werte bei 70 % 1RM. Der Hüftwinkel der Studie ist ein Becken–Oberschenkel-Winkel; der gezeichnete Rumpfwinkel ist daraus plus Lendenbeugung berechnet. Die Schienbeinneigung ist so gelöst, dass der gemeinsame Schwerpunkt von Körper und Stange über dem Mittelfuß liegt (Segmentmassen nach Dempster, Stange halbes Körpergewicht; Konvention).',
    tempo: { basis: 'convention', note: 'Je ≈ 1,5 s ab und auf (Konvention). Vigotsky et al. 2015 gaben Tiefe und Tempo bewusst nicht vor.' },
    frames: [
      { label: 'Oben', pose: { shank: K(GM.shank[0], 'S1', 'so gelöst, dass der Schwerpunkt von Körper und Stange über dem Mittelfuß liegt (Konvention)'), knee: C(4), hip: C(4), ankle: C(0), armTargetTrunk: [-8, 15], armScale: [0.55, 0.95], elbowSide: -1, props: squatProps([-8, 15]) } },
      { label: 'Unten', pose: { shank: K(GM.shank[1], 'S1', 'so gelöst, dass der Schwerpunkt von Körper und Stange über dem Mittelfuß liegt (Konvention)'), knee: V(20.1, 'S1', 'fulltext', '20,1° (70 % 1RM; 17,1° bei 50 %, 24,8° bei 90 %)'), hip: K(100.7, 'S1', 'Hüfte 75,7° (Becken–Oberschenkel) plus Lendenbeugung 25,0°, beide bei 70 % 1RM'), ankle: C(0), armTargetTrunk: [-8, 15], armScale: [0.55, 0.95], elbowSide: -1, props: squatProps([-8, 15]) },
        facts: [V(75.7, 'S1', 'fulltext', 'Hüftbeugung 75,7° (Becken–Oberschenkel), ohne Lasteffekt (74,7–75,8°)'), V(25.0, 'S1', 'fulltext', 'Lendenbeugung 25,0° (25,0–27,5° je nach Last)'), V(5.3, 'S2', 'fulltext', 'Knie 5,3 ± 6,7°, wenn gestreckte Knie verlangt waren (Schellenberg et al. 2013, +25 % Körpergewicht)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 1.5, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [2, 3] }, { a: 1, b: 0, dur: 1.5, label: 'Aufrichten', kp: [4] }],
    keyPoints: [
      { short: 'Stange', anchor: 'bar', side: 'l', status: 'single', text: 'Stange auf dem oberen Rücken ablegen, etwas höher als bei der Kniebeuge.', src: ['S1'],
        explain: 'Protokoll in Vigotsky et al. 2015: Stange auf dem oberen Trapezmuskel knapp über der Schulterhöhe (hochstabig); Stand wie im eigenen Training.' },
      { short: 'Hüfte', anchor: 'glute', side: 'l', status: 'consensus', text: 'Aus der Hüfte nach vorn beugen, bis der Oberkörper etwa waagerecht ist.', src: ['S1', 'S2'],
        explain: 'Hüftbeugung ≈ 75° (Becken–Oberschenkel) in Vigotsky et al. 2015 und 75,3° in Schellenberg et al. 2013; die Last änderte den Hüftwinkel nicht.' },
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'contested', text: 'Knie leicht gebeugt; mit mehr Gewicht beugen sie sich von selbst mehr.', src: ['S1', 'S2'],
        explain: 'Umstritten, wie stark. Mit gestreckten Knien als Vorgabe 5,3° (Schellenberg et al. 2013); frei gewählt 17° bei 50 % bis 25° bei 90 % 1RM (Vigotsky et al. 2015). Mehr Kniebeugung verkürzt die Beinbeuger.' },
      { short: 'Rücken', anchor: 'lowBack', side: 'l', status: 'single', text: 'Rücken möglichst neutral halten; ein wenig Rundung tritt trotzdem auf.', src: ['S1', 'S2'],
        explain: 'Auch geübte Personen beugten die Lendenwirbelsäule um 25–27° (Vigotsky et al. 2015) bzw. 24° (Schellenberg et al. 2013). Ob das schadet, wurde nicht untersucht.' },
      { short: 'Auf', anchor: 'hip', side: 'l', status: 'single', text: 'Über die Hüfte wieder aufrichten, das Gewicht bleibt über dem Mittelfuß.', src: ['S1'],
        explain: 'Die Beinbeuger und Rückenstrecker arbeiteten mit steigender Last stärker (Vigotsky et al. 2015). Gezeichnet bleibt der gemeinsame Schwerpunkt von Körper und Stange über dem Mittelfuß; das ist Konvention, nicht gemessen.' }
    ],
    sources: {
      S1: { label: 'Vigotsky et al. 2015, PeerJ', url: 'https://doi.org/10.7717/peerj.708', read: 'fulltext', note: 'Tabelle 2 im PMC-Volltext' },
      S2: { label: 'Schellenberg et al. 2013, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/2052-1847-5-27', read: 'abstract' }
    }
  },

  // ---------- Einbeiniges Rumänisches Kreuzheben (v2.9) ----------
  {
    ref: 'single-leg-romanian-deadlift', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Keine gelesene Studie berichtet Gelenkwinkel der Endstellung als Zahl. Die Endstellung folgt dem Protokoll von Kim et al. 2026 (30 Männer, Volltext): Oberkörper so nah wie möglich an die Waagerechte, freies Bein waagerecht in Linie mit dem Rumpf, Standknie natürlich leicht gebeugt. Kniewinkel (15°) und Schienbein sind Konvention.',
    tempo: { basis: 'measured', note: 'Selbst gewähltes Tempo: 4,72 ± 0,97 s je Wiederholung (Kim et al. 2026), hier auf Ab, Halten und Auf verteilt.' },
    frames: [
      { label: 'Oben', pose: { shank: C(2), knee: C(5), trunk: C(2), ankle: C(2), leg2: { hip: C(-8), knee: C(25), ankle: C(10) }, armPlumb: true, elbow: C(0), props: slRdlProps } },
      { label: 'Unten', pose: { shank: C(6), knee: C(15, 'natürliche leichte Beugung (Protokoll ohne Zahl)'), trunk: V(85, 'R1', 'protocol', 'Oberkörper so nah wie möglich an der Waagerechten'), ankle: C(6), leg2: { hip: V(0, 'R1', 'protocol', 'freies Bein waagerecht in Linie mit dem Rumpf'), knee: C(5), ankle: C(0) }, armPlumb: true, elbow: C(0), props: slRdlProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.6, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 1.9, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [2, 3] }, { a: 1, b: 0, dur: 1.9, label: 'Aufrichten', kp: [4] }],
    keyPoints: [
      { short: 'Hantel', anchor: 'hand', side: 'r', status: 'single', text: 'Hantel in der Hand gegenüber dem Standbein, nah am Standbein führen.', src: ['M1', 'R1'],
        explain: 'Mo et al. 2023 (12 Männer, Abstract): an der Schwungscheibe aktivierte die Last auf der Gegenseite Gesäß und Rückenstrecker stärker als auf derselben Seite; Kurzhantel und Schwungscheibe unterschieden sich nicht. Kim et al. 2026 hielten zwei 5-kg-Hanteln möglichst nah am Standbein.' },
      { short: 'Linie', anchor: 'foot2', side: 'l', status: 'single', text: 'Oberkörper und freies Bein als Linie kippen, bis beide fast waagerecht sind.', src: ['R1'],
        explain: 'Protokoll in Kim et al. 2026: freies Bein waagerecht und in Linie mit dem Rumpf, Oberkörper so nah wie möglich an der Waagerechten, Rücken gerade.' },
      { short: 'Becken', anchor: 'glute', side: 'l', status: 'single', text: 'Becken gerade halten, nicht zur Seite des freien Beins aufdrehen.', src: ['R1'],
        explain: 'Wiederholungen mit Ausweichdrehung des Rumpfs wurden in Kim et al. 2026 verworfen. Gemessen wurde die Drehung nicht.' },
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'single', text: 'Standknie leicht gebeugt lassen, die Bewegung kommt aus der Hüfte.', src: ['R1'],
        explain: 'Die Hüfte hatte den größten Bewegungsumfang, das Knie blieb wenig gebeugt (Kim et al. 2026, Trägheitssensoren; Werte nur als Kurve).' },
      { short: 'Stand', anchor: 'ankle', side: 'r', status: 'single', text: 'Ruhig auf dem ganzen Fuß stehen; auf weichem Untergrund wird der Weg kürzer.', src: ['R1'],
        explain: 'Auf einem Schaumstoffkissen wurden Hüft- und Kniebewegung um 6,0° bzw. 3,8° kleiner, das Sprunggelenk schwankte deutlich mehr (Kim et al. 2026).' }
    ],
    sources: {
      R1: { label: 'Kim et al. 2026, Sci Rep', url: 'https://doi.org/10.1038/s41598-026-56871-1', read: 'fulltext' },
      M1: { label: 'Mo et al. 2023, Front Physiol', url: 'https://doi.org/10.3389/fphys.2023.1264604', read: 'abstract' }
    }
  },

  // ---------- Glute Bridge (v2.9) ----------
  {
    ref: 'glute-bridge', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Keine gelesene Studie hat die Glute Bridge mit Bewegungsmessung erfasst. Start und Ende folgen dem Protokoll von Khaiyat & Norris 2018 (12 Frauen, Volltext): Rückenlage, Knie 90°, Füße flach; Becken heben bis Schulter, Hüfte und Knie eine Linie bilden. Hüft- und Schienbeinwinkel sind so gelöst, dass Schultern und Füße liegen bleiben; die Langhantel über dem Becken ist Konvention.',
    tempo: { basis: 'protocol', note: 'Metronom 60 Schläge je Minute (Khaiyat & Norris 2018); hier ≈ 1 s hoch, 1 s halten, 1,5 s ab.' },
    frames: [
      { label: 'Unten', pose: { shank: K(BRIDGE.bottom.shank, 'B1', 'so gelöst, dass Becken und Schultern am Boden liegen'), knee: V(90, 'B1', 'protocol', 'Knie 90°, Füße flach'), hip: K(BRIDGE.bottom.hip, 'B1', 'aus der Geometrie gelöst'), foot: C(90), headTilt: C(0), armTargetTrunk: [22, -98], armScale: [0.6, 0.9], elbowSide: 1, props: bridgeProps } },
      { label: 'Oben', pose: { shank: K(BRIDGE.top.shank, 'B1', 'so gelöst, dass die Schultern liegen bleiben'), knee: K(BRIDGE.top.knee, 'B1', 'aus der Geometrie gelöst (Füße bleiben stehen)'), hip: V(0, 'B1', 'protocol', 'Schulter, Hüfte und Knie in einer Linie'), foot: C(90), headTilt: C(BRIDGE.headTop, 'Kopf bleibt auf dem Boden liegen'), armTargetTrunk: [22, -98], armScale: [0.6, 0.9], elbowSide: 1, props: bridgeProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 1.0, label: 'Heben', kp: [2] }, { a: 1, b: 1, dur: 1.0, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 1.5, label: 'Absenken', kp: [3] }],
    keyPoints: [
      { short: 'Füße', anchor: 'foot', side: 'r', status: 'single', text: 'Füße flach aufstellen, Knie etwa 90° gebeugt.', src: ['B1', 'B2'],
        explain: 'Protokoll: Knie 90° (Khaiyat & Norris 2018). Bei einer Brücke mit unterschiedlichem Kniewinkel arbeitete der Halbsehnenmuskel bei 60–90° mehr als bei 120° (Kim & Park 2016, 22 Männer, Abstract). Wie nah die Füße am Gesäß stehen sollen, ist damit nicht geklärt.' },
      { short: 'Rücken', anchor: 'back', side: 'l', status: 'single', text: 'Rücken und Schultern liegen auf dem Boden.', src: ['B1'],
        explain: 'Startstellung im Protokoll von Khaiyat & Norris 2018 (Rückenlage).' },
      { short: 'Hoch', anchor: 'hip', side: 'l', status: 'single', text: 'Über die Fersen drücken, bis Schulter, Hüfte und Knie eine Linie bilden.', src: ['B1'],
        explain: 'Protokoll in Khaiyat & Norris 2018. Die Glute Bridge aktivierte dort den großen Gesäßmuskel am stärksten (44,5 ± 19,0 % MVIC) von fünf Übungen.' },
      { short: 'Ab', anchor: 'thigh', side: 'r', status: 'single', text: 'Kontrolliert absenken, bis das Becken den Boden berührt.', src: ['B1'],
        explain: 'Protokoll in Khaiyat & Norris 2018 (kontrolliertes Absenken im Metronomtakt).' }
    ],
    sources: {
      B1: { label: 'Khaiyat & Norris 2018, J Phys Ther Sci', url: 'https://doi.org/10.1589/jpts.30.642', read: 'fulltext' },
      B2: { label: 'Kim & Park 2016, J Phys Ther Sci', url: 'https://doi.org/10.1589/jpts.28.2537', read: 'abstract' }
    }
  }
,
  // ---------- Rückenstrecken 45° (v2.9) ----------
  {
    ref: 'back-extension-45', checkedAt: '2026-10-19', view: 'side', basis: 'measured',
    basisNote: 'Hüft- und Knie-Bewegungsumfang aus Schellenberg et al. 2017 (3D, 16 Personen, 45°-Bank, Bewegung aus der Hüfte mit stabilem Rücken, beidbeinig; Tabelle 2 am PDF geprüft). Dabei beugte sich auch die Wirbelsäule (zusammen ≈ 40°), das zeichnet die Figur nicht. Andersen et al. 2021 gingen deutlich tiefer (≈ 90° Hüftwinkel). Polsterkante am Becken nach Petrič et al. 2022 und Schellenberg et al. 2017; Fußplatte, Fersenrolle und Armhaltung sind Konvention.',
    tempo: { basis: 'convention', note: 'Je ≈ 1,5 s ab und auf (Konvention); Andersen et al. 2021 ließen selbst gewählt, aber kontrolliert arbeiten.' },
    frames: [
      { label: 'Oben', pose: { root: 'ankle', rootPos: [0, -15 - BACKEXT.plat], shank: V(45, 'S2', 'fulltext', '45°-Bank; Oberkörper in Linie mit den Beinen'), knee: C(0, 'Knie gestreckt (Anweisung)'), hip: V(0, 'S2', 'protocol', 'Oberkörper in Linie mit den Beinen'), ankle: C(0), armTargetTrunk: [18, -44], armScale: [0.7, 0.9], elbowSide: 1, props: backExtProps } },
      { label: 'Unten', pose: { root: 'ankle', rootPos: [0, -15 - BACKEXT.plat], shank: V(45, 'S2', 'fulltext', '45°-Bank'), knee: V(7.4, 'S2', 'fulltext', 'Bewegungsumfang Knie 7,4 ± 3,6°'), hip: V(36.3, 'S2', 'fulltext', 'Bewegungsumfang Hüfte 36,3 ± 7,9° (aus der Hüfte, beidbeinig)'), ankle: C(0), armTargetTrunk: [18, -44], armScale: [0.7, 0.9], elbowSide: 1, props: backExtProps },
        facts: [V(40, 'S2', 'computed', 'Wirbelsäule zusätzlich gebeugt: Becken–Lende 17,4°, Lende–Mitte 12,5°, Mitte–oben 10,0° (Summe ≈ 40°, nicht gezeichnet)'), V(90, 'A1', 'protocol', 'Andersen et al. 2021: Hüftwinkel unten etwa 90°, per Goniometer kontrolliert')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 1.5, label: 'Absenken', kp: [2, 3] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [2] }, { a: 1, b: 0, dur: 1.5, label: 'Aufrichten', kp: [4] }],
    keyPoints: [
      { short: 'Polster', anchor: 'pad', side: 'r', status: 'consensus', text: 'Polsterkante auf Höhe der vorderen Beckenknochen einstellen.', src: ['P1', 'S2'],
        explain: 'Petrič et al. 2022: Polsterkante auf der Linie der vorderen oberen Darmbeinstachel (Volltext). Schellenberg et al. 2017: Hüftgelenk knapp über der Kante.' },
      { short: 'Linie', anchor: 'back', side: 'l', status: 'consensus', text: 'Oben bilden Oberkörper und Beine eine Linie, Knie gestreckt.', src: ['S2', 'A1'],
        explain: 'Start- und Endstellung in Schellenberg et al. 2017 („Oberkörper in Linie mit den Beinen“, Fersen auf der Platte, Knie gestreckt) und Andersen et al. 2021 (aufrecht).' },
      { short: 'Tiefe', anchor: 'glute', side: 'l', status: 'contested', text: 'Absenken, solange der Rücken gerade bleibt.', src: ['S2', 'A1'],
        explain: 'Umstritten, wie tief. Wer anhält, bevor sich der Rücken beugt, kam auf 36° Hüftbewegung (Schellenberg et al. 2017); Andersen et al. 2021 ließen bis etwa 90° Hüftwinkel absenken.' },
      { short: 'Hüfte', anchor: 'hip', side: 'l', status: 'single', text: 'Aus der Hüfte beugen; wer den Rücken einrollt, bewegt vor allem die Wirbelsäule.', src: ['S2'],
        explain: 'Aus der Hüfte: Hüfte 36°, mittlerer bis oberer Rücken gestreckt. Mit eingerolltem Rücken: Lende–Mitte 36°, Hüfte nur 16°. Die Variante aus der Hüfte ergab größere Hüft- und Rückenmomente (Schellenberg et al. 2017).' },
      { short: 'Auf', anchor: 'thigh', side: 'r', status: 'single', text: 'Kontrolliert zurück in die Linie; oben arbeiten Gesäß und Beinbeuger stark.', src: ['A1'],
        explain: 'Im oberen Teil der Bewegung aktivierte die 45°-Bank Gesäß und Beinbeuger stärker als rumänisches Kreuzheben und Rückenstrecker-Gerät (Andersen et al. 2021, 15 trainierte Frauen, 6RM).' }
    ],
    sources: {
      S2: { label: 'Schellenberg et al. 2017, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/s13102-017-0074-0', read: 'fulltext', note: 'Tabelle 2 am PDF geprüft' },
      A1: { label: 'Andersen et al. 2021, J Sports Sci Med', url: 'https://doi.org/10.52082/jssm.2021.181', read: 'fulltext' },
      P1: { label: 'Petrič et al. 2022, PeerJ', url: 'https://doi.org/10.7717/peerj.14469', read: 'fulltext' }
    }
  },

  // ---------- Kickback am Kabel (v2.9) ----------
  {
    ref: 'cable-kickback', checkedAt: '2026-10-19', view: 'side', basis: 'convention',
    basisNote: 'Keine gelesene Studie beschreibt Aufbau oder Winkel (Stevens et al. 2022 im Volltext: nur Tempo und Last; Attarieh et al. 2026 im Abstract). Gezeigt ist ein üblicher Aufbau: Manschette am Knöchel, Seil von der unteren Rolle, leicht vorgeneigt mit den Händen am Turm, das arbeitende Bein (vorn gezeichnet) streckt die Hüfte nach hinten. Alles Zeichenkonvention.',
    tempo: { basis: 'protocol', note: 'Metronom: 1 s zurück, 2 s vor, 2 s Pause zwischen den Wiederholungen (Stevens et al. 2022); hier 1 s Pause.' },
    frames: [
      { label: 'Vorn', pose: { ...KICK.pose, hip: C(15), knee: C(15), ankle: C(10), props: kickbackProps } },
      { label: 'Hinten', pose: { ...KICK.pose, hip: C(-25), knee: C(10), ankle: C(10), props: kickbackProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 1.0, label: 'Vorn', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Zurück', kp: [1] }, { a: 1, b: 1, dur: 0.2, label: 'Hinten', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Vor', kp: [2] }],
    keyPoints: [
      { short: 'Kabel', anchor: 'cuff', side: 'r', status: 'single', text: 'Manschette am Knöchel, Kabel von der unteren Rolle.', src: ['K2'],
        explain: 'Attarieh et al. 2026 trainierten eine einbeinige Hüftstreckung am Kabel (Abstract); den Aufbau beschreibt das Abstract nicht. Manschette und Rollenhöhe sind gezeichnete Konvention.' },
      { short: 'Zurück', anchor: 'foot', side: 'l', status: 'single', text: 'Das Bein aus der Hüfte nach hinten führen, ohne ins Hohlkreuz auszuweichen.', src: ['K1', 'K2'],
        explain: 'Beim Kickback war der lange Bizepskopf proximal und distal stärker aktiv als beim rumänischen Kreuzheben und Step-up (Stevens et al. 2022, 15 trainierte Frauen, 75 % 1RM). 10 Wochen Hüftstreckung am Kabel vergrößerten den großen Gesäßmuskel um 9 %, vor allem unten (Attarieh et al. 2026, MRT, Abstract).' },
      { short: 'Vor', anchor: 'thigh', side: 'l', status: 'single', text: 'Langsam in 2 s nach vorn zurückführen, das Kabel bleibt gespannt.', src: ['K1'],
        explain: 'Protokoll in Stevens et al. 2022: 2 s exzentrisch (vor), 1 s konzentrisch (zurück), Metronom 60 Schläge je Minute.' }
    ],
    sources: {
      K1: { label: 'Stevens et al. 2022, Int J Exerc Sci', url: 'https://doi.org/10.70252/DWMB8342', read: 'fulltext' },
      K2: { label: 'Attarieh et al. 2026, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000005701', read: 'abstract' }
    }
  }
,
  // ---------- Kurzhantel-Bankdrücken (v2.9) ----------
  {
    ref: 'dumbbell-bench-press', checkedAt: '2026-10-19', view: 'side', basis: 'transfer', layout: 'rows',
    basisNote: 'Keine Kinematik für Kurzhanteln auf der Flachbank gefunden. Arm- und Körperhaltung sind vom Langhantel-Bankdrücken übertragen (Ellbogen unten 101,4°, Mausehund et al. 2022, am PDF geprüft). Tiefe bis Brusthöhe nach Protokoll (Saeterbakken et al. 2020: ein Band zwischen den Hanteln berührt die Brust). Hanteln im Obergriff, von der Seite als Scheibe gesehen.',
    tempo: { basis: 'protocol', note: '2 s ab, Drücken ≈ 1 s (übertragen vom Langhantel-Bankdrücken).' },
    frames: [
      { label: 'Oben', pose: { ...BENCH_POSE(), armPoints: { elbow: [4, -52], wrist: [8, -104] }, props: benchDbProps } },
      { label: 'Brust', pose: { ...BENCH_POSE(), armPoints: { elbow: [12, 14], wrist: [34, -36] }, props: benchDbProps },
        facts: [V(101.4, 'S1', 'fulltext', 'Übertragen: Ellbogen unten 101,4 ± 8,3° (Langhantel, mittlerer Griff)'), V(1, 'D3', 'protocol', 'Unten: Band zwischen den Hanteln berührt die Brust')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [1] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [0] }, { a: 1, b: 1, dur: 0.15, label: 'Brust', kp: [0] }, { a: 1, b: 0, dur: 1.0, label: 'Drücken', kp: [2] }],
    keyPoints: [
      { short: 'Tiefe', anchor: 'chest', side: 'r', status: 'single', text: 'Kontrolliert bis etwa auf Brusthöhe absenken.', src: ['D3'],
        explain: 'Protokoll in Saeterbakken et al. 2020: ein Gummiband zwischen den Hanteln musste die Brust berühren. Ob tiefer mehr bringt, wurde nicht untersucht.' },
      { short: 'Gewicht', anchor: 'shoulder', side: 'l', status: 'consensus', text: 'Meist 15–20 % weniger Gesamtgewicht als mit der Langhantel möglich.', src: ['D1', 'D2'],
        explain: '1RM mit Kurzhanteln 17 % unter der Langhantel (Saeterbakken et al. 2011, 12 Männer) bzw. 89,5 statt 106,4 kg (van den Tillaar & Saeterbakken 2012, 11 Männer). Brust und vorderer Deltamuskel waren gleich aktiv, der Bizeps mehr.' },
      { short: 'Drücken', anchor: 'elbow', side: 'l', status: 'single', text: 'Gleichmäßig nach oben drücken, beide Hanteln auf gleicher Höhe.', src: ['D1'],
        explain: 'Mit Kurzhanteln war der Trizeps weniger und der Bizeps mehr aktiv als mit der Langhantel, vermutlich wegen der größeren Stabilisierungsarbeit (Saeterbakken et al. 2011, Abstract). Die gleiche Höhe beider Hanteln ist Konvention.' }
    ],
    sources: {
      S1: { label: 'Mausehund et al. 2022, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003948', read: 'fulltext', note: 'Langhantel, übertragen' },
      D1: { label: 'Saeterbakken et al. 2011, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2010.543916', read: 'abstract' },
      D2: { label: 'van den Tillaar & Saeterbakken 2012, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3182443430', read: 'abstract' },
      D3: { label: 'Saeterbakken et al. 2020, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0235555', read: 'fulltext' }
    }
  },

  // ---------- Enges Bankdrücken (v2.9) ----------
  {
    ref: 'close-grip-bench-press', checkedAt: '2026-10-19', view: 'side', basis: 'measured', layout: 'rows',
    basisNote: 'Stangenweg aus Larsen, Gomo & van den Tillaar 2021 (3D, 14 trainierte Männer, 1RM, Griff = Schulterbreite 0,40 m; Tabelle 1 im Volltext geprüft): senkrecht 0,40 m, waagerecht 0,13 m. Die Gelenkwinkel stehen dort nur als Grafik; die Arme sind aus dem Stangenweg gelöst und verkürzt dargestellt, Ellbogen näher am Körper als beim mittleren Griff.',
    tempo: { basis: 'convention', note: '2 s ab, ≈ 1 s auf (wie beim Bankdrücken; Konvention).' },
    frames: [
      { label: 'Oben', pose: { ...BENCH_POSE(), armPoints: { elbow: [4, -52], wrist: [8, -104] }, props: benchProps } },
      { label: 'Brust', pose: { ...BENCH_POSE(), armPoints: { elbow: [20, 20], wrist: [34, -22] }, props: benchProps },
        facts: [V(0.399, 'L1', 'fulltext', 'senkrechter Stangenweg 0,399 ± 0,064 m (eng) gegenüber 0,338 m (weit, 1,7-fache Schulterbreite)'), V(0.128, 'L1', 'fulltext', 'Stange unten 0,128 ± 0,043 m waagerecht vom Startpunkt entfernt')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [1] }, { a: 1, b: 1, dur: 0.15, label: 'Brust', kp: [1, 2] }, { a: 1, b: 0, dur: 1.0, label: 'Drücken', kp: [3] }],
    keyPoints: [
      { short: 'Griff', anchor: 'hand', side: 'r', status: 'single', text: 'Griff etwa schulterbreit, nicht extrem eng.', src: ['L1', 'S24'],
        explain: 'Enger Griff in den Studien: Schulterbreite (0,40 m in Larsen et al. 2021; 42 cm in Saeterbakken et al. 2017). Engere Griffe wurden nicht untersucht.' },
      { short: 'Ellbogen', anchor: 'elbow', side: 'l', status: 'single', text: 'Ellbogen bleiben näher am Körper als beim breiten Griff.', src: ['L1', 'S24'],
        explain: 'Der Oberarm war beim engen Griff zu allen Zeitpunkten weniger abgespreizt (Larsen et al. 2021, 3D); die Ellbogen wanderten zum Rumpf (Saeterbakken et al. 2017).' },
      { short: 'Weg', anchor: 'chest', side: 'r', status: 'consensus', text: 'Die Stange legt einen längeren Weg zurück als beim breiten Griff.', src: ['L1', 'S24'],
        explain: 'Senkrecht 0,40 statt 0,34 m (Larsen et al. 2021, 1RM) und mehr Weg als breit (Saeterbakken et al. 2017, 6RM).' },
      { short: 'Last', anchor: 'shoulder', side: 'l', status: 'consensus', text: 'Etwas weniger Gewicht als mit breitem Griff; der Trizeps arbeitet mehr.', src: ['L1', 'S24'],
        explain: '1RM 103,7 statt 109,8 kg (Larsen et al. 2021), 6RM 11 % niedriger (Saeterbakken et al. 2017). Der mittlere Trizepskopf war beim engen und mittleren Griff stärker aktiv als beim breiten (Larsen et al. 2021).' }
    ],
    sources: {
      L1: { label: 'Larsen, Gomo & van den Tillaar 2021, Front Sports Act Living', url: 'https://doi.org/10.3389/fspor.2020.637066', read: 'fulltext', note: 'Tabelle 1 im PMC-Volltext' },
      S24: { label: 'Saeterbakken et al. 2017, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0047', read: 'fulltext' },
    }
  },

  // ---------- Schrägbankdrücken mit der Langhantel (v2.9) ----------
  {
    ref: 'incline-barbell-bench-press', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Keine gelesene Studie berichtet Gelenkwinkel als Zahl. Aufbau nach Rodríguez-Ridao et al. 2020 (Volltext am PDF geprüft): Griff 150 % der Schulterbreite, Stange bis 1 cm über das Brustbein auf Höhe der Brustwarzen, Schulter etwa 45° abgespreizt, 2 s ab / 2 s auf. Bank hier 30° (getestet wurden 15–60°). Arme und Körper wie beim Schrägbankdrücken mit Kurzhanteln gezeichnet.',
    tempo: { basis: 'protocol', note: '2 s ab / 2 s auf mit Metronom (Rodríguez-Ridao et al. 2020).' },
    frames: [
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -100], trunk: V(-60, 'R1', 'protocol', 'Bank 30° (Studie: 0, 15, 30, 45, 60°)'), hip: C(30), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: { elbow: [10, -54], wrist: [12, -106] }, props: inclineBarProps } },
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -100], trunk: V(-60, 'R1', 'protocol', 'Bank 30°'), hip: C(30), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: { elbow: [16, 30], wrist: [30, -14] }, props: inclineBarProps },
        facts: [V(45, 'R1', 'protocol', 'Schulter etwa 45° abgespreizt, Stange 1 cm über dem Brustbein'), V(150, 'R1', 'protocol', 'Griff 150 % der Schulterbreite (68,3 ± 3,9 cm)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Drücken', kp: [3] }],
    keyPoints: [
      { short: 'Bank', anchor: 'back', side: 'l', status: 'contested', text: 'Bank etwa 30–45° aufstellen.', src: ['R1', 'C1', 'L2'],
        explain: 'Umstritten. Getestet wurden 15–60° (Rodríguez-Ridao et al. 2020), 30° und 45° (Lauver et al. 2016), 45° (Coratella et al. 2019); der obere Brustanteil war bei 45° am stärksten erregt (Coratella et al. 2019), Lauver et al. fanden bei 30° und 45° nur zeitweise mehr Aktivität.' },
      { short: 'Griff', anchor: 'hand', side: 'r', status: 'single', text: 'Griff etwa 1,5-fach schulterbreit.', src: ['R1'],
        explain: 'Protokoll in Rodríguez-Ridao et al. 2020 (150 % der Schulterbreite, Obergriff).' },
      { short: 'Brust', anchor: 'chest', side: 'r', status: 'contested', text: 'Stange zur oberen bis mittleren Brust führen.', src: ['S24', 'R1'],
        explain: 'Umstritten. Auf der Schrägbank traf die Stange höher auf als auf der Flachbank, die Bahn war senkrechter (Saeterbakken et al. 2017, 25°); Rodríguez-Ridao et al. 2020 gaben für alle Winkel die Höhe der Brustwarzen vor.' },
      { short: 'Last', anchor: 'shoulder', side: 'l', status: 'single', text: 'Rechne mit gut 20 % weniger Gewicht als auf der Flachbank.', src: ['S24'],
        explain: '6RM 21,5 % niedriger als flach (Saeterbakken et al. 2017, 12 Kraftdreikämpfer, 25°).' }
    ],
    sources: {
      R1: { label: 'Rodríguez-Ridao et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17197339', read: 'fulltext' },
      S24: { label: 'Saeterbakken et al. 2017, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0047', read: 'fulltext' },
      C1: { label: 'Coratella et al. 2019, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2019.1655101', read: 'fulltext' },
      L2: { label: 'Lauver et al. 2016, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2015.1022605', read: 'abstract' }
    }
  },

  // ---------- Negativbankdrücken (v2.9) ----------
  {
    ref: 'decline-barbell-bench-press', checkedAt: '2026-10-19', view: 'side', basis: 'protocol', layout: 'rows',
    basisNote: 'Keine Gelenkwinkel als Zahl gefunden (Saeterbakken et al. 2017 nur als Grafik). Aufbau nach Coratella et al. 2019 (am PDF geprüft): Bank −15°, Griff so breit, dass der Ellbogen unten etwa 90° hat, Stange auf der Mitte des Brustbeins, 2 s ab / 2 s auf. Beine unter Polsterrollen eingehakt (Konvention); Armgeometrie wie beim Bankdrücken.',
    tempo: { basis: 'protocol', note: '2 s ab / 2 s auf mit Metronom (Coratella et al. 2019).' },
    frames: [
      { label: 'Oben', pose: { ...DECLINE_POSE(), armPoints: { elbow: [4, -52], wrist: [8, -104] }, props: declineProps } },
      { label: 'Brust', pose: { ...DECLINE_POSE(), armPoints: { elbow: [16, 18], wrist: [34, -32] }, props: declineProps },
        facts: [V(90, 'C1', 'protocol', 'Griffbreite so, dass der Ellbogen mit der Stange auf der Brust etwa 90° hat'), V(1, 'C1', 'protocol', 'Stange auf etwa der halben Länge des Brustbeins')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [1, 2] }, { a: 1, b: 1, dur: 0.15, label: 'Brust', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Drücken', kp: [3] }],
    keyPoints: [
      { short: 'Bank', anchor: 'back', side: 'l', status: 'single', text: 'Bank etwa 15° nach unten neigen, Beine unter den Rollen sichern.', src: ['C1', 'L2'],
        explain: '−15° in Coratella et al. 2019 und Lauver et al. 2016; Saeterbakken et al. 2017 nutzten −25°. Die Beinrollen sind gezeichnete Konvention.' },
      { short: 'Griff', anchor: 'hand', side: 'r', status: 'single', text: 'Griff so breit, dass der Ellbogen unten etwa 90° gebeugt ist.', src: ['C1'],
        explain: 'Protokoll in Coratella et al. 2019 (Stange auf der halben Länge des Brustbeins).' },
      { short: 'Brust', anchor: 'chest', side: 'r', status: 'single', text: 'Stange zur Mitte bis unteren Brust; der Weg ist kurz.', src: ['S24'],
        explain: 'Der senkrechte Stangenweg war auf der Negativbank kürzer als auf der Schrägbank und wie auf der Flachbank (Saeterbakken et al. 2017).' },
      { short: 'Muskeln', anchor: 'shoulder', side: 'l', status: 'contested', text: 'Der untere Brustanteil arbeitet etwa wie auf der Flachbank.', src: ['C1', 'L2'],
        explain: 'Umstritten. Der sternale Brustanteil war bei −15° gleich stark erregt wie flach (Coratella et al. 2019) bzw. ähnlich wie flach und stärker als bei 45° (Lauver et al. 2016). Mehr Aktivität als flach zeigte keine der beiden Studien.' }
    ],
    sources: {
      C1: { label: 'Coratella et al. 2019, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2019.1655101', read: 'fulltext' },
      L2: { label: 'Lauver et al. 2016, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2015.1022605', read: 'abstract' },
      S24: { label: 'Saeterbakken et al. 2017, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0047', read: 'fulltext' }
    }
  },

  // ---------- Brustpresse (v2.9) ----------
  {
    ref: 'chest-press-machine', checkedAt: '2026-10-19', view: 'side', basis: 'convention',
    basisNote: 'Keine gelesene Studie nennt Lehnenwinkel, Griffhöhe oder Gelenkwinkel als Zahl. Gezeigt ist ein üblicher Aufbau: aufrechte Lehne, Griffe auf Schulterhöhe, gerader Druck nach vorn. Griffbreite nach Muyor et al. 2023 (neutral ≈ 150 %, Obergriff ≈ 200 % der Schulterbreite, Abstract). Alles Zeichenkonvention.',
    tempo: { basis: 'protocol', note: '2 s / 2 s mit Metronom (Coratella et al. 2019).' },
    frames: [
      { label: 'Hinten', pose: { root: 'hip', rootPos: [0, -100], trunk: C(-10, 'Lehne leicht nach hinten'), hip: C(80), knee: C(85), foot: C(90), armPoints: { elbow: [-22, 30], wrist: [24, 12] }, props: chestPressProps } },
      { label: 'Vorn', pose: { root: 'hip', rootPos: [0, -100], trunk: C(-10), hip: C(80), knee: C(85), foot: C(90), armPoints: { elbow: [58, 10], wrist: [112, 6] }, props: chestPressProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Hinten', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Drücken', kp: [2] }, { a: 1, b: 1, dur: 0.2, label: 'Vorn', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [3] }],
    keyPoints: [
      { short: 'Griff', anchor: 'hand', side: 'r', status: 'single', text: 'Neutraler oder Obergriff; beide aktivieren die Brust ähnlich.', src: ['M1'],
        explain: 'Muyor et al. 2023 (20 Personen, 60 % 1RM): neutraler Griff ≈ 150 % und Obergriff ≈ 200 % der Schulterbreite; der obere Brustanteil war mit neutralem Griff etwas stärker aktiv als beim Bankdrücken, sonst alles ähnlich.' },
      { short: 'Sitz', anchor: 'back', side: 'l', status: 'single', text: 'Rücken an der Lehne, Füße am Boden.', src: ['C1'],
        explain: 'Coratella et al. 2019 nutzten ein Sitzgerät mit Gewichtsblock (Technogym). Rücken an der Lehne und Griffhöhe auf Schulterhöhe sind Konvention.' },
      { short: 'Drücken', anchor: 'elbow', side: 'l', status: 'single', text: 'Gleichmäßig nach vorn drücken, ohne die Ellbogen ganz durchzudrücken.', src: ['C1'],
        explain: 'An der Maschine war der Trizeps weniger erregt als beim freien Bankdrücken (Coratella et al. 2019, 10 Bodybuilder, 80 % 1RM). Das Nicht-Durchdrücken ist Konvention.' },
      { short: 'Zurück', anchor: 'chest', side: 'r', status: 'single', text: 'Langsam zurückführen, bis die Griffe etwa auf Brusthöhe sind.', src: ['C1'],
        explain: 'Tempo 2 s / 2 s (Coratella et al. 2019). Wie weit zurück, ist nicht untersucht.' }
    ],
    sources: {
      M1: { label: 'Muyor et al. 2023, J Hum Kinet', url: 'https://doi.org/10.5114/jhk/161468', read: 'abstract' },
      C1: { label: 'Coratella et al. 2019, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2019.1655101', read: 'fulltext' }
    }
  },
  // ---------- Kurzhantelrudern einarmig (v2.10) ----------
  {
    ref: 'one-arm-dumbbell-row', checkedAt: '2026-10-19', view: 'side', basis: 'transfer',
    basisNote: 'Keine gelesene Studie hat das einarmige Rudern mit Knie auf der Bank gemessen. Schulter- und Ellbogenwinkel der Endposition sind vom Rudern am Kabel übertragen (IMU-Messung, NPJ Microgravity 2026, Volltext), der Start mit gestrecktem Arm aus einem Protokoll für Langhantelrudern (Sports 2023, Volltext). Bank (≈ 45 cm), Rumpfneigung (≈ 20° über der Waagerechten), Stützarm, Knie und Neutralgriff sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: '1 s ziehen, 1 s absenken (Metronom 60/min beim einarmigen Kabelrudern, Fenwick et al. 2009; übertragen).' },
    frames: [
      { label: 'Unten', pose: { ...ONE_ROW.pose, shoulder: C(70, 'Arm hängt senkrecht (Rumpf 70°)'), elbow: V(0, 'R1', 'protocol', 'Start mit gestrecktem Ellbogen (Langhantelrudern, übertragen)'), props: oneRowProps } },
      { label: 'Oben', pose: { ...ONE_ROW.pose, shoulder: V(-5, 'S1', 'fulltext', 'übertragen vom Rudern am Kabel: −5,0 ± 9,7°'), elbow: V(105.4, 'S1', 'fulltext', 'übertragen vom Rudern am Kabel: 105,4 ± 13,1°'), props: oneRowProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Ziehen', kp: [1, 3] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [1, 2] }, { a: 1, b: 0, dur: 1.0, label: 'Absenken', kp: [4] }],
    keyPoints: [
      { short: 'Start', anchor: 'hand', side: 'r', status: 'single', text: 'Der Arm hängt zu Beginn gestreckt unter der Schulter.', src: ['R1'],
        explain: 'Start mit gestreckten Ellbogen ist Gültigkeitskriterium im Protokoll für Langhantelrudern (Sports 2023, n = 28) – hier auf die Kurzhantel übertragen. Für das einarmige Rudern selbst gibt es keine Vorgabe.' },
      { short: 'Zug', anchor: 'elbow', side: 'r', status: 'single', text: 'Hantel Richtung Hüfte ziehen, bis der Oberarm etwa neben dem Rumpf ist.', src: ['S1'],
        explain: 'Endwinkel vom Rudern am Kabel übertragen: Schulter −5,0 ± 9,7°, Ellbogen 105,4 ± 13,1° (IMU, 14 Personen). Für das einarmige Rudern auf der Bank gibt es keine Messung.' },
      { short: 'Rumpf', anchor: 'back', side: 'l', status: 'consensus', text: 'Rumpf nicht mitdrehen – einarmig fordert die seitlichen Rumpfmuskeln mehr.', src: ['R3', 'R4'],
        explain: 'Einarmiges Kabelrudern im Stand: Lendenwirbelsäule beim Ziehen 7,6° verdreht – 67,7 % des eigenen Drehumfangs, obwohl die Teilnehmer neutral bleiben sollten; beidarmig vorgebeugt 3,2° (Fenwick et al. 2009, n = 7). Einarmig aktivierte den äußeren schrägen Bauchmuskel stärker als beidarmig (Saeterbakken et al. 2015, n = 15, Abstract). Beide ohne Bankstütze.' },
      { short: 'Ellbogen', anchor: 'uarm', side: 'l', status: 'single', text: 'Ellbogen nah am Körper führen: im EMG eher mehr Latissimus.', src: ['S8'],
        explain: 'Beim Rudern im Sitzen gingen ein engerer Griff und weniger Abspreizen der Schulter jeweils mit mehr Latissimus-EMG einher (Übersicht Di Fonza et al. 2026, Einzelstudien, nicht kombiniert geprüft). Übertragen; EMG ist kein Maß für Muskelwachstum.' },
      { short: 'Ab', anchor: 'wrist', side: 'r', status: 'single', text: 'Kontrolliert absenken, bis der Arm wieder gestreckt ist.', src: ['R1'],
        explain: 'Jede Wiederholung begann und endete mit gestreckten Ellbogen (Langhantelrudern, Sports 2023). Das Absenktempo ist nicht untersucht.' }
    ],
    sources: {
      R1: { label: 'Nieto-Acevedo et al. 2023, Sports', url: 'https://doi.org/10.3390/sports11110220', read: 'fulltext' },
      S1: { label: 'Winther Nielsen et al. 2026, NPJ Microgravity', url: 'https://doi.org/10.1038/s41526-026-00588-y', read: 'fulltext' },
      R3: { label: 'Fenwick, Brown & McGill 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181b07334', read: 'fulltext', note: 'Volltext: Heft 23(5), 1408–1417; PubMed führt dieselbe Arbeit zusätzlich unter 23(2), 350–358 (doi 10.1519/JSC.0b013e3181942019)' },
      R4: { label: 'Saeterbakken et al. 2015, Int J Sports Med', url: 'https://doi.org/10.1055/s-0034-1398646', read: 'abstract' },
      S8: { label: 'Di Fonza et al. 2026, J Funct Morphol Kinesiol (Review)', url: 'https://doi.org/10.3390/jfmk11030315', read: 'fulltext' }
    }
  },

  // ---------- T-Bar-Rudern (v2.10) ----------
  {
    ref: 't-bar-row', checkedAt: '2026-10-19', view: 'side', basis: 'transfer', layout: 'rows',
    basisNote: 'Keine gelesene Studie hat das T-Bar-Rudern kinematisch untersucht. Aufbau vom vorgebeugten Langhantelrudern übertragen (Sports 2023, Volltext): Knie leicht gebeugt, Rücken neutral, Zug aus gestreckten Armen zum unteren Brustkorb. Rumpfneigung (55°), Stangenlänge (≈ 1,85 m vom Drehpunkt bis zum Griff), Neutralgriff und Endwinkel sind Zeichenkonvention; die Hände folgen dem Kreisbogen um den Drehpunkt.',
    tempo: { basis: 'protocol', note: '1 s ziehen, 1 s absenken (Metronom 60/min beim vorgebeugten Langhantelrudern, Fenwick et al. 2009; übertragen).' },
    frames: [
      { label: 'Unten', pose: { ...TBAR.pose, armWorld: TBAR.bottom, elbowSide: TBAR.side, props: tbarProps },
        facts: [V(0, 'R1', 'protocol', 'Start mit gestreckten Ellbogen (Langhantelrudern, übertragen)')] },
      { label: 'Oben', pose: { ...TBAR.pose, armWorld: TBAR.top, elbowSide: TBAR.side, props: tbarProps },
        facts: [V(1, 'R1', 'protocol', 'Ende: Griff am unteren Brustkorb bzw. Bauch (übertragen)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Ziehen', kp: [1] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [1, 2] }, { a: 1, b: 0, dur: 1.0, label: 'Absenken', kp: [3] }],
    keyPoints: [
      { short: 'Haltung', anchor: 'back', side: 'l', status: 'consensus', text: 'Knie leicht beugen, aus der Hüfte vorneigen, Rücken neutral halten.', src: ['R1', 'R3'],
        explain: 'Aufbau in beiden Protokollen für das vorgebeugte Langhantelrudern: Beine leicht gebeugt, Oberkörper weit vorgeneigt, Wirbelsäule neutral (Sports 2023; Fenwick et al. 2009). Trotz der Anweisung beugte sich die Lendenwirbelsäule im Mittel um 22,9°. Ein Rumpfwinkel wurde nicht angegeben; die gezeigten 55° sind Konvention.' },
      { short: 'Zug', anchor: 'hand', side: 'r', status: 'single', text: 'Aus gestreckten Armen den Griff zum unteren Brustkorb oder Bauch ziehen.', src: ['R1'],
        explain: 'Start mit gestreckten Ellbogen, Zug Richtung unterer Brustkorb, Ende bei Kontakt mit dem Bauch (Sports 2023, Langhantel; übertragen). Ellbogenwinkel und Zugweg wurden nicht gemessen.' },
      { short: 'Rücken', anchor: 'lowBack', side: 'l', status: 'single', text: 'Vorgebeugtes Rudern belastete die Lendenwirbelsäule am stärksten.', src: ['R3'],
        explain: 'Fenwick, Brown & McGill 2009 (7 Männer, Langhantel): Druck auf L4/L5 3576 N vorgebeugt gegenüber 2457 N einarmig am Kabel und 2339 N im Hang, dazu 22,9° Beugung der Lendenwirbelsäule; zugleich die höchste Steifigkeit. T-Bar-Rudern selbst wurde nicht gemessen.' },
      { short: 'Ab', anchor: 'elbow', side: 'r', status: 'single', text: 'Kontrolliert absenken, bis die Arme wieder gestreckt sind.', src: ['R1'],
        explain: 'Jede Wiederholung begann und endete mit gestreckten Ellbogen (Sports 2023, übertragen). Das Absenktempo ist nicht untersucht.' }
    ],
    sources: {
      R1: { label: 'Nieto-Acevedo et al. 2023, Sports', url: 'https://doi.org/10.3390/sports11110220', read: 'fulltext' },
      R3: { label: 'Fenwick, Brown & McGill 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181b07334', read: 'fulltext', note: 'Volltext: Heft 23(5), 1408–1417; PubMed führt dieselbe Arbeit zusätzlich unter 23(2), 350–358 (doi 10.1519/JSC.0b013e3181942019)' }
    }
  },

  // ---------- Brustgestütztes Rudern (v2.10) ----------
  {
    ref: 'chest-supported-row', checkedAt: '2026-10-19', view: 'side', basis: 'transfer',
    basisNote: 'Keine gelesene Studie hat das Rudern mit Brustauflage kinematisch gemessen. Endwinkel von Schulter und Ellbogen sind vom Rudern am Kabel übertragen (IMU, NPJ Microgravity 2026, Volltext); ruhiger Rumpf auf dem Polster und Start mit gestreckten Armen stammen aus dem Protokoll für Rudern in Bauchlage auf der Bank (Sports 2023, Volltext). Polsterneigung (45°), Hebel und Fußplatte sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: '2 s ziehen, 2 s ablassen (Protokoll beim Rudern in Bauchlage, Fischer et al. 2025, Abstract).' },
    frames: [
      { label: 'Unten', pose: { ...CSR.pose, shoulder: C(45, 'Arm hängt senkrecht (Rumpf 45°)'), elbow: V(0, 'R1', 'protocol', 'Start mit gestreckten Ellbogen'), props: csrProps } },
      { label: 'Oben', pose: { ...CSR.pose, shoulder: V(-5, 'S1', 'fulltext', 'übertragen vom Rudern am Kabel: −5,0 ± 9,7°'), elbow: V(105.4, 'S1', 'fulltext', 'übertragen vom Rudern am Kabel: 105,4 ± 13,1°'), props: csrProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Ziehen', kp: [2] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [2, 3] }, { a: 1, b: 0, dur: 2.0, label: 'Ablassen', kp: [4] }],
    keyPoints: [
      { short: 'Polster', anchor: 'chest', side: 'r', status: 'single', text: 'Brust bleibt am Polster, der Rumpf bewegt sich nicht.', src: ['R1'],
        explain: 'Protokoll beim Rudern in Bauchlage (Sports 2023): Rumpf starr und unbewegt auf der Bank, Kopf in Verlängerung des Rumpfs. Hier auf ein schräges Polster übertragen.' },
      { short: 'Start', anchor: 'hand', side: 'r', status: 'single', text: 'Aus gestreckten Armen starten, Griff etwa schulterbreit.', src: ['R1'],
        explain: 'Start mit gestreckten Ellbogen, Griff im Abstand der Schulterhöhen (Akromion zu Akromion), Obergriff (Sports 2023, Rudern in Bauchlage). Neutralgriff am Gerät ist ebenso üblich, aber nicht verglichen.' },
      { short: 'Zug', anchor: 'elbow', side: 'l', status: 'single', text: 'Ziehen, bis die Oberarme etwa neben dem Rumpf sind.', src: ['S1'],
        explain: 'Endwinkel vom Rudern am Kabel übertragen: Schulter −5,0 ± 9,7°, Ellbogen 105,4 ± 13,1° (IMU, 14 Personen, Volltext).' },
      { short: 'Weg', anchor: 'uarm', side: 'l', status: 'single', text: 'Halber oder voller Weg: im EMG nur kleine, uneinheitliche Unterschiede.', src: ['F1'],
        explain: 'Fischer et al. 2025 (16 Trainierte, Rudern in Bauchlage, 10RM, 2 s / 2 s, Abstract): Die obere Hälfte des Wegs zeigte mehr mittlere Latissimus-Aktivität, der Trapezmuskel aber weniger Spitzenaktivität; insgesamt nur mittlere, uneinheitliche Effekte.' },
      { short: 'Schulter', anchor: 'upperBack', side: 'l', status: 'consensus', text: 'Schulterblätter fixiert oder frei: im EMG insgesamt ähnlich.', src: ['S2', 'S3'],
        explain: 'Beim Rudern im Sitzen: fixierte und freie Schulterblätter gaben ähnliche Gesamtmuster mit kleinen Unterschieden einzelner Muskeln (Padovan et al. 2025, HD-EMG, n = 14); isometrisch kein Unterschied bei Trapez und Rhomboideus (Lehman et al. 2004, n = 12). Übertragen.' }
    ],
    sources: {
      R1: { label: 'Nieto-Acevedo et al. 2023, Sports', url: 'https://doi.org/10.3390/sports11110220', read: 'fulltext' },
      S1: { label: 'Winther Nielsen et al. 2026, NPJ Microgravity', url: 'https://doi.org/10.1038/s41526-026-00588-y', read: 'fulltext' },
      F1: { label: 'Fischer et al. 2025, J Electromyogr Kinesiol', url: 'https://doi.org/10.1016/j.jelekin.2025.103025', read: 'abstract' },
      S2: { label: 'Padovan et al. 2025, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk11010006', read: 'fulltext' },
      S3: { label: 'Lehman et al. 2004, Dyn Med', url: 'https://doi.org/10.1186/1476-5918-3-4', read: 'fulltext' }
    }
  },

  // ---------- Rudern an der Maschine (v2.10) ----------
  {
    ref: 'machine-row', checkedAt: '2026-10-19', view: 'side', basis: 'transfer',
    basisNote: 'Keine gelesene Studie hat das Rudern an einer Maschine mit Brustpolster gemessen. Schulter- und Ellbogenwinkel sind vom Rudern am Kabel übertragen (IMU-Messung, 14 Personen, NPJ Microgravity 2026, Volltext). Aufrechter Rumpf als Anweisung (Padovan et al. 2025, Gerät ohne Brustpolster). Brustpolster, Sitz und Hebel mit Drehpunkt über dem Kopf sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: '2 s ziehen, 2 s zurück, ≈ 0,5 s halten (Protokolle der IMU-Studie und Padovan et al. 2025).' },
    frames: [
      { label: 'Vorn', pose: { ...MROW.pose, shoulder: V(61.1, 'S1', 'fulltext', 'übertragen vom Rudern am Kabel: 61,1 ± 5,3°'), elbow: K(5.9, 'S1', 'Maximum 105,4° minus ROM 99,5° (Rudern am Kabel)'), props: mrowProps } },
      { label: 'Zug', pose: { ...MROW.pose, shoulder: V(-5, 'S1', 'fulltext', 'übertragen vom Rudern am Kabel: −5,0 ± 9,7°'), elbow: V(105.4, 'S1', 'fulltext', 'übertragen vom Rudern am Kabel: 105,4 ± 13,1°'), props: mrowProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Vorn', kp: [0] }, { a: 0, b: 1, dur: 2.0, label: 'Ziehen', kp: [1, 2] }, { a: 1, b: 1, dur: 0.5, label: 'Halten', kp: [1, 3] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [4] }],
    keyPoints: [
      { short: 'Sitz', anchor: 'chest', side: 'r', status: 'single', text: 'Aufrecht sitzen, Brust am Polster, der Rumpf schwingt nicht mit.', src: ['S2'],
        explain: 'Aufrechter Rumpf als Anweisung beim Rudern im Sitzen (Padovan et al. 2025, Technogym-Gerät ohne Brustpolster). Das Polster selbst wurde nicht untersucht.' },
      { short: 'Zug', anchor: 'elbow', side: 'l', status: 'single', text: 'Griffe zum Rumpf ziehen, bis die Oberarme etwa neben dem Körper sind.', src: ['S1'],
        explain: 'Gemessen beim Rudern am Kabel: Schulter von 61,1 ± 5,3° auf −5,0 ± 9,7°, Ellbogen bis 105,4 ± 13,1° (IMU, 14 Personen). Auf die Maschine übertragen.' },
      { short: 'Ellbogen', anchor: 'uarm', side: 'l', status: 'single', text: 'Ellbogen nah am Körper führen: im EMG eher mehr Latissimus.', src: ['S8'],
        explain: 'Beim Rudern im Sitzen gingen ein engerer Griff und weniger Abspreizen der Schulter jeweils mit mehr Latissimus-EMG einher (Übersicht Di Fonza et al. 2026; Einzelstudien, nicht kombiniert geprüft). EMG ist kein Maß für Muskelwachstum.' },
      { short: 'Schulter', anchor: 'upperBack', side: 'l', status: 'consensus', text: 'Schulterblätter fixiert oder frei: im EMG insgesamt ähnlich.', src: ['S2', 'S3'],
        explain: 'Fixierte und freie Schulterblätter gaben ähnliche Gesamtmuster mit kleinen Unterschieden einzelner Muskeln (Padovan et al. 2025, HD-EMG, n = 14); isometrisch kein Unterschied bei Trapez und Rhomboideus (Lehman et al. 2004, n = 12).' },
      { short: 'Zurück', anchor: 'hand', side: 'r', status: 'consensus', text: 'Langsam zurück, bis die Arme wieder fast gestreckt sind.', src: ['S1', 'S2'],
        explain: 'Start und Ende mit gestreckten Ellbogen in beiden Protokollen; gemessen blieb vorn eine Restbeugung von ≈ 6° (Rudern am Kabel).' }
    ],
    sources: {
      S1: { label: 'Winther Nielsen et al. 2026, NPJ Microgravity', url: 'https://doi.org/10.1038/s41526-026-00588-y', read: 'fulltext' },
      S2: { label: 'Padovan et al. 2025, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk11010006', read: 'fulltext' },
      S3: { label: 'Lehman et al. 2004, Dyn Med', url: 'https://doi.org/10.1186/1476-5918-3-4', read: 'fulltext' },
      S8: { label: 'Di Fonza et al. 2026, J Funct Morphol Kinesiol (Review)', url: 'https://doi.org/10.3390/jfmk11030315', read: 'fulltext' }
    }
  },

  // ---------- Rudern im Hang (v2.10) ----------
  {
    ref: 'inverted-row', checkedAt: '2026-10-19', view: 'side', basis: 'protocol', layout: 'rows',
    basisNote: 'Keine gelesene Studie nennt Schulter- oder Ellbogenwinkel. Gestreckte Körperlinie, schulterbreiter Obergriff und Tempo stammen aus dem Protokoll von Vural et al. 2023 (Schlingentrainer, Volltext), der Endpunkt „Brust ≈ 10 cm unter der Stange“ aus McGill et al. 2014 (Volltext). Gezeigt ist eine feste Stange auf Hüfthöhe (≈ 90 cm) mit Fersen am Boden; Stangenhöhe und Armwinkel sind Zeichenkonvention, die Körperneigung (unten ≈ 20°, oben ≈ 40°) folgt aus der Geometrie. Fenwick et al. 2009 nutzten eine Variante mit 90° gebeugten Knien.',
    tempo: { basis: 'protocol', note: '1 s hoch, 1 s ab ohne Pause (Metronom 60/min, Vural et al. 2023).' },
    frames: [
      { label: 'Unten', pose: { ...INV.pose, trunk: K(INV.low, [], 'so gewählt, dass die Arme bei festen Fersen gestreckt sind'), props: invProps },
        facts: [V(0, 'V1', 'protocol', 'Kopf, Rumpf und Hüfte in einer Linie')] },
      { label: 'Oben', pose: { ...INV.pose, trunk: K(INV.top, [], 'so gewählt, dass die Brust ≈ 10 cm unter der Stange ist (McGill et al. 2014)'), props: invProps },
        facts: [V(10, 'M1', 'protocol', 'Brust bis ≈ 10 cm an die Stange; Armwinkel nicht gemessen')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 1.0, label: 'Hoch', kp: [0, 2] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [3] }, { a: 1, b: 0, dur: 1.0, label: 'Ab', kp: [4] }],
    keyPoints: [
      { short: 'Linie', anchor: 'hip', side: 'r', status: 'consensus', text: 'Körper in einer Linie halten, nicht ins Hohlkreuz ausweichen.', src: ['V1', 'R3'],
        explain: 'Kopf, Rumpf und Hüfte in einer Linie war Vorgabe bei Vural et al. 2023. Bei Fenwick et al. 2009 sollten die Teilnehmer den Körper „fest“ halten, drückten die Lendenwirbelsäule aber meist weit ins Hohlkreuz (34,8 % des eigenen Streckumfangs; n = 7).' },
      { short: 'Weg', anchor: 'hand', side: 'l', status: 'consensus', text: 'Aus gestreckten Armen die Brust bis etwa 10 cm an die Stange ziehen.', src: ['M1', 'V1', 'Y1'],
        explain: 'Brust bis 10 cm an die Stange (McGill et al. 2014, 14 Männer); schulterbreiter Obergriff (Vural et al. 2023). Ein Griffbreitenvergleich fehlt; der Untergriff veränderte die Latissimus-Aktivität (Youdas et al. 2016, Abstract).' },
      { short: 'Neigung', anchor: 'chest', side: 'l', status: 'single', text: 'Je flacher der Körper, desto mehr Gewicht tragen die Arme.', src: ['G1'],
        explain: 'Statisches Rudern im Schlingentrainer mit gestreckten Armen (Giancotti et al. 2021, n = 30): bei 36° Körperneigung trugen die Füße 47 %, bei 6° nur 32 % des Körpergewichts – die Arme also etwa 53 bzw. 68 % (berechnet). Mit fester Stange nicht gemessen.' },
      { short: 'Last', anchor: 'elbow', side: 'r', status: 'single', text: 'Fast waagerecht trugen die Arme etwa 73 % des Körpergewichts.', src: ['V1'],
        explain: 'Vural et al. 2023 (Kraftaufnehmer an den Gurten, Körper etwa parallel zum Boden, Wiederholungen): 73,4 ± 1,9 % des Körpergewichts mit Füßen am Boden, 75,7 ± 3,0 % mit Füßen in Schlingen. Mit fester Stange nicht gemessen.' },
      { short: 'Rücken', anchor: 'lowBack', side: 'r', status: 'consensus', text: 'Rudern im Hang belastete die Lendenwirbelsäule eher wenig.', src: ['R3', 'M1'],
        explain: 'Druck auf L4/L5: 2339 N im Hang gegenüber 3576 N beim vorgebeugten Langhantelrudern (Fenwick et al. 2009) bzw. 2294 N gegenüber 2852 N beim Klimmzug (McGill et al. 2014). Beides Modellrechnungen aus EMG und Bewegung an jungen Männern.' }
    ],
    sources: {
      V1: { label: 'Vural et al. 2023, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0291608', read: 'fulltext' },
      M1: { label: 'McGill, Cannon & Andersen 2014, J Electromyogr Kinesiol', url: 'https://doi.org/10.1016/j.jelekin.2014.06.002', read: 'fulltext', note: 'akzeptiertes Manuskript' },
      G1: { label: 'Giancotti et al. 2021, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003100', read: 'fulltext', note: 'akzeptiertes Manuskript (2019)' },
      R3: { label: 'Fenwick, Brown & McGill 2009, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181b07334', read: 'fulltext', note: 'Volltext: Heft 23(5), 1408–1417; PubMed führt dieselbe Arbeit zusätzlich unter 23(2), 350–358 (doi 10.1519/JSC.0b013e3181942019)' },
      Y1: { label: 'Youdas et al. 2016, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000001210', read: 'abstract' }
    }
  },
  // ---------- Klimmzug im Untergriff (v2.11) ----------
  {
    ref: 'chin-up', checkedAt: '2026-10-19', view: 'side', basis: 'transfer', noFloor: true,
    basisNote: 'Seitenansicht, weil der Oberarm im Untergriff stärker vor dem Körper läuft als im Obergriff (bis 42° außerhalb der Schulterblattebene, Prinold & Bull 2016, Volltext). Griff, voller Bewegungsweg und Beinhaltung (Beine nach hinten, 90° zum Rumpf) stammen aus diesem Protokoll. Der Ellbogen oben folgt aus der Geometrie „Kinn über der Stange, Stange vor dem Hals“; gemessen wurde nur der Bewegungsumfang 100,6 ± 14,5° (Youdas et al. 2010, Abstract) – Start und Ende waren dort also vermutlich nicht ganz gestreckt bzw. tiefer. Rumpfneigung aus einem groben Schwerpunktmodell (Mittel aus Schulter, Hüfte und Knie unter den Händen).',
    tempo: { basis: 'measured', note: 'Hochziehen im Mittel ≈ 1,2 s (alle Griffe zusammen, Prinold & Bull 2014); Absenken nicht gemessen, hier 1,5 s.' },
    frames: [
      { label: 'Hang', pose: { root: 'wrist', rootPos: CHIN.grip, trunk: K(CHIN.tHang, [], 'Schwerpunktmodell: Schulter, Hüfte und Knie im Mittel unter den Händen'), hip: C(0), knee: V(90, 'S1', 'fulltext', 'Beine nach hinten, 90° zum Rumpf (als Kniebeugung gelesen)'), armTarget: CHIN.hang, elbowSide: 1, props: chinProps },
        facts: [V(0, 'S1', 'protocol', 'voller Bewegungsweg aus dem Hang')] },
      { label: 'Oben', pose: { root: 'wrist', rootPos: CHIN.grip, trunk: K(CHIN.tTop, [], 'Schwerpunktmodell: Schulter, Hüfte und Knie im Mittel unter den Händen'), hip: C(0), knee: V(90, 'S1', 'fulltext', 'Beine nach hinten, 90° zum Rumpf'), armTarget: CHIN.top, elbowSide: 1, props: chinProps },
        facts: [V(100.6, 'S3', 'abstract', 'Ellbogen-Bewegungsumfang 100,6 ± 14,5° (Untergriff); gezeichnet oben ≈ ' + CHIN.elbowTop + '° aus der Geometrie')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Hang', kp: [0, 1] }, { a: 0, b: 1, dur: 1.2, label: 'Hochziehen', kp: [2, 4] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [2, 3] }, { a: 1, b: 0, dur: 1.5, label: 'Absenken', kp: [0] }],
    keyPoints: [
      { short: 'Griff', anchor: 'hand', side: 'r', status: 'single', text: 'Untergriff etwa schulterbreit, aus dem Hang mit langen Armen starten.', src: ['S1'],
        explain: 'Protokoll von Prinold & Bull 2016 (11 geübte Männer): Handflächen zum Körper, Hände etwa schulterbreit, maximaler Bewegungsweg nach oben.' },
      { short: 'Beine', anchor: 'knee', side: 'l', status: 'single', text: 'Beine angewinkelt nach hinten halten, nicht mit Schwung arbeiten.', src: ['S1', 'S5'],
        explain: 'Beine nach hinten, 90° zum Rumpf (Prinold & Bull 2016). Beim Kipping bewegen sich Hüfte und Knie deutlich mehr als beim strikten Klimmzug (Dinunzio et al. 2018, Abstract); ob das besser oder schlechter ist, hängt vom Ziel ab.' },
      { short: 'Ellbogen', anchor: 'elbow', side: 'r', status: 'single', text: 'Im Untergriff beugt der Ellbogen etwas weiter als im Obergriff.', src: ['S3'],
        explain: 'Bewegungsumfang des Ellbogens 100,6 ± 14,5° im Untergriff gegenüber 93,4 ± 14,6° im Obergriff (Youdas et al. 2010, 25 Personen, Abstract).' },
      { short: 'Muskeln', anchor: 'uarm', side: 'l', status: 'single', text: 'Untergriff: im EMG mehr Bizeps und Brust, Obergriff: mehr unterer Trapez.', src: ['S3', 'S8'],
        explain: 'Youdas et al. 2010 (Abstract): Bizeps und großer Brustmuskel waren im Untergriff stärker aktiv, der untere Trapezmuskel im Obergriff. Der Latissimus war über die Griffe ähnlich aktiv (Übersicht Di Fonza et al. 2026).' },
      { short: 'Schulter', anchor: 'shoulder', side: 'r', status: 'single', text: 'Der Oberarm läuft im Untergriff weiter vor dem Körper als im Obergriff.', src: ['S1'],
        explain: 'Abweichung des Oberarms von der Schulterblattebene bis 42° im Untergriff, bis 28° im Obergriff (Prinold & Bull 2016). Die Autoren vermuten daraus mehr Stabilisierungsarbeit der Rotatorenmanschette; Verletzungsdaten gibt es nicht.' }
    ],
    sources: {
      S1: { label: 'Prinold & Bull 2016, J Sci Med Sport', url: 'https://doi.org/10.1016/j.jsams.2015.08.002', read: 'fulltext' },
      S2: { label: 'Prinold & Bull 2014, J Biomech', url: 'https://doi.org/10.1016/j.jbiomech.2014.05.015', read: 'fulltext' },
      S3: { label: 'Youdas et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181f1598c', read: 'abstract' },
      S5: { label: 'Dinunzio et al. 2018, Sports Biomech', url: 'https://doi.org/10.1080/14763141.2018.1452971', read: 'abstract' },
      S8: { label: 'Di Fonza et al. 2026, J Funct Morphol Kinesiol (Review)', url: 'https://doi.org/10.3390/jfmk11030315', read: 'fulltext' }
    }
  },

  // ---------- Latzug eng/neutral (v2.11) ----------
  {
    ref: 'close-grip-lat-pulldown', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Seitenansicht. Keine Studie hat Gelenkwinkel für den engen Neutralgriff gemessen. Griffbreite (Abstand der Schulterhöhen), aufrechter Rumpf und Tempo stammen aus dem Protokoll von Buonsenso et al. 2025 (Volltext), Oberschenkelpolster und Zug bis zur Brust aus Padovan et al. 2024 (Volltext). Schulter- und Ellbogenwinkel, Sitz und Rolle sind Zeichenkonvention. Die leichte Rücklage beim Ziehen (≈ 10°) ist ebenfalls Konvention; eine Messung der Rumpfneigung beim engen Griff wurde nicht gefunden (PubMed-Suche 2026-10-21).',
    tempo: { basis: 'protocol', note: '2 s ziehen, 2 s zurück (Buonsenso et al. 2025; Lusk et al. 2010).' },
    frames: [
      { label: 'Oben', pose: { root: 'hip', rootPos: CGP.hip, trunk: V(0, 'L2', 'protocol', 'aufrecht (enger Neutralgriff ohne Rumpfneigung)'), hip: C(90), knee: C(90), foot: C(90), armTarget: CGP.start, elbowSide: 1, props: cgpProps },
        facts: [V(0, 'L4', 'protocol', 'Start mit gestreckten Armen')] },
      { label: 'Gesicht', pose: { root: 'hip', rootPos: CGP.hip, trunk: C(CGP.leanMid, 'Rücklage halb (Zeichenkonvention)'), hip: C(90), knee: C(90), foot: C(90), armTarget: CGP.mid, elbowSide: 1, props: cgpProps } },
      { label: 'Brust', pose: { root: 'hip', rootPos: CGP.hip, trunk: C(CGP.lean, 'leichte Rücklage beim Ziehen (Zeichenkonvention; im Protokoll aufrecht)'), hip: C(90), knee: C(90), foot: C(90), armTarget: CGP.end, elbowSide: 1, props: cgpProps },
        facts: [V(1, 'L1', 'protocol', 'Griff bis zur Brust')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 1.0, label: 'Ziehen', kp: [2] }, { a: 1, b: 2, dur: 1.0, label: 'Ziehen', kp: [2] }, { a: 2, b: 2, dur: 0.5, label: 'Brust', kp: [2, 3] }, { a: 2, b: 1, dur: 1.0, label: 'Zurück', kp: [4] }, { a: 1, b: 0, dur: 1.0, label: 'Zurück', kp: [4] }],
    keyPoints: [
      { short: 'Sitz', anchor: 'thigh', side: 'r', status: 'consensus', text: 'Oberschenkel unter dem Polster fixieren, Rumpf fast aufrecht halten.', src: ['L1', 'L2'],
        explain: 'Oberschenkelpolster fixiert das Becken (Padovan et al. 2024); aufrechter Rumpf beim engen Neutralgriff (Buonsenso et al. 2025, 40 trainierte Männer). Eine Variante mit 30° Neigung wurde dort nur mit weitem Griff getestet. Gezeichnet ist beim Ziehen eine leichte Rücklage von etwa 10°, wie sie im Training häufig zu sehen ist – Zeichenkonvention, nicht gemessen.' },
      { short: 'Griff', anchor: 'hand', side: 'r', status: 'single', text: 'Enger Neutralgriff, etwa so breit wie der Abstand der Schulterhöhen.', src: ['L2'],
        explain: 'Griffbreite gleich der Biakromialbreite, mit dem Messzirkel bestimmt (Buonsenso et al. 2025). V-Griffe sind oft schmaler; verglichen wurde das nicht.' },
      { short: 'Zug', anchor: 'elbow', side: 'l', status: 'single', text: 'Griff bis zur Brust ziehen, die Ellbogen gehen dabei nach unten.', src: ['L1'],
        explain: 'Endpunkt Brust im Protokoll von Padovan et al. 2024 (weiter Griff, übertragen). Ellbogen- und Schulterwinkel sind gezeichnete Konvention.' },
      { short: 'Latissimus', anchor: 'back', side: 'l', status: 'consensus', text: 'Griffbreite und -art änderten die Latissimus-Aktivität im EMG kaum.', src: ['L2', 'L3', 'L4'],
        explain: 'Sieben Griffvarianten ohne Unterschied beim Latissimus (Buonsenso et al. 2025); enger, mittlerer und weiter Obergriff ähnlich (Andersen et al. 2014, Abstract). Obergriff mehr Latissimus als Untergriff (Lusk et al. 2010, Abstract).' },
      { short: 'Zurück', anchor: 'shoulder', side: 'r', status: 'consensus', text: 'In etwa 2 s zurück, bis die Arme wieder gestreckt sind.', src: ['L2', 'L4'],
        explain: 'Tempo 2 s / 2 s mit Metronom in beiden Protokollen. Ob ein anderes Tempo mehr bringt, wurde dort nicht untersucht.' }
    ],
    sources: {
      L1: { label: 'Padovan et al. 2024, J Hum Kinet', url: 'https://doi.org/10.5114/jhk/185211', read: 'fulltext' },
      L2: { label: 'Buonsenso et al. 2025, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk10030345', read: 'fulltext' },
      L3: { label: 'Andersen et al. 2014, J Strength Cond Res', url: 'https://doi.org/10.1097/JSC.0000000000000232', read: 'abstract' },
      L4: { label: 'Lusk et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181ddb0ab', read: 'abstract' }
    }
  },

  // ---------- Überzüge am Kabel (v2.11) ----------
  {
    ref: 'straight-arm-pulldown', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat Gelenkwinkel gemessen. Aufbau nach dem Protokoll von Muyor et al. 2022 (Volltext, 20 Trainierte): stehend, Rumpf senkrecht, Ellbogen gestreckt, Stange von Ohrläppchen- bis Nabelhöhe, Griff 100 % oder 150 % der Schulterbreite, 30 % des Körpergewichts. Die Schulterwinkel (≈ 108° → 58°) sind daraus für die Figur berechnet; Turm, Rollenhöhe und Abstand sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: '2 s ziehen, 2 s zurück (Metronom, Muyor et al. 2022).' },
    frames: [
      { label: 'Oben', pose: { shank: C(3), knee: C(8), ankle: C(3), trunk: V(0, 'M1', 'protocol', 'Rumpf senkrecht'), shoulder: K(108, 'M1', 'Stange auf Ohrläppchenhöhe, für die Figur berechnet'), elbow: V(0, 'M1', 'protocol', 'Ellbogen gestreckt'), props: sapProps } },
      { label: 'Unten', pose: { shank: C(3), knee: C(8), ankle: C(3), trunk: V(0, 'M1', 'protocol', 'Rumpf senkrecht'), shoulder: K(58, 'M1', 'Stange auf Nabelhöhe, für die Figur berechnet'), elbow: V(0, 'M1', 'protocol', 'Ellbogen gestreckt'), props: sapProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0, 3] }, { a: 0, b: 1, dur: 2.0, label: 'Ziehen', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Unten', kp: [2, 4] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [1] }],
    keyPoints: [
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Aufrecht stehen, der Rumpf bleibt senkrecht.', src: ['M1'],
        explain: 'Protokoll von Muyor et al. 2022: stehend mit senkrechtem Rumpf. Ob eine leichte Vorneigung etwas ändert, wurde nicht untersucht.' },
      { short: 'Arme', anchor: 'elbow', side: 'l', status: 'single', text: 'Ellbogen gestreckt halten – der Trizeps arbeitet dabei mit.', src: ['M1'],
        explain: 'Der Trizeps war mit ≈ 19 % der Maximalaktivität einer der aktivsten Muskeln; die Autoren erklären das mit dem Halten der Ellbogenstreckung (Muyor et al. 2022).' },
      { short: 'Weg', anchor: 'hand', side: 'r', status: 'single', text: 'Stange im Bogen von Ohrhöhe bis etwa auf Nabelhöhe führen.', src: ['M1', 'P1'],
        explain: 'Endpunkte im Protokoll (Muyor et al. 2022). Bei isometrischem Zug sank die Latissimus-Aktivität mit steigender Armhebung von 60° auf 120° (Park & Yoo 2013, Abstract) – unten arbeitet der Latissimus also eher stärker.' },
      { short: 'Griff', anchor: 'shoulder', side: 'l', status: 'single', text: 'Griff schulterbreit oder 1,5-fach: im EMG kein deutlicher Unterschied.', src: ['M1'],
        explain: 'Griffbreite 100 % (≈ 44 cm) und 150 % (≈ 66 cm) der Schulterbreite beeinflussten die EMG-Aktivität der gemessenen Muskeln nicht signifikant (Muyor et al. 2022).' },
      { short: 'Rücken', anchor: 'back', side: 'l', status: 'single', text: 'Zielt mehr auf den Latissimus als Überzüge mit der Langhantel.', src: ['M1', 'S1'],
        explain: 'Latissimus-Aktivität am Kabel höher, Brust, vordere Schulter und gerader Bauchmuskel beim Langhantel-Überzug höher (Muyor et al. 2022; Übersicht Di Fonza et al. 2026). EMG ist kein Maß für Muskelwachstum.' }
    ],
    sources: {
      M1: { label: 'Muyor, López-Miñarro & Alacid 2022, Appl Sci', url: 'https://doi.org/10.3390/app122111138', read: 'fulltext' },
      S1: { label: 'Di Fonza et al. 2026, J Funct Morphol Kinesiol (Review)', url: 'https://doi.org/10.3390/jfmk11030315', read: 'fulltext' },
      P1: { label: 'Park & Yoo 2013, J Electromyogr Kinesiol', url: 'https://doi.org/10.1016/j.jelekin.2013.08.006', read: 'abstract' }
    }
  },

  // ---------- Reverse Butterfly (v2.11) ----------
  {
    ref: 'reverse-pec-deck', checkedAt: '2026-10-19', view: 'front', basis: 'protocol',
    basisNote: 'Frontansicht, weil die Arme in der Waagerechten nach außen gehen. Aufbau nach Schoenfeld et al. 2013 (Volltext, 19 Trainierte, Reverse-Fly-Maschine): Brust am Polster, Sitzhöhe so, dass die Griffe auf Höhe der Schulterachsen liegen; Start bei 90° Armhebung nach vorn, Ende mit dem Oberarm „parallel zum Rumpf“ (als Linie mit dem Rumpf gelesen, wie bei Bergquist et al. 2018). Leicht gebeugte Ellbogen nach Bergquist et al. 2018. Die Arme sind in die Bildebene projiziert und erscheinen vorn stark verkürzt; Hebel und Sitz sind Zeichenkonvention, das Brustpolster ist nicht gezeichnet.',
    tempo: { basis: 'protocol', note: 'Nach außen zügig ≈ 1 s, zurück ≈ 2 s (Schoenfeld et al. 2013).' },
    frames: [
      { label: 'Vorn', pose: { rootPos: [0, RPD.seat], armPoints: RPD.start, legs: { hip: C(85, 'sitzend'), knee: C(85) }, props: rpdProps },
        facts: [V(90, 'R1', 'protocol', 'Start: 90° Armhebung nach vorn (Sagittalebene)')] },
      { label: 'Außen', pose: { rootPos: [0, RPD.seat], armPoints: RPD.end, legs: { hip: C(85, 'sitzend'), knee: C(85) }, props: rpdProps },
        facts: [V(1, 'R1', 'protocol', 'Ende: Oberarm „parallel zum Rumpf“')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Vorn', kp: [0, 1] }, { a: 0, b: 1, dur: 1.0, label: 'Öffnen', kp: [2, 4] }, { a: 1, b: 1, dur: 0.3, label: 'Außen', kp: [2, 3] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [4] }],
    keyPoints: [
      { short: 'Sitz', anchor: 'chest', side: 'r', status: 'single', text: 'Brust ans Polster, Sitz so einstellen, dass die Griffe auf Schulterhöhe sind.', src: ['R1'],
        explain: 'Protokoll von Schoenfeld et al. 2013: Brust bündig am Polster, Sitzhöhe so, dass die Griffe mit den Drehachsen der Schultern fluchten.' },
      { short: 'Start', anchor: 'handR', side: 'r', status: 'consensus', text: 'Arme vorn etwa waagerecht, Ellbogen leicht gebeugt.', src: ['R1', 'B1'],
        explain: 'Start bei 90° Armhebung nach vorn (Schoenfeld et al. 2013); leicht gebeugte Ellbogen in der Reverse-Fly-Variante von Bergquist et al. 2018.' },
      { short: 'Weg', anchor: 'elbowL', side: 'l', status: 'consensus', text: 'Arme nach außen führen, bis sie etwa in einer Linie mit dem Rumpf sind.', src: ['R1', 'B1'],
        explain: 'Ende mit dem Oberarm „parallel zum Rumpf“ (Schoenfeld et al. 2013) bzw. „in einer geraden Linie durch den Rumpf“ (Bergquist et al. 2018). Weiter nach hinten wurde nicht untersucht.' },
      { short: 'Griff', anchor: 'handL', side: 'l', status: 'single', text: 'Neutral- oder Obergriff: Unterschied im EMG klein, nach Gefühl wählbar.', src: ['R1'],
        explain: 'Hintere Schulter mit Neutralgriff 90,3 statt 86,5 % der Maximalaktivität (Effekt d ≈ 0,2), Infraspinatus 70,4 statt 61,7 % (d ≈ 0,5). Die Autoren halten den Unterschied für Freizeitsportler kaum für bedeutsam; die Streuung zwischen Personen war groß.' },
      { short: 'Tempo', anchor: 'shoulderR', side: 'r', status: 'single', text: 'Zügig nach außen, in etwa 2 s kontrolliert zurück.', src: ['R1'],
        explain: 'Konzentrisch so kräftig wie möglich (≈ 1 s), exzentrisch ≈ 2 s, Last ≈ 75 % des Körpergewichts bis zur Ermüdung (Schoenfeld et al. 2013).' }
    ],
    sources: {
      R1: { label: 'Schoenfeld et al. 2013, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e318281e1e9', read: 'fulltext' },
      B1: { label: 'Bergquist et al. 2018, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0137', read: 'fulltext' }
    }
  },

  // ---------- Vorgebeugtes Seitheben (v2.11) ----------
  {
    ref: 'dumbbell-reverse-fly', checkedAt: '2026-10-19', view: 'front', basis: 'protocol', layout: 'cols',
    basisNote: 'Frontansicht, weil die Arme seitlich nach außen gehen. Start mit hängenden Armen, leicht gebeugte Ellbogen, Ende mit waagerechten Oberarmen und Tempo stammen aus dem Protokoll von Bergquist et al. 2018 (bäuchlings auf der Flachbank, Volltext). Gezeigt ist die stehende, vorgebeugte Variante; Rumpfneigung (≈ 75°), Knie und Stand sind Zeichenkonvention. Der vorgeneigte Rumpf erscheint von vorn verkürzt.',
    tempo: { basis: 'protocol', note: '2 s anheben, 2 s absenken (Metronom 60/min, Bergquist et al. 2018).' },
    frames: [
      { label: 'Unten', pose: { legs: { planted: true, stance: C(18, 'etwa hüftbreit'), toeOut: C(8), knee: C(20, 'leicht gebeugt'), shank: C(10) }, trunkFlex: C(75, 'Oberkörper weit vorgeneigt (Konvention)'), arm: { abd: V(4, 'B1', 'protocol', 'Arme hängen senkrecht nach unten'), elbow: C(15, 'leicht gebeugt') }, props: raiseProps } },
      { label: 'Oben', pose: { legs: { planted: true, stance: C(18), toeOut: C(8), knee: C(20), shank: C(10) }, trunkFlex: C(75), arm: { abd: V(88, 'B1', 'protocol', 'bis die Oberarme waagerecht sind'), elbow: C(15, 'leicht gebeugt, bleibt gleich') }, props: raiseProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [0, 4] }, { a: 0, b: 1, dur: 2.0, label: 'Anheben', kp: [1, 3] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Absenken', kp: [3] }],
    keyPoints: [
      { short: 'Start', anchor: 'handR', side: 'r', status: 'single', text: 'Arme hängen zu Beginn senkrecht, Ellbogen leicht gebeugt.', src: ['B1'],
        explain: 'Protokoll von Bergquist et al. 2018 (29 Personen, 10RM): Arme senkrecht zum Boden, Ellbogen während der ganzen Bewegung leicht gebeugt.' },
      { short: 'Höhe', anchor: 'elbowL', side: 'l', status: 'single', text: 'Seitlich anheben, bis die Oberarme etwa waagerecht sind.', src: ['B1'],
        explain: 'Endpunkt: Oberarme parallel zum Boden. Ein höherer Endpunkt wurde nicht untersucht.' },
      { short: 'Hantel', anchor: 'shoulderL', side: 'l', status: 'single', text: 'Mit Kurzhanteln war die hintere Schulter im EMG etwas aktiver als mit Band.', src: ['B1'],
        explain: 'Bei gleicher 10RM-Last: Kurzhanteln etwas mehr hintere Schulter und Latissimus, das Band deutlich mehr mittlere Schulter und oberen Trapezmuskel (Bergquist et al. 2018). Kurzhanteln liegend, Band im Stand – auch die Haltung unterschied sich.' },
      { short: 'Tempo', anchor: 'handL', side: 'l', status: 'single', text: 'Gleichmäßig je etwa 2 s anheben und absenken.', src: ['B1'],
        explain: 'Metronom 60/min, je 2 s konzentrisch und exzentrisch (Bergquist et al. 2018).' },
      { short: 'Bank', anchor: 'head', side: 'r', status: 'single', text: 'Alternative: bäuchlings auf einer Flachbank, dann bleibt der Rumpf ruhig.', src: ['B1'],
        explain: 'Die Studie ließ die Kurzhantelvariante bäuchlings auf einer Flachbank ausführen. Die stehende Variante wurde nicht gemessen; wie stark der Rumpf dort mitarbeitet, ist offen.' }
    ],
    sources: {
      B1: { label: 'Bergquist et al. 2018, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0137', read: 'fulltext' }
    }
  },
  // ---------- SZ-Curls / Langhantelcurls (v2.11) ----------
  {
    ref: 'barbell-curl-ez', checkedAt: '2026-10-19', view: 'side', basis: 'measured',
    basisNote: 'Gemessen ist nur der Bewegungsumfang des Ellbogens: 119,9 ± 13,7° mit der SZ-Stange, 117,3 ± 10,9° mit der geraden Stange (Marcolin et al. 2018, Elektrogoniometer, 12 trainierte Männer, 65 % 1RM, Volltext). Unten berührt die Stange die Oberschenkel, deshalb bleibt der Ellbogen leicht gebeugt (Coratella et al. 2023, Volltext); ≈ 22° ist der Winkel, bei dem die Stange an den Oberschenkeln der Figur anliegt (Konvention), oben folgt daraus ≈ 142°. Oberarm am Rumpf wie in der strengen Variante. Kleine Scheiben (Ø ≈ 25 cm) sind Konvention.',
    tempo: { basis: 'protocol', note: '1 s halten, 2 s heben, 1 s halten, 2 s senken (Coratella et al. 2023, Bodybuilder, 8-RM-Last).' },
    frames: [
      { label: 'Unten', pose: { shank: C(0), knee: C(3), hip: C(0), ankle: C(0), shoulder: V(0, 'C1', 'protocol', 'Arme am Rumpf, keine Armbeugung'), elbow: C(22, 'Stange liegt an den Oberschenkeln an (Coratella et al. 2023)'), props: ezCurlProps } },
      { label: 'Oben', pose: { shank: C(0), knee: C(3), hip: C(0), ankle: C(0), shoulder: V(0, 'C1', 'protocol', 'Arme am Rumpf, keine Armbeugung'), elbow: K(142, 'M1', 'Start 22° + gemessener Umfang 119,9° (SZ-Stange)'), props: ezCurlProps },
        facts: [V(117.3, 'M1', 'fulltext', 'gerade Stange: Umfang 117,3 ± 10,9°'), V(123.1, 'M1', 'fulltext', 'zum Vergleich Kurzhanteln: 123,1 ± 12,3°')] }
    ],
    phases: [{ a: 0, b: 0, dur: 1.0, label: 'Unten', kp: [0, 3] }, { a: 0, b: 1, dur: 2.0, label: 'Heben', kp: [1, 2] }, { a: 1, b: 1, dur: 1.0, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [3, 4] }],
    keyPoints: [
      { short: 'Griff', anchor: 'bar', side: 'r', status: 'single', text: 'Gerade Stange etwas breiter als schulterbreit, SZ-Stange etwa schulterbreit greifen.', src: ['C1'],
        explain: 'Protokoll von Coratella et al. 2023 (10 Bodybuilder): gerade Stange im Untergriff, Handabstand mit parallelen Unterarmen und daher breiter als die Schultern; SZ-Stange halb gedreht entlang der Biegung, etwa schulterbreit. Andere Griffbreiten wurden nicht verglichen.' },
      { short: 'Oberarm', anchor: 'uarm', side: 'l', status: 'single', text: 'Oberarme bleiben am Rumpf; nur der Unterarm bewegt sich.', src: ['C1'],
        explain: 'Strenge Variante bei Coratella et al. 2023. Wurde der Oberarm zusätzlich ≈ 30° nach vorn gehoben, stieg die Aktivität von Bizeps (beim Heben) und vorderem Deltamuskel deutlich, beim Senken war der Bizeps dagegen weniger aktiv. Welche Variante mehr Muskelwachstum bringt, ist nicht untersucht.' },
      { short: 'Rumpf', anchor: 'chest', side: 'l', status: 'consensus', text: 'Rumpf und Beine ruhig halten – kein Schwung aus Hüfte oder Knien.', src: ['C1', 'M1'],
        explain: 'In beiden Protokollen wurden Pendeln des Rumpfs und Bewegung der Beine untersagt und kontrolliert (Coratella et al. 2023; Marcolin et al. 2018). Wie stark der Rumpf bei schweren Gewichten ausweicht, wurde nicht gemessen.' },
      { short: 'Unten', anchor: 'thigh', side: 'r', status: 'single', text: 'Senken, bis die Stange die Oberschenkel berührt.', src: ['C1'],
        explain: 'Mit der Stange lässt sich der Ellbogen nicht ganz strecken, weil sie an die Oberschenkel stößt; dort endete die Bewegung (Coratella et al. 2023). Auch frei gewählte Curls begannen meist bei ≈ 20° Beugung (Oliveira et al. 2009).' },
      { short: 'Stange', anchor: 'elbow', side: 'r', status: 'single', text: 'Gerade oder SZ-Stange: im EMG nur kleine Unterschiede beim Bizeps.', src: ['C1', 'M1'],
        explain: 'Mit der geraden Stange war der Bizeps beim Heben ≈ 2 % aktiver als mit der SZ-Stange (Coratella et al. 2023, Bodybuilder); eine frühere Studie fand keinen Unterschied. Der Bewegungsumfang war mit Kurzhanteln am größten (Marcolin et al. 2018). EMG ist kein Maß für Muskelwachstum.' }
    ],
    sources: {
      M1: { label: 'Marcolin et al. 2018, PeerJ', url: 'https://doi.org/10.7717/peerj.5165', read: 'fulltext' },
      C1: { label: 'Coratella et al. 2023, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk8010013', read: 'fulltext' },
      O1: { label: 'Oliveira et al. 2009, J Sports Sci Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/', read: 'fulltext' }
    }
  },

  // ---------- Hammercurls (v2.11) ----------
  {
    ref: 'hammer-curl', checkedAt: '2026-10-19', view: 'side', basis: 'transfer',
    basisNote: 'Keine Bewegungsstudie zum Hammercurl mit Gewicht gefunden. Der Ellbogen-Bewegungsumfang ist vom Kurzhantelcurl übertragen (123,1 ± 12,3°, Marcolin et al. 2018, Volltext); Start ≈ 20° wie bei frei gewählten Curls (Oliveira et al. 2009, Volltext; Winkel dort aus einem Beschleunigungssensor geschätzt). Neutralgriff nach Coratella et al. 2023 (Volltext; dort am Kabelturm mit Seil, nicht mit Kurzhanteln); die Hantel steht quer zum Unterarm (Konvention).',
    tempo: { basis: 'measured', note: 'Übertragen vom Kurzhantelcurl: heben 1,44 ± 0,26 s, senken 1,72 ± 0,47 s bei Metronomvorgabe 3 s je Wiederholung (Marcolin et al. 2018).' },
    frames: [
      { label: 'Unten', pose: { shank: C(0), knee: C(3), hip: C(0), ankle: C(0), shoulder: C(0, 'Oberarm am Körper'), elbow: V(20, 'O1', 'fulltext', 'Start ≈ 20° (frei gewählte Kurzhantelcurls)'), props: hammerProps } },
      { label: 'Oben', pose: { shank: C(0), knee: C(3), hip: C(0), ankle: C(0), shoulder: C(6, 'leichte Vorbewegung des Ellbogens; nicht gemessen'), elbow: K(143, 'M1', 'Start 20° + übertragener Umfang 123,1°'), props: hammerProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 1.44, label: 'Beugen', kp: [1, 2] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 1.72, label: 'Senken', kp: [3] }],
    keyPoints: [
      { short: 'Griff', anchor: 'hand', side: 'r', status: 'single', text: 'Neutralgriff: Daumen zeigen nach oben, der Unterarm dreht nicht mit.', src: ['C2'],
        explain: 'Neutraler Griff als eine der drei Varianten bei Coratella et al. 2023 (Untergriff und Obergriff an der Stange, neutral am Seil, jeweils am Kabelturm; Handabstand gleich). Die Handstellung bleibt über die ganze Wiederholung gleich.' },
      { short: 'Oberarm', anchor: 'uarm', side: 'l', status: 'single', text: 'Oberarme bleiben seitlich am Körper; nur der Unterarm bewegt sich.', src: ['M1'],
        explain: 'Haltung im Protokoll der Kurzhantelcurls: stehend, Arme seitlich am Körper (Marcolin et al. 2018). Für den Hammercurl selbst nicht gemessen.' },
      { short: 'Weg', anchor: 'elbow', side: 'r', status: 'single', text: 'Unten fast strecken, oben so weit beugen, wie es ohne Ausweichen geht.', src: ['M1', 'O1'],
        explain: 'Übertragen: Kurzhantelcurls hatten einen Umfang von 123,1 ± 12,3° (Marcolin et al. 2018); frei gewählte Curls begannen bei ≈ 20° statt ganz gestreckt (Oliveira et al. 2009).' },
      { short: 'Muskeln', anchor: 'chest', side: 'l', status: 'contested', text: 'Im Neutralgriff arbeitete der Bizeps meist etwas weniger als im Untergriff.', src: ['C2', 'X1', 'K1'],
        explain: 'Umstritten. Bei Bodybuildern war der Bizeps im Neutralgriff beim Heben ≈ 12 % und auch der Brachioradialis ≈ 6 % weniger aktiv als im Untergriff, beim Senken gab es keinen Unterschied (Coratella et al. 2023, Kabel mit Seil statt Kurzhanteln); in einer zweiten Studie hatte der Hammercurl die niedrigste Bizepsaktivität von vier Curls (Croskery et al. 2026, Abstract). Ohne Last änderte die Handstellung die Bizepsaktivität nicht (Kleiber et al. 2015, Abstract). Dass der Hammercurl den Unterarm stärker trainiert, zeigen diese EMG-Daten nicht.' }
    ],
    sources: {
      M1: { label: 'Marcolin et al. 2018, PeerJ', url: 'https://doi.org/10.7717/peerj.5165', read: 'fulltext' },
      O1: { label: 'Oliveira et al. 2009, J Sports Sci Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/', read: 'fulltext' },
      C2: { label: 'Coratella et al. 2023, Sports (Basel)', url: 'https://doi.org/10.3390/sports11030064', read: 'fulltext' },
      X1: { label: 'Croskery et al. 2026, J Electromyogr Kinesiol', url: 'https://doi.org/10.1016/j.jelekin.2026.103220', read: 'abstract' },
      K1: { label: 'Kleiber et al. 2015, Front Physiol', url: 'https://doi.org/10.3389/fphys.2015.00215', read: 'abstract' }
    }
  },

  // ---------- Schrägbankcurls (v2.11) ----------
  {
    ref: 'incline-dumbbell-curl', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Keine Bewegungsstudie. Aufbau nach Kobayashi et al. 2026 (Volltext, sitzend auf der Schrägbank mit Lehne): Schulter ≈ 50° gestreckt, Ellbogen 0° → 130°, Unterarm supiniert. Hängt der Oberarm senkrecht, entspricht das einer Lehne ≈ 50° hinter der Senkrechten (berechnet); Zabaleta-Korta et al. 2023 nutzten eine 45°-Bank, Oliveira et al. 2009 einen um 50° zurückgelehnten Rumpf. Sitz, Beine und Hantelgröße sind Konvention.',
    tempo: { basis: 'protocol', note: '2 s heben, 2 s senken ohne Pause (Metronom, Kobayashi et al. 2026).' },
    frames: [
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -110], trunk: K(-50, 'B1', 'Schulter 50° gestreckt bei senkrecht hängendem Oberarm'), hip: C(30, 'hoher Sitz, Oberschenkel leicht abfallend'), knee: C(80), foot: C(90, 'Füße flach'), armPlumb: true, elbow: V(0, 'B1', 'protocol', 'ganz gestreckt'), props: inclineCurlProps },
        facts: [V(50, 'B1', 'fulltext', 'Schulterstreckung ≈ 50° (relativ zur Rumpflängsachse)'), V(45, 'Z1', 'fulltext', 'Zabaleta-Korta et al. 2023: Bank 45°')] },
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -110], trunk: K(-50, 'B1', 'Schulter 50° gestreckt bei senkrecht hängendem Oberarm'), hip: C(30, 'hoher Sitz, Oberschenkel leicht abfallend'), knee: C(80), foot: C(90, 'Füße flach'), armPlumb: true, elbow: V(130, 'B1', 'protocol', 'Ende bei 130° Beugung'), props: inclineCurlProps },
        facts: [V(134.3, 'O1', 'fulltext', 'frei gewählter Umfang 134,3 ± 19,5° (Oliveira et al. 2009, Winkel aus einem Beschleunigungssensor geschätzt)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Beugen', kp: [1, 2] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [3] }],
    keyPoints: [
      { short: 'Bank', anchor: 'back', side: 'l', status: 'consensus', text: 'Lehne etwa 45–50° schräg stellen; die Arme hängen hinter dem Rumpf.', src: ['B1', 'Z1', 'O1'],
        explain: 'Schulter ≈ 50° gestreckt (Kobayashi et al. 2026), Bank 45° (Zabaleta-Korta et al. 2023), Rumpf 50° zurückgelehnt mit frei hängendem Arm (Oliveira et al. 2009). Andere Bankwinkel wurden nicht verglichen.' },
      { short: 'Oberarm', anchor: 'uarm', side: 'l', status: 'consensus', text: 'Oberarme bleiben hängen; nur der Unterarm bewegt sich, von gestreckt bis 130°.', src: ['B1', 'O1'],
        explain: 'Schulterstellung fest, Ellbogen 0° → 130° (Kobayashi et al. 2026); Arm hängt frei (Oliveira et al. 2009). Ob der Oberarm wirklich still steht, wurde nicht gemessen.' },
      { short: 'Bizeps', anchor: 'hand', side: 'r', status: 'single', text: 'Der Bizeps arbeitete über den ganzen Weg ähnlich wie beim Curl im Stehen.', src: ['O1'],
        explain: 'Oliveira et al. 2009 (22 trainierte Männer, eine Wiederholung mit 40 % der Maximalkraft): Schrägbank- und Stehcurl zeigten dasselbe Muster der Bizepsaktivität, der Scottcurl nicht.' },
      { short: 'Wachstum', anchor: 'elbow', side: 'r', status: 'contested', text: 'Ob der Bizeps hier mehr wächst als beim Scottcurl, ist nicht geklärt.', src: ['B1', 'Z1'],
        explain: 'Umstritten. MRT, 12 Wochen, Arm gegen Arm: Der Bizeps wuchs bei Schrägbankcurls etwas mehr, Brachialis und Brachioradialis bei Scottcurls, alle Beuger zusammen gleich (Kobayashi et al. 2026). Ultraschall, 9 Wochen, trainierte Frauen: nach Schrägbankcurls kein messbarer Zuwachs, nach Scottcurls im unteren Bereich (Zabaleta-Korta et al. 2023).' }
    ],
    sources: {
      B1: { label: 'Kobayashi et al. 2026, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2026.2741751', read: 'fulltext' },
      Z1: { label: 'Zabaleta-Korta et al. 2023, J Hum Kinet', url: 'https://doi.org/10.5114/jhk/163561', read: 'fulltext' },
      O1: { label: 'Oliveira et al. 2009, J Sports Sci Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/', read: 'fulltext' }
    }
  },

  // ---------- Scottcurls (v2.11) ----------
  {
    ref: 'preacher-curl', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Keine Bewegungsstudie. Aufbau nach Pedrosa et al. 2023 (Volltext, Kurzhantel, sitzend): Winkel Oberarm–Rumpf fest 45°, Ellbogen von 0° (gestreckt) bis 135° (Unterarm senkrecht). Daraus folgt ein Pult ≈ 45° zur Waagerechten (berechnet); Zabaleta-Korta et al. 2023 nennen ein 50°-Pult. Sitzhöhe, Beinhaltung und Stütze sind Konvention.',
    tempo: { basis: 'protocol', note: '2 s heben, 2 s senken (Metronom, Pedrosa et al. 2023).' },
    frames: [
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -125], trunk: C(0, 'aufrecht'), hip: C(70, 'hoher Sitz, Oberschenkel leicht abfallend'), knee: C(70), foot: C(90, 'Füße flach'), shoulder: V(45, 'P1', 'protocol', 'Oberarm–Rumpf 45°'), elbow: V(0, 'P1', 'protocol', 'ganz gestreckt'), props: preacherProps } },
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -125], trunk: C(0, 'aufrecht'), hip: C(70, 'hoher Sitz, Oberschenkel leicht abfallend'), knee: C(70), foot: C(90, 'Füße flach'), shoulder: V(45, 'P1', 'protocol', 'Oberarm–Rumpf 45°'), elbow: V(135, 'P1', 'protocol', 'Unterarm senkrecht'), props: preacherProps },
        facts: [V(115.5, 'O1', 'fulltext', 'frei gewählter Umfang 115,5 ± 11,2° bei Schulter 50° gebeugt (Oliveira et al. 2009)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Beugen', kp: [4] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [1, 3] }],
    keyPoints: [
      { short: 'Pult', anchor: 'pad', side: 'l', status: 'consensus', text: 'Oberarm liegt auf dem Pult, etwa 45–50° schräg nach vorn unten.', src: ['P1', 'B1', 'Z1'],
        explain: 'Schulterwinkel fest 45° (Pedrosa et al. 2023) bzw. ≈ 50° (Kobayashi et al. 2026, Ellbogen 0–130°, 2 s / 2 s); Scottbank mit 50°-Pult (Zabaleta-Korta et al. 2023). Andere Pultwinkel wurden nicht verglichen.' },
      { short: 'Unten', anchor: 'hand', side: 'r', status: 'single', text: 'Unten kontrolliert bis zur vollen Streckung ablassen.', src: ['P1'],
        explain: 'Jede Wiederholung begann ganz gestreckt (0°). Wer nur den unteren Teil (0–68°) trainierte, bekam mehr Querschnitt im unteren Bizeps als im oberen Teil (68–135°; Pedrosa et al. 2023, untrainierte Frauen, Arm gegen Arm).' },
      { short: 'Oben', anchor: 'wrist', side: 'r', status: 'single', text: 'Oben beugen, bis der Unterarm senkrecht steht.', src: ['P1'],
        explain: 'Endpunkt im Protokoll: 135° Ellbogenbeugung, Unterarm senkrecht zum Boden (Pedrosa et al. 2023). Frei gewählt war der Umfang kleiner (115,5°; Oliveira et al. 2009).' },
      { short: 'Tempo', anchor: 'elbow', side: 'l', status: 'single', text: 'Gleichmäßig: etwa 2 s heben und 2 s senken.', src: ['P1'],
        explain: 'Vorgabe per Metronom (Pedrosa et al. 2023). Andere Tempi wurden nicht verglichen.' },
      { short: 'Bizeps', anchor: 'uarm', side: 'l', status: 'single', text: 'Der Bizeps arbeitet vor allem im unteren, gestreckten Teil der Bewegung.', src: ['O1'],
        explain: 'Beim Scottcurl war der Bizeps zu Beginn des Hebens stark aktiv und gegen Ende deutlich weniger (Oliveira et al. 2009, 22 trainierte Männer) – anders als beim Curl im Stehen oder auf der Schrägbank.' }
    ],
    sources: {
      P1: { label: 'Pedrosa et al. 2023, Sports (Basel)', url: 'https://doi.org/10.3390/sports11020039', read: 'fulltext' },
      B1: { label: 'Kobayashi et al. 2026, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2026.2741751', read: 'fulltext' },
      Z1: { label: 'Zabaleta-Korta et al. 2023, J Hum Kinet', url: 'https://doi.org/10.5114/jhk/163561', read: 'fulltext' },
      O1: { label: 'Oliveira et al. 2009, J Sports Sci Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/', read: 'fulltext' }
    }
  },

  // ---------- Kabelcurls, Bayesian (v2.11) ----------
  {
    ref: 'cable-curl', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Gezeigt ist die Bayesian-Variante (Rücken zum Kabelzug). Keine Bewegungsstudie. Schulter ≈ 45° gestreckt: 43 ± 11° bei Larsen et al. 2026 (stehend, je Person mit Goniometer eingestellt) und ≈ 50° bei Attarieh et al. 2025 (sitzend); beide Volltext. Ellbogen 10° → 140° nach Attarieh et al. 2025 (Larsen begrenzte auf 0–90°). Die Rolle sitzt so, dass Seil und Unterarm bei 61,5° senkrecht stehen (Lage des größten Drehmoments bei Attarieh et al. 2025, für die Figur berechnet). Stand, Turmabstand und Griff sind Konvention.',
    tempo: { basis: 'convention', note: 'Hier 1,5 s heben, 2 s senken. Studien: Senken ≈ 2 s (Larsen et al. 2026), heben so schnell wie möglich; 1 s / 1 s im Protokoll von Attarieh et al. 2025 wirkt als Animation zu hektisch.' },
    frames: [
      { label: 'Unten', pose: { shank: C(0), knee: C(5), hip: C(0), ankle: C(0), trunk: C(0, 'aufrecht; nicht berichtet'), shoulder: V(-45, 'L1', 'protocol', 'Schulter 43 ± 11° gestreckt (Larsen), ≈ 50° (Attarieh)'), elbow: V(10, 'A1', 'protocol', 'fast gestreckt'), props: bayesianProps } },
      { label: 'Oben', pose: { shank: C(0), knee: C(5), hip: C(0), ankle: C(0), trunk: C(0, 'aufrecht; nicht berichtet'), shoulder: V(-45, 'L1', 'protocol', 'Schulter bleibt gestreckt'), elbow: V(140, 'A1', 'protocol', 'voll gebeugt'), props: bayesianProps },
        facts: [V(61.5, 'A1', 'fulltext', 'größtes Drehmoment bei 61,5° Ellbogenbeugung (Seil senkrecht zum Unterarm)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 1.5, label: 'Beugen', kp: [1, 2] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [3] }],
    keyPoints: [
      { short: 'Schulter', anchor: 'uarm', side: 'l', status: 'consensus', text: 'Rücken zum Kabelzug; der Oberarm zeigt etwa 45° nach hinten.', src: ['L1', 'A1'],
        explain: '43 ± 11° Schulterstreckung, je Person 5–10° vor der eigenen Grenze (Larsen et al. 2026); ≈ 50° bei Attarieh et al. 2025.' },
      { short: 'Oberarm', anchor: 'elbow', side: 'r', status: 'single', text: 'Der Oberarm bleibt hinten stehen; nur der Ellbogen beugt sich.', src: ['A1'],
        explain: 'Die Schulterstellung wurde vorgegeben und per Handy-Goniometer stichprobenartig geprüft, nicht laufend gemessen (Attarieh et al. 2025). Bei Larsen et al. 2026 durften sich die Schulterblätter bewegen.' },
      { short: 'Weg', anchor: 'hand', side: 'r', status: 'contested', text: 'Aus fast gestreckt bis ganz gebeugt curlen; Studien nutzten 10–140° oder 0–90°.', src: ['A1', 'L1'],
        explain: 'Umstritten, weil die Protokolle verschieden waren: Umfang 10° → 140° (Attarieh et al. 2025) bzw. bewusst nur 0–90° (Larsen et al. 2026). Die Rollenhöhe legte fest, wo der Widerstand am größten war: in der Mitte bzw. nahe der Streckung.' },
      { short: 'Wachstum', anchor: 'chest', side: 'l', status: 'consensus', text: 'Mehr Wachstum als mit neutraler Schulter oder als Scottcurl brachte das nicht.', src: ['L1', 'A1'],
        explain: 'Ultraschall: Bayesian- und Scott-Kabelcurls mit gleichem Widerstandsprofil gaben gleiches Wachstum und gleiche Kraft (Attarieh et al. 2025); gestreckte gegen neutrale Schulter gab ebenfalls keinen Vorteil, obwohl mehr Gewicht bewegt wurde (Larsen et al. 2026).' }
    ],
    sources: {
      L1: { label: 'Larsen et al. 2026, Front Physiol', url: 'https://doi.org/10.3389/fphys.2026.1750722', read: 'fulltext' },
      A1: { label: 'Attarieh et al. 2025, Eur J Sport Sci', url: 'https://doi.org/10.1002/ejsc.12279', read: 'fulltext' }
    }
  },

  // ---------- Konzentrationscurls (v2.11) ----------
  {
    ref: 'concentration-curl', checkedAt: '2026-10-19', view: 'side', basis: 'transfer',
    basisNote: 'Keine Bewegungs- oder Aufbaustudie gefunden. Der Ellbogen-Bewegungsumfang ist vom Kurzhantelcurl übertragen (123,1 ± 12,3°, Marcolin et al. 2018, Volltext), Start ≈ 20° nach Oliveira et al. 2009. Sitz auf der Flachbank, Rumpf ≈ 35° vorgeneigt, Oberarm hängt senkrecht mit dem Ellbogen innen am Oberschenkel kurz vor dem Knie: Zeichenkonvention. In der Seitenansicht liegt der Arm vor dem Bein, obwohl er innen am Oberschenkel anliegt.',
    tempo: { basis: 'measured', note: 'Übertragen vom Kurzhantelcurl: heben 1,44 s, senken 1,72 s (Marcolin et al. 2018); für den Konzentrationscurl kein Tempo untersucht.' },
    frames: [
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -96], trunk: C(35, 'vorgeneigt, Ellbogen am Oberschenkel'), hip: C(125, 'Oberschenkel waagerecht'), knee: C(90), foot: C(90, 'Füße flach'), armPlumb: true, elbow: V(20, 'O1', 'fulltext', 'Start ≈ 20°'), props: concentrationProps } },
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -96], trunk: C(35, 'vorgeneigt, Ellbogen am Oberschenkel'), hip: C(125, 'Oberschenkel waagerecht'), knee: C(90), foot: C(90, 'Füße flach'), armPlumb: true, elbow: K(143, 'M1', 'Start 20° + übertragener Umfang 123,1°'), props: concentrationProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [1] }, { a: 0, b: 1, dur: 1.44, label: 'Beugen', kp: [0, 1] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [0] }, { a: 1, b: 0, dur: 1.72, label: 'Senken', kp: [2] }],
    keyPoints: [
      { short: 'Bizeps', anchor: 'uarm', side: 'l', status: 'single', text: 'In einer EMG-Studie war der Bizeps hier aktiver als beim Hammercurl.', src: ['X1'],
        explain: 'Croskery et al. 2026 (15 Erwachsene, vier Curls mit ≈ 33 % der Maximalkraft, Abstract): Reihenfolge Konzentrationscurl vor Kurzhantel- und Schrägbankcurl vor Hammercurl; deutlich war nur der Abstand zum Hammercurl. EMG ist kein Maß für Muskelwachstum.' },
      { short: 'Weg', anchor: 'hand', side: 'r', status: 'single', text: 'Unten fast strecken, oben so weit beugen, wie es ohne Ausweichen geht.', src: ['M1', 'O1'],
        explain: 'Übertragen vom Kurzhantelcurl: Umfang 123,1 ± 12,3° (Marcolin et al. 2018), Start bei ≈ 20° (Oliveira et al. 2009).' },
      { short: 'Gefühl', anchor: 'chest', side: 'l', status: 'single', text: 'Wie stark man den Muskel spürt, sagte wenig über seine gemessene Aktivität.', src: ['E1'],
        explain: 'Sevilmiş et al. 2024 (13 Fußballer, sechs Übungen inkl. Konzentrationscurl, 4–6RM, Abstract): Selbsteinschätzung und EMG hingen bei keiner Übung zusammen.' }
    ],
    sources: {
      M1: { label: 'Marcolin et al. 2018, PeerJ', url: 'https://doi.org/10.7717/peerj.5165', read: 'fulltext' },
      O1: { label: 'Oliveira et al. 2009, J Sports Sci Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/', read: 'fulltext' },
      X1: { label: 'Croskery et al. 2026, J Electromyogr Kinesiol', url: 'https://doi.org/10.1016/j.jelekin.2026.103220', read: 'abstract' },
      E1: { label: 'Sevilmiş et al. 2024, Percept Mot Skills', url: 'https://doi.org/10.1177/00315125241279086', read: 'abstract' }
    }
  },
  // ---------- Frontheben (v2.11) ----------
  {
    ref: 'dumbbell-front-raise', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Keine Bewegungsstudie. Aufbau nach Coratella et al. 2020 (Volltext, 10 Bodybuilder, 8-RM-Last): im Sitzen, damit der untere Rücken nicht mithilft; Oberarm in neutraler Drehung mit gestrecktem Ellbogen nach vorn bis 90° Schulterbeugung. Leicht gebeugter Ellbogen (≈ 10°), Bank und Hantelgröße sind Konvention.',
    tempo: { basis: 'protocol', note: '2 s heben, 0,5 s halten, 2 s senken, 0,5 s halten (Metronom, Coratella et al. 2020).' },
    frames: [
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -96], trunk: V(0, 'F1', 'protocol', 'sitzend, aufrecht'), hip: C(90), knee: C(90), foot: C(90, 'Füße flach'), shoulder: C(8, 'Arm hängt vor dem Oberschenkel'), elbow: C(10, 'fast gestreckt'), props: frontRaiseProps } },
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -96], trunk: V(0, 'F1', 'protocol', 'sitzend, aufrecht'), hip: C(90), knee: C(90), foot: C(90, 'Füße flach'), shoulder: V(90, 'F1', 'protocol', 'Schulterbeugung bis 90°'), elbow: C(10, 'fast gestreckt, bleibt gleich'), props: frontRaiseProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Unten', kp: [3] }, { a: 0, b: 1, dur: 2.0, label: 'Heben', kp: [0, 1] }, { a: 1, b: 1, dur: 0.5, label: 'Oben', kp: [0, 2] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [4] }],
    keyPoints: [
      { short: 'Höhe', anchor: 'hand', side: 'r', status: 'single', text: 'Arme vorn anheben, bis sie etwa auf Schulterhöhe sind (90°).', src: ['F1'],
        explain: 'Zielwinkel im Protokoll von Coratella et al. 2020. Höhere Endpositionen wurden dort nicht verglichen.' },
      { short: 'Ellbogen', anchor: 'elbow', side: 'r', status: 'single', text: 'Ellbogen gestreckt lassen, Oberarm nicht nach innen oder außen drehen.', src: ['F1'],
        explain: 'Protokoll: gestreckter Ellbogen, Oberarm in neutraler Drehung (Coratella et al. 2020). Die Figur zeigt ihn leicht gebeugt.' },
      { short: 'Muskeln', anchor: 'chest', side: 'l', status: 'single', text: 'Arbeitet vor allem den vorderen Delta und den oberen Brustmuskel.', src: ['F1'],
        explain: 'Bei Bodybuildern waren vorderer Deltamuskel und oberer (klavikulärer) Brustmuskel beim Frontheben aktiver als bei allen Seitheben-Varianten; seitlicher und hinterer Delta spielten kaum eine Rolle (Coratella et al. 2020). EMG ist kein Maß für Muskelwachstum.' },
      { short: 'Rumpf', anchor: 'lowBack', side: 'l', status: 'single', text: 'Im Sitzen geübt, damit der untere Rücken nicht mit Schwung hilft.', src: ['F1'],
        explain: 'Die Autoren ließen im Sitzen üben, um die Lendenmuskeln herauszuhalten (Coratella et al. 2020). Wie stark der Rumpf im Stehen ausweicht, wurde nicht gemessen.' },
      { short: 'Tempo', anchor: 'uarm', side: 'l', status: 'single', text: 'Gleichmäßig: 2 s heben, kurz halten, 2 s senken.', src: ['F1'],
        explain: 'Tempovorgabe per Metronom (Coratella et al. 2020). Andere Tempi wurden nicht verglichen.' }
    ],
    sources: {
      F1: { label: 'Coratella et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17176015', read: 'fulltext' }
    }
  },

  // ---------- Seitheben am Kabel (Frontansicht, v2.11) ----------
  {
    ref: 'cable-lateral-raise', checkedAt: '2026-10-19', view: 'front', basis: 'protocol',
    basisNote: 'Frontansicht, einarmig. Aufbau nach Larsen et al. 2025 (Volltext, 24 Trainierte, 8 Wochen): Arm aus der Hängeposition in der Frontalebene bis 90° Abduktion, Ellbogen ganz gestreckt; die Rolle steht etwa auf Handhöhe, sodass der Widerstand unten am größten ist. Auf welcher Seite der Turm stand und wie weit entfernt, wird nicht genannt; Turm auf der Gegenseite, Seil vor dem Körper und der hängende andere Arm sind Konvention.',
    tempo: { basis: 'convention', note: '≈ 1,5 s heben, 2 s senken (Konvention). Larsen et al. 2025 ließen das Tempo konstant halten; gegen Satzende beschleunigten die Teilnehmer aus der unteren Position.' },
    frames: [
      { label: 'Unten', pose: { arm: { abd: V(0, 'X1', 'protocol', 'Oberarm parallel zum Körper'), elbow: V(0, 'X1', 'protocol', 'Ellbogen ganz gestreckt') }, armL: { abd: C(6, 'freier Arm hängt'), elbow: C(8) }, legs: { hip: C(0), knee: C(0) }, props: cableLateralProps } },
      { label: 'Oben', pose: { arm: { abd: V(90, 'X1', 'protocol', 'bis 90° Abduktion'), elbow: V(0, 'X1', 'protocol', 'Ellbogen ganz gestreckt') }, armL: { abd: C(6, 'freier Arm hängt'), elbow: C(8) }, legs: { hip: C(0), knee: C(0) }, props: cableLateralProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [1] }, { a: 0, b: 1, dur: 1.5, label: 'Heben', kp: [0, 3] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [0] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [2] }],
    keyPoints: [
      { short: 'Weg', anchor: 'handR', side: 'r', status: 'single', text: 'Arm seitlich mit gestrecktem Ellbogen bis auf Schulterhöhe (90°) heben.', src: ['X1'],
        explain: 'Bewegungsumfang 0° → 90° in der Frontalebene, vorher mit Goniometer geübt (Larsen et al. 2025).' },
      { short: 'Rolle', anchor: 'hipR', side: 'l', status: 'single', text: 'Rolle etwa auf Handhöhe: dann ist der Widerstand unten am größten.', src: ['X1'],
        explain: 'So eingestellt, dass die Last am Anfang der Bewegung am größten ist (Larsen et al. 2025). Mit der Kurzhantel ist es umgekehrt: unten fast keine, oben die größte Last.' },
      { short: 'Wachstum', anchor: 'shoulderR', side: 'r', status: 'single', text: 'Kabel und Kurzhantel ließen den seitlichen Delta gleich stark wachsen.', src: ['X1'],
        explain: '8 Wochen, ein Arm am Kabel, einer mit Kurzhantel, Sätze bis zum Versagen: Die Dicke des seitlichen Deltamuskels nahm in beiden Armen ähnlich zu (Ultraschall, Larsen et al. 2025).' },
      { short: 'Ebene', anchor: 'elbowR', side: 'r', status: 'single', text: 'Fällt die Seitenebene schwer, darf der Arm etwas nach vorn kommen.', src: ['X1'],
        explain: 'Wer die Frontalebene nicht halten konnte, durfte zwischen Frontal- und Schulterblattebene heben (Larsen et al. 2025).' }
    ],
    sources: {
      X1: { label: 'Larsen et al. 2025, Front Physiol', url: 'https://doi.org/10.3389/fphys.2025.1611468', read: 'fulltext' }
    }
  },

  // ---------- Aufrechtes Rudern (Frontansicht, v2.11) ----------
  {
    ref: 'barbell-upright-row', checkedAt: '2026-10-19', view: 'front', basis: 'convention',
    basisNote: 'Frontansicht. Keine Studie hat die Bewegung vermessen oder eine Endposition vorgegeben. Griff 100 % der Schulterbreite (eine der drei Griffbreiten bei McAllister et al. 2013, Abstract). Stange bis zur oberen Brust; daraus ergeben sich mit Arm- und Unterarmlänge der Figur ≈ 65° Abduktion der Ellbogen (berechnet, unter Schulterhöhe). Stange 2,2 m mit Scheiben Ø 45 cm: Konvention.',
    tempo: { basis: 'convention', note: '≈ 1,5 s hochziehen, 2 s senken (Konvention); keine Tempoangabe in den gelesenen Quellen.' },
    frames: [
      { label: 'Unten', pose: { armPoints: URR.start, legs: { hip: C(0), knee: C(4) }, props: uprightRowProps },
        facts: [V(100, 'M1', 'abstract', 'Griff 100 % der Schulterbreite (verglichen: 50, 100, 200 %)')] },
      { label: 'Oben', pose: { armPoints: URR.top, legs: { hip: C(0), knee: C(4) }, props: uprightRowProps },
        facts: [K(65, 'M1', 'Ellbogen-Abduktion aus Griffbreite und Stangenhöhe (Figur)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 1.5, label: 'Ziehen', kp: [1] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [2] }],
    keyPoints: [
      { short: 'Griff', anchor: 'bar', side: 'r', status: 'single', text: 'Breiterer Griff: mehr Delta- und Trapezaktivität, weniger Bizeps.', src: ['M1'],
        explain: 'McAllister et al. 2013 (16 Trainierte, 85 % 1RM): Griffe von 50, 100 und 200 % der Schulterbreite; mit breiterem Griff stieg die Aktivität von Deltamuskel und Trapez, die des Bizeps sank. EMG ist kein Maß für Muskelwachstum.' },
      { short: 'Höhe', anchor: 'elbowR', side: 'r', status: 'single', text: 'Die Ellbogen nicht über Schulterhöhe ziehen.', src: ['K2'],
        explain: 'Aufrechtes Rudern und Seitheben über 90° waren in einer Querschnittsstudie mit Zeichen eines Impingements verbunden (Kolber et al. 2014, 77 Männer). Das ist ein Zusammenhang, kein Beleg für eine Ursache; Verletzungsstudien gibt es nicht.' },
      { short: 'Senken', anchor: 'chest', side: 'l', status: 'single', text: 'Mit gleicher Last ändert die Griffbreite vor allem das Absenken.', src: ['M1'],
        explain: 'Die meisten Unterschiede zwischen den Griffbreiten fand McAllister et al. 2013 in der exzentrischen Phase (seitlicher Delta, oberer und mittlerer Trapez, Bizeps); beim Heben unterschieden sich nur seitlicher und hinterer Delta.' }
    ],
    sources: {
      M1: { label: 'McAllister et al. 2013, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e31824f23ad', read: 'abstract' },
      K2: { label: 'Kolber et al. 2014, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000000250', read: 'abstract' }
    }
  },

  // ---------- Schulterdrücken an der Maschine (v2.11) ----------
  {
    ref: 'machine-shoulder-press', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Keine Bewegungsstudie. Aufbau nach Kim et al. 2026 (Volltext, 31 Untrainierte, 40 % 1RM): Lehne 75° (Bezug nicht genannt, hier zur Waagerechten gelesen → Rumpf ≈ 15° zurück, berechnet), Knie ≈ 90°, Start mit Griffen auf Schulterhöhe und ≈ 90° gebeugten Ellbogen, Drücken bis zur vollen Streckung, Ellbogen seitlich in der Frontalebene. Die seitlichen Arme sind in der Seitenansicht verkürzt; Hebel, Drehpunkt und Säule sind Zeichenkonvention.',
    tempo: { basis: 'convention', note: '≈ 1,5 s drücken, 2 s ablassen (Konvention); bei Kim et al. 2026 frei gewählt.' },
    frames: [
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -98], trunk: K(-15, 'K1', 'Lehne 75°'), hip: C(75), knee: V(90, 'K1', 'protocol', 'Knie ≈ 90°'), foot: C(90, 'Füße flach'), armPoints: { elbow: [14, 36], wrist: [20, -8] }, props: machinePressProps },
        facts: [V(90, 'K1', 'protocol', 'Start: Ellbogen ≈ 90° gebeugt, Griffe auf Schulterhöhe')] },
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -98], trunk: K(-15, 'K1', 'Lehne 75°'), hip: C(75), knee: V(90, 'K1', 'protocol', 'Knie ≈ 90°'), foot: C(90, 'Füße flach'), armPoints: { elbow: [8, -50], wrist: [10, -102] }, props: machinePressProps },
        facts: [V(0, 'K1', 'protocol', 'volle Ellbogenstreckung')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [0, 1] }, { a: 0, b: 1, dur: 1.5, label: 'Drücken', kp: [2] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [2, 3] }, { a: 1, b: 0, dur: 2.0, label: 'Ablassen', kp: [1, 4] }],
    keyPoints: [
      { short: 'Lehne', anchor: 'back', side: 'l', status: 'single', text: 'Rücken bleibt an der Lehne; der Rumpf weicht nicht aus.', src: ['K1'],
        explain: 'Protokoll: Rumpf an der Lehne (75°), Ausweichbewegungen des Rumpfs wurden kontrolliert (Kim et al. 2026).' },
      { short: 'Start', anchor: 'hand', side: 'r', status: 'single', text: 'Griffe starten etwa auf Schulterhöhe, Ellbogen rund 90° gebeugt.', src: ['K1'],
        explain: 'Startposition bei Kim et al. 2026; zurück wurde jeweils bis auf Schulterhöhe abgelassen.' },
      { short: 'Oben', anchor: 'elbow', side: 'r', status: 'single', text: 'Hochdrücken bis die Arme gestreckt sind; Ellbogen bleiben seitlich.', src: ['K1'],
        explain: 'Bis zur vollen Ellbogenstreckung, die Ellbogen bewegten sich parallel zur Frontalebene (Kim et al. 2026). Der Deltamuskel war dabei aktiver als Trizeps und oberer Trapez.' },
      { short: 'Schulter', anchor: 'shoulder', side: 'l', status: 'single', text: 'Mittlerer Delta wie mit Hanteln, Rotatorenmanschette weniger gefordert.', src: ['R1'],
        explain: 'Reed et al. 2018 (Abstract, EMG mit Oberflächen- und Nadelelektroden): Der mittlere Deltamuskel war an der Schulterdrückmaschine gleich aktiv wie beim Seitheben mit Hanteln; Rotatorenmanschette und Teile des Trapez arbeiteten an der Maschine weniger.' },
      { short: 'Maschine', anchor: 'chest', side: 'l', status: 'single', text: 'Maschinen brachten im Training ähnliche Zuwächse wie freie Gewichte.', src: ['H1'],
        explain: 'Hernández-Belmonte et al. 2023 (38 Trainierte, 8 Wochen, Abstract): Kniebeuge, Bankdrücken, Rudern und Schulterdrücken an Maschinen oder mit Langhantel gaben ähnliche Kraft- und Muskelzuwächse ohne mehr Gelenkbeschwerden. Der Deltamuskel selbst wurde nicht vermessen.' }
    ],
    sources: {
      K1: { label: 'Kim et al. 2026, J Clin Med', url: 'https://doi.org/10.3390/jcm15103925', read: 'fulltext' },
      R1: { label: 'Reed et al. 2018, J Sci Med Sport', url: 'https://doi.org/10.1016/j.jsams.2017.07.024', read: 'abstract' },
      H1: { label: 'Hernández-Belmonte et al. 2023, Med Sci Sports Exerc', url: 'https://doi.org/10.1249/MSS.0000000000003271', read: 'abstract' }
    }
  },

  // ---------- Überkopf-Trizepsstrecken am Kabel (v2.12) ----------
  {
    ref: 'overhead-triceps-extension', checkedAt: '2026-10-19', view: 'side', basis: 'protocol',
    basisNote: 'Keine Bewegungsstudie. Aufbau nach Maeo et al. 2022 (Volltext, 21 Untrainierte, 12 Wochen): stehend, einarmig am Kabelzug, Schulter fest in 180° Beugung, Ellbogen 90° → 0°, Handfläche nach oben. Rücken zum Turm und gestreckte Hüfte und Knie nach Mir et al. 2025 (Volltext, Seil, Schulter 160–180°). Turmabstand, Rollenhöhe und Griff sind Zeichenkonvention; der freie Arm hängt.',
    tempo: { basis: 'protocol', note: '2 s strecken, 2 s beugen ohne Pause (Metronom 60/min, Maeo et al. 2022).' },
    frames: [
      { label: 'Gebeugt', pose: { shank: C(0), knee: V(0, 'X2', 'protocol', 'Knie nicht gebeugt'), hip: C(0), ankle: C(0), trunk: V(0, 'X2', 'protocol', 'aufrecht'), shoulder: V(180, 'X1', 'protocol', 'Schulter 180° gebeugt'), elbow: V(90, 'X1', 'protocol', 'Start bei 90° Beugung'), arm2: { shoulder: C(0, 'freier Arm hängt'), elbow: C(5) }, props: overheadCableProps } },
      { label: 'Gestreckt', pose: { shank: C(0), knee: V(0, 'X2', 'protocol', 'Knie nicht gebeugt'), hip: C(0), ankle: C(0), trunk: V(0, 'X2', 'protocol', 'aufrecht'), shoulder: V(180, 'X1', 'protocol', 'Schulter bleibt bei 180°'), elbow: V(0, 'X1', 'protocol', 'volle Streckung'), arm2: { shoulder: C(0, 'freier Arm hängt'), elbow: C(5) }, props: overheadCableProps },
        facts: [V(160, 'X2', 'fulltext', 'Mir et al. 2025: Schulter 160–180°, Ellbogen aus voller Beugung bis gestreckt')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Gebeugt', kp: [0, 2] }, { a: 0, b: 1, dur: 2.0, label: 'Strecken', kp: [1] }, { a: 1, b: 1, dur: 0.2, label: 'Gestreckt', kp: [1, 3] }, { a: 1, b: 0, dur: 2.0, label: 'Beugen', kp: [2, 4] }],
    keyPoints: [
      { short: 'Stand', anchor: 'back', side: 'l', status: 'consensus', text: 'Rücken zum Kabelzug, aufrecht stehen; Hüfte und Knie bleiben gestreckt.', src: ['X1', 'X2'],
        explain: 'Stehend am Kabelzug (Maeo et al. 2022); Rücken zur Maschine, Hüfte und Knie nicht beugen (Mir et al. 2025). Wie weit der Turm entfernt steht und wie hoch die Rolle sitzt, nannte keine der beiden Studien.' },
      { short: 'Oberarm', anchor: 'uarm', side: 'l', status: 'consensus', text: 'Oberarm zeigt senkrecht nach oben und bleibt dort; nur der Unterarm bewegt sich.', src: ['X1', 'X2'],
        explain: 'Schulter fest in 180° Beugung (Maeo et al. 2022) bzw. 160–180° (Mir et al. 2025). Ob der Oberarm wirklich ruhig blieb, wurde nicht gemessen.' },
      { short: 'Weg', anchor: 'elbow', side: 'r', status: 'contested', text: 'Ab etwa 90° Beugung (oder tiefer) bis zur vollen Streckung.', src: ['X1', 'X2'],
        explain: 'Umstritten, weil die Protokolle verschieden waren: 90° → 0° (Maeo et al. 2022) bzw. aus voller Beugung bis gestreckt (Mir et al. 2025, dort ohne Messung des Muskelwachstums). Ob ein tieferer Start mehr Wachstum bringt, ist nicht untersucht.' },
      { short: 'Wachstum', anchor: 'hand', side: 'r', status: 'single', text: 'Überkopf wuchs der Trizeps stärker als beim Strecken mit hängendem Arm.', src: ['X1'],
        explain: 'MRT nach 12 Wochen, Arm gegen Arm: langer Kopf +28,5 % gegenüber +19,6 %, ganzer Trizeps +19,9 % gegenüber +13,9 % (Maeo et al. 2022, 21 Untrainierte). Auch der seitliche und innere Kopf wuchsen mehr. Eine Einzelstudie.' },
      { short: 'Gewicht', anchor: 'chest', side: 'l', status: 'single', text: 'Das Gewicht ist überkopf deutlich niedriger als beim Trizepsdrücken.', src: ['X1', 'K3'],
        explain: 'Das Maximalgewicht lag überkopf 34–39 % niedriger (Maeo et al. 2022). Ein Grund: Der lange Kopf ist überkopf stark gedehnt; in einer Modellrechnung übernahm ab 90° Schulterhebung der innere Kopf den größten Teil der Kraft (Kholinne et al. 2018, ohne Last, 10 Personen).' }
    ],
    sources: {
      X1: { label: 'Maeo et al. 2022, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2022.2100279', read: 'fulltext' },
      X2: { label: 'Mir et al. 2025, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/s13102-025-01060-2', read: 'fulltext' },
      K3: { label: 'Kholinne et al. 2018, Acta Orthop Traumatol Turc', url: 'https://doi.org/10.1016/j.aott.2018.02.005', read: 'fulltext' }
    }
  },

  // ---------- Überkopf-Trizepsstrecken mit Kurzhantel (v2.12) ----------
  {
    ref: 'overhead-dumbbell-triceps-extension', checkedAt: '2026-10-19', view: 'side', basis: 'transfer',
    basisNote: 'Keine Bewegungs- oder Aufbaustudie mit Kurzhantel gelesen (Alves et al. 2017 nur als Abstract, ohne Winkel). Schulterstellung und Bewegungsweg sind von den Kabelprotokollen übertragen: Schulter 160–180° gebeugt, Ellbogen aus voller Beugung bis gestreckt (Mir et al. 2025, Volltext), 2 s / 2 s (Maeo et al. 2022, Volltext). Sitz mit Lehne, beidhändiger Griff an einer Hantel und tiefster Winkel (≈ 140°) sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: 'Übertragen vom Kabel: 2 s strecken, 2 s beugen (Maeo et al. 2022).' },
    frames: [
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -98], trunk: C(-5, 'Lehne fast senkrecht'), hip: C(95), knee: C(90), foot: C(90, 'Füße flach'), shoulder: K(170, 'X2', 'Mitte von 160–180°'), elbow: C(140, 'volle Beugung, Hantel hinter dem Kopf'), props: overheadDbProps } },
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -98], trunk: C(-5, 'Lehne fast senkrecht'), hip: C(95), knee: C(90), foot: C(90, 'Füße flach'), shoulder: K(170, 'X2', 'Mitte von 160–180°'), elbow: V(0, 'X2', 'protocol', 'volle Streckung'), props: overheadDbProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [1] }, { a: 0, b: 1, dur: 2.0, label: 'Strecken', kp: [0, 2] }, { a: 1, b: 1, dur: 0.2, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Absenken', kp: [1, 3] }],
    keyPoints: [
      { short: 'Oberarm', anchor: 'uarm', side: 'l', status: 'single', text: 'Oberarme zeigen nach oben neben dem Kopf und bleiben dort.', src: ['X2', 'X1'],
        explain: 'Übertragen vom Kabel: Schulter 160–180° (Mir et al. 2025) bzw. 180° gebeugt (Maeo et al. 2022). Für die Kurzhantel gibt es keine gelesene Vorgabe.' },
      { short: 'Tief', anchor: 'elbow', side: 'r', status: 'single', text: 'Hantel hinter dem Kopf kontrolliert tief absenken.', src: ['X2', 'K3'],
        explain: 'Volle Beugung als Start (Mir et al. 2025, Kabel). Der lange Kopf wird mit gehobener Schulter länger, ab etwa 135° Schulterhebung kaum noch (Kholinne et al. 2018, Modellrechnung). Wie tief am besten ist, wurde nicht verglichen.' },
      { short: 'Strecken', anchor: 'hand', side: 'r', status: 'single', text: 'Nach oben strecken, bis die Arme gestreckt sind.', src: ['X2', 'X1'],
        explain: 'Endpunkt beider Kabelprotokolle (0° Ellbogenbeugung).' },
      { short: 'Liegend', anchor: 'chest', side: 'l', status: 'single', text: 'Überkopf und im Liegen zeigte der Trizeps ein ähnliches EMG-Muster.', src: ['A1'],
        explain: 'Alves et al. 2017 (21 Trainierte, 40 % der isometrischen Maximalkraft, nur Abstract gelesen): langer und seitlicher Kopf gleich verteilt über den Bewegungsweg. Die Autoren raten, nicht beide Übungen in dieselbe Einheit zu legen. EMG ist kein Maß für Wachstum.' }
    ],
    sources: {
      X1: { label: 'Maeo et al. 2022, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2022.2100279', read: 'fulltext' },
      X2: { label: 'Mir et al. 2025, BMC Sports Sci Med Rehabil', url: 'https://doi.org/10.1186/s13102-025-01060-2', read: 'fulltext' },
      K3: { label: 'Kholinne et al. 2018, Acta Orthop Traumatol Turc', url: 'https://doi.org/10.1016/j.aott.2018.02.005', read: 'fulltext' },
      A1: { label: 'Alves et al. 2017, J Sports Med Phys Fitness', url: 'https://doi.org/10.23736/S0022-4707.17.06849-9', read: 'abstract' }
    }
  },

  // ---------- Skullcrusher (v2.12) ----------
  {
    ref: 'ez-bar-skullcrusher', checkedAt: '2026-10-19', view: 'side', basis: 'convention',
    basisNote: 'Keine Bewegungsstudie und kein gelesenes Protokoll mit Winkeln (Brandão et al. 2020 nur als Abstract). Rückenlage auf der Flachbank, Oberarm etwas zum Kopf geneigt (≈ 100° Schulterbeugung), Ellbogen 0° → ≈ 100° mit der Stange über der Stirn, SZ-Stange und Griffbreite sind Zeichenkonvention. Tempo nach Soncin et al. 2014 (Volltext).',
    tempo: { basis: 'protocol', note: '1 s strecken, 1 s beugen ohne Pause, voller Bewegungsweg (Metronom, Soncin et al. 2014, liegendes Trizepsstrecken).' },
    frames: [
      { label: 'Oben', pose: { ...BENCH_POSE(), shoulder: C(100, 'Oberarm leicht zum Kopf geneigt'), elbow: C(0, 'gestreckt'), props: skullProps } },
      { label: 'Unten', pose: { ...BENCH_POSE(), shoulder: C(100, 'Oberarm bleibt stehen'), elbow: C(100, 'Stange über der Stirn'), props: skullProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Senken', kp: [0, 1] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [1] }, { a: 1, b: 0, dur: 1.0, label: 'Strecken', kp: [2, 3] }],
    keyPoints: [
      { short: 'Tempo', anchor: 'elbow', side: 'r', status: 'single', text: 'Gleichmäßig über den ganzen Weg, etwa 1 s je Richtung.', src: ['S1'],
        explain: 'Protokoll von Soncin et al. 2014 (10 Trainierte, 8RM): 1 s strecken, 1 s beugen per Metronom, keine Pause, ganzer Bewegungsweg Pflicht. Andere Tempi wurden nicht verglichen.' },
      { short: 'Kopf', anchor: 'bar', side: 'r', status: 'single', text: 'Langer Kopf wuchs hier mehr als mit Bankdrücken allein.', src: ['B1'],
        explain: 'Brandão et al. 2020 (43 junge Männer, 10 Wochen, Abstract): Mit liegendem Langhantel-Trizepsstrecken wuchs der lange Kopf stärker als nur mit Bankdrücken, der seitliche Kopf dagegen mit Bankdrücken stärker.' },
      { short: 'Oberarm', anchor: 'uarm', side: 'l', status: 'single', text: 'Oberarme bleiben ruhig; nur die Unterarme bewegen sich.', src: ['K3'],
        explain: 'Bei gehobenem Oberarm (90° zum Rumpf, wie hier im Liegen) trug in einer Modellrechnung der innere Kopf den größten Teil der Kraft, der lange Kopf weniger (Kholinne et al. 2018, ohne Last, 10 Personen). Wie stark der Oberarm in der Praxis mitgeht, ist nicht gemessen.' },
      { short: 'Überkopf', anchor: 'chest', side: 'l', status: 'single', text: 'Im Liegen und überkopf zeigte der Trizeps ein ähnliches EMG-Muster.', src: ['A1'],
        explain: 'Alves et al. 2017 (21 Trainierte, Kurzhantel, Abstract): langer und seitlicher Kopf ähnlich verteilt über den Weg. Die Autoren raten, nicht beide Übungen in dieselbe Einheit zu legen. EMG ist kein Maß für Wachstum.' }
    ],
    sources: {
      S1: { label: 'Soncin et al. 2014, J Hum Kinet', url: 'https://doi.org/10.2478/hukin-2014-0127', read: 'fulltext' },
      B1: { label: 'Brandão et al. 2020, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003550', read: 'abstract' },
      K3: { label: 'Kholinne et al. 2018, Acta Orthop Traumatol Turc', url: 'https://doi.org/10.1016/j.aott.2018.02.005', read: 'fulltext' },
      A1: { label: 'Alves et al. 2017, J Sports Med Phys Fitness', url: 'https://doi.org/10.23736/S0022-4707.17.06849-9', read: 'abstract' }
    }
  },

  // ---------- Kurzhantel-Kickback (v2.12) ----------
  {
    ref: 'dumbbell-triceps-kickback', checkedAt: '2026-10-19', view: 'side', basis: 'convention',
    basisNote: 'Keine Bewegungsstudie und kein gelesenes Protokoll mit Winkeln (Serbest et al. 2025 nur als Abstract). Gezeichnet auf derselben Bank wie das einarmige Rudern: Knie und Hand der Gegenseite auf der Bank, Rumpf ≈ 20° über der Waagerechten, Oberarm waagerecht neben dem Rumpf, Ellbogen 90° → 0°. Alles Zeichenkonvention.',
    tempo: { basis: 'convention', note: '≈ 1,5 s strecken, 1,5 s beugen (Konvention); kein Tempo untersucht.' },
    frames: [
      { label: 'Gebeugt', pose: { ...ONE_ROW.pose, shoulder: C(-20, 'Oberarm waagerecht neben dem Rumpf'), elbow: C(90, 'Unterarm hängt senkrecht'), props: kickbackDbProps } },
      { label: 'Gestreckt', pose: { ...ONE_ROW.pose, shoulder: C(-20, 'Oberarm bleibt stehen'), elbow: C(0, 'gestreckt'), props: kickbackDbProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Gebeugt', kp: [0] }, { a: 0, b: 1, dur: 1.5, label: 'Strecken', kp: [0, 1] }, { a: 1, b: 1, dur: 0.3, label: 'Gestreckt', kp: [1] }, { a: 1, b: 0, dur: 1.5, label: 'Beugen', kp: [2] }],
    keyPoints: [
      { short: 'Oberarm', anchor: 'uarm', side: 'l', status: 'single', text: 'Oberarm bleibt neben dem Rumpf; nur der Unterarm streckt nach hinten.', src: ['K3'],
        explain: 'Mit dem Oberarm parallel zum Rumpf (wie bei 0° Schulterhebung) trug in einer Modellrechnung der lange Kopf den größten Teil der Kraft (Kholinne et al. 2018, ohne Last, 10 Personen). Für den Kickback selbst ist das nicht gemessen.' },
      { short: 'Gewicht', anchor: 'hand', side: 'r', status: 'single', text: 'Gewicht behutsam steigern; mehr Last brachte nicht im gleichen Maß mehr.', src: ['S1'],
        explain: 'Serbest et al. 2025 (14 Frauen, Bewegungsanalyse, Modell und EMG, Abstract): Mit schwereren Hanteln stieg die Trizepskontraktion nicht linear mit der Kraft.' },
      { short: 'Wachstum', anchor: 'chest', side: 'l', status: 'single', text: 'Strecken überkopf brachte mehr Wachstum als mit hängendem Arm.', src: ['X1'],
        explain: 'Übertrag: Maeo et al. 2022 verglichen Kabelstrecken mit dem Arm am Körper und überkopf (MRT, 12 Wochen); überkopf wuchs der Trizeps etwa 1,4-mal so stark. Der Kickback wurde nicht untersucht, seine Schulterstellung ähnelt aber der neutralen.' }
    ],
    sources: {
      K3: { label: 'Kholinne et al. 2018, Acta Orthop Traumatol Turc', url: 'https://doi.org/10.1016/j.aott.2018.02.005', read: 'fulltext' },
      S1: { label: 'Serbest et al. 2025, Phys Eng Sci Med', url: 'https://doi.org/10.1007/s13246-025-01672-5', read: 'abstract' },
      X1: { label: 'Maeo et al. 2022, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2022.2100279', read: 'fulltext' }
    }
  },

  // ---------- Bankdips (v2.12) ----------
  {
    ref: 'bench-dips', checkedAt: '2026-10-19', view: 'side', basis: 'measured', noFloor: false,
    basisNote: 'Schulterstreckung (88,1 ± 8,9°) und Rumpfneigung (12,6 ± 6,5°) am Tiefpunkt aus McKenzie et al. 2022 (3D, 13 geübte Männer, selbst gewählte Technik; Volltext). Der Ellbogenwinkel ist dort nur als Grafik ohne Zahl berichtet; gezeichnet sind die üblichen 90°. Oberer Punkt (Schulter 25° gestreckt, Ellbogen ≈ 10°), Bankhöhe (≈ 45 cm) und gestreckte Beine sind Konvention. Probe: Damit sinkt das Becken um ≈ 33 cm (gemessen 31,8 ± 8,6 cm).',
    tempo: { basis: 'measured', note: '2,17 ± 0,40 s je Wiederholung, Tiefpunkt bei 59 % (McKenzie et al. 2022): ≈ 1,3 s ab, ≈ 0,9 s hoch.' },
    frames: [
      { label: 'Oben', pose: { root: 'ankle', rootPos: BDIP.A, shank: C(BDIP.legTop.shank, 'aus der Geometrie: Ferse fest, Bein fast gestreckt'), knee: C(BDIP.legTop.knee, 'aus der Geometrie: Ferse fest'), trunk: C(BDIP.top.trunk, 'fast aufrecht'), foot: C(90, 'Ferse am Boden'), armWorld: BDIP.W, handFlat: 1, props: benchDipProps },
        facts: [V(-25, [], 'convention', 'Schulter oben ≈ 25° gestreckt, Ellbogen ≈ 10°')] },
      { label: 'Unten', pose: { root: 'ankle', rootPos: BDIP.A, shank: K(BDIP.legBottom.shank, 'M1', 'aus Schulter- und Rumpfwinkel bei fester Ferse'), knee: K(BDIP.legBottom.knee, 'M1', 'aus Schulter- und Rumpfwinkel bei fester Ferse'), trunk: V(12.6, 'M1', 'fulltext', '12,61 ± 6,49° Vorneigung'), foot: C(90, 'Ferse am Boden'), armWorld: BDIP.W, handFlat: 1, props: benchDipProps },
        facts: [V(88.1, 'M1', 'fulltext', 'Schulterstreckung 88,13 ± 8,86° = 101 % des Maximaltests'), V(90, [], 'convention', 'Ellbogen ≈ 90° (übliche Vorgabe; in der Studie weniger als beim Barrendip)'), V(BDIP.drop, 'M1', 'computed', 'Becken sinkt in der Zeichnung um ≈ 33 cm; gemessen 31,8 ± 8,6 cm')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Oben', kp: [3] }, { a: 0, b: 1, dur: 1.3, label: 'Absenken', kp: [0, 3] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [0, 1] }, { a: 1, b: 0, dur: 0.9, label: 'Hochdrücken', kp: [2] }],
    keyPoints: [
      { short: 'Schulter', anchor: 'shoulder', side: 'l', status: 'single', text: 'Hier wird die Schulter am weitesten nach hinten gestreckt, bis an die Grenze.', src: ['M1'],
        explain: 'Am Tiefpunkt 88 ± 9° Schulterstreckung, im Mittel 101 % des vorher gemessenen Maximums – mehr als beim Barren- (88 %) und Ringdip (69 %) (McKenzie et al. 2022, 13 geübte Männer, selbst gewählte Tiefe).' },
      { short: 'Tiefe', anchor: 'elbow', side: 'l', status: 'contested', text: 'Nur so tief, wie die Schulter es beschwerdefrei zulässt.', src: ['M1'],
        explain: 'Umstritten. Die Autoren raten, Bankdips nicht regelmäßig zu trainieren, weil die endgradige Streckung den vorderen Kapsel-Band-Apparat belasten könnte. Das ist eine Begründung aus der Mechanik, keine Verletzungsstatistik; Bankdips wurden nur mit vier Wiederholungen ohne Zusatzgewicht gemessen.' },
      { short: 'Trizeps', anchor: 'uarm', side: 'r', status: 'single', text: 'Der Trizeps arbeitete weniger als beim Barrendip, gemessen an der Last aber viel.', src: ['M1'],
        explain: 'Spitzen-EMG des seitlichen Trizepskopfs: 0,83 mV bei Bankdips, 1,04 mV am Barren, 1,05 mV an Ringen; Brust und vordere Schulter arbeiteten bei Bankdips deutlich weniger (McKenzie et al. 2022). Die Füße tragen einen Teil des Körpergewichts.' },
      { short: 'Rumpf', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper bleibt fast aufrecht und nah an der Bank.', src: ['M1'],
        explain: 'Rumpfneigung am Tiefpunkt 12,6 ± 6,5°, deutlich weniger als am Barren und an Ringen (McKenzie et al. 2022). Weil der Rumpf kaum kippt, entsteht die Tiefe vor allem aus der Schulterstreckung.' }
    ],
    sources: {
      M1: { label: 'McKenzie et al. 2022, Int J Environ Res Public Health (Bank-, Barren-, Ringdips)', url: 'https://doi.org/10.3390/ijerph192013211', read: 'fulltext' }
    }
  },

  // ---------- Dip-Maschine (v2.12) ----------
  {
    ref: 'machine-triceps-dip', checkedAt: '2026-10-19', view: 'side', basis: 'convention',
    basisNote: 'Keine Studie zur sitzenden Dip-Maschine gefunden. Sitz, Griffe neben dem Körper, Start mit ≈ 95° gebeugten Ellbogen und Oberarm ≈ 35° hinter dem Rumpf, Ende fast gestreckt (≈ 20°) mit den Griffen neben der Hüfte, Hebel mit Drehpunkt hinter der Figur: alles Zeichenkonvention.',
    tempo: { basis: 'convention', note: '≈ 1,5 s drücken, 2 s zurück (Konvention).' },
    frames: [
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, -98], trunk: C(0, 'aufrecht an der Lehne'), hip: C(90), knee: C(90), foot: C(90, 'Füße flach'), shoulder: C(-35, 'Oberarm hinter dem Rumpf'), elbow: C(95, 'Griffe etwa auf Brusthöhe'), props: dipMachineProps } },
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, -98], trunk: C(0, 'aufrecht an der Lehne'), hip: C(90), knee: C(90), foot: C(90, 'Füße flach'), shoulder: C(-15, 'Arm neben dem Körper'), elbow: C(20, 'fast gestreckt, Griffe neben der Hüfte'), props: dipMachineProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 1.5, label: 'Drücken', kp: [1] }, { a: 1, b: 1, dur: 0.2, label: 'Unten', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [0, 2] }],
    keyPoints: [
      { short: 'Gerät', anchor: 'hand', side: 'r', status: 'single', text: 'Die Maschine selbst ist nicht untersucht; Aussagen stammen von freien Dips.', src: ['M1'],
        explain: 'Bei Bank-, Barren- und Ringdips arbeiten Trizeps, Brust und vordere Schulter (McKenzie et al. 2022). Die Autoren nennen die Dip-Maschine nur als Hilfe beim Erlernen des Barrendips – gemeint ist dort die unterstützte Variante, nicht die sitzende.' },
      { short: 'Oberarm', anchor: 'uarm', side: 'l', status: 'single', text: 'Mit dem Oberarm nah am Rumpf trägt der lange Trizepskopf viel.', src: ['K3'],
        explain: 'Bei hängendem Oberarm (0° Schulterhebung) leistete der lange Kopf in einer Modellrechnung den größten Teil der Kraft (Kholinne et al. 2018, ohne Last, 10 Personen). Übertragen, an der Maschine nicht gemessen.' },
      { short: 'Maschine', anchor: 'chest', side: 'l', status: 'single', text: 'Maschinen brachten in einer Studie ähnliche Zuwächse wie freie Gewichte.', src: ['H1'],
        explain: 'Hernández-Belmonte et al. 2023 (38 Trainierte, 8 Wochen, Abstract): Kniebeuge, Bankdrücken, Rudern und Schulterdrücken an Maschinen oder frei gaben ähnliche Kraft- und Muskelzuwächse. Eine Dip-Maschine war nicht dabei.' }
    ],
    sources: {
      M1: { label: 'McKenzie et al. 2022, Int J Environ Res Public Health (Bank-, Barren-, Ringdips)', url: 'https://doi.org/10.3390/ijerph192013211', read: 'fulltext' },
      K3: { label: 'Kholinne et al. 2018, Acta Orthop Traumatol Turc', url: 'https://doi.org/10.1016/j.aott.2018.02.005', read: 'fulltext' },
      H1: { label: 'Hernández-Belmonte et al. 2023, Med Sci Sports Exerc', url: 'https://doi.org/10.1249/MSS.0000000000003271', read: 'abstract' }
    }
  },

  // ---------- Kurzhantel-Fliegende (v2.12) ----------
  {
    ref: 'dumbbell-fly', checkedAt: '2026-10-19', view: 'front', basis: 'protocol', noFloor: true,
    basisNote: 'Blick von oben auf die Flachbank (Kopf links), weil sich die Arme quer zur Seitenansicht bewegen; senkrechte Arme erscheinen dabei stark verkürzt. Aufbau nach Bergquist et al. 2018 (Volltext, 29 Personen, 10RM): Rückenlage, Start mit senkrechten Armen, Ellbogen durchgehend leicht gebeugt, Hanteln im Bogen zur Seite senken, bis die Oberarme waagerecht sind. Beine auf der Bank, Ellbogenwinkel (≈ 15°) und Hantelgröße sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: '2 s senken, 2 s heben (Metronom 60/min, Bergquist et al. 2018); Campos et al. 2020: 2 s senken, 1 s heben, ohne Pause.' },
    frames: [
      { label: 'Oben', pose: { rotate: -90, rootPos: [0, -200], legs: { hip: C(0, 'Beine auf der Bank'), knee: C(0) }, armPoints: armFront(90, 18, 15), props: flyDbProps },
        facts: [V(90, 'B1', 'protocol', 'Start: Arme senkrecht nach oben, Ellbogen leicht gebeugt')] },
      { label: 'Senken', pose: { rotate: -90, rootPos: [0, -200], legs: { hip: C(0), knee: C(0) }, armPoints: armFront(90, 42, 15), props: flyDbProps } }, // Zwischenbilder: Bogen im Raum, nicht linear in der Projektion
      { label: 'Senken', pose: { rotate: -90, rootPos: [0, -200], legs: { hip: C(0), knee: C(0) }, armPoints: armFront(90, 66, 15), props: flyDbProps } },
      { label: 'Unten', pose: { rotate: -90, rootPos: [0, -200], legs: { hip: C(0, 'Beine auf der Bank'), knee: C(0) }, armPoints: armFront(90, 90, 15), props: flyDbProps },
        facts: [V(0, 'B1', 'protocol', 'Ende: Oberarme waagerecht (parallel zum Boden)'), V(45, 'C2', 'fulltext', 'Campos et al. 2020: bis etwa 45° unter die Rumpflinie')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 0.67, label: 'Senken', kp: [0, 1] }, { a: 1, b: 2, dur: 0.67, label: 'Senken', kp: [0, 1] }, { a: 2, b: 3, dur: 0.66, label: 'Senken', kp: [0, 1] }, { a: 3, b: 3, dur: 0.15, label: 'Unten', kp: [1, 2] }, { a: 3, b: 2, dur: 0.66, label: 'Heben', kp: [2, 3] }, { a: 2, b: 1, dur: 0.67, label: 'Heben', kp: [2, 3] }, { a: 1, b: 0, dur: 0.67, label: 'Heben', kp: [2, 3] }],
    keyPoints: [
      { short: 'Ellbogen', anchor: 'elbow', side: 'r', status: 'consensus', text: 'Ellbogen leicht gebeugt und über die ganze Bewegung gleich lassen.', src: ['B1', 'C2'],
        explain: 'Ellbogen durchgehend leicht gebeugt (Bergquist et al. 2018) bzw. gestreckt (Campos et al. 2020). Der Winkel wurde in keiner der gelesenen Studien gemessen.' },
      { short: 'Tiefe', anchor: 'hand', side: 'r', status: 'contested', text: 'Senken, bis die Oberarme etwa waagerecht sind; tiefer ist nicht belegt besser.', src: ['B1', 'C2'],
        explain: 'Umstritten, weil die Protokolle verschieden tief gingen: bis die Oberarme parallel zum Boden sind (Bergquist et al. 2018) oder bis etwa 45° unter die Rumpflinie (Campos et al. 2020). Verglichen wurden die Tiefen nicht.' },
      { short: 'Unten', anchor: 'uarm', side: 'l', status: 'single', text: 'Am schwersten ist der Anfang des Hebens; danach sinkt die Brustaktivität.', src: ['B1'],
        explain: 'Mit Hanteln war die Brustaktivität in der ersten Hälfte des Hebens am höchsten und fiel nach dem schwersten Punkt deutlich ab, weil der Hebelarm unten am längsten ist (Bergquist et al. 2018, EMG, 29 Personen).' },
      { short: 'Vergleich', anchor: 'chest', side: 'l', status: 'single', text: 'Bankdrücken aktivierte Brust, Schulter und Trizeps stärker; Fliegende mehr den Bizeps.', src: ['S1', 'C2'],
        explain: 'Solstad et al. 2020 (17 Trainierte, 6RM, Abstract): Brust, vordere Schulter und Trizeps beim Bankdrücken 8–81 % höher, Bizeps bei Fliegenden 57–86 % höher. Vordere Schulter bei Fliegenden ≈ 19 % der Maximalaktivität, seitliche und hintere kaum (Campos et al. 2020). EMG ist kein Maß für Wachstum.' }
    ],
    sources: {
      B1: { label: 'Bergquist et al. 2018, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0137', read: 'fulltext' },
      C2: { label: 'Campos et al. 2020, J Hum Kinet', url: 'https://doi.org/10.2478/hukin-2020-0033', read: 'fulltext' },
      S1: { label: 'Solstad et al. 2020, J Sports Sci Med', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7675616/', read: 'abstract' }
    }
  },

  // ---------- Kabel-Crossover (v2.12) ----------
  {
    ref: 'cable-crossover', checkedAt: '2026-10-19', view: 'front', basis: 'transfer',
    basisNote: 'Keine Studie zum Kabel-Crossover gefunden. Haltung übertragen vom stehenden Fliegen mit Gummiband bei Bergquist et al. 2018 (Volltext): ein Fuß vorn, Oberkörper leicht vorgeneigt, Ellbogen durchgehend leicht gebeugt, 2 s / 2 s. Hohe Rollen (≈ 1,6 m), Turmabstand, Rumpfneigung (≈ 15°) und Endpunkt mit gekreuzten Händen vor dem Bauch sind Zeichenkonvention; der Ausfallschritt ist von vorn nicht zu sehen.',
    tempo: { basis: 'protocol', note: 'Übertragen: 2 s zusammenführen, 2 s zurück (Metronom 60/min, Bergquist et al. 2018, Band).' },
    frames: [
      { label: 'Außen', pose: { legs: { planted: true, stance: C(22), toeOut: C(8), knee: C(12, 'leicht gebeugt'), shank: C(6) }, trunkFlex: V(15, 'B1', 'protocol', 'leicht vorgeneigt (kein Winkel genannt)'), armPoints: armFront(120, 75, 15), props: crossoverProps(true) } },
      { label: 'Zusammen', pose: { legs: { planted: true, stance: C(22), toeOut: C(8), knee: C(12), shank: C(6) }, trunkFlex: C(15), armPoints: armFront(85, 35, 15), props: crossoverProps(true) } }, // Zwischenbild: Bogen im Raum
      { label: 'Vorn', pose: { legs: { planted: true, stance: C(22), toeOut: C(8), knee: C(12), shank: C(6) }, trunkFlex: V(15, 'B1', 'protocol', 'leicht vorgeneigt'), armPoints: armFront(50, -15, 15), props: crossoverProps(true) } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Außen', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Zusammen', kp: [1, 3] }, { a: 1, b: 2, dur: 1.0, label: 'Zusammen', kp: [1, 3] }, { a: 2, b: 2, dur: 0.3, label: 'Vorn', kp: [2] }, { a: 2, b: 1, dur: 1.0, label: 'Zurück', kp: [1, 3] }, { a: 1, b: 0, dur: 1.0, label: 'Zurück', kp: [1, 3] }],
    keyPoints: [
      { short: 'Stand', anchor: 'belly', side: 'l', status: 'single', text: 'Ein Fuß vorn, Oberkörper leicht nach vorn geneigt.', src: ['B1'],
        explain: 'Übertragen vom stehenden Fliegen mit Gummiband (Bergquist et al. 2018): nicht dominanter Fuß vorn, Oberkörper leicht vorgeneigt zur Balance. Am Kabelturm wurde das nicht untersucht.' },
      { short: 'Ellbogen', anchor: 'elbow', side: 'r', status: 'single', text: 'Ellbogen leicht gebeugt lassen; die Arme bewegen sich im Bogen.', src: ['B1'],
        explain: 'Leicht gebeugte Ellbogen über die ganze Bewegung (Bergquist et al. 2018, Band und Hanteln). Ein Winkel wurde nicht genannt.' },
      { short: 'Kabel', anchor: 'chest', side: 'l', status: 'single', text: 'Mit Zugwiderstand arbeitete die vordere Schulter mehr, die Brust etwas weniger.', src: ['B1'],
        explain: 'Stehend mit Band gegenüber liegend mit Hanteln: Brust etwas weniger, vordere Schulter deutlich mehr aktiv (Bergquist et al. 2018, 29 Personen, 10RM). Ein Kabel wurde nicht gemessen; Rollenhöhe und Zugrichtung sind nicht untersucht.' },
      { short: 'Tempo', anchor: 'hand', side: 'r', status: 'single', text: 'Gleichmäßig: etwa 2 s zusammen, 2 s zurück.', src: ['B1'],
        explain: 'Metronom 60/min im Protokoll von Bergquist et al. 2018. Andere Tempi wurden nicht verglichen.' }
    ],
    sources: {
      B1: { label: 'Bergquist et al. 2018, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0137', read: 'fulltext' }
    }
  },

  // ---------- Kabelzug von unten nach oben (v2.12) ----------
  {
    ref: 'low-to-high-cable-fly', checkedAt: '2026-10-19', view: 'front', basis: 'convention',
    basisNote: 'Keine Studie zu Kabelfliegenden von unten gefunden. Untere Rollen (≈ 20 cm), Start mit tiefen, seitlich gestreckten Armen, Ende mit den Händen vor der oberen Brust, leicht gebeugte Ellbogen und aufrechter Stand sind Zeichenkonvention; Ellbogen und Tempo wie beim Band-Fliegen von Bergquist et al. 2018 (Volltext).',
    tempo: { basis: 'protocol', note: 'Übertragen: 2 s heben, 2 s senken (Metronom 60/min, Bergquist et al. 2018, Band).' },
    frames: [
      { label: 'Unten', pose: { legs: { planted: true, stance: C(22), toeOut: C(8), knee: C(10), shank: C(5) }, armPoints: armFront(40, 70, 15), props: crossoverProps(false) } },
      { label: 'Heben', pose: { legs: { planted: true, stance: C(22), toeOut: C(8), knee: C(10), shank: C(5) }, armPoints: armFront(70, 35, 15), props: crossoverProps(false) } }, // Zwischenbild: Bogen im Raum
      { label: 'Oben', pose: { legs: { planted: true, stance: C(22), toeOut: C(8), knee: C(10), shank: C(5) }, armPoints: armFront(85, -12, 15), props: crossoverProps(false) } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Unten', kp: [1] }, { a: 0, b: 1, dur: 1.0, label: 'Heben', kp: [0, 1] }, { a: 1, b: 2, dur: 1.0, label: 'Heben', kp: [0, 1] }, { a: 2, b: 2, dur: 0.3, label: 'Oben', kp: [0] }, { a: 2, b: 1, dur: 1.0, label: 'Senken', kp: [2] }, { a: 1, b: 0, dur: 1.0, label: 'Senken', kp: [2] }],
    keyPoints: [
      { short: 'Brust', anchor: 'chest', side: 'l', status: 'contested', text: 'Der obere Brustanteil hebt den Arm nach vorn; mehr Aktivität ist nicht gemessen.', src: ['A1', 'R1'],
        explain: 'Umstritten. Anatomisch beugt der Schlüsselbeinanteil des großen Brustmuskels den Arm nach vorn (StatPearls). Am Kabel wurde das nicht gemessen; beim Bankdrücken war der obere Brustmuskel bei 30° Schräge am aktivsten (Rodríguez-Ridao et al. 2020, Abstract).' },
      { short: 'Ellbogen', anchor: 'elbow', side: 'r', status: 'single', text: 'Ellbogen leicht gebeugt lassen und die Arme im Bogen führen.', src: ['B1'],
        explain: 'Leicht gebeugte Ellbogen über die ganze Bewegung, übertragen vom Fliegen mit Band und Hanteln (Bergquist et al. 2018).' },
      { short: 'Tempo', anchor: 'hand', side: 'r', status: 'single', text: 'Gleichmäßig: etwa 2 s heben, 2 s senken.', src: ['B1'],
        explain: 'Metronom 60/min im Protokoll von Bergquist et al. 2018 (Band). Für das Kabel von unten gibt es kein Protokoll.' }
    ],
    sources: {
      A1: { label: 'Solari & Burns 2023, StatPearls: Pectoralis Major', url: 'https://www.ncbi.nlm.nih.gov/books/NBK525991/', read: 'summary' },
      R1: { label: 'Rodríguez-Ridao et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17197339', read: 'abstract' },
      B1: { label: 'Bergquist et al. 2018, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0137', read: 'fulltext' }
    }
  },

  // ---------- Butterfly (v2.12) ----------
  {
    ref: 'pec-deck', checkedAt: '2026-10-19', view: 'front', basis: 'convention',
    basisNote: 'Keine Bewegungsstudie. Gezeichnet ist die Variante mit Armpolstern: aufrecht an der Lehne, Oberarme etwa waagerecht zur Seite, Ellbogen 90° gebeugt, Unterarme senkrecht an den Polstern; Weg von seitlich bis die Oberarme nach vorn zeigen. Diese Haltung beschreibt Marchetti et al. 2019 (isometrisch, 10 Trainierte; nur als automatische Zusammenfassung des PDFs gelesen). Maschine wie beim Reverse Butterfly, Tempo und Sitzhöhe sind Zeichenkonvention. Vorn zeigende Oberarme erscheinen von vorn stark verkürzt.',
    tempo: { basis: 'convention', note: '≈ 2 s zusammenführen, 2 s zurück (Konvention).' },
    frames: [
      { label: 'Außen', pose: { rootPos: [0, RPD.seat], legs: { hip: C(85, 'sitzend'), knee: C(85) }, armPoints: { elbow: [68, 6], wrist: [68, -48] }, props: pecDeckProps },
        facts: [V(90, 'M1', 'summary', 'Oberarme 90° abgespreizt, Ellbogen 90° gebeugt, auf Schulterhöhe')] },
      { label: 'Vorn', pose: { rootPos: [0, RPD.seat], legs: { hip: C(85, 'sitzend'), knee: C(85) }, armPoints: { elbow: [4, 6], wrist: [4, -48] }, props: pecDeckProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Außen', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Zusammen', kp: [0] }, { a: 1, b: 1, dur: 0.3, label: 'Vorn', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [1, 3] }],
    keyPoints: [
      { short: 'Arme', anchor: 'uarm', side: 'l', status: 'single', text: 'Oberarme etwa auf Schulterhöhe, Ellbogen rund 90° gebeugt am Polster.', src: ['M1'],
        explain: 'Haltung bei Marchetti et al. 2019: Rumpf an der Lehne, Schultern 90° abgespreizt, Ellbogen und Handgelenk auf Schulterhöhe, Ellbogen 90° gebeugt. Nur als automatische Zusammenfassung des PDFs gelesen.' },
      { short: 'Offen', anchor: 'hand', side: 'r', status: 'single', text: 'Weit geöffnet war die Brust aktiver als in der Mitte des Wegs.', src: ['M1'],
        explain: 'Isometrische Maximalversuche (Marchetti et al. 2019, 10 Trainierte): in der weit geöffneten Stellung (90°) war der große Brustmuskel deutlich aktiver als bei 45°. Das ist eine Haltemessung, keine Bewegung. Nur als automatische Zusammenfassung gelesen.' },
      { short: 'Sätze', anchor: 'chest', side: 'l', status: 'single', text: 'Ein Satz brachte bei Einsteigern ähnlich viel Wachstum wie drei.', src: ['P1'],
        explain: 'Pinto et al. 2025 (15 untrainierte Männer, 12 Wochen, Arm gegen Arm, Abstract): Brustdicke oben +17 % / +18 %, unten +21 % / +21 %, Maximalkraft +46 % / +43 % mit einem bzw. drei Sätzen. Für Trainierte nicht geprüft.' },
      { short: 'Region', anchor: 'belly', side: 'l', status: 'single', text: 'Oberer und unterer Brustanteil wuchsen am Butterfly ähnlich.', src: ['P1'],
        explain: 'Ultraschall nach 12 Wochen: Schlüsselbein- und Brustbeinanteil nahmen ähnlich zu; die Autoren sehen keinen Hinweis auf gezieltes Wachstum einzelner Bereiche (Pinto et al. 2025, Abstract).' }
    ],
    sources: {
      M1: { label: 'Marchetti et al. 2019, Rev Bras Pesq Ciênc Saúde', url: 'https://revistas.icesp.br/index.php/RBPeCS/article/view/733', read: 'summary' },
      P1: { label: 'Pinto et al. 2025, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000005045', read: 'abstract' }
    }
  },

  // ========== Runde 10 (v2.13): Bauch am Boden ==========
  // ---------- Crunch (Boden) ----------
  {
    ref: 'floor-crunch', checkedAt: '2026-10-20', view: 'side', basis: 'protocol',
    basisNote: 'Keine gelesene Studie hat den Crunch mit Bewegungsmessung des Rumpfs erfasst. Start und Ende folgen den Protokollen von Escamilla et al. 2006, Youdas et al. 2008, Barbado et al. 2015 und Lee et al. 2016 (alle Volltext): Rückenlage, Knie etwa 90°, Füße auf dem Boden; einrollen, bis die Schulterblätter von der Matte abheben. Wie weit sich der Rumpf dabei beugt, ist nicht gemessen: Die Beugung ist so gelöst, dass der untere Schulterblattrand ≈ 4 cm abhebt, und verteilt sich in der Zeichnung auf die untere Brust- und Lendenwirbelsäule (Zeichenkonvention). Die Hüfte ist so gelöst, dass der Fuß flach steht (Protokoll ≈ 45°). Matte, Kopfhaltung und Ellbogen sind Konvention.',
    tempo: { basis: 'protocol', note: '1 s hoch, 1 s halten, 1 s ab, 1 s Pause (Metronom; Escamilla et al. 2006, ähnlich Youdas et al. 2008).' },
    frames: [
      { label: 'Unten', pose: { root: 'hip', rootPos: [0, FLOOR.hipY], trunk: C(FLOOR.lie, 'Rückenlage; Gesäß und Schulterblätter liegen auf'), curl: C(0), hip: K(FLOOR.hookHip, 'E1', 'so gelöst, dass der Fuß flach steht (Protokoll ≈ 45°)'), knee: V(90, ['E1', 'Y1', 'B1'], 'protocol', 'Knie etwa 90°'), foot: C(90, 'Fuß flach'), headTilt: C(0), armTargetTrunk: [-2, 38], armScale: [0.35, 0.7], elbowSide: 1, props: matProps } },
      { label: 'Oben', pose: { root: 'hip', rootPos: [0, FLOOR.hipY], trunk: C(FLOOR.lie, 'Becken bleibt liegen'), curl: K(FLOOR.crunchCurl, ['E1', 'Y1', 'B1'], 'so gelöst, dass der untere Schulterblattrand ≈ 4 cm von der Ausgangslage abhebt'), hip: K(FLOOR.hookHip, 'E1'), knee: V(90, ['E1', 'Y1', 'B1'], 'protocol'), foot: C(90), headTilt: C(10, 'Kinn leicht zur Brust'), armTargetTrunk: [-2, 38], armScale: [0.35, 0.7], elbowSide: 1, props: matProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 1.0, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Einrollen', kp: [1, 3] }, { a: 1, b: 1, dur: 1.0, label: 'Oben', kp: [1, 2] }, { a: 1, b: 0, dur: 1.0, label: 'Ablegen', kp: [2, 4] }],
    keyPoints: [
      { short: 'Start', anchor: 'foot', side: 'r', status: 'consensus', text: 'Rückenlage, Füße flach auf dem Boden, Knie etwa 90° gebeugt.', src: ['E1', 'Y1', 'B1', 'L1'],
        explain: 'So beginnen alle vier gelesenen Protokolle (Escamilla et al. 2006, Youdas et al. 2008, Barbado et al. 2015, Lee et al. 2016). Die Hüfte ist dort etwa 45° gebeugt. Die Hände lagen je nach Studie an den Ohren, gekreuzt vor der Brust oder neben dem Körper.' },
      { short: 'Schulter', anchor: 'upperBack', side: 'l', status: 'consensus', text: 'Oberkörper einrollen, bis die Schulterblätter von der Matte abheben.', src: ['E1', 'Y1', 'B1', 'L1'],
        explain: 'Das ist in allen gelesenen Protokollen der obere Umkehrpunkt. Ein Winkel ist dafür nicht gemessen. Ob ein höheres Aufrichten mehr bringt, ist offen.' },
      { short: 'Lende', anchor: 'lowBack', side: 'l', status: 'single', text: 'Die Lendenwirbelsäule bleibt auf der Matte; nur der obere Rücken rollt ein.', src: ['B1', 'H1'],
        explain: 'Barbado et al. 2015 beschreiben den Crunch mit aufliegender Lendenregion. Halpern & Bleck 1979 (Abstract) maßen beim Anheben bis zu den Schulterblättern ≈ 3° Lendenbeugung, beim vollen Sit-up ≈ 38°.' },
      { short: 'Nacken', anchor: 'chin', side: 'l', status: 'single', text: 'Kinn leicht eingezogen; den Kopf nicht mit den Händen nach vorn ziehen.', src: ['L1'],
        explain: 'Lee et al. 2016 (13 Männer, EMG): Wurde die Nackenbeugung begrenzt (Kinn eingezogen, Hand leicht am Kiefer), war der Kopfwender weniger und der gerade und schräge Bauchmuskel mehr aktiv. Winkel wurden nicht gemessen.' },
      { short: 'Tempo', anchor: 'belly', side: 'r', status: 'single', text: 'Gleichmäßig: etwa 1 s hoch, 1 s halten, 1 s ab.', src: ['E1', 'B1'],
        explain: 'Takt der Protokolle von Escamilla et al. 2006 und Youdas et al. 2008. Barbado et al. 2015 (17 Aktive) testeten 1 Wiederholung je 4 s bis je 1 s: auch schnell blieb die Bahn seitlich gleich stabil, die Ausgleichsbewegungen am Boden nahmen aber zu.' }
    ],
    sources: {
      E1: { label: 'Escamilla et al. 2006, Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/16649890/', read: 'fulltext' },
      Y1: { label: 'Youdas et al. 2008, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e31818745bf', read: 'fulltext' },
      B1: { label: 'Barbado et al. 2015, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2015-0031', read: 'fulltext' },
      L1: { label: 'Lee et al. 2016, J Phys Ther Sci', url: 'https://doi.org/10.1589/jpts.28.90', read: 'fulltext' },
      H1: { label: 'Halpern & Bleck 1979, Clin Orthop Relat Res', url: 'https://pubmed.ncbi.nlm.nih.gov/161217/', read: 'abstract' }
    }
  },

  // ---------- Sit-up ----------
  {
    ref: 'sit-up', checkedAt: '2026-10-20', view: 'side', basis: 'protocol',
    basisNote: 'Keine im Volltext gelesene Bewegungsmessung. Start und Ende folgen dem Protokoll von Escamilla et al. 2006 (Volltext): Knie etwa 90°, Füße fixiert, Hände an den Ohren; Rumpf und Hüfte beugen, bis die Ellbogen auf Höhe der Knie sind. Die Reihenfolge – erst einrollen, dann aus der Hüfte aufrichten – folgt Cordo et al. 2003 (Abstract, gestreckte Beine). Wie weit sich der Rumpf oben aufrichtet und beugt (oberer Rumpf ≈ 15° über die Senkrechte, davon 20° Rumpfbeugung), Fußhalter und Matte sind Konvention. Die Negativ-Variante auf der Schrägbank ist nicht gezeichnet: keine Studie mit Bankwinkel gefunden.',
    tempo: { basis: 'protocol', note: 'Protokoll: 1 s hoch, 1 s halten, 1 s ab (Metronom, Escamilla et al. 2006). Gezeichnet langsamer (≈ 2 s je Richtung, erst einrollen, dann ohne Stopp aufrichten), damit die Folge sichtbar bleibt.' },
    frames: [
      { label: 'Unten', pose: { root: 'ankle', rootPos: SITUP_ROOT.ank, shank: K(SITUP_ROOT.at(FLOOR.lie, 0), 'E1', 'Unterschenkel bleibt (Füße fixiert)'), knee: V(90, 'E1', 'protocol', 'Knie etwa 90°'), foot: C(90), trunk: C(FLOOR.lie, 'Rückenlage; Gesäß und Schulterblätter liegen auf'), curl: C(0), headTilt: C(0), armTargetTrunk: [-2, 38], armScale: [0.35, 0.7], elbowSide: 1, props: situpProps } },
      { label: 'Eingerollt', pose: { root: 'ankle', rootPos: SITUP_ROOT.ank, shank: K(SITUP_ROOT.at(FLOOR.lie, SITUP.curlTop), 'E1'), knee: V(90, 'E1', 'protocol'), foot: C(90), trunk: C(FLOOR.lie, 'Becken liegt noch'), curl: C(SITUP.curlTop, 'oberer Rumpf eingerollt (Cordo et al. 2003: zuerst Nacken und oberer Rumpf)'), headTilt: C(10), armTargetTrunk: [-2, 38], armScale: [0.35, 0.7], elbowSide: 1, props: situpProps } },
      { label: 'Aufrichten', pose: { root: 'ankle', rootPos: SITUP_ROOT.ank, shank: K(SITUP_ROOT.at(SITUP_ROOT.midTrunk, SITUP.curlTop), 'E1'), knee: V(90, 'E1', 'protocol'), foot: C(90), trunk: C(SITUP_ROOT.midTrunk, 'Zwischenbild: Mitte zwischen Liegen und Oben'), curl: C(SITUP.curlTop), headTilt: C(10), armTargetTrunk: [-2, 38], armScale: [0.35, 0.7], elbowSide: 1, props: situpProps } },
      { label: 'Oben', pose: { root: 'ankle', rootPos: SITUP_ROOT.ank, shank: K(SITUP_ROOT.at(SITUP.trunkTop, SITUP.curlTop), 'E1'), knee: V(90, 'E1', 'protocol'), foot: C(90), trunk: C(SITUP.trunkTop, 'oberer Rumpf ≈ 15° über die Senkrechte, Ellbogen etwa auf Kniehöhe'), curl: C(SITUP.curlTop), headTilt: C(10), armTargetTrunk: [-2, 38], armScale: [0.35, 0.7], elbowSide: 1, props: situpProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.6, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 0.5, label: 'Einrollen', kp: [1], ease: 'in' }, { a: 1, b: 2, dur: 0.6, label: 'Aufrichten', kp: [1, 2], ease: 'none' }, { a: 2, b: 3, dur: 0.94, label: 'Aufrichten', kp: [1, 2], ease: 'out' }, { a: 3, b: 3, dur: 1.0, label: 'Oben', kp: [2, 3] }, { a: 3, b: 2, dur: 0.94, label: 'Ablegen', kp: [1], ease: 'in' }, { a: 2, b: 1, dur: 0.6, label: 'Ablegen', kp: [1], ease: 'none' }, { a: 1, b: 0, dur: 0.5, label: 'Ablegen', kp: [1], ease: 'out' }],
    keyPoints: [
      { short: 'Start', anchor: 'foot', side: 'r', status: 'single', text: 'Knie etwa 90° gebeugt, Füße fixiert, Hände an den Ohren.', src: ['E1'],
        explain: 'Protokoll von Escamilla et al. 2006 (21 Gesunde): Daumen in den Ohren, Hände locker am Kopf, Knie ≈ 90°, Hüfte ≈ 45°, Füße gehalten.' },
      { short: 'Folge', anchor: 'upperBack', side: 'l', status: 'single', text: 'Erst Kopf und Schultern einrollen, dann aus der Hüfte aufrichten.', src: ['C1', 'H1'],
        explain: 'Cordo et al. 2003 (8 Gesunde, Bewegungsanalyse, Abstract) teilen den Sit-up in Einrollen des Rumpfs (Nacken und oberer Rumpf, dann Lendenbereich) und anschließendes Drehen des Beckens Richtung Füße. Gemessen mit gestreckten, freien Beinen. Beim vollen Sit-up beugt sich die Lendenwirbelsäule deutlich mehr als beim Crunch (≈ 38° gegenüber ≈ 3°, Halpern & Bleck 1979, Abstract).' },
      { short: 'Oben', anchor: 'elbow', side: 'r', status: 'single', text: 'Hochkommen, bis die Ellbogen auf Höhe der Knie sind.', src: ['E1'],
        explain: 'Endpunkt im Protokoll von Escamilla et al. 2006. Dort war der gerade Oberschenkelmuskel (Hüftbeuger) beim Sit-up deutlich aktiver als beim Crunch.' },
      { short: 'Füße', anchor: 'heel', side: 'r', status: 'contested', text: 'Fixierte Füße verschieben Arbeit Richtung Hüftbeuger.', src: ['P1', 'A1'],
        explain: 'Umstritten: Bei Parfrey et al. 2008 (14 Personen, Abstract) senkte das Fixieren der Füße die Aktivität aller Bauchmessstellen und erhöhte die des geraden Oberschenkelmuskels. Andersson et al. 1997 (6 Männer, Abstract) fanden mit gestützten Beinen mehr Hüftbeuger-Arbeit, die Bauchmuskeln änderten sich aber meist nicht.' },
    ],
    sources: {
      E1: { label: 'Escamilla et al. 2006, Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/16649890/', read: 'fulltext' },
      C1: { label: 'Cordo et al. 2003, J Electromyogr Kinesiol', url: 'https://doi.org/10.1016/s1050-6411(03)00023-3', read: 'abstract' },
      P1: { label: 'Parfrey et al. 2008, Appl Physiol Nutr Metab', url: 'https://doi.org/10.1139/H08-061', read: 'abstract' },
      A1: { label: 'Andersson et al. 1997, Eur J Appl Physiol', url: 'https://doi.org/10.1007/s004210050135', read: 'abstract' },
      H1: { label: 'Halpern & Bleck 1979, Clin Orthop Relat Res', url: 'https://pubmed.ncbi.nlm.nih.gov/161217/', read: 'abstract' }
    }
  },

  // ---------- Reverse Crunch ----------
  {
    ref: 'reverse-crunch', checkedAt: '2026-10-20', view: 'side', basis: 'protocol',
    basisNote: 'Keine Bewegungsmessung gefunden. Start und Ende folgen dem Protokoll von Escamilla et al. 2006 (Volltext, „reverse crunch flat“): Rückenlage, Hüfte und Knie ≈ 90°; Hüfte maximal beugen bis ≈ 125–135° Hüft- und Kniebeugung mit nach hinten gekipptem Becken. Wie weit das Becken kippt, ist nicht gemessen: Gezeichnet rollt es um 20° ein, der obere Rücken bleibt liegen (Konvention). Arme neben dem Körper und Matte sind Konvention.',
    tempo: { basis: 'protocol', note: '1 s hoch, 1 s halten, 1 s ab, 1 s Pause (Metronom, Escamilla et al. 2006).' },
    frames: [
      { label: 'Unten', pose: { root: 'shoulder', rootPos: FLOOR.sh, trunk: C(FLOOR.lie, 'Rückenlage; Gesäß und Schulterblätter liegen auf'), curl: C(0), hip: V(90, 'E1', 'protocol', 'Hüfte ≈ 90°'), knee: V(90, 'E1', 'protocol', 'Knie ≈ 90°'), ankle: C(-20, 'Fuß locker'), shoulder: C(-6, 'Arme neben dem Körper'), elbow: C(0), handFlat: 0, props: matProps } },
      { label: 'Oben', pose: { root: 'shoulder', rootPos: FLOOR.sh, trunk: C(FLOOR.lie - 20, 'Becken eingerollt'), curl: C(20, 'Becken kippt nach hinten, oberer Rücken bleibt liegen'), hip: V(130, 'E1', 'protocol', 'Hüfte 125–135°'), knee: V(130, 'E1', 'protocol', 'Knie 125–135°'), ankle: C(-20), shoulder: C(-6), elbow: C(0), handFlat: 0, props: matProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 1.0, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Einrollen', kp: [1, 2] }, { a: 1, b: 1, dur: 1.0, label: 'Oben', kp: [1, 3] }, { a: 1, b: 0, dur: 1.0, label: 'Ablegen', kp: [4] }],
    keyPoints: [
      { short: 'Start', anchor: 'knee', side: 'r', status: 'single', text: 'Rückenlage, Hüfte und Knie etwa 90° gebeugt, Füße in der Luft.', src: ['E1'],
        explain: 'Startstellung im Protokoll von Escamilla et al. 2006 (21 Gesunde). Die Armhaltung zeigt dort nur eine Abbildung; hier liegen die Arme neben dem Körper (Konvention).' },
      { short: 'Becken', anchor: 'glute', side: 'r', status: 'single', text: 'Becken nach hinten einrollen und die Knie Richtung Brust ziehen.', src: ['E1'],
        explain: 'Escamilla et al. 2006 beschreiben die Bewegung als Kippen des Beckens nach hinten mit Hüftbeugung bis ≈ 125–135°. Wie weit das Becken abhebt, wurde nicht gemessen.' },
      { short: 'Rücken', anchor: 'upperBack', side: 'l', status: 'single', text: 'Oberer Rücken und Kopf bleiben auf der Matte.', src: ['E1'],
        explain: 'Beim Reverse Crunch bewegt sich das Becken zum Rumpf, nicht umgekehrt (Escamilla et al. 2006: „Crunch in umgekehrter Richtung“). Dass Kopf und Schultern liegen bleiben, ist hier Zeichenkonvention.' },
      { short: 'Unten', anchor: 'belly', side: 'r', status: 'contested', text: 'Ob der untere Bauch hier mehr arbeitet, ist ungeklärt.', src: ['W1', 'K1'],
        explain: 'Umstritten: Willett et al. 2001 (25 Gesunde, Abstract) fanden beim Reverse Curl die höchste Aktivität im unteren geraden Bauchmuskel. Clark et al. 2003 (8 Personen, Abstract) fanden keinen Unterschied zwischen oberem und unterem Anteil und beim Reverse Curl weniger Aktivität als beim Crunch.' },
      { short: 'Tempo', anchor: 'hip', side: 'r', status: 'single', text: 'Ohne Schwung: etwa 1 s hoch, 1 s halten, 1 s ab.', src: ['E1'],
        explain: 'Takt im Protokoll von Escamilla et al. 2006 (Metronom). Beim Reverse Crunch auf 30° Schräge war der gerade Oberschenkelmuskel dort hoch aktiv; flach war die Belastung geringer.' }
    ],
    sources: {
      E1: { label: 'Escamilla et al. 2006, Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/16649890/', read: 'fulltext' },
      W1: { label: 'Willett et al. 2001, J Strength Cond Res', url: 'https://pubmed.ncbi.nlm.nih.gov/11726260/', read: 'abstract' },
      K1: { label: 'Clark et al. 2003, J Strength Cond Res', url: 'https://doi.org/10.1519/1533-4287(2003)017%3C0475:ECOTUA%3E2.0.CO;2', read: 'abstract' }
    }
  },

  // ---------- Beinheben liegend ----------
  {
    ref: 'lying-leg-raise', checkedAt: '2026-10-20', view: 'side', basis: 'protocol',
    basisNote: 'Keine im Volltext gelesene Bewegungsmessung der Übung. Oben folgt der Startstellung des Beinsenk-Tests bei Lindegren et al. 2022 (Volltext): Beine 90° zur Unterlage, Knie bis 5–10° gebeugt erlaubt, Arme vor der Brust gekreuzt. Wie tief die Beine sinken, ist Konvention (25° über der Matte; zitierte Normwerte Erwachsener für den Kontrollverlust im Test: 15–55°). Oben rollt das Becken leicht ein (10°, Konvention); Elvira et al. 2014 (Abstract) maßen Beckenkippung, die Werte sind hier nicht übernommen.',
    tempo: { basis: 'protocol', note: '≈ 2 s heben, 2 s senken (Elvira et al. 2014 testeten 1 Wiederholung je 4 s bis je 1 s, Abstract).' },
    frames: [
      { label: 'Unten', pose: { root: 'shoulder', rootPos: FLOOR.sh, trunk: C(FLOOR.lie, 'Rückenlage; Gesäß und Schulterblätter liegen auf'), curl: C(0), hip: C(FLOOR.lie + 115, 'Beine schweben ≈ 25° über der Matte'), knee: V(5, 'L2', 'protocol', 'Knie bis 5–10° gebeugt erlaubt'), ankle: C(-20), armTargetTrunk: [20, -6], armScale: [0.7, 0.9], elbowSide: -1, props: matProps } },
      { label: 'Oben', pose: { root: 'shoulder', rootPos: FLOOR.sh, trunk: C(FLOOR.lie - 10, 'Becken leicht eingerollt'), curl: C(10), hip: K(FLOOR.lie + 170, 'L2', 'Oberschenkel senkrecht (90° zur Matte) bei 10° Beckenkippung'), knee: V(5, 'L2', 'protocol'), ankle: C(-20), armTargetTrunk: [20, -6], armScale: [0.7, 0.9], elbowSide: -1, props: matProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [2] }, { a: 0, b: 1, dur: 2.0, label: 'Heben', kp: [0, 3] }, { a: 1, b: 1, dur: 0.4, label: 'Oben', kp: [0] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [1, 2] }],
    keyPoints: [
      { short: 'Senkrecht', anchor: 'knee', side: 'r', status: 'single', text: 'Beine gestreckt bis etwa senkrecht heben; leicht gebeugte Knie sind normal.', src: ['L2'],
        explain: 'Startstellung im Beinsenk-Test bei Lindegren et al. 2022 (90 Jugendliche): Beine 90° zur Unterlage, 5–10° Kniebeugung wegen der hinteren Oberschenkelmuskeln erlaubt. Das ist ein Test, keine Trainingsstudie.' },
      { short: 'Becken', anchor: 'glute', side: 'r', status: 'single', text: 'Beim Absenken kippt das Becken früh nach vorn ins Hohlkreuz.', src: ['Z1'],
        explain: 'Zannotti et al. 2002 (17 Personen, Videoanalyse, Abstract): Das Becken kippte schon nach ≈ 3,6° Absenken nach vorn, auch wenn die Personen es verhindern wollten.' },
      { short: 'Tiefe', anchor: 'lowBack', side: 'l', status: 'single', text: 'Nur so tief senken, wie der untere Rücken Kontakt zur Matte hält.', src: ['L2'],
        explain: 'So endet der Beinsenk-Test (Lindegren et al. 2022, Druckkissen unter der Lende). Gesunde Erwachsene verloren den Kontakt laut dort zitierten Studien bei 15–55° über der Unterlage, Jugendliche im Mittel bei 72°.' },
      { short: 'Tempo', anchor: 'thigh', side: 'r', status: 'single', text: 'Langsam: Schnell werden Hüft- und Beckenweg kleiner, die Knie beugen mehr.', src: ['V1'],
        explain: 'Elvira et al. 2014 (17 Trainierte, 3D-Analyse, Abstract): Bei höherem Tempo nahmen Beckenkippung und Hüftweg ab und die Kniebeugung zu.' }
    ],
    sources: {
      L2: { label: 'Lindegren et al. 2022, Int J Sports Phys Ther', url: 'https://doi.org/10.26603/001c.31042', read: 'fulltext' },
      Z1: { label: 'Zannotti et al. 2002, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2002.32.9.432', read: 'abstract' },
      V1: { label: 'Elvira et al. 2014, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2013.860483', read: 'abstract' }
    }
  },

  // ---------- Dead Bug ----------
  {
    ref: 'dead-bug', checkedAt: '2026-10-20', view: 'side', basis: 'protocol',
    basisNote: 'Keine Bewegungsmessung gefunden. Start nach Tsartsapakis et al. 2023 (Volltext): Arme senkrecht über der Brust, Hüfte und Knie je 90°, unterer Rücken in Kontakt mit der Matte. Das gestreckte Bein endet bei 30° Hüftbeugung mit gestrecktem Knie wie die Begrenzung bei Pereira et al. 2017 (Volltext). Der Arm über dem Kopf (170°) und das gegengleiche Muster sind Konvention bzw. nur aus automatischen Zusammenfassungen koreanischer Studien bekannt. In der Seitenansicht arbeiten erst der nahe Arm und das ferne Bein, dann umgekehrt.',
    tempo: { basis: 'protocol', note: 'Metronom 40 Schläge je Minute (Pereira et al. 2017): ≈ 1,5 s strecken, 1,5 s zurück.' },
    frames: [
      { label: 'Start', pose: { root: 'hip', rootPos: [0, FLOOR.hipY], trunk: C(FLOOR.lie, 'Rückenlage; Gesäß und Schulterblätter liegen auf'), curl: C(0), hip: V(90, 'T1', 'protocol', 'Hüfte 90°'), knee: V(90, 'T1', 'protocol', 'Knie 90°'), ankle: C(-10), shoulder: V(90, 'T1', 'protocol', 'Arme senkrecht über der Brust'), elbow: C(0), leg2: { hip: V(90, 'T1', 'protocol'), knee: V(90, 'T1', 'protocol'), ankle: C(-10) }, arm2: { shoulder: V(90, 'T1', 'protocol'), elbow: C(0) }, props: matProps } },
      { label: 'Gestreckt A', pose: { root: 'hip', rootPos: [0, FLOOR.hipY], trunk: C(FLOOR.lie), curl: C(0), hip: V(90, 'T1', 'protocol'), knee: V(90, 'T1', 'protocol'), ankle: C(-10), shoulder: C(170, 'Arm über dem Kopf, schwebt über der Matte'), elbow: C(0), leg2: { hip: V(30, 'P2', 'protocol', 'Hüfte bis 30°, Knie gestreckt'), knee: V(0, 'P2', 'protocol'), ankle: C(-10) }, arm2: { shoulder: V(90, 'T1', 'protocol'), elbow: C(0) }, props: matProps } },
      { label: 'Gestreckt B', pose: { root: 'hip', rootPos: [0, FLOOR.hipY], trunk: C(FLOOR.lie), curl: C(0), hip: V(30, 'P2', 'protocol', 'Hüfte bis 30°, Knie gestreckt'), knee: V(0, 'P2', 'protocol'), ankle: C(-10), shoulder: V(90, 'T1', 'protocol'), elbow: C(0), leg2: { hip: V(90, 'T1', 'protocol'), knee: V(90, 'T1', 'protocol'), ankle: C(-10) }, arm2: { shoulder: C(170), elbow: C(0) }, props: matProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Start', kp: [0] }, { a: 0, b: 1, dur: 1.5, label: 'Strecken', kp: [1, 2] }, { a: 1, b: 0, dur: 1.5, label: 'Zurück', kp: [2] }, { a: 0, b: 0, dur: 0.5, label: 'Start', kp: [0] }, { a: 0, b: 2, dur: 1.5, label: 'Strecken', kp: [1, 2] }, { a: 2, b: 0, dur: 1.5, label: 'Zurück', kp: [3] }],
    keyPoints: [
      { short: 'Start', anchor: 'hand', side: 'r', status: 'single', text: 'Arme senkrecht über der Brust, Hüfte und Knie je 90° gebeugt.', src: ['T1'],
        explain: 'Ausgangslage bei Tsartsapakis et al. 2023 (44 Frauen mit Pilates-Erfahrung, Volltext). Dort wurde die Lage 10 s gehalten; gemessen wurde die Dicke des queren Bauchmuskels, keine Bewegung.' },
      { short: 'Kreuz', anchor: 'shoulder', side: 'l', status: 'single', text: 'Einen Arm über den Kopf und das Gegenbein nach vorn strecken, Wechsel.', src: ['K2', 'P2'],
        explain: 'Gegengleiches Muster nach Kim et al. 2020 (nur automatische Zusammenfassung gelesen). Das Bein streckt bis 30° Hüftbeugung mit gestrecktem Knie wie bei Pereira et al. 2017 (Holzkasten als Grenze).' },
      { short: 'Rücken', anchor: 'lowBack', side: 'l', status: 'single', text: 'Der untere Rücken hält Kontakt zur Matte.', src: ['T1'],
        explain: 'Anweisung bei Tsartsapakis et al. 2023. Im selben Satz steht „neutrale Wirbelsäule“; ob flach gedrückt oder natürlich gekrümmt, ist nicht gemessen.' },
      { short: 'Stärke', anchor: 'belly', side: 'r', status: 'contested', text: 'Wie stark die Bauchmuskeln arbeiten, unterscheidet sich je nach Studie.', src: ['P2', 'S1'],
        explain: 'Umstritten: Bei Pereira et al. 2017 (19 Gesunde, Volltext) war der gerade Bauchmuskel ≈ 27 %, die schrägen ≈ 82–85 % der Maximalkraft aktiv. Souza et al. 2001 (12 Gesunde, Abstract) fanden keinen Muskel über 41 % und halten die Übung für zu leicht für Kraftzuwachs. Varianten und Normierung unterscheiden sich.' }
    ],
    sources: {
      T1: { label: 'Tsartsapakis et al. 2023, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk8030110', read: 'fulltext' },
      P2: { label: 'Pereira et al. 2017, J Manipulative Physiol Ther', url: 'https://doi.org/10.1016/j.jmpt.2017.02.010', read: 'fulltext' },
      K2: { label: 'Kim, Cho & Kim 2020, J Korean Soc Integr Med', url: 'https://doi.org/10.15268/ksim.2020.8.2.001', read: 'summary' },
      S1: { label: 'Souza et al. 2001, Arch Phys Med Rehabil', url: 'https://doi.org/10.1053/apmr.2001.26082', read: 'abstract' }
    }
  },

  // ---------- Runde 11 (v2.16): Unterarmstütz (Plank) ----------
  {
    ref: 'plank', checkedAt: '2026-10-21', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat Gelenkwinkel im Unterarmstütz gemessen. Aufbau nach den Protokollen von Escamilla et al. 2016 (Volltext, Abbildungen) und Cortell-Tormo et al. 2017 (Abstract): Unterarme auf dem Boden, Ellbogen unter den Schultern, Körper gerade, auf den Zehen. Start mit abgelegtem Becken und das Halten von 3 s sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: 'Escamilla et al. 2016: 1 s in die Position, 1 s halten, 1 s zurück (Metronom, für die EMG-Messung). Gezeichnet 1 s hoch, 3 s halten, 1 s ab; im Training wird meist länger gehalten (30 s bei Schoenfeld et al. 2014).' },
    frames: [
      { label: 'Ablegen', pose: { ...PLANK.base, trunk: C(PLANK.start.trunk, 'Becken auf der Matte (Konvention)'), hip: C(PLANK.start.hip, 'Hüfte gestreckt, Zehen aufgestellt'), props: plankProps } },
      { label: 'Halten', pose: { ...PLANK.base, hip: V(0, 'E1', 'protocol', 'Körper gerade'), solve: { param: 'trunk', joint: 'toe', y: -MAT, range: [60, 120] }, props: plankProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.6, label: 'Ablegen', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Hochdrücken', kp: [0, 1] }, { a: 1, b: 1, dur: 3.0, label: 'Halten', kp: [1, 2, 3] }, { a: 1, b: 0, dur: 1.0, label: 'Ablegen', kp: [4] }],
    keyPoints: [
      { short: 'Arme', anchor: 'elbow', side: 'r', status: 'consensus', text: 'Ellbogen unter den Schultern, Unterarme flach auf dem Boden.', src: ['E1', 'C1'],
        explain: 'Ausgangslage in beiden Protokollen (Escamilla et al. 2016, Abbildungen im Volltext; Cortell-Tormo et al. 2017 kontrollierten die Gelenkstellungen per 2D-Video, Abstract). Winkel sind dort nicht als Zahl berichtet.' },
      { short: 'Linie', anchor: 'hip', side: 'l', status: 'single', text: 'Körper gerade von Kopf bis Ferse, das Becken hängt nicht durch.', src: ['E1'],
        explain: 'Gerade Körperlinie auf den Zehen im Protokoll von Escamilla et al. 2016. Ein Durchhängen wurde nicht gemessen; die gerade Linie ist hier gezeichnet.' },
      { short: 'Becken', anchor: 'glute', side: 'l', status: 'consensus', text: 'Becken leicht nach hinten kippen erhöhte die Aktivität der Bauchmuskeln.', src: ['S1', 'C1'],
        explain: 'Schoenfeld et al. 2014 (19 Personen, je 30 s, Abstract): Kippung nach hinten mehr äußerer schräger Bauchmuskel, langer Hebel (Ellbogen weiter vorn) mehr gerader Bauchmuskel. Cortell-Tormo et al. 2017 (15 Personen, Abstract): Kippung nach hinten mit zusammengezogenen Schulterblättern am höchsten. EMG zeigt Aktivierung, nicht Wachstum.' },
      { short: 'Bauch', anchor: 'belly', side: 'r', status: 'single', text: 'Gerader und schräger Bauchmuskel arbeiten mäßig, auf den Knien weniger.', src: ['E1'],
        explain: 'Escamilla et al. 2016 (18 Personen, Volltext), Plank auf den Zehen in % der maximalen Anspannung: oberer gerader Bauchmuskel 34, unterer 40, äußerer schräger 40, innerer schräger 29; auf den Knien 27, 26, 22 und 20.' },
      { short: 'Ende', anchor: 'shoulder', side: 'r', status: 'single', text: 'Bis zur Erschöpfung gehalten, endete der Plank meist durch Bauch- oder Armermüdung.', src: ['D1'],
        explain: 'Devorski et al. 2021 (17 Personen, Abstract): 41 % hörten wegen Ermüdung der Bauchmuskeln auf, 47 % wegen Ermüdung von Armen und Schultern. Das beschreibt die Studie, keine Vorgabe für die Haltedauer.' }
    ],
    sources: {
      E1: { label: 'Escamilla et al. 2016, Sports Health', url: 'https://doi.org/10.1177/1941738116653931', read: 'fulltext' },
      S1: { label: 'Schoenfeld et al. 2014, Sports Biomech', url: 'https://doi.org/10.1080/14763141.2014.942355', read: 'abstract' },
      C1: { label: 'Cortell-Tormo et al. 2017, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000001689', read: 'abstract' },
      D1: { label: 'Devorski et al. 2021, J Sport Rehabil', url: 'https://doi.org/10.1123/jsr.2020-0485', read: 'abstract' }
    }
  },

  // ---------- Runde 11: Seitstütz ----------
  {
    ref: 'side-plank', checkedAt: '2026-10-21', view: 'front', basis: 'protocol', layout: 'cols',
    basisNote: 'Frontansicht, um die Bildachse gedreht: Die Figur liegt auf der linken Seite. Unterer Oberarm senkrecht unter der Schulter, Körper gerade, Füße übereinander (Abbildungen in Youdas et al. 2014 und Escamilla et al. 2016, beide Volltext). Die Körperneigung (≈ 21°) folgt daraus geometrisch; der Start mit abgesenkter Hüfte und die Haltezeit sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: 'Youdas et al. 2014: Hüfte im Takt eines Metronoms (40/min) gehoben; Escamilla et al. 2016: 1 s hoch, 1 s halten, 1 s ab. Gezeichnet 1 s hoch, 3 s halten, 1 s ab.' },
    frames: [
      { label: 'Hüfte unten', pose: { rotate: C(SIDEP.start.rotate, 'gelöst: Hüfte nahe der Matte'), trunk: C(SIDEP.start.trunk, 'seitlich geknickt (Konvention)'), root: 'ankleL', rootPos: SIDEP.AW, legs: { stance: -9 }, arm: { abd: SIDEP.start.armR }, armL: { points: SIDEP.start.armL }, props: sidePlankProps } },
      { label: 'Halten', pose: { rotate: K(SIDEP.hold.rotate, 'Y1', 'gelöst: Oberarm senkrecht, Körper gerade'), trunk: V(0, 'Y1', 'protocol', 'neutrale Wirbelsäule'), root: 'ankleL', rootPos: SIDEP.AW, legs: { stance: -9 }, arm: { abd: SIDEP.hold.armR }, armL: { points: SIDEP.hold.armL }, props: sidePlankProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.6, label: 'Hüfte unten', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Heben', kp: [1] }, { a: 1, b: 1, dur: 3.0, label: 'Halten', kp: [1, 2, 3] }, { a: 1, b: 0, dur: 1.0, label: 'Senken', kp: [4] }],
    keyPoints: [
      { short: 'Ellbogen', anchor: 'elbowL', side: 'l', status: 'consensus', text: 'Unterer Ellbogen unter der Schulter, Füße übereinander.', src: ['Y1', 'E1'],
        explain: 'Ausgangslage in den Abbildungen beider Studien (Volltext). Der Abstand Ellbogen–Schulter wurde nicht gemessen; die Füße übereinander sind hier gezeichnet, leichter ist der Seitstütz auf den Knien.' },
      { short: 'Hüfte', anchor: 'hipL', side: 'l', status: 'single', text: 'Hüfte heben, bis Rumpf und Beine eine gerade Linie bilden.', src: ['Y1'],
        explain: 'Youdas et al. 2014 (25 Gesunde, Volltext): Hüfte im Takt bis zur neutralen Wirbelsäule gehoben; ein Untersucher prüfte das, gemessen wurde der Winkel nicht.' },
      { short: 'Seite', anchor: 'belly', side: 'r', status: 'consensus', text: 'Vor allem der äußere schräge Bauchmuskel arbeitet, auf den Füßen mehr als auf den Knien.', src: ['E1', 'D1'],
        explain: 'Escamilla et al. 2016 (Volltext): äußerer schräger Bauchmuskel 62 % der maximalen Anspannung auf den Füßen, 37 % auf den Knien. Devorski et al. 2021 (Abstract): 78 % im Seitstütz gegenüber 55 % im Plank.' },
      { short: 'Gesäß', anchor: 'hip', side: 'r', status: 'single', text: 'Der mittlere Gesäßmuskel arbeitet stark mit, vor allem auf der aufliegenden Seite.', src: ['Y1'],
        explain: 'Youdas et al. 2014: Gluteus medius über 69 % der maximalen Anspannung; fast alle gemessenen Muskeln der aufliegenden Seite waren aktiver als die der oberen Seite.' },
      { short: 'Schulter', anchor: 'shoulderL', side: 'l', status: 'single', text: 'Die Stützschulter arbeitet deutlich mit; bei Schmerz die Übung beenden.', src: ['D1'],
        explain: 'Devorski et al. 2021 (17 Personen bis zum Abbruch, Abstract): mittlerer Deltamuskel 56 % der maximalen Anspannung; 41 % hörten wegen Schulterermüdung auf, 17 % wegen Schmerz.' }
    ],
    sources: {
      Y1: { label: 'Youdas et al. 2014, Sports Health', url: 'https://doi.org/10.1177/1941738114539266', read: 'fulltext' },
      E1: { label: 'Escamilla et al. 2016, Sports Health', url: 'https://doi.org/10.1177/1941738116653931', read: 'fulltext' },
      D1: { label: 'Devorski et al. 2021, J Sport Rehabil', url: 'https://doi.org/10.1123/jsr.2020-0485', read: 'abstract' }
    }
  },

  // ---------- Runde 11: Copenhagen Plank ----------
  {
    ref: 'copenhagen-plank', checkedAt: '2026-10-21', view: 'front', basis: 'protocol', layout: 'cols',
    basisNote: 'Frontansicht wie beim Seitstütz. Ablauf nach Serner et al. 2013 (Volltext): auf dem Unterarm, oberes Bein an Knie und Knöchel gestützt, Körper heben und das untere Bein heranziehen, bis die Füße sich berühren und der Körper gerade ist, dann halb absenken, bis der untere Fuß den Boden gerade berührt. Im Protokoll hält ein Partner das Bein; hier ersetzt eine Bank (≈ 44 cm) den Partner – Zeichenkonvention.',
    tempo: { basis: 'protocol', note: 'Serner et al. 2013: je Wiederholung 3 s heben und 3 s senken. Gezeichnet: 3 s heben, 2 s halten (Konvention), 3 s halb absenken.' },
    frames: [
      { label: 'Halb unten', pose: { rotate: C(COPEN.start.rotate, 'gelöst: Hüfte halb abgesenkt'), trunk: C(COPEN.start.trunk, 'seitlich geknickt (Konvention)'), root: 'ankleR', rootPos: COPEN.AR, legs: { stance: -9, abdL: C(COPEN.start.abdL, 'unterer Fuß berührt den Boden') }, arm: { abd: COPEN.start.armR }, armL: { points: COPEN.start.armL }, props: copenProps } },
      { label: 'Oben', pose: { rotate: K(COPEN.hold.rotate, 'S1', 'gelöst: Oberarm senkrecht, Körper gerade, Schienbein auf der Bank'), trunk: V(0, 'S1', 'protocol', 'Körper in einer Linie'), root: 'ankleR', rootPos: COPEN.AR, legs: { stance: -9, abdL: V(COPEN.hold.abdL, 'S1', 'protocol', 'Füße berühren sich') }, arm: { abd: COPEN.hold.armR }, armL: { points: COPEN.hold.armL }, props: copenProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Halb unten', kp: [0] }, { a: 0, b: 1, dur: 3.0, label: 'Heben', kp: [1] }, { a: 1, b: 1, dur: 2.0, label: 'Halten', kp: [1, 2] }, { a: 1, b: 0, dur: 3.0, label: 'Absenken', kp: [3] }],
    keyPoints: [
      { short: 'Bein', anchor: 'shinR', side: 'r', status: 'single', text: 'Oberes Bein liegt an Knie und Knöchel auf, etwa auf Hüfthöhe.', src: ['S1'],
        explain: 'Im Protokoll hält ein Partner das obere Bein an Knöchel und Knie, etwa auf Höhe seiner eigenen Hüfte (Serner et al. 2013, Volltext). Die Bank hier ist Zeichenkonvention; mit nur dem Knie aufgelegt ist der Hebel kürzer (leichter).' },
      { short: 'Linie', anchor: 'hipL', side: 'l', status: 'single', text: 'Körper heben, bis er gerade ist; das untere Bein zum oberen ziehen.', src: ['S1'],
        explain: 'Serner et al. 2013: Körper vom Boden heben und das untere Bein heranziehen, bis die Füße sich berühren und der Körper eine Linie bildet; dann halb absenken, bis der untere Fuß den Boden berührt, ohne sich abzustützen.' },
      { short: 'Adduktor', anchor: 'thighR', side: 'r', status: 'single', text: 'Höchste Adduktoren-Aktivität unter acht Adduktionsübungen.', src: ['S1'],
        explain: 'Serner et al. 2013 (40 Fußballspieler, Volltext): Adductor longus des oberen Beins 108 % der maximalen Anspannung, gleichauf mit dem Ball zwischen den Knien; Bauchmuskeln bis 36–40 %. EMG zeigt Aktivierung, nicht Wachstum.' },
      { short: 'Kraft', anchor: 'kneeR', side: 'r', status: 'single', text: '8 Wochen mit der Übung steigerten die exzentrische Adduktionskraft um ≈ 9 %.', src: ['H1'],
        explain: 'Harøy et al. 2017 (randomisiert, 45 U19-Fußballer, Abstract): +0,29 Nm/kg (8,9 %) gegenüber dem Aufwärmprogramm FIFA 11+ ohne die Übung. Muskelwachstum wurde nicht gemessen.' }
    ],
    sources: {
      S1: { label: 'Serner et al. 2013, Br J Sports Med', url: 'https://doi.org/10.1136/bjsports-2012-091746', read: 'fulltext' },
      H1: { label: 'Harøy et al. 2017, Am J Sports Med', url: 'https://doi.org/10.1177/0363546517720194', read: 'abstract' }
    }
  },

  // ---------- Runde 11: L-Sitz ----------
  {
    ref: 'l-sit', checkedAt: '2026-10-21', view: 'side', basis: 'convention',
    basisNote: 'Keine Bewegungs- oder EMG-Studie zum L-Sitz gefunden (PubMed-Suche 2026-10-21). Gezeichnet nach der üblichen Definition: Hände auf niedrigen Griffen (≈ 12 cm) neben der Hüfte, Arme gestreckt, Beine gestreckt und waagerecht (Rumpf leicht vorgeneigt, Hüfte ≈ 95°). Muskelangaben stammen vom V-Sit, der nächsten untersuchten Form.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s hochdrücken, 3 s halten, 1 s ablegen (Konvention).' },
    frames: [
      { label: 'Sitzen', pose: { ...LSIT.base, foot: C(90), hip: C(LSIT.start.hip, 'Fersen auf dem Boden'), rootPos: [-6, LSIT.start.y], props: lsitProps } },
      { label: 'Halten', pose: { ...LSIT.base, hip: C(LSIT.hold.hip, 'Beine waagerecht (Definition), Rumpf 5° vor'), rootPos: [-6, LSIT.hold.y], props: lsitProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.6, label: 'Sitzen', kp: [] }, { a: 0, b: 1, dur: 1.0, label: 'Hochdrücken', kp: [2] }, { a: 1, b: 1, dur: 3.0, label: 'Halten', kp: [0, 1] }, { a: 1, b: 0, dur: 1.0, label: 'Ablegen', kp: [] }],
    keyPoints: [
      { short: 'Bauch', anchor: 'belly', side: 'r', status: 'single', text: 'V-Sit und Beinheben im Hang aktivierten den unteren geraden Bauchmuskel am stärksten.', src: ['G1'],
        explain: 'Guimaraes et al. 1991 (20 Sportstudierende, zwölf Bauchübungen, Abstract). Der L-Sitz selbst wurde nicht gemessen; der V-Sit ist die nächste untersuchte Form.' },
      { short: 'Isoliert', anchor: 'chest', side: 'l', status: 'single', text: 'Im V-Sit arbeiteten vor allem die Bauchmuskeln, kaum Schulter oder Rücken.', src: ['D1'],
        explain: 'Devorski et al. 2021 (Abstract): mittlerer Deltamuskel 2 % der maximalen Anspannung im V-Sit gegenüber 43–56 % in Plank und Seitstütz. Beim L-Sitz tragen die Arme das Körpergewicht – das ist ein Unterschied, gemessen wurde er nicht.' },
      { short: 'Beine', anchor: 'knee', side: 'r', status: 'single', text: 'Gestreckte oder gebeugte Knie änderten die Bauch-Aktivität kaum.', src: ['G1'],
        explain: 'Guimaraes et al. 1991: gestreckte oder gebeugte Knie, mit oder ohne gestützte Füße, änderten den geraden Bauchmuskel nicht (Abstract). Leichter ist der L-Sitz mit angezogenen Knien; die waagerechten Beine hier sind Zeichenkonvention.' }
    ],
    sources: {
      G1: { label: 'Guimaraes et al. 1991, J Sports Med Phys Fitness', url: 'https://pubmed.ncbi.nlm.nih.gov/1836517/', read: 'abstract' },
      D1: { label: 'Devorski et al. 2021, J Sport Rehabil', url: 'https://doi.org/10.1123/jsr.2020-0485', read: 'abstract' }
    }
  },

  // ---------- Runde 11: Liegestütz mit erhöhten Füßen ----------
  {
    ref: 'feet-elevated-push-up', checkedAt: '2026-10-21', view: 'side', basis: 'transfer',
    basisNote: 'Armwinkel vom Liegestütz übertragen (Suprak et al. 2013, Volltext; gemeinsamer Bereich 105° → 35°). Füße auf einer Stufe von ≈ 40 cm (Konvention, üblich 30–50 cm); der Körper liegt damit oben etwa waagerecht. Unten so tief gezeichnet, dass Kinn und Brust ≈ 4 cm über dem Boden bleiben. Wu et al. 2025 (Volltext) definierten die Erhöhung als Neigung der Linie Schulter–großer Rollhügel (10°, 20°, 30°).',
    tempo: { basis: 'protocol', note: 'Übertragen vom Liegestütz: 2 s ab, 2 s auf (Suprak et al. 2013). Wu et al. 2025 testeten drei Metronom-Tempi (4–7 Wiederholungen je 10 s).' },
    frames: [
      { label: 'Oben', pose: { ...FEPU.base, armPoints: FEPU.top, solve: { param: 'trunk', joint: 'toe', y: -FEPU.BOX, range: [60, 150] }, props: feProps }, facts: [C(40, 'Stufe ≈ 40 cm (Konvention)')] },
      { label: 'Unten', pose: { ...FEPU.base, armPoints: FEPU.bottom, solve: { param: 'trunk', joint: 'toe', y: -FEPU.BOX, range: [60, 150] }, props: feProps }, facts: [V(105, 'P1', 'fulltext', 'Ellbogen unten beim Liegestütz ≥ 105° (übertragen)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [2] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Hochdrücken', kp: [3] }],
    keyPoints: [
      { short: 'Füße', anchor: 'toe', side: 'l', status: 'single', text: 'Füße auf Bank oder Stufe; je höher, desto steiler zeigt der Körper nach unten.', src: ['W1'],
        explain: 'Wu et al. 2025 (27 Männer, Volltext): Fußhöhe je Person so berechnet, dass die Linie Schulter–großer Rollhügel 10°, 20° oder 30° geneigt war. Die Stufe von ≈ 40 cm hier ist Konvention.' },
      { short: 'Linie', anchor: 'hip', side: 'l', status: 'consensus', text: 'Körper gerade von Kopf bis Ferse, wie beim normalen Liegestütz.', src: ['P1', 'P2'],
        explain: 'Anweisung in den Liegestütz-Protokollen (Suprak et al. 2013, San Juan et al. 2015, beide Volltext), hier übertragen; mit erhöhten Füßen nicht eigens gemessen.' },
      { short: 'Kraft', anchor: 'wrist', side: 'r', status: 'single', text: 'Bei 30° war die Kraft unter den Händen kleiner als bei 10° und 20°.', src: ['W1'],
        explain: 'Mittlere Maximalkraft 667 N (10°), 663 N (20°), 596 N (30°) (Wu et al. 2025). Die Autoren halten 20° für den besten Kompromiss – das ist ihre Deutung, nicht gemessen.' },
      { short: 'Vergleich', anchor: 'chest', side: 'l', status: 'single', text: 'Mit erhöhten Händen sank die Muskelaktivität; erhöhte Füße kamen dort nicht vor.', src: ['K1'],
        explain: 'Kowalski et al. 2021 (Übersicht über 30 Studien, Volltext): globale EMG beim Liegestütz mit erhöhten Händen 15,8 % gegenüber 38,2 % der maximalen Anspannung beim normalen Liegestütz. Die Variante mit erhöhten Füßen war nicht unter den ausgewerteten.' }
    ],
    sources: {
      W1: { label: 'Wu et al. 2025, Sci Rep', url: 'https://doi.org/10.1038/s41598-025-28012-7', read: 'fulltext' },
      K1: { label: 'Kowalski et al. 2021, Shoulder & Elbow (Scoping Review)', url: 'https://doi.org/10.1177/17585732211019373', read: 'fulltext' },
      P1: { label: 'Suprak et al. 2013, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-48.5.08', read: 'fulltext' },
      P2: { label: 'San Juan et al. 2015, BMC Musculoskelet Disord', url: 'https://doi.org/10.1186/s12891-015-0486-5', read: 'fulltext' }
    }
  },

  // ---------- Runde 12 (v2.17): Hängendes Beinheben ----------
  {
    ref: 'hanging-leg-raise', checkedAt: '2026-10-21', view: 'side', basis: 'convention',
    basisNote: 'Keine gelesene Studie nennt Winkel für das Beinheben mit gestreckten Beinen an der Stange. McGill et al. 2014 maßen es mit 3D-Bewegungsanalyse, im Abstract stehen aber nur Muskelaktivität und Wirbelsäulenlast. Gezeichnet: Obergriff, Arme lang, Beine gestreckt bis waagerecht. Becken nach hinten gekippt und Takt sind vom hängenden Knieheben in Armschlaufen übertragen (Escamilla et al. 2006, Volltext). Rumpfneigung aus einem groben Schwerpunktmodell (Schwerpunkt unter den Händen); Stangenhöhe ≈ 2,2 m, damit die Füße frei hängen.',
    tempo: { basis: 'protocol', note: 'Übertragen vom hängenden Knieheben: 1 s hoch, 1 s halten, 1 s ab, 1 s Pause (Metronom; Escamilla et al. 2006).' },
    frames: [
      { label: 'Hang', pose: { ...HLR.base, trunk: K(HLR.tHang, [], 'Schwerpunktmodell: Schwerpunkt unter den Händen'), curl: C(0), hip: V(0, 'E1', 'protocol', 'Start im senkrechten Hang, Hüfte und Knie gestreckt'), props: hlrProps } },
      { label: 'Oben', pose: { ...HLR.base, trunk: K(HLR.tTop, [], 'Schwerpunktmodell: Schwerpunkt unter den Händen'), curl: C(HLR.curlTop, 'Becken nach hinten gekippt (Escamilla et al. 2006 beschreiben es, ohne Winkel)'), hip: C(r1(HLR.tTop + 90), 'Beine waagerecht'), props: hlrProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 1.0, label: 'Hang', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Heben', kp: [1, 2] }, { a: 1, b: 1, dur: 1.0, label: 'Oben', kp: [1, 3] }, { a: 1, b: 0, dur: 1.0, label: 'Senken', kp: [4] }],
    keyPoints: [
      { short: 'Hang', anchor: 'hand', side: 'r', status: 'single', text: 'Aus dem ruhigen Hang mit langen Armen starten, nicht vor und zurück schwingen.', src: ['E1'],
        explain: 'Escamilla et al. 2006 (21 Personen, Volltext): Start im senkrechten Hang, ein Untersucher hielt eine Hand am unteren Rücken, damit der Körper nicht schwang. Dort hingen die Arme in Schlaufen, nicht an der Stange.' },
      { short: 'Becken', anchor: 'lowBack', side: 'l', status: 'single', text: 'Oben das Becken nach hinten kippen, nicht nur die Beine hochschwingen.', src: ['E1'],
        explain: 'Beim hängenden Knieheben endeten alle mit maximal gebeugter Hüfte und nach hinten gekipptem Becken (Escamilla et al. 2006). Wie weit das Becken kippte, wurde nicht gemessen; 20° hier sind Zeichenkonvention.' },
      { short: 'Bauch', anchor: 'belly', side: 'r', status: 'single', text: 'Mit gestreckten Beinen war die Bauch-Aktivität sehr hoch.', src: ['M1'],
        explain: 'McGill et al. 2014 (14 Männer, Abstract): gerader Bauchmuskel über 130 %, äußerer schräger 88 % der maximalen willkürlichen Anspannung – die höchsten Werte der untersuchten Ganzkörperübungen.' },
      { short: 'Rücken', anchor: 'back', side: 'l', status: 'single', text: 'Gestreckte Beine belasten die Lendenwirbelsäule stark.', src: ['M1'],
        explain: 'Modellrechnung aus Muskelaktivität und Bewegung: ≈ 3000 N Druck auf die Wirbelsäule beim Beinheben mit gestreckten Beinen, unter 2500 N beim Body Saw (McGill et al. 2014, Abstract). Dass gebeugte Knie die Last senken, folgt aus dem kürzeren Hebel und ist nicht gemessen.' },
      { short: 'Tempo', anchor: 'knee', side: 'r', status: 'single', text: 'Gleichmäßig: etwa 1 s hoch, 1 s halten, 1 s ab.', src: ['E1'],
        explain: 'Takt aller Übungen bei Escamilla et al. 2006 (Metronom, 1 s Pause zwischen den Wiederholungen), hier vom Knieheben übertragen.' }
    ],
    sources: {
      M1: { label: 'McGill, Andersen & Cannon 2014, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2014.946437', read: 'abstract' },
      E1: { label: 'Escamilla et al. 2006, Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/16649890/', read: 'fulltext' }
    }
  },

  // ---------- Runde 12: Knieheben im Stütz (Captain's Chair) ----------
  {
    ref: 'captains-chair-knee-raise', checkedAt: '2026-10-21', view: 'side', basis: 'transfer',
    basisNote: 'Den Captain\'s Chair hat keine gelesene Studie gemessen. Übertragen vom hängenden Knieheben in Armschlaufen (Escamilla et al. 2006, Volltext): Schulter und Ellbogen ≈ 90° gebeugt, Start im senkrechten Hang mit gestreckten Beinen, oben Hüfte und Knie 125–135° gebeugt und das Becken nach hinten gekippt. Gezeichnet 130°. Rückenpolster, Polsterhöhe und der senkrecht bleibende obere Rücken sind Zeichenkonvention; das Kippen des Beckens (20°) ist nicht gemessen.',
    tempo: { basis: 'protocol', note: 'Übertragen: 1 s hoch, 1 s halten, 1 s ab, 1 s Pause (Metronom; Escamilla et al. 2006).' },
    frames: [
      { label: 'Unten', pose: { ...CAPT.base, trunk: C(0, 'Rücken am Polster'), curl: C(0), hip: V(0, 'E1', 'fulltext', 'Rumpf, Hüfte und Knie gestreckt'), knee: V(0, 'E1', 'fulltext'), props: captProps },
        facts: [V(90, 'E1', 'fulltext', 'Schulter und Ellbogen ≈ 90° gebeugt (Armschlaufen)')] },
      { label: 'Oben', pose: { ...CAPT.base, trunk: C(-CAPT.curlTop, 'oberer Rücken bleibt am Polster, das Becken rollt ein'), curl: C(CAPT.curlTop, 'Becken nach hinten gekippt (ohne Winkel beschrieben)'), hip: V(130, 'E1', 'fulltext', '125–135° Hüft- und Kniebeugung'), knee: V(130, 'E1', 'fulltext', '125–135°'), props: captProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 1.0, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Knie heben', kp: [1, 2] }, { a: 1, b: 1, dur: 1.0, label: 'Oben', kp: [2, 3] }, { a: 1, b: 0, dur: 1.0, label: 'Senken', kp: [4] }],
    keyPoints: [
      { short: 'Stütz', anchor: 'elbow', side: 'r', status: 'single', text: 'Unterarme auf den Polstern, Schulter und Ellbogen etwa 90° gebeugt.', src: ['E1'],
        explain: 'So begann das hängende Knieheben in Armschlaufen bei Escamilla et al. 2006 (Volltext). Der Captain\'s Chair stützt die Unterarme ähnlich und hat zusätzlich ein Rückenpolster.' },
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'single', text: 'Knie so weit wie möglich anziehen; Hüfte und Knie etwa 125–135° gebeugt.', src: ['E1'],
        explain: 'Maximale Hüftbeugung mit 125–135° Hüft- und Kniebeugung (Escamilla et al. 2006). Gezeichnet ist 130°.' },
      { short: 'Becken', anchor: 'lowBack', side: 'l', status: 'single', text: 'Oben das Becken einrollen, ohne Schwung aus den Beinen.', src: ['E1'],
        explain: 'Das Becken war am Ende nach hinten gekippt; ein Untersucher verhinderte das Schwingen (Escamilla et al. 2006). Der Winkel wurde nicht gemessen.' },
      { short: 'Bauch', anchor: 'belly', side: 'r', status: 'single', text: 'Die Variante in Armschlaufen gehörte zu den stärksten Bauchübungen der Studie.', src: ['E1'],
        explain: 'Gerader Bauchmuskel oben und unten sowie beide schrägen Bauchmuskeln lagen beim hängenden Knieheben unter den höchsten Werten von zwölf Übungen; der gerade Oberschenkelmuskel (Hüftbeuger) arbeitete mit (Escamilla et al. 2006). Den Captain\'s Chair selbst hat keine gelesene Studie gemessen.' },
      { short: 'Tempo', anchor: 'foot', side: 'r', status: 'single', text: 'Gleichmäßig: etwa 1 s hoch, 1 s halten, 1 s ab.', src: ['E1'],
        explain: 'Takt aller Übungen bei Escamilla et al. 2006 (Metronom, 1 s Pause zwischen den Wiederholungen).' }
    ],
    sources: {
      E1: { label: 'Escamilla et al. 2006, Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/16649890/', read: 'fulltext' }
    }
  },

  // ---------- Runde 12: Crunch am Kabel ----------
  {
    ref: 'cable-crunch', checkedAt: '2026-10-21', view: 'side', basis: 'convention',
    basisNote: 'Keine Bewegungs- oder EMG-Studie zum knienden Crunch am Kabel gefunden (PubMed-Suche 2026-10-21). Gezeichnet nach dem üblichen Aufbau: kniend vor dem Turm, Seil von der oberen Rolle, Hände seitlich am Kopf; der Rumpf rollt ein (≈ 48°, verteilt auf Lenden- und untere Brustwirbelsäule), die Hüfte beugt nur 8° mit. Alle Winkel sind Zeichenkonvention. Die Muskelangaben stammen vom Crunch mit Zusatzlast (Moraes et al. 2009, Abstract) und vom Crunch am Boden (Escamilla et al. 2006, Volltext).',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s einrollen, 1 s halten, 2 s zurück (Konvention). Die gelesenen Studien zum Crunch mit Last nennen im Abstract kein Tempo.' },
    frames: [
      { label: 'Oben', pose: { ...CCR.base, rootPos: [0, CCR.y], trunk: C(CCR.start.trunk, 'leicht vorgeneigt'), curl: C(0), headTilt: C(0), props: ccrProps } },
      { label: 'Eingerollt', pose: { ...CCR.base, rootPos: [0, CCR.y], trunk: C(CCR.end.trunk, 'Hüfte beugt nur wenig mit'), curl: C(CCR.end.curl, 'Rumpf eingerollt'), headTilt: C(12, 'Kinn zur Brust'), props: ccrProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Einrollen', kp: [1] }, { a: 1, b: 1, dur: 1.0, label: 'Unten', kp: [1, 2] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [3] }],
    keyPoints: [
      { short: 'Aufbau', anchor: 'knee', side: 'r', status: 'single', text: 'Kniend vor dem Turm, Seil an den Kopfseiten; die Hüfte bleibt fast ruhig.', src: ['E1'],
        explain: 'Der Aufbau ist übliche Praxis, keine gelesene Studie hat ihn gemessen. Dass die Bewegung aus dem Rumpf kommt, ist vom Crunch am Boden übertragen: Dort arbeitete der gerade Oberschenkelmuskel (Hüftbeuger) am wenigsten von zwölf Übungen (Escamilla et al. 2006, Volltext).' },
      { short: 'Rumpf', anchor: 'belly', side: 'r', status: 'single', text: 'Brustkorb zum Becken einrollen, nicht nur aus der Hüfte nach vorn kippen.', src: ['E1'],
        explain: 'Beim Crunch beugt sich die Wirbelsäule, bei Übungen mit viel Hüftbeugung (Sit-up mit gebeugten Knien) arbeiteten die Hüftbeuger deutlich mehr (Escamilla et al. 2006). Am Kabel gemessen ist das nicht.' },
      { short: 'Last', anchor: 'chest', side: 'l', status: 'single', text: 'Mit mehr Last stieg die Bauch-Aktivität; am höchsten bei der Maximallast.', src: ['M1'],
        explain: 'Moraes et al. 2009 (13 Personen, Crunch mit 20–100 % der Maximallast, Abstract): Die Bauchmuskeln waren bei 100 % deutlich am stärksten aktiv; wie die Last angebracht war, steht im Abstract nicht.' },
      { short: 'Steigern', anchor: 'hand', side: 'r', status: 'single', text: 'Kleine Laststufen änderten die Aktivität kaum; größere Sprünge schon.', src: ['M1'],
        explain: '20 % und 40 % der Maximallast unterschieden sich nicht; die Autoren empfehlen deshalb Steigerungen über 20 % der Maximallast (Moraes et al. 2009, Abstract) – das ist ihre Schlussfolgerung aus der Muskelaktivität, nicht aus einem Trainingsversuch.' }
    ],
    sources: {
      M1: { label: 'Moraes et al. 2009, Phys Ther Sport', url: 'https://doi.org/10.1016/j.ptsp.2009.01.001', read: 'abstract' },
      E1: { label: 'Escamilla et al. 2006, Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/16649890/', read: 'fulltext' }
    }
  },

  // ---------- Runde 12: Crunch an der Maschine ----------
  {
    ref: 'machine-crunch', checkedAt: '2026-10-21', view: 'side', basis: 'convention',
    basisNote: 'Sundstrup et al. 2012 maßen die Muskelaktivität an einer sitzenden Crunch-Maschine (Technogym), den Aufbau beschreibt das Abstract aber nicht; den Volltext konnte ich nicht öffnen. Gezeichnet ist ein üblicher Aufbau: Sitz, Füße unter der Rolle, Brust am Polster, Hände an den Griffen; das Polster dreht um eine Achse seitlich auf Höhe der Lendenwirbelsäule. Rumpfbeugung (≈ 42°) und die 10° Hüftbeugung sind Zeichenkonvention.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s einrollen, 1 s halten, 2 s zurück (Konvention; das Abstract nennt kein Tempo).' },
    frames: [
      { label: 'Aufrecht', pose: { ...MCR.base, trunk: C(MCR.start.trunk, 'aufrecht, leicht zurückgelehnt'), curl: C(0), hip: C(MCR.start.trunk + 90, 'Oberschenkel waagerecht'), headTilt: C(0), props: mcrProps } },
      { label: 'Eingerollt', pose: { ...MCR.base, trunk: C(MCR.end.trunk), curl: C(MCR.end.curl, 'Brustkorb zum Becken eingerollt'), hip: C(MCR.end.trunk + 90, 'Oberschenkel waagerecht'), headTilt: C(10), props: mcrProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Aufrecht', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Einrollen', kp: [0, 1] }, { a: 1, b: 1, dur: 1.0, label: 'Unten', kp: [1, 2] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [3] }],
    keyPoints: [
      { short: 'Einrollen', anchor: 'belly', side: 'r', status: 'single', text: 'Brust zum Becken einrollen, statt aus der Hüfte nach vorn zu ziehen.', src: ['S1'],
        explain: 'An der Maschine arbeitete neben dem geraden Bauchmuskel (84 % der maximalen Anspannung) auch der gerade Oberschenkelmuskel stark mit (65 %), ein Hüftbeuger (Sundstrup et al. 2012, 42 Untrainierte, 10RM, Abstract). Wie stark die Hüfte dabei gebeugt war, steht im Abstract nicht.' },
      { short: 'Muskeln', anchor: 'chest', side: 'l', status: 'single', text: 'Gerader und äußerer schräger Bauchmuskel waren am stärksten aktiv.', src: ['S1'],
        explain: 'Von 13 gemessenen Muskeln (Sundstrup et al. 2012, Abstract). Geschlecht, Alter und Schmerzen änderten die Ergebnisse nicht.' },
      { short: 'Vergleich', anchor: 'thigh', side: 'r', status: 'single', text: 'Crunch auf dem Ball mit Band: mehr gerader Bauchmuskel, weniger Hüftbeuger.', src: ['S1'],
        explain: '104 % gegenüber 84 % im geraden Bauchmuskel und 27 % gegenüber 65 % im geraden Oberschenkelmuskel (Sundstrup et al. 2012). Die Autoren raten Menschen mit Rückenschmerzen deshalb eher zum Ball – das ist ihre Deutung, Beschwerden wurden nicht verglichen.' },
      { short: 'Last', anchor: 'hand', side: 'r', status: 'single', text: 'Laststufen lieber deutlich als in kleinen Schritten steigern.', src: ['M1'],
        explain: 'Beim Crunch mit Zusatzlast unterschieden sich 20 % und 40 % der Maximallast in der Muskelaktivität nicht (Moraes et al. 2009, Abstract); die Autoren empfehlen Sprünge über 20 % der Maximallast. Eine Maschine wird im Abstract nicht genannt.' }
    ],
    sources: {
      S1: { label: 'Sundstrup et al. 2012, Int J Sports Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/22893857/', read: 'abstract' },
      M1: { label: 'Moraes et al. 2009, Phys Ther Sport', url: 'https://doi.org/10.1016/j.ptsp.2009.01.001', read: 'abstract' }
    }
  },

  // ---------- Runde 12: Holzhacker am Kabel (Frontansicht) ----------
  {
    ref: 'cable-woodchop', checkedAt: '2026-10-21', view: 'front', basis: 'convention',
    basisNote: 'Frontansicht. Keine gelesene Studie nennt Winkel oder Wege für den Holzhacker. Gezeichnet ist die Variante von der oberen Rolle diagonal nach unten zur anderen Hüfte; Rodríguez-Perea et al. 2023 (Volltext) nutzten eine waagerechte und eine von unten kommende Variante, Zemková et al. 2017 (Abstract) eine stehende Variante am Kabelturm. Die Rumpfdrehung kann die Frontfigur nicht zeigen: Sichtbar sind Armdiagonale, Seitneigung und die tiefer werdenden Knie (alles Zeichenkonvention).',
    tempo: { basis: 'convention', note: 'Gezeichnet 1,5 s ziehen, 2 s zurück (Konvention). In den Studien wurde mit Höchstleistung bzw. gerätegesteuerter Geschwindigkeit (0,4–0,7 m/s) gezogen.' },
    frames: [
      ...WCH.path.map((q, i) => ({ label: i === 0 ? 'Oben' : i === 6 ? 'Unten' : 'Zug ' + i, pose: { trunk: C(q.trunk, i === 0 ? 'Seitneigung zur Rolle' : i === 6 ? 'Seitneigung zur Gegenseite' : undefined), legs: q.legs, armPoints: q.armPoints, armL: q.armL, props: wchProps } })) // Bilder 1–5: Zwischenbilder auf der Griffbahn
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Oben', kp: [0] }, ...[0, 1, 2, 3, 4, 5].map((i) => ({ a: i, b: i + 1, dur: 0.25, label: 'Ziehen', kp: [0, 1] })), { a: 6, b: 6, dur: 0.3, label: 'Unten', kp: [1, 2] },
      ...[6, 5, 4, 3, 2, 1].map((i) => ({ a: i, b: i - 1, dur: 2 / 6, label: 'Zurück', kp: [3] }))],
    keyPoints: [
      { short: 'Weg', anchor: 'handR', side: 'r', status: 'single', text: 'Varianten: von oben schräg nach unten, waagerecht oder von unten nach oben.', src: ['R1'],
        explain: 'Rodríguez-Perea et al. 2023 (51 Aktive, Volltext) testeten den waagerechten und den von unten kommenden Holzhacker. Die hier gezeichnete Bahn von oben nach unten ist eine verbreitete Variante, nicht aus dieser Studie.' },
      { short: 'Rumpf', anchor: 'belly', side: 'l', status: 'single', text: 'Der Holzhacker gilt als Übung für die Rumpfdreher; Muskeldaten fehlen.', src: ['R1'],
        explain: 'Rodríguez-Perea et al. 2023 nutzten ihn als Krafttest der Rumpfdreher (waagerechte Variante am zuverlässigsten). Eine EMG-Messung zum Holzhacker haben wir nicht gefunden.' },
      { short: 'Leistung', anchor: 'shoulderR', side: 'r', status: 'single', text: 'Die höchste Leistung lag meist bei zwei Dritteln bis vier Fünfteln der Maximallast.', src: ['Z1'],
        explain: 'Zemková et al. 2017 (23 Männer, stehend am Kabelturm, Abstract): maximale Leistung je nach Person bei ≈ 67 %, 75 % oder 83 % der Maximallast; die mittlere Leistung ließ sich zuverlässig messen.' },
      { short: 'Ermüdung', anchor: 'knee', side: 'r', status: 'single', text: 'Über 20 Wiederholungen sank die Leistung um etwa 10–14 %.', src: ['Z1'],
        explain: 'Erste gegenüber letzten Wiederholungen bei der Last mit der höchsten Leistung (Zemková et al. 2017, Abstract).' }
    ],
    sources: {
      R1: { label: 'Rodríguez-Perea et al. 2023, Healthcare', url: 'https://doi.org/10.3390/healthcare11162331', read: 'fulltext' },
      Z1: { label: 'Zemková et al. 2017, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000001692', read: 'abstract' }
    }
  },

  // ---------- Runde 12: Pallof Press (Frontansicht) ----------
  {
    ref: 'pallof-press', checkedAt: '2026-10-21', view: 'front', basis: 'protocol',
    basisNote: 'Frontansicht, Kabel von rechts. Endstellung nach Juan-Recio et al. 2025 (Volltext): beide Hände am Griff, Arme gestreckt senkrecht zum Körper auf Schulterhöhe, Kabel waagerecht. Die übliche Form streckt und beugt dabei die Ellbogen (dort beschrieben, aber nur gestreckt gehalten gemessen). Von vorn sind die nach vorn gestreckten Arme stark verkürzt; die Hände bleiben vor der Körpermitte. Stand und leicht gebeugte Knie sind Zeichenkonvention.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1,5 s strecken, 2 s halten, 1,5 s zurück (Konvention). Juan-Recio et al. 2025 hielten die gestreckte Stellung 15 s.' },
    frames: [
      { label: 'An der Brust', pose: { trunk: C(0, 'Rumpf ruhig'), legs: PAL.legs, armPoints: PAL.chest, props: palProps } },
      { label: 'Gestreckt', pose: { trunk: C(0, 'Rumpf dreht nicht mit'), legs: PAL.legs, armPoints: PAL.out, props: palProps },
        facts: [V(90, 'J1', 'fulltext', 'Arme gestreckt, senkrecht zum Körper auf Schulterhöhe')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'An der Brust', kp: [1] }, { a: 0, b: 1, dur: 1.5, label: 'Strecken', kp: [0] }, { a: 1, b: 1, dur: 2.0, label: 'Halten', kp: [0, 4] }, { a: 1, b: 0, dur: 1.5, label: 'Zurück', kp: [2] }],
    keyPoints: [
      { short: 'Rumpf', anchor: 'belly', side: 'l', status: 'single', text: 'Arme nach vorn strecken, ohne dass Rumpf und Becken zum Kabel drehen.', src: ['J1'],
        explain: 'So definieren Juan-Recio et al. 2025 die Übung (Volltext): Wirbelsäule und Becken bleiben neutral gegen das Drehmoment des seitlichen Zugs; gestreckte Arme verlängern den Hebel und machen es schwerer.' },
      { short: 'Kabel', anchor: 'handR', side: 'r', status: 'single', text: 'Kabel waagerecht auf Höhe der gestreckten Hände.', src: ['J1'],
        explain: 'Im Protokoll war der Zug über eine Rolle so eingestellt, dass er waagerecht und in Linie mit den Händen lief (Juan-Recio et al. 2025).' },
      { short: 'Stand', anchor: 'knee', side: 'r', status: 'single', text: 'Kniend ist es leichter, im schmalen Stand oder auf weicher Unterlage schwerer.', src: ['J1'],
        explain: 'Beckenbewegung (Beschleunigung) bei 12 Aktiven: kniend 0,17, Füße zusammen 0,22, Füße hintereinander 0,31, auf einem Halbball 0,55–0,61 m/s² (Juan-Recio et al. 2025).' },
      { short: 'Rücken', anchor: 'hipL', side: 'l', status: 'single', text: 'Als Krafttest auch bei chronischen Rückenschmerzen zuverlässig.', src: ['F1'],
        explain: 'Franco-López et al. 2024 (35 Personen um 48 Jahre, mit und ohne chronische Rückenschmerzen, Abstract): Pallof Press mit Band als Test sehr zuverlässig; Beschwerden während oder nach dem Test wurden nicht berichtet.' },
      { short: 'Lehnen', anchor: 'shoulderL', side: 'l', status: 'single', text: 'Seitlich vom Kabel wegzulehnen ist Ausgleich; der Körper bleibt aufrecht.', src: ['J1'],
        explain: 'Im Stand lehnten sich viele Teilnehmende vom Zug weg, vor allem mit kleiner Standfläche (Juan-Recio et al. 2025, Beobachtung an den Bildern, nicht gemessen).' }
    ],
    sources: {
      J1: { label: 'Juan-Recio et al. 2025, Medicina (Kaunas)', url: 'https://doi.org/10.3390/medicina61020312', read: 'fulltext' },
      F1: { label: 'Franco-López et al. 2024, Sensors', url: 'https://doi.org/10.3390/s24134131', read: 'abstract' }
    }
  },
  // ---------- Runde 13 (v2.18): Ab-Wheel-Rollout ----------
  {
    ref: 'ab-wheel-rollout', checkedAt: '2026-10-21', view: 'side', basis: 'protocol',
    basisNote: 'Ablauf nach Escamilla et al. 2006 (Power Wheel, Volltext) und Youdas et al. 2008 (Ab-Slide, Volltext): Start im Vierfüßlerstand mit etwa 90° in Hüfte und Schulter, Arme gestreckt, Wirbelsäule und Becken neutral; geradeaus nach vorn rollen, bis der Körper gestreckt ist bzw. die Unterarme fast den Boden berühren, dann zurück. Gemessen wurden keine Winkel: Das Ende ist so gelöst, dass die Brust ≈ 4 cm über dem Boden bleibt, die Zwischenbilder halten die Arme gestreckt und das Rad am Boden (Raddurchmesser ≈ 18 cm, Konvention).',
    tempo: { basis: 'protocol', note: '1 s hinaus, 1 s halten, 1 s zurück, 1 s Pause (Metronom; Escamilla et al. 2006 und Youdas et al. 2008).' },
    frames: ROLL.frames.map((q, i) => ({ label: i === 0 ? 'Vierfüßler' : i === 8 ? 'Gestreckt' : 'Rollen ' + i, pose: { ...ROLL.base, rootPos: [0, ROLL.y], trunk: i === 0 ? K(q.trunk, 'E1', 'gelöst: Hüfte und Schulter 90°, Rad am Boden') : i === 8 ? K(q.trunk, 'Y1', 'gelöst: Brust ≈ 4 cm über dem Boden') : C(q.trunk), knee: C(q.knee), armWorld: q.wrist, elbowSide: 1, props: rollProps },
      facts: i === 0 ? [V(90, 'E1', 'fulltext', 'Hüfte und Schulter ≈ 90° im Vierfüßlerstand')] : i === 8 ? [V(0, 'E1', 'fulltext', 'Körper gestreckt, Wirbelsäule und Becken neutral')] : [] })), // Bilder 1–7: Zwischenbilder (Arme gestreckt, Rad am Boden)
    phases: [{ a: 0, b: 0, dur: 1.0, label: 'Vierfüßler', kp: [0] }, ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ a: i, b: i + 1, dur: ROLL.durs[i], label: 'Hinaus', kp: [1, 4] })), { a: 8, b: 8, dur: 1.0, label: 'Gestreckt', kp: [1, 2] },
      ...[8, 7, 6, 5, 4, 3, 2, 1].map((i) => ({ a: i, b: i - 1, dur: ROLL.durs[i - 1], label: 'Zurück', kp: [3] }))],
    keyPoints: [
      { short: 'Start', anchor: 'hand', side: 'r', status: 'consensus', text: 'Aus dem Vierfüßlerstand mit gestreckten Armen geradeaus nach vorn rollen.', src: ['E1', 'Y1'],
        explain: 'Beide Protokolle (Volltext): Hände am Rad, Knie am Boden, Hüfte und Schulter etwa 90°; die Ellbogen bleiben gestreckt, das Rad läuft in einer geraden Linie.' },
      { short: 'Rücken', anchor: 'lowBack', side: 'l', status: 'consensus', text: 'Wirbelsäule und Becken bleiben neutral – nicht durchhängen.', src: ['E1', 'Y1'],
        explain: 'Anweisung in beiden Studien. Escamilla et al. 2006 erklären, dass die Bauchmuskeln dabei vor allem halten (isometrisch) und gegen das Durchhängen arbeiten; gemessen wurde die Haltung nicht.' },
      { short: 'Bauch', anchor: 'belly', side: 'r', status: 'consensus', text: 'Hohe Bauch-Aktivität bei wenig Arbeit der Hüftbeuger.', src: ['Y1', 'E1'],
        explain: 'Youdas et al. 2008 (22 Personen): gerader Bauchmuskel 79 %, innerer schräger 70 %, äußerer schräger 63 %, gerader Oberschenkelmuskel 28 % der maximalen Anspannung. Escamilla et al. 2006 (21 Personen): Rollout unter den höchsten Bauch- und Latissimus-Werten, wenig Hüftbeuger und Rückenstrecker.' },
      { short: 'Schulter', anchor: 'shoulder', side: 'l', status: 'single', text: 'Schultern und Rücken werden stark gefordert; bei Beschwerden dort vorsichtig sein.', src: ['Y1'],
        explain: 'Die Teilnehmenden berichteten von hoher Belastung in Schultern und Rücken; die Autoren halten die Übung bei Problemen an Wirbelsäule oder Armen für womöglich ungeeignet (Youdas et al. 2008). Das ist ihre Einschätzung, Beschwerden wurden nicht erfasst.' },
      { short: 'Bremsen', anchor: 'back', side: 'l', status: 'single', text: 'Beim Hinausrollen bremst der breite Rückenmuskel die Arme.', src: ['E1'],
        explain: 'Escamilla et al. 2006 deuten die hohe Latissimus-Aktivität so: Er arbeitet beim Hinausrollen bremsend gegen die Schulterbeugung und beim Zurückrollen ziehend.' }
    ],
    sources: {
      E1: { label: 'Escamilla et al. 2006, Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/16649890/', read: 'fulltext' },
      Y1: { label: 'Youdas et al. 2008, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e31818745bf', read: 'fulltext' }
    }
  },

  // ---------- Runde 13: Fahrrad-Crunch ----------
  {
    ref: 'bicycle-crunch', checkedAt: '2026-10-21', view: 'side', basis: 'protocol',
    basisNote: 'Nach dem Criss-Cross bei Pereira et al. 2017 (Volltext), der dem Fahrrad-Crunch weitgehend entspricht: Rückenlage, Kopf und oberer Rücken angehoben, Becken neutral, Lendenwirbelsäule auf der Matte; das gestreckte Bein wurde mit einer Kiste bei 30° Hüftbeugung begrenzt. Die Drehung des Oberkörpers zum Knie zeigt die Seitenansicht nicht; das Einrollen ist wie beim Crunch gelöst (Schulterblätter ≈ 4 cm angehoben). Hüfte und Knie des angezogenen Beins sind Konvention.',
    tempo: { basis: 'protocol', note: 'Metronom 40 Schläge je Minute (Pereira et al. 2017); wie die Schläge auf die Bewegung verteilt waren, steht nicht im Text. Gezeichnet je Seitenwechsel 1,5 s.' },
    frames: [
      { label: 'Rechts', pose: { root: 'hip', rootPos: [0, BIKE.yR], trunk: C(FLOOR.lie), curl: K(FLOOR.crunchCurl, 'P1', 'Kopf und oberer Rücken angehoben (wie Crunch gelöst)'), headTilt: C(10), hip: C(BIKE.bent.hip, 'Knie zur Brust'), knee: C(BIKE.bent.knee), ankle: C(-10), leg2: { hip: V(BIKE.straight.hip, 'P1', 'protocol', 'gestrecktes Bein bis 30° Hüftbeugung (Kiste)'), knee: V(0, 'P1', 'protocol', 'Knie gestreckt'), ankle: -10 }, armTargetTrunk: [-2, 38], armScale: [0.35, 0.7], elbowSide: 1, props: matProps } },
      { label: 'Links', pose: { root: 'hip', rootPos: [0, BIKE.yL], trunk: C(FLOOR.lie), curl: K(FLOOR.crunchCurl, 'P1'), headTilt: C(10), hip: V(BIKE.straight.hip, 'P1', 'protocol', 'gestrecktes Bein bis 30° Hüftbeugung'), knee: V(0, 'P1', 'protocol'), ankle: C(-10), leg2: { hip: BIKE.bent.hip, knee: BIKE.bent.knee, ankle: -10 }, armTargetTrunk: [-2, 38], armScale: [0.35, 0.7], elbowSide: 1, props: matProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Rechts', kp: [1] }, { a: 0, b: 1, dur: 1.2, label: 'Wechseln', kp: [0, 4] }, { a: 1, b: 1, dur: 0.3, label: 'Links', kp: [1] }, { a: 1, b: 0, dur: 1.2, label: 'Wechseln', kp: [2, 3] }],
    keyPoints: [
      { short: 'Bein', anchor: 'knee', side: 'r', status: 'single', text: 'Das gestreckte Bein nicht tiefer als etwa 30° über dem Boden führen.', src: ['P1'],
        explain: 'Pereira et al. 2017 (32 Pilates-Anfänger, Volltext) begrenzten die Hüftstreckung mit einer Kiste auf 30° Beugung bei gestrecktem Knie, damit alle die Übung sauber ausführen konnten.' },
      { short: 'Bauch', anchor: 'belly', side: 'r', status: 'single', text: 'Mit Drehung waren gerader und schräge Bauchmuskeln am stärksten aktiv.', src: ['P1'],
        explain: 'Criss-Cross gegenüber Single Leg Stretch und Dead Bug (Gesunde): gerader Bauchmuskel 86 %, äußerer schräger 94 %, innerer schräger 108 % der maximalen Anspannung (Pereira et al. 2017).' },
      { short: 'Lende', anchor: 'lowBack', side: 'l', status: 'single', text: 'Lendenwirbelsäule auf der Matte, Becken neutral halten.', src: ['P1'],
        explain: 'Eine Physiotherapeutin prüfte und korrigierte das während der Messung (Pereira et al. 2017). Gemessen wurde die Beckenstellung nicht.' },
      { short: 'Rücken', anchor: 'back', side: 'l', status: 'single', text: 'Auch mit chronischen Rückenschmerzen wurde eine ähnliche Bauch-Aktivität erreicht.', src: ['P1'],
        explain: '13 Personen mit chronischen Rückenschmerzen erreichten ähnliche Werte wie die Gesunden (Pereira et al. 2017). Die Autoren empfehlen den Criss-Cross erst nach Dead Bug und Single Leg Stretch – eine Reihenfolge nach Muskelaktivität, kein Trainingsversuch.' },
      { short: 'Tempo', anchor: 'foot', side: 'r', status: 'single', text: 'Ruhig im Takt, nicht schwingen.', src: ['P1'],
        explain: 'Takt per Metronom (40/min) und Ansage (Pereira et al. 2017). Gezeichnet 1,5 s je Seitenwechsel.' }
    ],
    sources: {
      P1: { label: 'Pereira et al. 2017, J Manipulative Physiol Ther', url: 'https://doi.org/10.1016/j.jmpt.2017.02.010', read: 'fulltext' }
    }
  },

  // ---------- Runde 13: Hüftbeugen am Kabel (stehend) ----------
  {
    ref: 'standing-cable-hip-flexion', checkedAt: '2026-10-21', view: 'side', basis: 'convention',
    basisNote: 'Keine Studie zum Hüftbeugen am Kabel gefunden (PubMed-Suche 2026-10-21). Gezeichnet ist ein üblicher Aufbau: Manschette am Knöchel des arbeitenden (nahen) Beins, Kabel von der unteren Rolle hinter der Figur, aufrecht, Knie bis Hüfthöhe. Die Muskelangaben stammen aus der Hüftbeugung gegen Widerstand (Juker et al. 1998, Abstract) und dem gestreckten Beinheben in Rückenlage (Hu et al. 2010, Volltext).',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s heben, kurz halten, 2 s senken (Konvention).' },
    frames: [
      { label: 'Unten', pose: { ...HFX.pose, hip: C(0, 'Bein neben dem Standbein, Kabel gespannt'), knee: C(0), ankle: C(0), props: hfxProps } },
      { label: 'Oben', pose: { ...HFX.pose, hip: C(90, 'Oberschenkel waagerecht (Knie auf Hüfthöhe)'), knee: C(90), ankle: C(0), props: hfxProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Heben', kp: [0, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [1] }],
    keyPoints: [
      { short: 'Heben', anchor: 'thigh', side: 'r', status: 'single', text: 'Knie gegen den Zug bis etwa Hüfthöhe heben.', src: ['J1'],
        explain: 'Der Lendenteil des großen Lendenmuskels war bei maximaler Hüftbeugung gegen Widerstand am stärksten aktiv (Juker et al. 1998, Feindraht-EMG, 8 Personen, Abstract). Die Höhe hier ist Zeichenkonvention; eine Kabelübung wurde nicht getestet.' },
      { short: 'Becken', anchor: 'belly', side: 'r', status: 'single', text: 'Becken ruhig halten – die Bauchmuskeln halten dagegen.', src: ['H1'],
        explain: 'Beim gestreckten Beinheben arbeiteten schräge und quere Bauchmuskeln mit; die Autoren deuten das so, dass sie das Becken gegen den Zug der Hüftbeuger festhalten (Hu et al. 2010, 17 Frauen, Volltext, Rückenlage – hier übertragen).' },
      { short: 'Muskeln', anchor: 'hip', side: 'r', status: 'single', text: 'Hauptbeweger sind Darmbeinmuskel und gerader Oberschenkelmuskel.', src: ['H1'],
        explain: 'Beim gestreckten Beinheben war der Darmbeinmuskel (Feindraht) auf der hebenden Seite am stärksten aktiv, an der Oberfläche der gerade Oberschenkelmuskel (Hu et al. 2010). Im Stand am Kabel nicht gemessen.' }
    ],
    sources: {
      J1: { label: 'Juker et al. 1998, Med Sci Sports Exerc', url: 'https://doi.org/10.1097/00005768-199802000-00020', read: 'abstract' },
      H1: { label: 'Hu et al. 2010, J Biomech', url: 'https://doi.org/10.1016/j.jbiomech.2009.09.035', read: 'fulltext' }
    }
  },

  // ---------- Runde 13: Seitbeugen mit Kurzhantel (Frontansicht) ----------
  {
    ref: 'dumbbell-side-bend', checkedAt: '2026-10-21', view: 'front', basis: 'transfer',
    basisNote: 'Frontansicht. Übertragen vom Seitbeugen mit Wasserweste (Kang & Park 2026, Volltext): hüftbreiter Stand, Seitneigung bis zum bequemen Endbereich im Takt, ohne Beckendrehung und ohne Vor- oder Rückneigung. Mit Kurzhantel wurde nicht gemessen. Gezeichnet 25° zur Hantelseite und 6° zurück über die Mitte (Gradzahlen Konvention); die freie Hand liegt an der Hüfte (in der Studie Arme vor der Brust gekreuzt).',
    tempo: { basis: 'protocol', note: 'Metronom 60/min (Kang & Park 2026); gezeichnet 1,5 s hinunter, 1,5 s zurück.' },
    frames: [
      { label: 'Aufrecht', pose: { trunk: C(SBD.up, 'leicht zur Gegenseite'), legs: SBD.legs, arm: { abd: C(0, 'Arm hängt mit der Hantel'), elbow: C(4) }, armL: { points: SBD.handUp }, props: sbdProps } },
      { label: 'Seitlich', pose: { trunk: C(SBD.down, 'zur Hantelseite geneigt (bequemer Endbereich)'), legs: SBD.legs, arm: { abd: C(0), elbow: C(4) }, armL: { points: SBD.handDown }, props: sbdProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Aufrecht', kp: [1] }, { a: 0, b: 1, dur: 1.5, label: 'Neigen', kp: [1, 3] }, { a: 1, b: 1, dur: 0.2, label: 'Seitlich', kp: [0] }, { a: 1, b: 0, dur: 1.5, label: 'Aufrichten', kp: [0, 2] }],
    keyPoints: [
      { short: 'Last', anchor: 'belly', side: 'l', status: 'single', text: 'Mehr Last ließ vor allem die schrägen Bauchmuskeln deutlich mehr arbeiten.', src: ['K1'],
        explain: 'Kang & Park 2026 (17 Aktive, Wasserweste 8–16 kg, Volltext): äußerer schräger Bauchmuskel 104 → 158 %, innerer 97 → 156 % der maximalen Anspannung. Eine Wasserweste schwappt; mit einer Hantel ist es nicht gemessen.' },
      { short: 'Becken', anchor: 'hipL', side: 'l', status: 'single', text: 'Becken und Beine bleiben ruhig; nicht nach vorn oder hinten drehen.', src: ['K1'],
        explain: 'Durchgänge mit deutlicher Beckendrehung, Vor- oder Rückneigung des Rumpfs oder veränderter Beinstellung wurden wiederholt (Kang & Park 2026).' },
      { short: 'Stufen', anchor: 'shoulderR', side: 'r', status: 'single', text: 'Erst ab etwa 4 kg mehr änderte sich die Muskelaktivität messbar.', src: ['K1'],
        explain: 'Zwischen benachbarten Stufen (2 kg) gab es kaum Unterschiede, meist erst bei 4–6 kg Abstand (Kang & Park 2026). Mit Hanteln nicht geprüft.' },
      { short: 'Weg', anchor: 'handR', side: 'r', status: 'single', text: 'Im ruhigen Takt bis zum bequemen Endpunkt neigen.', src: ['K1'],
        explain: 'Seitneigung bis zum bequemen Endbereich, im Takt eines Metronoms (60/min), je Seite 4 Wiederholungen (Kang & Park 2026). Den Winkel haben sie nicht gemessen.' }
    ],
    sources: {
      K1: { label: 'Kang & Park 2026, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk11010089', read: 'fulltext' }
    }
  },

  // ---------- Runde 13: Russian Twist (Frontansicht) ----------
  {
    ref: 'russian-twist', checkedAt: '2026-10-21', view: 'front', basis: 'convention',
    basisNote: 'Frontansicht. Keine Studie zum Russian Twist gefunden (PubMed-Suche 2026-10-21). Gezeichnet: Sitz auf der Matte, Rumpf zurückgelehnt, Knie hoch, Füße angehoben, die Hände schwenken zusammen von einer Seite zur anderen. Die Drehung um die Längsachse zeigt die Frontfigur nicht – sichtbar sind der Weg der Hände und eine leichte Seitneigung. Muskelangaben aus der isometrischen Rumpfdrehung im Sitz (Kumar et al. 2001, Volltext) und dem Criss-Cross (Pereira et al. 2017, Volltext).',
    tempo: { basis: 'convention', note: 'Gezeichnet 2 s je Seite (Konvention).' },
    frames: RTW.path.map((q, i) => ({ label: i === 0 ? 'Rechts' : i === 8 ? 'Links' : i === 4 ? 'Mitte' : 'Drehen ' + i, pose: { root: 'pelvis', rootPos: RTW.PEL, trunkFlex: C(40, 'zurückgelehnt (Konvention)'), trunk: C(q.trunk), legs: RTW.legs, legsFront: true, armPoints: q.armPoints, armL: q.armL, props: rtwProps } })), // Bilder 1–5: Zwischenbilder auf dem Weg der Hände
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Rechts', kp: [0] }, ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ a: i, b: i + 1, dur: 0.25, label: 'Nach links', kp: [0, 1] })), { a: 8, b: 8, dur: 0.3, label: 'Links', kp: [0] },
      ...[8, 7, 6, 5, 4, 3, 2, 1].map((i) => ({ a: i, b: i - 1, dur: 0.25, label: 'Nach rechts', kp: [1, 2] }))],
    keyPoints: [
      { short: 'Drehen', anchor: 'belly', side: 'r', status: 'single', text: 'Die Drehung kommt vor allem aus den schrägen Bauchmuskeln.', src: ['K1'],
        explain: 'Bei der Rumpfdrehung im Sitz starteten und trugen der äußere schräge Bauchmuskel der Gegenseite und der innere der Drehseite die Bewegung mit (Kumar et al. 2001, 50 Personen, isometrisch, Volltext). Beim Russian Twist selbst nicht gemessen.' },
      { short: 'Rücken', anchor: 'shoulderL', side: 'l', status: 'single', text: 'Breiter Rückenmuskel und Rückenstrecker der Drehseite arbeiten mit.', src: ['K1'],
        explain: 'Bei Männern war der breite Rückenmuskel der Drehseite am stärksten aktiv, der Rückenstrecker der gleichen Seite ebenfalls hoch; bei Frauen der große Brustmuskel der Gegenseite (Kumar et al. 2001). Die Autoren vermuten, dass der Schultergurt des Geräts das mitbestimmte.' },
      { short: 'Vergleich', anchor: 'chest', side: 'r', status: 'single', text: 'Übungen mit Drehung aktivierten die schrägen Bauchmuskeln stärker als ohne.', src: ['P1'],
        explain: 'Der Criss-Cross mit Drehung lag bei den schrägen und dem geraden Bauchmuskel über Single Leg Stretch und Dead Bug (Pereira et al. 2017); die Autoren verweisen auf weitere Studien mit demselben Befund. Übertragen auf den Russian Twist.' }
    ],
    sources: {
      K1: { label: 'Kumar et al. 2001, Eur J Appl Physiol', url: 'https://doi.org/10.1007/s004210100510', read: 'fulltext' },
      P1: { label: 'Pereira et al. 2017, J Manipulative Physiol Ther', url: 'https://doi.org/10.1016/j.jmpt.2017.02.010', read: 'fulltext' }
    }
  },
  // ---------- Runde 14 (v2.19): Wadenheben sitzend ----------
  {
    ref: 'seated-calf-raise', checkedAt: '2026-10-21', view: 'side', basis: 'protocol',
    basisNote: 'Kniewinkel 90° aus dem Trainingsprotokoll von Kinoshita et al. 2023 (Abstract). Sprunggelenk 25° Dorsalflexion bis 30° Plantarflexion, Blockhöhe, Sitz und Polster sind Konvention. Hüfte und Fußballen bleiben am Platz; Schienbein und Knie sind je Bild so gelöst, dass das Knie mit der Ferse steigt.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s hoch, kurz halten, 2 s runter (Konvention; das Abstract nennt kein Tempo).' },
    frames: [
      { label: 'Unten', pose: { root: 'toe', rootPos: SCR.toe, trunk: C(0, 'aufrecht'), shank: C(SCR.down.shank, 'gelöst: Hüfte und Ballen bleiben am Platz'), knee: V(SCR.down.knee, 'K2', 'protocol', 'Knie ≈ 90° gebeugt'), ankle: C(25, 'Ferse unter Blockhöhe'), armWorld: SCR.down.hand, elbowSide: -1, props: scrProps } },
      { label: 'Mitte', pose: { root: 'toe', rootPos: SCR.toe, trunk: C(0), shank: C(SCR.mid.shank, 'gelöst'), knee: C(SCR.mid.knee, 'gelöst'), ankle: C(-2.5, 'Zwischenbild, damit die Hüfte auf dem Sitz bleibt'), armWorld: SCR.mid.hand, elbowSide: -1, props: scrProps } },
      { label: 'Oben', pose: { root: 'toe', rootPos: SCR.toe, trunk: C(0), shank: C(SCR.up.shank, 'gelöst'), knee: C(SCR.up.knee, 'gelöst: Knie hebt sich mit der Ferse'), ankle: C(-30, 'hoch auf den Ballen'), armWorld: SCR.up.hand, elbowSide: -1, props: scrProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Unten, kurz halten', kp: [2] }, { a: 0, b: 1, dur: 0.5, label: 'Hochdrücken', kp: [0, 1] }, { a: 1, b: 2, dur: 0.5, label: 'Hochdrücken', kp: [0, 1] }, { a: 2, b: 2, dur: 0.3, label: 'Oben', kp: [2] }, { a: 2, b: 1, dur: 1.0, label: 'Absenken', kp: [0] }, { a: 1, b: 0, dur: 1.0, label: 'Absenken', kp: [0] }],
    keyPoints: [
      { short: 'Soleus', anchor: 'shin', side: 'l', status: 'single', text: 'Mit 90° gebeugtem Knie trainiert vor allem der Schollenmuskel (Soleus).', src: ['K2'],
        explain: '12 Wochen, 14 Untrainierte, 70 % 1RM: Der Soleus wuchs sitzend ähnlich wie stehend (2,9 % vs. 2,1 %), der Zwillingswadenmuskel sitzend kaum (0,6–1,7 % vs. 9,2–12,4 %) (Kinoshita et al. 2023, Abstract).' },
      { short: 'Zwilling', anchor: 'knee', side: 'r', status: 'consensus', text: 'Den Zwillingswadenmuskel lieber mit gestrecktem Knie trainieren (stehend).', src: ['A2', 'K2'],
        explain: 'Bei 90° Kniebeugung war das Oberflächen-EMG des inneren Zwillingswadenmuskels im Mittel etwa fünfmal kleiner als bei gestrecktem Knie (Avancini et al. 2015, isometrisch, 22 Personen, Abstract); im Training wuchs er sitzend kaum (Kinoshita et al. 2023).' },
      { short: 'Weg', anchor: 'heel', side: 'l', status: 'single', text: 'Ganzen Weg nutzen: Ferse unter Blockhöhe, oben hoch auf die Ballen.', src: ['S1'],
        explain: 'Gemessen nur im Stand: Dorsalflexion −31 ± 6,8° bis Plantarflexion 33,6 ± 7,8° beim einbeinigen Wadenheben (Larsen et al. 2025, Volltext). Sitzend ist der gezeichnete Weg Konvention.' }
    ],
    sources: {
      K2: { label: 'Kinoshita et al. 2023, Front Physiol', url: 'https://doi.org/10.3389/fphys.2023.1272106', read: 'abstract' },
      A2: { label: 'Avancini et al. 2015, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0126888', read: 'abstract' },
      S1: { label: 'Larsen et al. 2025, Eur J Sport Sci', url: 'https://doi.org/10.1002/ejsc.70030', read: 'fulltext' }
    }
  },

  // ---------- Runde 14: Wadenheben an der Beinpresse ----------
  {
    ref: 'leg-press-calf-raise', checkedAt: '2026-10-21', view: 'side', basis: 'convention',
    basisNote: 'Gezeichnet an der 45°-Beinpresse der App: Knie fast gestreckt, nur die Fußballen an der unteren Plattenkante, die Ferse hängt frei; die Platte folgt den Ballen entlang der Schienen. Winkel Konvention. Die Trainingsstudie (Nunes et al. 2020, Abstract) nutzte eine sitzende waagerechte Beinpresse und trainierte jedes Bein einzeln.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s drücken, kurz halten, 2 s zurück (Konvention).' },
    frames: [
      { label: 'Gedehnt', pose: { ...LPC.pose, ankle: C(25, 'Ferse sinkt unter die Plattenkante'), props: lpcProps } },
      { label: 'Gestreckt', pose: { ...LPC.pose, ankle: C(-30, 'Ballen drücken die Platte weg'), props: lpcProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Gedehnt', kp: [1] }, { a: 0, b: 1, dur: 1.0, label: 'Drücken', kp: [0, 1] }, { a: 1, b: 1, dur: 0.3, label: 'Gestreckt', kp: [0] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [2] }],
    keyPoints: [
      { short: 'Füße', anchor: 'toe', side: 'r', status: 'single', text: 'Fußspitzen außen betonen eher den inneren, innen eher den äußeren Wadenkopf.', src: ['N1'],
        explain: '9 Wochen, 22 junge Männer, je Bein eine Fußstellung: innerer Kopf +8,4 % (außen) vs. +3,8 % (innen), äußerer Kopf +9,1 % (innen) vs. +5,5 % (außen); gerade lag dazwischen (Nunes et al. 2020, Ultraschall, Abstract).' },
      { short: 'Knie', anchor: 'knee', side: 'l', status: 'single', text: 'Knie fast gestreckt lassen – so arbeitet auch der Zwillingswadenmuskel voll mit.', src: ['A2'],
        explain: 'Mit gestrecktem Knie war das EMG des inneren Zwillingswadenmuskels im Mittel etwa fünfmal größer als bei 90° Kniebeugung (Avancini et al. 2015, isometrisch, Abstract).' },
      { short: 'Einbeinig', anchor: 'plate', side: 'r', status: 'single', text: 'Einbeinig geht auch – so wurde in der Studie jedes Bein getrennt trainiert.', src: ['N1'],
        explain: 'Nunes et al. 2020: einbeinig an einer sitzenden waagerechten Beinpresse, 3–4 Sätze mit 20–25 Wiederholungen, dreimal pro Woche (Abstract).' }
    ],
    sources: {
      N1: { label: 'Nunes et al. 2020, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003674', read: 'abstract', note: 'Waagerechte Beinpresse, nicht 45°-Schlitten' },
      A2: { label: 'Avancini et al. 2015, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0126888', read: 'abstract' }
    }
  },

  // ---------- Runde 14: Wadenheben einbeinig ----------
  {
    ref: 'single-leg-calf-raise', checkedAt: '2026-10-21', view: 'side', basis: 'measured',
    basisNote: 'Sprunggelenkwinkel aus Larsen et al. 2025 (Volltext; einbeiniges Wadenheben, Bewegungsumfang je Person per Goniometer eingestellt). Hier ohne Zusatzlast auf einer Stufe (≈ 14 cm), eine Hand an der Wand, das freie Bein angewinkelt – Konvention.',
    tempo: { basis: 'protocol', note: 'Gezeichnet 1 s hoch, 2 s runter, unten kurz halten (wie im Protokoll von Larsen et al. 2025 beim Wadenheben stehend).' },
    frames: [
      { label: 'Unten', pose: { root: 'toe', rootPos: [30, -STEP - 2], shank: C(0), knee: V(0, 'S1', 'protocol', 'Knie gestreckt'), hip: C(0), ankle: V(31, 'S1', 'fulltext', '−31 ± 6,8° (Dorsalflexion)'), leg2: { hip: C(8, 'freies Bein hinten angewinkelt'), knee: C(80), ankle: C(-25) }, armWorld: SLC.hand, elbowSide: -1, props: slcProps } },
      { label: 'Oben', pose: { root: 'toe', rootPos: [30, -STEP - 2], shank: C(0), knee: V(0, 'S1', 'protocol', 'Knie gestreckt'), hip: C(0), ankle: V(-33.6, 'S1', 'fulltext', '+33,6 ± 7,8° Plantarflexion'), leg2: { hip: C(8), knee: C(80), ankle: C(-25) }, armWorld: SLC.hand, elbowSide: -1, props: slcProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Unten, kurz halten', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Hochdrücken', kp: [0, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [0] }, { a: 1, b: 0, dur: 2.0, label: 'Absenken', kp: [1] }],
    keyPoints: [
      { short: 'Weg', anchor: 'heel', side: 'l', status: 'single', text: 'Ferse tief unter Stufenhöhe senken, oben hoch auf den Ballen.', src: ['S1'],
        explain: 'Gemessener Bewegungsumfang beim einbeinigen Wadenheben: Dorsalflexion −31 ± 6,8°, Plantarflexion 33,6 ± 7,8° (Larsen et al. 2025). Ob die gedehnte Position mehr bringt, ist offen (siehe Wadenheben stehend).' },
      { short: 'Ermüdung', anchor: 'shin', side: 'l', status: 'single', text: 'Bis zur Erschöpfung sinkt die Kraft der Wade deutlich – Pausen einplanen.', src: ['SA'],
        explain: '28 junge Erwachsene, einbeiniges Fersenheben bis zum Abbruch: maximale isometrische Kraft danach 20,5 % niedriger, vor allem durch geringere Ansteuerung; die Zahl der Wiederholungen sagte die Maximalkraft nicht voraus (Sara et al. 2021, Abstract).' },
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'single', text: 'Knie gestreckt halten – so arbeitet der Zwillingswadenmuskel stärker.', src: ['A2'],
        explain: 'Mit gestrecktem Knie war das EMG des inneren Zwillingswadenmuskels im Mittel etwa fünfmal größer als bei 90° Kniebeugung (Avancini et al. 2015, isometrisch, Abstract).' }
    ],
    sources: {
      S1: { label: 'Larsen et al. 2025, Eur J Sport Sci', url: 'https://doi.org/10.1002/ejsc.70030', read: 'fulltext' },
      SA: { label: 'Sara et al. 2021, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0253276', read: 'abstract' },
      A2: { label: 'Avancini et al. 2015, PLoS One', url: 'https://doi.org/10.1371/journal.pone.0126888', read: 'abstract' }
    }
  },

  // ---------- Runde 14: Abduktoren-Maschine (Frontansicht) ----------
  {
    ref: 'hip-abduction-machine', checkedAt: '2026-10-21', view: 'front', basis: 'convention',
    basisNote: 'Frontansicht, sitzend. Keine Bewegungsmessung an der Abduktorenmaschine gefunden (PubMed-Suche 2026-10-21). Die Oberschenkel zeigen zum Betrachter und erscheinen stark verkürzt; die Knie wandern je Bein bis 38° nach außen. Sitz, Polster und Winkel sind Zeichenkonvention. Muskelangaben aus EMG-Studien (de Almeida Paz et al. 2022, Brandt et al. 2013; Abstracts).',
    tempo: { basis: 'convention', note: 'Gezeichnet 1,5 s öffnen, kurz halten, 2 s schließen (Konvention).' },
    frames: [
      { label: 'Geschlossen', pose: { root: 'pelvis', rootPos: HIPM.PEL, legs: HIPM.legs(HIPM.closed), legsFront: true, armPoints: HIPM.arms, props: hipmProps(false) } },
      { label: 'Geöffnet', pose: { root: 'pelvis', rootPos: HIPM.PEL, legs: HIPM.legs(HIPM.open), legsFront: true, armPoints: HIPM.arms, props: hipmProps(false) } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Geschlossen', kp: [2] }, { a: 0, b: 1, dur: 1.5, label: 'Öffnen', kp: [0] }, { a: 1, b: 1, dur: 0.3, label: 'Geöffnet', kp: [0] }, { a: 1, b: 0, dur: 2.0, label: 'Schließen', kp: [1] }],
    keyPoints: [
      { short: 'Gesäß', anchor: 'thighR', side: 'r', status: 'single', text: 'Der mittlere Gesäßmuskel arbeitet hier im Verhältnis am stärksten.', src: ['P1'],
        explain: '11 Männer, je 10 maximale Wiederholungen: Das Verhältnis mittlerer Gesäßmuskel zu Spanner der Oberschenkelfaszie war an der Maschine größer als beim seitlichen Beinheben und beim Clamshell; die Aktivität des Gesäßmuskels selbst unterschied sich nicht (de Almeida Paz et al. 2022, Abstract).' },
      { short: 'Band', anchor: 'kneeL', side: 'l', status: 'single', text: 'Mit Gummiband war der mittlere Gesäßmuskel stärker aktiv als an der Maschine.', src: ['B1'],
        explain: '16 untrainierte Frauen, vier Laststufen nach der Borg-Skala: Abduktion mit elastischem Widerstand rekrutierte den mittleren Gesäßmuskel stärker als die Maschine (Brandt et al. 2013, Abstract).' },
      { short: 'Last', anchor: 'belly', side: 'l', status: 'single', text: 'Die gefühlte Anstrengung (0–10) passt gut, um die Last zu wählen.', src: ['B1'],
        explain: 'Zusammenhang zwischen Borg-CR10 und normiertem EMG an der Abduktionsmaschine r = 0,62 ± 0,54 (Brandt et al. 2013, Abstract).' }
    ],
    sources: {
      P1: { label: 'de Almeida Paz et al. 2022, J Bodyw Mov Ther', url: 'https://doi.org/10.1016/j.jbmt.2022.01.001', read: 'abstract' },
      B1: { label: 'Brandt et al. 2013, Int J Sports Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/24377067/', read: 'abstract' }
    }
  },

  // ---------- Runde 14: Adduktoren-Maschine (Frontansicht) ----------
  {
    ref: 'hip-adduction-machine', checkedAt: '2026-10-21', view: 'front', basis: 'convention',
    basisNote: 'Frontansicht, sitzend, wie die Abduktorenmaschine; die Polster liegen innen an den Knien. Die Knie starten je Bein 38° außen und schließen bis fast zusammen. Keine Bewegungsmessung an der Maschine gefunden (PubMed-Suche 2026-10-21); Winkel Konvention. Muskelangaben aus EMG-Studien (Brandt et al. 2013, Serner et al. 2013; Abstracts).',
    tempo: { basis: 'convention', note: 'Gezeichnet 1,5 s schließen, kurz halten, 2 s öffnen (Konvention).' },
    frames: [
      { label: 'Geöffnet', pose: { root: 'pelvis', rootPos: HIPM.PEL, legs: HIPM.legs(HIPM.open), legsFront: true, armPoints: HIPM.arms, props: hipmProps(true) } },
      { label: 'Geschlossen', pose: { root: 'pelvis', rootPos: HIPM.PEL, legs: HIPM.legs(HIPM.closed), legsFront: true, armPoints: HIPM.arms, props: hipmProps(true) } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Geöffnet', kp: [0] }, { a: 0, b: 1, dur: 1.5, label: 'Schließen', kp: [0, 1] }, { a: 1, b: 1, dur: 0.3, label: 'Geschlossen', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Öffnen', kp: [2] }],
    keyPoints: [
      { short: 'Gleich', anchor: 'thighR', side: 'r', status: 'single', text: 'Maschine und Gummiband aktivierten die Adduktoren etwa gleich stark.', src: ['B1'],
        explain: '16 untrainierte Frauen, vier Laststufen: Für die Adduktoren waren elastischer Widerstand und Maschine ähnlich wirksam (Brandt et al. 2013, Abstract).' },
      { short: 'Band', anchor: 'kneeL', side: 'l', status: 'single', text: 'Adduktion gegen Gummiband zählt zu den intensiven Adduktionsübungen.', src: ['SE'],
        explain: '40 Elitefußballer, 8 Adduktionsübungen: Spitzen-EMG des langen Adduktors 14–108 %; Copenhagen-Adduktion und Adduktion mit Gummiband nennen die Autoren als dynamische Übungen mit hoher Intensität (Serner et al. 2013, Abstract). Ob eine Maschine dabei war, geht aus dem Abstract nicht hervor.' },
      { short: 'Last', anchor: 'belly', side: 'r', status: 'single', text: 'Die gefühlte Anstrengung (0–10) passt gut, um die Last zu wählen.', src: ['B1'],
        explain: 'Zusammenhang zwischen Borg-CR10 und normiertem EMG an der Adduktionsmaschine r = 0,69 ± 0,55 (Brandt et al. 2013, Abstract).' }
    ],
    sources: {
      B1: { label: 'Brandt et al. 2013, Int J Sports Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/24377067/', read: 'abstract' },
      SE: { label: 'Serner et al. 2013, Br J Sports Med', url: 'https://doi.org/10.1136/bjsports-2012-091746', read: 'abstract' }
    }
  },

  // ---------- Runde 14: Abduktion am Kabel stehend (Frontansicht) ----------
  {
    ref: 'cable-hip-abduction-standing', checkedAt: '2026-10-21', view: 'front', basis: 'convention',
    basisNote: 'Frontansicht. Keine Studie zur Abduktion am Kabel gefunden (PubMed-Suche 2026-10-21); übertragen wird die Abduktion gegen elastischen Widerstand im Stand (Brandt et al. 2013, Abstract). Gezeichnet: Stand auf dem linken Bein, Manschette am rechten Knöchel, Kabel von der unteren Rolle des Turms auf der Standbeinseite vor dem Standbein vorbei, Bein bis 35° seitlich, Rumpf neigt sich leicht zum Standbein. Winkel Konvention.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s heben, kurz halten, 2 s senken (Konvention).' },
    frames: [
      { label: 'Unten', pose: { root: 'ankleL', rootPos: CHIP.AL, trunk: C(CHIP.abd.down.lean), legs: { abdR: C(CHIP.abd.down.abd, 'Bein neben dem Standbein, Kabel gespannt') }, armPoints: CHIP.abd.down.armPoints, armL: CHIP.abd.down.armL, props: chipProps('L') } },
      { label: 'Oben', pose: { root: 'ankleL', rootPos: CHIP.AL, trunk: C(CHIP.abd.up.lean, 'leicht zum Standbein'), legs: { abdR: C(CHIP.abd.up.abd, 'Bein seitlich gehoben') }, armPoints: CHIP.abd.up.armPoints, armL: CHIP.abd.up.armL, props: chipProps('L') } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [2] }, { a: 0, b: 1, dur: 1.0, label: 'Heben', kp: [0] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [0, 1] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [2] }],
    keyPoints: [
      { short: 'Gesäß', anchor: 'thighR', side: 'r', status: 'single', text: 'Gegen Zug im Stand war der mittlere Gesäßmuskel stärker aktiv als an der Maschine.', src: ['B1'],
        explain: '16 untrainierte Frauen: Abduktion mit elastischem Widerstand im Stand rekrutierte den mittleren Gesäßmuskel stärker als die Abduktionsmaschine (Brandt et al. 2013, Abstract). Am Kabel nicht gemessen – übertragen.' },
      { short: 'Liegend', anchor: 'hipL', side: 'l', status: 'single', text: 'Ohne Gerät aktivierte seitliches Beinheben im Liegen den Muskel am stärksten.', src: ['D1'],
        explain: 'Unter 12 Übungen lag seitliches Beinheben im Liegen beim mittleren Gesäßmuskel vorn (81 ± 42 % der Maximalkraft) (Distefano et al. 2009, Abstract). Das Kabel wurde dort nicht getestet.' },
      { short: 'Last', anchor: 'belly', side: 'r', status: 'single', text: 'Die gefühlte Anstrengung (0–10) passt gut, um den Zug zu wählen.', src: ['B1'],
        explain: 'Zusammenhang zwischen Borg-CR10 und normiertem EMG bei der Abduktion mit elastischem Widerstand r = 0,66 ± 0,29 (Brandt et al. 2013, Abstract).' }
    ],
    sources: {
      B1: { label: 'Brandt et al. 2013, Int J Sports Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/24377067/', read: 'abstract', note: 'Elastischer Widerstand, nicht Kabel' },
      D1: { label: 'Distefano et al. 2009, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2009.2796', read: 'abstract' }
    }
  },

  // ---------- Runde 14: Adduktion am Kabel (Frontansicht) ----------
  {
    ref: 'cable-hip-adduction', checkedAt: '2026-10-21', view: 'front', basis: 'convention',
    basisNote: 'Frontansicht. Keine Studie zur Adduktion am Kabel gefunden (PubMed-Suche 2026-10-21); übertragen wird die Adduktion gegen elastischen Widerstand im Stand (Serner et al. 2013, Brandt et al. 2013; Abstracts). Gezeichnet: Turm rechts, Manschette am rechten (nahen) Knöchel, Stand auf dem linken Bein; das Bein startet 28° außen und zieht bis knapp vor das Standbein (9° über die Mitte). Winkel Konvention.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s heranziehen, kurz halten, 2 s zurück (Konvention).' },
    frames: [
      { label: 'Außen', pose: { root: 'ankleL', rootPos: CHIP.AL, trunk: C(CHIP.add.out.lean), legs: { abdR: C(CHIP.add.out.abd, 'vom Kabel nach außen gezogen') }, armPoints: CHIP.add.out.armPoints, armL: CHIP.add.out.armL, frontLeg: 'R', props: chipProps('R') } },
      { label: 'Innen', pose: { root: 'ankleL', rootPos: CHIP.AL, trunk: C(CHIP.add.in.lean), legs: { abdR: C(CHIP.add.in.abd, 'knapp vor dem Standbein vorbei') }, armPoints: CHIP.add.in.armPoints, armL: CHIP.add.in.armL, frontLeg: 'R', props: chipProps('R') } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Außen', kp: [3] }, { a: 0, b: 1, dur: 1.0, label: 'Heranziehen', kp: [0] }, { a: 1, b: 1, dur: 0.3, label: 'Innen', kp: [0, 1] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [2] }],
    keyPoints: [
      { short: 'Intensiv', anchor: 'thighR', side: 'r', status: 'single', text: 'Adduktion gegen Zug im Stand zählt zu den intensiven Adduktionsübungen.', src: ['SE'],
        explain: '40 Elitefußballer, 8 Adduktionsübungen: Spitzen-EMG des langen Adduktors 14–108 %; die Adduktion mit Gummiband nennen die Autoren als dynamische Übung mit hoher Intensität (Serner et al. 2013, Abstract). Am Kabel nicht gemessen.' },
      { short: 'Gleich', anchor: 'kneeR', side: 'r', status: 'single', text: 'Gummiband und Maschine aktivierten die Adduktoren etwa gleich stark.', src: ['B1'],
        explain: '16 untrainierte Frauen: Für die Adduktoren waren elastischer Widerstand und Maschine ähnlich wirksam (Brandt et al. 2013, Abstract).' },
      { short: 'Seiten', anchor: 'kneeL', side: 'l', status: 'single', text: 'Beide Seiten trainieren – Standbein und Zugbein arbeiten verschieden.', src: ['SE'],
        explain: 'Bei 3 der 8 Übungen unterschied sich die Aktivität des langen Adduktors zwischen den Beinen deutlich (35–48 %) (Serner et al. 2013, Abstract); welche Übungen, nennt das Abstract nicht.' },
      { short: 'Last', anchor: 'belly', side: 'l', status: 'single', text: 'Die gefühlte Anstrengung (0–10) passt gut, um den Zug zu wählen.', src: ['B1'],
        explain: 'Zusammenhang zwischen Borg-CR10 und normiertem EMG bei der Adduktion mit elastischem Widerstand r = 0,8 ± 0,3 (Brandt et al. 2013, Abstract).' }
    ],
    sources: {
      SE: { label: 'Serner et al. 2013, Br J Sports Med', url: 'https://doi.org/10.1136/bjsports-2012-091746', read: 'abstract', note: 'Elastischer Widerstand, nicht Kabel' },
      B1: { label: 'Brandt et al. 2013, Int J Sports Phys Ther', url: 'https://pubmed.ncbi.nlm.nih.gov/24377067/', read: 'abstract' }
    }
  },

  // ---------- Runde 14: Seitliches Beinheben liegend (Frontansicht, Seitlage) ----------
  {
    ref: 'side-lying-hip-abduction', checkedAt: '2026-10-21', view: 'front', basis: 'convention',
    basisNote: 'Frontansicht in Seitlage (Figur gedreht, Kopf links, linke Seite auf der Matte). Unteres Bein gestreckt, oberes bis 40° abgespreizt; Kopf auf dem unteren Arm. Winkel Konvention – die EMG-Studien (Distefano et al. 2009, McBeth et al. 2012; Abstracts) nennen im Abstract keinen Bewegungsumfang. Dass das Bein leicht hinter der Körperlinie geführt wird, zeigt die Frontansicht nicht.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s heben, kurz halten, 2 s senken (Konvention).' },
    frames: [
      { label: 'Unten', pose: { ...SIDEL.base, rootPos: [0, SLA.y], legs: { abdR: C(0, 'Beine übereinander') }, props: sideMatProps } },
      { label: 'Oben', pose: { ...SIDEL.base, rootPos: [0, SLA.y], legs: { abdR: C(SLA.up, 'oberes Bein abgespreizt') }, props: sideMatProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [3] }, { a: 0, b: 1, dur: 1.0, label: 'Heben', kp: [0, 1] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [0] }],
    keyPoints: [
      { short: 'Gesäß', anchor: 'thighR', side: 'r', status: 'consensus', text: 'Aktiviert den mittleren Gesäßmuskel stark – mehr als der Clamshell.', src: ['D1', 'MB'],
        explain: 'Distefano et al. 2009 (21 Aktive, 12 Übungen): 81 ± 42 % der Maximalkraft, deutlich vor beiden Clamshell-Varianten (40 und 38 %). McBeth et al. 2012 (20 Läufer): 70 ± 30 % gegenüber 33 ± 17 % beim Clamshell (Abstracts).' },
      { short: 'Muskeln', anchor: 'hipR', side: 'r', status: 'single', text: 'Mittlerer Gesäßmuskel vor Spanner der Oberschenkelfaszie und großem Gesäßmuskel.', src: ['MB'],
        explain: 'Mit 5 % der Körpermasse am Knöchel: mittlerer Gesäßmuskel 70 ± 30 %, Spanner 54 ± 19 %, vordere Hüftbeuger 28 ± 22 %, großer Gesäßmuskel 25 ± 25 % (McBeth et al. 2012, Abstract).' },
      { short: 'Drehung', anchor: 'footR', side: 'r', status: 'single', text: 'Bein nicht nach außen drehen – sonst übernimmt der Spanner.', src: ['MB'],
        explain: 'Mit Außenrotation war der Spanner der Oberschenkelfaszie (71 ± 17 %) aktiver als der mittlere Gesäßmuskel (53 ± 28 %) (McBeth et al. 2012, Abstract).' },
      { short: 'Gerät', anchor: 'kneeL', side: 'l', status: 'single', text: 'Mehr Spanner-Aktivität als an der Abduktorenmaschine.', src: ['P1'],
        explain: 'Beim seitlichen Beinheben war der Spanner der Oberschenkelfaszie aktiver als an der Maschine und beim Clamshell; der mittlere Gesäßmuskel war in allen drei gleich (de Almeida Paz et al. 2022, 11 Männer, Abstract).' }
    ],
    sources: {
      D1: { label: 'Distefano et al. 2009, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2009.2796', read: 'abstract' },
      MB: { label: 'McBeth et al. 2012, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-47.1.15', read: 'abstract' },
      P1: { label: 'de Almeida Paz et al. 2022, J Bodyw Mov Ther', url: 'https://doi.org/10.1016/j.jbmt.2022.01.001', read: 'abstract' }
    }
  },

  // ---------- Runde 14: Clamshell mit Band (Frontansicht, Seitlage) ----------
  {
    ref: 'clamshell-band', checkedAt: '2026-10-21', view: 'front', basis: 'protocol',
    basisNote: 'Frontansicht in Seitlage (Kopf links). Hüfte 60° gebeugt: bei Willcox & Burden 2013 (Abstract) die Variante mit der höchsten Aktivität des mittleren Gesäßmuskels. Knie 90°, Fersen zusammen, Öffnung bis 40° und das Mini-Band über den Knien sind Konvention. Das obere Knie dreht um die Achse Hüfte–Knöchel; das Bein ist räumlich gelöst und projiziert – von vorn wandert das Knie nach oben.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s öffnen, kurz halten, 1,5 s schließen (Konvention).' },
    frames: [
      { label: 'Geschlossen', pose: { ...SIDEL.base, rootPos: [0, CLAM.y], legs: CLAM.closed, legsFront: true, props: clamProps } },
      { label: 'Geöffnet', pose: { ...SIDEL.base, rootPos: [0, CLAM.y], legs: CLAM.open, legsFront: true, props: clamProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Geschlossen', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Öffnen', kp: [1, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Geöffnet', kp: [2] }, { a: 1, b: 0, dur: 1.5, label: 'Schließen', kp: [3] }],
    keyPoints: [
      { short: 'Becken', anchor: 'hipR', side: 'r', status: 'single', text: 'Becken gerade halten, nicht nach hinten kippen.', src: ['W1'],
        explain: '17 Gesunde, 6 Varianten: Mit neutralem statt zurückgekipptem Becken waren großer und mittlerer Gesäßmuskel stärker aktiv (Willcox & Burden 2013, Abstract).' },
      { short: 'Hüfte', anchor: 'thighR', side: 'r', status: 'single', text: 'Hüfte etwa 60° beugen – so arbeitete der mittlere Gesäßmuskel am meisten.', src: ['W1'],
        explain: 'Von den getesteten Hüftwinkeln brachte 60° Beugung die höchste Aktivität des mittleren Gesäßmuskels; der Spanner der Oberschenkelfaszie blieb niedrig und änderte sich kaum (Willcox & Burden 2013, Abstract).' },
      { short: 'Hüftbeuger', anchor: 'band', side: 'r', status: 'single', text: 'Die vorderen Hüftbeuger arbeiten am stärksten mit – eher eine Aufwärmübung.', src: ['MB'],
        explain: 'Clamshell mit Last: vordere Hüftbeuger 54 ± 25 %, Spanner 34 ± 20 %, großer Gesäßmuskel 34 ± 25 %, mittlerer 33 ± 17 % der Maximalkraft (McBeth et al. 2012, Abstract).' },
      { short: 'Vergleich', anchor: 'kneeL', side: 'l', status: 'single', text: 'Etwa halb so viel Gesäßaktivität wie seitliches Beinheben im Liegen.', src: ['D1'],
        explain: 'Mittlerer Gesäßmuskel: Clamshell-Varianten 40 ± 38 % und 38 ± 29 %, seitliches Beinheben 81 ± 42 % der Maximalkraft (Distefano et al. 2009, Abstract).' }
    ],
    sources: {
      W1: { label: 'Willcox & Burden 2013, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2013.4004', read: 'abstract' },
      MB: { label: 'McBeth et al. 2012, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-47.1.15', read: 'abstract' },
      D1: { label: 'Distefano et al. 2009, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2009.2796', read: 'abstract' }
    }
  },

  // ---------- Runde 15 (v2.20): Schrägbankdrücken an der Multipresse ----------
  {
    ref: 'smith-machine-incline-bench-press', checkedAt: '2026-10-21', view: 'side', basis: 'transfer',
    basisNote: 'Keine Studie misst Gelenkwinkel beim Schrägbankdrücken, weder frei noch an der Multipresse. Aufbau übertragen vom Schrägbankdrücken mit der Langhantel nach Rodríguez-Ridao et al. 2020 (Volltext): Bank 30°, Griff 150 % der Schulterbreite, Stange bis 1 cm über das Brustbein auf Höhe der Brustwarzen, Schulter etwa 45° abgespreizt, 2 s ab / 2 s auf. Die Schiene führt die Stange senkrecht über dem Punkt, an dem sie die Brust erreicht; das ist aus der Geometrie gelöst. Schiene, Schlitten und Bank sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: '2 s ab / 2 s auf mit Metronom (Rodríguez-Ridao et al. 2020, freie Langhantel).' },
    frames: [
      { label: 'Oben', pose: { ...SMI.base, trunk: V(-60, 'R1', 'protocol', 'Bank 30° (Studie: 0, 15, 30, 45, 60°)'), hip: C(30), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: SMI.top, props: smithInclineProps },
        facts: [K(0, 'R1', 'Stange senkrecht über dem Auflagepunkt an der Brust (geführte Bahn, aus der Geometrie gelöst)')] },
      { label: 'Unten', pose: { ...SMI.base, trunk: V(-60, 'R1', 'protocol', 'Bank 30°'), hip: C(30), knee: C(90), foot: C(90, 'Fuß flach'), armPoints: SMI.bottom, props: smithInclineProps },
        facts: [V(45, 'R1', 'protocol', 'Schulter etwa 45° abgespreizt, Stange 1 cm über dem Brustbein'), V(150, 'R1', 'protocol', 'Griff 150 % der Schulterbreite')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [2] }, { a: 0, b: 1, dur: 2.0, label: 'Absenken', kp: [0, 2] }, { a: 1, b: 1, dur: 0.15, label: 'Unten', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Drücken', kp: [3] }],
    keyPoints: [
      { short: 'Bank', anchor: 'back', side: 'l', status: 'contested', text: 'Bank etwa 30° schräg: dort war der obere Brustanteil am aktivsten.', src: ['R1', 'T1'],
        explain: 'Umstritten. Mit freier Langhantel (30 Trainierte, 60 % 1RM) war der obere Brustanteil bei 30° am aktivsten; bei 45° und 60° übernahm der vordere Deltamuskel (Rodríguez-Ridao et al. 2020). Trebs et al. 2010 (15 Männer, 70 % 1RM) fanden den oberen Brustanteil bei 44° aktiver als bei 28° und flach. Eigene Daten zur Multipresse auf der Schrägbank gibt es nicht.' },
      { short: 'Schulter', anchor: 'shoulder', side: 'l', status: 'consensus', text: 'Je steiler die Bank, desto mehr arbeitet die vordere Schulter.', src: ['R1', 'T1'],
        explain: 'Bei 45° und 60° war der vordere Deltamuskel stärker aktiv als die Brustanteile (Rodríguez-Ridao et al. 2020); bei 28°, 44° und 56° war er aktiver als flach (Trebs et al. 2010, Abstract).' },
      { short: 'Bahn', anchor: 'bar', side: 'r', status: 'single', text: 'Bank so stellen, dass die Stange senkrecht auf die obere Brust trifft.', src: ['S24'],
        explain: 'Mit freier Stange auf der 25°-Schrägbank lag der Auftreffpunkt höher am Brustbein und die Bahn war senkrechter als flach (Saeterbakken et al. 2017, 12 Wettkampf-Bankdrücker). An der Multipresse ist die Bahn fest; die Bankposition bestimmt deshalb, wo die Stange auftrifft (Konvention).' },
      { short: 'Gerät', anchor: 'chest', side: 'r', status: 'single', text: 'Frei schaffte man etwa 3 % mehr; die seitliche Schulter war frei aktiver.', src: ['SA', 'SC'],
        explain: 'Flachbank-Daten: Die Langhantel-1RM lag ≈ 3 % über der an der Multipresse, Brust und vordere Schulter waren gleich aktiv (Saeterbakken et al. 2011, 12 trainierte Männer). Mit freier Stange war der mittlere Deltamuskel stärker aktiv (Schick et al. 2010). Für die Schrägbank fehlen eigene Daten.' }
    ],
    sources: {
      R1: { label: 'Rodríguez-Ridao et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17197339', read: 'fulltext' },
      T1: { label: 'Trebs et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181ddfae7', read: 'abstract' },
      S24: { label: 'Saeterbakken et al. 2017, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0047', read: 'fulltext' },
      SA: { label: 'Saeterbakken et al. 2011, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2010.543916', read: 'abstract' },
      SC: { label: 'Schick et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181cc2237', read: 'abstract' }
    }
  },

  // ---------- Runde 15: Brustpresse schräg ----------
  {
    ref: 'incline-machine-chest-press', checkedAt: '2026-10-21', view: 'side', basis: 'transfer',
    basisNote: 'Keine Studie zur schrägen Brustpresse an der Maschine gefunden. Übertragen ist nur die Druckrichtung: Auf der 30°-Schrägbank drückt man senkrecht, das sind etwa 120° Schulterbeugung zum Rumpf (berechnet, Rodríguez-Ridao et al. 2020). Hier drückt man bis ≈ 115° schräg nach oben-vorn. Lehne (20° zurück), Griffhöhe, Hebel und Drehpunkt sind Zeichenkonvention.',
    tempo: { basis: 'convention', note: 'Gezeichnet 2 s drücken / 2 s zurück (Konvention, wie an der Brustpresse).' },
    frames: [
      { label: 'Unten', pose: { ...IMP.base, trunk: C(-20, 'Lehne 20° zurück'), hip: C(75), knee: C(85), foot: C(90), armPoints: IMP.back, props: inclinePressProps } },
      { label: 'Mitte', pose: { ...IMP.base, trunk: C(-20), hip: C(75), knee: C(85), foot: C(90), armPoints: IMP.mid, props: inclinePressProps } },
      { label: 'Oben', pose: { ...IMP.base, trunk: C(-20), hip: C(75), knee: C(85), foot: C(90), armPoints: IMP.front, props: inclinePressProps },
        facts: [K(115, 'R1', 'Schulterbeugung zum Rumpf am Ende; übertragen vom senkrechten Druck auf der 30°-Bank (≈ 120°)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [1] }, { a: 0, b: 1, dur: 1.0, label: 'Drücken', kp: [0, 2] }, { a: 1, b: 2, dur: 1.0, label: 'Drücken', kp: [0, 2] }, { a: 2, b: 2, dur: 0.2, label: 'Oben', kp: [3] }, { a: 2, b: 1, dur: 1.0, label: 'Zurück', kp: [1] }, { a: 1, b: 0, dur: 1.0, label: 'Zurück', kp: [1] }],
    keyPoints: [
      { short: 'Richtung', anchor: 'hand', side: 'r', status: 'contested', text: 'Schräg nach oben drücken spricht eher den oberen Brustanteil an.', src: ['R1', 'T1'],
        explain: 'Umstritten und übertragen von der Langhantel: Auf der 30°-Schrägbank war der obere Brustanteil am aktivsten (Rodríguez-Ridao et al. 2020, 30 Trainierte); Trebs et al. 2010 fanden das erst bei 44°. An der schrägen Brustpresse selbst wurde nichts gemessen.' },
      { short: 'Griffe', anchor: 'chest', side: 'r', status: 'single', text: 'Sitz so einstellen, dass die Griffe unten etwa auf Höhe der oberen Brust sind.', src: ['S24'],
        explain: 'Abgeleitet: Auf der Schrägbank traf die Stange höher am Brustbein auf als flach (Saeterbakken et al. 2017). Eine Maschinenstudie dazu gibt es nicht; die Sitzhöhe ist Konvention.' },
      { short: 'Maschine', anchor: 'shoulder', side: 'l', status: 'single', text: 'An der (flachen) Brustpresse war der obere Brustanteil weniger aktiv als frei.', src: ['C1'],
        explain: '10 Wettkampf-Bodybuilder, 80 % 1RM: Der obere (klavikuläre) Brustanteil war an der Brustpresse weniger erregt als bei allen Bankdrück-Varianten, am stärksten auf der 45°-Schrägbank (Coratella et al. 2019). Eine schräge Maschine wurde nicht getestet.' },
      { short: 'Oben', anchor: 'elbow', side: 'l', status: 'single', text: 'Bis knapp vor die volle Streckung drücken, dann kontrolliert zurück.', src: ['R1'],
        explain: 'In Rodríguez-Ridao et al. 2020 wurde bis zur Ellbogenstreckung ohne Überstreckung gedrückt. Wie weit zurück, ist für die Maschine nicht untersucht.' }
    ],
    sources: {
      R1: { label: 'Rodríguez-Ridao et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17197339', read: 'fulltext' },
      T1: { label: 'Trebs et al. 2010, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3181ddfae7', read: 'abstract' },
      S24: { label: 'Saeterbakken et al. 2017, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0047', read: 'fulltext' },
      C1: { label: 'Coratella et al. 2019, Eur J Sport Sci', url: 'https://doi.org/10.1080/17461391.2019.1655101', read: 'abstract' }
    }
  },

  // ---------- Runde 15: Seitheben an der Maschine (Frontansicht) ----------
  {
    ref: 'machine-lateral-raise', checkedAt: '2026-10-21', view: 'front', basis: 'protocol',
    variants: [{ key: 'bent', label: 'Ellbogen gebeugt' }, { key: 'straight', label: 'Arm gestreckt' }],
    basisNote: 'Frontansicht, sitzend. Keine Studie an einer Seithebe-Maschine gefunden. Bewegungsumfang 0° → 90° Abduktion in der Frontalebene nach den Protokollen von Larsen et al. 2025, Coratella et al. 2020 und Campos et al. 2020 (alle Volltext, mit Kabel oder Kurzhantel). „Gebeugt“: Ellbogen 90°, Unterarm zeigt nach vorn und erscheint von vorn kurz; „Gestreckt“: Arm fast gestreckt. Polster, Hebel und Sitz sind Zeichenkonvention; die Drehachse liegt hinter dem Schultergelenk.',
    tempo: { basis: 'protocol', note: '2 s heben / 2 s senken mit Metronom (Coratella et al. 2020); Larsen et al. 2025 etwa 1 s je Richtung.' },
    frames: {
      bent: [
        { label: 'Unten', pose: { rootPos: [0, MLR.seat], armPoints: MLR.bent(0), legs: { hip: C(85, 'sitzend'), knee: C(85) }, props: machineLateralProps(false) },
          facts: [V(0, 'L1', 'protocol', 'Oberarm parallel zum Rumpf')] },
        { label: 'Oben', pose: { rootPos: [0, MLR.seat], armPoints: MLR.bent(90), legs: { hip: C(85), knee: C(85) }, props: machineLateralProps(false) },
          facts: [V(90, 'L1', 'protocol', 'bis 90° Abduktion'), V(90, 'C2', 'protocol', 'Ellbogen 90° gebeugt (Variante mit gebeugtem Arm)')] }
      ],
      straight: [
        { label: 'Unten', pose: { rootPos: [0, MLR.seat], arm: { abd: V(0, 'L1', 'protocol', 'Oberarm parallel zum Rumpf'), elbow: C(10, 'fast gestreckt') }, legs: { hip: C(85, 'sitzend'), knee: C(85) }, props: machineLateralProps(true) } },
        { label: 'Oben', pose: { rootPos: [0, MLR.seat], arm: { abd: V(90, 'L1', 'protocol', 'bis 90° Abduktion'), elbow: C(10) }, legs: { hip: C(85), knee: C(85) }, props: machineLateralProps(true) } }
      ]
    },
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Unten', kp: [3] }, { a: 0, b: 1, dur: 2.0, label: 'Heben', kp: [0, 1] }, { a: 1, b: 1, dur: 0.5, label: 'Oben', kp: [0] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [2] }],
    keyPoints: [
      { short: 'Weg', anchor: 'elbowR', side: 'r', status: 'consensus', text: 'Arme seitlich bis etwa Schulterhöhe (90°) heben.', src: ['L1', 'C2', 'CA'],
        explain: 'Alle drei Protokolle endeten bei 90° Abduktion (Larsen et al. 2025, 24 Trainierte; Coratella et al. 2020, 10 Bodybuilder; Campos et al. 2020, 13 trainierte Männer). Das ist eine Vorgabe, kein Vergleich mit höheren Endstellungen.' },
      { short: 'Ellbogen', anchor: 'shoulderR', side: 'r', status: 'single', text: 'Mit gestrecktem Arm war der mittlere Delta etwas aktiver als mit gebeugtem.', src: ['C2'],
        explain: 'Kurzhanteln, 10 Bodybuilder: Mit 90° gebeugtem Ellbogen war die EMG-Aktivität des mittleren Deltamuskels niedriger als mit fast gestrecktem Arm (Coratella et al. 2020). An der Maschine wurde das nicht geprüft.' },
      { short: 'Gerät', anchor: 'uarmL', side: 'l', status: 'single', text: 'Kabel und Kurzhantel ließen den seitlichen Delta gleich wachsen.', src: ['L1'],
        explain: '8 Wochen, ein Arm am Kabel, einer mit Kurzhantel: Die Muskeldicke nahm in beiden Armen ähnlich zu (Larsen et al. 2025). Eine Maschine wurde nicht getestet; das Gerät scheint zweitrangig.' },
      { short: 'Sitz', anchor: 'chest', side: 'l', status: 'single', text: 'Aufrecht sitzen, Rücken an der Lehne, Schultern unten lassen.', src: ['CA'],
        explain: 'Campos et al. 2020 ließen sitzend mit 90°-Lehne heben. Dass die Schultern unten bleiben, ist Konvention aus dem Übungspool, nicht gemessen.' }
    ],
    sources: {
      L1: { label: 'Larsen et al. 2025, Front Physiol', url: 'https://doi.org/10.3389/fphys.2025.1611468', read: 'fulltext' },
      C2: { label: 'Coratella et al. 2020, Int J Environ Res Public Health', url: 'https://doi.org/10.3390/ijerph17176015', read: 'fulltext' },
      CA: { label: 'Campos et al. 2020, J Hum Kinet', url: 'https://doi.org/10.2478/hukin-2020-0033', read: 'fulltext' }
    }
  },

  // ---------- Runde 15: Reverse Fly am Kabel (Rückansicht seit v2.22.0) ----------
  {
    ref: 'cable-reverse-fly', checkedAt: '2026-10-22', view: 'back', basis: 'transfer',
    basisNote: 'Rückansicht (seit v2.22.0; vorher von vorn), damit hinterer Deltamuskel und oberer Rücken sichtbar sind; Kabel und Griffe vor dem Körper verschwinden hinter dem Rücken. Stehend. Keine Studie mit gekreuzten Kabeln gefunden. Start mit den Armen vorn auf Schulterhöhe und Ende in Linie mit dem Rumpf nach Bergquist et al. 2018 (Band auf Schulterhöhe, Volltext); Ellbogen 14° nach dem Band-Reverse-Fly in Liu et al. 2024 (14,08 ± 9,14°, 13 Männer, Vicon). Dass die Hände zu Beginn etwas über die Körpermitte reichen, Türme, Rollen und Stand sind Zeichenkonvention. Die Arme vorn erscheinen verkürzt.',
    tempo: { basis: 'protocol', note: '2 s nach außen / 2 s zurück mit Metronom (Bergquist et al. 2018, Band).' },
    frames: [
      { label: 'Vorn', pose: { legs: { planted: true, stance: C(CRF.stance, 'etwa hüftbreit'), toeOut: C(8), knee: C(6), shank: C(3) }, armPoints: armFront(CRF.lift, CRF.start, CRF.elbow), props: cableReverseFlyProps },
        facts: [V(90, 'B1', 'protocol', 'Start: Arme vorn auf Schulterhöhe (gezeichnet 84°, damit der Arm sichtbar bleibt)'), C(-20, 'Hände etwas über der Körpermitte (gekreuzte Kabel)')] },
      { label: 'Mitte', pose: { legs: { planted: true, stance: C(CRF.stance), toeOut: C(8), knee: C(6), shank: C(3) }, armPoints: armFront(CRF.lift, CRF.mid, CRF.elbow), props: cableReverseFlyProps } },
      { label: 'Außen', pose: { legs: { planted: true, stance: C(CRF.stance), toeOut: C(8), knee: C(6), shank: C(3) }, armPoints: armFront(CRF.lift, CRF.end, CRF.elbow), props: cableReverseFlyProps },
        facts: [V(90, 'B1', 'protocol', 'Ende: Oberarme in Linie mit dem Rumpf'), V(14, 'LI', 'fulltext', 'Ellbogenbeugung 14,08 ± 9,14° (Band-Reverse-Fly)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Vorn', kp: [0] }, { a: 0, b: 1, dur: 0.5, label: 'Öffnen', kp: [0, 1] }, { a: 1, b: 2, dur: 1.5, label: 'Öffnen', kp: [0, 1] }, { a: 2, b: 2, dur: 0.3, label: 'Außen', kp: [2] }, { a: 2, b: 1, dur: 1.5, label: 'Zurück', kp: [3] }, { a: 1, b: 0, dur: 0.5, label: 'Zurück', kp: [3] }],
    keyPoints: [
      { short: 'Weg', anchor: 'handR', side: 'r', status: 'consensus', text: 'Arme auf Schulterhöhe von vorn nach außen führen, bis in Linie mit dem Rumpf.', src: ['B1', 'LI'],
        explain: 'So war der Reverse Fly mit Band definiert (Bergquist et al. 2018, 29 Personen). Mit Band wurden am Ende im Mittel 95 ± 13° horizontale Abduktion und 94 ± 14° Schulterbeugung gemessen (Liu et al. 2024, 13 Männer).' },
      { short: 'Ellbogen', anchor: 'elbowR', side: 'r', status: 'single', text: 'Ellbogen leicht gebeugt und gleich halten (gemessen etwa 14°).', src: ['LI', 'B1'],
        explain: 'Beide Studien gaben eine leichte Beugung vor; gemessen wurden 14 ± 9° (Liu et al. 2024). Verschiedene Ellbogenwinkel wurden nicht verglichen.' },
      { short: 'Griff', anchor: 'shoulderL', side: 'l', status: 'single', text: 'Neutraler Griff: hinterer Delta an der Maschine etwas aktiver als im Obergriff.', src: ['SF'],
        explain: 'Reverse-Fly-Maschine, trainierte Männer: Mit neutralem Griff waren hinterer Deltamuskel und Infraspinatus aktiver als im Obergriff (Schoenfeld et al. 2013, Abstract). Am Kabel nicht geprüft.' },
      { short: 'Tempo', anchor: 'upperBack', side: 'l', status: 'single', text: 'Kontrolliert öffnen und zurückführen, in der Studie je 2 s.', src: ['B1'],
        explain: 'Metronom 2 s / 2 s bei 10-RM-Last (Bergquist et al. 2018). Ein Messprotokoll, kein Tempovergleich.' }
    ],
    sources: {
      B1: { label: 'Bergquist et al. 2018, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2017-0137', read: 'fulltext' },
      LI: { label: 'Liu et al. 2024, PeerJ', url: 'https://doi.org/10.7717/peerj.17839', read: 'fulltext' },
      SF: { label: 'Schoenfeld et al. 2013, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e318281e1e9', read: 'abstract' }
    }
  },

  // ---------- Runde 15: Y-Raise auf der Schrägbank (Seitenansicht) ----------
  {
    ref: 'incline-prone-y-raise', checkedAt: '2026-10-21', view: 'side', basis: 'transfer',
    basisNote: 'Keine Studie mit Brustauflage auf der Schrägbank gefunden. Endstellung übertragen vom Y-Raise im Stand: Arme bis ≈ 135° in der Schulterblattebene (Song et al. 2026, Volltext). In der Seitenansicht erscheint das als 153° Schulterbeugung bei 79 % der Armlänge (berechnet, Ebene 30° vor der Frontalebene). Bank 45°, gestreckte Arme und Stand sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: 'Je Wiederholung 3 s mit Metronom (Adachi et al. 2022); hier 1,5 s heben / 1,5 s senken.' },
    frames: [
      { label: 'Unten', pose: { shank: C(12), knee: C(15), ankle: C(12, 'Fuß flach'), trunk: C(YR.trunk, 'Brust auf der 45°-Bank'), shoulder: K(YR.trunk, 'SO', 'Arme hängen senkrecht'), armScale: [1, 1], elbow: C(0), props: yRaiseProps } },
      { label: 'Oben', pose: { shank: C(12), knee: C(15), ankle: C(12), trunk: C(YR.trunk), shoulder: K(YR.flex, 'SO', '135° in der Schulterblattebene, auf die Seitenansicht projiziert'), armScale: [YR.scale, YR.scale], elbow: C(0) , props: yRaiseProps },
        facts: [V(135, 'SO', 'fulltext', 'Armhebung ≈ 135° in der Schulterblattebene (Y-Form)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [3] }, { a: 0, b: 1, dur: 1.5, label: 'Heben', kp: [0, 2] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 1.5, label: 'Senken', kp: [0] }],
    keyPoints: [
      { short: 'Y', anchor: 'hand', side: 'r', status: 'single', text: 'Arme gestreckt schräg nach vorn-oben in Y-Form heben, etwa 135°.', src: ['SO', 'EK'],
        explain: 'Im Stand mit Band wurden die Arme bis ≈ 135° in der Schulterblattebene gehoben (Song et al. 2026, 36 Personen). Das Armheben über Kopf in Bauchlage, in Linie mit dem unteren Trapez, brachte von 10 Übungen die höchste Aktivität dieses Muskels (Ekstrom et al. 2003, 30 Gesunde, Abstract).' },
      { short: 'Trapez', anchor: 'upperBack', side: 'l', status: 'contested', text: 'Der untere Trapez arbeitet stark – der obere aber ähnlich mit.', src: ['AD', 'EK'],
        explain: 'Umstritten, wie gezielt die Übung ist. Bei der Y-Übung ohne Gewicht: unterer Trapez 63 ± 40 %, oberer 54 ± 31 % der Maximalkraft (Adachi et al. 2022, 16 Männer; Körperlage nur in einer Abbildung). Ekstrom et al. 2003 nennen das Armheben in Bauchlage die beste Übung für den unteren Trapez.' },
      { short: 'Rücken', anchor: 'back', side: 'l', status: 'single', text: 'Oberkörper nicht zusätzlich überstrecken – sonst arbeitet mehr der obere Trapez.', src: ['BO'],
        explain: '31 Gesunde, Armheben in Bauchlage: Zusätzliche Rumpfstreckung steigerte den oberen Trapez; unterer (42–48 %) und mittlerer Trapez blieben gleich (Borms et al. 2022, Abstract).' },
      { short: 'Bauch', anchor: 'belly', side: 'r', status: 'single', text: 'Bauch fest anspannen: Der untere Trapez war so aktiver.', src: ['SO'],
        explain: 'Y-Raise im Stand, 36 Personen mit runden Schultern: Mit Bauchanspannung („Bracing“) war der untere Trapez aktiver als bei normaler Atmung, der obere unverändert (Song et al. 2026). Auf der Bank nicht geprüft.' }
    ],
    sources: {
      SO: { label: 'Song et al. 2026, J Clin Med', url: 'https://doi.org/10.3390/jcm15187282', read: 'fulltext' },
      EK: { label: 'Ekstrom et al. 2003, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2003.33.5.247', read: 'abstract' },
      AD: { label: 'Adachi et al. 2022, Orthop J Sports Med', url: 'https://doi.org/10.1177/23259671221132194', read: 'fulltext' },
      BO: { label: 'Borms et al. 2022, Braz J Phys Ther', url: 'https://doi.org/10.1016/j.bjpt.2022.100420', read: 'abstract' }
    }
  },

  // ---------- Runde 15: Face Pull (Seitenansicht) ----------
  {
    ref: 'face-pull', checkedAt: '2026-10-21', view: 'side', basis: 'convention',
    basisNote: 'Keine Studie nennt Gelenkwinkel, Kabelhöhe oder Last beim Face Pull. Die einzige Studie zur Übung selbst (Zhu et al. 2026, 10 untrainierte Männer, 3D-Messung mit Muskelmodell) beschreibt nur, dass die Hand zum Gesicht gezogen wird. Start (Arme gestreckt zur Rolle) und Ende (Hände neben den Ohren, Oberarme seitlich auf Schulterhöhe, Unterarme nach oben gedreht) sind Trainingswissen und Zeichenkonvention. Von der Seite zeigen die Oberarme am Ende zum Betrachter und erscheinen sehr kurz.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1,5 s ziehen / 2 s zurück (Konvention). Im verwandten Band Pull-Apart je 3 s (Fukunaga et al. 2022).' },
    frames: [
      { label: 'Start', pose: { ...FP.base, armPoints: FP.start, props: facePullProps } },
      { label: 'Ende', pose: { ...FP.base, armPoints: FP.end, props: facePullProps },
        facts: [C(90, 'Oberarme seitlich auf Schulterhöhe, Unterarme nach oben (Trainingswissen, nicht gemessen)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Start', kp: [3] }, { a: 0, b: 1, dur: 1.5, label: 'Ziehen', kp: [0, 1] }, { a: 1, b: 1, dur: 0.4, label: 'Ende', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Zurück', kp: [1] }],
    keyPoints: [
      { short: 'Ziel', anchor: 'hand', side: 'l', status: 'single', text: 'Seil zum Gesicht ziehen, Hände Richtung Ohren, Ellbogen hoch.', src: ['Z1'],
        explain: 'Zhu et al. 2026 beschreiben nur den Zug der Hand zum Gesicht. Ellbogen auf Schulterhöhe und Hände neben den Ohren sind die übliche Ausführung, nicht gemessen.' },
      { short: 'Hinten', anchor: 'shoulder', side: 'l', status: 'single', text: 'Modell: hintere Schulter so stark gefordert wie beim vorgebeugten Seitheben.', src: ['Z1'],
        explain: 'Muskelmodell (OpenSim) bei 10 untrainierten Männern: hinterer Deltamuskel beim Face Pull 58,2 N, beim vorgebeugten Seitheben 58,6 N (kein Unterschied), beim vorgebeugten Rudern 47,9 N (Zhu et al. 2026, Abstract). Eine Modellschätzung, keine EMG-Messung.' },
      { short: 'Drehen', anchor: 'elbow', side: 'r', status: 'single', text: 'Übertragen: Handflächen nach oben drehen – mehr Infraspinatus, weniger oberer Trapez.', src: ['F1'],
        explain: 'Band Pull-Apart, 10 Männer: Mit den Handflächen nach oben (Außenrotation) waren Infraspinatus und unterer Trapez am aktivsten, mit den Handflächen nach unten oberer Trapez und hinterer Delta (Fukunaga et al. 2022). Für den Face Pull selbst nicht gemessen.' },
      { short: 'Richtung', anchor: 'rope', side: 'r', status: 'single', text: 'Übertragen: Schräg nach oben ziehen fordert den Trapez stärker als waagerecht.', src: ['F1'],
        explain: 'Im Band Pull-Apart war der Zug schräg nach oben für Infraspinatus, oberen und unteren Trapez und hinteren Delta am stärksten (Fukunaga et al. 2022). Die Kabelhöhe beim Face Pull wurde nie verglichen.' }
    ],
    sources: {
      Z1: { label: 'Zhu et al. 2026, Acta Bioeng Biomech', url: 'https://doi.org/10.37190/abb/217836', read: 'abstract' },
      F1: { label: 'Fukunaga et al. 2022, Int J Sports Phys Ther', url: 'https://doi.org/10.26603/001c.33026', read: 'fulltext' }
    }
  },

  // ---------- Runde 15: Shrugs (Frontansicht) ----------
  {
    ref: 'dumbbell-shrug', checkedAt: '2026-10-21', view: 'front', basis: 'transfer',
    basisNote: 'Frontansicht. Keine Bewegungsmessung beim Shrug mit Gewicht gefunden. Hubhöhe übertragen von einer passiven Messung an 14 Leichenschultern: Schlüsselbein 25 ± 5° gehoben (Peeters et al. 2022, Volltext); mit ≈ 15 cm Schlüsselbeinlänge ergibt das ≈ 6 cm Hub an der Schulter (berechnet, Länge Trainingswissen). Lebende Personen erreichten im Mittel 38° Schulterhebung (Goniometer, Hallaçeli & Günal 2001, Abstract). Gezeichnet heben sich Schultergelenke und Arme, die Schulterkontur folgt; das Mitdrehen des Schulterblatts ist nicht dargestellt.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1 s heben, kurz halten, 2 s senken (Konvention).' },
    frames: [
      { label: 'Unten', pose: { legs: { planted: true, stance: C(14, 'etwa hüftbreit'), toeOut: C(8), knee: C(4), shank: C(2) }, arm: { abd: C(4, 'Arme hängen'), elbow: C(4) }, shrug: C(0), props: raiseProps } },
      { label: 'Oben', pose: { legs: { planted: true, stance: C(14), toeOut: C(8), knee: C(4), shank: C(2) }, arm: { abd: C(4), elbow: C(4) }, shrug: K(SHR.up, 'PE', '≈ 6 cm aus 25° Schlüsselbeinhebung (passiv gemessen) und ≈ 15 cm Schlüsselbeinlänge'), props: raiseProps },
        facts: [V(25, 'PE', 'fulltext', 'Schlüsselbein 25 ± 5° gehoben (passiver Shrug, Leichenschultern)'), V(37.7, 'HA', 'abstract', 'aktive Schulterhebung 37,7° (Goniometer, 30 Gesunde)')] }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Heben', kp: [0, 3] }, { a: 1, b: 1, dur: 0.6, label: 'Oben', kp: [1] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [2] }],
    keyPoints: [
      { short: 'Gerade', anchor: 'shoulderR', side: 'r', status: 'single', text: 'Schultern gerade nach oben ziehen, die Arme hängen seitlich.', src: ['PI'],
        explain: 'Der Standard-Shrug wird mit den Armen an der Seite (0° Abduktion) ausgeführt (Pizzari et al. 2014, Abstract). Nicht kreisen ist Konvention, nicht untersucht.' },
      { short: 'Trapez', anchor: 'neck', side: 'l', status: 'consensus', text: 'Shrugs zählen zu den Übungen mit der höchsten Aktivität im oberen Trapez.', src: ['EK', 'AN'],
        explain: 'Von 10 Übungen erzeugte der einarmige Shrug die höchste Aktivität im oberen Trapez (Ekstrom et al. 2003, 30 Gesunde). Bei 12 Frauen mit Nackenschmerzen 102 ± 11 % der Maximalkraft, mit 20–30 kg (Andersen et al. 2008). Beides Abstracts.' },
      { short: 'Variante', anchor: 'handL', side: 'l', status: 'single', text: 'Variante: Arme etwa 30° abspreizen – oberer und unterer Trapez arbeiten mehr.', src: ['PI'],
        explain: 'Shrug mit 30° Abduktion in der Frontalebene: oberer und unterer Trapez signifikant aktiver als beim Standard-Shrug, bei 23 Gesunden und 14 Personen mit Schulterinstabilität (Pizzari et al. 2014, Abstract).' },
      { short: 'Hub', anchor: 'chest', side: 'r', status: 'single', text: 'Das Schlüsselbein hebt sich etwa 25°, das Schulterblatt dreht mit.', src: ['PE', 'HA'],
        explain: 'Passiv an 14 Leichenschultern: Schlüsselbein 25 ± 5° gehoben, Schulterblatt 26 ± 4° nach außen gedreht (Peeters et al. 2022). Lebende: im Mittel 37,7° Schulterhebung mit dem Goniometer (Hallaçeli & Günal 2001). Eine Messung mit Gewicht fehlt.' }
    ],
    sources: {
      PI: { label: 'Pizzari et al. 2014, Clin Biomech', url: 'https://doi.org/10.1016/j.clinbiomech.2013.11.011', read: 'abstract' },
      EK: { label: 'Ekstrom et al. 2003, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2003.33.5.247', read: 'abstract' },
      AN: { label: 'Andersen et al. 2008, Phys Ther', url: 'https://doi.org/10.2522/ptj.20070304', read: 'abstract' },
      PE: { label: 'Peeters et al. 2022, JSES Int', url: 'https://doi.org/10.1016/j.jseint.2022.09.014', read: 'fulltext' },
      HA: { label: 'Hallaçeli & Günal 2001, Arch Orthop Trauma Surg', url: 'https://doi.org/10.1007/s004020100339', read: 'abstract' }
    }
  },

  // ---------- Runde 16 (v2.21): Beinbeuger sitzend ----------
  {
    ref: 'seated-leg-curl', checkedAt: '2026-10-21', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Bewegung am sitzenden Beinbeuger gemessen. Hüfte ≈ 90° gebeugt und Knie 0° → 90° sind die Vorgaben aus Maeo et al. 2021 (Volltext), ebenso das Ausrichten des Kniegelenks auf die Drehachse und das festgeschnallte Becken. Sitz, Lehne, Polster und Armhaltung sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: '2 s beugen / 2 s strecken ohne Pause, Metronom 60 Schläge/min (Maeo et al. 2021).' },
    frames: [
      { label: 'Gestreckt', pose: { root: 'hip', rootPos: SLC2.hip, trunk: C(-5, 'an der Lehne'), hip: V(90, 'M1', 'protocol', 'Hüfte ≈ 90° gebeugt'), knee: V(0, 'M1', 'protocol', 'Knie gestreckt (0°)'), ankle: C(0, 'Fuß neutral'), armWorld: SLC2.hand, elbowSide: 1, props: seatedCurlProps } },
      { label: 'Gebeugt', pose: { root: 'hip', rootPos: SLC2.hip, trunk: C(-5), hip: V(90, 'M1', 'protocol', 'Hüfte ≈ 90° gebeugt'), knee: V(90, 'M1', 'protocol', 'voller Umfang 0–90°'), ankle: C(0), armWorld: SLC2.hand, elbowSide: 1, props: seatedCurlProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.3, label: 'Gestreckt', kp: [0, 1] }, { a: 0, b: 1, dur: 2.0, label: 'Beugen', kp: [2, 3] }, { a: 1, b: 1, dur: 0.1, label: 'Gebeugt', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Strecken', kp: [4] }],
    keyPoints: [
      { short: 'Achse', anchor: 'knee', side: 'r', status: 'single', text: 'Kniegelenk auf Höhe der Drehachse der Maschine einstellen.', src: ['M1', 'M2'],
        explain: 'In beiden Trainingsstudien der Gruppe um Maeo wurde das Kniegelenk auf die Drehachse des Hebels ausgerichtet und die Einstellung je Person beibehalten (Maeo et al. 2021 und 2024). Das ist ein Studienprotokoll, kein Vergleichstest.' },
      { short: 'Hüfte', anchor: 'hip', side: 'l', status: 'single', text: 'Hüfte bleibt gebeugt (etwa 90°), Becken mit Gurt oder Polster fixieren.', src: ['M1'],
        explain: 'Maeo et al. 2021 fixierten die Hüfte bei etwa 90° Beugung und schnallten das Becken fest. In einer späteren Studie lag die Hüfte bei 120° (Maeo et al. 2024).' },
      { short: 'Weg', anchor: 'foot', side: 'r', status: 'single', text: 'Ganzer Weg: Knie von gestreckt bis etwa 90° beugen.', src: ['M1'],
        explain: 'Als voller Bewegungsumfang galt 0–90° Kniebeugung (Maeo et al. 2021).' },
      { short: 'Sitzend', anchor: 'thigh', side: 'r', status: 'single', text: 'Sitzend wuchs der hintere Oberschenkel stärker als liegend (+14 % gegen +9 %).', src: ['M1'],
        explain: '20 untrainierte Erwachsene, 12 Wochen, ein Bein sitzend, das andere liegend (70 % 1RM, 5 × 10): Das Volumen der Beinbeuger (MRT) nahm sitzend um 14 %, liegend um 9 % zu (Maeo et al. 2021).' },
      { short: 'Fuß', anchor: 'kneeBack', side: 'l', status: 'single', text: 'Fußstellung (neutral oder gestreckt) änderte die Schwellung der Beinbeuger nicht.', src: ['L1'],
        explain: '17 junge Frauen: Die Schwellung der Beinbeuger (Ultraschall) unterschied sich zwischen neutralem und gestrecktem Fuß nicht; der seitliche Wadenmuskel schwoll nur mit neutralem Fuß an (Lisboa et al. 2026, Abstract). Schwellung ist kein Maß für Muskelaufbau.' }
    ],
    sources: {
      M1: { label: 'Maeo et al. 2021, Med Sci Sports Exerc', url: 'https://doi.org/10.1249/MSS.0000000000002523', read: 'fulltext' },
      M2: { label: 'Maeo et al. 2024, Med Sci Sports Exerc', url: 'https://doi.org/10.1249/MSS.0000000000003490', read: 'fulltext' },
      L1: { label: 'Lisboa et al. 2026, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000005344', read: 'abstract' }
    }
  },

  // ---------- Runde 16: Nordic Hamstring Curl ----------
  {
    ref: 'nordic-hamstring-curl', checkedAt: '2026-10-21', view: 'side', basis: 'measured',
    basisNote: 'Start nach Maeo et al. 2024 (Volltext): kniend, Unterschenkel waagerecht, Oberschenkel und Rumpf senkrecht (Knie 90°), Knöchel fixiert. Der Bruchpunkt – ab hier fällt man schneller – ist gemessen: 57,75 ± 13,28° Kniebeugung mit flachem Unterschenkel (Soga et al. 2021, Abstract). Danach fängt die Figur sich mit den Händen ab und drückt sich mit den Armen zurück (Protokoll Pai et al. 2025). Die leichte Hüftbeugung (8°), Polster, Rolle und Armhaltung sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: 'Absenken ≈ 4 s (Maeo et al. 2024); ≈ 5 s je Wiederholung mit Metronom (Pai et al. 2025). Hier 3 s bis zum Bruchpunkt, dann 1 s Fallen.' },
    frames: [
      { label: 'Kniestand', pose: { ...NHC.base, knee: V(90, 'N1', 'protocol', 'Unterschenkel waagerecht, Oberschenkel senkrecht'), hip: V(0, 'N1', 'protocol', 'Rumpf und Oberschenkel in einer Linie'), ankle: C(0), ...NHC.chest, props: nordicProps } },
      { label: 'Bruchpunkt', pose: { ...NHC.base, knee: V(NHC.bp, 'S1', 'abstract', '57,75 ± 13,28° (Unterschenkel flach)'), hip: C(8, 'Hüfte fast gestreckt (Anweisung); gemessen 24° bei maximaler Aktivität'), ankle: C(0), ...NHC.chest, props: nordicProps } },
      { label: 'Abfangen', pose: { ...NHC.base, knee: C(NHC.low, 'aus der Geometrie: Hände erreichen den Boden'), hip: C(8), ankle: C(0), ...NHC.catch, props: nordicProps } },
      { label: 'Abdrücken', pose: { ...NHC.base, knee: C(35), hip: C(8), ankle: C(0), ...NHC.mid, props: nordicProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.5, label: 'Kniestand', kp: [0] }, { a: 0, b: 1, dur: 3.0, label: 'Absenken', kp: [0, 1] }, { a: 1, b: 2, dur: 1.0, label: 'Fallen', kp: [2] }, { a: 2, b: 2, dur: 0.3, label: 'Abfangen', kp: [3] }, { a: 2, b: 3, dur: 0.8, label: 'Abdrücken', kp: [3] }, { a: 3, b: 0, dur: 1.2, label: 'Aufrichten', kp: [3] }],
    keyPoints: [
      { short: 'Linie', anchor: 'glute', side: 'l', status: 'single', text: 'Hüfte gestreckt halten: Rumpf und Oberschenkel bilden eine Linie.', src: ['N1', 'J1'],
        explain: 'Die Protokolle verlangen eine gestreckte Hüfte (Maeo et al. 2024). Selbst mit dieser Anweisung beugten 8 Sportler die Hüfte bei maximaler Beinbeuger-Aktivität im Mittel um 24° (Jorge et al. 2024, Tabelle im Volltext).' },
      { short: 'Langsam', anchor: 'knee', side: 'r', status: 'consensus', text: 'Langsam nach vorn sinken lassen, etwa 4–5 s bis zum Boden.', src: ['N1', 'P1'],
        explain: 'Die Trainingsstudien gaben ≈ 4 s (Maeo et al. 2024) bzw. ≈ 5 s mit Metronom vor (Pai et al. 2025). Das sind Protokolle, kein Vergleich verschiedener Tempi.' },
      { short: 'Bruchpunkt', anchor: 'thigh', side: 'r', status: 'single', text: 'Ab etwa 58° Kniebeugung lässt sich der Fall meist nicht mehr bremsen.', src: ['S1', 'B1'],
        explain: 'Bruchpunkt (ab hier > 10°/s): 57,75 ± 13,28° mit flachem Unterschenkel, 36° und 16° mit 20° bzw. 40° angehobenem Unterschenkel (Soga et al. 2021, 15 Männer). Mit Partner lag er bei 74,8°, mit einem Trainingsgerät bei 56,0° (Bergmann et al. 2026, 42 Personen). Beides Abstracts.' },
      { short: 'Arme', anchor: 'hand', side: 'r', status: 'single', text: 'Mit den Händen abfangen und mit den Armen zurück in den Kniestand drücken.', src: ['P1'],
        explain: 'In Pai et al. 2025 (11 Personen) wurde nur nachgebend abgesenkt; zurück ging es mit den Armen. Maeo et al. 2024 ließen auf eine Matte fallen.' },
      { short: 'Fersen', anchor: 'foot', side: 'l', status: 'single', text: 'Fersen fest fixieren: mit einem Gerät lag der Bruchpunkt tiefer als mit Partner.', src: ['B1'],
        explain: '42 Personen: Bruchpunkt mit Trainingsgerät (feste Fersen, festgelegte Kniehöhe) 56,0 ± 13,8°, mit Partner 74,8 ± 9,4°, mit fester Fersenfixierung 74,3 ± 11,1°; die Beinbeuger-Aktivität war mit dem Gerät am höchsten (Bergmann et al. 2026, Abstract).' }
    ],
    sources: {
      N1: { label: 'Maeo et al. 2024, Med Sci Sports Exerc', url: 'https://doi.org/10.1249/MSS.0000000000003490', read: 'fulltext' },
      S1: { label: 'Soga et al. 2021, J Sports Sci Med', url: 'https://doi.org/10.52082/jssm.2021.216', read: 'abstract' },
      B1: { label: 'Bergmann et al. 2026, Sports Biomech', url: 'https://doi.org/10.1080/14763141.2026.2657898', read: 'abstract' },
      J1: { label: 'Jorge et al. 2024, Int J Sports Phys Ther', url: 'https://doi.org/10.26603/001c.116158', read: 'fulltext' },
      P1: { label: 'Pai et al. 2025, J Sport Health Sci', url: 'https://doi.org/10.1016/j.jshs.2025.101070', read: 'fulltext' }
    }
  },

  // ---------- Runde 16: Reverse Hyperextension ----------
  {
    ref: 'reverse-hyperextension', checkedAt: '2026-10-21', view: 'side', basis: 'measured',
    basisNote: 'Bewegungsumfang gemessen: 76,6° zwischen Oberschenkel und Rumpf (Lawrence et al. 2019, Bewegungsmessung, 20 Freizeitsportler, Abstract). Gezeichnet von 77° Hüftbeugung (Beine hängen) bis in Linie mit dem Rumpf; wie sich die 76,6° auf Start und Ende verteilen, steht im Abstract nicht (Konvention). Die gemessene Lendenbeugung (20,4°) ist nicht dargestellt. Polster, Pendel, Schlaufe und Griffe sind Zeichenkonvention.',
    tempo: { basis: 'convention', note: 'Gezeichnet 1,5 s heben, 2 s senken (Konvention); keine Tempoangabe in den Abstracts.' },
    frames: [
      { label: 'Unten', pose: { root: 'hip', rootPos: RHE.hip, trunk: C(90, 'Bauchlage auf dem Polster'), hip: V(RHE.bottom, 'R1', 'abstract', 'Oberschenkel–Rumpf-Bewegung 76,6°'), knee: C(0, 'Beine gestreckt'), ankle: C(0), armWorld: RHE.hand, elbowSide: -1, props: rheProps } },
      { label: 'Oben', pose: { root: 'hip', rootPos: RHE.hip, trunk: C(90), hip: C(0, 'Beine in Linie mit dem Rumpf'), knee: C(0), ankle: C(0), armWorld: RHE.hand, elbowSide: -1, props: rheProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 1.5, label: 'Heben', kp: [0, 1] }, { a: 1, b: 1, dur: 0.3, label: 'Oben', kp: [2] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [3] }],
    keyPoints: [
      { short: 'Gestreckt', anchor: 'thigh', side: 'l', status: 'single', text: 'Beine gestreckt lassen, die Bewegung kommt aus der Hüfte.', src: ['D1'],
        explain: 'Dicus et al. 2023 behandeln die Übung als Hüftstreckung mit gestreckten Beinen. Bei 50 % 1RM waren großer Gesäßmuskel und Beinbeuger aktiver als beim rumänischen Kreuzheben (+19,5, +27,9 und +18,2 Prozentpunkte, Abstract).' },
      { short: 'Weg', anchor: 'glute', side: 'l', status: 'single', text: 'Gemessen: etwa 77° Hüftweg bei rund 20° Beugung der Lendenwirbelsäule.', src: ['R1'],
        explain: '20 Freizeitsportler: 76,6° Oberschenkel–Rumpf-Bewegung und 20,4° Lendenbeugung; beim Rückenstrecker 64,7° und 31,1° (Lawrence et al. 2019, Abstract).' },
      { short: 'Rücken', anchor: 'lowBack', side: 'r', status: 'single', text: 'Das Streckmoment im unteren Rücken war höher als beim Rückenstrecker.', src: ['R1'],
        explain: 'Spitzenmoment im unteren Rücken +129 % gegenüber dem Rückenstrecker bei gleicher Last (Lawrence et al. 2019). Das ist eine Belastungsangabe, keine Aussage zum Verletzungsrisiko.' },
      { short: 'Last', anchor: 'foot', side: 'l', status: 'contested', text: 'Mehr Gewicht brachte nicht linear mehr Kraft; Muskelvergleiche sind uneinheitlich.', src: ['R2', 'C1', 'R1'],
        explain: 'Umstritten. 100 und 150 % des Körpergewichts unterschieden sich kaum; mehr Last vergrößerte Hüft- (+5°) und Rumpfbeugung (+4°) (Lawrence et al. 2022). Cuthbert et al. 2021 (10 Personen) fanden 34–71 % höhere Spitzen-EMG als beim Rückenstrecker, Lawrence et al. 2019 dagegen mehr Gesäß- und Beinbeuger-Aktivität beim Rückenstrecker.' }
    ],
    sources: {
      R1: { label: 'Lawrence et al. 2019, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003146', read: 'abstract' },
      R2: { label: 'Lawrence et al. 2022, J Appl Biomech', url: 'https://doi.org/10.1123/jab.2022-0046', read: 'abstract' },
      C1: { label: 'Cuthbert et al. 2021, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000004049', read: 'abstract' },
      D1: { label: 'Dicus et al. 2023, Int J Exerc Sci', url: 'https://doi.org/10.70252/ZAOJ6139', read: 'abstract' }
    }
  },

  // ---------- Runde 16: Reverse Curls (Seitenansicht) ----------
  {
    ref: 'reverse-curl', checkedAt: '2026-10-21', view: 'side', basis: 'transfer',
    basisNote: 'Keine Studie hat Ellbogenwinkel im Obergriff gemessen. Aufbau nach Coratella et al. 2023 (Volltext, 10 Bodybuilder, gerade Stange am Kabel, Obergriff): Oberarme bleiben am Rumpf, kein Schwung, voller Bewegungsumfang, Tempo 1-2-1-2 s. Der Ellbogenweg ist vom SZ-Curl übertragen (Start 22°, wo die Stange an den Oberschenkeln anliegt, plus 119,9° gemessener Umfang, Marcolin et al. 2018). Stange und Stand sind Zeichenkonvention.',
    tempo: { basis: 'protocol', note: '1 s halten, 2 s heben, 1 s halten, 2 s senken (Coratella et al. 2023).' },
    frames: [
      { label: 'Unten', pose: { shank: C(0), knee: C(3), hip: C(0), ankle: C(0), shoulder: V(0, 'CO', 'protocol', 'Arme am Rumpf, keine Armbeugung'), elbow: C(22, 'Stange liegt an den Oberschenkeln an'), props: ezCurlProps } },
      { label: 'Oben', pose: { shank: C(0), knee: C(3), hip: C(0), ankle: C(0), shoulder: V(0, 'CO', 'protocol', 'Arme am Rumpf'), elbow: K(142, 'M1', 'übertragen: Start 22° + Umfang 119,9° (SZ-Stange, Untergriff)'), props: ezCurlProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 1.0, label: 'Unten', kp: [0] }, { a: 0, b: 1, dur: 2.0, label: 'Heben', kp: [1, 2] }, { a: 1, b: 1, dur: 1.0, label: 'Oben', kp: [3] }, { a: 1, b: 0, dur: 2.0, label: 'Senken', kp: [0] }],
    keyPoints: [
      { short: 'Oberarm', anchor: 'elbow', side: 'l', status: 'single', text: 'Oberarme bleiben am Körper, nur der Ellbogen beugt sich.', src: ['CO'],
        explain: 'Protokoll bei 10 Wettkampf-Bodybuildern: Arme parallel zum Rumpf, kein Anheben des Oberarms, kein Schwung aus Rumpf oder Beinen (Coratella et al. 2023).' },
      { short: 'Bizeps', anchor: 'uarm', side: 'r', status: 'single', text: 'Im Obergriff arbeitet der Bizeps weniger als im Untergriff.', src: ['CO'],
        explain: 'Beim Heben war der Bizeps im Untergriff um 19 Prozentpunkte stärker erregt als im Obergriff (Coratella et al. 2023, 10 Bodybuilder, 8-RM).' },
      { short: 'Speiche', anchor: 'hand', side: 'r', status: 'contested', text: 'Der Oberarmspeichenmuskel ist im Obergriff nicht aktiver als im Untergriff.', src: ['CO', 'CA'],
        explain: 'Umstritten ist die verbreitete Annahme, der Obergriff fordere diesen Muskel besonders: Er war im Untergriff um 5 Prozentpunkte aktiver (Coratella et al. 2023). Caufriez et al. 2018 (15 Männer, Abstract) fanden ihn in allen Unterarmstellungen stark aktiv, etwas mehr in Supination.' },
      { short: 'Schulter', anchor: 'shoulder', side: 'l', status: 'single', text: 'Der vordere Delta stabilisiert im Obergriff etwas mehr.', src: ['CO'],
        explain: 'Der vordere Deltamuskel war beim Heben im Obergriff um 6, beim Senken um 5 Prozentpunkte aktiver als im Untergriff (Coratella et al. 2023).' }
    ],
    sources: {
      CO: { label: 'Coratella et al. 2023, Sports (Basel)', url: 'https://doi.org/10.3390/sports11030064', read: 'fulltext' },
      M1: { label: 'Marcolin et al. 2018, PeerJ', url: 'https://doi.org/10.7717/peerj.5165', read: 'fulltext' },
      CA: { label: 'Caufriez et al. 2018, J Hand Surg Asian Pac Vol', url: 'https://doi.org/10.1142/S2424835518500145', read: 'abstract' }
    }
  },

  // ---------- Runde 16: Handgelenkcurls ----------
  {
    ref: 'wrist-curl', checkedAt: '2026-10-21', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat Handgelenkcurls mit Kurzhantel gemessen. Protokoll nach Takamori et al. 2026 (Volltext, 13 Gesunde): Unterarm fixiert, Handfläche oben, Start mit waagerechter Hand (0°), gegen die Schwerkraft voll beugen, 1 s halten, 2-s-Takt. Einen Gradwert für „voll gebeugt“ nennt die Studie nicht; gezeichnet sind 60° (Alltag braucht bis 54° Beugung, Ryu et al. 1991, Abstract). Bank, Unterarm auf dem Oberschenkel und Rumpfneigung (aus der Geometrie gelöst) sind Konvention.',
    tempo: { basis: 'protocol', note: '1 s heben, 1 s halten, 1 s senken (2-s-Takt mit Halten, Takamori et al. 2026; 0,5 Hz in Haslam & Cobb 1983).' },
    frames: [
      { label: 'Waagerecht', pose: { ...WCURL.base, trunk: C(WCURL.trunk, 'aus der Geometrie: Unterarm auf dem Oberschenkel'), hip: C(WCURL.trunk + 90), armWorld: WCURL.wrist, elbowSide: 1, wrist: V(0, 'T1', 'protocol', 'Hand waagerecht'), props: wristCurlProps } },
      { label: 'Gebeugt', pose: { ...WCURL.base, trunk: C(WCURL.trunk), hip: C(WCURL.trunk + 90), armWorld: WCURL.wrist, elbowSide: 1, wrist: C(WCURL.top, 'voll gebeugt; Gradwert Konvention (Alltag: bis 54°, Ryu et al. 1991)'), props: wristCurlProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Waagerecht', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Beugen', kp: [1] }, { a: 1, b: 1, dur: 1.0, label: 'Halten', kp: [2] }, { a: 1, b: 0, dur: 1.0, label: 'Senken', kp: [3] }],
    keyPoints: [
      { short: 'Auflage', anchor: 'elbow', side: 'l', status: 'single', text: 'Unterarm auflegen, Handfläche nach oben – nur das Handgelenk bewegt sich.', src: ['T1'],
        explain: 'Im MRT-Protokoll (13 Gesunde) war der Unterarm fixiert und die Hand supiniert; nur das Handgelenk beugte gegen die Schwerkraft (Takamori et al. 2026). Zur Auflage auf Bank oder Oberschenkel gibt es keine Studie.' },
      { short: 'Ohne Last', anchor: 'hand', side: 'r', status: 'single', text: 'Schon ohne Gewicht arbeiten die Beuger, wenn man gegen die Schwerkraft beugt.', src: ['T1'],
        explain: '150 Beugungen nur mit dem Handgewicht (≈ 350 g) gegen die Schwerkraft brachten mehrere Beugemuskeln in den anaeroben Bereich (MRT, etwa die Hälfte der Messungen); waagerechte Bewegungen nicht (Takamori et al. 2026).' },
      { short: 'Oben', anchor: 'wrist', side: 'r', status: 'single', text: 'Voll beugen, oben kurz halten, dann kontrolliert zurück in die Waagerechte.', src: ['T1'],
        explain: 'Protokoll: volle Beugung, 1 s halten, zurück, im 2-s-Takt (Takamori et al. 2026). Ein Gradwert wird nicht genannt.' },
      { short: 'Weg', anchor: 'knee', side: 'r', status: 'single', text: 'Zum Vergleich: Im Alltag reichen etwa 54° Beugung und 60° Streckung.', src: ['R1'],
        explain: '40 Gesunde mit Elektrogoniometer: Alle getesteten Alltagsaufgaben gelangen mit 60° Streckung und 54° Beugung (Ryu et al. 1991, Abstract). Das ist eine Orientierung, kein Trainingsbefund.' }
    ],
    sources: {
      T1: { label: 'Takamori et al. 2026, Prog Rehabil Med', url: 'https://doi.org/10.2490/prm.20260037', read: 'fulltext' },
      R1: { label: 'Ryu et al. 1991, J Hand Surg Am', url: 'https://doi.org/10.1016/0363-5023(91)90006-w', read: 'abstract' },
      H1: { label: 'Haslam & Cobb 1983, Med Sci Sports Exerc', url: 'https://pubmed.ncbi.nlm.nih.gov/6645860/', read: 'abstract' }
    }
  },

  // ---------- Runde 16: Reverse Handgelenkcurls ----------
  {
    ref: 'reverse-wrist-curl', checkedAt: '2026-10-21', view: 'side', basis: 'protocol',
    basisNote: 'Wie die Handgelenkcurls, aber Handrücken oben: Takamori et al. 2026 (Volltext) ließen aus der Waagerechten gegen die Schwerkraft voll strecken, 1 s halten, im 2-s-Takt. Gezeichnet sind 50° Streckung (Gradwert Konvention; Alltag bis 60°, Ryu et al. 1991). Bank, Auflage und Rumpfneigung sind Konvention.',
    tempo: { basis: 'protocol', note: '1 s heben, 1 s halten, 1 s senken (Takamori et al. 2026).' },
    frames: [
      { label: 'Waagerecht', pose: { ...WCURL.base, trunk: C(WCURL.trunk, 'aus der Geometrie: Unterarm auf dem Oberschenkel'), hip: C(WCURL.trunk + 90), armWorld: WCURL.wrist, elbowSide: 1, wrist: V(0, 'T1', 'protocol', 'Hand waagerecht'), props: wristCurlProps } },
      { label: 'Gestreckt', pose: { ...WCURL.base, trunk: C(WCURL.trunk), hip: C(WCURL.trunk + 90), armWorld: WCURL.wrist, elbowSide: 1, wrist: C(50, 'voll gestreckt; Gradwert Konvention'), props: wristCurlProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Waagerecht', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Strecken', kp: [1] }, { a: 1, b: 1, dur: 1.0, label: 'Halten', kp: [2] }, { a: 1, b: 0, dur: 1.0, label: 'Senken', kp: [3] }],
    keyPoints: [
      { short: 'Auflage', anchor: 'elbow', side: 'l', status: 'single', text: 'Handrücken nach oben, Unterarm aufgelegt, nur das Handgelenk streckt.', src: ['T1'],
        explain: 'Protokoll mit fixiertem Unterarm und pronierter Hand, Strecken gegen die Schwerkraft aus der Waagerechten (Takamori et al. 2026, 13 Gesunde).' },
      { short: 'Strecker', anchor: 'hand', side: 'r', status: 'single', text: 'Schon das Handgewicht reicht, damit die Strecker messbar arbeiten.', src: ['T1'],
        explain: 'Nach 150 Streckungen nur mit dem Handgewicht zeigten die Handgelenk- und Fingerstrecker im MRT bei etwa 40 % der Messungen anaerobe Arbeit (Takamori et al. 2026).' },
      { short: 'Finger', anchor: 'wrist', side: 'r', status: 'single', text: 'Beim Strecken krümmen sich die Finger von selbst etwas mit.', src: ['T1'],
        explain: 'Die Autoren nennen den Tenodese-Effekt: Strecken im Handgelenk beugt die Finger passiv; der Fingerstrecker arbeitet dagegen (Takamori et al. 2026).' }
    ],
    sources: {
      T1: { label: 'Takamori et al. 2026, Prog Rehabil Med', url: 'https://doi.org/10.2490/prm.20260037', read: 'fulltext' },
      R1: { label: 'Ryu et al. 1991, J Hand Surg Am', url: 'https://doi.org/10.1016/0363-5023(91)90006-w', read: 'abstract' }
    }
  },

  // ---------- Runde 16: Farmer's Walk ----------
  {
    ref: 'farmers-walk', checkedAt: '2026-10-21', view: 'side', basis: 'transfer',
    basisNote: 'Gehen auf der Stelle gezeichnet (die Hüfte bleibt im Bild, die Füße wandern wie auf einem Laufband nach hinten). Schrittlänge übertragen von Strongman-Athleten: Doppelschritt 1,04 m mit Last statt 1,43 m ohne (Winwood et al. 2014, in der Übersicht von Hindle et al. 2019, Volltext); hier ein Schritt ≈ 0,4 m (Füße ±42 um die Hüfte). Aufrechter Rumpf und zurückgezogene Schultern nach dem Protokoll von Stastny et al. 2015 (Volltext). Leichte Vorneigung (5°), Kniewinkel und Fußhaltung sind Zeichenkonvention.',
    tempo: { basis: 'convention', note: '≈ 1,4 s je Doppelschritt (Konvention; Strongman bei Höchstlast ≈ 1,4 Doppelschritte/s).' },
    frames: FWK.k.map((pose, i) => ({ label: ['Rechts auf', 'Rechts', 'Mitte', 'Links ab', 'Links auf', 'Links', 'Mitte', 'Rechts ab'][i], pose: { ...pose, armPlumb: true, elbow: C(0), props: farmerProps } })),
    phases: FWK.k.map((_, i) => ({ a: i, b: (i + 1) % 8, dur: 0.175, label: 'Gehen', kp: [[0, 1], [0, 1], [2], [2], [3], [3], [4], [4]][i], ease: 'none' })),
    keyPoints: [
      { short: 'Aufrecht', anchor: 'chest', side: 'r', status: 'single', text: 'Aufrecht gehen, Schultern zurück, Hanteln seitlich am Körper.', src: ['ST'],
        explain: 'Protokoll bei 16 Kraftsportlern (75 % des 6RM, 8 m): Kurzhanteln mit zurückgezogenen Schultern und aufrechtem Rumpf; für die Beine gab es keine Vorgabe (Stastny et al. 2015).' },
      { short: 'Schritte', anchor: 'foot', side: 'r', status: 'single', text: 'Mit Last werden die Schritte kürzer und häufiger als beim normalen Gehen.', src: ['HI'],
        explain: 'Strongman-Athleten: Doppelschritt 1,04 statt 1,43 m, Schrittfrequenz 1,42 statt 0,88 Doppelschritte/s (Winwood et al. 2014, Tabelle in Hindle et al. 2019). Nur 6 Athleten mit sehr hoher Last.' },
      { short: 'Gesäß', anchor: 'glute', side: 'l', status: 'single', text: 'Der mittlere Gesäßmuskel arbeitet mit, mehr bei schwachen Abduktoren.', src: ['ST'],
        explain: 'Gluteus medius 26–47 % der Maximalkraft, höher bei Personen mit relativ schwachen Hüftabduktoren (Stastny et al. 2015, 16 Kraftsportler). Die Oberschenkelmuskeln blieben niedrig.' },
      { short: 'Rumpf', anchor: 'belly', side: 'r', status: 'single', text: 'Beidseitig tragen: mehr Rumpfsteifigkeit, einseitig mehr Verdrehung.', src: ['HI'],
        explain: 'Übersicht (nach McGill et al. 2009): Farmer\'s Walk mit mehr Muskelkompression und Steifigkeit, einseitiges Tragen mit mehr Verdrehung der Lendenwirbelsäule (≈ 11° gegen 8°) (Hindle et al. 2019).' },
      { short: 'Griff', anchor: 'hand', side: 'r', status: 'single', text: 'Fest greifen, das Handgelenk leicht gestreckt.', src: ['OD'],
        explain: 'Beim stärksten Griff wählten Gesunde im Mittel ≈ 35° Handgelenkstreckung; für volle Griffkraft brauchte es mindestens 25° (O\'Driscoll et al. 1992, Abstract). Gezeichnet ist das Handgelenk gerade (Konvention).' }
    ],
    sources: {
      ST: { label: 'Stastny et al. 2015, J Hum Kinet', url: 'https://doi.org/10.1515/hukin-2015-0016', read: 'fulltext' },
      HI: { label: 'Hindle et al. 2019, Sports Med Open (Review)', url: 'https://doi.org/10.1186/s40798-019-0222-z', read: 'fulltext' },
      OD: { label: 'O\'Driscoll et al. 1992, J Hand Surg Am', url: 'https://doi.org/10.1016/0363-5023(92)90136-d', read: 'abstract' }
    }
  },

  // ---------- Runde 16: Ausfallschritte gehend ----------
  {
    ref: 'walking-lunge', checkedAt: '2026-10-21', view: 'side', basis: 'transfer',
    basisNote: 'Kamera folgt der Hüfte: die Figur geht abwechselnd links und rechts in den Ausfallschritt, die Füße wandern im Bild nach hinten. Unten wie beim Ausfallschritt vorwärts (vorderes Bein nach Riemann et al. 2012, hinteres Knie knapp über dem Boden). Die Tiefe passt zu Escamilla et al. 2025 (Volltext, 20 Personen, Kurzhanteln): vorderes Knie ≈ 90–100°, hinteres Knie berührt fast den Boden, Rumpf 10–20° vor (hier 3°). Durchschwingen und Aufsetzen sind Konvention; den Übergang zwischen den Schritten hat keine Studie gemessen.',
    tempo: { basis: 'convention', note: '1,2 s hoch, 0,5 s Schritt, 1,2 s ab (Konvention). Escamilla et al. 2025: Metronom 25/min, Knie ≈ 45°/s.' },
    frames: WLG.k.map((pose, i) => ({ label: ['Unten', 'Hoch', 'Aufsetzen', 'Unten', 'Hoch', 'Aufsetzen'][WLG.seg[i]] + (i % 3 ? ' ·' : ''), pose: { ...pose, armPlumb: true, elbow: C(0), props: lungeProps } })),
    phases: (() => { const out = [], dur = [1.2, 0.5, 1.2, 1.2, 0.5, 1.2], lab = ['Hochdrücken', 'Schritt', 'Absenken', 'Hochdrücken', 'Schritt', 'Absenken'], kp = [[0], [3], [1, 2], [0], [3], [1, 2]];
      for (let i = 0; i < 18; i++) { const sg = WLG.seg[i]; if (i % 9 === 0) out.push({ a: i, b: i, dur: 0.3, label: 'Unten', kp: [1] }); out.push({ a: i, b: (i + 1) % 18, dur: dur[sg] / 3, label: lab[sg], kp: kp[sg] }); }
      return out; })(),
    keyPoints: [
      { short: 'Schritt', anchor: 'foot', side: 'r', status: 'single', text: 'Großer Schritt: unten steht das vordere Schienbein etwa senkrecht.', src: ['E5'],
        explain: 'So war der lange Schritt in Escamilla et al. 2025 definiert (20 Personen, 3D-Messung): 86 ± 3 cm (Männer) und 77 ± 5 cm (Frauen) von der hinteren Fußspitze zur vorderen Ferse.' },
      { short: 'Tiefe', anchor: 'knee', side: 'r', status: 'single', text: 'So tief, bis das hintere Knie fast den Boden berührt.', src: ['E5'],
        explain: 'Vorgabe in Escamilla et al. 2025; das vordere Knie erreichte dabei etwa 90–100° (langer Schritt) bzw. 100–110° (kurzer Schritt).' },
      { short: 'Rumpf', anchor: 'back', side: 'l', status: 'single', text: 'Rumpf fast aufrecht; mehr Vorlage fordert den unteren Rücken stärker.', src: ['BZ', 'E5'],
        explain: '12 trainierte Frauen: unterer Rückenstrecker mit geneigtem Rumpf 40 ± 29 statt 20 ± 15 % der Maximalkraft (Bezerra et al. 2021, Abstract). In Escamilla et al. 2025 lag die Vorneigung unten bei 10–20°, nicht vorgegeben.' },
      { short: 'Gesäß', anchor: 'glute', side: 'l', status: 'consensus', text: 'Mit Schritt arbeitet der große Gesäßmuskel mehr als im Ausfallschritt am Platz.', src: ['BZ', 'E5'],
        explain: 'Großer Gesäßmuskel gehend 58 ± 30, statisch 31 ± 12 % der Maximalkraft (Bezerra et al. 2021, 12 Frauen). Auch Escamilla et al. 2025 fanden mit Schritt mehr Gesäßaktivität als mit stehenden Füßen.' }
    ],
    sources: {
      E5: { label: 'Escamilla et al. 2025, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk10010042', read: 'fulltext' },
      BZ: { label: 'Bezerra et al. 2021, Int J Exerc Sci', url: 'https://doi.org/10.70252/IGJM9937', read: 'abstract' },
      L1: { label: 'Riemann et al. 2012, J Athl Train', url: 'https://doi.org/10.4085/1062-6050-47.4.16', read: 'fulltext', note: 'Ausfallschritt vorwärts, übertragen' }
    }
  },

  // ---------- Runde 16: Belt Squat ----------
  {
    ref: 'belt-squat', checkedAt: '2026-10-21', view: 'side', basis: 'protocol',
    basisNote: 'Keine Studie hat die Bewegung gemessen (Joseph et al. 2020 schreiben das selbst). Aufbau nach Joseph et al. 2020 (Volltext): Knöchel unter dem Gurt-Ansatz, Hebel im Stand waagerecht, Hände nur leicht am Griff, 2 s ab / 2 s auf. Rumpf „möglichst senkrecht“ und Kniebeugung bis 90° aus dem isometrischen Belt Squat von Varela-Olalla et al. 2024 (Volltext). Schienbeinneigung und Rumpf (2–12°) sind aus der Geometrie gelöst bzw. Konvention, ebenso Podest, Kette und Hebel.',
    tempo: { basis: 'protocol', note: '2 s ab / 2 s auf mit Metronom (Joseph et al. 2020).' },
    frames: [
      { label: 'Oben', pose: { ...BSQ.root, ...BSQ.top, armWorld: BSQ.hand, elbowSide: -1, props: beltSquatProps } },
      { label: 'Mitte', pose: { ...BSQ.root, ...BSQ.mid, armWorld: BSQ.hand, elbowSide: -1, props: beltSquatProps } },
      { label: 'Unten', pose: { ...BSQ.root, ...BSQ.bottom, knee: V(90, 'V1', 'protocol', 'tiefste Testposition 90° Kniebeugung (innen 90°)'), armWorld: BSQ.hand, elbowSide: -1, props: beltSquatProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0, 2] }, { a: 0, b: 1, dur: 1.0, label: 'Absenken', kp: [1] }, { a: 1, b: 2, dur: 1.0, label: 'Absenken', kp: [1] }, { a: 2, b: 2, dur: 0.2, label: 'Unten', kp: [3] }, { a: 2, b: 1, dur: 1.0, label: 'Aufstehen', kp: [4] }, { a: 1, b: 0, dur: 1.0, label: 'Aufstehen', kp: [4] }],
    keyPoints: [
      { short: 'Stand', anchor: 'foot', side: 'r', status: 'single', text: 'Füße so stellen, dass die Knöchel unter dem Gurt-Ansatz liegen.', src: ['J1'],
        explain: 'Ausrichtung nach Herstellerangabe in Joseph et al. 2020 (10 Erfahrene); der Hebel stand im aufrechten Stand waagerecht.' },
      { short: 'Aufrecht', anchor: 'chest', side: 'r', status: 'single', text: 'Oberkörper möglichst aufrecht halten.', src: ['V1'],
        explain: 'Vorgabe beim isometrischen Belt Squat bei 60–90° Kniebeugung (Varela-Olalla et al. 2024, 5 Trainierte). Gemessen wurde die Rumpfneigung nicht.' },
      { short: 'Hände', anchor: 'hand', side: 'r', status: 'single', text: 'Hände nur leicht auf den Griff legen, nicht mitziehen.', src: ['J1'],
        explain: 'Bei Joseph et al. 2020 durften die Hände nur über dem Griff schweben oder leicht aufliegen.' },
      { short: 'Rücken', anchor: 'lowBack', side: 'l', status: 'single', text: 'Unterer Rücken und Bauch arbeiten deutlich weniger als bei der Kniebeuge.', src: ['J1'],
        explain: '10 Erfahrene, je 3 × 5 mit Körpergewicht als Last: unterer Rückenstrecker −45 % (Impuls) und −52 % (Spitze), gerader Bauchmuskel −44 % gegenüber der Langhantel-Kniebeuge (Joseph et al. 2020).' },
      { short: 'Beine', anchor: 'thigh', side: 'r', status: 'consensus', text: 'Oberschenkel ähnlich gefordert wie bei der Kniebeuge, das Gesäß etwas weniger.', src: ['J1', 'EV'],
        explain: 'Quadrizeps ohne Unterschied, großer Gesäßmuskel −32 bis −35 % (Joseph et al. 2020); Evans et al. 2019 (31 Personen, 5RM, Abstract) fanden ebenfalls weniger Gesäßaktivität (0,69 gegen 0,84).' }
    ],
    sources: {
      J1: { label: 'Joseph et al. 2020, J Hum Kinet', url: 'https://doi.org/10.2478/hukin-2019-0126', read: 'fulltext' },
      V1: { label: 'Varela-Olalla et al. 2024, Sensors (Basel)', url: 'https://doi.org/10.3390/s24103256', read: 'fulltext' },
      EV: { label: 'Evans et al. 2019, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000002052', read: 'abstract' }
    }
  },

  // ---------- Runde 16: Sissy Squat ----------
  {
    ref: 'sissy-squat', checkedAt: '2026-10-21', view: 'side', basis: 'convention',
    basisNote: 'Keine Studie zum Sissy Squat gefunden (PubMed 2026-10-21: keine Treffer). Alle Winkel sind Zeichenkonvention: Fußballen fest, Fersen heben sich, Knie wandern weit nach vorn bis ≈ 100° Beugung, Hüfte gestreckt, Rumpf und Oberschenkel in einer Linie nach hinten geneigt; eine Hand am Pfosten. Die Kernpunkte sind von der Kniebeuge und vom Ausfallschritt übertragen. Gestreckte Hüfte und das Festhalten mit einer Hand sind übliche Praxis, aber nicht untersucht (Trainingswissen, ungeprüft).',
    tempo: { basis: 'convention', note: 'Gezeichnet 2 s ab / 2 s auf (Konvention).' },
    frames: [
      { label: 'Oben', pose: { root: 'toe', rootPos: SSQ.ball, shank: C(4), knee: C(4), hip: C(0), foot: C(95, 'Fersen leicht angehoben'), armWorld: SSQ.hand, elbowSide: 1, props: sissyProps } },
      { label: 'Mitte', pose: { root: 'toe', rootPos: SSQ.ball, shank: C(32), knee: C(55), hip: C(0), foot: C(118), armWorld: SSQ.hand, elbowSide: 1, props: sissyProps } },
      { label: 'Unten', pose: { root: 'toe', rootPos: SSQ.ball, shank: C(55, 'Knie weit vorn'), knee: C(100, 'Konvention, keine Messung'), hip: C(0, 'Hüfte gestreckt'), foot: C(135, 'auf den Fußballen'), armWorld: SSQ.hand, elbowSide: 1, props: sissyProps } }
    ],
    phases: [{ a: 0, b: 0, dur: 0.4, label: 'Oben', kp: [0] }, { a: 0, b: 1, dur: 1.0, label: 'Absenken', kp: [0] }, { a: 1, b: 2, dur: 1.0, label: 'Absenken', kp: [0, 1] }, { a: 2, b: 2, dur: 0.2, label: 'Unten', kp: [1] }, { a: 2, b: 1, dur: 1.0, label: 'Aufrichten', kp: [1] }, { a: 1, b: 0, dur: 1.0, label: 'Aufrichten', kp: [0] }],
    keyPoints: [
      { short: 'Knie', anchor: 'knee', side: 'r', status: 'single', text: 'Knie wandern weit nach vorn – die Last liegt vor allem auf dem Kniestrecker.', src: ['FR'],
        explain: 'Übertragen von der Kniebeuge (7 trainierte Männer): Durften die Knie nach vorn wandern, stieg das Kniemoment (150 statt 117 N·m) und das Hüftmoment sank (28 statt 303 N·m) (Fry et al. 2003, Abstract). Zum Sissy Squat selbst gibt es keine Studie.' },
      { short: 'Hüfte', anchor: 'glute', side: 'l', status: 'single', text: 'Die Hüfte arbeitet kaum mit, wenn die Knie frei nach vorn wandern.', src: ['FR'],
        explain: 'Übertragen von der Kniebeuge: Mit frei nach vorn wandernden Knien lag das Hüftmoment bei 28 statt 303 N·m (Fry et al. 2003, 7 Männer, Abstract). Beim Sissy Squat bleibt die Hüfte gestreckt; gemessen wurde das nicht.' },
      { short: 'Kniedruck', anchor: 'thigh', side: 'r', status: 'single', text: 'Tiefe Beugung mit Knie vor den Zehen erhöht den Druck hinter der Kniescheibe.', src: ['E8'],
        explain: 'Übertragen vom Ausfallschritt (18 Personen, 12RM): Zwischen 70 und 90° Kniebeugung waren Kraft und Druck im Kniescheibengelenk mit kurzem Schritt (Knie vor den Zehen) höher (Escamilla et al. 2008, Abstract).' }
    ],
    sources: {
      FR: { label: 'Fry et al. 2003, J Strength Cond Res', url: 'https://doi.org/10.1519/1533-4287(2003)017<0629:eokpoh>2.0.co;2', read: 'abstract' },
      E8: { label: 'Escamilla et al. 2008, J Orthop Sports Phys Ther', url: 'https://doi.org/10.2519/jospt.2008.2694', read: 'abstract' }
    }
  }

];

// ---------- Szenen (Geräte) ----------
function trunkPoint(P, dx, dy) { // Punkt in Rumpfkoordinaten (dx nach vorn, dy nach oben) ab Schultergelenk
  const t = (P.angles.upper ?? P.angles.trunk) * Math.PI / 180, up = [Math.sin(t), -Math.cos(t)], fw = [Math.cos(t), Math.sin(t)]; // v2.13: oberer Rumpf, wenn gebogen
  const s = P.joints.shoulder;
  return [s[0] + fw[0] * dx + up[0] * dy, s[1] + fw[1] * dx + up[1] * dy];
}
function squatProps(off) {
  return (P) => { const bar = trunkPoint(P, off[0], off[1]); return { anchors: { bar }, scene: [plate(bar)] }; };
}
function handPlate(P) { const bar = P.joints.hand; return { anchors: { bar }, scene: [plate(bar)] }; }
function hipThrustProps(P) {
  const bar = trunkPoint(P, 22, -98);
  return { anchors: { bar }, scene: [{ type: 'rect', x: -320, y: -74, w: 144, h: 74, rx: 6 }, plate(bar)] };
}
function bssProps(P) {
  const hand = P.joints.hand;
  return { anchors: { hand }, scene: [{ type: 'rect', x: -185, y: -82, w: 70, h: 82, rx: 6 }, db(hand)] }; // v2.9: Kurzhantel in echter Größe
}
function lungeProps(P) { const hand = P.joints.hand; return { anchors: { hand }, scene: [db(hand)] }; } // v2.9: Kurzhantel in echter Größe
function calfProps(P) {
  // Schulterpolster-Maschine: Säule vor der Figur, Schlitten mit Polster (folgt den Schultern) und Griffe an der Säule.
  const s = P.joints.shoulder, pad = [s[0] - 6, s[1] - 14], col = 118, top = pad[1] - 64, hand = P.joints.hand;
  return { anchors: {}, scene: [
    { type: 'rect', x: 16, y: -STEP, w: 22, h: STEP, rx: 2, step: true },
    { type: 'line', from: [col, 0], to: [col, -410], w: 7 }, foot(col - 40, col + 40), // Säule, Standfuß
    { type: 'line', from: [col, top], to: [pad[0], top], w: 6 }, { type: 'line', from: [pad[0], top], to: [pad[0], pad[1]], w: 4 }, // Schlitten, Haltearm zum Polster
    { type: 'rect', x: pad[0] - 16, y: pad[1] - 4, w: 32, h: 10, rx: 4 }, // Schulterpolster
    { type: 'line', from: [col, hand[1]], to: [hand[0] + 2, hand[1]], w: 4 }, { type: 'line', from: [hand[0] - 10, hand[1]], to: [hand[0] + 10, hand[1]], w: 3 } // Griffarm, Griff
  ] };
}
function dipProps(P) {
  // Barren laufen von vorn nach hinten, in der Seitenansicht als Stangen mit Stütze vorn und hinten.
  const w = P.joints.wrist, y = w[1] + 2;
  return { anchors: { uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'line', from: [w[0] - 62, y], to: [w[0] + 62, y], w: 6 }, // Barren
    { type: 'line', from: [w[0] - 62, y], to: [w[0] - 62, 0], w: 6 }, { type: 'line', from: [w[0] + 62, y], to: [w[0] + 62, 0], w: 6 }, foot(w[0] - 92, w[0] + 92), // Stützen, Standfuß
    { type: 'bar', at: [w[0], y], r: 5 }
  ] };
}
function benchProps(P) {
  const bar = P.joints.hand;
  return { anchors: { bar }, scene: [{ type: 'rect', x: -95, y: -92, w: 225, h: 12, rx: 3 }, { type: 'line', from: [-60, -80], to: [-60, 0], w: 5 }, { type: 'line', from: [100, -80], to: [100, 0], w: 5 }, plate(bar)] };
}
function pushupProps(P) { return { anchors: {}, scene: [] }; }
function rowProps(P) {
  const hand = P.joints.hand, pulley = [240, -70];
  return { anchors: { hand, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'rect', x: -34, y: -90, w: 68, h: 10, rx: 3 }, { type: 'line', from: [0, -80], to: [0, 0], w: 5 }, // Sitz
    { type: 'line', from: [166, -78], to: [190, -8], w: 5 }, // Fußplatte
    { type: 'line', from: [264, 0], to: [264, -100], w: 7 }, { type: 'line', from: [264, -70], to: [pulley[0], -70], w: 5 }, foot(110, 290), // Turm der Kabelrolle, Arm, Standfuß
    { type: 'line', from: hand, to: pulley, w: 1.5, dash: true }, { type: 'bar', at: hand, r: 4 }, { type: 'bar', at: pulley, r: 9 }
  ] };
}
// Frontansicht
function pullupProps(P) {
  return { anchors: { bar: [0, PU.bar] }, scene: behindInBack(P, [{ type: 'line', from: [-130, PU.bar], to: [130, PU.bar], w: 5 }, { type: 'bar', at: [-130, PU.bar], r: 5 }, { type: 'bar', at: [130, PU.bar], r: 5 }]) };
}
// v2.22.0: In der Rückansicht liegt die ganze Szene hinter der Figur (Stange, Kabel und Griffe vor dem Körper verschwinden hinter dem Rücken).
function behindInBack(P, sc) { return P.back ? sc.map((x) => ({ ...x, front: false, back: true })) : sc; }
function pulldownProps(P) {
  const hr = P.joints.handR, hl = P.joints.handL, y = (hr[1] + hl[1]) / 2;
  const sc = pulldownScene(hr, hl, y);
  return { anchors: { bar: [0, y] }, scene: P.back ? sc.map((x) => ({ ...x, front: false, back: true })) : sc }; // v2.20.0: von hinten liegt alles hinter der Figur
}
function pulldownScene(hr, hl, y) {
  return [
    { type: 'rect', x: -36, y: -100, w: 72, h: 10, rx: 3 }, { type: 'line', from: [0, -90], to: [0, 0], w: 5 }, foot(-64, 64), // Sitz, Standfuß
    { type: 'line', from: [-32, -376], to: [32, -376], w: 6 }, { type: 'bar', at: [0, -370], r: 6 }, // Träger und Umlenkrolle oben
    { type: 'line', from: [0, -370], to: [0, y - 4], w: 1.5, dash: true, front: true }, // Seilzug (v2.15.0: vor dem Gesicht, wie die Stange)
    // Oberschenkelpolster: zwei Polster auf den Oberschenkeln, an den Sitzkanten gehalten
    { type: 'rect', x: -34, y: -130, w: 28, h: 10, rx: 4, front: true }, { type: 'rect', x: 6, y: -130, w: 28, h: 10, rx: 4, front: true },
    { type: 'line', from: [-34, -125], to: [-34, -100], w: 4 }, { type: 'line', from: [34, -125], to: [34, -100], w: 4 },
    { type: 'line', from: [hl[0] - 14, y], to: [hr[0] + 14, y], w: 5, front: true }, { type: 'bar', at: [hr[0] + 14, y], r: 4 }, { type: 'bar', at: [hl[0] - 14, y], r: 4 }
  ];
}
function raiseProps(P) {
  return { anchors: {}, scene: [db(P.joints.handR, [1, 0], true), db(P.joints.handL, [1, 0], true)] }; // v2.14.1: echte Kurzhantel, Achse zeigt aus dem Bild (Daumen vorn / Neutralgriff)
}
// Langhantel in der Frontansicht (v2.9): Stange 2,2 m (± 225), Scheiben Ø 45 cm hochkant ab der Hülse (± 134), zwei je Seite.
// noBounds: die Karte richtet sich nach der Figur; Stangenenden und Scheiben dürfen über den Rand ragen.
function frontBarbell(y) {
  const sc = [{ type: 'line', from: [-225, y], to: [225, y], w: 5, front: true, noBounds: true }];
  for (const sg of [1, -1]) {
    sc.push({ type: 'rect', x: sg > 0 ? 134 : -146, y: y - PLATE, w: 12, h: 2 * PLATE, rx: 3, front: true, noBounds: true }, { type: 'rect', x: sg > 0 ? 148 : -158, y: y - PLATE, w: 10, h: 2 * PLATE, rx: 3, front: true, noBounds: true });
    sc.push({ type: 'rect', x: sg > 0 ? 128 : -132, y: y - 9, w: 4, h: 18, rx: 1, front: true, noBounds: true }); // Hülsenbund
  }
  return sc;
}
function sumoProps(P) {
  const y = (P.joints.shoulderR[1] + P.joints.shoulderL[1]) / 2 - 10; // Stange auf dem oberen Trapez, knapp über den Schultergelenken
  return { anchors: { bar: [0, y] }, scene: frontBarbell(y) };
}
// ---------- Szenen Runde 3.1 (v2.9) ----------
function slRdlProps(P) { const hand = P.joints.hand; return { anchors: { hand }, scene: [db(hand, [1, 0])] }; } // Kurzhantel in der Hand gegenüber dem Standbein
function bridgeProps(P) {
  const b = trunkPoint(P, 22, -98), bar = [b[0], Math.min(b[1], -PLATE)]; // Stange über dem Becken; unten stehen die Scheiben auf dem Boden
  return { anchors: { bar }, scene: [plate(bar)] };
}
function backExtProps(P) {
  const an = P.joints.ankle, sd = segDir(P, 'shank'), sn = segNrm(P, 'shank'), td = segDir(P, 'thigh'), tn = segNrm(P, 'thigh');
  const h = P.joints.hip, fd = segDir(P, 'foot');
  const sole = along(an, segNrm(P, 'foot'), -15); // Sohle unter dem Fuß
  const roller = along(along(an, sd, -14), sn, -12); // Fersenrolle hinten am unteren Schienbein (sd zeigt Knie → Knöchel)
  const padTop = along(along(h, td, 10), tn, -22), padLow = along(along(h, td, 70), tn, -22); // Polster vor dem Oberschenkel, Kante an der Hüfte
  const base = [padLow[0] + 10, 0];
  return { anchors: { pad: padTop }, scene: [
    { type: 'line', from: along(sole, fd, -10), to: along(sole, fd, 36), w: 6 }, // Fußplatte
    { type: 'bar', at: roller, r: 9 }, // Fersenrolle
    { type: 'line', from: padTop, to: padLow, w: 14 }, // Oberschenkelpolster
    { type: 'line', from: along(padLow, tn, -8), to: base, w: 6 }, { type: 'line', from: along(sole, fd, 10), to: [along(sole, fd, 10)[0], 0], w: 5 }, foot(along(sole, fd, 10)[0] - 30, base[0] + 30)
  ] };
}
function kickbackProps(P) {
  const t = KICK.tower, cuff = P.joints.ankle; // Manschette am arbeitenden (nahen) Bein
  return { anchors: { cuff }, scene: [
    { type: 'line', from: [t, 0], to: [t, -420], w: 8 }, foot(t - 40, t + 50), // Turm mit Standfuß
    { type: 'bar', at: [t - 8, KICK.pulley], r: 7 }, // untere Rolle
    { type: 'line', from: [t - 8, KICK.pulley], to: cuff, w: 1.5, dash: true, front: true }, // Seil zur Manschette
    { type: 'rect', x: cuff[0] - 7, y: cuff[1] - 6, w: 14, h: 12, rx: 4, front: true }, // Manschette
    { type: 'line', from: [t, P.joints.hand[1]], to: [P.joints.hand[0] - 4, P.joints.hand[1]], w: 4 } // Haltegriff
  ] };
}
function benchDbProps(P) {
  const hand = P.joints.hand;
  return { anchors: { hand }, scene: [{ type: 'rect', x: -95, y: -92, w: 225, h: 12, rx: 3 }, { type: 'line', from: [-60, -80], to: [-60, 0], w: 5 }, { type: 'line', from: [100, -80], to: [100, 0], w: 5 }, db(hand, [1, 0], true)] };
}
function inclineBarProps(P) {
  const h = P.joints.hip, top = along(along(h, segNrm(P, 'trunk'), -24), segDir(P, 'trunk'), -165), bar = P.joints.hand;
  return { anchors: { bar }, scene: [
    benchLine(P, 24, 170, -6), { type: 'line', from: [h[0] - 20, h[1] + 24], to: [h[0] + 50, h[1] + 24], w: 14 },
    { type: 'line', from: [h[0] + 10, h[1] + 30], to: [h[0] + 10, 0], w: 6 }, { type: 'line', from: top, to: [top[0], 0], w: 6 }, foot(h[0] - 20, h[0] + 40), foot(top[0] - 30, top[0] + 30), plate(bar)
  ] };
}
function declineProps(P) {
  const bar = P.joints.hand, h = P.joints.hip, kn = P.joints.knee, an = P.joints.ankle;
  const lo = along(along(h, segNrm(P, 'trunk'), -22), segDir(P, 'trunk'), -150); // Kopfende der Bank (unten)
  const hi = along(along(h, segNrm(P, 'trunk'), -22), segDir(P, 'trunk'), 14); // Hüftende
  const roller = along(along(an, segDir(P, 'shank'), -12), segNrm(P, 'shank'), 12); // Rolle vor dem Schienbein über dem Knöchel
  const kneePad = along(kn, segNrm(P, 'thigh'), -14);
  return { anchors: { bar }, scene: [
    { type: 'line', from: lo, to: hi, w: 14 }, { type: 'line', from: hi, to: kneePad, w: 10 }, // Bank und Beinteil
    { type: 'line', from: lo, to: [lo[0], 0], w: 6 }, { type: 'line', from: kneePad, to: [kneePad[0], 0], w: 6 }, foot(lo[0] - 30, kneePad[0] + 30),
    { type: 'line', from: kneePad, to: roller, w: 4 }, { type: 'bar', at: roller, r: 10 }, // Halter und Fußrolle
    plate(bar)
  ] };
}
function chestPressProps(P) {
  const h = P.joints.hip, hand = P.joints.hand, sh = P.joints.shoulder;
  const pivot = [sh[0] - 46, sh[1] - 60]; // Drehpunkt der Hebelarme hinter und über der Schulter (Konvention); Hebel läuft seitlich am Körper vorbei
  return { anchors: { hand }, scene: [
    { type: 'rect', x: h[0] - 30, y: h[1] + 2, w: 70, h: 12, rx: 4 }, benchLine(P, 26, 140, -8), // Sitz, Lehne
    { type: 'line', from: [h[0] - 10, h[1] + 14], to: [h[0] - 10, 0], w: 6 }, { type: 'line', from: [pivot[0], 0], to: pivot, w: 7 }, foot(h[0] - 70, h[0] + 30), // Sitzstütze (v2.15.0: unter dem Sitz statt daneben), Säule
    { type: 'line', from: pivot, to: [pivot[0] + 30, hand[1] - 2], w: 5 }, { type: 'line', from: [pivot[0] + 30, hand[1] - 2], to: [hand[0], hand[1] - 2], w: 5 }, // Hebelarm hinter dem Körper
    { type: 'line', from: [hand[0], hand[1] - 14], to: [hand[0], hand[1] + 10], w: 5, front: true } // Griff
  ] };
}
function smithProps(P) {
  const bar = trunkPoint(P, SMITH_BAR[0], SMITH_BAR[1]), x = SMITH.x;
  return { anchors: { bar }, scene: [
    { type: 'line', from: [x, 0], to: [x, -440], w: 6 }, foot(x - 70, x + 70), // Führungsschiene (beide Schienen decken sich von der Seite), Standfuß
    { type: 'line', from: [x - 70, -440], to: [x + 70, -440], w: 6 }, // Querträger oben
    { type: 'rect', x: x - 9, y: bar[1] - 14, w: 18, h: 28, rx: 3 }, // Schlitten an der Schiene
    { type: 'line', from: [x + 9, -250], to: [x + 22, -250], w: 4 }, // Sicherheitshaken (Konvention)
    plate([x, bar[1]])
  ] };
}
function hackProps(P) {
  const d = HACK_LINE.d, n = [-d[1], d[0]]; // d: Bahn nach oben-hinten, n: nach hinten-unten (hinter dem Rücken)
  const an = [0, -15 - HACK.plat], base = (k, b) => [an[0] + HACK_LINE.p[0] + d[0] * k + n[0] * b, an[1] + HACK_LINE.p[1] + d[1] * k + n[1] * b];
  const r0 = base(-60, -34), r1 = base(230, -34); // Schiene hinter der Rückenlehne (fest in der Welt)
  const sh = trunkPoint(P, 2, 12); // Schulterpolster auf der Schulter
  const pd = dir2(70), sole = [an[0] - pd[1] * 15, an[1] + pd[0] * 15]; // Sohle 15 unter dem Knöchel (senkrecht zum Fuß), Plattform in Fußrichtung
  return { anchors: { pad: sh }, scene: [
    { type: 'line', from: r0, to: r1, w: 8 }, { type: 'line', from: r0, to: [r0[0], 0], w: 6 }, { type: 'line', from: r1, to: [r1[0], 0], w: 6 }, foot(r1[0] - 30, 70), // Schiene, Stützen, Standfuß
    benchLine(P, 20, 128, 34), // Rückenpolster auf dem Schlitten
    { type: 'line', from: along(sh, n, 10), to: along(sh, n, 22), w: 5 }, { type: 'bar', at: sh, r: 9 }, // Halter und Schulterpolster
    { type: 'line', from: along(sole, pd, -30), to: along(sole, pd, 60), w: 8, front: true }, // Plattform (vorn 20° angehoben)
    { type: 'line', from: along(sole, pd, 40), to: [along(sole, pd, 40)[0], 0], w: 6 }, { type: 'line', from: along(sole, pd, -30), to: r0, w: 5 } // Stütze, Verbindung zur Schiene
  ] };
}
function stepUpProps(P) {
  const L = P.joints.hand;
  return { anchors: { box: [42, -STEPUP.box / 2], dumbbell: L }, scene: [{ type: 'rect', x: -44, y: -STEPUP.box, w: 88, h: STEPUP.box, rx: 4 }, db(L)] };
}
function revLungeProps(P) { const hand = P.joints.hand; return { anchors: { hand }, scene: [db(hand)] }; }
function gobletProps(P) {
  const at = trunkPoint(P, GOBLET.at[0], GOBLET.at[1]), t = P.angles.trunk * Math.PI / 180;
  return { anchors: { dumbbell: at }, scene: [db(at, [Math.sin(t), -Math.cos(t)])] };
}
// ---------- Szenen der zweiten Runde (v2.1) ----------
const segDir = (P, seg) => P.F[seg].d; // Richtung eines Segments (Einheitsvektor)
const segNrm = (P, seg) => P.F[seg].n; // Normale (zeigt im Stand nach vorn)
const along = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];
function benchLine(P, back, up, down) { // Lehne hinter dem Rumpf (back: Abstand hinter der Rumpfachse), von „down“ unter der Hüfte bis „up“ über ihr
  const d = segDir(P, 'trunk'), n = segNrm(P, 'trunk'), h = P.joints.hip; // d: Schulter → Hüfte
  const base = along(h, n, -back);
  return { type: 'line', from: along(base, d, -up), to: along(base, d, down), w: 14 };
}
function frontSquatProps(P) { const bar = trunkPoint(P, 12, -2); return { anchors: { bar }, scene: [plate(bar)] }; }
function legPressProps(P) {
  const an = P.joints.ankle, fd = segDir(P, 'foot'), fn = segNrm(P, 'foot');
  const sole = along(an, fn, -15), rail = [Math.SQRT1_2, -Math.SQRT1_2]; // Schienen 45° nach vorn-oben
  const pc = along(sole, fd, 12); // Plattenmitte
  return { anchors: { plate: along(pc, rail, 10) }, scene: [
    { type: 'line', from: along(pc, rail, -150), to: along(pc, rail, 90), w: 5 }, // Schiene
    { type: 'line', from: [pc[0] + 60, 0], to: along(pc, rail, 60), w: 5 }, // Stütze
    benchLine(P, 30, 150, 4), { type: 'line', from: along(along(P.joints.hip, segDir(P, 'trunk'), 16), segNrm(P, 'trunk'), -30), to: along(along(P.joints.hip, segDir(P, 'trunk'), 16), segNrm(P, 'trunk'), 44), w: 14 }, // Lehne, Sitz
    { type: 'line', from: [P.joints.hip[0] + 20, P.joints.hip[1] + 20], to: [P.joints.hip[0] + 20, 0], w: 5 }, foot(P.joints.hip[0] - 30, pc[0] + 80), // Standfuß
    { type: 'line', from: along(pc, fd, -34), to: along(pc, fd, 46), w: 8, front: true } // Fußplatte
  ] };
}
function legExtensionProps(P) {
  const an = P.joints.ankle, kn = P.joints.knee, sd = segDir(P, 'shank'), sn = segNrm(P, 'shank');
  const pad = along(along(an, sd, -8), sn, 19); // Mitte der Rolle: Schienbeinrand (≈ 8) + Rollenradius 11, knapp über dem Knöchel
  const h = P.joints.hip;
  return { anchors: { pad }, scene: [
    { type: 'rect', x: h[0] - 40, y: h[1] + 2, w: 90, h: 12, rx: 4 }, benchLine(P, 26, 120, -8), // Sitz, Lehne
    { type: 'line', from: [h[0] - 10, h[1] + 14], to: [h[0] - 10, 0], w: 6 }, { type: 'line', from: [h[0] - 50, 0], to: [h[0] + 40, 0], w: 4 },
    { type: 'line', from: kn, to: pad, w: 7, back: true }, { type: 'bar', at: pad, r: 11 } // gepolsterter Hebel ab Knieachse (seitlich, v2.15.0: hinter dem Bein), Rolle
  ] };
}
function legCurlProps(P) {
  const an = P.joints.ankle, kn = P.joints.knee, sd = segDir(P, 'shank'), sn = segNrm(P, 'shank');
  const pad = along(along(an, sd, -8), sn, -19); // Mitte der Rolle: Wadenrand (≈ 8) + Rollenradius 11, hinten an der Wade knapp über der Ferse
  const h = P.joints.hip, s = P.joints.shoulder;
  const seat = along(h, segDir(P, 'thigh'), 40);
  return { anchors: { pad }, scene: [
    { type: 'line', from: [s[0] + 40, h[1] + 20], to: [h[0] - 4, h[1] + 20], w: 14 }, // Polster Rumpf
    { type: 'line', from: along(h, segNrm(P, 'thigh'), 20), to: along(seat, segNrm(P, 'thigh'), 20), w: 14 }, // schräges Polster Oberschenkel
    { type: 'line', from: [h[0] + 20, h[1] + 27], to: [h[0] + 20, 0], w: 6 }, { type: 'line', from: [s[0] + 30, h[1] + 27], to: [s[0] + 30, 0], w: 6 },
    foot(Math.min(h[0] + 20, s[0] + 30) - 30, Math.max(h[0] + 20, s[0] + 30) + 30), // Standfuß
    { type: 'line', from: kn, to: pad, w: 7, back: true }, { type: 'bar', at: pad, r: 11 } // v2.15.0: Hebel seitlich, hinter dem Bein
  ] };
}
function ohpProps(P) { const bar = P.joints.hand; return { anchors: { bar }, scene: [plate(bar)] }; }
function shoulderPressProps(P) {
  const hand = P.joints.hand, h = P.joints.hip;
  return { anchors: { hand }, scene: [
    { type: 'rect', x: h[0] - 30, y: h[1] + 2, w: 64, h: 12, rx: 4 }, benchLine(P, 26, 130, -8),
    { type: 'line', from: [h[0], h[1] + 14], to: [h[0], 0], w: 6 }, foot(h[0] - 40, h[0] + 40), db(hand, [1, 0], true)
  ] };
}
function rowBarProps(P) { const bar = P.joints.hand; return { anchors: { bar, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [plate(bar)] }; }
function curlProps(P) { const hand = P.joints.hand; return { anchors: { hand, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [db(hand, [1, 0], true)] }; } // v2.14.1: echte Kurzhantel (Achse zeigt aus dem Bild)
function pushdownProps(P) {
  const hand = P.joints.hand, top = [100, -410];
  return { anchors: { hand, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'line', from: [top[0] + 40, 0], to: [top[0] + 40, -420], w: 6 }, { type: 'line', from: [top[0] - 12, -420], to: [top[0] + 40, -420], w: 6 }, // Säule, Ausleger
    { type: 'line', from: top, to: hand, w: 1.5, dash: true }, { type: 'bar', at: top, r: 7 }, // Seil, Umlenkrolle
    { type: 'line', from: [hand[0] - 12, hand[1]], to: [hand[0] + 12, hand[1]], w: 5, front: true } // Griffstange
  ] };
}
function inclineProps(P) {
  const hand = P.joints.hand, h = P.joints.hip;
  const top = along(along(h, segNrm(P, 'trunk'), -24), segDir(P, 'trunk'), -165); // oberes Ende der Lehne
  return { anchors: { hand }, scene: [
    benchLine(P, 24, 170, -6), { type: 'line', from: [h[0] - 20, h[1] + 24], to: [h[0] + 50, h[1] + 24], w: 14 }, // Lehne, Sitz
    { type: 'line', from: [h[0] + 10, h[1] + 30], to: [h[0] + 10, 0], w: 6 }, { type: 'line', from: top, to: [top[0], 0], w: 6 }, foot(h[0] - 20, h[0] + 40), foot(top[0] - 30, top[0] + 30), db(hand, [1, 0], true)
  ] };
}
const foot = (x0, x1) => ({ type: 'line', from: [x0, 0], to: [x1, 0], w: 5 }); // Standfuß einer Maschine auf dem Boden
function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

// ---------- Szenen Runde 4 (v2.10) ----------
function oneRowProps(P) {
  const hand = P.joints.hand, [x0, x1] = ONE_ROW.bench;
  return { anchors: { hand, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'rect', x: x0, y: -92, w: x1 - x0, h: 12, rx: 3 }, { type: 'line', from: [x0 + 30, -80], to: [x0 + 30, 0], w: 5 }, { type: 'line', from: [x1 - 30, -80], to: [x1 - 30, 0], w: 5 }, // Flachbank
    db(hand, [1, 0]) // Neutralgriff: Griff läuft von vorn nach hinten
  ] };
}
// v2.15.0: kleinere Scheiben weiter vorn an der Stange – die 45-cm-Scheibe ragte oben in Brust und Oberschenkel. Werte so gewählt, dass der Rand
// über den ganzen Zyklus ≥ 2 Einheiten vor der Körperkontur bleibt (Test); Ø ≈ 30 cm entspricht kleinen Scheiben (Konvention).
const TBAR_PLATE = { r: 30, off: 40 };
function tbarProps(P) {
  const g = P.joints.hand, p = TBAR.pivot, u = unit2([g[0] - p[0], g[1] - p[1]]), L = Math.hypot(g[0] - p[0], g[1] - p[1]);
  const pl = along(p, u, L + TBAR_PLATE.off), end = along(p, u, L + TBAR_PLATE.off + 22);
  return { anchors: { hand: g, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'rect', x: p[0] - 16, y: -12, w: 32, h: 12, rx: 3 }, { type: 'bar', at: p, r: 6 }, // Bodenplatte mit Drehpunkt (Landmine)
    { type: 'line', from: p, to: end, w: 5 }, // Stange
    { type: 'line', from: along(g, [u[1], -u[0]], -4), to: along(g, [u[1], -u[0]], 8), w: 4, front: true }, // Griff unter der Stange
    { ...plate(pl, TBAR_PLATE.r), back: true } // Scheiben in der Körpermitte: hinter dem nahen Arm
  ] };
}
function csrProps(P) {
  const g = P.joints.hand, p = CSR.pivot, h = P.joints.hip, d = segDir(P, 'trunk'), n = segNrm(P, 'trunk');
  const padTop = along(along(h, n, 36), d, -92), padLow = along(along(h, n, 36), d, -4); // Polster vor Brust und Bauch, oben frei für die Arme
  const sole = along(P.joints.ankle, segNrm(P, 'foot'), -15), fd = segDir(P, 'foot');
  const u = unit2([g[0] - p[0], g[1] - p[1]]), peg = along(p, u, 70);
  return { anchors: { hand: g, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'line', from: along(sole, fd, -14), to: along(sole, fd, 40), w: 7 }, { type: 'line', from: along(sole, fd, 12), to: [along(sole, fd, 12)[0], 0], w: 5 }, // Fußplatte
    { type: 'line', from: padTop, to: padLow, w: 14 }, { type: 'line', from: along(padLow, n, 8), to: [along(padLow, n, 8)[0], 0], w: 6 }, // Brustpolster mit Stütze
    { type: 'line', from: [p[0], 0], to: p, w: 7 }, foot(Math.min(along(sole, fd, 12)[0], along(padLow, n, 8)[0]) - 30, p[0] + 40), // Säule mit Drehpunkt, Standfuß
    { type: 'line', from: p, to: g, w: 5 }, { type: 'bar', at: p, r: 7 }, plate(peg), // Hebel, Scheibe auf dem Hebel
    { type: 'line', from: [g[0] - 10, g[1]], to: [g[0] + 10, g[1]], w: 4, front: true } // Griff
  ] };
}
function mrowProps(P) {
  const g = P.joints.hand, p = MROW.pivot, h = P.joints.hip, s = P.joints.shoulder;
  const col = p[0] + 60, pad = [s[0] + 34, s[1] + 18];
  return { anchors: { hand: g, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'rect', x: h[0] - 34, y: h[1] + 5, w: 70, h: 10, rx: 3 }, { type: 'line', from: [h[0], h[1] + 15], to: [h[0], 0], w: 5 }, // Sitz
    { type: 'rect', x: pad[0], y: pad[1] - 30, w: 12, h: 66, rx: 4 }, { type: 'line', from: [pad[0] + 12, pad[1] + 4], to: [col, pad[1] + 4], w: 5 }, // Brustpolster mit Halter
    { type: 'line', from: [col, 0], to: [col, p[1]], w: 8 }, { type: 'line', from: [col, p[1]], to: p, w: 6 }, foot(h[0] - 40, col + 40), // Säule, Ausleger
    { type: 'line', from: p, to: g, w: 5 }, { type: 'bar', at: p, r: 7 }, // Hebel ab Drehpunkt
    { type: 'line', from: [g[0], g[1] - 10], to: [g[0], g[1] + 10], w: 4, front: true } // senkrechter Griff (Neutralgriff)
  ] };
}
function invProps(P) {
  const b = INV.bar, post = b[0] - 46;
  return { anchors: { bar: b, hand: P.joints.hand }, scene: [
    { type: 'line', from: [post, 0], to: [post, -340], w: 7 }, foot(post - 40, post + 40), { type: 'line', from: [post, b[1] + 6], to: [b[0], b[1] + 6], w: 4 }, // Rackpfosten mit Ablage
    { type: 'bar', at: b, r: 5 }
  ] };
}

// ---------- Szenen Runde 5 (v2.11) ----------
function chinProps(P) {
  const b = [0, PU.bar];
  return { anchors: { bar: b, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'line', from: [b[0], b[1]], to: [b[0] + 110, b[1]], w: 5 }, { type: 'line', from: [b[0] + 110, b[1] - 40], to: [b[0] + 110, b[1] + 40], w: 7 }, // Ausleger zur Wand
    { type: 'bar', at: b, r: 5 }
  ] };
}
function cgpProps(P) {
  const h = P.joints.hip, k = P.joints.knee, hand = P.joints.hand, s = P.joints.shoulder;
  const pulley = [CGP_PULLEY_X, -410], col = pulley[0] + 80; // v2.15.0: Rolle fest in der Welt (vorher an der Schulter – wanderte bei Rücklage mit)
  return { anchors: { hand, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'rect', x: h[0] - 34, y: h[1] + 6, w: 72, h: 10, rx: 3 }, { type: 'line', from: [h[0], h[1] + 16], to: [h[0], 0], w: 5 }, foot(h[0] - 40, col + 40), // Sitz
    { type: 'bar', at: [k[0] - 18, k[1] - 24], r: 9 }, { type: 'line', from: [k[0] - 18, k[1] - 24], to: [col, k[1] - 24], w: 4 }, // Oberschenkelpolster mit Halter
    { type: 'line', from: [col, 0], to: [col, pulley[1] - 10], w: 8 }, { type: 'line', from: [col, pulley[1] - 10], to: [pulley[0], pulley[1] - 10], w: 6 }, { type: 'bar', at: pulley, r: 8 }, // Turm, Ausleger, Rolle
    { type: 'line', from: pulley, to: hand, w: 1.5, dash: true }, // Seil
    { type: 'line', from: [hand[0] - 4, hand[1] - 12], to: [hand[0] + 4, hand[1] + 8], w: 4, front: true } // Neutralgriff
  ] };
}
function sapProps(P) {
  const hand = P.joints.hand, t = SAP.tower, p = SAP.pulley;
  return { anchors: { hand, uarm: midpoint(P.joints.shoulder, P.joints.elbow) }, scene: [
    { type: 'line', from: [t, 0], to: [t, p[1] - 14], w: 8 }, foot(t - 40, t + 40), { type: 'bar', at: p, r: 8 }, // Turm mit oberer Rolle
    { type: 'line', from: p, to: hand, w: 1.5, dash: true }, // Seil
    { type: 'line', from: [hand[0] - 3, hand[1] - 9], to: [hand[0] + 3, hand[1] + 9], w: 5, front: true } // kurze Stange (Ende)
  ] };
}
function rpdProps(P) {
  const hr = P.joints.handR, hl = P.joints.handL, top = RPD.seat - 250, pel = P.joints.pelvis;
  return { anchors: {}, scene: [
    { type: 'rect', x: -38, y: pel[1] + 6, w: 76, h: 10, rx: 3 }, { type: 'line', from: [0, pel[1] + 16], to: [0, 0], w: 6 }, foot(-70, 70), // Sitz, Stütze
    { type: 'line', from: [-52, top], to: [52, top], w: 6 }, // Querträger über dem Kopf mit den Drehachsen
    { type: 'line', from: [10, top], to: [hr[0], top], w: 4 }, { type: 'line', from: [hr[0], top], to: [hr[0], hr[1] - 10], w: 4 }, // Hebel rechts (waagerecht, dann senkrecht zum Griff)
    { type: 'line', from: [-10, top], to: [hl[0], top], w: 4 }, { type: 'line', from: [hl[0], top], to: [hl[0], hl[1] - 10], w: 4 },
    { type: 'line', from: [hr[0], hr[1] - 12], to: [hr[0], hr[1] + 10], w: 5, front: true }, { type: 'line', from: [hl[0], hl[1] - 12], to: [hl[0], hl[1] + 10], w: 5, front: true } // senkrechte Griffe (Neutralgriff)
  ] };
}

// ---------- Szenen Runde 6 (v2.11) ----------
const uarmMid = (P) => midpoint(P.joints.shoulder, P.joints.elbow);
function ezCurlProps(P) { const g = gripOf(P); return { anchors: { bar: g, uarm: uarmMid(P) }, scene: [plate(g, CURL_PLATE)] }; }
function hammerProps(P) { const g = gripOf(P); return { anchors: { hand: g, uarm: uarmMid(P) }, scene: [db(g, segNrm(P, 'farm'))] }; } // Neutralgriff: Hantelachse quer zum Unterarm in der Bildebene
function inclineCurlProps(P) {
  const g = gripOf(P), h = P.joints.hip;
  const top = along(along(h, segNrm(P, 'trunk'), -24), segDir(P, 'trunk'), -165);
  return { anchors: { hand: g, uarm: uarmMid(P) }, scene: [
    benchLine(P, 24, 170, -6), { type: 'line', from: [h[0] - 20, h[1] + 24], to: [h[0] + 50, h[1] + 24], w: 14 }, // Lehne 45°, Sitz
    { type: 'line', from: [h[0] + 10, h[1] + 30], to: [h[0] + 10, 0], w: 6 }, { type: 'line', from: top, to: [top[0], 0], w: 6, back: true }, foot(h[0] - 20, h[0] + 40), foot(top[0] - 30, top[0] + 30),
    db(g, [1, 0], true)
  ] };
}
function preacherProps(P) {
  const g = gripOf(P), s = P.joints.shoulder, e = P.joints.elbow, h = P.joints.hip, u = segDir(P, 'uarm');
  let n = segNrm(P, 'uarm'); if (n[1] < 0) n = [-n[0], -n[1]]; // Unterseite des Oberarms
  const a = along(along(s, u, 18), n, 20), b = along(along(e, u, 12), n, 20), m = midpoint(a, b);
  return { anchors: { pad: m, hand: g, uarm: uarmMid(P) }, scene: [
    { type: 'line', from: a, to: b, w: 12, front: true }, // Pult direkt unter dem Oberarm
    { type: 'line', from: [m[0], m[1] + 6], to: [m[0], 0], w: 6, back: true }, foot(m[0] - 45, m[0] + 45), // Stütze (hinter den Beinen)
    { type: 'line', from: [h[0] - 26, h[1] + 22], to: [h[0] + 28, h[1] + 22], w: 12 }, { type: 'line', from: [h[0], h[1] + 28], to: [h[0], 0], w: 6, back: true }, // Sitz
    db(g, [1, 0], true)
  ] };
}
function bayesianProps(P) {
  const g = gripOf(P), t = BAY.tower, p = BAY.pulley, d = segNrm(P, 'farm');
  return { anchors: { hand: g, uarm: uarmMid(P) }, scene: [
    { type: 'line', from: [t, 0], to: [t, -300], w: 8 }, foot(t - 40, t + 40), { type: 'bar', at: p, r: 7 }, // Turm mit verstellbarer Rolle auf Hüfthöhe
    { type: 'line', from: p, to: g, w: 1.5, dash: true }, // Seil
    { type: 'line', from: along(g, d, -8), to: along(g, d, 8), w: 5, front: true } // Einhandgriff
  ] };
}
function concentrationProps(P) {
  const g = gripOf(P), h = P.joints.hip;
  return { anchors: { hand: g, uarm: uarmMid(P) }, scene: [
    { type: 'rect', x: h[0] - 70, y: h[1] + 14, w: 110, h: 10, rx: 3 }, { type: 'line', from: [h[0] - 50, h[1] + 24], to: [h[0] - 50, 0], w: 5 }, { type: 'line', from: [h[0] + 22, h[1] + 24], to: [h[0] + 22, 0], w: 5, back: true }, // Flachbank
    db(g, [1, 0], true)
  ] };
}

// ---------- Szenen Runde 7 (v2.11) ----------
function frontRaiseProps(P) {
  const g = gripOf(P), h = P.joints.hip;
  return { anchors: { hand: g, uarm: uarmMid(P) }, scene: [
    { type: 'rect', x: h[0] - 55, y: h[1] + 14, w: 95, h: 10, rx: 3 }, { type: 'line', from: [h[0] - 40, h[1] + 24], to: [h[0] - 40, 0], w: 5 }, { type: 'line', from: [h[0] + 26, h[1] + 24], to: [h[0] + 26, 0], w: 5, back: true }, // Flachbank
    db(g, [1, 0], true)
  ] };
}
function cableLateralProps(P) {
  const hr = P.joints.handR, w = P.joints.wristR, g = [(hr[0] + w[0]) / 2, (hr[1] + w[1]) / 2], t = CLR.tower, p = [t + 8, CLR.pulleyY];
  return { anchors: {}, scene: [
    { type: 'line', from: [t, 0], to: [t, -300], w: 8 }, foot(t - 40, t + 40), { type: 'bar', at: p, r: 7 }, // Turm, Rolle auf Handhöhe
    { type: 'line', from: p, to: g, w: 1.5, dash: true, front: true }, // Seil vor dem Körper zur Gegenseite
    { type: 'rect', x: g[0] - 5, y: g[1] - 8, w: 10, h: 16, rx: 3, front: true } // Einhandgriff
  ] };
}
function uprightRowProps(P) {
  const w = P.joints.wristR, hr = P.joints.handR, y = (w[1] + hr[1]) / 2;
  return { anchors: { bar: [0, y] }, scene: frontBarbell(y) };
}
function machinePressProps(P) {
  const hand = P.joints.hand, h = P.joints.hip, pv = MSP.pivot;
  return { anchors: { hand }, scene: [
    { type: 'rect', x: h[0] - 30, y: h[1] + 2, w: 64, h: 12, rx: 4 }, benchLine(P, 26, 140, -8), // Sitz, Lehne 75°
    { type: 'line', from: [h[0], h[1] + 14], to: [h[0], 0], w: 6 }, foot(h[0] - 50, h[0] + 60),
    { type: 'line', from: [pv[0], pv[1]], to: [pv[0], 0], w: 8, back: true }, foot(pv[0] - 40, pv[0] + 40), { type: 'bar', at: pv, r: 7 }, // Säule mit Drehachse
    { type: 'line', from: pv, to: hand, w: 5, back: true }, // Hebelarm (seitlich neben dem Kopf, daher hinter der Figur)
    { type: 'line', from: [hand[0] - 3, hand[1] - 9], to: [hand[0] + 3, hand[1] + 9], w: 6, front: true } // Griff
  ] };
}

// ---------- Szenen Runde 8 (v2.12) ----------
function overheadCableProps(P) {
  const g = gripOf(P), t = OHX.tower, p = OHX.pulley, d = segNrm(P, 'farm');
  return { anchors: { hand: g, uarm: uarmMid(P) }, scene: [
    { type: 'line', from: [t, 0], to: [t, -330], w: 8 }, foot(t - 40, t + 40), { type: 'bar', at: p, r: 7 }, // Turm hinter der Figur, Rolle auf Hüfthöhe
    { type: 'line', from: p, to: g, w: 1.5, dash: true }, // Seil
    { type: 'line', from: along(g, d, -8), to: along(g, d, 8), w: 5, front: true } // Einhandgriff
  ] };
}
function overheadDbProps(P) {
  const g = gripOf(P), h = P.joints.hip;
  return { anchors: { hand: g, uarm: uarmMid(P) }, scene: [
    { type: 'rect', x: h[0] - 30, y: h[1] + 14, w: 64, h: 10, rx: 3 }, benchLine(P, 24, 105, -14), // Sitz, Lehne
    { type: 'line', from: [h[0], h[1] + 24], to: [h[0], 0], w: 6 }, foot(h[0] - 45, h[0] + 45),
    db([g[0], g[1] + DB.len / 2 - DB.hw / 2 - 23], [0, 1]) // eine Hantel, beidhändig unter dem oberen Kopf gehalten: hängt senkrecht; v2.15.0: der obere Kopf sitzt in den Handflächen und verdeckt die Fingerspitzen (vorher ragte die Hand über den Kopf)
  ] };
}
// ---------- Szenen Runde 10 (v2.13) ----------
// Matte fest unter dem liegenden Körper (Hüfte bei x = 0 bzw. Schulter bei FLOOR.sh); Sit-up zusätzlich ein Fußhalter (Rolle über dem Rist).
function matProps(P) { return { anchors: {}, scene: [{ type: 'rect', x: FLOOR.sh[0] - 70, y: -MAT, w: 400, h: MAT, rx: 3 }] }; }
function situpProps(P) {
  const an = P.joints.ankle, roll = [an[0] + 14, an[1] - 13];
  return { anchors: { roll }, scene: [{ type: 'rect', x: FLOOR.sh[0] - 70, y: -MAT, w: 400, h: MAT, rx: 3 }, { type: 'line', from: [roll[0], roll[1]], to: [roll[0], -MAT], w: 4 }, { type: 'bar', at: roll, r: 8 }] };
}
function skullProps(P) {
  const g = gripOf(P);
  return { anchors: { bar: g, uarm: uarmMid(P) }, scene: [
    { type: 'rect', x: -95, y: -92, w: 225, h: 12, rx: 3 }, { type: 'line', from: [-60, -80], to: [-60, 0], w: 5 }, { type: 'line', from: [100, -80], to: [100, 0], w: 5 }, // Flachbank
    plate(g, CURL_PLATE) // SZ-Stange mit kleinen Scheiben (Konvention)
  ] };
}
function kickbackDbProps(P) {
  const g = gripOf(P), [x0, x1] = ONE_ROW.bench;
  return { anchors: { hand: g, uarm: uarmMid(P) }, scene: [
    { type: 'rect', x: x0, y: -92, w: x1 - x0, h: 12, rx: 3 }, { type: 'line', from: [x0 + 30, -80], to: [x0 + 30, 0], w: 5 }, { type: 'line', from: [x1 - 30, -80], to: [x1 - 30, 0], w: 5 }, // Flachbank
    db(g, [1, 0], true) // Neutralgriff: Hantelachse zeigt aus dem Bild
  ] };
}
function benchDipProps(P) {
  const w = BDIP.W;
  return { anchors: { uarm: uarmMid(P), bench: [w[0] - 50, -92] }, scene: [
    { type: 'rect', x: w[0] - 150, y: -92, w: 156, h: 12, rx: 3 }, { type: 'line', from: [w[0] - 130, -80], to: [w[0] - 130, 0], w: 5 }, { type: 'line', from: [w[0] - 18, -80], to: [w[0] - 18, 0], w: 5, back: true } // Flachbank hinter der Figur
  ] };
}
function dipMachineProps(P) {
  const hand = P.joints.hand, h = P.joints.hip, pv = DIPM.pivot;
  return { anchors: { hand, uarm: uarmMid(P) }, scene: [
    { type: 'rect', x: h[0] - 30, y: h[1] + 2, w: 64, h: 12, rx: 4 }, benchLine(P, 26, 120, -8), // Sitz, Lehne
    { type: 'line', from: [h[0], h[1] + 14], to: [h[0], 0], w: 6 }, foot(h[0] - 50, h[0] + 60),
    { type: 'line', from: [pv[0], pv[1]], to: [pv[0], 0], w: 8, back: true }, foot(pv[0] - 40, pv[0] + 40), { type: 'bar', at: pv, r: 7 }, // Säule mit Drehachse
    { type: 'line', from: pv, to: hand, w: 5, back: true }, // Hebelarm (seitlich neben dem Körper, daher hinter der Figur)
    { type: 'line', from: [hand[0] - 9, hand[1]], to: [hand[0] + 9, hand[1]], w: 6, front: true } // Griff
  ] };
}

// ---------- Szenen Runde 9 (v2.12) ----------
function crossoverProps(high) {
  return (P) => {
    const hr = P.joints.handR, hl = P.joints.handL, t = XOV.tower, y = high ? XOV.high : XOV.low, px = t - 10;
    const grip = (h) => ({ type: 'rect', x: h[0] - 5, y: h[1] - 7, w: 10, h: 14, rx: 3, front: true });
    return { anchors: {}, scene: [
      { type: 'line', from: [t, 0], to: [t, -380], w: 8 }, foot(t - 30, t + 30), { type: 'line', from: [-t, 0], to: [-t, -380], w: 8 }, foot(-t - 30, -t + 30), // zwei Türme
      { type: 'bar', at: [px, y], r: 7 }, { type: 'bar', at: [-px, y], r: 7 }, // Rollen
      { type: 'line', from: [px, y], to: hr, w: 1.5, dash: true }, { type: 'line', from: [-px, y], to: hl, w: 1.5, dash: true }, // Seile
      grip(hr), grip(hl)
    ] };
  };
}
// Kurzhantel-Fliegende im Blick von oben (Figur um −90° gedreht, Kopf links): Bank als Rechteck unter Kopf, Rumpf und Gesäß.
function flyDbProps(P) {
  const J = P.joints, hR = J.handR, hL = J.handL, x0 = J.head[0] - 8, x1 = J.pelvis[0] + 40, y = J.pelvis[1];
  const g = (h, w) => [(h[0] + w[0]) / 2, (h[1] + w[1]) / 2];
  return { anchors: { bench: [x1 - 30, y + 30] }, scene: [
    { type: 'rect', x: x0, y: y - 28, w: x1 - x0, h: 56, rx: 4 }, // Flachbank von oben
    db(g(hR, J.wristR), [1, 0]), db(g(hL, J.wristL), [1, 0]) // Neutralgriff: Hantelachse längs zum Körper
  ] };
}

// Butterfly mit Armpolstern (Frontansicht): dieselbe Maschine wie der Reverse Butterfly (RPD), Unterarme senkrecht an den Polstern.
function pecDeckProps(P) {
  const J = P.joints, top = RPD.seat - 250, pel = J.pelvis;
  const pad = (e, w) => ({ type: 'line', from: [e[0], e[1] + 4], to: [w[0], w[1] - 4], w: 12, front: true }); // Polster am Unterarm
  return { anchors: { pad: [(J.elbowR[0] + J.wristR[0]) / 2, (J.elbowR[1] + J.wristR[1]) / 2] }, scene: [
    { type: 'rect', x: -38, y: pel[1] + 6, w: 76, h: 10, rx: 3 }, { type: 'line', from: [0, pel[1] + 16], to: [0, 0], w: 6 }, foot(-70, 70), // Sitz, Stütze
    { type: 'line', from: [-52, top], to: [52, top], w: 6 }, // Querträger mit den Drehachsen
    { type: 'line', from: [10, top], to: [J.wristR[0], top], w: 4 }, { type: 'line', from: [J.wristR[0], top], to: [J.wristR[0], J.wristR[1] - 6], w: 4 }, // Hebel rechts
    { type: 'line', from: [-10, top], to: [J.wristL[0], top], w: 4 }, { type: 'line', from: [J.wristL[0], top], to: [J.wristL[0], J.wristL[1] - 6], w: 4 },
    pad(J.elbowR, J.wristR), pad(J.elbowL, J.wristL)
  ] };
}

// ---------- Szenen Runde 15 (v2.20) ----------
// Multipresse auf der Schrägbank: Schräglehne und Sitz wie beim Schrägbankdrücken, Führungsschiene senkrecht durch die Stange (SMI.x).
function smithInclineProps(P) {
  const h = P.joints.hip, top = along(along(h, segNrm(P, 'trunk'), -24), segDir(P, 'trunk'), -165), bar = P.joints.hand, x = SMI.x;
  return { anchors: { bar }, scene: [
    benchLine(P, 24, 170, -6), { type: 'line', from: [h[0] - 20, h[1] + 24], to: [h[0] + 50, h[1] + 24], w: 14 }, // Lehne 30°, Sitz
    { type: 'line', from: [h[0] + 10, h[1] + 30], to: [h[0] + 10, 0], w: 6 }, { type: 'line', from: top, to: [top[0], 0], w: 6 }, foot(h[0] - 20, h[0] + 40), foot(top[0] - 30, top[0] + 30),
    { type: 'line', from: [x, 0], to: [x, -460], w: 6, back: true }, foot(x - 70, x + 70), { type: 'line', from: [x - 70, -460], to: [x + 70, -460], w: 6, back: true }, // Führungsschiene, Querträger
    { type: 'rect', x: x - 9, y: bar[1] - 14, w: 18, h: 28, rx: 3, back: true }, // Schlitten
    plate([x, bar[1]])
  ] };
}
// Schräge Brustpresse: Sitz und Lehne wie an der Brustpresse; Hebelarm vom Drehpunkt (IMP.pivot) hinter dem Sitz zum Griff, hinter dem Körper.
function inclinePressProps(P) {
  const h = P.joints.hip, hand = P.joints.hand, pv = IMP.pivot;
  return { anchors: { hand }, scene: [
    { type: 'rect', x: h[0] - 30, y: h[1] + 2, w: 70, h: 12, rx: 4 }, benchLine(P, 26, 150, -8), // Sitz, Lehne
    { type: 'line', from: [h[0] - 10, h[1] + 14], to: [h[0] - 10, 0], w: 6 }, foot(h[0] - 70, h[0] + 30),
    { type: 'line', from: pv, to: [pv[0], 0], w: 8, back: true }, foot(pv[0] - 40, pv[0] + 40), { type: 'bar', at: pv, r: 7, back: true }, // Fuß mit Drehachse
    { type: 'line', from: pv, to: hand, w: 5, back: true }, // Hebelarm hinter dem Körper
    { type: 'line', from: along(hand, segNrm(P, 'farm'), -10), to: along(hand, segNrm(P, 'farm'), 10), w: 5, front: true } // Griff quer zum Unterarm
  ] };
}
// Seitheben an der Maschine (Frontansicht): Sitz, Drehachsen hinter den Schultern, Hebel außen am Arm, Polster am Oberarm (gebeugt) oder Unterarm (gestreckt).
function machineLateralProps(straight) {
  return (P) => {
    const J = P.joints, pel = J.pelvis, sc = [];
    sc.push({ type: 'rect', x: -38, y: pel[1] + 6, w: 76, h: 10, rx: 3 }, { type: 'line', from: [0, pel[1] + 16], to: [0, 0], w: 6 }, foot(-70, 70)); // Sitz, Stütze
    for (const s of ['R', 'L']) {
      const sh = J['shoulder' + s], el = J['elbow' + s], wr = J['wrist' + s], sg = s === 'R' ? 1 : -1;
      const u = [el[0] - sh[0], el[1] - sh[1]], l = Math.hypot(u[0], u[1]), d = [u[0] / l, u[1] / l];
      let n = [d[1], -d[0]]; if (n[1] > 0 || (Math.abs(n[1]) < 1e-6 && n[0] * sg < 0)) n = [-n[0], -n[1]]; // Außenseite des Arms (oben/außen)
      const padAt = straight ? along(along(el, d, 30), n, 12) : along(along(sh, d, l - 14), n, 12);
      sc.push({ type: 'bar', at: sh, r: 6, back: true }, { type: 'line', from: along(sh, n, 12), to: padAt, w: 4, back: true }); // Drehachse, Hebel außen am Arm
      sc.push({ type: 'line', from: along(padAt, d, -14), to: along(padAt, d, 14), w: 11, front: true }); // Polster
      if (!straight) sc.push({ type: 'rect', x: wr[0] - 5, y: wr[1] - 2, w: 10, h: 14, rx: 3, front: true }); // Griff vor dem Körper
    }
    return { anchors: { pad: J.elbowR }, scene: sc };
  };
}
// Reverse Fly am Kabel: Türme links und rechts, Rollen auf Schulterhöhe; das Kabel des rechten Arms kommt vom linken Turm (über Kreuz vor dem Körper).
function cableReverseFlyProps(P) {
  const J = P.joints, y = (J.shoulderR[1] + J.shoulderL[1]) / 2, t = XOV.tower, g = (h, w) => [(h[0] + w[0]) / 2, (h[1] + w[1]) / 2];
  const gR = g(J.handR, J.wristR), gL = g(J.handL, J.wristL), pR = [t - 10, y], pL = [-t + 10, y];
  return { anchors: { cable: midpoint(gR, pL) }, scene: behindInBack(P, [
    { type: 'line', from: [t, 0], to: [t, -360], w: 8 }, foot(t - 40, t + 40), { type: 'line', from: [-t, 0], to: [-t, -360], w: 8 }, foot(-t - 40, -t + 40), // Türme
    { type: 'bar', at: pR, r: 7 }, { type: 'bar', at: pL, r: 7 }, // Rollen auf Schulterhöhe
    { type: 'line', from: pL, to: gR, w: 1.5, dash: true, front: true }, { type: 'line', from: pR, to: gL, w: 1.5, dash: true, front: true }, // Kabel über Kreuz
    { type: 'rect', x: gR[0] - 5, y: gR[1] - 8, w: 10, h: 16, rx: 3, front: true }, { type: 'rect', x: gL[0] - 5, y: gL[1] - 8, w: 10, h: 16, rx: 3, front: true } // Einhandgriffe
  ]) };
}
// Y-Raise: Schrägbank mit Brustauflage vor dem Rumpf (parallel zum Rumpf), Stütze zum Boden; Kurzhantel in der Hand, Achse aus dem Bild (Daumen oben).
function yRaiseProps(P) {
  const h = P.joints.hip, n = segNrm(P, 'trunk'), d = segDir(P, 'trunk'); // d: Schulter → Hüfte
  const lo = along(along(h, n, 30), d, 12), hi = along(along(h, n, 30), d, -96); // Polster vor Brust und Bauch, oberes Ende unter der Achsel
  const g = gripOf(P);
  return { anchors: { pad: midpoint(lo, hi), hand: g }, scene: [
    { type: 'line', from: lo, to: hi, w: 14 }, // Polster
    { type: 'line', from: along(lo, n, 8), to: [along(lo, n, 8)[0], 0], w: 6 }, foot(along(lo, n, 8)[0] - 40, along(lo, n, 8)[0] + 40), // Stütze
    db(g, [1, 0], true)
  ] };
}
// Face Pull: Turm vor der Figur, Rolle auf Kopfhöhe, Seil zu den Händen (Seilgriff mit Endstück).
function facePullProps(P) {
  const g = gripOf(P), t = FP.tower, p = FP.pulley;
  return { anchors: { hand: g, rope: midpoint(g, p) }, scene: [
    { type: 'line', from: [t, 0], to: [t, -420], w: 8 }, foot(t - 40, t + 40), { type: 'bar', at: p, r: 7 }, // Turm, Rolle
    { type: 'line', from: p, to: g, w: 3, front: true }, { type: 'bar', at: g, r: 4 } // Seil, Endstück in der Hand
  ] };
}

// ---------- Szenen Runde 16 (v2.21) ----------
function seatedCurlProps(P) {
  const h = P.joints.hip, kn = P.joints.knee, an = P.joints.ankle, td = segDir(P, 'thigh'), tn = segNrm(P, 'thigh'), sd = segDir(P, 'shank'), sn = segNrm(P, 'shank');
  const thighPad = along(along(kn, td, -18), tn, 16); // oben auf dem Oberschenkel, knapp vor dem Knie
  const roll = along(along(an, sd, -12), sn, -18); // hinten am Unterschenkel über der Ferse
  return { anchors: { pad: roll, thighPad }, scene: [
    { type: 'line', from: [h[0] - 26, h[1] + 20], to: [kn[0] - 20, h[1] + 20], w: 14 }, // Sitz
    { type: 'line', from: [h[0] - 30, h[1] + 16], to: [h[0] - 44, h[1] - 120], w: 14 }, // Lehne (leicht zurück)
    { type: 'line', from: [h[0] - 10, h[1] + 27], to: [h[0] - 10, 0], w: 6 }, foot(h[0] - 60, kn[0] + 40),
    { type: 'line', from: along(thighPad, td, -14), to: along(thighPad, td, 14), w: 12, front: true }, // Oberschenkelpolster
    { type: 'line', from: [kn[0], kn[1]], to: [kn[0] + 4, 0], w: 6, back: true }, { type: 'bar', at: kn, r: 6, back: true }, // Säule mit Drehachse auf Kniehöhe
    { type: 'line', from: kn, to: roll, w: 7, back: true }, { type: 'bar', at: roll, r: 11 }, // Hebel hinter dem Bein, Rolle
    { type: 'line', from: [SLC2.hand[0] - 8, SLC2.hand[1] + 4], to: [SLC2.hand[0] + 8, SLC2.hand[1] + 4], w: 4 } // Griff
  ] };
}
function nordicProps(P) {
  const an = P.joints.ankle, kn = P.joints.knee, sd = segDir(P, 'shank'), sn = segNrm(P, 'shank');
  const roll = along(along(an, sd, -10), sn, 15); // Rolle oben auf dem Unterschenkel über dem Knöchel
  return { anchors: { roll, pad: [kn[0] - 30, -14] }, scene: [
    { type: 'rect', x: kn[0] - 112, y: -14, w: 130, h: 14, rx: 4 }, // Kniepolster
    { type: 'line', from: roll, to: [roll[0] - 6, 0], w: 6, back: true }, { type: 'bar', at: roll, r: 8 }, // Halter, Rolle
    { type: 'rect', x: kn[0] + 20, y: -4, w: 190, h: 4, rx: 2 } // Matte zum Abfangen
  ] };
}
function rheProps(P) {
  const h = P.joints.hip, s = P.joints.shoulder, an = P.joints.ankle, sd = segDir(P, 'shank'), sn = segNrm(P, 'shank');
  const strap = along(along(an, sd, -12), sn, -11); // Schlaufe hinten über dem Knöchel
  return { anchors: { strap, pad: [s[0] - 30, RHE.hip[1] + 24] }, scene: [
    { type: 'line', from: [h[0] + 4, RHE.hip[1] + 36], to: [s[0] + 34, RHE.hip[1] + 36], w: 14 }, // Polster unter Rumpf und Becken
    { type: 'line', from: [s[0] + 10, RHE.hip[1] + 43], to: [s[0] + 10, 0], w: 7 }, { type: 'line', from: [h[0] + 30, RHE.hip[1] + 43], to: [h[0] + 30, 0], w: 7 }, foot(h[0] - 10, s[0] + 60),
    { type: 'line', from: [RHE.hand[0], RHE.hand[1] - 4], to: [RHE.hand[0], 0], w: 5 }, { type: 'line', from: [RHE.hand[0] - 8, RHE.hand[1]], to: [RHE.hand[0] + 8, RHE.hand[1]], w: 4 }, // Griffstange
    { type: 'bar', at: h, r: 6, back: true }, { type: 'line', from: h, to: strap, w: 6, back: true }, // Pendel mit Drehachse am Hüftgelenk
    { type: 'rect', x: strap[0] - 7, y: strap[1] - 6, w: 14, h: 12, rx: 4, front: true }
  ] };
}

function wristCurlProps(P) {
  const h = P.joints.hip, g = gripOf(P);
  return { anchors: { hand: g }, scene: [
    { type: 'line', from: [h[0] - 40, h[1] + 22], to: [h[0] + 40, h[1] + 22], w: 12 }, { type: 'line', from: [h[0] - 30, h[1] + 28], to: [h[0] - 30, 0], w: 5 }, { type: 'line', from: [h[0] + 30, h[1] + 28], to: [h[0] + 30, 0], w: 5, back: true }, // Flachbank
    { ...db(g, [1, 0], true), underHand: true } // Hantelachse quer zum Betrachter (Handfläche oben/unten); Faust darüber gezeichnet, damit die Handgelenkbewegung sichtbar bleibt (Konvention)
  ] };
}
function farmerProps(P) { return { anchors: { hand: P.joints.hand }, scene: [db(gripOf(P), [1, 0])] }; } // Neutralgriff, Hantelachse längs
function beltSquatProps(P) {
  const h = P.joints.hip, an = P.joints.ankle, belt = trunkPoint(P, 20, -100), chainLow = [an[0] + 2, -BSQ.PL + 6];
  return { anchors: { belt }, scene: [
    { type: 'rect', x: an[0] - 28, y: -BSQ.PL, w: 76, h: BSQ.PL, rx: 3 }, // Podest unter den Füßen
    { type: 'line', from: [chainLow[0], -6], to: [chainLow[0] + 150, -6], w: 7, back: true }, { type: 'bar', at: [chainLow[0] + 150, -6], r: 6, back: true }, // Hebel mit Drehpunkt vorn
    { type: 'line', from: belt, to: [belt[0], -BSQ.PL], w: 2, dash: true, front: true }, // Kette vom Gurt senkrecht nach unten
    { type: 'rect', x: belt[0] - 6, y: belt[1] - 5, w: 12, h: 10, rx: 3, front: true }, // Gurtschnalle
    { type: 'line', from: [BSQ.hand[0], BSQ.hand[1] + 6], to: [BSQ.hand[0] + 10, 0], w: 5 }, { type: 'line', from: [BSQ.hand[0] - 10, BSQ.hand[1]], to: [BSQ.hand[0] + 10, BSQ.hand[1]], w: 4 } // Griffstange
  ] };
}
function sissyProps(P) {
  return { anchors: { post: [SSQ.post, -150] }, scene: [
    { type: 'line', from: [SSQ.post, 0], to: [SSQ.post, -300], w: 7, back: true }, foot(SSQ.post - 30, SSQ.post + 30) // Pfosten zum Festhalten (seitlich, hinter der Figur)
  ] };
}

export function animationFor(ref) { return ANIMATIONS.find((a) => a.ref === ref) || null; }

// ---------- Szenen Runde 11 (v2.16) ----------
function plankProps(P) { return { anchors: {}, scene: [{ type: 'rect', x: PLANK.mat[0], y: -MAT, w: PLANK.mat[1] - PLANK.mat[0], h: MAT, rx: 3 }] }; }
function feProps(P) { return { anchors: {}, scene: [{ type: 'rect', x: FEPU.toeX - 34, y: -FEPU.BOX, w: 62, h: FEPU.BOX, rx: 4 }] }; }
function sidePlankProps(P) { return { anchors: {}, scene: [{ type: 'rect', x: SIDEP.E[0] - 60, y: -MAT, w: SIDEP.AW[0] - SIDEP.E[0] + 110, h: MAT, rx: 3, noBounds: true }] }; }
function copenProps(P) {
  const [kx] = COPEN.KR, [ax] = COPEN.AR, y = -COPEN.HB;
  return { anchors: {}, scene: [
    { type: 'rect', x: -230, y: -MAT, w: 300, h: MAT, rx: 3, noBounds: true }, // Matte unter Unterarm und Becken
    { type: 'rect', x: kx - 30, y, w: ax - kx + 66, h: 10, rx: 3 }, { type: 'line', from: [kx - 12, y + 10], to: [kx - 12, 0], w: 5 }, { type: 'line', from: [ax + 22, y + 10], to: [ax + 22, 0], w: 5 } // Bank
  ] };
}
function lsitProps(P) {
  const [x] = LSIT.HAND, y = -LSIT.HP;
  return { anchors: {}, scene: [{ type: 'line', from: [x - 24, y], to: [x + 24, y], w: 6, front: true }, { type: 'line', from: [x - 20, y], to: [x - 26, 0], w: 5 }, { type: 'line', from: [x + 20, y], to: [x + 26, 0], w: 5 }] };
}

// ---------- Szenen Runde 12 (v2.17) ----------
function hlrProps(P) {
  const b = [0, HLR.BAR];
  return { anchors: { bar: b, uarm: uarmMid(P) }, scene: [
    { type: 'line', from: [b[0], b[1]], to: [b[0] - 120, b[1]], w: 5 }, { type: 'line', from: [b[0] - 120, b[1] - 30], to: [b[0] - 120, 0], w: 7 }, foot(-170, -70), // Ausleger, Säule hinter der Figur
    { type: 'bar', at: b, r: 5 }
  ] };
}
function captProps(P) {
  const E = CAPT.E, px = CAPT.padX, py = E[1] + 9, post = px - 22;
  return { anchors: { pad: [E[0] + 24, py] }, scene: [
    { type: 'line', from: [post, E[1] - 110], to: [post, 0], w: 8 }, foot(post - 40, E[0] + 90), // Rahmen hinter dem Rücken
    { type: 'rect', x: px - 12, y: E[1] - 90, w: 12, h: 115, rx: 4 }, // Rückenpolster (endet über dem Gesäß)
    { type: 'line', from: [post, py + 6], to: [E[0] + 66, py + 6], w: 5 }, // Armstütze
    { type: 'rect', x: E[0] - 12, y: py - 4, w: 74, h: 9, rx: 4 }, // Unterarmpolster
    { type: 'line', from: [E[0] + 66, py + 6], to: [E[0] + 66, py - 14], w: 5, front: true } // Griff
  ] };
}
function ccrProps(P) {
  const p = CCR.pulley, col = p[0] + 34, hand = P.joints.hand;
  return { anchors: { hand }, scene: [
    { type: 'line', from: [col, 0], to: [col, p[1] - 12], w: 8 }, { type: 'line', from: [col, p[1] - 12], to: [p[0], p[1] - 12], w: 6 }, foot(col - 40, col + 40), // Turm, Ausleger
    { type: 'bar', at: p, r: 8 }, { type: 'line', from: p, to: hand, w: 1.5, dash: true }, // obere Rolle, Seil
    { type: 'line', from: [hand[0] - 2, hand[1] - 10], to: [hand[0] + 2, hand[1] + 8], w: 4, front: true } // Seilende in der Hand
  ] };
}
function mcrProps(P) {
  const h = MCR.hip, an = P.joints.ankle, pv = MCR.pivot, pad = trunkPoint(P, 36, -34);
  const up = [Math.sin((P.angles.upper ?? P.angles.trunk) * Math.PI / 180), -Math.cos((P.angles.upper ?? P.angles.trunk) * Math.PI / 180)];
  return { anchors: { pad }, scene: [
    { type: 'rect', x: h[0] - 34, y: h[1] + 6, w: 72, h: 10, rx: 3 }, { type: 'line', from: [h[0], h[1] + 16], to: [h[0], 0], w: 6 }, foot(h[0] - 50, an[0] + 40), // Sitz
    { type: 'line', from: [h[0] + 8, -40], to: [an[0] - 4, -40], w: 4 }, { type: 'bar', at: [an[0] + 13, an[1] - 4], r: 8 }, { type: 'line', from: [an[0] - 4, -40], to: [an[0] + 13, an[1] - 4], w: 4 }, // Fußrolle
    { type: 'line', from: [pv[0] - 26, pv[1] - 30], to: [pv[0] - 26, 0], w: 8, back: true }, { type: 'line', from: [pv[0] - 26, pv[1]], to: pv, w: 6, back: true }, { type: 'bar', at: pv, r: 7, back: true }, // Säule mit Drehachse (seitlich neben dem Rumpf, daher hinter der Figur)
    { type: 'line', from: pv, to: pad, w: 5, back: true }, // Hebelarm seitlich neben dem Rumpf
    { type: 'line', from: along(pad, up, -24), to: along(pad, up, 22), w: 12 } // Brustpolster
  ] };
}
const gripFront = (P) => { const J = P.joints; return [(J.handR[0] + J.wristR[0] + J.handL[0] + J.wristL[0]) / 4, (J.handR[1] + J.wristR[1] + J.handL[1] + J.wristL[1]) / 4]; }; // Mitte beider Hände
function wchProps(P) {
  const g = gripFront(P), t = WCH.tower, p = [t - 10, WCH.pulleyY];
  return { anchors: {}, scene: [
    { type: 'line', from: [t, 0], to: [t, WCH.pulleyY - 20], w: 8 }, foot(t - 40, t + 40), { type: 'bar', at: p, r: 7 }, // Turm, obere Rolle
    { type: 'line', from: p, to: g, w: 1.5, dash: true, front: true }, // Seil
    { type: 'rect', x: g[0] - 6, y: g[1] - 8, w: 12, h: 16, rx: 3, front: true } // Griff (beide Hände)
  ] };
}
function palProps(P) {
  const g = gripFront(P), t = PAL.tower, p = [t - 10, PAL.pulleyY];
  return { anchors: {}, scene: [
    { type: 'line', from: [t, 0], to: [t, -380], w: 8 }, foot(t - 40, t + 40), { type: 'bar', at: p, r: 7 }, // Turm, Rolle auf Höhe der gestreckten Hände
    { type: 'line', from: p, to: g, w: 1.5, dash: true, front: true }, // Seil von der Seite
    { type: 'rect', x: g[0] - 6, y: g[1] - 8, w: 12, h: 16, rx: 3, front: true } // Griff (beide Hände)
  ] };
}

// ---------- Szenen Runde 13 (v2.18) ----------
function rollProps(P) {
  const w = P.joints.wrist, sh = P.joints.shoulder, d = [w[0] - sh[0], w[1] - sh[1]], l = Math.hypot(d[0], d[1]) || 1, ax = [w[0] + d[0] / l * 20, w[1] + d[1] / l * 20]; // Achse auf der Linie Schulter–Handgelenk
  return { anchors: { wheel: ax }, scene: [
    { type: 'bar', at: ax, r: 18, back: true }, { type: 'bar', at: ax, r: 5 }, // Rad (von der Seite, hinter der Hand), Nabe
    { type: 'rect', x: -150, y: -MAT, w: 420, h: MAT, rx: 3, noBounds: true } // Matte unter den Knien
  ] };
}
function hfxProps(P) {
  const t = HFX.tower, cuff = P.joints.ankle;
  return { anchors: { cuff }, scene: [
    { type: 'line', from: [t, 0], to: [t, -420], w: 8 }, foot(t - 50, t + 40), { type: 'bar', at: [t + 8, HFX.pulley], r: 7 }, // Turm hinter der Figur, untere Rolle
    { type: 'line', from: [t + 8, HFX.pulley], to: cuff, w: 1.5, dash: true, front: true }, // Seil zur Manschette
    { type: 'rect', x: cuff[0] - 7, y: cuff[1] - 6, w: 14, h: 12, rx: 4, front: true } // Manschette
  ] };
}
function sbdProps(P) { return { anchors: {}, scene: [db(P.joints.handR, [1, 0], true)] }; } // Kurzhantel im Neutralgriff, Achse zeigt aus dem Bild
function rtwProps(P) { return { anchors: {}, scene: [{ type: 'rect', x: -120, y: -MAT, w: 240, h: MAT, rx: 3 }] }; } // Matte

// ---------- Szenen Runde 14 (v2.19) ----------
function scrProps(P) {
  const h = SCR.hip, t = SCR.toe, K = P.joints.knee, d = segDir(P, 'thigh'), n = segNrm(P, 'thigh'), pad = along(along(K, d, -16), n, 24), col = t[0] + 50;
  return { anchors: { pad }, scene: [
    { type: 'rect', x: t[0] - 24, y: -SCR.BLK, w: 36, h: SCR.BLK, rx: 2 }, // Block unter dem Vorfuß
    { type: 'rect', x: h[0] - 42, y: h[1] + 15, w: 80, h: 10, rx: 3 }, { type: 'line', from: [h[0] - 4, h[1] + 25], to: [h[0] - 4, 0], w: 6 }, foot(h[0] - 50, col + 30), // Sitz, Stütze, Standfuß
    { type: 'line', from: [col, 0], to: [col, pad[1] - 4], w: 7 }, { type: 'line', from: [col, pad[1] - 4], to: pad, w: 5 }, // Säule vor den Füßen, Hebelarm zum Polster
    { type: 'rect', x: pad[0] - 18, y: pad[1] - 6, w: 36, h: 12, rx: 5, front: true } // Polster auf den Oberschenkeln
  ] };
}
function lpcProps(P) {
  const t = P.joints.toe, rail = [Math.SQRT1_2, -Math.SQRT1_2], pd = [-Math.SQRT1_2, -Math.SQRT1_2]; // Schienen 45° nach vorn-oben, Platte senkrecht dazu
  const pc = along(along(t, pd, 30), rail, 5); // Ballen an der unteren Plattenkante
  return { anchors: { plate: along(pc, rail, 10) }, scene: [
    { type: 'line', from: along(pc, rail, -150), to: along(pc, rail, 90), w: 5 }, // Schiene
    { type: 'line', from: [pc[0] + 60, 0], to: along(pc, rail, 60), w: 5 }, // Stütze
    benchLine(P, 30, 150, 4), { type: 'line', from: along(along(P.joints.hip, segDir(P, 'trunk'), 16), segNrm(P, 'trunk'), -30), to: along(along(P.joints.hip, segDir(P, 'trunk'), 16), segNrm(P, 'trunk'), 44), w: 14 }, // Lehne, Sitz
    { type: 'line', from: [P.joints.hip[0] + 20, P.joints.hip[1] + 20], to: [P.joints.hip[0] + 20, 0], w: 5 }, foot(P.joints.hip[0] - 30, pc[0] + 80), // Standfuß
    { type: 'line', from: along(pc, pd, -34), to: along(pc, pd, 46), w: 8, front: true } // Fußplatte
  ] };
}
function slcProps(P) { return { anchors: {}, scene: [{ type: 'rect', x: 16, y: -STEP, w: 22, h: STEP, rx: 2, step: true }, { type: 'rect', x: SLC.wall, y: -430, w: 12, h: 430, rx: 1, noBounds: true }] }; } // Stufe, Wand
function hipmProps(inner) { return (P) => {
  const J = P.joints, py = J.pelvis[1], sc = [
    { type: 'rect', x: -50, y: py - 118, w: 100, h: 112, rx: 8 }, // Rückenpolster
    { type: 'rect', x: -62, y: py + 2, w: 124, h: 12, rx: 4 }, { type: 'line', from: [0, py + 14], to: [0, 0], w: 8 }, foot(-70, 70) // Sitz, Säule
  ];
  for (const [s, sg] of [['R', 1], ['L', -1]]) {
    const k = J['knee' + s], a = J['ankle' + s], px = k[0] + sg * (inner ? -19 : 19);
    sc.push({ type: 'line', from: [px, k[1] + 10], to: [a[0] + sg * (inner ? -6 : 6), a[1] + 18], w: 5 }); // Hebel vom Polster zur Fußstütze
    sc.push({ type: 'line', from: [a[0] - 16, a[1] + 18], to: [a[0] + 16, a[1] + 18], w: 5 }); // Fußstütze
    sc.push({ type: 'rect', x: px - 6, y: k[1] - 26, w: 12, h: 44, rx: 5, front: true }); // Polster an der Knie-Außenseite (Abduktion) bzw. -Innenseite (Adduktion)
  }
  return { anchors: {}, scene: sc };
}; }
function chipProps(side) { return (P) => {
  const J = P.joints, sg = side === 'R' ? 1 : -1, t = sg * 120, pu = [t - sg * 8, -20], cuff = J.ankleR, hand = J['wrist' + side];
  return { anchors: { cuff }, scene: [
    { type: 'line', from: [t, 0], to: [t, -420], w: 8 }, foot(t - 40, t + 40), { type: 'bar', at: pu, r: 7 }, // Turm, untere Rolle
    { type: 'line', from: [t, hand[1]], to: [hand[0] + sg * 4, hand[1]], w: 4 }, // Haltegriff am Turm
    { type: 'line', from: pu, to: cuff, w: 1.5, dash: true, front: true }, // Seil zur Manschette (bei der Abduktion vor dem Standbein vorbei)
    { type: 'rect', x: cuff[0] - 9, y: cuff[1] - 6, w: 18, h: 12, rx: 4, front: true } // Manschette am rechten Knöchel
  ] };
}; }
function sideMatProps(P) { return { anchors: {}, scene: [{ type: 'rect', x: -300, y: -MAT, w: 540, h: MAT, rx: 3, noBounds: true }] }; }
function clamProps(P) {
  const J = P.joints, at = (s) => [J['hip' + s][0] + (J['knee' + s][0] - J['hip' + s][0]) * 0.8, J['hip' + s][1] + (J['knee' + s][1] - J['hip' + s][1]) * 0.8];
  return { anchors: { band: at('R') }, scene: [{ type: 'rect', x: -300, y: -MAT, w: 540, h: MAT, rx: 3, noBounds: true }, { type: 'line', from: at('R'), to: at('L'), w: 4, front: true }] }; // Matte, Mini-Band über den Knien
}

export function framesOf(anim, variant) {
  const fr = Array.isArray(anim.frames) ? anim.frames : anim.frames[variant || anim.variants[0].key];
  if (anim.view === 'back') return fr.map((f) => ({ ...f, pose: { view: 'front', back: true, ...f.pose } })); // v2.20.0: Rückansicht = Frontfigur, von hinten gezeichnet
  return anim.view === 'front' ? fr.map((f) => ({ ...f, pose: { view: 'front', ...f.pose } })) : fr;
}
export { LEN };
