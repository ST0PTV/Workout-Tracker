// Weibliche Übungsfigur (v2.5.0): Formen für Seiten- und Frontansicht, abgeleitet aus der männlichen Figur.
// Grundlage ANSUR II Frauen (claude.ai-Projekt body-ref.json; Drive: Research - Animations): Brust relativ tiefer, Brustpunkt
// tiefer (0,719 H), Taille schmaler, Gesäß/Taille 1,09 statt 1,03, Hals −17 %, Arme −15 %, Oberschenkel relativ dicker,
// Schulter/Hüfte 1,04 statt 1,21. Gewählt: Variante C „deutlicher“ (2026-10-16) – Taille, Gesäß, Lordose und Arme sind
// bewusst etwa eine Standardabweichung überzeichnet, damit die Figur klein lesbar bleibt (Zeichenkonvention, kein Messwert).
// Lordose/Beckenkippung: bei Frauen größer (Dionne 2025, Meta-Analyse), Gradzahl nicht angegeben → Konvention.
// Gelenke, Längen und Körpergröße bleiben wie bei der männlichen Figur, damit alle Animationen und Szenen gültig bleiben.
const scaleArm = (pts, axisA, axisB, k) => {
  const d = [axisB[0] - axisA[0], axisB[1] - axisA[1]], L = Math.hypot(d[0], d[1]), u = [d[0] / L, d[1] / L], n = [u[1], -u[0]];
  return pts.map((p) => {
    const v = [p[0] - axisA[0], p[1] - axisA[1]], a = v[0] * u[0] + v[1] * u[1], b = (v[0] * n[0] + v[1] * n[1]) * k;
    return [Math.round((axisA[0] + a * u[0] + b * n[0]) * 10) / 10, Math.round((axisA[1] + a * u[1] + b * n[1]) * 10) / 10];
  });
};
const thighK = (p) => { const t = Math.max(0, Math.min(1, (-p[1] - 100) / 70)); return [Math.round(p[0] * (1 + 0.10 * t) * 10) / 10, p[1]]; };

export function femaleSide(SHAPES, { bun = false } = {}) {
  const S = SHAPES.map((s) => ({ ...s, pts: s.pts.map((p) => [...p]) }));
  const set = (seg, id, pts, part) => { const s = S.find((x) => x.seg === seg && x.id === id && (x.part || null) === (part || null)); s.pts = pts; };
  set('trunk', 'body', [[9, -312], [11, -295], [18, -287], [26, -277], [33, -266], [35, -258], [32.5, -249], [25, -243], [21, -232], [22, -216], [23, -200], [20, -186], [14, -176], [8, -170], [-6, -168], [-20, -164], [-33, -168], [-39, -179], [-39, -192], [-31, -207], [-18, -221], [-16, -236], [-20.5, -252], [-23.5, -266], [-21, -280], [-15, -294], [-9.5, -306], [-7.5, -314]]);
  set('trunk', 'chest', [[15, -292], [21, -285], [25, -274], [24, -264], [15, -263], [11, -277]]);
  set('trunk', 'abs', [[14, -176], [20, -186], [23, -200], [22, -214], [21, -230], [22, -242], [14, -242], [13, -225], [13, -200], [10, -182]]);
  set('trunk', 'obliques', [[8, -185], [14, -192], [15.5, -215], [15, -240], [6, -240], [2, -215]]);
  set('trunk', 'glutes', [[-12, -170], [-26, -165], [-37.5, -178], [-38, -192], [-30, -206], [-14, -210], [-8, -195], [-8, -178]]);
  set('trunk', 'lower-back', [[-12, -214], [-17.5, -221], [-16, -235], [-20, -250], [-14, -250], [-11, -232]]);
  set('trunk', 'lats', [[-6, -224], [-16.5, -228], [-20.5, -252], [-22.5, -268], [-14, -275], [-6, -262], [-4, -240]]);
  for (const s of S) {
    if (s.seg === 'thigh') s.pts = s.pts.map(thighK);
    if (s.seg === 'uarm') s.pts = scaleArm(s.pts, [2, -287], [2, -219], 0.82);
    if (s.seg === 'farm') s.pts = scaleArm(s.pts, [2, -219], [2, -165], 0.82);
  }
  if (bun) {
    const c = [-17, -346], r = 9, pts = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * Math.PI; pts.push([Math.round((c[0] + r * Math.cos(a)) * 10) / 10, Math.round((c[1] + r * 0.85 * Math.sin(a)) * 10) / 10]); }
    S.push({ seg: 'trunk', id: 'body', part: 'hair', pts });
  }
  return S;
}

export function femaleFront(SHAPES_F) {
  const S = SHAPES_F.map((s) => ({ ...s, pts: s.pts.map((p) => [...p]) }));
  const set = (seg, id, pts) => { const s = S.find((x) => x.seg === seg && x.id === id && !x.part); s.pts = pts; };
  set('trunk', 'body', [[7, -314], [8, -300], [21, -295], [33, -291], [35.5, -273], [33, -253], [27.5, -236], [24.5, -220], [29, -203], [37, -189], [37, -173], [23, -167], [6, -166], [0, -165]]);
  set('trunk', 'chest', [[1, -288], [1, -268], [9, -265], [22, -267], [32, -273], [35, -283], [22, -290], [8, -290]]);
  set('trunk', 'lats', [[32, -268], [37, -262], [35, -244], [29.5, -232], [27, -246], [28, -260]]);
  set('trunk', 'obliques', [[13, -246], [18, -240], [19, -217], [20, -197], [16, -190], [12, -215], [12, -240]]);
  set('thigh', 'body', [[4, -181], [33, -183], [36, -160], [30, -130], [24, -105], [20, -92], [8, -92], [5, -110], [4, -140], [3, -165]]);
  set('thigh', 'quads', [[10, -176], [28, -176], [31, -150], [26, -120], [22, -100], [12, -100], [9, -125], [8, -150]]);
  // Brust als Weichteil (Klasse an-soft, kein Muskel), über Bauch und unterem Brustmuskel gezeichnet
  S.splice(S.findIndex((x) => x.id === 'abs') + 1, 0, { seg: 'trunk', id: 'bust', both: true, pts: [[3, -254], [6, -265], [15, -270], [23.5, -267], [26.5, -257], [23.5, -246], [15, -242], [7, -245]] });
  const sh = [38, -287], el = [43, -219], wr = [46, -165];
  for (const s of S) {
    if (s.seg === 'uarm') s.pts = scaleArm(s.pts, sh, el, 0.82);
    if (s.seg === 'farm') s.pts = scaleArm(s.pts, el, wr, 0.82);
  }
  return S;
}

// Ankerpunkte, die bei der weiblichen Kontur auf der Haut liegen sollen (Rest wie männlich).
export const ANCHORS_FEMALE = {
  glute: { seg: 'trunk', p: [-37, -186] }, lowBack: { seg: 'trunk', p: [-17, -232] }, chest: { seg: 'trunk', p: [33, -264] },
  belly: { seg: 'trunk', p: [22, -214] }, neck: { seg: 'trunk', p: [-8, -316] }
};
export const ANCHORS_F_FEMALE = { hip: { seg: 'trunk', p: [36, -186] }, shoulder: { seg: 'uarm', p: [46, -294] } };
