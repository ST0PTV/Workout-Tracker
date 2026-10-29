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
  GOALS, TIME_OPTIONS, LEVELS, GEAR_PRESETS, SLOT_LABELS, SLOT_NEEDS, DEFAULT_WEEKDAYS, STRENGTH_MAX, SPLITS, WHO_AEROBIC,
  COMBO_OPTIONS, COMBO_DEFAULT, COMBO_MIN_STRENGTH, COMBO_SUFFIX, buildProgram, normalizeAnswers, adjacentFullBody, pickCardio
} from './plan-builder.js';

export const ASSISTANT_INFO = {
  checkedAt: '2026-10-29',
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
    'Sätze pro Muskel: direkt 1, mitbeteiligt 0,5 – wie in der Muskelkarte.',
    'Bei nur einem Krafttag kommt jeder Muskel einmal pro Woche dran; zweimal war in Studien günstiger (Schoenfeld 2016).',
    'Cardio-Tage bekommen einen eigenen Plan „Ausdauer“. Kraft und Ausdauer an getrennten Tagen bremsen Muskelaufbau und Maximalkraft im Mittel nicht; die Schnellkraft eher, vor allem in derselben Einheit (Schumann 2022).',
    'Die WHO empfiehlt Erwachsenen pro Woche 150–300 min Ausdauer mit mittlerer oder 75–150 min mit hoher Intensität (Bull 2020). Die Cardio-Minuten im Vorschlag sind eine Schätzung aus Dauer × Cardio-Tagen.',
    'Höchstens 6 Krafttage: Ein Tag ohne Krafttraining bleibt (Konvention).',
    'Kraft + Cardio am selben Tag: Cardio kommt nach dem Kraftteil. Kraft zuerst brachte in zwei Meta-Analysen mehr Beinkraft; Muskelwachstum und Ausdauer hingen nicht von der Reihenfolge ab (Eddens 2018; Murlasits 2018). Der Kraftteil wird um die Cardio-Zeit kürzer, mindestens 20 min (Konvention).',
    'Welches Cardio: Bei Ziel Muskelaufbau oder Kraft schlägt die App Radfahren statt Laufen vor. Laufen ging parallel zum Krafttraining mit weniger Muskel- und Kraftzuwachs einher, Radfahren nicht (Wilson 2012, Vergleich über Studien hinweg). Ohne Rad: zügiges Gehen (Konvention). Am Kombi-Tag im Fitnessstudio ein Cardiogerät, sonst draußen.'
  ],
  sources: [
    { label: 'ACSM 2009, Med Sci Sports Exerc 41:687–708', url: 'https://doi.org/10.1249/MSS.0b013e3181915670', note: 'Position Stand: Einsteiger 8–12 Wdh., 2–3 Tage/Woche; große und mehrgelenkige Übungen zuerst (Abstract).' },
    { label: 'ACSM 2026 (Currier et al.), Med Sci Sports Exerc 58:851–872', url: 'https://doi.org/10.1249/MSS.0000000000003897', note: '137 Reviews: Kraft mit ≥ 80 % 1RM, 2–3 Sätzen, am Anfang der Einheit, ≥ 2×/Woche; Muskelwachstum mit ≥ 10 Sätzen/Woche (Abstract).' },
    { label: 'Schoenfeld, Ogborn & Krieger 2016, Sports Med 46:1689–1697', url: 'https://doi.org/10.1007/s40279-016-0543-8', note: 'Meta-Analyse: zweimal pro Woche besser als einmal (Abstract).' },
    { label: 'Schoenfeld, Ogborn & Krieger 2017, J Sports Sci 35:1073–1082', url: 'https://doi.org/10.1080/02640414.2016.1210197', note: 'Dosis-Wirkung: mehr Wochensätze, mehr Muskelzuwachs (Abstract).' },
    { label: 'Schoenfeld et al. 2017, J Strength Cond Res 31:3508–3523', url: 'https://doi.org/10.1519/JSC.0000000000002200', note: 'Schwere Lasten besser für Maximalkraft; Muskelwachstum über viele Lastbereiche ähnlich (Abstract).' },
    { label: 'Ramos-Campo et al. 2024, J Strength Cond Res 38:1330–1340', url: 'https://doi.org/10.1519/JSC.0000000000004774', note: 'Split vs. Ganzkörper bei gleichem Volumen gleichwertig (Abstract).' },
    { label: 'Nunes et al. 2020, Eur J Sport Sci 21:149–157', url: 'https://doi.org/10.1080/17461391.2020.1733672', note: 'Reihenfolge: Kraft wächst in den ersten Übungen am meisten; Muskelwachstum ähnlich (Abstract).' },
    { label: 'Schumann et al. 2022, Sports Med 52:601–612', url: 'https://doi.org/10.1007/s40279-021-01587-7', note: 'Meta-Analyse (43 Studien): Ausdauer zusätzlich zu Kraft ändert Muskelwachstum und Maximalkraft nicht; Schnellkraft leidet eher, v. a. in derselben Einheit (Abstract).' },
    { label: 'Bull et al. 2020, Br J Sports Med 54:1451–1462', url: 'https://doi.org/10.1136/bjsports-2020-102955', note: 'WHO-Leitlinie: 150–300 min mittlere oder 75–150 min hohe Ausdauer pro Woche für Erwachsene (Abstract).' },
    { label: 'Eddens, van Someren & Howatson 2018, Sports Med 48:177–188', url: 'https://doi.org/10.1007/s40279-017-0784-1', note: 'Meta-Analyse (10 Studien): Kraft vor Ausdauer +6,9 % dynamische Beinkraft; kein Unterschied für Muskelwachstum, statische Kraft, VO2max und Körperfett (Abstract).' },
    { label: 'Murlasits, Kneffel & Thalib 2018, J Sports Sci 36:1212–1219', url: 'https://doi.org/10.1080/02640414.2017.1364405', note: 'Meta-Analyse: Kraft zuerst +4 kg Bein-1RM; Ausdauerleistung unabhängig von der Reihenfolge (Abstract).' },
    { label: 'Wilson et al. 2012, J Strength Cond Res 26:2293–2307', url: 'https://doi.org/10.1519/JSC.0b013e31823a3e2d', note: 'Meta-Analyse (21 Studien): mit Laufen, nicht mit Radfahren, weniger Muskel- und Kraftzuwachs; mehr Häufigkeit und Dauer der Ausdauer → mehr Einbußen (Abstract; Moderator-Analyse).' },
    { label: 'Singer et al. 2024, Front Sports Act Living 6:1429789', url: 'https://doi.org/10.3389/fspor.2024.1429789', note: 'Pausen > 60 s leicht besser, über 90 s kein weiterer Unterschied (Abstract).' }
  ]
};

