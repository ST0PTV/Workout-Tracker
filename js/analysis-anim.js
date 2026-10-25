// v3.3.0: Animation A vor dem Analyse-Ergebnis (Nutzerwahl 2026-10-26): echte Muskelkarten-Figur vorn und hinten,
// eine Scanlinie läuft von oben nach unten, jeder Muskel blitzt auf und bleibt in seiner Stufe, vier Schritte haken ab.
// Rein optisch – die Rechnung ist schon fertig; deshalb kurz (≈ 2,5 s), per Tipp überspringbar und bei
// „Bewegung reduzieren“ ganz ausgelassen.
import { h } from './util.js';
import { figureSvg } from './figure.js';
import { icon } from './icons.js';

export const ANIM_MS = 2500;
export const STEPS = ['Sätze pro Muskel zählen', 'Balance prüfen', 'Frequenz pro Muskel', 'Dauer schätzen'];

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Spielt die Animation; classOf(muscle) → Endklasse ('lv1'…'lv3', 'an-warn' oder ''). Promise endet nach Ablauf oder Tipp. */
export function playScanAnimation({ classOf, sex = 'male' }) {
  if (reducedMotion()) return Promise.resolve(false);
  return new Promise((resolve) => {
    const figs = ['front', 'back'].map((view) => h('div', { class: 'an-fw' },
      figureSvg({ view, sex, classOf, width: 150 }), h('span', {}, view === 'front' ? 'Vorne' : 'Hinten')));
    const steps = STEPS.map((t, i) => h('div', { class: 'an-step', style: `animation-delay:${0.4 + i * 0.5}s` }, icon('check', { size: 22 }), t));
    const overlay = h('div', { class: 'an-overlay', role: 'status', 'aria-label': 'Analyse läuft' },
      h('p', { class: 'an-ttl' }, 'Analysiere deine Pläne'),
      h('div', { class: 'an-figs' }, ...figs, h('span', { class: 'an-scan', 'aria-hidden': 'true' })),
      h('div', { class: 'an-steps' }, steps),
      h('p', { class: 'an-skip' }, 'Tippen zum Überspringen'));
    document.body.append(overlay);
    // Verzögerung je Muskel nach seiner Höhe in der Figur, damit er aufleuchtet, wenn die Linie ihn erreicht.
    for (const svg of overlay.querySelectorAll('svg')) {
      for (const p of svg.querySelectorAll('.fm')) {
        let y = 0;
        try { y = p.getBBox().y; } catch { /* ohne Layout (Tests) */ }
        p.style.animationDelay = `${(0.15 + 1.1 * Math.max(0, Math.min(1, y / 440))).toFixed(2)}s`;
      }
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      overlay.classList.add('out');
      setTimeout(() => overlay.remove(), 160);
      resolve(true);
    };
    const timer = setTimeout(finish, ANIM_MS);
    overlay.addEventListener('click', finish);
  });
}
