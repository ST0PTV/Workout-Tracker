// v2.34.0 (Aufräumen): Startseite A, ⋯-Menü, Hinweis-Schalter, Einführung, Glossar, Info-Sheets „Kurz + Details“.
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v234b.mjs   (Screenshots in WT_OUT/v234b)
import { launch, startServer, checker, outDir, BAD_TEXT, startPlan, moreAction } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('v234b');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const shot = (name) => p.screenshot({ path: join(out, `${name}.png`) });
const text = () => p.evaluate(() => document.body.innerText);
const words = () => p.evaluate(() => document.querySelector('section').innerText.split(/\s+/).filter(Boolean).length);
const go = async (hash) => { await p.goto(srv.url + '/index.html' + hash); await p.reload(); await p.waitForTimeout(500); };

// ---------- Neu: Willkommenskarte und Einführung ----------
await go('#/');
ok((await text()).includes('Neu hier?'), 'E: neue Nutzer sehen „Neu hier?“');
await shot('1-welcome');
await p.locator('.welcome button', { hasText: 'Einführung' }).click(); await p.waitForTimeout(400);
for (const title of ['Plan anlegen', 'Sätze eintragen', 'Fortschritt sehen']) {
  ok((await p.locator('.sheet').last().innerText()).includes(title), `E: Schritt „${title}“`);
  await p.locator('.sheet .onboarding button.primary').click(); await p.waitForTimeout(300);
}
ok(await p.locator('.sheet').count() === 0, 'E: nach drei Schritten geschlossen');
ok(!(await text()).includes('Neu hier?'), 'E: Karte danach weg');
ok(await p.evaluate(async () => (await import('./js/store.js')).get('settings').onboarded) === true, 'E: als gesehen gespeichert');

// ---------- Testdaten ----------
await p.evaluate(async () => {
  const lib = await import('./js/exercises.js'); const P = await import('./js/plans.js'); const H = await import('./js/history.js');
  const ids = (refs) => refs.map((r) => lib.addFromPool(r).exercise.id);
  const today = (new Date().getDay() + 6) % 7;
  const mk = (name, refs, days) => { const pl = P.newPlan(name).plan; P.addExercises(pl.id, ids(refs)); P.setPlanDays(pl.id, days); return pl; };
  const push = mk('Push', ['bench-press-barbell', 'triceps-pushdown'], [today]);
  mk('Beine', ['back-squat', 'leg-press'], [(today + 3) % 7]);
  const byId = Object.fromEntries(lib.listExercises().map((e) => [e.id, e]));
  for (const w of [2, 1]) {
    const s = new Date(Date.now() - w * 7 * 864e5); s.setHours(18, 0, 0, 0);
    const r = H.newBackfill({ plan: P.getPlan(push.id), startISO: s.toISOString(), endISO: new Date(s.getTime() + 3600e3).toISOString() }, byId);
    r.draft.entries.forEach((en) => en.sets.forEach((x) => H.setValues(r.draft, en.id, x.id, { weightKg: 60 + (2 - w) * 5, reps: 8 })));
    H.saveNew(r.draft);
  }
});

// ---------- Startseite A ----------
await go('#/');
ok(await p.locator('.start-card.today').count() === 1 && (await p.locator('.start-card.today').innerText()).includes('Push'), 'S: Plan von heute als große Karte');
ok(await p.locator('.start-row').count() === 1 && await p.locator('.start-row button.play').count() === 1, 'S: übriger Plan kompakt mit Start-Taste');
let t = await text();
ok(!t.includes('Plan wählen und loslegen') && !t.includes('Training nachtragen') && !t.includes('leicht trainieren'), 'S: kein Untertitel, Nebenaktionen nicht auf der Seite');
ok(t.includes('Freies Training starten') && /\d+ Sätze/.test(t) && !t.includes('Arbeitssätze'), 'S: freies Training sichtbar, „Sätze“ statt „Arbeitssätze“');
ok(await words() < 60, `S: wenig Text (${await words()} Wörter)`);
await shot('2-start');
await p.locator('button.dots').click(); await p.waitForTimeout(300);
t = await p.locator('.sheet').last().innerText();
ok(t.includes('Training nachtragen') && t.includes('Diese Woche leicht trainieren'), 'S: ⋯-Menü mit Nachtragen und leichter Woche');
await shot('3-menu');
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await startPlan(p, 'Beine'); await p.waitForTimeout(500);
if (await p.locator('.sheet button', { hasText: /normal/i }).count()) { await p.locator('.sheet button', { hasText: /normal/i }).first().click(); await p.waitForTimeout(300); }
ok(!!(await p.evaluate(async () => (await import('./js/session.js')).activeSession())), 'S: Start-Taste der kompakten Zeile startet');
await p.evaluate(async () => (await import('./js/session.js')).discard());

// ---------- Training: Aufwärmzeile, Datum statt Werteliste, Scheiben erst beim Antippen ----------
await go('#/');
await startPlan(p, 'Push'); await p.waitForTimeout(500);
t = await text();
ok(t.includes('1–2 leichte Aufwärmsätze') && t.includes('Werte vom') && !/Zuletzt \d/.test(t), 'T: Aufwärmzeile kurz, „Werte vom …“ statt Werteliste');
ok(await p.locator('.plates:not([hidden])').count() === 0, 'T: Scheiben-Zeile anfangs verborgen');
const w = p.locator('.setrow').first().locator('input.val').first();
await w.focus(); await p.waitForTimeout(150);
ok(await p.locator('.plates:not([hidden])').count() === 1, 'T: Scheiben-Zeile nach Antippen des Gewichts');
await shot('4-training');
await p.evaluate(async () => (await import('./js/session.js')).discard());

