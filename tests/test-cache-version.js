// Cache-busting consistency for the `?v=N` scheme: the app.js URL in index.html,
// the precached app.js URL in sw.js and the service worker CACHE_NAME must carry
// the same N, or installed apps keep serving a stale script.
// If the ?v= scheme is replaced (e.g. by a build step, #19), delete this file.
const assert = require('node:assert/strict');
const test = require('node:test');
const { readRepoFile } = require('./helpers/app-harness');

test('?v=N in index.html, sw.js APP_SHELL and CACHE_NAME match', () => {
  const html = readRepoFile('index.html');
  const serviceWorker = readRepoFile('sw.js');

  const htmlVersions = [...html.matchAll(/src="\.\/js\/app\.js\?v=(\d+)"/g)].map((m) => m[1]);
  const cacheName = serviceWorker.match(/const CACHE_NAME = 'ham-mnam-shell-v(\d+)'/);
  const appShell = serviceWorker.match(/const APP_SHELL = \[([\s\S]*?)\];/);
  assert.equal(htmlVersions.length, 1, 'index.html should load ./js/app.js?v=N exactly once');
  assert.ok(cacheName, "sw.js CACHE_NAME should look like 'ham-mnam-shell-vN'");
  assert.ok(appShell, 'sw.js APP_SHELL not found');
  const shellVersions = [...appShell[1].matchAll(/'\.\/js\/app\.js\?v=(\d+)'/g)].map((m) => m[1]);
  assert.equal(shellVersions.length, 1, 'APP_SHELL should precache ./js/app.js?v=N exactly once');

  assert.equal(shellVersions[0], htmlVersions[0], 'sw.js APP_SHELL and index.html disagree');
  assert.equal(cacheName[1], htmlVersions[0], 'CACHE_NAME and index.html disagree');
});
