// Erklärtext „Drop- und Rest-Pause-Sätze“ (v1.2). Eigene Formulierungen; aus den Quellen nur Fakten übernommen.
// Quellen am 2026-10-13 per PubMed geprüft (DOI aus dem Eintrag). Volltext gelesen: nur Sødal 2023, sonst Abstract.
// Details und Schwächen: Drive → Research & Sources, offene Frage: Unverified & To Verify #32.

export const SET_INFO_CHECKED_AT = '2026-10-13';

export const SET_INFO = {
  short: [
    'Drop-Satz: ohne Pause mit weniger Gewicht weiter.',
    'Rest-Pause: kurze Pause, dann Mini-Sätze mit gleichem Gewicht.',
    'Beide zählen als 1 Satz; im Volumen zählen alle Stufen.'
  ],
  what: [
    'Drop-Satz: Satz bis kurz vor oder bis zum Versagen, dann ohne Pause mit weniger Gewicht weiter (Stufen).',
    'Rest-Pause-Satz: Satz, kurze Pause, dann mit dem gleichen Gewicht weitere Mini-Sätze.'
  ],
  counting: [
    'Ein Drop- oder Rest-Pause-Satz zählt als 1 harter Satz.',
    'Volumen und Gesamt-Wiederholungen zählen alle Stufen.',
    'Bester Satz und e1RM (Schätzung) nutzen nur die erste Stufe – sonst würden die Gesamt-Wiederholungen die Schätzung aufblähen.'
  ],
  evidence: 'Studien finden für Drop- und Rest-Pause-Sätze ähnliches Muskelwachstum wie für normale Sätze, oft in kürzerer Zeit. Wie viele „normale“ Sätze ein Drop- oder Rest-Pause-Satz wert ist, legt keine gefundene Studie fest – die Zählung als 1 Satz ist eine Konvention dieser App und unterschätzt den Reiz möglicherweise.',
  sources: [
    { label: 'Sødal et al. 2023, Sports Med Open', url: 'https://doi.org/10.1186/s40798-023-00620-5', note: 'Meta-Analyse: Drop- vs. normale Sätze, kein signifikanter Unterschied im Wachstum' },
    { label: 'Havers et al. 2026, Sports Med Open', url: 'https://doi.org/10.1186/s40798-026-01012-1', note: 'Meta-Analyse (12 Studien): ähnliche Langzeit-Effekte, höhere empfundene Anstrengung' },
    { label: 'Tsartsapakis et al. 2026, J Funct Morphol Kinesiol', url: 'https://doi.org/10.3390/jfmk11010080', note: 'Meta-Analyse fortgeschrittener Methoden; Rest-Pause leicht im Vorteil' },
    { label: 'Enes et al. 2021, Appl Physiol Nutr Metab', url: 'https://doi.org/10.1139/apnm-2021-0278', note: 'RCT: Rest-Pause und Drop bei gleichem Volumen ähnlich wie normale Sätze' },
    { label: 'Fink et al. 2018, J Sports Med Phys Fitness', url: 'https://doi.org/10.23736/S0022-4707.17.06838-4', note: 'Kleine Studie: 1 Drop-Satz mindestens so gut wie 3 normale Sätze (Unterschied nicht signifikant)' }
  ]
};
