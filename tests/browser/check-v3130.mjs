// v3.13.0 (Feature-Audit 2026-10-29): M1 4-Wochen-Raster auf schmalen iPhones, M2 Halteübungen in Sekunden,
// M3 Hinweis „Zum Home-Bildschirm“, M4 Analyse ohne Vorschlag bei 5–9 Sätzen, S1 Assistent im leeren Training-Tab,
// S2 kompakte Vorschlagskarte, S3 Tausch-Alternativen ohne Gruppen. Nur erfundene Testdaten.
// Aufruf: node tests/browser/check-v3130.mjs [Ordner für Screenshots]
import { launch, startServer, checker, loadPlaywright, BAD_TEXT, startPlan } from './lib.mjs';
import { join } from 'node:path';
const shots = process.argv[2] || null;
const pw = await loadPlaywright();
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();

const seed = async () => {
  const st = await import('./js/store.js'); st.set('settings', { ...st.get('settings'), onboarded: true, hints: false });
  const B = await import('./js/plan-builder.js'); const { applyProgram } = await import('./js/plan-apply.js');
  applyProgram(B.buildProgram({ goal: 'muscle', minutes: 60, gear: null, level: 'some', weekdays: [0, 2, 4] }));
  const P = await import('./js/plans.js'); const H = await import('./js/history.js'); const { isTimed } = await import('./js/timed.js');
  const exs = st.get('exercises'); const byId = Object.fromEntries(exs.map((e) => [e.id, e]));
  const plans = P.listPlans(); const now = Date.now(); let k = 0;
  for (let d = 27; d >= 2; d -= 2) {
    const plan = plans[k++ % plans.length];
    const s = new Date(now - d * 864e5); s.setHours(18, 0, 0, 0); const e = new Date(s.getTime() + 55 * 6e4);
    const r = H.newBackfill({ plan, startISO: s.toISOString(), endISO: e.toISOString() }, byId);
    if (!r.ok) continue;
    for (const en of r.draft.entries) {
      const ex = byId[en.exerciseId];
      en.sets.forEach((x, i) => H.setValues(r.draft, en.id, x.id, isTimed(ex) ? { weightKg: null, reps: null, durationSec: 30 + (27 - d) + i * 5 }
        : ex.kind === 'bodyweight' ? { weightKg: 0, reps: 10 - i } : { weightKg: 30 + (27 - d) * 0.5 + i, reps: 10 - i }));
    }
    H.saveNew(r.draft);
  }
};

