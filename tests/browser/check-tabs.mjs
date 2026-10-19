// Klickt durch alle Tabs: keine Konsolenfehler, kein "null/undefined/NaN" im Text, Version in den Einstellungen.
// Aufruf: node tests/browser/check-tabs.mjs [erwartete-Version]   (Standard: APP_VERSION aus js/version.js)
import { launch, startServer, checker, appVersion, BAD_TEXT } from './lib.mjs';

const want = process.argv[2] || appVersion();
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

for (const r of ['#/', '#/plans', '#/exercises', '#/progress', '#/settings']) {
  await p.goto(srv.url + '/index.html' + r); await p.waitForTimeout(600);
  const t = await p.evaluate(() => document.body.innerText);
  ok(!BAD_TEXT.test(t), `${r}: kein null/undefined/NaN im Text`);
  if (r === '#/settings') ok(t.includes(want), `Version ${want} in den Einstellungen sichtbar`);
}
ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
await b.close(); await srv.close();
done();
