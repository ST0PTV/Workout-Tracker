// Ansichten: Einstellungen (Backup, Standard-Pause, Info); die Tabs Training, Pläne und Übungen kommen aus eigenen Modulen.
import { cycleSettingsCard } from './cycle-view.js';
import { h } from './util.js';
import { APP_VERSION } from './version.js';
import * as store from './store.js';
import * as backup from './backup.js';
import { toast } from './ui.js';
import { icon } from './icons.js';
import { stepper, switchInput } from './controls.js';
import { stepRest, formatDuration } from './rest.js';
import { wakeLockSupported } from './device.js';
import { BAR_KG_MIN, BAR_KG_MAX } from './model.js';
import { fmtNum } from './input.js';
import { gearPicker } from './gear-view.js';
import { openSheet } from './sheet.js';
import { infoBody, cardHead } from './info.js';
import { openGlossary } from './glossary.js';
import { openOnboarding } from './onboarding.js';
import { APPEARANCES, appearanceOf, applyTheme } from './theme.js';

function onOff(label, key, rerender) {
  const cur = store.get('settings')[key] !== false;
  return h('label', { class: 'set-line' }, h('span', { class: 'set-label' }, label),
    switchInput(label, cur, (v) => {
      if (!store.set('settings', { ...store.get('settings'), [key]: v })) { toast('Speichern fehlgeschlagen.', { error: true }); rerender(); return; }
      rerender();
    }));
}

export { trainingView } from './training-view.js';


export { plansView } from './plans-view.js';

export { exercisesView } from './exercises-view.js';

export { progressView } from './progress-view.js';

async function exportBackup() {
  const payload = backup.buildBackup();
  const text = JSON.stringify(payload, null, 2);
  const name = backup.backupFilename();
  const file = new File([text], name, { type: 'application/json' });

  // Auf dem iPhone ist das Teilen-Menü der zuverlässigste Weg, die Datei zu sichern.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      toast('Backup bereit.');
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('Backup heruntergeladen.');
}

async function importBackup(file, rerender) {
  if (!file) return;
  const result = backup.parseBackupText(await file.text());
  if (!result.ok) {
    toast(result.errors[0], { error: true });
    return;
  }
  const s = result.summary;
  const when = s.exportedAt ? new Date(s.exportedAt).toLocaleString('de-DE') : 'unbekannt';
  const ok = confirm(
    `Backup vom ${when} einspielen?\n\n${s.exercises} Übungen, ${s.groups} Gruppen, ${s.plans} Pläne, ${s.sessions} Trainings, ${s.routines} eigene Routinen.\n\n` +
      'Achtung: Alle aktuellen Daten in der App werden ersetzt.'
  );
  if (!ok) return;
  if (backup.applyBackup(result)) {
    toast('Backup eingespielt.');
    rerender();
  } else {
    toast('Einspielen fehlgeschlagen, bisherige Daten bleiben erhalten.', { error: true });
  }
}

// v2.34.0: kleine Info-Sheets der Einstellungskarten (Erklärtexte stehen nicht mehr auf der Seite).
function cardInfo(title, short, details = []) {
  return () => openSheet(infoBody({ short, details: details.map((t) => h('p', { class: 'muted small' }, t)) }), { title });
}

