// Übungen-Tab (Variante A + Pool aus B): Liste nach Körperregion, Suche, Filter,
// Plus-Button mit Auswahl Startpool/Eigene Übung, Editor, Info-Sheets zu Muskelgruppen und Quellen.
import { h } from './util.js';
import { MUSCLES, EXERCISE_KINDS, createExercise } from './model.js';
import { POOL, EQUIPMENT, CONFIDENCE, POOL_CHECKED_AT, poolEntry, poolRefsInLibrary } from './pool.js';
import { MUSCLE_INFO, MUSCLE_INFO_CHECKED_AT } from './muscle-info.js';
import * as lib from './exercises.js';
import { openSheet } from './sheet.js';
import { toast } from './ui.js';
import { icon } from './icons.js';
import { groupField } from './group-view.js';
import { miniFigure } from './figure.js';
import { stepper } from './controls.js';
import { effectiveRest, stepRest, formatDuration } from './rest.js';
import * as store from './store.js';
import { progressPanel, hasHistory } from './progress-view.js';

const KIND_LABEL = { strength: 'Kraft', bodyweight: 'Körpergewicht', cardio: 'Cardio' };
const VERIF_LABEL = {
  verified: 'geprüft',
  'training-knowledge': 'Trainingswissen, nicht geprüft',
  user: 'eigene Angabe, nicht geprüft'
};
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE') : '');

// Zustand der Liste bleibt beim Neu-Rendern erhalten (nur im Speicher).
const state = { query: '', region: null, showArchived: false };

function infoButton(label, onClick) {
  return h('button', { class: 'info-btn', type: 'button', 'aria-label': label, onclick: (e) => { e.stopPropagation(); onClick(); } }, icon('info', { size: 18 }));
}

function regionChips(active, onPick) {
  return h('div', { class: 'chips', role: 'toolbar', 'aria-label': 'Nach Körperregion filtern' },
    h('button', { class: `chip${active ? '' : ' on'}`, type: 'button', 'aria-pressed': String(!active), onclick: () => onPick(null) }, 'Alle'),
    lib.REGIONS.map((r) => h('button', { class: `chip${active === r.key ? ' on' : ''}`, type: 'button', 'aria-pressed': String(active === r.key), onclick: () => onPick(active === r.key ? null : r.key) }, r.label))
  );
}

function searchField(value, placeholder, onInput) {
  const input = h('input', { type: 'search', class: 'search-input', placeholder, value, 'aria-label': placeholder, autocomplete: 'off', enterkeyhint: 'search' });
  input.addEventListener('input', () => onInput(input.value));
  return h('label', { class: 'search' }, icon('search', { size: 18 }), input);
}

// ---------- Info: Muskelgruppen ----------

function sourceList(sources) {
  return h('ul', { class: 'sources' }, sources.map((s) =>
    h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label), s.note ? h('span', { class: 'muted' }, ` – ${s.note}`) : null)));
}

export function openMuscleInfo(key) {
  const info = MUSCLE_INFO[key];
  if (!info) return;
  openSheet(h('div', { class: 'info' },
    h('p', {}, h('b', {}, 'Muskeln: '), info.includes),
    h('p', {}, h('b', {}, 'Lage: '), info.location),
    h('h3', {}, 'Funktion'),
    h('ul', {}, info.functions.map((f) => h('li', {}, f))),
    h('h3', {}, 'Quellen'),
    sourceList(info.sources),
    h('p', { class: 'muted small' }, `Geprüft am ${fmtDate(MUSCLE_INFO_CHECKED_AT)}. Eigene Zusammenfassung, kein medizinischer Rat.`)
  ), { title: MUSCLES[key] });
}

export function openMuscleOverview() {
  const body = h('div', {}, h('p', { class: 'muted small' }, 'Tippe auf eine Gruppe für Lage, Funktion und Quellen.'),
    lib.REGIONS.map((r) => h('div', {},
      h('div', { class: 'sec' }, r.label),
      h('div', { class: 'card list' }, r.muscles.map((m) =>
        h('button', { class: 'row', type: 'button', onclick: () => openMuscleInfo(m) },
          h('span', { class: 't' }, h('b', {}, MUSCLES[m]), h('small', {}, MUSCLE_INFO[m]?.includes || '')),
          h('span', { class: 'chev info-mark' }, icon('info', { size: 18 })))))
    )));
  openSheet(body, { title: 'Muskelgruppen', full: true });
}

// ---------- Info: Evidenz einer Pool-Übung ----------

