// Öffnet Technik-Animationen (männliche und weibliche Figur) und das Datenblatt, prüft Karte, Text und Konsole.
// Aufruf: node tests/browser/check-anim.mjs <ref1,ref2,...>      (Ausgabe: Screenshots in WT_OUT/shots)
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';

const refs = (process.argv[2] || '').split(',').filter(Boolean);
if (!refs.length) { console.error('Aufruf: node tests/browser/check-anim.mjs <ref1,ref2,...>'); process.exit(2); }
const shots = outDir('shots');
const srv = await startServer();
const b = await launch();
const { ok, done } = checker();

for (const sex of ['male', 'female']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript((s) => { localStorage.setItem('wt_settings', JSON.stringify({ focus: ['strength'], weightUnit: 'kg', restSeconds: 120, figure: s })); }, sex);
  const p = await ctx.newPage(); const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(srv.url + '/index.html'); await p.waitForTimeout(800);
  for (const ref of refs) {
    await p.goto(srv.url + '/index.html#/'); await p.reload(); await p.waitForTimeout(500);
    const r = await p.evaluate(async ([ref, badSrc]) => {
      const m = await import('./js/anim-view.js'); m.openAnimation(ref);
      await new Promise((res) => setTimeout(res, 1200));
      const svg = document.querySelector('.anim-svg');
      return { svg: !!svg, paths: svg ? svg.querySelectorAll('path').length : 0, bad: new RegExp(badSrc).test(document.body.innerText), badge: document.querySelector('.anim-badge')?.textContent || '' };
    }, [ref, BAD_TEXT.source]);
    ok(r.svg && r.paths > 10 && !r.bad, `${sex} ${ref}: Karte (${r.paths} Pfade, Badge „${r.badge.trim()}“)`);
    await p.screenshot({ path: `${shots}/${sex}-${ref}.png` });
    const ds = await p.evaluate(async (badSrc) => {
      document.querySelector('.anim-badge')?.click();
      await new Promise((res) => setTimeout(res, 500));
      return { bad: new RegExp(badSrc).test(document.body.innerText) };
    }, BAD_TEXT.source);
    ok(!ds.bad, `${sex} ${ref}: Datenblatt ohne null/NaN`);
    if (sex === 'male') await p.screenshot({ path: `${shots}/${sex}-${ref}-data.png`, fullPage: true });
  }
  ok(errs.length === 0, `${sex}: keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await b.close(); await srv.close();
console.log('Screenshots: ' + shots);
done();
