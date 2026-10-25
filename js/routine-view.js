// Routinen-Oberfläche (v2.3.0, Variante C + Ablauf aus A): Liste im Pläne-Tab, Detail, Editor,
// Katalog, Plan-Verknüpfung, Startfrage und Ablauf-Screen (#/routine) mit Countdown ohne Ton.
import { infoBody } from './info.js';
import { openGlossary } from './glossary.js';
import { h } from './util.js';
import * as store from './store.js';
import * as R from './routines.js';
import * as S from './session.js';
import { PHASES, ITEM_TYPES, ROUTINE_INFO, ROUTINES_CHECKED_AT } from './routine-data.js';
import { ROUTINE_LIMITS } from './model.js';
import { openSheet } from './sheet.js';
import { toast } from './ui.js';
import { icon } from './icons.js';
import { stepper } from './controls.js';
import { miniFigure } from './figure.js';

const sex = () => store.get('settings').figure;
const minutes = (routine) => `≈ ${Math.max(1, Math.round(R.estimateSeconds(routine) / 60))} min`;
const figure = (item, width = 24) => h('span', { class: 'fig-ic' }, miniFigure({ muscles: item.muscles }, sex(), width));

// ---------- Info ----------

export function openRoutineInfo(phase = 'warmup') {
  const lines = phase === 'cooldown' ? ROUTINE_INFO.cooldown : ROUTINE_INFO.warmup;
  openSheet(infoBody({
    short: ROUTINE_INFO.short[phase === 'cooldown' ? 'cooldown' : 'warmup'],
    details: [h('ul', {}, lines.map((t) => h('li', {}, t))), h('h3', {}, 'Gut zu wissen'), h('ul', {}, ROUTINE_INFO.rules.map((t) => h('li', {}, t))),
      h('p', { class: 'muted small' }, 'Abstracts in PubMed geprüft. Keine medizinische Beratung.')],
    sources: ROUTINE_INFO.sources, checked: ROUTINES_CHECKED_AT, glossary: openGlossary
  }), { title: phase === 'cooldown' ? 'Cool-down' : 'Aufwärmen' });
}

// ---------- Detail ----------

function itemRows(routine) {
  return h('div', { class: 'card list' }, routine.items.map(R.resolveItem).filter(Boolean).map((x) =>
    h('div', { class: 'row' }, figure(x), h('span', { class: 't' }, h('b', {}, x.name), h('small', {}, `${ITEM_TYPES[x.type]} · ${R.doseText(x.dose)}`)))));
}

export function openRoutine(id, rerender) {
  const routine = R.getRoutine(id);
  if (!routine) return;
  const tpl = R.isTemplate(id);
  let sheet = null;
  const body = h('div', { class: 'routine' },
    h('div', { class: 'title-row' },
      h('p', { class: 'muted small' }, `${PHASES[routine.phase]} · ${minutes(routine)} · ${routine.items.length} Übungen${tpl ? ' · Vorlage' : ''}`),
      h('button', { class: 'info-btn', type: 'button', 'aria-label': 'Info und Quellen', onclick: () => openRoutineInfo(routine.phase) }, icon('info', { size: 20 }))),
    routine.note ? h('p', { class: 'muted small' }, routine.note) : null,
    itemRows(routine),
    h('button', { class: 'btn primary block', type: 'button', onclick: () => { sheet.close(); startRun(routine, { sessionId: S.activeSession()?.id || null }); } }, 'Starten'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'button', onclick: () => { sheet.close(); openEditor(tpl ? R.copyOf(id) : JSON.parse(JSON.stringify(routine)), rerender, { isNew: tpl }); } }, tpl ? 'Kopieren & anpassen' : 'Bearbeiten'),
      tpl ? null : h('button', { class: 'btn subtle danger-text', type: 'button', onclick: () => {
        if (!confirm(`Routine „${routine.name}“ löschen? Pläne verlieren die Verknüpfung.`)) return;
        const r = R.deleteRoutine(id);
        if (!r.ok) { toast(r.errors[0], { error: true }); return; }
        toast('Routine gelöscht.'); sheet.close(); rerender();
      } }, 'Löschen')));
  sheet = openSheet(body, { title: routine.name, full: true });
}

// ---------- Katalog ----------

