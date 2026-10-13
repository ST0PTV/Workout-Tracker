import * as store from './store.js';
import { startRouter, toast } from './ui.js';
import { trainingView, plansView, exercisesView, settingsView } from './views.js';

const boot = store.init();

const router = startRouter({
  '/': () => trainingView(() => router()),
  '/plans': () => plansView(() => router()),
  '/exercises': () => exercisesView(() => router()),
  '/settings': () => settingsView(() => router())
});

if (!boot.ok) {
  // Daten bleiben unverändert; Hinweis, damit vor weiteren Änderungen ein Backup gezogen wird.
  toast(`Datenmigration fehlgeschlagen: ${boot.errors[0]} Bitte Backup exportieren.`, { error: true });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* Offline-Betrieb ist optional; die App läuft auch ohne Service Worker. */
    });
  });
}
