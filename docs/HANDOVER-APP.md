# HANDOVER-APP – Workout Tracker (technischer Stand)

Dieses Dokument ist die technische Wahrheit des Repos. Bei jedem Deploy aktualisieren.
Wissen, Entscheidungen und Lessons liegen in Google Drive (`Home-Base/Projects/Apps/Workout Tracker/`), hier wird nur verlinkt, nicht kopiert.

## Stand

- **Version:** 0.1.0 (Gerüst, deployt am 2026-10-13)
- **Cache:** `wt-cache-v1` (`CACHE_VERSION` in `sw.js`)
- **Datenschema:** v1
- **Funktional in v0.1:** PWA-Shell, Navigation, Glas-Design, Backup-Export und -Import.
- **Platzhalter:** Training (v0.5), Pläne (v0.4), Übungen (v0.3).

## Rahmenbedingungen

- PWA fürs iPhone, Hosting auf GitHub Pages, öffentliches Repo.
- Alle Daten bleiben lokal (localStorage). Keine Server, keine Accounts, keine Tracker. Alles kostenlos.
- Kein Build-Schritt: reine ES-Module, die direkt ausgeliefert werden. `package.json` dient nur Tests und Syntaxprüfung.
- Pfade sind relativ (GitHub Pages liefert unter `/Workout-Tracker/` aus).

## Struktur

```
index.html              App-Shell
manifest.webmanifest    PWA-Manifest
sw.js                   Service Worker (Precache + stale-while-revalidate)
css/glass.css           Stil "Glas"
js/app.js               Einstieg, Router-Start, SW-Registrierung
js/version.js           APP_VERSION (einzige Quelle)
js/util.js              uuid, nowISO, clone, h() (DOM-Helfer)
js/store.js             einzige Stelle mit localStorage-Zugriff
js/backup.js            Backup bauen, validieren, einspielen
js/ui.js                Hash-Router, Tab-Leiste, Toast
js/views.js             Ansichten
icons/                  App-Icons (selbst erzeugt)
tests/                  Node-Tests ohne Abhängigkeiten
scripts/privacy-scan.sh Scan nach persönlichen Strings vor jedem Push
```

Schichten: `views` → `backup`/`ui` → `store` → `localStorage`. Nur `store.js` kennt den Speicher.

## Konventionen (gemeinsam mit Calorie Tracker und Rezepte-App geplant)

- IDs: UUID (String). Zeitstempel: ISO-8601 UTC (String).
- localStorage-Keys mit Präfix `wt_`: `wt_schema`, `wt_exercises`, `wt_plans`, `wt_sessions`, `wt_settings`.
- Backup-JSON: `{ app: "workout-tracker", schemaVersion, exportedAt, data: { exercises[], plans[], sessions[], settings{} } }`.
- Schemaänderung: `SCHEMA_VERSION` in `store.js` erhöhen und `migrate()` in `backup.js` erweitern.

## Release-Ablauf

1. Version in `js/version.js` (SemVer) erhöhen.
2. `CACHE_VERSION` in `sw.js` hochzählen. Neue Dateien in `PRECACHE` eintragen.
3. `npm run check`, `npm test`, `npm run privacy`.
4. Browser-Test: neue Funktion plus Regression, keine Konsolenfehler.
5. Ein einziger Commit mit anonymer noreply-Identität, dann Push.
6. Dieses Dokument aktualisieren, danach iPhone-Checkliste abarbeiten.

## Bekannte Grenzen und Risiken

- localStorage-Limit liegt je nach Browser bei etwa 5 MB (Trainingswissen, nicht verifiziert). Für viele Sessions später IndexedDB prüfen.
- Auf dem iPhone kann Safari Website-Daten nach längerer Nichtnutzung löschen (Trainingswissen, nicht verifiziert). Deshalb regelmäßig Backup exportieren; Erinnerungsfunktion bewusst nicht eingebaut.
- Der iOS-Speicher einer Homescreen-PWA ist nach bisherigem Wissen vom Safari-Tab getrennt (nicht verifiziert). Backup-Import also immer in der App selbst ausführen.
- `sw.js` kann keine ES-Module importieren; `CACHE_VERSION` muss daher manuell mit der App-Version abgestimmt werden.
- Teilen-Menü (`navigator.share` mit Datei) für den Backup-Export ist auf dem iPhone ungetestet.

## Offene Punkte

- Details siehe Drive: `Ideas & Backlog.md`, `Unverified & To Verify`.
