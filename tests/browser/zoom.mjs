// Große Einzelbilder einzelner Zeitpunkte, nebeneinander (Prüfwerkzeug, nicht Teil der App).
// Aufruf: node tests/browser/zoom.mjs [--scale 1.6] <out.png> <ref:t[:variante]> ...
//   t = Sekunden oder kN (Ende der Phase mit Ziel-Keyframe N). --scale: 1.05 ganze Szene, 1.6 Standard, 2.6 Details.
import * as M from '../../js/motion.js';
import * as MF from '../../js/motion-front.js';
import * as D from '../../js/anim-data.js';
import { figureSvg } from './render.mjs';
import { launch } from './lib.mjs';

const args = process.argv.slice(2);
let scale = 1.6;
const si = args.indexOf('--scale');
if (si >= 0) { scale = +args[si + 1]; args.splice(si, 2); }
const [out, ...items] = args;
if (!out || !items.length || !(scale > 0)) { console.error('Aufruf: node tests/browser/zoom.mjs [--scale 1.6] <out.png> <ref:t[:variante]> ...'); process.exit(2); }

const cells = [];
for (const it of items) {
  const [ref, ts, v] = it.split(':'); const a = D.animationFor(ref);
  const fr = M.resolveFrames(D.framesOf(a, v || undefined));
  let t = +ts;
  if (ts.startsWith('k')) {
    const k = +ts.slice(1); let acc = 0; t = null;
    for (const p of a.phases) { if (p.b === k) { t = acc + p.dur - 1e-4; break; } acc += p.dur; }
    if (t === null) { console.error(`${ref}: keine Phase mit Ziel ${k}`); process.exit(2); }
  }
  const { pose } = M.poseAt(fr, a.phases, t, 'male');
  const L = a.view === 'front' ? MF.layersFront(pose, () => null, 'male') : M.layers(pose, () => null, 'male');
  cells.push(`${figureSvg(L, pose.scene)}<text x="-200" y="30" font-size="14">${ref} ${ts}</text>`);
}
const n = cells.length, base = scale > 2 ? 690 : scale < 1.2 ? 660 : 640;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n * 520}" height="720" viewBox="0 0 ${n * 520} 720"><rect width="100%" height="100%" fill="#fff"/>` + cells.map((c, i) => `<g transform="translate(${260 + i * 520},${base}) scale(${scale})">${c}</g>`).join('') + '</svg>';
const b = await launch(); const p = await b.newPage({ viewport: { width: n * 520, height: 720 } });
await p.setContent('<body style="margin:0">' + svg + '</body>'); await p.screenshot({ path: out }); await b.close();
console.log(out);
