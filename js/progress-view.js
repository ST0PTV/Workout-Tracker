// Fortschritt (Variante A + B, ab v1.1 mit Tagebuch „Trainings“): eigener Tab mit allen trainierten Übungen (Mini-Verlauf, Trend),
// Detail pro Übung als Sheet – erreichbar aus dem Tab, aus dem Übungs-Editor und aus dem Training.
// Gemessene Werte (bester Satz) und Schätzwerte (e1RM) sind immer getrennt und als solche beschriftet.
import { h } from './util.js';
import * as store from './store.js';
import * as lib from './exercises.js';
import { exerciseProgress, progressSummary, exercisesWithHistory, fmtKg, NOISE_PCT } from './progress.js';
import { PROGRESS_INFO, PROGRESS_CHECKED_AT, E1RM_LABEL, E1RM_EXPLAIN } from './progress-info.js';
import { openSheet } from './sheet.js';
import { icon } from './icons.js';
import { diaryList, setText } from './diary-view.js';
import { musclesPanel } from './muscle-view.js';
import { fmtDuration, fmtKm, fmtPace } from './input.js';
import { formatSet } from './sets.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const fmtDay = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const fmtDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const fmtPct = (p) => `${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(p).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
const finished = () => store.get('sessions').filter((s) => s.endedAt !== null);

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// Sätze kompakt: "85 × 6, 85 × 5 + 60 × 6" (Drop-/Rest-Pause-Stufen mit +, v1.2 aus sets.js)
function fmtSets(sets, kind = 'strength') {
  return sets.map((s) => formatSet(s, kind)).join(', ');
}

export function hasHistory(exerciseId) {
  return exerciseProgress(exerciseId, finished()).length > 0;
}

// ---------- Info ----------

export function openProgressInfo() {
  openSheet(h('div', { class: 'info' },
    h('p', {}, h('b', {}, `${E1RM_LABEL}: `), E1RM_EXPLAIN),
    h('ul', {}, PROGRESS_INFO.summary.map((t) => h('li', {}, t))),
    h('h3', {}, 'Quellen'),
    h('ul', { class: 'sources' }, PROGRESS_INFO.sources.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label), h('span', { class: 'muted' }, ` – ${s.note}`)))),
    h('p', { class: 'muted small' }, `Geprüft am ${new Date(PROGRESS_CHECKED_AT).toLocaleDateString('de-DE')}. Schätzwerte ersetzen keinen gemessenen Maximaltest.`)
  ), { title: 'So wird Fortschritt berechnet' });
}

// ---------- Mini-Verlauf (Liste) ----------

function sparkline(values, w = 72, h0 = 28) {
  const svg = svgEl('svg', { width: w, height: h0, viewBox: `0 0 ${w} ${h0}`, class: 'spark', 'aria-hidden': 'true' });
  if (values.length < 2) return svg;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const X = (i) => 4 + (i * (w - 8)) / (values.length - 1);
  const Y = (v) => 4 + ((hi - v) * (h0 - 8)) / ((hi - lo) || 1);
  svg.append(svgEl('polyline', { points: values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' '), class: 'sp-line' }));
  svg.append(svgEl('circle', { cx: X(values.length - 1).toFixed(1), cy: Y(values[values.length - 1]).toFixed(1), r: 3, class: 'sp-dot' }));
  return svg;
}

// ---------- Diagramm (Detail) ----------

function niceStep(range) {
  for (const s of [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100]) if (range / s <= 4) return s;
  return 200;
}

