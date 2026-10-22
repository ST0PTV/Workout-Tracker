// "Mein Equipment" (v2.31.0): Tasten zum Antippen. Genutzt in den Einstellungen und im Startpool.
// Gespeichert wird settings.equipment (Liste der Geräte-Schlüssel) oder null = nichts festgelegt, alles zeigen.
import { h } from './util.js';
import * as store from './store.js';
import { toast } from './ui.js';
import { GEAR, ownedGear } from './pool.js';

// onChange wird nach jedem Speichern aufgerufen (z. B. um die Pool-Liste neu zu zeichnen).
export function gearPicker(onChange) {
  const box = h('div', { class: 'gear-picker' });
  const draw = () => {
    const owned = ownedGear(store.get('settings')) || [];
    const save = (next) => {
      const value = next.length ? Object.keys(GEAR).filter((k) => next.includes(k)) : null;
      if (!store.set('settings', { ...store.get('settings'), equipment: value })) { toast('Speichern fehlgeschlagen.', { error: true }); return; }
      draw();
      if (onChange) onChange();
    };
    box.replaceChildren(
      h('div', { class: 'wrap', role: 'group', 'aria-label': 'Mein Equipment' },
        Object.entries(GEAR).map(([k, label]) => {
          const on = owned.includes(k);
          return h('button', { class: `chip${on ? ' on' : ''}`, type: 'button', 'aria-pressed': String(on),
            onclick: () => save(on ? owned.filter((x) => x !== k) : [...owned, k]) }, label);
        })),
      owned.length
        ? h('button', { class: 'link', type: 'button', onclick: () => save([]) }, 'Auswahl aufheben (alle Übungen zeigen)')
        : h('p', { class: 'muted small' }, 'Nichts gewählt: Der Pool zeigt alle Übungen.'));
  };
  draw();
  return box;
}
