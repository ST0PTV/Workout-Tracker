// Service Worker: jedes Modul in js/ muss vorab gecacht werden, sonst fehlt es offline.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runner } from './helpers.js';
const { test, done } = runner();
console.log('# service worker');

test('Alle js/-Module stehen in der Precache-Liste', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const missing = readdirSync(new URL('../js/', import.meta.url)).filter((f) => f.endsWith('.js') && !sw.includes(`'js/${f}'`));
  assert.deepEqual(missing, []);
});

done();
