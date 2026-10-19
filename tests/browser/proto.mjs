// Zeichnet frei definierte Pose-Spezifikationen nebeneinander (Prototyp für neue Animationen).
// Aufruf: node tests/browser/proto.mjs <fälle.mjs> [out.svg]
// Die Fälle-Datei exportiert: export const cases = [{ name, sex?, frames: [poseSpec, ...] }, ...]
import fs from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as M from '../../js/motion.js';
import { figureSvg, stripSvg } from './render.mjs';
import { outDir } from './lib.mjs';

const [modPath, outArg] = process.argv.slice(2);
if (!modPath) { console.error('Aufruf: node tests/browser/proto.mjs <fälle.mjs> [out.svg]'); process.exit(2); }
const out = outArg || join(outDir('strips'), 'proto.svg');
const { cases } = await import(pathToFileURL(resolve(modPath)).href + '?' + Date.now());
const cells = []; let i = 0;
for (const c of cases) for (const spec of c.frames) {
  const P = M.solvePose(spec); const L = M.layers(P, () => null, c.sex || 'male');
  let g = figureSvg(L, P.scene);
  for (const [k, p] of Object.entries(P.joints)) if (['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'].includes(k)) g += `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="red"/>`;
  const a = P.angles;
  cells.push(`<g transform="translate(${i * 640 + 330},420) scale(1.5)">${g}</g><text x="${i * 640 + 6}" y="492" font-size="12" font-family="sans-serif">${c.name}: tr ${a.trunk} cu ${a.curl ?? 0} sh ${a.shoulder} hip ${a.hip} kn ${a.knee}</text>`);
  i++;
}
fs.writeFileSync(out, stripSvg(cells, i));
console.log(out);
