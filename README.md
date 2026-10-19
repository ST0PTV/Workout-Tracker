# Workout Tracker

Kostenlose Workout-Tracker-PWA fürs iPhone, Fokus auf Krafttraining. Alle Daten bleiben lokal im Browser-Speicher, es gibt keinen Server und keine Accounts.

Status: Version 2.13.0 (Training loggen, Pläne, Fortschritt, Tagebuch, Muskelkarte mit Summe aus direkten und indirekten Sätzen, recherchierter Übungspool (einzeln, gefiltert oder komplett übernehmbar), Technik-Animationen für 75 Übungen mit Kernpunkten, Datenblatt und Steuerleiste zum Einfrieren, männliche oder weibliche Figur, Routinen, Bewertung pro Übung mit Vorschlag fürs nächste Training). Die aktuelle Version steht in `js/version.js`.

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

## Datenschutz

Persönliche Daten (Trainingslogs, Gewichte, Körpermaße, Backups) gehören nie in dieses Repo. Backups sind per `.gitignore` ausgeschlossen.

## Lizenz und Quellen

Code: [MIT](LICENSE). Übungsnamen, Muskelzuordnungen und Infotexte sind eigene Formulierungen; die zugrunde liegenden Fakten stammen aus den in der App (ℹ) und im Code (`js/pool.js`, `js/muscle-info.js`) verlinkten Quellen. Die Inhalte sind keine medizinische Beratung.
