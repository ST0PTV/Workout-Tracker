// Warm-up- und Cool-down-Routinen (v2.3.0): Übungskatalog, feste Vorlagen, Info-Texte mit Quellen.
// Recherche 2026-10-16 (Drive → Research - Warm-up and Cool-down); alle Quellen unten per PubMed-Abstract geprüft.
// Konventionen, keine Studienvorgaben: Vorlagen-Zeiten, Wiederholungszahlen, Haltezeiten, Muskelzuordnung (Anatomie).
// Katalog-Übungen sind keine Kraftübungen: sie zählen nicht als Sätze, nicht ins Volumen und nicht in die Muskelkarte.
export const ROUTINES_CHECKED_AT = '2026-10-16';

export const PHASES = { warmup: 'Aufwärmen', cooldown: 'Cool-down', mobility: 'Mobility' }; // v3.5.0: Mobility als eigener Bereich (Nutzerwunsch)
export const ITEM_TYPES = { cardio: 'Locker (Cardio)', dynamic: 'Dynamisch', activation: 'Aktivierung', stretch: 'Dehnen' };

// Dosis: time = Dauer in s; reps = Wiederholungen; hold = Haltezeit in s × Runden. perSide = je Seite.
const T = (seconds) => ({ mode: 'time', seconds, reps: null, rounds: 1, perSide: false });
const R = (reps, perSide = false) => ({ mode: 'reps', seconds: null, reps, rounds: 1, perSide });
const H = (seconds, rounds, perSide = true) => ({ mode: 'hold', seconds, reps: null, rounds, perSide });
const I = (ref, name, type, phase, primary, secondary, dose, cue, equipment = 'none') =>
  ({ ref, name, type, phase, muscles: { primary, secondary }, dose, cue, equipment });

