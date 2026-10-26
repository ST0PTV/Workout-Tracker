// Startpool: Grundübungen zum Übernehmen in die eigene Bibliothek.
// Namen, Zuordnungen und Kurztexte sind selbst geschrieben; aus Quellen wurden nur Fakten übernommen.
//
// Recherche 2026-10-13 (Details und Bewertung: Drive → "Research & Sources"):
// - primary   = Hauptmuskeln (Hauptziel der Übung)
// - secondary = deutlich mitbeteiligt, auch stabilisierend (z. B. unterer Rücken bei Kniebeuge)
// - confidence: high | medium | low – wie gut die Zuordnung durch die geöffneten Quellen gestützt ist
// - basis: Art der Evidenz (MRT-Trainingsstudie > EMG > Anatomie/Modell). EMG-Aktivität ≠ Muskelwachstum.
// - others: wichtige beteiligte Muskeln außerhalb der Taxonomie (nur Anzeige)
// equipment dient nur Anzeige und Filter im Pool; es wird nicht in die Übung übernommen.
import { createExercise } from './model.js';

export const POOL_CHECKED_AT = '2026-10-13';

export const EQUIPMENT = {
  barbell: 'Langhantel',
  dumbbell: 'Kurzhantel',
  machine: 'Maschine',
  cable: 'Kabelzug',
  bodyweight: 'Körpergewicht'
};

// v2.31.0: Geräte, die man besitzt oder nicht ("Mein Equipment"). Feiner als EQUIPMENT: Körpergewichtsübungen
// brauchen oft doch etwas (Stange, Barren, Bank). Reihenfolge = Reihenfolge der Tasten.
// Körpergewicht ohne Zubehör ist immer dabei und steht deshalb nicht in der Liste.
export const GEAR = {
  barbell: 'Langhantel',
  dumbbell: 'Kurzhantel',
  cable: 'Kabelzug',
  machine: 'Kraftmaschinen',
  cardio: 'Cardiogeräte',
  bench: 'Bank / Box',
  pullbar: 'Klimmzugstange',
  dipbars: 'Dipbarren',
  band: 'Widerstandsband',
  wheel: 'Ab-Rad'
};

// Zusätzlich nötiges Zubehör je Übung (neben dem eigenen Gerät aus equipment). Zuordnung selbst vorgenommen,
// nicht aus Quellen; Übungen ohne Eintrag und ohne Gerät gehen ohne Zubehör (Boden oder Wand genügt).
const EXTRA_GEAR = {
  bench: ['bench-press-barbell', 'incline-barbell-bench-press', 'decline-barbell-bench-press', 'close-grip-bench-press',
    'ez-bar-skullcrusher', 'hip-thrust', 'incline-press-dumbbell', 'dumbbell-bench-press', 'dumbbell-fly', 'incline-prone-y-raise',
    'incline-dumbbell-curl', 'preacher-curl', 'concentration-curl', 'bulgarian-split-squat', 'dumbbell-step-up',
    'feet-elevated-push-up', 'bench-dips', 'copenhagen-plank'],
  pullbar: ['pull-up', 'chin-up', 'hanging-leg-raise'],
  dipbars: ['dips', 'l-sit', 'captains-chair-knee-raise'],
  band: ['clamshell-band'],
  wheel: ['ab-wheel-rollout'],
  barbell: ['inverted-row'], // Stange im Rack auf Hüfthöhe; mit Ringen oder TRX geht es auch (dann Filter aus)
  machine: ['back-extension-45']
};
const EXTRA_BY_REF = new Map();
for (const [gear, refs] of Object.entries(EXTRA_GEAR)) for (const r of refs) EXTRA_BY_REF.set(r, [...(EXTRA_BY_REF.get(r) || []), gear]);

// Alle Geräte, die eine Pool-Übung braucht (leer = ohne Zubehör machbar).
export function gearOf(p) {
  const own = p.kind === 'cardio' ? 'cardio' : p.equipment === 'bodyweight' ? null : p.equipment;
  return [...new Set([own, ...(EXTRA_BY_REF.get(p.ref) || [])].filter(Boolean))];
}

// Gültige Auswahl aus den Einstellungen oder null (= nichts festgelegt, alles zeigen).
export function ownedGear(settings) {
  const list = settings?.equipment;
  if (!Array.isArray(list)) return null;
  const ok = Object.keys(GEAR).filter((k) => list.includes(k));
  return ok.length ? ok : null;
}

// Passt die Übung zur Auswahl? Ohne Auswahl (null) passt alles.
export function fitsGear(p, owned) {
  return !owned || gearOf(p).every((k) => owned.includes(k));
}

export const CONFIDENCE = { high: 'hoch', medium: 'mittel', low: 'niedrig' };

// Quelle: kurze Angabe, Link (DOI oder URL), was sie für die Zuordnung zeigt (eigene Worte).
const S = (label, link, note) => ({
  label,
  url: link.startsWith('10.') ? `https://doi.org/${link}` : link,
  note
});

const P = (ref, name, equipment, primary, secondary, info, kind = 'strength') => ({
  ref, name, equipment, kind,
  muscles: { primary, secondary },
  defaultWorkSets: 3,
  verification: 'verified',
  confidence: info.confidence,
  basis: info.basis,
  note: info.note || '',
  others: info.others || [],
  involved: info.involved || null, // nur Cardio: beteiligte Muskeln zur Info (zählen nicht)
  sources: info.sources
});

// Mehrfach genutzte Quellen
const CORATELLA_2019 = S('Coratella et al. 2019, Eur J Sport Sci', '10.1080/17461391.2019.1655101', 'EMG: Schrägbank 45° aktiviert den oberen Brustanteil am stärksten; Maschinenpresse und Flachbank ähnlich für den sternalen (unteren) Anteil.');
const BERGQUIST_2018 = S('Bergquist et al. 2018, J Hum Kinet', '10.1515/hukin-2017-0137', 'EMG: Fliegende und Reverse Flys – Brust bzw. hintere Schulter als Hauptmuskel, Schulteranteile deutlich beteiligt.');
const LEHMAN_2004 = S('Lehman et al. 2004, Dyn Med', '10.1186/1476-5918-3-4', 'EMG in Haltepositionen (n = 12): Latzug mit viel Lat im Verhältnis zum Bizeps. Rudern im Sitzen: Lat und mittlerer Trapez etwas stärker. Hintere Schulter nicht gemessen.');
const SAETERBAKKEN_2015 = S('Saeterbakken et al. 2015, Int J Sports Med', '10.1055/s-0034-1398646', 'EMG: freies vorgebeugtes Rudern aktiviert den unteren Rücken deutlich stärker als Rudern an der Maschine (gemessen wurde die Muskelaktivität, nicht die Wirbelsäulenlast).');
const PLOTKIN_2023 = S('Plotkin et al. 2023, Front Physiol', '10.3389/fphys.2023.1279170', 'MRT: Hip Thrust und Kniebeuge mit ähnlichem Wachstum des großen Gesäßmuskels; Kniebeuge zusätzlich Quadrizeps und Adduktoren.');
const KINOSHITA_2026 = S('Kinoshita, Maeo et al. 2026, Med Sci Sports Exerc', '10.1249/MSS.0000000000003957', 'MRT: Beinpresse und Beinstrecker mit ähnlichem Quadrizeps-Wachstum; nur die Beinpresse auch Gesäß und Adduktor magnus, nur der Beinstrecker auch Rectus femoris.');
const MAEO_2021 = S('Maeo et al. 2021, Med Sci Sports Exerc', '10.1249/MSS.0000000000002523', 'MRT: Beinbeuger sitzend mit mehr Wachstum der Beinbeuger als liegend (+14 % vs. +9 %).');
const COLLINGS_2026 = S('Collings et al. 2026, Med Sci Sports Exerc', '10.1249/MSS.0000000000004002', 'Modell: Hüftstreck-Übungen wie Kreuzheben belasten den Adduktor magnus stark; einzelne Adduktoren je nach Übung sehr unterschiedlich.');

