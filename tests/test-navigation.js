const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, supabaseStub, deferred } = require('./helpers/app-harness');

// Uses the real history stack from tests/helpers/app-harness.js: back() moves one
// entry back (or leaves the app when there is none) and dispatches popstate to
// the listener the app registered in init(), like a browser does.
function createNavigationApp(fetch, initialHash = '') {
  return loadApp({ fetch, hash: initialHash });
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

// --- browser Back/Forward buttons and typed URLs ------------------------------------
// These go through history.back()/forward()/navigate() on the stub, which fire
// popstate like the browser buttons and the address bar do.

test('browser Back and Forward walk list -> detail -> edit and restore each page', async () => {
  const app = createNavigationApp(stubFetch());
  await app.init();
  app.openRecipe(app.recipes[0]);
  app.editRecipe(app.selectedRecipe);
  assert.deepEqual(app.history.hashes, ['', '#recipe/42', '#edit-recipe/42']);

  app.history.back();
  assert.equal(app.showForm, false);
  assert.equal(app.editingRecipeId, null);
  assert.equal(app.selectedRecipe.id, 42);

  app.history.back();
  assert.equal(app.selectedRecipe, null);
  assert.equal(app.showForm, false);

  app.history.forward();
  assert.equal(app.selectedRecipe.id, 42);
  assert.equal(app.showForm, false);

  app.history.forward();
  assert.equal(app.selectedRecipe, null);
  assert.equal(app.showForm, true);
  assert.equal(app.editingRecipeId, 42);
  assert.equal(app.newRecipe.title_sk, 'Koláč');
  assert.equal(app.history.leftApp, false);
});

test('browser Back closes the new-recipe form and Forward reopens it', async () => {
  const app = createNavigationApp(stubFetch());
  await app.init();
  app.openForm();
  assert.equal(app.location.hash, '#new-recipe');

  app.history.back();
  assert.equal(app.showForm, false);
  assert.equal(app.location.hash, '');

  app.history.forward();
  assert.equal(app.showForm, true);
  assert.equal(app.editingRecipeId, null);
});

test('after saving a new recipe, browser Forward shows an empty form, not the saved one', async () => {
  const app = createNavigationApp(supabaseStub([]));
  await app.init();
  app.openForm();
  app.newRecipe.title_sk = 'Polievka';
  app.newRecipe.category_sk = 'Obed';
  await app.addRecipe();
  assert.equal(app.location.hash, '');
  assert.equal(app.showForm, false);

  app.history.forward();
  assert.equal(app.showForm, true);
  assert.equal(app.newRecipe.title_sk, '');
  assert.equal(app.editingRecipeId, null);
});

test('after saving an edit, browser Forward reopens the edit form with the saved values', async () => {
  const app = createNavigationApp(stubFetch());
  await app.init();
  app.openRecipe(app.recipes[0]);
  app.editRecipe(app.selectedRecipe);
  app.newRecipe.title_sk = 'Upravený koláč';
  await app.addRecipe();
  assert.equal(app.location.hash, '#recipe/42');

  app.history.forward();
  assert.equal(app.showForm, true);
  assert.equal(app.editingRecipeId, 42);
  assert.equal(app.newRecipe.title_sk, 'Upravený koláč');
});

test('typing a detail URL into the address bar opens it and Back returns to the list', async () => {
  const app = createNavigationApp(stubFetch());
  await app.init();

  app.history.navigate('#recipe/42');
  assert.equal(app.selectedRecipe.id, 42);

  app.history.back();
  assert.equal(app.selectedRecipe, null);
  assert.equal(app.location.hash, '');
  assert.equal(app.history.leftApp, false);
});

test('typing an unknown recipe URL after loading clears the hash', async () => {
  const app = createNavigationApp(stubFetch());
  await app.init();

  app.history.navigate('#recipe/999');
  assert.equal(app.selectedRecipe, null);
  assert.equal(app.location.hash, '');
});

test('a typed edit URL, cancelled, then the detail Back stays in the app', async () => {
  const app = createNavigationApp(stubFetch());
  await app.init();

  app.history.navigate('#edit-recipe/42');
  assert.equal(app.showForm, true);
  assert.equal(app.editingRecipeId, 42);

  app.closeForm();
  assert.equal(app.selectedRecipe.id, 42);
  app.closeRecipe();
  assert.equal(app.selectedRecipe, null);
  assert.equal(app.location.hash, '');
  assert.equal(app.history.leftApp, false);
});

test('a deep-linked list page: Back leaves the app (nothing to go back to)', async () => {
  const app = createNavigationApp(stubFetch());
  await app.init();
  app.history.back();
  assert.equal(app.history.leftApp, true);
});

test('edit -> browser Back -> typed #new-recipe shows an empty form and POSTs',
  { todo: 'bug #8 follow-up (new): browser Back from the edit form keeps the edited recipe in newRecipe, and #new-recipe reached via popstate shows it' },
  async () => {
    const calls = [];
    const base = stubFetch();
    const app = createNavigationApp(async (url, options = {}) => {
      calls.push(options.method || 'GET');
      return base(url, options);
    });
    await app.init();
    app.openRecipe(app.recipes[0]);
    app.editRecipe(app.selectedRecipe);
    app.history.back();

    app.history.navigate('#new-recipe');
    assert.equal(app.showForm, true);
    assert.equal(app.newRecipe.title_sk, '', 'the form still holds the recipe from the edit');

    app.newRecipe.title_sk = 'Nový';
    app.newRecipe.category_sk = 'Obed';
    await app.addRecipe();
    assert.deepEqual(calls.filter((method) => method !== 'GET'), ['POST']);
  });

test('browser Back while an edit is saving still updates the list',
  { todo: 'new bug: popstate during an in-flight PATCH clears editingRecipeId, so the saved row is reported as "no longer available" and the list keeps the old values' },
  async () => {
    const gate = deferred();
    const base = stubFetch();
    const app = createNavigationApp(async (url, options = {}) => {
      if (options.method === 'PATCH') await gate.promise;
      return base(url, options);
    });
    await app.init();
    app.openRecipe(app.recipes[0]);
    app.editRecipe(app.selectedRecipe);
    app.newRecipe.title_sk = 'Upravený koláč';

    const saving = app.addRecipe();
    app.history.back();
    gate.resolve();
    await saving;

    assert.equal(app.recipes[0].title_sk, 'Upravený koláč');
    assert.equal(app.formError, '');
  });