// ---------- Fortschritt: Pfeile ----------
await go('#/progress');
const arrows = await p.locator('.trend.arrow').allInnerTexts();
ok(arrows.length >= 1 && arrows.every((a) => ['↑', '↓', '→'].includes(a.trim())), `F: nur Pfeile in der Liste (${arrows.join(' ')})`);
ok(!(await text()).match(/[+−-]\d+[,.]?\d* %/), 'F: keine Prozentzahlen in der Liste');
await shot('5-progress');

// ---------- Info-Sheets: Kurz + eingeklappte Details ----------
const sheets = [
  ['Fortschritt', "(await import('./js/progress-view.js')).openProgressInfo()"],
  ['Sätze', "(await import('./js/set-view.js')).openSetInfo()"],
  ['Bewertung', "(await import('./js/progression-view.js')).openProgressionInfo()"],
  ['Leichte Woche', "(await import('./js/progression-view.js')).openProgressionInfo('light')"],
  ['Aufwärmen', "(await import('./js/routine-view.js')).openRoutineInfo('warmup')"],
  ['Cool-down', "(await import('./js/routine-view.js')).openRoutineInfo('cooldown')"],
  ['Übung', "(await import('./js/exercises-view.js')).openEvidence('lat-pulldown')"]
];
for (const [name, js] of sheets) {
  await go('#/exercises');
  await p.evaluate(`(async () => { ${js}; })()`); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const s = [...document.querySelectorAll('.sheet')].pop();
    const d = s.querySelector('details.more');
    return { kurz: s.querySelectorAll('.kurz > li').length, details: !!d, open: d ? d.open : null, srcInside: d ? d.querySelectorAll('.sources li').length : 0, srcOutside: [...s.querySelectorAll('.sources li')].filter((li) => !li.closest('details')).length, text: s.innerText };
  });
  const kurzOk = name === 'Übung' ? true : r.kurz >= 1 && r.kurz <= 3;
  ok(kurzOk && r.details && r.open === false && r.srcOutside === 0 && r.srcInside >= 1 && !BAD_TEXT.test(r.text), `I: ${name} – ${r.kurz} Kurz-Punkte, Details zu, ${r.srcInside} Quellen eingeklappt`);
}
await go('#/exercises');
await p.evaluate(async () => (await import('./js/progress-view.js')).openProgressInfo()); await p.waitForTimeout(400);
await shot('6-info-short');
await p.locator('.sheet details.more summary').click(); await p.waitForTimeout(200);
ok((await p.locator('.sheet').last().innerText()).includes('Reynolds'), 'I: aufgeklappt sind die Quellen sichtbar');
await p.locator('.sheet .glossary-link').click(); await p.waitForTimeout(400);
t = await p.locator('.sheet').last().innerText();
ok(t.includes('Max-Kraft (Schätzung)') && t.includes('Supersatz') && t.includes('Tagesform'), 'G: Glossar öffnet sich aus dem Info-Sheet');
await shot('7-glossary');

// ---------- Einstellungen: kurz, Hinweise abschaltbar ----------
await go('#/settings');
t = await text();
ok(!t.includes('Deine Daten liegen nur lokal') && !t.includes('Gilt für alle Übungen ohne eigene Pausenzeit'), 'E: Kartentexte nicht mehr auf der Seite');
ok(t.includes('Hinweise anzeigen') && t.includes('Einführung') && t.includes('Begriffe'), 'E: Karte „Anzeige“ mit Schalter, Einführung, Begriffe');
ok(await words() < 100, `E: wenig Text (${await words()} Wörter)`);
await shot('8-settings');
await p.locator('.card', { hasText: 'Backup' }).first().locator('.info-btn').click(); await p.waitForTimeout(300);
ok((await p.locator('.sheet').last().innerText()).includes('nur auf diesem Gerät'), 'E: Backup-Info über (i)');
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.locator('.set-line', { hasText: 'Hinweise anzeigen' }).locator('button', { hasText: 'Aus' }).click(); await p.waitForTimeout(300);
await go('#/progress');
ok(await p.locator('.hint-line').count() === 0, 'E: Hinweise aus → keine Hinweiszeilen');
await go('#/');
await startPlan(p, 'Push'); await p.waitForTimeout(500);
ok(!(await text()).includes('1–2 leichte Aufwärmsätze'), 'E: Hinweise aus → keine Aufwärmzeile im Training');
await p.evaluate(async () => (await import('./js/session.js')).discard());
await go('#/exercises');
await p.evaluate(async () => (await import('./js/exercises-view.js')).openEvidence('bench-press-barbell')); await p.waitForTimeout(400);
ok(await p.locator('.sheet .warn-box').count() === 1, 'E: Warnhinweise bleiben trotz „Hinweise aus“');

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log('Screenshots: ' + out);
await b.close(); await srv.close();
done();
