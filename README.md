# Workout Tracker

Kostenlose Workout-Tracker-PWA fürs iPhone, Fokus auf Krafttraining. Alle Daten bleiben lokal im Browser-Speicher, es gibt keinen Server und keine Accounts.

Status: Version 3.1.0 (Quellen der Animationen und des Übungspools im Volltext geprüft; Training loggen, Pläne, Fortschritt, Tagebuch, Muskelkarte mit Summe aus direkten und indirekten Sätzen, 4-Wochen-Analyse je Muskel, optionaler Zyklus-Bereich (Beschwerden statt Phasen), recherchierter Übungspool (einzeln, gefiltert oder komplett übernehmbar), Technik-Animationen für 117 Übungen mit Kernpunkten, Datenblatt und Steuerleiste zum Einfrieren, männliche oder weibliche Figur, Routinen, Bewertung pro Übung mit Vorschlag fürs nächste Training, Bildschirm bleibt im Training an, Scheiben pro Seite bei Langhantel-Übungen, „je Seite“ bei einseitigen Übungen, nächster Satz in der Pausen-Leiste, Rückgängig nach dem Löschen, Warnbanner bei Speicherfehler, optionale Trainingstage pro Plan mit neutralem Hinweis am Folgetag, Plan nach dem Training gezielt anpassen, Wiederholungsbereich mit Doppelprogression, leichte Woche, Supersätze, „Mein Equipment“ als Filter für den Übungspool, Training nachtragen, drehbarer 3D-Körper mit den Muskeln jedes Plans, Plan des Tages oben, belegte Warnhinweise je Übung, aufgeräumte Oberfläche mit kurzen Texten und eingeklappten Details und Quellen, Glossar, kurze Einführung, abschaltbare Hinweise, einheitliche Abstände und Tasten; ab 3.0.0 Stil „Apple nativ“ mit Dunkel als Standard und Hell in den Einstellungen, iOS-Schalter, Spalte „Zuletzt“ im Training und gesperrte erledigte Sätze; ab 3.1.0 Tab-Leiste mit Play-Knopf für den nächsten Plan). Die aktuelle Version steht in `js/version.js`.

## Lokal ausprobieren

Ein beliebiger statischer Webserver reicht, zum Beispiel:

```
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen. Auf dem iPhone über Safari „Zum Home-Bildschirm“ wählen.

## Tests

```
npm run check    # Syntaxprüfung
npm test         # Node-Tests (Datenmodell, Speicher, Backup, Logik)
npm run privacy  # Scan nach persönlichen Strings
```

Prüfwerkzeuge für die Animationen liegen in `tests/browser/` (Kopfkommentar jeder Datei nennt den Aufruf; Playwright wird außerhalb des Repos gesucht):
`check-tabs` (Tabs ohne Fehler), `check-anim` (Animationen im Browser), `strip` und `svg2png` (Bildstreifen), `zoom` (Einzelbilder), `pose` (freie Posen), `snap` (Regressionsvergleich), `proto`.

## Datenschutz

Persönliche Daten (Trainingslogs, Gewichte, Körpermaße, Backups) gehören nie in dieses Repo. Backups sind per `.gitignore` ausgeschlossen.

## Lizenz und Quellen

Code: [MIT](LICENSE). Übungsnamen, Muskelzuordnungen und Infotexte sind eigene Formulierungen; die zugrunde liegenden Fakten stammen aus den in der App (ℹ) und im Code (`js/pool.js`, `js/muscle-info.js`) verlinkten Quellen. Die Inhalte sind keine medizinische Beratung.
