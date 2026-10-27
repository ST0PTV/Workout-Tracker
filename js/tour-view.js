// v3.9.0: Tutorial-Oberfläche – Rundgang mit Spotlight (A), Probetraining in der Sandbox (B), Tipps (D).
// Logik und Texte in tutorial.js. Das Spotlight dunkelt alles außer dem Ziel ab (vier Flächen um ein „Loch“);
// im Rundgang ist das Ziel gesperrt, im Probetraining lässt das Loch Taps durch.
import { h } from './util.js';
import * as store from './store.js';
import * as S from './session.js';
import { toast, currentPath } from './ui.js';
import { closeAllSheets } from './sheet.js';
import { TOUR_STEPS, TRIAL_STEPS, pendingTips, withTutorial, trialData, TRIAL_PLAN_NAME } from './tutorial.js';

let active = null; // 'tour' | 'trial' | null
export const tutorialActive = () => active !== null;

const rerender = () => document.dispatchEvent(new CustomEvent('wt-rerender'));
const saveTut = (patch) => store.set('settings', withTutorial(store.get('settings'), patch));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

function visible(e) {
  const r = e.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cs = getComputedStyle(e);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]');
}

/** Erstes sichtbares Ziel eines Schritts (Text muss passen, falls angegeben), sonst Ersatz-Ziel, sonst null. */
export function findTarget(step) {
  for (const sel of step.target || []) {
    const el = [...document.querySelectorAll(sel)].find((e) => visible(e) && (!step.match || e.innerText.includes(step.match)));
    if (el) return el;
  }
  for (const sel of step.fallback || []) {
    const el = [...document.querySelectorAll(sel)].find(visible);
    if (el) return el;
  }
  return null;
}

async function go(route) {
  if (currentPath() !== route) location.hash = '#' + route;
  await frames(); await wait(120);
}

const sheetOpen = () => [...document.querySelectorAll('.sheet')].some(visible);

// ---------- Spotlight ----------
function spotlight() {
  const dims = [0, 1, 2, 3].map(() => h('div', { class: 'tt-dim' }));
  const ring = h('div', { class: 'tt-ring' });
  const block = h('div', { class: 'tt-block' }); // sperrt das Ziel im Rundgang
  const arrow = h('div', { class: 'tt-arrow' });
  const bubble = h('div', { class: 'tt-bub', role: 'dialog', 'aria-live': 'polite', 'aria-modal': 'true' });
  const root = h('div', { class: 'tt-root' }, ...dims, ring, block, arrow, bubble);
  document.body.append(root);
  let cur = { el: null, interactive: false };

  const layout = () => {
    const W = window.innerWidth; const H = window.innerHeight;
    const el = cur.el && cur.el.isConnected && visible(cur.el) ? cur.el : null;
    if (!el) {
      Object.assign(dims[0].style, { left: '0px', top: '0px', width: W + 'px', height: H + 'px' });
      for (const d of dims.slice(1)) d.style.display = 'none';
      ring.style.display = 'none'; block.style.display = 'none'; arrow.style.display = 'none';
      bubble.style.top = Math.max(16, (H - bubble.offsetHeight) / 2) + 'px';
      return;
    }
    const pad = 6;
    const r = el.getBoundingClientRect();
    const x0 = Math.max(0, r.left - pad); const y0 = Math.max(0, r.top - pad);
    const x1 = Math.min(W, r.right + pad); const y1 = Math.min(H, r.bottom + pad);
    for (const d of dims) d.style.display = '';
    Object.assign(dims[0].style, { left: '0px', top: '0px', width: W + 'px', height: y0 + 'px' });
    Object.assign(dims[1].style, { left: '0px', top: y1 + 'px', width: W + 'px', height: Math.max(0, H - y1) + 'px' });
    Object.assign(dims[2].style, { left: '0px', top: y0 + 'px', width: x0 + 'px', height: (y1 - y0) + 'px' });
    Object.assign(dims[3].style, { left: x1 + 'px', top: y0 + 'px', width: Math.max(0, W - x1) + 'px', height: (y1 - y0) + 'px' });
    Object.assign(ring.style, { display: '', left: x0 + 'px', top: y0 + 'px', width: (x1 - x0) + 'px', height: (y1 - y0) + 'px' });
    Object.assign(block.style, { display: cur.interactive ? 'none' : '', left: x0 + 'px', top: y0 + 'px', width: (x1 - x0) + 'px', height: (y1 - y0) + 'px' });
    const bh = bubble.offsetHeight; const gap = 16;
    const below = H - y1 >= bh + gap + 12 || y0 < bh + gap + 12;
    const top = below ? Math.min(H - bh - 8, y1 + gap) : Math.max(8, y0 - gap - bh);
    bubble.style.top = top + 'px';
    const ax = Math.min(W - 36, Math.max(28, (x0 + x1) / 2 - 9));
    Object.assign(arrow.style, { display: '', left: ax + 'px', top: (below ? top - 8 : top + bh - 10) + 'px' });
  };

  const onMove = () => layout();
  window.addEventListener('resize', onMove);
  document.addEventListener('scroll', onMove, true);

  return {
    root,
    show({ el, interactive = false, title, body, step = '', actions = [] }) {
      cur = { el, interactive };
      root.hidden = false;
      bubble.replaceChildren(
        title ? h('b', { class: 'tt-title' }, title) : null,
        h('p', { class: 'tt-text' }, body),
        h('div', { class: 'tt-row' },
          h('span', { class: 'tt-step' }, step),
          h('span', { class: 'tt-acts' }, actions.map((a) => h('button', { type: 'button', class: a.primary ? 'btn primary' : 'tt-link', onclick: a.onClick }, a.label)))));
      if (el && visible(el)) {
        const r = el.getBoundingClientRect();
        if (r.top < 60 || r.bottom > window.innerHeight - 160) el.scrollIntoView({ block: 'center' });
      }
      layout();
      requestAnimationFrame(layout);
      bubble.querySelector('.btn.primary, .tt-link')?.focus({ preventScroll: true });
    },
    hide() { root.hidden = true; },
    relayout: layout,
    remove() { window.removeEventListener('resize', onMove); document.removeEventListener('scroll', onMove, true); root.remove(); }
  };
}

