// Übungsanimation (v2.0): Karte mit Figur, Hinweislinien zu den Kernpunkten (Stil H), Abspielen/Pause,
// Keyframe-Sprung, Variante (z. B. hoch-/tiefstabig), Datenbasis-Sheet und Kernpunkt-Sheets.
// Bewegungsmodell: js/motion.js; Daten: js/anim-data.js.
import { h } from './util.js';
import { icon } from './icons.js';
import { openSheet } from './sheet.js';
import * as M from './motion.js';
import { MUSCLE_SHAPE_F, HIDDEN_MUSCLES_F } from './motion-front.js';
import { animationFor, framesOf, READ, BASIS, STATUS, TEMPO_BASIS, ANIM_CHECKED_AT } from './anim-data.js';
import { poolEntry } from './pool.js';
import { MUSCLES } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
const JOINT_DE = { shank: 'Schienbein', knee: 'Knie', hip: 'Hüfte', ankle: 'Sprunggelenk', trunk: 'Rumpf', shoulder: 'Schulter', abd: 'Schulter (seitlich)', elbow: 'Ellbogen', foot: 'Fuß', armHang: 'Armneigung' };
const LABEL_W = 88, LABEL_H = 24, GAP = 30, COL = 108, ROWPAD = 62;

export function hasAnimation(ref) { return !!animationFor(ref); }
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, attrs = {}, ...children) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) e.setAttribute(k, String(v));
  for (const c of children) if (c) e.append(c);
  return e;
}
const nums = (d) => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);

// Rolle je Form aus den Pool-Muskeln (primär/sekundär).
function roleFn(pool, view) {
  const map = view === 'front' ? MUSCLE_SHAPE_F : M.MUSCLE_SHAPE;
  const prim = new Set((pool?.muscles.primary || []).map((m) => map[m]).filter(Boolean));
  const sec = new Set((pool?.muscles.secondary || []).map((m) => map[m]).filter(Boolean));
  return (id) => (prim.has(id) ? 'p' : sec.has(id) ? 's' : '');
}

// Begrenzung über alle Keyframes und Zwischenbilder (Figur und Geräte), damit die viewBox fest bleibt.
function bounds(anim, frames) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const add = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  const T = M.cycleLength(anim.phases);
  for (let i = 0; i <= 16; i++) {
    const { pose } = M.poseAt(frames, anim.phases, (T * i) / 16);
    for (const l of M.layers(pose)) { const n = nums(l.d); for (let k = 0; k < n.length; k += 2) add(n[k], n[k + 1]); }
    for (const s of pose.scene) {
      if (s.type === 'rect') { add(s.x, s.y); add(s.x + s.w, s.y + s.h); }
      else if (s.type === 'plate' || s.type === 'bar') { add(s.at[0] - s.r, s.at[1] - s.r); add(s.at[0] + s.r, s.at[1] + s.r); }
      else if (s.type === 'line') { add(s.from[0], s.from[1]); add(s.to[0], s.to[1]); }
      else if (s.type === 'dumbbell') { add(s.at[0] - 10, s.at[1] - 6); add(s.at[0] + 10, s.at[1] + 6); }
    }
  }
  if (!anim.noFloor) add(0, 0);
  return { x0, x1, y0, y1 };
}

