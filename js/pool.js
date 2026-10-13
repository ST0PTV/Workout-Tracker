// Startpool: Grundübungen zum Übernehmen in die eigene Bibliothek.
// Namen und Muskelzuordnungen sind selbst geschrieben (nichts aus fremden Datenbanken kopiert).
// Status aller Zuordnungen: "training-knowledge" (anatomisches Standardwissen, noch NICHT per Quelle geprüft).
// Prüfung erfolgt paketweise; dann verification auf "verified" setzen und checkedAt + Quelle in Drive eintragen.
//
// equipment dient nur Anzeige und Filter im Pool; es wird nicht in die Übung übernommen.
import { createExercise } from './model.js';

export const EQUIPMENT = {
  barbell: 'Langhantel',
  dumbbell: 'Kurzhantel',
  machine: 'Maschine',
  cable: 'Kabelzug',
  bodyweight: 'Körpergewicht'
};

const P = (ref, name, equipment, primary, secondary = [], kind = 'strength') => ({
  ref, name, equipment, kind,
  muscles: { primary, secondary },
  defaultWorkSets: 3,
  verification: 'training-knowledge'
});

export const POOL = [
  // Brust
  P('bench-press-barbell', 'Bankdrücken', 'barbell', ['chest'], ['triceps', 'front-delts']),
  P('incline-press-dumbbell', 'Schrägbankdrücken', 'dumbbell', ['chest', 'front-delts'], ['triceps']),
  P('chest-press-machine', 'Brustpresse', 'machine', ['chest'], ['triceps', 'front-delts']),
  P('pec-deck', 'Butterfly', 'machine', ['chest'], ['front-delts']),
  P('cable-crossover', 'Kabel-Crossover', 'cable', ['chest'], ['front-delts']),
  P('dips', 'Dips', 'bodyweight', ['chest', 'triceps'], ['front-delts'], 'bodyweight'),
  P('push-up', 'Liegestütz', 'bodyweight', ['chest'], ['triceps', 'front-delts', 'abs'], 'bodyweight'),
  // Schultern
  P('shoulder-press-dumbbell', 'Schulterdrücken', 'dumbbell', ['front-delts'], ['side-delts', 'triceps']),
  P('lateral-raise-dumbbell', 'Seitheben', 'dumbbell', ['side-delts'], ['upper-back']),
  P('reverse-pec-deck', 'Reverse Butterfly', 'machine', ['rear-delts'], ['upper-back']),
  P('face-pull', 'Face Pull', 'cable', ['rear-delts', 'upper-back'], []),
  // Rücken
  P('pull-up', 'Klimmzug', 'bodyweight', ['lats'], ['biceps', 'upper-back'], 'bodyweight'),
  P('lat-pulldown', 'Latzug', 'cable', ['lats'], ['biceps', 'upper-back']),
  P('barbell-row', 'Langhantelrudern', 'barbell', ['lats', 'upper-back'], ['rear-delts', 'biceps', 'lower-back']),
  P('seated-cable-row', 'Rudern am Kabel', 'cable', ['upper-back', 'lats'], ['rear-delts', 'biceps']),
  P('chest-supported-row', 'Brustgestütztes Rudern', 'machine', ['upper-back', 'lats'], ['rear-delts', 'biceps']),
  P('deadlift', 'Kreuzheben', 'barbell', ['glutes', 'hamstrings', 'lower-back'], ['quads', 'upper-back', 'forearms']),
  // Beine
  P('back-squat', 'Kniebeuge', 'barbell', ['quads', 'glutes'], ['adductors', 'lower-back']),
  P('leg-press', 'Beinpresse', 'machine', ['quads', 'glutes'], ['adductors']),
  P('hack-squat', 'Hack Squat', 'machine', ['quads'], ['glutes']),
  P('bulgarian-split-squat', 'Bulgarian Split Squat', 'dumbbell', ['quads', 'glutes'], ['adductors']),
  P('romanian-deadlift', 'Rumänisches Kreuzheben', 'barbell', ['hamstrings', 'glutes'], ['lower-back']),
  P('hip-thrust', 'Hip Thrust', 'barbell', ['glutes'], ['hamstrings']),
  P('leg-extension', 'Beinstrecker', 'machine', ['quads'], []),
  P('lying-leg-curl', 'Beinbeuger liegend', 'machine', ['hamstrings'], ['calves']),
  P('seated-leg-curl', 'Beinbeuger sitzend', 'machine', ['hamstrings'], []),
  P('hip-adduction-machine', 'Adduktoren-Maschine', 'machine', ['adductors'], []),
  P('hip-abduction-machine', 'Abduktoren-Maschine', 'machine', ['abductors'], ['glutes']),
  P('standing-calf-raise', 'Wadenheben stehend', 'machine', ['calves'], []),
  // Arme
  P('dumbbell-curl', 'Bizepscurls', 'dumbbell', ['biceps'], ['forearms']),
  P('hammer-curl', 'Hammercurls', 'dumbbell', ['biceps', 'forearms'], []),
  P('triceps-pushdown', 'Trizepsdrücken am Kabel', 'cable', ['triceps'], []),
  P('overhead-triceps-extension', 'Überkopf-Trizepsstrecken', 'cable', ['triceps'], []),
  // Bauch
  P('cable-crunch', 'Crunch am Kabel', 'cable', ['abs'], ['obliques']),
  P('cable-woodchop', 'Holzhacker am Kabel', 'cable', ['obliques'], ['abs']),
  P('hanging-leg-raise', 'Hängendes Beinheben', 'bodyweight', ['abs'], ['obliques'], 'bodyweight')
];

// Pool-Eintrag → neue Übung in der eigenen Bibliothek (neue UUID, Quelle = builtin).
export function exerciseFromPool(entry, overrides = {}) {
  return createExercise({
    name: entry.name,
    kind: entry.kind,
    muscles: { primary: [...entry.muscles.primary], secondary: [...entry.muscles.secondary] },
    defaultWorkSets: entry.defaultWorkSets,
    source: { origin: 'builtin', ref: entry.ref, verification: entry.verification, checkedAt: null },
    ...overrides
  });
}

// Welche Pool-Einträge sind bereits in der Bibliothek?
export function poolRefsInLibrary(exercises) {
  return new Set(exercises.filter((e) => e.source?.origin === 'builtin' && e.source.ref).map((e) => e.source.ref));
}
