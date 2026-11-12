const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

// A history stub that keeps a real stack of entries. back() moves one entry back
// (or leaves the app when there is none) and dispatches popstate to the listener
// the app registered in init(), like a browser does.
function createNavigationApp(fetch, initialHash = '') {
  let factory;
  const listeners = {};
  const location = { hash: initialHash, pathname: '/', search: '' };
  const hashOf = (url) => (url.includes('#') ? url.slice(url.indexOf('#')) : '');
  const history = {
    entries: [{ state: null, hash: initialHash }],
    index: 0,
    leftApp: false,
    get state() {
      return this.entries[this.index].state;
    },
    pushState(state, title, url) {
      this.entries.splice(this.index + 1);
      this.entries.push({ state: structuredClone(state), hash: hashOf(url) });
      this.index += 1;
      location.hash = hashOf(url);
    },
    replaceState(state, title, url) {
      this.entries[this.index] = { state: structuredClone(state), hash: hashOf(url) };
      location.hash = hashOf(url);
    },
    back() {
      if (this.index === 0) {
        this.leftApp = true;
        return;
      }
      this.index -= 1;
      location.hash = this.entries[this.index].hash;
      (listeners.popstate || []).forEach((listener) => listener({ state: this.state }));
    }
  };
  const window = {
    SUPABASE_CONFIG: { url: 'https://example.supabase.co', anonKey: 'test-key' },
    location,
    history,
    isSecureContext: false,
    addEventListener(event, listener) {
      (listeners[event] = listeners[event] || []).push(listener);
    }
  };
  const context = {
    Alpine: { data(name, registeredFactory) { factory = registeredFactory; } },
    document: { addEventListener(event, callback) { if (event === 'alpine:init') callback(); } },
    navigator: {},
    fetch,
    localStorage: { getItem: () => null, setItem: () => {} },
    window,
    console
  };
  vm.runInNewContext(fs.readFileSync('js/app.js', 'utf8'), context);
  return Object.assign(factory(), { location, history });
}

const recipe = { id: 42, title_sk: 'Koláč', category_sk: 'Dezert', ingredients: [], steps: [], notes: '' };

// Stubbed Supabase: GET returns the recipe list, PATCH echoes the update. Nothing leaves the process.
function stubFetch(recipes = [recipe]) {
  return async (url, options = {}) => {
    const body = options.method === 'PATCH'
      ? [{ ...recipes[0], ...JSON.parse(options.body) }]
      : recipes;
    return { ok: true, status: 200, json: async () => body };
  };
}

test('after saving an edit, Back from the detail returns to the list', async () => {
  const app = createNavigationApp(stubFetch());
  await app.init();

  app.openRecipe(app.recipes[0]);
  app.editRecipe(app.selectedRecipe);
  assert.equal(app.location.hash, '#edit-recipe/42');
  app.newRecipe.title_sk = 'Upravený koláč';
  await app.addRecipe();

  assert.equal(app.showForm, false);
  assert.equal(app.location.hash, '#recipe/42');
  assert.equal(app.selectedRecipe.title_sk, 'Upravený koláč');

  app.closeRecipe();
  assert.equal(app.location.hash, '');
  assert.equal(app.selectedRecipe, null);
  assert.equal(app.history.leftApp, false);
});

test('a deep-linked edit, cancelled, then Back goes to the list without leaving the app', async () => {
  const app = createNavigationApp(stubFetch(), '#edit-recipe/42');
  await app.init();
  assert.equal(app.showForm, true);
  assert.equal(app.editingRecipeId, 42);

  app.closeForm();
  assert.equal(app.location.hash, '#recipe/42');
  assert.equal(app.selectedRecipe.id, 42);

  app.closeRecipe();
  assert.equal(app.history.leftApp, false);
  assert.equal(app.location.hash, '');
  assert.equal(app.selectedRecipe, null);
  assert.equal(app.showForm, false);
});

test('a deep-linked edit, saved, then Back goes to the list without leaving the app', async () => {
  const app = createNavigationApp(stubFetch(), '#edit-recipe/42');
  await app.init();

  await app.addRecipe();
  assert.equal(app.location.hash, '#recipe/42');

  app.closeRecipe();
  assert.equal(app.history.leftApp, false);
  assert.equal(app.location.hash, '');
});

test('a deep-linked detail, then Back goes to the list without leaving the app', async () => {
  const app = createNavigationApp(stubFetch(), '#recipe/42');
  await app.init();
  assert.equal(app.selectedRecipe.id, 42);

  app.closeRecipe();
  assert.equal(app.history.leftApp, false);
  assert.equal(app.location.hash, '');
  assert.equal(app.selectedRecipe, null);
});

test('opening and cancelling an edit from the detail keeps Back working', async () => {
  const app = createNavigationApp(stubFetch());
  await app.init();

  app.openRecipe(app.recipes[0]);
  app.editRecipe(app.selectedRecipe);
  app.closeForm();
  assert.equal(app.location.hash, '#recipe/42');
  assert.equal(app.selectedRecipe.id, 42);

  app.closeRecipe();
  assert.equal(app.location.hash, '');
  assert.equal(app.history.index, 0);
  assert.equal(app.history.leftApp, false);
});

test('an unknown recipe id clears the hash once recipes are loaded', async () => {
  for (const hash of ['#recipe/999', '#edit-recipe/999']) {
    const app = createNavigationApp(stubFetch(), hash);
    await app.init();

    assert.equal(app.selectedRecipe, null);
    assert.equal(app.showForm, false);
    assert.equal(app.location.hash, '');
    assert.equal(app.history.entries.length, 1);
  }
});

test('a known id is not cleared before recipes have loaded', () => {
  const app = createNavigationApp(stubFetch(), '#recipe/42');
  app.syncRoute();
  assert.equal(app.location.hash, '#recipe/42');
});
