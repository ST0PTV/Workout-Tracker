// v2.34.0: Warnhinweise pro Übung („Worauf achten“) – nur Hauptpunkte mit belegtem Risiko.
// Regel (Nutzer, 2026-10-25): Gibt es für eine Übung kein belegtes Risiko, bekommt sie keinen Hinweis.
// „Belegt“ heißt hier: eine Verletzung oder Gefahr ist für genau diese Übung in einer Quelle beschrieben
// (Review, Fallserie, Fallbericht, Videoanalyse, Messung, Umfrage). Reine Modellrechnungen oder
// Ersatzgrößen allein reichen nicht; sie dürfen einen belegten Punkt nur ergänzen.
// Kein Grenzwert, keine Gewichtsschwelle: dafür gibt es keine verlässliche Grundlage.
// Jede Quelle wurde in PubMed nachgeschlagen und mit Abstract oder Volltext verglichen (read: 'abstract' | 'fulltext').

export const WARN_CHECKED_AT = '2026-10-25';

// Art des Belegs – wird am Hinweis angezeigt, damit die Stärke sichtbar ist.
export const EVIDENCE = {
  review: 'Review',
  series: 'Fallserie',
  case: 'Fallbericht',
  video: 'Videoanalyse',
  measure: 'Messstudie',
  survey: 'Umfrage',
  model: 'Modellstudie'
};

const S = (label, doi, note, read) => ({ label, url: `https://doi.org/${doi}`, note, read });

const SRC = {
  KOWALCZUK_2022: S('Kowalczuk & Elmaraghy 2022, J Am Acad Orthop Surg', '10.5435/JAAOS-D-21-00541',
    'Review: Risse des großen Brustmuskels entstehen meist beim Bankdrücken in der nachgebenden (exzentrischen) Phase; akute Risse operiert besser als nicht operiert.', 'abstract'),
  CHAN_2019: S('Chan et al. 2019, Orthop J Sports Med', '10.1177/2325967119860157',
    'Fallserie: 19 Brustmuskelrisse bei Kadetten, 10 davon beim Bankdrücken.', 'abstract'),
  CAREK_1998: S('Carek 1998, Med Sci Sports Exerc', '10.1097/00005768-199803000-00001',
    'Fallbericht und Übersicht: Brustmuskelriss bei Dips mit Zusatzgewicht; die meisten Risse beim Bankdrücken.', 'abstract'),
  DASILVA_2022: S('da Silva et al. 2022, Int J Sports Phys Ther', '10.26603/001c.35720',
    'Fallbericht: Brustmuskelriss beim Ring-Dip.', 'abstract'),
  JUMBELIC_2007: S('Jumbelic 2007, J Forensic Sci', '10.1111/j.1556-4029.2007.00429.x',
    'Fallberichte: Ersticken durch die Langhantel auf dem Hals, ohne Sicherheitsbügel oder Sicherungsperson; mindestens 11 weitere Todesfälle 1999–2002 in einer US-Unfalldatenbank.', 'abstract'),
  LAPPEN_2022: S('Lappen et al. 2022, BMC Musculoskelet Disord', '10.1186/s12891-022-05546-9',
    'Videoanalyse von 56 Bizepssehnenrissen: 40 beim Kreuzheben, dort immer am Arm im Untergriff, der Arm im Obergriff blieb unverletzt.', 'fulltext'),
  BERNSTORFF_2023: S('Bernstorff et al. 2023, Sports (Basel)', '10.3390/sports12010012',
    'Online-Umfrage, 1387 Freizeitsportler: Kniebeuge, Kreuzheben, Bankdrücken und Dips am häufigsten mit Schmerzen genannt; Querschnitt, Last nicht erfasst.', 'fulltext'),
  BARNDS_2019: S('Barnds et al. 2019, JBJS Case Connect', '10.2106/JBJS.CC.18.00133',
    'Fallbericht: beidseitige Knieverrenkung beim Krafttraining; Empfehlung, die Knie bei Beinpresse und Kniebeuge nicht einzurasten oder zu überstrecken. Hergang an der Beinpresse laut Begleitartikel der Zeitschrift.', 'abstract'),
  MACDOUGALL_1985: S('MacDougall et al. 1985, J Appl Physiol', '10.1152/jappl.1985.58.3.785',
    'Messung in der Arterie bei 5 Bodybuildern: beidbeinige Beinpresse bis zum Versagen im Mittel 320/250 mmHg.', 'abstract')
};