// ---------- A: Rundgang ----------
export async function startTour() {
  if (active) return;
  closeAllSheets(); hideTip();
  active = 'tour';
  const sp = spotlight();
  let i = 0;
  const finish = (status, then = null) => {
    document.removeEventListener('keydown', onKey);
    sp.remove(); active = null;
    saveTut({ tour: status });
    go('/').then(() => { rerender(); if (then) then(); });
  };
  const onKey = (e) => { if (e.key === 'Escape') finish('skipped'); };
  document.addEventListener('keydown', onKey);
  const show = async () => {
    if (i >= TOUR_STEPS.length) {
      sp.show({ el: null, title: 'Fertig', body: 'Willst du jetzt ein Probetraining ausprobieren? Dabei wird nichts gespeichert.',
        actions: [{ label: 'Später', onClick: () => finish('done') }, { label: 'Probetraining starten', primary: true, onClick: () => finish('done', startTrial) }] });
      return;
    }
    const st = TOUR_STEPS[i];
    await go(st.route);
    const el = findTarget(st);
    sp.show({ el, title: st.title, body: st.body, step: `Schritt ${i + 1} von ${TOUR_STEPS.length}`,
      actions: [
        i > 0 ? { label: 'Zurück', onClick: () => { i -= 1; show(); } } : { label: 'Überspringen', onClick: () => finish('skipped') },
        { label: i === TOUR_STEPS.length - 1 ? 'Fertig' : 'Weiter', primary: true, onClick: () => { i += 1; show(); } }
      ] });
  };
  await show();
}

