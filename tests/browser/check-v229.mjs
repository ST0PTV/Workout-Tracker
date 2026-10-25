// v2.29.0: Browser-Prüfung – Trainingstage pro Plan (Hinweis am Folgetag, OK, Woche aussetzen, Tage im Editor)
// und „Plan anpassen?“ nach dem Training (keine Vorauswahl, nur Gewähltes wird übernommen).
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v229.mjs   (Screenshots in WT_OUT/v229)
import { launch, startServer, checker, outDir, BAD_TEXT, startPlan } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('v229');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('dialog', (d) => d.accept());
const shot = (name) => p.screenshot({ path: join(out, `${name}.png`) });
const text = () => p.evaluate(() => document.body.innerText);

await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
await p.evaluate(async () => {
  const lib = await import('./js/exercises.js');
  const P = await import('./js/plans.js');
  const store = await import('./js/store.js');
  const ids = ['back-squat', 'bench-press-barbell', 'seated-cable-row'].map((r) => lib.addFromPool(r).exercise.id);
  const plan = P.newPlan('Testplan').plan;
  P.addExercises(plan.id, ids);
  const y = new Date(); y.setDate(y.getDate() - 1);
  P.setPlanDays(plan.id, [(y.getDay() + 6) % 7]);
  // Plan „vor zehn Tagen“ angelegt, damit gestern zählt
  store.set('plans', store.get('plans').map((x) => ({ ...x, createdAt: new Date(Date.now() - 10 * 864e5).toISOString() })));
});
await p.reload(); await p.waitForTimeout(400);

// A: Hinweis am Folgetag
let t = await text();
ok(/Gestern \(\w+\) war „Testplan“ eingeplant/.test(t), 'A: Hinweis für gestern sichtbar');
ok(!/verpasst|Serie|Streak|Tage in Folge/i.test(t), 'A: neutral – kein „verpasst“, keine Serie');
ok(/Mo|Di|Mi|Do|Fr|Sa|So/.test(await p.locator('.start-card .pc-top, .start-row .t').first().innerText()), 'A: Tage auf der Startkarte');
await shot('1-hint');
await p.locator('.hint-box button', { hasText: 'OK' }).click(); await p.waitForTimeout(300);
ok(await p.locator('.hint-box', { hasText: 'eingeplant' }).count() === 0, 'A: OK → Hinweis weg');
await p.reload(); await p.waitForTimeout(400);
ok(await p.locator('.hint-box', { hasText: 'eingeplant' }).count() === 0, 'A: nach Neuladen nicht wieder da (einmal)');

// Woche aussetzen (Hinweis zurücksetzen und erneut zeigen)
await p.evaluate(async () => {
  const store = await import('./js/store.js');
  store.set('plans', store.get('plans').map((x) => ({ ...x, missedAck: null })));
});
await p.reload(); await p.waitForTimeout(400);
await p.locator('.hint-box button', { hasText: 'Diese Woche aussetzen' }).click(); await p.waitForTimeout(400);
t = await text();
ok(!t.includes('eingeplant') && t.includes('Diese Woche ausgesetzt'), 'A: Woche ausgesetzt → Hinweis weg, Startkarte zeigt es');
await shot('2-skipped');
await p.locator('.start-card button.link, .start-row button.link', { hasText: 'rückgängig' }).click(); await p.waitForTimeout(300);
ok(!(await text()).includes('Diese Woche ausgesetzt'), 'A: rückgängig');

// Tage im Plan-Editor
await p.goto(srv.url + '/index.html#/plans'); await p.waitForTimeout(400);
await p.locator('.pcard', { hasText: 'Testplan' }).click(); await p.waitForTimeout(400);
await p.locator('.sheet button.pill', { hasText: 'Bearbeiten' }).click(); await p.waitForTimeout(300);
const fr = p.locator('.plan-days button.chip', { hasText: 'Fr' });
const wasOn = (await fr.getAttribute('aria-pressed')) === 'true';
await fr.click(); await p.waitForTimeout(300);
ok((await p.locator('.plan-days button.chip', { hasText: 'Fr' }).getAttribute('aria-pressed')) === String(!wasOn), 'A: Tag im Editor umschalten');
ok((await p.locator('.sheet').last().innerText()).toLowerCase().includes('trainingstage'), 'A: Block „Trainingstage“ im Editor');
await p.locator('.plan-days').screenshot({ path: join(out, '3-editor-days.png') });
await p.locator('.sheet button.pill', { hasText: 'Fertig' }).click(); await p.waitForTimeout(200);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// B: Training mit Abweichungen → „Plan anpassen?“
await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
await startPlan(p, 'Testplan'); await p.waitForTimeout(500);
if (await p.locator('.sheet', { hasText: 'Aufwärm' }).count()) { await p.locator('.sheet button', { hasText: /Nein|Ohne/ }).first().click(); await p.waitForTimeout(300); }
await p.evaluate(async () => {
  const S = await import('./js/session.js');
  const s = S.activeSession();
  S.addSet(s.entries[0].id);
  const en = S.activeSession().entries[0];
  for (const set of en.sets.filter((x) => x.type !== 'warmup')) S.completeSet(en.id, set.id, { weightKg: 60, reps: 8 });
});
await p.reload(); await p.waitForTimeout(400);
await p.locator('button', { hasText: 'Übersicht' }).first().click(); await p.waitForTimeout(400);
await p.locator('.sheet button', { hasText: 'Training beenden' }).click(); await p.waitForTimeout(500);
if (await p.locator('.rate-sheet').count()) { await p.locator('.rate-sheet button', { hasText: 'Ohne Bewertung weiter' }).click(); await p.waitForTimeout(600); }
t = await p.locator('.sheet').last().innerText();
ok(t.toLowerCase().includes('plan „testplan“ anpassen?'), 'B: Liste „Plan anpassen?“ nach dem Training');
ok(/3 → 4 Sätze/.test(t) && (t.match(/heute nicht gemacht/g) || []).length === 2, 'B: Satzzahl 3 → 4 und zwei nicht gemachte Übungen');
ok(await p.locator('.plan-sync .row.pick.on').count() === 0, 'B: nichts vorausgewählt');
ok(await p.locator('.plan-sync button.btn.primary[disabled]').count() === 1, 'B: Übernehmen ohne Auswahl gesperrt');
ok(!BAD_TEXT.test(t), 'B: kein null/undefined/NaN');
await shot('4-sync');
await p.locator('.plan-sync .row.pick', { hasText: '3 → 4' }).click(); await p.waitForTimeout(200);
await shot('5-sync-picked');
await p.locator('.plan-sync button.btn.primary').click(); await p.waitForTimeout(400);
ok((await p.locator('.plan-sync').innerText()).includes('angepasst (1 Änderung)'), 'B: Bestätigung nach dem Übernehmen');
const items = await p.evaluate(async () => (await import('./js/plans.js')).listPlans()[0].items.map((i) => i.targetSets));
ok(items.length === 3 && items[0] === 4, `B: nur die Satzzahl übernommen, nichts entfernt (${JSON.stringify(items)})`);

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log('Screenshots: ' + out);
await b.close(); await srv.close();
done();
