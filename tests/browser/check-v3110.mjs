// v3.11.0: Plan-Assistent – Kraft + Cardio am selben Tag (4. Zustand im Tageszyklus, Frage „Wie lange Cardio …“ nur dann),
// Vorschau mit „… + Cardio“, Cardio-Auswahl nach Ziel/Geräten (#311), Übernehmen mit Cardio-Minuten im Plan.
// iPhone SE (320 px) und Pixel 7, dunkel und hell. Aufruf: node tests/browser/check-v3110.mjs [Ordner für Screenshots]
import { launch, startServer, checker, loadPlaywright, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';
const shots = process.argv[2] || null;
const pw = await loadPlaywright();
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();
const states = (p) => p.evaluate(() => [...document.querySelectorAll('.as-day')].map((e) => (e.classList.contains('kc') ? 'K' : e.classList.contains('k') ? 'k' : e.classList.contains('c') ? 'c' : '-')).join(''));
const tap = async (p, d) => { await p.locator('.as-day').nth(d).click(); await p.waitForTimeout(60); };
const setWeek = async (p, want) => { for (let d = 0; d < 7; d++) for (let i = 0; i < 4 && (await states(p))[d] !== want[d]; i++) await tap(p, d); };
const sheetText = (p) => p.evaluate(() => document.querySelector('.sheet')?.innerText || '');
const next = async (p) => { await p.getByRole('button', { name: /^(Weiter|Vorschlag ansehen)$/ }).click(); await p.waitForTimeout(180); };

for (const devName of ['iPhone SE', 'Pixel 7']) for (const theme of ['dark', 'light']) {
  const { defaultBrowserType, ...opts } = pw.devices[devName];
  const T = `${devName} ${theme}`;
  const ctx = await b.newContext({ ...opts, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = (n) => (shots ? p.screenshot({ path: join(shots, `v3110-${devName.replace(/\W+/g, '_')}-${theme}-${n}.png`) }) : null);
  await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(400);
  await p.evaluate(async (light) => { const st = await import('./js/store.js'); st.set('settings', { ...st.get('settings'), onboarded: true, hints: false, appearance: light ? 'light' : 'dark' }); }, theme === 'light');
  await p.reload(); await p.waitForTimeout(400);
  if (theme === 'light') ok(await p.evaluate(() => document.documentElement.dataset.theme === 'light'), `${T}: helles Design aktiv`);
  await p.evaluate(async () => { const v = await import('./js/assistant-view.js'); v.openAssistant(() => {}); }); await p.waitForTimeout(400);
  ok(/Frage 1 von 5/.test(await sheetText(p)), `${T}: ohne Kombi-Tag 5 Fragen`);
  await next(p);
  // Zyklus mit dem vierten Zustand
  await tap(p, 1); await tap(p, 1); await tap(p, 1);
  ok((await states(p))[1] === 'K', `${T}: 3× tippen = Kraft + Cardio (${await states(p)})`);
  ok(await p.locator('.as-day.kc svg').count() === 2, `${T}: Kombi-Taste zeigt Hantel und Cardio`);
  const kcBox = await p.locator('.as-day.kc').boundingBox();
  const iconsInside = await p.evaluate(() => { const b = document.querySelector('.as-day.kc'); const r = b.getBoundingClientRect(); return [...b.querySelectorAll('svg')].every((s) => { const q = s.getBoundingClientRect(); return q.left >= r.left - 0.5 && q.right <= r.right + 0.5 && q.top >= r.top && q.bottom <= r.bottom; }); });
  ok(iconsInside, `${T}: Symbole passen in die Taste (${Math.round(kcBox.width)}×${Math.round(kcBox.height)})`);
  let t = await sheetText(p);
  ok(/Kraft \+ Cardio/.test(t) && /Frage 2 von 6/.test(t), `${T}: Legende „Kraft + Cardio“, jetzt 6 Fragen`);
  ok(/4 × Kraft · davon 1 mit Cardio danach/.test(t), `${T}: Zusammenfassung zählt den Kombi-Tag als Krafttag`);
  ok(/danach: Fahrradergometer/.test(t), `${T}: Cardio danach im Studio bei Muskelaufbau: Fahrradergometer`);
  ok(/Cardio kommt nach dem Kraftteil/.test(t) && /Eddens 2018/.test(t) && /Schumann 2022/.test(t), `${T}: neutraler Hinweis mit Quellen`);
  ok(!BAD_TEXT.test(t) && !t.includes('[object'), `${T}: kein null/undefined/[object]`);
  await shot('days');
  // 6 Tage mit Krafttraining (inkl. Kombi): Cardio springt zurück auf frei statt auf Kraft + Cardio
  await setWeek(p, 'kKkkkk-');
  await tap(p, 6); ok((await states(p))[6] === 'c', `${T}: bei 6 Krafttagen wird der 7. Tag Cardio`);
  await tap(p, 6); ok((await states(p))[6] === '-', `${T}: … und dann frei, nicht Kraft + Cardio (höchstens 6)`);
  // Mo Kraft + Cardio, Mi Kraft, Fr Kraft, So Cardio
  await setWeek(p, 'K-k-k-c');
  await next(p); // Dauer
  await next(p); // Cardio-Dauer
  t = await sheetText(p);
  ok(/Wie lange Cardio nach dem Krafttraining\?/.test(t) && /Frage 4 von 6/.test(t), `${T}: Frage zur Cardio-Dauer erscheint`);
  await p.locator('.sheet .as-opt', { hasText: '30 min' }).click(); await p.waitForTimeout(120);
  await shot('combo-q');
  await next(p); await next(p); await next(p);
  t = await sheetText(p);
  ok(/3 Krafttage · davon 1 mit Cardio · 1 Cardio-Tag/.test(t), `${T}: Kopfzeile (${t.split('\n').find((l) => /Krafttage/.test(l))})`);
  const tabs = await p.locator('.sheet [role=tab]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') + '=' + e.innerText));
  ok(tabs.length === 4 && tabs.some((x) => /^Ganzkörper A \+ Cardio=GK A$/.test(x)) && tabs.some((x) => /^Ausdauer=Cardio$/.test(x)), `${T}: Tabs ${tabs.join(' | ')}`);
  ok(await p.locator('.sheet [role=tab] svg').count() === 1, `${T}: Kombi-Tab mit Cardio-Symbol`);
  ok(await p.evaluate(() => [...document.querySelectorAll('.sheet [role=tab]')].every((b) => b.getClientRects().length && b.scrollHeight <= 46)), `${T}: Tab-Beschriftungen einzeilig`);
  ok(await p.evaluate(() => { const s = document.querySelector('.sheet .as-seg'); return !s || s.scrollWidth <= s.clientWidth + 1; }), `${T}: Tabs passen in die Breite`);
  await p.locator('.sheet [role=tab][aria-label="Ganzkörper A + Cardio"]').click(); await p.waitForTimeout(150);
  t = await sheetText(p);
  ok(/Ganzkörper A \+ Cardio · Mo/.test(t), `${T}: Kombi-Fassung am Montag`);
  const rows = await p.locator('.sheet .as-list .row').allInnerTexts();
  ok(/Fahrradergometer/.test(rows.at(-1)) && /ca\. 30 min/.test(rows.at(-1)), `${T}: letzter Eintrag Cardio 30 min (${rows.at(-1).replace(/\n/g, ' ')})`);
  ok(/Ausdauer pro Woche/.test(t) && /ca\. 75 min/.test(t), `${T}: Ausdauer pro Woche 45 + 30 = 75 min`);
  await shot('preview');
  await p.locator('.sheet [role=tab][aria-label="Ausdauer"]').click(); await p.waitForTimeout(150);
  ok(/Gehen \(zügig, draußen\)/.test(await sheetText(p)), `${T}: reiner Cardio-Tag bei Muskelaufbau ohne Rad: zügiges Gehen`);
  // Übernehmen → Plan „Ganzkörper A + Cardio“ mit „ca. 30 min“ beim Cardio-Eintrag
  await p.getByRole('button', { name: 'Übernehmen' }).click(); await p.waitForTimeout(600);
  await p.evaluate(() => { location.hash = '#/plans'; }); await p.waitForTimeout(500);
  await p.locator('#view .pcard', { hasText: 'Ganzkörper A + Cardio' }).click(); await p.waitForTimeout(500);
  t = await sheetText(p);
  ok(/Fahrradergometer/.test(t) && /ca\. 30 min/.test(t) && !/Fahrradergometer\s*1 Satz/.test(t), `${T}: Plan zeigt beim Cardio „ca. 30 min“ statt Sätze`);
  ok(/4 Übungen · 6 Sätze/.test(t), `${T}: Kopfzeile zählt Cardio nicht als Satz (${(t.match(/\d+ Übungen · \d+ Sätze[^\n]*/) || [''])[0]})`);
  const sum = (t.match(/· (\d+) min/) || [])[1];
  ok(Number(sum) >= 50, `${T}: Dauer im Plan schließt die 30 min Cardio ein (${sum} min)`);
  await p.locator('.sheet button', { hasText: 'Bearbeiten' }).first().click(); await p.waitForTimeout(400);
  const dur = await p.evaluate(() => document.querySelector('.sheet .plan-dur .step-val')?.innerText || 'kein Regler');
  ok(/\d+ min/.test(dur) && parseInt(dur, 10) >= 50, `${T}: Gesamtdauer schließt die 30 min Cardio ein (${dur})`);
  await shot('plan');
  ok(errs.length === 0, `${T}: keine Konsolenfehler ${errs.join(' | ')}`);
  await ctx.close();
}
await b.close(); await srv.close(); done();
