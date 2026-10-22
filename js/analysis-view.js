// Fortschritt → 4 Wochen (v2.23.0, Variante B mit Ø-Spalte, Wahl des Nutzers): Heatmap Muskeln × Kalenderwochen,
// Ø Sätze pro Woche, Kraft-Trend (e1RM, Schätzung) der Hauptübung, darunter „Zuletzt wenig trainiert“ (relativ, ohne Soll).
import { h } from './util.js';
import * as store from './store.js';
import { level, fmtSets, LEVEL_LABELS, INDIRECT_FACTOR } from './week.js';
import { NOISE_PCT, E1RM_MAX_REPS } from './progress.js';
import { fourWeekAnalysis, WEEKS, LOW_SHARE, MIN_TRAINED } from './analysis.js';
import { candidatesFor, addToTraining } from './muscle-pick.js';
import { activeSession } from './session.js';
import { openSheet } from './sheet.js';
import { icon } from './icons.js';
import { toast } from './ui.js';

const fmtD = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const fmtPct = (p) => `${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(Math.round(p)).toLocaleString('de-DE')} %`;

export const ANALYSIS_INFO = {
  checkedAt: '2026-10-22',
  points: [
    `Zeitraum: die letzten ${WEEKS} abgeschlossenen Kalenderwochen (Mo–So). Die laufende Woche fehlt, damit eine halbe Woche den Schnitt nicht drückt – sie steht unter „Muskeln“.`,
    `Gezählt wird wie in der Muskelkarte: harte Sätze aus abgeschlossenen Trainings, direkt 1, indirekt ${String(INDIRECT_FACTOR).replace('.', ',')}. Diese Zählweise sagte in einer Meta-Regression (67 Studien) Muskelzuwachs und Kraft am besten vorher. Ø ist die Summe geteilt durch ${WEEKS}; Wochen ohne Training zählen als 0 und senken den Schnitt aller Muskeln gleich.`,
    'Warum pro Woche: Bei gleichem Wochenvolumen machte die Verteilung auf mehr oder weniger Trainingstage für den Muskelzuwachs keinen nennenswerten Unterschied (Meta-Analyse, 25 Studien). Für die Kraft half häufigeres Training etwas, mit abnehmendem Nutzen.',
    'Die Farben sind dieselben Darstellungsstufen wie in der Muskelkarte (0 · unter 5 · 5–8 · 9+). Sie sind keine Zielwerte.',
    `„Zuletzt wenig trainiert“ ist ein Vergleich mit dir selbst: Muskelgruppen, deren Ø unter der Hälfte des Medians deiner trainierten Muskelgruppen liegt. Die Hälfte ist eine Konvention der App, kein Wert aus Studien. Berücksichtigt werden nur Muskeln, für die du eine eigene Übung hast; ab ${MIN_TRAINED} trainierten Muskelgruppen.`,
    'Weniger Sätze sind nicht automatisch ein Problem: Mehr Sätze brachten im Mittel mehr, aber mit abnehmendem Zusatznutzen – bei der Kraft deutlich früher als beim Muskelzuwachs. Auch kleine Wochenmengen steigerten bei bisher Untrainierten die Kraft. Ziele, Beschwerden oder Pausen können gute Gründe sein; der Hinweis ist eine Orientierung, kein Auftrag.',
    `Kraft-Trend: geschätzte Maximalkraft (e1RM nach Epley, nur Sätze bis ${E1RM_MAX_REPS} Wdh.) der Übung mit den meisten harten Sätzen für diesen Muskel, erstes gegen letztes Training im Zeitraum. Unter ±${NOISE_PCT} % ist normales Tagesrauschen: Schon ein echter 1RM-Test schwankt zwischen zwei Tagen im Median um 4,2 %. Nach 6 Wochen Training stieg das 1RM im Bankdrücken bei College-Footballern im Mittel um 4,2 ± 8,6 kg, und die Änderung der Wiederholungen passte kaum zur Änderung des 1RM. Ein 4-Wochen-Trend ist deshalb nur ein grober Hinweis und gilt nur für diese eine Übung.`
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
  openSheet(h('div', { class: 'info' },
    h('ul', {}, ANALYSIS_INFO.points.map((t) => h('li', {}, t))),
    h('h3', {}, 'Quellen'),
    h('ul', { class: 'sources' }, ANALYSIS_INFO.sources.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label), h('span', { class: 'muted' }, ` – ${s.note}`)))),
    h('p', { class: 'muted small' }, `Geprüft am ${new Date(ANALYSIS_INFO.checkedAt).toLocaleDateString('de-DE')}. Zählweise und e1RM-Grenzen: Infoblätter „Muskeln“ und „Fortschritt“.`)
  ), { title: 'So entsteht die 4-Wochen-Ansicht' });
}

function trendCell(m) {
  if (!m.main) return h('span', { class: 'a4t none', title: 'keine Kraftübung' }, '–');
  if (!m.main.trend) return h('span', { class: 'a4t none', title: m.main.points ? 'erst 1 Schätzwert' : `nur Sätze über ${E1RM_MAX_REPS} Wdh.` }, '–');
  return h('span', { class: `a4t${m.main.trend.withinNoise ? ' noise' : ''}`, title: `${m.main.name} (Schätzung)` }, fmtPct(m.main.trend.pct));
}

