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

export function currentPath() {
  const raw = location.hash.replace(/^#/, '') || '/';
  return TABS.some((t) => t.path === raw) ? raw : '/';
}

let toastTimer = null;
export function toast(message, { error = false } = {}) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', error);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), error ? 5000 : 2800);
}

export function startRouter(routes) {
  const view = document.getElementById('view');
  const tabbar = document.getElementById('tabbar');
  let lastPath = null;
  const render = () => {
    const path = currentPath();
    const samePage = path === lastPath;
    lastPath = path;
    const y = window.scrollY;
    renderTabbar(tabbar, path);
    view.replaceChildren(routes[path]());
    window.scrollTo(0, samePage ? y : 0); // Neu-Rendern derselben Seite behält die Scrollposition
  };
  window.addEventListener('hashchange', () => { closeAllSheets(); render(); });
  render();
  return render;
}
