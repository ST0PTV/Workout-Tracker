// v3.12.0: Fortschritt-Reiter einzeilig (auch 320 px, „4 Wochen“) und Schalter „Grundübung ja/nein“ für eigene Übungen (#309).
// Aufruf: node tests/browser/check-v3120.mjs [Ordner für Screenshots]
import { launch, startServer, checker, loadPlaywright, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';
const shots = process.argv[2] || null;
const pw = await loadPlaywright();
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();

const profiles = [['iPhone SE', null], ['iPhone SE', { width: 320, height: 568 }], ['Pixel 7', null]];
for (const [devName, vp] of profiles) for (const theme of ['dark', 'light']) {
  const { defaultBrowserType, ...opts } = pw.devices[devName];
  const T = `${devName}${vp ? ' 320' : ''} ${theme}`;
  const ctx = await b.newContext({ ...opts, ...(vp ? { viewport: vp } : {}), serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = (n) => (shots ? p.screenshot({ path: join(shots, `v3120-${devName.replace(/\W+/g, '_')}${vp ? '-320' : ''}-${theme}-${n}.png`) }) : null);
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  await p.evaluate(async (light) => { const st = await import('./js/store.js'); st.set('settings', { ...st.get('settings'), onboarded: true, hints: false, appearance: light ? 'light' : 'dark' }); }, theme === 'light');
  await p.goto(srv.url + '/index.html#/progress'); await p.reload(); await p.waitForTimeout(500);

  // 1) Reiter einzeilig: Höhe = eine Textzeile, Text bleibt in der Taste, alle vier in einer Reihe
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#view .seg [role=tab]')].map((e) => {
    const r = e.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(e);
    const lines = new Set([...range.getClientRects()].map((q) => Math.round(q.top))).size;
    return { t: e.textContent, top: Math.round(r.top), h: Math.round(r.height), lines, overflow: e.scrollWidth > e.clientWidth + 1 };
  }));
  ok(tabs.length === 4, `${T}: vier Reiter (${tabs.map((x) => x.t).join(' · ')})`);
  ok(tabs.every((x) => x.lines === 1 && !x.overflow), `${T}: jeder Reiter einzeilig, nichts abgeschnitten (${JSON.stringify(tabs.map((x) => [x.lines, x.overflow]))})`);
  ok(new Set(tabs.map((x) => x.top)).size === 1, `${T}: alle Reiter in einer Reihe`);
  await shot('progress');

  // 2) Schalter „Grundübung“ im Editor
  await p.evaluate(async () => {
    const st = await import('./js/store.js'); const lib = await import('./js/exercises.js'); const m = await import('./js/model.js');
    const mk = (name, extra) => lib.saveExercise({ ...m.createExercise(), name, muscles: { primary: ['chest'], secondary: [] }, ...extra });
    mk('Eigene Fliegende'); mk('Eigene Cardio', { kind: 'cardio', muscles: { primary: [], secondary: [] } });
    const v = await import('./js/exercises-view.js');
    window.__open = (name) => v.openEditor(lib.listExercises().find((e) => e.name === name), () => {});
    window.__stored = (name) => lib.listExercises().find((e) => e.name === name);
  });
  await p.evaluate(() => window.__open('Eigene Fliegende')); await p.waitForTimeout(300);
  const sw = p.locator('.sheet [role=radiogroup][aria-label="Grundübung"]');
  ok(await sw.count() === 1, `${T}: Schalter Grundübung sichtbar (eigene Kraftübung)`);
  ok(await sw.locator('button.on').innerText() === 'Nein', `${T}: 1 Muskel → automatisch „Nein“`);
  ok(/Automatisch vorgeschlagen/.test(await p.locator('.sheet .field:has([aria-label="Grundübung"])').innerText()), `${T}: Hinweis „automatisch“ (Konvention)`);
  await shot('editor-auto');
  const box = await sw.locator('button').first().boundingBox();
  // sichtbar 32 px wie alle Segment-Tasten; die 44-px-Tippfläche (::after) prüft check-v3100 im Sheet „Übung bearbeiten“-Umfeld
  const hit = await sw.locator('button').first().evaluate((e) => { const a = getComputedStyle(e, '::after'); return parseFloat(a.height) || 0; });
  ok(box.height >= 32 && (box.height >= 44 || hit >= 44), `${T}: Schalter-Taste mit 44-px-Tippfläche (${Math.round(box.height)} sichtbar, ::after ${Math.round(hit)})`);
  await sw.getByRole('radio', { name: 'Ja' }).click(); await p.waitForTimeout(80);
  ok(await sw.locator('button.on').innerText() === 'Ja' && (await sw.getByRole('radio', { name: 'Ja' }).getAttribute('aria-checked')) === 'true', `${T}: „Ja“ gewählt`);
  ok(/Von dir festgelegt/.test(await p.locator('.sheet .field:has([aria-label="Grundübung"])').innerText()), `${T}: Hinweis „von dir festgelegt“`);
  await shot('editor-set');
  await p.getByRole('button', { name: 'Speichern', exact: true }).last().click(); await p.waitForTimeout(250);
  ok((await p.evaluate(() => window.__stored('Eigene Fliegende').compound)) === true, `${T}: gespeichert (compound = true)`);

  // zurück auf automatisch
  await p.evaluate(() => window.__open('Eigene Fliegende')); await p.waitForTimeout(300);
  await p.locator('.sheet').getByRole('button', { name: 'Automatisch', exact: true }).click(); await p.waitForTimeout(80);
  ok(await sw.locator('button.on').innerText() === 'Nein', `${T}: „Automatisch“ stellt die Heuristik wieder her`);
  await p.getByRole('button', { name: 'Speichern', exact: true }).last().click(); await p.waitForTimeout(250);
  ok((await p.evaluate(() => 'compound' in window.__stored('Eigene Fliegende'))) === false, `${T}: Feld wieder entfernt`);

  // Cardio und Pool-Übung: kein Schalter
  await p.evaluate(() => window.__open('Eigene Cardio')); await p.waitForTimeout(300);
  ok(await p.locator('.sheet [aria-label="Grundübung"]').count() === 0, `${T}: Cardio ohne Schalter`);
  await p.evaluate(() => document.querySelector('.sheet-close')?.click()); await p.waitForTimeout(150);
  await p.evaluate(async () => { const lib = await import('./js/exercises.js'); const r = lib.addFromPool?.('leg-extension'); window.__poolEx = r?.exercise?.name || null; const v = await import('./js/exercises-view.js'); const ex = lib.listExercises().find((e) => e.source?.ref === 'leg-extension'); if (ex) v.openEditor(ex, () => {}); });
  await p.waitForTimeout(300);
  ok(await p.locator('.sheet .editor').count() === 1 && await p.locator('.sheet [aria-label="Grundübung"]').count() === 0, `${T}: Pool-Übung ohne Schalter`);

  ok(!BAD_TEXT.test(await p.evaluate(() => document.body.innerText)), `${T}: kein null/undefined/NaN im Text`);
  ok(errs.length === 0, `${T}: keine Konsolenfehler ${errs.join(' | ')}`);
  await ctx.close();
}
await b.close(); await srv.close(); done();
