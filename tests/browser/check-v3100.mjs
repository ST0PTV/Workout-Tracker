// v3.10.0: Tap-Ziele (Variante C, Nutzerwahl 2026-10-29). Prüft die *effektive* Trefferfläche jedes Bedienelements:
// Eine 44 × 44 px große Fläche um die Mitte (mindestens die sichtbare Größe) muss an ihren Rändern und in der Mitte per
// elementFromPoint das Element selbst treffen. Damit fallen auch Überlappungen mit Nachbarn und Abschneiden durch
// scrollende Container auf. Im Training (und in Sheets aus dem Training) müssen Knöpfe zusätzlich sichtbar 44 px hoch sein.
// Ausnahmen: iOS-Schalter (51 × 31, Apples eigene Größe); im Training die Satznummer (Breite unsichtbar erweitert, damit
// die Eingabefelder auf 320 px breit genug bleiben) und Eingabefelder (bereits 44 px).
// Aufruf: node tests/browser/check-v3100.mjs [Ordner für Screenshots]
import { launch, startServer, checker, loadPlaywright, startPlan } from './lib.mjs';
import { join } from 'node:path';
const shots = process.argv[2] || null;
const pw = await loadPlaywright();
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();

const audit = (p, training) => p.evaluate(({ training }) => {
  const SEL = 'button, a[href], [role=tab], input:not([type=hidden]):not(.switch), select, textarea';
  const sheets = [...document.querySelectorAll('.sheet')].filter((s) => s.getBoundingClientRect().height > 0);
  const scope = sheets.length ? sheets[sheets.length - 1] : document;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let n = e; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false; if (n.hidden) return false; }
    return true; };
  const label = (e) => `${e.tagName.toLowerCase()}${e.classList.length ? '.' + [...e.classList].join('.') : ''}「${(e.getAttribute('aria-label') || e.innerText || e.value || e.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 28)}」`;
  const W = innerWidth, H = innerHeight;
  // Treffer auf einer festen oder klebenden Leiste (Pausenleiste, Tab-Leiste, „Speichern“ unten), die das Ziel nicht enthält:
  // das Ziel liegt gerade teilweise darunter (Scrolllage), keine Überlappung von Trefferflächen
  const fixedCover = (hit, e) => { for (let n = hit; n && n !== document.body; n = n.parentElement) { const ps = getComputedStyle(n).position; if ((ps === 'fixed' || ps === 'sticky') && !n.contains(e)) return true; } return false; };
  const fails = []; let n = 0, covered = 0;
  for (const e of scope.querySelectorAll(SEL)) {
    if (!vis(e) || e.disabled || e.closest('[aria-hidden=true]') || e.classList.contains('ab-label')) continue; // ab-label: Ausnahme, siehe css/glass.css
    const r = e.getBoundingClientRect();
    if (r.top < 0 || r.bottom > H || r.left < 0 || r.right > W) continue; // nur vollständig sichtbare Ziele
    // Tab-Leiste und erhöhter Knopf: Höhe 58 px, eigene Prüfung in check-tabs
    // von etwas Festem verdeckt (z. B. Pausenleiste beim Scrollen): kein Tap-Ziel in dieser Lage
    const c0 = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!c0 || !(c0 === e || e.contains(c0))) { covered++; continue; }
    n++;
    // Ausnahmen (css/glass.css): Wochentage im Assistenten nur bis zur halben Lücke breiter; Phasen-Beschriftungen nur nach unten
    const day = e.classList.contains('as-day'), lab = false;
    const w = day ? r.width + 4 : lab ? r.width : Math.max(44, r.width), h = Math.max(44, r.height), cx = r.left + r.width / 2, cy = lab ? r.top + h / 2 : r.top + r.height / 2;
    // Mitte und Kantenmitten (Ecken nicht: abgerundete Ecken gehören im Browser nicht zur Trefferfläche)
    const pts = [[cx, cy], [cx - w / 2 + 1.5, cy], [cx + w / 2 - 1.5, cy], [cx, cy - h / 2 + 1.5], [cx, cy + h / 2 - 1.5]];
    let miss = null, coveredPart = false;
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && !(hit === e || e.contains(hit)) && fixedCover(hit, e)) { coveredPart = true; continue; }
      if (!hit || !(hit === e || e.contains(hit))) { miss = { x: Math.round(x), y: Math.round(y), hit: hit ? label(hit) : 'nichts' }; break; }
    }
    if (miss) fails.push(`Fläche ${label(e)} ${Math.round(r.width)}×${Math.round(r.height)}: (${miss.x},${miss.y}) trifft ${miss.hit}`);
    if (training && e.tagName === 'BUTTON' && !e.classList.contains('sn') && r.height < 43.5) fails.push(`sichtbar ${label(e)} ${Math.round(r.width)}×${Math.round(r.height)} im Training unter 44 px hoch`);
  }
  return { n, covered, fails };
}, { training });

