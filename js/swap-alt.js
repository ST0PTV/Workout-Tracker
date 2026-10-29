// v3.13.0 (S3, Feature-Audit 2026-10-29): Tauschen ohne selbst angelegte Gruppen. Zusätzlich zu den Gruppen schlägt
// das Training Alternativen vor: für Pool-Übungen die übrigen Übungen desselben Bewegungsmusters aus dem Plan-Assistenten
// (SLOTS, Konvention der App) – erst aus der eigenen Bibliothek, dann aus dem Startpool (passend zu „Mein Equipment“);
// für eigene Übungen Bibliotheksübungen gleicher Art mit demselben ersten Hauptmuskel.
import { SLOTS } from './plan-builder.js';
import { poolEntry, fitsGear, ownedGear } from './pool.js';

export const MAX_ALTERNATIVES = 6;

/** Gibt { library: Übung[], pool: Pool-Eintrag[] } zurück (ohne die aktuelle Übung und ohne `exclude`-ids). */
export function alternativesFor(base, exercises, settings, exclude = new Set()) {
  const out = { library: [], pool: [] };
  if (!base || base.kind === 'cardio') return out;
  const active = exercises.filter((e) => !e.archived && e.id !== base.id && !exclude.has(e.id));
  const ref = base.source?.ref;
  const refs = ref ? [...new Set(Object.values(SLOTS).filter((s) => s.refs.includes(ref)).flatMap((s) => s.refs))].filter((r) => r !== ref) : [];
  if (refs.length) {
    const byRef = new Map(active.filter((e) => e.source?.ref).map((e) => [e.source.ref, e]));
    const inLib = new Set(exercises.filter((e) => e.source?.ref).map((e) => e.source.ref));
    const owned = ownedGear(settings);
    for (const r of refs) {
      if (out.library.length + out.pool.length >= MAX_ALTERNATIVES) break;
      if (byRef.has(r)) out.library.push(byRef.get(r));
      else if (!inLib.has(r)) { const p = poolEntry(r); if (p && fitsGear(p, owned)) out.pool.push(p); }
    }
    return out;
  }
  const main = base.muscles?.primary?.[0];
  if (main) out.library = active.filter((e) => e.kind === base.kind && e.muscles.primary[0] === main).slice(0, 4);
  return out;
}
