// v3.8.0: Plan-Assistent mit Wochentage-Auswahl. Tasten, Grenzen 2–5, Split-Anzeige, Hinweis, Vorschau mit den Tagen. Dunkel und hell.
// Aufruf: node tests/browser/check-v380.mjs [Ordner für Screenshots]
import { launch, startServer, checker, BAD_TEXT } from './lib.mjs';
const shots = process.argv[2] || null;
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();
const sheetText = (p) => p.evaluate(() => [...document.querySelectorAll('.sheet')].pop()?.innerText || '');
const pressed = (p) => p.evaluate(() => [...document.querySelectorAll('.as-day')].map((e) => e.getAttribute('aria-pressed') === 'true'));
const disabled = (p) => p.evaluate(() => [...document.querySelectorAll('.as-day')].map((e) => e.disabled));
for (const theme of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await p.evaluate(async () => { const v = await import('./js/assistant-view.js'); v.openAssistant(() => {}); });
  await p.waitForTimeout(400);
  // Frage 1: Ziel → weiter
  await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(200);
  // Frage 2: Wochentage
  let t = await sheetText(p);
  ok(/An welchen Tagen trainierst du\?/.test(t), `${theme}: Frage „An welchen Tagen“`);
  ok(JSON.stringify(await pressed(p)) === JSON.stringify([true, false, true, false, true, false, false]), `${theme}: Standard Mo · Mi · Fr`);
  ok(/3 Tage/.test(t) && /Ganzkörper · guter Start/.test(t), `${theme}: zeigt „3 Tage“ und den Split`);
  const box = await p.locator('.as-day').first().boundingBox();
  ok(box.height >= 44 && box.width >= 44, `${theme}: Taste groß genug (${Math.round(box.width)}×${Math.round(box.height)})`);
  if (shots) await p.screenshot({ path: `${shots}/v380-${theme}-3.png` });
  // Mo, Di, Mi → Hinweis; Fr abwählen
  await p.locator('.as-day').nth(1).click(); await p.locator('.as-day').nth(4).click();
  t = await sheetText(p);
  ok(/Ganzkörper-Training ist ein freier Tag dazwischen üblich/.test(t), `${theme}: Hinweis bei direkt hintereinander`);
  if (shots) await p.screenshot({ path: `${shots}/v380-${theme}-hint.png` });
  // auf 1 Tag → Weiter gesperrt
  await p.locator('.as-day').nth(0).click(); await p.locator('.as-day').nth(1).click();
  t = await sheetText(p);
  ok(/Noch 1 Tag wählen/.test(t), `${theme}: „Noch 1 Tag wählen“ bei einem Tag`);
  ok(await p.getByRole('button', { name: 'Weiter' }).isDisabled(), `${theme}: Weiter gesperrt unter 2 Tagen`);
  // auf 5 Tage → übrige gesperrt
  for (const d of [0, 1, 3, 4]) await p.locator('.as-day').nth(d).click();
  t = await sheetText(p);
  ok(JSON.stringify(await disabled(p)) === JSON.stringify([false, false, true, false, false, true, true]) || (await disabled(p)).filter(Boolean).length === 2, `${theme}: bei 5 Tagen sind die übrigen zwei gesperrt`);
  ok(/5 Tage/.test(t) && /Drücken \/ Ziehen \/ Beine/.test(t) && /höchstens 5 Tage/.test(t), `${theme}: 5 Tage zeigt Split und Grenze`);
  if (shots) await p.screenshot({ path: `${shots}/v380-${theme}-5.png` });
  // Di, Do, Sa (3 Tage): zuerst Mi (2) abwählen und Tage umstellen
  await p.evaluate(() => { for (const i of [0, 1, 2, 3, 4, 5, 6]) { const e = document.querySelectorAll('.as-day')[i]; if (e.getAttribute('aria-pressed') === 'true') e.click(); } });
  for (const d of [1, 3, 5]) await p.locator('.as-day').nth(d).click();
  ok(JSON.stringify(await pressed(p)) === JSON.stringify([false, true, false, true, false, true, false]), `${theme}: Di · Do · Sa gewählt`);
  // weiter bis zur Vorschau: Dauer, Geräte, Erfahrung, dann Vorschlag
  for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(150); }
  await p.getByRole('button', { name: 'Vorschlag ansehen' }).click(); await p.waitForTimeout(300);
  t = await sheetText(p);
  ok(/Ganzkörper A · Di · Sa/.test(t), `${theme}: Vorschau zeigt Ganzkörper A · Di · Sa`);
  await p.getByRole('tab').nth(1).click(); await p.waitForTimeout(150);
  ok(/Ganzkörper B · Do/.test(await sheetText(p)), `${theme}: Ganzkörper B · Do`);
  ok(!BAD_TEXT.test(t) && !t.includes('[object'), `${theme}: kein null/undefined/[object]`);
  // Zurück bewahrt die Auswahl
  await p.getByRole('button', { name: 'Zurück' }).first().click();
  for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: 'Zurück' }).first().click(); await p.waitForTimeout(100); }
  ok(JSON.stringify(await pressed(p)) === JSON.stringify([false, true, false, true, false, true, false]), `${theme}: Auswahl bleibt beim Zurückgehen`);
  ok(errs.length === 0, `${theme}: keine Konsolenfehler ${errs.join(' | ')}`);
}
await b.close(); await srv.close(); done();
