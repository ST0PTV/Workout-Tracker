// Phasenleiste der Übungsanimation (v2.7.0): Segmente aus den Phasen und Beschriftungsplan (ohne DOM prüfbar).
// Regel: Gleich benannte, aufeinanderfolgende Phasen bilden ein Segment. Bis 5 Segmente stehen alle Namen unter der Leiste,
// die auf ihren Platz passen; kurze Haltephasen (unter 10 % der Zeit) bleiben ohne Text. Ab 6 Segmenten steht nur der Name
// der aktuellen Phase. Die aktuelle Phase hat immer ein Label und hat vor den anderen Vorrang.
export const BAR_W = 236; // geschätzte Leistenbreite in px (nur für den Beschriftungsplan)
export const CHAR_W = 6.6; // geschätzte Zeichenbreite bei 12 px, halbfett
export const MAX_ALL = 5; // so viele Segmente dürfen noch alle beschriftet werden
export const SHORT_HOLD = 0.1; // Haltephasen unter diesem Zeitanteil bekommen keinen Text

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function segmentsOf(phases) {
  const T = phases.reduce((s, p) => s + p.dur, 0);
  const segs = [];
  let at = 0;
  for (const p of phases) {
    const last = segs[segs.length - 1];
    const hold = p.a === p.b;
    if (last && last.label === p.label) { last.end = at + p.dur; last.hold = last.hold && hold; }
    else segs.push({ label: p.label, start: at, end: at + p.dur, hold });
    at += p.dur;
  }
  for (const s of segs) { s.dur = s.end - s.start; s.share = s.dur / T; }
  return { T, segs };
}

export const segmentIndexAt = (segs, t, T) => {
  const x = ((t % T) + T) % T;
  const i = segs.findIndex((s) => x >= s.start && x < s.end);
  return i < 0 ? segs.length - 1 : i;
};

// Zeit, zu der ein Tipp auf den Namen springt: bei Haltephasen die Mitte, sonst kurz nach dem Anfang.
export const jumpTime = (seg) => (seg.hold ? (seg.start + seg.end) / 2 : seg.start + Math.min(0.05, seg.dur / 4));

// Liefert die sichtbaren Beschriftungen: [{ i, label, left }] mit left in Prozent der Leistenbreite (Mitte des Labels).
export function labelPlan(segs, active, barW = BAR_W) {
  const all = segs.length <= MAX_ALL;
  const item = (i) => {
    const s = segs[i], w = s.label.length * CHAR_W + 8;
    const c = clamp(((s.start + s.end) / 2 / segs.reduce((m, x) => Math.max(m, x.end), 0)) * barW, w / 2, barW - w / 2);
    return { i, label: s.label, c, w, fits: w <= s.share * barW + 20 };
  };
  const order = [active, ...segs.map((_, i) => i).filter((i) => i !== active)];
  const placed = [];
  for (const i of order) {
    const it = item(i);
    if (i !== active) {
      if (!all || !it.fits || (segs[i].hold && segs[i].share < SHORT_HOLD)) continue;
    }
    if (placed.some((p) => Math.abs(p.c - it.c) < (p.w + it.w) / 2 + 2)) continue;
    placed.push(it);
  }
  return placed.sort((a, b) => a.i - b.i).map((p) => ({ i: p.i, label: p.label, left: (p.c / barW) * 100 }));
}
