// v3.4.0: Körpergewichtsübungen ohne Geräte. Startpool zeigt 136 Übungen; der Plan-Assistent mit „Nur Körpergewicht“
// nimmt Kniebeuge, Ausfallschritt, Glute Bridge ohne Gewicht und Y/T-Heben; der Hinweis nennt das fehlende Gerät
// fürs Rudern. Dunkel und hell.
// Aufruf: node tests/browser/check-v340.mjs [Ordner für Screenshots]
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
  await p.goto(srv.url + '/index.html#/exercises'); await p.waitForTimeout(400);
  if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const tag = theme;

  await p.getByRole('button', { name: /Startpool-Übungen übernehmen/ }).click(); await p.waitForTimeout(300);
  const pool = await p.evaluate(() => [...document.querySelectorAll('.sheet')].pop().innerText);
  ok(/136 übernehmen/.test(pool), `${tag}: Startpool mit 136 Übungen`);
  await p.getByRole('button', { name: /^136 übernehmen/ }).click(); await p.waitForTimeout(400);
  const lib = await p.evaluate(() => document.getElementById('view').innerText);
  ok(['Kniebeuge ohne Gewicht', 'Ausfallschritte rückwärts ohne Gewicht', 'Glute Bridge ohne Gewicht', 'Pike Push-up', 'Y/T-Heben in Bauchlage', 'Türrahmen-Push-up', 'Kniebeuge auf den Stuhl', 'Balanceboard-Wadenheben'].every((n) => lib.includes(n)), `${tag}: die acht neuen Übungen in der Bibliothek`);
  if (shots) await p.screenshot({ path: `${shots}/v340-${theme}-lib.png`, fullPage: false });

  await p.evaluate(() => { location.hash = '#/plans'; }); await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Plan vorschlagen lassen' }).click(); await p.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(120); }
  await p.getByRole('button', { name: /Nur Körpergewicht/ }).click(); await p.waitForTimeout(120);
  await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(120);
  await p.getByRole('button', { name: 'Vorschlag ansehen' }).click(); await p.waitForTimeout(300);
  const a = await p.evaluate(() => document.querySelector('.assist')?.innerText || '');
  ok(/Kniebeuge ohne Gewicht/.test(a) && /Glute Bridge ohne Gewicht/.test(a), `${tag}: Assistent nimmt die neuen Übungen (GK A)`);
  ok(/Rudern \(Band oder Stange\)/.test(a) && !/Kniebeuge-Muster/.test(a), `${tag}: Hinweis nennt das fehlende Gerät, Kniebeuge fehlt nicht mehr`);
  ok(!/object HTML/.test(a), `${tag}: kein [object HTML…]`);
  if (shots) await p.screenshot({ path: `${shots}/v340-${theme}-assist.png` });
  await p.getByRole('tab', { name: 'GK B' }).click(); await p.waitForTimeout(150);
  const bTab = await p.evaluate(() => document.querySelector('.assist')?.innerText || '');
  ok(/Ausfallschritte rückwärts ohne Gewicht/.test(bTab) && /Y\/T-Heben in Bauchlage/.test(bTab), `${tag}: GK B mit Ausfallschritt und Y/T-Heben`);
  ok(errs.length === 0, `${tag}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await p.context().close();
}
await b.close(); await srv.close();
done();
