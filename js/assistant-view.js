// v3.2.0: Plan-Assistent (Variante A, Nutzerwahl 2026-10-26): eine Frage pro Seite, dann Vorschau und Übernehmen.
// Logik in plan-builder.js; hier nur Oberfläche und das Anlegen der Pläne.
import { h } from './util.js';
import { openSheet } from './sheet.js';
import { toast } from './ui.js';
import { icon } from './icons.js';
import * as store from './store.js';
import { applyProgram } from './plan-apply.js';
import { poolEntry, ownedGear, GEAR } from './pool.js';
import { MUSCLES } from './model.js';
import { formatDays, DAY_LABELS } from './schedule.js';
import { fmtSets } from './week.js';
import { infoBody } from './info.js';
import {
  GOALS, TIME_OPTIONS, LEVELS, GEAR_PRESETS, SLOT_LABELS, SLOT_NEEDS, DEFAULT_WEEKDAYS, WEEKDAY_MIN, WEEKDAY_MAX,
  buildProgram, normalizeAnswers, cleanWeekdays, adjacentFullBody
} from './plan-builder.js';

export const ASSISTANT_INFO = {
  checkedAt: '2026-10-26',
  short: [
    'Der Vorschlag ist ein Startpunkt nach allgemeinen Empfehlungen, kein persönlicher Trainingsplan.',
    'Dauer und Sätze pro Muskel sind Schätzungen.',
    'Alles lässt sich danach im Plan ändern.'
  ],
  points: [
    'Einsteiger: 8–12 Wiederholungen und 2–3 Trainingstage pro Woche (ACSM 2009). Für Kraft mit Erfahrung 4–6 Wiederholungen bei den Grundübungen, weil schwere Lasten die Kraft stärker steigern (ACSM 2026; Schoenfeld 2017).',
    'Jeder große Muskel kommt mindestens zweimal pro Woche dran (Schoenfeld 2016). Ganzkörper oder Split ist bei gleichem Volumen gleichwertig (Ramos-Campo 2024); die Aufteilung nach Tagen ist eine Konvention der App.',
    'Mehrgelenkige Übungen stehen vorn: So wächst die Kraft in diesen Übungen am meisten (Nunes 2020; ACSM 2009).',
    'Mehr Sätze bringen mehr Muskelwachstum, ab etwa 10 Sätzen pro Woche deutlich (ACSM 2026; Schoenfeld 2017). Für den Anfang plant die App bewusst weniger; steigern kannst du später.',
    'Pausen: 2 min bei Grundübungen, 1,5 min sonst, 3 min bei schwerem Krafttraining. Über 90 s fand eine Meta-Analyse keinen weiteren Unterschied fürs Muskelwachstum (Singer 2024).',
    'Dauer = Sätze × (40 s Satz + Pause) + 5 min Aufwärmen. 40 s und 5 min sind Annahmen der App.',
    'Sätze pro Muskel: direkt 1, mitbeteiligt 0,5 – wie in der Muskelkarte.'
  ],
  sources: [
    { label: 'ACSM 2009, Med Sci Sports Exerc 41:687–708', url: 'https://doi.org/10.1249/MSS.0b013e3181915670', note: 'Position Stand: Einsteiger 8–12 Wdh., 2–3 Tage/Woche; große und mehrgelenkige Übungen zuerst (Abstract).' },
    { label: 'ACSM 2026 (Currier et al.), Med Sci Sports Exerc 58:851–872', url: 'https://doi.org/10.1249/MSS.0000000000003897', note: '137 Reviews: Kraft mit ≥ 80 % 1RM, 2–3 Sätzen, am Anfang der Einheit, ≥ 2×/Woche; Muskelwachstum mit ≥ 10 Sätzen/Woche (Abstract).' },
    { label: 'Schoenfeld, Ogborn & Krieger 2016, Sports Med 46:1689–1697', url: 'https://doi.org/10.1007/s40279-016-0543-8', note: 'Meta-Analyse: zweimal pro Woche besser als einmal (Abstract).' },
    { label: 'Schoenfeld, Ogborn & Krieger 2017, J Sports Sci 35:1073–1082', url: 'https://doi.org/10.1080/02640414.2016.1210197', note: 'Dosis-Wirkung: mehr Wochensätze, mehr Muskelzuwachs (Abstract).' },
    { label: 'Schoenfeld et al. 2017, J Strength Cond Res 31:3508–3523', url: 'https://doi.org/10.1519/JSC.0000000000002200', note: 'Schwere Lasten besser für Maximalkraft; Muskelwachstum über viele Lastbereiche ähnlich (Abstract).' },
    { label: 'Ramos-Campo et al. 2024, J Strength Cond Res 38:1330–1340', url: 'https://doi.org/10.1519/JSC.0000000000004774', note: 'Split vs. Ganzkörper bei gleichem Volumen gleichwertig (Abstract).' },
    { label: 'Nunes et al. 2020, Eur J Sport Sci 21:149–157', url: 'https://doi.org/10.1080/17461391.2020.1733672', note: 'Reihenfolge: Kraft wächst in den ersten Übungen am meisten; Muskelwachstum ähnlich (Abstract).' },
    { label: 'Singer et al. 2024, Front Sports Act Living 6:1429789', url: 'https://doi.org/10.3389/fspor.2024.1429789', note: 'Pausen > 60 s leicht besser, über 90 s kein weiterer Unterschied (Abstract).' }
  ]
};

