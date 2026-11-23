// Fortschritt → Rückblick (bis v3.14 „4 Wochen“; v2.23.0, Variante B mit Ø-Spalte, Wahl des Nutzers): Heatmap Muskeln ×
// Zeitabschnitte, Ø Sätze pro Woche, Kraft-Trend (e1RM, Schätzung) der Hauptübung, bei 4 Wochen darunter
// „Zuletzt wenig trainiert“ (relativ, ohne Soll).
// v3.15.0 (Wahl des Nutzers 2026-11-22: Mockup A + Gesamtverlauf aus C): Zeitraum-Chips und ein Verlauf über alle Wochen
// mit verschiebbarem Ausschnitt. Ab 8 Wochen fasst das Raster Monate, Quartale oder Jahre zusammen.
import { infoBody, hintLine } from './info.js';
import { openGlossary } from './glossary.js';
import { h } from './util.js';
import * as store from './store.js';
import { level, fmtSets, LEVEL_LABELS, INDIRECT_FACTOR } from './week.js';
import { NOISE_PCT, E1RM_MAX_REPS } from './progress.js';
import { rangeAnalysis, weeklyTotals, columnsFor, columnLabel, columnValues, presetWindow, PRESETS, WEEKS, MIN_TRAINED } from './analysis.js';
import { weekStart, addWeeks } from './week.js';
import { candidatesFor, addToTraining } from './muscle-pick.js';
import { activeSession } from './session.js';
import { openSheet } from './sheet.js';
import { icon } from './icons.js';
import { toast } from './ui.js';

const fmtD = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const fmtDY = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtMY = (d) => d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
const fmtPct = (p) => `${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(Math.round(p)).toLocaleString('de-DE')} %`;

