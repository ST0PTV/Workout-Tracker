// v2.4.0: Bewertungs-Sheet beim Tippen auf „Weiter“ (Variante 1B), Vorschlagskarte (2B),
// „Willkommen zurück“ beim Start nach einer Pause (3A) und Info mit Quellen.
import { h } from './util.js';
import { openSheet } from './sheet.js';
import { icon } from './icons.js';
import { toast } from './ui.js';
import { fmtNum } from './input.js';
import * as S from './session.js';
import * as PR from './progression.js';
import { lastPerformance } from './model.js';

const kg = (x) => `${fmtNum(x)} kg`;

export function openProgressionInfo(section = 'rating') {
  const I = PR.PROGRESSION_INFO;
  const blocks = section === 'pause'
    ? [['Nach einer Pause', I.pause], ['So entsteht der Vorschlag', I.rules]]
    : [['Die Bewertung', I.rating], ['So entsteht der Vorschlag', I.rules], ['Nach einer Pause', I.pause]];
  openSheet(h('div', { class: 'info' },
    ...blocks.flatMap(([t, lines], i) => [i ? h('h3', {}, t) : null, h('ul', {}, lines.map((x) => h('li', {}, x)))]),
    h('h3', {}, 'Quellen'),
    h('ul', { class: 'sources' }, I.sources.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label), h('span', { class: 'muted' }, ` – ${s.note}`)))),
    h('p', { class: 'muted small' }, `Geprüft am ${new Date(PR.PROGRESSION_CHECKED_AT).toLocaleDateString('de-DE')} (Abstracts in PubMed). Schätzungen, keine medizinische Beratung.`)
  ), { title: section === 'pause' ? 'Wiedereinstieg' : 'Bewertung & Vorschlag' });
}

// Braucht diese Übung noch eine Bewertung? (Kraft/Körpergewicht, mindestens ein erledigter Arbeitssatz, noch nicht gefragt)
export function needsRating(d) {
  return d.exercise && d.exercise.kind !== 'cardio' && d.workDone && d.entry.rating === undefined;
}

// Sheet: drei große Tasten + „Ohne Bewertung weiter“. Schließen per X/Hintergrund bricht ab (kein Weiter).
export function askRating(d, onDone, { change = false } = {}) {
  let sheet = null;
  const pick = (val) => {
    const r = S.rateEntry(d.entry.id, val);
    if (!r.ok) { toast(r.errors[0], { error: true }); return; }
    sheet.close();
    onDone();
  };
  sheet = openSheet(h('div', { class: 'rate-sheet' },
    h('p', { class: 'muted small' }, 'Bezogen auf den letzten Arbeitssatz: Wie viele Wiederholungen wären noch gegangen?'),
    h('div', { class: 'rate-list' }, Object.entries(PR.RATINGS).map(([k, x]) =>
      h('button', { class: `btn rate-btn${d.entry.rating === k ? ' on' : ''}`, type: 'button', onclick: () => pick(k) }, h('b', {}, x.label), h('small', {}, x.hint)))),
    h('button', { class: 'btn subtle block', type: 'button', onclick: () => pick(change ? null : 'none') }, change ? 'Bewertung entfernen' : 'Ohne Bewertung weiter'),
    h('button', { class: 'link center-link', type: 'button', onclick: () => openProgressionInfo('rating') }, icon('info', { size: 16, cls: 'inline' }), ' Wozu die Bewertung?')
  ), { title: `${d.exercise.name} – wie war’s?` });
}

// Kleine Zeile unter der Tabelle, wenn bewertet: zum Ändern.
export function ratingLine(d, rerender) {
  const r = PR.RATINGS[d.entry.rating];
  if (!r) return null;
  return h('button', { class: 'link rated-line', type: 'button', onclick: () => askRating(d, rerender, { change: true }) },
    `Bewertet: ${r.label} · ändern`);
}

