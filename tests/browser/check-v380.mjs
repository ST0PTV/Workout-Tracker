// v3.8.0: Plan-Assistent, Wochentage mit Kraft/Cardio (Variante A): Tippen schaltet frei → Kraft → Cardio → frei,
// höchstens 6 Krafttage, Hinweise, Vorschau mit Cardio-Plan und Ausdauer-Minuten. Dunkel und hell.
// Aufruf: node tests/browser/check-v380.mjs [Ordner für Screenshots]
import { launch, startServer, checker, BAD_TEXT } from './lib.mjs';
const shots = process.argv[2] || null;
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();
const sheetText = (p) => p.evaluate(() => [...document.querySelectorAll('.sheet')].pop()?.innerText || '');
const states = (p) => p.evaluate(() => [...document.querySelectorAll('.as-day')].map((e) => (e.classList.contains('k') ? 'k' : e.classList.contains('c') ? 'c' : '-')).join(''));
const tap = async (p, d, n = 1) => { for (let i = 0; i < n; i++) await p.locator('.as-day').nth(d).click(); };
const setWeek = async (p, want) => { // want z. B. 'k-k-kc-'
  for (let d = 0; d < 7; d++) for (let i = 0; i < 3 && (await states(p))[d] !== want[d]; i++) await tap(p, d);
};
for (const theme of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await p.evaluate(async () => { const v = await import('./js/assistant-view.js'); v.openAssistant(() => {}); });
  await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(200);
  let t = await sheetText(p);
  ok(/An welchen Tagen trainierst du\?/.test(t), `${theme}: Frage „An welchen Tagen“`);
  ok(await states(p) === 'k-k-k--', `${theme}: Standard Mo · Mi · Fr Kraft (${await states(p)})`);
  ok(!/frei/.test(await p.evaluate(() => document.querySelector('.as-week').innerText)), `${theme}: freie Tage ohne Beschriftung`);
  const box = await p.locator('.as-day').first().boundingBox();
  ok(box.height >= 44 && box.width >= 44, `${theme}: Taste groß genug (${Math.round(box.width)}×${Math.round(box.height)})`);
  // Zyklus: frei → Kraft → Cardio → frei
  await tap(p, 1); ok((await states(p))[1] === 'k', `${theme}: 1× tippen = Kraft`);
  await tap(p, 1); ok((await states(p))[1] === 'c', `${theme}: 2× tippen = Cardio`);
  await tap(p, 1); ok((await states(p))[1] === '-', `${theme}: 3× tippen = frei`);
  // 3 Kraft + 2 Cardio
  await setWeek(p, 'kck-kc-');
  t = await sheetText(p);
  ok(/3 × Kraft · 2 × Cardio/.test(t) && /Ganzkörper · guter Start/.test(t), `${theme}: Zusammenfassung 3 × Kraft · 2 × Cardio`);
  ok(await p.locator('.as-day.c svg').count() === 2 && await p.locator('.as-day.k svg').count() === 3, `${theme}: Icons Hantel/Cardio auf den Tasten`);
  if (shots) await p.screenshot({ path: `${shots}/v380-${theme}-mix.png` });
  // 6 Krafttage → siebter freier Tag springt auf Cardio
  await setWeek(p, 'kkkkkk-');
  t = await sheetText(p);
  ok(/Höchstens 6 Krafttage/.test(t), `${theme}: Hinweis höchstens 6 Krafttage`);
  await tap(p, 6); ok((await states(p))[6] === 'c', `${theme}: bei 6 Krafttagen wird ein weiterer Tag Cardio`);
  // nichts gewählt → Weiter gesperrt
  await setWeek(p, '-------');
  ok(await p.getByRole('button', { name: 'Weiter' }).isDisabled() && /Noch keinen Tag gewählt/.test(await sheetText(p)), `${theme}: ohne Tag ist Weiter gesperrt`);
  // 1 Krafttag → Hinweis; Ganzkörper an Folgetagen → Hinweis
  await setWeek(p, '--k----');
  ok(/einmal pro Woche dran/.test(await sheetText(p)), `${theme}: Hinweis bei einem Krafttag`);
  await setWeek(p, 'kk-----');
  ok(/freier Tag dazwischen üblich/.test(await sheetText(p)), `${theme}: Hinweis Ganzkörper an Folgetagen`);
  // Di · Do · Sa Kraft, Mo · Mi Cardio → Vorschau
  await setWeek(p, 'ckck-k-');
  for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(150); }
  await p.getByRole('button', { name: 'Vorschlag ansehen' }).click(); await p.waitForTimeout(300);
  t = await sheetText(p);
  ok(/3 Krafttage · 2 Cardio-Tage/.test(t), `${theme}: Kopfzeile Krafttage und Cardio-Tage`);
  ok(/Ganzkörper A · Di · Sa/.test(t), `${theme}: Ganzkörper A · Di · Sa`);
  ok(/Ausdauer pro Woche/.test(t) && /ca\. 90 min/.test(t) && /WHO/.test(t), `${theme}: Ausdauer pro Woche ca. 90 min mit WHO-Orientierung`);
  await p.getByRole('tab', { name: 'Ausdauer' }).click(); await p.waitForTimeout(150);
  t = await sheetText(p);
  ok(/Ausdauer · Mo · Mi/.test(t) && /Gehen \(zügig, draußen\)/.test(t) && /ca\. 45 min/.test(t), `${theme}: Cardio-Plan Mo · Mi mit zügigem Gehen, ca. 45 min`);
  ok(!BAD_TEXT.test(t) && !t.includes('[object'), `${theme}: kein null/undefined/[object]`);
  if (shots) await p.screenshot({ path: `${shots}/v380-${theme}-preview.png` });
  // Nur Cardio
  await p.getByRole('button', { name: 'Anpassen' }).click(); await p.waitForTimeout(150);
  await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(150);
  await setWeek(p, 'ccccccc');
  for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(150); }
  await p.getByRole('button', { name: 'Vorschlag ansehen' }).click(); await p.waitForTimeout(300);
  t = await sheetText(p);
  ok(/7 Cardio-Tage/.test(t) && !/Sätze pro Muskel/.test(t) && /ca\. 315 min/.test(t), `${theme}: nur Cardio – keine Muskelsätze, 315 min`);
  ok(await p.getByRole('button', { name: 'So entsteht der Vorschlag' }).count() === 1, `${theme}: Info-Knopf auch ohne Krafttage`);
  ok(errs.length === 0, `${theme}: keine Konsolenfehler ${errs.join(' | ')}`);
}
await b.close(); await srv.close(); done();
