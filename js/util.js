// Gemeinsame Konventionen (später für Calorie Tracker / Rezepte-App identisch):
// - IDs sind UUIDs (String)
// - Zeitstempel sind ISO-8601 in UTC (String)

export function uuid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function nowISO() {
  return new Date().toISOString();
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Kleiner DOM-Helfer: h('div', {class:'card'}, 'Text', childNode)
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs || {})) {
    if (val === false || val === null || val === undefined) continue;
    if (key === 'class') el.className = val;
    else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2).toLowerCase(), val);
    else el.setAttribute(key, val === true ? '' : String(val));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// Schutz (v2.7.1): replaceChildren/append schreiben null/undefined/false sonst als Text "null" ins DOM
// (so geschehen im Tagebuch seit v2.3.0). Der Wrapper lässt solche Werte weg.
if (typeof Element !== 'undefined') {
  for (const name of ['replaceChildren', 'append', 'prepend']) {
    const orig = Element.prototype[name];
    if (orig && !orig.__wtSafe) {
      const safe = function (...nodes) { return orig.apply(this, nodes.filter((n) => n !== null && n !== undefined && n !== false)); };
      safe.__wtSafe = true;
      Element.prototype[name] = safe;
    }
  }
}