export function openEvidence(ref) {
  const p = poolEntry(ref);
  if (!p) return;
  const muscleLinks = (keys) => (keys.length
    ? h('span', { class: 'wrap' }, keys.map((m) => h('button', { class: 'chip small', type: 'button', onclick: () => openMuscleInfo(m) }, MUSCLES[m], icon('info', { size: 14, cls: 'inline' }))))
    : h('span', { class: 'muted' }, '–'));
  openSheet(h('div', { class: 'info' },
    h('p', {}, h('b', {}, 'Primär: '), muscleLinks(p.muscles.primary)),
    h('p', {}, h('b', {}, 'Sekundär: '), muscleLinks(p.muscles.secondary)),
    p.others.length ? h('p', {}, h('b', {}, 'Außerdem beteiligt: '), p.others.join('; ')) : null,
    h('p', {}, h('b', {}, 'Belastbarkeit: '), h('span', { class: `conf ${p.confidence}` }, CONFIDENCE[p.confidence]), ` · ${p.basis}`),
    p.note ? h('p', {}, p.note) : null,
    h('h3', {}, 'Quellen'),
    sourceList(p.sources),
    h('p', { class: 'muted small' }, `Geprüft am ${fmtDate(POOL_CHECKED_AT)}. Muskelaktivität im EMG sagt nicht direkt etwas über Muskelwachstum aus; Technik und Variante verändern die Verteilung.`)
  ), { title: p.name });
}

// ---------- Startpool ----------

function openPool(rerender) {
  const local = { query: '', region: null, muscle: null, equip: null };
  const listBox = h('div');
  const draw = () => {
    const inLib = poolRefsInLibrary(lib.listExercises());
    const items = POOL
      .filter((p) => lib.matchesQuery({ name: p.name, note: '' }, local.query) && lib.inRegion(p, local.region)
        && (!local.muscle || p.muscles.primary.includes(local.muscle)) && (!local.equip || p.equipment === local.equip))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    countLine.textContent = items.length === POOL.length ? `${POOL.length} Übungen` : `${items.length} von ${POOL.length} Übungen`;
    listBox.replaceChildren(items.length
      ? h('div', { class: 'card list' }, items.map((p) => {
        const added = inLib.has(p.ref);
        return h('div', { class: 'row', 'data-ref': p.ref },
          h('span', { class: 'fig-ic' }, miniFigure(p, store.get('settings').figure)),
          h('button', { class: 't plain', type: 'button', onclick: () => openEvidence(p.ref), 'aria-label': `${p.name}: Muskeln und Quellen` },
            h('b', {}, p.name, h('span', { class: 'eq' }, EQUIPMENT[p.equipment])),
            h('small', {}, lib.muscleSummary(p))),
          added
            ? h('span', { class: 'added' }, icon('check', { size: 16 }), 'drin')
            : h('button', { class: 'add', type: 'button', 'aria-label': `${p.name} hinzufügen`, onclick: () => {
              const r = lib.addFromPool(p.ref);
              if (r.ok) { toast(`${p.name} ${r.restored ? 'wiederhergestellt' : 'hinzugefügt'}.`); draw(); rerender(); }
              else toast(r.errors[0], { error: true });
            } }, icon('plus', { size: 22 })));
      }))
      : h('p', { class: 'muted empty-line' }, 'Keine Übung gefunden.'));
  };
  // v1.5: bei vielen Übungen zusätzlich Muskel (innerhalb der Region) und Gerät filtern.
  const countLine = h('p', { class: 'muted small pool-count' });
  const body = h('div', {},
    h('p', { class: 'muted small' }, 'Tippe auf eine Übung für Muskeln und Quellen, auf „+“ zum Übernehmen.'),
    searchField('', 'Im Pool suchen', (v) => { local.query = v; draw(); }),
    h('div', { class: 'chips-wrap' }),
    countLine,
    listBox);
  const chipsWrap = body.querySelector('.chips-wrap');
  const chip = (on, label, onclick) => h('button', { class: `chip small${on ? ' on' : ''}`, type: 'button', 'aria-pressed': String(on), onclick }, label);
  const drawChips = () => {
    const region = lib.REGIONS.find((r) => r.key === local.region);
    chipsWrap.replaceChildren(...[
      regionChips(local.region, (r) => { local.region = r; local.muscle = null; drawChips(); draw(); }),
      region && region.muscles.length > 1 ? h('div', { class: 'chips', role: 'toolbar', 'aria-label': 'Nach Muskel filtern' },
        region.muscles.map((m) => chip(local.muscle === m, MUSCLES[m], () => { local.muscle = local.muscle === m ? null : m; drawChips(); draw(); }))) : null,
      h('div', { class: 'chips', role: 'toolbar', 'aria-label': 'Nach Gerät filtern' },
        Object.entries(EQUIPMENT).map(([k, label]) => chip(local.equip === k, label, () => { local.equip = local.equip === k ? null : k; drawChips(); draw(); })))
    ].filter(Boolean));
  };
  drawChips();
  draw();
  openSheet(body, { title: 'Startpool', full: true });
}

