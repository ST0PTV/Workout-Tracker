// v3.0.0: Browser-Prüfung – Stil „Apple nativ“: Dunkel als Standard, Hell über Einstellungen, iOS-Schalter, Figurfarben aus Tokens.
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v300.mjs   (Screenshots in WT_OUT/v300)
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('v300');
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const go = async (r) => { await p.goto(srv.url + '/index.html' + r); await p.waitForTimeout(500); };
const look = () => p.evaluate(() => ({
  theme: document.documentElement.getAttribute('data-theme'),
  bg: getComputedStyle(document.body).backgroundColor,
  meta: document.querySelector('meta[name="theme-color"]').getAttribute('content'),
  bar: getComputedStyle(document.querySelector('.tabbar')).backdropFilter || getComputedStyle(document.querySelector('.tabbar')).webkitBackdropFilter,
}));

await go('#/');
let l = await look();
ok(l.theme === null && l.bg === 'rgb(0, 0, 0)', `Standard: Dunkel (${l.theme}, ${l.bg})`);
ok(l.meta === '#000000', 'Standard: Browserfarbe schwarz');
ok(!/blur/.test(l.bar || ''), 'Tab-Leiste deckend ohne Glas (seit 3.1.0, Variante B)');
await p.screenshot({ path: join(out, '1-dark-start.png') });

// Einstellungen: Erscheinung „Hell“
await go('#/settings');
await p.locator('[aria-label="Erscheinung"] button', { hasText: 'Hell' }).click(); await p.waitForTimeout(300);
l = await look();
ok(l.theme === 'light' && l.bg === 'rgb(242, 242, 247)', `Hell gewählt: html[data-theme=light] (${l.bg})`);
ok(l.meta === '#F2F2F7', 'Hell: Browserfarbe hell');
await p.reload(); await p.waitForTimeout(500);
l = await look();
ok(l.theme === 'light', 'Hell bleibt nach Neuladen (index.html setzt es vor dem Zeichnen)');
await p.screenshot({ path: join(out, '2-light-settings.png'), fullPage: true });

// iOS-Schalter speichern
const sw = p.locator('.set-line', { hasText: 'Hinweise anzeigen' }).locator('input.switch');
ok(await sw.count() === 1 && await sw.getAttribute('switch') !== null, 'Hinweise: <input type=checkbox switch>');
await sw.uncheck(); await p.waitForTimeout(300);
ok(await p.evaluate(async () => (await import('./js/store.js')).get('settings').hints === false), 'Schalter aus → Einstellung gespeichert');
await p.locator('.set-line', { hasText: 'Hinweise anzeigen' }).locator('input.switch').check(); await p.waitForTimeout(300);
ok(await p.evaluate(async () => (await import('./js/store.js')).get('settings').hints === true), 'Schalter an → Einstellung gespeichert');
const cyc = p.locator('.set-line', { hasText: 'Zyklus berücksichtigen' }).locator('input.switch');
await cyc.check(); await p.waitForTimeout(300);
ok(await p.locator('.cyc-fields').count() === 1, 'Zyklus-Schalter an → Felder erscheinen');
await p.locator('.set-line', { hasText: 'Zyklus berücksichtigen' }).locator('input.switch').uncheck(); await p.waitForTimeout(300);

// Figurfarben folgen der Erscheinung (Piktogramm-Körper hell im Hellen, dunkel im Dunkeln)
await p.evaluate(async () => { (await import('./js/exercises.js')).addFromPool('bench-press-barbell'); });
await go('#/exercises');
const figLight = await p.evaluate(() => getComputedStyle(document.querySelector('.fig.mini .body')).fill);
await go('#/settings');
await p.locator('[aria-label="Erscheinung"] button', { hasText: 'Dunkel' }).click(); await p.waitForTimeout(300);
await go('#/exercises');
const figDark = await p.evaluate(() => getComputedStyle(document.querySelector('.fig.mini .body')).fill);
ok(figLight === 'rgb(213, 217, 222)' && figDark === 'rgb(58, 63, 69)', `Piktogramm-Körper: hell ${figLight}, dunkel ${figDark}`);
ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === null, 'Zurück auf Dunkel');

// Teil 2: Spalte „Zuletzt“ und gesperrte erledigte Sätze
await p.evaluate(async () => {
  const lib = await import('./js/exercises.js'); const P = await import('./js/plans.js'); const S = await import('./js/session.js');
  const pl = P.newPlan('Test-Push').plan; P.addExercises(pl.id, [lib.addFromPool('shoulder-press-dumbbell').exercise.id]);
  S.startFromPlan(pl.id);
  const e = S.activeSession().entries[0];
  S.completeSet(e.id, e.sets[0].id, { weightKg: 60, reps: 8 }); S.completeSet(e.id, e.sets[1].id, { weightKg: 60, reps: 7 });
  S.finish();
  S.startFromPlan(pl.id);
});
await go('#/');
const head = await p.evaluate(() => [...document.querySelectorAll('.card.sets .hdrrow span')].map((x) => x.textContent));
ok(head.includes('Zuletzt'), `Kopfzeile mit „Zuletzt“ (${head.join(' | ')})`);
const prevs = await p.evaluate(() => [...document.querySelectorAll('.setrow .prev')].map((x) => x.textContent.replace(/\u2009/g, ' ')));
ok(prevs[0] === '60 × 8' && prevs[1] === '60 × 7', `Zuletzt-Werte je Satz (${prevs.join(', ')})`);
await p.locator('.setrow .ck').first().click(); await p.waitForTimeout(400);
const ro = await p.evaluate(() => [...document.querySelectorAll('.setrow')][0].querySelector('.val').readOnly);
ok(ro, 'Erledigter Satz: Felder gesperrt');
await p.locator('.setrow .val').first().click(); await p.waitForTimeout(300);
ok((await p.locator('#toast').innerText()).includes('lange drücken'), 'Kurzer Tipp auf gesperrtes Feld → Hinweis');
const box = await p.locator('.setrow .val').first().boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up();
ok(!(await p.evaluate(() => document.querySelector('.setrow .val').readOnly)), 'Langes Drücken gibt das Feld frei');
await p.screenshot({ path: join(out, '3-training-zuletzt.png') });
await p.evaluate(async () => (await import('./js/session.js')).discard());

for (const r of ['#/', '#/plans', '#/exercises', '#/progress', '#/settings']) {
  await go(r);
  ok(!BAD_TEXT.test(await p.evaluate(() => document.body.innerText)), `${r}: kein null/undefined/NaN`);
}
ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
await b.close(); await srv.close();
done();
