// v3.3.0: Plan-Analyse – Übersicht C (eingefärbte Figur + „Zum Anpassen“) → Änderungen E (pro Plan mit Schaltern).
// Nutzerwahl 2026-10-26; Logik in plan-analysis.js, Übernehmen in plan-changes.js, Animation in analysis-anim.js.
import { h } from './util.js';
import { openSheet } from './sheet.js';
import { toast } from './ui.js';
import { icon } from './icons.js';
import * as store from './store.js';
import { figureSvg } from './figure.js';
import { level, LEVEL_LABELS, fmtSets } from './week.js';
import { infoBody } from './info.js';
import { analysePlans, flaggedMuscles } from './plan-analysis.js';
import { applySuggestionChanges } from './plan-changes.js';
import { playScanAnimation } from './analysis-anim.js';

export const ANALYSIS_INFO = {
  checkedAt: '2026-10-26',
  short: [
    'Farben = geplante Sätze pro Woche (direkt 1, mitbeteiligt 0,5), wie in der Muskelkarte.',
    'Vorschläge sind Schätzungen und Orientierung, keine Pflicht.',
    'Nichts ändert sich, bevor du „Übernehmen“ tippst.'
  ],
  points: [
    'Balance: Die App vergleicht Beine vorn mit hinten und Drücken mit Ziehen. Ein Hinweis kommt, wenn eine Seite deutlich kleiner ist (unter 50 % bzw. 2/3). Diese Schwellen sind Annahmen der App, keine Studienwerte.',
    'Frequenz: Große Muskeln wuchsen in einer Meta-Analyse mit zweimal pro Woche besser als mit einmal (Schoenfeld 2016).',
    'Spanne: Für Muskelwachstum fand ACSM 2026 mehr Wirkung ab etwa 10 Sätzen pro Woche. Die App schlägt erst unter 5 Sätzen eine Änderung vor (Grenze ist eine Konvention der App); 5 bis 9 Sätze nennt sie nur als Hinweis.',
    'Dauer: Sätze × (40 s + Pause) + 5 min Aufwärmen; ab 75 min schlägt die App vor, eine Einzelgelenk-Übung zu verschieben. 40 s, 5 min und 75 min sind Annahmen.',
    'Pläne ohne Trainingstage zählen als einmal pro Woche.',
    '„Trainiert“ zeigt den Schnitt der letzten vier abgeschlossenen Wochen aus deinen Trainings.'
  ],
  sources: [
    { label: 'ACSM 2026 (Currier et al.), Med Sci Sports Exerc 58:851–872', url: 'https://doi.org/10.1249/MSS.0000000000003897', note: 'Muskelwachstum mit ≥ 10 Sätzen/Woche; Kraft mit ≥ 2 Einheiten/Woche (Abstract).' },
    { label: 'Schoenfeld, Ogborn & Krieger 2016, Sports Med 46:1689–1697', url: 'https://doi.org/10.1007/s40279-016-0543-8', note: 'Zweimal pro Woche besser als einmal (Abstract).' },
    { label: 'Schoenfeld, Ogborn & Krieger 2017, J Sports Sci 35:1073–1082', url: 'https://doi.org/10.1080/02640414.2016.1210197', note: 'Mehr Wochensätze, mehr Muskelzuwachs (Abstract).' },
    { label: 'Pelland et al. 2026, Sports Medicine 56:481–505', url: 'https://doi.org/10.1007/s40279-025-02344-w', note: 'Mitbeteiligte Sätze halb zählen (Volltext).' }
  ]
};

function openAnalysisInfo() {
  openSheet(infoBody({ short: ANALYSIS_INFO.short, details: [h('ul', {}, ANALYSIS_INFO.points.map((t) => h('li', {}, t)))],
    sources: ANALYSIS_INFO.sources, checked: ANALYSIS_INFO.checkedAt }), { title: 'So funktioniert die Analyse' });
}

function context() {
  return { plans: store.get('plans'), exercises: store.get('exercises'), settings: store.get('settings'), sessions: store.get('sessions') };
}

const keyOf = (si, ci) => `${si}-${ci}`;

/** Startet die Analyse: Animation, dann Übersicht. */
export async function openPlanAnalysis(rerender) {
  const ctx = context();
  const res = analysePlans(ctx);
  if (!res.facts.length) { toast('Lege zuerst einen Plan mit Übungen an.'); return null; }
  const flagged = flaggedMuscles(res.suggestions);
  const plannedClass = (m) => (flagged.has(m) ? 'an-warn' : `lv${level(res.load.sets[m])}`);
  await playScanAnimation({ classOf: plannedClass, sex: ctx.settings.figure || 'male' });
  return showResult(res, ctx, rerender, plannedClass);
}

