import * as store from './store.js';
import { startRouter, toast, currentPath } from './ui.js';
import { maybeTip } from './tour-view.js';
import { trainingView, plansView, exercisesView, progressView, settingsView } from './views.js';
import { runnerView } from './routine-view.js';
import { activeSession } from './session.js';
import { setKeepAwake, initViewportGap } from './device.js';
import { applyTheme, appearanceOf } from './theme.js';
import { openPlaySheet } from './play-view.js';

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
  setTimeout(() => maybeTip(currentPath()), 450); // v3.9.0: einmalige Tipps (Tutorial D)
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

// v3.1.0: Play-Knopf in der Tab-Leiste (ui.js sendet wt-play)
document.addEventListener('wt-play', () => openPlaySheet(() => router()));
// v3.9.0: Tutorial (Sandbox an/aus) zeichnet die Seite neu
document.addEventListener('wt-rerender', () => router());


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
