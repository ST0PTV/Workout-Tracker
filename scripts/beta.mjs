#!/usr/bin/env node
// v3.14.0: Eingefrorene Testversion für Testpersonen bauen (eigenes Repo ST0PTV/Workout-Tracker-Beta, eigene Pages-Adresse).
// Die Hauptversion kann weiterlaufen: Testpersonen bekommen eine Änderung nur, wenn dieses Skript mit --push läuft.
//
//   npm run beta -- <beta-version> [--ref <git-ref>] [--out <ordner>] [--push]
//     beta-version  SemVer der Beta, z. B. 1.0.0 (Fehlerbehebung: 1.0.1)
//     --ref         Stand der Hauptversion (Standard: origin/main). Für --push muss er in origin/main enthalten sein.
//     --out         Klon des Beta-Repos (Standard: ../workout-tracker-beta)
//     --push        im Beta-Repo committen und pushen (nur nach dem „deploy“ des Nutzers)
//
// Was die Kopie anders macht (jede Ersetzung muss genau einmal greifen, sonst Abbruch):
//   js/channel.js  CHANNEL 'beta', BETA_VERSION, Speicher-Präfix 'wtb_' (gleiche Origin st0ptv.github.io wie die Hauptversion)
//   js/theme-early.js  Key 'wtb_settings'
//   sw.js          Cache 'wtb-cache-<beta>-v<n>' (räumt nur eigene Caches auf)
//   index.html, manifest.webmanifest  Name „Workout Beta“
//   icons/*.png    Band „BETA“; README.md eigener Text
// Ins Beta-Repo kommen nur App-Dateien: keine Tests, Skripte, Workflows oder Doku.
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fail = (m) => { console.error('Abbruch: ' + m); process.exit(1); };
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const version = args.find((a) => /^\d+\.\d+\.\d+$/.test(a));
const push = args.includes('--push');
const ref = opt('--ref', 'origin/main');
const OUT = resolve(opt('--out', join(ROOT, '..', 'workout-tracker-beta')));
if (!version) fail('Beta-Version fehlt (z. B. npm run beta -- 1.0.0).');

const sh = (cmd, cwd = ROOT) => execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const run = (title, cmd, argv, env = {}) => {
  console.log(`\n== ${title} ==`);
  const r = spawnSync(cmd, argv, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) fail(`${title} fehlgeschlagen.`);
};

// ---------- Stand wählen ----------
sh('git fetch -q origin main');
const commit = sh(`git rev-parse --verify ${ref}^{commit}`);
if (push) {
  const anc = spawnSync('git', ['merge-base', '--is-ancestor', commit, 'origin/main'], { cwd: ROOT });
  if (anc.status !== 0) fail(`${ref} ist nicht in origin/main – die Beta wird nur aus veröffentlichten Ständen gebaut.`);
}
const base = sh(`git show ${commit}:js/version.js`).match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1];
if (!base) fail('APP_VERSION im gewählten Stand nicht gefunden.');
console.log(`Beta ${version} aus ${base} (${commit.slice(0, 7)}) → ${OUT}`);

// ---------- Kopieren (nur App-Dateien) ----------
if (!existsSync(join(OUT, '.git'))) fail(`${OUT} ist kein Git-Klon des Beta-Repos.`);
for (const f of readdirSync(OUT)) if (f !== '.git') rmSync(join(OUT, f), { recursive: true, force: true });
const APP = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons', 'LICENSE'];
execSync(`git archive ${commit} ${APP.join(' ')} | tar -x -C "${OUT}"`, { cwd: ROOT, shell: '/bin/bash' });

// ---------- Ersetzungen ----------
function edit(file, pairs) {
  const p = join(OUT, file);
  let s = readFileSync(p, 'utf8');
  for (const [from, to, times = 1] of pairs) {
    const n = s.split(from).length - 1;
    if (n !== times) fail(`${file}: „${from}“ ${n}× statt ${times}× gefunden.`);
    s = s.split(from).join(to);
  }
  writeFileSync(p, s);
}
edit('js/channel.js', [
  ["export const CHANNEL = 'main';", "export const CHANNEL = 'beta';"],
  ['export const BETA_VERSION = null;', `export const BETA_VERSION = '${version}';`],
  ["export const STORAGE_PREFIX = 'wt_';", "export const STORAGE_PREFIX = 'wtb_';"]
]);
edit('js/theme-early.js', [["localStorage.getItem('wt_settings')", "localStorage.getItem('wtb_settings')"]]);
edit('sw.js', [
  ['const CACHE_NAME = `wt-cache-v${CACHE_VERSION}`;', `const CACHE_NAME = \`wtb-cache-${version}-v\${CACHE_VERSION}\`;`],
  ["k.startsWith('wt-cache-')", "k.startsWith('wtb-cache-')"]
]);
edit('index.html', [
  ['<title>Workout Tracker</title>', '<title>Workout Beta</title>'],
  ['<meta name="apple-mobile-web-app-title" content="Workout">', '<meta name="apple-mobile-web-app-title" content="Workout Beta">']
]);
edit('manifest.webmanifest', [
  ['"name": "Workout Tracker",', '"name": "Workout Tracker Beta",'],
  ['"short_name": "Workout",', '"short_name": "Workout Beta",']
]);
writeFileSync(join(OUT, 'README.md'), `# Workout Tracker – Beta

Testversion der Workout-Tracker-App (PWA fürs iPhone). Beta ${version}, Stand der Hauptversion ${base}.
Diese Kopie ändert sich nur, wenn eine neue Beta-Version erscheint; die Weiterentwicklung läuft im Hauptprojekt.

## Installieren
In Safari öffnen → Teilen → „Zum Home-Bildschirm“. Danach die App vom Home-Bildschirm starten.

## Deine Daten
- Alles bleibt auf deinem Gerät. Die App sendet nichts: kein Konto, kein Server, keine Analyse.
- Deshalb selbst sichern: Einstellungen → Backup → Exportieren (z. B. in „Dateien“ oder iCloud Drive).
- Löschst du die App oder die Website-Daten, sind die Daten ohne Backup weg.
- Die Seite wird über GitHub Pages ausgeliefert; GitHub speichert dabei die IP-Adresse der Besucher.

Vorschläge und Werte der App sind Schätzungen, keine medizinische Beratung.

Lizenz: siehe LICENSE.
`);

