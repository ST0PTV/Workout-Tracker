import * as store from './store.js';
import { startRouter } from './ui.js';
import { trainingView, plansView, exercisesView, settingsView } from './views.js';

store.init();

const router = startRouter({
  '/': () => trainingView(),
  '/plans': () => plansView(),
  '/exercises': () => exercisesView(),
  '/settings': () => settingsView(() => router())
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* Offline-Betrieb ist optional; die App läuft auch ohne Service Worker. */
    });
  });
}
