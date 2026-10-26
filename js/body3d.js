// Drehbarer 3D-Körper (v2.33.0): eigenes Modell, ohne Bibliothek und ohne Netz.
// Aufbau: Aus der gezeichneten Vorderansicht (figure.js) wird pro Bildzeile die Körperdicke berechnet
// (Rumpf als flache Ellipse, Arme, Beine und Kopf rund; Schultern und Hüften als Röhren, die in Arme und
// Beine übergehen). Der Körper ist das Volumen |z| ≤ D(x, y). Gezeichnet wird er per Raymarching in einem
// WebGL-Shader; die Muskelflächen der Vorder- und Rückansicht liegen als Textur vorn und hinten darauf.
// Das ist eine stilisierte Puppe, keine anatomische Abbildung (Brust und Gesäß sind nicht ausgeformt).
import { figureData } from './figure.js';

export const FIG_W = 200;
export const FIG_H = 440;
const HEAD = { cx: 100, cy: 31, rx: 18, ry: 24, rz: 17 };
export const D_MAX = 48; // größte Dicke (halbe Tiefe) in Figur-Einheiten; Skalierung der Tiefen-Textur
export const D_NEG = 4; // außerhalb der Figur ist die Tiefe leicht negativ: der Umriss liegt dann weich zwischen den Pixeln

// ---------- Tiefenfeld (ohne DOM, in Node testbar) ----------

// Läufe (zusammenhängende Innen-Pixel) einer Zeile: [[a, b], …] mit a, b als Pixel-Index (inklusive).
export function runsOf(mask, w, y) {
  const out = [];
  let a = -1;
  for (let x = 0; x < w; x++) {
    const inside = mask[y * w + x] > 0;
    if (inside && a < 0) a = x;
    if (!inside && a >= 0) { out.push([a, x - 1]); a = -1; }
  }
  if (a >= 0) out.push([a, w - 1]);
  return out;
}

// Kanten eines Laufs auf Bruchteile eines Pixels genau (aus der Kantenglättung der Maske): [links, rechts].
// cov(i) = Abdeckung des Pixels i (0–1). Ohne Kantenglättung liegen die Kanten auf den Pixelgrenzen.
function edgesOf(cov, w, y, a, b) {
  const at = (x) => (x < 0 || x >= w ? 0 : cov[y * w + x]);
  const l = at(a - 1) > 0.02 ? a - at(a - 1) : a + 1 - at(a);
  const r = at(b + 1) > 0.02 ? b + 1 + at(b + 1) : b + at(b);
  return [l, r];
}

const ellipse = (x, c, hw) => { const u = (x - c) / hw; return u >= 1 || u <= -1 ? 0 : Math.sqrt(1 - u * u); };

// Gerade durch Punkte (y, v) nach kleinsten Quadraten; liefert v(y). Ohne Punkte null.
function fitLine(pts) {
  if (!pts.length) return null;
  const n = pts.length;
  const my = pts.reduce((s, p) => s + p[0], 0) / n;
  const mv = pts.reduce((s, p) => s + p[1], 0) / n;
  const sxx = pts.reduce((s, p) => s + (p[0] - my) ** 2, 0);
  const k = sxx ? pts.reduce((s, p) => s + (p[0] - my) * (p[1] - mv), 0) / sxx : 0;
  return (y) => mv + k * (y - my);
}

// Linke Gliedmaße (Lauf links der Mitte, der die Mitte nicht enthält) in den Zeilen y0..y1: Mitte und Radius.
function limbSamples(mask, cov, w, y0, y1) {
  const c = [];
  const r = [];
  for (let y = y0; y <= y1; y++) {
    const runs = runsOf(mask, w, y).filter(([a, b]) => b < w / 2);
    if (runs.length !== 1) continue;
    const [l, rr] = edgesOf(cov, w, y, ...runs[0]);
    c.push([y, (l + rr) / 2]);
    r.push([y, (rr - l) / 2]);
  }
  return { center: fitLine(c), radius: fitLine(r) };
}

// Kleine Glättung (Box 3 × 3), nur innerhalb der Maske.
function blur(D, mask, w, h) {
  const out = new Float32Array(D.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) { out[i] = D[i]; continue; }
      let s = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy < 0 || yy >= h || xx < 0 || xx >= w || !mask[yy * w + xx]) continue;
          s += D[yy * w + xx];
          n++;
        }
      }
      out[i] = s / n;
    }
  }
  return out;
}

