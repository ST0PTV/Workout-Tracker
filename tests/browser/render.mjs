// SVG-Zeichnung von Posen und Szenen für Streifen- und Prototyp-Skripte (nur Prüfwerkzeug, nicht Teil der App).
import { dumbbellPath } from '../../js/anim-data.js';

/** Szenenobjekte als SVG; behind=true: hinter der Figur, false: davor. */
export function sceneSvg(sc, behind) {
  let g = '';
  for (const s of sc) {
    const front = !s.back && (s.front || ['plate', 'dumbbell', 'bar', 'db'].includes(s.type));
    if (front === behind) continue;
    if (s.type === 'rect') g += `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.rx || 0}" fill="#9aa" stroke="#455" />`;
    else if (s.type === 'line') g += `<line x1="${s.from[0]}" y1="${s.from[1]}" x2="${s.to[0]}" y2="${s.to[1]}" stroke="#566" stroke-linecap="round" stroke-width="${s.w || 2}"${s.dash ? ' stroke-dasharray="6 4"' : ''}/>`;
    else if (s.type === 'plate') g += `<circle cx="${s.at[0]}" cy="${s.at[1]}" r="${s.r}" fill="#344" fill-opacity=".85"/><circle cx="${s.at[0]}" cy="${s.at[1]}" r="4" fill="#ddd"/>`;
    else if (s.type === 'dumbbell') g += `<rect x="${s.at[0] - 10}" y="${s.at[1] - 5}" width="20" height="10" rx="3" fill="#233"/>`;
    else if (s.type === 'bar') g += `<circle cx="${s.at[0]}" cy="${s.at[1]}" r="${s.r}" fill="#233"/>`;
    else if (s.type === 'db') g += `<path d="${dumbbellPath(s)}" fill="#89a" stroke="#234" stroke-width="2"/>`;
  }
  return g;
}

/** Eine Zelle: Boden, Szene hinten, Figurenebenen, Szene vorn. */
export function figureSvg(layerList, scene, { floor = true } = {}) {
  let g = (floor ? '<line x1="-500" y1="0" x2="500" y2="0" stroke="#000" stroke-width="2"/>' : '') + sceneSvg(scene || [], true);
  for (const l of layerList) g += `<path d="${l.d}" fill="${l.cls && l.cls.includes('far') ? '#c9b8a8' : '#e8d5c0'}" stroke="#7a5c45" stroke-width="1"/>`;
  return g + sceneSvg(scene || [], false);
}

export const stripSvg = (cells, n) => `<svg xmlns="http://www.w3.org/2000/svg" width="${n * 640}" height="500" viewBox="0 0 ${n * 640} 500"><rect width="100%" height="100%" fill="#fff"/>${cells.join('')}</svg>`;