export const ROUTINE_ITEMS = [
  // Locker (allgemeines Aufwärmen / Auslaufen) – keine Muskelzuordnung, Piktogramm = Puls
  I('cardio-bike', 'Ergometer locker', 'cardio', 'both', [], [], T(300), 'Locker treten, du kannst dabei noch sprechen.', 'machine'),
  I('cardio-row', 'Rudergerät locker', 'cardio', 'both', [], [], T(300), 'Ruhige Züge, locker, ohne Endspurt.', 'machine'),
  I('cardio-walk', 'Zügig gehen / Laufband', 'cardio', 'both', [], [], T(300), 'Zügig gehen oder locker auf dem Laufband.', 'machine'),
  I('jumping-jacks', 'Hampelmann', 'cardio', 'warmup', ['calves'], ['side-delts', 'abductors'], T(45), 'Locker springen, Arme seitlich über den Kopf.'),
  // Dynamisch
  I('arm-circles', 'Armkreisen', 'dynamic', 'warmup', ['front-delts', 'side-delts'], ['rear-delts'], T(30), 'Große, ruhige Kreise, nach der Hälfte die Richtung wechseln.'),
  I('arm-swings', 'Arm-Swings über Kreuz', 'dynamic', 'warmup', ['chest', 'rear-delts'], ['upper-back'], R(15), 'Arme vor der Brust kreuzen und weit öffnen.'),
  I('band-pull-apart', 'Band Pull-Apart', 'activation', 'warmup', ['rear-delts', 'upper-back'], [], R(15), 'Band vor der Brust auseinanderziehen, Schulterblätter zusammen.', 'band'),
  I('wall-slide', 'Wall Slides', 'activation', 'warmup', ['upper-back', 'rear-delts'], ['side-delts'], R(10), 'Rücken an die Wand, Arme langsam nach oben schieben.', 'wall'),
  I('cat-cow', 'Katze-Kuh', 'dynamic', 'both', ['lower-back'], ['upper-back', 'abs'], R(8), 'Im Vierfüßlerstand Rücken langsam rund und hohl machen.', 'mat'),
  I('thoracic-rotation', 'Brustwirbel-Rotation', 'dynamic', 'warmup', ['upper-back', 'obliques'], [], R(6, true), 'Im Vierfüßlerstand eine Hand an den Kopf, Ellbogen zur Decke drehen.', 'mat'),
  I('inchworm', 'Inchworm', 'dynamic', 'warmup', ['hamstrings', 'abs'], ['front-delts', 'chest'], R(4), 'Mit den Händen nach vorn in den Stütz laufen und zurück.'),
  I('leg-swing-front', 'Beinschwingen vorwärts', 'dynamic', 'warmup', ['hamstrings', 'hip-flexors'], ['glutes'], R(10, true), 'Festhalten, Bein locker vor und zurück schwingen.'),
  I('leg-swing-side', 'Beinschwingen seitlich', 'dynamic', 'warmup', ['adductors', 'abductors'], [], R(10, true), 'Festhalten, Bein vor dem Körper seitlich schwingen.'),
  I('hip-circles', 'Hüftkreisen', 'dynamic', 'warmup', ['hip-flexors', 'glutes'], ['abductors', 'adductors'], T(30), 'Hände in die Hüfte, große Kreise, Richtung nach der Hälfte wechseln.'),
  I('worlds-greatest', "World's Greatest Stretch", 'dynamic', 'warmup', ['hip-flexors', 'hamstrings'], ['glutes', 'obliques', 'upper-back'], R(4, true), 'Großer Ausfallschritt, Ellbogen zum Fuß, dann Arm zur Decke drehen.'),
  I('lunge-rotation', 'Ausfallschritt mit Rotation', 'dynamic', 'warmup', ['quads', 'glutes'], ['obliques', 'hip-flexors'], R(5, true), 'Ausfallschritt, Oberkörper zum vorderen Bein drehen.'),
  I('bw-squat', 'Kniebeuge ohne Gewicht', 'dynamic', 'warmup', ['quads', 'glutes'], ['adductors'], R(10), 'Langsam und so tief, wie es angenehm ist.'),
  I('hip-hinge', 'Hip-Hinge ohne Gewicht', 'dynamic', 'warmup', ['hamstrings', 'glutes'], ['lower-back'], R(10), 'Hüfte nach hinten schieben, Rücken lang, Knie leicht gebeugt.'),
  // v3.4.0: Armübungen ohne Gewicht – nur zur Beweglichkeit (ohne Last kaum Kraftreiz, deshalb nicht im Übungspool)
  I('shoulder-press-bw', 'Schulterdrücken ohne Gewicht', 'dynamic', 'both', ['front-delts', 'side-delts'], ['triceps'], R(10), 'Hände auf Schulterhöhe, Arme langsam nach oben strecken. Auch im Sitzen.'),
  I('lateral-raise-bw', 'Seitheben ohne Gewicht', 'dynamic', 'both', ['side-delts'], ['upper-back'], R(10), 'Arme seitlich bis Schulterhöhe heben, langsam senken. Auch im Sitzen.'),
  I('front-raise-bw', 'Frontheben ohne Gewicht', 'dynamic', 'both', ['front-delts'], ['side-delts'], R(10), 'Arme gestreckt nach vorn bis Schulterhöhe heben, langsam senken.'),
  I('triceps-back-bw', 'Trizeps nach hinten ohne Gewicht', 'dynamic', 'both', ['triceps'], ['rear-delts'], R(10), 'Oberkörper leicht vor, Arme gestreckt nach hinten führen, kurz halten.'),
  I('wrist-curl-bw', 'Unterarm-Curl ohne Gewicht', 'dynamic', 'both', ['forearms'], [], R(10), 'Unterarme auf den Oberschenkeln, Handflächen oben: Hände heben und senken.'),
  I('reverse-wrist-curl-bw', 'Umgekehrter Unterarm-Curl ohne Gewicht', 'dynamic', 'both', ['forearms'], [], R(10), 'Wie Unterarm-Curl, Handrücken oben: Hände langsam heben und senken.'),
  // v3.4.0: weitere Übungen fürs Mobilitätsprogramm (Nutzerwunsch, 20 Wdh.); zählen wie alle Katalog-Übungen nicht als Sätze
  I('biceps-curl-bw', 'Bizeps-Curl ohne Gewicht', 'dynamic', 'both', ['biceps'], ['forearms'], R(10), 'Ellbogen am Körper, Hände langsam zur Schulter beugen und senken.'),
  I('chair-squat-mob', 'Kniebeuge auf den Stuhl', 'dynamic', 'both', ['quads', 'glutes'], ['adductors'], R(10), 'Stuhl hinter dir, Gesäß nach hinten, kurz antippen, wieder aufstehen.', 'chair'),
  I('lunge-mob', 'Ausfallschritt', 'dynamic', 'both', ['quads', 'glutes'], ['hamstrings'], R(10), 'Abwechselnd links und rechts nach hinten treten, bei Bedarf festhalten.'),
  I('crunch-mob', 'Crunch (Rumpfbeuge)', 'dynamic', 'both', ['abs'], ['obliques'], R(10), 'Rückenlage, Knie gebeugt, Schultern langsam etwas anheben und senken.', 'mat'),
  I('balance-calf-raise-mob', 'Balanceboard-Wadenheben', 'activation', 'both', ['calves'], [], R(10), 'Auf dem Board, Hand an der Wand, langsam auf die Zehen und ab.', 'balance board'),
  I('door-push-up-mob', 'Türrahmen-Push-up', 'dynamic', 'both', ['chest'], ['triceps', 'front-delts'], R(10), 'Hände am Türrahmen auf Brusthöhe, Körper gerade nach vorn kippen.', 'wall'),
  // Aktivierung
  I('glute-bridge', 'Glute Bridge', 'activation', 'warmup', ['glutes'], ['hamstrings'], R(12), 'Rückenlage, Becken anheben, oben kurz halten.', 'mat'),
  I('calf-raise-bw', 'Wadenheben ohne Gewicht', 'activation', 'warmup', ['calves'], [], R(15), 'Auf die Zehenspitzen und langsam wieder ab.'),
  // Statisches Dehnen (Haltezeit × Runden, meist je Seite)
  I('stretch-chest-door', 'Brustdehnung am Türrahmen', 'stretch', 'cooldown', ['chest'], ['front-delts'], H(30, 2), 'Unterarm an den Rahmen, Oberkörper sanft wegdrehen.', 'wall'),
  I('stretch-lat', 'Latdehnung am Rack', 'stretch', 'cooldown', ['lats'], ['triceps'], H(30, 2), 'Mit einer Hand festhalten, Hüfte nach hinten-seitlich schieben.'),
  I('stretch-rear-delt', 'Schulter quer vor der Brust', 'stretch', 'cooldown', ['rear-delts'], ['upper-back'], H(30, 2), 'Arm quer vor die Brust, mit der anderen Hand sanft heranziehen.'),
  I('stretch-triceps', 'Trizepsdehnung über Kopf', 'stretch', 'cooldown', ['triceps'], ['lats'], H(30, 2), 'Hand zwischen die Schulterblätter, Ellbogen sanft zur Mitte.'),
  I('stretch-forearm', 'Unterarmdehnung', 'stretch', 'cooldown', ['forearms'], ['biceps'], H(30, 2), 'Arm gestreckt, Finger mit der anderen Hand sanft zurückziehen.'),
  I('stretch-quad', 'Quadrizepsdehnung stehend', 'stretch', 'cooldown', ['quads'], ['hip-flexors'], H(30, 2), 'Ferse zum Gesäß, Knie zeigt nach unten, festhalten.'),
  I('stretch-hamstring', 'Beinbeuger-Dehnung stehend', 'stretch', 'cooldown', ['hamstrings'], ['calves'], H(30, 2), 'Ferse auf eine niedrige Stufe, Rücken lang nach vorn neigen.'),
  I('stretch-hip-flexor', 'Hüftbeuger halbkniend', 'stretch', 'cooldown', ['hip-flexors'], ['quads'], H(30, 2), 'Halbkniestand, Becken leicht nach vorn schieben.', 'mat'),
  I('stretch-figure4', 'Gesäßdehnung liegend (Figur 4)', 'stretch', 'cooldown', ['glutes'], ['abductors'], H(30, 2), 'Rückenlage, Knöchel aufs andere Knie, Bein sanft heranziehen.', 'mat'),
  I('stretch-butterfly', 'Schmetterling (Adduktoren)', 'stretch', 'cooldown', ['adductors'], [], H(30, 2, false), 'Sitzend Fußsohlen zusammen, Knie sinken lassen.', 'mat'),
  I('stretch-calf', 'Wadendehnung an der Wand', 'stretch', 'cooldown', ['calves'], [], H(30, 2), 'Hinteres Bein gestreckt, Ferse am Boden, zur Wand lehnen.', 'wall'),
  I('stretch-child', 'Kindhaltung', 'stretch', 'cooldown', ['lats', 'lower-back'], ['upper-back'], H(30, 2, false), 'Auf die Fersen setzen, Arme weit nach vorn.', 'mat'),
  I('stretch-side', 'Seitliche Rumpfdehnung', 'stretch', 'cooldown', ['obliques', 'lats'], [], H(30, 2), 'Stehend einen Arm über den Kopf, sanft zur Seite neigen.')
];