// Senkrechte Glättung über 5 Zeilen (gegen Stufen von Zeile zu Zeile).
function blurY(D, mask, w, h) {
  const out = new Float32Array(D.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) { out[i] = D[i]; continue; }
      let s = 0;
      let n = 0;
      for (let dy = -2; dy <= 2; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h || !mask[yy * w + x]) continue;
        s += D[yy * w + x];
        n++;
      }
      out[i] = s / n;
    }
  }
  return out;
}

// alpha: Abdeckung je Pixel (Vorderansicht mit Kopf, Figur-Einheiten 1:1), 0–1 oder 0–255. Ergebnis: halbe Dicke je Pixel.
export function depthField(alpha, w = FIG_W, h = FIG_H) {
  let scale = 1;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] > 1) { scale = 255; break; }
  const cov = Float32Array.from(alpha, (v) => v / scale);
  const mask = Uint8Array.from(cov, (v) => (v > 0.5 ? 1 : 0));
  const D = new Float32Array(w * h).fill(-D_NEG / 2);
  const mid = w / 2;
  const arm = limbSamples(mask, cov, w, 150, 200);
  // Eigene Rumpfbreite: unterhalb der Achseln gemessen, nach oben fortgesetzt (sonst zählen die Arme mit)
  const tw = [];
  for (let y = 150; y <= 195; y++) {
    const r = runsOf(mask, w, y).find(([a, b]) => a <= mid && b >= mid - 1);
    if (r) { const [l, rr] = edgesOf(cov, w, y, ...r); tw.push([y, (rr - l) / 2]); }
  }
  const torsoHW = fitLine(tw);
  for (let y = 0; y < h; y++) {
    for (const [a, b] of runsOf(mask, w, y)) {
      const [el, er] = edgesOf(cov, w, y, a, b);
      const c = (el + er) / 2;
      const hw = (er - el) / 2;
      const outer = (px) => (px < mid ? mid - el : er - mid); // Abstand Mitte → Außenkante auf dieser Seite
      const torso = a <= mid && b >= mid - 1;
      for (let x = a; x <= b; x++) {
        const px = x + 0.5;
        let d;
        if (y < HEAD.cy + HEAD.ry && torso && y < 58) {
          // Kopf als Ellipsoid, darunter der Hals als runder Querschnitt
          const u = (px - HEAD.cx) / HEAD.rx;
          const v = (y + 0.5 - HEAD.cy) / HEAD.ry;
          d = HEAD.rz * Math.sqrt(Math.max(0, 1 - u * u - v * v));
          d = Math.max(d, 0.9 * hw * ellipse(px, c, hw) * (hw < 14 ? 1 : 0));
        } else if (torso && hw < 14) {
          d = 0.9 * hw * ellipse(px, c, hw); // Hals
        } else if (torso) {
          let t = hw;
          if (y < 150 && torsoHW && arm.center) t = Math.min(hw, torsoHW(Math.max(y, 100)), mid - arm.center(y) + 0.3 * arm.radius(150));
          d = 0.76 * t * ellipse(px, mid, t);
          // Bereich zwischen Rumpfbreite und Außenkante (Schulter/Achsel): eigener runder Querschnitt
          const [sl, sr] = px < mid ? [el, mid - t] : [mid + t, er];
          if (sr - sl > 0.5) d = Math.max(d, 0.92 * ((sr - sl) / 2) * ellipse(px, (sl + sr) / 2, (sr - sl) / 2));
          // Becken: von oben nach unten weich in zwei Beine übergehen (je Seite eine runde Hälfte)
          if (y >= 205) {
            const [hl, hr] = px < mid ? [el, mid] : [mid, er];
            const hh = (hr - hl) / 2;
            const dh = 0.92 * hh * ellipse(px, (hl + hr) / 2, hh);
            const k = Math.min(1, (y - 205) / 53);
            const sm = k * k * (3 - 2 * k);
            d = d * (1 - sm) + dh * sm;
          }
        } else {
          d = 0.92 * hw * ellipse(px, c, hw);
        }
        // Schultern: Röhre des Arms nach oben verlängert (Deltamuskel etwas dicker)
        if (arm.center && y >= 86 && y < 185) {
          const xa = arm.center(y);
          const xs = px < mid ? px : w - px;
          // Radius reicht mindestens bis zur Außenkante, damit die Schulter rund bleibt
          const ra = Math.max(arm.radius(Math.max(150, y)) * (1 + 0.3 * Math.max(0, Math.min(1, (150 - y) / 50))), torso ? xa - (mid - outer(px)) + 0.3 : 0);
          const dx = xs - xa;
          if (Math.abs(dx) < ra) d = Math.max(d, Math.sqrt(ra * ra - dx * dx) * (y < 96 ? (y - 86) / 10 : 1));
        }
        D[y * w + x] = Math.min(D_MAX, Math.max(0.3, d)); // jedes Innen-Pixel hat etwas Dicke
      }
    }
  }
  let out = D;
  for (let i = 0; i < 3; i++) out = blur(out, mask, w, h);
  for (let i = 0; i < 3; i++) out = blurY(out, mask, w, h);
  // Außen: negativ nach (ungefährem) Abstand zum Umriss, glatt in alle Richtungen (keine Zeilenstufen am Rand)
  const R = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mask[i]) continue;
      let best = R + 1;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w || !mask[yy * w + xx]) continue;
          const dd = Math.hypot(dx, dy);
          if (dd < best) best = dd;
        }
      }
      out[i] = -Math.min(D_NEG, 1.2 * Math.max(0, best - 0.5 - cov[i]));
    }
  }
  return out;
}

