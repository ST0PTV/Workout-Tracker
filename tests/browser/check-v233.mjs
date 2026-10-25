// v2.33.0: Browser-Prüfung – drehbarer 3D-Körper auf den Plankarten, Plan des Tages oben, große Ansicht.
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v233.mjs   (Screenshots in WT_OUT/v233)
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('v233');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
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
  const ids = (refs) => refs.map((r) => lib.addFromPool(r).exercise.id);
  const today = (new Date().getDay() + 6) % 7;
  const mk = (name, refs, days) => { const pl = P.newPlan(name).plan; P.addExercises(pl.id, ids(refs)); P.setPlanDays(pl.id, days); };
  mk('Beine', ['back-squat', 'romanian-deadlift', 'standing-calf-raise'], [(today + 2) % 7]);
  mk('Pull', ['lat-pulldown', 'seated-cable-row', 'dumbbell-curl'], [(today + 1) % 7]);
  mk('Push', ['bench-press-barbell', 'shoulder-press-dumbbell', 'triceps-pushdown'], [today]);
  mk('Nur Cardio', ['treadmill-running'], []);
});
await p.reload(); await p.waitForTimeout(800);

// ab 2.34.0 (Startseite A): Plan von heute als große Karte, übrige als kompakte Zeilen
const cards = await p.evaluate(() => [...document.querySelectorAll('.start-card, .start-row')].map((c) => ({ name: c.querySelector('.pc-top b, .t > b').textContent, today: c.classList.contains('today'), canvas: !!c.querySelector('canvas.body3d'), svg: !!c.querySelector('.plan-fig svg') })));
ok(cards[0]?.name === 'Push' && cards[0].today, `T: Plan des Tages oben und markiert (${cards.map((c) => c.name).join(', ')})`);
ok(cards.filter((c) => c.today).length === 1, 'T: nur ein Plan als „Heute“');
ok((await text()).includes('Heute'), 'T: Label „Heute“');
ok(cards.filter((c) => c.name !== 'Nur Cardio').every((c) => c.canvas), 'K: Kraftpläne mit 3D-Figur (Canvas)');
ok(!cards.find((c) => c.name === 'Nur Cardio').canvas && !cards.find((c) => c.name === 'Nur Cardio').svg, 'K: Cardio-Plan ohne Figur');
const names = cards.map((c) => c.name);
ok(JSON.stringify(names.slice(1)) === JSON.stringify(['Beine', 'Nur Cardio', 'Pull']), `T: übrige alphabetisch (${names.slice(1).join(', ')})`);
// Figur ist wirklich gezeichnet (nicht leer) und färbt Hauptmuskeln in der Akzentfarbe
const px = await p.evaluate(() => {
  const c = document.querySelector('.start-card.today canvas.body3d');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let filled = 0; let accent = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 200) { filled++; if (d[i + 1] > 150 && d[i + 2] > 140 && d[i] < 160) accent++; } }
  return { filled, accent, total: d.length / 4 };
});
ok(px.filled > px.total * 0.1 && px.accent > 50, `K: Figur gezeichnet (${px.filled} Pixel, ${px.accent} in Akzentfarbe)`);
await shot('1-start');

// Drehen per Wischen: Bild ändert sich, Karte startet kein Training
const before = await p.evaluate(() => document.querySelector('.start-card.today canvas.body3d').toDataURL());
const box = await p.locator('.start-card.today canvas.body3d').boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await p.mouse.down();
for (let i = 1; i <= 8; i++) await p.mouse.move(box.x + box.width / 2 + i * 8, box.y + box.height / 2);
await p.mouse.up(); await p.waitForTimeout(300);
const after = await p.evaluate(() => document.querySelector('.start-card.today canvas.body3d').toDataURL());
ok(before !== after, 'K: Wischen dreht die Figur');
ok(await p.locator('.sheet').count() === 0, 'K: Wischen öffnet keine große Ansicht');
ok(!(await p.evaluate(async () => (await import('./js/session.js')).activeSession())), 'K: kein Training gestartet');
await shot('2-turned');

// Tippen öffnet die große Ansicht
await p.locator('.start-card.today canvas.body3d').click(); await p.waitForTimeout(500);
const st = await p.locator('.sheet').last().innerText();
ok(st.includes('Hauptmuskeln') && st.includes('Brust') && st.includes('Trizeps'), 'G: große Ansicht mit Hauptmuskeln');
ok(st.includes('Mitbeteiligt'), 'G: mitbeteiligte Muskeln');
ok(await p.locator('.sheet canvas.body3d').count() === 1, 'G: große drehbare Figur');
await shot('3-sheet-front');
await p.locator('.sheet .body-seg button', { hasText: 'Hinten' }).click(); await p.waitForTimeout(600);
await shot('4-sheet-back');
await p.locator('.sheet .body-seg button', { hasText: 'Seite' }).click(); await p.waitForTimeout(600);
await shot('5-sheet-side');
ok(!BAD_TEXT.test(await text()), 'kein null/undefined/NaN');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// Weibliche Figur
await p.evaluate(async () => { const s = await import('./js/store.js'); s.set('settings', { ...s.get('settings'), figure: 'female' }); });
await p.reload(); await p.waitForTimeout(800);
ok(await p.locator('.start-card canvas.body3d, .start-row canvas.body3d').count() === 3, 'K: weibliche Figur ebenfalls 3D');
await shot('6-female');

// Starten funktioniert weiter
await p.locator('.start-card.today button', { hasText: 'Starten' }).click(); await p.waitForTimeout(600);
if (await p.locator('.sheet button', { hasText: /normal/i }).count()) { await p.locator('.sheet button', { hasText: /normal/i }).first().click(); await p.waitForTimeout(400); }
ok(!!(await p.evaluate(async () => (await import('./js/session.js')).activeSession())), 'Starten startet das Training');

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log('Screenshots: ' + out);
await b.close(); await srv.close();
done();
