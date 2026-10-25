// Gemeinsame Helfer für die Browser-Prüfskripte (tests/browser/*.mjs).
// Keine Abhängigkeiten im Repo: Playwright und Chromium werden in der Umgebung gesucht.
//   WT_URL        fertiger Server (z. B. http://localhost:8765); sonst startet startServer() einen eigenen
//   WT_OUT        Ausgabeordner für Screenshots/Streifen (Standard: <tmp>/wt-browser)
//   CHROMIUM_PATH Chromium-Programm (Standard: Headless-Shell unter /opt/pw-browsers, sonst Playwright-Standard)
//   PLAYWRIGHT_MODULE  Ordner des Pakets "playwright", falls es nicht über import() gefunden wird
import { readFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const rootUrl = (p) => pathToFileURL(join(ROOT, p)).href;

/** App-Version aus js/version.js (einzige Quelle). */
export function appVersion() {
  const m = readFileSync(join(ROOT, 'js/version.js'), 'utf8').match(/APP_VERSION\s*=\s*'([^']+)'/);
  if (!m) throw new Error('APP_VERSION in js/version.js nicht gefunden');
  return m[1];
}

export function outDir(sub = '') {
  const d = join(process.env.WT_OUT || join(tmpdir(), 'wt-browser'), sub);
  mkdirSync(d, { recursive: true });
  return d;
}

export async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* weiter */ }
  const candidates = [process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c)) return await import(pathToFileURL(join(c, 'index.mjs')).href).catch(() => import(pathToFileURL(join(c, 'index.js')).href));
  }
  throw new Error('Playwright nicht gefunden (PLAYWRIGHT_MODULE setzen oder "npm i playwright" außerhalb des Repos).');
}

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  const dir = readdirSync(base).find((d) => d.startsWith('chromium_headless_shell-'));
  const exe = dir && join(base, dir, 'chrome-linux/headless_shell');
  return exe && existsSync(exe) ? exe : undefined;
}

export async function launch() {
  const { chromium } = await loadPlaywright();
  return chromium.launch({ executablePath: chromiumPath() });
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/** Statischer Server für das Repo-Verzeichnis. Gibt { url, close } zurück; nutzt WT_URL, falls gesetzt. */
export async function startServer() {
  if (process.env.WT_URL) return { url: process.env.WT_URL.replace(/\/$/, ''), close: async () => {} };
  const srv = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = normalize(join(ROOT, p));
    if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(f));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}`, close: () => new Promise((r) => srv.close(r)) };
}

/** Prüfungs-Zähler: ok(bedingung, text) schreibt "ok"/"FAIL"; done() setzt den Exit-Code. */
export function checker() {
  let fails = 0;
  return {
    ok(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails++; },
    done() { console.log(fails ? `${fails} Fehler` : 'alle Prüfungen bestanden'); if (fails) process.exitCode = 1; },
  };
}

export const BAD_TEXT = /\bnull\b|undefined|NaN/;

// v2.34.0 (Startseite A): Plan starten – große Karte („Starten“) oder kompakte Zeile (runde Start-Taste).
export async function startPlan(p, name = null) {
  const big = name ? p.locator('.start-card', { hasText: name }).locator('button', { hasText: 'Starten' }) : p.locator('.start-card button', { hasText: 'Starten' });
  if (await big.count()) { await big.first().click(); return; }
  const row = name ? p.locator('.start-row', { hasText: name }).locator('button.play') : p.locator('.start-row button.play');
  await row.first().click();
}

// v2.34.0: Nebenaktion aus dem ⋯-Menü des Training-Tabs (z. B. „Training nachtragen“).
export async function moreAction(p, label) {
  await p.locator('button.dots').click(); await p.waitForTimeout(300);
  await p.locator('.sheet :is(button.row, .row > button.t)', { hasText: label }).first().click(); await p.waitForTimeout(300);
}