// Für die Normalen: das ganze Feld (innen und außen) zweimal glätten, damit die Steigung am Rand ruhig bleibt.
export function smoothForNormals(D, w = FIG_W, h = FIG_H, passes = 2) {
  let cur = D;
  for (let pass = 0; pass < passes; pass++) {
    const out = new Float32Array(cur.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
          s += cur[yy * w + xx]; n++;
        }
        out[y * w + x] = s / n;
      }
    }
    cur = out;
  }
  return cur;
}

// Steigung des Tiefenfelds (zentrale Differenzen) für glatte Normalen: [dD/dx, dD/dy] je Pixel.
export const GRAD_MAX = 8;
// k: Feldpixel je Figur-Einheit (Steigung je Figur-Einheit, auch für das verfeinerte Feld).
export function gradientField(D, w = FIG_W, h = FIG_H, k = 1) {
  const G = new Float32Array(w * h * 2);
  const at = (x, y) => D[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 2;
      G[i] = Math.max(-GRAD_MAX, Math.min(GRAD_MAX, ((at(x + 1, y) - at(x - 1, y)) / 2) * k));
      G[i + 1] = Math.max(-GRAD_MAX, Math.min(GRAD_MAX, ((at(x, y + 1) - at(x, y - 1)) / 2) * k));
    }
  }
  return G;
}

