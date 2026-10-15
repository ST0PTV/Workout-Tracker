// Körperfigur (v1.6) für Muskelkarte (Fortschritt → Muskeln) und Mini-Piktogramm pro Übung.
// Selbst gezeichnet nach allgemeinem Anatomiewissen: Muskelformen orientieren sich an der Anatomie
// (z. B. Brustmuskel als Fächer, drei Quadrizeps-Anteile), sind aber keine medizinische Abbildung.
// Zwei Darstellungen (Entscheidung v1.6): Karte „Anatomie“ zeigt alle Muskeln als Flächen,
// Piktogramm „Silhouette“ zeigt nur die beanspruchten Muskeln auf einem glatten Körper.
// Männliche und weibliche Figur unterscheiden sich in der Silhouette (Einstellung „Figur“); die Muskel-Logik ist gleich.
const NS = 'http://www.w3.org/2000/svg';
export const VIEWBOX = '0 0 200 440';
const W = 200;
const H = 440;

// Muskeln je Ansicht. abductors (Gluteus medius/minimus + TFL) liegen seitlich und werden hinten gezeigt.
export const FRONT = ['chest', 'front-delts', 'side-delts', 'biceps', 'forearms', 'abs', 'obliques', 'hip-flexors', 'quads', 'adductors'];
export const BACK = ['upper-back', 'rear-delts', 'lats', 'lower-back', 'triceps', 'forearms', 'glutes', 'abductors', 'hamstrings', 'calves'];

// Ansichten für das Mini-Piktogramm (v2.3.0): jede Seite, auf der ein primärer Muskel liegt
// (Unterarme zählen nicht, sie liegen auf beiden Seiten). Liegen primäre Muskeln vorn und hinten
// (z. B. Dips: Brust + Trizeps), zeigt das Piktogramm beide Seiten; ohne Treffer vorne.
export function pickViews(exercise) {
  const p = exercise?.muscles?.primary || [];
  const f = p.some((m) => FRONT.includes(m) && m !== 'forearms');
  const b = p.some((m) => BACK.includes(m) && m !== 'forearms');
  if (f && b) return ['front', 'back'];
  return [b ? 'back' : 'front'];
}

// Einzelne Ansicht (erste von pickViews); bleibt für Aufrufer, die nur eine Seite brauchen.
export function pickView(exercise) {
  return pickViews(exercise)[0];
}

// ---------- Formdaten: linke Körperhälfte (x < 100), rechte wird gespiegelt ----------
const BODY = [[100, 58], [92, 58], [89, 70], [84, 76], [74, 82], [62, 86], [52, 89], [45, 95], [41, 104], [39, 116], [40, 128], [38, 142], [37, 160], [35, 178], [33, 192], [31, 206], [30, 224], [30, 240], [27, 250], [25, 266], [28, 282], [34, 288], [38, 280], [39, 264], [41, 250], [43, 238], [46, 216], [48, 196], [51, 178], [54, 160], [57, 142], [60, 132], [63, 134], [65, 150], [66, 166], [68, 184], [69, 200], [66, 214], [63, 230], [61, 252], [61, 280], [64, 306], [67, 324], [68, 336], [66, 350], [64, 366], [66, 388], [70, 406], [72, 416], [68, 428], [70, 436], [90, 436], [92, 426], [91, 412], [93, 392], [95, 366], [95, 348], [96, 330], [97, 304], [98, 280], [99, 262], [100, 258]];
const HEAD = { cx: 100, cy: 31, rx: 18, ry: 24 };
const FOREARM = [[50, 180], [53, 194], [49, 214], [44, 236], [36, 238], [33, 222], [34, 204], [38, 188], [44, 180]];

