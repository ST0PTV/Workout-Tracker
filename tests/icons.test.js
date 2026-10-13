// Regression: keine Unicode-Zeichen oder Emoji als Icons in der Oberfläche (iOS zeigt z. B. „ℹ“ als Emoji).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { runner } from './helpers.js';
const { test, done } = runner();
console.log('# icons');

const UI_FILES = readdirSync(new URL('../js/', import.meta.url)).filter((f) => f.endsWith('.js') && !['pool.js', 'muscle-info.js', 'icons.js'].includes(f));
const FORBIDDEN = /[ℹ✎✓☰⌕✕›▾▸]|\p{Extended_Pictographic}/u;

test('keine Zeichen-Icons oder Emoji in UI-Dateien', () => {
  const hits = [];
  for (const f of UI_FILES) {
    readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8').split('\n').forEach((line, i) => {
      if (FORBIDDEN.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(hits, []);
});

done();