// v3.5.3: Feld in doppelter Auflösung (bilinear verfeinert, danach geglättet). Der Umriss (Nulldurchgang) folgt
// so einer glatten Kurve statt den Stufen der Bildzeilen; die Form selbst bleibt die des einfachen Felds.
export const DEPTH_K = 2;
export function refineField(D, w = FIG_W, h = FIG_H, k = DEPTH_K) {
  const W2 = w * k;
  const H2 = h * k;
  const at = (x, y) => D[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const out = new Float32Array(W2 * H2);
  for (let y = 0; y < H2; y++) {
    const fy = (y + 0.5) / k - 0.5;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    for (let x = 0; x < W2; x++) {
      const fx = (x + 0.5) / k - 0.5;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const a = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
      const b = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
      out[y * W2 + x] = a * (1 - ty) + b * ty;
    }
  }
  return smoothForNormals(out, W2, H2);
}

// ---------- Texturen (Browser) ----------

// v3.0.0: Farben aus den CSS-Tokens (css/glass.css), damit Dunkel/Hell und der Akzent stimmen. Ersatzwerte = Dunkel.
const FALLBACK = { base: '#3A3F45', rest: '#454B52', line: 'rgba(0, 0, 0, 0.45)', accent: '#ECEEF0', sec: '#7A7E83' };
function colors() {
  if (typeof getComputedStyle !== 'function') return FALLBACK;
  const cs = getComputedStyle(document.documentElement);
  const v = (n, d) => cs.getPropertyValue(n).trim() || d;
  const out = { base: v('--fig3d-base', FALLBACK.base), rest: v('--fig3d-rest', FALLBACK.rest), line: v('--fig3d-line', FALLBACK.line), accent: v('--accent', FALLBACK.accent) };
  out.sec = mixHex(out.accent, out.base, 0.4) || FALLBACK.sec; // wie --sec in CSS: 40 % Akzent
  return out;
}
// Mischt zwei #rrggbb-Farben (t = Anteil von a); andere Formate → null.
function mixHex(a, b, t) {
  const p = (x) => /^#[0-9a-f]{6}$/i.test(x) ? [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)) : null;
  const A = p(a), B = p(b);
  if (!A || !B) return null;
  return '#' + A.map((c, i) => Math.round(c * t + B[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
}
const themeKey = () => { const c = colors(); return `${c.base}|${c.accent}`; };

function maskFor(sex) {
  const c = document.createElement('canvas');
  c.width = FIG_W; c.height = FIG_H;
  const g = c.getContext('2d', { willReadFrequently: true });
  const d = figureData('front', sex);
  g.fillStyle = '#fff';
  g.fill(new Path2D(d.body));
  g.beginPath(); g.ellipse(d.head.cx, d.head.cy, d.head.rx, d.head.ry, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(92, 50, 16, 12); // Hals schließt Kopf und Rumpf
  const px = g.getImageData(0, 0, FIG_W, FIG_H).data;
  const alpha = new Uint8Array(FIG_W * FIG_H); // Abdeckung 0–255 (Kantenglättung des Canvas)
  for (let i = 0; i < alpha.length; i++) alpha[i] = px[i * 4 + 3];
  return alpha;
}

// Farbtextur einer Ansicht: Grundfarbe, alle Muskeln mit feiner Kontur, eingefärbt nach classOf ('prim' | 'sec' | '').
// scale: Texturpixel je Figur-Einheit; lineWidth in Figur-Einheiten (v3.5.3: passend zur Ausgabegröße, siehe colorTextures).
function colorCanvas(view, sex, classOf, scale = 2, lineWidth = 0.9) {
  const c = document.createElement('canvas');
  c.width = FIG_W * scale; c.height = FIG_H * scale;
  const g = c.getContext('2d');
  g.scale(scale, scale);
  const col = colors();
  g.fillStyle = col.base;
  g.fillRect(0, 0, FIG_W, FIG_H);
  const prim = col.accent;
  g.lineWidth = lineWidth;
  g.strokeStyle = col.line;
  for (const { m, d } of figureData(view, sex).muscles) {
    const p = new Path2D(d);
    const k = classOf(m);
    g.fillStyle = k === 'prim' ? prim : k === 'sec' ? col.sec : col.rest;
    g.fill(p);
    g.stroke(p);
  }
  return c;
}

// ---------- WebGL (ein gemeinsamer Kontext für alle Ansichten) ----------

const VS = `attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision highp float;
varying vec2 v;
uniform sampler2D uDepth; uniform sampler2D uFront; uniform sampler2D uBack; uniform sampler2D uGrad; uniform float uGmax;
uniform float uYaw; uniform float uDmax; uniform vec2 uBox; // uBox: Breite, Höhe des Ausschnitts in Figur-Einheiten
const float W = ${FIG_W.toFixed(1)}; const float H = ${FIG_H.toFixed(1)}; const float DNEG = ${D_NEG.toFixed(1)};
// Tiefe in zwei Kanälen (hoch, niedrig): die Dekodierung ist linear, deshalb darf die Grafikkarte bilinear filtern.
float depth(vec2 q){ vec4 c = texture2D(uDepth, vec2(q.x / W, q.y / H)); return (c.r * 255.0 * 256.0 + c.g * 255.0) / 65535.0 * (uDmax + DNEG) - DNEG; }
float f(vec3 q){ return abs(q.z) - depth(vec2(q.x + W * 0.5, q.y)); }

void main(){
  float sx = (v.x - 0.5) * uBox.x;
  float sy = (1.0 - v.y) * uBox.y;
  float c = cos(uYaw), s = sin(uYaw);
  // Ray in Blickrichtung -z (orthografisch), ins Objekt gedreht (Drehung um die senkrechte Achse)
  vec3 o = vec3(c * sx - s * 110.0, sy, s * sx + c * 110.0);
  vec3 d = vec3(s, 0.0, -c);
  float t = 0.0; bool hit = false; vec3 q = o;
  for (int i = 0; i < 240; i++) {
    q = o + d * t;
    if (q.x > -W * 0.5 && q.x < W * 0.5 && q.y > 0.0 && q.y < H && f(q) < 0.0) { hit = true; break; }
    t += 0.95;
    if (t > 222.0) break;
  }
  if (!hit) { gl_FragColor = vec4(0.0); return; }
  float a = t - 0.95, b = t;
  for (int i = 0; i < 8; i++) { float m = 0.5 * (a + b); if (f(o + d * m) < 0.0) b = m; else a = m; }
  q = o + d * b;
  vec2 xy = vec2(q.x + W * 0.5, q.y);
  vec4 gc = texture2D(uGrad, vec2(xy.x / W, xy.y / H));
  vec2 g = ((vec2(gc.r * 255.0 * 256.0 + gc.g * 255.0, gc.b * 255.0 * 256.0 + gc.a * 255.0) / 65535.0) * 2.0 - 1.0) * uGmax;
  float sz = q.z >= 0.0 ? 1.0 : -1.0;
  vec3 n = normalize(vec3(-g.x, -g.y, sz));
  vec3 nv = vec3(c * n.x + s * n.z, n.y, -s * n.x + c * n.z); // zurück in Blickrichtung
  // v3.5.3: Vorder- und Rückseite an der Seitennaht (z ≈ 0) weich überblenden statt hart umschalten –
  // sonst springt die Farbe von Zeile zu Zeile hin und her (Zickzack an Schultern und Hüften).
  // An steilen Flanken liegt die ganze Seitenfläche über dem äußersten Rand der Zeichnung – dort verläuft die
  // Kontur des Muskels, die sich sonst als Zickzack über die Flanke zieht. Deshalb dort etwas weiter innen ablesen.
  float gl = length(g);
  vec2 tc = xy + (gl > 0.001 ? g / gl : vec2(0.0)) * 2.5 * (1.0 - abs(n.z));
  vec3 cf = texture2D(uFront, vec2(tc.x / W, tc.y / H)).rgb;
  vec3 cb = texture2D(uBack, vec2(1.0 - tc.x / W, tc.y / H)).rgb;
  vec3 col = mix(cb, cf, smoothstep(-2.0, 2.0, q.z));
  vec3 L = normalize(vec3(-0.45, -0.55, 0.7));
  float dif = max(dot(nv, L), 0.0);
  float rim = pow(1.0 - max(nv.z, 0.0), 3.0) * 0.25;
  gl_FragColor = vec4(col * (0.42 + 0.68 * dif) + rim, 1.0);
}`;

let shared = null; // { canvas, gl, prog, loc, depthTex: Map<sex, tex>, colorTex: Map<key, tex> }; false = kein WebGL

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'Shader-Fehler');
  return sh;
}

function getShared() {
  if (shared !== null) return shared || null;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
    if (!gl) { shared = false; return null; }
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { shared = false; return null; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pl = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(pl);
    gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
    const loc = Object.fromEntries(['uDepth', 'uFront', 'uBack', 'uGrad', 'uGmax', 'uYaw', 'uDmax', 'uBox'].map((k) => [k, gl.getUniformLocation(prog, k)]));
    shared = { canvas, gl, prog, loc, depthTex: new Map(), colorTex: new Map() };
    // iOS kann den Kontext im Hintergrund verwerfen: dann beim nächsten Zeichnen neu anlegen
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); shared = null; });
    return shared;
  } catch {
    shared = false;
    return null;
  }
}

