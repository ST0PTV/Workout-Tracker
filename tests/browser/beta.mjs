// Beta-Durchlauf wie ein neuer Tester: frisches Gerät, alle Hauptwege, dazu allgemeine Prüfungen an jeder Station
// (Konsolenfehler, nichts ragt seitlich heraus, Tap-Ziele, Textkontrast, kein „null/undefined/NaN“). Dunkel und hell.
// Zusätzlich: Offline-Start über den Service Worker und Update von einer älteren Version mit vorhandenen Daten.
// Nur erfundene Testdaten.
//
// Aufruf: node tests/browser/beta.mjs [--engine chromium|webkit] [--devices "Pixel 7,Galaxy A55"] [--old <commit>] [--shots <ordner>]
//   Standard: Chromium mit den Android-Profilen Pixel 7, Galaxy A55, Galaxy S24 (360 px).
//   WebKit (Safari-Engine) läuft in GitHub Actions (.github/workflows/browser-tests.yml) mit iPhone SE und iPhone 15.
//   --old <commit>: Update-Test von diesem Stand (braucht die Git-Historie; ohne Angabe wird er übersprungen).
import { loadPlaywright, launch, ROOT, appVersion } from './lib.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('--engine', 'chromium');
const DEVICES = arg('--devices', ENGINE === 'webkit' ? 'iPhone SE,iPhone 15' : 'Pixel 7,Galaxy A55,Galaxy S24').split(',').map((s) => s.trim());
const OLD = arg('--old');
const SHOTS = arg('--shots');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const pw = await loadPlaywright();
// Chromium wie in den anderen Prüfungen (lib.mjs sucht die vorinstallierte Headless-Shell); WebKit aus Playwright.
const browser = ENGINE === 'chromium' ? await launch() : await pw[ENGINE].launch();

// ---------- Ergebnis ----------
let fails = 0; const warns = [];
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; return c; };
const warn = (m) => { warns.push(m); console.log('WARN ' + m); };

