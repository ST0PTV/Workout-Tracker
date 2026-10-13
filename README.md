# Workout Tracker

Kostenlose Workout-Tracker-PWA fürs iPhone, Fokus auf Krafttraining. Alle Daten bleiben lokal im Browser-Speicher, es gibt keinen Server und keine Accounts.

Status: Version 0.1 (Gerüst). Technischer Stand: [`docs/HANDOVER-APP.md`](docs/HANDOVER-APP.md).

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
