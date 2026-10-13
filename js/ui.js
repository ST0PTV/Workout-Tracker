// UI-Grundbausteine: Router, Tab-Leiste, Toast.
import { h } from './util.js';

const ICONS = {
  train: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  plans: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  exercises: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>'
};

export const TABS = [
  { path: '/', label: 'Training', icon: 'train' },
  { path: '/plans', label: 'Pläne', icon: 'plans' },
  { path: '/exercises', label: 'Übungen', icon: 'exercises' },
  { path: '/settings', label: 'Einstellungen', icon: 'settings' }
];

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name];
  return svg;
}

export function renderTabbar(container, current) {
  container.replaceChildren(
    ...TABS.map((tab) =>
      h('a', { class: 'tab', href: `#${tab.path}`, 'aria-current': tab.path === current ? 'page' : false }, icon(tab.icon), tab.label)
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
  const render = () => {
    const path = currentPath();
    renderTabbar(tabbar, path);
    view.replaceChildren(routes[path]());
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', render);
  render();
  return render;
}
