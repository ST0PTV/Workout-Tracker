// Aufwärm-Hinweis: Text und Evidenz (Recherche 2026-10-13, Details in Drive → Research & Sources).
// Bewusst vorsichtig formuliert: Leistungseffekt uneinheitlich, kein Beleg für Verletzungsschutz im Krafttraining.
export const WARMUP_CHECKED_AT = '2026-10-13';

export const WARMUP_HINT = 'Erste Übung für diese Muskelgruppe heute: 1–2 kurze, leichte Aufwärmsätze können helfen, besonders vor schweren Sätzen.';

export const WARMUP_INFO = {
  summary: [
    'Spezifische Aufwärmsätze verbessern die folgenden Arbeitssätze nur uneinheitlich; am ehesten vor schweren Sätzen mit wenigen Wiederholungen.',
    'Für Verletzungsschutz durch Aufwärmen im Krafttraining wurden keine Studien gefunden.',
    'Ob eine schon belastete Muskelgruppe für die nächste Übung erneut aufgewärmt werden muss, ist nicht untersucht. Der Hinweis erscheint deshalb nur bei der ersten Übung je Muskelgruppe (Expertenempfehlung).',
    'Halte Aufwärmsätze kurz und nicht ermüdend – zu viel Aufwärmen kann die Leistung senken.'
  ],
  rule: 'Der Hinweis erscheint, wenn eine primäre Muskelgruppe der Übung heute noch nicht mit erledigten Sätzen belastet wurde (primär oder sekundär). Dass sekundäre Belastung als „aufgewärmt“ zählt, ist eine Design-Entscheidung ohne Studienbeleg.',
  sources: [
    { label: 'Ribeiro et al. 2021, Motricidade (Systematic Review)', url: 'https://doi.org/10.6063/motricidade.21143', note: '11 kleine Studien, uneinheitliche Ergebnisse; Nutzen am ehesten bei Aufwärmlasten nahe am Maximum.' },
    { label: 'Wilson, Nunes, Blazevich et al. 2025, J Sport Health Sci (Meta-Analyse)', url: 'https://doi.org/10.1016/j.jshs.2025.101024', note: 'Höhere Muskeltemperatur verbessert schnelle Kraftentwicklung, nicht die Maximalkraft.' },
    { label: 'McCrary, Ackermann & Halaki 2015, Br J Sports Med (Systematic Review)', url: 'https://doi.org/10.1136/bjsports-2014-094228', note: 'Keine Studie zu Verletzungen; Aufwärmen mit hoher Last verbessert Kraft und Leistung im Oberkörper.' },
    { label: 'Iversen, Norum, Schoenfeld & Fimland 2021, Sports Med (Narrative Review)', url: 'https://doi.org/10.1007/s40279-021-01490-1', note: 'Empfiehlt, spezifisches Aufwärmen auf die erste Übung je Muskelgruppe zu beschränken.' },
    { label: 'Lisboa et al. 2024, Aging Clin Exp Res', url: 'https://doi.org/10.1007/s40520-024-02880-x', note: 'Zusätzlicher Aufwärmsatz vor Isolationsübungen nach Grundübungen brachte nichts bzw. weniger Wiederholungen (ältere trainierte Frauen).' },
    { label: 'Barroso et al. 2013, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0b013e3182606cd9', note: 'Langes, intensives allgemeines Aufwärmen senkte das 1RM, leichtes erhöhte es.' }
  ]
};
