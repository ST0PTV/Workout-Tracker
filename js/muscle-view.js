// Fortschritt → Muskeln (v1.4, Variante C): eine große Figur mit „Vorne | Hinten“, eingefärbt nach harten Sätzen
// dieser Woche (Mo–So), darunter die meistbelasteten Muskeln; „Alle Muskeln“ klappt die ganze Liste auf.
// Reine Zählung ohne Zielwerte oder Bewertung (Projektregel). Zählweise und Quellen im Info-Sheet.
import { h } from './util.js';
import * as store from './store.js';
import { MUSCLES } from './model.js';
import { weeklyMuscleSets, weekStart, addWeeks, level, fmtSets, LEVEL_LABELS, INDIRECT_FACTOR } from './week.js';
import { figureSvg, FRONT, BACK } from './figure.js';
import { openSheet } from './sheet.js';
import { icon } from './icons.js';

const st = { offset: 0, view: 'front', selected: null, all: false };
const fmtD = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

export const WEEK_INFO = {
  checkedAt: '2026-10-13',
  points: [
    'Gezählt werden harte Sätze aus abgeschlossenen Trainings: Arbeits-, Drop- und Rest-Pause-Sätze (je 1). Aufwärmsätze und Cardio zählen nicht.',
    `Für den primären Muskel zählt ein Satz 1, für sekundär beteiligte Muskeln ${String(INDIRECT_FACTOR).replace('.', ',')} („indirekt“). Diese Zählweise sagte in einer großen Meta-Regression Muskelzuwachs und Kraft am besten vorher.`,
    'Die 0,5 sind eine Konvention: Eine explorative Auswertung kam eher auf 16–32 %. Deshalb stehen direkte und indirekte Sätze getrennt da.',
    'Welcher Muskel primär oder sekundär ist, stammt aus der Recherche zum Übungspool (überwiegend EMG-Studien) bzw. aus deinen eigenen Angaben.',
    'Die Farben sind nur Darstellungsstufen, keine Empfehlung. Die App gibt bewusst keine Zielwerte vor.'
  ],
  sources: [
    { label: 'Pelland et al. 2026, Sports Medicine 56:481–505', url: 'https://doi.org/10.1007/s40279-025-02344-w', note: 'Meta-Regression Volumen/Frequenz; fraktionale Zählung am besten (per Websuche geprüft)' },
    { label: 'Remmert et al. 2025, SportRxiv (Preprint)', url: 'https://sportrxiv.org/index.php/server/preprint/download/537/1148/1071', note: 'Volumen pro Einheit; indirekte Sätze explorativ ca. 16–32 %; nicht begutachtet' }
  ]
};

function openWeekInfo() {
  openSheet(h('div', { class: 'info' },
    h('ul', {}, WEEK_INFO.points.map((t) => h('li', {}, t))),
    h('h3', {}, 'Quellen'),
    h('ul', { class: 'sources' }, WEEK_INFO.sources.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label), h('span', { class: 'muted' }, ` – ${s.note}`)))),
    h('p', { class: 'muted small' }, `Geprüft am ${new Date(WEEK_INFO.checkedAt).toLocaleDateString('de-DE')}.`)
  ), { title: 'So werden Sätze gezählt' });
}

function bar(row, max) {
  const pct = (v) => `${max > 0 ? Math.round((v / max) * 100) : 0}%`;
  return h('span', { class: 'mbar', 'aria-hidden': 'true' }, h('i', { style: `width:${pct(row.direct)}` }), h('b', { style: `width:${pct(row.indirect)}` }));
}

const countText = (row) => (row.indirect ? `${fmtSets(row.direct)} +${fmtSets(row.indirect)}` : fmtSets(row.direct));

