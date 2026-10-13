// Gemeinsame Satz-Bedienung (v1.2, Variante A + C) für laufendes Training und Tagebuch-Editor.
// A: Tipp auf die Satznummer öffnet ein Sheet mit Typ, Markierungen und Entfernen.
// C: Unter dem zuletzt abgehakten Arbeitssatz stehen Schnellknöpfe „+ Drop“ / „+ Rest-Pause“.
// Die Daten-Aktionen kommen als Callbacks herein, damit dieselbe Oberfläche sofort speichern (Training)
// oder einen Entwurf ändern kann (Tagebuch, gespeichert erst mit „Fertig“).
import { h } from './util.js';
import { SET_TAGS } from './model.js';
import * as SETS from './sets.js';
import { parseWeight, parseReps, fmtNum } from './input.js';
import { SET_INFO, SET_INFO_CHECKED_AT } from './set-info.js';
import { openSheet } from './sheet.js';
import { toast } from './ui.js';
import { icon } from './icons.js';

const TYPES = ['warmup', 'work', 'drop', 'restpause'];

export function openSetInfo() {
  openSheet(h('div', { class: 'info' },
    h('ul', {}, SET_INFO.what.map((t) => h('li', {}, t))),
    h('h3', {}, 'So zählt die App'),
    h('ul', {}, SET_INFO.counting.map((t) => h('li', {}, t))),
    h('p', { class: 'muted small' }, SET_INFO.evidence),
    h('h3', {}, 'Quellen'),
    h('ul', { class: 'sources' }, SET_INFO.sources.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label), h('span', { class: 'muted' }, ` – ${s.note}`)))),
    h('p', { class: 'muted small' }, `Geprüft am ${new Date(SET_INFO_CHECKED_AT).toLocaleDateString('de-DE')}.`)
  ), { title: 'Drop- und Rest-Pause-Sätze' });
}

// Sheet für einen Satz. act = { setType(type), toggleTag(tag), remove() }; jede Aktion gibt true/false zurück.
// get() liefert den aktuellen Satz (nach jeder Änderung neu gelesen), after() rendert die Seite neu.
export function openSetSheet({ title, get, act, after }) {
  const body = h('div', { class: 'set-sheet' });
  let sheet = null;
  const run = (fn) => () => { if (fn() === false) { toast('Aktion nicht möglich.', { error: true }); return; } after(); draw(); };
  function draw() {
    const set = get();
    if (!set) { sheet?.close(); return; }
    const custom = set.tags.filter((t) => t.startsWith(SETS.CUSTOM_PREFIX));
    body.replaceChildren(...[
      h('div', { class: 'sec' }, 'Satztyp'),
      h('div', { class: 'seg type-seg', role: 'radiogroup', 'aria-label': 'Satztyp' }, TYPES.map((t) =>
        h('button', { type: 'button', role: 'radio', class: set.type === t ? 'on' : '', 'aria-checked': String(set.type === t),
          onclick: run(() => {
            if (set.type === t) return true;
            if (SETS.hasStages(set.type) && !SETS.hasStages(t) && set.drops.length && !confirm('Die Stufen dieses Satzes werden entfernt. Fortfahren?')) return true;
            return act.setType(t);
          }) }, SETS.TYPE_LABELS[t]))),
      SETS.hasStages(set.type) ? h('button', { class: 'link small info-link', type: 'button', onclick: openSetInfo }, icon('info', { size: 14, cls: 'inline' }), ' Wie zählen Drop und Rest-Pause?') : null,
      h('div', { class: 'sec' }, 'Markierungen'),
      h('div', { class: 'chips wrap' },
        Object.entries(SET_TAGS).map(([k, label]) => h('button', { type: 'button', class: `chip small${set.tags.includes(k) ? ' on' : ''}`, 'aria-pressed': String(set.tags.includes(k)), onclick: run(() => act.toggleTag(k)) }, label)),
        custom.map((t) => h('button', { type: 'button', class: 'chip small on', 'aria-label': `Eigene Markierung ${SETS.tagLabel(t, SET_TAGS)} entfernen`, onclick: run(() => act.toggleTag(t)) }, SETS.tagLabel(t, SET_TAGS), ' ', icon('close', { size: 12, cls: 'inline' }))),
        h('button', { type: 'button', class: 'chip small', onclick: run(() => {
          const tag = SETS.customTag(prompt('Eigene Markierung (z. B. „Pause oben“)', ''));
          if (!tag) return true;
          if (set.tags.includes(tag)) return true;
          return act.toggleTag(tag);
        }) }, icon('plus', { size: 12, cls: 'inline' }), ' Eigene')),
      h('button', { class: 'opt', type: 'button', onclick: () => { if (act.remove() === false) { toast('Satz nicht gefunden.', { error: true }); return; } sheet.close(); after(); } },
        h('span', { class: 'ic danger-text' }, icon('trash', { size: 22 })), h('span', {}, h('b', {}, 'Satz entfernen')))
    ].filter(Boolean)); // replaceChildren würde null als Text "null" einfügen
  }
  draw();
  sheet = openSheet(body, { title });
  return sheet;
}