for (const devName of ['iPhone SE', 'Pixel 7']) {
  for (const theme of ['dark', 'light']) {
    const { defaultBrowserType, ...opts } = pw.devices[devName];
    const T = `${devName} ${theme}`;
    const ctx = await b.newContext({ ...opts, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.setDefaultTimeout(6000);
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('dialog', (d) => d.accept());
    const shot = (n) => (shots ? p.screenshot({ path: join(shots, `v3100-${devName.replace(/\W+/g, '_')}-${theme}-${n}.png`) }) : null);
    const check = async (name, training = false) => {
      await p.waitForTimeout(350);
      const r = await audit(p, training);
      ok(r.fails.length === 0, `${T} ${name}: ${r.n} Ziele mit 44-px-Fläche${r.covered ? ` (${r.covered} verdeckt übersprungen)` : ''}${r.fails.length ? '\n      ' + r.fails.join('\n      ') : ''}`);
    };
    const go = async (h) => { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(600); };
    const closeSheets = async () => { for (let i = 0; i < 3 && await p.locator('.sheet').count(); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };

    await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(500);
    await p.evaluate(async (light) => {
      const lib = await import('./js/exercises.js'); const P = await import('./js/plans.js'); const H = await import('./js/history.js'); const st = await import('./js/store.js');
      st.set('settings', { ...st.get('settings'), hints: false, onboarded: true, persistAsked: true, appearance: light ? 'light' : 'dark' });
      const ids = (refs) => refs.map((r) => lib.addFromPool(r).exercise.id);
      const today = (new Date().getDay() + 6) % 7;
      const pl = P.newPlan('Push').plan; P.addExercises(pl.id, ids(['bench-press-barbell', 'triceps-pushdown', 'lateral-raise-dumbbell'])); P.setPlanDays(pl.id, [today]);
      const byId = Object.fromEntries(lib.listExercises().map((e) => [e.id, e]));
      for (const w of [2, 1]) { const s = new Date(Date.now() - w * 7 * 864e5); s.setHours(18, 0, 0, 0);
        const r = H.newBackfill({ plan: P.getPlan(pl.id), startISO: s.toISOString(), endISO: new Date(s.getTime() + 3600e3).toISOString() }, byId);
        r.draft.entries.forEach((en) => en.sets.forEach((x) => H.setValues(r.draft, en.id, x.id, { weightKg: 60 + (2 - w) * 5, reps: 8 }))); H.saveNew(r.draft); }
    }, theme === 'light');
    await p.reload(); await p.waitForTimeout(600);
    if (theme === 'light') ok(await p.evaluate(() => document.documentElement.dataset.theme === 'light'), `${T}: helles Design aktiv`);

    // Außerhalb des Trainings: unsichtbare Flächen genügen
    await check('Training-Tab');
    await go('#/plans'); await check('Pläne');
    for (const tab of ['Routinen']) { const t = p.locator('#view [role=tab]', { hasText: tab }); if (await t.count()) { await t.first().click(); await check(`Pläne · ${tab}`); } }
    await go('#/exercises'); await check('Übungen'); await shot('exercises');
    await p.locator('#view .row', { hasText: 'Bankdrücken' }).first().click(); await check('Übung-Info (Sheet)');
    await p.locator('.sheet [role=tab], .sheet .seg button', { hasText: 'Technik' }).first().click(); await p.waitForTimeout(500);
    if (await p.locator('.sheet .ab-play[aria-label="Anhalten"]').count()) { await p.locator('.sheet .ab-play').click(); await p.waitForTimeout(300); } // angehalten: Beschriftungen bewegen sich nicht
    await check('Technik-Animation (Sheet)'); await shot('technik');
    await p.locator('.sheet [role=tab], .sheet .seg button', { hasText: 'Verlauf' }).first().click(); await check('Verlauf (Sheet)'); await closeSheets();
    // Plan-Assistent: Wochentage (7 auf 320 px – siehe Ausnahme in css/glass.css, hier nur auf Überlappung geprüft)
    await go('#/plans'); await p.locator('#view [role=tab]', { hasText: 'Pläne' }).first().click(); await p.waitForTimeout(300);
    if (!(await p.getByRole('button', { name: 'Plan vorschlagen lassen' }).count())) { await p.getByRole('button', { name: 'Plan anlegen' }).click(); await p.waitForTimeout(300); }
    await p.getByRole('button', { name: 'Plan vorschlagen lassen' }).first().click(); await p.waitForTimeout(350);
    await check('Assistent Frage 1 (Sheet)');
    await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(300);
    ok(await p.locator('.as-day').count() === 7, `${T}: Assistent zeigt die Wochentage`);
    await check('Assistent Tage (Sheet)'); await closeSheets();
    await go('#/progress');
    for (const tab of ['Übungen', 'Trainings', 'Muskeln', '4 Wochen']) { await p.locator('#view [role=tab]', { hasText: tab }).first().click(); await check(`Fortschritt · ${tab}`); }
    await shot('progress');
    await go('#/settings'); await check('Einstellungen (oben)');
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await check('Einstellungen (Mitte)');
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await check('Einstellungen (unten)');

    // Training: sichtbar 44 px
    await go('#/'); await startPlan(p, 'Push'); await p.waitForTimeout(600);
    if (await p.locator('.sheet button', { hasText: /normal/i }).count()) { await p.locator('.sheet button', { hasText: /normal/i }).first().click(); await p.waitForTimeout(300); }
    await check('Training Satz', true);
    await p.locator('.setrow').first().locator('.ck').click(); await p.waitForTimeout(500);
    await p.evaluate(() => window.scrollTo(0, 0)); await check('Training nach Haken (oben)', true); await shot('training');
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await check('Training nach Haken (unten)', true);
    await p.locator('.setrow').first().locator('.sn').click(); await check('Satztyp (Sheet)', true); await closeSheets();
    await p.locator('#view .nav2 .btn', { hasText: 'Übersicht' }).click(); await check('Training Übersicht', true);
    await closeSheets(); await p.evaluate(() => window.scrollTo(0, 0));
    if (await p.locator('[aria-label="Nächste Übung"]').count()) { await p.locator('[aria-label="Nächste Übung"]').click(); await p.waitForTimeout(500); if (await p.locator('.sheet').count()) await check('Bewertung (Sheet)', true); await shot('rating'); }
    ok(errs.length === 0, `${T}: keine Konsolenfehler ${errs.join(' | ')}`);
    await ctx.close();
  }
}
await b.close(); await srv.close(); done();