export const ANALYSIS_INFO = {
  checkedAt: '2026-10-22',
  short: [
    'Zeitraum frei wählbar; Sätze gezählt wie in der Muskelkarte.',
    '„Zuletzt wenig trainiert“ vergleicht nur mit deinen anderen Muskeln – kein Ziel.',
    'Der Kraft-Trend ist eine grobe Schätzung; unter ±5 % ist Tagesform.'
  ],
  points: [
    `Zeitraum: Standard sind die letzten ${WEEKS} abgeschlossenen Kalenderwochen (Mo–So). Über die Chips oder den Rahmen im Gesamtverlauf wählst du andere Wochen. Die laufende Woche fehlt immer, damit eine halbe Woche den Schnitt nicht drückt – sie steht unter „Muskeln“.`,
    `Bei längeren Zeiträumen fasst das Raster Wochen zu Monaten, Quartalen oder Jahren zusammen (höchstens 7 Spalten). Jede Zelle zeigt dann den Ø an Sätzen pro Woche in diesem Abschnitt, gerundet. So bedeuten die Farben überall dasselbe. Eine Woche zählt zu dem Monat, in dem ihr Montag liegt.`,
    `Gezählt wird wie in der Muskelkarte: harte Sätze aus abgeschlossenen Trainings, direkt 1, indirekt ${String(INDIRECT_FACTOR).replace('.', ',')}. Diese Zählweise sagte in einer Meta-Regression (67 Studien) Muskelzuwachs und Kraft am besten vorher. Ø ist die Summe geteilt durch die Zahl der Wochen; Wochen ohne Training zählen als 0 und senken den Schnitt aller Muskeln gleich.`,
    'Warum pro Woche: Bei gleichem Wochenvolumen machte die Verteilung auf mehr oder weniger Trainingstage für den Muskelzuwachs keinen nennenswerten Unterschied (Meta-Analyse, 25 Studien). Für die Kraft half häufigeres Training etwas, mit abnehmendem Nutzen.',
    'Die Farben sind dieselben Darstellungsstufen wie in der Muskelkarte (0 · <5 · 5–8 · ≥9). Sie sind keine Zielwerte.',
    `„Zuletzt wenig trainiert“ ist ein Vergleich mit dir selbst: Muskelgruppen, deren Ø unter der Hälfte des Medians deiner trainierten Muskelgruppen liegt. Die Hälfte ist eine Konvention der App, kein Wert aus Studien. Berücksichtigt werden nur Muskeln, für die du eine eigene Übung hast; ab ${MIN_TRAINED} trainierten Muskelgruppen. Der Hinweis erscheint nur bei „4 W“.`,
    'Weniger Sätze sind nicht automatisch ein Problem: Mehr Sätze brachten im Mittel mehr, aber mit abnehmendem Zusatznutzen – bei der Kraft deutlich früher als beim Muskelzuwachs. Auch kleine Wochenmengen steigerten bei bisher Untrainierten die Kraft. Ziele, Beschwerden oder Pausen können gute Gründe sein; der Hinweis ist eine Orientierung, kein Auftrag.',
    `Kraft-Trend: geschätzte Maximalkraft (e1RM nach Epley, nur Sätze bis ${E1RM_MAX_REPS} Wdh.) der Übung mit den meisten harten Sätzen für diesen Muskel, erstes gegen letztes Training im Zeitraum. Unter ±${NOISE_PCT} % ist normales Tagesrauschen: Schon ein echter 1RM-Test schwankt zwischen zwei Tagen im Median um 4,2 %. Nach 6 Wochen Training stieg das 1RM im Bankdrücken bei College-Footballern im Mittel um 4,2 ± 8,6 kg, und die Änderung der Wiederholungen passte kaum zur Änderung des 1RM. Ein kurzer Trend ist deshalb nur ein grober Hinweis und gilt nur für diese eine Übung.`
  ],
  sources: [
    { label: 'Pelland et al. 2026, Sports Medicine 56:481–505', url: 'https://doi.org/10.1007/s40279-025-02344-w', note: 'Meta-Regression (67 Studien): Hilfssätze als halbe Sätze zählen passte am besten. Mehr Sätze bringen mehr, aber mit abnehmendem Nutzen, bei Kraft deutlich stärker. Mehr Trainingstage pro Woche halfen nur bei Kraft klar (Volltext).' },
    { label: 'Schoenfeld, Grgic & Krieger 2019, J Sports Sci', url: 'https://doi.org/10.1080/02640414.2018.1555906', note: 'Meta-Analyse: bei gleichem Volumen kein relevanter Effekt der Frequenz auf Muskelzuwachs (Abstract)' },
    { label: 'Nuzzo et al. 2024, Sports Medicine', url: 'https://doi.org/10.1007/s40279-024-02009-0', note: 'Übersicht: kleine Wochenmengen steigern bei Untrainierten die Kraft (Abstract)' },
    { label: 'Grgic et al. 2020, Sports Med Open', url: 'https://doi.org/10.1186/s40798-020-00260-z', note: '1RM-Wiederholungstest: Median-Variationskoeffizient 4,2 % (Abstract)' },
    { label: 'Mann et al. 2015, J Strength Cond Res', url: 'https://doi.org/10.1519/JSC.0000000000000829', note: '6 Wochen: 1RM +4,2 ± 8,6 kg; Änderung der Wdh. passte kaum zur 1RM-Änderung (r = −0,22) (Abstract)' }
  ]
};

function openAnalysisInfo() {
  openSheet(infoBody({
    short: ANALYSIS_INFO.short, details: [h('ul', {}, ANALYSIS_INFO.points.map((t) => h('li', {}, t)))],
    sources: ANALYSIS_INFO.sources, checked: ANALYSIS_INFO.checkedAt, glossary: openGlossary
  }), { title: 'So entsteht der Rückblick' });
}

function trendCell(m) {
  if (!m.main) return h('span', { class: 'a4t none', title: 'keine Kraftübung' }, '–');
  if (!m.main.trend) return h('span', { class: 'a4t none', title: m.main.points ? 'erst 1 Schätzwert' : `nur Sätze über ${E1RM_MAX_REPS} Wdh.` }, '–');
  return h('span', { class: `a4t${m.main.trend.withinNoise ? ' noise' : ''}`, title: `${m.main.name} (Schätzung)` }, fmtPct(m.main.trend.pct));
}

// Gewählter Zeitraum (nur für diese Sitzung, nicht gespeichert). from/to = Wochenindizes in weeklyTotals.
const view = { preset: '4w', from: null, to: null };
const titleOf = (preset) => (preset === 'custom' ? 'Eigener Zeitraum' : PRESETS.find((p) => p.key === preset).title);
const UNIT_NAME = { month: 'Monat', quarter: 'Quartal', year: 'Jahr' };

