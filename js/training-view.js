// Training-Tab (Kombination A + B): eine Übung pro Seite mit Satztabelle und Pausen-Leiste (A),
// Übersicht aller Übungen als Sheet zum Springen, Umsortieren, Hinzufügen und Entfernen (B).
// Pausen-Timer ohne Ton, Alarm oder Vibration – das Ende wird nur angezeigt.
import { h } from './util.js';
import * as store from './store.js';
import * as S from './session.js';
import * as P from './plans.js';
import * as lib from './exercises.js';
import { openSheet } from './sheet.js';
import { toast } from './ui.js';
import { icon } from './icons.js';
import { restState } from './timer.js';
import { requestPersist } from './device.js';
import { barFor, plateLine, isPerSide } from './plates.js';
import { formatDuration } from './rest.js';
import { WARMUP_HINT, WARMUP_INFO, WARMUP_CHECKED_AT } from './warmup-info.js';
import { openProgress, hasHistory } from './progress-view.js';
import { openAnimation, hasAnimation } from './anim-view.js';
import { parseWeight, parseReps, fmtNum, parseAddedWeight, fmtAdded, parseDuration, fmtDuration, parseDistanceKm, fmtKm, fmtPace } from './input.js';
import { weightWarning, placeholderFor, INTENSITIES } from './model.js';
import { typoText, openBackfill } from './diary-view.js';
import * as SETS from './sets.js';
import { openSetSheet, stageRows, tagChips, quickButtons, lastCompletedIndex } from './set-view.js';
import { swapOptions, candidateLine } from './group-view.js';
import { miniFigure } from './figure.js';
import { askWarmup, startRun, cooldownOffer } from './routine-view.js';
import { cycleStartCards } from './cycle-view.js';
import * as RT from './routines.js';
import * as PR from './progression.js';
import { missedHints, formatDays, isWeekSkipped, weekKey } from './schedule.js';
import { planChanges } from './plan-sync.js';
import { todayFirst, isPlanDay } from './plan-body.js';
import { planFigure } from './plan-body-view.js';
import * as SS from './superset.js';
import { askRating, needsRating, ratingLine, suggestionCard, askBreak, askLight, openProgressionInfo } from './progression-view.js';

const ui = { current: null, sessionId: null, swapOpen: null, ssBanner: null };
// v2.26.0 (A4): Scheiben-Zeile der offenen Übung; folgt dem zuletzt bearbeiteten Gewichtsfeld.
const plate = { el: null, bar: null };
function showPlates(kg) {
  if (!plate.el || plate.bar === null) return;
  const line = plateLine(kg, plate.bar);
  plate.el.hidden = !line;
  plate.el.textContent = line || '';
}
let tick = null;

const fmtDay = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
function elapsed(startIso) {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(startIso)) / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
}

// Eine Uhr für Trainingsdauer und Pause; läuft nur, solange die Elemente im DOM sind.
function startTick() {
  if (tick) return;
  tick = setInterval(() => {
    const clock = document.querySelector('[data-clock]');
    const bar = document.querySelector('[data-rest]');
    if (!clock && !bar) { clearInterval(tick); tick = null; return; }
    const s = S.activeSession();
    if (!s) return;
    if (clock) clock.textContent = elapsed(s.startedAt);
    if (bar) renderRest(bar, s);
  }, 250);
}

// ---------- Pausen-Leiste ----------

const RING_LEN = 2 * Math.PI * 23;

function renderRest(bar, session) {
  const t = session.restTimer;
  const st = restState(t);
  if (!st) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.classList.toggle('done', st.done);
  const entry = session.entries.find((e) => e.id === t.entryId);
  const group = entry ? SS.members(session, entry.id) : [];
  const exName = group.length ? `Runde ${group.map((_, i) => SS.LETTERS[i]).join(' + ')}`
    : entry ? (lib.getExercise(entry.exerciseId)?.name || '') : '';
  bar.querySelector('.rt-time').textContent = st.done ? 'Pause vorbei' : formatDuration(st.remaining);
  bar.querySelector('.rt-sub').textContent = st.done ? `+${formatDuration(st.overtime)} · ${exName}` : `Pause · ${exName}`;
  bar.querySelector('.rt-ring-fg').setAttribute('stroke-dashoffset', String(RING_LEN * (1 - st.progress)));
  bar.querySelectorAll('.rt-adj').forEach((b) => { b.hidden = st.done; });
  // v2.26.0 (A6): Pause vorbei → einmal sanft aufleuchten (kein Ton, kein Blinken; aus bei „Bewegung reduzieren“).
  if (st.done && bar.dataset.wasDone === '0') {
    bar.classList.remove('pulse');
    void bar.offsetWidth; // Animation neu starten
    bar.classList.add('pulse');
  }
  bar.dataset.wasDone = st.done ? '1' : '0';
  // v2.26.0 (A5): Vorschau auf den nächsten offenen Satz.
  const next = bar.querySelector('.rt-next');
  if (next) { const txt = nextUp(); next.textContent = txt || ''; next.hidden = !txt; }
}

// v2.26.0 (A5): „Als Nächstes: Satz 2 · 80 × 8“ – Eintrag oder Platzhalter des ersten offenen Satzes,
// sonst die nächste Übung mit offenen Sätzen. Wird beim Zeichnen der Seite einmal berechnet (siehe activeView).
const nextCache = { key: null, text: null };
function nextUp() {
  return nextCache.key ? nextCache.text : null;
}
function computeNext(v, entryId) {
  const i = v.entries.findIndex((d) => d.entry.id === entryId);
  if (i < 0) return null;
  const d = v.entries[i];
  const kind = d.exercise?.kind;
  const sets = d.entry.sets;
  const k = kind === 'cardio' ? -1 : sets.findIndex((x) => x.completedAt === null);
  if (k >= 0) {
    const set = sets[k];
    const workNo = set.type === 'warmup' ? 0 : sets.slice(0, k + 1).filter((x) => x.type !== 'warmup').length;
    const vals = set.reps !== null ? set : { ...set, ...(placeholderFor(d.entry, k, d.last) || {}) };
    const label = set.type === 'warmup' ? 'Aufwärmsatz' : `Satz ${SETS.setLabel(set, workNo)}`;
    const values = vals.reps !== null && vals.reps !== undefined ? ` · ${SETS.formatSet({ ...vals, drops: [] }, kind)}${isPerSide(d.exercise) ? ' je Seite' : ''}` : '';
    return `Als Nächstes: ${label}${values}`;
  }
  const after = v.entries.slice(i + 1).find((x) => !x.complete) || v.entries.slice(0, i).find((x) => !x.complete);
  return after ? `Als Nächstes: ${after.exercise?.name || 'nächste Übung'}` : 'Alle Sätze erledigt';
}

