// v3.0.0: Erscheinung (Dunkel ist Standard, Hell über Einstellungen → Anzeige).
// Setzt html[data-theme] für die Tokens in css/glass.css und passt Statusleiste und Browserfarbe an.
// index.html setzt das Attribut schon vor dem ersten Zeichnen (kein Aufblitzen); dies hier gilt bei Änderungen.

export const APPEARANCES = [['dark', 'Dunkel'], ['light', 'Hell']];
const BAR = { dark: { color: '#000000', status: 'black-translucent' }, light: { color: '#F2F2F7', status: 'default' } };

/** Liefert 'dark' oder 'light' aus den Einstellungen (unbekannte Werte → 'dark'). */
export function appearanceOf(settings) {
  return settings && settings.appearance === 'light' ? 'light' : 'dark';
}

/** Wendet die Erscheinung auf das Dokument an. Ohne DOM (Node-Tests) passiert nichts. */
export function applyTheme(appearance) {
  if (typeof document === 'undefined') return;
  const mode = appearance === 'light' ? 'light' : 'dark';
  const root = document.documentElement;
  if (mode === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
  const meta = (name) => document.querySelector(`meta[name="${name}"]`);
  meta('theme-color')?.setAttribute('content', BAR[mode].color);
  // iOS liest die Statusleisten-Angabe nur beim Start der Web-App; die Änderung greift nach dem nächsten Öffnen.
  meta('apple-mobile-web-app-status-bar-style')?.setAttribute('content', BAR[mode].status);
  document.dispatchEvent(new CustomEvent('wt-theme', { detail: mode }));
}