function texFrom(gl, source, { lum = false, rgba = false, nearest = false, w, h } = {}) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  if (lum) gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, w, h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, source);
  else if (rgba) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  const filt = nearest ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function depthTexture(S, sex) {
  if (S.depthTex.has(sex)) return S.depthTex.get(sex);
  const W2 = FIG_W * DEPTH_K;
  const H2 = FIG_H * DEPTH_K;
  const D = refineField(depthField(maskFor(sex)));
  const G = gradientField(smoothForNormals(D, W2, H2, 6), W2, H2, DEPTH_K);
  const rgba = new Uint8Array(D.length * 4);
  for (let i = 0; i < D.length; i++) {
    // v3.5.3: Steigung mit 16 Bit (je zwei Kanäle: hoch, niedrig) – mit 8 Bit zeigten helle, flache Flächen
    // (Rücken, Gesäß) Höhenlinien-Ringe.
    const gx = Math.round((G[i * 2] / GRAD_MAX) * 32767.5 + 32767.5);
    const gy = Math.round((G[i * 2 + 1] / GRAD_MAX) * 32767.5 + 32767.5);
    rgba[i * 4] = gx >> 8; rgba[i * 4 + 1] = gx & 255;
    rgba[i * 4 + 2] = gy >> 8; rgba[i * 4 + 3] = gy & 255;
  }
  const hi = new Uint8Array(D.length * 4);
  for (let i = 0; i < D.length; i++) {
    const v = Math.round(((Math.min(D_MAX, D[i]) + D_NEG) / (D_MAX + D_NEG)) * 65535);
    hi[i * 4] = v >> 8; hi[i * 4 + 1] = v & 255; hi[i * 4 + 3] = 255;
  }
  const t = {
    depth: texFrom(S.gl, hi, { rgba: true, w: W2, h: H2 }),
    grad: texFrom(S.gl, rgba, { rgba: true, w: W2, h: H2 })
  };
  S.depthTex.set(sex, t);
  return t;
}

