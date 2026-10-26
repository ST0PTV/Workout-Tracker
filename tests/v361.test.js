// v3.6.1: Schärfe des 3D-Körpers – Texturgröße, Überabtastung, verfeinertes Tiefenfeld.
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const B = await import('../js/body3d.js');
const { test, done } = runner();

console.log('# v3.6.1');

test('texParams: Textur folgt der Abtastdichte (2–4 Pixel je Einheit), Linien höchstens 0,9', () => {
  // Plankarte 58 px bei 3×: 174 Gerätepixel, doppelt abgetastet 348
  assert.deepEqual(B.texParams(348, 174), { scale: 2, lineWidth: 0.9 });
  // große Ansicht 170 px bei 3×: 510 Gerätepixel, doppelt abgetastet 1020
  const big = B.texParams(1020, 510);
  assert.equal(big.scale, 4);
  assert.ok(big.lineWidth >= 0.55 && big.lineWidth < 0.9);
  assert.equal(B.texParams(100, 50).scale, 2);
});

test('superSample: 2 bei kleinen Ansichten, darüber begrenzt, nie unter 1', () => {
  assert.equal(B.superSample(174, 383), 2);
  const s = B.superSample(510, 1122); // große Ansicht 170 px bei 3×
  assert.ok(s > 1.5 && s < 2, `große Ansicht ${s}`);
  assert.ok(510 * 1122 * s * s <= B.SS_MAX_PX + 1);
  assert.equal(B.superSample(1200, 2640), 1);
});

test('refineField: doppelte Größe, Vorzeichen innen/außen bleibt, Werte im alten Bereich', () => {
  const W = B.FIG_W; const H = B.FIG_H;
  const mask = new Uint8Array(W * H);
  const rect = (x0, x1, y0, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * W + x] = 1; };
  rect(84, 116, 8, 56); rect(92, 108, 50, 62); rect(62, 138, 62, 140); rect(70, 130, 140, 258);
  rect(40, 58, 90, 280); rect(142, 160, 90, 280); rect(72, 98, 258, 430); rect(102, 128, 258, 430);
  const D = B.depthField(mask);
  const R = B.refineField(D);
  const k = B.DEPTH_K;
  assert.equal(R.length, W * H * k * k);
  const at = (x, y) => R[(y * k + 1) * W * k + (x * k + 1)];
  assert.ok(at(100, 200) > 15, 'Rumpfmitte bleibt dick');
  assert.ok(at(20, 200) < 0, 'außen bleibt negativ');
  assert.ok(Math.abs(at(100, 200) - D[200 * W + 100]) < 1, 'Rumpfmitte fast unverändert');
  for (const v of R) assert.ok(v <= B.D_MAX && v >= -B.D_NEG);
  const G = B.gradientField(R, W * k, H * k, k);
  assert.ok(G.every((g) => Math.abs(g) <= B.GRAD_MAX));
});

done();
