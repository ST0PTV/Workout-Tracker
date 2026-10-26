// v3.1.0: Tab-Leiste Variante B (vier Tabs + Play in der Mitte), Zahnrad zu den Einstellungen, Play-Sheet mit dem
// nächsten Plan, Start über das Sheet, laufendes Training öffnet sich direkt. Dunkel und hell.
// Aufruf: node tests/browser/check-v310.mjs
import { launch, startServer, checker } from './lib.mjs';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();

for (const theme of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('dialog', (d) => d.accept());
  await p.goto(srv.url + '/index.html#/exercises'); await p.waitForTimeout(400);
  await p.getByRole('button', { name: /Startpool-Übungen übernehmen/ }).click(); await p.waitForTimeout(250);
  await p.getByRole('button', { name: /^136 übernehmen/ }).click(); await p.waitForTimeout(400);
  // drei Pläne anlegen; Beine wurde am längsten nicht trainiert (nur Push hat einen Verlauf-Eintrag ist nicht nötig: nie trainiert → alphabetisch)
  await p.evaluate(async () => {
    const P = await import('/js/plans.js'); const L = await import('/js/exercises.js');
    const ids = L.listExercises().slice(0, 3).map((e) => e.id);
    for (const n of ['Push', 'Pull', 'Beine']) { const r = P.newPlan(n); P.addExercises(r.plan.id, ids); }
  });
  await p.evaluate(() => { location.hash = '#/plans'; }); await p.waitForTimeout(200);
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(400);
  if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const tag = theme;

  const bar = await p.evaluate(() => [...document.getElementById('tabbar').children].map((c) => c.className + ':' + (c.textContent || c.getAttribute('aria-label') || '')));
  ok(bar.length === 5 && bar[2].startsWith('tb-mid') && !bar.join().includes('Einstellungen'), `${tag}: vier Tabs + Play in der Mitte (${bar.join(' | ')})`);
  const play = await p.evaluate(() => { const r = document.querySelector('.tb-play').getBoundingClientRect(); const t = document.getElementById('tabbar').getBoundingClientRect(); return { top: Math.round(r.top), barTop: Math.round(t.top), w: Math.round(r.width) }; });
  ok(play.top < play.barTop && play.w === 58, `${tag}: Play-Knopf erhöht über der Leiste (${JSON.stringify(play)})`);

  // Zahnrad → Einstellungen
  await p.getByRole('link', { name: 'Einstellungen' }).click(); await p.waitForTimeout(300);
  ok((await p.evaluate(() => location.hash)) === '#/settings', `${tag}: Zahnrad öffnet die Einstellungen`);
  await p.screenshot({ path: `/tmp/claude-0/-home-claude/9728a247-0af6-57f8-95e2-9ebd7349cbef/scratchpad/v310-${theme}-settings.png` });

  // Play-Sheet
  await p.locator('.tb-play').click(); await p.waitForTimeout(400);
  const sheet = await p.evaluate(() => document.querySelector('.sheet')?.innerText || '');
  ok(/Training starten/.test(sheet) && /Als Nächstes\s*Beine/.test(sheet) && /Anderer Plan/i.test(sheet) && /Freies Training/.test(sheet), `${tag}: Sheet zeigt Beine als Nächstes (${sheet.replace(/\s+/g, ' ').slice(0, 120)})`);
  await p.screenshot({ path: `/tmp/claude-0/-home-claude/9728a247-0af6-57f8-95e2-9ebd7349cbef/scratchpad/v310-${theme}-sheet.png` });
  await p.getByRole('button', { name: 'Beine starten' }).click(); await p.waitForTimeout(500);
  const after = await p.evaluate(async () => { const S = await import('/js/session.js'); const P = await import('/js/plans.js'); const s = S.activeSession(); return { hash: location.hash, plan: s && P.getPlan(s.planId)?.name, sheets: document.querySelectorAll('.sheet').length }; });
  ok(after.hash === '#/' && after.plan === 'Beine' && after.sheets === 0, `${tag}: Start über das Sheet (${JSON.stringify(after)})`);
  await p.screenshot({ path: `/tmp/claude-0/-home-claude/9728a247-0af6-57f8-95e2-9ebd7349cbef/scratchpad/v310-${theme}-run.png` });

  // laufendes Training: Play geht direkt dorthin
  await p.evaluate(() => { location.hash = '#/progress'; }); await p.waitForTimeout(300);
  await p.locator('.tb-play').click(); await p.waitForTimeout(400);
  const back = await p.evaluate(() => ({ hash: location.hash, sheets: document.querySelectorAll('.sheet').length }));
  ok(back.hash === '#/' && back.sheets === 0, `${tag}: laufendes Training öffnet sich direkt (${JSON.stringify(back)})`);
  ok(errs.length === 0, `${tag}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await p.context().close();
}
await b.close(); await srv.close();
done();