// Linie = e1RM je Training, Band = ±5 % Formel-Ungenauigkeit. Antippen eines Punkts zeigt Datum, Satz und Wert.
function e1rmChart(points, onSelect) {
  const W = 340; const H = 180; const pl = 34; const pr = 34; const pt = 12; const pb = 24;
  const vals = points.map((p) => p.e1rm.value);
  const rawLo = Math.min(...vals) * (1 - NOISE_PCT / 100);
  const rawHi = Math.max(...vals) * (1 + NOISE_PCT / 100);
  const step = niceStep(rawHi - rawLo);
  const lo = Math.floor(rawLo / step) * step;
  const hi = Math.ceil(rawHi / step) * step;
  const t0 = Date.parse(points[0].date);
  const span = Date.parse(points[points.length - 1].date) - t0;
  const X = (i) => (points.length === 1 ? (pl + W - pr) / 2 : pl + ((span > 0 ? (Date.parse(points[i].date) - t0) / span : i / (points.length - 1)) * (W - pl - pr)));
  const Y = (v) => pt + ((hi - v) * (H - pt - pb)) / (hi - lo);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `${E1RM_LABEL} pro Training, ${points.length} Werte` });
  for (let v = lo; v <= hi + 1e-9; v += step) {
    svg.append(svgEl('line', { x1: pl, x2: W - pr + 6, y1: Y(v).toFixed(1), y2: Y(v).toFixed(1), class: 'ch-grid' }));
    const t = svgEl('text', { x: pl - 6, y: (Y(v) + 3.5).toFixed(1), class: 'ch-tick', 'text-anchor': 'end' });
    t.textContent = fmtKg(v);
    svg.append(t);
  }
  if (points.length > 1) {
    const up = points.map((p, i) => `${X(i).toFixed(1)},${Y(p.e1rm.value * (1 + NOISE_PCT / 100)).toFixed(1)}`);
    const dn = points.map((p, i) => `${X(i).toFixed(1)},${Y(p.e1rm.value * (1 - NOISE_PCT / 100)).toFixed(1)}`).reverse();
    svg.append(svgEl('polygon', { points: [...up, ...dn].join(' '), class: 'ch-band' }));
    svg.append(svgEl('polyline', { points: points.map((p, i) => `${X(i).toFixed(1)},${Y(p.e1rm.value).toFixed(1)}`).join(' '), class: 'ch-line' }));
  } else {
    svg.append(svgEl('rect', { x: X(0) - 10, y: Y(vals[0] * 1.05), width: 20, height: Y(vals[0] * 0.95) - Y(vals[0] * 1.05), rx: 6, class: 'ch-band' }));
  }
  const dots = points.map((p, i) => {
    const c = svgEl('circle', { cx: X(i).toFixed(1), cy: Y(p.e1rm.value).toFixed(1), r: 4, class: 'ch-dot' });
    svg.append(c);
    return c;
  });
  // Achsenbeschriftung nur erster und letzter Termin; Wert-Label nur am letzten Punkt.
  const xl = (i, anchor) => { const t = svgEl('text', { x: X(i).toFixed(1), y: H - 6, class: 'ch-tick', 'text-anchor': anchor }); t.textContent = fmtDay(points[i].date); svg.append(t); };
  xl(0, points.length === 1 ? 'middle' : 'start');
  if (points.length > 1) xl(points.length - 1, 'end');
  const end = svgEl('text', { x: (X(points.length - 1) + 8).toFixed(1), y: (Y(vals[vals.length - 1]) + 4).toFixed(1), class: 'ch-end' });
  end.textContent = fmtKg(vals[vals.length - 1]);
  svg.append(end);
  // Große Tap-Ziele: senkrechte Streifen um jeden Punkt.
  points.forEach((p, i) => {
    const left = i === 0 ? pl - 10 : (X(i - 1) + X(i)) / 2;
    const right = i === points.length - 1 ? W - pr + 10 : (X(i) + X(i + 1)) / 2;
    const hit = svgEl('rect', { x: left.toFixed(1), y: 0, width: Math.max(1, right - left).toFixed(1), height: H, class: 'ch-hit', 'data-i': i });
    hit.addEventListener('click', () => select(i));
    svg.append(hit);
  });
  const select = (i) => {
    dots.forEach((d, j) => { d.setAttribute('r', j === i ? 6 : 4); d.classList.toggle('sel', j === i); });
    onSelect(points[i]);
  };
  select(points.length - 1);
  return svg;
}

// ---------- Detail einer Übung ----------