function openAssistantInfo() {
  openSheet(infoBody({
    short: ASSISTANT_INFO.short, details: [h('ul', {}, ASSISTANT_INFO.points.map((t) => h('li', {}, t)))],
    sources: ASSISTANT_INFO.sources, checked: ASSISTANT_INFO.checkedAt
  }), { title: 'So entsteht der Vorschlag' });
}

const SPLIT_SUB = { 2: 'Ganzkörper an beiden Tagen', 3: 'Ganzkörper · guter Start', 4: 'Oberkörper / Unterkörper', 5: 'Drücken / Ziehen / Beine + Ober-/Unterkörper' };

function questions(settings) {
  const mine = ownedGear(settings);
  const gearOpts = Object.entries(GEAR_PRESETS).map(([k, g]) => ({ value: k, label: g.label, sub: g.sub }));
  if (mine) gearOpts.unshift({ value: 'mine', label: 'Meine Geräte', sub: mine.map((k) => GEAR[k]).join(', ') });
  return [
    { key: 'goal', title: 'Was ist dein Ziel?', sub: 'Bestimmt Wiederholungen und Pausen.',
      options: [
        { value: 'muscle', label: GOALS.muscle, sub: 'Muskeln aufbauen' },
        { value: 'strength', label: GOALS.strength, sub: 'Stärker werden in den Grundübungen' },
        { value: 'fit', label: GOALS.fit, sub: 'Allgemein fit und gesund' }] },
    // v3.8.0: statt „Wie oft?“ die Wochentage wählen; die Zahl der Tage bestimmt den Split.
    { key: 'weekdays', kind: 'weekdays', title: 'An welchen Tagen trainierst du?', sub: `Wähle ${WEEKDAY_MIN} bis ${WEEKDAY_MAX} Tage, die in deinen Alltag passen. Ändern geht jederzeit.` },
    { key: 'minutes', title: 'Wie lange pro Training?', sub: 'Inklusive Aufwärmen. Die Dauer ist eine Schätzung.',
      options: TIME_OPTIONS.map((m) => ({ value: m, label: m === 75 ? '75 min oder mehr' : `${m} min`, num: String(m) })) },
    { key: 'gear', title: 'Was hast du zur Verfügung?', sub: 'Nur passende Übungen kommen in den Plan.', options: gearOpts },
    { key: 'level', title: 'Wie viel Erfahrung hast du?', sub: 'Mit Krafttraining.',
      options: [
        { value: 'new', label: LEVELS.new, sub: 'Noch nie oder lange her' },
        { value: 'some', label: LEVELS.some, sub: 'Regelmäßig, aber unter einem Jahr' },
        { value: 'long', label: LEVELS.long, sub: 'Mehr als ein Jahr regelmäßig' }] }
  ];
}

function gearFromChoice(choice, settings) {
  if (choice === 'mine') return ownedGear(settings);
  return GEAR_PRESETS[choice]?.gear ?? null;
}

