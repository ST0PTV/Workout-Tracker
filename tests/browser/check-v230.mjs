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

// ---------- B1: Supersätze (Variante B) ----------
await p.evaluate(async () => {
  const lib = await import('./js/exercises.js');
  const P = await import('./js/plans.js');
  const store = await import('./js/store.js');
  store.set('sessions', []);
  const a = lib.addFromPool('dumbbell-curl').exercise;
  const b = lib.addFromPool('triceps-pushdown').exercise || lib.listExercises().find((e) => e.name.includes('Rudern'));
  const plan = P.newPlan('Arme SS').plan;
  P.addExercises(plan.id, [a.id, b.id]);
  P.setItemRest(plan.id, P.getPlan(plan.id).items[1].id, 150);
});
await p.goto(srv.url + '/index.html#/plans'); await p.waitForTimeout(400);
await p.locator('.pcard', { hasText: 'Arme SS' }).click(); await p.waitForTimeout(400);
await p.locator('.sheet button.pill', { hasText: 'Bearbeiten' }).click(); await p.waitForTimeout(300);
await p.locator('.sheet button.ss-link').first().click(); await p.waitForTimeout(300);
ok((await p.locator('.sheet button.ss-link.on').count()) === 1, 'B1: im Editor gekoppelt');
await p.locator('.sheet .plan').screenshot({ path: join(out, '7-plan-link.png') });
await p.locator('.sheet button.pill', { hasText: 'Fertig' }).click(); await p.waitForTimeout(300);
ok((await sheetText()).toLowerCase().includes('supersatz'), 'B1: Ansicht zeigt „Supersatz“');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
await p.locator('.start-card', { hasText: 'Arme SS' }).locator('button', { hasText: 'Starten' }).click(); await p.waitForTimeout(500);
if (await p.locator('.sheet', { hasText: 'Leichte Woche' }).count()) { await p.locator('.sheet button', { hasText: 'Heute normal' }).click(); await p.waitForTimeout(400); }
ok(await p.locator('.ss-seg button').count() === 2, 'B1: Umschalter A | B');
const fillAndCheck = async () => {
  const row = p.locator('.setrow:not(.done)').first();
  await row.locator('input.val').nth(0).fill('12'); await row.locator('input.val').nth(0).dispatchEvent('change');
  await row.locator('input.val').nth(1).fill('10'); await row.locator('input.val').nth(1).dispatchEvent('change');
  await row.locator('.ck').click(); await p.waitForTimeout(500);
};
await fillAndCheck();
t = await text();
ok((await p.locator('.ss-seg button.on').innerText()).startsWith('B'), 'B1: nach Satz A → Seite B');
ok(t.includes('Supersatz: direkt weiter mit B'), 'B1: Hinweis „direkt weiter mit B“');
ok(await p.locator('.restbar:not([hidden])').count() === 0, 'B1: keine Pause innerhalb der Runde');
await shot('8-ss-switch');
await fillAndCheck();
t = await text();
ok((await p.locator('.ss-seg button.on').innerText()).startsWith('A'), 'B1: nach Satz B → zurück zu A');
ok(t.includes('Runde fertig – nach der Pause weiter mit A'), 'B1: Hinweis „Runde fertig“');
const sub = await p.locator('.restbar .rt-sub').innerText();
ok(/Runde A \+ B/.test(sub) && /2:2\d|2:30/.test(await p.locator('.restbar .rt-time').innerText()), `B1: Pause nach der Runde, 2:30 (${sub})`);
await shot('9-ss-rest');
// Weiter von A → B (in der Gruppe): keine Bewertung; Weiter von B → Bewertung für A und B
await p.locator('button[aria-label="Nächste Übung"]').click(); await p.waitForTimeout(400);
ok(await p.locator('.rate-sheet').count() === 0, 'B1: Wechsel innerhalb der Gruppe ohne Bewertung');
await p.locator('button', { hasText: 'Beenden' }).last().click(); await p.waitForTimeout(400);
ok(await p.locator('.rate-sheet').count() === 1, 'B1: beim Verlassen der Gruppe Bewertung');
await p.locator('.rate-sheet .rate-btn').nth(1).click(); await p.waitForTimeout(400);
ok(await p.locator('.rate-sheet').count() === 1, 'B1: zweite Bewertung für das andere Mitglied');
await p.locator('.rate-sheet .rate-btn').nth(1).click(); await p.waitForTimeout(600);
const rated = await p.evaluate(async () => (await import('./js/store.js')).get('sessions').filter((s) => s.endedAt).at(-1).entries.map((e) => e.rating));
ok(JSON.stringify(rated) === '["right","right"]', `B1: beide bewertet (${JSON.stringify(rated)})`);

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log('Screenshots: ' + out);
await b.close(); await srv.close();
done();
