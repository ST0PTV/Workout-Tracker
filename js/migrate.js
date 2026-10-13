// Schema-Migrationen. Wird beim App-Start (lokale Daten) und beim Backup-Import verwendet.
// Jede Stufe hebt die Daten genau eine Version an. Eingabe wird nicht verändert.
import { clone } from './util.js';
import {
  SCHEMA_VERSION, DEFAULT_SETTINGS,
  createExercise, createGroup, createPlan, createPlanItem, createSession, createEntry, createSet
} from './model.js';

const arr = (v) => (Array.isArray(v) ? v : []);

// v1 (v0.1.0): nur leere Sammlungen exercises/plans/sessions + settings, ohne festes Feldschema.
// v2 (v0.2.0): Sammlung groups neu, alle Felder des Datenmodells, Settings mit Standardwerten.
// Fehlende Felder werden mit Standardwerten aufgefüllt; vorhandene ids und Zeitstempel bleiben.
function v1to2(d) {
  const keep = (factory, old, extra = {}) => ({ ...factory(), ...old, ...extra });
  return {
    exercises: arr(d.exercises).map((e) => keep(createExercise, e, {
      muscles: { primary: arr(e.muscles?.primary), secondary: arr(e.muscles?.secondary) },
      groupIds: arr(e.groupIds)
    })),
    groups: arr(d.groups).map((g) => keep(createGroup, g)),
    plans: arr(d.plans).map((p) => keep(createPlan, p, {
      items: arr(p.items).map((it) => keep(() => createPlanItem(it.exerciseId), it))
    })),
    sessions: arr(d.sessions).map((s) => keep(createSession, s, {
      entries: arr(s.entries).map((en) => keep(() => createEntry(en.exerciseId), en, {
        sets: arr(en.sets).map((x) => keep(createSet, x, { drops: arr(x.drops), tags: arr(x.tags) }))
      }))
    })),
    settings: { ...DEFAULT_SETTINGS, ...(d.settings && typeof d.settings === 'object' && !Array.isArray(d.settings) ? d.settings : {}) }
  };
}

const STEPS = { 1: v1to2 };

// Gibt { ok, data, errors } zurück.
export function migrateData(data, fromVersion) {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) return { ok: false, errors: ['Schema-Version ungültig.'] };
  if (fromVersion > SCHEMA_VERSION) {
    return { ok: false, errors: [`Daten stammen aus einer neueren App-Version (Schema ${fromVersion}, hier ${SCHEMA_VERSION}).`] };
  }
  let out = clone(data || {});
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const step = STEPS[v];
    if (!step) return { ok: false, errors: [`Keine Migration von Schema ${v} vorhanden.`] };
    out = step(out);
  }
  return { ok: true, data: out, errors: [] };
}
