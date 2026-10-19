// Release-Hilfe: Versionssprung, Cache-Zähler, Prüfungen, ein Sammel-Commit auf main.
//
//   npm run release -- check                    nur prüfen, nichts ändern (Vorabcheck, auch auf main)
//   npm run release -- 2.14.0 "Kurztext"        Version setzen, prüfen, auf dem wip-Branch committen,
//                                               dann als EIN Commit auf main zusammenfassen (lokal)
//   npm run release -- 2.14.0 "Kurztext" --push zusätzlich main pushen (erst nach "deploy" des Nutzers)
//   Optionen: --no-browser (Tab-Check überspringen)
//
// Was das Skript NICHT tut: Doku in Drive, iPhone-Checkliste, Mockups. Ohne .privacy-terms.local bricht es ab.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const pos = args.filter((a) => !a.startsWith('--'));
const push = flags.has('--push');
const skipBrowser = flags.has('--no-browser');
const checkOnly = pos[0] === 'check';

const VERSION_FILE = join(ROOT, 'js/version.js');
const SW_FILE = join(ROOT, 'sw.js');
const sh = (cmd) => execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
const fail = (msg) => { console.error('\nABBRUCH: ' + msg); process.exit(1); };
const step = (t) => console.log('\n== ' + t + ' ==');
const run = (label, cmd, argv) => {
  step(label);
  const r = spawnSync(cmd, argv, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) fail(`${label} ist fehlgeschlagen (Status ${r.status}).`);
};

const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const current = readFileSync(VERSION_FILE, 'utf8').match(/APP_VERSION\s*=\s*'(\d+\.\d+\.\d+)'/)?.[1];
if (!current) fail('APP_VERSION in js/version.js nicht gefunden.');
const swSrc = readFileSync(SW_FILE, 'utf8');
const cacheNow = +swSrc.match(/const CACHE_VERSION = (\d+);/)?.[1];
if (!cacheNow) fail('CACHE_VERSION in sw.js nicht gefunden.');

const next = checkOnly ? current : pos[0];
const message = pos.slice(1).join(' ').trim();
if (!checkOnly) {
  if (!/^\d+\.\d+\.\d+$/.test(next || '')) fail('Aufruf: npm run release -- <x.y.z> "Kurztext" [--push]   oder   npm run release -- check');
  if (cmp(next, current) <= 0) fail(`Neue Version ${next} muss größer sein als ${current}.`);
  if (!message) fail('Kurztext für die Commit-Nachricht fehlt (z. B. "5 neue Übungsanimationen").');
}

// --- Git-Zustand -----------------------------------------------------------
step('Git-Zustand');
const branch = sh('git rev-parse --abbrev-ref HEAD');
if (!checkOnly) {
  if (!branch.startsWith('wip/')) fail(`Release nur von einem Branch wip/<version>-<thema> aus (jetzt: ${branch}).`);
  if (sh('git status --porcelain')) fail('Arbeitsverzeichnis ist nicht sauber: erst committen oder verwerfen.');
  sh('git fetch origin main');
  if (sh('git rev-list --count HEAD..origin/main') !== '0' ) fail('origin/main hat neuere Commits: wip-Branch erst rebasen (git rebase origin/main).');
}
const email = sh('git config user.email');
if (!/noreply/.test(email)) fail(`Git-E-Mail muss eine noreply-Adresse sein (jetzt: ${email}).`);
console.log(`Branch ${branch}, Version ${current} -> ${checkOnly ? '(nur Prüfung)' : next}, Cache v${cacheNow} -> ${checkOnly ? cacheNow : cacheNow + 1}, Autor ${email}`);

// --- Versionen setzen (nur bei echtem Release) -------------------------------
if (!checkOnly) {
  writeFileSync(VERSION_FILE, readFileSync(VERSION_FILE, 'utf8').replace(/APP_VERSION = '[^']+'/, `APP_VERSION = '${next}'`));
  writeFileSync(SW_FILE, swSrc.replace(/const CACHE_VERSION = \d+;/, `const CACHE_VERSION = ${cacheNow + 1};`));
  console.log(`js/version.js -> ${next}, sw.js CACHE_VERSION -> ${cacheNow + 1}`);
}

// --- Prüfungen ---------------------------------------------------------------
step('Platzhalter-Texte in der Oberfläche');
const uiFiles = ['index.html', ...readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f)];
const todo = [];
for (const f of uiFiles) readFileSync(join(ROOT, f), 'utf8').split('\n').forEach((l, i) => { if (/(folgt|kommt) in v\d/i.test(l)) todo.push(`${f}:${i + 1}: ${l.trim()}`); });
if (todo.length) { console.log(todo.join('\n')); fail('Platzhalter "folgt/kommt in v…" in der Oberfläche: entfernen oder bewusst klären.'); }
console.log('keine');

step('PRECACHE und Versionsstand');
const sw2 = readFileSync(SW_FILE, 'utf8');
const missing = readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js') && !sw2.includes(`'js/${f}'`));
if (missing.length) fail('Nicht in PRECACHE von sw.js: ' + missing.join(', '));
console.log('alle js/-Module stehen in PRECACHE');

run('npm run check', 'npm', ['run', '--silent', 'check']);
run('npm test', 'npm', ['test', '--silent']);
if (!existsSync(join(ROOT, '.privacy-terms.local'))) fail('.privacy-terms.local fehlt: aus Drive (Tools/privacy-terms.local.txt) anlegen, nie nur mit dem generischen Scan pushen.');
run('npm run privacy', 'npm', ['run', '--silent', 'privacy']);
if (!skipBrowser) run('Browser: Tabs und Version', 'node', ['tests/browser/check-tabs.mjs', checkOnly ? current : next]);

if (checkOnly) { console.log('\nVorabcheck bestanden. Neue Animationen zusätzlich mit tests/browser/check-anim.mjs <refs> prüfen.'); process.exit(0); }

// --- Commit auf dem wip-Branch, dann ein Sammel-Commit auf main -------------------
step('Commits');
sh('git add js/version.js sw.js');
sh(`git commit -m "Version ${next}: Versionsnummer und Cache-Zähler"`);
sh('git checkout main');
sh('git pull --ff-only origin main');
sh(`git merge --squash ${branch}`);
const body = `v${next}: ${message}`;
const r = spawnSync('git', ['commit', '-m', body], { cwd: ROOT, stdio: 'inherit' });
if (r.status !== 0) fail('Commit auf main fehlgeschlagen; Zustand mit git status prüfen.');
console.log('main: ' + sh('git log --oneline -1'));
if (push) { run('git push origin main', 'git', ['push', 'origin', 'main']); }
else console.log('\nNicht gepusht. Nach dem „deploy“ des Nutzers: git push origin main.');
console.log(`\nFertig: ${next}. Offen: Doku-Update in Drive (Changelog, Decisions, Handover Changes, iPhone Check ${next}).`);
