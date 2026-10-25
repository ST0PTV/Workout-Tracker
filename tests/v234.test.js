// v2.34.0: Warnhinweise pro Übung – nur belegte Hauptpunkte, jede Aussage mit Quelle.
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const W = await import('../js/warnings.js');
const { POOL, poolEntry } = await import('../js/pool.js');
const { test, done } = runner();

console.log('# v2.34.0');

test('nur Pool-Übungen, höchstens drei Hinweise, keine Doppelten', () => {
  for (const ref of W.WARNING_REFS) {
    assert.ok(poolEntry(ref), `unbekannte Übung ${ref}`);
    const ws = W.warningsFor(ref);
    assert.ok(ws.length >= 1 && ws.length <= 3, ref);
    assert.equal(new Set(ws.map((w) => w.key)).size, ws.length, ref);
  }
});

test('ohne belegtes Risiko kein Hinweis', () => {
  const without = POOL.filter((p) => !W.WARNING_REFS.includes(p.ref));
  assert.ok(without.length > 100);
  for (const p of without) assert.deepEqual(W.warningsFor(p.ref), [], p.ref);
  assert.deepEqual(W.warningsFor('gibt-es-nicht'), []);
});

test('jeder Hinweis: Text, bekannte Belegart, mindestens eine geprüfte DOI-Quelle', () => {
  for (const [k, h] of Object.entries(W._test.HINT)) {
    assert.ok(h.text.length > 40 && h.text.length < 320, `${k}: Textlänge ${h.text.length}`);
    assert.ok(h.short && h.short.length <= 100, `${k}: Kurzzeile fehlt oder zu lang (${h.short?.length})`);
    assert.ok(h.evidence.length && h.evidence.every((e) => e in W.EVIDENCE), k);
    assert.ok(h.sources.length >= 1, k);
    for (const s of h.sources) {
      assert.match(s.url, /^https:\/\/doi\.org\/10\./, `${k}: ${s.label}`);
      assert.ok(['abstract', 'fulltext'].includes(s.read), `${k}: ${s.label} ohne Prüfvermerk`);
      assert.ok(s.label && s.note, k);
    }
  }
  // jeder definierte Hinweis wird auch benutzt
  const used = new Set(Object.values(W._test.BY_REF).flat());
  for (const k of Object.keys(W._test.HINT)) assert.ok(used.has(k), `${k} unbenutzt`);
});

test('Texte ohne Grenzwerte, Belohnung oder Druck', () => {
  for (const [k, h] of Object.entries(W._test.HINT)) {
    assert.ok(!/\b\d+\s?kg\b|% (des|vom) 1RM|maximal \d/i.test(h.text), `${k}: Grenzwert im Text`);
    assert.ok(!/streak|belohn|trotz schmerz/i.test(h.text), k);
  }
});

test('warningSources: ohne Doppelte, Reihenfolge des Auftretens', () => {
  const s = W.warningSources('bench-press-barbell');
  assert.equal(new Set(s.map((x) => x.url)).size, s.length);
  assert.equal(s[0].url, W.warningsFor('bench-press-barbell')[0].sources[0].url);
  assert.deepEqual(W.warningSources('plank'), []);
});

// ---------- Aufräumen: Texte in drei Ebenen ----------
const I = await import('../js/info.js');
const G = await import('../js/glossary.js');
const PI = (await import('../js/progress-info.js')).PROGRESS_INFO;
const WI = await import('../js/warmup-info.js');
const PRI = (await import('../js/progression.js')).PROGRESSION_INFO;
const MODEL = await import('../js/model.js');
const shorts = {
  progress: (await import('../js/progress-info.js')).PROGRESS_INFO.short,
  sets: (await import('../js/set-info.js')).SET_INFO.short,
  warmup: (await import('../js/warmup-info.js')).WARMUP_INFO.short,
  ...Object.fromEntries(Object.entries((await import('../js/progression.js')).PROGRESSION_INFO.short).map(([k, v]) => [`progression.${k}`, v])),
  ...Object.fromEntries(Object.entries((await import('../js/routine-data.js')).ROUTINE_INFO.short).map(([k, v]) => [`routine.${k}`, v]))
};

test('Kurzfassungen: 1–3 Punkte, je höchstens SHORT_MAX_CHARS Zeichen', () => {
  for (const [k, list] of Object.entries(shorts)) {
    assert.ok(Array.isArray(list) && list.length >= 1 && list.length <= I.SHORT_MAX_ITEMS, `${k}: ${list?.length} Punkte`);
    for (const t of list) assert.ok(t.length <= I.SHORT_MAX_CHARS, `${k}: ${t.length} Zeichen – ${t}`);
  }
});

test('Details bleiben vollständig: Quellen und Langtexte unverändert vorhanden', () => {
  assert.equal(PI.sources.length, 10);
  assert.ok(PI.summary.length >= 8);
  assert.ok(WI.WARMUP_INFO.sources.length >= 6 && WI.WARMUP_INFO.summary.length >= 4);
  assert.ok(PRI.sources.length >= 13 && PRI.rating.length >= 4 && PRI.pause.length >= 4);
});

test('Bildschirmzeilen kurz: Aufwärm-Hinweis eine Zeile', () => {
  assert.ok(WI.WARMUP_HINT.length <= I.LINE_MAX_CHARS, `${WI.WARMUP_HINT.length}`);
});

test('Glossar: Begriffe eindeutig, Erklärungen kurz, einheitliche Begriffe', () => {
  const terms = G.GLOSSARY.map(([t]) => t);
  assert.equal(new Set(terms).size, terms.length);
  for (const [t, d] of G.GLOSSARY) assert.ok(d.length <= 160, `${t}: ${d.length}`);
  assert.ok(terms.includes(G.TERMS.e1rm));
  assert.equal(G.TERMS.workSets, 'Sätze');
});

test('Einstellungen: neue Felder mit Standard (hints an, onboarded aus), kein Schema-Sprung', () => {
  assert.equal(MODEL.DEFAULT_SETTINGS.hints, true);
  assert.equal(MODEL.DEFAULT_SETTINGS.onboarded, false);
});

done();
