// v3.15.0 (Feedback nach dem Test): Startpool in der Suche, Drop vor dem Abhaken, Aufwärmpause,
// Pause läuft beim Übungswechsel weiter, kein Doppeltipp-Zoom. Nur erfundene Testdaten.
// Aufruf: node tests/browser/check-v3150.mjs [Ordner für Screenshots]
import { launch, startServer, checker, loadPlaywright, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';
const shots = process.argv[2] || null;
const pw = await loadPlaywright();
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();

const profiles = [['iPhone SE', 'dark'], ['iPhone SE', 'light'], ['Pixel 7', 'dark'], ['320', 'dark']];
for (const [devName, theme] of profiles) {
  const opts = devName === '320' ? { viewport: { width: 320, height: 640 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : (({ defaultBrowserType, ...o }) => o)(pw.devices[devName]);
  const T = `${devName} ${theme}`;
  const ctx = await b.newContext({ ...opts, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = (n) => (shots ? p.screenshot({ path: join(shots, `v3150-${devName.replace(/\W+/g, '_')}-${theme}-${n}.png`) }) : null);
  const go = async (hash) => { await p.evaluate((x) => { location.hash = x; }, hash); await p.waitForTimeout(400); };
  const sheetText = () => p.evaluate(() => document.querySelector('.sheet')?.innerText || '');
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  await p.evaluate(async (light) => {
    const st = await import('./js/store.js');
    st.set('settings', { ...st.get('settings'), onboarded: true, hints: false, homeHint: true, appearance: light ? 'light' : 'dark', tutorial: { tour: 'done', trial: 'skipped', tips: {} } });
    const lib = await import('./js/exercises.js'); lib.addFromPool('bench-press-barbell');
  }, theme === 'light');
  await p.reload(); await p.waitForTimeout(500);

  // Kein Doppeltipp-Zoom
  ok(await p.evaluate(() => getComputedStyle(document.documentElement).touchAction) === 'manipulation', `${T}: html hat touch-action: manipulation`);

  // Freies Training, Übung hinzufügen: Startpool ist durchsuchbar
  await p.getByRole('button', { name: 'Freies Training starten' }).click(); await p.waitForTimeout(500);
  await p.locator('#view').getByRole('button', { name: 'Übung hinzufügen' }).click(); await p.waitForTimeout(400);
  const poolLen = await p.evaluate(async () => (await import('./js/pool.js')).POOL.length);
  const rows = await p.locator('.sheet .card.list .row').count();
  ok(rows === poolLen, `${T}: Suche zeigt alle ${poolLen} Übungen (eigene + Startpool), gefunden ${rows}`);
  await p.locator('.sheet input[type=search]').fill('beinpresse'); await p.waitForTimeout(300);
  const hit = p.locator('.sheet .card.list .row').first();
  ok(/Startpool/.test(await hit.innerText()), `${T}: Treffer aus dem Startpool ist markiert („${(await hit.innerText()).replace(/\n/g, ' ')}“)`);
  await shot('1-suche');
  const libBefore = await p.evaluate(async () => (await import('./js/exercises.js')).listExercises().length);
  await hit.click(); await p.waitForTimeout(500);
  const libAfter = await p.evaluate(async () => (await import('./js/exercises.js')).listExercises().length);
  ok(libAfter === libBefore + 1, `${T}: Antippen übernimmt die Pool-Übung in die Bibliothek`);
  ok(/Beinpresse/.test(await p.locator('#view h2.exh').innerText()), `${T}: Übung ist im Training`);

  // Zweite Übung (eigene) dazu, dann zurück zur ersten
  await p.getByRole('button', { name: 'Übersicht' }).click(); await p.waitForTimeout(300);
  await p.locator('.sheet .addline', { hasText: 'Übung hinzufügen' }).click(); await p.waitForTimeout(400);
  await p.locator('.sheet input[type=search]').last().fill('bankdrücken'); await p.waitForTimeout(300);
  await p.locator('.sheet .card.list .row', { hasText: 'Bankdrücken' }).first().click(); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelectorAll('.sheet-close').forEach((x) => x.click())); await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Vorherige Übung' }).click(); await p.waitForTimeout(400);

  // Drop vor dem Abhaken
  const quick = p.locator('#view .quick');
  ok(await quick.count() === 1, `${T}: „+ Drop“ steht schon vor dem ersten Haken`);
  await quick.getByRole('button', { name: /Drop/ }).click(); await p.waitForTimeout(300);
  ok(await p.locator('#view .setrow.stage').count() === 1 && /1D/.test(await p.locator('#view .setrow .sn').first().innerText()), `${T}: Satz 1 ist Drop mit erster Stufe, noch offen`);
  await shot('2-drop-vorab');

  // Aufwärmsatz abhaken → Aufwärmpause 1:00
  await p.getByRole('button', { name: 'Aufwärmsatz' }).click(); await p.waitForTimeout(300);
  const warmRow = p.locator('#view .setrow.warm').first();
  await warmRow.locator('input').nth(0).fill('40'); await warmRow.locator('input').nth(1).fill('10');
  await warmRow.locator('.ck').click(); await p.waitForTimeout(600);
  const bar = p.locator('[data-rest]');
  const sub = await bar.locator('.rt-sub').innerText();
  const time = await bar.locator('.rt-time').innerText();
  ok(!(await bar.isHidden()) && /Aufwärmpause/.test(sub) && /^(1:00|0:5\d)$/.test(time), `${T}: Aufwärmpause läuft („${time} · ${sub}“)`);
  await shot('3-aufwaermpause');

  // Weiter zur nächsten Übung: Pause läuft weiter
  await p.getByRole('button', { name: 'Nächste Übung' }).click(); await p.waitForTimeout(500);
  if (await p.locator('.sheet').count()) { await p.evaluate(() => document.querySelectorAll('.sheet-close').forEach((x) => x.click())); await p.waitForTimeout(300); }
  ok(/Bankdrücken/.test(await p.locator('#view h2.exh').innerText()), `${T}: zweite Übung offen`);
  const t1 = await bar.locator('.rt-time').innerText();
  await p.waitForTimeout(1300);
  const t2 = await bar.locator('.rt-time').innerText();
  ok(!(await bar.isHidden()) && t1 !== t2, `${T}: Pause läuft auf der nächsten Übung weiter (${t1} → ${t2})`);

  // Einstellung Aufwärmpause
  await go('#/settings');
  const warmSet = p.locator('#view .labeled, #view label, #view div', { hasText: /^Aufwärm\u00ADpause/ }).first();
  ok(await warmSet.count() === 1 && /1:00/.test(await p.locator('#view').innerText()), `${T}: Einstellungen zeigen „Aufwärmpause 1:00“`);
  await p.getByRole('button', { name: 'Pause nach Aufwärmsatz erhöhen' }).click();
  await p.waitForTimeout(200);
  const saved = await p.evaluate(async () => (await import('./js/store.js')).get('settings').warmupRestSeconds);
  ok(saved === 75, `${T}: Stepper speichert die Aufwärmpause (${saved} s)`);
  await shot('4-einstellungen');

  const txt = await p.locator('#view').innerText();
  ok(!BAD_TEXT.test(txt), `${T}: kein null/undefined/NaN`);
  ok(errs.length === 0, `${T}: keine Konsolenfehler ${errs.join(' | ')}`);
  await ctx.close();
}
await b.close(); await srv.close();
done();