export const POOL = [
  // ---------- Brust ----------
  P('bench-press-barbell', 'Bankdrücken', 'barbell', ['chest'], ['triceps', 'front-delts'], {
    confidence: 'high', basis: 'EMG',
    note: 'Enger Griff verschiebt die Arbeit Richtung Trizeps und vordere Schulter.',
    sources: [
      S('Fischer et al. 2025, Sci Rep', '10.1038/s41598-025-98354-9', 'EMG: Brust, Trizeps und vordere Schulter als die arbeitenden Muskeln.'),
      S('Mausehund et al. 2022, J Strength Cond Res', '10.1519/JSC.0000000000003948', 'EMG: Griffbreite verändert die Verteilung zwischen Brust, Trizeps und vorderer Schulter.')
    ]
  }),
  P('incline-press-dumbbell', 'Schrägbankdrücken', 'dumbbell', ['chest', 'front-delts'], ['triceps'], {
    confidence: 'medium', basis: 'EMG (Langhantel/Maschine, auf Kurzhantel übertragen)',
    note: 'Bei 45° war die vordere Schulter etwa gleich stark erregt wie flach (Coratella et al. 2019, Bodybuilder).',
    sources: [
      S('Trebs et al. 2010, J Strength Cond Res', '10.1519/JSC.0b013e3181ddfae7', 'EMG: oberer Brustanteil bei 44–56° Neigung stärker aktiv, vordere Schulter ab 28° stärker.'),
      CORATELLA_2019
    ]
  }),
  P('chest-press-machine', 'Brustpresse', 'machine', ['chest'], ['triceps', 'front-delts'], {
    confidence: 'medium', basis: 'EMG',
    sources: [
      S('Muyor et al. 2023, J Hum Kinet', '10.5114/jhk/161468', 'EMG: Brustpresse sitzend und Bankdrücken mit ähnlicher Aktivierung.'),
      CORATELLA_2019
    ]
  }),
  P('pec-deck', 'Butterfly', 'machine', ['chest'], ['front-delts'], {
    confidence: 'low', basis: 'EMG (kleine Studie, isometrisch)',
    sources: [
      S('Marchetti et al. 2019, Rev Bras Pesq Ciênc Saúde', 'https://revistas.icesp.br/index.php/RBPeCS/article/view/733', 'EMG: Brust und vordere Schulter am Butterfly gemessen (10 Personen).')
    ]
  }),
  P('cable-crossover', 'Kabel-Crossover', 'cable', ['chest'], ['front-delts'], {
    confidence: 'low', basis: 'EMG verwandter Übungen, keine Studie zum Kabel-Crossover selbst',
    note: 'Kabelhöhe und Oberkörperneigung verändern die Betonung.',
    sources: [BERGQUIST_2018]
  }),
  P('dips', 'Dips', 'bodyweight', ['chest', 'triceps'], ['front-delts'], {
    confidence: 'medium', basis: 'EMG (eine Studie)',
    others: ['Serratus anterior (stabilisierend)'],
    sources: [
      S('McKenzie et al. 2022a, Int J Environ Res Public Health (Ermüdung, Barrendip)', '10.3390/ijerph192114390', 'Brust, Trizeps und vordere Schulter gelten als bewegende Muskeln. Die EMG-Werte zeigen Ermüdung, aber keinen Vergleich zwischen den Muskeln.')
    ]
  }, 'bodyweight'),
  P('push-up', 'Liegestütz', 'bodyweight', ['chest'], ['triceps', 'front-delts', 'abs'], {
    confidence: 'high', basis: 'EMG (Einzelstudie)',
    note: 'Der Bauch arbeitet stabilisierend, nicht bewegend.',
    others: ['Serratus anterior'],
    sources: [
      S('Kowalski et al. 2021, Shoulder & Elbow (Scoping Review)', '10.1177/17585732211019373', 'Review: Trizeps und Brust mit der höchsten Aktivierung im Standard-Liegestütz.'),
      S('Calatayud et al. 2014, Phys Sportsmed', '10.3810/psm.2014.11.2097', 'EMG: Beim Liegestütz arbeitete der gerade Bauchmuskel mehr als beim Bankdrücken an der Multipresse (≈ 13 % vs. ≤ 5 %). Schulter und Brust ähnlich.')
    ]
  }, 'bodyweight'),

  // v1.7 Runde 2 (Recherche 2026-10-13, Drive → Research - Exercise Pool)
  P('dumbbell-bench-press', 'Kurzhantel-Bankdrücken', 'dumbbell', ['chest'], ['front-delts', 'triceps', 'biceps'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Flachbank, Hanteln kontrolliert bis Brusthöhe absenken, Schulterblätter zusammen; leichter als Langhantel wählen.',
    sources: [
      S('Farias et al. 2017, J Strength Cond Res', '10.1519/JSC.0000000000001651', 'Kurzhantel-Bankdrücken zeigte mehr Brust-EMG als Langhantel, aber weniger Trizeps- und mehr Bizeps-Aktivität.'),
      S('Welsch et al. 2005, J Strength Cond Res', '10.1519/14513.1', 'Brust- und vordere Schulter-EMG unterschieden sich nicht zwischen Lang- und Kurzhantel-Bankdrücken; beide austauschbar.'),
      S('Saeterbakken et al. 2016, Eur J Appl Physiol', '10.1007/s00421-016-3470-3', '10-Wochen-Training: Kraftzuwachs bei Kurzhanteln stark übungsspezifisch; misst Kraft und EMG, keine Muskeldicke.')
    ]
  }),
  P('incline-barbell-bench-press', 'Schrägbankdrücken mit der Langhantel', 'barbell', ['chest', 'front-delts'], ['triceps'], {
    confidence: 'medium', basis: 'Ultraschall (B-Mode, Brustmuskel an 3 Stellen, Chaves et al. 2020; Panorama-Querschnitt direkt nach dem Training, Albarello et al. 2022) + EMG, Bank 44–45°',
    note: 'Bank ca. 30–45°. Über 45° übernimmt die vordere Schulter mehr Arbeit. Stange zur oberen Brust führen.',
    sources: [
      S('Chaves et al. 2020, Int J Exerc Sci', '10.70252/FDNB1158', '8 Wochen, Untrainierte, Multipresse 44°: obere Brust nahm am meisten zu, aber nur an 1 von 3 Messstellen (10 pro Gruppe). Kraft stieg gleich.'),
      S('Albarello et al. 2022, J Electromyogr Kinesiol', '10.1016/j.jelekin.2022.102722', 'Schräg 45°: oberer Brustanteil im EMG aktiver als der untere, flach umgekehrt. Die akute Schwellung des oberen Anteils war nach beiden etwa gleich.'),
      S('Trebs et al. 2010, J Strength Cond Res', '10.1519/JSC.0b013e3181ddfae7', 'Ab 28° steigt die Aktivität der vorderen Schulter. Der Schlüsselbeinanteil war bei 44° am aktivsten, der Brustbeinanteil flach (Multipresse).')
    ]
  }),
  P('decline-barbell-bench-press', 'Negativbankdrücken', 'barbell', ['chest'], ['triceps', 'front-delts'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Bank ca. −15°, Füße sichern. Kürzerer Weg. Unterer Brustanteil etwa wie flach, nicht stärker. Mit Spotter oder Sicherung.',
    sources: [
      S('Coratella et al. 2019, Eur J Sport Sci', '10.1080/17461391.2019.1655101', 'Bodybuilder bei −15°: unterer Brustanteil ähnlich aktiv wie flach, oberer Anteil weniger aktiv als bei Schrägbank.'),
      S('Lauver et al. 2016, Eur J Sport Sci', '10.1080/17461391.2015.1022605', 'Bei −15° war der untere Brustanteil im EMG genauso aktiv wie flach und mehr als bei 45°. Dazu wurden Trizeps und Schulter gemessen.')
    ]
  }),
  P('dumbbell-fly', 'Kurzhantel-Fliegende', 'dumbbell', ['chest'], ['front-delts', 'biceps'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Ellbogen leicht gebeugt und fixiert, in die Dehnung absenken, nicht überdehnen. Eher leichte Gewichte und mittlere Wiederholungen.',
    sources: [
      S('Solstad et al. 2020, J Sports Sci Med', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7675616/', 'Fliegende: weniger Brust-, Schulter- und Trizeps-EMG als Bankdrücken, dafür deutlich mehr Bizeps-Aktivität (vermutlich zum Halten des Ellbogens).'),
      S('Welsch et al. 2005, J Strength Cond Res', '10.1519/14513.1', 'Aktivierungshöhe von Brust und vorderer Schulter ähnlich wie beim Drücken, aber kürzere relative Aktivierungsdauer.'),
      S('Campos et al. 2020, J Hum Kinet', '10.2478/hukin-2020-0033', 'Bei Fliegenden war die vordere Schulter im EMG mäßig aktiv (ca. 19 % MVIC), seitliche und hintere Schulter kaum.')
    ]
  }),
  P('low-to-high-cable-fly', 'Kabelzug von unten nach oben', 'cable', ['chest'], ['front-delts'], {
    confidence: 'low', basis: 'Anatomie',
    note: 'Kabel unten, Arme im Bogen auf Brust- bis Kinnhöhe führen. Mehr obere Brust ist nur anatomisch begründet, nicht gemessen.',
    sources: [
      S('Solari & Burns 2023, StatPearls: Pectoralis Major', 'https://www.ncbi.nlm.nih.gov/books/NBK525991/', 'Der Schlüsselbeinanteil des großen Brustmuskels beugt den Arm im Schultergelenk nach vorn. Die Anatomie stützt die Zugrichtung nach oben.'),
      S('Reiser et al. 2014, Rev Bras Prescr Fisiol Exerc', 'https://doaj.org/article/b30da9121dea490a864f046f3ea86479', 'Fliegende auf 30°-Schrägbank (n=7): kein Unterschied der Brustanteile zu flach, aber mehr vordere Schulter.')
    ]
  }),
  P('smith-machine-incline-bench-press', 'Schrägbankdrücken an der Multipresse', 'machine', ['chest', 'front-delts'], ['triceps'], {
    confidence: 'medium', basis: 'EMG (enge Variante)',
    note: 'Bank ca. 30° so stellen, dass die Stange die obere Brust trifft. Geführte Bahn, gut für kontrolliertes Training bis nahe ans Muskelversagen.',
    sources: [
      S('Schick et al. 2010, J Strength Cond Res', '10.1519/JSC.0b013e3181cc2237', 'Flach an der Multipresse: Brust-EMG ähnlich wie mit der freien Langhantel, nur der seitliche Schultermuskel war frei aktiver.'),
      S('Rodríguez-Ridao et al. 2020, Int J Environ Res Public Health', '10.3390/ijerph17197339', 'Langhantel: oberer Brustanteil bei 30° im Mittel am aktivsten (kein deutlicher Unterschied zu flach); ab 45° ist die vordere Schulter aktiver als die Brust.')
    ]
  }),
  P('incline-machine-chest-press', 'Brustpresse schräg', 'machine', ['chest', 'front-delts'], ['triceps'], {
    confidence: 'low', basis: 'Anatomie + EMG (Freihantel-Analogie)',
    note: 'Sitz so einstellen, dass die Griffe auf Höhe der oberen Brust sind. Schultern unten lassen, kontrolliert zurückführen.',
    sources: [
      S('Trebs et al. 2010, J Strength Cond Res', '10.1519/JSC.0b013e3181ddfae7', 'Schrägdrücken an der Multipresse verlagert die Aktivität zum Schlüsselbeinanteil und zur vorderen Schulter. Auf die Maschine übertragen, aber nicht dort gemessen.'),
      S('Coratella et al. 2019, Eur J Sport Sci', '10.1080/17461391.2019.1655101', 'Die horizontale Brustpresse aktivierte den oberen Brustanteil weniger als alle freien Bankvarianten.')
    ]
  }),
  P('feet-elevated-push-up', 'Liegestütz mit erhöhten Füßen', 'bodyweight', ['chest'], ['triceps', 'front-delts', 'abs'], {
    confidence: 'low', basis: 'EMG (Standard-Liegestütz) + Modell',
    note: 'Füße auf Bank oder Stufe (ca. 30–50 cm), Körper gerade halten. Schwerer als der normale Liegestütz.',
    others: ['serratus anterior'],
    sources: [
      S('Kowalski et al. 2021, Shoulder & Elbow (Scoping Review)', '10.1177/17585732211019373', 'Übersicht: Trizeps und großer Brustmuskel haben beim Standard-Liegestütz die höchste EMG, der Serratus ist ebenfalls stark beteiligt.'),
      S('Wu et al. 2025, Sci Rep', '10.1038/s41598-025-28012-7', 'Bei 10–30° Fußerhöhung lag die Bodenreaktionskraft unter den Händen bei ca. 77–86 % des Körpergewichts. Keine EMG-Messung.')
    ]
  }, 'bodyweight'),

  // ---------- Schultern ----------
  P('shoulder-press-dumbbell', 'Schulterdrücken', 'dumbbell', ['front-delts'], ['side-delts', 'triceps'], {
    confidence: 'medium', basis: 'EMG',
    others: ['Serratus anterior'],
    sources: [
      S('Saeterbakken & Fimland 2013, J Strength Cond Res', '10.1519/JSC.0b013e318276b873', 'EMG: alle Schulteranteile und Trizeps beim Schulterdrücken aktiv; sitzend weniger seitliche Schulter als stehend.'),
      S('Kohler et al. 2010, J Strength Cond Res', '10.1519/JSC.0b013e3181c8655a', 'EMG: vordere und seitliche Schulter sowie Trizeps als Hauptbeweger.')
    ]
  }),
  P('lateral-raise-dumbbell', 'Seitheben', 'dumbbell', ['side-delts'], ['rear-delts', 'upper-back', 'front-delts'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Daumen nach oben → mehr vordere Schulter; Daumen nach unten → mehr hintere Schulter.',
    others: ['Supraspinatus (Rotatorenmanschette)'],
    sources: [
      S('Coratella et al. 2020, Int J Environ Res Public Health', '10.3390/ijerph17176015', 'EMG: Mit Daumen nach vorn seitliche und hintere Schulter etwa gleich stark; Daumen nach oben mehr vordere, Daumen nach unten mehr hintere Schulter.')
    ]
  }),
  P('reverse-pec-deck', 'Reverse Butterfly', 'machine', ['rear-delts'], ['upper-back', 'side-delts'], {
    confidence: 'medium', basis: 'EMG',
    others: ['Infraspinatus (Rotatorenmanschette)'],
    sources: [
      S('Schoenfeld et al. 2013, J Strength Cond Res', '10.1519/JSC.0b013e318281e1e9', 'EMG an der Reverse-Fly-Maschine: hintere und seitliche Schulter sowie Infraspinatus aktiv; Trapez nicht gemessen. Neutraler Griff: Infraspinatus deutlich mehr.'),
      BERGQUIST_2018
    ]
  }),
  P('face-pull', 'Face Pull', 'cable', ['rear-delts', 'upper-back'], [], {
    confidence: 'low', basis: 'Modell und verwandte Übung, keine EMG-Studie zum Face Pull',
    others: ['Infraspinatus, Teres minor (Rotatorenmanschette)'],
    sources: [
      S('Zhu et al. 2026, Acta Bioeng Biomech', '10.37190/abb/217836', 'Modell: Kraft der hinteren Schulter beim Face Pull ähnlich wie beim vorgebeugten Seitheben.'),
      S('Fukunaga et al. 2022, IJSPT', '10.26603/001c.33026', 'EMG der verwandten Übung Band Pull-Apart: hintere Schulter, Trapez und Infraspinatus aktiv.')
    ]
  }),

  // v1.5 Runde 1 (Recherche 2026-10-13, Drive → Research - Exercise Pool)
  P('cable-lateral-raise', 'Seitheben am Kabel', 'cable', ['side-delts'], ['front-delts', 'rear-delts', 'upper-back'], {
    confidence: 'high', basis: 'Ultraschall (Wachstum) + EMG',
    note: 'Rolle etwa auf Handhöhe, Zug von vorne-unten oder hinter dem Körper; Arm bis ca. Schulterhöhe, kontrolliert absenken.',
    others: ['Supraspinatus (Rotatorenmanschette)'],
    sources: [
      S('Larsen et al. 2025, Front Physiol', '10.3389/fphys.2025.1611468', '8 Wochen, ein Arm Kabel, ein Arm Kurzhantel: Seitliche Deltamuskeldicke (Ultraschall) wuchs bei beiden etwa gleich stark.'),
      S('Campos et al. 2020, J Hum Kinet', '10.2478/hukin-2020-0033', 'EMG (Kurzhantel): Beim Seitheben war der mittlere Delta am aktivsten, der hintere Delta deutlich mit – mehr als bei allen anderen getesteten Übungen.'),
      S('Andersen et al. 2008, Phys Ther', '10.2522/ptj.20070304', 'EMG: Seitheben bringt neben dem Deltamuskel eine sehr hohe Aktivität im oberen Trapezius.')
    ]
  }),
  P('machine-lateral-raise', 'Seitheben an der Maschine', 'machine', ['side-delts'], ['front-delts', 'rear-delts', 'upper-back'], {
    confidence: 'medium', basis: 'Ultraschall + EMG naher Varianten',
    note: 'Drehpunkt auf Höhe des Schultergelenks einstellen; Polster am Unterarm/Ellbogen, Schultern unten lassen.',
    others: ['Supraspinatus (Rotatorenmanschette)'],
    sources: [
      S('Larsen et al. 2025, Front Physiol', '10.3389/fphys.2025.1611468', 'Kabel und Kurzhantel lassen den seitlichen Delta gleich gut wachsen; das Lastprofil scheint zweitrangig (Maschine nicht getestet).'),
      S('Coratella et al. 2020, Int J Environ Res Public Health', '10.3390/ijerph17176015', 'EMG bei Bodybuildern: Seitheben-Varianten aktivieren v. a. mittleren Delta; gebeugter Ellbogen senkt dessen Aktivität beim Anheben deutlich.')
    ]
  }),
  P('standing-barbell-overhead-press', 'Schulterdrücken mit der Langhantel stehend', 'barbell', ['front-delts'], ['side-delts', 'triceps', 'upper-back', 'abs', 'lower-back'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Stange vom Schlüsselbein senkrecht über den Kopf, Kopf kurz zurück; Gesäß und Bauch fest, kein Hohlkreuz.',
    others: ['Serratus anterior'],
    sources: [
      S('Saeterbakken & Fimland 2013, J Strength Cond Res', '10.1519/JSC.0b013e318276b873', 'EMG: Stehend mehr Aktivität im hinteren Delta als sitzend, im mittleren nur als Tendenz. Stehend mit Langhantel mehr Trizeps, mit Kurzhanteln mehr vorderer Delta.'),
      S('Campos et al. 2020, J Hum Kinet', '10.2478/hukin-2020-0033', 'EMG (sitzend, nur oberer Teil der Bewegung): Schulterdrücken aktivierte den vorderen Delta am stärksten und den mittleren Delta ähnlich stark wie Seitheben.'),
      S('Williams et al. 2020, J Strength Cond Res', '10.1519/JSC.0000000000002660', 'EMG, stehendes Drücken (50 % 1RM): Schultern, Trizeps, Rumpf aktiv. Werte auf ruhiges Stehen bezogen, daher keine Rangfolge der Muskeln.')
    ]
  }),
  P('machine-shoulder-press', 'Schulterdrücken an der Maschine', 'machine', ['front-delts'], ['side-delts', 'triceps', 'upper-back'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Sitz so einstellen, dass Griffe auf Schulterhöhe starten; Rücken an der Lehne, nicht ganz durchstrecken.',
    others: ['Serratus anterior'],
    sources: [
      S('Kim et al. 2026, J Clin Med', '10.3390/jcm15103925', 'EMG am Maschinen-Schulterdrücken: Deltamuskel, Trizeps und oberer Trapezius aktiv; Fokus auf Zielmuskel erhöht dessen Aktivität.'),
      S('Saeterbakken & Fimland 2013, J Strength Cond Res', '10.1519/JSC.0b013e318276b873', 'EMG: Im Sitzen war die Deltaaktivität geringer als im Stehen. Mehr Last war sitzend nur mit Kurzhanteln möglich. Maschinen wurden nicht getestet.')
    ]
  }),
  P('dumbbell-front-raise', 'Frontheben', 'dumbbell', ['front-delts'], ['chest', 'upper-back'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Kurzhanteln mit leicht gebeugtem Ellbogen bis Schulterhöhe heben; nicht schwingen. Auch am Kabel möglich.',
    sources: [
      S('Coratella et al. 2020, Int J Environ Res Public Health', '10.3390/ijerph17176015', 'EMG: Frontheben aktiviert vorderen Delta und oberen Brustmuskel stärker als alle Seitheben-Varianten; mittlerer/hinterer Delta gering.'),
      S('Elzanie & Varacallo 2024, StatPearls', 'https://www.ncbi.nlm.nih.gov/books/NBK537056/', 'Anatomie: Vorderer Delta beugt den Arm gemeinsam mit dem großen Brustmuskel.')
    ]
  }),
  P('barbell-upright-row', 'Aufrechtes Rudern', 'barbell', ['side-delts', 'upper-back'], ['front-delts', 'rear-delts', 'biceps', 'forearms'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Griff schulterbreit oder breiter; Ellbogen führen. Stange bis zum unteren Brustbein, Oberarm unter der Waagerechten. Auch am Kabel.',
    sources: [
      S('McAllister et al. 2013, J Strength Cond Res', '10.1519/JSC.0b013e31824f23ad', 'EMG: Breiterer Griff erhöht Aktivität von Delta und Trapezius und senkt die Bizepsaktivität.'),
      S('Andersen et al. 2008, Phys Ther', '10.2522/ptj.20070304', 'EMG: Aufrechtes Rudern mit Kurzhanteln aktiviert Trapezius und Deltamuskel hoch, mit relativ geringer Last.')
    ]
  }),
  P('dumbbell-reverse-fly', 'Vorgebeugtes Seitheben', 'dumbbell', ['rear-delts'], ['upper-back', 'side-delts'], {
    confidence: 'medium', basis: 'EMG + Modell',
    note: 'Oberkörper fast waagrecht oder Brust auf Schrägbank; Arme seitlich nach außen öffnen, Schultern nicht hochziehen.',
    others: ['Infraspinatus', 'Teres minor'],
    sources: [
      S('Andersen et al. 2008, Phys Ther', '10.2522/ptj.20070304', 'EMG: Reverse Flys aktivieren den hinteren und mittleren Deltamuskel sehr hoch, den oberen Trapezius mittel bis hoch.'),
      S('Zhu et al. 2026, Acta Bioeng Biomech', '10.37190/abb/217836', 'Muskelmodell (OpenSim): Vorgebeugtes Seitheben erzeugt hohe Kraft im hinteren Delta, ähnlich Face Pull, mehr als Rudern.')
    ]
  }),
  P('cable-reverse-fly', 'Reverse Fly am Kabel', 'cable', ['rear-delts'], ['upper-back', 'side-delts'], {
    confidence: 'medium', basis: 'EMG naher Variante + Anatomie',
    note: 'Kabel über Kreuz auf Schulterhöhe greifen, Arme fast gestreckt nach außen-hinten ziehen; neutraler Griff möglich.',
    others: ['Infraspinatus', 'Teres minor'],
    sources: [
      S('Schoenfeld et al. 2013, J Strength Cond Res', '10.1519/JSC.0b013e318281e1e9', 'EMG an der Reverse-Fly-Maschine: neutraler Griff steigert Aktivität von hinterem Delta und Infraspinatus. Trapez und Rhomboideus nicht gemessen.'),
      S('Rabello et al. 2022, J Bodyw Mov Ther (Review)', '10.1016/j.jbmt.2022.12.002', 'Übersicht (EMG): Beim Reverse Fly (Kurzhantel, Band) war der mittlere Delta etwa so aktiv wie der hintere. Kabel nicht untersucht.')
    ]
  }),
  P('incline-prone-y-raise', 'Y-Raise auf der Schrägbank', 'dumbbell', ['upper-back'], ['side-delts', 'rear-delts', 'front-delts'], {
    confidence: 'medium', basis: 'EMG (Trapezius) + Anatomie (Delta)',
    note: 'Brust auf Schrägbank, leichte Hanteln in Y-Form schräg über den Kopf heben, Daumen nach oben; Schultern tief.',
    others: ['Serratus anterior', 'unterer Trapezius (Schwerpunkt)'],
    sources: [
      S('Ekstrom et al. 2003, J Orthop Sports Phys Ther', '10.2519/jospt.2003.33.5.247', 'EMG: Bäuchlings-Armheben über Kopf in Faserrichtung des unteren Trapezius aktiviert diesen maximal, auch mittleren Trapezius stark.'),
      S('Elzanie & Varacallo 2024, StatPearls', 'https://www.ncbi.nlm.nih.gov/books/NBK537056/', 'Anatomie: Mittlerer Delta trägt die Abduktion, vorderer/hinterer Anteil stabilisieren; Delta-Beteiligung hier nur abgeleitet.')
    ]
  }),

  // ---------- Rücken ----------
  P('pull-up', 'Klimmzug', 'bodyweight', ['lats'], ['biceps', 'upper-back'], {
    confidence: 'high', basis: 'EMG, Modell',
    note: 'Untergriff (Chin-up) → mehr Bizeps.',
    others: ['Teres major'],
    sources: [
      S('Youdas et al. 2010, J Strength Cond Res', '10.1519/JSC.0b013e3181f1598c', 'EMG: Latissimus am stärksten. Bizeps und Infraspinatus etwa gleich hoch, unterer Trapez deutlich, aber niedriger.'),
      S('Urbanczyk et al. 2020, Scand J Med Sci Sports', '10.1111/sms.13780', 'Modell: breiter Griff betont den Latissimus, enger Griff mehr Armbeuger.')
    ]
  }, 'bodyweight'),
  P('lat-pulldown', 'Latzug', 'cable', ['lats'], ['biceps', 'upper-back', 'rear-delts'], {
    confidence: 'high', basis: 'EMG',
    others: ['Teres major'],
    sources: [
      LEHMAN_2004,
      S('Padovan et al. 2024, J Hum Kinet', '10.5114/jhk/185211', 'EMG: Latissimus, mittlerer Trapez, hintere Schulter und Bizeps als Hauptbeweger.')
    ]
  }),
  P('barbell-row', 'Langhantelrudern', 'barbell', ['lats', 'upper-back'], ['rear-delts', 'biceps', 'lower-back'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Der untere Rücken hält die vorgebeugte Position und ist dabei stark gefordert.',
    others: ['Teres major'],
    sources: [
      S('Fenwick, Brown & McGill 2009, J Strength Cond Res', '10.1519/JSC.0b013e3181b07334', 'EMG: hohe Aktivierung der Rückenstrecker von der Brust- bis zur Lendenwirbelsäule und des Latissimus; höchste geschätzte Last auf die Lendenwirbelsäule.'),
      SAETERBAKKEN_2015
    ]
  }),
  P('seated-cable-row', 'Rudern am Kabel', 'cable', ['upper-back', 'lats'], ['rear-delts', 'biceps'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Ellbogen eng → mehr Latissimus; Ellbogen weit → mehr oberer Rücken und hintere Schulter.',
    sources: [
      LEHMAN_2004,
      S('Padovan et al. 2025, J Funct Morphol Kinesiol', '10.3390/jfmk11010006', 'EMG: Trapez, Latissimus, hintere Schulter und Bizeps als arbeitende Muskeln.')
    ]
  }),
  P('chest-supported-row', 'Brustgestütztes Rudern', 'machine', ['upper-back', 'lats'], ['rear-delts', 'biceps'], {
    confidence: 'low', basis: 'EMG verwandter Übungen (liegendes Rudern), keine Studie zur Maschine selbst',
    sources: [
      S('Fischer et al. 2025, J Electromyogr Kinesiol', '10.1016/j.jelekin.2025.103025', 'EMG beim Langhantelrudern in Bauchlage (nur Männer): mittlerer Trapez am aktivsten, dann hintere Schulter, dann Latissimus, Bizeps am wenigsten.'),
      SAETERBAKKEN_2015
    ]
  }),
  P('deadlift', 'Kreuzheben', 'barbell', ['glutes', 'hamstrings', 'lower-back'], ['quads', 'adductors', 'upper-back', 'forearms'], {
    confidence: 'medium', basis: 'EMG (Review), Modell',
    note: 'Der Quadrizeps ist laut EMG oft stark aktiv, vor allem beim Abheben; die Rangfolge der Hauptmuskeln ist umstritten.',
    sources: [
      S('Martín-Fuentes et al. 2020, PLoS One (Systematic Review)', '10.1371/journal.pone.0229507', 'Review: unterer Rücken und Quadrizeps oft stärker aktiv als Gesäß und Beinbeuger; große Unterschiede zwischen Studien.'),
      S('Escamilla et al. 2002, Med Sci Sports Exerc', '10.1097/00005768-200204000-00019', 'EMG: Quadrizeps, Gesäß, Beinbeuger, Rückenstrecker, Trapez, Waden und Adduktoren tragen bei.'),
      S('Krings et al. 2021, J Strength Cond Res', '10.1519/JSC.0000000000002954', 'Mit dickem Griff (5,6 cm) sank das 1RM im Kreuzheben um etwa 41 %. Der Griff kann also begrenzen. Unterarm- und Trapezwerte für das Kreuzheben wurden nicht berichtet.')
    ]
  }),

  // v1.7 Runde 2 (Recherche 2026-10-13, Drive → Research - Exercise Pool)
  P('chin-up', 'Klimmzug im Untergriff', 'bodyweight', ['lats', 'biceps'], ['upper-back', 'chest', 'rear-delts', 'abs', 'forearms'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Untergriff schulterbreit, aus vollem Hang bis Kinn über Stange. Zu schwer: Band oder Latzug im Untergriff.',
    others: ['Infraspinatus', 'Erector spinae'],
    sources: [
      S('Youdas et al. 2010, J Strength Cond Res', '10.1519/JSC.0b013e3181f1598c', 'EMG: Lat bei allen Varianten am stärksten aktiv. Im Untergriff mehr Bizeps und Brust, im Obergriff mehr unterer Trapezius.'),
      S('Di Fonza et al. 2026, J Funct Morphol Kinesiol (Review)', '10.3390/jfmk11030315', 'Narrative EMG-Übersicht: Griffrichtung beeinflusst Bizeps stärker als Griffbreite, Lat-Aktivität bleibt über Griffvarianten ähnlich.')
    ]
  }, 'bodyweight'),
  P('close-grip-lat-pulldown', 'Latzug eng/neutral', 'cable', ['lats'], ['biceps', 'upper-back', 'rear-delts', 'forearms'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Enger oder Parallelgriff, Stange vor dem Kopf zur oberen Brust ziehen, Oberkörper leicht zurückgelehnt.',
    others: ['Teres major', 'Infraspinatus'],
    sources: [
      S('Andersen et al. 2014, J Strength Cond Res', '10.1097/JSC.0000000000000232', 'EMG bei 6RM: Lat, Trapezius ähnlich aktiv bei enger, mittlerer und weiter Griffbreite. Bizeps tendenziell mehr bei mittlerem Griff.'),
      S('Lusk et al. 2010, J Strength Cond Res', '10.1519/JSC.0b013e3181ddb0ab', 'EMG: Obergriff aktiviert den Lat stärker als Untergriff, unabhängig von der Griffbreite. Neutralgriff wurde nicht getestet.')
    ]
  }),
  P('one-arm-dumbbell-row', 'Kurzhantelrudern einarmig', 'dumbbell', ['lats', 'upper-back'], ['rear-delts', 'biceps', 'forearms', 'obliques', 'lower-back'], {
    confidence: 'low', basis: 'Anatomie + EMG (Variante)',
    note: 'Knie und Hand auf der Bank abstützen, Ellbogen nah am Körper zur Hüfte ziehen, Rumpf nicht verdrehen.',
    others: ['Teres major'],
    sources: [
      S('Jeno & Varacallo 2023, StatPearls: Latissimus Dorsi', 'https://www.ncbi.nlm.nih.gov/books/NBK448120/', 'Anatomie: Der Lat streckt, adduziert und dreht den Oberarm nach innen, zusammen mit Teres major und Pectoralis major.'),
      S('Fenwick, Brown & McGill 2009, J Strength Cond Res', '10.1519/JSC.0b013e3181b07334', 'EMG: Einarmiges Kabelrudern im Stand fordert den Rumpf gegen Verdrehen. Schräge Bauchmuskeln aktiver als beidarmig, aber insgesamt niedrig.')
    ]
  }),
  P('t-bar-row', 'T-Bar-Rudern', 'barbell', ['lats', 'upper-back'], ['rear-delts', 'biceps', 'lower-back', 'forearms', 'glutes', 'hamstrings'], {
    confidence: 'low', basis: 'Anatomie + EMG (Variante)',
    note: 'Rücken neutral, Oberkörper ca. 45° vorgebeugt. Mit Brustauflage-Variante wird der untere Rücken entlastet.',
    others: ['Teres major', 'Erector spinae'],
    sources: [
      S('Fenwick, Brown & McGill 2009, J Strength Cond Res', '10.1519/JSC.0b013e3181b07334', 'EMG beim vorgebeugten Rudern: Rückenstrecker von der Brust- bis zur Lendenwirbelsäule und Latissimus stark aktiv; höchste geschätzte Last auf die Lendenwirbelsäule.'),
      S('Jeno & Varacallo 2023, StatPearls: Latissimus Dorsi', 'https://www.ncbi.nlm.nih.gov/books/NBK448120/', 'Anatomie: Der Lat ist der Hauptstrecker und Adduktor des Oberarms. Er wirkt am stärksten aus gebeugter oder abgespreizter Ausgangsstellung.')
    ]
  }),
  P('machine-row', 'Rudern an der Maschine', 'machine', ['lats', 'upper-back'], ['rear-delts', 'biceps', 'forearms'], {
    confidence: 'low', basis: 'EMG (Variante: Kabel) + Anatomie',
    note: 'Brust an Polster. Enger Griff, Ellbogen nah am Körper eher für den Lat. Weit, Ellbogen hoch eher für den oberen Rücken.',
    others: ['Teres major'],
    sources: [
      S('Di Fonza et al. 2026, J Funct Morphol Kinesiol (Review)', '10.3390/jfmk11030315', 'Studien am sitzenden Kabelrudern: enger Griff, wenig Abspreizung mehr Lat-EMG. Weiter, hoher Ellbogen mehr Trapezius, hinterer Delta.'),
      S('Jeno & Varacallo 2023, StatPearls: Latissimus Dorsi', 'https://www.ncbi.nlm.nih.gov/books/NBK448120/', 'Anatomie: Lat-Funktionen (Extension, Adduktion, Innenrotation) erklären, warum ein körpernaher Zug den Lat stärker einbindet.')
    ]
  }),
  P('straight-arm-pulldown', 'Überzüge am Kabel', 'cable', ['lats'], ['triceps', 'chest', 'rear-delts', 'abs'], {
    confidence: 'low', basis: 'EMG (Review) + Anatomie',
    note: 'Arme fast gestreckt, Seil oder Stange im Bogen bis zu den Oberschenkeln führen, Schultern unten halten.',
    others: ['Teres major', 'Trizeps langer Kopf'],
    sources: [
      S('Di Fonza et al. 2026, J Funct Morphol Kinesiol (Review)', '10.3390/jfmk11030315', 'Review: Lang-Pullover am Boden aktiviert eher die Brust. Gegenüber Straight-Arm-Pulldown kaum Unterschied bei Lat und Trizeps.'),
      S('Jeno & Varacallo 2023, StatPearls: Latissimus Dorsi', 'https://www.ncbi.nlm.nih.gov/books/NBK448120/', 'Anatomie: Der Lat streckt den Oberarm, am stärksten aus gebeugter Schulter. Das ist die Kernbewegung beim Überzug.')
    ]
  }),
  P('inverted-row', 'Rudern im Hang', 'bodyweight', ['lats', 'upper-back'], ['rear-delts', 'biceps', 'lower-back', 'abs', 'glutes'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Unter Stange oder Ringen, Körper gestreckt, Brust zur Stange ziehen. Steiler Körper ist leichter, Füße erhöht ist schwerer.',
    others: ['Multifidus', 'Erector spinae', 'Infraspinatus'],
    sources: [
      S('Youdas et al. 2016, J Strength Cond Res', '10.1519/JSC.0000000000001210', 'EMG: Hinterer Delta, Bizeps, Lat und unterer Trapezius sehr hoch aktiv, oberer Trapezius hoch, mittlerer Trapezius mittel bis hoch. Im Untergriff war der Lat aktiver.'),
      S('Fenwick, Brown & McGill 2009, J Strength Cond Res', '10.1519/JSC.0b013e3181b07334', 'EMG, Knie gebeugt (n = 7): Lat und oberer Rückenstrecker teils höher als vorgebeugt, Beinbeuger höher, Bauchmuskeln kaum gefordert. Geschätzte LWS-Last am niedrigsten.')
    ]
  }, 'bodyweight'),
  P('dumbbell-shrug', 'Shrugs', 'dumbbell', ['upper-back'], ['forearms'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Schultern gerade nach oben zu den Ohren ziehen, kurz halten, langsam senken. Nicht kreisen. Auch mit Langhantel möglich.',
    others: ['Levator scapulae', 'Serratus anterior'],
    sources: [
      S('Pizzari et al. 2014, Clin Biomech', '10.1016/j.clinbiomech.2013.11.011', 'EMG: Shrugs aktivieren den oberen Trapezius. Mit 30° abgespreizten Armen stärker als beim Standard-Shrug.'),
      S('Jakobsen et al. 2012, J Strength Cond Res', '10.1519/JSC.0b013e31823f29d9', 'EMG bei Anfängerinnen (15RM): Shrugs Teil eines Schulterprogramms mit überwiegend hoher Trapezius-Aktivität und Ermüdung im Satz.')
    ]
  }),

  // ---------- Beine ----------
  P('back-squat', 'Kniebeuge', 'barbell', ['quads', 'glutes', 'adductors'], ['lower-back'], {
    confidence: 'high', basis: 'MRT-Trainingsstudien; unterer Rücken nur EMG',
    note: 'Tiefe Kniebeugen mit mehr Wachstum von Gesäß und Adduktoren. Der untere Rücken stabilisiert.',
    sources: [
      S('Kubo et al. 2019, Eur J Appl Physiol', '10.1007/s00421-019-04181-y', 'MRT: Kniebeugen ließen Quadrizeps (ohne Rectus femoris), Adduktoren und großen Gesäßmuskel wachsen, die Beinbeuger nicht.'),
      PLOTKIN_2023,
      S('Park et al. 2022, IJERPH', '10.3390/ijerph192013480', 'EMG: Aktivität des Rückenstreckers steigt mit der Last.')
    ]
  }),
  P('leg-press', 'Beinpresse', 'machine', ['quads', 'glutes'], ['adductors'], {
    confidence: 'high', basis: 'MRT-Trainingsstudie',
    note: 'Fußposition und Tiefe verändern den Gesäß- und Adduktorenanteil.',
    sources: [
      KINOSHITA_2026,
      S('Wilk et al. 1996, Am J Sports Med', '10.1177/036354659602400418', 'EMG: kaum Beinbeuger-Aktivität in der Beinpresse.')
    ]
  }),
  P('hack-squat', 'Hack Squat', 'machine', ['quads'], ['glutes'], {
    confidence: 'low', basis: 'EMG (eine kleine Studie)',
    sources: [
      S('Hesari et al. 2012, Sport Sciences and Health Research', 'https://journal.ut.ac.ir/article_24964.html', 'EMG: äußerer und innerer Quadrizepsanteil im Hack Squat stärker aktiv als in der Beinpresse.')
    ]
  }),
  P('bulgarian-split-squat', 'Bulgarian Split Squat', 'dumbbell', ['quads', 'glutes'], [], {
    confidence: 'medium', basis: 'EMG',
    note: 'Oberkörper nach vorne geneigt → mehr Gesäß und Beinbeuger. Adduktoren wurden in keiner gefundenen Studie gemessen.',
    sources: [
      S('Aygun-Polat et al. 2025, BMC Sports Sci Med Rehabil', '10.1186/s13102-025-01306-z', 'EMG: Vorneigung erhöht die Aktivität von Gesäß, Beinbeugern und Rectus femoris.'),
      S('Topçu et al. 2025, Sci Rep', '10.1038/s41598-025-32203-7', 'EMG: Quadrizeps, Beinbeuger und Gesäß aktiv, stärker in der Aufwärtsbewegung.')
    ]
  }),
  P('romanian-deadlift', 'Rumänisches Kreuzheben', 'barbell', ['hamstrings', 'glutes'], ['lower-back', 'adductors'], {
    confidence: 'high', basis: 'EMG, Ultraschall-Trainingsstudie (gestrecktes Kreuzheben), Modell',
    sources: [
      S('Coratella et al. 2022, IJERPH', '10.3390/ijerph19031903', 'EMG: hohe Aktivierung von Gesäß, Beinbeugern und Rückenstrecker.'),
      S('Morin et al. 2025, J Strength Cond Res', '10.1519/JSC.0000000000005159', 'Ultraschall: 9 Wochen gestrecktes Kreuzheben ließen die Beinbeuger wachsen.'),
      COLLINGS_2026
    ]
  }),
  P('hip-thrust', 'Hip Thrust', 'barbell', ['glutes'], [], {
    confidence: 'high', basis: 'MRT-Trainingsstudie, EMG',
    note: 'Höhere Gesäß-Aktivität im EMG führte nicht zu mehr Wachstum als bei Kniebeugen.',
    sources: [
      PLOTKIN_2023,
      S('Contreras et al. 2015, J Appl Biomech', '10.1123/jab.2014-0301', 'EMG: mehr Gesäß-Aktivität als bei Kniebeugen; Beinbeuger mittel.')
    ]
  }),
  P('leg-extension', 'Beinstrecker', 'machine', ['quads'], [], {
    confidence: 'high', basis: 'MRT-Trainingsstudien',
    note: 'Trainiert auch den Rectus femoris, den Kniebeuge und Beinpresse kaum wachsen lassen.',
    sources: [
      KINOSHITA_2026,
      S('Lundberg et al. 2019, Appl Physiol Nutr Metab', '10.1139/apnm-2018-0774', 'MRT: Kniestreck-Training ließ alle Quadrizepsanteile wachsen, den Rectus femoris am stärksten.')
    ]
  }),
  P('lying-leg-curl', 'Beinbeuger liegend', 'machine', ['hamstrings'], [], {
    confidence: 'high', basis: 'MRT-Trainingsstudie',
    note: 'Die Wade arbeitet mit, ein Wachstumsreiz für sie ist aber nicht belegt.',
    sources: [
      MAEO_2021,
      S('Marchetti et al. 2021, J Strength Cond Res', '10.1519/JSC.0000000000003333', 'EMG: Wadenaktivität beim liegenden Beinbeugen hängt von Knie- und Fußstellung ab.')
    ]
  }),
  P('seated-leg-curl', 'Beinbeuger sitzend', 'machine', ['hamstrings'], [], {
    confidence: 'high', basis: 'MRT-Trainingsstudie',
    note: 'Durch die gebeugte Hüfte arbeiten die Beinbeuger in längerer Position.',
    sources: [MAEO_2021]
  }),
  P('hip-adduction-machine', 'Adduktoren-Maschine', 'machine', ['adductors'], [], {
    confidence: 'medium', basis: 'Anatomie, Modell; keine Studie zur Maschine selbst',
    sources: [
      S('StatPearls: Thigh Adductor Magnus Muscle', 'https://www.statpearls.com/point-of-care/17186', 'Anatomie: beide Anteile des Adduktor magnus führen den Oberschenkel heran.'),
      COLLINGS_2026
    ]
  }),
  P('hip-abduction-machine', 'Abduktoren-Maschine', 'machine', ['abductors'], [], {
    confidence: 'medium', basis: 'EMG, Anatomie',
    note: 'Ob die oberen Fasern des großen Gesäßmuskels relevant mitarbeiten, ist nicht belegt.',
    sources: [
      S('de Almeida Paz et al. 2022, J Bodyw Mov Ther', '10.1016/j.jbmt.2022.01.001', 'EMG: Gluteus medius an der Maschine stärker aktiv als der Tensor fasciae latae.'),
      S('StatPearls: Gluteus Medius Muscle', 'https://www.statpearls.com/point-of-care/22326', 'Anatomie: Gluteus medius ist der wichtigste Abduktor der Hüfte.')
    ]
  }),
  P('standing-calf-raise', 'Wadenheben stehend', 'machine', ['calves'], [], {
    confidence: 'high', basis: 'MRT-Trainingsstudie',
    note: 'Stehend wächst vor allem der Gastrocnemius; sitzend fast nur der Soleus.',
    sources: [
      S('Kinoshita et al. 2023, Front Physiol', '10.3389/fphys.2023.1272106', 'MRT: Wadenheben stehend ließ beide Gastrocnemius-Köpfe und den Soleus wachsen.')
    ]
  }),

  // v1.5 Runde 1 (Recherche 2026-10-13, Drive → Research - Exercise Pool)
  P('seated-calf-raise', 'Wadenheben sitzend', 'machine', ['calves'], [], {
    confidence: 'high', basis: 'MRT',
    note: 'Knie 90° gebeugt: trainiert v. a. den Soleus. Volle Dehnung unten. Den Gastrocnemius mit stehendem Wadenheben ergänzen.',
    others: ['Soleus (Schwerpunkt)'],
    sources: [
      S('Kinoshita et al. 2023, Front Physiol', '10.3389/fphys.2023.1272106', 'MRT nach 12 Wo.: sitzend wuchs der Soleus ähnlich wie stehend, der Gastrocnemius sitzend aber kaum (ca. 1 % vs. 9–12 %).'),
      S('Avancini et al. 2015, PLoS One', '10.1371/journal.pone.0126888', 'Bei 90° Kniebeugung war das EMG des inneren Gastrocnemius im Mittel etwa 5-mal kleiner als bei gestrecktem Knie (isometrisch).')
    ]
  }),
  P('leg-press-calf-raise', 'Wadenheben an der Beinpresse', 'machine', ['calves'], [], {
    confidence: 'high', basis: 'Ultraschall',
    note: 'Knie fast gestreckt, nur Fußballen auf der Platte. Volle Dehnung. Fußstellung (innen/außen) verschiebt den Schwerpunkt leicht.',
    others: ['Gastrocnemius und Soleus'],
    sources: [
      S('Nunes et al. 2020, J Strength Cond Res', '10.1519/JSC.0000000000003674', '9 Wo. einbeiniges Wadenheben an der Beinpresse: Gastrocnemius dicker; Fuß außen eher innerer, Fuß innen eher äußerer Kopf (Ultraschall).')
    ]
  }),
  P('single-leg-calf-raise', 'Wadenheben einbeinig', 'bodyweight', ['calves'], [], {
    confidence: 'medium', basis: 'Ultraschall (enge Variante) + EMG',
    note: 'Auf einer Stufe, Ferse tief absenken. Kurzhantel in der freien Hand als Steigerung, an der Wand festhalten.',
    others: ['Gastrocnemius und Soleus', 'Fußstabilisatoren'],
    sources: [
      S('Larsen et al. 2025, Eur J Sport Sci', '10.1002/ejsc.70030', 'Einbeiniges Wadenheben (Multipresse) bis zum Versagen: innerer Gastrocnemius wurde dicker; Teilwdh. in der Dehnung mind. gleich gut.'),
      S('Sara et al. 2021, PLoS One', '10.1371/journal.pone.0253276', 'Einbeiniges Fersenheben bis zur Erschöpfung ermüdet Gastrocnemius und Soleus deutlich (EMG).')
    ]
  }),
  P('cable-hip-abduction-standing', 'Abduktion am Kabel stehend', 'cable', ['abductors'], ['glutes'], {
    confidence: 'medium', basis: 'EMG (Variante: Gummiband) + Anatomie',
    note: 'Manschette am Knöchel, Oberkörper aufrecht, Bein seitlich ohne Hüftkippen führen. Standbein stabilisiert mit.',
    sources: [
      S('Brandt et al. 2013, Int J Sports Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/24377067/', 'Abduktion mit elastischem Widerstand aktivierte den Gluteus medius stärker als die Abduktionsmaschine (EMG, 16 untrainierte Frauen).')
    ]
  }),
  P('side-lying-hip-abduction', 'Seitliches Beinheben liegend', 'bodyweight', ['abductors'], ['glutes'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Becken stabil, Bein leicht hinter der Körperlinie, Zehen nach vorn. Bei Bedarf Gewichtsmanschette.',
    sources: [
      S('Distefano et al. 2009, J Orthop Sports Phys Ther', '10.2519/jospt.2009.2796', 'Von 12 Übungen zeigte seitliches Beinheben im Liegen die höchste Gluteus-medius-Aktivität (ca. 81 % MVIC), deutlich vor Clamshell.'),
      S('McBeth et al. 2012, J Athl Train', '10.4085/1062-6050-47.1.15', 'Bei Seitlage-Abduktion: Gluteus medius (ca. 70 %) vor TFL (ca. 54 %) und Gluteus maximus (ca. 25 %).')
    ]
  }),
  P('clamshell-band', 'Clamshell mit Band', 'bodyweight', ['abductors', 'glutes', 'hip-flexors'], [], {
    confidence: 'medium', basis: 'EMG',
    note: 'Mini-Band über den Knien, Fersen zusammen, Becken nicht nach hinten kippen. Eher Aktivierung als Hauptübung.',
    others: ['Tiefe Hüftaußenrotatoren'],
    sources: [
      S('McBeth et al. 2012, J Athl Train', '10.4085/1062-6050-47.1.15', 'Beim Clamshell waren die vorderen Hüftbeuger am aktivsten; Gluteus medius, TFL und Gluteus maximus nur bei ca. 33–34 % MVIC.'),
      S('Distefano et al. 2009, J Orthop Sports Phys Ther', '10.2519/jospt.2009.2796', 'Clamshell-Varianten erreichten im Gluteus medius nur ca. 40 % MVIC, etwa halb so viel wie seitliches Beinheben.')
    ]
  }),
  P('sumo-squat', 'Sumo-Kniebeuge', 'barbell', ['quads', 'glutes', 'adductors'], ['lower-back', 'hamstrings'], {
    confidence: 'medium', basis: 'MRT (normale Kniebeuge) + EMG (Standbreite)',
    note: 'Stand ca. 1,5-fach schulterbreit, Fußspitzen nach außen, tief beugen. Als Goblet-Variante mit Kurzhantel möglich.',
    others: ['Rumpfstabilisatoren'],
    sources: [
      S('Kubo et al. 2019, Eur J Appl Physiol', '10.1007/s00421-019-04181-y', 'MRT: Kniebeugen ließen die Adduktoren wachsen, tief stärker (ca. 6 %) als halb (ca. 3 %); die Beinbeuger wuchsen nicht.'),
      S('McCaw & Melrose 1999, Med Sci Sports Exerc', '10.1097/00005768-199903000-00012', 'EMG: Die Standbreite veränderte die Aktivität von Adductor longus und Gluteus maximus, nicht aber die Verteilung im Quadrizeps.')
    ]
  }),
  P('copenhagen-plank', 'Copenhagen Plank', 'bodyweight', ['adductors'], ['obliques', 'abs'], {
    confidence: 'high', basis: 'EMG + Kraft-RCT',
    note: 'Seitstütz, oberes Bein auf Bank. Kurzer Hebel: Knie aufgelegt; langer Hebel: Fuß aufgelegt. Hüfte dynamisch heben/senken.',
    others: ['Hüftstabilisatoren des unteren Beins'],
    sources: [
      S('Serner et al. 2013, Br J Sports Med', '10.1136/bjsports-2012-091746', 'Unter 8 Adduktionsübungen gehörte die Copenhagen-Adduktion zu den intensivsten für den Adductor longus.'),
      S('Harøy et al. 2017, Am J Sports Med', '10.1177/0363546517720194', 'RCT, 8 Wo.: Copenhagen-Adduktion steigerte die exzentrische Adduktionskraft um ca. 9 %; Wachstum nicht gemessen.')
    ]
  }),
  P('cable-hip-adduction', 'Adduktion am Kabel', 'cable', ['adductors'], ['glutes'], {
    confidence: 'medium', basis: 'EMG (Variante: Gummiband)',
    note: 'Seitlich zum Kabelturm, Manschette am inneren Knöchel. Bein bis etwa eine Fußbreite neben das Standbein ziehen, Oberkörper ruhig.',
    others: ['Standbein: Hüftstabilisatoren'],
    sources: [
      S('Serner et al. 2013, Br J Sports Med', '10.1136/bjsports-2012-091746', 'Hüftadduktion gegen elastisches Band gehörte zu den dynamischen Übungen mit hoher Adductor-longus-Aktivität.'),
      S('Brandt et al. 2013, Int J Sports Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/24377067/', 'Adduktion mit elastischem Widerstand und an der Maschine aktivierte die Adduktoren im EMG etwa gleich stark.')
    ]
  }),
  P('nordic-hamstring-curl', 'Nordic Hamstring Curl', 'bodyweight', ['hamstrings'], [], {
    confidence: 'high', basis: 'MRT',
    note: 'Füße fixieren, Hüfte gestreckt halten, langsam nach vorn absenken, mit Händen abfangen. Anfänger: Band oder Teilbewegung.',
    sources: [
      S('Pai et al. 2025, J Sport Health Sci', '10.1016/j.jshs.2025.101070', '9 Wochen Nordic Curls: MRT zeigt Zuwachs aller Beinbeuger, am stärksten Semitendinosus und kurzer Bizepskopf; Faszikel länger.'),
      S('Maeo et al. 2024, Med Sci Sports Exerc', '10.1249/MSS.0000000000003490', 'MRT: Nordic Curls vergrößern v. a. die nur kniebeugenden Anteile; langer Bizepskopf wächst weniger als beim Beinbeuger mit gebeugter Hüfte.')
    ]
  }),
  P('good-morning', 'Good Morning', 'barbell', ['hamstrings', 'lower-back'], ['glutes'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Stange auf dem oberen Rücken, Knie leicht gebeugt, Hüfte nach hinten schieben, Rücken neutral. Leicht beginnen.',
    sources: [
      S('Vigotsky et al. 2015, PeerJ', '10.7717/peerj.708', 'EMG von Beinbeugern und Rückenstrecker steigt tendenziell mit der Last; bei schwerer Last mehr Kniebeugung.'),
      S('McAllister et al. 2014, J Strength Cond Res', '10.1519/JSC.0000000000000302', 'EMG-Vergleich: Good Morning aktiviert Beinbeuger und Rückenstrecker, die Beinbeuger aber weniger als RDL und Glute-Ham-Raise.')
    ]
  }),
  P('back-extension-45', 'Rückenstrecken (45°)', 'bodyweight', ['glutes', 'hamstrings', 'lower-back'], [], {
    confidence: 'medium', basis: 'EMG',
    note: 'Polster unter den Hüftknochen. Rücken neutral = mehr Gesäß/Beinbeuger, Rücken einrollen = mehr Rückenstrecker. Gewicht vor der Brust.',
    sources: [
      S('Andersen et al. 2021, J Sports Sci Med', '10.52082/jssm.2021.181', '45°-Bank: höchste Bizeps-femoris-Aktivität, Gesäß über die ganze Bewegung ähnlich wie beim RDL, im oberen Teil höher, Rückenstrecker gleich stark wie RDL und Maschine.'),
      S('Park & Yoo 2014, J Electromyogr Kinesiol', '10.1016/j.jelekin.2014.08.012', 'EMG am Roman Chair: Rückenstrecker und Gesäß aktiv; gebeugte Knie steigern die Aktivität von Rückenstrecker und Gesäß.')
    ]
  }),
  P('reverse-hyperextension', 'Reverse Hyperextension', 'machine', ['glutes', 'hamstrings', 'lower-back'], [], {
    confidence: 'medium', basis: 'EMG',
    note: 'Oberkörper liegt auf, Beine kontrolliert nach oben bis zur Körperlinie führen. Nicht schwingen, Last moderat.',
    sources: [
      S('Cuthbert et al. 2021, J Strength Cond Res', '10.1519/JSC.0000000000004049', 'Reverse Hyper mit höherer EMG in Rückenstrecker, Gesäß und Bizeps femoris als die normale Hyperextension.'),
      S('Lawrence et al. 2022, J Appl Biomech', '10.1123/jab.2022-0046', 'EMG bei 50–150 % Körpergewicht: Rückenstrecker, Gesäß, Bizeps femoris aktiv; über 100 % kaum Zusatzgewinn.')
    ]
  }),
  P('glute-bridge', 'Glute Bridge', 'barbell', ['glutes'], ['hamstrings', 'abductors'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Rücken am Boden, Füße hüftbreit nah am Gesäß, oben kurz halten. Ohne Hantel als Einstieg oder einbeinig steigern.',
    sources: [
      S('Kennedy et al. 2022, Sports Biomech', '10.1080/14763141.2022.2074875', 'Langhantel-Glute-Bridge: höhere EMG in oberem/unterem Gluteus maximus und Gluteus medius als Hip Thrust; weniger Quadrizeps.'),
      S('Khaiyat & Norris 2018, J Phys Ther Sci', '10.1589/jpts.30.642', 'Körpergewichts-Bridge: höchste Gesäß- und Bizeps-femoris-Aktivität unter fünf Reha-Übungen, aber nur moderate Werte.')
    ]
  }),
  P('cable-kickback', 'Kickback am Kabel', 'cable', ['glutes'], ['hamstrings'], {
    confidence: 'high', basis: 'MRT + EMG',
    note: 'Manschette am Knöchel, leicht vorgebeugt stehen, Bein nach hinten strecken ohne Hohlkreuz, langsam zurück.',
    sources: [
      S('Attarieh et al. 2026, J Strength Cond Res', '10.1519/JSC.0000000000005701', 'MRT, 10 Wochen einbeinige Hüftstreckung am Kabel: Gluteus maximus +9 % (v. a. unten), Gluteus medius/minimus kaum Zuwachs.'),
      S('Stevens et al. 2022, Int J Exerc Sci', '10.70252/DWMB8342', 'EMG bei trainierten Frauen: Kickback aktiviert Gluteus maximus und alle gemessenen Bizeps-femoris-Bereiche deutlich.')
    ]
  }),
  P('single-leg-romanian-deadlift', 'Einbeiniges Rumänisches Kreuzheben', 'dumbbell', ['glutes', 'hamstrings'], ['abductors', 'lower-back'], {
    confidence: 'medium', basis: 'EMG + Modell',
    note: 'Hantel in der Hand gegenüber dem Standbein, Hüfte gerade halten, Oberkörper und Spielbein als Linie kippen. Stütze erlaubt.',
    sources: [
      S('Mo et al. 2023, Front Physiol', '10.3389/fphys.2023.1264604', 'Sehr hohe EMG im oberen Gesäß und Bizeps femoris; Last in der Gegenhand erhöht Gluteus medius und Rückenstrecker.'),
      S('Collings et al. 2023, Med Sci Sports Exerc', '10.1249/MSS.0000000000003091', 'EMG-gestütztes Muskelmodell: beladenes einbeiniges RDL in der Spitzengruppe für Gluteus maximus, medius und minimus.')
    ]
  }),
  P('dumbbell-step-up', 'Step-up', 'dumbbell', ['quads', 'glutes'], ['hamstrings', 'abductors', 'calves'], {
    confidence: 'medium', basis: 'EMG + Modell',
    note: 'Ganzen Fuß auf die Box, über das vordere Bein hochdrücken, hinteres nicht abstoßen. Höhere Box = mehr Gesäß.',
    sources: [
      S('Neto et al. 2020, J Sports Sci Med', 'https://pubmed.ncbi.nlm.nih.gov/32132843/', 'Übersicht (EMG): Step-up und Varianten erreichen die höchste Gluteus-maximus-Aktivierung der erfassten Übungen.'),
      S('Kipp et al. 2022, J Strength Cond Res', '10.1519/JSC.0000000000003688', 'Modell: Kräfte in Gesäß, Vastii, Beinbeugern und Waden steigen beim Step-up mit Last, teils stärker als bei der Kniebeuge.')
    ]
  }),
  P('walking-lunge', 'Ausfallschritte gehend', 'dumbbell', ['quads', 'glutes'], ['hamstrings', 'adductors', 'abductors', 'lower-back'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Lange Schritte, hinteres Knie Richtung Boden. Leichte Rumpfvorlage betont das Gesäß. Hanteln seitlich, auch ohne Last.',
    sources: [
      S('Bezerra et al. 2021, Int J Exerc Sci', '10.70252/IGJM9937', 'EMG: gehende Ausfallschritte aktivieren das Gesäß stärker als statische; Rumpfvorlage erhöht den unteren Rückenstrecker.'),
      S('Escamilla et al. 2025, J Funct Morphol Kinesiol', '10.3390/jfmk10010042', 'EMG: Ausfallschritt mit langem Schritt – hoch für Quadrizeps und Gesäß, moderat für Beinbeuger und Adduktoren.'),
      S('Stastny et al. 2015, J Strength Cond Res', '10.1519/JSC.0000000000000976', 'EMG: Hantel in der Gegenhand, gehender Ausfallschritt: mittlerer Gesäßmuskel im Absenken stark aktiv (Kraftsportler ≈ 90 %, Untrainierte ≈ 60 %).')
    ]
  }),
  P('front-squat', 'Frontkniebeuge', 'barbell', ['quads'], ['glutes', 'adductors', 'lower-back', 'upper-back', 'abs'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Hantel vorn auf den Schultern, Ellbogen hoch, Oberkörper aufrecht. Last meist geringer (in einer Studie ≈ 22 % weniger bei Maximallast).',
    sources: [
      S('Yavuz et al. 2015, J Sports Sci', '10.1080/02640414.2014.984240', 'EMG bei Maximallast: Vastus medialis in der Frontkniebeuge aktiver, Semitendinosus in der Rückenkniebeuge; Oberkörper aufrechter.'),
      S('Gullett et al. 2009, J Strength Cond Res', '10.1519/JSC.0b013e31818546bb', 'Bei je 70 % des 1RM: Aktivität von Oberschenkel und unterem Rücken gleich wie bei der Rückenkniebeuge, Kniekräfte geringer – bei weniger Gewicht.'),
      S('Bautista et al. 2020, Int J Exerc Sci', '10.70252/BTUH3630', 'Frontkniebeuge aktiviert u. a. Rückenstrecker im Brustbereich und vorderen Delta spürbar – Rumpf und Ablage arbeiten mit.')
    ]
  }),
  P('goblet-squat', 'Goblet Squat', 'dumbbell', ['quads'], ['glutes', 'adductors', 'abs', 'upper-back'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Kurzhantel oder Kettlebell vor der Brust, tief zwischen die Knie sitzen. Gut für Technik und Einstieg; Last durch Griff begrenzt.',
    others: ['Griffmuskulatur (Halten)'],
    sources: [
      S('Collins et al. 2021, J Strength Cond Res', '10.1519/JSC.0000000000004094', 'EMG: Goblet Squat mit höherer Vastus-medialis/-lateralis-Aktivität als die Landmine-Kniebeuge (30 % Körpermasse); Gesäß nicht gemessen.')
    ]
  }),
  P('smith-machine-squat', 'Kniebeuge an der Multipresse', 'machine', ['quads'], ['glutes', 'adductors', 'lower-back'], {
    confidence: 'high', basis: 'Ultraschall + EMG',
    note: 'Füße etwas vor die Stange für mehr Quadrizeps. Geführte Bahn: weniger Balance nötig, Kraft überträgt sich etwas schlechter.',
    sources: [
      S('Saeterbakken et al. 2019, PLoS One', '10.1371/journal.pone.0214302', '7 Wochen: Multipresse steigerte die Vastus-lateralis-Dicke (Ultraschall) ähnlich wie die freie Kniebeuge; Kraft eher übungsspezifisch.'),
      S('Schwanbeck et al. 2009, J Strength Cond Res', '10.1519/JSC.0b013e3181b1b181', 'EMG bei 8RM: freie Kniebeuge mit höherer Aktivität in Vastus medialis, Beinbeugern und Wade als Multipresse (n = 6).')
    ]
  }),
  P('belt-squat', 'Belt Squat', 'machine', ['quads'], ['glutes', 'adductors', 'abductors', 'hamstrings'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Last hängt am Hüftgurt statt auf der Wirbelsäule. Gute Wahl, wenn der untere Rücken geschont werden soll.',
    sources: [
      S('Joseph et al. 2020, J Hum Kinet', '10.2478/hukin-2019-0126', 'EMG vs. Rückenkniebeuge (100 % KG): Quadrizeps, Beinbeuger, Waden ähnlich; Rückenstrecker, Gesäß und Bauch deutlich weniger.')
    ]
  }),
  P('sissy-squat', 'Sissy Squat', 'bodyweight', ['quads'], ['abs'], {
    confidence: 'low', basis: 'Anatomie',
    note: 'Fersen hoch, Knie weit nach vorn, Hüfte gestreckt; festhalten. Hohe Kniebelastung – langsam steigern.',
    sources: [
      S('StatPearls: Anatomy, Rectus Femoris', 'https://www.ncbi.nlm.nih.gov/books/NBK513334/', 'Anatomie: Rectus femoris beugt die Hüfte und streckt mit den Vasti das Knie – bei gestreckter Hüfte stärker gedehnt (keine Studie zur Übung).')
    ]
  }),
  P('dumbbell-forward-lunge', 'Ausfallschritte vorwärts', 'dumbbell', ['quads', 'glutes'], ['adductors', 'abductors', 'hamstrings'], {
    confidence: 'medium', basis: 'EMG + Modell',
    note: 'Großer Schritt nach vorn, abbremsen und zurückdrücken. Mehr Quadrizeps- und Kniescheibenlast als rückwärts; Oberkörper aufrecht.',
    sources: [
      S('Muyor et al. 2020, PLoS One', '10.1371/journal.pone.0230841', 'EMG beim Ausfallschritt vorwärts: Vastus lateralis und medialis am aktivsten, danach Gluteus medius und maximus.'),
      S('Goulette et al. 2021, Phys Ther Sport', '10.1016/j.ptsp.2020.12.001', 'Modell: Vorwärts-Ausfallschritt mit höherer Quadrizepskraft und Kniescheiben-Anpresskraft als rückwärts; der Druck pro Fläche war gleich (20 Frauen).')
    ]
  }),
  P('dumbbell-reverse-lunge', 'Ausfallschritte rückwärts', 'dumbbell', ['quads', 'glutes'], ['adductors', 'abductors', 'hamstrings'], {
    confidence: 'medium', basis: 'Modell + EMG (Variante)',
    note: 'Schritt nach hinten, vorderes Bein trägt die Last. Weniger Kraft auf die Kniescheibe als vorwärts (Modell, gesunde Frauen).',
    sources: [
      S('Goulette et al. 2021, Phys Ther Sport', '10.1016/j.ptsp.2020.12.001', 'Modell: Rückwärts-Ausfallschritt mit geringerer Quadrizepskraft, Kniescheibenlast und Belastungsrate als vorwärts.'),
      S('Muyor et al. 2020, PLoS One', '10.1371/journal.pone.0230841', 'EMG, Ausfallschritt vorwärts (Langhantel): Vasti am aktivsten, dann Gesäß. Rückwärts nicht gemessen; ähnliche Verteilung ist eine Annahme.')
    ]
  }),

  // ---------- Arme ----------
  P('dumbbell-curl', 'Bizepscurls', 'dumbbell', ['biceps'], ['forearms'], {
    confidence: 'high', basis: 'EMG',
    sources: [
      S('Uysal et al. 2026, BMC Sports Sci Med Rehabil', '10.1186/s13102-026-01867-7', 'EMG bei Langhantelcurls: Beim Hochziehen waren Brachioradialis und Bizeps ähnlich aktiv, beim Absenken der Brachioradialis stärker. Kurzhanteln wurden nicht getestet.'),
      S('Caufriez et al. 2018, J Hand Surg Asian Pac Vol', '10.1142/S2424835518500145', 'EMG: Bizeps, Brachialis und Brachioradialis bei Ellbogenbeugung in allen Unterarmstellungen stark aktiv.')
    ]
  }),
  P('hammer-curl', 'Hammercurls', 'dumbbell', ['biceps', 'forearms'], [], {
    confidence: 'medium', basis: 'Anatomie, EMG (keine Studie zum Hammercurl selbst)',
    note: '„Bizeps“ umfasst hier den Brachialis, den stärksten Armbeuger in Neutralgriff.',
    sources: [
      S('StatPearls: Brachialis Muscle', 'https://www.statpearls.com/point-of-care/18501', 'Anatomie: Brachialis beugt den Ellbogen in jeder Unterarmstellung.'),
      S('Buchanan, Rovai & Rymer 1989, J Neurophysiol', '10.1152/jn.1989.62.6.1201', 'EMG: Brachioradialis und Brachialis oft am aktivsten, wenn der Bizeps wenig arbeitet.')
    ]
  }),
  P('triceps-pushdown', 'Trizepsdrücken am Kabel', 'cable', ['triceps'], [], {
    confidence: 'high', basis: 'EMG',
    sources: [
      S('Hussain et al. 2020, Front Physiol', '10.3389/fphys.2020.00112', 'EMG: alle drei Trizepsköpfe beim Trizepsdrücken aktiv.'),
      S('Rendos et al. 2016, J Strength Cond Res', '10.1519/JSC.0000000000001293', 'EMG: Standard- oder Kugelgriff änderte die Trizepsaktivität nicht; nur der Fingerstrecker war mit Kugelgriff aktiver.')
    ]
  }),
  P('overhead-triceps-extension', 'Überkopf-Trizepsstrecken', 'cable', ['triceps'], [], {
    confidence: 'high', basis: 'MRT-Trainingsstudie',
    note: 'Überkopf wächst besonders der lange Kopf, die anderen Köpfe aber ebenfalls stärker.',
    sources: [
      S('Maeo et al. 2022, Eur J Sport Sci', '10.1080/17461391.2022.2100279', 'MRT: Überkopf-Training ließ den langen Trizepskopf etwa 1,5-mal stärker wachsen als Training mit hängendem Arm.')
    ]
  }),

  // v1.7 Runde 2 (Recherche 2026-10-13, Drive → Research - Exercise Pool)
  P('barbell-curl-ez', 'SZ-Curls / Langhantelcurls', 'barbell', ['biceps'], ['forearms', 'front-delts'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Ellbogen am Körper lassen, ohne Schwung. Mit SZ-Stange ist der Griff halb supiniert, das ist angenehmer fürs Handgelenk.',
    others: ['Brachioradialis'],
    sources: [
      S('Uysal et al. 2026, BMC Sports Sci Med Rehabil', '10.1186/s13102-026-01867-7', 'EMG bei Langhantelcurls mit 3 Griffen: Bizeps und Brachioradialis sind ähnlich aktiv, exzentrisch ist der Brachioradialis sogar stärker. Deltamuskel nicht gemessen.'),
      S('Coratella et al. 2023, Sports (Basel)', '10.3390/sports11030064', 'EMG bei Bodybuildern: Mit Untergriff ist der Bizeps am aktivsten. Der vordere Deltamuskel stabilisiert, bei Ober- und Neutralgriff stärker.')
    ]
  }),
  P('incline-dumbbell-curl', 'Schrägbankcurls', 'dumbbell', ['biceps'], ['forearms'], {
    confidence: 'high', basis: 'MRT (Kobayashi et al. 2026) + Ultraschall (Zabaleta-Korta et al. 2023)',
    note: 'Bank auf ca. 45–60°, Arme hängen hinter dem Körper (Schulter gestreckt). Langsam ablassen, Schultern bleiben ruhig.',
    others: ['Brachioradialis', 'Brachialis'],
    sources: [
      S('Kobayashi et al. 2026, J Sports Sci', '10.1080/02640414.2026.2741751', 'MRT, 12 Wochen, Arm gegen Arm: Der Bizeps wuchs bei Schrägbankcurls etwas mehr als bei Scottcurls. Bei allen Beugern zusammen gab es keinen Unterschied.'),
      S('Zabaleta-Korta et al. 2023, J Hum Kinet', '10.5114/jhk/163561', 'Ultraschall bei trainierten Frauen: Nach 9 Wochen Schrägbankcurls gab es keinen messbaren Zuwachs, beim Scott-Curl wuchs der distale Bereich.')
    ]
  }),
  P('preacher-curl', 'Scottcurls', 'dumbbell', ['biceps'], ['forearms'], {
    confidence: 'high', basis: 'MRT + Ultraschall',
    note: 'Oberarm liegt auf dem Pult. Unten nicht ganz durchstrecken und kontrolliert ablassen. Geht mit Kurzhantel, SZ-Stange oder an der Maschine.',
    others: ['Brachialis', 'Brachioradialis'],
    sources: [
      S('Kobayashi et al. 2026, J Sports Sci', '10.1080/02640414.2026.2741751', 'MRT: Nach Scottcurls wuchsen Brachialis und Brachioradialis stärker als nach Schrägbankcurls. Bei allen Beugern zusammen war das Wachstum gleich.'),
      S('Pedrosa et al. 2023, Sports (Basel)', '10.3390/sports11020039', 'Scottcurl mit Kurzhantel: Training im gestreckten Anfangsbereich brachte mehr distalen Bizeps-Querschnitt und mehr Kraft als der Endbereich.'),
      S('Nunes et al. 2020, Int J Environ Res Public Health', '10.3390/ijerph17165859', 'Scottcurl mit Langhantel gegen Kabel: Die Bizepsdicke nahm ähnlich zu, die Langhantel brachte mehr Kraft in gestreckter Position.')
    ]
  }),
  P('cable-curl', 'Kabelcurls (auch Bayesian)', 'cable', ['biceps'], ['forearms'], {
    confidence: 'high', basis: 'Ultraschall',
    note: 'Bayesian: Rücken zum Kabelzug, Arm zieht nach hinten. In Studien wuchs der Bizeps damit nicht mehr als mit anderen Kabelcurls.',
    others: ['Brachialis'],
    sources: [
      S('Attarieh et al. 2025, Eur J Sport Sci', '10.1002/ejsc.12279', 'Ultraschall: Bayesian- und Preacher-Kabelcurls mit gleichem Widerstandsprofil brachten gleiches Wachstum von Bizeps und Brachialis und gleiche Kraft.'),
      S('Larsen et al. 2026, Front Physiol', '10.3389/fphys.2026.1750722', 'Ultraschall, 10 Wochen: Kabelcurl mit maximal gestreckter Schulter brachte keinen Vorteil gegenüber neutraler Schulter, wenn der Rest gleich war.')
    ]
  }),
  P('concentration-curl', 'Konzentrationscurls', 'dumbbell', ['biceps'], ['forearms'], {
    confidence: 'low', basis: 'EMG (indirekt) + Anatomie',
    note: 'Im Sitzen, Ellbogen innen am Oberschenkel abstützen. Langsam ablassen, kein Schwung über den Rumpf.',
    others: ['Brachialis', 'Brachioradialis', 'Handgelenkbeuger (FCR/FCU)'],
    sources: [
      S('Krings et al. 2021, J Strength Cond Res', '10.1519/JSC.0000000000002954', 'Langhantel-Curl im Obergriff (dort „Konzentrationscurl“ genannt): dicker Griff änderte das EMG nicht, senkte das 1RM leicht (≈ 5 %).'),
      S('Sevilmiş et al. 2024, Percept Mot Skills', '10.1177/00315125241279086', 'EMG u. a. beim Konzentrationscurl: Wie stark man einen Muskel spürt, passte nicht zur gemessenen Aktivität.')
    ]
  }),
  P('reverse-curl', 'Reverse Curls', 'barbell', ['biceps', 'forearms'], ['front-delts'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Obergriff (Handrücken oben), Handgelenk gerade halten. Lieber leichtes Gewicht, eine SZ-Stange schont die Handgelenke.',
    others: ['Brachioradialis', 'Brachialis', 'Handgelenkstrecker (ECRL/ECRB) als Stabilisatoren'],
    sources: [
      S('Coratella et al. 2023, Sports (Basel)', '10.3390/sports11030064', 'EMG: Im Obergriff sind Bizeps und auch Brachioradialis weniger aktiv als im Untergriff, der vordere Deltamuskel arbeitet mehr.'),
      S('Lung et al. 2024, StatPearls (Brachioradialis)', 'https://www.ncbi.nlm.nih.gov/books/NBK526110/', 'Anatomie: Der Brachioradialis beugt den Ellbogen in jeder Unterarmstellung; aus der Supination wirkt er als Pronator, aus der Pronation als Supinator.'),
      S('Reeves et al. 2026, StatPearls (Wrist Extensors)', 'https://www.ncbi.nlm.nih.gov/books/NBK534805/', 'Anatomie: ECRL, ECRB und ECU strecken das Handgelenk und stabilisieren es beim Greifen.')
    ]
  }),
  P('wrist-curl', 'Handgelenkcurls', 'dumbbell', ['forearms'], [], {
    confidence: 'low', basis: 'Anatomie',
    note: 'Unterarme auf der Bank oder dem Oberschenkel, Handflächen nach oben, nur das Handgelenk bewegt sich. Kleiner Bewegungsweg, leichtes Gewicht.',
    others: ['Flexor carpi radialis', 'Flexor carpi ulnaris', 'Palmaris longus', 'Fingerbeuger (FDS/FDP)'],
    sources: [
      S('Nguyen & Duong 2023, StatPearls (Hand Long Flexor Tendons)', 'https://www.ncbi.nlm.nih.gov/books/NBK546607/', 'Anatomie: FCR und FCU beugen das Handgelenk zur Handfläche hin, der Palmaris longus hilft wenig. FDS und FDP beugen die Finger.'),
      S('Mitchell & Whited 2023, StatPearls (Forearm Muscles)', 'https://www.ncbi.nlm.nih.gov/books/NBK536975/', 'Überblick über Ursprung und Ansatz der Unterarmmuskeln. Die Beuger und Strecker des Handgelenks setzen an den Mittelhandknochen an.')
    ]
  }),
  P('reverse-wrist-curl', 'Reverse Handgelenkcurls', 'dumbbell', ['forearms'], [], {
    confidence: 'low', basis: 'Anatomie',
    note: 'Handrücken nach oben, Unterarm aufgelegt, das Handgelenk hebt die Hantel. Sehr leicht beginnen, die Strecker sind deutlich schwächer.',
    others: ['Extensor carpi radialis longus/brevis', 'Extensor carpi ulnaris', 'Extensor digitorum'],
    sources: [
      S('Reeves et al. 2026, StatPearls (Wrist Extensors)', 'https://www.ncbi.nlm.nih.gov/books/NBK534805/', 'Anatomie: ECRL und ECRB strecken das Handgelenk und neigen es zur Daumenseite, der ECU streckt es und neigt es zur Kleinfingerseite.')
    ]
  }),
  P('farmers-walk', 'Farmer\'s Walk', 'dumbbell', ['forearms'], ['upper-back', 'abductors', 'obliques', 'abs', 'lower-back', 'glutes', 'calves'], {
    confidence: 'low', basis: 'EMG (Bein/Rumpf) + Anatomie',
    note: 'Schwere Hanteln oder Farmer-Griffe, aufrecht in kurzen, zügigen Schritten gehen. Einarmig (Suitcase) vs. beidseitig: nicht verglichen.',
    others: ['Fingerbeuger (FDS/FDP)', 'Handgelenkstrecker als Stabilisatoren', 'Quadratus lumborum'],
    sources: [
      S('Stastny et al. 2015, J Hum Kinet', '10.1515/hukin-2015-0016', 'EMG (16 trainierte Männer, 75 % 6RM): Gluteus medius mäßig bis stark aktiv (26–47 % MVIC, mehr bei schwachen Abduktoren), Oberschenkelmuskeln nur gering.'),
      S('McGill et al. 2009, J Strength Cond Res', '10.1519/JSC.0b013e318198f8f7', 'EMG plus Modell, 7 Strongman-Übungen inkl. Farmer\'s Walk und Suitcase-Carry: Tragen fordert Rumpf und Hüfte anders als Heben.'),
      S('Reeves et al. 2026, StatPearls (Wrist Extensors)', 'https://www.ncbi.nlm.nih.gov/books/NBK534805/', 'Anatomie: Die Handgelenkstrecker stabilisieren das Handgelenk beim kräftigen Greifen, ein leicht gestrecktes Handgelenk hilft der Griffkraft.')
    ]
  }),
  P('overhead-dumbbell-triceps-extension', 'Überkopf-Trizepsstrecken mit Kurzhantel', 'dumbbell', ['triceps'], ['abs'], {
    confidence: 'medium', basis: 'MRT (Kabelvariante) + EMG (Kurzhantel)',
    note: 'Ein- oder beidarmig, sitzend mit Lehne. Ellbogen eng und nach oben zeigend, tief absenken für die volle Dehnung des langen Kopfes.',
    others: ['Anconeus'],
    sources: [
      S('Maeo et al. 2022, Eur J Sport Sci', '10.1080/17461391.2022.2100279', '12 Wochen, MRT: Strecken überkopf brachte ca. 1,4–1,5× mehr Zuwachs an Trizepsvolumen als in neutraler Armhaltung, v. a. im langen Kopf. Kabel, keine Kurzhantel.'),
      S('Alves et al. 2017, J Sports Med Phys Fitness', '10.23736/S0022-4707.17.06849-9', 'EMG von langem und lateralem Kopf beim Kurzhantel-Strecken überkopf und im Liegen: sehr ähnliche Muster, Aktivität am höchsten im ersten/mittleren Bewegungsdrittel.'),
      S('Tiwana et al. 2023, StatPearls: Triceps Muscle', 'https://www.ncbi.nlm.nih.gov/books/NBK536996/', 'Anatomie: Nur der lange Kopf entspringt am Schulterblatt und wirkt daher auch auf das Schultergelenk.')
    ]
  }),
  P('ez-bar-skullcrusher', 'Skullcrusher (SZ-Stange)', 'barbell', ['triceps'], [], {
    confidence: 'high', basis: 'Bildgebung (Querschnitt) + EMG',
    note: 'SZ-Stange hinter die Stirn/den Kopf absenken, Oberarme leicht nach hinten geneigt. Ellbogen nicht ausstellen, kontrolliert absenken.',
    others: ['Anconeus'],
    sources: [
      S('Brandão et al. 2020, J Strength Cond Res', '10.1519/JSC.0000000000003550', 'Liegendes Trizepsdrücken mit Langhantel ließ den langen Kopf stärker wachsen als reines Bankdrücken. Der laterale Kopf wuchs mit Bankdrücken stärker.'),
      S('Alves et al. 2017, J Sports Med Phys Fitness', '10.23736/S0022-4707.17.06849-9', 'Strecken im Liegen (Kurzhantel) aktivierte den Trizeps per EMG ähnlich wie überkopf. Daher beide nicht zwingend in dieselbe Einheit legen.')
    ]
  }),
  P('close-grip-bench-press', 'Enges Bankdrücken', 'barbell', ['triceps', 'chest'], ['front-delts'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Griff etwa schulterbreit, nicht extrem eng (Handgelenke schonen). Ellbogen nah am Körper, Stange zur unteren Brust.',
    sources: [
      S('Saeterbakken et al. 2021, IJERPH', '10.3390/ijerph18126444', 'EMG bei 6-RM: Weiter Griff zeigte weniger Trizepsaktivität als mittlerer/enger. Mit engem Griff sind die 6-RM-Lasten niedriger.'),
      S('Lehman 2005, J Strength Cond Res', '10.1519/R-15024.1', 'Isometrisches EMG: Ein engerer Griff erhöhte die Aktivität des lateralen Trizepskopfs und senkte die des sternalen Brustanteils leicht. Die Effekte waren klein.'),
      S('Tanimoto et al. 2023, Sports', '10.3390/sports11080154', 'EMG bei 10-RM: Das Verhältnis Brust/Trizeps änderte sich mit dem Griffabstand (40 vs. 81 cm) kaum. Relativiert den Trizepsfokus.')
    ]
  }),
  P('dumbbell-triceps-kickback', 'Kurzhantel-Kickback', 'dumbbell', ['triceps'], ['rear-delts'], {
    confidence: 'low', basis: 'Anatomie',
    note: 'Oberkörper vorgebeugt, Oberarm parallel zum Boden oder leicht höher fixieren, nur den Unterarm strecken. Leichtes Gewicht, nicht schwingen.',
    others: ['Anconeus'],
    sources: [
      S('Tiwana et al. 2023, StatPearls: Triceps Muscle', 'https://www.ncbi.nlm.nih.gov/books/NBK536996/', 'Anatomie: Alle drei Köpfe setzen am Olekranon an und strecken den Ellbogen. Der lange Kopf wirkt zusätzlich an der Schulter.'),
      S('Serbest et al. 2025, Phys Eng Sci Med', '10.1007/s13246-025-01672-5', 'EMG bei 14 Frauen: 5 kg statt 2 kg änderte die Trizepsaktivität kaum; am höchsten war sie bei gestrecktem Arm. Laststeigerung behutsam wählen.')
    ]
  }),
  P('bench-dips', 'Bankdips', 'bodyweight', ['triceps'], ['chest', 'front-delts'], {
    confidence: 'medium', basis: 'EMG + Kinematik',
    note: 'Hände auf der Bank, Beine angewinkelt (leichter) oder gestreckt. Nur so tief, wie die Schulter es beschwerdefrei zulässt.',
    others: ['Serratus anterior'],
    sources: [
      S('McKenzie et al. 2022b, Int J Environ Res Public Health (Bank-, Barren-, Ringdips)', '10.3390/ijerph192013211', 'EMG/3D: Bankdips beanspruchen v. a. den Trizeps, aber weniger als Barren- oder Ringdips. Sie zeigten die größte Schulterstreckung (~101 % der max. Beweglichkeit).')
    ]
  }, 'bodyweight'),
  P('machine-triceps-dip', 'Trizepsdrücken an der Maschine (Dip-Maschine)', 'machine', ['triceps'], ['chest', 'front-delts'], {
    confidence: 'low', basis: 'Anatomie + Analogie zu Dips (EMG)',
    note: 'Sitzend die Griffe nach unten drücken, Oberkörper aufrecht, Ellbogen nah am Körper. Gut für einen kontrollierten Lastaufbau.',
    sources: [
      S('McKenzie et al. 2022b, Int J Environ Res Public Health (Bank-, Barren-, Ringdips)', '10.3390/ijerph192013211', 'EMG an freien Dip-Varianten: Trizeps, Brust und vordere Schulter arbeiten mit. Die Maschine selbst wurde nicht untersucht, Übertrag ist nur Analogie.'),
      S('Tiwana et al. 2023, StatPearls: Triceps Muscle', 'https://www.ncbi.nlm.nih.gov/books/NBK536996/', 'Anatomie: Der Trizeps ist der Hauptstrecker des Ellbogens, der lange Kopf wirkt zusätzlich an der Schulter.')
    ]
  }),

  // ---------- Bauch ----------
  P('cable-crunch', 'Crunch am Kabel', 'cable', ['abs'], ['obliques'], {
    confidence: 'medium', basis: 'EMG verwandter Übungen (Crunch mit Gewicht)',
    sources: [
      S('Moraes et al. 2009, Phys Ther Sport', '10.1016/j.ptsp.2009.01.001', 'EMG: gerader und äußerer schräger Bauchmuskel steigen beim Crunch mit der Last.'),
      S('Escamilla et al. 2016, Sports Health', '10.1177/1941738116653931', 'EMG: gerader Bauchmuskel beim Crunch stärker als bei seitlichen Übungen.')
    ]
  }),
  P('cable-woodchop', 'Holzhacker am Kabel', 'cable', ['obliques'], ['abs'], {
    confidence: 'low', basis: 'Anatomie; keine EMG-Studie zum Holzhacker',
    sources: [
      S('Kenhub: External abdominal oblique muscle', 'https://www.kenhub.com/en/library/anatomy/external-abdominal-oblique-muscle', 'Anatomie: die schrägen Bauchmuskeln drehen den Rumpf.'),
      S('Rodríguez-Perea et al. 2023, Healthcare', '10.3390/healthcare11162331', 'Holzhacker am Kabel wird als Test der Rumpfrotatoren eingesetzt (keine Muskeldaten).')
    ]
  }),
  P('hanging-leg-raise', 'Hängendes Beinheben', 'bodyweight', ['abs', 'obliques', 'hip-flexors'], [], {
    confidence: 'medium', basis: 'EMG, Anatomie',
    note: 'Hüftbeuger heben die Beine; der Bauch kippt das Becken. Gestreckte Beine belasten die Wirbelsäule vermutlich stärker (nicht gemessen).',
    sources: [
      S('McGill, Andersen & Cannon 2014, J Sports Sci', '10.1080/02640414.2014.946437', 'EMG: sehr hohe Aktivität von geradem und äußerem schrägem Bauchmuskel, hohe Wirbelsäulenlast.'),
      S('Escamilla et al. 2006, Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/16649890/', 'EMG: hängendes Knieheben unter den stärksten Übungen für gerade und schräge Bauchmuskeln.'),
      S('StatPearls: Iliopsoas Muscle', 'https://www.statpearls.com/point-of-care/23367', 'Anatomie: Iliopsoas ist der wichtigste Hüftbeuger.')
    ]
  }, 'bodyweight'),

  // v1.8 Runde 3 (Recherche 2026-10-13, Drive → Research - Exercise Pool)
  P('floor-crunch', 'Crunch (Boden)', 'bodyweight', ['abs'], ['obliques'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Rückenlage, Knie gebeugt; nur Schulterblätter abheben, LWS bleibt am Boden. Langsam ablassen.',
    sources: [
      S('Escamilla et al. 2006, J Orthop Sports Phys Ther', '10.2519/jospt.2006.36.2.45', 'EMG-Vergleich: Crunch gehört zu den Übungen mit höchster Aktivität im oberen/unteren Rectus und in beiden Obliques.'),
      S('Youdas et al. 2008, J Strength Cond Res', '10.1519/JSC.0b013e31818745bf', 'EMG von Rectus, Obliques und Rectus femoris beim Crunch im Vergleich zu Ab-Slide, Beinstoß und Seitstütz.'),
      S('Lehman & McGill 2001, Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/11319934/', 'Curl-up und Beinheben: keine messbaren Unterschiede zwischen oberem und unterem Rectus-Anteil.')
    ]
  }, 'bodyweight'),
  P('machine-crunch', 'Crunch an der Maschine', 'machine', ['abs'], ['obliques', 'hip-flexors'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Sitzend, Brust zum Becken einrollen statt aus der Hüfte ziehen. Gewicht so wählen, dass die Rumpfbeugung sauber bleibt.',
    sources: [
      S('Sundstrup et al. 2012, Int J Sports Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/22893857/', 'Sitz-Crunch-Maschine bei 10RM: Rectus ca. 84 % MVIC, Rectus femoris ca. 65 %; Rectus und Obliquus externus am aktivsten.')
    ]
  }),
  P('reverse-crunch', 'Reverse Crunch', 'bodyweight', ['abs'], ['obliques', 'hip-flexors'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Rückenlage, Knie angewinkelt; Becken vom Boden einrollen, nicht nur Beine schwingen. Schrägbank erhöht die Schwierigkeit.',
    sources: [
      S('Escamilla et al. 2006, Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/16649890/', 'Reverse Crunch auf 30°-Schräge: oberer gerader und innerer schräger Bauch hoch, Hüftbeuger auch. Unterer Bauch nicht stärker als beim Crunch.'),
      S('King 2018, Neurosci Lett', '10.1016/j.neulet.2018.03.058', 'EMG bei Sit-up und Reverse Crunch: Rectus als Hauptbeweger, Obliquus externus und Transversus eher stabilisierend.')
    ]
  }, 'bodyweight'),
  P('ab-wheel-rollout', 'Ab-Wheel Rollout', 'bodyweight', ['abs'], ['obliques', 'lats'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Aus dem Kniestand starten; nur so weit ausrollen, wie die LWS neutral bleibt. Steigerung: längerer Weg, später aus dem Stand.',
    others: ['Trizeps/Brust (Rad-Variante Ab Slide)'],
    sources: [
      S('Escamilla et al. 2006, Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/16649890/', 'Rollout mit Power Wheel: höchste Aktivität im geraden Bauchmuskel, hohe in den schrägen; Latissimus mäßig, Rückenstrecker gering.'),
      S('Escamilla et al. 2006, J Orthop Sports Phys Ther', '10.2519/jospt.2006.36.2.45', 'Ab Slide (Rollgerät): hohe Rectus-/Obliques-Aktivität, dazu Brust, Trizeps, Latissimus; wenig Rectus femoris.'),
      S('Youdas et al. 2008, J Strength Cond Res', '10.1519/JSC.0b013e31818745bf', 'Ab-Slide: höchste Werte für geraden und inneren schrägen Bauch der vier Übungen, Hüftbeuger unter dem Beinstoß. Nicht alle Unterschiede gesichert.')
    ]
  }, 'bodyweight'),
  P('plank', 'Unterarmstütz (Plank)', 'bodyweight', ['abs'], ['obliques'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Unterarme unter den Schultern, Körper gerade, Becken leicht nach hinten kippen. Steigerung: Ellbogen weiter nach vorn.',
    others: ['M. serratus anterior'],
    sources: [
      S('Schoenfeld et al. 2014, Sports Biomech', '10.1080/14763141.2014.942355', 'Plank mit langem Hebel und Beckenkippung nach hinten steigert Rectus- und Obliquus-externus-EMG ggü. Standard-Plank.'),
      S('Cortell-Tormo et al. 2017, J Strength Cond Res', '10.1519/JSC.0000000000001689', 'Becken- und Schulterblattposition verändern die EMG von Rectus, Obliques und Rückenstrecker im Plank deutlich.'),
      S('Byrne et al. 2014, J Strength Cond Res', '10.1519/JSC.0000000000000510', 'EMG im Boden-Plank und Schlingen-Varianten: Rectus, Obliquus externus, Serratus anterior aktiv; Schlingen erhöhen Bauch-EMG.')
    ]
  }, 'bodyweight'),
  P('lying-leg-raise', 'Beinheben liegend', 'bodyweight', ['abs', 'hip-flexors'], ['obliques'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Rückenlage, LWS am Boden halten; Beine nur so tief senken, wie das gelingt. Knie beugen macht es leichter.',
    sources: [
      S('Park & Park 2019, J Back Musculoskelet Rehabil', '10.3233/BMR-181122', 'Isometrisches beidseitiges Beinheben zeigte höhere Rectus-EMG als der Plank (n=18 Frauen).'),
      S('Marchetti et al. 2011, J Sports Sci Med', 'https://pubmed.ncbi.nlm.nih.gov/24149878/', 'Beinheben und Curl-up aktivieren oberen und unteren Rectus mit leicht verschiedenem Muster; Muskel arbeitet als Einheit.'),
      S('Bordoni & Varacallo 2026, StatPearls: Iliopsoas Muscle', 'https://www.ncbi.nlm.nih.gov/books/NBK531508/', 'Anatomie: Iliopsoas ist der Hauptbeuger im Hüftgelenk; bei fixiertem Bein beugt er den Rumpf.')
    ]
  }, 'bodyweight'),
  P('sit-up', 'Sit-up / Negativ-Sit-up', 'bodyweight', ['abs', 'obliques', 'hip-flexors'], [], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Knie gebeugt, Rumpf Wirbel für Wirbel aufrollen. Negativ-Variante: auf Schrägbank mit Kopf unten, kontrolliert ablassen.',
    sources: [
      S('Escamilla et al. 2006, J Orthop Sports Phys Ther', '10.2519/jospt.2006.36.2.45', 'Sit-up mit gebeugten Knien: hohe Obliques-Aktivität und mit die höchste Rectus-femoris-Aktivität der getesteten Übungen.'),
      S('Escamilla et al. 2006, Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/16649890/', 'Sit-up mit gebeugten Knien: schräge Bauchmuskeln (50 %, 49 %) etwas über dem geraden (39 %, 38 %), dazu viel Hüftbeuger-Aktivität (EMG).'),
      S('Siccardi et al. 2023, StatPearls: Psoas Major', 'https://www.ncbi.nlm.nih.gov/books/NBK535418/', 'Anatomie: Beidseitiger Psoas hilft, den Rumpf aus der Rückenlage aufzurichten, und beugt die Hüfte.')
    ]
  }, 'bodyweight'),
  P('captains-chair-knee-raise', 'Knieheben im Stütz (Captain\'s Chair)', 'bodyweight', ['abs', 'obliques', 'hip-flexors'], [], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Unterarme auf den Polstern, Rücken an der Lehne; Knie heben und Becken einrollen, ohne Schwung. Langsam absenken.',
    sources: [
      S('Escamilla et al. 2006, Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/16649890/', 'Hängendes Knieheben in Armschlaufen (verwandte Variante): schräge Bauchmuskeln (79 %, 85 %) über dem geraden (69 %, 75 %); Übertrag auf den Captain’s Chair.'),
      S('Bordoni & Varacallo 2026, StatPearls: Iliopsoas Muscle', 'https://www.ncbi.nlm.nih.gov/books/NBK531508/', 'Anatomie: Der Iliopsoas ist der Hauptbeuger der Hüfte. Knieheben ist vor allem Hüftbeugung (eigene Ableitung).')
    ]
  }, 'bodyweight'),
  P('side-plank', 'Seitstütz', 'bodyweight', ['obliques'], ['abductors', 'lower-back', 'abs'], {
    confidence: 'medium', basis: 'EMG (Oberfläche + Feindraht)',
    note: 'Unterarm unter Schulter, Hüfte in Linie mit Körper halten. Leichter auf den Knien, schwerer auf den Füßen.',
    others: ['Quadratus lumborum', 'Transversus abdominis'],
    sources: [
      S('Escamilla et al. 2016, Sports Health', '10.1177/1941738116653931', 'Oberflächen-EMG: Seitstütz auf Füßen aktiviert äußere Obliques stärker als auf Knien; seitliche Übungen aktivieren die Rückenstrecker am stärksten.'),
      S('Youdas et al. 2014, Sports Health', '10.1177/1941738114539266', 'EMG bei Seitstütz-Varianten: Obliquus externus und Glut. medius deutlich aktiv, meist stärker auf der Stützseite.'),
      S('Juker et al. 1998, Med Sci Sports Exerc', '10.1097/00005768-199802000-00020', 'Feindraht-EMG: Seitstütz erzielte viel Aktivität der Bauchwand bei wenig Psoas-Aktivität; die Autoren bewerten ihn als beste Bauchwandübung.')
    ]
  }, 'bodyweight'),
  P('pallof-press', 'Pallof Press', 'cable', ['obliques'], ['abs'], {
    confidence: 'low', basis: 'Anatomie; keine EMG-Studie zur Pallof Press',
    note: 'Seitlich zum Kabel, Griff an der Brust, Arme strecken, ohne dass der Rumpf mitdreht. Kniend leichter, Stand schmal schwerer.',
    others: ['Transversus abdominis', 'Quadratus lumborum'],
    sources: [
      S('Juan-Recio et al. 2025, Medicina (Kaunas)', '10.3390/medicina61020312', 'Beschleunigung am Becken bei 5 Pallof-Varianten: Kniend am leichtesten; schmaler/Tandemstand und instabile Unterlage erschweren. Kein EMG.'),
      S('Kumar et al. 2001, Eur J Appl Physiol', '10.1007/s004210100510', 'EMG, maximale Rumpfdrehung im Sitz (isometrisch): Männer v. a. äußerer schräger Bauch, Lat der Drehseite, Rückenstrecker; Frauen v. a. Brustmuskel.')
    ]
  }),
  P('dumbbell-side-bend', 'Seitbeugen mit Kurzhantel', 'dumbbell', ['obliques'], ['lower-back', 'abs'], {
    confidence: 'medium', basis: 'EMG (andere Last: Wasserweste)',
    note: 'Hantel in einer Hand, langsam zur Seite neigen und mit der Gegenseite aufrichten. Kein Schwung, Seite wechseln. Auch am Kabel möglich.',
    others: ['Quadratus lumborum'],
    sources: [
      S('Kang & Park 2026, J Funct Morphol Kinesiol', '10.3390/jfmk11010089', 'Seitbeugen mit Wasserweste (8–16 kg): EMG von RA, EO, IO und Rückenstrecker steigt mit der Last. Hantel/Kabel selbst wurden nicht untersucht.'),
      S('Rabello et al. 2015, J Back Musculoskelet Rehabil', '10.3233/BMR-140508', 'Isometrisch am Dynamometer: Obliquus externus bei seitlicher Beugung weniger aktiv als bei Beugung nach vorn oder Rotation.')
    ]
  }),
  P('russian-twist', 'Russian Twist', 'bodyweight', ['obliques'], ['abs', 'hip-flexors'], {
    confidence: 'low', basis: 'Anatomie; keine EMG-Studie zum Russian Twist',
    note: 'Oberkörper leicht zurückgelehnt, aus dem Brustkorb drehen. Füße am Boden ist leichter. Zusatzgewicht optional, Bewegung kontrolliert.',
    others: ['Transversus abdominis'],
    sources: [
      S('Kumar et al. 2001, Eur J Appl Physiol', '10.1007/s004210100510', 'EMG bei isometrischer Rumpfrotation: Der gegenseitige Obliquus externus gehört zu den am stärksten aktivierten Muskeln (bei Männern).'),
      S('Bordoni & Varacallo 2026, StatPearls: Iliopsoas Muscle', 'https://www.ncbi.nlm.nih.gov/books/NBK531508/', 'Anatomie: Der Iliopsoas ist der Hauptbeuger der Hüfte und kann bei fixierten Beinen den Rumpf beugen.')
    ]
  }, 'bodyweight'),
  P('bicycle-crunch', 'Fahrrad-Crunch', 'bodyweight', ['obliques', 'abs'], ['hip-flexors'], {
    confidence: 'medium', basis: 'EMG (Pilates-Variante Criss-Cross) + Anatomie',
    note: 'Langsam: Schulter zum gegenüberliegenden Knie drehen, anderes Bein strecken. Unteren Rücken am Boden halten, nicht am Kopf ziehen.',
    others: ['Transversus abdominis'],
    sources: [
      S('Pereira et al. 2017, J Manipulative Physiol Ther', '10.1016/j.jmpt.2017.02.010', 'EMG: Criss-Cross (entspricht weitgehend dem Fahrrad-Crunch) zeigte unter drei Pilates-Übungen die höchste Aktivität von Rectus und Obliques.'),
      S('Bordoni & Varacallo 2026, StatPearls: Iliopsoas Muscle', 'https://www.ncbi.nlm.nih.gov/books/NBK531508/', 'Anatomie: Der Iliopsoas ist der Hauptbeuger des Oberschenkels. Er beugt die Hüfte beim Anziehen des Knies.')
    ]
  }, 'bodyweight'),
  P('standing-cable-hip-flexion', 'Hüftbeugen am Kabel (stehend)', 'cable', ['hip-flexors'], ['abs', 'obliques'], {
    confidence: 'medium', basis: 'EMG (Feindraht, isometrische Hüftbeugung) + Anatomie',
    note: 'Fußschlaufe am unteren Kabel, Knie gegen Widerstand bis Hüfthöhe heben. Becken ruhig halten, nicht nach hinten lehnen. Seite wechseln.',
    others: ['Tensor fasciae latae', 'Sartorius'],
    sources: [
      S('Juker et al. 1998, Med Sci Sports Exerc', '10.1097/00005768-199802000-00020', 'Feindraht-EMG am Psoas: Der höchste Wert trat bei maximaler Hüftbeugung auf. Eine Kabelübung wurde nicht getestet.'),
      S('Bordoni & Varacallo 2026, StatPearls: Iliopsoas Muscle', 'https://www.ncbi.nlm.nih.gov/books/NBK531508/', 'Anatomie: Iliopsoas als Hauptbeuger des Oberschenkels, zusätzlich beteiligt an Adduktion und Außenrotation.'),
      S('Hu et al. 2010, J Biomech', '10.1016/j.jbiomech.2009.09.035', 'Feindraht-EMG, Beinheben in Rückenlage: Iliacus v. a. auf der hebenden Seite, Psoas beidseitig. Bauchmuskeln arbeiten mit (Beckenhalt ist eine Vermutung).')
    ]
  }),
  P('dead-bug', 'Dead Bug', 'bodyweight', ['obliques'], ['abs', 'hip-flexors'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Rückenlage, Arme und Knie oben. Gegenüberliegenden Arm und Bein langsam strecken, unterer Rücken bleibt am Boden.',
    others: ['Transversus abdominis'],
    sources: [
      S('Pereira et al. 2017, J Manipulative Physiol Ther', '10.1016/j.jmpt.2017.02.010', 'EMG: Beim Dead Bug waren die Obliques stärker aktiv als Rectus abdominis und Multifidus. Gesamtaktivität niedriger als beim Criss-Cross.'),
      S('Hu et al. 2010, J Biomech', '10.1016/j.jbiomech.2009.09.035', 'Feindraht-EMG beim Beinheben in Rückenlage (andere Übung): Psoas/Iliacus aktiv, Bauchwand stabilisiert das Becken gegen den Zug der Hüftbeuger.')
    ]
  }, 'bodyweight'),
  P('l-sit', 'L-Sitz', 'bodyweight', ['hip-flexors', 'abs'], ['quads', 'triceps'], {
    confidence: 'medium', basis: 'EMG (Variante V-Sit) + Anatomie',
    note: 'Auf Barren oder Griffen stützen, Schultern nach unten, Beine gestreckt waagerecht halten. Leichter: Knie angewinkelt (Tuck).',
    others: ['Tensor fasciae latae', 'Unterer Trapezius'],
    sources: [
      S('Guimaraes et al. 1991, J Sports Med Phys Fitness', 'https://pubmed.ncbi.nlm.nih.gov/1836517/', 'Oberflächen-EMG: V-Sit und Beinheben im Hang zeigten die höchste Aktivität im unteren Rectus abdominis. Rectus femoris gemessen, Iliopsoas nicht.'),
      S('Devorski et al. 2021, J Sport Rehabil', '10.1123/jsr.2020-0485', 'EMG: Der V-Sit belastete vor allem die Bauchmuskeln und kaum Schulter- oder Rückenmuskeln. Hüftbeuger wurden nicht gemessen.'),
      S('Juker et al. 1998, Med Sci Sports Exerc', '10.1097/00005768-199802000-00020', 'Feindraht-EMG: Der Psoas ist bei Sit-ups deutlich und bei maximaler Hüftbeugung am stärksten aktiv. Das stützt die Rolle der Hüftbeuger.')
    ]
  }, 'bodyweight'),

  // ---------- Ohne Geräte (v3.4.0, Recherche 2026-10-26, Drive → Research - Bodyweight Pool 2026-10-26) ----------
  P('bodyweight-squat', 'Kniebeuge ohne Gewicht', 'bodyweight', ['quads', 'glutes'], ['adductors'], {
    confidence: 'medium', basis: 'Trainingsstudie (Programm aus 3 Übungen) + MRT (Langhantel, übertragen)',
    note: 'Füße etwa schulterbreit, so tief wie sauber möglich. Wird es zu leicht: langsamer (z. B. 4 s ab, 4 s auf), Pause unten oder einbeinig.',
    sources: [
      S('Tsuzuku et al. 2018, Scand J Med Sci Sports', '10.1111/sms.13039', 'RCT, ab 70 J.: 12 Wochen langsam (4 s je Phase) Kniebeuge, Tisch-Liegestütz, Sit-up – Oberschenkel dicker, Kniestreckkraft höher. Wirkung des ganzen Programms.'),
      S('Kubo et al. 2019, Eur J Appl Physiol', '10.1007/s00421-019-04181-y', 'MRT, Kniebeuge mit Langhantel: Quadrizeps, Adduktoren und großer Gesäßmuskel wuchsen. Für die Kniebeuge ohne Gewicht übertragen.')
    ]
  }, 'bodyweight'),
  P('bodyweight-reverse-lunge', 'Ausfallschritte rückwärts ohne Gewicht', 'bodyweight', ['quads', 'glutes'], ['adductors', 'abductors', 'hamstrings'], {
    confidence: 'medium', basis: 'Modell + EMG (Varianten, übertragen)',
    note: 'Schritt nach hinten, das vordere Bein trägt. Oberkörper leicht nach vorn geneigt verschiebt die Arbeit Richtung Gesäß und Beinbeuger.',
    sources: [
      S('Goulette et al. 2021, Phys Ther Sport', '10.1016/j.ptsp.2020.12.001', 'Modell: Rückwärts-Ausfallschritt mit geringerer Quadrizepskraft und Kniescheibenlast als vorwärts.'),
      S('Muyor et al. 2020, PLoS One', '10.1371/journal.pone.0230841', 'EMG, Ausfallschritt vorwärts (mit Zusatzlast): Vasti am aktivsten, dann Gesäßmuskeln. Rückwärts nicht gemessen.'),
      S('Farrokhi et al. 2008, J Orthop Sports Phys Ther', '10.2519/jospt.2008.2634', 'EMG, Ausfallschritt vorwärts: Oberkörper nach vorn erhöhte Aktivität von großem Gesäßmuskel und Bizeps femoris.')
    ]
  }, 'bodyweight'),
  P('bodyweight-glute-bridge', 'Glute Bridge ohne Gewicht', 'bodyweight', ['glutes'], ['hamstrings', 'abductors'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Rücken am Boden, Füße nah am Gesäß, oben kurz halten. Steigern: einbeinig. Knie stärker gebeugt → weniger Beinbeuger, Gesäß bleibt.',
    sources: [
      S('Khaiyat & Norris 2018, J Phys Ther Sci', '10.1589/jpts.30.642', 'Körpergewichts-Bridge: höchste Gesäß- und Bizeps-femoris-Aktivität unter fünf Reha-Übungen, aber nur moderate Werte.'),
      S('Lehecka et al. 2017, Int J Sports Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/28900560/', 'EMG, einbeinige Bridge (n = 28): Gesäßmuskeln etwa 47–58 % MVIC; mit 135° statt 90° Kniebeugung sank die Beinbeuger-Aktivität deutlich (≈ 23 % vs. 75 % MVIC).')
    ]
  }, 'bodyweight'),
  P('pike-push-up', 'Pike Push-up', 'bodyweight', ['front-delts'], ['triceps', 'side-delts'], {
    confidence: 'low', basis: 'Übertragung vom Schulterdrücken (keine Studie zur Übung gefunden)',
    note: 'Hüfte hoch, Kopf zwischen die Hände senken. Füße höher (z. B. Stufe) bringt mehr Gewicht auf die Schultern – Mechanik, nicht gemessen.',
    others: ['Serratus anterior'],
    sources: [
      S('Saeterbakken & Fimland 2013, J Strength Cond Res', '10.1519/JSC.0b013e318276b873', 'EMG beim Schulterdrücken: alle Schulteranteile und Trizeps aktiv. Für den Pike Push-up nur übertragen.'),
      S('Kohler et al. 2010, J Strength Cond Res', '10.1519/JSC.0b013e3181c8655a', 'EMG beim Schulterdrücken: vordere und seitliche Schulter sowie Trizeps als Hauptbeweger. Übertragen.')
    ]
  }, 'bodyweight'),
  P('prone-y-t-raise', 'Y/T-Heben in Bauchlage', 'bodyweight', ['upper-back'], ['rear-delts', 'side-delts'], {
    confidence: 'medium', basis: 'EMG (Trapezius) + Anatomie (Delta)',
    note: 'Bäuchlings Arme als Y über den Kopf oder als T zur Seite heben, Daumen oben. Ersetzt kein Rudern (dafür Band oder Stange).',
    others: ['unterer und mittlerer Trapezius (Schwerpunkt)'],
    sources: [
      S('Ekstrom et al. 2003, J Orthop Sports Phys Ther', '10.2519/jospt.2003.33.5.247', 'EMG (n = 30): Armheben über Kopf in Bauchlage (Y) mit maximalem unteren Trapezius; Armheben zur Seite mit Außenrotation (T) und Y mit stärkstem mittleren.'),
      S('Elzanie & Varacallo 2024, StatPearls', 'https://www.ncbi.nlm.nih.gov/books/NBK537056/', 'Anatomie: hinterer und mittlerer Delta beim Armheben beteiligt; hier nur abgeleitet.')
    ]
  }, 'bodyweight'),

  // ---------- Cardio ----------
  // v1.8 Runde 3: Muskeln nur in `involved` (Infoblatt), nicht in `muscles` – Cardio zählt nicht für die Muskelkarte.
  P('treadmill-running', 'Laufband (Laufen)', 'machine', [], [], {
    confidence: 'medium', basis: 'EMG',
    note: 'Not-Aus-Clip an der Kleidung befestigen und frei laufen, ohne dich an den Griffen festzuhalten.',
    involved: { primary: ['quads', 'glutes', 'calves'], secondary: ['hamstrings', 'hip-flexors'] },
    sources: [
      S('Swanson & Caldwell 2000, Med Sci Sports Exerc', '10.1097/00005768-200006000-00018', 'EMG am Laufband eben vs. 30 % Steigung: Waden, Quadrizeps, Gesäß bergauf in der Standphase aktiver, Hamstrings weniger; Hüftbeuger arbeiten in der Schwungphase.'),
      S('Esculier et al. 2015, Gait Posture', '10.1016/j.gaitpost.2015.02.020', 'EMG beim Laufbandlaufen von Gesäß, Quadrizeps und Soleus; diese Muskeln gelten als repräsentativ fürs Laufen.')
    ]
  }, 'cardio'),
  P('incline-treadmill-walking', 'Gehen am Laufband mit Steigung', 'machine', [], [], {
    confidence: 'medium', basis: 'EMG',
    note: 'Steigung schrittweise erhöhen, frei gehen ohne Festhalten an den Griffen. Mehr Steigung und Tempo fordern Gesäß und Waden stärker.',
    involved: { primary: ['glutes', 'quads', 'calves'], secondary: ['hamstrings', 'lower-back'] },
    sources: [
      S('Franz & Kram 2012, Gait Posture', '10.1016/j.gaitpost.2011.08.025', 'Laufband bis +9°: Hüft-, Knie- und Sprunggelenkstrecker (Gesäß, Beinbeuger, Quadrizeps, Waden) deutlich aktiver als eben, verstärkt bei höherem Tempo.'),
      S('Kundu et al. 2024, Int J Exerc Sci', '10.70252/GMWV8349', 'Steiles Gehen am Laufband erhöht die integrierte EMG u. a. von Gesäß, Vastus lateralis, Waden und Rückenstrecker.')
    ]
  }, 'cardio'),
  P('stationary-bike', 'Fahrradergometer', 'machine', [], [], {
    confidence: 'high', basis: 'MRT + EMG',
    note: 'Sattelhöhe etwa auf Höhe des seitlichen Hüftknochens (Trochanter) einstellen. Ein zu tiefer Sattel belastet das Knie stärker.',
    others: ['Tibialis anterior'],
    involved: { primary: ['quads'], secondary: ['glutes', 'hamstrings', 'calves'] },
    sources: [
      S('Harber et al. 2012, J Appl Physiol', '10.1152/japplphysiol.00786.2012', '12 Wochen Ergometertraining bei untrainierten Männern (7 junge, 6 ältere): Quadrizepsvolumen im MRT um ca. 5–6 % größer.'),
      S('Bing et al. 2024, Biomed Eng Online', '10.1186/s12938-024-01199-y', 'EMG am Ergometer: Rectus femoris und Bizeps femoris steigen mit der Last, die Wade mit der Sattelhöhe; ca. 100 % Trochanterhöhe ist sinnvoll.'),
      S('Bouillon et al. 2016, Int J Sports Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/27104052/', 'Vergleich von Ergometer, Liegerad, Laufband und ElliptiGO: Gesäß und Beinbeuger nur gering bis mäßig aktiv, Wade am aufrechten Rad am höchsten.')
    ]
  }, 'cardio'),
  P('rowing-machine', 'Rudergerät', 'machine', [], [], {
    confidence: 'medium', basis: 'EMG',
    note: 'Reihenfolge: erst Beine, dann Rumpf, dann Arme. Rücken neutral halten, bei Ermüdung nicht rund werden.',
    others: ['Brachioradialis'],
    involved: { primary: ['quads', 'lats'], secondary: ['glutes', 'hamstrings', 'lower-back', 'biceps', 'upper-back', 'calves'] },
    sources: [
      S('Gerževič et al. 2011, J Strength Cond Res', '10.1519/JSC.0b013e3181fb4111', 'EMG von 10 Muskeln am Ruderergometer: Beinstrecker, Schultergürtelstrecker (Latissimus) und Armbeuger sind am stärksten gefordert, Rumpf- und Hüftstrecker weniger.'),
      S('Bazzucchi et al. 2013, Eur J Appl Physiol', '10.1007/s00421-012-2550-2', 'Bei Elite-Ruderern sind Trapezius, Latissimus, Bizeps und Quadrizeps am Ergometer stärker aktiv als im Boot.'),
      S('Nugent et al. 2021, Br J Sports Med', '10.1136/bjsports-2020-102533', 'Review: Gesunde Ruderer arbeiten überwiegend mit den Rumpfstreckern. Ermüdung erhöht die Lendenbeugung beim Auslagepunkt, am Ergometer stärker.')
    ]
  }, 'cardio'),
  P('elliptical-trainer', 'Crosstrainer', 'machine', [], [], {
    confidence: 'medium', basis: 'EMG',
    note: 'Aufrecht stehen und die ganze Fußsohle auf dem Pedal lassen. Die Haltegriffe nur zum Mitschwingen nutzen, nicht zum Abstützen.',
    others: ['Tibialis anterior'],
    involved: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves', 'abductors'] },
    sources: [
      S('Burnfield et al. 2010, Phys Ther', '10.2522/ptj.20090033', 'Crosstrainer vs. Gehen (20 Gesunde): großer Gesäß und Vastus aktiver, Waden und innere Beinbeuger weniger, aber deutlich aktiv. Einteilung nach Vergleich mit Gehen.')
    ]
  }, 'cardio'),
  P('stair-stepper', 'Treppensteiger / Stepper', 'machine', [], [], {
    confidence: 'medium', basis: 'EMG',
    note: 'Aufrecht steigen und das Körpergewicht nicht auf die Griffe stützen. Ganze Stufen nutzen statt kurzer Trippelschritte.',
    involved: { primary: ['quads'], secondary: ['glutes', 'hamstrings', 'calves'] },
    sources: [
      S('You et al. 2020, Gait Posture', '10.1016/j.gaitpost.2020.02.003', 'EMG am Steptrainer: Vastus lateralis und Bizeps femoris arbeiten gemeinsam (Ko-Aktivierung), dazu Kniekräfte gemessen. Vergleich mit einem seitlich schwingenden Gerät.'),
      S('Halder et al. 2018, Ergonomics', '10.1080/00140139.2018.1473644', 'Treppenmaschine bei drei Steigtempi: EMG der Beinmuskeln steigt mit dem Tempo, lokale Ermüdung begrenzt die Dauer.')
    ]
  }, 'cardio'),
  P('ski-erg', 'SkiErg', 'machine', [], [], {
    confidence: 'medium', basis: 'EMG (Doppelstockschub auf Rollski) + Biomechanik',
    note: 'Zug aus Rumpf und Hüfte einleiten und die Knie leicht mitbeugen, nicht nur aus den Armen ziehen.',
    others: ['Teres major', 'Beinmuskulatur (unspezifisch)'],
    involved: { primary: ['lats', 'triceps'], secondary: ['chest', 'abs'] },
    sources: [
      S('Lindinger et al. 2009, Eur J Appl Physiol', '10.1007/s00421-009-1018-5', 'EMG beim Doppelstockschub (Rollski, Laufband): Trizeps, Latissimus, großer Brustmuskel und Teres major aktiv, mit dem Tempo steigend.'),
      S('Danielsen et al. 2015, Med Sci Sports Exerc', '10.1249/MSS.0000000000000723', 'Am Skiergometer leisten Beine und Rumpf einen großen Teil der Muskelarbeit, v. a. in der Erholungsphase vor dem Stockeinsatz.'),
      S('Bucher et al. 2018, Eur J Appl Physiol', '10.1007/s00421-018-3938-4', 'Gezielte Ermüdung der Rumpfmuskeln senkt die Leistung im Doppelstockschub am Skiergometer deutlich, der Rumpf ist also maßgeblich beteiligt.')
    ]
  }, 'cardio'),
  P('air-bike', 'Air Bike (Assault Bike)', 'machine', [], [], {
    confidence: 'low', basis: 'Biomechanik (Rad- + Armkurbel-Studien, kein Air-Bike-EMG)',
    note: 'Sattel wie am Ergometer einstellen und die Griffe gleichmäßig drücken und ziehen. Der Luftwiderstand steigt, je schneller du trittst.',
    involved: { primary: ['quads'], secondary: ['glutes', 'hamstrings', 'biceps', 'triceps'] },
    sources: [
      S('Harber et al. 2012, J Appl Physiol', '10.1152/japplphysiol.00786.2012', 'Reines Beinkurbeln (Ergometer) vergrößert den Quadrizeps im MRT. Übertragung auf das Air Bike ist eine Ableitung.'),
      S('Vegter et al. 2021, Front Physiol', '10.3389/fphys.2021.599514', 'Beim Armkurbeln nutzen Personen v. a. die Armbeuger (Ziehen), die Armstrecker (Drücken) oder beides, je nach individueller Strategie.')
    ]
  }, 'cardio'),
];

export function poolEntry(ref) {
  return POOL.find((p) => p.ref === ref) || null;
}

// Pool-Eintrag → neue Übung in der eigenen Bibliothek (neue UUID, Quelle = builtin).
export function exerciseFromPool(entry, overrides = {}) {
  return createExercise({
    name: entry.name,
    kind: entry.kind,
    muscles: { primary: [...entry.muscles.primary], secondary: [...entry.muscles.secondary] },
    defaultWorkSets: entry.defaultWorkSets,
    source: { origin: 'builtin', ref: entry.ref, verification: entry.verification, checkedAt: POOL_CHECKED_AT },
    ...overrides
  });
}

// Welche Pool-Einträge sind bereits (nicht archiviert) in der Bibliothek?
export function poolRefsInLibrary(exercises) {
  return new Set(exercises.filter((e) => !e.archived && e.source?.origin === 'builtin' && e.source.ref).map((e) => e.source.ref));
}
