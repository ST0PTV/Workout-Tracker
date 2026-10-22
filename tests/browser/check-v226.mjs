// v2.26.0: Browser-Prüfung der Quick Wins – Scheiben-Zeile, „je Seite“, Pausen-Leiste mit nächstem Satz
// und Aufleuchten, Rückgängig nach dem Löschen, Banner bei Speicherfehler, Einstellungen, Bildschirm-Sperre.
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v226.mjs   (Screenshots in WT_OUT/v226)
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('v226');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
// Bildschirm-Sperre im Testbrowser nachbilden, damit sich Anfordern und Freigeben zählen lassen.
await ctx.addInitScript(() => {
  window.__wl = { req: 0, rel: 0 };
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => {
    window.__wl.req++;
    const ls = new Set();
    return { addEventListener: (_, f) => ls.add(f), release: async () => { window.__wl.rel++; ls.forEach((f) => f()); } };
  } } });
});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const shot = (name) => p.screenshot({ path: join(out, `${name}.png`) });
const text = () => p.evaluate(() => document.body.innerText);

await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
await p.evaluate(async () => {
  const lib = await import('./js/exercises.js');
  const P = await import('./js/plans.js');
  const bench = lib.addFromPool('bench-press-barbell').exercise;
  const bss = lib.addFromPool('bulgarian-split-squat').exercise;
  lib.saveExercise({ ...lib.getExercise(bench.id), restSeconds: 3 });
  const plan = P.newPlan('Testplan').plan;
  P.addExercises(plan.id, [bench.id, bss.id]);
});
await p.reload(); await p.waitForTimeout(400);
ok((await p.evaluate(() => window.__wl.req)) === 0, 'A1: ohne Training keine Bildschirm-Sperre');
await p.click('text=Starten'); await p.waitForTimeout(400);
ok((await p.evaluate(() => window.__wl.req)) >= 1, 'A1: Training läuft → Bildschirm-Sperre angefordert');

// A4: Scheiben-Zeile folgt dem Gewichtsfeld
const w = p.locator('.setrow').first().locator('input.val').first();
await w.fill('80'); await w.dispatchEvent('input'); await p.waitForTimeout(100);
let t = await text();
ok(t.includes('Stange 20 kg · 30 kg pro Seite (25 + 5)'), 'A4: 80 kg → 30 kg pro Seite (25 + 5)');
await w.fill('81'); await w.dispatchEvent('input'); await p.waitForTimeout(100);
ok((await text()).includes('nicht genau ladbar'), 'A4: 81 kg → nicht genau ladbar');
await w.fill('80'); await w.dispatchEvent('input'); await w.dispatchEvent('change');
const r = p.locator('.setrow').first().locator('input.val').nth(1);
await r.fill('8'); await r.dispatchEvent('change');
await shot('1-plates');

// A5/A6: Satz abhaken → Pausen-Leiste mit nächstem Satz, nach 3 s „Pause vorbei“ mit Aufleuchten
await p.locator('.setrow').first().locator('.ck').click(); await p.waitForTimeout(500);
t = await p.locator('.restbar').innerText();
ok(/Als Nächstes: Satz 2 · 80 × 8/.test(t), `A5: nächster Satz in der Leiste („${t.replace(/\n/g, ' | ')}“)`);
await shot('2-restbar');
await p.waitForTimeout(3300);
ok(await p.locator('.restbar.done.pulse').count() === 1, 'A6: Pause vorbei → Leiste leuchtet einmal auf');
await shot('3-rest-done');

// A10: Satz löschen → Rückgängig
const before = await p.locator('.setrow').count();
await p.locator('.setrow').nth(2).locator('.sn').click(); await p.waitForTimeout(400);
await p.locator('.sheet button.opt', { hasText: /löschen|entfernen/i }).first().click(); await p.waitForTimeout(400);
ok(await p.locator('.setrow').count() === before - 1, 'A10: Satz gelöscht');
ok(await p.locator('.toast.show .toast-act').count() === 1, 'A10: Toast mit „Rückgängig“');
await shot('4-undo-toast');
await p.locator('.toast-act').click(); await p.waitForTimeout(400);
ok(await p.locator('.setrow').count() === before, 'A10: Satz nach „Rückgängig“ wieder da');

