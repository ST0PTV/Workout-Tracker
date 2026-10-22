// „Änderungen von heute in den Plan übernehmen?“ (v2.29.0, Feature-To-Do B4). Ohne DOM, in Node testbar.
// Vergleicht ein beendetes Training mit seinem Plan. Einträge kennen ihren Plan-Platz über entry.planItemId
// (seit v2.29.0; ältere Trainings haben ihn nicht und liefern keine Änderungen).
// Gewichte gehören nicht dazu: sie hängen an der Übung, nicht am Plan (Decisions 2.29.0).
// Nichts wird von selbst übernommen – die Oberfläche zeigt eine Liste ohne Vorauswahl.

const hardCount = (entry) => entry.sets.filter((s) => s.type !== 'warmup').length;
const planSets = (item, ex) => item.targetSets ?? ex?.defaultWorkSets ?? 3;

// Ergebnis: Liste von Änderungen, jede mit eindeutiger id und Text für die Liste.
//   { id, kind: 'swap', itemId, from, to }
//   { id, kind: 'sets', itemId, exerciseId, from, to }
//   { id, kind: 'add', exerciseId, sets, afterItemId }   (afterItemId null = an den Anfang)
//   { id, kind: 'remove', itemId, exerciseId }
export function planChanges(session, plan, exercisesById) {
  if (!session || !plan || session.planId !== plan.id || plan.archived) return [];
  if (!session.entries.some((e) => e.planItemId)) return [];
  const name = (id) => exercisesById[id]?.name || 'Unbekannte Übung';
  const items = new Map(plan.items.map((it) => [it.id, it]));
  const seen = new Set();
  const out = [];
  let after = null; // letzter Plan-Platz in Trainingsreihenfolge – dahinter kommen hinzugefügte Übungen
  for (const en of session.entries) {
    const item = en.planItemId ? items.get(en.planItemId) : null;
    if (!item || seen.has(item.id)) {
      const ex = exercisesById[en.exerciseId];
      const sets = ex?.kind === 'cardio' ? null : hardCount(en);
      out.push({ id: `add:${en.id}`, kind: 'add', exerciseId: en.exerciseId, sets, afterItemId: after,
        text: `„${name(en.exerciseId)}“ in den Plan aufnehmen${sets ? ` (${sets} ${sets === 1 ? 'Satz' : 'Sätze'})` : ''}` });
      continue;
    }
    seen.add(item.id);
    after = item.id;
    if (en.exerciseId !== item.exerciseId) {
      out.push({ id: `swap:${item.id}`, kind: 'swap', itemId: item.id, from: item.exerciseId, to: en.exerciseId,
        text: `„${name(item.exerciseId)}“ durch „${name(en.exerciseId)}“ ersetzen` });
    }
    const ex = exercisesById[en.exerciseId];
    if (ex && ex.kind !== 'cardio') {
      const from = planSets(item, exercisesById[item.exerciseId]);
      const to = hardCount(en);
      if (to > 0 && to !== from) {
        out.push({ id: `sets:${item.id}`, kind: 'sets', itemId: item.id, exerciseId: en.exerciseId, from, to,
          text: `${name(en.exerciseId)}: ${from} → ${to} ${to === 1 ? 'Satz' : 'Sätze'}` });
      }
    }
  }
  for (const it of plan.items) {
    if (seen.has(it.id)) continue;
    out.push({ id: `remove:${it.id}`, kind: 'remove', itemId: it.id, exerciseId: it.exerciseId,
      text: `„${name(it.exerciseId)}“ (heute nicht gemacht) aus dem Plan entfernen` });
  }
  return out;
}

// Wendet die gewählten Änderungen auf eine Kopie der Plan-Einträge an. createItem(exerciseId, fields)
// erzeugt neue Einträge (in plans.js: createPlanItem). Gibt die neue items-Liste zurück.
export function applyChanges(items, changes, createItem) {
  const next = items.map((it) => ({ ...it }));
  // Erst einfügen (Bezug auf Plätze, die evtl. danach entfernt werden), dann ändern, dann entfernen.
  // Mehrere Übungen hinter demselben Platz behalten ihre Reihenfolge aus dem Training.
  const lastAt = new Map();
  for (const c of changes.filter((x) => x.kind === 'add')) {
    const fields = Number.isInteger(c.sets) && c.sets > 0 ? { targetSets: Math.min(10, c.sets) } : {};
    const fresh = createItem(c.exerciseId, fields);
    const anchor = lastAt.get(c.afterItemId ?? null) ?? c.afterItemId;
    const idx = anchor ? next.findIndex((it) => it.id === anchor) : -1;
    next.splice(idx + 1, 0, fresh);
    lastAt.set(c.afterItemId ?? null, fresh.id);
  }
  for (const c of changes) {
    const it = next.find((x) => x.id === c.itemId);
    if (!it) continue;
    if (c.kind === 'swap') it.exerciseId = c.to;
    if (c.kind === 'sets') it.targetSets = Math.min(10, c.to);
  }
  const drop = new Set(changes.filter((x) => x.kind === 'remove').map((x) => x.itemId));
  return next.filter((it) => !drop.has(it.id));
}
