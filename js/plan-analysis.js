// v3.3.0: Plan-Analyse – Logik ohne DOM (in Node testbar).
// Liest die aktiven Pläne (geplante Sätze pro Muskel und Woche, Frequenz, geschätzte Dauer) und die letzten vier Wochen
// (fourWeekAnalysis) und macht bis zu drei Vorschläge, jeweils als konkrete Änderung (hinzufügen, Sätze, verschieben).
//
// Maßstab (Nutzerwahl 2026-10-25: „Relativ + Spannen als Schätzung“; ändert Entscheidung 2.23.0):
// - Relativ: Balance Beine vorn/hinten und Drücken/Ziehen (Schwellen = Konvention, siehe Unverified 290).
// - Frequenz: große Muskeln mind. 2× pro Woche (Schoenfeld et al. 2016, Sports Med 46:1689; Abstract).
// - Spanne: ≥ 10 Sätze pro Woche fürs Muskelwachstum (ACSM 2026, Currier et al.; Schoenfeld et al. 2017; Abstract) –
//   nur als Orientierung, niedrigste Priorität.
// - Dauer: Schätzung wie im Plan-Assistenten (40 s je Satz + Pause, 5 min Aufwärmen); Hinweis ab 75 min (Konvention).
// Zählweise wie in der Muskelkarte: direkt 1, indirekt 0,5 (week.js, Pelland et al. 2026).
import { MUSCLES } from './model.js';
import { INDIRECT_FACTOR } from './week.js';
import { effectiveRest } from './rest.js';
import { fourWeekAnalysis } from './analysis.js';
import { poolEntry, ownedGear, fitsGear } from './pool.js';
import { SLOTS, WARMUP_SEC, SET_WORK_SEC } from './plan-builder.js';

export const BIG = ['chest', 'back', 'quads', 'hamstrings', 'glutes']; // back = Latissimus + oberer Rücken (zusammengefasst)
export const BIG_LABELS = { chest: 'Brust', back: 'Rücken', quads: 'Beine vorn', hamstrings: 'Beine hinten', glutes: 'Gesäß' };
export const BALANCE_SHARE = 0.5; // Beine hinten < 50 % von vorn (Konvention)
export const PULL_SHARE = 2 / 3; // Ziehen < 2/3 von Drücken (Konvention)
export const BALANCE_MIN = 6; // erst ab 6 Wochensätzen auf der stärkeren Seite vergleichen (Konvention)
export const VOLUME_TARGET = 10; // ≥ 10 Sätze/Woche (ACSM 2026) – Orientierung
export const LONG_SESSION_MIN = 75; // Konvention
export const MAX_SUGGESTIONS = 3;
export const MIN_DATA_WEEKS = 2;

// v3.7.0 (#303): Pool-Übungen tragen eine ausdrückliche Einordnung (`compound`, siehe pool.js). Nur eigene Übungen ohne
// Pool-Bezug behalten die Heuristik „mindestens 3 beteiligte Muskeln“ (Konvention).
// v3.12.0 (#309): Eigene Übungen können das ausdrücklich festlegen (`compound` true/false); fehlt das Feld, gilt die Heuristik.
export const isCompound = (ex) => {
  const entry = ex?.source?.ref ? poolEntry(ex.source.ref) : null;
  if (entry) return entry.compound === true;
  if (typeof ex?.compound === 'boolean') return ex.compound;
  return (ex?.muscles?.primary?.length || 0) + (ex?.muscles?.secondary?.length || 0) >= 3;
};

const groupOf = (m) => (m === 'lats' || m === 'upper-back' ? 'back' : m);
const PUSH = ['chest', 'front-delts', 'triceps'];
const PULL = ['lats', 'upper-back', 'rear-delts', 'biceps'];

/** Pläne mit Übungen, Sätzen, Pause und geschätzter Dauer. Ohne Trainingstage zählt ein Plan 1× pro Woche (assumed). */
export function planFacts(plans, exercises, settings) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return plans.filter((p) => !p.archived && p.items.length).map((p) => {
    const items = p.items.map((it) => {
      const ex = byId.get(it.exerciseId);
      const sets = Number.isInteger(it.targetSets) && it.targetSets > 0 ? it.targetSets : (ex?.defaultWorkSets || 3);
      const rest = effectiveRest(ex, settings, it);
      return { itemId: it.id, exerciseId: it.exerciseId, name: ex?.name || 'Unbekannte Übung', sets, rest, compound: isCompound(ex), ex };
    }).filter((it) => it.ex && it.ex.kind !== 'cardio');
    const days = Array.isArray(p.days) ? p.days : [];
    const seconds = WARMUP_SEC + items.reduce((n, it) => n + it.sets * (SET_WORK_SEC + it.rest), 0);
    return { id: p.id, name: p.name, days, times: Math.max(1, days.length), assumed: !days.length, items, seconds };
  });
}

