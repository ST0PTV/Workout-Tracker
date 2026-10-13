// Gruppen-Oberfläche (v1.3, Variante A + „statt … · zurück“ aus C).
// - Übungs-Editor: Gruppen-Chips (Zugehörigkeit), „+ Neue Gruppe“, „Gruppen verwalten“ (umbenennen, löschen).
// - Training: Kandidaten-Zeilen (candidateLine, swapOptions) für das Aufklappen unter dem Titel (v1.4, Variante B);
//   nach einem erledigten Satz fügt die Auswahl die Übung dahinter ein (Entscheidung b, v1.3).
import { h } from './util.js';
import * as store from './store.js';
import * as G from './groups.js';
import * as S from './session.js';
import { lastPerformance } from './model.js';
import { formatLastSets } from './plans.js';
import { openSheet } from './sheet.js';
import { toast } from './ui.js';
import { icon } from './icons.js';

const fmtDay = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const finished = () => store.get('sessions').filter((s) => s.endedAt !== null);

// ---------- Übungs-Editor ----------

// Feld „Gruppen“ für den Editor. ex.groupIds wird im Editor-Objekt geändert (gespeichert mit „Speichern“);
// neue Gruppen werden sofort angelegt, damit sie gewählt werden können.
export function groupField(ex) {
  const box = h('div', { class: 'field group-field' });
  const draw = () => {
    const groups = G.listGroups();
    const known = new Set(groups.map((g) => g.id));
    ex.groupIds = ex.groupIds.filter((id) => known.has(id)); // gelöschte Gruppen fallen weg
    const others = ex.groupIds.map((gid) => {
      const names = G.groupMembers(gid).filter((e) => e.id !== ex.id).map((e) => e.name);
      const g = groups.find((x) => x.id === gid);
      return h('div', { class: 'muted small' }, `In „${g.name}“ ${names.length ? `auch: ${names.join(', ')}` : 'noch keine weitere Übung'}`);
    });
    box.replaceChildren(...[
      h('div', { class: 'label-row' }, h('label', {}, 'Gruppen (für den Tausch im Training)'),
        groups.length ? h('button', { class: 'link small', type: 'button', onclick: () => openGroupManager(draw) }, 'Verwalten') : null),
      h('div', { class: 'wrap' },
        groups.map((g) => {
          const on = ex.groupIds.includes(g.id);
          return h('button', { type: 'button', class: `chip small${on ? ' on' : ''}`, 'aria-pressed': String(on), onclick: () => {
            ex.groupIds = on ? ex.groupIds.filter((id) => id !== g.id) : [...ex.groupIds, g.id];
            draw();
          } }, g.name);
        }),
        h('button', { type: 'button', class: 'chip small', onclick: () => {
          const name = prompt('Name der Gruppe (z. B. „Beine Grundübung“)', '');
          if (name === null) return;
          const r = G.addGroup(name);
          if (!r.ok) { toast(r.errors[0], { error: true }); return; }
          ex.groupIds = [...ex.groupIds, r.group.id];
          draw();
        } }, icon('plus', { size: 12, cls: 'inline' }), ' Neue Gruppe')),
      ...others,
      groups.length ? null : h('p', { class: 'muted small' }, 'Ähnliche Übungen in eine Gruppe legen (z. B. Beinpresse, Hack Squat, Kniebeuge), dann lässt sich im Training mit einem Tipp tauschen.')
    ].filter(Boolean));
  };
  draw();
  return box;
}

export function openGroupManager(onChange = () => {}) {
  const body = h('div');
  let sheet = null;
  const draw = () => {
    const groups = G.listGroups();
    if (!groups.length) { body.replaceChildren(h('p', { class: 'muted' }, 'Keine Gruppen.')); return; }
    body.replaceChildren(h('div', { class: 'card list' }, groups.map((g) => {
      const n = G.groupMembers(g.id).length;
      return h('div', { class: 'row' },
        h('span', { class: 't' }, h('b', {}, g.name), h('small', {}, `${n} ${n === 1 ? 'Übung' : 'Übungen'}`)),
        h('div', { class: 'arrows horiz' },
          h('button', { type: 'button', 'aria-label': `${g.name} umbenennen`, onclick: () => {
            const name = prompt('Neuer Name', g.name);
            if (name === null) return;
            const r = G.renameGroup(g.id, name);
            if (!r.ok) { toast(r.errors[0], { error: true }); return; }
            draw(); onChange();
          } }, icon('edit')),
          h('button', { type: 'button', class: 'danger', 'aria-label': `${g.name} löschen`, onclick: () => {
            if (!confirm(`Gruppe „${g.name}“ löschen? Die Übungen bleiben erhalten, nur die Zuordnung fällt weg.`)) return;
            const r = G.deleteGroup(g.id);
            if (!r.ok) { toast(r.errors[0], { error: true }); return; }
            toast('Gruppe gelöscht.'); draw(); onChange();
          } }, icon('trash'))));
    })));
  };
  draw();
  sheet = openSheet(body, { title: 'Gruppen' });
  return sheet;
}

// ---------- Training ----------

export function candidateLine(ex, entry) {
  const last = lastPerformance(ex.id, finished());
  if (last) {
    const sets = last.sets.filter((x) => x.type !== 'warmup');
    return `Zuletzt ${fmtDay(last.date)}: ${formatLastSets(sets, ex.kind)}`;
  }
  const n = entry.targetSets ?? ex.defaultWorkSets;
  return `Noch nicht trainiert · ${n} ${n === 1 ? 'Satz' : 'Sätze'} ${entry.targetSets ? 'aus dem Plan' : '(Standard)'}`;
}

// Kandidaten für den Eintrag; leer → kein Knopf.
export const swapOptions = (entry) => G.swapCandidates(entry);