// ---------- Editor ----------

function musclePicker(title, selected, blocked, onDone) {
  const sel = new Set(selected);
  const body = h('div');
  const draw = () => body.replaceChildren(
    h('p', { class: 'muted small' }, 'Antippen zum Auswählen. ', icon('info', { size: 14, cls: 'inline' }), ' zeigt Infos zur Gruppe.'),
    ...lib.REGIONS.map((r) => h('div', {},
      h('div', { class: 'sec' }, r.label),
      h('div', { class: 'wrap' }, r.muscles.map((m) => {
        const isBlocked = blocked.includes(m);
        return h('span', { class: 'chip-pair' },
          h('button', { class: `chip${sel.has(m) ? ' on' : ''}`, type: 'button', disabled: isBlocked, 'aria-pressed': String(sel.has(m)), title: isBlocked ? 'Schon in der anderen Liste' : '', onclick: () => { sel.has(m) ? sel.delete(m) : sel.add(m); draw(); } }, MUSCLES[m]),
          infoButton(`Info ${MUSCLES[m]}`, () => openMuscleInfo(m)));
      })))),
    h('button', { class: 'btn primary block sticky-bottom', type: 'button', onclick: () => { sheet.close(); onDone([...sel]); } }, 'Übernehmen'));
  draw();
  const sheet = openSheet(body, { title, full: true });
}

