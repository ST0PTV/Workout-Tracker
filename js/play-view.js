// v3.1.0: Play-Knopf in der Tab-Leiste → Sheet „Training starten“ mit dem nächsten Plan als großer Taste
// (Nutzerwahl: Sheet statt Sofortstart) und den übrigen Plänen darunter. Läuft schon ein Training, geht es dorthin.
import { h } from './util.js';
import { openSheet } from './sheet.js';
import { icon } from './icons.js';
import * as P from './plans.js';
import * as S from './session.js';
import { nextPlan, lastTrained } from './next-plan.js';
import { planStarter, startFree } from './training-view.js';

const REASON = { today: 'Heute geplant', never: 'Noch nie trainiert' };
const lastText = (t) => (t === -Infinity ? 'Noch nie trainiert' : `Zuletzt am ${new Date(t).toLocaleDateString('de-DE')}`);
const count = (p) => `${p.items.length} ${p.items.length === 1 ? 'Übung' : 'Übungen'}`;

export function openPlaySheet(router) {
  const toTraining = () => { if ((location.hash.replace(/^#/, '') || '/') !== '/') location.hash = '#/'; else router(); };
  if (S.activeSession()) { toTraining(); return; }
  const plans = P.listPlans().sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const past = S.finishedSessions();
  const sug = nextPlan(plans, past);
  const startPlan = planStarter(toTraining);
  let sheet = null;
  const run = (fn) => () => { sheet.close(); fn(); };
  const free = h('button', { class: 'btn block subtle', type: 'button', onclick: run(() => startFree(toTraining)) }, 'Freies Training');
  if (!sug) {
    sheet = openSheet(h('div', { class: 'editor' },
      h('p', { class: 'muted' }, 'Noch kein Plan mit Übungen. Lege einen Plan an oder trainiere frei.'),
      h('button', { class: 'btn primary block', type: 'button', onclick: run(() => startFree(toTraining)) }, 'Freies Training starten'),
      h('button', { class: 'btn block subtle', type: 'button', onclick: run(() => { location.hash = '#/plans'; }) }, 'Plan anlegen')), { title: 'Training starten' });
    return;
  }
  const p = sug.plan;
  const reason = REASON[sug.reason] || `${lastText(sug.last)} · am längsten her`;
  const others = plans.filter((x) => x.id !== p.id && x.items.length);
  sheet = openSheet(h('div', { class: 'editor' },
    h('div', { class: 'card play-next' },
      h('span', { class: 'pn-label muted small' }, 'Als Nächstes'),
      h('b', { class: 'pn-name' }, p.name),
      h('small', { class: 'muted' }, `${count(p)} · ${reason}`),
      h('button', { class: 'btn primary block', type: 'button', onclick: run(() => startPlan(p)) }, icon('play', { size: 18 }), `${p.name} starten`)),
    others.length ? h('div', { class: 'sec' }, 'Anderer Plan') : null,
    others.length ? h('div', { class: 'card list' }, others.map((x) => h('button', { class: 'row', type: 'button', 'aria-label': `${x.name} starten`, onclick: run(() => startPlan(x)) },
      h('span', { class: 't' }, h('b', {}, x.name), h('small', {}, `${count(x)} · ${lastText(lastTrained(x.id, past))}`)),
      h('span', { class: 'chev' }, icon('play', { size: 18 }))))) : null,
    free), { title: 'Training starten' });
}
