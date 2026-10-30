// v3.14.0: Erscheinung vor dem ersten Zeichnen setzen (vorher Inline-Skript in index.html; jetzt Datei wegen CSP).
// Klassisches Skript (kein Modul), läuft blockierend im <head>. Dunkel ist Standard; js/theme.js übernimmt danach.
// Der Key muss zum Präfix in js/channel.js passen (scripts/beta.mjs ersetzt beide).
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('wt_settings') || '{}');
    if (s && s.appearance === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.querySelector('meta[name="theme-color"]').setAttribute('content', '#F2F2F7');
      document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').setAttribute('content', 'default');
    }
  } catch (e) { /* ohne Speicher: Dunkel */ }
})();