// A8: je Seite bei der zweiten Übung
await p.click('button[aria-label="Nächste Übung"]'); await p.waitForTimeout(400);
if (await p.locator('.sheet .rate-btn').count()) { await p.locator('.sheet .rate-btn').nth(1).click(); await p.waitForTimeout(500); }
t = await text();
ok(t.includes('je Seite') && /Wdh\.\/S\./i.test(t), 'A8: „je Seite“ und Spalte Wdh./S. bei Bulgarian Split Squat');
ok(/Als Nächstes: Satz 1/.test(await p.locator('.restbar').innerText()), 'A5: Vorschau folgt der offenen Übung (Satz 1 der neuen Übung)');
ok(await p.locator('.plates').count() === 0, 'A4: keine Scheiben-Zeile bei Kurzhantel-Übung');
await shot('5-per-side');

// A3: Speicherfehler → Banner; nächstes erfolgreiches Speichern → weg
await p.evaluate(() => { window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); }; });
await p.locator('button', { hasText: 'Satz' }).last().click(); await p.waitForTimeout(400);
ok(await p.locator('#savebar:not([hidden])').count() === 1, 'A3: Banner bei Speicherfehler sichtbar');
await shot('6-savebar');
await p.evaluate(() => { Storage.prototype.setItem = window.__set; });
await p.locator('button', { hasText: 'Satz' }).last().click(); await p.waitForTimeout(400);
ok(await p.locator('#savebar[hidden]').count() === 1, 'A3: Banner nach erfolgreichem Speichern weg');

// Einstellungen: Schalter, Stange, Speicherstatus
await p.goto(srv.url + '/index.html#/settings'); await p.waitForTimeout(700);
t = await text();
ok(t.includes('Bildschirm im Training anlassen') && t.includes('Scheiben pro Seite anzeigen') && t.includes('Standard-Stange'), 'Einstellungen: neue Schalter da');
ok(t.includes('Speicher geschützt') && !t.includes('…'), 'A2: Speicherstatus geladen');
ok(!BAD_TEXT.test(t), 'Einstellungen: kein null/undefined/NaN');
await p.locator('.card', { hasText: 'Training' }).first().screenshot({ path: join(out, '7-settings-training.png') });
await p.locator('.card', { hasText: 'Datenschema' }).first().screenshot({ path: join(out, '8-settings-info.png') });
// Bildschirm-Sperre aus → beim Training wird sie freigegeben
await p.locator('.set-line', { hasText: 'Bildschirm' }).locator('button', { hasText: 'Aus' }).click(); await p.waitForTimeout(200);
await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
ok((await p.evaluate(() => window.__wl.rel)) >= 1, 'A1: Schalter aus → Sperre freigegeben');

// Übungs-Editor: Felder „Wiederholungen“ und „Stange“
await p.goto(srv.url + '/index.html#/exercises'); await p.waitForTimeout(500);
await p.locator('.row', { hasText: 'Bankdrücken' }).first().click(); await p.waitForTimeout(500);
t = (await p.locator('.sheet').last().innerText()).toLowerCase(); // Feld-Labels sind per CSS in Großbuchstaben
ok(t.includes('wiederholungen') && t.includes('stange für „scheiben pro seite“') && t.includes('standard-stange (20 kg)'), `Editor: neue Felder bei Langhantel-Übung`);
await p.locator('.sheet .field', { hasText: 'Stange für' }).screenshot({ path: join(out, '9-editor.png') });

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log('Screenshots: ' + out);
await b.close(); await srv.close();
done();
