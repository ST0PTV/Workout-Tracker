// v3.0.3: App-Hülle (v3.0.4: klassische Leiste am Rand). Tab-Leiste auf allen Tabs gleich hoch, Dokument scrollt nicht, nur #view; Datumsfelder im Nachtragen-Sheet bleiben im Sheet.
// Aufruf: node tests/browser/check-v303.mjs
import { launch, startServer, checker } from './lib.mjs';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const TABS = ['#/', '#/plans', '#/exercises', '#/progress', '#/settings'];

for (const vp of [{ width: 390, height: 844 }, { width: 390, height: 664 }]) {
  for (const theme of ['dark', 'light']) {
    const p = await (await b.newContext({ viewport: vp, serviceWorkers: 'block' })).newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(srv.url + '/index.html#/exercises'); await p.waitForTimeout(500);
    await p.getByRole('button', { name: /Startpool-Übungen übernehmen/ }).click(); await p.waitForTimeout(400); await p.getByRole('button', { name: /^125 übernehmen/ }).click(); await p.waitForTimeout(400); // lange Seite für den Scrolltest
    await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(300);
    const tag = `${vp.height} ${theme}`;
    const bottoms = [];
    for (const r of TABS) {
      await p.evaluate((h) => { location.hash = h; }, r); await p.waitForTimeout(350);
      if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      const m = await p.evaluate(() => {
        const v = document.getElementById('view'), t = document.getElementById('tabbar').getBoundingClientRect();
        return { bottom: Math.round(t.bottom), docH: document.documentElement.scrollHeight, winH: innerHeight, winY: scrollY, viewTop: v.scrollTop, canScroll: v.scrollHeight > v.clientHeight };
      });
      bottoms.push(m.bottom);
      ok(m.docH <= m.winH && m.winY === 0, `${tag} ${r}: Dokument scrollt nicht (${m.docH}/${m.winH})`);
      ok(m.viewTop === 0, `${tag} ${r}: neue Seite beginnt oben`);
      if (r === '#/exercises') {
        ok(m.canScroll, `${tag} Übungen: #view ist scrollbar`);
        await p.mouse.move(195, 400); await p.mouse.wheel(0, 600); await p.waitForTimeout(250);
        const after = await p.evaluate(() => ({ v: document.getElementById('view').scrollTop, w: scrollY, b: Math.round(document.getElementById('tabbar').getBoundingClientRect().bottom) }));
        ok(after.v > 0 && after.w === 0, `${tag} Übungen: Wischen scrollt #view (${after.v}), nicht das Fenster`);
        ok(after.b === m.bottom, `${tag} Übungen: Tab-Leiste bleibt beim Scrollen stehen`);
      }
    }
    ok(new Set(bottoms).size === 1, `${tag}: Tab-Leiste überall gleich hoch (${bottoms.join(', ')})`);
    // v3.0.4: klassische Leiste – liegt am unteren Rand und reicht über die ganze Breite
    const bar = await p.evaluate(() => { const r = document.getElementById('tabbar').getBoundingClientRect(); return { b: Math.round(r.bottom), l: Math.round(r.left), w: Math.round(r.width) }; });
    ok(bar.b === vp.height && bar.l === 0 && bar.w === vp.width, `${tag}: Tab-Leiste am Rand, volle Breite (${JSON.stringify(bar)})`);
    // Nachtragen-Sheet
    await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(350);
    await p.getByRole('button', { name: /Mehr: Training nachtragen/ }).click();
    await p.getByText('Training nachtragen', { exact: true }).last().click(); await p.waitForTimeout(500);
    const fit = await p.evaluate(() => { const s = document.querySelector('.sheet').getBoundingClientRect(); return [...document.querySelectorAll('.sheet input[type="datetime-local"]')].every((i) => { const r = i.getBoundingClientRect(); return r.left >= s.left && r.right <= s.right; }); });
    ok(fit, `${tag}: Datumsfelder im Sheet`);
    ok(errs.length === 0, `${tag}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
    await p.context().close();
  }
}
// v3.0.6: simulierter iOS-Home-Bildschirm mit zu kurzem Fenster (789 statt 844): alles bleibt im Fenster,
// Klasse .wt-gap, Leiste ohne Home-Balken-Abstand, Seitenhintergrund in Leistenfarbe. Browser-Modus unverändert.
for (const standalone of [true, false]) {
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 789 }, serviceWorkers: 'block' });
    await ctx.addInitScript((sa) => {
      Object.defineProperty(screen, 'height', { get: () => 844 });
      Object.defineProperty(screen, 'width', { get: () => 390 });
      const orig = window.matchMedia.bind(window);
      window.matchMedia = (q) => (q.includes('display-mode: standalone') ? { matches: sa, media: q, addEventListener() {}, removeEventListener() {} } : orig(q));
    }, standalone);
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(srv.url + '/index.html#/settings'); await p.waitForTimeout(500);
    if (theme === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    const m = await p.evaluate(() => {
      const t = document.getElementById('tabbar').getBoundingClientRect();
      return { bar: Math.round(t.bottom), h: Math.round(t.height), body: Math.round(document.body.getBoundingClientRect().bottom),
        gap: document.documentElement.classList.contains('wt-gap'), htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        bodyBg: getComputedStyle(document.body).backgroundColor, info: document.body.innerText.match(/Bildschirm \d+.*/)?.[0] || '' };
    });
    const tag = `${standalone ? 'App' : 'Browser'} ${theme}`;
    ok(m.bar === 789 && m.body === 789, `${tag}: Leiste/Hülle im Fenster (${m.bar}/${m.body})`);
    ok(m.gap === standalone, `${tag}: Klasse wt-gap ${standalone ? 'gesetzt' : 'nicht gesetzt'}`);
    if (standalone) ok(m.h === 58 && m.htmlBg !== m.bodyBg && m.htmlBg !== 'rgba(0, 0, 0, 0)', `${tag}: Leiste 58 hoch, Seitenhintergrund in Leistenfarbe (${m.htmlBg} vs ${m.bodyBg})`);
    ok(m.info.includes(`Lücke ${standalone ? 55 : 0}`), `${tag}: Messzeile (${m.info})`);
    ok(errs.length === 0, `${tag}: keine Fehler ${errs.join(' | ')}`);
    await ctx.close();
  }
}
await b.close(); await srv.close();
done();
