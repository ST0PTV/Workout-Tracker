// Ansichten. In v0.1 sind Training, Pläne und Übungen Platzhalter; Einstellungen enthält das Backup.
import { h } from './util.js';
import { APP_NAME, APP_VERSION } from './version.js';
import * as store from './store.js';
import * as backup from './backup.js';
import { toast } from './ui.js';

function placeholderCard(text, version) {
  return h('div', { class: 'card empty' }, h('div', { class: 'big' }, '🏗️'), h('h2', {}, `Kommt in ${version}`), h('p', { class: 'muted' }, text));
}

function placeholder(title, text, version) {
  return h('section', {}, h('h1', {}, title), placeholderCard(text, version));
}

export function trainingView() {
  const c = store.counts();
  return h(
    'section',
    {},
    h('h1', {}, 'Training'),
    h('p', { class: 'sub' }, 'Logge deine Sätze schnell und einhändig. Alle Daten bleiben auf diesem Gerät.'),
    h(
      'div',
      { class: 'card' },
      h('div', { class: 'stats' },
        stat(c.exercises, 'Übungen'),
        stat(c.plans, 'Pläne'),
        stat(c.sessions, 'Trainings'))
    ),
    placeholderCard('Training loggen mit Werten vom letzten Mal, Aufwärm-Hinweis und Pausentimer.', 'v0.5')
  );
}

function stat(value, label) {
  return h('div', { class: 'stat' }, h('b', {}, value), h('span', {}, label));
}

export function plansView() {
  return placeholder('Pläne', 'Trainingspläne aus deinen Übungen zusammenstellen.', 'v0.4');
}

export function exercisesView() {
  return placeholder('Übungen', 'Übungen anlegen und aus einem recherchierten Startpool wählen.', 'v0.3');
}

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
    `Backup vom ${when} einspielen?\n\n${s.exercises} Übungen, ${s.groups} Gruppen, ${s.plans} Pläne, ${s.sessions} Trainings.\n\n` +
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
    h('p', { class: 'sub' }, 'Backup und App-Infos.'),
    h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Backup'),
      h('p', { class: 'muted small' }, 'Deine Daten liegen nur lokal im Browser-Speicher dieses Geräts. Sichere sie regelmäßig als Datei und lege sie niemals in ein öffentliches Repo.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', type: 'button', onclick: exportBackup }, 'Backup exportieren'),
        h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, 'Backup importieren')),
      fileInput
    ),
    h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Info'),
      kv('App', APP_NAME),
      kv('Version', APP_VERSION),
      kv('Datenschema', `v${store.SCHEMA_VERSION}`),
      kv('Belegter Speicher', `${store.usageKB()} KB`)
    )
  );
}

function kv(key, value) {
  return h('div', { class: 'kv' }, h('span', { class: 'muted' }, key), h('span', {}, value));
}
