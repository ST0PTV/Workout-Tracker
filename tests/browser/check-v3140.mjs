// v3.14.0 (Sicherheit vor der Beta): Content Security Policy ohne Verstöße, keine Anfragen an fremde Server
// (auch mit Service Worker), präpariertes Backup wird nur als Text gezeigt, keine javascript:-Links, Backup-Status,
// Hinweis „Deine Daten“, frühes Theme-Skript als Datei. Nur erfundene Testdaten.
// Aufruf: node tests/browser/check-v3140.mjs [Ordner für Screenshots]
import { launch, startServer, checker, loadPlaywright, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
const shots = process.argv[2] || null;
const pw = await loadPlaywright();
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();
const origin = new URL(srv.url).origin;

const { defaultBrowserType, ...opts } = pw.devices['iPhone SE'];
const ctx = await b.newContext({ ...opts, acceptDownloads: true }); // Service Worker erlaubt: auch seine Anfragen zählen
const p = await ctx.newPage(); p.setDefaultTimeout(6000);
const errs = []; const foreign = []; const csp = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
ctx.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) foreign.push(u); });
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
const shot = (n) => (shots ? p.screenshot({ path: join(shots, `v3140-${n}.png`) }) : null);
const go = async (hash) => { await p.evaluate((x) => { location.hash = x; }, hash); await p.waitForTimeout(450); };
const closeSheets = () => p.evaluate(() => document.querySelectorAll('.sheet-close').forEach((x) => x.click()));
const collect = async () => csp.push(...(await p.evaluate(() => window.__csp.splice(0))));

await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(800);
ok(await p.evaluate(() => /default-src 'self'/.test(document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || '')), 'CSP-Meta-Tag vorhanden');
ok(await p.evaluate(() => [...document.scripts].every((s) => s.src)), 'kein Inline-Skript mehr in index.html');
ok(await p.locator('.beta-hint').count() === 0, 'Hauptversion: kein Hinweis der Testversion');

// Theme-Skript als Datei wirkt weiter
await p.evaluate(async () => { const st = await import('./js/store.js'); st.set('settings', { ...st.get('settings'), appearance: 'light', onboarded: true, homeHint: true, hints: false }); });
await p.reload(); await p.waitForTimeout(600);
ok(await p.evaluate(() => document.documentElement.dataset.theme === 'light'), 'helles Design vor dem ersten Zeichnen (js/theme-early.js)');

// Rundgang durch die App mit Daten: Assistent-Plan, Training mit Pausenring, Fortschritt, Übungsinfos mit Quellen, 3D
await p.evaluate(async () => {
  const B = await import('./js/plan-builder.js'); const { applyProgram } = await import('./js/plan-apply.js');
  applyProgram(B.buildProgram({ goal: 'muscle', minutes: 45, gear: null, level: 'some', weekdays: [0, 3] }));
});
await p.reload(); await p.waitForTimeout(600);
await p.locator('#view button.play').first().click(); await p.waitForTimeout(600);
const w = p.locator('.setrow input[inputmode="decimal"]').first();
if (await w.count()) { await w.fill('40'); await w.dispatchEvent('change'); }
const r = p.locator('.setrow input[inputmode="numeric"]').first();
if (await r.count()) { await r.fill('10'); await r.dispatchEvent('change'); }
await p.locator('.setrow .ck').first().click(); await p.waitForTimeout(600);
await shot('1-training'); await collect();
await p.evaluate(async () => (await import('./js/session.js')).finish()); await p.waitForTimeout(400);
await closeSheets();
for (const hash of ['#/plans', '#/exercises', '#/progress', '#/settings']) { await go(hash); await collect(); }
await go('#/exercises');
await p.locator('#view .ex-row, #view .row').first().click(); await p.waitForTimeout(600);
await collect(); await closeSheets(); await p.waitForTimeout(200);
await go('#/progress'); await p.getByRole('tab', { name: '4 Wochen' }).click(); await p.waitForTimeout(400); await collect();
await go('#/plans'); await p.getByRole('button', { name: 'Pläne analysieren' }).click(); await p.waitForTimeout(3300); await collect(); await closeSheets();

