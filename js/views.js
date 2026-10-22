// Ansichten: Einstellungen (Backup, Standard-Pause, Info); die Tabs Training, Pläne und Übungen kommen aus eigenen Modulen.
import { cycleSettingsCard } from './cycle-view.js';
import { h } from './util.js';
import { APP_NAME, APP_VERSION } from './version.js';
import * as store from './store.js';
import * as backup from './backup.js';
import { toast } from './ui.js';
import { icon } from './icons.js';
import { stepper } from './controls.js';
import { stepRest, formatDuration } from './rest.js';
import { wakeLockSupported, storageStatus } from './device.js';
import { BAR_KG_MIN, BAR_KG_MAX } from './model.js';
import { fmtNum } from './input.js';

// v2.26.0: An/Aus-Schalter für eine Einstellung (gleiche Form wie beim Zyklus).
function onOff(label, key, rerender) {
  const cur = store.get('settings')[key] !== false;
  return h('div', { class: 'set-line' }, h('span', { class: 'set-label' }, label),
    h('div', { class: 'seg seg-sm', role: 'radiogroup', 'aria-label': label },
      [[false, 'Aus'], [true, 'Ein']].map(([v, l]) => h('button', { type: 'button', role: 'radio', class: cur === v ? 'on' : '', 'aria-checked': String(cur === v), onclick: () => {
        if (cur === v) return;
        if (!store.set('settings', { ...store.get('settings'), [key]: v })) { toast('Speichern fehlgeschlagen.', { error: true }); return; }
        rerender();
      } }, l))));
}

// v2.26.0 (A2): Speicherstatus wird nachgeladen (die Browser-Schnittstelle ist asynchron).
// Die Belegungs-Schätzung des Browsers wird bewusst nicht gezeigt: Sie zählt localStorage meist nicht mit
// (im Test 0 KB) – die eigene Messung „Belegter Speicher“ steht schon darüber.
function storageLines() {
  const persisted = kv('Speicher geschützt', '…');
  storageStatus().then((st) => {
    persisted.lastChild.textContent = st.persisted === null ? 'unbekannt' : st.persisted ? 'ja' : 'nein';
  });
  return [persisted,
    h('p', { class: 'muted small' }, '„Geschützt“ heißt: Der Browser hat zugesagt, die Daten nicht von sich aus zu löschen, wenn Speicher knapp wird. Ein Backup ersetzt das nicht.')];
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
  return h(
    'section',
    {},
    h('h1', {}, 'Einstellungen'),
    h('p', { class: 'sub' }, 'Backup, Training und App-Infos.'),
    h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Backup'),
      h('p', { class: 'muted small' }, 'Deine Daten liegen nur lokal im Browser-Speicher dieses Geräts. Sichere sie regelmäßig als Datei und lege sie niemals in ein öffentliches Repo.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary', type: 'button', onclick: exportBackup }, 'Backup exportieren'),
        h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, 'Backup importieren')),
      fileInput
    ),
    h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Training'),
      h('p', { class: 'muted small' }, 'Standard-Pause zwischen Sätzen. Gilt für alle Übungen ohne eigene Pausenzeit. Der Timer läuft ohne Ton und ohne Alarm.'),
      stepper({
        value: store.get('settings').restSeconds,
        format: formatDuration,
        label: 'Standard-Pause',
        onStep: (v, d) => {
          const next = stepRest(v, d);
          const settings = store.get('settings');
          if (!store.set('settings', { ...settings, restSeconds: next })) { toast('Speichern fehlgeschlagen.', { error: true }); return null; }
          return next;
        }
      }),
      onOff('Bildschirm im Training anlassen', 'keepAwake', rerender),
      h('p', { class: 'muted small' }, wakeLockSupported()
        ? 'Nur solange ein Training läuft. Kostet etwas Akku.'
        : 'Dieses Gerät oder dieser Browser unterstützt das nicht – die Einstellung bleibt ohne Wirkung.'),
      onOff('Scheiben pro Seite anzeigen', 'plateMath', rerender),
      store.get('settings').plateMath !== false ? h('div', {},
        h('p', { class: 'muted small' }, 'Bei Langhantel-Übungen. Standard-Stange, pro Übung im Übungs-Editor änderbar. Eingetragen wird weiter das Gesamtgewicht.'),
        stepper({
          value: store.get('settings').barKg ?? 20,
          format: (v) => `${fmtNum(v)} kg`,
          label: 'Standard-Stange',
          onStep: (v, d) => {
            const next = Math.max(BAR_KG_MIN, Math.min(BAR_KG_MAX, v + d * 2.5));
            if (!store.set('settings', { ...store.get('settings'), barKg: next })) { toast('Speichern fehlgeschlagen.', { error: true }); return null; }
            return next;
          }
        })) : null
    ),
    h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Figur'),
      h('p', { class: 'muted small' }, 'Für Muskelkarte, Übungs-Piktogramme und Technik-Animationen. Nur die Darstellung ändert sich, die Muskeln, Bewegungen und die Zählung sind gleich.'),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Figur' },
        [['male', 'Männlich'], ['female', 'Weiblich']].map(([k, label]) => {
          const on = (store.get('settings').figure || 'male') === k;
          return h('button', { type: 'button', role: 'radio', class: on ? 'on' : '', 'aria-checked': String(on), onclick: () => {
            if (on) return;
            if (!store.set('settings', { ...store.get('settings'), figure: k })) { toast('Speichern fehlgeschlagen.', { error: true }); return; }
            rerender();
          } }, label);
        }))
    ),
    cycleSettingsCard(rerender),
    h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Info'),
      kv('App', APP_NAME),
      kv('Version', APP_VERSION),
      kv('Datenschema', `v${store.SCHEMA_VERSION}`),
      kv('Belegter Speicher', `${store.usageKB()} KB`),
      ...storageLines()
    )
  );
}

function kv(key, value) {
  return h('div', { class: 'kv' }, h('span', { class: 'muted' }, key), h('span', {}, value));
}