function openCatalog(phase, onPick) {
  const state = { type: null };
  const list = h('div');
  const draw = () => {
    const items = R.catalog({ type: state.type });
    // Passende Phase zuerst, Rest darunter – im Cool-down sind Dehnungen oben, im Aufwärmen das Lockere und Dynamische.
    const fit = (x) => (x.phase === phase || x.phase === 'both' ? 0 : 1);
    items.sort((a, b) => fit(a) - fit(b));
    list.replaceChildren(h('div', { class: 'card list' }, items.map((x) =>
      h('button', { class: 'row', type: 'button', onclick: () => { onPick(x.ref); toast(`${x.name} hinzugefügt.`); } },
        figure(x), h('span', { class: 't' }, h('b', {}, x.name), h('small', {}, `${ITEM_TYPES[x.type]} · ${R.doseText(x.dose)}`)), icon('plus', { size: 18 })))));
  };
  const chips = h('div', { class: 'chips' }, [[null, 'Alle'], ...Object.entries(ITEM_TYPES)].map(([k, label]) =>
    h('button', { type: 'button', class: `chip${state.type === k ? ' on' : ''}`, 'aria-pressed': String(state.type === k), onclick: (e) => {
      state.type = k;
      for (const b of chips.children) b.classList.toggle('on', b === e.currentTarget);
      draw();
    } }, label)));
  draw();
  openSheet(h('div', {}, chips, list,
    h('p', { class: 'muted small' }, 'Zählen nicht als Sätze und nicht in die Muskelkarte.')),
  { title: 'Übung hinzufügen', full: true });
}

// ---------- Editor (eigene Routine) ----------

const stepOf = (mode) => (mode === 'time' ? 15 : mode === 'hold' ? 5 : 1);
const clampTo = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));

export function openEditor(draft, rerender, { isNew = false } = {}) {
  const r = draft;
  let sheet = null;
  const body = h('div', { class: 'editor routine-edit' });
  const nameInput = h('input', { class: 'input', type: 'text', value: r.name, maxlength: '60', 'aria-label': 'Name der Routine', placeholder: 'z. B. Mein Beintag-Start', oninput: (e) => { r.name = e.target.value; } });

  const draw = () => {
    const resolved = r.items.map(R.resolveItem);
    const rows = r.items.map((ri, i) => {
      const x = resolved[i];
      if (!x) return null;
      const d = x.dose;
      const valueKey = d.mode === 'reps' ? 'reps' : 'seconds';
      const limits = d.mode === 'reps' ? ROUTINE_LIMITS.reps : ROUTINE_LIMITS.seconds;
      const fmt = d.mode === 'reps' ? (v) => `${v}×` : d.mode === 'time' ? R.fmtClock : (v) => `${v} s`;
      return h('div', { class: 'card rt-item' },
        h('div', { class: 'rt-head' }, figure(x), h('span', { class: 't' }, h('b', {}, x.name), h('small', {}, `${ITEM_TYPES[x.type]}${d.perSide ? ' · je Seite' : ''}`)),
          h('div', { class: 'arrows horiz' },
            h('button', { type: 'button', 'aria-label': `${x.name} nach oben`, disabled: i === 0, onclick: () => { r.items.splice(i - 1, 0, r.items.splice(i, 1)[0]); draw(); } }, icon('up')),
            h('button', { type: 'button', 'aria-label': `${x.name} nach unten`, disabled: i === r.items.length - 1, onclick: () => { r.items.splice(i + 1, 0, r.items.splice(i, 1)[0]); draw(); } }, icon('down')),
            h('button', { type: 'button', class: 'danger', 'aria-label': `${x.name} entfernen`, onclick: () => { r.items.splice(i, 1); draw(); } }, icon('trash')))),
        h('div', { class: 'rt-dose' },
          h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, d.mode === 'reps' ? 'Wiederholungen' : d.mode === 'time' ? 'Dauer' : 'Halten'),
            stepper({ value: ri[valueKey], small: true, format: fmt, label: x.name, onStep: (v, delta) => {
              ri[valueKey] = clampTo(v + delta * stepOf(d.mode), limits);
              drawFoot();
              return ri[valueKey];
            } })),
          d.mode === 'hold' ? h('div', { class: 'ctl' }, h('span', { class: 'ctl-label' }, 'Runden'),
            stepper({ value: ri.rounds, small: true, format: (v) => `${v}×`, label: `${x.name} Runden`, onStep: (v, delta) => {
              ri.rounds = clampTo(v + delta, ROUTINE_LIMITS.rounds);
              drawFoot();
              return ri.rounds;
            } })) : null));
    }).filter(Boolean);
    body.replaceChildren(
      h('div', { class: 'field' }, h('label', {}, 'Name'), nameInput),
      isNew ? h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Art' }, Object.entries(PHASES).map(([k, label]) =>
        h('button', { type: 'button', role: 'tab', class: r.phase === k ? 'on' : '', 'aria-selected': String(r.phase === k), onclick: () => { r.phase = k; draw(); } }, label)))
        : h('p', { class: 'muted small' }, PHASES[r.phase]),
      foot,
      ...(rows.length ? rows : [h('p', { class: 'muted empty-line' }, 'Noch keine Übungen.')]),
      hint,
      h('button', { class: 'addline', type: 'button', onclick: () => openCatalog(r.phase, (ref) => { Object.assign(r, R.addItem(r, ref)); draw(); }) }, icon('plus', { size: 18 }), 'Übung aus Katalog'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => sheet.close() }, 'Abbrechen'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => {
          const res = R.saveRoutine(r);
          if (!res.ok) { toast(res.errors[0], { error: true }); return; }
          toast('Routine gespeichert.'); sheet.close(); rerender();
        } }, 'Fertig')));
    drawFoot();
  };
  const foot = h('div', { class: 'sec rt-total' });
  const hint = h('div', { class: 'hint-box' });
  const drawFoot = () => {
    foot.textContent = `Übungen · ${minutes(r)}`;
    const long = R.longHoldsInWarmup(r);
    hint.hidden = !long.length;
    hint.replaceChildren(...(long.length ? [
      h('span', {}, `Hinweis, kein Verbot: Langes Halten (60 s und mehr pro Muskel, hier: ${long.map((x) => x.name).join(', ')}) direkt vor schweren Sätzen kann die Kraft kurz senken. `),
      h('button', { class: 'link small', type: 'button', onclick: () => openRoutineInfo('warmup') }, 'Info')] : []));
  };
  draw();
  sheet = openSheet(body, { title: isNew ? 'Neue Routine' : 'Routine bearbeiten', full: true });
}