// v3.6.0: Routine-Übungen mit Technik-Animation (Referenz in js/anim-data.js). Nur Übungen, die ohne Zusatzgewicht gezeigt werden.
export const ANIM_REF = { 'chair-squat-mob': 'chair-squat', 'door-push-up-mob': 'door-frame-push-up', 'balance-calf-raise-mob': 'balance-board-calf-raise', 'hip-circles': 'hip-circles' };

export const ITEM_BY_REF = Object.fromEntries(ROUTINE_ITEMS.map((x) => [x.ref, x]));

// Vorlagen: Zeiten sind Konvention (Recherche Teil C), nicht Studienvorgabe. Aufwärmen bewusst locker.
const it = (ref, over = {}) => ({ ref, ...over });
const tpl = (key, name, phase, minutes, focus, items, note) => ({ id: `tpl:${key}`, template: true, name, phase, minutes, focus, items, note });

export const TEMPLATES = [
  tpl('wu-full-5', 'Ganzkörper 5 min', 'warmup', 5, 'full', [
    it('cardio-bike', { seconds: 150 }), it('arm-circles'), it('leg-swing-front'), it('bw-squat')
  ], 'Kurz und locker. Danach 1–3 leichte Sätze der ersten Übung.'),
  tpl('wu-full-10', 'Ganzkörper 10 min', 'warmup', 10, 'full', [
    it('cardio-bike', { seconds: 240 }), it('arm-circles'), it('arm-swings'), it('leg-swing-front'), it('leg-swing-side'),
    it('hip-circles'), it('worlds-greatest', { reps: 3 }), it('glute-bridge')
  ], 'Locker. Danach 1–3 leichte Sätze der ersten Übung.'),
  tpl('wu-full-15', 'Ganzkörper 15 min', 'warmup', 15, 'full', [
    it('cardio-bike', { seconds: 420 }), it('arm-circles'), it('arm-swings'), it('wall-slide'), it('cat-cow'),
    it('leg-swing-front'), it('leg-swing-side'), it('hip-circles'), it('worlds-greatest'), it('bw-squat'), it('glute-bridge')
  ], 'Nicht besser als 5–10 min, nur mehr Zeit – z. B. für kalte Tage. Locker bleiben.'),
  tpl('wu-lower-10', 'Unterkörper 10 min', 'warmup', 10, 'lower', [
    it('cardio-bike', { seconds: 240 }), it('leg-swing-front'), it('leg-swing-side'), it('hip-circles'),
    it('bw-squat'), it('hip-hinge'), it('glute-bridge'), it('calf-raise-bw')
  ], 'Für Beintage. Danach 1–3 leichte Sätze der ersten Übung.'),
  tpl('wu-upper-10', 'Oberkörper 10 min', 'warmup', 10, 'upper', [
    it('cardio-row', { seconds: 300 }), it('arm-circles'), it('arm-swings'), it('band-pull-apart'),
    it('wall-slide'), it('thoracic-rotation'), it('cat-cow'), it('inchworm')
  ], 'Für Oberkörpertage. Danach 1–3 leichte Sätze der ersten Übung.'),
  tpl('cd-relax-5', 'Entspannen 5 min', 'cooldown', 5, 'full', [
    it('cardio-walk', { seconds: 90 }), it('stretch-hip-flexor', { rounds: 1 }), it('stretch-chest-door', { rounds: 1 }), it('stretch-child')
  ], 'Optional. Zum Runterkommen – nicht gegen Muskelkater.'),
  tpl('cd-relax-10', 'Entspannen 10 min', 'cooldown', 10, 'full', [
    it('cardio-walk', { seconds: 60 }), it('stretch-quad'), it('stretch-hamstring'), it('stretch-hip-flexor'),
    it('stretch-chest-door', { rounds: 1 }), it('stretch-child')
  ], 'Optional. Zum Runterkommen – nicht gegen Muskelkater.'),
  tpl('mob-arms-5', 'Beweglichkeit Arme & Hände 5 min', 'mobility', 5, 'upper', [
    it('arm-circles'), it('shoulder-press-bw'), it('lateral-raise-bw'), it('front-raise-bw'), it('triceps-back-bw'),
    it('wrist-curl-bw'), it('reverse-wrist-curl-bw')
  ], 'Sanft und ohne Gewicht, im Stehen oder Sitzen. Auch allein startbar. Hält beweglich, ist aber kein Krafttraining.'),
  tpl('mob-full-15', 'Mobilitätsprogramm 15 min', 'mobility', 15, 'full', [
    it('biceps-curl-bw', { reps: 20 }), it('shoulder-press-bw', { reps: 20 }), it('lateral-raise-bw', { reps: 20 }), it('chair-squat-mob', { reps: 20 }),
    it('lunge-mob', { reps: 20 }), it('crunch-mob', { reps: 20 }), it('hip-circles', { seconds: 60 }), it('balance-calf-raise-mob', { reps: 20 }),
    it('triceps-back-bw', { reps: 20 }), it('door-push-up-mob', { reps: 20 }), it('wrist-curl-bw', { reps: 20 }), it('reverse-wrist-curl-bw', { reps: 20 }),
    it('front-raise-bw', { reps: 20 })
  ], 'Je 20 Wiederholungen, Hüftkreisen 1 min. Ruhig und ohne Gewicht, bei Bedarf festhalten. Zählt nicht als Krafttraining.'),
  tpl('cd-mobility-15', 'Beweglichkeit 15 min', 'cooldown', 15, 'full', [
    it('cardio-walk', { seconds: 120 }), it('stretch-hamstring', { rounds: 3 }), it('stretch-hip-flexor', { rounds: 3 }),
    it('stretch-figure4', { rounds: 3 }), it('stretch-chest-door', { rounds: 3 })
  ], 'Wenige Muskeln, dafür länger. Für Beweglichkeit zählt eher die Dehnzeit pro Woche als eine einzelne Einheit.')
];

