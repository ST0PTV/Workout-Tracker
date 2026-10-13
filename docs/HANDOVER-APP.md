# HANDOVER-APP – Workout Tracker (technischer Stand)

Dieses Dokument ist die technische Wahrheit des Repos. Bei jedem Deploy aktualisieren.
Wissen, Entscheidungen und Lessons liegen in Google Drive (`Home-Base/Projects/Apps/Workout Tracker/`), hier wird nur verlinkt, nicht kopiert.

## Stand

- **Live:** 0.2.0 (Datenmodell, deployt am 2026-10-13), Cache `wt-cache-v2`, Datenschema v2.
- **Versionen:** 0.1.0 Gerüst (2026-10-13) · 0.2.0 Datenmodell Schema v2 mit Migration (2026-10-13).
- **Funktional:** PWA-Shell, Navigation, Glas-Design, Backup-Export und -Import, Datenmodell mit Migration (noch ohne Oberfläche).
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
js/app.js               Einstieg, Migration beim Start, Router-Start, SW-Registrierung
js/version.js           APP_VERSION (einzige Quelle)
js/util.js              uuid, nowISO, clone, h() (DOM-Helfer)
js/model.js             Datenmodell: SCHEMA_VERSION, Konstanten, Fabriken, Validierung, Berechnungen
js/migrate.js           Schema-Migrationen (lokale Daten und Backups)
js/store.js             einzige Stelle mit localStorage-Zugriff
js/backup.js            Backup bauen, validieren (inkl. Migration), einspielen
js/ui.js                Hash-Router, Tab-Leiste, Toast
js/views.js             Ansichten
icons/                  App-Icons (selbst erzeugt)
tests/                  Node-Tests ohne Abhängigkeiten (helpers, store-backup, model)
scripts/privacy-scan.sh Scan nach persönlichen Strings vor jedem Push
```

Schichten: `views` → `backup`/`ui` → `store` → `localStorage`. `model.js` und `migrate.js` sind rein (kein DOM, kein Speicher) und in Node testbar.

## Datenmodell (Schema v2)

Begründungen: Drive → `Decisions`. Felder, die erst später eine Oberfläche bekommen, sind markiert (UI ab …).

**Übung (`exercises`)**
- `id`, `name`, `kind` (`strength` | `bodyweight` | `cardio`)
- `muscles.primary[]`, `muscles.secondary[]`: IDs aus `MUSCLES` (18 Einträge)
- `groupIds[]` → `groups` (UI ab v1.x)
- `defaultWorkSets` (Standard 3), `note` (Variante, Geräteeinstellung, Ausführung)
- `source { origin: builtin|custom, ref, verification: verified|training-knowledge|user, checkedAt }`
- `archived` (Übungen werden archiviert, nicht gelöscht, damit alte Trainings gültig bleiben), `createdAt`, `updatedAt`

**Gruppe (`groups`)** – Bewegungsmuster für den Tausch im Training: `id`, `name`, `createdAt`, `updatedAt` (UI ab v1.x)

**Plan (`plans`)** – `id`, `name`, `items[] { id, exerciseId, groupId|null, targetSets|null }`, `archived`, Zeitstempel. `targetSets = null` heißt: `defaultWorkSets` der Übung.

**Training (`sessions`)** – `id`, `planId|null`, `startedAt`, `endedAt|null`, `note`, Zeitstempel,
`entries[] { id, exerciseId, plannedExerciseId|null, groupId|null, sets[] }`.
`exerciseId` ist die tatsächlich gemachte Übung; nach einem Tausch steht die geplante in `plannedExerciseId`.

**Satz** – `id`, `type` (`warmup` | `work` | `drop`), `weightKg|null`, `reps|null` (ganzzahlig), `durationSec|null`, `distanceM|null` (Cardio), `drops[] { weightKg, reps }` (nur bei `drop`, UI ab v1.x), `tags[]` (Schlüssel aus `SET_TAGS` oder `custom:<Text>`, UI ab v1.x), `completedAt|null` (null = vorbelegt, noch nicht gemacht).

**Einstellungen (`settings`)** – `focus[]` (Standard `['strength']`), `weightUnit` (`kg`), `restSeconds` (120).

**Berechnungen (`model.js`)**
- Volumen = Gewicht × Wdh., nur `strength`; Drop-Stufen zählen alle; Aufwärmsätze nie. `bodyweight`: Volumen 0 (Körpergewicht wird bewusst nicht gespeichert), nur Wdh.
- Harte Sätze = abgeschlossene `work`- und `drop`-Sätze; ein Drop-Satz = 1.
- `lastPerformance` / `prefillSets`: Vorbelegung mit Satzzahl, Typen und Werten der letzten Ausführung derselben Übung.
- `needsWarmupHint`: Hinweis, wenn eine primäre Muskelgruppe im laufenden Training noch nicht (primär oder sekundär) mit erledigten Sätzen belastet wurde.
- `swapEntryExercise`, `startSessionFromPlan`, `exerciseHistory` (Top-Satz, harte Sätze, Volumen pro Training), `sessionSummary`.
- `validateData` prüft alle Objekte und die Verweise zwischen den Sammlungen.

## Konventionen (gemeinsam mit Calorie Tracker und Rezepte-App geplant)

- IDs: UUID (String). Zeitstempel: ISO-8601 UTC (String).
- localStorage-Keys mit Präfix `wt_`: `wt_schema`, `wt_exercises`, `wt_groups`, `wt_plans`, `wt_sessions`, `wt_settings`.
- Backup-JSON: `{ app: "workout-tracker", schemaVersion, exportedAt, data: { exercises[], groups[], plans[], sessions[], settings{} } }`. Ältere Backups werden beim Import migriert.
- Schemaänderung: `SCHEMA_VERSION` in `model.js` erhöhen, in `migrate.js` eine Stufe `vNtoN+1` ergänzen, Tests dazu schreiben. Die App migriert lokale Daten beim Start; schlägt das fehl, bleiben die Daten unverändert und ein Hinweis erscheint.

## Release-Ablauf

1. Version in `js/version.js` (SemVer) erhöhen.
2. `CACHE_VERSION` in `sw.js` hochzählen. Neue Dateien in `PRECACHE` eintragen.
3. `npm run check`, `npm test`, `npm run privacy`.
4. Browser-Test: neue Funktion plus Regression, keine Konsolenfehler.
5. Ein einziger Commit mit anonymer noreply-Identität, dann Push. **Keine Links auf Claude-Sessions in Commit-Nachrichten.**
6. Dieses Dokument aktualisieren, danach iPhone-Checkliste abarbeiten.

## Bekannte Grenzen und Risiken

- localStorage-Limit liegt je nach Browser bei etwa 5 MB (Trainingswissen, nicht verifiziert). Für viele Sessions später IndexedDB prüfen.
- Auf dem iPhone kann Safari Website-Daten nach längerer Nichtnutzung löschen (Trainingswissen, nicht verifiziert). Deshalb regelmäßig Backup exportieren; Erinnerungsfunktion bewusst nicht eingebaut.
- Der iOS-Speicher einer Homescreen-PWA ist nach bisherigem Wissen vom Safari-Tab getrennt (nicht verifiziert). Backup-Import also immer in der App selbst ausführen.
- `sw.js` kann keine ES-Module importieren; `CACHE_VERSION` muss daher manuell mit der App-Version abgestimmt werden.
- Teilen-Menü (`navigator.share` mit Datei) für den Backup-Export ist auf dem iPhone ungetestet.
- Datenmodell v2 ist nur durch Tests geprüft, nicht im echten Gebrauch. Gruppen-, Drop- und Markierungsfelder vor v1.x kritisch gegenlesen.

## Offene Punkte

- Details siehe Drive: `Ideas & Backlog`, `Unverified & To Verify`.
