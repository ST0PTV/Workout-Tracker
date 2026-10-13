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
