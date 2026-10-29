// v3.9.0: Tutorial (Nutzerwahl 2026-10-27: A + B + D) – Logik ohne DOM (in Node testbar).
// A: Rundgang mit Spotlight über die echte App. B: Probetraining mit Beispieldaten in einer Sandbox (nichts wird
// gespeichert, siehe store.startSandbox). D: einmalige Tipps beim ersten Besuch eines Bildschirms.
// Texte beschreiben nur die Bedienung (keine Studienaussagen); kein Druck, keine Belohnung, alles überspringbar.
import { POOL, poolEntry, exerciseFromPool } from './pool.js';
import { createPlan, createPlanItem, createSession, createEntry, createSet } from './model.js';

// Ziel = Liste von CSS-Selektoren (das erste sichtbare gilt); match = sichtbarer Text, den das Ziel enthalten muss;
// fallback = Selektoren, falls das Ziel fehlt (z. B. leere oder volle Seite). Ohne Ziel steht die Blase mittig.
export const TOUR_STEPS = [
  { id: 'tabs', route: '/', target: ['#tabbar'], title: 'Die vier Bereiche',
    body: 'Unten wechselst du zwischen Training, Plänen, Übungen und Fortschritt.' },
  { id: 'plans', route: '/plans', target: ['#view .btn'], match: 'Plan vorschlagen lassen', fallback: ['.fab'], title: 'Pläne',
    body: 'Hier legst du Pläne an – oder lässt dir einen nach Ziel, Tagen und Geräten vorschlagen.' },
  { id: 'exercises', route: '/exercises', target: ['#view .btn'], match: 'Startpool', fallback: ['#view .search-input'], title: 'Übungen',
    body: `Im Startpool stehen ${POOL.length} Übungen mit Muskeln, Technik-Animation und Quellen.` },
  { id: 'start', route: '/', target: ['#view .start-card', '#view .start-row', '#view .btn.primary', '#view .btn'], title: 'Training starten',
    body: 'Hier startest du dein Training. Die Werte vom letzten Mal stehen dann schon drin – du hakst nur noch ab.' },
  { id: 'play', route: '/', target: ['.tb-play'], title: 'Schnellstart',
    body: 'Der Knopf in der Mitte startet direkt den nächsten Plan.' },
  { id: 'progress', route: '/progress', target: ['#view [role=tablist]', '#view .seg'], title: 'Fortschritt',
    body: 'Verlauf je Übung, alle Trainings, die Muskelkarte und die 4-Wochen-Analyse.' },
  { id: 'settings', route: '/', target: ['a.dots[aria-label="Einstellungen"]', '[aria-label="Einstellungen"]'], title: 'Einstellungen',
    body: 'Backup, Pausen, Geräte, hell oder dunkel – und hier kannst du diesen Rundgang wiederholen.' }
];

// B: Schritte im Probetraining. „until“ = Bedingung (Prüfung im Browser), dann geht es von selbst weiter.
export const TRIAL_STEPS = [
  { id: 'tick', target: ['#view .setrow:not(.done) .ck'], title: 'Satz abhaken',
    body: 'Gewicht und Wiederholungen vom letzten Mal stehen schon drin. Tippe den Haken.', until: 'rest' },
  { id: 'rest', target: ['.restbar'], title: 'Pause',
    body: 'Jetzt läuft die Pause. Mit −15 und +15 passt du sie an, das Kreuz beendet sie.', until: null },
  { id: 'next', target: ['[aria-label="Nächste Übung"]'], title: 'Nächste Übung',
    body: 'Hier geht es zur nächsten Übung. Vorher fragt die App kurz, wie es lief.', until: 'second' },
  { id: 'overview', target: ['#view .nav2 .btn'], match: 'Übersicht', title: 'Training beenden',
    body: 'In der Übersicht siehst du alle Übungen und beendest das Training.', until: 'finished' }
];

