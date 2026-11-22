// v3.15.0 (Wahl des Nutzers 2026-11-22): Rückblick = Zeitraum-Chips (Mockup A) + Gesamtverlauf mit Ausschnitt (aus C).
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v3150b.mjs [Ordner für Screenshots]
import { launch, startServer, checker, loadPlaywright, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';
const shots = process.argv[2] || null;
const pw = await loadPlaywright();
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();

// 60 Wochen Verlauf, 2 Trainings pro Woche, ein paar Pausenwochen.
const seed = async () => {
  const st = await import('./js/store.js');
  st.set('settings', { ...st.get('settings'), onboarded: true, hints: false, homeHint: true, tutorial: { tour: 'done', trial: 'skipped', tips: { 'progress-4w': true } } });
  const lib = await import('./js/exercises.js'); const M = await import('./js/model.js');
  const refs = ['bench-press-barbell', 'chest-press-machine', 'incline-press-dumbbell'];
  const ids = refs.map((r) => lib.addFromPool(r).exercise?.id).filter(Boolean);
  const sessions = [];
  const now = new Date();
  for (let w = 60; w >= 1; w--) {
    if (w % 9 === 0) continue;
    for (const day of [1, 3]) {
      const t = new Date(now); t.setDate(t.getDate() - w * 7 - ((t.getDay() + 6) % 7) + day); t.setHours(18, 0, 0, 0);
      const iso = t.toISOString();
      const n = 2 + ((w + day) % 3);
      sessions.push(M.createSession({ startedAt: iso, endedAt: iso, entries: ids.map((id, k) => M.createEntry(id, { sets: Array.from({ length: n + (k === 0 ? 1 : 0) }, () => M.createSet({ weightKg: 40 + (60 - w) * 0.5, reps: 8, completedAt: iso })) })) }));
    }
  }
  st.set('sessions', sessions);
};

const profiles = [['iPhone SE', 'dark'], ['iPhone SE', 'light'], ['Pixel 7', 'dark'], ['320', 'dark']];
for (const [devName, theme] of profiles) {
  const opts = devName === '320' ? { viewport: { width: 320, height: 640 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : (({ defaultBrowserType, ...o }) => o)(pw.devices[devName]);
  const T = `${devName} ${theme}`;
  const ctx = await b.newContext({ ...opts, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = (n) => (shots ? p.screenshot({ path: join(shots, `v3150b-${devName.replace(/\W+/g, '_')}-${theme}-${n}.png`), fullPage: false }) : null);
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  await p.evaluate(seed);
  await p.evaluate(async (light) => { const st = await import('./js/store.js'); st.set('settings', { ...st.get('settings'), appearance: light ? 'light' : 'dark' }); }, theme === 'light');
  await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = '#/progress'; }); await p.waitForTimeout(400);

  const tab = p.getByRole('tab', { name: 'Rückblick' });
  ok(await tab.count() === 1, `${T}: Reiter heißt „Rückblick“`);
  const tabLines = await p.evaluate(() => [...document.querySelectorAll('#view [role=tab]')].every((t) => t.getBoundingClientRect().height < 40));
  ok(tabLines, `${T}: Reiter einzeilig`);
  await tab.click(); await p.waitForTimeout(400);

  const head = () => p.locator('.a4-head .wk').innerText();
  const cols = () => p.evaluate(() => getComputedStyle(document.querySelector('.a4-grid')).getPropertyValue('--a4n').trim());
  ok(/Letzte 4 Wochen/.test(await head()) && await cols() === '4', `${T}: Standard 4 Wochen, 4 Spalten`);
  ok(await p.locator('.rb-bar').count() === 60, `${T}: Gesamtverlauf mit 60 Wochen (${await p.locator('.rb-bar').count()})`);
  ok(await p.locator('.rb-bar.in').count() === 4, `${T}: Ausschnitt = 4 Wochen`);
  await shot('1-4w');

  await p.locator('.rb-chips .chip', { hasText: '6 M' }).click(); await p.waitForTimeout(400);
  const c6 = await cols();
  const lbl6 = await p.locator('.a4-grid .a4h').nth(1).innerText();
  ok(/Letzte 6 Monate/.test(await head()) && +c6 >= 6 && +c6 <= 7 && /^[A-ZÄ][a-zä]{2}$/.test(lbl6), `${T}: 6 M → ${c6} Monatsspalten („${lbl6}“)`);
  ok(await p.locator('.rb-bar.in').count() === 26, `${T}: Ausschnitt 26 Wochen`);
  ok(await p.locator('.a4-hint').count() === 0, `${T}: kein „Zuletzt wenig trainiert“ außerhalb von 4 W`);
  await shot('2-6m');

  await p.locator('.rb-chips .chip', { hasText: 'Alles' }).click(); await p.waitForTimeout(400);
  const lblAll = await p.locator('.a4-grid .a4h').nth(1).innerText();
  ok(/^Q\d/.test(lblAll) && await p.locator('.rb-bar.in').count() === 60, `${T}: Alles → Quartale („${lblAll}“), ganzer Verlauf`);

  // Ziehen: Rahmen auf eine Stelle setzen und verschieben
  await p.locator('.rb-chips .chip', { hasText: '3 M' }).click(); await p.waitForTimeout(400);
  const box = await p.locator('.rb-chart').boundingBox();
  await p.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
  await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 5 }); await p.mouse.up();
  await p.waitForTimeout(500);
  const firstIn = await p.evaluate(() => [...document.querySelectorAll('.rb-bar')].findIndex((x) => x.classList.contains('in')));
  ok(/Eigener Zeitraum/.test(await head()) && await p.locator('.rb-bar.in').count() === 13 && firstIn > 5 && firstIn < 40, `${T}: Ziehen verschiebt den Ausschnitt (Beginn Woche ${firstIn}, 13 Wochen)`);
  ok(await p.locator('.rb-chips .chip.on').count() === 0, `${T}: kein Voreinstellungs-Chip aktiv`);
  // Griff rechts mit der Tastatur
  await p.locator('.rb-h.hi').focus(); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
  ok(await p.locator('.rb-bar.in').count() === 14, `${T}: Pfeiltaste am Griff verlängert um eine Woche`);
  await shot('3-eigener');

  const over = await p.evaluate(() => document.querySelector('#view').scrollWidth > document.querySelector('#view').clientWidth + 1);
  ok(!over, `${T}: nichts ragt seitlich heraus`);
  ok(!BAD_TEXT.test(await p.locator('#view').innerText()), `${T}: kein null/undefined/NaN`);
  ok(errs.length === 0, `${T}: keine Konsolenfehler ${errs.join(' | ')}`);
  await ctx.close();
}
await b.close(); await srv.close();
done();