const profiles = [['iPhone SE', 'dark'], ['iPhone SE', 'light'], ['Pixel 7', 'dark']];
for (const [devName, theme] of profiles) {
  const { defaultBrowserType, ...opts } = pw.devices[devName];
  const T = `${devName} ${theme}`;
  const ctx = await b.newContext({ ...opts, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = (n) => (shots ? p.screenshot({ path: join(shots, `v3130-${devName.replace(/\W+/g, '_')}-${theme}-${n}.png`) }) : null);
  const go = async (hash) => { await p.evaluate((x) => { location.hash = x; }, hash); await p.waitForTimeout(400); };
  const closeSheets = () => p.evaluate(() => document.querySelectorAll('.sheet-close').forEach((x) => x.click()));
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  await p.evaluate(async (light) => { const st = await import('./js/store.js'); st.set('settings', { ...st.get('settings'), appearance: light ? 'light' : 'dark' }); }, theme === 'light');
  await p.reload(); await p.waitForTimeout(500);
  if (theme === 'light') ok(await p.evaluate(() => document.documentElement.dataset.theme === 'light'), `${T}: helles Design aktiv`);

  // M3 + S1: neuer Nutzer
  ok(await p.locator('.home-hint').count() === 1 && /Home-Bildschirm/.test(await p.locator('.home-hint').innerText()), `${T}: Hinweis „Zum Home-Bildschirm“ sichtbar (Browser, nicht installiert)`);
  const assist = p.locator('#view .card.empty').getByRole('button', { name: 'Plan vorschlagen lassen' });
  ok(await assist.count() === 1, `${T}: leerer Training-Tab bietet „Plan vorschlagen lassen“`);
  await shot('1-new');
  await assist.click(); await p.waitForTimeout(400);
  ok(/Frage 1 von/.test(await p.evaluate(() => document.querySelector('.sheet')?.innerText || '')), `${T}: öffnet den Plan-Assistenten`);
  await closeSheets(); await p.waitForTimeout(300);
  await p.locator('.home-hint').getByRole('button', { name: 'Verstanden' }).click(); await p.waitForTimeout(250);
  ok(await p.locator('.home-hint').count() === 0 && (await p.evaluate(async () => (await import('./js/store.js')).get('settings').homeHint)) === true, `${T}: „Verstanden“ blendet den Hinweis dauerhaft aus`);

  // Daten
  await p.evaluate(seed); await p.reload(); await p.waitForTimeout(600);

  // M1: 4-Wochen-Raster
  await go('#/progress'); await p.getByRole('tab', { name: '4 Wochen' }).click(); await p.waitForTimeout(400);
  const names = await p.evaluate(() => [...document.querySelectorAll('.a4n')].map((e) => ({ t: e.textContent, w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) })));
  ok(names.length > 5 && names.every((n) => n.w >= 90 && n.h <= 40), `${T}: Muskelnamen lesbar, eine Zeile (${JSON.stringify(names.slice(0, 2))})`);
  const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  ok(!over, `${T}: nichts ragt seitlich heraus`);
  await shot('2-4wochen');

  // M2: Fortschritt einer Halteübung
  await p.getByRole('tab', { name: 'Übungen' }).click(); await p.waitForTimeout(300);
  const plankRow = p.locator('#view .prow', { hasText: 'Unterarmstütz' });
  ok(/zuletzt \d:\d\d/.test(await plankRow.innerText()), `${T}: Liste zeigt die Haltezeit („${(await plankRow.innerText()).replace(/\n/g, ' ')}“)`);
  await plankRow.click(); await p.waitForTimeout(400);
  const pt = await p.evaluate(() => document.querySelector('.sheet')?.innerText || '');
  ok(/Längste Haltezeit/.test(pt) && !/Max-Kraft/.test(pt) && !/× null|undefined/.test(pt), `${T}: Verlauf Plank mit längster Haltezeit, ohne Schätzung`);
  await shot('3-plank-verlauf'); await closeSheets(); await p.waitForTimeout(300);

  // M4: Analyse
  await go('#/plans'); await p.getByRole('button', { name: 'Pläne analysieren' }).click(); await p.waitForTimeout(3200);
  const at = await p.evaluate(() => document.querySelector('.sheet')?.innerText || '');
  ok(!/Für Muskelwachstum fand ACSM 2026 mehr Wirkung ab etwa 10 Sätzen pro Woche\. Orientierung, kein Muss – vor allem/.test(at), `${T}: kein Volumen-Vorschlag für den Assistenten-Plan`);
  ok(/Knapp unter 10 Sätzen pro Woche/.test(at), `${T}: neutraler Hinweis „Knapp unter 10 Sätzen“`);
  await shot('4-analyse'); await closeSheets(); await p.waitForTimeout(300);

  // S2 + S3: Training
  await go('#/');
  // v3.14.0: gezielt den Plan mit der Halteübung starten – welcher Plan oben steht, hängt vom Wochentag ab
  // (WebKit-CI am Freitag/Samstag startete „Ganzkörper B“ ohne Plank).
  const holdPlan = await p.evaluate(async () => {
    const st = await import('./js/store.js'); const { isTimed } = await import('./js/timed.js');
    const ex = Object.fromEntries(st.get('exercises').map((e) => [e.id, e]));
    return st.get('plans').find((pl) => (pl.items || []).some((i) => ex[i.exerciseId] && isTimed(ex[i.exerciseId])))?.name || null;
  });
  ok(!!holdPlan, `${T}: Vorbedingung – ein Plan enthält eine Halteübung (${holdPlan})`);
  await startPlan(p, holdPlan); await p.waitForTimeout(600);
  const sug = await p.locator('.sug-card').count();
  const firstRow = await p.evaluate(() => { const r = document.querySelector('.setrow'); return r ? Math.round(r.getBoundingClientRect().bottom) : 9999; });
  const vh = await p.evaluate(() => innerHeight);
  ok(sug === 1, `${T}: Vorschlagskarte da`);
  const btns = await p.evaluate(() => [...document.querySelectorAll('.sug-card .btn')].map((x) => Math.round(x.getBoundingClientRect().top)));
  ok(btns.length === 2 && btns[0] === btns[1], `${T}: „Übernehmen“ und „Wie zuletzt“ nebeneinander`);
  if (devName === 'Pixel 7') ok(firstRow < vh - 60, `${T}: erster Satz ohne Scrollen sichtbar (unten ${firstRow} von ${vh})`);
  else console.log(`info ${T}: erster Satz endet bei ${firstRow} von ${vh} px (320×568)`);
  await shot('5-session');
  await p.getByRole('button', { name: /Tauschen/ }).first().click(); await p.waitForTimeout(250);
  const swapT = await p.locator('.swap-list').innerText();
  ok(/Aus dem Startpool/.test(swapT) || (await p.locator('.swap-list .row').count()) >= 2, `${T}: Tauschen bietet Alternativen ohne Gruppen`);
  await shot('6-tauschen');
  const poolRow = p.locator('.swap-list .row', { hasText: 'Aus dem Startpool' }).first();
  if (await poolRow.count()) {
    const name = (await poolRow.locator('b').innerText()).trim();
    await poolRow.click(); await p.waitForTimeout(400);
    ok(await p.evaluate(async (n) => (await import('./js/exercises.js')).listExercises().some((e) => e.name === n), name) && (await p.locator('h2.exh, #view h2').first().innerText()).includes(name), `${T}: Pool-Alternative „${name}“ übernommen und getauscht`);
  }

  // M2: Halteübung im Training
  // v3.14.0: auf den Übungsnamen (h2.exh) warten statt fester 250 ms – in WebKit (CI) war die Schleife sonst zu schnell
  const exName = () => p.locator('h2.exh').first().innerText().catch(() => '');
  const seen = [];
  for (let i = 0; i < 14; i++) {
    const cur = await exName(); seen.push(cur);
    if (/Unterarmstütz|Seitstütz/.test(cur)) break;
    const nx = p.getByRole('button', { name: 'Nächste Übung' });
    if (!(await nx.count())) break;
    await nx.first().click();
    await p.waitForFunction((prev) => (document.querySelector('h2.exh')?.textContent || '') !== prev, cur, { timeout: 3000 }).catch(() => {});
  }
  if (!/Unterarmstütz|Seitstütz/.test(seen.at(-1))) console.log(`info ${T}: Übungen im Pager: ${seen.join(' → ')}`);
  const head = await exName();
  ok(/Unterarmstütz|Seitstütz/.test(head), `${T}: Halteübung im Plan erreicht`);
  ok(/sek\./i.test(await p.locator('.card.sets .hdrrow').innerText()), `${T}: Spalte „Sek.“ statt „Wdh.“`);
  const hold = p.locator('.setrow input[aria-label*="Haltezeit"]').first();
  ok(await hold.count() === 1, `${T}: Eingabe Haltezeit`);
  await hold.fill('47'); await hold.dispatchEvent('change');
  await p.locator('.setrow .ck').first().click(); await p.waitForTimeout(300);
  const saved = await p.evaluate(async () => { const S = await import('./js/session.js'); const s = S.activeSession(); return s.entries.flatMap((e) => e.sets).find((x) => x.durationSec === 47 && x.completedAt) ? true : false; });
  ok(saved, `${T}: Satz mit 47 s gespeichert und erledigt`);
  ok(await p.locator('.sug-card').count() === 0, `${T}: kein Wdh.-Vorschlag bei der Halteübung`);
  ok(await p.locator('.setrow + .quick, .quick').count() === 0, `${T}: keine Drop-/Rest-Pause-Knöpfe bei der Halteübung`);
  await shot('7-plank');
  await p.evaluate(async () => (await import('./js/session.js')).discard()); await p.waitForTimeout(200);

  // M2: eigene Übung „Messen in“
  await p.evaluate(async () => { const v = await import('./js/exercises-view.js'); v.openEditor(null, () => {}); }); await p.waitForTimeout(300);
  const mi = p.locator('.sheet [aria-label="Messen in"]');
  ok(await mi.count() === 1 && (await mi.locator('button.on').innerText()) === 'Wiederholungen', `${T}: Editor: „Messen in“ für eigene Übungen, Standard Wiederholungen`);
  await mi.getByRole('radio', { name: 'Sekunden' }).click(); await p.waitForTimeout(100);
  ok((await mi.locator('button.on').innerText()) === 'Sekunden', `${T}: auf Sekunden umschaltbar`);
  await closeSheets();

  ok(!BAD_TEXT.test(await p.evaluate(() => document.body.innerText)), `${T}: kein null/undefined/NaN im Text`);
  ok(errs.length === 0, `${T}: keine Konsolenfehler ${errs.join(' | ')}`);
  await ctx.close();
}
await b.close(); await srv.close(); done();
