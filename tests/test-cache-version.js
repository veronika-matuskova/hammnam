// Cache busting is done by the build (scripts/build.mjs, #19): it content-hashes
// the assets and generates the sw.js precache list and CACHE_NAME. The source
// files must not carry a manual ?v=N version any more.
const assert = require('node:assert/strict');
const test = require('node:test');
const { readRepoFile } = require('./helpers/app-harness');

test('the app script URL is versioned by the build, not by a manual ?v= bump', () => {
  const html = readRepoFile('index.html');
  const serviceWorker = readRepoFile('sw.js');

  assert.match(html, /src="\.\/js\/app\.js"/);
  assert.doesNotMatch(html + serviceWorker, /\?v=\d+/);
});
