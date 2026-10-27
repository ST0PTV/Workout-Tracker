// v2.34.0 (Vorschlag 2): Karte für neue Nutzer; v3.9.0: sie startet den Rundgang (tour-view.js) statt der drei Schritte.
// Nicht blockierend: Für neue Nutzer (keine Pläne, keine Trainings) erscheint oben im Training-Tab eine Karte
// „Neu hier?“; Rundgang und Probetraining sind jederzeit in den Einstellungen wiederholbar.
import { h } from './util.js';
import * as store from './store.js';
import { startTour } from './tour-view.js';

const markSeen = () => store.set('settings', { ...store.get('settings'), onboarded: true });

/** Neu = noch nie gesehen, keine Pläne, keine Trainings. */
export function isNewUser() {
  return store.get('settings').onboarded !== true && !store.get('plans').length && !store.get('sessions').length;
}

/** Karte oben im Training-Tab für neue Nutzer (oder null). */
export function welcomeCard(rerender) {
  if (!isNewUser()) return null;
  return h('div', { class: 'card welcome' },
    h('b', {}, 'Neu hier?'),
    h('p', { class: 'muted small' }, 'Ein kurzer Rundgang zeigt dir die App. Danach kannst du ein Probetraining ausprobieren – dabei wird nichts gespeichert.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => startTour() }, 'Rundgang starten'),
      h('button', { class: 'btn', type: 'button', onclick: () => { markSeen(); rerender(); } }, 'Ausblenden')));
}
