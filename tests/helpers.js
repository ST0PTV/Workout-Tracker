// Gemeinsame Test-Helfer (ohne Abhängigkeiten).
export class MemoryStorage {
  constructor() { this.map = new Map(); this.failOnKey = null; }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) {
    if (this.failOnKey && k === this.failOnKey) throw new Error('QuotaExceededError');
    this.map.set(k, String(v));
  }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

export function runner() {
  let passed = 0;
  const test = (name, fn) => {
    try { fn(); passed++; console.log(`ok   ${name}`); }
    catch (e) { console.error(`FAIL ${name}\n     ${e.message}`); process.exitCode = 1; }
  };
  const done = () => console.log(`\n${passed} Tests bestanden.\n`);
  return { test, done };
}
