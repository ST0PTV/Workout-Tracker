// v3.2.0: Vorschlag des Plan-Assistenten anlegen (Übungen aus dem Pool übernehmen, Pläne mit Tagen speichern). Ohne DOM.
import * as store from './store.js';
import * as P from './plans.js';
import { addFromPool } from './exercises.js';
import { poolEntry } from './pool.js';
import { createPlanItem } from './model.js';
import { uniqueName } from './plan-builder.js';

/** Legt Übungen (falls nötig) und Pläne an. Ohne DOM, damit testbar. */
export function applyProgram(prog) {
  const idFor = new Map();
  for (const ref of new Set(prog.plans.flatMap((p) => p.items.map((it) => it.ref)))) {
    const lib = store.get('exercises');
    let ex = lib.find((e) => !e.archived && e.source?.origin === 'builtin' && e.source.ref === ref);
    if (!ex) {
      const r = addFromPool(ref);
      if (r.ok) ex = r.exercise || store.get('exercises').find((e) => e.source?.ref === ref && !e.archived);
      else {
        const name = poolEntry(ref)?.name?.toLowerCase();
        ex = lib.find((e) => !e.archived && e.name.toLowerCase() === name); // eigene Übung mit gleichem Namen
      }
    }
    if (!ex) return { ok: false, error: `Übung „${poolEntry(ref)?.name || ref}“ konnte nicht angelegt werden.` };
    idFor.set(ref, ex.id);
  }
  const taken = new Set(P.listPlans().map((p) => p.name));
  let count = 0;
  for (const p of prog.plans) {
    const name = uniqueName(p.name, taken);
    taken.add(name);
    const created = P.newPlan(name);
    if (!created.ok) return { ok: false, error: created.errors[0] };
    const items = p.items.map((it) => createPlanItem(idFor.get(it.ref), {
      targetSets: it.sets, restSeconds: it.restSeconds, ...(it.repRange ? { repRange: { ...it.repRange } } : {})
    }));
    const saved = P.savePlan({ ...created.plan, items, days: [...p.days] });
    if (!saved.ok) return { ok: false, error: saved.errors[0] };
    count += 1;
  }
  return { ok: true, count };
}

