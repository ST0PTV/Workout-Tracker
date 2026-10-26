// v2.31.0: Browser-Prüfung – „Mein Equipment“ in den Einstellungen, Filter im Startpool, „Alle übernehmen“.
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v231.mjs   (Screenshots in WT_OUT/v231)
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('v231');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('dialog', (d) => d.accept());
const shot = (name) => p.screenshot({ path: join(out, `${name}.png`) });
const text = () => p.evaluate(() => document.body.innerText);
const sheetText = () => p.locator('.sheet').last().innerText();
const rows = () => p.locator('.sheet .row[data-ref]').count();
const refs = () => p.evaluate(() => [...document.querySelectorAll('.sheet .row[data-ref]')].map((r) => r.dataset.ref));

// ---------- Einstellungen: Tasten ----------
await p.goto(srv.url + '/index.html#/settings'); await p.waitForTimeout(500);
let t = await text();
ok(t.includes('Mein Equipment') && t.includes('Klimmzugstange') && t.includes('Dipbarren') && t.includes('Widerstandsband') && t.includes('Ab-Rad'), 'E: Karte „Mein Equipment“ mit feinen Geräten');
ok(t.includes('Nichts gewählt'), 'E: Standard = nichts gewählt (alles zeigen)');
await shot('1-settings-empty');
const card = p.locator('.card', { hasText: 'Mein Equipment' }).first();
await card.locator('button.chip', { hasText: 'Kurzhantel' }).click(); await p.waitForTimeout(200);
await card.locator('button.chip', { hasText: 'Bank / Box' }).click(); await p.waitForTimeout(200);
await card.locator('button.chip', { hasText: 'Klimmzugstange' }).click(); await p.waitForTimeout(200);
ok((await card.locator('button.chip.on').count()) === 3, 'E: drei Geräte gewählt');
let saved = await p.evaluate(async () => (await import('./js/store.js')).get('settings').equipment);
ok(JSON.stringify(saved) === '["dumbbell","bench","pullbar"]', `E: gespeichert in Geräte-Reihenfolge (${JSON.stringify(saved)})`);
await shot('2-settings-chosen');
await p.reload(); await p.waitForTimeout(500);
ok((await p.locator('.card', { hasText: 'Mein Equipment' }).first().locator('button.chip.on').count()) === 3, 'E: Auswahl bleibt nach Neuladen');

// ---------- Startpool: Filter ----------
await p.goto(srv.url + '/index.html#/exercises'); await p.waitForTimeout(500);
await p.locator('button', { hasText: 'Startpool durchsehen' }).click(); await p.waitForTimeout(500);
t = await sheetText();
ok(await p.locator('.sheet button.chip', { hasText: 'Nur mein Equipment' }).count() === 1, 'E: Schalter „Nur mein Equipment“ sichtbar');
ok(/\d+ von 136 Übungen · Mein Equipment/.test(t), `E: Zähler „x von 136 · Mein Equipment“ (${t.match(/\d+ von \d+ Übungen[^\n]*/)?.[0]})`);
let r = await refs();
ok(r.includes('pull-up') && r.includes('dumbbell-bench-press') && r.includes('push-up') && r.includes('plank') && r.includes('bench-dips'), 'E: passende Übungen (Klimmzug, KH-Bankdrücken, Liegestütz, Plank, Bankdips)');
ok(!r.includes('dips') && !r.includes('lat-pulldown') && !r.includes('back-squat') && !r.includes('ab-wheel-rollout') && !r.includes('clamshell-band'), 'E: nicht passende fehlen (Dips, Latzug, Kniebeuge, Ab-Rad, Band)');
ok(!BAD_TEXT.test(t), 'E: kein null/undefined/NaN');
await shot('3-pool-filtered');
// Info-Sheet zeigt „Braucht“
await p.locator('.sheet .row[data-ref="pull-up"] button.t').click(); await p.waitForTimeout(500);
ok((await sheetText()).includes('Braucht: Klimmzugstange'), 'E: Übungsinfo zeigt „Braucht: Klimmzugstange“');
await shot('4-evidence-needs');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
// Schalter aus → alles
await p.locator('.sheet button.chip', { hasText: 'Nur mein Equipment' }).click(); await p.waitForTimeout(300);
ok(await rows() === 136 || (await sheetText()).includes('136 Übungen'), 'E: Schalter aus → 136 Übungen');
await p.locator('.sheet button.chip', { hasText: 'Nur mein Equipment' }).click(); await p.waitForTimeout(300);
// Auswahl im Pool ändern
await p.locator('.sheet button.link', { hasText: 'Equipment ändern' }).click(); await p.waitForTimeout(400);
await p.locator('.sheet').last().locator('button.chip', { hasText: 'Kabelzug' }).click(); await p.waitForTimeout(300);
await shot('5-pool-gear-sheet');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
r = await refs();
ok(r.includes('lat-pulldown') && r.includes('triceps-pushdown'), 'E: nach Änderung im Pool kommen Kabelübungen dazu');

// Alle auswählen nur für die angezeigten
await p.locator('.sheet button.chip', { hasText: 'Auswählen' }).click(); await p.waitForTimeout(300);
const total = (await refs()).length;
await p.locator('.sheet button.selrow').click(); await p.waitForTimeout(300);
ok((await sheetText()).includes(`Alle ${total} auswählen`) || (await sheetText()).includes(`${total} gewählt`), `E: „Alle auswählen“ gilt für die ${total} angezeigten`);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// ---------- „Passende übernehmen“ ----------
await p.reload(); await p.waitForTimeout(500);
await p.evaluate(async () => { const st = await import('./js/store.js'); st.set('settings', { ...st.get('settings'), equipment: ['dumbbell', 'bench', 'pullbar'] }); });
await p.goto(srv.url + '/index.html#/exercises'); await p.reload(); await p.waitForTimeout(500);
ok(await p.locator('button', { hasText: 'Passende Startpool-Übungen übernehmen' }).count() === 1, 'E: Leerzustand-Taste „Passende … übernehmen“');
await p.locator('button', { hasText: 'Passende Startpool-Übungen übernehmen' }).click(); await p.waitForTimeout(400);
t = await sheetText();
ok(/passende Übungen übernehmen\?/.test(t) && t.includes('bleiben im Pool'), 'E: Bestätigung nennt Filter und Rest');
await shot('6-add-matching');
const expected = await p.evaluate(async () => { const m = await import('./js/pool.js'); const st = await import('./js/store.js'); const o = m.ownedGear(st.get('settings')); return m.POOL.filter((x) => m.fitsGear(x, o)).length; });
await p.locator('.sheet button.btn.primary').click(); await p.waitForTimeout(600);
const added = await p.evaluate(async () => (await import('./js/exercises.js')).listExercises().length);
ok(added === expected && added > 0 && added < 136, `E: übernommen ${added} von 136 (erwartet ${expected})`);
await shot('7-library');

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log('Screenshots: ' + out);
await b.close(); await srv.close();
done();
