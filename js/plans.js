// Trainingspläne: Datenoperationen über dem Store (ohne DOM, in Node testbar).
// Ein Plan ist eine geordnete Liste von Übungen; Gewichte hängen NICHT am Plan, sondern an der Übung
// (Vorbelegung über lastPerformance aus den Trainings).
import * as store from './store.js';
import { formatSet } from './sets.js';
import { nowISO } from './util.js';
import { createPlan, createPlanItem, validatePlan, lastPerformance } from './model.js';

export function listPlans({ includeArchived = false } = {}) {
  return store.get('plans').filter((p) => includeArchived || !p.archived);
}

export function getPlan(id) {
  return store.get('plans').find((p) => p.id === id) || null;
}

function exerciseIds() {
  return new Set(store.get('exercises').map((e) => e.id));
}

// Speichert neu oder aktualisiert. Gibt { ok, errors, plan } zurück.
export function savePlan(input) {
  const plans = store.get('plans');
  const plan = { ...input, name: (input.name || '').trim(), updatedAt: nowISO() };
  const errors = validatePlan(plan);
  const known = exerciseIds();
  if (Array.isArray(plan.items) && plan.items.some((it) => !known.has(it.exerciseId))) errors.push('Plan enthält eine unbekannte Übung.');
  if (plans.some((p) => p.id !== plan.id && !p.archived && p.name.toLowerCase() === plan.name.toLowerCase())) {
    errors.push(`Es gibt schon einen Plan „${plan.name}“.`);
  }
  if (errors.length) return { ok: false, errors, plan };
  const i = plans.findIndex((p) => p.id === plan.id);
  if (i >= 0) plans[i] = plan;
  else plans.push(plan);
  if (!store.set('plans', plans)) return { ok: false, errors: ['Speichern fehlgeschlagen (Speicher voll?).'], plan };
  return { ok: true, errors: [], plan };
}

export function newPlan(name) {
  return savePlan(createPlan({ name }));
}

function update(planId, fn) {
  const plan = getPlan(planId);
  if (!plan) return { ok: false, errors: ['Plan nicht gefunden.'] };
  const next = structuredClone(plan);
  const err = fn(next);
  if (err) return { ok: false, errors: [err] };
  return savePlan(next);
}

// Hängt Übungen in der übergebenen Reihenfolge an. Doppelte Übungen sind erlaubt
// (z. B. schwerer Satzblock und Back-off-Block), die Oberfläche markiert schon enthaltene.
export function addExercises(planId, ids) {
  return update(planId, (p) => {
    if (!ids.length) return 'Keine Übung ausgewählt.';
    for (const id of ids) p.items.push(createPlanItem(id));
  });
}

export function removeItem(planId, itemId) {
  return update(planId, (p) => {
    const n = p.items.length;
    p.items = p.items.filter((it) => it.id !== itemId);
    if (p.items.length === n) return 'Eintrag nicht gefunden.';
  });
}

// Verschiebt einen Eintrag an eine neue Position (0-basiert, wird begrenzt).
export function moveItem(planId, itemId, toIndex) {
  return update(planId, (p) => {
    const from = p.items.findIndex((it) => it.id === itemId);
    if (from < 0) return 'Eintrag nicht gefunden.';
    const to = Math.max(0, Math.min(p.items.length - 1, toIndex));
    const [it] = p.items.splice(from, 1);
    p.items.splice(to, 0, it);
  });
}

// targetSets = null → Standard-Arbeitssätze der Übung.
export function setTargetSets(planId, itemId, targetSets) {
  return update(planId, (p) => {
    const it = p.items.find((x) => x.id === itemId);
    if (!it) return 'Eintrag nicht gefunden.';
    if (targetSets !== null && (!Number.isInteger(targetSets) || targetSets < 1 || targetSets > 10)) return 'Sätze müssen zwischen 1 und 10 liegen.';
    it.targetSets = targetSets;
  });
}

export function renamePlan(planId, name) {
  return update(planId, (p) => { p.name = name; });
}

export function setPlanArchived(planId, archived) {
  return update(planId, (p) => { p.archived = archived; });
}

// Löschen nur, wenn kein Training den Plan referenziert; sonst archivieren (alte Trainings bleiben gültig).
export function deleteOrArchivePlan(planId) {
  const used = store.get('sessions').some((s) => s.planId === planId);
  if (used) {
    const r = setPlanArchived(planId, true);
    return { ...r, archived: true };
  }
  const plans = store.get('plans');
  if (!plans.some((p) => p.id === planId)) return { ok: false, errors: ['Plan nicht gefunden.'] };
  const ok = store.set('plans', plans.filter((p) => p.id !== planId));
  return ok ? { ok: true, errors: [], deleted: true } : { ok: false, errors: ['Speichern fehlgeschlagen.'] };
}

// Anzeige-Daten eines Plans: Übung, effektive Satzzahl, letzte Ausführung, Hinweise.
export function planDetails(plan, exercisesById, sessions) {
  return plan.items.map((it, index) => {
    const ex = exercisesById[it.exerciseId] || null;
    const last = ex ? lastPerformance(ex.id, sessions) : null;
    const lastWork = last ? last.sets.filter((s) => s.type !== 'warmup') : [];
    return {
      item: it,
      index,
      exercise: ex,
      sets: it.targetSets ?? ex?.defaultWorkSets ?? 3,
      setsOverridden: it.targetSets !== null,
      last: last ? { date: last.date, sets: lastWork } : null,
      archivedExercise: !!ex?.archived
    };
  });
}

// "82,5 kg × 8, 82,5 × 6" – kurze Darstellung der letzten Arbeitssätze.
// "85 kg × 8, 85 × 6 + 60 × 6" – Drop/Rest-Pause-Stufen mit + (v1.2), "kg" nur einmal vorne.
export function formatLastSets(sets) {
  if (!sets || !sets.length) return '';
  return sets.map((s) => formatSet(s)).join(', ').replace(' × ', ' kg × ');
}