/** Geplante Sätze pro Muskel und Woche (direkt 1, indirekt 0,5) und Trainingstage pro Muskelgruppe. */
export function plannedLoad(facts) {
  const sets = Object.fromEntries(Object.keys(MUSCLES).map((m) => [m, 0]));
  const freq = Object.fromEntries(BIG.map((g) => [g, 0]));
  for (const p of facts) {
    const hit = new Set();
    for (const it of p.items) {
      for (const m of it.ex.muscles.primary) { sets[m] += it.sets * p.times; hit.add(groupOf(m)); }
      for (const m of it.ex.muscles.secondary) { sets[m] += INDIRECT_FACTOR * it.sets * p.times; hit.add(groupOf(m)); }
    }
    for (const g of BIG) if (hit.has(g)) freq[g] += p.times;
  }
  const group = { back: sets.lats + sets['upper-back'] };
  for (const g of BIG) if (g !== 'back') group[g] = sets[g];
  return { sets, group, freq };
}

const sum = (sets, ms) => ms.reduce((n, m) => n + sets[m], 0);
const setsIn = (p, ms) => p.items.reduce((n, it) => n + (it.ex.muscles.primary.some((m) => ms.includes(m)) ? it.sets : 0), 0);

/** Passende Übung für einen Zielmuskel: erst eigene Bibliothek, dann Pool (Plan-Assistent-Kandidaten, Geräte beachtet). */
export function pickFor(muscles, slotKeys, plan, exercises, settings) {
  const inPlan = new Set(plan.items.map((it) => it.exerciseId));
  const own = exercises.find((e) => !e.archived && e.kind !== 'cardio' && !inPlan.has(e.id) && e.muscles.primary.some((m) => muscles.includes(m))
    && (!e.source?.ref || slotKeys.some((k) => SLOTS[k].refs.includes(e.source.ref))));
  if (own) return { exerciseId: own.id, ref: own.source?.ref || null, name: own.name };
  const gear = ownedGear(settings);
  const refsInLib = new Set(exercises.filter((e) => !e.archived).map((e) => e.source?.ref).filter(Boolean));
  for (const k of slotKeys) {
    for (const r of SLOTS[k].refs) {
      const p = poolEntry(r);
      if (p && fitsGear(p, gear) && !refsInLib.has(r) && p.muscles.primary.some((m) => muscles.includes(m))) return { exerciseId: null, ref: r, name: p.name };
    }
  }
  return null;
}