export function openNewRoutine(rerender) {
  openEditor(R.createRoutine({ name: '', phase: 'warmup' }), rerender, { isNew: true });
}

// ---------- Liste im Pläne-Tab ----------

export function routinesPanel(rerender) {
  const section = (phase) => {
    const list = R.listRoutines({ phase });
    return h('section', {},
      h('div', { class: 'sec sec-row' }, h('span', {}, PHASES[phase]),
        h('button', { class: 'info-btn small', type: 'button', 'aria-label': `Info ${PHASES[phase]}`, onclick: () => openRoutineInfo(phase) }, icon('info', { size: 16 }))),
      h('div', { class: 'card list' }, list.map((r) => h('button', { class: 'row', type: 'button', onclick: () => openRoutine(r.id, rerender) },
        h('span', { class: 't' }, h('b', {}, r.name), h('small', {}, `${minutes(r)} · ${r.items.length} Übungen`)),
        R.isTemplate(r.id) ? h('span', { class: 'tag' }, 'Vorlage') : null,
        icon('chevron', { size: 18 })))));
  };
  return h('div', { class: 'routines' },
    h('p', { class: 'muted small' }, 'Optional, zählt nicht als Sätze.'),
    section('warmup'), section('cooldown'),
    h('button', { class: 'addline', type: 'button', onclick: () => openNewRoutine(rerender) }, icon('plus', { size: 18 }), 'Eigene Routine'));
}

// ---------- Plan-Verknüpfung ----------

export function openRoutineChooser(phase, currentId, onPick, { allowNone = true, title = null } = {}) {
  let sheet = null;
  const rows = R.listRoutines({ phase }).map((r) => h('button', { class: `row${r.id === currentId ? ' on' : ''}`, type: 'button', 'aria-pressed': String(r.id === currentId), onclick: () => { sheet.close(); onPick(r.id); } },
    h('span', { class: 't' }, h('b', {}, r.name), h('small', {}, `${minutes(r)}${R.isTemplate(r.id) ? ' · Vorlage' : ''}`)), r.id === currentId ? icon('check', { size: 18 }) : null));
  sheet = openSheet(h('div', {},
    h('div', { class: 'card list' }, rows),
    allowNone ? h('button', { class: 'btn block subtle', type: 'button', onclick: () => { sheet.close(); onPick(null); } }, phase === 'warmup' ? 'Kein Aufwärmen' : 'Kein Cool-down') : null),
  { title: title || (phase === 'warmup' ? 'Aufwärmen wählen' : 'Cool-down wählen') });
}

