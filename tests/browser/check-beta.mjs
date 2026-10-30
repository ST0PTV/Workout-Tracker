// v3.14.0: Prüft die Beta-Kopie aus scripts/beta.mjs (Aufruf mit WT_ROOT=<Beta-Ordner>).
// Getrennter Speicher (Präfix wtb_), Daten der Hauptversion unter derselben Origin bleiben unberührt und unsichtbar,
// Hinweis der Testversion, Name, Version, Backup-Dateiname, Service-Worker-Cache. Nur erfundene Testdaten.
// Aufruf: WT_ROOT=../workout-tracker-beta node tests/browser/check-beta.mjs <beta-version> [Ordner für Screenshots]
import { launch, startServer, checker, loadPlaywright, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';
const want = process.argv[2];
const shots = process.argv[3] || null;
if (!want || !process.env.WT_ROOT) { console.error('Aufruf: WT_ROOT=<Beta-Ordner> node tests/browser/check-beta.mjs <beta-version>'); process.exit(2); }
const pw = await loadPlaywright();
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();
const origin = new URL(srv.url).origin;

const { defaultBrowserType, ...opts } = pw.devices['iPhone SE'];
const ctx = await b.newContext({ ...opts, acceptDownloads: true });
const p = await ctx.newPage(); p.setDefaultTimeout(6000);
const errs = []; const foreign = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
ctx.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !/^(data|blob):/.test(u)) foreign.push(u); });
const shot = (n) => (shots ? p.screenshot({ path: join(shots, `beta-${n}.png`) }) : null);
const go = async (hash) => { await p.evaluate((x) => { location.hash = x; }, hash); await p.waitForTimeout(450); };

// Daten „der Hauptversion“ unter derselben Origin vorab anlegen (hell, eingeführt, ein Plan)
await p.goto(srv.url + '/manifest.webmanifest');
await p.evaluate(() => {
  localStorage.setItem('wt_settings', JSON.stringify({ appearance: 'light', onboarded: true }));
  localStorage.setItem('wt_plans', JSON.stringify([{ id: 'p-main', name: 'Plan der Hauptversion', items: [] }]));
  localStorage.setItem('wt_schema', '2');
});
const mainBefore = await p.evaluate(() => JSON.stringify(Object.keys(localStorage).filter((k) => k.startsWith('wt_')).sort().map((k) => [k, localStorage.getItem(k)])));

await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(900);
ok((await p.title()) === 'Workout Beta', 'Titel „Workout Beta“');
const man = await p.evaluate(async () => (await fetch('manifest.webmanifest')).json());
ok(man.short_name === 'Workout Beta' && man.name === 'Workout Tracker Beta', 'Manifest: eigener Name');
ok(await p.evaluate(() => document.documentElement.dataset.theme !== 'light'), 'helles Design der Hauptversion wird nicht übernommen');
ok(!(await p.locator('#view').innerText()).includes('Plan der Hauptversion'), 'Plan der Hauptversion nicht sichtbar');
const card = p.locator('.beta-hint');
ok(await card.count() === 1, 'Hinweis der Testversion sichtbar');
const ct = await card.innerText();
ok(/nur auf diesem Gerät/.test(ct) && /nichts wird an einen Server gesendet/.test(ct) && /Backup/.test(ct), 'Hinweis betont: lokal, kein Server, selbst sichern');
await shot('1-start');
await card.getByRole('button', { name: 'Mehr dazu' }).click(); await p.waitForTimeout(400);
ok(/sendet nichts/.test(await p.evaluate(() => document.querySelector('.sheet')?.textContent || '')), '„Mehr dazu“ öffnet „Deine Daten“');
await p.evaluate(() => document.querySelectorAll('.sheet-close').forEach((x) => x.click())); await p.waitForTimeout(300);
await card.getByRole('button', { name: 'Verstanden' }).click(); await p.waitForTimeout(300);
ok(await p.locator('.beta-hint').count() === 0, '„Verstanden“ blendet den Hinweis aus');

// Etwas speichern und Keys prüfen
await p.evaluate(async () => { const lib = await import('./js/exercises.js'); lib.addFromPool('bench-press'); });
const keys = await p.evaluate(() => Object.keys(localStorage));
ok(keys.some((k) => k === 'wtb_settings') && keys.some((k) => k === 'wtb_exercises'), 'Beta speichert unter wtb_');
ok(await p.evaluate(() => JSON.parse(localStorage.getItem('wtb_settings')).betaInfo === true), 'betaInfo unter wtb_settings');
const mainAfter = await p.evaluate(() => JSON.stringify(Object.keys(localStorage).filter((k) => k.startsWith('wt_')).sort().map((k) => [k, localStorage.getItem(k)])));
ok(mainAfter === mainBefore, 'Daten der Hauptversion (wt_) unverändert');

await go('#/settings');
const st = await p.locator('#view').innerText();
ok(st.includes(`Beta ${want} (Stand `), `Einstellungen zeigen „Beta ${want} (Stand …)“`);
const dl = p.waitForEvent('download');
await p.getByRole('button', { name: 'Exportieren' }).click();
const f = await dl;
ok(/^workout-tracker-beta-backup-\d{4}-\d\d-\d\d\.json$/.test(f.suggestedFilename()), `Backup-Dateiname der Beta (${f.suggestedFilename()})`);
const bak = JSON.parse(await (await import('node:fs/promises')).readFile(await f.path(), 'utf8'));
ok(bak.app === 'workout-tracker', 'Backup-Format gleich wie Hauptversion (Umzug per Backup möglich)');
await shot('2-einstellungen');

await p.reload(); await p.waitForTimeout(1500);
const caches = await p.evaluate(async () => (await navigator.serviceWorker.ready, await caches.keys()));
ok(caches.length > 0 && caches.every((c) => c.startsWith(`wtb-cache-${want}-v`)), `Service-Worker-Cache nur wtb-cache-${want}-v… (${caches.join(', ')})`);
for (const h of ['#/', '#/plans', '#/exercises', '#/progress']) await go(h);
ok(foreign.length === 0, `keine Anfragen an fremde Server ${foreign.slice(0, 3).join(' | ')}`);
ok(!BAD_TEXT.test(await p.evaluate(() => document.body.innerText)), 'kein null/undefined/NaN im Text');
ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
await b.close(); await srv.close();
done();