// Reihenfolge = Zeichenreihenfolge (Deltamuskel liegt über dem Brustmuskel-Ansatz).
const MUSCLES = {
  front: [
    ['chest', [[[98.8, 92], [98.8, 140], [92, 146], [82, 147], [72, 141], [64, 130], [58, 122], [62, 108], [68, 96], [80, 92], [90, 91]]]],
    ['front-delts', [[[58, 91], [56, 104], [55, 118], [57, 128], [62, 124], [66, 110], [68, 96], [64, 89]]]],
    ['side-delts', [[[54, 89], [46, 94], [41, 104], [39, 116], [41, 128], [47, 132], [52, 124], [55, 108], [57, 94]]]],
    ['biceps', [[[57, 132], [58, 146], [56, 164], [52, 176], [46, 174], [42, 160], [41, 146], [45, 136], [51, 133]]]],
    ['forearms', [FOREARM]],
    ['abs', [[[98.8, 147], [98.8, 164], [89, 165], [88, 149]], [[98.8, 167], [98.8, 184], [89, 185], [88.5, 168]], [[98.8, 187], [98.8, 204], [89, 205], [89, 188]], [[98.8, 207], [98.8, 246], [94, 242], [90, 226], [89, 208]]]],
    ['obliques', [[[86, 149], [87, 176], [87, 204], [87, 228], [80, 222], [72, 210], [68, 192], [67, 172], [66, 156], [72, 147], [80, 146]]]],
    ['hip-flexors', [[[80, 228], [88, 238], [90, 248], [84, 250], [77, 238]]]],
    ['quads', [
      [[72, 240], [64, 256], [62, 282], [64, 306], [70, 322], [76, 312], [78, 280], [78, 256]], // Vastus lateralis
      [[80, 242], [79, 268], [80, 298], [84, 320], [89, 302], [91, 272], [88, 252]], // Rectus femoris
      [[93, 286], [89, 306], [87, 322], [92, 332], [97, 322], [97, 300]] // Vastus medialis
    ]],
    ['adductors', [[[91, 252], [98.8, 260], [98.8, 282], [94, 290], [92, 270]]]]
  ],
  back: [
    ['upper-back', [[[100, 60], [92, 62], [88, 76], [72, 84], [58, 90], [70, 96], [84, 108], [92, 126], [100, 150]]]],
    ['rear-delts', [[[58, 92], [48, 94], [41, 104], [39, 118], [41, 128], [48, 132], [56, 122], [62, 104]]]],
    ['triceps', [[[57, 132], [58, 150], [56, 168], [52, 178], [45, 176], [41, 160], [40, 144], [43, 134], [50, 130]]]],
    ['forearms', [FOREARM]],
    ['lats', [[[84, 116], [92, 140], [94, 170], [91, 196], [82, 206], [72, 198], [67, 178], [64, 152], [64, 136], [72, 124]]]],
    ['lower-back', [[[98.8, 150], [98.8, 222], [90, 222], [88, 196], [90, 166], [94, 152]]]],
    ['abductors', [[[66, 208], [82, 214], [76, 224], [64, 230], [62, 220]]]],
    ['glutes', [[[98.8, 224], [98.8, 258], [92, 266], [78, 264], [66, 254], [62, 238], [70, 226], [86, 220]]]],
    ['hamstrings', [[[80, 268], [68, 276], [64, 298], [68, 320], [76, 330], [81, 304]], [[86, 270], [85, 300], [84, 326], [92, 332], [97, 312], [98, 280]]]],
    ['calves', [[[82, 336], [72, 346], [66, 364], [70, 384], [80, 390], [84, 364]], [[88, 336], [87, 364], [88, 394], [94, 388], [96, 366], [94, 346]]]]
  ]
};
// Sichtbare, nicht gezählte Formen (nur Karte): vorne Trapez-Rand, Schienbeinmuskel, Wade innen; hinten Schulterblattmuskeln.
const DETAIL = {
  front: [[[91, 62], [90, 74], [82, 80], [70, 86], [80, 86], [90, 82]], [[72, 340], [68, 360], [70, 388], [74, 402], [78, 380], [79, 350]], [[90, 340], [94, 358], [93, 384], [88, 376], [86, 354]]],
  back: [[[64, 104], [72, 100], [82, 110], [80, 120], [68, 124], [62, 116]]]
};
// Feine Linien (nur Karte): vorne Sägemuskel-Zacken, hinten Gesäßfalte.
const LINES = {
  front: [[[77, 186], [69, 176]], [[79, 198], [70, 190]], [[81, 210], [72, 204]]],
  back: [[[100, 222], [100, 260]]]
};
const BREAST = [[95, 126], [93, 144], [84, 153], [73, 150], [66, 138]]; // Brustkontur weiblich (nur Linie)

// ---------- Geometrie ----------
const bump = (y, a, b) => (y <= a || y >= b ? 0 : Math.sin((Math.PI * (y - a)) / (b - a)));
// Weibliche Silhouette: Schultern schmaler, Taille schmaler, Hüfte/Oberschenkel breiter; Arme folgen den Schultern.
export function femDx(x, y) {
  const k = Math.max(0, Math.min(1, (100 - x) / 40));
  if (x < 58 && y >= 95) return 5;
  const sh = 5 * k * (y < 120 ? 1 : Math.max(0, (150 - y) / 30));
  return sh + 3 * k * bump(y, 140, 225) - 6 * k * bump(y, 205, 335);
}
const fem = (pts, f) => (f ? pts.map(([x, y]) => [x + femDx(x, y), y]) : pts);
const mirror = (pts) => pts.map(([x, y]) => [W - x, y]);
const n1 = (v) => Math.round(v * 10) / 10;