// Feste Beschriftungsplätze. Hohe Szenen: Spalten links/rechts (Stil H). Breite Szenen: Reihen oben/unten,
// damit die Hinweislinien die Figur nicht kreuzen. Mindestabstand GAP (Spalten) bzw. Pillenbreite (Reihen).
function labelSlots(anim, frames, b, upp) {
  const ref = M.solvePose(frames[Math.min(1, frames.length - 1)].pose);
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const rows = anim.layout ? anim.layout === 'rows' : (b.x1 - b.x0) > 1.1 * (b.y1 - b.y0);
  const items = anim.keyPoints.map((kp, i) => {
    const a = M.anchor(ref, kp.anchor) || [cx, cy];
    return rows ? { i, side: a[1] < cy ? 't' : 'b', x: a[0], y: a[1] } : { i, side: kp.side || (a[0] < cx ? 'l' : 'r'), x: a[0], y: a[1] };
  });
  const slots = new Array(items.length);
  const sides = rows ? ['t', 'b'] : ['l', 'r'];
  for (const side of sides) {
    const list = items.filter((x) => x.side === side);
    if (rows) {
      const gap = (LABEL_W + 4) * upp, lo = b.x0 - ROWPAD * upp + (LABEL_W / 2 + 3) * upp, hi = b.x1 + ROWPAD * upp - (LABEL_W / 2 + 3) * upp;
      list.sort((p, q) => p.x - q.x);
      for (let k = 0, lim = lo; k < list.length; k++) { list[k].x = Math.max(list[k].x, lim); lim = list[k].x + gap; }
      for (let k = list.length - 1, lim = hi; k >= 0; k--) { list[k].x = Math.min(list[k].x, lim); lim = list[k].x - gap; }
      for (const it of list) slots[it.i] = { side, x: it.x };
    } else {
      const gap = GAP * upp;
      list.sort((p, q) => p.y - q.y);
      let last = -1e9;
      for (const it of list) { it.y = Math.max(it.y, last + gap); last = it.y; }
      for (let k = list.length - 1, lim = b.y1 - (LABEL_H / 2) * upp; k >= 0; k--) { list[k].y = Math.min(list[k].y, lim); lim = list[k].y - gap; }
      for (const it of list) slots[it.i] = { side, y: it.y };
    }
  }
  return { slots, rows };
}

function sceneNodes(scene, behind) {
  const out = [];
  for (const s of scene) {
    const front = s.front || s.type === 'plate' || s.type === 'dumbbell' || s.type === 'bar';
    if (front === behind) continue;
    if (s.type === 'plate') { out.push(el('circle', { cx: s.at[0], cy: s.at[1], r: s.r, class: 'an-plate' }), el('circle', { cx: s.at[0], cy: s.at[1], r: 4, class: 'an-barend' })); }
    else if (s.type === 'dumbbell') out.push(el('rect', { x: s.at[0] - 10, y: s.at[1] - 5, width: 20, height: 10, rx: 3, class: 'an-barend' }));
    else if (s.type === 'bar') out.push(el('circle', { cx: s.at[0], cy: s.at[1], r: s.r, class: 'an-barend' }));
    else if (s.type === 'rect') out.push(el('rect', { x: s.x, y: s.y, width: s.w, height: s.h, rx: s.rx || 0, class: 'an-gear' }));
    else if (s.type === 'line') out.push(el('line', { x1: s.from[0], y1: s.from[1], x2: s.to[0], y2: s.to[1], class: 'an-gear-line' + (s.dash ? ' dash' : ''), 'stroke-width': s.w || 2 }));
  }
  return out;
}