// Hinweise: short (eine Zeile, Ebene 1 der Box), text (ausführlich, in den Details), evidence (Schlüssel aus EVIDENCE), sources (SRC-Einträge)
const HINT = {
  pecRupture: {
    short: 'Brustmuskelriss, meist beim Absenken. Stechender Schmerz → abbrechen, abklären lassen.',
    text: 'Risse des großen Brustmuskels passieren am häufigsten beim Bankdrücken, meist in der nachgebenden Phase (beim Absenken). Plötzlicher stechender Schmerz an Brust oder Achsel: Satz abbrechen und rasch ärztlich abklären lassen – frische Risse lassen sich besser versorgen als alte.',
    evidence: ['review', 'series'], sources: [SRC.KOWALCZUK_2022, SRC.CHAN_2019]
  },
  pecRuptureDip: {
    short: 'Brustmuskelriss möglich (Einzelfälle). Stechender Schmerz → abbrechen, abklären lassen.',
    text: 'Auch beim Dip sind Risse des großen Brustmuskels beschrieben (Einzelfälle, teils mit Zusatzgewicht). Plötzlicher stechender Schmerz an Brust oder Achsel: abbrechen und abklären lassen.',
    evidence: ['case'], sources: [SRC.CAREK_1998, SRC.DASILVA_2022]
  },
  barOnNeck: {
    short: 'Hantel auf dem Hals kann ersticken: schwer nur mit Ablagen oder Sicherung.',
    text: 'Eine Langhantel, die auf den Hals drückt, kann zum Ersticken führen; solche Todesfälle sind dokumentiert. Schwere Sätze nur mit Sicherheitsablagen oder Sicherungsperson.',
    evidence: ['case'], sources: [SRC.JUMBELIC_2007]
  },
  bicepsMixedGrip: {
    short: 'Wechselgriff: Bizepssehnenrisse am Arm im Untergriff beobachtet.',
    text: 'Im Wechselgriff: In einer Videoanalyse riss die Bizepssehne beim Kreuzheben immer am Arm im Untergriff, nie am Arm im Obergriff. Das zeigt den Mechanismus, nicht wie häufig es passiert.',
    evidence: ['video'], sources: [SRC.LAPPEN_2022]
  },
  painSurvey: {
    short: 'Häufig mit Schmerzen genannt (Umfrage, keine Ursache).',
    text: 'In einer großen Umfrage unter Freizeitsportlern gehörte diese Übung zu denen, die am häufigsten mit Schmerzen genannt wurden. Das ist ein Zusammenhang, keine Ursache – Gewicht und Technik wurden nicht erfasst.',
    evidence: ['survey'], sources: [SRC.BERNSTORFF_2023]
  },
  kneeLockout: {
    short: 'Knie oben nicht einrasten oder überstrecken.',
    text: 'Knie oben nicht einrasten oder überstrecken: Beim Durchdrücken an der Beinpresse ist eine Verrenkung beider Knie beschrieben (Einzelfall, sehr schwere Last).',
    evidence: ['case'], sources: [SRC.BARNDS_2019]
  },
  pressureSpike: {
    short: 'Blutdruck steigt bei schweren Sätzen stark – bei Herz-Kreislauf-Erkrankung vorher abklären.',
    text: 'Schwere Sätze bis zum Versagen treiben den Blutdruck kurzzeitig sehr hoch (gemessen im Mittel 320/250 mmHg). Bei Bluthochdruck, Herz- oder Gefäßerkrankung vorher ärztlich abklären.',
    evidence: ['measure'], sources: [SRC.MACDOUGALL_1985]
  }
};

// Übung (Pool-ref) → Hinweise, wichtigster zuerst. Höchstens drei.
const BY_REF = {
  'bench-press-barbell': ['pecRupture', 'barOnNeck', 'painSurvey'],
  'incline-barbell-bench-press': ['barOnNeck'],
  'decline-barbell-bench-press': ['barOnNeck'],
  'close-grip-bench-press': ['barOnNeck'],
  'dips': ['pecRuptureDip', 'painSurvey'],
  'deadlift': ['bicepsMixedGrip', 'painSurvey'],
  'back-squat': ['painSurvey'],
  'leg-press': ['kneeLockout', 'pressureSpike']
};

export const WARNING_REFS = Object.keys(BY_REF);

/** Hinweise einer Pool-Übung ([] wenn kein belegtes Risiko). */
export function warningsFor(ref) {
  return (BY_REF[ref] || []).map((k) => ({ key: k, ...HINT[k] }));
}

/** Alle Quellen der Hinweise einer Übung, ohne Doppelte (Reihenfolge des ersten Auftretens). */
export function warningSources(ref) {
  const seen = new Set();
  const out = [];
  for (const w of warningsFor(ref)) for (const s of w.sources) if (!seen.has(s.url)) { seen.add(s.url); out.push(s); }
  return out;
}

export const _test = { HINT, BY_REF, SRC };
