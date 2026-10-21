// Regressionsvergleich der Animationen: speichert alle Posen als Schnappschuss und vergleicht zwei Schnappschüsse.
// Vorher/Nachher bei Änderungen an motion*.js / anim-data.js: bestehende Animationen dürfen sich nicht ändern.
// Aufruf: node tests/browser/snap.mjs save <datei.json>
//         node tests/browser/snap.mjs diff <vorher.json> <nachher.json>
// Option bei save: --without-shape=<id>  entfernt diese Muskelfläche in Seiten- und Frontansicht (nur im Speicher), damit sich prüfen lässt,
//         dass eine neu hinzugefügte Fläche sonst nichts verändert (z. B. --without-shape=hip-flexors).
import fs from 'node:fs';
import * as M from '../../js/motion.js';
import * as MF from '../../js/motion-front.js';
import * as D from '../../js/anim-data.js';

const argv = process.argv.slice(2);
const wo = argv.find((x) => x.startsWith('--without-shape='));
const [mode, a, b] = argv.filter((x) => x !== wo);
if (mode === 'save' && a) {
  if (wo) {
    const id = wo.split('=')[1]; let n = 0;
    // Frontfigur: die weibliche Form entsteht erst beim ersten Zeichnen aus SHAPES_F, daher genügt SHAPES_F
    for (const arr of [M.SHAPES, M.SHAPES_FEMALE, MF.SHAPES_F]) { const i = arr.findIndex((s) => s.id === id); if (i >= 0) { arr.splice(i, 1); n++; } }
    if (!n) { console.error(`Fläche "${id}" nicht gefunden`); process.exit(2); }
  }
  const out = {};
  for (const an of D.ANIMATIONS) {
    const vs = an.variants ? an.variants.map((v) => v.key) : [null];
    for (const v of vs) {
      const fr = M.resolveFrames(D.framesOf(an, v)); const T = M.cycleLength(an.phases);
      for (const sex of ['male', 'female']) for (let i = 0; i < 8; i++) {
        const { pose } = M.poseAt(fr, an.phases, (T * i) / 8);
        out[`${an.ref}/${v}/${sex}/${i}`] = M.layers(pose, () => '', sex).map((l) => l.d).join('|') + JSON.stringify(pose.joints) + JSON.stringify(pose.scene);
      }
    }
  }
  fs.writeFileSync(a, JSON.stringify(out));
  console.log(Object.keys(out).length + ' Posen gespeichert');
} else if (mode === 'diff' && a && b) {
  const x = JSON.parse(fs.readFileSync(a, 'utf8')); const y = JSON.parse(fs.readFileSync(b, 'utf8'));
  const changed = new Set(); const added = new Set();
  for (const k of Object.keys(y)) { const ref = k.split('/')[0]; if (!(k in x)) added.add(ref); else if (x[k] !== y[k]) changed.add(ref); }
  const removed = new Set(Object.keys(x).filter((k) => !(k in y)).map((k) => k.split('/')[0]));
  console.log('geändert:', [...changed].join(', ') || '–');
  console.log('neu:', [...added].join(', ') || '–');
  console.log('entfernt:', [...removed].join(', ') || '–');
  if (changed.size || removed.size) process.exitCode = 1;
} else {
  console.error('Aufruf: snap.mjs save <datei> [--without-shape=<id>] | snap.mjs diff <vorher> <nachher>'); process.exit(2);
}