export function progressPanel(exercise) {
  const rows = exerciseProgress(exercise.id, finished(), { kind: exercise.kind });
  if (!rows.length) {
    return h('div', { class: 'progress-panel' }, h('p', { class: 'muted' }, 'Noch kein abgeschlossenes Training mit dieser Übung. Der Verlauf erscheint nach dem ersten Training.'));
  }
  if (exercise.kind === 'cardio') return cardioPanel(rows);
  const sum = progressSummary(rows);
  const isStrength = exercise.kind === 'strength';
  const est = rows.filter((r) => r.e1rm);
  const lastEst = est.length ? est[est.length - 1] : null;

  const tiles = h('div', { class: 'tiles' },
    h('div', { class: 'tile' }, h('small', {}, 'Bester Satz'),
      h('b', {}, isStrength ? `${fmtKg(sum.bestTop.weightKg)} × ${sum.bestTop.reps}` : setText({ weightKg: sum.bestTop.weightKg || null, reps: sum.bestTop.reps, drops: [] }, 'bodyweight')),
      h('span', {}, `gemessen · ${fmtDate(sum.bestTop.date)}`)),
    isStrength
      ? h('div', { class: 'tile' }, h('small', {}, 'e1RM ', h('span', { class: 'est' }, 'Schätzung')),
        h('b', {}, lastEst ? `≈ ${fmtKg(lastEst.e1rm.value)} kg` : '–'),
        h('span', {}, lastEst ? `zuletzt · ±${NOISE_PCT} %` : 'nur Sätze ≤ 10 Wdh.'))
      : h('div', { class: 'tile' }, h('small', {}, 'Trainings'), h('b', {}, String(sum.sessions)), h('span', {}, 'abgeschlossen')));

  let chartBlock = null;
  if (isStrength && est.length) {
    const readout = h('div', { class: 'ch-read', 'aria-live': 'polite' });
    const onSelect = (p) => {
      const ch = p.change ? ` · ${fmtPct(p.change.pct)}${p.change.withinNoise ? ' (Rauschen)' : ''}` : '';
      readout.textContent = `${fmtDate(p.date)} · ${fmtKg(p.e1rm.weightKg)} kg × ${p.e1rm.reps} → ≈ ${fmtKg(p.e1rm.value)} kg${ch}`;
    };
    chartBlock = h('div', {},
      h('div', { class: 'ctitle' }, h('span', {}, `${E1RM_LABEL} pro Training, kg`), h('button', { class: 'info-btn', type: 'button', 'aria-label': 'So wird Fortschritt berechnet', onclick: openProgressInfo }, icon('info', { size: 18 }))),
      h('div', { class: 'card chart-card' }, e1rmChart(est, onSelect), readout,
        h('div', { class: 'ch-legend muted small' }, h('span', { class: 'band-swatch' }), `Band = ±${NOISE_PCT} % typische Ungenauigkeit der Formel`)),
      sum.trend ? h('p', { class: 'muted small' }, `Seit ${fmtDate(sum.trend.from)}: ${fmtPct(sum.trend.pct)}${sum.trend.withinNoise ? ' – im Rauschbereich, noch kein klarer Trend.' : '.'}`)
        : h('p', { class: 'muted small' }, 'Ab zwei Trainings mit Schätzwert entsteht ein Verlauf.'));
  } else if (isStrength) {
    chartBlock = h('p', { class: 'muted small' }, 'Kein Schätzwert: Alle Arbeitssätze hatten mehr als 10 Wiederholungen. Für die Schätzung braucht es einen Satz mit höchstens 10 Wiederholungen.');
  }

  const table = h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Datum'), h('th', {}, 'Arbeitssätze'), h('th', { class: 'n' }, isStrength ? h('span', {}, 'e1RM ', h('span', { class: 'est' }, '≈')) : 'Wdh.'))),
    h('tbody', {}, [...rows].reverse().map((r) => h('tr', {},
      h('td', {}, fmtDay(r.date)),
      h('td', {}, fmtSets(r.sets, exercise.kind)),
      h('td', { class: 'n' }, isStrength
        ? (r.e1rm ? [fmtKg(r.e1rm.value), r.change ? h('small', {}, `${fmtPct(r.change.pct)}${r.change.withinNoise ? ' · Rauschen' : ''}`) : null] : h('span', { class: 'muted' }, '–'))
        : String(r.totalReps))))));

  return h('div', { class: 'progress-panel' }, tiles, chartBlock,
    h('div', { class: 'sec' }, 'Alle Trainings'),
    h('div', { class: 'card tbl-card' }, table),
    h('p', { class: 'muted small' }, 'Ohne Aufwärmsätze. Werte nur innerhalb dieser Übung vergleichen.'));
}

// v1.4 Cardio: gemessene Werte (Dauer, Strecke) und daraus berechnetes Tempo; kein Diagramm, keine Kalorien.
function cardioPanel(rows) {
  const last = rows[rows.length - 1];
  const fmt = (r) => [r.durationSec ? fmtDuration(r.durationSec) : null, r.distanceM ? `${fmtKm(r.distanceM)} km` : null].filter(Boolean).join(' · ') || '–';
  return h('div', { class: 'progress-panel' },
    h('div', { class: 'tiles' },
      h('div', { class: 'tile' }, h('small', {}, 'Zuletzt'), h('b', {}, fmt(last)), h('span', {}, fmtDate(last.date))),
      h('div', { class: 'tile' }, h('small', {}, 'Trainings'), h('b', {}, String(rows.length)), h('span', {}, 'abgeschlossen'))),
    h('div', { class: 'sec' }, 'Alle Einheiten'),
    h('div', { class: 'card tbl-card' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Datum'), h('th', {}, 'Einheit'), h('th', { class: 'n' }, 'Tempo'))),
      h('tbody', {}, [...rows].reverse().map((r) => h('tr', {}, h('td', {}, fmtDay(r.date)), h('td', {}, fmt(r)), h('td', { class: 'n' }, fmtPace(r.durationSec, r.distanceM) || '–')))))),
    h('p', { class: 'muted small' }, 'Tempo = Dauer ÷ Strecke (pro km). Werte nur innerhalb dieser Übung vergleichen.'));
}

