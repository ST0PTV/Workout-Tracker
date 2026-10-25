// v2.34.0: Texte in drei Ebenen (Nutzer, 2026-10-25: „nicht mit Information fluten, nur wenn sie es wollen“).
// 1. Bildschirm: Beschriftung oder Zahl, höchstens eine kurze Zeile (und die nur bei settings.hints).
// 2. Info-Sheet oben: „Kurz“ – höchstens drei Punkte.
// 3. „Details und Quellen“ eingeklappt darunter; Wissenschaft und Quellen bleiben vollständig.
import { h } from './util.js';
import { icon } from './icons.js';
import * as store from './store.js';

export const SHORT_MAX_ITEMS = 3;
export const SHORT_MAX_CHARS = 140; // je Punkt
export const LINE_MAX_CHARS = 70; // Bildschirm-Zeile

/** Kurz-Hinweise auf dem Bildschirm anzeigen? (Einstellung „Hinweise anzeigen“, Standard: an) */
export function hintsOn() {
  return store.get('settings').hints !== false;
}

/** Runde ⓘ-Taste (Tap-Ziel ≥ 44 px über ::after). */
export function infoBtn(onclick, label = 'Info') {
  return h('button', { class: 'info-btn small', type: 'button', 'aria-label': label, onclick }, icon('info', { size: 16 }));
}

/** Kartenkopf: Titel links, ⓘ rechts. */
export function cardHead(title, onInfo) {
  return h('div', { class: 'sec-row card-head' }, h('h2', {}, title), onInfo ? infoBtn(onInfo, `${title}: Info`) : null);
}

/**
 * Inhalt eines Info-Sheets.
 * short: Strings oder Elemente (≤ 3), details: Elemente (werden eingeklappt), sources: [{label,url,note}]
 * glossary: Funktion, die das Glossar öffnet (optional, für den Link „Begriffe“)
 */
export function infoBody({ lead = null, short = [], details = [], sources = [], checked = '', glossary = null, open = false }) {
  const hasMore = details.filter(Boolean).length || sources.length;
  const more = hasMore ? h('details', { class: 'more', ...(open ? { open: '' } : {}) },
    h('summary', {}, sources.length ? 'Details und Quellen' : 'Details', icon('down', { size: 16, cls: 'inline' })),
    ...details.filter(Boolean),
    sources.length ? h('h3', {}, 'Quellen') : null,
    sources.length ? h('ul', { class: 'sources' }, sources.map((s) =>
      h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label), s.note ? h('span', { class: 'muted' }, ` – ${s.note}`) : null))) : null,
    checked ? h('p', { class: 'muted small' }, `Geprüft am ${new Date(checked).toLocaleDateString('de-DE')}.`) : null) : null;
  return h('div', { class: 'info' },
    lead,
    short.length ? h('ul', { class: 'kurz' }, short.map((s) => h('li', {}, s))) : null,
    more,
    glossary ? h('button', { class: 'link small glossary-link', type: 'button', onclick: glossary }, 'Begriffe erklärt') : null);
}

/** Einzeiliger Bildschirm-Hinweis mit „Mehr“ (nur wenn Hinweise an sind). */
export function hintLine(text, onMore, { tone = '' } = {}) {
  if (!hintsOn()) return null;
  return h('p', { class: `hint-line${tone ? ` ${tone}` : ''}` }, h('span', {}, text),
    onMore ? h('button', { class: 'link small', type: 'button', onclick: onMore }, 'Mehr') : null);
}
