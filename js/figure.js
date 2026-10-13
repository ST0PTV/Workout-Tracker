// Stilisierte Körperfigur (v1.4) für Muskelkarte (Fortschritt → Muskeln) und Mini-Piktogramm pro Übung.
// Selbst gezeichnet aus einfachen Formen – keine anatomische Abbildung, nur Orientierung.
// Männliche und weibliche Figur unterscheiden sich nur in der Silhouette (Einstellung „Figur“); die Muskel-Logik ist gleich.
const NS = 'http://www.w3.org/2000/svg';
export const VIEWBOX = '0 0 140 290';
const W = 140;

// Muskeln je Ansicht. abductors (Gluteus medius/minimus + TFL) liegen seitlich und werden hinten gezeigt.
export const FRONT = ['chest', 'front-delts', 'side-delts', 'biceps', 'forearms', 'abs', 'obliques', 'hip-flexors', 'quads', 'adductors'];
export const BACK = ['upper-back', 'rear-delts', 'lats', 'lower-back', 'triceps', 'forearms', 'glutes', 'abductors', 'hamstrings', 'calves'];

// Ansicht für das Mini-Piktogramm: die Seite mit mehr primären Muskeln, bei Gleichstand vorne.
export function pickView(exercise) {
  const p = exercise?.muscles?.primary || [];
  const f = p.filter((m) => FRONT.includes(m) && m !== 'forearms').length;
  const b = p.filter((m) => BACK.includes(m) && m !== 'forearms').length;
  return b > f ? 'back' : 'front';
}

// Formen: [Muskel-ID oder null, Element, Attribute]; paarige Formen werden gespiegelt (pair: true).
function shapes(view, sex) {
  const fem = sex === 'female';
  const sh = fem ? 3 : 0; // Schultern schmaler
  const hp = fem ? 2 : 0; // Hüfte breiter
  const E = (m, cx, cy, rx, ry, pair = true) => ({ m, el: 'ellipse', a: { cx, cy, rx, ry }, pair });
  const R = (m, x, y, w, h, rx, pair = false) => ({ m, el: 'rect', a: { x, y, width: w, height: h, rx }, pair });
  const common = [
    { m: null, el: 'circle', a: { cx: 70, cy: 20, r: fem ? 12.5 : 13 }, pair: false },
    R(null, 64, 32, 12, 10, 4)
  ];
  if (view === 'front') {
    return [...common,
      E('front-delts', 44 + sh, 58, fem ? 10 : 11, 10),
      E('side-delts', 33 + sh, 66, 6, 11),
      fem ? E('chest', 59, 63, 10, 11) : R('chest', 49, 50, 20, 26, 9, true),
      E('biceps', 31 + sh, 93, fem ? 6 : 7, 15),
      E('forearms', 27 + sh, 128, fem ? 5 : 6, 17),
      R('abs', fem ? 60 : 59, 80, fem ? 20 : 22, 50, 9),
      E('obliques', fem ? 52 : 51, 103, fem ? 5 : 6, 19),
      E('hip-flexors', 59 - hp / 2, 140, 7, 7),
      E('quads', 53 - hp, 183, fem ? 12 : 11, 32),
      E('adductors', 66.5, 170, 3.5, 18),
      E(null, 55 - hp / 2, 250, 8, 26)
    ];
  }
  return [...common,
    R('upper-back', 52 + sh / 2, 42, 36 - sh, 22, 10),
    E('rear-delts', 42 + sh, 60, 10, 9),
    E('triceps', 31 + sh, 93, fem ? 6 : 7, 15),
    E('forearms', 27 + sh, 128, fem ? 5 : 6, 17),
    E('lats', 54 + (fem ? 1 : 0), 93, fem ? 9 : 10, 22),
    R('lower-back', 62, 104, 16, 28, 7),
    E('glutes', 58 - hp / 2, 146, 13 + hp / 2, 13),
    E('abductors', 41 - hp, 146, 4.5, 10),
    E('hamstrings', 55 - hp / 2, 190, 11, 27),
    E('calves', 55 - hp / 2, 248, 9, 24)
  ];
}

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function mirror(s) {
  const a = { ...s.a };
  if (s.el === 'rect') a.x = W - a.x - a.width; else a.cx = W - a.cx;
  return a;
}

// classOf(muscleId) → CSS-Klasse der Füllung (z. B. 'lv2', 'prim', 'sec') oder ''.
// onPick(muscleId) macht Muskelformen antippbar (zusätzlich zur Liste, die der zugängliche Weg ist).
export function figureSvg({ view = 'front', sex = 'male', classOf = () => '', width = 140, label = '', onPick = null, selected = null } = {}) {
  const svg = el('svg', { viewBox: VIEWBOX, width, height: Math.round((width * 290) / 140), class: `fig fig-${view}` });
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  for (const s of shapes(view, sex)) {
    const variants = s.pair ? [s.a, mirror(s)] : [s.a];
    for (const a of variants) {
      const cls = ['fm', s.m ? (classOf(s.m) || 'lv0') : 'body', s.m && s.m === selected ? 'sel' : ''].filter(Boolean).join(' ');
      const shape = el(s.el, { ...a, class: cls });
      if (s.m) {
        shape.dataset.m = s.m;
        if (onPick) shape.addEventListener('click', () => onPick(s.m));
      }
      svg.append(shape);
    }
  }
  return svg;
}

// Mini-Piktogramm einer Übung: primär hell, sekundär blau.
export function miniFigure(exercise, sex = 'male', width = 24) {
  if (!(exercise.muscles?.primary || []).length) {
    // Cardio ohne Muskelzuordnung: Puls-Linie statt Figur.
    const svg = el('svg', { viewBox: '0 0 24 24', width, height: width, class: 'fig mini pulse', 'aria-hidden': 'true' });
    svg.append(el('path', { d: 'M3 12h4l2-5 4 10 2-5h6', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    return svg;
  }
  const view = pickView(exercise);
  const prim = new Set(exercise.muscles?.primary || []);
  const sec = new Set(exercise.muscles?.secondary || []);
  const svg = figureSvg({ view, sex, width, classOf: (m) => (prim.has(m) ? 'prim' : sec.has(m) ? 'sec' : '') });
  svg.classList.add('mini');
  return svg;
}
