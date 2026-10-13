// v1.6: anatomische Figur – Pfaddaten (ohne DOM prüfbar).
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const F = await import('../js/figure.js');
const { test, done } = runner();
console.log('# Figur (v1.6)');

const nums = (d) => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);

test('Jeder Muskel der Ansicht hat genau eine Form; keine fremden Muskeln', () => {
  for (const sex of ['male', 'female']) {
    for (const [view, list] of [['front', F.FRONT], ['back', F.BACK]]) {
      const ids = F.figureData(view, sex).muscles.map((m) => m.m);
      assert.deepEqual([...ids].sort(), [...list].sort(), `${view}/${sex}`);
    }
  }
});

test('Pfade sind gültig und liegen in der viewBox (0–200 × 0–440)', () => {
  for (const key of ['front-male', 'front-female', 'back-male', 'back-female']) {
    const [view, sex] = key.split('-');
    const d = F.figureData(view, sex);
    const all = [d.body, ...d.muscles.map((m) => m.d), ...d.detail, ...d.lines];
    for (const p of all) {
      assert.match(p, /^M/);
      assert.ok(!/NaN|undefined/.test(p), key);
      const n = nums(p);
      for (let i = 0; i < n.length; i += 2) {
        assert.ok(n[i] >= 0 && n[i] <= 200, `${key} x ${n[i]}`);
        assert.ok(n[i + 1] >= 0 && n[i + 1] <= 440, `${key} y ${n[i + 1]}`);
      }
    }
  }
});

test('Figur ist spiegelsymmetrisch (Muskel links und rechts)', () => {
  const d = F.figureData('front', 'male');
  const chest = nums(d.muscles.find((m) => m.m === 'chest').d);
  const xs = chest.filter((_, i) => i % 2 === 0);
  assert.ok(Math.abs(Math.min(...xs) + Math.max(...xs) - 200) < 0.5);
});

test('Weibliche Figur: schmalere Schultern, breitere Hüfte; Brustkontur nur vorne weiblich', () => {
  assert.ok(F.femDx(45, 100) > 0, 'Schulter/Arm nach innen');
  assert.ok(F.femDx(62, 260) < 0, 'Hüfte nach außen');
  assert.equal(F.femDx(100, 260), 0, 'Mitte bleibt');
  const m = F.figureData('front', 'male'), f = F.figureData('front', 'female');
  assert.notEqual(m.body, f.body);
  assert.equal(f.lines.length, m.lines.length + 2);
  assert.equal(F.figureData('back', 'female').lines.length, F.figureData('back', 'male').lines.length);
});

test('smoothPath: geschlossen endet mit Z, offen mit zwei Punkten als Linie', () => {
  assert.match(F.smoothPath([[0, 0], [10, 0], [10, 10]]), /Z$/);
  assert.equal(F.smoothPath([[1, 2], [3, 4]], false), 'M1,2 L3,4');
  assert.equal(F.figureData('front', 'male'), F.figureData('front', 'male'), 'zwischengespeichert');
});

done();
