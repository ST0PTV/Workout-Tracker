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
  sources: info.sources
});

// Mehrfach genutzte Quellen
const CORATELLA_2019 = S('Coratella et al. 2019, Eur J Sport Sci', '10.1080/17461391.2019.1655101', 'EMG: Schrägbank 45° aktiviert den oberen Brustanteil am stärksten; Maschinenpresse und Flachbank ähnlich für den mittleren Anteil.');
const BERGQUIST_2018 = S('Bergquist et al. 2018, J Hum Kinet', '10.1515/hukin-2017-0137', 'EMG: Fliegende und Reverse Flys – Brust bzw. hintere Schulter als Hauptmuskel, Schulteranteile deutlich beteiligt.');
const LEHMAN_2004 = S('Lehman et al. 2004, Dyn Med', '10.1186/1476-5918-3-4', 'EMG: Latzug mit hohem Latissimus-Anteil; Rudern sitzend mit der höchsten Aktivität von mittlerem Trapez/Rhomboiden.');
const SAETERBAKKEN_2015 = S('Saeterbakken et al. 2015, Int J Sports Med', '10.1055/s-0034-1398646', 'EMG: freies vorgebeugtes Rudern belastet den unteren Rücken deutlich stärker als Rudern an der Maschine.');
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
    note: 'Je steiler die Bank, desto mehr vordere Schulter.',
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
      S('McKenzie et al. 2022, IJERPH', '10.3390/ijerph192114390', 'EMG: Brust, Trizeps und vordere Schulter als bewegende Muskeln.')
    ]
  }, 'bodyweight'),
  P('push-up', 'Liegestütz', 'bodyweight', ['chest'], ['triceps', 'front-delts', 'abs'], {
    confidence: 'high', basis: 'EMG (Übersichtsarbeiten)',
    note: 'Der Bauch arbeitet stabilisierend, nicht bewegend.',
    others: ['Serratus anterior'],
    sources: [
      S('Kowalski et al. 2021, Shoulder & Elbow (Scoping Review)', '10.1177/17585732211019373', 'Review: Trizeps und Brust mit der höchsten Aktivierung im Standard-Liegestütz.'),
      S('Calatayud et al. 2014, Phys Sportsmed', '10.3810/psm.2014.11.2097', 'EMG: Liegestütz fordert die Rumpfmuskulatur stärker als Bankdrücken.')
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
  P('lateral-raise-dumbbell', 'Seitheben', 'dumbbell', ['side-delts'], ['upper-back', 'front-delts'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Daumen nach oben → mehr vordere Schulter; Daumen nach unten → mehr hintere Schulter.',
    others: ['Supraspinatus (Rotatorenmanschette)'],
    sources: [
      S('Coratella et al. 2020, IJERPH', '10.3390/ijerph17176015', 'EMG: seitliche Schulter am stärksten; Armrotation verschiebt die Arbeit deutlich zu vorderer bzw. hinterer Schulter.')
    ]
  }),
  P('reverse-pec-deck', 'Reverse Butterfly', 'machine', ['rear-delts'], ['upper-back', 'side-delts'], {
    confidence: 'medium', basis: 'EMG',
    others: ['Infraspinatus (Rotatorenmanschette)'],
    sources: [
      S('Schoenfeld et al. 2013, J Strength Cond Res', '10.1519/JSC.0b013e318281e1e9', 'EMG: hintere und seitliche Schulter an der Reverse-Fly-Maschine; neutraler Griff mit mehr hinterer Schulter.'),
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

  // v1.5 Runde 1 (Recherche 2026-10-13, Drive → Research & Sources Abschnitt 6)
  P('cable-lateral-raise', 'Seitheben am Kabel', 'cable', ['side-delts'], ['front-delts', 'rear-delts', 'upper-back'], {
    confidence: 'high', basis: 'Ultraschall (Wachstum) + EMG',
    note: 'Kabel tief, Zug von vorne-unten oder hinter dem Körper; Arm bis ca. Schulterhöhe, kontrolliert absenken.',
    others: ['Supraspinatus (Rotatorenmanschette)'],
    sources: [
      S('Larsen et al. 2025, Front Physiol', '10.3389/fphys.2025.1611468', '8 Wochen, ein Arm Kabel, ein Arm Kurzhantel: Seitliche Deltamuskeldicke (Ultraschall) wuchs bei beiden etwa gleich stark.'),
      S('Campos et al. 2020, J Hum Kinet', '10.2478/hukin-2020-0033', 'EMG (Kurzhantel-Variante): Seitheben aktiviert den mittleren Delta am stärksten, den hinteren Delta deutlich mit.'),
      S('Andersen et al. 2008, Phys Ther', '10.2522/ptj.20070304', 'EMG: Seitheben bringt neben dem Deltamuskel eine sehr hohe Aktivität im oberen Trapezius.')
    ]
  }),
  P('machine-lateral-raise', 'Seitheben an der Maschine', 'machine', ['side-delts'], ['front-delts', 'rear-delts', 'upper-back'], {
    confidence: 'medium', basis: 'Ultraschall + EMG naher Varianten',
    note: 'Drehpunkt auf Höhe des Schultergelenks einstellen; Polster am Unterarm/Ellbogen, Schultern unten lassen.',
    others: ['Supraspinatus (Rotatorenmanschette)'],
    sources: [
      S('Larsen et al. 2025, Front Physiol', '10.3389/fphys.2025.1611468', 'Kabel und Kurzhantel lassen den seitlichen Delta gleich gut wachsen; das Lastprofil scheint zweitrangig (Maschine nicht getestet).'),
      S('Coratella et al. 2020, IJERPH', '10.3390/ijerph17176015', 'EMG bei Bodybuildern: Seitheben-Varianten aktivieren v. a. mittleren Delta; gebeugter Ellbogen senkt dessen Aktivität etwas.')
    ]
  }),
  P('standing-barbell-overhead-press', 'Schulterdrücken mit der Langhantel stehend', 'barbell', ['front-delts'], ['side-delts', 'triceps', 'upper-back', 'abs', 'lower-back'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Stange vom Schlüsselbein senkrecht über den Kopf, Kopf kurz zurück; Gesäß und Bauch fest, kein Hohlkreuz.',
    others: ['Serratus anterior'],
    sources: [
      S('Saeterbakken & Fimland 2013, J Strength Cond Res', '10.1519/JSC.0b013e318276b873', 'EMG: Stehend mehr Aktivität im mittleren/hinteren Delta als sitzend; Langhantel mit mehr Trizeps, Kurzhantel mehr vorderer Delta.'),
      S('Campos et al. 2020, J Hum Kinet', '10.2478/hukin-2020-0033', 'EMG: Schulterdrücken aktiviert den vorderen Delta am stärksten und den mittleren Delta fast so stark wie Seitheben.'),
      S('Williams et al. 2020, J Strength Cond Res', '10.1519/JSC.0000000000002660', 'EMG beim stehenden Langhanteldrücken inkl. Rumpf- und Schulterblattstabilisatoren (Rückenstrecker, Bauch, Serratus).')
    ]
  }),
  P('machine-shoulder-press', 'Schulterdrücken an der Maschine', 'machine', ['front-delts'], ['side-delts', 'triceps', 'upper-back'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Sitz so einstellen, dass Griffe auf Schulterhöhe starten; Rücken an der Lehne, nicht ganz durchstrecken.',
    others: ['Serratus anterior'],
    sources: [
      S('Kim et al. 2026, J Clin Med', '10.3390/jcm15103925', 'EMG am Maschinen-Schulterdrücken: Deltamuskel, Trizeps und oberer Trapezius aktiv; Fokus auf Zielmuskel erhöht dessen Aktivität.'),
      S('Saeterbakken & Fimland 2013, J Strength Cond Res', '10.1519/JSC.0b013e318276b873', 'EMG: Sitzende, stabilere Varianten zeigen weniger Deltaaktivität als stehende, erlauben aber mehr Last.')
    ]
  }),
  P('dumbbell-front-raise', 'Frontheben', 'dumbbell', ['front-delts'], ['chest', 'upper-back'], {
    confidence: 'medium', basis: 'EMG + Anatomie',
    note: 'Kurzhanteln mit leicht gebeugtem Ellbogen bis Schulterhöhe heben; nicht schwingen. Auch am Kabel möglich.',
    sources: [
      S('Coratella et al. 2020, IJERPH', '10.3390/ijerph17176015', 'EMG: Frontheben aktiviert vorderen Delta und oberen Brustmuskel stärker als alle Seitheben-Varianten; mittlerer/hinterer Delta gering.'),
      S('Elzanie & Varacallo 2024, StatPearls', 'https://www.ncbi.nlm.nih.gov/books/NBK537056/', 'Anatomie: Vorderer Delta beugt den Arm gemeinsam mit dem großen Brustmuskel.')
    ]
  }),
  P('barbell-upright-row', 'Aufrechtes Rudern', 'barbell', ['side-delts', 'upper-back'], ['front-delts', 'rear-delts', 'biceps', 'forearms'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Griff mind. schulterbreit (breit = mehr Delta); Ellbogen führen, nur bis etwa Schulterhöhe ziehen. Auch am Kabel.',
    sources: [
      S('McAllister et al. 2013, J Strength Cond Res', '10.1519/JSC.0b013e31824f23ad', 'EMG: Breiterer Griff erhöht Aktivität von Delta und Trapezius und senkt die Bizepsaktivität.'),
      S('Andersen et al. 2008, Phys Ther', '10.2522/ptj.20070304', 'EMG: Aufrechtes Rudern aktiviert Trapezius und Deltamuskel hoch, mit relativ geringer Last.')
    ]
  }),
  P('dumbbell-reverse-fly', 'Vorgebeugtes Seitheben', 'dumbbell', ['rear-delts'], ['upper-back', 'side-delts'], {
    confidence: 'medium', basis: 'EMG + Modell',
    note: 'Oberkörper fast waagrecht oder Brust auf Schrägbank; Arme seitlich nach außen öffnen, Schultern nicht hochziehen.',
    others: ['Infraspinatus', 'Teres minor'],
    sources: [
      S('Andersen et al. 2008, Phys Ther', '10.2522/ptj.20070304', 'EMG: Reverse Flys aktivieren Deltamuskel und Trapezius in relevanter Höhe.'),
      S('Zhu et al. 2026, Acta Bioeng Biomech', '10.37190/abb/217836', 'Muskelmodell (OpenSim): Vorgebeugtes Seitheben erzeugt hohe Kraft im hinteren Delta, ähnlich Face Pull, mehr als Rudern.')
    ]
  }),
  P('cable-reverse-fly', 'Reverse Fly am Kabel', 'cable', ['rear-delts'], ['upper-back', 'side-delts'], {
    confidence: 'medium', basis: 'EMG naher Variante + Anatomie',
    note: 'Kabel über Kreuz auf Schulterhöhe greifen, Arme fast gestreckt nach außen-hinten ziehen; neutraler Griff möglich.',
    others: ['Infraspinatus', 'Teres minor'],
    sources: [
      S('Schoenfeld et al. 2013, J Strength Cond Res', '10.1519/JSC.0b013e318281e1e9', 'EMG an der Reverse-Fly-Maschine: neutraler Griff steigert Aktivität von hinterem Delta und Infraspinatus.'),
      S('Rabello et al. 2022, J Bodyw Mov Ther', '10.1016/j.jbmt.2022.12.002', 'Systematische Übersicht (EMG): horizontale Abduktionen aktivieren mittleren und hinteren Delta stark.')
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
      S('Youdas et al. 2010, J Strength Cond Res', '10.1519/JSC.0b013e3181f1598c', 'EMG: Latissimus am stärksten, dann Bizeps; unterer Trapez mittel.'),
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
      S('Fenwick, Brown & McGill 2009, J Strength Cond Res', '10.1519/JSC.0b013e3181942019', 'EMG: hohe Aktivierung vom oberen bis zum unteren Rücken, höchste Last auf der Lendenwirbelsäule.'),
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
      S('Fischer et al. 2025, J Electromyogr Kinesiol', '10.1016/j.jelekin.2025.103025', 'EMG beim Rudern in Bauchlage: mittlerer Trapez, hintere Schulter, Latissimus, Bizeps.'),
      SAETERBAKKEN_2015
    ]
  }),
  P('deadlift', 'Kreuzheben', 'barbell', ['glutes', 'hamstrings', 'lower-back'], ['quads', 'adductors', 'upper-back', 'forearms'], {
    confidence: 'medium', basis: 'EMG (Review), Modell',
    note: 'Der Quadrizeps ist laut EMG oft stark aktiv, vor allem beim Abheben; die Rangfolge der Hauptmuskeln ist umstritten.',
    sources: [
      S('Martín-Fuentes et al. 2020, PLoS One (Systematic Review)', '10.1371/journal.pone.0229507', 'Review: unterer Rücken und Quadrizeps oft stärker aktiv als Gesäß und Beinbeuger; große Unterschiede zwischen Studien.'),
      S('Escamilla et al. 2002, Med Sci Sports Exerc', '10.1097/00005768-200204000-00019', 'EMG: Quadrizeps, Gesäß, Beinbeuger, Rückenstrecker, Trapez, Waden und Adduktoren tragen bei.'),
      S('Krings et al. 2021, J Strength Cond Res', '10.1519/JSC.0000000000002954', 'EMG: Unterarme und Trapez beim maximalen Kreuzheben deutlich aktiv (Griff).')
    ]
  }),

  // ---------- Beine ----------
  P('back-squat', 'Kniebeuge', 'barbell', ['quads', 'glutes'], ['adductors', 'lower-back'], {
    confidence: 'high', basis: 'MRT-Trainingsstudien; unterer Rücken nur EMG',
    note: 'Tiefe Kniebeugen mit mehr Wachstum von Gesäß und Adduktoren. Der untere Rücken stabilisiert.',
    sources: [
      S('Kubo, Ikebukuro & Yata 2019, Eur J Appl Physiol', '10.1007/s00421-019-04181-y', 'MRT: Kniebeugen ließen Quadrizeps (ohne Rectus femoris), Adduktoren und großen Gesäßmuskel wachsen, die Beinbeuger nicht.'),
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
      S('Kinoshita, Maeo et al. 2023, Front Physiol', '10.3389/fphys.2023.1272106', 'MRT: Wadenheben stehend ließ beide Gastrocnemius-Köpfe und den Soleus wachsen.')
    ]
  }),

  // v1.5 Runde 1 (Recherche 2026-10-13, Drive → Research & Sources Abschnitt 6)
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
  P('clamshell-band', 'Clamshell mit Band', 'bodyweight', ['abductors', 'glutes'], ['hip-flexors'], {
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
  P('copenhagen-plank', 'Copenhagen Plank', 'bodyweight', ['adductors'], ['obliques'], {
    confidence: 'high', basis: 'EMG + Kraft-RCT',
    note: 'Seitstütz, oberes Bein auf Bank. Kurzer Hebel: Knie aufgelegt; langer Hebel: Fuß aufgelegt. Hüfte dynamisch heben/senken.',
    others: ['Hüftstabilisatoren des unteren Beins'],
    sources: [
      S('Serner et al. 2013, Br J Sports Med', '10.1136/bjsports-2012-091746', 'Unter 8 Adduktionsübungen gehörte die Copenhagen-Adduktion zu den intensivsten für den Adductor longus.'),
      S('Harøy et al. 2017, Am J Sports Med', '10.1177/0363546517720194', 'RCT, 8 Wo.: Copenhagen-Adduktion steigerte die exzentrische Adduktionskraft um ca. 9 %; Wachstum nicht gemessen.')
    ]
  }),
  P('cable-hip-adduction', 'Adduktion am Kabel', 'cable', ['adductors'], [], {
    confidence: 'medium', basis: 'EMG (Variante: Gummiband)',
    note: 'Seitlich zum Kabelturm, Manschette am inneren Knöchel. Bein vor dem Standbein vorbeiziehen, Oberkörper ruhig.',
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
      S('Andersen et al. 2021, J Sports Sci Med', '10.52082/jssm.2021.181', '45°-Bank: höchste Bizeps-femoris-Aktivität, Gesäß ähnlich hoch wie beim RDL, Rückenstrecker gleich stark wie RDL und Maschine.'),
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
      S('Stastny et al. 2015, J Strength Cond Res', '10.1519/JSC.0000000000000976', 'EMG: Hantel in der Gegenhand beim gehenden Ausfallschritt aktiviert den Gluteus medius sehr stark (ca. 90 % MVIC).')
    ]
  }),
  P('front-squat', 'Frontkniebeuge', 'barbell', ['quads'], ['glutes', 'adductors', 'lower-back', 'upper-back', 'abs'], {
    confidence: 'medium', basis: 'EMG',
    note: 'Hantel vorn auf den Schultern, Ellbogen hoch, Oberkörper aufrecht. Weniger Kniedruck als hinten, Last meist geringer.',
    sources: [
      S('Yavuz et al. 2015, J Sports Sci', '10.1080/02640414.2014.984240', 'EMG bei Maximallast: Vastus medialis in der Frontkniebeuge aktiver, Semitendinosus in der Rückenkniebeuge; Oberkörper aufrechter.'),
      S('Gullett et al. 2009, J Strength Cond Res', '10.1519/JSC.0b013e31818546bb', 'Muskelaktivität insgesamt ähnlich wie Rückenkniebeuge, aber geringere Kompressionskräfte und Kniestreckmomente.'),
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
      S('Goulette et al. 2021, Phys Ther Sport', '10.1016/j.ptsp.2020.12.001', 'Modell: Vorwärts-Ausfallschritt mit höherer Quadrizepskraft und Kniescheibenlast als rückwärts (20 Frauen).')
    ]
  }),
  P('dumbbell-reverse-lunge', 'Ausfallschritte rückwärts', 'dumbbell', ['quads', 'glutes'], ['adductors', 'abductors', 'hamstrings'], {
    confidence: 'medium', basis: 'Modell + EMG (Variante)',
    note: 'Schritt nach hinten, vorderes Bein trägt die Last. Knieschonender als vorwärts und leichter zu balancieren.',
    sources: [
      S('Goulette et al. 2021, Phys Ther Sport', '10.1016/j.ptsp.2020.12.001', 'Modell: Rückwärts-Ausfallschritt mit geringerer Quadrizepskraft, Kniescheibenlast und Belastungsrate als vorwärts.'),
      S('Muyor et al. 2020, PLoS One', '10.1371/journal.pone.0230841', 'EMG (Vorwärts-Variante): Vasti am aktivsten, danach Gluteus medius und maximus – Muskelverteilung ähnlich.')
    ]
  }),

  // ---------- Arme ----------
  P('dumbbell-curl', 'Bizepscurls', 'dumbbell', ['biceps'], ['forearms'], {
    confidence: 'high', basis: 'EMG',
    sources: [
      S('Uysal et al. 2026, BMC Sports Sci Med Rehabil', '10.1186/s13102-026-01867-7', 'EMG: Brachioradialis (Unterarm) beim Curl ähnlich aktiv wie der Bizeps.'),
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
      S('Rendos et al. 2016, J Strength Cond Res', '10.1519/JSC.0000000000001293', 'EMG: Griffart veränderte die Unterarm-, nicht die Trizepsaktivität.')
    ]
  }),
  P('overhead-triceps-extension', 'Überkopf-Trizepsstrecken', 'cable', ['triceps'], [], {
    confidence: 'high', basis: 'MRT-Trainingsstudie',
    note: 'Überkopf wächst besonders der lange Kopf, die anderen Köpfe aber ebenfalls stärker.',
    sources: [
      S('Maeo et al. 2022, Eur J Sport Sci', '10.1080/17461391.2022.2100279', 'MRT: Überkopf-Training ließ den langen Trizepskopf etwa 1,5-mal stärker wachsen als Training mit hängendem Arm.')
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
    note: 'Die Hüftbeuger heben die Beine; der Bauch kippt das Becken und stabilisiert. Gestreckte Beine belasten die Wirbelsäule stark.',
    sources: [
      S('McGill, Andersen & Cannon 2014, J Sports Sci', '10.1080/02640414.2014.946437', 'EMG: sehr hohe Aktivität von geradem und äußerem schrägem Bauchmuskel, hohe Wirbelsäulenlast.'),
      S('Escamilla et al. 2006, Phys Ther', 'https://pubmed.ncbi.nlm.nih.gov/16649890/', 'EMG: hängendes Knieheben unter den stärksten Übungen für gerade und schräge Bauchmuskeln.'),
      S('StatPearls: Iliopsoas Muscle', 'https://www.statpearls.com/point-of-care/23367', 'Anatomie: Iliopsoas ist der wichtigste Hüftbeuger.')
    ]
  }, 'bodyweight')
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