export function musclesPanel(rerender) {
  const settings = store.get('settings');
  const sex = settings.figure || 'male';
  const exercises = store.get('exercises');
  const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const start = addWeeks(weekStart(), st.offset);
  const w = weeklyMuscleSets(store.get('sessions'), byId, start);
  const rows = Object.entries(w.muscles).map(([id, r]) => ({ id, name: MUSCLES[id], ...r }));
  const max = Math.max(0, ...rows.map((r) => r.total));
  const pick = (id) => {
    st.selected = st.selected === id ? null : id;
    if (st.selected && !(FRONT.includes(id) && BACK.includes(id))) st.view = FRONT.includes(id) ? 'front' : 'back';
    rerender();
  };

  const weekLabel = st.offset === 0 ? 'Diese Woche' : st.offset === -1 ? 'Letzte Woche' : `Woche ab ${fmtD(w.start)}`;
  const nav = h('div', { class: 'week-nav' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Vorige Woche', onclick: () => { st.offset -= 1; rerender(); } }, icon('chevron', { size: 20, cls: 'flip' })),
    h('div', { class: 'wk' }, h('b', {}, weekLabel), h('small', {}, `${fmtD(w.start)} – ${fmtD(w.end)} · ${w.sessions} ${w.sessions === 1 ? 'Training' : 'Trainings'}`)),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Nächste Woche', disabled: st.offset >= 0, onclick: () => { st.offset = Math.min(0, st.offset + 1); rerender(); } }, icon('chevron', { size: 20 })));

  const sideSeg = h('div', { class: 'chips' },
    [['front', 'Vorne'], ['back', 'Hinten']].map(([k, label]) => h('button', { type: 'button', class: `chip${st.view === k ? ' on' : ''}`, 'aria-pressed': String(st.view === k), onclick: () => { st.view = k; rerender(); } }, label)),
    h('button', { class: 'info-btn', type: 'button', 'aria-label': 'So werden Sätze gezählt', onclick: openWeekInfo }, icon('info', { size: 18 })));

  const fig = figureSvg({ view: st.view, sex, width: 180, selected: st.selected, onPick: pick,
    classOf: (m) => `lv${level(w.muscles[m]?.total || 0)}`,
    label: `${st.view === 'front' ? 'Vorderansicht' : 'Rückansicht'}, eingefärbt nach Sätzen` });

  const legend = h('div', { class: 'legend' }, LEVEL_LABELS.map((t, i) => h('span', {}, h('i', { class: `sw lv${i}` }), t)), h('span', {}, 'Sätze'));

  const sel = st.selected ? rows.find((r) => r.id === st.selected) : null;
  const selCard = sel ? h('div', { class: 'card msel' },
    h('div', { class: 'msel-top' }, h('b', {}, sel.name), h('span', {}, `${fmtSets(sel.direct)} direkt`, sel.indirect ? h('span', { class: 'muted' }, ` · +${fmtSets(sel.indirect)} indirekt`) : null)),
    h('small', { class: 'muted' }, sel.exercises.length
      ? sel.exercises.map((e) => `${byId[e.exerciseId]?.name || 'Übung'} ${fmtSets(e.direct + e.indirect)}`).join(' · ')
      : 'In dieser Woche nicht trainiert.')) : null;

  const sorted = [...rows].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de'));
  const shown = st.all ? rows : sorted.filter((r) => r.total > 0).slice(0, 3);
  const list = h('div', { class: 'card mlist' },
    shown.length ? shown.map((r) => h('button', { type: 'button', class: `mrow${r.total ? '' : ' zero'}${r.id === st.selected ? ' cur' : ''}`, onclick: () => pick(r.id) },
      h('span', { class: 'mname' }, r.name), bar(r, max), h('span', { class: 'mnum' }, countText(r))))
      : h('p', { class: 'muted small center' }, 'In dieser Woche noch keine harten Sätze.'),
    h('button', { class: 'link small center-btn', type: 'button', onclick: () => { st.all = !st.all; rerender(); } }, st.all ? 'Weniger anzeigen' : 'Alle Muskeln'));

  return [
    nav,
    sideSeg,
    h('div', { class: 'card fig-card' }, fig),
    legend,
    selCard,
    list,
    h('p', { class: 'muted small' }, `Direkt = Muskel primär (1 je Satz), indirekt = sekundär (${String(INDIRECT_FACTOR).replace('.', ',')} je Satz). Nur Zählung, keine Zielwerte.`)
  ].filter(Boolean);
}
