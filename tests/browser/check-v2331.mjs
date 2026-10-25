// v2.33.1: Browser-Prüfung – Abstand zwischen Aufwärmen, „Übungen hinzufügen“ und Cool-down im Plan-Editor.
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v2331.mjs   (Screenshots in WT_OUT/v2331)
import { launch, startServer, checker, outDir } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('v2331');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const shot = (name) => p.screenshot({ path: join(out, `${name}.png`) });

await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
await p.evaluate(async () => {
  const lib = await import('./js/exercises.js');
  const P = await import('./js/plans.js');
  P.newPlan('Leer');
  const pl = P.newPlan('Mit Übungen').plan;
  P.addExercises(pl.id, ['back-squat', 'romanian-deadlift'].map((r) => lib.addFromPool(r).exercise.id));
});

// Abstände (CSS-Pixel) zwischen den drei Kästen im geöffneten Plan
const gaps = () => p.evaluate(() => {
  const sheet = document.querySelectorAll('.sheet'); const s = sheet[sheet.length - 1];
  const slots = [...s.querySelectorAll('.slot')];
  const add = s.querySelector('.addline');
  if (slots.length < 2 || !add) return null;
  const r = (el) => el.getBoundingClientRect();
  const prev = add.previousElementSibling; // Aufwärm-Karte oder letzter Eintrag/Hinweis
  return { above: r(add).top - r(prev).bottom, below: r(slots[slots.length - 1]).top - r(add).bottom };
});

// Neuer, leerer Plan (Übungen-Taste immer sichtbar)
await p.goto(srv.url + '/index.html#/plans'); await p.waitForTimeout(500);
await p.locator('.pcard', { hasText: 'Leer' }).first().click(); await p.waitForTimeout(500);
let g = await gaps();
ok(g && g.below >= 12, `A: leerer Plan – Abstand unter „Übungen hinzufügen“ ≥ 12 px (${g && g.below})`);
ok(g && Math.abs(g.above - g.below) <= 2, `A: Abstand oben und unten gleich (${g && g.above} / ${g && g.below})`);
await shot('1-empty-plan');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// Plan mit Übungen im Bearbeiten-Modus
await p.locator('.pcard', { hasText: 'Mit Übungen' }).first().click(); await p.waitForTimeout(500);
const edit = p.locator('.sheet').last().locator('button', { hasText: /Bearbeiten/ }).first();
if (await edit.count()) { await edit.click(); await p.waitForTimeout(400); }
g = await gaps();
ok(g && g.below >= 12, `A: Bearbeiten-Modus – Abstand unter „Übungen hinzufügen“ ≥ 12 px (${g && g.below})`);
await shot('2-edit-plan');

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log('Screenshots: ' + out);
await b.close(); await srv.close();
done();
