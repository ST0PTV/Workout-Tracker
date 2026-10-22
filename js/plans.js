// Trainingspläne: Datenoperationen über dem Store (ohne DOM, in Node testbar).
// Ein Plan ist eine geordnete Liste von Übungen; Gewichte hängen NICHT am Plan, sondern an der Übung
// (Vorbelegung über lastPerformance aus den Trainings).
import * as store from './store.js';
import { formatSet } from './sets.js';
import { nowISO } from './util.js';
import { REST_MIN, REST_MAX } from './rest.js';
import { createPlan, createPlanItem, validatePlan, lastPerformance, REP_RANGE_MAX } from './model.js';
import { isDayList, weekKey, dateKey, SKIP_WEEKS_KEEP } from './schedule.js';
import { applyChanges } from './plan-sync.js';
import { normalizeLinks } from './superset.js';

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
  if (Array.isArray(plan.items)) plan.items = normalizeLinks(plan.items); // v2.30.0: Kopplung am letzten Eintrag fällt weg
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
    const i = p.items.findIndex((it) => it.id === itemId);
    // v2.30.0: Kopplung des Vorgängers lösen, sonst koppelte er ungewollt an den neuen Nachbarn.
    if (i > 0 && !p.items[i].supersetNext) delete p.items[i - 1].supersetNext;
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
    // v2.30.0: Verschieben löst die Kopplungen am alten und am neuen Platz (vorhersehbar statt still neu gekoppelt).
    if (from > 0) delete p.items[from - 1].supersetNext;
    const [it] = p.items.splice(from, 1);
    delete it.supersetNext;
    p.items.splice(to, 0, it);
    if (to > 0) delete p.items[to - 1].supersetNext;
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

// v1.4 (Entscheidung 3 B): Pause nur in diesem Plan. null = Pause der Übung (bzw. Standard).
export function setItemRest(planId, itemId, sec) {
  return update(planId, (p) => {
    const it = p.items.find((x) => x.id === itemId);
    if (!it) return 'Eintrag nicht gefunden.';
    if (sec !== null && !(Number.isInteger(sec) && sec >= REST_MIN && sec <= REST_MAX)) return 'Pause ungültig.';
    it.restSeconds = sec;
  });
}

// v2.30.0 (B2): Wiederholungsbereich { min, max } nur in diesem Plan; null = kein Bereich (Bewertung entscheidet).
export function setItemRepRange(planId, itemId, range) {
  return update(planId, (p) => {
    const it = p.items.find((x) => x.id === itemId);
    if (!it) return 'Eintrag nicht gefunden.';
    if (range !== null && !(Number.isInteger(range.min) && Number.isInteger(range.max) && range.min >= 1 && range.min <= range.max && range.max <= REP_RANGE_MAX)) return 'Wiederholungsbereich ungültig.';
    if (range === null) delete it.repRange; else it.repRange = { min: range.min, max: range.max };
  });
}

// v1.4: Tausch-Kandidaten dieses Eintrags auf eine Gruppe begrenzen (null = alle Gruppen der Übung).
export function setItemGroup(planId, itemId, groupId) {
  return update(planId, (p) => {
    const it = p.items.find((x) => x.id === itemId);
    if (!it) return 'Eintrag nicht gefunden.';
    if (groupId !== null && !store.get('groups').some((g) => g.id === groupId)) return 'Gruppe nicht gefunden.';
    it.groupId = groupId;
  });
}

// v2.29.0 (Feature-To-Do A): Trainingstage, Mo = 0 … So = 6; leere Liste = keine festen Tage.
export function setPlanDays(planId, days) {
  return update(planId, (p) => {
    if (!isDayList(days)) return 'Trainingstage ungültig.';
    p.days = [...days].sort((a, b) => a - b);
  });
}

// „Diese Woche überspringen“: gilt für die Woche von `date`; bestätigt zugleich einen offenen Hinweis.
export function skipWeek(planId, date = new Date(), ackDate = null) {
  return update(planId, (p) => {
    const key = weekKey(date);
    const weeks = (p.skipWeeks || []).filter((w) => w !== key);
    p.skipWeeks = [...weeks, key].sort().slice(-SKIP_WEEKS_KEEP);
    if (ackDate) p.missedAck = dateKey(ackDate);
  });
}

export function unskipWeek(planId, date = new Date()) {
  return update(planId, (p) => {
    const key = weekKey(date);
    p.skipWeeks = (p.skipWeeks || []).filter((w) => w !== key);
  });
}

// Hinweis „gestern war … eingeplant“ gesehen: wird für diesen Tag nicht wieder gezeigt.
export function ackMissed(planId, dayKey) {
  return update(planId, (p) => { p.missedAck = dayKey; });
}

// v2.29.0 (Feature-To-Do B4): gewählte Änderungen aus einem Training übernehmen (plan-sync.js).
export function applyPlanChanges(planId, changes) {
  return update(planId, (p) => {
    if (!changes.length) return 'Nichts ausgewählt.';
    p.items = applyChanges(p.items, changes, createPlanItem);
  });
}

// v2.30.0 (B1): Eintrag mit dem nächsten zu einem Supersatz koppeln oder lösen.
export function setLinkNext(planId, itemId, on) {
  return update(planId, (p) => {
    const i = p.items.findIndex((x) => x.id === itemId);
    if (i < 0) return 'Eintrag nicht gefunden.';
    if (on && i === p.items.length - 1) return 'Der letzte Eintrag hat keinen Nachfolger.';
    if (on) p.items[i].supersetNext = true; else delete p.items[i].supersetNext;
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
export function formatLastSets(sets, kind = 'strength') {
  if (!sets || !sets.length) return '';
  const text = sets.map((s) => formatSet(s, kind)).join(', ');
  return kind === 'strength' ? text.replace(' × ', ' kg × ') : text;
}
