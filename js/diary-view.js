// Trainings-Tagebuch (v1.1, Variante C): Umschalter „Übungen | Trainings“ im Fortschritt-Tab.
// Karten nach Monat, Detail als Sheet. Bearbeiten in einem eigenen Modus mit „Abbrechen | Fertig“:
// Änderungen landen erst beim Tipp auf „Fertig“ im Speicher – anders als im laufenden Training,
// damit ein versehentlicher Tipp beim Durchsehen nichts verändert.
import { h } from './util.js';
import * as store from './store.js';
import * as H from './history.js';
import { weightWarning, sessionSummary } from './model.js';
import { parseWeight, parseReps, fmtNum } from './input.js';
import { openSheet } from './sheet.js';
import { toast } from './ui.js';
import { icon } from './icons.js';
import * as SETS from './sets.js';
import { openSetSheet, stageRows, tagChips } from './set-view.js';

const fmtLong = (iso) => new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
const fmtFull = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtMonth = (iso) => new Date(iso).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
const fmtKgText = (n) => (n === null || n === undefined ? '–' : fmtNum(Math.round(n * 100) / 100));
const exercisesById = () => Object.fromEntries(store.get('exercises').map((e) => [e.id, e]));

export const typoText = (best) => `Mehr als doppelt so viel wie dein bisher schwerster Satz dieser Übung (${fmtKgText(best)} kg). Tippfehler?`;

function durText(min) {
  if (min === null) return '';
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
}

// ---------- Liste ----------

export function diaryList(rerender) {
  const rows = H.diaryRows();
  if (!rows.length) {
    return h('div', { class: 'card empty' }, h('div', { class: 'big' }, icon('list', { size: 44 })), h('h2', {}, 'Noch keine Trainings'),
      h('p', { class: 'muted' }, 'Abgeschlossene Trainings erscheinen hier. Du kannst sie ansehen und Tippfehler korrigieren.'));
  }
  const out = [h('p', { class: 'sub' }, 'Alle abgeschlossenen Trainings, neueste zuerst. Antippen zum Ansehen und Korrigieren.')];
  let month = null;
  for (const r of rows) {
    const m = fmtMonth(r.session.startedAt);
    if (m !== month) { month = m; out.push(h('div', { class: 'sec' }, m)); }
    const line = H.exerciseLine(r.exercises);
    out.push(h('button', { class: 'pcard diary-card', type: 'button', onclick: () => openDiaryEntry(r.session.id, rerender) },
      h('span', { class: 'pc-top' }, h('b', {}, r.name), h('span', { class: 'muted small' }, fmtLong(r.session.startedAt))),
      h('small', {}, `${durText(r.durationMin)} · ${r.hardSets} ${r.hardSets === 1 ? 'Arbeitssatz' : 'Arbeitssätze'}`),
      line ? h('span', { class: 'ex' }, line) : null));
  }
  return out;
}

// ---------- Detail und Bearbeiten ----------

const setLabel = SETS.setLabel;

// v1.3: Hinweis auf die geplante Übung nach einem Tausch.
const insteadOf = (en, byId) => (en.plannedExerciseId ? h('div', { class: 'badge-line' }, h('span', { class: 'badge-instead' }, `statt ${byId[en.plannedExerciseId]?.name || 'geplanter Übung'}`)) : null);

function readView(s) {
  const byId = exercisesById();
  const sum = sessionSummary(s, byId);
  return [
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', {}, durText(H.durationMin(s))), h('span', {}, 'Dauer')),
      h('div', { class: 'stat' }, h('b', {}, String(sum.hardSets)), h('span', {}, 'Arbeitssätze')),
      h('div', { class: 'stat' }, h('b', {}, Math.round(sum.volume).toLocaleString('de-DE')), h('span', {}, 'Volumen kg'))),
    s.entries.map((en) => {
      const ex = byId[en.exerciseId];
      let workNo = 0;
      return h('div', { class: 'card diary-ex' },
        h('h2', {}, ex?.name || 'Unbekannte Übung'),
        insteadOf(en, byId),
        h('div', { class: 'diary-sets' }, en.sets.map((x) => {
          const no = x.type === 'warmup' ? 0 : ++workNo;
          const val = x.weightKg !== null ? `${SETS.formatSet(x).replace(' × ', ' kg × ')}` : `${x.reps ?? '–'} Wdh.`;
          return h('div', { class: `dset${x.type === 'warmup' ? ' warm' : ''}` }, h('span', { class: 'sn' }, setLabel(x, no)), h('span', {}, val, tagChips(x)));
        })));
    })
  ];
}

