// v3.1.0: Welcher Plan ist als Nächstes dran? (Play-Knopf in der Tab-Leiste)
// Reihenfolge: 1. Plan mit Trainingstag heute, heute noch nicht gemacht; 2. Plan, der am längsten nicht trainiert
// wurde (nie trainiert zuerst) – bei einem festen Wechsel (z. B. Push/Pull/Beine) ergibt das den nächsten in der Reihe.
// Annahme, keine Messung: Bei unregelmäßigem Training kann der Vorschlag vom Erwarteten abweichen; darum zeigt
// das Sheet die übrigen Pläne gleich darunter. Pläne ohne Übungen und diese Woche ausgesetzte Pläne zählen nicht
// (außer es bleibt sonst keiner). Rein, ohne DOM – getestet in tests/v310.test.js.
import { isPlanDay } from './plan-body.js';
import { isWeekSkipped } from './schedule.js';

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function lastTrained(planId, sessions) {
  let t = -Infinity;
  for (const s of sessions) if (s.planId === planId && s.endedAt !== null) t = Math.max(t, Date.parse(s.startedAt));
  return t;
}

export function nextPlan(plans, sessions, now = new Date()) {
  const usable = plans.filter((p) => Array.isArray(p.items) && p.items.length);
  if (!usable.length) return null;
  const active = usable.filter((p) => !isWeekSkipped(p, now));
  const pool = active.length ? active : usable;
  const doneToday = (id) => sessions.some((s) => s.planId === id && s.endedAt !== null && sameDay(new Date(s.startedAt), now));
  const today = pool.filter((p) => isPlanDay(p, now) && !doneToday(p.id));
  if (today.length) return { plan: today[0], reason: 'today', last: lastTrained(today[0].id, sessions) };
  const ranked = pool.map((p) => ({ p, last: lastTrained(p.id, sessions) }))
    .sort((a, b) => a.last - b.last || a.p.name.localeCompare(b.p.name, 'de'));
  const { p, last } = ranked[0];
  return { plan: p, reason: last === -Infinity ? 'never' : 'oldest', last };
}
