// v2.32.0: Browser-Prüfung – Training nachtragen (Dialog, Editor, Speichern, Abbrechen, Einstiege).
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v232.mjs   (Screenshots in WT_OUT/v232)
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('v232');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('dialog', (d) => d.accept());
const shot = (name) => p.screenshot({ path: join(out, `${name}.png`) });
const text = () => p.evaluate(() => document.body.innerText);
const sheetText = () => p.locator('.sheet').last().innerText();
const sessions = () => p.evaluate(async () => (await import('./js/store.js')).get('sessions'));
const local = (d) => { const q = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}T${q(d.getHours())}:${q(d.getMinutes())}`; };

await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
await p.evaluate(async () => {
  const lib = await import('./js/exercises.js');
  const P = await import('./js/plans.js');
  const bench = lib.addFromPool('bench-press-barbell').exercise;
  const row = lib.addFromPool('seated-cable-row').exercise;
  lib.addFromPool('dumbbell-curl');
  const plan = P.newPlan('Testplan').plan;
  P.addExercises(plan.id, [bench.id, row.id]);
});
await p.reload(); await p.waitForTimeout(500);

// Einstieg auf dem Training-Tab
ok(await p.locator('button', { hasText: 'Training nachtragen' }).count() === 1, 'N: Taste auf dem Training-Tab');
await shot('1-start-tab');
await p.locator('button', { hasText: 'Training nachtragen' }).click(); await p.waitForTimeout(400);
let t = await sheetText();
ok(t.toLowerCase().includes('beginn') && t.toLowerCase().includes('ende') && t.includes('Dauer 1 h 00 min'), 'N: Dialog mit Beginn, Ende, Dauer 1 h');
ok(t.includes('Freies Training') && t.includes('Testplan'), 'N: Plan-Auswahl');
await shot('2-dialog');

// Zukunft wird abgelehnt
const fut = new Date(Date.now() + 5 * 3600000);
await p.locator('.sheet input[aria-label="Beginn"]').fill(local(new Date(fut.getTime() - 3600000)));
await p.locator('.sheet input[aria-label="Ende"]').fill(local(fut));
await p.locator('.sheet button.btn.primary', { hasText: 'Weiter' }).click(); await p.waitForTimeout(300);
ok((await text()).includes('Das Ende liegt in der Zukunft'), 'N: Zeit in der Zukunft wird abgelehnt');

// gestern 18:00–19:00 mit Plan
const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(18, 0, 0, 0);
const y2 = new Date(y.getTime() + 3600000);
await p.locator('.sheet input[aria-label="Beginn"]').fill(local(y));
await p.locator('.sheet input[aria-label="Ende"]').fill(local(y2));
await p.locator('.sheet button.chip', { hasText: 'Testplan' }).click(); await p.waitForTimeout(200);
await p.locator('.sheet button.btn.primary', { hasText: 'Weiter' }).click(); await p.waitForTimeout(500);
t = await sheetText();
ok(t.includes('Bankdrücken') && t.includes('Rudern am Kabel') && t.includes('Speichern') && t.includes('Abbrechen'), 'N: Editor mit Planübungen');
ok(await p.locator('.sheet .setrow.edit').count() === 6, `N: 3 + 3 leere Sätze (${await p.locator('.sheet .setrow.edit').count()})`);
ok(!t.includes('Training löschen'), 'N: kein „Training löschen“ beim Nachtragen');
ok((await sessions()).length === 0, 'N: noch nichts gespeichert');
await shot('3-editor-empty');

// Speichern ohne Werte
await p.locator('.sheet button.btn.primary', { hasText: 'Speichern' }).click(); await p.waitForTimeout(300);
ok((await text()).includes('Noch kein Satz mit Werten'), 'N: ohne Werte nicht gespeichert');
ok((await sessions()).length === 0, 'N: weiterhin nichts gespeichert');

// Werte eintragen
const rows = p.locator('.sheet .setrow.edit');
for (let i = 0; i < 2; i++) {
  const r = rows.nth(i);
  await r.locator('input.val').nth(0).fill(String(60 + i * 2.5)); await r.locator('input.val').nth(0).dispatchEvent('input');
  await r.locator('input.val').nth(1).fill(String(10 - i)); await r.locator('input.val').nth(1).dispatchEvent('input');
}
// Übung hinzufügen
await p.locator('.sheet button', { hasText: 'Übung hinzufügen' }).click(); await p.waitForTimeout(400);
await p.locator('.sheet').last().locator('button.row', { hasText: 'Bizepscurls' }).click(); await p.waitForTimeout(400);
t = await sheetText();
ok(t.includes('Bizepscurls'), 'N: Übung hinzugefügt');
ok(await p.locator('.sheet .setrow.edit').count() === 7, 'N: +1 leerer Satz');
await shot('4-editor-filled');
await p.locator('.sheet button.btn.primary', { hasText: 'Speichern' }).click(); await p.waitForTimeout(600);
const s = await sessions();
ok(s.length === 1 && s[0].endedAt, 'N: ein abgeschlossenes Training gespeichert');
ok(s[0].entries.length === 1 && s[0].entries[0].sets.length === 2, `N: nur Sätze mit Werten (${s[0]?.entries.length} Übung, ${s[0]?.entries[0]?.sets.length} Sätze)`);
ok(Math.abs(Date.parse(s[0].startedAt) - y.getTime()) < 60000 && Math.abs(Date.parse(s[0].endedAt) - y2.getTime()) < 60000, 'N: Beginn und Ende wie gewählt');
ok(await p.locator('.sheet').count() === 0 || !(await p.locator('.sheet.open, .sheet').last().isVisible().catch(() => false)), 'N: Editor geschlossen');
t = await text();
ok(t.toLowerCase().includes('letzte trainings') && t.includes('Testplan'), 'N: erscheint unter „Letzte Trainings“');
ok(!BAD_TEXT.test(t), 'N: kein null/undefined/NaN');
await shot('5-after-save');

// Tagebuch: Taste, Eintrag, Abbrechen
await p.goto(srv.url + '/index.html#/progress'); await p.waitForTimeout(400);
await p.locator('.ex-seg button', { hasText: 'Trainings' }).click(); await p.waitForTimeout(400);
t = await text();
ok(t.includes('Training nachtragen') && t.includes('Testplan'), 'N: Tagebuch zeigt Taste und das nachgetragene Training');
await shot('6-diary');
await p.locator('button', { hasText: 'Training nachtragen' }).click(); await p.waitForTimeout(400);
await p.locator('.sheet button.btn.primary', { hasText: 'Weiter' }).click(); await p.waitForTimeout(500);
await p.locator('.sheet button', { hasText: 'Übung hinzufügen' }).click(); await p.waitForTimeout(400);
await p.locator('.sheet').last().locator('button.row', { hasText: 'Bizepscurls' }).click(); await p.waitForTimeout(400);
await p.locator('.sheet input.val').nth(0).fill('20'); await p.locator('.sheet input.val').nth(0).dispatchEvent('input');
await p.locator('.sheet input.val').nth(1).fill('12'); await p.locator('.sheet input.val').nth(1).dispatchEvent('input');
await p.locator('.sheet button', { hasText: 'Abbrechen' }).click(); await p.waitForTimeout(500);
ok((await sessions()).length === 1, 'N: Abbrechen speichert nichts');

// bestehendes Training bearbeiten funktioniert weiter (+ Übung hinzufügen auch dort)
await p.locator('.diary-card', { hasText: 'Testplan' }).click(); await p.waitForTimeout(400);
await p.locator('.sheet button', { hasText: 'Bearbeiten' }).click(); await p.waitForTimeout(300);
ok((await sheetText()).includes('Fertig') && !(await sheetText()).includes('Speichern'), 'N: Bearbeiten wie bisher („Fertig“)');
ok((await sheetText()).includes('Training löschen'), 'N: Bearbeiten hat weiter „Training löschen“');
await p.locator('.sheet button', { hasText: 'Fertig' }).click(); await p.waitForTimeout(400);

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log('Screenshots: ' + out);
await b.close(); await srv.close();
done();
