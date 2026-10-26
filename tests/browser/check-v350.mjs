// v3.5.0: Mobility-Bereich unter Routinen, Abstand im Routinen-Editor, Gesamtdauer für Routine und Plan. Dunkel und hell.
// Aufruf: node tests/browser/check-v350.mjs [Ordner für Screenshots]
import { launch, startServer, checker } from './lib.mjs';

const shots = process.argv[2] || null;
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const lastSheet = () => [...document.querySelectorAll('.sheet')].pop()?.innerText || '';

for (const theme of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(srv.url + '/index.html#/plans'); await p.waitForTimeout(400);
  if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const tag = theme;

  // Mobility-Bereich
  await p.getByRole('tab', { name: 'Routinen' }).click(); await p.waitForTimeout(300);
  const secs = await p.evaluate(() => [...document.querySelectorAll('.routines .sec')].map((x) => x.innerText.trim()));
  ok(JSON.stringify(secs.map((s) => s.toLowerCase())) === JSON.stringify(["aufwärmen", "cool-down", "mobility"]), `${tag}: drei Bereiche ${JSON.stringify(secs)}`);
  const mob = await p.evaluate(() => [...document.querySelectorAll('.routines section')].pop().innerText);
  ok(/Mobilitätsprogramm 15 min/.test(mob) && /Beweglichkeit Arme & Hände/.test(mob), `${tag}: Vorlagen unter Mobility`);
  if (shots) await p.screenshot({ path: `${shots}/v350-${theme}-routines.png`, fullPage: true });

  // Kopie der Vorlage bearbeiten: Dauer ändern, Abstand prüfen
  await p.getByText('Mobilitätsprogramm 15 min').first().click(); await p.waitForTimeout(300);
  ok(/Mobility ·/.test(await p.evaluate(lastSheet)), `${tag}: Detail zeigt „Mobility“`);
  const copyBtn = p.getByRole('button', { name: /Kopie|bearbeiten/i }).first();
  await copyBtn.click(); await p.waitForTimeout(400);
  const dur0 = await p.evaluate(() => document.querySelector('.rt-total .step')?.innerText || document.querySelector('.rt-total')?.innerText || '');
  ok(/(^|\s)15 min/.test(dur0) && !/≈|Schätzung/.test(dur0), `${tag}: Gesamtdauer 15 min ohne ≈ und Schätzung (${dur0.replace(/\n/g, ' ')})`);
  await p.getByRole('button', { name: /Gesamtdauer.*(weniger|minus|−)/i }).first().click().catch(async () => { await p.locator('.rt-total button').first().click(); });
  await p.waitForTimeout(300);
  const dur1 = await p.evaluate(() => document.querySelector('.rt-total')?.innerText || '');
  ok(/(^|\s)(9|10|11) min/.test(dur1) && !/≈|Schätzung/.test(dur1), `${tag}: nach − etwa 10 min (${dur1.replace(/\n/g, ' ')})`);
  const reps = await p.evaluate(() => [...document.querySelectorAll('.rt-item .step')].map((x) => x.innerText.replace(/\s+/g, ' ')).slice(0, 3));
  ok(reps.some((t) => /1[0-4]×/.test(t)), `${tag}: Wiederholungen anteilig kleiner ${JSON.stringify(reps)}`);
  const gap = await p.evaluate(() => {
    const add = [...document.querySelectorAll('.routine-edit .addline')].pop();
    const row = add?.nextElementSibling;
    return add && row ? Math.round(row.getBoundingClientRect().top - add.getBoundingClientRect().bottom) : -1;
  });
  ok(gap >= 10, `${tag}: Abstand Katalog-Taste → Tasten ${gap}px`);
  await p.locator('.routine-edit .addline').last().scrollIntoViewIfNeeded();
  if (shots) await p.screenshot({ path: `${shots}/v350-${theme}-editor.png` });
  ok(!/object HTML/.test(await p.evaluate(lastSheet)), `${tag}: kein [object HTML…] im Editor`);
  await p.getByRole('button', { name: 'Abbrechen' }).last().click(); await p.waitForTimeout(300);
  await p.evaluate(() => { for (const s of document.querySelectorAll('.sheet-close')) s.click(); }); await p.waitForTimeout(300);

  // Plan-Dauer
  const planId = await p.evaluate(async () => {
    const lib = await import('./js/exercises.js'); const P = await import('./js/plans.js');
    const ids = ['leg-press', 'chest-press-machine', 'seated-cable-row', 'lateral-raise-dumbbell', 'dumbbell-curl'].map((r) => lib.addFromPool(r).exercise.id);
    const r = P.newPlan('Dauer-Test'); P.addExercises(r.plan.id, ids);
    const pl = P.getPlan(r.plan.id); P.savePlan({ ...pl, items: pl.items.map((it) => ({ ...it, targetSets: 3 })) });
    return r.plan.id;
  });
  await p.evaluate(() => { location.hash = '#/training'; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = '#/plans'; }); await p.waitForTimeout(300);
  await p.getByRole('tab', { name: 'Pläne' }).click().catch(() => {}); await p.waitForTimeout(200);
  await p.getByText('Dauer-Test').first().click(); await p.waitForTimeout(300);
  const head = await p.evaluate(lastSheet);
  const m0 = Number((head.match(/· (\d+) min/) || [])[1]);
  ok(m0 > 0, `${tag}: Plan zeigt ${m0} min`);
  await p.getByRole('button', { name: /Bearbeiten/ }).first().click(); await p.waitForTimeout(300);
  ok(await p.locator('.plan-dur').count() === 1, `${tag}: Gesamtdauer im Bearbeiten-Modus`);
  await p.locator('.plan-dur button').first().click(); await p.waitForTimeout(300);
  const m1 = Number(((await p.evaluate(() => document.querySelector('.plan-dur').innerText)).match(/(\d+) min/) || [])[1]);
  ok(m1 < m0, `${tag}: Plan kürzer (${m0} → ${m1} min)`);
  const sets = await p.evaluate((id) => import('./js/plans.js').then((P) => P.getPlan(id).items.map((it) => it.targetSets)), planId);
  ok(sets[0] === 3 && sets.every((s) => s >= 1) && sets.some((s) => s < 3), `${tag}: Einzelgelenk zuerst gekürzt ${JSON.stringify(sets)}`);
  if (shots) await p.screenshot({ path: `${shots}/v350-${theme}-plan.png` });
  ok(errs.length === 0, `${tag}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await p.context().close();
}
await b.close(); await srv.close();
done();