// Karte mit Figur und Steuerung. Rückgabe: { el, stop }.
export function animationCard(ref, { onKeyPoint = null } = {}) {
  const anim = animationFor(ref);
  const pool = poolEntry(ref);
  if (!anim || !pool) return null;
  const roleOf = roleFn(pool, anim.view);
  const st = { variant: anim.variants ? anim.variants[0].key : null, playing: !reducedMotion(), t: 0, last: null, raf: 0, kpActive: [] };
  let frames = M.resolveFrames(framesOf(anim, st.variant));
  let b = bounds(anim, frames);
  let upp = 1, padX = COL, padY = 18, lay = { slots: [], rows: false };
  const relayout = () => {
    lay.rows = anim.layout ? anim.layout === 'rows' : (b.x1 - b.x0) > 1.1 * (b.y1 - b.y0);
    // Einheiten je Pixel aus der Szenenbreite: Schrift und Pillen bleiben in Pixeln etwa gleich groß
    upp = lay.rows ? Math.max(1, (b.x1 - b.x0 + 2 * ROWPAD) / 360) : Math.max(1, (b.x1 - b.x0 + 2 * COL) / 360);
    padX = (lay.rows ? ROWPAD : COL) * upp;
    padY = (lay.rows ? LABEL_H + 26 : 18) * upp;
    lay = labelSlots(anim, frames, b, upp);
  };
  relayout();

  const svg = el('svg', { class: 'anim-svg', role: 'img', 'aria-label': `Animation: ${pool.name}` });
  const gBack = el('g'), gBody = el('g'), gFront = el('g'), gMarks = el('g'), floor = el('line', { class: 'an-floor' });
  svg.append(floor, gBack, gBody, gFront, gMarks);
  const phaseEl = h('span', { class: 'anim-phase' });
  const kpRows = [];

  function setViewBox() {
    const w = b.x1 - b.x0 + 2 * padX, hgt = b.y1 - b.y0 + 2 * padY;
    svg.setAttribute('viewBox', `${b.x0 - padX} ${b.y0 - padY} ${w} ${hgt}`);
    floor.setAttribute('x1', b.x0 - padX); floor.setAttribute('x2', b.x1 + padX); floor.setAttribute('y1', 0); floor.setAttribute('y2', 0);
    floor.style.display = anim.noFloor ? 'none' : '';
  }

  function draw(t) {
    const { pose, phase } = M.poseAt(frames, anim.phases, t);
    gBody.replaceChildren(...M.layers(pose, roleOf).map((l) => el('path', { d: l.d, class: l.cls })));
    gBack.replaceChildren(...sceneNodes(pose.scene, true));
    gFront.replaceChildren(...sceneNodes(pose.scene, false));
    const lw = LABEL_W * upp, lh = LABEL_H * upp;
    const marks = anim.keyPoints.map((kp, i) => {
      const a = M.anchor(pose, kp.anchor);
      if (!a) return null;
      const s = lay.slots[i], on = phase.kp.includes(i);
      let lx, ly, ex, ey, ebx, eby;
      if (lay.rows) {
        lx = s.x - lw / 2; ly = (s.side === 't' ? b.y0 - padY + 4 * upp : b.y1 + padY - 4 * upp - lh);
        ex = s.x; ey = s.side === 't' ? ly + lh : ly; ebx = ex; eby = s.side === 't' ? ey + 10 * upp : ey - 10 * upp;
      } else {
        const left = s.side === 'l';
        lx = left ? b.x0 - padX + 4 * upp : b.x1 + padX - 4 * upp - lw; ly = s.y - lh / 2;
        ex = left ? lx + lw : lx; ey = s.y; ebx = left ? ex + 12 * upp : ex - 12 * upp; eby = ey;
      }
      const g = el('g', { class: 'an-mark' + (on ? ' on' : ''), 'data-kp': i });
      g.append(el('polyline', { points: `${a[0]},${a[1]} ${M.f1(ebx)},${M.f1(eby)} ${M.f1(ex)},${M.f1(ey)}`, class: 'an-lead' }),
        el('circle', { cx: a[0], cy: a[1], r: 3.2 * upp, class: 'an-dot' }),
        el('rect', { x: M.f1(lx), y: M.f1(ly), width: M.f1(lw), height: M.f1(lh), rx: M.f1(lh / 2), class: 'an-pill' }),
        el('text', { x: M.f1(lx + lw / 2), y: M.f1(ly + lh / 2 + 4.5 * upp), 'text-anchor': 'middle', class: 'an-label', 'font-size': M.f1(13 * upp) }, document.createTextNode(`${i + 1} · ${kp.short}`)));
      if (onKeyPoint) g.addEventListener('click', () => onKeyPoint(i));
      return g;
    }).filter(Boolean);
    gMarks.replaceChildren(...marks);
    phaseEl.textContent = phase.label;
    kpRows.forEach((row, i) => row.classList.toggle('on', phase.kp.includes(i)));
  }

  function loop(ts) {
    if (!st.playing) return;
    if (st.last !== null) st.t += Math.min(0.1, (ts - st.last) / 1000);
    st.last = ts;
    draw(st.t);
    st.raf = requestAnimationFrame(loop);
  }
  function play() { if (st.playing) return; st.playing = true; st.last = null; btn.replaceChildren(icon('pause', { size: 20 }), ' Pause'); st.raf = requestAnimationFrame(loop); }
  function pause() { st.playing = false; cancelAnimationFrame(st.raf); btn.replaceChildren(icon('play', { size: 20 }), ' Abspielen'); }
  function stop() { pause(); document.removeEventListener('visibilitychange', onVis); }
  function onVis() { if (document.hidden) pause(); }
  document.addEventListener('visibilitychange', onVis);

  const btn = h('button', { class: 'btn primary anim-play', type: 'button', onclick: () => (st.playing ? pause() : play()) });
  // Keyframe-Sprung (auch Bedienung ohne Animation)
  const frameChips = h('div', { class: 'anim-frames' });
  function buildChips() {
    frameChips.replaceChildren(...frames.map((f, i) => h('button', { class: 'chip small', type: 'button', onclick: () => {
      pause();
      let acc = 0;
      for (const p of anim.phases) { if (p.a === p.b && p.a === i) break; if (p.b === i) { acc += p.dur; break; } acc += p.dur; }
      st.t = acc; draw(st.t);
    } }, f.label)));
  }
  buildChips();
  // Variante
  let seg = null;
  if (anim.variants) {
    const chips = anim.variants.map((v) => h('button', { type: 'button', class: v.key === st.variant ? 'on' : '', onclick: () => {
      st.variant = v.key; frames = M.resolveFrames(framesOf(anim, v.key)); b = bounds(anim, frames); relayout(); setViewBox(); buildChips();
      for (const c of chips) c.classList.toggle('on', c === chipFor(v.key)); draw(st.t);
    } }, v.label));
    const chipFor = (k) => chips[anim.variants.findIndex((v) => v.key === k)];
    seg = h('div', { class: 'seg anim-seg' }, chips);
  }
  const basis = BASIS[anim.basis];
  const badge = h('button', { class: `anim-badge ${anim.basis}`, type: 'button', onclick: () => openDataSheet(anim, frames, pool) }, icon('info', { size: 14, cls: 'inline' }), ' ', basis.label);
  const list = h('ol', { class: 'anim-kps' }, anim.keyPoints.map((kp, i) => {
    const row = h('li', { class: 'anim-kp' }, h('button', { class: 'plain', type: 'button', onclick: () => (onKeyPoint ? onKeyPoint(i) : openKeyPointSheet(anim, i, pool)) },
      h('span', { class: 'n' }, String(i + 1)), h('span', { class: 't' }, kp.text, kp.status === 'contested' ? h('em', { class: 'tag' }, 'umstritten') : null), icon('info', { size: 16, cls: 'inline info-mark' })));
    kpRows.push(row);
    return row;
  }));
  const card = h('div', { class: 'anim-card' },
    h('div', { class: 'anim-top' }, badge, seg),
    h('div', { class: 'anim-stage' }, svg),
    h('div', { class: 'anim-ctl' }, btn, h('span', { class: 'muted' }, 'Phase: ', phaseEl)),
    frameChips,
    list,
    h('p', { class: 'muted small' }, 'Gruppenmittel aus kleinen Studien, Seitenansicht vereinfacht – eine Orientierung, keine Vorgabe für die eigene Technik.'));
  setViewBox();
  draw(0);
  if (st.playing) { st.playing = false; play(); } else pause();
  return { el: card, stop, pause };
}

