// Körper-Piktogramm auf den Plankarten (v2.33.0, Variante C mit einem drehbaren 3D-Körper, Nutzerwahl).
// Karte: kleine Figur, waagerecht wischen dreht sie, Tippen öffnet die große Ansicht mit Legende.
// Ohne WebGL: flache Figur (Vorderansicht) wie bei den Übungs-Piktogrammen.
import { h } from './util.js';
import { MUSCLES } from './model.js';
import { figureSvg } from './figure.js';
import { createBodyView } from './body3d.js';
import { planMuscles } from './plan-body.js';
import { openSheet } from './sheet.js';

const START_YAW = -0.5; // leicht schräg, damit die Figur gleich räumlich wirkt

function flat(muscles, sex, width) {
  const prim = new Set(muscles.primary);
  const sec = new Set(muscles.secondary);
  return figureSvg({ view: 'front', sex, width, mode: 'mini', classOf: (m) => (prim.has(m) ? 'prim' : sec.has(m) ? 'sec' : '') });
}

const names = (list) => list.map((m) => MUSCLES[m]).filter(Boolean).sort((a, b) => a.localeCompare(b, 'de')).join(', ');

// Figur für die Plankarte oder null (Plan ohne gezählte Muskeln, z. B. nur Cardio).
export function planFigure(plan, exercisesById, sex = 'male') {
  const muscles = planMuscles(plan, exercisesById);
  if (!muscles.primary.length && !muscles.secondary.length) return null;
  const label = `Muskeln von ${plan.name}: ${names(muscles.primary)}`;
  const open = () => openPlanBody(plan, muscles, sex);
  const v = createBodyView({ muscles, sex, width: 58, yaw: START_YAW, label, onTap: open });
  const el = v ? v.el : flat(muscles, sex, 52);
  return h('button', { class: 'plan-fig', type: 'button', 'aria-label': `${plan.name}: Muskeln ansehen`, onclick: v ? null : open }, el);
}

// Große Ansicht: drehbar, mit festen Ansichten und Legende.
export function openPlanBody(plan, muscles, sex = 'male') {
  const v = createBodyView({ muscles, sex, width: 170, yaw: START_YAW, label: `Muskeln von ${plan.name}, drehbar` });
  const seg = v ? h('div', { class: 'seg body-seg', role: 'group', 'aria-label': 'Ansicht' },
    [['Vorne', 0], ['Seite', -Math.PI / 2], ['Hinten', Math.PI]].map(([label, yaw]) => h('button', { type: 'button', onclick: () => v.turnTo(yaw) }, label))) : null;
  openSheet(h('div', { class: 'plan-body' },
    h('div', { class: 'pb-stage' }, v ? v.el : flat(muscles, sex, 150)),
    v ? h('p', { class: 'muted small center' }, 'Zum Drehen waagerecht wischen.') : null,
    seg,
    h('div', { class: 'legend pb-legend' },
      h('span', {}, h('i', { class: 'sw prim' }), 'Hauptmuskeln'),
      h('span', {}, h('i', { class: 'sw sec' }), 'Mitbeteiligt')),
    muscles.primary.length ? h('p', {}, h('b', {}, 'Hauptmuskeln: '), names(muscles.primary)) : null,
    muscles.secondary.length ? h('p', {}, h('b', {}, 'Mitbeteiligt: '), names(muscles.secondary)) : null,
    h('p', { class: 'muted small' }, 'Zusammengefasst aus allen Übungen des Plans, gleiche Zuordnung wie die Muskelkarte. Die Figur ist stilisiert, keine anatomische Abbildung.')),
  { title: plan.name });
}
