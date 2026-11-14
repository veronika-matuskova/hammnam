// Every same-origin file the service worker precaches must be published by the
// deploy step in .github/workflows/ci.yml. One missing file (css/theme.css) made
// the service worker install fail and left the live site on a broken version.
const assert = require('node:assert/strict');
const test = require('node:test');
const { readRepoFile } = require('./helpers/app-harness');

test('the deploy step publishes every file in the sw.js APP_SHELL', () => {
  const workflow = readRepoFile('.github/workflows/ci.yml');
  const serviceWorker = readRepoFile('sw.js');
  const build = workflow.match(/- name: Build site\s+run: \|([\s\S]*?)\n\s*- name:/);
  assert.ok(build, 'Build site step not found in ci.yml');
  const copied = build[1].match(/^\s*cp .*$/gm).flatMap((line) => line.trim().split(/\s+/).slice(1))
    .filter((arg) => !arg.startsWith('-') && arg !== '_site/');
  const shell = serviceWorker.match(/const APP_SHELL = \[([\s\S]*?)\];/)[1];
  const files = [...shell.matchAll(/'\.\/([^'?]*)/g)].map((m) => m[1]).filter(Boolean);
  assert.ok(files.length > 0, 'APP_SHELL is empty');
  for (const file of files) {
    const top = file.split('/')[0];
    assert.ok(copied.includes(file) || copied.includes(top), `${file} is precached by sw.js but not deployed`);
  }
});