// Glatter Pfad durch die Punkte (Catmull-Rom als kubische Bézier-Kurven).
export function smoothPath(pts, closed = true, t = 0.6) {
  const n = pts.length;
  if (n === 2 && !closed) return `M${n1(pts[0][0])},${n1(pts[0][1])} L${n1(pts[1][0])},${n1(pts[1][1])}`;
  const g = closed ? (i) => pts[((i % n) + n) % n] : (i) => pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${n1(pts[0][0])},${n1(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [g(i - 1), g(i), g(i + 1), g(i + 2)];
    const c1 = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3];
    d += ` C${n1(c1[0])},${n1(c1[1])} ${n1(c2[0])},${n1(c2[1])} ${n1(p2[0])},${n1(p2[1])}`;
  }
  return d + (closed ? ' Z' : '');
}
const pair = (pts) => `${smoothPath(pts)} ${smoothPath(mirror(pts))}`;

// Pfade je Ansicht und Figur (einmal berechnet).
const cache = new Map();
export function figureData(view = 'front', sex = 'male') {
  const key = `${view}-${sex}`;
  if (cache.has(key)) return cache.get(key);
  const f = sex === 'female';
  const left = fem(BODY, f);
  const body = smoothPath([...left, ...mirror(left).reverse().slice(1, -1)], true, 0.55);
  const head = f ? { ...HEAD, rx: HEAD.rx - 1, ry: HEAD.ry - 1 } : HEAD;
  const muscles = MUSCLES[view].map(([m, parts]) => ({
    m,
    d: parts.map((p) => {
      let q = fem(p, f);
      if (f && m === 'chest') q = q.map(([x, y]) => [x - (y > 132 && x < 80 ? 2 : 0), y + (y > 132 ? 6 : 0)]);
      return pair(q);
    }).join(' ')
  }));
  const detail = DETAIL[view].map((p) => pair(fem(p, f)));
  const lines = [];
  for (const ln of LINES[view]) {
    const p = fem(ln, f);
    lines.push(smoothPath(p, false));
    if (p.some(([x]) => Math.abs(x - 100) > 0.5)) lines.push(smoothPath(mirror(p), false));
  }
  if (f && view === 'front') lines.push(smoothPath(BREAST, false), smoothPath(mirror(BREAST), false));
  const data = { body, head, muscles, detail, lines };
  cache.set(key, data);
  return data;
}

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

// classOf(muscleId) → CSS-Klasse der Füllung (z. B. 'lv2', 'prim', 'sec') oder ''.
// onPick(muscleId) macht Muskelformen antippbar (zusätzlich zur Liste, die der zugängliche Weg ist).
// mode 'map' (Anatomie, alle Muskeln) oder 'mini' (Silhouette, nur Muskeln mit Klasse).
export function figureSvg({ view = 'front', sex = 'male', classOf = () => '', width = 140, label = '', onPick = null, selected = null, mode = 'map' } = {}) {
  const mini = mode === 'mini';
  const svg = el('svg', { viewBox: VIEWBOX, width, height: Math.round((width * H) / W), class: `fig fig-${view}${mini ? ' mini' : ' map'}` });
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  const d = figureData(view, sex);
  svg.append(el('path', { d: d.body, class: 'body' }), el('ellipse', { ...d.head, class: 'body' }));
  if (!mini) for (const p of d.detail) svg.append(el('path', { d: p, class: 'fx' }));
  let sel = null;
  for (const { m, d: path } of d.muscles) {
    const c = classOf(m);
    if (mini && !c) continue;
    const shape = el('path', { d: path, class: ['fm', c || 'lv0', m === selected ? 'sel' : ''].filter(Boolean).join(' ') });
    shape.dataset.m = m;
    if (onPick) shape.addEventListener('click', () => onPick(m));
    if (m === selected) sel = shape;
    svg.append(shape);
  }
  if (!mini) for (const p of d.lines) svg.append(el('path', { d: p, class: 'fl' }));
  if (sel) svg.append(sel); // ausgewählter Muskel obenauf, damit sein Rand nicht verdeckt wird
  return svg;
}

// Mini-Piktogramm einer Übung: Silhouette, primär hell, sekundär blau.
export function miniFigure(exercise, sex = 'male', width = 24) {
  if (!(exercise.muscles?.primary || []).length) {
    // Cardio ohne Muskelzuordnung: Puls-Linie statt Figur.
    const svg = el('svg', { viewBox: '0 0 24 24', width, height: width, class: 'fig mini pulse', 'aria-hidden': 'true' });
    svg.append(el('path', { d: 'M3 12h4l2-5 4 10 2-5h6', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    return svg;
  }
  const prim = new Set(exercise.muscles?.primary || []);
  const sec = new Set(exercise.muscles?.secondary || []);
  const classOf = (m) => (prim.has(m) ? 'prim' : sec.has(m) ? 'sec' : '');
  const views = pickViews(exercise);
  if (views.length === 1) return figureSvg({ view: views[0], sex, width, mode: 'mini', classOf });
  // Beide Seiten nebeneinander, etwas schmaler, damit die Zeile gleich hoch bleibt.
  const wrap = document.createElement('span');
  wrap.className = 'fig-dual';
  for (const v of views) wrap.append(figureSvg({ view: v, sex, width: Math.round(width * 0.85), mode: 'mini', classOf }));
  return wrap;
}
