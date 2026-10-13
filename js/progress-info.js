// Fortschritt: Erklärung und Evidenz (Recherche 2026-10-13, Details in Drive → Research & Sources, Abschnitt 3).
export const PROGRESS_CHECKED_AT = '2026-10-13';

export const E1RM_LABEL = 'e1RM (Schätzung)';
export const E1RM_EXPLAIN = 'Rechnerisch geschätztes Maximalgewicht für eine Wiederholung (Epley-Formel, nur Arbeitssätze mit höchstens 10 Wiederholungen) – kein gemessener Wert; typische Abweichung etwa ±5 %. Wurde der Satz nicht annähernd bis zum Muskelversagen ausgeführt, fällt die Schätzung zu niedrig aus, und Schwankungen unter ca. 5 % sind normales Tagesrauschen.';

export const PROGRESS_INFO = {
  summary: [
    'Gemessen: der beste Satz (Gewicht × Wiederholungen) – das ist der verlässlichste Wert.',
    'Geschätzt: e1RM nach Epley, Gewicht × (1 + Wdh./30), aus dem besten Arbeitssatz mit 1–10 Wiederholungen. Über 10 Wiederholungen weichen die Formeln stark ab, deshalb gibt es dann keinen Schätzwert.',
    'Das Band im Diagramm zeigt ±5 % um jeden Schätzwert: die typische Ungenauigkeit der Formel laut Studien, keine aus deinen Daten berechnete Unsicherheit.',
    'Änderungen unter 5 % sind als „Rauschen“ markiert: Selbst ein gemessenes Maximum schwankt zwischen zwei Tests im Mittel um etwa 4 %.',
    'Aufwärmsätze zählen nie mit. Drop-Sätze zählen mit ihrer ersten (schwersten) Stufe; im Volumen zählen alle Stufen.',
    'Werte nur innerhalb derselben Übung vergleichen – nicht zwischen Übungen oder zwischen Gerät und freiem Gewicht.'
  ],
  sources: [
    { label: 'Reynolds, Gordon & Robergs 2006, J Strength Cond Res', url: 'https://doi.org/10.1519/R-15304.1', note: 'Schätzung aus 5RM am genauesten; höchstens 10 Wdh. für lineare Formeln.' },
    { label: 'Mayhew et al. 1995, J Sports Med Phys Fitness', url: 'https://pubmed.ncbi.nlm.nih.gov/7500624/', note: 'Über 10 Wdh. über- oder unterschätzen die Formeln systematisch.' },
    { label: 'Nickerson et al. 2020, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000003731', note: 'Epley mit dem kleinsten Schätzfehler bei 70 % 1RM.' },
    { label: 'Nuzzo, Pinto, Nosaka & Steele 2024, Sports Med (Meta-Regression)', url: 'https://doi.org/10.1007/s40279-023-01937-7', note: 'Wiederholungen bei gleichem %1RM unterscheiden sich stark zwischen Personen und Übungen.' },
    { label: 'Grgic et al. 2020, Sports Med Open (Systematic Review)', url: 'https://doi.org/10.1186/s40798-020-00260-z', note: '1RM-Wiederholungstest: Median-Variationskoeffizient 4,2 %.' },
    { label: 'Halperin et al. 2022, Sports Med (Meta-Analyse)', url: 'https://doi.org/10.1007/s40279-021-01559-x', note: 'Wiederholungen bis zum Versagen werden im Mittel um etwa 1 unterschätzt.' },
    { label: 'Baz-Valle, Fontes-Villalba & Santos-Concejero 2021, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000002776', note: 'Harte Sätze sind ein brauchbares Volumenmaß; kg × Wdh. weniger.' }
  ]
};