function showResult(res, ctx, rerender, plannedClass) {
  const st = { view: 'C', mode: 'plan', tab: 0, on: new Set(res.suggestions.flatMap((s, si) => s.changes.map((_, ci) => keyOf(si, ci)))) };
  const body = h('div', { class: 'assist ana' });
  const sheet = openSheet(body, { full: true, title: 'Analyse' });
  const planName = (id) => res.facts.find((p) => p.id === id)?.name || 'Plan';
  const touched = () => [...new Set(res.suggestions.flatMap((s) => s.changes.flatMap((c) => [c.planId, c.toPlanId].filter(Boolean))))];

  function draw() { if (st.view === 'C') drawC(); else drawE(); body.scrollTop = 0; }

  function drawC() {
    const trainedClass = (m) => `lv${level(res.trained[m] || 0)}`;
    const classOf = st.mode === 'plan' ? plannedClass : trainedClass;
    const seg = h('div', { class: 'seg as-seg', role: 'tablist', 'aria-label': 'Grundlage' },
      [['plan', 'Geplant'], ['done', 'Trainiert (4 Wo.)']].map(([k, label]) => h('button', { type: 'button', role: 'tab', class: st.mode === k ? 'on' : '', 'aria-selected': String(st.mode === k),
        onclick: () => { st.mode = k; draw(); } }, label)));
    const sex = ctx.settings.figure || 'male';
    const figs = h('div', { class: 'ana-figs' }, ['front', 'back'].map((view) => h('div', { class: 'ana-fw' },
      figureSvg({ view, sex, classOf, width: 118, label: view === 'front' ? 'Vorderseite' : 'Rückseite' }), h('span', {}, view === 'front' ? 'Vorne' : 'Hinten'))));
    const legend = h('div', { class: 'ana-legend' },
      ...LEVEL_LABELS.map((l, i) => h('span', {}, h('i', { class: `lv${i}` }), i === 0 ? '0' : l)),
      st.mode === 'plan' && res.suggestions.length ? h('span', {}, h('i', { class: 'an-warn' }), 'auffällig') : null);
    const rows = res.suggestions.map((s) => h('button', { class: 'row', type: 'button', onclick: () => {
      st.view = 'E'; const first = s.changes[0]; st.tab = Math.max(0, touched().indexOf(first.planId)); draw();
    } }, h('span', { class: `ana-dot${s.kind === 'balance' || s.kind === 'frequency' ? ' warn' : ''}` }),
    h('span', { class: 't' }, h('b', {}, s.title), h('small', {}, s.detail)), icon('chevron', { size: 18, cls: 'chev' })));
    const facts = `${res.facts.length} ${res.facts.length === 1 ? 'Plan' : 'Pläne'} · Sätze pro Woche`;
    body.replaceChildren(
      h('h1', { class: 'as-h' }, 'Übersicht'),
      h('p', { class: 'sub' }, `${facts} `, h('span', { class: 'est-tag' }, 'Schätzung')),
      seg,
      st.mode === 'done' && res.lowData ? h('p', { class: 'muted small ana-note' }, `Erst ${res.dataWeeks} ${res.dataWeeks === 1 ? 'Woche' : 'Wochen'} mit Training – der Vergleich ist noch unsicher.`) : null,
      h('div', { class: 'card ana-card' },
        h('div', { class: 'sec-row card-head' }, h('h2', {}, st.mode === 'plan' ? 'Geplant' : 'Trainiert, Schnitt pro Woche'),
          h('button', { class: 'info-btn small', type: 'button', 'aria-label': 'So funktioniert die Analyse', onclick: openAnalysisInfo }, icon('info', { size: 16 }))),
        figs, legend),
      res.assumedDays ? h('p', { class: 'muted small ana-note' }, 'Pläne ohne Trainingstage zählen als 1× pro Woche.') : null,
      res.suggestions.length
        ? h('div', {}, h('div', { class: 'sec' }, 'Zum Anpassen'), h('div', { class: 'card list' }, rows))
        : h('div', { class: 'card' }, h('b', {}, 'Nichts Auffälliges'), h('p', { class: 'muted' }, 'Balance, Frequenz und Dauer deiner Pläne liegen im üblichen Rahmen.')),
      // v3.13.0 (M4): 5 bis unter 10 Sätze nur als neutraler Hinweis, ohne Vorschlag
      res.nearTarget?.length ? h('p', { class: 'muted small ana-note' },
        `Knapp unter 10 Sätzen pro Woche: ${res.nearTarget.map((x) => `${x.label} ${fmtSets(x.sets)}`).join(', ')}. ACSM 2026 fand ab etwa 10 Sätzen mehr Muskelwachstum – Orientierung, kein Muss.`) : null,
      res.suggestions.length ? h('div', { class: 'as-bottom' },
        h('button', { class: 'btn primary block', type: 'button', onclick: () => { st.view = 'E'; st.tab = 0; draw(); } }, 'Vorschläge ansehen')) : null);
  }

  function drawE() {
    const plans = touched();
    const pid = plans[Math.min(st.tab, plans.length - 1)];
    const fact = res.facts.find((p) => p.id === pid);
    const all = res.suggestions.flatMap((s, si) => s.changes.map((c, ci) => ({ c, s, key: keyOf(si, ci) })));
    const countFor = (id) => all.filter(({ c }) => c.planId === id || c.toPlanId === id).length;
    const seg = plans.length > 1 ? h('div', { class: 'seg as-seg', role: 'tablist', 'aria-label': 'Pläne' },
      plans.map((id, i) => h('button', { type: 'button', role: 'tab', class: i === st.tab ? 'on' : '', 'aria-selected': String(i === st.tab), onclick: () => { st.tab = i; draw(); } },
        planName(id), h('em', { class: 'ana-badge' }, String(countFor(id)))))) : null;
    const sw = (key, label) => {
      const input = h('input', { type: 'checkbox', class: 'switch', 'aria-label': label, ...(st.on.has(key) ? { checked: '' } : {}),
        onchange: () => { if (input.checked) st.on.add(key); else st.on.delete(key); updateCount(); } });
      return input;
    };
    const why = (s) => h('small', {}, s.title);
    const rows = [];
    for (const it of fact.items) {
      const mv = all.find(({ c }) => c.type === 'move' && c.planId === pid && c.itemId === it.itemId);
      const ch = all.find(({ c }) => c.type === 'sets' && c.planId === pid && c.itemId === it.itemId);
      if (mv) rows.push(h('div', { class: 'row ana-move' }, h('span', { class: 't' }, h('b', {}, it.name), h('small', {}, `Nach „${planName(mv.c.toPlanId)}“ · ${mv.s.title}`)), sw(mv.key, `${it.name} verschieben`)));
      else if (ch) rows.push(h('div', { class: 'row ana-chg' }, h('span', { class: 't' }, h('b', {}, it.name), why(ch.s)), h('span', { class: 'as-n' }, h('s', {}, String(ch.c.from)), ` → ${ch.c.to} Sätze`), sw(ch.key, `${it.name}: ${ch.c.to} Sätze`)));
      else rows.push(h('div', { class: 'row' }, h('span', { class: 't' }, h('b', {}, it.name)), h('span', { class: 'as-n' }, `${it.sets} Sätze`)));
    }
    for (const { c, s, key } of all) {
      if (c.type === 'add' && c.planId === pid) rows.push(h('div', { class: 'row ana-add' }, h('span', { class: 't' }, h('b', {}, `+ ${c.name}`), h('small', {}, c.gain || s.title)), h('span', { class: 'as-n' }, `${c.sets} Sätze`), sw(key, `${c.name} hinzufügen`)));
      if (c.type === 'move' && c.toPlanId === pid) rows.push(h('div', { class: 'row ana-add' }, h('span', { class: 't' }, h('b', {}, `+ ${c.name}`), h('small', {}, `Aus „${planName(c.planId)}“ · ${s.title}`)), sw(key, `${c.name} hierher verschieben`)));
    }
    const applyBtn = h('button', { class: 'btn primary', type: 'button', onclick: apply });
    function updateCount() {
      const n = st.on.size;
      applyBtn.textContent = n === 1 ? '1 Änderung übernehmen' : `${n} Änderungen übernehmen`;
      applyBtn.disabled = n === 0;
    }
    updateCount();
    body.replaceChildren(
      h('div', { class: 'as-top' }, h('button', { class: 'as-link', type: 'button', onclick: () => { st.view = 'C'; draw(); } }, 'Übersicht'), h('span')),
      h('h1', { class: 'as-h' }, 'Vorschläge'),
      h('p', { class: 'sub' }, 'Direkt in deinen Plänen markiert. Schalte ab, was du nicht willst.'),
      seg,
      h('p', { class: 'muted small as-days' }, `${fact.name}${fact.days.length ? '' : ' · ohne feste Tage'}`),
      h('div', { class: 'card list ana-list' }, rows),
      h('div', { class: 'as-bottom ana-two' }, applyBtn, h('button', { class: 'btn', type: 'button', onclick: () => sheet.close() }, 'Nichts ändern')));
  }

  function apply() {
    const chosen = res.suggestions.flatMap((s, si) => s.changes.filter((_, ci) => st.on.has(keyOf(si, ci))));
    if (!chosen.length) return;
    const r = applySuggestionChanges(chosen);
    sheet.close();
    if (r.applied) toast(r.applied === 1 ? '1 Änderung übernommen' : `${r.applied} Änderungen übernommen`);
    if (!r.ok) toast(r.errors[0], { error: true });
    rerender();
  }

  draw();
  return sheet;
}

export { fmtSets };
