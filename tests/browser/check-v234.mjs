// v2.34.0: Browser-Prüfung – „Worauf achten“-Box (Variante B) im Info-Sheet einer Pool-Übung.
// Nur erfundene Testdaten. Aufruf: node tests/browser/check-v234.mjs   (Screenshots in WT_OUT/v234)
import { launch, startServer, checker, outDir, BAD_TEXT } from './lib.mjs';
import { join } from 'node:path';

const srv = await startServer();
const b = await launch();
const { ok, done } = checker();
const out = outDir('v234');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

const open = async (ref) => {
  await p.goto(srv.url + '/index.html#/exercises'); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(async (r) => (await import('./js/exercises-view.js')).openEvidence(r), ref);
  await p.waitForTimeout(500);
};
const info = () => p.evaluate(() => {
  const s = [...document.querySelectorAll('.sheet .info')].pop();
  const box = s.querySelector('.warn-box');
  const kids = [...s.children];
  const h3 = kids.find((k) => k.tagName === 'H3');
  return {
    box: !!box,
    beforeFirstH3: box && h3 ? kids.indexOf(box) < kids.indexOf(h3) : null,
    first: box ? kids.indexOf(box) === 0 : false,
    items: box ? box.querySelectorAll('.warn-list li').length : 0,
    tags: box ? [...box.querySelectorAll('.wtag')].map((t) => t.textContent) : [],
    sups: box ? [...box.querySelectorAll('sup')].map((t) => t.textContent) : [],
    nums: [...s.querySelectorAll('.sources .src-num')].map((n) => n.textContent.trim()),
    text: s.innerText
  };
});

await open('bench-press-barbell');
let i = await info();
ok(i.box && i.items === 3, `B: Bankdrücken – Box mit 3 Hinweisen (${i.items})`);
ok(i.first && i.beforeFirstH3 !== false, 'B: Box steht ganz oben, vor Animation und Muskeln');
ok(i.tags.includes('Review') && i.tags.includes('Fallbericht') && i.tags.includes('Umfrage'), `B: Belegarten sichtbar (${i.tags.join(', ')})`);
const refd = new Set(i.sups.join('').match(/\[\d+\]/g));
ok([...refd].every((n) => i.nums.includes(n)), `B: jede Nummer [n] steht in der Quellenliste (${[...refd].join('')} / ${i.nums.join('')})`);
ok(!BAD_TEXT.test(i.text), 'B: kein null/undefined/NaN');
// ab 2.34.0 (Aufräumen): je Hinweis eine Zeile; ausführlich und Quellen eingeklappt
ok(i.text.includes('Brustmuskelriss') && !i.text.includes('Belegt ist das beschriebene Risiko'), 'B: Box zeigt Kurzzeilen, Ausführliches eingeklappt');
await p.locator('.sheet details.more summary').last().click(); await p.waitForTimeout(200);
const opened = await p.evaluate(() => [...document.querySelectorAll('.sheet .info')].pop().innerText);
ok(opened.includes('Belegt ist das beschriebene Risiko') && opened.includes('nachgebenden Phase'), 'B: Details aufgeklappt zeigen den ausführlichen Text');
await p.screenshot({ path: join(out, '1-bench.png') });
await p.evaluate(() => { const i = [...document.querySelectorAll('.sheet .info')].pop(); i.querySelector('details.more').open = true; i.querySelector('.sources').scrollIntoView(); });
await p.waitForTimeout(200);
await p.screenshot({ path: join(out, '2-bench-sources.png') });

await open('deadlift');
i = await info();
ok(i.box && i.items === 2 && i.tags.includes('Videoanalyse'), `B: Kreuzheben – 2 Hinweise mit Videoanalyse (${i.items})`);
await p.screenshot({ path: join(out, '3-deadlift.png') });

await open('leg-press');
i = await info();
ok(i.box && i.items === 2 && i.text.includes('Blutdruck') && i.text.includes('einrasten'), 'B: Beinpresse – Knie- und Blutdruck-Hinweis');

for (const ref of ['plank', 'lateral-raise-dumbbell', 'barbell-upright-row']) {
  await open(ref);
  i = await info();
  ok(!i.box && i.nums.length === 0, `B: ${ref} – kein Hinweis, keine Nummern`);
}
await p.screenshot({ path: join(out, '4-no-warning.png') });

ok(errs.length === 0, `keine Konsolenfehler ${errs.slice(0, 3).join(' | ')}`);
console.log('Screenshots: ' + out);
await b.close(); await srv.close();
done();
