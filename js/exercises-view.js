// Übungen-Tab (Variante A + Pool aus B): Liste nach Körperregion, Suche, Filter,
// „+“ mit Auswahl Startpool/Eigene Übung, Editor, ℹ-Infos zu Muskelgruppen und Quellen.
import { h } from './util.js';
import { MUSCLES, EXERCISE_KINDS, createExercise } from './model.js';
import { POOL, EQUIPMENT, CONFIDENCE, POOL_CHECKED_AT, poolEntry, poolRefsInLibrary } from './pool.js';
import { MUSCLE_INFO, MUSCLE_INFO_CHECKED_AT } from './muscle-info.js';
import * as lib from './exercises.js';
import { openSheet } from './sheet.js';
import { toast } from './ui.js';

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
  return h('button', { class: 'info-btn', type: 'button', 'aria-label': label, onclick: (e) => { e.stopPropagation(); onClick(); } }, 'ℹ');
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
  return h('label', { class: 'search' }, h('span', { 'aria-hidden': 'true' }, '⌕'), input);
}

// ---------- ℹ: Muskelgruppen ----------

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
          h('span', { class: 'chev', 'aria-hidden': 'true' }, 'ℹ'))))
    )));
  openSheet(body, { title: 'Muskelgruppen', full: true });
}

// ---------- ℹ: Evidenz einer Pool-Übung ----------

export function openEvidence(ref) {
  const p = poolEntry(ref);
  if (!p) return;
  const muscleLinks = (keys) => (keys.length
    ? h('span', { class: 'wrap' }, keys.map((m) => h('button', { class: 'chip small', type: 'button', onclick: () => openMuscleInfo(m) }, `${MUSCLES[m]} ℹ`)))
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
  const local = { query: '', region: null };
  const listBox = h('div');
  const draw = () => {
    const inLib = poolRefsInLibrary(lib.listExercises());
    const items = POOL
      .filter((p) => lib.matchesQuery({ name: p.name, note: '' }, local.query) && lib.inRegion(p, local.region))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    listBox.replaceChildren(items.length
      ? h('div', { class: 'card list' }, items.map((p) => {
        const added = inLib.has(p.ref);
        return h('div', { class: 'row', 'data-ref': p.ref },
          h('button', { class: 't plain', type: 'button', onclick: () => openEvidence(p.ref), 'aria-label': `${p.name}: Muskeln und Quellen` },
            h('b', {}, p.name, h('span', { class: 'eq' }, EQUIPMENT[p.equipment])),
            h('small', {}, lib.muscleSummary(p))),
          added
            ? h('span', { class: 'added' }, '✓ drin')
            : h('button', { class: 'add', type: 'button', 'aria-label': `${p.name} hinzufügen`, onclick: () => {
              const r = lib.addFromPool(p.ref);
              if (r.ok) { toast(`${p.name} ${r.restored ? 'wiederhergestellt' : 'hinzugefügt'}.`); draw(); rerender(); }
              else toast(r.errors[0], { error: true });
            } }, '+'));
      }))
      : h('p', { class: 'muted empty-line' }, 'Keine Übung gefunden.'));
  };
  const body = h('div', {},
    h('p', { class: 'muted small' }, `${POOL.length} Grundübungen. Tippe auf eine Übung für Muskeln und Quellen, auf „+“ zum Übernehmen.`),
    searchField('', 'Im Pool suchen', (v) => { local.query = v; draw(); }),
    h('div', { class: 'chips-wrap' }),
    listBox);
  const chipsWrap = body.querySelector('.chips-wrap');
  const drawChips = () => chipsWrap.replaceChildren(regionChips(local.region, (r) => { local.region = r; drawChips(); draw(); }));
  drawChips();
  draw();
  openSheet(body, { title: 'Startpool', full: true });
}

// ---------- Editor ----------

function musclePicker(title, selected, blocked, onDone) {
  const sel = new Set(selected);
  const body = h('div');
  const draw = () => body.replaceChildren(
    h('p', { class: 'muted small' }, 'Antippen zum Auswählen. ℹ zeigt Infos zur Gruppe.'),
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
      ' ', h('button', { class: 'link', type: 'button', onclick: () => openEvidence(pool.ref) }, 'ℹ Quellen'));
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

  drawKind(); drawMuscles(); drawSource();
  const body = h('form', { class: 'editor', onsubmit: (e) => { e.preventDefault(); save(); } },
    h('div', { class: 'field' }, h('label', {}, 'Name'), nameInput),
    h('div', { class: 'field' }, h('label', {}, 'Typ'), kindBox),
    musclesBox,
    h('div', { class: 'field' }, h('label', {}, 'Arbeitssätze (Standard)'),
      h('div', { class: 'step' },
        h('button', { type: 'button', 'aria-label': 'Weniger Sätze', onclick: () => step(-1) }, '−'), setsValue,
        h('button', { type: 'button', 'aria-label': 'Mehr Sätze', onclick: () => step(1) }, '+'))),
    h('div', { class: 'field' }, h('label', {}, 'Notiz'), noteInput, sourceBox),
    !isNew ? h('button', { class: 'btn block subtle', type: 'button', onclick: archive }, ex.archived ? 'Wiederherstellen' : 'Archivieren') : null,
    h('button', { class: 'btn primary block sticky-bottom', type: 'submit' }, ex.archived ? 'Speichern (archiviert)' : 'Speichern'));
  const sheet = openSheet(body, { title: isNew ? 'Neue Übung' : ex.name || 'Übung', full: true });
  if (isNew) setTimeout(() => nameInput.focus(), 250);
}

// ---------- Liste ----------

function openAddChoice(rerender) {
  const sheet = openSheet(h('div', {},
    h('button', { class: 'opt', type: 'button', onclick: () => { sheet.close(); openPool(rerender); } },
      h('span', { class: 'ic', 'aria-hidden': 'true' }, '☰'), h('span', {}, h('b', {}, 'Aus Startpool'), h('small', {}, `${POOL.length} recherchierte Grundübungen`))),
    h('button', { class: 'opt', type: 'button', onclick: () => { sheet.close(); openEditor(null, rerender); } },
      h('span', { class: 'ic', 'aria-hidden': 'true' }, '✎'), h('span', {}, h('b', {}, 'Eigene Übung'), h('small', {}, 'Name, Muskelgruppen, Sätze, Notiz')))
  ), { title: 'Übung hinzufügen' });
}

function exerciseRow(ex, rerender) {
  return h('button', { class: 'row', type: 'button', onclick: () => openEditor(ex, rerender) },
    h('span', { class: 't' },
      h('b', {}, ex.name),
      h('small', {}, ex.kind === 'cardio' && !ex.muscles.primary.length ? 'Cardio' : lib.muscleSummary(ex)),
      ex.note ? h('i', {}, `✎ ${ex.note}`) : null),
    h('span', { class: 'chev', 'aria-hidden': 'true' }, '›'));
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
        h('div', { class: 'big' }, '🏋️'), h('h2', {}, 'Noch keine Übungen'),
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
          `${state.showArchived ? '▾' : '▸'} Archiviert (${archived.length})`),
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
    h('button', { class: 'fab', type: 'button', 'aria-label': 'Übung hinzufügen', onclick: () => openAddChoice(rerender) }, '+'));
}
