// Zeichnet frei definierte Posen (ohne Animationsdaten) als PNG, z. B. zum Ausprobieren von Geometrie.
// Aufruf: node tests/browser/pose.mjs <out.png> <specs.mjs>
//   specs.mjs exportiert  poses = [{ spec, label?, sex? }]  (spec.view === 'front' für die Vorderansicht)
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as M from '../../js/motion.js';
import * as MF from '../../js/motion-front.js';
import { figureSvg } from './render.mjs';
import { launch } from './lib.mjs';

const [out, file] = process.argv.slice(2);
if (!out || !file) { console.error('Aufruf: node tests/browser/pose.mjs <out.png> <specs.mjs>'); process.exit(2); }
const { poses } = await import(pathToFileURL(resolve(file)).href + '?' + Date.now());
const cells = poses.map(({ spec, label, sex = 'male' }) => {
  const front = spec.view === 'front';
  const P = front ? MF.solveFront(spec) : M.solvePose(spec);
  const L = front ? MF.layersFront(P, () => null, sex) : M.layers(P, () => null, sex);
  return `${figureSvg(L, P.scene)}<text x="-200" y="40" font-size="14">${label || ''}</text>`;
});
const n = cells.length, W = 560;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n * W}" height="560" viewBox="0 0 ${n * W} 560"><rect width="100%" height="100%" fill="#fff"/>` + cells.map((c, i) => `<g transform="translate(${W / 2 + i * W},460) scale(1.25)">${c}</g>`).join('') + '</svg>';
const b = await launch(); const p = await b.newPage({ viewport: { width: n * W, height: 560 } });
await p.setContent('<body style="margin:0">' + svg + '</body>'); await p.screenshot({ path: out }); await b.close();
console.log(out);