export function settingsView(rerender) {
  const fileInput = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    onchange: async (e) => {
      await importBackup(e.target.files[0], rerender);
      e.target.value = '';
    }
  });
  const settings = store.get('settings');
  const labeled = (label, el) => h('div', { class: 'set-line' }, h('span', { class: 'set-label' }, label), el);
  return h(
    'section',
    {},
    h('h1', {}, 'Einstellungen'),
    h('div', { class: 'card' },
      cardHead('Backup', cardInfo('Backup', [
        'Deine Daten liegen nur auf diesem Gerät.',
        'Sichere sie regelmäßig als Datei.',
        'Die Backup-Datei enthält deine Trainings – nicht öffentlich teilen.'
      ], ['Beim Import werden alle aktuellen Daten in der App ersetzt.'])),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary', type: 'button', onclick: exportBackup }, 'Exportieren'),
        h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, 'Importieren')),
      fileInput),
    h('div', { class: 'card' },
      cardHead('Training', cardInfo('Training', [
        'Pause: gilt für Übungen ohne eigene Pause. Der Timer läuft ohne Ton und ohne Alarm.',
        'Bildschirm anlassen: nur während eines Trainings, kostet etwas Akku.',
        'Scheiben: bei Langhantel-Übungen; die Stange ist pro Übung im Editor änderbar. Eingetragen wird das Gesamtgewicht.'
      ])),
      labeled('Pause', stepper({
        value: settings.restSeconds,
        format: formatDuration,
        label: 'Standard-Pause',
        onStep: (v, d) => {
          const next = stepRest(v, d);
          if (!store.set('settings', { ...store.get('settings'), restSeconds: next })) { toast('Speichern fehlgeschlagen.', { error: true }); return null; }
          return next;
        }
      })),
      onOff('Bildschirm anlassen', 'keepAwake', rerender),
      wakeLockSupported() ? null : h('p', { class: 'muted small' }, 'Auf diesem Gerät ohne Wirkung.'),
      onOff('Scheiben pro Seite', 'plateMath', rerender),
      settings.plateMath !== false ? labeled('Stange', stepper({
        value: settings.barKg ?? 20,
        format: (v) => `${fmtNum(v)} kg`,
        label: 'Standard-Stange',
        onStep: (v, d) => {
          const next = Math.max(BAR_KG_MIN, Math.min(BAR_KG_MAX, v + d * 2.5));
          if (!store.set('settings', { ...store.get('settings'), barKg: next })) { toast('Speichern fehlgeschlagen.', { error: true }); return null; }
          return next;
        }
      })) : null),
    h('div', { class: 'card' },
      cardHead('Mein Equipment', cardInfo('Mein Equipment', [
        'Grenzt den Startpool auf passende Übungen ein.',
        'Körpergewicht ohne Zubehör ist immer dabei.',
        'Bereits übernommene Übungen bleiben unverändert.'
      ])),
      gearPicker()),
    h('div', { class: 'card' },
      cardHead('Anzeige'),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Erscheinung', style: 'margin-bottom: 12px' },
        APPEARANCES.map(([k, label]) => {
          const on = appearanceOf(settings) === k;
          return h('button', { type: 'button', role: 'radio', class: on ? 'on' : '', 'aria-checked': String(on), onclick: () => {
            if (on) return;
            if (!store.set('settings', { ...store.get('settings'), appearance: k })) { toast('Speichern fehlgeschlagen.', { error: true }); return; }
            applyTheme(k);
            rerender();
          } }, label);
        })),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Figur' },
        [['male', 'Männlich'], ['female', 'Weiblich']].map(([k, label]) => {
          const on = (settings.figure || 'male') === k;
          return h('button', { type: 'button', role: 'radio', class: on ? 'on' : '', 'aria-checked': String(on), onclick: () => {
            if (on) return;
            if (!store.set('settings', { ...store.get('settings'), figure: k })) { toast('Speichern fehlgeschlagen.', { error: true }); return; }
            rerender();
          } }, label);
        })),
      onOff('Hinweise anzeigen', 'hints', rerender),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => openOnboarding() }, 'Einführung'),
        h('button', { class: 'btn', type: 'button', onclick: openGlossary }, 'Begriffe'))),
    cycleSettingsCard(rerender),
    h('div', { class: 'card' },
      cardHead('Info'),
      kv('Version', APP_VERSION))
  );
}

function kv(key, value) {
  return h('div', { class: 'kv' }, h('span', { class: 'muted' }, key), h('span', {}, value));
}
