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
import { formatDuration } from './rest.js';
import { WARMUP_HINT, WARMUP_INFO, WARMUP_CHECKED_AT } from './warmup-info.js';
import { openProgress, hasHistory } from './progress-view.js';
import { parseWeight, parseReps, fmtNum } from './input.js';
import { weightWarning } from './model.js';
import { typoText } from './diary-view.js';
import * as SETS from './sets.js';
import { openSetSheet, stageRows, tagChips, quickButtons, lastCompletedIndex } from './set-view.js';

const ui = { current: null, sessionId: null };
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
  const exName = entry ? (lib.getExercise(entry.exerciseId)?.name || '') : '';
  bar.querySelector('.rt-time').textContent = st.done ? 'Pause vorbei' : formatDuration(st.remaining);
  bar.querySelector('.rt-sub').textContent = st.done ? `+${formatDuration(st.overtime)} · ${exName}` : `Pause · ${exName}`;
  bar.querySelector('.rt-ring-fg').setAttribute('stroke-dashoffset', String(RING_LEN * (1 - st.progress)));
  bar.querySelectorAll('.rt-adj').forEach((b) => { b.hidden = st.done; });
}

function restBar(rerender) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 54 54');
  svg.setAttribute('class', 'rt-ring');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<circle cx="27" cy="27" r="23" class="rt-ring-bg"/><circle cx="27" cy="27" r="23" class="rt-ring-fg" stroke-dasharray="${RING_LEN}" stroke-dashoffset="${RING_LEN}" transform="rotate(-90 27 27)"/>`;
  const act = (fn) => () => { const r = fn(); if (!r.ok) toast(r.errors[0], { error: true }); renderRest(bar, S.activeSession()); };
  const bar = h('div', { class: 'restbar', 'data-rest': '', role: 'timer', 'aria-live': 'off', hidden: true },
    svg,
    h('div', { class: 'rt-text' }, h('b', { class: 'rt-time' }, ''), h('small', { class: 'rt-sub' }, '')),
    h('button', { class: 'rt-btn rt-adj', type: 'button', 'aria-label': 'Pause 15 Sekunden kürzer', onclick: act(() => S.adjustRunningRest(-1)) }, '−15'),
    h('button', { class: 'rt-btn rt-adj', type: 'button', 'aria-label': 'Pause 15 Sekunden länger', onclick: act(() => S.adjustRunningRest(1)) }, '+15'),
    h('button', { class: 'rt-btn', type: 'button', 'aria-label': 'Pause beenden', onclick: () => { S.stopRest(); bar.hidden = true; } }, icon('close', { size: 18 })));
  return bar;
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
      } }, h('span', { class: 't' }, h('b', {}, e.name), h('small', {}, lib.muscleSummary(e))), icon('plus', { size: 18 }))))))
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
          h('small', {}, `${d.doneCount}/${d.entry.sets.length} Sätze${d.complete ? ' · fertig' : ''}`)),
        h('div', { class: 'arrows horiz' },
          h('button', { type: 'button', 'aria-label': 'Nach oben', disabled: d.index === 0, onclick: () => { S.moveEntry(d.entry.id, d.index - 1); if (ui.current === d.index) ui.current -= 1; else if (ui.current === d.index - 1) ui.current += 1; draw(); rerender(); } }, icon('up')),
          h('button', { type: 'button', 'aria-label': 'Nach unten', disabled: d.index === v.entries.length - 1, onclick: () => { S.moveEntry(d.entry.id, d.index + 1); if (ui.current === d.index) ui.current += 1; else if (ui.current === d.index + 1) ui.current -= 1; draw(); rerender(); } }, icon('down')),
          h('button', { type: 'button', class: 'danger', 'aria-label': 'Übung aus dem Training entfernen', onclick: () => {
            if (d.doneCount && !confirm('Diese Übung hat erledigte Sätze. Trotzdem entfernen?')) return;
            S.removeEntry(d.entry.id);
            if (ui.current >= d.index && ui.current > 0) ui.current -= 1;
            draw(); rerender();
          } }, icon('trash')))))),
      h('button', { class: 'addline', type: 'button', onclick: () => openAddExercise(rerender, () => { const s = S.activeSession(); ui.current = s.entries.length - 1; draw(); }) }, icon('plus', { size: 18 }), 'Übung hinzufügen'),
      h('p', { class: 'muted small center' }, `${v.summary.hardSets} Arbeitssätze erledigt`),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { sheet.close(); finishFlow(rerender); } }, 'Training beenden'),
      h('button', { class: 'btn block subtle danger-text', type: 'button', onclick: () => {
        if (!confirm('Training verwerfen? Alle Einträge dieses Trainings gehen verloren.')) return;
        S.discard(); sheet.close(); toast('Training verworfen.'); rerender();
      } }, 'Training verwerfen'));
  };
  draw();
  sheet = openSheet(body, { title: 'Übersicht', full: true });
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
  const sum = S.sessionView(r.session).summary;
  const dur = elapsed(before.startedAt);
  rerender();
  openSheet(h('div', { class: 'info' },
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', {}, dur), h('span', {}, 'Dauer')),
      h('div', { class: 'stat' }, h('b', {}, String(sum.hardSets)), h('span', {}, 'Arbeitssätze')),
      h('div', { class: 'stat' }, h('b', {}, `${Math.round(sum.volume).toLocaleString('de-DE')}`), h('span', {}, 'Volumen kg'))),
    h('p', { class: 'muted small' }, 'Volumen = Gewicht × Wiederholungen der Arbeitssätze (ohne Aufwärmsätze, ohne Körpergewichtsübungen). Die Werte sind die Vorbelegung fürs nächste Training.')
  ), { title: 'Training gespeichert' });
}

// ---------- Übungsseite (A) ----------

function setRow(d, set, i, workNo, rerender, isQuick = false) {
  const done = set.completedAt !== null;
  const w = h('input', { class: 'val', type: 'text', inputmode: 'decimal', enterkeyhint: 'next', value: fmtNum(set.weightKg), 'aria-label': `Satz ${i + 1} Gewicht in kg`, placeholder: '–' });
  const r = h('input', { class: 'val', type: 'text', inputmode: 'numeric', enterkeyhint: 'done', value: fmtNum(set.reps), 'aria-label': `Satz ${i + 1} Wiederholungen`, placeholder: '–' });
  const commit = () => {
    const weightKg = parseWeight(w.value);
    const reps = parseReps(r.value);
    if (Number.isNaN(weightKg) || Number.isNaN(reps)) { toast('Bitte gültige Zahlen eingeben (Gewicht z. B. 82,5).', { error: true }); return null; }
    return { weightKg, reps };
  };
  // Tippfehler-Hinweis (v1.1): nicht blockierend, Vergleich mit abgeschlossenen Trainings.
  const hint = h('div', { class: 'hint typo', hidden: true }, h('span', { class: 'hint-ic' }, icon('info', { size: 18 })), h('span', {}));
  const checkTypo = () => {
    const kg = parseWeight(w.value);
    const warn = Number.isNaN(kg) ? null : weightWarning(d.entry.exerciseId, kg, store.get('sessions'));
    w.classList.toggle('warnval', !!warn);
    hint.hidden = !warn;
    if (warn) hint.lastChild.textContent = typoText(warn.best);
  };
  checkTypo();
  w.addEventListener('input', checkTypo);
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
      remove: () => ok(S.removeSet(eid, set.id))
    }
  });
  const row = h('div', { class: `setrow${done ? ' done' : ''}${set.type === 'warmup' ? ' warm' : ''}${SETS.hasStages(set.type) ? ' staged' : ''}` },
    h('button', { class: 'sn', type: 'button', 'aria-label': `Satz ${label}: Typ und Markierungen`, onclick: openMenu }, label),
    w, r,
    h('button', { class: `ck${done ? ' on' : ''}`, type: 'button', 'aria-pressed': String(done), 'aria-label': done ? 'Satz wieder öffnen' : 'Satz erledigt', onclick: () => {
      if (done) { S.uncompleteSet(d.entry.id, set.id); rerender(); return; }
      const v = commit();
      if (!v) return;
      const res = S.completeSet(d.entry.id, set.id, v);
      if (!res.ok) { toast(res.errors[0], { error: true }); return; }
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

function exercisePage(v, d, rerender) {
  const ex = d.exercise;
  const n = v.entries.length;
  let workNo = 0;
  const quickAt = lastCompletedIndex(d.entry.sets);
  const rows = d.entry.sets.flatMap((set, i) => setRow(d, set, i, set.type === 'warmup' ? 0 : ++workNo, rerender, i === quickAt)).filter(Boolean);
  const lastSets = d.last ? d.last.sets.filter((x) => x.type !== 'warmup') : [];
  const isLast = d.index === n - 1;
  return h('div', { class: 'ex-page' },
    ex ? h('div', {},
      h('h2', { class: 'exh' }, ex.name),
      h('div', { class: 'sub2' }, lib.muscleSummary(ex)),
      h('button', { class: 'note-btn', type: 'button', onclick: () => openNoteEditor(ex, rerender) },
        icon('edit', { size: 14, cls: 'inline' }), ex.note ? ` ${ex.note}` : ' Notiz hinzufügen')) : h('h2', { class: 'exh' }, 'Unbekannte Übung'),
    d.warmupHint ? h('div', { class: 'hint' }, h('span', { class: 'hint-ic' }, icon('info', { size: 18 })), h('span', {}, WARMUP_HINT),
      h('button', { class: 'link', type: 'button', onclick: openWarmupInfo }, 'Mehr')) : null,
    h('div', { class: 'lastl' }, h('span', {}, lastSets.length ? `Zuletzt ${fmtDay(d.last.date)}: ${P.formatLastSets(lastSets)}` : 'Noch nicht trainiert'),
      ex && hasHistory(ex.id) ? h('button', { class: 'link hist-link', type: 'button', onclick: () => openProgress(ex.id) }, icon('progress', { size: 16, cls: 'inline' }), ' Verlauf') : null),
    h('div', { class: 'card sets' },
      h('div', { class: 'hdrrow' }, h('span', {}, 'Satz'), h('span', {}, 'kg'), h('span', {}, 'Wdh.'), h('span', {}, '')),
      rows.length ? rows : h('p', { class: 'muted small center' }, 'Noch keine Sätze.')),
    h('div', { class: 'nav2' },
      h('button', { class: 'btn', type: 'button', onclick: () => { S.addSet(d.entry.id, 'warmup'); rerender(); } }, icon('plus', { size: 18 }), 'Aufwärmsatz'),
      h('button', { class: 'btn', type: 'button', onclick: () => { S.addSet(d.entry.id, 'work'); rerender(); } }, icon('plus', { size: 18 }), 'Satz')),
    h('div', { class: 'nav2' },
      h('button', { class: 'btn', type: 'button', disabled: d.index === 0, 'aria-label': 'Vorherige Übung', onclick: () => { ui.current = d.index - 1; rerender(); } }, icon('chevron', { size: 18, cls: 'flip' })),
      h('button', { class: 'btn', type: 'button', onclick: () => openOverview(rerender) }, icon('list', { size: 18 }), 'Übersicht'),
      isLast
        ? h('button', { class: 'btn primary', type: 'button', onclick: () => finishFlow(rerender) }, 'Beenden')
        : h('button', { class: 'btn primary', type: 'button', 'aria-label': 'Nächste Übung', onclick: () => { ui.current = d.index + 1; rerender(); } }, 'Weiter', icon('chevron', { size: 18 }))));
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
  const plan = s.planId ? P.getPlan(s.planId) : null;
  const n = v.entries.length;
  const d = v.entries[ui.current];
  const bar = restBar(rerender);
  const page = h('section', { class: 'training' },
    h('div', { class: 'prog' },
      h('span', {}, `${plan ? plan.name : 'Freies Training'}${n ? ` · Übung ${ui.current + 1} von ${n}` : ''}`),
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
  const plans = P.listPlans().sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const byId = Object.fromEntries(lib.listExercises({ includeArchived: true }).map((e) => [e.id, e]));
  const recent = S.finishedSessions().slice(0, 3);
  const start = (fn) => () => { const r = fn(); if (!r.ok) { toast(r.errors[0], { error: true }); return; } ui.current = null; rerender(); };
  return h('section', {},
    h('h1', {}, 'Training'),
    h('p', { class: 'sub' }, 'Plan wählen und loslegen. Alle Daten bleiben auf diesem Gerät.'),
    plans.length
      ? plans.map((p) => {
        const names = p.items.map((it) => byId[it.exerciseId]?.name).filter(Boolean);
        return h('div', { class: 'pcard start-card' },
          h('span', { class: 'pc-top' }, h('b', {}, p.name)),
          h('small', {}, `${names.length} ${names.length === 1 ? 'Übung' : 'Übungen'}`),
          names.length ? h('span', { class: 'ex' }, names.join(' · ')) : null,
          h('button', { class: 'btn primary block', type: 'button', disabled: !names.length, onclick: start(() => S.startFromPlan(p.id)) }, 'Starten'));
      })
      : h('div', { class: 'card empty' }, h('div', { class: 'big' }, icon('plans', { size: 44 })), h('h2', {}, 'Noch keine Pläne'),
        h('p', { class: 'muted' }, 'Lege im Tab „Pläne“ einen Plan an – oder starte ein freies Training.')),
    h('button', { class: 'btn block', type: 'button', onclick: start(() => S.startEmpty()) }, 'Freies Training starten'),
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
