// Shared harness for the unit tests: loads js/app.js into a node:vm context with
// stubbed browser globals (window, location, history, fetch, localStorage).
// Nothing here touches the network; every Supabase call goes to the `fetch` stub
// passed in by the test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const readRepoFile = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const appSource = () => readRepoFile('js/app.js');

const hashOf = (url) => (String(url).includes('#') ? String(url).slice(String(url).indexOf('#')) : '');

// A history stub that keeps a real stack of entries, like a browser tab:
// - pushState drops the forward entries and adds a new one,
// - replaceState rewrites the current entry,
// - back/forward/go move through the stack and dispatch popstate,
// - back() on the first entry leaves the app (recorded in `leftApp`).
// popstate is dispatched synchronously; browsers queue it, but the app does not
// depend on the timing.
function createHistory(location, listeners, initialHash) {
  const dispatchPopstate = (history) => {
    for (const listener of listeners.popstate || []) listener({ state: history.state });
  };
  return {
    entries: [{ state: null, hash: initialHash }],
    index: 0,
    leftApp: false,
    get length() {
      return this.entries.length;
    },
    get state() {
      return this.entries[this.index].state;
    },
    get hashes() {
      return this.entries.map((entry) => entry.hash);
    },
    pushState(state, _title, url) {
      this.entries.splice(this.index + 1);
      this.entries.push({ state: structuredClone(state), hash: hashOf(url) });
      this.index += 1;
      location.hash = hashOf(url);
    },
    replaceState(state, _title, url) {
      this.entries[this.index] = { state: structuredClone(state), hash: hashOf(url) };
      location.hash = hashOf(url);
    },
    go(delta) {
      const target = this.index + delta;
      if (target < 0) {
        this.leftApp = true;
        return;
      }
      if (delta === 0 || target >= this.entries.length) return;
      this.index = target;
      location.hash = this.entries[this.index].hash;
      dispatchPopstate(this);
    },
    back() {
      this.go(-1);
    },
    forward() {
      this.go(1);
    },
    // The user types a new hash into the address bar (or follows a #link):
    // the browser pushes an entry with a null state and fires popstate.
    navigate(hash) {
      this.pushState(null, '', hash);
      dispatchPopstate(this);
    }
  };
}

// Loads js/app.js and returns the Alpine component, with `location`, `history`,
// `window` and the vm `context` attached for assertions.
function loadApp({
  fetch,
  hash = '',
  savedLanguage = null,
  supabaseConfig = { url: 'https://example.supabase.co', anonKey: 'test-key' }
} = {}) {
  let factory;
  const listeners = {};
  const location = { hash, pathname: '/', search: '' };
  const history = createHistory(location, listeners, hash);
  const window = {
    SUPABASE_CONFIG: supabaseConfig,
    location,
    history,
    isSecureContext: false,
    addEventListener(event, listener) {
      (listeners[event] = listeners[event] || []).push(listener);
    }
  };
  const context = {
    Alpine: {
      data(name, registeredFactory) {
        assert.equal(name, 'recipeApp');
        factory = registeredFactory;
      }
    },
    document: { addEventListener(event, callback) { if (event === 'alpine:init') callback(); } },
    navigator: {},
    fetch: fetch || (async () => { throw new Error('unexpected fetch in test'); }),
    localStorage: { getItem: () => savedLanguage, setItem: () => {} },
    window,
    // Keep expected console.error output from error-path tests out of the report.
    console: { ...console, error: () => {}, warn: () => {} }
  };
  vm.runInNewContext(appSource(), context);
  return Object.assign(factory(), { location, history, window, context });
}

// --- fetch stubs -------------------------------------------------------------

// A fetch Response stub. json() returns a fresh copy each time, like a real
// response, so tests cannot leak state through shared fixture objects.
function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => (body === undefined ? body : structuredClone(body)),
    text: async () => (body === undefined ? '' : JSON.stringify(body))
  };
}

// What fetch() does when the device is offline or DNS/CORS fails.
const networkError = () => new TypeError('Failed to fetch');

// Records every request and answers like Supabase REST would on success:
// GET returns `recipes`, POST/PATCH echo the body back as a one-row array.
function supabaseStub(recipes = [], calls = []) {
  const fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ url, method, options, body });
    if (method === 'GET') return jsonResponse(200, recipes);
    if (method === 'POST') return jsonResponse(201, [{ id: 1000 + calls.length, ...body }]);
    const id = String(url).match(/id=eq\.([^&]+)/)?.[1];
    const existing = recipes.find((recipe) => String(recipe.id) === decodeURIComponent(id)) || {};
    return jsonResponse(200, [{ ...existing, ...body }]);
  };
  return Object.assign(fetch, { calls });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

// Strips vm-realm prototypes so deepStrictEqual compares plain data.
const plain = (value) => JSON.parse(JSON.stringify(value));

// --- source helpers ----------------------------------------------------------

// Source text of the object literal assigned to `const <name>`, from `{` to its matching `}`.
// Braces inside the translation strings are not expected; the key-count cross-check in
// tests/test-translations.js fails if that assumption ever breaks.
function objectLiteralSource(source, name) {
  const declaration = source.indexOf(`const ${name}`);
  assert.ok(declaration >= 0, `const ${name} not found`);
  const start = source.indexOf('{', declaration);
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} object not closed`);
}

module.exports = {
  ROOT,
  readRepoFile,
  appSource,
  createHistory,
  loadApp,
  jsonResponse,
  networkError,
  supabaseStub,
  deferred,
  plain,
  objectLiteralSource
};
