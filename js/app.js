import * as store from './store.js';
import { startRouter, toast } from './ui.js';
import { trainingView, plansView, exercisesView, progressView, settingsView } from './views.js';
import { runnerView } from './routine-view.js';
import { activeSession } from './session.js';
import { setKeepAwake, initViewportGap } from './device.js';
import { applyTheme, appearanceOf } from './theme.js';

const boot = store.init();
applyTheme(appearanceOf(store.get('settings')));
initViewportGap(); // v3.0.6: Streifen unter dem Fenster im iOS-Home-Bildschirm (Klasse .wt-gap)

// v2.26.0 (A3): Schlägt ein Speichern fehl, bleibt oben ein Banner, bis das nächste Speichern klappt.
const saveBar = document.getElementById('savebar');
store.onWriteResult((ok) => { if (saveBar) saveBar.hidden = ok; });

// v2.26.0 (A1): Nach jedem Zeichnen prüfen, ob der Bildschirm anbleiben soll (laufendes Training + Einstellung).
const withDevice = (view) => () => {
  const node = view(() => router());
  setKeepAwake(!!activeSession() && store.get('settings').keepAwake !== false);
  return node;
};

const router = startRouter({
  '/': withDevice(trainingView),
  '/plans': withDevice(plansView),
  '/exercises': withDevice(exercisesView),
  '/progress': withDevice(progressView),
  '/settings': withDevice(settingsView),
  '/routine': withDevice(runnerView) // v2.3.0: Ablauf einer Aufwärm-/Cool-down-Routine
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