// ---------- Server mit umschaltbarem Wurzelordner (für den Update-Test: gleiche Origin) ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
let root = ROOT;
const srv = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = normalize(join(root, p));
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(f));
});
const sockets = new Set();
srv.on('connection', (c) => { sockets.add(c); c.on('close', () => sockets.delete(c)); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const PORT = srv.address().port;
const URL0 = `http://127.0.0.1:${PORT}`;
// Echtes „offline“ für alle Engines: Server anhalten (Playwrights setOffline lieferte in WebKit auch über den Service Worker nichts – ob Werkzeug oder App, soll dieser Weg klären).
const serverOff = () => new Promise((r) => { srv.close(() => r()); for (const c of sockets) c.destroy(); });
const serverOn = () => new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

// ---------- Allgemeine Prüfungen im Browser ----------
function pageAudit() {
  const W = window.innerWidth;
  const desc = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}「${(e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 28)}」`;
  const visible = (e) => {
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let a = e; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false; }
    return !e.closest('[hidden],[aria-hidden="true"]');
  };
  const inScrollX = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (/(auto|scroll)/.test(cs.overflowX) || (cs.overflowX === 'hidden' && a.scrollWidth > a.clientWidth + 1)) return true; } return false; };
  // Fokus auf den obersten Layer: offenes Sheet, sonst die Seite
  const sheets = [...document.querySelectorAll('.sheet')].filter(visible);
  const scope = sheets.length ? sheets[sheets.length - 1] : document.body;
  const all = [...scope.querySelectorAll('*')].filter(visible);
  const overflow = [];
  for (const e of all) { const r = e.getBoundingClientRect(); if ((r.right > W + 1 || r.left < -1) && !inScrollX(e)) overflow.push(desc(e) + ` ${Math.round(r.left)}..${Math.round(r.right)}`); }
  const docWide = document.documentElement.scrollWidth > W + 1 || document.body.scrollWidth > W + 1;
  // Tap-Ziele (Buttons, Links, Eingaben)
  const small = []; const tiny = [];
  for (const e of scope.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab]')) {
    if (!visible(e) || e.disabled) continue;
    const r = e.getBoundingClientRect();
    // v3.10.0: unsichtbare Trefferfläche (::after, absolut) zählt mit; Überlappung prüft check-v3100
    const pa = getComputedStyle(e, '::after');
    const ext = pa.content !== 'none' && pa.position === 'absolute' && getComputedStyle(e).position !== 'static'
      ? ['top', 'right', 'bottom', 'left'].map((k) => Math.max(0, -parseFloat(pa[k]) || 0)) : [0, 0, 0, 0];
    const m = Math.min(r.width + ext[1] + ext[3], r.height + ext[0] + ext[2]);
    if (Math.min(r.width, r.height) < 24 && m < 44) tiny.push(desc(e) + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
    else if (m < 43.5) small.push(desc(e) + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  // Kontrast: Elemente mit eigenem Text gegen den ersten deckenden Hintergrund dahinter
  const rgba = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const mix = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const bgOf = (e) => {
    const stack = [];
    for (let a = e; a; a = a.parentElement) { const c = rgba(getComputedStyle(a).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 0.99) break; } }
    let base = rgba(getComputedStyle(document.body).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
    if (base.a < 1) base = { ...base, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) base = mix(stack[i], base);
    return base;
  };
  const low = []; const lowLarge = [];
  for (const e of all) {
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own || e.closest('button:disabled, [aria-disabled="true"], .chip:disabled')) continue;
    const cs = getComputedStyle(e);
    let fg = rgba(cs.color); if (!fg) continue;
    const opacity = (() => { let o = 1; for (let a = e; a; a = a.parentElement) o *= Number(getComputedStyle(a).opacity); return o; })();
    fg = { ...fg, a: fg.a * opacity };
    const bg = bgOf(e);
    const f = mix(fg, bg);
    const L1 = lum(f); const L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize); const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const item = `${desc(e)} ${ratio.toFixed(2)}:1`;
    if (ratio < 3) low.push(item); else if (!large && ratio < 4.5) lowLarge.push(item);
  }
  const text = scope.innerText;
  return { overflow: overflow.slice(0, 8), overflowN: overflow.length, docWide, small, tiny, low: low.slice(0, 8), lowN: low.length, mid: lowLarge.slice(0, 6), midN: lowLarge.length, bad: /\bnull\b|undefined|NaN|\[object /.test(text) };
}

const seenWarn = new Set();
async function audit(p, tag, errs) {
  await p.waitForTimeout(150);
  const a = await p.evaluate(pageAudit);
  ok(!a.docWide && a.overflowN === 0, `${tag}: nichts ragt seitlich heraus${a.overflowN ? ' – ' + a.overflow.join(' | ') : ''}${a.docWide ? ' (Seite breiter als der Bildschirm)' : ''}`);
  ok(!a.bad, `${tag}: kein null/undefined/NaN/[object] im Text`);
  ok(a.tiny.length === 0, `${tag}: keine Tap-Ziele unter 24 px${a.tiny.length ? ' – ' + a.tiny.slice(0, 6).join(' | ') : ''}`);
  ok(a.lowN === 0, `${tag}: Textkontrast ≥ 3:1${a.lowN ? ' – ' + a.low.join(' | ') : ''}`);
  for (const s of a.small) { const k = s.replace(/ \d+×\d+$/, ''); if (!seenWarn.has('t' + k)) { seenWarn.add('t' + k); warn(`${tag}: Tap-Ziel unter 44 px: ${s}`); } }
  for (const s of a.mid) { const k = s.replace(/ [\d.]+:1$/, ''); if (!seenWarn.has('c' + k)) { seenWarn.add('c' + k); warn(`${tag}: Kontrast unter 4,5:1 (normaler Text): ${s}`); } }
  ok(errs.length === 0, `${tag}: keine Konsolenfehler${errs.length ? ' – ' + errs.join(' | ') : ''}`);
  errs.length = 0;
}

const sheetText = (p) => p.evaluate(() => ([...document.querySelectorAll('.sheet')].pop() || document.body).innerText);
const go = async (p, hash) => { await p.evaluate((h) => { location.hash = h; }, hash); await p.waitForTimeout(350); };
const closeSheets = async (p) => { for (let i = 0; i < 4 && await p.locator('.sheet').count(); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
let curPage = null;
const step = async (name, fn) => {
  try { await fn(); } catch (e) {
    ok(false, `${name}: ${String(e.message || e).split('\n')[0]}`);
    const m = String(e.message || e).match(/waiting for (.+)/); if (m) console.log('     bei: ' + m[1].slice(0, 160));
    if (curPage) {
      const t = await curPage.evaluate(() => ([...document.querySelectorAll('.sheet')].pop() || document.body).innerText.replace(/\s+/g, ' ').slice(0, 300)).catch(() => '');
      console.log('     sichtbar: ' + t);
      if (SHOTS) await curPage.screenshot({ path: join(SHOTS, `FAIL-${name.replace(/\W+/g, '_')}.png`) }).catch(() => {});
    }
  }
};

// ---------- Durchlauf je Gerät ----------
for (const devName of DEVICES) {
  const dev = pw.devices[devName];
  if (!dev) { ok(false, `Geräteprofil „${devName}“ fehlt`); continue; }
  const { defaultBrowserType, ...opts } = dev;
  if (ENGINE === 'webkit' && process.platform === 'linux') delete opts.isMobile; // isMobile wird von WebKit unter Linux nicht unterstützt
  const tagD = `${ENGINE}/${devName}`;
  console.log(`\n### ${tagD} (${opts.viewport.width}×${opts.viewport.height} @${opts.deviceScaleFactor})`);
  const ctx = await browser.newContext({ ...opts, serviceWorkers: 'block', acceptDownloads: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  const p = await ctx.newPage(); curPage = p; p.setDefaultTimeout(6000);
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('dialog', (d) => d.accept());
  const shot = (n) => (SHOTS ? p.screenshot({ path: join(SHOTS, `${ENGINE}-${devName.replace(/\W+/g, '_')}-${n}.png`) }) : null);

  await p.goto(URL0 + '/index.html#/'); await p.waitForTimeout(600);

  for (const theme of ['dark', 'light']) {
    const T = `${tagD} ${theme}`;
    if (theme === 'light') {
      await step(`${T} Hell einschalten`, async () => {
        await closeSheets(p); await go(p, '#/settings');
        await p.getByRole('radio', { name: 'Hell', exact: true }).click(); await p.waitForTimeout(300);
        ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'light', `${T}: Hell über die Einstellungen`);
      });
    }

    // 1) Erster Start
    if (theme === 'dark') {
      await step(`${T} Einführung`, async () => {
        await go(p, '#/');
        ok(/Neu hier\?/.test(await p.evaluate(() => document.body.innerText)), `${T}: Karte „Neu hier?“ beim ersten Start`);
        await audit(p, `${T} Start (neu)`, errs); await shot('01-start');
        // v3.9.0: Rundgang (7 Schritte mit Spotlight), am Ende „Später“ statt Probetraining
        await p.getByRole('button', { name: 'Rundgang starten' }).click(); await p.waitForTimeout(500);
        for (let i = 0; i < 7; i++) {
          if (i === 3) await audit(p, `${T} Rundgang`, errs);
          await p.locator('.tt-bub button', { hasText: i === 6 ? 'Fertig' : 'Weiter' }).click(); await p.waitForTimeout(350);
        }
        await p.locator('.tt-bub button', { hasText: 'Später' }).click(); await p.waitForTimeout(400);
        await go(p, '#/');
        ok(!/Neu hier\?/.test(await p.evaluate(() => document.body.innerText)), `${T}: nach der Einführung keine Karte mehr`);
      });
    }

    // 2) Plan-Assistent (erstellt im dunklen Durchlauf die Pläne; im hellen nur ansehen)
    await step(`${T} Assistent`, async () => {
      await go(p, '#/plans');
      const cta = p.getByRole('button', { name: 'Plan vorschlagen lassen' });
      if (!(await cta.count())) { await p.getByRole('button', { name: 'Plan anlegen' }).click(); await p.waitForTimeout(300); }
      await p.getByRole('button', { name: 'Plan vorschlagen lassen' }).first().click(); await p.waitForTimeout(350);
      await audit(p, `${T} Assistent Frage 1`, errs);
      await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(200);
      // Di Cardio dazu (frei → Kraft → Cardio)
      await p.locator('.as-day').nth(1).click(); await p.locator('.as-day').nth(1).click(); await p.waitForTimeout(150);
      await audit(p, `${T} Assistent Tage`, errs); await shot(`02-days-${theme}`);
      for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: 'Weiter' }).click(); await p.waitForTimeout(150); }
      await p.getByRole('button', { name: 'Vorschlag ansehen' }).click(); await p.waitForTimeout(350);
      await audit(p, `${T} Assistent Vorschau`, errs); await shot(`03-preview-${theme}`);
      if (theme === 'dark') {
        await p.getByRole('button', { name: 'Übernehmen' }).click(); await p.waitForTimeout(600);
        const t = await p.evaluate(() => document.body.innerText);
        ok(/Ganzkörper A/.test(t) && /Ganzkörper B/.test(t) && /Ausdauer/.test(t), `${T}: drei Pläne angelegt (GK A, GK B, Ausdauer)`);
      } else await closeSheets(p);
      await audit(p, `${T} Pläne`, errs);
    });

    // 3) Plan-Editor öffnen
    await step(`${T} Plan-Editor`, async () => {
      await go(p, '#/plans');
      await p.locator('button', { hasText: 'Ganzkörper A' }).first().click(); await p.waitForTimeout(400);
      await audit(p, `${T} Plan Ganzkörper A`, errs);
      await closeSheets(p);
    });

    // 4) Training: Sätze eintragen, Pause, nächste Übung, beenden (nur im dunklen Durchlauf beenden)
    await step(`${T} Training`, async () => {
      await go(p, '#/');
      if (!(await p.locator('.setrow').count())) {
        await p.getByRole('button', { name: 'Ganzkörper A starten' }).click(); await p.waitForTimeout(600);
      }
      ok(await p.locator('.setrow').count() >= 1, `${T}: Training läuft mit Satzzeilen`);
      const row = p.locator('.setrow').first();
      await row.locator('input.val').first().fill('40'); await row.locator('input.val').first().dispatchEvent('change');
      await row.locator('input.val').nth(1).fill('10'); await row.locator('input.val').nth(1).dispatchEvent('change');
      await row.locator('.ck').click(); await p.waitForTimeout(400);
      ok(await p.locator('.restbar:not([hidden])').count() === 1, `${T}: Pause läuft nach dem Haken`);
      // v3.8.1: Layout bei schmalen Bildschirmen – Zeit einzeilig, Knopfzeilen im Inhaltsbereich, Schnellknöpfe einzeilig
      const lay = await p.evaluate(() => {
        const one = (e) => { // nur Textknoten zählen (Icons liegen höher/tiefer als der Text)
          if (!e) return true; const tops = new Set(); const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
          for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); for (const x of r.getClientRects()) if (x.width > 1) tops.add(Math.round(x.top / 6)); }
          return tops.size <= 1; };
        const inside = (sel) => [...document.querySelectorAll(sel)].every((row) => { const pr = row.getBoundingClientRect(); return [...row.children].every((c) => { const r = c.getBoundingClientRect(); return r.right <= pr.right + 1 && r.left >= pr.left - 1; }); });
        const view = document.querySelector('#view'); const vr = view.getBoundingClientRect(); const pad = parseFloat(getComputedStyle(view).paddingRight) || 0;
        const gutter = [...document.querySelectorAll('#view .nav2 .btn')].every((b) => b.getBoundingClientRect().right <= vr.right - pad + 1);
        const quickIn = [...document.querySelectorAll('.quick')].every((q) => { const card = q.closest('.card') || q.parentElement; const cr = card.getBoundingClientRect(); return [...q.children].every((c) => c.getBoundingClientRect().right <= cr.right + 1); });
        const plus = [...document.querySelectorAll('#view .nav2 .btn')].filter((b) => /Aufwärmsatz|^\s*Satz/.test(b.innerText)).every((b) => { const i = b.querySelector('.icon'); return i && getComputedStyle(i).display !== 'none'; });
        return { time: one(document.querySelector('.rt-time')), nav: inside('.nav2'), gutter, quick: [...document.querySelectorAll('.qbtn')].every(one), quickIn, plus };
      });
      ok(lay.time && lay.nav && lay.gutter && lay.quick && lay.quickIn && lay.plus, `${T}: Layout schmal – Pausenzeit einzeilig, Knopfzeilen im Rand, Schnellknöpfe einzeilig und in der Karte, Plus bei Aufwärmsatz/Satz (${JSON.stringify(lay)})`);
      await audit(p, `${T} Training Satz`, errs); await shot(`04-session-${theme}`);
      // Technik-Animation öffnen
      if (await p.getByRole('button', { name: 'Technik' }).count()) {
        await p.getByRole('button', { name: 'Technik' }).first().click(); await p.waitForTimeout(500);
        await audit(p, `${T} Technik-Animation`, errs); await closeSheets(p);
      }
      // Übersicht
      await p.getByRole('button', { name: 'Übersicht' }).click(); await p.waitForTimeout(400);
      await audit(p, `${T} Training Übersicht`, errs);
      if (theme === 'dark') {
        await p.getByRole('button', { name: 'Training beenden' }).click(); await p.waitForTimeout(500);
        // Bewertung(en) beantworten, dann Zusammenfassung „Training gespeichert“
        for (let i = 0; i < 4 && await p.locator('.sheet .rate-btn').count(); i++) {
          await audit(p, `${T} Bewertung`, errs);
          await p.locator('.sheet .rate-btn').nth(1).click(); await p.waitForTimeout(400);
        }
        ok(/Training gespeichert/.test(await sheetText(p)) || /Training gespeichert/.test(await p.evaluate(() => document.body.innerText)), `${T}: Zusammenfassung „Training gespeichert“`);
        await audit(p, `${T} Zusammenfassung`, errs); await shot('04b-summary');
        await closeSheets(p);
        ok(!(await p.locator('.setrow').count()), `${T}: Training beendet`);
      } else {
        await p.getByRole('button', { name: 'Training verwerfen' }).click(); await p.waitForTimeout(500);
        await closeSheets(p);
        ok(!(await p.locator('.setrow').count()), `${T}: Training verworfen`);
      }
    });

    // 5) Fortschritt (alle vier Reiter)
    await step(`${T} Fortschritt`, async () => {
      await go(p, '#/progress');
      for (const tab of ['Übungen', 'Trainings', 'Muskeln', '4 Wochen']) {
        await p.getByRole('tab', { name: tab, exact: true }).first().click(); await p.waitForTimeout(350);
        await audit(p, `${T} Fortschritt ${tab}`, errs);
      }
      ok(!/Noch kein Verlauf/.test(await p.evaluate(() => document.body.innerText)), `${T}: Verlauf nach dem Training vorhanden`);
      await shot(`05-progress-${theme}`);
    });

    // 6) Training nachtragen (nur dunkel speichern)
    await step(`${T} Nachtragen`, async () => {
      await go(p, '#/');
      await p.locator('button.dots').click(); await p.waitForTimeout(300);
      await p.locator('.sheet :is(button.row, .row > button.t)', { hasText: 'Training nachtragen' }).first().click(); await p.waitForTimeout(400);
      await audit(p, `${T} Nachtragen`, errs);
      await closeSheets(p);
    });

    // 7) Routinen und Mobility
    await step(`${T} Routinen`, async () => {
      await go(p, '#/plans');
      await p.getByRole('tab', { name: 'Routinen', exact: true }).first().click(); await p.waitForTimeout(400);
      await audit(p, `${T} Routinen`, errs);
      const mob = p.getByRole('tab', { name: 'Mobility', exact: true });
      if (await mob.count()) { await mob.first().click(); await p.waitForTimeout(300); await audit(p, `${T} Mobility`, errs); }
      await p.getByRole('tab', { name: 'Pläne', exact: true }).first().click(); await p.waitForTimeout(300);
    });

    // 8) Übungen: Startpool und Info-Blatt
    await step(`${T} Übungen`, async () => {
      await go(p, '#/exercises');
      await audit(p, `${T} Übungen`, errs);
      const pool = p.getByRole('button', { name: /Startpool/ }).first();
      if (await pool.count()) {
        await pool.click(); await p.waitForTimeout(500);
        await audit(p, `${T} Startpool`, errs);
        await closeSheets(p);
      }
      await p.evaluate(async () => { const v = await import('./js/exercises-view.js'); v.openEvidence('back-squat'); }); await p.waitForTimeout(500);
      await audit(p, `${T} Info Kniebeuge`, errs); await closeSheets(p);
    });

    // 9) Einstellungen
    await step(`${T} Einstellungen`, async () => {
      await go(p, '#/settings');
      await audit(p, `${T} Einstellungen`, errs); await shot(`06-settings-${theme}`);
    });
  }

  // 10) Backup exportieren und wieder importieren
  await step(`${tagD} Backup`, async () => {
    await go(p, '#/settings');
    const before = await p.evaluate(() => JSON.parse(localStorage.getItem('wt_plans') || '[]').length);
    const dl = p.waitForEvent('download', { timeout: 6000 }).catch(() => null);
    await p.getByRole('button', { name: 'Exportieren' }).click();
    const d = await dl;
    if (!d) { warn(`${tagD}: Export ohne Download (Teilen-Menü?) – Import nicht geprüft`); return; }
    const file = join(mkdtempSync(join(tmpdir(), 'wt-beta-')), d.suggestedFilename());
    await d.saveAs(file);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    ok(json && typeof json === 'object', `${tagD}: Backup ist gültiges JSON (${d.suggestedFilename()})`);
    const fc = p.waitForEvent('filechooser', { timeout: 6000 });
    await p.getByRole('button', { name: 'Importieren' }).click();
    await (await fc).setFiles(file); await p.waitForTimeout(800);
    for (let i = 0; i < 3 && await p.locator('.sheet').count(); i++) {
      const b = p.locator('.sheet').last().locator('button.btn.primary').first();
      if (!(await b.count())) break; await b.click(); await p.waitForTimeout(500);
    }
    const after = await p.evaluate(() => JSON.parse(localStorage.getItem('wt_plans') || '[]').length);
    ok(after === before && after >= 3, `${tagD}: Import stellt die Pläne wieder her (${before} → ${after})`);
    ok(errs.length === 0, `${tagD}: Backup ohne Konsolenfehler ${errs.join(' | ')}`); errs.length = 0;
  });
  await ctx.close();
}

