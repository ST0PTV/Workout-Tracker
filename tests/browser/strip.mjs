// Zeichnet einen Bildstreifen (SVG) mit N Zeitpunkten einer Animation, zum Ansehen der Bewegung.
// Aufruf: node tests/browser/strip.mjs <ref> [out.svg] [n=8] [variante] [male|female]
import fs from 'node:fs';
import { join } from 'node:path';
import * as M from '../../js/motion.js';
import * as MF from '../../js/motion-front.js';
import { animationFor, framesOf } from '../../js/anim-data.js';
import { figureSvg, stripSvg } from './render.mjs';
import { outDir } from './lib.mjs';

const [ref, outArg, n = '8', variant, sex = 'male'] = process.argv.slice(2);
if (!ref) { console.error('Aufruf: node tests/browser/strip.mjs <ref> [out.svg] [n] [variante] [male|female]'); process.exit(2); }
const out = outArg || join(outDir('strips'), `${ref}.svg`);
const anim = animationFor(ref);
const frames = M.resolveFrames(framesOf(anim, variant || undefined));
const T = M.cycleLength(anim.phases); const N = +n;
const cells = [];
for (let i = 0; i < N; i++) {
  const t = (T * i) / N; const { pose } = M.poseAt(frames, anim.phases, t, sex);
  const ph = M.phaseAt(anim.phases, t);
  const L = anim.view === 'front' ? MF.layersFront(pose, () => null, sex) : M.layers(pose, () => null, sex);
  cells.push(`<g transform="translate(${i * 640 + 330},400) scale(1.4)">${figureSvg(L, pose.scene, { floor: !anim.noFloor })}</g><text x="${i * 640 + 10}" y="490" font-size="16" font-family="sans-serif">${t.toFixed(2)}s ${(ph && ph.label) || ''}</text>`);
}
fs.writeFileSync(out, stripSvg(cells, N));
console.log(out);
