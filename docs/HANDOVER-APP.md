# HANDOVER-APP – Workout Tracker (technischer Stand)

Dieses Dokument ist die technische Wahrheit des Repos. Bei jedem Deploy aktualisieren.
Wissen, Entscheidungen und Lessons liegen in Google Drive (`Home-Base/Projects/Apps/Workout Tracker/`), hier wird nur verlinkt, nicht kopiert.

## Stand

- **Live:** 1.5.0 (Übungspool Runde 1: 70 Übungen, Filter im Pool, deployt am 2026-10-13), Cache `wt-cache-v12`, Datenschema v2.
- **Versionen:** 0.1.0 Gerüst · 0.2.0 Datenmodell Schema v2 mit Migration · 0.3.0 Übungen-Tab mit recherchiertem Startpool · 0.3.1 Linien-Icons statt Zeichen/Emoji · 0.4.0 Trainingspläne und Pausenzeit pro Übung · 0.5.0 Training loggen mit Pausen-Timer und Aufwärm-Hinweis · 1.0.0 Fortschritt pro Übung: Tab mit Trend, Detail mit e1RM-Diagramm und Tabelle · 1.1.0 Trainings-Tagebuch mit Bearbeiten und Tippfehler-Hinweis · 1.2.0 Drop- und Rest-Pause-Sätze mit Stufen, Satz-Markierungen, Schnellknöpfe · 1.3.0 Übungsgruppen und Tausch im Training · 1.4.0 Muskelkarte mit Wochensätzen, Mini-Figur als Piktogramm, Tausch aufklappen, Pause pro Planeintrag, Körpergewicht mit Zusatzgewicht, Cardio als Einheit, Datum/Dauer im Tagebuch, Regel für leere Sätze · 1.5.0 Übungspool Runde 1 (+34 Übungen: Schultern, Waden, Adduktoren/Abduktoren, Gesäß/Beinbeuger/unterer Rücken, Quadrizeps-Varianten), Pool-Filter nach Muskel und Gerät (alle 2026-10-13).
- **Funktional:** PWA-Shell, Navigation, Glas-Design, Backup-Export und -Import, Datenmodell mit Migration, Übungen-Tab (Liste, Suche, Filter, Startpool, Editor, Archiv, Info-Sheets), Pläne-Tab (Liste, Ablauf, Bearbeiten), Pausenzeit pro Übung und Standard-Pause, Training-Tab (Start, Übungsseite, Übersicht, Pausen-Timer ohne Ton, Zusammenfassung), Fortschritt-Tab und Verlauf pro Übung (aus Tab, Übungs-Editor und Training), Trainings-Tagebuch mit Bearbeiten abgeschlossener Trainings, Satztypen Drop/Rest-Pause mit Stufen und Satz-Markierungen, Übungsgruppen mit Tausch im laufenden Training, Fortschritt → Muskeln (harte Sätze pro Woche), Körpergewicht- und Cardio-Loggen, Figur-Einstellung.
- **Nächster Schritt:** Übungspool Runde 2 (Rücken, Brust, Arme) und Runde 3 (Rumpf, Cardio-Geräte); danach e1RM-Formel prüfen (nur mit begutachteten Belegen ändern); v2.0 Illustrationen/Animationen.
- **Lizenz:** MIT (`LICENSE`, Rechteinhaber `ST0PTV`).

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
js/pool.js              Startpool (70 Übungen, Stand v1.5.0) mit Muskeln, Belastbarkeit, Evidenzart, Quellen
js/muscle-info.js       Infotexte und Quellen zu den 19 Muskelgruppen (ℹ)
js/exercises.js         Übungs-Bibliothek: Regionen, Suche, Gruppierung, Speichern, Archiv, Pool-Übernahme
js/exercises-view.js    Übungen-Tab: Liste, Startpool-Sheet, Editor, Muskelauswahl, ℹ-Sheets
js/icons.js             Eigene Linien-Icons (SVG). Keine Unicode-Zeichen/Emoji als Icons – Test `tests/icons.test.js` prüft das
js/controls.js          Stepper (−/Wert/+) für Sätze und Pausen
js/rest.js              Pausenzeit: Raster 15 s, 15 s–10 min, Formatierung m:ss, eigener Wert vor Standard
js/plans.js             Pläne: anlegen, Übungen hinzufügen/entfernen/verschieben, Sätze, archivieren/löschen, Anzeige-Daten
js/plans-view.js        Pläne-Tab: Kartenliste (A), Ablauf mit „Zuletzt“ und Bearbeiten mit Pfeilen (B), Übungs-Auswahl
js/session.js           Laufendes Training: starten, Sätze, Übungen, Pause, beenden/verwerfen, Anzeige-Daten
js/timer.js             Pausen-Timer aus Zeitstempeln (Start + Dauer), ±15 s; kein Ton
js/warmup-info.js       Aufwärm-Hinweis (Text) und Evidenz mit Quellen
js/training-view.js     Training-Tab: Start, Übungsseite (A), Übersicht (B), Pausen-Leiste, Zusammenfassung, Link „Verlauf“
js/progress.js          Fortschritt ohne DOM: e1RM (Epley, 1–10 Wdh.), Verlauf je Training, Rauschschwelle 5 %, Zusammenfassung
js/progress-info.js     Erklärtext „e1RM (Schätzung)“ und Quellen
js/progress-view.js     Fortschritt-Tab mit Umschalter „Übungen | Trainings“, Liste mit Mini-Verlauf, Detail (Kacheln, SVG-Diagramm mit ±5-%-Band, Tabelle), Editor-Panel
js/sets.js              Satztypen ohne DOM: Stufen (drop/restpause), Markierungen, Zählregeln-Kommentar, formatSet, setLabel
js/set-info.js          Erklärtext Drop/Rest-Pause und Quellen (PubMed-geprüft 2026-10-13)
js/set-view.js          Satz-Sheet (Typ, Markierungen, Entfernen), Stufenzeilen, Markierungs-Chips, Schnellknöpfe – für Training und Tagebuch
js/groups.js            Gruppen ohne DOM: anlegen/umbenennen/löschen (mit Bereinigung), Mitglieder, Tausch-Kandidaten
js/group-view.js        Gruppen-Feld im Übungs-Editor, „Verwalten“-Sheet, Tausch-Sheet im Training
js/week.js              Harte Sätze pro Muskel und Woche (Mo–So, primär 1, sekundär 0,5), Farbstufen
js/figure.js            Stilisierte Körperfigur (vorne/hinten, männlich/weiblich) und Mini-Piktogramm pro Übung
js/muscle-view.js       Fortschritt → Muskeln: Figur, Wochen-Navigation, Liste, Info-Sheet mit Quellen
js/input.js             Zahlen-Eingaben für Sätze (Gewicht mit Komma, Wdh. ganzzahlig, Grenzen) – gemeinsam für Training und Tagebuch
js/history.js           Tagebuch ohne DOM: Liste abgeschlossener Trainings, Entwurf bearbeiten, speichern (mit Validierung), löschen
js/diary-view.js        Tagebuch-Liste (Karten nach Monat), Detail-Sheet, Bearbeiten-Modus mit Abbrechen/Fertig, Tippfehler-Hinweistext
js/sheet.js             Stapelbare Bottom Sheets (Escape/Hintergrund schließt)
js/ui.js                Hash-Router (behält Scrollposition beim Neu-Rendern), Tab-Leiste, Toast
js/views.js             Einstellungen; re-exportiert die übrigen Tab-Ansichten
icons/                  App-Icons (selbst erzeugt)
tests/                  Node-Tests ohne Abhängigkeiten (helpers, store-backup, model, pool, exercises, icons, plans, rest, session, progress, history, sets, groups, v14, sw)
scripts/privacy-scan.sh Scan nach persönlichen Strings vor jedem Push
```

Schichten: `views` → `backup`/`ui` → `store` → `localStorage`. `model.js` und `migrate.js` sind rein (kein DOM, kein Speicher) und in Node testbar.

## Datenmodell (Schema v2)

Begründungen: Drive → `Decisions`. Felder, die erst später eine Oberfläche bekommen, sind markiert (UI ab …).

**Übung (`exercises`)**
- `id`, `name`, `kind` (`strength` | `bodyweight` | `cardio`)
- `muscles.primary[]`, `muscles.secondary[]`: IDs aus `MUSCLES` (19 Einträge; `hip-flexors` seit v0.3, ohne Schemaänderung). Abgrenzung: `biceps` = Armbeuger inkl. Brachialis, `glutes` = Gluteus maximus, `abductors` = Gluteus medius/minimus + TFL.
- `groupIds[]` → `groups` (UI seit v1.3)
- `defaultWorkSets` (Standard 3), `restSeconds` (Pause in s, `null` = Standard aus Einstellungen; seit v0.4, optional ohne Schemaänderung – fehlt bei Altdaten), `note` (Variante, Geräteeinstellung, Ausführung)
- `source { origin: builtin|custom, ref, verification: verified|training-knowledge|user, checkedAt }`
- `archived` (Übungen werden archiviert, nicht gelöscht, damit alte Trainings gültig bleiben), `createdAt`, `updatedAt`

**Gruppe (`groups`)** – Bewegungsmuster für den Tausch im Training: `id`, `name` (getrimmt, eindeutig ohne Groß/Klein, max. 40 Zeichen), `createdAt`, `updatedAt` (UI seit v1.3)

**Plan (`plans`)** – `id`, `name`, `items[] { id, exerciseId, groupId|null, targetSets|null }`, `archived`, Zeitstempel. `targetSets = null` heißt: `defaultWorkSets` der Übung. `groupId` ist nur eine optionale Einschränkung der Tausch-Kandidaten auf eine Gruppe (noch ohne Oberfläche).

**Training (`sessions`)** – `id`, `planId|null`, `startedAt`, `endedAt|null`, `note`, Zeitstempel,
`entries[] { id, exerciseId, plannedExerciseId|null, groupId|null, targetSets|null, sets[] }`, `restTimer { entryId, startedAt, durationSec } | null` (seit v0.5, optional ohne Schemaänderung).
`exerciseId` ist die tatsächlich gemachte Übung; nach einem Tausch steht die geplante in `plannedExerciseId` (Tausch zurück auf die geplante → wieder `null`). `targetSets` (seit v1.3, optional ohne Schemaänderung) wird beim Start aus dem Plan übernommen und für getauschte Übungen ohne Historie genutzt.

**Satz** – `id`, `type` (`warmup` | `work` | `drop` | `restpause`; `restpause` seit v1.2 ohne Schemaänderung), `weightKg|null`, `reps|null` (ganzzahlig) = erste Stufe, `durationSec|null`, `distanceM|null` (Cardio), `drops[] { weightKg, reps }` = Folge-Stufen (nur bei `drop` und `restpause`, UI seit v1.2), `tags[]` (Schlüssel aus `SET_TAGS`: `stretch-hold`, `partials`, `failure`, oder `custom:<Text>` bis 30 Zeichen; UI seit v1.2; `rest-pause` ist seit v1.2 keine Markierung mehr), `completedAt|null` (null = vorbelegt, noch nicht gemacht).

**Einstellungen (`settings`)** – `focus[]` (Standard `['strength']`), `weightUnit` (`kg`), `restSeconds` (120), `figure` (`male` | `female`, seit v1.4, nur Darstellung).

**Berechnungen (`model.js`)**
- Volumen = Gewicht × Wdh., nur `strength`; Drop-Stufen zählen alle; Aufwärmsätze nie. `bodyweight`: Volumen 0 (Körpergewicht wird bewusst nicht gespeichert), nur Wdh.
- Harte Sätze = abgeschlossene `work`-, `drop`- und `restpause`-Sätze; jeder = 1 (Konvention, keine Studie legt eine Umrechnung fest). Volumen und Gesamt-Wdh. zählen alle Stufen; Top-Satz und e1RM nur die erste Stufe.
- `lastPerformance` / `prefillSets`: Vorbelegung mit Satzzahl, Typen und Werten der letzten Ausführung derselben Übung. Kommt die Übung in einem Training mehrfach vor, zählt der **letzte** Eintrag mit erledigten Sätzen (seit v1.1).
- `bestWeight` / `weightWarning` (v1.1): Tippfehler-Hinweis, wenn ein Gewicht mehr als `TYPO_FACTOR` (2) × das schwerste erledigte Gewicht der Übung in abgeschlossenen Trainings ist. Nicht blockierend; Schwelle ist eine Design-Entscheidung ohne Beleg.
- `needsWarmupHint`: Hinweis, wenn eine primäre Muskelgruppe im laufenden Training noch nicht (primär oder sekundär) mit erledigten Sätzen belastet wurde.
- `swapEntryExercise`, `startSessionFromPlan`, `exerciseHistory` (Top-Satz, harte Sätze, Volumen pro Training), `sessionSummary`.
- `validateData` prüft alle Objekte und die Verweise zwischen den Sammlungen.

## Übungen-Tab und Startpool (v0.3)

- Liste nur eigener, nicht archivierter Übungen; Abschnitte = Körperregion des ersten primären Muskels (`REGIONS` in `exercises.js`). Filter-Chip trifft, wenn ein primärer Muskel in der Region liegt.
- „+“ öffnet Sheet: *Aus Startpool* (Liste mit „+“ pro Zeile, Tipp auf Zeile = Evidenz-Sheet) oder *Eigene Übung* (Editor).
- Editor: Name, Typ, primäre/sekundäre Muskeln (Picker, gegenseitig gesperrt), Standard-Arbeitssätze 1–10, Notiz, Quelle. Pflicht: Name und (außer Cardio) mindestens ein primärer Muskel; Namen eindeutig unter aktiven Übungen.
- Pool-Übung mit geänderten Muskeln → `source.verification = 'user'`; zurückgesetzt → wieder `verified`.
- Archivieren statt Löschen; erneute Pool-Übernahme stellt archivierte Übung wieder her.
- Pool-Einträge: `confidence` (high/medium/low), `basis` (Evidenzart), `note`, `others` (Muskeln außerhalb der Taxonomie), `sources[]` (Label, Link, eigene Kurzbeschreibung). Geprüft am `POOL_CHECKED_AT`. Recherche-Details in Drive → `Research & Sources`.
- Inhalte sind eigene Formulierungen; aus Quellen nur Fakten übernommen.

## Pläne-Tab und Pausen (v0.4)

- Liste: Karten mit Name, Anzahl Übungen, Arbeitssätze, Übungsfolge; archivierte Pläne gedimmt darunter.
- Plan-Sheet: nummerierter Ablauf mit Sätzen, Pause, Notiz und „Zuletzt <Datum>: <Arbeitssätze>“ (ohne Aufwärmsätze, aus `lastPerformance`).
- Bearbeiten: Name, Sätze pro Planeintrag (`targetSets`, 1–10), Pause (schreibt `restSeconds` an die **Übung**, gilt also in allen Plänen), Pfeile hoch/runter, Entfernen, „Übungen hinzufügen“ (Mehrfachauswahl in Antipp-Reihenfolge). Doppelte Übungen im Plan sind erlaubt und werden markiert.
- Löschen: Plan ohne Trainings wird gelöscht, sonst archiviert; archivierte lassen sich wiederherstellen.
- Pausen-Timer (v0.5): ohne Ton, ohne Alarm, ohne Vibration; Ende nur visuell. Berechnung über Zeitstempel (Start + Dauer), damit Sperrbildschirm/Hintergrund die Zeit nicht verfälscht.

## Training-Tab (v0.5)

- Höchstens ein laufendes Training (`endedAt === null`). Jede Änderung wird sofort gespeichert; nach Neuladen geht es bei der ersten offenen Übung weiter.
- Start: Plan-Karten mit „Starten“ oder „Freies Training“. Vorbelegung: Sätze (inkl. Aufwärmsätze) und Werte der letzten **abgeschlossenen** Ausführung der Übung; ohne Historie leere Arbeitssätze (`targetSets` bzw. `defaultWorkSets`).
- Übungsseite: Satztabelle (Gewicht `inputmode=decimal`, Komma erlaubt; Wdh. ganzzahlig), Haken = erledigt; Tipp auf Satznummer = Aufwärm/Arbeit umschalten oder entfernen. Notiz direkt bearbeitbar (schreibt an die Übung).
- Aufwärm-Hinweis (`warmup-info.js`): wenn `needsWarmupHint` und die Übung noch keinen Aufwärmsatz hat. Sekundär belastete Muskeln zählen als aufgewärmt (Design-Entscheidung, nicht belegt).
- Pausen-Timer: startet beim Abhaken mit der Pause der Übung; Leiste unten mit ±15 s und Stopp; Ende nur visuell („Pause vorbei“, Überzeit zählt still). Kein Audio, keine Vibration. Anzeige-Takt 250 ms, Berechnung aus Zeitstempeln.
- Übersicht (Sheet): springen, umsortieren, entfernen, Übung hinzufügen, beenden, verwerfen.
- Beenden: nicht abgehakte Sätze und leere Übungen werden verworfen; ohne erledigten Satz wird angeboten, das Training zu verwerfen. Zusammenfassung: Dauer, Arbeitssätze, Volumen (nur `strength`, ohne Aufwärmsätze).

## Fortschritt (v1.0)

- Tab „Fortschritt“ (5. Tab): alle Übungen mit mindestens einem **abgeschlossenen** Training, zuletzt trainierte zuerst; Mini-Verlauf (e1RM, bei Körpergewicht Gesamt-Wdh.) und Gesamttrend erster → letzter Schätzwert. Laufende Trainings zählen nicht.
- Detail (Sheet): Kachel „Bester Satz“ (gemessen: schwerstes Gewicht, bei Gleichstand mehr Wdh.) und Kachel „e1RM (Schätzung)“ (letzter Schätzwert). SVG-Diagramm: Linie = e1RM je Training, x-Achse zeitproportional, Band = ±5 % um jeden Punkt (typische Formel-Ungenauigkeit, **keine** aus den Daten berechnete Unsicherheit). Tippen auf einen Punkt zeigt Datum, Satz, Wert, Änderung. Tabelle aller Trainings (neueste zuerst).
- Regeln: nur Arbeits- und Drop-Sätze (Aufwärmsätze nie); Drop-Satz zählt für Top-Satz/e1RM mit der ersten Stufe, im Volumen mit allen Stufen. e1RM nur für `strength` und Sätze mit 1–10 Wdh.; Änderung < 5 % = „Rauschen“. Nie zwischen Übungen vergleichen.
- Variante B: Übungs-Editor hat bei vorhandener Historie den Umschalter „Details | Verlauf“; im Training erscheint neben „Zuletzt …“ ein Link „Verlauf“.
- Recherche und Grenzen: Drive → Research & Sources, Abschnitt 3; offene Punkte in Unverified & To Verify.

## Trainings-Tagebuch (v1.1)

- Fortschritt-Tab, Umschalter „Übungen | Trainings“ (Variante C; Modus bleibt beim Neu-Rendern erhalten). Karten nach Monat: Planname (oder „Freies Training“), Datum, Dauer, Arbeitssätze, Kurzfassung „Übung Arbeitssätze“ (max. 3, dann „+n“). Laufende Trainings erscheinen nicht.
- Detail-Sheet: Dauer, Arbeitssätze, Volumen, Sätze pro Übung; „Bearbeiten“ startet einen Entwurf (Kopie). Gespeichert wird erst mit „Fertig“ – anders als im laufenden Training, damit Durchsehen nichts verändert. „Abbrechen“ fragt bei Änderungen nach; Schließen per ✕/Wischen verwirft still mit Hinweis-Toast (Sheet kann Schließen nicht verhindern).
- Bearbeitbar: Gewicht/Wdh. (gleiche Regeln wie beim Loggen, `js/input.js`), Satz hinzufügen (gilt als erledigt mit `completedAt = endedAt`), Satz löschen, Aufwärm ↔ Arbeit (Drop-Sätze noch nicht), Übung entfernen, Training löschen (mit Bestätigung). **Nicht** bearbeitbar: Datum und Dauer (Backlog).
- Speichern: Übungen ohne Sätze fallen weg; bleibt keine übrig, wird „Training löschen“ angeboten. `validateSession` muss bestehen. Laufendes Training ist für `history.js` gesperrt.
- Fortschritt und Vorbelegung lesen immer aus `wt_sessions`; Korrekturen wirken also sofort. Ein bereits laufendes Training behält seine beim Start erzeugte Vorbelegung.
- Tippfehler-Hinweis erscheint beim Bearbeiten (Vergleich ohne das bearbeitete Training) und beim Loggen.

## Satztypen und Markierungen (v1.2)

- Variante A + C: Tipp auf die Satznummer öffnet das Satz-Sheet (`set-view.js`: Typ Aufwärm/Arbeit/Drop/Rest-Pause, Markierungen, „+ Eigene“ per `prompt()`, Entfernen, ℹ zur Zählweise). Schnellknöpfe „+ Drop“ / „+ Rest-Pause“ nur unter dem zuletzt abgehakten Arbeitssatz (`lastCompletedIndex`); `S.quickStage` wandelt den Satz um und legt die erste Stufe an.
- Stufenzeilen unter dem Satz mit „+ Stufe“ / „+ Mini-Satz“. Neue Rest-Pause-Stufe übernimmt das Gewicht der vorigen; Drop-Stufe bleibt leer (Platzhalter = voriges Gewicht).
- Stufen ohne Wdh. gelten als nicht gemacht und werden beim Beenden (`S.finish`) und Speichern im Tagebuch (`H.saveEdited`) entfernt (`cleanStages`). Typwechsel zu Aufwärm/Arbeit löscht Stufen (mit Rückfrage im Sheet).
- Training speichert jede Änderung sofort (`session.js`: `setSetType`, `addStage`, `updateStage`, `removeStage`, `toggleTag`, `quickStage`); das Tagebuch ändert den Entwurf (`H.draftSet` + Helfer aus `sets.js`).
- Vorbelegung übernimmt Typ, Stufen und Markierungen der letzten Ausführung (Kopie).
- Anzeige überall über `formatSet`: „80 × 8 + 60 × 6“, Rest-Pause mit gleichem Gewicht „80 × 7 + 3“; Kurzzeichen A, 1, 2D, 3RP.
- Achtung: `element.replaceChildren(...)` schreibt `null` als Text – vorher `.filter(Boolean)` (der Helfer `h()` überspringt null).

## Übungsgruppen und Tausch (v1.3)

- Variante A + Zeile aus C: Im Übungs-Editor Gruppen-Chips (an/aus), „+ Neue Gruppe“ (`prompt()`), „Verwalten“ (umbenennen, löschen) und die Zeile „In „X“ auch: …“. Gruppen sind Bewegungsmuster; eine Übung kann in mehreren sein.
- Kandidaten (`G.swapCandidates`): aus den Gruppen der **geplanten** Übung (`plannedExerciseId ?? exerciseId`); `entry.groupId` schränkt optional auf eine Gruppe ein. Archivierte Übungen nie, die aktuelle nie; die geplante steht nach einem Tausch vorn.
- Training: Knopf „Tauschen“ nur, wenn es Kandidaten gibt. Sheet zeigt „Zuletzt dd.mm.: …“ bzw. „Noch nicht trainiert · n Sätze aus dem Plan/(Standard)“. Unter dem Titel „statt <geplant> · zurück“.
- `S.swapEntry(entryId, exerciseId)`: ohne erledigten Satz → Übung im Eintrag ersetzen (`swapEntryExercise`, neue Vorbelegung, Pausen-Timer des Eintrags gestoppt); mit erledigtem Satz → neuer Eintrag direkt dahinter (erledigte Sätze bleiben). Ergebnis `{ mode: 'swapped' | 'inserted', index }`.
- Löschen einer Gruppe entfernt sie aus `exercises[].groupIds` und setzt `plans[].items[].groupId` auf `null`; abgeschlossene Trainings behalten ihr `groupId` (wird nicht gegen `groups` geprüft).
- Fortschritt bleibt pro Übung; „statt X“ erscheint in Übersicht und Tagebuch.

## Übungspool v1.5 (Runde 1)

- +34 Übungen in `js/pool.js` (Abschnitte Schultern und Beine, markiert mit „v1.5 Runde 1“); jetzt 70. Je Gruppe primär mindestens 4 Übungen für vordere/seitliche/hintere Schulter, Waden, Adduktoren, Abduktoren, unterer Rücken (Test in `tests/pool.test.js`).
- Recherche in 4 parallelen Paketen (nur geöffnete Quellen), Stichprobe 8/8 DOIs in Crossref bestätigt. `basis` kann jetzt auch „Ultraschall“ enthalten (Muskeldicke). Details, Schwächen und verworfene Übungen: Drive → Research & Sources, Abschnitt 6.
- Pool-Sheet: zusätzlich Muskel-Chips innerhalb der gewählten Region (nur bei mehr als einem Muskel), Geräte-Chips, Trefferzeile „n von 70 Übungen“, Mini-Figur pro Zeile.

## Paket v1.4

Optionale Felder ohne Schemaänderung (vor dem Bau gegengelesen, Lesson 10):
- Planeintrag und Trainingseintrag `restSeconds|null` (Pause nur in diesem Plan; beim Start kopiert; gilt für den Platz, also auch nach Tausch/Einfügen). Reihenfolge in `effectiveRest(ex, settings, entry)`: Eintrag → Übung → Standard. Die Pause der Übung selbst wird nur noch im Übungs-Editor geändert.
- Satz `intensity` (`easy` | `moderate` | `hard`, nur Cardio, optional). `weightKg` darf bei **Körpergewicht** negativ sein (Unterstützung, ≥ −300); `validateData` lehnt negative Gewichte bei anderen Typen ab.
- `hardSets(entry, kind)`: Cardio zählt nie als harter Satz.

Funktionen:
- **Muskeln** (`week.js`, `muscle-view.js`, Variante C): Woche Mo 00:00 – So (Ortszeit); nur abgeschlossene Trainings; primär 1, sekundär 0,5 (direkt/indirekt getrennt angezeigt); Stufen 0 / unter 5 / 5–8 / 9+ nur zur Darstellung, keine Zielwerte. Quellen und Grenzen: Drive → Research & Sources, Abschnitt 5.
- **Figur** (`figure.js`): einfache Formen in `viewBox 0 0 140 290`; weiblich = schmalere Schultern, breitere Hüfte. `pickView` wählt für das Mini-Piktogramm die Seite mit mehr primären Muskeln. Cardio ohne Muskeln → Puls-Linie.
- **Tausch** (Variante B): `ui.swapOpen` klappt die Kandidaten unter dem Titel auf; das Sheet aus v1.3 ist entfernt.
- **Plan-Eintrag** (Variante B): im Bearbeiten-Modus aufklappbar (`mode.open`): Sätze, Pause nur hier (`P.setItemRest`, „zurücksetzen“ = null), Tauschen aus (`P.setItemGroup`).
- **Körpergewicht** (A): Spalte „+ kg“ (`parseAddedWeight`, leer = nur Körpergewicht); Anzeige „KG × 8“, „+5 × 5“, „−10 × 6“. Kein Tippfehler-Hinweis.
- **Cardio** (C): eine Einheit (erster Satz) mit Dauer (`parseDuration`: Minuten, mm:ss, h:mm:ss), Strecke km, Intensität; Tempo pro km (`fmtPace`); keine Satzpause, keine Kalorien. Fortschritt: Tabelle Datum/Einheit/Tempo.
- **Leerer Satz** (A): `completionError(values, kind)` – Kraft braucht Gewicht und Wdh. ≥ 1, Körpergewicht Wdh., Cardio Dauer oder Strecke. Graue Platzhalter aus `placeholderFor` (voriger Satz gleichen Typs, sonst gleiche Position der letzten Ausführung); der Haken übernimmt sie. Ganz leere Sätze fallen beim Beenden und beim Speichern im Tagebuch weg (`isEmptySet`).
- **Tagebuch-Zeit** (B): Zeitzeile im Bearbeiten-Modus → Sheet mit Beginn/Ende (`datetime-local`); `H.setTimes` prüft Ende > Beginn, ≤ 12 h, nicht in der Zukunft, und verschiebt Satz-Zeitpunkte um die Differenz des Beginns (in [Beginn, Ende] gehalten).

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
6. Dieses Dokument aktualisieren; Drive-Doku (Changelog, Decisions, Research, Unverified, Lessons) gehört zu jedem Deploy (Regel seit 2026-10-13). Danach iPhone-Checkliste abarbeiten.

## Bekannte Grenzen und Risiken

- localStorage-Limit liegt je nach Browser bei etwa 5 MB (Trainingswissen, nicht verifiziert). Für viele Sessions später IndexedDB prüfen.
- Auf dem iPhone kann Safari Website-Daten nach längerer Nichtnutzung löschen (Trainingswissen, nicht verifiziert). Deshalb regelmäßig Backup exportieren; Erinnerungsfunktion bewusst nicht eingebaut.
- Der iOS-Speicher einer Homescreen-PWA ist nach bisherigem Wissen vom Safari-Tab getrennt (nicht verifiziert). Backup-Import also immer in der App selbst ausführen.
- `sw.js` kann keine ES-Module importieren; `CACHE_VERSION` muss daher manuell mit der App-Version abgestimmt werden.
- Teilen-Menü (`navigator.share` mit Datei) für den Backup-Export ist auf dem iPhone ungetestet.
- Datenmodell v2 ist nur durch Tests geprüft, nicht im echten Gebrauch. `prompt()` für eigene Markierungen und Gruppennamen sowie `datetime-local` im Zeit-Sheet in der Homescreen-App ungetestet.
- Muskelzuordnungen beruhen überwiegend auf EMG-Studien (Aktivität ≠ Wachstum); bei 6 Pool-Übungen ist die Belastbarkeit „niedrig“ (keine Studie zur Übung selbst).
- Sheets nutzen `92vh`; auf dem iPhone mit eingeblendeter Tastatur ungetestet.
- iOS kann eine Homescreen-PWA im Hintergrund beenden; JS-Timer laufen dann nicht. Deshalb zeitstempelbasiert und sofortiges Speichern (auf dem iPhone noch ungetestet).
- e1RM-Formeln sind an Sätzen bis zum Muskelversagen validiert; Sätze mit Reserve ergeben zu niedrige Schätzungen. Für Frauen, Maschinen- und Isolationsübungen ist die Genauigkeit schlechter belegt.
- Fünf Tabs: Beschriftung auf 10,5 px verkleinert; auf kleinen iPhones (SE) ungetestet.
- CSS-Klassen sind global: `.row` ist die Listenzeile. In v0.3 hat das die Backup-Buttons in den Einstellungen gestaucht (behoben in v0.4 mit `.btn-row`). Neue Klassen vorher auf Kollisionen prüfen.

## Offene Punkte

- Details siehe Drive: `Ideas & Backlog`, `Unverified & To Verify`.
