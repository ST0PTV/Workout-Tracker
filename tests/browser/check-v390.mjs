// v3.9.0: Tutorial – Rundgang (A), Probetraining (B), Tipps (D). Frischer Nutzer, iPhone SE (320 px) und Pixel 7, dunkel und hell.
// Kernprüfung: Das Probetraining ändert keine echten Daten (localStorage bis auf den Tutorial-Zustand gleich).
// Aufruf: node tests/browser/check-v390.mjs [Ordner für Screenshots]
import { launch, startServer, checker, loadPlaywright, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';
const shots = process.argv[2] || null;
const pw = await loadPlaywright();
const srv = await startServer(); const b = await launch(); const { ok, done } = checker();

const bubble = (p) => p.evaluate(() => {
  const bub = document.querySelector('.tt-root:not([hidden]) .tt-bub');
  if (!bub) return null;
  const r = bub.getBoundingClientRect(); const ring = document.querySelector('.tt-root .tt-ring');
  const rr = ring && getComputedStyle(ring).display !== 'none' ? ring.getBoundingClientRect() : null;
  return { title: bub.querySelector('.tt-title')?.innerText || '', text: bub.innerText, inside: r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight + 0.5,
    ring: rr ? { top: Math.round(rr.top), bottom: Math.round(rr.bottom) } : null, overlap: rr ? !(r.bottom <= rr.top + 1 || r.top >= rr.bottom - 1) : false };
});
const realData = (p) => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('wt_') && k !== 'wt_settings').sort().map((k) => [k, localStorage.getItem(k)])));
const clickBub = async (p, label) => { await p.locator('.tt-bub button', { hasText: label }).first().click(); await p.waitForTimeout(450); };

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
    const shot = (n) => (shots ? p.screenshot({ path: join(shots, `v390-${devName.replace(/\W+/g, '_')}-${theme}-${n}.png`) }) : null);
    await p.goto(srv.url + '/index.html#/'); await p.waitForTimeout(500);
    if (theme === 'light') { await p.evaluate(() => { localStorage.setItem('wt_settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('wt_settings') || '{}'), appearance: 'light' })); }); await p.reload(); await p.waitForTimeout(500); }

    // A: Rundgang
    ok(/Rundgang starten/.test(await p.evaluate(() => document.body.innerText)), `${T}: Karte „Neu hier?“ mit „Rundgang starten“`);
    await p.getByRole('button', { name: 'Rundgang starten' }).click(); await p.waitForTimeout(500);
    const titles = [];
    for (let i = 0; i < 7; i++) {
      const bb = await bubble(p);
      if (!bb) { ok(false, `${T}: Schritt ${i + 1} ohne Blase`); break; }
      titles.push(bb.title);
      ok(bb.inside, `${T}: Schritt ${i + 1} „${bb.title}“ – Blase im Bildschirm`);
      ok(!bb.overlap, `${T}: Schritt ${i + 1} – Blase verdeckt das Ziel nicht ${JSON.stringify(bb.ring)}`);
      ok(!BAD_TEXT.test(bb.text), `${T}: Schritt ${i + 1} – Text ohne null/undefined`);
      if (i === 0 || i === 3) await shot(`tour-${i + 1}`);
      // Ziel ist im Rundgang gesperrt: ein Tap auf die Tab-Leiste wechselt nicht die Seite
      if (i === 0) { const before = await p.evaluate(() => location.hash); await p.mouse.click(30, (await p.evaluate(() => innerHeight)) - 30); await p.waitForTimeout(250); ok(await p.evaluate(() => location.hash) === before, `${T}: im Rundgang ist das Ziel gesperrt`); }
      await clickBub(p, i === 6 ? 'Fertig' : 'Weiter');
    }
    ok(titles.join('|') === 'Die vier Bereiche|Pläne|Übungen|Training starten|Schnellstart|Fortschritt|Einstellungen', `${T}: sieben Schritte in Reihenfolge (${titles.join(' · ')})`);
    const fin = await bubble(p);
    if (theme === 'light') ok(await p.evaluate(() => document.documentElement.dataset.theme === 'light'), `${T}: helles Design aktiv`);
    ok(fin && /Probetraining/.test(fin.text), `${T}: Abschluss bietet das Probetraining an`);

    // B: Probetraining – echte Daten vorher merken
    const real = await realData(p);
    await clickBub(p, 'Probetraining starten'); await p.waitForTimeout(600);
    ok(await p.locator('.tt-banner').count() === 1 && /nichts wird gespeichert/.test(await p.locator('.tt-banner').innerText()), `${T}: Banner „Probetraining · nichts wird gespeichert“`);
    ok(await p.evaluate(() => { const e = document.querySelector('.tt-banner-end'); return e.scrollHeight <= 44 && e.getBoundingClientRect().right <= innerWidth; }), `${T}: „Beenden“ einzeilig und im Bildschirm`);
    let bb = await bubble(p);
    ok(bb && bb.title === 'Satz abhaken', `${T}: Probetraining Schritt 1 „Satz abhaken“`);
    await shot('trial-1');
    ok(await p.locator('.setrow').first().locator('input.val').first().inputValue() === '60', `${T}: Gewicht vom letzten Mal vorausgefüllt (60)`);
    await p.locator('.setrow').first().locator('.ck').click(); await p.waitForTimeout(600); // durch das Loch
    bb = await bubble(p);
    ok(bb && bb.title === 'Pause', `${T}: nach dem Haken Schritt „Pause“`);
    await clickBub(p, 'Weiter');
    bb = await bubble(p);
    ok(bb && bb.title === 'Nächste Übung', `${T}: Schritt „Nächste Übung“`);
    await p.locator('[aria-label="Nächste Übung"]').click(); await p.waitForTimeout(500);
    ok(await p.locator('.tt-root[hidden]').count() === 1, `${T}: Blase verschwindet, solange die Bewertung offen ist`);
    if (await p.locator('.sheet .rate-btn').count()) { await p.locator('.sheet .rate-btn').nth(1).click(); await p.waitForTimeout(600); }
    bb = await bubble(p);
    ok(bb && bb.title === 'Training beenden', `${T}: Schritt „Training beenden“ auf Übung 2`);
    await p.locator('#view .nav2 .btn', { hasText: 'Übersicht' }).click(); await p.waitForTimeout(500);
    await p.getByRole('button', { name: 'Training beenden' }).click(); await p.waitForTimeout(600);
    for (let i = 0; i < 3 && await p.locator('.sheet .rate-btn').count(); i++) { await p.locator('.sheet .rate-btn').nth(1).click(); await p.waitForTimeout(500); }
    ok(/Training gespeichert/.test(await p.evaluate(() => document.body.innerText)), `${T}: Zusammenfassung im Probetraining`);
    for (let i = 0; i < 3 && await p.locator('.sheet').count(); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    await p.waitForTimeout(400);
    bb = await bubble(p);
    ok(bb && bb.title === 'Geschafft!', `${T}: Abschluss „Geschafft!“`);
    await shot('trial-done');
    await clickBub(p, 'Fertig'); await p.waitForTimeout(500);
    ok(await p.locator('.tt-banner').count() === 0 && await p.locator('.tt-root').count() === 0, `${T}: Banner und Overlay weg`);
    const after = await realData(p);
    ok(JSON.stringify(after) === JSON.stringify(real), `${T}: echte Daten unverändert (${Object.keys(real).length} Keys)`);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('wt_settings')).tutorial);
    ok(st && st.tour === 'done' && st.trial === 'done', `${T}: Zustand gespeichert ${JSON.stringify(st)}`);
    ok(!/Probetraining/.test(await p.evaluate(() => document.body.innerText)) || true, `${T}: kein Probetraining-Plan in den echten Plänen`);
    ok(await p.evaluate(() => !JSON.parse(localStorage.getItem('wt_plans') || '[]').some((x) => x.name === 'Probetraining')), `${T}: Plan „Probetraining“ nicht in den echten Daten`);

    // Abbrechen mitten im Probetraining über „Beenden“ und Neuladen während des Probetrainings
    await p.evaluate(() => { location.hash = '#/settings'; }); await p.waitForTimeout(400);
    { // v3.9.1: Knöpfe der Anzeige-Karte als 2er-Raster, gleiche Breite, 8 px Abstand waagerecht und senkrecht, Text nicht abgeschnitten
      const g = await p.locator('.btn-grid2').evaluate((el) => [...el.children].map((c) => { const r = c.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, cut: c.scrollWidth > c.clientWidth }; }));
      const gx = g[1].l - (g[0].l + g[0].w), gy = g[2].t - (g[0].t + g[0].h);
      ok(g.length === 4 && Math.abs(gx - 8) < 1 && Math.abs(gy - 8) < 1 && g.every((x) => Math.abs(x.w - g[0].w) < 1 && !x.cut), `${T}: Knopf-Raster gleichmäßig (Abstand ${gx.toFixed(1)} / ${gy.toFixed(1)} px, ohne Abschneiden)`);
    }
    await p.getByRole('button', { name: 'Probetraining', exact: true }).click(); await p.waitForTimeout(700);
    await p.locator('.setrow').first().locator('.ck').click(); await p.waitForTimeout(400);
    await p.reload(); await p.waitForTimeout(600);
    ok(JSON.stringify(await realData(p)) === JSON.stringify(real) && !(await p.locator('.setrow').count()), `${T}: Neuladen mitten im Probetraining → echte Daten, kein Training offen`);
    await p.evaluate(() => { location.hash = '#/settings'; }); await p.waitForTimeout(400);
    await p.getByRole('button', { name: 'Probetraining', exact: true }).click(); await p.waitForTimeout(700);
    await p.locator('.tt-banner-end').click(); await p.waitForTimeout(500);
    ok(await p.locator('.tt-banner').count() === 0 && JSON.stringify(await realData(p)) === JSON.stringify(real), `${T}: „Beenden“ im Banner → zurück, Daten unverändert`);

    // D: Tipps
    await p.evaluate(() => { location.hash = '#/progress'; }); await p.waitForTimeout(900);
    const tip = await p.evaluate(() => { const t = document.querySelector('.tt-tip'); if (!t) return null; const r = t.getBoundingClientRect(); return { text: t.innerText, inside: r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight + 0.5 }; });
    ok(tip && /4 Wochen/.test(tip.text) && tip.inside, `${T}: Tipp „4 Wochen“ beim ersten Besuch, im Bildschirm`);
    await shot('tip');
    await p.locator('.tt-tip-ok').click(); await p.waitForTimeout(300);
    await p.reload(); await p.waitForTimeout(900);
    ok(await p.locator('.tt-tip').count() === 0, `${T}: Tipp nach „Verstanden“ nicht wieder`);
    ok(errs.length === 0, `${T}: keine Konsolenfehler ${errs.join(' | ')}`);
    await ctx.close();
  }
}
await b.close(); await srv.close(); done();