export function analysisPanel(rerender) {
  const exercises = store.get('exercises');
  const a = fourWeekAnalysis(store.get('sessions'), exercises);
  const head = h('div', { class: 'a4-head' },
    h('div', { class: 'wk' }, h('b', {}, `Letzte ${WEEKS} Wochen`),
      h('small', {}, `${fmtD(a.weeks[0].start)} – ${fmtD(a.weeks[a.weeks.length - 1].end)} · ${a.sessions} ${a.sessions === 1 ? 'Training' : 'Trainings'}`)),
    h('button', { class: 'info-btn', type: 'button', 'aria-label': 'So entsteht die 4-Wochen-Ansicht', onclick: openAnalysisInfo }, icon('info', { size: 20 })));

  if (!a.sessions) {
    return [head, h('div', { class: 'card empty' }, h('div', { class: 'big' }, icon('progress', { size: 44 })), h('h2', {}, 'Noch keine abgeschlossene Woche'),
      h('p', { class: 'muted' }, `Hier erscheinen deine Sätze pro Muskel aus den letzten ${WEEKS} abgeschlossenen Kalenderwochen.`))];
  }

  const rows = a.muscles.filter((m) => m.avg > 0).sort((x, y) => y.avg - x.avg || x.name.localeCompare(y.name, 'de'));
  const zero = a.muscles.filter((m) => m.avg === 0);
  const grid = h('div', { class: 'a4-grid', role: 'table', 'aria-label': 'Sätze pro Muskel und Woche' },
    h('span', { class: 'a4h' }),
    a.weeks.map((w) => h('span', { class: 'a4h', title: `${fmtD(w.start)} – ${fmtD(w.end)}` }, `KW ${w.kw}`)),
    h('span', { class: 'a4h' }, 'Ø/Wo'),
    h('span', { class: 'a4h' }, 'e1RM'),
    rows.flatMap((m) => [
      h('span', { class: 'a4n' }, m.name),
      ...m.weeks.map((v) => h('span', { class: `a4c lv${level(v)}` }, fmtSets(v))),
      h('span', { class: 'a4avg' }, fmtSets(m.avg)),
      trendCell(m)
    ]));
  const legend = h('div', { class: 'legend' }, LEVEL_LABELS.map((t, i) => h('span', {}, h('i', { class: `sw lv${i}` }), t)), h('span', {}, 'Sätze'));
  const table = h('div', { class: 'card a4-card' },
    h('p', { class: 'sub' }, `Harte Sätze je Woche (direkt + ${String(INDIRECT_FACTOR).replace('.', ',')} × indirekt). e1RM = Kraft-Trend der Hauptübung, Schätzung; unter ±${NOISE_PCT} % ist Rauschen.`),
    grid,
    zero.length ? h('p', { class: 'muted small a4zero' }, `Nicht trainiert: ${zero.map((m) => m.name).join(', ')}`) : null);

  const choose = (arg) => {
    const r = addToTraining(arg);
    if (!r.ok) { toast(r.errors[0], { error: true }); return; }
    toast(r.started ? 'Freies Training gestartet' : 'Zum Training hinzugefügt');
    location.hash = '#/';
  };
  let hintCard = null;
  if (a.hints.length) {
    hintCard = h('div', { class: 'card a4-hint' },
      h('h3', {}, 'Zuletzt wenig trainiert'),
      h('p', { class: 'sub' }, `Im Vergleich zu deinen anderen Muskelgruppen (Ø unter ${String(LOW_SHARE * 100)} % deines Medians von ${fmtSets(a.median)} Sätzen/Woche). Kein Soll – nur eine Orientierung.`),
      a.hints.map((m) => {
        const c = candidatesFor(m.id, exercises);
        const opts = [...c.own.map((e) => ({ name: e.name, arg: { exerciseId: e.id } })), ...c.pool.map((p) => ({ name: p.name, arg: { poolRef: p.ref }, pool: true }))].slice(0, 3);
        return h('div', { class: 'a4-hrow' },
          h('div', {}, h('b', {}, m.name), h('small', { class: 'muted' }, ` Ø ${fmtSets(m.avg)} Sätze/Woche`)),
          h('div', { class: 'chips wrap' }, opts.map((o) => h('button', { type: 'button', class: 'chip', onclick: () => choose(o.arg) }, o.name, o.pool ? h('small', { class: 'muted' }, '\u00a0· Pool') : null))));
      }),
      h('small', { class: 'muted' }, activeSession() ? 'Antippen fügt die Übung dem laufenden Training hinzu.' : 'Antippen startet ein freies Training mit dieser Übung.'));
  } else if (!a.enough) {
    hintCard = h('p', { class: 'muted small center' }, `Für einen Vergleich braucht es mindestens ${MIN_TRAINED} trainierte Muskelgruppen in diesem Zeitraum.`);
  }
  return [head, table, legend, hintCard].filter(Boolean);
}