function currentWindow(T) {
  if (view.preset === 'custom' && view.to !== null && view.to <= T && view.from >= 0 && view.from < view.to) return { from: view.from, to: view.to };
  if (view.preset === 'custom') view.preset = '4w';
  // 4 W bleiben immer 4 Wochen, auch wenn es noch keine 4 Wochen Daten gibt (wie bisher).
  return view.preset === '4w' ? { from: T - WEEKS, to: T } : presetWindow(T, view.preset);
}

// Gesamtverlauf: ein Balken je abgeschlossener Woche, darüber der Rahmen des Ausschnitts.
// Ziehen im Rahmen verschiebt ihn, an den Griffen ändert sich Anfang oder Ende; Tippen daneben setzt ihn dorthin.
function overview(totals, win, rerender) {
  const T = totals.length;
  const max = Math.max(1, ...totals.map((w) => w.sets));
  const bars = h('div', { class: `rb-bars${T > 80 ? ' dense' : ''}`, 'aria-hidden': 'true' },
    totals.map((w) => h('span', { class: `rb-bar${w.sets ? '' : ' zero'}`, style: `height:${Math.max(4, Math.round((w.sets / max) * 100))}%` })));
  const frame = h('div', { class: 'rb-win' });
  const range = h('b', { class: 'rb-range' });
  const sub = h('small', { class: 'muted' });
  const cur = { ...win }; // „in“ an den Balken setzt paint()
  const paint = () => {
    frame.style.left = `${(cur.from / T) * 100}%`;
    frame.style.width = `${((cur.to - cur.from) / T) * 100}%`;
    [...bars.children].forEach((b, i) => b.classList.toggle('in', i >= cur.from && i < cur.to));
    const a = totals[cur.from].start, e = new Date(addWeeks(totals[cur.to - 1].start, 1).getTime() - 1);
    range.textContent = `${fmtD(a)} – ${fmtDY(e)}`;
    const n = cur.to - cur.from;
    sub.textContent = `${n} ${n === 1 ? 'Woche' : 'Wochen'}`;
    lo.setAttribute('aria-valuenow', String(cur.from)); lo.setAttribute('aria-valuetext', fmtDY(a));
    hi.setAttribute('aria-valuenow', String(cur.to)); hi.setAttribute('aria-valuetext', fmtDY(e));
  };
  const commit = () => {
    if (cur.from === win.from && cur.to === win.to) return;
    view.preset = 'custom'; view.from = cur.from; view.to = cur.to; rerender();
  };
  const keys = (which) => (e) => {
    const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0;
    if (!d) return;
    e.preventDefault();
    if (which === 'from') cur.from = Math.max(0, Math.min(cur.to - 1, cur.from + d));
    else cur.to = Math.max(cur.from + 1, Math.min(T, cur.to + d));
    paint(); commit();
  };
  const lo = h('button', { class: 'rb-h lo', type: 'button', role: 'slider', 'aria-label': 'Beginn des Zeitraums', 'aria-valuemin': '0', 'aria-valuemax': String(T - 1), onkeydown: keys('from') });
  const hi = h('button', { class: 'rb-h hi', type: 'button', role: 'slider', 'aria-label': 'Ende des Zeitraums', 'aria-valuemin': '1', 'aria-valuemax': String(T), onkeydown: keys('to') });
  frame.append(lo, hi);
  const chart = h('div', { class: 'rb-chart' }, bars, frame);
  // Ziehen (Zeiger): Modus nach dem Startpunkt – Griff links/rechts, im Rahmen verschieben, sonst Rahmen dorthin.
  let drag = null;
  const idxAt = (x) => { const r = chart.getBoundingClientRect(); return Math.max(0, Math.min(T, ((x - r.left) / r.width) * T)); };
  chart.addEventListener('pointerdown', (e) => {
    const r = chart.getBoundingClientRect();
    const px = (i) => r.left + (i / T) * r.width;
    const near = 22;
    let mode;
    if (Math.abs(e.clientX - px(cur.from)) <= near && Math.abs(e.clientX - px(cur.from)) <= Math.abs(e.clientX - px(cur.to))) mode = 'from';
    else if (Math.abs(e.clientX - px(cur.to)) <= near) mode = 'to';
    else if (e.clientX > px(cur.from) && e.clientX < px(cur.to)) mode = 'move';
    else {
      const n = cur.to - cur.from;
      const c = Math.floor(idxAt(e.clientX));
      cur.from = Math.max(0, Math.min(T - n, c - Math.floor(n / 2))); cur.to = cur.from + n;
      mode = 'move'; paint();
    }
    drag = { mode, x0: idxAt(e.clientX), from0: cur.from, to0: cur.to };
    chart.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  chart.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const i = idxAt(e.clientX);
    if (drag.mode === 'from') cur.from = Math.max(0, Math.min(cur.to - 1, Math.round(i)));
    else if (drag.mode === 'to') cur.to = Math.max(cur.from + 1, Math.min(T, Math.round(i)));
    else {
      const n = drag.to0 - drag.from0;
      cur.from = Math.max(0, Math.min(T - n, drag.from0 + Math.round(i - drag.x0))); cur.to = cur.from + n;
    }
    paint();
  });
  const end = () => { if (!drag) return; drag = null; commit(); };
  chart.addEventListener('pointerup', end);
  chart.addEventListener('pointercancel', end);
  const mid = totals[Math.floor((T - 1) / 2)].start;
  const axis = h('div', { class: 'rb-axis muted small' }, h('span', {}, fmtMY(totals[0].start)), T > 8 ? h('span', {}, fmtMY(mid)) : null, h('span', {}, fmtMY(totals[T - 1].start)));
  const card = h('div', { class: 'card rb-card' },
    h('div', { class: 'rb-top' }, h('b', {}, 'Gesamtverlauf'), h('small', { class: 'muted' }, 'Sätze pro Woche')),
    chart, axis,
    h('div', { class: 'rb-top rb-sel' }, range, sub),
    h('p', { class: 'muted small rb-tip' }, 'Rahmen ziehen oder an den Griffen ändern.'));
  paint();
  return card;
}

