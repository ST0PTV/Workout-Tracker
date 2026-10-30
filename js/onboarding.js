// v2.34.0 (Vorschlag 2): Karte für neue Nutzer; v3.9.0: sie startet den Rundgang (tour-view.js) statt der drei Schritte.
// Nicht blockierend: Für neue Nutzer (keine Pläne, keine Trainings) erscheint oben im Training-Tab eine Karte
// „Neu hier?“; Rundgang und Probetraining sind jederzeit in den Einstellungen wiederholbar.
import { h } from './util.js';
import * as store from './store.js';
import { startTour } from './tour-view.js';
import { isStandalone } from './device.js';
import { icon } from './icons.js';
import { CHANNEL } from './channel.js';
import { openDataInfo } from './privacy-info.js';

const markSeen = () => store.set('settings', { ...store.get('settings'), onboarded: true });

/** Neu = noch nie gesehen, keine Pläne, keine Trainings. */
export function isNewUser() {
  return store.get('settings').onboarded !== true && !store.get('plans').length && !store.get('sessions').length;
}

/**
 * v3.13.0 (M3, Feature-Audit 2026-10-29): einmaliger Hinweis außerhalb der installierten App. Safari löscht
 * Website-Speicher (localStorage) nach 7 Tagen ohne Besuch; Web-Apps auf dem Home-Bildschirm sind ausgenommen
 * (Search Engine Land 2020 mit WebKit-Zitat; Stand nicht neu geprüft, Unverified). Kein Druck, ein Tipp „Verstanden“ blendet ihn aus.
 */
export function homeScreenCard(rerender) {
  if (store.inSandbox?.() || store.get('settings').homeHint === true || isStandalone()) return null;
  return h('div', { class: 'card home-hint' },
    h('b', {}, icon('info', { size: 18, cls: 'inline' }), ' Zum Home-Bildschirm hinzufügen'),
    h('p', { class: 'muted small' }, 'Im Safari-Browser können deine Daten nach 7 Tagen ohne Besuch gelöscht werden, als App nicht. Teilen → „Zum Home-Bildschirm“. Zusätzlich sichert ein Backup (Einstellungen).'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'button', onclick: () => { store.set('settings', { ...store.get('settings'), homeHint: true }); rerender(); } }, 'Verstanden')));
}

/** v3.14.0: Hinweis der Testversion (nur Kanal 'beta', bis „Verstanden“). Betont: Daten nur lokal, selbst sichern. */
export function betaCard(rerender) {
  if (CHANNEL !== 'beta' || store.inSandbox?.() || store.get('settings').betaInfo === true) return null;
  return h('div', { class: 'card home-hint beta-hint' },
    h('b', {}, icon('info', { size: 18, cls: 'inline' }), ' Testversion – deine Daten bleiben bei dir'),
    h('p', { class: 'muted small' }, 'Alles bleibt nur auf diesem Gerät, nichts wird an einen Server gesendet. Sichere deine Daten deshalb regelmäßig selbst: Einstellungen → Backup → Exportieren.'),
    h('p', { class: 'muted small' }, 'In der Testversion sind Fehler möglich. Vorschläge der App sind Schätzungen, keine medizinische Beratung.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'button', onclick: openDataInfo }, 'Mehr dazu'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { store.set('settings', { ...store.get('settings'), betaInfo: true }); rerender(); } }, 'Verstanden')));
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
