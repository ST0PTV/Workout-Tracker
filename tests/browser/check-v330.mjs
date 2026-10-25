// v3.3.0: Plan-Analyse. Pläne anlegen → „Pläne analysieren“ → Animation A (echte Figur, Scanlinie, Schritte) →
// Übersicht C (Figur, Legende, „Zum Anpassen“) → Vorschläge E (Schalter, Zähler) → Übernehmen ändert die Pläne.
// Dazu: „Bewegung reduzieren“ überspringt die Animation. Dunkel und hell.
// Aufruf: node tests/browser/check-v330.mjs [Ordner für Screenshots]
import { launch, startServer, checker } from './lib.mjs';

const shots = process.argv[2] || null;
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();

async function seed(p) {
  await p.evaluate(async () => {
    const P = await import('/js/plans.js'); const L = await import('/js/exercises.js');
    const id = (ref) => (L.addFromPool(ref).exercise || L.listExercises().find((e) => e.source?.ref === ref)).id;
    const mk = (name, refs, days) => { const r = P.newPlan(name); P.addExercises(r.plan.id, refs.map(id)); const p = P.getPlan(r.plan.id); P.savePlan({ ...p, days, items: p.items.map((it) => ({ ...it, targetSets: 3 })) }); };
    mk('Push', ['chest-press-machine', 'shoulder-press-dumbbell', 'triceps-pushdown', 'lateral-raise-dumbbell'], [0, 3]);
    mk('Beine', ['leg-press', 'leg-extension'], [1]);
    mk('Pull', ['seated-cable-row', 'dumbbell-curl'], [2]);
  });
}

for (const theme of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html#/plans'); await p.waitForTimeout(300);
  await seed(p);
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(150);
  await p.evaluate(() => { location.hash = '#/plans'; }); await p.waitForTimeout(300);
  if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const tag = theme;

  await p.getByRole('button', { name: 'Pläne analysieren' }).click(); await p.waitForTimeout(700);
  const an = await p.evaluate(() => { const o = document.querySelector('.an-overlay'); return o ? { svgs: o.querySelectorAll('svg.fig').length, steps: o.querySelectorAll('.an-step').length, fm: o.querySelectorAll('.fm').length, delayed: [...o.querySelectorAll('.fm')].filter((x) => x.style.animationDelay).length } : null; });
  ok(an && an.svgs === 2 && an.steps === 4 && an.fm > 10 && an.delayed === an.fm, `${tag}: Animation mit echter Figur vorn/hinten, 4 Schritten, Verzögerung je Muskel (${JSON.stringify(an)})`);
  if (shots) await p.screenshot({ path: `${shots}/v330-${theme}-anim.png` });
  await p.waitForTimeout(2300);
  const gone = await p.evaluate(() => !document.querySelector('.an-overlay'));
  ok(gone, `${tag}: Animation endet von selbst (≈ 2,5 s)`);
  const c = await p.evaluate(() => document.querySelector('.ana')?.innerText || '');
  ok(/Übersicht/.test(c) && /Zum Anpassen/i.test(c) && !/object HTML/.test(c) && /Beinrückseite kommt kurz/.test(c) && /auffällig/.test(c), `${tag}: Übersicht C mit Vorschlägen und Legende`);
  const figs = await p.evaluate(() => ({ n: document.querySelectorAll('.ana svg.fig').length, warn: document.querySelectorAll('.ana .fm.an-warn').length }));
  ok(figs.n === 2 && figs.warn >= 1, `${tag}: Figur vorn/hinten, auffällige Muskeln orange (${JSON.stringify(figs)})`);
  if (shots) await p.screenshot({ path: `${shots}/v330-${theme}-c.png` });
  await p.getByRole('tab', { name: 'Trainiert (4 Wo.)' }).click(); await p.waitForTimeout(150);
  const low = await p.evaluate(() => document.querySelector('.ana')?.innerText || '');
  ok(/Vergleich ist noch unsicher/.test(low), `${tag}: Hinweis bei wenig Trainingsdaten`);
  await p.getByRole('button', { name: 'Vorschläge ansehen' }).click(); await p.waitForTimeout(250);
  const e = await p.evaluate(() => ({ sw: document.querySelectorAll('.ana .switch').length, on: document.querySelectorAll('.ana .switch:checked').length, btn: [...document.querySelectorAll('.ana .btn.primary')].map((x) => x.textContent).join() }));
  ok(e.sw >= 1 && e.on === e.sw && /Änderung/.test(e.btn), `${tag}: Vorschläge E mit Schaltern, alle an (${JSON.stringify(e)})`);
  if (shots) await p.screenshot({ path: `${shots}/v330-${theme}-e.png` });
  const before = await p.evaluate(async () => (await import('/js/plans.js')).listPlans().map((x) => x.items.length).join(','));
  await p.locator('.ana .switch').first().click(); await p.waitForTimeout(100);
  const btn2 = await p.evaluate(() => document.querySelector('.ana .btn.primary').textContent);
  ok(/übernehmen/.test(btn2), `${tag}: Zähler folgt den Schaltern (${btn2})`);
  await p.locator('.ana .btn.primary').click(); await p.waitForTimeout(400);
  const after = await p.evaluate(async () => (await import('/js/plans.js')).listPlans().map((x) => x.items.length).join(','));
  ok(before !== after || /^0 /.test(btn2), `${tag}: Übernehmen ändert die Pläne (${before} → ${after})`);
  ok(errs.length === 0, `${tag}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// Bewegung reduzieren: keine Animation, direkt die Übersicht
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(srv.url + '/index.html#/plans'); await p.waitForTimeout(300);
  await seed(p);
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(150);
  await p.evaluate(() => { location.hash = '#/plans'; }); await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Pläne analysieren' }).click(); await p.waitForTimeout(300);
  const r = await p.evaluate(() => ({ overlay: !!document.querySelector('.an-overlay'), ana: !!document.querySelector('.ana') }));
  ok(!r.overlay && r.ana, `reduced motion: keine Animation, Übersicht sofort (${JSON.stringify(r)})`);
  await ctx.close();
}
await b.close(); await srv.close();
done();
