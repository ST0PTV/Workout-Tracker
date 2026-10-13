// Trainings-Tagebuch (v1.1, Variante C): Umschalter „Übungen | Trainings“ im Fortschritt-Tab.
// Karten nach Monat, Detail als Sheet. Bearbeiten in einem eigenen Modus mit „Abbrechen | Fertig“:
// Änderungen landen erst beim Tipp auf „Fertig“ im Speicher – anders als im laufenden Training,
// damit ein versehentlicher Tipp beim Durchsehen nichts verändert.
import { h } from './util.js';
import * as store from './store.js';
import * as H from './history.js';
import { weightWarning, sessionSummary } from './model.js';
import { parseWeight, parseReps, fmtNum, parseAddedWeight, fmtAdded, parseDuration, fmtDuration, parseDistanceKm, fmtKm } from './input.js';
import { INTENSITIES } from './model.js';
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

// v1.4: Anzeige je Übungstyp (Kraft „80 kg × 8“, Körpergewicht „KG × 8“ / „+5 × 5“, Cardio „20:00 · 4,6 km · Mittel“).
export function setText(x, kind = 'strength') {
  const t = SETS.formatSet(x, kind);
  if (kind === 'cardio') return x.intensity ? `${t} · ${INTENSITIES[x.intensity]}` : t;
  return kind === 'strength' && x.weightKg !== null ? t.replace(' × ', ' kg × ') : t;
}

// datetime-local ⇄ ISO (Ortszeit)
const toLocalInput = (iso) => { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const fmtClock = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

// v1.4 (Entscheidung 5 B): Zeit-Sheet für Beginn und Ende; Dauer wird berechnet.
function openTimeSheet(draft, onDone) {
  const a = h('input', { class: 'input', type: 'datetime-local', value: toLocalInput(draft.startedAt), 'aria-label': 'Beginn' });
  const b = h('input', { class: 'input', type: 'datetime-local', value: toLocalInput(draft.endedAt), 'aria-label': 'Ende' });
  const info = h('p', { class: 'muted small' });
  const upd = () => {
    const min = Math.round((Date.parse(new Date(b.value)) - Date.parse(new Date(a.value))) / 60000);
    info.textContent = Number.isFinite(min) && min > 0 ? `Dauer ${durText(min)}. Die Zeitpunkte der Sätze werden mitverschoben.` : 'Das Ende muss nach dem Beginn liegen.';
  };
  a.addEventListener('input', upd); b.addEventListener('input', upd); upd();
  const sheet = openSheet(h('div', { class: 'editor' },
    h('div', { class: 'field' }, h('label', {}, 'Beginn'), a),
    h('div', { class: 'field' }, h('label', {}, 'Ende'), b),
    info,
    h('button', { class: 'btn primary block', type: 'button', onclick: () => {
      const r = H.setTimes(draft, new Date(a.value).toISOString(), new Date(b.value).toISOString());
      if (!r.ok) { toast(r.errors[0], { error: true }); return; }
      sheet.close(); onDone();
    } }, 'Übernehmen')), { title: 'Zeit' });
}

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
          const val = setText(x, ex?.kind);
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

  function editRow(entry, set, workNo, exId, kind = 'strength') {
    const key = set.id;
    const cardio = kind === 'cardio';
    const bw = kind === 'bodyweight';
    const w = cardio
      ? h('input', { class: 'val', type: 'text', inputmode: 'numeric', value: fmtDuration(set.durationSec), placeholder: 'mm:ss', 'aria-label': 'Dauer' })
      : h('input', { class: 'val', type: 'text', inputmode: bw ? 'text' : 'decimal', value: bw ? fmtAdded(set.weightKg) : fmtNum(set.weightKg), placeholder: bw ? 'KG' : '–', 'aria-label': `Satz ${setLabel(set, workNo)} ${bw ? 'Zusatzgewicht' : 'Gewicht'} in kg` });
    const r = cardio
      ? h('input', { class: 'val', type: 'text', inputmode: 'decimal', value: fmtKm(set.distanceM), placeholder: '–', 'aria-label': 'Strecke in km' })
      : h('input', { class: 'val', type: 'text', inputmode: 'numeric', value: fmtNum(set.reps), placeholder: '–', 'aria-label': `Satz ${setLabel(set, workNo)} Wiederholungen` });
    const hint = h('div', { class: 'hint typo', hidden: true }, h('span', { class: 'hint-ic' }, icon('info', { size: 18 })), h('span', {}));
    const check = () => {
      if (cardio) {
        const durationSec = parseDuration(w.value);
        const distanceM = parseDistanceKm(r.value);
        w.classList.toggle('bad', Number.isNaN(durationSec));
        r.classList.toggle('bad', Number.isNaN(distanceM));
        if (Number.isNaN(durationSec) || Number.isNaN(distanceM)) state.invalid.add(key); else state.invalid.delete(key);
        if (!Number.isNaN(durationSec)) H.setValues(state.draft, entry.id, set.id, { durationSec });
        if (!Number.isNaN(distanceM)) H.setValues(state.draft, entry.id, set.id, { distanceM });
        return;
      }
      const weightKg = bw ? parseAddedWeight(w.value) : parseWeight(w.value);
      const reps = parseReps(r.value);
      w.classList.toggle('bad', Number.isNaN(weightKg));
      r.classList.toggle('bad', Number.isNaN(reps));
      if (Number.isNaN(weightKg) || Number.isNaN(reps)) state.invalid.add(key); else state.invalid.delete(key);
      if (!Number.isNaN(weightKg)) H.setValues(state.draft, entry.id, set.id, { weightKg });
      if (!Number.isNaN(reps)) H.setValues(state.draft, entry.id, set.id, { reps });
      const warn = Number.isNaN(weightKg) || bw ? null : weightWarning(exId, weightKg, store.get('sessions'), { excludeSessionId: state.draft.id });
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
      h('button', { class: 'card time-line', type: 'button', 'aria-label': 'Beginn und Ende ändern', onclick: () => openTimeSheet(d, draw) },
        h('span', { class: 't' }, h('b', {}, `${fmtLong(d.startedAt)} · ${fmtClock(d.startedAt)}–${fmtClock(d.endedAt)}`), h('small', {}, durText(H.durationMin(d)))),
        icon('edit', { size: 18 })),
      h('p', { class: 'muted small' }, 'Tipp auf die Zeit: Beginn und Ende ändern. Tipp auf die Satznummer: Satztyp und Markierungen.'),
      d.entries.map((en) => {
        const ex = byId[en.exerciseId];
        const kind = ex?.kind || 'strength';
        let workNo = 0;
        return h('div', { class: 'card sets diary-ex' },
          h('h2', {}, ex?.name || 'Unbekannte Übung'),
          insteadOf(en, byId),
          h('div', { class: 'hdrrow' }, h('span', {}, kind === 'cardio' ? 'Abs.' : 'Satz'), h('span', {}, kind === 'cardio' ? 'Dauer' : kind === 'bodyweight' ? '+ kg' : 'kg'), h('span', {}, kind === 'cardio' ? 'km' : 'Wdh.'), h('span', {}, '')),
          en.sets.length ? en.sets.flatMap((x) => editRow(en, x, x.type === 'warmup' ? 0 : ++workNo, en.exerciseId, kind)) : h('p', { class: 'muted small center' }, 'Keine Sätze – die Übung fällt beim Speichern weg.'),
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