function openAssistantInfo() {
  openSheet(infoBody({
    short: ASSISTANT_INFO.short, details: [h('ul', {}, ASSISTANT_INFO.points.map((t) => h('li', {}, t)))],
    sources: ASSISTANT_INFO.sources, checked: ASSISTANT_INFO.checkedAt
  }), { title: 'So entsteht der Vorschlag' });
}

const SPLIT_SUB = { 1: 'Ganzkörper · einmal pro Woche', 2: 'Ganzkörper an beiden Tagen', 3: 'Ganzkörper · guter Start', 4: 'Oberkörper / Unterkörper', 5: 'Drücken / Ziehen / Beine + Ober-/Unterkörper', 6: 'Drücken / Ziehen / Beine zweimal' };

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
    { key: 'week', kind: 'weekdays', title: 'An welchen Tagen trainierst du?', sub: 'Tippen wechselt: Kraft → Cardio → Kraft + Cardio → frei. Ändern geht jederzeit.' },
    { key: 'minutes', title: 'Wie lange pro Training?', sub: 'Inklusive Aufwärmen. Die Dauer ist eine Schätzung.',
      options: TIME_OPTIONS.map((m) => ({ value: m, label: m === 75 ? '75 min oder mehr' : `${m} min`, num: String(m) })) },
    // v3.11.0: nur sichtbar, wenn ein Tag mit Kraft + Cardio gewählt ist
    { key: 'comboMinutes', when: (c) => c.week.includes('kc'), title: 'Wie lange Cardio nach dem Krafttraining?', sub: `An Tagen mit Kraft + Cardio. Der Kraftteil wird entsprechend kürzer (mindestens ${COMBO_MIN_STRENGTH} min).`,
      options: COMBO_OPTIONS.map((m) => ({ value: m, label: `${m} min`, num: String(m) })) },
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
  // v3.8.0: week = 7 Einträge Mo–So: '' frei, 'k' Kraft, 'c' Cardio (Variante A, Nutzerwahl 2026-10-26). Standard Mo · Mi · Fr Kraft.
  const week = Array(7).fill('');
  for (const d of DEFAULT_WEEKDAYS[3]) week[d] = 'k';
  const st = { step: 0, choice: { goal: 'muscle', week, minutes: 45, comboMinutes: COMBO_DEFAULT, gear: ownedGear(settings) ? 'mine' : 'gym', level: 'new' }, tab: 0 };
  const vq = () => qs.filter((q) => !q.when || q.when(st.choice)); // v3.11.0: sichtbare Fragen
  const body = h('div', { class: 'assist' });
  const sheet = openSheet(body, { full: true, title: 'Plan erstellen' });

  const daysOf = (kind) => st.choice.week.flatMap((v, d) => (v === kind ? [d] : []));
  const answers = () => normalizeAnswers({ ...st.choice, weekdays: [...daysOf('k'), ...daysOf('kc')].sort((x, y) => x - y), cardioDays: daysOf('c'),
    comboDays: daysOf('kc'), gear: gearFromChoice(st.choice.gear, settings) });

  function draw() {
    if (st.step < vq().length) drawQuestion(); else drawPreview();
    body.scrollTop = 0;
  }

  // v3.8.0 (Variante A): sieben Tasten Mo–So. v3.11.0: ein Tipp schaltet frei → Kraft → Cardio → Kraft + Cardio → frei.
  // Höchstens STRENGTH_MAX Tage mit Krafttraining (Kraft und Kraft + Cardio): ist das erreicht, springt ein freier Tag auf
  // Cardio und Cardio zurück auf frei.
  function weekdayPicker() {
    const w = st.choice.week;
    const kOnly = w.filter((v) => v === 'k').length, kc = w.filter((v) => v === 'kc').length;
    const k = kOnly + kc;
    const c = w.filter((v) => v === 'c').length;
    const next = (v) => (v === '' ? (k >= STRENGTH_MAX ? 'c' : 'k') : v === 'k' ? 'c' : v === 'c' ? (k >= STRENGTH_MAX ? '' : 'kc') : '');
    const NAME = { k: 'Kraft', c: 'Cardio', kc: 'Kraft und Cardio', '': 'frei' };
    const grid = h('div', { class: 'as-week', role: 'group', 'aria-label': 'Trainingstage' }, DAY_LABELS.map((label, d) => {
      const v = w[d];
      return h('button', { type: 'button', class: `as-day${v ? ' ' + v : ''}`, 'aria-label': `${label}: ${NAME[v]}, tippen für ${NAME[next(v)]}`,
        onclick: () => { st.choice.week = w.map((x, i) => (i === d ? next(x) : x)); draw(); } },
      h('span', {}, label), v === 'k' ? icon('dumbbell', { size: 18 }) : v === 'c' ? icon('cardio', { size: 18 })
        : v === 'kc' ? h('span', { class: 'as-kc' }, icon('dumbbell', { size: 15 }), icon('cardio', { size: 15 })) : null);
    }));
    const legend = h('div', { class: 'as-legend', 'aria-hidden': 'true' },
      h('span', {}, h('i', { class: 'k' }), 'Kraft'), h('span', {}, h('i', { class: 'c' }), 'Cardio'), h('span', {}, h('i', { class: 'kc' }), 'Kraft + Cardio'));
    const a = answers();
    const cardioName = (combo) => poolEntry(pickCardio(a, combo))?.name || 'Cardio';
    const parts = [k ? `${k} × Kraft` : null, kc ? `davon ${kc} mit Cardio danach` : null, c ? `${c} × Cardio` : null].filter(Boolean);
    const summary = parts.length
      ? [h('b', {}, parts.join(' · ')), h('small', {}, [k ? `Kraft: ${SPLIT_SUB[k]}` : null, kc ? `danach: ${cardioName(true)}` : null,
        c ? `Cardio: ${cardioName(false)}` : null, kc || c ? 'im Plan tauschbar' : null].filter(Boolean).join(' · '))]
      : [h('b', {}, 'Noch keinen Tag gewählt'), h('small', {}, 'Tippe mindestens einen Tag an.')];
    const kDays = [...daysOf('k'), ...daysOf('kc')].sort((x, y) => x - y);
    return [grid, legend,
      h('div', { class: 'card as-split' }, summary),
      k >= STRENGTH_MAX ? h('p', { class: 'muted small' }, `Höchstens ${STRENGTH_MAX} Krafttage: Ein Tag ohne Krafttraining bleibt (Konvention). Weitere Tage werden Cardio.`) : null,
      k === 1 ? h('p', { class: 'muted small' }, 'Mit einem Krafttag kommt jeder Muskel einmal pro Woche dran. Zweimal war in Studien günstiger (Schoenfeld 2016).') : null,
      adjacentFullBody(kDays) ? h('p', { class: 'muted small' }, 'Bei Ganzkörper-Training ist ein freier Tag dazwischen üblich (Konvention). Du kannst die Tage trotzdem so lassen.') : null,
      // v3.11.0: neutraler Hinweis zur Studienlage, kein Abraten (Nutzer entscheidet)
      kc ? h('p', { class: 'muted small' }, 'Kraft + Cardio: Cardio kommt nach dem Kraftteil – so war die Beinkraft in Studien höher (Eddens 2018). In derselben Einheit litt eher die Schnellkraft, Muskelaufbau und Maximalkraft im Mittel nicht (Schumann 2022).') : null];
  }

  function drawQuestion() {
    const qv = vq();
    const q = qv[st.step];
    const prog = h('div', { class: 'as-prog', 'aria-hidden': 'true' }, qv.map((_, i) => h('span', { class: i <= st.step ? 'on' : '' })));
    const valid = q.kind !== 'weekdays' || st.choice.week.some(Boolean);
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
        h('span', { class: 'muted small' }, `Frage ${st.step + 1} von ${qv.length}`)),
      prog,
      h('h1', { class: 'as-h' }, q.title),
      h('p', { class: 'sub' }, q.sub),
      h('div', { class: q.kind === 'weekdays' ? 'as-opts as-opts-week' : 'as-opts' }, opts),
      h('div', { class: 'as-bottom' },
        h('button', { class: 'btn primary block', type: 'button', disabled: !valid, onclick: () => { st.step += 1; st.tab = 0; draw(); } },
          st.step === qv.length - 1 ? 'Vorschlag ansehen' : 'Weiter')));
  }

  function drawPreview() {
    const prog = buildProgram(answers());
    const a = prog.answers;
    const plan = prog.plans[Math.min(st.tab, prog.plans.length - 1)];
    const longest = Math.max(...prog.plans.map((p) => p.seconds));
    const seg = prog.plans.length > 1 ? h('div', { class: 'seg as-seg', role: 'tablist', 'aria-label': 'Pläne' },
      prog.plans.map((p, i) => h('button', { type: 'button', role: 'tab', class: i === st.tab ? 'on' : '', 'aria-selected': String(i === st.tab),
        onclick: () => { st.tab = i; draw(); }, 'aria-label': p.name }, shortName(p.name.replace(COMBO_SUFFIX, '')), p.combo ? icon('cardio', { size: 14, cls: 'inline' }) : null))) : null;
    const rows = plan.items.map((it) => {
      const ex = poolEntry(it.ref);
      const reps = it.slot === 'cardio' ? `ca. ${it.minutes} min` : it.repRange ? `${it.sets} × ${it.repRange.min}–${it.repRange.max}` : `${it.sets} × halten`;
      return h('div', { class: 'row' }, h('span', { class: 't' }, h('b', {}, ex.name)), h('span', { class: 'as-n' }, reps));
    });
    const weekly = Object.entries(prog.weekly).filter(([, v]) => v >= 1).sort((x, y) => y[1] - x[1]).slice(0, 8);
    const max = Math.max(1, ...weekly.map(([, v]) => v));
    const bars = weekly.map(([m, v]) => h('div', { class: 'as-bar' },
      h('span', {}, MUSCLES[m]), h('i', { 'aria-hidden': 'true' }, h('em', { style: `width:${Math.round((v / max) * 100)}%` })), h('span', { class: 'as-v' }, fmtSets(v))));
    // v3.8.0: Kopfzeile mit Kraft- und Cardio-Tagen
    const nC = a.cardioDays.length, nKC = a.comboDays.length;
    const headline = [a.days ? `${prog.splitLabel} · ${a.days} ${a.days === 1 ? 'Krafttag' : 'Krafttage'}` : null,
      nKC ? `davon ${nKC} mit Cardio` : null,
      nC ? `${nC} ${nC === 1 ? 'Cardio-Tag' : 'Cardio-Tage'}` : null].filter(Boolean).join(' · ');
    const infoBtn = () => h('button', { class: 'info-btn small', type: 'button', 'aria-label': 'So entsteht der Vorschlag', onclick: openAssistantInfo }, icon('info', { size: 16 }));
    const missing = prog.missing.length ? h('div', { class: 'card warn-box as-miss' },
      h('b', {}, 'Nicht alles passt zu deinen Geräten'),
      h('p', {}, `Es fehlen: ${prog.missing.map((s) => (SLOT_NEEDS[s] ? `${SLOT_LABELS[s]} (${SLOT_NEEDS[s]})` : SLOT_LABELS[s])).join(', ')}.`)) : null;
    body.replaceChildren(
      h('div', { class: 'as-top' },
        h('button', { class: 'as-link', type: 'button', onclick: () => { st.step = vq().length - 1; draw(); } }, 'Zurück'), h('span')),
      h('h1', { class: 'as-h' }, 'Dein Plan'),
      h('p', { class: 'sub' }, `${headline} · bis ca. ${Math.round(longest / 60)} min `, h('span', { class: 'est-tag' }, 'Schätzung')),
      missing,
      seg,
      h('p', { class: 'muted small as-days' }, `${plan.name} · ${formatDays(plan.days)} · ca. ${Math.round(plan.seconds / 60)} min`),
      h('div', { class: 'card list as-list' }, rows),
      a.days ? h('div', { class: 'card' },
        h('div', { class: 'sec-row card-head' }, h('h2', {}, 'Sätze pro Muskel und Woche'), infoBtn()),
        bars,
        h('p', { class: 'muted small as-note' }, 'Schätzung · direkt 1, mitbeteiligt 0,5')) : null,
      prog.cardioMinutes ? h('div', { class: 'card as-cardio' },
        h('div', { class: 'sec-row card-head' }, h('h2', {}, 'Ausdauer pro Woche'), a.days ? null : infoBtn()),
        h('p', { class: 'as-cmin' }, h('b', {}, `ca. ${prog.cardioMinutes} min`), ' ', h('span', { class: 'est-tag' }, 'Schätzung')),
        h('p', { class: 'muted small as-note' }, `Zur Orientierung: Die WHO empfiehlt Erwachsenen ${WHO_AEROBIC.moderate.join('–')} min mittlere oder ${WHO_AEROBIC.vigorous.join('–')} min hohe Intensität pro Woche (Bull 2020).`)) : null,
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

const shortName = (name) => name.replace('Ganzkörper ', 'GK ').replace('Oberkörper', 'Oben').replace('Unterkörper', 'Unten').replace(/^Ausdauer$/, 'Cardio');