export function openDiaryEntry(id, rerender) {
  const orig = H.getFinished(id);
  if (!orig) { toast('Training nicht gefunden.', { error: true }); return; }
  const state = { mode: 'view', draft: null, invalid: new Set() };
  const body = h('div', { class: 'diary-detail' });
  let sheet = null;

  const leaveEdit = () => { state.mode = 'view'; state.draft = null; state.invalid.clear(); draw(); };

  function editRow(entry, set, workNo, exId) {
    const key = set.id;
    const w = h('input', { class: 'val', type: 'text', inputmode: 'decimal', value: fmtNum(set.weightKg), placeholder: '–', 'aria-label': `Satz ${setLabel(set, workNo)} Gewicht in kg` });
    const r = h('input', { class: 'val', type: 'text', inputmode: 'numeric', value: fmtNum(set.reps), placeholder: '–', 'aria-label': `Satz ${setLabel(set, workNo)} Wiederholungen` });
    const hint = h('div', { class: 'hint typo', hidden: true }, h('span', { class: 'hint-ic' }, icon('info', { size: 18 })), h('span', {}));
    const check = () => {
      const weightKg = parseWeight(w.value);
      const reps = parseReps(r.value);
      w.classList.toggle('bad', Number.isNaN(weightKg));
      r.classList.toggle('bad', Number.isNaN(reps));
      if (Number.isNaN(weightKg) || Number.isNaN(reps)) state.invalid.add(key); else state.invalid.delete(key);
      if (!Number.isNaN(weightKg)) H.setValues(state.draft, entry.id, set.id, { weightKg });
      if (!Number.isNaN(reps)) H.setValues(state.draft, entry.id, set.id, { reps });
      const warn = Number.isNaN(weightKg) ? null : weightWarning(exId, weightKg, store.get('sessions'), { excludeSessionId: state.draft.id });
      w.classList.toggle('warnval', !!warn);
      hint.hidden = !warn;
      if (warn) hint.lastChild.textContent = typoText(warn.best);
    };
    w.addEventListener('input', check);
    r.addEventListener('input', check);
    queueMicrotask(check);
    const row = h('div', { class: `setrow edit${set.type === 'warmup' ? ' warm' : ''}` },
      h('button', { class: 'sn', type: 'button', 'aria-label': `Satz ${setLabel(set, workNo)}: Typ und Markierungen`,
        onclick: () => openSetSheet({
          title: set.type === 'warmup' ? 'Aufwärmsatz' : `Satz ${setLabel(set, workNo)}`,
          get: () => (state.draft ? H.draftSet(state.draft, entry.id, set.id) : null),
          after: draw,
          act: {
            setType: (t) => H.setType(state.draft, entry.id, set.id, t),
            toggleTag: (tag) => { const x = H.draftSet(state.draft, entry.id, set.id); if (!x) return false; SETS.toggleTag(x, tag); return true; },
            remove: () => { state.invalid.delete(key); return H.removeSet(state.draft, entry.id, set.id); }
          }
        }) }, setLabel(set, workNo)),
      w, r,
      h('button', { class: 'ck rm', type: 'button', 'aria-label': `Satz ${setLabel(set, workNo)} löschen`, onclick: () => {
        H.removeSet(state.draft, entry.id, set.id); state.invalid.delete(key); draw();
      } }, icon('close', { size: 18 })));
    const draftSet = () => H.draftSet(state.draft, entry.id, set.id);
    return [row, hint, tagChips(set), ...stageRows(set, {
      after: draw,
      keyPrefix: `${set.id}:`,
      invalid: (k, bad) => { if (bad) state.invalid.add(k); else state.invalid.delete(k); },
      act: {
        update: (i, v) => SETS.updateStage(draftSet(), i, v),
        remove: (i) => SETS.removeStage(draftSet(), i),
        add: () => SETS.addStage(draftSet())
      }
    })];
  }

  function editView() {
    const byId = exercisesById();
    const d = state.draft;
    return [
      h('div', { class: 'edit-bar' },
        h('button', { class: 'btn', type: 'button', onclick: () => {
          if (H.isDirty(d) && !confirm('Änderungen verwerfen?')) return;
          leaveEdit();
        } }, 'Abbrechen'),
        h('button', { class: 'btn primary', type: 'button', onclick: save }, 'Fertig')),
      h('p', { class: 'muted small' }, 'Tipp auf die Satznummer: Satztyp und Markierungen. Datum und Dauer sind nicht bearbeitbar.'),
      d.entries.map((en) => {
        const ex = byId[en.exerciseId];
        let workNo = 0;
        return h('div', { class: 'card sets diary-ex' },
          h('h2', {}, ex?.name || 'Unbekannte Übung'),
          insteadOf(en, byId),
          h('div', { class: 'hdrrow' }, h('span', {}, 'Satz'), h('span', {}, 'kg'), h('span', {}, 'Wdh.'), h('span', {}, '')),
          en.sets.length ? en.sets.flatMap((x) => editRow(en, x, x.type === 'warmup' ? 0 : ++workNo, en.exerciseId)) : h('p', { class: 'muted small center' }, 'Keine Sätze – die Übung fällt beim Speichern weg.'),
          h('div', { class: 'nav2' },
            h('button', { class: 'btn', type: 'button', onclick: () => { H.addSet(d, en.id, 'work'); draw(); } }, icon('plus', { size: 18 }), 'Satz'),
            h('button', { class: 'btn danger-text', type: 'button', 'aria-label': `${ex?.name || 'Übung'} aus dem Training entfernen`, onclick: () => {
              if (en.sets.length && !confirm(`${ex?.name || 'Übung'} mit allen Sätzen aus diesem Training entfernen?`)) return;
              for (const x of en.sets) state.invalid.delete(x.id);
              H.removeEntry(d, en.id); draw();
            } }, icon('trash', { size: 18 }), 'Entfernen')));
      }),
      d.entries.length ? null : h('p', { class: 'muted center' }, 'Keine Übungen mehr im Training.'),
      h('button', { class: 'btn block subtle danger-text', type: 'button', onclick: remove }, 'Training löschen')
    ];
  }

  function save() {
    if (state.invalid.size) { toast('Bitte gültige Zahlen eingeben (Gewicht z. B. 82,5).', { error: true }); return; }
    const res = H.saveEdited(state.draft);
    if (!res.ok) {
      if (res.empty) { remove(); return; }
      toast(res.errors[0], { error: true });
      return;
    }
    toast('Training gespeichert.');
    leaveEdit();
    rerender();
  }

  function remove() {
    if (!confirm('Training löschen? Es verschwindet aus Tagebuch, Fortschritt und Vorbelegung. Das lässt sich nicht rückgängig machen.')) return;
    const res = H.deleteSession(id);
    if (!res.ok) { toast(res.errors[0], { error: true }); return; }
    state.mode = 'deleted';
    sheet.close();
    toast('Training gelöscht.');
    rerender();
  }

  function draw() {
    const s = H.getFinished(id);
    if (!s) { sheet?.close(); return; }
    if (state.mode === 'edit') { state.invalid.clear(); body.replaceChildren(...editView().flat(2).filter(Boolean)); return; }
    body.replaceChildren(...readView(s).flat(),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { state.draft = H.startEdit(id); state.mode = 'edit'; draw(); } }, icon('edit', { size: 18 }), 'Bearbeiten'));
  }

  draw();
  sheet = openSheet(body, {
    title: `${H.sessionName(orig)} · ${fmtFull(orig.startedAt)}`,
    full: true,
    onClose: () => { if (state.mode === 'edit' && state.draft && H.isDirty(state.draft)) toast('Änderungen verworfen.'); }
  });
}