export const webglAvailable = () => !!getShared();

// Ansicht anlegen. classOf(muscleId) → 'prim' | 'sec' | ''. width/height in CSS-Pixeln.
// Gibt null zurück, wenn WebGL fehlt (Aufrufer zeigt dann die flache Figur).
// Farbtexturen je Figur und Einfärbung zwischenspeichern (die Startseite wird oft neu gezeichnet).
const TEX_KEEP = 12;
// v3.5.3: Texturgröße folgt der Abtastdichte (sonst wird eine zu große Textur ohne Mipmaps verkleinert und die
// Konturlinien zerfallen in Punkte). Linien etwa 1,2 Gerätepixel breit, höchstens so breit wie bisher (0,9).
export function texParams(samplePx, devicePx) {
  const scale = Math.max(2, Math.min(4, Math.round(samplePx / FIG_W)));
  const lineWidth = Math.max(0.55, Math.min(0.9, Math.round((1.2 / (devicePx / FIG_W)) * 20) / 20));
  return { scale, lineWidth };
}
function colorTextures(S, sex, classOf, key, { scale, lineWidth } = { scale: 2, lineWidth: 0.9 }) {
  const k = `${sex}|${themeKey()}|${key}|${scale}|${lineWidth}`; // v3.0.0: Erscheinung gehört zum Schlüssel
  if (S.colorTex.has(k)) { const t = S.colorTex.get(k); S.colorTex.delete(k); S.colorTex.set(k, t); return t; }
  const t = { front: texFrom(S.gl, colorCanvas('front', sex, classOf, scale, lineWidth)), back: texFrom(S.gl, colorCanvas('back', sex, classOf, scale, lineWidth)) };
  S.colorTex.set(k, t);
  while (S.colorTex.size > TEX_KEEP) {
    const [old, v] = S.colorTex.entries().next().value;
    S.gl.deleteTexture(v.front); S.gl.deleteTexture(v.back); S.colorTex.delete(old);
  }
  return t;
}

