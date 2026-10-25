// v2.34.0 (Vorschlag 6): Ein Glossar statt wiederholter Definitionen. Von jedem Info-Sheet über „Begriffe erklärt“ erreichbar.
// Inhalte nach den bestehenden App-Texten (set-info, progress-info, progression, Supersatz); keine neuen Aussagen.
import { h } from './util.js';
import { openSheet } from './sheet.js';

// Vorschlag 7: einheitliche kurze Begriffe in Beschriftungen.
export const TERMS = {
  e1rm: 'Max-Kraft (Schätzung)',
  e1rmShort: 'Max-Kraft',
  workSets: 'Sätze'
};

export const GLOSSARY = [
  ['Satz', 'Ein Arbeitssatz. Nur Arbeitssätze zählen für Sätze, Volumen und Fortschritt.'],
  ['Aufwärmsatz', 'Leichter Satz vor den Arbeitssätzen. Zählt nirgends mit.'],
  ['Drop-Satz', 'Bis kurz vor dem Versagen, dann ohne Pause mit weniger Gewicht weiter. Zählt als 1 Satz.'],
  ['Rest-Pause-Satz', 'Satz, kurze Pause, dann mit gleichem Gewicht weitere Mini-Sätze. Zählt als 1 Satz.'],
  ['Supersatz', 'Übungen abwechselnd, je ein Satz. Pause erst nach der Runde.'],
  ['Max-Kraft (Schätzung)', 'Geschätztes Gewicht für eine Wiederholung (e1RM, Epley-Formel) aus deinem besten Satz mit 1–10 Wiederholungen. Kein Messwert.'],
  ['Bester Satz', 'Dein schwerster Arbeitssatz (bei gleichem Gewicht: mehr Wiederholungen). Gemessen, kein Schätzwert.'],
  ['Tagesform', 'Änderungen unter etwa ±5 % sind normale Schwankung, kein echter Fortschritt oder Rückschritt.'],
  ['Leicht · Passend · Schwer', 'Deine Einschätzung nach der Übung: Wie viele Wiederholungen wären noch gegangen? 4+ · 1–3 · keine.'],
  ['Wiederholungsbereich', 'Zum Beispiel 8–12: erst Wiederholungen steigern, am oberen Ende kommt mehr Gewicht.'],
  ['Volumen', 'Hier: Zahl der Arbeitssätze je Muskelgruppe.'],
  ['Leichte Woche', 'Geplante Woche mit weniger Sätzen und Gewicht. Danach geht es mit den Werten von vorher weiter.']
];

export function openGlossary() {
  openSheet(h('div', { class: 'info glossary' },
    h('dl', {}, GLOSSARY.flatMap(([t, d]) => [h('dt', {}, t), h('dd', {}, d)]))), { title: 'Begriffe' });
}
