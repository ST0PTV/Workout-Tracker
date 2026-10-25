// v2.34.0 (Vorschlag 2): Einführung in drei kurzen Schritten statt Erklärungen auf jedem Bildschirm.
// Nicht blockierend: Für neue Nutzer (keine Pläne, keine Trainings) erscheint oben im Training-Tab eine Karte
// „Neu hier?“; die Einführung selbst ist ein Sheet und jederzeit in den Einstellungen wiederholbar.
import { h } from './util.js';
import { openSheet } from './sheet.js';
import { icon } from './icons.js';
import * as store from './store.js';

export const STEPS = [
  { icon: 'plans', title: 'Plan anlegen', text: 'Im Tab „Pläne“ mit + einen Plan anlegen und Übungen aus dem Startpool wählen.' },
  { icon: 'train', title: 'Sätze eintragen', text: 'Training starten: Die Werte vom letzten Mal stehen schon drin. Haken = Satz erledigt, die Pause läuft.' },
  { icon: 'progress', title: 'Fortschritt sehen', text: 'Im Tab „Fortschritt“ siehst du je Übung den Verlauf. Schätzungen sind markiert. Deine Daten bleiben auf diesem Gerät.' }
];

const markSeen = () => store.set('settings', { ...store.get('settings'), onboarded: true });

/** Neu = noch nie gesehen, keine Pläne, keine Trainings. */
export function isNewUser() {
  return store.get('settings').onboarded !== true && !store.get('plans').length && !store.get('sessions').length;
}

export function openOnboarding(onDone = () => {}) {
  let i = 0;
  let sheet = null;
  const body = h('div', { class: 'onboarding' });
  const finish = () => { markSeen(); sheet.close(); onDone(); };
  const draw = () => {
    const st = STEPS[i];
    const last = i === STEPS.length - 1;
    body.replaceChildren(
      h('div', { class: 'ob-icon' }, icon(st.icon, { size: 44 })),
      h('h2', {}, st.title),
      h('p', {}, st.text),
      h('div', { class: 'ob-dots', 'aria-label': `Schritt ${i + 1} von ${STEPS.length}` }, STEPS.map((_, k) => h('i', { class: k === i ? 'on' : '' }))),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { if (last) finish(); else { i += 1; draw(); } } }, last ? 'Los geht’s' : 'Weiter'),
      last ? null : h('button', { class: 'btn block subtle', type: 'button', onclick: finish }, 'Überspringen'));
  };
  draw();
  sheet = openSheet(body, { title: 'Einführung' });
  return sheet;
}

/** Karte oben im Training-Tab für neue Nutzer (oder null). */
export function welcomeCard(rerender) {
  if (!isNewUser()) return null;
  return h('div', { class: 'card welcome' },
    h('b', {}, 'Neu hier?'),
    h('p', { class: 'muted small' }, 'Drei kurze Schritte zeigen, wie die App funktioniert.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => openOnboarding(rerender) }, 'Einführung'),
      h('button', { class: 'btn', type: 'button', onclick: () => { markSeen(); rerender(); } }, 'Ausblenden')));
}