// Überabtastung je Achse: 2, bei sehr großen Ansichten weniger (GPU-Last auf dem iPhone begrenzen).
export const SS_MAX_PX = 1600000;
export function superSample(w, h) {
  const px = w * h;
  return px * 4 <= SS_MAX_PX ? 2 : Math.max(1, Math.sqrt(SS_MAX_PX / px));
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Ansicht anlegen. muscles: { primary: [...], secondary: [...] }. width in CSS-Pixeln.
// Waagerechtes Wischen dreht die Figur; ein Tipp ohne Drehen ruft onTap auf.
// Gibt null zurück, wenn WebGL fehlt (Aufrufer zeigt dann die flache Figur).
export function createBodyView({ muscles = { primary: [], secondary: [] }, sex = 'male', width = 64, yaw = -0.5, label = '', onTap = null } = {}) {
  const S = getShared();
  if (!S) return null;
  const height = Math.round((width * FIG_H) / FIG_W);
  const prim = new Set(muscles.primary);
  const sec = new Set(muscles.secondary.filter((m) => !prim.has(m)));
  const classOf = (m) => (prim.has(m) ? 'prim' : sec.has(m) ? 'sec' : '');
  const key = `${[...prim].sort().join(',')}/${[...sec].sort().join(',')}`;
  // v3.5.3: volle Pixeldichte (iPhone 3×) statt höchstens 2× – sonst skaliert der Browser das Bild hoch.
  const dpr = Math.min(3, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  const out = document.createElement('canvas');
  out.width = Math.round(width * dpr); out.height = Math.round(height * dpr);
  out.style.width = `${width}px`; out.style.height = `${height}px`;
  out.className = 'body3d';
  if (label) { out.setAttribute('role', 'img'); out.setAttribute('aria-label', label); } else out.setAttribute('aria-hidden', 'true');
  const ctx = out.getContext('2d');
  const state = { yaw };
  // v3.5.3: Kantenglättung durch Überabtastung – der Shader zeichnet in doppelter Größe, das Ergebnis wird
  // hochwertig verkleinert. Während des Drehens (fast) höchstens so viele Pixel wie bis v3.5.2 (2×-Dichte),
  // damit das Wischen auf dem iPhone gleich flüssig bleibt; im Stillstand ein Bild in voller Qualität.
  const ssFull = superSample(out.width, out.height);
  const ssFast = Math.min(1, 2 / Math.max(1, out.width / width));
  const render = (fast = false) => {
    const T = getShared();
    if (!T) return;
    const { gl, loc } = T;
    const ss = fast ? ssFast : ssFull;
    const gw = Math.round(out.width * ss);
    const gh = Math.round(out.height * ss);
    const dtex = depthTexture(T, sex);
    const ctex = colorTextures(T, sex, classOf, key, texParams(out.width * ssFull, out.width));
    if (T.canvas.width !== gw || T.canvas.height !== gh) { T.canvas.width = gw; T.canvas.height = gh; }
    gl.viewport(0, 0, gw, gh);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dtex.depth); gl.uniform1i(loc.uDepth, 0);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, dtex.grad); gl.uniform1i(loc.uGrad, 3);
    gl.uniform1f(loc.uGmax, GRAD_MAX);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ctex.front); gl.uniform1i(loc.uFront, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ctex.back); gl.uniform1i(loc.uBack, 2);
    gl.uniform1f(loc.uYaw, state.yaw);
    gl.uniform1f(loc.uDmax, D_MAX);
    gl.uniform2f(loc.uBox, (FIG_H * gw) / gh, FIG_H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.clearRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(T.canvas, 0, 0, gw, gh, 0, 0, out.width, out.height);
  };
  let frame = 0;
  const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(true); }); };
  let anim = 0;
  const turnTo = (target) => {
    cancelAnimationFrame(anim);
    // kürzester Weg
    let delta = ((target - state.yaw) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    if (reducedMotion()) { state.yaw += delta; render(); return; }
    const from = state.yaw;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 350);
      state.yaw = from + delta * (1 - (1 - k) ** 3);
      render(k < 1);
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  // Waagerecht wischen = drehen; senkrecht scrollt weiter die Seite (touch-action: pan-y).
  let drag = null;
  let dragged = false;
  out.style.touchAction = 'pan-y';
  out.addEventListener('pointerdown', (e) => { cancelAnimationFrame(anim); drag = { x: e.clientX, yaw: state.yaw }; dragged = false; });
  out.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!dragged && Math.abs(dx) < 4) return;
    if (!dragged) { dragged = true; out.setPointerCapture?.(e.pointerId); }
    state.yaw = drag.yaw + (dx / Math.max(width, 120)) * Math.PI * 1.4;
    schedule();
  });
  const stop = () => {
    const was = dragged;
    drag = null;
    if (was) { cancelAnimationFrame(frame); frame = 0; render(); } // nach dem Drehen in voller Qualität
  };
  out.addEventListener('pointerup', stop);
  out.addEventListener('pointercancel', stop);
  out.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dragged) { dragged = false; e.preventDefault(); return; }
    if (onTap) onTap();
  });
  render();
  return {
    el: out,
    get yaw() { return state.yaw; },
    setYaw(v) { state.yaw = v; render(); },
    turnTo,
    render
  };
}
