// v2.30.0: Browser-Prüfung – Wiederholungsbereich im Plan-Editor und in der Vorschlagskarte, leichte Woche
// (Karte auf dem Start, Vorschlag beim Start, „leicht“ im Training, Info mit Quellen).
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v230.mjs   (Screenshots in WT_OUT/v230)
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('v230');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('dialog', (d) => d.accept());
const shot = (name) => p.screenshot({ path: join(out, `${name}.png`) });
const text = () => p.evaluate(() => document.body.innerText);
const sheetText = () => p.locator('.sheet').last().innerText();

await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
await p.evaluate(async () => {
  const lib = await import('./js/exercises.js');
  const P = await import('./js/plans.js');
  const M = await import('./js/model.js');
  const store = await import('./js/store.js');
  const bench = lib.addFromPool('bench-press-barbell').exercise;
  const row = lib.addFromPool('seated-cable-row').exercise;
  const plan = P.newPlan('Testplan').plan;
  P.addExercises(plan.id, [bench.id, row.id]);
  // erfundenes früheres Training: Bankdrücken 4 × 12 mit 60 kg, „Passend“
  const t = (d) => new Date(Date.now() - d * 864e5).toISOString();
  const s = { ...M.createSession({ planId: plan.id, startedAt: t(4) }), endedAt: t(3.96) };
  const en = M.createEntry(bench.id, { sets: [1, 2, 3, 4].map(() => M.createSet({ weightKg: 60, reps: 12, completedAt: t(3.98) })) });
  en.rating = 'right';
  s.entries = [en];
  store.set('sessions', [s]);
});

// Plan-Editor: Bereich festlegen
await p.goto(srv.url + '/index.html#/plans'); await p.waitForTimeout(400);
await p.locator('.pcard', { hasText: 'Testplan' }).click(); await p.waitForTimeout(400);
await p.locator('.sheet button.pill', { hasText: 'Bearbeiten' }).click(); await p.waitForTimeout(300);
await p.locator('.sheet .stp-toggle').first().click(); await p.waitForTimeout(300);
await p.locator('.sheet button', { hasText: 'Bereich festlegen' }).click(); await p.waitForTimeout(300);
let t = (await sheetText()).toLowerCase();
ok(t.includes('ab 8') && t.includes('bis 12'), 'B2: Bereich 8–12 gesetzt');
await p.locator('.sheet button[aria-label="Wiederholungen bis erhöhen"]').click(); await p.waitForTimeout(300);
await p.locator('.sheet button[aria-label="Wiederholungen bis verringern"]').click(); await p.waitForTimeout(300);
ok((await sheetText()).includes('× 8–12 Wdh.'), 'B2: Zeile zeigt „× 8–12 Wdh.“');
await p.locator('.sheet .item-open').screenshot({ path: join(out, '1-editor-range.png') });
await p.locator('.sheet button.pill', { hasText: 'Fertig' }).click(); await p.waitForTimeout(200);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// Normales Training: Vorschlagskarte aus dem Bereich
await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
await p.locator('.start-card', { hasText: 'Testplan' }).locator('button', { hasText: 'Starten' }).click(); await p.waitForTimeout(500);
t = await text();
ok(t.includes('Ziel 8–12 Wdh.'), 'B2: „Ziel 8–12 Wdh.“ in der Übung');
ok(/62,5 kg/.test(t) && t.includes('Alle Sätze bei 12 Wdh.') && t.includes('zurück auf 8'), 'B2: Vorschlag 62,5 kg, Wdh. zurück auf 8');
ok(!BAD_TEXT.test(t), 'B2: kein null/undefined/NaN');
await shot('2-suggestion-range');
await p.evaluate(async () => (await import('./js/session.js')).discard());

// Leichte Woche
await p.reload(); await p.waitForTimeout(400);
await p.locator('button', { hasText: 'Diese Woche leicht trainieren' }).click(); await p.waitForTimeout(400);
t = await text();
ok(t.includes('Leichte Woche bis Sonntag'), 'B3: Karte „Leichte Woche bis Sonntag“');
await shot('3-light-card');
await p.locator('.start-card', { hasText: 'Testplan' }).locator('button', { hasText: 'Starten' }).click(); await p.waitForTimeout(500);
t = await sheetText();
ok(t.includes('4 → 2 Sätze') && /60 → 55 kg/.test(t), `B3: Vorschlag 4 → 2 Sätze, 60 → 55 kg`);
ok(t.includes('Schätzung'), 'B3: als Schätzung gekennzeichnet');
await shot('4-light-ask');
await p.locator('.sheet button', { hasText: 'Leicht trainieren' }).click(); await p.waitForTimeout(500);
t = await text();
ok(t.includes('Testplan · leicht'), 'B3: Kopfzeile „· leicht“');
ok(await p.locator('.sug-card').count() === 0, 'B3: keine Vorschlagskarte in der leichten Woche');
const rows = await p.evaluate(async () => (await import('./js/session.js')).activeSession().entries[0].sets.map((x) => x.weightKg));
ok(JSON.stringify(rows) === '[55,55]', `B3: 2 Sätze mit 55 kg (${JSON.stringify(rows)})`);
await shot('5-light-training');
await p.evaluate(async () => (await import('./js/session.js')).discard());

// Info mit Quellen
await p.reload(); await p.waitForTimeout(400);
await p.locator('.light-week button.info-btn').click(); await p.waitForTimeout(400);
t = await sheetText();
ok(t.includes('Coleman et al. 2024') && t.includes('Pancar et al. 2026') && t.includes('Rogerson et al. 2024') && t.includes('Plotkin et al. 2022'), 'Info: neue Quellen gelistet');
ok(t.includes('kein Studienwert') || t.includes('keine in Studien getestete'), 'Info: Konvention gekennzeichnet');
await shot('6-light-info');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.locator('button', { hasText: 'Leichte Woche beenden' }).click(); await p.waitForTimeout(300);
ok((await text()).includes('Diese Woche leicht trainieren'), 'B3: leichte Woche beendet');

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log('Screenshots: ' + out);
await b.close(); await srv.close();
done();
