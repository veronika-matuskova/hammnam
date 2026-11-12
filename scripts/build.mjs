#!/usr/bin/env node
// Builds the static site into dist/ using only Node.js built-ins plus the pinned devDependencies:
//   1. compiles Tailwind CSS (tailwindcss CLI, minified) from src/styles.css,
//   2. copies Alpine.js from node_modules (version checked against package.json),
//   3. content-hashes every CSS/JS file referenced from index.html and rewrites those references,
//   4. copies the unhashed static files and writes dist/sw.js with a generated precache list and cache name,
//   5. checks that every local reference in dist/ resolves to a built file.
//
// Usage:
//   npm run build
//   node scripts/build.mjs [--out=dir] [--css=prebuilt.css] [--alpine=alpine.min.js]
// --css / --alpine (or HAMMNAM_CSS_FILE / HAMMNAM_ALPINE_FILE) use the given files instead of running
// Tailwind / reading node_modules; they exist to test the build without installing dependencies.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function option(name, envName) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : process.env[envName];
}

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

const outDir = resolve(root, option('out', 'HAMMNAM_OUT_DIR') || 'dist');
const cssOverride = option('css', 'HAMMNAM_CSS_FILE');
const alpineOverride = option('alpine', 'HAMMNAM_ALPINE_FILE');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function buildCss() {
  if (cssOverride) return readFileSync(resolve(cssOverride));
  const cli = join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js');
  if (!existsSync(cli)) fail('tailwindcss is not installed; run `npm install` first.');
  const tmp = mkdtempSync(join(tmpdir(), 'hammnam-css-'));
  const output = join(tmp, 'app.css');
  try {
    const result = spawnSync(process.execPath, [
      cli,
      '--config', join(root, 'tailwind.config.cjs'),
      '--input', join(root, 'src', 'styles.css'),
      '--output', output,
      '--minify'
    ], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) fail('tailwindcss failed.');
    return readFileSync(output);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function readAlpine() {
  if (alpineOverride) return readFileSync(resolve(alpineOverride));
  const dir = join(root, 'node_modules', 'alpinejs');
  if (!existsSync(dir)) fail('alpinejs is not installed; run `npm install` first.');
  const installed = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
  const pinned = pkg.devDependencies.alpinejs;
  if (installed !== pinned) fail(`alpinejs ${installed} is installed but package.json pins ${pinned}; run \`npm install\`.`);
  return readFileSync(join(dir, 'dist', 'cdn.min.js'));
}

const hash = (content) => createHash('sha256').update(content).digest('hex').slice(0, 10);

// Each local CSS/JS reference in index.html (exact attribute value) and where its content comes from.
const hashedAssets = [
  { ref: './assets/app.css', name: 'app', ext: 'css', content: buildCss() },
  { ref: './config.js', name: 'config', ext: 'js', content: readFileSync(join(root, 'config.js')) },
  { ref: './js/app.js', name: 'app', ext: 'js', content: readFileSync(join(root, 'js', 'app.js')) },
  { ref: './assets/alpine.js', name: 'alpine', ext: 'js', content: readAlpine() }
];

// Files served under stable URLs (index.html is written separately).
const staticFiles = ['manifest.json', 'icons/app-icon.svg'];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'assets'), { recursive: true });

let html = readFileSync(join(root, 'index.html'), 'utf8');
const precache = ['./', './index.html'];
for (const asset of hashedAssets) {
  const file = `assets/${asset.name}.${hash(asset.content)}.${asset.ext}`;
  writeFileSync(join(outDir, file), asset.content);
  const attribute = new RegExp(`(src|href)="${asset.ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
  const matches = html.match(attribute) || [];
  if (matches.length !== 1) fail(`expected exactly one reference to ${asset.ref} in index.html, found ${matches.length}.`);
  html = html.replace(attribute, `$1="./${file}"`);
  precache.push(`./${file}`);
}
writeFileSync(join(outDir, 'index.html'), html);

for (const file of staticFiles) {
  mkdirSync(dirname(join(outDir, file)), { recursive: true });
  cpSync(join(root, file), join(outDir, file));
  precache.push(`./${file}`);
}
if (existsSync(join(root, 'CNAME'))) cpSync(join(root, 'CNAME'), join(outDir, 'CNAME'));

// The cache name changes whenever any precached file changes, so the browser installs a new service worker.
const shellHash = createHash('sha256');
for (const url of precache.slice(1)) shellHash.update(url).update(readFileSync(join(outDir, url)));
const cacheName = `ham-mnam-shell-${shellHash.digest('hex').slice(0, 10)}`;

let sw = readFileSync(join(root, 'sw.js'), 'utf8');
const swReplacements = [
  [/^const CACHE_NAME = .*\/\/ generated: CACHE_NAME$/m, `const CACHE_NAME = ${JSON.stringify(cacheName)};`],
  [/^const APP_SHELL = .*\/\/ generated: APP_SHELL$/m, `const APP_SHELL = ${JSON.stringify(precache, null, 2)};`]
];
for (const [pattern, replacement] of swReplacements) {
  if (!pattern.test(sw)) fail(`sw.js no longer contains the line matching ${pattern}.`);
  sw = sw.replace(pattern, replacement);
}
writeFileSync(join(outDir, 'sw.js'), sw);

// Sanity checks: no CDN or ?v= left, and every local reference resolves to a file in dist/.
const problems = [];
if (/https?:\/\/[^"']*(cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|unpkg\.com)/.test(html)) problems.push('index.html still references a CDN.');
if (/\?v=\d+/.test(html + sw)) problems.push('a manual ?v= version is left in index.html or sw.js.');
const localRefs = [...html.matchAll(/(?:src|href)="(\.\/[^"]*)"/g)].map((match) => match[1]);
const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
const manifestRefs = (manifest.icons || []).map((icon) => icon.src);
for (const ref of [...localRefs, ...manifestRefs, ...precache]) {
  const path = ref.split(/[?#]/)[0].replace(/^\.\//, '');
  if (path === '' || path.endsWith('/')) continue; // './' is served as index.html
  if (!existsSync(join(outDir, path))) problems.push(`${ref} does not exist in ${outDir}.`);
}
for (const ref of [...localRefs, ...manifestRefs]) {
  if (!precache.includes(ref) && ref !== './sw.js') problems.push(`${ref} is used but not precached for offline use.`);
}
if (problems.length) fail(problems.join('\n  '));

console.log(`build: wrote ${outDir} (${cacheName})`);
for (const url of precache) console.log(`  ${url}`);