// Sheet nur mit der Animation (z. B. aus dem Training).
export function openAnimation(ref) {
  const pool = poolEntry(ref);
  const card = animationCard(ref);
  if (!card) return;
  openSheet(h('div', { class: 'info' }, card.el), { title: pool.name, full: true, onClose: card.stop });
}

const fmtDeg = (v) => `${String(Math.round(v * 10) / 10).replace('.', ',')}°`;
function srcLabel(anim, ids) {
  return (ids || []).map((id) => anim.sources[id]?.label?.split(',')[0] || id).join('; ');
}

// Datenbasis: Herkunft jedes Werts je Keyframe, Tempo, Quellen.
export function openDataSheet(anim, frames, pool) {
  const basis = BASIS[anim.basis];
  const frameBlocks = frames.map((f) => {
    const items = [];
    const vals = { ...f.pose, ...(f.pose.arm || {}), ...(f.pose.legs && !Array.isArray(f.pose.legs.ankle) ? { hip: f.pose.legs.hip, knee: f.pose.legs.knee } : {}) }; // Frontansicht: Arm- und Beinwerte liegen verschachtelt
    for (const [k, de] of Object.entries(JOINT_DE)) {
      const v = vals[k];
      if (v === null || v === undefined || typeof v !== 'object' || !('v' in v)) continue;
      items.push(h('li', {}, h('b', {}, `${de} ${fmtDeg(v.v)}`), ` – ${READ[v.read] || v.read}`, v.src?.length ? ` (${srcLabel(anim, v.src)})` : '', v.raw ? h('small', { class: 'muted' }, ` · ${v.raw}`) : null));
    }
    for (const v of f.facts || []) items.push(h('li', {}, h('b', {}, v.raw || fmtDeg(v.v)), ` – ${READ[v.read] || v.read}`, v.src?.length ? ` (${srcLabel(anim, v.src)})` : ''));
    return h('div', {}, h('h4', {}, f.label), h('ul', { class: 'small' }, items));
  });
  const hiddenList = anim.view === 'front' ? HIDDEN_MUSCLES_F : M.HIDDEN_MUSCLES;
  const hidden = [...(pool.muscles.primary || []), ...(pool.muscles.secondary || [])].filter((m) => hiddenList.includes(m));
  openSheet(h('div', { class: 'info' },
    h('p', {}, h('span', { class: `anim-badge ${anim.basis}` }, basis.label), ' ', basis.text),
    h('p', {}, anim.basisNote),
    h('h3', {}, 'Werte je Position'),
    ...frameBlocks,
    h('p', { class: 'muted small' }, anim.view === 'front' ? 'Frontansicht: Schulter seitlich 0° = Arm hängt, 90° = waagerecht; Ellbogen als Beugung ab gestreckt. Arme und Beine, die aus der Bildebene zeigen, sind verkürzt dargestellt; Beugungen in der Sagittalebene (z. B. angewinkelte Beine) erscheinen nur als Verkürzung.' : 'Winkel: Knie, Hüfte und Ellbogen als Beugung ab gestreckt (0°); Rumpf- und Schienbeinneigung aus der Senkrechten; Schulter 0° = Arm hängt. Arme außerhalb der Bildebene sind in der Seitenansicht verkürzt dargestellt.'),
    h('h3', {}, 'Tempo'),
    h('p', {}, h('b', {}, TEMPO_BASIS[anim.tempo.basis]), ` – ${anim.tempo.note}`),
    hidden.length ? h('p', { class: 'muted small' }, `Nicht als Fläche sichtbar (${anim.view === 'front' ? 'Frontansicht' : 'Seitenansicht'}): ${hidden.map((m) => MUSCLES[m]).join(', ')}.`) : null,
    h('h3', {}, 'Quellen'),
    h('ul', { class: 'small' }, Object.entries(anim.sources).map(([id, s]) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label), ` – ${READ[s.read] || s.read}`, s.note ? h('small', { class: 'muted' }, ` · ${s.note}`) : null))),
    h('p', { class: 'muted small' }, `Recherche vom ${fmtDate(ANIM_CHECKED_AT)}. Werte mit „automatische Seitenzusammenfassung“ sind noch nicht am PDF geprüft.`)
  ), { title: 'Datenbasis der Animation', full: true });
}

export function openKeyPointSheet(anim, i, pool) {
  const kp = anim.keyPoints[i];
  openSheet(h('div', { class: 'info' },
    h('p', {}, h('span', { class: `anim-status ${kp.status}` }, STATUS[kp.status]), kp.status === 'contested' ? h('span', { class: 'muted small' }, ' – es gibt Belege für mehr als eine Ausführung') : null),
    h('p', {}, kp.explain),
    h('h3', {}, 'Quellen'),
    h('ul', { class: 'small' }, kp.src.map((id) => { const s = anim.sources[id]; return s ? h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label), ` – ${READ[s.read] || s.read}`) : h('li', {}, id); })),
    h('p', { class: 'muted small' }, 'Kein Versprechen zur Verletzungsvorbeugung: dazu gibt es für diese Punkte keine Verlaufsdaten.')
  ), { title: `${i + 1}. ${kp.text}` });
}

function fmtDate(iso) { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; }