// Backup-Status und Export (Download-Weg, Chromium kann keine Dateien teilen)
await go('#/settings');
ok(/zuletzt gesichert: noch nie/.test(await p.locator('.backup-state').innerText()), 'Backup-Karte: „zuletzt gesichert: noch nie“');
const dl = p.waitForEvent('download');
await p.getByRole('button', { name: 'Exportieren' }).click();
const file = await dl;
ok(/^workout-tracker-backup-\d{4}-\d\d-\d\d\.json$/.test(file.suggestedFilename()), `Backup-Dateiname der Hauptversion (${file.suggestedFilename()})`);
await p.waitForTimeout(300);
ok(/zuletzt gesichert: \d\d\.\d\d\.\d{4}/.test(await p.locator('.backup-state').innerText()), 'nach dem Export: Datum des letzten Backups');
await shot('2-einstellungen');
await p.getByRole('button', { name: 'Deine Daten' }).click(); await p.waitForTimeout(400);
const dt = await p.evaluate(() => document.querySelector('.sheet')?.textContent || ''); // Details eingeklappt
ok(/bleibt auf diesem Gerät/.test(dt) && /sendet nichts/.test(dt) && /IP-Adresse/.test(dt), 'Info „Deine Daten“: lokal, sendet nichts, GitHub-IP-Hinweis');
await shot('3-deine-daten'); await collect(); await closeSheets();

// Präpariertes Backup: HTML im Namen, javascript:-Quelle, __proto__
const bak = JSON.parse(await p.evaluate(async () => JSON.stringify((await import('./js/backup.js')).buildBackup())));
bak.data.exercises[0].name = '<img src=x onerror="window.__pwned=1">Böse';
bak.data.exercises[0].source = { ...(bak.data.exercises[0].source || {}), url: 'javascript:window.__pwned=2' };
const dir = mkdtempSync(join(tmpdir(), 'wt-hostile-'));
const hostile = join(dir, 'hostile.json');
writeFileSync(hostile, JSON.stringify(bak).replace('"settings":{', '"settings":{"__proto__":{"polluted":true},'));
p.once('dialog', (d) => d.accept());
await p.locator('input[type=file]').setInputFiles(hostile); await p.waitForTimeout(800);
await go('#/exercises');
const txt = await p.locator('#view').innerText();
ok(txt.includes('<img src=x onerror="window.__pwned=1">Böse'), 'präparierter Name erscheint als Text');
ok(await p.evaluate(() => !document.querySelector('#view img[onerror], #view img[src="x"]') && window.__pwned === undefined && ({}).polluted === undefined), 'kein ausgeführtes HTML, kein __proto__-Effekt');
ok(await p.evaluate(async () => { const { h } = await import('./js/util.js'); return !h('a', { href: 'javascript:alert(1)' }).hasAttribute('href') && !h('a', { href: ' DATA:text/html,x' }).hasAttribute('href') && h('a', { href: 'https://doi.org/x' }).getAttribute('href') === 'https://doi.org/x'; }), 'h(): javascript:/data:-Links werden nicht gesetzt, https bleibt');
ok(await p.evaluate(() => [...document.querySelectorAll('a[href]')].every((a) => !/^\s*(javascript|data|vbscript):/i.test(a.getAttribute('href')))), 'keine ausführbaren Links im DOM');
await shot('4-import'); await collect();

// Service Worker unter CSP
await p.reload(); await p.waitForTimeout(1500);
ok(await p.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), 'Service Worker registriert trotz CSP');
await go('#/'); await go('#/settings'); await collect();

ok(csp.length === 0, `keine CSP-Verstöße ${csp.slice(0, 4).join(' | ')}`);
ok(foreign.length === 0, `keine Anfragen an fremde Server ${foreign.slice(0, 3).join(' | ')}`);
ok(!BAD_TEXT.test(await p.evaluate(() => document.body.innerText)), 'kein null/undefined/NaN im Text');
ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
await b.close(); await srv.close();
done();
