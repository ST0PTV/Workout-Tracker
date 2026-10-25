// Fortschritt: Erklärung und Evidenz (Recherche 2026-10-13, Details in Drive → Research & Sources, Abschnitt 3; e1RM-Nachrecherche 2026-10-14).
export const PROGRESS_CHECKED_AT = '2026-10-14';

export const E1RM_LABEL = 'Max-Kraft (Schätzung)'; // v2.34.0 (Vorschlag 7): statt „e1RM“ in Beschriftungen
export const E1RM_EXPLAIN = 'Auch e1RM genannt. Rechnerisch geschätztes Maximalgewicht für eine Wiederholung (Epley-Formel, nur Arbeitssätze mit höchstens 10 Wiederholungen) – kein gemessener Wert. In Studien liegt die Abweichung beim Bankdrücken meist im Bereich von ±5 %, bei Beinübungen wie Beinpresse oder Kniebeuge oft darüber. Endete der Satz vor dem Muskelversagen, fällt die Schätzung zu niedrig aus – auch Sätze, die sich wie „bis zum Versagen“ anfühlen, enden oft noch 1–2 Wiederholungen davor. Schwankungen unter ca. 5 % sind normales Tagesrauschen.';

export const PROGRESS_INFO = {
  // v2.34.0: Kurzfassung (Ebene 2); die Punkte unten bleiben als Details.
  short: [
    'Max-Kraft (Schätzung): geschätztes Gewicht für 1 Wiederholung – kein Messwert.',
    'Berechnet aus deinem besten Satz mit 1–10 Wiederholungen.',
    'Pfeil ↑ ↓ = Trend; → heißt unter ±5 %, also Tagesform. Verlässlicher ist der gemessene beste Satz.'
  ],
  summary: [
    'Gemessen: der beste Satz (Gewicht × Wiederholungen) – das ist der verlässlichste Wert.',
    'Geschätzt: e1RM nach Epley, Gewicht × (1 + Wdh./30), aus dem besten Arbeitssatz mit 1–10 Wiederholungen. Über 10 Wiederholungen weichen die Formeln stark ab, deshalb gibt es dann keinen Schätzwert.',
    'Das Band im Diagramm zeigt ±5 % um jeden Schätzwert: ein Richtwert für die Ungenauigkeit der Formel aus Studien (vor allem Bankdrücken), keine aus deinen Daten berechnete Unsicherheit. Bei Beinübungen ist der Fehler oft größer.',
    'Der Verlauf über Wochen ist nur ein grober Hinweis: In der bisher einzigen direkten Studie passte die Veränderung der Wiederholungen bei festem Gewicht kaum zur Veränderung des gemessenen Maximums. Verlässlicher ist der gemessene beste Satz.',
    'Warum Epley: Kein Vergleich zeigt eine Formel, die über Übungen und Geschlechter hinweg klar besser ist – und für den Verlauf zählt vor allem, dass immer gleich gerechnet wird.',
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
    { label: 'Baz-Valle, Fontes-Villalba & Santos-Concejero 2021, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000002776', note: 'Harte Sätze sind ein brauchbares Volumenmaß; kg × Wdh. weniger.' },
    { label: 'McNair et al. 2011, Arthritis Care Res', url: 'https://doi.org/10.1002/acr.20368', note: 'Beinstrecker: Epley unter den genauesten Formeln (typischer Fehler 3–4 %); Beinpresse: auch die besten Formeln etwa 6 %.' },
    { label: 'Armes et al. 2020, Front Psychol', url: 'https://doi.org/10.3389/fpsyg.2020.565416', note: 'Trainierte: selbst eingeschätztes Versagen lag im Mittel 2 Wiederholungen vor dem echten Versagen.' },
    { label: 'Mann et al. 2015, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000000829', note: 'Nach 6 Wochen Training passte die Veränderung der Wiederholungen kaum zur Veränderung des gemessenen 1RM (r = −0,22).' }
  ]
};
