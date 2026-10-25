// v3.3.0: Änderungen aus der Plan-Analyse übernehmen (ohne DOM, testbar).
// Arten: add (Übung anhängen, ggf. aus dem Pool übernehmen), sets (Zielsätze ändern), move (Eintrag in einen anderen Plan).
import * as store from './store.js';
import * as P from './plans.js';
import { addFromPool } from './exercises.js';
import { poolEntry } from './pool.js';

function ensureExercise(ch) {
  if (ch.exerciseId) return ch.exerciseId;
  const lib = store.get('exercises');
  const have = lib.find((e) => !e.archived && e.source?.origin === 'builtin' && e.source.ref === ch.ref);
  if (have) return have.id;
  const r = addFromPool(ch.ref);
  if (r.ok) return (r.exercise || store.get('exercises').find((e) => e.source?.ref === ch.ref && !e.archived))?.id || null;
  const name = poolEntry(ch.ref)?.name?.toLowerCase();
  return lib.find((e) => !e.archived && e.name.toLowerCase() === name)?.id || null;
}

/** Wendet die Änderungen der Reihe nach an. Gibt { ok, applied, errors } zurück; Fehler einzelner Änderungen stoppen nicht. */
export function applySuggestionChanges(changes) {
  let applied = 0;
  const errors = [];
  for (const ch of changes) {
    let r;
    if (ch.type === 'add') {
      const id = ensureExercise(ch);
      if (!id) { errors.push(`„${ch.name}“ konnte nicht angelegt werden.`); continue; }
      r = P.addExercises(ch.planId, [id]);
      if (r.ok) {
        const item = r.plan.items[r.plan.items.length - 1];
        r = P.setTargetSets(ch.planId, item.id, ch.sets);
      }
    } else if (ch.type === 'sets') {
      r = P.setTargetSets(ch.planId, ch.itemId, ch.to);
    } else if (ch.type === 'move') {
      const from = P.getPlan(ch.planId);
      const it = from?.items.find((x) => x.id === ch.itemId);
      if (!it || !P.getPlan(ch.toPlanId)) { errors.push(`„${ch.name}“ nicht gefunden.`); continue; }
      r = P.addExercises(ch.toPlanId, [it.exerciseId]);
      if (r.ok) {
        const copy = r.plan.items[r.plan.items.length - 1];
        const keep = { targetSets: it.targetSets, ...(it.repRange ? { repRange: it.repRange } : {}), ...(Number.isInteger(it.restSeconds) ? { restSeconds: it.restSeconds } : {}) };
        r = P.savePlan({ ...r.plan, items: r.plan.items.map((x) => (x.id === copy.id ? { ...x, ...keep } : x)) });
        if (r.ok) r = P.removeItem(ch.planId, ch.itemId);
      }
    } else {
      errors.push('Unbekannte Änderung.');
      continue;
    }
    if (r?.ok) applied += 1; else errors.push(r?.errors?.[0] || 'Fehler beim Speichern.');
  }
  return { ok: errors.length === 0, applied, errors };
}