export function analysisPanel(rerender) {
  const exercises = store.get('exercises');
  const sessions = store.get('sessions');
  const totals = weeklyTotals(sessions, exercises);
  const T = totals.length;
  const win = currentWindow(T);
  const nWeeks = win.to - win.from; // 4 W kann vor der ersten Woche mit Daten beginnen
  const shown = { from: Math.max(0, win.from), to: win.to }; // Ausschnitt im Gesamtverlauf
  const a = rangeAnalysis(sessions, exercises, addWeeks(weekStart(new Date()), win.to - T), nWeeks);
  const setsInWin = totals.slice(shown.from, shown.to).reduce((x, w) => x + w.sets, 0);

  const chips = h('div', { class: 'chips rb-chips', role: 'group', 'aria-label': 'Zeitraum' },
    PRESETS.map((p) => h('button', { type: 'button', class: `chip${view.preset === p.key ? ' on' : ''}`, 'aria-pressed': String(view.preset === p.key),
      onclick: () => { view.preset = p.key; view.from = view.to = null; rerender(); } }, p.label)));
  // Eigener Zeitraum: kein eigener Chip (passt auf 320 px nicht), sondern Rahmen im Gesamtverlauf ziehen.
  const head = h('div', { class: 'a4-head' },
    h('div', { class: 'wk' }, h('b', {}, titleOf(view.preset)),
      h('small', {}, [T >= 2 ? null : `${fmtD(a.weeks[0].start)} – ${fmtDY(a.weeks[a.weeks.length - 1].end)}`, // mit Gesamtverlauf steht das Datum dort
        `${a.sessions} ${a.sessions === 1 ? 'Training' : 'Trainings'}`, a.sessions ? `Ø\u00a0${fmtSets(setsInWin / nWeeks)} Sätze/Woche` : null].filter(Boolean).join(' · '))),
    h('button', { class: 'info-btn', type: 'button', 'aria-label': 'So entsteht der Rückblick', onclick: openAnalysisInfo }, icon('info', { size: 20 })));
  const top = [chips, T >= 2 ? overview(totals, shown, rerender) : null, head].filter(Boolean);

  if (!a.sessions) {
    return [...top, h('div', { class: 'card empty' }, h('div', { class: 'big' }, icon('progress', { size: 44 })), h('h2', {}, T ? 'Keine Trainings im Zeitraum' : 'Noch keine abgeschlossene Woche'),
      h('p', { class: 'muted' }, T ? 'Wähle einen anderen Zeitraum.' : `Noch keine Trainings in den letzten ${WEEKS} abgeschlossenen Wochen.`))];
  }

  const cols = columnsFor(a.weeks.map((w) => w.start));
  const weekly = cols[0]?.unit === 'week';
  const colTitle = (c) => { const s0 = a.weeks[c.idx[0]].start, e0 = a.weeks[c.idx[c.idx.length - 1]].end; return `${fmtD(s0)} – ${fmtDY(e0)}`; };
  const rows = a.muscles.filter((m) => m.avg > 0).sort((x, y) => y.avg - x.avg || x.name.localeCompare(y.name, 'de'));
  const zero = a.muscles.filter((m) => m.avg === 0);
  const grid = h('div', { class: `a4-grid${cols.length > 5 ? ' many' : ''}`, role: 'table', style: `--a4n:${cols.length}`, 'aria-label': weekly ? 'Sätze pro Muskel und Woche' : 'Ø Sätze pro Woche je Muskel und Abschnitt' },
    h('span', { class: 'a4h' }),
    cols.map((c) => h('span', { class: 'a4h', title: colTitle(c) }, columnLabel(c))),
    h('span', { class: 'a4h' }, 'Ø/Wo'),
    h('span', { class: 'a4h' }, 'Kraft'),
    rows.flatMap((m) => [
      h('span', { class: 'a4n' }, m.name),
      ...columnValues(m.weeks, cols).map((v) => h('span', { class: `a4c lv${level(v)}` }, weekly ? fmtSets(v) : String(Math.round(v)))),
      h('span', { class: 'a4avg' }, fmtSets(m.avg)),
      trendCell(m)
    ]));
  const legend = h('div', { class: 'legend' }, LEVEL_LABELS.map((t, i) => h('span', {}, h('i', { class: `sw lv${i}` }), t)), h('span', {}, 'Sätze/Woche'));
  const table = h('div', { class: 'card a4-card' },
    hintLine(weekly ? 'Sätze je Woche · Kraft = Trend der Hauptübung (Schätzung)' : `Ø Sätze pro Woche je ${UNIT_NAME[cols[0].unit]} · Kraft = Trend der Hauptübung (Schätzung)`, openAnalysisInfo),
    grid,
    zero.length ? h('p', { class: 'muted small a4zero' }, `Nicht trainiert: ${zero.map((m) => m.name).join(', ')}`) : null);

  const choose = (arg) => {
    const r = addToTraining(arg);
    if (!r.ok) { toast(r.errors[0], { error: true }); return; }
    toast(r.started ? 'Freies Training gestartet' : 'Zum Training hinzugefügt');
    location.hash = '#/';
  };
  // „Zuletzt wenig trainiert“ nur bei 4 W: so geprüft und begründet (relativ zu den letzten Wochen).
  let hintCard = null;
  if (view.preset === '4w' && a.hints.length) {
    hintCard = h('div', { class: 'card a4-hint' },
      h('h3', {}, 'Zuletzt wenig trainiert'),
      h('p', { class: 'sub' }, `Weniger als die Hälfte deines Medians (${fmtSets(a.median)} Sätze/Woche). Kein Soll.`),
      a.hints.map((m) => {
        const c = candidatesFor(m.id, exercises);
        const opts = [...c.own.map((e) => ({ name: e.name, arg: { exerciseId: e.id } })), ...c.pool.map((p) => ({ name: p.name, arg: { poolRef: p.ref }, pool: true }))].slice(0, 3);
        return h('div', { class: 'a4-hrow' },
          h('div', {}, h('b', {}, m.name), h('small', { class: 'muted' }, ` Ø ${fmtSets(m.avg)} Sätze/Woche`)),
          h('div', { class: 'chips wrap' }, opts.map((o) => h('button', { type: 'button', class: 'chip', onclick: () => choose(o.arg) }, o.name, o.pool ? h('small', { class: 'muted' }, ' · Pool') : null))));
      }),
      h('small', { class: 'muted' }, activeSession() ? 'Antippen fügt die Übung dem laufenden Training hinzu.' : 'Antippen startet ein freies Training mit dieser Übung.'));
  } else if (view.preset === '4w' && !a.enough) {
    hintCard = h('p', { class: 'muted small center' }, `Vergleich ab ${MIN_TRAINED} trainierten Muskelgruppen.`);
  }
  return [...top, table, legend, hintCard].filter(Boolean);
}