export function openEditor(existing, rerender) {
  const isNew = !existing;
  const ex = existing ? structuredClone(existing) : createExercise();
  const pool = ex.source?.origin === 'builtin' ? poolEntry(ex.source.ref) : null;

  const nameInput = h('input', { class: 'input', type: 'text', value: ex.name, placeholder: 'z. B. High Row', 'aria-label': 'Name', maxlength: '80', autocapitalize: 'sentences' });
  const noteInput = h('textarea', { class: 'area', rows: '3', placeholder: 'Variante, Geräteeinstellung, Ausführung – z. B. Plate Loaded (Hammer), Sitz 4, Griff eng', 'aria-label': 'Notiz' });
  noteInput.value = ex.note;
  nameInput.addEventListener('input', () => { ex.name = nameInput.value; });
  noteInput.addEventListener('input', () => { ex.note = noteInput.value; });

  const kindBox = h('div');
  const drawKind = () => kindBox.replaceChildren(h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Typ' },
    EXERCISE_KINDS.map((k) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(ex.kind === k), class: ex.kind === k ? 'on' : '', onclick: () => { ex.kind = k; drawKind(); } }, KIND_LABEL[k]))));

  const musclesBox = h('div');
  const drawMuscles = () => {
    const chipRow = (keys, which) => h('div', { class: 'wrap' },
      keys.map((m) => h('span', { class: 'chip-pair' }, h('span', { class: 'chip on static' }, MUSCLES[m]), infoButton(`Info ${MUSCLES[m]}`, () => openMuscleInfo(m)))),
      h('button', { class: 'chip', type: 'button', onclick: () => musclePicker(which === 'primary' ? 'Primäre Muskeln' : 'Sekundäre Muskeln', ex.muscles[which], ex.muscles[which === 'primary' ? 'secondary' : 'primary'], (list) => { ex.muscles[which] = list; drawMuscles(); drawSource(); }) }, keys.length ? 'Ändern' : '+ Muskel'));
    musclesBox.replaceChildren(
      h('div', { class: 'field' }, h('div', { class: 'label-row' }, h('label', {}, 'Primär'), infoButton('Alle Muskelgruppen', openMuscleOverview)), chipRow(ex.muscles.primary, 'primary')),
      h('div', { class: 'field' }, h('label', {}, 'Sekundär'), chipRow(ex.muscles.secondary, 'secondary')));
  };

  const setsValue = h('div', { class: 'step-val', 'aria-live': 'polite' }, String(ex.defaultWorkSets));
  const step = (d) => { ex.defaultWorkSets = Math.min(10, Math.max(1, ex.defaultWorkSets + d)); setsValue.textContent = String(ex.defaultWorkSets); };

  const sourceBox = h('div', { class: 'src' });
  const drawSource = () => {
    if (!pool) { sourceBox.replaceChildren('Quelle: eigene Übung'); return; }
    const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    const changed = !(same(ex.muscles.primary, pool.muscles.primary) && same(ex.muscles.secondary, pool.muscles.secondary));
    sourceBox.replaceChildren('Quelle: Startpool · ',
      changed ? h('span', { class: 'warn' }, 'Muskeln geändert – eigene Angabe') : h('span', {}, `${VERIF_LABEL.verified} am ${fmtDate(POOL_CHECKED_AT)}, Belastbarkeit ${CONFIDENCE[pool.confidence]}`),
      ' ', h('button', { class: 'link', type: 'button', onclick: () => openEvidence(pool.ref) }, icon('info', { size: 14, cls: 'inline' }), ' Quellen'));
  };

  const save = () => {
    const r = lib.saveExercise(ex);
    if (!r.ok) { toast(r.errors[0], { error: true }); return; }
    sheet.close();
    toast(isNew ? 'Übung angelegt.' : 'Gespeichert.');
    rerender();
  };
  const archive = () => {
    const r = lib.setArchived(ex.id, !ex.archived);
    if (!r.ok) { toast(r.errors[0], { error: true }); return; }
    sheet.close();
    toast(ex.archived ? 'Übung wiederhergestellt.' : 'Übung archiviert. Alte Trainings bleiben erhalten.');
    rerender();
  };

  // Pausenzeit: eigener Wert oder Standard aus den Einstellungen (Timer ohne Ton, ab v0.5 im Training).
  const restBox = h('div');
  const drawRest = () => {
    const settings = store.get('settings');
    const own = Number.isInteger(ex.restSeconds);
    restBox.replaceChildren(h('div', { class: 'rest-row' },
      stepper({ value: effectiveRest(ex, settings), format: formatDuration, label: 'Pause', onStep: (v, d) => { ex.restSeconds = stepRest(v, d); if (!own) drawRest(); return ex.restSeconds; } }),
      own
        ? h('button', { class: 'link', type: 'button', onclick: () => { ex.restSeconds = null; drawRest(); } }, `Standard (${formatDuration(settings.restSeconds)})`)
        : h('span', { class: 'muted small' }, 'Standard aus den Einstellungen')));
  };
  drawRest();

  drawKind(); drawMuscles(); drawSource();
  const body = h('form', { class: 'editor', onsubmit: (e) => { e.preventDefault(); save(); } },
    h('div', { class: 'field' }, h('label', {}, 'Name'), nameInput),
    h('div', { class: 'field' }, h('label', {}, 'Typ'), kindBox),
    musclesBox,
    groupField(ex),
    h('div', { class: 'field' }, h('label', {}, 'Arbeitssätze (Standard)'),
      h('div', { class: 'step' },
        h('button', { type: 'button', 'aria-label': 'Weniger Sätze', onclick: () => step(-1) }, icon('minus')), setsValue,
        h('button', { type: 'button', 'aria-label': 'Mehr Sätze', onclick: () => step(1) }, icon('plus')))),
    h('div', { class: 'field' }, h('label', {}, 'Pause zwischen Sätzen'), restBox),
    h('div', { class: 'field' }, h('label', {}, 'Notiz'), noteInput, sourceBox),
    !isNew ? h('button', { class: 'btn block subtle', type: 'button', onclick: archive }, ex.archived ? 'Wiederherstellen' : 'Archivieren') : null,
    h('button', { class: 'btn primary block sticky-bottom', type: 'submit' }, ex.archived ? 'Speichern (archiviert)' : 'Speichern'));
  // Variante B: Verlauf direkt in der Übung (nur wenn es abgeschlossene Trainings gibt).
  let content = body;
  if (!isNew && hasHistory(ex.id)) {
    const panel = h('div', { hidden: true });
    const segBox = h('div', { class: 'seg ex-seg', role: 'tablist', 'aria-label': 'Ansicht' });
    const show = (which) => {
      body.hidden = which !== 'details';
      panel.hidden = which !== 'history';
      if (which === 'history') panel.replaceChildren(progressPanel(lib.getExercise(ex.id) || ex));
      segBox.replaceChildren(...[['details', 'Details'], ['history', 'Verlauf']].map(([k, label]) =>
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === which), class: k === which ? 'on' : '', onclick: () => show(k) }, label)));
    };
    show('details');
    content = h('div', {}, segBox, body, panel);
  }
  const sheet = openSheet(content, { title: isNew ? 'Neue Übung' : ex.name || 'Übung', full: true });
  if (isNew) setTimeout(() => nameInput.focus(), 250);
}

