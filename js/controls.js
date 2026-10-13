// Wiederverwendbare Bedienelemente.
import { h } from './util.js';
import { icon } from './icons.js';

// Stepper −/Wert/+ mit großen Tap-Zielen. onChange(newValue) liefert den neuen Wert zurück
// (oder null, um abzulehnen); die Anzeige folgt dem zurückgegebenen Wert.
export function stepper({ value, format = String, onStep, label = 'Wert', small = false }) {
  let current = value;
  const out = h('div', { class: 'step-val', 'aria-live': 'polite' }, format(current));
  const go = (d) => {
    const next = onStep(current, d);
    if (next === null || next === undefined) return;
    current = next;
    out.textContent = format(current);
  };
  return h('div', { class: `step${small ? ' small' : ''}`, role: 'group', 'aria-label': label },
    h('button', { type: 'button', 'aria-label': `${label} verringern`, onclick: () => go(-1) }, icon('minus')),
    out,
    h('button', { type: 'button', 'aria-label': `${label} erhöhen`, onclick: () => go(1) }, icon('plus')));
}