function restBar(rerender) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 54 54');
  svg.setAttribute('class', 'rt-ring');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<circle cx="27" cy="27" r="23" class="rt-ring-bg"/><circle cx="27" cy="27" r="23" class="rt-ring-fg" stroke-dasharray="${RING_LEN}" stroke-dashoffset="${RING_LEN}" transform="rotate(-90 27 27)"/>`;
  const act = (fn) => () => { const r = fn(); if (!r.ok) toast(r.errors[0], { error: true }); renderRest(bar, S.activeSession()); };
  const bar = h('div', { class: 'restbar', 'data-rest': '', 'data-was-done': '1', role: 'timer', 'aria-live': 'off', hidden: true },
    svg,
    h('div', { class: 'rt-text' }, h('b', { class: 'rt-time' }, ''), h('small', { class: 'rt-sub' }, '')),
    h('button', { class: 'rt-btn rt-adj', type: 'button', 'aria-label': 'Pause 15 Sekunden kürzer', onclick: act(() => S.adjustRunningRest(-1)) }, '−15'),
    h('button', { class: 'rt-btn rt-adj', type: 'button', 'aria-label': 'Pause 15 Sekunden länger', onclick: act(() => S.adjustRunningRest(1)) }, '+15'),
    h('button', { class: 'rt-btn', type: 'button', 'aria-label': 'Pause beenden', onclick: () => { S.stopRest(); bar.hidden = true; } }, icon('close', { size: 18 })),
    h('div', { class: 'rt-next', hidden: true }, '')); // v2.26.0 (A5): eigene Zeile über die volle Breite
  return bar;
}

// v2.26.0 (A10): Toast mit „Rückgängig“ nach dem Löschen eines Satzes oder einer Übung.
function undoToast(message, restore, after) {
  toast(message, { action: { label: 'Rückgängig', onClick: () => {
    const r = restore();
    if (!r.ok) { toast(r.errors[0], { error: true }); return; }
    toast('Wiederhergestellt.');
    after();
  } } });
}

// ---------- Hilfs-Sheets ----------

function openWarmupInfo() {
  openSheet(h('div', { class: 'info' },
    h('ul', {}, WARMUP_INFO.summary.map((t) => h('li', {}, t))),
    h('p', { class: 'muted small' }, WARMUP_INFO.rule),
    h('h3', {}, 'Quellen'),
    h('ul', { class: 'sources' }, WARMUP_INFO.sources.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label), h('span', { class: 'muted' }, ` – ${s.note}`)))),
    h('p', { class: 'muted small' }, `Geprüft am ${new Date(WARMUP_CHECKED_AT).toLocaleDateString('de-DE')}. Keine medizinische Beratung.`)
  ), { title: 'Aufwärmsätze' });
}

function openNoteEditor(exercise, rerender) {
  const area = h('textarea', { class: 'area', rows: '4', 'aria-label': 'Notiz', placeholder: 'Variante, Geräteeinstellung, Ausführung' });
  area.value = exercise.note || '';
  const sheet = openSheet(h('div', { class: 'editor' },
    h('div', { class: 'field' }, area),
    h('button', { class: 'btn primary block', type: 'button', onclick: () => {
      const r = lib.saveExercise({ ...lib.getExercise(exercise.id), note: area.value });
      if (!r.ok) { toast(r.errors[0], { error: true }); return; }
      sheet.close(); toast('Notiz gespeichert.'); rerender();
    } }, 'Speichern')), { title: `Notiz: ${exercise.name}` });
  setTimeout(() => area.focus(), 250);
}

function openAddExercise(rerender, afterAdd) {
  const state = { query: '' };
  const listBox = h('div');
  const draw = () => {
    const sections = lib.groupedExercises(lib.listExercises(), { query: state.query });
    listBox.replaceChildren(...(sections.length ? sections.map((s) => h('section', {}, h('div', { class: 'sec' }, s.label),
      h('div', { class: 'card list' }, s.items.map((e) => h('button', { class: 'row', type: 'button', onclick: () => {
        const r = S.addEntry(e.id);
        if (!r.ok) { toast(r.errors[0], { error: true }); return; }
        sheet.close(); toast(`${e.name} hinzugefügt.`); afterAdd(); rerender();
      } }, h('span', { class: 'fig-ic' }, miniFigure(e, store.get('settings').figure)), h('span', { class: 't' }, h('b', {}, e.name), h('small', {}, lib.muscleSummary(e))), icon('plus', { size: 18 }))))))
      : [h('p', { class: 'muted empty-line' }, 'Keine Übung gefunden. Neue Übungen legst du im Tab „Übungen“ an.')]));
  };
  const search = h('input', { type: 'search', class: 'search-input', placeholder: 'Übung suchen', 'aria-label': 'Übung suchen', autocomplete: 'off' });
  search.addEventListener('input', () => { state.query = search.value; draw(); });
  draw();
  const sheet = openSheet(h('div', {}, h('label', { class: 'search' }, icon('search', { size: 18 }), search), listBox), { title: 'Übung hinzufügen', full: true });
}

// ---------- Übersicht (B) ----------

function openOverview(rerender) {
  const body = h('div');
  let sheet = null;
  const draw = () => {
    const v = S.sessionView();
    if (!v) { sheet?.close(); return; }
    body.replaceChildren(
      h('div', { class: 'card list' }, v.entries.map((d) => h('div', { class: `row ov${d.index === ui.current ? ' cur' : ''}` },
        h('button', { class: 't plain', type: 'button', onclick: () => { ui.current = d.index; sheet.close(); rerender(); } },
          h('b', {}, `${d.index + 1}. ${d.exercise?.name || 'Unbekannte Übung'}`),
          h('small', {}, `${d.doneCount}/${d.entry.sets.length} Sätze${d.complete ? ' · fertig' : ''}${d.entry.plannedExerciseId ? ` · statt ${lib.getExercise(d.entry.plannedExerciseId)?.name || 'geplanter Übung'}` : ''}${SS.letterOf(v.session, d.entry.id) ? ` · Supersatz ${SS.letterOf(v.session, d.entry.id)}` : ''}`)),
        h('div', { class: 'arrows horiz' },
          h('button', { type: 'button', 'aria-label': 'Nach oben', disabled: d.index === 0, onclick: () => { S.moveEntry(d.entry.id, d.index - 1); if (ui.current === d.index) ui.current -= 1; else if (ui.current === d.index - 1) ui.current += 1; draw(); rerender(); } }, icon('up')),
          h('button', { type: 'button', 'aria-label': 'Nach unten', disabled: d.index === v.entries.length - 1, onclick: () => { S.moveEntry(d.entry.id, d.index + 1); if (ui.current === d.index) ui.current += 1; else if (ui.current === d.index + 1) ui.current -= 1; draw(); rerender(); } }, icon('down')),
          h('button', { type: 'button', class: 'danger', 'aria-label': 'Übung aus dem Training entfernen', onclick: () => {
            if (d.doneCount && !confirm('Diese Übung hat erledigte Sätze. Trotzdem entfernen?')) return;
            const res = S.removeEntry(d.entry.id);
            if (!res.ok) { toast(res.errors[0], { error: true }); return; }
            if (ui.current >= d.index && ui.current > 0) ui.current -= 1;
            draw(); rerender();
            undoToast(`${d.exercise?.name || 'Übung'} entfernt.`, () => S.restoreEntry(res.removed), () => { draw(); rerender(); });
          } }, icon('trash')))))),
      h('button', { class: 'addline', type: 'button', onclick: () => openAddExercise(rerender, () => { const s = S.activeSession(); ui.current = s.entries.length - 1; draw(); }) }, icon('plus', { size: 18 }), 'Übung hinzufügen'),
      h('p', { class: 'muted small center' }, `${v.summary.hardSets} Arbeitssätze erledigt`),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { sheet.close(); rateThen(v.entries[ui.current] || null, () => finishFlow(rerender)); } }, 'Training beenden'),
      h('button', { class: 'btn block subtle danger-text', type: 'button', onclick: () => {
        if (!confirm('Training verwerfen? Alle Einträge dieses Trainings gehen verloren.')) return;
        S.discard(); sheet.close(); toast('Training verworfen.'); rerender();
      } }, 'Training verwerfen'));
  };
  draw();
  sheet = openSheet(body, { title: 'Übersicht', full: true });
}

// v2.26.0 (A2): Nach dem ersten beendeten Training einmal dauerhaften Speicher anfragen –
// erst dann gibt es Daten, die sich nicht neu erzeugen lassen. Kein Hinweis, egal wie der Browser antwortet.
function askPersistOnce() {
  const st = store.get('settings');
  if (st.persistAsked) return;
  store.set('settings', { ...st, persistAsked: true });
  requestPersist();
}

function finishFlow(rerender) {
  if (!confirm('Training beenden? Nicht abgehakte Sätze werden nicht gespeichert.')) return;
  const before = S.activeSession();
  const r = S.finish();
  if (!r.ok) {
    if (r.empty && confirm('Noch kein Satz erledigt. Training verwerfen?')) { S.discard(); toast('Training verworfen.'); rerender(); return; }
    toast(r.errors[0], { error: true });
    return;
  }
  ui.current = null;
  askPersistOnce();
  const sum = S.sessionView(r.session).summary;
  const dur = elapsed(before.startedAt);
  const sync = planSyncCard(r.session, rerender);
  rerender();
  let summarySheet = null;
  summarySheet = openSheet(h('div', { class: 'info' },
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', {}, dur), h('span', {}, 'Dauer')),
      h('div', { class: 'stat' }, h('b', {}, String(sum.hardSets)), h('span', {}, 'Arbeitssätze')),
      h('div', { class: 'stat' }, h('b', {}, `${Math.round(sum.volume).toLocaleString('de-DE')}`), h('span', {}, 'Volumen kg'))),
    h('p', { class: 'muted small' }, 'Volumen = Gewicht × Wiederholungen der Arbeitssätze (ohne Aufwärmsätze, ohne Körpergewichtsübungen). Die Werte sind die Vorbelegung fürs nächste Training.'),
    sync,
    cooldownOffer(r.session, () => summarySheet?.close())
  ), { title: 'Training gespeichert' });
}

// v2.29.0 (Feature-To-Do B4): „Änderungen von heute in den Plan übernehmen?“ – Liste ohne Vorauswahl,
// nichts wird still überschrieben. Gewichte gehören nicht dazu (sie hängen an der Übung).
function planSyncCard(session, rerender) {
  const plan = session.planId ? P.getPlan(session.planId) : null;
  if (!plan) return null;
  const byId = Object.fromEntries(lib.listExercises({ includeArchived: true }).map((e) => [e.id, e]));
  const changes = planChanges(session, plan, byId);
  if (!changes.length) return null;
  const chosen = new Set();
  const box = h('div', { class: 'plan-sync' });
  const draw = () => {
    const btn = h('button', { class: 'btn primary block', type: 'button', disabled: !chosen.size, onclick: () => {
      const r = P.applyPlanChanges(plan.id, changes.filter((c) => chosen.has(c.id)));
      if (!r.ok) { toast(r.errors[0], { error: true }); return; }
      box.replaceChildren(h('p', { class: 'muted small' }, `Plan „${plan.name}“ angepasst (${chosen.size} ${chosen.size === 1 ? 'Änderung' : 'Änderungen'}).`));
      toast('Plan angepasst.');
      rerender();
    } }, chosen.size ? `${chosen.size} in den Plan übernehmen` : 'Auswählen, was in den Plan soll');
    box.replaceChildren(
      h('div', { class: 'sec' }, `Plan „${plan.name}“ anpassen?`),
      h('p', { class: 'muted small' }, 'Heute lief es anders als im Plan. Nichts ist vorausgewählt – was du nicht antippst, bleibt im Plan, wie es ist. Gewichte stehen nicht im Plan, sie kommen wie immer vom letzten Training.'),
      h('div', { class: 'card list' }, changes.map((c) => {
        const on = chosen.has(c.id);
        return h('button', { class: `row pick${on ? ' on' : ''}`, type: 'button', 'aria-pressed': String(on), onclick: () => {
          if (on) chosen.delete(c.id); else chosen.add(c.id);
          draw();
        } }, h('span', { class: `check${on ? ' on' : ''}` }, on ? icon('check', { size: 16 }) : null), h('span', { class: 't' }, h('b', {}, c.text)));
      })),
      btn);
  };
  draw();
  return box;
}

// v2.30.0 (B1, Variante B): nach einem Satz im Supersatz zur Partnerübung springen (ohne Pause in der Runde)
// bzw. nach der Runde zum ersten Mitglied mit offenem Satz (die Pause läuft dann schon).
function supersetJump(entryId, session) {
  const g = SS.afterSet(session, entryId);
  if (!g || !g.next || g.next === entryId) return;
  const idx = session.entries.findIndex((e) => e.id === g.next);
  if (idx < 0) return;
  const target = session.entries[idx];
  const name = `${SS.letterOf(session, target.id)} · ${lib.getExercise(target.exerciseId)?.name || 'nächste Übung'}`;
  ui.current = idx;
  ui.ssBanner = { entryId: target.id, text: g.rest ? `Runde fertig – nach der Pause weiter mit ${name}.` : `Supersatz: direkt weiter mit ${name}, ohne Pause dazwischen.` };
}

// Umschalter A | B | … über der Übung (nur im Supersatz). Wechseln fragt nicht nach der Bewertung.
function supersetSwitch(v, d, rerender) {
  const m = SS.members(v.session, d.entry.id);
  if (!m.length) return null;
  return h('div', { class: 'ss-seg', role: 'tablist', 'aria-label': 'Supersatz' }, m.map((en, i) => {
    const x = v.entries.find((y) => y.entry.id === en.id);
    const done = en.sets.filter((z) => z.type !== 'warmup' && z.completedAt !== null).length;
    const on = en.id === d.entry.id;
    return h('button', { type: 'button', role: 'tab', class: on ? 'on' : '', 'aria-selected': String(on), onclick: () => { if (!on) { ui.current = x.index; ui.ssBanner = null; rerender(); } } },
      h('b', {}, SS.LETTERS[i]), ` · ${x.exercise?.name || 'Übung'}`, done ? h('small', {}, ' ', icon('check', { size: 14, cls: 'inline' }), String(done)) : null);
  }));
}

// v2.30.0 (B3): leichte Woche ein- und ausschalten (gilt bis Sonntag dieser Woche, für alle Pläne).
function lightWeekCard(active, rerender) {
  const setWeek = (v) => { store.set('settings', { ...store.get('settings'), lightWeek: v }); rerender(); };
  const info = h('button', { class: 'info-btn small', type: 'button', 'aria-label': 'Was ist eine leichte Woche?', onclick: () => openProgressionInfo('light') }, icon('info', { size: 18 }));
  if (active) {
    return h('div', { class: 'card hint-box light-week' },
      h('div', { class: 'sug-top' }, h('b', {}, 'Leichte Woche bis Sonntag'), info),
      h('p', { class: 'small' }, 'Beim Start schlägt die App weniger Sätze und Gewicht vor. Diese Trainings sind kein Ausgangspunkt für Vorbelegung und Vorschläge.'),
      h('button', { class: 'btn block', type: 'button', onclick: () => setWeek(null) }, 'Leichte Woche beenden'));
  }
  return h('div', { class: 'light-line' },
    h('button', { class: 'btn block subtle', type: 'button', onclick: () => { setWeek(weekKey(new Date())); toast('Leichte Woche bis Sonntag.'); } }, 'Diese Woche leicht trainieren'),
    info);
}

// v2.29.0 (Feature-To-Do A): Hinweis am Folgetag, wenn an einem Trainingstag gar kein Training stattfand.
// Neutral (Projektregel §4): kein Zähler, keine Serie, keine Wertung; erscheint nur für den Vortag.
function missedCards(rerender) {
  return missedHints(P.listPlans(), store.get('sessions')).map(({ plan, date, day }) =>
    h('div', { class: 'card hint-box', role: 'note' },
      h('p', {}, `Gestern (${day}) war „${plan.name}“ eingeplant, eingetragen ist kein Training.`),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn', type: 'button', onclick: () => { P.ackMissed(plan.id, date); rerender(); } }, 'OK'),
        h('button', { class: 'btn', type: 'button', onclick: () => { P.skipWeek(plan.id, new Date(), date); toast(`„${plan.name}“: diese Woche ausgesetzt.`); rerender(); } }, 'Diese Woche aussetzen'))));
}

// ---------- Übungsseite (A) ----------

function setRow(d, set, i, workNo, rerender, isQuick = false) {
  const done = set.completedAt !== null;
  const bw = d.exercise?.kind === 'bodyweight';
  // v1.4 (Entscheidung 6 A): graue Platzhalter = vorheriger Satz bzw. letzte Ausführung; der Haken übernimmt sie.
  const ph = done ? null : placeholderFor(d.entry, i, d.last);
  const phW = ph ? (bw ? (ph.weightKg ? fmtAdded(ph.weightKg) : 'KG') : fmtNum(ph.weightKg)) : (bw ? 'KG' : '–');
  const w = h('input', { class: 'val', type: 'text', inputmode: bw ? 'text' : 'decimal', enterkeyhint: 'next', value: bw ? fmtAdded(set.weightKg) : fmtNum(set.weightKg), 'aria-label': `Satz ${i + 1} ${bw ? 'Zusatzgewicht' : 'Gewicht'} in kg`, placeholder: phW });
  const r = h('input', { class: 'val', type: 'text', inputmode: 'numeric', enterkeyhint: 'done', value: fmtNum(set.reps), 'aria-label': `Satz ${i + 1} Wiederholungen`, placeholder: ph ? fmtNum(ph.reps) : '–' });
  const commit = () => {
    const weightKg = bw ? parseAddedWeight(w.value) : parseWeight(w.value);
    const reps = parseReps(r.value);
    if (Number.isNaN(weightKg) || Number.isNaN(reps)) { toast(bw ? 'Bitte gültige Zahlen eingeben (Zusatzgewicht z. B. +5 oder -10).' : 'Bitte gültige Zahlen eingeben (Gewicht z. B. 82,5).', { error: true }); return null; }
    return { weightKg, reps };
  };
  // Tippfehler-Hinweis (v1.1): nicht blockierend, Vergleich mit abgeschlossenen Trainings.
  const hint = h('div', { class: 'hint typo', hidden: true }, h('span', { class: 'hint-ic' }, icon('info', { size: 18 })), h('span', {}));
  const checkTypo = () => {
    const kg = parseWeight(w.value);
    const warn = Number.isNaN(kg) || bw ? null : weightWarning(d.entry.exerciseId, kg, store.get('sessions'));
    w.classList.toggle('warnval', !!warn);
    hint.hidden = !warn;
    if (warn) hint.lastChild.textContent = typoText(warn.best);
  };
  checkTypo();
  w.addEventListener('input', checkTypo);
  if (!bw) {
    const platesNow = () => { const kg = parseWeight(w.value); showPlates(kg === null ? ph?.weightKg ?? null : Number.isNaN(kg) ? null : kg); };
    w.addEventListener('input', platesNow);
    w.addEventListener('focus', platesNow);
  }
  const onChange = () => { const v = commit(); if (v) S.updateSet(d.entry.id, set.id, v); };
  w.addEventListener('change', onChange);
  r.addEventListener('change', onChange);
  const label = SETS.setLabel(set, workNo);
  const eid = d.entry.id;
  const current = () => S.activeSession()?.entries.find((e) => e.id === eid)?.sets.find((x) => x.id === set.id) || null;
  const ok = (r) => { if (!r.ok) toast(r.errors[0], { error: true }); return r.ok; };
  const openMenu = () => openSetSheet({
    title: set.type === 'warmup' ? 'Aufwärmsatz' : `Satz ${label}`,
    get: current,
    after: rerender,
    act: {
      setType: (t) => ok(S.setSetType(eid, set.id, t)),
      toggleTag: (tag) => ok(S.toggleTag(eid, set.id, tag)),
      remove: () => {
        const res = S.removeSet(eid, set.id);
        if (!ok(res)) return false;
        undoToast('Satz gelöscht.', () => S.restoreSet(eid, res.removed), rerender);
        return true;
      }
    }
  });
  const row = h('div', { class: `setrow${done ? ' done' : ''}${set.type === 'warmup' ? ' warm' : ''}${SETS.hasStages(set.type) ? ' staged' : ''}` },
    h('button', { class: 'sn', type: 'button', 'aria-label': `Satz ${label}: Typ und Markierungen`, onclick: openMenu }, label),
    w, r,
    h('button', { class: `ck${done ? ' on' : ''}`, type: 'button', 'aria-pressed': String(done), 'aria-label': done ? 'Satz wieder öffnen' : 'Satz erledigt', onclick: () => {
      if (done) { S.uncompleteSet(d.entry.id, set.id); rerender(); return; }
      const v = commit();
      if (!v) return;
      // Leere Felder übernehmen die Platzhalter (nur wenn beide Werte fehlen oder nur die Wdh. fehlen).
      if (ph && v.reps === null) { v.reps = ph.reps; if (v.weightKg === null) v.weightKg = ph.weightKg; }
      const res = S.completeSet(d.entry.id, set.id, v);
      if (!res.ok) {
        w.classList.toggle('bad', v.weightKg === null && !bw);
        r.classList.toggle('bad', v.reps === null);
        toast(res.errors[0], { error: true });
        return;
      }
      supersetJump(d.entry.id, res.session);
      rerender();
    } }, done ? icon('check', { size: 22 }) : null), hint);
  return [
    row,
    tagChips(set),
    ...stageRows(set, {
      after: rerender,
      act: {
        update: (i, v) => ok(S.updateStage(eid, set.id, i, v)),
        remove: (i) => ok(S.removeStage(eid, set.id, i)),
        add: () => ok(S.addStage(eid, set.id))
      }
    }),
    isQuick ? quickButtons(set, { onQuick: (type) => { if (ok(S.quickStage(eid, set.id, type))) rerender(); } }) : null
  ];
}

// v1.3: „statt <geplant> · zurück“; v1.4 (Entscheidung 2 B): „Tauschen“ klappt die Kandidaten unter dem Titel auf.
function swapLine(d, rerender) {
  const planned = d.entry.plannedExerciseId ? lib.getExercise(d.entry.plannedExerciseId) : null;
  const { candidates } = swapOptions(d.entry);
  if (!planned && !candidates.length) return [];
  const back = () => {
    const r = S.swapEntry(d.entry.id, planned.id);
    if (!r.ok) { toast(r.errors[0], { error: true }); return; }
    toast(r.mode === 'inserted' ? `${planned.name} dahinter eingefügt.` : `Zurück: ${planned.name}.`);
    if (r.mode === 'inserted') ui.current = r.index;
    rerender();
  };
  const open = ui.swapOpen === d.entry.id && candidates.length > 0;
  const hasDone = d.entry.sets.some((x) => x.completedAt !== null);
  const pick = (ex) => {
    const r = S.swapEntry(d.entry.id, ex.id);
    if (!r.ok) { toast(r.errors[0], { error: true }); return; }
    ui.swapOpen = null;
    toast(r.mode === 'inserted' ? `${ex.name} dahinter eingefügt.` : `Getauscht: ${ex.name}.`);
    if (r.mode === 'inserted') ui.current = r.index;
    rerender();
  };
  const sex = store.get('settings').figure;
  return [
    h('div', { class: 'swapline' },
      planned ? h('span', { class: 'muted small' }, `statt ${planned.name} · `, h('button', { class: 'link small', type: 'button', onclick: back }, 'zurück')) : h('span'),
      candidates.length ? h('button', { class: `btn small swap-btn${open ? ' on' : ''}`, type: 'button', 'aria-expanded': String(open), onclick: () => { ui.swapOpen = open ? null : d.entry.id; rerender(); } },
        icon('swap', { size: 16 }), ' Tauschen') : null),
    open ? h('div', { class: 'card list swap-list' },
      hasDone ? h('p', { class: 'muted small swap-note' }, 'Schon ein Satz erledigt: Die Auswahl kommt als eigene Übung direkt dahinter.') : null,
      candidates.map((ex) => h('button', { class: 'row', type: 'button', onclick: () => pick(ex) },
        h('span', { class: 'fig-ic' }, miniFigure(ex, sex)),
        h('span', { class: 't' }, h('b', {}, ex.name), h('small', {}, candidateLine(ex, d.entry))),
        h('span', { class: 'pill-act' }, hasDone ? 'Einfügen' : 'Tauschen')))) : null
  ];
}

// v1.4 (Entscheidung 4 C): Cardio als eine Einheit – Dauer, Strecke, optional Intensität; Tempo berechnet. Keine Kalorien.
function cardioCard(d, rerender) {
  let set = d.entry.sets[0];
  if (!set) { S.addSet(d.entry.id, 'work'); set = S.activeSession().entries.find((e) => e.id === d.entry.id).sets[0]; }
  const done = set.completedAt !== null;
  const dur = h('input', { class: 'big-in', type: 'text', inputmode: 'numeric', value: fmtDuration(set.durationSec), placeholder: d.last ? fmtDuration(d.last.sets[0]?.durationSec) || 'mm:ss' : 'mm:ss', 'aria-label': 'Dauer (Minuten oder mm:ss)', disabled: done });
  const km = h('input', { class: 'big-in', type: 'text', inputmode: 'decimal', value: fmtKm(set.distanceM), placeholder: d.last ? fmtKm(d.last.sets[0]?.distanceM) || '–' : '–', 'aria-label': 'Strecke in km', disabled: done });
  const pace = h('p', { class: 'muted small' });
  const read = () => {
    const durationSec = parseDuration(dur.value);
    const distanceM = parseDistanceKm(km.value);
    dur.classList.toggle('bad', Number.isNaN(durationSec));
    km.classList.toggle('bad', Number.isNaN(distanceM));
    const p = Number.isNaN(durationSec) || Number.isNaN(distanceM) ? null : fmtPace(durationSec, distanceM);
    pace.textContent = p ? `Tempo ${p}` : 'Dauer als Minuten (z. B. 20) oder mm:ss.';
    return Number.isNaN(durationSec) || Number.isNaN(distanceM) ? null : { durationSec, distanceM };
  };
  const save = () => { const v = read(); if (v) S.updateSet(d.entry.id, set.id, v); };
  dur.addEventListener('input', read); km.addEventListener('input', read);
  dur.addEventListener('change', save); km.addEventListener('change', save);
  read();
  const intens = h('div', { class: 'chips' }, Object.entries(INTENSITIES).map(([k, label]) => h('button', { type: 'button', class: `chip${set.intensity === k ? ' on' : ''}`, 'aria-pressed': String(set.intensity === k), disabled: done,
    onclick: () => { S.updateSet(d.entry.id, set.id, { intensity: set.intensity === k ? null : k }); rerender(); } }, label)));
  return h('div', { class: 'card cardio' },
    h('div', { class: 'cardio-row' },
      h('label', { class: 'cf' }, h('span', { class: 'ctl-label' }, 'Dauer'), dur),
      h('label', { class: 'cf' }, h('span', { class: 'ctl-label' }, 'Strecke km'), km)),
    h('span', { class: 'ctl-label' }, 'Intensität (optional)'),
    intens,
    pace,
    h('button', { class: `btn block${done ? '' : ' primary'}`, type: 'button', onclick: () => {
      if (done) { S.uncompleteSet(d.entry.id, set.id); rerender(); return; }
      let v = read();
      if (!v) { toast('Bitte gültige Werte eingeben (Dauer z. B. 20:00, Strecke z. B. 4,6).', { error: true }); return; }
      if (v.durationSec === null && v.distanceM === null && d.last?.sets[0]) v = { durationSec: d.last.sets[0].durationSec, distanceM: d.last.sets[0].distanceM };
      const r = S.completeSet(d.entry.id, set.id, v);
      if (!r.ok) { toast(r.errors[0], { error: true }); return; }
      supersetJump(d.entry.id, r.session);
      rerender();
    } }, done ? [icon('check', { size: 18 }), ' Erledigt – wieder öffnen'] : 'Einheit erledigt'));
}

function exercisePage(v, d, rerender) {
  const ex = d.exercise;
  const n = v.entries.length;
  let workNo = 0;
  const quickAt = lastCompletedIndex(d.entry.sets);
  const cardio = ex?.kind === 'cardio';
  const rows = cardio ? [] : d.entry.sets.flatMap((set, i) => setRow(d, set, i, set.type === 'warmup' ? 0 : ++workNo, rerender, i === quickAt)).filter(Boolean);
  const lastSets = d.last ? d.last.sets.filter((x) => x.type !== 'warmup') : [];
  const isLast = d.index === n - 1;
  const perSide = isPerSide(ex);
  // v2.26.0 (A4): Startwert = nächster offener Satz (Eintrag oder Platzhalter), sonst der letzte Satz.
  plate.bar = cardio ? null : barFor(ex, store.get('settings'));
  plate.el = plate.bar === null ? null : h('p', { class: 'plates muted small', 'aria-live': 'polite' });
  if (plate.el) {
    const sets = d.entry.sets;
    const i = sets.findIndex((x) => x.completedAt === null);
    const kg = i >= 0 ? (sets[i].weightKg ?? placeholderFor(d.entry, i, d.last)?.weightKg ?? null) : (sets[sets.length - 1]?.weightKg ?? null);
    showPlates(kg);
    if (kg === null) plate.el.hidden = true;
  }
  const letter = SS.letterOf(v.session, d.entry.id);
  const banner = ui.ssBanner?.entryId === d.entry.id ? h('div', { class: 'ss-banner', role: 'status' }, ui.ssBanner.text) : null;
  return h('div', { class: 'ex-page' },
    supersetSwitch(v, d, rerender),
    banner,
    ex ? h('div', {},
      h('h2', { class: 'exh' }, ex.name),
      h('div', { class: 'sub2' }, lib.muscleSummary(ex), perSide ? h('span', { class: 'side-pill' }, 'je Seite') : null,
        letter ? h('span', { class: 'side-pill' }, `Supersatz ${letter}`) : null,
        d.entry.repRange && !cardio ? h('span', { class: 'side-pill' }, `Ziel ${d.entry.repRange.min === d.entry.repRange.max ? d.entry.repRange.min : `${d.entry.repRange.min}–${d.entry.repRange.max}`} Wdh.`) : null),
      ...swapLine(d, rerender),
      h('button', { class: 'note-btn', type: 'button', onclick: () => openNoteEditor(ex, rerender) },
        icon('edit', { size: 14, cls: 'inline' }), ex.note ? ` ${ex.note}` : ' Notiz hinzufügen')) : h('h2', { class: 'exh' }, 'Unbekannte Übung'),
    d.warmupHint ? h('div', { class: 'hint' }, h('span', { class: 'hint-ic' }, icon('info', { size: 18 })), h('span', {}, WARMUP_HINT),
      h('button', { class: 'link', type: 'button', onclick: openWarmupInfo }, 'Mehr')) : null,
    h('div', { class: 'lastl' }, h('span', {}, lastSets.length ? `Zuletzt ${fmtDay(d.last.date)}: ${P.formatLastSets(lastSets, ex?.kind)}` : 'Noch nicht trainiert'),
      h('span', { class: 'lastl-links' },
        ex?.source?.ref && hasAnimation(ex.source.ref) ? h('button', { class: 'link hist-link', type: 'button', onclick: () => openAnimation(ex.source.ref) }, icon('motion', { size: 16, cls: 'inline' }), ' Technik') : null,
        ex && hasHistory(ex.id) ? h('button', { class: 'link hist-link', type: 'button', onclick: () => openProgress(ex.id) }, icon('progress', { size: 16, cls: 'inline' }), ' Verlauf') : null)),
    suggestionCard(d, rerender),
    cardio ? cardioCard(d, rerender) : h('div', { class: 'card sets' },
      h('div', { class: 'hdrrow' }, h('span', {}, 'Satz'), h('span', {}, ex?.kind === 'bodyweight' ? '+ kg' : 'kg'), h('span', {}, perSide ? 'Wdh./S.' : 'Wdh.'), h('span', {}, '')),
      rows.length ? rows : h('p', { class: 'muted small center' }, 'Noch keine Sätze.'),
      plate.el),
    cardio ? null : h('div', { class: 'nav2' },
      h('button', { class: 'btn', type: 'button', onclick: () => { S.addSet(d.entry.id, 'warmup'); rerender(); } }, icon('plus', { size: 18 }), 'Aufwärmsatz'),
      h('button', { class: 'btn', type: 'button', onclick: () => { S.addSet(d.entry.id, 'work'); rerender(); } }, icon('plus', { size: 18 }), 'Satz')),
    ratingLine(d, rerender),
    h('div', { class: 'nav2' },
      h('button', { class: 'btn', type: 'button', disabled: d.index === 0, 'aria-label': 'Vorherige Übung', onclick: () => { ui.current = d.index - 1; rerender(); } }, icon('chevron', { size: 18, cls: 'flip' })),
      h('button', { class: 'btn', type: 'button', onclick: () => openOverview(rerender) }, icon('list', { size: 18 }), 'Übersicht'),
      isLast
        ? h('button', { class: 'btn primary', type: 'button', onclick: () => rateThen(d, () => finishFlow(rerender)) }, 'Beenden')
        : h('button', { class: 'btn primary', type: 'button', 'aria-label': 'Nächste Übung', onclick: () => rateThen(d, () => { ui.current = d.index + 1; rerender(); }, d.index + 1) }, 'Weiter', icon('chevron', { size: 18 }))));
}

// v2.4.0 (1B): beim Verlassen einer Übung einmal nach der Bewertung fragen.
function rateThen(d, next, targetIndex = null) {
  // v2.8.1: auch beim Beenden aus der Übersicht (dort ist d die gerade offene Übung, evtl. null).
  // v2.30.0 (B1): im Supersatz erst beim Verlassen der Gruppe fragen – dann für jedes Mitglied, das noch offen ist.
  if (!d) { next(); return; }
  const v = S.sessionView();
  const m = v ? SS.members(v.session, d.entry.id) : [];
  if (m.length) {
    const ids = new Set(m.map((e) => e.id));
    if (targetIndex !== null && v.entries[targetIndex] && ids.has(v.entries[targetIndex].entry.id)) { next(); return; }
    const todo = v.entries.filter((x) => ids.has(x.entry.id) && needsRating(x));
    const step = (i) => (i < todo.length ? askRating(todo[i], () => step(i + 1)) : next());
    step(0);
    return;
  }
  if (needsRating(d)) askRating(d, next); else next();
}

function activeView(v, rerender) {
  const s = v.session;
  if (ui.sessionId !== s.id || ui.current === null) {
    // Neues oder neu geladenes Training: bei der ersten noch offenen Übung einsteigen.
    ui.sessionId = s.id;
    const firstOpen = v.entries.findIndex((d) => !d.complete);
    ui.current = firstOpen < 0 ? 0 : firstOpen;
  }
  ui.current = Math.max(0, Math.min(ui.current, v.entries.length - 1));
  if (ui.ssBanner && v.entries[ui.current]?.entry.id !== ui.ssBanner.entryId) ui.ssBanner = null;
  const plan = s.planId ? P.getPlan(s.planId) : null;
  const n = v.entries.length;
  const d = v.entries[ui.current];
  // Vorschau bezieht sich auf die gerade offene Übung (nicht unbedingt die des Timers).
  nextCache.key = s.restTimer ? (d?.entry.id ?? null) : null;
  nextCache.text = nextCache.key ? computeNext(v, nextCache.key) : null;
  const bar = restBar(rerender);
  const page = h('section', { class: 'training' },
    h('div', { class: 'prog' },
      h('span', {}, `${plan ? plan.name : 'Freies Training'}${s.light ? ' · leicht' : ''}${n ? ` · Übung ${ui.current + 1} von ${n}` : ''}`),
      h('span', { 'data-clock': '' }, elapsed(s.startedAt))),
    h('div', { class: 'bar' }, h('div', { style: `width:${n ? Math.round((v.entries.filter((x) => x.complete).length / n) * 100) : 0}%` })),
    d ? exercisePage(v, d, rerender) : h('div', { class: 'card empty' },
      h('h2', {}, 'Noch keine Übung'),
      h('p', { class: 'muted' }, 'Füge die erste Übung hinzu.'),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => openAddExercise(rerender, () => { ui.current = 0; }) }, 'Übung hinzufügen'),
        h('button', { class: 'btn', type: 'button', onclick: () => openOverview(rerender) }, 'Übersicht'))),
    bar);
  renderRest(bar, s);
  startTick();
  return page;
}

// ---------- Start ----------

function startView(rerender) {
  // v2.33.0: Pläne des Tages (Trainingstag heute) nach oben, sonst alphabetisch
  const plans = todayFirst(P.listPlans().sort((a, b) => a.name.localeCompare(b.name, 'de')));
  const byId = Object.fromEntries(lib.listExercises({ includeArchived: true }).map((e) => [e.id, e]));
  const past = S.finishedSessions();
  const recent = past.slice(0, 3);
  const pause = PR.breakInfo(past);
  const settings = store.get('settings');
  const light = settings.lightWeek === weekKey(new Date());
  const start = (fn) => () => { const r = fn(); if (!r.ok) { toast(r.errors[0], { error: true }); return; } ui.current = null; rerender(); };
  return h('section', {},
    h('h1', {}, 'Training'),
    h('p', { class: 'sub' }, 'Plan wählen und loslegen. Alle Daten bleiben auf diesem Gerät.'),
    ...cycleStartCards(rerender),
    ...missedCards(rerender),
    plans.length
      ? plans.map((p) => {
        const names = p.items.map((it) => byId[it.exerciseId]?.name).filter(Boolean);
        const warm = RT.planRoutine(p, 'warmup');
        // v2.3.0: Plan mit Aufwärm-Routine fragt vor dem Start; „Nein“ startet ohne weiteren Hinweis.
        // v2.4.0 (3A): nach ≥ 21 Tagen Pause erst „Willkommen zurück“, dann wie gewohnt (Aufwärm-Frage, Start).
        const launch = (reduce, lighter = false) => {
          const begin = () => {
            const r = S.startFromPlan(p.id);
            if (r.ok && reduce) S.applyBreakReduction(pause.pct, pause.days);
            if (r.ok && lighter) { const l = S.applyLightWeek(); return l.ok && l.session ? l : r; }
            return r;
          };
          if (!warm) { start(begin)(); return; }
          askWarmup(warm, {
            onNo: () => start(begin)(),
            onYes: () => {
              const r = begin();
              if (!r.ok) { toast(r.errors[0], { error: true }); return; }
              ui.current = null;
              startRun(warm, { sessionId: r.session.id, returnTo: '#/' });
            }
          });
        };
        const go = () => {
          // v2.30.0 (B3): leichte Woche aktiv → Vorschlag statt „Willkommen zurück“ (die Reduktion ist ohnehin größer).
          if (light) {
            askLight(p, byId, past, {
              onLight: () => launch(false, true),
              onNormal: () => launch(false)
            });
            return;
          }
          if (!pause) { launch(false); return; }
          askBreak(p, byId, past, pause, { onReduce: () => launch(true), onKeep: () => launch(false) });
        };
        const days = formatDays(p.days);
        const skipped = days && isWeekSkipped(p);
        const today = !skipped && isPlanDay(p);
        const fig = names.length ? planFigure(p, byId, settings.figure || 'male') : null;
        return h('div', { class: `pcard start-card${today ? ' today' : ''}` },
          h('div', { class: 'pc-body' },
            fig,
            h('div', { class: 'pc-text' },
              h('span', { class: 'pc-top' }, h('b', {}, p.name), days ? h('small', { class: 'muted' }, days) : null),
              today ? h('small', { class: 'today-tag' }, 'Heute') : null,
              skipped ? h('small', { class: 'muted' }, 'Diese Woche ausgesetzt · ', h('button', { class: 'link small', type: 'button', onclick: () => { P.unskipWeek(p.id); rerender(); } }, 'rückgängig')) : null,
              h('small', {}, `${names.length} ${names.length === 1 ? 'Übung' : 'Übungen'}${warm ? ` · Aufwärmen: ${warm.name}` : ''}`),
              names.length ? h('span', { class: 'ex' }, names.join(' · ')) : null)),
          h('button', { class: 'btn primary block', type: 'button', disabled: !names.length, onclick: go }, 'Starten'));
      })
      : h('div', { class: 'card empty' }, h('div', { class: 'big' }, icon('plans', { size: 44 })), h('h2', {}, 'Noch keine Pläne'),
        h('p', { class: 'muted' }, 'Lege im Tab „Pläne“ einen Plan an – oder starte ein freies Training.')),
    h('button', { class: 'btn block', type: 'button', onclick: start(() => S.startEmpty()) }, 'Freies Training starten'),
    h('button', { class: 'btn block subtle', type: 'button', onclick: () => openBackfill(rerender) }, 'Training nachtragen'),
    lightWeekCard(light, rerender),
    recent.length ? h('div', {}, h('div', { class: 'sec' }, 'Letzte Trainings'),
      h('div', { class: 'card list' }, recent.map((s) => {
        const sum = S.sessionView(s).summary;
        const name = s.planId ? (P.getPlan(s.planId)?.name || 'Plan') : 'Freies Training';
        return h('div', { class: 'row' }, h('span', { class: 't' }, h('b', {}, name),
          h('small', {}, `${new Date(s.startedAt).toLocaleDateString('de-DE')} · ${sum.hardSets} Arbeitssätze`)));
      }))) : null);
}

export function trainingView(rerender) {
  const v = S.sessionView();
  return v ? activeView(v, rerender) : startView(rerender);
}
