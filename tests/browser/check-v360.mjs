// v3.6.0: Technik-Animationen in der Mobility-Routine (Sheet-Liste und Ablaufansicht), dunkel und hell.
// Aufruf: node tests/browser/check-v360.mjs [Ordner für Screenshots]
import { launch, startServer, checker } from './lib.mjs';
const shots = process.argv[2] || null;
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();
for (const theme of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await p.evaluate(async () => { const m = await import('./js/routine-view.js'); m.openRoutine('tpl:mob-full-15', () => {}); });
  await p.waitForTimeout(500);
  const n = await p.locator('.routine .info-btn[aria-label^="Technik"]').count();
  ok(n === 4, `${theme}: Liste zeigt 4 Technik-Knöpfe in der Mobility-Vorlage (${n})`);
  await p.locator('.routine .info-btn[aria-label^="Technik"]').first().click(); await p.waitForTimeout(1200);
  ok(await p.locator('.anim-svg').count() === 1, `${theme}: Animation öffnet aus der Liste`);
  if (shots) await p.screenshot({ path: `${shots}/v360-${theme}-sheet.png` });
  await p.evaluate(() => { document.querySelectorAll('.sheet').forEach((s) => s.querySelector('.close, [aria-label="Schließen"]')?.click()); });
  await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(async () => { const m = await import('./js/routine-view.js'); m.openRoutine('tpl:mob-full-15', () => {}); });
  await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Starten', exact: true }).click(); await p.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: /^(Weiter)$/ }).click(); await p.waitForTimeout(150); }
  const tech = p.getByRole('button', { name: 'Technik ansehen' });
  ok(await tech.count() === 1, `${theme}: Ablauf zeigt „Technik ansehen“ bei Kniebeuge auf den Stuhl`);
  await tech.click(); await p.waitForTimeout(1200);
  ok(await p.locator('.anim-svg').count() === 1, `${theme}: Animation öffnet im Ablauf`);
  if (shots) await p.screenshot({ path: `${shots}/v360-${theme}-run.png` });
  ok(errs.length === 0, `${theme}: keine Konsolenfehler ${errs.slice(0, 2).join(' | ')}`);
  await p.context().close();
}
await b.close(); await srv.close(); done();
