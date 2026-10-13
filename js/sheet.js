// Bottom Sheets (stapelbar). Schließen per Hintergrund-Tipp, Griff-Tipp, Escape oder close().
import { h } from './util.js';
import { icon } from './icons.js';

const stack = [];

function onKey(e) {
  if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close();
}

export function openSheet(content, { title = '', full = false, onClose = null } = {}) {
  const overlay = h('div', { class: 'sheet-overlay' });
  const closeBtn = h('button', { class: 'sheet-close', type: 'button', 'aria-label': 'Schließen' }, icon('close', { size: 18 }));
  const panel = h(
    'div',
    { class: `sheet${full ? ' full' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' },
    h('div', { class: 'sheet-grab', 'aria-hidden': 'true' }),
    title ? h('div', { class: 'sheet-head' }, h('h2', {}, title), closeBtn) : null,
    h('div', { class: 'sheet-body' }, content)
  );
  const entry = {
    panel,
    close() {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      overlay.remove();
      panel.remove();
      if (!stack.length) {
        document.removeEventListener('keydown', onKey);
        document.body.classList.remove('sheet-open');
      }
      if (onClose) onClose();
    }
  };
  overlay.addEventListener('click', () => entry.close());
  closeBtn.addEventListener('click', () => entry.close());
  panel.querySelector('.sheet-grab').addEventListener('click', () => entry.close());
  if (!stack.length) document.addEventListener('keydown', onKey);
  stack.push(entry);
  document.body.classList.add('sheet-open');
  document.body.append(overlay, panel);
  requestAnimationFrame(() => panel.classList.add('in'));
  return entry;
}

export function closeAllSheets() {
  while (stack.length) stack[stack.length - 1].close();
}
