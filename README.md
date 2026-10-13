# Workout Tracker

Kostenlose Workout-Tracker-PWA fürs iPhone, Fokus auf Krafttraining. Alle Daten bleiben lokal im Browser-Speicher, es gibt keinen Server und keine Accounts.

Status: Version 0.3 (Übungen). Technischer Stand: [`docs/HANDOVER-APP.md`](docs/HANDOVER-APP.md).

## Lokal ausprobieren

Ein beliebiger statischer Webserver reicht, zum Beispiel:

```
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen. Auf dem iPhone über Safari „Zum Home-Bildschirm“ wählen.

## Tests

```
npm run check    # Syntaxprüfung
npm test         # Speicher- und Backup-Tests
npm run privacy  # Scan nach persönlichen Strings
```

## Datenschutz

Persönliche Daten (Trainingslogs, Gewichte, Körpermaße, Backups) gehören nie in dieses Repo. Backups sind per `.gitignore` ausgeschlossen.

## Lizenz und Quellen

Code: [MIT](LICENSE). Übungsnamen, Muskelzuordnungen und Infotexte sind eigene Formulierungen; die zugrunde liegenden Fakten stammen aus den in der App (ℹ) und im Code (`js/pool.js`, `js/muscle-info.js`) verlinkten Quellen. Die Inhalte sind keine medizinische Beratung.