export function planSlots(plan, redraw) {
  const slot = (phase) => {
    const r = R.planRoutine(plan, phase);
    return h('button', { class: `slot${r ? ' set' : ''}`, type: 'button', onclick: () => openRoutineChooser(phase, r?.id || null, (id) => {
      const res = R.setPlanRoutine(plan.id, phase, id);
      if (!res.ok) { toast(res.errors[0], { error: true }); return; }
      redraw();
    }) },
    h('span', { class: 't' }, h('small', {}, phase === 'warmup' ? 'Vor dem Training' : 'Nach dem Training (optional)'),
      h('b', {}, r ? `${PHASES[phase]} ${r.name} · ${minutes(r)}` : (phase === 'warmup' ? 'Kein Aufwärmen · antippen zum Wählen' : 'Kein Cool-down · antippen zum Wählen'))),
    icon(r ? 'chevron' : 'plus', { size: 18 }));
  };
  return { before: slot('warmup'), after: slot('cooldown') };
}

// Startfrage vor einem Plan mit Aufwärm-Routine. Nein startet ohne weiteren Hinweis.
export function askWarmup(routine, { onYes, onNo }) {
  let sheet = null;
  sheet = openSheet(h('div', {},
    h('p', {}, `${routine.name} · ${minutes(routine)}`),
    h('p', { class: 'muted small' }, 'Locker aufwärmen, danach 1–3 leichte Sätze der ersten Übung. Optional.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'button', onclick: () => { sheet.close(); onNo(); } }, 'Nein, direkt los'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { sheet.close(); onYes(); } }, 'Ja, aufwärmen'))),
  { title: 'Erst aufwärmen?' });
}

// ---------- Ablauf (#/routine) ----------

let run = null;

export function startRun(routine, { sessionId = null, returnTo = null } = {}) {
  const list = R.steps(routine);
  if (!list.length) { toast('Die Routine ist leer.', { error: true }); return; }
  run = { routine, steps: list, index: 0, sessionId, startedAt: new Date().toISOString(), stepStart: Date.now(), pausedLeft: null,
    returnTo: returnTo || (sessionId ? '#/' : '#/plans') };
  location.hash = '#/routine';
}

export function currentRun() {
  return run;
}

function endRun(completed) {
  const r = run;
  run = null;
  const done = completed ? r.steps.length : r.index;
  if (r.sessionId && done > 0) R.recordRoutine(r.sessionId, { routine: r.routine, startedAt: r.startedAt, done, total: r.steps.length });
  if (completed) toast(`${PHASES[r.routine.phase]} erledigt.`);
  location.hash = r.returnTo;
}

function stepElapsed() {
  if (!run) return 0;
  const st = run.steps[run.index];
  if (st.seconds === null) return 0;
  if (run.pausedLeft !== null) return st.seconds - run.pausedLeft;
  return Math.min(st.seconds, (Date.now() - run.stepStart) / 1000);
}

function go(delta, rerender) {
  const next = run.index + delta;
  if (next >= run.steps.length) { endRun(true); return; }
  run.index = Math.max(0, next);
  run.stepStart = Date.now();
  run.pausedLeft = null;
  rerender();
}

export function runnerView(rerender) {
  if (!run) {
    setTimeout(() => { location.hash = '#/'; }, 0);
    return h('section', {}, h('p', { class: 'muted' }, 'Keine Routine aktiv.'));
  }
  const st = run.steps[run.index];
  const item = st.item;
  const itemCount = new Set(run.steps.map((x) => x.itemIndex)).size;
  const progress = Math.round((run.index / run.steps.length) * 100);
  const nextItems = [];
  for (let i = run.index + 1; i < run.steps.length && nextItems.length < 2; i++) {
    if (run.steps[i].itemIndex !== st.itemIndex && !nextItems.some((x) => x.itemIndex === run.steps[i].itemIndex)) nextItems.push(run.steps[i]);
  }

  const remain = h('span', {});
  const ringText = h('b', { class: 'ring-time' });
  const ring = st.seconds !== null ? h('div', { class: 'ring', role: 'timer', 'aria-label': 'Restzeit' }, h('div', { class: 'ring-in' }, ringText, h('small', { class: 'muted' }, `von ${R.fmtClock(st.seconds)}`))) : null;
  const pauseBtn = st.seconds !== null ? h('button', { class: 'btn subtle', type: 'button', onclick: () => {
    if (run.pausedLeft === null) run.pausedLeft = Math.max(0, st.seconds - stepElapsed());
    else { run.stepStart = Date.now() - (st.seconds - run.pausedLeft) * 1000; run.pausedLeft = null; }
    rerender();
  } }, icon(run.pausedLeft === null ? 'pause' : 'play', { size: 18 }), run.pausedLeft === null ? ' Pause' : ' Weiter zählen') : null;

  const tick = () => {
    const el = stepElapsed();
    remain.textContent = `noch ca. ${R.fmtClock(R.remainingSeconds(run.steps, run.index, el))}`;
    if (ring) {
      const left = Math.max(0, st.seconds - el);
      const pct = Math.min(100, (el / st.seconds) * 100);
      ring.style.setProperty('--p', `${pct}%`);
      ring.classList.toggle('done', left <= 0);
      ringText.textContent = left <= 0 ? 'Fertig' : R.fmtClock(Math.ceil(left));
    }
  };
  tick();
  const root = h('section', { class: 'runner' },
    h('div', { class: 'run-top' },
      h('button', { class: 'btn subtle small', type: 'button', onclick: () => { if (run.index === 0 || confirm('Routine beenden?')) endRun(false); } }, 'Beenden'),
      h('span', { class: 'muted small' }, `${PHASES[run.routine.phase]} · ${run.routine.name}`)),
    h('div', { class: 'bar' }, h('div', { class: 'bar-in', style: `width:${progress}%` })),
    h('div', { class: 'run-meta muted small' }, h('span', {}, `Übung ${st.itemIndex + 1} von ${itemCount}`), remain),
    h('div', { class: 'card run-card' },
      h('div', { class: 'run-fig' }, miniFigure({ muscles: item.muscles }, sex(), 64)),
      h('h2', {}, item.name),
      h('p', { class: 'muted' }, item.cue),
      st.label ? h('p', { class: 'run-label' }, st.label) : null,
      ring,
      pauseBtn,
      st.seconds !== null ? h('p', { class: 'muted small' }, 'Kein Ton – nur Anzeige.') : null),
    h('div', { class: 'btn-row run-nav' },
      h('button', { class: 'btn', type: 'button', disabled: run.index === 0, onclick: () => go(-1, rerender) }, 'Zurück'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => go(1, rerender) }, run.index === run.steps.length - 1 ? 'Fertig' : 'Weiter')),
    nextItems.length ? h('div', {}, h('div', { class: 'sec' }, 'Als Nächstes'),
      h('div', { class: 'card list' }, nextItems.map((x) => h('div', { class: 'row' }, h('span', { class: 't' }, h('b', {}, x.item.name)), h('small', {}, R.doseText(x.item.dose)))))) : null);

  const timer = setInterval(() => {
    if (!document.body.contains(root) || !run) { clearInterval(timer); return; }
    tick();
  }, 250);
  return root;
}

// Für die Zusammenfassung nach dem Training: optionales Cool-down anbieten (ohne Druck).
export function cooldownOffer(session, closeSummary) {
  const plan = session.planId ? store.get('plans').find((p) => p.id === session.planId) : null;
  const preset = plan ? R.planRoutine(plan, 'cooldown') : null;
  const begin = (routine) => { closeSummary(); startRun(routine, { sessionId: session.id, returnTo: '#/' }); };
  return h('div', { class: 'cooldown-offer' },
    h('div', { class: 'sec' }, 'Cool-down (optional)'),
    preset ? h('button', { class: 'btn block', type: 'button', onclick: () => begin(preset) }, `${preset.name} · ${minutes(preset)}`) : null,
    h('button', { class: `btn block${preset ? ' subtle' : ''}`, type: 'button', onclick: () => openRoutineChooser('cooldown', preset?.id || null, (id) => { const r = R.getRoutine(id); if (r) begin(r); }, { allowNone: false }) },
      preset ? 'Andere Routine wählen' : 'Cool-down wählen'));
}