// ---------- Icons mit Band „BETA“ ----------
const { launch } = await import(join(ROOT, 'tests/browser/lib.mjs'));
const browser = await launch();
const page = await browser.newPage();
for (const f of readdirSync(join(OUT, 'icons')).filter((x) => x.endsWith('.png'))) {
  const src = 'data:image/png;base64,' + readFileSync(join(OUT, 'icons', f)).toString('base64');
  const maskable = f.includes('maskable');
  const out = await page.evaluate(async ({ src, maskable }) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const W = c.width, bandH = Math.round(W * (maskable ? 0.14 : 0.2));
    const y = Math.round(maskable ? W * 0.68 : W - bandH); // maskable: innerhalb der sicheren Zone (Mitte 80 %)
    g.fillStyle = '#FF9F0A'; g.fillRect(0, y, W, bandH);
    g.fillStyle = '#000'; g.font = `700 ${Math.round(bandH * 0.62)}px -apple-system, Helvetica, Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BETA', W / 2, y + bandH / 2 + 1);
    return c.toDataURL('image/png').split(',')[1];
  }, { src, maskable });
  writeFileSync(join(OUT, 'icons', f), Buffer.from(out, 'base64'));
}
await browser.close();

// ---------- Prüfungen an der Kopie ----------
const leftovers = [];
for (const f of sh('git ls-files -o --exclude-standard', OUT).split('\n').concat(sh('git ls-files', OUT).split('\n')).filter(Boolean)) {
  if (!/\.(js|html|webmanifest)$/.test(f) || !existsSync(join(OUT, f))) continue;
  if (/['"`]wt_[a-z]|wt-cache-/.test(readFileSync(join(OUT, f), 'utf8'))) leftovers.push(f);
}
if (leftovers.length) fail('Hauptversions-Präfix noch in: ' + [...new Set(leftovers)].join(', '));
for (const bad of ['tests', 'scripts', '.github', 'docs', 'package.json', '.privacy-terms.local']) if (existsSync(join(OUT, bad))) fail(`${bad} gehört nicht in die Beta.`);
run('Syntax', 'bash', ['-c', `for f in "${OUT}"/js/*.js "${OUT}"/sw.js; do node --check "$f" || exit 1; done`]);
run('Datenschutz (Beta-Kopie)', 'sh', ['scripts/privacy-scan.sh', OUT]);
run('Browser: Tabs, Version, Konsolenfehler (Beta-Kopie)', 'node', ['tests/browser/check-tabs.mjs', `Beta ${version} (Stand ${base})`], { WT_ROOT: OUT });
run('Browser: Beta-Kanal (Präfix, Hinweis, Name)', 'node', ['tests/browser/check-beta.mjs', version], { WT_ROOT: OUT });

// ---------- Commit und Push ----------
const status = sh('git status --porcelain', OUT);
console.log(`\nÄnderungen im Beta-Repo: ${status ? status.split('\n').length : 0} Dateien`);
if (!push) { console.log('Nicht committet. Nach dem „deploy“: npm run beta -- ' + version + ' --push'); process.exit(0); }
if (!status) { console.log('Nichts zu committen.'); process.exit(0); }
const email = sh('git config user.email', OUT);
if (!/noreply/.test(email)) fail(`Commit-Adresse ${email} ist nicht anonym (noreply).`);
sh('git add -A', OUT);
sh(`git commit -q -m "Beta ${version} (Stand ${base})"`, OUT);
run('git push (Beta-Repo)', 'git', ['-C', OUT, 'push', 'origin', 'HEAD:main']);
console.log(`\nFertig: Beta ${version} (Stand ${base}) gepusht.`);