// ---------- Offline-Start über den Service Worker ----------
{
  const dev = pw.devices[DEVICES[0]]; const { defaultBrowserType, ...opts } = dev || {};
  if (ENGINE === 'webkit' && process.platform === 'linux') delete opts.isMobile;
  const ctx = await browser.newContext({ ...opts, serviceWorkers: 'allow' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await step('Offline', async () => {
    await p.goto(URL0 + '/index.html#/'); await p.waitForTimeout(500);
    await p.evaluate(async () => { await navigator.serviceWorker.ready; });
    await p.reload(); await p.waitForTimeout(800);
    ok(await p.evaluate(() => !!navigator.serviceWorker.controller), `${ENGINE}: Service Worker steuert die Seite`);
    await serverOff();
    // Nachweis 1: ohne Netz kommen App-Dateien aus dem Service-Worker-Cache (funktioniert in allen Engines).
    const fetched = await p.evaluate(async () => {
      const out = {};
      for (const u of ['index.html', 'js/app.js', 'css/glass.css', 'js/version.js']) { try { const r = await fetch(u, { cache: 'no-store' }); out[u] = r.ok; } catch { out[u] = false; } }
      return out;
    });
    ok(Object.values(fetched).every(Boolean), `${ENGINE}: ohne Netz liefert der Service Worker die App-Dateien (${JSON.stringify(fetched)})`);
    // Nachweis 2: Neuladen ohne Netz. Playwright-WebKit kann das unter Linux nicht (interner Fehler im Werkzeug, nicht in der App).
    try { await p.reload(); } catch (e) {
      await serverOn(); throw e;
    }
    await p.waitForTimeout(800);
    const t = await p.evaluate(() => document.body.innerText);
    ok(/Training/.test(t) && /Pläne/.test(t), `${ENGINE}: App startet offline`);
    await p.evaluate(() => { location.hash = '#/settings'; }); await p.waitForTimeout(400);
    ok((await p.evaluate(() => document.body.innerText)).includes(appVersion()), `${ENGINE}: offline auch die Einstellungen (Version sichtbar)`);
    ok(errs.length === 0, `${ENGINE}: offline ohne Seitenfehler ${errs.join(' | ')}`);
    await serverOn();
  });
  if (!srv.listening) await serverOn();
  await ctx.close();
}

// ---------- Update von einer älteren Version mit Daten ----------
if (OLD) {
  const dev = pw.devices[DEVICES[0]]; const { defaultBrowserType, ...opts } = dev || {};
  if (ENGINE === 'webkit' && process.platform === 'linux') delete opts.isMobile;
  await step('Update', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wt-old-'));
    execSync(`git -C "${ROOT}" archive ${OLD} | tar -x -C "${dir}"`);
    const oldV = readFileSync(join(dir, 'js/version.js'), 'utf8').match(/APP_VERSION\s*=\s*'([^']+)'/)[1];
    root = dir.endsWith('/') ? dir : dir + '/';
    const ctx = await browser.newContext({ ...opts, serviceWorkers: 'allow' });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(URL0 + '/index.html#/'); await p.waitForTimeout(600);
    await p.evaluate(async () => { await navigator.serviceWorker.ready; });
    // Daten in der alten Version anlegen: Übungen, ein Plan, ein abgeschlossenes Training, Hell
    await p.evaluate(async () => {
      const lib = await import('./js/exercises.js'); const P = await import('./js/plans.js'); const S = await import('./js/session.js');
      const a = lib.addFromPool('bench-press-barbell').exercise; const b = lib.addFromPool('lat-pulldown').exercise;
      const pl = P.newPlan('Alt-Plan').plan; P.addExercises(pl.id, [a.id, b.id]);
      if (S.startFromPlan) S.startFromPlan(pl.id);
    });
    await p.reload(); await p.waitForTimeout(600);
    const has = async () => p.evaluate(() => JSON.parse(localStorage.getItem('wt_plans') || '[]').some((x) => x.name === 'Alt-Plan'));
    ok(await has(), `Update: Daten in ${oldV} angelegt`);
    root = ROOT;
    let v = ''; let n = 0;
    for (n = 1; n <= 4; n++) {
      await p.reload(); await p.waitForTimeout(900);
      v = await p.evaluate(async () => (await import('./js/version.js?x=' + Date.now())).APP_VERSION).catch(() => '');
      const shown = await p.evaluate(() => { location.hash = '#/settings'; return new Promise((r) => setTimeout(() => r(document.body.innerText), 400)); });
      if (shown.includes(appVersion())) break;
    }
    ok(n <= 3, `Update: ${oldV} → ${appVersion()} nach ${n} Neuladen sichtbar (Modul: ${v})`);
    ok(await has(), 'Update: Plan aus der alten Version ist noch da');
    ok(errs.length === 0, `Update: keine Seitenfehler ${errs.join(' | ')}`);
    await ctx.close();
  });
}

await browser.close(); srv.close();
console.log(`\n${fails ? fails + ' Fehler' : 'alle Prüfungen bestanden'} · ${warns.length} Hinweise`);
if (process.env.WT_REPORT) writeFileSync(process.env.WT_REPORT, JSON.stringify({ engine: ENGINE, devices: DEVICES, fails, warns }, null, 2));
if (fails) process.exitCode = 1;
