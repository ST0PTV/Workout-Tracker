// v3.7.0: Einordnung „Mehrgelenkige Grundübung / Eingelenkige Übung“ in der Pool-Info. Dunkel und hell, keine Konsolenfehler.
// Aufruf: node tests/browser/check-v370.mjs [Ordner für Screenshots]
import { launch, startServer, checker, BAD_TEXT } from './lib.mjs';
const shots = process.argv[2] || null;
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();
const CASES = [['back-squat', 'Mehrgelenkige Grundübung'], ['lateral-raise-dumbbell', 'Eingelenkige Übung'], ['treadmill-running', null]];
for (const theme of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  if (theme === 'light') { await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); }
  for (const [ref, want] of CASES) {
    await p.evaluate(async (r) => { const v = await import('./js/exercises-view.js'); v.openEvidence(r); }, ref);
    await p.waitForTimeout(500);
    const txt = await p.evaluate(() => [...document.querySelectorAll('.sheet')].pop()?.innerText || '');
    if (want) ok(txt.includes('Art: ' + want), `${theme} ${ref}: „Art: ${want}“`);
    else ok(!/Art: /.test(txt), `${theme} ${ref}: Cardio ohne Einordnung`);
    ok(!BAD_TEXT.test(txt) && !txt.includes('[object'), `${theme} ${ref}: kein null/undefined/[object]`);
    if (shots) await p.screenshot({ path: `${shots}/v370-${theme}-${ref}.png` });
    await p.keyboard.press('Escape');
    await p.evaluate(() => { document.querySelectorAll('.sheet, .sheet-backdrop, .overlay').forEach((e) => e.remove()); });
  }
  ok(errs.length === 0, `${theme}: keine Konsolenfehler ${errs.join(' | ')}`);
}
await b.close(); await srv.close(); done();
