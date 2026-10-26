// v3.5.2: Tab-Leiste mit neuen Icons – Training = Klemmbrett mit Haken, Pläne = Kalender, Mitte = Hantel statt Play.
// Dunkel und hell; Knopf öffnet weiterhin das Start-Sheet.
// Aufruf: node tests/browser/check-v352.mjs [Ordner für Screenshots]
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
  const d = await p.evaluate(() => ({
    tabs: [...document.querySelectorAll('#tabbar .tab svg')].map((s) => s.innerHTML.length),
    mid: document.querySelector('.tb-play svg').innerHTML,
    w: Math.round(document.querySelector('.tb-play svg').getBoundingClientRect().width)
  }));
  ok(d.mid.includes('rotate(-45') && !d.mid.includes('M8 5.5v13'), `${theme}: Mitte zeigt die Hantel, nicht Play`);
  ok(d.tabs.length === 4 && d.tabs.every((n) => n > 0), `${theme}: vier Tab-Icons gezeichnet`);
  if (shots) await p.screenshot({ path: `${shots}/v352-${theme}-bar.png`, clip: { x: 0, y: 714, width: 390, height: 130 } });
  await p.locator('.tb-play').click(); await p.waitForTimeout(400);
  ok(/Training starten/.test(await p.evaluate(() => [...document.querySelectorAll('.sheet')].pop()?.innerText || '')), `${theme}: Knopf öffnet das Start-Sheet`);
  ok(errs.length === 0, `${theme}: keine Konsolenfehler ${errs.slice(0, 2).join(' | ')}`);
  await p.context().close();
}
await b.close(); await srv.close(); done();
