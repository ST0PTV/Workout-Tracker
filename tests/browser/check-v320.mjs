// v3.2.0: Plan-Assistent (Variante A). Leere Pläne-Seite → „Plan vorschlagen lassen“ → fünf Fragen → Vorschau →
// Übernehmen → zwei Pläne mit Tagen. Dazu: Geräte „Zu Hause“ zeigt den Hinweis auf fehlende Muster. Dunkel und hell.
// Aufruf: node tests/browser/check-v320.mjs [Ordner für Screenshots]
import { launch, startServer, checker } from './lib.mjs';

const shots = process.argv[2] || null;
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();

for (const theme of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html#/plans'); await p.waitForTimeout(400);
  if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const tag = theme;

  await p.getByRole('button', { name: 'Plan vorschlagen lassen' }).click(); await p.waitForTimeout(350);
  const q1 = await p.evaluate(() => document.querySelector('.assist')?.innerText || '');
  ok(/Frage 1 von 5/.test(q1) && /Was ist dein Ziel\?/.test(q1), `${tag}: Frage 1 erscheint`);
  // Frage 1 → 2, dort 3 Tage gewählt (Standard), Tap-Ziele groß
  await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(200);
  const opt = await p.evaluate(() => { const r = document.querySelector('.as-opt').getBoundingClientRect(); return { h: Math.round(r.height), on: document.querySelector('.as-opt.on')?.innerText.split('\n')[1] }; });
  ok(opt.h >= 64 && /3 Tage/.test(opt.on || ''), `${tag}: Antwortkarten ≥ 64 pt, 3 Tage vorausgewählt (${JSON.stringify(opt)})`);
  if (shots) await p.screenshot({ path: `${shots}/v320-${theme}-q2.png` });
  // Antwort ändern: 4 Tage
  await p.getByRole('button', { name: /^4\s*4 Tage/ }).click(); await p.waitForTimeout(150);
  for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(150); }
  await p.getByRole('button', { name: 'Vorschlag ansehen' }).click(); await p.waitForTimeout(300);
  const prev = await p.evaluate(() => document.querySelector('.assist')?.innerText || '');
  ok(/Dein Plan/.test(prev) && /Oberkörper \/ Unterkörper · 4 Tage/.test(prev) && /Schätzung/.test(prev) && /Sätze pro Muskel und Woche/.test(prev), `${tag}: Vorschau mit Split, Schätzung und Muskelsätzen`);
  const noOverflow = await p.evaluate(() => { const s = document.querySelector('.sheet').getBoundingClientRect(); return [...document.querySelectorAll('.assist *')].every((e) => { const r = e.getBoundingClientRect(); return r.width === 0 || (r.left >= s.left - 1 && r.right <= s.right + 1); }); });
  ok(noOverflow, `${tag}: nichts ragt seitlich aus dem Sheet`);
  if (shots) await p.screenshot({ path: `${shots}/v320-${theme}-preview.png` });
  // ⓘ öffnet Quellen
  await p.getByRole('button', { name: 'So entsteht der Vorschlag' }).click(); await p.waitForTimeout(300);
  const info = await p.evaluate(() => [...document.querySelectorAll('.sheet')].pop().innerText);
  ok(/Startpunkt/.test(info) && /Details und Quellen/.test(info), `${tag}: Info-Sheet mit Quellen`);
  await p.locator('.sheet-close').last().click(); await p.waitForTimeout(250);
  // Übernehmen
  await p.getByRole('button', { name: 'Übernehmen' }).click(); await p.waitForTimeout(500);
  const plans = await p.evaluate(() => [...document.querySelectorAll('.pcard b')].map((x) => x.textContent));
  const days = await p.evaluate(() => [...document.querySelectorAll('.pcard small')].map((x) => x.textContent));
  ok(plans.join() === 'Oberkörper,Unterkörper' && days.every((d) => /Mo|Di|Do|Fr/.test(d)), `${tag}: zwei Pläne mit Tagen angelegt (${plans.join(', ')} | ${days.join(' / ')})`);
  if (shots) await p.screenshot({ path: `${shots}/v320-${theme}-plans.png` });

  // Zu Hause mit Kurzhanteln → Hinweis auf fehlende Muster; FAB-Sheet bietet den Assistenten an
  await p.locator('.fab').click(); await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Plan vorschlagen lassen' }).click(); await p.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(120); }
  await p.getByRole('button', { name: /Zu Hause mit Kurzhanteln/ }).click(); await p.waitForTimeout(120);
  await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(120);
  await p.getByRole('button', { name: 'Vorschlag ansehen' }).click(); await p.waitForTimeout(300);
  const home = await p.evaluate(() => document.querySelector('.assist')?.innerText || '');
  ok(/Nicht alles passt zu deinen Geräten/.test(home) && /Ziehen von oben/.test(home), `${tag}: Hinweis auf fehlende Muster bei Kurzhanteln`);
  if (shots) await p.screenshot({ path: `${shots}/v320-${theme}-home.png` });

  ok(errs.length === 0, `${tag}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await p.context().close();
}
await b.close(); await srv.close();
done();