export function openProgress(exerciseId) {
  const ex = lib.getExercise(exerciseId);
  if (!ex) return;
  openSheet(progressPanel(ex), { title: ex.name, full: true });
}

// ---------- Tab ----------

function trendLabel(ex) {
  if (ex.kind !== 'strength') return h('span', { class: 'trend noise' }, ex.kind === 'bodyweight' ? 'Körpergewicht' : 'Cardio');
  const rows = exerciseProgress(ex.id, finished(), { kind: ex.kind });
  const sum = progressSummary(rows);
  if (!sum.estimatePoints) return h('span', { class: 'trend noise' }, 'nur Wdh. > 10');
  if (!sum.trend) return h('span', { class: 'trend noise' }, 'erst 1 Wert');
  return h('span', { class: `trend${sum.trend.withinNoise ? ' noise' : ''}` }, fmtPct(sum.trend.pct), sum.trend.withinNoise ? h('small', {}, 'Rauschen') : null);
}

// v1.1: Umschalter „Übungen | Trainings“ (Variante C). Der Modus bleibt beim Neu-Rendern erhalten.
const tabState = { mode: 'exercises' };

function exerciseList() {
  const all = lib.listExercises({ includeArchived: true });
  const list = exercisesWithHistory(all, finished());
  return list.length
    ? [h('p', { class: 'sub' }, `Trend der geschätzten Maximalkraft (e1RM, Schätzung) seit dem ersten Training. Unter ±${NOISE_PCT} % ist normales Tagesrauschen.`),
      h('div', { class: 'card list' }, list.map(({ exercise: ex, sessions }) => {
        const rows = exerciseProgress(ex.id, finished(), { kind: ex.kind });
        const lastRow = rows[rows.length - 1];
        const values = ex.kind === 'strength' ? rows.filter((r) => r.e1rm).map((r) => r.e1rm.value) : ex.kind === 'cardio' ? rows.map((r) => r.distanceM || r.durationSec) : rows.map((r) => r.totalReps);
        const top = lastRow.topSet;
        const lastText = ex.kind === 'cardio' ? setText(lastRow, 'cardio') : ex.kind === 'bodyweight' ? setText({ ...top, drops: [] }, 'bodyweight') : top.weightKg ? `${fmtKg(top.weightKg)} × ${top.reps}` : `${top.reps} Wdh.`;
        return h('button', { class: 'row prow', type: 'button', onclick: () => openProgress(ex.id) },
          h('span', { class: 't' }, h('b', {}, ex.name),
            h('small', {}, `${sessions} ${sessions === 1 ? 'Training' : 'Trainings'} · zuletzt ${lastText}`)),
          sparkline(values),
          trendLabel(ex));
      }))]
    : h('div', { class: 'card empty' }, h('div', { class: 'big' }, icon('progress', { size: 44 })), h('h2', {}, 'Noch kein Verlauf'),
      h('p', { class: 'muted' }, 'Nach dem ersten abgeschlossenen Training siehst du hier für jede Übung deinen besten Satz und den Verlauf.'));
}

export function progressView(rerender = () => {}) {
  const seg = h('div', { class: 'seg ex-seg', role: 'tablist', 'aria-label': 'Ansicht' },
    [['exercises', 'Übungen'], ['sessions', 'Trainings'], ['muscles', 'Muskeln']].map(([k, label]) =>
      h('button', { type: 'button', role: 'tab', class: tabState.mode === k ? 'on' : '', 'aria-selected': String(tabState.mode === k),
        onclick: () => { if (tabState.mode !== k) { tabState.mode = k; rerender(); } } }, label)));
  return h('section', { class: 'progress' },
    h('div', { class: 'title-row' }, h('h1', {}, 'Fortschritt'),
      tabState.mode === 'exercises'
        ? h('button', { class: 'info-btn', type: 'button', 'aria-label': 'So wird Fortschritt berechnet', onclick: openProgressInfo }, icon('info', { size: 20 }))
        : null),
    seg,
    tabState.mode === 'exercises' ? exerciseList() : tabState.mode === 'muscles' ? musclesPanel(rerender) : diaryList(rerender));
}