// ---------- Liste ----------

function openAddChoice(rerender) {
  const sheet = openSheet(h('div', {},
    h('button', { class: 'opt', type: 'button', onclick: () => { sheet.close(); openPool(rerender); } },
      h('span', { class: 'ic' }, icon('list', { size: 22 })), h('span', {}, h('b', {}, 'Aus Startpool'), h('small', {}, `${POOL.length} recherchierte Grundübungen`))),
    h('button', { class: 'opt', type: 'button', onclick: () => { sheet.close(); openEditor(null, rerender); } },
      h('span', { class: 'ic' }, icon('edit', { size: 22 })), h('span', {}, h('b', {}, 'Eigene Übung'), h('small', {}, 'Name, Muskelgruppen, Sätze, Notiz')))
  ), { title: 'Übung hinzufügen' });
}

function exerciseRow(ex, rerender) {
  return h('button', { class: 'row', type: 'button', onclick: () => openEditor(ex, rerender) },
    h('span', { class: 'fig-ic' }, miniFigure(ex, store.get('settings').figure)), // v1.4 Piktogramm (Entscheidung 7 B)
    h('span', { class: 't' },
      h('b', {}, ex.name),
      h('small', {}, ex.kind === 'cardio' && !ex.muscles.primary.length ? 'Cardio' : lib.muscleSummary(ex)),
      ex.note ? h('i', {}, icon('edit', { size: 13, cls: 'inline' }), ` ${ex.note}`) : null),
    h('span', { class: 'chev' }, icon('chevron', { size: 18 })));
}

export function exercisesView(rerender) {
  const all = lib.listExercises({ includeArchived: true });
  const active = all.filter((e) => !e.archived);
  const archived = all.filter((e) => e.archived);
  const listBox = h('div');

  const drawList = () => {
    const sections = lib.groupedExercises(active, { query: state.query, region: state.region });
    if (!active.length) {
      listBox.replaceChildren(h('div', { class: 'card empty' },
        h('div', { class: 'big' }, icon('train', { size: 44 })), h('h2', {}, 'Noch keine Übungen'),
        h('p', { class: 'muted' }, 'Übernimm Grundübungen aus dem Startpool oder lege eigene an.'),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => openPool(rerender) }, 'Startpool'),
          h('button', { class: 'btn', type: 'button', onclick: () => openEditor(null, rerender) }, 'Eigene Übung'))));
      return;
    }
    listBox.replaceChildren(
      ...(sections.length ? sections.map((s) => h('section', {}, h('div', { class: 'sec' }, s.label), h('div', { class: 'card list' }, s.items.map((e) => exerciseRow(e, rerender)))))
        : [h('p', { class: 'muted empty-line' }, 'Keine Übung passt zur Suche.')]),
      archived.length ? h('div', {},
        h('button', { class: 'link archived-toggle', type: 'button', onclick: () => { state.showArchived = !state.showArchived; drawList(); } },
          icon('chevron', { size: 16, cls: state.showArchived ? 'rot90' : '' }), ` Archiviert (${archived.length})`),
        state.showArchived ? h('div', { class: 'card list dim-list' }, archived.sort((a, b) => a.name.localeCompare(b.name, 'de')).map((e) => exerciseRow(e, rerender))) : null) : '');
  };

  const chipsBox = h('div', { class: 'chips-line' });
  const drawChips = () => chipsBox.replaceChildren(
    regionChips(state.region, (r) => { state.region = r; drawChips(); drawList(); }),
    infoButton('Infos zu den Muskelgruppen', openMuscleOverview));

  drawChips();
  drawList();
  return h('section', { class: 'exercises' },
    h('h1', {}, 'Übungen'),
    active.length ? searchField(state.query, 'Übung suchen', (v) => { state.query = v; drawList(); }) : null,
    active.length ? chipsBox : null,
    listBox,
    h('button', { class: 'fab', type: 'button', 'aria-label': 'Übung hinzufügen', onclick: () => openAddChoice(rerender) }, icon('plus', { size: 30 })));
}