// D: einmalige Tipps (pro Bildschirm höchstens einer, erst nach dem Rundgang oder für bestehende Nutzer).
export const TIPS = [
  { id: 'training-more', route: '/', target: ['#view button.dots'], body: 'Über ⋯ trägst du ein Training nach oder legst eine leichte Woche ein.' },
  { id: 'session-setnum', route: '/', target: ['#view .setrow .sn'], body: 'Tippe auf die Satznummer, um einen Satz als Aufwärm-, Drop- oder Rest-Pause-Satz zu markieren.' },
  { id: 'plans-analyse', route: '/plans', target: ['#view .btn'], match: 'Pläne analysieren', body: 'Prüft deine Pläne auf Balance, Sätze pro Muskel und Dauer – mit Vorschlägen zum Übernehmen.' },
  { id: 'plans-routines', route: '/plans', target: ['#view [role=tab]'], match: 'Routinen', body: 'Unter „Routinen“ findest du Aufwärmen, Cool-down und Mobility – auch ohne Plan startbar.' },
  { id: 'progress-4w', route: '/progress', target: ['#view [role=tab]'], match: '4 Wochen', body: 'Unter „4 Wochen“ siehst du, welche Muskeln du zuletzt mehr oder weniger trainiert hast.' }
];

export const TRIAL_PLAN_NAME = 'Probetraining';
export const TRIAL_REFS = ['leg-press', 'lat-pulldown'];

/** Zustand aus den Einstellungen, immer vollständig. */
export function tutorialState(settings = {}) {
  const t = settings.tutorial && typeof settings.tutorial === 'object' ? settings.tutorial : {};
  const ok = (v) => (v === 'done' || v === 'skipped' ? v : null);
  return { tour: ok(t.tour), trial: ok(t.trial), tips: t.tips && typeof t.tips === 'object' ? { ...t.tips } : {} };
}

/** Neue Einstellungen mit geändertem Tutorial-Zustand (Rundgang beendet → auch „onboarded“). */
export function withTutorial(settings, patch) {
  const cur = tutorialState(settings);
  const next = { ...cur, ...patch, tips: { ...cur.tips, ...(patch.tips || {}) } };
  return { ...settings, tutorial: next, onboarded: settings.onboarded === true || next.tour !== null };
}

/** Tipps erst nach dem Rundgang (oder für bestehende Nutzer) und nur bei eingeschalteten Hinweisen. */
export function tipsAllowed(settings) {
  if (settings.hints === false) return false;
  return tutorialState(settings).tour !== null || settings.onboarded === true;
}

/** Noch nicht gesehene Tipps dieses Bildschirms in Reihenfolge. */
export function pendingTips(route, settings) {
  if (!tipsAllowed(settings)) return [];
  const seen = tutorialState(settings).tips;
  return TIPS.filter((t) => t.route === route && !seen[t.id]);
}

/** Beispieldaten fürs Probetraining: zwei Übungen, ein Plan, ein früheres Training (für vorausgefüllte Werte). */
export function trialData(realSettings = {}, now = new Date()) {
  const exercises = TRIAL_REFS.map((r) => exerciseFromPool(poolEntry(r)));
  const plan = createPlan({ name: TRIAL_PLAN_NAME, items: exercises.map((e) => createPlanItem(e.id, { targetSets: 2, repRange: { min: 8, max: 12 } })) });
  const start = new Date(now.getTime() - 2 * 86400000);
  const iso = (min) => new Date(start.getTime() + min * 60000).toISOString();
  const past = createSession({
    planId: plan.id, startedAt: iso(0), endedAt: iso(40), createdAt: iso(0), updatedAt: iso(40),
    entries: exercises.map((e, i) => createEntry(e.id, {
      sets: [0, 1].map((k) => createSet({ type: 'work', weightKg: i === 0 ? 60 : 40, reps: 10 - k, completedAt: iso(5 + i * 15 + k * 3) }))
    }))
  });
  const settings = { ...realSettings, onboarded: true, persistAsked: true, homeHint: true, lightWeek: null,
    tutorial: { ...tutorialState(realSettings), tips: Object.fromEntries(TIPS.map((t) => [t.id, true])) } };
  return { exercises, groups: [], plans: [plan], sessions: [past], routines: [], settings };
}