// ---------- B: Probetraining ----------
let trial = null;
export function startTrial() {
  if (active) return;
  if (S.activeSession()) { toast('Beende zuerst dein laufendes Training. Danach kannst du das Probetraining starten.'); return; }
  closeAllSheets(); hideTip();
  const real = store.get('settings');
  if (!store.startSandbox(trialData(real))) return;
  active = 'trial';
  const plan = store.get('plans').find((p) => p.name === TRIAL_PLAN_NAME);
  const started = S.startFromPlan(plan.id);
  if (!started?.ok && !S.activeSession()) { store.endSandbox(); active = null; toast('Probetraining konnte nicht starten.', { error: true }); return; }
  const sp = spotlight();
  const banner = h('div', { class: 'tt-banner', role: 'status' },
    h('span', {}, 'Probetraining · nichts wird gespeichert'),
    h('button', { type: 'button', class: 'tt-banner-end', onclick: () => endTrial(false) }, 'Beenden'));
  document.body.append(banner);
  document.body.classList.add('tt-trial');
  trial = { sp, banner, idx: 0, final: false, obs: null, shownKey: '' };
  const tick = () => {
    if (!trial) return;
    if (trial.final) return;
    const session = S.activeSession();
    if (!session) { // Training beendet (Zusammenfassung zu) → Abschluss
      if (sheetOpen()) { sp.hide(); return; }
      trial.final = true;
      sp.show({ el: null, title: 'Geschafft!', body: 'So läuft ein Training ab. Das war nur eine Probe – deine echten Daten sind unverändert.',
        actions: [{ label: 'Fertig', primary: true, onClick: () => endTrial(true) }] });
      return;
    }
    const view = document.getElementById('view');
    const st = TRIAL_STEPS[trial.idx];
    if (st.until === 'rest' && document.querySelector('.restbar:not([hidden])')) { trial.idx += 1; return tick(); }
    if (st.until === 'second' && /Übung 2 von 2/.test(view.innerText)) { trial.idx += 1; return tick(); }
    if (sheetOpen()) { sp.hide(); trial.shownKey = ''; return; }
    const el = findTarget(st);
    const key = st.id + (el ? '1' : '0');
    if (key === trial.shownKey) { sp.relayout(); return; }
    trial.shownKey = key;
    const actions = st.until === null
      ? [{ label: 'Überspringen', onClick: () => endTrial(false) }, { label: 'Weiter', primary: true, onClick: () => { trial.idx += 1; trial.shownKey = ''; tick(); } }]
      : [{ label: 'Überspringen', onClick: () => endTrial(false) }];
    sp.show({ el, interactive: true, title: st.title, body: st.body, step: `Probieren ${trial.idx + 1} von ${TRIAL_STEPS.length}`, actions });
  };
  trial.obs = new MutationObserver((recs) => {
    if (recs.every((r) => sp.root.contains(r.target) || banner.contains(r.target))) return;
    tick();
  });
  go('/').then(() => {
    rerender();
    trial?.obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    setTimeout(tick, 150);
  });
}

export function endTrial(done) {
  if (!trial) return;
  trial.obs.disconnect(); trial.sp.remove(); trial.banner.remove();
  document.body.classList.remove('tt-trial');
  trial = null;
  closeAllSheets();
  S.stopRest?.();
  store.endSandbox();
  active = null;
  saveTut({ trial: done ? 'done' : 'skipped' });
  go('/').then(rerender);
  toast(done ? 'Probetraining fertig. Deine Daten sind unverändert.' : 'Probetraining beendet. Deine Daten sind unverändert.');
}

// ---------- D: Tipps ----------
let tip = null;
function hideTip() { if (tip) { tip.remove(); tip = null; } }

export function maybeTip(path = currentPath()) {
  hideTip();
  if (active || store.inSandbox() || sheetOpen()) return;
  for (const t of pendingTips(path, store.get('settings'))) {
    const el = findTarget(t);
    if (!el) continue;
    const box = h('div', { class: 'tt-tip', role: 'dialog', 'aria-live': 'polite' },
      h('p', {}, t.body),
      h('button', { type: 'button', class: 'tt-tip-ok', onclick: () => { saveTut({ tips: { [t.id]: true } }); hideTip(); } }, 'Verstanden'));
    const arrow = h('div', { class: 'tt-tip-arrow' });
    const wrap = h('div', { class: 'tt-tipwrap' }, arrow, box);
    document.body.append(wrap);
    const place = () => {
      if (!el.isConnected) { hideTip(); return; }
      const r = el.getBoundingClientRect(); const W = window.innerWidth; const H = window.innerHeight;
      const bh = box.offsetHeight; const below = H - r.bottom >= bh + 24;
      const top = below ? r.bottom + 12 : Math.max(8, r.top - 12 - bh);
      box.style.top = top + 'px';
      arrow.style.left = Math.min(W - 30, Math.max(20, (r.left + r.right) / 2 - 8)) + 'px';
      arrow.style.top = (below ? top - 7 : top + bh - 9) + 'px';
    };
    const onScroll = () => place();
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    tip = { remove: () => { document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll); wrap.remove(); } };
    requestAnimationFrame(place); place();
    return;
  }
}

/** Alle Tipps wieder zeigen (Einstellungen). */
export function resetTips() {
  const st = store.get('settings');
  store.set('settings', { ...st, tutorial: { ...withTutorial(st, {}).tutorial, tips: {} } });
}