/** Die ganze Analyse. */
export function analysePlans({ plans, exercises, settings, sessions, now = new Date() }) {
  const facts = planFacts(plans, exercises, settings);
  const load = plannedLoad(facts);
  const four = fourWeekAnalysis(sessions, exercises, now);
  const trained = Object.fromEntries(four.muscles.map((m) => [m.id, m.avg]));
  const dataWeeks = four.weeks.filter((w) => w.sessions > 0).length;
  const out = [];
  const used = new Set(); // Muskelgruppen, die schon einen Vorschlag haben
  const totalDays = facts.reduce((n, p) => n + p.times, 0);
  const add = (s) => { if (out.length < 10) out.push(s); };

  // 1. Balance Beine: hinten deutlich unter vorn
  const front = load.sets.quads, back = load.sets.hamstrings;
  if (front >= BALANCE_MIN && back < BALANCE_SHARE * front) {
    const target = [...facts].sort((a, b) => setsIn(b, ['quads']) - setsIn(a, ['quads']))[0];
    const pick = target && pickFor(['hamstrings'], ['legcurl', 'hinge'], target, exercises, settings);
    if (pick) {
      const sets = Math.max(2, Math.min(4, Math.ceil((BALANCE_SHARE * front - back) / target.times))); // schließt die Lücke bis 50 %
      add({ id: 'legs', kind: 'balance', priority: 1, muscles: ['hamstrings'], title: 'Beinrückseite kommt kurz',
        detail: `${fmt(back)} Sätze pro Woche, Vorderseite ${fmt(front)}.`,
        changes: [{ type: 'add', planId: target.id, ...pick, sets, gain: `Beinrückseite +${sets * target.times}` }] });
      used.add('hamstrings');
    }
  }
  // 2. Balance Oberkörper: Ziehen deutlich unter Drücken
  const push = sum(load.sets, PUSH), pull = sum(load.sets, PULL);
  if (push >= BALANCE_MIN && pull < PULL_SHARE * push) {
    const target = [...facts].sort((a, b) => setsIn(b, PUSH) - setsIn(a, PUSH))[0];
    const existing = target?.items.filter((it) => it.ex.muscles.primary.some((m) => m === 'lats' || m === 'upper-back')).sort((a, b) => b.sets - a.sets)[0];
    if (existing && existing.sets < 5) {
      add({ id: 'pull', kind: 'balance', priority: 2, muscles: ['lats', 'upper-back'], title: 'Mehr Drücken als Ziehen',
        detail: `Drücken ${fmt(push)}, Ziehen ${fmt(pull)} Sätze pro Woche.`,
        changes: [{ type: 'sets', planId: target.id, itemId: existing.itemId, name: existing.name, from: existing.sets, to: Math.min(5, existing.sets + 2) }] });
      used.add('back');
    } else if (target) {
      const pick = pickFor(['lats', 'upper-back'], ['hpull', 'vpull'], target, exercises, settings);
      if (pick) {
        add({ id: 'pull', kind: 'balance', priority: 2, muscles: ['lats', 'upper-back'], title: 'Mehr Drücken als Ziehen',
          detail: `Drücken ${fmt(push)}, Ziehen ${fmt(pull)} Sätze pro Woche.`,
          changes: [{ type: 'add', planId: target.id, ...pick, sets: 3, gain: `Ziehen +${3 * target.times}` }] });
        used.add('back');
      }
    }
  }
  // 3. Frequenz: großer Muskel nur 1× pro Woche, obwohl öfter trainiert wird
  if (totalDays >= 2) {
    for (const g of BIG) {
      if (used.has(g) || load.freq[g] !== 1) continue;
      const muscles = g === 'back' ? ['lats', 'upper-back'] : [g];
      const target = facts.filter((p) => !p.items.some((it) => it.ex.muscles.primary.some((m) => muscles.includes(m)))).sort((a, b) => a.seconds - b.seconds)[0];
      const slots = { chest: ['hpush', 'ipush'], back: ['hpull', 'vpull'], quads: ['squat', 'lunge', 'legext'], hamstrings: ['legcurl', 'hinge'], glutes: ['hinge', 'lunge'] }[g];
      const pick = target && pickFor(muscles, slots, target, exercises, settings);
      if (!pick) continue;
      add({ id: `freq-${g}`, kind: 'frequency', priority: 3, muscles, title: `${BIG_LABELS[g]} nur 1× pro Woche`,
        detail: `Große Muskeln wuchsen in Studien mit 2× pro Woche besser als mit 1×. Eine Übung in „${target.name}“ ergänzt das.`,
        changes: [{ type: 'add', planId: target.id, ...pick, sets: 2, gain: `${BIG_LABELS[g]} 2× pro Woche` }] });
      used.add(g);
    }
  }
  // 4. Dauer: Einheit deutlich länger als 75 min → letzte Einzelgelenk-Übung auf den kürzesten anderen Plan
  for (const p of facts) {
    if (p.seconds <= LONG_SESSION_MIN * 60 || facts.length < 2) continue;
    const last = [...p.items].reverse().find((it) => !it.compound);
    const to = facts.filter((x) => x.id !== p.id).sort((a, b) => a.seconds - b.seconds)[0];
    if (!last || !to) continue;
    add({ id: `long-${p.id}`, kind: 'duration', priority: 4, muscles: last.ex.muscles.primary, title: `„${p.name}“ dauert lang`,
      detail: `Ca. ${Math.round(p.seconds / 60)} min mit Pausen. „${last.name}“ passt auch in „${to.name}“.`,
      changes: [{ type: 'move', planId: p.id, toPlanId: to.id, itemId: last.itemId, name: last.name }] });
  }
  // 5. Spanne (Orientierung): großer Muskel unter 10 Wochensätzen → +1 Satz bei der größten Übung je Plan
  for (const g of BIG) {
    if (used.has(g)) continue;
    const v = load.group[g];
    if (!(v > 0 && v < VOLUME_TARGET)) continue;
    const muscles = g === 'back' ? ['lats', 'upper-back'] : [g];
    const changes = [];
    for (const p of facts) {
      const it = p.items.filter((x) => x.ex.muscles.primary.some((m) => muscles.includes(m))).sort((a, b) => b.sets - a.sets)[0];
      if (it && it.sets < 5) changes.push({ type: 'sets', planId: p.id, itemId: it.itemId, name: it.name, from: it.sets, to: it.sets + 1 });
    }
    if (!changes.length) continue;
    add({ id: `vol-${g}`, kind: 'volume', priority: 5, muscles, title: `${BIG_LABELS[g]}: ${fmt(v)} Sätze pro Woche`,
      detail: `Für Muskelwachstum fand ACSM 2026 mehr Wirkung ab etwa 10 Sätzen pro Woche. Orientierung, kein Muss – vor allem am Anfang.`, changes });
    used.add(g);
  }

  const suggestions = out.sort((a, b) => a.priority - b.priority).slice(0, MAX_SUGGESTIONS);
  return { facts, load, trained, dataWeeks, lowData: dataWeeks < MIN_DATA_WEEKS, suggestions, assumedDays: facts.some((p) => p.assumed) };
}

function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 }); }

/** Muskeln, die ein Vorschlag betrifft (für die orange Markierung in der Figur). */
export const flaggedMuscles = (suggestions) => new Set(suggestions.filter((s) => s.kind !== 'duration').flatMap((s) => s.muscles));
