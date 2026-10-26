// Eigene Linien-Icons im Stil der Tab-Leiste (24er-Raster, Strich 1.8, currentColor).
// Keine Unicode-Zeichen oder Emoji als Icons: iOS stellt z. B. „ℹ“ als farbiges Emoji dar.
const PATHS = {
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 7.5l3 3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  warn: '<path d="M12 4.5L21 19.5H3z" stroke-linejoin="round"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r="0.6" fill="currentColor"/>',
  link: '<path d="M10 13.5a4.5 4.5 0 0 0 6.4.4l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4L11.3 6.2"/><path d="M14 10.5a4.5 4.5 0 0 0-6.4-.4l-2.8 2.8a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sparkle: '<path d="M12 4l1.8 4.9L18.5 10.5l-4.7 1.7L12 17l-1.8-4.8-4.7-1.7 4.7-1.6z" stroke-linejoin="round"/><path d="M18.5 15.5v4M16.5 17.5h4"/>', // v3.2.0: Plan vorschlagen lassen
  minus: '<path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="0.8" fill="currentColor"/><circle cx="4" cy="12" r="0.8" fill="currentColor"/><circle cx="4" cy="18" r="0.8" fill="currentColor"/>',
  train: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  plans: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  exercises: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  settings: '<path d="M10.23 4.61 L10.64 1.89 L13.36 1.89 L13.77 4.61 L15.97 5.52 L18.19 3.89 L20.11 5.81 L18.48 8.03 L19.39 10.23 L22.11 10.64 L22.11 13.36 L19.39 13.77 L18.48 15.97 L20.11 18.19 L18.19 20.11 L15.97 18.48 L13.77 19.39 L13.36 22.11 L10.64 22.11 L10.23 19.39 L8.03 18.48 L5.81 20.11 L3.89 18.19 L5.52 15.97 L4.61 13.77 L1.89 13.36 L1.89 10.64 L4.61 10.23 L5.52 8.03 L3.89 5.81 L5.81 3.89 L8.03 5.52Z"/><circle cx="12" cy="12" r="3"/>',
  grip: '<path d="M9 7h.01M15 7h.01M9 12h.01M15 12h.01M9 17h.01M15 17h.01" stroke-width="3"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  progress: '<path d="M4 20h16"/><path d="M5 16l4.5-4.5 3 3L19 8"/><path d="M15 8h4v4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  swap: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  // v3.5.2: Tab-Leiste – Training = Klemmbrett mit Haken, Pläne = Kalender, Mitte = gefüllte, schräge Hantel
  workout: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5h6v3H9z"/><path d="M8.8 14l2.2 2.2 4.2-4.4"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2.2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><circle cx="8.5" cy="14" r="0.7" fill="currentColor"/><circle cx="12" cy="14" r="0.7" fill="currentColor"/><circle cx="15.5" cy="14" r="0.7" fill="currentColor"/><circle cx="8.5" cy="17.2" r="0.7" fill="currentColor"/><circle cx="12" cy="17.2" r="0.7" fill="currentColor"/>',
  dumbbell: '<g transform="rotate(-45 12 12)" fill="currentColor" stroke="none"><rect x="6.5" y="11" width="11" height="2" rx="1"/><rect x="4.6" y="7.2" width="2.6" height="9.6" rx="1.1"/><rect x="16.8" y="7.2" width="2.6" height="9.6" rx="1.1"/><rect x="2" y="9.2" width="2.2" height="5.6" rx="1"/><rect x="19.8" y="9.2" width="2.2" height="5.6" rx="1"/></g>',
  play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke-linejoin="round"/>',
  pause: '<path d="M8 6v12M16 6v12" stroke-width="2.6"/>',
  motion: '<circle cx="12" cy="5" r="1.6" fill="currentColor"/><path d="M9 20l2.5-6 2.5 2 2.5-6M7 11l4-2.5 3 1.5 3-1"/>'
};

export function icon(name, { size = 20, cls = '' } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `icon${cls ? ` ${cls}` : ''}`);
  svg.innerHTML = PATHS[name] || '';
  return svg;
}

export const ICON_NAMES = Object.keys(PATHS);