const check = () => h('svg', { class: 'as-chk', viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, h('path', { d: 'M5 12.5l4.5 4.5L19 7.5' }));

/** Öffnet den Assistenten. onDone(planIds) nach dem Übernehmen. */
export function openAssistant(rerender) {
  const settings = store.get('settings');
  const qs = questions(settings);
  const st = { step: 0, choice: { goal: 'muscle', weekdays: [...DEFAULT_WEEKDAYS[3]], minutes: 45, gear: ownedGear(settings) ? 'mine' : 'gym', level: 'new' }, tab: 0 };
  const body = h('div', { class: 'assist' });
  const sheet = openSheet(body, { full: true, title: 'Plan erstellen' });

  const answers = () => normalizeAnswers({ ...st.choice, gear: gearFromChoice(st.choice.gear, settings) });

  function draw() {
    if (st.step < qs.length) drawQuestion(); else drawPreview();
    body.scrollTop = 0;
  }

  // v3.8.0: sieben Tasten Mo–So; 2–5 Tage, weitere Tage sind bei 5 gesperrt.
  function weekdayPicker() {
    const days = st.choice.weekdays;
    const n = days.length;
    const toggle = (d) => {
      st.choice.weekdays = (days.includes(d) ? days.filter((x) => x !== d) : [...days, d]).sort((x, y) => x - y);
      draw();
    };
    const grid = h('div', { class: 'as-week', role: 'group', 'aria-label': 'Trainingstage' }, DAY_LABELS.map((label, d) => {
      const on = days.includes(d);
      return h('button', { type: 'button', class: `as-day${on ? ' on' : ''}`, 'aria-pressed': String(on), disabled: !on && n >= WEEKDAY_MAX,
        'aria-label': `${label} ${on ? 'abwählen' : 'wählen'}`, onclick: () => toggle(d) }, label);
    }));
    const ok = n >= WEEKDAY_MIN;
    const split = ok
      ? [h('b', {}, `${n} Tage`), h('small', {}, SPLIT_SUB[n])]
      : [h('b', {}, `Noch ${WEEKDAY_MIN - n} Tag${WEEKDAY_MIN - n === 1 ? '' : 'e'} wählen`), h('small', {}, `Mindestens ${WEEKDAY_MIN} Tage.`)];
    return [grid,
      h('div', { class: 'card as-split' }, split),
      n >= WEEKDAY_MAX ? h('p', { class: 'muted small' }, `Der Assistent plant höchstens ${WEEKDAY_MAX} Tage pro Woche.`) : null,
      adjacentFullBody(days) ? h('p', { class: 'muted small' }, 'Bei Ganzkörper-Training ist ein freier Tag dazwischen üblich (Konvention). Du kannst die Tage trotzdem so lassen.') : null];
  }

  function drawQuestion() {
    const q = qs[st.step];
    const prog = h('div', { class: 'as-prog', 'aria-hidden': 'true' }, qs.map((_, i) => h('span', { class: i <= st.step ? 'on' : '' })));
    const valid = q.kind !== 'weekdays' || cleanWeekdays(st.choice.weekdays) !== null;
    const opts = q.kind === 'weekdays' ? weekdayPicker() : q.options.map((o) => {
      const on = st.choice[q.key] === o.value;
      return h('button', { class: `opt as-opt${on ? ' on' : ''}`, type: 'button', 'aria-pressed': String(on),
        onclick: () => { st.choice[q.key] = o.value; draw(); } },
      o.num ? h('span', { class: 'as-num' }, o.num) : null,
      h('span', { class: 'as-t' }, h('b', {}, o.label), o.sub ? h('small', {}, o.sub) : null),
      on ? check() : null);
    });
    body.replaceChildren(
      h('div', { class: 'as-top' },
        st.step > 0 ? h('button', { class: 'as-link', type: 'button', onclick: () => { st.step -= 1; draw(); } }, 'Zurück') : h('span'),
        h('span', { class: 'muted small' }, `Frage ${st.step + 1} von ${qs.length}`)),
      prog,
      h('h1', { class: 'as-h' }, q.title),
      h('p', { class: 'sub' }, q.sub),
      h('div', { class: q.kind === 'weekdays' ? 'as-opts as-opts-week' : 'as-opts' }, opts),
      h('div', { class: 'as-bottom' },
        h('button', { class: 'btn primary block', type: 'button', disabled: !valid, onclick: () => { st.step += 1; st.tab = 0; draw(); } },
          st.step === qs.length - 1 ? 'Vorschlag ansehen' : 'Weiter')));
  }

  function drawPreview() {
    const prog = buildProgram(answers());
    const a = prog.answers;
    const plan = prog.plans[Math.min(st.tab, prog.plans.length - 1)];
    const longest = Math.max(...prog.plans.map((p) => p.seconds));
    const seg = prog.plans.length > 1 ? h('div', { class: 'seg as-seg', role: 'tablist', 'aria-label': 'Pläne' },
      prog.plans.map((p, i) => h('button', { type: 'button', role: 'tab', class: i === st.tab ? 'on' : '', 'aria-selected': String(i === st.tab),
        onclick: () => { st.tab = i; draw(); } }, shortName(p.name)))) : null;
    const rows = plan.items.map((it) => {
      const ex = poolEntry(it.ref);
      const reps = it.repRange ? `${it.sets} × ${it.repRange.min}–${it.repRange.max}` : `${it.sets} × halten`;
      return h('div', { class: 'row' }, h('span', { class: 't' }, h('b', {}, ex.name)), h('span', { class: 'as-n' }, reps));
    });
    const weekly = Object.entries(prog.weekly).filter(([, v]) => v >= 1).sort((x, y) => y[1] - x[1]).slice(0, 8);
    const max = Math.max(1, ...weekly.map(([, v]) => v));
    const bars = weekly.map(([m, v]) => h('div', { class: 'as-bar' },
      h('span', {}, MUSCLES[m]), h('i', { 'aria-hidden': 'true' }, h('em', { style: `width:${Math.round((v / max) * 100)}%` })), h('span', { class: 'as-v' }, fmtSets(v))));
    const missing = prog.missing.length ? h('div', { class: 'card warn-box as-miss' },
      h('b', {}, 'Nicht alles passt zu deinen Geräten'),
      h('p', {}, `Es fehlen: ${prog.missing.map((s) => (SLOT_NEEDS[s] ? `${SLOT_LABELS[s]} (${SLOT_NEEDS[s]})` : SLOT_LABELS[s])).join(', ')}.`)) : null;
    body.replaceChildren(
      h('div', { class: 'as-top' },
        h('button', { class: 'as-link', type: 'button', onclick: () => { st.step = qs.length - 1; draw(); } }, 'Zurück'), h('span')),
      h('h1', { class: 'as-h' }, 'Dein Plan'),
      h('p', { class: 'sub' }, `${prog.splitLabel} · ${a.days} Tage · bis ca. ${Math.round(longest / 60)} min `, h('span', { class: 'est-tag' }, 'Schätzung')),
      missing,
      seg,
      h('p', { class: 'muted small as-days' }, `${plan.name} · ${formatDays(plan.days)} · ca. ${Math.round(plan.seconds / 60)} min`),
      h('div', { class: 'card list as-list' }, rows),
      h('div', { class: 'card' },
        h('div', { class: 'sec-row card-head' }, h('h2', {}, 'Sätze pro Muskel und Woche'),
          h('button', { class: 'info-btn small', type: 'button', 'aria-label': 'So entsteht der Vorschlag', onclick: openAssistantInfo }, icon('info', { size: 16 }))),
        bars,
        h('p', { class: 'muted small as-note' }, 'Schätzung · direkt 1, mitbeteiligt 0,5')),
      h('div', { class: 'as-bottom two' },
        h('button', { class: 'btn', type: 'button', onclick: () => { st.step = 0; draw(); } }, 'Anpassen'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => apply(prog) }, 'Übernehmen')));
  }

  function apply(prog) {
    const res = applyProgram(prog);
    if (!res.ok) { toast(res.error, { error: true }); return; }
    sheet.close();
    toast(res.count === 1 ? 'Plan angelegt' : `${res.count} Pläne angelegt`);
    if (location.hash !== '#/plans') location.hash = '#/plans'; else rerender();
  }

  draw();
  return sheet;
}

const shortName = (name) => name.replace('Ganzkörper ', 'GK ').replace('Oberkörper', 'Oben').replace('Unterkörper', 'Unten');

