// Wandelt Bildstreifen (strip-*.svg in WT_OUT bzw. outDir('strips')) in PNG um, damit sie sich ansehen lassen.
// Aufruf: WT_OUT=<ordner> node tests/browser/svg2png.mjs <ref> [ref ...]   (liest <ref>.svg aus <WT_OUT>/strips)
import fs from 'node:fs';
import { join } from 'node:path';
import { launch, outDir } from './lib.mjs';

const refs = process.argv.slice(2);
if (!refs.length) { console.error('Aufruf: node tests/browser/svg2png.mjs <ref> [ref ...]'); process.exit(2); }
const dir = outDir('strips'); const W = 1800;
const b = await launch(); const p = await b.newPage({ viewport: { width: W, height: 300 } });
for (const r of refs) {
  let svg = fs.readFileSync(join(dir, `${r}.svg`), 'utf8');
  const m = svg.match(/width="(\d+)" height="(\d+)"/); const h = Math.round(W * +m[2] / +m[1]);
  svg = svg.replace(m[0], `width="${W}" height="${h}"`);
  await p.setViewportSize({ width: W, height: h });
  await p.setContent('<body style="margin:0;background:#fff">' + svg + '</body>');
  const out = join(dir, `${r}.png`);
  await p.screenshot({ path: out, timeout: 20000 });
  console.log(out);
}
await b.close();
