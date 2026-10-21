// v2.24.0: Zyklus (optional) – Normalisierung, Schätzfenster, Verhütung, Hinweise, Einträge.
import assert from 'node:assert/strict';
import { runner } from './helpers.js';

const C = await import('../js/cycle.js');
const { test, done } = runner();

console.log('# v2.24.0 Zyklus');
const on = (extra = {}) => ({ ...C.DEFAULT_CYCLE, enabled: true, ...extra });

test('aus: kein Status, keine Hinweise; Standard ist aus', () => {
  assert.equal(C.DEFAULT_CYCLE.enabled, false);
  assert.equal(C.cycleStatus(C.DEFAULT_CYCLE).mode, 'off');
  assert.deepEqual(C.redFlags({ ...C.DEFAULT_CYCLE, symptoms: [{ date: '2026-10-20', tags: ['heavy'] }] }, '2026-10-21'), []);
});

test('Normalisierung: ungültige Werte fallen weg, Grenzen, Sortierung, Doppelte', () => {
  const n = C.normalizeCycle({ enabled: true, avgLength: 99, bleedDays: 0, contraception: 'x', periods: [{ start: '2026-10-01' }, { start: 'bad' }, { start: '2026-09-01', end: '2026-08-01' }, { start: '2026-08-03', end: '2026-08-07' }, { start: '2026-10-01' }], symptoms: [{ date: '2026-10-02', tags: ['cramps', 'nope'] }, { date: '2026-10-03', tags: [] }] });
  assert.equal(n.avgLength, 28); assert.equal(n.bleedDays, 5); assert.equal(n.contraception, 'none');
  assert.deepEqual(n.periods.map((p) => p.start), ['2026-08-03', '2026-10-01']);
  assert.deepEqual(n.symptoms, [{ date: '2026-10-02', tags: ['cramps'] }]);
  assert.deepEqual(C.normalizeCycle(null).periods, []);
});

test('Status: Periode bis Blutungsdauer oder Ende, Tag im Zyklus', () => {
  const c = on({ periods: [{ start: '2026-10-19', end: null }] });
  assert.deepEqual([C.cycleStatus(c, '2026-10-21').day, C.cycleStatus(c, '2026-10-21').inPeriod], [3, true]);
  assert.equal(C.cycleStatus(c, '2026-10-24').inPeriod, false, 'nach 5 Tagen');
  const e = C.endPeriod(c, '2026-10-20');
  assert.equal(C.cycleStatus(e, '2026-10-21').inPeriod, false, 'früher beendet');
  assert.equal(C.cycleStatus(on(), '2026-10-21').mode, 'nodata');
});

test('Schätzfenster: aus der Angabe ±3 Tage, aus eingetragenen Zyklen ± halbe Spannweite', () => {
  const a = C.cycleStatus(on({ avgLength: 30, periods: [{ start: '2026-10-01', end: null }] }), '2026-10-10');
  assert.deepEqual([a.next.from, a.next.to, a.basedOn], ['2026-10-28', '2026-11-03', 0]);
  const b = C.cycleStatus(on({ periods: [{ start: '2026-07-01' }, { start: '2026-07-27' }, { start: '2026-08-30' }, { start: '2026-09-27' }] }), '2026-10-01');
  // Längen 26, 34, 28 → Mittel 29, Spannweite 8 → ± 4
  assert.deepEqual([b.avgLength, b.spread, b.next.from, b.next.to, b.basedOn], [29, 4, '2026-10-22', '2026-10-30', 3]);
});

test('Verhütung: kombiniert ohne Phasen und ohne Schätzung, andere Methoden ohne Vorhersage', () => {
  const p = [{ start: '2026-10-01', end: null }];
  const k = C.cycleStatus(on({ contraception: 'combined', periods: p }), '2026-10-10');
  assert.equal(k.mode, 'combined'); assert.equal(k.next, null);
  const o = C.cycleStatus(on({ contraception: 'other', periods: p }), '2026-10-10');
  assert.equal(o.mode, 'other'); assert.equal(o.next, null);
});

test('Hinweise: über 90 Tage keine Periode, mehrfach > 35 bzw. < 21 Tage, Symptome; nicht bei Verhütung', () => {
  assert.deepEqual(C.redFlags(on({ periods: [{ start: '2026-07-01' }] }), '2026-10-01'), ['absent']);
  assert.deepEqual(C.redFlags(on({ periods: [{ start: '2026-07-01' }] }), '2026-09-28'), []);
  const long = on({ periods: [{ start: '2026-04-01' }, { start: '2026-05-15' }, { start: '2026-06-28' }] });
  assert.deepEqual(C.redFlags(long, '2026-07-01'), ['long']);
  const short = on({ periods: [{ start: '2026-08-01' }, { start: '2026-08-19' }, { start: '2026-09-06' }] });
  assert.deepEqual(C.redFlags(short, '2026-09-08'), ['short']);
  assert.deepEqual(C.redFlags({ ...long, contraception: 'other' }, '2026-07-01'), []);
  const sym = on({ contraception: 'combined', symptoms: [{ date: '2026-10-18', tags: ['heavy', 'pain'] }] });
  assert.deepEqual(C.redFlags(sym, '2026-10-21'), ['heavy', 'pain']);
  assert.deepEqual(C.redFlags(sym, '2026-10-26'), [], 'nur letzte 7 Tage');
  for (const f of ['heavy', 'pain', 'absent', 'long', 'short']) assert.ok(C.RED_FLAG_TEXT[f].length > 40 && !/diagnos/i.test(C.RED_FLAG_TEXT[f]));
});

test('Einträge: neue Periode schließt die offene, Löschen, Symptome umschalten; Eingabe bleibt unverändert', () => {
  const c0 = on({ periods: [{ start: '2026-09-20', end: null }] });
  const c1 = C.startPeriod(c0, '2026-10-19');
  assert.deepEqual(c1.periods, [{ start: '2026-09-20', end: '2026-09-24' }, { start: '2026-10-19', end: null }]);
  assert.equal(c0.periods[0].end, null, 'Original unverändert');
  assert.deepEqual(C.removePeriod(c1, '2026-10-19').periods.length, 1);
  const s1 = C.toggleSymptom(c1, 'cramps', '2026-10-20');
  assert.deepEqual(C.symptomsOn(s1, '2026-10-20'), ['cramps']);
  assert.deepEqual(C.symptomsOn(C.toggleSymptom(s1, 'cramps', '2026-10-20'), '2026-10-20'), []);
  assert.deepEqual(C.toggleSymptom(c1, 'unknown', '2026-10-20').symptoms, []);
});

test('Datumshilfen', () => {
  assert.equal(C.daysBetween('2026-10-01', '2026-11-01'), 31);
  assert.equal(C.addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(C.dayKey(new Date(2026, 0, 5)), '2026-01-05');
});

done();