// Vorschlagskarte (2B): Tabelle bleibt auf dem letzten Stand, bis du „Übernehmen“ tippst.
export function suggestionCard(d, rerender) {
  const s = d.suggestion;
  if (!s) return null;
  const decide = (accept) => {
    const r = S.decideSuggestion(d.entry.id, accept);
    if (!r.ok) { toast(r.errors[0], { error: true }); return; }
    rerender();
  };
  const head = s.kind === 'weight'
    ? h('div', { class: 'sug-main' }, kg(s.to), h('span', { class: 'muted' }, ` statt ${fmtNum(s.from)}`))
    : h('div', { class: 'sug-main' }, '+1 Wdh.', h('span', { class: 'muted' }, s.from > 0 ? ` bei ${kg(s.from)}` : ' je Satz'));
  const why = s.kind === 'weight' && s.repsFrom ? `${s.reason} – mehr Gewicht, Wiederholungen wie vorletztes Mal.`
    : s.smallStepNote ? `${s.reason}. Der kleinste Gewichtsschritt (${kg(s.step)}) ist hier groß – erst Wiederholungen.`
      : s.deltaKg < 0 ? `${s.reason} – einen Schritt leichter.` : `${s.reason}.`;
  return h('div', { class: 'card sug-card' },
    h('div', { class: 'sug-top' }, h('span', { class: 'sec-lbl' }, 'Vorschlag für heute'),
      h('button', { class: 'info-btn small', type: 'button', 'aria-label': 'Wie entsteht der Vorschlag?', onclick: () => openProgressionInfo('rating') }, icon('info', { size: 18 }))),
    head,
    h('p', { class: 'muted small' }, `${why} Schätzung – du entscheidest.`),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => decide(true) }, 'Übernehmen'),
      h('button', { class: 'btn', type: 'button', onclick: () => decide(false) }, 'Wie zuletzt')));
}

// „Willkommen zurück“ (3A) vor dem Start eines Plans nach ≥ 21 Tagen Pause.
export function askBreak(plan, exercisesById, sessions, info, { onReduce, onKeep }) {
  const rows = [];
  for (const it of plan.items) {
    const ex = exercisesById[it.exerciseId];
    if (!ex || ex.kind === 'cardio') continue;
    const last = lastPerformance(ex.id, sessions);
    const w = last ? Math.max(0, ...last.sets.filter((x) => x.type !== 'warmup').map((x) => x.weightKg || 0)) : 0;
    if (!(w > 0)) continue;
    rows.push({ name: ex.name, from: w, to: PR.reducedWeight(w, info.pct, PR.loadStep(ex, sessions)) });
  }
  const shown = rows.slice(0, 4);
  let sheet = null;
  sheet = openSheet(h('div', { class: 'break-sheet' },
    h('p', {}, `Dein letztes Training ist ${PR.fmtBreak(info.days)} her. Nach einer Pause ist es sinnvoll, etwas leichter einzusteigen.`),
    h('p', { class: 'muted small' }, `Vorschlag: Gewichte um ${info.pct} % senken (Schätzung). Ab dem nächsten Training gilt wieder deine Bewertung.`),
    shown.length ? h('div', { class: 'card list break-list' },
      shown.map((r) => h('div', { class: 'row' }, h('span', { class: 't' }, r.name), h('span', { class: 'old' }, fmtNum(r.from)), h('span', { class: 'muted' }, '→'), h('b', { class: 'new' }, kg(r.to)))),
      rows.length > shown.length ? h('div', { class: 'row muted small' }, `+ ${rows.length - shown.length} weitere`) : null) : null,
    h('button', { class: 'btn primary block', type: 'button', onclick: () => { sheet.close(); onReduce(); } }, 'Leichter einsteigen'),
    h('button', { class: 'btn block', type: 'button', onclick: () => { sheet.close(); onKeep(); } }, 'Wie zuletzt'),
    h('button', { class: 'link center-link', type: 'button', onclick: () => openProgressionInfo('pause') }, icon('info', { size: 16, cls: 'inline' }), ' Woher kommen die Werte?')
  ), { title: 'Willkommen zurück' });
}
