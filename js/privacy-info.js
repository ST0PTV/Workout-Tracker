// v3.14.0: Texte „Deine Daten“ – gleiche Aussagen in Einstellungen (Info) und im Hinweis der Testversion.
// GitHub-Pages-Aussage geprüft per Websuche 2026-10-31: docs.github.com „About GitHub Pages“ –
// „When a GitHub Pages site is visited, the visitor's IP address is logged and stored for security purposes“.
import { h } from './util.js';
import { openSheet } from './sheet.js';
import { infoBody } from './info.js';

export const DATA_SHORT = [
  'Alles, was du einträgst, bleibt auf diesem Gerät.',
  'Die App sendet nichts: kein Konto, kein Server, keine Analyse.',
  'Sichere deine Daten deshalb selbst als Backup-Datei.'
];

export const DATA_DETAILS = [
  'Gespeichert wird im Browser-Speicher deines Geräts. Löschst du die App vom Home-Bildschirm oder die Website-Daten in Safari, sind die Daten weg – nur ein Backup bringt sie zurück. Auch ein neues iPhone übernimmt sie nicht von selbst.',
  'Backup: Einstellungen → Backup → Exportieren, dann z. B. in „Dateien“ oder iCloud Drive sichern. Importieren ersetzt alle Daten in der App.',
  'Die Backup-Datei ist lesbar und enthält deine Trainings und, falls genutzt, deine Zyklus-Angaben. Teile sie nicht öffentlich.',
  'Die App wird über GitHub Pages ausgeliefert. Beim Laden speichert GitHub deine IP-Adresse (laut GitHub aus Sicherheitsgründen). Deine Trainingsdaten erreichen GitHub nie.',
  'Quellen-Links öffnen fremde Websites erst, wenn du sie antippst.'
];

export function openDataInfo() {
  openSheet(infoBody({ short: DATA_SHORT, details: DATA_DETAILS.map((t) => h('p', { class: 'muted small' }, t)) }), { title: 'Deine Daten' });
}

/** Datum des letzten Exports als Text (oder „noch nie“). */
export function lastBackupText(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return 'noch nie';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
