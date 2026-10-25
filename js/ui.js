// UI-Grundbausteine: Router, Tab-Leiste, Toast.
import { h } from './util.js';
import { closeAllSheets } from './sheet.js';
import { icon } from './icons.js';


export const TABS = [
  { path: '/', label: 'Training', icon: 'train' },
  { path: '/plans', label: 'Pläne', icon: 'plans' },
  { path: '/exercises', label: 'Übungen', icon: 'exercises' },
  { path: '/progress', label: 'Fortschritt', icon: 'progress' },
  { path: '/settings', label: 'Einstellungen', icon: 'settings' }
];


export function renderTabbar(container, current) {
  container.replaceChildren(
    ...TABS.map((tab) =>
      h('a', { class: 'tab', href: `#${tab.path}`, 'aria-current': tab.path === current ? 'page' : false }, icon(tab.icon, { size: 24 }), tab.label)
    )
  );
}

// Seiten ohne eigenen Tab (v2.3.0: Ablauf einer Routine).
export const EXTRA_PATHS = ['/routine'];

export function currentPath() {
  const raw = location.hash.replace(/^#/, '') || '/';
  return TABS.some((t) => t.path === raw) || EXTRA_PATHS.includes(raw) ? raw : '/';
}

let toastTimer = null;
// v2.26.0 (A10): optional eine Aktion im Toast, z. B. { label: 'Rückgängig', onClick }; bleibt dann 6 s stehen.
export function toast(message, { error = false, action = null } = {}) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.replaceChildren(h('span', {}, message));
  if (action) {
    el.append(h('button', { class: 'toast-act', type: 'button', onclick: () => {
      clearTimeout(toastTimer);
      el.classList.remove('show', 'has-act');
      action.onClick();
    } }, action.label));
  }
  el.classList.toggle('error', error);
  el.classList.toggle('has-act', !!action);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show', 'has-act'), action ? 6000 : error ? 5000 : 2800);
}

export function startRouter(routes) {
  const view = document.getElementById('view');
  const tabbar = document.getElementById('tabbar');
  let lastPath = null;
  const render = () => {
    const path = currentPath();
    const samePage = path === lastPath;
    lastPath = path;
    const y = view.scrollTop; // v3.0.3: #view scrollt, nicht das Fenster
    renderTabbar(tabbar, path);
    view.replaceChildren(routes[path]());
    view.scrollTop = samePage ? y : 0; // Neu-Rendern derselben Seite behält die Scrollposition
  };
  window.addEventListener('hashchange', () => { closeAllSheets(); render(); });
  render();
  return render;
}