// Folge-Stufen unter einem Satz: Zeilen mit Gewicht/Wdh. und Entfernen, darunter „+ Stufe“ / „+ Mini-Satz“.
// act = { update(index, values), remove(index), add() }; invalid(key, bad) meldet ungültige Eingaben (Tagebuch).
export function stageRows(set, { act, after, invalid = null, keyPrefix = '' }) {
  if (!SETS.hasStages(set.type)) return [];
  const word = SETS.STAGE_LABEL[set.type];
  const rows = set.drops.map((d, i) => {
    const prevW = i === 0 ? set.weightKg : set.drops[i - 1].weightKg;
    const w = h('input', { class: 'val', type: 'text', inputmode: 'decimal', value: fmtNum(d.weightKg), placeholder: prevW === null || prevW === undefined ? '–' : fmtNum(prevW), 'aria-label': `${word} ${i + 1} Gewicht in kg` });
    const r = h('input', { class: 'val', type: 'text', inputmode: 'numeric', value: fmtNum(d.reps), placeholder: '–', 'aria-label': `${word} ${i + 1} Wiederholungen` });
    const commit = () => {
      const weightKg = parseWeight(w.value);
      const reps = parseReps(r.value);
      const bad = Number.isNaN(weightKg) || Number.isNaN(reps);
      w.classList.toggle('bad', Number.isNaN(weightKg));
      r.classList.toggle('bad', Number.isNaN(reps));
      if (invalid) invalid(`${keyPrefix}${i}`, bad);
      if (bad) { if (!invalid) toast('Bitte gültige Zahlen eingeben (Gewicht z. B. 82,5).', { error: true }); return; }
      act.update(i, { weightKg, reps });
    };
    w.addEventListener(invalid ? 'input' : 'change', commit);
    r.addEventListener(invalid ? 'input' : 'change', commit);
    return h('div', { class: 'setrow stage' },
      h('span', { class: 'sn stage-sn', 'aria-hidden': 'true' }),
      w, r,
      h('button', { class: 'ck rm', type: 'button', 'aria-label': `${word} ${i + 1} entfernen`, onclick: () => { if (invalid) invalid(`${keyPrefix}${i}`, false); act.remove(i); after(); } }, icon('close', { size: 16 })));
  });
  rows.push(h('button', { class: 'addline stage-add', type: 'button', onclick: () => { act.add(); after(); } }, icon('plus', { size: 16 }), ` ${word}`));
  return rows;
}

// Markierungen als kleine Chips hinter der Satzzeile (nur Anzeige).
export function tagChips(set) {
  if (!set.tags?.length) return null;
  return h('div', { class: 'tagline' }, set.tags.map((t) => h('span', { class: 'tagchip' }, SETS.tagLabel(t, SET_TAGS))));
}

// Schnellknöpfe (Variante C) unter dem zuletzt abgehakten Arbeitssatz.
export function quickButtons(set, { onQuick }) {
  const btn = (type, label) => h('button', { class: 'qbtn', type: 'button', onclick: () => onQuick(type) }, icon('plus', { size: 14 }), ` ${label}`);
  if (set.type !== 'work') return null; // Drop/Rest-Pause haben ihre eigene „+ Stufe“-Zeile
  return h('div', { class: 'quick' }, btn('drop', 'Drop'), btn('restpause', 'Rest-Pause'));
}

// Index des zuletzt abgehakten Nicht-Aufwärmsatzes (nach Abhak-Zeitpunkt), sonst -1.
export function lastCompletedIndex(sets) {
  let best = -1;
  sets.forEach((x, i) => {
    if (x.completedAt === null || x.type === 'warmup') return;
    if (best < 0 || Date.parse(x.completedAt) >= Date.parse(sets[best].completedAt)) best = i;
  });
  return best;
}
