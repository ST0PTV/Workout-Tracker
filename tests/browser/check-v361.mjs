// v3.6.1: 3D-Körper scharf – volle Pixeldichte (3×), geglätteter Umriss (Überabtastung), nach dem Drehen
// wieder volle Qualität, große Ansicht schnell genug. Dunkel und hell. Nur erfundene Testdaten.
// Aufruf: node tests/browser/check-v361.mjs [Ordner für Screenshots]
import { launch, startServer, checker } from './lib.mjs';
const shots = process.argv[2] || null;
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();

// Kantenpixel: teilweise deckend (nur mit Kantenglättung vorhanden; v3.5.2 hatte 0)
const edgeStats = (sel) => {
  const c = document.querySelector(sel);
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let soft = 0; let solid = 0;
  for (let i = 3; i < d.length; i += 4) { if (d[i] > 12 && d[i] < 243) soft++; else if (d[i] >= 243) solid++; }
  return { soft, solid, w: c.width, cssW: Math.round(c.getBoundingClientRect().width) };
};

for (const theme of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, serviceWorkers: 'block' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  await p.evaluate(async () => {
    const lib = await import('./js/exercises.js');
    const P = await import('./js/plans.js');
    const pl = P.newPlan('Push').plan;
    P.addExercises(pl.id, ['bench-press-barbell', 'shoulder-press-dumbbell', 'triceps-pushdown'].map((r) => lib.addFromPool(r).exercise.id));
    P.setPlanDays(pl.id, [(new Date().getDay() + 6) % 7]);
  });
  await p.reload(); await p.waitForTimeout(800);
  if (theme === 'light') { await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); await p.reload(); await p.waitForTimeout(800); await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); }
  const sel = '.start-card canvas.body3d';
  const s = await p.evaluate(edgeStats, sel);
  ok(s.w === s.cssW * 3, `${theme}: Karte zeichnet mit 3× (${s.w} px für ${s.cssW} CSS-px)`);
  ok(s.solid > 1000 && s.soft > s.solid * 0.02, `${theme}: Umriss geglättet (${s.soft} Kantenpixel, ${s.solid} deckend)`);
  if (shots) { const bx = await p.locator(sel).boundingBox(); await p.screenshot({ path: `${shots}/v361-${theme}-card.png`, clip: { x: bx.x - 4, y: bx.y - 4, width: bx.width + 8, height: bx.height + 8 } }); }

  // Drehen: danach wieder geglättet (volle Qualität)
  const box = await p.locator(sel).boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(box.x + box.width / 2 + i * 8, box.y + box.height / 2);
  await p.mouse.up(); await p.waitForTimeout(300);
  const s2 = await p.evaluate(edgeStats, sel);
  ok(s2.soft > s2.solid * 0.01, `${theme}: nach dem Drehen wieder geglättet (${s2.soft} Kantenpixel)`);
  ok(!/Training starten|Satz/.test(await p.evaluate(() => [...document.querySelectorAll('.sheet')].pop()?.innerText || '')), `${theme}: Wischen öffnet nichts`);

  // Große Ansicht: Tipp öffnet sie, Zeichnen in voller Qualität bleibt schnell
  await p.locator(sel).click(); await p.waitForTimeout(500);
  const big = await p.evaluate(() => [...document.querySelectorAll('.sheet canvas.body3d')].pop() ? 'ok' : 'fehlt');
  ok(big === 'ok', `${theme}: große Ansicht offen`);
  const bs = await p.evaluate(edgeStats, '.sheet canvas.body3d');
  ok(bs.w === bs.cssW * 3 && bs.soft > bs.solid * 0.01, `${theme}: große Ansicht 3× und geglättet (${bs.w} px, ${bs.soft} Kantenpixel)`);
  for (const lbl of ['Seite', 'Hinten']) { await p.locator('.body-seg button', { hasText: lbl }).click(); await p.waitForTimeout(500); }
  if (shots) { const bx = await p.locator('.sheet canvas.body3d').boundingBox(); await p.screenshot({ path: `${shots}/v361-${theme}-back.png`, clip: { x: bx.x - 4, y: bx.y - 4, width: bx.width + 8, height: bx.height + 8 } }); }
  ok(errs.length === 0, `${theme}: keine Konsolenfehler ${errs.slice(0, 2).join(' | ')}`);
  await p.context().close();
}
await b.close(); await srv.close(); done();
