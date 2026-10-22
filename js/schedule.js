// Trainingstage pro Plan (v2.29.0, Feature-To-Do A). Ohne DOM, in Node testbar.
// Ein Plan kann optionale Wochentage haben (plan.days, Mo = 0 … So = 6). Fand an einem solchen Tag
// gar kein Training statt (auch keins mit einem anderen Plan oder ein freies), erwähnt die App das
// einmal am Folgetag – neutral, ohne Zähler, ohne Serie (Projektregel §4: kein Streak-Druck).
// „Diese Woche überspringen“ (plan.skipWeeks) und „OK“ (plan.missedAck) erledigen den Hinweis.
import { weekStart } from './week.js';

export const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

// Höchstens so viele übersprungene Wochen pro Plan merken (ältere sind für den Hinweis bedeutungslos).
export const SKIP_WEEKS_KEEP = 8;

// Wochentag nach Ortszeit, Mo = 0 … So = 6.
export const dayIndex = (date) => (new Date(date).getDay() + 6) % 7;

// Lokales Datum als "JJJJ-MM-TT" (nicht UTC, sonst kippt der Tag nachts um).
export function dateKey(date) {
  const d = new Date(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const weekKey = (date) => dateKey(weekStart(date));

export const isDayList = (v) => Array.isArray(v) && v.length <= 7 && new Set(v).size === v.length && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
export const isDateKey = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// "Mo · Do" (sortiert) oder '' ohne Tage.
export function formatDays(days) {
  if (!Array.isArray(days) || !days.length) return '';
  return [...days].sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(' · ');
}

export function isWeekSkipped(plan, date = new Date()) {
  return Array.isArray(plan.skipWeeks) && plan.skipWeeks.includes(weekKey(date));
}

// Hinweise für gestern: [{ plan, date: 'JJJJ-MM-TT', day: 'Montag' }].
// Bedingungen: Plan nicht archiviert, gestern ist einer seiner Tage, der Plan bestand schon vor gestern,
// gestern begann kein einziges Training, die Woche von gestern ist nicht übersprungen, der Hinweis
// wurde noch nicht bestätigt. Nur der Vortag – ältere Tage werden nie nachgereicht.
export function missedHints(plans, sessions, now = new Date()) {
  const y = new Date(now);
  y.setHours(0, 0, 0, 0);
  y.setDate(y.getDate() - 1);
  const key = dateKey(y);
  if (sessions.some((s) => dateKey(s.startedAt) === key)) return [];
  const dow = dayIndex(y);
  return plans
    .filter((p) => !p.archived && isDayList(p.days) && p.days.includes(dow)
      && Date.parse(p.createdAt) < y.getTime()
      && !isWeekSkipped(p, y)
      && p.missedAck !== key)
    .map((p) => ({ plan: p, date: key, day: DAY_NAMES[dow] }));
}
