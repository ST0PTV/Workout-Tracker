// Infos zu den Muskelgruppen (ℹ-Button). Eigene Texte; Fakten aus den angegebenen Quellen,
// geprüft am CHECKED_AT. Physiopedia ist ein Wiki und gilt als mittel belastbar.
export const MUSCLE_INFO_CHECKED_AT = '2026-10-13';

const TMA = (path, title) => ({ label: `TeachMeAnatomy: ${title}`, url: `https://teachmeanatomy.info/${path}` });
const KH = (slug, title) => ({ label: `Kenhub: ${title}`, url: `https://www.kenhub.com/en/library/anatomy/${slug}` });

export const MUSCLE_INFO = {
  chest: {
    includes: 'Großer Brustmuskel (Pectoralis major) mit Schlüsselbein- und Brustbeinanteil; darunter der kleine Brustmuskel.',
    location: 'Vordere Brustwand, vom Schlüsselbein und Brustbein zum Oberarm.',
    functions: ['Zieht den Arm zum Körper heran und dreht ihn nach innen.', 'Oberer Anteil hebt den Arm nach vorne.', 'Unterer Anteil führt den gehobenen Arm wieder nach unten.'],
    sources: [{ label: 'StatPearls: Pectoralis Major (Solari & Burns 2023)', url: 'https://www.ncbi.nlm.nih.gov/books/NBK525991/' }, TMA('upper-limb/muscles/pectoral-region/', 'Muscles of the Pectoral Region')]
  },
  'front-delts': {
    includes: 'Vorderer Anteil des Deltamuskels (Pars clavicularis).',
    location: 'Vorderseite der Schulter, vom äußeren Schlüsselbein zum Oberarm.',
    functions: ['Hebt den Arm nach vorne.', 'Dreht den Arm nach innen.', 'Führt den Arm vor dem Körper zusammen (Quelle: Physiopedia).'],
    sources: [TMA('upper-limb/muscles/shoulder/intrinsic/', 'Intrinsic Muscles of the Shoulder'), { label: 'Physiopedia: Deltoid (Wiki)', url: 'https://www.physio-pedia.com/Deltoid' }]
  },
  'side-delts': {
    includes: 'Seitlicher Anteil des Deltamuskels (Pars acromialis).',
    location: 'Außenseite der Schulter, vom Schulterdach (Akromion) zum Oberarm.',
    functions: ['Hauptmuskel beim seitlichen Heben des Arms.', 'Die ersten etwa 15° übernimmt der Supraspinatus der Rotatorenmanschette.', 'Alle Deltaanteile stabilisieren den Oberarmkopf.'],
    sources: [TMA('upper-limb/muscles/shoulder/intrinsic/', 'Intrinsic Muscles of the Shoulder'), { label: 'Physiopedia: Deltoid (Wiki)', url: 'https://www.physio-pedia.com/Deltoid' }]
  },
  'rear-delts': {
    includes: 'Hinterer Anteil des Deltamuskels (Pars spinalis).',
    location: 'Rückseite der Schulter, von der Schulterblattgräte zum Oberarm.',
    functions: ['Führt den Arm nach hinten.', 'Dreht den Arm nach außen.', 'Zieht den vorgehobenen Arm seitlich nach hinten (Quelle: Physiopedia).'],
    sources: [TMA('upper-limb/muscles/shoulder/intrinsic/', 'Intrinsic Muscles of the Shoulder'), { label: 'Physiopedia: Deltoid (Wiki)', url: 'https://www.physio-pedia.com/Deltoid' }]
  },
  lats: {
    includes: 'Breiter Rückenmuskel (Latissimus dorsi); der Teres major arbeitet mit ihm zusammen.',
    location: 'Großer, flacher Muskel am unteren und seitlichen Rücken, von Wirbelsäule und Becken zur Vorderseite des Oberarms.',
    functions: ['Zieht den Arm nach unten, nach hinten und zum Körper.', 'Dreht den Arm nach innen.', 'Zieht bei festgehaltenen Armen (Klimmzug) den Körper nach oben.'],
    sources: [{ label: 'StatPearls: Latissimus Dorsi (Jeno & Varacallo 2023)', url: 'https://www.ncbi.nlm.nih.gov/books/NBK448120/' }, TMA('upper-limb/muscles/shoulder/extrinsic/', 'Extrinsic Muscles of the Shoulder')]
  },
  'upper-back': {
    includes: 'Trapezmuskel (oberer, mittlerer, unterer Anteil) und die Rhomboiden.',
    location: 'Oberer Rücken und Nacken, von Hinterkopf und Wirbelsäule zu Schlüsselbein und Schulterblatt.',
    functions: ['Oberer Trapez: hebt das Schulterblatt und dreht es beim Armheben mit.', 'Mittlerer Trapez und Rhomboiden: ziehen die Schulterblätter zusammen.', 'Unterer Trapez: zieht das Schulterblatt nach unten.'],
    sources: [TMA('upper-limb/muscles/shoulder/extrinsic/', 'Extrinsic Muscles of the Shoulder')]
  },
  'lower-back': {
    includes: 'Rückenstrecker (Erector spinae) mit Iliocostalis, Longissimus und Spinalis.',
    location: 'Beidseits entlang der Wirbelsäule, vom Kreuzbein bis zu Rippen, Wirbeln und Hinterkopf.',
    functions: ['Beidseitig: streckt die Wirbelsäule.', 'Einseitig: neigt den Rumpf zur Seite.', 'Hält die Wirbelsäule über dem Becken stabil, z. B. beim Gehen und beim vorgebeugten Rudern.'],
    sources: [KH('erector-spinae-muscles', 'Erector spinae muscles')]
  },
  biceps: {
    includes: 'Armbeuger: Bizeps (Biceps brachii, langer und kurzer Kopf) und der darunterliegende Brachialis.',
    location: 'Vorderseite des Oberarms.',
    functions: ['Beugt den Ellbogen; der Brachialis ist dabei der stärkste Beuger.', 'Bizeps dreht den Unterarm nach außen (Handfläche nach oben), am stärksten bei gebeugtem Ellbogen.', 'Langer Kopf überquert das Schultergelenk und hilft schwach beim Armheben.'],
    sources: [KH('biceps-brachii-muscle', 'Biceps brachii muscle'), KH('brachialis-muscle', 'Brachialis muscle')]
  },
  triceps: {
    includes: 'Trizeps (Triceps brachii) mit langem, seitlichem und innerem Kopf.',
    location: 'Rückseite des Oberarms, zum Ellbogenhöcker.',
    functions: ['Streckt den Ellbogen.', 'Der lange Kopf überquert die Schulter und zieht den Arm nach hinten und zum Körper.'],
    sources: [KH('triceps-brachii-muscle', 'Triceps brachii muscle')]
  },
  forearms: {
    includes: 'Beuger (Innenseite) und Strecker (Außenseite) von Handgelenk und Fingern sowie der Brachioradialis.',
    location: 'Unterarm, von den Knochenvorsprüngen am Ellbogen zu Hand und Fingern.',
    functions: ['Beugen bzw. strecken Handgelenk und Finger – wichtig für den Griff.', 'Drehen den Unterarm.', 'Brachioradialis beugt den Ellbogen, besonders im Hammergriff.'],
    sources: [TMA('upper-limb/muscles/anterior-forearm/', 'Anterior Compartment of the Forearm'), TMA('upper-limb/muscles/posterior-forearm/', 'Posterior Compartment of the Forearm')]
  },
  abs: {
    includes: 'Gerader Bauchmuskel (Rectus abdominis).',
    location: 'Vorderer Bauch, vom Schambein zu Brustbein und unteren Rippen; Sehnenstreifen ergeben das „Sixpack“.',
    functions: ['Beugt den Rumpf nach vorne.', 'Kontrolliert die Beckenkippung.', 'Erhöht den Druck im Bauchraum, z. B. beim kräftigen Ausatmen.'],
    sources: [KH('rectus-abdominis-muscle', 'Rectus abdominis muscle'), TMA('abdomen/muscles/abdominal-wall/', 'Anterolateral Abdominal Wall')]
  },
  obliques: {
    includes: 'Äußerer und innerer schräger Bauchmuskel.',
    location: 'Seitlicher Bauch, in zwei Schichten mit gekreuztem Faserverlauf.',
    functions: ['Drehen den Rumpf: der äußere zur Gegenseite, der innere zur gleichen Seite.', 'Neigen den Rumpf zur Seite.', 'Beidseitig: beugen den Rumpf und spannen die Bauchwand.'],
    sources: [KH('external-abdominal-oblique-muscle', 'External abdominal oblique muscle'), KH('internal-abdominal-oblique-muscle', 'Internal abdominal oblique muscle')]
  },
  glutes: {
    includes: 'Großer Gesäßmuskel (Gluteus maximus).',
    location: 'Gesäß; größter und oberflächlichster Gesäßmuskel, vom Becken zum Oberschenkel.',
    functions: ['Wichtigster Hüftstrecker.', 'Dreht den Oberschenkel nach außen.', 'Obere Fasern helfen beim seitlichen Abspreizen, untere beim Heranziehen.'],
    sources: [KH('gluteus-maximus-muscle', 'Gluteus maximus muscle'), TMA('lower-limb/muscles/gluteal-region/', 'Muscles of the Gluteal Region')]
  },
  quads: {
    includes: 'Quadrizeps: Rectus femoris und die drei Vasti (lateralis, medialis, intermedius).',
    location: 'Vorderseite des Oberschenkels, über die Kniescheibe zum Schienbein.',
    functions: ['Streckt das Knie.', 'Rectus femoris überquert auch die Hüfte und beugt sie.', 'Die Vasti stabilisieren die Kniescheibe.'],
    sources: [TMA('lower-limb/muscles/thigh/anterior-compartment', 'Muscles of the Anterior Thigh')]
  },
  hamstrings: {
    includes: 'Beinbeuger: Biceps femoris (langer und kurzer Kopf), Semitendinosus, Semimembranosus.',
    location: 'Rückseite des Oberschenkels, vom Sitzbein zu Schien- und Wadenbein.',
    functions: ['Beugen das Knie.', 'Strecken die Hüfte (außer dem kurzen Bicepskopf).', 'Drehen Unterschenkel und Hüfte nach außen bzw. innen.'],
    sources: [TMA('lower-limb/muscles/thigh/hamstrings', 'Posterior Compartment of the Thigh'), { label: 'Woodley & Storey 2013: Review of hamstring anatomy (Aspetar)', url: 'https://journal.aspetar.com/en/journals/volume-2-targeted-topic-hamstring-injuries/review-of-hamstring-anatomy' }]
  },
  adductors: {
    includes: 'Adduktor magnus, longus und brevis, Gracilis (Pectineus hilft mit).',
    location: 'Innenseite des Oberschenkels, vom Schambein und Sitzbein zum Oberschenkel.',
    functions: ['Ziehen das Bein zur Körpermitte.', 'Der hintere Anteil des Adduktor magnus streckt die Hüfte – deshalb arbeiten die Adduktoren bei tiefen Kniebeugen und Kreuzheben mit.', 'Gracilis beugt zusätzlich das Knie.'],
    sources: [TMA('lower-limb/muscles/thigh/medial-compartment', 'Medial Compartment of the Thigh')]
  },
  abductors: {
    includes: 'Gluteus medius und minimus, Tensor fasciae latae.',
    location: 'Außenseite der Hüfte, vom Beckenkamm zum großen Rollhügel des Oberschenkels.',
    functions: ['Spreizen das Bein seitlich ab.', 'Halten das Becken beim Gehen und Stehen auf einem Bein waagerecht.', 'Tensor fasciae latae hilft zusätzlich beim Hüftbeugen.'],
    sources: [TMA('lower-limb/muscles/gluteal-region/', 'Muscles of the Gluteal Region'), KH('tensor-fasciae-latae-muscle', 'Tensor fasciae latae muscle')]
  },
  calves: {
    includes: 'Wadenmuskel (Gastrocnemius, zwei Köpfe) und Schollenmuskel (Soleus).',
    location: 'Rückseite des Unterschenkels, über die Achillessehne zur Ferse.',
    functions: ['Heben die Ferse (Fußspitzenstand).', 'Gastrocnemius überquert auch das Knie, der Soleus nicht.', 'Stehend trainiert vor allem den Gastrocnemius, sitzend vor allem den Soleus (MRT-Studie).'],
    sources: [KH('triceps-surae-muscle', 'Triceps surae'), TMA('lower-limb/muscles/leg/posterior-compartment', 'Posterior Compartment of the Leg'), { label: 'Kinoshita, Maeo et al. 2023, Front Physiol', url: 'https://doi.org/10.3389/fphys.2023.1272106' }]
  },
  'hip-flexors': {
    includes: 'Iliopsoas (Psoas major und Iliacus); Rectus femoris und Tensor fasciae latae helfen mit.',
    location: 'Tief im Becken und an der Vorderseite der Hüfte, von Lendenwirbelsäule und Becken zum Oberschenkel.',
    functions: ['Beugen die Hüfte (Knie zur Brust, Beine heben).', 'Iliopsoas ist der wichtigste Hüftbeuger.'],
    sources: [TMA('lower-limb/muscles/thigh/anterior-compartment', 'Muscles of the Anterior Thigh'), { label: 'StatPearls: Iliopsoas Muscle', url: 'https://www.statpearls.com/point-of-care/23367' }]
  }
};