export const ROUTINE_INFO = {
  short: {
    warmup: [
      'Kurz und locker aufwärmen – länger ist nicht automatisch besser.',
      'Dann 1–3 leichte Sätze der ersten Übung.',
      'Optional: zählt nicht als Sätze und nicht in die Muskelkarte.'
    ],
    cooldown: [
      'Optional: für Erholung und Muskelkater bringt es kaum etwas.',
      'Dehnen verbessert über Wochen die Beweglichkeit.',
      'Bis zum Zuggefühl dehnen, nicht in den Schmerz.'
    ],
    mobility: [
      'Ruhige Bewegungen ohne Gewicht, im Stehen oder Sitzen – auch ohne Plan startbar.',
      'Zählt nicht als Sätze, nicht ins Volumen und nicht in die Muskelkarte.',
      'Nur so weit bewegen, wie es angenehm ist, nicht in den Schmerz.'
    ]
  },
  mobility: [
    'Mobility-Routinen sind ruhige Bewegungsfolgen ohne Zusatzgewicht. Sie ersetzen kein Krafttraining.',
    'Ohne Last ist der Kraftreiz gering. Das ist Trainingswissen, nicht per Studie geprüft – deshalb zählen die Übungen nicht als Sätze.',
    'Was Dehnen über Wochen für die Beweglichkeit bringt, steht in der Info zum Cool-down.'
  ],
  warmup: [
    'Wärmere Muskeln verbessern in Studien schnelle Kraft und Leistung, aber nicht die Maximalkraft.',
    'In einer Studie mit 16 Kraftsportlern senkten 15 min Aufwärmen bei mittlerer Intensität das 1RM leicht; 15 min locker erhöhten es leicht, 5 min änderten nichts. Darum ist das Aufwärmen hier locker angelegt – länger heißt nicht automatisch besser.',
    'Dynamisches Dehnen direkt vor dem Training verschlechterte die Leistung im Mittel nicht, eher leicht besser.',
    'Statisches Dehnen unter 60 s pro Muskel hatte kaum Einfluss auf die Leistung; 60 s und mehr pro Muskel senkte die Kraft kurzzeitig stärker.',
    'Ob Aufwärmen im Krafttraining Verletzungen vorbeugt, ist nicht untersucht. Ein Review zu Aufwärmen für den Oberkörper fand dazu keine einzige Studie.',
    'Spezifisch aufwärmen: 1–3 leichte Sätze der ersten Übung. Das ist eine Empfehlung aus einem narrativen Review (Expertenmeinung).'
  ],
  cooldown: [
    'Lockeres Auslaufen verbessert die meisten Erholungswerte und die Leistung am Folgetag kaum und beugt nach heutigem Stand keinen Verletzungen vor.',
    'Dehnen vor oder nach dem Sport verringert Muskelkater nicht in nennenswertem Ausmaß.',
    'Ein Expertenkonsens empfiehlt Dehnen nicht zur Erholung, nicht für Muskelaufbau und nicht als allgemeinen Verletzungsschutz – wohl aber für die Beweglichkeit.',
    'Regelmäßiges Dehnen über Wochen verbessert die Beweglichkeit. Zur besten Dosis sind die Studien uneinheitlich; eine große Meta-Analyse fand keinen Zusatznutzen über etwa 10 min Dehnen pro Woche hinaus.',
    'Krafttraining mit Zusatzgewicht verbessert die Beweglichkeit ähnlich wie Dehnen.',
    'Richtwert der ACSM: pro Dehnübung insgesamt etwa 60 s, an mindestens 2 Tagen pro Woche.',
    'Dehne bis zu einem Zuggefühl, nicht in den Schmerz. Stärkeres Dehnen brachte in einer Meta-Analyse nicht mehr Beweglichkeit.'
  ],
  rules: [
    'Aufwärmen und Cool-down sind optional. Sie zählen nicht als Sätze, nicht ins Volumen und nicht in die Muskelkarte.',
    'Die Zeiten der Vorlagen (5, 10, 15 min), Wiederholungen und Haltezeiten sind Konvention, keine Studienvorgabe. Die Muskelzuordnung der Übungen folgt der Anatomie (Trainingswissen, nicht einzeln geprüft).',
    'Bei Schmerzen, frischen Verletzungen oder Gelenkproblemen vorher ärztlich oder physiotherapeutisch abklären (Sicherheitskonvention, keine Studie).'
  ],
  sources: [
    { label: 'Wilson, Nunes, Blazevich et al. 2025, J Sport Health Sci (Meta-Analyse)', url: 'https://doi.org/10.1016/j.jshs.2025.101024', note: '33 Studien, n = 921: höhere Muskeltemperatur verbessert schnelle Kraft und Leistung, nicht die Maximalkraft. Abstract geprüft.' },
    { label: 'Barroso et al. 2013, J Strength Cond Res (RCT, Crossover)', url: 'https://doi.org/10.1519/JSC.0b013e3182606cd9', note: '16 Kraftsportler, Beinpresse-1RM: 15 min locker +3 %, 15 min mittel −4 %, 5 min ohne Unterschied. Eine Studie. Abstract geprüft.' },
    { label: 'Behm, Blazevich, Kay & McHugh 2016, Appl Physiol Nutr Metab (Systematic Review)', url: 'https://doi.org/10.1139/apnm-2015-0235', note: 'Statisch −3,7 %, dynamisch +1,3 %; ≥ 60 s statisch pro Muskel −4,6 %, < 60 s −1,1 %. Abstract geprüft.' },
    { label: 'Warneke & Lohmann 2024, J Sport Health Sci (Meta-Analyse)', url: 'https://doi.org/10.1016/j.jshs.2024.05.002', note: '83 Studien: kleiner Kraftverlust nach statischem Dehnen, deutlich bei ≥ 60 s pro Durchgang; sportliche Leistung insgesamt nicht verschlechtert. Abstract geprüft.' },
    { label: 'McCrary, Ackermann & Halaki 2015, Br J Sports Med (Systematic Review)', url: 'https://doi.org/10.1136/bjsports-2014-094228', note: 'Aufwärmen für den Oberkörper: keine Studie zur Verletzungsvorbeugung gefunden. Abstract geprüft.' },
    { label: 'Iversen, Norum, Schoenfeld & Fimland 2021, Sports Med (Narrative Review)', url: 'https://doi.org/10.1007/s40279-021-01490-1', note: 'Empfiehlt, sich auf übungsspezifisches Aufwärmen zu beschränken, und Dehnen nur bei Beweglichkeitsziel. Expertenmeinung. Abstract geprüft.' },
    { label: 'Van Hooren & Peake 2018, Sports Med (Narrative Review)', url: 'https://doi.org/10.1007/s40279-018-0916-2', note: 'Aktives Cool-down weitgehend wirkungslos für Leistung und die meisten Erholungswerte; keine Verletzungsvorbeugung. Abstract geprüft.' },
    { label: 'Herbert, de Noronha & Kamper 2011, Cochrane Review', url: 'https://doi.org/10.1002/14651858.CD004577.pub3', note: '12 Studien: Dehnen vor oder nach dem Sport senkt Muskelkater nicht in klinisch relevantem Ausmaß. Abstract geprüft.' },
    { label: 'Warneke, Thomas, Blazevich et al. 2025, J Sport Health Sci (Delphi-Konsens)', url: 'https://doi.org/10.1016/j.jshs.2025.101067', note: '20 Fachleute: Dehnen verbessert Beweglichkeit; nicht empfohlen für Muskelaufbau, Erholung oder als allgemeiner Verletzungsschutz. Abstract geprüft.' },
    { label: 'Konrad, Alizadeh, Daneshjoo et al. 2024, J Sport Health Sci (Meta-Analyse)', url: 'https://doi.org/10.1016/j.jshs.2023.06.002', note: '77 Studien: Dehntraining verbessert Beweglichkeit; Umfang, Intensität und Häufigkeit ohne messbaren Einfluss. Abstract geprüft.' },
    { label: 'Thomas, Bianco, Paoli & Palma 2018, Int J Sports Med (Review)', url: 'https://doi.org/10.1055/s-0044-101146', note: 'Wöchentliche Dehnzeit (≥ 5 min) und Häufigkeit hängen mit mehr Beweglichkeit zusammen. Abstract geprüft.' },
    { label: 'Ingram, Tomkinson, d’Unienville et al. 2025, Sports Med (Meta-Analyse)', url: 'https://doi.org/10.1007/s40279-024-02143-9', note: '189 Studien: Beweglichkeit maximal bei etwa 4 min pro Einheit bzw. 10 min pro Woche, darüber kein Zusatznutzen. Abstract geprüft.' },
    { label: 'Alizadeh, Daneshjoo, Zahiri et al. 2023, Sports Med (Meta-Analyse)', url: 'https://doi.org/10.1007/s40279-022-01804-x', note: '55 Studien: Krafttraining verbessert Beweglichkeit wie Dehnen (nicht mit reinem Körpergewicht). Abstract geprüft.' },
    { label: 'Garber et al. 2011, Med Sci Sports Exerc (ACSM Position Stand)', url: 'https://doi.org/10.1249/MSS.0b013e318213fefb', note: 'Leitlinie: Dehnübungen je Muskelgruppe insgesamt 60 s, an ≥ 2 Tagen pro Woche. Abstract geprüft.' },
    { label: 'Behm, Alizadeh, Daneshjoo et al. 2023, Sports Med Open (Meta-Analyse)', url: 'https://doi.org/10.1186/s40798-023-00652-x', note: '47 Studien: einmaliges Dehnen verbessert Beweglichkeit leicht; Dehnintensität ohne Einfluss. Abstract geprüft.' }
  ]
};
